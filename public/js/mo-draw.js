// Robomol tekenen: een burchtplein in nep-3D (perspectief), één keer vooraf getekend per schermgrootte.
// Kasseien, burchtmuren met banieren en fakkels, negen achthoekige stenen putten. De robotmollen, bomdrones en het zwaard
// zijn ook vooraf getekende plaatjes; elke frame zetten we ze alleen nog op hun plek. Zo blijft het vlot op een Chromebook.
// Gebruikt Glow uit fx.js en MoWorld.
const MoDraw = (() => {
  const { glow, rgba } = Glow;
  const W = MoWorld;
  const CAM_H = 4; // ooghoogte
  const HX = [-2.75, 0, 2.75];
  const HZ = [10.6, 7.8, 5.2]; // achteraan, midden, vooraan
  const R_IN = .72, R_OUT = 1.1, RIM_H = .26;
  const MOLE_W = 1.85; // breedte van het molplaatje in de wereld
  const SP_W = 260, SP_H = 300, SP_BASE = 232, SP_K = 1.4; // molplaatje en waar de put zit

  // Geschilderde mollen, bom en zwaard (public/img/robomol/). Is een beeld er (nog) niet, dan tekenen we zoals vroeger.
  const ART = {};
  let artVer = 0;
  if (typeof Image !== 'undefined') {
    for (const n of ['mol', 'goud', 'bom', 'zwaard']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artVer++; };
      img.src = `/img/robomol/${n}.webp`;
    }
  }
  function paintedMole(type, state) {
    const img = ART[type === 'bom' ? 'bom' : type === 'goud' ? 'goud' : 'mol'];
    const c = document.createElement('canvas');
    c.width = Math.round(SP_W * SP_K); c.height = Math.round(SP_H * SP_K);
    const g = c.getContext('2d');
    g.scale(SP_K, SP_K);
    const mw = type === 'bom' ? 190 : 225, mh = mw * img.height / img.width, bottom = type === 'bom' ? 262 : 280;
    if (type === 'bom') glow(g, SP_W / 2, bottom - mh * .45, 120, '#ff3355', state === 'hit' ? .25 : .6);
    if (state === 'hit') g.filter = 'brightness(.7) sepia(.6) hue-rotate(-30deg) saturate(2.5)';
    if (state === 'dent') g.filter = 'brightness(.85)';
    g.drawImage(img, SP_W / 2 - mw / 2, bottom - mh, mw, mh);
    g.filter = 'none';
    return c;
  }
  function paintedSword(fire) {
    const img = ART.zwaard, sh = 530, sw = sh * img.width / img.height;
    const c = document.createElement('canvas');
    c.width = Math.ceil(sw + 20); c.height = SW_H;
    const g = c.getContext('2d');
    // Het schilderij wijst naar beneden: omdraaien, punt bovenaan.
    g.translate(c.width / 2, 4 + sh / 2);
    g.rotate(Math.PI);
    if (fire) g.filter = 'hue-rotate(170deg) saturate(1.6)';
    g.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    return c;
  }

  function rand(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const mix = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = i => Math.round(((pa >> i) & 255) * (1 - k) + ((pb >> i) & 255) * k);
    return '#' + [c(16), c(8), c(0)].map(n => n.toString(16).padStart(2, '0')).join('');
  };
  const shadeHex = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };
  function poly(g, pts, fill, stroke, lw = 1) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  // Licht van linksboven-voor, zoals op het icoon.
  const LIGHT = (() => { const v = [-.45, .7, .55]; const l = Math.hypot(...v); return v.map(x => x / l); })();
  const lit = n => Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);

  // ---------- De robotmol (en de bomdrone) als plaatje ----------
  // Een koepel van platte vlakjes (low-poly): elk vlakje krijgt zijn eigen tint volgens het licht.
  function lathe(g, cx, profile, base, cols = 9, from = -90, to = 90, edge = null) {
    for (let k = 0; k < profile.length - 1; k++) {
      const [y0, r0] = profile[k], [y1, r1] = profile[k + 1];
      const slope = Math.atan2(r1 - r0, y1 - y0); // hoe schuin het vlak naar boven kijkt
      for (let j = 0; j < cols; j++) {
        const a0 = (from + (to - from) * j / cols) * Math.PI / 180, a1 = (from + (to - from) * (j + 1) / cols) * Math.PI / 180;
        const am = (a0 + a1) / 2;
        const ny = Math.cos(slope), nh = Math.sin(slope);
        const n = [Math.sin(am) * nh, ny, Math.cos(am) * nh];
        const f = .38 + .95 * lit(n);
        const pts = [[cx + r0 * Math.sin(a0), y0], [cx + r0 * Math.sin(a1), y0], [cx + r1 * Math.sin(a1), y1], [cx + r1 * Math.sin(a0), y1]];
        const col = shadeHex(typeof base === 'function' ? base(k, j) : base, f);
        poly(g, pts, col, col, 1.2);
        if (edge && (j + k) % 2 === 0) poly(g, pts, null, edge, .8);
      }
    }
  }
  const BODY = [[38, 0], [48, 44], [66, 74], [92, 92], [126, 101], [170, 104], [230, 102], [300, 102]];

  function eye(g, x, y, r, state) {
    poly(g, [...Array(8)].map((_, i) => [x + Math.cos(i * Math.PI / 4 + .39) * r * 1.32, y + Math.sin(i * Math.PI / 4 + .39) * r * 1.32]), '#1b1f2a', '#0b0d13', 2);
    poly(g, [...Array(8)].map((_, i) => [x + Math.cos(i * Math.PI / 4 + .39) * r * 1.12, y + Math.sin(i * Math.PI / 4 + .39) * r * 1.12]), '#2c3242');
    if (state === 'hit') {
      g.strokeStyle = '#7ff0ff';
      g.lineWidth = r * .32;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * .55, y - r * .55); g.lineTo(x + r * .55, y + r * .55);
      g.moveTo(x + r * .55, y - r * .55); g.lineTo(x - r * .55, y + r * .55);
      g.stroke();
      return;
    }
    glow(g, x, y, r * 2.6, '#38e1ff', .9);
    const grad = g.createRadialGradient(x - r * .2, y - r * .2, r * .1, x, y, r);
    grad.addColorStop(0, '#eaffff');
    grad.addColorStop(.35, '#6ff3ff');
    grad.addColorStop(1, '#0a9fd6');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.arc(x - r * .35, y - r * .38, r * .22, 0, Math.PI * 2); g.fill();
  }

  function face(g, cx, state) {
    // Snuit: een lichter vlakje met een bruine neus en gouden snorharen.
    poly(g, [[cx - 40, 140], [cx - 22, 124], [cx + 22, 124], [cx + 40, 140], [cx + 30, 166], [cx - 30, 166]], '#8d909a', '#6c6f79', 1.5);
    poly(g, [[cx - 22, 124], [cx + 22, 124], [cx + 14, 140], [cx - 14, 140]], '#a7aab3');
    poly(g, [[cx - 15, 128], [cx + 15, 128], [cx + 11, 142], [cx, 146], [cx - 11, 142]], '#3b241a', '#24150f', 1.5);
    poly(g, [[cx - 8, 130], [cx + 2, 130], [cx - 2, 134], [cx - 9, 134]], 'rgba(255,255,255,.45)');
    if (state === 'hit') {
      g.fillStyle = '#1a0e0a';
      g.beginPath(); g.ellipse(cx, 156, 8, 7, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.strokeStyle = '#2a1a14'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 9, 152); g.quadraticCurveTo(cx, 158, cx + 9, 152); g.stroke();
      poly(g, [[cx - 7, 154], [cx - 1, 155], [cx - 1, 163], [cx - 6, 162]], '#f4f1e6');
      poly(g, [[cx + 1, 155], [cx + 7, 154], [cx + 6, 162], [cx + 1, 163]], '#f4f1e6');
    }
    g.strokeStyle = '#f2c14e'; g.lineWidth = 2.6; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (const [dy, len, tilt] of [[-4, 46, -.18], [3, 50, .02], [10, 42, .22]]) {
        g.beginPath();
        g.moveTo(cx + s * 26, 144 + dy);
        g.lineTo(cx + s * (26 + len), 144 + dy + len * tilt);
        g.stroke();
      }
    }
    eye(g, cx - 36, 104, 17, state);
    eye(g, cx + 36, 104, 17, state);
  }

  // De helm: staal met gouden rand (gewone mol) of helemaal goud met pluim (goudhelm). dent: de goudhelm is al één keer geraakt.
  function helmet(g, cx, gold, dent) {
    const prof = [[30, 0], [40, 48], [56, 78], [78, 96], [90, 100]];
    const base = gold ? '#e2a72e' : '#5d6b85';
    lathe(g, cx, prof, (k, j) => (gold ? (j === 4 ? '#ffd76a' : base) : (j === 4 ? '#c99a2e' : base)), 9, -90, 90, gold ? '#9c6a12' : '#3a4458');
    // Rand
    poly(g, [[cx - 104, 84], [cx + 104, 84], [cx + 100, 98], [cx - 100, 98]], gold ? '#b47b15' : '#c99a2e', gold ? '#7a520c' : '#8a6514', 1.5);
    poly(g, [[cx - 104, 84], [cx + 104, 84], [cx + 102, 88], [cx - 102, 88]], gold ? '#ffe08a' : '#f2c14e');
    // Vizierroosters zoals op het icoon
    for (const dx of [-26, 0, 26]) {
      poly(g, [[cx + dx - 8, 50 + Math.abs(dx) * .25], [cx + dx + 8, 50 + Math.abs(dx) * .25], [cx + dx + 9, 76], [cx + dx - 9, 76]], '#141820', gold ? '#7a520c' : '#c99a2e', 2.5);
    }
    // Klinknagels
    for (const dx of [-80, -40, 40, 80]) {
      g.fillStyle = gold ? '#fff0b8' : '#f2c14e';
      g.beginPath(); g.arc(cx + dx, 91, 3.2, 0, Math.PI * 2); g.fill();
    }
    if (gold) {
      // Kam en pluim
      poly(g, [[cx - 8, 34], [cx + 8, 34], [cx + 6, 8], [cx - 6, 8]], '#ffd76a', '#9c6a12', 1.5);
      for (let i = 0; i < 6; i++) {
        const a = -1.9 + i * .22;
        poly(g, [[cx, 14], [cx + Math.cos(a) * 46, 14 + Math.sin(a) * 46 - 4], [cx + Math.cos(a + .12) * 40, 14 + Math.sin(a + .12) * 40]], i % 2 ? '#ff4d6d' : '#ff7a8f');
      }
      glow(g, cx, 60, 120, '#ffc94a', .25);
    }
    if (dent) {
      g.strokeStyle = '#2a1a05'; g.lineWidth = 3.5; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(cx + 10, 30); g.lineTo(cx + 22, 46); g.lineTo(cx + 14, 58); g.lineTo(cx + 30, 72); g.lineTo(cx + 24, 84);
      g.stroke();
      poly(g, [[cx + 48, 40], [cx + 70, 52], [cx + 60, 64]], '#3a2a10');
    }
  }

  function moleSprite(type, state) {
    if (ART[type === 'bom' ? 'bom' : type === 'goud' ? 'goud' : 'mol']) return paintedMole(type, state);
    const c = document.createElement('canvas');
    c.width = Math.round(SP_W * SP_K); c.height = Math.round(SP_H * SP_K);
    const g = c.getContext('2d');
    g.scale(SP_K, SP_K);
    g.lineJoin = 'round';
    const cx = SP_W / 2;
    if (type === 'bom') {
      // Bomdrone: een donkere bol met rode band, stekels en één rood oog.
      const prof = [];
      for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 8; prof.push([140 + Math.sin(a) * 92, Math.cos(a) * 92]); }
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i + .5) * Math.PI / 8;
        for (const s of [-1, 1]) poly(g, [[cx + s * Math.cos(a) * 84, 140 + Math.sin(a) * 84 - 8], [cx + s * Math.cos(a) * 118, 140 + Math.sin(a) * 118], [cx + s * Math.cos(a) * 84, 140 + Math.sin(a) * 84 + 8]], '#9aa3b5', '#4a5160', 1.5);
      }
      lathe(g, cx, prof, (k, j) => (k === 4 ? '#c21f3a' : '#2b2f3c'), 10, -90, 90, '#151820');
      poly(g, [[cx - 92, 132], [cx + 92, 132], [cx + 92, 148], [cx - 92, 148]], null, '#ff4d6d', 2);
      g.fillStyle = '#ffd166';
      g.font = '900 34px Orbitron, sans-serif'; g.textAlign = 'center';
      poly(g, [[cx - 20, 92], [cx + 20, 92], [cx, 58]], '#ffd166', '#7a520c', 2);
      g.fillStyle = '#1b1f2a'; g.fillRect(cx - 2.5, 68, 5, 14); g.fillRect(cx - 2.5, 85, 5, 4);
      glow(g, cx, 182, 60, '#ff3355', state === 'hit' ? .3 : 1);
      g.fillStyle = state === 'hit' ? '#5a1020' : '#ff4d6d';
      g.beginPath(); g.arc(cx, 182, 17, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 5, 177, 5, 0, Math.PI * 2); g.fill();
      // Lont
      g.strokeStyle = '#c9a36b'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx + 6, 50); g.quadraticCurveTo(cx + 22, 30, cx + 34, 30); g.stroke();
      return c;
    }
    // Lijf
    lathe(g, cx, BODY, (k, j) => (k >= 5 && j >= 3 && j <= 5 ? '#3c4258' : '#2c3144'), 9, -90, 90, '#1a1d28');
    // Buikplaat met gouden rand en een cyaan lampje
    poly(g, [[cx - 46, 182], [cx + 46, 182], [cx + 56, 210], [cx + 50, 250], [cx - 50, 250], [cx - 56, 210]], '#4d5366', '#c99a2e', 3);
    glow(g, cx, 214, 34, '#38e1ff', .8);
    g.fillStyle = '#7ff0ff'; g.beginPath(); g.arc(cx, 214, 8, 0, Math.PI * 2); g.fill();
    // Oortjes (bouten)
    for (const s of [-1, 1]) poly(g, [...Array(6)].map((_, i) => [cx + s * 98 + Math.cos(i * Math.PI / 3) * 14, 112 + Math.sin(i * Math.PI / 3) * 14]), '#c99a2e', '#7a520c', 2);
    face(g, cx, state);
    helmet(g, cx, type === 'goud', state === 'dent');
    return c;
  }

  // Pootjes met gouden klauwen: die liggen over de rand van de put, dus apart getekend (na de rand).
  function pawSprite() {
    const c = document.createElement('canvas');
    c.width = Math.round(SP_W * SP_K); c.height = Math.round(80 * SP_K);
    const g = c.getContext('2d');
    g.scale(SP_K, SP_K);
    g.lineJoin = 'round';
    const cx = SP_W / 2;
    for (const s of [-1, 1]) {
      const x = cx + s * 72;
      poly(g, [[x - 30, 8], [x + 30, 8], [x + 36, 30], [x + 26, 48], [x - 26, 48], [x - 36, 30]], '#3c4152', '#1f2330', 2);
      poly(g, [[x - 30, 8], [x + 30, 8], [x + 24, 22], [x - 24, 22]], '#545a6e');
      for (const dx of [-20, 0, 20]) {
        poly(g, [[x + dx - 8, 40], [x + dx + 8, 40], [x + dx + 3 + s * 2, 72], [x + dx - 1 + s * 2, 74]], '#f2c14e', '#8a6514', 1.5);
        poly(g, [[x + dx - 8, 40], [x + dx, 40], [x + dx + s * 2, 70]], '#ffe08a');
      }
    }
    return c;
  }

  // ---------- Het zwaard ----------
  // Een kristallen kling met lichtende randen, een gouden pareerstang met blauwe steen. Punt bovenaan, hand op y = 440.
  const SW_W = 130, SW_H = 540, SW_HAND = 452;
  function swordSprite(fire) {
    if (ART.zwaard) return paintedSword(fire);
    const c = document.createElement('canvas');
    c.width = SW_W; c.height = SW_H;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    const cx = SW_W / 2;
    const edge = fire ? '#ffb347' : '#5ee7ff', core = fire ? '#ff6a1a' : '#2fa6ff';
    const light = fire ? '#ffe2a8' : '#d9f6ff', dark = fire ? '#a83a0c' : '#3d6d9c';
    glow(g, cx, 200, 150, core, .35);
    poly(g, [[cx, 8], [cx + 26, 70], [cx + 26, 372], [cx, 384], [cx - 26, 372], [cx - 26, 70]], dark);
    poly(g, [[cx, 8], [cx, 384], [cx - 26, 372], [cx - 26, 70]], light);
    poly(g, [[cx, 8], [cx + 26, 70], [cx + 12, 80], [cx, 30]], shadeHex(fire ? '#ffb347' : '#8fd8ff', 1));
    poly(g, [[cx - 9, 90], [cx + 9, 90], [cx + 9, 360], [cx - 9, 360]], rgba(core, .55));
    g.strokeStyle = edge; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 26, 372); g.lineTo(cx - 26, 70); g.lineTo(cx, 8); g.lineTo(cx + 26, 70); g.lineTo(cx + 26, 372); g.stroke();
    // Pareerstang
    poly(g, [[cx - 62, 380], [cx + 62, 380], [cx + 54, 404], [cx - 54, 404]], '#d9a23a', '#7a520c', 2.5);
    poly(g, [[cx - 62, 380], [cx + 62, 380], [cx + 58, 388], [cx - 58, 388]], '#ffe08a');
    poly(g, [[cx - 22, 374], [cx + 22, 374], [cx + 22, 412], [cx - 22, 412]], '#e8b54a', '#7a520c', 2.5);
    poly(g, [[cx, 380], [cx + 13, 393], [cx, 406], [cx - 13, 393]], fire ? '#ff8c42' : '#3d8bff', '#ffffff', 1.5);
    glow(g, cx, 393, 26, fire ? '#ffb347' : '#5ee7ff', .9);
    // Greep en knop
    for (let y = 412; y < 504; y += 13) poly(g, [[cx - 12, y], [cx + 12, y], [cx + 12, y + 11], [cx - 12, y + 11]], y % 26 ? '#3a2a22' : '#4a362c');
    poly(g, [[cx - 16, 504], [cx + 16, 504], [cx + 20, 518], [cx, 534], [cx - 20, 518]], '#e8b54a', '#7a520c', 2);
    return c;
  }

  // ---------- Het burchtplein ----------
  class Scene {
    constructor({ keys = null, board = false } = {}) {
      this.keys = keys;
      this.board = board;
      this.w = 0; this.h = 0;
      this.sprites = null;
      // Posters komen na het laden binnen: dan het plein opnieuw tekenen.
      if (typeof Posters !== 'undefined') Posters.onChange(() => { if (this.w) this.bake(); });
    }

    project(x, y, z) {
      return [this.cx + this.f * x / z, this.hor + this.f * (CAM_H - y) / z];
    }

    layout(w, h) {
      // Gsm rechtop: de putten wat dichter bij elkaar, dan kan alles groter.
      const tall = w < h;
      const spread = tall ? .82 : 1;
      const f = Math.min(w * (tall ? .74 : .6), h * (this.board ? .64 : .6));
      this.f = f;
      this.cx = w / 2;
      this.hor = h * (this.board ? .58 : w < h ? .62 : .6) - .6 * f;
      this.holes = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = HX[col] * spread, z = HZ[row];
          const [sx, sy] = this.project(x, RIM_H, z);
          this.holes.push({ i: row * 3 + col, row, col, x, z, sx, sy, rx: this.f * R_IN / z, ry: this.f * R_IN * (CAM_H - RIM_H) / (z * z), scale: this.f / z });
        }
      }
    }

    resize(w, h) {
      if (w === this.w && h === this.h) return false;
      this.w = w; this.h = h;
      this.layout(w, h);
      if (!this.sprites) this.makeSprites();
      this.bake();
      return true;
    }

    makeSprites() {
      this._av = artVer;
      {
        this.sprites = {
          mol: moleSprite('mol', ''), molHit: moleSprite('mol', 'hit'),
          goud: moleSprite('goud', ''), goudDent: moleSprite('goud', 'dent'), goudHit: moleSprite('goud', 'hit'),
          bom: moleSprite('bom', ''), bomHit: moleSprite('bom', 'hit'), paws: pawSprite(),
          sword: swordSprite(false), fire: swordSprite(true),
        };
      }
    }

    // ---------- Vooraf tekenen ----------
    bake() {
      const { w, h } = this;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.lineJoin = 'round';
      this.sky(g);
      this.walls(g);
      this.ground(g);
      this.torchSpots = [];
      for (const [x, z] of [[-11.2, 9], [11.2, 9], [-11.2, 17], [11.2, 17], [-2.7, 23.3], [2.7, 23.3]]) this.brazier(g, x, z);
      // De putten: achterste helft en het donkere gat in de achtergrond, de voorste rand per rij apart.
      this.lips = [];
      for (let row = 0; row < 3; row++) {
        const hs = this.holes.filter(o => o.row === row);
        let top = Infinity, bottom = 0;
        for (const o of hs) {
          top = Math.min(top, o.sy - o.ry * 1.2);
          bottom = Math.max(bottom, this.project(o.x, 0, o.z - R_OUT)[1] + 4);
        }
        top = Math.max(0, Math.floor(top)); bottom = Math.min(h, Math.ceil(bottom));
        const lip = document.createElement('canvas');
        lip.width = w; lip.height = Math.max(1, bottom - top);
        const lg = lip.getContext('2d');
        lg.translate(0, -top);
        lg.lineJoin = 'round';
        for (const o of hs) {
          this.hole(g, o, 'back');
          this.hole(lg, o, 'front');
          this.hole(g, o, 'front');
          if (this.keys) this.keyLabel(lg, o);
        }
        this.lips.push({ c: lip, y: top });
      }
      Glow.vignette(g, w, h, .5);
      this.bg = c;
    }

    sky(g) {
      const { w, h } = this;
      const grad = g.createLinearGradient(0, 0, 0, this.hor + this.f * .3);
      grad.addColorStop(0, '#040817');
      grad.addColorStop(.6, '#0c1638');
      grad.addColorStop(1, '#1f2c66');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      const r = rand(7);
      for (let i = 0; i < 160; i++) {
        const x = r() * w, y = r() * Math.max(10, this.hor), b = r();
        g.fillStyle = `rgba(200,220,255,${.25 + b * .6})`;
        g.fillRect(x, y, b > .92 ? 2 : 1.2, b > .92 ? 2 : 1.2);
      }
      const mx = w * .2, my = Math.max(this.h * .08, this.hor - this.f * .45);
      glow(g, mx, my, this.f * .35, '#7aa2ff', .45);
      g.fillStyle = '#dfe8ff';
      g.beginPath(); g.arc(mx, my, this.f * .05, 0, Math.PI * 2); g.fill();
      // Verre torenspitsen met blauw licht
      for (let i = 0; i < 9; i++) {
        const x = (i + .5) / 9 * w + (r() - .5) * w * .06, top = this.hor - this.f * (.18 + r() * .28), bw = this.f * (.03 + r() * .03);
        poly(g, [[x - bw, this.hor + 10], [x - bw, top + bw * 2], [x, top], [x + bw, top + bw * 2], [x + bw, this.hor + 10]], '#0b1330');
        glow(g, x, top, bw * 3, '#38bdf8', .6);
      }
    }

    // Een vlak in de wereld met bakstenen. corner(u, v) geeft het wereldpunt; u langs de muur, v omhoog.
    brickWall(g, corner, len, height, base, seed) {
      const P = (u, v) => this.project(...corner(u, v));
      poly(g, [P(0, 0), P(len, 0), P(len, height), P(0, height)], base);
      const r = rand(seed);
      const rowH = .62;
      for (let v = 0, row = 0; v < height - .01; v += rowH, row++) {
        const top = Math.min(height, v + rowH);
        for (let u = row % 2 ? -.6 : 0; u < len; u += 1.25) {
          const u0 = Math.max(0, u) + .05, u1 = Math.min(len, u + 1.25) - .05;
          if (u1 <= u0) continue;
          const k = .82 + r() * .32;
          poly(g, [P(u0, v + .05), P(u1, v + .05), P(u1, top - .05), P(u0, top - .05)], shadeHex(base, k));
        }
      }
    }

    walls(g) {
      const back = 24, side = 12.6, wallH = 6;
      const rock = '#3a3e4c', rockSide = '#2e3240';
      // Zijmuren (je kijkt tegen de binnenkant)
      for (const s of [-1, 1]) {
        this.brickWall(g, (u, v) => [s * side, v, 3 + u], back - 3, wallH, rockSide, s > 0 ? 3 : 4);
        for (let z = 3.6; z < back; z += 1.5) {
          const pts = [[s * side, wallH, z], [s * side, wallH, z + .8], [s * side, wallH + .8, z + .8], [s * side, wallH + .8, z]].map(p => this.project(...p));
          poly(g, pts, '#353947');
        }
        // Banieren, en posters ertussen
        for (const z of [6.2, 12.5, 19]) this.banner(g, (u, v) => [s * (side - .05), v, z + u], 1.6);
        [9.4, 15.75].forEach((z, i) => this.poster(g, (u, v) => [s * (side - .05), v, z + (s < 0 ? u : 1 - u) * 1.7 - .85], 1.7, 2.5, i * 2 + (s > 0)));
      }
      // Achtermuur met poort
      this.brickWall(g, (u, v) => [-side + u, v, back], side * 2, wallH, rock, 9);
      for (let x = -side; x < side; x += 1.5) {
        poly(g, [[x, wallH, back], [x + .8, wallH, back], [x + .8, wallH + .8, back], [x, wallH + .8, back]].map(p => this.project(...p)), '#424656');
      }
      // Poort: een boog met blauw licht en een valhek
      const gate = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI - i * Math.PI / 12; gate.push(this.project(Math.cos(a) * 1.7, 2.6 + Math.sin(a) * 1.7, back - .01)); }
      const gpts = [this.project(-1.7, 0, back - .01), ...gate, this.project(1.7, 0, back - .01)];
      const [gx, gy] = this.project(0, 2.2, back);
      const gg = g.createLinearGradient(0, gy - this.f * .15, 0, gy + this.f * .1);
      gg.addColorStop(0, '#1a6dd6'); gg.addColorStop(1, '#0a1a3e');
      poly(g, gpts, gg, '#c99a2e', 2);
      glow(g, gx, gy, this.f * .18, '#38bdf8', .55);
      g.strokeStyle = 'rgba(10,16,30,.85)'; g.lineWidth = Math.max(1, this.f / back * .09);
      for (let x = -1.4; x <= 1.41; x += .35) { const a = this.project(x, 0, back - .02), b = this.project(x, 2.6 + Math.sqrt(Math.max(0, 1.7 * 1.7 - x * x)) - .1, back - .02); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      for (let y = .5; y < 4; y += .55) { const a = this.project(-1.6, y, back - .02), b = this.project(1.6, y, back - .02); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      // Torens
      for (const x of [-side, -6.5, 6.5, side]) this.tower(g, x, back, Math.abs(x) > 10 ? 10.5 : 8.5, Math.abs(x) < 10);
      // Op de achtermuur: posters naast de poort en banieren tussen de torens (geen posters: alleen banieren).
      for (const x of [-9.5, -3.6, 3.6, 9.5]) {
        if (Math.abs(x) < 5 && this.poster(g, (u, v) => [Math.sign(x) * 3.35 - 1.4 + u * 2.8, v, back - .02], 2.8, 2.0, x < 0 ? 4 : 5)) continue;
        this.banner(g, (u, v) => [x - .8 + u, v, back - .02], 1.6);
      }
    }

    // Een ingelijste poster aan een muur: corner(u, v) met u van 0 tot 1 over de breedte, v in wereldhoogte.
    poster(g, corner, wide, bottom, n) {
      const img = typeof Posters !== 'undefined' && Posters.pick(n);
      if (!img) return false;
      const high = wide * img.height / img.width;
      Posters.plane(g, img, (u, v) => this.project(...corner(u, bottom + v * high)));
      return true;
    }

    tower(g, x, z, height, spire) {
      const hw = 1.5;
      this.brickWall(g, (u, v) => [x - hw + u, v, z - .3], hw * 2, height, '#40444f', Math.round(x * 7 + 50));
      // Kantelen
      for (let i = 0; i < 4; i++) {
        const x0 = x - hw + i * .8 + .05;
        poly(g, [[x0, height, z - .3], [x0 + .5, height, z - .3], [x0 + .5, height + .7, z - .3], [x0, height + .7, z - .3]].map(p => this.project(...p)), '#4a4e5c');
      }
      // Ramen met blauw licht
      for (const y of [height * .45, height * .72]) {
        const a = this.project(x - .25, y, z - .31), b = this.project(x + .25, y + 1.1, z - .31);
        g.fillStyle = '#5ee7ff';
        g.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
        glow(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (b[0] - a[0]) * 4, '#38bdf8', .6);
      }
      if (spire) {
        const tip = this.project(x, height + 3.4, z - .3);
        poly(g, [this.project(x - 1.1, height + .7, z - .3), tip, this.project(x + 1.1, height + .7, z - .3)], '#232a44');
        poly(g, [this.project(x, height + .7, z - .3), tip, this.project(x + 1.1, height + .7, z - .3)], '#1a2036');
        glow(g, tip[0], tip[1], this.f / z * .9, '#5ee7ff', .9);
      }
    }

    // Een blauwe banier met gouden rand en een gouden zwaard-en-kroon.
    banner(g, corner, len) {
      const P = (u, v) => this.project(...corner(u, v));
      const top = 5.4, bottom = 2.2;
      const shape = [P(0, top), P(len, top), P(len, bottom + .5), P(len / 2, bottom), P(0, bottom + .5)];
      poly(g, shape, '#1d3a8f', '#e0b04a', Math.max(1, this.f / 60));
      poly(g, [P(.12, top - .1), P(len - .12, top - .1), P(len - .12, top - .45), P(.12, top - .45)], '#2a4fb3');
      g.strokeStyle = '#f2c14e';
      g.lineWidth = Math.max(1, this.f / 90);
      g.lineCap = 'round';
      const line = (a, b) => { g.beginPath(); g.moveTo(...P(...a)); g.lineTo(...P(...b)); g.stroke(); };
      line([len / 2, top - .8], [len / 2, bottom + 1]);
      line([len / 2 - .35, top - 1.5], [len / 2 + .35, top - 1.5]);
      poly(g, [P(len / 2 - .35, top - .55), P(len / 2 - .2, top - .85), P(len / 2, top - .6), P(len / 2 + .2, top - .85), P(len / 2 + .35, top - .55)], '#f2c14e');
      // Stang
      poly(g, [P(-.1, top + .1), P(len + .1, top + .1), P(len + .1, top - .02), P(-.1, top - .02)], '#7a5a2a');
    }

    brazier(g, x, z) {
      const s = this.f / z;
      const [bx, by] = this.project(x, 1.5, z);
      const [fx, fy] = this.project(x, 0, z);
      // Paal en schaal
      poly(g, [[bx - s * .12, by], [bx + s * .12, by], [fx + s * .16, fy], [fx - s * .16, fy]], '#2a2a30');
      poly(g, [[bx - s * .5, by - s * .32], [bx + s * .5, by - s * .32], [bx + s * .3, by + s * .05], [bx - s * .3, by + s * .05]], '#4a3a2a', '#c99a2e', Math.max(1, s * .04));
      glow(g, fx, fy, s * 3.4, '#ff9a3c', .45, .35);
      glow(g, bx, by - s * .4, s * 3, '#ff8a2a', .55);
      this.torchSpots.push({ x: bx, y: by - s * .32, s });
    }

    ground(g) {
      const { w, h } = this;
      const far = 24, near = 2.4;
      const [, yFar] = this.project(0, 0, far);
      const base = g.createLinearGradient(0, yFar, 0, h);
      base.addColorStop(0, '#141a2c'); base.addColorStop(1, '#1d2420');
      g.fillStyle = base;
      g.fillRect(0, yFar, w, h - yFar);
      const r = rand(31);
      const fog = '#1a2244';
      const cracks = [];
      for (let z = far, row = 0; z > near; row++) {
        const d = Math.max(.75, z * .085);
        const z0 = z - d;
        const off = row % 2 ? .55 : 0;
        for (let x = -13 + off; x < 13; x += 1.1) {
          const j = () => (r() - .5) * .14;
          const gap = .06;
          const c = [[x + gap + j(), z - gap + j()], [x + 1.1 - gap + j(), z - gap + j()], [x + 1.1 - gap + j(), z0 + gap + j()], [x + gap + j(), z0 + gap + j()]];
          if (c.some(([px, pz]) => pz < .5)) continue;
          const k = r();
          let col = k < .14 ? '#4a5644' : k < .5 ? '#4b4e5c' : k < .8 ? '#565865' : '#5f5c63';
          col = mix(col, fog, Math.min(.75, (z - 4) / 26));
          const bright = .85 + r() * .3;
          poly(g, c.map(([px, pz]) => this.project(px, 0, pz)), shadeHex('#1b1e26', 1));
          poly(g, c.map(([px, pz]) => this.project(px * .985, .08, pz)), shadeHex(col, bright));
          if (r() < .05 && z < 13) cracks.push(c);
        }
        z = z0;
      }
      // Lichtende scheuren zoals op het icoon
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const c of cracks) {
        const a = this.project((c[0][0] + c[1][0]) / 2, .09, (c[0][1] + c[1][1]) / 2), b = this.project((c[2][0] + c[3][0]) / 2 + .2, .09, (c[2][1] + c[3][1]) / 2), m = this.project((c[0][0] + c[2][0]) / 2 - .15, .09, (c[0][1] + c[2][1]) / 2);
        g.strokeStyle = 'rgba(94,231,255,.8)';
        g.lineWidth = Math.max(1, this.f / 260);
        g.beginPath(); g.moveTo(...a); g.lineTo(...m); g.lineTo(...b); g.stroke();
        glow(g, m[0], m[1], this.f / 30, '#38bdf8', .35);
      }
      g.restore();
    }

    // Een achthoekige put uit stenen blokken met cyaan licht in de voegen. part: 'back' of 'front'.
    hole(g, o, part) {
      const blocks = [];
      for (let i = 0; i < 8; i++) {
        const a = (i + .5) * Math.PI / 4, half = Math.PI / 8 - .05;
        blocks.push({ a, a0: a - half, a1: a + half, back: Math.sin(a) > 0 });
      }
      const at = (a, rad, y) => this.project(o.x + Math.cos(a) * rad, y, o.z + Math.sin(a) * rad);
      const sc = o.scale;
      if (part === 'back') {
        glow(g, o.sx, o.sy, o.rx * 2.4, '#38bdf8', .35, .5);
        // Gloed in de voegen
        poly(g, [...Array(16)].map((_, i) => at(i * Math.PI / 8, R_OUT + .03, RIM_H * .6)), '#0d1a26');
      }
      const list = blocks.filter(b => (part === 'back') === b.back).sort((p, q) => Math.sin(q.a) - Math.sin(p.a));
      const stone = (b, k) => shadeHex(['#55545a', '#4d4b50', '#5b5a5e', '#4a4a52'][(o.i + b.a * 3 | 0) % 4], k);
      for (const b of list) {
        if (part === 'back') {
          // Binnenkant van de achterste blokken (die zie je boven het gat)
          poly(g, [at(b.a0, R_IN, RIM_H), at(b.a1, R_IN, RIM_H), at(b.a1, R_IN, -.8), at(b.a0, R_IN, -.8)], stone(b, .55));
        } else {
          // Buitenkant van de voorste blokken
          poly(g, [at(b.a0, R_OUT, RIM_H), at(b.a1, R_OUT, RIM_H), at(b.a1, R_OUT, 0), at(b.a0, R_OUT, 0)], stone(b, .62 + .25 * Math.cos(b.a + .6)));
        }
        const top = [at(b.a0, R_IN, RIM_H), at(b.a1, R_IN, RIM_H), at(b.a1, R_OUT, RIM_H), at(b.a0, R_OUT, RIM_H)];
        poly(g, top, stone(b, 1.15 - .2 * Math.sin(b.a)), '#2a2a30', Math.max(1, sc * .012));
        // Licht randje
        g.strokeStyle = 'rgba(255,255,255,.18)';
        g.lineWidth = Math.max(1, sc * .01);
        g.beginPath(); g.moveTo(...top[3]); g.lineTo(...top[2]); g.stroke();
      }
      if (part === 'back') {
        // Het gat zelf: donker, met een zweem cyaan diep beneden
        const pts = [...Array(16)].map((_, i) => at(i * Math.PI / 8, R_IN, RIM_H));
        const grad = g.createRadialGradient(o.sx, o.sy + o.ry * .3, 0, o.sx, o.sy, o.rx);
        grad.addColorStop(0, '#0a3550'); grad.addColorStop(.5, '#05101c'); grad.addColorStop(1, '#020409');
        poly(g, pts, grad);
        // Voegen met licht
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(94,231,255,.55)';
        g.lineWidth = Math.max(1, sc * .02);
        for (const b of blocks) {
          const a = b.a1 + .05;
          g.beginPath(); g.moveTo(...at(a, R_IN, RIM_H)); g.lineTo(...at(a, R_OUT, RIM_H)); g.stroke();
        }
        g.restore();
      }
    }

    // De toets van een put, op het voorste blok van de rand.
    keyLabel(g, o) {
      const [x, y] = this.project(o.x, RIM_H * .45, o.z - R_OUT);
      const s = Math.max(13, o.scale * .2);
      g.fillStyle = 'rgba(6,10,19,.8)';
      g.strokeStyle = 'rgba(255,201,74,.8)';
      g.lineWidth = 1.5;
      g.beginPath();
      if (g.roundRect) g.roundRect(x - s * .65, y - s * .6, s * 1.3, s * 1.2, s * .22); else g.rect(x - s * .65, y - s * .6, s * 1.3, s * 1.2);
      g.fill(); g.stroke();
      g.fillStyle = '#ffd166';
      g.font = `800 ${Math.round(s * .78)}px Orbitron, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(this.keys[o.i] || '', x, y + 1);
    }

    // ---------- Elke frame ----------
    // moles: [{ m, r (0-1 uit de put), state: ''|'hit'|'dent', squash, color, name }]
    draw(ctx, t, moles, extra) {
      if (this._av !== artVer) this.makeSprites();
      const sp = this.sprites;
      ctx.drawImage(this.bg, 0, 0);
      // Vlammen van de fakkels
      for (const f of this.torchSpots) this.flame(ctx, f, t);
      for (let row = 0; row < 3; row++) {
        const here = moles.filter(x => this.holes[x.m.hole].row === row);
        for (const x of here) this.mole(ctx, x, sp, t);
        const lip = this.lips[row];
        ctx.drawImage(lip.c, 0, lip.y);
        for (const x of here) this.paws(ctx, x, sp);
        if (extra) extra(row);
      }
    }

    flame(ctx, f, t) {
      const k = Math.sin(t * 13 + f.x) * .5 + Math.sin(t * 7.3 + f.y) * .5;
      const s = f.s;
      glow(ctx, f.x, f.y - s * .3, s * (1.3 + k * .12), '#ff9a3c', .7);
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(f.x - s * .32, f.y);
      ctx.quadraticCurveTo(f.x - s * .3, f.y - s * .5, f.x + k * s * .08, f.y - s * (1 + k * .15));
      ctx.quadraticCurveTo(f.x + s * .3, f.y - s * .5, f.x + s * .32, f.y);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(f.x - s * .16, f.y);
      ctx.quadraticCurveTo(f.x - s * .14, f.y - s * .3, f.x + k * s * .05, f.y - s * (.6 + k * .1));
      ctx.quadraticCurveTo(f.x + s * .14, f.y - s * .3, f.x + s * .16, f.y);
      ctx.fill();
    }

    moleSize(o) {
      const k = o.scale * MOLE_W / SP_W;
      return { k, w: SP_W * k, h: SP_H * k };
    }

    mole(ctx, x, sp, t) {
      const o = this.holes[x.m.hole];
      if (x.r <= 0.01) return;
      const { k, w, h } = this.moleSize(o);
      const type = x.m.type;
      const img = type === 'bom' ? (x.state === 'hit' ? sp.bomHit : sp.bom)
        : type === 'goud' ? (x.state === 'hit' ? sp.goudHit : x.state === 'dent' ? sp.goudDent : sp.goud)
          : (x.state === 'hit' ? sp.molHit : sp.mol);
      const sq = x.squash || 0;
      const sy = 1 - sq * .22, sx = 1 + sq * .14;
      const lift = (1 - x.r) * SP_BASE * k * 1.05;
      const wob = x.state ? 0 : Math.sin(t * 9 + x.m.id) * .025;
      ctx.save();
      ctx.beginPath();
      ctx.rect(o.sx - w, 0, w * 2, o.sy);
      ctx.ellipse(o.sx, o.sy, o.rx, o.ry, 0, 0, Math.PI);
      ctx.clip();
      ctx.translate(o.sx, o.sy + lift);
      ctx.rotate(wob);
      ctx.scale(sx, sy);
      ctx.drawImage(img, -w / 2, -SP_BASE * k, w, h);
      ctx.restore();
      // Lont van de bomdrone sputtert
      if (type === 'bom' && x.state !== 'hit') {
        const fx = o.sx + 34 * k, fy = o.sy + lift - (SP_BASE - 30) * k * sy;
        glow(ctx, fx, fy, w * (.16 + .05 * Math.sin(t * 40)), '#ffd166', 1);
      }
      if (x.color && x.r > .2) {
        // Op het bord: wie raakte hem?
        ctx.save();
        const fs = Math.max(12, o.scale * .3);
        ctx.font = `800 ${Math.round(fs)}px "Exo 2", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = Math.max(3, fs * .25);
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        const y = o.sy + lift - (SP_BASE - 10) * k * sy - fs * .4;
        ctx.strokeText(x.name, o.sx, y);
        ctx.fillStyle = x.color;
        ctx.fillText(x.name, o.sx, y);
        ctx.restore();
      }
      if (x.state === 'hit' && type !== 'bom') {
        // Sterretjes rond het hoofd
        const cy = o.sy + lift - (SP_BASE - 60) * k * sy;
        for (let i = 0; i < 4; i++) {
          const a = t * 6 + i * Math.PI / 2;
          const px = o.sx + Math.cos(a) * w * .38, py = cy + Math.sin(a) * w * .1 - w * .25;
          star(ctx, px, py, w * .05, '#ffd166');
        }
      }
    }

    paws(ctx, x, sp) {
      if (x.m.type === 'bom' || x.r < .55) return;
      const o = this.holes[x.m.hole];
      const { k, w } = this.moleSize(o);
      const a = Math.min(1, (x.r - .55) / .35);
      ctx.save();
      ctx.globalAlpha = a;
      const y = o.sy + o.ry * .25 - (1 - a) * 10 * k;
      ctx.drawImage(sp.paws, o.sx - w / 2 * (1 + (x.squash || 0) * .1), y - 6 * k, w * (1 + (x.squash || 0) * .1), 80 * k);
      ctx.restore();
    }

    // Welke put zit onder (px, py)? Eerst de mollen (die steken uit), dan de dichtste put.
    pick(px, py, up = []) {
      let best = -1, bestD = Infinity;
      for (const o of [...this.holes].reverse()) {
        const { w, k } = this.moleSize(o);
        const isUp = up.includes(o.i);
        if (isUp && Math.abs(px - o.sx) < w * .42 && py < o.sy + o.ry && py > o.sy - (SP_BASE - 30) * k) return o.i;
        const dx = (px - o.sx) / (o.rx * 1.6), dy = (py - o.sy) / (o.ry * 2.2);
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = o.i; }
      }
      return bestD < 2.2 ? best : -1;
    }

    // Het punt waar het zwaard landt bij put i (een beetje boven het gat, waar de kop zit).
    target(i) {
      const o = this.holes[i];
      const { k } = this.moleSize(o);
      return [o.sx, o.sy - (SP_BASE - 90) * k];
    }
  }

  function star(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Het zwaard in je hand (leerlingscherm) ----------
  class Sword {
    constructor() {
      this.swing = null;
      this.tips = [];
    }
    strike(from, to, now) {
      this.swing = { to, at: now };
      this.tips = [];
    }
    // Waar staan hand en punt nu? Rust: rechtsonder, punt schuin omhoog. Slag: in 70 ms naar het doel, daarna terug.
    pose(w, h, t, now) {
      const idle = { px: w * .83, py: h * 1.04, a: -.42 + Math.sin(t * 1.7) * .03, len: Math.min(h * .5, w * .55) };
      if (!this.swing) return idle;
      const age = now - this.swing.at;
      if (age > 330) { this.swing = null; return idle; }
      const [tx, ty] = this.swing.to;
      const px = tx + (w * .83 - tx) * .3, py = h * 1.02;
      const hit = { px, py, a: Math.atan2(tx - px, -(ty - py)), len: Math.hypot(tx - px, ty - py) };
      const ease = age < 70 ? Math.pow(age / 70, 2) : age < 150 ? 1 : 1 - Math.pow((age - 150) / 180, 1.5);
      const k = Math.max(0, Math.min(1, ease));
      return { px: idle.px + (hit.px - idle.px) * k, py: idle.py + (hit.py - idle.py) * k, a: idle.a + (hit.a - idle.a) * k, len: idle.len + (hit.len - idle.len) * k, k };
    }
    draw(ctx, sprites, w, h, t, now, fire) {
      const p = this.pose(w, h, t, now);
      const tipX = p.px + Math.sin(p.a) * p.len, tipY = p.py - Math.cos(p.a) * p.len;
      if (this.swing) this.tips.push({ x: tipX, y: tipY, mx: p.px + Math.sin(p.a) * p.len * .72, my: p.py - Math.cos(p.a) * p.len * .72, at: now });
      this.tips = this.tips.filter(x => now - x.at < 110);
      // Slaglijn: een lichtende boog achter de punt
      if (this.tips.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = fire ? 'rgba(255,140,40,.35)' : 'rgba(94,231,255,.32)';
        ctx.beginPath();
        this.tips.forEach((x, i) => (i ? ctx.lineTo(x.x, x.y) : ctx.moveTo(x.x, x.y)));
        for (let i = this.tips.length - 1; i >= 0; i--) ctx.lineTo(this.tips[i].mx, this.tips[i].my);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const img = fire ? sprites.fire : sprites.sword;
      const scale = p.len / SW_HAND;
      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.rotate(p.a);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -img.width / 2, -SW_HAND);
      ctx.restore();
      if (fire) glow(ctx, tipX, tipY, p.len * .12, '#ff8c42', .6 + .2 * Math.sin(t * 20));
      return { tipX, tipY, k: p.k || 0 };
    }
  }

  return { Scene, Sword, star };
})();
