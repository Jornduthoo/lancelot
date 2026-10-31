// Raketridder: de hindernisbaan in de lucht, gedeeld door de server, de leerlingen en het bord.
// Zijaanzicht in meter (1 = een tegel); y gaat naar onder, de lava (of het plasma) ligt onderaan.
// De baan bestaat uit etappes. Elke etappe volgt uit een getal (seed) per spel, zodat iedereen dezelfde baan vliegt
// en het bord de anderen op de juiste plek kan tekenen. Wat beweegt (platforms, lasers, vuurraderen) hangt af van de speeltijd.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JpWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const H = 14;           // hoogte van de baan
  const LAVA = 13.2;      // wie hieronder zakt, valt in de lava
  const L = 56;           // lengte van een etappe
  const BASE_Y = 10;      // hoogte van de vlagplatforms
  const SIZE = { w: .8, h: 1.3 };
  const PHYS = {
    g: 34, thrust: 62, up: 10.5, fall: 15,
    run: 46, air: 30, vx: 8.5, stop: 34,
    drain: .75, refill: 1.6, boost: 1.35, // brandstof per seconde; boost = sneller met turbo
  };
  const TURBO_S = 6;
  const RESPAWN_S = .9;
  const MIN_STAGE_S = 3; // sneller kan een etappe niet (controle op de server)
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  // Elke drie etappes een andere wereld.
  const THEMES = [
    { name: 'Wolkenburcht', sky: ['#1a1446', '#5b3a8c', '#e98a6b'], lava: '#ff6a2a', lavaHi: '#ffd36b', stone: '#4a4f6e', stoneHi: '#8e96c4', edge: '#ffc94a', glow: '#5ee7ff', far: '#2c2560', near: '#231c4d', mid: '#3a2f73' },
    { name: 'Lavasmidse', sky: ['#120606', '#3d0f0c', '#8a2a12'], lava: '#ff4b1f', lavaHi: '#ffb347', stone: '#3b2f2f', stoneHi: '#7a5c52', edge: '#ffc94a', glow: '#ff8c42', far: '#2a0e0b', near: '#1c0907', mid: '#3a1410' },
    { name: 'Sterrenpoort', sky: ['#03040f', '#0b1640', '#1d2f6e'], lava: '#7b4dff', lavaHi: '#5ee7ff', stone: '#28324f', stoneHi: '#6b84c9', edge: '#ffc94a', glow: '#c77dff', far: '#0d1a44', near: '#081030', mid: '#13245a' },
  ];
  const themeOf = k => THEMES[Math.floor(Math.max(0, k) / 3) % THEMES.length];

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- Een etappe ----------
  // solids: {x, y, w, h, mv?} (mv = {ax, ay, per, ph}: heen en weer bewegen), spikes: {x, y, w} (bovenop iets),
  // lasers: {x, y0, y1, per, on, ph} (knippert), bars: {cx, cy, len, spd, ph} (draaiend vuurrad), cells: {id, x, y} (energiecellen).
  const cache = new Map();
  function stage(seed, k) {
    const key = `${seed}:${k}`;
    let st = cache.get(key);
    if (st) return st;
    const r = rng(seed * 7919 + k * 104729 + 17);
    const x0 = k * L;
    const d = Math.min(1, k / 10); // moeilijker naarmate je verder komt
    st = { k, x0, x1: x0 + L, solids: [], spikes: [], lasers: [], bars: [], cells: [], theme: themeOf(k) };
    const S = st.solids;
    // Vlagplatform aan het begin (de vlag van de vorige etappe staat op x0).
    S.push({ x: x0 - 5, y: BASE_Y, w: k === 0 ? 11 : 10, h: 1.4, flag: true });
    if (k === 0) S[0].x = x0 - 6;
    let cx = x0 + 6;
    let ci = 0;
    const cell = (x, y) => st.cells.push({ id: `${k}.${ci++}`, x, y });
    const end = x0 + L - 6;
    const used = new Set();
    while (cx < end - 6) {
      let kinds = ['sprong', 'bewegend', 'muur', 'stekels'];
      if (k >= 1) kinds.push('vuurrad', 'laser');
      if (k >= 3) kinds.push('tunnel', 'vuurrad');
      if (k >= 2) kinds.push('bewegend');
      kinds = kinds.filter(x => !used.has(x) || r() < .35);
      const kind = kinds[Math.floor(r() * kinds.length)] || 'sprong';
      used.add(kind);
      const room = end - cx;
      if (kind === 'sprong') {
        let x = cx;
        const n = 2 + Math.floor(r() * 2);
        let y = 7 + r() * 4;
        for (let i = 0; i < n && x < end - 4; i++) {
          x += 3 + r() * (2.5 + d * 2.5);
          const w = 3.4 - d * 1.2 + r() * 1.2;
          y = Math.max(4.5, Math.min(11.5, y + (r() - .5) * 5));
          S.push({ x, y, w, h: .9 });
          cell(x + w / 2, y - 1.6);
          x += w;
        }
        cx = x;
      } else if (kind === 'bewegend' && room > 12) {
        const vert = r() < .5;
        const w = 3.2 - d * .6;
        const per = 3.6 - d * 1.2 + r();
        const x = cx + 3 + r() * 1.5;
        const y = vert ? 8 : 6.5 + r() * 4;
        S.push({ x, y, w, h: .8, mv: vert ? { ax: 0, ay: 2.6, per, ph: r() } : { ax: 2.8, ay: 0, per, ph: r() } });
        cell(x + w / 2, y - 2.6);
        cx = x + w + (vert ? 3 : 6) + r() * 1.5;
        if (r() < .4 + d * .4 && cx < end - 6) {
          const x2 = cx;
          S.push({ x: x2, y: 7 + r() * 3, w, h: .8, mv: { ax: 0, ay: 2.2, per: per * .8, ph: r() } });
          cx = x2 + w + 4;
        }
      } else if (kind === 'muur' && room > 10) {
        // Een torenmuur met een gat: vlieg erdoor.
        const x = cx + 4 + r() * 2;
        const gap = 3.8 - d * 1.1;
        const gy = 3 + r() * (8 - gap);
        S.push({ x: cx + .5, y: 9 + r() * 2, w: 3, h: .9 });
        S.push({ x, y: -12, w: 1.6, h: gy + 12, wall: true, top: true });
        S.push({ x, y: gy + gap, w: 1.6, h: H + 2 - gy - gap, wall: true, bottom: true });
        cell(x + .8, gy + gap / 2);
        if (d > .3 && r() < .6) st.lasers.push({ x: x + .8, y0: gy, y1: gy + gap, per: 2.6 - d * .6, on: .42, ph: r() });
        S.push({ x: x + 4, y: Math.min(11.5, gy + gap + 1 + r() * 2), w: 3, h: .9 });
        cx = x + 7.5;
      } else if (kind === 'stekels' && room > 11) {
        // Een lang platform vol stekels, met een lage zoldering erboven: niet te hoog vliegen.
        const x = cx + 3 + r() * 2;
        const w = 8 + d * 3;
        const y = 8.5 + r() * 2.5;
        S.push({ x, y, w, h: 1 });
        st.spikes.push({ x: x + 1.6, y, w: w - 3.2 });
        if (r() < .5 + d * .4) S.push({ x: x + 2.2, y: y - 4.6 + d * .6, w: w - 4.4, h: 1.1, wall: true, drip: true });
        for (let i = 0; i < 3; i++) cell(x + w / 2 - 2 + i * 2, y - 2.2);
        cx = x + w;
      } else if (kind === 'vuurrad' && room > 10) {
        const x = cx + 3 + r() * 1.5;
        const w = 6;
        const y = 8 + r() * 3;
        S.push({ x, y, w, h: 1 });
        st.bars.push({ cx: x + w / 2, cy: y - 3, len: 2.6 + d * .5, spd: (1.5 + d * 1.1) * (r() < .5 ? -1 : 1), ph: r() * 6.3 });
        cell(x + w / 2, y - 6.4);
        cx = x + w;
      } else if (kind === 'laser' && room > 10) {
        // Lasers die aan en uit gaan boven een brede brug: wacht op het juiste moment.
        const x = cx + 3;
        const w = 9;
        const y = 8.5 + r() * 2;
        S.push({ x, y, w, h: 1 });
        const n = 2 + (d > .5 ? 1 : 0);
        const per = 2.4 - d * .5;
        for (let i = 0; i < n; i++) st.lasers.push({ x: x + 2 + i * (w - 4) / Math.max(1, n - 1), y0: 0, y1: y, per, on: .45, ph: i * .5 + r() * .2 });
        cell(x + w / 2, y - 1.2);
        cx = x + w;
      } else if (kind === 'tunnel' && room > 13) {
        // Een smalle gang tussen twee rotsen: voorzichtig met je raket.
        const x = cx + 3;
        const w = 9;
        const top = 4 + r() * 3;
        const hole = 3.4 - d * .5;
        S.push({ x, y: -12, w, h: top + 12, wall: true, top: true });
        S.push({ x, y: top + hole, w, h: H + 2 - top - hole, wall: true, bottom: true });
        st.spikes.push({ x: x + 3, y: top + hole, w: 2 });
        for (let i = 0; i < 3; i++) cell(x + 1.5 + i * 3, top + hole / 2 - .2);
        cx = x + w + 1;
      } else {
        cx += 1;
      }
    }
    // De vlag op het einde, op het platform van de volgende etappe.
    if (cx < end - 2) {
      const x = cx + (end - cx) / 2 - 1.5;
      S.push({ x, y: 9 + r() * 2, w: 3, h: .9 });
    }
    if (cache.size > 60) cache.clear();
    cache.set(key, st);
    return st;
  }

  // Waar staat een bewegend platform op tijd t?
  function at(s, t) {
    if (!s.mv) return s;
    const a = Math.sin((t / s.mv.per + s.mv.ph) * Math.PI * 2);
    return { x: s.x + s.mv.ax * a, y: s.y + s.mv.ay * a, w: s.w, h: s.h, mv: s.mv, wall: s.wall };
  }
  const laserOn = (l, t) => ((t / l.per + l.ph) % 1 + 1) % 1 < l.on;
  // Waarschuwing net voor een laser aangaat.
  const laserSoon = (l, t) => { const f = ((t / l.per + l.ph) % 1 + 1) % 1; return f > .82; };
  const barAngle = (b, t) => b.ph + b.spd * t;

  // De etappes rond x (vorige, deze en volgende).
  function near(seed, x) {
    const k = Math.max(0, Math.floor(x / L));
    const out = [stage(seed, k), stage(seed, k + 1)];
    if (k > 0) out.unshift(stage(seed, k - 1));
    return out;
  }

  const spawnOf = k => ({ x: k * L + 1.2, y: BASE_Y });

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  }

  // ---------- Een stap natuurkunde voor de eigen ridder ----------
  // p: {x, y (voeten), vx, vy, fuel, ground, on}; input: {l, r, up}; turbo: brandstof op en sneller.
  // Geeft 'dood' terug als je iets gevaarlijks raakt, anders null.
  function step(seed, p, input, dt, t, turbo) {
    const P = PHYS;
    const maxVx = P.vx * (turbo ? P.boost : 1);
    const dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    if (dir) {
      p.vx += dir * (p.ground ? P.run : P.air) * dt;
      p.face = dir;
    } else if (p.ground) {
      const s = Math.sign(p.vx);
      p.vx -= s * Math.min(Math.abs(p.vx), P.stop * dt);
    } else p.vx *= 1 - .6 * dt;
    p.vx = Math.max(-maxVx, Math.min(maxVx, p.vx));
    p.jet = false;
    if (input.up && (p.fuel > 0 || turbo)) {
      p.vy -= P.thrust * dt;
      p.jet = true;
      if (!turbo) p.fuel = Math.max(0, p.fuel - P.drain * dt);
    }
    p.vy = Math.max(-P.up, Math.min(P.fall, p.vy + P.g * dt));
    if (p.ground && !p.jet) p.fuel = Math.min(1, p.fuel + P.refill * dt);

    // Meedragen op een bewegend platform.
    const stages = near(seed, p.x);
    // We onthouden waar het platform stond toen je erop landde of de vorige stap. Zo beweeg je mee, ook als er
    // tussendoor tijd voorbij ging (een vraag aan de vlag, een haperend scherm) en het platform al verder geschoven is.
    if (p.on && p.on.mv && p.onAt) {
      const b = at(p.on, t);
      p.x += b.x - p.onAt.x;
      p.y = b.y;
    }
    const hw = SIZE.w / 2;
    const rects = [];
    for (const st of stages) for (const s of st.solids) rects.push([s, at(s, t)]);
    // Horizontaal bewegen en botsen.
    p.x += p.vx * dt;
    for (const [, s] of rects) {
      if (p.x + hw > s.x && p.x - hw < s.x + s.w && p.y > s.y + .02 && p.y - SIZE.h < s.y + s.h) {
        // Net onder de bovenrand (een platform dat omhoog komt, of een randje): niet opzij duwen, de stap hieronder zet je erop.
        if (p.y < s.y + .45 && p.vy >= -2) continue;
        if (p.vx > 0 || p.x < s.x + s.w / 2) p.x = s.x - hw; else p.x = s.x + s.w + hw;
        p.vx = 0;
      }
    }
    // Verticaal.
    const wasGround = p.ground;
    p.ground = false;
    p.on = null;
    p.onAt = null;
    const oy = p.y;
    p.y += p.vy * dt;
    for (const [orig, s] of rects) {
      if (p.x + hw <= s.x || p.x - hw >= s.x + s.w) continue;
      if (p.y > s.y && p.y - SIZE.h < s.y + s.h) {
        if (p.vy >= 0 && oy <= s.y + .45) {
          p.y = s.y;
          p.vy = 0;
          p.ground = true;
          p.on = orig;
          if (orig.mv) p.onAt = { x: s.x, y: s.y };
        } else if (p.vy < 0) {
          p.y = s.y + s.h + SIZE.h;
          p.vy = 0;
        }
      }
    }
    if (p.y - SIZE.h < -.3) { p.y = SIZE.h - .3; p.vy = Math.max(0, p.vy); }
    p.landed = p.ground && !wasGround;

    // Gevaar.
    if (p.y > LAVA + .4) return 'lava';
    const cy = p.y - SIZE.h / 2;
    for (const st of stages) {
      for (const s of st.spikes) if (p.x + hw * .7 > s.x && p.x - hw * .7 < s.x + s.w && p.y > s.y - .55 && p.y - SIZE.h < s.y) return 'stekels';
      for (const l of st.lasers) if (laserOn(l, t) && Math.abs(p.x - l.x) < hw * .8 + .12 && p.y > l.y0 && p.y - SIZE.h < l.y1) return 'laser';
      for (const b of st.bars) {
        const a = barAngle(b, t);
        if (segDist(p.x, cy, b.cx, b.cy, b.cx + Math.cos(a) * b.len, b.cy + Math.sin(a) * b.len) < .72) return 'vuur';
      }
    }
    return null;
  }

  return { H, LAVA, L, BASE_Y, SIZE, PHYS, TURBO_S, RESPAWN_S, MIN_STAGE_S, COLORS, THEMES, themeOf, rng, stage, at, laserOn, laserSoon, barAngle, near, spawnOf, step };
});
