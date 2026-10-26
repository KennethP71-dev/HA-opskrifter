"""Aflæser en opskrift fra et billede med Home Assistants AI Task (fx Claude)."""
from __future__ import annotations

import json
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN
from .images import crop_image, image_dir

PROMPT = """Du får et billede af en opskrift. Aflæs den og svar KUN med ét JSON-objekt, uden forklaring og uden markdown, med disse felter:
- "navn": string
- "personer": tal eller null
- "tid": string eller null, fx "20 min"
- "kategori": string eller null, fx "Aftensmad", "Dessert", "Bagværk"
- "maerker": liste med korte danske mærker, fx kødtype ("Kylling", "Oksekød", "Fisk"), "Vegetar", "Grøntsager", "Pasta", "Suppe", "Spicy"
- "ingredienser": liste af objekter med "maengde" (tal eller null), "enhed" (string eller null), "navn" (string), "note" (string eller null), "gruppe" (string eller null), "krydderi" (true/false), "noegle" (true/false)
- "fremgang": liste af strings, ét trin pr. element, uden nummerering
- "noter": string eller null
- "billede_udsnit": hvis billedet indeholder et foto af den færdige ret, så {"x": .., "y": .., "b": .., "h": ..} som brøkdele mellem 0 og 1 af billedets bredde og højde (x og y er øverste venstre hjørne). Ellers null.

Regler:
- Skriv på samme sprog som opskriften, normalt dansk.
- Mængder som tal: ½ = 0.5, 1½ = 1.5, ¼ = 0.25.
- Enheder som g, kg, ml, dl, l, tsk., spsk., fed, nip, stk. Uden enhed (fx "2 løg") er enhed null.
- Udelad overstregede ingredienser og trin.
- "krydderi" er true for tørre krydderier, krydderiblandinger, salt og peber.
- "noegle" er true for højst én ingrediens: hovedingrediensen, typisk kød eller fisk.
- "gruppe" bruges til afsnit som "Serveres med", "Sauce" eller "Dej". Almindelige ingredienser har null.
- Gæt ikke på tekst, der ikke kan læses. Udelad den hellere.
"""


def _parse(text: str) -> dict[str, Any]:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise HomeAssistantError("Svaret fra AI indeholdt ingen opskrift")
    return json.loads(text[start : end + 1])


FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}


def _num(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    text = str(value).strip().replace(",", ".")
    extra = 0.0
    for symbol, fraction in FRACTIONS.items():
        if symbol in text:
            extra += fraction
            text = text.replace(symbol, "")
    text = text.strip()
    try:
        number = (float(text) if text else 0.0) + extra
    except ValueError:
        return None
    return round(number, 3) if number > 0 else None


def _txt(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _to_recipe(raw: dict[str, Any]) -> dict[str, Any]:
    recipe: dict[str, Any] = {"navn": _txt(raw.get("navn")) or "Ny opskrift"}
    for key in ("tid", "kategori", "noter"):
        if value := _txt(raw.get(key)):
            recipe[key] = value
    if personer := _num(raw.get("personer")):
        recipe["personer"] = personer
    recipe["maerker"] = [t for t in (_txt(m) for m in raw.get("maerker") or []) if t][:8]
    ingredients = []
    key_used = False
    for item in raw.get("ingredienser") or []:
        if not isinstance(item, dict) or not (navn := _txt(item.get("navn"))):
            continue
        ing: dict[str, Any] = {"navn": navn}
        if maengde := _num(item.get("maengde")):
            ing["maengde"] = maengde
        for key in ("enhed", "note", "gruppe"):
            if value := _txt(item.get(key)):
                ing[key] = value
        if item.get("krydderi") is True:
            ing["krydderi"] = True
        if item.get("noegle") is True and "maengde" in ing and not key_used:
            ing["noegle"] = True
            key_used = True
        ingredients.append(ing)
    recipe["ingredienser"] = ingredients
    recipe["fremgang"] = [
        {"tekst": t, "billeder": []} for t in (_txt(s) for s in raw.get("fremgang") or []) if t
    ]
    return recipe


async def async_read_recipe(hass: HomeAssistant, image_id: str) -> dict[str, Any]:
    try:
        response = await hass.services.async_call(
            "ai_task",
            "generate_data",
            {
                "task_name": "opskrift fra billede",
                "instructions": PROMPT,
                "attachments": [
                    {
                        "media_content_id": f"media-source://{DOMAIN}/{image_id}",
                        "media_content_type": "image/jpeg",
                    }
                ],
            },
            blocking=True,
            return_response=True,
        )
    except Exception as err:  # noqa: BLE001 - videregiv fejlen læsbart til kortet
        raise HomeAssistantError(f"AI Task fejlede: {err}") from err
    data = (response or {}).get("data")
    raw = data if isinstance(data, dict) else _parse(str(data or ""))
    recipe = _to_recipe(raw)
    box = raw.get("billede_udsnit")
    if isinstance(box, dict):
        crop_id = await hass.async_add_executor_job(crop_image, image_dir(hass), image_id, box)
        if crop_id:
            recipe["billede"] = crop_id
    return recipe
