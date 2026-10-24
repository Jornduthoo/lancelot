// Strijdrossen: de gevechtsarena en hoe een hoverros rijdt en springt. Gedeeld door de server, de leerlingen en het bord.
// Een open, ovale arena zoals in Smash Karts: lage kratten als dekking, pilaren, schansen om over te springen
// en in het midden een burchttoren. Alles in arena-eenheden; (0, 0) is linksboven, hoek 0 is naar rechts, z is de hoogte.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SrWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 3000;
  const H = 2000;
  const CX = W / 2;
  const CY = H / 2;
  const RX = 1440;           // de ovale rand
  const RY = 940;
  const R = 30;              // straal van een hoverros
  const G = 1100;            // zwaartekracht bij een sprong

  // Rijden: optrekken, remmen, uitbollen en sturen. Sturen gaat beter naarmate je sneller rijdt.
  const CAR = { accel: 640, brake: 1300, coast: 320, max: 480, boostMax: 760, reverse: 200, turn: 2.6, boostTime: 1.4 };

  // Wapens. Lasers vliegen rechtdoor, raketten zoeken een vijand, mijnen blijven liggen tot er iemand overrijdt.
  const LASER = { speed: 1500, range: 1400, r: 7, dmg: 1, every: 210 };
  const RAKET = { speed: 820, range: 2400, r: 12, dmg: 2, blast: 100, turn: 3.2, seek: 1100, every: 650 };
  const MIJN = { trigger: 46, blast: 120, dmg: 3, arm: 700, life: 45000, max: 4, every: 400 };

  // Eén kwart van de arena; de rest is gespiegeld, zodat elke kant even eerlijk is.
  const mirror = (list, fn) => {
    const out = [];
    for (const it of list) {
      for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const c = fn(it, fx, fy);
        if (!out.some(o => Math.abs(o.x - c.x) < 1 && Math.abs(o.y - c.y) < 1)) out.push(c);
      }
    }
    return out;
  };
  // Kratten en lage muurtjes (h = hoogte): dekking tegen lasers, je kan er net niet over kijken als je er vlak achter staat.
  const BOXES = mirror([
    { x: 560, y: 420, w: 170, d: 56, h: 54 },
    { x: 960, y: 250, w: 60, d: 170, h: 54 },
    { x: 760, y: 700, w: 84, d: 84, h: 70 },
    { x: 350, y: 760, w: 70, d: 70, h: 54 },
    { x: 1240, y: 560, w: 120, d: 50, h: 54 },
  ], (b, fx, fy) => ({ ...b, x: fx ? W - b.x - b.w : b.x, y: fy ? H - b.y - b.d : b.y }));
  // Pilaren en in het midden de burchttoren.
  const CYLS = [
    { x: CX, y: CY, r: 110, h: 300, kind: 'burcht' },
    ...mirror([{ x: 1160, y: 640, r: 42, h: 180, kind: 'pilaar' }, { x: 560, y: 1000, r: 46, h: 180, kind: 'pilaar' }],
      (c, fx, fy) => ({ ...c, x: fx ? W - c.x : c.x, y: fy ? H - c.y : c.y })),
  ];
  // Schansen: rij er in de richting van de pijl over en je vliegt. (x, y) is het midden, a de richting omhoog.
  const RAMPS = [
    { x: CX, y: 330, a: 0, w: 190, d: 130, h: 50 },
    { x: CX, y: H - 330, a: Math.PI, w: 190, d: 130, h: 50 },
    { x: 380, y: CY, a: -Math.PI / 2, w: 190, d: 130, h: 50 },
    { x: W - 380, y: CY, a: Math.PI / 2, w: 190, d: 130, h: 50 },
    { x: 1000, y: 1000, a: -Math.PI / 2, w: 170, d: 120, h: 46 },
    { x: W - 1000, y: 1000, a: Math.PI / 2, w: 170, d: 120, h: 46 },
  ];
  // Turbostroken op de vloer: wie erover rijdt, schiet vooruit.
  const PADS = [
    { x: 1150, y: 300, w: 110, h: 70 },
    { x: W - 1260, y: H - 370, w: 110, h: 70 },
    { x: 700, y: 960, w: 80, h: 80 },
    { x: W - 780, y: 960, w: 80, h: 80 },
    { x: CX - 45, y: 620, w: 90, h: 80 },
    { x: CX - 45, y: H - 700, w: 90, h: 80 },
  ];

  // De kampen van de teams en de startplaatsen voor ieder voor zich (met de neus naar het midden).
  const BASES = {
    rood: { x: 110, y: 700, w: 200, h: 600 },
    blauw: { x: W - 310, y: 700, w: 200, h: 600 },
  };
  const SPAWNS = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2 + .1;
    SPAWNS.push([CX + Math.cos(t) * (RX - 150), CY + Math.sin(t) * (RY - 130)]);
  }

  // Voor de schansen: de plek in het eigen assenstelsel (u langs de helling, v dwars).
  function rampLocal(r, x, y) {
    const dx = x - r.x, dy = y - r.y;
    const c = Math.cos(r.a), s = Math.sin(r.a);
    return { u: dx * c + dy * s, v: -dx * s + dy * c };
  }

  // De hoogte van de grond: 0, of de helling van een schans.
  function groundAt(x, y) {
    let g = 0;
    for (const r of RAMPS) {
      const { u, v } = rampLocal(r, x, y);
      if (Math.abs(u) <= r.w / 2 && Math.abs(v) <= r.d / 2) g = Math.max(g, r.h * (u + r.w / 2) / r.w);
    }
    return g;
  }

  function inside(x, y, r = 0) {
    return ((x - CX) / (RX - r)) ** 2 + ((y - CY) / (RY - r)) ** 2 <= 1;
  }

  // Botst een cirkel op hoogte z met de rand, een krat of een pilaar?
  function blocked(x, y, r = R, z = 0) {
    if (!inside(x, y, r)) return true;
    for (const b of BOXES) {
      if (z > b.h - 6) continue;
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.d));
      if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
    }
    for (const c of CYLS) {
      if (z > c.h - 6) continue;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 < (c.r + r) ** 2) return true;
    }
    return false;
  }

  // Raakt een schot (een punt op hoogte z) de rand, een krat of een pilaar? Schansen houden niets tegen.
  function wallAt(x, y, z = 30) {
    if (!inside(x, y)) return true;
    for (const b of BOXES) if (z < b.h && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.d) return true;
    for (const c of CYLS) if (z < c.h && (c.x - x) ** 2 + (c.y - y) ** 2 < c.r * c.r) return true;
    return false;
  }

  function clearLine(ax, ay, bx, by, z = 30) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 14);
    for (let i = 1; i < steps; i++) {
      if (wallAt(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, z)) return false;
    }
    return true;
  }

  const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  const onPad = (x, y) => PADS.some(p => inRect(x, y, p));

  // Eén stap rijden. s = { x, y, z, vz, a, v, boost }, input = { gas: -1..1, turn: -1..1 }.
  // Geeft terug wat er gebeurde: bump (tegen iets aan), jump (van een schans) of land (weer op de grond).
  function drive(s, input, dt) {
    const out = { bump: false, jump: false, land: false };
    s.z = s.z || 0;
    s.vz = s.vz || 0;
    const gas = Math.max(-1, Math.min(1, input.gas || 0));
    const turn = Math.max(-1, Math.min(1, input.turn || 0));
    const air = s.z > groundAt(s.x, s.y) + 1;
    const max = s.boost > 0 ? CAR.boostMax : CAR.max;
    if (s.boost > 0) {
      s.boost -= dt;
      s.v = Math.max(s.v, CAR.boostMax * .9);
    }
    if (!air) {
      if (gas > 0) {
        if (s.v < 0) s.v = Math.min(0, s.v + CAR.brake * dt);
        else if (s.v < max) s.v = Math.min(max, s.v + CAR.accel * gas * dt);
      } else if (gas < 0) {
        s.v = s.v > 0 ? Math.max(0, s.v - CAR.brake * dt) : Math.max(-CAR.reverse, s.v - CAR.accel * .7 * dt);
      } else {
        s.v -= Math.sign(s.v) * Math.min(Math.abs(s.v), CAR.coast * dt);
      }
      if (s.v > max) s.v = Math.max(max, s.v - 500 * dt);
    }
    const grip = Math.min(1, Math.abs(s.v) / 170);
    s.a += turn * CAR.turn * dt * (air ? .4 : 1) * (s.v < 0 ? -grip : Math.max(grip, gas > 0 ? .35 : 0));
    if (s.a > Math.PI) s.a -= Math.PI * 2;
    if (s.a < -Math.PI) s.a += Math.PI * 2;
    const dx = Math.cos(s.a) * s.v * dt;
    const dy = Math.sin(s.a) * s.v * dt;
    // Een schans van de hoge kant of de zijkant oprijden gaat niet: dat is een muurtje.
    const can = (x, y) => !blocked(x, y, R, s.z) && groundAt(x, y) <= s.z + 14;
    const before = groundAt(s.x, s.y);
    if (can(s.x + dx, s.y + dy)) {
      s.x += dx;
      s.y += dy;
    } else if (can(s.x + dx, s.y)) {
      s.x += dx;
      s.v *= .9;
    } else if (can(s.x, s.y + dy)) {
      s.y += dy;
      s.v *= .9;
    } else {
      out.bump = Math.abs(s.v) > 200;
      s.v = -s.v * .25;
    }
    const g = groundAt(s.x, s.y);
    if (air) {
      s.vz -= G * dt;
      s.z += s.vz * dt;
      if (s.z <= g) {
        out.land = s.vz < -250;
        s.z = g;
        s.vz = 0;
      }
    } else if (before > 2 && g < before - 2 && s.v > 120) {
      // Van de bovenkant van een schans: de lucht in.
      s.vz = Math.min(520, s.v * .72);
      s.z = before;
      out.jump = true;
    } else {
      s.z = g;
    }
    if (onPad(s.x, s.y) && s.v > 0 && s.z < 5) s.boost = CAR.boostTime;
    return out;
  }

  function spawnPoint(team, taken = []) {
    const toCenter = (x, y) => Math.atan2(CY - y, CX - x);
    const free = ([x, y]) => !blocked(x, y, R + 8) && groundAt(x, y) === 0 && taken.every(t => (t[0] - x) ** 2 + (t[1] - y) ** 2 > 100 * 100);
    if (BASES[team]) {
      const b = BASES[team];
      for (let i = 0; i < 50; i++) {
        const p = [b.x + Math.random() * b.w, b.y + Math.random() * b.h];
        if (free(p)) return [...p, team === 'rood' ? 0 : Math.PI];
      }
      return [b.x + b.w / 2, b.y + b.h / 2, team === 'rood' ? 0 : Math.PI];
    }
    // Ieder voor zich: de startplaats die het verst van de anderen ligt.
    let best = SPAWNS[0];
    let bestD = -1;
    for (const s of SPAWNS) {
      if (!free([s[0], s[1]]) && taken.length) continue;
      const d = taken.length ? Math.min(...taken.map(t => (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2)) : Math.random();
      if (d > bestD) { bestD = d; best = s; }
    }
    return [best[0], best[1], toCenter(best[0], best[1])];
  }

  return {
    W, H, CX, CY, RX, RY, R, G, CAR, LASER, RAKET, MIJN, BOXES, CYLS, RAMPS, PADS, BASES, SPAWNS,
    inside, blocked, wallAt, clearLine, groundAt, rampLocal, onPad, drive, spawnPoint,
  };
});
