// Kolkridder tekenen in 2,5D: de grond schuin van boven (korter in de diepte), de voorwerpen rechtop als beelden,
// van achter naar voor getekend. De kolken liggen in de grond: een gloeiende draaikolk met een rand in de kleur van de leerling.
// Wat erin valt, draait, krimpt en zakt weg binnen de kolk.
// Jorns geschilderde beelden uit /img/kolkridder/ (één per voorwerp + de grond); ontbreekt er een,
// dan tekenen we een tijdelijk voorwerp. Elk voorwerp wordt één keer per grootte klaargezet (sprite).
// Gebruikt KoWorld en AK (arena-kit.js).
const KoDraw = (() => {
  const W = KoWorld;
  const T = W.TILT;
  const ART = {};
  const CUT = {}; // kind -> {img, x, y, w, h}
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const cache = new Map();
  let groundTile = null;
  let artGen = 0; // gaat omhoog als er een beeld binnenkomt

  // ---------- Geschilderde beelden ----------
  // Eén beeld per soort voorwerp (/img/kolkridder/<naam>.webp), al uitgeknipt, plus de grondtegel.
  for (const n of ['grond', ...W.KINDS.map(k => k[0])]) {
    const img = new Image();
    img.onload = () => {
      ART[n] = img;
      if (n === 'grond') groundTile = null;
      else CUT[W.K[n]] = { img, x: 0, y: 0, w: img.width, h: img.height };
      cache.clear();
      artGen++;
    };
    img.src = `/img/kolkridder/${n}.webp`;
  }
  // ---------- Tijdelijke voorwerpen (tot de beelden er zijn) ----------
  // Getekend met (0,0) = midden van het voorwerp op de grond, m = pixels per meter.
  const lin = (g, y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  const ell = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), 0, 0, Math.PI * 2); };
  function glowDot(g, x, y, r, color) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // Een rechtopstaande cilinder (ton, toren, sokkel).
  function cyl(g, rx, h, side, top) {
    const ry = rx * T;
    g.fillStyle = side;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI); g.lineTo(-rx, -h); g.ellipse(0, -h, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
    g.fillStyle = top; ell(g, 0, -h, rx, ry); g.fill();
  }
  // Een blok in schuin bovenaanzicht: voorkant, bovenkant.
  function box(g, w, d, h, front, topc) {
    const dd = d * T;
    g.fillStyle = front; g.fillRect(-w / 2, dd / 2 - h, w, h);
    g.fillStyle = topc; g.fillRect(-w / 2, -dd / 2 - h, w, dd);
  }
  const OUT = 'rgba(8,10,20,.85)';
  const TEMP = {
    munt(g, m) {
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#e0a92e' : '#ffd25a'; ell(g, 0, -i * m * .08, m * .28, m * .28 * T); g.fill(); }
      g.fillStyle = '#7ff3ff'; g.beginPath(); g.moveTo(m * .05, -m * .6); g.lineTo(m * .15, -m * .35); g.lineTo(m * .05, -m * .25); g.lineTo(-m * .05, -m * .35); g.closePath(); g.fill();
      glowDot(g, m * .05, -m * .42, m * .25, 'rgba(90,230,255,.6)');
    },
    ton(g, m) {
      cyl(g, m * .4, m * .8, lin(g, -m * .8, 0, '#8a5a2b', '#4d2f14'), '#a8763d');
      g.fillStyle = '#9aa3b5'; for (const y of [.2, .58]) g.fillRect(-m * .4, -m * y - m * .04, m * .8, m * .07);
      g.fillStyle = '#5ae6ff'; g.fillRect(-m * .4, -m * .42, m * .8, m * .05);
    },
    hooi(g, m) {
      g.fillStyle = lin(g, -m * .8, 0, '#f3d27a', '#b88a2c');
      g.beginPath(); g.ellipse(0, -m * .38, m * .55, m * .38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d9b35a'; ell(g, -m * .3, -m * .38, m * .2, m * .34); g.fill();
      g.fillStyle = '#5ae6ff'; g.fillRect(m * .05, -m * .76, m * .08, m * .76);
    },
    lantaarn(g, m) {
      g.fillStyle = '#4a5468'; g.fillRect(-m * .05, -m * 1.6, m * .1, m * 1.6);
      g.fillStyle = '#2b3242'; ell(g, 0, 0, m * .2, m * .2 * T); g.fill();
      g.fillStyle = '#c9a23a'; g.fillRect(-m * .16, -m * 1.85, m * .32, m * .3);
      glowDot(g, 0, -m * 1.7, m * .55, 'rgba(90,230,255,.75)');
    },
    boom(g, m) {
      g.fillStyle = '#5a3a20'; g.fillRect(-m * .1, -m * 1.2, m * .2, m * 1.2);
      g.fillStyle = lin(g, -m * 2.3, -m * .8, '#2f6b55', '#173a35');
      for (const [x, y, r] of [[0, -1.65, .62], [-.42, -1.3, .45], [.42, -1.28, .45]]) { g.beginPath(); g.arc(x * m, y * m, r * m, 0, Math.PI * 2); g.fill(); }
      for (const [x, y] of [[-.25, -1.8], [.3, -1.55], [-.1, -1.25], [.1, -2]]) glowDot(g, x * m, y * m, m * .14, 'rgba(110,240,255,.9)');
    },
    kar(g, m) {
      box(g, m * 1.5, m * .9, m * .5, '#7a4b22', '#a8743d');
      g.translate(0, -m * .3);
      g.fillStyle = '#c9a23a'; g.fillRect(-m * .75, m * .27 - m * .5 + m * .3, m * 1.5, m * .06);
      g.translate(0, m * .3);
      for (const x of [-.45, .45]) { g.fillStyle = '#2b2f3a'; g.beginPath(); g.arc(x * m, -m * .05, m * .22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(x * m, -m * .05, m * .07, 0, Math.PI * 2); g.fill(); }
      for (const x of [-.3, 0, .3]) { g.fillStyle = '#7ff3ff'; g.beginPath(); g.moveTo(x * m, -m * 1); g.lineTo(x * m + m * .12, -m * .65); g.lineTo(x * m - m * .12, -m * .65); g.fill(); }
    },
    robopaard(g, m) {
      g.fillStyle = '#5a6375';
      for (const x of [-.55, -.3, .3, .55]) g.fillRect(x * m - m * .06, -m * .8, m * .12, m * .8);
      g.fillStyle = lin(g, -m * 1.3, -m * .6, '#aab3c5', '#5a6375');
      g.beginPath(); g.ellipse(0, -m * .95, m * .75, m * .32, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(m * .5, -m * 1.1); g.lineTo(m * .9, -m * 1.75); g.lineTo(m * 1.15, -m * 1.6); g.lineTo(m * .75, -m * .95); g.fill();
      g.fillStyle = '#c9a23a'; g.fillRect(-m * .2, -m * 1.3, m * .4, m * .1);
      glowDot(g, m * 1.02, -m * 1.68, m * .16, 'rgba(90,230,255,.95)');
    },
    kraam(g, m) {
      box(g, m * 2.4, m * 1.4, m * .8, '#6b4423', '#8f6234');
      for (const x of [-1.1, 1.1]) { g.fillStyle = '#4a3020'; g.fillRect(x * m - m * .05, -m * 1.9, m * .1, m * 1.6); }
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e8c45a' : '#2d6fd6'; g.beginPath(); g.moveTo(-m * 1.3 + i * m * .43, -m * 1.95); g.lineTo(-m * 1.3 + (i + 1) * m * .43, -m * 1.95); g.lineTo(-m * 1.3 + (i + 1) * m * .43, -m * 1.5); g.lineTo(-m * 1.3 + i * m * .43, -m * 1.5); g.fill(); }
      for (const x of [-.6, 0, .6]) glowDot(g, x * m, -m * 1.05, m * .2, 'rgba(110,240,255,.9)');
    },
    beeld(g, m) {
      cyl(g, m * .65, m * .7, lin(g, -m * .7, 0, '#8d93a3', '#4e5463'), '#a5abbb');
      g.fillStyle = lin(g, -m * 3.2, -m * .7, '#b8bdca', '#6c7282');
      g.fillRect(-m * .28, -m * 2.3, m * .56, m * 1.6);
      g.beginPath(); g.arc(0, -m * 2.5, m * .3, 0, Math.PI * 2); g.fill();
      g.fillRect(m * .32, -m * 3.1, m * .08, m * 1.8);
      g.fillStyle = '#5ae6ff'; g.fillRect(-m * .18, -m * 2.55, m * .36, m * .07);
    },
    fontein(g, m) {
      cyl(g, m * 1.7, m * .45, lin(g, -m * .5, 0, '#8d93a3', '#4e5463'), '#3a7fa8');
      g.fillStyle = 'rgba(120,240,255,.7)'; ell(g, 0, -m * .45, m * 1.4, m * 1.4 * T); g.fill();
      cyl(g, m * .3, m * 1.1, '#8d93a3', '#a5abbb');
      glowDot(g, 0, -m * 1.3, m * .7, 'rgba(110,240,255,.85)');
    },
    zweefkar(g, m) {
      glowDot(g, -m * .5, -m * .15, m * .4, 'rgba(90,230,255,.8)');
      glowDot(g, m * .5, -m * .15, m * .4, 'rgba(90,230,255,.8)');
      g.fillStyle = lin(g, -m * 1, -m * .3, '#aab3c5', '#4a5266');
      g.beginPath(); g.ellipse(0, -m * .6, m * 1.1, m * .38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c9a23a'; g.fillRect(-m * .9, -m * .62, m * 1.8, m * .07);
      g.fillStyle = '#7ff3ff'; g.fillRect(-m * .3, -m * .9, m * .6, m * .16);
    },
    banier(g, m) {
      g.fillStyle = '#4a5468'; g.fillRect(-m * .05, -m * 3.4, m * .1, m * 3.4);
      g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(0, -m * 3.45, m * .12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2d6fd6'; g.beginPath(); g.moveTo(m * .05, -m * 3.3); g.lineTo(m * .75, -m * 3.2); g.lineTo(m * .7, -m * 2); g.lineTo(m * .4, -m * 2.25); g.lineTo(m * .05, -m * 2.05); g.closePath(); g.fill();
      g.fillStyle = '#ffd25a'; g.beginPath(); g.moveTo(m * .25, -m * 3); g.lineTo(m * .55, -m * 3); g.lineTo(m * .55, -m * 2.7); g.lineTo(m * .4, -m * 2.5); g.lineTo(m * .25, -m * 2.7); g.closePath(); g.fill();
    },
    huis(g, m) {
      const w = m * 4, d = m * 3.6, h = m * 2.6, dd = d * T;
      g.fillStyle = lin(g, -h, 0, '#d9c7a0', '#9c8a66'); g.fillRect(-w / 2, dd / 2 - h, w, h);
      g.fillStyle = '#4a3020';
      for (const x of [-.5, -.17, .17, .5]) g.fillRect(x * w - m * .08, dd / 2 - h, m * .16, h);
      g.fillRect(-w / 2, dd / 2 - h * .55, w, m * .14);
      g.fillStyle = '#3b2716'; g.fillRect(-m * .4, dd / 2 - m * 1.3, m * .8, m * 1.3);
      for (const x of [-.33, .33]) { g.fillStyle = '#5ae6ff'; g.fillRect(x * w - m * .3, dd / 2 - h * .9, m * .6, m * .5); glowDot(g, x * w, dd / 2 - h * .8, m * .7, 'rgba(90,230,255,.35)'); }
      // Dak (schuin naar achter)
      g.fillStyle = lin(g, -h - m * 2.4, dd / 2 - h, '#5a6478', '#2b3242');
      g.beginPath(); g.moveTo(-w / 2 - m * .3, dd / 2 - h); g.lineTo(w / 2 + m * .3, dd / 2 - h); g.lineTo(w / 2, -dd / 2 - h - m * 1.6); g.lineTo(-w / 2, -dd / 2 - h - m * 1.6); g.closePath(); g.fill();
      g.strokeStyle = '#c9a23a'; g.lineWidth = Math.max(1, m * .1); g.beginPath(); g.moveTo(-w / 2, -dd / 2 - h - m * 1.6); g.lineTo(w / 2, -dd / 2 - h - m * 1.6); g.stroke();
      g.fillStyle = '#c9a23a'; g.fillRect(w * .3, -dd / 2 - h - m * 2.6, m * .08, m * 1);
      glowDot(g, w * .3 + m * .04, -dd / 2 - h - m * 2.6, m * .25, 'rgba(255,210,90,.9)');
    },
    toren(g, m) {
      const r = m * 2, h = m * 8;
      cyl(g, r, h, lin(g, -h, 0, '#9aa0ae', '#535968'), '#7d8392');
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(1, m * .06);
      for (let y = 1; y < 8; y++) { g.beginPath(); g.ellipse(0, -y * m, r, r * T, 0, 0, Math.PI); g.stroke(); }
      g.fillStyle = '#c9a23a'; g.fillRect(-r, -h * .55, r * 2, m * .2);
      for (let i = 0; i < 6; i++) { const x = -r * .8 + i * r * .32; g.fillStyle = '#7d8392'; g.fillRect(x, -h - m * .6, r * .2, m * .6); }
      for (const y of [.3, .6]) { g.fillStyle = '#5ae6ff'; g.fillRect(-m * .25, -h * y - m * .4, m * .5, m * .8); }
      g.fillStyle = '#4a5468'; g.fillRect(-m * .06, -h - m * 3, m * .12, m * 2.4);
      g.fillStyle = '#2d6fd6'; g.beginPath(); g.moveTo(m * .06, -h - m * 3); g.lineTo(m * 1.4, -h - m * 2.6); g.lineTo(m * .06, -h - m * 2.1); g.fill();
      g.fillStyle = '#7ff3ff'; g.beginPath(); g.moveTo(-m * .8, -h - m * 1.4); g.lineTo(-m * .5, -h - m * .6); g.lineTo(-m * 1.1, -h - m * .6); g.closePath(); g.fill();
      glowDot(g, -m * .8, -h - m * .9, m * 1.1, 'rgba(90,230,255,.6)');
    },
    burcht(g, m) {
      const w = m * 9, d = m * 8, h = m * 4.5, dd = d * T;
      g.fillStyle = '#5f6574'; g.fillRect(-w / 2, -dd / 2 - h, w, dd);
      g.fillStyle = lin(g, -h, 0, '#9aa0ae', '#535968'); g.fillRect(-w / 2, dd / 2 - h, w, h);
      for (let i = 0; i < 10; i++) { g.fillStyle = '#9aa0ae'; g.fillRect(-w / 2 + i * w / 9.5, dd / 2 - h - m * .6, w / 19, m * .6); }
      g.fillStyle = '#c9a23a'; g.beginPath(); g.moveTo(-m * 1.1, dd / 2); g.lineTo(-m * 1.1, dd / 2 - m * 2); g.arc(0, dd / 2 - m * 2, m * 1.1, Math.PI, 0); g.lineTo(m * 1.1, dd / 2); g.fill();
      g.fillStyle = '#2b2f3a'; g.fillRect(-m * .85, dd / 2 - m * 2, m * 1.7, m * 2);
      g.save();
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.save(); g.translate(x * w / 2, y * dd / 2); cyl(g, m * 1.3, h + m * 2, lin(g, -h - m * 2, 0, '#a5abbb', '#5a6070'), '#7d8392');
        g.fillStyle = '#5ae6ff'; g.fillRect(-m * .2, -h, m * .4, m * .8);
        g.fillStyle = '#2d6fd6'; g.beginPath(); g.moveTo(0, -h - m * 2); g.lineTo(0, -h - m * 3.6); g.lineTo(m * 1.2, -h - m * 3.2); g.lineTo(0, -h - m * 2.8); g.fill();
        g.restore();
      }
      g.restore();
      g.strokeStyle = 'rgba(110,240,255,.35)'; g.lineWidth = Math.max(1, m * .1);
      g.beginPath(); g.ellipse(0, -h * .6, w * .62, h * 1.25, 0, Math.PI, 0); g.stroke();
    },
  };

  // Een voorwerp klaarzetten voor m pixels per meter. Geeft {c, ax, ay}: het canvas en waar het midden op de grond ligt.
  function sprite(k, m) {
    const b = Math.max(0, Math.round(Math.log2(m) * 3));
    const key = k * 100 + b;
    let sp = cache.get(key);
    if (sp) return sp;
    const mm = Math.pow(2, b / 3);
    const [, s, hf] = W.KINDS[k];
    const art = CUT[k];
    let w = s * 2.4 * mm, h, ax, ay;
    if (art) {
      const iw = s * 2.25 * mm, ih = iw * art.h / art.w;
      h = ih + s * T * mm * .3;
      ax = w / 2; ay = ih - s * T * mm * .9;
      if (ay < s * T * mm) { h += s * T * mm - ay; ay = s * T * mm; }
      const c = mk(w, h), g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, ax, ay, s * mm * .95, s * mm * T * .95); g.fill();
      g.drawImage(art.img, art.x, art.y, art.w, art.h, (w - iw) / 2, ay + s * T * mm * .9 - ih, iw, ih);
      sp = { c, ax, ay };
    } else {
      h = (hf + .4) * s * mm + s * T * mm * 1.2;
      ax = w / 2; ay = h - s * T * mm * 1.1;
      const c = mk(w, h), g = c.getContext('2d');
      g.translate(ax, ay);
      g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 0, 0, s * mm * .95, s * mm * T * .95); g.fill();
      g.save();
      TEMP[W.KINDS[k][0]](g, mm);
      g.restore();
      sp = { c, ax, ay };
    }
    sp.k = mm;
    if (cache.size > 400) cache.clear();
    cache.set(key, sp);
    return sp;
  }

  // ---------- De grond ----------
  // Een tegel van 8 x 8 meter: kasseien met hier en daar een cyaan barst of een gouden rune.
  const TILE_M = 8;
  function tile() {
    if (groundTile) return groundTile;
    const N = 256;
    const c = mk(N, N), g = c.getContext('2d');
    if (ART.grond) {
      g.drawImage(ART.grond, 0, 0, N, N);
    } else {
      g.fillStyle = '#1f2636'; g.fillRect(0, 0, N, N);
      const R = W.rng(7);
      const S = N / 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const ox = (y % 2) * S / 2;
        const l = 26 + Math.floor(R() * 14);
        g.fillStyle = `hsl(222, 18%, ${l}%)`;
        for (const dx of [0, -N, N]) {
          g.beginPath();
          g.roundRect ? g.roundRect(x * S + ox + 2 + dx, y * S + 2, S - 4, S - 4, 6) : g.rect(x * S + ox + 2 + dx, y * S + 2, S - 4, S - 4);
          g.fill();
        }
      }
      g.strokeStyle = 'rgba(90,230,255,.55)'; g.lineWidth = 2; g.shadowColor = '#5ae6ff'; g.shadowBlur = 6;
      for (let i = 0; i < 3; i++) { let x = R() * N, y = R() * N; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (R() - .5) * 40; y += (R() - .5) * 40; g.lineTo(x, y); } g.stroke(); }
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,200,80,.5)';
      g.beginPath(); g.arc(R() * N, R() * N, 4, 0, Math.PI * 2); g.fill();
    }
    groundTile = c;
    return c;
  }
  let patternFor = null, pattern = null;
  // De grond van de stad, met straten om de 20 meter en een gloeiende rand. Alleen wat in beeld is.
  function paintGround(ctx, L, cam) {
    const { S, w, h } = cam;
    ctx.fillStyle = '#070912';
    ctx.fillRect(0, 0, w, h);
    const tc = tile();
    if (patternFor !== tc) { pattern = ctx.createPattern(tc, 'repeat'); patternFor = tc; }
    const ox = w / 2 - cam.x * S, oy = h / 2 - cam.y * S * T;
    const x0 = Math.max(0, -ox / S - 1), x1 = Math.min(L, (w - ox) / S + 1);
    const y0 = Math.max(0, -oy / (S * T) - 1), y1 = Math.min(L, (h - oy) / (S * T) + 1);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(S, S * T);
    // Rand rond de stad: twee zachte neonlijnen
    ctx.strokeStyle = 'rgba(90,230,255,.25)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-.8, -.8, L + 1.6, L + 1.6);
    ctx.strokeStyle = 'rgba(90,230,255,.7)';
    ctx.lineWidth = .35;
    ctx.strokeRect(-.2, -.2, L + .4, L + .4);
    const k = TILE_M / tc.width;
    if (pattern.setTransform) pattern.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    ctx.fillStyle = pattern;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Straten: donkerder, met een gouden stippellijn in het midden
    ctx.fillStyle = 'rgba(6,8,16,.42)';
    const v0 = Math.floor(x0 / 20) * 20, w0 = Math.floor(y0 / 20) * 20;
    for (let v = v0; v <= x1 + 2; v += 20) ctx.fillRect(v - 2, y0, 4, y1 - y0);
    for (let v = w0; v <= y1 + 2; v += 20) ctx.fillRect(x0, v - 2, x1 - x0, 4);
    ctx.fillStyle = 'rgba(255,200,80,.35)';
    const dash = S > 6;
    if (dash) {
      for (let v = v0; v <= x1 + 2; v += 20) for (let u = Math.floor(y0 / 4) * 4 + 3; u < y1; u += 4) ctx.fillRect(v - .08, u, .16, 1.6);
      for (let v = w0; v <= y1 + 2; v += 20) for (let u = Math.floor(x0 / 4) * 4 + 3; u < x1; u += 4) ctx.fillRect(u, v - .08, 1.6, .16);
    }
    ctx.restore();
  }
  // Op het bord verandert de camera niet: daar bakken we de grond één keer.
  let baked = null;
  // Op het leerlingscherm tekenen we de grond op halve resolutie en rekken we ze op: de helft van de pixels per frame,
  // en de kasseien blijven even scherp genoeg (het is maar de vloer).
  let half = null;
  function ground(ctx, scene, cam) {
    if (!cam.bake) {
      const hw = Math.ceil(cam.w / 2), hh = Math.ceil(cam.h / 2);
      if (!half || half.width !== hw || half.height !== hh) half = mk(hw, hh);
      paintGround(half.getContext('2d'), scene.L, { x: cam.x, y: cam.y, S: cam.S / 2, w: hw, h: hh });
      ctx.drawImage(half, 0, 0, cam.w, cam.h);
      return;
    }
    const key = `${scene.L}|${cam.w}|${cam.h}|${cam.S}|${artGen}`;
    if (!baked || baked.key !== key) {
      const c = mk(cam.w, cam.h);
      paintGround(c.getContext('2d'), scene.L, cam);
      baked = { key, c };
    }
    ctx.drawImage(baked.c, 0, 0);
  }

  // ---------- De kolk ----------
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // De kolk wordt per kleur en grootte één keer klaargezet: de schijf (gloed + diepte), de spiraalarmen (die we draaien)
  // en de rand. Per frame kost een kolk dan maar drie drawImage's en een paar vonkjes.
  const holeCache = new Map();
  function holeArt(color, rp) {
    const b = Math.max(8, Math.min(34, Math.round(Math.log2(Math.max(1, rp)) * 4)));
    const key = `${color}|${b}`;
    let h = holeCache.get(key);
    if (h) return h;
    const R = Math.pow(2, b / 4);
    // Elk beeld is zo klein mogelijk: tekenen kost per pixel, ook doorzichtige.
    const make = (f, draw) => { const N = Math.ceil(R * 2 * f), c = mk(N, N), g = c.getContext('2d'); g.translate(N / 2, N / 2); draw(g); c.f = f; return c; };
    const disk = make(1, g => {
      const inner = g.createRadialGradient(0, 0, 0, 0, 0, R);
      inner.addColorStop(0, '#000000'); inner.addColorStop(.55, '#05060c'); inner.addColorStop(.85, rgba(color, .35)); inner.addColorStop(1, rgba(color, .85));
      g.fillStyle = inner;
      g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    });
    const arms = make(1, g => {
      g.lineCap = 'round';
      for (let a = 0; a < 4; a++) {
        const base = (a / 4) * Math.PI * 2;
        g.strokeStyle = rgba(a % 2 ? '#ffffff' : color, a % 2 ? .25 : .7);
        g.lineWidth = Math.max(1.5, R * (a % 2 ? .04 : .08));
        g.beginPath();
        for (let i = 0; i <= 14; i++) {
          const k = i / 14, rr = R * (.98 - k * .85), ang = base + k * 3.4;
          if (i) g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        g.stroke();
      }
    });
    const rim = make(1.32, g => {
      const glow = g.createRadialGradient(0, 0, R * .9, 0, 0, R * 1.32);
      glow.addColorStop(0, rgba(color, .5)); glow.addColorStop(1, rgba(color, 0));
      g.fillStyle = glow;
      g.beginPath(); g.arc(0, 0, R * 1.32, 0, Math.PI * 2); g.arc(0, 0, R * .9, 0, Math.PI * 2, true); g.fill();
      g.strokeStyle = rgba(color, .35);
      g.lineWidth = Math.max(6, R * .22);
      g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = color;
      g.lineWidth = Math.max(2.5, R * .09);
      g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = Math.max(1, R * .025);
      g.beginPath(); g.arc(0, 0, R * .96, Math.PI * .1, Math.PI * .9); g.stroke();
    });
    h = { disk, arms, rim };
    if (holeCache.size > 120) holeCache.clear();
    holeCache.set(key, h);
    return h;
  }
  // Binnenkant: zwart in het midden, met draaiende spiraalarmen in de kleur van de leerling.
  function holeBack(ctx, x, y, rp, color, t, flags) {
    const art = holeArt(color, rp);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, T);
    if (flags & 1) {
      // Zuigkracht: een draaiende ring van stippen verder uit
      ctx.strokeStyle = rgba('#ffd25a', .55);
      ctx.lineWidth = Math.max(2, rp * .05);
      ctx.setLineDash([rp * .12, rp * .16]);
      ctx.lineDashOffset = -t * rp * .8;
      ctx.beginPath(); ctx.arc(0, 0, rp * W.ZUIG, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.drawImage(art.disk, -rp, -rp, rp * 2, rp * 2);
    if (rp > 10) {
      ctx.rotate(t * 2.2);
      ctx.drawImage(art.arms, -rp, -rp, rp * 2, rp * 2);
    }
    ctx.restore();
  }
  function holeRim(ctx, x, y, rp, color, t, flags, me) {
    const art = holeArt(color, rp);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, T);
    if ((flags & 4) && Math.floor(t * 6) % 2) ctx.globalAlpha = .45;
    ctx.drawImage(art.rim, -rp * 1.32, -rp * 1.32, rp * 2.64, rp * 2.64);
    // Vonken die rond de rand draaien
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + i * 1.047;
      ctx.beginPath(); ctx.arc(Math.cos(a) * rp, Math.sin(a) * rp, Math.max(1.2, rp * .03), 0, Math.PI * 2); ctx.fill();
    }
    if (flags & 2) {
      // Aan het antwoorden: een gouden schild-ring
      ctx.strokeStyle = 'rgba(255,210,90,.8)';
      ctx.lineWidth = Math.max(2, rp * .05);
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(0, 0, rp * 1.12, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (me) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, rp * 1.22, -Math.PI * .75, -Math.PI * .25); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- De scène: wat de server stuurde, vloeiend gemaakt ----------
  class Scene {
    constructor() {
      this.L = 0;
      this.objs = [];
      this.ys = null;
      this.alive = new Uint8Array(0);
      this.falling = [];
      this.interp = new AK.Interp(80);
      this.rr = new Map(); // n -> getoonde straal (glijdt naar de echte)
      this.onEvent = null;
      this.version = 0;
    }
    setWorld(msg) {
      if (msg.seed !== this.seed || msg.L !== this.L) {
        this.seed = msg.seed;
        this.L = msg.L;
        this.objs = W.city(msg.seed, msg.L);
        this.ys = Float32Array.from(this.objs, o => o.y);
      }
      this.alive = new Uint8Array(this.objs.length).fill(1);
      for (const i of msg.dead) this.alive[i] = 0;
      this.falling = [];
      this.version++;
    }
    apply(msg) {
      const t = performance.now();
      const seen = new Set();
      for (const k of msg.k) {
        seen.add(k[0]);
        this.interp.push(k[0], [k[1] / 100, k[2] / 100, k[3] / 100, k[4]], t);
      }
      this.interp.prune(t, 300);
      for (const e of msg.ev) {
        if (e[0] === 'e' && this.alive[e[1]]) {
          this.alive[e[1]] = 0;
          const o = this.objs[e[1]];
          this.falling.push({ k: o.k, x: o.x, y: o.y, n: e[2], t0: t / 1000, spin: Math.random() < .5 ? -1 : 1 });
          this.version++;
        } else if (e[0] === 'r') { this.alive[e[1]] = 1; this.version++; }
        if (this.onEvent) this.onEvent(e);
      }
    }
    // [x, y, r, vlaggen] van een kolk op het tekenmoment.
    hole(n, t = performance.now()) {
      const v = this.interp.get(n, t);
      if (!v) return null;
      const prev = this.rr.get(n);
      const r = prev === undefined ? v[2] : prev + (v[2] - prev) * .12;
      this.rr.set(n, r);
      return [v[0], v[1], r, v[3]];
    }
    holes(t) {
      const out = [];
      for (const n of this.interp.snaps.keys()) { const h = this.hole(n, t); if (h) out.push([n, ...h]); }
      return out;
    }
  }

  // Eerste voorwerp met y >= v (de lijst is op y gesorteerd).
  function lower(ys, v) {
    let lo = 0, hi = ys.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ys[mid] < v) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // De voorwerpen die nog staan, van achter naar voor. Wie bijna in een kolk valt, wiebelt.
  let layer = null;
  function objects(ctx, scene, cam, holes, t) {
    const { S, w, h } = cam;
    const sx = x => w / 2 + (x - cam.x) * S;
    const sy = y => h / 2 + (y - cam.y) * S * T;
    const top = cam.y - h / 2 / (S * T) - 2, bottom = cam.y + h / 2 / (S * T) + 8;
    const left = cam.x - w / 2 / S - 7, right = cam.x + w / 2 / S + 7;
    const objs = scene.objs, alive = scene.alive;
    const wobble = holes.length > 0;
    for (let i = lower(scene.ys, top); i < objs.length; i++) {
      const o = objs[i];
      if (o.y > bottom) break;
      if (!alive[i] || o.x < left || o.x > right) continue;
      const sp = sprite(o.k, S);
      const sc = S / sp.k;
      let rot = 0;
      if (wobble) {
        const s = W.KINDS[o.k][1];
        for (const hh of holes) {
          const d = Math.hypot(o.x - hh[1], o.y - hh[2]);
          if (d < hh[3] + s * .3 && d > hh[3] * .5 && W.fits(o.k, hh[3])) { rot = Math.sin(t * 18 + i) * .08; break; }
        }
      }
      const px = sx(o.x), py = sy(o.y);
      if (rot) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
        ctx.drawImage(sp.c, -sp.ax * sc, -sp.ay * sc, sp.c.width * sc, sp.c.height * sc);
        ctx.restore();
      } else ctx.drawImage(sp.c, px - sp.ax * sc, py - sp.ay * sc, sp.c.width * sc, sp.c.height * sc);
    }
  }

  // cam: {x, y, S (pixels per meter), w, h}. opts: {roster, me, t, names, small}
  function render(ctx, scene, cam, opts) {
    const { S, w, h } = cam;
    const t = opts.t;
    const sx = x => w / 2 + (x - cam.x) * S;
    const sy = y => h / 2 + (y - cam.y) * S * T;
    ground(ctx, scene, cam);
    if (!scene.objs.length) return;
    const colorOf = n => ((opts.roster && opts.roster.get(n)) || {}).color || '#4cc9ff';
    const holes = scene.holes(performance.now()).filter(([, x, y, r]) => Math.abs(sx(x) - w / 2) < w / 2 + r * S * 2 + 40 && Math.abs(sy(y) - h / 2) < h / 2 + r * S + 40);
    const hmap = new Map(holes.map(hh => [hh[0], hh]));
    // 1. De binnenkant van de kolken
    for (const [n, x, y, r, f] of holes) holeBack(ctx, sx(x), sy(y), r * S, colorOf(n), t + n, f);
    // 2. Wat erin valt: naar het midden, draaiend, krimpend en wegzakkend, alleen binnen de kolk zichtbaar
    const now = performance.now() / 1000;
    for (let i = scene.falling.length - 1; i >= 0; i--) {
      const fo = scene.falling[i];
      const k = (now - fo.t0) / .6;
      const hh = hmap.get(fo.n);
      if (k >= 1 || !hh) { scene.falling.splice(i, 1); continue; }
      const [, hx, hy, hr] = hh;
      const e = k * k;
      const x = fo.x + (hx - fo.x) * Math.min(1, k * 1.4), y = fo.y + (hy - fo.y) * Math.min(1, k * 1.4);
      const sp = sprite(fo.k, S * (1 - e * .7));
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(sx(hx), sy(hy), hr * S, hr * S * T, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 1 - e * .6;
      ctx.translate(sx(x), sy(y) + e * hr * S * .9);
      ctx.rotate(fo.spin * k * 1.6);
      const sc = S * (1 - e * .7) / sp.k;
      ctx.drawImage(sp.c, -sp.ax * sc, -sp.ay * sc, sp.c.width * sc, sp.c.height * sc);
      ctx.restore();
    }
    // 3. De randen
    for (const [n, x, y, r, f] of holes) holeRim(ctx, sx(x), sy(y), r * S, colorOf(n), t + n, f, n === opts.me);
    // 4. De voorwerpen die nog staan, van achter naar voor. Op het bord (bake) één keer per halve seconde op een eigen laag.
    if (cam.bake) {
      const key = `${cam.w}|${cam.h}|${cam.S}|${scene.seed}|${artGen}`;
      const tnow = performance.now();
      if (!layer || layer.key !== key || (layer.version !== scene.version && tnow - layer.at > 500)) {
        if (!layer || layer.c.width !== cam.w || layer.c.height !== cam.h) layer = { c: mk(cam.w, cam.h) };
        const g = layer.c.getContext('2d');
        g.clearRect(0, 0, cam.w, cam.h);
        objects(g, scene, cam, [], t);
        Object.assign(layer, { key, version: scene.version, at: tnow });
      }
      ctx.drawImage(layer.c, 0, 0);
    } else objects(ctx, scene, cam, !opts.small && holes.length < 40 ? holes : [], t);
    // 5. Namen boven de kolken
    if (opts.names !== false) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const [n, x, y, r] of holes) {
        const who = opts.roster && opts.roster.get(n);
        if (!who) continue;
        const fs = Math.round(Math.max(opts.fs || 12, Math.min(opts.fmax || 26, r * S * .28)));
        ctx.font = `700 ${fs}px "Exo 2", sans-serif`;
        const px = sx(x), py = sy(y) - r * S * T - 6;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(5,7,14,.85)';
        ctx.strokeText(who.name, px, py);
        ctx.fillStyle = n === opts.me ? '#ffffff' : colorOf(n);
        ctx.fillText(who.name, px, py);
      }
    }
  }

  // Een kaartje van de hele stad met alle kolken (rechtsonder op het leerlingscherm).
  function minimap(ctx, scene, x, y, size, opts) {
    if (!scene.L) return;
    const k = size / scene.L;
    ctx.save();
    ctx.globalAlpha = .85;
    ctx.fillStyle = 'rgba(8,12,24,.8)';
    ctx.strokeStyle = 'rgba(90,230,255,.6)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = 'rgba(255,200,80,.18)';
    for (let v = 0; v <= scene.L; v += 20) { ctx.fillRect(x + v * k - .5, y, 1, size); ctx.fillRect(x, y + v * k - .5, size, 1); }
    for (const [n, hx, hy, r] of scene.holes(performance.now())) {
      const c = ((opts.roster && opts.roster.get(n)) || {}).color || '#4cc9ff';
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x + hx * k, y + hy * k, Math.max(2.5, r * k), 0, Math.PI * 2); ctx.fill();
      if (n === opts.me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.restore();
  }

  // Trage computer? Dan tekenen we het canvas op een iets lagere resolutie (de browser rekt het op).
  // Elke 1,5 s kijken we hoe vlot het loopt: onder 42 beelden per seconde zakt de resolutie, boven 56 gaat ze weer omhoog.
  class Res {
    constructor(min = .6) { this.scale = 1; this.min = min; this.n = 0; this.t = 0; this.good = 0; }
    frame(dt) {
      this.n++;
      this.t += dt;
      if (this.t < 1.5) return;
      const fps = this.n / this.t;
      this.n = 0;
      this.t = 0;
      if (fps < 42 && this.scale > this.min) { this.scale = Math.max(this.min, this.scale * .85); this.good = 0; }
      else if (fps > 56 && this.scale < 1 && ++this.good >= 3) { this.scale = Math.min(1, this.scale + .1); this.good = 0; }
    }
    // De hoogste pixeldichtheid voor AK.fit.
    dpr(max) { return Math.min(max, window.devicePixelRatio || 1) * this.scale; }
  }

  return { Scene, render, minimap, sprite, ART, Res };
})();
