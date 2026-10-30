// Low-poly in echte 3D, zonder 3D-motor: kleine modellen uit driehoekjes, getekend op een gewoon canvas.
// Elk vlakje krijgt één kleur volgens het licht, zodat je de facetten ziet. Je kunt een model rond draaien.
// In de spellen bakken we één tekening (Lp3D.bak), alleen op de ridder- en huisdierpagina draait het live.
// Bouwen: const m = Lp3D.model(); Lp3D.bol(m, {...}); Lp3D.prisma(m, {...}); Lp3D.buis(m, {...}).
// Tekenen: Lp3D.teken(g, m, { draai, kantel, schaal, x, y }).
const Lp3D = (() => {
  const DONKER = [16, 14, 40];
  const L = (() => { const v = [-0.45, 0.7, 0.6]; const n = Math.hypot(...v); return v.map(x => x / n); })();
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
  const ruis = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) - 0.5; };

  // ---------- Verplaatsen en draaien (3x4-matrices) ----------
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
  const Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; };
  const Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; };
  const Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; };
  const S = (x, y = x, z = x) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0];
  function mul(A, B) {
    const o = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c] + (c === 3 ? A[r * 4 + 3] : 0);
      }
    }
    return o;
  }
  // Van rechts naar links toepassen, zoals bij gewone matrices: M(T, Ry) draait eerst en verplaatst dan.
  const M = (...ms) => ms.reduce((a, b) => mul(a, b), I());
  const pas = (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]];

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const kruis = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const eenheid = u => { const l = Math.hypot(...u) || 1; return u.map(x => x / l); };

  function model() { return { v: [], f: [], gloed: [] }; }

  // Hoekpunten en vlakjes toevoegen. Elk vlakje wijst naar buiten (weg van zijn eigen middelpunt).
  function voegToe(m, pts, vlakken, o) {
    const mat = o.M || I();
    const basis = m.v.length;
    for (const p of pts) m.v.push(pas(mat, p));
    const kleur = rgb(o.kleur);
    const neon = o.neon ? rgb(o.neon) : null;
    for (const [a, b, c, mid] of vlakken) {
      const A = m.v[basis + a], B = m.v[basis + b], C = m.v[basis + c];
      const n = kruis(sub(B, A), sub(C, A));
      const z = pas(mat, mid);
      const zw = [(A[0] + B[0] + C[0]) / 3 - z[0], (A[1] + B[1] + C[1]) / 3 - z[1], (A[2] + B[2] + C[2]) / 3 - z[2]];
      const f = dot(n, zw) < 0 ? [basis + a, basis + c, basis + b] : [basis + a, basis + b, basis + c];
      m.f.push({ i: f, kleur, neon, licht: o.licht || 0, glans: o.glans ?? 0.9, schaduw: o.schaduw ?? 0.7, metaal: o.metaal ? 1 : 0, lijn: o.lijn ?? true });
    }
    if (o.gloed) m.gloed.push({ p: pas(mat, o.gloedOp || [0, 0, 0]), r: o.gloed, kleur: rgb(o.neon || o.kleur) });
  }

  // Een bol of ei. o.op: middelpunt, o.r: [rx, ry, rz], o.ringen/o.stukken: hoe fijn, o.ruw: hoe hobbelig.
  function bol(m, o) {
    const [cx, cy, cz] = o.op || [0, 0, 0];
    const [rx, ry, rz] = o.r;
    const R = o.ringen || 5, N = o.stukken || 10;
    const zaad = o.zaad ?? (cx * 7.3 + cy * 3.1 + cz * 5.7);
    const pts = [[cx, cy + ry, cz]];
    for (let i = 1; i < R; i++) {
      const th = (i / R) * Math.PI;
      for (let j = 0; j < N; j++) {
        const ph = (j / N) * Math.PI * 2 + (i % 2) * (Math.PI / N);
        const k = 1 + ruis(zaad + i, j) * (o.ruw ?? 0.04);
        let y = Math.cos(th);
        if (o.ei) y += o.ei * Math.sin(th) * Math.sin(th) * 0;
        const breed = Math.sin(th) * (o.ei ? 1 - o.ei * Math.cos(th) : 1);
        pts.push([cx + Math.cos(ph) * breed * rx * k, cy + y * ry * k, cz + Math.sin(ph) * breed * rz * k]);
      }
    }
    pts.push([cx, cy - ry, cz]);
    const onder = pts.length - 1;
    const mid = [cx, cy, cz];
    const vl = [];
    const p = (i, j) => 1 + (i - 1) * N + ((j % N) + N) % N;
    for (let j = 0; j < N; j++) vl.push([0, p(1, j), p(1, j + 1), mid]);
    for (let i = 1; i < R - 1; i++) {
      for (let j = 0; j < N; j++) {
        if (i % 2) { vl.push([p(i, j), p(i + 1, j), p(i + 1, j + 1), mid]); vl.push([p(i, j), p(i + 1, j + 1), p(i, j + 1), mid]); } else { vl.push([p(i, j), p(i + 1, j - 1), p(i + 1, j), mid]); vl.push([p(i, j), p(i + 1, j), p(i, j + 1), mid]); }
      }
    }
    for (let j = 0; j < N; j++) vl.push([onder, p(R - 1, j), p(R - 1, j + 1), mid]);
    voegToe(m, pts, vl, o);
  }

  // Een plat stuk met dikte (schild, zwaard, vleugel): een veelhoek in het xy-vlak, o.dik dik,
  // met een afgeschuinde rand (o.rand) en een licht puntig midden (o.punt) voor en achter.
  function prisma(m, o) {
    const n = o.pts.length / 2;
    const P = [];
    for (let i = 0; i < n; i++) P.push([o.pts[i * 2], o.pts[i * 2 + 1]]);
    let cx = 0, cy = 0;
    for (const p of P) { cx += p[0] / n; cy += p[1] / n; }
    if (o.midden) [cx, cy] = o.midden;
    const d = (o.dik ?? 0.3) / 2, r = o.rand ?? 0.25, h = o.punt ?? 0.15;
    const pts = [];
    for (const z of [d, -d]) {
      for (const p of P) pts.push([p[0], p[1], z * 0.55]);
      for (const p of P) pts.push([cx + (p[0] - cx) * (1 - r), cy + (p[1] - cy) * (1 - r), z]);
      pts.push([cx, cy, z + Math.sign(z) * h]);
    }
    const stap = 2 * n + 1;
    const vl = [];
    const mid = [cx, cy, 0];
    for (let k = 0; k < 2; k++) {
      const b = k * stap;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        vl.push([b + i, b + j, b + n + j, mid], [b + i, b + n + j, b + n + i, mid]);
        vl.push([b + n + i, b + n + j, b + 2 * n, mid]);
      }
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      vl.push([i, j, stap + j, mid], [i, stap + j, stap + i, mid]);
    }
    voegToe(m, pts, vl, { lijn: false, ...o });
  }

  // Een buis langs punten (arm, been, staart, hoorn). o.r: [dikte begin, dikte eind], o.zijden: hoeveel kanten.
  function buis(m, o) {
    const pad = o.pad;
    const N = o.zijden || 6;
    const pts = [];
    const vl = [];
    const [r0, r1] = o.r;
    let vorigU = null;
    for (let i = 0; i < pad.length; i++) {
      const a = pad[Math.max(0, i - 1)], b = pad[Math.min(pad.length - 1, i + 1)];
      const t = eenheid(sub(b, a));
      let u = vorigU ? eenheid(sub(vorigU, t.map(x => x * dot(vorigU, t)))) : eenheid(kruis(t, Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
      vorigU = u;
      const w = kruis(t, u);
      const r = r0 + (r1 - r0) * (i / (pad.length - 1));
      for (let j = 0; j < N; j++) {
        const ph = (j / N) * Math.PI * 2;
        const k = 1 + ruis(i * 3.3 + pad[i][0], j) * (o.ruw ?? 0.02);
        pts.push([0, 1, 2].map(x => pad[i][x] + (u[x] * Math.cos(ph) + w[x] * Math.sin(ph)) * r * k));
      }
    }
    for (let i = 0; i < pad.length - 1; i++) {
      const mid = pad[i].map((v, x) => (v + pad[i + 1][x]) / 2);
      for (let j = 0; j < N; j++) {
        const a = i * N + j, b = i * N + (j + 1) % N;
        vl.push([a, b, b + N, mid], [a, b + N, a + N, mid]);
      }
    }
    // Doppen: het begin plat, het eind plat of een punt.
    pts.push(pad[0].slice());
    const e = pad[pad.length - 1], v = pad[pad.length - 2];
    pts.push(e.map((x, k) => x + (x - v[k]) * 0.05));
    const c0 = pts.length - 2, c1 = pts.length - 1, laatste = (pad.length - 1) * N;
    for (let j = 0; j < N; j++) {
      vl.push([c0, j, (j + 1) % N, pad[1]]);
      vl.push([c1, laatste + j, laatste + (j + 1) % N, v]);
    }
    voegToe(m, pts, vl, o);
  }

  // ---------- Tekenen ----------

  function kleurVan(f, n) {
    const d = dot(n, L);
    const b = f.kleur;
    if (f.licht) return mix(b, [255, 255, 255], Math.max(0, d) * 0.35 * f.licht);
    let c = d >= 0 ? mix(b, [255, 255, 255], Math.max(0, d - 0.55) * f.glans) : b;
    const diep = mix(b.map(v => v * 0.28), DONKER, 0.45);
    c = mix(c, diep, Math.min(0.85, (1 - Math.max(0, d)) * f.schaduw));
    // Neonrandje van rechts: het sci-fi kantje.
    if (f.neon && n[0] > 0.3 && n[2] < 0.8) c = mix(c, f.neon, Math.min(0.6, (n[0] - 0.3) * 1.1));
    return c;
  }

  // o.draai: rond (radialen), o.kantel: van boven bekijken, o.schaal: pixels per eenheid, (o.x, o.y): waar de oorsprong komt.
  function teken(g, m, o = {}) {
    const cy = Math.cos(o.draai || 0), sy = Math.sin(o.draai || 0);
    const cp = Math.cos(o.kantel ?? 0.18), sp = Math.sin(o.kantel ?? 0.18);
    const s = o.schaal || 10, ox = o.x || 0, oy = o.y || 0;
    const V = m.v.map(p => {
      const x = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z1 * sp;
      const z = p[1] * sp + z1 * cp;
      return [x, y, z];
    });
    const lijst = [];
    for (const f of m.f) {
      const A = V[f.i[0]], B = V[f.i[1]], C = V[f.i[2]];
      const n = kruis(sub(B, A), sub(C, A));
      if (n[2] <= 0) continue;
      lijst.push([A[2] + B[2] + C[2], f, eenheid(n), A, B, C]);
    }
    lijst.sort((a, b) => a[0] - b[0]);
    g.lineJoin = 'round';
    g.lineWidth = o.naad ?? 0.8;
    for (const [, f, n, A, B, C] of lijst) {
      const c = kleurVan(f, n);
      const css = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      g.beginPath();
      g.moveTo(ox + A[0] * s, oy - A[1] * s);
      g.lineTo(ox + B[0] * s, oy - B[1] * s);
      g.lineTo(ox + C[0] * s, oy - C[1] * s);
      g.closePath();
      g.fillStyle = css;
      g.strokeStyle = css;
      g.fill();
      g.stroke();
    }
    // Gloed van lampjes en kristallen die naar je toe staan (gewone verlopen, geen shadowBlur).
    g.globalCompositeOperation = 'lighter';
    for (const gl of m.gloed) {
      const p = gl.p;
      const x = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z1 * sp, z = p[1] * sp + z1 * cp;
      if (z1 < 0) continue;
      const px = ox + x * s, py = oy - y * s, r = gl.r * s;
      const gr = g.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, `rgba(${gl.kleur},0.45)`);
      gr.addColorStop(1, `rgba(${gl.kleur},0)`);
      g.fillStyle = gr;
      g.fillRect(px - r, py - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
    return lijst.length;
  }

  // Een donkere rand rond alles, zodat het ook klein leesbaar blijft.
  // doel: een canvas om opnieuw te gebruiken (bij live draaien), anders een nieuw.
  function omlijn(c, dikte = 2, hex = '#0a1020', doel = null) {
    const o = doel || document.createElement('canvas');
    if (o.width !== c.width) o.width = c.width;
    if (o.height !== c.height) o.height = c.height;
    const g = o.getContext('2d');
    g.clearRect(0, 0, o.width, o.height);
    for (let a = 0; a < 8; a++) g.drawImage(c, Math.round(Math.cos(a * Math.PI / 4) * dikte), Math.round(Math.sin(a * Math.PI / 4) * dikte));
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = hex;
    g.fillRect(0, 0, o.width, o.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(c, 0, 0);
    return o;
  }

  // Eén vaste tekening voor de spellen: b x h pixels, model van hoogte 'hoog' eenheden met de voeten onderaan.
  function bak(m, b, h, o = {}) {
    const c = document.createElement('canvas');
    c.width = b;
    c.height = h;
    const s = (h * 0.9) / (o.hoog || 17);
    teken(c.getContext('2d'), m, { draai: o.draai ?? 0.35, kantel: o.kantel, schaal: s, x: b / 2, y: h * 0.96 });
    return omlijn(c, Math.max(1, Math.round(h / 90)));
  }

  return { model, bol, prisma, buis, teken, bak, omlijn, M, T, Rx, Ry, Rz, S };
})();
if (typeof window !== 'undefined') window.Lp3D = Lp3D;
