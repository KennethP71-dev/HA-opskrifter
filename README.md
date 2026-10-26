# Opskrifter til Home Assistant

En opskriftssamling, der bor i Home Assistant. Du kan oprette, rette og slette opskrifter direkte på dashboardet. Opskrifterne skaleres efter antal personer, en nøgleingrediens (fx 1500 g kylling) eller krydderistyrke.

- Opskrifterne gemmes i `.storage/opskrifter.data` og kommer med i HA's backups.
- Ændringer vises med det samme på alle åbne dashboards og enheder.
- Kortet indlæses automatisk af integrationen. Du skal ikke oprette en ressource.
- Første gang integrationen sættes op, lægges "Nem smørkylling" ind som eksempel.
- Billeder (hovedbillede og billeder pr. trin) uploades direkte fra editoren. De skaleres ned og gemmes i `/config/opskrifter/billeder`, som også kommer med i backups. Ubrugte billeder ryddes op automatisk.

## Installation via HACS

1. HACS → ⋮ → **Brugerdefinerede repositories**. Indsæt URL'en til dette repo og vælg typen **Integration**.
2. Find **Opskrifter** i HACS, og tryk **Download**.
3. Genstart Home Assistant.
4. Indstillinger → Enheder og tjenester → **Tilføj integration** → **Opskrifter**.
5. Redigér et dashboard → **Tilføj kort** → søg efter **Opskrift-kort**. Du kan også indsætte YAML'en nedenfor manuelt.

## Kortet

```yaml
type: custom:opskrift-card
titel: Opskrifter
ikon: mdi:chef-hat
farve: orange
```

| Indstilling | Beskrivelse |
| --- | --- |
| `titel` | Overskrift på kortet |
| `ikon` | MDI-ikon i kortets top |
| `farve` | Accentfarve, fx `orange`, `green`, `blue` |
| `kun_laes` | `true` skjuler knapperne til at oprette, rette og slette |
| `opskrifter` | Bruges kun til at importere opskrifter fra kortets YAML. Kortet tilbyder selv importen |

## Felter i en opskrift

| Felt | Betydning |
| --- | --- |
| Personer | Grundopskriftens antal. Bruges til skalering efter personer |
| Krydderistyrke | Standard i % for ingredienser markeret som krydderi |
| Krydderi | Ingrediensen følger krydderistyrken |
| Skalér efter denne | Ingrediensen kan vælges som udgangspunkt for skalering |
| Fast mængde | Ingrediensen skaleres ikke |
| Gruppe | Fx "Serveres med" eller "Sauce". Vises som egen sektion |

Mængder afrundes til noget, der kan måles op: skeer og dl til ¼, gram til 5/10/25, fed og nip til hele.

## Websocket-API

| Kommando | Funktion |
| --- | --- |
| `opskrifter/subscribe` | Sender alle opskrifter nu og ved hver ændring |
| `opskrifter/list` | Henter alle opskrifter |
| `opskrifter/save` | Opretter eller opdaterer (`opskrift`, med `id` ved opdatering) |
| `opskrifter/delete` | Sletter (`id`) |
| `opskrifter/import` | Importerer en liste og springer over navne, der allerede findes |

## Krav

Home Assistant 2024.7 eller nyere.
