// Proef: een ridder en een draakje in low-poly. Nog niet in gebruik in LANcelot (eerst kijkt Jorn of het mooi is).
const LpProef = (() => {
  const { bol, prisma, buis, gloed, omlijn } = LowPoly;
  const STAAL = { staal: '#a9b6cc', goud: '#e9b23a', cyber: '#3d4763', kristal: '#8fdcf5' };

  // Ridder in een raster van 12 breed en 17 hoog (zoals Avatar), k pixels per eenheid.
  function ridder(av, k = 10) {
    const c = document.createElement('canvas');
    c.width = 12 * k + 8;
    c.height = 17 * k + 8;
    const g = c.getContext('2d');
    g.translate(4, 4);
    g.scale(k, k);
    g.lpNaad = 0.7 / k;
    const M = STAAL[av.harnas] || STAAL.staal;
    const C = av.kleur, V = av.vizier;

    // Rug: cape of lichtvleugels.
    if (av.rug === 'cape') prisma(g, [3.2, 7, 8.8, 7, 10.2, 15.6, 6, 16.1, 1.8, 15.6], C, { rand: 0.25, punt: 0.12, schaduw: 0.8 });
    if (av.rug === 'vleugels') {
      for (const s of [-1, 1]) {
        const x = 6 + s * 2.4;
        gloed(g, x + s * 2.5, 8, 3.4, V, 0.35);
        prisma(g, [x, 7, x + s * 4.6, 4.2, x + s * 5.6, 7.4, x + s * 3.6, 11.4, x + s * 0.4, 10], V, { rand: 0.4, punt: 0.3, glans: 1.2, schaduw: 0.35 });
      }
    }
    // Benen en laarzen.
    for (const x of [4.2, 6.6]) {
      prisma(g, [x, 11, x + 1.6, 11, x + 1.5, 14.6, x + 0.1, 14.6], M, { rand: 0.4, punt: 0.2, neon: V });
      prisma(g, [x - 0.1, 15.1, x + 1.7, 15.1, x + 2, 16.6, x - 0.2, 16.6], '#2b3550', { rand: 0.35, punt: 0.15 });
    }
    // Armen.
    buis(g, [2.6, 7.6, 2.3, 10, 2.6, 11.6], 0.75, 0.6, M, { neon: V });
    buis(g, [9.4, 7.6, 9.7, 10, 9.4, 11.6], 0.75, 0.6, M, { neon: V });
    // Romp met borststuk in de kleur van het harnas.
    prisma(g, [3.3, 7, 8.7, 7, 8.4, 10.4, 6, 11.8, 3.6, 10.4], M, { rand: 0.3, punt: 0.25, neon: V, midden: [6, 8.8] });
    prisma(g, [4.1, 7.5, 7.9, 7.5, 7.6, 9.9, 6, 11, 4.4, 9.9], C, { rand: 0.35, punt: 0.3, midden: [6, 8.9], rand: 0.35 });
    prisma(g, [3.6, 10.6, 8.4, 10.6, 8.2, 11.5, 3.8, 11.5], '#3a2a1a', { rand: 0.4, punt: 0.1 });
    prisma(g, [5.5, 10.6, 6.5, 10.6, 6.5, 11.5, 5.5, 11.5], '#ffc94a', { rand: 0.4, punt: 0.3 });
    gloed(g, 6, 8.7, 1.2, V, 0.7);
    prisma(g, [6, 8, 6.6, 8.7, 6, 9.4, 5.4, 8.7], V, { rand: 0.3, punt: 0.5, glans: 1.4, schaduw: 0.2 });
    // Wapen in de rechterhand (links op het scherm).
    if (av.wapen === 'licht') {
      gloed(g, 2.4, 6.4, 3.2, V, 0.45);
      prisma(g, [2.15, 1.4, 2.75, 1.4, 2.75, 10.8, 2.15, 10.8], '#ffffff', { rand: 0.4, punt: 0.1, schaduw: 0.1 });
      prisma(g, [2.25, 1.6, 2.65, 1.6, 2.65, 10.6, 2.25, 10.6], V, { rand: 0.2, punt: 0.1, glans: 1.5, schaduw: 0.1 });
      prisma(g, [1.9, 10.8, 3, 10.8, 3, 13, 1.9, 13], '#3d4763', { rand: 0.35, punt: 0.2 });
    } else if (av.wapen === 'bijl') {
      prisma(g, [2.2, 3.2, 2.8, 3.2, 2.8, 13.4, 2.2, 13.4], '#7a4a24', { rand: 0.4, punt: 0.1 });
      prisma(g, [2.6, 3.4, 0.2, 2.6, -0.4, 4.8, 0.2, 7, 2.6, 6.2], M, { rand: 0.3, punt: 0.3, midden: [1.2, 4.8], neon: V });
    } else {
      prisma(g, [2.5, 1.2, 3.05, 2.2, 3.05, 10.6, 1.95, 10.6, 1.95, 2.2], '#dfe7f2', { rand: 0.45, punt: 0.4, midden: [2.5, 6] });
      prisma(g, [0.9, 10.5, 4.1, 10.5, 4.1, 11.2, 0.9, 11.2], '#ffc94a', { rand: 0.4, punt: 0.2 });
      prisma(g, [2.15, 11.2, 2.85, 11.2, 2.85, 12.8, 2.15, 12.8], '#5a3a22', { rand: 0.4, punt: 0.1 });
    }
    bol(g, 2.5, 11.6, 0.8, 0.75, M, { ringen: 2, stukken: 6, neon: V });
    // Schild aan de linkerarm (rechts op het scherm).
    const sx = 7.6, sy = 9, s = 3.4;
    const schild = [sx, sy, sx + s, sy, sx + s, sy + s * 0.6, sx + s / 2, sy + s * 1.15, sx, sy + s * 0.6];
    prisma(g, schild, av.schild, { rand: 0.22, punt: 0.3, midden: [sx + s / 2, sy + s * 0.45] });
    if (av.patroon === 'gedeeld') {
      prisma(g, [sx + s / 2, sy + 0.35, sx + s - 0.35, sy + 0.35, sx + s - 0.35, sy + s * 0.58, sx + s / 2, sy + s * 1.02], '#e8edf5', { rand: 0.2, punt: 0.15 });
    } else {
      prisma(g, [sx + s / 2 - 0.3, sy + 0.4, sx + s / 2 + 0.3, sy + 0.4, sx + s / 2 + 0.3, sy + s, sx + s / 2 - 0.3, sy + s], '#ffc94a', { rand: 0.4, punt: 0.2 });
      prisma(g, [sx + 0.4, sy + 1.1, sx + s - 0.4, sy + 1.1, sx + s - 0.4, sy + 1.7, sx + 0.4, sy + 1.7], '#ffc94a', { rand: 0.4, punt: 0.2 });
    }
    // Schouderstukken.
    bol(g, 3.1, 7.3, 1.45, 1.05, C, { ringen: 2, stukken: 7, neon: V });
    bol(g, 8.9, 7.3, 1.45, 1.05, C, { ringen: 2, stukken: 7, neon: V });
    // Versiering achter de helm.
    if (av.accent === 'pluim') buis(g, [6, 1.6, 6.9, 0.4, 8.6, 0.2, 9.8, 1.4], 0.75, 0.25, C, { neon: V });
    if (av.accent === 'hoorns') {
      buis(g, [4.2, 2.6, 3.2, 1.6, 3, 0.2], 0.5, 0.1, '#efe6d2');
      buis(g, [7.8, 2.6, 8.8, 1.6, 9, 0.2], 0.5, 0.1, '#efe6d2');
    }
    // Hoofd en helm.
    if (av.helm === 'open') {
      bol(g, 6, 4.2, 2.35, 2.5, M, { ringen: 3, stukken: 9, neon: V });
      bol(g, 6, 4.7, 1.6, 1.75, av.huid, { ringen: 2, stukken: 8, kiel: 0.6 });
      for (const x of [5.35, 6.65]) { g.fillStyle = '#141a2a'; g.fillRect(x - 0.2, 4.35, 0.4, 0.55); g.fillStyle = '#fff'; g.fillRect(x - 0.12, 4.38, 0.14, 0.16); }
      prisma(g, [4.1, 2.4, 7.9, 2.4, 7.6, 3.4, 4.4, 3.4], M, { rand: 0.35, punt: 0.2, neon: V });
    } else if (av.helm === 'spits') {
      prisma(g, [6, 0.8, 8.3, 3.2, 8.2, 6.4, 6, 7, 3.8, 6.4, 3.7, 3.2], M, { rand: 0.25, punt: 0.35, midden: [6, 3.6], neon: V });
      gloed(g, 6, 4.2, 2.6, V, 0.5);
      prisma(g, [4.2, 3.8, 7.8, 3.8, 7.4, 4.7, 4.6, 4.7], V, { rand: 0.3, punt: 0.3, glans: 1.4, schaduw: 0.15 });
    } else {
      bol(g, 6, 4.1, 2.5, 2.7, M, { ringen: 3, stukken: 10, neon: V });
      gloed(g, 6, 4.3, 2.8, V, 0.55);
      prisma(g, [3.8, 3.7, 8.2, 3.7, 7.9, 4.8, 6, 5.3, 4.1, 4.8], V, { rand: 0.3, punt: 0.35, glans: 1.4, schaduw: 0.15, midden: [6, 4.4] });
      prisma(g, [5.75, 1.5, 6.25, 1.5, 6.25, 3.6, 5.75, 3.6], C, { rand: 0.4, punt: 0.3 });
    }
    if (av.accent === 'kroon') prisma(g, [3.9, 2.2, 4.5, 0.6, 5.2, 1.6, 6, 0.3, 6.8, 1.6, 7.5, 0.6, 8.1, 2.2], '#ffc94a', { rand: 0.3, punt: 0.3, midden: [6, 1.6] });
    return omlijn(c, Math.max(1, Math.round(k / 6)));
  }

  // Draakje: voetjes op (x, y), ongeveer h hoog. Fasen: 0 ei, 1 baby, 2 jong, 3 groot, 4 ridder.
  function draak(dier, h = 160) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(h * 1.5);
    c.height = Math.ceil(h * 1.35);
    const g = c.getContext('2d');
    const s = h / 100;
    g.translate(c.width / 2, c.height - h * 0.08);
    g.scale(s, s);
    g.lpNaad = 0.8 / s;
    const { a: A, b: B, g: G } = dier.kleuren;
    const f = dier.fase;
    g.beginPath();
    g.ellipse(0, 0, f ? 30 + f * 4 : 24, 6, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(10,14,24,.3)';
    g.fill();
    if (!f) {
      bol(g, 0, -34, 23, 32, B, { ringen: 4, stukken: 11, ei: 0.12, schaduw: 0.45, neon: G });
      for (const [x, y, r] of [[-9, -44, 6], [8, -26, 7], [10, -52, 4], [-10, -18, 4]]) prisma(g, [x, y - r, x + r, y, x, y + r, x - r, y], A, { rand: 0.3, punt: 0.4 });
      gloed(g, 0, -34, 34, G, 0.25);
      return omlijn(c, Math.max(1, Math.round(s * 1.2)));
    }
    const kop = [1.25, 1.1, 1, 1][f - 1] || 1;
    const lijf = [0.8, 0.95, 1.1, 1.15][f - 1] || 1;
    const by = -26 * lijf;
    // Staart naar rechtsachter met een neonpunt.
    buis(g, [16 * lijf, by + 10, 34 * lijf, by + 6, 44 * lijf, by - 6, 50 * lijf, by - 20], 9 * lijf, 3, A, { neon: G });
    prisma(g, [50 * lijf, by - 30, 57 * lijf, by - 18, 50 * lijf, by - 14, 44 * lijf, by - 20], G, { rand: 0.3, punt: 0.4, glans: 1.3, schaduw: 0.2 });
    // Vleugels vanaf jong.
    if (f >= 2) {
      const w = [0, 0, 0.75, 1, 1.15][f];
      for (const k of [-1, 1]) {
        gloed(g, k * 34 * w, by - 34 * w, 26 * w, G, 0.25);
        prisma(g, [k * 6, by - 14, k * 30 * w, by - 52 * w, k * 52 * w, by - 44 * w, k * 44 * w, by - 22 * w, k * 30 * w, by - 18 * w, k * 14, by - 4], A, { rand: 0.35, punt: 0.25, neon: G });
        buis(g, [k * 6, by - 14, k * 30 * w, by - 52 * w, k * 52 * w, by - 44 * w], 2.6, 1.2, A);
      }
    }
    // Lijf, buik en pootjes.
    bol(g, 0, by, 25 * lijf, 25 * lijf, A, { ringen: 3, stukken: 10, neon: G });
    bol(g, 2, by + 3, 15 * lijf, 17 * lijf, B, { ringen: 2, stukken: 8, kiel: 0.5, schaduw: 0.4 });
    for (const k of [-1, 1]) bol(g, k * 14 * lijf, -6, 9 * lijf, 6.5, A, { ringen: 2, stukken: 7, neon: G });
    for (const k of [-1, 1]) bol(g, k * 19 * lijf, by + 2, 6 * lijf, 8 * lijf, A, { ringen: 2, stukken: 6, draai: k * 0.5, neon: G });
    // Rugstekels.
    for (let i = 0; i < 3; i++) {
      const x = -20 * lijf + i * 3, y = by - 12 * lijf + i * 9;
      prisma(g, [x, y - 4, x - 9, y + 1, x, y + 5], G, { rand: 0.3, punt: 0.4, glans: 1.2 });
    }
    // Kop.
    const ky = by - 30 * kop * lijf;
    const kr = 24 * kop;
    for (const k of [-1, 1]) buis(g, [k * kr * 0.45, ky - kr * 0.55, k * kr * 0.75, ky - kr * (f >= 3 ? 1.35 : 1.05)], 4.5, 1, B);
    for (const k of [-1, 1]) prisma(g, [k * kr * 0.75, ky - kr * 0.25, k * kr * 1.35, ky - kr * 0.55, k * kr * 0.9, ky + kr * 0.05], A, { rand: 0.3, punt: 0.3, neon: G });
    bol(g, 0, ky, kr, kr * 0.88, A, { ringen: 3, stukken: 10, neon: G });
    bol(g, kr * 0.12, ky + kr * 0.36, kr * 0.55, kr * 0.36, B, { ringen: 2, stukken: 8, kiel: 0.7, schaduw: 0.4 });
    // Ogen: groot en glanzend, met een neon-iris.
    for (const k of [-1, 1]) {
      const ex = k * kr * 0.38 + kr * 0.05, ey = ky - kr * 0.08, er = kr * 0.2;
      prisma(g, [ex, ey - er * 1.15, ex + er, ey - er * 0.5, ex + er, ey + er * 0.55, ex, ey + er * 1.15, ex - er, ey + er * 0.55, ex - er, ey - er * 0.5], '#141a2a', { rand: 0.25, punt: 0.2 });
      prisma(g, [ex, ey - er * 0.2, ex + er * 0.6, ey + er * 0.25, ex, ey + er * 0.85, ex - er * 0.6, ey + er * 0.25], G, { rand: 0.3, punt: 0.3, glans: 1.3, schaduw: 0.15 });
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(ex - er * 0.55, ey - er * 0.55); g.lineTo(ex - er * 0.05, ey - er * 0.75); g.lineTo(ex - er * 0.3, ey - er * 0.15);
      g.fill();
    }
    for (const k of [-1, 1]) {
      g.fillStyle = 'rgba(255,120,150,.45)';
      g.beginPath();
      g.ellipse(k * kr * 0.68 + kr * 0.05, ky + kr * 0.3, kr * 0.13, kr * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Ridderfase: een kroontje.
    if (f >= 4) prisma(g, [-12, ky - kr * 0.72, -9, ky - kr * 1.3, -3, ky - kr * 0.95, 1, ky - kr * 1.45, 5, ky - kr * 0.95, 11, ky - kr * 1.3, 13, ky - kr * 0.72], '#ffc94a', { rand: 0.3, punt: 0.35, midden: [1, ky - kr * 0.95] });
    return omlijn(c, Math.max(1, Math.round(s * 1.2)));
  }

  return { ridder, draak };
})();
