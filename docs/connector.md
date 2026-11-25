# Connector voor Claude

Claude (of een andere AI-assistent) werkt rechtstreeks met LANcelot: toetsen klaarzetten en toewijzen, resultaten
lezen, taken intrekken en een dagpresentatie op het bord zetten, zonder op het scherm te klikken.
Code: `src/connector.js` (sleutels, logboek, MCP, tunnel) en `src/connector-tools.js` (de tools). Test: `test/connector.test.js`.

## Veiligheid

- **Standaard uit.** Instellingen › Connector › *Connector aan*.
- **Sleutel**: de leerkracht maakt ze zelf (*Nieuwe sleutel*). Ze staat maar één keer op het scherm; LANcelot bewaart
  enkel een hash (`connector/connector.json` in de gegevensmap). *Intrekken* kan altijd.
- **Alleen lezen** tot de leerkracht *Claude mag ook klaarzetten* aanvinkt.
- **Logboek**: elke oproep (`connector/logboek.jsonl`), zichtbaar onderaan Instellingen › Connector.
- **Niets verwijderen**: een taak intrekken = afsluiten (wie bezig is, levert in). Een toets bijwerken die al gegeven
  werd, geeft een nieuwe toets; anders gaat de vorige versie naar `proeven/_versies`. Een dagpresentatie wordt nooit
  overschreven.
- **Geen geheimen**: de gezondheidscontrole zegt enkel óf een voorleessleutel ingesteld is.
- De map `connector/` gaat niet mee met Mijn lesmap en niet in de back-up-zip. Ze hoort bij deze ene pc.

## Adressen

| Waar | Adres |
| --- | --- |
| MCP (Streamable HTTP, zonder sessie) | `POST /mcp/<sleutel>` of `POST /mcp` met `Authorization: Bearer <sleutel>` |
| Dezelfde tools als JSON | `GET /api/v1` (lijst), `POST /api/v1/<tool>` met de argumenten als JSON |

## Via internet (Claude op claude.ai of in de app)

*Bereikbaar via internet* start een Cloudflare-tunnel (`cloudflared`, op Windows de eerste keer vanzelf gedownload
naar `connector/`). De tunnel wijst naar een aparte server op `127.0.0.1:47821` met **alleen** de connector: de
leerkrachtschermen zijn via de tunnel nooit bereikbaar (ook niet als ze voor LANcelot "lokaal" lijken).

- Zonder token: een snel adres `https://…trycloudflare.com`. Het verandert als de pc herstart.
- Met een eigen tunnel (vast adres): in Cloudflare › Zero Trust › Networks › Tunnels › *Create a tunnel* ›
  Cloudflared, een naam geven, het token kopiëren (de lange tekst na `--token`). Bij *Public hostname* een adres
  kiezen (bv. `bord.<jouw-domein>`) met Service `HTTP` en `localhost:47821`. Token en adres plakken onder
  *Vast adres* in LANcelot.

## In Claude toevoegen

1. Claude › Instellingen › Connectors › *Aangepaste connector toevoegen*.
2. Naam: `LANcelot`. URL: het adres dat LANcelot toont na *Nieuwe sleutel* (`https://…/mcp/lnc_…`).
3. Claude Code op de klas-pc: `claude mcp add --transport http lancelot http://localhost:3000/mcp --header "Authorization: Bearer lnc_…"`.

## Tools

Lezen: `gezondheid`, `klas`, `toetsen`, `toets`, `toets_controleren`, `taken`, `afnames`, `resultaten_toets`,
`resultaten_leerling`, `antwoord`, `dagpresentaties`, `dagpresentatie`, `logboek`.
Klaarzetten: `toets_bewaren`, `toets_kopieren`, `toets_naar_map`, `taak_geven`, `taak_leerlingen_toevoegen`,
`taak_verplaatsen`, `taak_keuzes`, `taak_intrekken`, `taak_heropenen`, `dagpresentatie_plaatsen`.

Dagpresentaties staan in Mijn methodes › Dagpresentaties als `JJJJ-MM-DD titel.html`. Die van vandaag staat op het
startscherm in het blok Vandaag (*Openen ▶*).

Nog niet (volgende stap): quizzen aanmaken en plannen, beelden bij een toets, een weekexport, synchronisatie starten.
