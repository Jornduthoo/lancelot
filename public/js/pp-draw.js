// Plasmapoort tekenen: het burchtstadion 's nachts, de poort met het energienet, de keeper, de schutter en de plasmabal.
// Het zicht is van achter de strafschopstip. De lucht, de tribunes vol robots en ridders, het veld en de poort bakken we
// één keer per schermgrootte op een eigen canvas. Per frame tekenen we alleen de twee figuren, de bal en wat licht.
// Ook de animatie van een strafschop staat hier (kickAnim), want het bord speelt de trappen van de leerlingen na.
// Gebruikt PpWorld en Glow (fx.js).
const PpDraw = (() => {
  const W = PpWorld;
  const { rgba, glow } = Glow;
  const TAU = Math.PI * 2;
  const INK = '#05060f';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  // f > 0: lichter (naar wit), f < 0: donkerder.
  function shade(hex, f) {
    const [r, g, b] = hexRgb(hex);
    const m = v => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }


  // ---------- Geschilderde beelden (van Jorn) ----------
  // Zijn ze er, dan tekenen we die in plaats van de getekende figuren. De blauwe delen van de ridder kleuren we
  // naar de kleur van de leerling, de robot krijgt een tint per tegenstander. Elk gekleurd beeld bakken we één keer.
  const ART = {};
  const ART_NAMES = ['keeper-robot', 'duik-robot', 'keeper-ridder', 'duik-ridder', 'schiet-ridder', 'schiet-robot'];
  if (typeof Image !== 'undefined') {
    for (const n of ART_NAMES) {
      const img = new Image();
      img.onload = () => { ART[n] = img; bgCache = null; };
      img.src = `/img/plasmapoort/${n}.webp`;
    }
  }
  const has = n => Boolean(ART[n]);
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
  const tintCache = new Map();
  // mode 'blauw': blauwe delen krijgen de tint van color. mode 'blauw': grijze delen krijgen een zachte tint van color.
  function tinted(name, color, mode) {
    const img = ART[name];
    if (!img) return null;
    const key = `${name}|${color}|${mode}`;
    let c = tintCache.get(key);
    if (c) return c;
    c = mk(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    if (color) {
      const data = g.getImageData(0, 0, c.width, c.height), px = data.data;
      const [th, ts] = rgbHsl(...hexRgb(color));
      const [tr, tg, tb] = hexRgb(color);
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 8) continue;
        const [h, sat, l] = rgbHsl(px[i], px[i + 1], px[i + 2]);
        if (mode === 'blauw') {
          if (h < 180 || h > 265 || sat < .22) continue;
          const [r, gg, b] = hslRgb(th, Math.max(sat, ts * .85), l);
          px[i] = r; px[i + 1] = gg; px[i + 2] = b;
        } else if (sat < .28) {
          const m = .38 * (1 - Math.abs(l - .5) * 1.2);
          px[i] = px[i] * (1 - m) + tr * l * 1.3 * m;
          px[i + 1] = px[i + 1] * (1 - m) + tg * l * 1.3 * m;
          px[i + 2] = px[i + 2] * (1 - m) + tb * l * 1.3 * m;
        }
      }
      g.putImageData(data, 0, 0);
    }
    if (tintCache.size > 40) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  // ---------- Waar staat alles ----------
  // GW, GH: breedte en hoogte van de poort. gy: de doellijn. sy: de strafschopstip.
  // Waar staat de poort in het geschilderde stadion (delen van de beeldbreedte en -hoogte). Na een nieuw beeld opnieuw meten.
  const GOAL_IMG = { l: .225, r: .775, top: .3, bot: .62, spot: .9 };
  function layout(w, h) {
    const portrait = h > w * 1.05;
    const st = ART.stadion;
    if (st) {
      const iw = st.width, ih = st.height;
      // Liggend: het beeld vult het scherm. Staand (gsm): de poort vult de breedte, boven en onder vullen we aan.
      const sc = portrait ? w * .96 / ((GOAL_IMG.r - GOAL_IMG.l) * iw) : Math.max(w / iw, h / ih);
      const dw = iw * sc, dh = ih * sc;
      const ox = w / 2 - (GOAL_IMG.l + GOAL_IMG.r) / 2 * dw;
      const oy = portrait ? h * .5 - GOAL_IMG.bot * dh : (h - dh) / 2;
      const GW = (GOAL_IMG.r - GOAL_IMG.l) * dw, GH = (GOAL_IMG.bot - GOAL_IMG.top) * dh;
      const gy = oy + GOAL_IMG.bot * dh;
      const sy = portrait ? Math.max(oy + GOAL_IMG.spot * dh, h * .74) : oy + GOAL_IMG.spot * dh;
      return { w, h, portrait, cx: w / 2, GW, GH, gy, sy, wallY: gy - GH * .25, img: { ox, oy, dw, dh } };
    }
    const GW = portrait ? w * .9 : Math.min(w * .56, h * 1.05);
    const GH = GW * .36;
    const gy = portrait ? h * .5 : h * .56;
    const sy = portrait ? h * .74 : h * .9;
    return { w, h, portrait, cx: w / 2, GW, GH, gy, sy, wallY: gy - GH * .25 };
  }
  // Van poortmaten (x -1..1, y 0..1) naar het scherm.
  function toScreen(Lo, x, y) {
    return { x: Lo.cx + x * Lo.GW / 2, y: Lo.gy - y * Lo.GH };
  }
  // Een punt op het veld: u in poortbreedtes (zoals x), d de diepte (0 = doellijn, 1 = stip).
  function ground(Lo, u, d) {
    return { x: Lo.cx + u * Lo.GW / 2 * (1 + 1.2 * d), y: Lo.gy + (Lo.sy - Lo.gy) * d };
  }

  // ---------- De achtergrond (één keer bakken) ----------
  let bgCache = null;
  function background(Lo) {
    const key = `${Lo.w}x${Lo.h}:${Lo.img ? 1 : 0}`;
    if (bgCache && bgCache.key === key) return bgCache.c;
    const c = mk(Lo.w, Lo.h);
    const g = c.getContext('2d');
    if (Lo.img) {
      // Het geschilderde stadion; staand rekken we de bovenste en onderste rand uit tot aan de rand van het scherm.
      const st = ART.stadion, { ox, oy, dw, dh } = Lo.img;
      if (oy > 0) g.drawImage(st, 0, 0, st.width, 2, ox, 0, dw, oy + 1);
      if (oy + dh < Lo.h) g.drawImage(st, 0, st.height - 2, st.width, 2, ox, oy + dh - 1, dw, Lo.h - oy - dh + 1);
      g.drawImage(st, ox, oy, dw, dh);
      bgCache = { key, c };
      return c;
    }
    const r = rng(77);
    const { w, h, cx, GW, GH, gy, wallY } = Lo;
    const standTop = Math.max(h * .04, wallY - GH * 1.15);

    // Nachtlucht met sterren, een geringde planeet en een maan.
    const sky = g.createLinearGradient(0, 0, 0, wallY);
    sky.addColorStop(0, '#060820'); sky.addColorStop(.6, '#1a1048'); sky.addColorStop(1, '#3a1a5e');
    g.fillStyle = sky; g.fillRect(0, 0, w, wallY + 2);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = `rgba(255,255,255,${.2 + r() * .6})`;
      const s = r() < .07 ? 2 : 1;
      g.fillRect(r() * w, r() * standTop, s, s);
    }
    const px = w * .8, py = standTop * .45, pr = Math.max(14, GH * .28);
    glow(g, px, py, pr * 3, '#c77dff', .35);
    const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
    pg.addColorStop(0, '#f3d1ff'); pg.addColorStop(.5, '#9b5de5'); pg.addColorStop(1, '#3a1a6e');
    g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,220,160,.75)'; g.lineWidth = Math.max(2, pr * .09);
    g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .42, -.28, 0, TAU); g.stroke();
    g.fillStyle = '#e8f1ff';
    g.beginPath(); g.arc(w * .14, standTop * .35, pr * .35, 0, TAU); g.fill();
    glow(g, w * .14, standTop * .35, pr * 1.2, '#e8f1ff', .4);

    // Verre burchttorens met lichtjes in de ramen.
    for (let i = 0; i < 9; i++) {
      const tx = (i + .3 + r() * .4) / 9 * w, tw = GW * (.04 + r() * .05), th = GH * (.5 + r() * .9);
      const ty = standTop + GH * .1 - th;
      g.fillStyle = '#120c2e';
      g.fillRect(tx - tw / 2, ty, tw, th + GH);
      for (let m = 0; m < 3; m++) g.fillRect(tx - tw / 2 + m * tw / 2.5, ty - tw * .25, tw / 4, tw * .25);
      g.fillStyle = r() < .5 ? 'rgba(94,231,255,.7)' : 'rgba(255,201,74,.7)';
      for (let k = 0; k < 3; k++) if (r() < .7) g.fillRect(tx - tw * .12, ty + th * (.2 + k * .25), tw * .24, tw * .3);
    }

    // De tribunes: stenen muur, rijen toeschouwers (ridders en robots), een neonrand en banieren.
    const sg = g.createLinearGradient(0, standTop, 0, wallY);
    sg.addColorStop(0, '#1d1640'); sg.addColorStop(1, '#0d0a22');
    g.fillStyle = sg; g.fillRect(0, standTop, w, wallY - standTop);
    // kantelen bovenop
    const mw = Math.max(10, GW * .045);
    g.fillStyle = '#2a2156';
    for (let x = -mw / 2; x < w; x += mw * 2) g.fillRect(x, standTop - mw * .6, mw, mw * .6 + 2);
    g.fillStyle = 'rgba(94,231,255,.55)';
    g.fillRect(0, standTop, w, 2);
    const rows = 6, rowH = (wallY - standTop - GH * .22) / rows;
    const crowd = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#8f9bb0'];
    for (let row = 0; row < rows; row++) {
      const y = standTop + rowH * (row + .75);
      const s = rowH * .36;
      g.fillStyle = `rgba(0,0,0,${.25 + row * .04})`;
      g.fillRect(0, y + s * .9, w, rowH * .25);
      for (let x = s * (row % 2 ? 1.1 : .3); x < w; x += s * 2.15 + r() * s * .5) {
        const col = crowd[Math.floor(r() * crowd.length)];
        const dy = (r() - .5) * s * .3;
        const robot = r() < .35;
        g.fillStyle = shade(col, -.55);
        rr(g, x - s * .8, y + dy, s * 1.6, s * 1.5, s * .4); g.fill();
        g.fillStyle = shade(col, -.25);
        if (robot) { rr(g, x - s * .5, y + dy - s * .95, s, s * .9, s * .15); g.fill(); }
        else { g.beginPath(); g.arc(x, y + dy - s * .45, s * .5, 0, TAU); g.fill(); }
        g.fillStyle = robot ? '#ff6b6b' : '#7cf2ff';
        g.fillRect(x - s * .3, y + dy - s * .6, s * .6, Math.max(1, s * .14));
        if (r() < .12) { // een vlaggetje of een lichtstaaf
          g.fillStyle = r() < .5 ? '#ffc94a' : '#5ee7ff';
          g.fillRect(x + s * .6, y + dy - s * 1.6, Math.max(1, s * .14), s * 1.4);
        }
      }
    }
    // Muur voor de tribune met een neonband en banieren
    const wallTop = wallY - GH * .22;
    const wg = g.createLinearGradient(0, wallTop, 0, wallY);
    wg.addColorStop(0, '#3a2f6e'); wg.addColorStop(1, '#1a143a');
    g.fillStyle = wg; g.fillRect(0, wallTop, w, wallY - wallTop);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    const bw = GW * .09;
    for (let x = 0; x < w; x += bw) { g.beginPath(); g.moveTo(x, wallTop); g.lineTo(x, wallY); g.stroke(); }
    g.fillStyle = '#5ee7ff'; g.fillRect(0, wallTop, w, Math.max(2, GH * .015));
    glow(g, cx, wallTop, w * .6, '#5ee7ff', .12, .05);
    for (let i = 0; i < 10; i++) {
      const bx = (i + .5) / 10 * w;
      if (Math.abs(bx - cx) < GW * .55) continue;
      const col = i % 2 ? '#ff4d6d' : '#ffc94a';
      const bh = GH * .36, bwid = GW * .045;
      g.fillStyle = shade(col, -.2);
      g.beginPath(); g.moveTo(bx - bwid, wallTop); g.lineTo(bx + bwid, wallTop); g.lineTo(bx + bwid, wallTop + bh); g.lineTo(bx, wallTop + bh * .8); g.lineTo(bx - bwid, wallTop + bh); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath(); g.arc(bx, wallTop + bh * .38, bwid * .38, 0, TAU); g.fill();
    }

    // Lichtmasten links en rechts
    for (const s of [-1, 1]) {
      const mx = cx + s * w * .46, top = standTop - GH * .45;
      g.fillStyle = '#1b1838';
      g.fillRect(mx - 3, top, 6, wallY - top);
      g.fillStyle = '#2b2a55';
      rr(g, mx - GW * .06, top - GH * .1, GW * .12, GH * .12, 4); g.fill();
      for (let k = 0; k < 4; k++) {
        const lx = mx - GW * .045 + k * GW * .03;
        g.fillStyle = '#fffbe6';
        g.beginPath(); g.arc(lx, top - GH * .04, GW * .011, 0, TAU); g.fill();
      }
      glow(g, mx, top - GH * .04, GW * .3, '#fff1c2', .5);
      // Lichtbundel naar het veld
      const beam = g.createLinearGradient(mx, top, cx, gy);
      beam.addColorStop(0, 'rgba(255,245,200,.16)'); beam.addColorStop(1, 'rgba(255,245,200,0)');
      g.fillStyle = beam;
      g.beginPath(); g.moveTo(mx - GW * .05, top); g.lineTo(mx + GW * .05, top); g.lineTo(cx + s * GW * .1, h); g.lineTo(cx + s * GW * .9, h); g.closePath(); g.fill();
    }

    // Het veld: donkere stenen tegels in perspectief met lichtende voegen hier en daar.
    const fg = g.createLinearGradient(0, wallY, 0, h);
    fg.addColorStop(0, '#141a2c'); fg.addColorStop(1, '#2a3048');
    g.fillStyle = fg; g.fillRect(0, wallY, w, h - wallY);
    const dMin = (wallY - gy) / (Lo.sy - gy), dMax = (h - gy) / (Lo.sy - gy);
    // tegels: rijen in de diepte, kolommen die naar de poort toe lopen
    const dStep = .075;
    let row = 0;
    for (let d = dMin; d < dMax; d += dStep, row++) {
      const d2 = Math.min(dMax, d + dStep);
      for (let u = -14 + (row % 2) * .2; u < 14; u += .4) {
        const a = ground(Lo, u, d), b = ground(Lo, u + .4, d), c2 = ground(Lo, u + .4, d2), e = ground(Lo, u, d2);
        if (Math.max(a.x, e.x) < -50 || Math.min(b.x, c2.x) > w + 50) continue;
        const v = r();
        g.fillStyle = `rgba(${v < .5 ? '255,255,255' : '0,0,0'},${.02 + r() * .05})`;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); g.lineTo(e.x, e.y); g.closePath(); g.fill();
        g.strokeStyle = r() < .06 ? 'rgba(94,231,255,.45)' : 'rgba(0,0,0,.35)';
        g.lineWidth = 1;
        g.stroke();
      }
    }
    // gloed van de lichtmasten op de vloer
    glow(g, cx, gy + (Lo.sy - gy) * .45, w * .55, '#5ee7ff', .1, .3);
    const line = (pts, wid = 1) => {
      g.strokeStyle = 'rgba(140,240,255,.85)';
      g.shadowColor = '#5ee7ff'; g.shadowBlur = 8;
      g.lineWidth = Math.max(1.5, GW * .006 * wid);
      g.beginPath();
      pts.forEach(([u, d], i) => { const p = ground(Lo, u, d); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); });
      g.stroke();
      g.shadowBlur = 0;
    };
    line([[-9, 0], [9, 0]]);
    line([[-2.5, 0], [-2.5, .5], [2.5, .5], [2.5, 0]]);
    line([[-5.5, 0], [-5.5, 1.5], [5.5, 1.5], [5.5, 0]], 1.2);
    // De stip: een gloeiende runecirkel
    const spot = ground(Lo, 0, 1);
    glow(g, spot.x, spot.y, GW * .12, '#5ee7ff', .45, .35);
    g.strokeStyle = 'rgba(94,231,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(spot.x, spot.y, GW * .06, GW * .018, 0, 0, TAU); g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(spot.x, spot.y, GW * .012, GW * .005, 0, 0, TAU); g.fill();

    drawGoal(g, Lo);
    bgCache = { key, c };
    return c;
  }

  // De poort: twee torentjes als palen, een lat met kantelen, en een net van licht (zeshoeken).
  function drawGoal(g, Lo) {
    const { cx, GW, GH, gy } = Lo;
    const L = toScreen(Lo, -1, 1), R = toScreen(Lo, 1, 0);
    const depth = GH * .3; // het net loopt naar achter (omhoog op het scherm)
    const back = { l: cx - GW / 2 * .86, r: cx + GW / 2 * .86, top: L.y - depth * .25, bot: gy - depth };
    // Schaduw van het net op het gras
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.beginPath(); g.moveTo(L.x, gy); g.lineTo(R.x, gy); g.lineTo(back.r, back.bot); g.lineTo(back.l, back.bot); g.fill();
    // Het achternet: donker met een raster van zeshoeken
    g.save();
    g.beginPath();
    g.moveTo(L.x, L.y); g.lineTo(R.x, L.y); g.lineTo(R.x, gy); g.lineTo(L.x, gy); g.closePath();
    g.clip();
    const ng = g.createLinearGradient(0, L.y, 0, gy);
    ng.addColorStop(0, 'rgba(20,40,90,.55)'); ng.addColorStop(1, 'rgba(10,20,50,.35)');
    g.fillStyle = ng; g.fillRect(L.x, L.y, R.x - L.x, gy - L.y);
    const s = GW * .03;
    g.strokeStyle = 'rgba(94,231,255,.35)';
    g.lineWidth = 1;
    const hx = s * Math.sqrt(3);
    for (let row = 0, y = L.y; y < gy + s; row++, y += s * 1.5) {
      for (let x = L.x - hx + (row % 2 ? hx / 2 : 0); x < R.x + hx; x += hx) {
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; const X = x + Math.cos(a) * s, Y = y + Math.sin(a) * s; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }
        g.closePath(); g.stroke();
      }
    }
    glow(g, cx, (L.y + gy) / 2, GW * .5, '#5ee7ff', .18, .45);
    g.restore();
    // Zijnetten
    g.strokeStyle = 'rgba(94,231,255,.25)';
    for (const sd of [-1, 1]) {
      const fx = sd < 0 ? L.x : R.x, bx = sd < 0 ? back.l : back.r;
      for (let k = 0; k <= 6; k++) {
        const y1 = lerp(L.y, gy, k / 6), y2 = lerp(back.top, back.bot, k / 6);
        g.beginPath(); g.moveTo(fx, y1); g.lineTo(bx, y2); g.stroke();
      }
    }
    // De palen: stenen torens met gouden banden en een neonstreep, bovenop een torentje met kantelen en een vlaggetje
    const pw = GW * .06;
    const stone = (x, y, wd, ht) => {
      const sg2 = g.createLinearGradient(x, 0, x + wd, 0);
      sg2.addColorStop(0, '#4a4e5e'); sg2.addColorStop(.4, '#9da2b4'); sg2.addColorStop(1, '#3a3d4c');
      g.fillStyle = sg2;
      g.fillRect(x, y, wd, ht);
      // voegen
      g.strokeStyle = 'rgba(20,22,35,.55)'; g.lineWidth = 1;
      const bh = Math.max(5, pw * .32);
      for (let yy = y + bh, k = 0; yy < y + ht; yy += bh, k++) {
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + wd, yy); g.stroke();
        const off = k % 2 ? wd * .5 : wd * .25;
        g.beginPath(); g.moveTo(x + off, yy - bh); g.lineTo(x + off, yy); g.stroke();
      }
      g.strokeStyle = INK; g.lineWidth = 2;
      g.strokeRect(x, y, wd, ht);
    };
    const gold = (x, y, wd, ht) => {
      const gg = g.createLinearGradient(0, y, 0, y + ht);
      gg.addColorStop(0, '#ffe08a'); gg.addColorStop(.5, '#d9a12b'); gg.addColorStop(1, '#8a5a10');
      g.fillStyle = gg; g.fillRect(x, y, wd, ht);
      g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x, y, wd, ht);
    };
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? L.x : R.x;
      const x0 = sd < 0 ? x - pw * .75 : x - pw * .25; // de toren staat net buiten de poort
      stone(x0, L.y, pw, gy - L.y);
      // neonstreep aan de binnenkant
      const nx = sd < 0 ? x0 + pw * .78 : x0 + pw * .08;
      g.fillStyle = '#5ee7ff';
      g.fillRect(nx, L.y + pw * .5, pw * .14, gy - L.y - pw);
      glow(g, nx + pw * .07, (L.y + gy) / 2, GH * .6, '#5ee7ff', .35, 1.8);
      for (const f of [.28, .62]) gold(x0 - pw * .06, L.y + (gy - L.y) * f, pw * 1.12, pw * .2);
      gold(x0 - pw * .15, gy - pw * .35, pw * 1.3, pw * .35);
      // torentje
      const tw = pw * 1.5, tx = x0 + pw / 2 - tw / 2, ty = L.y - pw * 1.6;
      stone(tx, ty, tw, pw * 1.3);
      gold(tx - pw * .05, ty + pw * 1.1, tw + pw * .1, pw * .22);
      g.fillStyle = '#8f94a6';
      for (let m = 0; m < 3; m++) { const mx = tx + m * tw * .38; g.fillRect(mx, ty - pw * .45, tw * .24, pw * .45); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(mx, ty - pw * .45, tw * .24, pw * .45); }
      // venstertje dat gloeit
      g.fillStyle = '#5ee7ff';
      rr(g, tx + tw * .4, ty + pw * .3, tw * .2, pw * .5, tw * .1); g.fill();
      glow(g, tx + tw * .5, ty + pw * .55, pw, '#5ee7ff', .6);
      // vlaggetje
      const fx = tx + tw / 2, fy = ty - pw * .45;
      g.strokeStyle = '#ffc94a'; g.lineWidth = Math.max(1.5, pw * .08);
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - pw * 1.1); g.stroke();
      g.fillStyle = '#2f6bff';
      g.beginPath(); g.moveTo(fx, fy - pw * 1.1); g.lineTo(fx + sd * -pw * .9 + pw * .0, fy - pw * .95); g.lineTo(fx, fy - pw * .75); g.closePath(); g.fill();
    }
    // De lat: een stenen muur met kantelen en gouden randen
    const barH = pw * .7;
    stone(L.x - pw * .25, L.y - barH * .7, R.x - L.x + pw * .5, barH);
    gold(L.x - pw * .25, L.y + barH * .3 - pw * .14, R.x - L.x + pw * .5, pw * .14);
    const mw = GW * .045;
    for (let x = L.x + pw * .9; x < R.x - pw * .9 - mw; x += mw * 1.8) stone(x, L.y - barH * .7 - mw * .55, mw, mw * .55);
    g.fillStyle = '#5ee7ff';
    g.fillRect(L.x + pw * .3, L.y + barH * .3 - pw * .02, R.x - L.x - pw * .6, pw * .06);
    glow(g, cx, L.y + barH * .3, GW * .6, '#5ee7ff', .3, .06);
    // Een schildje in het midden van de lat
    g.fillStyle = '#ffc94a';
    g.beginPath(); g.moveTo(cx - pw * .7, L.y - pw * 1.2); g.lineTo(cx + pw * .7, L.y - pw * 1.2); g.lineTo(cx + pw * .6, L.y - pw * .2); g.lineTo(cx, L.y + pw * .3); g.lineTo(cx - pw * .6, L.y - pw * .2); g.closePath(); g.fill();
    g.strokeStyle = INK; g.stroke();
    g.fillStyle = '#5ee7ff';
    g.beginPath(); g.arc(cx, L.y - pw * .5, pw * .22, 0, TAU); g.fill();
  }

  // ---------- De figuren ----------
  // Een ridder (of robot) rechtop, het midden van de heup in (0, 0); H = lengte van top tot teen.
  // o: { back, mech, color, eye, arms (0 = langs het lijf, 1 = omhoog), spread (armen opzij), run, kick, shield, t }
  function figure(g, H, o) {
    const u = H;
    const col = o.color || '#4cc9ff';
    const eye = o.eye || (o.mech ? '#ff3b3b' : '#7cf2ff');
    const metal = o.mech ? [shade(col, .45), shade(col, -.15), shade(col, -.6)] : ['#f4f8ff', '#9fb0c8', '#2f3a4e'];
    const run = o.run || 0, kick = o.kick || 0;
    const legW = u * .1;
    // Cape (van achter zie je ze)
    if (o.back && !o.mech) {
      const wv = Math.sin((o.t || 0) * 7) * u * .02;
      g.fillStyle = shade(col, -.25);
      g.beginPath();
      g.moveTo(-u * .19, -u * .33);
      g.lineTo(u * .19, -u * .33);
      g.quadraticCurveTo(u * .24 + wv, -u * .05, u * .22 + wv, u * .18);
      g.lineTo(-u * .22 + wv, u * .18);
      g.quadraticCurveTo(-u * .24 + wv, -u * .05, -u * .19, -u * .33);
      g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .012); g.stroke();
      g.fillStyle = shade(col, .35);
      g.fillRect(-u * .22 + wv, u * .15, u * .44, u * .03);
    }
    // Benen (lopen: om beurt; trappen: het rechterbeen zwaait)
    for (const s of [-1, 1]) {
      let a = Math.sin(run * TAU) * .45 * s;
      if (s === 1 && kick) a = -kick * 1.1 + (o.back ? 0 : 0);
      g.save();
      g.translate(s * u * .085, 0);
      g.rotate(a * (o.back ? 1 : -1) * .6);
      const lg = g.createLinearGradient(-legW / 2, 0, legW / 2, 0);
      lg.addColorStop(0, metal[2]); lg.addColorStop(.5, metal[1]); lg.addColorStop(1, metal[2]);
      g.fillStyle = lg;
      rr(g, -legW / 2, 0, legW, u * .4, legW * .4); g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .012); g.stroke();
      // knie en laars
      g.fillStyle = o.mech ? eye : col;
      g.fillRect(-legW * .4, u * .17, legW * .8, u * .03);
      g.fillStyle = '#1e2436';
      rr(g, -legW * .65, u * .37, legW * 1.3, u * .1, legW * .3); g.fill(); g.stroke();
      g.restore();
    }
    // Armen
    const up = o.arms || 0, spread = o.spread || 0;
    for (const s of [-1, 1]) {
      g.save();
      g.translate(s * u * .2, -u * .3);
      const a = s * (.25 + spread * .9 + up * 2.2) + (run ? Math.sin(run * TAU + (s > 0 ? Math.PI : 0)) * .35 : 0);
      g.rotate(-a);
      const ag = g.createLinearGradient(-u * .04, 0, u * .04, 0);
      ag.addColorStop(0, metal[2]); ag.addColorStop(.5, metal[0]); ag.addColorStop(1, metal[2]);
      g.fillStyle = ag;
      rr(g, -u * .037, 0, u * .075, u * .27, u * .03); g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .012); g.stroke();
      // handschoen (de keeper heeft grote lichtende handschoenen)
      const gr = o.gloves ? u * .065 : u * .045;
      if (o.shield) glow(g, 0, u * .3, gr * 3.5, '#ffc94a', .9);
      g.fillStyle = o.gloves ? (o.mech ? shade(col, .2) : shade(col, .15)) : metal[1];
      g.beginPath(); g.arc(0, u * .3, gr, 0, TAU); g.fill(); g.stroke();
      if (o.gloves) { g.fillStyle = o.mech ? eye : '#e8f1ff'; g.fillRect(-gr * .5, u * .3 - gr * .15, gr, gr * .3); }
      g.restore();
    }
    // Romp
    const bg = g.createLinearGradient(-u * .2, -u * .35, u * .2, u * .05);
    bg.addColorStop(0, metal[0]); bg.addColorStop(.5, metal[1]); bg.addColorStop(1, metal[2]);
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(-u * .15, u * .02); g.lineTo(u * .15, u * .02); g.lineTo(u * .21, -u * .32); g.lineTo(-u * .21, -u * .32); g.closePath();
    g.fill();
    g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .014); g.stroke();
    // riem
    g.fillStyle = o.mech ? '#222838' : '#3b2a1a';
    g.fillRect(-u * .155, -u * .04, u * .31, u * .045);
    g.fillStyle = '#ffc94a';
    g.fillRect(-u * .025, -u * .045, u * .05, u * .055);
    if (!o.back) {
      // lichtende kern op de borst
      const pulse = .7 + Math.sin((o.t || 0) * 5) * .3;
      glow(g, 0, -u * .2, u * .14, o.mech ? eye : col, .9 * pulse);
      g.fillStyle = o.mech ? eye : shade(col, .5);
      g.beginPath(); g.moveTo(0, -u * .27); g.lineTo(u * .045, -u * .2); g.lineTo(0, -u * .13); g.lineTo(-u * .045, -u * .2); g.closePath(); g.fill();
      if (!o.mech) {
        g.fillStyle = col;
        g.fillRect(-u * .15, -u * .1, u * .3, u * .025);
      } else {
        g.fillStyle = 'rgba(0,0,0,.35)';
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * u * .12, -u * .27, u * .012, 0, TAU); g.fill(); g.beginPath(); g.arc(s * u * .1, -u * .06, u * .012, 0, TAU); g.fill(); }
      }
    } else if (o.mech) {
      // rug van de robot: uitlaatpijpen met een gloed
      for (const s of [-1, 1]) {
        g.fillStyle = '#2a3042';
        rr(g, s * u * .1 - u * .03, -u * .3, u * .06, u * .17, u * .02); g.fill();
        glow(g, s * u * .1, -u * .12, u * .05, eye, .8);
      }
    }
    // Schouderstukken
    for (const s of [-1, 1]) {
      const sp = g.createRadialGradient(s * u * .2, -u * .34, 1, s * u * .21, -u * .31, u * .1);
      sp.addColorStop(0, '#ffffff'); sp.addColorStop(.5, metal[1]); sp.addColorStop(1, metal[2]);
      g.fillStyle = sp;
      g.beginPath(); g.ellipse(s * u * .21, -u * .31, u * .095, u * .07, 0, 0, TAU); g.fill();
      g.strokeStyle = o.mech ? eye : col; g.lineWidth = Math.max(1.5, u * .014); g.stroke();
    }
    // Hoofd
    const hy = -u * .43;
    if (o.mech) {
      const hg = g.createLinearGradient(0, hy - u * .1, 0, hy + u * .1);
      hg.addColorStop(0, metal[0]); hg.addColorStop(1, metal[2]);
      g.fillStyle = hg;
      rr(g, -u * .1, hy - u * .1, u * .2, u * .19, u * .04); g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .014); g.stroke();
      g.strokeStyle = metal[1]; g.lineWidth = Math.max(1, u * .012);
      g.beginPath(); g.moveTo(0, hy - u * .1); g.lineTo(0, hy - u * .17); g.stroke();
      g.fillStyle = eye;
      g.beginPath(); g.arc(0, hy - u * .175, u * .018, 0, TAU); g.fill();
      if (!o.back) {
        glow(g, 0, hy - u * .01, u * .14, eye, 1);
        g.fillStyle = eye;
        rr(g, -u * .075, hy - u * .03, u * .15, u * .04, u * .015); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.fillRect(-u * .05, hy - u * .02, u * .1, u * .012);
      }
    } else {
      const hg = g.createRadialGradient(-u * .03, hy - u * .04, 1, 0, hy, u * .12);
      hg.addColorStop(0, '#ffffff'); hg.addColorStop(.4, '#c4d1e3'); hg.addColorStop(1, '#323d50');
      g.fillStyle = hg;
      g.beginPath(); g.arc(0, hy, u * .105, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = Math.max(1.5, u * .014); g.stroke();
      // pluim
      g.strokeStyle = col; g.lineWidth = Math.max(2, u * .035); g.lineCap = 'round';
      const wv = Math.sin((o.t || 0) * 8) * u * .02;
      g.beginPath(); g.moveTo(0, hy - u * .1); g.quadraticCurveTo(u * .05, hy - u * .2, u * .12 + wv, hy - u * .17); g.stroke();
      g.lineCap = 'butt';
      if (!o.back) {
        glow(g, 0, hy, u * .13, eye, .9);
        g.fillStyle = eye;
        rr(g, -u * .075, hy - u * .02, u * .15, u * .035, u * .015); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.fillRect(-u * .05, hy - u * .012, u * .1, u * .01);
      } else {
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(-u * .01, hy - u * .1, u * .02, u * .2);
      }
    }
  }

  // De keeper in de poort. dive: { x, y, k } in poortmaten (waar hij naartoe duikt, k = 0..1 hoe ver).
  function keeper(g, Lo, o) {
    if (has(o.mech ? 'keeper-robot' : 'keeper-ridder') && has(o.mech ? 'duik-robot' : 'duik-ridder')) return keeperArt(g, Lo, o);
    const H = Lo.GH * .82;
    const d = o.dive || { x: 0, y: 0, k: 0 };
    const k = ease(clamp(d.k, 0, 1));
    const home = toScreen(Lo, 0, 0);
    const hipY = home.y - H * .5;
    // Naar de bal toe: het midden van het lijf schuift richting doel, het lijf kantelt.
    const tx = toScreen(Lo, d.x, d.y);
    const reachX = d.x === 0 ? 0 : Math.sign(d.x) * Math.max(0, Math.abs(tx.x - home.x) - H * .32);
    const bx = home.x + reachX * k;
    const by = hipY + (Math.min(tx.y + H * .2, hipY) - hipY) * k * (d.x === 0 ? 1.2 : .9) + (d.x === 0 ? 0 : Math.sin(k * Math.PI) * -H * .08);
    const ang = d.x === 0 ? 0 : Math.sign(d.x) * k * clamp(.35 + Math.abs(d.x) * 1.15 - d.y * .3, .3, 1.45);
    // Schaduw op het gras
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(bx, home.y, H * .22 * (1 + k * .6), H * .05, 0, 0, TAU); g.fill();
    if (o.ring) glow(g, bx, home.y, H * .5, o.color, .35, .25);
    g.save();
    g.translate(bx, by);
    g.rotate(ang);
    figure(g, H, {
      mech: o.mech, color: o.color, eye: o.eye, gloves: true, shield: o.shield, t: o.t,
      arms: d.x === 0 ? .25 + k * .55 : .35 + k * .65, spread: o.ready ? .5 + Math.sin((o.t || 0) * 4) * .08 : .3,
      run: d.k <= 0 && o.ready ? (o.t || 0) * .8 % 1 * .2 : 0,
    });
    g.restore();
  }

  // De keeper als geschilderd beeld: staand, en bij een duik het duikbeeld (gespiegeld voor links), schuivend naar de bal.
  function keeperArt(g, Lo, o) {
    const d = o.dive || { x: 0, y: 0, k: 0 };
    const k = ease(clamp(d.k, 0, 1));
    const home = toScreen(Lo, 0, 0);
    const tint = o.mech ? tinted('keeper-robot', o.color, 'blauw') : tinted('keeper-ridder', o.color, 'blauw');
    const H = Lo.GH * .9;
    g.fillStyle = 'rgba(0,0,0,.4)';
    if (o.ring) glow(g, home.x, home.y, H * .5, o.color, .3, .25);
    const side = d.x === 0 ? 0 : Math.sign(d.x);
    if (side === 0 || k < .18) {
      // staan (licht wiegen), of recht omhoog springen voor een bal in het midden
      const sway = o.ready && d.k <= 0 ? Math.sin((o.t || 0) * 3) * H * .015 : 0;
      const lift = side === 0 ? k * Math.max(0, d.y - .25) * Lo.GH * .9 : 0;
      const w = H * tint.width / tint.height;
      g.beginPath(); g.ellipse(home.x, home.y, w * .32, H * .045, 0, 0, TAU); g.fill();
      if (o.shield) glow(g, home.x, home.y - H * .55 - lift, H * .7, '#ffc94a', .35);
      g.drawImage(tint, home.x - w / 2 + sway, home.y - H - lift + (side ? k * H * .1 : 0), w, H);
      return;
    }
    const img = o.mech ? tinted('duik-robot', o.color, 'blauw') : tinted('duik-ridder', o.color, 'blauw');
    const T = toScreen(Lo, d.x, d.y);
    const DW = Lo.GW * .5, DH = DW * img.height / img.width;
    // midden van het lijf: van het midden van de poort naar de bal, de handen (rechterkant van het beeld) bij de bal
    const kk = (k - .18) / .82;
    const cx = lerp(home.x, T.x - side * DW * .28, kk);
    const cy = lerp(home.y - H * .5, T.y + DH * .1, kk) - Math.sin(kk * Math.PI) * Lo.GH * .08;
    const ang = side * clamp((.45 - d.y) * .5, -.35, .25);
    g.beginPath(); g.ellipse(cx, home.y, DW * .35, H * .04, 0, 0, TAU); g.fill();
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    if (side < 0) g.scale(-1, 1);
    if (o.shield) glow(g, DW * .3, 0, DW * .4, '#ffc94a', .35);
    g.drawImage(img, -DW / 2, -DH / 2, DW, DH);
    g.restore();
  }

  // De schutter van achter gezien, bij de stip. run 0..1 = aanloop, kick 0..1 = trap.
  function shooter(g, Lo, o) {
    if (has(o.mech ? 'schiet-robot' : 'schiet-ridder')) return shooterArt(g, Lo, o);
    const H = Lo.GH * 1.05;
    const spot = ground(Lo, 0, 1);
    const k = ease(clamp(o.run || 0, 0, 1));
    const fx = lerp(spot.x - Lo.GW * .42, spot.x - Lo.GW * .085, k);
    const fy = lerp(Lo.h + H * .25, spot.y + H * .06, k);
    const scale = lerp(1.25, 1, k);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(fx, fy, H * .18 * scale, H * .04 * scale, 0, 0, TAU); g.fill();
    g.save();
    g.translate(fx, fy - H * .48 * scale);
    g.scale(scale, scale);
    g.rotate(o.kick ? -.12 * o.kick : (k < 1 && o.run > 0 ? .08 : 0));
    figure(g, H, { back: true, mech: o.mech, color: o.color, eye: o.eye, t: o.t, run: k < 1 && o.run > 0 ? o.run * 3 : 0, kick: o.kick || 0, spread: o.kick ? .5 : .1 });
    g.restore();
  }

  function shooterArt(g, Lo, o) {
    const img = o.mech ? tinted('schiet-robot', o.color, 'blauw') : tinted('schiet-ridder', o.color, 'blauw');
    const spot = ground(Lo, 0, 1);
    const k = ease(clamp(o.run || 0, 0, 1));
    const H = Lo.GH * .98 * lerp(1.2, 1, k);
    const w = H * img.width / img.height;
    const fx = lerp(spot.x - Lo.GW * .5, spot.x - Lo.GW * .2, k);
    const fy = lerp(Lo.h + H * .2, spot.y + H * .05, k);
    const bob = k < 1 && o.run > 0 ? Math.abs(Math.sin(o.run * 9)) * H * .03 : 0;
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.beginPath(); g.ellipse(fx, fy, w * .3, H * .04, 0, 0, TAU); g.fill();
    g.save();
    g.translate(fx, fy - bob);
    g.rotate((o.kick || 0) * -.08);
    g.drawImage(img, -w / 2, -H, w, H);
    g.restore();
  }

  // ---------- De bal ----------
  function ball(g, x, y, r, o = {}) {
    const col = o.gold ? '#ffc94a' : '#5ee7ff';
    if (o.trail) {
      for (let i = 0; i < o.trail.length; i++) {
        const p = o.trail[i], f = (i + 1) / o.trail.length;
        g.fillStyle = rgba(col, f * .35);
        g.beginPath(); g.arc(p.x, p.y, p.r * (.4 + f * .5), 0, TAU); g.fill();
      }
    }
    glow(g, x, y, r * 4, col, .9);
    const bg = g.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(.45, o.gold ? '#ffe8a3' : '#bff7ff'); bg.addColorStop(1, o.gold ? '#d9901a' : '#1f8fc9');
    g.fillStyle = bg;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // runenlijnen die draaien
    g.strokeStyle = rgba(o.gold ? '#7a4a00' : '#003a5c', .6);
    g.lineWidth = Math.max(1, r * .12);
    const a = (o.spin || 0);
    g.beginPath(); g.ellipse(x, y, r * .95, r * .35, a, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x, y, r * .35, r * .95, a, 0, TAU); g.stroke();
    if (o.shadowY) {
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.beginPath(); g.ellipse(x, o.shadowY, r * .9, r * .3, 0, 0, TAU); g.fill();
    }
  }

  // ---------- Een strafschop afspelen ----------
  // ev: { kind: 'shot' (de leerling schiet) of 'keep' (de robot schiet), x, y, result, kx, ky (waar de keeper duikt), gold }
  // Tijden in seconden vanaf t0. run = aanloop, fly = vlucht van de bal.
  function kickAnim(ev, t0, opts = {}) {
    return {
      ev, t0, run: opts.run || (ev.kind === 'keep' ? (opts.windS || 1.5) : .5), fly: opts.fly || (ev.gold ? .42 : .55),
      diveAt: opts.diveAt, // wanneer de keeper begint te duiken (s na t0); anders vlak na de trap
      dive: opts.dive, trail: [],
    };
  }
  // Waar is de bal op tijdstip t? Geeft { x, y, r, shadowY, done, phase }.
  function ballAt(Lo, A, t) {
    const ev = A.ev;
    const spot = ground(Lo, 0, 1);
    const r0 = Lo.GW * .03, r1 = Lo.GW * .019;
    const s = t - A.t0 - A.run;
    if (s < 0) return { x: spot.x, y: spot.y - r0 * .9, r: r0, shadowY: spot.y, phase: 'wait' };
    const T = toScreen(Lo, ev.x, ev.y);
    const p = Math.min(1, s / A.fly);
    if (p < 1) {
      const lift = Math.sin(p * Math.PI) * Lo.GH * (.12 + ev.y * .1);
      return { x: lerp(spot.x, T.x, p), y: lerp(spot.y - r0 * .9, T.y, p) - lift, r: lerp(r0, r1, p), shadowY: lerp(spot.y, Lo.gy, p), phase: 'fly' };
    }
    const q = s - A.fly; // na aankomst
    const res = ev.result;
    if (res === 'goal') {
      const k = Math.min(1, q / .25);
      return { x: T.x, y: T.y - Lo.GH * .06 * k + Math.min(q, .6) * Lo.GH * .25 * k, r: r1 * (1 - .15 * k), phase: 'net', q };
    }
    // Weg van de poort: gered (afgeslagen), op de paal, naast of over.
    const sx = ev.x >= 0 ? 1 : -1;
    let vx, vy;
    if (res === 'save') { vx = sx * Lo.GW * .9; vy = -Lo.GH * 1.2; }
    else if (res === 'paal') { vx = sx * Lo.GW * .5; vy = Lo.GH * .9; }
    else { vx = sx * Lo.GW * .25; vy = -Lo.GH * .5; }
    const a = Math.min(q, 1.2);
    return { x: T.x + vx * a, y: T.y + vy * a + Lo.GH * 2.2 * a * a, r: r1 * Math.max(.5, 1 - a * .3), phase: 'out', q, fade: Math.max(0, 1 - a / 1.2) };
  }

  // ---------- Alles op het scherm ----------
  // s: { t, keeper: {mech, color, eye, dive, shield, ready}, shooter: {mech, color, eye, run, kick}, ball: {x,y,r,...},
  //      aim: { x, y, phase: 'x'|'y', gold }, tell: { x, y, a }, ripple: { x, y, q }, flash }
  function render(ctx, w, h, s) {
    const Lo = layout(w, h);
    ctx.drawImage(background(Lo), 0, 0);
    const t = s.t || 0;
    // Flitsjes in het publiek
    const fr = rng(Math.floor(t * 6));
    for (let i = 0; i < 3; i++) if (fr() < .5) glow(ctx, fr() * w, Lo.wallY - Lo.GH * (.3 + fr() * .8), Lo.GW * .02, '#ffffff', .8);
    // Golf in het net na een doelpunt
    if (s.ripple && s.ripple.q < 1.2) {
      const P = toScreen(Lo, s.ripple.x, s.ripple.y), q = s.ripple.q;
      ctx.save();
      ctx.beginPath(); ctx.rect(Lo.cx - Lo.GW / 2, Lo.gy - Lo.GH, Lo.GW, Lo.GH); ctx.clip();
      glow(ctx, P.x, P.y, Lo.GW * (.2 + q * .4), s.ripple.gold ? '#ffc94a' : '#5ee7ff', Math.max(0, .9 - q * .7));
      ctx.strokeStyle = rgba(s.ripple.gold ? '#ffc94a' : '#5ee7ff', Math.max(0, .9 - q * .75));
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const rad = Lo.GW * (.05 + q * .35 + i * .06);
        ctx.beginPath(); ctx.ellipse(P.x, P.y, rad, rad * .7, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // Verraad van de robot: een rood hologram waar hij naartoe mikt
    if (s.tell && s.tell.a > 0) {
      const P = toScreen(Lo, s.tell.x, s.tell.y), rad = Lo.GW * .07;
      ctx.save();
      ctx.globalAlpha = clamp(s.tell.a, 0, 1);
      glow(ctx, P.x, P.y, rad * 2.2, '#ff3b3b', .7);
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P.x, P.y, rad * (1 + Math.sin(t * 14) * .08), 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P.x - rad * 1.4, P.y); ctx.lineTo(P.x - rad * .5, P.y); ctx.moveTo(P.x + rad * .5, P.y); ctx.lineTo(P.x + rad * 1.4, P.y);
      ctx.moveTo(P.x, P.y - rad * 1.4); ctx.lineTo(P.x, P.y - rad * .5); ctx.moveTo(P.x, P.y + rad * .5); ctx.lineTo(P.x, P.y + rad * 1.4); ctx.stroke();
      ctx.restore();
    }
    if (s.keeper) keeper(ctx, Lo, { ...s.keeper, t });
    // De bal achter de keeper (in het net) of ervoor (onderweg)
    const b = s.ball;
    const drawBall = () => {
      if (!b) return;
      ctx.save();
      if (b.fade !== undefined) ctx.globalAlpha = b.fade;
      ball(ctx, b.x, b.y, b.r, { gold: b.gold, trail: b.trail, spin: t * 9, shadowY: b.shadowY });
      ctx.restore();
    };
    drawBall();
    if (s.shooter) shooter(ctx, Lo, { ...s.shooter, t });
    // Het vizier
    if (s.aim) {
      const a = s.aim;
      const col = a.gold ? '#ffc94a' : '#5ee7ff';
      if (a.phase === 'x') {
        const P = toScreen(Lo, a.x, 0), T = toScreen(Lo, a.x, 1.12);
        ctx.strokeStyle = rgba(col, .9); ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.setLineDash([]);
        glow(ctx, P.x, Lo.gy - Lo.GH * .5, Lo.GW * .06, col, .6);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(T.x, T.y + 12); ctx.lineTo(T.x - 10, T.y - 4); ctx.lineTo(T.x + 10, T.y - 4); ctx.fill();
      } else {
        const P = toScreen(Lo, a.x, a.y), rad = Lo.GW * .05;
        glow(ctx, P.x, P.y, rad * 2.2, col, .8);
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(P.x, P.y, rad, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P.x - rad * 1.5, P.y); ctx.lineTo(P.x + rad * 1.5, P.y); ctx.moveTo(P.x, P.y - rad * 1.5); ctx.lineTo(P.x, P.y + rad * 1.5); ctx.stroke();
      }
      // De hoogtemeter naast de poort: boven de lat is rood (over!)
      const mx = Lo.cx + Lo.GW / 2 + Lo.GW * .09, top = Lo.gy - Lo.GH * 1.25, bot = Lo.gy, mw = Math.max(10, Lo.GW * .03);
      ctx.fillStyle = 'rgba(5,6,15,.75)';
      rr(ctx, mx - mw / 2 - 3, top - 3, mw + 6, bot - top + 6, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,77,109,.85)';
      ctx.fillRect(mx - mw / 2, top, mw, Lo.GH * .25);
      const mg = ctx.createLinearGradient(0, bot, 0, top + Lo.GH * .25);
      mg.addColorStop(0, 'rgba(74,222,128,.75)'); mg.addColorStop(.75, 'rgba(255,201,74,.85)'); mg.addColorStop(1, 'rgba(255,140,66,.9)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - mw / 2, top + Lo.GH * .25, mw, Lo.GH);
      if (a.phase === 'y') {
        const yy = bot - a.y / 1.25 * (bot - top);
        ctx.fillStyle = '#fff';
        ctx.fillRect(mx - mw / 2 - 6, yy - 2, mw + 12, 4);
        glow(ctx, mx, yy, mw * 1.6, '#ffffff', .6);
      }
    }
    if (s.flash) {
      ctx.fillStyle = rgba(s.flash.color || '#ffffff', clamp(s.flash.a, 0, 1) * .35);
      ctx.fillRect(0, 0, w, h);
    }
    return Lo;
  }

  // Een klein portret van een robot (of ridder) voor de ladder en de wachtzaal.
  function portrait(g, x, y, size, o) {
    const art = o.mech !== false ? tinted('keeper-robot', o.color, 'blauw') : tinted('keeper-ridder', o.color, 'blauw');
    if (art) {
      const H = size * 1.7, w = H * art.width / art.height;
      g.drawImage(art, x - w / 2, y + size * .2 - H * .55, w, H);
      return;
    }
    g.save();
    g.translate(x, y + size * .2);
    figure(g, size * 1.6, { mech: o.mech !== false, color: o.color, eye: o.eye, t: o.t || 0, arms: .1, spread: .2 });
    g.restore();
  }

  return { layout, toScreen, ground, render, kickAnim, ballAt, portrait, figure };
})();
