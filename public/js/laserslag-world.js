// Laserslag: de arena, gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; (0, 0) is linksboven.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Arena = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const R = 18;            // straal van een ridder
  const SPEED = 270;       // eenheden per seconde
  const BULLET = { speed: 950, range: 1100, r: 5 };

  // De arena groeit mee met de klas: klein (tot 10 ridders), middel (tot 18) en groot.
  // Bij elke start kiest de server de maat; schermen krijgen ze mee en bouwen dezelfde arena.
  const SIZES = [[1600, 1000], [2200, 1375], [2800, 1750]];
  const tierFor = n => (n <= 10 ? 0 : n <= 18 ? 1 : 2);

  // Muren en dekking voor de linkerhelft, spiegelbeeldig zodat beide teams evenveel kansen hebben.
  // fx/fy zijn plekken als deel van de arena (zo schuiven ze mee als die groeit); w/h in eenheden.
  const BASE = [
    { fx: .206, fy: .17, w: 44, h: 220 },
    { fx: .206, fy: .61, w: 44, h: 220 },
    { fx: .369, fy: .09, w: 180, h: 40 },
    { fx: .369, fy: .87, w: 180, h: 40 },
    { fx: .35, fy: .44, w: 80, h: 120 },
    { fx: .119, fy: .47, w: 70, h: 60 },
    { fx: .294, fy: .3, w: 60, h: 60 },
    { fx: .294, fy: .64, w: 60, h: 60 },
  ];
  // Extra dekking die er bij een grotere arena bij komt.
  const MORE = [
    [
      { fx: .43, fy: .16, w: 40, h: 140 },
      { fx: .43, fy: .7, w: 40, h: 140 },
      { fx: .23, fy: .47, w: 90, h: 44 },
      { fx: .1, fy: .11, w: 130, h: 36 },
      { fx: .1, fy: .86, w: 130, h: 36 },
    ],
    [
      { fx: .12, fy: .3, w: 50, h: 50 },
      { fx: .12, fy: .66, w: 50, h: 50 },
      { fx: .32, fy: .2, w: 80, h: 40 },
      { fx: .32, fy: .78, w: 80, h: 40 },
      { fx: .44, fy: .4, w: 36, h: 70 },
      { fx: .44, fy: .55, w: 36, h: 70 },
    ],
  ];

  const A = { R, SPEED, BULLET, SIZES, tierFor, tier: -1, W: 0, H: 0, WALLS: [], BASES: {}, SPAWNS: [], CRYSTAL: { x: 0, y: 0 } };

  // De arena (opnieuw) opbouwen voor een maat. Muren, kampen, startplaatsen en het kristal veranderen mee.
  function setTier(tier) {
    tier = Math.max(0, Math.min(SIZES.length - 1, tier | 0));
    if (tier === A.tier) return A;
    const [W, H] = SIZES[tier];
    const grow = 1 + tier * .15;
    const half = [...BASE, ...MORE.slice(0, tier).flat()].map(r => {
      const w = Math.round(r.w * grow), h = Math.round(r.h * grow);
      return { x: Math.round(r.fx * W), y: Math.round(r.fy * H), w, h };
    });
    const mid = [
      { x: W / 2 - 20, y: Math.round(H * .3), w: 40, h: Math.round(110 * grow) },
      { x: W / 2 - 20, y: Math.round(H * .7 - 110 * grow), w: 40, h: Math.round(110 * grow) },
    ];
    A.WALLS = [...half, ...half.map(r => ({ x: W - r.x - r.w, y: r.y, w: r.w, h: r.h })), ...mid];
    A.W = W;
    A.H = H;
    A.tier = tier;
    // De kampen van de teams: hier begin je en kom je terug na een treffer.
    const bw = Math.round(150 * (1 + tier * .35)), bh = Math.round(H * .34);
    A.BASES = {
      rood: { x: 0, y: Math.round(H * .33), w: bw, h: bh },
      blauw: { x: W - bw, y: Math.round(H * .33), w: bw, h: bh },
    };
    A.CRYSTAL = { x: W / 2, y: H / 2 };
    // Startplaatsen voor ieder voor zich: verspreid langs de randen en op een paar open plekken binnenin.
    const spots = [[.05, .08], [.5, .06], [.95, .08], [.95, .5], [.95, .92], [.5, .95], [.05, .92], [.05, .5],
      [.26, .5], [.74, .5], [.42, .25], [.58, .75], [.25, .08], [.75, .92], [.75, .08], [.25, .92], [.62, .3], [.38, .7]];
    A.SPAWNS = [];
    for (const [fx, fy] of spots) {
      let x = Math.round(fx * W), y = Math.round(fy * H);
      // Een startplaats die in een muur valt, schuift een stukje op.
      for (let k = 0; k < 12 && blocked(x, y, R + 6); k++) { x += (fx < .5 ? 25 : -25); y += (fy < .5 ? 15 : -15); }
      if (!blocked(x, y, R + 6)) A.SPAWNS.push([x, y]);
    }
    return A;
  }

  function inRect(x, y, r, pad = 0) {
    return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  }

  // Botst een cirkel met een muur of de rand?
  function blocked(x, y, r = R) {
    if (x < r || y < r || x > A.W - r || y > A.H - r) return true;
    for (const w of A.WALLS) {
      const cx = Math.max(w.x, Math.min(x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(y, w.y + w.h));
      if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
    }
    return false;
  }

  // Een stap zetten en langs muren glijden in plaats van vast te blijven hangen.
  function slide(x, y, dx, dy, r = R) {
    if (!blocked(x + dx, y + dy, r)) return [x + dx, y + dy];
    if (!blocked(x + dx, y, r)) return [x + dx, y];
    if (!blocked(x, y + dy, r)) return [x, y + dy];
    return [x, y];
  }

  // Raakt een kogel (een punt) een muur of de rand?
  function wallAt(x, y) {
    if (x < 0 || y < 0 || x > A.W || y > A.H) return true;
    return A.WALLS.some(w => inRect(x, y, w));
  }

  // Vrij zicht tussen twee punten (voor het automatisch richten).
  function clearLine(ax, ay, bx, by) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 12);
    for (let i = 1; i < steps; i++) {
      if (wallAt(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps)) return false;
    }
    return true;
  }

  function spawnPoint(team, taken = []) {
    const free = ([x, y]) => !blocked(x, y) && taken.every(t => (t[0] - x) ** 2 + (t[1] - y) ** 2 > 60 * 60);
    if (A.BASES[team]) {
      const b = A.BASES[team];
      for (let i = 0; i < 30; i++) {
        const p = [b.x + R + 8 + Math.random() * (b.w - 2 * R - 16), b.y + R + 8 + Math.random() * (b.h - 2 * R - 16)];
        if (free(p)) return p;
      }
      return [b.x + b.w / 2, b.y + b.h / 2];
    }
    // Ieder voor zich: de startplaats die het verst van de anderen ligt.
    let best = A.SPAWNS[0];
    let bestD = -1;
    for (const s of A.SPAWNS) {
      const d = taken.length ? Math.min(...taken.map(t => (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2)) : Math.random();
      if (d > bestD) { bestD = d; best = s; }
    }
    return best.slice();
  }

  Object.assign(A, { setTier, blocked, slide, wallAt, clearLine, spawnPoint, inRect });
  setTier(0);
  return A;
});
