# LANcelot in de klas

## Eenmalig voorbereiden

1. Installeer [Node.js](https://nodejs.org) (de LTS-versie) op je pc.
2. Download LANcelot van GitHub (groene knop **Code** → **Download ZIP**) en pak de map uit, bijvoorbeeld op je bureaublad.
3. Dubbelklik op **Start LANcelot.bat**. De eerste keer worden een paar onderdelen gedownload; daarvoor is één keer internet nodig.
4. Vraagt Windows of Node.js het netwerk mag gebruiken? Klik op **Toegang toestaan**. Anders kunnen leerlingen niet verbinden.

## Elke les

1. Dubbelklik op **Start LANcelot.bat**. Het docentenscherm opent vanzelf in je browser.
2. Zet het docentenscherm op het digibord, kies **Toernooi** en klik op de quiz die je wilt spelen.
3. Leerlingen scannen de QR-code op het bord, of typen het adres (bijvoorbeeld `http://192.168.1.20:3000`) in hun browser, en vullen hun naam in.
4. Klik op **Laat het toernooi beginnen!** als iedereen erin staat. Met **Stop toernooi** (rechtsboven) stop je op elk moment; de scores tot dan worden bewaard.
5. Klaar? Sluit het zwarte venster om LANcelot te stoppen.

Laat het zwarte venster openstaan zolang je speelt. Dat is de server.

## Lukt verbinden niet?

- **Zelfde netwerk:** je pc en de apparaten van leerlingen moeten op hetzelfde wifi-netwerk zitten. Een pc via een netwerkkabel werkt meestal ook, als die op hetzelfde schoolnetwerk zit.
- **Gastnetwerk of "client isolation":** veel scholen blokkeren verkeer tussen apparaten op het gast-wifi. Vraag de ICT-afdeling of apparaten elkaar mogen bereiken op poort 3000, of gebruik een ander netwerk.
- **Noodoplossing:** zet een mobiele hotspot aan op je telefoon of laptop en laat de pc en de leerlingen daarmee verbinden. Dat werkt zonder dat ICT iets hoeft te doen; om te spelen hoeft je hotspot geen internet te hebben (een quiz maken met AI doe je vooraf, als je wel internet hebt). Let op: een telefoon-hotspot laat vaak maar zo'n 10 apparaten toe. De hotspot van Windows zelf (Instellingen → Netwerk → Mobiele hotspot) is dan een betere keuze.
- **Firewall:** heb je de vraag van Windows per ongeluk weggeklikt? Zoek in Start naar "Een app toestaan via Windows Firewall" en zet een vinkje bij Node.js (privé en openbaar).
- **Meerdere adressen op het bord:** probeer eerst het grote adres. Werkt dat niet, klik dan op een van de andere adressen eronder; de QR-code past zich aan.
- **Ander poortnummer:** is poort 3000 al bezet, zet dan `set PORT=3001` boven in Start LANcelot.bat.

## Tips

- Een leerling die per ongeluk de pagina sluit, opent gewoon het adres opnieuw en speelt verder met dezelfde naam en score.
- Klik in de lobby op een naam om een speler te verwijderen (handig bij flauwe namen).
- Werkt iets niet zoals verwacht, noteer dan wat er gebeurde. Dan kunnen we het verbeteren.
