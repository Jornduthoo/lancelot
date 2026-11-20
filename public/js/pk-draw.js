// Doolhofridder tekenen: het neon doolhof, de kristallen, de ridders en de drones. Gebruikt door het bord en de leerlingen.
// Posities komen van de server per vakje; we tekenen ze vloeiend tussen het vorige en het huidige vakje.
const PacDraw = (() => {
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#f2f2f2'];
  const cache = new Map();

  // Geschilderde beelden: vloer, kristallen en vier drones. Zonder beelden tekenen we zelf.
  const ART = {};
  if (typeof Image !== 'undefined') {
    for (const n of ['vloer', 'kristal', 'kracht', 'drone-1', 'drone-2', 'drone-3', 'drone-4']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; cache.clear(); };
      img.src = `/img/packnight/${n}.webp`;
    }
    // De muren: geschilderde stenen (gedeeld met Laserslag).
    const img = new Image();
    img.onload = () => { ART.muur = img; cache.clear(); };
    img.src = '/img/laserslag/muur.webp';
  }
  // Een beeld op een vaste grootte (langste zijde px), één keer geschaald. bang: grijsblauw voor bange drones.
  function sized(name, px, bang) {
    px = Math.max(4, Math.round(px));
    const key = `art|${name}|${px}|${bang ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const img = ART[name], k = px / Math.max(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = Math.ceil(img.width * k); c.height = Math.ceil(img.height * k);
    const g = c.getContext('2d');
    if (bang) g.filter = 'grayscale(1) sepia(1) hue-rotate(185deg) saturate(2.2) brightness(1.15)';
    g.drawImage(img, 0, 0, c.width, c.height);
    cache.set(key, c);
    return c;
  }

  // De muren één keer tekenen, op de grootte van een vakje. Daarna is het één drawImage per beeld.
  function mazeCanvas(maze, W, H, tile, id) {
    const key = `${id}|${tile}`;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * tile);
    c.height = Math.ceil(H * tile);
    const g = c.getContext('2d');
    const wall = (x, y) => y < 0 || y >= H || x < 0 || x >= W || maze[y][x] === '#';
    // Vloer met een zacht raster.
    g.fillStyle = '#050911';
    g.fillRect(0, 0, c.width, c.height);
    // Een paarse en blauwe nevel onder de vloer, en een fijn raster in de gangen
    let seed = W * 31 + H;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    if (ART.vloer) {
      const pat = g.createPattern(ART.vloer, 'repeat');
      const k = tile * 4 / ART.vloer.width;
      pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      g.fillStyle = pat;
      g.fillRect(0, 0, c.width, c.height);
    }
    for (let i = 0; i < 14; i++) Glow.glow(g, rnd() * c.width, rnd() * c.height, tile * (3 + rnd() * 5), ['#3c1a78', '#123a7a', '#5a1050'][i % 3], ART.vloer ? .3 : .5);
    // Gangen: donkere plavuizen in iets verschillende tinten, met gruis en schaduw onder de muren.
    const hash = (x, y, k) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
    const m = Math.max(1, tile * .04);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (wall(x, y)) continue;
      const L = x * tile, T = y * tile;
      g.fillStyle = `rgba(${90 + hash(x, y, 1) * 40 | 0}, ${110 + hash(x, y, 2) * 40 | 0}, 190, ${.08 + hash(x, y, 3) * .08})`;
      g.fillRect(L + m, T + m, tile - m * 2, tile - m * 2);
      g.fillStyle = 'rgba(180, 210, 255, .05)';
      g.fillRect(L + m, T + m, tile - m * 2, m);
      g.fillStyle = 'rgba(150, 180, 240, .1)';
      for (let i = 0; i < 3; i++) g.fillRect(L + hash(x, y, 10 + i) * (tile - 2), T + hash(x, y, 20 + i) * (tile - 2), m, m);
      if (wall(x, y - 1)) {
        const sh = g.createLinearGradient(0, T, 0, T + tile * .45);
        sh.addColorStop(0, 'rgba(0, 0, 0, .55)');
        sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = sh;
        g.fillRect(L, T, tile, tile * .45);
      }
    }
    g.fillStyle = 'rgba(127, 220, 255, .14)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!wall(x, y)) g.fillRect((x + .5) * tile - 1, (y + .5) * tile - 1, 2, 2);
    // Hangar van de drones.
    let hx0 = W, hx1 = -1, hy0 = H, hy1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (maze[y][x] === 'h') { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y); hy1 = Math.max(hy1, y); }
    if (hx1 >= 0) {
      // Een kerker met een rode gloed en een valhek ervoor.
      const HX = hx0 * tile, HY = hy0 * tile, HW = (hx1 - hx0 + 1) * tile, HH = (hy1 - hy0 + 1) * tile;
      g.fillStyle = 'rgba(255, 77, 109, .08)';
      g.fillRect(HX, HY, HW, HH);
      Glow.glow(g, HX + HW / 2, HY + HH / 2, Math.max(HW, HH) * .55, '#ff4d6d', .35, HH / Math.max(HW, HH));
      g.strokeStyle = 'rgba(30, 34, 52, .9)';
      g.lineWidth = Math.max(2, tile * .14);
      g.beginPath();
      for (let x = HX + tile * .6; x < HX + HW - tile * .3; x += tile * .7) { g.moveTo(x, HY); g.lineTo(x, HY + HH); }
      for (const k of [.3, .7]) { g.moveTo(HX, HY + HH * k); g.lineTo(HX + HW, HY + HH * k); }
      g.stroke();
      g.strokeStyle = 'rgba(160, 175, 210, .45)';
      g.lineWidth = Math.max(1, tile * .04);
      g.stroke();
      g.strokeStyle = 'rgba(255, 77, 109, .6)';
      g.lineWidth = Math.max(1, tile * .06);
      g.strokeRect(HX + 2, HY + 2, HW - 4, HH - 4);
    }
    // Muurblokken met een neonrand waar ze aan een gang grenzen.
    const wg = g.createLinearGradient(0, 0, c.width, c.height);
    wg.addColorStop(0, '#122452');
    wg.addColorStop(.5, '#0c1834');
    wg.addColorStop(1, '#1a1040');
    g.fillStyle = wg;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall(x, y)) g.fillRect(x * tile, y * tile, tile + .5, tile + .5);
    if (ART.muur) {
      // Geschilderde stenen, met een blauwe waas zodat het doolhof neon blijft.
      const pat = g.createPattern(ART.muur, 'repeat'), k = tile * 2 / ART.muur.width;
      pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      g.fillStyle = pat;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall(x, y)) g.fillRect(x * tile, y * tile, tile + .5, tile + .5);
      g.fillStyle = 'rgba(14, 26, 70, .38)';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall(x, y)) g.fillRect(x * tile, y * tile, tile + .5, tile + .5);
    }
    // Gemetselde stenen op de muren: twee rijen per vakje, verspringend, elk blok een eigen tint.
    const lw = Math.max(1, tile * .035);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!wall(x, y)) continue;
      const L = x * tile, T = y * tile;
      for (let r = 0; r < (ART.muur ? 0 : 2); r++) {
        const off = (y * 2 + r) % 2 ? tile / 2 : 0;
        for (let i = -1; i < 2; i++) {
          const bx = Math.max(L, L + off + i * tile), ex = Math.min(L + tile, L + off + (i + 1) * tile);
          if (ex <= bx) continue;
          const k = hash(x * 3 + i, y * 2 + r, 5);
          g.fillStyle = k < .5 ? `rgba(150, 180, 255, ${.02 + k * .06})` : `rgba(0, 0, 0, ${(k - .5) * .3})`;
          g.fillRect(bx, T + r * tile / 2, ex - bx, tile / 2);
        }
        g.fillStyle = 'rgba(0, 0, 0, .35)';
        g.fillRect(L, T + (r + 1) * tile / 2 - lw, tile + .5, lw);
        const jx = L + off + (off ? 0 : tile / 2);
        g.fillRect(jx - lw / 2, T + r * tile / 2, lw, tile / 2);
        g.fillStyle = 'rgba(190, 215, 255, .06)';
        g.fillRect(L, T + r * tile / 2, tile + .5, lw);
      }
      // Bovenkant licht, voorkant naar de gang toe donker: zo staan de muren recht op.
      if (!wall(x, y - 1)) { g.fillStyle = 'rgba(190, 215, 255, .12)'; g.fillRect(L, T, tile + .5, tile * .14); }
      if (!wall(x, y + 1)) { g.fillStyle = 'rgba(0, 0, 0, .35)'; g.fillRect(L, T + tile * .72, tile + .5, tile * .28); }
    }
    // Printplaatlijntjes op de muren
    g.strokeStyle = 'rgba(120, 160, 255, .16)';
    g.lineWidth = Math.max(1, tile * .04);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!wall(x, y) || rnd() < .55 || ART.muur) continue;
      const cx = (x + .5) * tile, cy = (y + .5) * tile;
      g.beginPath();
      if (wall(x + 1, y)) { g.moveTo(cx, cy); g.lineTo(cx + tile, cy); }
      if (wall(x, y + 1)) { g.moveTo(cx, cy); g.lineTo(cx, cy + tile); }
      g.stroke();
      g.fillStyle = 'rgba(160, 200, 255, .3)';
      g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    const edges = new Path2D();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!wall(x, y)) continue;
        const L = x * tile, T = y * tile, R = L + tile, B = T + tile;
        if (!wall(x, y - 1)) { edges.moveTo(L, T); edges.lineTo(R, T); }
        if (!wall(x, y + 1)) { edges.moveTo(L, B); edges.lineTo(R, B); }
        if (!wall(x - 1, y)) { edges.moveTo(L, T); edges.lineTo(L, B); }
        if (!wall(x + 1, y)) { edges.moveTo(R, T); edges.lineTo(R, B); }
      }
    }
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(76, 201, 255, .12)';
    g.lineWidth = Math.max(6, tile * .5);
    g.stroke(edges);
    g.strokeStyle = 'rgba(76, 201, 255, .35)';
    g.lineWidth = Math.max(3, tile * .22);
    g.stroke(edges);
    g.strokeStyle = '#7fdcff';
    g.lineWidth = Math.max(1.5, tile * .07);
    g.stroke(edges);
    // Lichtende knooppunten op de hoeken
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!wall(x, y)) continue;
      const open = !wall(x + 1, y) + !wall(x - 1, y) + !wall(x, y + 1) + !wall(x, y - 1);
      if (open >= 3 || (open === 2 && rnd() < .15)) Glow.glow(g, (x + .5) * tile, (y + .5) * tile, tile * .55, open >= 3 ? '#ff5fd2' : '#4cc9ff', .8);
    }
    if (cache.size > 6) cache.clear();
    cache.set(key, c);
    return c;
  }

  function gem(size, colors, glow) {
    const key = `gem|${size}|${colors}`;
    if (cache.has(key)) return cache.get(key);
    const pad = Math.ceil(size * .8);
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * 2 + pad * 2);
    const g = c.getContext('2d');
    const m = c.width / 2;
    Glow.glow(g, m, m, size * 1.8, glow, .8);
    const grad = g.createLinearGradient(m - size, m - size, m + size, m + size);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(m, m - size);
    g.lineTo(m + size * .75, m);
    g.lineTo(m, m + size);
    g.lineTo(m - size * .75, m);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, .75)';
    g.beginPath();
    g.moveTo(m, m - size * .7);
    g.lineTo(m + size * .3, m - size * .1);
    g.lineTo(m, m);
    g.closePath();
    g.fill();
    cache.set(key, c);
    return c;
  }

  function crystals(ctx, s, cam, view, t) {
    const { tile, ox, oy } = cam;
    const small = ART.kristal ? sized('kristal', tile * .34) : gem(Math.max(2.5, tile * .13), ['#d8f6ff', '#4cc9ff'], '#4cc9ff');
    const big = ART.kracht ? sized('kracht', tile * .85) : gem(Math.max(5, tile * .3), ['#fff3b0', '#ffb703'], '#ffc94a');
    const x0 = Math.max(0, Math.floor((view.x0 - ox) / tile)), x1 = Math.min(s.W - 1, Math.ceil((view.x1 - ox) / tile));
    const y0 = Math.max(0, Math.floor((view.y0 - oy) / tile)), y1 = Math.min(s.H - 1, Math.ceil((view.y1 - oy) / tile));
    const pulse = 1 + Math.sin(t / 220) * .12;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = s.crystals[y * s.W + x];
        if (!c) continue;
        const cx = ox + (x + .5) * tile, cy = oy + (y + .5) * tile;
        if (c === 1) {
          ctx.drawImage(small, cx - small.width / 2, cy - small.height / 2);
        } else {
          const w = big.width * pulse, hh = big.height * pulse;
          if (ART.kracht) Glow.glow(ctx, cx, cy, tile * .7 * pulse, '#4cc9ff', .45);
          ctx.drawImage(big, cx - w / 2, cy - hh / 2, w, hh);
        }
      }
    }
  }

  // Waar staat een ridder of drone nu, in vakjes (met komma)? Gerekend op de klok van de server (s.off), zodat een tick
  // die laat binnenkomt (trage Chromebook, druk wifi) niemand terugduwt. Is de stap af, dan loopt de figuur alvast verder
  // in zijn richting (nooit door een muur) tot de volgende tick er is. Een kleine correctie wordt zacht weggewerkt.
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const SMOOTH_MS = 150;
  const free = (s, x, y) => y >= 0 && y < s.H && s.maze[y][((x % s.W) + s.W) % s.W] !== '#';

  // Waar gaat de volgende stap heen? Een drone zegt het zelf (plan), een ridder kiest zijn gewenste richting als die
  // open is, anders rechtdoor. Voor de eigen ridder telt wat je net indrukte. Zo klopt het verder lopen bijna altijd.
  function nextDir(s, e) {
    const want = e.n !== undefined && e.n === s.meN && s.want != null ? s.want : e.want;
    const order = e.n === undefined ? [e.plan] : [want, e.dir];
    return order.find(k => k != null && k >= 0 && free(s, e.x + DX[k], e.y + DY[k]));
  }

  function raw(s, e, now) {
    if (Math.abs(e.x - e.px) > 1) return { x: e.x, y: e.y }; // door de tunnel
    const p = Math.max(0, (now - (s.off || 0) - e.start) / e.ms);
    if (p <= 1) return { x: e.px + (e.x - e.px) * p, y: e.py + (e.y - e.py) * p };
    const moving = (e.x !== e.px || e.y !== e.py) && !(e.flags & 2);
    const d = moving ? nextDir(s, e) : undefined;
    if (d === undefined) return { x: e.x, y: e.y };
    const q = Math.min(p - 1, .9);
    return { x: e.x + DX[d] * q, y: e.y + DY[d] * q };
  }

  function pos(s, e, now) {
    const p = raw(s, e, now);
    const f = e.ex || e.ey ? 1 - (now - e.eAt) / SMOOTH_MS : 0;
    if (f > 0) { p.x += e.ex * f; p.y += e.ey * f; }
    return p;
  }

  // De nieuwe stand van de server: het verschil met wat er nu getekend staat zacht wegwerken (niet bij wegspringen).
  function settle(s, old, e, now) {
    if (!old || (old.flags | e.flags) & 6) return;
    const a = pos(s, old, now), b = raw(s, e, now);
    const ex = a.x - b.x, ey = a.y - b.y;
    if (Math.hypot(ex, ey) > 1.2 || Math.hypot(ex, ey) < .002) return;
    e.ex = ex;
    e.ey = ey;
    e.eAt = now;
  }

  // De eigen ridder draait meteen bij het indrukken, zonder op de wifi te wachten. De server doet hetzelfde
  // (omkeren, of te laat inslaan op het kruispunt dat je net voorbij was); zijn antwoord komt een tikje later.
  const TURN_PART = .45; // tot bijna halfweg naar het volgende vakje telt het kruispunt waar je net voorbij was
  function predict(s, dir) {
    const e = s.knights.get(s.meN);
    if (!e || e.flags & 6 || e.dir < 0 || Math.abs(e.x - e.px) > 1 || (e.x === e.px && e.y === e.py)) return null;
    const now = performance.now();
    const nowS = now - (s.off || 0);
    const since = nowS - e.start;
    // Welk stuk loopt de ridder op het scherm: de stap van de server (A naar B), of al verder getekend (B naar C)?
    let ax = e.px, ay = e.py, bx = e.x, by = e.y, d = e.dir, el = since, start = e.start;
    if (since >= e.ms) {
      d = nextDir(s, e);
      if (d === undefined) return null;
      ax = e.x; ay = e.y; bx = e.x + DX[d]; by = e.y + DY[d];
      el = Math.min(since - e.ms, e.ms * .9);
      start = e.start + e.ms;
    }
    if (dir === d) return null;
    let n = null;
    if (dir === (d + 2) % 4) {
      n = { ...e, x: ax, y: ay, px: bx, py: by, dir, start: nowS - (e.ms - el) };
    } else if (el >= 0 && el <= e.ms * TURN_PART && free(s, ax + DX[dir], ay + DY[dir])) {
      n = { ...e, x: ax + DX[dir], y: ay + DY[dir], px: ax, py: ay, dir, start };
    }
    if (!n) {
      // Nog op weg naar het volgende kruispunt: daar draait hij vanzelf (de gewenste richting). Toch het kruispunt
      // meegeven: kwam de toets door de wifi pas aan toen de server er al voorbij was, dan doet hij die stap over.
      return el > e.ms * TURN_PART && dir !== (d + 2) % 4 && free(s, bx + DX[dir], by + DY[dir]) ? { x: bx, y: by } : null;
    }
    settle(s, e, n, now);
    s.knights.set(s.meN, n);
    s.pred = { x: n.x, y: n.y, until: now + 300 };
    // De server krijgt het kruispunt mee, zodat hij dezelfde keuze maakt, ook als de wifi de toets wat ophoudt.
    return dir === (d + 2) % 4 ? null : { x: ax, y: ay };
  }

  // Het verschil tussen de klok van de server en de eigen klok. De snelste tick telt; daarna mag het heel traag opschuiven
  // (of ineens, na een pauze of een grote sprong).
  function clock(s, t, now) {
    if (typeof t !== 'number') return;
    const o = now - t;
    if (s.off === undefined || o < s.off || o - s.off > 600) s.off = o;
    else s.off += Math.min(o - s.off, .25);
  }

  function knight(ctx, cx, cy, tile, k, info, t, opts = {}) {
    const color = COLORS[(info && info.color) % COLORS.length] || '#4cc9ff';
    const powered = k.flags & 1, asking = k.flags & 2, safe = k.flags & 8, ending = k.flags & 16;
    ctx.save();
    if (safe && !asking && Math.floor(t / 120) % 2) ctx.globalAlpha = .4;
    // Kracht: een gouden gloed rond de ridder.
    if (powered && !(ending && Math.floor(t / 100) % 2)) {
      const r = tile * (.8 + Math.sin(t / 90) * .08);
      const glow = ctx.createRadialGradient(cx, cy, tile * .1, cx, cy, r);
      glow.addColorStop(0, 'rgba(255, 220, 120, .8)');
      glow.addColorStop(1, 'rgba(255, 201, 74, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    if (powered && !(ending && Math.floor(t / 100) % 2)) {
      for (let i = 0; i < 6; i++) {
        const a = t / 300 + i * Math.PI / 3, rr = tile * (.55 + Math.sin(t / 120 + i) * .08);
        Glow.glow(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, tile * .18, '#ffe08a', .9);
      }
    }
    Glow.glow(ctx, cx, cy + tile * .32, tile * .6, color, .45, .4);
    // Ring in de eigen kleur.
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, tile * .08);
    ctx.beginPath(); ctx.ellipse(cx, cy + tile * .32, tile * .34, tile * .12, 0, 0, Math.PI * 2); ctx.stroke();
    if (opts.me) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, tile * .03);
      ctx.beginPath(); ctx.ellipse(cx, cy + tile * .32, tile * .42, tile * .16, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const av = info && typeof Avatar !== 'undefined' ? Avatar.byName(info.name) : null;
    const hgt = tile * (powered ? 1.15 : 1);
    if (av) {
      const kk = Math.max(2, Math.min(8, Math.round(hgt / 17 * (window.devicePixelRatio || 1))));
      const img = Avatar.sprite(av, { k: kk });
      const w = hgt * img.width / img.height;
      const bob = k.dir >= 0 ? Math.sin(t / 70) * tile * .04 : 0;
      ctx.save();
      ctx.translate(cx, cy - tile * .12 + bob);
      if (k.dir === 3) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, -w / 2, -hgt / 2, w, hgt);
      ctx.restore();
    } else {
      // Een eenvoudige ridderhelm in de eigen kleur.
      const r = tile * (powered ? .4 : .34);
      ctx.fillStyle = '#c9d6e6';
      ctx.beginPath(); ctx.arc(cx, cy - tile * .05, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(cx - r * .15, cy - tile * .05 - r * 1.25, r * .3, r * .6);
      ctx.fillStyle = '#0b0f1c';
      const look = k.dir === 1 ? r * .25 : k.dir === 3 ? -r * .25 : 0;
      ctx.fillRect(cx - r * .7 + look, cy - tile * .1, r * 1.4, r * .28);
    }
    // Aan het antwoorden: beschermd in een bel.
    if (asking) {
      ctx.globalAlpha = 1;
      const b = bubble(tile);
      ctx.drawImage(b, Math.round(cx - b.width / 2), Math.round(cy - b.height / 2));
    }
    ctx.restore();
    if (opts.names && info) {
      const lb = label(info.name, Math.max(10, Math.round(tile * .32)), opts.me);
      ctx.drawImage(lb, Math.round(cx - lb.width / 2), Math.round(cy + tile * .82 - lb.base));
    }
  }

  // De bel rond een ridder die een vraag beantwoordt, met het vraagteken: één keer getekend per vakjesgrootte.
  // (Elk beeld het lettertype instellen was het duurste van heel het tekenen, en in de klas antwoorden er velen tegelijk.)
  function bubble(tile) {
    const key = `bel|${tile}`;
    let c = labels.get(key);
    if (c) return c;
    const R = tile * .62, m = Math.ceil(R + tile * .6);
    c = document.createElement('canvas');
    c.width = c.height = m * 2;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(76, 201, 255, .15)';
    g.strokeStyle = 'rgba(127, 220, 255, .9)';
    g.lineWidth = Math.max(1.5, tile * .05);
    g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#7fdcff';
    g.font = `900 ${Math.round(tile * .45)}px Orbitron, sans-serif`;
    g.textAlign = 'center';
    g.fillText('?', m + tile * .5, m - tile * .45);
    labels.set(key, c);
    return c;
  }

  // Een naam onder de ridder: één keer getekend en bewaard. Elk beeld opnieuw een lettertype instellen en tekst
  // met een rand tekenen kost een Chromebook met 25 ridders veel tijd.
  const labels = new Map();
  // Komt het lettertype later binnen, dan de namen opnieuw tekenen.
  if (typeof document !== 'undefined' && document.fonts) document.fonts.addEventListener('loadingdone', () => labels.clear());
  function label(name, px, me) {
    const key = `${name}|${px}|${me ? 1 : 0}`;
    let c = labels.get(key);
    if (c) return c;
    if (labels.size > 300) labels.clear();
    c = document.createElement('canvas');
    const g = c.getContext('2d');
    const font = `700 ${px}px 'Exo 2', sans-serif`;
    g.font = font;
    c.width = Math.ceil(g.measureText(name).width + 8);
    c.height = Math.ceil(px * 1.5 + 6);
    c.base = Math.ceil(px * 1.1 + 3);
    g.font = font;
    g.textAlign = 'center';
    g.lineWidth = 3;
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0, 0, 0, .8)';
    g.strokeText(name, c.width / 2, c.base);
    g.fillStyle = me ? '#ffc94a' : '#eaf4ff';
    g.fillText(name, c.width / 2, c.base);
    labels.set(key, c);
    return c;
  }

  function drone(ctx, cx, cy, tile, d, t) {
    const scared = d.flags & 1;
    const color = scared ? '#3d8bff' : '#ff4d6d';
    const r = tile * .36;
    const hover = Math.sin(t / 160 + d.i) * tile * .05;
    const y = cy + hover;
    const art = ART['drone-' + (((d.i | 0) % 4) + 1)];
    if (art) {
      // Geschilderde drone: elke drone een eigen kleur; bang = grijsblauw en knipperend.
      const sp = sized('drone-' + (((d.i | 0) % 4) + 1), tile * 1.05, scared);
      Glow.glow(ctx, cx, cy + tile * .38, r * 1.6, color, .3, .35);
      ctx.save();
      if (scared && Math.floor(t / 200) % 2) ctx.globalAlpha = .6;
      ctx.translate(cx, y);
      if (d.dir === 3) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(t / 300 + d.i) * .06);
      ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
      ctx.restore();
      return;
    }
    ctx.save();
    // Rotoren.
    ctx.strokeStyle = scared ? 'rgba(160, 200, 255, .8)' : 'rgba(255, 180, 190, .8)';
    ctx.lineWidth = Math.max(1, tile * .05);
    for (const side of [-1, 1]) {
      const rx = cx + side * r * .95, ry = y - r * .85;
      const a = t / 40 * side;
      ctx.beginPath();
      ctx.moveTo(rx - Math.cos(a) * r * .45, ry - Math.sin(a) * r * .12);
      ctx.lineTo(rx + Math.cos(a) * r * .45, ry + Math.sin(a) * r * .12);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(cx + side * r * .5, y - r * .4); ctx.stroke();
    }
    // Lijf.
    Glow.glow(ctx, cx, y, r * 2.6, color, .55);
    Glow.glow(ctx, cx, cy + tile * .38, r * 1.6, color, .35, .35);
    ctx.fillStyle = '#16091a';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, tile * .08);
    ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (scared) {
      // Bang: knipperende ogen en een bibberende mond.
      ctx.fillStyle = Math.floor(t / 200) % 2 ? '#fff' : '#b9d4ff';
      ctx.fillRect(cx - r * .45, y - r * .3, r * .25, r * .25);
      ctx.fillRect(cx + r * .2, y - r * .3, r * .25, r * .25);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, tile * .04);
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) ctx.lineTo(cx - r * .5 + k * r * .25, y + r * .3 + (k % 2 ? -1 : 1) * r * .1);
      ctx.stroke();
    } else {
      // Eén groot oog dat kijkt waar de drone heen vliegt.
      const lx = d.dir === 1 ? 1 : d.dir === 3 ? -1 : 0, ly = d.dir === 2 ? 1 : d.dir === 0 ? -1 : 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx, y, r * .48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx + lx * r * .2, y + ly * r * .2, r * .26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16091a';
      ctx.beginPath(); ctx.arc(cx + lx * r * .24, y + ly * r * .24, r * .11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Alles tekenen. cam: { tile, ox, oy } in pixels. scene: { W, H, maze, crystals, knights, drones, roster }.
  function scene(ctx, s, cam, opts = {}) {
    const t = performance.now();
    const now = t;
    const view = { x0: 0, y0: 0, x1: ctx.canvas.width, y1: ctx.canvas.height };
    Glow.space(ctx, view.x1, view.y1);
    const img = mazeCanvas(s.maze, s.W, s.H, cam.tile, s.mazeKey);
    ctx.drawImage(img, cam.ox, cam.oy);
    // Een lichtgolf die af en toe over het doolhof scant
    const sweep = ((t / 4500) % 1.6) - .3;
    if (sweep > -.2 && sweep < 1.2) {
      const sx = cam.ox + sweep * img.width;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(sx - cam.tile * 3, 0, sx + cam.tile * 3, 0);
      g.addColorStop(0, 'rgba(76,201,255,0)');
      g.addColorStop(.5, 'rgba(76,201,255,.08)');
      g.addColorStop(1, 'rgba(76,201,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.max(cam.ox, sx - cam.tile * 3), cam.oy, cam.tile * 6, img.height);
      ctx.restore();
    }
    crystals(ctx, s, cam, view, t);
    const at = p => ({ x: cam.ox + (p.x + .5) * cam.tile, y: cam.oy + (p.y + .5) * cam.tile });
    for (const d of s.drones) {
      if (d.flags & 2) continue;
      const p = at(pos(s, d, now));
      drone(ctx, p.x, p.y, cam.tile, d, t);
    }
    const mine = [];
    for (const k of s.knights.values()) {
      if (k.flags & 4) continue;
      if (k.n === opts.me) { mine.push(k); continue; }
      const p = at(pos(s, k, now));
      knight(ctx, p.x, p.y, cam.tile, k, s.roster.get(k.n), t, { names: opts.names });
    }
    // De eigen ridder als laatste, bovenop de rest.
    for (const k of mine) {
      const p = at(pos(s, k, now));
      knight(ctx, p.x, p.y, cam.tile, k, s.roster.get(k.n), t, { names: opts.names, me: true });
    }
    Glow.vignette(ctx, view.x1, view.y1, .45);
  }

  // Een klein overzicht van het hele doolhof (voor de leerlingen).
  let miniCache = null;
  function minimap(ctx, s, x, y, w, h, me) {
    const tile = Math.min(w / s.W, h / s.H);
    const ox = x + (w - s.W * tile) / 2, oy = y + (h - s.H * tile) / 2;
    ctx.save();
    // De muren van het overzicht één keer tekenen, niet elk beeld opnieuw honderden vakjes.
    const key = `${s.mazeKey}|${tile}`;
    if (!miniCache || miniCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(s.W * tile + 6);
      c.height = Math.ceil(s.H * tile + 6);
      const g = c.getContext('2d');
      g.globalAlpha = .85;
      g.fillStyle = 'rgba(3, 6, 13, .85)';
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(76, 201, 255, .45)';
      for (let yy = 0; yy < s.H; yy++) for (let xx = 0; xx < s.W; xx++) if (s.maze[yy][xx] === '#') g.fillRect(3 + xx * tile, 3 + yy * tile, tile + .3, tile + .3);
      miniCache = { key, c };
    }
    ctx.drawImage(miniCache.c, ox - 3, oy - 3);
    const now = performance.now();
    for (const d of s.drones) {
      if (d.flags & 2) continue;
      const p = pos(s, d, now);
      ctx.fillStyle = d.flags & 1 ? '#3d8bff' : '#ff4d6d';
      ctx.beginPath(); ctx.arc(ox + (p.x + .5) * tile, oy + (p.y + .5) * tile, Math.max(2, tile * .6), 0, Math.PI * 2); ctx.fill();
    }
    const k = s.knights.get(me);
    if (k && !(k.flags & 4)) {
      const p = pos(s, k, now);
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(ox + (p.x + .5) * tile, oy + (p.y + .5) * tile, Math.max(2.5, tile * .8), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Een tick van de server verwerken in de scene.
  function apply(s, msg) {
    const now = performance.now();
    clock(s, msg.t, now);
    const t = typeof msg.t === 'number' ? msg.t : now - (s.off || 0);
    const seen = new Set();
    for (const [n, x, y, px, py, age, ms, flags, dir, want] of msg.k) {
      seen.add(n);
      const e = { n, x, y, px, py, ms, flags, dir, want, start: t - age };
      if (n === s.meN && s.pred) {
        // Een bericht van vóór de server de toets zag: de voorspelde stap laten staan.
        const old = s.knights.get(n);
        if (now < s.pred.until && !(e.flags & 6) && (x !== s.pred.x || y !== s.pred.y) && (px !== s.pred.x || py !== s.pred.y) && old) { old.flags = flags; old.want = want; continue; }
        s.pred = null;
      }
      settle(s, s.knights.get(n), e, now);
      s.knights.set(n, e);
    }
    for (const n of [...s.knights.keys()]) if (!seen.has(n)) s.knights.delete(n);
    const old = s.drones;
    s.drones = msg.d.map(([x, y, px, py, age, ms, flags, dir, plan], i) => {
      const e = { i, x, y, px, py, ms, flags, dir, plan, start: t - age };
      settle(s, old[i], e, now);
      return e;
    });
    if (s.crystals) for (const [i, v] of msg.c) s.crystals[i] = v;
  }

  function fromState(st, old) {
    const key = st.maze ? st.maze.join('') : '';
    const s = old && old.run === st.run && old.mazeKey === key ? old : { knights: new Map(), drones: [], meN: -1, want: null };
    s.run = st.run;
    s.mazeKey = key;
    s.W = st.W;
    s.H = st.H;
    s.maze = st.maze;
    if (st.crystals) s.crystals = Uint8Array.from(st.crystals, c => Number(c));
    s.roster = new Map((st.roster || []).map(([n, name, color]) => [n, { name, color }]));
    return s;
  }

  return { COLORS, scene, minimap, apply, fromState, pos, predict };
})();
