// De Hofschilder tekenen: het holodoek met de neoninkt, de gouden lijst, de runetegels met de hulpletters,
// de zandloper-ring en (op het bord) de grote zaal van de burcht met ramen naar de sterren, banieren en fakkels.
// Alles wat stil staat, tekenen we één keer vooraf; elke frame komen er alleen de fakkels, de inkt en wat lichtjes bij.
// De inkt zelf: afgewerkte lijnen staan in één vooraf getekende laag, enkel de lijnen die nog getekend worden tekenen we opnieuw.
// Gebruikt Glow uit fx.js (en Avatar en Posters als die er zijn).
const HsArt = (() => {
  const { glow, rgba } = Glow;
  const W = 1000, H = 700; // het tekenvel in eigen eenheden (zoals op de server)
  const INK = ['#f4f8ff', '#4fe3ff', '#3d7bff', '#ffd24a', '#ff9a3c', '#ff4d6d', '#ff7ad9', '#b07cff', '#5dff9a', '#b8865a'];
  const INK_NAMES = ['wit', 'cyaan', 'blauw', 'goud', 'oranje', 'rood', 'roze', 'paars', 'groen', 'bruin'];
  const SIZES = [4, 9, 18, 36];

  function rand(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = i => Math.round(((pa >> i) & 255) * (1 - k) + ((pb >> i) & 255) * k);
    return '#' + [c(16), c(8), c(0)].map(n => n.toString(16).padStart(2, '0')).join('');
  };
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // ---------- De inkt ----------
  // Een lijn als vloeiende boog door de middens van de punten.
  function path(g, p, k) {
    g.beginPath();
    if (p.length <= 2) {
      g.moveTo(p[0] * k, p[1] * k);
      g.lineTo(p[0] * k + .01, p[1] * k);
      return;
    }
    g.moveTo(p[0] * k, p[1] * k);
    let i = 2;
    for (; i + 2 < p.length; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
      g.quadraticCurveTo(p[i] * k, p[i + 1] * k, mx * k, my * k);
    }
    g.lineTo(p[i] * k, p[i + 1] * k);
  }

  // Neoninkt: een brede, zachte gloed, de kleur zelf en een hete, lichte kern.
  function stroke(g, s, k, from = 0) {
    const p = from ? s.p.slice(Math.max(0, from - 2)) : s.p;
    if (!p.length) return;
    const size = SIZES[s.s] || 9;
    g.lineCap = g.lineJoin = 'round';
    if (s.c < 0) {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.strokeStyle = '#000';
      g.lineWidth = size * k * 1.6;
      path(g, p, k);
      g.stroke();
      g.restore();
      return;
    }
    const col = INK[s.c] || INK[0];
    g.save();
    g.strokeStyle = col;
    g.globalAlpha = .13;
    g.lineWidth = size * k * 2 + 5 * k;
    path(g, p, k);
    g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = size * k;
    g.stroke();
    if (size >= 9) {
      g.strokeStyle = mixHex(col, '#ffffff', .6);
      g.globalAlpha = .75;
      g.lineWidth = size * k * .32;
      g.stroke();
    }
    g.restore();
  }

  class Ink {
    constructor(res = 1.4) {
      this.k = res;
      this.layer = canvas(W * res, H * res);
      this.g = this.layer.getContext('2d');
      this.strokes = [];
      this.live = new Map(); // lijn-id -> laatste update (ms) van lijnen die nog getekend worden
      this.version = 0;
    }
    clear() {
      this.strokes = [];
      this.live.clear();
      this.g.clearRect(0, 0, this.layer.width, this.layer.height);
      this.version++;
    }
    // Alles opnieuw (bij het binnenkomen of na "terug").
    set(list) {
      this.clear();
      for (const s of list || []) this.strokes.push({ i: s.i, c: s.c, s: s.s, p: [...s.p], e: 1 });
      this.rebake();
    }
    rebake() {
      this.g.clearRect(0, 0, this.layer.width, this.layer.height);
      for (const s of this.strokes) if (!this.live.has(s.i)) stroke(this.g, s, this.k);
      this.version++;
    }
    // Een stukje van een lijn erbij (van onszelf of van de server).
    add(part) {
      if (part.wis) return this.clear();
      if (part.undo !== undefined) return this.undo(part.undo);
      let s = this.strokes.find(x => x.i === part.i);
      const fresh = !s;
      if (!s) {
        s = { i: part.i, c: part.c, s: part.s, p: [] };
        this.strokes.push(s);
      }
      const from = s.p.length;
      s.p.push(...part.p);
      if (s.c < 0) {
        // De gom werkt meteen op de vaste laag.
        stroke(this.g, s, this.k, fresh ? 0 : from);
        if (part.e) s.e = 1;
      } else if (s.e && !fresh) {
        stroke(this.g, s, this.k, from); // na het afwerken nog een stukje: gewoon erbij tekenen
      } else if (part.e) {
        s.e = 1;
        this.live.delete(s.i);
        stroke(this.g, s, this.k);
      } else this.live.set(s.i, performance.now());
      this.version++;
    }
    undo(id) {
      const i = this.strokes.findIndex(s => s.i === id);
      if (i < 0) return;
      this.strokes.splice(i, 1);
      this.live.delete(id);
      this.rebake();
    }
    // Lijnen die al even niet meer bewogen: toch vastzetten (als het "klaar"-bericht verloren ging).
    settle(now) {
      for (const [id, at] of this.live) {
        if (now - at < 2500) continue;
        this.live.delete(id);
        const s = this.strokes.find(x => x.i === id);
        if (s) { s.e = 1; stroke(this.g, s, this.k); }
        this.version++;
      }
    }
    // Teken de inkt in rechthoek (x, y, w, h).
    draw(ctx, x, y, w, h) {
      ctx.drawImage(this.layer, x, y, w, h);
      if (!this.live.size) return;
      ctx.save();
      ctx.translate(x, y);
      const k = w / W;
      for (const id of this.live.keys()) {
        const s = this.strokes.find(q => q.i === id);
        if (s) stroke(ctx, s, k);
      }
      ctx.restore();
    }
  }

  // ---------- Het holodoek ----------
  // Donkerblauw glas met een fijn raster, lichte randen en een zachte gloed in het midden.
  function slate(w, h) {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0d1b38');
    bg.addColorStop(.55, '#0a1530');
    bg.addColorStop(1, '#070f24');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const mid = g.createRadialGradient(w / 2, h * .45, 0, w / 2, h * .45, Math.max(w, h) * .62);
    mid.addColorStop(0, 'rgba(70,140,255,.14)');
    mid.addColorStop(1, 'rgba(70,140,255,0)');
    g.fillStyle = mid;
    g.fillRect(0, 0, w, h);
    // Fijn raster, om de vijf lijnen iets sterker.
    const step = w / 40;
    for (let i = 1; i < 40; i++) {
      g.fillStyle = i % 5 ? 'rgba(110,190,255,.05)' : 'rgba(110,190,255,.1)';
      g.fillRect(Math.round(i * step), 0, 1, h);
    }
    for (let j = 1; j * step < h; j++) {
      g.fillStyle = j % 5 ? 'rgba(110,190,255,.05)' : 'rgba(110,190,255,.1)';
      g.fillRect(0, Math.round(j * step), w, 1);
    }
    // Hoekmerken zoals op een scherm.
    g.strokeStyle = 'rgba(94,231,255,.45)';
    g.lineWidth = Math.max(1.5, w * .003);
    const m = w * .025, L = w * .05;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y);
      g.stroke();
    }
    // Rand: iets lichter, alsof het glas licht vangt.
    const edge = g.createLinearGradient(0, 0, w, h);
    edge.addColorStop(0, 'rgba(160,220,255,.1)');
    edge.addColorStop(.4, 'rgba(160,220,255,0)');
    g.fillStyle = edge;
    g.fillRect(0, 0, w, h);
    return c;
  }

  // ---------- De gouden lijst ----------
  // Een lijst rond een binnenvlak van iw x ih met dikte t. Gouden profiel, hoekrozetten met een kristal,
  // een kroon met runesteen bovenaan en een cyaan neonrand aan de binnenkant.
  function frame(iw, ih, t) {
    const pad = t * .9; // ruimte voor de kroon en de gloed
    const c = canvas(iw + 2 * t + 2 * pad, ih + 2 * t + 2 * pad + t * .8);
    const g = c.getContext('2d');
    const ox = pad, oy = pad + t * .8;
    const W2 = iw + 2 * t, H2 = ih + 2 * t;
    // Schaduw achter de lijst
    g.save();
    g.shadowColor = 'rgba(0,0,0,.6)';
    g.shadowBlur = t * .9;
    g.shadowOffsetY = t * .35;
    g.fillStyle = '#2a1d08';
    g.fillRect(ox, oy, W2, H2);
    g.restore();
    g.clearRect(ox + t, oy + t, iw, ih); // het doek zelf blijft doorzichtig
    // Profiel: vier trapezia met een verloop van buiten naar binnen.
    const sides = [
      [[0, 0], [W2, 0], [W2 - t, t], [t, t], 'h', 0],
      [[0, H2], [W2, H2], [W2 - t, H2 - t], [t, H2 - t], 'h', 1],
      [[0, 0], [0, H2], [t, H2 - t], [t, t], 'v', 0],
      [[W2, 0], [W2, H2], [W2 - t, H2 - t], [W2 - t, t], 'v', 1],
    ];
    for (const [a, b, cc, d, dir, far] of sides) {
      const gr = dir === 'h'
        ? g.createLinearGradient(0, oy + (far ? H2 : 0), 0, oy + (far ? H2 - t : t))
        : g.createLinearGradient(ox + (far ? W2 : 0), 0, ox + (far ? W2 - t : t), 0);
      const lightSide = !far; // licht van linksboven
      gr.addColorStop(0, lightSide ? '#7a5512' : '#4a320a');
      gr.addColorStop(.12, lightSide ? '#ffe9a3' : '#c9952e');
      gr.addColorStop(.3, lightSide ? '#e8b445' : '#a8771e');
      gr.addColorStop(.5, lightSide ? '#8f6418' : '#6b4a10');
      gr.addColorStop(.62, lightSide ? '#f5cf6a' : '#d9a640');
      gr.addColorStop(.82, lightSide ? '#b8862a' : '#8a5f16');
      gr.addColorStop(1, '#3b2706');
      g.fillStyle = gr;
      g.beginPath();
      for (const [i, p] of [a, b, cc, d].entries()) g[i ? 'lineTo' : 'moveTo'](ox + p[0], oy + p[1]);
      g.closePath();
      g.fill();
    }
    // Hoeknaden
    g.strokeStyle = 'rgba(40,25,4,.7)';
    g.lineWidth = Math.max(1, t * .04);
    for (const [x0, y0, x1, y1] of [[0, 0, t, t], [W2, 0, W2 - t, t], [0, H2, t, H2 - t], [W2, H2, W2 - t, H2 - t]]) {
      g.beginPath(); g.moveTo(ox + x0, oy + y0); g.lineTo(ox + x1, oy + y1); g.stroke();
    }
    // Kraaltjes langs het midden van het profiel
    g.fillStyle = 'rgba(255,240,190,.55)';
    const beads = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / (t * .55));
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.beginPath();
        g.arc(ox + x0 + (x1 - x0) * k, oy + y0 + (y1 - y0) * k, t * .07, 0, Math.PI * 2);
        g.fill();
      }
    };
    beads(t * 1.2, t * .5, W2 - t * 1.2, t * .5);
    beads(t * 1.2, H2 - t * .5, W2 - t * 1.2, H2 - t * .5);
    beads(t * .5, t * 1.2, t * .5, H2 - t * 1.2);
    beads(W2 - t * .5, t * 1.2, W2 - t * .5, H2 - t * 1.2);
    // Binnenrand: donker groefje en dan cyaan neon.
    g.strokeStyle = '#1c1204';
    g.lineWidth = t * .14;
    g.strokeRect(ox + t - t * .07, oy + t - t * .07, iw + t * .14, ih + t * .14);
    for (const [lw, a] of [[t * .5, .12], [t * .22, .35], [t * .07, 1]]) {
      g.strokeStyle = rgba('#5ee7ff', a);
      g.lineWidth = lw;
      g.strokeRect(ox + t + t * .04, oy + t + t * .04, iw - t * .08, ih - t * .08);
    }
    // Hoekrozetten met kristal
    const rosette = (x, y, r) => {
      const gr = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      gr.addColorStop(0, '#fff3c4');
      gr.addColorStop(.45, '#e0a93a');
      gr.addColorStop(1, '#5a3d08');
      g.fillStyle = gr;
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, rad = i % 2 ? r * .74 : r;
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = '#3b2706';
      g.lineWidth = Math.max(1, r * .06);
      g.stroke();
      glow(g, x, y, r * 1.5, '#38e1ff', .55);
      const cr = g.createRadialGradient(x - r * .12, y - r * .15, 0, x, y, r * .42);
      cr.addColorStop(0, '#effeff');
      cr.addColorStop(.4, '#5ee7ff');
      cr.addColorStop(1, '#0a6fa8');
      g.fillStyle = cr;
      g.beginPath();
      for (let i = 0; i < 6; i++) g[i ? 'lineTo' : 'moveTo'](x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * r * .42, y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * r * .42);
      g.closePath();
      g.fill();
    };
    const rr0 = t * .78;
    rosette(ox + t / 2, oy + t / 2, rr0);
    rosette(ox + W2 - t / 2, oy + t / 2, rr0);
    rosette(ox + t / 2, oy + H2 - t / 2, rr0);
    rosette(ox + W2 - t / 2, oy + H2 - t / 2, rr0);
    // Middenornamenten links en rechts
    for (const x of [ox + t / 2, ox + W2 - t / 2]) {
      g.fillStyle = '#c99a2e';
      g.beginPath();
      g.ellipse(x, oy + H2 / 2, t * .34, t * .7, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4a320a';
      g.lineWidth = Math.max(1, t * .05);
      g.stroke();
      glow(g, x, oy + H2 / 2, t * .7, '#ffc94a', .35);
    }
    // Kroon bovenaan met runesteen
    const cx = ox + W2 / 2, cy = oy;
    const cw = Math.min(W2 * .3, t * 6);
    g.fillStyle = '#2b1d05';
    const crown = () => {
      g.beginPath();
      g.moveTo(cx - cw / 2, cy + t * .5);
      g.lineTo(cx - cw / 2 + cw * .06, cy - t * .25);
      g.quadraticCurveTo(cx - cw * .3, cy - t * .55, cx - cw * .2, cy - t * .1);
      g.lineTo(cx - cw * .12, cy - t * .7);
      g.quadraticCurveTo(cx, cy - t * 1.05, cx + cw * .12, cy - t * .7);
      g.lineTo(cx + cw * .2, cy - t * .1);
      g.quadraticCurveTo(cx + cw * .3, cy - t * .55, cx + cw / 2 - cw * .06, cy - t * .25);
      g.lineTo(cx + cw / 2, cy + t * .5);
      g.closePath();
    };
    crown();
    const cg = g.createLinearGradient(0, cy - t, 0, cy + t * .5);
    cg.addColorStop(0, '#fff0b8');
    cg.addColorStop(.35, '#e6b040');
    cg.addColorStop(.7, '#9c6d16');
    cg.addColorStop(1, '#5a3d08');
    g.fillStyle = cg;
    g.fill();
    g.strokeStyle = '#3b2706';
    g.lineWidth = Math.max(1, t * .06);
    g.stroke();
    // Runesteen in de kroon: een penseel-rune
    const gy = cy - t * .18, gr = t * .42;
    glow(g, cx, gy, gr * 2.6, '#ff7ad9', .45);
    const jg = g.createRadialGradient(cx - gr * .3, gy - gr * .3, 0, cx, gy, gr);
    jg.addColorStop(0, '#ffe6f6');
    jg.addColorStop(.45, '#ff7ad9');
    jg.addColorStop(1, '#7a1a5c');
    g.fillStyle = jg;
    g.beginPath();
    g.moveTo(cx, gy - gr); g.lineTo(cx + gr * .8, gy); g.lineTo(cx, gy + gr); g.lineTo(cx - gr * .8, gy);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = Math.max(1, gr * .1);
    g.beginPath(); g.moveTo(cx - gr * .25, gy + gr * .35); g.lineTo(cx + gr * .25, gy - gr * .35); g.stroke();
    return { canvas: c, x: ox + t, y: oy + t }; // waar het binnenvlak begint
  }

  // ---------- Runetegels met de hulpletters ----------
  const tileCache = new Map();
  function tile(size, open) {
    const key = `${Math.round(size)}|${open}`;
    if (tileCache.has(key)) return tileCache.get(key);
    const s = Math.round(size), c = canvas(s, s * 1.2);
    const g = c.getContext('2d');
    const h = s * 1.2;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, open ? '#3a4560' : '#2a3247');
    gr.addColorStop(1, open ? '#1c2336' : '#141a29');
    g.fillStyle = gr;
    rr(g, s * .04, s * .04, s * .92, h * .92, s * .14);
    g.fill();
    g.strokeStyle = open ? '#e8b445' : '#4b5672';
    g.lineWidth = Math.max(1, s * .06);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)';
    rr(g, s * .1, s * .1, s * .8, h * .22, s * .08);
    g.fill();
    // Kras en spikkels in de steen
    const r = rand(s * 7 + (open ? 3 : 1));
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 6; i++) g.fillRect(s * (.15 + r() * .7), h * (.2 + r() * .65), Math.max(1, s * .04), Math.max(1, s * .04));
    if (!open) {
      g.fillStyle = 'rgba(94,231,255,.5)';
      g.fillRect(s * .26, h * .74, s * .48, Math.max(2, s * .06));
    }
    tileCache.set(key, c);
    return c;
  }
  // Tekent het begrip als rij runetegels, gecentreerd op cx. Geeft de breedte terug.
  function hint(ctx, text, cx, y, maxW, maxSize = 54) {
    const chars = [...(text || '')];
    if (!chars.length) return 0;
    const n = chars.length;
    const size = Math.max(14, Math.min(maxSize, (maxW / (n * 1.08))));
    const gap = size * .08;
    const total = n * size + (n - 1) * gap;
    let x = cx - total / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(size * .62)}px Cinzel, Georgia, serif`;
    for (const ch of chars) {
      if (ch === ' ') { x += size + gap; continue; }
      const open = ch !== '_';
      if (/[\p{L}\p{N}_]/u.test(ch)) {
        ctx.drawImage(tile(size, open), x, y);
        if (open) {
          glow(ctx, x + size / 2, y + size * .62, size * .9, '#ffc94a', .35);
          ctx.fillStyle = '#ffe7a0';
          ctx.fillText(ch.toUpperCase(), x + size / 2, y + size * .64);
        }
      } else {
        ctx.fillStyle = '#ffe7a0';
        ctx.fillText(ch, x + size / 2, y + size * .64);
      }
      x += size + gap;
    }
    ctx.restore();
    return total;
  }

  // ---------- De tijdring ----------
  function ring(ctx, x, y, r, k, label, low) {
    ctx.save();
    const bg = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r * 1.1);
    bg.addColorStop(0, '#1b2742');
    bg.addColorStop(1, '#070d1c');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * .14;
    ctx.strokeStyle = '#c99a2e';
    ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = r * .16;
    ctx.beginPath(); ctx.arc(x, y, r * .82, 0, Math.PI * 2); ctx.stroke();
    const col = low ? '#ff4d6d' : k < .35 ? '#ffb347' : '#5ee7ff';
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * .82, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, k))); ctx.stroke();
    const a = -Math.PI / 2 + Math.PI * 2 * k;
    glow(ctx, x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82, r * .5, col, .9);
    // Tikjes
    ctx.strokeStyle = 'rgba(255,224,150,.55)';
    ctx.lineWidth = Math.max(1, r * .03);
    for (let i = 0; i < 12; i++) {
      const b = i * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(b) * r * 1.0, y + Math.sin(b) * r * 1.0);
      ctx.lineTo(x + Math.cos(b) * r * 1.12, y + Math.sin(b) * r * 1.12);
      ctx.stroke();
    }
    ctx.fillStyle = low ? '#ff8fa3' : '#eaf6ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(r * .62)}px Orbitron, sans-serif`;
    ctx.fillText(label, x, y + r * .04);
    ctx.restore();
  }

  // ---------- Een fakkel (elke frame) ----------
  function torch(ctx, x, y, s, t, seed = 0) {
    const f = Math.sin(t * 9 + seed) * .5 + Math.sin(t * 13.7 + seed * 2) * .3;
    glow(ctx, x, y - s * .2, s * (4.2 + f * .3), '#ff9a3c', .3);
    glow(ctx, x, y - s * .3, s * 1.8, '#ffd27a', .55);
    ctx.save();
    for (const [col, k, dy] of [['#ff6a1a', 1, 0], ['#ffb347', .7, .1], ['#fff1b8', .38, .2]]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      const hgt = s * (1.25 + f * .18) * k, wid = s * .42 * k;
      ctx.moveTo(x - wid, y);
      ctx.quadraticCurveTo(x - wid * 1.1, y - hgt * .5, x + f * s * .12, y - hgt - s * dy);
      ctx.quadraticCurveTo(x + wid * 1.1, y - hgt * .5, x + wid, y);
      ctx.quadraticCurveTo(x, y + wid * .6, x - wid, y);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- De grote zaal (bord) ----------
  // L: layout met frame-rechthoek. Ramen naar de sterren, stenen muur met neonleidingen, banieren, vloer.
  function hall(w, h, L) {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const r = rand(1234);
    const floorY = L.floorY;
    // Muur
    const wall = g.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, '#141a2b');
    wall.addColorStop(1, '#232a3d');
    g.fillStyle = wall;
    g.fillRect(0, 0, w, floorY);
    // Stenen in verband
    const bh = Math.max(14, h * .045), bw = bh * 2.2;
    for (let row = 0, y = 0; y < floorY; row++, y += bh) {
      for (let x = (row % 2) * -bw / 2; x < w; x += bw) {
        const v = r();
        const l = 26 + v * 16;
        g.fillStyle = `hsl(${222 + r() * 10}, ${12 + r() * 8}%, ${l * .62}%)`;
        g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,255,255,.05)';
        g.fillRect(x + 1.5, y + 1.5, bw - 3, Math.max(1, bh * .12));
        g.fillStyle = 'rgba(0,0,0,.22)';
        g.fillRect(x + 1.5, y + bh - 1.5 - bh * .12, bw - 3, bh * .12);
        if (v > .82) { // barstje
          g.strokeStyle = 'rgba(0,0,0,.35)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + bw * r(), y + 2);
          g.lineTo(x + bw * r(), y + bh * .6);
          g.lineTo(x + bw * r(), y + bh - 2);
          g.stroke();
        }
      }
    }
    // Ramen naar de ruimte, links en rechts (gotische boog)
    const winW = Math.min(w * .1, h * .17), winH = floorY * .52, winY = floorY * .1;
    const wins = [];
    for (const wx of L.windows) {
      wins.push(wx);
      const x = wx - winW / 2;
      g.save();
      g.beginPath();
      g.moveTo(x, winY + winH);
      g.lineTo(x, winY + winW * .5);
      g.quadraticCurveTo(x, winY, x + winW / 2, winY - winW * .2);
      g.quadraticCurveTo(x + winW, winY, x + winW, winY + winW * .5);
      g.lineTo(x + winW, winY + winH);
      g.closePath();
      g.save();
      g.clip();
      const sky = g.createLinearGradient(0, winY, 0, winY + winH);
      sky.addColorStop(0, '#120a35');
      sky.addColorStop(.6, '#1d1150');
      sky.addColorStop(1, '#3b1d6e');
      g.fillStyle = sky;
      g.fillRect(x, winY - winW, winW, winH + winW);
      glow(g, x + winW * .3, winY + winH * .3, winW * .9, '#b07cff', .45);
      glow(g, x + winW * .7, winY + winH * .65, winW * .7, '#4fe3ff', .3);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(255,255,255,${.4 + r() * .6})`;
        const sz = r() < .15 ? 2 : 1;
        g.fillRect(x + r() * winW, winY - winW * .2 + r() * winH, sz, sz);
      }
      // Een planeet met ring in het linkerraam
      if (wx === L.windows[0]) {
        const px = x + winW * .62, py = winY + winH * .28, pr = winW * .2;
        const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, 0, px, py, pr);
        pg.addColorStop(0, '#ffd9a8'); pg.addColorStop(1, '#a8452c');
        g.fillStyle = pg;
        g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,220,170,.7)';
        g.lineWidth = Math.max(1, pr * .12);
        g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * .45, -.3, 0, Math.PI * 2); g.stroke();
      } else {
        // Een maan in het rechterraam
        const px = x + winW * .35, py = winY + winH * .22, pr = winW * .15;
        glow(g, px, py, pr * 3, '#cfe8ff', .4);
        g.fillStyle = '#e9f2ff';
        g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1d1150';
        g.beginPath(); g.arc(px + pr * .45, py - pr * .2, pr * .9, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      // Glas-in-lood: ijzeren roeden
      g.strokeStyle = '#0b0e17';
      g.lineWidth = Math.max(2, winW * .035);
      g.stroke();
      g.beginPath();
      g.moveTo(x + winW / 2, winY - winW * .2); g.lineTo(x + winW / 2, winY + winH);
      for (let k = 1; k < 4; k++) { g.moveTo(x, winY + winH * k / 4 + winW * .1); g.lineTo(x + winW, winY + winH * k / 4 + winW * .1); }
      g.lineWidth = Math.max(1, winW * .02);
      g.stroke();
      // Stenen omlijsting en vensterbank
      g.strokeStyle = '#4a5370';
      g.lineWidth = Math.max(3, winW * .09);
      g.beginPath();
      g.moveTo(x - winW * .06, winY + winH);
      g.lineTo(x - winW * .06, winY + winW * .5);
      g.quadraticCurveTo(x - winW * .06, winY - winW * .08, x + winW / 2, winY - winW * .3);
      g.quadraticCurveTo(x + winW * 1.06, winY - winW * .08, x + winW * 1.06, winY + winW * .5);
      g.lineTo(x + winW * 1.06, winY + winH);
      g.stroke();
      g.fillStyle = '#56607e';
      g.fillRect(x - winW * .16, winY + winH, winW * 1.32, winW * .1);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x - winW * .16, winY + winH + winW * .1, winW * 1.32, winW * .05);
      // Paarse lichtval op de muur onder het raam
      glow(g, wx, winY + winH * 1.1, winW * 1.2, '#7a4dff', .18, .5);
      g.restore();
    }
    // Neonleiding langs de muur, met knooppunten
    const pipeY = floorY * .78;
    g.fillStyle = '#0c1220';
    g.fillRect(0, pipeY - h * .006, w, h * .012);
    g.fillStyle = 'rgba(94,231,255,.85)';
    g.fillRect(0, pipeY - 1, w, 2);
    glow(g, w / 2, pipeY, w * .6, '#38e1ff', .08, .05);
    for (let x = w * .04; x < w; x += w * .09) {
      g.fillStyle = '#3a4560';
      g.fillRect(x - h * .008, pipeY - h * .014, h * .016, h * .028);
      glow(g, x, pipeY, h * .02, '#5ee7ff', .8);
    }
    // Banieren naast de lijst
    for (const [bx, col] of L.banners) {
      const bw2 = Math.min(w * .055, h * .09), bh2 = floorY * .46, by = floorY * .06;
      g.fillStyle = '#6b4a10';
      g.fillRect(bx - bw2 * .65, by - bh2 * .03, bw2 * 1.3, Math.max(3, bh2 * .025));
      const bg2 = g.createLinearGradient(bx - bw2 / 2, 0, bx + bw2 / 2, 0);
      bg2.addColorStop(0, mixHex(col, '#000000', .45));
      bg2.addColorStop(.5, col);
      bg2.addColorStop(1, mixHex(col, '#000000', .5));
      g.fillStyle = bg2;
      g.beginPath();
      g.moveTo(bx - bw2 / 2, by);
      g.lineTo(bx + bw2 / 2, by);
      g.lineTo(bx + bw2 / 2, by + bh2);
      g.lineTo(bx, by + bh2 * .88);
      g.lineTo(bx - bw2 / 2, by + bh2);
      g.closePath();
      g.fill();
      g.strokeStyle = '#e0b04a';
      g.lineWidth = Math.max(1.5, bw2 * .05);
      g.stroke();
      // Wapen: een penseel gekruist met een zwaard
      const cy2 = by + bh2 * .42, s = bw2 * .32;
      g.lineCap = 'round';
      g.strokeStyle = '#ffd76a';
      g.lineWidth = Math.max(2, s * .16);
      g.beginPath(); g.moveTo(bx - s, cy2 + s); g.lineTo(bx + s, cy2 - s); g.stroke();
      g.strokeStyle = '#dfe8f5';
      g.beginPath(); g.moveTo(bx + s, cy2 + s); g.lineTo(bx - s, cy2 - s); g.stroke();
      g.fillStyle = '#5ee7ff';
      g.beginPath(); g.arc(bx + s, cy2 - s, s * .22, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,224,150,.6)';
      g.lineWidth = Math.max(1, bw2 * .03);
      g.strokeRect(bx - bw2 * .36, by + bh2 * .08, bw2 * .72, bh2 * .66);
    }
    // Fakkelhouders (de vlam zelf komt elke frame)
    for (const [tx, ty] of L.torches) {
      const s = h * .03;
      g.fillStyle = '#3a3f4e';
      g.fillRect(tx - s * .5, ty + s * .3, s, s * .25);
      g.fillStyle = '#5b5f73';
      g.beginPath();
      g.moveTo(tx - s * .55, ty); g.lineTo(tx + s * .55, ty); g.lineTo(tx + s * .2, ty + s * 1.1); g.lineTo(tx - s * .2, ty + s * 1.1);
      g.closePath();
      g.fill();
      g.fillStyle = '#2a2d3c';
      g.fillRect(tx - s * .12, ty + s * 1.1, s * .24, s * 1.2);
      glow(g, tx, ty, s * 6, '#ff9a3c', .16);
    }
    // Vloer: tegels in perspectief
    const fl = g.createLinearGradient(0, floorY, 0, h);
    fl.addColorStop(0, '#2a2433');
    fl.addColorStop(1, '#120f18');
    g.fillStyle = fl;
    g.fillRect(0, floorY, w, h - floorY);
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const y = floorY + (h - floorY) * Math.pow(i / 7, 1.6);
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let i = -14; i <= 14; i++) {
      g.beginPath();
      g.moveTo(w / 2 + i * w * .035, floorY);
      g.lineTo(w / 2 + i * w * .14, h);
      g.stroke();
    }
    // Rode loper naar de lijst
    g.fillStyle = 'rgba(140,24,40,.75)';
    g.beginPath();
    g.moveTo(w / 2 - w * .07, floorY); g.lineTo(w / 2 + w * .07, floorY);
    g.lineTo(w / 2 + w * .2, h); g.lineTo(w / 2 - w * .2, h);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(224,176,74,.7)';
    g.lineWidth = Math.max(1.5, h * .004);
    g.stroke();
    // Plint
    g.fillStyle = '#39405a';
    g.fillRect(0, floorY - h * .012, w, h * .016);
    g.fillStyle = 'rgba(255,255,255,.1)';
    g.fillRect(0, floorY - h * .012, w, 1);
    // Licht van de fakkels en het doek op de vloer
    for (const [tx] of L.torches) glow(g, tx, floorY + (h - floorY) * .3, h * .2, '#ff9a3c', .15, .35);
    glow(g, w / 2, floorY + (h - floorY) * .2, L.fw * .6, '#38e1ff', .18, .25);
    // Vignet
    const vg = g.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .35, w / 2, h * .45, Math.hypot(w, h) * .6);
    vg.addColorStop(0, 'rgba(2,3,10,0)');
    vg.addColorStop(1, 'rgba(2,3,10,.6)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    return c;
  }

  // ---------- De ezel / projector onder de lijst ----------
  function easel(g, cx, top, bottom, fw) {
    const legW = Math.max(4, fw * .022);
    g.save();
    g.lineCap = 'round';
    for (const [x0, x1] of [[cx - fw * .3, cx - fw * .4], [cx + fw * .3, cx + fw * .4]]) {
      const gr = g.createLinearGradient(x0 - legW, 0, x0 + legW, 0);
      gr.addColorStop(0, '#3b2706'); gr.addColorStop(.5, '#c99a2e'); gr.addColorStop(1, '#5a3d08');
      g.strokeStyle = gr;
      g.lineWidth = legW;
      g.beginPath(); g.moveTo(x0, top); g.lineTo(x1, bottom); g.stroke();
    }
    // Projectorsokkel in het midden
    const pw = fw * .22, ph = (bottom - top) * .55;
    const pg = g.createLinearGradient(0, bottom - ph, 0, bottom);
    pg.addColorStop(0, '#4a5370'); pg.addColorStop(1, '#1a1f2e');
    g.fillStyle = pg;
    g.beginPath();
    g.moveTo(cx - pw * .35, bottom - ph); g.lineTo(cx + pw * .35, bottom - ph);
    g.lineTo(cx + pw / 2, bottom); g.lineTo(cx - pw / 2, bottom);
    g.closePath();
    g.fill();
    g.strokeStyle = '#c99a2e';
    g.lineWidth = Math.max(1.5, fw * .005);
    g.stroke();
    g.fillStyle = '#5ee7ff';
    g.fillRect(cx - pw * .25, bottom - ph * .55, pw * .5, Math.max(2, ph * .06));
    glow(g, cx, bottom - ph * .52, pw * .6, '#38e1ff', .6, .4);
    g.restore();
  }

  // ---------- De hofschilder zelf ----------
  const fallback = new Map();
  // De ridder van de leerling (of een standaardridder), groot en scherp, met een lichtend penseel.
  // We tekenen hem op zijn echte grootte op het bord (niet klein en dan uitvergroot), anders worden de randen trapjes.
  function painter(ctx, x, footY, hgt, name, color, t, active) {
    let spr = null;
    if (typeof Avatar !== 'undefined') {
      let av = Avatar.byName(name);
      if (!av) { // nog geen eigen ridder: een vaste willekeurige per naam
        if (!fallback.has(name)) fallback.set(name, Avatar.random());
        av = fallback.get(name);
      }
      try { spr = Avatar.sprite(av, { k: Avatar.kFor(hgt / 17) }); } catch { spr = null; }
    }
    const bob = active ? Math.sin(t * 3) * hgt * .01 : 0;
    glow(ctx, x, footY, hgt * .5, color || '#5ee7ff', .3, .2);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(x, footY, hgt * .3, hgt * .05, 0, 0, Math.PI * 2); ctx.fill();
    if (spr) {
      const sw = hgt * 12 / 17;
      ctx.drawImage(spr, x - sw / 2, footY - hgt + bob, sw, hgt);
    }
    // Het penseel, schuin omhoog naar het doek, met een lichtende punt.
    const hx = x + hgt * .3, hy = footY - hgt * .48 + bob;
    const wig = active ? Math.sin(t * 7) * hgt * .03 : 0;
    const tx = hx + hgt * .32, ty = hy - hgt * .3 + wig;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4a10';
    ctx.lineWidth = Math.max(2, hgt * .035);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#e0b04a';
    ctx.lineWidth = Math.max(2, hgt * .045);
    const fx = hx + (tx - hx) * .72, fy = hy + (ty - hy) * .72;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(hx + (tx - hx) * .8, hy + (ty - hy) * .8); ctx.stroke();
    const tip = color || '#5ee7ff';
    glow(ctx, tx, ty, hgt * .14, tip, .9);
    ctx.fillStyle = mixHex(tip, '#ffffff', .5);
    ctx.beginPath(); ctx.arc(tx, ty, Math.max(2, hgt * .022), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return { tx, ty };
  }

  // Een naambordje: donker metaal met een gouden rand.
  function plaque(ctx, x, y, text, sub, size) {
    ctx.save();
    ctx.font = `800 ${Math.round(size)}px Cinzel, Georgia, serif`;
    const tw = Math.max(ctx.measureText(text).width, sub ? ctx.measureText(sub).width * .62 : 0);
    const w = tw + size * 1.6, h = size * (sub ? 2.3 : 1.7);
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#2b3247'); gr.addColorStop(1, '#141826');
    ctx.fillStyle = gr;
    rr(ctx, x - w / 2, y, w, h, size * .3);
    ctx.fill();
    ctx.strokeStyle = '#e0b04a';
    ctx.lineWidth = Math.max(1.5, size * .08);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (sub) {
      ctx.fillStyle = '#9fd8ff';
      ctx.font = `700 ${Math.round(size * .55)}px Orbitron, sans-serif`;
      ctx.fillText(sub, x, y + size * .62);
      ctx.fillStyle = '#ffe7a0';
      ctx.font = `800 ${Math.round(size)}px Cinzel, Georgia, serif`;
      ctx.fillText(text, x, y + size * 1.48);
    } else {
      ctx.fillStyle = '#ffe7a0';
      ctx.fillText(text, x, y + h / 2 + size * .04);
    }
    ctx.restore();
  }

  // Een perkamentrol met het woord (bij het onthullen).
  function scroll(ctx, cx, cy, w, word, uitleg, k) {
    const e = 1 - Math.pow(1 - Math.min(1, k), 3);
    const ww = w * (.25 + .75 * e);
    const size = Math.min(w * .1, w * 1.3 / Math.max(6, word.length));
    const h = size * (uitleg ? 2.9 : 1.9);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 3);
    glow(ctx, cx, cy, ww * .7, '#ffc94a', .35, .5);
    const pg = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    pg.addColorStop(0, '#f6e7bf'); pg.addColorStop(.5, '#e9d29a'); pg.addColorStop(1, '#c9a964');
    ctx.fillStyle = pg;
    ctx.fillRect(cx - ww / 2, cy - h / 2, ww, h);
    ctx.fillStyle = 'rgba(120,80,20,.25)';
    ctx.fillRect(cx - ww / 2, cy - h / 2, ww, h * .06);
    ctx.fillRect(cx - ww / 2, cy + h / 2 - h * .06, ww, h * .06);
    for (const s of [-1, 1]) {
      const rx = cx + s * ww / 2;
      const rg = ctx.createLinearGradient(rx - h * .14, 0, rx + h * .14, 0);
      rg.addColorStop(0, '#8a6514'); rg.addColorStop(.5, '#f2d58a'); rg.addColorStop(1, '#6b4a10');
      ctx.fillStyle = rg;
      rr(ctx, rx - h * .14, cy - h * .62, h * .28, h * 1.24, h * .12);
      ctx.fill();
      ctx.fillStyle = '#c99a2e';
      ctx.beginPath(); ctx.arc(rx, cy - h * .66, h * .1, 0, Math.PI * 2); ctx.arc(rx, cy + h * .66, h * .1, 0, Math.PI * 2); ctx.fill();
    }
    if (e > .6) {
      ctx.globalAlpha = Math.min(1, (e - .6) / .4);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4a2a06';
      ctx.font = `900 ${Math.round(size)}px Cinzel, Georgia, serif`;
      ctx.fillText(word.toUpperCase(), cx, cy - (uitleg ? size * .45 : 0));
      if (uitleg) {
        ctx.fillStyle = '#5a3d10';
        let fs = size * .34;
        ctx.font = `600 ${Math.round(fs)}px "Exo 2", sans-serif`;
        let line = uitleg;
        while (ctx.measureText(line).width > ww * .86 && line.length > 10) line = line.slice(0, -2);
        if (line !== uitleg) line = line.trimEnd() + '…';
        ctx.fillText(line, cx, cy + size * .75);
      }
    }
    ctx.restore();
  }

  return { W, H, INK, INK_NAMES, SIZES, Ink, slate, frame, hint, ring, torch, hall, easel, painter, plaque, scroll, rr, mixHex };
})();
if (typeof module !== 'undefined') module.exports = HsArt;
