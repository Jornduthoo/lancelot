// Ridderslang: de ronde neonarena met de burchtmuur. Gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; het midden is (0, 0). Een slang is een kop met een lans en een lichaam van licht achter zich.
// Hoe langer je bent (L), hoe langer en dikker je lichaam.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RsWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const START = 24;            // lengte bij de start en na een botsing
  const SPEED = 230;
  const BOOST = 1.85;          // zo veel sneller met ⚡ boost
  const BOOST_PER_ANSWER = 3500;
  const MAX_BOOST = 12000;
  const STEP = 8;              // afstand tussen twee punten van het lichaam
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  const DUST = ['#7df9ff', '#ff6bd6', '#ffe17a', '#8affc1', '#c77dff'];

  const bodyLen = L => 40 + L * 7;
  const width = L => 16 + Math.sqrt(L) * 1.5;
  const turn = L => Math.max(2.2, 4.4 - Math.sqrt(L) * .08);
  const arenaR = n => Math.min(4400, 1500 + 110 * Math.max(1, n));
  const dustCount = n => Math.min(1400, Math.round(arenaR(n) ** 2 * 9.6e-5));

  // Draai de hoek a hooguit max radialen richting want.
  function steer(a, want, max) {
    let d = want - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + Math.max(-max, Math.min(max, d));
  }

  // Een pad van punten [x, y, x, y, ...] met de kop vooraan: voeg de nieuwe kop toe en knip het lichaam af op lengte len.
  // Punt 0 is altijd de kop; daarachter liggen vaste punten op STEP van elkaar.
  function grow(path, x, y, len) {
    if (path.length < 4 || Math.hypot(x - path[0], y - path[1]) > 260) {
      path.length = 0;
      path.push(x, y, x, y);
    }
    path[0] = x;
    path[1] = y;
    const fx = path[2], fy = path[3];
    const d = Math.hypot(x - fx, y - fy);
    if (d >= STEP) {
      const n = Math.floor(d / STEP);
      const pts = [];
      for (let i = n; i >= 1; i--) pts.push(fx + ((x - fx) / d) * STEP * i, fy + ((y - fy) / d) * STEP * i);
      path.splice(2, 0, ...pts);
    }
    const keep = Math.max(2, Math.ceil(len / STEP) + 1) * 2;
    if (path.length > keep) path.length = keep;
    return path;
  }

  function spawn(R, others = []) {
    let best = null, bestD = -1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (R - 380);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      let near = Infinity;
      for (const o of others) near = Math.min(near, Math.hypot(o[0] - x, o[1] - y));
      if (near > bestD) { bestD = near; best = { x, y, a: Math.atan2(-y, -x) + (Math.random() - .5) }; }
      if (near > 500) break;
    }
    return best;
  }

  return { START, SPEED, BOOST, BOOST_PER_ANSWER, MAX_BOOST, STEP, COLORS, DUST, bodyLen, width, turn, arenaR, dustCount, steer, grow, spawn };
});
