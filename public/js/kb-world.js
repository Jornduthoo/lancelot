// Kegelridder: de kegelbaan, gedeeld door de server, de leerlingen en het bord.
// Bovenaanzicht in meter: x opzij (rechts +), y over de baan naar de kegels. De worp volgt uit vier getallen
// (startplek, richting, snelheid, effect) en loopt overal precies hetzelfde: alleen + - * / en sqrt, geen sin of cos,
// en vaste stapjes. Zo rekent de server de uitslag en spelen de leerling en het bord dezelfde worp na zonder vertraging.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KbWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const HALF = 0.53;          // halve breedte van de baan
  const GUTTER = 0.2;         // breedte van een goot
  const WALL = 0.78;          // de zijwanden bij de kegels (daar ketsen kegels terug)
  const HEAD = 18.3;          // de voorste kegel
  const PIT = 19.25;          // daarachter valt alles in de put
  const END = 19.6;           // einde van de baan
  const SP = 0.305;           // afstand tussen twee kegels
  const ROW = 0.2641;         // afstand tussen twee rijen (sp * sqrt(3)/2)
  const PIN_R = 0.06;
  const PIN_M = 1.55;
  const BALL = { R: 0.109, M: 7 };
  const GOLD = { R: 0.13, M: 9.5 };   // de runenbal: groter en zwaarder
  const DT = 1 / 240;
  const MAX_T = 6;
  const FALL_V = 0.32;        // sneller geduwd dan dit: de kegel valt om
  const LIMITS = { x: 0.44, a: 0.075, vMin: 5, vMax: 10.5, s: 1 };

  // Kegel 1 vooraan, dan 2-3, 4-5-6, 7-8-9-10 (van links naar rechts).
  const PINS = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) PINS.push({ x: (i - r / 2) * SP, y: HEAD + r * ROW });

  const COLORS = ['#4cc9ff', '#ff6b6b', '#ffd166', '#06d6a0', '#c77dff', '#ff9f1c', '#f15bb5', '#9ef01a', '#00f5d4', '#ff595e', '#8ac926', '#1982c4', '#ffca3a', '#6a4c93', '#f72585', '#4361ee', '#4cc9f0', '#b5e48c', '#ffb703', '#fb8500', '#e76f51', '#2a9d8f', '#e9c46a', '#a2d2ff', '#cdb4db', '#ffafcc', '#80ed99', '#ffd6a5'];

  const num = (v, lo, hi, d = 0) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : d);
  const r4 = v => Math.round(v * 10000) / 10000;
  // Wat een leerling doorstuurt, altijd binnen de grenzen en afgerond (zo rekent iedereen met dezelfde getallen).
  function clean(t = {}) {
    return {
      x: r4(num(t.x, -LIMITS.x, LIMITS.x)),
      a: r4(num(t.a, -LIMITS.a, LIMITS.a)),
      v: r4(num(t.v, LIMITS.vMin, LIMITS.vMax, 7.5)),
      s: r4(num(t.s, -LIMITS.s, LIMITS.s)),
    };
  }

  // Een worp. standing: welke kegels nog rechtop staan (10 keer true/false). gold: runenbal.
  function create(throwIn, standing, gold) {
    const t = clean(throwIn);
    const ball = gold ? GOLD : BALL;
    const vy = t.v * Math.sqrt(1 - t.a * t.a);
    const sim = {
      t: 0, done: false, gold: Boolean(gold), R: ball.R, M: ball.M, spin: t.s,
      b: { x: t.x, y: 0, vx: t.v * t.a, vy, roll: 0, gutter: false, pit: false },
      pins: PINS.map((p, i) => ({
        i, x: p.x, y: p.y, vx: 0, vy: 0, up: standing ? Boolean(standing[i]) : true, down: false, gone: false, fallAt: -1, fx: 0, fy: 0, wob: -1,
      })),
      quiet: 0,
    };
    for (const p of sim.pins) if (!p.up) p.gone = true;
    return sim;
  }

  function knock(sim, p, nx, ny) {
    if (p.down || p.gone) return;
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > FALL_V) {
      p.down = true;
      p.fallAt = sim.t;
      // De richting waarin hij omvalt (voor het tekenen).
      p.fx = sp ? p.vx / sp : nx;
      p.fy = sp ? p.vy / sp : ny;
    } else {
      // Even wiebelen, maar blijven staan.
      if (p.wob < 0 || sim.t - p.wob > .5) p.wob = sim.t;
      p.vx = 0; p.vy = 0;
    }
  }

  // Twee cirkels botsen (a zwaar of licht). e: hoe hard ze terugveren.
  function collide(sim, a, ra, ma, b, rb, mb, e, isBall) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d2 = dx * dx + dy * dy, rr = ra + rb;
    if (d2 >= rr * rr || d2 === 0) return false;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    // Uit elkaar duwen
    const over = rr - d;
    const wa = isBall ? 0.1 : 0.5;
    a.x -= nx * over * wa; a.y -= ny * over * wa;
    b.x += nx * over * (1 - wa); b.y += ny * over * (1 - wa);
    if (rel >= 0) return true;
    const j = -(1 + e) * rel / (1 / ma + 1 / mb);
    a.vx -= j * nx / ma; a.vy -= j * ny / ma;
    b.vx += j * nx / mb; b.vy += j * ny / mb;
    return { nx, ny };
  }

  function step(sim) {
    if (sim.done) return;
    sim.t += DT;
    const b = sim.b;
    // De bal: eerst glijdt hij, vanaf het midden van de baan grijpt het effect en draait hij af.
    if (!b.pit) {
      if (!b.gutter && b.y > 8 && b.y < HEAD + 0.6) b.vx += sim.spin * 1.25 * DT;
      b.vy -= 0.06 * DT;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      b.roll += Math.sqrt(b.vx * b.vx + b.vy * b.vy) * DT / sim.R;
      if (!b.gutter && (b.x > HALF || b.x < -HALF)) {
        // In de goot: de bal rolt rechtdoor naast de kegels voorbij.
        b.gutter = true;
        b.x = b.x > 0 ? HALF + GUTTER / 2 : -HALF - GUTTER / 2;
        b.vx = 0;
      }
      if (b.y > PIT + .2) { b.pit = true; b.vx = 0; b.vy = 0; }
    }
    // De kegels
    let moving = 0;
    for (const p of sim.pins) {
      if (p.gone || !p.down) continue;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 0) {
        const f = Math.max(0, sp - 2.2 * DT) / sp;
        p.vx *= f; p.vy *= f;
      }
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      if (p.x > WALL) { p.x = WALL; p.vx = -Math.abs(p.vx) * .55; }
      if (p.x < -WALL) { p.x = -WALL; p.vx = Math.abs(p.vx) * .55; }
      if (p.y < HEAD - 1.2) { p.y = HEAD - 1.2; p.vy = Math.abs(p.vy) * .3; }
      if (p.y > PIT) { p.gone = true; p.pit = true; continue; }
      if (sp > .05) moving++;
    }
    // Bal tegen kegels
    if (!b.gutter && !b.pit && b.y > HEAD - 0.4) {
      for (const p of sim.pins) {
        if (p.gone) continue;
        const was = p.down;
        const hit = collide(sim, b, sim.R, sim.M, p, PIN_R, PIN_M, .7, true);
        if (hit && hit.nx !== undefined && !was) knock(sim, p, hit.nx, hit.ny);
        if (hit && !p.down) { p.x = PINS[p.i].x; p.y = PINS[p.i].y; p.vx = 0; p.vy = 0; }
      }
    }
    // Kegels tegen kegels
    const ps = sim.pins;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      if (a.gone) continue;
      for (let k = i + 1; k < ps.length; k++) {
        const c = ps[k];
        if (c.gone || (!a.down && !c.down)) continue;
        const aw = a.down, cw = c.down;
        const hit = collide(sim, a, PIN_R, PIN_M, c, PIN_R, PIN_M, .6, false);
        if (hit && hit.nx !== undefined) {
          if (!aw) knock(sim, a, -hit.nx, -hit.ny);
          if (!cw) knock(sim, c, hit.nx, hit.ny);
        }
        // Een kegel die rechtop blijft, beweegt niet.
        if (!a.down) { a.vx = 0; a.vy = 0; a.x = PINS[i].x; a.y = PINS[i].y; }
        if (!c.down) { c.vx = 0; c.vy = 0; c.x = PINS[k].x; c.y = PINS[k].y; }
      }
    }
    const ballBusy = !b.pit && !(b.gutter && b.y > PIT);
    if (!ballBusy && moving === 0) sim.quiet += DT; else sim.quiet = 0;
    if (sim.quiet > .25 || sim.t > MAX_T) sim.done = true;
  }

  // Tot een tijdstip doorrekenen (voor het tekenen).
  function runTo(sim, t) {
    while (!sim.done && sim.t + DT <= t) step(sim);
  }

  // De hele worp in één keer: welke kegels vielen er?
  function play(throwIn, standing, gold) {
    const sim = create(throwIn, standing, gold);
    while (!sim.done) step(sim);
    const down = [];
    for (const p of sim.pins) if (standing[p.i] && (p.down || p.gone)) down.push(p.i);
    return { down, gutter: sim.b.gutter, t: sim.t };
  }

  return { HALF, GUTTER, WALL, HEAD, PIT, END, SP, ROW, PIN_R, BALL, GOLD, DT, LIMITS, PINS, COLORS, clean, create, step, runTo, play };
});
