"""Gør kortet tilgængeligt for Lovelace, også mens Home Assistant starter."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.core import HomeAssistant

from .const import CARD_FILE, URL_BASE, VERSION

_LOGGER = logging.getLogger(__name__)


def _copy_card(src: Path, dst_dir: Path) -> bool:
    """Kopierer kortet til /config/www/opskrifter. Returnerer False hvis www mangler."""
    www = dst_dir.parent
    if not www.is_dir():
        return False
    dst_dir.mkdir(exist_ok=True)
    dst = dst_dir / CARD_FILE
    data = src.read_bytes()
    if not dst.is_file() or dst.read_bytes() != data:
        dst.write_bytes(data)
    return True


async def _async_upsert_resource(hass: HomeAssistant, url: str) -> bool:
    """Opretter eller opdaterer kortet som Lovelace-ressource (kun storage-tilstand)."""
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")
    if resources is None or not hasattr(resources, "async_create_item"):
        return False
    if not getattr(resources, "loaded", True):
        await resources.async_load()
        resources.loaded = True
    base = url.split("?")[0]
    for item in resources.async_items():
        if str(item.get("url", "")).split("?")[0] == base:
            if item.get("url") != url:
                await resources.async_update_item(item["id"], {"res_type": "module", "url": url})
            return True
    await resources.async_create_item({"res_type": "module", "url": url})
    return True


async def async_register_card(hass: HomeAssistant) -> None:
    src = Path(__file__).parent / "frontend" / CARD_FILE
    dst_dir = Path(hass.config.path("www", "opskrifter"))
    try:
        copied = await hass.async_add_executor_job(_copy_card, src, dst_dir)
        if copied and await _async_upsert_resource(
            hass, f"/local/opskrifter/{CARD_FILE}?v={VERSION}"
        ):
            return
    except Exception:  # noqa: BLE001 - Lovelace-internals kan ændre sig mellem versioner
        _LOGGER.warning("Kunne ikke registrere kortet som Lovelace-ressource", exc_info=True)
    add_extra_js_url(hass, f"{URL_BASE}/{CARD_FILE}?v={VERSION}")
