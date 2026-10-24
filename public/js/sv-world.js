// Sterrenvreter: de ronde ruimte-arena met het zwarte gat in het midden. Gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; het midden is (0, 0). Hoe groter je massa, hoe groter en trager je bol.
// Het zwarte gat groeit met de tijd volgens een vast schema: server en schermen rekenen het zelf uit.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SvWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const START = 20;            // massa bij de start en na opgeslokt worden
  const EAT_RATIO = 1.2;       // zoveel zwaarder moet je zijn om iemand op te slokken
  const DASH = { mult: 2.6, ms: 650 };
  const NOVA = { range: 230, push: 320, loss: .25 };
  const MAX_TURBO = 5;
  const MAX_NOVA = 2;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  const DUST = ['#7df9ff', '#c77dff', '#ff9bd2', '#ffe17a', '#8affc1', '#9bb8ff'];

  const radius = m => 6 + 4.6 * Math.sqrt(m);
  const speed = m => Math.max(70, 560 * Math.pow(m, -.27));

  // De arena groeit mee met het aantal spelers, zodat er altijd ruimte is om te vluchten.
  const arenaR = n => Math.min(3000, 1300 + 70 * Math.max(1, n));
  const dustCount = n => Math.min(900, 220 + 22 * Math.max(1, n));

  // Het zwarte gat: groeit rustig, en in de laatste minuut snel (de eindstorm).
  function hole(elapsed, total) {
    const f = Math.max(0, Math.min(1, elapsed / Math.max(1, total)));
    const last = Math.max(0, elapsed - (total - 60)) / 60;
    const r = 70 + 130 * f + 160 * Math.min(1, Math.max(0, last));
    return { r, pull: r * 3.6, strength: 120 + 60 * f };
  }

  // Zwaartekracht: hoe dichter bij het gat, hoe harder het trekt. Geeft de verplaatsing per seconde.
  function gravity(h, x, y) {
    const d = Math.hypot(x, y);
    if (d > h.pull || d < 1) return { x: 0, y: 0 };
    const k = h.strength * Math.pow(1 - d / h.pull, 1.4) * 1.8;
    return { x: (-x / d) * k, y: (-y / d) * k };
  }

  // Bewegen binnen de arena: je botst zacht tegen de lichtmuur.
  function clamp(R, x, y, r) {
    const d = Math.hypot(x, y), max = R - r * .5;
    if (d <= max) return { x, y };
    return { x: (x / d) * max, y: (y / d) * max };
  }

  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Een willekeurige plek: niet te dicht bij het gat, en liefst ver van de anderen.
  function spawn(R, holeR, others = [], rnd = Math.random) {
    let best = null, bestD = -1;
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, d = holeR * 2.6 + 120 + rnd() * (R - holeR * 2.6 - 220);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      let near = Infinity;
      for (const o of others) near = Math.min(near, Math.hypot(o[0] - x, o[1] - y) - (o[2] || 0));
      if (near > bestD) { bestD = near; best = { x, y }; }
      if (near > 600) break;
    }
    return best;
  }

  return { START, EAT_RATIO, DASH, NOVA, MAX_TURBO, MAX_NOVA, COLORS, DUST, radius, speed, arenaR, dustCount, hole, gravity, clamp, rng, spawn };
});
