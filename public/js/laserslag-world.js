// Laserslag: de arena, gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; (0, 0) is linksboven.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Arena = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 1600;
  const H = 1000;
  const R = 18;            // straal van een ridder
  const SPEED = 270;       // eenheden per seconde
  const BULLET = { speed: 950, range: 1100, r: 5 };

  // Muren en dekking, spiegelbeeldig zodat beide teams evenveel kansen hebben.
  const half = [
    { x: 330, y: 170, w: 44, h: 220 },
    { x: 330, y: 610, w: 44, h: 220 },
    { x: 590, y: 90, w: 180, h: 40 },
    { x: 590, y: 870, w: 180, h: 40 },
    { x: 560, y: 440, w: 80, h: 120 },
    { x: 190, y: 470, w: 70, h: 60 },
    { x: 470, y: 300, w: 60, h: 60 },
    { x: 470, y: 640, w: 60, h: 60 },
  ];
  const WALLS = [
    ...half,
    ...half.map(r => ({ x: W - r.x - r.w, y: r.y, w: r.w, h: r.h })),
    { x: 780, y: 300, w: 40, h: 110 },
    { x: 780, y: 590, w: 40, h: 110 },
  ];

  // De kampen van de teams: hier begin je en kom je terug na een treffer.
  const BASES = {
    rood: { x: 0, y: 330, w: 150, h: 340 },
    blauw: { x: W - 150, y: 330, w: 150, h: 340 },
  };
  // Startplaatsen voor ieder voor zich: verspreid langs de randen.
  const SPAWNS = [
    [80, 80], [800, 60], [1520, 80], [1520, 500], [1520, 920], [800, 950], [80, 920], [80, 500],
    [420, 500], [1180, 500], [680, 250], [920, 750],
  ];
  const CRYSTAL = { x: W / 2, y: H / 2 };

  function inRect(x, y, r, pad = 0) {
    return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  }

  // Botst een cirkel met een muur of de rand?
  function blocked(x, y, r = R) {
    if (x < r || y < r || x > W - r || y > H - r) return true;
    for (const w of WALLS) {
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
    if (x < 0 || y < 0 || x > W || y > H) return true;
    return WALLS.some(w => inRect(x, y, w));
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
    if (BASES[team]) {
      const b = BASES[team];
      for (let i = 0; i < 30; i++) {
        const p = [b.x + R + 8 + Math.random() * (b.w - 2 * R - 16), b.y + R + 8 + Math.random() * (b.h - 2 * R - 16)];
        if (free(p)) return p;
      }
      return [b.x + b.w / 2, b.y + b.h / 2];
    }
    // Ieder voor zich: de startplaats die het verst van de anderen ligt.
    let best = SPAWNS[0];
    let bestD = -1;
    for (const s of SPAWNS) {
      const d = taken.length ? Math.min(...taken.map(t => (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2)) : Math.random();
      if (d > bestD) { bestD = d; best = s; }
    }
    return best.slice();
  }

  return { W, H, R, SPEED, BULLET, WALLS, BASES, SPAWNS, CRYSTAL, blocked, slide, wallAt, clearLine, spawnPoint, inRect };
});
