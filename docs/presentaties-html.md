# Html-presentaties in Mijn methodes

Mijn methodes (De Kronieken) aanvaardt naast pdf en afbeeldingen ook een **presentatie als .html-bestand**.
Ze opent op het bord in de gewone lezer: dia per dia, en de punten van een dia verschijnen één voor één.

## De afspraak

| Wat | Hoe in de html |
| --- | --- |
| Een dia | `<section class="dia">…</section>`, rechtstreeks in `<body>` |
| Een punt dat pas bij de volgende klik verschijnt | `class="stap"` (of `data-stap`) op eender welk element: `<li class="stap">`, `<p class="stap">`, `<img class="stap">` |
| Een link naar een website | `<a href="https://…">` opent in een nieuw tabblad, het bord blijft open |
| Een link naar een andere dia | `<a href="#dia-3">` (of `#id` van een element in die dia) |

- Stappen verschijnen in de volgorde van het bestand. Ze nemen hun plaats al in, dus de dia verspringt niet.
- Geen `section.dia`? Dan telt elke `<section>` in `<body>` als dia. Ook geen sections: het hele bestand is één dia.
- Eigen JavaScript in het bestand draait **niet**. Formulieren werken niet. Afbeeldingen, lettertypes en video mogen
  via `https://` of als `data:`-adres in het bestand zelf.

## Bedienen

- Volgende stap, en na de laatste stap de volgende dia: klik of tik op de dia, ▶, de rechterrand, pijl rechts,
  spatie, Enter of PageDown (presenter). Terug: ◀, de linkerrand, pijl links, Backspace of PageUp.
- Vegen met de vinger: naar links = verder, naar rechts = terug.
- Een link, knop of video aantikken doet wat die moet doen, en gaat niet naar de volgende stap.
- Teruggaan naar de vorige dia toont die dia met alle stappen al zichtbaar.
- Pen aan = tekenen over de dia (per dia, zoals bij een pdf); de dia zelf reageert dan niet. Pen uit = klikken en links werken weer.
- − en + maken de presentatie kleiner of groter. Het nummer bovenaan springt naar een dia; LANcelot onthoudt de dia
  waar je stopte, en 📌 Les koppelt een dia aan een les.

## Veiligheid

Een html-bestand kan van een AI of een collega komen, dus het draait volledig afgeschermd (`src/kronieken.js`, `presentatie()`):

- Het iframe én de server (`Content-Security-Policy: sandbox …`) geven het een eigen, lege herkomst: geen toegang tot
  LANcelot, de cookies, de leerkrachtroutes of leerlinggegevens, ook niet als je het adres rechtstreeks opent.
- Enkel de dia-speler van LANcelot (`public/js/dia-speler.js`, met een nonce) mag scripts draaien.
  `connect-src 'none'` en `form-action 'none'`: het bestand kan niets versturen. `<meta http-equiv>` wordt weggehaald.
- De speler en de lezer praten enkel via `postMessage`, en de lezer luistert alleen naar het eigen kader.

## De prompt

In Mijn methodes staat onder de boeken **📋 Prompt voor een presentatie met AI kopiëren**. De tekst staat in
`public/kronieken-prompt.txt`. Een voorbeeld dat aan de afspraak voldoet: `docs/voorbeeld-presentatie.html`.

Html-bestanden gaan mee via Mijn lesmap (map `bordboeken`), net als de pdf's.
