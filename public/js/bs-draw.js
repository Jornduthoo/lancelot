// Burchtstorm tekenen: neonstenen, de schacht als burchttoren, vonken en lasers. Voor het bord en de leerling.
// Alles wat vaak terugkomt (stenen per grootte, de lege schacht, de achtergrond) wordt één keer gebakken en daarna gekopieerd.
// Gebruikt BsCore en Glow uit fx.js.
const BsDraw = (() => {
  const { W, VIS, COLORS, CELLS, TYPES } = BsCore;

  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function shade(c, f) {
    const [r, g, b] = hex(c);
    const m = v => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ---------- Geschilderde beelden ----------
  // Achtergrond, de achterwand van de schacht en één steen die we per kleur inkleuren. Zonder beelden: zelf tekenen.
  const ART = {};
  let artVer = 0;
  if (typeof Image !== 'undefined') {
    for (const n of ['achtergrond', 'muur', 'steen']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; artVer++; blocks.clear(); wells.clear(); };
      img.src = `/img/burchtstorm/${n}.webp`;
    }
  }

  // ---------- Stenen ----------
  // Een steen is een paneel van neonglas met een schuine rand en een rune in het midden.
  const blocks = new Map();
  function block(v, s) {
    s = Math.max(2, Math.round(s));
    const key = `${v}:${s}`;
    let c = blocks.get(key);
    if (c) return c;
    c = canvas(s, s);
    const g = c.getContext('2d');
    const col = COLORS[v];
    const r = Math.max(1, s * .14);
    if (v === 8) {
      // Belegeringssteen: donker staal met klinknagels en een rode naad.
      const grad = g.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#4a5266');
      grad.addColorStop(1, '#262b38');
      g.fillStyle = grad;
      rr(g, .5, .5, s - 1, s - 1, r);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(1, 1, s - 2, Math.max(1, s * .1));
      if (s >= 10) {
        g.fillStyle = 'rgba(255,77,109,.55)';
        g.fillRect(s * .2, s * .5 - .5, s * .6, Math.max(1, s * .06));
        g.fillStyle = '#8a93a8';
        for (const [x, y] of [[.2, .2], [.8, .2], [.2, .8], [.8, .8]]) g.fillRect(s * x - 1, s * y - 1, 2, 2);
      }
      blocks.set(key, c);
      return c;
    }
    if (ART.steen && s >= 6) {
      // De geschilderde steen, ingekleurd: vermenigvuldigen met de kleur, dan de vorm terug uitknippen, en wat glans erbij.
      g.drawImage(ART.steen, 0, 0, s, s);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = col;
      g.fillRect(0, 0, s, s);
      g.globalCompositeOperation = 'screen';
      g.fillStyle = shade(col, -.55);
      g.fillRect(0, 0, s, s);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(ART.steen, 0, 0, s, s);
      g.globalCompositeOperation = 'source-over';
      blocks.set(key, c);
      return c;
    }
    const grad = g.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, shade(col, .45));
    grad.addColorStop(.5, col);
    grad.addColorStop(1, shade(col, -.45));
    g.fillStyle = grad;
    rr(g, .5, .5, s - 1, s - 1, r);
    g.fill();
    if (s >= 8) {
      // schuine rand: licht linksboven, schaduw rechtsonder
      const e = Math.max(1, s * .12);
      g.fillStyle = 'rgba(255,255,255,.38)';
      g.fillRect(e * .6, e * .6, s - e * 1.2, e * .7);
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(e * .6, s - e * 1.3, s - e * 1.2, e * .7);
      // het paneel in het midden met een rune
      const i = s * .26;
      g.fillStyle = shade(col, -.35);
      rr(g, i, i, s - i * 2, s - i * 2, Math.max(1, s * .08));
      g.fill();
      if (s >= 14) {
        g.strokeStyle = shade(col, .7);
        g.globalAlpha = .9;
        g.lineWidth = Math.max(1, s * .06);
        g.beginPath();
        g.moveTo(s / 2, i + s * .07);
        g.lineTo(s - i - s * .07, s / 2);
        g.lineTo(s / 2, s - i - s * .07);
        g.lineTo(i + s * .07, s / 2);
        g.closePath();
        g.stroke();
        g.globalAlpha = 1;
      }
    }
    blocks.set(key, c);
    return c;
  }

  // De schaduw waar je steen gaat landen: een omlijnd vak in de kleur van de steen.
  const ghosts = new Map();
  function ghost(v, s) {
    s = Math.max(2, Math.round(s));
    const key = `${v}:${s}`;
    let c = ghosts.get(key);
    if (c) return c;
    c = canvas(s, s);
    const g = c.getContext('2d');
    g.strokeStyle = COLORS[v];
    g.globalAlpha = .75;
    g.lineWidth = Math.max(1, s * .08);
    rr(g, s * .1, s * .1, s * .8, s * .8, s * .12);
    g.stroke();
    g.globalAlpha = .13;
    g.fillStyle = COLORS[v];
    g.fill();
    ghosts.set(key, c);
    return c;
  }

  // ---------- De schacht ----------
  // Een torenschacht van donker glas in een metalen burchtrand met kantelen bovenaan.
  // m: de rand rond het speelveld. Geeft het canvas en de plaats van het veld erin terug.
  const wells = new Map();
  function well(cell, color = '#4cc9ff') {
    const key = `${cell}:${color}`;
    let w = wells.get(key);
    if (w) return w;
    const m = Math.max(3, Math.round(cell * .45));
    const top = Math.max(4, Math.round(cell * .9));
    const fw = cell * W, fh = cell * VIS;
    const c = canvas(fw + m * 2, fh + m + top);
    const g = c.getContext('2d');
    // rand van gemetselde steen: blokken met een lichte bovenkant en donkere voegen
    const stone = (x, y, w, h) => {
      const fg = g.createLinearGradient(x, 0, x + w, 0);
      fg.addColorStop(0, '#2a3044'); fg.addColorStop(.5, '#3e4660'); fg.addColorStop(1, '#262c3e');
      g.fillStyle = fg;
      g.fillRect(x, y, w, h);
      const bh = Math.max(3, cell * .5), bw = Math.max(4, cell * .9);
      let row = 0;
      for (let yy = y; yy < y + h; yy += bh, row++) {
        for (let xx = x + (row % 2 ? bw / 2 : 0) - bw; xx < x + w; xx += bw) {
          const v = Math.sin(xx * 12.9898 + yy * 78.233) * 43758.5453 % 1;
          g.fillStyle = v > 0 ? `rgba(255,255,255,${v * .08})` : `rgba(0,0,0,${-v * .18})`;
          g.fillRect(Math.round(xx), Math.round(yy), Math.round(bw), Math.round(bh));
        }
        g.fillStyle = 'rgba(0,0,0,.5)';
        g.fillRect(x, yy + bh - 1, w, 1);
        g.fillStyle = 'rgba(255,255,255,.07)';
        g.fillRect(x, yy, w, 1);
        for (let xx = x + (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
          g.fillStyle = 'rgba(0,0,0,.3)';
          g.fillRect(Math.round(xx), yy, 1, bh);
        }
      }
    };
    stone(0, top * .55, c.width, c.height - top * .55);
    // kantelen met een lichte kant en schaduw
    const merl = Math.max(3, cell * .9);
    for (let x = 0; x < c.width; x += merl * 2) {
      const mw = Math.min(merl, c.width - x);
      const mg = g.createLinearGradient(0, 0, 0, top);
      mg.addColorStop(0, '#6a7390'); mg.addColorStop(1, '#2a3042');
      g.fillStyle = mg;
      g.fillRect(x, 0, mw, top);
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(x, 0, mw, Math.max(1, cell * .08));
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(x + mw - Math.max(1, cell * .1), 0, Math.max(1, cell * .1), top);
    }
    g.fillStyle = 'rgba(255,201,74,.75)';
    g.fillRect(0, top * .55, c.width, Math.max(1, cell * .06));
    // schietgaten in de zijkanten, en een edelsteen in de kleur van de ridder bovenaan
    if (m >= 5) {
      for (let y = top + cell * 2; y < top + fh - cell; y += cell * 4) {
        for (const x of [m / 2, c.width - m / 2]) {
          g.fillStyle = '#05070f';
          g.fillRect(x - 1, y, 2, cell * 1.2);
          g.fillRect(x - 2, y + cell * .45, 4, 2);
        }
      }
    }
    {
      const gx = c.width / 2, gy = top * .55 + Math.max(1, cell * .06) + 1, gs = Math.max(2, cell * .28);
      Glow.glow(g, gx, gy, gs * 3, color, .6);
      g.fillStyle = color;
      g.beginPath(); g.moveTo(gx, gy - gs); g.lineTo(gx + gs, gy); g.lineTo(gx, gy + gs); g.lineTo(gx - gs, gy); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath(); g.moveTo(gx, gy - gs); g.lineTo(gx + gs * .4, gy - gs * .2); g.lineTo(gx, gy); g.closePath(); g.fill();
    }
    // binnenkant
    const ig = g.createLinearGradient(0, top, 0, top + fh);
    ig.addColorStop(0, '#060a18');
    ig.addColorStop(1, '#0b1226');
    g.fillStyle = ig;
    g.fillRect(m, top, fw, fh);
    if (ART.muur) {
      // Geschilderde achterwand: ongeveer zes stenen per breedte van de textuur, wat verdonkerd zodat de stenen opvallen.
      const pat = g.createPattern(ART.muur, 'repeat');
      const k = cell * 6 / ART.muur.width;
      pat.setTransform(new DOMMatrix([k, 0, 0, k, m, top]));
      g.fillStyle = pat;
      g.fillRect(m, top, fw, fh);
      g.fillStyle = 'rgba(4, 6, 16, .45)';
      g.fillRect(m, top, fw, fh);
    }
    // gloed onderaan in de kleur van de ridder
    const bg = g.createLinearGradient(0, top + fh * .55, 0, top + fh);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, Glow.rgba(color, .22));
    g.fillStyle = bg;
    g.fillRect(m, top, fw, fh);
    // vage stenen achterwand van de toren
    if (cell >= 10 && !ART.muur) {
      g.fillStyle = 'rgba(140,160,220,.045)';
      const bh = cell * .5;
      let row = 0;
      for (let y = top; y < top + fh; y += bh, row++) {
        g.fillRect(m, Math.round(y), fw, 1);
        for (let x = m + (row % 2 ? cell / 2 : 0); x < m + fw; x += cell) g.fillRect(Math.round(x), Math.round(y), 1, bh);
      }
    }
    // raster
    if (cell >= 8) {
      g.strokeStyle = 'rgba(120,170,255,.07)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 1; x < W; x++) { g.moveTo(m + x * cell + .5, top); g.lineTo(m + x * cell + .5, top + fh); }
      for (let y = 1; y < VIS; y++) { g.moveTo(m, top + y * cell + .5); g.lineTo(m + fw, top + y * cell + .5); }
      g.stroke();
    }
    // binnenrand in de kleur van de ridder
    g.strokeStyle = Glow.rgba(color, .65);
    g.lineWidth = Math.max(1, cell * .08);
    g.strokeRect(m - g.lineWidth / 2, top - g.lineWidth / 2, fw + g.lineWidth, fh + g.lineWidth);
    w = { c, m, top, fw, fh };
    wells.set(key, w);
    if (wells.size > 80) wells.delete(wells.keys().next().value);
    return w;
  }

  // Een schacht uit een tekst van 200 tekens (0-8) op een eigen canvas. Voor het bord en de rivaal.
  function boardCanvas(target, str, cell, color, flags = 0) {
    const w = well(cell, color);
    if (target.width !== w.c.width || target.height !== w.c.height) { target.width = w.c.width; target.height = w.c.height; }
    const g = target.getContext('2d');
    g.clearRect(0, 0, target.width, target.height);
    g.drawImage(w.c, 0, 0);
    for (let i = 0; i < str.length; i++) {
      const v = str.charCodeAt(i) - 48;
      if (v > 0) g.drawImage(block(v, cell), w.m + (i % W) * cell, w.top + Math.floor(i / W) * cell);
    }
    if (flags & 8) {
      g.fillStyle = 'rgba(255,77,109,.35)';
      g.fillRect(w.m, w.top, w.fw, w.fh);
    }
    return w;
  }

  // Een losse steen (voor de wachtrij en het bijhouden), gecentreerd in een vak.
  function piece(ctx, t, cx, cy, s, alpha = 1) {
    if (!t) return;
    const cells = CELLS[t][0];
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const [x, y] of cells) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const v = TYPES.indexOf(t) + 1, img = block(v, s);
    const ox = cx - ((x1 - x0 + 1) * s) / 2, oy = cy - ((y1 - y0 + 1) * s) / 2;
    ctx.globalAlpha = alpha;
    for (const [x, y] of cells) ctx.drawImage(img, ox + (x - x0) * s, oy + (y - y0) * s);
    ctx.globalAlpha = 1;
  }

  // ---------- Achtergrond ----------
  // De ruimte met een verre burcht van neon tegen de horizon, op een eigen canvas onder het spel.
  // Alleen opnieuw tekenen als de grootte verandert; zo kost hij per frame niets.
  function background(c, w, h) {
    if (c.width === w && c.height === h && c.done === artVer + 1) return;
    c.width = w;
    c.height = h;
    c.done = artVer + 1;
    if (ART.achtergrond) {
      // Geschilderde nachtlucht met toren en stad: zo hoog als het scherm, gespiegeld naast elkaar herhaald.
      const g = c.getContext('2d'), img = ART.achtergrond;
      const ih = Math.max(h, w * img.height / img.width * (w < h ? 1 : 0)), iw = ih * img.width / img.height;
      const x0 = w / 2 - iw / 2 - Math.ceil((w / 2 - iw / 2) / iw) * iw;
      for (let x = x0, i = 0; x < w; x += iw, i++) {
        const flip = Math.abs(Math.round((x - (w / 2 - iw / 2)) / iw)) % 2 === 1;
        g.save();
        if (flip) { g.translate(x + iw, 0); g.scale(-1, 1); g.drawImage(img, 0, (h - ih) / 2, iw, ih); }
        else g.drawImage(img, x, (h - ih) / 2, iw, ih);
        g.restore();
      }
      g.fillStyle = 'rgba(3, 4, 12, .25)';
      g.fillRect(0, 0, w, h);
      Glow.vignette(g, w, h, .6);
      return;
    }
    {
      const g = c.getContext('2d');
      Glow.space(g, w, h, 0, 0);
      const base = h * .97;
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      // maan en bergen
      Glow.glow(g, w * .82, h * .2, h * .2, '#ffe2b0', .35);
      g.fillStyle = '#f4e6c8';
      g.beginPath(); g.arc(w * .82, h * .2, h * .045, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath(); g.arc(w * .82 + h * .012, h * .2 - h * .008, h * .012, 0, 7); g.arc(w * .82 - h * .015, h * .2 + h * .012, h * .008, 0, 7); g.fill();
      g.fillStyle = '#121633';
      g.beginPath(); g.moveTo(0, base);
      for (let x = 0; x <= w + 40; x += w * .06) g.lineTo(x, base - h * (.18 + rnd() * .16));
      g.lineTo(w, base); g.closePath(); g.fill();
      // twee lagen torens, de achterste flauwer; sommige met een spits dak en een vaandel
      for (const [k, col, a] of [[.55, '#1a1f3d', .9], [.35, '#0d1124', 1]]) {
        g.globalAlpha = a;
        g.fillStyle = col;
        let x = -20;
        while (x < w) {
          const tw = w * (.03 + rnd() * .05), th = h * k * (.25 + rnd() * .6);
          g.fillRect(x, base - th, tw, th + h);
          if (rnd() < .45) {
            // spits dak met een vlaggetje
            g.beginPath(); g.moveTo(x - tw * .1, base - th); g.lineTo(x + tw / 2, base - th - tw * 1.2); g.lineTo(x + tw * 1.1, base - th); g.closePath(); g.fill();
            const pole = Math.min(tw * .5, h * .03), fw = Math.min(tw * .3, h * .018), ptop = base - th - tw * 1.2 - pole;
            g.fillStyle = '#4a5068';
            g.fillRect(x + tw / 2 - .75, ptop, 1.5, pole);
            g.fillStyle = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#c77dff'][Math.floor(rnd() * 4)];
            g.globalAlpha = a * .75;
            g.beginPath(); g.moveTo(x + tw / 2 + .75, ptop); g.lineTo(x + tw / 2 + .75 + fw, ptop + fw * .3); g.lineTo(x + tw / 2 + .75, ptop + fw * .6); g.closePath(); g.fill();
            g.globalAlpha = a;
            g.fillStyle = col;
          } else {
            const mw = tw / 5;
            for (let i = 0; i < 5; i += 2) g.fillRect(x + i * mw, base - th - mw * .8, mw, mw * .8);
          }
          // vensters van neon
          if (k < .5) {
            for (let i = 0; i < 3; i++) {
              if (rnd() < .5) continue;
              const wx = x + tw * (.25 + rnd() * .5), wy = base - th * (.3 + rnd() * .55);
              Glow.glow(g, wx, wy, tw * .5, ['#4cc9ff', '#ff6bd6', '#ffc94a'][i], .5);
              g.fillStyle = '#bfe8ff';
              g.fillRect(wx - 1.5, wy - 3, 3, 6);
              g.fillStyle = col;
              g.fillRect(wx - .5, wy - 3, 1, 6);
              g.fillRect(wx - 1.5, wy - .5, 3, 1);
            }
          }
          // bruggetje naar de volgende toren
          if (k < .5 && rnd() < .3) g.fillRect(x + tw, base - th * .55, w * .03, Math.max(2, h * .006));
          x += tw + w * (.005 + rnd() * .03);
        }
      }
      // voorgrond: een burchtmuur met kantelen en fakkels
      g.globalAlpha = 1;
      const wy = base - h * .05;
      g.fillStyle = '#080a18';
      g.fillRect(0, wy, w, h - wy);
      const mw = Math.max(8, w * .012);
      for (let x = 0; x < w; x += mw * 2) g.fillRect(x, wy - mw * .9, mw, mw * .9);
      g.fillStyle = 'rgba(76,201,255,.35)';
      g.fillRect(0, wy, w, 1);
      for (let x = w * .06; x < w; x += w * .14) {
        Glow.glow(g, x, wy + h * .015, h * .05, '#ff8a2a', .5);
        Glow.glow(g, x, wy + h * .012, h * .012, '#fff2b0', .9);
        g.fillStyle = '#3a2412';
        g.fillRect(x - 1.5, wy + h * .015, 3, h * .02);
      }
      g.globalAlpha = 1;
      const hz = g.createLinearGradient(0, base - h * .25, 0, h);
      hz.addColorStop(0, 'rgba(76,201,255,0)');
      hz.addColorStop(1, 'rgba(76,201,255,.12)');
      g.fillStyle = hz;
      g.fillRect(0, base - h * .25, w, h);
      Glow.vignette(g, w, h, .6);
    }
  }

  // ---------- Vonken ----------
  function Sparks() {
    const list = [];
    return {
      list,
      add(x, y, color, n = 8, speed = 220, size = 3, life = .7) {
        for (let i = 0; i < n && list.length < 500; i++) {
          const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7);
          list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .3, life: life * (.6 + Math.random() * .4), max: life, color, size: size * (.6 + Math.random() * .8) });
        }
      },
      update(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.life -= dt;
          if (p.life <= 0) { list[i] = list[list.length - 1]; list.pop(); continue; }
          p.vy += 600 * dt;
          p.vx *= 1 - dt * 1.5;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      },
      draw(ctx) {
        if (!list.length) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of list) {
          ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      },
    };
  }

  // Een aanval die door de lucht vliegt: een lichtbol met een staart en aan het eind een bliksem.
  function bolt(ctx, x0, y0, x1, y1, k, color, n) {
    const e = 1 - (1 - k) * (1 - k);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - Math.abs(x1 - x0) * .25 - 40;
    const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    const r = 6 + Math.min(10, n * 1.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 6; i >= 0; i--) {
      const t = Math.max(0, e - i * .035);
      Glow.glow(ctx, q(x0, mx, x1, t), q(y0, my, y1, t), r * (1.6 - i * .15), color, .7 - i * .08);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(q(x0, mx, x1, e), q(y0, my, y1, e), r * .4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { block, ghost, well, boardCanvas, piece, background, Sparks, bolt, shade, rr, canvas };
})();
