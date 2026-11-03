// Ridderrace tekenen: de weg in 3D zoals in de oude arcaderaces, de hoverrossen met hun ridders,
// de burcht aan de horizon en het kaartje van het circuit. Alles met canvas, zonder afbeeldingen.
const RaceDraw = (() => {
  const T = Track;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffd166', '#7bf1a8', '#c77dff', '#ff9f1c', '#f15bb5', '#e8f1ff'];
  const colorOf = c => COLORS[((c % COLORS.length) + COLORS.length) % COLORS.length] || COLORS[0];
  const CAM_H = 1000;
  const DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
  const PLAYER_Z = CAM_H * DEPTH;
  const DRAW = 170;
  const FOG = '#24104a';
  const proj = T.segments.map(() => ({}));
  const bg = { sky: 0, hills: 0 };
  const STARS = Array.from({ length: 90 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 1000) / 1000, (i % 3) + 1]);

  // Geschilderd gras en een weg van steen met neonvoegen (public/img/ridderrace/). Zonder beeld: effen kleuren zoals vroeger.
  const ART = {};
  const TEX = 512;              // grootte van de textuur in pixels
  const TPS = T.SEG / T.ROAD * TEX; // textuurpixels per segment: twee tegels over de breedte van de weg
  if (typeof Image !== 'undefined') {
    for (const n of ['gras', 'weg']) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        ART[n] = c.getContext('2d').createPattern(img, 'repeat');
        ART[n + 'Img'] = img;
        boardCache = null;
      };
      img.src = `/img/ridderrace/${n}.webp`;
    }
    // De ridder op zijn zweefslee (van achteren, van voren en opzij) en de hemel.
    for (const n of ['kar-achter', 'kar-voor', 'kar-zij', 'hemel']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; tints.clear(); skyCache = null; };
      img.src = `/img/ridderrace/${n}.webp`;
    }
  }
  // Het blauw van de geschilderde slee wordt de kleur van de speler; één keer per kleur, op volle grootte.
  const tints = new Map();
  let skyCache = null;
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
  function tinted(name, color) {
    const img = ART[name];
    if (!img || !/^#[0-9a-f]{6}$/i.test(color)) return img || null;
    const key = name + color;
    if (tints.has(key)) return tints.get(key);
    const c = document.createElement('canvas');
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
    tints.set(key, c);
    return c;
  }
  // De geschilderde slee in één van drie standen. Onderkant op (x, y); w is de breedte van de slee zoals vroeger.
  // Geeft de hoogte terug, of false als het beeld er (nog) niet is.
  const VIEW = { back: ['kar-achter', 1.1, [[.36, .88], [.64, .88]]], front: ['kar-voor', 1.0, []], side: ['kar-zij', 1.75, [[.04, .62]]] };
  function paintedSteed(ctx, x, y, w, color, view = 'back', o = {}, dir = 1) {
    const [name, wk, engines] = VIEW[view];
    const art = tinted(name, color);
    if (!art) return false;
    const iw = w * wk, ih = iw * art.height / art.width;
    const t = o.t || 0, seed = o.seed || 0;
    const hover = Math.sin(t * 7 + seed) * .025 * ih;
    Glow.glow(ctx, x, y, iw * .7, color, o.turbo ? .8 : .45, .22);
    ctx.save();
    ctx.translate(x, y - ih * .04 + hover);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.rotate((o.tilt || 0) * .08);
    ctx.drawImage(art, -iw / 2, -ih, iw, ih);
    const flame = o.turbo ? 1.9 + .4 * Math.sin(t * 40) : 1 + .08 * Math.sin(t * 30 + seed);
    for (const [ex, ey] of engines) Glow.glow(ctx, (ex - .5) * iw, (ey - 1) * ih, iw * .2 * flame, o.turbo ? '#ffd166' : color, .9);
    if (o.brake && view === 'back') for (const ex of [.2, .8]) Glow.glow(ctx, (ex - .5) * iw, -ih * .2, iw * .12, '#ff2d4d', .9);
    if (o.av && typeof Avatar !== 'undefined' && view !== 'side') {
      // Het hoofd van de eigen ridder over de geschilderde helm.
      const hw = iw * (view === 'back' ? .26 : .3);
      const img = Avatar.sprite(o.av, { back: view === 'back', k: Avatar.kFor(hw / 12) });
      const hh = hw * (8 / 12);
      const hy = view === 'back' ? .2 : .26;
      ctx.drawImage(img, 0, 0, img.width, img.height * (8 / 17), -hw / 2 + (view === 'back' ? -.02 : .03) * iw, -ih * (1 - hy) - hh * .55, hw, hh);
    }
    if (o.pit) {
      Glow.glow(ctx, 0, -ih * 1.05, .35 * iw, '#ffd166', .7);
      ctx.fillStyle = '#ffd166';
      ctx.font = `${Math.max(10, iw * .3)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, -ih * 1.02);
    }
    ctx.restore();
    return ih;
  }
  // Vult het gras (hele breedte) of de weg met de textuur, in perspectief. Grote segmenten vooraan knippen we in
  // dunne reepjes, anders zie je trapjes in de stenen.
  function texFill(ctx, pat, s, P, maxy, W, road) {
    const H = P.y1 - P.y2;
    // Ver weg is een segment maar een paar pixels hoog: dan volstaat de gemiddelde kleur van het beeld.
    if (H < 2.5) {
      ctx.fillStyle = road ? '#2d484f' : '#0b392f';
      const y1 = Math.min(P.y1, maxy);
      if (road) poly(ctx, [P.x1 - P.w1, y1, P.x1 + P.w1, y1, P.x2 + P.w2, P.y2, P.x2 - P.w2, P.y2], ctx.fillStyle);
      else ctx.fillRect(0, P.y2, W, y1 - P.y2 + 1);
      return;
    }
    const k = road ? Math.min(10, Math.max(1, Math.ceil(H / 8))) : Math.min(3, Math.max(1, Math.ceil(H / 30)));
    const v0 = (s.i * TPS) % TEX;
    for (let j = 0; j < k; j++) {
      const a = j / k, b = (j + 1) / k;
      let ya = P.y1 - H * a;
      const yb = P.y1 - H * b;
      if (yb >= maxy) continue;
      const xa = P.x1 + (P.x2 - P.x1) * a, wa = P.w1 + (P.w2 - P.w1) * a;
      const xb = P.x1 + (P.x2 - P.x1) * b, wb = P.w1 + (P.w2 - P.w1) * b;
      const kx = wa / TEX, ky = (ya - yb) / (TPS / k);
      pat.setTransform(new DOMMatrix([kx, 0, 0, -ky, xa - wa, ya + (v0 + a * TPS) * ky]));
      ctx.fillStyle = pat;
      if (ya > maxy) ya = maxy;
      if (road) poly(ctx, [xa - wa, ya, xa + wa, ya, xb + wb, yb, xb - wb, yb], pat);
      else ctx.fillRect(0, yb, W, ya - yb + .6);
    }
  }

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

  // Dezelfde hemel als rondom-panorama (voor het 3D-zicht van Strijdrossen), op vaste hoogte.
  let panoCache = null;
  function skyPano() {
    const img = ART.hemel;
    if (!img) return null;
    if (panoCache && panoCache.img === img) return panoCache.c;
    const hh = 260, w = Math.round(img.width * hh / img.height);
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = hh;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, hh);
    g.translate(w * 2, 0); g.scale(-1, 1);
    g.drawImage(img, 0, 0, w, hh);
    panoCache = { img, c };
    return c;
  }

  function paintedSky(ctx, W, H, horizon) {
    const img = ART.hemel;
    if (!img) return false;
    // Wat groter dan de hemel hoog is (de bovenkant valt weg): zo zie je maar één planeet tegelijk.
    const hh = Math.round((horizon + 4) * 1.45);
    if (!skyCache || skyCache.height !== hh) {
      const w = Math.round(img.width * hh / img.height);
      const c = document.createElement('canvas');
      c.width = w * 2; c.height = hh;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, hh);
      g.translate(w * 2, 0); g.scale(-1, 1);
      g.drawImage(img, 0, 0, w, hh);
      skyCache = c;
    }
    const span = skyCache.width;
    let x0 = -(((bg.sky * .5 * W) % span) + span) % span;
    for (; x0 < W; x0 += span) ctx.drawImage(skyCache, Math.round(x0), Math.round(horizon + 4 - hh));
    ctx.fillStyle = '#081627';
    ctx.fillRect(0, horizon, W, H - horizon);
    return true;
  }

  function background(ctx, W, H, horizon, t) {
    if (paintedSky(ctx, W, H, horizon)) return;
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
    const painted = ART.gras && ART.weg && P.y1 - P.y2 > .05;
    if (painted) {
      texFill(ctx, ART.gras, s, P, maxy, W, false);
      // Om de drie segmenten iets donkerder: zo voel je de snelheid.
      ctx.fillStyle = alt ? 'rgba(4,10,24,.4)' : 'rgba(4,10,24,.3)';
      ctx.fillRect(0, y2, W, y1 - y2 + 1);
    } else {
      ctx.fillStyle = alt ? '#0a1a2c' : '#0d2136';
      ctx.fillRect(0, y2, W, y1 - y2 + 1);
    }
    // Neonlijnen op het gras, zoals een raster.
    if (!painted && s.i % 6 === 0) {
      ctx.fillStyle = 'rgba(76, 201, 255, .16)';
      ctx.fillRect(0, y2, W, Math.max(1, (y1 - y2) * .25));
    }
    const r1 = w1 * 1.14;
    const r2 = w2 * 1.14;
    const rumble = alt ? '#4cc9ff' : '#1b4f7a';
    poly(ctx, [x1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - r2, y2], rumble);
    poly(ctx, [x1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + r2, y2], alt ? '#ff3fa4' : '#6a1d5a');
    if (painted) {
      texFill(ctx, ART.weg, s, P, maxy, W, true);
      poly(ctx, [x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2], alt ? 'rgba(10,12,24,.4)' : 'rgba(10,12,24,.32)');
    } else poly(ctx, [x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2], alt ? '#1b1f33' : '#1f243b');
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
    Glow.glow(ctx, x, y - h - 120 * k, 620 * k * f, '#ff9a3c', .7);
    Glow.glow(ctx, x, y, 900 * k, '#ff9a3c', .22, .3);
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
    Glow.glow(ctx, x, cy, 520 * k, '#4cc9ff', .8);
    Glow.glow(ctx, x, y, 420 * k, '#4cc9ff', .4, .25);
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
    const ih = paintedSteed(ctx, x, y, w, color, 'back', o);
    if (ih) { nameTag(ctx, x, y - ih * 1.08, w, color, o.name); return; }
    const t = o.t || 0;
    const seed = o.seed || 0;
    const lw = Math.max(1, 10 * k);
    const hover = Math.sin(t * 7 + seed) * .03 * h;
    // Lichtplas van de zweefmotor op de weg.
    Glow.glow(ctx, x, y, w * .85, color, o.turbo ? .8 : .5, .22);
    ctx.save();
    ctx.translate(x, y - .1 * h + hover);
    ctx.rotate((o.tilt || 0) * .1);
    // Twee straalmotoren: ring, gloed en een witte kern. Met turbo een vlammende ster.
    const flame = o.turbo ? 1.9 + .4 * Math.sin(t * 40) : 1 + .08 * Math.sin(t * 30 + seed);
    for (const side of [-1, 1]) {
      const ex = side * .27 * w;
      const ey = -.13 * h;
      Glow.glow(ctx, ex, ey, .34 * w * flame, o.turbo ? '#ffd166' : color, .95);
      if (o.turbo && w > 30) {
        ctx.fillStyle = 'rgba(255, 230, 160, .8)';
        for (let i = 0; i < 6; i++) {
          const ang = t * 6 * side + (i / 6) * Math.PI * 2;
          const r = .3 * w * flame * (.7 + .3 * Math.sin(t * 50 + i));
          poly(ctx, [ex + Math.cos(ang - .18) * .05 * w, ey + Math.sin(ang - .18) * .05 * w, ex + Math.cos(ang) * r, ey + Math.sin(ang) * r, ex + Math.cos(ang + .18) * .05 * w, ey + Math.sin(ang + .18) * .05 * w], 'rgba(255, 230, 160, .8)');
        }
      }
      ctx.fillStyle = '#0e1226';
      ctx.beginPath(); ctx.arc(ex, ey, .12 * w, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, .025 * w);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex, ey, .055 * w * Math.min(1.5, flame), 0, Math.PI * 2); ctx.fill();
    }
    // Vinnen opzij.
    for (const side of [-1, 1]) {
      const fin = ctx.createLinearGradient(side * .48 * w, 0, side * .74 * w, 0);
      fin.addColorStop(0, color);
      fin.addColorStop(1, '#141a30');
      poly(ctx, [side * .48 * w, -.08 * h, side * .74 * w, .02 * h, side * .64 * w, -.18 * h, side * .46 * w, -.32 * h], fin);
      ctx.strokeStyle = 'rgba(255, 255, 255, .45)';
      ctx.lineWidth = lw * .6;
      ctx.beginPath(); ctx.moveTo(side * .46 * w, -.32 * h); ctx.lineTo(side * .74 * w, .02 * h); ctx.stroke();
    }
    // De slee: metalen romp met een dek, een lichtstreep in de eigen kleur en achterlichten.
    const metal = ctx.createLinearGradient(0, -.42 * h, 0, -.04 * h);
    metal.addColorStop(0, '#6a76a6');
    metal.addColorStop(.45, '#2c3458');
    metal.addColorStop(1, '#10142a');
    const hull = [-.52 * w, -.05 * h, .52 * w, -.05 * h, .45 * w, -.3 * h, .3 * w, -.41 * h, -.3 * w, -.41 * h, -.45 * w, -.3 * h];
    poly(ctx, hull, metal);
    poly(ctx, [-.3 * w, -.41 * h, .3 * w, -.41 * h, .27 * w, -.37 * h, -.27 * w, -.37 * h], 'rgba(255, 255, 255, .22)');
    poly(ctx, [-.47 * w, -.2 * h, .47 * w, -.2 * h, .45 * w, -.255 * h, -.45 * w, -.255 * h], color);
    if (w > 24) {
      Glow.glow(ctx, 0, -.23 * h, .5 * w, color, .45, .2);
      ctx.strokeStyle = 'rgba(0, 0, 0, .35)';
      ctx.lineWidth = lw * .6;
      for (const px of [-.17, .17]) { ctx.beginPath(); ctx.moveTo(px * w, -.06 * h); ctx.lineTo(px * w, -.39 * h); ctx.stroke(); }
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = o.brake ? '#ff4d6d' : '#7a1828';
      ctx.fillRect(side * .4 * w - .06 * w, -.135 * h, .12 * w, .045 * h);
      if (o.brake) Glow.glow(ctx, side * .4 * w, -.11 * h, .3 * w, '#ff2d4d', .9);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(hull[0], hull[1]);
    for (let i = 2; i < hull.length; i += 2) ctx.lineTo(hull[i], hull[i + 1]);
    ctx.closePath();
    ctx.stroke();
    // De lans, schuin naar voren: taps toelopend, een gouden stootplaat en een lichtende punt.
    const lx0 = .17 * w, ly0 = -.5 * h, lx1 = .38 * w, ly1 = -1.32 * h;
    const len = Math.hypot(lx1 - lx0, ly1 - ly0);
    const nx = -(ly1 - ly0) / len, ny = (lx1 - lx0) / len;
    poly(ctx, [lx0 + nx * 16 * k, ly0 + ny * 16 * k, lx1 + nx * 4 * k, ly1 + ny * 4 * k, lx1 - nx * 4 * k, ly1 - ny * 4 * k, lx0 - nx * 16 * k, ly0 - ny * 16 * k], '#dfe6f6');
    const gx = lx0 + (lx1 - lx0) * .14, gy = ly0 + (ly1 - ly0) * .14;
    poly(ctx, [gx + nx * 46 * k, gy + ny * 46 * k, gx + (lx1 - lx0) * .1, gy + (ly1 - ly0) * .1, gx - nx * 46 * k, gy - ny * 46 * k], '#ffd166');
    Glow.glow(ctx, lx1, ly1, 110 * k, '#9fe6ff', .9);
    // Romp van de ridder met een cape die wappert.
    const body = ctx.createLinearGradient(-.2 * w, 0, .2 * w, 0);
    body.addColorStop(0, '#59648c');
    body.addColorStop(.5, '#aeb9d6');
    body.addColorStop(1, '#3d4668');
    poly(ctx, [-.21 * w, -.37 * h, .21 * w, -.37 * h, .18 * w, -.76 * h, -.18 * w, -.76 * h], body);
    const wave = Math.sin(t * 9 + seed) * .04 * w;
    const cape = [-.17 * w, -.78 * h, .17 * w, -.78 * h, .23 * w + wave, -.34 * h, .1 * w + wave * .5, -.3 * h, 0, -.35 * h, -.1 * w + wave * .5, -.3 * h, -.23 * w + wave, -.34 * h];
    poly(ctx, cape, color);
    const fold = ctx.createLinearGradient(0, -.78 * h, 0, -.3 * h);
    fold.addColorStop(0, 'rgba(0, 0, 0, .35)');
    fold.addColorStop(.4, 'rgba(0, 0, 0, .05)');
    fold.addColorStop(1, 'rgba(0, 0, 0, .3)');
    poly(ctx, cape, fold);
    if (w > 24) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = lw * .8;
      ctx.beginPath();
      for (let i = 4; i < cape.length; i += 2) ctx[i === 4 ? 'moveTo' : 'lineTo'](cape[i], cape[i + 1]);
      ctx.lineTo(cape[0], cape[1]);
      ctx.moveTo(cape[2], cape[3]);
      ctx.lineTo(cape[4], cape[5]);
      ctx.stroke();
      // Embleem: een gouden ruit met een lichtpunt.
      poly(ctx, [0, -.66 * h, .06 * w, -.58 * h, 0, -.5 * h, -.06 * w, -.58 * h], '#ffd166');
      Glow.glow(ctx, 0, -.58 * h, .1 * w, '#ffe08a', .7);
    }
    // Schouderstukken.
    for (const side of [-1, 1]) {
      const pg = ctx.createRadialGradient(side * .18 * w, -.79 * h, 1, side * .2 * w, -.76 * h, .12 * w);
      pg.addColorStop(0, '#eef3ff');
      pg.addColorStop(1, '#55607f');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(side * .2 * w, -.76 * h, .11 * w, .065 * h, side * .2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw * .8;
      ctx.stroke();
    }
    if (o.av && typeof Avatar !== 'undefined') {
      // Het hoofd van de eigen ridder (versiering en helm), van achteren gezien.
      const hw = .34 * w;
      const img = Avatar.sprite(o.av, { back: true, k: Avatar.kFor(hw / 12) });
      const hh = hw * (8 / 12);
      ctx.drawImage(img, 0, 0, img.width, img.height * (8 / 17), -hw / 2, -.8 * h - hh, hw, hh);
    } else {
      // Helm met kam en een wapperende pluim.
      const hg = ctx.createRadialGradient(-.04 * w, -.92 * h, 1, 0, -.88 * h, .13 * w);
      hg.addColorStop(0, '#f4f7ff');
      hg.addColorStop(.6, '#a7b2cf');
      hg.addColorStop(1, '#4b5576');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, -.88 * h, .12 * w, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d7898';
      ctx.fillRect(-.12 * w, -.86 * h, .24 * w, .04 * h);
      ctx.fillStyle = color;
      ctx.fillRect(-.015 * w, -1 * h, .03 * w, .2 * h);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-.02 * w, -.99 * h);
      ctx.quadraticCurveTo(.06 * w - wave, -1.16 * h, .2 * w - wave * 2, -1.08 * h);
      ctx.quadraticCurveTo(.08 * w - wave, -1.06 * h, .03 * w, -.96 * h);
      ctx.closePath();
      ctx.fill();
    }
    if (o.pit) {
      Glow.glow(ctx, 0, -1.3 * h, .35 * w, '#ffd166', .7);
      ctx.fillStyle = '#ffd166';
      ctx.font = `${Math.max(10, 160 * k)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, -1.25 * h);
    }
    ctx.restore();
    nameTag(ctx, x, y - 1.42 * h, w, color, o.name);
  }
  function nameTag(ctx, x, ty, w, color, name) {
    if (name && w > 34) {
      const size = Math.max(10, Math.min(18, w * .16));
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(name).width + size;
      ctx.fillStyle = 'rgba(5, 8, 20, .8)';
      ctx.fillRect(x - tw / 2, ty - size, tw, size * 1.4);
      ctx.fillStyle = color;
      ctx.fillRect(x - tw / 2, ty + size * .4 - 2, tw, 2);
      ctx.fillText(name, x, ty);
    }
  }

  // Waarschuwingsbord voor een scherpe bocht: knipperende gouden pijlen.
  function arrowSign(ctx, x, y, k, dir, t) {
    const w = 900 * k;
    if (w < 4) return;
    const bh = 460 * k;
    const top = y - 700 * k - bh;
    ctx.fillStyle = '#2a3150';
    ctx.fillRect(x - 30 * k, top + bh, 60 * k, 700 * k);
    ctx.fillStyle = '#0b0a24';
    ctx.fillRect(x - w / 2, top, w, bh);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, 26 * k);
    ctx.strokeRect(x - w / 2, top, w, bh);
    ctx.lineWidth = Math.max(1.5, 70 * k);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let j = -1; j <= 1; j++) {
      const cx = x + j * w * .27;
      const on = (Math.floor(t * 8) + j * dir + 3) % 3 === 0;
      ctx.strokeStyle = on ? '#fff3c4' : '#ffb21c';
      ctx.beginPath();
      ctx.moveTo(cx - dir * 70 * k, top + 90 * k);
      ctx.lineTo(cx + dir * 70 * k, top + bh / 2);
      ctx.lineTo(cx - dir * 70 * k, top + bh - 90 * k);
      ctx.stroke();
      if (on) Glow.glow(ctx, cx, top + bh / 2, 260 * k, '#ffd166', .6);
    }
    ctx.lineCap = 'butt';
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
        else if (sp.type === 'arrow') arrowSign(ctx, sx, P.y1, k, sp.dir, v.t);
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

    // Naast de weg: vonken onder het eigen ros.
    if (v.me.off && v.speed > 200) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = Math.max(1, W / 600);
      for (let i = 0; i < 18; i++) {
        const sx = W / 2 + (Math.random() - .5) * W * .3;
        const sy = H * (H > W ? .86 : .97) - Math.random() * H * .04;
        const len = W * (.02 + Math.random() * .05);
        ctx.strokeStyle = Math.random() < .5 ? '#ffd166' : '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (sx - W / 2) * .4, sy + len * .6);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Het eigen ros, onderaan in het midden.
    // Op een gsm rechtop staat het ros wat hoger, boven de knoppen.
    const portrait = H > W;
    const k = ((W / 2) / CAM_H) * (portrait ? .8 : .62);
    const y = portrait ? H * .86 : H * .985;
    steed(ctx, W / 2, y + (v.bump || 0) * .05, k, colorOf(v.me.color), { t: v.t, tilt: v.me.tilt, turbo: v.me.turbo, brake: v.me.brake, pit: false, seed: 0, av: typeof Avatar !== 'undefined' ? Avatar.mine() : null });
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

  // ---------- Het bord: het circuit van bovenaf als echte racebaan ----------

  // Alles wat stilstaat (ruimte, baan, curbs, tribunes, torens) wordt één keer getekend per schermgrootte.
  let boardCache = null;
  function bakeBoard(W, H) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const m = mapPoints();
    const size = Math.min(W, H) * .88;
    const x0 = (W - size) / 2 + (1 - m.w) * size / 2;
    const y0 = (H - size) / 2 + (1 - m.h) * size / 2;
    const N = m.pts.length;
    const P = m.pts.map(p => [x0 + p[0] * size, y0 + p[1] * size]);
    // Richting en normaal per punt (gladgestreken over een paar punten).
    const dir = P.map((p, i) => {
      const a = P[(i - 3 + N) % N];
      const b = P[(i + 3) % N];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    });
    const hw = size / 46;
    const at = (i, off) => [P[i][0] - dir[i][1] * off * hw, P[i][1] + dir[i][0] * off * hw];
    const path = (off = 0) => {
      g.beginPath();
      for (let i = 0; i < N; i++) {
        const q = at(i, off);
        g[i ? 'lineTo' : 'moveTo'](q[0], q[1]);
      }
      g.closePath();
    };
    Glow.space(g, W, H, 0, 0);
    // Geschilderd gras als ondergrond (wat donkerder), anders een zwak zeshoekig raster.
    const gras = ART.grasImg, weg = ART.wegImg;
    const pat = (img, tile) => { const p = g.createPattern(img, 'repeat'); const k = tile / img.width; p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); return p; };
    if (gras) {
      g.fillStyle = pat(gras, hw * 14);
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(6, 10, 26, .45)';
      g.fillRect(0, 0, W, H);
    }
    g.strokeStyle = 'rgba(76, 201, 255, .05)';
    g.lineWidth = 1;
    const r = Math.max(18, W / 60);
    for (let row = 0, yy = 0; yy < (gras ? -1 : H + r); row++, yy += r * 1.5) {
      for (let xx = (row % 2) * r * .866; xx < W + r; xx += r * 1.732) {
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          g[k ? 'lineTo' : 'moveTo'](xx + Math.cos(a) * r, yy + Math.sin(a) * r);
        }
        g.closePath();
        g.stroke();
      }
    }
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // Neongloed rond de baan en een donkere berm.
    for (const [lwk, col] of [[6, 'rgba(76, 201, 255, .05)'], [4.2, 'rgba(76, 201, 255, .08)'], [3.1, '#0a1322']]) {
      g.strokeStyle = col;
      g.lineWidth = hw * lwk;
      path();
      g.stroke();
    }
    // Tribunes met publiek langs het lange rechte stuk na de start.
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const crowd = ['#ff4d6d', '#4cc9ff', '#ffd166', '#7bf1a8', '#c77dff', '#f4f7ff'];
    for (const side of [-1, 1]) {
      for (let i = 12; i < 100; i += 2) {
        const a = at(i, side * 1.9);
        const b = at(i, side * 3.4);
        const a2 = at(i + 2, side * 1.9);
        const b2 = at(i + 2, side * 3.4);
        g.fillStyle = (i / 2) % 2 ? '#1a2140' : '#151b36';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
        for (let n = 0; n < 4; n++) {
          const q = at(i + Math.floor(rnd() * 2), side * (2.1 + rnd() * 1.1));
          g.fillStyle = crowd[Math.floor(rnd() * crowd.length)];
          g.fillRect(q[0] - hw * .09, q[1] - hw * .09, hw * .18, hw * .18);
        }
      }
      const e0 = at(12, side * 3.45);
      const e1 = at(100, side * 3.45);
      g.strokeStyle = side < 0 ? '#4cc9ff' : '#ff3fa4';
      g.lineWidth = Math.max(1.5, hw * .12);
      g.beginPath();
      for (let i = 12; i <= 100; i++) { const q = at(i, side * 3.45); g[i === 12 ? 'moveTo' : 'lineTo'](q[0], q[1]); }
      g.stroke();
      Glow.glow(g, (e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2, hw * 6, side < 0 ? '#4cc9ff' : '#ff3fa4', .25);
    }
    // Curbs: om de drie stukjes een andere kleur, net als in 3D.
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const alt = Math.floor(i / 3) % 2;
      for (const side of [-1, 1]) {
        const a = at(i, side * 1);
        const b = at(i, side * 1.24);
        const a2 = at(j, side * 1);
        const b2 = at(j, side * 1.24);
        g.fillStyle = alt ? (side < 0 ? '#4cc9ff' : '#ff3fa4') : '#e8f1ff';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
      }
    }
    // Asfalt met een glans in het midden en witte randlijnen.
    g.strokeStyle = weg ? pat(weg, hw * 2) : '#1b2034';
    g.lineWidth = hw * 2.02;
    path();
    g.stroke();
    g.strokeStyle = 'rgba(120, 140, 200, .07)';
    g.lineWidth = hw * 1.1;
    path();
    g.stroke();
    g.strokeStyle = 'rgba(232, 241, 255, .55)';
    g.lineWidth = Math.max(1, hw * .06);
    for (const off of [-.92, .92]) { path(off); g.stroke(); }
    g.setLineDash([hw * .6, hw * .7]);
    g.strokeStyle = 'rgba(232, 241, 255, .35)';
    for (const off of [-1 / 3, 1 / 3]) { path(off); g.stroke(); }
    g.setLineDash([]);
    // Boostpads: gouden pijlen in de rijrichting.
    const pads = [];
    const crystals = [];
    const torches = [];
    const arrow = (q, d, s, fill) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(q[0] + d[0] * s, q[1] + d[1] * s);
      g.lineTo(q[0] - d[0] * s * .6 - d[1] * s * .8, q[1] - d[1] * s * .6 + d[0] * s * .8);
      g.lineTo(q[0] - d[0] * s * .2, q[1] - d[1] * s * .2);
      g.lineTo(q[0] - d[0] * s * .6 + d[1] * s * .8, q[1] - d[1] * s * .6 - d[0] * s * .8);
      g.closePath();
      g.fill();
    };
    for (const s of T.segments) {
      const i = s.i;
      if (s.boost) {
        const q = at(i, s.boost.x);
        arrow(q, dir[i], hw * .32, '#ffd166');
        if (i % 5 === 2) pads.push(q);
      }
      if (s.crystal) crystals.push(at(i, s.crystal.x));
      for (const sp of s.sprites) {
        if (sp.type === 'torch') {
          const q = at(i, sp.x * 1.25);
          g.fillStyle = '#2a3150';
          g.beginPath(); g.arc(q[0], q[1], hw * .16, 0, Math.PI * 2); g.fill();
          torches.push(q);
        } else if (sp.type === 'tower') {
          const q = at(i, sp.x * .95);
          const tw = hw * 1.1;
          // Niet op een ander stuk baan zetten.
          if (P.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < hw * 2.6)) continue;
          g.fillStyle = '#232a4c';
          g.fillRect(q[0] - tw, q[1] - tw, tw * 2, tw * 2);
          g.fillStyle = '#3a4570';
          for (let n = 0; n < 4; n++) {
            g.fillRect(q[0] - tw + (n * tw * 2) / 3.5, q[1] - tw - hw * .2, tw / 3, hw * .3);
            g.fillRect(q[0] - tw + (n * tw * 2) / 3.5, q[1] + tw - hw * .1, tw / 3, hw * .3);
          }
          g.strokeStyle = 'rgba(76, 201, 255, .7)';
          g.lineWidth = Math.max(1, hw * .08);
          g.strokeRect(q[0] - tw, q[1] - tw, tw * 2, tw * 2);
          g.fillStyle = '#ffd166';
          g.beginPath(); g.arc(q[0], q[1], tw * .35, 0, Math.PI * 2); g.fill();
          Glow.glow(g, q[0], q[1], tw * 2.6, '#4cc9ff', .35);
        } else if (sp.type === 'pine') {
          const q = at(i, sp.x * 1.1);
          for (const [rr, col] of [[.7, '#0c2f33'], [.48, '#0f3b3a'], [.25, '#14524a']]) {
            g.fillStyle = col;
            g.beginPath(); g.arc(q[0], q[1], hw * rr, 0, Math.PI * 2); g.fill();
          }
        } else if (sp.type === 'banner') {
          const q = at(i, sp.x * 1.05);
          g.fillStyle = sp.x > 0 ? '#ffd166' : '#4cc9ff';
          g.fillRect(q[0] - hw * .3, q[1] - hw * .2, hw * .6, hw * .4);
        } else if (sp.type === 'arrow') {
          const q = at(i, sp.x * 1.15);
          const d = dir[i];
          const side = [-d[1] * sp.dir, d[0] * sp.dir];
          arrow(q, [d[0] * .4 + side[0] * .9, d[1] * .4 + side[1] * .9], hw * .28, '#ffb21c');
        }
      }
    }
    // Start en finish: een geblokte lijn met twee lichtzuilen.
    const cells = 8;
    for (let n = 0; n < cells; n++) {
      for (let rw = 0; rw < 2; rw++) {
        const a = at(rw, -1 + (2 * n) / cells);
        const b = at(rw, -1 + (2 * (n + 1)) / cells);
        const a2 = at(rw + 1, -1 + (2 * n) / cells);
        const b2 = at(rw + 1, -1 + (2 * (n + 1)) / cells);
        g.fillStyle = (n + rw) % 2 ? '#f4f7ff' : '#11131d';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b2[0], b2[1]); g.lineTo(a2[0], a2[1]); g.closePath(); g.fill();
      }
    }
    const gates = [at(1, -1.45), at(1, 1.45)];
    gates.forEach((q, n) => {
      g.fillStyle = '#2a3150';
      g.beginPath(); g.arc(q[0], q[1], hw * .3, 0, Math.PI * 2); g.fill();
      g.fillStyle = n ? '#ff3fa4' : '#4cc9ff';
      g.beginPath(); g.arc(q[0], q[1], hw * .16, 0, Math.PI * 2); g.fill();
    });
    g.strokeStyle = 'rgba(255, 209, 102, .8)';
    g.lineWidth = Math.max(1, hw * .1);
    g.beginPath(); g.moveTo(gates[0][0], gates[0][1]); g.lineTo(gates[1][0], gates[1][1]); g.stroke();
    boardCache = { W, H, c, P, dir, hw, N, at, pads, crystals, torches, gates };
    return boardCache;
  }

  // racers: [{ dist, x, speed, color, name, flags, lead }]
  function board(ctx, W, H, racers, t) {
    const B = boardCache && boardCache.W === W && boardCache.H === H ? boardCache : bakeBoard(W, H);
    ctx.drawImage(B.c, 0, 0);
    const { hw, N } = B;
    // Fakkels flakkeren, boostpads en kristallen pulseren, de startzuilen gloeien.
    B.torches.forEach((q, i) => Glow.glow(ctx, q[0], q[1], hw * (1.1 + .15 * Math.sin(t * 9 + i * 1.7)), '#ff9a3c', .55));
    B.pads.forEach((q, i) => Glow.glow(ctx, q[0], q[1], hw * 1.4, '#ffd166', .35 + .25 * Math.sin(t * 6 + i)));
    B.crystals.forEach((q, i) => {
      const b = Math.sin(t * 4 + i);
      Glow.glow(ctx, q[0], q[1], hw * (1 + .2 * b), '#4cc9ff', .6);
      const s = hw * .3;
      poly(ctx, [q[0], q[1] - s * 1.4, q[0] + s, q[1], q[0], q[1] + s * 1.4, q[0] - s, q[1]], '#bff0ff');
    });
    B.gates.forEach((q, n) => Glow.glow(ctx, q[0], q[1], hw * 1.6, n ? '#ff3fa4' : '#4cc9ff', .6 + .3 * Math.sin(t * 3 + n)));
    // Een positie op de baan: zacht tussen twee punten in, met de zijwaartse plek op de weg.
    const pos = (dist, x) => {
      const z = T.wrap(dist) / T.SEG;
      const i = Math.floor(z) % N;
      const j = (i + 1) % N;
      const f = z - Math.floor(z);
      const a = B.at(i, x);
      const b = B.at(j, x);
      const d = B.dir[i];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(d[1], d[0])];
    };
    const sorted = [...racers].sort((a, b) => (a.lead ? 1 : 0) - (b.lead ? 1 : 0));
    // Lichtsporen eerst, zodat ze onder alle rossen liggen.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const r of sorted) {
      const col = colorOf(r.color);
      const turbo = r.flags & 2;
      const lenSegs = Math.min(40, 6 + (r.speed || 0) / 300) * (turbo ? 1.5 : 1);
      const x = Math.max(-1.3, Math.min(1.3, r.x || 0));
      let prevQ = pos(r.dist, x);
      const steps = 8;
      for (let n = 1; n <= steps; n++) {
        const q = pos(r.dist - (n / steps) * lenSegs * T.SEG, x);
        ctx.strokeStyle = turbo ? '#ffd166' : col;
        ctx.globalAlpha = .55 * (1 - n / steps);
        ctx.lineWidth = hw * .5 * (1 - n / (steps + 2));
        ctx.beginPath(); ctx.moveTo(prevQ[0], prevQ[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        prevQ = q;
      }
    }
    ctx.restore();
    for (const r of sorted) {
      const col = colorOf(r.color);
      const [rx, ry, ang] = pos(r.dist, Math.max(-1.3, Math.min(1.3, r.x || 0)));
      const s = hw * .55;
      Glow.glow(ctx, rx, ry, s * 2.6, col, .6);
      if (r.lead) Glow.glow(ctx, rx, ry, s * 4 * (1 + .1 * Math.sin(t * 5)), '#ffd166', .45);
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(ang);
      // Uitlaatvlam achteraan.
      const fl = (r.flags & 2 ? 2 : 1) * (1 + .2 * Math.sin(t * 30 + rx));
      poly(ctx, [-s * .9, -s * .3, -s * (.9 + .8 * fl), 0, -s * .9, s * .3], r.flags & 2 ? '#ffd166' : col);
      // Slee van bovenaf: puntige romp, vinnen, ridder met helm en lans.
      poly(ctx, [s * 1.1, 0, s * .3, -s * .55, -s * .9, -s * .5, -s * .9, s * .5, s * .3, s * .55], '#2c3458');
      poly(ctx, [s * .1, -s * .55, -s * .6, -s * .85, -s * .9, -s * .5], col);
      poly(ctx, [s * .1, s * .55, -s * .6, s * .85, -s * .9, s * .5], col);
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, s * .12);
      ctx.beginPath();
      ctx.moveTo(s * 1.1, 0); ctx.lineTo(s * .3, -s * .55); ctx.lineTo(-s * .9, -s * .5); ctx.lineTo(-s * .9, s * .5); ctx.lineTo(s * .3, s * .55); ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = '#dfe6f6';
      ctx.lineWidth = Math.max(1, s * .1);
      ctx.beginPath(); ctx.moveTo(-s * .1, s * .3); ctx.lineTo(s * 1.6, s * .25); ctx.stroke();
      poly(ctx, [-s * .55, -s * .38, -s * .05, -s * .32, -s * .05, s * .32, -s * .55, s * .38], col);
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath(); ctx.arc(-s * .1, 0, s * .3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-s * .4, -s * .05, s * .5, s * .1);
      ctx.restore();
      Glow.glow(ctx, rx + Math.cos(ang) * s * 1.6 - Math.sin(ang) * s * .25, ry + Math.sin(ang) * s * 1.6 + Math.cos(ang) * s * .25, s * .45, '#9fe6ff', .9);
      // Naambordje.
      const size = Math.max(12, hw * .62);
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      const label = `${r.lead ? '👑 ' : ''}${r.flags & 1 ? '⚡ ' : ''}${r.name}`;
      const tw = ctx.measureText(label).width;
      const lx = rx + s * 1.5;
      const ly = ry - s * 1.4;
      ctx.fillStyle = 'rgba(5, 8, 20, .82)';
      ctx.fillRect(lx, ly - size * .95, tw + 10, size * 1.35);
      ctx.fillStyle = col;
      ctx.fillRect(lx, ly - size * .95, 3, size * 1.35);
      ctx.fillText(label, lx + 6, ly + size * .1);
    }
    Glow.vignette(ctx, W, H, .5);
  }

  return { render, map, board, steed, paintedSteed, skyPano, colorOf, COLORS, PLAYER_Z };
})();
