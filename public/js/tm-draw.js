// Tuimelridder tekenen: de lucht, de baan, de valstrikken, de rijmachines en de ridder (ook als ledenpop na een val).
// Geschilderde beelden staan in /img/tuimelridder/. Is een beeld er (nog) niet, dan tekenen we een eenvoudige vorm.
// De lucht en het stenen patroon bakken we één keer; de grond is per etappe één pad. Gebruikt TmWorld en Glow (fx.js).
const TmDraw = (() => {
  const W = TmWorld;
  const { rgba, glow } = Glow;
  const TAU = Math.PI * 2;
  const INK = '#05060f';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(hex, f) { const [r, g, b] = hexRgb(hex); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(r)},${c(g)},${c(b)})`; }

  // ---------- Geschilderde beelden ----------
  // Een beeld laadt pas als we het nodig hebben. Ontbreekt het, dan geeft img() null en tekenen we de vorm.
  // Alleen de beelden die al bestaan (zo vraagt de browser niet naar beelden die er nog niet zijn).
  const HAS = new Set([]);
  const imgs = new Map();
  function img(name) {
    if (!HAS.has(name)) return null;
    let o = imgs.get(name);
    if (!o) {
      o = { el: new Image(), ok: false };
      o.el.onload = () => { o.ok = o.el.naturalWidth > 0; };
      o.el.src = `/img/tuimelridder/${name}.webp`;
      imgs.set(name, o);
    }
    return o.ok ? o.el : null;
  }

  // ---------- Lucht ----------
  const skyCache = new Map();
  function sky(theme, w, h) {
    const key = `${theme.id}:${w}x${h}`;
    let c = skyCache.get(key);
    if (c) return c;
    if (skyCache.size > 6) skyCache.clear();
    c = mk(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky[0]); grad.addColorStop(.62, theme.sky[1]); grad.addColorStop(1, theme.sky[2]);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const r = W.rng(theme.id.length * 131);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${r() * .5})`; g.fillRect(r() * w, r() * h * .6, 1.5, 1.5); }
    skyCache.set(key, c);
    return c;
  }
  // Achtergrond: het geschilderde beeld (breed, schuift traag mee), anders verre silhouetten.
  const layerCache = new Map();
  function layer(theme, h) {
    const key = `${theme.id}:${h}`;
    let c = layerCache.get(key);
    if (c) return c;
    if (layerCache.size > 6) layerCache.clear();
    const w = 1400;
    c = mk(w, h * 1.4);
    const g = c.getContext('2d');
    const r = W.rng(theme.id.length * 17 + 3);
    const base = h * .74;
    g.fillStyle = theme.far;
    let x = -20;
    while (x < w + 20) {
      const tw = 30 + r() * 60, th = h * (.12 + r() * .28);
      if (theme.id === 'ijs' || theme.id === 'lava') { g.beginPath(); g.moveTo(x, base); g.lineTo(x + tw * .5, base - th * 1.4); g.lineTo(x + tw, base); g.fill(); }
      else if (theme.id === 'wolken') { g.beginPath(); g.ellipse(x + tw / 2, base - th * .3, tw * .8, th * .35, 0, 0, TAU); g.fill(); }
      else {
        g.fillRect(x, base - th, tw, th);
        const n = Math.max(2, Math.round(tw / 9));
        for (let i = 0; i < n; i += 2) g.fillRect(x + i * tw / n, base - th - 6, tw / n, 6);
        g.fillStyle = rgba(theme.glow, .55);
        for (let i = 0; i < 3; i++) if (r() < .6) g.fillRect(x + tw * (.2 + r() * .6), base - th * (.25 + r() * .6), 2, 4);
        g.fillStyle = theme.far;
      }
      x += tw + r() * 20;
    }
    g.fillRect(0, base, w, c.height - base);
    layerCache.set(key, c);
    return c;
  }

  // ---------- De grond ----------
  const patCache = new Map();
  const PAT_TOP = W.BASE - 9;
  function stonePattern(ctx, theme) {
    const tex = img('grond');
    const key = theme.id + (tex ? ':tex' : '');
    let p = patCache.get(key);
    if (p) return p;
    const hM = W.BOTTOM - PAT_TOP;
    const c = mk(128, hM * 64);
    const g = c.getContext('2d');
    g.fillStyle = theme.earth; g.fillRect(0, 0, 128, c.height);
    if (tex) {
      // Jorns stenen textuur, getint naar de kleur van de wereld.
      for (let y = 0; y < c.height; y += 128) g.drawImage(tex, 0, y, 128, 128);
      g.globalCompositeOperation = 'color';
      g.fillStyle = theme.stone; g.fillRect(0, 0, 128, c.height);
      g.globalCompositeOperation = 'source-over';
    } else {
      const r = W.rng(theme.id.length * 7);
      for (let row = 0; row < hM * 2; row++) {
        for (let i = -1; i < 3; i++) {
          const x = i * 52 + (row % 2 ? 26 : 0) + r() * 4, y = row * 32;
          const f = .85 + r() * .35;
          const grd = g.createLinearGradient(0, y, 0, y + 32);
          grd.addColorStop(0, shade(theme.stone, f * 1.2)); grd.addColorStop(1, shade(theme.stone, f * .75));
          g.fillStyle = grd;
          g.fillRect(x + 2, y + 2, 48, 28);
        }
      }
    }
    const y0 = (W.BASE - 2.5 - PAT_TOP) * 64, y1 = (W.BASE + 6 - PAT_TOP) * 64;
    const dark = g.createLinearGradient(0, y0, 0, y1);
    dark.addColorStop(0, 'rgba(5,6,16,0)'); dark.addColorStop(.3, 'rgba(5,6,16,.25)'); dark.addColorStop(1, 'rgba(5,6,16,.92)');
    g.fillStyle = dark; g.fillRect(0, y0, 128, c.height - y0);
    p = ctx.createPattern(c, 'repeat');
    if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().translate(0, PAT_TOP).scale(1 / 64));
    patCache.set(key, p);
    return p;
  }
  const pathCache = new Map();
  function paths(st) {
    let p = pathCache.get(st);
    if (p) return p;
    const fill = new Path2D(), top = new Path2D();
    for (const g of st.grounds) {
      fill.moveTo(g[0][0], W.BOTTOM);
      for (const [x, y] of g) fill.lineTo(x, Math.min(y, W.BOTTOM));
      fill.lineTo(g[g.length - 1][0], W.BOTTOM);
      fill.closePath();
      let open = false;
      for (const [x, y] of g) {
        if (y > W.VOID) { open = false; continue; }
        if (!open) { top.moveTo(x, y); open = true; } else top.lineTo(x, y);
      }
    }
    p = { fill, top };
    pathCache.set(st, p);
    if (pathCache.size > 30) pathCache.delete(pathCache.keys().next().value);
    return p;
  }
  function pit(ctx, theme, w, h, cx, S, sy, t) {
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
  }

  // ---------- Valstrikken ----------
  // Een beeld tekenen met het midden op (x, y), breedte bw pixels, gedraaid over a.
  function sprite(ctx, im, x, y, bw, a = 0, ox = .5, oy = .5) {
    const bh = bw * im.naturalHeight / im.naturalWidth;
    ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a);
    ctx.drawImage(im, -bw * ox, -bh * oy, bw, bh);
    ctx.restore();
  }
  function hammer(ctx, hm, t, X, Y, S) {
    const [ex, ey] = W.hammerHead(hm, t);
    const px = X(hm.x), py = Y(hm.y), cx = X(ex), cy = Y(ey);
    ctx.strokeStyle = '#7f88a8'; ctx.lineWidth = Math.max(2, S * .1);
    ctx.setLineDash([S * .16, S * .07]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.setLineDash([]);
    const im = img('hamer');
    const a = -W.hammerAngle(hm, t);
    if (im) sprite(ctx, im, cx, cy, hm.R * S * 3.2, a);
    else {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      const R = hm.R * S;
      ctx.fillStyle = '#4a5170'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      ctx.beginPath(); ctx.rect(-R * 1.5, -R * .8, R * 3, R * 1.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc94a';
      ctx.fillRect(-R * 1.5, -R * .8, R * .35, R * 1.6); ctx.fillRect(R * 1.15, -R * .8, R * .35, R * 1.6);
      ctx.restore();
    }
    ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.beginPath(); ctx.arc(px, py, S * .16, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function gallows(ctx, d, theme, X, Y, S) {
    const x = X(d.x), y = Y(d.y), top = Y(d.top);
    ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .045);
    for (const ox of [-5.2, 5.2]) { ctx.beginPath(); ctx.rect(x + ox * S - S * .18, top - S * .2, S * .36, y - top + S * .2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.rect(x - S * 5.4, top - S * .4, S * 10.8, S * .4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.top; ctx.fillRect(x - S * 5.4, top - S * .4, S * 10.8, S * .08);
  }
  function laser(ctx, l, t, X, Y, S) {
    const st = W.laserState(l, t);
    const x = X(l.x), y = Y(l.y), top = Y(l.top);
    const im = img('laserpaal');
    // Bovenaan de zender op een paal achter de baan, onderaan een plaat in de grond.
    if (im) sprite(ctx, im, x, top + S * .2, S * 1.1, Math.PI, .5, .15);
    else {
      ctx.fillStyle = '#3b3f5c'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      ctx.beginPath(); ctx.rect(x - S * .45, top - S * .5, S * .9, S * .7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x - S * .2, top + S * .05, S * .4, S * .12);
    }
    ctx.fillStyle = '#3b3f5c'; ctx.fillRect(x - S * .5, y - S * .08, S, S * .12);
    if (st.on) {
      glow(ctx, x, (y + top) / 2, S * 1.4, '#ff4d6d', .35);
      ctx.fillStyle = 'rgba(255,77,109,.85)'; ctx.fillRect(x - S * .1, top + S * .15, S * .2, y - top - S * .15);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - S * .03, top + S * .15, S * .06, y - top - S * .15);
    } else if (st.warn && Math.floor(t * 10) % 2) {
      ctx.fillStyle = 'rgba(255,77,109,.3)'; ctx.fillRect(x - S * .05, top + S * .15, S * .1, y - top - S * .15);
    }
  }
  function cannon(ctx, c, t, X, Y, S) {
    const x = X(c.x), y = Y(c.y);
    const im = img('kanon');
    if (im) sprite(ctx, im, x + S * .5, y, S * 1.8);
    else {
      ctx.save(); ctx.translate(x + S * .4, y); ctx.rotate(.55);
      ctx.fillStyle = '#b5743a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      ctx.beginPath(); ctx.rect(-S * 1.1, -S * .28, S * 1.2, S * .56); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.arc(x + S * .5, y + S * .15, S * .3, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (const [bx, by, tau] of W.cannonBalls(c, t)) {
      const px = X(bx), py = Y(by);
      if (tau < .12) glow(ctx, x - S * .3, y - S * .3, S * 1.2, '#ff8c42', .8 - tau * 5);
      glow(ctx, px, py, S * W.BALL_R * 2.2, '#ff6a2a', .4);
      const grd = ctx.createRadialGradient(px - S * .12, py - S * .12, S * .05, px, py, S * W.BALL_R);
      grd.addColorStop(0, '#8a90b0'); grd.addColorStop(1, '#14182a');
      ctx.fillStyle = grd; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
      ctx.beginPath(); ctx.arc(px, py, S * W.BALL_R, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  function spikes(ctx, s, X, Y, S) {
    const im = img('stekels');
    if (im) {
      const n = Math.max(1, Math.round(s.w / 1.4));
      for (let i = 0; i < n; i++) sprite(ctx, im, X(s.x + s.w * (i + .5) / n), Y(s.y) + S * .1, s.w / n * S * 1.15, 0, .5, 1);
      return;
    }
    const n = Math.max(1, Math.round(s.w / .45));
    const step = s.w * S / n, sx = X(s.x), sy = Y(s.y);
    for (let i = 0; i < n; i++) {
      const x = sx + i * step;
      ctx.fillStyle = i % 2 ? '#c77dff' : '#a855f7';
      ctx.beginPath(); ctx.moveTo(x + step * .08, sy); ctx.lineTo(x + step * .5, sy - S * .62); ctx.lineTo(x + step * .92, sy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .035); ctx.stroke();
    }
    glow(ctx, sx + s.w * S / 2, sy - S * .3, s.w * S * .6, '#c77dff', .3);
  }
  function spring(ctx, sp, t, X, Y, S, hot) {
    const x0 = X(sp.x0), x1 = X(sp.x1), y = Y(sp.y);
    const up = hot ? S * .5 : S * .22;
    const im = img('veer');
    if (im) { sprite(ctx, im, (x0 + x1) / 2, y + S * .1, (x1 - x0) * 1.15, 0, .5, 1); return; }
    ctx.strokeStyle = '#d9894a'; ctx.lineWidth = Math.max(2, S * .08);
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + (x1 - x0) * (i % 2 ? .25 : .75), y - up * i / 8);
    ctx.stroke();
    ctx.fillStyle = '#ffc94a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.rect(x0 - S * .1, y - up - S * .18, x1 - x0 + S * .2, S * .18); ctx.fill(); ctx.stroke();
    glow(ctx, (x0 + x1) / 2, y - up, S * .9, '#ffc94a', .35 + Math.sin(t * 6) * .1);
  }
  function plank(ctx, ax, ay, bx, by, S, color) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(by - ay, bx - ax));
    const len = Math.hypot(bx - ax, by - ay), th = S * .3;
    ctx.fillStyle = color; ctx.fillRect(0, 0, len, th);
    ctx.fillStyle = 'rgba(255,220,160,.3)'; ctx.fillRect(0, 0, len, th * .25);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04); ctx.strokeRect(0, 0, len, th);
    ctx.restore();
  }
  function wip(ctx, w, a, theme, X, Y, S) {
    ctx.fillStyle = shade(theme.stone, .9); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
    ctx.beginPath(); ctx.moveTo(X(w.px), Y(w.py + .1)); ctx.lineTo(X(w.px + 1.3), Y(W.PIT + .5)); ctx.lineTo(X(w.px - 1.3), Y(W.PIT + .5)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const [ax, ay, bx, by] = W.wipEnds(w, a);
    plank(ctx, X(ax), Y(ay), X(bx), Y(by), S, '#8a5a30');
    ctx.fillStyle = theme.top;
    ctx.beginPath(); ctx.arc(X(w.px), Y(w.py + .15), S * .22, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function torch(ctx, x, y, S, t, theme) {
    ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
    ctx.beginPath(); ctx.rect(x - S * .08, y - S * 1.8, S * .16, S * 1.8); ctx.fill(); ctx.stroke();
    const fl = .85 + Math.sin(t * 13 + x) * .1;
    glow(ctx, x, y - S * 2.1, S * 1.5 * fl, theme.glow, .6);
    ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.ellipse(x, y - S * 2.05, S * .1, S * .22 * fl, 0, 0, TAU); ctx.fill();
  }
  function flag(ctx, k, sx, sy, S, t, passed) {
    const col = passed ? '#4ade80' : '#ffc94a';
    const im = img('vlag');
    glow(ctx, sx + S * .7, sy - S * 2.8, S * 2.2, col, passed ? .3 : .6);
    if (im) sprite(ctx, im, sx + S * .6, sy, S * 2.4, 0, .3, 1);
    else {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .05);
      ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.rect(sx - S * .1, sy - S * 3.7, S * .2, S * 3.7); ctx.fill(); ctx.stroke();
      const wave = Math.sin(t * 3.5 + k) * S * .12, x0 = sx + S * .1, top = sy - S * 3.6;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x0, top); ctx.quadraticCurveTo(x0 + S * .9, top - wave, x0 + S * 1.8, top + S * .2 + wave);
      ctx.lineTo(x0 + S * 1.5, top + S * .65); ctx.lineTo(x0 + S * 1.8, top + S * 1.1 - wave);
      ctx.quadraticCurveTo(x0 + S * .9, top + S * 1.3 + wave, x0, top + S * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#1a1030'; ctx.font = `900 ${Math.round(S * .5)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!im) ctx.fillText(String(k), sx + S * .85, sy - S * 2.95);
  }
  function finish(ctx, k, sx, sy, S, t, passed) {
    const im = img('finish');
    glow(ctx, sx, sy - S * 3, S * 4, passed ? '#4ade80' : '#ffc94a', .5);
    if (im) { sprite(ctx, im, sx, sy + S * .1, S * 6, 0, .5, 1); return; }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .06);
    ctx.fillStyle = '#c9a54a';
    for (const ox of [-2.6, 2.2]) { ctx.beginPath(); ctx.rect(sx + ox * S, sy - S * 5, S * .4, S * 5); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath(); ctx.rect(sx - S * 2.8, sy - S * 5.6, S * 5.6, S * .8); ctx.fill(); ctx.stroke();
    // Geblokt doek
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#1a1030' : '#f2f5ff';
      ctx.fillRect(sx - S * 2.5 + i * S * .5, sy - S * 4.8 + j * S * .3 + Math.sin(t * 3 + i) * S * .05, S * .5, S * .3);
    }
  }

  // ---------- De rijmachines ----------
  const steel = (g, y0, y1) => { const s = g.createLinearGradient(0, y0, 0, y1); s.addColorStop(0, '#a7b0cc'); s.addColorStop(.5, '#5d6684'); s.addColorStop(1, '#22263a'); return s; };
  // Een wiel (of zweefschijf) op (x, y) lokaal, straal r meter. In lokale assen (1 = 1 meter).
  function wheel(ctx, V, x, y, r, rot, t) {
    const im = img(`${V.id}-wiel`);
    ctx.save(); ctx.translate(x, y);
    if (V.kind === 'zweef') {
      glow(ctx, 0, .1, .9, '#5ee7ff', .6 + Math.sin(t * 9 + x) * .15);
      if (im) { ctx.drawImage(im, -r * 1.4, -r * .7, r * 2.8, r * 1.4); ctx.restore(); return; }
      ctx.fillStyle = '#5ee7ff'; ctx.strokeStyle = INK; ctx.lineWidth = .05;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * .45, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.rotate(rot);
    if (im) { ctx.drawImage(im, -r, -r, r * 2, r * 2); ctx.restore(); return; }
    ctx.fillStyle = '#2a2f45'; ctx.strokeStyle = INK; ctx.lineWidth = .06;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = r * .16;
    ctx.beginPath(); ctx.arc(0, 0, r * .82, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#7f88a8'; ctx.lineWidth = .05;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .75, Math.sin(a) * r * .75); ctx.lineTo(-Math.cos(a) * r * .75, -Math.sin(a) * r * .75); ctx.stroke(); }
    ctx.fillStyle = '#5ee7ff'; ctx.beginPath(); ctx.arc(0, 0, r * .2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // Het lichaam van de rijmachine, in lokale assen.
  // Een geschilderd beeld heeft een vaste plek en grootte per rijmachine (BODY): breedte in meter en het midden.
  const BODY = { troon: [2.6, 0, -.25], een: [1.2, 0, .05], ton: [3.2, 0, -.15], zweef: [2.4, 0, -.15] };
  function body(ctx, V, gas, turbo, t) {
    const im = img(V.id);
    if ((V.rocket || turbo) && gas) {
      const fl = .8 + Math.sin(t * 45) * .2;
      const x0 = V.kind === 'een' ? -.4 : -1.25, y0 = V.kind === 'een' ? -.2 : -.05, len = (1 + .4 * fl) * (turbo ? 1.3 : 1);
      const col = turbo ? '#ff6bd6' : '#5ee7ff';
      glow(ctx, x0 - len * .4, y0, .9, col, .9);
      const fg = ctx.createLinearGradient(x0, 0, x0 - len, 0);
      fg.addColorStop(0, '#fff'); fg.addColorStop(.3, '#c8f1ff'); fg.addColorStop(.7, rgba(col, .7)); fg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(x0, y0 - .16); ctx.quadraticCurveTo(x0 - len * .5, y0 - .22, x0 - len, y0); ctx.quadraticCurveTo(x0 - len * .5, y0 + .22, x0, y0 + .16); ctx.fill();
    }
    if (im) {
      const [bw, bx, by] = BODY[V.id];
      const bh = bw * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, bx - bw / 2, by - bh / 2, bw, bh);
      return;
    }
    ctx.strokeStyle = INK; ctx.lineWidth = .06; ctx.lineJoin = 'round';
    if (V.id === 'troon') {
      ctx.fillStyle = steel(ctx, .1, .45);
      ctx.beginPath(); ctx.rect(-1.05, .1, 2.1, .3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a54a';
      ctx.beginPath(); ctx.rect(-.75, -.2, .95, .3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-.75, .1); ctx.lineTo(-.85, -1.15); ctx.lineTo(-.55, -1.3); ctx.lineTo(-.45, -.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a6ad8'; ctx.fillRect(-.6, -.32, .8, .14);
      ctx.fillStyle = steel(ctx, -.2, .2);
      ctx.beginPath(); ctx.rect(-1.25, -.2, .45, .32); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7f88a8'; ctx.lineWidth = .08;
      ctx.beginPath(); ctx.moveTo(.75, .15); ctx.lineTo(.65, -.6); ctx.stroke();
    } else if (V.id === 'een') {
      ctx.strokeStyle = '#7f88a8'; ctx.lineWidth = .12;
      ctx.beginPath(); ctx.moveTo(0, .7); ctx.lineTo(0, -.15); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = .05; ctx.fillStyle = '#3a6ad8';
      ctx.beginPath(); ctx.ellipse(0, -.2, .4, .12, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(.35, .25, .1, 0, TAU); ctx.fill(); ctx.stroke();
      glow(ctx, .45, .25, .5, '#ffc94a', .6);
    } else if (V.id === 'ton') {
      const grd = ctx.createLinearGradient(0, -.55, 0, .45);
      grd.addColorStop(0, '#b07a44'); grd.addColorStop(1, '#5a3a20');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(0, -.05, 1.35, .5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = .08;
      for (const x of [-.8, 0, .8]) { ctx.beginPath(); ctx.moveTo(x, -.5); ctx.lineTo(x, .4); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = .05; ctx.fillStyle = '#b5743a';
      ctx.beginPath(); ctx.rect(-1.1, -.95, .3, .55); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(220,220,230,.5)';
      ctx.beginPath(); ctx.arc(-.95 - Math.sin(t * 3) * .1, -1.15 - (t * .8 % .6), .18, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = steel(ctx, -.1, .3);
      ctx.beginPath(); ctx.moveTo(-.95, .25); ctx.lineTo(.95, .25); ctx.lineTo(.75, -.05); ctx.lineTo(-.75, -.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a54a';
      ctx.beginPath(); ctx.moveTo(-.7, -.05); ctx.lineTo(-.8, -1.1); ctx.lineTo(-.5, -1.2); ctx.lineTo(-.4, -.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c8d0e8';
      ctx.beginPath(); ctx.moveTo(-.2, 0); ctx.quadraticCurveTo(-.9, -.6, -1.4, -.2); ctx.quadraticCurveTo(-.9, -.15, -.2, .1); ctx.fill(); ctx.stroke();
    }
  }

  // ---------- De ridder ----------
  // J: { head, neck, hip, elbow, hand, knee, foot, elbow2, hand2, knee2, foot2 } in pixels.
  // Een lichaamsdeel als beeld langs een bot, of als een afgeronde vorm.
  const PARTS = { hoofd: 1, romp: 1, bovenarm: 1, onderarm: 1, bovenbeen: 1, onderbeen: 1 };
  function limb(ctx, name, a, b, wid, col, S) {
    const im = PARTS[name] && img(`ridder-${name}`);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (im) {
      // Het beeld staat rechtop (van boven naar onder = van a naar b).
      ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
      const w = len * im.naturalWidth / im.naturalHeight * 1.25;
      ctx.drawImage(im, -w / 2, -len * .12, w, len * 1.25);
      ctx.restore();
      return;
    }
    ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = wid + S * .07;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = wid;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  function knight(ctx, J, color, S, t) {
    const far = '#5d6684', near = '#9aa3c0';
    limb(ctx, 'bovenbeen', J.hip, J.knee2, S * .24, far, S);
    limb(ctx, 'onderbeen', J.knee2, J.foot2, S * .2, far, S);
    limb(ctx, 'bovenarm', J.neck, J.elbow2, S * .18, far, S);
    limb(ctx, 'onderarm', J.elbow2, J.hand2, S * .16, far, S);
    // Cape
    if (!img('ridder-romp')) {
      ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
      const bx = J.hip[0] - (J.neck[0] - J.hip[0]) * .1 - S * .25;
      ctx.beginPath(); ctx.moveTo(J.neck[0] - S * .1, J.neck[1]); ctx.quadraticCurveTo(bx - S * .3 + Math.sin(t * 6) * S * .06, (J.neck[1] + J.hip[1]) / 2, bx - S * .1, J.hip[1] + S * .25);
      ctx.lineTo(J.hip[0], J.hip[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    limb(ctx, 'romp', J.neck, J.hip, S * .44, near, S);
    limb(ctx, 'bovenbeen', J.hip, J.knee, S * .25, near, S);
    limb(ctx, 'onderbeen', J.knee, J.foot, S * .21, near, S);
    // Helm
    const [hx, hy] = J.head;
    const ang = Math.atan2(J.head[1] - J.neck[1], J.head[0] - J.neck[0]) + Math.PI / 2;
    const him = img('ridder-hoofd');
    if (him) sprite(ctx, him, hx, hy, S * .8, ang);
    else {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
      ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, S * .04);
      ctx.beginPath(); ctx.moveTo(-S * .05, -S * .3); ctx.quadraticCurveTo(-S * .5, -S * .55, -S * .55, -S * .1); ctx.quadraticCurveTo(-S * .3, -S * .25, -S * .05, -S * .2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b8c0da';
      ctx.beginPath(); ctx.arc(0, 0, S * .32, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5ee7ff'; ctx.fillRect(S * .02, -S * .07, S * .28, S * .1);
      ctx.restore();
    }
    limb(ctx, 'bovenarm', J.neck, J.elbow, S * .19, near, S);
    limb(ctx, 'onderarm', J.elbow, J.hand, S * .17, near, S);
  }
  // Een ridder op zijn rijmachine. o: { x, y, a, vi, color, gas, turbo, rot, alpha, name, blink }
  function rider(ctx, o, X, Y, S, t) {
    const V = W.vehicleOf(o.vi);
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blink && Math.floor(t * 12) % 2) ctx.globalAlpha *= .35;
    const sx = X(o.x), sy = Y(o.y);
    if (o.turbo) glow(ctx, sx, sy - S * .6, S * 2.2, '#ff6bd6', .3 + Math.sin(t * 8) * .1);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(o.a); ctx.scale(S, S);
    body(ctx, V, o.gas, o.turbo, t);
    for (const [lx, ly, r] of V.wheels) wheel(ctx, V, lx, ly, r, o.rot || 0, t);
    ctx.restore();
    const p = { x: o.x, y: o.y, a: o.a, veh: V };
    const P = W.riderPose(p);
    const px = q => [X(q[0]), Y(q[1])];
    const J = { head: px(P.head), neck: px(P.neck), hip: px(P.hip), elbow: px(P.elbow), hand: px(P.hand), knee: px(P.knee), foot: px(P.foot) };
    J.elbow2 = [J.elbow[0] - S * .08, J.elbow[1]]; J.hand2 = [J.hand[0] - S * .05, J.hand[1]];
    J.knee2 = [J.knee[0] - S * .1, J.knee[1]]; J.foot2 = [J.foot[0] - S * .1, J.foot[1]];
    knight(ctx, J, o.color, S, t);
    ctx.restore();
    if (o.name) label(ctx, o.name, sx, sy - S * 2.4, o.color, S);
  }
  function label(ctx, text, x, y, color, S) {
    ctx.font = `800 ${Math.max(11, Math.round(S * .34))}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(5,8,20,.7)'; ctx.fillRect(x - tw / 2 - 5, y - S * .42, tw + 10, S * .46);
    ctx.fillStyle = color; ctx.fillRect(x - tw / 2 - 5, y + S * .02, tw + 10, 2);
    ctx.fillStyle = '#f2f5ff'; ctx.fillText(text, x, y);
  }
  // De ledenpop na een val. rd uit TmWorld.ragdoll.
  function doll(ctx, rd, color, X, Y, S, t, alpha = 1) {
    const q = i => [X(rd.pts[i].x), Y(rd.pts[i].y)];
    const J = { head: q(0), neck: q(1), hip: q(2), elbow: q(3), hand: q(4), elbow2: q(5), hand2: q(6), knee: q(7), foot: q(8), knee2: q(9), foot2: q(10) };
    ctx.save(); ctx.globalAlpha = alpha;
    knight(ctx, J, color, S, t);
    // Sterretjes boven de helm
    if (rd.t > .5) {
      const [hx, hy] = J.head;
      ctx.fillStyle = '#ffe08a';
      ctx.font = `${Math.round(S * .4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; ctx.fillText('★', hx + Math.cos(a) * S * .55, hy - S * .55 + Math.sin(a) * S * .18); }
    }
    ctx.restore();
  }
  // De rijmachine zonder ridder, tollend weg na een val. o: { x, y, a, vi }
  function wreck(ctx, o, X, Y, S, t) {
    const V = W.vehicleOf(o.vi);
    ctx.save();
    ctx.translate(X(o.x), Y(o.y)); ctx.rotate(o.a); ctx.scale(S, S);
    body(ctx, V, false, false, t);
    for (const [lx, ly, r] of V.wheels) wheel(ctx, V, lx, ly, r, o.rot || 0, t);
    ctx.restore();
  }
  // Een rijmachine met ridder als plaatje (kiezen, wachtzaal).
  function preview(canvas, vi, color) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const S = Math.min(canvas.width / 3.6, canvas.height / 3.4);
    const V = W.vehicleOf(vi);
    const low = Math.max(...V.wheels.map(w => w[1] + w[2])) + (V.kind === 'zweef' ? .5 : 0);
    rider(g, { x: 0, y: 0, a: 0, vi, color, rot: .4 }, x => canvas.width / 2 + x * S, y => canvas.height - S * (low + .1) + y * S, S, 0);
  }

  // ---------- Alles samen ----------
  // v: { t, cx, cy, S, riders, dolls, wrecks, passed, wip, loadX, boing }
  function render(ctx, w, h, v) {
    const S = Math.round(v.S * 4) / 4;
    const left = v.cx - w / 2 / S, right = v.cx + w / 2 / S;
    const X = x => (x - v.cx) * S + w / 2;
    const Y = y => (y - v.cy) * S + h / 2;
    const kc = W.stageAt(v.cx);
    const theme = W.themeOf(kc);
    ctx.drawImage(sky(theme, w, h), 0, 0);
    const bg = img(`achtergrond-${theme.id}`);
    if (bg) {
      // Het geschilderde beeld vult de hoogte boven de baan en schuift traag mee.
      const bh = h * 1.05, bw = bh * bg.naturalWidth / bg.naturalHeight;
      const off = -((v.cx * S * .12) % bw + bw) % bw;
      const dy = Math.round(.1 * (W.BASE - 3 - v.cy) * S) - h * .05;
      for (let x = off; x < w; x += bw) ctx.drawImage(bg, Math.round(x), dy, bw + 1, bh);
    } else {
      const im = layer(theme, h);
      const off = -((v.cx * S * .15) % im.width + im.width) % im.width;
      const dy = Math.round(.2 * (W.BASE - 3 - v.cy) * S);
      for (let x = off; x < w; x += im.width) ctx.drawImage(im, Math.round(x), dy);
    }
    const stages = [];
    for (let k = W.stageAt(left - 8); k <= W.stageAt(right + 8); k++) stages.push(W.stage(k));
    let pl = Infinity, pr = -Infinity;
    for (const st of stages) for (const p of st.pits) if (p.x1 > left - 1 && p.x0 < right + 1) { pl = Math.min(pl, p.x0); pr = Math.max(pr, p.x1); }
    if (pr > pl) {
      ctx.save();
      ctx.beginPath(); ctx.rect(X(pl) - 2, 0, X(pr) - X(pl) + 4, h); ctx.clip();
      pit(ctx, theme, w, h, v.cx, S, Y(W.PIT), v.t);
      ctx.restore();
    }
    for (const st of stages) for (const d of st.deco) {
      if (d.x < left - 7 || d.x > right + 7) continue;
      if (d.kind === 'galg') gallows(ctx, d, st.theme, X, Y, S);
      else if (d.kind === 'fakkel') torch(ctx, X(d.x), Y(d.y), S, v.t, st.theme);
    }
    for (const st of stages) for (const l of st.lasers) if (l.x > left - 2 && l.x < right + 2) laser(ctx, l, v.t, X, Y, S);
    for (const st of stages) {
      const p = paths(st);
      const tm = st.theme;
      ctx.save();
      ctx.translate(w / 2 - v.cx * S, h / 2 - v.cy * S);
      ctx.scale(S, S);
      ctx.fillStyle = stonePattern(ctx, tm);
      ctx.fill(p.fill);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = .3; ctx.stroke(p.top);
      ctx.strokeStyle = tm.top; ctx.lineWidth = .16; ctx.stroke(p.top);
      ctx.strokeStyle = rgba(tm.glow, .8); ctx.lineWidth = .045;
      ctx.translate(0, .14); ctx.stroke(p.top);
      ctx.restore();
    }
    for (const st of stages) {
      const tm = st.theme;
      for (const wp of st.wips) {
        if (wp.px + wp.half < left - 1 || wp.px - wp.half > right + 1) continue;
        const key = wp.id + ':' + st.k;
        wip(ctx, wp, v.wip && v.wip[key] != null ? v.wip[key] : -wp.A, tm, X, Y, S);
      }
      for (const sp of st.springs) if (sp.x1 > left - 1 && sp.x0 < right + 1) spring(ctx, sp, v.t, X, Y, S, v.boing && v.boing.has(sp));
      for (const s of st.spikes) if (s.x < right && s.x + s.w > left) spikes(ctx, s, X, Y, S);
      for (const c of st.cannons) if (c.x > left - 12 && c.x < right + 2) cannon(ctx, c, v.t, X, Y, S);
      if (st.k > 0 && st.x0 > left - 4 && st.x0 < right + 4) {
        if (W.isFinish(st.k)) finish(ctx, st.k, X(st.x0), Y(W.BASE), S, v.t, v.passed >= st.k);
        else flag(ctx, st.k % W.PER, X(st.x0), Y(W.BASE), S, v.t, v.passed >= st.k);
      }
    }
    for (const o of v.wrecks || []) if (o.x > left - 3 && o.x < right + 3) wreck(ctx, o, X, Y, S, v.t);
    for (const o of v.riders || []) if (o.x > left - 3 && o.x < right + 3) rider(ctx, o, X, Y, S, v.t);
    for (const d of v.dolls || []) doll(ctx, d.rd, d.color, X, Y, S, v.t, d.alpha ?? 1);
    for (const st of stages) for (const hm of st.hammers) if (Math.abs(hm.x - v.cx) < (right - left) / 2 + 6) hammer(ctx, hm, v.t, X, Y, S);
  }

  return { render, rider, doll, wreck, preview, img };
})();
