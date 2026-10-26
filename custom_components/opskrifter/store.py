"""Lagring af opskrifter i Home Assistants .storage."""
from __future__ import annotations

import copy
import logging
import uuid
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import EKSEMPLER, SIGNAL_UPDATED, STORAGE_KEY, STORAGE_VERSION
from .images import delete_images, delete_orphans, image_dir, image_ids

_LOGGER = logging.getLogger(__name__)


class OpskriftStore:
    """Holder opskrifterne i hukommelsen og gemmer dem på disk."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._recipes: dict[str, dict[str, Any]] = {}
        self._family: list[dict[str, str]] = []

    @property
    def recipes(self) -> list[dict[str, Any]]:
        return sorted(self._recipes.values(), key=lambda r: r["navn"].lower())

    @property
    def family(self) -> list[dict[str, str]]:
        return list(self._family)

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if data is None:
            for recipe in EKSEMPLER:
                self._insert(copy.deepcopy(recipe), None)
            await self._async_save()
            return
        self._recipes = {
            r["id"]: r for r in data.get("opskrifter", []) if isinstance(r, dict) and r.get("id")
        }
        self._family = [
            {"id": str(p["id"]), "navn": str(p["navn"])}
            for p in data.get("familie", [])
            if isinstance(p, dict) and p.get("id") and p.get("navn")
        ]
        removed = await self.hass.async_add_executor_job(
            delete_orphans, image_dir(self.hass), self._all_image_ids()
        )
        if removed:
            _LOGGER.debug("Slettede %s ubrugte billedfiler", removed)

    def _all_image_ids(self) -> set[str]:
        ids: set[str] = set()
        for recipe in self._recipes.values():
            ids |= image_ids(recipe)
        return ids

    def _insert(self, recipe: dict[str, Any], user: str | None) -> dict[str, Any]:
        now = dt_util.utcnow().isoformat()
        existing = self._recipes.get(recipe.get("id") or "")
        if existing is None:
            recipe["id"] = uuid.uuid4().hex
            recipe["oprettet"] = now
            recipe.setdefault("historik", [])
            recipe.setdefault("vurderinger", {})
        else:
            recipe["oprettet"] = existing.get("oprettet", now)
            recipe["historik"] = existing.get("historik", [])
            recipe["vurderinger"] = existing.get("vurderinger", {})
        recipe["opdateret"] = now
        if user:
            recipe["opdateret_af"] = user
        self._recipes[recipe["id"]] = recipe
        return recipe

    async def _async_delete_files(self, ids: set[str]) -> None:
        if ids:
            await self.hass.async_add_executor_job(delete_images, image_dir(self.hass), ids)

    async def async_upsert(self, recipe: dict[str, Any], user: str | None = None) -> dict[str, Any]:
        old = self._recipes.get(recipe.get("id") or "")
        old_ids = image_ids(old) if old else set()
        saved = self._insert(recipe, user)
        await self._async_save()
        await self._async_delete_files(old_ids - image_ids(saved))
        return saved

    async def async_delete(self, recipe_id: str) -> bool:
        recipe = self._recipes.pop(recipe_id, None)
        if recipe is None:
            return False
        await self._async_save()
        await self._async_delete_files(image_ids(recipe))
        return True

    def _get(self, recipe_id: str) -> dict[str, Any]:
        recipe = self._recipes.get(recipe_id)
        if recipe is None:
            raise KeyError(recipe_id)
        return recipe

    async def async_add_cooked(self, recipe_id: str, dato: str) -> None:
        recipe = self._get(recipe_id)
        dates = set(recipe.get("historik", []))
        dates.add(dato)
        recipe["historik"] = sorted(dates, reverse=True)
        await self._async_save()

    async def async_remove_cooked(self, recipe_id: str, dato: str) -> None:
        recipe = self._get(recipe_id)
        recipe["historik"] = [d for d in recipe.get("historik", []) if d != dato]
        await self._async_save()

    async def async_rate(self, recipe_id: str, person_id: str, stars: int) -> None:
        if not any(p["id"] == person_id for p in self._family):
            raise KeyError(person_id)
        recipe = self._get(recipe_id)
        ratings = dict(recipe.get("vurderinger", {}))
        if stars:
            ratings[person_id] = stars
        else:
            ratings.pop(person_id, None)
        recipe["vurderinger"] = ratings
        await self._async_save()

    async def async_set_family(self, members: list[dict[str, Any]]) -> list[dict[str, str]]:
        """Gemmer familien. Kendte id'er beholdes, så stjerner følger med ved omdøbning."""
        known = {p["id"] for p in self._family}
        family: list[dict[str, str]] = []
        seen: set[str] = set()
        for member in members:
            name = str(member.get("navn", "")).strip()
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            person_id = member.get("id") if member.get("id") in known else uuid.uuid4().hex[:12]
            family.append({"id": person_id, "navn": name})
        ids = {p["id"] for p in family}
        for recipe in self._recipes.values():
            ratings = recipe.get("vurderinger") or {}
            if any(k not in ids for k in ratings):
                recipe["vurderinger"] = {k: v for k, v in ratings.items() if k in ids}
        self._family = family
        await self._async_save()
        return self.family

    async def async_import(self, recipes: list[dict[str, Any]], user: str | None = None) -> int:
        """Importerer opskrifter. Springer over hvis navnet allerede findes."""
        names = {r["navn"].strip().lower() for r in self._recipes.values()}
        added = 0
        for recipe in recipes:
            key = recipe["navn"].strip().lower()
            if key in names:
                continue
            recipe.pop("id", None)
            self._insert(recipe, user)
            names.add(key)
            added += 1
        if added:
            await self._async_save()
        return added

    async def _async_save(self) -> None:
        await self._store.async_save(
            {"opskrifter": list(self._recipes.values()), "familie": self._family}
        )
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)
