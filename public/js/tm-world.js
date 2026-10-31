// Tuimelridder: de parcoursen en de natuurkunde, gedeeld door de server, de leerlingen en het bord.
// Zijaanzicht in meter; y gaat naar onder. Je ridder zit op een rijmachine (een stijf lichaam met wielen of zweefschijven).
// Raakt zijn helm iets, word je geraakt door een valstrik of val je in een put, dan tuimelt hij eraf (een ledenpop)
// en begin je opnieuw bij de laatste vlag. Er zijn 5 vaste parcoursen van 4 etappes; na de finish kies je een rijmachine.
// Na parcours 5 begin je opnieuw bij parcours 1, met snellere valstrikken.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TmWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const BASE = 10;       // hoogte van de grond aan elke vlag
  const PIT = 13.8;      // lava (of slijm, ijswater...) in een put
  const VOID = 16.5;     // wie hieronder zakt, is gevallen
  const BOTTOM = 19;     // onderkant van de grond (tekenen)
  const G = 22;
  const TURBO_S = 6;
  const RESPAWN_S = 1.7;
  const MIN_STAGE_S = 3;
  const PER = 4;         // etappes per parcours
  const COURSES = 5;
  const COLORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // ---------- De rijmachines ----------
  // Lokale assen: x vooruit, y omlaag, (0,0) = zwaartepunt. kind: 'wielen', 'een' (eenwieler), 'zweef' (zweefschijven).
  // wheels: [x, y, straal], head: plek van de helm, acc/vmax/brake: motor, spin: kantelen in de lucht,
  // seat/knee/foot/hand: hoe de ridder erop zit (voor het tekenen en de ledenpop).
  const VEHICLES = [
    {
      id: 'troon', name: 'Rakettroon', icon: '🚀', tip: 'Snel en wendbaar. Pas op voor salto’s!', kind: 'wielen',
      wheels: [[-.85, .42, .42], [.85, .42, .42]], acc: 26, vmax: 14, brake: 32, roll: .1, bounce: .1, spin: 7.5, lift: 1, g: 1, k: .8, rocket: true, airKeep: 12,
      seat: [-.25, -.15], knee: [.35, -.15], foot: [.45, .35], hand: [.6, -.55], lean: .12,
    },
    {
      id: 'een', name: 'Eenwieler', icon: '🎡', tip: 'Eén groot wiel: hij houdt zichzelf recht, maar remt slecht.', kind: 'een',
      wheels: [[0, .7, .78]], acc: 20, vmax: 11.5, brake: 16, roll: .08, bounce: .15, spin: 8, g: 1, k: .75, keep: 70, damp: 11,
      seat: [0, -.25], knee: [.35, .05], foot: [.15, .5], hand: [.3, -.55], lean: 0,
    },
    {
      id: 'ton', name: 'Stoomton', icon: '🛢️', tip: 'Zwaar en stevig: hij valt niet snel om, maar springt minder ver.', kind: 'wielen',
      wheels: [[-1.15, .5, .5], [1.15, .5, .5]], acc: 22, vmax: 12.5, brake: 36, roll: .14, bounce: 0, spin: 6.5, lift: .4, g: 1.1, k: .95, airKeep: 12,
      seat: [-.15, -.45], knee: [.4, -.45], foot: [.55, -.05], hand: [.75, -.75], lean: .08,
    },
    {
      id: 'zweef', name: 'Zweeftroon', icon: '🪽', tip: 'Zweeft over bulten. Hou gas in de lucht en je glijdt verder.', kind: 'zweef',
      pads: [[-.8, .35], [.8, .35]], hover: 1.15, acc: 22, vmax: 12.5, brake: 26, roll: .25, bounce: 0, spin: 6, g: 1, k: .8, glide: .42,
      wheels: [[-.8, .35, .28], [.8, .35, .28]], keep: 26, damp: 6,
      seat: [-.2, -.2], knee: [.35, -.2], foot: [.5, .2], hand: [.55, -.6], lean: .1,
    },
  ];
  for (const v of VEHICLES) {
    // De ridder: heup op het zadel, rug een beetje naar voren, helm erboven.
    const [sx, sy] = v.seat;
    v.neck = [sx + .2 + v.lean, sy - .75];
    v.head = [sx + .26 + v.lean, sy - 1.1];
    v.elbow = [(v.neck[0] + v.hand[0]) / 2 + .02, (v.neck[1] + v.hand[1]) / 2 + .22];
    v.invI = 1 / (v.k * v.k);
  }
  const vehicleOf = i => VEHICLES[((i | 0) % VEHICLES.length + VEHICLES.length) % VEHICLES.length];

  // ---------- De vijf werelden ----------
  const THEMES = [
    { id: 'burcht', name: 'De Burcht', sky: ['#160f3a', '#4b2d78', '#f08a5d'], earth: '#3a2a3f', stone: '#5b5470', top: '#ffc94a', glow: '#5ee7ff', lava: '#ff6a2a', lavaHi: '#ffd36b', far: '#2a1f55', mid: '#3a2a66' },
    { id: 'moeras', name: 'Het Neonmoeras', sky: ['#04110f', '#0d2a2a', '#1d4a3a'], earth: '#1b2a24', stone: '#33503f', top: '#7dff9a', glow: '#2de2c8', lava: '#4ade80', lavaHi: '#d9ffb0', far: '#0c201c', mid: '#14332a' },
    { id: 'ijs', name: 'De IJsberg', sky: ['#050a22', '#13306a', '#4a7ab8'], earth: '#24344f', stone: '#5b7aa8', top: '#c8f1ff', glow: '#7ae1ff', lava: '#2f7fd8', lavaHi: '#c8f1ff', far: '#1a2e5a', mid: '#2a4478' },
    { id: 'wolken', name: 'Het Wolkenkasteel', sky: ['#3a3f8a', '#b06ab3', '#ffc3a0'], earth: '#6a5a8a', stone: '#c9b8e8', top: '#ffe9a0', glow: '#ff6bd6', lava: '#f7d6ff', lavaHi: '#ffffff', far: '#8a6ab0', mid: '#a07ac0' },
    { id: 'lava', name: 'De Lavasmidse', sky: ['#120404', '#3a0a0a', '#8a2a10'], earth: '#2a1414', stone: '#5a3030', top: '#ff8c42', glow: '#ffc94a', lava: '#ff4d1a', lavaHi: '#ffe08a', far: '#2a0a0a', mid: '#3d1210' },
  ];

  // ---------- De parcoursen ----------
  // Per etappe een lijst stukken. [soort, ...maten]. Na de laatste etappe van een parcours staat de finishpoort.
  const LAYOUT = [
    // 1. De Burcht: rustig leren rijden
    [['vlak', 6], ['heuvel', 14, 1.2], ['bobbels', 8], ['schans', 3], ['vlak', 3], ['heuvel', 12, 1.6]],
    [['vlak', 4], ['wip'], ['vlak', 3], ['hamer'], ['vlak', 2], ['schans', 3.6]],
    [['veer', 6], ['vlak', 3], ['trap', 3], ['stekels', 1.8], ['heuvel', 12, 1.4]],
    [['laser'], ['heuvel', 14, 2], ['schans', 4], ['hamer'], ['vlak', 3]],
    // 2. Het Neonmoeras: kanonnen en wippen
    [['vlak', 5], ['bobbels', 9], ['kanon', 3.4], ['heuvel', 12, 1.6], ['wip']],
    [['hamer'], ['veer', 7], ['vlak', 2], ['stekels', 2.2], ['bobbels', 8]],
    [['laser'], ['wip'], ['kanon', 3.8], ['heuvel', 14, 2.2]],
    [['trap', 4], ['schans', 4.2], ['hamer'], ['laser'], ['vlak', 3]],
    // 3. De IJsberg: heuvels en grote sprongen
    [['heuvel', 16, 2.6], ['schans', 4.4], ['bobbels', 9], ['veer', 7.5]],
    [['laser'], ['heuvel', 12, 2], ['hamer'], ['stekels', 2.4], ['vlak', 2]],
    [['kanon', 4], ['wip'], ['trap', 4], ['schans', 4.4]],
    [['veer', 8], ['hamer'], ['laser'], ['heuvel', 14, 2.6], ['kanon', 4]],
    // 4. Het Wolkenkasteel: valstrikken vlak na elkaar
    [['vlak', 4], ['hamer'], ['laser'], ['schans', 4.6], ['wip']],
    [['veer', 8.5], ['stekels', 2.6], ['bobbels', 9], ['kanon', 4.4]],
    [['laser'], ['hamer'], ['trap', 4], ['veer', 8], ['heuvel', 12, 2]],
    [['wip'], ['kanon', 4.6], ['hamer'], ['laser'], ['schans', 4.8]],
    // 5. De Lavasmidse: alles samen
    [['hamer'], ['kanon', 4.6], ['stekels', 2.8], ['laser'], ['heuvel', 14, 2.4]],
    [['veer', 9], ['wip'], ['hamer'], ['trap', 5], ['schans', 5]],
    [['laser'], ['kanon', 4.8], ['hamer'], ['veer', 8.5], ['bobbels', 9]],
    [['hamer'], ['laser'], ['stekels', 3], ['kanon', 4.6], ['hamer'], ['vlak', 3], ['wip']],
  ];
  const ETAPPES = LAYOUT.length; // 20

  const courseOf = k => Math.floor(Math.max(0, k) / PER) % COURSES;
  const roundOf = k => Math.floor(Math.max(0, k) / ETAPPES);
  const themeOf = k => THEMES[courseOf(k)];
  const isFinish = k => k > 0 && k % PER === 0; // de vlag aan het einde van etappe k-1 is een finishpoort

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- Een etappe bouwen ----------
  // Geeft de etappe in eigen coördinaten (start op x = 0); stage() schuift ze op hun plek.
  function build(i, d) {
    const r = rng(i * 7919 + 31);
    const st = { grounds: [], pits: [], hammers: [], lasers: [], cannons: [], springs: [], spikes: [], wips: [], deco: [] };
    let pts = [];
    let cur = BASE, cx = 0, id = 0;
    const pt = (x, y) => { pts.push([x, y]); cx = x; cur = y; };
    const gapStart = () => { pts.push([cx, VOID + 1.5]); st.grounds.push(pts); pts = []; };
    const gapEnd = (x, y) => { pts = [[x, VOID + 1.5]]; pt(x, y); };
    const ramp = (len, rise) => {
      const xs = cx, ys = cur, k0 = .4;
      const slope = rise / (len * (1 - k0 / 2));
      for (let j = 1; j <= 8; j++) {
        const x = len * j / 8;
        const y = x < len * k0 ? slope * x * x / (2 * len * k0) : slope * (len * k0 / 2 + (x - len * k0));
        pt(xs + x, ys - y);
      }
    };
    const toward = (y, len) => {
      const xs = cx, ys = cur, n = 6;
      for (let j = 1; j <= n; j++) { const u = j / n; pt(xs + len * u, ys + (y - ys) * (1 - Math.cos(Math.PI * u)) / 2); }
    };
    if (i === 0 && d === 0) { pts.push([-14, BASE - 6]); pts.push([-14, BASE]); } else pts.push([-.5, BASE]);
    pt(4, BASE);
    st.deco.push({ kind: 'fakkel', x: 2.5, y: BASE });
    const per = f => f * (1 - Math.min(.3, d * .12)); // in ronde 2 en verder gaan de valstrikken sneller
    for (const [kind, a, b] of LAYOUT[i]) {
      if (kind === 'vlak') pt(cx + a, cur);
      else if (kind === 'heuvel') {
        const up = cur > BASE - 1.5 ? 1 : -1;
        const xs = cx, ys = cur, n = Math.round(a);
        for (let j = 1; j <= n; j++) { const u = j / n; pt(xs + a * u, ys - up * b * (1 - Math.cos(2 * Math.PI * u)) / 2); }
        pt(cx + 2, cur);
      } else if (kind === 'bobbels') {
        const xs = cx, ys = cur, steps = Math.round(a / .5);
        for (let j = 1; j <= steps; j++) { const u = j / steps * a; pt(xs + u, ys - Math.abs(Math.sin(u * Math.PI / 1.4)) * .3); }
        pt(cx + 2, ys);
      } else if (kind === 'schans') {
        // Een schans omhoog, een put en een landing die een beetje afloopt.
        pt(cx + 5, cur);
        const ys = cur;
        ramp(5.5, 1.7);
        const lx = cx + a, ly = Math.min(BASE + 1, ys + .5);
        gapStart();
        st.pits.push({ x0: lx - a, x1: lx });
        gapEnd(lx, ly - .6);
        pt(lx + 3, ly);
        pt(cx + 3, ly);
      } else if (kind === 'veer') {
        // Een springplank: rij erover en je vliegt hoog over een brede put.
        pt(cx + 4, cur);
        st.springs.push({ id: id++, x0: cx, x1: cx + 1.8, y: cur, vx: (a + 4.6) / 1.23 });
        pt(cx + 2.4, cur);
        const lx = cx + a;
        gapStart();
        st.pits.push({ x0: lx - a, x1: lx });
        gapEnd(lx, cur);
        pt(lx + 4, cur);
      } else if (kind === 'wip') {
        pt(cx + 2, cur);
        const len = 9.5, A = .24, half = len / 2;
        const w = { id: id++, px: cx + half * Math.cos(A), py: cur - half * Math.sin(A), half, A };
        st.wips.push(w);
        gapStart();
        st.pits.push({ x0: w.px - half * Math.cos(A), x1: w.px + half * Math.cos(A) });
        gapEnd(w.px + half * Math.cos(A), cur);
        pt(cx + 3, cur);
      } else if (kind === 'trap') {
        pt(cx + 2, cur);
        for (let j = 0; j < a; j++) { pt(cx + .55, cur - .3); pt(cx + 1.8 + r() * .4, cur); }
        toward(BASE + .3, Math.max(5, Math.abs(BASE + .3 - cur) / .3));
      } else if (kind === 'hamer') {
        // Een zwaaiende hamer boven de weg: wacht tot hij weg is en rij er snel onderdoor.
        pt(cx + 6, cur);
        const hx = cx + 2.5, len = 4.4;
        const hy = cur - 2.35 - len;
        st.hammers.push({ x: hx, y: hy, len, R: .7, per: per(3.4), amp: 1.35, ph: r() });
        st.deco.push({ kind: 'galg', x: hx, y: cur, top: hy });
        pt(cx + 6, cur);
      } else if (kind === 'laser') {
        // Een laserpoort: hij knippert aan en uit. Rij erdoor als hij uit is.
        pt(cx + 6, cur);
        st.lasers.push({ x: cx, y: cur, top: cur - 4.6, per: per(3), on: .42, ph: r() });
        pt(cx + 5, cur);
      } else if (kind === 'kanon') {
        // Een put met aan de overkant een kanon dat bollen over de put schiet: spring als er geen bol komt.
        pt(cx + 5, cur);
        const ys = cur;
        ramp(4.5, 1.3);
        const lx = cx + a, ly = ys;
        gapStart();
        st.pits.push({ x0: lx - a, x1: lx });
        gapEnd(lx, ly);
        st.cannons.push({ x: lx + .2, y: ly + .55, vx: -(a + 4) / 1.3, vy: -9.5, per: per(2.6), ph: r(), life: 1.6 });
        pt(lx + 4, ly);
      } else if (kind === 'stekels') {
        pt(cx + 5, cur);
        const ys = cur;
        ramp(4, 1.1);
        pt(cx + .15, ys);
        st.spikes.push({ x: cx + .3, y: ys, w: a });
        pt(cx + a + 4, ys);
      }
    }
    if (Math.abs(BASE - cur) > .05) toward(BASE, Math.max(5, Math.abs(BASE - cur) / .3));
    pt(cx + 4, BASE);
    st.deco.push({ kind: 'fakkel', x: cx - 1, y: BASE });
    st.len = cx;
    pt(cx + .5, BASE);
    st.grounds.push(pts);
    return st;
  }

  // De etappes liggen achter elkaar. Na etappe 20 begint parcours 1 opnieuw (een ronde verder, sneller).
  const base = [];
  let loopLen = 0;
  for (let i = 0; i < ETAPPES; i++) { const b = build(i, 0); base.push({ x0: loopLen, len: b.len }); loopLen += b.len; }
  // x van het begin van etappe k (= de vlag k)
  function startX(k) {
    k = Math.max(0, k);
    return roundOf(k) * loopLen + base[k % ETAPPES].x0;
  }
  // In welke etappe ligt x?
  function stageAt(x) {
    if (x < 0) return 0;
    const r = Math.floor(x / loopLen);
    const rest = x - r * loopLen;
    let i = 0;
    while (i < ETAPPES - 1 && base[i + 1].x0 <= rest) i++;
    return r * ETAPPES + i;
  }

  const cache = new Map();
  function stage(k) {
    k = Math.max(0, k);
    let st = cache.get(k);
    if (st) return st;
    const i = k % ETAPPES, d = roundOf(k);
    const b = build(i, d);
    const ox = startX(k);
    const sh = (o, keys) => { for (const key of keys) o[key] += ox; return o; };
    st = {
      k, i, d, x0: ox, x1: ox + b.len, theme: THEMES[courseOf(k)], course: courseOf(k),
      grounds: b.grounds.map(g => g.map(([x, y]) => [x + ox, y])),
      pits: b.pits.map(p => sh(p, ['x0', 'x1'])),
      hammers: b.hammers.map(h => sh(h, ['x'])),
      lasers: b.lasers.map(l => sh(l, ['x'])),
      cannons: b.cannons.map(c => sh(c, ['x'])),
      springs: b.springs.map(s => sh(s, ['x0', 'x1'])),
      spikes: b.spikes.map(s => sh(s, ['x'])),
      wips: b.wips.map(w => sh(w, ['px'])),
      deco: b.deco.map(o => sh(o, ['x'])),
      segs: [],
    };
    for (const g of st.grounds) for (let j = 0; j < g.length - 1; j++) {
      const [ax, ay] = g[j], [bx, by] = g[j + 1];
      if (ax === bx && ay === by) continue;
      st.segs.push([ax, ay, bx, by, Math.min(ax, bx), Math.max(ax, bx)]);
    }
    if (cache.size > 40) cache.clear();
    cache.set(k, st);
    return st;
  }
  function near(x) {
    const k = stageAt(x);
    const out = [stage(k), stage(k + 1)];
    if (k > 0) out.unshift(stage(k - 1));
    return out;
  }

  // ---------- Wat beweegt ----------
  function wipEnds(w, a) {
    const c = Math.cos(a) * w.half, s = Math.sin(a) * w.half;
    return [w.px - c, w.py - s, w.px + c, w.py + s];
  }
  function wipUpdate(w, a, x, dt) {
    if (a == null) a = -w.A;
    if (x != null && x > w.px - w.half - .5 && x < w.px + w.half + .5) {
      const target = x > w.px ? w.A : -w.A;
      const step = 1.7 * dt;
      a += Math.max(-step, Math.min(step, target - a));
    }
    return a;
  }
  const hammerAngle = (h, t) => h.amp * Math.sin((t / h.per + h.ph) * Math.PI * 2);
  function hammerHead(h, t) {
    const a = hammerAngle(h, t);
    return [h.x + Math.sin(a) * h.len, h.y + Math.cos(a) * h.len];
  }
  // Laser: 0 = uit, 1 = aan, tussenin knippert hij als waarschuwing (warn).
  function laserState(l, t) {
    const f = ((t / l.per + l.ph) % 1 + 1) % 1;
    if (f < l.on) return { on: true, warn: false };
    return { on: false, warn: f > .82 };
  }
  // De kanonbollen die nu in de lucht zijn: [x, y].
  function cannonBalls(c, t) {
    const out = [];
    const n0 = Math.floor(t / c.per + c.ph);
    for (let n = n0; n > n0 - 2; n--) {
      const tau = t - (n - c.ph) * c.per;
      if (tau < 0 || tau > c.life) continue;
      const y = c.y + c.vy * tau + G * .5 * tau * tau;
      if (y > PIT + .5) continue;
      out.push([c.x + c.vx * tau, y, tau]);
    }
    return out;
  }
  const BALL_R = .42;

  // ---------- De rijmachine ----------
  function spawn(k, vi) {
    const veh = vehicleOf(vi);
    const x = startX(k) + 1.6 + (veh.kind === 'een' ? 0 : .9);
    const low = Math.max(...veh.wheels.map(w => w[1] + w[2]));
    return { x, y: BASE - (veh.kind === 'zweef' ? veh.hover * .8 + .35 : low) - .02, a: 0, vx: 0, vy: 0, w: 0, veh, vi: vi | 0, k, wip: {}, rot: 0, contact: 0, air: 0, landed: false, speed: 0, boing: false };
  }
  // Lokaal punt naar de wereld.
  function local(p, lx, ly) {
    const c = Math.cos(p.a), s = Math.sin(p.a);
    return [p.x + lx * c - ly * s, p.y + lx * s + ly * c];
  }
  function closest(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return [ax + dx * k, ay + dy * k];
  }
  // Duw op punt (rx, ry vanaf het zwaartepunt) in richting (nx, ny) met grootte j.
  function impulse(p, rx, ry, nx, ny, j) {
    p.vx += nx * j;
    p.vy += ny * j;
    p.w += (rx * ny - ry * nx) * j * p.veh.invI;
  }

  // Een stukje natuurkunde. input: { gas, rem }. Geeft 'kop', 'put', 'stekels', 'hamer', 'laser' of 'kanon' terug, anders null.
  function step(p, input, dt, t, turbo) {
    const V = p.veh;
    const n = Math.max(1, Math.ceil(dt / (1 / 200)));
    const h = dt / n;
    const stages = near(p.x);
    const segs = [];
    for (const st of stages) for (const s of st.segs) if (s[5] > p.x - 7 && s[4] < p.x + 7) segs.push(s);
    const gas = input.gas ? 1 : 0, rem = input.rem ? 1 : 0;
    const vmax = V.vmax * (turbo ? 1.3 : 1), acc = V.acc * (turbo ? 1.35 : 1);
    p.landed = false;
    p.boing = false;
    for (let i = 0; i < n; i++) {
      const tt = t - dt + h * (i + 1);
      const dyn = [];
      for (const st of stages) for (const w of st.wips) {
        if (Math.abs(w.px - p.x) > w.half + 8) continue;
        const key = w.id + ':' + st.k;
        p.wip[key] = wipUpdate(w, p.wip[key], p.contact ? p.x : null, h);
        const e = wipEnds(w, p.wip[key]);
        dyn.push([e[0], e[1], e[2], e[3], Math.min(e[0], e[2]), Math.max(e[0], e[2])]);
      }
      const all = dyn.length ? segs.concat(dyn) : segs;
      const onGround = p.contact > 0;
      // Zwaartekracht; de zweeftroon glijdt met gas in de lucht.
      const gg = G * V.g * (V.glide && !onGround && gas && p.vy > 0 ? V.glide : 1);
      p.vy += gg * h;
      // Kantelen in de lucht (gas = achterover, rem = voorover). Op de grond een klein beetje wheelie.
      if (!onGround) p.w += (rem - gas) * V.spin * h * (V.kind === 'zweef' && gas ? .6 : 1);
      else if (V.lift && gas && p.a > -.45) p.w -= V.lift * h;
      // Eenwieler en zweeftroon houden zichzelf recht als ze de grond raken.
      // In de lucht helpt dat een beetje mee, zodat ze recht landen.
      if (V.keep) {
        const target = onGround && V.kind === 'een' ? (gas ? .16 : rem ? -.16 : 0) : 0;
        const f = onGround ? 1 : .35;
        p.w += (-(p.a - target) * V.keep - p.w * V.damp) * h * f;
      }
      // Een klein beetje vanzelf rechttrekken in de lucht: met gas ingedrukt sla je niet meteen over de kop.
      if (V.airKeep && !onGround) p.w += (-Math.atan2(Math.sin(p.a), Math.cos(p.a)) * V.airKeep - p.w * .8) * h;
      // Niet eindeloos tollen.
      if (Math.abs(p.w) > 6) p.w = Math.sign(p.w) * 6;
      p.x += p.vx * h; p.y += p.vy * h; p.a += p.w * h;
      // Botsen: elk wiel tegen de grond.
      let contact = 0;
      const c = Math.cos(p.a), s = Math.sin(p.a);
      for (const [lx, ly, r] of V.wheels) {
        let driven = false;
        const wx = p.x + lx * c - ly * s, wy = p.y + lx * s + ly * c;
        for (const sg of all) {
          if (wx < sg[4] - r || wx > sg[5] + r) continue;
          const [qx, qy] = closest(wx, wy, sg[0], sg[1], sg[2], sg[3]);
          let nx = wx - qx, ny = wy - qy;
          const dist = Math.hypot(nx, ny);
          if (dist >= r || dist < 1e-6) continue;
          nx /= dist; ny /= dist;
          const pen = r - dist;
          // Contactpunt t.o.v. het zwaartepunt
          const rx = qx - p.x, ry = qy - p.y;
          const rn = rx * ny - ry * nx;
          const k = 1 / (1 + rn * rn * V.invI);
          // Uit de grond duwen
          const P = pen * k * .9;
          p.x += nx * P; p.y += ny * P; p.a += rn * P * V.invI * .5;
          const vpx = p.vx - p.w * ry, vpy = p.vy + p.w * rx;
          const vn = vpx * nx + vpy * ny;
          if (vn < 0) impulse(p, rx, ry, nx, ny, -vn * (1 + (vn < -3 ? V.bounce : 0)) * k);
          contact++;
          if (driven) continue;
          driven = true;
          // Rijden langs de grond: de kracht werkt halfweg de as van het wiel (minder wheelie dan echt, fijner om te rijden).
          const tx = -ny, ty = nx;
          const vt = vpx * tx + vpy * ty;
          let a = 0;
          if (gas && vt < vmax) a = acc;
          else if (rem) a = vt > .4 ? -V.brake : (vt > -3.5 ? -acc * .5 : 0);
          a -= vt * V.roll;
          impulse(p, (wx - p.x) * .5, (wy - p.y) * .5, tx, ty, a * h / V.wheels.length);
        }
      }
      // Zweefschijven: een veer naar de grond eronder.
      if (V.pads) {
        for (const [lx, ly] of V.pads) {
          const px = p.x + lx * c - ly * s, py = p.y + lx * s + ly * c;
          let gy = Infinity;
          for (const sg of all) {
            if (px < sg[4] || px > sg[5] || sg[4] === sg[5]) continue;
            const y = sg[1] + (sg[3] - sg[1]) * (px - sg[0]) / (sg[2] - sg[0]);
            if (y >= py - .3 && y < gy) gy = y;
          }
          const dd = gy - py;
          if (dd < V.hover) {
            const rx = px - p.x, ry = py - p.y;
            const vpy = p.vy + p.w * rx;
            const f = Math.max(0, (V.hover - dd) * 90 + vpy * 14);
            impulse(p, rx, ry, 0, -1, f * h * .5);
            contact++;
            const vt = p.vx;
            let a = 0;
            if (gas && vt < vmax) a = acc;
            else if (rem) a = vt > .4 ? -V.brake : (vt > -3.5 ? -acc * .5 : 0);
            a -= vt * V.roll;
            p.vx += a * h * .5;
          }
        }
      }
      if (!onGround && contact && p.air > .3) p.landed = true;
      p.contact = contact;
      p.air = contact ? 0 : p.air + h;
      // Springplanken
      for (const st of stages) for (const sp of st.springs) {
        if (p.x < sp.x0 - .4 || p.x > sp.x1 + .4) continue;
        const low = p.y + Math.max(...V.wheels.map(w => w[1] + w[2]));
        if (low > sp.y - (V.pads ? V.hover + .3 : .35) && p.vy > -6) {
          // Altijd even hoog en even ver: zo is elke sprong te halen, met elke rijmachine.
          p.vy = -13.5 * Math.sqrt(V.g);
          p.vx = sp.vx * Math.sqrt(V.g);
          p.w *= .3;
          p.boing = true;
        }
      }
      // Gevaar: de helm, de romp, de wielen.
      const [hx, hy] = local(p, V.head[0], V.head[1]);
      const [mx, my] = local(p, (V.seat[0] + V.neck[0]) / 2, (V.seat[1] + V.neck[1]) / 2);
      for (const sg of all) {
        if (hx < sg[4] - 1 || hx > sg[5] + 1) continue;
        let [qx, qy] = closest(hx, hy, sg[0], sg[1], sg[2], sg[3]);
        if (Math.hypot(hx - qx, hy - qy) < .32) return 'kop';
        [qx, qy] = closest(mx, my, sg[0], sg[1], sg[2], sg[3]);
        if (Math.hypot(mx - qx, my - qy) < .3) return 'kop';
      }
      if (p.y > VOID) return 'put';
      const body = [[hx, hy, .32], [mx, my, .4]];
      for (const [lx, ly, r] of V.wheels) { const [wx, wy] = local(p, lx, ly); body.push([wx, wy, r]); }
      for (const st of stages) {
        for (const sk of st.spikes) {
          for (const [bx, by, br] of body) if (bx > sk.x - br * .6 && bx < sk.x + sk.w + br * .6 && by + br > sk.y - .55) return 'stekels';
        }
        for (const hm of st.hammers) {
          if (Math.abs(hm.x - p.x) > 7) continue;
          const [ex, ey] = hammerHead(hm, tt);
          for (const [bx, by, br] of body) if (Math.hypot(bx - ex, by - ey) < hm.R + br) return 'hamer';
        }
        for (const l of st.lasers) {
          if (Math.abs(l.x - p.x) > 4 || !laserState(l, tt).on) continue;
          for (const [bx, by, br] of body) if (Math.abs(bx - l.x) < br + .08 && by > l.top) return 'laser';
        }
        for (const cn of st.cannons) {
          if (Math.abs(cn.x - p.x) > 12) continue;
          for (const [ex, ey] of cannonBalls(cn, tt)) for (const [bx, by, br] of body) if (Math.hypot(bx - ex, by - ey) < BALL_R + br) return 'kanon';
        }
      }
    }
    p.speed = p.vx;
    const R = V.wheels[0][2];
    p.rot += (p.contact ? p.speed : (input.gas ? vmax * .5 : 0)) / R * dt;
    return null;
  }

  // ---------- De ridder ----------
  // De houding op de rijmachine, in wereldpunten: [hoofd, nek, heup, elleboog, hand, knie, voet] (twee keer arm en been).
  function riderPose(p) {
    const V = p.veh;
    const L = ([x, y]) => local(p, x, y);
    return { head: L(V.head), neck: L(V.neck), hip: L(V.seat), elbow: L(V.elbow), hand: L(V.hand), knee: L(V.knee), foot: L(V.foot) };
  }
  // De ledenpop na een val: punten met snelheid en stokjes ertussen.
  const BONES = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2]];
  function ragdoll(pose, vx, vy, spin) {
    const P = [pose.head, pose.neck, pose.hip, pose.elbow, pose.hand, pose.elbow, pose.hand, pose.knee, pose.foot, pose.knee, pose.foot];
    const pts = P.map(([x, y], i) => {
      const off = i === 5 || i === 6 || i === 9 || i === 10 ? .06 : 0;
      // Elk punt krijgt de snelheid van de rijmachine plus wat draaiing: de ridder tuimelt eraf.
      const rx = x - pose.hip[0], ry = y - pose.hip[1];
      const sx = vx - spin * ry, sy = vy + spin * rx;
      return { x: x + off, y, px: x + off - sx / 60, py: y - sy / 60 };
    });
    const len = BONES.map(([a, b]) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y));
    return { pts, len, t: 0 };
  }
  // Een stapje voor de ledenpop (60 per seconde is genoeg).
  function ragdollStep(rd, dt) {
    rd.t += dt;
    const n = Math.max(1, Math.ceil(dt * 60));
    const h = dt / n;
    const segs = [];
    const x = rd.pts[2].x;
    for (const st of near(x)) for (const s of st.segs) if (s[5] > x - 6 && s[4] < x + 6) segs.push(s);
    for (let it = 0; it < n; it++) {
      for (const q of rd.pts) {
        const vx = (q.x - q.px) * .995, vy = (q.y - q.py) * .995;
        q.px = q.x; q.py = q.y;
        q.x += vx; q.y += vy + G * h * h;
      }
      for (let k = 0; k < 4; k++) {
        BONES.forEach(([a, b], i) => {
          const A = rd.pts[a], B = rd.pts[b];
          const dx = B.x - A.x, dy = B.y - A.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const f = (d - rd.len[i]) / d * (i === 10 ? .25 : .5);
          A.x += dx * f; A.y += dy * f; B.x -= dx * f; B.y -= dy * f;
        });
        rd.pts.forEach((q, i) => {
          const r = i === 0 ? .3 : .12;
          for (const s of segs) {
            if (q.x < s[4] - r || q.x > s[5] + r) continue;
            const [qx, qy] = closest(q.x, q.y, s[0], s[1], s[2], s[3]);
            const dx = q.x - qx, dy = q.y - qy;
            const d = Math.hypot(dx, dy);
            if (d >= r || d < 1e-6) continue;
            q.x = qx + dx / d * r; q.y = qy + dy / d * r;
            // Wrijving: over de grond schuiven gaat traag.
            q.px += (q.x - q.px) * .25; q.py += (q.y - q.py) * .25;
          }
        });
      }
    }
  }

  return {
    BASE, PIT, VOID, BOTTOM, G, TURBO_S, RESPAWN_S, MIN_STAGE_S, PER, COURSES, ETAPPES, COLORS, VEHICLES, THEMES, LAYOUT, BALL_R, BONES,
    vehicleOf, courseOf, roundOf, themeOf, isFinish, rng, stage, near, startX, stageAt, wipEnds, wipUpdate, hammerAngle, hammerHead,
    laserState, cannonBalls, spawn, local, step, riderPose, ragdoll, ragdollStep, loopLen: () => loopLen,
  };
});
