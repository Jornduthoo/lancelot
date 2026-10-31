// Hooibergjacht: de hooibergen, gedeeld door de server, de leerlingen en het bord.
// Een hooiberg is een raster van vakjes in de vorm van een koepel. Elk vakje heeft lagen hooi (1 tot 3: dieper = dikker).
// In één vakje zit de kristallen naald, in een paar andere zitten tandwielen en runenmunten.
// Alles volgt uit een getal (seed) per spel, het nummer van de leerling en het nummer van de hooiberg:
// zo kent de server de plek van de naald zonder dat iemand iets doorstuurt.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HbWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  // Werktuigen: een juist antwoord geeft het volgende. r = straal in vakjes.
  const TOOLS = [
    { name: 'Hooivork', icon: '🔱', r: .9, color: '#ffc94a' },
    { name: 'Plasmazeis', icon: '⚡', r: 1.5, color: '#5ee7ff' },
    { name: 'Windkanon', icon: '🌀', r: 2.2, color: '#c77dff' },
    { name: 'Wervelstorm', icon: '🌪️', r: 3.1, color: '#ff6bd6' },
  ];
  const DIG_MS = 95;        // zo vaak graaf je als je de knop vasthoudt
  const ENERGY = 110;       // elke graafbeurt kost 1; leeg = een vraag
  const MIN_FIND_S = 2.5;   // sneller kan je een naald niet vinden (controle op de server)
  const KOMPAS_S = 6;       // zo lang wijst het kompas na een juist antwoord
  const POINTS = { naald: 200, snel: 4, tandwiel: 10, munt: 25 };
  const SNEL_S = 45;        // onder deze tijd krijg je per seconde extra punten voor de naald

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hoe groot de k-de hooiberg is: elke berg wat groter en dikker.
  function sizeOf(k) {
    return { cols: Math.min(54, 24 + k * 5), rows: Math.min(27, 12 + Math.round(k * 2.5)), max: k < 2 ? 2 : 3 };
  }

  // De hooiberg k van leerling n. hp[i] = lagen hooi in vakje i (0 = geen hooi of buiten de berg).
  function stack(seed, n, k) {
    const r = rng(seed * 7919 + n * 104729 + k * 1299709);
    const { cols, rows, max } = sizeOf(k);
    const hp = new Uint8Array(cols * rows);
    const top = new Int16Array(cols); // bovenste rij met hooi per kolom
    const bump = [r() * 6, r() * 6, r() * 6];
    for (let c = 0; c < cols; c++) {
      const dx = (c + .5) / cols * 2 - 1;
      let h = Math.pow(Math.max(0, 1 - dx * dx), .55) * rows;
      h *= .9 + .1 * Math.sin(c * .7 + bump[0]) * Math.cos(c * .31 + bump[1]);
      h = Math.max(2, Math.min(rows, Math.round(h)));
      top[c] = rows - h;
      for (let y = top[c]; y < rows; y++) {
        const depth = y - top[c];
        hp[y * cols + c] = Math.min(max, depth < 2 ? 1 : depth < 5 ? 2 : 3);
      }
    }
    // De naald: niet aan de rand, niet bovenaan.
    const inside = [];
    for (let y = 0; y < rows; y++) for (let c = 2; c < cols - 2; c++) if (y - top[c] >= 2) inside.push(y * cols + c);
    const needle = inside[Math.floor(r() * inside.length)];
    const items = [];
    const used = new Set([needle]);
    for (let i = 0; i < 6 && inside.length > 8; i++) {
      const cell = inside[Math.floor(r() * inside.length)];
      if (used.has(cell)) continue;
      used.add(cell);
      items.push({ id: `${k}.${i}`, cell, kind: r() < .35 ? 'munt' : 'tandwiel' });
    }
    const total = hp.reduce((a, v) => a + v, 0);
    return { k, cols, rows, hp, top, needle, nc: needle % cols, nr: Math.floor(needle / cols), items, total, angle: r() * Math.PI, glint: r() * 6 };
  }

  // Graven op plek (x, y) in vakjes met straal rad: elk geraakt vakje verliest één laag. Geeft de geraakte vakjes terug.
  function dig(st, x, y, rad) {
    const hit = [];
    const r2 = rad * rad;
    const c0 = Math.max(0, Math.floor(x - rad)), c1 = Math.min(st.cols - 1, Math.floor(x + rad));
    const y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(st.rows - 1, Math.floor(y + rad));
    for (let yy = y0; yy <= y1; yy++) {
      for (let c = c0; c <= c1; c++) {
        const dx = c + .5 - x, dy = yy + .5 - y;
        if (dx * dx + dy * dy > r2 + .35) continue;
        const i = yy * st.cols + c;
        if (st.hp[i] > 0) { st.hp[i]--; hit.push(i); }
      }
    }
    return hit;
  }

  // Het kompas: een cirkel waarin de naald zeker zit (het midden ligt er wat naast, zodat je nog moet zoeken).
  function kompas(st, nr) {
    const r = rng(st.k * 31 + nr * 977 + st.needle);
    const rad = Math.max(2.6, Math.min(st.cols, st.rows) * .22);
    const a = r() * Math.PI * 2, d = r() * rad * .6;
    return { x: st.nc + .5 + Math.cos(a) * d, y: st.nr + .5 + Math.sin(a) * d, r: rad };
  }

  return { COLORS, TOOLS, DIG_MS, ENERGY, MIN_FIND_S, KOMPAS_S, POINTS, SNEL_S, rng, sizeOf, stack, dig, kompas };
});
