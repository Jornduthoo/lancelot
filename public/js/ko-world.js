// Kolkridder: de stad en de regels, gedeeld door de server, de leerlingen en het bord.
// De stad wordt uit een getal (seed) gebouwd: iedereen bouwt dezelfde stad, de server stuurt alleen wat al opgeslokt is.
// Afmetingen in meters. r = straal van een kolk; een voorwerp past erin als zijn straal s kleiner is dan r * FIT.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KoWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const TILT = .62;            // schuin bovenaanzicht: zoveel korter lijkt de grond in de diepte
  const START_R = 1;
  const FIT = .92;
  const GROW = .2;             // elk voorwerp geeft s * s * GROW oppervlakte
  const PLASMA_S = 30;         // zo lang draait je kolk op volle plasma, dan komt er een vraag
  const WRONG_S = 12;          // na een fout antwoord krijg je toch een beetje
  const ZUIG_S = 8;            // zuigkracht na een juist antwoord
  const ZUIG = 1.8;            // met zuigkracht slok je tot zo ver (x r)
  const RESPAWN_MS = 1800;     // duelmodus: na opgeslokt te zijn
  const SAFE_MS = 3000;
  const REGROW_MS = 40000;     // opgeslokte voorwerpen komen na een tijd terug (als er geen kolk vlakbij is)
  const DUEL_BIG = 1.15;       // je slokt een andere kolk als je zoveel keer groter bent
  const COLORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // [naam, straal s, hoogte op het beeld (x s)]. Volgorde = volgorde op de geschilderde bladen.
  const KINDS = [
    ['munt', .35, 2.2], ['ton', .5, 1.7], ['hooi', .65, 1.4], ['lantaarn', .42, 5.5], ['boom', .9, 2.6], ['kar', 1.1, 1.5],
    ['robopaard', 1.3, 1.9], ['kraam', 1.7, 1.6], ['beeld', 1.45, 2.6], ['fontein', 2, 1.3], ['zweefkar', 1.35, 1.4], ['banier', .8, 4.6],
    ['huis', 2.6, 2.8], ['toren', 3.4, 3.4], ['burcht', 6, 1.9],
  ];
  const K = Object.fromEntries(KINDS.map((k, i) => [k[0], i]));

  // Snelheid in meter per seconde: grote kolken rijden iets sneller, maar de camera zoomt ook uit.
  const speed = r => 5.2 * Math.pow(r, .32);
  const radius = area => Math.sqrt(area);
  const value = kind => KINDS[kind][1] * KINDS[kind][1] * GROW;
  const fits = (kind, r) => KINDS[kind][1] < r * FIT;

  // Hoe groot de stad is: groter met meer kolken.
  const size = n => Math.round(Math.max(84, Math.min(176, 64 + 18 * Math.sqrt(Math.max(1, n)))) / 20) * 20;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // De stad: blokken van 20 x 20 m met straten van 4 m. In het midden de burcht.
  // Elk blok is een woonwijk, een park, een markt of een torenwijk. Op de straten lantaarns, munten en karren.
  // Geeft [{k, x, y}] terug, gesorteerd van achter naar voor (y), zodat tekenen in volgorde klopt.
  function city(seed, L) {
    const R = rng(seed);
    const out = [];
    const B = 20, ST = 4, N = Math.floor(L / B), mid = Math.floor(N / 2);
    const put = (k, x, y) => { if (x > 1 && y > 1 && x < L - 1 && y < L - 1) out.push({ k, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }); };
    const scatter = (k, x0, y0, w, h, n) => { for (let i = 0; i < n; i++) put(k, x0 + R() * w, y0 + R() * h); };
    for (let by = 0; by < N; by++) {
      for (let bx = 0; bx < N; bx++) {
        const x0 = bx * B + ST / 2, y0 = by * B + ST / 2, w = B - ST;  // het blok binnen de straten
        const cx = x0 + w / 2, cy = y0 + w / 2;
        // Straten: lantaarns op de hoeken, munten en af en toe een kar, robopaard of zweefkar.
        put(K.lantaarn, bx * B + .9, by * B + .9);
        scatter(K.munt, bx * B, by * B + .3, B, ST - .6, 3);
        scatter(K.munt, bx * B + .3, by * B, ST - .6, B, 3);
        const verkeer = R();
        if (verkeer < .3) put(K.robopaard, bx * B + 6 + R() * 8, by * B + ST / 2);
        else if (verkeer < .5) put(K.zweefkar, bx * B + ST / 2, by * B + 6 + R() * 8);
        else if (verkeer < .65) put(K.kar, bx * B + 6 + R() * 8, by * B + ST / 2);
        if (bx === mid && by === mid) {
          // Het burchtplein
          put(K.burcht, cx, cy);
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { put(K.banier, cx + dx * 7.2, cy + dy * 7.2); put(K.ton, cx + dx * 7.4, cy + dy * 5.6); }
          scatter(K.munt, x0, y0, w, w, 10);
          continue;
        }
        const soort = (bx + by) % 3 === 0 && R() < .5 ? 'toren' : ['wijk', 'wijk', 'park', 'markt'][Math.floor(R() * 4)];
        if (soort === 'wijk') {
          // Vier huizen rond een binnenplaats met bomen, tonnen en hooi.
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(K.huis, cx + dx * 4.6 + (R() - .5), cy + dy * 4.6 + (R() - .5));
          put(R() < .5 ? K.boom : K.fontein, cx, cy);
          scatter(K.ton, x0 + 1, y0 + 1, w - 2, w - 2, 4);
          scatter(K.hooi, x0 + 1, y0 + 1, w - 2, w - 2, 2);
          scatter(K.munt, x0, y0, w, w, 6);
          if (R() < .4) put(K.kar, cx + (R() - .5) * 4, cy + 5.5);
        } else if (soort === 'park') {
          put(K.fontein, cx, cy);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + R() * .3; put(K.boom, cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 5.5); }
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(K.lantaarn, cx + dx * 3, cy + dy * 3);
          put(K.beeld, cx + (R() < .5 ? -1 : 1) * 3.2, cy + 3.2);
          scatter(K.hooi, x0 + 1, y0 + 1, w - 2, w - 2, 2);
          scatter(K.munt, x0, y0, w, w, 8);
        } else if (soort === 'markt') {
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(K.kraam, cx + dx * 4 + (R() - .5), cy + dy * 4 + (R() - .5));
          put(K.beeld, cx, cy);
          put(K.kar, cx - 5.5, cy);
          put(K.robopaard, cx + 5.5, cy);
          scatter(K.ton, x0 + .5, y0 + .5, w - 1, w - 1, 6);
          scatter(K.hooi, x0 + .5, y0 + .5, w - 1, w - 1, 3);
          scatter(K.munt, x0, y0, w, w, 8);
        } else {
          // Torenwijk: een wachttoren, twee huizen, banieren.
          put(K.toren, cx + (R() - .5) * 2, cy - 2.5);
          put(K.huis, cx - 4.5, cy + 4.5);
          put(K.huis, cx + 4.5, cy + 4.5);
          put(K.banier, cx - 6, cy - 6);
          put(K.banier, cx + 6, cy - 6);
          scatter(K.ton, x0 + 1, y0 + 1, w - 2, w - 2, 3);
          scatter(K.munt, x0, y0, w, w, 6);
        }
      }
    }
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return out;
  }

  // Een raster om snel de voorwerpen rond een punt te vinden (vakjes van CELL meter).
  const CELL = 8;
  function grid(list, L) {
    const n = Math.ceil(L / CELL) + 1;
    const cells = Array.from({ length: n * n }, () => []);
    list.forEach((o, i) => cells[Math.floor(o.y / CELL) * n + Math.floor(o.x / CELL)].push(i));
    return {
      n, cells,
      each(x, y, rad, fn) {
        const c0 = Math.max(0, Math.floor((x - rad) / CELL)), c1 = Math.min(n - 1, Math.floor((x + rad) / CELL));
        const r0 = Math.max(0, Math.floor((y - rad) / CELL)), r1 = Math.min(n - 1, Math.floor((y + rad) / CELL));
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) for (const i of cells[cy * n + cx]) fn(i);
      },
    };
  }

  return { TILT, START_R, FIT, GROW, PLASMA_S, WRONG_S, ZUIG_S, ZUIG, RESPAWN_MS, SAFE_MS, REGROW_MS, DUEL_BIG, COLORS, KINDS, K, CELL, speed, radius, value, fits, size, rng, city, grid };
});
