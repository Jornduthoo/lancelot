// Diepboor: de ondergrond, gedeeld door de server, de leerlingen en het bord.
// Een raster van COLS breed en ROWS diep; rij -1 is het oppervlak. Wat er in een vakje zit, volgt uit de seed van het spel,
// zodat iedereen dezelfde mijn krijgt (eerlijk) en het bord ze allemaal naast elkaar kan tekenen.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DbWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COLS = 24, ROWS = 260;
  const T = { LEEG: 0, AARDE: 1, STEEN: 2, ROTS: 3, KOPER: 10, IJZER: 11, ZILVER: 12, GOUD: 13, KRISTAL: 14, NEON: 15, LAVA: 20, GAS: 21 };
  const ORES = {
    10: { name: 'koper', value: 5, color: '#e07b39' },
    11: { name: 'ijzer', value: 10, color: '#b9c2d0' },
    12: { name: 'zilver', value: 20, color: '#e8f1ff' },
    13: { name: 'goud', value: 40, color: '#ffc94a' },
    14: { name: 'kristal', value: 80, color: '#4cc9ff' },
    15: { name: 'neonkern', value: 160, color: '#ff3df0' },
  };
  // Lagen: grondkleur en hoe hard de grond is.
  const BANDS = [
    { to: 25, name: 'Aarde', color: '#6b4a2b', dark: '#3d2a18', hard: 1 },
    { to: 70, name: 'Klei', color: '#7a3d2e', dark: '#43211a', hard: 1.25 },
    { to: 130, name: 'Steen', color: '#4b4f60', dark: '#2a2c38', hard: 1.55 },
    { to: 190, name: 'Kristalgrot', color: '#3a2c5c', dark: '#1f1733', hard: 1.85 },
    { to: ROWS, name: 'Magma', color: '#4a1c1c', dark: '#260d0d', hard: 2.2 },
  ];
  const band = y => BANDS.find(b => y < b.to) || BANDS[BANDS.length - 1];

  // Upgrades in de smidse: waarde per niveau en de prijs om naar dat niveau te gaan.
  const UPGRADES = {
    boor: { name: 'Boor', icon: '⛏️', val: [1, 1.4, 1.9, 2.5, 3.3], cost: [0, 60, 150, 300, 600], unit: '× sneller' },
    tank: { name: 'Tank', icon: '⛽', val: [100, 150, 220, 300, 400], cost: [0, 50, 120, 250, 500], unit: 'brandstof' },
    ruim: { name: 'Laadruim', icon: '🎒', val: [6, 10, 15, 22, 30], cost: [0, 40, 100, 220, 450], unit: 'stenen' },
    pantser: { name: 'Pantser', icon: '🛡️', val: [100, 140, 200, 280, 380], cost: [0, 60, 140, 280, 550], unit: 'pantser' },
  };
  const TELEPORT = { cost: 40, max: 3 };
  const FUEL = { move: .5, dig: 1.1, up: .9 };
  const DAMAGE = { lava: 35, gas: 28, fallFrom: 6, fall: 7 };
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // Een vast willekeurig getal per vakje.
  function hash(seed, x, y) {
    let h = (seed * 374761393 + x * 668265263 + y * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // Grotten: plekken waar twee golven samen hoog zijn.
  function cave(seed, x, y) {
    const v = Math.sin(x * .55 + seed % 13 + y * .21) + Math.sin(y * .37 - x * .29 + seed % 7) + Math.sin((x + y) * .13 + seed % 5);
    return v > 2.15 - Math.min(.5, y / 400);
  }

  const memo = new Map();
  function tile(seed, x, y) {
    if (x < 0 || x >= COLS || y >= ROWS) return T.ROTS;
    if (y < 0) return T.LEEG;
    const key = seed * 100000 + y * COLS + x;
    let v = memo.get(key);
    if (v !== undefined) return v;
    v = gen(seed, x, y);
    if (memo.size > 40000) memo.clear();
    memo.set(key, v);
    return v;
  }
  function gen(seed, x, y) {
    if (y === 0) return T.AARDE;
    const r = hash(seed, x, y);
    if (y > 8 && cave(seed, x, y)) return T.LEEG;
    if (y > 12 && r < .025 + y / 9000) return T.ROTS;
    const o = hash(seed + 99, x, y);
    // Hoe dieper, hoe kostbaarder
    const d = y / ROWS;
    if (o < .085) {
      const k = hash(seed + 7, x, y) + d * .9;
      if (y > 175 && k > 1.55) return T.NEON;
      if (y > 120 && k > 1.25) return T.KRISTAL;
      if (y > 70 && k > 1.0) return T.GOUD;
      if (y > 35 && k > .75) return T.ZILVER;
      if (y > 12 && k > .45) return T.IJZER;
      return T.KOPER;
    }
    if (y > 90 && o > .975) return T.LAVA;
    if (y > 50 && o > .96 && o <= .975) return T.GAS;
    if (y > 25 && r > .82) return T.STEEN;
    return T.AARDE;
  }

  // Hoe lang boren in seconden, met boor-niveau lvl (1 tot 5).
  function digTime(type, y, lvl) {
    if (type === T.ROTS) return Infinity;
    const base = type === T.STEEN ? .55 : type >= 10 && type < 20 ? .45 : type === T.GAS ? .4 : .3;
    return base * band(y).hard / UPGRADES.boor.val[lvl - 1];
  }

  return { COLS, ROWS, T, ORES, BANDS, UPGRADES, TELEPORT, FUEL, DAMAGE, COLORS, band, tile, digTime, hash };
});
