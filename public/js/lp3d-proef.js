// Proef: een ridder en een draakje als low-poly 3D-modellen (Lp3D), schattig met een grote kop. Nog niet in gebruik.
const Lp3DProef = (() => {
  const { model, bol, prisma, buis, M, T, Rx, Ry, Rz } = Lp3D;
  const METAAL = { staal: '#b8c4d8', goud: '#f0b43c', cyber: '#3a4460', kristal: '#9fe3f7' };
  const LEER = '#6a4428', GOUD = '#ffc94a', LAARS = '#2a3150';
  const rgbVan = hex => hex.match(/\w\w/g).map(h => parseInt(h, 16));
  const mixHex = (a, b, f) => '#' + rgbVan(a).map((v, i) => Math.round(v + (rgbVan(b)[i] - v) * f).toString(16).padStart(2, '0')).join('');

  // Ridder: voeten op y = 0, ongeveer 9 hoog, kijkt naar voren (+z). Zijn rechterhand is links op het scherm.
  function ridder(av) {
    const m = model();
    const Mt = METAAL[av.harnas] || METAAL.staal, C = av.kleur, V = av.vizier;
    const metaal = { kleur: Mt, metaal: 1 };
    const kleur = { kleur: C, metaal: 0.6 };

    // Laarzen en benen.
    for (const k of [-1, 1]) {
      bol(m, { op: [k * 0.52, 0.28, 0.12], r: [0.42, 0.3, 0.56], ringen: 6, stukken: 10, kleur: LAARS });
      buis(m, { pad: [[k * 0.5, 0.45, 0], [k * 0.5, 1.55, 0]], r: [0.33, 0.37], zijden: 9, ...metaal });
      bol(m, { op: [k * 0.52, 1.0, 0.28], r: [0.24, 0.22, 0.14], ringen: 4, stukken: 8, ...kleur });
    }
    // Cape als een gebogen doek achter de rug.
    if (av.rug === 'cape') {
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.32;
        prisma(m, { pts: [-0.22, 3.25, 0.22, 3.25, 0.3, 0.35, -0.3, 0.35], dik: 0.08, rand: 0.15, punt: 0.02, M: M(Ry(a), T(0, 0, -0.78 - (i % 2) * 0.06), Rx(-0.13)), kleur: C, metaal: 0.2 });
      }
    }
    if (av.rug === 'vleugels') {
      for (const k of [-1, 1]) {
        for (const [y, l, a] of [[0.4, 2.6, 0.5], [0, 2.1, 0.1], [-0.35, 1.5, -0.3]]) {
          prisma(m, { pts: [0, 0.18, k * l, y + 0.4, k * (l + 0.3), y, k * l * 0.6, y - 0.25, 0, -0.18], dik: 0.08, rand: 0.3, punt: 0.08, M: M(T(k * 0.45, 3.0, -0.75), Ry(k * -0.45), Rz(k * a * 0.4)), kleur: V, licht: 1 });
        }
        m.gloed.push({ p: [k * 1.6, 3.2, -1.2], r: 1.6, kleur: rgbVan(V) });
      }
    }
    // Heupen, riem en gesp.
    bol(m, { op: [0, 1.7, 0], r: [0.92, 0.42, 0.68], ringen: 6, stukken: 14, ...metaal });
    bol(m, { op: [0, 1.98, 0], r: [0.98, 0.17, 0.74], ringen: 4, stukken: 16, kleur: LEER });
    prisma(m, { pts: [-0.2, -0.15, 0.2, -0.15, 0.2, 0.15, -0.2, 0.15], dik: 0.12, rand: 0.3, punt: 0.04, M: T(0, 1.98, 0.74), kleur: GOUD, metaal: 1 });
    // Romp met borstplaat en kristal.
    bol(m, { op: [0, 2.65, 0], r: [1.0, 0.85, 0.74], ringen: 8, stukken: 16, ...metaal });
    prisma(m, { pts: [-0.72, 0.42, 0.72, 0.42, 0.62, -0.25, 0, -0.62, -0.62, -0.25], dik: 0.16, rand: 0.25, punt: 0.08, M: M(T(0, 2.75, 0.68), Rx(-0.12)), ...kleur });
    bol(m, { op: [0, 2.72, 0.86], r: [0.16, 0.2, 0.1], ringen: 4, stukken: 6, kleur: V, licht: 1, gloed: 0.55, gloedOp: [0, 2.72, 0.95] });
    // Armen en handschoenen.
    for (const k of [-1, 1]) {
      buis(m, { pad: [[k * 0.98, 3.1, 0], [k * 1.15, 2.55, 0.05], [k * 1.2, 2.05, 0.3]], r: [0.26, 0.22], zijden: 8, ...metaal });
      bol(m, { op: [k * 1.2, 1.9, 0.38], r: [0.27, 0.27, 0.27], ringen: 5, stukken: 8, kleur: '#4a5470', metaal: 0.5 });
    }
    // Schouderstukken.
    for (const k of [-1, 1]) {
      bol(m, { op: [k * 1.0, 3.18, 0], r: [0.55, 0.36, 0.55], ringen: 6, stukken: 12, ...kleur });
      bol(m, { op: [k * 1.08, 2.95, 0], r: [0.48, 0.22, 0.5], ringen: 4, stukken: 12, ...metaal });
    }
    // Wapen in de rechterhand.
    const hx = -1.2, hz = 0.45;
    if (av.wapen === 'licht') {
      buis(m, { pad: [[hx, 1.55, hz], [hx, 2.35, hz]], r: [0.11, 0.11], zijden: 8, kleur: '#3a4460', metaal: 1 });
      buis(m, { pad: [[hx, 2.35, hz], [hx, 4.6, hz]], r: [0.085, 0.06], zijden: 8, kleur: V, licht: 1 });
      m.gloed.push({ p: [hx, 3.5, hz], r: 1.3, kleur: rgbVan(V) });
    } else if (av.wapen === 'bijl') {
      buis(m, { pad: [[hx, 1.0, hz], [hx, 5.0, hz]], r: [0.08, 0.08], zijden: 7, kleur: '#7a4a24' });
      prisma(m, { pts: [0, 0.3, -0.9, 0.75, -1.15, 0, -0.9, -0.75, 0, -0.3], dik: 0.14, rand: 0.35, punt: 0.06, M: T(hx, 4.45, hz), ...metaal });
    } else {
      prisma(m, { pts: [0, 4.75, 0.17, 4.45, 0.17, 2.4, -0.17, 2.4, -0.17, 4.45], dik: 0.1, rand: 0.55, punt: 0.03, midden: [0, 3.6], M: T(hx, 0, hz), kleur: '#e4ebf5', metaal: 1 });
      buis(m, { pad: [[hx - 0.55, 2.35, hz], [hx + 0.55, 2.35, hz]], r: [0.08, 0.08], zijden: 6, kleur: GOUD, metaal: 1 });
      buis(m, { pad: [[hx, 2.3, hz], [hx, 1.55, hz]], r: [0.075, 0.075], zijden: 6, kleur: LEER });
      bol(m, { op: [hx, 1.5, hz], r: [0.12, 0.12, 0.12], ringen: 4, stukken: 6, kleur: GOUD, metaal: 1 });
    }
    // Schild aan de linkerarm: een metalen rand en een gekleurd vlak.
    const sm = M(T(1.45, 2.35, 0.55), Ry(0.5));
    const vorm = sc => [-0.75, 0.75, 0.75, 0.75, 0.75, -0.15, 0, -0.95, -0.75, -0.15].map(v => v * sc);
    prisma(m, { pts: vorm(1), dik: 0.18, rand: 0.12, punt: 0.03, M: sm, ...metaal });
    prisma(m, { pts: vorm(0.84), dik: 0.12, rand: 0.2, punt: 0.1, M: M(sm, T(0, 0, 0.08)), kleur: av.schild, metaal: 0.4 });
    const sv2 = M(sm, T(0, 0, 0.15));
    if (av.patroon === 'gedeeld') prisma(m, { pts: [0, 0.6, 0.6, 0.6, 0.6, -0.12, 0, -0.78], dik: 0.05, rand: 0.15, punt: 0.04, M: sv2, kleur: '#eef2f8' });
    else {
      prisma(m, { pts: [-0.1, 0.6, 0.1, 0.6, 0.1, -0.7, -0.1, -0.7], dik: 0.05, rand: 0.3, punt: 0.03, M: sv2, kleur: GOUD, metaal: 1 });
      prisma(m, { pts: [-0.6, 0.32, 0.6, 0.32, 0.6, 0.12, -0.6, 0.12], dik: 0.05, rand: 0.3, punt: 0.03, M: sv2, kleur: GOUD, metaal: 1 });
    }
    // Hoofd: een grote helm.
    const hy = 4.75;
    if (av.helm === 'open') {
      bol(m, { op: [0, hy, -0.12], r: [1.45, 1.5, 1.4], ringen: 10, stukken: 18, ...metaal });
      bol(m, { op: [0, hy - 0.15, 0.55], r: [1.02, 1.05, 0.9], ringen: 8, stukken: 14, kleur: av.huid });
      for (const k of [-1, 1]) {
        bol(m, { op: [k * 0.4, hy - 0.05, 1.38], r: [0.15, 0.21, 0.08], ringen: 4, stukken: 8, kleur: '#151a2c' });
        bol(m, { op: [k * 0.4 - 0.05, hy + 0.05, 1.45], r: [0.055, 0.06, 0.03], ringen: 3, stukken: 6, kleur: '#ffffff', licht: 1 });
        bol(m, { op: [k * 0.72, hy - 0.4, 1.18], r: [0.16, 0.09, 0.05], ringen: 3, stukken: 8, kleur: '#ff9cb0' });
      }
      bol(m, { op: [0, hy - 0.5, 1.4], r: [0.16, 0.05, 0.04], ringen: 3, stukken: 8, kleur: '#7a3a3a' });
      bol(m, { op: [0, hy + 0.62, 0.62], r: [1.18, 0.3, 0.95], ringen: 5, stukken: 16, ...metaal });
    } else {
      bol(m, { op: [0, hy, 0], r: [1.5, 1.55, 1.45], ringen: 10, stukken: 18, ...metaal });
      if (av.helm === 'spits') buis(m, { pad: [[0, hy + 1.1, 0], [0, hy + 2.3, -0.1]], r: [0.75, 0.02], zijden: 12, ...metaal });
      // Vizier: een gloeiende band met een metalen rand.
      bol(m, { op: [0, hy - 0.08, 1.02], r: [1.12, 0.36, 0.48], ringen: 4, stukken: 16, kleur: '#1a2036', metaal: 1 });
      bol(m, { op: [0, hy - 0.08, 1.12], r: [0.98, 0.2, 0.42], ringen: 4, stukken: 16, kleur: V, licht: 1, gloed: 1.3, gloedOp: [0, hy - 0.08, 1.5] });
      for (const k of [-1, 1]) bol(m, { op: [k * 1.42, hy - 0.05, 0.1], r: [0.14, 0.24, 0.24], ringen: 4, stukken: 8, kleur: GOUD, metaal: 1 });
      if (av.helm !== 'spits') prisma(m, { pts: [1.25, 0.25, 0.6, 0.62, -0.5, 0.62, -1.2, 0.2, -1.25, -0.2, 1.25, -0.2], dik: 0.16, rand: 0.25, punt: 0.03, M: M(T(0, hy + 1.35, 0), Ry(Math.PI / 2)), ...kleur });
    }
    // Versiering.
    if (av.accent === 'pluim') {
      const pad = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pad.push([0, hy + 1.55 + Math.sin(t * 2.6) * 0.7, 0.2 - t * 2.3]); }
      buis(m, { pad, r: [0.28, 0.06], zijden: 8, ...kleur });
    }
    if (av.accent === 'hoorns') {
      for (const k of [-1, 1]) {
        const pad = [];
        for (let i = 0; i <= 6; i++) { const t = i / 6; pad.push([k * (1.25 + t * 0.75), hy + 0.5 + t * t * 1.3, 0.1 + t * 0.2]); }
        buis(m, { pad, r: [0.26, 0.02], zijden: 8, kleur: '#f1e8d4' });
      }
    }
    if (av.accent === 'kroon') {
      buis(m, { pad: [[0, hy + 1.18, -0.1], [0, hy + 1.45, -0.1]], r: [0.88, 0.9], zijden: 16, kleur: GOUD, metaal: 1 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        buis(m, { pad: [[Math.cos(a) * 0.86, hy + 1.42, -0.1 + Math.sin(a) * 0.86], [Math.cos(a) * 0.92, hy + 1.85, -0.1 + Math.sin(a) * 0.92]], r: [0.13, 0.01], zijden: 5, kleur: GOUD, metaal: 1 });
      }
      bol(m, { op: [0, hy + 1.32, 0.8], r: [0.13, 0.13, 0.08], ringen: 4, stukken: 6, kleur: V, licht: 1 });
    }
    return m;
  }

  // Draakje: voeten op y = 0, kijkt naar voren. Fasen: 0 ei, 1 baby, 2 jong, 3 groot, 4 ridder.
  function draak(dier) {
    const m = model();
    const { a: A, b: B, g: G } = dier.kleuren;
    const f = dier.fase;
    const gl = (p, r) => m.gloed.push({ p, r, kleur: rgbVan(G) });
    if (!f) {
      bol(m, { op: [0, 1.75, 0], r: [1.25, 1.75, 1.25], ringen: 12, stukken: 18, ei: 0.12, kleur: B });
      const vlek = [[0.5, 2.4, 1], [-0.7, 1.4, 1], [1.1, 1.2, 0.4], [-1, 2.6, 0.2], [0.2, 1.0, -1], [-0.6, 2.2, -1], [1, 2.2, -0.9], [0, 3.1, 0.4]];
      for (const [x, y, z] of vlek) {
        const d = Math.hypot(x, z) || 1;
        const rr = 1.22 * Math.sin(Math.acos(Math.max(-1, Math.min(1, (y - 1.75) / 1.75)))) / d;
        bol(m, { op: [x * rr, y, z * rr], r: [0.24, 0.27, 0.24], ringen: 4, stukken: 8, kleur: A });
      }
      gl([0, 1.8, 1.3], 2.2);
      return m;
    }
    const s = [0, 0.8, 0.92, 1.05, 1.12][f];
    const kop = [0, 1.18, 1.08, 1.0, 1.0][f];
    const P = (x, y, z) => [x * s, y * s, z * s];
    const lijf = { kleur: A, metaal: 0.3 };
    // Staart, met een kristalpunt.
    const staart = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; staart.push(P(Math.sin(t * 2.2) * 1.6 * t, 0.7 + t * t * 1.4, -1.0 - t * 1.6)); }
    buis(m, { pad: staart, r: [0.55 * s, 0.1 * s], zijden: 9, ...lijf });
    const tip = staart[staart.length - 1];
    prisma(m, { pts: [0, 0.45, 0.3, 0, 0, -0.3, -0.3, 0], dik: 0.18, rand: 0.4, punt: 0.12, M: M(T(tip[0], tip[1] + 0.3 * s, tip[2]), Ry(-0.6), Rx(0.4)), kleur: G, licht: 1 });
    gl([tip[0], tip[1] + 0.3 * s, tip[2]], 0.9);
    // Vleugels vanaf jong.
    if (f >= 2) {
      const w = [0, 0, 0.8, 1, 1.15][f] * s;
      for (const k of [-1, 1]) {
        const vm = M(T(k * 0.45 * s, 2.55 * s, -0.75 * s), Ry(k * -0.5), Rz(k * 0.12));
        const vinger = [[1.4, 1.9], [2.5, 1.35], [2.6, 0.3], [1.7, -0.45]];
        const pts = [0, 0.15];
        for (const [x, y] of vinger) pts.push(k * x * w, y * w);
        pts.push(k * 0.5 * w, -0.5 * w);
        prisma(m, { pts, dik: 0.08, rand: 0.25, punt: 0.12, midden: [k * 1.2 * w, 0.6 * w], M: vm, kleur: mixHex(A, B, 0.45), metaal: 0.2 });
        for (const [x, y] of vinger) buis(m, { pad: [[0, 0.1, 0.02], [k * x * w, y * w, 0.02]], r: [0.11 * s, 0.04 * s], zijden: 6, M: vm, ...lijf });
      }
    }
    // Lijf, buik, pootjes.
    bol(m, { op: P(0, 1.6, 0), r: [1.22 * s, 1.3 * s, 1.1 * s], ringen: 10, stukken: 16, ...lijf });
    bol(m, { op: P(0, 1.5, 0.52), r: [0.82 * s, 1.0 * s, 0.68 * s], ringen: 8, stukken: 14, kleur: B, metaal: 0.2 });
    for (const k of [-1, 1]) {
      bol(m, { op: P(k * 0.82, 0.75, 0.1), r: [0.52 * s, 0.6 * s, 0.6 * s], ringen: 7, stukken: 12, ...lijf });
      bol(m, { op: P(k * 0.8, 0.2, 0.5), r: [0.42 * s, 0.22 * s, 0.5 * s], ringen: 6, stukken: 10, ...lijf });
      for (const d of [-0.18, 0, 0.18]) buis(m, { pad: [P(k * 0.8 + d, 0.18, 0.92), P(k * 0.8 + d * 1.15, 0.1, 1.12)], r: [0.07 * s, 0.01], zijden: 5, kleur: '#f4f0e6' });
      buis(m, { pad: [P(k * 0.95, 2.15, 0.3), P(k * 0.9, 1.7, 0.78)], r: [0.22 * s, 0.17 * s], zijden: 8, ...lijf });
      bol(m, { op: P(k * 0.88, 1.62, 0.86), r: [0.21 * s, 0.19 * s, 0.21 * s], ringen: 5, stukken: 8, ...lijf });
    }
    // Rugstekels die gloeien.
    for (let i = 0; i < 5; i++) {
      const a = 0.35 + i * 0.36;
      const y = 1.6 + Math.cos(a) * 1.25, z = -Math.sin(a) * 1.12;
      buis(m, { pad: [P(0, y, z), P(0, y + Math.cos(a) * 0.38, z - Math.sin(a) * 0.38)], r: [0.15 * s, 0.01], zijden: 6, kleur: G, licht: 1 });
    }
    // Kop.
    const ky = (2.7 + 0.75 * kop) * s;
    const K = (x, y, z) => [x * s * kop, ky + y * s * kop, (0.2 + z * kop) * s];
    for (const k of [-1, 1]) {
      const pad = [];
      for (let i = 0; i <= 5; i++) { const t = i / 5; pad.push(K(k * (0.45 + t * 0.3), 0.75 + t * (f >= 3 ? 0.9 : 0.6), -0.2 - t * t * 0.7)); }
      buis(m, { pad, r: [0.2 * s * kop, 0.02], zijden: 8, kleur: '#f4f0e6', metaal: 0.4 });
      buis(m, { pad: [K(k * 0.95, 0.15, -0.15), K(k * 1.5, 0.45, -0.35)], r: [0.24 * s * kop, 0.02], zijden: 4, ...lijf });
    }
    bol(m, { op: K(0, 0, 0), r: [1.15 * s * kop, 1.0 * s * kop, 1.02 * s * kop], ringen: 10, stukken: 18, ...lijf });
    bol(m, { op: K(0, -0.35, 0.78), r: [0.62 * s * kop, 0.42 * s * kop, 0.48 * s * kop], ringen: 7, stukken: 14, kleur: B, metaal: 0.2 });
    for (const k of [-1, 1]) bol(m, { op: K(k * 0.18, -0.2, 1.22), r: [0.06 * s, 0.04 * s, 0.03 * s], ringen: 3, stukken: 6, kleur: '#2a1840' });
    bol(m, { op: K(0, -0.58, 1.08), r: [0.2 * s, 0.05 * s, 0.05 * s], ringen: 3, stukken: 8, kleur: '#4a1e3a' });
    // Ogen: groot en glanzend.
    for (const k of [-1, 1]) {
      const e = K(k * 0.45, 0.12, 0.8);
      const r = 0.26 * s * kop;
      bol(m, { op: e, r: [r * 0.88, r * 1.1, r * 0.5], ringen: 6, stukken: 12, kleur: '#141a2c', metaal: 1 });
      bol(m, { op: [e[0], e[1] - r * 0.2, e[2] + r * 0.28], r: [r * 0.55, r * 0.6, r * 0.25], ringen: 5, stukken: 10, kleur: G, licht: 1 });
      bol(m, { op: [e[0] - r * 0.28, e[1] + r * 0.38, e[2] + r * 0.42], r: [r * 0.24, r * 0.24, r * 0.1], ringen: 3, stukken: 6, kleur: '#ffffff', licht: 1 });
      bol(m, { op: K(k * 0.78, -0.32, 0.62), r: [0.15 * s, 0.08 * s, 0.05 * s], ringen: 3, stukken: 8, kleur: '#ff9cb8' });
    }
    // Ridderfase: een kroontje.
    if (f >= 4) {
      buis(m, { pad: [K(0, 0.85, -0.05), K(0, 1.05, -0.05)], r: [0.55 * s, 0.56 * s], zijden: 14, kleur: GOUD, metaal: 1 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        buis(m, { pad: [K(Math.cos(a) * 0.53, 1.03, -0.05 + Math.sin(a) * 0.53), K(Math.cos(a) * 0.56, 1.35, -0.05 + Math.sin(a) * 0.56)], r: [0.1 * s, 0.01], zijden: 5, kleur: GOUD, metaal: 1 });
      }
    }
    return m;
  }

  return { ridder, draak };
})();
