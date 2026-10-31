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
    glow(ctx, w * .12, h * .24, h * .32, 'rgba(255,201,74,.35)', p);
    glow(ctx, w * .88, h * .24, h * .32, 'rgba(94,231,255,.32)', 1.6 - p);
    ctx.fillStyle = 'rgba(255,230,160,.5)';
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97.3 + t * (6 + i % 4) * 3) % w + w) % w;
      const y = h * .2 + ((i * 53.1 + Math.sin(t * .6 + i) * 20) % (h * .6));
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // ---------- De hooiberg ----------
  // Elk vakje tekenen we op een eigen canvas. Na graven tekenen we alleen het stukje rond de geraakte vakjes opnieuw.
  class Hay {
    constructor() {
      this.c = document.createElement('canvas');
      this.g = this.c.getContext('2d');
      this.st = null;
      this.cs = 0;
    }
    // ky: op een gsm rechtop zijn de vakjes hoger dan breed, zodat de berg het scherm vult.
    build(st, cs, ky = 1) {
      this.st = st;
      this.cs = cs;
      this.ky = ky;
      this.pad = Math.ceil(cs * 1.2);
      this.c.width = Math.ceil(st.cols * cs + this.pad * 2);
      this.c.height = Math.ceil((st.rows * cs + this.pad * 2) * ky);
      this.region(0, 0, st.cols - 1, st.rows - 1, true);
    }
    // Vakjes c0..c1, r0..r1 opnieuw tekenen (en wat er van de buren in uitsteekt).
    region(c0, r0, c1, r1, all) {
      const { st, cs, g, pad } = this;
      const x0 = all ? 0 : pad + (c0 - 1) * cs, y0 = all ? 0 : pad + (r0 - 1) * cs;
      const x1 = all ? this.c.width : pad + (c1 + 2) * cs, y1 = all ? this.c.height : pad + (r1 + 2) * cs;
      g.save();
      g.scale(1, this.ky);
      g.beginPath();
      g.rect(x0, y0, x1 - x0, y1 - y0);
      g.clip();
      g.clearRect(x0, y0, x1 - x0, y1 - y0);
      g.lineCap = 'round';
      const a0 = all ? 0 : Math.max(0, r0 - 2), a1 = all ? st.rows - 1 : Math.min(st.rows - 1, r1 + 2);
      const b0 = all ? 0 : Math.max(0, c0 - 2), b1 = all ? st.cols - 1 : Math.min(st.cols - 1, c1 + 2);
      // Eerst een zachte onderlaag (dun hooi laat nog wat door), dan de strootjes erover.
      const UNDER = [null, 'rgba(201,150,52,.5)', '#b5852c', '#8f621f'];
      for (let h = 1; h <= 3; h++) {
        g.fillStyle = UNDER[h];
        g.beginPath();
        for (let y = a0; y <= a1; y++) {
          for (let c = b0; c <= b1; c++) {
            if (st.hp[y * st.cols + c] !== h) continue;
            const x = pad + (c + .5) * cs, yy = pad + (y + .5) * cs;
            g.moveTo(x + cs * .8, yy);
            g.arc(x, yy, cs * .8, 0, TAU);
          }
        }
        g.fill();
      }
      for (let y = a0; y <= a1; y++) {
        for (let c = b0; c <= b1; c++) {
          const i = y * st.cols + c;
          const h = st.hp[i];
          if (!h) continue;
          let s = (i * 2654435761 + st.k * 97) >>> 0;
          const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
          const n = h === 1 ? 4 : 4 + h * 2;
          g.lineWidth = Math.max(1, cs * .1);
          for (let j = 0; j < n; j++) {
            const cx = pad + (c + r()) * cs, cy = pad + (y + r()) * cs;
            const a = -.9 + r() * 1.8 + (r() < .5 ? 0 : Math.PI);
            const len = cs * (.3 + r() * .4);
            g.strokeStyle = h === 1 ? 'rgba(247,223,143,.95)' : STRO[Math.floor(r() * (h === 3 ? STRO.length : 4))];
            g.beginPath();
            g.moveTo(cx - Math.cos(a) * len, cy - Math.sin(a) * len);
            g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            g.stroke();
          }
          // Hier en daar een neonstrootje: dit is geen gewone schuur.
          if (h > 1 && r() < .07) {
            g.strokeStyle = r() < .5 ? '#7ff6ff' : '#e9a8ff';
            g.lineWidth = Math.max(1, cs * .1);
            const cx = pad + (c + .5) * cs, cy = pad + (y + .5) * cs, a = r() * Math.PI;
            g.beginPath();
            g.moveTo(cx - Math.cos(a) * cs * .6, cy - Math.sin(a) * cs * .6);
            g.lineTo(cx + Math.cos(a) * cs * .6, cy + Math.sin(a) * cs * .6);
            g.stroke();
          }
        }
      }
      g.restore();
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
      ctx.drawImage(this.c, ox - this.pad, oy - this.pad * this.ky);
    }
  }

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
    g.fillStyle = '#b98a2e';
    g.beginPath();
    g.moveTo(4, h);
    g.bezierCurveTo(10, 10, w - 10, 10, w - 4, h);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    g.lineCap = 'round';
    let s = 7;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 520; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 4 + r() * 7;
      g.strokeStyle = r() < .04 ? '#7ff6ff' : STRO[Math.floor(r() * STRO.length)];
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.restore();
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
