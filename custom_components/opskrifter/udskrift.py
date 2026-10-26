"""Udskriftssider til enheder, hvor print direkte fra kortet ikke virker (fx iPhone-appen).

Kortet sender opskriftens færdigberegnede indhold som data. Siden bygges her med
escapet tekst og et fast script, så der aldrig serveres brugerleveret HTML.
"""
from __future__ import annotations

import html
import secrets
import time
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .images import ID_RE

DATA_KEY = "opskrifter_udskrifter"
TTL = 15 * 60
MAX_ITEMS = 200

STYLE = """
@page{size:A4;margin:18mm 20mm}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:11pt;line-height:1.45;margin:0;padding:24px;max-width:760px}
h1{font-size:20pt;margin:0 0 2pt}
.sub{color:#666;margin:0 0 12pt}
.hero{width:100%;max-height:70mm;object-fit:cover;border-radius:4mm;margin:0 0 6pt}
h2{font-size:13pt;margin:16pt 0 6pt}
table{border-collapse:collapse;width:100%}
td{padding:4pt 0;border-bottom:0.5pt solid #ddd;vertical-align:top}
td.a{width:34mm;font-weight:700;white-space:nowrap;padding-right:8pt}
.n{color:#666;font-size:9.5pt}
ol{padding-left:16pt;margin:0}
li{margin:0 0 5pt}
.notes{color:#555;font-size:10pt;white-space:pre-line}
.bar{position:sticky;top:0;background:#fff;padding:8px 0 12px;margin:0 0 8px;border-bottom:1px solid #eee}
.bar button{font:inherit;font-size:16px;font-weight:600;padding:10px 18px;border-radius:10px;border:none;background:#b5451b;color:#fff}
.bar span{color:#666;font-size:13px;margin-left:10px}
@media print{.bar{display:none}body{padding:0}}
"""

SCRIPT = (
    "<script>document.getElementById('p').addEventListener('click',function(){window.print()});"
    "window.addEventListener('load',function(){setTimeout(function(){window.print()},400)});</script>"
)


def _txt(value: Any, limit: int = 2000) -> str:
    return html.escape(str(value or "")[:limit])


def render_page(data: dict[str, Any]) -> str:
    title = _txt(data.get("titel"), 200) or "Opskrift"
    parts = [
        f'<!doctype html><html lang="da"><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>{title}</title><style>{STYLE}</style></head><body>",
        '<div class="bar"><button id="p" type="button">Udskriv</button>'
        "<span>eller brug Del → Udskriv</span></div>",
        f"<h1>{title}</h1>",
    ]
    if sub := _txt(data.get("under"), 300):
        parts.append(f'<p class="sub">{sub}</p>')
    image = str(data.get("billede") or "")
    if ID_RE.fullmatch(image):
        parts.append(f'<img class="hero" src="/api/opskrifter/billede/{image}" alt="">')
    for group in (data.get("grupper") or [])[:20]:
        if not isinstance(group, dict):
            continue
        parts.append(f"<h2>{_txt(group.get('navn'), 100)}</h2><table>")
        for line in (group.get("linjer") or [])[:MAX_ITEMS]:
            if not isinstance(line, dict):
                continue
            note = _txt(line.get("note"), 300)
            parts.append(
                f'<tr><td class="a">{_txt(line.get("maengde"), 40)}</td>'
                f'<td>{_txt(line.get("navn"), 200)}{f"<div class=n>{note}</div>" if note else ""}</td></tr>'
            )
        parts.append("</table>")
    steps = [s for s in (data.get("trin") or [])[:MAX_ITEMS] if str(s or "").strip()]
    if steps:
        parts.append("<h2>Fremgangsmåde</h2><ol>")
        parts.extend(f"<li>{_txt(s)}</li>" for s in steps)
        parts.append("</ol>")
    if notes := _txt(data.get("noter"), 5000):
        parts.append(f'<h2>Noter</h2><p class="notes">{notes}</p>')
    parts.append(SCRIPT + "</body></html>")
    return "".join(parts)


def _pages(hass: HomeAssistant) -> dict[str, tuple[str, float]]:
    pages = hass.data.setdefault(DATA_KEY, {})
    now = time.time()
    for token in [t for t, (_, expires) in pages.items() if expires < now]:
        pages.pop(token, None)
    return pages


class PrintCreateView(HomeAssistantView):
    """POST /api/opskrifter/udskrift – JSON med opskriftens indhold. Returnerer en midlertidig URL."""

    url = "/api/opskrifter/udskrift"
    name = "api:opskrifter:udskrift:create"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except ValueError:
            return self.json_message("Ugyldig forespørgsel", 400)
        if not isinstance(data, dict):
            return self.json_message("Ugyldig forespørgsel", 400)
        pages = _pages(self.hass)
        if len(pages) > 50:
            pages.pop(next(iter(pages)))
        token = secrets.token_urlsafe(24)
        pages[token] = (render_page(data), time.time() + TTL)
        return self.json({"url": f"/api/opskrifter/udskrift/{token}"})


class PrintServeView(HomeAssistantView):
    """GET /api/opskrifter/udskrift/<token>. Tokenet er tilfældigt og udløber efter 15 minutter."""

    url = "/api/opskrifter/udskrift/{token}"
    name = "api:opskrifter:udskrift:serve"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, token: str) -> web.Response:
        page = _pages(self.hass).get(token)
        if page is None:
            return web.Response(
                status=404,
                text="Udskriften er udløbet. Tryk på print igen i Home Assistant.",
                content_type="text/plain",
                charset="utf-8",
            )
        return web.Response(
            text=page[0],
            content_type="text/html",
            charset="utf-8",
            headers={
                "Cache-Control": "no-store",
                "Content-Security-Policy": (
                    "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; "
                    "script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
                ),
                "X-Content-Type-Options": "nosniff",
            },
        )
