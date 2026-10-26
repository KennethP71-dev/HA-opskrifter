# Opskrifter til Home Assistant

En opskriftssamling, der bor i Home Assistant. Du kan oprette, rette og slette opskrifter direkte på dashboardet. Opskrifterne skaleres efter antal personer, en nøgleingrediens (fx 1500 g kylling) eller krydderistyrke.

- Opskrifterne gemmes i `.storage/opskrifter.data` og kommer med i HA's backups.
- Ændringer vises med det samme på alle åbne dashboards og enheder.
- Kortet indlæses automatisk af integrationen. Du skal ikke oprette en ressource.
- Første gang integrationen sættes op, lægges "Nem smørkylling" ind som eksempel.
- Familiemedlemmer giver 1–5 stjerner pr. opskrift. Familien redigeres i kortet under Familie.
- Historik over hvornår retten er lavet (I dag, I går eller valgfri dato). Listen kan sorteres efter navn, senest lavet, længst siden, mest lavet og bedst bedømt.
- Mærker som kødtype, grøntsager eller spicy bruges til søgning og filtre.
- **Start fra et billede:** Tag et billede af en opskrift, så aflæser AI'en den og udfylder editoren. Kræver en AI Task-enhed med understøttelse af vedhæftede filer, fx Anthropic (Claude), valgt som standard under Indstillinger → System → AI.
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
| `opskrifter/subscribe` | Sender alle opskrifter og familien nu og ved hver ændring |
| `opskrifter/list` | Henter alle opskrifter |
| `opskrifter/save` | Opretter eller opdaterer (`opskrift`, med `id` ved opdatering) |
| `opskrifter/delete` | Sletter (`opskrift_id`) |
| `opskrifter/import` | Importerer en liste og springer over navne, der allerede findes |
| `opskrifter/lavet` | Registrerer at en ret er lavet (`opskrift_id`, `dato`) |
| `opskrifter/lavet_slet` | Fjerner en dato fra historikken (`opskrift_id`, `dato`) |
| `opskrifter/bedoem` | Giver stjerner (`opskrift_id`, `person`, `stjerner` 0–5, hvor 0 fjerner) |
| `opskrifter/familie_gem` | Gemmer familien (`familie`: liste med `navn` og evt. `id`) |
| `opskrifter/fra_billede` | Aflæser en opskrift fra et uploadet billede (`billede_id`) og returnerer et udkast. Gemmer intet |

## Krav

Home Assistant 2024.7 eller nyere.
