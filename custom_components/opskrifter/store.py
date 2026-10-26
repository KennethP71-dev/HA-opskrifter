"""Lagring af opskrifter i Home Assistants .storage."""
from __future__ import annotations

import copy
import uuid
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import EKSEMPLER, SIGNAL_UPDATED, STORAGE_KEY, STORAGE_VERSION


class OpskriftStore:
    """Holder opskrifterne i hukommelsen og gemmer dem på disk."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._recipes: dict[str, dict[str, Any]] = {}

    @property
    def recipes(self) -> list[dict[str, Any]]:
        return sorted(self._recipes.values(), key=lambda r: r["navn"].lower())

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

    def _insert(self, recipe: dict[str, Any], user: str | None) -> dict[str, Any]:
        now = dt_util.utcnow().isoformat()
        existing = self._recipes.get(recipe.get("id") or "")
        if existing is None:
            recipe["id"] = uuid.uuid4().hex
            recipe["oprettet"] = now
        else:
            recipe["oprettet"] = existing.get("oprettet", now)
        recipe["opdateret"] = now
        if user:
            recipe["opdateret_af"] = user
        self._recipes[recipe["id"]] = recipe
        return recipe

    async def async_upsert(self, recipe: dict[str, Any], user: str | None = None) -> dict[str, Any]:
        saved = self._insert(recipe, user)
        await self._async_save()
        return saved

    async def async_delete(self, recipe_id: str) -> bool:
        if self._recipes.pop(recipe_id, None) is None:
            return False
        await self._async_save()
        return True

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
        await self._store.async_save({"opskrifter": list(self._recipes.values())})
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)
