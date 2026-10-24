// Strijdrossen: de gevechtsarena en hoe een hoverros rijdt. Gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; (0, 0) is linksboven, hoek 0 is naar rechts.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SrWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 2400;
  const H = 1600;
  const R = 30;              // straal van een hoverros

  // Rijden: optrekken, remmen, uitbollen en sturen. Sturen gaat beter naarmate je sneller rijdt.
  const CAR = { accel: 640, brake: 1300, coast: 320, max: 470, boostMax: 760, reverse: 190, turn: 2.7, boostTime: 1.4 };

  // Wapens. Lasers vliegen rechtdoor, raketten zoeken een vijand, mijnen blijven liggen tot er iemand overrijdt.
  const LASER = { speed: 1500, range: 1350, r: 7, dmg: 1, every: 210 };
  const RAKET = { speed: 820, range: 2300, r: 12, dmg: 2, blast: 95, turn: 3.2, seek: 1000, every: 650 };
  const MIJN = { trigger: 46, blast: 120, dmg: 3, arm: 700, life: 45000, max: 4, every: 400 };

  // Muren en blokken, spiegelbeeldig in beide richtingen: elke hoek van de arena is even eerlijk.
  const quarter = [
    { x: 360, y: 260, w: 220, h: 50 },
    { x: 360, y: 260, w: 50, h: 200 },
    { x: 820, y: 180, w: 60, h: 220 },
    { x: 620, y: 620, w: 120, h: 120 },
    { x: 180, y: 720, w: 160, h: 60 },
    { x: 1000, y: 520, w: 140, h: 50 },
  ];
  const WALLS = [];
  for (const r of quarter) {
    for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      WALLS.push({ x: fx ? W - r.x - r.w : r.x, y: fy ? H - r.y - r.h : r.y, w: r.w, h: r.h });
    }
  }
  // Het hart van de arena: vier pilaren rond het midden.
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    WALLS.push({ x: W / 2 + dx * 150 - 35, y: H / 2 + dy * 150 - 35, w: 70, h: 70 });
  }

  // Turbostroken op de vloer: wie erover rijdt, schiet vooruit.
  const PADS = [
    { x: W / 2 - 90, y: 120, w: 180, h: 70 },
    { x: W / 2 - 90, y: H - 190, w: 180, h: 70 },
    { x: 110, y: H / 2 - 90, w: 70, h: 180 },
    { x: W - 180, y: H / 2 - 90, w: 70, h: 180 },
    { x: W / 2 - 40, y: H / 2 - 40, w: 80, h: 80 },
  ];

  // De kampen van de teams en de startplaatsen voor ieder voor zich (met de neus naar het midden).
  const BASES = {
    rood: { x: 0, y: 500, w: 170, h: 600 },
    blauw: { x: W - 170, y: 500, w: 170, h: 600 },
  };
  const SPAWNS = [
    [120, 120], [W / 2, 90], [W - 120, 120], [W - 100, H / 2 + 260], [W - 120, H - 120], [W / 2, H - 90],
    [120, H - 120], [100, H / 2 + 260], [640, H / 2], [W - 640, H / 2], [1200, 400], [1200, H - 400],
    [500, 520], [W - 500, H - 520],
  ];

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

  // Raakt een schot (een punt) een muur of de rand?
  function wallAt(x, y) {
    if (x < 0 || y < 0 || x > W || y > H) return true;
    return WALLS.some(w => inRect(x, y, w));
  }

  function clearLine(ax, ay, bx, by) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 14);
    for (let i = 1; i < steps; i++) {
      if (wallAt(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps)) return false;
    }
    return true;
  }

  const onPad = (x, y) => PADS.some(p => inRect(x, y, p));

  // Eén stap rijden. s = { x, y, a, v, boost }, input = { gas: -1..1, turn: -1..1 }. Geeft terug of je ergens tegenaan bonkte.
  function drive(s, input, dt) {
    const gas = Math.max(-1, Math.min(1, input.gas || 0));
    const turn = Math.max(-1, Math.min(1, input.turn || 0));
    const max = s.boost > 0 ? CAR.boostMax : CAR.max;
    if (s.boost > 0) {
      s.boost -= dt;
      s.v = Math.max(s.v, CAR.boostMax * .9);
    }
    if (gas > 0) {
      if (s.v < 0) s.v = Math.min(0, s.v + CAR.brake * dt);
      else if (s.v < max) s.v = Math.min(max, s.v + CAR.accel * gas * dt);
    } else if (gas < 0) {
      s.v = s.v > 0 ? Math.max(0, s.v - CAR.brake * dt) : Math.max(-CAR.reverse, s.v - CAR.accel * .7 * dt);
    } else {
      s.v -= Math.sign(s.v) * Math.min(Math.abs(s.v), CAR.coast * dt);
    }
    if (s.v > max) s.v = Math.max(max, s.v - 500 * dt);
    const grip = Math.min(1, Math.abs(s.v) / 170);
    s.a += turn * CAR.turn * dt * (s.v < 0 ? -grip : Math.max(grip, gas > 0 ? .35 : 0));
    if (s.a > Math.PI) s.a -= Math.PI * 2;
    if (s.a < -Math.PI) s.a += Math.PI * 2;
    const dx = Math.cos(s.a) * s.v * dt;
    const dy = Math.sin(s.a) * s.v * dt;
    let bump = false;
    if (!blocked(s.x + dx, s.y + dy)) {
      s.x += dx;
      s.y += dy;
    } else if (!blocked(s.x + dx, s.y)) {
      s.x += dx;
      s.v *= .9;
    } else if (!blocked(s.x, s.y + dy)) {
      s.y += dy;
      s.v *= .9;
    } else {
      // Frontaal tegen een muur: een beetje terugveren.
      bump = Math.abs(s.v) > 200;
      s.v = -s.v * .25;
    }
    if (onPad(s.x, s.y) && s.v > 0) s.boost = CAR.boostTime;
    return bump;
  }

  function spawnPoint(team, taken = []) {
    const toCenter = (x, y) => Math.atan2(H / 2 - y, W / 2 - x);
    const free = ([x, y]) => !blocked(x, y, R + 6) && taken.every(t => (t[0] - x) ** 2 + (t[1] - y) ** 2 > 90 * 90);
    if (BASES[team]) {
      const b = BASES[team];
      for (let i = 0; i < 40; i++) {
        const p = [b.x + R + 10 + Math.random() * (b.w - 2 * R - 20), b.y + R + 10 + Math.random() * (b.h - 2 * R - 20)];
        if (free(p)) return [...p, team === 'rood' ? 0 : Math.PI];
      }
      return [b.x + b.w / 2, b.y + b.h / 2, team === 'rood' ? 0 : Math.PI];
    }
    // Ieder voor zich: de startplaats die het verst van de anderen ligt.
    let best = SPAWNS[0];
    let bestD = -1;
    for (const s of SPAWNS) {
      const d = taken.length ? Math.min(...taken.map(t => (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2)) : Math.random();
      if (d > bestD) { bestD = d; best = s; }
    }
    return [best[0], best[1], toCenter(best[0], best[1])];
  }

  return { W, H, R, CAR, LASER, RAKET, MIJN, WALLS, PADS, BASES, SPAWNS, blocked, wallAt, clearLine, onPad, drive, spawnPoint, inRect };
});
