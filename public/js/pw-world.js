// Poortwacht: het kronkelpad naar de burchtpoort, de torenplaatsen langs het pad en alle getallen van torens en monsters.
// Gedeeld door de server, de leerlingen en het bord. Alles in kaarteenheden: de kaart is 1600 x 900.
// Een monster op het pad is gewoon een afstand d: pos(d) geeft de plek en de richting.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PwWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 1600, H = 900;
  const STEP = 4;
  const ROAD = 30;            // halve breedte van het pad
  const GATE = { x: 1515, y: 450 };
  const PORTAL = { x: 70, y: 175 };

  // De bochten van het pad; daartussen tekenen we een vloeiende kromme.
  const WAY = [
    [-30, 175], [70, 175], [250, 175], [330, 260], [330, 560], [250, 700], [420, 790], [600, 730], [660, 560], [660, 330],
    [760, 170], [960, 140], [1110, 210], [1120, 380], [990, 520], [1020, 700], [1200, 780], [1360, 690], [1390, 520], [1450, 450], [1515, 450],
  ];

  // Catmull-Rom door alle bochten, daarna om de STEP eenheden een punt (zo is pos(d) één opzoeking).
  const PTS = (() => {
    const raw = [];
    for (let i = 0; i < WAY.length - 1; i++) {
      const p0 = WAY[Math.max(0, i - 1)], p1 = WAY[i], p2 = WAY[i + 1], p3 = WAY[Math.min(WAY.length - 1, i + 2)];
      for (let k = 0; k < 24; k++) {
        const t = k / 24, t2 = t * t, t3 = t2 * t;
        raw.push([
          .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    raw.push(WAY[WAY.length - 1]);
    const out = [raw[0]];
    let carry = 0;
    for (let i = 1; i < raw.length; i++) {
      const [ax, ay] = raw[i - 1], [bx, by] = raw[i];
      const len = Math.hypot(bx - ax, by - ay);
      let at = STEP - carry;
      while (at <= len) {
        out.push([ax + (bx - ax) * (at / len), ay + (by - ay) * (at / len)]);
        at += STEP;
      }
      carry = len - (at - STEP);
    }
    return out;
  })();
  const LENGTH = (PTS.length - 1) * STEP;

  // Plek en richting op afstand d langs het pad.
  function pos(d) {
    const f = Math.max(0, Math.min(PTS.length - 1.001, d / STEP));
    const i = Math.floor(f), k = f - i;
    const a = PTS[i], b = PTS[i + 1];
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }

  function distToPath(x, y) {
    let best = Infinity;
    for (let i = 0; i < PTS.length; i += 2) best = Math.min(best, (PTS[i][0] - x) ** 2 + (PTS[i][1] - y) ** 2);
    return Math.sqrt(best);
  }

  // Torenplaatsen: om de zoveel stappen langs het pad, afwisselend links en rechts, niet op het pad en niet te dicht op elkaar.
  const SLOTS = (() => {
    const list = [];
    for (let d = 150, side = 1; d < LENGTH - 90; d += 34, side = -side) {
      const p = pos(d);
      for (const s of [side, -side]) {
        const x = p.x - Math.sin(p.a) * 74 * s, y = p.y + Math.cos(p.a) * 74 * s;
        if (x < 46 || x > W - 150 || y < 50 || y > H - 46) continue;
        if (distToPath(x, y) < 64) continue;
        if (Math.hypot(x - PORTAL.x, y - PORTAL.y) < 120) continue;
        if (list.some(o => Math.hypot(o.x - x, o.y - y) < 78)) continue;
        list.push({ x: Math.round(x), y: Math.round(y), d: Math.round(d) });
        break;
      }
    }
    return list;
  })();

  // Welke plaatsen gebruiken we voor n spelers: zo gelijk mogelijk verspreid langs het pad.
  function pickSlots(n) {
    const total = SLOTS.length;
    n = Math.min(total, Math.max(1, n));
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.min(total - 1, Math.floor((i + .5) * total / n)));
    return out;
  }

  // ---------- Torens ----------
  // Per soort: bereik, tijd tussen schoten, schade per niveau (1 tot 5).
  const TOWERS = {
    laser: { name: 'Lasertoren', icon: '🔷', color: '#4cc9ff', range: [150, 160, 172, 186, 200], rate: [.42, .38, .34, .3, .26], dmg: [8, 14, 23, 36, 52] },
    katapult: { name: 'Plasmakatapult', icon: '☄️', color: '#ff8c42', range: [170, 180, 192, 205, 220], rate: [1.5, 1.4, 1.3, 1.2, 1.1], dmg: [26, 46, 76, 118, 170], splash: [62, 70, 80, 92, 105] },
    ijs: { name: 'IJstoren', icon: '❄️', color: '#9be7ff', range: [140, 150, 160, 172, 186], rate: [.9, .85, .8, .75, .7], dmg: [6, 10, 16, 25, 36], slow: [.55, .5, .45, .4, .35], chain: [1, 2, 3, 4, 5] },
  };
  const BUILD = 40;
  const UPGRADE = [0, 60, 100, 150, 220];   // prijs om naar niveau 2, 3, 4, 5 te gaan
  const MAX_LVL = 5;
  const SWITCH = 20;
  const START_GOLD = 40;
  const MAX_BOLT = 2;
  const BOLT = { range: 230, frac: .6, boss: .12 };

  // ---------- Monsters ----------
  // hp en snelheid bij de start; de server maakt ze sterker naarmate het spel vordert. armor: zoveel minder schade per treffer.
  const MONSTERS = {
    kruiper: { hp: 40, speed: 82, dmg: 1, armor: 0, r: 13, gold: 2 },
    renner: { hp: 26, speed: 140, dmg: 1, armor: 0, r: 11, gold: 2 },
    pantser: { hp: 150, speed: 58, dmg: 3, armor: 4, r: 17, gold: 4 },
    draak: { hp: 2600, speed: 50, dmg: 30, armor: 6, r: 34, gold: 0 },
  };
  const TYPES = ['kruiper', 'renner', 'pantser', 'draak'];
  const GATE_HP = 100;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  return { W, H, ROAD, GATE, PORTAL, WAY, PTS, LENGTH, STEP, SLOTS, TOWERS, BUILD, UPGRADE, MAX_LVL, SWITCH, START_GOLD, MAX_BOLT, BOLT, MONSTERS, TYPES, GATE_HP, COLORS, pos, distToPath, pickSlots };
});
