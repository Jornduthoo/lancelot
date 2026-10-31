// Haakridder tekenen: de lucht, de afgrond, de vlageilanden, de kristalankers, de lasers en de ridders (zijaanzicht).
// Staan Jorns geschilderde beelden in /img/haakridder/, dan tekenen we die (achtergrond, ridder zwaait, ridder vliegt,
// anker, banier); anders een getekende versie. Wat niet beweegt, bakken we één keer op een eigen canvas.
// Gebruikt HkWorld en Glow (fx.js).
const HkDraw = (() => {
  const W = HkWorld;
  const { glow } = Glow;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const TAU = Math.PI * 2;
  const INK = '#05060f';

  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function shade(hex, f) {
    const [r, g, b] = hexRgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }

  // ---------- Geschilderde beelden (van Jorn) ----------
  const ART = {};
  const ART_NAMES = ['achtergrond', 'zwaai', 'vlieg', 'anker', 'banier'];
  let artVersion = 0;
  if (typeof Image !== 'undefined') {
    for (const n of ART_NAMES) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artVersion++; };
      img.src = `/img/haakridder/${n}.webp`;
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
  // De blauwe delen van de geschilderde ridder krijgen de kleur van de leerling (één keer gebakken, op beperkte grootte).
  const tintCache = new Map();
  function tinted(name, color) {
    const img = ART[name];
    if (!img) return null;
    const key = `${name}|${color}`;
    let c = tintCache.get(key);
    if (c) return c;
    const sc = Math.min(1, 360 / Math.max(img.width, img.height));
    c = mk(img.width * sc, img.height * sc);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    if (color) {
      const data = g.getImageData(0, 0, c.width, c.height), px = data.data;
      const [th, ts] = rgbHsl(...hexRgb(color));
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 8) continue;
        const [h, sat, l] = rgbHsl(px[i], px[i + 1], px[i + 2]);
        if (h < 180 || h > 265 || sat < .22) continue;
        const [r, gg, b] = hslRgb(th, Math.max(sat, ts * .85), l);
        px[i] = r; px[i + 1] = gg; px[i + 2] = b;
      }
      g.putImageData(data, 0, 0);
    }
    if (tintCache.size > 40) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  // ---------- Lucht ----------
  const skyCache = new Map();
  function sky(theme, w, h) {
    const key = `${theme.name}:${w}x${h}`;
    let c = skyCache.get(key);
    if (c) return c;
    if (skyCache.size > 6) skyCache.clear();
    c = mk(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky[0]);
    grad.addColorStop(.65, theme.sky[1]);
    grad.addColorStop(1, theme.sky[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = W.rng(theme.name.length * 977 + 3);
    // Nevelwolken
    for (let i = 0; i < 7; i++) glow(g, r() * w, r() * h * .7, (.15 + r() * .25) * Math.max(w, h), i % 2 ? theme.glow : theme.abyss, .12);
    // Sterren
    g.fillStyle = '#fff';
    for (let i = 0; i < 160; i++) {
      g.globalAlpha = .25 + r() * .7;
      const s = r() < .1 ? 2 : 1;
      g.fillRect(Math.round(r() * w), Math.round(r() * h * .8), s, s);
    }
    g.globalAlpha = 1;
    // Een geringde planeet
    const px = w * .78, py = h * .2, pr = Math.min(w, h) * .09;
    glow(g, px, py, pr * 2.6, theme.glow, .25);
    const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
    pg.addColorStop(0, shade(theme.glow, 1.1));
    pg.addColorStop(1, shade(theme.sky[1], .8));
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,233,160,.6)';
    g.lineWidth = Math.max(2, pr * .08);
    g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.35, 0, TAU); g.stroke();
    skyCache.set(key, c);
    return c;
  }

  // Verre zwevende burchtruïnes (getekend; alleen als er geen geschilderde achtergrond is).
  const layerCache = new Map();
  function layer(theme, h) {
    const key = `${theme.name}:${h}`;
    let c = layerCache.get(key);
    if (c) return c;
    if (layerCache.size > 6) layerCache.clear();
    const w = Math.min(2400, Math.round(h * 2.2));
    c = mk(w, h);
    const g = c.getContext('2d');
    const r = W.rng(theme.name.length * 131 + h);
    const dark = shade(theme.sky[1], .7);
    g.globalAlpha = .7;
    for (let i = 0; i < 9; i++) {
      const cx = (i + .2 + r() * .6) * w / 9, cy = h * (.3 + r() * .3), iw = h * (.05 + r() * .06);
      // Eiland
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(cx - iw, cy);
      g.lineTo(cx + iw, cy);
      g.lineTo(cx + iw * .4, cy + iw * .9);
      g.lineTo(cx, cy + iw * 1.4);
      g.lineTo(cx - iw * .5, cy + iw * .8);
      g.closePath();
      g.fill();
      // Torens met kantelen en neonraampjes
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const tw = iw * (.18 + r() * .12), th = iw * (.6 + r() * .9), tx = cx - iw * .7 + k * iw * .55 + r() * iw * .2;
        g.fillStyle = dark;
        g.fillRect(tx, cy - th, tw, th);
        for (let m = 0; m < 3; m += 2) g.fillRect(tx + m * tw / 3, cy - th - tw * .25, tw / 3, tw * .25);
        g.fillStyle = theme.glow;
        g.fillRect(tx + tw * .38, cy - th * .7, tw * .24, tw * .35);
      }
      glow(g, cx, cy + iw * 1.3, iw * .5, theme.glow, .25);
    }
    g.globalAlpha = 1;
    layerCache.set(key, c);
    return c;
  }

  // De geschilderde achtergrond, één keer geschaald naar de hoogte van het scherm.
  let bgCache = null;
  // In stroken van 512 pixels (zonder doorzichtigheid), zodat elke frame alleen de zichtbare stroken getekend worden.
  // Hoge schermen (gsm rechtop) bakken we op maximaal 900 pixels hoog en rekken we bij het tekenen.
  function painted(h) {
    const img = ART.achtergrond;
    if (!img) return null;
    if (bgCache && bgCache.h === h && bgCache.v === artVersion) return bgCache;
    const bh = Math.min(h, 900);
    const iw = Math.round(img.width * bh / img.height);
    const total = iw * 2, CH = 512;
    const chunks = [];
    for (let x0 = 0; x0 < total; x0 += CH) {
      const cw = Math.min(CH, total - x0);
      const c = document.createElement('canvas');
      c.width = cw; c.height = bh;
      const g = c.getContext('2d', { alpha: false });
      g.translate(-x0, 0);
      // Twee keer naast elkaar, de tweede gespiegeld: zo sluiten de randen naadloos aan.
      g.drawImage(img, 0, 0, iw, bh);
      g.save(); g.translate(iw * 2, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, iw, bh); g.restore();
      // Iets donkerder, zodat de ankers, de ridders en de lasers vooraan beter opvallen.
      g.fillStyle = 'rgba(6,6,24,.28)';
      g.fillRect(x0, 0, cw, bh);
      chunks.push({ x0, c });
    }
    bgCache = { h, v: artVersion, k: h / bh, width: total * h / bh, chunks };
    return bgCache;
  }

  // ---------- De afgrond ----------
  const abyssCache = new Map();
  function abyss(ctx, theme, w, h, sy, t) {
    if (sy >= h) return;
    const key = `${theme.name}:${w}x${h}`;
    let c = abyssCache.get(key);
    if (!c) {
      if (abyssCache.size > 6) abyssCache.clear();
      const ah = Math.round(h * .5);
      c = mk(w, ah);
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, ah);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(.35, shade(theme.abyss, .35).replace('rgb', 'rgba').replace(')', ',.65)'));
      grad.addColorStop(1, shade(theme.abyss, .15));
      g.fillStyle = grad;
      g.fillRect(0, 0, w, ah);
      abyssCache.set(key, c);
    }
    ctx.drawImage(c, 0, Math.round(sy - c.height * .3));
    // Zachte lichtwolkjes die heen en weer drijven.
    for (let i = 0; i < 4; i++) {
      const x = ((i * .29 + t * .015 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * w;
      glow(ctx, x, sy + h * .06, w * .14, theme.abyss, .22, .35);
    }
  }

  // ---------- Vlageiland ----------
  const platCache = new Map();
  function platSprite(s, theme, S) {
    const key = `${theme.name}:${s.w}:${S}`;
    let c = platCache.get(key);
    if (c) return c;
    if (platCache.size > 20) platCache.clear();
    const pad = S * .4;
    const w = s.w * S, h = S * 3.4;
    c = mk(w + pad * 2, h + pad);
    const g = c.getContext('2d');
    g.translate(pad, pad * .5);
    g.lineJoin = 'round';
    g.lineWidth = Math.max(1, S * .06);
    g.strokeStyle = INK;
    // Rots onder het eiland
    const rg = g.createLinearGradient(0, 0, 0, h);
    rg.addColorStop(0, shade(theme.stone, 1.2));
    rg.addColorStop(1, shade(theme.stone, .45));
    g.fillStyle = rg;
    g.beginPath();
    g.moveTo(0, S * .5);
    g.lineTo(w, S * .5);
    g.lineTo(w * .82, h * .55);
    g.lineTo(w * .6, h * .7);
    g.lineTo(w * .5, h);
    g.lineTo(w * .36, h * .72);
    g.lineTo(w * .14, h * .5);
    g.closePath();
    g.fill(); g.stroke();
    // Kristallen in de rots
    for (const [fx, fy, sz] of [[.3, .45, .5], [.62, .55, .4], [.48, .78, .35]]) {
      const x = w * fx, y = h * fy, z = S * sz;
      glow(g, x, y, z * 2.2, theme.glow, .5);
      g.fillStyle = theme.glow;
      g.beginPath(); g.moveTo(x, y - z); g.lineTo(x + z * .5, y); g.lineTo(x, y + z * .7); g.lineTo(x - z * .5, y); g.closePath(); g.fill(); g.stroke();
    }
    // Stenen plaat met een gouden rand en neonstrook
    const sg = g.createLinearGradient(0, 0, 0, S * .6);
    sg.addColorStop(0, shade(theme.stone, 1.9));
    sg.addColorStop(1, shade(theme.stone, 1.1));
    g.fillStyle = sg;
    g.beginPath(); g.rect(0, 0, w, S * .6); g.fill(); g.stroke();
    g.fillStyle = theme.edge;
    g.beginPath(); g.rect(0, -S * .02, w, S * .12); g.fill(); g.stroke();
    g.fillStyle = theme.glow;
    g.fillRect(S * .2, S * .38, w - S * .4, S * .07);
    for (let x = S * .9; x < w - S * .5; x += S * 1.3) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(x, S * .12); g.lineTo(x, S * .6); g.stroke(); }
    c.pad = pad;
    platCache.set(key, c);
    return c;
  }

  // De banier op het eiland: geschilderd, of een gouden paal met een blauwe banier en het nummer.
  function banner(ctx, k, sx, sy, S, t, passed) {
    const col = passed ? '#4ade80' : '#ffc94a';
    glow(ctx, sx + S * .6, sy - S * 2.6, S * 2.4, col, passed ? .25 : .5);
    if (ART.banier) {
      const img = ART.banier;
      // De paal staat onderaan op 30 % van de breedte.
      const hh = S * 4.4, ww = hh * img.width / img.height;
      ctx.drawImage(img, Math.round(sx - ww * .3), Math.round(sy - hh), Math.round(ww), Math.round(hh));
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, S * .05);
      ctx.fillStyle = '#c9a54a';
      ctx.beginPath(); ctx.rect(sx - S * .1, sy - S * 3.9, S * .2, S * 3.9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath(); ctx.arc(sx, sy - S * 4, S * .2, 0, TAU); ctx.fill(); ctx.stroke();
      const wave = Math.sin(t * 3.5 + k) * S * .12;
      const x0 = sx + S * .12, x1 = sx + S * 1.7, top = sy - S * 3.75;
      ctx.fillStyle = passed ? '#1f6e4a' : '#22328a';
      ctx.beginPath();
      ctx.moveTo(x0, top); ctx.lineTo(x1, top + wave * .3);
      ctx.lineTo(x1 + wave * .5, sy - S * 1.9); ctx.lineTo((x0 + x1) / 2 + wave, sy - S * 2.3); ctx.lineTo(x0 + wave * .3, sy - S * 1.9);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, S * .08);
      ctx.stroke();
    }
    // Het nummer van de vlag in een gouden schild.
    // Op het schild van de geschilderde banier (54 % breed, 54 % hoog), of op de getekende.
    const ah = S * 4.4, aw = ART.banier ? ah * ART.banier.width / ART.banier.height : 0;
    const cx = ART.banier ? sx - aw * .3 + aw * .54 : sx + S * .92, cy = ART.banier ? sy - ah + ah * .54 : sy - S * 2.95;
    ctx.fillStyle = col;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.moveTo(cx - S * .38, cy - S * .4); ctx.lineTo(cx + S * .38, cy - S * .4); ctx.lineTo(cx + S * .38, cy + S * .05); ctx.quadraticCurveTo(cx + S * .3, cy + S * .38, cx, cy + S * .5); ctx.quadraticCurveTo(cx - S * .3, cy + S * .38, cx - S * .38, cy + S * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1030';
    ctx.font = `900 ${Math.round(S * .42)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(k), cx, cy);
  }

  // ---------- Kristalanker ----------
  const anchorCache = new Map();
  function anchorSprite(S) {
    const key = `${S}:${artVersion}`;
    let c = anchorCache.get(key);
    if (c) return c;
    if (anchorCache.size > 6) anchorCache.clear();
    const size = Math.ceil(S * 1.9);
    c = mk(size, Math.ceil(size * 1.35)); // wat extra plaats onderaan voor de steentjes onder het anker
    const g = c.getContext('2d');
    const m = size / 2;
    if (ART.anker) {
      // De ring vult de breedte; zijn midden ligt op 43 % van de hoogte.
      const img = ART.anker, ww = size * .95, hh = ww * img.height / img.width;
      glow(g, m, m, size * .5, '#5ee7ff', .35);
      g.drawImage(img, m - ww / 2, m - hh * .43, ww, hh);
    } else {
      glow(g, m, m, size * .5, '#5ee7ff', .55);
      g.lineWidth = Math.max(1, S * .06);
      g.strokeStyle = INK;
      // Gouden ring met runen
      g.fillStyle = '#c9a54a';
      g.beginPath(); g.arc(m, m, S * .62, 0, TAU); g.arc(m, m, S * .44, 0, TAU, true); g.fill('evenodd');
      g.beginPath(); g.arc(m, m, S * .62, 0, TAU); g.stroke();
      g.beginPath(); g.arc(m, m, S * .44, 0, TAU); g.stroke();
      g.fillStyle = '#ffe9a0';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillRect(m + Math.cos(a) * S * .53 - S * .03, m + Math.sin(a) * S * .53 - S * .03, S * .06, S * .06); }
      // Kristal in het midden
      const z = S * .36;
      g.fillStyle = '#9ff4ff';
      g.beginPath(); g.moveTo(m, m - z); g.lineTo(m + z * .62, m); g.lineTo(m, m + z); g.lineTo(m - z * .62, m); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2de2c8';
      g.beginPath(); g.moveTo(m, m - z); g.lineTo(m + z * .62, m); g.lineTo(m, m + z * .15); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.fillRect(m - z * .25, m - z * .45, z * .12, z * .35);
    }
    anchorCache.set(key, c);
    return c;
  }
  function anchor(ctx, a, sx, sy, S, t, aim, gold) {
    const spr = anchorSprite(S);
    const bob = a.mv ? 0 : Math.sin(t * 2 + a.x) * S * .06;
    if (a.mv) {
      ctx.strokeStyle = 'rgba(94,231,255,.25)';
      ctx.lineWidth = Math.max(1, S * .05);
      ctx.setLineDash([S * .2, S * .2]);
      ctx.beginPath();
      const dx = a.mv.ax * S, dy = a.mv.ay * S;
      ctx.moveTo(sx - dx, sy - dy); ctx.lineTo(sx + dx, sy + dy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(sy - spr.width / 2 + bob));
    if (aim) {
      // Dit anker grijpt je haak als je nu drukt.
      const p = .5 + Math.sin(t * 8) * .5;
      ctx.strokeStyle = gold ? '#ffc94a' : '#e8fbff';
      ctx.globalAlpha = .55 + p * .45;
      ctx.lineWidth = Math.max(2, S * .08);
      ctx.beginPath(); ctx.arc(sx, sy + bob, S * (.85 + p * .12), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Stuiterkussen ----------
  function pad(ctx, s, sx, sy, S, t) {
    const w = s.w * S;
    glow(ctx, sx + w / 2, sy, w * .7, '#ff6bd6', .4, .4);
    ctx.lineWidth = Math.max(1, S * .06);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#3a2f5c';
    ctx.beginPath(); ctx.rect(sx, sy, w, S * .55); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(sx - S * .1, sy + S * .45, w + S * .2, S * .2); ctx.fill(); ctx.stroke();
    const sq = 1 + Math.sin(t * 6) * .08;
    ctx.fillStyle = '#ff6bd6';
    ctx.beginPath(); ctx.ellipse(sx + w / 2, sy + S * .05, w * .5, S * .28 * sq, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    // Pijltjes omhoog
    ctx.strokeStyle = 'rgba(255,233,250,.8)';
    ctx.lineWidth = Math.max(1.5, S * .07);
    const up = (t * 1.5) % 1;
    for (let i = 0; i < 3; i++) {
      const x = sx + w * (.25 + i * .25), y = sy - S * (.4 + up * .9);
      ctx.globalAlpha = 1 - up;
      ctx.beginPath(); ctx.moveTo(x - S * .2, y + S * .15); ctx.lineTo(x, y - S * .05); ctx.lineTo(x + S * .2, y + S * .15); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Laser ----------
  function emitter(ctx, x, y, S, dir, lit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, dir);
    ctx.fillStyle = '#2b3150';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.rect(-S * .34, -S * .45, S * .68, S * .32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(-S * .26, -S * .15, S * .52, S * .1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit;
    ctx.fillRect(-S * .14, -S * .05, S * .28, S * .1);
    ctx.restore();
  }
  function laser(ctx, l, sx, sy0, sy1, S, t, h) {
    const on = W.laserOn(l, t);
    const soon = !on && W.laserSoon(l, t);
    const a = Math.max(-S, sy0), b = Math.min(h + S, sy1);
    if (on) {
      const op = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      const fl = .85 + Math.sin(t * 60 + l.x) * .15;
      ctx.fillStyle = `rgba(255,40,70,${.28 * fl})`;
      ctx.fillRect(sx - S * .3, a, S * .6, b - a);
      ctx.fillStyle = 'rgba(255,90,110,.85)';
      ctx.fillRect(sx - S * .1, a, S * .2, b - a);
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - S * .03, a, S * .06, b - a);
      ctx.globalCompositeOperation = op;
    } else if (soon && Math.floor(t * 14) % 2) {
      ctx.fillStyle = 'rgba(255,201,74,.6)';
      ctx.fillRect(sx - 1, a, 2, b - a);
    }
    const lit = on ? '#ff4d6d' : soon ? '#ffc94a' : '#5a1a28';
    // Een laserpoort heeft een emitter aan het gat.
    if (sy0 > -S && sy0 < h) { emitter(ctx, sx, sy0, S, -1, lit); if (on) glow(ctx, sx, sy0, S * .9, '#ff4d6d', .8); }
    if (sy1 < h + S && sy1 > 0) { emitter(ctx, sx, sy1, S, 1, lit); if (on) glow(ctx, sx, sy1, S * .9, '#ff4d6d', .8); }
  }

  function crystal(ctx, x, y, S, t) {
    const yy = y + Math.sin(t * 3 + x * .01) * S * .12;
    glow(ctx, x, yy, S * .9, '#c77dff', .7);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, S * .04);
    ctx.fillStyle = '#e3b8ff';
    ctx.beginPath(); ctx.moveTo(x, yy - S * .38); ctx.lineTo(x + S * .25, yy); ctx.lineTo(x, yy + S * .38); ctx.lineTo(x - S * .25, yy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9b5cff';
    ctx.beginPath(); ctx.moveTo(x, yy - S * .38); ctx.lineTo(x + S * .25, yy); ctx.lineTo(x, yy + S * .08); ctx.closePath(); ctx.fill();
  }

  // ---------- De ridder ----------
  // Getekende ridder (alleen zolang er geen geschilderde is): armen omhoog, cape in de kleur van de leerling.
  const PX = 72;
  const knightCache = new Map();
  function drawnKnight(color, tuck) {
    const key = `${color}:${tuck ? 1 : 0}`;
    let c = knightCache.get(key);
    if (c) return c;
    const u = PX;
    c = mk(u * 2.4, u * 2.4);
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.lineWidth = u * .05;
    g.strokeStyle = INK;
    const steel = (x0, x1) => { const s = g.createLinearGradient(x0, 0, x1, 0); s.addColorStop(0, '#2a2f45'); s.addColorStop(.45, '#9aa3c4'); s.addColorStop(.6, '#5d6684'); s.addColorStop(1, '#22263a'); return s; };
    const part = (fill, fn) => { g.fillStyle = fill; g.beginPath(); fn(); g.fill(); g.stroke(); };
    const gold = '#ffc94a';
    if (!tuck) {
      // Cape
      part(color, () => { g.moveTo(-u * .2, -u * .45); g.quadraticCurveTo(-u * .55, u * .1, -u * .5, u * .75); g.lineTo(-u * .1, u * .55); g.lineTo(u * .05, -u * .35); g.closePath(); });
      // Benen
      part(steel(-u * .2, u * .2), () => g.rect(-u * .2, u * .25, u * .16, u * .62));
      part(steel(0, u * .25), () => g.rect(u * .04, u * .25, u * .16, u * .58));
      part('#3b3f5c', () => g.rect(-u * .24, u * .82, u * .24, u * .12));
      part('#3b3f5c', () => g.rect(u * .02, u * .78, u * .24, u * .12));
      // Romp
      part(steel(-u * .3, u * .3), () => { g.moveTo(-u * .28, -u * .4); g.lineTo(u * .28, -u * .4); g.lineTo(u * .22, u * .3); g.lineTo(-u * .22, u * .3); g.closePath(); });
      part(gold, () => g.rect(-u * .24, u * .18, u * .48, u * .09));
      part(color, () => { g.moveTo(0, -u * .28); g.lineTo(u * .12, -u * .12); g.lineTo(0, u * .06); g.lineTo(-u * .12, -u * .12); g.closePath(); });
      // Armen omhoog
      part(steel(-u * .3, -u * .1), () => { g.moveTo(-u * .28, -u * .36); g.lineTo(-u * .12, -u * 1.0); g.lineTo(-u * .02, -u * .96); g.lineTo(-u * .14, -u * .3); g.closePath(); });
      part(steel(u * .1, u * .3), () => { g.moveTo(u * .28, -u * .36); g.lineTo(u * .12, -u * 1.0); g.lineTo(u * .02, -u * .96); g.lineTo(u * .14, -u * .3); g.closePath(); });
      part('#3b3f5c', () => { g.arc(0, -u * 1.02, u * .11, 0, TAU); });
      // Helm
      part(steel(-u * .2, u * .2), () => { g.moveTo(-u * .19, -u * .42); g.lineTo(-u * .19, -u * .66); g.quadraticCurveTo(0, -u * .86, u * .19, -u * .66); g.lineTo(u * .19, -u * .42); g.closePath(); });
      g.fillStyle = '#5ee7ff';
      g.fillRect(-u * .14, -u * .6, u * .28, u * .06);
      part(color, () => { g.moveTo(-u * .02, -u * .78); g.quadraticCurveTo(-u * .35, -u * .95, -u * .45, -u * .62); g.quadraticCurveTo(-u * .25, -u * .76, -u * .02, -u * .7); g.closePath(); });
    } else {
      // Opgerold in een salto: een bol harnas met cape en helm.
      part(color, () => { g.arc(-u * .1, u * .05, u * .5, Math.PI * .4, Math.PI * 1.5); g.lineTo(-u * .1, u * .05); g.closePath(); });
      part(steel(-u * .4, u * .4), () => g.arc(0, 0, u * .4, 0, TAU));
      part(gold, () => g.arc(0, 0, u * .4, -.3, .5));
      part(steel(-u * .2, u * .2), () => g.arc(u * .1, -u * .36, u * .2, 0, TAU));
      g.fillStyle = '#5ee7ff';
      g.fillRect(u * .06, -u * .4, u * .22, u * .05);
      part(color, () => { g.moveTo(u * .05, -u * .52); g.quadraticCurveTo(-u * .3, -u * .7, -u * .38, -u * .45); g.quadraticCurveTo(-u * .15, -u * .5, u * .05, -u * .45); g.closePath(); });
    }
    knightCache.set(key, c);
    return c;
  }

  // o: {x, y, rot, hook (bool), ax, ay (anker), gold, color, name, alpha, blink}
  function knight(ctx, o, sx, sy, S, t) {
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blink && Math.floor(t * 12) % 2) ctx.globalAlpha *= .35;
    // Het plasmatouw van de handen naar het anker.
    if (o.hook) {
      const ax = sx + (o.ax - o.x) * S, ay = sy + (o.ay - o.y) * S;
      const d = Math.hypot(ax - sx, ay - sy) || 1;
      const hx = sx + (ax - sx) / d * S * 1.35, hy = sy + (ay - sy) / d * S * 1.35;
      const col = o.gold ? '#ffc94a' : '#5ee7ff';
      ctx.strokeStyle = col;
      ctx.globalAlpha *= .35;
      ctx.lineWidth = Math.max(3, S * .28);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.globalAlpha /= .35;
      ctx.strokeStyle = '#effcff';
      ctx.lineWidth = Math.max(1.5, S * .08);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke();
      glow(ctx, ax, ay, S * .7, col, .8);
    }
    if (o.gold) glow(ctx, sx, sy, S * 1.4, '#ffc94a', .35 + Math.sin(t * 8) * .1);
    else if (o.rim) glow(ctx, sx, sy, S * 1.2, o.color, .25);
    // Rechtop op het eiland: iets hoger, zodat de voeten op de stenen staan.
    ctx.translate(sx, sy - (o.ground && !o.hook ? S * .6 : 0));
    ctx.rotate(o.ground && !o.hook ? 0 : o.rot || 0);
    // Aan de haak of rechtop op het eiland: de zwaaiende ridder. In de lucht: de salto.
    const art = tinted(o.hook || o.ground ? 'zwaai' : 'vlieg', o.color);
    if (art) {
      const hh = S * (o.hook ? 3.2 : 2.5), ww = hh * art.width / art.height;
      ctx.drawImage(art, -ww / 2, -hh / 2, ww, hh);
    } else {
      const spr = drawnKnight(o.color, !o.hook && !o.ground);
      const k = S / PX;
      ctx.drawImage(spr, -spr.width * k / 2, -spr.height * k / 2, spr.width * k, spr.height * k);
    }
    ctx.restore();
    if (o.name) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (o.alpha ?? 1) + .3);
      ctx.font = `800 ${Math.max(11, Math.round(S * .36))}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(5,6,15,.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(o.name, sx, sy - S * 1.45);
      ctx.fillText(o.name, sx, sy - S * 1.45);
      ctx.restore();
    }
  }

  // ---------- Alles samen ----------
  // v: { seed, t, cx, cy (camera, meter), S (pixels per meter), me, ghosts, hide (Set met kristal-ids), passed, aim (anker-id), gold }
  function render(ctx, w, h, v) {
    const S = Math.round(v.S * 4) / 4;
    const left = v.cx - w / 2 / S, right = v.cx + w / 2 / S;
    const X = x => Math.round((x - v.cx) * S + w / 2);
    const Y = y => Math.round((y - v.cy) * S + h / 2);
    const kc = Math.max(0, Math.floor(v.cx / W.L));
    const theme = W.themeOf(kc);
    const bg = painted(h);
    if (bg) {
      const off = -((v.cx * S * .12) % bg.width + bg.width) % bg.width;
      for (let x = off; x < w; x += bg.width) {
        for (const ch of bg.chunks) {
          const dx = Math.round(x + ch.x0 * bg.k), dw = Math.ceil(ch.c.width * bg.k);
          if (dx + dw <= 0 || dx >= w) continue;
          if (bg.k === 1) ctx.drawImage(ch.c, dx, 0);
          else ctx.drawImage(ch.c, dx, 0, dw + 1, h);
        }
      }
    } else {
      ctx.drawImage(sky(theme, w, h), 0, 0);
      const nextTheme = W.themeOf(kc + 1);
      if (nextTheme !== theme) {
        const fade = Math.max(0, Math.min(1, (v.cx - (kc + 1) * W.L + 16) / 16));
        if (fade > 0) { ctx.globalAlpha = fade; ctx.drawImage(sky(nextTheme, w, h), 0, 0); ctx.globalAlpha = 1; }
      }
      const img = layer(theme, h);
      const off = -((v.cx * S * .3) % img.width + img.width) % img.width;
      const dy = Math.round(.2 * (W.H / 2 - v.cy) * S);
      for (let x = off; x < w; x += img.width) ctx.drawImage(img, Math.round(x), dy);
    }
    abyss(ctx, theme, w, h, Y(12.8), v.t);

    const k0 = Math.max(0, Math.floor((left - 8) / W.L)), k1 = Math.floor((right + 8) / W.L);
    for (let k = k0; k <= k1; k++) {
      const st = W.stage(v.seed, k);
      for (const s of st.plats) {
        if (s.x > right + 1 || s.x + s.w < left - 1) continue;
        const spr = platSprite(s, st.theme, S);
        ctx.drawImage(spr, X(s.x) - spr.pad, Y(s.y) - spr.pad * .5);
      }
      if (k > 0 && st.x0 > left - 3 && st.x0 < right + 3) banner(ctx, k, X(st.x0), Y(W.BASE_Y), S, v.t, v.passed >= k);
      for (const s of st.pads) if (s.x < right + 1 && s.x + s.w > left - 1) pad(ctx, s, X(s.x), Y(s.y), S, v.t);
      for (const l of st.lasers) if (l.x > left - 1 && l.x < right + 1) laser(ctx, l, X(l.x), Y(l.y0), Y(l.y1), S, v.t, h);
      for (const c of st.cells) {
        if (c.x < left - 1 || c.x > right + 1 || (v.hide && v.hide.has(c.id))) continue;
        crystal(ctx, X(c.x), Y(c.y), S, v.t);
      }
      for (const a0 of st.anchors) {
        const a = W.at(a0, v.t);
        if (a.x < left - 3 || a.x > right + 3) continue;
        anchor(ctx, a, X(a.x), Y(a.y), S, v.t, v.aim === a0.id, v.gold);
      }
    }
    for (const o of v.ghosts || []) {
      if (o.x < left - 2 || o.x > right + 2) continue;
      knight(ctx, o, X(o.x), Y(o.y), S, v.t);
    }
    if (v.me) knight(ctx, v.me, X(v.me.x), Y(v.me.y), S, v.t);
    Glow.vignette(ctx, w, h, .4);
  }

  // Een klein portret voor de wachtzaal.
  function portrait(canvas, color) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const art = tinted('zwaai', color);
    const spr = art || drawnKnight(color, false);
    const sc = Math.min(canvas.width / spr.width, canvas.height / spr.height);
    g.drawImage(spr, (canvas.width - spr.width * sc) / 2, (canvas.height - spr.height * sc) / 2, spr.width * sc, spr.height * sc);
  }

  return { render, knight, portrait, has: n => Boolean(ART[n]) };
})();
