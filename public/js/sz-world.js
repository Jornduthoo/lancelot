// Splijtzwaard: de baan, gedeeld door de server, de leerlingen en het bord.
// Zijaanzicht in meter; y gaat naar onder, onderaan ligt de lava. Het zwaard is een lijn: de punt (kling) vooraan,
// het heft achteraan. Tik = een salto naar voren. De kling snijdt alles wat ze raakt (kristallen, tonnen, pompoenen,
// robotridders) en blijft steken in hout als de punt erin wijst. Het heft (of de platte kant) botst terug, staal ook.
// De baan bestaat uit etappes met aan het begin een runenpaal; elke etappe volgt uit een getal (seed) per spel.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SzWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const H = 14;           // hoogte van de baan
  const LAVA = 13.2;      // wie hieronder zakt, valt in de lava
  const L = 44;           // lengte van een etappe
  const BASE_Y = 9.6;     // bovenkant van de runenpaal-planken
  const TIP = 1.15;        // van het midden tot de punt
  const GUARD = .14;      // waar de kling begint (de kruisplaat)
  const POMMEL = .72;     // van het midden tot de knop van het heft
  const DEPTH = .32;      // zo diep zit de punt in het hout
  const PHYS = { g: 30, jump: 11, fwd: 5.2, spin: 8.8, drag: .15, maxVy: 18, bounce: .35, gold: 1.25, rust: .72 };
  const GOLD_S = 7;
  const RESPAWN_S = .9;
  const MIN_STAGE_S = 3.5;  // sneller kan een etappe niet (controle op de server)
  const STICK_COS = .3;    // hoe recht de punt in het hout moet wijzen (cos van de hoek)
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  const POINTS = { kristal: 10, ton: 10, pompoen: 15, robot: 20, kist: 40, vast: 5 };
  // De doelschijf op elke runenpaal: hoe dichter je punt bij het midden steekt, hoe groter de vermenigvuldiger
  // voor alles wat je die etappe verdiende.
  const RINGS = [[.4, 10], [1, 5], [1.8, 3], [2.8, 2]];
  const ringOf = dx => { for (const [r, m] of RINGS) if (Math.abs(dx) < r) return m; return 1; };
  const targetX = k => k * L + 1;
  // Je zwaard groeit mee met je punten.
  const TIERS = [
    { name: 'IJzeren zwaard', min: 0, blade: ['#e9fbff', '#7fd8f5', '#b9efff', '#2b6c9a'], glow: '#5ee7ff' },
    { name: 'Kristalzwaard', min: 300, blade: ['#f6e6ff', '#b46bff', '#dcb6ff', '#4b1d9e'], glow: '#c77dff' },
    { name: 'Vuurzwaard', min: 800, blade: ['#fff1c2', '#ff7a1a', '#ffb347', '#8a1e08'], glow: '#ff8c42' },
    { name: 'Smaragdzwaard', min: 1500, blade: ['#e6fff0', '#2ee08a', '#a7f5c9', '#0b6a3e'], glow: '#4ade80' },
    { name: 'Sterrenzwaard', min: 2500, blade: ['#ffffff', '#ff6bd6', '#c9f6ff', '#3b2a9e'], glow: '#ff6bd6' },
  ];
  const tierOf = score => { let t = 0; TIERS.forEach((x, i) => { if (score >= x.min) t = i; }); return t; };
  // Elke drie etappes een andere wereld.
  const THEMES = [
    { name: 'Smidse', sky: ['#160707', '#3d120b', '#9a3a14'], lava: '#ff5a1f', lavaHi: '#ffc04a', wood: '#8a5a33', steel: '#5b6380', glow: '#ff9a3c', far: '#2a0d08', mid: '#3d160d' },
    { name: 'Kristalmijn', sky: ['#05071a', '#1a1046', '#3b1f6e'], lava: '#9b4dff', lavaHi: '#5ee7ff', wood: '#6e4a3a', steel: '#4a5578', glow: '#c77dff', far: '#0f0b2e', mid: '#1c1446' },
    { name: 'Sterrenburcht', sky: ['#02030c', '#081536', '#173070'], lava: '#2de2c8', lavaHi: '#e7fbff', wood: '#7a5a48', steel: '#3f4f7a', glow: '#5ee7ff', far: '#0a1438', mid: '#10204e' },
  ];
  const themeOf = k => THEMES[Math.floor(Math.max(0, k) / 3) % THEMES.length];

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- Een etappe ----------
  // solids: {x, y, w, h, hout} (hout: de punt blijft erin steken; anders staal: alles botst), saws: {x, y, r, ay, per, ph},
  // lasers: {x, y0, y1, per, on, ph}, things: {id, x, y, r, kind, ay?, per?, ph?} (wat je kan splijten).
  const cache = new Map();
  function stage(seed, k) {
    const key = `${seed}:${k}`;
    let st = cache.get(key);
    if (st) return st;
    const r = rng(seed * 7919 + k * 104729 + 23);
    const x0 = k * L;
    const d = Math.min(1, k / 9); // moeilijker naarmate je verder komt
    st = { k, x0, x1: x0 + L, solids: [], saws: [], lasers: [], things: [], theme: themeOf(k) };
    const S = st.solids;
    let ti = 0;
    const thing = (kind, x, y, mv) => {
      const t = { id: `${k}.${ti++}`, kind, x, y, r: kind === 'robot' ? .55 : kind === 'ton' || kind === 'kist' ? .45 : .4 };
      if (mv) Object.assign(t, mv);
      st.things.push(t);
      return t;
    };
    const kinds0 = ['kristal', 'ton', 'pompoen'];
    const pick = () => kinds0[Math.floor(r() * kinds0.length)];
    // De runenpaal aan het begin: een brede houten balk.
    S.push({ x: x0 - 4, y: BASE_Y, w: 8.5, h: .7, hout: true, paal: true });
    let cx = x0 + 4.5;
    let y = BASE_Y;
    const end = x0 + L - 5;
    const used = [];
    while (cx < end - 5) {
      let kinds = ['planken', 'planken', 'palen', 'kristalboog'];
      if (k >= 1 || cx > x0 + 14) kinds.push('staal', 'robots');
      if (k >= 1) kinds.push('zaag', 'laser');
      if (k >= 3) kinds.push('zaag', 'trap');
      kinds = kinds.filter(x => x !== used[used.length - 1]);
      const kind = kinds[Math.floor(r() * kinds.length)];
      used.push(kind);
      const room = end - cx;
      const gap = () => 1.6 + r() * (1.6 + d * 1.6);
      if (kind === 'planken') {
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n && cx < end - 3; i++) {
          cx += gap();
          const w = 2.9 + r() * 2 - d * .5;
          y = Math.max(6.5, Math.min(11, y + (r() - .5) * 3));
          S.push({ x: cx, y, w, h: .6, hout: true });
          if (r() < .8) thing(pick(), cx - .9, y - 1.6 - r() * 1.2);
          if (r() < .5) thing(pick(), cx + w / 2, y - .45);
          cx += w;
        }
      } else if (kind === 'palen' && room > 10) {
        // Hoge houten palen: blijf er bovenop of in de zijkant steken.
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          cx += 2 + r() * (1.4 + d);
          const top = Math.max(6.5, Math.min(11, y + (r() - .6) * 1.8));
          y = top;
          S.push({ x: cx, y: top, w: 1.8, h: H + 2 - top, hout: true, post: true });
          thing(pick(), cx + .9, top - 1.8 - r());
          cx += 1.8;
        }
      } else if (kind === 'kristalboog' && room > 9) {
        // Een boog kristallen boven een kloof, dan een plank.
        const w = 3.2 + r() * 1.2 + d * 1.2;
        const n = 4 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1);
          thing('kristal', cx + .6 + f * w, y - 1.2 - Math.sin(f * Math.PI) * (2 + r()));
        }
        cx += w + 1.4;
        y = Math.max(7, Math.min(11, y + (r() - .5) * 2));
        S.push({ x: cx, y, w: 3.4, h: .6, hout: true });
        cx += 3.4;
      } else if (kind === 'staal' && room > 10) {
        // Een stalen blok: de punt kan er niet in. Spring erover (of laat je terugbotsen).
        cx += 1.2;
        S.push({ x: cx, y, w: 3.4 + r(), h: .6, hout: true });
        const bx = cx + 2.2;
        const bh = 1.4 + r() * (1 + d);
        S.push({ x: bx, y: y - bh, w: 1.1, h: bh, hout: false, blok: true });
        thing(pick(), bx + .55, y - bh - 1.6);
        cx += 3.4 + 1.2;
        S.push({ x: cx, y, w: 2.6, h: .6, hout: true });
        cx += 2.6;
      } else if (kind === 'robots' && room > 8) {
        cx += gap();
        const w = 5 + r() * 1.5;
        y = Math.max(7, Math.min(11, y + (r() - .5) * 2));
        S.push({ x: cx, y, w, h: .6, hout: true });
        thing('robot', cx + 1.6, y - .6);
        if (r() < .4 + d * .5) thing('robot', cx + w - 1.4, y - .6);
        thing('kristal', cx + w / 2, y - 2.6);
        cx += w;
      } else if (kind === 'zaag' && room > 9) {
        // Een zaagblad dat op en neer gaat boven een plank: wacht tot het weg is.
        cx += gap();
        const w = 5.4;
        y = Math.max(7.5, Math.min(11, y + (r() - .5) * 2));
        S.push({ x: cx, y, w, h: .6, hout: true });
        st.saws.push({ x: cx + w / 2, y: y - 3.9, r: .75, ay: 1.2, per: 2.6 - d * .7 + r() * .4, ph: r() });
        thing(pick(), cx + .8, y - .45);
        cx += w;
      } else if (kind === 'laser' && room > 9) {
        cx += gap();
        const w = 6;
        y = Math.max(7.5, Math.min(11, y + (r() - .5) * 2));
        S.push({ x: cx, y, w, h: .6, hout: true });
        const n = d > .5 ? 2 : 1;
        for (let i = 0; i < n; i++) st.lasers.push({ x: cx + 2 + i * 2.2, y0: -1, y1: y, per: 2.4 - d * .4, on: .4, ph: i * .5 + r() * .2 });
        thing('kristal', cx + w - .8, y - 1.5);
        cx += w;
      } else if (kind === 'trap' && room > 10) {
        // Trap omhoog met zwevende kristallen en een zaagblad in de kloof.
        for (let i = 0; i < 3; i++) {
          cx += 1.6 + r() * 1;
          y = Math.max(6, y - .6 - r() * .5);
          S.push({ x: cx, y, w: 2.8, h: .6, hout: true });
          thing('kristal', cx + 1.4, y - 1.8, { ay: .5, per: 2, ph: r() });
          cx += 2.8;
        }
        st.saws.push({ x: cx + 1.4, y: 11.4, r: .9, ay: 1.6, per: 2.2, ph: r() });
        cx += 1;
        y = Math.min(11, y + 2);
      } else {
        cx += 1;
      }
    }
    // Tot aan de volgende runenpaal: een laatste plank als het gat te groot is.
    if (end + 1 - cx > 4.2) {
      const w = 2.6;
      const x = cx + (end + 1 - cx - w) / 2;
      S.push({ x, y: Math.max(7.5, Math.min(10.5, (y + BASE_Y) / 2)), w, h: .6, hout: true });
    }
    // Veel meer om te splijten: stapels tonnen, rijen pompoenen en kristallen op de planken,
    // en een boog kristallen op de sprong naar de volgende plank (zoals je zwaard vliegt).
    const planks = S.filter(p => p.hout && !p.paal && !p.post && p.x > x0).sort((a, b) => a.x - b.x);
    const near0 = (x, y) => st.things.some(o => Math.abs(o.x - x) < .8 && Math.abs(o.y - y) < .8) || st.saws.some(o => Math.abs(o.x - x) < 1.4);
    planks.forEach((pl, i) => {
      const roll = r();
      const top = pl.y;
      if (roll < .3 && pl.w > 2.4) {
        const sx = pl.x + pl.w * (.35 + r() * .3);
        const n = 2 + Math.floor(r() * 2);
        for (let j = 0; j < n; j++) if (!near0(sx, top - .45 - j * .92)) thing('ton', sx, top - .45 - j * .92);
      } else if (roll < .6) {
        const n = Math.max(2, Math.floor(pl.w / 1.1));
        const kind = r() < .5 ? 'pompoen' : 'kristal';
        for (let j = 0; j < n; j++) { const x = pl.x + .6 + j * (pl.w - 1.2) / Math.max(1, n - 1); if (!near0(x, top - .42)) thing(kind, x, top - .42); }
      } else if (roll < .8) {
        const x = pl.x + pl.w / 2;
        for (const [dx, dy] of [[-.45, -.42], [.45, -.42], [0, -1.25]]) if (!near0(x + dx, top + dy)) thing('kristal', x + dx, top + dy);
      }
      const nxt = planks[i + 1];
      if (nxt && nxt.x - (pl.x + pl.w) > .8) {
        // Boog van de rand van deze plank naar de volgende
        const ax = pl.x + pl.w - .3, bx = nxt.x + .5, ay = top - 1, by = nxt.y - 1;
        const n = 3 + Math.floor(r() * 2);
        for (let j = 1; j <= n; j++) {
          const f = j / (n + 1);
          const x = ax + (bx - ax) * f, yy = ay + (by - ay) * f - Math.sin(f * Math.PI) * 2.2;
          if (!near0(x, yy)) thing(r() < .15 ? 'pompoen' : 'kristal', x, yy);
        }
      }
    });
    // Eén schatkist per etappe, hoog en moeilijk.
    if (planks.length) {
      const pl = planks[Math.floor(r() * planks.length)];
      thing('kist', pl.x + pl.w / 2, Math.max(1.5, pl.y - 4.4 - r()));
    }
    if (cache.size > 60) cache.clear();
    cache.set(key, st);
    return st;
  }

  // Waar staat iets dat op en neer gaat op tijd t?
  const bob = (o, t) => (o.ay ? o.y + o.ay * Math.sin((t / o.per + o.ph) * Math.PI * 2) : o.y);
  const laserOn = (l, t) => ((t / l.per + l.ph) % 1 + 1) % 1 < l.on;
  const laserSoon = (l, t) => ((t / l.per + l.ph) % 1 + 1) % 1 > .82;

  // De etappes rond x (vorige, deze en volgende).
  function near(seed, x) {
    const k = Math.max(0, Math.floor(x / L));
    const out = [stage(seed, k), stage(seed, k + 1)];
    if (k > 0) out.unshift(stage(seed, k - 1));
    return out;
  }

  // Een nieuw zwaard, met de punt in de runenpaal van etappe k.
  function spawnOf(k) {
    const a = Math.PI / 2 + .22;
    const x = k * L + 1;
    return { x: x - Math.cos(a) * TIP, y: BASE_Y + DEPTH - Math.sin(a) * TIP, a };
  }

  const tipOf = p => [p.x + Math.cos(p.a) * TIP, p.y + Math.sin(p.a) * TIP];
  const pommelOf = p => [p.x - Math.cos(p.a) * POMMEL, p.y - Math.sin(p.a) * POMMEL];

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  }
  const inside = (s, x, y) => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h;
  // Door welke kant kwam een punt binnen? Geeft de normaal naar buiten en hoe diep het zit.
  function face(s, x, y, ox, oy) {
    if (oy <= s.y + .05) return { nx: 0, ny: -1, pen: y - s.y };
    if (oy >= s.y + s.h - .05) return { nx: 0, ny: 1, pen: s.y + s.h - y };
    if (ox <= s.x + .05) return { nx: -1, ny: 0, pen: x - s.x };
    if (ox >= s.x + s.w - .05) return { nx: 1, ny: 0, pen: s.x + s.w - x };
    // Al binnen: de dichtste kant.
    const c = [[0, -1, y - s.y], [0, 1, s.y + s.h - y], [-1, 0, x - s.x], [1, 0, s.x + s.w - x]].sort((a, b) => a[2] - b[2])[0];
    return { nx: c[0], ny: c[1], pen: c[2] };
  }

  // ---------- Tikken: een salto naar voren ----------
  // p: { x, y, a, vx, vy, w, stuck, gold, rust }. Geeft true als het lukte.
  function tap(p) {
    // Ligt of stuitert het zwaard op iets (plat op de kling of het heft), dan mag je ook meteen weer tikken.
    const grond = !p.stuck && p.touch > 0;
    const P = PHYS;
    const f = (p.gold ? P.gold : 1) * (p.rust ? P.rust : 1);
    if (p.stuck) {
      // De punt uit het hout trekken, in de richting waarin ze erin zit.
      p.x -= Math.cos(p.a) * (DEPTH + .14);
      p.y -= Math.sin(p.a) * (DEPTH + .14) + .12;
      p.air = 1;
      p.free = .12;
    } else if (grond) {
      p.y -= .12;
      p.air = 1;
      p.touch = 0;
    }
    // In de lucht mag je zoveel tikken als je wil, maar elke luchtsalto is een kleiner sprongetje (met de gouden kling niet).
    const lucht = !p.stuck && !grond && !p.gold;
    const wand = p.stuck && p.nx < 0; // in een muur vóór je: omhoog klimmen in plaats van ertegen springen
    p.stuck = false;
    p.rest = 0;
    p.nx = 0;
    p.vx = P.fwd * f * (wand ? .3 : 1) * (lucht ? .8 : 1);
    p.vy = -P.jump * (p.rust ? .92 : 1) * (wand ? 1.2 : 1) * (lucht ? .72 : 1);
    p.w = P.spin;
    return true;
  }

  // ---------- Een stap natuurkunde ----------
  // Geeft { dood, vast, bots, heft, snij: [things] } terug.
  function step(seed, p, dt, t) {
    const out = { dood: null, vast: false, bots: false, heft: false, snij: null };
    const stages = near(seed, p.x);
    if (p.stuck) return out;
    const P = PHYS;
    if (p.free > 0) p.free -= dt;
    const [otx, oty] = tipOf(p);
    const [opx, opy] = pommelOf(p);
    p.vy = Math.min(P.maxVy, p.vy + P.g * dt);
    p.vx *= 1 - P.drag * dt;
    p.a += p.w * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < -1.5) { p.y = -1.5; p.vy = Math.max(0, p.vy); }
    let contact = false;
    for (const st of stages) {
      for (const s of st.solids) {
        if (p.x + 1.2 < s.x || p.x - 1.2 > s.x + s.w || p.y + 1.2 < s.y || p.y - 1.2 > s.y + s.h) continue;
        const [tx, ty] = tipOf(p);
        if (inside(s, tx, ty)) {
          const f = face(s, tx, ty, otx, oty);
          const ix = Math.cos(p.a), iy = Math.sin(p.a);
          if (s.hout && !(p.free > 0) && -(ix * f.nx + iy * f.ny) > STICK_COS && Math.hypot(p.vx, p.vy) > 1) {
            // Tsjok! De punt zit in het hout.
            const back = f.pen - DEPTH;
            p.x += f.nx * back;
            p.y += f.ny * back;
            p.vx = p.vy = p.w = 0;
            p.stuck = true;
            p.air = 1;
            p.rest = 0;
            p.nx = f.nx;
            out.vast = true;
            out.punt = true; // echt vastgestoken met de punt (niet plat blijven liggen)
            out.op = s;
            return out;
          }
          bounce(p, f, s);
          out.bots = true;
          contact = true;
          continue;
        }
        const [px, py] = pommelOf(p);
        if (inside(s, px, py)) {
          bounce(p, face(s, px, py, opx, opy), s);
          out.heft = true;
          contact = true;
          continue;
        }
        if (inside(s, p.x, p.y)) {
          bounce(p, face(s, p.x, p.y, p.x - p.vx * dt, p.y - p.vy * dt), s);
          out.bots = true;
          contact = true;
        }
      }
    }
    // Valt het zwaard plat (of net naast de plek)? Dan springt het meteen rechtop, met de punt in het hout.
    // Op staal blijft het gewoon liggen; tikken mag dan ook meteen.
    p.touch = contact ? .25 : Math.max(0, (p.touch || 0) - dt);
    if (!(p.touch > 0)) p.floor = null;
    if (p.touch > 0 && Math.hypot(p.vx, p.vy) < 3.5) {
      p.rest = (p.rest || 0) + dt;
      p.w *= 1 - 8 * dt;
      if (p.rest > .06) {
        const s = p.floor;
        if (s && s.hout) {
          const a = Math.PI / 2 + .22;
          const tx = Math.max(s.x + .25, Math.min(s.x + s.w - .25, p.x));
          p.a = a;
          p.x = tx - Math.cos(a) * TIP;
          p.y = s.y + DEPTH - Math.sin(a) * TIP;
          out.recht = true;
          out.op = s;
        }
        p.stuck = true; p.air = 1; p.nx = 0; p.vx = p.vy = p.w = 0; p.floor = null; out.vast = true;
      }
    } else if (!(p.touch > 0)) p.rest = 0;

    // Gevaar en splijten.
    const [tx, ty] = tipOf(p);
    const [px, py] = pommelOf(p);
    if (Math.max(ty, py, p.y) > LAVA + .3) { out.dood = 'lava'; return out; }
    for (const st of stages) {
      for (const s of st.saws) {
        if (segDist(s.x, bob(s, t), px, py, tx, ty) < s.r + .06) {
          if (p.gold) { out.zaag = s; continue; }
          out.dood = 'zaag';
          return out;
        }
      }
      for (const l of st.lasers) {
        if (!laserOn(l, t)) continue;
        const lo = Math.min(px, tx) - .05, hi = Math.max(px, tx) + .05;
        if (l.x < lo || l.x > hi) continue;
        const k = Math.abs(tx - px) < .01 ? .5 : (l.x - px) / (tx - px);
        const yy = py + (ty - py) * Math.max(0, Math.min(1, k));
        if (yy > l.y0 && yy < l.y1) {
          if (p.gold) continue;
          out.dood = 'laser';
          return out;
        }
      }
      // Alleen de kling snijdt (van de kruisplaat tot de punt).
      const gx = p.x + Math.cos(p.a) * GUARD, gy = p.y + Math.sin(p.a) * GUARD;
      for (const th of st.things) {
        if (Math.abs(th.x - p.x) > 2) continue;
        if (segDist(th.x, bob(th, t), gx, gy, tx, ty) < th.r) (out.snij || (out.snij = [])).push(th);
      }
    }
    return out;
  }

  function bounce(p, f, s) {
    const P = PHYS;
    // Uit het blok duwen en de snelheid spiegelen op de kant.
    p.x += f.nx * (f.pen + .02);
    p.y += f.ny * (f.pen + .02);
    const vn = p.vx * f.nx + p.vy * f.ny;
    if (vn < 0) {
      p.vx -= (1 + P.bounce) * vn * f.nx;
      p.vy -= (1 + P.bounce) * vn * f.ny;
    }
    if (f.ny < 0) { p.vx *= .8; p.floor = s; } // wrijving op de vloer; onthouden waarop het zwaard ligt
    if (f.nx && p.vx * f.nx < 1.5) p.vx = f.nx * 2.4; // van een muur duidelijk terugbotsen
    p.w = -p.w * .45 + (Math.abs(vn) > 2.5 ? (f.nx || 1) * .8 : 0); // alleen bij een harde klap een draaitje erbij
    if (!s.hout) p.vy = Math.min(p.vy, -2);
  }

  return { H, LAVA, L, BASE_Y, TIP, GUARD, POMMEL, PHYS, GOLD_S, RESPAWN_S, MIN_STAGE_S, COLORS, POINTS, RINGS, ringOf, targetX, TIERS, tierOf, THEMES, themeOf, rng, stage, bob, laserOn, laserSoon, near, spawnOf, tipOf, pommelOf, tap, step };
});
