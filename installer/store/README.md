# LANcelot in de Microsoft Store

Het Store-pakket is een MSIX. De Microsoft Store ondertekent het zelf, regelt de betaling en de proefmaand.

## Pakket maken

    node installer/store/maak-pakket.js [--uit map] [--versie 1.2611.510.0]

Nodig: git, npm, clang + lld + llvm (voor de starter `LANcelot.exe`) en internet (Node.js voor Windows).
Elke nieuwe indiening heeft een hogere versie nodig; standaard komt die uit datum en uur.

## Wat anders is in de Store-versie

- `store.json` naast de app zet de Store-modus aan (`src/store.js`). Zonder dat bestand verandert er niets: geen proefperiode, geen blokkering.
- De licentie komt van Windows (`src/store-licentie.ps1`). Na de proefmaand zonder aankoop toont het leerkrachtenscherm `/licentie`.
  Lukt het opvragen niet, dan blokkeert LANcelot niets.
- Bijwerken doet de Store; de eigen updateknop en de keuze van de gegevensmap verdwijnen.
- De gegevens staan in `%LOCALAPPDATA%\LANcelot` (zie `installatie.json`) en blijven bij een update staan.

## In Partner Center

- Prijs kiezen en "Gratis proefversie: 30 dagen".
- Beperkte mogelijkheden uitleggen: `runFullTrust` (LANcelot is een lokale server met Node.js) en `unvirtualizedResources`
  (de gegevens van de klas blijven in `%LOCALAPPDATA%\LANcelot`, ook na updates).
- Privacybeleid: https://lancelot.network/privacy.html
