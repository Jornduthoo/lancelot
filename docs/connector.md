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

Lezen: `gezondheid`, `klas`, `toetsen`, `toets`, `toets_controleren` (ook als droge run met een toets-JSON, met
voorbeeldlink), `toets_versies`, `formaat` (de handleiding van het JSON-formaat), `taken`, `afnames`, `resultaten_toets`,
`resultaten_leerling`, `antwoord`, `quizzen`, `quiz`, `quiz_resultaten`, `oefenbladen`, `oefenblad`, `mappen`,
`weekexport` (json of csv), `dagpresentaties`, `dagpresentatie`, `logboek`, `sync_starten`.

Klaarzetten: `toets_bewaren`, `toetsen_bewaren` (tot 50, verslag per toets), `toets_kopieren`, `toets_naar_map`,
`vraag_toevoegen`, `vraag_wijzigen`, `vraag_verplaatsen`, `vraag_weghalen`, `toets_instellen`, `niveau_maken`,
`beeld_toevoegen` (data-adres of https), `toets_terugzetten`, `quiz_maken`, `quiz_bijwerken`, `oefenblad_bewaren`,
`map_maken`, `map_hernoemen`, `naar_map`, `taak_geven` (ook een quiz in een spel, gepland met `vanaf`, met `einddatum` en `tijdslimiet`),
`taak_leerlingen_toevoegen`, `taak_verplaatsen`, `taak_keuzes`, `taak_intrekken`, `taak_heropenen`,
`dagpresentatie_plaatsen`.

Peilen (`src/connector-peilen.js`): lezen met `peilingen`, `peiling`, `peiling_resultaten` (gespeelde peilingen per
vraag: stemmen, schaal met gemiddelde, woordwolk, open antwoorden; met `live` de stand van wat nu op het bord loopt; altijd
anoniem) en `voorkennis`. Klaarzetten met `peiling_maken` (met `doel: "voorkennis"` om voorkennis te activeren, komt in
de map Voorkennis), `peiling_bijwerken` (vorige versie in `rondetafel/_versies`), `peiling_starten` (het welkomstscherm
met QR-code op het bord; de leerkracht leidt ze zelf in De Ronde Tafel; niet als er al iets loopt), `peiling_stoppen`
(bewaart de antwoorden) en `voorkennisquiz_maken` (voorkennis peilen: een quiz "Voorkennis les <nr> · <onderwerp>" in
`Voorkennis/<map van de lessen>`, zodat ze bij die les staat in De Kronieken en De Zonnewijzer).

Versies: elke wijziging via de connector bewaart eerst de vorige versie in `proeven/_versies` (quizzen:
`quizzes/_versies`, oefenbladen: `oefenbladen/_versies`). Een toets die al gegeven werd, verandert nooit: de wijziging
komt in een nieuwe toets met "(v2)" in de titel. Een quiz of oefenblad mag bijgewerkt worden: een taak houdt haar kopie.

Dagpresentaties staan in Mijn methodes › Dagpresentaties als `JJJJ-MM-DD titel.html`. Die van vandaag staat op het
startscherm in het blok Vandaag (*Openen ▶*).

Bestaat (nog) niet in LANcelot, dus ook niet via de connector: een einddatum, tijdslimiet of aantal pogingen per taak,
gekoppelde 6/6+-paren (maak twee toetsen, bv. met `toets_kopieren`), een quiz herhaald plannen.
