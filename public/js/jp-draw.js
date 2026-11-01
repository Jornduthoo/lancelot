// Raketridder tekenen: de lucht, de lava, de baan, de energiecellen en de raketridders (zijaanzicht).
// Alles wat niet beweegt (lucht, verre burchten, elk stenen platform, elke torenmuur, de ridders) bakken we één keer
// op een eigen canvas; elke frame is dan vooral drawImage. Alleen vlammen, lasers, vuurraderen en lava tekenen we live.
// Gebruikt JpWorld en Glow (fx.js).
const JpDraw = (() => {
  const W = JpWorld;
  const { rgba, glow } = Glow;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const TAU = Math.PI * 2;

  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function shade(hex, f) {
    const [r, g, b] = hexRgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  function mix(a, b, k) {
    const x = hexRgb(a), y = hexRgb(b);
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
  }

  // ---------- Jorns geschilderde beelden (public/img/raketridder/) ----------
  // Is een beeld er (nog) niet, dan tekenen we dat stuk zelf zoals vroeger.
  const ART = {};
  const ART_NAMEN = ['ridder', 'steen', 'platform', 'stekels', 'laser', 'vuurwiel', 'cel', 'vlag',
    'lucht-wolkenburcht', 'lucht-lavasmidse', 'lucht-sterrenpoort'];
  const onArt = [];
  if (typeof Image !== 'undefined') {
    for (const n of ART_NAMEN) {
      const img = new Image();
      img.onload = () => { ART[n] = img; for (const f of onArt) f(); };
      img.src = `/img/raketridder/${n}.webp`;
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
  // De blauwe delen (pluim, cape, strepen op de raket) krijgen de kleur van de speler. Het cyaan vizier blijft cyaan.
  function tint(c, color) {
    const g = c.getContext('2d');
    const data = g.getImageData(0, 0, c.width, c.height), p = data.data;
    const [th, ts, tl] = rgbHsl(...hexRgb(color));
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const [h, sat, l] = rgbHsl(p[i], p[i + 1], p[i + 2]);
      if (h < 205 || h > 258 || sat < .38) continue;
      const [r, gg, b] = hslRgb(th, Math.max(sat, ts * .85), Math.min(.85, l * (.75 + tl * .6)));
      p[i] = r; p[i + 1] = gg; p[i + 2] = b;
    }
    g.putImageData(data, 0, 0);
  }

  // De achtergrond van een wereld: Jorns schilderij, één keer geschaald op de schermhoogte,
  // en daarnaast gespiegeld, zodat hij naadloos eindeloos doorschuift.
  const backCache = new Map();
  onArt.push(() => backCache.clear());
  function backdrop(theme, h) {
    const img = ART['lucht-' + theme.name.toLowerCase()];
    if (!img) return null;
    const H = Math.min(1400, Math.round(h * 1.1));
    const key = theme.name + ':' + H;
    let b = backCache.get(key);
    if (b) return b;
    if (backCache.size > 4) backCache.clear();
    const w = Math.round(img.width * H / img.height);
    const c = mk(w * 2, H), g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, H);
    g.save(); g.translate(w * 2, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, w, H); g.restore();
    const px = g.getImageData(w, H - 2, 1, 1).data;
    b = { c, bottom: `rgb(${px[0]},${px[1]},${px[2]})` };
    backCache.set(key, b);
    return b;
  }
  function drawBack(ctx, b, w, h, v, S, alpha) {
    ctx.globalAlpha = alpha;
    const bw = b.c.width;
    const off = -((v.cx * S * .1) % bw + bw) % bw;
    const dy = Math.round(Math.max(-h * .1, Math.min(0, .08 * (W.H / 2 - v.cy) * S - h * .05)));
    ctx.fillStyle = b.bottom; ctx.fillRect(0, dy + b.c.height - 2, w, h);
    for (let x = off; x < w; x += bw) ctx.drawImage(b.c, Math.round(x), dy);
    ctx.globalAlpha = 1;
  }

  // ---------- Lucht en verre lagen (per wereld, per schermgrootte) ----------
  const skyCache = new Map();
  function circuits(g, w, h, color, alpha, r) {
    // Fijne lichtende printbaan-lijnen, zoals op de iconen.
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      let x = r() * w, y = r() * h * .75;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        const len = 30 + r() * 110;
        if (s % 2) y += (r() < .5 ? -1 : 1) * len * .6; else x += (r() < .5 ? -1 : 1) * len;
        g.lineTo(x, y);
      }
      g.stroke();
      g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.stroke();
    }
    g.restore();
  }
  function sky(theme, w, h) {
    const key = `${theme.name}:${w}x${h}`;
    let c = skyCache.get(key);
    if (c) return c;
    if (skyCache.size > 6) skyCache.clear();
    c = mk(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky[0]);
    grad.addColorStop(.6, theme.sky[1]);
    grad.addColorStop(1, theme.sky[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = W.rng(theme.name.length * 97);
    if (theme.name === 'Sterrenpoort') {
      const neb = g.createRadialGradient(w * .3, h * .35, 0, w * .3, h * .35, h * .7);
      neb.addColorStop(0, 'rgba(199,125,255,.28)'); neb.addColorStop(.5, 'rgba(76,201,255,.1)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(${200 + r() * 55 | 0},${210 + r() * 45 | 0},255,${.25 + r() * .7})`;
        const s = r() < .08 ? 2 : 1;
        g.fillRect(r() * w, r() * h * .9, s, s);
      }
      const px = w * .74, py = h * .28, pr = h * .15;
      const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
      pg.addColorStop(0, '#b9c8ff'); pg.addColorStop(.6, '#4a5cb0'); pg.addColorStop(1, '#141d48');
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(160,220,255,.6)';
      g.lineWidth = Math.max(2, pr * .07);
      g.beginPath(); g.ellipse(px, py, pr * 1.75, pr * .36, -.25, 0, TAU); g.stroke();
      circuits(g, w, h, '#5ee7ff', .16, r);
    } else if (theme.name === 'Lavasmidse') {
      const gl = g.createRadialGradient(w * .5, h * 1.05, 0, w * .5, h, h);
      gl.addColorStop(0, 'rgba(255,110,30,.5)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = gl; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,${120 + r() * 100 | 0},40,${.15 + r() * .55})`;
        const s = r() < .2 ? 3 : 2;
        g.fillRect(r() * w, r() * h, s, s);
      }
      circuits(g, w, h, '#ff8c42', .1, r);
    } else {
      const sx = w * .22, sy = h * .6;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, h * .42);
      sg.addColorStop(0, 'rgba(255,225,160,.95)'); sg.addColorStop(.12, 'rgba(255,180,120,.55)'); sg.addColorStop(1, 'rgba(255,150,100,0)');
      g.fillStyle = sg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${r() * .7})`; g.fillRect(r() * w, r() * h * .45, 1, 1); }
      // Wolkenbanken met een gouden zoom
      for (let i = 0; i < 26; i++) {
        const cx = r() * w, cy = h * (.25 + r() * .55), cw = w * (.06 + r() * .14), ch = h * (.015 + r() * .03);
        g.fillStyle = `rgba(120,80,170,${.25 + r() * .2})`;
        g.beginPath(); g.ellipse(cx, cy, cw, ch, 0, 0, TAU); g.fill();
        g.fillStyle = `rgba(255,190,150,${.1 + r() * .12})`;
        g.beginPath(); g.ellipse(cx, cy - ch * .45, cw * .85, ch * .45, 0, 0, TAU); g.fill();
      }
      circuits(g, w, h, '#c77dff', .1, r);
    }
    skyCache.set(key, c);
    return c;
  }

  // Een strook silhouetten die je herhaalt. depth 0 = ver (burchten), 1 = midden (zwevende eilanden met torens).
  const layerCache = new Map();
  function layer(theme, h, depth) {
    const key = `${theme.name}:${h}:${depth}`;
    let c = layerCache.get(key);
    if (c) return c;
    if (layerCache.size > 12) layerCache.clear();
    const w = 1400;
    c = mk(w, h);
    const g = c.getContext('2d');
    const r = W.rng(theme.name.length * 31 + depth * 7);
    const winCol = theme.name === 'Lavasmidse' ? 'rgba(255,170,70,.7)' : 'rgba(94,231,255,.6)';
    if (depth === 0) {
      g.fillStyle = theme.far;
      const base = h * .72;
      let x = -20;
      while (x < w + 20) {
        const tw = 26 + r() * 54, th = h * (.12 + r() * .28);
        if (theme.name === 'Lavasmidse' && r() < .45) {
          g.fillRect(x + tw * .3, base - th * 1.25, tw * .34, th * 1.25 + h);
          const sg = g.createRadialGradient(x + tw * .47, base - th * 1.25, 0, x + tw * .47, base - th * 1.25, tw * .7);
          sg.addColorStop(0, 'rgba(255,120,40,.45)'); sg.addColorStop(1, 'rgba(255,120,40,0)');
          g.fillStyle = sg; g.fillRect(x - tw, base - th * 2, tw * 3, th * 1.5);
        } else if (theme.name === 'Sterrenpoort' && r() < .4) {
          g.fillRect(x, base - th, tw, th + h);
          g.fillRect(x + tw * .45, base - th * 1.55, 3, th * .55);
          g.beginPath(); g.arc(x + tw * .5, base - th * 1.55, 5, 0, TAU); g.fill();
        } else {
          g.fillRect(x, base - th, tw, th + h);
          const n = Math.max(2, Math.round(tw / 10));
          for (let i = 0; i < n; i += 2) g.fillRect(x + i * tw / n, base - th - 7, tw / n, 7);
          if (r() < .5) { g.beginPath(); g.moveTo(x - 4, base - th); g.lineTo(x + tw / 2, base - th - tw * .9); g.lineTo(x + tw + 4, base - th); g.fill(); }
        }
        g.fillStyle = winCol;
        for (let i = 0; i < 3; i++) if (r() < .55) g.fillRect(x + tw * (.2 + r() * .6), base - th * (.2 + r() * .7), 2, 4);
        g.fillStyle = theme.far;
        x += tw + r() * 14;
      }
      g.fillRect(0, base, w, h - base);
    } else {
      // Zwevende rotseilanden met een torentje, in de mist.
      let x = 40;
      while (x < w - 120) {
        const iw = 90 + r() * 130, iy = h * (.25 + r() * .4), ih = iw * (.35 + r() * .2);
        g.fillStyle = theme.mid;
        g.beginPath();
        g.moveTo(x, iy);
        g.lineTo(x + iw, iy);
        const pts = 6;
        for (let i = pts; i >= 0; i--) g.lineTo(x + iw * i / pts + (r() - .5) * 10, iy + ih * Math.sin(Math.PI * i / pts) * (.6 + r() * .5));
        g.closePath(); g.fill();
        g.fillStyle = rgba(theme.glow, .25);
        g.fillRect(x, iy - 2, iw, 3);
        g.fillStyle = theme.mid;
        const tx = x + iw * (.3 + r() * .3), tw = 16 + r() * 14, th = 40 + r() * 50;
        g.fillRect(tx, iy - th, tw, th);
        for (let i = 0; i < 3; i++) g.fillRect(tx + i * tw / 2.5, iy - th - 6, tw / 5, 6);
        g.fillStyle = winCol;
        g.fillRect(tx + tw / 2 - 1.5, iy - th * .7, 3, 6);
        x += iw + 80 + r() * 160;
      }
    }
    layerCache.set(key, c);
    return c;
  }

  // ---------- Stenen platforms en torenmuren (gebakken per stuk en per zoom) ----------
  const solidCache = new Map();
  let solidS = 0;
  onArt.push(() => { solidCache.clear(); knightCache.clear(); });
  // Jorns steentegel als vulling: één tegel = 2,6 meter.
  const tileCache = new Map();
  function stoneFill(g, theme, S) {
    const key = theme.name + S;
    let t = tileCache.get(key);
    if (t) return g.createPattern(t, 'repeat');
    if (tileCache.size > 6) tileCache.clear();
    const img = ART.steen;
    t = mk(Math.round(S * 2.6), Math.round(S * 2.6));
    const tg = t.getContext('2d');
    tg.drawImage(img, 0, 0, t.width, t.height);
    if (theme.name === 'Lavasmidse') { tg.globalCompositeOperation = 'multiply'; tg.fillStyle = '#c27a5c'; tg.fillRect(0, 0, t.width, t.height); }
    else if (theme.name === 'Sterrenpoort') { tg.globalCompositeOperation = 'color'; tg.fillStyle = 'rgba(80,60,170,.35)'; tg.fillRect(0, 0, t.width, t.height); }
    tileCache.set(key, t);
    return g.createPattern(t, 'repeat');
  }
  function bakeSolid(s, theme, S) {
    const pad = Math.ceil(S * .5);
    const under = s.wall || s.mv ? 0 : Math.min(2.2, .6 + s.w * .25);
    const vis = s.top ? Math.min(s.h, 14) : s.h; // een muur van boven tekenen we niet hoger dan nodig
    const c = mk(s.w * S + pad * 2, (vis + under) * S + pad * 2);
    const g = c.getContext('2d');
    g.translate(pad, pad);
    const r = W.rng(Math.round(s.x * 131 + s.y * 17 + s.w * 7) + 3);
    const w = s.w * S, h = vis * S;
    const oy = s.top ? 0 : 0;
    const stone = theme.stone;
    const line = 'rgba(5,6,16,.85)';
    if (s.mv) {
      // Zwevende sci-fi plaat met een gouden rand en twee stuwers.
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#d7def2'); grd.addColorStop(.3, '#6c769e'); grd.addColorStop(1, '#262b48');
      g.fillStyle = grd;
      g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, S * .18) : g.rect(0, 0, w, h); g.fill();
      g.lineWidth = Math.max(1.5, S * .06); g.strokeStyle = line; g.stroke();
      g.fillStyle = theme.edge;
      g.fillRect(S * .1, S * .06, w - S * .2, Math.max(2, S * .07));
      g.fillStyle = rgba(theme.glow, .9);
      for (let i = 1; i < Math.round(s.w); i++) g.fillRect(i * S - S * .04, h * .45, S * .08, h * .3);
      g.fillStyle = '#20243a';
      for (const fx of [.22, .78]) g.fillRect(w * fx - S * .22, h - S * .02, S * .44, S * .22);
      return { c, pad };
    }
    // Jorns steen als vulling, anders blokken: rijen stenen met een eigen tint, een lichte bovenkant, een zwarte omlijning.
    const bh = s.wall ? S * .9 : Math.min(h, S * .9);
    const rows = ART.steen ? 0 : Math.max(1, Math.ceil(h / bh));
    if (ART.steen) {
      g.save();
      g.fillStyle = stoneFill(g, theme, S);
      g.translate(-(s.x * S) % (S * 2.6), -(s.y * S) % (S * 2.6));
      g.fillRect((s.x * S) % (S * 2.6), (s.y * S) % (S * 2.6), w, h);
      g.restore();
      const sh = g.createLinearGradient(0, 0, 0, h);
      sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
      g.fillStyle = sh; g.fillRect(0, 0, w, h);
    }
    for (let row = 0; row < rows; row++) {
      const y0 = oy + row * bh;
      const bhh = Math.min(bh, h - row * bh);
      let x = row % 2 ? -S * .45 : 0;
      while (x < w) {
        const bw = S * (.8 + r() * .5);
        const x0 = Math.max(0, x), x1 = Math.min(w, x + bw);
        const f = .8 + r() * .35;
        const grd = g.createLinearGradient(0, y0, 0, y0 + bhh);
        grd.addColorStop(0, shade(stone, f * 1.35));
        grd.addColorStop(.25, shade(stone, f));
        grd.addColorStop(1, shade(stone, f * .7));
        g.fillStyle = grd;
        g.fillRect(x0, y0, x1 - x0, bhh);
        g.strokeStyle = line;
        g.lineWidth = Math.max(1, S * .05);
        g.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, bhh - 1);
        // Barstjes en een sprankel blauw in de steen
        if (r() < .35) {
          g.strokeStyle = rgba(theme.glow, .55);
          g.lineWidth = Math.max(1, S * .03);
          g.beginPath();
          let cx = x0 + (x1 - x0) * r(), cy = y0 + bhh * .2;
          g.moveTo(cx, cy);
          for (let i = 0; i < 3; i++) { cx += (r() - .5) * S * .35; cy += bhh * .22; g.lineTo(cx, cy); }
          g.stroke();
        }
        if (r() < .5) { g.fillStyle = rgba(theme.glow, .5); g.fillRect(x0 + (x1 - x0) * r(), y0 + bhh * r(), 2, 2); }
        x += bw;
      }
    }
    if (!s.wall) {
      // Gouden rand bovenaan met een lichtend naadje eronder
      g.fillStyle = theme.edge;
      g.fillRect(0, 0, w, Math.max(2, S * .08));
      g.fillStyle = rgba(theme.glow, .8);
      g.fillRect(0, Math.max(2, S * .08), w, Math.max(1, S * .035));
      g.strokeStyle = line;
      g.lineWidth = Math.max(1.5, S * .06);
      g.strokeRect(0, 0, w, h);
      // De rotspunt eronder: het platform zweeft.
      const uh = under * S;
      if (ART.platform) {
        // Jorns zwevende rots, zonder zijn bovenste plaat, uitgerekt onder het platform.
        const img = ART.platform, cut = img.height * .1;
        g.drawImage(img, 0, cut, img.width, img.height - cut, -S * .15, h - S * .05, w + S * .3, uh + pad * .85);
        return { c, pad };
      }
      g.beginPath();
      g.moveTo(0, h);
      const n = Math.max(3, Math.round(s.w * 1.4));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const depth = Math.sin(Math.PI * k) ** .8 * uh * (.55 + r() * .5);
        pts.push([w * k + (r() - .5) * S * .2, h + depth]);
      }
      for (const [px, py] of pts) g.lineTo(px, py);
      g.lineTo(w, h);
      g.closePath();
      const ug = g.createLinearGradient(0, h, 0, h + uh);
      ug.addColorStop(0, shade(stone, .7)); ug.addColorStop(1, shade(stone, .25));
      g.fillStyle = ug;
      g.fill();
      g.strokeStyle = line;
      g.stroke();
      // Facetten
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = Math.max(1, S * .03);
      for (let i = 1; i < pts.length - 1; i += 2) { g.beginPath(); g.moveTo(pts[i][0], h); g.lineTo(pts[i][0] + (r() - .5) * S * .3, pts[i][1] * .98); g.stroke(); }
      // Lichtende kristalletjes in de rots
      for (let i = 0; i < Math.round(s.w / 2); i++) {
        const p = pts[1 + Math.floor(r() * (pts.length - 2))];
        const cx = p[0], cy = h + (p[1] - h) * (.3 + r() * .4);
        g.fillStyle = rgba(theme.glow, .9);
        g.beginPath(); g.moveTo(cx, cy - S * .14); g.lineTo(cx + S * .07, cy); g.lineTo(cx, cy + S * .14); g.lineTo(cx - S * .07, cy); g.fill();
      }
    } else {
      // Torenmuur: schietgaten die oplichten en een gouden band waar het gat begint.
      g.strokeStyle = line;
      g.lineWidth = Math.max(1.5, S * .07);
      g.strokeRect(0, 0, w, h);
      if (s.w >= 1.4) {
        for (let y = s.top ? h - S * 2.2 : S * 1.6; s.top ? y > 0 : y < h - S; y += s.top ? -S * 3 : S * 3) {
          g.fillStyle = '#05060f';
          g.fillRect(w / 2 - S * .1, y, S * .2, S * .7);
          g.fillStyle = rgba(theme.glow, .75);
          g.fillRect(w / 2 - S * .05, y + S * .08, S * .1, S * .55);
        }
      }
      g.fillStyle = theme.edge;
      if (s.top) g.fillRect(-S * .1, h - S * .22, w + S * .2, S * .22);
      if (s.bottom) {
        g.fillRect(-S * .1, 0, w + S * .2, S * .22);
        // Kantelen bovenop
        g.fillStyle = shade(stone, 1.1);
        const n = Math.max(2, Math.round(s.w / .55));
        for (let i = 0; i < n; i += 2) g.fillRect(i * w / n, -S * .35, w / n, S * .35);
      }
      if (s.drip) {
        g.fillStyle = shade(stone, .55);
        for (let i = 0; i < s.w - .2; i += .7) {
          g.beginPath(); g.moveTo(i * S, h); g.lineTo((i + .35) * S, h + S * .45); g.lineTo((i + .7) * S, h); g.fill();
        }
      }
    }
    return { c, pad };
  }
  function solid(ctx, s0, s, theme, sx, sy, S) {
    if (S !== solidS) { solidCache.clear(); solidS = S; }
    let b = solidCache.get(s0);
    if (!b) {
      if (solidCache.size > 300) solidCache.clear();
      b = bakeSolid(s0, theme, S);
      solidCache.set(s0, b);
    }
    const dy = s0.top ? (s0.h - Math.min(s0.h, 14)) * S : 0;
    ctx.drawImage(b.c, sx - b.pad, sy + dy - b.pad);
  }

  // Stalen kegels op een gouden voet.
  function spikes(ctx, s, sx, sy, S) {
    if (ART.stekels) {
      const img = ART.stekels, n = Math.max(1, Math.round(s.w / 1.1)), sw = s.w * S / n, sh = sw * img.height / img.width;
      for (let i = 0; i < n; i++) ctx.drawImage(img, sx + i * sw, sy - sh + S * .04, sw, sh);
      return;
    }
    const n = Math.max(1, Math.round(s.w / .55));
    const step = s.w * S / n;
    for (let i = 0; i < n; i++) {
      const x = sx + i * step;
      const grd = ctx.createLinearGradient(x, 0, x + step, 0);
      grd.addColorStop(0, '#4a5170'); grd.addColorStop(.45, '#f2f5ff'); grd.addColorStop(1, '#3b3f5c');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x + step * .1, sy - S * .12);
      ctx.lineTo(x + step * .5, sy - S * .62);
      ctx.lineTo(x + step * .9, sy - S * .12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#05060f';
      ctx.lineWidth = Math.max(1, S * .04);
      ctx.stroke();
      ctx.fillStyle = '#ffc94a';
      ctx.fillRect(x + step * .05, sy - S * .14, step * .9, S * .14);
      ctx.strokeRect(x + step * .05, sy - S * .14, step * .9, S * .14);
    }
  }

  function emitter(ctx, x, y, S, dir, lit) {
    if (ART.laser) {
      const img = ART.laser, ew = S * 1.0, eh = ew * img.height / img.width;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, dir);
      ctx.drawImage(img, -ew / 2, -eh, ew, eh);
      ctx.restore();
      if (lit !== '#5a1a28') glow(ctx, x + ew * .06, y - dir * eh * .5, S * .55, lit, .9);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, dir);
    ctx.fillStyle = '#2b3150';
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.rect(-S * .32, -S * .45, S * .64, S * .3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(-S * .24, -S * .15, S * .48, S * .1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit;
    ctx.beginPath(); ctx.rect(-S * .14, -S * .05, S * .28, S * .1); ctx.fill();
    ctx.restore();
  }
  function laser(ctx, l, sx, sy0, sy1, S, t) {
    const on = W.laserOn(l, t);
    const soon = !on && W.laserSoon(l, t);
    if (on) {
      const op = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      const fl = .85 + Math.sin(t * 60 + l.x) * .15;
      ctx.fillStyle = `rgba(255,40,70,${.28 * fl})`;
      ctx.fillRect(sx - S * .3, sy0, S * .6, sy1 - sy0);
      ctx.fillStyle = 'rgba(255,90,110,.85)';
      ctx.fillRect(sx - S * .1, sy0, S * .2, sy1 - sy0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - S * .03, sy0, S * .06, sy1 - sy0);
      ctx.globalCompositeOperation = op;
      glow(ctx, sx, sy0 + S * .1, S * .8, '#ff4d6d', .8);
      glow(ctx, sx, sy1 - S * .1, S * .8, '#ff4d6d', .8);
    } else if (soon && Math.floor(t * 14) % 2) {
      ctx.fillStyle = 'rgba(255,201,74,.6)';
      ctx.fillRect(sx - 1, sy0, 2, sy1 - sy0);
    }
    const lit = on ? '#ff4d6d' : soon ? '#ffc94a' : '#5a1a28';
    if (sy0 > -S) emitter(ctx, sx, sy0, S, -1, lit);
    emitter(ctx, sx, sy1, S, 1, lit);
  }

  function bar(ctx, b, sx, sy, S, t) {
    const a = W.barAngle(b, t);
    const n = 6;
    // Een staaf van gloeiende runebollen rond een gouden as.
    ctx.strokeStyle = 'rgba(255,140,66,.5)';
    ctx.lineWidth = S * .12;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * b.len * S, sy + Math.sin(a) * b.len * S); ctx.stroke();
    for (let i = n; i >= 1; i--) {
      const d = b.len * i / n;
      const x = sx + Math.cos(a) * d * S, y = sy + Math.sin(a) * d * S;
      glow(ctx, x, y, S * .6, '#ff6a2a', .75);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(x, y, S * .22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff1c2';
      ctx.beginPath(); ctx.arc(x - S * .05, y - S * .05, S * .1, 0, TAU); ctx.fill();
    }
    if (ART.vuurwiel) {
      const d = S * 1.15;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.drawImage(ART.vuurwiel, -d / 2, -d / 2, d, d);
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#2b3150';
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.arc(sx, sy, S * .34, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.arc(sx, sy, S * .15, 0, TAU); ctx.fill();
  }

  // De vlag: een gouden paal met een blauwe banier en een gouden ruit, zoals op het icoon.
  function flag(ctx, k, sx, sy, S, t, passed) {
    const col = passed ? '#4ade80' : '#ffc94a';
    if (ART.vlag) {
      // Jorns vlag op een runensteen; de paal staat op 42% van de breedte.
      const img = ART.vlag, fh = S * 3.9, fw = fh * img.width / img.height, x0 = sx - fw * .42;
      glow(ctx, sx + S * .5, sy - fh * .78, S * 2, col, passed ? .35 : .55);
      ctx.drawImage(img, x0, sy - fh, fw, fh);
      const cx = x0 + fw * .72 + Math.sin(t * 3.5 + k) * S * .04, cy = sy - fh * .8;
      ctx.fillStyle = col;
      ctx.strokeStyle = '#05060f';
      ctx.lineWidth = Math.max(1, S * .05);
      ctx.beginPath(); ctx.moveTo(cx, cy - S * .42); ctx.lineTo(cx + S * .32, cy); ctx.lineTo(cx, cy + S * .42); ctx.lineTo(cx - S * .32, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1030';
      ctx.font = `900 ${Math.round(S * .36)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(k), cx, cy + S * .03);
      return;
    }
    glow(ctx, sx + S * .7, sy - S * 2.8, S * 2.2, col, passed ? .3 : .6);
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.fillStyle = '#c9a54a';
    ctx.beginPath(); ctx.rect(sx - S * .1, sy - S * 3.7, S * .2, S * 3.7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(sx - S * .3, sy - S * .25, S * .6, S * .25); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(sx - S * .1, sy - S * 3.65, S * 1.85, S * .16); ctx.fill(); ctx.stroke();
    // Ruitje bovenaan
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.moveTo(sx, sy - S * 4.15); ctx.lineTo(sx + S * .17, sy - S * 3.85); ctx.lineTo(sx, sy - S * 3.6); ctx.lineTo(sx - S * .17, sy - S * 3.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    glow(ctx, sx, sy - S * 3.88, S * .6, '#ffe9a0', .8);
    const wave = Math.sin(t * 3.5 + k) * S * .1;
    const x0 = sx + S * .15, x1 = sx + S * 1.6, top = sy - S * 3.49;
    ctx.fillStyle = passed ? '#1f6e4a' : '#2a3fa0';
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.lineTo(x1 + wave * .5, sy - S * 1.75);
    ctx.lineTo((x0 + x1) / 2 + wave, sy - S * 2.15);
    ctx.lineTo(x0 + wave * .5, sy - S * 1.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.5, S * .08);
    ctx.stroke();
    // Gouden ruit met het nummer
    const cx = (x0 + x1) / 2 + wave * .5, cy = sy - S * 2.75;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(cx, cy - S * .5); ctx.lineTo(cx + S * .38, cy); ctx.lineTo(cx, cy + S * .5); ctx.lineTo(cx - S * .38, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1030';
    ctx.font = `900 ${Math.round(S * .42)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(k), cx, cy + S * .03);
  }

  function cellSprite(ctx, x, y, S, t) {
    const bob = Math.sin(t * 3 + x * .01) * S * .12;
    const yy = y + bob;
    glow(ctx, x, yy, S * 1, '#5ee7ff', .75);
    if (ART.cel) {
      const ch = S * .9, cw = ch * ART.cel.width / ART.cel.height;
      ctx.drawImage(ART.cel, x - cw / 2, yy - ch / 2, cw, ch);
      return;
    }
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = Math.max(1, S * .04);
    ctx.fillStyle = '#9ff4ff';
    ctx.beginPath(); ctx.moveTo(x, yy - S * .4); ctx.lineTo(x + S * .26, yy); ctx.lineTo(x, yy + S * .4); ctx.lineTo(x - S * .26, yy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2de2c8';
    ctx.beginPath(); ctx.moveTo(x, yy - S * .4); ctx.lineTo(x + S * .26, yy); ctx.lineTo(x, yy + S * .08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(x - S * .1, yy - S * .18, S * .05, S * .12);
  }

  // ---------- De raketridder ----------
  // Een donker stalen harnas met gouden randen, een rode cape en een raketrugzak van twee burchttorentjes.
  const PX = 64; // pixels per meter in het voorgebakken beeld
  const BOX = { w: 2.0, h: 2.1, fx: 1.0 }; // grootte van het beeld in meter, fx = plek van de voeten
  const knightCache = new Map();
  // Jorns geschilderde ridder: 2,05 m hoog, voeten op 215 px van links (van 343), straalpijpen gemeten op het beeld.
  const PAINT = { h: 2.05, fx: 215 / 343, noz: [[117 / 343, 235 / 400], [155 / 343, 245 / 400]] };
  function paintedKnight(color) {
    const img = ART.ridder, ppm = 100;
    const c = mk(ppm * PAINT.h * img.width / img.height, ppm * PAINT.h);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    tint(c, color);
    c.ppm = ppm;
    c.fx = c.width * PAINT.fx;
    c.noz = PAINT.noz.map(([nx, ny]) => [(nx * c.width - c.fx) / ppm, (ny - 1) * PAINT.h]);
    return c;
  }
  function knightSprite(color) {
    let c = knightCache.get(color);
    if (c) return c;
    if (ART.ridder) { c = paintedKnight(color); knightCache.set(color, c); return c; }
    c = mk(PX * BOX.w, PX * BOX.h);
    c.ppm = PX; c.fx = BOX.fx * PX; c.noz = [[-.54, -.5], [-.32, -.5]];
    const g = c.getContext('2d');
    const u = PX;
    g.translate(BOX.fx * u, c.height - u * .04);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const ink = '#05060f';
    const lw = u * .055;
    const steel = (x0, x1) => { const s = g.createLinearGradient(x0, 0, x1, 0); s.addColorStop(0, '#2a2f45'); s.addColorStop(.45, '#8d97b8'); s.addColorStop(.6, '#5d6684'); s.addColorStop(1, '#22263a'); return s; };
    const part = (fill, fn) => { g.fillStyle = fill; g.beginPath(); fn(); g.fill(); g.lineWidth = lw; g.strokeStyle = ink; g.stroke(); };
    const gold = '#ffc94a';
    // Cape die naar achter wappert
    part(color, () => { g.moveTo(-u * .12, -u * 1.12); g.quadraticCurveTo(-u * .6, -u * 1.05, -u * .95, -u * .62); g.lineTo(-u * .78, -u * .58); g.lineTo(-u * .86, -u * .4); g.quadraticCurveTo(-u * .45, -u * .55, -u * .18, -u * .6); g.closePath(); });
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath(); g.moveTo(-u * .2, -u * 1.0); g.quadraticCurveTo(-u * .55, -u * .9, -u * .8, -u * .6); g.lineTo(-u * .5, -u * .62); g.closePath(); g.fill();
    // Raketrugzak: twee burchttorentjes met kantelen, gouden banden en blauwe raampjes
    for (const [ox, top, len] of [[-.66, -1.42, .82], [-.44, -1.5, .9]]) {
      const x0 = ox * u, x1 = (ox + .24) * u;
      part(steel(x0, x1), () => g.rect(x0, top * u, x1 - x0, len * u));
      // kantelen
      for (let i = 0; i < 3; i += 2) part('#6b7398', () => g.rect(x0 + i * (x1 - x0) / 3, (top - .08) * u, (x1 - x0) / 3, .08 * u));
      part(gold, () => g.rect(x0 - u * .02, (top + .12) * u, x1 - x0 + u * .04, u * .07));
      part(gold, () => g.rect(x0 - u * .02, (top + len - .2) * u, x1 - x0 + u * .04, u * .07));
      g.fillStyle = '#5ee7ff';
      g.fillRect(x0 + (x1 - x0) * .35, (top + .3) * u, (x1 - x0) * .3, u * .16);
      // straalpijp
      part('#3b3f5c', () => { g.moveTo(x0 + u * .02, (top + len) * u); g.lineTo(x1 - u * .02, (top + len) * u); g.lineTo(x1 + u * .01, (top + len + .1) * u); g.lineTo(x0 - u * .01, (top + len + .1) * u); g.closePath(); });
    }
    // Achterste been
    part(steel(-u * .1, u * .1), () => g.rect(-u * .2, -u * .5, u * .17, u * .38));
    part('#2a2f45', () => g.rect(-u * .26, -u * .14, u * .26, u * .14));
    // Voorste been, licht gebogen
    part(steel(0, u * .25), () => { g.moveTo(u * .02, -u * .52); g.lineTo(u * .2, -u * .52); g.lineTo(u * .26, -u * .14); g.lineTo(u * .08, -u * .14); g.closePath(); });
    part(gold, () => g.rect(u * .04, -u * .36, u * .2, u * .06));
    part('#2a2f45', () => { g.moveTo(u * .06, -u * .15); g.lineTo(u * .36, -u * .15); g.lineTo(u * .38, -u * .02); g.lineTo(u * .04, -u * .02); g.closePath(); });
    // Romp met gouden randen
    part(steel(-u * .3, u * .3), () => { g.moveTo(-u * .28, -u * 1.15); g.lineTo(u * .27, -u * 1.15); g.lineTo(u * .24, -u * .5); g.lineTo(-u * .25, -u * .5); g.closePath(); });
    part(gold, () => g.rect(-u * .27, -u * .6, u * .52, u * .09));
    part('#2a2f45', () => g.rect(-u * .04, -u * .62, u * .12, u * .12));
    // Tabbaard in de kleur van de speler met een gouden ruit
    part(color, () => { g.moveTo(-u * .05, -u * 1.08); g.lineTo(u * .2, -u * 1.08); g.lineTo(u * .18, -u * .64); g.lineTo(-u * .05, -u * .64); g.closePath(); });
    part(gold, () => { g.moveTo(u * .075, -u * .98); g.lineTo(u * .14, -u * .86); g.lineTo(u * .075, -u * .74); g.lineTo(u * .01, -u * .86); g.closePath(); });
    // Schouderstuk en arm met een vuist naar voren
    part(steel(u * .0, u * .35), () => g.rect(u * .06, -u * 1.0, u * .36, u * .15));
    part(gold, () => g.rect(u * .3, -u * 1.01, u * .05, u * .17));
    part('#3b3f5c', () => { g.arc(u * .46, -u * .925, u * .1, 0, TAU); });
    part(steel(-u * .25, u * .1), () => { g.ellipse(-u * .06, -u * 1.12, u * .2, u * .13, 0, 0, TAU); });
    part(gold, () => { g.ellipse(-u * .06, -u * 1.12, u * .2, u * .05, 0, Math.PI, TAU); });
    // Helm met kam, gouden rand en blauw lichtend vizier
    part(steel(-u * .25, u * .3), () => { g.moveTo(-u * .22, -u * 1.22); g.lineTo(-u * .2, -u * 1.55); g.quadraticCurveTo(u * .05, -u * 1.72, u * .28, -u * 1.5); g.lineTo(u * .3, -u * 1.24); g.closePath(); });
    part(gold, () => { g.moveTo(-u * .2, -u * 1.55); g.quadraticCurveTo(u * .05, -u * 1.72, u * .28, -u * 1.5); g.lineTo(u * .26, -u * 1.45); g.quadraticCurveTo(u * .05, -u * 1.62, -u * .19, -u * 1.48); g.closePath(); });
    part(gold, () => g.rect(-u * .22, -u * 1.27, u * .52, u * .06));
    g.fillStyle = '#05060f';
    g.fillRect(u * .06, -u * 1.43, u * .25, u * .1);
    g.fillStyle = '#5ee7ff';
    g.fillRect(u * .09, -u * 1.41, u * .22, u * .05);
    // Pluim in de kleur van de speler
    part(color, () => { g.moveTo(-u * .05, -u * 1.66); g.quadraticCurveTo(-u * .35, -u * 1.95, -u * .62, -u * 1.6); g.quadraticCurveTo(-u * .38, -u * 1.7, -u * .15, -u * 1.58); g.closePath(); });
    knightCache.set(color, c);
    return c;
  }

  // sx, sy = voeten in pixels; S = pixels per meter.
  function knight(ctx, o, sx, sy, S, t) {
    const spr = knightSprite(o.color);
    const k = S / spr.ppm * 1.02;
    const face = o.face < 0 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blink && Math.floor(t * 12) % 2) ctx.globalAlpha *= .3;
    ctx.translate(sx, sy);
    ctx.scale(face, 1);
    if (o.turbo) glow(ctx, -S * .1, -S * .8, S * 1.5, '#ff6bd6', .4 + Math.sin(t * 8) * .1);
    else if (o.rim) glow(ctx, -S * .1, -S * .85, S * 1.2, o.color, .28);
    // Vlammen uit de twee torentjes: blauw-goud, met turbo roze-goud.
    if (o.jet) {
      const fl = .8 + Math.sin(t * 45 + (o.n || 0) * 3) * .2;
      const outer = o.turbo ? '#ff6bd6' : '#5ee7ff';
      for (const [ox, oy] of spr.noz) {
        const x = ox * 1.02 * S, y0 = oy * 1.02 * S;
        const len = S * (.75 + .25 * fl) * (o.turbo ? 1.3 : 1);
        glow(ctx, x, y0 + len * .45, S * .55, outer, .9, 1.7);
        const fg = ctx.createLinearGradient(0, y0, 0, y0 + len);
        fg.addColorStop(0, '#ffffff'); fg.addColorStop(.3, '#ffe08a'); fg.addColorStop(.75, rgba(outer, .7)); fg.addColorStop(1, rgba(outer, 0));
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x - S * .1, y0);
        ctx.quadraticCurveTo(x - S * .14, y0 + len * .5, x - S * .1 + Math.sin(t * 30) * S * .03, y0 + len);
        ctx.quadraticCurveTo(x + S * .14, y0 + len * .5, x + S * .1, y0);
        ctx.fill();
      }
    }
    ctx.drawImage(spr, -spr.fx * k, -spr.height * k, spr.width * k, spr.height * k);
    ctx.restore();
    // Brandstofbalkje boven de eigen ridder: zo zie je meteen hoeveel je nog hebt.
    if (o.fuel != null) {
      const bw = Math.max(44, S * 1.2), bh = Math.max(8, S * .2);
      const bx = sx - bw / 2, by = sy - S * 2.25 - bh;
      const f = Math.max(0, Math.min(1, o.fuel));
      const low = !o.turbo && f < .25;
      ctx.save();
      if (low && Math.floor(t * 6) % 2) ctx.globalAlpha = .55;
      ctx.fillStyle = 'rgba(5,8,20,.75)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = o.turbo ? '#ff6bd6' : low ? '#ff4d6d' : f < .5 ? '#ffc94a' : '#5ee7ff';
      ctx.fillRect(bx, by, bw * f, bh);
      ctx.strokeStyle = 'rgba(242,245,255,.8)';
      ctx.lineWidth = Math.max(1, bh * .18);
      ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.restore();
    }
    if (o.name) {
      ctx.font = `800 ${Math.max(11, Math.round(S * .34))}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const tw = ctx.measureText(o.name).width;
      const ty = sy - S * 2.15;
      ctx.fillStyle = 'rgba(5,8,20,.7)';
      ctx.fillRect(sx - tw / 2 - 5, ty - S * .42, tw + 10, S * .46);
      ctx.fillStyle = o.color;
      ctx.fillRect(sx - tw / 2 - 5, ty + S * .02, tw + 10, 2);
      ctx.fillStyle = '#f2f5ff';
      ctx.fillText(o.name, sx, ty);
    }
  }

  // ---------- Lava ----------
  function lava(ctx, theme, w, h, camX, S, sy0, t) {
    if (sy0 > h + S) return;
    const grad = ctx.createLinearGradient(0, sy0, 0, Math.max(sy0 + S * 3, h));
    grad.addColorStop(0, theme.lavaHi);
    grad.addColorStop(.08, theme.lava);
    grad.addColorStop(1, shade(theme.lava, .3));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    const step = Math.max(10, w / 48);
    for (let x = 0; x <= w + step; x += step) {
      const wx = camX + (x - w / 2) / S;
      ctx.lineTo(x, sy0 + Math.sin(wx * 1.3 + t * 2.2) * S * .12 + Math.sin(wx * .5 - t * 1.3) * S * .1);
    }
    ctx.lineTo(w, h + 2);
    ctx.fill();
    // Lichtende aders in de lava
    ctx.strokeStyle = rgba(theme.lavaHi, .35);
    ctx.lineWidth = Math.max(1, S * .06);
    ctx.beginPath();
    for (let row = 1; row <= 2; row++) {
      const yy = sy0 + S * (.5 + row * .55);
      for (let x = 0; x <= w + step; x += step) {
        const wx = camX + (x - w / 2) / S;
        const y = yy + Math.sin(wx * .8 + row * 2 + t * (1 + row * .3)) * S * .15;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    // Bubbels en vonken die opstijgen
    const span = w / S;
    for (let i = 0; i < 14; i++) {
      const wx = Math.floor(camX - span / 2) + ((i * 7.31 + Math.floor(camX / 40) * 3) % (span + 2));
      const ph = (t * (.4 + (i % 5) * .13) + i * .37) % 1;
      const x = (wx - camX) * S + w / 2;
      if (i % 2) {
        const r = S * .14 * Math.sin(ph * Math.PI);
        ctx.fillStyle = rgba(theme.lavaHi, .8);
        ctx.beginPath(); ctx.arc(x, sy0 + S * .2, r, 0, TAU); ctx.fill();
      } else {
        glow(ctx, x + Math.sin(ph * 6 + i) * S * .3, sy0 - ph * S * 3, S * .25 * (1 - ph), theme.lavaHi, 1 - ph);
      }
    }
    glow(ctx, w / 2, sy0, w * .65, theme.lava, .4, .14);
  }

  // ---------- Alles samen ----------
  // v: { seed, t (speeltijd in s), cx, cy (camera, meter), S (pixels per meter), me, ghosts, hide (Set met cel-ids), passed (aantal vlaggen) }
  function render(ctx, w, h, v) {
    const S = Math.round(v.S * 4) / 4;
    const left = v.cx - w / 2 / S, right = v.cx + w / 2 / S;
    const X = x => Math.round((x - v.cx) * S + w / 2);
    const Y = y => Math.round((y - v.cy) * S + h / 2);
    const kc = Math.max(0, Math.floor(v.cx / W.L));
    const theme = W.themeOf(kc);
    const nextTheme = W.themeOf(kc + 1);
    let fade = 0;
    if (nextTheme !== theme) fade = Math.max(0, Math.min(1, (v.cx - (kc + 1) * W.L + 14) / 14));
    const th = fade > .5 ? nextTheme : theme;
    const bA = backdrop(theme, h), bB = fade > 0 ? backdrop(nextTheme, h) : null;
    if (bA) drawBack(ctx, bA, w, h, v, S, 1); else ctx.drawImage(sky(theme, w, h), 0, 0);
    if (fade > 0) {
      if (bB) drawBack(ctx, bB, w, h, v, S, fade);
      else { ctx.globalAlpha = fade; ctx.drawImage(sky(nextTheme, w, h), 0, 0); ctx.globalAlpha = 1; }
    }
    for (const depth of (bA ? [] : [0, 1])) {
      const img = layer(th, h, depth);
      const par = depth ? .35 : .12;
      const off = -((v.cx * S * par) % img.width + img.width) % img.width;
      const dy = Math.round((depth ? .25 : .1) * (W.H / 2 - v.cy) * S);
      for (let x = off; x < w; x += img.width) ctx.drawImage(img, Math.round(x), dy);
    }

    // De baan
    const k0 = Math.max(0, Math.floor((left - 6) / W.L)), k1 = Math.floor((right + 6) / W.L);
    for (let k = k0; k <= k1; k++) {
      const st = W.stage(v.seed, k);
      const tm = st.theme;
      for (const s0 of st.solids) {
        const s = W.at(s0, v.t);
        if (s.x > right + 1 || s.x + s.w < left - 1) continue;
        if (s0.mv) {
          const fl = .75 + Math.sin(v.t * 30 + s0.x) * .25;
          for (const f of [.22, .78]) glow(ctx, X(s.x + s.w * f), Y(s.y + s.h + .35), S * .5 * fl, '#5ee7ff', .9, 1.5);
        }
        solid(ctx, s0, s, tm, X(s.x), Y(s.y), S);
      }
      for (const s of st.spikes) if (s.x < right && s.x + s.w > left) spikes(ctx, s, X(s.x), Y(s.y), S);
      for (const l of st.lasers) if (Math.abs(l.x - v.cx) < (right - left) / 2 + 1) laser(ctx, l, X(l.x), Y(l.y0), Y(l.y1), S, v.t);
      for (const b of st.bars) if (Math.abs(b.cx - v.cx) < (right - left) / 2 + 4) bar(ctx, b, X(b.cx), Y(b.cy), S, v.t);
      for (const c of st.cells) {
        if (c.x < left - 1 || c.x > right + 1 || (v.hide && v.hide.has(c.id))) continue;
        cellSprite(ctx, X(c.x), Y(c.y), S, v.t);
      }
      if (k > 0 && st.x0 > left - 3 && st.x0 < right + 2) flag(ctx, k, X(st.x0), Y(W.BASE_Y), S, v.t, v.passed >= k);
    }

    for (const o of v.ghosts || []) {
      if (o.x < left - 2 || o.x > right + 2) continue;
      knight(ctx, o, X(o.x), Y(o.y), S, v.t);
    }
    if (v.me) knight(ctx, v.me, X(v.me.x), Y(v.me.y), S, v.t);

    lava(ctx, th, w, h, v.cx, S, Y(W.LAVA), v.t);
    Glow.vignette(ctx, w, h, .45);
  }

  return { render, knight, knightSprite };
})();
