// Wankelwagen tekenen: de lucht, de baan, de wiebelbruggen, wippen, ophaalbruggen, stekelballen en de karren (zijaanzicht).
// De lucht, de verre burchten, elke kar en elk wiel bakken we één keer op een eigen canvas. De grond is per etappe één pad
// dat we vullen met een stenen patroon: weinig werk per frame, ook op een Chromebook.
// Gebruikt WwWorld en Glow (fx.js).
const WwDraw = (() => {
  const W = WwWorld;
  const { rgba, glow } = Glow;
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const INK = '#05060f';
  function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(hex, f) { const [r, g, b] = hexRgb(hex); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(r)},${c(g)},${c(b)})`; }

  // ---------- Jorns geschilderde beelden (public/img/wankelwagen/) ----------
  // Is een beeld er (nog) niet, dan tekenen we dat stuk zelf zoals vroeger.
  const ART = {};
  const ART_NAMEN = ['kar', 'ridder', 'toren', 'tank', 'koets', 'ros', 'raket', 'vleugel', 'plank', 'vlag', 'stekelbal', 'stekels', 'baansteen',
    'wiel', 'wiel-reus', 'wiel-ijs', 'wiel-vierkant', 'wiel-steen', 'wiel-magneet', 'wiel-maan',
    'lucht-burchtwallen', 'lucht-kristalgrot', 'lucht-sterrenbrug'];
  if (typeof Image !== 'undefined') {
    for (const n of ART_NAMEN) {
      const img = new Image();
      img.onload = () => {
        ART[n] = img;
        // Alles wat uit dit beeld gebakken werd, opnieuw bakken.
        bodyCache.clear(); wheelCache.clear(); patCache.clear(); backCache.clear();
      };
      img.src = `/img/wankelwagen/${n}.webp`;
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
  // De blauwe delen (pluim, cape, vaantje) krijgen de kleur van de speler. Het cyaan vizier blijft cyaan.
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
  const BACK = { Burchtwallen: 'lucht-burchtwallen', Kristalgrot: 'lucht-kristalgrot', Sterrenbrug: 'lucht-sterrenbrug' };
  function backdrop(theme, h) {
    const img = ART[BACK[theme.name]];
    if (!img) return null;
    const H = Math.min(1400, Math.round(h * 1.12));
    const key = theme.name + ':' + H;
    let b = backCache.get(key);
    if (b) return b;
    if (backCache.size > 4) backCache.clear();
    const w = Math.round(img.width * H / img.height);
    const c = mk(w * 2, H), g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, H);
    g.save(); g.translate(w * 2, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, w, H); g.restore();
    // De kleur onderaan het schilderij vult alles daaronder.
    const px = g.getImageData(w, H - 2, 1, 1).data;
    b = { c, bottom: `rgb(${px[0]},${px[1]},${px[2]})` };
    backCache.set(key, b);
    return b;
  }
  function drawBack(ctx, b, w, h, v, S, alpha) {
    ctx.globalAlpha = alpha;
    const bw = b.c.width;
    const off = -((v.cx * S * .08) % bw + bw) % bw;
    const dy = Math.min(0, Math.round(Math.max(-h * .1, Math.min(h * .08, .1 * (W.BASE - 3 - v.cy) * S)) - h * .06));
    ctx.fillStyle = b.bottom; ctx.fillRect(0, dy + b.c.height - 2, w, h);
    for (let x = off; x < w; x += bw) ctx.drawImage(b.c, Math.round(x), dy);
    ctx.globalAlpha = 1;
  }

  // ---------- Lucht en verre lagen ----------
  const skyCache = new Map();
  function sky(theme, w, h) {
    const key = `${theme.name}:${w}x${h}`;
    let c = skyCache.get(key);
    if (c) return c;
    if (skyCache.size > 6) skyCache.clear();
    c = mk(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky[0]); grad.addColorStop(.62, theme.sky[1]); grad.addColorStop(1, theme.sky[2]);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const r = W.rng(theme.name.length * 131);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * .6})`;
      const s = r() < .08 ? 2 : 1;
      g.fillRect(r() * w, r() * h * .6, s, s);
    }
    if (theme.name === 'Burchtwallen') {
      // Grote ondergaande zon met strepen
      const sx = w * .7, sy = h * .62, sr = h * .2;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3);
      sg.addColorStop(0, 'rgba(255,220,150,.9)'); sg.addColorStop(.25, 'rgba(255,150,100,.35)'); sg.addColorStop(1, 'rgba(255,120,90,0)');
      g.fillStyle = sg; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd08a';
      g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
      g.fillStyle = theme.sky[2];
      for (let i = 0; i < 5; i++) g.fillRect(sx - sr, sy + sr * (.15 + i * .17), sr * 2, sr * (.04 + i * .015));
      for (let i = 0; i < 18; i++) {
        const cx = r() * w, cy = h * (.15 + r() * .4), cw = w * (.05 + r() * .12), ch = h * (.012 + r() * .02);
        g.fillStyle = `rgba(110,70,160,${.3 + r() * .2})`;
        g.beginPath(); g.ellipse(cx, cy, cw, ch, 0, 0, TAU); g.fill();
        g.fillStyle = `rgba(255,190,140,${.12 + r() * .1})`;
        g.beginPath(); g.ellipse(cx, cy - ch * .5, cw * .8, ch * .4, 0, 0, TAU); g.fill();
      }
    } else if (theme.name === 'Kristalgrot') {
      // Grotplafond met lichtende kristallen
      for (let i = 0; i < 40; i++) {
        const x = r() * w, len = h * (.05 + r() * .18), bw = 8 + r() * 26;
        g.fillStyle = `rgba(20,10,40,${.7 + r() * .3})`;
        g.beginPath(); g.moveTo(x - bw, 0); g.lineTo(x, len); g.lineTo(x + bw, 0); g.fill();
      }
      for (let i = 0; i < 26; i++) {
        const x = r() * w, y = r() * h * .5, s = 6 + r() * 16;
        const col = r() < .5 ? '#c77dff' : '#5ee7ff';
        const gl = g.createRadialGradient(x, y, 0, x, y, s * 3);
        gl.addColorStop(0, rgba(col, .35)); gl.addColorStop(1, rgba(col, 0));
        g.fillStyle = gl; g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
        g.fillStyle = rgba(col, .8);
        g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .4, y); g.lineTo(x, y + s * .6); g.lineTo(x - s * .4, y); g.fill();
      }
    } else {
      const neb = g.createRadialGradient(w * .3, h * .35, 0, w * .3, h * .35, h * .8);
      neb.addColorStop(0, 'rgba(199,125,255,.3)'); neb.addColorStop(.5, 'rgba(76,201,255,.1)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(220,230,255,${.2 + r() * .7})`; g.fillRect(r() * w, r() * h * .85, 1, 1); }
      const px = w * .78, py = h * .26, pr = h * .13;
      const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
      pg.addColorStop(0, '#ffc0f0'); pg.addColorStop(.6, '#8a4ab0'); pg.addColorStop(1, '#2a1048');
      g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(94,231,255,.6)'; g.lineWidth = Math.max(2, pr * .06);
      g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .35, -.2, 0, TAU); g.stroke();
    }
    skyCache.set(key, c);
    return c;
  }

  const layerCache = new Map();
  function layer(theme, h, depth) {
    const key = `${theme.name}:${h}:${depth}`;
    let c = layerCache.get(key);
    if (c) return c;
    if (layerCache.size > 12) layerCache.clear();
    const w = 1400;
    c = mk(w, h * 1.6); // hoger dan het scherm: zo is de onderkant nooit open als de camera hoger kijkt
    const g = c.getContext('2d');
    const r = W.rng(theme.name.length * 17 + depth * 5);
    const col = depth ? theme.mid : theme.far;
    const win = theme.name === 'Burchtwallen' ? 'rgba(255,190,90,.75)' : rgba(theme.glow, .6);
    const base = h * (depth ? .78 : .7);
    g.fillStyle = col;
    let x = -20;
    while (x < w + 20) {
      const tw = (depth ? 40 : 24) + r() * (depth ? 70 : 50), th = h * ((depth ? .1 : .14) + r() * (depth ? .2 : .3));
      if (theme.name === 'Kristalgrot') {
        g.beginPath(); g.moveTo(x, base); g.lineTo(x + tw * .5, base - th * 1.3); g.lineTo(x + tw, base); g.fill();
        g.fillStyle = rgba(r() < .5 ? '#c77dff' : '#5ee7ff', depth ? .35 : .25);
        g.beginPath(); g.moveTo(x + tw * .5, base - th * 1.3); g.lineTo(x + tw * .62, base - th * .5); g.lineTo(x + tw * .5, base - th * .3); g.fill();
      } else if (theme.name === 'Sterrenbrug' && r() < .5) {
        g.fillRect(x + tw * .35, base - th * 1.4, tw * .3, th * 1.4);
        g.fillStyle = win;
        g.fillRect(x + tw * .48, base - th * 1.6, 2, th * .3);
        g.beginPath(); g.arc(x + tw * .49, base - th * 1.62, 3, 0, TAU); g.fill();
      } else {
        g.fillRect(x, base - th, tw, th);
        const n = Math.max(2, Math.round(tw / 9));
        for (let i = 0; i < n; i += 2) g.fillRect(x + i * tw / n, base - th - 6, tw / n, 6);
        if (r() < .45) { g.beginPath(); g.moveTo(x - 3, base - th); g.lineTo(x + tw / 2, base - th - tw * .8); g.lineTo(x + tw + 3, base - th); g.fill(); }
        g.fillStyle = win;
        for (let i = 0; i < 3; i++) if (r() < .6) g.fillRect(x + tw * (.2 + r() * .6), base - th * (.25 + r() * .6), 2, 4);
      }
      g.fillStyle = col;
      x += tw + r() * (depth ? 40 : 10);
    }
    g.fillRect(0, base, w, c.height - base);
    // Mist onderaan: de verre burchten lopen weg in het donker.
    const mist = g.createLinearGradient(0, base - h * .04, 0, base + h * .05);
    mist.addColorStop(0, rgba(theme.sky[2], depth ? 0 : .1)); mist.addColorStop(1, 'rgba(6,6,20,.92)');
    g.fillStyle = mist; g.fillRect(0, base - h * .05, w, c.height - base + h * .05);
    layerCache.set(key, c);
    return c;
  }

  // ---------- De grond ----------
  // Een stenen patroon per wereld (1 tegel = 2 bij 1 meter), en per etappe een pad in meter.
  // Eén hoge tegel met de donkere onderkant er al in gebakken: zo vullen we de grond in één keer.
  const patCache = new Map();
  const PAT_TOP = W.BASE - 9;
  function stonePattern(ctx, theme) {
    let p = patCache.get(theme.name);
    if (p) return p;
    const hM = W.BOTTOM - PAT_TOP;
    const tex = ART.baansteen;
    // Jorns geschilderde muur: één tegel is 5 meter breed, een beetje in de kleur van de wereld.
    const TW = tex ? 320 : 128;
    const c = mk(TW, hM * 64);
    const g = c.getContext('2d');
    g.fillStyle = theme.earth; g.fillRect(0, 0, TW, c.height);
    const r = W.rng(theme.name.length * 7);
    if (tex) {
      for (let y = 0; y < c.height; y += TW) g.drawImage(tex, 0, y, TW, TW);
      g.globalCompositeOperation = 'color';
      g.globalAlpha = theme.name === 'Sterrenbrug' ? .15 : .4;
      g.fillStyle = theme.stone; g.fillRect(0, 0, TW, c.height);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    } else for (let row = 0; row < hM * 2; row++) {
      for (let i = -1; i < 3; i++) {
        const x = i * 52 + (row % 2 ? 26 : 0) + r() * 4, y = row * 32;
        const f = .85 + r() * .35;
        const grd = g.createLinearGradient(0, y, 0, y + 32);
        grd.addColorStop(0, shade(theme.stone, f * 1.25)); grd.addColorStop(1, shade(theme.stone, f * .75));
        g.fillStyle = grd;
        g.fillRect(x + 2, y + 2, 48, 28);
        if (r() < .5) { g.fillStyle = rgba(theme.glow, .4); g.fillRect(x + 8 + r() * 30, y + 8 + r() * 14, 2, 2); }
      }
    }
    const y0 = (W.BASE - 2.5 - PAT_TOP) * 64, y1 = (W.BASE + 6 - PAT_TOP) * 64;
    const dark = g.createLinearGradient(0, y0, 0, y1);
    dark.addColorStop(0, 'rgba(5,6,16,0)'); dark.addColorStop(.3, 'rgba(5,6,16,.25)'); dark.addColorStop(1, 'rgba(5,6,16,.92)');
    g.fillStyle = dark; g.fillRect(0, y0, TW, c.height - y0);
    p = ctx.createPattern(c, 'repeat');
    if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().translate(0, PAT_TOP).scale(1 / 64));
    patCache.set(theme.name, p);
    return p;
  }
  const pathCache = new Map();
  function paths(st) {
    const key = `${st.k}:${st.x0}:${st.grounds.length}:${st.segs.length}`;
    let p = pathCache.get(st);
    if (p && p.key === key) return p;
    const fill = new Path2D(), top = new Path2D();
    for (const g of st.grounds) {
      fill.moveTo(g[0][0], W.BOTTOM);
      for (const [x, y] of g) fill.lineTo(x, Math.min(y, W.BOTTOM));
      fill.lineTo(g[g.length - 1][0], W.BOTTOM);
      fill.closePath();
      let open = false;
      for (let i = 0; i < g.length; i++) {
        const [x, y] = g[i];
        if (y > W.VOID) { open = false; continue; }
        if (!open) { top.moveTo(x, y); open = true; } else top.lineTo(x, y);
      }
    }
    // Kristallen of lichtpalen langs de rand, één keer gekozen per etappe.
    const bits = [];
    const r = W.rng(st.k * 977 + 5);
    for (const g of st.grounds) for (let i = 0; i < g.length - 1; i++) {
      const [ax, ay] = g[i], [bx, by] = g[i + 1];
      if (ay > W.VOID || by > W.VOID || Math.abs(bx - ax) < .3) continue;
      if (r() < Math.min(.6, (bx - ax) * .22)) bits.push([ax + (bx - ax) * .5, (ay + by) / 2, r()]);
    }
    p = { key, fill, top, bits };
    pathCache.set(st, p);
    if (pathCache.size > 40) pathCache.delete(pathCache.keys().next().value);
    return p;
  }

  // ---------- Lava in de putten ----------
  function lava(ctx, theme, w, h, cx, S, sy, t) {
    if (sy > h + S) return;
    const grad = ctx.createLinearGradient(0, sy - S * .3, 0, sy + S * 4);
    grad.addColorStop(0, theme.lavaHi); grad.addColorStop(.1, theme.lava); grad.addColorStop(1, shade(theme.lava, .25));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    const step = Math.max(12, w / 40);
    for (let x = 0; x <= w + step; x += step) {
      const wx = cx + (x - w / 2) / S;
      ctx.lineTo(x, sy + Math.sin(wx * 1.4 + t * 2.4) * S * .12 + Math.sin(wx * .6 - t * 1.2) * S * .1);
    }
    ctx.lineTo(w, h + 2);
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const span = w / S;
      const wx = Math.floor(cx - span / 2) + ((i * 5.31 + Math.floor(cx / 30) * 3) % (span + 2));
      const ph = (t * (.4 + (i % 4) * .15) + i * .37) % 1;
      const x = (wx - cx) * S + w / 2;
      glow(ctx, x + Math.sin(ph * 6 + i) * S * .3, sy - ph * S * 2.6, S * .3 * (1 - ph), theme.lavaHi, 1 - ph);
    }
  }

  // ---------- Wat beweegt ----------
  function bridge(ctx, b, pts, theme, X, Y, S) {
    // Touwen
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1.5, S * .07);
    ctx.beginPath();
    ctx.moveTo(X(b.ax), Y(b.ay - 1.4));
    for (const [x, y] of pts) ctx.lineTo(X(x), Y(y - 1.1));
    ctx.lineTo(X(b.bx), Y(b.by - 1.4));
    ctx.stroke();
    ctx.lineWidth = Math.max(1, S * .03);
    ctx.beginPath();
    for (let i = 1; i < pts.length - 1; i += 2) { ctx.moveTo(X(pts[i][0]), Y(pts[i][1] - 1.1)); ctx.lineTo(X(pts[i][0]), Y(pts[i][1])); }
    ctx.stroke();
    // Planken
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      ctx.save();
      ctx.translate(X((ax + bx) / 2), Y((ay + by) / 2));
      ctx.rotate(Math.atan2(by - ay, bx - ax));
      const pw = Math.hypot(bx - ax, by - ay) * S * .92, ph = S * .22;
      if (ART.plank) { ctx.drawImage(ART.plank, -pw / 2, -ph * .2, pw, ph * 1.5); ctx.restore(); continue; }
      ctx.fillStyle = i % 2 ? '#a06a3a' : '#8a5a30';
      ctx.fillRect(-pw / 2, 0, pw, ph);
      ctx.fillStyle = 'rgba(255,220,160,.35)';
      ctx.fillRect(-pw / 2, 0, pw, ph * .25);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .035);
      ctx.strokeRect(-pw / 2, 0, pw, ph);
      ctx.restore();
    }
  }
  function post(ctx, x, y, S, theme) {
    ctx.fillStyle = shade(theme.stone, 1.1);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.beginPath(); ctx.rect(x - S * .22, y - S * 1.6, S * .44, S * 1.6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.top;
    ctx.beginPath(); ctx.rect(x - S * .3, y - S * 1.75, S * .6, S * .2); ctx.fill(); ctx.stroke();
  }
  function plank(ctx, ax, ay, bx, by, S, color) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(by - ay, bx - ax));
    const len = Math.hypot(bx - ax, by - ay), th = S * .3;
    if (ART.plank) {
      // Jorns plank: per stuk van ongeveer 3 meter, zodat het hout niet uitrekt.
      const n = Math.max(1, Math.round(len / (S * 3))), pw = len / n;
      for (let i = 0; i < n; i++) ctx.drawImage(ART.plank, i * pw, -th * .15, pw + 1, th * 1.4);
      ctx.restore();
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, len, th);
    ctx.fillStyle = 'rgba(255,220,160,.3)';
    ctx.fillRect(0, 0, len, th * .25);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.strokeRect(0, 0, len, th);
    ctx.fillStyle = '#c9a54a';
    for (let x = S * .4; x < len - S * .2; x += S * 1.2) ctx.fillRect(x, th * .3, S * .1, th * .4);
    ctx.restore();
  }
  function wip(ctx, w, a, theme, X, Y, S) {
    // Stenen voet onder het draaipunt
    ctx.fillStyle = shade(theme.stone, .9); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.moveTo(X(w.px), Y(w.py + .1)); ctx.lineTo(X(w.px + 1.3), Y(W.PIT + .5)); ctx.lineTo(X(w.px - 1.3), Y(W.PIT + .5)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const [ax, ay, bx, by] = W.wipEnds(w, a);
    plank(ctx, X(ax), Y(ay), X(bx), Y(by), S, '#8a5a30');
    ctx.fillStyle = theme.top;
    ctx.beginPath(); ctx.arc(X(w.px), Y(w.py + .15), S * .22, 0, TAU); ctx.fill(); ctx.stroke();
    glow(ctx, X(w.px), Y(w.py + .15), S * .5, theme.glow, .6);
  }
  function drawbridge(ctx, o, t, theme, X, Y, S) {
    const [ax, ay, bx, by] = W.drawEnds(o, t);
    // Poorttoren met ketting
    const tx = X(o.x - .6), ty = Y(o.y);
    ctx.fillStyle = shade(theme.stone, 1); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.rect(tx - S * .7, ty - S * 5, S * 1.1, S * 5); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(tx - S * .7 + i * S * .42, ty - S * 5.35, S * .26, S * .35); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = INK; ctx.fillRect(tx - S * .3, ty - S * 3.8, S * .3, S * .7);
    ctx.fillStyle = rgba(theme.glow, .8); ctx.fillRect(tx - S * .22, ty - S * 3.7, S * .14, S * .5);
    ctx.strokeStyle = '#9aa3c0'; ctx.lineWidth = Math.max(1.5, S * .06);
    ctx.setLineDash([S * .14, S * .08]);
    ctx.beginPath(); ctx.moveTo(tx, ty - S * 4.4); ctx.lineTo(X(bx), Y(by)); ctx.stroke();
    ctx.setLineDash([]);
    plank(ctx, X(ax), Y(ay), X(bx), Y(by), S, '#7a4e2a');
    const a = W.drawAngle(o, t);
    if (a > .01) glow(ctx, X(bx), Y(by), S * .7, '#ff4d6d', .5);
  }
  function hammer(ctx, hm, t, X, Y, S) {
    const [ex, ey] = W.hammerHead(hm, t);
    const px = X(hm.x), py = Y(hm.y);
    ctx.strokeStyle = '#7f88a8'; ctx.lineWidth = Math.max(2, S * .09);
    ctx.setLineDash([S * .16, S * .07]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X(ex), Y(ey)); ctx.stroke();
    ctx.setLineDash([]);
    const R = hm.R * S, cx = X(ex), cy = Y(ey);
    const a0 = W.hammerAngle(hm, t) * 2;
    if (ART.stekelbal) {
      glow(ctx, cx, cy, R * 1.8, '#ff6a2a', .25);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0);
      ctx.drawImage(ART.stekelbal, -R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
      ctx.restore();
      ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
      ctx.beginPath(); ctx.arc(px, py, S * .16, 0, TAU); ctx.fill(); ctx.stroke();
      return;
    }
    // Stekels rondom
    ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    for (let i = 0; i < 8; i++) {
      const a = a0 + i * TAU / 8;
      const c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cx + c * R * 1.55, cy + s * R * 1.55);
      ctx.lineTo(cx + Math.cos(a + .3) * R * .9, cy + Math.sin(a + .3) * R * .9);
      ctx.lineTo(cx + Math.cos(a - .3) * R * .9, cy + Math.sin(a - .3) * R * .9);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const grd = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .1, cx, cy, R);
    grd.addColorStop(0, '#6b7398'); grd.addColorStop(1, '#14182a');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
    glow(ctx, cx, cy, R * 1.8, '#ff6a2a', .25);
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.arc(px, py, S * .16, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function gallows(ctx, d, theme, X, Y, S) {
    const x = X(d.x), y = Y(d.y), top = Y(d.top);
    ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .045);
    for (const ox of [-5.6, 5.6]) { ctx.beginPath(); ctx.rect(x + ox * S - S * .18, top - S * .2, S * .36, y - top + S * .2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.rect(x - S * 5.8, top - S * .4, S * 11.6, S * .4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.top;
    ctx.fillRect(x - S * 5.8, top - S * .4, S * 11.6, S * .08);
  }
  function spikes(ctx, s, X, Y, S) {
    const n = Math.max(1, Math.round(s.w / .45));
    const step = s.w * S / n, sx = X(s.x), sy = Y(s.y);
    if (ART.stekels) {
      // Eén rij geschilderde stekels per 2 meter.
      const m = Math.max(1, Math.round(s.w / 2)), pw = s.w * S / m, ph = S * .8;
      for (let i = 0; i < m; i++) ctx.drawImage(ART.stekels, sx + i * pw, sy - ph * .9, pw, ph);
      return;
    }
    for (let i = 0; i < n; i++) {
      const x = sx + i * step;
      const grd = ctx.createLinearGradient(x, 0, x + step, 0);
      grd.addColorStop(0, '#4a5170'); grd.addColorStop(.45, '#f2f5ff'); grd.addColorStop(1, '#3b3f5c');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(x + step * .08, sy); ctx.lineTo(x + step * .5, sy - S * .62); ctx.lineTo(x + step * .92, sy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .035); ctx.stroke();
    }
    ctx.fillStyle = '#ffc94a';
    ctx.fillRect(sx, sy - S * .08, s.w * S, S * .12);
  }
  function torch(ctx, x, y, S, t, theme) {
    ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.beginPath(); ctx.rect(x - S * .08, y - S * 1.8, S * .16, S * 1.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.rect(x - S * .2, y - S * 2, S * .4, S * .22); ctx.fill(); ctx.stroke();
    const fl = .85 + Math.sin(t * 13 + x) * .1 + Math.sin(t * 7.3 + x * 2) * .08;
    const col = theme.name === 'Burchtwallen' ? '#ff9a3a' : theme.glow;
    glow(ctx, x, y - S * 2.3, S * 1.8 * fl, col, .7);
    ctx.fillStyle = '#fff1c2';
    ctx.beginPath(); ctx.ellipse(x, y - S * 2.25, S * .12, S * .25 * fl, 0, 0, TAU); ctx.fill();
  }

  function flag(ctx, k, sx, sy, S, t, passed) {
    const col = passed ? '#4ade80' : '#ffc94a';
    if (ART.vlag) {
      // Jorns vlag met runensteen; het nummer zweeft in een gouden (of groene) bol boven de paal.
      const img = ART.vlag, hh = S * 3.9, ww = img.width * hh / img.height;
      const px = sx - ww * .24;
      glow(ctx, sx + ww * .45, sy - S * .7, S * 1.4, passed ? '#4ade80' : '#5ee7ff', passed ? .7 : .5);
      const wave = 1 + Math.sin(t * 3.5 + k) * .03;
      ctx.drawImage(img, px, sy - hh * wave, ww, hh * wave);
      const bx = sx, by = sy - hh - S * .55;
      glow(ctx, bx, by, S * .9, col, .7);
      ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      ctx.beginPath(); ctx.arc(bx, by, S * .38, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1030';
      ctx.font = `900 ${Math.round(S * .46)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(k), bx, by + S * .02);
      return;
    }
    glow(ctx, sx + S * .7, sy - S * 2.8, S * 2.2, col, passed ? .3 : .6);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
    ctx.fillStyle = '#c9a54a';
    ctx.beginPath(); ctx.rect(sx - S * .1, sy - S * 3.7, S * .2, S * 3.7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(sx - S * .35, sy - S * .3, S * .7, S * .3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.moveTo(sx, sy - S * 4.15); ctx.lineTo(sx + S * .17, sy - S * 3.85); ctx.lineTo(sx, sy - S * 3.6); ctx.lineTo(sx - S * .17, sy - S * 3.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    glow(ctx, sx, sy - S * 3.88, S * .6, '#ffe9a0', .8);
    const wave = Math.sin(t * 3.5 + k) * S * .12;
    const x0 = sx + S * .1, top = sy - S * 3.6;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.quadraticCurveTo(x0 + S * .9, top - wave, x0 + S * 1.8, top + S * .2 + wave);
    ctx.lineTo(x0 + S * 1.5, top + S * .65);
    ctx.lineTo(x0 + S * 1.8, top + S * 1.1 - wave);
    ctx.quadraticCurveTo(x0 + S * .9, top + S * 1.3 + wave, x0, top + S * 1.3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1030';
    ctx.font = `900 ${Math.round(S * .5)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(k), x0 + S * .75, top + S * .66);
  }

  function coin(ctx, x, y, S, t) {
    const bob = Math.sin(t * 3 + x * .01) * S * .1;
    const sx = Math.abs(Math.cos(t * 3 + x * .02));
    glow(ctx, x, y + bob, S * .9, '#ffc94a', .6);
    ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.beginPath(); ctx.ellipse(x, y + bob, S * .3 * Math.max(.15, sx), S * .3, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (sx > .4) { ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.ellipse(x - S * .06 * sx, y + bob - S * .06, S * .08 * sx, S * .14, 0, 0, TAU); ctx.fill(); }
  }

  // ---------- De karren ----------
  const PX = 64;
  const steel = (g, x0, x1) => { const s = g.createLinearGradient(x0, 0, x1, 0); s.addColorStop(0, '#2a2f45'); s.addColorStop(.45, '#8d97b8'); s.addColorStop(.6, '#5d6684'); s.addColorStop(1, '#22263a'); return s; };
  // Het wiel van een kar, één keer gebakken (straal r meter).
  const wheelCache = new Map();
  function wheelSprite(v) {
    let c = wheelCache.get(v.id);
    if (c) return c;
    const R = v.r * PX;
    c = mk(R * 2 + 8, R * 2 + 8);
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    const naam = v.square ? 'wiel-vierkant' : v.ice ? 'wiel-ijs' : v.stone ? 'wiel-steen' : v.magnet ? 'wiel-magneet' : v.id === 'reus' ? 'wiel-reus' : v.id === 'maan' ? 'wiel-maan' : 'wiel';
    const img = ART[naam];
    if (img) {
      // Jorns geschilderde wielen. De schuin geschilderde (reuzenband, steen, maan) draaien niet mee, anders wiebelen ze.
      const s = (v.square ? 1.84 : 2.04) * R / Math.max(img.width, img.height);
      g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
      c.still = naam === 'wiel-reus' || naam === 'wiel-steen' || naam === 'wiel-maan';
      wheelCache.set(v.id, c);
      return c;
    }
    g.lineWidth = Math.max(2, PX * .05); g.strokeStyle = INK;
    if (v.square) {
      const s = R * .92;
      g.fillStyle = '#7b7f95';
      g.beginPath(); g.rect(-s, -s, s * 2, s * 2); g.fill(); g.stroke();
      g.fillStyle = '#9da3bd'; g.fillRect(-s + 4, -s + 4, s * 2 - 8, s * .4);
      g.strokeStyle = 'rgba(0,0,0,.4)';
      g.beginPath(); g.moveTo(-s, 0); g.lineTo(s * .2, -s * .3); g.lineTo(s, s * .2); g.stroke();
      g.strokeStyle = INK;
      g.fillStyle = '#ffc94a'; g.beginPath(); g.rect(-s * .3, -s * .3, s * .6, s * .6); g.fill(); g.stroke();
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, 0, s * .17, 0, TAU); g.fill();
    } else if (v.ice) {
      const grd = g.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
      grd.addColorStop(0, 'rgba(230,250,255,.95)'); grd.addColorStop(1, 'rgba(110,190,240,.85)');
      g.fillStyle = grd;
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * .85, Math.sin(a) * R * .85); g.stroke(); }
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, 0, R * .2, 0, TAU); g.fill();
    } else if (v.stone) {
      // Stenen wiel: grijze schijf met barsten en een beetje mos
      const grd = g.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
      grd.addColorStop(0, '#a9abb8'); grd.addColorStop(1, '#5d6070');
      g.fillStyle = grd;
      g.beginPath();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12, rr = R * (i % 3 ? 1 : .93); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(30,30,40,.55)'; g.lineWidth = Math.max(1.5, R * .05);
      g.beginPath(); g.moveTo(-R * .7, -R * .2); g.lineTo(-R * .3, -R * .05); g.lineTo(-R * .2, R * .4); g.moveTo(R * .2, -R * .7); g.lineTo(R * .35, -R * .3); g.lineTo(R * .7, -R * .25); g.stroke();
      g.fillStyle = '#5f8a4a'; g.beginPath(); g.arc(R * .45, R * .55, R * .16, 0, TAU); g.arc(R * .62, R * .4, R * .1, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(2, PX * .04);
      g.fillStyle = '#3b3f5c'; g.beginPath(); g.arc(0, 0, R * .22, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, 0, R * .12, 0, TAU); g.fill();
    } else if (v.magnet) {
      // Magneetwiel: rode ring met zilveren polen en een blauwe gloed
      g.fillStyle = '#d63a4a'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#d9dff0';
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6); g.beginPath(); g.rect(-R * .14, -R, R * .28, R * .26); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#2a2f45'; g.beginPath(); g.arc(0, 0, R * .62, 0, TAU); g.fill(); g.stroke();
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, R * .55);
      gl.addColorStop(0, '#e8fbff'); gl.addColorStop(.4, '#5ee7ff'); gl.addColorStop(1, 'rgba(94,231,255,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * .55, 0, TAU); g.fill();
    } else if (v.id === 'reus') {
      g.fillStyle = '#1b1e2c'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#2c3048';
      for (let i = 0; i < 16; i++) { g.save(); g.rotate(i * TAU / 16); g.fillRect(-R * .09, -R, R * .18, R * .16); g.restore(); }
      g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(0, 0, R * .55, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#3b3f5c';
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6); g.beginPath(); g.arc(R * .32, 0, R * .08, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, 0, R * .16, 0, TAU); g.fill();
    } else {
      // Houten spaakwiel met gouden band en een lichtende blauwe naaf
      g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = v.id === 'maan' ? '#3a4366' : '#6b4424'; g.beginPath(); g.arc(0, 0, R * .8, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = v.id === 'maan' ? '#aab4d8' : '#a8743f'; g.lineWidth = Math.max(2, R * .12);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * R * .2, Math.sin(a) * R * .2); g.lineTo(Math.cos(a) * R * .78, Math.sin(a) * R * .78); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = Math.max(2, PX * .04);
      g.fillStyle = '#3b3f5c'; g.beginPath(); g.arc(0, 0, R * .28, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, 0, R * .16, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(-R * .05, -R * .05, R * .06, 0, TAU); g.fill();
    }
    wheelCache.set(v.id, c);
    return c;
  }

  // De bak met de ridder erin, in het assenstelsel van de kar: de as ligt op y = 0, x van -D/2 tot D/2, omhoog is -y.
  const bodyCache = new Map();
  // Met Jorns beelden: de kar met de ridder erin, of een eigen bak (toren, tank, drakenboot, robotros) met de ridder erbij.
  // Alles in meter, in hetzelfde assenstelsel als hieronder. De blauwe delen kleuren we daarna in de kleur van de speler.
  function paintedBody(v, color) {
    const u = PX;
    const halfW = v.D / 2 + 2.4, top = v.head + 2, bottom = 1.3;
    const c = mk(halfW * 2 * u, (top + bottom) * u);
    c.ox = halfW * u; c.oy = top * u;
    const g = c.getContext('2d');
    g.translate(c.ox, c.oy);
    const put = (img, x, y, w, h) => g.drawImage(img, x * u, y * u, w * u, h * u);
    // De ridder (met vaantje) zo groot dat zijn helm `helm` meter breed is, helmmidden op (hx, hy).
    const knight = (hx, hy, helm) => {
      const r = ART.ridder; if (!r) return;
      const m = 175 / helm;
      put(r, hx - 312 / m, hy - 152.5 / m, r.width / m, r.height / m);
    };
    const deck = -(v.id === 'reus' || v.id === 'veer' ? .55 : .12), rail = deck + .12;
    if (v.tower && ART.toren) {
      if (ART.plank) put(ART.plank, -v.D / 2 - .45, -.3, v.D + .9, .42);
      const t = ART.toren, m = 415 / (v.head - .15), w = t.width / m, h = t.height / m;
      put(t, -w * .55, -.15 - h, w, h);
    } else if (v.tracks && ART.tank) {
      const t = ART.tank, w = v.D + .2, h = w * t.height / t.width;
      knight(.25, v.r + .05 - h - .2, .55);
      put(t, -w / 2, v.r + .05 - h, w, h);
      c.ownWheels = true;
    } else if (v.id === 'koets' && ART.koets) {
      const t = ART.koets, w = v.D, h = w * t.height / t.width;
      knight(-.2, -1.85, .7);
      put(t, -w / 2 - .1, .2 - h, w, h);
    } else if (v.id === 'ros' && ART.ros) {
      const t = ART.ros, w = 2.4, h = w * t.height / t.width;
      knight(-.15, -1.45, .58);
      put(t, -w / 2, .3 - h, w, h);
    } else {
      // Op veren (reuzenwielen, springveren) staat de bak hoger: de ridder steekt dan wat boven zijn hoofdhoogte uit.
      const k = ART.kar, m = 370 / Math.max(v.head + rail, v.head * .9), w = k.width / m, h = k.height / m;
      if (v.glide && ART.vleugel) { const f = ART.vleugel; put(f, -2.1, -v.head - .3, 1.9, 1.9 * f.height / f.width); }
      if (v.rocket && ART.raket) { const f = ART.raket, fw = 1.8; put(f, -v.D / 2 - 1.35, -.95, fw, fw * f.height / f.width); }
      if (v.id === 'veer' || v.id === 'reus') {
        g.strokeStyle = v.id === 'veer' ? '#ff6bd6' : '#8d97b8'; g.lineWidth = u * .07;
        for (const ax of [-v.D / 2, v.D / 2]) {
          g.beginPath();
          for (let i = 0; i <= 8; i++) g.lineTo((ax + (i % 2 ? .14 : -.14)) * u, deck * u * i / 8);
          g.stroke();
        }
      }
      put(k, -422 / m, rail - 522.5 / m, w, h);
    }
    tint(c, color);
    return c;
  }
  function bodySprite(v, color) {
    const key = v.id + color;
    let c = bodyCache.get(key);
    if (c) return c;
    if (ART.kar) {
      c = paintedBody(v, color);
      bodyCache.set(key, c);
      return c;
    }
    const u = PX;
    const halfW = v.D / 2 + 1.3, top = v.head + 1.6, bottom = .8;
    c = mk(halfW * 2 * u, (top + bottom) * u);
    c.ox = halfW * u; c.oy = top * u;
    const g = c.getContext('2d');
    g.translate(c.ox, c.oy);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const lw = u * .05;
    const part = (fill, fn) => { g.fillStyle = fill; g.beginPath(); fn(); g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
    const gold = '#ffc94a';
    const D = v.D, hd = v.head;
    const L = -D / 2 - .3, R = D / 2 + .3;
    const deck = -(v.id === 'reus' ? .55 : v.id === 'veer' ? .55 : .12); // onderkant van de bak
    const boxTop = deck - .75;
    // Banier achteraan in de kleur van de speler
    part('#5a3a20', () => g.rect((L + .15) * u, (boxTop - 1.25) * u, .09 * u, 1.3 * u));
    part(color, () => { const x = (L + .24) * u, y = (boxTop - 1.2) * u; g.moveTo(x, y); g.quadraticCurveTo(x - .4 * u, y + .1 * u, x - .75 * u, y + .02 * u); g.lineTo(x - .6 * u, y + .25 * u); g.lineTo(x - .78 * u, y + .48 * u); g.quadraticCurveTo(x - .4 * u, y + .4 * u, x, y + .45 * u); g.closePath(); });
    part(gold, () => { g.arc((L + .195) * u, (boxTop - 1.3) * u, .08 * u, 0, TAU); });
    // Drakenvleugels achter de ridder
    if (v.glide) {
      for (const [ox, sc, col] of [[-.25, 1.3, '#6a3fb5'], [.15, 1.1, '#8b5cf6']]) {
        const bx = ox, by = boxTop + .1;
        part(col, () => { g.moveTo(bx * u, by * u); g.quadraticCurveTo((bx - .4) * u, (by - 1.3 * sc) * u, (bx - 1.6 * sc) * u, (by - 1.5 * sc) * u); g.lineTo((bx - 1.35 * sc) * u, (by - .95 * sc) * u); g.lineTo((bx - 1.6 * sc) * u, (by - .6 * sc) * u); g.lineTo((bx - 1.2 * sc) * u, (by - .4 * sc) * u); g.lineTo((bx - 1.25 * sc) * u, (by - .1 * sc) * u); g.closePath(); });
        g.strokeStyle = 'rgba(255,201,74,.8)'; g.lineWidth = u * .03;
        g.beginPath(); g.moveTo(bx * u, by * u); g.lineTo((bx - 1.35 * sc) * u, (by - .95 * sc) * u); g.moveTo(bx * u, by * u); g.lineTo((bx - 1.2 * sc) * u, (by - .4 * sc) * u); g.stroke();
      }
    }
    // Stenen toren waar de ridder bovenop zit
    if (v.tower) {
      const tx0 = -.55, tx1 = .45, tt = -hd + .8;
      const tg = g.createLinearGradient(tx0 * u, 0, tx1 * u, 0);
      tg.addColorStop(0, '#9a95b0'); tg.addColorStop(1, '#5b5470');
      part(tg, () => g.rect(tx0 * u, tt * u, (tx1 - tx0) * u, (deck - tt) * u));
      for (let x = tx0; x < tx1 - .05; x += .34) part(tg, () => g.rect(x * u, (tt - .2) * u, .2 * u, .2 * u));
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = u * .02;
      for (let y = tt + .25, i = 0; y < deck; y += .25, i++) { g.beginPath(); g.moveTo(tx0 * u, y * u); g.lineTo(tx1 * u, y * u); for (let x = tx0 + (i % 2 ? .15 : .3); x < tx1; x += .3) { g.moveTo(x * u, y * u); g.lineTo(x * u, (y - .25) * u); } g.stroke(); }
      g.fillStyle = '#5ee7ff'; g.fillRect(-.12 * u, (tt + .35) * u, .14 * u, .28 * u);
    }
    // Veren tussen de as en de bak
    if (v.id === 'veer' || v.id === 'reus') {
      g.strokeStyle = v.id === 'veer' ? '#ff6bd6' : '#8d97b8'; g.lineWidth = u * .07;
      for (const ax of [-D / 2, D / 2]) {
        g.beginPath();
        for (let i = 0; i <= 8; i++) g.lineTo((ax + (i % 2 ? .14 : -.14)) * u, deck * u * i / 8);
        g.stroke();
      }
    }
    // De ridder (achter de rand van de bak): romp, schouder, helm met vizier en een pluim in de kleur van de speler
    const kx = v.id === 'ros' ? 0 : -.1;
    const seat = v.id === 'ros' ? -.55 : v.tower ? -hd + .85 : boxTop + .25;
    part(steel(g, (kx - .3) * u, (kx + .3) * u), () => { g.moveTo((kx - .27) * u, seat * u); g.lineTo((kx + .27) * u, seat * u); g.lineTo((kx + .25) * u, (-hd + .35) * u); g.lineTo((kx - .25) * u, (-hd + .35) * u); g.closePath(); });
    part(color, () => g.rect((kx - .05) * u, (-hd + .45) * u, .22 * u, (seat + hd - .55) * u));
    part(steel(g, kx * u, (kx + .5) * u), () => g.rect((kx + .05) * u, (-hd + .55) * u, .45 * u, .14 * u));
    part('#3b3f5c', () => g.arc((kx + .55) * u, (-hd + .62) * u, .1 * u, 0, TAU));
    const hx = kx + .02, hy = -hd;
    part(steel(g, (hx - .3) * u, (hx + .3) * u), () => { g.moveTo((hx - .26) * u, (hy + .33) * u); g.lineTo((hx - .25) * u, (hy - .1) * u); g.quadraticCurveTo(hx * u, (hy - .4) * u, (hx + .3) * u, (hy - .12) * u); g.lineTo((hx + .3) * u, (hy + .33) * u); g.closePath(); });
    part(gold, () => g.rect((hx - .27) * u, (hy + .28) * u, .58 * u, .07 * u));
    part(gold, () => { g.moveTo((hx - .24) * u, (hy - .1) * u); g.quadraticCurveTo(hx * u, (hy - .4) * u, (hx + .3) * u, (hy - .12) * u); g.lineTo((hx + .27) * u, (hy - .05) * u); g.quadraticCurveTo(hx * u, (hy - .31) * u, (hx - .23) * u, (hy - .03) * u); g.closePath(); });
    g.fillStyle = INK; g.fillRect((hx + .02) * u, (hy - .02) * u, .3 * u, .12 * u);
    g.fillStyle = '#5ee7ff'; g.fillRect((hx + .06) * u, hy * u, .25 * u, .06 * u);
    part(color, () => { g.moveTo((hx - .05) * u, (hy - .3) * u); g.quadraticCurveTo((hx - .4) * u, (hy - .7) * u, (hx - .8) * u, (hy - .3) * u); g.quadraticCurveTo((hx - .45) * u, (hy - .38) * u, (hx - .18) * u, (hy - .22) * u); g.closePath(); });
    // De bak zelf
    if (v.id === 'ros') {
      // Motorros: stalen frame met een paardenkop vooraan
      part(steel(g, L * u, R * u), () => { g.moveTo(-D / 2 * u, 0); g.lineTo(-.2 * u, -.62 * u); g.lineTo(.45 * u, -.7 * u); g.lineTo(D / 2 * u, 0); g.lineTo(.3 * u, -.25 * u); g.lineTo(-.3 * u, -.25 * u); g.closePath(); });
      part(color, () => { g.moveTo(-.35 * u, -.5 * u); g.lineTo(.4 * u, -.6 * u); g.lineTo(.35 * u, -.35 * u); g.lineTo(-.25 * u, -.3 * u); g.closePath(); });
      part(steel(g, .4 * u, 1.1 * u), () => { g.moveTo(.4 * u, -.7 * u); g.lineTo(.75 * u, -1.15 * u); g.lineTo(1.12 * u, -1.0 * u); g.lineTo(1.0 * u, -.85 * u); g.lineTo(.7 * u, -.55 * u); g.closePath(); });
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(.92 * u, -1.0 * u, .05 * u, 0, TAU); g.fill();
      part(gold, () => g.rect(.4 * u, -.78 * u, .1 * u, .2 * u));
    } else if (v.id === 'maan') {
      part(steel(g, L * u, R * u), () => g.rect(L * u, (deck - .35) * u, (R - L) * u, .35 * u));
      part(gold, () => g.rect(L * u, (deck - .42) * u, (R - L) * u, .08 * u));
      part('#aab4d8', () => g.rect((L + .1) * u, (deck - .75) * u, .1 * u, .4 * u));
      part('#e6ecff', () => { g.ellipse((L + .15) * u, (deck - .85) * u, .3 * u, .12 * u, -.4, 0, TAU); });
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc((R - .2) * u, (deck - .2) * u, .06 * u, 0, TAU); g.fill();
    } else if (v.tracks) {
      // Burchttank: stalen bak met kantelen en een kanonnetje
      part(steel(g, L * u, R * u), () => { g.moveTo(L * u, deck * u); g.lineTo(R * u, deck * u); g.lineTo((R - .3) * u, boxTop * u); g.lineTo((L + .2) * u, boxTop * u); g.closePath(); });
      for (let x = L + .25; x < R - .4; x += .4) part(steel(g, x * u, (x + .2) * u), () => g.rect(x * u, (boxTop - .18) * u, .2 * u, .18 * u));
      part(gold, () => g.rect(L * u, (deck - .2) * u, (R - L) * u, .08 * u));
      part('#2a2f45', () => g.rect((R - .4) * u, (boxTop + .15) * u, .9 * u, .16 * u));
    } else {
      // Houten kist met ijzerbeslag (zoals op het icoon); het ijs-, raket- en koetsmodel met een eigen versiering
      const wood = v.ice ? '#8fc9e8' : v.mini ? '#c8323c' : v.stone ? '#7d7f90' : v.magnet ? '#4c5a8a' : v.id === 'raket' ? '#7a4e2a' : '#8a5a30';
      const grd = g.createLinearGradient(0, boxTop * u, 0, deck * u);
      grd.addColorStop(0, shade(wood, 1.25)); grd.addColorStop(1, shade(wood, .7));
      part(grd, () => { g.moveTo(L * u, boxTop * u); g.lineTo(R * u, boxTop * u); g.lineTo((R - .1) * u, deck * u); g.lineTo((L + .1) * u, deck * u); g.closePath(); });
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = u * .025;
      for (let y = boxTop + .25; y < deck; y += .25) { g.beginPath(); g.moveTo(L * u, y * u); g.lineTo(R * u, y * u); g.stroke(); }
      for (const x of [L + .05, (L + R) / 2 - .06, R - .17]) part('#6b7398', () => g.rect(x * u, (boxTop - .02) * u, .12 * u, (deck - boxTop + .04) * u));
      part(gold, () => g.rect((L - .05) * u, (boxTop - .1) * u, (R - L + .1) * u, .1 * u));
      g.fillStyle = gold;
      for (let x = L + .25; x < R - .1; x += .5) { g.beginPath(); g.arc(x * u, (deck - .12) * u, .035 * u, 0, TAU); g.fill(); }
      if (v.ice) {
        g.fillStyle = 'rgba(230,250,255,.9)';
        for (let x = L + .1; x < R - .1; x += .3) { g.beginPath(); g.moveTo(x * u, deck * u); g.lineTo((x + .07) * u, (deck + .22) * u); g.lineTo((x + .14) * u, deck * u); g.fill(); }
      }
      if (v.mini) {
        // Paddenstoelstippen
        g.fillStyle = '#fff4e0';
        for (const [x, y, rr] of [[L + .3, boxTop + .3, .1], [(L + R) / 2 + .12, boxTop + .5, .08], [R - .35, boxTop + .28, .07]]) { g.beginPath(); g.arc(x * u, y * u, rr * u, 0, TAU); g.fill(); }
      }
      if (v.magnet) {
        // Grote hoefijzermagneet vooraan
        g.lineWidth = u * .2; g.lineCap = 'butt';
        g.strokeStyle = INK; g.beginPath(); g.arc((R + .05) * u, (boxTop + .35) * u, .32 * u, -Math.PI / 2, Math.PI / 2); g.stroke();
        g.lineWidth = u * .13; g.strokeStyle = '#d63a4a'; g.beginPath(); g.arc((R + .05) * u, (boxTop + .35) * u, .32 * u, -Math.PI / 2, Math.PI / 2); g.stroke();
        g.lineCap = 'round';
        part('#d9dff0', () => g.rect((R - .2) * u, (boxTop - .04) * u, .25 * u, .14 * u));
        part('#d9dff0', () => g.rect((R - .2) * u, (boxTop + .6) * u, .25 * u, .14 * u));
      }
      if (v.id === 'koets') {
        // Drakenkop vooraan
        part('#4a7a3a', () => { g.moveTo(R * u, (boxTop + .1) * u); g.quadraticCurveTo((R + .5) * u, (boxTop - .3) * u, (R + .6) * u, (boxTop - .7) * u); g.lineTo((R + 1.05) * u, (boxTop - .6) * u); g.lineTo((R + .95) * u, (boxTop - .35) * u); g.lineTo((R + .6) * u, (boxTop - .35) * u); g.quadraticCurveTo((R + .4) * u, (boxTop + .2) * u, R * u, (boxTop + .5) * u); g.closePath(); });
        g.fillStyle = '#ffc94a'; g.beginPath(); g.arc((R + .75) * u, (boxTop - .55) * u, .05 * u, 0, TAU); g.fill();
      }
      if (v.rocket) {
        part(steel(g, (L - .7) * u, L * u), () => { g.moveTo(L * u, (boxTop + .15) * u); g.lineTo((L - .55) * u, (boxTop + .1) * u); g.lineTo((L - .7) * u, (boxTop + .35) * u); g.lineTo((L - .55) * u, (boxTop + .6) * u); g.lineTo(L * u, (boxTop + .55) * u); g.closePath(); });
        part('#ff4d6d', () => g.rect((L - .4) * u, (boxTop + .12) * u, .1 * u, .46 * u));
      }
    }
    bodyCache.set(key, c);
    return c;
  }

  // o: { x, y (midden van de as), a (hoek, neus omhoog > 0), veh, color, rb, rf (wielhoeken), gas, turbo, alpha, name, blink }
  function cart(ctx, o, sx, sy, S, t) {
    const v = o.veh;
    const k = S / PX;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blink && Math.floor(t * 12) % 2) ctx.globalAlpha *= .35;
    ctx.translate(sx, sy);
    ctx.rotate(-o.a);
    if (o.turbo) glow(ctx, 0, -S * .7, S * 2.2, '#ff6bd6', .35 + Math.sin(t * 8) * .1);
    else if (o.rim) glow(ctx, 0, -S * .7, S * 1.8, o.color, .22);
    // Vlam achteraan (raketkar of turbo)
    if ((v.rocket || o.turbo) && o.gas) {
      const fl = .8 + Math.sin(t * 45) * .2;
      const x0 = (-v.D / 2 - .3 - (v.rocket ? .65 : .1)) * S, y0 = (-(v.id === 'reus' || v.id === 'veer' ? .55 : .12) - .4) * S;
      const len = S * (1 + .4 * fl) * (o.turbo ? 1.3 : 1);
      const col = o.turbo ? '#ff6bd6' : '#ff8c42';
      glow(ctx, x0 - len * .4, y0, S * .8, col, .9);
      const fg = ctx.createLinearGradient(x0, 0, x0 - len, 0);
      fg.addColorStop(0, '#fff'); fg.addColorStop(.3, '#ffe08a'); fg.addColorStop(.7, rgba(col, .7)); fg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(x0, y0 - S * .16); ctx.quadraticCurveTo(x0 - len * .5, y0 - S * .22, x0 - len, y0); ctx.quadraticCurveTo(x0 - len * .5, y0 + S * .22, x0, y0 + S * .16); ctx.fill();
    }
    const body = bodySprite(v, o.color);
    ctx.drawImage(body, -body.ox * k, -body.oy * k, body.width * k, body.height * k);
    // Rupsband om de wielen van de tank
    const ws = wheelSprite(v);
    const wr = ws.width / 2 * k;
    if (v.tracks && !body.ownWheels) {
      ctx.fillStyle = '#1b1e2c'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      const R = (v.r + .08) * S;
      ctx.beginPath();
      ctx.arc(-v.D / 2 * S, 0, R, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(v.D / 2 * S, 0, R, -Math.PI / 2, Math.PI / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3b3f5c'; ctx.lineWidth = Math.max(1, S * .06);
      ctx.setLineDash([S * .12, S * .1]); ctx.lineDashOffset = -(o.rb || 0) * v.r * S;
      ctx.beginPath(); ctx.moveTo(-v.D / 2 * S, -R + S * .04); ctx.lineTo(v.D / 2 * S, -R + S * .04); ctx.moveTo(v.D / 2 * S, R - S * .04); ctx.lineTo(-v.D / 2 * S, R - S * .04); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 1; i < 3; i++) { ctx.save(); ctx.translate((-v.D / 2 + v.D * i / 3) * S, 0); ctx.rotate(o.rb || 0); ctx.drawImage(ws, -wr * .7, -wr * .7, wr * 1.4, wr * 1.4); ctx.restore(); }
    }
    if (!body.ownWheels) for (const [x, rot] of [[-v.D / 2, o.rb || 0], [v.D / 2, o.rf || 0]]) {
      ctx.save();
      ctx.translate(x * S, 0);
      if (!ws.still) ctx.rotate(rot);
      ctx.drawImage(ws, -wr, -wr, wr * 2, wr * 2);
      ctx.restore();
    }
    ctx.restore();
    if (o.name) {
      ctx.font = `800 ${Math.max(11, Math.round(S * .34))}px Orbitron, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const tw = ctx.measureText(o.name).width;
      const ty = sy - S * (v.head + 1.4);
      ctx.fillStyle = 'rgba(5,8,20,.7)';
      ctx.fillRect(sx - tw / 2 - 5, ty - S * .42, tw + 10, S * .46);
      ctx.fillStyle = o.color; ctx.fillRect(sx - tw / 2 - 5, ty + S * .02, tw + 10, 2);
      ctx.fillStyle = '#f2f5ff'; ctx.fillText(o.name, sx, ty);
    }
  }

  // Een kar als plaatje (wachtzaal, de nieuwe kar aan een vlag).
  function preview(canvas, veh, color) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const S = Math.min(canvas.width / (veh.D + 3.4), canvas.height / (veh.head + 2.4 + veh.r));
    cart(g, { veh, color, a: 0, rb: .4, rf: 1.1 }, canvas.width / 2, canvas.height - (veh.r + .15) * S, S, 0);
  }

  // ---------- Alles samen ----------
  // v: { seed, t, cx, cy (camera in meter), S, me, ghosts, hide (munten), passed, wip (hoeken), loadX (x van de kar die de bruggen indrukt) }
  function render(ctx, w, h, v) {
    const S = Math.round(v.S * 4) / 4;
    const left = v.cx - w / 2 / S, right = v.cx + w / 2 / S;
    const X = x => (x - v.cx) * S + w / 2;
    const Y = y => (y - v.cy) * S + h / 2;
    const kc = Math.max(0, Math.floor(v.cx / W.L));
    const theme = W.themeOf(kc);
    const nextTheme = W.themeOf(kc + 1);
    let fade = 0;
    if (nextTheme !== theme) fade = Math.max(0, Math.min(1, (v.cx - (kc + 1) * W.L + 14) / 14));
    const th = fade > .5 ? nextTheme : theme;
    const back = backdrop(theme, h), backNext = fade > 0 ? backdrop(nextTheme, h) : null;
    if (back && (!fade || backNext)) {
      // Jorns geschilderde wereld: geen getekende lucht of verre burchten meer nodig.
      drawBack(ctx, back, w, h, v, S, 1);
      if (fade > 0) drawBack(ctx, backNext, w, h, v, S, fade);
    } else {
      ctx.drawImage(sky(theme, w, h), 0, 0);
      if (fade > 0) { ctx.globalAlpha = fade; ctx.drawImage(sky(nextTheme, w, h), 0, 0); ctx.globalAlpha = 1; }
    }
    if (!back) for (const depth of [0, 1]) {
      const img = layer(th, h, depth);
      const par = depth ? .3 : .1;
      const off = -((v.cx * S * par) % img.width + img.width) % img.width;
      const dy = Math.round((depth ? .3 : .12) * (W.BASE - 3 - v.cy) * S);
      for (let x = off; x < w; x += img.width) ctx.drawImage(img, Math.round(x), dy);
    }

    const k0 = Math.max(0, Math.floor((left - 8) / W.L)), k1 = Math.floor((right + 8) / W.L);
    const stages = [];
    for (let k = k0; k <= k1; k++) stages.push(W.stage(v.seed, k));
    // Lava alleen tekenen waar een put in beeld is.
    let pl = Infinity, pr = -Infinity;
    for (const st of stages) for (const p of st.pits) if (p.x1 > left - 1 && p.x0 < right + 1) { pl = Math.min(pl, p.x0); pr = Math.max(pr, p.x1); }
    if (pr > pl) {
      ctx.save();
      ctx.beginPath(); ctx.rect(X(pl) - 2, 0, X(pr) - X(pl) + 4, h); ctx.clip();
      lava(ctx, th, w, h, v.cx, S, Y(W.PIT), v.t);
      ctx.restore();
    }
    // Achter de baan: palen, galgen, poorten, fakkels
    for (const st of stages) {
      for (const d of st.deco) {
        if (d.x < left - 7 || d.x > right + 7) continue;
        if (d.kind === 'galg') gallows(ctx, d, st.theme, X, Y, S);
        else if (d.kind === 'fakkel') torch(ctx, X(d.x), Y(d.y), S, v.t, st.theme);
      }
    }
    // De grond
    for (const st of stages) {
      const p = paths(st);
      const tm = st.theme;
      ctx.save();
      ctx.translate(w / 2 - v.cx * S, h / 2 - v.cy * S); // geen setTransform: het bord schuift alles al op onder de strook
      ctx.scale(S, S);
      ctx.fillStyle = stonePattern(ctx, tm);
      ctx.fill(p.fill);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = .3; ctx.stroke(p.top);
      ctx.strokeStyle = tm.top; ctx.lineWidth = .16; ctx.stroke(p.top);
      ctx.strokeStyle = rgba(tm.glow, .8); ctx.lineWidth = .045;
      ctx.translate(0, .14); ctx.stroke(p.top);
      ctx.restore();
      // Kristallen of lichtpalen langs de rand
      for (const [bx, by, rr] of p.bits) {
        if (bx < left - 1 || bx > right + 1) continue;
        const x = X(bx), y = Y(by);
        if (tm.name === 'Kristalgrot') {
          const col = rr < .5 ? '#c77dff' : '#5ee7ff';
          const hgt = S * (.4 + rr * .6);
          glow(ctx, x, y - hgt * .4, hgt, col, .4);
          ctx.fillStyle = rgba(col, .9); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .03);
          ctx.beginPath(); ctx.moveTo(x - S * .14, y); ctx.lineTo(x - S * .05, y - hgt); ctx.lineTo(x + S * .12, y - hgt * .7); ctx.lineTo(x + S * .16, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (tm.name === 'Sterrenbrug') {
          if (rr < .5) { ctx.fillStyle = '#2c3a66'; ctx.fillRect(x - S * .05, y - S * .7, S * .1, S * .7); glow(ctx, x, y - S * .75, S * .5, rr < .25 ? '#ff6bd6' : '#5ee7ff', .8); }
        } else if (rr < .45) {
          ctx.fillStyle = '#3f6a2e'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .03);
          ctx.beginPath(); ctx.moveTo(x - S * .25, y); ctx.lineTo(x - S * .1, y - S * .35); ctx.lineTo(x, y - S * .15); ctx.lineTo(x + S * .12, y - S * .4); ctx.lineTo(x + S * .25, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    }
    // Bruggen, wippen, ophaalbruggen, stekels, hamers, munten, vlaggen
    for (const st of stages) {
      const tm = st.theme;
      for (const b of st.bridges) {
        if (b.bx < left - 2 || b.ax > right + 2) continue;
        const near = v.loadX != null && v.loadX > b.ax - 2 && v.loadX < b.bx + 2;
        bridge(ctx, b, W.bridgePts(b, v.t, near ? v.loadX : null), tm, X, Y, S);
      }
      for (const d of st.deco) if (d.kind === 'paal' && d.x > left - 2 && d.x < right + 2) post(ctx, X(d.x), Y(d.y), S, tm);
      for (const wp of st.wips) {
        if (wp.px + wp.half < left - 1 || wp.px - wp.half > right + 1) continue;
        const a = v.wip && v.wip[wp.id + ':' + st.k] != null ? v.wip[wp.id + ':' + st.k] : -wp.A;
        wip(ctx, wp, a, tm, X, Y, S);
      }
      for (const o of st.draw) if (o.x + o.len > left - 3 && o.x < right + 3) drawbridge(ctx, o, v.t, tm, X, Y, S);
      for (const s of st.spikes) if (s.x < right && s.x + s.w > left) spikes(ctx, s, X, Y, S);
      for (const c of st.coins) {
        if (c.x < left - 1 || c.x > right + 1 || (v.hide && v.hide.has(c.id))) continue;
        coin(ctx, X(c.x), Y(c.y), S, v.t);
      }
      if (st.k > 0 && st.x0 > left - 3 && st.x0 < right + 2) flag(ctx, st.k, X(st.x0), Y(W.BASE), S, v.t, v.passed >= st.k);
    }
    for (const o of v.ghosts || []) {
      if (o.x < left - 3 || o.x > right + 3) continue;
      cart(ctx, o, X(o.x), Y(o.y), S, v.t);
    }
    if (v.me) cart(ctx, v.me, X(v.me.x), Y(v.me.y), S, v.t);
    // De stekelballen voor de karren, zodat je ziet wat je raakt.
    for (const st of stages) for (const hm of st.hammers) if (Math.abs(hm.x - v.cx) < (right - left) / 2 + 6) hammer(ctx, hm, v.t, X, Y, S);
    if (v.vignette) Glow.vignette(ctx, w, h, .4);
  }

  return { render, cart, preview, bodySprite, wheelSprite };
})();
