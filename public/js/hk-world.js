// Haakridder: de baan met kristalankers, gedeeld door de server, de leerlingen en het bord.
// Zijaanzicht in meter; y gaat naar onder, onderaan wacht de afgrond. Elke etappe volgt uit een getal (seed) per spel,
// zodat iedereen dezelfde baan slingert en het bord de anderen op de juiste plek kan tekenen.
// Eén knop: ingedrukt = je plasmahaak grijpt het dichtste anker voor je en je zwaait; loslaten = je vliegt verder.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HkWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const H = 14;           // hoogte van de baan
  const ABYSS = 15.2;     // wie hieronder zakt, valt in de afgrond
  const L = 64;           // lengte van een etappe
  const BASE_Y = 10;      // hoogte van de vlagplatforms
  const R = .5;           // straal van de ridder (voor botsingen)
  const PHYS = {
    g: 24, maxV: 26, drag: .04,
    range: 9, goldRange: 12,          // zo ver reikt de haak
    push: 3.2, goldPush: 5.2,         // een zachte duw vooruit tijdens het zwaaien
    swing: 10, goldSwing: 12.5,       // zo snel zwaai je minstens als je haak vastklikt
    release: 1.05, goldRelease: 1.12, // een beetje extra vaart bij het loslaten
    hopVx: 6.5, hopVy: -10,
    regrab: .3,                       // zo lang kan je hetzelfde anker niet meteen terug grijpen
  };
  const REEL = 6;
  const GOLD_S = 10;
  const RESPAWN_S = .9;
  const MIN_STAGE_S = 3; // sneller kan een etappe niet (controle op de server)
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  // Elke drie etappes een andere wereld (andere kleuren voor de lucht en de afgrond).
  const THEMES = [
    { name: 'Zwevende burcht', sky: ['#0b0a2e', '#2a1c5e', '#6b3f8f'], abyss: '#7b4dff', glow: '#5ee7ff', stone: '#3c4166', edge: '#ffc94a' },
    { name: 'Smeltende sterren', sky: ['#14060c', '#3b0f24', '#8a2f3a'], abyss: '#ff6a2a', glow: '#ff8c42', stone: '#3f2f38', edge: '#ffc94a' },
    { name: 'Diepe sterrenzee', sky: ['#020617', '#0a1a45', '#164a7a'], abyss: '#2de2c8', glow: '#7aa2ff', stone: '#26364f', edge: '#ffc94a' },
  ];
  const themeOf = k => THEMES[Math.floor(Math.max(0, k) / 3) % THEMES.length];

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- Een etappe ----------
  // anchors: {id, x, y, mv?} (mv = {ax, ay, per, ph}: heen en weer), plats: {x, y, w} (vlagplatforms),
  // pads: {x, y, w} (stuiterkussens), lasers: {x, y0, y1, per?, on?, ph?} (per = knippert), cells: {id, x, y} (kristallen).
  const cache = new Map();
  function stage(seed, k) {
    const key = `${seed}:${k}`;
    let st = cache.get(key);
    if (st) return st;
    const r = rng(seed * 7919 + k * 104729 + 31);
    const x0 = k * L;
    const d = Math.min(1, k / 10); // moeilijker naarmate je verder komt
    st = { k, x0, x1: x0 + L, anchors: [], plats: [], pads: [], lasers: [], cells: [], theme: themeOf(k) };
    st.plats.push({ x: x0 - 5, y: BASE_Y, w: 9.5, flag: true });
    let ai = 0, ci = 0;
    const anchor = (x, y, mv) => { const a = { id: `${k}.${ai++}`, x, y }; if (mv) a.mv = mv; st.anchors.push(a); return a; };
    const cell = (x, y) => st.cells.push({ id: `${k}.${ci++}`, x, y });
    const gap = () => 6 + r() * 1.4 + d * 2.2; // afstand tussen twee ankers
    const hi = () => 2.6 + r() * 2.6;          // hoogte van een anker
    // Het eerste anker haal je vanop het platform.
    let last = anchor(x0 + 6.5, 4 + r());
    const end = x0 + L - 9;
    const used = new Set();
    while (last.x < end - 4) {
      let kinds = ['rij', 'rij', 'golf', 'kussen'];
      if (k >= 1) kinds.push('poort');
      if (k >= 2) kinds.push('bewegend', 'poort');
      if (k >= 3) kinds.push('knipper', 'bewegend');
      kinds = kinds.filter(x => !used.has(x) || r() < .45);
      const kind = kinds[Math.floor(r() * kinds.length)] || 'rij';
      used.add(kind);
      if (kind === 'rij' || kind === 'golf') {
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n && last.x < end; i++) {
          const x = last.x + gap();
          const y = kind === 'golf' ? (i % 2 ? 2.4 + r() : 5.4 + r()) : hi();
          cell((last.x + x) / 2, Math.max(last.y, y) + 3.4);
          last = anchor(x, y);
        }
      } else if (kind === 'bewegend') {
        const x = last.x + gap() + .5;
        const vert = r() < .5;
        const per = 3.4 - d * .8 + r() * .6;
        last = anchor(x, 3.6 + r() * 1.2, vert ? { ax: 0, ay: 1.6, per, ph: r() } : { ax: 2.2, ay: 0, per, ph: r() });
        cell(x, last.y + 5.5);
      } else if (kind === 'poort') {
        // Een laserpoort tussen twee ankers: laat los op het juiste moment en vlieg door het gat.
        const lx = last.x + 6.8 + r() * .6;
        // Een ruim gat (6 tot 7 meter), gecentreerd rond de hoogte waar je na het loslaten meestal vliegt
        // (4,5 m onder het vorige anker).
        const hole = 7 - d * .9;
        const gy = Math.max(1, last.y + 4.5 - hole / 2 + (r() - .5));
        st.lasers.push({ x: lx, y0: -6, y1: gy });
        st.lasers.push({ x: lx, y0: gy + hole, y1: H + 2 });
        cell(lx, gy + hole / 2);
        last = anchor(lx + 6.8 + r() * .6, 2.8 + r() * 1.5);
      } else if (kind === 'knipper') {
        // Een laser die aan en uit gaat, over de hele hoogte.
        const lx = last.x + 6.8 + r() * .6;
        st.lasers.push({ x: lx, y0: -6, y1: H + 2, per: 2.6 - d * .4, on: .4, ph: r() });
        last = anchor(lx + 6.8 + r() * .6, hi());
      } else if (kind === 'kussen') {
        // Geen anker in de buurt: val op het stuiterkussen en kaats omhoog naar het volgende anker.
        const px = last.x + 3.5 + r() * 1.5;
        const w = 4.6 - d * .8;
        st.pads.push({ x: px, y: 12.6, w });
        cell(px + w / 2, 9.4);
        last = anchor(px + w + 2.6 + r(), 3.6 + r());
      }
    }
    // Het laatste anker brengt je naar het platform met de volgende vlag.
    if (st.x1 - 6 - last.x > 4) last = anchor(Math.min(st.x1 - 7, last.x + gap()), 3.6 + r());
    if (cache.size > 60) cache.clear();
    cache.set(key, st);
    return st;
  }

  // Waar staat een anker op tijd t?
  function at(a, t) {
    if (!a.mv) return a;
    const s = Math.sin((t / a.mv.per + a.mv.ph) * Math.PI * 2);
    return { id: a.id, x: a.x + a.mv.ax * s, y: a.y + a.mv.ay * s, mv: a.mv };
  }
  const laserOn = (l, t) => !l.per || ((t / l.per + l.ph) % 1 + 1) % 1 < l.on;
  const laserSoon = (l, t) => { if (!l.per) return false; const f = ((t / l.per + l.ph) % 1 + 1) % 1; return f > .8; };

  // De etappes rond x (vorige, deze en volgende).
  function near(seed, x) {
    const k = Math.max(0, Math.floor(x / L));
    const out = [stage(seed, k), stage(seed, k + 1)];
    if (k > 0) out.unshift(stage(seed, k - 1));
    return out;
  }

  const spawnOf = k => ({ x: k * L + 1.2, y: BASE_Y - R });

  // Een plasmahaak kan niet door een laser.
  function blocked(stages, p, a, t) {
    for (const st of stages) for (const l of st.lasers) {
      if (!laserOn(l, t) || (l.x - p.x) * (l.x - a.x) > 0) continue;
      const y = p.y + (a.y - p.y) * (l.x - p.x) / ((a.x - p.x) || 1e-6);
      if (y > l.y0 && y < l.y1) return true;
    }
    return false;
  }

  // Welk anker grijpt de haak nu? Het dichtste binnen bereik dat niet achter je ligt.
  function target(seed, p, t, gold) {
    const range = gold ? PHYS.goldRange : PHYS.range;
    let best = null, bd = range;
    for (const st of near(seed, p.x)) {
      for (const a0 of st.anchors) {
        if (a0.x < p.x - .6 || (p.lastA === a0.id && p.regrab > 0)) continue;
        const a = at(a0, t);
        if (a.y > p.y - .4) continue;
        const dd = Math.hypot(a.x - p.x, a.y - p.y);
        if (dd < bd && !blocked(near(seed, p.x), p, a, t)) { bd = dd; best = a0; }
      }
    }
    return best;
  }

  // ---------- Een stap natuurkunde voor de eigen ridder ----------
  // p: {x, y, vx, vy, ground, hook (anker of null), len, rot, spin, lastA, regrab}; hold: knop ingedrukt; gold: gouden haak.
  // Geeft 'afgrond' of 'laser' terug als het misloopt, anders null. p.salto telt op als je een volle salto maakt.
  function step(seed, p, hold, dt, t, gold) {
    const P = PHYS;
    p.regrab = Math.max(0, (p.regrab || 0) - dt);
    p.grabbed = false;
    p.released = false;
    // Knop los: haak los.
    if (p.hook && !hold) {
      const f = gold ? P.goldRelease : P.release;
      p.vx *= f; p.vy *= f;
      p.lastA = p.hook.id;
      p.regrab = P.regrab;
      p.hook = null;
      p.released = true;
    }
    // Knop in: op het platform spring je eerst op, in de lucht grijpt de haak.
    if (hold && !p.hook) {
      if (p.ground) {
        p.vx = Math.max(p.vx, P.hopVx);
        p.vy = P.hopVy;
        p.ground = false;
      }
      const a = target(seed, p, t, gold);
      if (a) {
        const b = at(a, t);
        p.hook = a;
        const dx = p.x - b.x, dy = p.y - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        p.len = Math.max(2, dist);
        // De haak klikt vast: je vaart gaat helemaal in het zwaaien, en je zwaait altijd vooruit met een minimum aan vaart.
        let tx = -dy / dist, ty = dx / dist;
        if (tx < 0) { tx = -tx; ty = -ty; }
        const v = Math.max(Math.hypot(p.vx, p.vy), gold ? P.goldSwing : P.swing);
        p.vx = tx * v; p.vy = ty * v;
        p.grabbed = true;
      }
    }
    // Zwaartekracht en een klein beetje luchtweerstand.
    p.vy += P.g * dt;
    if (!p.ground) { p.vx *= 1 - P.drag * dt; }
    if (p.hook) {
      const b = at(p.hook, t);
      const dx = p.x - b.x, dy = p.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Zachte duw in de richting van het zwaaien (alleen vooruit), zo kom je altijd verder.
      const tx = -dy / dist, ty = dx / dist; // raaklijn
      const along = p.vx * tx + p.vy * ty;
      const dir = along >= 0 ? 1 : -1;
      const fwd = tx * dir;
      if (fwd > 0) { const push = (gold ? P.goldPush : P.push) * dt; p.vx += tx * dir * push; p.vy += ty * dir * push; }
    }
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > P.maxV) { p.vx *= P.maxV / sp; p.vy *= P.maxV / sp; }
    const ox = p.x, oy = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Het touw staat strak: je blijft op dezelfde afstand van het anker en je vaart blijft langs de cirkel.
    if (p.hook) {
      const b = at(p.hook, t);
      const dx = p.x - b.x, dy = p.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      p.x = b.x + nx * p.len;
      p.y = b.y + ny * p.len;
      const out = p.vx * nx + p.vy * ny;
      const before = Math.hypot(p.vx, p.vy);
      p.vx -= out * nx; p.vy -= out * ny;
      const after = Math.hypot(p.vx, p.vy) || 1;
      if (after > .01) { p.vx *= before / after; p.vy *= before / after; }
      // De haak trekt je in tot op 6 meter (zo zwaai je nooit te wijd), daarna nog heel zachtjes.
      if (p.len > REEL) p.len = Math.max(REEL, p.len - dt * 9);
      else if (p.len > 5) p.len -= dt * .8;
      p.rot = Math.atan2(b.y - p.y, b.x - p.x) + Math.PI / 2;
      // Hoe snel je zwaait, zo snel draai je straks in de lucht.
      const tx = -(p.y - b.y) / (dist || 1), ty = (p.x - b.x) / (dist || 1);
      p.spin = (p.vx * tx + p.vy * ty) / Math.max(2, p.len) * 1.7;
    } else if (!p.ground) {
      p.rot = (p.rot || 0) + (p.spin || 0) * dt;
      p.turned = (p.turned || 0) + Math.abs((p.spin || 0) * dt);
      if (p.turned >= Math.PI * 2) { p.turned -= Math.PI * 2; p.salto = (p.salto || 0) + 1; }
    }
    // Landen op een vlagplatform of kaatsen op een kussen.
    p.ground = false;
    const stages = near(seed, p.x);
    for (const st of stages) {
      for (const s of st.plats) {
        if (p.x > s.x - .2 && p.x < s.x + s.w + .2 && p.vy >= 0 && oy + R <= s.y + .05 && p.y + R >= s.y) {
          p.y = s.y - R;
          p.vy = 0;
          p.ground = true;
          p.hook = null;
          p.spin = 0;
          p.rot = 0;
          p.turned = 0;
        }
      }
      for (const s of st.pads) {
        if (p.x > s.x - .3 && p.x < s.x + s.w + .3 && p.vy > 0 && oy + R <= s.y + .1 && p.y + R >= s.y) {
          p.y = s.y - R;
          p.vy = -Math.max(15.5, Math.abs(p.vy) * .95);
          p.vx = Math.max(p.vx, 5);
          p.spin = Math.max(p.spin || 0, 5);
          p.bounced = true;
        }
      }
    }
    if (p.ground) {
      const s = Math.sign(p.vx);
      p.vx -= s * Math.min(Math.abs(p.vx), 18 * dt);
    }
    if (p.y < -5) { p.y = -5; p.vy = Math.max(0, p.vy); }
    // Gevaar.
    if (p.y > ABYSS) return 'afgrond';
    for (const st of stages) {
      for (const l of st.lasers) {
        if (!laserOn(l, t)) continue;
        // Kruiste je de laser tijdens deze stap?
        const crossed = (ox - l.x) * (p.x - l.x) <= 0 || Math.abs(p.x - l.x) < R * .7;
        if (crossed && p.y + R * .35 > l.y0 && p.y - R * .35 < l.y1) return 'laser';
      }
    }
    return null;
  }

  return { H, ABYSS, L, BASE_Y, R, PHYS, GOLD_S, RESPAWN_S, MIN_STAGE_S, COLORS, THEMES, themeOf, rng, stage, at, laserOn, laserSoon, near, spawnOf, target, step };
});
