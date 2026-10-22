# LANcelot

Een gratis klasquiz die op je eigen pc draait. Leerlingen scannen de QR-code op het bord en spelen mee via de browser op hun telefoon, tablet of laptop, over het wifi-netwerk van de school. Het spelen loopt over het lokale netwerk: snel, zonder accounts en zonder dat er gegevens naar de cloud gaan. Alleen een quiz maken met AI heeft internet nodig.

Het thema: middeleeuws met een scifi-kantje. Het startscherm heeft drie delen:

1. **Oefenvormen**, spelend oefenen met je eigen quizzen:
   - **Toernooi**: snelle quiz, wie antwoordt het snelst en het best?
   - **Schattenjacht**: verdien goud met goede antwoorden en koop slimme upgrades
   - **De prinses in de toren**: klim met je ridder naar de top; goede antwoorden geven energie
   - **Laserslag** en **Laserslag 3D**: lasergevecht rood tegen blauw of ieder voor zich; munitie verdien je met goede antwoorden
   - **Ridderrace**: een racegame in 3D op hoverrossen; goede antwoorden vullen je tank en geven turbo
   - **Kristalroof**: mijn kristallen met goede antwoorden, open kisten en kraak de kluis van een ander met diens geheime woord
   - **De Verrader**: zoals Among Us. Ridders herstellen de kristalkern met goede antwoorden, de geheime verraders betoveren ze. Aan de Ronde Tafel praat de klas en stemt wie verbannen wordt
2. **De Ronde Tafel**, peilen met de hele klas: polls, stellingen, woordwolken, open vragen en schalen, live op het bord. Met **Voorkennis activeren** maak je met AI meteen een peiling voor het begin van een les.
3. **Generator**: **live oefenbladen** die leerlingen invullen en die zichzelf verbeteren, en **werkbladen** om te printen, met een verbeterblad.

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

Met **+ Nieuwe map** orden je je quizzen in mappen (per vak of klas). Sleep een quiz naar een map, of kies de map met het 📁-knopje in de rij. Een map klap je open en dicht door erop te klikken. Mappen kunnen ook in mappen: maak een submap met **+📁** in de kop van een map, en sleep een map aan het ⋮⋮-handvat naar een andere map (of naar *Zonder map* om ze weer bovenaan te zetten). Wie een map verwijdert, verliest niets: de items komen in de map erboven. Oefenbladen en Ronde Tafel-sessies orden je op dezelfde manier. De indeling staat in `_mappen.json` in elke map; de quizbestanden zelf blijven waar ze zijn.

### Exporteren en importeren

Thuis voorbereiden op je laptop en in de klas op de bord-pc gebruiken? Met **⬇** naast een quiz, oefenblad of sessie bewaar je die als bestand. Met **⬇** naast een map exporteer je de hele map met de mappen erin, en **⬇ Alles exporteren** neemt alles mee, met de mappen erbij. Op de andere pc klik je op **⬆ Importeren** (of sleep je het bestand op de lijst, of op een map). Wat er al precies zo staat, wordt overgeslagen, dus je kan gerust opnieuw importeren. Je kan ook een gewoon quizbestand (`.json`) van een collega importeren.

Met **Lege quiz** maak je zelf een quiz, en met **Bewerken** pas je een bestaande quiz aan. Dat kan ook rechtstreeks vanuit Schattenjacht en De prinses in de toren; na het opslaan kom je daar terug.

### Nog sneller: met je eigen Gemini-sleutel

Maak gratis een sleutel aan op [aistudio.google.com/apikey](https://aistudio.google.com/apikey) en vul hem in bij **Instellingen**. In de quizmaker verschijnt dan het blok **Of: laat Gemini de quiz direct maken**. Daar upload je je lesstof (screenshot, foto of pdf, ook met Ctrl+V) rechtstreeks in LANcelot en maak je de quiz met één klik op **Maak direct met Gemini**. Zolang je in AI Studio geen betaalgegevens koppelt, kost het niets (er geldt een gratis daglimiet). De sleutel staat alleen op je eigen pc, in `settings.json`, en gaat nooit naar GitHub.

## De Ronde Tafel

Stel de klas vragen en zie de antwoorden live op het bord, zoals bij Mentimeter. Leerlingen antwoorden anoniem via dezelfde QR-code.

- **Meerkeuze** (ook voor stellingen): 2 tot 6 keuzes, met balken die live meegroeien. Leerlingen mogen van mening veranderen.
- **Woordwolk**: elke leerling geeft tot 3 woorden; woorden die vaker voorkomen worden groter.
- **Open vraag**: korte antwoorden verschijnen als kaartjes op het bord.
- **Schaal**: 1 tot 5, met het gemiddelde erbij.

Klik op een woord of een kaartje om het te verbergen (handig bij flauwe antwoorden). Met **Sluit antwoorden** stop je het stemmen voor die vraag, en met **Verberg resultaten** laat je eerst iedereen antwoorden voor je de uitslag toont. Een sessie maak je zelf, of met AI op dezelfde manier als een quiz. Sessies staan als JSON-bestanden in de map `rondetafel/`.

## Schattenjacht

Elke leerling beantwoordt op eigen tempo vragen uit een quiz, zoals bij Gimkit. Een goed antwoord levert goud op, een fout kost een beetje goud. In de **schatkamer** koop je upgrades:

- **Scherper zwaard**: meer goud per goed antwoord (10 → 25 → 60 → 150 → 400).
- **Kroon van de reeks**: extra goud voor elk antwoord op rij goed.
- **Drakenschild**: minder goud kwijt bij een fout.
- **Gouden dubbelaar**: dubbel goud voor je volgende 6 goede antwoorden.

Wie na de speeltijd (3 tot 15 minuten) het meeste goud heeft, wint. Op het bord zie je een live goudrace, wat er gekocht wordt en het goud van de hele klas.

## De prinses in de toren

Een platformspel in Mario-stijl. Elke leerling klimt op de gsm met een ridder in dezelfde scifi-riddertoren, van platform naar platform, langs laserpoorten, drones en stekels. Wie geraakt wordt, valt een stuk naar beneden. Iedereen ziet de andere ridders live meeklimmen.

- **Elke sprong kost ⚡ energie.** Is de energie op, dan verschijnt een vraag uit de gekozen quiz: juist geeft +5 ⚡, fout +1 ⚡. Met de knop **⚡ Vraag** kan een leerling ook zelf energie tanken.
- **Winnen:** wie als eerste de prinses bovenaan (verdieping 80) redt, wint. Redt niemand haar, dan wint wie het hoogst staat als de tijd om is (3 tot 15 minuten).
- **Op het bord** zie je de toren met de leider in beeld, een overzicht van de hele toren met alle ridders, de tussenstand en wat er gebeurt.
- **Besturing:** knoppen op het scherm, of op een laptop de pijltjes en de spatiebalk.

## Laserslag

Een lasergevecht in een scifi-arena, van bovenaf. De ridders schieten elkaar met laserlansen uit, rood tegen blauw of ieder voor zich. Wie drie keer geraakt is, teleporteert terug naar zijn kamp. Geen bloed, wel spanning.

- **Elk schot kost ⚡ munitie, en munitie krijg je alleen met goede antwoorden** (meer naarmate je reeks langer is). Tijdens een vraag staat de leerling in een schild en kan niemand hem raken.
- **Krachten:** drie juist op rij of het kristal in het midden geeft drievoudig schot, snelvuur, een energieschild of volle levens.
- **Punten:** 100 per slag, 150 extra voor een gezochte ridder (🎯, met een reeks van 3 of meer), 25 per goed antwoord, 50 voor het kristal.
- **Besturing:** op een gsm een joystick (links slepen) en een vuurknop die automatisch richt; op een Chromebook WASD of de pijltjes en de muis.
- **Op het bord** zie je de hele arena live, de teamstand, de rangschikking en wie wie uitschakelt.
- **Laserslag 3D:** kies bij *Zicht* voor *First person* (of de kaart Laserslag 3D op het startscherm). Dezelfde arena en regels, maar de leerling kijkt door de ogen van zijn ridder. Gsm: links slepen om te lopen, rechts slepen om rond te kijken. Chromebook: klik om de muis te vangen, WASD om te lopen, de muis om te kijken. Een kleine richthulp helpt wie bijna mikt. Het bord toont de arena van bovenaf.

## Kristalroof

Een spel vol list, zoals Crypto Hack. Elke leerling kiest bij het begin een **geheim woord** uit vier woorden en houdt het geheim. Daarna beantwoordt iedereen op eigen tempo vragen.

- **Goed antwoord:** kies een van drie kisten. Er zitten kristallen in (meer naarmate je meer goed hebt), een verdubbelaar, een schild (45 seconden onberoofbaar), soms pech (15% kwijt)... of een **roof**.
- **Roof:** kies een andere ridder en raad diens geheime woord uit drie woorden. Juist? Dan neem je 15 tot 40% van diens kristallen mee. Wie net beroofd is, staat 20 seconden achter een schild. Het slachtoffer ziet wie de kluis kraakte (of probeerde te kraken).
- **Fout antwoord:** geen kist.
- Op het bord zie je de kristalrace, wie wie berooft en de kristallen van de hele klas. Wie op het einde de meeste kristallen heeft, wint. Resultaten in `resultaten/`.

## De Verrader

Een spel zoals Among Us, met de hele klas. Bij de start krijgt iedereen in het geheim een rol: **ridder** of **verrader** (1 verrader tot 7 spelers, 2 vanaf 8, 3 vanaf 16; of kies zelf). Minstens 3 spelers.

- **Ridders** beantwoorden vragen. Elk goed antwoord herstelt de **kristalkern**. Is de kern vol, dan winnen de ridders. Elke 4 goede antwoorden krijgt een ridder een tip: de naam van iemand die zeker te vertrouwen is.
- **Verraders** beantwoorden ook vragen, zodat niemand iets merkt, maar hun antwoorden helpen de kern niet. Na 3 goede antwoorden kunnen ze een ridder **betoveren**. Die wordt een geest: geesten stemmen niet meer, maar hun antwoorden helpen de kern nog.
- Na een betovering (of als iemand de 📯 hoorn blaast, één keer per speler) komt **de Ronde Tafel** samen: eerst praten (kort, normaal of lang), dan stemmen op wie verbannen wordt, of overslaan. De meeste stemmen wint; bij gelijke stand gebeurt er niets.
- De ridders winnen als de kern hersteld is of alle verraders verbannen zijn. De verraders winnen als ze even talrijk zijn als de ridders, of als de tijd op is.
- Op het bord zie je de kern, wie nog meedoet en de Ronde Tafel groot. De rollen worden pas op het einde getoond. Resultaten in `resultaten/`.

## Ridderrace

Een echte racegame in 3D: ridders racen op hoverrossen over een neoncircuit rond een burcht. Elke leerling rijdt op zijn eigen gsm of Chromebook; het bord toont het circuit van bovenaf met alle racers, de stand en de snelste ronde.

- **Rijden kost ⛽ brandstof. Tanken doe je in de pitstop met quizvragen.** Elk goed antwoord vult de tank (meer bij een reeks), twee juist op rij geeft een 🚀 turbo. Zonder brandstof kruip je vooruit. Wie lang in de pitstop staat, wordt wel ingehaald: snel en juist antwoorden loont.
- **Op de baan:** kristallen geven een beetje brandstof, gouden pijlen een korte boost. Naast de weg rijden is traag, en tegen een ros vlak voor je bots je.
- **Besturing:** gsm met ◀ ▶, 🚀 Turbo en ⛽ Tanken; Chromebook met de pijltjes (of A en D), ↓ remt, spatie is turbo, E is tanken, 1-4 antwoorden.
- **Winnen:** wie na de racetijd (3 tot 10 minuten) het verst staat. De resultaten (ronden, snelste ronde, vragen juist en fout) gaan naar `resultaten/`.

## Oefenbladen

Echte oefenbladen, maar virtueel. Leerlingen vullen ze in op hun Chromebook of gsm, en LANcelot verbetert meteen. Een blad bestaat uit blokken:

| Blok | Wat de leerling doet | Zo typ je het in de maker |
|---|---|---|
| Lees | een tekst of uitleg lezen | gewone tekst |
| Invullen | woorden in de gaten typen | `De hoofdstad is [Brussel].` (meerdere goede antwoorden: `[fiets\|velo]`) |
| Meerkeuze | het juiste antwoord kiezen | `vraag \| keuze \| *goede keuze \| keuze` |
| Juist of fout | J of F kiezen | `zin \| J` of `zin \| F` |
| Verbinden | links met rechts verbinden | `Antwerpen = Schelde` |
| Woordjes | vertalen of het woord geven | `de stad = la ville` |
| Overschrijven | een zin foutloos overschrijven | één zin per regel |
| Open vragen | vrij antwoorden (niet verbeterd) | één vraag per regel |

- **Maken:** zelf in de maker (met een live voorbeeld ernaast), of met AI: kies onderwerp, niveau en soorten oefeningen, kopieer de vraag naar een chatbot en plak het antwoord terug (of laat je Gemini-sleutel het meteen doen).
- **Live:** klik op **Live**. Kies vooraf of leerlingen **meteen** groen of rood zien, of pas **na het inleveren**. Op het bord zie je per leerling hoe ver hij staat en hoeveel goed en fout, en per oefening hoeveel procent van de klas het goed heeft. Klik op een leerling om zijn blad te bekijken. Met **Toon oplossingen** zien leerlingen die ingeleverd hebben de verbetering. **Afsluiten** levert alles in en bewaart de resultaten in `resultaten/`.
- **Printen:** **🖨 Print** opent het blad als A4 met lijnen, vakjes en Naam/Klas/Datum; **Verbeterblad** toont hetzelfde blad met de oplossingen in het rood. Opslaan als pdf kan ook.
- Bladen staan als JSON-bestanden in de map `oefenbladen/` (zie `oefenbladen/voorbeeld-belgie.json`).

## Resultaten

Na elk spel worden de resultaten automatisch bewaard in de map `resultaten`, als bestand dat opent in Excel. Je ziet per leerling de rang, de score en per vraag of het antwoord goed of fout was, en per vraag hoeveel procent van de klas het goed had. Op het docentenscherm vind je ze onder **Resultaten** (met **Download** en **Open map**), en na elke quiz staat er een downloadlink onder het podium. De resultaten blijven op je eigen pc.

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
