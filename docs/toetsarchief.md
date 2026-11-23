# Toetsarchief (De Proef)

Wens van Jorn (2026-11-23): een vast archief van afgenomen toetsen dat alleen groeit, per schooljaar.

- Code: `src/toetsarchief.js`, scherm `public/js/archief.js` (Instellingen › Toetsarchief), test `test/toetsarchief.test.js`.
- Indeling: `<archiefmap>/<schooljaar>/[<klas>/]<vak>/<MM maand>/<datum> <toets>/` met `opgave.json` + `opgave.pdf` + `verbetersleutel.pdf`
  (de toets zoals ze toen afgenomen werd), `resultaten.json` + `resultaten.csv`, `Leerlingen/<naam>.pdf`
  (een oudere pdf gaat naar `Leerlingen/eerdere versies/`). `_archief.json` is voor LANcelot zelf.
- Schooljaar: 1 september tot 31 augustus. Klas-map alleen met meerdere klassen.
- Vak: `toets.vak` (nieuw veld, keuze in de editor; leeg = zoals vroeger uit de doelen), anders het vak van de toets in de
  bibliotheek, de doelen, een vak in de titel ("Frans", "rekenen"...), anders "Zonder vak". Een afname blijft in de map waar ze eerst kwam.
- Archiefmap: zelf gekozen (`settings.archiefMap`), anders `Toetsarchief` in Mijn lesmap, anders `toetsarchief/` in de gegevensmap.
  Bij een andere map kopieert LANcelot het oude archief mee (nooit wissen).
- Wanneer: na Klaar (na de lesmap-pdf en mail), vóór verwijderen in De Proef, vóór een verwijdering die via de lesmap
  binnenkomt, vóór een klas weggehaald wordt, bij het opstarten (+90 s) en om de 6 uur wat veranderde. "Elke maand"
  (standaard aan) neemt één keer per maand ook toetsen mee die nog niet klaar zijn. In een gedeelde map (lesmap) bewaart
  alleen de pc die de toets afnam (behalve vóór verwijderen).
- Exporteer schooljaar: `/toetsarchief-export?jaar=2026-2027` (zip, gestreamd naar een tijdelijk bestand).
- Niet in de dagelijkse back-up-zip (te groot); wel in ITEMS (verhuis/update laten het staan).
