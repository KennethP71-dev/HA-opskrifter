"""Opskrifter – opskriftssamling til Home Assistant."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv

from . import api
from .const import DATA_REGISTERED, DOMAIN, URL_BASE
from .frontend_reg import async_register_card
from .images import ImageServeView, ImageUploadView
from .store import OpskriftStore
from .udskrift import PrintCreateView, PrintServeView

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = OpskriftStore(hass)
    await store.async_load()
    hass.data[DOMAIN] = store

    if not hass.data.get(DATA_REGISTERED):
        api.async_register(hass)
        hass.http.register_view(ImageUploadView(hass))
        hass.http.register_view(ImageServeView(hass))
        hass.http.register_view(PrintCreateView(hass))
        hass.http.register_view(PrintServeView(hass))
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(Path(__file__).parent / "frontend"), False)]
        )
        await async_register_card(hass)
        hass.data[DATA_REGISTERED] = True
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.pop(DOMAIN, None)
    return True
