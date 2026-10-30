// Low-poly tekenen: vormen als vlakjes (driehoeken), elk vlakje met één kleur volgens het licht.
// Zo lijkt een tekening 3D zonder 3D-motor: we tekenen één keer op een canvas en bakken dat (net als nu).
// LowPoly.bol(g, ...) een bolletje of ei, LowPoly.prisma(g, punten, ...) een plat stuk met afgeschuinde randen.
const LowPoly = (() => {
  // Het licht komt van linksboven en een beetje van voren.
  const L = (() => { const v = [-0.5, -0.7, 0.55]; const n = Math.hypot(...v); return v.map(x => x / n); })();
  const DONKER = [16, 14, 40];

  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  // Kleur van een vlakje met normaal n. neon: neonlicht van rechtsachter (het sci-fi randje).
  function kleur(basis, n, opt = {}) {
    const b = rgb(basis);
    const d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
    let c = d >= 0 ? mix(b, [255, 255, 255], Math.max(0, d - 0.55) * (opt.glans ?? 0.9)) : b;
    const diep = mix(b.map(v => v * 0.28), DONKER, 0.45);
    c = mix(c, diep, Math.min(0.85, (1 - Math.max(0, d)) * (opt.schaduw ?? 0.7)));
    if (opt.neon && n[0] > 0.25 && n[2] < 0.75) c = mix(c, rgb(opt.neon), Math.min(0.55, (n[0] - 0.25) * 0.9));
    return css(c);
  }

  // Een klein, vast toevalsgetal per hoekpunt: elke tekening ziet er altijd hetzelfde uit.
  const ruis = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) - 0.5; };

  function norm(a, b, c) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n) || 1;
    n = n.map(x => x / l);
    return n[2] < 0 ? n.map(x => -x) : n;
  }

  // Eén vlakje. De lijn in dezelfde kleur dicht de haarscheurtjes tussen de vlakjes.
  function vlak(g, pts, fill) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = fill;
    g.lineJoin = 'round';
    g.lineWidth = g.lpNaad || 0.5;
    g.stroke();
  }

  // Een bol (of ei) als facetten: ringen van hoekpunten op de voorkant van een ellipsoïde.
  // o.ringen, o.stukken: hoe fijn; o.draai: draaien in het vlak; o.ei: onderaan breder; o.kiel: vlakker (rz).
  function bol(g, cx, cy, rx, ry, basis, o = {}) {
    const R = o.ringen || 3;
    const S = o.stukken || 9;
    const rz = (o.kiel ?? 1) * Math.min(rx, ry);
    const rot = o.draai || 0;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const zaad = o.zaad ?? (cx * 7 + cy * 13);
    const ring = [];
    for (let i = 0; i <= R; i++) {
      const th = (i / R) * (Math.PI / 2);
      const pts = [];
      const n = i === 0 ? 1 : S;
      for (let j = 0; j < n; j++) {
        const ph = (j / S) * Math.PI * 2 + (i % 2) * (Math.PI / S) + (o.fase || 0);
        const j1 = i > 0 && i < R ? ruis(zaad + i, j) * (o.ruw ?? 0.16) : 0;
        let x = Math.sin(th) * Math.cos(ph) * (1 + j1);
        let y = Math.sin(th) * Math.sin(ph) * (1 + j1);
        const z = Math.cos(th);
        if (o.ei) x *= 1 + o.ei * y;
        const X = x * rx, Y = y * ry, Z = z * rz;
        pts.push([cx + X * cos - Y * sin, cy + X * sin + Y * cos, Z, X, Y]);
      }
      ring.push(pts);
    }
    const n3 = p => [p[3], p[4], p[2]];
    const draai = n => [n[0] * cos - n[1] * sin, n[0] * sin + n[1] * cos, n[2]];
    const teken = (a, b, c) => vlak(g, [a, b, c], kleur(basis, draai(norm(n3(a), n3(b), n3(c))), o));
    for (let i = 1; i <= R; i++) {
      const bin = ring[i - 1], uit = ring[i];
      for (let j = 0; j < S; j++) {
        const u0 = uit[j], u1 = uit[(j + 1) % S];
        if (i === 1) { teken(bin[0], u0, u1); continue; }
        const b0 = bin[j], b1 = bin[(j + 1) % S];
        // Om en om verschoven ringen: twee driehoeken per stukje.
        if (i % 2 === 0) { teken(b0, u0, u1); teken(b0, u1, b1); } else { teken(b0, u1, b1); teken(b0, u0, u1); }
      }
    }
  }

  // Een plat stuk (helm, schild, vleugel, zwaard) met afgeschuinde randen en een licht puntig midden.
  // o.rand: hoe breed de schuine rand is (0..1), o.punt: hoe hoog het midden uitsteekt, o.midden: [x, y] van de punt.
  function prisma(g, pts, basis, o = {}) {
    const n = pts.length / 2;
    const P = [];
    for (let i = 0; i < n; i++) P.push([pts[i * 2], pts[i * 2 + 1]]);
    let cx = 0, cy = 0;
    for (const p of P) { cx += p[0] / n; cy += p[1] / n; }
    if (o.midden) [cx, cy] = o.midden;
    const r = o.rand ?? 0.28;
    const I = P.map(p => [cx + (p[0] - cx) * (1 - r), cy + (p[1] - cy) * (1 - r)]);
    const grootte = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
    const h = (o.punt ?? 0.35) * grootte;
    const hr = (o.dik ?? 0.5) * grootte * r;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], c = I[(i + 1) % n], d = I[i];
      // Rand: de normaal wijst naar buiten en een beetje naar voren.
      let ex = b[1] - a[1], ey = -(b[0] - a[0]);
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      if (ex * mx + ey * my < 0) { ex = -ex; ey = -ey; }
      const l = Math.hypot(ex, ey) || 1;
      const nz = r * grootte / (hr || 1);
      const nl = Math.hypot(ex / l, ey / l, Math.min(2.5, nz) * 0.6) || 1;
      vlak(g, [a, b, c, d], kleur(basis, [ex / l / nl, ey / l / nl, Math.min(2.5, nz) * 0.6 / nl], o));
    }
    for (let i = 0; i < n; i++) {
      const a = I[i], b = I[(i + 1) % n];
      vlak(g, [a, b, [cx, cy]], kleur(basis, norm([a[0], a[1], 0], [b[0], b[1], 0], [cx, cy, h]), o));
    }
  }

  // Een buis of staart: dikker bij het begin, dunner aan het eind, als een rij prisma's.
  function buis(g, punten, dik0, dik1, basis, o = {}) {
    const n = punten.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const x0 = punten[i * 2], y0 = punten[i * 2 + 1], x1 = punten[i * 2 + 2], y1 = punten[i * 2 + 3];
      const t0 = i / (n - 1), t1 = (i + 1) / (n - 1);
      const w0 = dik0 + (dik1 - dik0) * t0, w1 = dik0 + (dik1 - dik0) * t1;
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      const nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
      prisma(g, [x0 + nx * w0, y0 + ny * w0, x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1, x0 - nx * w0, y0 - ny * w0], basis, { rand: 0.5, punt: 0.1, ...o });
    }
  }

  // Een gloed (gebakken, geen shadowBlur).
  function gloed(g, x, y, r, hex, a = 0.6) {
    const c = rgb(hex);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${c},${a})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Een donkere rand rond alles wat op het canvas staat, zodat het ook klein goed leesbaar is.
  function omlijn(c, dikte = 2, hex = '#0a1020') {
    const o = document.createElement('canvas');
    o.width = c.width;
    o.height = c.height;
    const g = o.getContext('2d');
    for (let a = 0; a < 8; a++) g.drawImage(c, Math.round(Math.cos(a * Math.PI / 4) * dikte), Math.round(Math.sin(a * Math.PI / 4) * dikte));
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = hex;
    g.fillRect(0, 0, o.width, o.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(c, 0, 0);
    return o;
  }

  return { bol, prisma, buis, gloed, omlijn, kleur, vlak };
})();
if (typeof window !== 'undefined') window.LowPoly = LowPoly;
