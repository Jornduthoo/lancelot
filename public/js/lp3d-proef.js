// Proef: een ridder en een draakje als echte low-poly 3D-modellen (Lp3D). Nog niet in gebruik in LANcelot.
const Lp3DProef = (() => {
  const { model, bol, prisma, buis, M, T, Rx, Ry, Rz } = Lp3D;
  const METAAL = { staal: '#a9b6cc', goud: '#e9b23a', cyber: '#3d4763', kristal: '#8fdcf5' };
  const LEER = '#5a3a22', GOUD = '#ffc94a', LAARS = '#2b3550';

  // Ridder: voeten op y = 0, ongeveer 17 hoog, kijkt naar voren (+z). Zijn rechterhand is links op het scherm.
  function ridder(av) {
    const m = model();
    const Mt = METAAL[av.harnas] || METAAL.staal, C = av.kleur, V = av.vizier;
    const metaal = { kleur: Mt, neon: V };
    const fijn = { ringen: 6, stukken: 12 };

    // Benen, kniestukken en laarzen.
    for (const k of [-1, 1]) {
      buis(m, { pad: [[k * 1, 6.4, 0], [k * 1.08, 3.6, 0.1], [k * 1, 1.1, 0]], r: [0.78, 0.6], zijden: 8, ...metaal });
      bol(m, { op: [k * 1.08, 3.6, 0.45], r: [0.62, 0.55, 0.45], ringen: 4, stukken: 8, kleur: C, neon: V });
      bol(m, { op: [k * 1.02, 0.5, 0.3], r: [0.8, 0.55, 1.15], ringen: 4, stukken: 9, kleur: LAARS });
      buis(m, { pad: [[k * 1, 1.0, 0], [k * 1, 1.5, 0]], r: [0.75, 0.72], zijden: 8, kleur: LAARS });
    }
    // Heupen, riem en gesp.
    bol(m, { op: [0, 6.4, 0], r: [2.05, 1.0, 1.3], ...fijn, ...metaal });
    bol(m, { op: [0, 7.0, 0], r: [2.15, 0.38, 1.4], ringen: 3, stukken: 14, kleur: LEER, ruw: 0.03 });
    prisma(m, { pts: [-0.45, 6.65, 0.45, 6.65, 0.45, 7.35, -0.45, 7.35], dik: 0.3, M: T(0, 0, 1.4), kleur: GOUD });
    // Romp met borstplaat en kristal.
    bol(m, { op: [0, 8.9, 0], r: [2.25, 2.15, 1.45], ...fijn, ...metaal });
    prisma(m, { pts: [-1.7, 10.4, 1.7, 10.4, 1.5, 8.4, 0, 7.4, -1.5, 8.4], dik: 0.45, rand: 0.3, punt: 0.25, M: T(0, 0, 1.25), kleur: C, neon: V });
    bol(m, { op: [0, 9.1, 1.75], r: [0.38, 0.5, 0.28], ringen: 3, stukken: 6, kleur: V, licht: 1, gloed: 1.4, gloedOp: [0, 9.1, 1.9] });
    // Cape of lichtvleugels op de rug.
    if (av.rug === 'cape') {
      for (let i = 0; i < 5; i++) {
        const x0 = -2 + i * 0.8;
        const uit = (i - 2) * 0.35;
        prisma(m, { pts: [x0, 10.4, x0 + 0.85, 10.4, x0 + 0.85 + uit * 0.9, 0.9, x0 + uit * 0.9, 0.9], dik: 0.16, rand: 0.2, punt: 0.05, M: M(T(0, 0, -1.45 - (i % 2) * 0.2), Rx(-0.12)), kleur: C, schaduw: 0.8 });
      }
    }
    if (av.rug === 'vleugels') {
      for (const k of [-1, 1]) {
        prisma(m, { pts: [0, 0, k * 4.2, 3.4, k * 5.6, 1.2, k * 4.4, -2.2, k * 1.4, -3.4], dik: 0.25, rand: 0.35, punt: 0.3, M: M(T(k * 0.8, 9.6, -1.4), Ry(k * 0.5)), kleur: V, licht: 0.6, gloed: 2.6, gloedOp: [k * 3, 0, 0] });
      }
    }
    // Armen met elleboogstukken en handschoenen.
    for (const k of [-1, 1]) {
      buis(m, { pad: [[k * 2.45, 9.9, 0], [k * 2.8, 7.9, 0.1], [k * 2.65, 6.1, 0.55]], r: [0.6, 0.48], zijden: 7, ...metaal });
      bol(m, { op: [k * 2.85, 7.9, 0.15], r: [0.5, 0.5, 0.5], ringen: 4, stukken: 7, kleur: C, neon: V });
      bol(m, { op: [k * 2.65, 5.75, 0.65], r: [0.62, 0.62, 0.62], ringen: 4, stukken: 8, kleur: '#4a5470', neon: V });
    }
    // Schouderstukken in twee lagen.
    for (const k of [-1, 1]) {
      bol(m, { op: [k * 2.45, 10.3, 0], r: [1.3, 0.9, 1.25], ringen: 5, stukken: 10, kleur: C, neon: V });
      bol(m, { op: [k * 2.7, 9.7, 0], r: [1.15, 0.6, 1.1], ringen: 4, stukken: 10, ...metaal });
    }
    // Wapen in de rechterhand.
    const hand = [-2.65, 5.75, 0.65];
    if (av.wapen === 'licht') {
      buis(m, { pad: [[hand[0], 5.0, 0.9], [hand[0], 6.5, 0.9]], r: [0.28, 0.28], zijden: 6, kleur: '#3d4763' });
      buis(m, { pad: [[hand[0], 6.5, 0.9], [hand[0], 14.2, 0.9]], r: [0.22, 0.16], zijden: 6, kleur: V, licht: 1.2, gloed: 2.4, gloedOp: [hand[0], 10.5, 0.9] });
    } else if (av.wapen === 'bijl') {
      buis(m, { pad: [[hand[0], 3.8, 0.9], [hand[0], 13.6, 0.9]], r: [0.2, 0.2], zijden: 6, kleur: '#7a4a24' });
      prisma(m, { pts: [0, 0.6, -2.4, 1.6, -2.9, 0, -2.4, -1.6, 0, -0.6], dik: 0.3, rand: 0.35, punt: 0.2, M: T(hand[0], 12.3, 0.9), ...metaal });
    } else {
      prisma(m, { pts: [0, 14.6, 0.42, 13.7, 0.42, 6.9, -0.42, 6.9, -0.42, 13.7], dik: 0.22, rand: 0.5, punt: 0.08, midden: [0, 10.5], M: T(hand[0], 0, 0.9), kleur: '#dfe7f2' });
      buis(m, { pad: [[hand[0] - 1.4, 6.8, 0.9], [hand[0] + 1.4, 6.8, 0.9]], r: [0.2, 0.2], zijden: 6, kleur: GOUD });
      buis(m, { pad: [[hand[0], 6.7, 0.9], [hand[0], 4.9, 0.9]], r: [0.2, 0.2], zijden: 6, kleur: LEER });
      bol(m, { op: [hand[0], 4.75, 0.9], r: [0.3, 0.3, 0.3], ringen: 3, stukken: 6, kleur: GOUD });
    }
    // Schild aan de linkerarm.
    const sm = M(T(3.25, 7.4, 1.0), Ry(0.55));
    const sp = M(sm, T(0, 0, 0.14));
    prisma(m, { pts: [-1.7, 1.6, 1.7, 1.6, 1.7, -0.4, 0, -2.3, -1.7, -0.4], dik: 0.4, rand: 0.18, punt: 0.3, midden: [0, 0.2], M: sm, kleur: av.schild });
    if (av.patroon === 'gedeeld') prisma(m, { pts: [0.1, 1.35, 1.45, 1.35, 1.45, -0.35, 0.1, -1.9], dik: 0.3, rand: 0.2, punt: 0.12, M: sp, kleur: '#e8edf5' });
    else {
      prisma(m, { pts: [-0.28, 1.35, 0.28, 1.35, 0.28, -1.9, -0.28, -1.9], dik: 0.3, rand: 0.4, punt: 0.1, M: sp, kleur: GOUD });
      prisma(m, { pts: [-1.4, 0.75, 1.4, 0.75, 1.4, 0.2, -1.4, 0.2], dik: 0.3, rand: 0.4, punt: 0.1, M: sp, kleur: GOUD });
    }
    bol(m, { op: [0, 0.45, 0.3], r: [0.42, 0.42, 0.3], ringen: 3, stukken: 7, kleur: GOUD, M: sm });
    // Hals en hoofd.
    buis(m, { pad: [[0, 10.6, 0], [0, 11.2, 0]], r: [0.7, 0.7], zijden: 8, ...metaal });
    if (av.helm === 'open') {
      bol(m, { op: [0, 12.5, -0.2], r: [1.75, 1.95, 1.65], ...fijn, ...metaal });
      bol(m, { op: [0, 12.2, 0.75], r: [1.2, 1.35, 1.0], ringen: 5, stukken: 10, kleur: av.huid, ruw: 0.05 });
      for (const k of [-1, 1]) {
        bol(m, { op: [k * 0.45, 12.4, 1.68], r: [0.17, 0.24, 0.1], ringen: 3, stukken: 6, kleur: '#141a2a' });
        bol(m, { op: [k * 0.45 - 0.05, 12.48, 1.76], r: [0.06, 0.07, 0.04], ringen: 2, stukken: 4, kleur: '#ffffff', licht: 1 });
      }
      bol(m, { op: [0, 11.85, 1.72], r: [0.16, 0.14, 0.12], ringen: 3, stukken: 5, kleur: av.huid });
      buis(m, { pad: [[-1.75, 13.35, 0.2], [0, 13.6, 1.25], [1.75, 13.35, 0.2]], r: [0.32, 0.32], zijden: 5, ...metaal });
    } else if (av.helm === 'spits') {
      bol(m, { op: [0, 12.3, 0], r: [1.75, 2.0, 1.8], ...fijn, ...metaal });
      buis(m, { pad: [[0, 13.6, 0], [0, 15.6, -0.1]], r: [1.2, 0.05], zijden: 8, ...metaal });
      bol(m, { op: [0, 12.2, 1.45], r: [1.35, 0.32, 0.55], ringen: 3, stukken: 10, kleur: V, licht: 1, gloed: 2, gloedOp: [0, 12.2, 1.8] });
      prisma(m, { pts: [-0.18, 12, 0.18, 12, 0.18, 10.6, -0.18, 10.6], dik: 0.25, M: T(0, 0, 1.75), ...metaal });
    } else {
      bol(m, { op: [0, 12.4, 0], r: [1.8, 2.0, 1.8], ...fijn, ...metaal });
      bol(m, { op: [0, 12.25, 1.45], r: [1.4, 0.36, 0.58], ringen: 3, stukken: 10, kleur: V, licht: 1, gloed: 2, gloedOp: [0, 12.25, 1.8] });
      prisma(m, { pts: [0, 14.5, 1.9, 14.1, 2.1, 12.6, -1.6, 12.6, -1.9, 14.1], dik: 0.32, rand: 0.3, punt: 0.1, M: M(T(0, 0, 0), Ry(Math.PI / 2), T(0, 0, 0)), kleur: C, neon: V });
    }
    // Versiering.
    if (av.accent === 'pluim') buis(m, { pad: [[0, 14.2, 0.3], [0, 15.4, -0.4], [0, 15.5, -1.8], [0, 14.3, -2.9]], r: [0.55, 0.12], zijden: 6, kleur: C, neon: V });
    if (av.accent === 'hoorns') for (const k of [-1, 1]) buis(m, { pad: [[k * 1.5, 13.2, 0], [k * 2.6, 14.1, 0.1], [k * 2.8, 15.6, 0.2]], r: [0.42, 0.04], zijden: 6, kleur: '#efe6d2' });
    if (av.accent === 'kroon') {
      buis(m, { pad: [[0, 13.9, 0], [0, 14.35, 0]], r: [1.5, 1.5], zijden: 10, kleur: GOUD });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        buis(m, { pad: [[Math.cos(a) * 1.45, 14.3, Math.sin(a) * 1.45], [Math.cos(a) * 1.5, 15.1, Math.sin(a) * 1.5]], r: [0.3, 0.02], zijden: 4, kleur: GOUD });
      }
      bol(m, { op: [0, 14.15, 1.55], r: [0.22, 0.22, 0.15], ringen: 3, stukken: 6, kleur: V, licht: 1 });
    }
    return m;
  }

  // Draakje: voeten op y = 0, kijkt naar voren. Fasen: 0 ei, 1 baby, 2 jong, 3 groot, 4 ridder.
  function draak(dier) {
    const m = model();
    const { a: A, b: B, g: G } = dier.kleuren;
    const f = dier.fase;
    if (!f) {
      bol(m, { op: [0, 3.4, 0], r: [2.3, 3.2, 2.3], ringen: 8, stukken: 14, ei: 0.12, kleur: B, neon: G, schaduw: 0.5 });
      const vlek = [[0.6, 4.4, 1], [-0.9, 2.6, 1], [1.4, 2.2, 0.4], [-1.2, 4.9, 0.2], [0.2, 2.0, -1], [-0.8, 3.9, -1], [1.2, 4.1, -0.9]];
      for (const [x, y, z] of vlek) {
        const d = Math.hypot(x, z) || 1;
        const r = 2.3 / d;
        bol(m, { op: [x * r * 0.98, y, z * r * 0.98], r: [0.45, 0.5, 0.45], ringen: 3, stukken: 6, kleur: A, neon: G });
      }
      return m;
    }
    const s = [0, 0.82, 0.95, 1.08, 1.15][f];
    const kop = [0, 1.22, 1.1, 1.0, 1.0][f];
    const T0 = (x, y, z) => [x * s, y * s, z * s];
    const lijf = { kleur: A, neon: G };
    // Staart met stekels en een kristalpunt.
    const staart = [T0(0, 2.1, -1.6), T0(0.6, 1.3, -3.2), T0(2, 1.0, -4.1), T0(3.4, 1.6, -4.1), T0(4.1, 2.8, -3.6)];
    buis(m, { pad: staart, r: [1.0 * s, 0.25 * s], zijden: 8, ...lijf });
    prisma(m, { pts: [0, 1.1, 0.75, 0, 0, -0.7, -0.75, 0], dik: 0.35, rand: 0.35, punt: 0.25, M: M(T(...T0(4.4, 3.4, -3.4)), Ry(-0.6)), kleur: G, licht: 0.7, gloed: 1.2 });
    // Vleugels vanaf jong: botjes en vlies.
    if (f >= 2) {
      const w = [0, 0, 0.75, 1, 1.15][f] * s;
      for (const k of [-1, 1]) {
        const vm = M(T(k * 0.9 * s, 4.8 * s, -1.7 * s), Ry(k * -0.35), Rz(k * 0.15));
        prisma(m, { pts: [0, 0, k * 3 * w, 3.4 * w, k * 5.2 * w, 2.6 * w, k * 4.6 * w, 0.4 * w, k * 3.2 * w, -0.4 * w, k * 1.6 * w, -1.4 * w], dik: 0.18, rand: 0.3, punt: 0.12, M: vm, kleur: A, neon: G, schaduw: 0.6 });
        buis(m, { pad: [[0, 0, 0], [k * 3 * w, 3.4 * w, 0.1], [k * 5.2 * w, 2.6 * w, 0.1]], r: [0.28 * s, 0.1 * s], zijden: 5, M: vm, kleur: B });
      }
    }
    // Lijf en buik.
    bol(m, { op: T0(0, 3.2, 0), r: [2.4 * s, 2.6 * s, 2.2 * s], ringen: 7, stukken: 12, ...lijf });
    bol(m, { op: T0(0, 3.0, 1.05), r: [1.6 * s, 2.0 * s, 1.35 * s], ringen: 5, stukken: 10, kleur: B, schaduw: 0.45 });
    // Achterpoten met klauwtjes, voorpootjes.
    for (const k of [-1, 1]) {
      bol(m, { op: T0(k * 1.65, 1.5, 0.2), r: [1.0 * s, 1.15 * s, 1.15 * s], ringen: 5, stukken: 9, ...lijf });
      bol(m, { op: T0(k * 1.55, 0.38, 0.95), r: [0.78 * s, 0.4 * s, 0.95 * s], ringen: 4, stukken: 8, ...lijf });
      for (const d of [-0.35, 0, 0.35]) buis(m, { pad: [T0(k * 1.55 + d, 0.35, 1.7), T0(k * 1.55 + d * 1.2, 0.2, 2.15)], r: [0.15 * s, 0.01], zijden: 4, kleur: B });
      buis(m, { pad: [T0(k * 1.9, 4.3, 0.6), T0(k * 1.75, 3.4, 1.55)], r: [0.45 * s, 0.35 * s], zijden: 7, ...lijf });
      bol(m, { op: T0(k * 1.7, 3.25, 1.75), r: [0.42 * s, 0.38 * s, 0.42 * s], ringen: 3, stukken: 7, ...lijf });
    }
    // Rugstekels.
    for (let i = 0; i < 5; i++) {
      const y = 6.8 - i * 1.1, z = -1.3 - i * 0.35 + (i > 2 ? 0.2 : 0);
      buis(m, { pad: [T0(0, y, z), T0(0, y + 0.2, z - 0.75)], r: [0.32 * s, 0.01], zijden: 4, kleur: G, licht: 0.4 });
    }
    // Kop.
    const ky = (5.4 + 1.4 * kop) * s;
    const K = (x, y, z) => [x * s * kop, ky + y * s * kop, (0.3 + z * kop) * s];
    for (const k of [-1, 1]) {
      buis(m, { pad: [K(k * 0.9, 1.2, -0.4), K(k * 1.25, 2.0, -1.0), K(k * 1.2, f >= 3 ? 2.9 : 2.4, -1.6)], r: [0.38 * s * kop, 0.02], zijden: 6, kleur: B });
      buis(m, { pad: [K(k * 1.6, 0.35, -0.3), K(k * 2.7, 1.0, -0.6)], r: [0.5 * s * kop, 0.02], zijden: 4, ...lijf });
    }
    bol(m, { op: K(0, 0, 0), r: [2.2 * s * kop, 1.9 * s * kop, 1.95 * s * kop], ringen: 7, stukken: 13, ...lijf });
    bol(m, { op: K(0, -0.65, 1.55), r: [1.2 * s * kop, 0.8 * s * kop, 0.9 * s * kop], ringen: 5, stukken: 10, kleur: B, schaduw: 0.45 });
    for (const k of [-1, 1]) bol(m, { op: K(k * 0.35, -0.35, 2.4), r: [0.12 * s, 0.09 * s, 0.08 * s], ringen: 2, stukken: 5, kleur: '#1a1030' });
    // Ogen: groot en glanzend, met een neon-iris en een glinstering.
    for (const k of [-1, 1]) {
      const e = K(k * 0.85, 0.25, 1.55);
      const r = 0.5 * s * kop;
      bol(m, { op: e, r: [r * 0.9, r * 1.1, r * 0.55], ringen: 4, stukken: 8, kleur: '#141a2a', glans: 1.2 });
      bol(m, { op: [e[0], e[1] - r * 0.15, e[2] + r * 0.35], r: [r * 0.55, r * 0.62, r * 0.3], ringen: 3, stukken: 7, kleur: G, licht: 1 });
      bol(m, { op: [e[0] - r * 0.3, e[1] + r * 0.4, e[2] + r * 0.55], r: [r * 0.22, r * 0.22, r * 0.12], ringen: 2, stukken: 5, kleur: '#ffffff', licht: 1.5 });
      bol(m, { op: K(k * 1.45, -0.55, 1.35), r: [0.28 * s, 0.16 * s, 0.1 * s], ringen: 2, stukken: 6, kleur: '#ff8fb0', ruw: 0, schaduw: 0.3 });
    }
    // Ridderfase: een kroontje.
    if (f >= 4) {
      buis(m, { pad: [K(0, 1.55, 0), K(0, 1.95, 0)], r: [0.95 * s, 0.95 * s], zijden: 10, kleur: '#ffc94a' });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        buis(m, { pad: [K(Math.cos(a) * 0.9, 1.9, Math.sin(a) * 0.9), K(Math.cos(a) * 0.95, 2.6, Math.sin(a) * 0.95)], r: [0.22 * s, 0.01], zijden: 4, kleur: '#ffc94a' });
      }
    }
    return m;
  }

  return { ridder, draak };
})();
