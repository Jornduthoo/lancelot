// Sterrenvreter tekenen (bord en leerling): de ruimte, de lichtmuur met torens, het zwarte gat, het sterrenstof en de ridderbollen.
// Alles wat duur is (bollen, stof, torens, de schijf van het zwarte gat) tekenen we één keer vooraf; per frame is het drawImage.
// Gebruikt AK (arena-kit.js), Glow (fx.js) en SvWorld.
const SvDraw = (() => {
  const { radius } = SvWorld;
  const { glow, rgba } = Glow;
  const TAU = Math.PI * 2;

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }
  function canvas(w, h = w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // ---------- Vooraf getekend ----------
  // Een ridderbol: een planeet in de kleur van de speler, met banden, een lichtende rand en in het midden een ridderhelm met vizier.
  const orbCache = new Map();
  function orbSprite(color) {
    let c = orbCache.get(color);
    if (c) return c;
    const S = 256, r = 120, m = S / 2;
    c = canvas(S);
    const g = c.getContext('2d');
    const body = g.createRadialGradient(m - r * .35, m - r * .4, r * .08, m, m, r);
    body.addColorStop(0, shade(color, .55));
    body.addColorStop(.45, color);
    body.addColorStop(.85, shade(color, -.45));
    body.addColorStop(1, shade(color, -.7));
    g.fillStyle = body;
    g.beginPath();
    g.arc(m, m, r, 0, TAU);
    g.fill();
    // Banden en wervels, alleen binnen de bol
    g.save();
    g.beginPath();
    g.arc(m, m, r, 0, TAU);
    g.clip();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = rgba('#ffffff', .05 + (i % 2) * .04);
      g.lineWidth = 10 + i * 4;
      g.beginPath();
      g.ellipse(m, m + (i - 2) * 42, r * 1.3, 26 + i * 3, -.25, 0, TAU);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    // Schaduwkant
    const dark = g.createRadialGradient(m + r * .5, m + r * .55, r * .2, m + r * .3, m + r * .3, r * 1.25);
    dark.addColorStop(0, 'rgba(0,0,10,0)');
    dark.addColorStop(.7, 'rgba(0,0,10,.15)');
    dark.addColorStop(1, 'rgba(0,0,10,.55)');
    g.fillStyle = dark;
    g.fillRect(0, 0, S, S);
    g.restore();
    // Ridderhelm in het midden
    const hw = r * .62, top = m - r * .5, bot = m + r * .46;
    const steel = g.createLinearGradient(m - hw, 0, m + hw, 0);
    steel.addColorStop(0, '#5d6a86');
    steel.addColorStop(.35, '#e7eefb');
    steel.addColorStop(.6, '#a9b6cf');
    steel.addColorStop(1, '#414b63');
    g.fillStyle = 'rgba(0,0,0,.35)';
    helmPath(g, m + 5, top + 7, bot + 7, hw);
    g.fill();
    g.fillStyle = steel;
    helmPath(g, m, top, bot, hw);
    g.fill();
    g.strokeStyle = 'rgba(10,14,30,.8)';
    g.lineWidth = 4;
    g.stroke();
    // Kam op de helm in de kleur van de speler
    g.fillStyle = shade(color, .2);
    g.beginPath();
    g.moveTo(m - 7, top + 4);
    g.quadraticCurveTo(m, top - 34, m + 7, top + 4);
    g.lineTo(m + 5, m - 6);
    g.lineTo(m - 5, m - 6);
    g.closePath();
    g.fill();
    // T-vizier dat oplicht
    const visor = '#9ff3ff';
    g.save();
    g.shadowColor = visor;
    g.shadowBlur = 18;
    g.fillStyle = visor;
    g.fillRect(m - hw * .72, m - 4, hw * 1.44, 13);
    g.fillRect(m - 6, m - 4, 12, r * .38);
    g.restore();
    g.fillStyle = '#ffffff';
    g.fillRect(m - hw * .6, m, hw * 1.2, 4);
    // Klinknagels
    g.fillStyle = 'rgba(30,36,56,.8)';
    for (const dx of [-.78, .78]) { g.beginPath(); g.arc(m + hw * dx, m + r * .26, 4.5, 0, TAU); g.fill(); }
    // Lichtende rand
    g.lineWidth = 5;
    g.strokeStyle = shade(color, .6);
    g.beginPath();
    g.arc(m, m, r - 2, 0, TAU);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.arc(m, m, r - 2, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
    orbCache.set(color, c);
    return c;
  }
  function helmPath(g, m, top, bot, hw) {
    g.beginPath();
    g.moveTo(m - hw, bot);
    g.lineTo(m - hw, top + hw * .9);
    g.bezierCurveTo(m - hw, top - hw * .15, m + hw, top - hw * .15, m + hw, top + hw * .9);
    g.lineTo(m + hw, bot);
    g.quadraticCurveTo(m, bot + hw * .28, m - hw, bot);
    g.closePath();
  }

  // Sterrenstof: een kristalletje met een gloed. Index 3 is goud (meer waard).
  const dustSprites = SvWorld.DUST.map(col => {
    const c = canvas(48);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, rgba(col, .9));
    grad.addColorStop(.3, rgba(col, .35));
    grad.addColorStop(1, rgba(col, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(24, 13); g.lineTo(30, 24); g.lineTo(24, 35); g.lineTo(18, 24);
    g.closePath();
    g.fill();
    g.fillStyle = rgba(col, .85);
    g.beginPath();
    g.moveTo(24, 16); g.lineTo(27.5, 24); g.lineTo(24, 32); g.lineTo(20.5, 24);
    g.closePath();
    g.fill();
    return c;
  });

  // Een toren op de lichtmuur, van bovenaf: kantelen en een lichtende kern.
  const tower = (() => {
    const c = canvas(96);
    const g = c.getContext('2d');
    glow(g, 48, 48, 48, '#4cc9ff', .5);
    g.fillStyle = '#2a3350';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, rr = i % 2 ? 26 : 32;
      g.lineTo(48 + Math.cos(a) * rr, 48 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = '#8fa3cc';
    g.lineWidth = 2.5;
    g.stroke();
    const stone = g.createRadialGradient(42, 42, 2, 48, 48, 24);
    stone.addColorStop(0, '#6a7a9f');
    stone.addColorStop(1, '#232b44');
    g.fillStyle = stone;
    g.beginPath();
    g.arc(48, 48, 22, 0, TAU);
    g.fill();
    g.fillStyle = '#bff6ff';
    g.beginPath();
    g.arc(48, 48, 7, 0, TAU);
    g.fill();
    glow(g, 48, 48, 18, '#4cc9ff', .9);
    return c;
  })();

  // De schijf rond het zwarte gat: spiraalarmen van heet gas.
  const disk = (() => {
    const S = 512, m = S / 2;
    const c = canvas(S);
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    for (let arm = 0; arm < 3; arm++) {
      for (let i = 0; i < 90; i++) {
        const k = i / 90;
        const a = arm * (TAU / 3) + k * 4.2;
        const d = 60 + k * 190;
        const col = k < .3 ? '#fff1c1' : k < .6 ? '#ff9e5e' : '#b45cff';
        glow(g, m + Math.cos(a) * d, m + Math.sin(a) * d, 36 - k * 16, col, .22 * (1 - k * .6));
      }
    }
    const ring = g.createRadialGradient(m, m, 50, m, m, 140);
    ring.addColorStop(0, 'rgba(255,220,160,.5)');
    ring.addColorStop(.4, 'rgba(255,120,80,.25)');
    ring.addColorStop(1, 'rgba(120,40,200,0)');
    g.fillStyle = ring;
    g.fillRect(0, 0, S, S);
    return c;
  })();

  // Een kroon voor de zwaarste ridder.
  const crown = (() => {
    const c = canvas(96, 72);
    const g = c.getContext('2d');
    glow(g, 48, 40, 44, '#ffc94a', .6);
    const gold = g.createLinearGradient(0, 14, 0, 62);
    gold.addColorStop(0, '#fff3b0');
    gold.addColorStop(.5, '#ffc94a');
    gold.addColorStop(1, '#a8670f');
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(14, 60); g.lineTo(10, 22); g.lineTo(30, 40); g.lineTo(48, 12); g.lineTo(66, 40); g.lineTo(86, 22); g.lineTo(82, 60);
    g.closePath();
    g.fill();
    g.strokeStyle = '#5a3606';
    g.lineWidth = 3;
    g.stroke();
    for (const [x, y, col] of [[48, 46, '#ff4d6d'], [28, 50, '#4cc9ff'], [68, 50, '#4ade80']]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, 5.5, 0, TAU);
      g.fill();
    }
    return c;
  })();

  // Zeshoekig raster op de vloer van de arena, als patroon.
  let hexPattern = null;
  function hex(ctx) {
    if (hexPattern) return hexPattern;
    const s = 46, w = s * Math.sqrt(3), h = s * 3;
    const c = canvas(Math.round(w), Math.round(h));
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(90,170,255,.11)';
    g.lineWidth = 2;
    const cell = (cx, cy) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      }
      g.closePath();
      g.stroke();
    };
    for (const [cx, cy] of [[0, 0], [w, 0], [w / 2, h / 2], [0, h], [w, h]]) cell(cx, cy);
    hexPattern = ctx.createPattern(c, 'repeat');
    return hexPattern;
  }

  // ---------- Vloer ----------
  // Ver uitgezoomd (bord): verloop en zeshoekpatroon over de hele cirkel.
  function floorFull(ctx, R, withHex = true) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    const floor = ctx.createRadialGradient(0, 0, R * .2, 0, 0, R);
    floor.addColorStop(0, 'rgba(40,10,70,.35)');
    floor.addColorStop(.7, 'rgba(8,20,50,.25)');
    floor.addColorStop(1, 'rgba(30,90,180,.28)');
    ctx.fillStyle = floor;
    ctx.fill();
    if (withHex) {
      ctx.fillStyle = hex(ctx);
      ctx.fill();
    }
    ctx.restore();
  }

  // Ingezoomd (gsm, Chromebook): het verloop uit een vooraf getekend beeld en de zeshoeken als één pad van dunne lijnen.
  // Een verloop of patroon over het hele scherm kost op een Chromebook veel meer dan één beeld en wat lijntjes.
  let floorCache = null;
  function floorView(ctx, R, view) {
    if (!floorCache || floorCache.R !== R) {
      const size = 1024, k = size / (R * 2);
      const c = canvas(size);
      const g = c.getContext('2d');
      g.translate(size / 2, size / 2);
      g.scale(k, k);
      floorFull(g, R, false);
      floorCache = { c, R, k };
    }
    const { c, k } = floorCache;
    const x0 = Math.max(-R, view.x0), x1 = Math.min(R, view.x1), y0 = Math.max(-R, view.y0), y1 = Math.min(R, view.y1);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(c, (x0 + R) * k, (y0 + R) * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
    const S = 46, W = S * Math.sqrt(3), H = S * 1.5;
    ctx.beginPath();
    for (let row = Math.floor(y0 / H) - 1; row * H <= y1 + S; row++) {
      const off = row & 1 ? W / 2 : 0;
      for (let col = Math.floor((x0 - off) / W) - 1; col * W + off <= x1 + W; col++) {
        const cx = col * W + off, cy = row * H;
        if (cx * cx + cy * cy > (R - S) * (R - S)) continue;
        for (let i = 0; i <= 3; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3 - Math.PI / 3;
          const x = cx + Math.cos(a) * S, y = cy + Math.sin(a) * S;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      }
    }
    ctx.strokeStyle = 'rgba(90,170,255,.11)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------- De scène ----------
  // Wat de server stuurt, plus wat we zelf afleiden: vloeiende posities, massa die rustig aangroeit, vonken.
  class Scene {
    constructor() {
      this.R = 1500;
      this.dust = new Map();   // id -> [x, y, v, c, geboren]
      this.orbs = new AK.Interp(100);
      this.mass = new Map();   // id -> getoonde massa
      this.parts = new AK.Particles();
      this.trails = new AK.Trails(14);
      this.suck = [];
      this.hidden = new Map(); // stof dat wij zelf al opaten (voorspelling), id -> tijd
      this.bh = 70;
      this.bhShown = 70;
      this.king = -1;
      this.meN = -1;
      this.onEvent = null;
      this.pulse = new Map();
    }
    setDust(msg) {
      this.R = msg.R || this.R;
      this.dust.clear();
      const t = performance.now() - 1000;
      for (const d of msg.list) this.dust.set(d[0], [d[1], d[2], d[3], d[4], t]);
    }
    apply(msg) {
      const t = performance.now();
      for (const k of msg.k) this.orbs.push(k[0], [k[1], k[2], 0, k[3], k[4]], t);
      this.orbs.prune(t, 300);
      this.bh = msg.bh;
      this.king = msg.king;
      for (const e of msg.ev) this.event(e, t);
    }
    event(e, t) {
      const P = this.parts;
      if (e[0] === '+') this.dust.set(e[1], [e[2], e[3], e[4], e[5], t]);
      else if (e[0] === '-') {
        const d = this.dust.get(e[1]);
        this.dust.delete(e[1]);
        this.hidden.delete(e[1]);
        if (d && this.suck.length < 160) this.suck.push({ x: d[0], y: d[1], c: d[3], v: d[2], n: e[2], t });
      } else if (e[0] === 'slok') {
        const [, a, , x, y, m] = e;
        const r = radius(m);
        P.shock(x, y, r * 1.6, '#ffffff', .55);
        P.burst(x, y, { n: 26, color: '#ffe17a', speed: 260 + r * 2, life: .8, size: 4 });
        P.sparks(x, y, { n: 18, color: '#bff6ff', speed: 520 });
        this.pulse.set(a, t);
      } else if (e[0] === 'gat') {
        P.shock(0, 0, this.bh * 1.8, '#c77dff', .7);
        P.burst(0, 0, { n: 30, color: '#ff9e5e', speed: 420, life: .9, size: 5 });
      } else if (e[0] === 'nova') {
        const [, , x, y, r] = e;
        P.shock(x, y, r, '#ff6bd6', .7);
        P.shock(x, y, r * .7, '#ffe17a', .5);
        P.sparks(x, y, { n: 40, color: '#ffd1f0', speed: 900, life: .5, width: 3 });
      } else if (e[0] === 'grow') this.pulse.set(e[1], t);
      if (this.onEvent) this.onEvent(e);
    }
    // Getoonde massa groeit vloeiend naar de echte massa.
    massOf(n, real, dt) {
      const cur = this.mass.get(n);
      const v = cur === undefined ? real : cur + (real - cur) * Math.min(1, dt * 7);
      this.mass.set(n, v);
      return v;
    }
    update(dt) {
      this.parts.update(dt);
      this.bhShown += (this.bh - this.bhShown) * Math.min(1, dt * 2);
      const t = performance.now();
      this.suck = this.suck.filter(s => t - s.t < 220);
      for (const [id, at] of this.hidden) if (t - at > 700) this.hidden.delete(id);
    }
    // Voorspelling: stof dat onze eigen bol raakt, verdwijnt meteen (de server bevestigt het even later).
    predict(x, y, r) {
      const t = performance.now();
      let gained = 0;
      for (const [id, d] of this.dust) {
        if (this.hidden.has(id)) continue;
        if (Math.abs(d[0] - x) > r + 4 || Math.abs(d[1] - y) > r + 4) continue;
        if ((d[0] - x) ** 2 + (d[1] - y) ** 2 > (r + 4) ** 2) continue;
        this.hidden.set(id, t);
        gained += d[2];
      }
      return gained;
    }
  }

  // ---------- Tekenen ----------
  // cam: { x, y, zoom, w, h }. opts: { roster, local: { n, x, y, m }, board }
  function render(ctx, s, cam, opts = {}) {
    const t = performance.now();
    const ts = t / 1000;
    const { w, h, zoom } = cam;
    const dt = Math.min(.05, (t - (s.lastDraw || t)) / 1000);
    s.lastDraw = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    Glow.space(ctx, w, h, -cam.x * zoom * .18, -cam.y * zoom * .18);
    const sx = x => (x - cam.x) * zoom + w / 2;
    const sy = y => (y - cam.y) * zoom + h / 2;
    const view = { x0: cam.x - w / 2 / zoom - 40, x1: cam.x + w / 2 / zoom + 40, y0: cam.y - h / 2 / zoom - 40, y1: cam.y + h / 2 / zoom + 40 };
    const inView = (x, y, r = 0) => x + r > view.x0 && x - r < view.x1 && y + r > view.y0 && y - r < view.y1;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    const R = s.R;
    // Vloer: een licht zeshoekraster binnen de muur, met een blauwe gloed naar de rand toe.
    if (zoom < .45) floorFull(ctx, R);
    else floorView(ctx, R, view);
    // De lichtmuur: brede gloed, felle kern, en een energiegolf die rondloopt. Alleen het stuk boog dat in beeld is.
    let a0 = 0, a1 = TAU, wall = true;
    {
      const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
      const half = Math.hypot(view.x1 - view.x0, view.y1 - view.y0) / 2;
      const d = Math.hypot(cx, cy);
      if (d + half < R - 60) wall = false;
      else if (d > half + 100) {
        const span = Math.min(Math.PI, Math.asin(Math.min(1, (half + 120) / Math.max(d, R * .5))) + .05);
        a0 = Math.atan2(cy, cx) - span;
        a1 = a0 + span * 2;
      }
    }
    if (wall) {
      ctx.lineCap = 'round';
      for (const [lw, col, a] of [[90, '#4cc9ff', .07], [34, '#4cc9ff', .18], [10, '#9ff3ff', .7], [3, '#ffffff', .9]]) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, R, a0, a1);
        ctx.stroke();
      }
      ctx.globalAlpha = .9;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#c4f7ff';
      ctx.lineWidth = 14;
      for (let i = 0; i < 3; i++) {
        const a = ts * .35 + (i * TAU) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, R, a, a + .22);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // Torens op de muur
    const towers = Math.max(10, Math.round((TAU * R) / 520));
    for (let i = 0; i < towers; i++) {
      const a = (i / towers) * TAU;
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      if (!inView(x, y, 60)) continue;
      ctx.drawImage(tower, x - 48, y - 48, 96, 96);
    }
    // Het zwarte gat
    const bh = s.bhShown;
    if (inView(0, 0, bh * 4)) {
      glow(ctx, 0, 0, bh * 4.2, '#7b2cff', .45);
      glow(ctx, 0, 0, bh * 2.4, '#ff6bd6', .25);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ds = bh * 3.4;
      ctx.rotate(ts * .6);
      ctx.drawImage(disk, -ds, -ds, ds * 2, ds * 2);
      ctx.rotate(-ts * 1.5);
      ctx.globalAlpha = .55;
      ctx.drawImage(disk, -ds * .8, -ds * .8, ds * 1.6, ds * 1.6);
      ctx.restore();
      // Sterren die naar binnen spiralen
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffe9c9';
      for (let i = 0; i < 26; i++) {
        const k = ((ts * .25 + i * .618) % 1);
        const a = i * 2.4 + k * 5;
        const d = bh * (1.05 + (1 - k) * 2.6);
        ctx.globalAlpha = k * .9;
        ctx.fillRect(Math.cos(a) * d - 2, Math.sin(a) * d - 2, 4, 4);
      }
      ctx.restore();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, bh, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(3, bh * .06);
      ctx.strokeStyle = 'rgba(255,230,190,.9)';
      ctx.beginPath();
      ctx.arc(0, 0, bh * 1.04, 0, TAU);
      ctx.stroke();
    }
    // Sterrenstof
    for (const [id, d] of s.dust) {
      if (s.hidden.has(id) || !inView(d[0], d[1], 20)) continue;
      const big = d[2] > 1;
      const size = (big ? 15 + Math.min(12, d[2]) : 12) * (.85 + .15 * Math.sin(ts * 3 + id)) * (opts.board ? Math.max(1, .6 / zoom) : 1);
      const age = Math.min(1, (t - d[4]) / 400);
      ctx.globalAlpha = age;
      ctx.drawImage(dustSprites[d[3]] || dustSprites[0], d[0] - size, d[1] - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
    // Stof dat net opgezogen wordt, vliegt naar de eter.
    for (const sk of s.suck) {
      const o = sk.n === opts.local?.n ? opts.local : s.orbs.get(sk.n, t);
      if (!o) continue;
      const ox = o.x !== undefined ? o.x : o[0], oy = o.y !== undefined ? o.y : o[1];
      const k = (t - sk.t) / 220;
      const x = sk.x + (ox - sk.x) * k, y = sk.y + (oy - sk.y) * k;
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(dustSprites[sk.c] || dustSprites[0], x - 8, y - 8, 16, 16);
    }
    ctx.globalAlpha = 1;

    // Ridderbollen, de kleinste eerst (de groten liggen erover).
    const list = [];
    for (const id of s.orbs.ids()) {
      const v = s.orbs.get(id, t);
      if (!v) continue;
      if (opts.local && id === opts.local.n) continue;
      list.push({ n: id, x: v[0], y: v[1], m: s.massOf(id, v[3], dt), f: v[4] });
    }
    if (opts.local && opts.local.n >= 0 && opts.local.alive) {
      const v = s.orbs.get(opts.local.n, t);
      list.push({ n: opts.local.n, x: opts.local.x, y: opts.local.y, m: s.massOf(opts.local.n, opts.local.m, dt), f: (v ? v[4] : 0) | (opts.local.flags || 0), me: true });
    }
    list.sort((a, b) => a.m - b.m);
    const me = list.find(o => o.me);
    // Op het bord tekenen we kleine bollen iets groter, anders zie je ze niet vanop de achterste rij.
    const minR = opts.board ? 13 / zoom : 0;
    for (const o of list) {
      const r = Math.max(radius(o.m), minR);
      s.trails.add(o.n, o.x, o.y, t);
      if (!inView(o.x, o.y, r * 2)) continue;
      const info = opts.roster && opts.roster.get(o.n);
      const color = info ? info.color : '#4cc9ff';
      if (o.f & 8) s.trails.draw(ctx, o.n, color, r * 1.4, t);
      glow(ctx, o.x, o.y, r * 1.9, color, .55);
      // Pulsje als de bol net groeide
      const pt = s.pulse.get(o.n);
      const pk = pt ? Math.max(0, 1 - (t - pt) / 350) : 0;
      const rr = r * (1 + pk * .12);
      const spin = ts * (1.2 - Math.min(.9, r / 300)) + o.n;
      // Ring rond de bol (achterkant)
      ctx.strokeStyle = rgba(color, .55);
      ctx.lineWidth = Math.max(2, r * .07);
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, rr * 1.42, rr * .38, Math.sin(spin * .3) * .5 - .3, Math.PI, TAU);
      ctx.stroke();
      ctx.drawImage(orbSprite(color), o.x - rr * 1.067, o.y - rr * 1.067, rr * 2.133, rr * 2.133);
      // Ring (voorkant), met een lichtje dat rondgaat
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, rr * 1.42, rr * .38, Math.sin(spin * .3) * .5 - .3, 0, Math.PI);
      ctx.stroke();
      const ma = spin * 2;
      const rot = Math.sin(spin * .3) * .5 - .3;
      const mx = Math.cos(ma) * rr * 1.42, my = Math.sin(ma) * rr * .38;
      glow(ctx, o.x + mx * Math.cos(rot) - my * Math.sin(rot), o.y + mx * Math.sin(rot) + my * Math.cos(rot), Math.max(8, r * .3), '#ffffff', .8);
      // Beschermd of aan het antwoorden: een schild van zeshoeken.
      if (o.f & 6) {
        const asking = o.f & 2;
        ctx.save();
        ctx.globalAlpha = asking ? .85 : .45 + .35 * Math.sin(ts * 10);
        ctx.strokeStyle = asking ? '#ffe17a' : '#9ff3ff';
        ctx.lineWidth = Math.max(2.5, r * .05);
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i * TAU) / 6 + ts * .8;
          ctx.lineTo(o.x + Math.cos(a) * r * 1.22, o.y + Math.sin(a) * r * 1.22);
        }
        ctx.stroke();
        ctx.globalAlpha *= .15;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
        if (asking) AK.label(ctx, '❓', o.x + r * .9, o.y - r * .9, '#ffe17a', Math.max(16, r * .4));
      }
      // De kroon voor de zwaarste
      if (o.n === s.king) {
        const cw = Math.max(34, r * .9), ch = cw * .75;
        ctx.drawImage(crown, o.x - cw / 2, o.y - r - ch * .95 + Math.sin(ts * 3) * 3, cw, ch);
      }
      // Naam en massa
      const fs = Math.max(13, Math.min(40, r * .32)) / Math.max(.5, Math.min(1.6, zoom)) * (opts.board ? 1.1 : 1);
      if (info) AK.label(ctx, info.name, o.x, o.y + r + fs * 1.05, o.me ? '#ffe17a' : '#e8f1ff', fs);
      if (!opts.board || r * zoom > 18) AK.label(ctx, String(Math.round(o.m)), o.x, o.y + r * .78, '#ffffff', fs * .7);
      // Wie kan je opeten, en wie moet je ontvluchten? Een rode of groene rand vanuit jouw standpunt.
      if (me && !o.me) {
        const danger = o.m >= me.m * SvWorld.EAT_RATIO, prey = me.m >= o.m * SvWorld.EAT_RATIO;
        if (danger || prey) {
          ctx.strokeStyle = danger ? 'rgba(255,77,109,.85)' : 'rgba(74,222,128,.8)';
          ctx.lineWidth = Math.max(2, 3 / zoom);
          ctx.setLineDash([10 / zoom, 8 / zoom]);
          ctx.beginPath();
          ctx.arc(o.x, o.y, r + 6 / zoom, ts * (danger ? 2 : -1), ts * (danger ? 2 : -1) + TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    s.trails.prune(t);
    s.parts.draw(ctx);
    ctx.restore();
    Glow.vignette(ctx, w, h, .5);
  }

  // Kleine kaart: de arena, het gat, de anderen als stipjes en jezelf groter.
  function minimap(ctx, s, x, y, size, me, roster) {
    const t = performance.now();
    const k = size / 2 / s.R;
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,20,.72)';
    ctx.strokeStyle = 'rgba(159,243,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#ff9e5e';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, s.bhShown * k), 0, TAU);
    ctx.fill();
    ctx.stroke();
    for (const id of s.orbs.ids()) {
      const v = s.orbs.get(id, t);
      if (!v || (me && id === me.n)) continue;
      const info = roster && roster.get(id);
      ctx.fillStyle = id === s.king ? '#ffc94a' : info ? info.color : '#9bb8ff';
      ctx.beginPath();
      ctx.arc(cx + v[0] * k, cy + v[1] * k, Math.max(2, radius(v[3]) * k), 0, TAU);
      ctx.fill();
    }
    if (me) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffe17a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + me.x * k, cy + me.y * k, Math.max(3.5, radius(me.m) * k), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  return { Scene, render, minimap, orbSprite, crown };
})();
