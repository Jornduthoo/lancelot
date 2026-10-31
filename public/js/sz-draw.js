// Splijtzwaard tekenen: de lucht, de lava, de baan, wat je kan splijten, de gespleten stukken en de zwaarden.
// Alles wat niet beweegt (lucht, verre lagen, elke plank en paal, elk ding, het zwaard zelf) bakken we één keer
// op een eigen canvas; elke frame is dan vooral drawImage. Alleen lava, lasers, zaagbladen en sporen tekenen we live.
// Gebruikt SzWorld en Glow (fx.js).
const SzDraw = (() => {
  const W = SzWorld;
  const { rgba, glow } = Glow;
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

  // ---------- Lucht (per wereld, per schermgrootte) ----------
  const skyCache = new Map();
  function circuits(g, w, h, color, alpha, r) {
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      let x = r() * w, y = r() * h * .7;
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
    const r = W.rng(theme.name.length * 97 + 5);
    if (theme.name === 'Smidse') {
      // Gloed van de grote smeltovens en zwevende vonken.
      for (const [fx, fy, fr] of [[.2, 1.02, .9], [.75, 1.05, .7]]) {
        const gl = g.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, h * fr);
        gl.addColorStop(0, 'rgba(255,120,30,.55)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = gl; g.fillRect(0, 0, w, h);
      }
      for (let i = 0; i < 110; i++) {
        g.fillStyle = `rgba(255,${120 + r() * 110 | 0},40,${.15 + r() * .6})`;
        const s = r() < .2 ? 3 : 2;
        g.fillRect(r() * w, r() * h, s, s);
      }
      circuits(g, w, h, '#ff9a3c', .1, r);
    } else if (theme.name === 'Kristalmijn') {
      const neb = g.createRadialGradient(w * .6, h * .4, 0, w * .6, h * .4, h * .8);
      neb.addColorStop(0, 'rgba(199,125,255,.3)'); neb.addColorStop(.6, 'rgba(94,231,255,.07)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const col = r() < .5 ? '199,125,255' : '94,231,255';
        g.fillStyle = `rgba(${col},${.2 + r() * .7})`;
        g.fillRect(r() * w, r() * h, r() < .1 ? 2 : 1, r() < .1 ? 2 : 1);
      }
      circuits(g, w, h, '#c77dff', .12, r);
    } else {
      for (let i = 0; i < 280; i++) {
        g.fillStyle = `rgba(${200 + r() * 55 | 0},${210 + r() * 45 | 0},255,${.25 + r() * .7})`;
        const s = r() < .08 ? 2 : 1;
        g.fillRect(r() * w, r() * h * .9, s, s);
      }
      const neb = g.createRadialGradient(w * .3, h * .35, 0, w * .3, h * .35, h * .7);
      neb.addColorStop(0, 'rgba(76,201,255,.25)'); neb.addColorStop(.5, 'rgba(199,125,255,.08)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);
      const px = w * .78, py = h * .26, pr = h * .14;
      const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
      pg.addColorStop(0, '#c9f6ff'); pg.addColorStop(.6, '#2e7fa8'); pg.addColorStop(1, '#0b2346');
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(160,240,255,.6)';
      g.lineWidth = Math.max(2, pr * .07);
      g.beginPath(); g.ellipse(px, py, pr * 1.75, pr * .36, -.25, 0, TAU); g.stroke();
      circuits(g, w, h, '#5ee7ff', .16, r);
    }
    skyCache.set(key, c);
    return c;
  }

  // Een strook silhouetten die je herhaalt. depth 0 = ver, 1 = dichterbij.
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
    const col = depth ? theme.mid : theme.far;
    const lit = rgba(theme.glow, .65);
    g.fillStyle = col;
    if (theme.name === 'Smidse') {
      if (depth === 0) {
        // Schoorstenen met rook en grote tandwielen.
        const base = h * .74;
        let x = -10;
        while (x < w) {
          const tw = 30 + r() * 50, th = h * (.15 + r() * .35);
          g.fillStyle = col;
          g.fillRect(x, base - th, tw, th + h);
          if (r() < .5) { g.fillRect(x + tw * .3, base - th * 1.4, tw * .3, th); }
          g.fillStyle = lit;
          for (let i = 0; i < 3; i++) if (r() < .6) g.fillRect(x + tw * (.2 + r() * .6), base - th * (.2 + r() * .6), 3, 5);
          x += tw + r() * 30;
        }
        g.fillStyle = col;
        g.fillRect(0, base, w, h - base);
        for (let i = 0; i < 4; i++) {
          const gx = r() * w, gy = h * (.35 + r() * .2), gr = 30 + r() * 40;
          g.beginPath();
          for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, rr = k % 2 ? gr : gr * 1.18; g.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); }
          g.fill();
          g.globalCompositeOperation = 'destination-out';
          g.beginPath(); g.arc(gx, gy, gr * .35, 0, TAU); g.fill();
          g.globalCompositeOperation = 'source-over';
        }
      } else {
        // Hangende kettingen met ketels en aambeelden op stenen sokkels.
        let x = 60;
        while (x < w - 100) {
          const len = h * (.1 + r() * .3);
          g.fillStyle = col;
          for (let y = 0; y < len; y += 12) g.fillRect(x - 2, y, 4, 9);
          g.beginPath(); g.moveTo(x - 26, len); g.lineTo(x + 26, len); g.lineTo(x + 18, len + 30); g.lineTo(x - 18, len + 30); g.fill();
          g.fillStyle = lit; g.fillRect(x - 16, len + 2, 32, 4);
          g.fillStyle = col;
          const ax = x + 100 + r() * 120, ay = h * (.55 + r() * .15);
          g.fillRect(ax - 22, ay, 44, h);
          g.beginPath(); g.moveTo(ax - 50, ay - 26); g.lineTo(ax + 36, ay - 26); g.lineTo(ax + 60, ay - 16); g.lineTo(ax + 26, ay - 10); g.lineTo(ax + 18, ay); g.lineTo(ax - 18, ay); g.lineTo(ax - 26, ay - 12); g.closePath(); g.fill();
          x = ax + 140 + r() * 160;
        }
      }
    } else if (theme.name === 'Kristalmijn') {
      // Kristalpieken van onder en stalactieten van boven.
      const n = depth ? 14 : 26;
      for (let i = 0; i < n; i++) {
        const x = r() * w, cw = (depth ? 30 : 18) + r() * 40, ch = h * ((depth ? .15 : .1) + r() * .3);
        const base = h * (depth ? .95 : .85);
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x - cw / 2, base); g.lineTo(x - cw * .15, base - ch); g.lineTo(x + cw * .1, base - ch * 1.08); g.lineTo(x + cw / 2, base); g.fill();
        g.fillStyle = rgba(theme.glow, depth ? .35 : .2);
        g.beginPath(); g.moveTo(x - cw * .15, base - ch); g.lineTo(x + cw * .1, base - ch * 1.08); g.lineTo(x, base - ch * .5); g.fill();
        if (r() < .6) {
          const sx = r() * w, sw = 20 + r() * 40, sh = h * (.08 + r() * .2);
          g.fillStyle = col;
          g.beginPath(); g.moveTo(sx - sw / 2, 0); g.lineTo(sx, sh); g.lineTo(sx + sw / 2, 0); g.fill();
          g.fillStyle = rgba('#5ee7ff', .3);
          g.beginPath(); g.arc(sx, sh - 3, 3, 0, TAU); g.fill();
        }
      }
      g.fillStyle = col;
      g.fillRect(0, h * (depth ? .95 : .85), w, h);
    } else {
      // Neontorens van de sterrenburcht en zwevende eilanden.
      if (depth === 0) {
        const base = h * .74;
        let x = -10;
        while (x < w) {
          const tw = 24 + r() * 40, th = h * (.15 + r() * .35);
          g.fillStyle = col;
          g.fillRect(x, base - th, tw, th + h);
          g.beginPath(); g.moveTo(x - 3, base - th); g.lineTo(x + tw / 2, base - th - tw); g.lineTo(x + tw + 3, base - th); g.fill();
          g.fillStyle = lit;
          g.fillRect(x + tw / 2 - 1, base - th + 6, 2, th * .6);
          x += tw + 10 + r() * 30;
        }
        g.fillStyle = col;
        g.fillRect(0, base, w, h - base);
      } else {
        let x = 40;
        while (x < w - 120) {
          const iw = 90 + r() * 130, iy = h * (.25 + r() * .4), ih = iw * (.35 + r() * .2);
          g.fillStyle = col;
          g.beginPath(); g.moveTo(x, iy); g.lineTo(x + iw, iy);
          for (let i = 6; i >= 0; i--) g.lineTo(x + iw * i / 6 + (r() - .5) * 10, iy + ih * Math.sin(Math.PI * i / 6) * (.6 + r() * .5));
          g.closePath(); g.fill();
          g.fillStyle = rgba(theme.glow, .3);
          g.fillRect(x, iy - 2, iw, 3);
          g.fillStyle = col;
          const tx = x + iw * (.3 + r() * .3), tw = 16 + r() * 14, th = 40 + r() * 50;
          g.fillRect(tx, iy - th, tw, th);
          for (let i = 0; i < 3; i++) g.fillRect(tx + i * tw / 2.5, iy - th - 6, tw / 5, 6);
          g.fillStyle = lit;
          g.fillRect(tx + tw / 2 - 1.5, iy - th * .7, 3, 6);
          x += iw + 80 + r() * 160;
        }
      }
    }
    layerCache.set(key, c);
    return c;
  }

  // ---------- Planken, palen en stalen blokken (gebakken per stuk en per zoom) ----------
  const solidCache = new Map();
  let solidS = 0;
  function bakeSolid(s, theme, S) {
    const pad = Math.ceil(S * .3);
    const vis = Math.min(s.h, W.H + 2 - s.y);
    const c = mk(s.w * S + pad * 2, vis * S + pad * 2);
    const g = c.getContext('2d');
    g.translate(pad, pad);
    const r = W.rng(Math.round(s.x * 131 + s.y * 17 + s.w * 7) + 3);
    const w = s.w * S, h = vis * S;
    const lw = Math.max(1.2, S * .05);
    g.lineJoin = 'round';
    if (!s.hout) {
      // Stalen blok: platen met klinknagels en een blauw lichtende naad.
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, shade(theme.steel, .7)); grd.addColorStop(.45, shade(theme.steel, 1.6)); grd.addColorStop(.6, shade(theme.steel, 1.1)); grd.addColorStop(1, shade(theme.steel, .55));
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(0, 0, w, S * .1);
      g.fillStyle = rgba('#5ee7ff', .85);
      for (let y = S * .55; y < h - S * .2; y += S * .7) g.fillRect(S * .12, y, w - S * .24, Math.max(1, S * .04));
      g.fillStyle = '#c9d2ee';
      for (const [px, py] of [[.15, .15], [.85, .15], [.15, .85], [.85, .85]]) { g.beginPath(); g.arc(w * px, Math.min(h * py, h - S * .15), S * .06, 0, TAU); g.fill(); }
      g.strokeStyle = INK; g.lineWidth = lw * 1.3; g.strokeRect(0, 0, w, h);
      // Waarschuwingsstrepen bovenop: hier blijft de punt niet steken.
      g.save();
      g.beginPath(); g.rect(0, 0, w, S * .18); g.clip();
      for (let x = -S; x < w + S; x += S * .36) { g.fillStyle = '#ffc94a'; g.beginPath(); g.moveTo(x, S * .18); g.lineTo(x + S * .18, 0); g.lineTo(x + S * .36, 0); g.lineTo(x + S * .18, S * .18); g.fill(); }
      g.restore();
      g.strokeRect(0, 0, w, S * .18);
      return { c, pad };
    }
    const wood = theme.wood;
    if (s.post) {
      // Een dikke houten paal met ijzeren banden.
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, shade(wood, .55)); grd.addColorStop(.35, shade(wood, 1.25)); grd.addColorStop(.7, shade(wood, .95)); grd.addColorStop(1, shade(wood, .5));
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(30,14,6,.45)';
      g.lineWidth = Math.max(1, S * .025);
      for (let i = 0; i < 4; i++) { const x = w * (.15 + r() * .7); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * S * .3, h * .3, x + (r() - .5) * S * .3, h * .6, x, h); g.stroke(); }
      for (let y = S * .5; y < h; y += S * 2.2) {
        g.fillStyle = '#3a3f58'; g.fillRect(-S * .05, y, w + S * .1, S * .2);
        g.fillStyle = '#ffc94a'; g.fillRect(-S * .05, y, w + S * .1, Math.max(1, S * .04));
        g.fillStyle = '#c9d2ee'; g.beginPath(); g.arc(w / 2, y + S * .1, S * .05, 0, TAU); g.fill();
      }
      // Een gouden kap bovenop
      g.fillStyle = '#ffc94a'; g.fillRect(-S * .06, 0, w + S * .12, S * .12);
      g.strokeStyle = INK; g.lineWidth = lw; g.strokeRect(0, 0, w, h);
      g.strokeRect(-S * .06, 0, w + S * .12, S * .12);
      return { c, pad };
    }
    // Een plank: houtnerf, een lichte bovenkant, ijzeren beslag met gouden randen aan beide kanten.
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, shade(wood, 1.45)); grd.addColorStop(.25, shade(wood, 1.05)); grd.addColorStop(1, shade(wood, .55));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,14,6,.45)';
    g.lineWidth = Math.max(1, S * .025);
    for (let i = 0; i < 3; i++) {
      const y = h * (.3 + i * .22);
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += S * .5) g.lineTo(x, y + Math.sin(x / S * 1.7 + i * 2 + r() * .4) * S * .03);
      g.stroke();
    }
    for (let i = 0; i < Math.round(s.w / 2.5); i++) { // kwasten in het hout
      g.beginPath(); g.ellipse(w * r(), h * (.4 + r() * .3), S * .14, S * .05, 0, 0, TAU); g.stroke();
    }
    // Planken-naden
    g.strokeStyle = 'rgba(20,8,2,.7)';
    for (let x = S * (1.4 + r()); x < w - S * .8; x += S * (1.4 + r() * .8)) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(255,230,180,.25)';
    g.fillRect(0, 0, w, Math.max(1.5, S * .06));
    // Beslag
    for (const bx of [0, w - S * .42]) {
      g.fillStyle = '#3a3f58'; g.fillRect(bx, -S * .03, S * .42, h + S * .06);
      g.fillStyle = '#ffc94a'; g.fillRect(bx, -S * .03, S * .42, Math.max(1, S * .05));
      g.fillStyle = '#c9d2ee';
      g.beginPath(); g.arc(bx + S * .21, h * .5, S * .06, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = lw * .8; g.strokeRect(bx, -S * .03, S * .42, h + S * .06);
    }
    g.strokeStyle = INK; g.lineWidth = lw; g.strokeRect(0, 0, w, h);
    return { c, pad };
  }
  function solid(ctx, s, sx, sy, S, theme) {
    if (S !== solidS) { solidCache.clear(); solidS = S; }
    let b = solidCache.get(s);
    if (!b) {
      if (solidCache.size > 300) solidCache.clear();
      b = bakeSolid(s, theme, S);
      solidCache.set(s, b);
    }
    ctx.drawImage(b.c, sx - b.pad, sy - b.pad);
  }

  // ---------- De runenpaal (begin van elke etappe) ----------
  function paal(ctx, k, sx, sy, S, t, passed) {
    const col = passed ? '#ffc94a' : '#5ee7ff';
    const pulse = .6 + Math.sin(t * 3 + k) * .2;
    glow(ctx, sx, sy - S * 2, S * 2.4, col, passed ? .35 : .55 * pulse);
    // Steen: een obelisk met lichtende runen
    const w0 = S * .7, w1 = S * .45, top = sy - S * 3.4;
    const grd = ctx.createLinearGradient(sx - w0, 0, sx + w0, 0);
    grd.addColorStop(0, '#20253c'); grd.addColorStop(.45, '#6b7398'); grd.addColorStop(1, '#1a1e32');
    ctx.fillStyle = grd;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, S * .05);
    ctx.beginPath();
    ctx.moveTo(sx - w0, sy); ctx.lineTo(sx - w1, top + S * .4); ctx.lineTo(sx, top); ctx.lineTo(sx + w1, top + S * .4); ctx.lineTo(sx + w0, sy); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.5, S * .06);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = sy - S * (.7 + i * .7);
      const a = (k * 3 + i) % 4;
      ctx.beginPath();
      ctx.moveTo(sx - S * .14, y - S * .2); ctx.lineTo(sx + (a % 2 ? .14 : -.14) * S, y + S * .2);
      if (a > 1) { ctx.moveTo(sx + S * .14, y - S * .2); ctx.lineTo(sx - S * .14, y + S * .05); } else { ctx.moveTo(sx, y - S * .22); ctx.lineTo(sx, y + S * .22); }
      ctx.stroke();
    }
    // Nummer op een gouden schijf bovenaan
    const cy = top - S * .45;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(sx, cy, S * .42, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05); ctx.stroke();
    ctx.fillStyle = '#10142a';
    ctx.font = `900 ${Math.round(S * .45)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(k), sx, cy + S * .03);
  }

  // ---------- De doelschijf op de runenpaal (van boven bekeken, plat op de plank) ----------
  const RING_COL = { 10: '#ffc94a', 5: '#c77dff', 3: '#4ade80', 2: '#4cc9ff' };
  function target(ctx, sx, sy, S, t, passed) {
    const k = passed ? .35 : 1;
    ctx.save();
    ctx.globalAlpha = k;
    const ry = S * .5;
    for (let i = W.RINGS.length - 1; i >= 0; i--) {
      const [r, m] = W.RINGS[i];
      ctx.fillStyle = RING_COL[m];
      ctx.globalAlpha = k * (i % 2 ? .55 : .8);
      ctx.beginPath(); ctx.ellipse(sx, sy, r * S, ry * (r / 2.8 + .3), 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = k;
    if (!passed) {
      glow(ctx, sx, sy - S * .1, S * 1.2, '#ffc94a', .6 + Math.sin(t * 5) * .2);
      // Een gouden pijl die op en neer wipt boven het midden: hier mikken!
      const ay = sy - S * (1.6 + Math.abs(Math.sin(t * 4)) * .5);
      ctx.fillStyle = '#ffc94a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, S * .05);
      ctx.beginPath(); ctx.moveTo(sx, ay + S * .55); ctx.lineTo(sx - S * .35, ay + S * .1); ctx.lineTo(sx - S * .12, ay + S * .1); ctx.lineTo(sx - S * .12, ay - S * .35); ctx.lineTo(sx + S * .12, ay - S * .35); ctx.lineTo(sx + S * .12, ay + S * .1); ctx.lineTo(sx + S * .35, ay + S * .1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Labels boven elke ring
    ctx.font = `900 ${Math.round(S * .36)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = Math.max(2, S * .08);
    ctx.strokeStyle = 'rgba(5,6,15,.85)';
    let prev = 0;
    for (const [r, m] of W.RINGS) {
      const x = sx + ((prev + r) / 2) * S;
      const y = sy - S * (m === 10 ? .62 : .12);
      ctx.strokeText(`×${m}`, m === 10 ? sx : x, y);
      ctx.fillStyle = RING_COL[m];
      ctx.fillText(`×${m}`, m === 10 ? sx : x, y);
      prev = r;
    }
    ctx.restore();
  }

  // ---------- Wat je kan splijten ----------
  const PXT = 96; // pixels per meter in de voorgebakken dingen
  const thingCache = new Map();
  function thingSprite(kind) {
    let c = thingCache.get(kind);
    if (c) return c;
    const R = (kind === 'robot' ? .55 : kind === 'ton' || kind === 'kist' ? .45 : .4) * PXT;
    const size = Math.ceil(R * 3);
    c = mk(size, size);
    const g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    g.lineJoin = 'round';
    const lw = PXT * .035;
    const ink = () => { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
    if (kind === 'kristal') {
      glow(g, 0, 0, R * 1.45, '#c77dff', .55);
      const pts = [[0, -1.15], [.62, -.45], [.55, .55], [0, 1.1], [-.55, .55], [-.62, -.45]].map(([x, y]) => [x * R, y * R]);
      const grd = g.createLinearGradient(-R, -R, R, R);
      grd.addColorStop(0, '#f0d6ff'); grd.addColorStop(.35, '#b46bff'); grd.addColorStop(1, '#4b1d9e');
      g.fillStyle = grd;
      g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.fill(); ink();
      // Facetten
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = lw * .5;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(-R * .15, -R * .1); g.lineTo(pts[3][0], pts[3][1]); g.moveTo(-R * .15, -R * .1); g.lineTo(pts[1][0], pts[1][1]); g.moveTo(-R * .15, -R * .1); g.lineTo(pts[4][0], pts[4][1]); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath(); g.moveTo(-R * .35, -R * .55); g.lineTo(-R * .2, -R * .75); g.lineTo(-R * .12, -R * .4); g.closePath(); g.fill();
    } else if (kind === 'ton') {
      const rw = R * .85, rh = R * 1.05;
      const grd = g.createLinearGradient(-rw, 0, rw, 0);
      grd.addColorStop(0, '#5a3418'); grd.addColorStop(.4, '#c98a4e'); grd.addColorStop(.6, '#a96c38'); grd.addColorStop(1, '#4a2a12');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(-rw * .82, -rh); g.quadraticCurveTo(-rw * 1.12, 0, -rw * .82, rh); g.lineTo(rw * .82, rh); g.quadraticCurveTo(rw * 1.12, 0, rw * .82, -rh); g.closePath(); g.fill(); ink();
      g.strokeStyle = 'rgba(40,18,6,.6)'; g.lineWidth = lw * .5;
      for (const x of [-.45, 0, .45]) { g.beginPath(); g.moveTo(x * rw, -rh); g.quadraticCurveTo(x * rw * 1.2, 0, x * rw, rh); g.stroke(); }
      for (const y of [-.62, .62]) {
        g.fillStyle = '#5d6684';
        g.beginPath(); g.rect(-rw * 1.0, y * rh - R * .1, rw * 2, R * .2); g.fill(); ink();
        g.fillStyle = '#c9d2ee';
        for (const x of [-.6, 0, .6]) { g.beginPath(); g.arc(x * rw, y * rh, R * .045, 0, TAU); g.fill(); }
      }
      g.fillStyle = '#ffc94a';
      g.beginPath(); g.ellipse(0, -rh, rw * .8, R * .14, 0, 0, TAU); g.fill(); ink();
    } else if (kind === 'pompoen') {
      glow(g, 0, R * .1, R * 1.4, '#ff8c42', .35);
      const grd = g.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R * 1.1);
      grd.addColorStop(0, '#ffc06a'); grd.addColorStop(.6, '#ff7a1a'); grd.addColorStop(1, '#a8400a');
      for (const [ox, sx] of [[-.5, .55], [.5, .55], [0, .62]]) {
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(ox * R, R * .08, sx * R, R * .85, 0, 0, TAU); g.fill(); ink();
      }
      g.fillStyle = '#3d7a2a';
      g.beginPath(); g.moveTo(-R * .08, -R * .72); g.lineTo(R * .02, -R * 1.12); g.lineTo(R * .2, -R * 1.05); g.lineTo(R * .1, -R * .7); g.closePath(); g.fill(); ink();
      // Lachend gezicht dat van binnen gloeit
      g.fillStyle = '#ffe28a';
      g.beginPath(); g.moveTo(-R * .45, -R * .1); g.lineTo(-R * .2, -R * .1); g.lineTo(-R * .32, -R * .35); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(R * .45, -R * .1); g.lineTo(R * .2, -R * .1); g.lineTo(R * .32, -R * .35); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-R * .5, R * .2); g.quadraticCurveTo(0, R * .75, R * .5, R * .2); g.lineTo(R * .3, R * .3); g.lineTo(R * .18, R * .2); g.lineTo(R * .05, R * .34); g.lineTo(-R * .1, R * .22); g.lineTo(-R * .25, R * .34); g.closePath(); g.fill();
    } else if (kind === 'kist') {
      // Schatkist: houten kist met gouden beslag, een slot en gouden gloed van binnen.
      glow(g, 0, 0, R * 1.6, '#ffc94a', .6);
      const w = R * 1.1, h = R * .8;
      const grd = g.createLinearGradient(0, -h, 0, h);
      grd.addColorStop(0, '#c98a4e'); grd.addColorStop(1, '#5a3418');
      g.fillStyle = grd;
      g.beginPath(); g.rect(-w, -h * .15, w * 2, h * 1.05); g.fill(); ink();
      g.beginPath(); g.moveTo(-w, -h * .15); g.quadraticCurveTo(-w, -h * 1.05, 0, -h * 1.05); g.quadraticCurveTo(w, -h * 1.05, w, -h * .15); g.closePath(); g.fill(); ink();
      g.fillStyle = '#ffc94a';
      for (const x of [-w * .7, w * .55]) { g.beginPath(); g.rect(x, -h * 1.0, w * .15, h * 1.9); g.fill(); ink(); }
      g.beginPath(); g.rect(-w, -h * .22, w * 2, h * .16); g.fill(); ink();
      g.fillStyle = '#fff1b8';
      g.beginPath(); g.rect(-w * .16, -h * .28, w * .32, h * .4); g.fill(); ink();
      g.fillStyle = INK; g.fillRect(-w * .04, -h * .15, w * .08, h * .15);
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.beginPath(); g.moveTo(-w * .5, -h * .8); g.lineTo(-w * .35, -h * .95); g.lineTo(-w * .3, -h * .7); g.closePath(); g.fill();
    } else {
      // Robotridder: een stalen bolletje met helmkam, rood vizier en antennes.
      glow(g, 0, 0, R * 1.3, '#ff4d6d', .25);
      const grd = g.createLinearGradient(-R, 0, R, 0);
      grd.addColorStop(0, '#2a2f45'); grd.addColorStop(.45, '#a3adcf'); grd.addColorStop(1, '#2a2f45');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(-R * .7, R * 1); g.lineTo(-R * .78, -R * .1); g.quadraticCurveTo(0, -R * 1.15, R * .78, -R * .1); g.lineTo(R * .7, R * 1); g.closePath(); g.fill(); ink();
      g.fillStyle = '#ff4d6d';
      g.beginPath(); g.moveTo(-R * .2, -R * .9); g.lineTo(0, -R * 1.35); g.lineTo(R * .2, -R * .9); g.closePath(); g.fill(); ink();
      g.fillStyle = INK; g.fillRect(-R * .55, -R * .25, R * 1.1, R * .26);
      g.fillStyle = '#ff4d6d'; g.fillRect(-R * .48, -R * .2, R * .96, R * .12);
      g.fillStyle = '#ffd0d8'; g.fillRect(-R * .1, -R * .19, R * .25, R * .05);
      g.fillStyle = '#ffc94a'; g.fillRect(-R * .72, R * .25, R * 1.44, R * .12);
      g.fillStyle = '#5ee7ff'; g.beginPath(); g.arc(0, R * .62, R * .13, 0, TAU); g.fill(); ink();
    }
    thingCache.set(kind, c);
    return c;
  }
  function thing(ctx, th, sx, sy, S, t) {
    const spr = thingSprite(th.kind);
    const k = S / PXT;
    const wob = th.kind === 'robot' ? 0 : Math.sin(t * 2.4 + th.x) * .08;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(wob);
    ctx.drawImage(spr, -spr.width * k / 2, -spr.height * k / 2, spr.width * k, spr.height * k);
    ctx.restore();
  }

  const CUT = { kristal: '#f0d6ff', ton: '#e7c08a', pompoen: '#ffd27a', robot: '#ff8c42', kist: '#ffe58a' };
  // Gespleten stukken: elk stuk is de helft van het beeld, afgesneden langs de snijlijn.
  // piece: { kind, x, y, vx, vy, rot, vr, cut (hoek van de snede), side (1 of -1), life }
  function pieces(ctx, list, X, Y, S) {
    for (const p of list) {
      const spr = thingSprite(p.kind);
      const k = S / PXT;
      const w = spr.width * k, h = spr.height * k;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.translate(X(p.x), Y(p.y));
      ctx.rotate(p.rot);
      ctx.save();
      ctx.rotate(p.cut);
      ctx.beginPath();
      if (p.side > 0) ctx.rect(-w, 0, w * 2, h); else ctx.rect(-w, -h, w * 2, h);
      ctx.rotate(-p.cut);
      ctx.clip();
      ctx.drawImage(spr, -w / 2, -h / 2, w, h);
      ctx.restore();
      // Een gloeiende snijrand
      ctx.rotate(p.cut);
      ctx.globalCompositeOperation = 'lighter';
      // Het snijvlak in de kleur van wat je spleet, met een lichtende rand.
      ctx.fillStyle = CUT[p.kind] || '#fff';
      ctx.fillRect(-w * .32, -S * .05, w * .64, S * .1);
      ctx.fillStyle = p.gold ? 'rgba(255,220,120,.9)' : 'rgba(150,240,255,.85)';
      ctx.fillRect(-w * .35, -S * .02, w * .7, S * .04);
      ctx.restore();
    }
  }

  // ---------- Gevaar ----------
  const sawCache = new Map();
  function sawSprite(r) {
    let c = sawCache.get(r);
    if (c) return c;
    const R = r * PXT;
    const size = Math.ceil(R * 2.4);
    c = mk(size, size);
    const g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    glow(g, 0, 0, R * 1.2, '#ff4d6d', .45);
    g.beginPath();
    const n = 16;
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU;
      const rr = i % 2 ? R * .82 : R;
      g.lineTo(Math.cos(a + (i % 2 ? .08 : 0)) * rr, Math.sin(a + (i % 2 ? .08 : 0)) * rr);
    }
    g.closePath();
    const grd = g.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
    grd.addColorStop(0, '#f2f5ff'); grd.addColorStop(.6, '#8d97b8'); grd.addColorStop(1, '#3b3f5c');
    g.fillStyle = grd; g.fill();
    g.lineWidth = PXT * .035; g.strokeStyle = INK; g.stroke();
    g.strokeStyle = 'rgba(5,6,15,.5)'; g.lineWidth = PXT * .02;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * R * .3, Math.sin(a) * R * .3); g.lineTo(Math.cos(a + .5) * R * .75, Math.sin(a + .5) * R * .75); g.stroke(); }
    g.fillStyle = '#ff4d6d';
    g.beginPath(); g.arc(0, 0, R * .26, 0, TAU); g.fill(); g.lineWidth = PXT * .03; g.strokeStyle = INK; g.stroke();
    g.fillStyle = '#ffd0d8';
    g.beginPath(); g.arc(-R * .06, -R * .06, R * .09, 0, TAU); g.fill();
    sawCache.set(r, c);
    return c;
  }
  function saw(ctx, s, X, Y, S, t) {
    const y = W.bob(s, t);
    // De rail waarop het zaagblad op en neer gaat
    ctx.strokeStyle = 'rgba(160,170,210,.35)';
    ctx.lineWidth = Math.max(2, S * .08);
    ctx.beginPath(); ctx.moveTo(X(s.x), Y(s.y - s.ay - s.r)); ctx.lineTo(X(s.x), Y(s.y + s.ay + s.r)); ctx.stroke();
    for (const e of [-1, 1]) { ctx.fillStyle = '#3a3f58'; ctx.fillRect(X(s.x) - S * .18, Y(s.y + e * (s.ay + s.r)) - S * .08, S * .36, S * .16); }
    const spr = sawSprite(s.r);
    const k = S / PXT;
    ctx.save();
    ctx.translate(X(s.x), Y(y));
    ctx.rotate(t * 9);
    ctx.drawImage(spr, -spr.width * k / 2, -spr.height * k / 2, spr.width * k, spr.height * k);
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
      glow(ctx, sx, sy1 - S * .1, S * .8, '#ff4d6d', .8);
    } else if (soon && Math.floor(t * 14) % 2) {
      ctx.fillStyle = 'rgba(255,201,74,.6)';
      ctx.fillRect(sx - 1, sy0, 2, sy1 - sy0);
    }
    const lit = on ? '#ff4d6d' : soon ? '#ffc94a' : '#5a1a28';
    ctx.fillStyle = '#2b3150';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.rect(sx - S * .32, sy1 - S * .3, S * .64, S * .3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit;
    ctx.fillRect(sx - S * .16, sy1 - S * .36, S * .32, S * .1);
  }

  // ---------- Het zwaard ----------
  // Gebakken met de punt naar rechts: knop (edelsteen in de kleur van de speler), greep, gouden kruisplaat, kling.
  const PXS = 128;
  const swordCache = new Map();
  function swordSprite(color, gold, rust, tier = 0) {
    const T = W.TIERS[tier] || W.TIERS[0];
    const key = `${color}:${gold ? 1 : 0}:${rust ? 1 : 0}:${tier}`;
    let c = swordCache.get(key);
    if (c) return c;
    const u = PXS;
    const pad = u * .25;
    const len = W.POMMEL + W.TIP;
    c = mk(len * u + pad * 2, u * .7 + pad * 2);
    c.ox = pad + W.POMMEL * u; // waar het midden (draaipunt) zit
    c.oy = c.height / 2;
    const g = c.getContext('2d');
    g.translate(c.ox, c.oy);
    g.lineJoin = 'round';
    const lw = u * .03;
    const ink = () => { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
    const tip = W.TIP * u, guard = W.GUARD * u, pom = -W.POMMEL * u;
    const bw = u * .085; // halve breedte van de kling
    // Gloed rond de kling
    const gc = gold ? '#ffd76a' : rust ? '#ff8c42' : T.glow;
    for (let i = 0; i < 5; i++) glow(g, guard + (tip - guard) * (i + .5) / 5, 0, u * .32, gc, .4);
    // Kling
    const bg = g.createLinearGradient(0, -bw, 0, bw);
    if (rust) { bg.addColorStop(0, '#d9a27a'); bg.addColorStop(.45, '#9a5a32'); bg.addColorStop(.55, '#b97a4a'); bg.addColorStop(1, '#4a2410'); }
    else if (gold) { bg.addColorStop(0, '#fff6c8'); bg.addColorStop(.45, '#ffd24a'); bg.addColorStop(.55, '#ffe58a'); bg.addColorStop(1, '#b07a12'); }
    else { bg.addColorStop(0, T.blade[0]); bg.addColorStop(.45, T.blade[1]); bg.addColorStop(.55, T.blade[2]); bg.addColorStop(1, T.blade[3]); }
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(guard, -bw); g.lineTo(tip - u * .2, -bw * .85); g.lineTo(tip, 0); g.lineTo(tip - u * .2, bw * .85); g.lineTo(guard, bw); g.closePath(); g.fill(); ink();
    // Middengroef en lichtende rand
    g.strokeStyle = gold ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.8)';
    g.lineWidth = u * .016;
    g.beginPath(); g.moveTo(guard + u * .05, 0); g.lineTo(tip - u * .25, 0); g.stroke();
    g.strokeStyle = gold ? 'rgba(255,240,180,.9)' : 'rgba(170,250,255,.9)';
    g.beginPath(); g.moveTo(guard + u * .04, -bw + u * .015); g.lineTo(tip - u * .2, -bw * .85 + u * .015); g.lineTo(tip - u * .03, 0); g.stroke();
    // Greep in de kleur van de speler, met gouden wikkels
    g.fillStyle = color;
    g.beginPath(); g.rect(pom + u * .1, -u * .05, -pom - u * .08, u * .1); g.fill(); ink();
    g.strokeStyle = 'rgba(255,201,74,.85)'; g.lineWidth = u * .015;
    for (let x = pom + u * .16; x < -u * .02; x += u * .07) { g.beginPath(); g.moveTo(x, -u * .05); g.lineTo(x + u * .04, u * .05); g.stroke(); }
    // Kruisplaat
    const gg = g.createLinearGradient(0, -u * .3, 0, u * .3);
    gg.addColorStop(0, '#fff1b8'); gg.addColorStop(.5, '#ffc94a'); gg.addColorStop(1, '#a87412');
    g.fillStyle = gg;
    g.beginPath();
    g.moveTo(-u * .02, -u * .28); g.lineTo(u * .1, -u * .3); g.lineTo(guard + u * .02, -u * .12); g.lineTo(guard + u * .02, u * .12); g.lineTo(u * .1, u * .3); g.lineTo(-u * .02, u * .28); g.lineTo(u * .03, u * .1); g.lineTo(u * .03, -u * .1); g.closePath();
    g.fill(); ink();
    g.fillStyle = '#5ee7ff';
    g.beginPath(); g.moveTo(u * .07, -u * .07); g.lineTo(u * .12, 0); g.lineTo(u * .07, u * .07); g.lineTo(u * .02, 0); g.closePath(); g.fill(); ink();
    // Knop met edelsteen
    g.fillStyle = '#ffc94a';
    g.beginPath(); g.arc(pom + u * .06, 0, u * .1, 0, TAU); g.fill(); ink();
    g.fillStyle = color;
    g.beginPath(); g.arc(pom + u * .06, 0, u * .055, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)';
    g.beginPath(); g.arc(pom + u * .045, -u * .02, u * .02, 0, TAU); g.fill();
    swordCache.set(key, c);
    return c;
  }

  // o: { x, y, a, color, gold, rust, alpha, name, blink }
  function sword(ctx, o, sx, sy, S, t) {
    const spr = swordSprite(o.color, o.gold, o.rust && !o.gold, o.tier || 0);
    const k = S / PXS * 1.08;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blink && Math.floor(t * 12) % 2) ctx.globalAlpha *= .35;
    if (o.gold) glow(ctx, sx, sy, S * 1.6, '#ffc94a', .35 + Math.sin(t * 9) * .08);
    ctx.translate(sx, sy);
    ctx.rotate(o.a);
    ctx.drawImage(spr, -spr.ox * k, -spr.oy * k, spr.width * k, spr.height * k);
    ctx.restore();
    if (o.name) {
      ctx.font = `800 ${Math.max(11, Math.round(S * .34))}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const tw = ctx.measureText(o.name).width;
      const ty = sy - S * 1.15;
      ctx.globalAlpha = Math.min(1, (o.alpha ?? 1) * 1.6);
      ctx.fillStyle = 'rgba(5,8,20,.7)';
      ctx.fillRect(sx - tw / 2 - 5, ty - S * .42, tw + 10, S * .46);
      ctx.fillStyle = o.color;
      ctx.fillRect(sx - tw / 2 - 5, ty + S * .02, tw + 10, 2);
      ctx.fillStyle = '#f2f5ff';
      ctx.fillText(o.name, sx, ty);
      ctx.globalAlpha = 1;
    }
  }

  // Het lichtspoor van de kling: een lint van de kruisplaat tot de punt over de laatste beelden.
  // trail: [{gx, gy, tx, ty, t}] in meter.
  function swing(ctx, trail, X, Y, now, gold) {
    if (!trail || trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const col = gold ? '255,210,100' : '110,230,255';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const age = (now - b.t) / .18;
      if (age > 1) continue;
      const k = (i / trail.length) * (1 - age);
      ctx.fillStyle = `rgba(${col},${k * .45})`;
      ctx.beginPath();
      ctx.moveTo(X(a.gx), Y(a.gy)); ctx.lineTo(X(a.tx), Y(a.ty)); ctx.lineTo(X(b.tx), Y(b.ty)); ctx.lineTo(X(b.gx), Y(b.gy));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
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
    const span = w / S;
    for (let i = 0; i < 12; i++) {
      const wx = Math.floor(camX - span / 2) + ((i * 7.31 + Math.floor(camX / 40) * 3) % (span + 2));
      const ph = (t * (.4 + (i % 5) * .13) + i * .37) % 1;
      const x = (wx - camX) * S + w / 2;
      if (i % 2) {
        ctx.fillStyle = rgba(theme.lavaHi, .8);
        ctx.beginPath(); ctx.arc(x, sy0 + S * .2, S * .14 * Math.sin(ph * Math.PI), 0, TAU); ctx.fill();
      } else glow(ctx, x + Math.sin(ph * 6 + i) * S * .3, sy0 - ph * S * 3, S * .25 * (1 - ph), theme.lavaHi, 1 - ph);
    }
    glow(ctx, w / 2, sy0, w * .65, theme.lava, .4, .14);
  }

  // ---------- Alles samen ----------
  // v: { seed, t, cx, cy, S, me, ghosts, hide (Set ids), passed, pieces, trail, now }
  function render(ctx, w, h, v) {
    const S = Math.round(v.S * 4) / 4;
    const left = v.cx - w / 2 / S, right = v.cx + w / 2 / S;
    const X = x => Math.round((x - v.cx) * S + w / 2);
    const Y = y => Math.round((y - v.cy) * S + h / 2);
    const kc = Math.max(0, Math.floor(v.cx / W.L));
    const theme = W.themeOf(kc);
    ctx.drawImage(sky(theme, w, h), 0, 0);
    const nextTheme = W.themeOf(kc + 1);
    let fade = 0;
    if (nextTheme !== theme) {
      fade = Math.max(0, Math.min(1, (v.cx - (kc + 1) * W.L + 12) / 12));
      if (fade > 0) { ctx.globalAlpha = fade; ctx.drawImage(sky(nextTheme, w, h), 0, 0); ctx.globalAlpha = 1; }
    }
    const th = fade > .5 ? nextTheme : theme;
    for (const depth of [0, 1]) {
      const img = layer(th, h, depth);
      const par = depth ? .35 : .12;
      const off = -((v.cx * S * par) % img.width + img.width) % img.width;
      const dy = Math.round((depth ? .25 : .1) * (W.H / 2 - v.cy) * S);
      for (let x = off; x < w; x += img.width) ctx.drawImage(img, Math.round(x), dy);
    }

    const k0 = Math.max(0, Math.floor((left - 6) / W.L)), k1 = Math.floor((right + 6) / W.L);
    for (let k = k0; k <= k1; k++) {
      const st = W.stage(v.seed, k);
      if (k > 0 && st.x0 > left - 3 && st.x0 < right + 3) paal(ctx, k, X(st.x0 - 3.2), Y(W.BASE_Y), S, v.t, v.passed >= k);
      for (const s of st.saws) if (Math.abs(s.x - v.cx) < (right - left) / 2 + 2) saw(ctx, s, X, Y, S, v.t);
      for (const s of st.solids) {
        if (s.x > right + 1 || s.x + s.w < left - 1) continue;
        solid(ctx, s, X(s.x), Y(s.y), S, st.theme);
        if (s.paal && k > 0) target(ctx, X(W.targetX(k)), Y(s.y), S, v.t, v.passed >= k);
      }
      for (const l of st.lasers) if (Math.abs(l.x - v.cx) < (right - left) / 2 + 1) laser(ctx, l, X(l.x), Y(l.y0), Y(l.y1), S, v.t);
      for (const o of st.things) {
        if (o.x < left - 1 || o.x > right + 1 || (v.hide && v.hide.has(o.id))) continue;
        thing(ctx, o, X(o.x), Y(W.bob(o, v.t)), S, v.t);
      }
    }
    if (v.pieces) pieces(ctx, v.pieces, X, Y, S);
    for (const o of v.ghosts || []) {
      if (o.x < left - 2 || o.x > right + 2) continue;
      sword(ctx, o, X(o.x), Y(o.y), S, v.t);
    }
    if (v.me) {
      swing(ctx, v.trail, X, Y, v.now, v.me.gold);
      sword(ctx, v.me, X(v.me.x), Y(v.me.y), S, v.t);
    }
    lava(ctx, th, w, h, v.cx, S, Y(W.LAVA), v.t);
    Glow.vignette(ctx, w, h, .45);
  }

  return { render, sword, swordSprite, thingSprite };
})();
