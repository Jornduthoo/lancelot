// Pixelridder tekenen, in echte pixelstijl: alles wordt op een klein canvas van 240 beeldpunten hoog getekend
// en daarna groot geschaald zonder vervaging. Tegels, vijanden en achtergronden worden één keer getekend en daarna gekopieerd.
// De leerling en de camera's op het bord gebruiken dezelfde tekeningen. Gebruikt PxWorld en (als die er is) Avatar.
const PxDraw = (() => {
  const W = PxWorld;
  const T = W.T;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- Kleuren per wereld ----------
  const PAL = [
    { // De Neonweide: paarse schemering met een retrozon
      sky: ['#07031c', '#1c0a45', '#4a1468', '#b3307a'], far: '#2a0f4f', farHi: '#ff5fd2', near: '#150829', nearHi: '#39ffb0',
      soil: '#2a1440', soilD: '#1a0b2c', line: '#4d2a78', node: '#39ffb0', grass: '#25d98a', grassHi: '#9dffd6', grassD: '#128a5a',
      brick: '#b0386f', brickHi: '#ff7ab3', brickD: '#5e1a3d', mortar: '#2a0d1f', stone: '#5b4a86', stoneHi: '#9b8ad0', stoneD: '#2c2147',
      metal: '#1d2440', metalHi: '#3d4a7a', accent: '#39ffb0',
    },
    { // De Kristalgrot
      sky: ['#010309', '#040b1e', '#071737', '#0c2550'], far: '#0b1a3a', farHi: '#5ee7ff', near: '#050c1c', nearHi: '#c77dff',
      soil: '#16233f', soilD: '#0b1428', line: '#24375f', node: '#5ee7ff', grass: '#2ec4e8', grassHi: '#bff6ff', grassD: '#1a6f9a',
      brick: '#2f5d9a', brickHi: '#7fb4ff', brickD: '#16304f', mortar: '#08111f', stone: '#3e4f73', stoneHi: '#7d93bf', stoneD: '#1c2640',
      metal: '#151d33', metalHi: '#34456e', accent: '#c77dff',
    },
    { // De Burchtmuren: steen en lava
      sky: ['#0d0206', '#24060a', '#4a0f0c', '#8a2a0c'], far: '#2a0d0d', farHi: '#ff8a3d', near: '#160606', nearHi: '#ffb703',
      soil: '#3a2b2e', soilD: '#22181a', line: '#4e3a3c', node: '#ff8a3d', grass: '#7a6668', grassHi: '#c8b4b0', grassD: '#4a3a3c',
      brick: '#8a4a3a', brickHi: '#d08a6a', brickD: '#4a2218', mortar: '#1a0c0a', stone: '#6a5a5c', stoneHi: '#a8989a', stoneD: '#3a2c2e',
      metal: '#2a1c1c', metalHi: '#5a4040', accent: '#ff8a3d',
    },
    { // De Sterrenbrug: metaal in de ruimte
      sky: ['#000003', '#02031a', '#070a33', '#141a55'], far: '#1a1f4a', farHi: '#ffd166', near: '#0a0d26', nearHi: '#5ee7ff',
      soil: '#232b45', soilD: '#141a2e', line: '#323d60', node: '#ffd166', grass: '#4cc9ff', grassHi: '#e0f7ff', grassD: '#1f6f9f',
      brick: '#4a4f8a', brickHi: '#9aa2ff', brickD: '#24285a', mortar: '#0b0d22', stone: '#4f5a78', stoneHi: '#94a3c8', stoneD: '#262d44',
      metal: '#1b2238', metalHi: '#44527a', accent: '#ffd166',
    },
  ];

  function hash(a, b = 0) {
    let n = Math.imul(a, 374761393) + Math.imul(b, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- Tegels ----------
  // Volgorde in de tegelstrook:
  const TI = { top: 0, top2: 1, fill: 2, fill2: 3, brick: 4, used: 5, stone: 6, pilL: 7, pilR: 8, capL: 9, capR: 10, plank: 11, rune: 12, coin: 16, lava: 20, lavaFill: 24, coinbrick: 25, ceil: 26 };
  const sets = new Map();

  function tileset(theme) {
    if (sets.has(theme)) return sets.get(theme);
    const P = PAL[theme];
    const key = W.THEMES[theme].key;
    const c = canvas(T * 27, T);
    const g = c.getContext('2d');
    const r = W.rng(theme * 77 + 5);
    const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const at = i => i * T;

    // grond
    for (const [i, top, v] of [[TI.top, true, 0], [TI.top2, true, 1], [TI.fill, false, 0], [TI.fill2, false, 1], [TI.ceil, false, 2]]) {
      const o = at(i);
      px(o, 0, P.soil, T, T);
      if (key === 'burcht') {
        // muur van grote stenen
        for (let y = 0; y < T; y += 8) {
          const off = (y / 8) % 2 ? 8 : 0;
          for (let x = -8; x < T; x += 16) {
            px(o + Math.max(0, x + off), y, P.soilD, 1, 8);
            px(o + Math.max(0, x + off) + 1, y, P.line, Math.min(14, T - Math.max(0, x + off) - 1), 1);
          }
          px(o, y + 7, P.soilD, T, 1);
        }
      } else if (key === 'sterren') {
        px(o, 0, P.soilD, T, 1);
        px(o, 0, P.soilD, 1, T);
        px(o + 1, 1, P.line, T - 2, 1);
        for (const [x, y] of [[2, 3], [13, 3], [2, 13], [13, 13]]) { px(o + x, y, P.line); px(o + x, y + 1, P.soilD); }
        if (v) px(o + 4, 8, P.line, 8, 2);
      } else {
        for (let k = 0; k < 14; k++) px(o + Math.floor(r() * T), Math.floor(r() * T), r() < .5 ? P.soilD : P.line);
        // printplaat-lijntjes in de aarde
        const ly = 6 + v * 4;
        px(o, ly, P.line, T, 1);
        px(o + 5 + v * 4, ly - 2, P.line, 1, 3);
        px(o + 5 + v * 4, ly - 3, P.node);
        if (key === 'grot') { px(o + 3 + v * 7, 11 - v * 5, P.node); px(o + 4 + v * 7, 11 - v * 5, P.grassHi); }
      }
      if (top) {
        if (key === 'burcht') {
          px(o, 0, P.grass, T, 3);
          px(o, 0, P.grassHi, T, 1);
          px(o, 3, P.grassD, T, 1);
          for (let x = 0; x < T; x += 4) px(o + x + v * 2, 1, P.accent);
        } else if (key === 'sterren') {
          px(o, 0, P.metalHi, T, 3);
          px(o, 1, P.grass, T, 1);
          px(o, 3, P.soilD, T, 1);
          px(o + (v ? 3 : 10), 1, P.grassHi, 3, 1);
        } else {
          px(o, 0, P.grassHi, T, 1);
          px(o, 1, P.grass, T, 3);
          for (let x = 0; x < T; x++) {
            const d = Math.floor(hash(x + v * 16, theme) * 3);
            px(o + x, 4, d ? P.grass : P.grassD, 1, 1);
            if (d === 2) px(o + x, 5, P.grassD);
          }
          px(o + 3 + v * 6, 0, '#ffffff');
          if (key === 'weide' && v) { px(o + 11, -0, P.grassHi); px(o + 12, 1, '#ffffff'); }
        }
      }
    }

    // baksteen
    function brick(o, sparkle) {
      px(o, 0, P.mortar, T, T);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let x = -off; x < T; x += 8) {
          const x0 = Math.max(0, x), x1 = Math.min(T, x + 7);
          if (x1 <= x0) continue;
          px(o + x0, row * 4, P.brick, x1 - x0, 3);
          px(o + x0, row * 4, P.brickHi, x1 - x0, 1);
          px(o + x0, row * 4 + 2, P.brickD, x1 - x0, 1);
        }
      }
      if (sparkle) { px(o + 6, 5, '#fff3b0'); px(o + 5, 6, '#ffd166', 3, 1); px(o + 6, 7, '#fff3b0'); }
    }
    brick(at(TI.brick), false);
    brick(at(TI.coinbrick), true);

    // runeblok (vier gloeistanden) en leeg blok
    const Q = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
    function steel(o, glyph, k) {
      px(o, 0, '#0a0d1a', T, T);
      px(o + 1, 1, glyph ? '#2b3560' : '#1a2038', T - 2, T - 2);
      px(o + 1, 1, glyph ? '#5a6aa8' : '#2c3456', T - 2, 1);
      px(o + 1, 1, glyph ? '#5a6aa8' : '#2c3456', 1, T - 2);
      px(o + 1, T - 2, '#11162a', T - 2, 1);
      px(o + T - 2, 1, '#11162a', 1, T - 2);
      for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) px(o + x, y, glyph ? '#ffd166' : '#3a4366');
      if (!glyph) return;
      const cols = ['#1f7fa0', '#38b8e0', '#7ee8ff', '#e8fbff'];
      const halo = ['#173a5a', '#1d5a80', '#2f86b0', '#47b0d8'];
      for (let y = 0; y < Q.length; y++) {
        for (let x = 0; x < 5; x++) {
          if (Q[y][x] !== '#') continue;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const hx = x + dx, hy = y + dy;
            if (hy >= 0 && hy < Q.length && hx >= 0 && hx < 5 && Q[hy][hx] === '#') continue;
            px(o + 5 + hx, 4 + hy, halo[k]);
          }
        }
      }
      for (let y = 0; y < Q.length; y++) for (let x = 0; x < 5; x++) if (Q[y][x] === '#') px(o + 5 + x, 4 + y, cols[k]);
    }
    for (let k = 0; k < 4; k++) steel(at(TI.rune + k), true, k);
    steel(at(TI.used), false, 0);

    // steen (trappen)
    {
      const o = at(TI.stone);
      px(o, 0, P.stoneD, T, T);
      px(o + 1, 1, P.stone, T - 2, T - 2);
      px(o + 1, 1, P.stoneHi, T - 2, 1);
      px(o + 1, 1, P.stoneHi, 1, T - 2);
      px(o + 3, 3, P.stoneD, T - 6, T - 6);
      px(o + 4, 4, P.stone, T - 8, T - 8);
      px(o + 4, 4, P.stoneHi, T - 8, 1);
    }

    // pilaar: twee tegels breed, met een lichtstreep in het midden
    {
      const pc = canvas(32, 32);
      const q = pc.getContext('2d');
      const p = (x, y, col, w = 1, h = 1) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
      // kap
      p(0, 0, '#05070f', 32, 16);
      p(1, 1, P.metalHi, 30, 4);
      p(1, 5, P.metal, 30, 9);
      p(1, 1, '#ffffff', 30, 1);
      p(1, 14, '#05070f', 30, 1);
      for (let x = 4; x < 30; x += 6) p(x, 8, P.accent, 2, 2);
      // romp
      p(2, 16, '#05070f', 28, 16);
      p(3, 16, P.metal, 26, 16);
      p(3, 16, P.metalHi, 4, 16);
      p(25, 16, '#0a0d18', 4, 16);
      p(15, 16, P.accent, 2, 16);
      p(14, 16, P.metalHi, 1, 16);
      g.drawImage(pc, 0, 0, 16, 16, at(TI.capL), 0, 16, 16);
      g.drawImage(pc, 16, 0, 16, 16, at(TI.capR), 0, 16, 16);
      g.drawImage(pc, 0, 16, 16, 16, at(TI.pilL), 0, 16, 16);
      g.drawImage(pc, 16, 16, 16, 16, at(TI.pilR), 0, 16, 16);
    }

    // zweefplank (alleen van boven stevig)
    {
      const o = at(TI.plank);
      px(o, 0, '#05070f', T, 6);
      px(o, 1, P.metalHi, T, 2);
      px(o, 0, '#ffffff', T, 1);
      px(o, 3, P.metal, T, 2);
      px(o + 2, 3, P.accent, 2, 1);
      px(o + 10, 3, P.accent, 2, 1);
      g.globalAlpha = .45;
      px(o, 6, P.accent, T, 1);
      g.globalAlpha = .2;
      px(o, 7, P.accent, T, 1);
      g.globalAlpha = 1;
    }

    // kristalmunt: draait rond (breedte 8, 6, 2, 6)
    [8, 6, 2, 6].forEach((wd, k) => {
      const o = at(TI.coin + k) + 8 - wd / 2;
      for (let y = 0; y < 12; y++) {
        const half = Math.max(0, Math.round((y < 6 ? (y + 1) / 6 : (12 - y) / 6) * wd / 2));
        if (!half) continue;
        px(o + wd / 2 - half, 2 + y, '#a86a00', half * 2, 1);
        if (half > 1) px(o + wd / 2 - half + 1, 2 + y, y < 6 ? '#ffd166' : '#ffb703', half * 2 - 2, 1);
      }
      if (wd > 2) { px(o + wd / 2 - 1, 4, '#ffffff'); px(o + wd / 2 - 1, 5, '#fff3b0'); }
    });

    // lava: golvende bovenkant (vier standen) en gloeiende vulling
    for (let k = 0; k < 4; k++) {
      const o = at(TI.lava + k);
      px(o, 0, '#ff5a1a', T, T);
      for (let x = 0; x < T; x++) {
        const hgt = 3 + Math.round(Math.sin((x + k * 4) / 16 * Math.PI * 2) * 2);
        px(o + x, 0, 'rgba(0,0,0,0)', 1, hgt);
        g.clearRect(o + x, 0, 1, hgt);
        px(o + x, hgt, '#ffe08a');
        px(o + x, hgt + 1, '#ffb703');
      }
      for (let i = 0; i < 6; i++) px(o + Math.floor(r() * T), 8 + Math.floor(r() * 8), '#c42a0a');
    }
    {
      const o = at(TI.lavaFill);
      px(o, 0, '#e8430f', T, T);
      for (let i = 0; i < 14; i++) px(o + Math.floor(r() * T), Math.floor(r() * T), r() < .5 ? '#ff8a3d' : '#a82008');
    }
    sets.set(theme, c);
    return c;
  }

  // ---------- Versiering op de grond ----------
  // Een strook van DECOR_N tekeningen (16 × 16) per wereld: plantjes, steentjes, paddenstoelen, een fakkel, een bordje.
  // scene() kiest per tegel met een vaste hash wat erop staat, zodat het bij iedereen hetzelfde is.
  const DECOR_N = 8;
  const decors = new Map();
  function decor(theme) {
    if (decors.has(theme)) return decors.get(theme);
    const P = PAL[theme];
    const key = W.THEMES[theme].key;
    const c = canvas(T * DECOR_N, T);
    const g = c.getContext('2d');
    const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    for (let i = 0; i < DECOR_N; i++) {
      const o = i * T;
      if (key === 'weide') {
        if (i === 0) { for (const x of [3, 5, 6, 9, 11]) px(o + x, 12 + (x % 3), P.grass, 1, 4 - (x % 3)); px(o + 6, 11, P.grassHi); }
        else if (i === 1) { px(o + 7, 10, P.grassD, 1, 6); px(o + 6, 8, '#ff7ab3', 3, 3); px(o + 7, 9, '#fff07a'); px(o + 11, 12, P.grassD, 1, 4); px(o + 10, 11, '#5ee7ff', 3, 2); }
        else if (i === 2) { px(o + 4, 12, P.stoneD, 7, 4); px(o + 5, 11, P.stone, 5, 3); px(o + 5, 11, P.stoneHi, 3, 1); px(o + 9, 13, P.grass, 2, 3); }
        else if (i === 3) { px(o + 7, 10, '#c9b4f0', 1, 6); px(o + 5, 8, '#c13cff', 5, 3); px(o + 6, 8, '#f0a8ff', 2, 1); px(o + 6, 9, '#ffffff'); }
        else if (i === 4) { px(o + 4, 6, '#3a2412', 1, 10); px(o + 11, 6, '#3a2412', 1, 10); px(o + 2, 8, '#6b4526', 12, 2); px(o + 2, 12, '#6b4526', 12, 2); }
        else if (i === 5) { for (let k = 0; k < 6; k++) px(o + 2 + k * 2, 13 - (k % 2), P.grassD, 1, 3 + (k % 2)); px(o + 4, 11, '#ffd166'); px(o + 10, 12, '#ffffff'); }
        else if (i === 6) { px(o + 7, 6, '#3a2412', 2, 10); px(o + 6, 5, '#8a7a50', 4, 2); }
        else { px(o + 3, 9, '#1a3a30', 10, 7); px(o + 2, 11, '#1a3a30', 12, 5); px(o + 4, 9, P.grassD, 4, 2); px(o + 9, 12, '#ff4d6d'); px(o + 5, 13, '#ff4d6d'); }
      } else if (key === 'grot') {
        if (i === 0) { px(o + 6, 9, P.accent, 2, 7); px(o + 7, 7, '#f0d0ff', 1, 3); px(o + 9, 11, P.farHi, 2, 5); px(o + 10, 10, '#ffffff'); }
        else if (i === 1) { px(o + 7, 11, '#9ab0d0', 1, 5); px(o + 5, 9, P.farHi, 5, 2); px(o + 6, 8, '#bff6ff', 3, 1); px(o + 11, 13, '#9ab0d0', 1, 3); px(o + 10, 12, P.accent, 3, 1); }
        else if (i === 2) { px(o + 4, 12, P.stoneD, 8, 4); px(o + 5, 11, P.stone, 6, 3); px(o + 5, 11, P.stoneHi, 4, 1); }
        else if (i === 3) { px(o + 3, 14, '#e8f1ff', 6, 1); px(o + 4, 13, '#e8f1ff', 1, 1); px(o + 8, 13, '#e8f1ff', 1, 1); px(o + 10, 12, '#d0d8e8', 3, 3); px(o + 11, 13, '#05070f'); }
        else if (i === 4) { for (let k = 0; k < 4; k++) px(o + 3 + k * 3, 12 + (k % 2), k % 2 ? P.accent : P.farHi, 2, 4 - (k % 2)); }
        else if (i === 5) { px(o + 4, 14, P.grassD, 8, 2); px(o + 5, 13, P.grass, 2, 1); px(o + 9, 13, P.grass, 2, 1); }
        else if (i === 6) { px(o + 7, 6, '#3a2f4a', 2, 10); px(o + 6, 5, '#6a5f80', 4, 2); }
        else { px(o + 5, 7, P.accent, 3, 9); px(o + 6, 4, P.accent, 1, 3); px(o + 6, 6, '#f0d0ff', 1, 6); px(o + 9, 10, P.farHi, 3, 6); px(o + 10, 8, '#ffffff', 1, 3); }
      } else if (key === 'burcht') {
        if (i === 0) { px(o + 4, 13, '#e8dccc', 8, 1); px(o + 5, 12, '#e8dccc', 1, 1); px(o + 10, 12, '#e8dccc', 1, 1); }
        else if (i === 1) { px(o + 3, 10, '#4a2a1a', 10, 6); px(o + 3, 10, '#7a4a2a', 10, 1); px(o + 3, 12, '#2a1810', 10, 1); px(o + 7, 10, '#8a8a9a', 2, 6); }
        else if (i === 2) { px(o + 4, 12, P.stoneD, 8, 4); px(o + 5, 11, P.stone, 6, 3); px(o + 5, 11, P.stoneHi, 4, 1); }
        else if (i === 3) { px(o + 5, 8, '#5a3a2a', 6, 8); px(o + 5, 8, '#8a5a3a', 6, 1); px(o + 5, 11, '#3a2418', 6, 1); px(o + 5, 14, '#3a2418', 6, 1); px(o + 4, 9, '#2a1a10', 1, 6); px(o + 11, 9, '#2a1a10', 1, 6); }
        else if (i === 4) { for (let k = 0; k < 5; k++) px(o + 3 + k * 2, 8 + k, '#6a6a7a', 1, 2); px(o + 12, 13, '#6a6a7a', 2, 3); }
        else if (i === 5) { px(o + 3, 14, P.grassD, 10, 2); px(o + 5, 13, '#ff8a3d'); px(o + 9, 13, '#ffb703'); }
        else if (i === 6) { px(o + 7, 6, '#2a1a1a', 2, 10); px(o + 6, 5, '#6a5a40', 4, 2); }
        else { px(o + 4, 8, '#2a1c1c', 8, 8); px(o + 5, 9, '#ff5a1a', 6, 2); px(o + 6, 8, '#ffe08a', 4, 1); px(o + 3, 15, '#4a3a3c', 10, 1); }
      } else {
        if (i === 0) { px(o + 6, 10, P.metalHi, 4, 6); px(o + 7, 9, P.grass, 2, 1); px(o + 7, 11, P.accent, 2, 1); }
        else if (i === 1) { px(o + 4, 12, P.metal, 8, 4); px(o + 4, 12, P.metalHi, 8, 1); px(o + 6, 13, P.grass, 1, 1); px(o + 9, 13, P.accent, 1, 1); }
        else if (i === 2) { px(o + 7, 4, P.metalHi, 1, 12); px(o + 5, 4, P.metalHi, 5, 1); px(o + 7, 3, '#ff4d6d'); }
        else if (i === 3) { px(o + 3, 13, '#2a3350', 10, 3); px(o + 4, 12, '#3a4570', 8, 1); px(o + 5, 13, '#5ee7ff', 2, 1); px(o + 9, 13, '#ffd166', 2, 1); }
        else if (i === 4) { px(o + 5, 11, '#1b2238', 6, 5); px(o + 6, 12, '#39ffb0', 4, 2); px(o + 6, 12, '#bfffe8', 2, 1); }
        else if (i === 5) { px(o + 2, 15, P.grassD, 12, 1); px(o + 4, 14, P.grass, 1, 1); px(o + 11, 14, P.grass, 1, 1); }
        else if (i === 6) { px(o + 7, 6, P.metal, 2, 10); px(o + 6, 5, P.metalHi, 4, 2); }
        else { px(o + 4, 7, P.metal, 8, 9); px(o + 5, 8, '#0a0d18', 6, 4); px(o + 6, 9, P.accent, 2, 1); px(o + 9, 10, '#ff4d6d', 1, 1); px(o + 4, 7, P.metalHi, 8, 1); }
      }
    }
    decors.set(theme, c);
    return c;
  }

  // ---------- Achtergronden (drie lagen die met een andere snelheid meeschuiven) ----------
  const BG_W = 512;
  const bgs = new Map();
  // Geschilderde pixelachtergronden per wereld (weide, grot, sterren). Zonder beeld: de getekende lagen.
  const ART = {};
  if (typeof Image !== 'undefined') {
    for (const n of ['weide', 'grot', 'sterren']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; bgs.clear(); };
      img.src = `/img/pixelridder/${n}.webp`;
    }
  }
  function paintedBackground(img) {
    // Op schermhoogte, en gespiegeld ernaast zodat de rand altijd aansluit.
    const H = W.H, w = Math.round(H * img.width / img.height);
    const c = canvas(w * 2, H), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, w, H);
    g.translate(w * 2, 0);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0, w, H);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(4, 4, 16, .22)'; // iets donkerder: de platformen en vijanden springen er beter uit
    g.fillRect(0, 0, c.width, H);
    return { layers: [c], speed: [.15] };
  }
  function background(theme) {
    if (bgs.has(theme)) return bgs.get(theme);
    const art = ART[W.THEMES[theme].key];
    if (art) { const out = paintedBackground(art); bgs.set(theme, out); return out; }
    const P = PAL[theme];
    const key = W.THEMES[theme].key;
    const H = W.H;
    const r = W.rng(theme * 991 + 3);
    const layers = [canvas(BG_W, H), canvas(BG_W, H), canvas(BG_W, H)];
    const [g0, g1, g2] = layers.map(l => l.getContext('2d'));
    // hemel
    const grad = g0.createLinearGradient(0, 0, 0, H);
    P.sky.forEach((col, i) => grad.addColorStop(i / (P.sky.length - 1), col));
    g0.fillStyle = grad;
    g0.fillRect(0, 0, BG_W, H);
    // in strepen, voor de retrolook
    for (let y = 0; y < H; y += 4) { g0.fillStyle = 'rgba(0,0,0,.12)'; g0.fillRect(0, y, BG_W, 1); }
    const stars = key === 'sterren' ? 160 : key === 'grot' ? 30 : key === 'burcht' ? 0 : 60;
    for (let i = 0; i < stars; i++) {
      const x = Math.floor(r() * BG_W), y = Math.floor(r() * H * (key === 'sterren' ? 1 : .55));
      g0.fillStyle = key === 'grot' ? (r() < .5 ? '#5ee7ff' : '#c77dff') : r() < .15 ? '#ffd166' : '#ffffff';
      g0.globalAlpha = .3 + r() * .7;
      g0.fillRect(x, y, 1, 1);
      if (r() < .08) { g0.fillRect(x - 1, y, 3, 1); g0.fillRect(x, y - 1, 1, 3); }
    }
    g0.globalAlpha = 1;
    const wrap = (g, fn) => { for (const o of [-BG_W, 0, BG_W]) { g.save(); g.translate(o, 0); fn(g); g.restore(); } };

    if (key === 'weide') {
      // retrozon met strepen
      const sx = 330, sy = 150, sr = 52;
      const sg = g0.createLinearGradient(0, sy - sr, 0, sy + sr);
      sg.addColorStop(0, '#fff07a');
      sg.addColorStop(.5, '#ff9a3d');
      sg.addColorStop(1, '#ff3d9a');
      g0.fillStyle = sg;
      for (let y = -sr; y < sr; y++) {
        const k = (y + sr) / (sr * 2);
        if (k > .5 && Math.floor((y + sr) / 3) % (k > .8 ? 2 : 3) === 0) continue;
        const half = Math.round(Math.sqrt(sr * sr - y * y));
        g0.fillRect(sx - half, sy + y, half * 2, 1);
      }
      // verre burchten
      wrap(g1, g => {
        g.fillStyle = P.far;
        let x = 0;
        while (x < BG_W) {
          const w = 20 + Math.floor(r() * 40), h = 30 + Math.floor(r() * 50);
          g.fillRect(x, H - 50 - h, w, h + 50);
          for (let k = 0; k < w; k += 6) g.fillRect(x + k, H - 54 - h, 3, 4);
          if (r() < .5) { g.fillRect(x + w / 2 - 5, H - 70 - h, 10, 20); g.beginPath(); g.moveTo(x + w / 2 - 7, H - 70 - h); g.lineTo(x + w / 2, H - 86 - h); g.lineTo(x + w / 2 + 7, H - 70 - h); g.fill(); }
          g.fillStyle = P.farHi;
          for (let k = 0; k < 4; k++) if (r() < .6) g.fillRect(x + 4 + Math.floor(r() * (w - 8)), H - 40 - Math.floor(r() * h), 2, 3);
          g.fillStyle = P.far;
          x += w + Math.floor(r() * 30);
        }
      });
      // heuvels met een neon raster
      wrap(g2, g => {
        g.fillStyle = P.near;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= BG_W; x += 8) g.lineTo(x, H - 46 - Math.sin(x / BG_W * Math.PI * 4) * 16 - Math.sin(x / BG_W * Math.PI * 10) * 5);
        g.lineTo(BG_W, H);
        g.fill();
        g.fillStyle = P.nearHi;
        g.globalAlpha = .35;
        for (let x = 0; x <= BG_W; x += 8) g.fillRect(x, H - 46 - Math.sin(x / BG_W * Math.PI * 4) * 16 - Math.sin(x / BG_W * Math.PI * 10) * 5, 8, 1);
        g.globalAlpha = 1;
      });
    } else if (key === 'grot') {
      wrap(g1, g => {
        for (let i = 0; i < 10; i++) {
          const x = Math.floor(r() * BG_W), h = 40 + Math.floor(r() * 80), w = 10 + Math.floor(r() * 16);
          g.fillStyle = P.far;
          g.beginPath(); g.moveTo(x - w, H); g.lineTo(x - w * .4, H - h); g.lineTo(x, H - h - 14); g.lineTo(x + w * .5, H - h + 6); g.lineTo(x + w, H); g.fill();
          g.fillStyle = r() < .5 ? P.farHi : P.nearHi;
          g.globalAlpha = .5;
          g.fillRect(x - 1, H - h - 10, 2, h);
          g.globalAlpha = 1;
        }
      });
      wrap(g2, g => {
        g.fillStyle = P.near;
        for (let x = 0; x < BG_W; x += 12 + Math.floor(r() * 18)) {
          const h = 20 + Math.floor(r() * 50);
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, h); g.lineTo(x + 12, 0); g.fill();
          g.fillStyle = P.nearHi; g.fillRect(x + 6, h - 2, 1, 2); g.fillStyle = P.near;
        }
      });
    } else if (key === 'burcht') {
      const lg = g0.createLinearGradient(0, H - 70, 0, H);
      lg.addColorStop(0, 'rgba(255,90,26,0)');
      lg.addColorStop(1, 'rgba(255,90,26,.45)');
      g0.fillStyle = lg;
      g0.fillRect(0, H - 70, BG_W, 70);
      wrap(g1, g => {
        g.fillStyle = P.far;
        g.fillRect(0, 40, BG_W, H);
        for (let x = 0; x < BG_W; x += 64) {
          g.fillStyle = '#12050a';
          g.fillRect(x + 18, 80, 28, 50);
          g.beginPath(); g.arc(x + 32, 80, 14, Math.PI, 0); g.fill();
          g.fillStyle = 'rgba(255,138,61,.5)';
          g.fillRect(x + 22, 92, 20, 34);
          g.fillStyle = '#5a1020';
          g.fillRect(x + 54, 50, 8, 40);
          g.beginPath(); g.moveTo(x + 54, 90); g.lineTo(x + 58, 84); g.lineTo(x + 62, 90); g.fill();
          for (let k = 0; k < BG_W; k += 8) { g.fillStyle = P.far; g.fillRect(k, 34, 5, 6); }
        }
        g.fillStyle = 'rgba(0,0,0,.25)';
        for (let y = 48; y < H; y += 10) g.fillRect(0, y, BG_W, 1);
      });
      wrap(g2, g => {
        for (let x = 30; x < BG_W; x += 128) {
          g.fillStyle = P.near;
          g.fillRect(x, 0, 18, H);
          g.fillRect(x - 4, 0, 26, 12);
          g.fillStyle = '#ffb703';
          g.fillRect(x + 7, 120, 4, 6);
          g.fillStyle = '#ff5a1a';
          g.fillRect(x + 8, 116, 2, 4);
        }
      });
    } else {
      // planeet met ring en nevel
      g0.fillStyle = 'rgba(199,125,255,.12)';
      for (let i = 0; i < 40; i++) { g0.beginPath(); g0.arc(120 + r() * 160, 60 + r() * 80, 10 + r() * 20, 0, 7); g0.fill(); }
      const pg = g0.createRadialGradient(390, 70, 4, 400, 80, 34);
      pg.addColorStop(0, '#ffe7a8');
      pg.addColorStop(.6, '#ff8a5b');
      pg.addColorStop(1, '#5a1a4a');
      g0.fillStyle = pg;
      g0.beginPath(); g0.arc(400, 80, 32, 0, 7); g0.fill();
      g0.strokeStyle = '#ffd166';
      g0.lineWidth = 2;
      g0.beginPath(); g0.ellipse(400, 82, 52, 10, -.25, 0, 7); g0.stroke();
      wrap(g1, g => {
        g.fillStyle = P.far;
        for (let x = 0; x < BG_W; x += 90 + Math.floor(r() * 60)) {
          const y = 60 + Math.floor(r() * 80);
          g.fillRect(x, y, 30, 6); g.fillRect(x + 12, y - 10, 6, 26); g.fillRect(x - 10, y + 2, 50, 2);
          g.fillStyle = P.farHi; g.fillRect(x + 14, y - 12, 2, 2); g.fillStyle = P.far;
        }
      });
      wrap(g2, g => {
        g.fillStyle = P.near;
        for (let x = 0; x < BG_W; x += 40 + Math.floor(r() * 50)) {
          const y = 140 + Math.floor(r() * 60), s = 6 + Math.floor(r() * 10);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y - s * .7); g.lineTo(x + s * 2, y); g.lineTo(x + s * 1.4, y + s * .8); g.lineTo(x + s * .4, y + s * .6); g.fill();
          g.fillStyle = P.nearHi; g.fillRect(x + s, y - s * .7, 2, 1); g.fillStyle = P.near;
        }
      });
    }
    // Extra details per wereld, ook in pixels: bomen en vuurvliegjes, kristalclusters, banieren, lichtjes van een ruimtestation.
    const disc = (g, x, y, rad) => { for (let dy = -rad; dy <= rad; dy++) { const hw = Math.round(Math.sqrt(rad * rad - dy * dy)); g.fillRect(x - hw, y + dy, hw * 2 + 1, 1); } };
    const halo = (g, x, y, col, rad) => { g.fillStyle = col; for (let k = rad; k > 0; k -= Math.max(1, Math.round(rad / 4))) { g.globalAlpha = .08; disc(g, x, y, k); } g.globalAlpha = 1; };
    if (key === 'weide') {
      wrap(g2, g => {
        for (let x = 6; x < BG_W; x += 22 + Math.floor(r() * 30)) {
          const y = H - 46 - Math.sin(x / BG_W * Math.PI * 4) * 16 - Math.sin(x / BG_W * Math.PI * 10) * 5;
          const s2 = 5 + Math.floor(r() * 5);
          g.fillStyle = '#0c0418';
          g.fillRect(x, y - s2 * 2, 2, s2 * 2);
          disc(g, x + 1, y - s2 * 2 - 2, s2);
          disc(g, x - s2 * .6, y - s2 * 2 + 1, Math.round(s2 * .7));
          disc(g, x + s2 * .7, y - s2 * 2 + 1, Math.round(s2 * .7));
          g.fillStyle = P.nearHi;
          g.globalAlpha = .28;
          g.fillRect(x - s2 + 3, y - s2 * 3 - 1, s2 - 1, 1);
          g.fillRect(x - s2 + 2, y - s2 * 3, 1, 2);
          g.globalAlpha = 1;
        }
        for (let i = 0; i < 26; i++) {
          const x = Math.floor(r() * BG_W), y = H - 70 - Math.floor(r() * 60);
          halo(g, x, y, '#fff07a', 4);
          g.fillStyle = '#fff07a';
          g.fillRect(x, y, 1, 1);
        }
      });
      wrap(g1, g => {
        for (let x = 20; x < BG_W; x += 70 + Math.floor(r() * 50)) {
          const y = H - 120 - Math.floor(r() * 30);
          g.fillStyle = P.far;
          g.fillRect(x, y, 1, 14);
          g.fillStyle = ['#ff4d6d', '#39ffb0', '#ffd166'][Math.floor(r() * 3)];
          g.fillRect(x + 1, y, 6, 4);
          g.fillRect(x + 1, y + 4, 4, 1);
        }
      });
    } else if (key === 'grot') {
      wrap(g1, g => {
        for (let i = 0; i < 9; i++) {
          const x = Math.floor(r() * BG_W), col = r() < .5 ? P.farHi : P.nearHi;
          halo(g, x, H - 38, col, 12);
          for (let k = 0; k < 4; k++) {
            const sx = x - 6 + k * 4, h = 5 + Math.floor(r() * 12) - Math.abs(k - 1.5) * 2;
            g.fillStyle = col;
            g.globalAlpha = .7;
            g.fillRect(sx, H - 32 - h, 3, h);
            g.fillRect(sx + 1, H - 34 - h, 1, 2);
            g.globalAlpha = .8;
            g.fillStyle = '#ffffff';
            g.fillRect(sx, H - 32 - h, 1, Math.ceil(h / 2));
            g.globalAlpha = 1;
          }
        }
      });
      wrap(g2, g => {
        for (let i = 0; i < 14; i++) {
          const x = Math.floor(r() * BG_W), y = 30 + Math.floor(r() * 40);
          halo(g, x, y, P.nearHi, 6);
          g.fillStyle = P.nearHi;
          g.fillRect(x, y - 3, 1, 3);
          g.fillRect(x - 1, y, 3, 2);
        }
      });
    } else if (key === 'burcht') {
      wrap(g1, g => {
        for (let x = 6; x < BG_W; x += 64) {
          g.fillStyle = '#3a0a14';
          g.fillRect(x, 44, 10, 36);
          g.fillRect(x, 80, 4, 4); g.fillRect(x + 6, 80, 4, 4);
          g.fillStyle = '#ffb703';
          g.fillRect(x + 4, 54, 2, 12); g.fillRect(x + 2, 58, 6, 2);
          g.fillStyle = '#5a4040';
          for (let k = 0; k < 6; k++) g.fillRect(x + 32 + (k % 2), 40 + k * 4, 1, 3);
        }
        for (let i = 0; i < 30; i++) {
          const x = Math.floor(r() * BG_W), y = H - 20 - Math.floor(r() * 80);
          g.fillStyle = r() < .5 ? '#ffb703' : '#ff5a1a';
          g.fillRect(x, y, 1, 1);
        }
      });
      wrap(g2, g => {
        for (let x = 30; x < BG_W; x += 128) halo(g, x + 9, 120, '#ff8a3d', 14);
      });
    } else {
      wrap(g1, g => {
        for (let x = 40; x < BG_W; x += 150) {
          const y = 40 + Math.floor(r() * 40);
          g.fillStyle = P.far;
          g.fillRect(x, y, 40, 14); g.fillRect(x + 14, y - 12, 12, 38); g.fillRect(x - 20, y + 5, 80, 3);
          g.fillStyle = '#0a0d26';
          for (let k = 0; k < 5; k++) g.fillRect(x - 18 + k * 16, y + 5, 10, 3);
          for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? P.farHi : '#5ee7ff'; g.fillRect(x + 3 + k * 6, y + 5, 2, 2); }
          halo(g, x + 20, y - 12, '#ff4d6d', 6);
          g.fillStyle = '#ff4d6d'; g.fillRect(x + 19, y - 14, 2, 2);
        }
      });
    }
    const out = { layers, speed: [.04, .18, .42] };
    bgs.set(theme, out);
    return out;
  }

  // ---------- Kleine pixeltekeningen ----------
  function sprite(w, h, rows, pal) {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  // Schildkever (loopt naar links), twee standen; in zijn schild; stekelbol; zoemdrone.
  const KP = { o: '#060a12', s: '#1fbf8f', S: '#7dffd8', d: '#0f6e58', h: '#2b3550', H: '#4b5d8a', e: '#ff4d6d', E: '#ffd0d8', l: '#1a2038' };
  const KEVER = [
    ['................', '......oooooo....', '....ooSSssssoo..', '...osSssssssSso.', '..osssSSSSssssso', '..ossSsssssSssso', '.ooSssssssssSsso', 'oHHodddddddddddo', 'oHeHoddSddSdddo.', 'oHEHoooooooooo..', '.oHHo...........', '..oo.ol..ol..ol.', '.....ol...ol..ol', '................', '................', '................'],
    ['................', '......oooooo....', '....ooSSssssoo..', '...osSssssssSso.', '..osssSSSSssssso', '..ossSsssssSssso', '.ooSssssssssSsso', 'oHHodddddddddddo', 'oHeHoddSddSdddo.', 'oHEHoooooooooo..', '.oHHo...........', '..oo..lo..lo..lo', '......lo..lo..lo', '................', '................', '................'],
  ];
  const SHELL = ['................', '................', '................', '................', '.....oooooo.....', '...ooSSssssoo...', '..osSssssssSso..', '.osssSSSSssssso.', '.ossSsssssSssso.', 'ooSssssssssSssoo', 'odddSdddSdddSddo', '.oddddddddddddo.', '..oooooooooooo..', '................', '................', '................'];
  const SP = { o: '#14061e', m: '#c13cff', M: '#f0a8ff', d: '#6a1a8f', w: '#ffffff', k: '#14061e', s: '#ffd6ff' };
  const STEKEL = [
    ['.......s........', '...s...s...s....', '....s.mmm.s.....', '.....mMMmmm.....', '..smmMMmmmmms...', '...mMwkmmwkmm...', '...mmwwmmwwmm...', 'ssmmmmmmmmmmmss.', '...mmmkkkkmmm...', '...dmmmmmmmmd...', '..s.dmmmmmd.s...', '.....ddddd......', '...s.o...o..s...', '....oo...oo.....', '................', '................'],
    ['.......s........', '...s...s...s....', '....s.mmm.s.....', '.....mMMmmm.....', '..smmMMmmmmms...', '...mMwkmmwkmm...', '...mmwwmmwwmm...', 'ssmmmmmmmmmmmss.', '...mmmkkkkmmm...', '...dmmmmmmmmd...', '..s.dmmmmmd.s...', '.....ddddd......', '...s..o.o...s...', '.....oo.oo......', '................', '................'],
  ];
  const DP = { o: '#05070f', g: '#8a9bb5', G: '#d6e2f2', d: '#3c4a62', e: '#ff3d5a', E: '#ffd0d8', p: '#bfe9ff', a: '#ffd166' };
  const DRONE = [
    ['.pppppppppppp...', '......oo........', '.....oddo.......', '....oGGggo......', '...oGggggggo....', '..oGgggggggdo...', '..oggoooooggo...', '..ogoeEeeoggo...', '..oggoooooggo...', '..odggggggddo...', '...oddddddo.....', '....oooooo......', '.....a..a.......', '................', '................', '................'],
    ['....pppp........', '......oo........', '.....oddo.......', '....oGGggo......', '...oGggggggo....', '..oGgggggggdo...', '..oggoooooggo...', '..ogoeeEeoggo...', '..oggoooooggo...', '..odggggggddo...', '...oddddddo.....', '....oooooo......', '......a..a......', '................', '................', '................'],
  ];
  const spr = {};
  function sprites() {
    if (spr.kever) return spr;
    spr.kever = KEVER.map(r => sprite(16, 16, r, KP));
    spr.shell = [sprite(16, 16, SHELL, KP), sprite(16, 16, SHELL.map(r => r.replace(/S/g, 'x').replace(/s/g, 'S').replace(/x/g, 's')), KP)];
    spr.stekel = STEKEL.map(r => sprite(16, 16, r, SP));
    spr.drone = DRONE.map(r => sprite(16, 16, r, DP));
    // power-ups
    spr.kristal = sprite(12, 14, ['.....oo.....', '....oCCo....', '...oCwCCo...', '..oCwCCCco..', '.oCwCCCCCco.', 'oCCCCCCCccco', 'occcCCCCccco', '.occcCCccco.', '..occcCccco.', '...occcco...', '....occo....', '.....oo.....', '............', '............'], { o: '#03101c', C: '#5ee7ff', c: '#1f8fc0', w: '#ffffff' });
    spr.zwaard = sprite(12, 14, ['.........oo.', '........oYo.', '.......oYYo.', '......oYwo..', '.....oYYo...', '....oYwo....', '.o.oYYo.....', '.oooYo......', '..oGGo......', '.oGoooo.....', 'oGo..o......', 'oo..........', '............', '............'], { o: '#1a0800', Y: '#ff9a3d', w: '#fff3b0', G: '#ffd166' });
    spr.ster = sprite(13, 13, ['......o......', '.....oYo.....', '.....oYo.....', '....oYYYo....', 'ooooYYwYYoooo', 'oYYYYwwYYYYYo', '.oYYkYYYkYYo.', '..oYYYYYYYo..', '..oYYYYYYYo..', '.oYYYoooYYYo.', '.oYYo...oYYo.', 'oYoo.....ooYo', 'oo.........oo'], { o: '#2a1600', Y: '#ffd166', w: '#ffffff', k: '#2a1600' });
    return spr;
  }

  // ---------- Pixelletters voor puntjes (3 x 5) ----------
  const FONT = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
    6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000', x: '000101010101000', '-': '000000111000000',
  };
  function text(g, str, x, y, color, s = 1) {
    str = String(str);
    const w = str.length * 4 * s - s;
    let cx = Math.round(x - w / 2);
    for (const ch of str) {
      const f = FONT[ch];
      if (f) {
        for (let i = 0; i < 15; i++) {
          if (f[i] !== '1') continue;
          const px = cx + (i % 3) * s, py = y + Math.floor(i / 3) * s;
          g.fillStyle = '#000';
          g.fillRect(px + s, py + s, s, s);
          g.fillStyle = color;
          g.fillRect(px, py, s, s);
        }
      }
      cx += 4 * s;
    }
  }

  // ---------- De eigen ridder als pixelfiguur ----------
  const knights = new Map();
  const DEFAULT_AV = { helm: 0, accent: 1, kleur: 7, vizier: 0, patroon: 0, schild: 0, wapen: 0, huid: 0, type: 0, haar: 0, haarkleur: 0, harnas: 1, rug: 0, arm: 0, runen: 0 };
  function knight(av, big, outline = '#06030c') {
    const key = `${JSON.stringify(av || DEFAULT_AV)}|${big ? 1 : 0}|${outline}`;
    if (knights.has(key)) return knights.get(key);
    const w = big ? 20 : 15;
    const h = Math.round(w * 17 / 12);
    const c = canvas(w + 2, h + 2);
    const g = c.getContext('2d');
    if (typeof Avatar !== 'undefined') {
      const src = Avatar.sprite(Avatar.clean(av || DEFAULT_AV) || DEFAULT_AV, { k: 4 });
      const tmp = canvas(w, h);
      const tg = tmp.getContext('2d');
      tg.imageSmoothingEnabled = true;
      tg.imageSmoothingQuality = 'high';
      tg.drawImage(src, 0, 0, w, h);
      // harde randen (echte pixels) en een donkere omlijning
      const img = tg.getImageData(0, 0, w, h);
      const d = img.data;
      const solid = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        if (d[i * 4 + 3] > 110) {
          solid[i] = 1;
          d[i * 4 + 3] = 255;
          // iets meer contrast en verzadiging
          for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, (d[i * 4 + k] - 128) * 1.15 + 136));
        } else d[i * 4 + 3] = 0;
      }
      tg.putImageData(img, 0, 0);
      g.fillStyle = outline;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!solid[y * w + x]) continue;
          g.fillRect(x, y + 1, 3, 1);
          g.fillRect(x + 1, y, 1, 3);
        }
      }
      g.drawImage(tmp, 1, 1);
    } else {
      g.fillStyle = '#4cc9ff';
      g.fillRect(1, 1, w, h);
    }
    if (knights.size > 300) knights.clear();
    knights.set(key, c);
    return c;
  }

  // ---------- Een hele scène ----------
  const RAINBOW = ['#ff4d6d', '#ffd166', '#39ffb0', '#5ee7ff', '#c77dff', '#ffffff'];
  // o: { world, camX, viewW, time (spelklok), t (echte tijd), enemies, items, balls, parts, pops, players, bumps, checkLit, gate }
  function scene(g, o) {
    const world = o.world;
    const theme = world.theme;
    const tiles = tileset(theme);
    const bg = background(theme);
    const P = PAL[theme];
    const H = W.H, vw = o.viewW;
    const camX = Math.round(o.camX);
    // achtergrond
    bg.layers.forEach((layer, i) => {
      const off = -Math.floor(camX * bg.speed[i]) % layer.width;
      for (let x = off; x < vw; x += layer.width) g.drawImage(layer, x, 0);
    });
    g.save();
    g.translate(-camX, 0);
    const tx0 = Math.max(0, Math.floor(camX / T) - 1), tx1 = Math.min(world.len - 1, Math.floor((camX + vw) / T) + 1);
    const frame = Math.floor(o.t * 6) % 4;
    const key = W.THEMES[theme].key;
    // de runepoort en de burcht erachter
    gate(g, world, o, P);
    // checkpointvlag
    if (world.check) flag(g, world.check * T + 8, W.GY * T, o.checkLit, o.t);
    // tegels
    for (let tx = tx0; tx <= tx1; tx++) {
      const col = tx * W.ROWS;
      for (let ty = 0; ty < W.ROWS; ty++) {
        const tile = world.tiles[col + ty];
        if (!tile) continue;
        let si = -1;
        const bump = o.bumps && o.bumps.get(col + ty);
        const by = bump ? -Math.round(Math.sin(Math.min(1, bump) * Math.PI) * 5) : 0;
        switch (tile) {
          case W.GROUND: {
            const above = ty > 0 ? world.tiles[col + ty - 1] : 1;
            if (key === 'grot' && ty <= 1) si = TI.ceil;
            else si = !W.SOLID[above] ? (tx % 3 === 1 ? TI.top2 : TI.top) : ((tx + ty) % 4 === 1 ? TI.fill2 : TI.fill);
            break;
          }
          case W.BRICK: si = TI.brick; break;
          case W.COINBRICK: si = TI.coinbrick; break;
          case W.RUNE: si = TI.rune + [0, 1, 2, 3, 3, 2, 1, 0][Math.floor(o.t * 8) % 8]; break;
          case W.USED: si = TI.used; break;
          case W.STONE: si = TI.stone; break;
          case W.PILLAR: si = world.tiles[col - W.ROWS + ty] === W.PILLAR ? TI.pilR : TI.pilL; break;
          case W.PILLARTOP: si = world.tiles[col - W.ROWS + ty] === W.PILLARTOP ? TI.capR : TI.capL; break;
          case W.PLANK: si = TI.plank; break;
          case W.COIN: si = TI.coin + frame; break;
          case W.LAVA: si = TI.lava + frame; break;
          default: si = -1;
        }
        if (si >= 0) g.drawImage(tiles, si * T, 0, T, T, tx * T, ty * T + by, T, T);
        if (tile === W.LAVA && ty === W.ROWS - 2) g.drawImage(tiles, TI.lavaFill * T, 0, T, T, tx * T, (ty + 1) * T, T, T);
        if (tile === W.RUNE) {
          g.globalAlpha = .18 + Math.sin(o.t * 5 + tx) * .08;
          g.fillStyle = '#7ee8ff';
          g.fillRect(tx * T - 1, ty * T + by - 1, T + 2, T + 2);
          g.globalAlpha = 1;
        }
      }
    }
    // Versiering bovenop de grond (index 6 is een fakkel: de vlam flakkert live)
    const dec = decor(theme);
    for (let tx = tx0; tx <= tx1; tx++) {
      const col = tx * W.ROWS;
      for (let ty = 2; ty < W.ROWS; ty++) {
        if (world.tiles[col + ty] !== W.GROUND || world.tiles[col + ty - 1] !== W.AIR || world.tiles[col + ty - 2] !== W.AIR) continue;
        const h = hash(tx, theme * 31 + ty);
        if (h > .42) break;
        const i = h < .03 ? 6 : Math.floor(h / .42 * DECOR_N) % DECOR_N;
        const di = i === 6 && h >= .03 ? 0 : i;
        g.drawImage(dec, di * T, 0, T, T, tx * T, (ty - 1) * T, T, T);
        if (di === 6) {
          const fx = tx * T + 8, fy = (ty - 1) * T + 4, f = Math.floor(o.t * 10 + tx) % 3;
          g.globalAlpha = .12;
          g.fillStyle = key === 'weide' ? '#ffb347' : P.accent;
          for (const rr of [12, 8, 5]) { g.beginPath(); g.arc(fx, fy, rr, 0, 7); g.fill(); }
          g.globalAlpha = 1;
          g.fillStyle = '#ff8a3d';
          g.fillRect(fx - 2, fy - 3 - f, 4, 4 + f);
          g.fillStyle = '#ffe08a';
          g.fillRect(fx - 1, fy - 2 - (f % 2), 2, 3);
        }
        break;
      }
    }
    // bewegende platforms
    for (const p of world.plats) {
      const pos = W.platPos(p, o.time);
      if (pos.x > camX + vw || pos.x + p.w * T < camX) continue;
      for (let i = 0; i < p.w; i++) g.drawImage(tiles, TI.plank * T, 0, T, T, Math.round(pos.x) + i * T, Math.round(pos.y), T, T);
      g.fillStyle = P.accent;
      g.fillRect(Math.round(pos.x) + p.w * T / 2 - 1, Math.round(pos.y) + 6, 2, 3 + Math.floor(o.t * 10) % 3);
    }
    const S = sprites();
    // power-ups en munten die uit blokken springen
    for (const it of o.items || []) {
      const img = S[it.kind];
      if (!img) continue;
      if (it.kind === 'ster') { g.globalAlpha = .4; g.fillStyle = RAINBOW[Math.floor(o.t * 12) % 6]; g.fillRect(Math.round(it.x - 8), Math.round(it.y - 15), 16, 16); g.globalAlpha = 1; }
      g.drawImage(img, Math.round(it.x - img.width / 2), Math.round(it.y - img.height));
    }
    // vijanden
    for (const e of o.enemies || []) {
      if (e.state === 'gone' || e.x < camX - 20 || e.x > camX + vw + 20) continue;
      let img;
      if (e.type === 'drone') img = S.drone[Math.floor(o.t * 14) % 2];
      else if (e.state === 'shell' || e.state === 'slide' || (e.state === 'dead' && e.type === 'kever')) img = S.shell[e.state === 'slide' ? Math.floor(o.t * 16) % 2 : 0];
      else img = S[e.type][Math.floor(o.t * 6 + e.id) % 2];
      const x = Math.round(e.x - 8), y = Math.round(e.y - 16);
      g.save();
      if (e.state === 'dead') { g.translate(x + 8, y + 8); g.scale(1, -1); g.translate(-x - 8, -y - 8); }
      if (e.state === 'shell' && e.t > W.SHELL_WAKE - 1.5 && Math.floor(o.t * 12) % 2) g.translate(1, 0);
      if (e.vx > 0 && e.type !== 'drone') { g.translate(x * 2 + 16, 0); g.scale(-1, 1); }
      g.drawImage(img, x, y);
      g.restore();
    }
    // ridders: eerst de anderen (doorschijnend), dan jijzelf
    for (const p of o.players || []) drawKnight(g, p, o.t);
    // plasmaballen
    for (const b of o.balls || []) {
      g.fillStyle = '#ff5a1a';
      g.fillRect(Math.round(b.x - 3), Math.round(b.y - 3), 6, 6);
      g.fillStyle = '#ffe08a';
      g.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 4, 4);
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(b.x - 1), Math.round(b.y - 2), 2, 2);
    }
    // stukjes en vonkjes
    for (const p of o.parts || []) {
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.s || 2, p.s || 2);
    }
    g.globalAlpha = 1;
    for (const p of o.pops || []) {
      if (p.coin) { g.drawImage(tiles, (TI.coin + Math.floor(o.t * 16) % 4) * T, 0, T, T, Math.round(p.x - 8), Math.round(p.y - 12), T, T); continue; }
      text(g, p.text, p.x, Math.round(p.y), p.color || '#ffffff');
    }
    g.restore();
  }

  function drawKnight(g, p, t) {
    const big = p.power > 0;
    const sz = W.SIZE[p.power || 0];
    const star = p.star;
    // je eigen ridder krijgt een rand in je eigen kleur, zodat je hem meteen terugvindt
    let outline = !p.ghost && p.color ? p.color : '#06030c';
    if (p.power === 2) outline = Math.floor(t * 4) % 2 ? '#ff9a3d' : '#ff5a1a';
    if (star) outline = RAINBOW[Math.floor(t * 14) % RAINBOW.length];
    const img = knight(p.av, big, outline);
    if (p.blink && Math.floor(t * 20) % 2) return;
    const x = Math.round(p.x), y = Math.round(p.y);
    g.save();
    if (p.ghost) g.globalAlpha = .42;
    const dead = p.act === 3;
    let bob = 0;
    if (p.act === 1) bob = Math.floor(t * 12) % 2;
    g.translate(x, y - bob);
    if (p.left) g.scale(-1, 1);
    if (dead) g.scale(1, -1);
    // in de lucht een beetje uitgerekt, bij het landen platgedrukt
    const sx = p.act === 2 ? .92 : 1, sy = p.act === 2 ? 1.06 : 1;
    const dw = Math.round(img.width * sx), dh = Math.round(img.height * sy);
    g.drawImage(img, -Math.round(dw / 2), dead ? 0 : -dh + 1, dw, dh);
    g.restore();
    if (star) {
      for (let i = 0; i < 3; i++) {
        const a = t * 7 + i * 2.1;
        g.fillStyle = RAINBOW[(i + Math.floor(t * 10)) % 6];
        g.fillRect(Math.round(x + Math.cos(a) * 10), Math.round(y - sz.h / 2 + Math.sin(a) * 12), 2, 2);
      }
    }
    if (p.ghost && p.color) {
      g.globalAlpha = .9;
      g.fillStyle = p.color;
      g.fillRect(x - 2, y - sz.h - 8, 5, 2);
      g.fillRect(x - 1, y - sz.h - 6, 3, 1);
      g.fillRect(x, y - sz.h - 5, 1, 1);
      g.globalAlpha = 1;
    }
    if (p.asking) {
      g.fillStyle = '#ffd166';
      g.fillRect(x - 4, y - sz.h - 16, 9, 9);
      g.fillStyle = '#1a1000';
      g.fillRect(x - 1, y - sz.h - 14, 3, 1); g.fillRect(x + 1, y - sz.h - 13, 1, 2); g.fillRect(x, y - sz.h - 11, 1, 1); g.fillRect(x, y - sz.h - 9, 1, 1);
    }
  }

  // Checkpoint: een vaandel dat oplicht als je er voorbij bent.
  function flag(g, x, y, lit, t) {
    g.fillStyle = '#05070f';
    g.fillRect(x - 1, y - 48, 3, 48);
    g.fillStyle = '#9fb0c8';
    g.fillRect(x, y - 48, 1, 48);
    g.fillStyle = lit ? '#ffd166' : '#5a6380';
    g.fillRect(x - 2, y - 52, 5, 4);
    const wave = Math.round(Math.sin(t * 6) * 1);
    g.fillStyle = lit ? lit : '#3a4160';
    g.fillRect(x + 2, y - 46 + wave, 12, 8);
    g.fillRect(x + 2, y - 38 + wave, 8, 3);
    if (lit) { g.globalAlpha = .3 + Math.sin(t * 8) * .1; g.fillStyle = '#ffffff'; g.fillRect(x + 3, y - 45 + wave, 10, 1); g.globalAlpha = 1; }
  }

  // De runepoort: twee torens met een draaiend portaal, en een burcht erachter.
  function gate(g, world, o, P) {
    const gx = world.gate * T, y = W.GY * T;
    if (gx > o.camX + o.viewW + 200 || gx + 160 < o.camX) return;
    // burcht
    const bx = gx + 64;
    g.fillStyle = '#0a0d1a';
    g.fillRect(bx, y - 64, 80, 64);
    for (let k = 0; k < 80; k += 10) g.fillRect(bx + k, y - 70, 6, 6);
    g.fillRect(bx + 24, y - 104, 32, 40);
    for (let k = 0; k < 32; k += 8) g.fillRect(bx + 24 + k, y - 110, 5, 6);
    g.fillStyle = P.accent;
    for (const [wx, wy] of [[10, -50], [62, -50], [36, -94], [36, -80]]) g.fillRect(bx + wx, y + wy, 4, 6);
    g.fillStyle = '#000';
    g.fillRect(bx + 32, y - 22, 16, 22);
    g.fillStyle = '#ff4d6d';
    g.fillRect(bx + 39, y - 130, 2, 20);
    g.fillRect(bx + 41, y - 130, 8, 6);
    // Hoektorens met een spits dak, banieren en vuurkorven op de muur
    for (const tx of [bx - 6, bx + 70]) {
      g.fillStyle = '#0a0d1a';
      g.fillRect(tx, y - 84, 16, 84);
      for (let k = 0; k < 16; k += 5) g.fillRect(tx + k, y - 89, 3, 5);
      // Spits dak: een driehoek van 20 breed, met een lichte kant links
      for (let k = 0; k < 16; k++) {
        const hw = Math.round(k * .65);
        g.fillStyle = '#1d1238';
        g.fillRect(tx + 8 - hw, y - 105 + k, hw * 2 + 1, 1);
        g.fillStyle = '#3a2468';
        g.fillRect(tx + 8 - hw, y - 105 + k, Math.max(1, hw - 1), 1);
      }
      g.fillStyle = P.accent;
      g.fillRect(tx + 6, y - 70, 4, 6);
      g.fillRect(tx + 6, y - 46, 4, 6);
      g.fillStyle = '#ff4d6d';
      g.fillRect(tx + 8, y - 116, 1, 12);
      g.fillRect(tx + 9, y - 116, 6, 4);
    }
    for (const bxx of [bx + 12, bx + 58]) {
      g.fillStyle = '#5e1a3d';
      g.fillRect(bxx, y - 60, 10, 26);
      g.fillRect(bxx, y - 34, 4, 3); g.fillRect(bxx + 6, y - 34, 4, 3);
      g.fillStyle = '#ffd166';
      g.fillRect(bxx + 4, y - 54, 2, 10); g.fillRect(bxx + 2, y - 50, 6, 2);
    }
    {
      const f = Math.floor(o.t * 10) % 3;
      for (const fx of [bx + 4, bx + 76]) {
        g.globalAlpha = .12;
        g.fillStyle = '#ffb347';
        for (const rr of [11, 7, 4]) { g.beginPath(); g.arc(fx, y - 75, rr, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        g.fillStyle = '#ff8a3d';
        g.fillRect(fx - 2, y - 76 - f, 4, 4 + f);
        g.fillStyle = '#ffe08a';
        g.fillRect(fx - 1, y - 75, 2, 2);
      }
    }
    // poort
    for (const sx of [gx - 4, gx + 32]) {
      g.fillStyle = '#05070f';
      g.fillRect(sx, y - 72, 20, 72);
      g.fillStyle = P.stone;
      g.fillRect(sx + 1, y - 71, 18, 71);
      g.fillStyle = P.stoneHi;
      g.fillRect(sx + 1, y - 71, 18, 2);
      g.fillStyle = P.stoneD;
      for (let k = 6; k < 72; k += 8) g.fillRect(sx + 1, y - 72 + k, 18, 1);
      g.fillStyle = P.accent;
      g.fillRect(sx + 9, y - 64, 2, 52);
    }
    g.fillStyle = '#05070f';
    g.fillRect(gx - 6, y - 82, 60, 12);
    g.fillStyle = P.stoneHi;
    g.fillRect(gx - 5, y - 81, 58, 10);
    g.fillStyle = P.accent;
    g.fillRect(gx + 18, y - 79, 12, 6);
    // portaal
    const cx = gx + 24, cy = y - 34;
    for (let i = 5; i >= 0; i--) {
      g.globalAlpha = .25 + (5 - i) * .12;
      g.fillStyle = i % 2 ? '#c77dff' : '#5ee7ff';
      const rw = 6 + i * 1.6 + Math.sin(o.t * 4 + i) * 1, rh = 14 + i * 3.4;
      g.beginPath();
      g.ellipse(cx, cy, rw, rh, 0, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const a = o.t * 3 + i;
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a * 1.3) * 22), 1, 1);
    }
  }

  return { PAL, TI, tileset, background, sprites, knight, scene, text, drawKnight, DEFAULT_AV };
})();

// Een eigen chiptune-deuntje (blokgolf, driehoeksbas en een tikje ruis), in een lus. Gebruikt sfx.muted uit fx.js.
const PxMusic = (() => {
  let ctx = null, gain = null, timer = null, step = 0, next = 0, on = false;
  const BPM = 144, STEP = 60 / BPM / 2;
  const n = s => (s === null ? null : 440 * Math.pow(2, (s - 9) / 12)); // 0 = C4
  // Melodie (halftonen t.o.v. C4) en bas, 32 achtsten per ronde.
  const LEAD = [16, null, 19, 21, null, 21, 19, 16, 14, null, 16, 19, null, 16, 14, 12, 9, null, 12, 14, null, 16, 14, 12, 14, null, 16, null, 9, null, null, null,
    16, null, 19, 21, null, 24, 23, 21, 19, null, 21, 19, null, 16, 14, 16, 17, null, 16, 14, null, 12, 14, 12, 11, null, 12, null, 9, null, null, null];
  const BASS = [-15, -3, -15, -3, -15, -3, -15, -3, -19, -7, -19, -7, -19, -7, -19, -7, -17, -5, -17, -5, -17, -5, -17, -5, -20, -8, -20, -8, -20, -8, -20, -8];
  function note(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(gn).connect(gain);
    o.start(t);
    o.stop(t + dur + .02);
  }
  let noiseBuf = null;
  function hat(t) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .05, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const s = ctx.createBufferSource(), gn = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    gn.gain.value = .25;
    s.buffer = noiseBuf;
    s.connect(f).connect(gn).connect(gain);
    s.start(t);
  }
  function tick() {
    if (!on || !ctx) return;
    const muted = typeof sfx !== 'undefined' && sfx.muted;
    gain.gain.setTargetAtTime(muted ? 0 : .05, ctx.currentTime, .05);
    while (next < ctx.currentTime + .25) {
      const l = LEAD[step % LEAD.length], b = BASS[step % BASS.length];
      if (l !== null) note(n(l), next, STEP * 1.6, 'square', .5);
      note(n(b), next, STEP * .9, 'triangle', .9);
      if (step % 2) hat(next);
      next += STEP;
      step++;
    }
  }
  return {
    get on() { return on; },
    start() {
      if (on) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      on = true;
      next = ctx.currentTime + .05;
      timer = setInterval(tick, 60);
      tick();
    },
    stop() {
      on = false;
      clearInterval(timer);
      if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, .05);
    },
  };
})();
