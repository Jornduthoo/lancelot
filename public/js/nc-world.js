// Neon-Camelot: de stad en de regels, gedeeld door de server, de leerlingen en het bord.
// Alles van bovenaf. De stad ligt altijd op dezelfde plek (vaste seed): wijken, straten, de haven, het bos, de neonwijk en de burcht.
// Alles in meters. Een tegel is 4 x 4 m. Elke 13 tegels loopt een straat van 2 tegels (8 m) breed.
// Het rijden (drive) rekent de leerling zelf uit, elke frame: zo stuurt de kart zonder vertraging. De server controleert alleen.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NcWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const TILE = 4;
  const N = 65;                // tegels per kant
  const L = N * TILE;          // 260 m
  const BLOK = 13;             // 11 tegels blok + 2 tegels straat
  const G = { gras: 0, weg: 1, plein: 2, water: 3 };
  const ENERGIE_S = 40;        // zo lang rij je op een volle batterij, dan komt er een vraag
  const WRONG_S = 12;          // na een fout antwoord toch een beetje energie
  const NITRO_MAX = 3;         // elke juiste energievraag geeft een nitro
  const NITRO_S = 2.2;
  const CAM_H = 55;            // hoe lager, hoe meer de gebouwen meeleunen: een dak op h meter schuift h/CAM_H van het midden weg
  const COLORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // Voertuigen. max = topsnelheid (m/s), acc = optrekken, turn = draaien, grip = hoe snel een slip ophoudt (laag = driften).
  const VOERTUIGEN = [
    { id: 'kart', naam: 'Hoverkart', icoon: '🏎️', beeld: 'v-kart', lang: 3.4, max: 15, acc: 13, turn: 2.7, grip: 6.5, nodig: 0 },
    { id: 'bike', naam: 'Zweefmotor', icoon: '🏍️', beeld: 'v-bike', lang: 3.4, max: 17, acc: 16, turn: 3.1, grip: 4.2, nodig: 6 },
    { id: 'raket', naam: 'Raketkar', icoon: '🚀', beeld: 'v-raket', lang: 4, max: 20, acc: 12, turn: 2.4, grip: 5.5, nodig: 15 },
    { id: 'griffioen', naam: 'Griffioen', icoon: '🦅', beeld: 'v-griffioen', lang: 4.6, max: 14, acc: 10, turn: 2.6, grip: 5, nodig: 30, vliegt: true },
  ];

  // Wat je verdient (kristallen)
  const BELONING = { vraag: 1, koerier: 4, snel: 2, race: 5, dief: 6, gnoom: 2, blus: 1, geblust: 3, regen: 1, stunt: 1 };
  // Samen de stad laten oplichten: bij deze totalen gaat een nieuw stuk van de stad aan.
  const LICHT = [20, 50, 100, 170, 260, 380, 520, 700, 900, 1200];

  // Wijken per blok (5 x 5): h haven, b bos, g berg, w woonwijk, c burcht, m markt, n neonwijk
  const PLAN = ['hbbgg', 'hwwgn', 'hwcwn', 'hmmnn', 'hmwnb'];
  const WIJK = { h: 'de haven', b: 'het bos', g: 'de berg', w: 'de woonwijk', c: 'het burchtplein', m: 'de markt', n: 'de neonwijk' };
  const DAKEN = ['dak1', 'dak2', 'dak3', 'dak4', 'dak5', 'dak6'];
  const NEONDAK = ['neon1', 'neon2', 'neon3', 'neon4', 'neon5', 'neon6'];

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
  // Het midden van een straat (in meters): straten liggen op tegel 11-12, 24-25, ...
  const kruis = i => (i * BLOK + 12) * TILE;

  // De stad bouwen. massief: 0 vrij, 1 gebouw of muur, 2 boom of rots (rond). gebouwen: alles wat rechtop staat (met hoogte).
  // platte: wat op de grond ligt (kisten, kramen, fonteinen, lantaarns, bootjes), mee in de grond gebakken.
  function bouw() {
    const R = rng(2026);
    const grond = new Uint8Array(N * N);
    const massief = new Uint8Array(N * N);
    const gebouwen = [];
    const platte = [];
    const markers = [];
    const kust = ty => 4 + Math.round(Math.sin(ty * .35) * 1.2 + Math.sin(ty * .11) * .8);
    const wijkVan = (tx, ty) => PLAN[Math.min(4, Math.floor(ty / BLOK))][Math.min(4, Math.floor(tx / BLOK))];
    for (let ty = 0; ty < N; ty++) {
      for (let tx = 0; tx < N; tx++) {
        const wijk = wijkVan(tx, ty);
        let g = G.gras;
        if (isWeg(tx) || isWeg(ty)) g = G.weg;
        else if (wijk === 'm' || wijk === 'n' || wijk === 'c') g = G.plein;
        if (wijk === 'h' && tx < 11) {
          if (tx < kust(ty)) g = isWeg(ty) && tx >= 1 ? G.plein : G.water; // steigers in het water
          else g = G.plein;
        }
        grond[ty * N + tx] = g;
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
    const vul = (tx, ty, w, d, v) => { for (let y = ty; y < ty + d; y++) for (let x = tx; x < tx + w; x++) massief[y * N + x] = v; };
    // Een gebouw met zijn grondvlak linksboven op tegel (tx, ty), w x d tegels, h meter hoog.
    const huis = (tx, ty, w, d, h, dak, muur, soort) => {
      if (!vrij(tx, ty, w, d)) return null;
      vul(tx, ty, w, d, 1);
      const o = { x0: tx * TILE, y0: ty * TILE, x1: (tx + w) * TILE, y1: (ty + d) * TILE, h, dak, muur, soort };
      o.x = (o.x0 + o.x1) / 2; o.y = (o.y0 + o.y1) / 2;
      gebouwen.push(o);
      return o;
    };
    // Een boom of rots: één tegel, rond.
    const rond = (tx, ty, beeld, h, r) => {
      if (!vrij(tx, ty, 1, 1)) return null;
      vul(tx, ty, 1, 1, 2);
      const o = { x: (tx + .5) * TILE, y: (ty + .5) * TILE, r, h, dak: beeld, soort: 'rond' };
      gebouwen.push(o);
      return o;
    };
    // Iets platters dat in de weg staat (kraam, kisten, fontein) of los op de grond ligt (lantaarn).
    const plat = (tx, ty, w, d, beeld, solid) => {
      if (solid && !vrij(tx, ty, w, d)) return null;
      if (solid) vul(tx, ty, w, d, 1);
      const k = beeld === 'lantaarn' ? .35 : 1;
      const o = { x: (tx + w / 2) * TILE, y: (ty + d / 2) * TILE, w: w * TILE * k, d: d * TILE * k, beeld };
      platte.push(o);
      return o;
    };
    const kies = list => list[Math.floor(R() * list.length)];
    const soorten = ['dief', 'race', 'koerier'];
    const W_NEON = NEONDAK;
    let neonNr = 0;
    for (let by = 0; by < 5; by++) {
      for (let bx = 0; bx < 5; bx++) {
        const wijk = PLAN[by][bx];
        const x0 = bx * BLOK, y0 = by * BLOK; // blok: tegels x0..x0+10
        // Een missieplek aan de straat onder het blok (niet bij elk blok).
        if ((bx + by) % 2 === 0) markers.push({ x: (x0 + 5.5) * TILE, y: (y0 + 11.6) * TILE, soort: soorten[markers.length % 3], wijk });
        if (wijk === 'c') {
          huis(x0 + 2, y0 + 1, 7, 7, 11, 'burcht', 'muur-steen', 'burcht');
          for (const x of [x0, x0 + 9]) { plat(x, y0 + 8, 2, 2, 'fontein', true); plat(x + 1, y0, 1, 1, 'lantaarn', false); }
          for (const x of [x0 + 3, x0 + 7]) plat(x, y0 + 9, 1, 1, 'lantaarn', false);
          continue;
        }
        if (wijk === 'w') {
          // Huizen van 3 x 3 tegels met smalle steegjes ertussen: een kortere weg voor wie durft.
          for (const [dx, dy] of [[0, 0], [4, 0], [8, 0], [0, 4], [8, 4], [0, 8], [4, 8], [8, 8]]) {
            if (R() < .88) huis(x0 + dx, y0 + dy, 3, 3, 6 + Math.round(R() * 4), kies(DAKEN), 'muur-hout', 'huis');
            else rond(x0 + dx + 1, y0 + dy + 1, 'boom', 7, 2.2);
          }
          plat(x0 + 4, y0 + 4, 2, 2, 'fontein', true);
          if (R() < .7) rond(x0 + 6, y0 + 6, 'boom', 7, 2.2);
        } else if (wijk === 'n') {
          // Hoge neontorens van 3 x 3 tegels met steegjes ertussen, en een pleintje in het midden
          for (const [dx, dy] of [[0, 0], [4, 0], [8, 0], [0, 4], [8, 4], [0, 8], [4, 8], [8, 8]]) {
            if (R() < .85) huis(x0 + dx, y0 + dy, 3, 3, 12 + Math.round(R() * 9), W_NEON[neonNr++ % W_NEON.length], 'muur-neon', 'neon');
          }
          plat(x0 + 5, y0 + 5, 1, 1, 'lantaarn', false);
          plat(x0 + 4, y0 + 4, 1, 1, 'lantaarn', false);
        } else if (wijk === 'm') {
          for (const [dx, dy] of [[1, 1], [4, 1], [7, 1], [1, 7], [4, 7], [7, 7], [1, 4], [8, 4]]) plat(x0 + dx, y0 + dy, 2, 2, 'kraam', true);
          plat(x0 + 4, y0 + 4, 2, 2, 'fontein', true);
          for (let i = 0; i < 3; i++) { const tx = x0 + 2 + Math.floor(R() * 7), ty = y0 + 2 + Math.floor(R() * 7); plat(tx, ty, 1, 1, 'kisten', true); }
          for (const [dx, dy] of [[0, 0], [10, 0], [0, 10], [10, 10]]) plat(x0 + dx, y0 + dy, 1, 1, 'lantaarn', false);
        } else if (wijk === 'b' || wijk === 'g') {
          if (wijk === 'b') huis(x0 + 4, y0 + 4, 3, 3, 16, 'neon1', 'muur-steen', 'toren');
          else if (bx === 4 && by === 0) huis(x0 + 4, y0 + 3, 4, 4, 12, 'neon2', 'muur-neon', 'toren');
          else huis(x0 + 5, y0 + 4, 3, 3, 9, 'dak4', 'muur-steen', 'huis');
          const n = wijk === 'b' ? 26 : 12;
          for (let i = 0; i < n; i++) {
            const tx = x0 + Math.floor(R() * 11), ty = y0 + Math.floor(R() * 11);
            if (wijk === 'b' && R() < .55) rond(tx, ty, 'boom', 7, 2.2); else rond(tx, ty, 'den', 8, 1.8);
          }
          if (wijk === 'g') for (let i = 0; i < 7; i++) rond(x0 + Math.floor(R() * 10), y0 + Math.floor(R() * 10), 'rots', 2.5, 1.8);
        } else if (wijk === 'h') {
          // De kade: kisten en een vuurtoren, bootjes in het water.
          const k0 = kust(y0 + 5);
          if (by === 2) huis(Math.max(k0, 6), y0 + 1, 2, 2, 15, 'neon1', 'muur-steen', 'toren');
          else plat(Math.max(k0, 6), y0 + 1, 2, 2, 'kisten', true);
          plat(8, y0 + 4, 2, 2, 'kisten', true);
          if (R() < .6) huis(7, y0 + 7, 3, 3, 7, kies(DAKEN), 'muur-hout', 'huis');
          plat(10, y0, 1, 1, 'lantaarn', false);
          platte.push({ x: 1.6 * TILE + R() * 4, y: (y0 + 4 + R() * 4) * TILE, w: 3, d: 6, beeld: 'boot', deco: true });
        }
      }
    }
    gebouwen.forEach((o, i) => { o.i = i; });
    return { grond, massief, gebouwen, platte, markers };
  }

  const STAD = bouw();

  const tegel = (x, y) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return -1;
    return ty * N + tx;
  };
  const grondOp = (x, y) => { const i = tegel(x, y); return i < 0 ? -1 : STAD.grond[i]; };
  const R_AUTO = 1.25; // een voertuig is voor botsen een cirkel van zoveel meter

  // Duw een cirkel uit de gebouwen, bomen, het water en de rand. Geeft de nieuwe plek en de duwrichting (normaal).
  function pushOut(x, y, r, veh) {
    const v = VOERTUIGEN[veh || 0];
    let nx = 0, ny = 0, hit = false;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      if (x < r) { x = r; nx += 1; moved = true; }
      if (y < r) { y = r; ny += 1; moved = true; }
      if (x > L - r) { x = L - r; nx -= 1; moved = true; }
      if (y > L - r) { y = L - r; ny -= 1; moved = true; }
      if (!v.vliegt) {
        const tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE), ty0 = Math.floor((y - r) / TILE), ty1 = Math.floor((y + r) / TILE);
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
          if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
          const i = ty * N + tx, m = STAD.massief[i];
          if (m === 2) {
            // Boom of rots: een cirkel in het midden van de tegel
            const cx = (tx + .5) * TILE, cy = (ty + .5) * TILE, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), rr = 1.5 + r;
            if (d >= rr) continue;
            const ux = d > .01 ? dx / d : 1, uy = d > .01 ? dy / d : 0;
            x = cx + ux * rr; y = cy + uy * rr; nx += ux; ny += uy; moved = true;
            continue;
          }
          if (!m && STAD.grond[i] !== G.water) continue;
          const bx0 = tx * TILE, by0 = ty * TILE;
          const cx = Math.max(bx0, Math.min(x, bx0 + TILE)), cy = Math.max(by0, Math.min(y, by0 + TILE));
          const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          let ux, uy;
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            ux = dx / d; uy = dy / d;
            x = cx + ux * r; y = cy + uy * r;
          } else {
            const opts = [[x - bx0, -1, 0], [bx0 + TILE - x, 1, 0], [y - by0, 0, -1], [by0 + TILE - y, 0, 1]].sort((p, q) => p[0] - q[0]);
            [, ux, uy] = opts[0];
            x += ux * (opts[0][0] + r); y += uy * (opts[0][0] + r);
          }
          nx += ux; ny += uy; moved = true;
        }
      }
      if (!moved) break;
      hit = true;
    }
    const nl = Math.hypot(nx, ny) || 1;
    return { x, y, hit, nx: nx / nl, ny: ny / nl };
  }
  // Kan een voertuig hier staan?
  function kan(veh, x, y, r0 = R_AUTO * .8) {
    const r = pushOut(x, y, r0, veh);
    return !r.hit;
  }
  const wijkOp = (x, y) => {
    const bx = Math.max(0, Math.min(4, Math.floor(x / TILE / BLOK))), by = Math.max(0, Math.min(4, Math.floor(y / TILE / BLOK)));
    return PLAN[by][bx];
  };
  // Een willekeurige vrije plek, eventueel binnen één blok.
  function vrijePlek(R, blok) {
    for (let i = 0; i < 200; i++) {
      const x = blok ? (blok[0] * BLOK + .5 + R() * 10) * TILE : 6 + R() * (L - 12);
      const y = blok ? (blok[1] * BLOK + .5 + R() * 10) * TILE : 6 + R() * (L - 12);
      if (kan(0, x, y)) return { x, y };
    }
    return { x: kruis(2), y: kruis(2) };
  }
  // Starten op de straat onder de burcht, neus naar rechts.
  const startPlek = R => ({ x: (2 * BLOK + 1 + R() * 9) * TILE, y: kruis(2) + (R() - .5) * 5, a: R() < .5 ? 0 : Math.PI });

  // Een raceparcours: van de missieplek langs straten naar kruispunten, met ringen onderweg.
  function parcours(R, m) {
    let i = Math.max(0, Math.min(4, Math.round((m.x / TILE - 12) / BLOK))), j = Math.max(0, Math.min(4, Math.round((m.y / TILE - 12) / BLOK)));
    const ringen = [];
    let px = m.x, py = m.y;
    let laatst = null;
    for (let s = 0; s < 4; s++) {
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
  // Verkeer volgt een vaste dienstregeling: iedereen (server, leerlingen, bord) rekent het uit de speeltijd.
  const LUS = L + 40;
  const pmod = (a, m) => ((a % m) + m) % m;
  // [beeld, lengte (m), breedte (m), snelheid (m/s)]
  const AUTOS = [['a-koets', 5.6, 2.8, 7], ['a-tram', 9, 2.6, 5.5], ['a-vracht', 6, 3, 6], ['a-taxi', 3.8, 3, 8.5], ['a-pod', 3.2, 3.2, 7.5]];
  const VERKEER = [];
  {
    const R = rng(77);
    for (let i = 0; i < 5; i++) for (const as of ['h', 'v']) for (const r of [1, -1]) {
      const n = 1 + (R() < .5 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const a = Math.floor(R() * AUTOS.length);
        VERKEER.push({ as, i, r, a, fase: (k / n) * LUS + R() * 60, v: AUTOS[a][3] * (.9 + R() * .2) });
      }
    }
  }
  // Waar rijdt auto c op tijd tt? Rechts rijden.
  function autoOp(c, tt) {
    const s = pmod(c.fase + c.v * tt, LUS) - 20;
    const pos = c.r > 0 ? s : L - s;
    const baan = kruis(c.i) + (c.as === 'h' ? 1.9 * c.r : -1.9 * c.r);
    return c.as === 'h' ? { x: pos, y: baan, a: c.r > 0 ? 0 : Math.PI } : { x: baan, y: pos, a: c.r > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  // Schansen op de straten van links naar rechts (twee per stuk straat: één per rijrichting), turboplaten op de straten van boven naar onder.
  // Ze liggen op de stukken straat zonder missieplek.
  const SCHANSEN = [], TURBO = [];
  for (let by = 0; by < 5; by++) for (let bx = 1; bx < 5; bx++) {
    if ((bx + by) % 2 === 0) continue;
    const x = (bx * BLOK + 5.5) * TILE;
    SCHANSEN.push({ x: x - 4, y: kruis(by) + 1.9, r: 1 }, { x: x + 4, y: kruis(by) - 1.9, r: -1 });
  }
  for (let bx = 0; bx < 5; bx++) for (let by = 1; by < 5; by++) if ((bx + by) % 2 === 0) TURBO.push({ x: kruis(bx), y: (by * BLOK + 5.5) * TILE });
  const TURBO_S = 2;
  // Dag en nacht: een dag duurt 4 minuten, het spel begint op klaarlichte dag. 0 = dag, 1 = diepe nacht.
  const DAG_S = 240;
  const nacht = tt => Math.max(0, Math.min(1, (1 - Math.cos(tt / DAG_S * Math.PI * 2)) / 2 * 1.7 - .5));

  // ---------- Rijden ----------
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const GRAV = 26;
  // Eén stap rijden. s = { x, y, a, vx, vy, z, vz, boost, veh }, inp = { gas -1..1, turn -1..1, drift }.
  // extra: { leeg (batterij op), tt (voor het verkeer) }. Geeft terug wat er gebeurde.
  function drive(s, inp, dt, extra = {}) {
    const out = { bump: 0, jump: false, land: false, turbo: false, toet: false, slip: 0 };
    const V = VOERTUIGEN[s.veh || 0];
    const air = s.z > .05;
    const gas = Math.max(-1, Math.min(1, inp.gas || 0));
    const turn = Math.max(-1, Math.min(1, inp.turn || 0));
    let max = V.max * (extra.leeg ? .45 : 1);
    if (!V.vliegt && grondOp(s.x, s.y) === G.gras) max *= .82;
    if (s.boost > 0) { s.boost -= dt; max *= 1.45; }
    let fx = Math.cos(s.a), fy = Math.sin(s.a);
    let vf = s.vx * fx + s.vy * fy;
    // Draaien: hoe sneller, hoe beter je kan draaien (stilstaan draait niet), achteruit draait andersom.
    const draai = Math.min(1, Math.abs(vf) / 5) * (vf < -.5 ? -1 : 1);
    s.a = wrap(s.a + turn * V.turn * draai * (inp.drift ? 1.3 : 1) * (air ? .4 : 1) * dt);
    fx = Math.cos(s.a); fy = Math.sin(s.a);
    vf = s.vx * fx + s.vy * fy;
    let vl = -s.vx * fy + s.vy * fx;
    if (!air) {
      if (s.boost > 0) vf = Math.max(vf, max * .95);
      if (gas > 0) {
        if (vf < 0) vf = Math.min(0, vf + 28 * dt);
        else if (vf < max * gas) vf = Math.min(max * gas, vf + V.acc * dt);
        else vf = Math.max(max * gas, vf - 6 * dt);
      } else if (gas < 0) {
        vf = vf > 0 ? Math.max(0, vf - 26 * dt) : Math.max(-6, vf - V.acc * .6 * dt);
      } else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 7 * dt);
      if (vf > max) vf = Math.max(max, vf - 20 * dt);
      // Grip: zijwaarts glijden houdt op. Met de driftknop of heel scherp draaien glij je langer.
      const grip = inp.drift ? V.grip * .25 : V.grip;
      vl *= Math.exp(-grip * dt);
    }
    out.slip = Math.abs(vl);
    s.vx = vf * fx - vl * fy;
    s.vy = vf * fy + vl * fx;
    const res = pushOut(s.x + s.vx * dt, s.y + s.vy * dt, R_AUTO, s.veh);
    s.x = res.x; s.y = res.y;
    if (res.hit) {
      const vn = s.vx * res.nx + s.vy * res.ny;
      if (vn < 0) {
        out.bump = -vn;
        s.vx -= 1.25 * vn * res.nx; s.vy -= 1.25 * vn * res.ny;
        s.vx *= .82; s.vy *= .82;
      }
    }
    // Verkeer: een auto duwt je opzij
    if (!V.vliegt && extra.tt !== undefined) {
      for (const c of VERKEER) {
        const a = autoOp(c, extra.tt), A = AUTOS[c.a];
        const h = c.as === 'h';
        const dl = h ? s.x - a.x : s.y - a.y, dw = h ? s.y - a.y : s.x - a.x;
        const hl = A[1] / 2 + R_AUTO * .8, hw = A[2] / 2 + R_AUTO * .8;
        if (Math.abs(dl) > hl || Math.abs(dw) > hw) continue;
        // Naar de dichtste kant eruit
        const pl = hl - Math.abs(dl), pw = hw - Math.abs(dw);
        let nx, ny;
        if (pw < pl) { nx = h ? 0 : Math.sign(dw) || 1; ny = h ? Math.sign(dw) || 1 : 0; }
        else { nx = h ? Math.sign(dl) || 1 : 0; ny = h ? 0 : Math.sign(dl) || 1; }
        const p = Math.min(pl, pw);
        const t = pushOut(s.x + nx * p, s.y + ny * p, R_AUTO, s.veh);
        s.x = t.x; s.y = t.y;
        const vn = s.vx * nx + s.vy * ny;
        if (vn < 3) { s.vx += (3 - vn) * nx * 1.3; s.vy += (3 - vn) * ny * 1.3; }
        out.toet = true;
      }
    }
    // Schansen en turbo
    if (!V.vliegt) {
      if (!air) {
        const v = Math.hypot(s.vx, s.vy);
        for (const sc of SCHANSEN) {
          if (Math.abs(s.x - sc.x) < 1.6 && Math.abs(s.y - sc.y) < 1.9 && s.vx * sc.r > 8) {
            s.vz = 7 + v * .25; s.z = .1; out.jump = true;
          }
        }
        for (const tp of TURBO) if (Math.abs(s.x - tp.x) < 3 && Math.abs(s.y - tp.y) < 3) { if (!(s.boost > .3)) out.turbo = true; s.boost = TURBO_S; }
      }
      if (s.z > 0 || s.vz > 0) {
        s.vz -= GRAV * dt;
        s.z += s.vz * dt;
        if (s.z <= 0) { out.land = s.vz < -6; s.z = 0; s.vz = 0; }
      }
    } else s.z = 3.5;
    return out;
  }
  // Absoluut sturen (gsm-duim of muis): draai naar die richting en geef gas. Achteruit als het doel recht achter je ligt en je bijna stilstaat.
  function stuurNaar(s, dx, dy, kracht) {
    if (kracht < .05) return { gas: 0, turn: 0 };
    const doel = Math.atan2(dy, dx), d = wrap(doel - s.a);
    const v = s.vx * Math.cos(s.a) + s.vy * Math.sin(s.a);
    const turn = Math.max(-1, Math.min(1, d * 2.2));
    const gas = Math.abs(d) > 2.6 && v < 2 ? -.6 : kracht * (Math.abs(d) > 1.6 ? .55 : 1);
    return { gas, turn: gas < 0 ? -turn : turn, drift: Math.abs(d) > 1.1 && v > 9 };
  }

  // ---------- De glitchdief ----------
  // Hij vlucht over de straten van kruispunt naar kruispunt, weg van wie hem achtervolgt.
  const DIEF_V = 12.5;
  function diefStap(d, jager, dt, R) {
    const tx = kruis(d.ti), ty = kruis(d.tj);
    const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
    const afstand = Math.hypot(jager.x - d.x, jager.y - d.y);
    // Ver weg? Dan wacht hij een beetje (zo blijft het spannend). Vlak bij je wordt hij moe, zodat je hem kan vangen.
    let v = DIEF_V * (afstand > 30 ? .45 : afstand > 18 ? .7 : afstand > 9 ? .9 : .7) * (dist < 6 ? .7 : 1);
    if (dist < v * dt + .2) {
      d.x = tx; d.y = ty;
      const opties = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => d.ti + a >= 0 && d.ti + a <= 4 && d.tj + b >= 0 && d.tj + b <= 4 && !(a === -d.ri && b === -d.rj));
      let best = opties[0], bs = -1e9;
      for (const o of opties) {
        const nx = kruis(d.ti + o[0]), ny = kruis(d.tj + o[1]);
        const sc = Math.hypot(nx - jager.x, ny - jager.y) + R() * 30;
        if (sc > bs) { bs = sc; best = o; }
      }
      d.ri = best[0]; d.rj = best[1];
      d.ti += best[0]; d.tj += best[1];
      return;
    }
    d.x += dx / dist * v * dt;
    d.y += dy / dist * v * dt;
    d.a = Math.atan2(dy, dx);
  }

  return {
    TILE, N, L, BLOK, G, ENERGIE_S, WRONG_S, NITRO_MAX, NITRO_S, CAM_H, COLORS, VOERTUIGEN, BELONING, LICHT, PLAN, WIJK, DAKEN, NEONDAK,
    STAD, R_AUTO, rng, isWeg, kruis, tegel, grondOp, pushOut, kan, wijkOp, vrijePlek, startPlek, parcours,
    AUTOS, VERKEER, autoOp, SCHANSEN, TURBO, TURBO_S, DAG_S, nacht, wrap, drive, stuurNaar, DIEF_V, diefStap,
  };
});
