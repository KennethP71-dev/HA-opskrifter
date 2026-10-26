"""Billeder til opskrifter: upload, nedskalering, visning og oprydning."""
from __future__ import annotations

import io
import re
import time
import uuid
from pathlib import Path
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import IMAGE_DIR, IMAGE_ID_PATTERN, IMAGE_MAX_UPLOAD

ID_RE = re.compile(IMAGE_ID_PATTERN)
FULL_SIZE = 1600
THUMB_SIZE = 480


def image_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGE_DIR))


def image_ids(recipe: dict[str, Any]) -> set[str]:
    """Alle billed-id'er, en opskrift henviser til."""
    ids: set[str] = set()
    main = recipe.get("billede")
    if isinstance(main, str) and ID_RE.fullmatch(main):
        ids.add(main)
    for step in recipe.get("fremgang", []):
        if isinstance(step, dict):
            ids.update(i for i in step.get("billeder", []) if isinstance(i, str) and ID_RE.fullmatch(i))
    return ids


def save_image(folder: Path, raw: bytes) -> str:
    """Gemmer et billede i to størrelser og returnerer dets id. Køres i executor."""
    from PIL import Image, ImageOps  # pylint: disable=import-outside-toplevel

    folder.mkdir(parents=True, exist_ok=True)
    image_id = uuid.uuid4().hex
    with Image.open(io.BytesIO(raw)) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            rgba = img.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])
            img = background
        else:
            img = img.convert("RGB")
        full = img.copy()
        full.thumbnail((FULL_SIZE, FULL_SIZE))
        full.save(folder / f"{image_id}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
        thumb = img.copy()
        thumb.thumbnail((THUMB_SIZE, THUMB_SIZE))
        thumb.save(folder / f"{image_id}_t.jpg", "JPEG", quality=78, optimize=True)
    return image_id


def delete_images(folder: Path, ids: set[str]) -> None:
    for image_id in ids:
        if not ID_RE.fullmatch(image_id):
            continue
        for name in (f"{image_id}.jpg", f"{image_id}_t.jpg"):
            (folder / name).unlink(missing_ok=True)


def delete_orphans(folder: Path, used: set[str], min_age_s: int = 86400) -> int:
    """Sletter billeder, ingen opskrift bruger, og som er ældre end min_age_s."""
    if not folder.is_dir():
        return 0
    now = time.time()
    removed = 0
    for path in folder.glob("*.jpg"):
        image_id = path.stem.removesuffix("_t")
        if image_id in used or now - path.stat().st_mtime < min_age_s:
            continue
        path.unlink(missing_ok=True)
        removed += 1
    return removed


class ImageUploadView(HomeAssistantView):
    """POST /api/opskrifter/billede – multipart med feltet 'fil'."""

    url = "/api/opskrifter/billede"
    name = "api:opskrifter:billede:upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        reader = await request.multipart()
        field = await reader.next()
        while field is not None and getattr(field, "name", None) != "fil":
            field = await reader.next()
        if field is None:
            return self.json_message("Der blev ikke sendt noget billede", 400)
        raw = bytearray()
        while chunk := await field.read_chunk(256 * 1024):
            raw.extend(chunk)
            if len(raw) > IMAGE_MAX_UPLOAD:
                return self.json_message("Billedet er større end 25 MB", 413)
        try:
            image_id = await self.hass.async_add_executor_job(
                save_image, image_dir(self.hass), bytes(raw)
            )
        except Exception:  # noqa: BLE001 - Pillow kan kaste mange slags fejl
            return self.json_message(
                "Billedformatet understøttes ikke. Brug JPEG, PNG eller WebP.", 415
            )
        return self.json({"id": image_id})


class ImageServeView(HomeAssistantView):
    """GET /api/opskrifter/billede/<id>[?thumb=1]. Id'erne er tilfældige og kan ikke gættes."""

    url = "/api/opskrifter/billede/{image_id}"
    name = "api:opskrifter:billede:serve"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, image_id: str) -> web.StreamResponse:
        if not ID_RE.fullmatch(image_id):
            return web.Response(status=404)
        suffix = "_t" if request.query.get("thumb") else ""
        path = image_dir(self.hass) / f"{image_id}{suffix}.jpg"
        exists = await self.hass.async_add_executor_job(path.is_file)
        if not exists:
            return web.Response(status=404)
        return web.FileResponse(
            path, headers={"Cache-Control": "public, max-age=31536000, immutable"}
        )
