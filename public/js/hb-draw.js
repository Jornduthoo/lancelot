// Hooibergjacht tekenen: de neonschuur, de hooiberg (vakje per vakje in een eigen canvas, zodat graven goedkoop blijft),
// de kristallen naald, tandwielen en runenmunten, de werktuigen en de kleine hooibergen op het bord.
// Alleen canvas 2D, geen afbeeldingen: klein en snel op een Chromebook.
const HbDraw = (() => {
  const TAU = Math.PI * 2;
  const STRO = ['#f2cf6b', '#e2b44a', '#d29a2c', '#f7df8f', '#c88a24', '#ecc35a'];

  function glow(ctx, x, y, r, color, a = 1) {
    if (!(r > 0) || !(a > 0)) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // ---------- De schuur ----------
  let barnCache = null;
  function barnSprite(w, h) {
    if (barnCache && barnCache.width === w && barnCache.height === h) return barnCache;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (IMG.schuur) {
      // Zo groot dat het hele scherm vol is (bijsnijden aan de randen).
      const im = IMG.schuur, k = Math.max(w / im.width, h / im.height);
      g.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k);
      barnCache = c;
      return c;
    }
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#070a1f');
    sky.addColorStop(.6, '#141038');
    sky.addColorStop(1, '#0b0820');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Achterwand: donkere planken met een neonstrip
    const floorY = h * .86;
    const pw = Math.max(18, w / 26);
    for (let x = 0, i = 0; x < w; x += pw, i++) {
      g.fillStyle = i % 2 ? 'rgba(70,46,40,.55)' : 'rgba(58,38,36,.55)';
      g.fillRect(x, h * .18, pw - 2, floorY - h * .18);
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(x + pw * .5, h * .3 + (i * 37 % 60), 3, 3);
    }
    for (const yy of [.42, .66]) {
      g.fillStyle = 'rgba(94,231,255,.18)';
      g.fillRect(0, h * yy - 3, w, 6);
      g.fillStyle = 'rgba(94,231,255,.75)';
      g.fillRect(0, h * yy - .75, w, 1.5);
    }
    // Dakbalken in een A en een rond venster met sterren
    g.strokeStyle = '#2a1c22';
    g.lineWidth = Math.max(8, w * .014);
    g.beginPath();
    g.moveTo(-10, h * .32); g.lineTo(w / 2, -h * .02); g.lineTo(w + 10, h * .32);
    g.moveTo(0, h * .18); g.lineTo(w, h * .18);
    g.stroke();
    g.strokeStyle = 'rgba(199,125,255,.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-10, h * .32 + 6); g.lineTo(w / 2, -h * .02 + 6); g.lineTo(w + 10, h * .32 + 6);
    g.stroke();
    const rx = w / 2, ry = h * .1, rr = Math.min(w, h) * .055;
    g.fillStyle = '#04061a';
    g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.fill();
    g.fillStyle = '#e8f1ff';
    for (let i = 0; i < 9; i++) g.fillRect(rx - rr * .7 + (i * 53 % 100) / 100 * rr * 1.4, ry - rr * .6 + (i * 71 % 100) / 100 * rr * 1.2, 1.5, 1.5);
    g.strokeStyle = '#ffc94a';
    g.lineWidth = 3;
    g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(rx - rr, ry); g.lineTo(rx + rr, ry); g.moveTo(rx, ry - rr); g.lineTo(rx, ry + rr); g.stroke();
    // Vloer: stenen tegels met een lichtende ring
    const fl = g.createLinearGradient(0, floorY, 0, h);
    fl.addColorStop(0, '#1b1530');
    fl.addColorStop(1, '#0a0716');
    g.fillStyle = fl;
    g.fillRect(0, floorY, w, h - floorY);
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.lineWidth = 1;
    for (let x = -w; x < w * 2; x += w / 10) { g.beginPath(); g.moveTo(w / 2 + (x - w / 2) * .55, floorY); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = 'rgba(94,231,255,.5)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, floorY); g.lineTo(w, floorY); g.stroke();
    barnCache = c;
    return c;
  }

  // Twee lampen die zacht pulseren en wat stofjes in het licht.
  function barn(ctx, w, h, t) {
    ctx.drawImage(barnSprite(w, h), 0, 0);
    const p = .75 + .25 * Math.sin(t * 1.7);
    if (!IMG.schuur) {
      glow(ctx, w * .12, h * .24, h * .32, 'rgba(255,201,74,.35)', p);
      glow(ctx, w * .88, h * .24, h * .32, 'rgba(94,231,255,.32)', 1.6 - p);
    }
    ctx.fillStyle = 'rgba(255,230,160,.5)';
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97.3 + t * (6 + i % 4) * 3) % w + w) % w;
      const y = h * .2 + ((i * 53.1 + Math.sin(t * .6 + i) * 20) % (h * .6));
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // ---------- Beelden ----------
  // Een geschilderde schuur en hooitextuur (public/img/hooiberg). Zolang ze laden (of als ze ontbreken) tekenen we zelf.
  const IMG = {};
  for (const [k, src] of [['schuur', '/img/hooiberg/schuur.webp'], ['hooi', '/img/hooiberg/hooi.webp']]) {
    const im = new Image();
    im.onload = () => { IMG[k] = im; barnCache = null; texCache = null; miniCache = null; Hay.gen++; };
    im.src = src;
  }

  // De hooitextuur: een vierkant dat naadloos herhaalt.
  let texCache = null;
  function texture() {
    if (texCache) return texCache;
    const n = 512;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    if (IMG.hooi) {
      g.drawImage(IMG.hooi, 0, 0, n, n);
    } else {
      g.fillStyle = '#a8761f';
      g.fillRect(0, 0, n, n);
      g.lineCap = 'round';
      let sd = 11;
      const r = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
      for (let i = 0; i < 9000; i++) {
        const x = r() * n, y = r() * n, a = -.7 + r() * 1.4 + (r() < .5 ? 0 : Math.PI), l = 6 + r() * 16;
        const k = i / 9000;
        g.strokeStyle = r() < .015 ? '#7ff6ff' : STRO[Math.floor(r() * STRO.length)];
        g.globalAlpha = .55 + k * .45;
        g.lineWidth = 1.4 + r() * 1.6;
        for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
          if (x + ox < -20 || x + ox > n + 20 || y + oy < -20 || y + oy > n + 20) continue;
          g.beginPath();
          g.moveTo(x + ox - Math.cos(a) * l, y + oy - Math.sin(a) * l);
          g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    texCache = c;
    return c;
  }

  // ---------- De hooiberg ----------
  // Vier lagen, elk een eigen canvas: de holte (donker binnenste van de volle berg), de schaduw van het hooi,
  // het hooi zelf (textuur door een zachte vorm, dieper = donkerder) en de vorm. Na graven werken we alleen het stukje
  // rond de geraakte vakjes bij, zodat het op een Chromebook vlot blijft.
  class Hay {
    constructor() {
      this.mask = document.createElement('canvas');
      this.hay = document.createElement('canvas');
      this.shadow = document.createElement('canvas');
      this.cave = document.createElement('canvas');
      this.comp = document.createElement('canvas');
      this.st = null;
      this.cs = 0;
    }
    // ky: op een gsm rechtop zijn de vakjes hoger dan breed, zodat de berg het scherm vult.
    build(st, cs, ky = 1) {
      this.st = st;
      this.cs = cs;
      this.ky = ky;
      this.gen = Hay.gen;
      this.pad = Math.ceil(cs * 1.2);
      const w = Math.ceil(st.cols * cs + this.pad * 2), h = Math.ceil((st.rows * cs + this.pad * 2) * ky);
      for (const c of [this.mask, this.hay, this.shadow, this.cave, this.comp]) { c.width = w; c.height = h; }
      this.pat = this.hay.getContext('2d').createPattern(texture(), 'repeat');
      // De holte: alleen diep in de berg (een gat dat je graaft), donker hooi met een warme gloed.
      const inner = new Uint8Array(st.hp.length);
      for (let y = 0; y < st.rows; y++) for (let c = 2; c < st.cols - 2; c++) if (st.hp[y * st.cols + c] && y - st.top[c] >= 3) inner[y * st.cols + c] = 1;
      const g = this.cave.getContext('2d');
      g.save();
      g.scale(1, ky);
      this.blobs(g, 0, st.rows - 1, 0, st.cols - 1, inner, 0, .95);
      g.restore();
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = this.pat;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createRadialGradient(w / 2, h * .7, 0, w / 2, h * .7, w * .55);
      gr.addColorStop(0, 'rgba(40,20,4,.72)');
      gr.addColorStop(1, 'rgba(12,6,2,.9)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      this.region(0, 0, st.cols - 1, st.rows - 1, true);
    }
    // Zachte bolletjes per vakje met hooi (hp in lijst, alleen waarden > min).
    blobs(g, r0, r1, c0, c1, hp, min, k = .82) {
      const { st, cs, pad } = this;
      g.fillStyle = '#fff';
      g.beginPath();
      for (let y = r0; y <= r1; y++) {
        for (let c = c0; c <= c1; c++) {
          if (hp[y * st.cols + c] <= min) continue;
          const x = pad + (c + .5) * cs, yy = pad + (y + .5) * cs;
          // Een beetje variatie in grootte, zodat de rand van een gat rafelig is.
          const v = ((y * 73 + c * 151) % 7) / 7;
          const rr = cs * (k + v * .14);
          g.moveTo(x + rr, yy);
          g.arc(x, yy, rr, 0, TAU);
        }
      }
      g.fill();
    }
    // Vakjes c0..c1, r0..r1 opnieuw tekenen (en wat er van de buren in uitsteekt). Alles in hele pixels, anders zie je naden.
    region(c0, r0, c1, r1, all) {
      const { st, cs, pad, ky } = this;
      const W = this.hay.width, H = this.hay.height;
      const X0 = all ? 0 : Math.max(0, Math.floor(pad + (c0 - 1.4) * cs)), Y0 = all ? 0 : Math.max(0, Math.floor((pad + (r0 - 1.4) * cs) * ky));
      const X1 = all ? W : Math.min(W, Math.ceil(pad + (c1 + 2.6) * cs)), Y1 = all ? H : Math.min(H, Math.ceil((pad + (r1 + 2.6) * cs) * ky));
      const a0 = all ? 0 : Math.max(0, r0 - 3), a1 = all ? st.rows - 1 : Math.min(st.rows - 1, r1 + 3);
      const b0 = all ? 0 : Math.max(0, c0 - 3), b1 = all ? st.cols - 1 : Math.min(st.cols - 1, c1 + 3);
      const open = c => {
        const g = c.getContext('2d');
        g.save();
        g.beginPath();
        g.rect(X0, Y0, X1 - X0, Y1 - Y0);
        g.clip();
        g.clearRect(X0, Y0, X1 - X0, Y1 - Y0);
        return g;
      };
      // De vorm
      const m = open(this.mask);
      m.scale(1, ky);
      this.blobs(m, a0, a1, b0, b1, st.hp, 0);
      m.restore();
      // Het hooi: textuur door de vorm, dieper hooi wat donkerder.
      const g = open(this.hay);
      g.drawImage(this.mask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = this.pat;
      g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      g.globalCompositeOperation = 'source-atop';
      // Licht van boven, schaduw onderaan
      const top = this.pad * ky, bot = H - this.pad * ky;
      const lg = g.createLinearGradient(0, top, 0, bot);
      lg.addColorStop(0, 'rgba(255,236,170,.22)');
      lg.addColorStop(.45, 'rgba(255,236,170,0)');
      lg.addColorStop(1, 'rgba(40,18,0,.38)');
      g.fillStyle = lg;
      g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      g.globalAlpha = .2;
      g.scale(1, ky);
      this.blobs(g, a0, a1, b0, b1, st.hp, 1, .7);
      this.blobs(g, a0, a1, b0, b1, st.hp, 2, .6);
      g.restore();
      // De schaduw: dezelfde vorm in zwart.
      const sg = open(this.shadow);
      sg.drawImage(this.mask, 0, 0);
      sg.globalCompositeOperation = 'source-in';
      sg.fillStyle = '#000';
      sg.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      sg.restore();
      // Alles samen: holte, schaduw wat lager (zo krijgt een gat diepte) en het hooi.
      const cg = open(this.comp);
      cg.drawImage(this.cave, 0, 0);
      cg.globalAlpha = .6;
      cg.drawImage(this.shadow, Math.round(cs * .12), Math.round(cs * .38 * ky));
      cg.globalAlpha = 1;
      cg.drawImage(this.hay, 0, 0);
      cg.restore();
    }
    // Na graven: alleen het stuk rond deze vakjes.
    update(cells) {
      if (!cells.length) return;
      const cols = this.st.cols;
      let c0 = 1e9, c1 = -1, r0 = 1e9, r1 = -1;
      for (const i of cells) {
        const c = i % cols, y = (i - c) / cols;
        if (c < c0) c0 = c; if (c > c1) c1 = c;
        if (y < r0) r0 = y; if (y > r1) r1 = y;
      }
      this.region(c0, r0, c1, r1, false);
    }
    draw(ctx, ox, oy) {
      ctx.drawImage(this.comp, ox - this.pad, oy - this.pad * this.ky);
    }
  }
  Hay.gen = 0;

  // ---------- De naald, tandwielen en munten ----------
  function needle(ctx, x, y, len, a, t, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(a);
    glow(ctx, 0, 0, len * .9, 'rgba(94,231,255,.55)', alpha * (.7 + .3 * Math.sin(t * 5)));
    ctx.globalAlpha = alpha;
    const w = Math.max(2, len * .09);
    const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
    grad.addColorStop(0, '#ffc94a');
    grad.addColorStop(.18, '#ffe9a8');
    grad.addColorStop(.22, '#bff8ff');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-len / 2, -w);
    ctx.lineTo(len * .35, -w * .6);
    ctx.lineTo(len / 2, 0);
    ctx.lineTo(len * .35, w * .6);
    ctx.lineTo(-len / 2, w);
    ctx.closePath();
    ctx.fill();
    // Het oog van de naald
    ctx.strokeStyle = '#7a4e00';
    ctx.lineWidth = Math.max(1, w * .4);
    ctx.beginPath();
    ctx.ellipse(-len * .38, 0, len * .07, w * .45, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Een fonkelend sterretje (voor de glinster van de naald door dun hooi).
  function sparkle(ctx, x, y, r, a = 1, color = '#ffffff') {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * .22 : r;
      const an = i / 8 * TAU;
      ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function item(ctx, kind, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    if (kind === 'munt') {
      glow(ctx, 0, 0, s * 1.1, 'rgba(255,201,74,.6)', .8);
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(0, 0, s * .45, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a06a00';
      ctx.lineWidth = Math.max(1, s * .08);
      ctx.stroke();
      ctx.strokeStyle = '#5ee7ff';
      ctx.beginPath(); ctx.moveTo(0, -s * .25); ctx.lineTo(-s * .15, s * .22); ctx.moveTo(0, -s * .25); ctx.lineTo(s * .15, s * .22); ctx.moveTo(-s * .12, s * .05); ctx.lineTo(s * .12, s * .05); ctx.stroke();
    } else {
      ctx.rotate(t * .8);
      ctx.fillStyle = '#9fb2d9';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const rr = i % 2 ? s * .32 : s * .46;
        const an = i / 16 * TAU;
        ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1b1530';
      ctx.beginPath(); ctx.arc(0, 0, s * .13, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Werktuigen ----------
  // lvl 0 hooivork, 1 plasmazeis, 2 windkanon, 3 wervelstorm. s = grootte in px, k = 0..1 hoe ver de beweging is.
  function tool(ctx, lvl, x, y, s, t, k) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    if (lvl === 0) {
      ctx.translate(0, -k * s * .25);
      ctx.rotate(-.5);
      ctx.strokeStyle = '#7a4e2a';
      ctx.lineWidth = s * .09;
      ctx.beginPath(); ctx.moveTo(0, -s * .2); ctx.lineTo(0, -s * 1.3); ctx.stroke();
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = s * .07;
      ctx.beginPath();
      ctx.moveTo(-s * .22, -s * .2); ctx.lineTo(s * .22, -s * .2);
      for (const dx of [-.22, 0, .22]) { ctx.moveTo(dx * s, -s * .2); ctx.lineTo(dx * s, s * .25); }
      ctx.stroke();
      glow(ctx, 0, s * .2, s * .35, 'rgba(255,201,74,.6)', .6 + k * .4);
    } else if (lvl === 1) {
      ctx.rotate(-.9 + k * 1.3);
      ctx.strokeStyle = '#3d3a5c';
      ctx.lineWidth = s * .09;
      ctx.beginPath(); ctx.moveTo(-s * .1, s * .9); ctx.lineTo(0, -s * .5); ctx.stroke();
      ctx.strokeStyle = '#5ee7ff';
      ctx.lineWidth = s * .12;
      ctx.beginPath(); ctx.arc(s * .55, -s * .45, s * .55, Math.PI, Math.PI * 1.75); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s * .04;
      ctx.stroke();
      glow(ctx, s * .3, -s * .7, s * .7, 'rgba(94,231,255,.5)', .5 + k * .5);
    } else if (lvl === 2) {
      for (let i = 0; i < 3; i++) {
        const p = (t * 2.2 + i / 3) % 1;
        ctx.strokeStyle = `rgba(199,125,255,${(1 - p) * .9})`;
        ctx.lineWidth = s * .06;
        ctx.beginPath(); ctx.arc(0, 0, s * (.2 + p * .6), 0, TAU); ctx.stroke();
      }
      ctx.rotate(-.7);
      ctx.fillStyle = '#4a4f78';
      ctx.fillRect(-s * .16, -s * 1.3, s * .32, s * .8);
      ctx.fillStyle = '#c77dff';
      ctx.fillRect(-s * .2, -s * .58, s * .4, s * .1);
      glow(ctx, 0, -s * .5, s * .45, 'rgba(199,125,255,.7)', .6 + k * .4);
    } else {
      ctx.rotate(t * 9);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = i % 2 ? 'rgba(255,107,214,.85)' : 'rgba(94,231,255,.85)';
        ctx.lineWidth = s * .07;
        ctx.beginPath(); ctx.arc(0, 0, s * (.25 + i * .15), i * 1.6, i * 1.6 + 2.4); ctx.stroke();
      }
      glow(ctx, 0, 0, s * .8, 'rgba(255,107,214,.45)', .6 + k * .4);
    }
    ctx.restore();
  }

  // ---------- Het bord: kleine hooibergen ----------
  let miniCache = null;
  function miniSprite() {
    if (miniCache) return miniCache;
    const w = 160, h = 100;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.beginPath();
    g.moveTo(4, h);
    g.bezierCurveTo(8, 6, w - 8, 6, w - 4, h);
    g.closePath();
    g.fillStyle = g.createPattern(texture(), 'repeat');
    g.fill();
    // Licht van boven, donker onderaan
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,240,190,.25)');
    gr.addColorStop(.6, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(40,20,0,.45)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    miniCache = c;
    return c;
  }

  // Een kleine hooiberg: hoe meer hooi weg is, hoe lager. prog 0..100.
  function mini(ctx, x, y, w, h, prog, t) {
    const spr = miniSprite();
    const k = 1 - Math.min(.85, prog / 100 * .85);
    ctx.drawImage(spr, x, y + h * (1 - k), w, h * k);
  }

  return { barn, Hay, needle, sparkle, item, tool, mini, glow };
})();
