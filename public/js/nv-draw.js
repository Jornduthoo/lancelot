// Neonvlucht tekenen: een gang door de neonburcht in perspectief, met drie lichtbanen, hindernissen, munten,
// vraagpoorten en de ridders (jij in het groot, de anderen als schimmen). Voor de leerling en voor het bord.
// Gebruikt Glow (fx.js), AK (arena-kit.js) en NvWorld.
const NvDraw = (() => {
  const { glow, rgba } = Glow;
  const TAU = Math.PI * 2;
  const WALL = 3.9, WALL_H = 4.6, ROAD = 3.4, FAR = 115;
  const GATE_COL = ['#ff4d6d', '#3d8bff', '#ffc94a'];

  // Geschilderde beelden. Zolang ze niet geladen zijn (of als er een ontbreekt) tekenen we zelf.
  const ART = {};
  const tintCache = new Map();
  if (typeof Image !== 'undefined') {
    for (const n of ['achtergrond', 'muur', 'hek', 'zuil', 'laser', 'kisten', 'rol', 'munt', 'poort', 'ridder']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; sky = null; tintCache.clear(); };
      img.src = `/img/neonvlucht/${n}.webp`;
    }
  }
  // De ridder in de kleur van de speler: blauwe pluim en cape krijgen de spelerkleur (één keer per kleur).
  function tinted(color) {
    let c = tintCache.get(color);
    if (c) return c;
    const img = ART.ridder;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    const [tr, tg, tb] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 10) continue;
      const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      if (mx - mn < .001 || mx !== b) continue;
      const sat = (mx - mn) / mx;
      let hue = 60 * (4 + (r - gg) / (mx - mn));
      if (hue < 205 || hue > 258 || sat < .38) continue;
      const l = (r * .3 + gg * .59 + b * .11) * 2.4;
      px[i] = Math.min(255, tr * l); px[i + 1] = Math.min(255, tg * l); px[i + 2] = Math.min(255, tb * l);
    }
    g.putImageData(d, 0, 0);
    tintCache.set(color, c);
    return c;
  }

  // ---------- De lucht boven de gang, één keer per schermgrootte ----------
  let sky = null;
  function bakeSky(w, hy) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.ceil(hy + 4);
    const g = c.getContext('2d');
    if (ART.achtergrond) {
      // Het verdwijnpunt van het schilderij (midden) op de horizon van de gang
      const img = ART.achtergrond, iw = Math.max(w, hy * 2.2 * img.width / img.height), ih = iw * img.height / img.width;
      g.drawImage(img, (w - iw) / 2, hy - ih * .5, iw, ih);
      return c;
    }
    const grad = g.createLinearGradient(0, 0, 0, hy);
    grad.addColorStop(0, '#04030f');
    grad.addColorStop(.6, '#160b33');
    grad.addColorStop(1, '#3a1260');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, c.height);
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) {
      const b = r();
      g.fillStyle = `rgba(220, 230, 255, ${.3 + b * .6})`;
      g.fillRect(r() * w, r() * hy * .8, b > .9 ? 2 : 1, b > .9 ? 2 : 1);
    }
    // Maan en noorderlicht
    glow(g, w * .78, hy * .28, hy * .5, '#7a5cff', .35);
    g.fillStyle = '#e9e4ff';
    g.beginPath(); g.arc(w * .78, hy * .28, hy * .09, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160, 140, 230, .5)';
    g.beginPath(); g.arc(w * .78 + hy * .025, hy * .27, hy * .07, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) glow(g, w * (.1 + i * .2), hy * (.45 + (i % 2) * .1), hy * .35, i % 2 ? '#2de2c8' : '#c77dff', .12);
    // Verre burcht op de horizon
    g.fillStyle = '#0a0618';
    const base = hy;
    g.beginPath();
    g.moveTo(0, base);
    let x = 0;
    while (x < w) {
      const tw = 14 + r() * 40, th = 10 + r() * hy * .22;
      g.lineTo(x, base - th);
      if (r() < .4) { g.lineTo(x + tw / 2, base - th - 18); }
      g.lineTo(x + tw, base - th);
      x += tw + r() * 20;
      g.lineTo(x, base - 6 - r() * 10);
    }
    g.lineTo(w, base);
    g.closePath();
    g.fill();
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r() < .5 ? '#ffcf6b' : '#7df9ff';
      g.fillRect(r() * w, base - 8 - r() * hy * .15, 2, 3);
    }
    return c;
  }

  // ---------- Camera ----------
  function cam(w, h, x, z) {
    return { w, h, hy: h * (w < h ? .46 : .36), F: Math.min(h, w * .95), x: x * .5, y: 3.1, z: z - 6.8 };
  }
  const P = (c, x, y, z) => {
    const dz = Math.max(.3, z - c.z);
    const s = c.F / dz;
    return { x: c.w / 2 + (x - c.x) * s, y: c.hy + (c.y - y) * s, s };
  };

  function quad(ctx, a, b, cc, d) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(cc.x, cc.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  }

  // ---------- De gang ----------
  function corridor(ctx, c, t) {
    const z0 = c.z + 1.2, z1 = c.z + FAR;
    // Vloer
    ctx.fillStyle = '#0b0e1a';
    quad(ctx, P(c, -ROAD, 0, z0), P(c, ROAD, 0, z0), P(c, ROAD, 0, z1), P(c, -ROAD, 0, z1));
    ctx.fill();
    // Tegels: elke 4 meter een lichtere band (geeft het gevoel van snelheid)
    ctx.fillStyle = '#141a2c';
    for (let z = Math.floor(z0 / 4) * 4; z < z1; z += 4) {
      if ((z / 4) % 2) continue;
      const a = Math.max(z, z0), b = Math.min(z + 2, z1);
      if (b <= a) continue;
      quad(ctx, P(c, -ROAD, 0, a), P(c, ROAD, 0, a), P(c, ROAD, 0, b), P(c, -ROAD, 0, b));
      ctx.fill();
    }
    // Muren links en rechts
    for (const side of [-1, 1]) {
      const x = WALL * side;
      const grad = ctx.createLinearGradient(P(c, x, 0, z0).x, 0, P(c, x, 0, z1).x, 0);
      grad.addColorStop(0, '#2a2d40');
      grad.addColorStop(1, '#0d0e18');
      ctx.fillStyle = grad;
      quad(ctx, P(c, x, 0, z0), P(c, x, WALL_H, z0), P(c, x, WALL_H, z1), P(c, x, 0, z1));
      ctx.fill();
      if (ART.muur) wallStrips(ctx, c, x, z0, Math.min(z1, c.z + 48));
      // Strook tussen vloer en muur
      ctx.fillStyle = '#06070d';
      quad(ctx, P(c, ROAD * side, 0, z0), P(c, x, 0, z0), P(c, x, 0, z1), P(c, ROAD * side, 0, z1));
      ctx.fill();
    }
    // Pilaren, fakkels en vaandels, van ver naar dichtbij
    const first = Math.ceil(z0 / 6) * 6;
    for (let z = Math.floor(z1 / 6) * 6; z >= first; z -= 6) {
      for (const side of [-1, 1]) {
        const x = WALL * side, xi = (WALL - .35) * side;
        const a = P(c, x, 0, z), b = P(c, xi, 0, z), a2 = P(c, x, WALL_H + .4, z), b2 = P(c, xi, WALL_H + .4, z);
        const a3 = P(c, xi, WALL_H + .4, z + .9), b3 = P(c, xi, 0, z + .9);
        ctx.fillStyle = '#353a52';
        quad(ctx, a, b, b2, a2);
        ctx.fill();
        ctx.fillStyle = '#23263a';
        quad(ctx, b, b3, a3, b2);
        ctx.fill();
        if (z % 12 === 0) {
          const f = P(c, xi, 2.7, z + .45);
          glow(ctx, f.x, f.y, f.s * 1.3, '#ffb347', .55 + Math.sin(t * 9 + z) * .12);
          glow(ctx, f.x, f.y, f.s * .35, '#fff1c4', .9);
        } else if (z % 18 === 0) {
          // Vaandel tussen twee pilaren
          const p0 = P(c, x * .995, 4.1, z + 1.8), p1 = P(c, x * .995, 4.1, z + 4.2), p2 = P(c, x * .995, 1.9, z + 4.2), p3 = P(c, x * .995, 2.3, z + 3), p4 = P(c, x * .995, 1.9, z + 1.8);
          ctx.fillStyle = (z / 18) % 2 ? '#1f4fbf' : '#8a1c3c';
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#ffc94a';
          ctx.lineWidth = Math.max(1, p0.s * .05);
          ctx.stroke();
          const m = P(c, x * .995, 3.2, z + 3);
          ctx.fillStyle = '#ffc94a';
          ctx.beginPath(); ctx.arc(m.x, m.y, m.s * .22, 0, TAU); ctx.fill();
        }
      }
    }
    // Neonlijnen: de banen en de randen (rechte lijnen blijven recht in perspectief)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // Elke lijn is een smalle strook op de vloer, zodat ze in de verte vanzelf dunner wordt.
    for (const [x, col, wd] of [[-1.1, '#4cc9ff', .07], [1.1, '#4cc9ff', .07], [-ROAD, '#c77dff', .1], [ROAD, '#c77dff', .1]]) {
      ctx.fillStyle = rgba(col, .18);
      quad(ctx, P(c, x - wd * 2.5, .01, z0), P(c, x + wd * 2.5, .01, z0), P(c, x + wd * 2.5, .01, z1), P(c, x - wd * 2.5, .01, z1));
      ctx.fill();
      ctx.fillStyle = rgba(col, .95);
      quad(ctx, P(c, x - wd / 2, .01, z0), P(c, x + wd / 2, .01, z0), P(c, x + wd / 2, .01, z1), P(c, x - wd / 2, .01, z1));
      ctx.fill();
    }
    // Lichtpulsen die over de banen naar je toe schieten
    for (let i = 0; i < 6; i++) {
      const z = c.z + FAR - ((t * 40 + i * 19) % (FAR - 2));
      for (const x of [-1.1, 1.1]) {
        const p = P(c, x, .02, z);
        glow(ctx, p.x, p.y, p.s * .35, '#bff3ff', .45);
      }
    }
    ctx.restore();
  }

  // De geschilderde muur in smalle stroken (elke strook is bijna een parallellogram), van ver naar dichtbij donkerder in de verte.
  function wallStrips(ctx, c, x, z0, z1) {
    const img = ART.muur, TW = WALL_H, n = 4, dz = TW / n, cw = img.width / n;
    ctx.save();
    for (let z = Math.floor(z0 / dz) * dz; z < z1; z += dz) {
      const a = P(c, x, WALL_H, Math.max(z, z0)), b = P(c, x, WALL_H, z + dz), a0 = P(c, x, 0, Math.max(z, z0));
      const k = Math.round(((z / dz) % n + n) % n);
      const fog = Math.min(1, (z - c.z) / 48);
      ctx.globalAlpha = 1 - fog * .85;
      ctx.setTransform((b.x - a.x) / cw, (b.y - a.y) / cw, 0, (a0.y - a.y) / img.height, a.x, a.y);
      ctx.drawImage(img, k * cw, 0, cw + .6, img.height, 0, 0, cw + .6, img.height);
    }
    ctx.restore();
  }

  // Een geschilderd voorwerp rechtop op de baan: breedte wd en hoogte ht in meter, onderaan op hoogte y0.
  function sprite(ctx, c, img, lx, y0, z, wd, ht) {
    const a = P(c, lx - wd / 2, y0 + ht, z), b = P(c, lx + wd / 2, y0, z);
    ctx.drawImage(img, a.x, a.y, b.x - a.x, b.y - a.y);
  }
  const pick = (o, list) => list[Math.abs(Math.round(o.z * 7 + o.lane * 3)) % list.length];

  // ---------- Hindernissen ----------
  function obstacle(ctx, c, o, t) {
    const lx = NvWorld.LANE_X[o.lane];
    if (o.type === 'munt' && ART.munt) {
      const p = P(c, lx, o.y + .35, o.z);
      const r = p.s * .36, sx = Math.abs(Math.cos(t * 4 + o.z));
      glow(ctx, p.x, p.y, r * 2.4, '#ffc94a', .45);
      ctx.drawImage(ART.munt, p.x - r * Math.max(.12, sx), p.y - r, r * 2 * Math.max(.12, sx), r * 2);
      return;
    }
    const shade = (img, wd, ht, y0 = 0) => {
      const g0 = P(c, lx, 0, o.z);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(g0.x, g0.y, g0.s * wd * .5, g0.s * .14, 0, 0, TAU); ctx.fill();
      sprite(ctx, c, img, lx, y0, o.z, wd, ht);
    };
    if (o.type === 'blok') {
      const name = pick(o, ['zuil', 'kisten']), img = ART[name];
      if (img) { const ht = name === 'zuil' ? 2.3 : 1.9; return shade(img, ht * img.width / img.height, ht); }
    } else if (o.type === 'laag') {
      const name = pick(o, ['hek', 'rol']), img = ART[name];
      if (img) { const wd = 2.1; return shade(img, wd, wd * img.height / img.width * (name === 'rol' ? .95 : .55)); }
    } else if (o.type === 'hoog' && ART.laser) {
      // Een laserstraal tussen twee palen: hoog genoeg om onder door te glijden
      shade(ART.laser, 2.1, 1.85);
      const q = P(c, lx, 1.62, o.z);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, q.x, q.y, q.s * .9, '#ff3355', .35 + Math.sin(t * 14 + o.z) * .1);
      ctx.restore();
      return;
    }
    if (o.type === 'munt') {
      const p = P(c, lx, o.y + .35, o.z);
      const r = p.s * .32, sx = Math.abs(Math.cos(t * 4 + o.z));
      glow(ctx, p.x, p.y, r * 2.6, '#ffc94a', .5);
      ctx.fillStyle = '#b8860b';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, r * sx), r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd95a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(.5, r * sx * .75), r * .75, 0, 0, TAU); ctx.fill();
      return;
    }
    const hw = .95;
    if (o.type === 'blok') {
      // Een zware metalen kist met een lichtende rune
      const d = 1.2, hgt = 1.7;
      const f0 = P(c, lx - hw, 0, o.z), f1 = P(c, lx + hw, 0, o.z), f2 = P(c, lx + hw, hgt, o.z), f3 = P(c, lx - hw, hgt, o.z);
      const b2 = P(c, lx + hw, hgt, o.z + d), b3 = P(c, lx - hw, hgt, o.z + d);
      ctx.fillStyle = '#5a6078';
      quad(ctx, f3, f2, b2, b3);
      ctx.fill();
      const side = lx < c.x ? 1 : -1;
      const s0 = P(c, lx + hw * side, 0, o.z), s1 = P(c, lx + hw * side, 0, o.z + d), s2 = P(c, lx + hw * side, hgt, o.z + d), s3 = P(c, lx + hw * side, hgt, o.z);
      ctx.fillStyle = '#20232f';
      quad(ctx, s0, s1, s2, s3);
      ctx.fill();
      const grad = ctx.createLinearGradient(0, f3.y, 0, f0.y);
      grad.addColorStop(0, '#4a4f66');
      grad.addColorStop(1, '#2a2d3c');
      ctx.fillStyle = grad;
      quad(ctx, f0, f1, f2, f3);
      ctx.fill();
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = Math.max(1, f0.s * .06);
      ctx.stroke();
      const m = P(c, lx, hgt / 2, o.z);
      glow(ctx, m.x, m.y, m.s * .9, '#ff4d6d', .7);
      ctx.fillStyle = '#ffd0d8';
      const k = m.s * .28;
      ctx.beginPath(); ctx.moveTo(m.x, m.y - k); ctx.lineTo(m.x + k * .7, m.y); ctx.lineTo(m.x, m.y + k); ctx.lineTo(m.x - k * .7, m.y); ctx.closePath(); ctx.fill();
      return;
    }
    // Laag (springen) of hoog (glijden): twee palen met een lichtende balk
    const low = o.type === 'laag';
    const col = low ? '#ff3355' : '#c77dff';
    const top = low ? .85 : 2.4, y0 = low ? .25 : 1.05, y1 = low ? .7 : 1.75;
    for (const sx of [-1, 1]) {
      const a = P(c, lx + sx * hw, 0, o.z), b = P(c, lx + sx * hw, top, o.z);
      ctx.strokeStyle = '#3a3f55';
      ctx.lineWidth = Math.max(2, a.s * .14);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      glow(ctx, b.x, b.y, b.s * .3, col, .9);
    }
    const q0 = P(c, lx - hw, y0, o.z), q1 = P(c, lx + hw, y0, o.z), q2 = P(c, lx + hw, y1, o.z), q3 = P(c, lx - hw, y1, o.z);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(col, .28 + Math.sin(t * 14 + o.z) * .06);
    quad(ctx, q0, q1, q2, q3);
    ctx.fill();
    ctx.strokeStyle = rgba(col, .95);
    ctx.lineWidth = Math.max(1.5, q0.s * .06);
    for (const yy of low ? [y0, y1] : [y0, (y0 + y1) / 2, y1]) {
      const a = P(c, lx - hw, yy, o.z), b = P(c, lx + hw, yy, o.z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Vraagpoort ----------
  function gate(ctx, c, g, t) {
    const lanes = g.answers.length === 2 ? [0, 2] : [0, 1, 2];
    if (ART.poort) {
      const img = ART.poort, wd = 7.4, ht = wd * img.height / img.width;
      const a = P(c, -wd / 2, ht, g.z), b = P(c, wd / 2, 0, g.z);
      lanes.forEach((lane, i) => {
        const lx = NvWorld.LANE_X[lane];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(GATE_COL[i], g.picked === i ? .5 : .2);
        quad(ctx, P(c, lx - .9, 0, g.z), P(c, lx + .9, 0, g.z), P(c, lx + .9, 3.4, g.z), P(c, lx - .9, 3.4, g.z));
        ctx.fill();
        ctx.restore();
      });
      ctx.drawImage(img, a.x, a.y, b.x - a.x, b.y - a.y);
      if (g.answers.length === 2) obstacle(ctx, c, { lane: 1, type: 'blok', z: g.z - .1 }, t);
      lanes.forEach((lane, i) => {
        const lx = NvWorld.LANE_X[lane], col = GATE_COL[i];
        const p0 = P(c, lx - .95, 3.15, g.z - .05), p1 = P(c, lx + .95, 2.4, g.z - .05);
        board(ctx, p0, p1, col, `${'ABC'[i]}  ${g.answers[i]}`);
      });
      return;
    }
    if (g.answers.length === 2) obstacle(ctx, c, { lane: 1, type: 'blok', z: g.z }, t);
    lanes.forEach((lane, i) => {
      const lx = NvWorld.LANE_X[lane], col = GATE_COL[i];
      const a = P(c, lx - 1, 0, g.z), b = P(c, lx + 1, 0, g.z), top = P(c, lx - 1, 3.4, g.z), top2 = P(c, lx + 1, 3.4, g.z);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(col, g.picked === i ? .45 : .16);
      quad(ctx, a, b, P(c, lx + 1, 2.5, g.z), P(c, lx - 1, 2.5, g.z));
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, a.s * .12);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(top.x, top.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      glow(ctx, top.x, top.y, top.s * .5, col, .8);
      glow(ctx, top2.x, top2.y, top2.s * .5, col, .8);
      // Bord met de letter en het antwoord
      const p0 = P(c, lx - .95, 3.35, g.z), p1 = P(c, lx + .95, 2.55, g.z);
      ctx.fillStyle = 'rgba(6, 10, 19, .85)';
      ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
      ctx.fillStyle = col;
      ctx.fillRect(p0.x, p0.y, p1.x - p0.x, Math.max(2, (p1.y - p0.y) * .12));
      const fs = (p1.y - p0.y) * .42;
      if (fs > 5) {
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let text = `${'ABC'[i]}  ${g.answers[i]}`;
        ctx.font = `800 ${Math.round(fs)}px Rajdhani, Orbitron, sans-serif`;
        const maxW = (p1.x - p0.x) * .92;
        while (ctx.measureText(text).width > maxW && text.length > 4) text = text.slice(0, -2) + '…';
        ctx.fillText(text, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + fs * .1);
        ctx.textBaseline = 'alphabetic';
      }
    });
  }

  function board(ctx, p0, p1, col, label) {
    ctx.fillStyle = 'rgba(6, 10, 19, .88)';
    ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    ctx.fillStyle = col;
    ctx.fillRect(p0.x, p0.y, p1.x - p0.x, Math.max(2, (p1.y - p0.y) * .12));
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, (p1.y - p0.y) * .05);
    ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    const fs = (p1.y - p0.y) * .42;
    if (fs > 5) {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let text = label;
      ctx.font = `800 ${Math.round(fs)}px Rajdhani, Orbitron, sans-serif`;
      const maxW = (p1.x - p0.x) * .92;
      while (ctx.measureText(text).width > maxW && text.length > 4) text = text.slice(0, -2) + '…';
      ctx.fillText(text, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + fs * .1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ---------- De ridder, van achteren ----------
  // o: { color, alpha, jump (hoogte), slide (0-1), stride, turbo, shield, trail, name }
  function runner(ctx, c, x, y, z, o, t) {
    const g = P(c, x, 0, z);
    const p = P(c, x, y, z);
    const s = p.s;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    // Schaduw
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y, s * .55 / (1 + y * .3), s * .16 / (1 + y * .3), 0, 0, TAU); ctx.fill();
    // Lichtspoor
    const tr = NvWorld.trailOf(o.coins || 0);
    const tcol = tr.color === 'rainbow' ? `hsl(${(t * 220) % 360}, 90%, 62%)` : tr.color;
    if (o.turbo || tr.coins > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 5; i++) {
        const q = P(c, x, y + .9, z - i * .9);
        glow(ctx, q.x, q.y, q.s * (o.turbo ? .9 : .5), tcol, (o.turbo ? .45 : .22) * (1 - i / 6));
      }
      ctx.restore();
    }
    const cx = p.x, by = p.y;
    const slide = o.slide || 0;
    if (ART.ridder) {
      // Geschilderde ridder: bij elke pas spiegelen we hem even, zo lijkt hij te lopen.
      const img = tinted(o.color), st = o.stride || 0, air = y > .05;
      const hgt = 2.05 * s * (1 - slide * .45), wd = hgt / (1 - slide * .45) * img.width / img.height;
      const bob = air ? 0 : Math.abs(Math.sin(st)) * s * .06;
      ctx.translate(cx, by - bob);
      if (!air && Math.sin(st) < 0) ctx.scale(-1, 1);
      ctx.rotate(air ? 0 : Math.sin(st) * .05);
      ctx.drawImage(img, -wd / 2, -hgt, wd, hgt);
      ctx.restore();
      return runnerExtras(ctx, o, cx, by, s, t, tr);
    }
    ctx.translate(cx, by);
    ctx.scale(s / 100, s / 100);
    if (slide > 0) ctx.scale(1, 1 - slide * .5);
    const st = o.stride || 0;
    const air = y > .05;
    const legA = air ? .5 : Math.sin(st) * .9, legB = air ? -.3 : -Math.sin(st) * .9;
    // Benen: scheenplaten met gouden knieën
    for (const [dx, k] of [[-13, legA], [13, legB]]) {
      const lift = Math.max(0, k) * 22;
      ctx.fillStyle = '#23263a';
      AK.roundRect(ctx, dx - 9, -66 + lift * .2, 18, 54 - lift * .6, 7);
      ctx.fill();
      ctx.fillStyle = '#6a7090';
      AK.roundRect(ctx, dx - 7, -60 + lift * .2, 6, 40 - lift * .6, 3);
      ctx.fill();
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(dx, -46 + lift * .1, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d4256';
      AK.roundRect(ctx, dx - 10, -16 - lift * .45, 20, 15, 5);
      ctx.fill();
    }
    // Armen (achter de cape)
    for (const [dx, k] of [[-37, -legA], [37, -legB]]) {
      ctx.fillStyle = '#3d4256';
      AK.roundRect(ctx, dx - 10, -134 + k * 12, 20, 50, 9);
      ctx.fill();
      ctx.fillStyle = '#7a809e';
      AK.roundRect(ctx, dx - 7, -128 + k * 12, 6, 34, 3);
      ctx.fill();
      ctx.fillStyle = '#ffc94a';
      ctx.fillRect(dx - 10, -98 + k * 12, 20, 5);
    }
    // Cape in de kleur van de speler, met gouden rand en een lichtende rune
    const wave = Math.sin(t * 10 + st) * 6;
    const capeDark = AK.shade(o.color, -.45);
    ctx.fillStyle = capeDark;
    ctx.beginPath();
    ctx.moveTo(-28, -142);
    ctx.lineTo(28, -142);
    ctx.quadraticCurveTo(38 + wave, -95, 33 + wave * 1.6, -44);
    ctx.lineTo(-33 - wave * 1.6, -44);
    ctx.quadraticCurveTo(-38 - wave, -95, -28, -142);
    ctx.fill();
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.moveTo(-22, -142);
    ctx.lineTo(22, -142);
    ctx.quadraticCurveTo(28 + wave, -98, 22 + wave * 1.3, -50);
    ctx.lineTo(-22 - wave * 1.3, -50);
    ctx.quadraticCurveTo(-28 - wave, -98, -22, -142);
    ctx.fill();
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(33 + wave * 1.6, -44); ctx.lineTo(-33 - wave * 1.6, -44); ctx.stroke();
    glow(ctx, 0, -100, 26, '#7df9ff', .55);
    ctx.fillStyle = '#e6fbff';
    ctx.beginPath(); ctx.moveTo(0, -114); ctx.lineTo(9, -100); ctx.lineTo(0, -86); ctx.lineTo(-9, -100); ctx.closePath(); ctx.fill();
    // Schouderstukken
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#5a6078';
      ctx.beginPath(); ctx.ellipse(side * 30, -142, 22, 15, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#8a90ae';
      ctx.beginPath(); ctx.ellipse(side * 30 - 4, -146, 12, 7, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(side * 30, -142, 22, 15, 0, Math.PI, TAU); ctx.stroke();
    }
    // Helm met kam
    ctx.fillStyle = '#4a4f66';
    ctx.beginPath(); ctx.arc(0, -168, 23, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a809e';
    ctx.beginPath(); ctx.arc(-7, -175, 10, Math.PI * 1.1, Math.PI * 1.8); ctx.lineTo(-7, -175); ctx.fill();
    ctx.fillStyle = '#ffc94a';
    ctx.fillRect(-23, -164, 46, 4);
    ctx.fillStyle = o.color;
    ctx.beginPath(); ctx.moveTo(-4, -191); ctx.quadraticCurveTo(-2 - wave * .5, -214, 20, -206 - wave * .4); ctx.quadraticCurveTo(8, -200, 6, -188); ctx.closePath(); ctx.fill();
    ctx.restore();
    runnerExtras(ctx, o, cx, by, s, t, tr);
  }

  // Schild, bliksemvleugels en naam boven de ridder
  function runnerExtras(ctx, o, cx, by, s, t, tr) {
    if (o.shield) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#4cc9ff', .6 + Math.sin(t * 6) * .2);
      ctx.lineWidth = Math.max(1.5, s * .04);
      ctx.beginPath(); ctx.ellipse(cx, by - s * .95, s * .7, s * 1.15, 0, 0, TAU); ctx.stroke();
      glow(ctx, cx, by - s * .95, s * 1.1, '#4cc9ff', .15);
      ctx.restore();
    }
    if (tr.wings) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) AK.lightning(ctx, cx + side * s * .3, by - s * 1.3, cx + side * s * 1.1, by - s * 1.7, '#d9a8ff', Math.max(1, s * .03), .25);
      ctx.restore();
    }
    if (o.name) {
      const fs = Math.max(11, Math.min(20, s * .22));
      ctx.font = `800 ${Math.round(fs)}px Rajdhani, Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(o.name).width + 10;
      ctx.globalAlpha = Math.min(1, (o.alpha || 1) + .4);
      ctx.fillStyle = 'rgba(4, 6, 12, .75)';
      ctx.fillRect(cx - tw / 2, by - s * 2.25 - fs, tw, fs * 1.25);
      ctx.fillStyle = o.color;
      ctx.fillText(o.name, cx, by - s * 2.25);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Alles samen ----------
  // view: { z, x, seed, t, ghosts: [{x, z, y, color, name, coins, stride, turbo}], me: {...} of null, gate, hide: Set van munt-id's, clear: [z0, z1] }
  function render(ctx, w, h, v) {
    const c = cam(w, h, v.x, v.z);
    if (!sky || sky.width !== w || sky.hy !== Math.round(c.hy)) { sky = bakeSky(w, c.hy); sky.hy = Math.round(c.hy); }
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, c.hy, w, h - c.hy);
    ctx.drawImage(sky, 0, 0);
    corridor(ctx, c, v.t);
    // Alles op de baan, van ver naar dichtbij
    const items = [];
    for (const o of NvWorld.between(v.seed, c.z + 1.5, c.z + FAR - 5)) {
      if (o.type === 'munt' && v.hide && v.hide.has(o.id)) continue;
      if (v.clear && o.z >= v.clear[0] && o.z <= v.clear[1]) continue;
      items.push({ z: o.z, o });
    }
    if (v.gate && v.gate.z > c.z + 1.5) items.push({ z: v.gate.z, gate: v.gate });
    for (const gh of v.ghosts || []) if (gh.z > c.z + 1.8 && gh.z < c.z + FAR - 10) items.push({ z: gh.z + .01, ghost: gh });
    items.sort((a, b) => b.z - a.z);
    const meZ = v.me ? v.me.z : -1;
    let drewMe = false;
    for (const it of items) {
      if (v.me && !drewMe && it.z < meZ) { drewMe = true; runner(ctx, c, v.me.x, v.me.y, v.me.z, v.me, v.t); }
      if (it.o) obstacle(ctx, c, it.o, v.t);
      else if (it.gate) gate(ctx, c, it.gate, v.t);
      else runner(ctx, c, it.ghost.x, it.ghost.y || 0, it.ghost.z, it.ghost, v.t);
    }
    if (v.me && !drewMe) runner(ctx, c, v.me.x, v.me.y, v.me.z, v.me, v.t);
    // Snelheidslijnen bij turbo
    if (v.me && v.me.turbo) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(191, 243, 255, .35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + v.t * .7, r0 = Math.min(w, h) * (.35 + ((v.t * 3 + i * .37) % 1) * .4);
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * r0, c.hy + Math.sin(a) * r0 * .6);
        ctx.lineTo(w / 2 + Math.cos(a) * (r0 + 60), c.hy + Math.sin(a) * (r0 + 60) * .6);
        ctx.stroke();
      }
      ctx.restore();
    }
    AK.vignette(ctx, w, h, .5);
    return c;
  }

  return { render, runner, GATE_COL };
})();
