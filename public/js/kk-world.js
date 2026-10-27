// Ontsnap uit de kerker: de regels die de server, de leerlingen en het bord delen.
// De klas zit samen opgesloten in de kerker onder de burcht. Deur na deur gaat open met juiste antwoorden:
// een sleuteldeur, een runenslot (de code ligt verspreid over de klas), een laserhek (iedereen moet helpen),
// een valhek met een lier (blijven antwoorden, anders zakt het terug) en op het einde de Kerkermeester.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KkWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  const DOORS = {
    sleutel: { name: 'Sleuteldeur', short: 'Sleutels', icon: '🗝️', color: '#ffc94a', how: 'Elk juist antwoord smeedt een sleutel. Samen vullen jullie het slot.' },
    runen: { name: 'Runenslot', short: 'Runen', icon: 'ᛟ', color: '#b98cff', how: 'Een juist antwoord toont jou één rune van de code. Vertel ze aan elkaar en typ samen de code in.' },
    laser: { name: 'Laserhek', short: 'Laserhek', icon: '🔴', color: '#ff4d6d', how: 'Elke ridder moet één juist antwoord geven. Dan gaat het lampje boven de deur aan.' },
    lier: { name: 'Valhek', short: 'Valhek', icon: '⛓️', color: '#5ee7ff', how: 'Juiste antwoorden draaien de lier. Stoppen jullie, dan zakt het valhek terug.' },
    bewaker: { name: 'De Kerkermeester', short: 'Kerkermeester', icon: '🤖', color: '#ff8c42', how: 'De robotbewaker staat voor de laatste poort. Elk juist antwoord is een treffer.' },
  };
  // De volgorde van de deuren. De laatste is altijd de Kerkermeester.
  const ORDER = ['sleutel', 'runen', 'laser', 'lier', 'sleutel', 'runen', 'lier', 'laser'];
  const MINUTES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

  // Hoeveel deuren in deze speeltijd: 1 minuut = 3 deuren, 15 minuten = 8.
  function plan(minutes) {
    const n = Math.max(3, Math.min(8, Math.round(2 + minutes * .5)));
    return [...ORDER.slice(0, n - 1), 'bewaker'];
  }

  // Zoveel juiste antwoorden geeft een gemiddelde leerling per minuut, als hij gewoon doorantwoordt.
  const RATE = 3.2;
  const OPEN_MS = 3600; // zo lang duurt het openen van een deur (de volgende telt al mee)
  const FIXED_MIN = .45; // runenslot en laserhek nemen ongeveer zoveel minuten, los van de klasgrootte
  const WEIGHT = { sleutel: 1, lier: 1, bewaker: 1.5 };
  const tempoScale = { rustig: .8, normaal: 1, intens: 1.25 };

  // Hoeveel juiste antwoorden een deur vraagt, berekend op het moment dat ze aan de beurt is (met de spelers van dat moment).
  // Een doorsnee klas haalt zo de uitgang met nog wat tijd over; wie traag is, raakt er niet helemaal uit.
  function need(type, n, minutes, tempo, doors) {
    n = Math.max(1, n);
    if (type === 'runen') return 4;
    if (type === 'laser') return Math.max(1, Math.ceil(n * .8));
    const fixed = doors.filter(d => !WEIGHT[d]).length;
    const weights = doors.reduce((a, d) => a + (WEIGHT[d] || 0), 0) || 1;
    const usable = Math.max(.4, minutes * .72 - fixed * FIXED_MIN);
    const per = n * RATE * usable * (tempoScale[tempo] || 1) / weights;
    return Math.max(3, Math.round(WEIGHT[type] * per));
  }

  // ---------- Runen ----------
  // Acht runen met een naam, zodat je ze aan elkaar kan zeggen ("de eerste is Kroon!").
  // Elke rune is een paar lijnen in een vakje van 0 tot 1.
  const circle = (cx, cy, r, from = 0, to = Math.PI * 2, n = 16) => [...Array(n + 1)].map((_, i) => { const a = from + (to - from) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const RUNES = [
    { name: 'Zwaard', color: '#7fdcff', lines: [[[.5, .06], [.6, .2], [.6, .64], [.4, .64], [.4, .2], [.5, .06]], [[.24, .66], [.76, .66]], [[.5, .66], [.5, .9]], [[.42, .94], [.58, .94]]] },
    { name: 'Kroon', color: '#ffc94a', lines: [[[.12, .78], [.12, .3], [.32, .56], [.5, .2], [.68, .56], [.88, .3], [.88, .78], [.12, .78]], [[.2, .9], [.8, .9]]] },
    { name: 'Ster', color: '#fff3a3', lines: [[...Array(11)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .19 : .44; return [.5 + Math.cos(a) * r, .54 + Math.sin(a) * r]; })] },
    { name: 'Maan', color: '#c9d6ff', lines: [[...circle(.5, .5, .4, Math.PI * .35, Math.PI * 1.65), ...circle(.66, .5, .3, Math.PI * 1.4, Math.PI * .6, 12).reverse().slice(1)]] },
    { name: 'Bliksem', color: '#ffe066', lines: [[[.62, .04], [.28, .54], [.52, .54], [.36, .96], [.76, .42], [.52, .42], [.7, .04], [.62, .04]]] },
    { name: 'Toren', color: '#ff9f6b', lines: [[[.26, .94], [.26, .14], [.38, .14], [.38, .26], [.47, .26], [.47, .14], [.53, .14], [.53, .26], [.62, .26], [.62, .14], [.74, .14], [.74, .94], [.26, .94]], [[.42, .94], [.42, .66], [.5, .58], [.58, .66], [.58, .94]]] },
    { name: 'Schild', color: '#6ee7a8', lines: [[[.14, .1], [.86, .1], [.86, .46], [.72, .76], [.5, .94], [.28, .76], [.14, .46], [.14, .1]], [[.5, .2], [.5, .8]], [[.26, .4], [.74, .4]]] },
    { name: 'Sleutel', color: '#ff8fd0', lines: [circle(.32, .32, .2), [[.46, .46], [.88, .88]], [[.7, .7], [.58, .82]], [[.8, .8], [.68, .92]]] },
  ];
  const CODE_LEN = 4;

  // Een willekeurige code van vier verschillende runen.
  function code(rand = Math.random) {
    const bag = RUNES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    return bag.slice(0, CODE_LEN);
  }

  // De rune als SVG (voor knoppen en vakjes op het leerlingscherm).
  function runeSvg(i, size = 32, color) {
    const r = RUNES[i];
    if (!r) return '';
    const d = r.lines.map(l => l.map((p, j) => `${j ? 'L' : 'M'}${(p[0] * 100).toFixed(1)} ${(p[1] * 100).toFixed(1)}`).join('')).join('');
    return `<svg viewBox="-8 -8 116 116" width="${size}" height="${size}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color || r.color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // Sterren voor de ontsnapping: hoeveel tijd hielden jullie over?
  const stars = (left, total) => (left >= total * .35 ? 3 : left >= total * .12 ? 2 : 1);

  return { COLORS, DOORS, ORDER, MINUTES, RATE, OPEN_MS, plan, need, RUNES, CODE_LEN, code, runeSvg, stars };
});
