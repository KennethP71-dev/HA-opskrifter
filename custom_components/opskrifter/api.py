"""Websocket-API til opskrift-kortet."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, SIGNAL_UPDATED

NUM = vol.Any(None, vol.Coerce(float))
TXT = vol.Any(None, cv.string)

INGREDIENT_SCHEMA = vol.Schema(
    {
        vol.Required("navn"): vol.All(cv.string, vol.Length(min=1, max=200)),
        vol.Optional("maengde"): NUM,
        vol.Optional("enhed"): TXT,
        vol.Optional("note"): TXT,
        vol.Optional("gruppe"): TXT,
        vol.Optional("kort"): TXT,
        vol.Optional("krydderi"): cv.boolean,
        vol.Optional("noegle"): cv.boolean,
        vol.Optional("skaler"): cv.boolean,
        vol.Optional("trin"): NUM,
    },
    extra=vol.REMOVE_EXTRA,
)

STEP_SCHEMA = vol.Schema(
    {
        vol.Optional("tekst", default=""): vol.Any(None, cv.string),
        vol.Optional("billeder", default=[]): [cv.string],
    },
    extra=vol.REMOVE_EXTRA,
)

RECIPE_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): cv.string,
        vol.Required("navn"): vol.All(cv.string, vol.Length(min=1, max=200)),
        vol.Optional("kategori"): TXT,
        vol.Optional("tid"): TXT,
        vol.Optional("ikon"): TXT,
        vol.Optional("farve"): TXT,
        vol.Optional("billede"): TXT,
        vol.Optional("noter"): TXT,
        vol.Optional("personer"): NUM,
        vol.Optional("krydderistyrke", default=100): vol.All(
            vol.Coerce(int), vol.Range(min=10, max=300)
        ),
        vol.Optional("ingredienser", default=[]): [INGREDIENT_SCHEMA],
        vol.Optional("fremgang", default=[]): [vol.Any(STEP_SCHEMA, cv.string)],
    },
    extra=vol.REMOVE_EXTRA,
)


def _user_name(connection: websocket_api.ActiveConnection) -> str | None:
    return connection.user.name if connection.user else None


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (ws_subscribe, ws_list, ws_save, ws_delete, ws_import):
        websocket_api.async_register_command(hass, handler)


def _get_store(hass: HomeAssistant, connection, msg) -> Any:
    store = hass.data.get(DOMAIN)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Integrationen Opskrifter er ikke indlæst")
    return store


@websocket_api.websocket_command({vol.Required("type"): "opskrifter/list"})
@callback
def ws_list(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (store := _get_store(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"opskrifter": store.recipes})


@websocket_api.websocket_command({vol.Required("type"): "opskrifter/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (store := _get_store(hass, connection, msg)) is None:
        return

    @callback
    def forward() -> None:
        current = hass.data.get(DOMAIN)
        connection.send_message(
            websocket_api.event_message(
                msg["id"], {"opskrifter": current.recipes if current else []}
            )
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATED, forward)
    connection.send_result(msg["id"])
    forward()


@websocket_api.websocket_command(
    {vol.Required("type"): "opskrifter/save", vol.Required("opskrift"): dict}
)
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (store := _get_store(hass, connection, msg)) is None:
        return
    try:
        recipe = RECIPE_SCHEMA(msg["opskrift"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    saved = await store.async_upsert(recipe, _user_name(connection))
    connection.send_result(msg["id"], {"opskrift": saved})


@websocket_api.websocket_command(
    {vol.Required("type"): "opskrifter/delete", vol.Required("id"): cv.string}
)
@websocket_api.async_response
async def ws_delete(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (store := _get_store(hass, connection, msg)) is None:
        return
    if not await store.async_delete(msg["id"]):
        connection.send_error(msg["id"], "not_found", "Opskriften findes ikke")
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {vol.Required("type"): "opskrifter/import", vol.Required("opskrifter"): [dict]}
)
@websocket_api.async_response
async def ws_import(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (store := _get_store(hass, connection, msg)) is None:
        return
    try:
        recipes = [RECIPE_SCHEMA(r) for r in msg["opskrifter"]]
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    added = await store.async_import(recipes, _user_name(connection))
    connection.send_result(msg["id"], {"importeret": added})
