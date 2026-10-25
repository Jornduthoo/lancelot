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
    // kantelen
    const merl = Math.max(3, cell * .9);
    const mg = g.createLinearGradient(0, 0, 0, top);
    mg.addColorStop(0, '#5d6680');
    mg.addColorStop(1, '#2a3042');
    g.fillStyle = mg;
    for (let x = 0; x < c.width; x += merl * 2) g.fillRect(x, 0, Math.min(merl, c.width - x), top);
    // rand
    const fg = g.createLinearGradient(0, 0, c.width, 0);
    fg.addColorStop(0, '#20263a');
    fg.addColorStop(.5, '#3b4460');
    fg.addColorStop(1, '#20263a');
    g.fillStyle = fg;
    g.fillRect(0, top * .55, c.width, c.height - top * .55);
    g.fillStyle = 'rgba(255,201,74,.75)';
    g.fillRect(0, top * .55, c.width, Math.max(1, cell * .06));
    // binnenkant
    const ig = g.createLinearGradient(0, top, 0, top + fh);
    ig.addColorStop(0, '#060a18');
    ig.addColorStop(1, '#0b1226');
    g.fillStyle = ig;
    g.fillRect(m, top, fw, fh);
    // gloed onderaan in de kleur van de ridder
    const bg = g.createLinearGradient(0, top + fh * .55, 0, top + fh);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, Glow.rgba(color, .22));
    g.fillStyle = bg;
    g.fillRect(m, top, fw, fh);
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
    if (c.width === w && c.height === h && c.done) return;
    c.width = w;
    c.height = h;
    c.done = true;
    {
      const g = c.getContext('2d');
      Glow.space(g, w, h, 0, 0);
      const base = h * .97;
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      // twee lagen torens, de achterste flauwer
      for (const [k, col, a] of [[.55, '#1a1f3d', .9], [.35, '#0d1124', 1]]) {
        g.globalAlpha = a;
        g.fillStyle = col;
        let x = -20;
        while (x < w) {
          const tw = w * (.03 + rnd() * .05), th = h * k * (.25 + rnd() * .6);
          g.fillRect(x, base - th, tw, th + h);
          // kantelen
          const mw = tw / 5;
          for (let i = 0; i < 5; i += 2) g.fillRect(x + i * mw, base - th - mw * .8, mw, mw * .8);
          // vensters van neon
          if (k < .5) {
            for (let i = 0; i < 3; i++) {
              if (rnd() < .5) continue;
              const wx = x + tw * (.25 + rnd() * .5), wy = base - th * (.3 + rnd() * .55);
              Glow.glow(g, wx, wy, tw * .5, ['#4cc9ff', '#ff6bd6', '#ffc94a'][i], .5);
              g.fillStyle = '#bfe8ff';
              g.fillRect(wx - 1.5, wy - 3, 3, 6);
              g.fillStyle = col;
            }
          }
          x += tw + w * (.005 + rnd() * .03);
        }
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
