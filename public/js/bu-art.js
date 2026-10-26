// De tekeningen van Mijn burcht en het Klaseiland: vloertegels, bouwstukken en zwevende eilanden, in isometrie.
// Elk stuk wordt één keer getekend (per grootte en kleur) en daarna als plaatje hergebruikt.
// Coördinaten: vakje (x, y) heeft zijn midden op ((x - y) * T/2, (x + y) * T/4). T = breedte van een tegel in pixels.
const BuArt = (() => {
  const cache = new Map();
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  // ---------- Kleuren ----------
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // f < 0: donkerder, f > 0: lichter.
  function shade(hex, f) {
    const [r, g, b] = rgb(hex);
    const m = v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  const hash = (x, y, k = 0) => {
    let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Een punt in tegel-eenheden (u, v van -0.5 tot 0.5 binnen een tegel) naar ontwerp-pixels (een tegel is 64 breed).
  const P = (u, v, h = 0) => [(u - v) * 32, (u + v) * 16 - h];

  function poly(g, pts, fill) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
  }

  // Een blok op de grond: voetafdruk u0..u1, v0..v1, van hoogte z0 tot z1. Licht komt van linksboven.
  function box(g, u0, u1, v0, v1, z0, z1, col, opts = {}) {
    const left = [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)];
    const right = [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)];
    const top = [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)];
    poly(g, left, opts.left || shade(col, -0.18));
    if (opts.stenen) stenen(g, left, 'l', z1 - z0);
    poly(g, right, opts.right || shade(col, -0.42));
    if (opts.stenen) stenen(g, right, 'r', z1 - z0);
    poly(g, top, opts.top || shade(col, 0.08));
    // Muren krijgen een neonstrook langs beide zijkanten.
    if (opts.stenen && z1 - z0 > 8) {
      const z = z0 + (z1 - z0) * 0.62;
      for (const [a, b] of [[P(u0, v1, z), P(u1, v1, z)], [P(u1, v1, z), P(u1, v0, z)]]) neonlijn(g, a, b, 1);
    }
    // Een dun licht randje bovenaan maakt het blok scherp.
    g.strokeStyle = 'rgba(150,225,255,.3)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(...top[3]);
    g.lineTo(...top[2]);
    g.lineTo(...top[1]);
    g.stroke();
    return { left, right, top };
  }

  // Een gloeiende neonlijn: brede zachte gloed en een felle kern (geen shadowBlur: gebakken is dat toch goedkoop genoeg).
  function neonlijn(g, a, b, dikte = 1, kleur = '76,201,255') {
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = `rgba(${kleur},.28)`;
    g.lineWidth = 3.2 * dikte;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
    g.strokeStyle = 'rgba(200,245,255,.95)';
    g.lineWidth = 0.9 * dikte;
    g.stroke();
    g.restore();
  }

  // Een neonband rond een ronde toren (alleen de voorkant is zichtbaar).
  function neonband(g, r, z, dikte = 1, kleur = '76,201,255') {
    g.save();
    g.strokeStyle = `rgba(${kleur},.3)`;
    g.lineWidth = 3.2 * dikte;
    g.beginPath();
    g.ellipse(0, -z, r, r / 2, 0, 0.05, Math.PI - 0.05);
    g.stroke();
    g.strokeStyle = 'rgba(200,245,255,.95)';
    g.lineWidth = 0.9 * dikte;
    g.stroke();
    g.restore();
  }

  // Metselwerk op een zijvlak: rijen stenen die de schuine lijn van het vlak volgen.
  function stenen(g, face, side, h) {
    g.save();
    poly(g, face);
    g.clip();
    const [x0, y0] = face[0];
    const [x1, y1] = face[1];
    const dy = (y1 - y0) / Math.max(1, x1 - x0);
    g.strokeStyle = 'rgba(20,24,34,.35)';
    g.lineWidth = 0.7;
    const rows = Math.max(2, Math.round(h / 5));
    for (let r = 1; r < rows; r++) {
      const off = (h * r) / rows;
      g.beginPath();
      g.moveTo(x0, y0 - off);
      g.lineTo(x1, y1 - off);
      g.stroke();
      // voegen, om de rij verspringend
      const n = Math.max(1, Math.round(Math.abs(x1 - x0) / 7));
      for (let i = 0; i < n; i++) {
        const t = (i + (r % 2 ? 0.5 : 0)) / n;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t - off;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + h / rows);
        g.stroke();
      }
    }
    // wat vlekjes voor een ruwe steen
    g.fillStyle = side === 'l' ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';
    for (let i = 0; i < 6; i++) {
      const t = (i * 0.37 + 0.13) % 1;
      g.fillRect(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - ((i * 0.61) % 1) * h, 2.5, 1.5);
    }
    g.restore();
  }

  // Kantelen bovenop een muurstuk, langs de vier randen van de bovenkant.
  function kantelen(g, u0, u1, v0, v1, z, col, h = 4) {
    const s = 0.085;
    const bits = [];
    for (let u = u0; u < u1 - 0.01; u += s * 2) bits.push([u, Math.min(u + s, u1), v0, v0 + s]);
    for (let u = u0; u < u1 - 0.01; u += s * 2) bits.push([u, Math.min(u + s, u1), v1 - s, v1]);
    for (let v = v0 + s * 2; v < v1 - s - 0.01; v += s * 2) bits.push([u0, u0 + s, v, Math.min(v + s, v1)]);
    for (let v = v0 + s * 2; v < v1 - s - 0.01; v += s * 2) bits.push([u1 - s, u1, v, Math.min(v + s, v1)]);
    bits.sort((a, b) => a[0] + a[2] - (b[0] + b[2]));
    for (const [a, b, c, d] of bits) box(g, a, b, c, d, z, z + h, col);
  }

  // Een ronde toren: zijkant met verloop, bovenkant als ellips.
  function cyl(g, r, z0, z1, col, opts = {}) {
    const ry = r / 2;
    const grad = g.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, shade(col, -0.05));
    grad.addColorStop(0.35, shade(col, 0.1));
    grad.addColorStop(1, shade(col, -0.5));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-r, -z0);
    g.ellipse(0, -z0, r, ry, 0, Math.PI, 0, true);
    g.lineTo(r, -z1);
    g.ellipse(0, -z1, r, ry, 0, 0, Math.PI, true);
    g.closePath();
    g.fill();
    if (opts.stenen) {
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(20,24,34,.32)';
      g.lineWidth = 0.7;
      const rows = Math.round((z1 - z0) / 5);
      for (let i = 1; i < rows; i++) {
        const z = z0 + ((z1 - z0) * i) / rows;
        g.beginPath();
        g.ellipse(0, -z, r, ry, 0, 0, Math.PI);
        g.stroke();
        for (let k = 0; k < 5; k++) {
          const a = ((k + (i % 2) * 0.5) / 5) * Math.PI;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * ry - z;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y - (z1 - z0) / rows);
          g.stroke();
        }
      }
      g.restore();
      if (z1 - z0 > 20) {
        neonband(g, r, z0 + (z1 - z0) * 0.32);
        neonband(g, r, z0 + (z1 - z0) * 0.78);
      }
    }
    g.fillStyle = opts.top || shade(col, 0.15);
    g.beginPath();
    g.ellipse(0, -z1, r, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Een kegeldak. Licht van links, met dakpannen.
  function kegel(g, r, z0, h, col) {
    const ry = r / 2;
    const grad = g.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, shade(col, 0.12));
    grad.addColorStop(0.45, col);
    grad.addColorStop(1, shade(col, -0.55));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-r, -z0);
    g.ellipse(0, -z0, r, ry, 0, Math.PI, 0, true);
    g.lineTo(0, -z0 - h);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(0,0,0,.22)';
    g.lineWidth = 0.7;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      g.beginPath();
      g.ellipse(0, -z0 - h * t, r * (1 - t), ry * (1 - t), 0, 0, Math.PI);
      g.stroke();
    }
    g.restore();
    // rand
    g.fillStyle = shade(col, -0.35);
    g.beginPath();
    g.ellipse(0, -z0, r, ry, 0, 0, Math.PI);
    g.ellipse(0, -z0 + 1.6, r, ry, 0, Math.PI, 0, true);
    g.fill();
  }

  // Een piramidedak op een vierkante voet (halve maat a in tegel-eenheden).
  function piramide(g, a, z0, h, col) {
    const top = [0, P(0, 0, z0 + h)[1]];
    const L = P(-a, a, z0);
    const B = P(a, a, z0);
    const R = P(a, -a, z0);
    poly(g, [L, B, top], shade(col, -0.05));
    poly(g, [B, R, top], shade(col, -0.45));
    g.strokeStyle = 'rgba(0,0,0,.2)';
    g.lineWidth = 0.7;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const m = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      g.beginPath();
      g.moveTo(...m(L, top));
      g.lineTo(...m(B, top));
      g.lineTo(...m(R, top));
      g.stroke();
    }
  }

  // Een venster dat gloeit.
  function venster(g, x, y, w, h, kleur = '#ffcf6b') {
    g.fillStyle = '#1a1208';
    g.beginPath();
    g.moveTo(x - w / 2 - 0.6, y + h / 2 + 0.6);
    g.lineTo(x - w / 2 - 0.6, y - h / 2 + w / 2);
    g.arc(x, y - h / 2 + w / 2, w / 2 + 0.6, Math.PI, 0);
    g.lineTo(x + w / 2 + 0.6, y + h / 2 + 0.6);
    g.fill();
    g.fillStyle = kleur;
    g.beginPath();
    g.moveTo(x - w / 2, y + h / 2);
    g.lineTo(x - w / 2, y - h / 2 + w / 2);
    g.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w / 2, y + h / 2);
    g.fill();
  }

  function vlag(g, x, y, h, col) {
    g.strokeStyle = '#3a3f4a';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - h);
    g.stroke();
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, y - h);
    g.quadraticCurveTo(x + 6, y - h - 2, x + 12, y - h + 2);
    g.quadraticCurveTo(x + 6, y - h + 4, x, y - h + 7);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.beginPath();
    g.moveTo(x, y - h);
    g.quadraticCurveTo(x + 6, y - h - 2, x + 12, y - h + 2);
    g.lineTo(x + 6, y - h + 1);
    g.fill();
  }

  function schaduw(g, rx, ry = rx / 2, a = 0.28) {
    g.fillStyle = `rgba(10,14,24,${a})`;
    g.beginPath();
    g.ellipse(2, 2, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  const STEEN = '#7a8396'; // donkere ridderstaal-steen, met neon
  const DONKERSTEEN = '#4d5566';
  const HOUT = '#8a5a33';
  const GOUD = '#ffc94a';

  // ---------- De bouwstukken ----------
  // Elk stuk tekent zich rond het midden van zijn tegel (0, 0). kleur: de kleur van de burcht. n: buren voor muren.
  const STUK = {
    boom(g, k, _n, r) {
      schaduw(g, 14);
      cyl(g, 2.6, 0, 12, '#6b4428');
      const groen = ['#3e9b4a', '#4aae55', '#378a43'][Math.floor(r() * 3)];
      const bol = (x, y, rad, f) => {
        const gr = g.createRadialGradient(x - rad * 0.4, y - rad * 0.5, rad * 0.2, x, y, rad);
        gr.addColorStop(0, shade(groen, 0.3 + f));
        gr.addColorStop(0.7, groen);
        gr.addColorStop(1, shade(groen, -0.35));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
      };
      bol(-7, -18, 9, -0.1);
      bol(7, -17, 9, -0.15);
      bol(0, -27, 11, 0);
      bol(-1, -16, 9, 0.05);
      g.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 6; i++) g.fillRect(-8 + r() * 14, -32 + r() * 18, 1.6, 1.6);
    },
    den(g, k, _n, r) {
      schaduw(g, 10);
      cyl(g, 2.2, 0, 8, '#5a3a22');
      const groen = r() < 0.5 ? '#2c7a4b' : '#2f8a57';
      for (let i = 0; i < 3; i++) {
        const y = -8 - i * 9;
        const w = 13 - i * 3;
        g.fillStyle = shade(groen, -0.05);
        g.beginPath();
        g.moveTo(-w, y);
        g.lineTo(0, y - 16);
        g.lineTo(0, y + 2);
        g.closePath();
        g.fill();
        g.fillStyle = shade(groen, -0.4);
        g.beginPath();
        g.moveTo(w, y);
        g.lineTo(0, y - 16);
        g.lineTo(0, y + 2);
        g.closePath();
        g.fill();
      }
    },
    fakkel(g) {
      schaduw(g, 5);
      box(g, -0.06, 0.06, -0.06, 0.06, 0, 4, DONKERSTEEN);
      g.fillStyle = '#4b3a2a';
      g.fillRect(-1.2, -24, 2.4, 20);
      g.fillStyle = '#3a3f4a';
      g.beginPath();
      g.moveTo(-4, -24);
      g.lineTo(4, -24);
      g.lineTo(2, -21);
      g.lineTo(-2, -21);
      g.fill();
      const f = g.createRadialGradient(0, -28, 0.5, 0, -27, 6);
      f.addColorStop(0, '#eaffff');
      f.addColorStop(0.4, '#4cc9ff');
      f.addColorStop(1, 'rgba(60,120,255,0)');
      g.fillStyle = f;
      g.beginPath();
      g.moveTo(-4, -24);
      g.quadraticCurveTo(-3, -31, 0, -35);
      g.quadraticCurveTo(3, -31, 4, -24);
      g.fill();
    },
    muur(g, k, n) {
      const t = 0.15;
      const H = 17;
      const arm = (dir, front) => {
        if (dir === 'x+' && n.xp) box(g, 0, 0.5, -t, t, 0, H, STEEN, { stenen: true });
        if (dir === 'y+' && n.yp) box(g, -t, t, 0, 0.5, 0, H, STEEN, { stenen: true });
        if (dir === 'x-' && n.xm) box(g, -0.5, 0, -t, t, 0, H, STEEN, { stenen: true });
        if (dir === 'y-' && n.ym) box(g, -t, t, -0.5, 0, 0, H, STEEN, { stenen: true });
        return front;
      };
      const los = !n.xp && !n.xm && !n.yp && !n.ym;
      schaduw(g, 16, 8, 0.2);
      if (los) {
        box(g, -0.42, 0.42, -t, t, 0, H, STEEN, { stenen: true });
        kantelen(g, -0.42, 0.42, -t, t, H, STEEN);
        return;
      }
      arm('x-');
      arm('y-');
      if (n.xm) kantelen(g, -0.5, 0, -t, t, H, STEEN);
      if (n.ym) kantelen(g, -t, t, -0.5, 0, H, STEEN);
      box(g, -t - 0.03, t + 0.03, -t - 0.03, t + 0.03, 0, H + 3, STEEN, { stenen: true });
      kantelen(g, -t - 0.03, t + 0.03, -t - 0.03, t + 0.03, H + 3, STEEN);
      arm('x+');
      arm('y+');
      if (n.xp) kantelen(g, 0.03, 0.5, -t, t, H, STEEN);
      if (n.yp) kantelen(g, -t, t, 0.03, 0.5, H, STEEN);
    },
    banier(g, k) {
      schaduw(g, 7);
      box(g, -0.09, 0.09, -0.09, 0.09, 0, 5, STEEN);
      g.fillStyle = '#4a4f5c';
      g.fillRect(-1.2, -50, 2.4, 46);
      g.fillStyle = GOUD;
      g.beginPath();
      g.arc(0, -51, 2.2, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-9, -46, 18, 2);
      const gr = g.createLinearGradient(-8, 0, 8, 0);
      gr.addColorStop(0, shade(k, 0.15));
      gr.addColorStop(1, shade(k, -0.35));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(-8, -44);
      g.lineTo(8, -44);
      g.quadraticCurveTo(9, -30, 8, -18);
      g.lineTo(0, -22);
      g.lineTo(-8, -18);
      g.quadraticCurveTo(-7, -30, -8, -44);
      g.fill();
      g.strokeStyle = GOUD;
      g.lineWidth = 0.9;
      g.stroke();
      // embleem: een gouden kroontje
      g.fillStyle = GOUD;
      g.beginPath();
      g.moveTo(-4, -30);
      g.lineTo(-4, -36);
      g.lineTo(-2, -33);
      g.lineTo(0, -37);
      g.lineTo(2, -33);
      g.lineTo(4, -36);
      g.lineTo(4, -30);
      g.closePath();
      g.fill();
    },
    huisje(g, k) {
      schaduw(g, 22, 11);
      const a = 0.3;
      const f = box(g, -a, a, -a, a, 0, 16, '#e8dcc0', { left: '#e6d8b8', right: '#b9a986' });
      // vakwerk
      g.strokeStyle = '#6b4428';
      g.lineWidth = 1.3;
      for (const face of [f.left, f.right]) {
        g.beginPath();
        g.moveTo(...face[0]);
        g.lineTo(...face[1]);
        g.lineTo(...face[2]);
        g.lineTo(...face[3]);
        g.closePath();
        const mx = (face[0][0] + face[1][0]) / 2;
        const my = (face[0][1] + face[1][1]) / 2;
        g.moveTo(mx, my);
        g.lineTo(mx, my - 16);
        g.moveTo(face[0][0], face[0][1] - 8);
        g.lineTo(face[1][0], face[1][1] - 8);
        g.stroke();
      }
      // deur en venster
      g.fillStyle = '#5a3a22';
      const d = P(0.08, a, 0);
      g.fillRect(d[0] - 3, d[1] - 9, 5, 9);
      venster(g, P(-0.17, a)[0], P(-0.17, a)[1] - 9, 3.4, 4.5);
      venster(g, P(a, -0.05)[0], P(a, -0.05)[1] - 9, 3.4, 4.5);
      piramide(g, a + 0.05, 16, 17, k);
      // schoorsteen
      box(g, 0.1, 0.2, -0.22, -0.12, 22, 33, '#8b7d70');
    },
    toren(g, k) {
      schaduw(g, 18, 9);
      cyl(g, 15, 0, 40, STEEN, { stenen: true });
      // kantelen rond de bovenkant
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * 13.5;
        const y = Math.sin(a) * 6.5;
        if (Math.sin(a) < -0.2) continue;
        g.fillStyle = shade(STEEN, Math.cos(a) > 0.3 ? -0.4 : -0.05);
        g.fillRect(x - 2.2, y - 44, 4.4, 5);
      }
      venster(g, -5, -22, 3, 6, '#7ee0ff');
      venster(g, 4, -30, 3, 6, '#7ee0ff');
      kegel(g, 17, 41, 28, k);
      vlag(g, 0, -69, 10, k);
    },
    poort(g, k, n) {
      schaduw(g, 22, 11, 0.22);
      // langs de x-as tenzij de muren in de y-richting lopen
      const langsY = (n.yp || n.ym) && !(n.xp || n.xm);
      const H = 22;
      const blok = (u0, u1, v0, v1, z0, z1) => (langsY ? box(g, v0, v1, u0, u1, z0, z1, STEEN, { stenen: true }) : box(g, u0, u1, v0, v1, z0, z1, STEEN, { stenen: true }));
      const kant = (u0, u1, v0, v1, z) => (langsY ? kantelen(g, v0, v1, u0, u1, z, STEEN) : kantelen(g, u0, u1, v0, v1, z, STEEN));
      blok(-0.5, -0.24, -0.2, 0.2, 0, H + 8);
      kant(-0.5, -0.24, -0.2, 0.2, H + 8);
      blok(-0.24, 0.24, -0.16, 0.16, 0, H);
      // de boog met valhek
      const face = langsY ? null : [P(-0.24, 0.16), P(0.24, 0.16)];
      if (face) {
        const [a, b] = face;
        g.fillStyle = '#141019';
        g.beginPath();
        g.moveTo(a[0] + 3, a[1] + 1.5);
        g.lineTo(a[0] + 3, a[1] - 9);
        g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 22, b[0] - 3, b[1] - 9);
        g.lineTo(b[0] - 3, b[1] - 1.5);
        g.fill();
        g.strokeStyle = '#7a6a50';
        g.lineWidth = 0.9;
        for (let i = 1; i < 5; i++) {
          const x = a[0] + 3 + ((b[0] - a[0] - 6) * i) / 5;
          g.beginPath();
          g.moveTo(x, a[1] + (b[1] - a[1]) * (i / 5) - 15);
          g.lineTo(x, a[1] + (b[1] - a[1]) * (i / 5));
          g.stroke();
        }
      } else {
        const a = P(0.16, -0.24);
        const b = P(0.16, 0.24);
        g.fillStyle = '#141019';
        g.beginPath();
        g.moveTo(a[0] - 2, a[1] + 1);
        g.lineTo(a[0] - 2, a[1] - 9);
        g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 22, b[0] + 2, b[1] - 9);
        g.lineTo(b[0] + 2, b[1] - 1);
        g.fill();
      }
      kant(-0.24, 0.24, -0.16, 0.16, H);
      blok(0.24, 0.5, -0.2, 0.2, 0, H + 8);
      kant(0.24, 0.5, -0.2, 0.2, H + 8);
      const m = langsY ? P(0.2, -0.37, H + 8) : P(-0.37, 0.2, H + 8);
      vlag(g, m[0], m[1], 12, k);
      const m2 = langsY ? P(-0.2, 0.37, H + 8) : P(0.37, -0.2, H + 8);
      vlag(g, m2[0], m2[1], 12, k);
    },
    smidse(g, k) {
      schaduw(g, 24, 12);
      const a = 0.32;
      box(g, -a, a, -a, a, 0, 14, '#8d8478', { stenen: true });
      // open voorkant met gloed
      const L = P(-0.18, a);
      const R = P(0.18, a);
      g.fillStyle = '#1b0d06';
      g.beginPath();
      g.moveTo(L[0], L[1]);
      g.lineTo(L[0], L[1] - 10);
      g.lineTo(R[0], R[1] - 10);
      g.lineTo(R[0], R[1]);
      g.fill();
      const gl = g.createRadialGradient((L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 3, 0, (L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 3, 9);
      gl.addColorStop(0, 'rgba(255,190,80,.95)');
      gl.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = gl;
      g.fillRect(L[0], L[1] - 12, R[0] - L[0], 14);
      piramide(g, a + 0.04, 14, 12, shade(k, -0.15));
      // schoorsteen
      box(g, -0.24, -0.1, -0.24, -0.1, 14, 34, '#6e655c', { stenen: true });
      // aambeeld voor de deur
      g.fillStyle = '#3a3f4a';
      const an = P(0.3, 0.42);
      g.fillRect(an[0] - 4, an[1] - 5, 8, 2.5);
      g.fillRect(an[0] - 1.5, an[1] - 3, 3, 3);
    },
    molen(g, k) {
      schaduw(g, 16, 8);
      // een taps toelopende toren
      g.fillStyle = '#ece6d6';
      const gr = g.createLinearGradient(-12, 0, 12, 0);
      gr.addColorStop(0, '#f2ecdf');
      gr.addColorStop(1, '#a9a08c');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(-12, 0);
      g.ellipse(0, 0, 12, 6, 0, Math.PI, 0, true);
      g.lineTo(8, -34);
      g.lineTo(-8, -34);
      g.closePath();
      g.fill();
      venster(g, -3, -18, 3, 5);
      g.fillStyle = '#5a3a22';
      g.fillRect(1, -7, 4, 7);
      kegel(g, 10, 34, 13, k);
      // wieken
      g.save();
      g.translate(4, -32);
      g.rotate(0.35);
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 2);
        g.fillStyle = '#5a3a22';
        g.fillRect(-0.9, 0, 1.8, 22);
        g.fillStyle = 'rgba(245,240,225,.92)';
        g.fillRect(1, 5, 5, 16);
        g.strokeStyle = 'rgba(90,58,34,.6)';
        g.lineWidth = 0.5;
        for (let j = 0; j < 4; j++) {
          g.beginPath();
          g.moveTo(1, 6 + j * 4);
          g.lineTo(6, 6 + j * 4);
          g.stroke();
        }
      }
      g.fillStyle = '#3a2a1a';
      g.beginPath();
      g.arc(0, 0, 2, 0, Math.PI * 2);
      g.fill();
      g.restore();
    },
    wachttoren(g, k) {
      schaduw(g, 16, 8);
      const a = 0.2;
      box(g, -a, a, -a, a, 0, 54, STEEN, { stenen: true });
      box(g, -a - 0.05, a + 0.05, -a - 0.05, a + 0.05, 54, 58, DONKERSTEEN);
      kantelen(g, -a - 0.05, a + 0.05, -a - 0.05, a + 0.05, 58, STEEN, 5);
      venster(g, P(-0.05, a)[0], P(-0.05, a)[1] - 40, 3, 6, '#7ee0ff');
      venster(g, P(a, 0)[0], P(a, 0)[1] - 26, 3, 6, '#7ee0ff');
      piramide(g, 0.16, 63, 20, k);
      vlag(g, 0, -83, 10, k);
    },
    fontein(g) {
      schaduw(g, 22, 11, 0.2);
      cyl(g, 21, 0, 6, '#c3c9d4');
      const w = g.createLinearGradient(-18, -6, 18, -6);
      w.addColorStop(0, '#5fd0ff');
      w.addColorStop(1, '#2b6fd6');
      g.fillStyle = w;
      g.beginPath();
      g.ellipse(0, -6, 17.5, 8.5, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.4)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(0, -6, 12, 5.5, 0, 0, Math.PI * 2);
      g.stroke();
      cyl(g, 3, 6, 18, '#c3c9d4');
      cyl(g, 8, 18, 20, '#b4bbc8');
      cyl(g, 2, 20, 26, '#c3c9d4');
      g.strokeStyle = 'rgba(160,230,255,.8)';
      g.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, -27);
        g.quadraticCurveTo(s * 9, -34, s * 12, -9);
        g.stroke();
      }
    },
    ridderbeeld(g) {
      schaduw(g, 14, 7);
      box(g, -0.2, 0.2, -0.2, 0.2, 0, 10, '#9aa3b2', { stenen: true });
      const st = g.createLinearGradient(-8, 0, 8, 0);
      st.addColorStop(0, '#dde3ec');
      st.addColorStop(1, '#7d8696');
      g.fillStyle = st;
      // benen, romp, schild, hoofd
      g.fillRect(-4.5, -24, 3.5, 12);
      g.fillRect(1, -24, 3.5, 12);
      g.beginPath();
      g.moveTo(-6, -24);
      g.lineTo(6, -24);
      g.lineTo(7, -38);
      g.lineTo(-7, -38);
      g.fill();
      g.beginPath();
      g.arc(0, -42, 4.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#8c95a5';
      g.beginPath();
      g.moveTo(-11, -36);
      g.lineTo(-3, -36);
      g.lineTo(-3, -28);
      g.lineTo(-7, -23);
      g.lineTo(-11, -28);
      g.fill();
      // geheven zwaard
      g.fillStyle = '#e9eef5';
      g.save();
      g.translate(6, -36);
      g.rotate(-0.35);
      g.fillRect(-1, -22, 2.2, 22);
      g.fillStyle = '#9aa3b2';
      g.fillRect(-3.5, -1, 7, 2);
      g.restore();
    },
    donjon(g, k) {
      schaduw(g, 28, 14);
      const a = 0.36;
      box(g, -a, a, -a, a, 0, 44, STEEN, { stenen: true });
      kantelen(g, -a, a, -a, a, 44, STEEN, 5);
      for (const [u, v] of [[-0.18, a], [0.14, a]]) {
        const p = P(u, v);
        venster(g, p[0], p[1] - 30, 3.4, 7);
        venster(g, p[0], p[1] - 14, 3.4, 7);
      }
      for (const v of [-0.15, 0.17]) {
        const p = P(a, v);
        venster(g, p[0], p[1] - 22, 3.4, 7, '#7ee0ff');
      }
      // de grote deur
      const d = P(0, a);
      g.fillStyle = '#3a2412';
      g.beginPath();
      g.moveTo(d[0] - 5, d[1]);
      g.lineTo(d[0] - 5, d[1] - 9);
      g.arc(d[0], d[1] - 9, 5, Math.PI, 0);
      g.lineTo(d[0] + 5, d[1]);
      g.fill();
      // hoektorentjes
      for (const [u, v] of [[-a, -a], [a, -a], [-a, a], [a, a]]) {
        const [x, y] = P(u, v);
        g.save();
        g.translate(x, y);
        cyl(g, 5.5, 30, 54, STEEN);
        kegel(g, 6.8, 54, 14, k);
        g.restore();
      }
      vlag(g, 0, P(0, 0, 49)[1], 14, k);
    },
    kristal(g) {
      schaduw(g, 16, 8, 0.25);
      g.fillStyle = '#4a4f5c';
      g.beginPath();
      g.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
      g.fill();
      const spits = (x, y, w, h, lean, c1, c2) => {
        g.save();
        g.translate(x, y);
        g.rotate(lean);
        const gr = g.createLinearGradient(-w, 0, w, 0);
        gr.addColorStop(0, c1);
        gr.addColorStop(1, c2);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(-w, 0);
        g.lineTo(-w, -h * 0.75);
        g.lineTo(0, -h);
        g.lineTo(w, -h * 0.75);
        g.lineTo(w, 0);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)';
        g.beginPath();
        g.moveTo(-w * 0.6, -2);
        g.lineTo(-w * 0.6, -h * 0.72);
        g.lineTo(0, -h * 0.95);
        g.lineTo(-w * 0.1, -h * 0.7);
        g.closePath();
        g.fill();
        g.restore();
      };
      spits(-8, 0, 4, 18, -0.35, '#c39bff', '#5b2bb5');
      spits(8, 1, 4, 16, 0.4, '#8ff3ff', '#1b7fb8');
      spits(0, 2, 6, 34, 0.02, '#b8fbff', '#2a7fd6');
      spits(-3, 4, 3, 12, -0.1, '#e1c8ff', '#7a3fe0');
    },
    baken(g) {
      schaduw(g, 14, 7, 0.25);
      box(g, -0.24, 0.24, -0.24, 0.24, 0, 5, '#3b4558');
      g.fillStyle = '#2a3242';
      g.beginPath();
      g.moveTo(-6, -5);
      g.lineTo(6, -5);
      g.lineTo(3, -44);
      g.lineTo(-3, -44);
      g.fill();
      const m = g.createLinearGradient(-6, 0, 6, 0);
      m.addColorStop(0, '#8fa7c7');
      m.addColorStop(1, '#2a3242');
      g.fillStyle = m;
      g.fillRect(-5, -26, 10, 3);
      g.fillRect(-4, -38, 8, 2.5);
      g.fillStyle = '#4cc9ff';
      for (let i = 0; i < 3; i++) g.fillRect(-0.8, -14 - i * 10, 1.6, 6);
      const o = g.createRadialGradient(0, -49, 0, 0, -49, 7);
      o.addColorStop(0, '#ffffff');
      o.addColorStop(0.4, '#7ee0ff');
      o.addColorStop(1, 'rgba(76,201,255,0)');
      g.fillStyle = o;
      g.beginPath();
      g.arc(0, -49, 7, 0, Math.PI * 2);
      g.fill();
    },
    drakenbeeld(g) {
      schaduw(g, 20, 10);
      box(g, -0.3, 0.3, -0.24, 0.24, 0, 9, '#8d95a3', { stenen: true });
      const brons = g.createLinearGradient(-14, -40, 14, 0);
      brons.addColorStop(0, '#7fd1b0');
      brons.addColorStop(1, '#2f6e5c');
      g.fillStyle = brons;
      // lijf
      g.beginPath();
      g.ellipse(0, -16, 10, 6, -0.2, 0, Math.PI * 2);
      g.fill();
      // nek en kop
      g.beginPath();
      g.moveTo(5, -18);
      g.quadraticCurveTo(10, -30, 7, -38);
      g.lineTo(14, -40);
      g.lineTo(12, -35);
      g.quadraticCurveTo(14, -28, 10, -17);
      g.fill();
      // vleugels
      g.fillStyle = '#4fa58a';
      g.beginPath();
      g.moveTo(-2, -20);
      g.lineTo(-16, -44);
      g.lineTo(-12, -32);
      g.lineTo(-20, -34);
      g.lineTo(-10, -22);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(2, -21);
      g.lineTo(-4, -46);
      g.lineTo(0, -36);
      g.closePath();
      g.fill();
      // staart
      g.strokeStyle = '#3f8c75';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-9, -14);
      g.quadraticCurveTo(-18, -10, -15, -4);
      g.stroke();
      g.fillStyle = '#ffcf6b';
      g.fillRect(11, -39, 1.6, 1.6);
    },
    portaal(g) {
      schaduw(g, 22, 11, 0.25);
      box(g, -0.36, 0.36, -0.14, 0.14, 0, 4, '#5a6275', { stenen: true });
      // ring van steen, met binnenin de werveling
      const cx = 0;
      const cy = -26;
      const sw = g.createRadialGradient(cx, cy, 1, cx, cy, 17);
      sw.addColorStop(0, '#ffffff');
      sw.addColorStop(0.25, '#c39bff');
      sw.addColorStop(0.6, '#5b2bb5');
      sw.addColorStop(1, '#1a0b3a');
      g.fillStyle = sw;
      g.beginPath();
      g.ellipse(cx, cy, 13, 19, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(126,224,255,.75)';
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(cx, cy, 10 - i * 3, 15 - i * 4, i * 0.6, 0.3, Math.PI * 1.5);
        g.stroke();
      }
      g.lineWidth = 5;
      g.strokeStyle = '#8b94a6';
      g.beginPath();
      g.ellipse(cx, cy, 15.5, 21.5, 0, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1.2;
      g.strokeStyle = '#4b5263';
      g.stroke();
      g.fillStyle = '#7ee0ff';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.fillRect(cx + Math.cos(a) * 15.5 - 1, cy + Math.sin(a) * 21.5 - 1, 2, 2);
      }
    },
    goudtoren(g, k) {
      schaduw(g, 20, 10);
      const goudsteen = '#e8c77a';
      cyl(g, 16, 0, 56, goudsteen, { stenen: true });
      cyl(g, 18, 56, 60, '#c9a24c');
      venster(g, -6, -30, 3.2, 7, '#ffffff');
      venster(g, 5, -42, 3.2, 7, '#ffffff');
      venster(g, -2, -16, 3.2, 7, '#ffffff');
      kegel(g, 18, 60, 34, GOUD);
      const o = g.createRadialGradient(0, -97, 0, 0, -97, 5);
      o.addColorStop(0, '#ffffff');
      o.addColorStop(0.5, k);
      o.addColorStop(1, shade(k, -0.4));
      g.fillStyle = o;
      g.beginPath();
      g.arc(0, -97, 4.2, 0, Math.PI * 2);
      g.fill();
      vlag(g, 0, -101, 9, k);
    },
    draak(g, k) {
      schaduw(g, 28, 13, 0.3);
      const lijf = g.createLinearGradient(-20, -30, 20, 0);
      lijf.addColorStop(0, shade(k, 0.25));
      lijf.addColorStop(1, shade(k, -0.45));
      // staart in een krul rond het lijf
      g.strokeStyle = shade(k, -0.25);
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-10, -6);
      g.quadraticCurveTo(-26, -4, -22, 6);
      g.quadraticCurveTo(-16, 12, -4, 8);
      g.stroke();
      g.lineCap = 'butt';
      // vleugel achteraan
      g.fillStyle = shade(k, -0.3);
      g.beginPath();
      g.moveTo(-4, -18);
      g.lineTo(-10, -48);
      g.lineTo(-2, -40);
      g.lineTo(6, -50);
      g.lineTo(8, -36);
      g.lineTo(14, -38);
      g.lineTo(8, -20);
      g.closePath();
      g.fill();
      g.fillStyle = lijf;
      g.beginPath();
      g.ellipse(0, -12, 16, 10, -0.1, 0, Math.PI * 2);
      g.fill();
      // buik
      g.fillStyle = 'rgba(255,220,150,.55)';
      g.beginPath();
      g.ellipse(4, -7, 9, 4, -0.1, 0, Math.PI);
      g.fill();
      // nek en kop
      g.fillStyle = lijf;
      g.beginPath();
      g.moveTo(8, -16);
      g.quadraticCurveTo(18, -26, 16, -36);
      g.lineTo(22, -34);
      g.quadraticCurveTo(24, -22, 15, -10);
      g.fill();
      g.beginPath();
      g.ellipse(21, -37, 7, 4.5, 0.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = shade(k, -0.5);
      g.beginPath();
      g.moveTo(17, -40);
      g.lineTo(14, -47);
      g.lineTo(20, -41);
      g.fill();
      g.fillStyle = '#fff3a8';
      g.beginPath();
      g.arc(22, -38.5, 1.3, 0, Math.PI * 2);
      g.fill();
      // stekels op de rug
      g.fillStyle = GOUD;
      for (let i = 0; i < 5; i++) {
        const x = -10 + i * 4.5;
        g.beginPath();
        g.moveTo(x, -20 + Math.abs(i - 2));
        g.lineTo(x + 2, -25 + Math.abs(i - 2));
        g.lineTo(x + 4, -20 + Math.abs(i - 2));
        g.fill();
      }
    },
    // ---------- Ridder-sci-fi: nieuwe stukken ----------
    lichtpaal(g) {
      schaduw(g, 6);
      cyl(g, 3.5, 0, 4, '#2b3242');
      g.fillStyle = '#3a4254';
      g.fillRect(-1.2, -31, 2.4, 27);
      const kern = g.createRadialGradient(0, -38, 0.5, 0, -38, 7);
      kern.addColorStop(0, '#f2ffff');
      kern.addColorStop(0.45, '#4cc9ff');
      kern.addColorStop(1, 'rgba(60,140,255,0)');
      g.fillStyle = kern;
      g.beginPath();
      g.arc(0, -38, 7, 0, Math.PI * 2);
      g.fill();
      // een zeshoekige kooi rond de lichtkern
      g.strokeStyle = '#6f7889';
      g.lineWidth = 1.3;
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(a) * 7.5;
        const y = -38 + Math.sin(a) * 7.5;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      poly(g, [[-3, -46], [3, -46], [0, -50]], '#4d5566');
    },
    zwaardsteen(g) {
      schaduw(g, 17, 8);
      poly(g, [[-17, 1], [-13, -8], [-5, -13], [6, -12], [14, -7], [18, 1], [8, 6], [-8, 6]], '#4d5566');
      poly(g, [[-13, -8], [-5, -13], [6, -12], [14, -7], [3, -5], [-6, -5]], '#6f7889');
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(-9, -2, 6, 1.2);
      g.fillRect(4, 0, 7, 1.2);
      // de kling van licht, met de punt in de steen
      const kl = g.createLinearGradient(-2, 0, 2, 0);
      kl.addColorStop(0, '#eaffff');
      kl.addColorStop(1, '#3aa8f0');
      poly(g, [[-2, -9], [2, -9], [2.4, -44], [0, -47], [-2.4, -44]], kl);
      neonlijn(g, [0, -10], [0, -44], 1.2);
      g.fillStyle = GOUD;
      g.fillRect(-8, -48, 16, 3);
      g.fillStyle = '#4a3020';
      g.fillRect(-1.4, -58, 2.8, 10);
      g.fillStyle = GOUD;
      g.beginPath();
      g.arc(0, -60, 2.4, 0, Math.PI * 2);
      g.fill();
    },
    robopaard(g, k) {
      schaduw(g, 19, 8);
      const metaal = g.createLinearGradient(-15, -30, 15, -14);
      metaal.addColorStop(0, '#c3cad6');
      metaal.addColorStop(1, '#5d6678');
      // benen, met een gloeiend knie-gewricht
      for (const [x, achter] of [[9, true], [-8, true], [12, false], [-5, false]]) {
        g.fillStyle = achter ? '#3a4254' : '#4d5566';
        g.fillRect(x - 1.6, -17, 3.2, 17);
        g.fillStyle = '#7ee0ff';
        g.fillRect(x - 1.6, -10, 3.2, 1.6);
        g.fillStyle = '#2b3242';
        g.fillRect(x - 2.2, -1.5, 4.4, 1.5);
      }
      g.fillStyle = metaal;
      g.beginPath();
      g.ellipse(2, -22, 15, 7, 0, 0, Math.PI * 2);
      g.fill();
      // nek en kop
      poly(g, [[-8, -25], [-13, -39], [-9, -41], [-3, -26]], metaal);
      poly(g, [[-11, -42], [-22, -37], [-23, -33], [-13, -35]], metaal);
      g.fillStyle = '#9aa3b4';
      poly(g, [[-11, -42], [-9, -47], [-8, -41]], '#9aa3b4');
      g.fillStyle = '#bff3ff';
      g.beginPath();
      g.arc(-17, -37.5, 1.4, 0, Math.PI * 2);
      g.fill();
      // neon manen en staart, zadel in de kleur van je burcht
      neonlijn(g, [-6, -28], [-11, -42], 1);
      neonlijn(g, [16, -23], [21, -12], 1);
      g.fillStyle = k;
      g.beginPath();
      g.ellipse(3, -29, 6, 2.6, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-6, -20);
      g.lineTo(12, -20);
      g.stroke();
    },
    holoridder(g) {
      schaduw(g, 13);
      cyl(g, 11, 0, 6, '#3a4254');
      neonband(g, 11, 4);
      // projectiekegel
      g.fillStyle = 'rgba(76,201,255,.12)';
      poly(g, [[-3, -6], [3, -6], [13, -56], [-13, -56]]);
      g.fill();
      // de ridder zelf, van licht
      g.save();
      g.globalAlpha = 0.75;
      const licht = g.createLinearGradient(0, -56, 0, -8);
      licht.addColorStop(0, 'rgba(200,250,255,.9)');
      licht.addColorStop(1, 'rgba(76,201,255,.45)');
      g.fillStyle = licht;
      g.fillRect(-5, -26, 3.6, 18);
      g.fillRect(1.4, -26, 3.6, 18);
      poly(g, [[-7, -26], [7, -26], [5, -42], [-5, -42]]);
      g.fill();
      g.beginPath();
      g.arc(0, -47, 5, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(-9, -33, 4.5, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.strokeStyle = 'rgba(220,250,255,.9)';
      g.lineWidth = 0.8;
      g.strokeRect(-5, -26, 3.6, 18);
      g.strokeRect(1.4, -26, 3.6, 18);
      g.beginPath();
      g.arc(0, -47, 5, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#0b2c44';
      g.fillRect(-3, -48, 6, 1.4);
      neonlijn(g, [8, -26], [10, -58], 1.2);
      // scanlijntjes
      g.fillStyle = 'rgba(220,250,255,.25)';
      for (let y = -54; y < -8; y += 3) g.fillRect(-9, y, 18, 0.6);
    },
    radar(g) {
      schaduw(g, 14);
      box(g, -0.18, 0.18, -0.18, 0.18, 0, 8, DONKERSTEEN);
      g.fillStyle = '#5d6678';
      g.fillRect(-1.6, -31, 3.2, 23);
      g.save();
      g.translate(3, -38);
      g.rotate(-0.45);
      const sch = g.createLinearGradient(-14, 0, 14, 0);
      sch.addColorStop(0, '#d7dde8');
      sch.addColorStop(1, '#6f7889');
      g.fillStyle = sch;
      g.beginPath();
      g.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(30,40,60,.35)';
      g.beginPath();
      g.ellipse(1, 1, 10, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(150,230,255,.9)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      g.strokeStyle = '#3a4254';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(3, -38);
      g.lineTo(11, -50);
      g.stroke();
      g.fillStyle = '#ff4d6d';
      g.beginPath();
      g.arc(11, -51, 1.8, 0, Math.PI * 2);
      g.fill();
    },
    rondetafel(g) {
      schaduw(g, 24, 12);
      const kruk = (x, y) => {
        g.save();
        g.translate(x, y);
        cyl(g, 3.6, 0, 6, '#4d5566', { top: '#7ee0ff' });
        g.restore();
      };
      kruk(-15, -6);
      kruk(15, -6);
      cyl(g, 16, 0, 9, '#6f7889');
      g.strokeStyle = 'rgba(190,240,255,.9)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, -9, 13, 6.5, 0, 0, Math.PI * 2);
      g.stroke();
      kruk(-15, 7);
      kruk(15, 7);
      // een hologram van een wereldbol boven de tafel
      g.fillStyle = 'rgba(76,201,255,.12)';
      poly(g, [[-9, -9], [9, -9], [6, -28], [-6, -28]]);
      g.fill();
      const bol = g.createRadialGradient(-2, -30, 1, 0, -28, 8);
      bol.addColorStop(0, 'rgba(230,255,255,.9)');
      bol.addColorStop(1, 'rgba(76,201,255,.35)');
      g.fillStyle = bol;
      g.beginPath();
      g.arc(0, -28, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(220,250,255,.75)';
      g.lineWidth = 0.7;
      for (const rx of [3, 6]) {
        g.beginPath();
        g.ellipse(0, -28, rx, 8, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(0, -28, 8, 2.5, 0, 0, Math.PI * 2);
      g.stroke();
    },
    schildkoepel(g, k) {
      schaduw(g, 27, 13, 0.14);
      cyl(g, 6, 0, 9, '#3a4254');
      neonband(g, 6, 6);
      const kern = g.createRadialGradient(0, -12, 0.5, 0, -12, 5);
      kern.addColorStop(0, '#ffffff');
      kern.addColorStop(1, 'rgba(76,201,255,0)');
      g.fillStyle = kern;
      g.beginPath();
      g.arc(0, -12, 5, 0, Math.PI * 2);
      g.fill();
      // de koepel van energie, met zeshoek-lijnen
      const koepel = () => {
        g.beginPath();
        g.ellipse(0, 0, 29, 36, 0, Math.PI, Math.PI * 2);
        g.ellipse(0, 0, 29, 14.5, 0, 0, Math.PI);
        g.closePath();
      };
      koepel();
      const gr = g.createLinearGradient(0, -36, 0, 10);
      gr.addColorStop(0, 'rgba(160,235,255,.32)');
      gr.addColorStop(1, 'rgba(76,201,255,.08)');
      g.fillStyle = gr;
      g.fill();
      g.save();
      koepel();
      g.clip();
      g.strokeStyle = 'rgba(190,240,255,.4)';
      g.lineWidth = 0.7;
      for (const rx of [10, 20]) {
        g.beginPath();
        g.ellipse(0, 0, rx, 36, 0, Math.PI, Math.PI * 2);
        g.stroke();
      }
      for (const h of [12, 24]) {
        const r = 29 * Math.sqrt(1 - (h / 36) ** 2);
        g.beginPath();
        g.ellipse(0, -h, r, r / 2, 0, 0, Math.PI);
        g.stroke();
      }
      g.restore();
      g.strokeStyle = 'rgba(210,248,255,.85)';
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(0, 0, 29, 36, 0, Math.PI, Math.PI * 2);
      g.stroke();
      g.strokeStyle = shade(k, 0.2);
      g.beginPath();
      g.ellipse(0, 0, 29, 14.5, 0, 0, Math.PI);
      g.stroke();
    },
    laserkanon(g, k) {
      schaduw(g, 17, 8);
      cyl(g, 12, 0, 8, DONKERSTEEN);
      neonband(g, 12, 5);
      const f = box(g, -0.17, 0.17, -0.17, 0.17, 8, 20, '#5d6678');
      poly(g, [f.left[0], f.left[1], f.left[2], f.left[3]].map((p, i) => [p[0], p[1] - (i < 2 ? 4 : 0)]), shade(k, -0.1));
      // de loop, schuin omhoog
      g.lineCap = 'round';
      g.strokeStyle = '#2b3242';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(2, -17);
      g.lineTo(19, -34);
      g.stroke();
      g.strokeStyle = '#6f7889';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(3, -18);
      g.lineTo(18, -33);
      g.stroke();
      g.lineCap = 'butt';
      const tip = g.createRadialGradient(20, -35, 0.5, 20, -35, 5);
      tip.addColorStop(0, '#ffffff');
      tip.addColorStop(0.5, '#4cc9ff');
      tip.addColorStop(1, 'rgba(76,201,255,0)');
      g.fillStyle = tip;
      g.beginPath();
      g.arc(20, -35, 5, 0, Math.PI * 2);
      g.fill();
    },
    mechridder(g, k) {
      schaduw(g, 18, 9);
      const staal = '#7a8396';
      box(g, 0.03, 0.14, -0.07, 0.07, 0, 26, '#4d5566');
      box(g, -0.14, -0.03, -0.07, 0.07, 0, 26, '#5d6678');
      box(g, -0.32, -0.22, -0.05, 0.05, 28, 44, '#5d6678');
      box(g, -0.2, 0.2, -0.12, 0.12, 26, 50, staal);
      // wapen op de borst in de kleur van je burcht
      const m = P(0, 0.12, 38);
      poly(g, [[m[0] - 4, m[1] - 4], [m[0] + 4, m[1]], [m[0] - 1, m[1] + 6], [m[0] - 8, m[1] + 1]], k);
      box(g, -0.32, -0.18, -0.11, 0.11, 44, 52, k);
      box(g, 0.18, 0.32, -0.11, 0.11, 44, 52, shade(k, -0.15));
      box(g, -0.08, 0.08, -0.08, 0.08, 50, 61, '#8a93a6');
      neonlijn(g, P(-0.08, 0.08, 56), P(0.08, 0.08, 56), 1);
      neonlijn(g, P(0.08, 0.08, 56), P(0.08, -0.08, 56), 1);
      box(g, 0.22, 0.32, -0.05, 0.05, 28, 44, '#4d5566');
      // het lichtzwaard
      const h = P(0.3, 0, 42);
      g.fillStyle = GOUD;
      g.fillRect(h[0] - 4, h[1] - 2, 8, 2.5);
      neonlijn(g, [h[0], h[1] - 2], [h[0] + 3, h[1] - 38], 2);
    },
    ruimteschip(g, k) {
      box(g, -0.45, 0.45, -0.45, 0.45, 0, 3, '#3a4254');
      g.strokeStyle = 'rgba(190,240,255,.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, -3, 19, 9.5, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#ffc94a';
      for (const [u, v] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]) {
        const p = P(u, v, 3);
        g.fillRect(p[0] - 1.2, p[1] - 1.2, 2.4, 2.4);
      }
      // landingspoten
      g.strokeStyle = '#2b3242';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-10, -9);
      g.lineTo(-11, -3);
      g.moveTo(10, -9);
      g.lineTo(12, -3);
      g.stroke();
      // het schip
      g.fillStyle = shade(k, -0.3);
      poly(g, [[-2, -18], [8, -36], [14, -34], [10, -18]]);
      g.fill();
      const romp = g.createLinearGradient(0, -28, 0, -6);
      romp.addColorStop(0, '#e2e7ef');
      romp.addColorStop(1, '#6f7889');
      poly(g, [[-27, -14], [4, -27], [19, -23], [19, -11], [2, -6]], romp);
      g.strokeStyle = k;
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-18, -14);
      g.lineTo(16, -18);
      g.stroke();
      const kuip = g.createLinearGradient(-12, -22, -2, -14);
      kuip.addColorStop(0, '#eaffff');
      kuip.addColorStop(1, '#2a7fd6');
      g.fillStyle = kuip;
      g.beginPath();
      g.ellipse(-8, -18, 7, 3.4, -0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = shade(k, -0.1);
      poly(g, [[0, -10], [12, -1], [18, -3], [12, -12]]);
      g.fill();
      const vuur = g.createRadialGradient(21, -17, 0.5, 21, -17, 6);
      vuur.addColorStop(0, '#ffffff');
      vuur.addColorStop(0.5, '#4cc9ff');
      vuur.addColorStop(1, 'rgba(76,201,255,0)');
      g.fillStyle = vuur;
      g.beginPath();
      g.arc(21, -17, 6, 0, Math.PI * 2);
      g.fill();
    },
    robodraak(g, k) {
      schaduw(g, 26, 12, 0.3);
      const metaal = g.createLinearGradient(-20, -40, 20, 0);
      metaal.addColorStop(0, '#c3cad6');
      metaal.addColorStop(1, '#4d5566');
      // staart met neonpunten
      g.strokeStyle = '#4d5566';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-10, -8);
      g.quadraticCurveTo(-26, -6, -22, 5);
      g.quadraticCurveTo(-16, 11, -4, 8);
      g.stroke();
      g.lineCap = 'butt';
      neonlijn(g, [-22, 0], [-18, 8], 1);
      // vleugels van metaal met lichtnerven
      const vleugel = [[-4, -18], [-14, -54], [-4, -44], [6, -58], [9, -40], [18, -44], [9, -20]];
      poly(g, vleugel, shade(k, -0.35));
      g.fillStyle = 'rgba(76,201,255,.18)';
      poly(g, vleugel);
      g.fill();
      for (const p of [[-14, -54], [6, -58], [18, -44]]) neonlijn(g, [2, -22], p, 0.9);
      g.fillStyle = metaal;
      g.beginPath();
      g.ellipse(0, -12, 16, 10, -0.1, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(30,40,60,.4)';
      g.lineWidth = 0.8;
      for (const x of [-8, -2, 4]) {
        g.beginPath();
        g.moveTo(x, -20);
        g.lineTo(x + 2, -4);
        g.stroke();
      }
      neonlijn(g, [-10, -6], [10, -8], 1, '76,201,255');
      // nek en kop
      g.fillStyle = metaal;
      g.beginPath();
      g.moveTo(8, -16);
      g.quadraticCurveTo(18, -26, 16, -36);
      g.lineTo(22, -34);
      g.quadraticCurveTo(24, -22, 15, -10);
      g.fill();
      poly(g, [[14, -40], [29, -38], [28, -33], [15, -34]], metaal);
      poly(g, [[16, -40], [13, -48], [20, -41]], shade(k, -0.2));
      g.fillStyle = '#bff3ff';
      g.beginPath();
      g.arc(22, -37.5, 1.5, 0, Math.PI * 2);
      g.fill();
    },
    // Het kampvuur van de klasburcht in het begin.
    kampvuur(g) {
      g.fillStyle = '#6b6f7a';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.beginPath();
        g.ellipse(Math.cos(a) * 8, Math.sin(a) * 4, 2.6, 1.8, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#5a3a22';
      g.fillRect(-6, -2, 12, 2.4);
      const f = g.createRadialGradient(0, -6, 0.5, 0, -5, 8);
      f.addColorStop(0, '#fff6c2');
      f.addColorStop(0.45, '#ffb03a');
      f.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = f;
      g.beginPath();
      g.moveTo(-6, -1);
      g.quadraticCurveTo(-4, -10, 0, -16);
      g.quadraticCurveTo(4, -10, 6, -1);
      g.fill();
    },
  };

  // Stukken die bewegen of gloeien: hier tekent het bord elke beeldje een gloed bovenop.
  const GLOED = {
    fakkel: { y: -29, r: 16, kleur: '110,215,255', soort: 'vuur' },
    kampvuur: { y: -8, r: 22, kleur: '255,170,60', soort: 'vuur' },
    smidse: { y: -6, r: 18, kleur: '255,140,40', soort: 'vuur' },
    kristal: { y: -20, r: 24, kleur: '126,224,255', soort: 'puls' },
    baken: { y: -49, r: 22, kleur: '126,224,255', soort: 'straal' },
    portaal: { y: -26, r: 26, kleur: '195,155,255', soort: 'puls' },
    fontein: { y: -14, r: 14, kleur: '160,230,255', soort: 'puls' },
    goudtoren: { y: -97, r: 14, kleur: '255,220,120', soort: 'puls' },
    draak: { y: -38, r: 10, kleur: '255,150,60', soort: 'vuur' },
    lichtpaal: { y: -38, r: 18, kleur: '120,220,255', soort: 'puls' },
    zwaardsteen: { y: -28, r: 16, kleur: '120,220,255', soort: 'puls' },
    holoridder: { y: -32, r: 22, kleur: '120,220,255', soort: 'puls' },
    radar: { x: 11, y: -51, r: 7, kleur: '255,90,110', soort: 'puls' },
    rondetafel: { y: -28, r: 20, kleur: '120,220,255', soort: 'puls' },
    schildkoepel: { y: -16, r: 30, kleur: '120,220,255', soort: 'puls' },
    laserkanon: { x: 20, y: -35, r: 12, kleur: '120,220,255', soort: 'puls' },
    mechridder: { x: 12, y: -62, r: 14, kleur: '120,220,255', soort: 'puls' },
    ruimteschip: { x: 21, y: -17, r: 14, kleur: '120,220,255', soort: 'vuur' },
    robodraak: { x: 22, y: -37, r: 9, kleur: '120,220,255', soort: 'puls' },
  };

  const MUURACHTIG = new Set(['muur', 'poort', 'toren', 'wachttoren', 'goudtoren', 'donjon']);

  // Het plaatje van een stuk, T pixels per tegel. Het ankerpunt (midden van de tegel) ligt op (ax, ay).
  function stuk(id, kleur, T, n = {}, variant = 0) {
    const mask = id === 'muur' || id === 'poort' ? `${n.xp ? 1 : 0}${n.xm ? 1 : 0}${n.yp ? 1 : 0}${n.ym ? 1 : 0}` : '';
    const key = `s|${id}|${kleur}|${T}|${mask}|${variant}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const s = T / 64;
    const W = 76 * s;
    const H = 150 * s;
    const c = canvas(W, H);
    const g = c.getContext('2d');
    const ax = W / 2;
    const ay = H - 22 * s;
    g.translate(ax, ay);
    g.scale(s, s);
    const fn = STUK[id];
    if (fn) fn(g, kleur, n, rng(variant * 7919 + 13));
    hit = { c, ax, ay };
    cache.set(key, hit);
    return hit;
  }

  // ---------- Vloer ----------
  const VLOER = {
    gras: ['#5fae4e', '#57a548', '#64b553'],
    wild: ['#3f8a3f', '#3b833b', '#448f42'],
    bloemen: ['#5fae4e', '#57a548', '#64b553'],
    pad: ['#5b6272', '#575e6d', '#606778'],
    plein: ['#6c7385', '#676e80', '#71788a'],
    water: ['#2f7fd0', '#2c78c6', '#3386d8'],
    neon: ['#1d2638', '#1b2334', '#1f283b'],
    lava: ['#3a2622', '#36221f', '#3e2924'],
    sterrenglas: ['#0d1430', '#0c122c', '#0f1734'],
    brug: ['rgba(60,170,255,.42)', 'rgba(60,170,255,.42)', 'rgba(60,170,255,.42)'],
  };

  function diamant(g, T, grow = 0.6) {
    g.beginPath();
    g.moveTo(0, -T / 4 - grow);
    g.lineTo(T / 2 + grow * 2, 0);
    g.lineTo(0, T / 4 + grow);
    g.lineTo(-T / 2 - grow * 2, 0);
    g.closePath();
  }

  function tegel(soort, T, variant = 0) {
    const key = `t|${soort}|${T}|${variant}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const c = canvas(T + 4, T / 2 + 4);
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    const kleuren = VLOER[soort] || VLOER.gras;
    const r = rng(variant * 31 + soort.length * 997);
    diamant(g, T);
    g.fillStyle = kleuren[variant % kleuren.length];
    g.fill();
    g.save();
    diamant(g, T, 0);
    g.clip();
    const s = T / 64;
    if (soort === 'gras' || soort === 'wild' || soort === 'bloemen') {
      // grassprietjes
      for (let i = 0; i < 26; i++) {
        const x = (r() - 0.5) * T * 0.9;
        const y = (r() - 0.5) * T * 0.45;
        g.strokeStyle = r() < 0.5 ? 'rgba(20,70,25,.35)' : 'rgba(170,230,120,.35)';
        g.lineWidth = Math.max(0.6, s);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 2 * s, y - 3 * s);
        g.stroke();
      }
      if (soort === 'bloemen') {
        const kl = ['#ff7aa8', '#ffe066', '#ffffff', '#b98cff', '#ff9a4a'];
        for (let i = 0; i < 16; i++) {
          g.fillStyle = kl[Math.floor(r() * kl.length)];
          g.beginPath();
          g.arc((r() - 0.5) * T * 0.8, (r() - 0.5) * T * 0.38, 1.6 * s + 0.4, 0, Math.PI * 2);
          g.fill();
        }
      } else if (soort === 'wild' && r() < 0.5) {
        g.fillStyle = 'rgba(255,240,150,.7)';
        for (let i = 0; i < 3; i++) g.fillRect((r() - 0.5) * T * 0.7, (r() - 0.5) * T * 0.3, 1.5 * s, 1.5 * s);
      }
    } else if (soort === 'pad' || soort === 'plein') {
      // kasseien of tegels
      const n = soort === 'pad' ? 5 : 3;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const u = (i + 0.5) / n - 0.5 + (r() - 0.5) * 0.04;
          const v = (j + 0.5) / n - 0.5 + (r() - 0.5) * 0.04;
          const x = (u - v) * T / 2;
          const y = (u + v) * T / 4;
          const sz = (T / n) * 0.42;
          g.fillStyle = shade(kleuren[0], (r() - 0.5) * 0.25);
          g.beginPath();
          if (soort === 'pad') g.ellipse(x, y, sz, sz / 2, 0, 0, Math.PI * 2);
          else {
            g.moveTo(x, y - sz / 2);
            g.lineTo(x + sz, y);
            g.lineTo(x, y + sz / 2);
            g.lineTo(x - sz, y);
            g.closePath();
          }
          g.fill();
          g.fillStyle = 'rgba(255,255,255,.12)';
          g.fillRect(x - sz * 0.4, y - sz * 0.25, sz * 0.5, Math.max(0.6, s));
        }
      }
      // lichtvoegen tussen de stenen
      g.fillStyle = 'rgba(120,225,255,.55)';
      for (let i = 0; i < (soort === 'pad' ? 4 : 2); i++) {
        const u = r() - 0.5;
        const v = r() - 0.5;
        g.fillRect((u - v) * T / 2, (u + v) * T / 4, Math.max(1, 1.4 * s), Math.max(0.8, s));
      }
      if (soort === 'plein') {
        g.strokeStyle = 'rgba(76,201,255,.35)';
        g.lineWidth = Math.max(0.6, s);
        g.beginPath();
        g.moveTo(...P(-0.5, 0).map(z => z * s));
        g.lineTo(...P(0.5, 0).map(z => z * s));
        g.moveTo(...P(0, -0.5).map(z => z * s));
        g.lineTo(...P(0, 0.5).map(z => z * s));
        g.stroke();
      }
    } else if (soort === 'water') {
      const w = g.createLinearGradient(0, -T / 4, 0, T / 4);
      w.addColorStop(0, '#2a6fc4');
      w.addColorStop(1, '#3d9be8');
      g.fillStyle = w;
      g.fillRect(-T / 2, -T / 4, T, T / 2);
      g.strokeStyle = 'rgba(200,240,255,.45)';
      g.lineWidth = Math.max(0.6, s);
      for (let i = 0; i < 4; i++) {
        const x = (r() - 0.5) * T * 0.6;
        const y = (r() - 0.5) * T * 0.25;
        g.beginPath();
        g.moveTo(x - 4 * s, y);
        g.quadraticCurveTo(x, y - 1.5 * s, x + 4 * s, y);
        g.stroke();
      }
    } else if (soort === 'lava') {
      // gloeiende barsten
      for (let i = 0; i < 3; i++) {
        const pts = [];
        let u = r() - 0.5;
        let v = -0.5;
        for (let j = 0; j < 5; j++) {
          pts.push(P(u, v).map(z => z * s));
          u = Math.max(-0.5, Math.min(0.5, u + (r() - 0.5) * 0.35));
          v += 0.25;
        }
        for (const [w, kl] of [[3.2, 'rgba(255,110,30,.45)'], [1.1, '#ffd27a']]) {
          g.strokeStyle = kl;
          g.lineWidth = Math.max(0.6, w * s);
          g.beginPath();
          g.moveTo(...pts[0]);
          for (const p of pts.slice(1)) g.lineTo(...p);
          g.stroke();
        }
      }
    } else if (soort === 'sterrenglas') {
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 9; i++) {
        const u = r() - 0.5;
        const v = r() - 0.5;
        const z = r() < 0.8 ? 1 : 1.8;
        g.fillRect((u - v) * T / 2, (u + v) * T / 4, Math.max(0.6, z * s), Math.max(0.6, z * s));
      }
      const glans = g.createLinearGradient(-T / 2, -T / 4, T / 2, T / 4);
      glans.addColorStop(0, 'rgba(120,200,255,0)');
      glans.addColorStop(0.5, 'rgba(160,220,255,.18)');
      glans.addColorStop(1, 'rgba(120,200,255,0)');
      g.fillStyle = glans;
      g.fillRect(-T / 2, -T / 4, T, T / 2);
      g.strokeStyle = 'rgba(76,201,255,.6)';
      g.lineWidth = Math.max(0.6, s);
      diamant(g, T * 0.92, 0);
      g.stroke();
    } else if (soort === 'brug') {
      // een brug van hard licht: doorschijnend, met lichtlijnen dwars en een felle rand
      g.strokeStyle = 'rgba(190,240,255,.55)';
      g.lineWidth = Math.max(0.6, s);
      for (const u of [-0.25, 0, 0.25]) {
        g.beginPath();
        g.moveTo(...P(u, -0.5).map(z => z * s));
        g.lineTo(...P(u, 0.5).map(z => z * s));
        g.stroke();
      }
      g.strokeStyle = 'rgba(220,250,255,.9)';
      g.lineWidth = Math.max(0.8, 1.6 * s);
      for (const v of [-0.47, 0.47]) {
        g.beginPath();
        g.moveTo(...P(-0.5, v).map(z => z * s));
        g.lineTo(...P(0.5, v).map(z => z * s));
        g.stroke();
      }
    } else if (soort === 'neon') {
      g.strokeStyle = 'rgba(76,201,255,.85)';
      g.lineWidth = Math.max(0.8, 1.2 * s);
      g.shadowColor = '#4cc9ff';
      g.shadowBlur = 4 * s;
      for (const t of [-0.25, 0.25]) {
        g.beginPath();
        g.moveTo(...P(t, -0.5).map(z => z * s));
        g.lineTo(...P(t, 0.5).map(z => z * s));
        g.moveTo(...P(-0.5, t).map(z => z * s));
        g.lineTo(...P(0.5, t).map(z => z * s));
        g.stroke();
      }
      g.shadowBlur = 0;
    }
    g.restore();
    // licht randje links, schaduw rechts: zo zie je de tegels net
    g.strokeStyle = soort === 'water' ? 'rgba(10,40,90,.35)' : 'rgba(0,0,0,.08)';
    g.lineWidth = 0.6;
    diamant(g, T, 0);
    g.stroke();
    hit = { c, ax: c.width / 2, ay: c.height / 2 };
    cache.set(key, hit);
    return hit;
  }

  // ---------- Een eiland tekenen ----------
  // kaart: { w, h, land(x,y), vloer(x,y) -> soort, stuk(x,y) -> { id, kleur } of null, ridder(x,y) -> canvas of null }
  // ox, oy: waar het midden van tegel (0,0) op het canvas komt.
  function teken(g, kaart, T, ox, oy, opts = {}) {
    const half = T / 2;
    const kwart = T / 4;
    // Diep in het midden, ondiep aan de zijkanten: zo hangt het eiland als een rotspunt in de lucht.
    const breed = (kaart.w + kaart.h) / 2;
    const midden = (kaart.w - kaart.h) / 2;
    const diepte = (cx, cy) => {
      const rel = Math.min(1, Math.abs(cx - cy - midden) / breed);
      return T * ((opts.diep || 1) * (0.5 + 0.12 * breed * (1 - rel) ** 1.6) + 0.5 * hash(cx, cy, 5));
    };
    // Een brug hangt in de lucht: geen rotswand eronder, en de rotswand van het eiland loopt eronder door.
    const brug = (x, y) => !!(kaart.brug && kaart.brug(x, y));
    const bodems = []; // de onderkant van elke rotswand: daar komen de zweefmotoren
    const vast = (x, y) => kaart.land(x, y) && !brug(x, y);
    // 1. kliffen en vloer, van achter naar voor
    for (let som = 0; som <= kaart.w + kaart.h - 2; som++) {
      for (let x = Math.max(0, som - kaart.h + 1); x <= Math.min(kaart.w - 1, som); x++) {
        const y = som - x;
        if (!kaart.land(x, y)) continue;
        const sx = ox + (x - y) * half;
        const sy = oy + (x + y) * kwart;
        if (brug(x, y)) {
          // een balk onder de planken, en touwen opzij
          const balk = T * 0.06;
          const zij = (a, b, kleur) => {
            g.fillStyle = kleur;
            g.beginPath();
            g.moveTo(a[0], a[1]);
            g.lineTo(b[0], b[1]);
            g.lineTo(b[0], b[1] + balk);
            g.lineTo(a[0], a[1] + balk);
            g.closePath();
            g.fill();
          };
          if (!kaart.land(x, y + 1)) zij([sx - half, sy], [sx, sy + kwart], 'rgba(76,201,255,.55)');
          if (!kaart.land(x + 1, y)) zij([sx, sy + kwart], [sx + half, sy], 'rgba(40,140,230,.55)');
          const t = tegel('brug', T, 0);
          g.drawImage(t.c, sx - t.ax, sy - t.ay);
          continue;
        }
        const leegY = !vast(x, y + 1);
        const leegX = !vast(x + 1, y);
        if (leegY) {
          const da = diepte(x, y + 1);
          const db = diepte(x + 1, y + 1);
          klif(g, [sx - half, sy], [sx, sy + kwart], da, db, 'l', x * 31 + y, T);
          bodems.push([sx - half / 2, sy + kwart / 2 + (da + db) / 2]);
        }
        if (leegX) {
          const da = diepte(x + 1, y + 1);
          const db = diepte(x + 1, y);
          klif(g, [sx, sy + kwart], [sx + half, sy], da, db, 'r', x * 17 + y * 3, T);
          bodems.push([sx + half / 2, sy + kwart / 2 + (da + db) / 2]);
        }
        const soort = kaart.vloer(x, y);
        const t = tegel(soort, T, Math.floor(hash(x, y) * 3));
        g.drawImage(t.c, sx - t.ax, sy - t.ay);
        // een grasrandje aan de rand van het eiland
        if (leegY || leegX) {
          g.strokeStyle = soort === 'water' ? '#5aa9ff' : '#7cc95f';
          g.lineWidth = Math.max(1, T / 28);
          g.beginPath();
          if (leegY) {
            g.moveTo(sx - half, sy);
            g.lineTo(sx, sy + kwart);
          } else g.moveTo(sx, sy + kwart);
          if (leegX) g.lineTo(sx + half, sy);
          g.stroke();
        }
      }
    }
    // 1b. zweefmotoren onder de diepste punten van de rots
    const motoren = [];
    if (bodems.length) {
      const n = Math.max(1, Math.min(5, Math.round(breed / 8)));
      const x0 = Math.min(...bodems.map(b => b[0]));
      const x1 = Math.max(...bodems.map(b => b[0])) + 1;
      for (let i = 0; i < n; i++) {
        const a = x0 + ((x1 - x0) * i) / n;
        const b = x0 + ((x1 - x0) * (i + 1)) / n;
        let best = null;
        for (const p of bodems) if (p[0] >= a && p[0] < b && (!best || p[1] > best[1])) best = p;
        if (best) motoren.push(motor(g, best[0], best[1] - T * 0.08, T));
      }
    }
    // 2. stukken, van achter naar voor
    for (let som = 0; som <= kaart.w + kaart.h - 2; som++) {
      for (let x = Math.max(0, som - kaart.h + 1); x <= Math.min(kaart.w - 1, som); x++) {
        const y = som - x;
        if (!kaart.land(x, y)) continue;
        const sx = ox + (x - y) * half;
        const sy = oy + (x + y) * kwart;
        if (brug(x, y)) {
          // lichtrailings langs beide kanten, met kleine zenders aan de uiteinden
          const langsX = brug(x - 1, y) || brug(x + 1, y) || !brug(x, y - 1);
          const pt = (u, v, h = 0) => [sx + (u - v) * half, sy + (u + v) * kwart - h];
          const zph = langsX ? (a, z, h) => pt(a, z, h) : (a, z, h) => pt(z, a, h);
          const hoogte = T * 0.16;
          for (const z of [-0.46, 0.46]) {
            g.save();
            g.lineCap = 'round';
            g.strokeStyle = 'rgba(76,201,255,.3)';
            g.lineWidth = Math.max(2, T / 14);
            g.beginPath();
            g.moveTo(...zph(-0.5, z, hoogte));
            g.lineTo(...zph(0.5, z, hoogte));
            g.stroke();
            g.strokeStyle = 'rgba(210,248,255,.95)';
            g.lineWidth = Math.max(0.8, T / 50);
            g.stroke();
            g.restore();
            const eind = langsX ? [[-0.5, !brug(x - 1, y)], [0.5, !brug(x + 1, y)]] : [[-0.5, !brug(x, y - 1)], [0.5, !brug(x, y + 1)]];
            for (const [a, aan] of eind) {
              if (!aan) continue;
              const [px, py] = zph(a, z, 0);
              g.fillStyle = '#2b3242';
              g.fillRect(px - T / 36, py - hoogte - T / 30, T / 18, hoogte + T / 30);
              g.fillStyle = '#bff3ff';
              g.fillRect(px - T / 36, py - hoogte - T / 30, T / 18, T / 30);
            }
          }
          continue;
        }
        const st = kaart.stuk(x, y);
        if (st) {
          let n = {};
          if (st.id === 'muur' || st.id === 'poort') {
            const m = (a, b) => {
              const o = kaart.stuk(a, b);
              return !!(o && MUURACHTIG.has(o.id));
            };
            n = { xp: m(x + 1, y), xm: m(x - 1, y), yp: m(x, y + 1), ym: m(x, y - 1) };
          }
          const p = stuk(st.id, st.kleur, T, n, Math.floor(hash(x, y, 2) * 4));
          g.drawImage(p.c, sx - p.ax, sy - p.ay);
        } else if (kaart.ridder) {
          const r = kaart.ridder(x, y);
          if (r) {
            const h = T * 0.62;
            const w = (h * r.width) / r.height;
            g.fillStyle = 'rgba(10,14,24,.3)';
            g.beginPath();
            g.ellipse(sx, sy, w * 0.45, w * 0.2, 0, 0, Math.PI * 2);
            g.fill();
            g.drawImage(r, sx - w / 2, sy - h + T * 0.04, w, h);
          }
        }
      }
    }
    return { motoren };
  }

  // Een zweefmotor: een metalen ring met een straal blauw licht naar beneden.
  function motor(g, x, y, T) {
    const rx = T * 0.32;
    const ry = T * 0.13;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const st = g.createLinearGradient(0, y, 0, y + T * 1.8);
    st.addColorStop(0, 'rgba(120,220,255,.55)');
    st.addColorStop(1, 'rgba(60,120,255,0)');
    g.fillStyle = st;
    g.beginPath();
    g.moveTo(x - rx * 0.7, y);
    g.lineTo(x + rx * 0.7, y);
    g.lineTo(x + rx * 0.25, y + T * 1.8);
    g.lineTo(x - rx * 0.25, y + T * 1.8);
    g.closePath();
    g.fill();
    g.restore();
    g.fillStyle = '#2b3242';
    g.beginPath();
    g.ellipse(x, y - ry * 0.6, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3d4658';
    g.beginPath();
    g.ellipse(x, y - ry * 1.1, rx * 0.9, ry * 0.85, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(190,240,255,.95)';
    g.lineWidth = Math.max(0.8, T / 40);
    g.beginPath();
    g.ellipse(x, y - ry * 0.3, rx * 0.75, ry * 0.65, 0, 0, Math.PI);
    g.stroke();
    return { x, y: y + T * 0.1, r: T * 0.7, kleur: '76,201,255', soort: 'puls', fase: hash(Math.round(x), Math.round(y), 6) * 6.28 };
  }

  // Een rotswand onder de rand van het eiland, met een gloeiend kristal hier en daar.
  function klif(g, a, b, da, db, side, seed, T) {
    const r = rng(seed * 2654435761);
    const grad = g.createLinearGradient(0, a[1], 0, a[1] + Math.max(da, db));
    if (side === 'l') {
      grad.addColorStop(0, '#5f5148');
      grad.addColorStop(0.12, '#4a4048');
      grad.addColorStop(1, '#1e1c30');
    } else {
      grad.addColorStop(0, '#43393a');
      grad.addColorStop(0.12, '#352e36');
      grad.addColorStop(1, '#14131f');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(b[0], b[1] + db);
    // grillige onderkant
    const steps = 4;
    for (let i = steps - 1; i >= 1; i--) {
      const t = i / steps;
      g.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + da + (db - da) * t + (r() - 0.3) * T * 0.25);
    }
    g.lineTo(a[0], a[1] + da);
    g.closePath();
    g.fill();
    // aardlaag bovenaan
    g.fillStyle = side === 'l' ? 'rgba(120,90,60,.55)' : 'rgba(80,60,40,.55)';
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(b[0], b[1] + T * 0.12);
    g.lineTo(a[0], a[1] + T * 0.12);
    g.closePath();
    g.fill();
    // een neonrand onder het gras: het eiland is een ridderburcht met sci-fi motoren
    const nl = T * 0.12;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(76,201,255,.3)';
    g.lineWidth = Math.max(1.5, T / 14);
    g.beginPath();
    g.moveTo(a[0], a[1] + nl);
    g.lineTo(b[0], b[1] + nl);
    g.stroke();
    g.strokeStyle = 'rgba(190,240,255,.9)';
    g.lineWidth = Math.max(0.7, T / 45);
    g.stroke();
    g.restore();
    // breuklijnen
    g.strokeStyle = 'rgba(0,0,0,.25)';
    g.lineWidth = Math.max(0.6, T / 64);
    for (let i = 0; i < 2; i++) {
      const t = 0.2 + r() * 0.6;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t + T * 0.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * T * 0.15, y + T * 0.3 + r() * T * 0.3);
      g.stroke();
    }
    // een sci-fi kristal in de rots
    if (r() < 0.22) {
      const t = 0.3 + r() * 0.4;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t + Math.min(da, db) * (0.35 + r() * 0.3);
      const k = r() < 0.6 ? ['#8ff3ff', '#2a7fd6'] : ['#e1c8ff', '#7a3fe0'];
      const gr = g.createLinearGradient(x - 3, y, x + 3, y);
      gr.addColorStop(0, k[0]);
      gr.addColorStop(1, k[1]);
      g.fillStyle = gr;
      const s = T / 64;
      g.beginPath();
      g.moveTo(x - 3 * s, y + 4 * s);
      g.lineTo(x, y - 7 * s);
      g.lineTo(x + 3 * s, y + 4 * s);
      g.closePath();
      g.fill();
    }
  }

  // Waar op het canvas gloeit er iets? Voor de animatie bovenop het gebakken eiland.
  function gloeiers(kaart, T, ox, oy, opts = {}) {
    const out = [];
    for (let x = 0; x < kaart.w; x++) {
      for (let y = 0; y < kaart.h; y++) {
        if (!kaart.land(x, y)) continue;
        const st = kaart.stuk(x, y);
        const gl = st && GLOED[st.id];
        const s = T / 64;
        if (gl) out.push({ x: ox + (x - y) * T / 2 + (gl.x || 0) * s, y: oy + (x + y) * T / 4 + gl.y * s, r: gl.r * s, kleur: gl.kleur, soort: gl.soort, fase: hash(x, y, 9) * 6.28 });
        else if (kaart.vloer(x, y) === 'lava' && hash(x, y, 4) < 0.6) out.push({ x: ox + (x - y) * T / 2, y: oy + (x + y) * T / 4, r: T * 0.35, kleur: '255,120,40', soort: 'puls', fase: hash(x, y, 9) * 6.28 });
        else if (opts.glinster !== false && kaart.vloer(x, y) === 'water' && hash(x, y, 4) < 0.5) out.push({ x: ox + (x - y) * T / 2, y: oy + (x + y) * T / 4, r: T * 0.18, kleur: '220,245,255', soort: 'glinster', fase: hash(x, y, 9) * 6.28 });
      }
    }
    return out;
  }

  // Een zachte gloed als plaatje (veel sneller dan shadowBlur).
  function gloedSprite(kleur) {
    const key = `g|${kleur}`;
    let c = cache.get(key);
    if (c) return c;
    c = canvas(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${kleur},.9)`);
    gr.addColorStop(0.35, `rgba(${kleur},.35)`);
    gr.addColorStop(1, `rgba(${kleur},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    cache.set(key, c);
    return c;
  }

  // De gloed van fakkels, kristallen en bakens; tijd in seconden.
  function gloei(g, lijst, tijd, zoom = 1) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of lijst) {
      const t = tijd + p.fase;
      let a;
      let r = p.r * zoom;
      if (p.soort === 'vuur') a = 0.55 + 0.25 * Math.sin(t * 9) * Math.sin(t * 5.3);
      else if (p.soort === 'glinster') {
        a = Math.max(0, Math.sin(t * 1.7)) ** 6 * 0.7;
        r *= 0.7;
      } else a = 0.45 + 0.3 * Math.sin(t * 2.2);
      if (a <= 0.02) continue;
      g.globalAlpha = a;
      const s = gloedSprite(p.kleur);
      g.drawImage(s, p.x - r, p.y - r, r * 2, r * 2);
      if (p.soort === 'straal') {
        g.globalAlpha = a * 0.5;
        const w = r * 0.22;
        const gr = g.createLinearGradient(0, p.y - r * 9, 0, p.y);
        gr.addColorStop(0, `rgba(${p.kleur},0)`);
        gr.addColorStop(1, `rgba(${p.kleur},.8)`);
        g.fillStyle = gr;
        g.fillRect(p.x - w / 2, p.y - r * 9, w, r * 9);
      }
    }
    g.restore();
  }

  // Een sterrenhemel met nevels, één keer gebakken.
  // planeet: waar de verre planeet staat, als deel van de breedte en hoogte, met zijn straal.
  function hemel(w, h, planeet = { x: 0.86, y: 0.2, r: 0.075 }) {
    const key = `h|${w}|${h}|${planeet.x}|${planeet.y}|${planeet.r}`;
    let c = cache.get(key);
    if (c) return c;
    c = canvas(w, h);
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#060a13');
    bg.addColorStop(0.55, '#0c1630');
    bg.addColorStop(1, '#16123a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const r = rng(77);
    for (const [x, y, rad, kleur] of [[0.2, 0.25, 0.45, '76,201,255'], [0.85, 0.7, 0.5, '166,107,255'], [0.55, 0.95, 0.4, '255,95,210']]) {
      const gr = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, rad * Math.max(w, h));
      gr.addColorStop(0, `rgba(${kleur},.16)`);
      gr.addColorStop(1, `rgba(${kleur},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < (w * h) / 2500; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
      const s = r() < 0.92 ? 1 : 2;
      g.fillRect(r() * w, r() * h, s, s);
    }
    // een verre planeet met ringen
    const pr = Math.min(w, h) * planeet.r;
    const px = w * planeet.x;
    const py = h * planeet.y;
    const ring = (a0, a1) => {
      g.strokeStyle = 'rgba(190,170,255,.35)';
      g.lineWidth = pr * 0.12;
      g.beginPath();
      g.ellipse(px, py, pr * 1.9, pr * 0.45, -0.3, a0, a1);
      g.stroke();
      g.strokeStyle = 'rgba(140,220,255,.25)';
      g.lineWidth = pr * 0.05;
      g.beginPath();
      g.ellipse(px, py, pr * 2.25, pr * 0.55, -0.3, a0, a1);
      g.stroke();
    };
    ring(Math.PI, Math.PI * 2);
    const pl = g.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    pl.addColorStop(0, '#8a7cff');
    pl.addColorStop(0.6, '#4b3aa8');
    pl.addColorStop(1, '#1c1546');
    g.fillStyle = pl;
    g.beginPath();
    g.arc(px, py, pr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(160,220,255,.35)';
    g.lineWidth = Math.max(1, pr * 0.04);
    g.beginPath();
    g.arc(px, py, pr, Math.PI * 1.05, Math.PI * 1.7);
    g.stroke();
    ring(0, Math.PI);
    cache.set(key, c);
    return c;
  }

  // Een wolkje, voor voor het eiland langs te drijven.
  function wolk(seed) {
    const key = `w|${seed}`;
    let c = cache.get(key);
    if (c) return c;
    c = canvas(260, 110);
    const g = c.getContext('2d');
    const r = rng(seed + 3);
    for (let i = 0; i < 9; i++) {
      const x = 40 + r() * 180;
      const y = 45 + r() * 30;
      const rad = 22 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(225,235,255,.55)');
      gr.addColorStop(1, 'rgba(225,235,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    cache.set(key, c);
    return c;
  }

  // Een schermpunt terug naar een vakje (afgerond).
  function vakjeOp(px, py, T, ox, oy) {
    const a = (px - ox) / (T / 2);
    const b = (py - oy) / (T / 4);
    return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
  }

  // Waar een plaatje echt iets bevat (zonder de doorzichtige rand).
  function inhoud(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width;
    let y0 = c.height;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 >= x0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : { x: 0, y: 0, w: c.width, h: c.height };
  }

  // Een icoon van één stuk (voor de bouwknoppen): het stuk op een tegeltje, zo groot mogelijk.
  function icoon(id, kleur, size = 64) {
    const key = `i|${id}|${kleur}|${size}`;
    let c = cache.get(key);
    if (c) return c;
    c = canvas(size, size);
    const g = c.getContext('2d');
    const item = Burcht.BY_ID[id];
    const T = 96;
    const tmp = canvas(T * 1.3, T * 2.5);
    const tg = tmp.getContext('2d');
    const ax = tmp.width / 2;
    const ay = tmp.height - T * 0.4;
    const t = tegel(item && item.soort === 'grond' ? id : 'gras', T, 1);
    if (!item || item.soort !== 'grond') tg.globalAlpha = 0.6;
    tg.drawImage(t.c, ax - t.ax, ay - t.ay);
    tg.globalAlpha = 1;
    if (!item || item.soort !== 'grond') {
      const p = stuk(id, kleur, T);
      tg.drawImage(p.c, ax - p.ax, ay - p.ay);
    }
    const b = inhoud(tmp);
    const sc = Math.min((size * 0.92) / b.w, (size * 0.92) / b.h);
    g.drawImage(tmp, b.x, b.y, b.w, b.h, (size - b.w * sc) / 2, (size - b.h * sc) / 2, b.w * sc, b.h * sc);
    cache.set(key, c);
    return c;
  }

  // De kaart van één burcht als eigen eilandje: de grond volgens de rang, met een randje wilde weide errond.
  // burcht: { grond, stukken, kleur }. ridder: een canvas van de ridder, of null.
  function perceelKaart(burcht, rang, ridder = null) {
    const n = Burcht.RANGEN[rang].grond;
    const o = Math.floor((Burcht.MAX_GROND - n) / 2);
    const W = n + 2;
    const kleur = Burcht.KLEUREN[burcht.kleur] || Burcht.KLEUREN[0];
    const eigen = (x, y) => x >= 1 && y >= 1 && x <= n && y <= n;
    const sleutel = (x, y) => Burcht.sleutel(x - 1 + o, y - 1 + o);
    const rand = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= W) return false;
      const hoek = (x === 0 || x === W - 1) && (y === 0 || y === W - 1);
      return !hoek && hash(x + o, y + o, 11) < 0.82;
    };
    // de ridder staat op het eerste vrije vakje vooraan in het midden
    let plek = null;
    if (ridder) {
      const m = Math.ceil(n / 2);
      for (const [x, y] of [[m + 1, m + 1], [m, m + 1], [m + 1, m], [n, n], [n, 1], [1, n]]) {
        if (eigen(x, y) && !burcht.stukken[sleutel(x, y)] && burcht.grond[sleutel(x, y)] !== 'water') {
          plek = [x, y];
          break;
        }
      }
    }
    const k = {
      w: W,
      h: W,
      n,
      o,
      eigen,
      sleutel,
      land: (x, y) => eigen(x, y) || rand(x, y),
      vloer: (x, y) => (eigen(x, y) ? burcht.grond[sleutel(x, y)] || 'gras' : 'wild'),
      stuk: (x, y) => {
        if (eigen(x, y)) {
          const id = burcht.stukken[sleutel(x, y)];
          return id ? { id, kleur } : null;
        }
        if (!rand(x, y)) return null;
        const h = hash(x + o, y + o, 3);
        return h < 0.22 ? { id: h < 0.11 ? 'den' : 'boom', kleur } : null;
      },
      ridder: (x, y) => (plek && plek[0] === x && plek[1] === y ? ridder : null),
    };
    if (!burcht.eiland) return k;
    // Het eilandje ligt rechts naast je burcht, met een brug ertussen.
    const e = eilandjeKaart(burcht);
    const ex = W + 3;
    const ey = Math.floor((W - e.w) / 2);
    const by = ey + Math.floor(e.h / 2);
    const isBrug = (x, y) => y === by && x >= W - 1 && x <= ex;
    const inE = (x, y) => x >= ex && y >= ey && x < ex + e.w && y < ey + e.h;
    const via = (f, anders) => (x, y) => (isBrug(x, y) ? anders(true) : inE(x, y) ? e[f](x - ex, y - ey) : x < W ? k[f](x, y) : anders(false));
    return {
      ...k,
      w: ex + e.w,
      brug: isBrug,
      eigen: via('eigen', () => false),
      sleutel: via('sleutel', () => null),
      land: via('land', b => b),
      vloer: via('vloer', b => (b ? 'brug' : 'wild')),
      stuk: via('stuk', () => null),
      ridder: (x, y) => (x < W && !isBrug(x, y) ? k.ridder(x, y) : null),
    };
  }

  // Het zwevende eilandje van een burcht: 5 x 5 eigen grond met een randje weide. Vakjes heten "e:x,y".
  function eilandjeKaart(burcht) {
    const n = Burcht.EILANDJE.grond;
    const W = n + 2;
    const kleur = Burcht.KLEUREN[burcht.kleur] || Burcht.KLEUREN[0];
    const eigen = (x, y) => x >= 1 && y >= 1 && x <= n && y <= n;
    const sleutel = (x, y) => Burcht.eSleutel(x - 1, y - 1);
    const rand = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= W) return false;
      const hoek = (x === 0 || x === W - 1) && (y === 0 || y === W - 1);
      return !hoek && hash(x + 40, y + 40, 11) < 0.7;
    };
    return {
      w: W,
      h: W,
      eigen,
      sleutel,
      land: (x, y) => eigen(x, y) || rand(x, y),
      vloer: (x, y) => (eigen(x, y) ? burcht.grond[sleutel(x, y)] || 'gras' : 'wild'),
      stuk: (x, y) => {
        if (eigen(x, y)) {
          const id = burcht.stukken[sleutel(x, y)];
          return id ? { id, kleur } : null;
        }
        if (!rand(x, y)) return null;
        const h = hash(x + 40, y + 40, 3);
        return h < 0.2 ? { id: 'den', kleur } : null;
      },
      ridder: () => null,
    };
  }

  // Dezelfde kaart een kwartslag (r keer) gedraaid. De stukken zelf blijven rechtop staan.
  function draai(kaart, r) {
    r = ((r % 4) + 4) % 4;
    if (!r) return kaart;
    const W = kaart.w;
    const H = kaart.h;
    const naar = [null, (x, y) => [y, H - 1 - x], (x, y) => [W - 1 - x, H - 1 - y], (x, y) => [W - 1 - y, x]][r];
    const via = f => (x, y) => f(...naar(x, y));
    const k = { ...kaart, w: r % 2 ? H : W, h: r % 2 ? W : H };
    for (const f of ['eigen', 'sleutel', 'land', 'vloer', 'stuk', 'ridder', 'brug']) if (kaart[f]) k[f] = via(kaart[f]);
    return k;
  }

  // Een eilandje zo groot mogelijk in een rechthoek van w x h pixels: geeft T, ox en oy.
  function pas(kaart, w, h) {
    const breed = (kaart.w + kaart.h) / 2;
    const hoog = breed * 0.5 + 2.6 + 0.12 * breed; // torens boven, eiland, rotspunt onder (in tegels)
    const T = Math.floor(Math.min(w / (breed + 0.6), h / (hoog + 0.6)));
    return { T, ox: w / 2 - ((kaart.w - kaart.h) * T) / 4, oy: Math.round((h - hoog * T) / 2 + T * 1.55) };
  }

  return { stuk, tegel, teken, gloeiers, gloei, hemel, wolk, vakjeOp, icoon, perceelKaart, eilandjeKaart, draai, pas, inhoud, hash, rng, shade };
})();
