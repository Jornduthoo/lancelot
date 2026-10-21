# LANcelot

Een gratis klasquiz die op je eigen pc draait. Leerlingen spelen mee via de browser op hun telefoon, tablet of laptop, over het wifi-netwerk van de school. Geen accounts en geen internet nodig.

## Starten (Windows)

1. Installeer eenmalig [Node.js](https://nodejs.org) (de LTS-versie).
2. Dubbelklik op **start.bat**. Het docentenscherm opent vanzelf.
3. Leerlingen gaan naar het adres dat op het bord staat, bijvoorbeeld `http://192.168.1.20:3000`.

Meer uitleg en hulp bij verbindingsproblemen staat in de [handleiding voor in de klas](docs/handleiding-klas.md).

Liever via de opdrachtprompt? Gebruik dan `npm install` en `npm start`, en open daarna http://localhost:3000/host.

## Een quiz maken met AI (gratis)

1. Klik op het docentenscherm op **Nieuwe quiz met AI**.
2. Vul het onderwerp, het niveau en het aantal vragen in.
3. Klik op **Kopieer prompt** en plak de prompt in een gratis chatbot, zoals Gemini, ChatGPT of Claude.
4. Kopieer het hele antwoord van de chatbot, plak het terug in LANcelot en klik op **Controleren**.
5. Lees de vragen na, pas ze aan waar nodig en klik op **Opslaan en spelen**.

Er is geen API-key nodig en het kost niets. Met **Lege quiz** maak je zelf een quiz, en met **Bewerken** pas je een bestaande quiz aan.

## Quizbestanden

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
