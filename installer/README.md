# Windows-installer voor scholen

`LANcelot-installatie.exe` zet de volledige LANcelot (met De Kronieken, Woordkaarten, Junior en de Vlaamse doelen)
op een klas- of bord-pc. Geen Node.js, geen zip uitpakken, geen beheerdersrechten.

## Voor de leerkracht

1. Dubbelklik `LANcelot-installatie.exe`. Toont Windows "Windows heeft uw pc beschermd"? Klik op *Meer info* en dan *Toch uitvoeren*
   (de installer is niet ondertekend).
2. Klik op *Installeren*. Windows vraagt daarna één keer toestemming voor de firewall, zodat leerlingen kunnen meespelen: klik op *Ja*.
   Geen beheerdersrechten? Dan doet ICT het later met *Instellingen > Firewall goed zetten*.
3. Start LANcelot met het schild op het bureaublad. Vraag ICT één keer een vast adres voor de pc: het bericht staat klaar
   bij *Netwerk werkt niet? > Vast adres* (en in stap 4 van de wizard).

## Wat de installer doet

| Punt | Hoe |
| --- | --- |
| Zonder beheerdersrechten | Per gebruiker, in `%LOCALAPPDATA%\Programs\LANcelot`. Node.js (met npm) zit erin, in de map `node`. `Start LANcelot.bat` gebruikt die eerst. |
| Gegevens apart | `installatie.json` naast de app: klas, logboek, quizzen, posters en back-ups staan in `%LOCALAPPDATA%\LANcelot`. De installer schrijft daar nooit. |
| Opnieuw installeren | Vervangt alleen de app. Draait LANcelot nog, dan vraagt de installer eerst het venster te sluiten. |
| Bijwerken | Gewoon in de app (*Instellingen > LANcelot bijwerken*): `versie.json` zegt welke versie er staat. Nieuwe npm-onderdelen installeert de app zelf (npm zit mee). |
| Firewall | De enige stap met beheerdersrechten: poorten 3000-3010 en `node\node.exe` van deze installatie toelaten (dan komt het venster van Windows Firewall niet). Weigeren mag. |
| Verwijderen | Via Windows-instellingen > Apps, of `LANcelot verwijderen.exe`. Haalt alleen de app weg, nooit `%LOCALAPPDATA%\LANcelot`. |
| Stil installeren (ICT) | `LANcelot-installatie.exe /S` (zonder firewallstap, zonder te starten). Verwijderen: `"LANcelot verwijderen.exe" /S`. |

Wie al met de zip-versie werkt, hoeft niets te doen: die blijft gewoon werken. Wil je toch overstappen, verhuis dan eerst in de oude
versie de gegevens met *Instellingen > Mijn gegevens* naar `%LOCALAPPDATA%\LANcelot`, en installeer daarna.

## Bouwen

    node installer/maak-installer.js [--uit map]

Nodig: git, npm, `makensis` (Linux: `apt install nsis`, Windows: NSIS 3) en internet (Node.js voor Windows van nodejs.org,
gecontroleerd met SHASUMS256). Resultaat: `installer/uit/LANcelot-installatie.exe` (ongeveer 90 MB).
De installer neemt de app zoals ze in git staat (laatste commit), zonder website, tests en hulpmiddelen. `zijbalk.bmp` is de afbeelding
links op het eerste en laatste scherm (164 x 314).

Testen zonder Windows kan met Wine (32-bit nodig: `dpkg --add-architecture i386 && apt install wine32:i386`):
`wine LANcelot-installatie.exe /S` en daarna `wine cmd /c "Start LANcelot.bat"` in de geïnstalleerde map.

## Eigen update-adres

Als de repository ooit privé wordt, werkt bijwerken via GitHub niet meer. Zet dan ergens publiek (een website, een publieke release-repo) een klein bestand:

```json
{ "versie": "2026-11-01", "datum": "2026-11-01T10:00:00Z", "bericht": "Nieuwe games", "zip": "https://.../LANcelot.zip" }
```

Het adres van dat bestand komt in *Instellingen > LANcelot bijwerken > Update-adres*, of naast de app in `update-bron.json`:
`{ "manifest": "https://.../lancelot-update.json" }`. De zip mag de schoolzip zijn of een zip van de repo: LANcelot zoekt zelf de map
met `server.js`, en installeert pas bij de volgende start.

De Microsoft Store-versie is iets anders: zie `installer/store/README.md`.
