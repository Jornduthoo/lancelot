# LANcelot

Een gratis klasquiz die op je eigen pc draait. Leerlingen spelen mee via de browser op hun telefoon, tablet of laptop, over het wifi-netwerk van de school. Geen accounts en geen internet nodig.

## Starten (Windows)

1. Installeer eenmalig [Node.js](https://nodejs.org) (de LTS-versie).
2. Open een opdrachtprompt in deze map en voer eenmalig `npm install` uit.
3. Start de server met `npm start`.
4. Open op je eigen pc **http://localhost:3000/host**. Dat is het docentenscherm.
5. Leerlingen gaan naar het adres dat op het bord staat, bijvoorbeeld `http://192.168.1.20:3000`.

Vraagt Windows of Node.js toegang tot het netwerk mag krijgen? Kies dan **Ja** voor privénetwerken (en eventueel openbare netwerken als het schoolnetwerk zo is ingesteld). Anders kunnen leerlingen niet verbinden.

## Een quiz maken

Quizzen zijn JSON-bestanden in de map `quizzes/`. Kijk naar `quizzes/voorbeeld.json`:

```json
{
  "title": "Mijn quiz",
  "questions": [
    { "question": "Wat is 2 + 2?", "answers": ["3", "4", "5", "22"], "correct": 1, "time": 20 }
  ]
}
```

- `answers`: 2 tot 4 antwoorden.
- `correct`: welk antwoord goed is, geteld vanaf 0 (dus `1` is het tweede antwoord).
- `time`: seconden om te antwoorden (5 tot 120, standaard 20).

## Hoe het werkt

- Snel en goed antwoorden levert 500 tot 1000 punten op.
- Een vraag sluit als de tijd om is of als iedereen heeft geantwoord. Je kunt ook zelf op **Toon antwoord** klikken.
- Leerlingen die hun pagina herladen of even geen wifi hebben, komen terug met dezelfde naam en score.
- Het docentenscherm werkt alleen op de pc waar de server draait, zodat leerlingen het spel niet kunnen besturen.
