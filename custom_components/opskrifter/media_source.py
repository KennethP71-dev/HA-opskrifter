"""Gør opskriftsbilleder tilgængelige som media source, så AI Task kan læse dem."""
from __future__ import annotations

from homeassistant.components.media_player import MediaClass
from homeassistant.components.media_source import (
    BrowseMediaSource,
    MediaSource,
    MediaSourceItem,
    PlayMedia,
    Unresolvable,
)
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .images import ID_RE, image_dir


async def async_get_media_source(hass: HomeAssistant) -> MediaSource:
    return OpskriftMediaSource(hass)


class OpskriftMediaSource(MediaSource):
    name = "Opskrifter"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(DOMAIN)
        self.hass = hass

    async def async_resolve_media(self, item: MediaSourceItem) -> PlayMedia:
        image_id = item.identifier or ""
        if not ID_RE.fullmatch(image_id):
            raise Unresolvable("Ukendt billede")
        path = image_dir(self.hass) / f"{image_id}.jpg"
        if not await self.hass.async_add_executor_job(path.is_file):
            raise Unresolvable("Billedet findes ikke")
        return PlayMedia(url=f"/api/opskrifter/billede/{image_id}", mime_type="image/jpeg", path=path)

    async def async_browse_media(self, item: MediaSourceItem) -> BrowseMediaSource:
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier=None,
            media_class=MediaClass.DIRECTORY,
            media_content_type="",
            title="Opskrifter",
            can_play=False,
            can_expand=True,
            children=[],
            children_media_class=MediaClass.IMAGE,
        )
