// Ridder-Royale tekenen, voor het bord en de leerling: de arena (één keer vooraf getekend), de neonstorm,
// ridders, schoten, kratten en buit, vonken en struiken. Gebruikt RyWorld en AK (arena-kit.js).
const RyDraw = (() => {
  const { R } = RyWorld;

  // ---------- Geschilderde beelden ----------
  // Eigen beelden in public/img/ridderroyale/ (grond, rots, kristalzuil, struik, krat); de stenen, de ruimte
  // en de ridder van bovenaf delen we met Laserslag en Sterrenvreter. Zonder beeld tekenen we alles zoals vroeger.
  const ART = {};
  let artVer = 0;
  const SRC = { grond: 'ridderroyale/grond', rots: 'ridderroyale/rots', zuil: 'ridderroyale/zuil', struik: 'ridderroyale/struik', krat: 'ridderroyale/krat', muur: 'laserslag/muur', ridder: 'laserslag/ridder-boven', ruimte: 'sterrenvreter/ruimte' };
  if (typeof Image !== 'undefined') {
    for (const [n, src] of Object.entries(SRC)) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artVer++; tints.clear(); };
      img.src = `/img/${src}.webp`;
    }
  }
  const tints = new Map();
  const hexRgb = hx => { const n = parseInt(hx.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, sat = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, sat, l];
  }
  function hslRgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  // De geschilderde ridder van bovenaf in de kleur van de speler (het blauw wordt zijn kleur, het cyaan blijft).
  function paintedKnight(color) {
    if (!ART.ridder) return null;
    let c = tints.get(color);
    if (c) return c;
    const img = ART.ridder;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height), p = data.data;
    const [th, ts, tl] = rgbHsl(...hexRgb(color));
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const [hh, sat, l] = rgbHsl(p[i], p[i + 1], p[i + 2]);
      if (hh < 205 || hh > 258 || sat < .38) continue;
      const [r, gg, b] = hslRgb(th, Math.max(sat, ts * .85), Math.min(.85, l * (.75 + tl * .6)));
      p[i] = r; p[i + 1] = gg; p[i + 2] = b;
    }
    g.putImageData(data, 0, 0);
    tints.set(color, c);
    return c;
  }
  // Een patroon uit een beeld, met zijn tegel zo groot als tile wereld-eenheden.
  function pattern(ctx, img, tile) {
    const p = ctx.createPattern(img, 'repeat');
    const k = tile / img.width;
    p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    return p;
  }

  // ---------- De arena vooraf tekenen ----------
  // Vuurschalen: bij de hoeken van het burchtplein en aan de uiteinden van de ruïnes. Alleen voor het beeld.
  function lights(ar) {
    const rnd = RyWorld.rng(ar.seed + 11);
    const out = [[-185, -185], [185, -185], [-185, 185], [185, 185]].map(([x, y]) => ({ x, y }));
    for (const w of ar.walls.slice(6)) {
      if (rnd() < .45 && out.length < 16) {
        const horiz = w.w > w.h;
        const end = rnd() < .5;
        out.push(horiz ? { x: end ? w.x - 22 : w.x + w.w + 22, y: w.y + w.h / 2 } : { x: w.x + w.w / 2, y: end ? w.y - 22 : w.y + w.h + 22 });
      }
    }
    return out.filter(l => Math.hypot(l.x, l.y) < ar.size - 40);
  }

  function bake(ar) {
    const S = ar.size + 80;
    const q = Math.min(1, 3000 / (S * 2));
    const c = document.createElement('canvas');
    c.width = Math.ceil(S * 2 * q);
    c.height = Math.ceil(S * 2 * q);
    const ctx = c.getContext('2d');
    ctx.scale(q, q);
    ctx.translate(S, S);
    const rnd = RyWorld.rng(ar.seed + 5);
    // Grond: donker nachtgras met vlekken, stenen paden naar het midden en lichtende runen.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ar.size, 0, Math.PI * 2);
    ctx.clip();
    const bg = ctx.createRadialGradient(0, 0, 50, 0, 0, ar.size);
    bg.addColorStop(0, '#1e3530');
    bg.addColorStop(.7, '#12221f');
    bg.addColorStop(1, '#0a1314');
    ctx.fillStyle = bg;
    ctx.fillRect(-S, -S, S * 2, S * 2);
    const painted = !!ART.grond;
    if (painted) {
      ctx.fillStyle = pattern(ctx, ART.grond, 360);
      ctx.fillRect(-S, -S, S * 2, S * 2);
      const edge = ctx.createRadialGradient(0, 0, ar.size * .5, 0, 0, ar.size);
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = edge;
      ctx.fillRect(-S, -S, S * 2, S * 2);
    }
    for (let i = 0; i < (painted ? 0 : ar.size * 1.2); i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * ar.size;
      const v = rnd();
      ctx.fillStyle = v < .4 ? 'rgba(70,130,90,.13)' : v < .55 ? 'rgba(40,90,110,.12)' : 'rgba(0,0,0,.16)';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 10 + rnd() * 44, 6 + rnd() * 22, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grassprieten en hier en daar lichtende bloemetjes
    ctx.lineWidth = 1.5;
    for (let i = 0; i < (painted ? 0 : ar.size * 3.5); i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * ar.size;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      ctx.strokeStyle = rnd() < .5 ? 'rgba(120,200,140,.18)' : 'rgba(60,120,90,.25)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - .5) * 6, y - 5 - rnd() * 7);
      ctx.stroke();
    }
    for (let i = 0; i < (painted ? 0 : ar.size * .12); i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * ar.size;
      AK.glow(ctx, Math.cos(a) * d, Math.sin(a) * d, 7, rnd() < .5 ? '#7fffd4' : '#c77dff', .5);
    }
    // Oude techplaten in de grond: zeshoeken met cyaan voegen rond het plein
    ctx.lineWidth = 2;
    const hex = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); };
    for (let gx = -8; gx <= 8; gx++) {
      for (let gy = -8; gy <= 8; gy++) {
        const x = gx * 63, y = gy * 72 + (gx & 1) * 36;
        const d = Math.hypot(x, y);
        if (d < 210 || d > 420 || rnd() < .35) continue;
        const fade = 1 - (d - 210) / 210;
        hex(x, y, 34);
        ctx.fillStyle = `rgba(30,45,60,${.55 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(76,201,255,${.28 * fade})`;
        ctx.stroke();
      }
    }
    // Paden: vier stenen wegen naar de burcht
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2 + .4;
      for (let d = 190; d < ar.size - 40; d += 34) {
        const a = a0 + Math.sin(d / 180) * .12;
        const x = Math.cos(a) * d + (rnd() - .5) * 10, y = Math.sin(a) * d + (rnd() - .5) * 10;
        const v = 58 + Math.floor(rnd() * 18);
        const rx = 16 + rnd() * 6, ry = 11 + rnd() * 4;
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 3, rx, ry, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 3, rx * .6, ry * .5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Runencirkels met tekens
    for (const [r, col] of [[ar.size * .35, '76,201,255'], [ar.size * .7, '199,125,255']]) {
      ctx.strokeStyle = `rgba(${col},.16)`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${col},.35)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([24, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const n = Math.round(r / 40);
      ctx.strokeStyle = `rgba(${col},.45)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * (r + 16), Math.sin(a) * (r + 16));
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        const g = Math.floor(rnd() * 4);
        if (g === 0) { ctx.moveTo(-5, -5); ctx.lineTo(0, 5); ctx.lineTo(5, -5); }
        else if (g === 1) { ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.moveTo(-5, -2); ctx.lineTo(5, 2); }
        else if (g === 2) { ctx.arc(0, 0, 4, 0, Math.PI * 1.5); }
        else { ctx.moveTo(-5, 5); ctx.lineTo(-5, -5); ctx.lineTo(5, 0); ctx.lineTo(-5, 5); }
        ctx.stroke();
        ctx.restore();
      }
    }
    // Burchtplein: stenen tegels met een gouden embleem
    for (let x = -150; x < 150; x += 50) {
      for (let y = -150; y < 150; y += 50) {
        const v = 66 + Math.floor(rnd() * 14);
        ctx.fillStyle = ART.muur ? pattern(ctx, ART.muur, 100) : `rgb(${v - 8},${v - 4},${v + 10})`;
        ctx.fillRect(x + 1.5, y + 1.5, 47, 47);
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(x + 1.5, y + 1.5, 47, 4);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(x + 1.5, y + 44.5, 47, 4);
      }
    }
    ctx.strokeStyle = 'rgba(255,201,74,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-150, -150, 300, 300);
    AK.glow(ctx, 0, 0, 170, '#ffc94a', .22);
    ctx.strokeStyle = 'rgba(255,201,74,.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 80, Math.sin(a) * 80);
      ctx.lineTo(Math.cos(a + Math.PI / 8) * 58, Math.sin(a + Math.PI / 8) * 58);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * 80, Math.sin(a + Math.PI / 4) * 80);
      ctx.stroke();
    }
    // Lichtplassen van de vuurschalen
    for (const l of lights(ar)) AK.glow(ctx, l.x, l.y + 6, 150, '#ff9a3c', .3, .8);
    ctx.restore();
    // Rand van de arena: een stenen muur met kantelen en een neonband.
    ctx.lineWidth = 30;
    ctx.strokeStyle = '#1d2230';
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#363e52';
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 13, 0, Math.PI * 2);
    ctx.stroke();
    const nb = Math.round(ar.size / 14);
    ctx.fillStyle = '#4a5368';
    for (let i = 0; i < nb; i += 2) {
      const a0 = (i / nb) * Math.PI * 2, a1 = ((i + 1) / nb) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, ar.size + 26, a0, a1);
      ctx.arc(0, 0, ar.size + 16, a1, a0, true);
      ctx.fill();
    }
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(76,201,255,.25)';
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#7fe0ff';
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 2, 0, Math.PI * 2);
    ctx.stroke();
    // Schaduwen van muren en rotsen
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    for (const w of ar.walls) ctx.fillRect(w.x + 10, w.y + 14, w.w, w.h);
    for (const o of ar.rocks) { ctx.beginPath(); ctx.ellipse(o.x + 9, o.y + 12, o.r, o.r * .82, 0, 0, Math.PI * 2); ctx.fill(); }
    // Muren: blokken steen met een voorkant (hoogte), kantelen en een gouden of cyaan neonrand
    const H = 12;
    for (const w of ar.walls) {
      // Voorkant
      ctx.fillStyle = '#262c3a';
      ctx.fillRect(w.x, w.y + w.h, w.w, H);
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.lineWidth = 1.5;
      for (let s = 13; s < w.w; s += 26) { ctx.beginPath(); ctx.moveTo(w.x + s, w.y + w.h); ctx.lineTo(w.x + s, w.y + w.h + H); ctx.stroke(); }
      // Bovenkant
      const g = ctx.createLinearGradient(w.x, w.y, w.x + w.w * .3, w.y + w.h);
      g.addColorStop(0, '#727e96');
      g.addColorStop(1, '#3d4558');
      ctx.fillStyle = ART.muur ? pattern(ctx, ART.muur, 104) : g;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 2;
      const horiz = w.w > w.h;
      const len = horiz ? w.w : w.h;
      for (let s = 26; s < (ART.muur ? 0 : len); s += 26) {
        ctx.beginPath();
        if (horiz) { ctx.moveTo(w.x + s, w.y); ctx.lineTo(w.x + s, w.y + w.h); } else { ctx.moveTo(w.x, w.y + s); ctx.lineTo(w.x + w.w, w.y + s); }
        ctx.stroke();
      }
      // Kantelen
      ctx.fillStyle = '#8d99b0';
      for (let s = 4; s < (ART.muur ? 0 : len - 8); s += 20) {
        if (horiz) ctx.fillRect(w.x + s, w.y + 3, 10, 7); else ctx.fillRect(w.x + 3, w.y + s, 7, 10);
      }
      const neon = rnd() < .5 ? '#ffc94a' : '#4cc9ff';
      ctx.strokeStyle = AK.rgba(neon, .3);
      ctx.lineWidth = 6;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = neon;
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    }
    for (const o of ar.rocks) {
      const pic = ART[o.kind === 'zuil' ? 'zuil' : 'rots'];
      if (pic) {
        if (o.kind === 'zuil') AK.glow(ctx, o.x, o.y, o.r * 2.6, '#c77dff', .6);
        const d = o.r * 2.25;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(rnd() * Math.PI * 2);
        ctx.drawImage(pic, -d / 2, -d / 2, d, d);
        ctx.restore();
        continue;
      }
      if (o.kind === 'zuil') {
        // Kristalzuil: stenen voet met een lichtend paars kristal
        const g = ctx.createRadialGradient(o.x - o.r * .3, o.y - o.r * .3, 2, o.x, o.y, o.r);
        g.addColorStop(0, '#a7b3c9');
        g.addColorStop(1, '#262d3d');
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; ctx[i ? 'lineTo' : 'moveTo'](o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        AK.glow(ctx, o.x, o.y, o.r * 2.6, '#c77dff', .7);
        // Een trosje kristallen dat naar het licht wijst
        for (const [dx, dy, hh, ww] of [[-o.r * .3, o.r * .15, .55, .2], [o.r * .32, o.r * .1, .6, .22], [0, 0, 1, .3]]) {
          const cx = o.x + dx, cy = o.y + dy, H = o.r * hh * 1.1, W = o.r * ww * 1.2;
          const cg = ctx.createLinearGradient(cx - W, cy, cx + W, cy);
          cg.addColorStop(0, '#f3e1ff');
          cg.addColorStop(.5, '#c77dff');
          cg.addColorStop(1, '#5a189a');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.moveTo(cx, cy - H); ctx.lineTo(cx + W, cy - H * .55); ctx.lineTo(cx + W * .8, cy + H * .35); ctx.lineTo(cx, cy + H * .5); ctx.lineTo(cx - W * .8, cy + H * .35); ctx.lineTo(cx - W, cy - H * .55);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(40,0,70,.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.7)';
          ctx.beginPath();
          ctx.moveTo(cx, cy - H); ctx.lineTo(cx, cy + H * .5);
          ctx.stroke();
        }
        AK.glow(ctx, o.x, o.y - o.r * .3, o.r * .8, '#ffffff', .5);
      } else {
        const pts = [];
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = o.r * (.82 + rnd() * .22); pts.push([o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr]); }
        const g = ctx.createLinearGradient(o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r);
        g.addColorStop(0, '#6a7385');
        g.addColorStop(1, '#2a303c');
        ctx.fillStyle = g;
        ctx.beginPath();
        pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Facetten
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 3) { ctx.moveTo(o.x - o.r * .1, o.y - o.r * .1); ctx.lineTo(pts[i][0], pts[i][1]); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.beginPath();
        ctx.ellipse(o.x - o.r * .25, o.y - o.r * .3, o.r * .45, o.r * .28, -.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(80,150,95,.45)';
        ctx.beginPath();
        ctx.ellipse(o.x + o.r * .2, o.y + o.r * .35, o.r * .38, o.r * .2, .3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Vuurschalen
    for (const l of lights(ar)) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(l.x + 4, l.y + 6, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2f3a';
      ctx.beginPath(); ctx.arc(l.x, l.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#5a1e08';
      ctx.beginPath(); ctx.arc(l.x, l.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    return { canvas: c, q, S };
  }

  // De storm: een paarse wolk die je één keer tekent en dan laat draaien.
  let cloud = null;
  function stormCloud() {
    if (cloud) return cloud;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a0630';
    ctx.fillRect(0, 0, 512, 512);
    const rnd = RyWorld.rng(42);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 110;
      const col = ['#7b2cbf', '#c026d3', '#3c096c', '#5a189a', '#e879f9'][Math.floor(rnd() * 5)];
      for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) AK.glow(ctx, x + dx, y + dy, r, col, .22 + rnd() * .15);
    }
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 512, y = rnd() * 512;
      for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) AK.glow(ctx, x + dx, y + dy, 6 + rnd() * 6, '#f5d0fe', .35);
    }
    cloud = c;
    return c;
  }

  // Struiken komen bovenop de ridders: daarom apart, met lichtende blaadjes.
  function bakeBushes(ar) {
    return ar.bushes.map(b => {
      const s = Math.ceil(b.r * 2.2 + 16);
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d');
      const rnd = RyWorld.rng(Math.round(b.x * 7 + b.y));
      ctx.translate(s / 2, s / 2);
      if (ART.struik) {
        const d = b.r * 2.2;
        ctx.rotate(rnd() * Math.PI * 2);
        ctx.drawImage(ART.struik, -d / 2, -d / 2, d, d);
        return { canvas: c, s };
      }
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * b.r * .55, r = b.r * (.35 + rnd() * .3);
        const g = ctx.createRadialGradient(Math.cos(a) * d - r * .3, Math.sin(a) * d - r * .3, 1, Math.cos(a) * d, Math.sin(a) * d, r);
        g.addColorStop(0, '#2f7a4c');
        g.addColorStop(1, '#0f3322');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,255,180,.55)';
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * b.r * .8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return { canvas: c, s };
    });
  }

  // ---------- Toestand ----------
  class Scene {
    constructor() {
      this.ar = null;
      this.baked = null;
      this.bushes = [];
      this.knights = new AK.Interp(100);
      this.shots = new Map();
      this.local = new Map();
      this.taken = new Set();
      this.loot = new Map(); // buit van uitgeschakelde ridders: id -> {x, y}
      this.fx = new AK.Particles();
      this.trails = new AK.Trails(9);
      this.lights = [];
      this.strikes = [];
      this.roundStart = 0;
      this.state = 'pauze';
      this.breakEnd = 0;
      this.alive = 0;
      this.shotAt = new Map();
      this.hurtAt = new Map();
      this.shake = 0;
      this.flash = 0;
      this.meN = -1;
      this.onEvent = null;
    }

    round(msg) {
      this.ar = RyWorld.makeArena(msg.seed, msg.players);
      this.baked = bake(this.ar);
      this.bushes = bakeBushes(this.ar);
      this.lights = lights(this.ar);
      this.taken = new Set(msg.taken || []);
      this.loot = new Map((msg.loot || []).map(l => [l[0], { x: l[1], y: l[2] }]));
      this.shots.clear();
      this.local.clear();
      this.knights.clear();
      this.roundStart = performance.now() + (msg.at - msg.now);
      this.state = 'pauze';
      this.roundNo = msg.round;
    }

    zone(t = performance.now()) {
      if (!this.ar) return null;
      return RyWorld.zoneAt(this.ar, Math.max(0, (t - this.roundStart) / 1000));
    }

    apply(msg) {
      const t = performance.now();
      for (const k of msg.k) this.knights.push(k[0], [k[1], k[2], k[3], k[4], k[5]], t);
      this.knights.prune(t, 400);
      // Kleine afwijkingen van de klok bijsturen.
      if (msg.rs === 'pauze') this.roundStart = t + msg.ra;
      else if (msg.rs === 'strijd' && Math.abs(this.roundStart - (t + msg.ra)) > 250) this.roundStart = t + msg.ra;
      this.state = msg.rs;
      this.breakEnd = msg.br ? t + msg.br : 0;
      this.alive = msg.al;
      for (const e of msg.ev) this.event(e, t);
    }

    event(e, t) {
      const fx = this.fx;
      switch (e[0]) {
        case 'shot': {
          const [, id, x, y, vx, vy, life, owner, seq, big] = e;
          this.shotAt.set(owner, t);
          if (owner === this.meN && seq && this.local.has(seq)) {
            const s = this.local.get(seq);
            this.local.delete(seq);
            this.shots.set(id, s);
            break;
          }
          this.shots.set(id, { x, y, vx, vy, life, big, owner });
          fx.burst(x, y, { n: big ? 8 : 3, color: big ? '#ffd166' : '#ff8fa3', speed: 120, life: .18, size: 2 });
          break;
        }
        case 'weg': {
          const s = this.shots.get(e[1]);
          this.shots.delete(e[1]);
          const col = s && s.big ? '#ffd166' : '#ff6b86';
          fx.sparks(e[2], e[3], { n: e[4] ? 10 : 5, color: col, speed: 320, life: .25 });
          if (e[4]) fx.ring(e[2], e[3], 26, col, .25);
          break;
        }
        case 'au': {
          this.hurtAt.set(e[1], t);
          const k = this.knights.get(e[1], t);
          if (k) {
            if (e[3]) { fx.ring(k[0], k[1], R + 12, '#8fe3ff', .3); fx.sparks(k[0], k[1], { n: 6, color: '#8fe3ff', speed: 260 }); } else {
              fx.sparks(k[0], k[1], { n: 10, color: '#ff8fa3', speed: 340 });
              fx.burst(k[0], k[1], { n: 6, color: '#ff4d6d', speed: 140, life: .35 });
            }
            if (!e[3]) fx.text(k[0] + (Math.random() - .5) * 16, k[1] - 28, `-${e[2]}`, e[2] >= 40 ? '#ffd166' : '#ff8fa3', e[2] >= 40 ? 26 : 18);
          }
          if (e[1] === this.meN) { this.flash = e[3] ? .5 : 1; if (!e[3]) this.shake = Math.max(this.shake, 6); }
          break;
        }
        case 'uit':
          fx.smoke(e[3], e[4], { n: 10, size: 22, life: 1.2, speed: 90 });
          fx.shock(e[3], e[4], 110, '#ff4d6d', .6);
          fx.burst(e[3], e[4], { n: 40, color: '#ffc94a', speed: 320, life: .9, size: 4 });
          fx.sparks(e[3], e[4], { n: 24, color: '#ffe08a', speed: 600, life: .45, width: 2.5 });
          fx.pop(e[3], e[4] - 40, 'KO!', '#ffc94a', 34);
          if (e[1] === this.meN || e[2] === this.meN) this.shake = Math.max(this.shake, 12);
          break;
        case 'buit': this.loot.set(e[1], { x: e[2], y: e[3] }); break;
        case 'pak': {
          this.taken.add(e[1]);
          const l = this.loot.get(e[1]) || (this.ar && this.ar.crates[e[1]]);
          this.loot.delete(e[1]);
          if (l) {
            fx.burst(l.x, l.y, { n: 16, color: e[3] === 'cel' ? '#4ade80' : '#ffd166', speed: 150, life: .6, up: 50 });
            fx.shock(l.x, l.y, 46, e[3] === 'cel' ? '#4ade80' : '#4cc9ff', .4);
            fx.text(l.x, l.y - 12, e[3] === 'cel' ? '+30 ❤' : e[3] === 'buit' ? '+munitie' : '+4 ⚡', e[3] === 'cel' ? '#4ade80' : '#ffd166');
          }
          break;
        }
        case 'traag': { const k = this.knights.get(e[1], t); if (k) { fx.ring(k[0], k[1], 34, '#4cc9ff', .6); fx.burst(k[0], k[1], { n: 12, color: '#bfefff', speed: 90, life: .7, size: 2.5 }); } break; }
        default: break;
      }
      if (this.onEvent) this.onEvent(e);
    }

    update(dt) {
      for (const [id, s] of this.shots) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= -.2 || (this.ar && RyWorld.solidAt(this.ar, s.x, s.y))) this.shots.delete(id);
      }
      for (const [seq, s] of this.local) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || (this.ar && RyWorld.solidAt(this.ar, s.x, s.y))) this.local.delete(seq);
      }
      this.fx.update(dt);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }

    // Zie je deze ridder? Wie in een struik staat, is onzichtbaar tenzij je dichtbij bent of hij net schoot.
    visible(id, k, me, t) {
      if (!me || id === this.meN || !this.ar) return true;
      if (!RyWorld.inBush(this.ar, k[0], k[1])) return true;
      if (Math.hypot(k[0] - me.x, k[1] - me.y) < 140) return true;
      return t - (this.shotAt.get(id) || 0) < 900;
    }
  }

  // Een voorraadkist: metaal met gouden hoeken, een lichtende kern en een lichtbundel zodat je hem van ver ziet.
  function crate(ctx, x, y, t) {
    const bob = Math.sin(t * 2 + x) * 1.5;
    const pulse = .6 + Math.sin(t * 3 + y) * .4;
    // Lichtbundel naar boven
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - 90, 0, y);
    g.addColorStop(0, 'rgba(76,201,255,0)');
    g.addColorStop(1, `rgba(76,201,255,${.22 + pulse * .12})`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 9, y - 90, 18, 90);
    ctx.restore();
    AK.glow(ctx, x, y + 8, 38, '#4cc9ff', .35 + pulse * .2, .6);
    ctx.save();
    ctx.translate(x, y + bob);
    if (ART.krat) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(-15, -12, 34, 34);
      ctx.drawImage(ART.krat, -19, -19, 38, 38);
      AK.glow(ctx, 0, 0, 16, '#4cc9ff', .4 + pulse * .3);
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(-14, 10, 32, 10);
    // Voorkant (hoogte)
    ctx.fillStyle = '#20283a';
    ctx.fillRect(-16, 10, 32, 7);
    // Deksel
    const lg = ctx.createLinearGradient(-16, -16, 16, 12);
    lg.addColorStop(0, '#5d6b85');
    lg.addColorStop(1, '#2c3548');
    ctx.fillStyle = lg;
    ctx.fillRect(-16, -16, 32, 27);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -16, 32, 33);
    ctx.fillStyle = '#ffc94a';
    for (const [cx, cy] of [[-16, -16], [10, -16], [-16, 5], [10, 5]]) ctx.fillRect(cx, cy, 6, 6);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(-8, -9, 16, 13);
    AK.glow(ctx, 0, -2.5, 16, '#4cc9ff', .7 + pulse * .3);
    ctx.fillStyle = '#bff0ff';
    ctx.fillRect(-5, -6, 10, 7);
    ctx.restore();
  }

  function lootBag(ctx, x, y, t) {
    const pulse = .7 + Math.sin(t * 6) * .3;
    AK.glow(ctx, x, y, 34 * pulse + 10, '#ffd166', .7);
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3) * 2);
    ctx.scale(Math.cos(t * 3), 1);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6d6';
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,50,0,.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Een vuurschaal met flakkerende vlammen.
  function brazier(ctx, l, t, i) {
    const f = 1.05 + Math.sin(t * 13 + i * 3) * .12 + Math.sin(t * 7.3 + i) * .12;
    AK.glow(ctx, l.x, l.y, 80 * f, '#ff8c2a', .6);
    // Opstijgende vonkjes
    for (let k = 0; k < 4; k++) {
      const age = (t * .8 + k * .25 + i * .13) % 1;
      AK.glow(ctx, l.x + Math.sin(age * 9 + k * 2 + i) * 8, l.y - 10 - age * 50, 5 * (1 - age) + 1, '#ffb347', 1 - age);
    }
    AK.glow(ctx, l.x, l.y - 4, 22 * f, '#ffd27a', .9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const h = (14 + k * 4) * f + Math.sin(t * 17 + k * 2 + i) * 3;
      const dx = (k - 1) * 4 + Math.sin(t * 9 + k + i) * 1.5;
      ctx.fillStyle = k === 1 ? 'rgba(255,230,150,.9)' : 'rgba(255,120,40,.75)';
      ctx.beginPath();
      ctx.moveTo(l.x + dx - 4, l.y);
      ctx.quadraticCurveTo(l.x + dx - 3, l.y - h * .6, l.x + dx, l.y - h);
      ctx.quadraticCurveTo(l.x + dx + 3, l.y - h * .6, l.x + dx + 4, l.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Vuurvliegjes en zwevende vonkjes: geen toestand nodig, alles volgt uit de tijd.
  function motes(ctx, ar, t, vis, n) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, d = Math.sqrt((i + .5) / n) * ar.size * .95;
      const x = Math.cos(a) * d + Math.sin(t * .4 + i) * 40, y = Math.sin(a) * d + Math.cos(t * .33 + i * 1.7) * 30;
      if (!vis(x, y, 20)) continue;
      const blink = .5 + Math.sin(t * 2.2 + i * 1.3) * .5;
      AK.glow(ctx, x, y, 9 + blink * 5, i % 3 ? '#b8ff9a' : '#8fe3ff', .35 + blink * .5);
    }
  }

  // ---------- Een beeld tekenen ----------
  // cam: { x, y, zoom, w, h }; opts: { roster, local: {n, x, y, a}, me (voor struiken), board }
  function render(ctx, s, cam, opts = {}) {
    const { w, h } = cam;
    const t = performance.now() / 1000;
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!s.ar) { ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, w, h); return; }
    const ar = s.ar;
    const z = cam.zoom;
    if (s.art !== artVer) { s.art = artVer; s.baked = bake(ar); s.bushes = bakeBushes(ar); }
    // Ruimte op de achtergrond, die trager meeschuift dan de arena (diepte).
    if (ART.ruimte) {
      const p = ctx.createPattern(ART.ruimte, 'repeat');
      p.setTransform(new DOMMatrix([1, 0, 0, 1, -cam.x * z * .25, -cam.y * z * .25]));
      ctx.fillStyle = p;
      ctx.fillRect(0, 0, w, h);
    } else Glow.space(ctx, w, h, -cam.x * z * .25, -cam.y * z * .25);
    const sx = s.shake ? (Math.random() - .5) * s.shake : 0, sy = s.shake ? (Math.random() - .5) * s.shake : 0;
    const ox = w / 2 - cam.x * z + sx, oy = h / 2 - cam.y * z + sy;
    ctx.setTransform(z, 0, 0, z, ox, oy);
    const vx0 = -ox / z, vy0 = -oy / z, vx1 = vx0 + w / z, vy1 = vy0 + h / z;
    const vis = (x, y, m = 80) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
    const b = s.baked;
    const ax = Math.max(-b.S, vx0), ay = Math.max(-b.S, vy0), bx = Math.min(b.S, vx1), by = Math.min(b.S, vy1);
    if (bx > ax && by > ay) ctx.drawImage(b.canvas, (ax + b.S) * b.q, (ay + b.S) * b.q, (bx - ax) * b.q, (by - ay) * b.q, ax, ay, bx - ax, by - ay);
    // Draaiende runen op het plein
    if (vis(0, 0, 120)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,201,74,.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(0, 0, 112, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Kratten en buit
    ar.crates.forEach((c, i) => { if (!s.taken.has(i) && vis(c.x, c.y, 100)) crate(ctx, c.x, c.y, t); });
    for (const l of s.loot.values()) if (vis(l.x, l.y)) lootBag(ctx, l.x, l.y, t);
    // Ridders
    const roster = opts.roster || new Map();
    const me = opts.local;
    const list = [];
    for (const id of s.knights.ids()) {
      let k = s.knights.get(id, now);
      if (!k) continue;
      if (me && me.n === id && !(k[4] & 1)) k = [me.x, me.y, me.a, k[3], k[4]];
      if (!(k[4] & 1)) s.trails.add(id, k[0], k[1], now);
      if (!vis(k[0], k[1])) continue;
      const shown = opts.board || s.visible(id, k, me, now);
      if (!shown) continue;
      list.push([id, k]);
    }
    s.trails.prune(now);
    const big = opts.board ? Math.max(1, .9 / z) : 1;
    for (const [id, k] of list) {
      if (k[4] & 1) continue;
      const info = roster.get(id) || {};
      if (!RyWorld.inBush(ar, k[0], k[1])) s.trails.draw(ctx, id, info.color || '#4cc9ff', R * 1.1 * big, now);
    }
    for (const [id, k] of list) {
      if (k[4] & 1) continue;
      const info = roster.get(id) || {};
      const hurt = now - (s.hurtAt.get(id) || 0) < 140;
      const inBush = RyWorld.inBush(ar, k[0], k[1]);
      // Op het bord zie je de hele arena: dan tekenen we de ridders wat groter, zodat de klas ze herkent.
      ctx.save();
      ctx.translate(k[0], k[1]);
      ctx.scale(big, big);
      const art = paintedKnight(info.color || '#4cc9ff');
      if (art) {
        const glowC = hurt ? 'rgba(255,77,109,.7)' : (k[4] & 2) ? 'rgba(76,201,255,.45)' : (k[4] & 4) ? 'rgba(120,200,255,.35)' : null;
        if (glowC) { ctx.fillStyle = glowC; ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = inBush ? .55 : 1;
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.ellipse(3, 5, R * 1.1, R * .9, 0, 0, Math.PI * 2); ctx.fill();
        // Geschilderde ridder: kijkt naar rechts, net als hoek 0.
        ctx.rotate(k[2]);
        const hh = R * 3.2, ww = hh * art.width / art.height;
        ctx.drawImage(art, -ww * .42, -hh / 2, ww, hh);
        ctx.restore();
      } else {
      AK.knight(ctx, 0, 0, k[2], {
        r: R, color: info.color || '#4cc9ff', kind: 'royale', t: t + id * .7, moving: true,
        glow: hurt ? 'rgba(255,77,109,.7)' : (k[4] & 2) ? 'rgba(76,201,255,.45)' : (k[4] & 4) ? 'rgba(120,200,255,.35)' : null,
        alpha: inBush ? .55 : 1,
      });
      ctx.restore();
      }
      if (k[4] & 8) {
        // Schild: een zeshoekig energieveld dat ronddraait
        const rr = (R + 9) * big;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(120,220,255,.85)';
        ctx.fillStyle = 'rgba(120,220,255,.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](k[0] + Math.cos(a) * rr, k[1] + Math.sin(a) * rr); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (k[4] & 4) {
        // Traag: ijskristallen rond de ridder
        for (let i = 0; i < 4; i++) {
          const a = t * 1.5 + (i * Math.PI) / 2;
          const cx = k[0] + Math.cos(a) * (R + 10), cy = k[1] + Math.sin(a) * (R + 10);
          AK.glow(ctx, cx, cy, 8, '#9fe8ff', .7);
          ctx.fillStyle = 'rgba(220,245,255,.95)';
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
        }
      }
    }
    // Schoten
    for (const sh of [...s.shots.values(), ...s.local.values()]) {
      if (vis(sh.x, sh.y)) AK.bolt(ctx, sh.x, sh.y, sh.vx, sh.vy, sh.big ? '#ffd166' : '#ff4d6d', sh.big ? 12 : 6, sh.big ? .08 : .04);
    }
    // Vuurschalen en vuurvliegjes
    s.lights.forEach((l, i) => { if (vis(l.x, l.y, 60)) brazier(ctx, l, t, i); });
    motes(ctx, ar, t, vis, opts.board ? 40 : 60);
    s.fx.draw(ctx);
    // Struiken bovenop
    ar.bushes.forEach((bu, i) => {
      if (!vis(bu.x, bu.y)) return;
      const img = s.bushes[i];
      const sway = Math.sin(t * 1.3 + i) * .03;
      ctx.save();
      ctx.translate(bu.x, bu.y);
      ctx.rotate(sway);
      ctx.globalAlpha = opts.board ? .8 : .95;
      ctx.drawImage(img.canvas, -img.s / 2, -img.s / 2);
      ctx.restore();
    });
    // Namen en levens bovenaan
    for (const [id, k] of list) {
      if (k[4] & 1) continue;
      const info = roster.get(id) || {};
      if (opts.names !== false) {
        AK.bar(ctx, k[0], k[1] - R * big - 12 * big, R * 2.4 * big, k[3] / 100);
        AK.label(ctx, (k[4] & 2) ? `${info.name || ''} ⚡` : info.name || '', k[0], k[1] - R * big - 18 * big, me && id === me.n ? '#ffc94a' : '#e8f1ff', Math.round(12 * big));
      }
    }
    // De neonstorm: buiten de cirkel kolkende paarse wolken, met een knetterende rand en bliksem.
    const zn = s.zone(now);
    if (zn) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
      ctx.arc(zn.x, zn.y, Math.max(1, zn.r), 0, Math.PI * 2, true);
      ctx.clip('evenodd');
      const cl = stormCloud();
      const pat = ctx.createPattern(cl, 'repeat');
      ctx.globalAlpha = opts.board ? .5 : .42;
      for (const [sc, spd, rot] of [[1.6, 22, t * .03], [1.1, -35, -t * .05]]) {
        pat.setTransform(new DOMMatrix().translateSelf(t * spd, t * spd * .4).rotateSelf(rot * 57.3).scaleSelf(sc, sc));
        ctx.fillStyle = pat;
        ctx.fillRect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
        ctx.globalAlpha = .22;
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.restore();
      // Bliksem in de storm, af en toe
      if (Math.random() < (opts.board ? .04 : .03) && s.strikes.length < 3) {
        const a = Math.random() * Math.PI * 2, d = zn.r + 40 + Math.random() * 260;
        const x = zn.x + Math.cos(a) * d, y = zn.y + Math.sin(a) * d;
        if (vis(x, y, 100)) s.strikes.push({ x0: x + (Math.random() - .5) * 200, y0: y - 220, x1: x, y1: y, life: .22 });
      }
      s.strikes = s.strikes.filter(st => (st.life -= 1 / 60) > 0);
      for (const st of s.strikes) {
        AK.glow(ctx, st.x1, st.y1, 160, '#d08bff', st.life * 3);
        AK.lightning(ctx, st.x0, st.y0, st.x1, st.y1, '#e2b6ff', 3 / Math.max(.5, z));
      }
      // Knetterende rand
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lw = 1 / Math.max(.4, z);
      ctx.strokeStyle = 'rgba(199,125,255,.35)';
      ctx.lineWidth = 16 * lw;
      ctx.beginPath();
      ctx.arc(zn.x, zn.y, Math.max(1, zn.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#f0b8ff';
      ctx.lineWidth = 4 * lw;
      ctx.beginPath();
      const segs = Math.min(220, Math.max(60, Math.round(zn.r / 12)));
      const seed = Math.floor(t * 14);
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const j = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        const rr = zn.r + ((j - Math.floor(j)) - .5) * 9 * lw;
        ctx[i ? 'lineTo' : 'moveTo'](zn.x + Math.cos(a) * rr, zn.y + Math.sin(a) * rr);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1.5 * lw;
      ctx.beginPath();
      ctx.arc(zn.x, zn.y, Math.max(1, zn.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // De volgende cirkel, gestippeld
      const next = ar.zones[Math.min(ar.zones.length - 1, zn.phase + 1)];
      if (next && !zn.shrinking && zn.phase < ar.zones.length - 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.setLineDash([16, 12]);
        ctx.lineDashOffset = -t * 20;
        ctx.lineWidth = 3 / Math.max(.4, z);
        ctx.beginPath();
        ctx.arc(next.x, next.y, Math.max(1, next.r), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    AK.vignette(ctx, w, h, opts.board ? .45 : .6);
    // Rode rand bij schade
    if (s.flash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, `rgba(255,0,40,${s.flash * .45})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Een kaartje van de arena met de storm en de ridders.
  function minimap(ctx, s, x, y, size, me = null) {
    if (!s.ar) return;
    const ar = s.ar;
    const k = size / (ar.size * 2);
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(3,6,13,.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,80,70,.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const zn = s.zone();
    if (zn) {
      ctx.strokeStyle = '#e07bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + zn.x * k, cy + zn.y * k, Math.max(1, zn.r * k), 0, Math.PI * 2);
      ctx.stroke();
      const next = ar.zones[Math.min(ar.zones.length - 1, zn.phase + 1)];
      if (next && !zn.shrinking) {
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx + next.x * k, cy + next.y * k, Math.max(1, next.r * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (me) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + me.x * k, cy + me.y * k, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { Scene, render, minimap };
})();
