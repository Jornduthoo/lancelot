// Ridder-Royale: de ronde arena, de dekking en de neonstorm die krimpt. Gedeeld door de server, de leerlingen en het bord.
// Alles in arena-eenheden; het midden van de arena is (0, 0), hoek 0 is naar rechts.
// De storm volgt een vast schema dat uit het zaadje van de ronde komt: server en schermen rekenen hem zelf uit.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RyWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const R = 18;              // straal van een ridder
  const SPEED = 235;
  const SLOW = .45;          // zo traag na een fout antwoord
  const HP = 100;
  const MAX_SHIELD = 50;
  const LASER = { speed: 920, life: .7, dmg: 20, cd: 300, r: 6 };
  const SUPER = { speed: 1300, life: .75, dmg: 60, r: 12 };
  // De storm: wachten, dan krimpen tot een deel van de vorige straal. dps = schade per seconde buiten de cirkel.
  const PHASES = [
    { wait: 18, shrink: 20, k: .62, dps: 5 },
    { wait: 14, shrink: 18, k: .55, dps: 8 },
    { wait: 12, shrink: 16, k: .5, dps: 12 },
    { wait: 10, shrink: 14, k: .4, dps: 18 },
    { wait: 8, shrink: 16, k: 0, dps: 26 },
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // De arena: groter met meer ridders. Muren (rechthoeken) van burchtruïnes, rotsen en pilaren (cirkels),
  // struiken om je in te verstoppen en kratten met munitie of een energiecel.
  function makeArena(seed, players) {
    const rnd = rng(seed);
    const size = Math.round(Math.min(2100, 950 + Math.max(2, players) * 45));
    const walls = [];
    const rocks = [];
    const bushes = [];
    const crates = [];
    const fits = (x, y, r) => Math.hypot(x, y) < size - r - 60
      && !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 50)
      && !walls.some(w => x + r + 40 > w.x && x - r - 40 < w.x + w.w && y + r + 40 > w.y && y - r - 40 < w.y + w.h);
    // In het midden een vervallen burcht: vier muren met openingen.
    const c = 150;
    for (const [x, y, w, h] of [[-c, -c, c * .8, 30], [c * .2, -c, c * .8, 30], [-c, c - 30, c * .8, 30], [c * .2, c - 30, c * .8, 30], [-c, -c, 30, c * .7], [c - 30, c * .3, 30, c * .7]]) walls.push({ x, y, w, h });
    rocks.push({ x: 0, y: 0, r: 34, kind: 'zuil' });
    // Ruïnes verspreid over de arena: L-vormen en losse muurstukken.
    const nRuins = Math.round(size / 160);
    for (let i = 0; i < nRuins * 3 && walls.length < 6 + nRuins * 2; i++) {
      const a = rnd() * Math.PI * 2, d = 360 + rnd() * (size - 520);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const long = 120 + rnd() * 140, thick = 28;
      const horiz = rnd() < .5;
      const w = horiz ? long : thick, h = horiz ? thick : long;
      if (!fits(x + w / 2, y + h / 2, Math.max(w, h) / 2 + 20)) continue;
      walls.push({ x, y, w, h });
      if (rnd() < .5) walls.push(horiz ? { x, y, w: thick, h: 90 + rnd() * 60 } : { x, y, w: 90 + rnd() * 60, h: thick });
    }
    // Rotsen en pilaren
    for (let i = 0; i < size / 40 && rocks.length < size / 55; i++) {
      const a = rnd() * Math.PI * 2, d = 250 + rnd() * (size - 300);
      const x = Math.cos(a) * d, y = Math.sin(a) * d, r = 22 + rnd() * 30;
      if (fits(x, y, r)) rocks.push({ x, y, r, kind: rnd() < .3 ? 'zuil' : 'rots' });
    }
    // Struiken: je kan erdoor lopen, maar wie erin staat, zien anderen niet (tenzij heel dichtbij).
    for (let i = 0; i < size / 30 && bushes.length < size / 70; i++) {
      const a = rnd() * Math.PI * 2, d = 200 + rnd() * (size - 260);
      const x = Math.cos(a) * d, y = Math.sin(a) * d, r = 40 + rnd() * 26;
      if (fits(x, y, r) && !bushes.some(b => Math.hypot(b.x - x, b.y - y) < b.r + r + 30)) bushes.push({ x, y, r });
    }
    // Kratten
    for (let i = 0; i < 200 && crates.length < 8 + players; i++) {
      const a = rnd() * Math.PI * 2, d = 150 + rnd() * (size - 220);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (fits(x, y, 30) && !crates.some(k => Math.hypot(k.x - x, k.y - y) < 160)) crates.push({ x, y });
    }
    // Waar de storm naartoe trekt: elke fase een nieuw midden binnen de vorige cirkel.
    const zones = [{ x: 0, y: 0, r: size }];
    for (const ph of PHASES) {
      const prev = zones[zones.length - 1];
      const r = prev.r * ph.k;
      const a = rnd() * Math.PI * 2, d = rnd() * (prev.r - r) * .8;
      zones.push({ x: prev.x + Math.cos(a) * d, y: prev.y + Math.sin(a) * d, r });
    }
    return { seed, size, walls, rocks, bushes, crates, zones };
  }

  // De storm op t seconden na de start van de ronde: { x, y, r, phase, next (seconden tot hij weer krimpt), shrinking, dps }.
  function zoneAt(ar, t) {
    let time = 0;
    for (let i = 0; i < PHASES.length; i++) {
      const ph = PHASES[i], a = ar.zones[i], b = ar.zones[i + 1];
      if (t < time + ph.wait) return { x: a.x, y: a.y, r: a.r, phase: i, next: time + ph.wait - t, shrinking: false, dps: i ? PHASES[i - 1].dps : 3 };
      time += ph.wait;
      if (t < time + ph.shrink) {
        const k = (t - time) / ph.shrink;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: a.r + (b.r - a.r) * k, phase: i, next: time + ph.shrink - t, shrinking: true, dps: ph.dps };
      }
      time += ph.shrink;
    }
    const z = ar.zones[ar.zones.length - 1];
    return { x: z.x, y: z.y, r: z.r, phase: PHASES.length, next: 0, shrinking: false, dps: PHASES[PHASES.length - 1].dps };
  }

  const roundLength = () => PHASES.reduce((a, p) => a + p.wait + p.shrink, 0);

  // Een cirkel tegen muren, rotsen en de rand van de arena: wegduwen in de kortste richting.
  function push(ar, x, y, r) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const w of ar.walls) {
        const nx = Math.max(w.x, Math.min(x, w.x + w.w)), ny = Math.max(w.y, Math.min(y, w.y + w.h));
        const dx = x - nx, dy = y - ny, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d > .001) { x = nx + (dx / d) * r; y = ny + (dy / d) * r; } else {
          // Midden in een muur: naar de dichtste kant.
          const opts = [[w.x - r - x, 0], [w.x + w.w + r - x, 0], [0, w.y - r - y], [0, w.y + w.h + r - y]];
          const best = opts.sort((p, q) => Math.hypot(...p) - Math.hypot(...q))[0];
          x += best[0];
          y += best[1];
        }
        moved = true;
      }
      for (const o of ar.rocks) {
        const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), min = o.r + r;
        if (d >= min) continue;
        const k = d > .001 ? min / d : 0;
        x = d > .001 ? o.x + dx * k : o.x + min;
        y = d > .001 ? o.y + dy * k : y;
        moved = true;
      }
      const d = Math.hypot(x, y), max = ar.size - r;
      if (d > max) { x *= max / d; y *= max / d; moved = true; }
      if (!moved) break;
    }
    return { x, y };
  }

  function move(ar, x, y, dx, dy, r = R) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (r * .7)));
    for (let i = 0; i < steps; i++) {
      const p = push(ar, x + dx / steps, y + dy / steps, r);
      x = p.x;
      y = p.y;
    }
    return { x, y };
  }

  function solidAt(ar, x, y, r = 0) {
    if (Math.hypot(x, y) > ar.size) return true;
    for (const w of ar.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
    for (const o of ar.rocks) if (Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
    return false;
  }

  function clear(ar, ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 14);
    for (let i = 1; i < n; i++) if (solidAt(ar, ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }

  function inBush(ar, x, y) {
    return ar.bushes.some(b => Math.hypot(b.x - x, b.y - y) < b.r - 6);
  }

  // Startplekken: verspreid over een ring, ver van elkaar.
  function spawns(ar, n, seed) {
    const rnd = rng(seed + 99);
    const out = [];
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = off + (i / Math.max(1, n)) * Math.PI * 2 + (rnd() - .5) * .2;
      const d = ar.size * (.55 + rnd() * .3);
      const p = push(ar, Math.cos(a) * d, Math.sin(a) * d, R + 4);
      out.push(p);
    }
    return out;
  }

  return { R, SPEED, SLOW, HP, MAX_SHIELD, LASER, SUPER, PHASES, rng, makeArena, zoneAt, roundLength, push, move, solidAt, clear, inBush, spawns };
});
