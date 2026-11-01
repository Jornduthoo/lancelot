// Ontsnap uit de kerker tekenen: een kerkergang in nep-3D (perspectief) met aan het einde de deur van nu.
// Stenen muren met gouden beslag en lichtende circuitlijnen, pilaren met blauwe plasmafakkels, cellen met tralies,
// kettingen en een stalen deur met een slot dat bij het soort deur past (zoals op het icoon).
// De gang, de deur en de Kerkermeester worden één keer vooraf getekend per schermgrootte; elke frame zetten we ze
// alleen nog op hun plek, met vlammen, stofjes, vliegende sleutels en het openen van de deur erbovenop.
// Gebruikt Glow uit fx.js, AK (Particles) uit arena-kit.js en KkWorld.
const KkDraw = (() => {
  const { glow, rgba } = Glow;
  const W = KkWorld;
  const CAM_H = 1.8; // ooghoogte
  const HALF = 3.5; // halve breedte van de gang
  const CEIL = 5.5; // hoogte van het plafond
  const DOOR_Z = 12; // daar staat de deur
  const DHW = 1.7; // halve breedte van de deur
  const SPRING = 3.0; // daar begint de boog
  const DTOP = SPRING + DHW; // top van de boog
  const LOCK_Y = 2.15; // midden van het slot
  const PILLARS = [4.6, 8.4];
  const FOG = '#060a14';
  const STONE = ['#2b3242', '#323a4b', '#283040', '#384152', '#2f3646', '#3a3f4f'];

  function rand(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (a, b, k) => {
    const pa = hex(a), pb = hex(b);
    return '#' + pa.map((v, i) => Math.round(v * (1 - k) + pb[i] * k).toString(16).padStart(2, '0')).join('');
  };

  // Geschilderde beelden (public/img/kerker/): de gang, de deuren, de Kerkermeester en de sleutel.
  // De ridders van achteren delen we met Laserslag. Zonder beeld tekenen we alles zoals vroeger.
  const ART = {};
  let artVer = 0;
  const SRC = { gang: 'kerker/gang', deur: 'kerker/deur', poort: 'kerker/poort', meester: 'kerker/meester', sleutel: 'kerker/sleutel', ridder: 'laserslag/ridder-achter' };
  if (typeof Image !== 'undefined') {
    for (const [n, src] of Object.entries(SRC)) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artVer++; knightCache.clear(); };
      img.src = `/img/${src}.webp`;
    }
  }
  // Waar de boog in het geschilderde gangbeeld zit (pixels in gang.webp, 1376 x 768): links, rechts, top, onderkant.
  const GANG = { w: 1376, h: 768, x0: 594, x1: 781, y0: 244, y1: 533, torches: [[318, 268, 1], [1058, 268, 1], [476, 330, .7], [902, 330, .7]] };
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
  // De geschilderde ridder in de kleur van de speler: het blauw wordt zijn kleur, het cyaan blijft cyaan.
  function paintedKnight(color) {
    const img = ART.ridder;
    const c = document.createElement('canvas');
    c.height = 200; c.width = Math.round(200 * img.width / img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
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
    return c;
  }
  // De geschilderde sleutel ligt schuin; voor het vliegen leggen we hem plat (ring links), op 120 x 60.
  let paintedKey = null;
  function keyImage(fallback) {
    if (!ART.sleutel) return fallback;
    if (paintedKey) return paintedKey;
    const c = document.createElement('canvas');
    c.width = 120; c.height = 60;
    const g = c.getContext('2d'), img = ART.sleutel;
    const len = Math.hypot(img.width, img.height), k = 124 / len;
    g.translate(60, 30); g.rotate(Math.PI / 4); g.scale(k, k);
    g.drawImage(img, -img.width / 2, -img.height / 2);
    return (paintedKey = c);
  }
  const scale = (c, f) => '#' + hex(c).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
  function poly(g, pts, fill, stroke, lw = 1) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeIn = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * k);
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  // Fakkels: daar valt het licht op de stenen (x, y, z).
  const TORCHES = [[-HALF + .42, 2.7, PILLARS[0] - .02], [HALF - .42, 2.7, PILLARS[0] - .02], [-HALF + .42, 2.7, PILLARS[1] - .02], [HALF - .42, 2.7, PILLARS[1] - .02], [-2.45, 2.9, DOOR_Z - .05], [2.45, 2.9, DOOR_Z - .05]];
  function light(x, y, z) {
    let l = 0;
    for (const [tx, ty, tz] of TORCHES) l += Math.exp(-((x - tx) ** 2 + (y - ty) ** 2 + (z - tz) ** 2) / 3.2);
    return Math.min(1, l);
  }
  // Een steen krijgt zijn kleur: wat licht van een fakkel, en hoe verder weg, hoe meer hij in het donker verdwijnt.
  function tone(base, x, y, z, f = 1) {
    const l = light(x, y, z);
    let c = scale(base, f * (.8 + l * .55));
    c = mix(c, '#3d7fb8', l * .28);
    const fog = Math.min(.82, Math.max(0, (z - 3) / 13));
    return mix(c, FOG, fog * .75);
  }

  // ---------- Plaatjes die één keer getekend worden ----------
  // De gouden sleutel met een blauw kristal (zoals op het icoon). Punt naar rechts.
  function keySprite() {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 60;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    glow(g, 26, 30, 30, '#5ee7ff', .7);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      poly(g, [[26 + Math.cos(a - .2) * 17, 30 + Math.sin(a - .2) * 17], [26 + Math.cos(a) * 23, 30 + Math.sin(a) * 23], [26 + Math.cos(a + .2) * 17, 30 + Math.sin(a + .2) * 17]], '#e8b54a', '#7a520c', 1.5);
    }
    g.fillStyle = '#d9a23a'; g.beginPath(); g.arc(26, 30, 17, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a520c'; g.lineWidth = 2; g.stroke();
    poly(g, [[26, 19], [35, 30], [26, 41], [17, 30]], '#3d8bff', '#bff3ff', 1.5);
    poly(g, [[26, 19], [35, 30], [26, 30]], '#8fd8ff');
    poly(g, [[42, 26], [104, 26], [104, 34], [42, 34]], '#e8b54a', '#7a520c', 1.5);
    poly(g, [[42, 26], [104, 26], [104, 29], [42, 29]], '#ffe08a');
    poly(g, [[86, 34], [94, 34], [94, 48], [86, 48]], '#d9a23a', '#7a520c', 1.5);
    poly(g, [[98, 34], [106, 34], [106, 44], [98, 44]], '#d9a23a', '#7a520c', 1.5);
    poly(g, [[44, 22], [52, 22], [52, 38], [44, 38]], '#c99a2e', '#7a520c', 1.5);
    return c;
  }

  // Een ridder van achteren, voor de klas vooraan in beeld: cape in zijn kleur, schouderstukken, helm met pluim.
  const knightCache = new Map();
  function knightSprite(color) {
    let c = knightCache.get(color);
    if (c) return c;
    if (ART.ridder) { c = paintedKnight(color); knightCache.set(color, c); return c; }
    c = document.createElement('canvas');
    c.width = 120; c.height = 150;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    const cx = 60;
    glow(g, cx, 140, 60, color, .35, .3);
    // Cape
    const cg = g.createLinearGradient(0, 60, 0, 150);
    cg.addColorStop(0, mix(color, '#000000', .25));
    cg.addColorStop(1, mix(color, '#000000', .65));
    poly(g, [[cx - 30, 62], [cx + 30, 62], [cx + 44, 150], [cx - 44, 150]], cg, 'rgba(0,0,0,.6)', 2);
    for (const dx of [-16, 0, 16]) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + dx * .7, 70); g.lineTo(cx + dx * 1.3, 150); g.stroke(); }
    g.strokeStyle = mix(color, '#ffffff', .45); g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 44, 148); g.lineTo(cx + 44, 148); g.stroke();
    // Schouderstukken (staal met gouden rand)
    for (const s of [-1, 1]) {
      const pg = g.createLinearGradient(cx + s * 20, 52, cx + s * 46, 80);
      pg.addColorStop(0, '#c9d3e3'); pg.addColorStop(.5, '#6b7890'); pg.addColorStop(1, '#2a3242');
      poly(g, [[cx + s * 12, 54], [cx + s * 40, 58], [cx + s * 48, 76], [cx + s * 40, 84], [cx + s * 16, 76]], pg, '#0b0d13', 2);
      poly(g, [[cx + s * 40, 58], [cx + s * 48, 76], [cx + s * 44, 78], [cx + s * 37, 61]], '#e8b54a');
    }
    // Helm
    const hg = g.createRadialGradient(cx - 8, 26, 2, cx, 36, 30);
    hg.addColorStop(0, '#f4f8ff'); hg.addColorStop(.4, '#9aa8bf'); hg.addColorStop(1, '#2a3344');
    g.fillStyle = hg;
    g.beginPath(); g.ellipse(cx, 36, 22, 26, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#0b0d13'; g.lineWidth = 2.5; g.stroke();
    poly(g, [[cx - 3, 10], [cx + 3, 10], [cx + 3, 60], [cx - 3, 60]], '#e8b54a', '#7a520c', 1);
    // Pluim in zijn kleur
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = i % 2 ? color : mix(color, '#ffffff', .35);
      g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, 12); g.quadraticCurveTo(cx + 10 + i * 3, -2 + i * 2, cx + 22 + i * 4, 18 + i * 5); g.stroke();
    }
    glow(g, cx, 36, 30, color, .18);
    knightCache.set(color, c);
    return c;
  }

  // De Kerkermeester: een grote robotbewaker van donker staal met gouden beslag, een rood vizier,
  // een sleutelbos aan zijn riem en een hellebaard van licht. 400 x 520, voeten onderaan in het midden.
  function guardSprite(flash) {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 520;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    const cx = 200;
    const steel = (x0, y0, x1, y1, a = '#5b6880', b = '#1c2230') => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
    // Een gescheurde mantel achter hem
    const cape = g.createLinearGradient(0, 130, 0, 500);
    cape.addColorStop(0, '#3a0d16'); cape.addColorStop(1, '#12040a');
    poly(g, [[cx - 104, 140], [cx + 104, 140], [cx + 128, 470], [cx + 96, 490], [cx + 70, 462], [cx + 40, 496], [cx, 470], [cx - 40, 498], [cx - 72, 464], [cx - 100, 492], [cx - 128, 470]], cape, '#05070d', 3);
    g.strokeStyle = 'rgba(255,90,58,.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 126, 466); g.lineTo(cx - 100, 490); g.lineTo(cx - 72, 462); g.lineTo(cx - 40, 496); g.lineTo(cx, 468); g.lineTo(cx + 40, 494); g.lineTo(cx + 70, 460); g.lineTo(cx + 96, 488); g.lineTo(cx + 126, 466); g.stroke();
    // Hellebaard achter hem
    poly(g, [[318, 30], [326, 30], [330, 500], [314, 500]], '#3a2a22', '#120c0a', 2);
    glow(g, 322, 60, 70, '#ff5a3a', .5);
    poly(g, [[322, 4], [352, 40], [340, 92], [322, 74], [304, 92], [292, 40]], '#ff8c6a', '#ffd2c4', 2);
    poly(g, [[322, 14], [340, 42], [322, 64], [304, 42]], '#fff1ea');
    // Benen
    for (const s of [-1, 1]) {
      poly(g, [[cx + s * 18, 360], [cx + s * 66, 360], [cx + s * 70, 470], [cx + s * 22, 470]], steel(cx, 360, cx + s * 70, 470), '#0b0d13', 3);
      poly(g, [[cx + s * 14, 462], [cx + s * 82, 462], [cx + s * 90, 512], [cx + s * 8, 512]], steel(cx, 462, cx, 512, '#4a566c', '#141822'), '#0b0d13', 3);
      poly(g, [[cx + s * 20, 400], [cx + s * 68, 400], [cx + s * 69, 414], [cx + s * 21, 414]], '#c99a2e', '#7a520c', 1.5);
      glow(g, cx + s * 44, 440, 22, '#ff5a3a', .5);
    }
    // Romp
    poly(g, [[cx - 96, 150], [cx + 96, 150], [cx + 76, 300], [cx + 52, 368], [cx - 52, 368], [cx - 76, 300]], steel(cx - 96, 150, cx + 96, 368, '#66748e', '#1a202c'), '#0b0d13', 3);
    poly(g, [[cx - 96, 150], [cx, 150], [cx, 368], [cx - 52, 368], [cx - 76, 300]], 'rgba(255,255,255,.06)');
    // Borstplaat met een gloeiende kern
    poly(g, [[cx - 54, 176], [cx + 54, 176], [cx + 44, 262], [cx, 290], [cx - 44, 262]], '#2b3242', '#c99a2e', 4);
    glow(g, cx, 226, 70, '#ff6a3a', .9);
    poly(g, [[cx, 196], [cx + 22, 226], [cx, 256], [cx - 22, 226]], '#ffb38a', '#fff0e6', 2);
    poly(g, [[cx, 206], [cx + 12, 226], [cx, 246], [cx - 12, 226]], '#ffffff');
    // Lichtende lijnen in het pantser
    g.lineCap = 'round';
    for (const [pts, col] of [[[[cx - 70, 170], [cx - 62, 210], [cx - 70, 250], [cx - 58, 290]], '#ff5a3a'], [[[cx + 70, 170], [cx + 62, 210], [cx + 70, 250], [cx + 58, 290]], '#ff5a3a'], [[[cx - 36, 280], [cx, 300], [cx + 36, 280]], '#5ee7ff']]) {
      for (const [lw, a] of [[8, .25], [3, 1]]) {
        g.strokeStyle = rgba(col, a); g.lineWidth = lw;
        g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.stroke();
      }
    }
    // Riem met sleutelbos
    poly(g, [[cx - 70, 312], [cx + 70, 312], [cx + 66, 334], [cx - 66, 334]], '#3a2a22', '#120c0a', 2);
    poly(g, [[cx - 14, 308], [cx + 14, 308], [cx + 14, 338], [cx - 14, 338]], '#e8b54a', '#7a520c', 2);
    g.strokeStyle = '#e8b54a'; g.lineWidth = 4;
    g.beginPath(); g.arc(cx - 52, 352, 16, 0, Math.PI * 2); g.stroke();
    for (const [dx, a] of [[-64, .3], [-52, 0], [-40, -.3]]) {
      g.save(); g.translate(cx + dx, 366); g.rotate(a);
      poly(g, [[-3, 0], [3, 0], [3, 34], [-3, 34]], '#e8b54a', '#7a520c', 1);
      poly(g, [[3, 24], [10, 24], [10, 30], [3, 30]], '#e8b54a');
      g.restore();
    }
    // Armen
    for (const s of [-1, 1]) {
      poly(g, [[cx + s * 92, 170], [cx + s * 126, 182], [cx + s * 132, 292], [cx + s * 104, 300], [cx + s * 88, 200]], steel(cx + s * 90, 170, cx + s * 130, 300), '#0b0d13', 3);
      poly(g, [[cx + s * 100, 286], [cx + s * 136, 286], [cx + s * 140, 330], [cx + s * 100, 334]], steel(0, 286, 0, 334, '#5b6880', '#202634'), '#0b0d13', 3);
      for (let i = 0; i < 3; i++) poly(g, [[cx + s * (104 + i * 11), 330], [cx + s * (112 + i * 11), 330], [cx + s * (112 + i * 11), 346], [cx + s * (104 + i * 11), 346]], '#c99a2e', '#7a520c', 1);
    }
    // Schouderstukken: groot en goud omrand, met stekels
    for (const s of [-1, 1]) {
      poly(g, [[cx + s * 64, 128], [cx + s * 132, 136], [cx + s * 150, 176], [cx + s * 132, 200], [cx + s * 70, 186]], steel(cx + s * 64, 128, cx + s * 150, 200, '#8090aa', '#232a38'), '#0b0d13', 3);
      poly(g, [[cx + s * 132, 136], [cx + s * 150, 176], [cx + s * 140, 180], [cx + s * 124, 142]], '#e8b54a', '#7a520c', 1.5);
      for (const k of [0, 1, 2]) poly(g, [[cx + s * (84 + k * 22), 132 + k * 2], [cx + s * (92 + k * 22), 104 + k * 4], [cx + s * (100 + k * 22), 134 + k * 2]], '#b9c4d6', '#0b0d13', 2);
    }
    // Hoofd: een grote helm met een gloeiende kijkspleet
    poly(g, [[cx - 44, 60], [cx + 44, 60], [cx + 52, 104], [cx + 40, 150], [cx - 40, 150], [cx - 52, 104]], steel(cx - 50, 60, cx + 50, 150, '#8a98b2', '#1e2532'), '#0b0d13', 3);
    poly(g, [[cx - 44, 60], [cx, 50], [cx + 44, 60], [cx + 30, 70], [cx - 30, 70]], '#a9b6cc', '#0b0d13', 2);
    poly(g, [[cx - 4, 40], [cx + 4, 40], [cx + 6, 150], [cx - 6, 150]], '#e8b54a', '#7a520c', 1.5);
    glow(g, cx, 100, 90, '#ff3a2a', .9);
    poly(g, [[cx - 40, 92], [cx + 40, 92], [cx + 36, 108], [cx - 36, 108]], '#ff5a3a', '#ffd2c4', 2);
    poly(g, [[cx - 34, 96], [cx + 34, 96], [cx + 32, 101], [cx - 32, 101]], '#ffffff');
    for (const dx of [-22, -11, 11, 22]) poly(g, [[cx + dx - 2, 116], [cx + dx + 2, 116], [cx + dx + 2, 140], [cx + dx - 2, 140]], '#0b0d13');
    // Hoorns van goud
    for (const s of [-1, 1]) poly(g, [[cx + s * 44, 70], [cx + s * 80, 30], [cx + s * 74, 52], [cx + s * 50, 86]], '#e8b54a', '#7a520c', 2);
    if (flash) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,240,230,.85)';
      g.fillRect(0, 0, c.width, c.height);
    }
    return c;
  }

  // De geschilderde Kerkermeester, en een witte flits-versie voor als hij geraakt wordt.
  function paintedGuard() {
    const img = ART.meester;
    const n = document.createElement('canvas');
    n.height = 520; n.width = Math.round(520 * img.width / img.height);
    n.getContext('2d').drawImage(img, 0, 0, n.width, n.height);
    const f = document.createElement('canvas');
    f.width = n.width; f.height = n.height;
    const g = f.getContext('2d');
    g.drawImage(n, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,240,230,.75)';
    g.fillRect(0, 0, f.width, f.height);
    return { n, f, art: artVer, glow: [.12, .32] };
  }

  // ---------- De gang ----------
  class Scene {
    constructor({ board = false } = {}) {
      this.board = board;
      this.w = 0; this.h = 0;
      this.fx = new AK.Particles();
      this.anims = [];
      this.key = keySprite();
      this.guard = null;
      this.doorCache = new Map();
      this.dust = [...Array(board ? 60 : 36)].map(() => ({ x: Math.random(), y: Math.random(), s: .4 + Math.random(), v: .2 + Math.random() * .6, p: Math.random() * 6 }));
      this.hitAt = 0;
      this.shakeUntil = 0;
      this.badAt = 0;
      this.knightPos = new Map();
    }

    project(x, y, z) {
      return [this.cx + this.f * x / z, this.hor + this.f * (CAM_H - y) / z];
    }

    layout(w, h) {
      const tall = w < h;
      this.f = Math.min(h * 1.29, tall ? w * 1.65 : w * 1.1);
      this.cx = w / 2;
      this.hor = h * (this.board ? .43 : tall ? .37 : .45) + this.f * .025;
      this.s = this.f / DOOR_Z; // pixels per meter op de deur
      const [x0, y0] = this.project(-DHW, DTOP, DOOR_Z);
      this.door = { x: x0, y: y0, w: DHW * 2 * this.s, h: DTOP * this.s };
      this.lock = this.project(0, LOCK_Y, DOOR_Z);
      this.art = artVer;
      this.paint = null;
      if (ART.gang) {
        // Het geschilderde beeld zo groot dat zijn boog even hoog is als de deur, met de onderkant op dezelfde plek.
        const d = this.door, k = d.h / (GANG.y1 - GANG.y0);
        const ox = this.cx - (GANG.x0 + GANG.x1) / 2 * k, oy = d.y + d.h - GANG.y1 * k;
        this.paint = { k, ox, oy };
        const dw = (GANG.x1 - GANG.x0) * k;
        this.door = { x: this.cx - dw / 2, y: d.y, w: dw, h: d.h };
      }
    }

    resize(w, h) {
      if (w === this.w && h === this.h && this.art === artVer) return false;
      this.w = w; this.h = h;
      this.layout(w, h);
      this.doorCache.clear();
      this.bake();
      return true;
    }

    // De boog van de deur als pad op het scherm.
    archPath(g, grow = 0) {
      const d = this.door, cx = d.x + d.w / 2, fy = d.y + d.h, r0 = d.w / 2, sy = d.y + r0;
      const r = r0 + grow * this.s;
      g.beginPath();
      g.moveTo(cx - r, fy);
      g.lineTo(cx - r, sy);
      g.arc(cx, sy, r, Math.PI, 0);
      g.lineTo(cx + r, fy);
      g.closePath();
    }

    // ---------- Vooraf tekenen ----------
    bake() {
      const { w, h } = this;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.lineJoin = 'round';
      g.fillStyle = FOG;
      g.fillRect(0, 0, w, h);
      this.flames = [];
      this.eyes = [];
      if (this.paint) { this.paintedBake(g); this.bg = c; return; }
      this.endWall(g);
      this.ceiling(g);
      for (const side of [-1, 1]) this.wall(g, side);
      this.floor(g);
      for (let i = PILLARS.length - 1; i >= 0; i--) for (const side of [-1, 1]) this.pillar(g, side, PILLARS[i]);
      for (const [x, z] of [[-2.2, 6.8], [2.5, 10.2]]) this.chain(g, x, z);
      this.beam(g);
      Glow.vignette(g, w, h, .55);
      this.bg = c;
    }

    // De geschilderde gang. Valt het beeld boven of onder het scherm te kort, dan vullen we aan met een gespiegelde strook.
    paintedBake(g) {
      const { w, h } = this, { k, ox, oy } = this.paint, img = ART.gang;
      const iw = GANG.w * k, ih = GANG.h * k;
      g.drawImage(img, ox, oy, iw, ih);
      if (oy + ih < h) {
        g.save(); g.translate(0, (oy + ih) * 2); g.scale(1, -1);
        g.drawImage(img, ox, oy, iw, ih);
        g.restore();
        const gr = g.createLinearGradient(0, oy + ih, 0, h);
        gr.addColorStop(0, 'rgba(6,10,20,.25)'); gr.addColorStop(1, 'rgba(6,10,20,.8)');
        g.fillStyle = gr; g.fillRect(0, oy + ih, w, h - oy - ih);
      }
      if (oy > 0) {
        g.save(); g.translate(0, oy * 2); g.scale(1, -1);
        g.drawImage(img, ox, oy, iw, ih);
        g.restore();
        g.fillStyle = 'rgba(6,10,20,.55)'; g.fillRect(0, 0, w, oy);
      }
      if (ox > 0) { g.fillStyle = FOG; g.fillRect(0, 0, ox, h); g.fillRect(ox + iw, 0, w, h); }
      Glow.vignette(g, w, h, .4);
      // Fakkels flakkeren (alleen hun gloed) en het nummer komt op de sluitsteen boven de boog.
      this.torchGlow = GANG.torches.map(([x, y, r]) => ({ x: ox + x * k, y: oy + y * k, r: r * k * 60, ph: Math.random() * 10 }));
      const d = this.door;
      this.plaque = [d.x + d.w / 2, d.y - this.s * .16];
    }

    // Een vierhoek tussen vier punten in de wereld.
    quad(g, pts, fill, stroke, lw) {
      poly(g, pts.map(p => this.project(p[0], p[1], Math.max(.35, p[2]))), fill, stroke, lw);
    }

    // De muur achteraan, rond de deur: grote blokken, een boog van wigstenen met gouden beslag.
    endWall(g) {
      const r = rand(77), Z = DOOR_Z;
      const lw = Math.max(1, this.s * .03);
      for (let y = 0, row = 0; y < CEIL; y += .62, row++) {
        let x = -HALF - (row % 2 ? .45 : 0);
        while (x < HALF) {
          const bw = .8 + r() * .5, x1 = Math.min(HALF, x + bw), y1 = Math.min(CEIL, y + .62);
          const base = STONE[Math.floor(r() * STONE.length)];
          this.quad(g, [[Math.max(-HALF, x), y, Z], [x1, y, Z], [x1, y1, Z], [Math.max(-HALF, x), y1, Z]], tone(base, (x + x1) / 2, y + .3, Z, .95), '#05070d', lw);
          this.bevel(g, Math.max(-HALF, x), y, x1, y1, Z);
          x = x1;
        }
      }
      // Circuitlijnen in de muur
      this.circuits(g, r, 14, (u, v) => [-HALF + u * HALF * 2, v * CEIL, Z]);
      // Een donker gat waar de deur zit
      g.fillStyle = '#020308';
      this.archPath(g, .05);
      g.fill();
      // Wigstenen
      const [ax, ay] = this.project(0, SPRING, Z), s = this.s;
      const R0 = DHW + .05, R1 = DHW + .62;
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + i * Math.PI / n, a1 = Math.PI + (i + 1) * Math.PI / n;
        const pts = [[ax + Math.cos(a0) * R0 * s, ay + Math.sin(a0) * R0 * s], [ax + Math.cos(a0) * R1 * s, ay + Math.sin(a0) * R1 * s], [ax + Math.cos(a1) * R1 * s, ay + Math.sin(a1) * R1 * s], [ax + Math.cos(a1) * R0 * s, ay + Math.sin(a1) * R0 * s]];
        const key = i === Math.floor(n / 2);
        poly(g, pts, tone(key ? '#465068' : STONE[i % STONE.length], 0, 4, Z, 1.05), '#05070d', lw * 1.4);
        // Gouden beslag op elke tweede steen
        if (i % 2 === 0) {
          const am = (a0 + a1) / 2, d = .12;
          const p = (rr, aa) => [ax + Math.cos(aa) * rr * s, ay + Math.sin(aa) * rr * s];
          poly(g, [p(R1 - .02, am - d), p(R1 - .02, am + d), p(R1 - .2, am + d * .8), p(R1 - .2, am - d * .8)], '#c99a2e', '#6a4a0c', lw);
          poly(g, [p(R1 - .02, am - d), p(R1 - .02, am + d), p(R1 - .07, am + d * .95), p(R1 - .07, am - d * .95)], '#ffe08a');
        }
      }
      // Sluitsteen met een blauw kristal
      const [kx, ky] = [ax, ay - (R1 + .05) * s];
      poly(g, [[kx - .3 * s, ky - .1 * s], [kx + .3 * s, ky - .1 * s], [kx + .22 * s, ky + .62 * s], [kx - .22 * s, ky + .62 * s]], tone('#4a5570', 0, 4.6, Z, 1.1), '#05070d', lw * 1.4);
      poly(g, [[kx - .3 * s, ky - .1 * s], [kx + .3 * s, ky - .1 * s], [kx + .28 * s, ky - .02 * s], [kx - .28 * s, ky - .02 * s]], '#e8b54a');
      glow(g, kx, ky + .26 * s, .5 * s, '#5ee7ff', .9);
      poly(g, [[kx, ky + .08 * s], [kx + .1 * s, ky + .26 * s], [kx, ky + .44 * s], [kx - .1 * s, ky + .26 * s]], '#3d8bff', '#bff3ff', lw);
      this.plaque = [kx, ky - .38 * s];
      // Stijlstenen naast de deur
      for (const side of [-1, 1]) {
        for (let y = 0; y < SPRING; y += .6) {
          const x0 = side * (DHW + .05), x1 = side * (DHW + .55);
          this.quad(g, [[x0, y, Z], [x1, y, Z], [x1, y + .6, Z], [x0, y + .6, Z]], tone(STONE[Math.round(y * 3) % STONE.length], x0, y, Z, 1.05), '#05070d', lw * 1.4);
          if (Math.round(y / .6) % 2 === 1) {
            this.quad(g, [[x1 - side * .02, y + .2, Z], [x1 - side * .2, y + .2, Z], [x1 - side * .2, y + .38, Z], [x1 - side * .02, y + .38, Z]], '#c99a2e', '#6a4a0c', lw);
          }
        }
      }
      // Fakkels naast de deur
      for (const side of [-1, 1]) this.torch(g, side * 2.45, 2.9, Z - .05);
    }

    // Een lichte rand boven en een donkere onder: de blokken krijgen diepte.
    bevel(g, x0, y0, x1, y1, z) {
      const [a, b] = [this.project(x0, y1, z), this.project(x1, y1, z)];
      const [c, d] = [this.project(x0, y0, z), this.project(x1, y0, z)];
      const lw = Math.max(1, this.f * .012 / z);
      g.strokeStyle = 'rgba(190,210,255,.13)'; g.lineWidth = lw;
      g.beginPath(); g.moveTo(a[0] + lw * 2, a[1] + lw * 1.5); g.lineTo(b[0] - lw * 2, b[1] + lw * 1.5); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.moveTo(c[0] + lw * 2, c[1] - lw * 1.5); g.lineTo(d[0] - lw * 2, d[1] - lw * 1.5); g.stroke();
    }

    // Dunne lichtende lijnen met knooppunten, zoals op het icoon (blauw en paars).
    circuits(g, r, n, map) {
      g.save();
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const col = r() < .65 ? '#3da9ff' : '#9b6bff';
        let u = r(), v = r();
        const pts = [map(u, v)];
        for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
          if (k % 2) u = Math.max(0, Math.min(1, u + (r() - .5) * .25)); else v = Math.max(0, Math.min(1, v + (r() - .5) * .3));
          pts.push(map(u, v));
        }
        const sp = pts.map(p => this.project(p[0], p[1], p[2]));
        const z = pts[0][2];
        const lw = Math.max(.8, this.f * .014 / z);
        for (const [wd, a] of [[lw * 4, .12], [lw, .7]]) {
          g.strokeStyle = rgba(col, a * Math.max(.25, 1 - z / 16));
          g.lineWidth = wd;
          g.beginPath();
          sp.forEach((p, j) => g[j ? 'lineTo' : 'moveTo'](p[0], p[1]));
          g.stroke();
        }
        const last = sp[sp.length - 1];
        glow(g, last[0], last[1], lw * 6, col, .8);
        g.fillStyle = '#dff6ff';
        g.beginPath(); g.arc(last[0], last[1], lw * 1.3, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }

    // Een zijmuur: rijen stenen van ver naar dichtbij, met tralies van een cel.
    wall(g, side) {
      const r = rand(side > 0 ? 311 : 919), x = side * HALF;
      for (let y = 0, row = 0; y < CEIL; y += .55, row++) {
        let z = DOOR_Z;
        if (row % 2) z -= .5;
        while (z > .4) {
          const len = .9 + r() * .7, z0 = Math.max(.4, z - len), y1 = Math.min(CEIL, y + .55);
          const base = STONE[Math.floor(r() * STONE.length)];
          this.quad(g, [[x, y, z0], [x, y, Math.min(DOOR_Z, z)], [x, y1, Math.min(DOOR_Z, z)], [x, y1, z0]], tone(base, x, y + .27, (z + z0) / 2, .92), '#05070d', Math.max(1, this.f * .02 / z0));
          z = z0;
        }
      }
      this.circuits(g, r, 10, (u, v) => [x, .3 + v * (CEIL - .6), 2.2 + u * (DOOR_Z - 2.6)]);
      // Een cel met tralies tussen de pilaren
      const z0 = 5.7, z1 = 7.5, y0 = .9, y1 = 2.5;
      this.quad(g, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], '#03050a', '#1a1f2b', 2);
      this.quad(g, [[x, y0, z0], [x - side * .001, y0, z1], [x, y0 + .06, z1], [x, y0 + .06, z0]], '#c99a2e');
      const eye = this.project(x + side * .4, 1.7, side < 0 ? 6.2 : 6.9);
      this.eyes.push({ x: eye[0], y: eye[1], r: this.f * .045 / 6.5, color: side < 0 ? '#ff4d6d' : '#5ee7ff', phase: side < 0 ? 0 : 2.3 });
      for (let i = 0; i <= 7; i++) {
        const z = z0 + (z1 - z0) * i / 7;
        const [a, b] = [this.project(x, y0, z), this.project(x, y1, z)];
        g.strokeStyle = '#0b0d13'; g.lineWidth = Math.max(2, this.f * .07 / z);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.strokeStyle = '#6b7890'; g.lineWidth = Math.max(1, this.f * .03 / z);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      for (const y of [y0 + .05, (y0 + y1) / 2, y1 - .05]) {
        const [a, b] = [this.project(x, y, z0), this.project(x, y, z1)];
        g.strokeStyle = '#c99a2e'; g.lineWidth = Math.max(1.5, this.f * .05 / z1);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    }

    ceiling(g) {
      const r = rand(5);
      for (let z = DOOR_Z; z > .4;) {
        const z0 = Math.max(.4, z - (.7 + r() * .4));
        let x = -HALF;
        while (x < HALF) {
          const x1 = Math.min(HALF, x + .9 + r() * .6);
          this.quad(g, [[x, CEIL, z0], [x1, CEIL, z0], [x1, CEIL, z], [x, CEIL, z]], tone(STONE[Math.floor(r() * STONE.length)], (x + x1) / 2, CEIL, (z + z0) / 2, .55), '#03050a', Math.max(1, this.f * .02 / z0));
          x = x1;
        }
        z = z0;
      }
    }

    // De vloer: platen met lichtende barsten, en lichtplassen onder de fakkels.
    floor(g) {
      const r = rand(23);
      for (let z = DOOR_Z, row = 0; z > .4; row++) {
        const z0 = Math.max(.4, z - (.8 + r() * .3));
        let x = -HALF - (row % 2 ? .6 : 0);
        while (x < HALF) {
          const x1 = Math.min(HALF, x + 1.1 + r() * .4);
          const xa = Math.max(-HALF, x);
          this.quad(g, [[xa, 0, z0], [x1, 0, z0], [x1, 0, z], [xa, 0, z]], tone(STONE[Math.floor(r() * STONE.length)], (xa + x1) / 2, 0, (z + z0) / 2, .8), '#03050a', Math.max(1, this.f * .025 / z0));
          if (r() < .18) {
            // Een barst met blauw licht erin
            const pts = [];
            let u = xa + .2 + r() * (x1 - xa - .4), v = z0 + .1;
            for (let k = 0; k < 4; k++) { pts.push(this.project(u, 0, v)); u += (r() - .5) * .5; v += (z - z0) / 4; }
            const lw = Math.max(1, this.f * .012 / z0);
            for (const [wd, a] of [[lw * 4, .12], [lw, .65]]) {
              g.strokeStyle = rgba('#5ee7ff', a); g.lineWidth = wd;
              g.beginPath(); pts.forEach((p, j) => g[j ? 'lineTo' : 'moveTo'](p[0], p[1])); g.stroke();
            }
          }
          x = x1;
        }
        z = z0;
      }
      // Glans van de deur en van de fakkels op de vloer
      for (const [tx, , tz] of TORCHES) {
        const [px, py] = this.project(tx * .8, 0, tz - .6);
        glow(g, px, py, this.f * 1.6 / tz, '#3d8bff', .35, .3);
      }
      const [dx, dy] = this.project(0, 0, DOOR_Z - .4);
      glow(g, dx, dy, this.s * 2.4, '#5ee7ff', .35, .25);
    }

    // Een pilaar die uit de muur steekt, met een boog over het plafond en een fakkel.
    pillar(g, side, z) {
      const x0 = side * HALF, x1 = side * (HALF - .42), d = .5;
      const lw = Math.max(1, this.f * .02 / z);
      // Zijkant (naar het midden)
      for (let y = 0; y < CEIL - .45; y += .6) {
        const y1 = Math.min(CEIL - .45, y + .6);
        this.quad(g, [[x1, y, z], [x1, y, z + d], [x1, y1, z + d], [x1, y1, z]], tone('#2a3140', x1, y, z, .75), '#03050a', lw);
      }
      // Voorkant
      for (let y = 0, i = 0; y < CEIL - .45; y += .6, i++) {
        const y1 = Math.min(CEIL - .45, y + .6);
        this.quad(g, [[x0, y, z], [x1, y, z], [x1, y1, z], [x0, y1, z]], tone(STONE[(i + (side > 0 ? 2 : 0)) % STONE.length], x1, y, z, 1.08), '#03050a', lw * 1.3);
        if (i % 2 === 0) {
          this.quad(g, [[x0 + side * -.04, y + .22, z - .01], [x1 + side * .04, y + .22, z - .01], [x1 + side * .04, y + .36, z - .01], [x0 + side * -.04, y + .36, z - .01]], '#c99a2e', '#6a4a0c', lw);
          this.quad(g, [[x0 + side * -.04, y + .33, z - .01], [x1 + side * .04, y + .33, z - .01], [x1 + side * .04, y + .36, z - .01], [x0 + side * -.04, y + .36, z - .01]], '#ffe08a');
        }
      }
      // Balk over het plafond (alleen één keer, vanaf de linkerkant)
      if (side < 0) {
        this.quad(g, [[-HALF, CEIL - .45, z], [HALF, CEIL - .45, z], [HALF, CEIL, z], [-HALF, CEIL, z]], tone('#30384a', 0, CEIL, z, .9), '#03050a', lw * 1.3);
        this.quad(g, [[-HALF, CEIL - .45, z], [HALF, CEIL - .45, z], [HALF, CEIL - .45, z + d], [-HALF, CEIL - .45, z + d]], tone('#232a38', 0, CEIL, z, .7), '#03050a', lw);
        for (const bx of [-1.6, 0, 1.6]) this.quad(g, [[bx - .14, CEIL - .44, z - .01], [bx + .14, CEIL - .44, z - .01], [bx + .14, CEIL - .02, z - .01], [bx - .14, CEIL - .02, z - .01]], '#c99a2e', '#6a4a0c', lw);
        // Lichtstrip onder de balk
        const [a, b] = [this.project(-HALF + .45, CEIL - .47, z), this.project(HALF - .45, CEIL - .47, z)];
        g.strokeStyle = rgba('#5ee7ff', .8); g.lineWidth = Math.max(1.5, this.f * .02 / z);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        glow(g, (a[0] + b[0]) / 2, a[1], (b[0] - a[0]) * .5, '#5ee7ff', .18, .12);
      }
      this.torch(g, side * (HALF - .42), 2.7, z - .02);
    }

    // De fakkelhouder (goud met een blauw kristal). De vlam tekenen we elke frame.
    torch(g, x, y, z) {
      const s = this.f / z;
      const [px, py] = this.project(x, y, z);
      glow(g, px, py - .2 * s, 1.6 * s, '#3d8bff', .4);
      poly(g, [[px - .03 * s, py + .1 * s], [px + .03 * s, py + .1 * s], [px + .02 * s, py + .55 * s], [px - .02 * s, py + .55 * s]], '#7a520c');
      poly(g, [[px - .13 * s, py - .1 * s], [px + .13 * s, py - .1 * s], [px + .07 * s, py + .12 * s], [px - .07 * s, py + .12 * s]], '#e8b54a', '#5a3c08', Math.max(1, s * .015));
      for (const dx of [-.07, 0, .07]) { g.strokeStyle = '#5a3c08'; g.lineWidth = Math.max(1, s * .012); g.beginPath(); g.moveTo(px + dx * s, py - .1 * s); g.lineTo(px + dx * .6 * s, py + .12 * s); g.stroke(); }
      poly(g, [[px, py - .02 * s], [px + .04 * s, py + .05 * s], [px, py + .1 * s], [px - .04 * s, py + .05 * s]], '#5ee7ff');
      this.flames.push({ x: px, y: py - .1 * s, s, ph: Math.random() * 10 });
    }

    // Een ketting van het plafond met een open boei.
    chain(g, x, z) {
      const s = this.f / z;
      const [px, top] = this.project(x, CEIL, z);
      const [, bottom] = this.project(x, 3.4, z);
      const link = .16 * s;
      for (let y = top, i = 0; y < bottom; y += link * .8, i++) {
        g.strokeStyle = '#0b0d13'; g.lineWidth = Math.max(2, s * .05);
        g.beginPath();
        if (i % 2) g.ellipse(px, y, link * .12, link * .5, 0, 0, Math.PI * 2); else g.ellipse(px, y, link * .32, link * .5, 0, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = i % 2 ? '#8590a6' : '#aab4c6'; g.lineWidth = Math.max(1, s * .025);
        g.stroke();
      }
      g.strokeStyle = '#0b0d13'; g.lineWidth = Math.max(3, s * .09);
      g.beginPath(); g.arc(px, bottom + .2 * s, .2 * s, -Math.PI * .3, Math.PI * 1.3); g.stroke();
      g.strokeStyle = '#c99a2e'; g.lineWidth = Math.max(2, s * .05); g.stroke();
    }

    // Licht dat van achter de deur langs de vloer valt (bij een gesloten deur een dunne streep).
    beam(g) {
      const [lx, ly] = this.project(-DHW, 0, DOOR_Z), [rx] = this.project(DHW, 0, DOOR_Z);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const grad = g.createLinearGradient(0, ly, 0, ly + this.h * .12);
      grad.addColorStop(0, 'rgba(94,231,255,.22)');
      grad.addColorStop(1, 'rgba(94,231,255,0)');
      g.fillStyle = grad;
      poly(g, [[lx, ly], [rx, ly], [rx + (rx - lx) * .5, ly + this.h * .12], [lx - (rx - lx) * .5, ly + this.h * .12]], grad);
      g.restore();
    }

    // ---------- De deur zelf ----------
    // Stalen planken met gouden hoekstukken, banden, klinknagels en scharnieren. type 'bewaker': een zware poort.
    doorSprite(type) {
      const key = type;
      if (this.doorCache.has(key)) return this.doorCache.get(key);
      const s = this.s;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(this.door.w)); c.height = Math.max(1, Math.ceil(this.door.h));
      const g = c.getContext('2d');
      g.lineJoin = 'round';
      const pic = type === 'bewaker' ? ART.poort : ART.deur;
      if (pic) {
        // De geschilderde deur, zonder zijn eigen stenen rand (die zit al in de gang).
        const cw = c.width, ch = c.height, sx = pic.width * .085, sy = pic.height * .07;
        g.beginPath(); g.moveTo(0, ch); g.lineTo(0, cw / 2); g.arc(cw / 2, cw / 2, cw / 2, Math.PI, 0); g.lineTo(cw, ch); g.closePath();
        g.clip();
        g.drawImage(pic, sx, sy, pic.width - sx * 2, pic.height - sy, 0, 0, cw, ch);
        const sh = g.createLinearGradient(0, 0, 0, ch);
        sh.addColorStop(0, 'rgba(0,0,0,.25)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
        g.fillStyle = sh; g.fillRect(0, 0, cw, ch);
        this.doorCache.set(key, c);
        return c;
      }
      g.scale(s, s);
      const X = x => x + DHW, Y = y => DTOP - y; // wereld naar plaatje (meters)
      const lw = 1 / s;
      g.save();
      g.beginPath();
      g.moveTo(X(-DHW), Y(0)); g.lineTo(X(-DHW), Y(SPRING)); g.arc(X(0), Y(SPRING), DHW, Math.PI, 0); g.lineTo(X(DHW), Y(0)); g.closePath();
      g.clip();
      const gold = type === 'bewaker';
      // Planken
      const r = rand(type.length * 31 + 7);
      for (let i = 0; i < 8; i++) {
        const x0 = -DHW + i * (DHW * 2 / 8), x1 = x0 + DHW * 2 / 8;
        const base = gold ? ['#2a2420', '#332a22', '#2c2620'][i % 3] : ['#1f2635', '#242c3d', '#1c2331', '#262e40'][i % 4];
        const gr = g.createLinearGradient(X(x0), 0, X(x1), 0);
        gr.addColorStop(0, scale(base, 1.25)); gr.addColorStop(.5, base); gr.addColorStop(1, scale(base, .7));
        g.fillStyle = gr;
        g.fillRect(X(x0), 0, x1 - x0, DTOP);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3 * lw;
        g.beginPath(); g.moveTo(X(x0), 0); g.lineTo(X(x0), DTOP); g.stroke();
        // Krasjes en nerf
        g.strokeStyle = 'rgba(160,190,230,.07)'; g.lineWidth = 1.5 * lw;
        for (let k = 0; k < 5; k++) { const xx = X(x0) + r() * (x1 - x0); const y0 = r() * DTOP; g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx + (r() - .5) * .05, y0 + .3 + r() * .6); g.stroke(); }
      }
      // Lichtglans
      const sheen = g.createLinearGradient(0, 0, DHW * 2, DTOP);
      sheen.addColorStop(0, 'rgba(140,180,255,.12)'); sheen.addColorStop(.5, 'rgba(140,180,255,0)'); sheen.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = sheen; g.fillRect(0, 0, DHW * 2, DTOP);
      // Banden met goud
      const bands = gold ? [.45, 1.25, 2.95, 3.75] : [.55, 3.45];
      for (const by of bands) {
        poly(g, [[0, Y(by + .1)], [DHW * 2, Y(by + .1)], [DHW * 2, Y(by - .1)], [0, Y(by - .1)]], '#151a24', '#05070d', 2 * lw);
        poly(g, [[0, Y(by + .1)], [DHW * 2, Y(by + .1)], [DHW * 2, Y(by + .06)], [0, Y(by + .06)]], gold ? '#e8b54a' : '#c99a2e');
        for (let x = .12; x < DHW * 2; x += .32) { g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(x, Y(by), .028, 0, Math.PI * 2); g.fill(); }
      }
      // Gouden hoekstukken onderaan
      for (const sx of [1, -1]) {
        const x0 = sx > 0 ? .02 : DHW * 2 - .02;
        poly(g, [[x0, Y(.02)], [x0 + sx * .55, Y(.02)], [x0 + sx * .55, Y(.14)], [x0 + sx * .14, Y(.14)], [x0 + sx * .14, Y(.6)], [x0, Y(.6)]], '#e8b54a', '#6a4a0c', 2 * lw);
        poly(g, [[x0, Y(.02)], [x0 + sx * .55, Y(.02)], [x0 + sx * .55, Y(.05)], [x0 + sx * .03, Y(.05)], [x0 + sx * .03, Y(.6)], [x0, Y(.6)]], '#ffe8a3');
      }
      // Scharnieren aan de buitenkant
      for (const hy of [1.0, 2.6]) for (const sx of [1, -1]) {
        const x0 = sx > 0 ? 0 : DHW * 2;
        poly(g, [[x0, Y(hy + .1)], [x0 + sx * .7, Y(hy + .06)], [x0 + sx * .78, Y(hy)], [x0 + sx * .7, Y(hy - .06)], [x0, Y(hy - .1)]], '#3a4256', '#05070d', 2 * lw);
        poly(g, [[x0, Y(hy + .1)], [x0 + sx * .7, Y(hy + .06)], [x0 + sx * .7, Y(hy + .03)], [x0, Y(hy + .06)]], '#c99a2e');
        for (const k of [.2, .45]) { g.fillStyle = '#d9e2f0'; g.beginPath(); g.arc(x0 + sx * k, Y(hy), .03, 0, Math.PI * 2); g.fill(); }
      }
      // Gouden rand langs de boog
      g.strokeStyle = gold ? '#ffd76a' : '#c99a2e'; g.lineWidth = .07;
      g.beginPath(); g.arc(X(0), Y(SPRING), DHW - .05, Math.PI, 0); g.stroke();
      g.strokeStyle = '#05070d'; g.lineWidth = .02;
      g.beginPath(); g.arc(X(0), Y(SPRING), DHW - .09, Math.PI, 0); g.stroke();
      // Naad in het midden met een gouden strip
      poly(g, [[DHW - .025, 0], [DHW + .025, 0], [DHW + .025, DTOP], [DHW - .025, DTOP]], '#05070d');
      poly(g, [[DHW - .015, 0], [DHW + .005, 0], [DHW + .005, DTOP], [DHW - .015, DTOP]], gold ? '#e8b54a' : '#8a6514');
      if (gold) {
        // Een rood embleem: de kerker zelf
        glow(g, DHW, Y(1.95), .9, '#ff3a2a', .55);
        poly(g, [[DHW - .4, Y(2.4)], [DHW + .4, Y(2.4)], [DHW + .4, Y(1.85)], [DHW, Y(1.4)], [DHW - .4, Y(1.85)]], '#5a1018', '#e8b54a', .04);
        poly(g, [[DHW - .05, Y(2.3)], [DHW + .05, Y(2.3)], [DHW + .05, Y(1.6)], [DHW - .05, Y(1.6)]], '#ffd76a');
        poly(g, [[DHW - .25, Y(2.08)], [DHW + .25, Y(2.08)], [DHW + .25, Y(1.98)], [DHW - .25, Y(1.98)]], '#ffd76a');
      }
      g.restore();
      // Donkere rand zodat de deur in de boog zit
      g.strokeStyle = '#05070d'; g.lineWidth = .05;
      g.beginPath(); g.moveTo(X(-DHW), Y(0)); g.lineTo(X(-DHW), Y(SPRING)); g.arc(X(0), Y(SPRING), DHW, Math.PI, 0); g.lineTo(X(DHW), Y(0)); g.stroke();
      this.doorCache.set(key, c);
      return c;
    }

    // ---------- Elke frame ----------
    // v: { door, prev, now, known, roster, me, open: 0..1 (nieuwe deur die binnenkomt) }
    draw(ctx, now, v) {
      const { w, h } = this;
      const t = now / 1000;
      const door = v.door;
      // Hoe ver zijn we met het openen van de vorige deur? (tO in ms; daarna komt de nieuwe binnen)
      const tO = door && v.prev && door.startsAt > v.serverNow ? v.serverNow - (door.startsAt - W.OPEN_MS) : Infinity;
      const opening = tO < W.OPEN_MS && tO >= 0;
      const show = opening && tO < 2500 ? v.prev : door;
      let zoom = 1, white = 0;
      if (opening) {
        if (tO > 1300 && tO < 2500) { const k = easeIn((tO - 1300) / 1200); zoom = 1 + k * 2.4; white = k; }
        else if (tO >= 2500) { const k = ease((tO - 2500) / 1100); zoom = 1.3 - .3 * k; white = 1 - k; }
      }
      // shift: op het leerlingscherm schuift de gang opzij als de vraag openstaat, zodat de deur zichtbaar blijft.
      ctx.save();
      ctx.fillStyle = FOG;
      if (v.shift) { ctx.fillRect(0, 0, w, h); ctx.translate(v.shift[0], v.shift[1]); }
      ctx.save();
      if (now < this.shakeUntil) ctx.translate((Math.random() - .5) * w * .01, (Math.random() - .5) * h * .01);
      if (zoom !== 1) {
        const [lx, ly] = this.lock;
        ctx.translate(lx, ly);
        ctx.scale(zoom, zoom);
        ctx.translate(-lx, -ly);
      }
      ctx.drawImage(this.bg, 0, 0);
      // Vlammen en lichtflakkering
      for (const fl of this.flames) this.flame(ctx, fl, t);
      if (this.paint) for (const tg of this.torchGlow) {
        const fk = .8 + Math.sin(t * 9 + tg.ph) * .12 + Math.sin(t * 21 + tg.ph * 2) * .08;
        glow(ctx, tg.x, tg.y, tg.r * 2.2 * fk, '#3d8bff', .28 * fk);
        glow(ctx, tg.x, tg.y, tg.r * fk, '#9ff6ff', .3 * fk);
      }
      for (const e of this.eyes) {
        const blink = Math.sin(t * .9 + e.phase) > .96 ? .1 : 1;
        glow(ctx, e.x, e.y, e.r * 6, e.color, .55 * blink);
        ctx.fillStyle = e.color;
        for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(e.x + dx * e.r * 1.6, e.y, e.r, e.r * .55 * blink, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      if (show) this.drawDoor(ctx, show, t, opening && tO < 2500 ? ease(tO / 1300) : 0, v, opening && tO < 2500);
      ctx.restore();
      // Stofjes in het licht
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of this.dust) {
        d.y -= d.v * .0006;
        d.x += Math.sin(t * .5 + d.p) * .0003;
        if (d.y < -.02) { d.y = 1.02; d.x = Math.random(); }
        ctx.fillStyle = `rgba(150,215,255,${.18 + .22 * Math.sin(t * 2 + d.p) ** 2})`;
        const sz = d.s * Math.max(1.2, h * .0025);
        ctx.fillRect(d.x * w, d.y * h, sz, sz);
      }
      ctx.restore();
      this.drawAnims(ctx, now, v);
      this.drawKnights(ctx, t, v);
      this.fx.draw(ctx);
      ctx.restore();
      if (white > 0) {
        ctx.fillStyle = `rgba(225,250,255,${white})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (now - this.badAt < 400) {
        ctx.fillStyle = `rgba(255,40,70,${.18 * (1 - (now - this.badAt) / 400)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    flame(ctx, fl, t) {
      const { x, y, s, ph } = fl;
      const fk = .85 + Math.sin(t * 11 + ph) * .08 + Math.sin(t * 23 + ph * 2) * .06;
      glow(ctx, x, y - .1 * s, .9 * s * fk, '#3d8bff', .35);
      glow(ctx, x, y - .1 * s, .35 * s * fk, '#9ff6ff', .55);
      const hgt = .42 * s * fk;
      for (const [k, col] of [[1, '#2f7bff'], [.72, '#5ee7ff'], [.42, '#e9fdff']]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - .1 * s * k, y);
        ctx.quadraticCurveTo(x - .12 * s * k, y - hgt * k * .55, x + Math.sin(t * 7 + ph) * .04 * s, y - hgt * k);
        ctx.quadraticCurveTo(x + .12 * s * k, y - hgt * k * .55, x + .1 * s * k, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // De deur en het slot dat erbij hoort. open: 0..1 hoe ver de deur al openschuift.
    drawDoor(ctx, door, t, open, v, leaving) {
      const { s } = this;
      const d = this.door;
      const [lx, ly] = this.lock;
      const type = door.type;
      // Licht achter de deur
      ctx.save();
      this.archPath(ctx);
      ctx.clip();
      if (open > 0 || type === 'lier') {
        const k = type === 'lier' ? Math.max(.25, open) : open;
        const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, d.h * .9);
        gr.addColorStop(0, rgba('#ffffff', k));
        gr.addColorStop(.35, rgba('#9ff6ff', k * .9));
        gr.addColorStop(1, rgba('#1a6fd6', k * .5));
        ctx.fillStyle = gr;
        ctx.fillRect(d.x, d.y, d.w, d.h);
      }
      if (type === 'lier') this.portcullis(ctx, door, t, open, v);
      else {
        const sp = this.doorSprite(type);
        const half = sp.width / 2, slide = open * half * 1.05;
        ctx.drawImage(sp, 0, 0, half, sp.height, d.x - slide, d.y, half, d.h);
        ctx.drawImage(sp, half, 0, sp.width - half, sp.height, d.x + half + slide, d.y, sp.width - half, d.h);
        // Licht door de kieren
        if (open === 0) {
          const p = .55 + .25 * Math.sin(t * 2.2);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = rgba('#5ee7ff', .5 * p);
          ctx.fillRect(lx - Math.max(1, s * .012), d.y, Math.max(2, s * .024), d.h);
          ctx.fillRect(d.x, d.y + d.h - Math.max(2, s * .03), d.w, Math.max(2, s * .03));
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      ctx.restore();
      if (type === 'lier') this.winches(ctx, door, t);
      if (open > 0) glow(ctx, lx, ly, d.h * (.6 + open), '#bff3ff', open * .7);
      // Het nummer van de deur op het plaatje boven de boog
      if (this.plaque) {
        const [px, py] = this.plaque;
        ctx.font = `900 ${Math.max(10, s * .26)}px Cinzel, Orbitron, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffe08a';
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.lineWidth = Math.max(2, s * .04);
        ctx.strokeText(ROMAN[door.i] || String(door.i + 1), px, py);
        ctx.fillText(ROMAN[door.i] || String(door.i + 1), px, py);
      }
      const fade = 1 - Math.min(1, open * 3);
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      if (type === 'sleutel') this.keyLock(ctx, door, t);
      else if (type === 'runen') this.runeLock(ctx, door, t, v);
      else if (type === 'laser') this.lasers(ctx, door, t, v);
      else if (type === 'bewaker') this.guardian(ctx, door, t, v, leaving);
      ctx.restore();
    }

    // Het grote ronde slot: een ring die vol goud loopt, met een sleutelgat dat oplicht.
    plate(ctx, R, rim = '#c99a2e') {
      const [lx, ly] = this.lock;
      const gr = ctx.createRadialGradient(lx - R * .3, ly - R * .3, R * .1, lx, ly, R);
      gr.addColorStop(0, '#465068'); gr.addColorStop(1, '#151a24');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = R * .12; ctx.strokeStyle = '#05070d'; ctx.stroke();
      ctx.lineWidth = R * .08; ctx.strokeStyle = rim; ctx.stroke();
      ctx.lineWidth = R * .025; ctx.strokeStyle = '#ffe8a3';
      ctx.beginPath(); ctx.arc(lx, ly, R * .98, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(lx + Math.cos(a) * R * .88, ly + Math.sin(a) * R * .88, R * .035, 0, Math.PI * 2); ctx.fill();
      }
    }

    keyLock(ctx, door, t) {
      const [lx, ly] = this.lock, s = this.s, R = s * .68;
      this.plate(ctx, R);
      const k = Math.min(1, door.have / Math.max(1, door.need));
      const N = 24;
      for (let i = 0; i < N; i++) {
        const a0 = -Math.PI / 2 + i * Math.PI * 2 / N + .03, a1 = a0 + Math.PI * 2 / N - .06;
        const on = (i + 1) / N <= k + 1e-6;
        ctx.strokeStyle = on ? '#ffc94a' : 'rgba(255,255,255,.08)';
        ctx.lineWidth = R * .14;
        ctx.beginPath(); ctx.arc(lx, ly, R * .68, a0, a1); ctx.stroke();
        if (on) { ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = R * .04; ctx.stroke(); }
      }
      if (k > 0) glow(ctx, lx, ly, R * 1.6, '#ffc94a', .25 + k * .35);
      // Sleutelgat
      const p = .7 + .3 * Math.sin(t * 3);
      glow(ctx, lx, ly, R * .55, '#5ee7ff', .8 * p);
      ctx.fillStyle = '#04060c';
      ctx.beginPath(); ctx.arc(lx, ly - R * .1, R * .14, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[lx - R * .08, ly - R * .05], [lx + R * .08, ly - R * .05], [lx + R * .13, ly + R * .28], [lx - R * .13, ly + R * .28]], '#04060c');
      ctx.fillStyle = rgba('#5ee7ff', .6 * p);
      ctx.beginPath(); ctx.arc(lx, ly - R * .1, R * .07, 0, Math.PI * 2); ctx.fill();
      this.counter(ctx, `${door.have} / ${door.need}`, lx, ly + R * 1.28, R * .36, '#ffc94a');
    }

    counter(ctx, text, x, y, size, color) {
      ctx.font = `900 ${Math.max(11, size)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(4,6,12,.78)';
      AK.roundRect(ctx, x - tw / 2 - size * .5, y - size * .75, tw + size, size * 1.5, size * .4);
      ctx.fill();
      ctx.strokeStyle = rgba(color, .6); ctx.lineWidth = Math.max(1, size * .08); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(text, x, y + size * .04);
    }

    // De vier runeschijven in een kruis, zoals op het icoon. Wie een rune kent, ziet ze op zijn eigen scherm.
    runeSpots() {
      const [lx, ly] = this.lock, r = this.s * .42;
      return [[lx, ly - r], [lx + r, ly], [lx, ly + r], [lx - r, ly]];
    }

    runeLock(ctx, door, t, v) {
      const [lx, ly] = this.lock, s = this.s, R = s * .84;
      this.plate(ctx, R, '#b98cff');
      glow(ctx, lx, ly, R * 1.3, '#9b6bff', .25);
      const spots = this.runeSpots();
      const known = v.known || {};
      const hints = new Map(door.hints || []);
      const r = s * .27;
      ctx.fillStyle = '#c99a2e';
      ctx.beginPath(); ctx.arc(lx, ly, s * .09, 0, Math.PI * 2); ctx.fill();
      spots.forEach(([x, y], pos) => {
        const found = door.found[pos] > 0;
        const rune = known[pos] !== undefined ? known[pos] : hints.get(pos);
        if (found || rune !== undefined) glow(ctx, x, y, r * 2.2, '#ffc94a', .55 + .15 * Math.sin(t * 3 + pos));
        const gr = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
        if (rune !== undefined || found) { gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(.6, '#e09a1c'); gr.addColorStop(1, '#8a5a0a'); }
        else { gr.addColorStop(0, '#3c4456'); gr.addColorStop(1, '#141922'); }
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = r * .16; ctx.strokeStyle = '#05070d'; ctx.stroke();
        ctx.lineWidth = r * .1; ctx.strokeStyle = '#e8b54a'; ctx.stroke();
        if (rune !== undefined) this.runeGlyph(ctx, rune, x, y, r * 1.25, '#fffbe8', '#7a3d00');
        else {
          ctx.font = `900 ${r * .95}px Cinzel, Orbitron, serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = found ? 'rgba(90,40,0,.75)' : 'rgba(150,170,200,.35)';
          ctx.fillText('?', x, y + r * .06);
        }
        // Hoeveel ridders deze rune kennen
        if (door.found[pos] > 0) {
          ctx.font = `900 ${Math.max(9, r * .42)}px Orbitron, sans-serif`;
          const bx = x + r * .78, by = y - r * .78;
          ctx.fillStyle = '#9b6bff';
          ctx.beginPath(); ctx.arc(bx, by, r * .36, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(String(door.found[pos]), bx, by + 1);
        }
        // Het nummer van de plaats in de code
        ctx.font = `800 ${Math.max(9, r * .4)}px Orbitron, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        const nx = x + (x - lx) * .0 - (pos === 1 ? -r * 1.35 : pos === 3 ? r * 1.35 : 0), ny = y + (pos === 0 ? -r * 1.3 : pos === 2 ? r * 1.3 : 0);
        ctx.fillText(String(pos + 1), nx, ny);
      });
    }

    runeGlyph(ctx, i, x, y, size, color, shadow) {
      const rune = W.RUNES[i];
      if (!rune) return;
      ctx.save();
      ctx.translate(x - size / 2, y - size / 2);
      ctx.lineCap = ctx.lineJoin = 'round';
      for (const [col, lw] of [[shadow, .16], [color, .085]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = size * lw;
        ctx.beginPath();
        for (const l of rune.lines) l.forEach((p, j) => ctx[j ? 'lineTo' : 'moveTo'](p[0] * size, p[1] * size));
        ctx.stroke();
      }
      ctx.restore();
    }

    // Laserhek: rode stralen voor de deur, en een rij kristallen boven de boog (één per ridder die moet helpen).
    lampSpots(n) {
      const [ax, ay] = this.project(0, SPRING, DOOR_Z), s = this.s;
      const R = (DHW + .9) * s;
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i + .5) * Math.PI / n;
        out.push([ax + Math.cos(a) * R, ay + Math.sin(a) * R]);
      }
      return out;
    }

    lasers(ctx, door, t, v) {
      const s = this.s, d = this.door;
      const need = Math.max(1, door.need), lit = door.lamps.length;
      const k = Math.min(1, lit / need);
      const BEAMS = 7;
      const on = Math.ceil(BEAMS * (1 - k));
      const roster = v.roster || new Map();
      // Kristallen boven de boog
      const spots = this.lampSpots(Math.min(40, need));
      const colors = door.lamps.map(n => (roster.get(n) || {}).color || '#ffc94a');
      spots.forEach(([x, y], i) => {
        const col = colors[i];
        const r = Math.max(3, s * Math.min(.13, 1.6 / spots.length));
        if (col) glow(ctx, x, y, r * 4, col, .8);
        poly(ctx, [[x, y - r * 1.4], [x + r, y], [x, y + r * 1.4], [x - r, y]], col || '#232a38', col ? '#ffffff' : '#4a5568', Math.max(1, r * .2));
      });
      // Zenders aan beide kanten en de stralen
      for (let i = 0; i < BEAMS; i++) {
        const y = 0.35 + i * (SPRING - .1) / BEAMS;
        const [x0, py] = this.project(-DHW - .2, y, DOOR_Z - .1), [x1] = this.project(DHW + .2, y, DOOR_Z - .1);
        for (const x of [x0, x1]) {
          poly(ctx, [[x - s * .06, py - s * .08], [x + s * .06, py - s * .08], [x + s * .06, py + s * .08], [x - s * .06, py + s * .08]], '#2a3242', '#c99a2e', Math.max(1, s * .015));
          glow(ctx, x, py, s * .15, i < on ? '#ff4d6d' : '#4ade80', .8);
        }
        if (i >= on) continue;
        const fl = .75 + .25 * Math.sin(t * 30 + i * 2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [lw, col, a] of [[s * .16, '#ff2d4d', .22], [s * .06, '#ff4d6d', .85], [s * .02, '#ffffff', 1]]) {
          ctx.strokeStyle = rgba(col, a * fl);
          ctx.lineWidth = Math.max(1, lw);
          ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
        }
        ctx.restore();
      }
      if (on > 0) glow(ctx, d.x + d.w / 2, d.y + d.h * .6, d.w * .9, '#ff2d4d', .18);
      this.counter(ctx, `${lit} / ${need} ridders`, this.lock[0], d.y + d.h + s * .32, s * .24, lit >= need ? '#4ade80' : '#ff8fa3');
    }

    // Valhek: een ijzeren rooster dat omhoog gaat met de lier. Achter het rooster licht.
    portcullis(ctx, door, t, open, v) {
      const s = this.s, d = this.door;
      const m = Math.max(open, Math.min(1, door.meter || 0));
      const lift = ease(m) * d.h * .92;
      const y0 = d.y - lift;
      ctx.save();
      ctx.translate(0, 0);
      const cols = 9, rows = 11;
      for (let i = 0; i <= cols; i++) {
        const x = d.x + i * d.w / cols;
        ctx.fillStyle = '#05070d';
        ctx.fillRect(x - s * .055, y0, s * .11, d.h);
        const gr = ctx.createLinearGradient(x - s * .04, 0, x + s * .04, 0);
        gr.addColorStop(0, '#8a96ac'); gr.addColorStop(1, '#2a3242');
        ctx.fillStyle = gr;
        ctx.fillRect(x - s * .035, y0, s * .07, d.h);
        // Gouden punten onderaan
        poly(ctx, [[x - s * .06, y0 + d.h], [x + s * .06, y0 + d.h], [x, y0 + d.h + s * .2]], '#e8b54a', '#6a4a0c', Math.max(1, s * .01));
      }
      for (let j = 0; j < rows; j++) {
        const y = y0 + (j + .5) * d.h / rows;
        ctx.fillStyle = '#05070d';
        ctx.fillRect(d.x, y - s * .045, d.w, s * .09);
        ctx.fillStyle = j % 3 === 1 ? '#c99a2e' : '#4a5568';
        ctx.fillRect(d.x, y - s * .028, d.w, s * .056);
      }
      ctx.restore();
      this.liftMeter = m;
    }

    // Lieren en meter van het valhek, buiten de boog.
    winches(ctx, door, t) {
      const s = this.s, d = this.door;
      const m = this.liftMeter || 0;
      for (const side of [-1, 1]) {
        const [x, y] = this.project(side * (DHW + 1.05), 1.4, DOOR_Z - .2);
        const R = s * .38;
        ctx.fillStyle = '#151a24';
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = R * .16; ctx.strokeStyle = '#c99a2e'; ctx.stroke();
        const a0 = m * 14 * side;
        for (let i = 0; i < 6; i++) {
          const a = a0 + i * Math.PI / 3;
          ctx.strokeStyle = '#8a96ac'; ctx.lineWidth = R * .14;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * R * .92, y + Math.sin(a) * R * .92); ctx.stroke();
        }
        ctx.fillStyle = '#e8b54a';
        ctx.beginPath(); ctx.arc(x, y, R * .22, 0, Math.PI * 2); ctx.fill();
        // Ketting naar boven
        const [, top] = this.project(0, DTOP + .5, DOOR_Z);
        ctx.strokeStyle = '#6b7890'; ctx.lineWidth = Math.max(2, s * .05);
        ctx.setLineDash([s * .1, s * .06]);
        ctx.lineDashOffset = -m * s * 6 * side;
        ctx.beginPath(); ctx.moveTo(x, y - R); ctx.lineTo(d.x + d.w / 2 + side * d.w * .42, top); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Meter
      const [mx] = this.project(-DHW - .6, 0, DOOR_Z);
      const mh = d.h * .8, my = d.y + d.h * .15, mw = Math.max(8, s * .16);
      ctx.fillStyle = 'rgba(4,6,12,.8)';
      AK.roundRect(ctx, mx - mw, my, mw, mh, mw / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(94,231,255,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      const gr = ctx.createLinearGradient(0, my + mh, 0, my);
      gr.addColorStop(0, '#1a8fd6'); gr.addColorStop(1, '#bff3ff');
      ctx.fillStyle = gr;
      AK.roundRect(ctx, mx - mw + 2, my + mh - (mh - 4) * m - 2, mw - 4, Math.max(mw - 4, (mh - 4) * m), (mw - 4) / 2); ctx.fill();
      glow(ctx, mx - mw / 2, my + mh - mh * m, mw * 2, '#5ee7ff', .6);
      this.counter(ctx, `${Math.round(m * 100)}%`, this.lock[0], d.y + d.h + s * .32, s * .24, '#5ee7ff');
    }

    // De Kerkermeester staat voor de poort, met een levensbalk boven zijn hoofd.
    guardian(ctx, door, t, v, leaving) {
      if (!this.guard || this.guard.art !== artVer) this.guard = ART.meester ? paintedGuard() : { n: guardSprite(false), f: guardSprite(true) };
      const s = this.s, d = this.door;
      const k = door.hp / Math.max(1, door.maxHp);
      const gz = 9.4;
      const gh = 3.9 * this.f / gz, gw = gh * this.guard.n.width / this.guard.n.height;
      const [gx, gy] = this.project(0, 0, gz);
      const bob = Math.sin(t * 2) * gh * .008;
      const since = performance.now() - this.hitAt;
      const fall = leaving ? 1 : 0;
      ctx.save();
      glow(ctx, gx, gy, gw * .8, '#ff3a2a', .3, .25);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(gx, gy, gw * .42, gh * .04, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(gx, gy);
      if (fall) ctx.rotate(-.04);
      if (since < 160) ctx.translate((Math.random() - .5) * gw * .05, 0);
      const sq = since < 200 ? 1 - .04 * (1 - since / 200) : 1;
      ctx.scale(1 / sq * (since < 200 ? 1 : 1), sq);
      ctx.drawImage(since < 120 ? this.guard.f : this.guard.n, -gw / 2, -gh + bob, gw, gh);
      // Het vizier en de kern gloeien op en neer
      const pulse = .55 + .45 * Math.sin(t * 3.2);
      const [vy, cy] = this.guard.glow || [100 / 520, 226 / 520];
      glow(ctx, 0, -gh + bob + gh * vy, gw * .32, '#ff3a2a', .5 + pulse * .4, .45);
      glow(ctx, 0, -gh + bob + gh * cy, gw * .2, '#ff8c42', .3 + pulse * .4);
      // Barsten en vonken als hij zwak wordt
      if (k < .5) {
        ctx.strokeStyle = 'rgba(255,120,60,.85)'; ctx.lineWidth = Math.max(1.5, gw * .008);
        ctx.beginPath();
        ctx.moveTo(-gw * .12, -gh * .62 + bob); ctx.lineTo(-gw * .04, -gh * .55 + bob); ctx.lineTo(-gw * .1, -gh * .47 + bob); ctx.lineTo(0, -gh * .4 + bob);
        if (k < .25) { ctx.moveTo(gw * .15, -gh * .78 + bob); ctx.lineTo(gw * .08, -gh * .7 + bob); ctx.lineTo(gw * .14, -gh * .64 + bob); }
        ctx.stroke();
        if (Math.random() < .08) this.fx.sparks(gx + (Math.random() - .5) * gw * .4, gy - gh * (.4 + Math.random() * .3), { n: 4, color: '#ffb38a', speed: gw * .6 });
      }
      ctx.restore();
      // Levensbalk
      const bw = Math.min(this.w * .5, gw * 1.3), bh = Math.max(10, s * .16);
      const bx = gx - bw / 2, by = gy - gh - bh * 2.6;
      ctx.fillStyle = 'rgba(4,6,12,.85)';
      AK.roundRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, bh / 2 + 3); ctx.fill();
      ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 2; ctx.stroke();
      const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      gr.addColorStop(0, '#ff2d4d'); gr.addColorStop(1, '#ff8c42');
      ctx.fillStyle = gr;
      AK.roundRect(ctx, bx, by, Math.max(bh, bw * k), bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(bx + bh / 2, by + bh * .15, Math.max(0, bw * k - bh), bh * .22);
      ctx.font = `900 ${Math.max(10, bh * .9)}px Cinzel, Orbitron, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.strokeText(`KERKERMEESTER · ${door.hp}`, gx, by - 4);
      ctx.fillStyle = '#ffd2c4';
      ctx.fillText(`KERKERMEESTER · ${door.hp}`, gx, by - 4);
      this.guardPos = [gx, gy - gh * .55];
    }

    // ---------- De klas vooraan ----------
    // Iedereen van achteren, in rijen. Op het leerlingscherm sta jij vooraan in het midden.
    drawKnights(ctx, t, v) {
      const list = v.knights || [];
      this.knightPos.clear();
      if (!list.length) return;
      const { w, h } = this;
      const perRow = this.board ? Math.min(14, Math.max(6, Math.ceil(list.length / 2))) : 7;
      const rows = Math.min(this.board ? 3 : 1, Math.ceil(list.length / perRow));
      const base = Math.min(h * (this.board ? .2 : .2), (w * .9) / perRow * 1.25);
      let idx = 0;
      for (let row = rows - 1; row >= 0; row--) {
        const k = 1 - row * .18;
        const kh = base * k * (ART.ridder ? 1.2 : 1), kw = kh * (ART.ridder ? ART.ridder.width / ART.ridder.height : 120 / 150);
        const count = Math.min(perRow, list.length - row * perRow);
        if (count <= 0) continue;
        const items = list.slice(row * perRow, row * perRow + count);
        const y = h - kh * .62 - row * kh * .38;
        const gap = Math.min(kw * 1.05, (w * .92) / count);
        items.forEach((p, i) => {
          const x = w / 2 + (i - (count - 1) / 2) * gap + (row % 2 ? gap * .5 : 0);
          const jump = p.jumpAt ? Math.max(0, 1 - (performance.now() - p.jumpAt) / 450) : 0;
          const bob = Math.sin(t * 2 + idx) * kh * .01 - Math.sin(jump * Math.PI) * kh * .14;
          ctx.drawImage(knightSprite(p.color), x - kw / 2, y + bob, kw, kh);
          if (jump > 0) glow(ctx, x, y + kh * .4, kw, p.color, jump * .7);
          this.knightPos.set(p.n, [x, y + kh * .2]);
          // Namen: vooraan op de cape, de rijen erachter boven het hoofd. Zo lopen ze niet door elkaar.
          if (this.board || p.me) AK.label(ctx, p.name, x, (row === 0 && rows > 1 ? y + kh * .44 : y - kh * .02) + bob, p.me ? '#ffc94a' : '#e8f1ff', Math.max(11, Math.round(kh * (row ? .11 : .13))));
          idx++;
        });
      }
    }

    // ---------- Wat er gebeurt ----------
    // Sleutels vliegen naar het slot, runen naar hun schijf, een laserstraal naar een kristal, een treffer op de bewaker.
    event(e, v, now) {
      const [kind, n] = e;
      const door = v.door;
      const from = this.knightPos.get(n) || [this.w / 2 + (Math.random() - .5) * this.w * .3, this.h * 1.02];
      const color = (v.roster && v.roster.get(n) || {}).color || '#ffc94a';
      if (kind === 'key') this.anims.push({ kind, from, to: this.lock, t0: now, dur: 650, color, n: e[2] || 1 });
      else if (kind === 'rune') this.anims.push({ kind, from, to: this.runeSpots()[e[2]], t0: now, dur: 600, color: '#b98cff' });
      else if (kind === 'lamp' && door) {
        const i = door.lamps.indexOf(n);
        const spot = this.lampSpots(Math.min(40, Math.max(1, door.need)))[Math.max(0, Math.min(39, i))];
        if (spot) this.anims.push({ kind, from, to: spot, t0: now, dur: 450, color });
      } else if (kind === 'spark') this.fx.sparks(from[0], from[1] - this.h * .05, { n: 6, color, speed: this.h * .3 });
      else if (kind === 'lier') {
        const [x, y] = this.project(-DHW - 1.05, 1.4, DOOR_Z - .2);
        this.anims.push({ kind, from, to: [x, y], t0: now, dur: 450, color: '#5ee7ff' });
      } else if (kind === 'hit' && this.guardPos) this.anims.push({ kind, from, to: this.guardPos, t0: now, dur: 260, color, dmg: e[2] || 1 });
      else if (kind === 'code') {
        const [lx, ly] = this.lock;
        this.fx.shock(lx, ly, this.s * 1.4, '#ffc94a', .7);
        this.fx.burst(lx, ly, { n: 40, color: '#ffe08a', speed: this.s * 3, life: .9, size: 4 });
      } else if (kind === 'codefout') {
        const [lx, ly] = this.lock;
        this.fx.ring(lx, ly, this.s * .9, '#ff4d6d', .4);
      } else if (kind === 'open') {
        this.shakeUntil = now + 500;
        const [lx, ly] = this.lock;
        this.fx.shock(lx, ly, this.s * 2.2, '#bff3ff', .8);
        this.fx.burst(lx, ly, { n: 60, color: '#9ff6ff', speed: this.s * 4, life: 1.1, size: 4 });
      }
    }

    drawAnims(ctx, now, v) {
      const keep = [];
      for (const a of this.anims) {
        const k = (now - a.t0) / a.dur;
        if (k >= 1) { this.land(a, v); continue; }
        keep.push(a);
        const e = ease(k);
        const x = a.from[0] + (a.to[0] - a.from[0]) * e;
        const arc = Math.sin(k * Math.PI) * this.h * (a.kind === 'hit' ? .02 : .12);
        const y = a.from[1] + (a.to[1] - a.from[1]) * e - arc;
        if (a.kind === 'key') {
          const sz = this.s * (.5 - .2 * k) * (a.n > 1 ? 1.3 : 1);
          glow(ctx, x, y, sz * 1.4, a.n > 1 ? '#ffc94a' : '#5ee7ff', .8);
          ctx.save(); ctx.translate(x, y); ctx.rotate(k * Math.PI * 3);
          ctx.drawImage(keyImage(this.key), -sz, -sz / 2, sz * 2, sz);
          ctx.restore();
          if (Math.random() < .6) this.fx.burst(x, y, { n: 1, color: '#ffe08a', speed: 30, life: .4, size: 2 });
        } else if (a.kind === 'hit') {
          Glow.lightning(ctx, a.from[0], a.from[1], x, y, a.color, Math.max(2, this.s * .04), .12);
        } else {
          glow(ctx, x, y, this.s * .3, a.color, .9);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x, y, Math.max(2, this.s * .05), 0, Math.PI * 2); ctx.fill();
          if (Math.random() < .7) this.fx.burst(x, y, { n: 1, color: a.color, speed: 20, life: .35, size: 2 });
        }
      }
      this.anims = keep;
    }

    // Aangekomen: een flits op de plek.
    land(a, v) {
      const [x, y] = a.to;
      if (a.kind === 'key') {
        this.fx.shock(x, y, this.s * .5, '#ffc94a', .4);
        this.fx.sparks(x, y, { n: 10, color: '#ffe08a', speed: this.s * 3 });
      } else if (a.kind === 'rune') {
        this.fx.shock(x, y, this.s * .4, '#b98cff', .45);
      } else if (a.kind === 'lamp') {
        this.fx.shock(x, y, this.s * .3, a.color, .4);
      } else if (a.kind === 'lier') {
        this.fx.sparks(x, y, { n: 8, color: '#bff3ff', speed: this.s * 2.5 });
      } else if (a.kind === 'hit') {
        this.hitAt = performance.now();
        this.fx.shock(x, y, this.s * .5, a.color, .35);
        this.fx.sparks(x, y, { n: 12, color: '#ffb38a', speed: this.s * 4 });
        this.fx.pop(x + (Math.random() - .5) * this.s, y - this.s * .4, `-${a.dmg}`, a.dmg > 1 ? '#ffc94a' : '#ffffff', Math.max(16, this.s * .32), .8);
      }
    }
  }

  return { Scene, keySprite, ART, artVer: () => artVer };
})();
