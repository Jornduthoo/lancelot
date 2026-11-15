# In Beeld → LANcelot: zo moeten de kaarten online staan

LANcelot haalt de kaarten van In Beeld op bij `https://lancelot.network/inbeeld/api` (code: `src/inbeeld.js`).
Gewone, vaste bestanden volstaan (Cloudflare kan ze zo serveren). Internet is alleen nodig om op te halen:
daarna staan kaarten en beelden op de pc van de leerkracht en werkt alles over het schoolnetwerk.

## 1. De lijst: `index.json`

```json
{
  "sets": [
    { "id": "leerjaar-4", "titel": "4e leerjaar", "soort": "leerjaar", "leerjaren": ["4"], "aantal": 212 },
    { "id": "project-middeleeuwen", "titel": "Project: de middeleeuwen", "soort": "project", "leerjaren": ["5", "6"], "aantal": 30 }
  ]
}
```

- `id`: kleine letters, cijfers en streepjes.
- `soort`: `leerjaar` of `project`.
- `leerjaren`: `JK`, `K2`, `K3`, `1` … `6`.

## 2. Eén set: `sets/<id>.json`

```json
{
  "titel": "4e leerjaar",
  "kaarten": [
    {
      "nr": "W-142",
      "woord": "de ophaalbrug",
      "uitleg": "Een brug die omhoog kan, zodat niemand de burcht in kan.",
      "zin": "De wachter haalt de ophaalbrug op.",
      "beeld": "beelden/W-142.webp",
      "leerjaren": ["4", "5"],
      "doelen": ["4.2.GL4.1"],
      "verwant": ["W-143"],
      "vak": "Wereldoriëntatie"
    }
  ]
}
```

- `nr`: 1 tot 3 hoofdletters, een streepje en een getal (W-142). Vast: hetzelfde begrip houdt altijd hetzelfde nummer.
- `woord`: met lidwoord ("de ophaalbrug"), of `woord` + `lidwoord` apart.
- `uitleg` (verplicht, kindertaal) en `zin` (voorbeeldzin, liefst met het woord erin: dan maakt LANcelot er ook een invulvraag van).
- `beeld`: webp, png of jpg, hooguit 1,5 MB, op hetzelfde adres als de kaarten (een pad ten opzichte van `/inbeeld/api/` of een volledig https-adres op lancelot.network). Beelden van een ander adres worden niet opgehaald.
- `doelen`: Op.stap-codes zoals in `doelen/<vak>-<leerjaar>.json` (2.1.GL4.3). De quiz geeft elke vraag het doel van het leerjaar van de klas.
- `verwant`: nummers van andere kaarten ("Hoort bij" op het bord).
- Een kaart die niet klopt, wordt overgeslagen; de rest komt wel binnen. Opnieuw ophalen werkt een kaart met hetzelfde nummer bij.

## 3. Terugmelden: `POST aangebracht`

Na het aanbrengen op het bord (als de leerkracht het niet uitzette) stuurt LANcelot precies dit, en niets meer:

```json
{ "kaart": "W-142", "leerjaar": "4" }
```

Eén keer per kaart, per leerjaar en per dag. Geen namen, antwoorden, logboek of schoolgegevens. Lukt het niet (geen internet),
dan probeert LANcelot het later opnieuw. Antwoord met 2xx (bv. 204).

## Wat LANcelot ermee doet

- **Woordkaarten** (Lesgeven): ophalen, kiezen per leerjaar, aanbrengen op het bord (beeld stukje per stukje, dan woord, uitleg en voorbeeldzin, voorgelezen).
- **Woorden van de week**: woorden van 4 tot 7 letters gaan naar het Runenraadsel; alle gekozen kaarten worden begrippen voor De Hofschilder.
- **Quiz**: drie vragen per kaart (wat betekent, wie ben ik, welk woord past), elk met een doel, in de map In Beeld.
- **LANcelot Junior**: woorden van de week voor het raadsel van vandaag, en een prentenreeks "Waar is …?" met de beelden.
- Niet in de Store-versie (alleen voor België). Ingebouwde voorbeeldkaarten (V-1 … V-16) om alles meteen te proberen.
