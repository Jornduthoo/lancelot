// Banierveld tekenen, van bovenaf: het nachtelijke toernooiveld, het land van elke ridder als verhoogde gekleurde tegels,
// de lichtsporen, de burchten en de ruiters op hun zwevend ros. Gedeeld door het bord en de leerlingen.
// Het land tekenen we niet elke frame: elk vakje wordt één keer op een eigen canvas gezet als het van eigenaar wisselt.
// Zijn Jorns geschilderde beelden er (public/img/banierveld/), dan gebruiken we die; anders tekenen we zelf.
// Gebruikt BvWorld, AK (arena-kit.js) en Glow (fx.js).
const BvDraw = (() => {
  const W = BvWorld;
  const { rgba, glow } = Glow;
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function hexRgb(hex) { const n = parseInt(String(hex).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(hex, f) {
    const [r, g, b] = hexRgb(hex);
    const m = v => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- Geschilderde beelden ----------
  const ART = {};
  let artGen = 0;
  if (typeof Image !== 'undefined') {
    for (const n of ['ruiter', 'burcht', 'veld']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artGen++; tintCache.clear(); bgTile = null; };
      img.src = `/img/banierveld/${n}.webp`;
    }
  }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslRgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  // De blauwe delen van een beeld krijgen de kleur van de ridder. Eén keer per kleur en grootte gebakken.
  const tintCache = new Map();
  function tinted(name, color, px) {
    const img = ART[name];
    if (!img) return null;
    const size = Math.max(16, Math.min(256, Math.round(px / 8) * 8));
    const key = `${name}|${color}|${size}`;
    let c = tintCache.get(key);
    if (c) return c;
    const k = size / Math.max(img.width, img.height);
    c = mk(img.width * k, img.height * k);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    const data = g.getImageData(0, 0, c.width, c.height), p = data.data;
    const [th, ts] = rgbHsl(...hexRgb(color));
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const [h, sat, l] = rgbHsl(p[i], p[i + 1], p[i + 2]);
      if (h < 180 || h > 265 || sat < .22) continue;
      const [r, gg, b] = hslRgb(th, Math.max(sat, ts * .85), l);
      p[i] = r; p[i + 1] = gg; p[i + 2] = b;
    }
    g.putImageData(data, 0, 0);
    if (tintCache.size > 80) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  // ---------- De grond ----------
  // Een tegel van 4 x 4 vakjes: donkere stenen, mos, fijne lichtende circuitlijnen en hier en daar een kristalletje.
  let bgTile = null;
  const TILE_CELLS = 4, TILE_PX = 192;
  // Jorns geschilderde grond is een naadloze tegel van 10 x 10 vakjes; de getekende grond een van 4 x 4.
  let tileCells = TILE_CELLS;
  function tile() {
    if (bgTile) return bgTile;
    if (ART.veld) {
      const v = ART.veld, c = mk(v.width, v.height), g = c.getContext('2d');
      g.drawImage(v, 0, 0);
      g.fillStyle = 'rgba(4,8,22,.3)';
      g.fillRect(0, 0, c.width, c.height);
      tileCells = 10;
      bgTile = c;
      return c;
    }
    const c = mk(TILE_PX, TILE_PX), g = c.getContext('2d');
    {
      const r = rng(7), cs = TILE_PX / TILE_CELLS;
      g.fillStyle = '#0b1226';
      g.fillRect(0, 0, TILE_PX, TILE_PX);
      for (let y = 0; y < TILE_CELLS; y++) {
        for (let x = 0; x < TILE_CELLS; x++) {
          const v = r();
          g.fillStyle = v < .3 ? '#0f1a33' : v < .6 ? '#111c38' : v < .85 ? '#0d1730' : '#13213f';
          g.fillRect(x * cs + 1.5, y * cs + 1.5, cs - 3, cs - 3);
          // Een zachte rand bovenaan: stenen die een beetje uitsteken
          g.fillStyle = 'rgba(160,190,255,.05)';
          g.fillRect(x * cs + 1.5, y * cs + 1.5, cs - 3, 2);
          g.fillStyle = 'rgba(0,0,0,.25)';
          g.fillRect(x * cs + 1.5, y * cs + cs - 3.5, cs - 3, 2);
        }
      }
      // Mosplekjes
      for (let i = 0; i < 70; i++) {
        g.fillStyle = `rgba(${40 + r() * 30},${90 + r() * 60},${70 + r() * 40},${.05 + r() * .08})`;
        g.beginPath(); g.arc(r() * TILE_PX, r() * TILE_PX, 2 + r() * 6, 0, TAU); g.fill();
      }
      // Circuitlijnen in de voegen
      g.strokeStyle = 'rgba(94,231,255,.16)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(r() * TILE_CELLS) * cs, y = Math.floor(r() * TILE_CELLS) * cs, l = (1 + Math.floor(r() * 2)) * cs;
        g.beginPath();
        if (r() < .5) { g.moveTo(x, y); g.lineTo(x + l, y); } else { g.moveTo(x, y); g.lineTo(x, y + l); }
        g.stroke();
        g.fillStyle = 'rgba(94,231,255,.35)';
        g.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      for (let i = 0; i < 3; i++) {
        const x = r() * TILE_PX, y = r() * TILE_PX;
        glow(g, x, y, 9, '#7df9ff', .35);
        g.fillStyle = '#bff8ff';
        g.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    bgTile = c;
    return c;
  }

  // ---------- Het land ----------
  // Elk vakje is een verhoogde tegel in de kleur van de ridder: lichte rand bovenaan, een donkere zijkant eronder
  // waar het land ophoudt. Een vakje opnieuw zetten = ook zijn buren (hun randen hangen ervan af).
  class Land {
    constructor(G, C, colorOf) {
      this.G = G;
      this.C = C;
      this.colorOf = colorOf;
      this.own = new Uint16Array(G * G);
      this.canvas = mk(G * C, G * C);
      this.g = this.canvas.getContext('2d');
      this.cols = new Map();
    }
    col(v) {
      let c = this.cols.get(v);
      if (!c) {
        const base = this.colorOf(v - 1) || '#9fb2d9';
        c = { top: rgba(base, .62), hi: shade(base, .45), lo: shade(base, -.55), side: shade(base, -.7), line: rgba(shade(base, .6), .5) };
        this.cols.set(v, c);
      }
      return c;
    }
    paint(i) {
      const { G, C, g, own } = this;
      const x = i % G, y = (i - x) / G, v = own[i];
      const px = x * C, py = y * C;
      g.clearRect(px, py, C, C);
      if (!v) {
        // De zijkant van het land erboven valt over dit lege vakje
        const up = y > 0 ? own[i - G] : 0;
        if (up) { g.fillStyle = this.col(up).side; g.fillRect(px, py, C, Math.round(C * .3)); }
        return;
      }
      const c = this.col(v);
      const same = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < G && ny < G && own[ny * G + nx] === v; };
      g.fillStyle = c.top;
      g.fillRect(px, py, C, C);
      g.fillStyle = c.line;
      g.fillRect(px + C * .5 - .5, py + C * .5 - .5, 1, 1);
      const e = Math.max(1, Math.round(C * .14));
      if (!same(0, -1)) { g.fillStyle = c.hi; g.fillRect(px, py, C, e); }
      if (!same(-1, 0)) { g.fillStyle = c.hi; g.fillRect(px, py, e, C); }
      if (!same(1, 0)) { g.fillStyle = c.lo; g.fillRect(px + C - e, py, e, C); }
      if (!same(0, 1)) { g.fillStyle = c.lo; g.fillRect(px, py + C - e, C, e); }
      // Valt het land erboven over dit vakje? Dan een donkere zijkant bovenaan.
      const up = y > 0 ? own[i - G] : 0;
      if (up && up !== v) { g.fillStyle = this.col(up).side; g.fillRect(px, py, C, Math.round(C * .3)); }
    }
    paintAround(i) {
      const G = this.G, x = i % G;
      this.paint(i);
      if (x > 0) this.paint(i - 1);
      if (x < G - 1) this.paint(i + 1);
      if (i >= G) this.paint(i - G);
      if (i + G < G * G) this.paint(i + G);
    }
    // changes = [index, eigenaar, index, eigenaar, ...]
    apply(changes) {
      for (let j = 0; j < changes.length; j += 2) this.own[changes[j]] = changes[j + 1];
      if (changes.length > 1600) return this.paintAll();
      for (let j = 0; j < changes.length; j += 2) this.paintAround(changes[j]);
    }
    paintAll() {
      this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let i = 0; i < this.own.length; i++) if (this.own[i] || (i >= this.G && this.own[i - this.G])) this.paint(i);
    }
  }

  // ---------- Wat er op het veld gebeurt ----------
  // De server stuurt per ros het vakje waar het nu staat; wij laten het er vloeiend naartoe glijden.
  class Scene {
    constructor(colorOf, C = 10) {
      this.colorOf = colorOf;
      this.C = C;
      this.G = 0;
      this.land = null;
      this.trails = new Map(); // n -> [vakjes]
      this.homes = new Map();  // n -> vakje van de burcht
      this.pos = new Map();    // n -> { fx, fy, tx, ty, t0, dur, d, f }
      this.onEvent = null;
    }
    setWorld(msg) {
      if (!this.land || this.G !== msg.G) {
        this.G = msg.G;
        this.land = new Land(msg.G, this.C, this.colorOf);
      }
      W.unrle(msg.own, this.land.own);
      this.land.cols.clear();
      this.land.paintAll();
      this.trails = new Map(msg.paths.map(([n, list]) => [n, list.slice()]));
      this.homes = new Map(msg.homes);
    }
    recolor() {
      if (!this.land) return;
      this.land.cols.clear();
      this.land.paintAll();
    }
    at(v, t) {
      const k = Math.min(1, (t - v.t0) / v.dur);
      return [v.fx + (v.tx - v.fx) * k, v.fy + (v.ty - v.fy) * k];
    }
    apply(msg, t = performance.now()) {
      const seen = new Set();
      for (const [n, x, y, d, f] of msg.k) {
        seen.add(n);
        let v = this.pos.get(n);
        if (!v) { v = { fx: x, fy: y, tx: x, ty: y, t0: t, dur: 1, d, f }; this.pos.set(n, v); }
        if (x !== v.tx || y !== v.ty) {
          const [cx, cy] = this.at(v, t);
          const far = Math.abs(x - cx) + Math.abs(y - cy) > 2.5;
          v.fx = far ? x : cx;
          v.fy = far ? y : cy;
          v.tx = x;
          v.ty = y;
          v.t0 = t;
          v.dur = (f & 1 ? W.TURBO_MS : W.STEP_MS) * Math.max(1, Math.abs(x - cx) + Math.abs(y - cy)) * .95;
        }
        v.d = d;
        v.f = f;
      }
      for (const n of [...this.pos.keys()]) if (!seen.has(n)) this.pos.delete(n);
      if (!this.land) return;
      for (const e of msg.ev || []) {
        if (e[0] === 't') {
          let l = this.trails.get(e[1]);
          if (!l) { l = []; this.trails.set(e[1], l); }
          l.push(e[2]);
        } else if (e[0] === 'tc') this.trails.delete(e[1]);
        else if (e[0] === 'o') this.land.apply(e[1]);
        else if (e[0] === 'cap') { this.trails.delete(e[1]); this.land.apply(e[2]); }
        else if (e[0] === 'burcht') this.homes.set(e[1], e[2]);
        if (this.onEvent) this.onEvent(e);
      }
    }
    // Waar staat ros n nu (in vakjes, midden van het vakje = +.5)
    head(n, t = performance.now()) {
      const v = this.pos.get(n);
      return v ? this.at(v, t) : null;
    }
    landOf(n) {
      if (!this.land) return 0;
      let c = 0;
      const v = n + 1, own = this.land.own;
      for (let i = 0; i < own.length; i++) if (own[i] === v) c++;
      return c;
    }
  }

  // ---------- Figuren ----------
  // Een burcht van bovenaf: vier torentjes, een kantelenmuur en een banier in de kleur van de ridder.
  function burcht(ctx, x, y, s, color, t) {
    const img = tinted('burcht', color, s * 2.4);
    if (img) {
      const w = s * 2.4, h = w * img.height / img.width;
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    glow(ctx, 0, 0, s * 1.5, color, .35);
    const r = s * .62;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.arc(s * .08, s * .12, r * 1.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5b6680';
    ctx.strokeStyle = '#1b2236';
    ctx.lineWidth = Math.max(1, s * .06);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a3350';
    ctx.beginPath(); ctx.arc(0, 0, r * .66, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#5ee7ff', .7);
    ctx.lineWidth = Math.max(1, s * .05);
    ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, TAU); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = TAU * k / 4 + TAU / 8, tx = Math.cos(a) * r, ty = Math.sin(a) * r;
      ctx.fillStyle = '#6f7b98';
      ctx.beginPath(); ctx.arc(tx, ty, s * .26, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1b2236';
      ctx.stroke();
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(tx, ty, s * .09, 0, TAU); ctx.fill();
    }
    // De banier wappert
    const wv = Math.sin(t * 4) * .15;
    ctx.fillStyle = '#d7dbe6';
    ctx.fillRect(-s * .04, -s * .04, s * .08, s * .08);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * .05);
    ctx.quadraticCurveTo(s * .3, -s * (.15 + wv), s * .6, -s * .05);
    ctx.lineTo(s * .6, s * .2);
    ctx.quadraticCurveTo(s * .3, s * (.1 - wv), 0, s * .2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Een ruiter op een zwevend ros, van bovenaf. a = rijrichting in radialen.
  function ruiter(ctx, x, y, a, s, color, t, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    // Zweefgloed onder het ros
    glow(ctx, 0, 0, s * (1.25 + Math.sin(t * 6) * .05), color, .45);
    if (o.turbo) glow(ctx, -Math.cos(a) * s * .9, -Math.sin(a) * s * .9, s * .9, '#ffe17a', .55);
    const img = tinted('ruiter', color, s * 3.4);
    ctx.rotate(a);
    if (img) {
      const w = s * 3.4, h = w * img.height / img.width;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      // Het ros: een gestroomlijnd zweefschip met stuwers achteraan
      const L = s * 1.05, B = s * .5;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(s * .08, s * .1, L, B, 0, 0, TAU); ctx.fill();
      for (const sy of [-1, 1]) {
        glow(ctx, -L * .95, sy * B * .45, s * .35, o.turbo ? '#ffe17a' : '#7df9ff', .8);
        ctx.fillStyle = '#39425c';
        ctx.fillRect(-L * 1.02, sy * B * .45 - s * .1, s * .3, s * .2);
      }
      const body = ctx.createLinearGradient(0, -B, 0, B);
      body.addColorStop(0, '#c9d3e8'); body.addColorStop(.5, '#7d89a6'); body.addColorStop(1, '#3d4762');
      ctx.fillStyle = body;
      ctx.strokeStyle = '#121828';
      ctx.lineWidth = Math.max(1, s * .07);
      ctx.beginPath();
      ctx.moveTo(L, 0);
      ctx.quadraticCurveTo(L * .5, -B * 1.05, -L * .85, -B * .8);
      ctx.lineTo(-L * .85, B * .8);
      ctx.quadraticCurveTo(L * .5, B * 1.05, L, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Neonstrepen in de kleur van de ridder
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, s * .08);
      ctx.beginPath(); ctx.moveTo(L * .75, -B * .2); ctx.lineTo(-L * .7, -B * .55); ctx.moveTo(L * .75, B * .2); ctx.lineTo(-L * .7, B * .55); ctx.stroke();
      // De ridder: cape, schouders en helm
      ctx.fillStyle = shade(color, -.25);
      ctx.beginPath(); ctx.moveTo(-s * .05, -s * .32); ctx.quadraticCurveTo(-s * .75, -s * (.3 + Math.sin(t * 9) * .05), -s * .8, 0); ctx.quadraticCurveTo(-s * .75, s * .3, -s * .05, s * .32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#aeb8cf';
      ctx.beginPath(); ctx.ellipse(0, 0, s * .26, s * .38, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dfe6f5';
      ctx.beginPath(); ctx.arc(s * .05, 0, s * .2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5ee7ff';
      ctx.fillRect(s * .14, -s * .1, s * .08, s * .2);
      ctx.fillStyle = color;
      ctx.fillRect(-s * .17, -s * .04, s * .22, s * .08);
      // De lans
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = Math.max(1.5, s * .1);
      ctx.beginPath(); ctx.moveTo(s * .05, s * .3); ctx.lineTo(s * 1.45, s * .26); ctx.stroke();
      glow(ctx, s * 1.45, s * .26, s * .3, '#ffe17a', .8);
    }
    ctx.restore();
    if (o.shield) {
      ctx.save();
      ctx.strokeStyle = rgba('#7df9ff', .7 + Math.sin(t * 6) * .2);
      ctx.lineWidth = Math.max(1.5, s * .1);
      ctx.beginPath(); ctx.arc(x, y, s * 1.35, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (o.ghost) {
      ctx.save();
      ctx.font = `800 ${Math.round(s * .9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.ask ? '❓' : '✨', x, y - s * 1.5);
      ctx.restore();
    }
  }

  // ---------- Het hele veld tekenen ----------
  // cam: { x, y } midden in vakjes, s = pixels per vakje, w, h = canvas. o: { roster, me, t, names, flash }
  function render(ctx, scene, cam, o) {
    const { w, h, s } = cam;
    const t = o.t;
    const G = scene.G;
    const ox = w / 2 - cam.x * s, oy = h / 2 - cam.y * s;
    // Grond buiten het veld: donker met sterren
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, w, h);
    if (!scene.land) return;
    // Grond op het veld
    const tl = tile(), tw = tileCells * s;
    const fx0 = Math.max(0, ox), fy0 = Math.max(0, oy), fx1 = Math.min(w, ox + G * s), fy1 = Math.min(h, oy + G * s);
    if (fx1 > fx0 && fy1 > fy0) {
      const i0 = Math.floor((fx0 - ox) / tw), j0 = Math.floor((fy0 - oy) / tw);
      const i1 = Math.ceil((fx1 - ox) / tw), j1 = Math.ceil((fy1 - oy) / tw);
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, oy, G * s, G * s); ctx.clip();
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) ctx.drawImage(tl, ox + i * tw, oy + j * tw, tw + .5, tw + .5);
      ctx.restore();
    }
    // De lichtende rand van het veld
    ctx.save();
    ctx.strokeStyle = rgba('#5ee7ff', .25);
    ctx.lineWidth = Math.max(4, s * .9);
    ctx.strokeRect(ox - s * .45, oy - s * .45, G * s + s * .9, G * s + s * .9);
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = Math.max(1.5, s * .16);
    ctx.strokeRect(ox - s * .1, oy - s * .1, G * s + s * .2, G * s + s * .2);
    ctx.restore();
    // Het land (alleen het stuk dat in beeld is)
    const C = scene.land.C, k = s / C;
    const sx = Math.max(0, -ox / k), sy = Math.max(0, -oy / k);
    const sw = Math.min(G * C - sx, w / k - Math.max(0, ox) / k), sh = Math.min(G * C - sy, h / k - Math.max(0, oy) / k);
    if (sw > 0 && sh > 0) ctx.drawImage(scene.land.canvas, sx, sy, sw, sh, Math.max(0, ox), Math.max(0, oy), sw * k, sh * k);
    // De burchten
    for (const [n, i] of scene.homes) {
      if (scene.land.own[i] !== n + 1) continue;
      const x = ox + ((i % G) + .5) * s, y = oy + (Math.floor(i / G) + .5) * s;
      if (x < -s * 3 || y < -s * 3 || x > w + s * 3 || y > h + s * 3) continue;
      burcht(ctx, x, y, s * 1.15, o.roster.get(n) ? o.roster.get(n).color : '#9fb2d9', t);
    }
    // De lichtsporen: een brede zachte gloed en een felle kern, tot aan de ruiter
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [n, list] of scene.trails) {
      if (!list.length) continue;
      const r = o.roster.get(n), color = r ? r.color : '#9fb2d9';
      const hd = scene.head(n, t * 1000);
      ctx.beginPath();
      for (let j = 0; j < list.length; j++) {
        const i = list[j], x = ox + ((i % G) + .5) * s, y = oy + (Math.floor(i / G) + .5) * s;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (hd) ctx.lineTo(ox + (hd[0] + .5) * s, oy + (hd[1] + .5) * s);
      ctx.strokeStyle = rgba(color, .28);
      ctx.lineWidth = s * .85;
      ctx.stroke();
      ctx.strokeStyle = shade(color, .25);
      ctx.lineWidth = s * .34;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', .75);
      ctx.lineWidth = Math.max(1, s * .1);
      ctx.stroke();
    }
    ctx.restore();
    // De ruiters
    const fs = o.fs || Math.max(10, Math.min(18, s * .55));
    for (const [n, v] of scene.pos) {
      const [hx, hy] = scene.at(v, t * 1000);
      const x = ox + (hx + .5) * s, y = oy + (hy + .5) * s;
      if (x < -s * 3 || y < -s * 3 || x > w + s * 3 || y > h + s * 3) continue;
      const r = o.roster.get(n), color = r ? r.color : '#9fb2d9';
      const ghost = (v.f & 2) || (v.f & 16);
      const a = Math.atan2(W.DIRS[v.d][1], W.DIRS[v.d][0]);
      ruiter(ctx, x, y, a, o.rs || s * .62, color, t, { turbo: v.f & 1, shield: v.f & 8, ghost, ask: v.f & 2, alpha: ghost || (v.f & 4) ? .55 + Math.sin(t * 8) * .15 : 1 });
      if (o.names !== false && r) {
        ctx.save();
        ctx.font = `800 ${fs}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lw = ctx.measureText(r.name).width + fs;
        ctx.fillStyle = 'rgba(6,10,28,.7)';
        const ny = y + Math.max(s * .95, (o.rs || 0) * 1.3);
        AK.roundRect(ctx, x - lw / 2, ny, lw, fs * 1.5, fs * .4);
        ctx.fill();
        ctx.fillStyle = n === o.me ? '#ffc94a' : '#e8f1ff';
        ctx.fillText(r.name, x, ny + fs * .78);
        ctx.restore();
      }
    }
  }

  // Een klein kaartje van het hele veld, met een stip waar jij bent.
  function minimap(ctx, scene, x, y, size, me) {
    if (!scene.land) return;
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,22,.78)';
    ctx.fillRect(x - 3, y - 3, size + 6, size + 6);
    ctx.strokeStyle = rgba('#ffc94a', .7);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
    ctx.drawImage(scene.land.canvas, x, y, size, size);
    if (me) {
      const G = scene.G;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + (me[0] + .5) / G * size, y + (me[1] + .5) / G * size, Math.max(2.5, size * .025), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  return { Land, Scene, render, minimap, ruiter, burcht, tinted, shade, get artGen() { return artGen; } };
})();
