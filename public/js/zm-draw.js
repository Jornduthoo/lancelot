// Zwermwacht tekenen: de geschilderde beelden uit /img/zwermwacht/ (ridder, robots, Kolos, wapens, vloer, arena).
// Elk beeld wordt één keer op de juiste grootte klaargezet (sprite), zodat 150 robots per frame maar 150 keer
// drawImage kosten. Ontbreekt een beeld nog, dan tekenen we een eenvoudig tijdelijk figuurtje.
// De blauwe delen van de ridder krijgen de kleur van de leerling.
const ZmDraw = (() => {
  const ART = {};
  let gen = 0; // gaat omhoog als er een beeld binnenkomt: dan worden de sprites opnieuw gemaakt
  const NAMES = ['ridder', 'kever', 'bij', 'slijm', 'schild', 'drone', 'kolos', 'items', 'vloer', 'arena'];
  for (const n of NAMES) {
    const img = new Image();
    img.onload = () => { ART[n] = img; if (n === 'items') cutItems(img); gen++; cache.clear(); floor = null; };
    img.src = `/img/zwermwacht/${n}.webp`;
  }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const cache = new Map();

  // ---------- Kleuren ----------
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslRgb(h, s, l) {
    h /= 360;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ---------- Het wapenblad (3 x 3) uitknippen ----------
  // 0 zwaard, 1 pijl, 2 schild, 3 bliksem, 4 valk, 5 blauw kristal, 6 groen kristal, 7 goud kristal, 8 hart
  const ITEMS = [];
  function cutItems(img) {
    const cw = img.width / 3, ch = img.height / 3;
    const c = mk(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < 9; i++) {
      const x0 = Math.floor((i % 3) * cw), y0 = Math.floor(Math.floor(i / 3) * ch);
      let l = cw, r = 0, t = ch, b = 0;
      for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
        if (px[((y0 + y) * c.width + x0 + x) * 4 + 3] < 40) continue;
        if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
      }
      ITEMS[i] = r > l ? { x: x0 + l, y: y0 + t, w: r - l + 2, h: b - t + 2 } : { x: x0, y: y0, w: cw, h: ch };
    }
  }

  // ---------- Tijdelijke figuurtjes (tot de beelden er zijn) ----------
  const TEMP = {
    kever: { body: '#a0582a', dark: '#5a2c12', eye: '#ff3b3b', legs: 6 },
    bij: { body: '#e8c43a', dark: '#2b2f3a', eye: '#ff3b3b', wings: '#7fd8ff' },
    slijm: { body: '#9b5cff', dark: '#4a3a5c', eye: '#ff4d6d' },
    schild: { body: '#3a4256', dark: '#1c2130', eye: '#ff3b3b' },
    drone: { body: '#1d1f28', dark: '#c9a23a', eye: '#ff3bd0' },
    kolos: { body: '#4a4f5c', dark: '#c9a23a', eye: '#ff5a1f' },
  };
  function tempEnemy(g, kind, s) {
    const t = TEMP[kind];
    const c = s / 2;
    g.save();
    g.translate(c, c);
    g.lineWidth = Math.max(1.5, s * .035);
    g.strokeStyle = '#0a0c14';
    if (t.legs) {
      g.strokeStyle = t.dark;
      for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
        g.beginPath(); g.moveTo(side * s * .18, (i - 1) * s * .14); g.lineTo(side * s * .4, (i - 1) * s * .2 + s * .05); g.stroke();
      }
      g.strokeStyle = '#0a0c14';
    }
    if (t.wings) {
      g.fillStyle = rgba(t.wings, .75);
      for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * s * .26, -s * .12, s * .2, s * .12, side * .5, 0, Math.PI * 2); g.fill(); }
    }
    const grad = g.createRadialGradient(-s * .1, -s * .14, s * .04, 0, 0, s * .4);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(.15, t.body);
    grad.addColorStop(1, t.dark);
    g.fillStyle = grad;
    g.beginPath();
    if (kind === 'schild') g.roundRect(-s * .3, -s * .32, s * .6, s * .64, s * .12);
    else g.ellipse(0, 0, s * (kind === 'bij' ? .24 : .36), s * (kind === 'bij' ? .3 : .32), 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    if (kind === 'bij') { g.fillStyle = t.dark; for (let i = 0; i < 2; i++) g.fillRect(-s * .22, s * (.02 + i * .12), s * .44, s * .05); }
    if (kind === 'kolos' || kind === 'drone') { g.strokeStyle = t.dark; g.lineWidth = s * .05; g.beginPath(); g.ellipse(0, 0, s * .42, s * .12, 0, 0, Math.PI * 2); g.stroke(); }
    if (kind === 'schild') { g.fillStyle = '#8b93a8'; g.beginPath(); g.arc(0, s * .14, s * .2, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = t.eye;
    g.shadowColor = t.eye;
    g.shadowBlur = s * .12;
    const eyes = kind === 'drone' || kind === 'bij' ? [0] : [-.11, .11];
    for (const ex of eyes) { g.beginPath(); g.arc(ex * s, -s * .1, s * (eyes.length === 1 ? .09 : .065), 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function tempItem(g, i, s) {
    const c = s / 2;
    g.save();
    g.translate(c, c);
    const COL = ['#5ee7ff', '#5ee7ff', '#4c9dff', '#ffd84a', '#7fd8ff', '#4cc9ff', '#4ade80', '#ffc94a', '#ff4d6d'];
    g.fillStyle = COL[i];
    g.strokeStyle = '#0a0c14';
    g.lineWidth = Math.max(1, s * .05);
    g.shadowColor = COL[i];
    g.shadowBlur = s * .2;
    g.beginPath();
    if (i === 0) { g.moveTo(0, -s * .45); g.lineTo(s * .08, s * .2); g.lineTo(-s * .08, s * .2); }
    else if (i === 1) { g.moveTo(s * .45, 0); g.lineTo(-s * .3, s * .1); g.lineTo(-s * .3, -s * .1); }
    else if (i === 2) g.arc(0, 0, s * .38, 0, Math.PI * 2);
    else if (i === 3) { g.moveTo(s * .1, -s * .42); g.lineTo(-s * .16, s * .04); g.lineTo(s * .04, s * .04); g.lineTo(-s * .1, s * .42); g.lineTo(s * .18, -s * .06); g.lineTo(-s * .02, -s * .06); }
    else if (i === 4) { g.moveTo(0, -s * .3); g.lineTo(s * .42, s * .1); g.lineTo(0, 0); g.lineTo(-s * .42, s * .1); }
    else if (i === 8) { g.moveTo(0, s * .35); g.bezierCurveTo(-s * .5, 0, -s * .25, -s * .4, 0, -s * .15); g.bezierCurveTo(s * .25, -s * .4, s * .5, 0, 0, s * .35); }
    else { g.moveTo(0, -s * .42); g.lineTo(s * .22, 0); g.lineTo(0, s * .42); g.lineTo(-s * .22, 0); }
    g.closePath();
    if (i === 2) { g.globalAlpha = .45; g.fill(); g.globalAlpha = 1; g.stroke(); } else { g.fill(); g.stroke(); }
    g.restore();
  }

  // ---------- Sprites ----------
  // Een figuur, zo groot dat hij s pixels breed is (het beeld houdt zijn verhouding). Met flip in spiegelbeeld,
  // met flash wit (net geraakt), met color de blauwe delen in die kleur (de ridder).
  function sprite(name, s, o = {}) {
    s = Math.max(8, Math.round(s));
    const key = `${name}|${s}|${o.flip ? 1 : 0}|${o.flash ? 1 : 0}|${o.color || ''}|${gen}`;
    let c = cache.get(key);
    if (c) return c;
    if (o.flip || o.flash) {
      const base = sprite(name, s, { color: o.color });
      c = mk(base.width, base.height);
      const g = c.getContext('2d');
      if (o.flip) { g.translate(c.width, 0); g.scale(-1, 1); }
      g.drawImage(base, 0, 0);
      if (o.flash) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.fillRect(0, 0, c.width, c.height);
      }
    } else if (name.startsWith('item')) {
      const i = Number(name.slice(4));
      const box = ART.items && ITEMS[i];
      if (box) {
        const k = s / Math.max(box.w, box.h);
        c = mk(box.w * k, box.h * k);
        c.getContext('2d').drawImage(ART.items, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
      } else {
        c = mk(s, s);
        tempItem(c.getContext('2d'), i, s);
      }
    } else if (ART[name]) {
      const img = ART[name];
      c = mk(s, s * img.height / img.width);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, c.width, c.height);
      if (o.color) tint(g, c, o.color);
    } else if (name === 'ridder') {
      c = mk(s, s * 1.15);
      const g = c.getContext('2d');
      AK.knight(g, s / 2, s * .6, Math.PI / 2, { r: s * .3, color: o.color || '#4cc9ff', ring: false });
    } else {
      c = mk(s, s);
      tempEnemy(c.getContext('2d'), name, s);
    }
    if (cache.size > 260) cache.clear();
    cache.set(key, c);
    return c;
  }

  function tint(g, c, color) {
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

  // ---------- Gloed ----------
  const glows = new Map();
  function glowSprite(color) {
    let c = glows.get(color);
    if (c) return c;
    c = mk(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(color, 1));
    gr.addColorStop(.35, rgba(color, .45));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glows.set(color, c);
    return c;
  }
  function glow(ctx, x, y, r, color, a = 1) {
    ctx.globalAlpha = a;
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // ---------- De vloer ----------
  // Eén tegel (een geschilderd beeld of een tijdelijke stenen vloer), herhaald onder de camera.
  let floor = null;
  const TILE = 640; // zo groot is één vloertegel in de wereld
  function floorTile(zoom) {
    const px = Math.min(1024, Math.max(128, Math.round(TILE * zoom)));
    if (floor && floor.px === px) return floor;
    const c = mk(px, px), g = c.getContext('2d');
    if (ART.vloer) {
      g.drawImage(ART.vloer, 0, 0, px, px);
      // Wat donkerder, zodat de robots en kristallen goed opvallen.
      g.fillStyle = 'rgba(6,9,22,.5)';
      g.fillRect(0, 0, px, px);
    }
    else {
      const k = px / TILE;
      g.fillStyle = '#141a2c';
      g.fillRect(0, 0, px, px);
      const r = ZmWorld.rng(7);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const v = 22 + Math.floor(r() * 10);
        g.fillStyle = `rgb(${v},${v + 4},${v + 18})`;
        g.fillRect((x * 128 + 3) * k, (y * 128 + 3) * k, 122 * k, 122 * k);
      }
      g.strokeStyle = 'rgba(94,231,255,.22)';
      g.lineWidth = 2 * k;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128 * k, 0); g.lineTo(i * 128 * k, px); g.moveTo(0, i * 128 * k); g.lineTo(px, i * 128 * k); g.stroke(); }
    }
    floor = { c, px, pat: null };
    return floor;
  }
  // De vloer onder camera (cx, cy) op schaal zoom, over het hele canvas (w x h pixels).
  function drawFloor(ctx, w, h, cx, cy, zoom) {
    const f = floorTile(zoom);
    if (!f.pat) f.pat = ctx.createPattern(f.c, 'repeat');
    const k = f.px / TILE;
    const ox = (((w / 2 - cx * zoom) % (TILE * zoom)) + TILE * zoom) % (TILE * zoom);
    const oy = (((h / 2 - cy * zoom) % (TILE * zoom)) + TILE * zoom) % (TILE * zoom);
    ctx.save();
    ctx.translate(ox - TILE * zoom, oy - TILE * zoom);
    ctx.scale(zoom / k, zoom / k);
    ctx.fillStyle = f.pat;
    ctx.fillRect(0, 0, (w + TILE * zoom * 2) * k / zoom, (h + TILE * zoom * 2) * k / zoom);
    ctx.restore();
  }

  // De arena voor het bord en de wachtzaal: het geschilderde beeld, of een donkere burchtplaats.
  let arenaCache = null;
  function arena(ctx, w, h) {
    if (!arenaCache || arenaCache.w !== w || arenaCache.h !== h || arenaCache.gen !== gen) {
      const c = mk(w, h), g = c.getContext('2d');
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .7);
      gr.addColorStop(0, '#1c2440');
      gr.addColorStop(1, '#070914');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      if (ART.arena) {
        // De ronde burcht in het midden, zo groot als past; erbuiten de donkere nacht.
        const img = ART.arena, s = Math.min(w, h) * 1.02;
        g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s * img.height / img.width);
        g.fillStyle = 'rgba(6,8,20,.3)';
        g.fillRect(0, 0, w, h);
      } else {
        g.strokeStyle = 'rgba(94,231,255,.25)';
        g.lineWidth = 3;
        g.beginPath(); g.ellipse(w / 2, h / 2, w * .46, h * .44, 0, 0, Math.PI * 2); g.stroke();
      }
      arenaCache = { c, w, h, gen };
    }
    ctx.drawImage(arenaCache.c, 0, 0);
  }

  return { ART, NAMES, sprite, glow, glowSprite, drawFloor, arena, rgba, get gen() { return gen; } };
})();
