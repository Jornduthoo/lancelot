// Ridderrace tekenen: de weg in 3D zoals in de oude arcaderaces, de hoverrossen met hun ridders,
// de burcht aan de horizon en het kaartje van het circuit. Alles met canvas, zonder afbeeldingen.
const RaceDraw = (() => {
  const T = Track;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffd166', '#7bf1a8', '#c77dff', '#ff9f1c', '#f15bb5', '#e8f1ff'];
  const colorOf = c => COLORS[((c % COLORS.length) + COLORS.length) % COLORS.length];
  const CAM_H = 1000;
  const DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
  const PLAYER_Z = CAM_H * DEPTH;
  const DRAW = 170;
  const FOG = '#24104a';
  const proj = T.segments.map(() => ({}));
  const bg = { sky: 0, hills: 0 };
  const STARS = Array.from({ length: 90 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 1000) / 1000, (i % 3) + 1]);

  function poly(ctx, pts, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Achtergrond: sterren, een geringde planeet, bergen en de burcht ----------

  function skyline(ctx, W, base, offset, scale, fill, edge) {
    const span = W * 1.4;
    let start = -((offset * span) % span);
    if (start > 0) start -= span;
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, scale * .6);
    for (let x0 = start; x0 < W; x0 += span) {
      ctx.beginPath();
      ctx.moveTo(x0, base);
      // Muren, torens met kantelen en een spitse donjon.
      const parts = [[0, .12], [.08, .2], [.11, .32, 'tower'], [.17, .2], [.3, .14], [.38, .26, 'tower'], [.44, .48, 'spire'], [.5, .26, 'tower'], [.58, .16], [.7, .1], [.8, .22, 'tower'], [.86, .14], [1, .12]];
      for (const [px, ph, kind] of parts) {
        const x = x0 + px * span;
        const y = base - ph * 120 * scale;
        if (kind === 'tower') {
          const w = 18 * scale;
          ctx.lineTo(x - w, y);
          for (let k = 0; k < 4; k++) {
            ctx.lineTo(x - w + (k * 2 * w) / 4, y - 6 * scale);
            ctx.lineTo(x - w + ((k * 2 + 1) * w) / 4, y - 6 * scale);
            ctx.lineTo(x - w + ((k * 2 + 1) * w) / 4, y);
            ctx.lineTo(x - w + ((k * 2 + 2) * w) / 4, y);
          }
          ctx.lineTo(x + w, y);
        } else if (kind === 'spire') {
          const w = 22 * scale;
          ctx.lineTo(x - w, y);
          ctx.lineTo(x, y - 60 * scale);
          ctx.lineTo(x + w, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(x0 + span, base + 400);
      ctx.lineTo(x0, base + 400);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Verlichte ramen.
      ctx.fillStyle = 'rgba(76, 201, 255, .75)';
      for (const px of [.11, .38, .5, .8]) ctx.fillRect(x0 + px * span - 2 * scale, base - 30 * scale, 4 * scale, 8 * scale);
      ctx.fillStyle = fill;
    }
  }

  function hills(ctx, W, base, offset, scale, fill) {
    const span = W * 1.1;
    let start = -((offset * span) % span);
    if (start > 0) start -= span;
    ctx.fillStyle = fill;
    for (let x0 = start; x0 < W; x0 += span) {
      ctx.beginPath();
      ctx.moveTo(x0, base);
      for (let i = 0; i <= 40; i++) {
        const p = i / 40;
        const y = base - (Math.sin(p * Math.PI * 2) * .5 + Math.sin(p * Math.PI * 6 + 1) * .25 + .9) * 40 * scale;
        ctx.lineTo(x0 + p * span, y);
      }
      ctx.lineTo(x0 + span, base + 400);
      ctx.lineTo(x0, base + 400);
      ctx.closePath();
      ctx.fill();
    }
  }

  function background(ctx, W, H, horizon, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#02040d');
    sky.addColorStop(.55, '#0c0a2a');
    sky.addColorStop(.85, '#2b1150');
    sky.addColorStop(1, '#6a1d6e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon + 2);
    ctx.fillStyle = '#081627';
    ctx.fillRect(0, horizon, W, H - horizon);
    const s = Math.max(1, W / 900);
    for (const [sx, sy, r] of STARS) {
      const x = (((sx - bg.sky * .3) % 1) + 1) % 1 * W;
      ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * .8 + sx * 40));
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(x, sy * horizon * .85, r * s * .7, r * s * .7);
    }
    ctx.globalAlpha = 1;
    // Een planeet met een ring, ver weg.
    const px = (((.72 - bg.sky * .5) % 1.4) + 1.4) % 1.4 * W - W * .2;
    const py = horizon * .38;
    const pr = 38 * s;
    const glow = ctx.createRadialGradient(px, py, pr * .5, px, py, pr * 2.4);
    glow.addColorStop(0, 'rgba(199, 125, 255, .35)');
    glow.addColorStop(1, 'rgba(199, 125, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - pr * 2.5, py - pr * 2.5, pr * 5, pr * 5);
    const body = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
    body.addColorStop(0, '#c77dff');
    body.addColorStop(1, '#3a1a6e');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(76, 201, 255, .8)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(px, py, pr * 1.8, pr * .4, -.3, 0, Math.PI * 2); ctx.stroke();
    // Gloed aan de horizon.
    const haze = ctx.createLinearGradient(0, horizon - 60 * s, 0, horizon + 4);
    haze.addColorStop(0, 'rgba(255, 63, 164, 0)');
    haze.addColorStop(1, 'rgba(255, 63, 164, .35)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 60 * s, W, 64 * s);
    hills(ctx, W, horizon + 2, bg.hills * .6, s, '#120b30');
    skyline(ctx, W, horizon + 2, bg.hills, s, '#0b0a24', 'rgba(76, 201, 255, .55)');
  }

  // ---------- De weg ----------

  function project(P, k, camX, camY, camZ, y, z, W, H) {
    const cz = z - camZ;
    const scale = DEPTH / cz;
    P[`z${k}`] = cz;
    P[`s${k}`] = scale;
    P[`x${k}`] = W / 2 - scale * camX * W / 2;
    P[`y${k}`] = H / 2 - scale * (y - camY) * H / 2;
    P[`w${k}`] = scale * T.ROAD * W / 2;
  }

  function segment(ctx, W, s, P, maxy, fog, t) {
    let { x1, y1, w1 } = P;
    const { x2, y2, w2 } = P;
    // Het stuk dat achter een heuvel verdwijnt, wegknippen.
    if (y1 > maxy) {
      const k = (y1 - maxy) / (y1 - y2);
      x1 += (x2 - x1) * k;
      w1 += (w2 - w1) * k;
      y1 = maxy;
    }
    const alt = Math.floor(s.i / 3) % 2;
    ctx.fillStyle = alt ? '#0a1a2c' : '#0d2136';
    ctx.fillRect(0, y2, W, y1 - y2 + 1);
    // Neonlijnen op het gras, zoals een raster.
    if (s.i % 6 === 0) {
      ctx.fillStyle = 'rgba(76, 201, 255, .16)';
      ctx.fillRect(0, y2, W, Math.max(1, (y1 - y2) * .25));
    }
    const r1 = w1 * 1.14;
    const r2 = w2 * 1.14;
    const rumble = alt ? '#4cc9ff' : '#1b4f7a';
    poly(ctx, [x1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - r2, y2], rumble);
    poly(ctx, [x1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + r2, y2], alt ? '#ff3fa4' : '#6a1d5a');
    poly(ctx, [x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2], alt ? '#1b1f33' : '#1f243b');
    if (alt) {
      for (const l of [-1 / 3, 1 / 3]) {
        const a = w1 * .018;
        const b = w2 * .018;
        poly(ctx, [x1 + w1 * l - a, y1, x1 + w1 * l + a, y1, x2 + w2 * l + b, y2, x2 + w2 * l - b, y2], 'rgba(207, 232, 255, .5)');
      }
    }
    if (s.i === 0) {
      // Geblokte start- en finishlijn.
      const cols = 10;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < 2; r++) {
          const ya = y1 + (y2 - y1) * (r / 2);
          const yb = y1 + (y2 - y1) * ((r + 1) / 2);
          const xa = x1 + (x2 - x1) * (r / 2);
          const xb = x1 + (x2 - x1) * ((r + 1) / 2);
          const wa = w1 + (w2 - w1) * (r / 2);
          const wb = w1 + (w2 - w1) * ((r + 1) / 2);
          const fa = -1 + (2 * c) / cols;
          const fb = -1 + (2 * (c + 1)) / cols;
          poly(ctx, [xa + wa * fa, ya, xa + wa * fb, ya, xb + wb * fb, yb, xb + wb * fa, yb], (c + r) % 2 ? '#f4f7ff' : '#11131d');
        }
      }
    }
    if (s.boost) {
      // Boostpad: gouden pijlen op één rijstrook.
      const bx = s.boost.x;
      const a = w1 * .17;
      const b = w2 * .17;
      ctx.globalAlpha = .55 + .35 * Math.sin(t * 10 - s.i);
      poly(ctx, [x1 + w1 * bx - a, y1, x1 + w1 * bx + a, y1, x2 + w2 * bx + b, y2, x2 + w2 * bx - b, y2], '#ffd166');
      ctx.globalAlpha = 1;
      poly(ctx, [x1 + w1 * bx - a * .7, y1, x1 + w1 * bx, y1 - (y1 - y2) * .9, x1 + w1 * bx + a * .7, y1, x1 + w1 * bx, y1 - (y1 - y2) * .4], '#ff9f1c');
    }
    if (fog < 1) {
      ctx.globalAlpha = 1 - fog;
      ctx.fillStyle = FOG;
      ctx.fillRect(0, y2, W, y1 - y2 + 1);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Versiering langs de weg ----------

  function torch(ctx, x, y, k, t, seed) {
    const h = 1300 * k;
    if (h < 3) return;
    ctx.fillStyle = '#2a3150';
    ctx.fillRect(x - 40 * k, y - h, 80 * k, h);
    ctx.fillStyle = '#4cc9ff';
    ctx.fillRect(x - 40 * k, y - h * .55, 80 * k, 30 * k);
    ctx.fillStyle = '#3a4266';
    poly(ctx, [x - 150 * k, y - h, x + 150 * k, y - h, x + 90 * k, y - h + 110 * k, x - 90 * k, y - h + 110 * k], '#3a4266');
    const f = 1 + .15 * Math.sin(t * 18 + seed);
    const glow = ctx.createRadialGradient(x, y - h - 120 * k, 10 * k, x, y - h - 120 * k, 520 * k);
    glow.addColorStop(0, 'rgba(255, 170, 60, .55)');
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 520 * k, y - h - 640 * k, 1040 * k, 1040 * k);
    poly(ctx, [x - 110 * k, y - h, x + 110 * k, y - h, x + 40 * k, y - h - 260 * k * f, x, y - h - 380 * k * f, x - 50 * k, y - h - 240 * k * f], '#ff7a1a');
    poly(ctx, [x - 60 * k, y - h, x + 60 * k, y - h, x, y - h - 220 * k * f], '#ffe08a');
  }

  function banner(ctx, x, y, k, t, flip) {
    const h = 2600 * k;
    if (h < 4) return;
    ctx.fillStyle = '#39405f';
    ctx.fillRect(x - 35 * k, y - h, 70 * k, h);
    const w = 620 * k * (flip ? -1 : 1);
    const wave = Math.sin(t * 3 + x) * 60 * k;
    poly(ctx, [x, y - h + 60 * k, x + w, y - h + 60 * k + wave, x + w, y - h + 1000 * k + wave, x + w / 2, y - h + 820 * k, x, y - h + 1000 * k], flip ? '#ffd166' : '#4cc9ff');
    ctx.fillStyle = '#0b0a24';
    ctx.beginPath();
    ctx.arc(x + w / 2, y - h + 450 * k + wave / 2, 150 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  function pine(ctx, x, y, k) {
    const h = 2200 * k;
    if (h < 4) return;
    ctx.fillStyle = '#2b1a14';
    ctx.fillRect(x - 60 * k, y - 400 * k, 120 * k, 400 * k);
    for (let i = 0; i < 3; i++) {
      const top = y - h + i * 520 * k;
      const w = (380 + i * 200) * k;
      poly(ctx, [x, top, x + w, top + 800 * k, x - w, top + 800 * k], i % 2 ? '#0f3b3a' : '#0c2f33');
    }
    ctx.strokeStyle = 'rgba(123, 241, 168, .5)';
    ctx.lineWidth = Math.max(1, 20 * k);
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + 780 * k, y - h + 1840 * k); ctx.stroke();
  }

  function tower(ctx, x, y, k) {
    const h = 6000 * k;
    const w = 1300 * k;
    if (h < 6) return;
    const body = ctx.createLinearGradient(x - w, 0, x + w, 0);
    body.addColorStop(0, '#1d2340');
    body.addColorStop(1, '#2e3760');
    ctx.fillStyle = body;
    ctx.fillRect(x - w, y - h, w * 2, h);
    for (let i = 0; i < 5; i++) ctx.fillRect(x - w - 100 * k + i * (w * 2 + 200 * k) / 4.5, y - h - 380 * k, (w * 2 + 200 * k) / 9, 400 * k);
    ctx.fillStyle = '#3a4570';
    ctx.fillRect(x - w - 100 * k, y - h, w * 2 + 200 * k, 160 * k);
    ctx.fillStyle = '#4cc9ff';
    ctx.globalAlpha = .85;
    for (const wy of [.3, .55]) ctx.fillRect(x - 150 * k, y - h + h * wy, 300 * k, 600 * k);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(76, 201, 255, .7)';
    ctx.lineWidth = Math.max(1, 30 * k);
    ctx.strokeRect(x - w, y - h, w * 2, h);
  }

  function gate(ctx, x, y, k, w, t) {
    const h = 3400 * k;
    if (h < 6) return;
    const half = w * 1.22;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#2a3150';
      ctx.fillRect(x + side * half - 140 * k, y - h, 280 * k, h);
      ctx.fillStyle = side < 0 ? '#4cc9ff' : '#ff3fa4';
      ctx.fillRect(x + side * half - 140 * k, y - h, 280 * k, 120 * k);
    }
    const bh = 700 * k;
    ctx.fillStyle = '#0b0a24';
    ctx.fillRect(x - half - 140 * k, y - h, half * 2 + 280 * k, bh);
    const cell = bh / 2;
    const cols = Math.ceil((half * 2) / cell);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        if ((c + r + Math.floor(t * 3)) % 2) continue;
        ctx.fillStyle = '#f4f7ff';
        ctx.fillRect(x - half + c * cell, y - h + r * cell, Math.min(cell, x + half - (x - half + c * cell)), cell);
      }
    }
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, 40 * k);
    ctx.strokeRect(x - half - 140 * k, y - h, half * 2 + 280 * k, bh);
  }

  function crystal(ctx, x, y, k, t) {
    const h = 380 * k;
    if (h < 2) return;
    const cy = y - 380 * k - Math.sin(t * 4 + x) * 60 * k;
    const glow = ctx.createRadialGradient(x, cy, 10 * k, x, cy, 420 * k);
    glow.addColorStop(0, 'rgba(76, 201, 255, .6)');
    glow.addColorStop(1, 'rgba(76, 201, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 420 * k, cy - 420 * k, 840 * k, 840 * k);
    const w = 160 * k * (.6 + .4 * Math.abs(Math.cos(t * 3)));
    poly(ctx, [x, cy - h / 2 - 60 * k, x + w, cy, x, cy + h / 2 + 60 * k, x - w, cy], '#9fe6ff');
    poly(ctx, [x, cy - h / 2 - 60 * k, x + w, cy, x, cy], '#e8f9ff');
  }

  // ---------- De hoverrossen ----------

  // Van achteren bekeken: een zwevende slee met een ridder, cape en lans. k = pixels per wereldeenheid.
  function steed(ctx, x, y, k, color, o = {}) {
    const w = 520 * k;
    const h = 460 * k;
    if (w < 3) return;
    const t = o.t || 0;
    const hover = Math.sin(t * 7 + (o.seed || 0)) * .03 * h;
    ctx.save();
    ctx.translate(x, y - .1 * h + hover);
    ctx.rotate((o.tilt || 0) * .1);
    // Gloed van de zweefmotor.
    const glow = ctx.createRadialGradient(0, .08 * h, 2, 0, .08 * h, w * .7);
    glow.addColorStop(0, `${color}cc`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(0, .1 * h, w * .7, h * .16, 0, 0, Math.PI * 2); ctx.fill();
    // Uitlaten: groot en fel met turbo.
    const flame = o.turbo ? 1.8 + .4 * Math.sin(t * 40) : 1;
    for (const side of [-1, 1]) {
      const ex = side * .26 * w;
      const ey = -.16 * h;
      const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, .16 * w * flame);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.35, o.turbo ? '#ffd166' : color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ex, ey, .16 * w * flame, 0, Math.PI * 2); ctx.fill();
    }
    // De slee.
    const metal = ctx.createLinearGradient(0, -.42 * h, 0, -.02 * h);
    metal.addColorStop(0, '#46507a');
    metal.addColorStop(1, '#151a2e');
    poly(ctx, [-.5 * w, -.05 * h, .5 * w, -.05 * h, .4 * w, -.36 * h, -.4 * w, -.36 * h], metal);
    poly(ctx, [-.5 * w, -.12 * h, -.66 * w, -.02 * h, -.46 * w, -.26 * h], color);
    poly(ctx, [.5 * w, -.12 * h, .66 * w, -.02 * h, .46 * w, -.26 * h], color);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 14 * k);
    ctx.beginPath();
    ctx.moveTo(-.5 * w, -.05 * h); ctx.lineTo(.5 * w, -.05 * h); ctx.lineTo(.4 * w, -.36 * h); ctx.lineTo(-.4 * w, -.36 * h); ctx.closePath();
    ctx.stroke();
    // De lans, schuin naar voren.
    ctx.strokeStyle = '#d7deef';
    ctx.lineWidth = Math.max(1, 24 * k);
    ctx.beginPath(); ctx.moveTo(.16 * w, -.5 * h); ctx.lineTo(.36 * w, -1.3 * h); ctx.stroke();
    ctx.fillStyle = '#9fe6ff';
    ctx.beginPath(); ctx.arc(.36 * w, -1.3 * h, 22 * k, 0, Math.PI * 2); ctx.fill();
    // Cape die wappert.
    const wave = Math.sin(t * 9 + (o.seed || 0)) * .04 * w;
    poly(ctx, [-.17 * w, -.78 * h, .17 * w, -.78 * h, .22 * w + wave, -.34 * h, 0, -.3 * h, -.22 * w + wave, -.34 * h], color);
    poly(ctx, [-.17 * w, -.78 * h, .17 * w, -.78 * h, .1 * w, -.6 * h, -.1 * w, -.6 * h], 'rgba(0,0,0,.25)');
    if (o.av && typeof Avatar !== 'undefined') {
      // Het hoofd van de eigen ridder (versiering en helm), van achteren gezien.
      const img = Avatar.sprite(o.av, { back: true, k: 4 });
      const hw = .34 * w;
      const hh = hw * (8 / 12);
      ctx.drawImage(img, 0, 0, img.width, img.height * (8 / 17), -hw / 2, -.8 * h - hh, hw, hh);
    } else {
      // Helm met pluim.
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath(); ctx.arc(0, -.88 * h, .12 * w, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a95b2';
      ctx.fillRect(-.12 * w, -.9 * h, .24 * w, .05 * h);
      poly(ctx, [-.03 * w, -.98 * h, .03 * w, -.98 * h, .1 * w - wave, -1.14 * h, -.02 * w - wave, -1.1 * h], color);
    }
    if (o.pit) {
      ctx.fillStyle = '#ffd166';
      ctx.font = `${Math.max(10, 160 * k)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, -1.25 * h);
    }
    ctx.restore();
    if (o.name && w > 34) {
      const size = Math.max(10, Math.min(18, w * .16));
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(o.name).width + size;
      const ty = y - 1.42 * h;
      ctx.fillStyle = 'rgba(5, 8, 20, .75)';
      ctx.fillRect(x - tw / 2, ty - size, tw, size * 1.4);
      ctx.fillStyle = color;
      ctx.fillText(o.name, x, ty);
    }
  }

  // ---------- Alles samen ----------

  // v: { dist, x, speed, others: [{ dist, x, color, name, flags, seed }], taken: Set, me: { color, tilt, turbo, pit }, t, dt, bump }
  function render(ctx, W, H, v) {
    const camZ = T.wrap(v.dist - PLAYER_Z);
    const base = T.segmentAt(camZ);
    const basePct = (camZ % T.SEG) / T.SEG;
    const pseg = T.segmentAt(v.dist);
    const ppct = (T.wrap(v.dist) % T.SEG) / T.SEG;
    const playerY = pseg.y1 + (pseg.y2 - pseg.y1) * ppct;
    const speedPct = Math.min(1.5, v.speed / T.MAX_SPEED);
    bg.sky += pseg.curve * speedPct * .0006 * (v.dt * 60);
    bg.hills += pseg.curve * speedPct * .0014 * (v.dt * 60);
    const horizon = H / 2;
    background(ctx, W, H, horizon, v.t);

    const camX = v.x * T.ROAD;
    const camY = playerY + CAM_H + (v.bump || 0);
    let maxy = H;
    let x = 0;
    let dx = -(base.curve * basePct);
    const order = [];
    for (let n = 0; n < DRAW; n++) {
      const s = T.segments[(base.i + n) % T.COUNT];
      const looped = s.i < base.i;
      const z0 = camZ - (looped ? T.LENGTH : 0);
      const P = proj[s.i];
      project(P, 1, camX - x, camY, z0, s.y1, s.i * T.SEG, W, H);
      project(P, 2, camX - x - dx, camY, z0, s.y2, (s.i + 1) * T.SEG, W, H);
      x += dx;
      dx += s.curve;
      P.clip = maxy;
      P.n = n;
      P.fog = Math.exp(-((n / DRAW) ** 2) * 4);
      P.ok = P.z1 > DEPTH;
      order.push(s);
      if (!P.ok || P.y2 >= P.y1 || P.y2 >= maxy) continue;
      segment(ctx, W, s, P, maxy, P.fog, v.t);
      maxy = P.y2;
    }

    // Andere ridders per segment verzamelen.
    const bySeg = new Map();
    for (const o of v.others) {
      const z = T.wrap(o.dist);
      const i = Math.floor(z / T.SEG);
      if (!bySeg.has(i)) bySeg.set(i, []);
      bySeg.get(i).push({ ...o, pct: (z % T.SEG) / T.SEG });
    }

    // Van ver naar dichtbij: versiering, kristallen en ridders.
    for (let n = order.length - 1; n >= 1; n--) {
      const s = order[n];
      const P = proj[s.i];
      if (!P.ok) continue;
      const clipped = P.clip < H;
      if (clipped) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, P.clip);
        ctx.clip();
      }
      ctx.globalAlpha = Math.max(.15, P.fog);
      const k = P.s1 * W / 2;
      for (const sp of s.sprites) {
        const sx = P.x1 + P.w1 * sp.x;
        if (sp.type === 'torch') torch(ctx, sx, P.y1, k, v.t, s.i);
        else if (sp.type === 'banner') banner(ctx, sx, P.y1, k, v.t, sp.x > 0);
        else if (sp.type === 'tower') tower(ctx, sx, P.y1, k);
        else if (sp.type === 'pine') pine(ctx, sx, P.y1, k);
        else if (sp.type === 'gate') gate(ctx, P.x1, P.y1, k, P.w1, v.t);
      }
      if (s.crystal && !(v.taken && v.taken.has(s.i))) crystal(ctx, P.x1 + P.w1 * s.crystal.x, P.y1, k, v.t);
      const list = bySeg.get(s.i);
      if (list) {
        list.sort((a, b) => b.pct - a.pct);
        for (const o of list) {
          const sc = P.s1 + (P.s2 - P.s1) * o.pct;
          const ox = P.x1 + (P.x2 - P.x1) * o.pct + sc * o.x * T.ROAD * W / 2;
          const oy = P.y1 + (P.y2 - P.y1) * o.pct;
          steed(ctx, ox, oy, sc * W / 2, colorOf(o.color), { t: v.t, seed: o.seed, turbo: o.flags & 2, pit: o.flags & 1, name: n < 60 ? o.name : '', av: typeof Avatar !== 'undefined' ? Avatar.byName(o.name) : null });
        }
      }
      ctx.globalAlpha = 1;
      if (clipped) ctx.restore();
    }

    // Snelheidsstrepen bij turbo.
    if (v.me.turbo) {
      ctx.strokeStyle = 'rgba(255, 255, 255, .35)';
      ctx.lineWidth = Math.max(1, W / 500);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + v.t * 3;
        const r1 = W * (.25 + ((i * 37 + v.t * 600) % 100) / 300);
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * r1, horizon + Math.sin(a) * r1 * .6);
        ctx.lineTo(W / 2 + Math.cos(a) * (r1 + W * .12), horizon + Math.sin(a) * (r1 + W * .12) * .6);
        ctx.stroke();
      }
    }

    // Het eigen ros, onderaan in het midden.
    // Op een gsm rechtop staat het ros wat hoger, boven de knoppen.
    const portrait = H > W;
    const k = ((W / 2) / CAM_H) * (portrait ? .8 : .62);
    const y = portrait ? H * .86 : H * .985;
    steed(ctx, W / 2, y + (v.bump || 0) * .05, k, colorOf(v.me.color), { t: v.t, tilt: v.me.tilt, turbo: v.me.turbo, pit: false, seed: 0, av: typeof Avatar !== 'undefined' ? Avatar.mine() : null });
  }

  // ---------- Het kaartje ----------

  let mapCache = null;
  function mapPoints() {
    if (!mapCache) mapCache = T.map();
    return mapCache;
  }

  // racers: [{ dist, color, name, me, flags, lead }]
  function map(ctx, x0, y0, size, racers, opts = {}) {
    const m = mapPoints();
    const px = p => x0 + (p[0] + (1 - m.w) / 2) * size;
    const py = p => y0 + (p[1] + (1 - m.h) / 2) * size;
    const lw = opts.line || Math.max(3, size / 60);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [width, color] of [[lw * 3.2, 'rgba(76, 201, 255, .15)'], [lw * 1.8, '#1b2440'], [lw * .5, '#4cc9ff']]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      m.pts.forEach((p, i) => (i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p))));
      ctx.closePath();
      ctx.stroke();
    }
    // Start en finish.
    const s0 = m.pts[0];
    const s1 = m.pts[4];
    const ang = Math.atan2(py(s1) - py(s0), px(s1) - px(s0)) + Math.PI / 2;
    ctx.strokeStyle = '#f4f7ff';
    ctx.lineWidth = lw * .8;
    ctx.beginPath();
    ctx.moveTo(px(s0) + Math.cos(ang) * lw * 1.6, py(s0) + Math.sin(ang) * lw * 1.6);
    ctx.lineTo(px(s0) - Math.cos(ang) * lw * 1.6, py(s0) - Math.sin(ang) * lw * 1.6);
    ctx.stroke();
    const sorted = [...racers].sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
    for (const r of sorted) {
      const i = Math.floor(T.wrap(r.dist) / T.SEG) % T.COUNT;
      const p = m.pts[i];
      const rx = px(p);
      const ry = py(p);
      const rad = (r.me ? 1.5 : 1) * (opts.dot || lw * 1.2);
      if (r.me) {
        ctx.fillStyle = 'rgba(255, 255, 255, .3)';
        ctx.beginPath(); ctx.arc(rx, ry, rad * 1.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = colorOf(r.color);
      ctx.strokeStyle = r.me ? '#fff' : '#05081a';
      ctx.lineWidth = Math.max(1, rad * .35);
      ctx.beginPath(); ctx.arc(rx, ry, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (opts.labels) {
        const size = Math.max(11, rad * 1.6);
        ctx.font = `700 ${size}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(5, 8, 20, .7)';
        const label = `${r.lead ? '👑 ' : ''}${r.flags & 1 ? '⚡ ' : ''}${r.name}`;
        const tw = ctx.measureText(label).width;
        ctx.fillRect(rx + rad + 3, ry - size * .75, tw + 8, size * 1.35);
        ctx.fillStyle = colorOf(r.color);
        ctx.fillText(label, rx + rad + 7, ry + size * .35);
      }
    }
  }

  return { render, map, colorOf, COLORS, PLAYER_Z };
})();
