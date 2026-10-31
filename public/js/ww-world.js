// Wankelwagen: de baan en de natuurkunde van de kar, gedeeld door de server, de leerlingen en het bord.
// Zijaanzicht in meter; y gaat naar onder. De kar is twee wielen met een vaste as ertussen en een ridder erop:
// raakt het hoofd van de ridder iets, of val je in een put, dan begin je opnieuw bij de laatste vlag.
// Elke etappe (van vlag tot vlag) heeft een andere kar: reuzenwielen, ijswielen, vierkante wielen, een motorros...
// De baan volgt uit een getal (seed) per spel, zodat iedereen dezelfde baan rijdt.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WwWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const L = 90;          // lengte van een etappe
  const BASE = 10;       // hoogte van de grond aan elke vlag
  const PIT = 13.8;      // lava (of de afgrond) in een put
  const VOID = 16.5;     // wie hieronder zakt, is gevallen
  const BOTTOM = 19;     // onderkant van de grond (tekenen)
  const G = 22;
  const TURBO_S = 6;
  const RESPAWN_S = 1.1;
  const MIN_STAGE_S = 3;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // ---------- De karren: elke vlag een andere ----------
  // r: straal wiel, D: afstand tussen de wielen, head: hoogte van het hoofd boven de as, acc/vmax/brake: motor,
  // grip: hoe goed de wielen pakken (ijs = weinig), roll: rolweerstand, bounce: veren, g: zwaartekracht,
  // spin: draaien in de lucht, lift: wheelie bij gas geven, square: vierkante wielen.
  const VEHICLES = [
    { id: 'kar', name: 'Ridderkar', icon: '🛞', tip: 'Je eerste kar: rustig gas geven en recht landen.', r: .52, D: 2.1, head: 1.45, acc: 24, vmax: 12.5, brake: 30, grip: 1, roll: .12, bounce: .08, g: 1, spin: 10, lift: 1.6, wood: true },
    { id: 'reus', name: 'Reuzenwielen', icon: '🚙', tip: 'Enorme wielen: over alles heen, maar hij kantelt snel.', r: .95, D: 2.5, head: 1.55, acc: 24, vmax: 12.5, brake: 30, grip: 1.05, roll: .1, bounce: .2, g: 1, spin: 12, lift: 2.2 },
    { id: 'ijs', name: 'IJswielen', icon: '🧊', tip: 'Wielen van ijs: je glijdt! Geef zacht gas en rem op tijd.', r: .55, D: 2.1, head: 1.45, acc: 24, vmax: 12.5, brake: 30, grip: .42, roll: .015, bounce: .05, g: 1, spin: 10, lift: .6, ice: true },
    { id: 'ros', name: 'Motorros', icon: '🏍️', tip: 'Snel en wendbaar, maar hij gaat makkelijk op zijn achterwiel.', r: .5, D: 1.65, head: 1.6, acc: 30, vmax: 14.5, brake: 34, grip: 1.1, roll: .1, bounce: .1, g: 1, spin: 12, lift: 3.2 },
    { id: 'vierkant', name: 'Vierkante wielen', icon: '🟧', tip: 'Hobbel de bobbel! Vierkante wielen rollen niet zo goed.', r: .55, D: 2.2, head: 1.45, acc: 32, vmax: 11.5, brake: 30, grip: 1.1, roll: .1, bounce: 0, g: 1, spin: 10, lift: 1.2, square: true },
    { id: 'veer', name: 'Springveren', icon: '🌀', tip: 'Wielen op veren: alles stuitert. Hou de kar recht!', r: .55, D: 2.1, head: 1.45, acc: 24, vmax: 12.5, brake: 30, grip: 1, roll: .1, bounce: .62, g: 1, spin: 10, lift: 1.4 },
    { id: 'maan', name: 'Maanwagen', icon: '🌙', tip: 'Bijna geen zwaartekracht: je zweeft ver. Pas op voor salto’s!', r: .55, D: 2.2, head: 1.45, acc: 18, vmax: 11, brake: 22, grip: .9, roll: .08, bounce: .12, g: .45, spin: 7, lift: 1.2 },
    { id: 'tank', name: 'Burchttank', icon: '🛡️', tip: 'Zwaar en traag, maar hij grijpt overal en valt niet snel om.', r: .5, D: 2.7, head: 1.15, acc: 20, vmax: 11, brake: 40, grip: 1.5, roll: .2, bounce: 0, g: 1.15, spin: 7, lift: .5, tracks: true },
    { id: 'koets', name: 'Lange koets', icon: '🐉', tip: 'Een heel lange koets: goed voor bruggen, lastig op bulten.', r: .55, D: 3.6, head: 1.4, acc: 24, vmax: 12.5, brake: 30, grip: 1, roll: .1, bounce: .08, g: 1, spin: 6.5, lift: .8, wood: true },
    { id: 'raket', name: 'Raketkar', icon: '🚀', tip: 'Supersnel! Maar remmen gaat traag, dus kijk vooruit.', r: .5, D: 2.2, head: 1.35, acc: 34, vmax: 16.5, brake: 14, grip: 1, roll: .06, bounce: .08, g: 1, spin: 11, lift: 1.4, rocket: true },
  ];
  const vehicleOf = k => VEHICLES[Math.max(0, k) % VEHICLES.length];
  // Hoe ver kan deze kar springen, vergeleken met de gewone kar? Daar passen we de putten op aan.
  const reach = v => Math.max(.62, Math.min(1.45, (v.vmax * v.vmax / (G * v.g)) / (12.5 * 12.5 / G)));

  // Elke drie etappes een andere wereld.
  const THEMES = [
    { name: 'Burchtwallen', sky: ['#160f3a', '#4b2d78', '#f08a5d'], earth: '#3a2a3f', stone: '#5b5470', top: '#ffc94a', glow: '#5ee7ff', lava: '#ff6a2a', lavaHi: '#ffd36b', far: '#2a1f55', mid: '#3a2a66', wood: '#8a5a32' },
    { name: 'Kristalgrot', sky: ['#05030f', '#1d0f3d', '#3d1a6a'], earth: '#231a3a', stone: '#3d3466', top: '#c77dff', glow: '#5ee7ff', lava: '#7b4dff', lavaHi: '#5ee7ff', far: '#160c30', mid: '#251648', wood: '#5a4a7a' },
    { name: 'Sterrenbrug', sky: ['#02030c', '#0a1440', '#1b2c6a'], earth: '#161d3d', stone: '#2c3a66', top: '#5ee7ff', glow: '#ff6bd6', lava: '#2de2c8', lavaHi: '#c8fff6', far: '#0b1640', mid: '#13245a', wood: '#46557f' },
  ];
  const themeOf = k => THEMES[Math.floor(Math.max(0, k) / 3) % THEMES.length];

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- Een etappe ----------
  // grounds: polylijnen [[x,y],...] (de grond ligt eronder), segs: [ax, ay, bx, by] om tegen te botsen,
  // bridges: wiebelbruggen, wips: wippen, draw: ophaalbruggen, hammers: zwaaiende hamers, spikes: stekels {x, y, w},
  // pits: putten met lava {x0, x1}, coins: munten {id, x, y}, deco: fakkels en banieren.
  const cache = new Map();
  function stage(seed, k) {
    const key = `${seed}:${k}`;
    let st = cache.get(key);
    if (st) return st;
    const r = rng(seed * 7919 + k * 104729 + 31);
    const veh = vehicleOf(k);
    const R = reach(veh);
    const x0 = k * L, x1 = x0 + L;
    const d = Math.min(1, k / 9);
    st = { k, x0, x1, veh, theme: themeOf(k), grounds: [], segs: [], bridges: [], wips: [], draw: [], hammers: [], spikes: [], pits: [], coins: [], deco: [], parts: [] };
    let pts = [];
    let cur = BASE;
    let cx;
    let ci = 0;
    const coin = (x, y) => st.coins.push({ id: `${k}.${ci++}`, x, y });
    const pt = (x, y) => { pts.push([x, y]); cx = x; cur = y; };
    const gapStart = () => { pts.push([cx, VOID + 1.5]); st.grounds.push(pts); pts = []; };
    const gapEnd = (x, y) => { pts = [[x, VOID + 1.5]]; pt(x, y); };
    if (k === 0) { pts.push([x0 - 14, BASE - 6]); pts.push([x0 - 14, BASE]); }
    else pts.push([x0 - .5, BASE]);
    pt(x0 + 5, BASE);
    st.deco.push({ kind: 'fakkel', x: x0 + 3.5, y: BASE });
    // Een schans: eerst een bocht omhoog, dan recht. Zo vlieg je er recht af zonder vanzelf te tollen.
    const ramp = (len, rise) => {
      const xs = cx, ys = cur, k0 = .4;
      const slope = rise / (len * (1 - k0 / 2));
      for (let i = 1; i <= 8; i++) {
        const x = len * i / 8;
        const y = x < len * k0 ? slope * x * x / (2 * len * k0) : slope * (len * k0 / 2 + (x - len * k0));
        pt(xs + x, ys - y);
      }
    };
    const end = x1 - 15;
    const used = [];
    let id = 0;
    while (cx < end - 6) {
      let kinds = ['heuvels', 'schans', 'brug', 'bobbels', 'wip', 'trap', 'hamer', 'stekels', 'ophaal'];
      if (k < 1) kinds = ['heuvels', 'schans', 'brug', 'bobbels', 'wip'];
      if (veh.ice) kinds = kinds.filter(x => x !== 'trap');
      if (veh.square) kinds = kinds.filter(x => x !== 'stekels');
      // Niet twee keer na elkaar hetzelfde, en elk ding liefst één keer per etappe.
      kinds = kinds.filter(x => x !== used[used.length - 1] && (!used.includes(x) || r() < .25));
      const kind = kinds[Math.floor(r() * kinds.length)] || 'heuvels';
      const room = end - cx;
      used.push(kind);
      const at0 = cx;
      if (kind === 'heuvels' && room > 14) {
        const len = 12 + r() * 8;
        const n = 1 + (r() < .5 ? 1 : 0);
        const up = cur > BASE - 1.5 ? 1 : -1; // bulten omhoog of kuilen omlaag, zodat we in de buurt van BASE blijven
        const A = Math.min(1.2 + r() * 1.6 + d, .42 * len / (Math.PI * n));
        const xs = cx, ys = cur;
        for (let i = 1; i <= Math.round(len); i++) {
          const u = i / Math.round(len);
          pt(xs + len * u, ys - up * A * (1 - Math.cos(2 * Math.PI * n * u)) / 2);
        }
        for (let i = 0; i < n; i++) coin(xs + len * (i + .5) / n, ys - up * A - 1.3);
        pt(cx + 2, cur);
      } else if (kind === 'bobbels' && room > 12) {
        const len = 9 + r() * 4;
        const xs = cx, ys = cur;
        const hump = (.3 + d * .25) * (veh.square ? .6 : 1);
        const steps = Math.round(len / .5);
        for (let i = 1; i <= steps; i++) {
          const u = i / steps * len;
          pt(xs + u, ys - Math.abs(Math.sin(u * Math.PI / 1.3)) * hump);
        }
        coin(xs + len * .3, ys - 1.4); coin(xs + len * .7, ys - 1.4);
        pt(cx + 2, ys);
      } else if (kind === 'schans' && room > 20) {
        // Een schans omhoog, een put met lava, en een landing die een beetje afloopt.
        pt(cx + 4 + r() * 2, cur);
        const ys = cur;
        ramp(5.5, 1.5 + r() * .6);
        const gap = (2.6 + r() * 1.4 + d * 1.6) * R;
        const lx = cx + gap;
        const ly = Math.min(BASE + 1, ys + .3 + r() * .6);
        const top = cur;
        gapStart();
        st.pits.push({ x0: lx - gap, x1: lx });
        for (let i = 1; i <= 3; i++) coin(lx - gap + gap * i / 4, top - 1.6 - Math.sin(Math.PI * i / 4) * 1.4);
        gapEnd(lx, ly - .6);
        pt(lx + 3, ly);
        pt(cx + 3, ly);
      } else if (kind === 'brug' && room > 18) {
        // Een wiebelbrug van planken over een put: hij zakt door waar de kar rijdt.
        pt(cx + 2, cur);
        st.deco.push({ kind: 'paal', x: cx - .3, y: cur });
        const len = 9 + r() * 5 + d * 2;
        const b = { id: id++, ax: cx, ay: cur, bx: cx + len, by: cur, n: Math.round(len / .9), sag: .35 + r() * .2, load: .9 + d * .5, sway: .12 + d * .1 };
        st.bridges.push(b);
        gapStart();
        st.pits.push({ x0: b.ax, x1: b.bx });
        for (let i = 1; i <= 3; i++) coin(b.ax + len * i / 4, b.ay - 1.3);
        gapEnd(b.bx, b.by);
        st.deco.push({ kind: 'paal', x: b.bx + .3, y: b.by });
        pt(cx + 3, cur);
      } else if (kind === 'wip' && room > 18) {
        // Een wip over een put: rij omhoog, over het midden kantelt hij en rij je er aan de andere kant af.
        pt(cx + 2, cur);
        const len = 9 + r() * 2;
        const A = .22 + r() * .06;
        const half = len / 2;
        const w = { id: id++, px: cx + half * Math.cos(A), py: cur - half * Math.sin(A), half, A };
        st.wips.push(w);
        gapStart();
        st.pits.push({ x0: w.px - half * Math.cos(A), x1: w.px + half * Math.cos(A) });
        coin(w.px, w.py - 1.6);
        gapEnd(w.px + half * Math.cos(A), cur);
        pt(cx + 3, cur);
      } else if (kind === 'trap' && room > 14) {
        // Een trap omhoog en een helling weer naar beneden.
        pt(cx + 2, cur);
        const n = 3 + Math.floor(r() * 2);
        const sh = .26 + d * .1 + (veh.r > .8 ? .2 : 0);
        for (let i = 0; i < n; i++) {
          pt(cx + .12, cur - sh);
          pt(cx + 1.9 + r() * .5, cur);
          if (i === n - 1) coin(cx - 1, cur - 1.4);
        }
        const drop = BASE + .5 - cur;
        const dl = Math.max(4, Math.abs(drop) / .32);
        const xs = cx, ys = cur;
        for (let i = 1; i <= 6; i++) { const u = i / 6; pt(xs + dl * u, ys + drop * (1 - Math.cos(Math.PI * u)) / 2); }
      } else if (kind === 'hamer' && room > 12) {
        // Een zwaaiende hamer boven de weg: wacht tot hij weg is en rij er snel onderdoor.
        pt(cx + (veh.brake < 20 ? 7 : 4), cur);
        const per = (3.2 - d * .5) * (1 + Math.max(0, veh.D - 2.1) * .3) * (veh.square ? 1.6 : 1);
        const hx = cx + 2.5;
        const len = 4.6;
        const hy = cur - veh.r - veh.head * .6 - len;
        st.hammers.push({ x: hx, y: hy, len, R: .62, per, amp: 1.4, ph: r() });
        st.deco.push({ kind: 'galg', x: hx, y: cur, top: hy });
        coin(hx, cur - 1);
        pt(cx + 6, cur);
      } else if (kind === 'stekels' && room > 15) {
        // Een schansje en daarachter stekels op de grond: spring erover.
        pt(cx + (veh.square ? 9 : 6), cur);
        const ys = cur;
        ramp(4, 1);
        pt(cx + .15, ys);
        const w = (1.8 + d * 1.2 + r() * .6) * Math.min(1.15, R) * (veh.square ? .8 : 1);
        st.spikes.push({ x: cx + .3, y: ys, w });
        coin(cx + w / 2 + .3, ys - 2.6);
        pt(cx + w + 4, ys);
      } else if (kind === 'ophaal' && room > 16) {
        // Een ophaalbrug over de burchtgracht: hij gaat op en neer. Rij erover als hij plat ligt.
        pt(cx + 3, cur);
        const len = 5.6 + d;
        const o = { id: id++, x: cx, y: cur, len, per: 5.6 - d * .6, ph: r() };
        st.draw.push(o);
        gapStart();
        st.pits.push({ x0: o.x, x1: o.x + len });
        st.deco.push({ kind: 'poort', x: o.x - .6, y: o.y });
        coin(o.x + len / 2, o.y - 1.3);
        gapEnd(o.x + len, cur);
        pt(cx + 3, cur);
      } else {
        pt(cx + 1, cur);
        used.pop();
      }
      if (cx !== at0 + 1) st.parts.push([kind, Math.round(at0 - x0)]);
    }
    // Terug naar de hoogte van de vlag, en een vlak stuk om te stoppen.
    const drop = BASE - cur;
    if (Math.abs(drop) > .05) {
      const dl = Math.max(5, Math.abs(drop) / .3);
      const xs = cx, ys = cur;
      for (let i = 1; i <= 6; i++) { const u = i / 6; pt(xs + dl * u, ys + drop * (1 - Math.cos(Math.PI * u)) / 2); }
    }
    if (cx < x1 - 2) { pt(x1 - 3, BASE); st.deco.push({ kind: 'fakkel', x: x1 - 3.5, y: BASE }); }
    pt(x1 + .5, BASE);
    st.grounds.push(pts);
    for (const g of st.grounds) for (let i = 0; i < g.length - 1; i++) {
      const [ax, ay] = g[i], [bx, by] = g[i + 1];
      if (ax === bx && ay === by) continue;
      st.segs.push([ax, ay, bx, by, Math.min(ax, bx), Math.max(ax, bx)]);
    }
    if (cache.size > 60) cache.clear();
    cache.set(key, st);
    return st;
  }

  // ---------- Wat beweegt ----------
  // Wiebelbrug: de planken als punten, met een doorzakking waar de kar staat (lx = x van de kar, of null).
  function bridgePts(b, t, lx) {
    const out = [];
    const len = b.bx - b.ax;
    const uc = lx == null ? -1 : (lx - b.ax) / len;
    for (let i = 0; i <= b.n; i++) {
      const u = i / b.n;
      const env = Math.sin(Math.PI * u);
      let y = b.ay + (b.by - b.ay) * u + b.sag * env + Math.sin(t * 2.3 + u * 5 + b.id) * b.sway * env;
      if (uc > -.1 && uc < 1.1) y += b.load * Math.sin(Math.PI * Math.max(0, Math.min(1, uc))) * Math.exp(-(((u - uc) * 3.2) ** 2)) * env * 1.4;
      out.push([b.ax + len * u, y]);
    }
    return out;
  }
  // Wip: twee eindpunten bij hoek a (a > 0: rechts omlaag).
  function wipEnds(w, a) {
    const c = Math.cos(a) * w.half, s = Math.sin(a) * w.half;
    return [w.px - c, w.py - s, w.px + c, w.py + s];
  }
  // De hoek van een wip volgt de kar: voor het midden zakt de kant waar je oprijdt, erover kantelt hij.
  function wipUpdate(w, a, x, dt) {
    if (a == null) a = -w.A;
    const lo = w.px - w.half, hi = w.px + w.half;
    if (x != null && x > lo - .5 && x < hi + .5) {
      const target = x > w.px ? w.A : -w.A;
      const step = 1.7 * dt;
      a += Math.max(-step, Math.min(step, target - a));
    }
    return a;
  }
  // Ophaalbrug: 0 = plat, tot 1.25 rad omhoog. Ligt meer dan de helft van de tijd plat.
  function drawAngle(o, t) {
    const f = ((t / o.per + o.ph) % 1 + 1) % 1;
    const up = 1.25;
    if (f < .5) return 0;
    if (f < .62) return up * (f - .5) / .12;
    if (f < .82) return up;
    return up * (1 - (f - .82) / .18);
  }
  function drawEnds(o, t) {
    const a = drawAngle(o, t);
    return [o.x, o.y, o.x + Math.cos(a) * o.len, o.y - Math.sin(a) * o.len];
  }
  const hammerAngle = (h, t) => h.amp * Math.sin((t / h.per + h.ph) * Math.PI * 2);
  function hammerHead(h, t) {
    const a = hammerAngle(h, t);
    return [h.x + Math.sin(a) * h.len, h.y + Math.cos(a) * h.len];
  }

  // De etappes rond x.
  function near(seed, x) {
    const k = Math.max(0, Math.floor(x / L));
    const out = [stage(seed, k), stage(seed, k + 1)];
    if (k > 0) out.unshift(stage(seed, k - 1));
    return out;
  }

  // ---------- De kar ----------
  // p: { b, f (wielen {x, y, vx, vy}), rb, rf (draaiing wielen), veh, wip: {} , cb, cf (contact) }
  function spawn(k) {
    const veh = vehicleOf(k);
    const x = k * L + 1.4 + veh.D / 2;
    const y = BASE - veh.r - .02;
    return {
      b: { x: x - veh.D / 2, y, vx: 0, vy: 0 }, f: { x: x + veh.D / 2, y, vx: 0, vy: 0 }, rb: 0, rf: 0, veh, k, wip: {},
      cb: false, cf: false, air: 0, upside: 0, landed: false, speed: 0,
    };
  }
  // Midden, hoek (0 = recht, > 0 = neus omhoog) en de richting 'omhoog' van de kar.
  function pose(p) {
    const cx = (p.b.x + p.f.x) / 2, cy = (p.b.y + p.f.y) / 2;
    const ux = (p.f.x - p.b.x) / p.veh.D, uy = (p.f.y - p.b.y) / p.veh.D;
    return { x: cx, y: cy, a: Math.atan2(-uy, ux), ux, uy, nx: uy, ny: -ux };
  }

  function closest(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return [ax + dx * k, ay + dy * k];
  }
  // Straal van een vierkant wiel in de richting (dx, dy), gezien de draaiing rot.
  function squareR(r, rot, dx, dy) {
    const a = Math.atan2(dy, dx) - rot;
    return r * (.9 + .55 * (1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) - 1));
  }

  // Een stuk natuurkunde voor de eigen kar. input: { gas, rem }. Geeft 'kop', 'put', 'stekels' of 'hamer' terug, anders null.
  function step(seed, p, input, dt, t, turbo) {
    const V = p.veh;
    const n = Math.max(1, Math.ceil(dt / (1 / 180)));
    const h = dt / n;
    const c0 = (p.b.x + p.f.x) / 2;
    const stages = near(seed, c0);
    const segs = [];
    for (const st of stages) for (const s of st.segs) if (s[5] > c0 - 7 && s[4] < c0 + 7) segs.push(s);
    const g = G * V.g;
    const vmax = V.vmax * (turbo ? 1.3 : 1);
    const acc = V.acc * (turbo ? 1.35 : 1);
    const gas = input.gas ? 1 : 0, rem = input.rem ? 1 : 0;
    p.landed = false;
    for (let i = 0; i < n; i++) {
      const tt = t - dt + h * (i + 1);
      const P = pose(p);
      // Wat beweegt, op dit moment.
      const dyn = [];
      for (const st of stages) {
        for (const b of st.bridges) {
          if (b.bx < P.x - 8 || b.ax > P.x + 8) continue;
          const bp = bridgePts(b, tt, P.x);
          for (let j = 0; j < bp.length - 1; j++) dyn.push([bp[j][0], bp[j][1], bp[j + 1][0], bp[j + 1][1]]);
        }
        for (const w of st.wips) {
          if (Math.abs(w.px - P.x) > w.half + 8) continue;
          p.wip[w.id + ':' + st.k] = wipUpdate(w, p.wip[w.id + ':' + st.k], (p.cb || p.cf) ? P.x : null, h);
          dyn.push(wipEnds(w, p.wip[w.id + ':' + st.k]));
        }
        for (const o of st.draw) if (Math.abs(o.x - P.x) < o.len + 8) dyn.push(drawEnds(o, tt));
      }
      const onGround = p.cb || p.cf;
      // Motor en remmen, langs de grond onder elk wiel.
      for (const [w, cn, nx, ny] of [[p.b, p.cb, p.nbx, p.nby], [p.f, p.cf, p.nfx, p.nfy]]) {
        w.vy += g * h;
        if (!cn) continue;
        const tx = -ny, ty = nx; // vooruit langs de grond
        const vt = w.vx * tx + w.vy * ty;
        let a = 0;
        if (gas && vt < vmax) a = acc * V.grip;
        else if (rem) a = vt > .4 ? -V.brake * Math.min(1, V.grip * 1.2) : (vt > -4 ? -acc * .55 * V.grip : 0);
        a -= vt * V.roll;
        w.vx += tx * a * h;
        w.vy += ty * a * h;
      }
      // Kantelen: in de lucht met gas achterover, met remmen voorover. Op de grond met gas een klein beetje wheelie.
      // De wheelie op de grond stopt bij een schuine kar, zodat je niet vanzelf achterover kiepert.
      const spin = onGround ? (gas && P.a < .45 ? V.lift : rem && P.a > -.45 ? -V.lift * .5 : 0) : (gas - rem) * V.spin;
      if (spin) {
        const rx = (p.f.x - p.b.x) / 2, ry = (p.f.y - p.b.y) / 2;
        const k = spin * h;
        // v += ω × r (neus omhoog bij k > 0)
        p.f.vx += ry * k; p.f.vy += -rx * k;
        p.b.vx -= ry * k; p.b.vy -= -rx * k;
      }
      // In de lucht niet eindeloos tollen.
      if (!onGround) {
        const rx = p.f.x - p.b.x, ry = p.f.y - p.b.y;
        const om = (rx * (p.f.vy - p.b.vy) - ry * (p.f.vx - p.b.vx)) / (V.D * V.D);
        const lim = 5.5;
        if (Math.abs(om) > lim) {
          const k = (om - Math.sign(om) * lim) * .5;
          p.f.vx += ry * k; p.f.vy -= rx * k; p.b.vx -= ry * k; p.b.vy += rx * k;
        }
      }
      for (const w of [p.b, p.f]) { w.x += w.vx * h; w.y += w.vy * h; }
      // De as tussen de wielen blijft even lang.
      {
        const dx = p.f.x - p.b.x, dy = p.f.y - p.b.y;
        const len = Math.hypot(dx, dy) || 1;
        const ex = dx / len, ey = dy / len;
        const corr = (len - V.D) / 2;
        p.b.x += ex * corr; p.b.y += ey * corr; p.f.x -= ex * corr; p.f.y -= ey * corr;
        const rv = (p.f.vx - p.b.vx) * ex + (p.f.vy - p.b.vy) * ey;
        p.b.vx += ex * rv / 2; p.b.vy += ey * rv / 2; p.f.vx -= ex * rv / 2; p.f.vy -= ey * rv / 2;
      }
      // Botsen met de grond.
      const was = p.cb || p.cf;
      for (const which of ['b', 'f']) {
        const w = p[which];
        let contact = false, nx = 0, ny = -1;
        for (let pass = 0; pass < 2; pass++) {
          for (const list of [segs, dyn]) {
            for (const s of list) {
              const lo = s[0] < s[2] ? s[0] : s[2], hi = s[0] < s[2] ? s[2] : s[0];
              if (w.x < lo - 1.2 || w.x > hi + 1.2) continue;
              const [qx, qy] = closest(w.x, w.y, s[0], s[1], s[2], s[3]);
              let dx = w.x - qx, dy = w.y - qy;
              const dist = Math.hypot(dx, dy);
              if (dist > V.r * 1.4 || dist < 1e-6) continue;
              dx /= dist; dy /= dist;
              const rr = V.square ? squareR(V.r, which === 'b' ? p.rb : p.rf, -dx, -dy) : V.r;
              if (dist >= rr) continue;
              w.x = qx + dx * rr;
              w.y = qy + dy * rr;
              const vn = w.vx * dx + w.vy * dy;
              if (vn < 0) {
                const bo = vn < -3 ? V.bounce : 0;
                w.vx -= dx * vn * (1 + bo);
                w.vy -= dy * vn * (1 + bo);
              }
              contact = true;
              nx = dx; ny = dy;
            }
          }
        }
        if (which === 'b') { p.cb = contact; p.nbx = nx; p.nby = ny; } else { p.cf = contact; p.nfx = nx; p.nfy = ny; }
        const vt = w.vx * -ny + w.vy * nx;
        const rr = V.square ? V.r * 1.05 : V.r;
        if (which === 'b') p.rb += (contact ? vt : (gas && !V.square ? vmax * .6 : 0)) / rr * h; else p.rf += (contact ? vt : (gas && !V.square ? vmax * .6 : 0)) / rr * h;
      }
      if (!was && (p.cb || p.cf) && p.air > .25) p.landed = true;
      p.air = p.cb || p.cf ? 0 : p.air + h;

      // Gevaar: het hoofd van de ridder, de putten, de stekels en de hamers.
      const Q = pose(p);
      const hx = Q.x + Q.nx * V.head, hy = Q.y + Q.ny * V.head;
      const mx = Q.x + Q.nx * V.head * .55, my = Q.y + Q.ny * V.head * .55;
      for (const list of [segs, dyn]) {
        for (const s of list) {
          const lo = Math.min(s[0], s[2]), hi = Math.max(s[0], s[2]);
          if (hx < lo - 1 || hx > hi + 1) continue;
          let [qx, qy] = closest(hx, hy, s[0], s[1], s[2], s[3]);
          if (Math.hypot(hx - qx, hy - qy) < .34) return 'kop';
          [qx, qy] = closest(mx, my, s[0], s[1], s[2], s[3]);
          if (Math.hypot(mx - qx, my - qy) < .3) return 'kop';
        }
      }
      if (p.b.y > VOID || p.f.y > VOID) return 'put';
      for (const st of stages) {
        for (const s of st.spikes) {
          for (const w of [p.b, p.f]) if (w.x > s.x - V.r * .6 && w.x < s.x + s.w + V.r * .6 && w.y + V.r > s.y - .5) return 'stekels';
          if (hx > s.x && hx < s.x + s.w && hy > s.y - .6) return 'stekels';
        }
        for (const hm of st.hammers) {
          if (Math.abs(hm.x - Q.x) > 7) continue;
          const [ex, ey] = hammerHead(hm, tt);
          for (const [px, py, pr] of [[hx, hy, .3], [mx, my, .5], [p.b.x, p.b.y, V.r], [p.f.x, p.f.y, V.r], [Q.x, Q.y, .4]]) {
            if (Math.hypot(px - ex, py - ey) < hm.R + pr) return 'hamer';
          }
        }
      }
    }
    p.speed = ((p.b.vx + p.f.vx) / 2);
    return null;
  }

  return {
    L, BASE, PIT, VOID, BOTTOM, G, TURBO_S, RESPAWN_S, MIN_STAGE_S, COLORS, VEHICLES, THEMES, vehicleOf, themeOf, rng, stage, near,
    bridgePts, wipEnds, wipUpdate, drawAngle, drawEnds, hammerAngle, hammerHead, spawn, pose, step,
  };
});
