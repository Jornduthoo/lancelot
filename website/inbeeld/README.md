# In Beeld (lancelot.network/inbeeld)

Eén begrip, één kaart, van de jongste kleuters tot het 6de leerjaar. Een apart project naast LANcelot,
maar het staat op dezelfde site (Cloudflare zet `website/site` online bij elke merge op main).

## Wat waar staat

- `website/inbeeld/kaartenbank.json`: de bron, alle kaarten (nummer, woord, uitleg, voorbeeld, leerjaar, terug in, doelcodes, verwant).
- `website/inbeeld/bouw.js`: maakt de bestanden voor de site. **Na elke wijziging aan de kaartenbank of de beelden:**
  `node website/inbeeld/bouw.js`
- `website/site/inbeeld/`: de website zelf (gewone html, css en JavaScript, geen bibliotheken behalve `qrcode.js`).
  - `app.js`: kaarten, woordbib, woordweb, projecten, aanmelden (klas, dan voornaam, dan code of dier).
  - `spellen.js`: de spelletjes (dagelijkse 5, luister en zoek, wie ben ik, memory, welk woord past, sorteren, knoop het vast, woordraadsel, wat betekent het).
  - `leerkracht.js`: leerkrachtscherm (klassen, voornamen en codes, inlogkaartjes met QR, kaarten aanbrengen, projecten, klasoverzicht, doorschuiven, afdrukken).
  - `data/kaarten.js`: gemaakt door `bouw.js`.
  - `api/`: wat LANcelot ophaalt (`index.json`, `sets/leerjaar-*.json`, `beelden/<nr>.webp`). Formaat: `docs/inbeeld-formaat.md`.
- `website/worker.js`: vangt enkel `POST /inbeeld/api/aangebracht` op (LANcelot meldt "kaart X aangebracht in leerjaar Y") en geeft dat door aan de database.
- `website/inbeeld/database.sql`: de database in Supabase (zelfde project als de oefentoetsen), schema `inbeeld`.
  De site praat enkel met de functies `public.ib_*`. Opnieuw uitvoeren mag (alles is `if not exists` / `create or replace`).

## Beelden toevoegen

Zet een transparante png per kaart in `/mnt/project-files/in-beeld/beelden/...` of rechtstreeks als webp in
`website/site/inbeeld/api/beelden/<nr>.webp` (vierkant, liefst 600×600 of groter) en draai `bouw.js`.
Kaarten zonder beeld tonen de eerste letter van het woord.

## Leerkrachten

Een leerkracht maakt een account met de schoolcode (staat in de tabel `inbeeld.config`, sleutel `schoolcode`).
Daarna: klas maken, voornamen plakken, inlogkaartjes afdrukken. Kleuters en het 1ste leerjaar krijgen een dier in plaats van 4 cijfers.

## Privacy

Per leerling enkel voornaam, klas, de code (versleuteld) en welke kaarten geoefend werden. LANcelot stuurt nooit namen of resultaten.
