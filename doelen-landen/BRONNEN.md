# Leerplandoelen van andere landen

LANcelot toont standaard de Vlaamse doelen (Op.stap, map `doelen/`). In Mijn klas > Doelen kan de leerkracht ook een van deze sets kiezen, of geen doelen (standaard in de Store-versie). Eigen doelen komen er altijd bovenop (`doelen-eigen.json` in de gegevensmap).

| Map | Land | Bron | Licentie |
| --- | --- | --- | --- |
| `en/` | Engeland | National curriculum in England, key stages 1 and 2 (Department for Education): maths, English, science | Open Government Licence v3.0 |
| `us/` | Verenigde Staten | Common Core State Standards, Math en ELA, grade 1-6 | © 2010 NGA Center / CCSSO, met de vereiste vermelding |
| `nl/` | Nederland | Kerndoelen funderend onderwijs, primair onderwijs (SLO, data github.com/slonl/curriculum-fo) | open data van SLO |
| `de/` | Duitsland | Bildungsstandards Primarbereich Deutsch en Mathematik (KMK 2022, IQB) | MIT |
| `fr/` | Frankrijk | Programmes du cycle 2, BO n° 41 du 31 octobre 2024: français volledig, maths enkel nombres et calcul | publieke tekst van het ministerie |

Spanje ontbreekt nog: de officiële tekst (BOE) was niet machinaal leesbaar. Leerkrachten daar gebruiken eigen doelen of de AI-knop.

Elke set heeft een `bron` die LANcelot toont bij de doelen. Codes beginnen met het land (`EN.`, `US.`, `NL.`, `DE.`, `FR.`), zodat ze nooit botsen met Op.stap.

Het script dat deze bestanden maakte, en de ruwe teksten, staan buiten de repo (projectbestanden, `lancelot/doelen-landen-bouw/`).
