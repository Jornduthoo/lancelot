# Windows-installer (voorbereiding)

De installer zelf is nog niet gebouwd. Alles wat de app ervoor nodig heeft, zit er wel al in.

## Wat de installer moet doen

| Punt | Hoe |
| --- | --- |
| Installeren zonder beheerdersrechten | `PrivilegesRequired=lowest`: de app komt in `%LOCALAPPDATA%\Programs\LANcelot`. Node.js gaat mee in de map `node` (de zip-versie van nodejs.org, geen msi), en `Start LANcelot.bat` gebruikt die map eerst. |
| Firewall | De enige stap met beheerdersrechten. Na de installatie drukt de leerkracht één keer op *Instellingen > Firewall goed zetten*. Dat zet poorten 3000-3010 open en haalt een blokkeerregel voor Node.js weg (die ontstaat als iemand het venster van Windows ooit wegklikte). |
| Gegevens apart | `installatie.json` naast de app: LANcelot bewaart klas, logboek, quizzen, posters en back-ups dan in `%LOCALAPPDATA%\LANcelot`. |
| Verwijderen zonder gegevensverlies | De verwijderaar haalt alleen de app-map weg en nooit `%LOCALAPPDATA%\LANcelot`. Wie opnieuw installeert, vindt alles terug. |
| Snelkoppelingen | Startmenu altijd, bureaublad als vinkje. In de zip-versie kan het ook met *Instellingen > Snelkoppeling op het bureaublad*. |
| Poort 3000 bezet | Een tweede start opent gewoon het docentenscherm. Is 3000 bezet door een ander programma, dan neemt LANcelot 3001 tot 3010 en zegt dat in het venster. |
| Bijwerken | Zolang de repo publiek is: van GitHub. Daarna: een eigen update-adres (zie hieronder), of *Bijwerken met een zip-bestand* (werkt altijd, ook zonder internet). |

## Bouwen (later)

1. `staging\` maken: `git archive main` uitpakken, `npm ci --omit=dev` erin, de map `node` uit `node-v24.x-win-x64.zip` erbij.
2. Inno Setup 6 installeren en `lancelot.iss` compileren. Resultaat: `uitvoer\LANcelot-installatie.exe`.
3. Zonder code-ondertekening toont Windows "onbekende uitgever". Dat is een aparte beslissing.

Wie eerder de zip-versie gebruikte: eerst in de oude versie *Instellingen > Mijn gegevens* verhuizen naar `%LOCALAPPDATA%\LANcelot`, dan installeren.

## Eigen update-adres

Als de repository ooit privé wordt, werkt bijwerken via GitHub niet meer. Zet dan ergens publiek (een website, een publieke release-repo) een klein bestand:

```json
{ "versie": "2026-11-01", "datum": "2026-11-01T10:00:00Z", "bericht": "Nieuwe games", "zip": "https://.../LANcelot.zip" }
```

Het adres van dat bestand komt in *Instellingen > LANcelot bijwerken > Update-adres*, of de installer levert `update-bron.json` mee naast de app: `{ "manifest": "https://.../lancelot-update.json" }`. De zip mag de schoolzip zijn of een zip van de repo: LANcelot zoekt zelf de map met `server.js`, en installeert pas bij de volgende start.
