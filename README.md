# LANcelot

Een gratis klasquiz die op je eigen pc draait. Leerlingen scannen de QR-code op het bord en spelen mee via de browser op hun telefoon, tablet of laptop, over het wifi-netwerk van de school. Het spelen loopt over het lokale netwerk: snel, zonder accounts en zonder dat er gegevens naar de cloud gaan. Alleen een quiz maken met AI heeft internet nodig.

Het thema: middeleeuws met een scifi-kantje. Op het startscherm kies je een spel:

- **Toernooi**: snelle quiz, wie antwoordt het snelst en het best? (klaar)
- **De Ronde Tafel**: polls, stellingen, woordwolken, open vragen en schalen, live op het bord (klaar)
- **Schattenjacht** (binnenkort)
- **De prinses in de toren**: klim met je ridder naar de top; goede antwoorden geven energie (klaar)

## Starten (Windows)

1. Installeer eenmalig [Node.js](https://nodejs.org) (de LTS-versie).
2. Dubbelklik op **Start LANcelot.bat**. Het docentenscherm opent vanzelf.
3. Leerlingen gaan naar het adres dat op het bord staat, bijvoorbeeld `http://192.168.1.20:3000`.

Meer uitleg en hulp bij verbindingsproblemen staat in de [handleiding voor in de klas](docs/handleiding-klas.md).

Liever via de opdrachtprompt? Gebruik dan `npm install` en `npm start`, en open daarna http://localhost:3000/host.

## Een quiz maken met AI (gratis)

1. Kies op het docentenscherm **Toernooi** en klik op **Nieuwe quiz met AI**.
2. Vul het onderwerp, het niveau (bv. 5e leerjaar of 2e middelbaar) en het aantal vragen in.
3. Wil je de quiz baseren op je lesstof (een screenshot van het bordboek of een pdf)? Vink bij stap 2 aan dat je die zelf in de chatbot toevoegt; de prompt vraagt de AI dan om de vragen daarop te baseren.
4. Klik op **Gemini**, **ChatGPT** of **Claude**. De prompt wordt gekopieerd en de chatbot opent in een nieuw tabblad. Plak de prompt daar met Ctrl+V en sleep je screenshot of pdf erbij.
5. Kopieer het antwoord van de chatbot (de kopieerknop bij het codeblok) en kom terug naar LANcelot. Het antwoord wordt dan vanzelf ingelezen. Lukt dat niet, plak het dan in het vak en klik op **Controleren**.
6. Lees de vragen na, pas ze aan waar nodig en klik op **Opslaan en spelen**.

Met **Lege quiz** maak je zelf een quiz, en met **Bewerken** pas je een bestaande quiz aan.

### Nog sneller: met je eigen Gemini-sleutel

Maak gratis een sleutel aan op [aistudio.google.com/apikey](https://aistudio.google.com/apikey) en vul hem in bij **Instellingen**. In de quizmaker verschijnt dan het blok **Of: laat Gemini de quiz direct maken**. Daar upload je je lesstof (screenshot, foto of pdf, ook met Ctrl+V) rechtstreeks in LANcelot en maak je de quiz met één klik op **Maak direct met Gemini**. Zolang je in AI Studio geen betaalgegevens koppelt, kost het niets (er geldt een gratis daglimiet). De sleutel staat alleen op je eigen pc, in `settings.json`, en gaat nooit naar GitHub.

## De Ronde Tafel

Stel de klas vragen en zie de antwoorden live op het bord, zoals bij Mentimeter. Leerlingen antwoorden anoniem via dezelfde QR-code.

- **Meerkeuze** (ook voor stellingen): 2 tot 6 keuzes, met balken die live meegroeien. Leerlingen mogen van mening veranderen.
- **Woordwolk**: elke leerling geeft tot 3 woorden; woorden die vaker voorkomen worden groter.
- **Open vraag**: korte antwoorden verschijnen als kaartjes op het bord.
- **Schaal**: 1 tot 5, met het gemiddelde erbij.

Klik op een woord of een kaartje om het te verbergen (handig bij flauwe antwoorden). Met **Sluit antwoorden** stop je het stemmen voor die vraag, en met **Verberg resultaten** laat je eerst iedereen antwoorden voor je de uitslag toont. Een sessie maak je zelf, of met AI op dezelfde manier als een quiz. Sessies staan als JSON-bestanden in de map `rondetafel/`.

## De prinses in de toren

Een platformspel in Mario-stijl. Elke leerling klimt op de gsm met een ridder in dezelfde scifi-riddertoren, van platform naar platform, langs laserpoorten, drones en stekels. Wie geraakt wordt, valt een stuk naar beneden. Iedereen ziet de andere ridders live meeklimmen.

- **Elke sprong kost ⚡ energie.** Is de energie op, dan verschijnt een vraag uit de gekozen quiz: juist geeft +5 ⚡, fout +1 ⚡. Met de knop **⚡ Vraag** kan een leerling ook zelf energie tanken.
- **Winnen:** wie als eerste de prinses bovenaan (verdieping 80) redt, wint. Redt niemand haar, dan wint wie het hoogst staat als de tijd om is (3 tot 15 minuten).
- **Op het bord** zie je de toren met de leider in beeld, een overzicht van de hele toren met alle ridders, de tussenstand en wat er gebeurt.
- **Besturing:** knoppen op het scherm, of op een laptop de pijltjes en de spatiebalk.

## Resultaten

Na elke quiz, Ronde Tafel en torenspel worden de resultaten automatisch bewaard in de map `resultaten`, als bestand dat opent in Excel. Je ziet per leerling de rang, de score en per vraag of het antwoord goed of fout was, en per vraag hoeveel procent van de klas het goed had. Op het docentenscherm vind je ze onder **Resultaten** (met **Download** en **Open map**), en na elke quiz staat er een downloadlink onder het podium. De resultaten blijven op je eigen pc.

## Quizbestanden

Quizzen zijn JSON-bestanden in de map `quizzes/`. Kijk naar `quizzes/voorbeeld-belgie.json`:

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
