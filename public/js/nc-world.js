// Neon-Camelot: de stad en de regels, gedeeld door de server, de leerlingen en het bord.
// De stad ligt altijd op dezelfde plek (vaste seed): wijken, straten, de haven, het bos, de neonwijk en de burcht in het midden.
// Alles in meters. Een tegel is 4 x 4 m. Elke 13 tegels loopt een straat van 2 tegels breed.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NcWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const TILT = .66;            // schuin bovenaanzicht: zoveel korter lijkt de grond in de diepte
  const TILE = 4;
  const N = 65;                // tegels per kant
  const L = N * TILE;          // 260 m
  const BLOK = 13;             // 11 tegels blok + 2 tegels straat
  const G = { gras: 0, weg: 1, plein: 2, water: 3 };
  const ENERGIE_S = 40;        // zo lang rij je op een volle batterij, dan komt er een vraag
  const WRONG_S = 12;          // na een fout antwoord toch een beetje energie
  const COLORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // Voertuigen: snelheid in m/s, vanaf hoeveel kristallen je het krijgt, wat het kan.
  const VOERTUIGEN = [
    { id: 'paard', naam: 'Robopaard', icoon: '🐴', v: 9, nodig: 0 },
    { id: 'board', naam: 'Hoverboard', icoon: '🛹', v: 10.5, nodig: 6, water: true },
    { id: 'kar', naam: 'Raketkar', icoon: '🚀', v: 9, weg: 16, nodig: 15 },
    { id: 'griffioen', naam: 'Griffioen', icoon: '🦅', v: 12.5, nodig: 30, vliegt: true },
  ];

  // Wat je verdient (kristallen)
  const BELONING = { stunt: 1, vraag: 1, koerier: 4, snel: 2, race: 5, gnoom: 2, blus: 1, geblust: 3, regen: 1 };
  // Samen de stad laten oplichten: bij deze totalen gaat een nieuw stuk van de stad aan.
  const LICHT = [20, 50, 100, 170, 260, 380, 520, 700, 900, 1200];

  // Wijken per blok (5 x 5): h haven, b bos, g berg, w woonwijk, c burcht, m markt, n neonwijk
  const PLAN = ['hbbgg', 'hwwgn', 'hwcwn', 'hmmnn', 'hmwnb'];
  const WIJK = { h: 'de haven', b: 'het bos', g: 'de berg', w: 'de woonwijk', c: 'het burchtplein', m: 'de markt', n: 'de neonwijk' };

  // Soorten voorwerpen: [naam, breedte op het beeld (m), grondvlak in tegels (b x d), massief, voetje (deel van de hoogte onder het grondvlak)]
  const SOORTEN = [
    ['huis1', 13.5, 3, 3, true, .1], ['huis2', 13.5, 3, 3, true, .1], ['huis3', 13.5, 3, 3, true, .1],
    ['huis4', 13.5, 3, 3, true, .1], ['huis5', 13.5, 3, 3, true, .1], ['huis6', 13.5, 3, 3, true, .1],
    ['neon1', 7.5, 2, 2, true, .06], ['neon2', 14, 3, 3, true, .1], ['neon3', 14, 3, 3, true, .1],
    ['neon4', 13.5, 3, 3, true, .08], ['neon5', 14, 3, 3, true, .12], ['neon6', 13.5, 3, 3, true, .1],
    ['burcht', 31, 7, 6, true, .1],
    ['boom', 6.5, 1, 1, true, .06], ['den', 4.6, 1, 1, true, .04], ['lantaarn', 1.9, 1, 1, false, .02],
    ['kraam', 7.4, 2, 2, true, .08], ['fontein', 7.6, 2, 2, true, .14], ['rots', 7, 2, 2, true, .12],
    ['boot', 8.5, 2, 2, false, .1], ['duikboot', 6.4, 2, 1, false, .12], ['vuurtoren', 8.5, 2, 2, true, .06],
    ['kisten', 7.2, 2, 2, true, .1], ['kraan', 7.6, 2, 2, true, .06],
    ['ruimtehaven', 15, 4, 4, true, .06], ['molen', 11.5, 3, 3, true, .06], ['magetoren', 7.4, 2, 2, true, .05],
  ];
  const K = Object.fromEntries(SOORTEN.map((s, i) => [s[0], i]));
  const HUIZEN = [K.huis1, K.huis2, K.huis3, K.huis4, K.huis5, K.huis6];
  const NEON = [K.neon2, K.neon3, K.neon4, K.neon5, K.neon6];

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

  const isWeg = t => t % BLOK === 11 || t % BLOK === 12;
  // Het middelpunt van een kruispunt (in meters): straten liggen op tegel 11-12, 24-25, ...
  const kruis = i => (i * BLOK + 12) * TILE;

  // De stad bouwen: grond per tegel, voorwerpen, missieplekken.
  function bouw() {
    const R = rng(2026);
    const grond = new Uint8Array(N * N);
    const massief = new Uint8Array(N * N);
    const objs = [];
    const markers = [];
    const kust = ty => 4 + Math.round(Math.sin(ty * .35) * 1.2 + Math.sin(ty * .11) * .8);
    const wijkVan = (tx, ty) => {
      const bx = Math.min(4, Math.floor(tx / BLOK)), by = Math.min(4, Math.floor(ty / BLOK));
      return PLAN[by][bx];
    };
    for (let ty = 0; ty < N; ty++) {
      for (let tx = 0; tx < N; tx++) {
        const i = ty * N + tx;
        const wijk = wijkVan(tx, ty);
        let g = G.gras;
        if (isWeg(tx) || isWeg(ty)) g = G.weg;
        else if (wijk === 'm' || wijk === 'n' || wijk === 'c') g = G.plein;
        if (wijk === 'h' && tx < 11) {
          if (tx < kust(ty)) g = isWeg(ty) && tx >= 1 ? G.plein : G.water; // steigers in het water
          else g = G.plein;
        }
        grond[i] = g;
      }
    }
    const vrij = (tx, ty, w, d) => {
      for (let y = ty; y < ty + d; y++) for (let x = tx; x < tx + w; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N) return false;
        const g = grond[y * N + x];
        if (massief[y * N + x] || g === G.water || g === G.weg) return false;
      }
      return true;
    };
    // Een voorwerp met zijn grondvlak linksboven op tegel (tx, ty).
    const zet = (k, tx, ty, extra) => {
      const [, , w, d, solid] = SOORTEN[k];
      if (solid && !vrij(tx, ty, w, d)) return null;
      if (solid) for (let y = ty; y < ty + d; y++) for (let x = tx; x < tx + w; x++) massief[y * N + x] = 1;
      const o = { k, x: (tx + w / 2) * TILE, y: (ty + d / 2) * TILE, ...extra };
      objs.push(o);
      return o;
    };
    const kies = list => list[Math.floor(R() * list.length)];
    for (let by = 0; by < 5; by++) {
      for (let bx = 0; bx < 5; bx++) {
        const wijk = PLAN[by][bx];
        const x0 = bx * BLOK, y0 = by * BLOK; // blok: tegels x0..x0+10
        // Een missieplek aan de straat onder het blok (niet bij elk blok).
        if ((bx + by) % 2 === 0) {
          const soort = 'hmwc'.includes(wijk) ? 'koerier' : 'race';
          markers.push({ x: (x0 + 5.5) * TILE, y: (y0 + 11.6) * TILE, soort, wijk });
        }
        if (wijk === 'c') {
          zet(K.burcht, x0 + 2, y0 + 1);
          for (const x of [x0, x0 + 9]) { zet(K.fontein, x, y0 + 8); zet(K.lantaarn, x + 1, y0); }
          for (const x of [x0 + 3, x0 + 7]) zet(K.lantaarn, x, y0 + 9);
          continue;
        }
        if (wijk === 'w') {
          for (const [dx, dy] of [[0, 0], [4, 0], [8, 0], [0, 4], [8, 4], [0, 8], [4, 8], [8, 8]]) {
            if (R() < .86) zet(kies(HUIZEN), x0 + dx, y0 + dy);
          }
          zet(R() < .5 ? K.fontein : K.boom, x0 + 4 + Math.floor(R() * 2), y0 + 4 + Math.floor(R() * 2));
          for (let i = 0; i < 4; i++) zet(R() < .5 ? K.boom : K.lantaarn, x0 + 3 + Math.floor(R() * 5), y0 + 3 + Math.floor(R() * 5));
        } else if (wijk === 'n') {
          for (const [dx, dy] of [[0, 0], [4, 0], [8, 0], [0, 4], [8, 4], [0, 8], [4, 8], [8, 8]]) {
            if (R() < .25) zet(K.neon1, x0 + dx, y0 + dy);
            else zet(kies(NEON), x0 + dx, y0 + dy);
          }
          zet(K.neon1, x0 + 4 + Math.floor(R() * 2), y0 + 4);
          for (let i = 0; i < 4; i++) zet(K.lantaarn, x0 + 3 + Math.floor(R() * 5), y0 + 3 + Math.floor(R() * 5));
        } else if (wijk === 'm') {
          for (const [dx, dy] of [[1, 1], [4, 1], [7, 1], [1, 7], [4, 7], [7, 7], [1, 4], [8, 4]]) zet(K.kraam, x0 + dx, y0 + dy);
          zet(K.fontein, x0 + 4, y0 + 4);
          for (let i = 0; i < 3; i++) zet(K.kisten, x0 + 2 + Math.floor(R() * 7), y0 + 2 + Math.floor(R() * 7));
          for (const [dx, dy] of [[0, 0], [10, 0], [0, 10], [10, 10]]) zet(K.lantaarn, x0 + dx, y0 + dy);
        } else if (wijk === 'b' || wijk === 'g') {
          if (wijk === 'b') zet(R() < .5 ? K.molen : K.magetoren, x0 + 4, y0 + 4);
          else if (bx === 4 && by === 0) zet(K.ruimtehaven, x0 + 4, y0 + 3);
          else zet(K.magetoren, x0 + 5, y0 + 4);
          const n = wijk === 'b' ? 24 : 12;
          for (let i = 0; i < n; i++) zet(wijk === 'b' ? (R() < .55 ? K.boom : K.den) : K.den, x0 + Math.floor(R() * 11), y0 + Math.floor(R() * 11));
          if (wijk === 'g') for (let i = 0; i < 7; i++) zet(K.rots, x0 + Math.floor(R() * 10), y0 + Math.floor(R() * 10));
        } else if (wijk === 'h') {
          // De kade: kisten en kranen, een vuurtoren op de hoek, bootjes in het water.
          const k0 = kust(y0 + 5);
          zet(by === 2 ? K.vuurtoren : K.kraan, Math.max(k0, 6), y0 + 1);
          zet(K.kisten, 8, y0 + 4);
          zet(R() < .5 ? K.kisten : K.kraan, 8, y0 + 8);
          zet(K.lantaarn, 10, y0);
          objs.push({ k: R() < .6 ? K.boot : K.duikboot, x: 1.6 * TILE + R() * 4, y: (y0 + 4 + R() * 4) * TILE, deco: true });
        }
      }
    }
    // De twee steigers krijgen een bootje
    objs.sort((a, b) => front(a) - front(b) || a.x - b.x);
    objs.forEach((o, i) => { o.i = i; });
    return { grond, massief, objs, markers };
  }
  const front = o => o.y + SOORTEN[o.k][3] * TILE / 2;

  const STAD = bouw();

  const tegel = (x, y) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return -1;
    return ty * N + tx;
  };
  const grondOp = (x, y) => { const i = tegel(x, y); return i < 0 ? -1 : STAD.grond[i]; };
  // Kan dit voertuig hier staan? Vier punten rond het midden (smaller in de diepte).
  function kan(veh, x, y) {
    if (x < 1 || y < 1 || x > L - 1 || y > L - 1) return false;
    const v = VOERTUIGEN[veh];
    if (v.vliegt) return true;
    for (const [dx, dy] of [[-.8, -.45], [.8, -.45], [-.8, .45], [.8, .45]]) {
      const i = tegel(x + dx, y + dy);
      if (i < 0 || STAD.massief[i]) return false;
      if (STAD.grond[i] === G.water && !v.water) return false;
    }
    return true;
  }
  const snelheid = (veh, x, y) => {
    const v = VOERTUIGEN[veh];
    return v.weg && grondOp(x, y) === G.weg ? v.weg : v.v;
  };
  const wijkOp = (x, y) => {
    const bx = Math.max(0, Math.min(4, Math.floor(x / TILE / BLOK))), by = Math.max(0, Math.min(4, Math.floor(y / TILE / BLOK)));
    return PLAN[by][bx];
  };
  // Een willekeurige plek waar een robopaard kan staan, eventueel binnen één blok.
  function vrijePlek(R, blok) {
    for (let i = 0; i < 200; i++) {
      const x = blok ? (blok[0] * BLOK + .5 + R() * 10) * TILE : 6 + R() * (L - 12);
      const y = blok ? (blok[1] * BLOK + .5 + R() * 10) * TILE : 6 + R() * (L - 12);
      if (kan(0, x, y)) return { x, y };
    }
    return { x: kruis(2), y: kruis(2) };
  }
  const startPlek = R => ({ x: (2 * BLOK + 2.6 + R() * 5.8) * TILE, y: (2 * BLOK + 8.4 + R() * 1.8) * TILE });

  // Een raceparcours: van de missieplek langs straten naar kruispunten, met ringen onderweg.
  function parcours(R, m) {
    let i = Math.max(0, Math.min(4, Math.round((m.x / TILE - 12) / BLOK))), j = Math.max(0, Math.min(4, Math.round((m.y / TILE - 12) / BLOK)));
    const ringen = [];
    let px = m.x, py = m.y;
    let laatst = null;
    for (let s = 0; s < 3; s++) {
      const opties = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => i + a >= 0 && i + a <= 4 && j + b >= 0 && j + b <= 4 && !(laatst && a === -laatst[0] && b === -laatst[1]));
      const [a, b] = opties[Math.floor(R() * opties.length)];
      const kx = kruis(i), ky = kruis(j);
      if (s === 0) ringen.push([(px + kx) / 2, (py + ky) / 2]);
      ringen.push([kx, ky]);
      i += a; j += b; laatst = [a, b];
      ringen.push([(kx + kruis(i)) / 2, (ky + kruis(j)) / 2]);
      px = kruis(i); py = kruis(j);
    }
    ringen.push([px, py]);
    return ringen.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }


  // ---------- De levende stad ----------
  // Verkeer en bewoners volgen een vaste dienstregeling: iedereen (server, leerlingen, bord) rekent ze uit de speeltijd,
  // zonder dat er iets over het netwerk moet. tt = seconden sinds de start.
  const LUS = L + 40;
  const pmod = (a, m) => ((a % m) + m) % m;
  // [beeld, breedte op het beeld (m), lengte voor botsen (m), snelheid (m/s), kijkt het beeld naar links?]
  const AUTOS = [['n-koets', 5.6, 4.4, 6.5, false], ['n-tram', 8.6, 7.4, 5, false], ['n-vracht', 6.2, 5.2, 5.5, false], ['n-taxi', 4.2, 3.4, 8, true]];
  const VERKEER = [];
  {
    const R = rng(77);
    for (let i = 0; i < 5; i++) for (const as of ['h', 'v']) for (const r of [1, -1]) {
      const n = 1 + (R() < .55 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const a = Math.floor(R() * AUTOS.length);
        VERKEER.push({ as, i, r, a, fase: (k / n) * LUS + R() * 60, v: AUTOS[a][3] * (.9 + R() * .2) });
      }
    }
  }
  // Waar rijdt auto c op tijd tt? Rechts rijden: wie naar rechts gaat, rijdt onder; wie naar beneden gaat, links.
  function autoOp(c, tt) {
    const s = pmod(c.fase + c.v * tt, LUS) - 20;
    const pos = c.r > 0 ? s : L - s;
    const baan = kruis(c.i) + (c.as === 'h' ? 1.9 * c.r : -1.9 * c.r);
    return c.as === 'h' ? { x: pos, y: baan, dx: c.r, dy: 0 } : { x: baan, y: pos, dx: 0, dy: c.r };
  }
  // Bewoners wandelen heen en weer langs de rand van een straat, tussen twee kruispunten.
  const BEWONERS = ['b-markt', 'b-tovenaar', 'b-robot', 'b-bakker', 'b-oude', 'b-hond'];
  const VOLK = [];
  {
    const R = rng(91);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) for (const as of ['h', 'v']) {
      if (R() < .35) continue;
      const a = j === 0 ? 8 : kruis(j - 1) + 6, b = kruis(j) - 6;
      VOLK.push({ as, i, a, b, kant: R() < .5 ? -1 : 1, beeld: Math.floor(R() * BEWONERS.length), fase: R() * 100, v: .9 + R() * .6 });
    }
  }
  function bewonerOp(b, tt) {
    const len = b.b - b.a;
    const s = pmod(b.fase + b.v * tt, len * 2);
    const heen = s < len;
    const pos = b.a + (heen ? s : len * 2 - s);
    const baan = kruis(b.i) + 3.3 * b.kant;
    return b.as === 'h' ? { x: pos, y: baan, dir: heen ? 1 : -1 } : { x: baan, y: pos, dir: b.kant };
  }
  // Schansen op de straten van links naar rechts (twee per stuk straat: één per rijrichting) en turboplaten op de straten van boven naar onder.
  // Ze liggen op de stukken straat zonder missieplek.
  const SCHANSEN = [], TURBO = [];
  for (let by = 0; by < 5; by++) for (let bx = 1; bx < 5; bx++) {
    if ((bx + by) % 2 === 0) continue;
    const x = (bx * BLOK + 5.5) * TILE;
    SCHANSEN.push({ x: x - 3, y: kruis(by) + 1.9, r: 1 }, { x: x + 3, y: kruis(by) - 1.9, r: -1 });
  }
  for (let bx = 0; bx < 5; bx++) for (let by = 1; by < 5; by++) if ((bx + by) % 2 === 0) TURBO.push({ x: kruis(bx), y: (by * BLOK + 5.5) * TILE });
  const SPRONG_S = 1.1;      // zo lang ben je in de lucht
  const SPRONG_H = 4.5;      // zo hoog (m)
  const TURBO_S = 2.5;       // zo lang duurt de turbo
  const TURBO_X = 1.6;       // zoveel sneller
  // Dag en nacht: een dag duurt 4 minuten, het spel begint op klaarlichte dag. 0 = dag, 1 = diepe nacht.
  const DAG_S = 240;
  const nacht = tt => Math.max(0, Math.min(1, (1 - Math.cos(tt / DAG_S * Math.PI * 2)) / 2 * 1.7 - .5));

  // Raster om snel de voorwerpen per stuk stad te vinden (stukken van CHUNK meter).
  const CHUNK = 32;
  const NC = Math.ceil(L / CHUNK);
  const PER_STUK = Array.from({ length: NC * NC }, () => []);
  for (const o of STAD.objs) {
    const cx = Math.min(NC - 1, Math.floor(o.x / CHUNK)), cy = Math.min(NC - 1, Math.floor(front(o) / CHUNK));
    PER_STUK[cy * NC + cx].push(o);
  }

  return {
    TILT, TILE, N, L, BLOK, G, ENERGIE_S, WRONG_S, COLORS, VOERTUIGEN, BELONING, LICHT, PLAN, WIJK, SOORTEN, K, HUIZEN,
    STAD, CHUNK, NC, PER_STUK, AUTOS, VERKEER, autoOp, BEWONERS, VOLK, bewonerOp, SCHANSEN, TURBO, SPRONG_S, SPRONG_H, TURBO_S, TURBO_X, DAG_S, nacht, rng, isWeg, kruis, front, tegel, grondOp, kan, snelheid, wijkOp, vrijePlek, startPlek, parcours,
  };
});
