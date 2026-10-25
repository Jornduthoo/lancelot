# LANcelot

Een gratis klasquiz die op je eigen pc draait. Leerlingen scannen de QR-code op het bord en spelen mee via de browser op hun telefoon, tablet of laptop, over het wifi-netwerk van de school. Het spelen loopt over het lokale netwerk: snel, zonder accounts en zonder dat er gegevens naar de cloud gaan. Alleen een quiz maken met AI heeft internet nodig.

Het thema: middeleeuws met een scifi-kantje. Het startscherm heeft drie grote tegels; klik op een tegel en de onderdelen verschijnen eronder:

1. **De Arena**, spelend oefenen met je eigen quizzen:
   - **Toernooi**: snelle quiz, wie antwoordt het snelst en het best?
   - **Schattenjacht**: verdien goud met goede antwoorden en koop slimme upgrades
   - **De prinses in de toren**: klim met je ridder naar de top; goede antwoorden geven energie
   - **Laserslag**: lasergevecht rood tegen blauw of ieder voor zich; munitie verdien je met goede antwoorden. Elke leerling kiest zelf het zicht: van bovenaf, achter de ridder of first person
   - **Ridderrace**: een racegame in 3D op hoverrossen; goede antwoorden vullen je tank en geven turbo
   - **Kristalroof**: mijn kristallen met goede antwoorden, open kisten en kraak de kluis van een ander met diens geheime woord
   - **De Verrader**: ridders herstellen de kristalkern met goede antwoorden, de geheime verraders betoveren ze. Aan de Ronde Tafel praat de klas en stemt wie verbannen wordt
   - **Burchtbouwers**: de hele klas bouwt samen één burcht. Elk goed antwoord is een steen die je zelf op een deel van de burcht legt. Als de tijd om is, valt de draak aan
   - **Duel in de arena**: één tegen één op dezelfde vraag, wie eerst juist antwoordt slaat toe. Een toernooischema op het bord tot er één kampioen is
   - **Pac-Knight**: alle ridders samen in één neon doolhof. Raap kristallen en ontwijk de drones; een goed antwoord geeft een kracht waarmee jij op de drones jaagt
   - **Strijdrossen**: zoals Smash Karts. Hoverrossen in een 3D-gevechtsarena; lasers, raketten en mijnen krijg je alleen met goede antwoorden
   - **Cyber-Galaga**: elke leerling vliegt op zijn eigen toestel met een jetpack tegen golven cyberdraken. Een goed antwoord geeft een beloning naar keuze (dubbele laser, schild of bom); op het einde verslaat de hele klas samen de klasbaas met één gedeelde levensbalk
   - **Bomber-Knight**: tot dertig ridders in één burchtarena. Een mijn kost energie en energie verdien je met goede antwoorden; uit kratten komen kristallen, grotere ontploffingen en schilden
   - **Neon Duel**: een vechtspel. De klas speelt in twee teams, op het bord vechten twee grote ridders. Elk goed antwoord is een slag, snel juist een combo, drie op rij een supermove
   - **Leraar-baas**: de leerkracht is de eindbaas, een reuzenridder op het bord. De klas valt samen aan met goede antwoorden, de leerkracht slaat terug
   - **Het Rijk**: een spel dat weken doorloopt. Teams veroveren les na les gebieden op een kaart; vragen over oudere leerstof komen terug om je land te verdedigen
2. **De Ronde Tafel**, peilen met de hele klas: polls, stellingen, woordwolken, open vragen en schalen, live op het bord. Met de knop **💡 Voorkennis activeren** in De Ronde Tafel maak je met AI meteen een peiling voor het begin van een les.
   - **Het Runenraadsel**: elke dag een geheim woord om in zes pogingen te kraken, op drie niveaus (Page 4 letters met hulp, Schildknaap 5, Ridder 6 of 7). Leerlingen spelen wanneer ze willen via **🔮 Runenraadsel** op hun startscherm (of `/runen`). Daarna zien ze de betekenis en een voorbeeldzin. Runen, een reeks 🔥 en een klasdoel leveren een runenkrans rond hun ridder op. Op het bord zie je alleen kleuren, tot je de woorden onthult. Eigen woorden van de week kan je toevoegen (betekenissen eventueel met AI). Gegevens in `runen/` (blijft bij updates). De lijst met geldige woorden komt van OpenTaal (BSD/CC BY 3.0, `src/woordenlijst.txt`).
3. **De Smidse**: oefenbladen maken. Een oefenblad speel je **live** (leerlingen vullen in, het verbetert zichzelf) of je kiest **🖨 Opslaan en printen** voor een werkblad op papier met verbeterblad.

## Eigen ridders

Leerlingen stellen hun eigen ridder samen: ridder of ridderes, huidskleur, haar, tien helmen (van ridderhelm tot holovizier en cyberhelm), versieringen, vijf soorten harnas (klassiek, cyber, goud, mecha, kristal), een robotarm, iets op de rug (cape, jetpack, lichtvleugels of een drone), zeven wapens (ook een plasmablaster en energiespeer) en een schild met patroon en kleur. De eerste keer opent de riddermaker vanzelf na het aanmelden; daarna kan het altijd met **🛡️ Pas je ridder aan** op het aanmeldscherm en in de lobby.

LANcelot bewaart de ridder op de naam van de leerling in `avatars.json` (blijft bewaard bij updates). De ridder staat in elke lobby, op het podium en in de eindstanden, en speelt mee: in de toren, in Laserslag (3D-zichten in de kleur van je team, en het hoofd naast de naam van bovenaf), op het hoverros in de Ridderrace, in het toernooischema van het duel, bij de bouwers van de burcht en in het doolhof van Pac-Knight.

## Tempo van de vragen

In de Ridderrace, Laserslag, De prinses in de toren, Pac-Knight, Strijdrossen, Neon Duel en Leraar-baas kies je het **tempo van de vragen**: *rustig* (een goed antwoord geeft veel brandstof, munitie, energie of een langere kracht), *normaal* of *intens* (alles raakt sneller op, dus vaker nieuwe vragen). LANcelot onthoudt je keuze.

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

Maakt Gemini een *interactieve quiz* (een app met knoppen) in plaats van een codeblok? Zet Canvas uit en vraag: "Geef me enkel de JSON als tekst, geen interactieve quiz." LANcelot herkent zo'n app en zegt het je ook. Tekst rond de JSON, krulletjes-aanhalingstekens of een komma te veel zijn geen probleem.

Met **+ Nieuwe map** orden je je quizzen in mappen (per vak of klas). Sleep een quiz naar een map, of kies de map met het 📁-knopje in de rij. Een map klap je open en dicht door erop te klikken. Mappen kunnen ook in mappen: maak een submap met **+📁** in de kop van een map, en sleep een map aan het ⋮⋮-handvat naar een andere map (of naar *Zonder map* om ze weer bovenaan te zetten). Wie een map verwijdert, verliest niets: de items komen in de map erboven. Oefenbladen en Ronde Tafel-sessies orden je op dezelfde manier. De indeling staat in `_mappen.json` in elke map; de quizbestanden zelf blijven waar ze zijn.

### Exporteren en importeren

Thuis voorbereiden op je laptop en in de klas op de bord-pc gebruiken? Het makkelijkst is **Mijn lesmap** in Instellingen: kies op beide pc's dezelfde map in OneDrive of Google Drive. Quizzen, oefenbladen en Ronde Tafels blijven dan vanzelf gelijk (bij opstart en elke minuut). Klaslijst, logboek en resultaten gaan nooit mee. Liever met de hand? Met **⬇** naast een quiz, oefenblad of sessie bewaar je die als bestand. Met **⬇** naast een map exporteer je de hele map met de mappen erin, en **⬇ Alles exporteren** neemt alles mee, met de mappen erbij. Op de andere pc klik je op **⬆ Importeren** (of sleep je het bestand op de lijst, of op een map). Wat er al precies zo staat, wordt overgeslagen, dus je kan gerust opnieuw importeren. Je kan ook een gewoon quizbestand (`.json`) van een collega importeren.

Met **Lege quiz** maak je zelf een quiz, en met **Bewerken** pas je een bestaande quiz aan. Dat kan ook rechtstreeks vanuit Schattenjacht en De prinses in de toren; na het opslaan kom je daar terug.

### Nog sneller: met je eigen Gemini-sleutel

Maak gratis een sleutel aan op [aistudio.google.com/apikey](https://aistudio.google.com/apikey) en vul hem in bij **Instellingen**. In de quizmaker verschijnt dan het blok **Of: laat Gemini de quiz direct maken**. Daar upload je je lesstof (screenshot, foto of pdf, ook met Ctrl+V) rechtstreeks in LANcelot en maak je de quiz met één klik op **Maak direct met Gemini**. Zolang je in AI Studio geen betaalgegevens koppelt, kost het niets (er geldt een gratis daglimiet). De sleutel staat alleen op je eigen pc, in `settings.json`, en gaat nooit naar GitHub.

## De Ronde Tafel

Stel de klas vragen en zie de antwoorden live op het bord. Leerlingen antwoorden anoniem via dezelfde QR-code.

- **Meerkeuze** (ook voor stellingen): 2 tot 6 keuzes, met balken die live meegroeien. Leerlingen mogen van mening veranderen.
- **Woordwolk**: elke leerling geeft tot 3 woorden; woorden die vaker voorkomen worden groter.
- **Open vraag**: korte antwoorden verschijnen als kaartjes op het bord.
- **Schaal**: 1 tot 5, met het gemiddelde erbij.

Klik op een woord of een kaartje om het te verbergen (handig bij flauwe antwoorden). Met **Sluit antwoorden** stop je het stemmen voor die vraag, en met **Verberg resultaten** laat je eerst iedereen antwoorden voor je de uitslag toont. Een sessie maak je zelf, of met AI op dezelfde manier als een quiz. Sessies staan als JSON-bestanden in de map `rondetafel/`.

## Schattenjacht

Elke leerling beantwoordt op eigen tempo vragen uit een quiz. Een goed antwoord levert goud op, een fout kost een beetje goud. In de **schatkamer** koop je upgrades:

- **Scherper zwaard**: meer goud per goed antwoord (10 → 25 → 60 → 150 → 400).
- **Kroon van de reeks**: extra goud voor elk antwoord op rij goed.
- **Drakenschild**: minder goud kwijt bij een fout.
- **Gouden dubbelaar**: dubbel goud voor je volgende 6 goede antwoorden.

Wie na de speeltijd (3 tot 15 minuten) het meeste goud heeft, wint. Op het bord zie je een live goudrace, wat er gekocht wordt en het goud van de hele klas.

## De prinses in de toren

Een platformspel. Elke leerling klimt op de gsm met een ridder in dezelfde scifi-riddertoren, van platform naar platform, langs laserpoorten, drones en stekels. Wie geraakt wordt, valt een stuk naar beneden. Iedereen ziet de andere ridders live meeklimmen.

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
- **Zicht, per leerling:** in de wachtkamer kiest elke leerling *Van bovenaf*, *Achter de ridder* (third person, de camera hangt net achter en boven je ridder) of *First person* (door de ogen van je ridder). Wisselen kan altijd: met V op een Chromebook of de 👁-knop rechtsboven. Dezelfde arena en regels in elk zicht. Gsm: links slepen om te lopen, rechts slepen om rond te kijken. Chromebook: klik om de muis te vangen, WASD om te lopen, de muis om te kijken. In 3D helpt een kleine richthulp wie bijna mikt. Het bord toont de arena altijd van bovenaf.

## Kristalroof

Een spel vol list, zoals Crypto Hack. Elke leerling kiest bij het begin een **geheim woord** uit vier woorden en houdt het geheim. Daarna beantwoordt iedereen op eigen tempo vragen.

- **Goed antwoord:** kies een van drie kisten. Er zitten kristallen in (meer naarmate je meer goed hebt), een verdubbelaar, een schild (45 seconden onberoofbaar), soms pech (15% kwijt)... of een **roof**.
- **Roof:** kies een andere ridder en raad diens geheime woord uit drie woorden. Juist? Dan neem je 15 tot 40% van diens kristallen mee. Wie net beroofd is, staat 20 seconden achter een schild. Het slachtoffer ziet wie de kluis kraakte (of probeerde te kraken).
- **Fout antwoord:** geen kist.
- Op het bord zie je de kristalrace, wie wie berooft en de kristallen van de hele klas. Wie op het einde de meeste kristallen heeft, wint. Resultaten in `resultaten/`.

## De Verrader

Een spel vol geheimen, met de hele klas. Bij de start krijgt iedereen in het geheim een rol: **ridder** of **verrader** (1 verrader tot 7 spelers, 2 vanaf 8, 3 vanaf 16; of kies zelf). Minstens 3 spelers.

- **Ridders** beantwoorden vragen. Elk goed antwoord herstelt de **kristalkern**. Is de kern vol, dan winnen de ridders. Elke 4 goede antwoorden krijgt een ridder een tip: de naam van iemand die zeker te vertrouwen is.
- **Verraders** beantwoorden ook vragen, zodat niemand iets merkt, maar hun antwoorden helpen de kern niet. Na 3 goede antwoorden kunnen ze een ridder **betoveren**. Die wordt een geest: geesten stemmen niet meer, maar hun antwoorden helpen de kern nog.
- Na een betovering (of als iemand de 📯 hoorn blaast, één keer per speler) komt **de Ronde Tafel** samen: eerst praten (kort, normaal of lang), dan stemmen op wie verbannen wordt, of overslaan. De meeste stemmen wint; bij gelijke stand gebeurt er niets.
- De ridders winnen als de kern hersteld is of alle verraders verbannen zijn. De verraders winnen als ze even talrijk zijn als de ridders, of als de tijd op is.
- Op het bord zie je de kern, wie nog meedoet en de Ronde Tafel groot. De rollen worden pas op het einde getoond. Resultaten in `resultaten/`.

## Burchtbouwers

Een samenwerkingsspel: de hele klas bouwt één burcht met zes delen (twee torens, twee muren, de poort en de donjon).

- Elk goed antwoord geeft **een steen** (drie of meer op rij: twee stenen). De leerling kiest zelf op welk deel hij komt, op de gsm met een tik of op een Chromebook met de toetsen 1-6. Het laagste deel krijgt een ⚠.
- Op het bord groeit de burcht steen per steen, met een kleurstreepje per bouwer. Een stippellijn toont hoe hoog elk deel moet zijn.
- Is de tijd om (of klik je op **De draak nu laten komen**), dan valt de draak deel per deel aan. Te lage delen vallen. **Valt hooguit één deel, dan houdt de burcht stand.**
- De hoogte die de draak vraagt, hangt af van het aantal leerlingen, de speeltijd en de moeilijkheid (makkelijk, normaal, moeilijk). Wie later binnenkomt, maakt het niet moeilijker.
- Resultaten (stenen, juist en fout, beste reeks, favoriete deel) in `resultaten/`.

## Pac-Knight

Met de hele klas in één doolhof. Elke leerling speelt op zijn eigen gsm of Chromebook, het bord toont het hele doolhof.

- Elk vakje heeft een 💎 kristal. Gouden kristallen zijn 5 waard. Zijn de meeste op, dan groeien er nieuwe.
- **Drones** jagen op de ridders. Wie gevangen wordt, verliest 5 kristallen en komt na 3 seconden terug op een plek ver van de drones.
- **Een goed antwoord geeft een 💥 kracht** (je kan er 3 bijhouden; drie juist op rij geeft er twee). Met spatie of de knop 💥 gebruik je een kracht: 8 seconden (rustig 10, intens 6) vluchten de drones, tellen kristallen dubbel en schakel je een drone uit door hem te raken (+10).
- **Tegen gokken**: na een fout antwoord blijft het juiste antwoord 3 seconden staan voor er een nieuwe vraag komt, en die vraag komt een paar vragen later terug. Wie een vraag beantwoordt, staat stil in een beschermende bel.
- Lopen: op de gsm vegen of de pijlen, op een Chromebook de pijltjes of WASD. E is een vraag, 1-4 antwoorden.
- Het doolhof wordt bij elke start opnieuw gemaakt, groter naarmate er meer leerlingen zijn. Elk antwoord komt in het logboek, met het leerplandoel. Resultaten (kristallen, drones, gevangen, juist en fout) in `resultaten/`.

## Strijdrossen

Zoals Smash Karts: elke leerling rijdt op een hoverros door een open, ovale arena met schansen, kratten en een burchttoren in het midden, ieder voor zich of rood tegen blauw. Op de gsm of Chromebook zie je je ros in 3D van achteren (of van bovenaf, wisselen met V of 🎥); het bord toont de hele arena, of met **🎥 Volg de leider** de leider in 3D.

- **Wapens komen alleen uit goede antwoorden**: elk goed antwoord geeft ⚡ lasers (rustig meer, intens minder), 2 op rij een 🚀 raket die zelf een vijand zoekt, 3 op rij een 💣 mijn die je achter je ros legt.
- Een laser kost 1 leven, een raket 2, een mijn 3. Uitgeschakeld? Na 3 seconden rijd je weer mee, even beschermd. Turbostroken op de vloer geven snelheid, over een schans vlieg je (en ontwijk je lasers).
- **Tegen gokken**: na een fout antwoord blijft het juiste antwoord 3 seconden staan, en die vraag komt een paar vragen later terug. Tijdens een vraag zweeft je ros stil in een schild.
- Chromebook: pijltjes of ZQSD/WASD rijden, spatie laser, F raket, X mijn, E vraag, 1-4 antwoorden. Gsm: duim links op het scherm en schuiven om te sturen (naar beneden is remmen), rechts vuren; het ros geeft vanzelf gas. Van bovenaf rijdt het ros de kant op die je duwt (joystick of pijltjes).
- Sturen is vergevingsgezind: een stuurhulp draait je net op tijd weg van kratten, pilaren en de rand, en wie toch iets raakt, glijdt erlangs. Schansen kun je van alle kanten op rijden.
- Vloeiend, ook op een trage Chromebook of oude gsm: het beeld past zijn scherpte vanzelf aan, en de andere rossen glijden tussen de berichten van de server door.
- Elk antwoord komt in het logboek, met het leerplandoel. Resultaten (punten, uitgeschakeld, juist en fout) in `resultaten/`.

## Neon Duel

Een vechtspel met de hele klas. LANcelot verdeelt de klas in **⚡ Team Bliksem** en **🔥 Team Vuur** (op een naam klikken zet die leerling in het andere team). Op het bord vechten twee grote ridders in een neon arena; elke ronde vecht een andere leerling uit elk team als kampioen, met zijn eigen ridder.

- Elke leerling beantwoordt vragen op zijn gsm of Chromebook. **Elk goed antwoord is een slag** van de ridder van zijn team. **Snel juist** (binnen 6 seconden) is een **combo** (anderhalve keer zoveel schade), **drie juist op rij** een **supermove** (driedubbel). Slagen van het team vlak na elkaar tellen op als combo-teller.
- Alle goede antwoorden van een team vullen samen de **energiebalk**. Is die vol, dan volgt de **NEON OVERDRIVE**: bliksems op de tegenstander.
- Een ronde duurt tot een ridder **K.O.** gaat of de tijd op is (kies 1 tot 3 minuten). Kies 1 ronde, best of 3 of best of 5. Een groter team slaat vaker, dus elke slag doet dan iets minder schade.
- **Tegen gokken**: na een fout antwoord blijft het juiste antwoord 3 seconden staan, en die vraag komt een paar vragen later terug.
- Chromebook: 1-4 antwoorden. Elk antwoord komt in het logboek, met het leerplandoel. Resultaten (team, schade, supermoves, combo's, juist en fout) in `resultaten/`.

## Leraar-baas

Jij bent de eindbaas. Stel eerst je baas samen: dezelfde ridderonderdelen als de leerlingen, plus eindbaas-extra's (**reuzenharnas, duistere kroon, drakenmantel, gloeiende ogen, mech-troon**), de kleur van de ogen, een aura, je naam en een titel. LANcelot bewaart je baas in `settings.json` op deze pc.

- Op het bord sta je als reuzenridder in je troonzaal, de ridders van de klas staan ervoor. **Elk goed antwoord is een slag** op de baas, **drie op rij een ridderslag** (driedubbel).
- Je slaat terug met drie knoppen (of de toetsen A, V en S): **⚔️ Tegenaanval** (iedereen 3 seconden verdoofd, behalve wie een reeks van twee heeft: die pareert), **💀 Moeilijke vraag** (de vraag die tot nu toe het vaakst fout was, voor iedereen tegelijk: juist is driedubbele schade, fout kost moed) en **🛡️ Schildronde** (15 seconden een schild: breekt de klas het, dan ben je even kwetsbaar voor dubbele schade, anders genees je). Met **De baas slaat vanzelf** slaat de baas ook zelf af en toe toe.
- De klas heeft een **moed**-balk: foute antwoorden en klappen van de baas kosten moed, goede antwoorden geven een beetje terug. Is je levensbalk op, dan wint de klas. Is de moed op of de tijd om, dan win jij.
- **Tegen gokken**: na een fout antwoord blijft het juiste antwoord 3 seconden staan, en die vraag komt een paar vragen later terug.
- Elk antwoord komt in het logboek, met het leerplandoel. Resultaten (schade, ridderslagen, baasvragen juist, juist en fout) in `resultaten/`.

## Duel in de arena

Een toernooi met duels van één tegen één.

- Beide ridders krijgen tegelijk dezelfde vraag (20 seconden). **Wie eerst juist antwoordt, slaat toe**: de ander verliest een hart. Wie fout antwoordt, mag bij die vraag niet meer. Kies 2 tot 5 harten per duel.
- Alle duels van een ronde lopen tegelijk. Het bord toont het **toernooischema** live, en tussen de rondes groot wie tegen wie speelt. Bij een oneven aantal krijgt iemand een **vrije doorgang**.
- Na 12 vragen zonder winnaar beslissen de harten. Met **Lopende duels beslissen** maak je zelf een einde aan een duel, bijvoorbeeld als een leerling weg moet.
- Wie uitgeschakeld is, kijkt mee op het bord. Resultaten (plaats, ronde, gewonnen duels, juist en fout, gemiddelde reactietijd) in `resultaten/`.

## Het Rijk

Een spel over meerdere lessen. Maak per klas een **rijk**: een kaart met zeshoeken, 2 tot 4 teams en elk team een burcht. Het rijk wordt bewaard in de map `rijken/` (blijft bewaard bij updates).

- Elke les kies je het rijk en de quiz met de leerstof van vandaag. Leerlingen blijven in hun team zolang ze dezelfde naam gebruiken; nieuwe leerlingen gaan naar het kleinste team. In de lobby klik je op een naam om iemand van team te wisselen.
- Elk goed antwoord is **een zet** op de kaart: een vrij gebied naast je land aanvallen (twee zetten om het te nemen), een gebied van een ander team aanvallen (zoveel zetten als het sterk is) of een eigen gebied versterken (tot 5). Burchten kan je niet innemen.
- Elk gebied onthoudt **met welke leerstof het veroverd werd**: het nummer op de kaart. In latere lessen gaat ongeveer een derde van de vragen over oudere leerstof (🛡️). Juist geeft **twee zetten**, fout maakt een gebied met die leerstof zwakker. Leerstof die meer gebieden draagt, komt vaker terug.
- Op de gsm zoomt de kaart in op de gebieden die je kan kiezen. Op het bord zie je de hele kaart, de stand per team en wat er deze les bijkwam.
- Resultaten per les (zetten, veroverd, juist en fout, oude leerstof juist en fout) in `resultaten/`.

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
- **Live:** klik op **Live**. Kies vooraf of leerlingen **meteen** groen of rood zien, of pas **na het inleveren**. Op het bord zie je per leerling hoe ver hij staat en hoeveel goed en fout, en per oefening hoeveel procent van de klas het goed heeft. Klik op een leerling om zijn blad te bekijken. Met **Toon oplossingen** zien leerlingen die ingeleverd hebben de verbetering. **Afsluiten** levert alles in en bewaart de resultaten in `resultaten/`. Te vroeg ingeleverd? Klik op de leerling en kies **Heropen voor deze leerling**, of gebruik **Heropen voor iedereen**. De antwoorden blijven staan. Ook na het afsluiten kan dat: sluit daarna opnieuw af om de nieuwe resultaten te bewaren.
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

## Licentie

© 2026 Jorn Duthoo. Alle rechten voorbehouden. De code is openbaar te bekijken, maar kopiëren, aanpassen of verspreiden mag niet zonder schriftelijke toestemming. Leerkrachten die LANcelot rechtstreeks van Jorn kregen, mogen het gratis in hun eigen lessen gebruiken. Zie [LICENSE](LICENSE).
