// Schrift voor het Schrijfdraakje: elke letter als halen (lijnen in schrijfvolgorde) om met de vinger over te trekken.
// Drie stijlen, de leerkracht kiest: 'lopend1' en 'lopend2' (lopend schrift zoals op de letterkaarten van de klas) en 'druk' (drukletters).
// Coördinaten: basislijn y=70, middenlijn y=45 (x-hoogte 25), stokken tot y=17, staarten tot y=95. Een punt [x, y, 1] is een hoek.
// Lopend schrift (jr-schrift-lopend.js) is rechtop opgeslagen en wordt schuin gezet; letters in een woord worden aan elkaar geschreven.
(function () {
  const H = 1; // hoekpunt
  const STIP = x => [[x, 35], [x + 0.4, 34.6]];
  // Lopende letters uit jr-schrift-lopend.js: "x,y x,y* ..." wordt [[x, y], [x, y, H], ...].
  const LOPEND = {};
  const bron = (window.JrSchriftLopend || {}).letters || {};
  for (const c in bron) {
    const g = bron[c];
    LOPEND[c] = {
      s: g.s.map(h => h.split(' ').map(p => { const [x, y] = p.replace('*', '').split(',').map(Number); return p.endsWith('*') ? [x, y, H] : [x, y]; })),
      ovaal: !!g.ovaal, los: !!g.los, lus: c === 'e', // e: de aanloop vormt zelf het lusje
    };
  }
  // Cijfers voor drukletters.
  const CIJFERS = {
    0: { s: [[[9, 20.5], [3.5, 27], [1, 45], [2, 62], [6, 70], [10, 68.5], [13, 58], [14, 40], [13, 26], [9, 20.5]]] },
    1: { s: [[[3, 32], [8, 26], [12, 20, H], [12, 70]]] },
    2: { s: [[[2, 30], [5, 22], [9, 20.5], [13, 23], [14, 31], [11, 43], [5, 56], [1, 66], [2, 70], [5, 66], [10, 67.5], [15, 70]]] },
    3: { s: [[[2, 26], [6, 21], [10, 20.5], [13, 24], [12, 32], [8, 40], [6, 43], [11, 44], [14, 50], [14, 61], [10, 69], [5, 70], [1, 66]]] },
    4: { s: [[[9, 20, H], [1, 52, H], [15, 52]], [[12, 36], [12, 70]]] },
    5: { s: [[[4, 21], [3, 42, H], [8, 40], [12, 42], [14, 50], [14, 61], [10, 69], [5, 70], [1, 66]], [[4, 21], [14, 20.5]]] },
    6: { s: [[[12, 22], [8, 20.5], [3, 30], [1, 48], [2, 63], [6, 70], [11, 68], [14, 59], [12, 48], [7, 46], [3, 52]]] },
    7: { s: [[[1, 22], [14, 20.5, H], [5, 70]], [[5, 46], [13, 46]]] },
    8: { s: [[[12, 25], [8, 20.5], [3.5, 23.5], [3, 31], [7, 41], [12, 50], [13.5, 61], [10, 69], [5, 70], [1.5, 64], [3, 54], [8, 45], [12, 36], [13, 27], [10, 21]]] },
    9: { s: [[[13, 27], [10, 21], [5, 21], [1.5, 28], [2, 37], [6, 42], [11, 40], [13.5, 32], [14, 22, H], [13, 45], [11, 70]]] },
  };
  // Drukletters: rechtop, elke lijn apart.
  const RONDJE = [[18, 49], [14, 45.3], [9, 45.3], [4, 49], [2, 57.5], [4, 66], [9, 70], [14, 69.5], [18, 65]];
  const BUIK = [[3, 52], [7, 46.5], [12, 45.3], [17, 48.5], [19, 57.5], [17, 66], [12, 70], [7, 68.5], [3, 63]];
  const BOOG = [[3, 54], [7, 47], [12, 45.3], [16, 47.5], [18, 53], [18, 70]];
  const DRUK = {
    a: { s: [RONDJE, [[19, 45], [19, 70]]] },
    b: { s: [[[3, 20], [3, 70]], BUIK] },
    c: { s: [[[18, 49], [14, 45.3], [9, 45.3], [4, 49], [2, 57.5], [4, 66], [9, 70], [14, 69.5], [18, 66]]] },
    d: { s: [RONDJE, [[19, 20], [19, 70]]] },
    e: { s: [[[2, 57.5], [19, 57.5, H], [17, 49], [12, 45.3], [7, 45.6], [3, 50], [2, 58], [4, 66], [9, 70], [14, 69.5], [18, 66]]] },
    f: { s: [[[16, 23], [13, 20.5], [9, 21], [7, 26], [7, 70]], [[2, 45], [14, 45]]] },
    g: { s: [RONDJE, [[19, 45], [19, 86], [16, 93], [10, 94], [5, 91]]] },
    h: { s: [[[3, 20], [3, 70]], BOOG] },
    i: { s: [[[4, 45], [4, 70]], STIP(4)] },
    j: { s: [[[8, 45], [8, 87], [6, 93], [2, 93.5], [-1, 91]], STIP(8)] },
    k: { s: [[[3, 20], [3, 70]], [[16, 45, H], [3, 60, H], [17, 70]]] },
    l: { s: [[[4, 20], [4, 70]]] },
    m: { s: [[[3, 45], [3, 70]], [[3, 52], [6, 46.5], [10, 45.3], [13, 48], [14, 54], [14, 70]], [[14, 54], [16, 47.5], [20, 45.3], [24, 47], [25, 53], [25, 70]]] },
    n: { s: [[[3, 45], [3, 70]], BOOG] },
    o: { s: [[[11, 45.3], [5, 47.5], [2, 57.5], [5, 67.5], [11, 70], [17, 67.5], [20, 57.5], [17, 47.5], [11, 45.3]]] },
    p: { s: [[[3, 45], [3, 93]], BUIK] },
    q: { s: [RONDJE, [[19, 45], [19, 93]]] },
    r: { s: [[[3, 45], [3, 70]], [[3, 55], [6, 48], [10, 45.3], [14, 46.5]]] },
    s: { s: [[[17, 48.5], [13, 45.3], [7, 45.3], [3, 48.5], [4, 54], [10, 57.5], [16, 61], [17, 66.5], [13, 70], [7, 70], [2, 67]]] },
    t: { s: [[[7, 25], [7, 64], [9, 69.5], [13, 70], [15, 68]], [[2, 45], [14, 45]]] },
    u: { s: [[[3, 45], [3, 62], [6, 68.5], [11, 70], [16, 67.5], [18, 61]], [[18, 45], [18, 70]]] },
    v: { s: [[[2, 45, H], [10, 70, H], [18, 45]]] },
    w: { s: [[[1, 45, H], [7, 70, H], [13, 45, H], [19, 70, H], [25, 45]]] },
    x: { s: [[[2, 45], [17, 70]], [[17, 45], [2, 70]]] },
    y: { s: [[[2, 45], [10, 70]], [[18, 45], [5, 93]]] },
    z: { s: [[[2, 45, H], [17, 45, H], [2, 70, H], [17, 70]]] },
    A: { s: [[[11, 20, H], [1, 70]], [[11, 20], [21, 70]], [[5, 52], [17, 52]]] },
    B: { s: [[[3, 20], [3, 70]], [[3, 20], [12, 20], [17, 24], [17, 32], [12, 44.5], [3, 44.5]], [[12, 44.5], [18, 50], [18, 63], [13, 70], [3, 70]]] },
    C: { s: [[[21, 27], [16, 21], [11, 20], [5, 24], [2, 32], [1, 45], [2, 58], [5, 66], [11, 70], [16, 69], [21, 63]]] },
    D: { s: [[[3, 20], [3, 70]], [[3, 20], [10, 20], [17, 25], [20, 35], [20, 55], [17, 65], [10, 70], [3, 70]]] },
    E: { s: [[[18, 20, H], [3, 20, H], [3, 70, H], [18, 70]], [[3, 45], [15, 45]]] },
    F: { s: [[[18, 20, H], [3, 20, H], [3, 70]], [[3, 45], [15, 45]]] },
    G: { s: [[[21, 27], [16, 21], [11, 20], [5, 24], [2, 32], [1, 45], [2, 58], [5, 66], [11, 70], [16, 69], [21, 63], [21, 47, H], [13, 47]]] },
    H: { s: [[[3, 20], [3, 70]], [[19, 20], [19, 70]], [[3, 45], [19, 45]]] },
    I: { s: [[[6, 20], [6, 70]]] },
    J: { s: [[[15, 20], [15, 60], [13, 67], [8, 70], [4, 68], [2, 63]]] },
    K: { s: [[[3, 20], [3, 70]], [[19, 20, H], [3, 47, H], [19, 70]]] },
    L: { s: [[[3, 20, H], [3, 70, H], [17, 70]]] },
    M: { s: [[[3, 70, H], [3, 20, H], [13, 52, H], [23, 20, H], [23, 70]]] },
    N: { s: [[[3, 70, H], [3, 20, H], [19, 70, H], [19, 20]]] },
    O: { s: [[[12, 20], [5, 24], [1.5, 35], [1.5, 55], [5, 66], [12, 70], [19, 66], [22.5, 55], [22.5, 35], [19, 24], [12, 20]]] },
    P: { s: [[[3, 20], [3, 70]], [[3, 20], [12, 20], [17, 24], [18, 32], [17, 40], [12, 45], [3, 45]]] },
    Q: { s: [[[12, 20], [5, 24], [1.5, 35], [1.5, 55], [5, 66], [12, 70], [19, 66], [22.5, 55], [22.5, 35], [19, 24], [12, 20]], [[14, 57], [22, 71]]] },
    R: { s: [[[3, 20], [3, 70]], [[3, 20], [12, 20], [17, 24], [18, 32], [17, 40], [12, 45], [3, 45]], [[11, 45], [19, 70]]] },
    S: { s: [[[19, 25], [14, 20.5], [8, 20.5], [3, 25], [3, 32], [8, 40], [14, 46], [19, 53], [19, 63], [14, 69.5], [8, 69.5], [2, 64]]] },
    T: { s: [[[1, 20], [21, 20]], [[11, 20], [11, 70]]] },
    U: { s: [[[3, 20], [3, 55], [5, 65], [11, 70], [17, 65], [19, 55], [19, 20]]] },
    V: { s: [[[1, 20, H], [11, 70, H], [21, 20]]] },
    W: { s: [[[1, 20, H], [7, 70, H], [14, 30, H], [21, 70, H], [27, 20]]] },
    X: { s: [[[2, 20], [20, 70]], [[20, 20], [2, 70]]] },
    Y: { s: [[[1, 20, H], [11, 45]], [[21, 20], [11, 45], [11, 70]]] },
    Z: { s: [[[2, 20, H], [19, 20, H], [2, 70, H], [19, 70]]] },
  };
  const DRUK_CIJFERS = {
    2: { s: [[[2, 30], [5, 22], [9, 20.5], [13, 23], [14, 31], [11, 43], [1, 70, H], [15, 70]]] },
  };
  // Hoe schuin het lopend schrift staat: kaart 1 schuiner, kaart 2 bijna recht. Oude namen blijven werken.
  const STIJLEN = { lopend1: 0.3, lopend2: 0.15, druk: 0 };
  const OUD = { schuin: 'lopend1', recht: 'lopend2' };
  const stijlVan = s => (STIJLEN.hasOwnProperty(s) ? s : OUD[s] || 'lopend1');
  const glyph = (c, stijl) => {
    if (stijlVan(stijl) === 'druk') return /\d/.test(c) ? DRUK_CIJFERS[c] || CIJFERS[c] : DRUK[c];
    return LOPEND[c];
  };
  const kan = (c, stijl = 'lopend1') => !!glyph(c, stijl);
  // Een stip of streepje (i, j, t, E): een korte, platte haal na de eerste. Die telt niet mee voor de verbinding.
  const extra = h => { const ys = h.map(p => p[1]), xs = h.map(p => p[0]); return Math.max(...ys) - Math.min(...ys) < 6 && Math.max(...xs) - Math.min(...xs) < 18; };
  const hoofdHaal = s => { for (let i = s.length - 1; i > 0; i--) if (!extra(s[i])) return s[i]; return s[0]; };

  // Vloeiende lijn door de punten (centripetale Catmull-Rom), hoeken blijven scherp. voor: denkbeeldig punt vóór het begin (voor een vloeiende aansluiting).
  function pad(pts, voor) {
    const r = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4, 0.5);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    let start = 0;
    for (let i = 1; i < pts.length; i++) {
      if (i === pts.length - 1 || pts[i][2] === H) {
        d += stuk(pts.slice(start, i + 1), start === 0 ? voor : null);
        start = i;
      }
    }
    return d;
    function stuk(p, v) {
      if (p.length === 2) return ` L${f(p[1][0])} ${f(p[1][1])}`;
      let s = '';
      for (let i = 0; i < p.length - 1; i++) {
        const p1 = p[i], p2 = p[i + 1];
        const p0 = i > 0 ? p[i - 1] : v || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
        const p3 = i < p.length - 2 ? p[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
        const t0 = 0, t1 = t0 + r(p0, p1), t2 = t1 + r(p1, p2), t3 = t2 + r(p2, p3);
        const m1 = [0, 1].map(k => (t2 - t1) * ((p1[k] - p0[k]) / (t1 - t0) - (p2[k] - p0[k]) / (t2 - t0) + (p2[k] - p1[k]) / (t2 - t1)));
        const m2 = [0, 1].map(k => (t2 - t1) * ((p2[k] - p1[k]) / (t2 - t1) - (p3[k] - p1[k]) / (t3 - t1) + (p3[k] - p2[k]) / (t3 - t2)));
        s += ` C${f(p1[0] + m1[0] / 3)} ${f(p1[1] + m1[1] / 3)} ${f(p2[0] - m2[0] / 3)} ${f(p2[1] - m2[1] / 3)} ${f(p2[0])} ${f(p2[1])}`;
      }
      return s;
    }
  }
  const f = n => Math.round(n * 10) / 10;
  const argMin = (pts, k, tot = pts.length) => { let b = 0; for (let i = 1; i < tot; i++) if (pts[i][k] < pts[b][k]) b = i; return b; };

  // Hoe een lopende letter aan de vorige hangt. Geeft { s, aan, o }: de halen (eerste haal eventueel ingekort), de punten van de
  // verbindingslijn (in lettercoördinaten) en de verschuiving o. ex, ey: einde van de vorige letter.
  // sx: x zoals hij na het schuin zetten uitkomt (om afstanden tussen letters te meten).
  function aansluiting(g, ex, ey, rechts, sx) {
    const s = g.s.map(h => h.slice());
    const h0 = s[0];
    const hoog = ey < 57; // de vorige letter eindigt bovenaan (b, o, v, w): verbinding op middenhoogte
    if (g.ovaal) {
      // a, d, g, o, q, c beginnen rechtsboven en draaien tegen de klok in. De verbinding loopt langs de linkerkant (na een lage
      // uithaal) of over de bovenkant (na een hoge uithaal) omhoog tot het begin; daar draait de pen om.
      const iL = argMin(h0, 0, Math.ceil(h0.length * 0.6));
      const iT = argMin(h0, 1, iL + 1);
      const aan = h0.slice(1, (hoog ? Math.max(iT - 1, 1) : iL) + 1).reverse();
      h0[0] = [h0[0][0], h0[0][1], H];
      return { s, aan, o: Math.max(ex + 1 - h0[iL][0], rechts + 3 - Math.min(...h0.map(sx))) };
    }
    // Een aanloop die laag begint, valt weg na een hoge uithaal: de verbinding gaat dan rechtstreeks verder op middenhoogte.
    // Bij de e blijft het lusje: de verbinding zakt even en klimt dan door de lus.
    const tot = g.lus ? ey + 6 : ey - 1;
    if (hoog && h0[0][1] > tot) {
      let i = 0;
      while (i < h0.length - 2 && h0[i][1] > tot) i++;
      s[0] = h0.slice(i);
    }
    const eerste = s[0][0];
    const boven = eerste[1] < 52; // de letter begint bovenaan (i, u, t, j): scherpe punt bovenaan
    if (boven) s[0][0] = [eerste[0], eerste[1], H];
    const stijg = ey - eerste[1];
    const d = hoog ? (boven ? 4 : 3) : Math.max(1.5, stijg * 0.5 + (boven ? 2 : 0));
    let o = ex + d - eerste[0];
    // Niet over de vorige letter schuiven.
    const romp = s.flat().filter(p => p[1] > 42 && p[1] < 72);
    if (romp.length) o = Math.max(o, rechts + 3 - Math.min(...romp.map(sx)));
    return { s, aan: [], o };
  }

  // Een woord (of één letter) als halen. Geeft { w, paden } voor het spoorspel, of null als een teken ontbreekt.
  function woord(tekst, stijl = 'lopend1') {
    stijl = stijlVan(stijl);
    const k = STIJLEN[stijl], lopend = stijl !== 'druk', bx = lopend ? 1.2 : 1.35; // iets breder en ronder dan getekend
    const tekens = [...String(tekst)];
    if (!tekens.length || !tekens.every(c => c === ' ' || kan(c, stijl))) return null;
    const halen = []; // { pts, voor }
    const sx = p => p[0] + (70 - p[1]) * k / bx;
    let x = 0, vorig = null; // vorig: { eind, vorig, los } van de vorige letter in lopend schrift
    for (const c of tekens) {
      if (c === ' ') { x += 10; vorig = null; continue; }
      const g = glyph(c, stijl);
      const hoofd = /\p{Lu}/u.test(c) || /\d/.test(c);
      const sluit = lopend && vorig && !vorig.los && !hoofd;
      let s = g.s, aan = [], o;
      if (sluit) ({ s, aan, o } = aansluiting(g, vorig.eind[0], vorig.eind[1], vorig.rechts, sx));
      else o = (x ? x + (lopend ? 4 : 5) : 0) - Math.min(...s.flat().map(sx));
      const zet = p => [p[0] + o, p[1], p[2]];
      s.forEach((h, i) => {
        let pts = h.map(zet), voor = null;
        if (i === 0 && sluit) {
          voor = [2 * vorig.eind[0] - vorig.vorig[0], 2 * vorig.eind[1] - vorig.vorig[1]];
          pts = [[vorig.eind[0], vorig.eind[1]], ...aan.map(p => zet([p[0], p[1]])), ...pts];
        }
        halen.push({ pts, voor });
      });
      x = Math.max(...s.flat().map(sx)) + o;
      const hh = hoofdHaal(s).map(zet);
      const romp = s.flat().filter(p => p[1] > 42 && p[1] < 72).map(p => sx(p) + o);
      vorig = lopend && !/\d/.test(c) ? { eind: hh[hh.length - 1], vorig: hh[hh.length - 2], los: !!g.los, rechts: Math.max(...romp, sx(hh[hh.length - 1])) } : null;
      if (vorig) x = Math.max(x, sx(vorig.eind));
    }
    // Schuin zetten en links een marge van 10 laten.
    const schuin = p => [p[0] * bx + (70 - p[1]) * k, p[1], p[2]];
    halen.forEach(h => { h.pts = h.pts.map(schuin); if (h.voor) h.voor = schuin(h.voor); });
    const alle = halen.flatMap(h => h.pts.map(p => p[0]));
    const dx = 10 - Math.min(...alle);
    halen.forEach(h => { h.pts = h.pts.map(p => [p[0] + dx, p[1], p[2]]); if (h.voor) h.voor = [h.voor[0] + dx, h.voor[1]]; });
    return { w: Math.ceil(Math.max(...alle) + dx + 10), paden: halen.map(h => pad(h.pts, h.voor)) };
  }
  // Klein voorbeeld als SVG (voor de knoppen bij Instellingen).
  function voorbeeld(tekst, stijl) {
    const v = woord(tekst, stijl);
    return v ? `<svg class="jr-schrift-vb" viewBox="0 12 ${v.w} 86" aria-hidden="true"><line x1="0" x2="${v.w}" y1="45" y2="45"/><line x1="0" x2="${v.w}" y1="70" y2="70"/>${v.paden.map(d => `<path d="${d}"/>`).join('')}</svg>` : '';
  }
  window.JrSchrift = { woord, kan, voorbeeld, STIJLEN: Object.keys(STIJLEN), stijl: stijlVan };
})();
