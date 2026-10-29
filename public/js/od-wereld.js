// De kaarten van de ontdekwereld en hoe ze getekend worden: zwevende eilanden in 2.5D, in de stijl van Mijn burcht.
// De vloer, de rotswanden en alle vaste stukken (bomen, muren, plekken uit BuArt.stuk) worden één keer gebakken.
// Elk beeld tekent dat ene plaatje, de ridder, en enkel de stukken die vóór de ridder staan. Zo blijft het vlot op een Chromebook.
// Tekens: . gras  , bloemen  T boom  ~ leegte (de kloof)  = pad  b brug  R ruïnemuur  : ruïnevloer  k kristal  f fakkel
// H labo (2 op 2)  D deur van het labo  S start  W muur (binnen)  _ vloer (binnen)  x kast  v plant  q uitgang
// Plekken met een raadsel: u woordenwachter  s zwaardsteen  r robotwerkplaats  l lichtbaken  c runenportaal  o sterrenwacht
// p banier bij de brug  e stroomkring  g tandwielen  w wip
// Coördinaten: vakje (x, y) heeft zijn midden op ((x - y) * T/2, (x + y) * T/4), net als in Mijn burcht.
const OdWereld = (() => {
  const KAARTEN = {
    woud: {
      naam: 'Het Kristalwoud',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~TTTTTTTT.TTTTTTTTTTT~~~~TTTTTTTTTTT~~~',
        '~T.......,.,.T....,..T~~~T.....T..T.T~~',
        '~T..T...TT....TT......~~~~...........T~',
        '~T,Tk.,.,T=,...TT......~~~~.RRR:RRRR.T~',
        '~T.,T,,T..=...,...kT...~~~~.R::::::R.T~',
        '~T.....,..=T...........~~~~.R:f::k:R.T~',
        '~T..T.....=......,....~~~~..R::::::R.T~',
        '~T.T......=...s.......~~~~..R::l:::R.T~',
        '~T.....u..=..........~~~~...R:::::f:.T~',
        '~T..T.....=........T.~~~~.T.R::::::R.T~',
        '~T........=..T..T.....~~~~..R::::::R.T~',
        '~T.....T..=.........p.~~~~..:::::::R.T~',
        '~T.=======S===========bbbb===::::::R.T~',
        '~T........=...,.T.....~~~~..R::::::R.T~',
        '~T........=............~~~~.RRRcRRRR.T~',
        '~T.,......=...HH...T..~~~~..R::::::R.T~',
        '~T....r...=...HH......~~~~..R:::::::.T~',
        '~T.T......=....D.....~~~~...R:::o::R.T~',
        '~T........=======....~~~~...R:k:::fR.T~',
        '~T,TTT....=.........T~~~~...R::::::R.T~',
        '~T.T...T,.=T........~~~~....RRRR:RRR.T~',
        '~T.........T..T..,..~~~~.............T~',
        '~TTTTTTTT,....T..T.T~~~~.TTTTTTTTTTTTT~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: x => x >= 25,
    },
    labo: {
      naam: 'Het Labo',
      rijen: [
        'WWWWWWWWWW',
        'W____x_x_v',
        'W_e______v',
        'W____g___x',
        'W________v',
        'Wv_____w__',
        'Wv________',
        'W______q__',
      ],
      ruine: () => false,
    },
  };
  const STATION = { u: 'uil', s: 'schuif', r: 'robot', l: 'licht', c: 'code', o: 'steen', e: 'stroom', g: 'tandwiel', w: 'wip' };
  // Welk plaatje uit Mijn burcht bij welke plek hoort.
  const STUK = { uil: 'holoridder', schuif: 'zwaardsteen', robot: 'mechridder', licht: 'baken', code: 'portaal', steen: 'radar', bord: 'banier' };
  const BLOKKEERT = new Set('T~RHWxvkf'.split('').concat(Object.keys(STATION), ['p']));

  const hash = (x, y, k = 0) => BuArt.hash(x, y, k);

  function kaart(id) {
    const k = KAARTEN[id];
    const w = Math.max(...k.rijen.map(r => r.length));
    return { id, ...k, w, h: k.rijen.length };
  }

  const teken = (k, x, y) => (x < 0 || y < 0 || y >= k.h ? '~' : k.rijen[y][x] || '~');

  function loopbaar(k, x, y, gebouwd = []) {
    const c = teken(k, x, y);
    if (c === 'b') return gebouwd.includes('brug');
    return !BLOKKEERT.has(c);
  }

  // Waar staan de plekken met een raadsel (en de banier van de brug)?
  function plekken(k) {
    const out = [];
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
      const c = teken(k, x, y);
      if (STATION[c]) out.push({ id: STATION[c], x, y });
      if (c === 'p') out.push({ id: 'bord', x, y });
    }
    return out;
  }

  function vind(k, c) {
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (teken(k, x, y) === c) return { x, y };
    return null;
  }

  // ---------- Bakken ----------

  // Hoeveel plaats de kaart inneemt (in pixels bij tegelbreedte T) en waar vakje (0, 0) komt.
  function maat(k, T) {
    const boven = T * 2.4; // ruimte voor hoge stukken bovenaan
    const onder = T * 3.2; // ruimte voor de rotswanden onderaan
    return { w: (k.w + k.h) * T / 2 + T, h: (k.w + k.h) * T / 4 + boven + onder, ox: k.h * T / 2 + T / 2, oy: boven };
  }

  function vloerVan(k, x, y) {
    const c = teken(k, x, y);
    if (k.id === 'labo') return 'neon';
    if (c === '=' || c === 'S' || c === 'D') return 'pad';
    if (c === ',') return 'bloemen';
    if (k.ruine(x) && ':RlcokfS'.includes(c)) return c === 'R' ? 'plein' : 'neon';
    if (k.ruine(x)) return 'wild';
    return hash(x, y, 3) < 0.25 ? 'wild' : 'gras';
  }

  function bak(k, T, gebouwd = []) {
    const m = maat(k, T);
    const c = document.createElement('canvas');
    c.width = Math.ceil(m.w);
    c.height = Math.ceil(m.h);
    const g = c.getContext('2d');
    const brug = (x, y) => teken(k, x, y) === 'b' && gebouwd.includes('brug');
    BuArt.teken(g, {
      w: k.w,
      h: k.h,
      land: (x, y) => teken(k, x, y) !== '~' && (teken(k, x, y) !== 'b' || brug(x, y)),
      brug,
      vloer: (x, y) => vloerVan(k, x, y),
      stuk: () => null,
    }, T, m.ox, m.oy, { diep: k.id === 'labo' ? 0.8 : 0.45 });
    // Alle vaste stukken meteen mee in hetzelfde plaatje: elk beeld moet dan maar één plaatje tekenen.
    // Staat de ridder achter een stuk, dan tekent de gsm alleen dat stuk nog eens over hem heen.
    for (const st of stukken(k)) {
      const p = sprite(st, k, T);
      const x = m.ox + (st.x + (st.dx || 0) - st.y - (st.dy || 0)) * T / 2;
      const y = m.oy + (st.x + (st.dx || 0) + st.y + (st.dy || 0)) * T / 4;
      g.drawImage(p.c, Math.round(x - p.ax), Math.round(y - p.ay));
    }
    return { c, ...m };
  }

  // ---------- Stukken (van achter naar voor getekend) ----------

  // Een eenvoudig blok in isometrie, voor de werktafels en kasten in het labo.
  function blok(g, T, u0, u1, v0, v1, z0, z1, kleur, licht) {
    const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
    const vlak = (pts, f) => {
      g.beginPath();
      g.moveTo(...pts[0]);
      for (const p of pts.slice(1)) g.lineTo(...p);
      g.closePath();
      g.fillStyle = f;
      g.fill();
    };
    vlak([P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], BuArt.shade(kleur, -0.2));
    vlak([P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], BuArt.shade(kleur, -0.45));
    vlak([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], licht || BuArt.shade(kleur, 0.08));
    return P;
  }

  const eigenCache = new Map();
  // Tekeningen die niet in Mijn burcht bestaan: de werktafels van het labo, een kast en de binnenmuren.
  function eigenStuk(id, T) {
    const key = `${id}|${T}`;
    if (eigenCache.has(key)) return eigenCache.get(key);
    const c = document.createElement('canvas');
    c.width = Math.ceil(T * 1.2);
    c.height = Math.ceil(T * 2);
    const g = c.getContext('2d');
    const ax = c.width / 2;
    const ay = c.height - T * 0.35;
    g.translate(ax, ay);
    const tafel = () => {
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.beginPath();
      g.ellipse(0, 0, T * 0.4, T * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      for (const [u, v] of [[-0.32, -0.32], [0.28, -0.32], [-0.32, 0.28], [0.28, 0.28]]) blok(g, T, u, u + 0.05, v, v + 0.05, 0, 0.3, '#3b2a1c');
      return blok(g, T, -0.36, 0.36, -0.36, 0.36, 0.3, 0.36, '#6b4a2c', '#8a6038');
    };
    if (id === 'stroom') {
      const P = tafel();
      blok(g, T, -0.25, -0.05, -0.15, 0.05, 0.36, 0.5, '#ffc94a');
      blok(g, T, -0.2, -0.1, -0.1, 0.0, 0.5, 0.54, '#d0d8e8');
      g.strokeStyle = '#4cc9ff';
      g.lineWidth = T / 40;
      g.beginPath();
      g.moveTo(...P(-0.05, -0.05, 0.42));
      g.lineTo(...P(0.18, -0.05, 0.37));
      g.lineTo(...P(0.18, 0.15, 0.37));
      g.stroke();
      const [lx, ly] = P(0.18, 0.15, 0.5);
      g.fillStyle = '#ffe08a';
      g.beginPath();
      g.arc(lx, ly, T * 0.07, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(lx - T * 0.02, ly - T * 0.03, T * 0.03, T * 0.03);
    } else if (id === 'tandwiel') {
      const P = tafel();
      const wiel = (u, v, r, kleur) => {
        const [x, y] = P(u, v, 0.36);
        g.save();
        g.translate(x, y - r * 0.9);
        g.fillStyle = kleur;
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const rr = i % 2 ? r : r * 0.78;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.fillStyle = '#3b2a1c';
        g.beginPath();
        g.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        g.fill();
        g.restore();
      };
      wiel(-0.12, 0, T * 0.17, '#c8d4ea');
      wiel(0.16, 0.06, T * 0.12, '#ffc94a');
    } else if (id === 'wip') {
      const P = tafel();
      const [x, y] = P(0, 0, 0.36);
      g.fillStyle = '#8aa0c0';
      g.beginPath();
      g.moveTo(x - T * 0.06, y);
      g.lineTo(x + T * 0.06, y);
      g.lineTo(x, y - T * 0.1);
      g.fill();
      g.save();
      g.translate(x, y - T * 0.1);
      g.rotate(-0.12);
      g.fillStyle = '#c8d4ea';
      g.fillRect(-T * 0.3, -T * 0.02, T * 0.6, T * 0.03);
      g.fillStyle = '#ff4d6d';
      g.fillRect(-T * 0.27, -T * 0.09, T * 0.07, T * 0.07);
      g.fillStyle = '#4cc9ff';
      g.fillRect(T * 0.16, -T * 0.07, T * 0.06, T * 0.05);
      g.restore();
    } else if (id === 'kast') {
      blok(g, T, -0.42, 0.42, -0.2, 0.3, 0, 0.9, '#4a3220');
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      const kleuren = ['#ff70c8', '#4cc9ff', '#ffc94a', '#2ee6a6', '#c77dff'];
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 5; i++) {
          const [x, y] = P(-0.36 + i * 0.15, 0.3, 0.18 + r * 0.26);
          g.fillStyle = kleuren[(i + r * 2) % 5];
          g.fillRect(x, y - T * 0.13, T * 0.05, T * 0.13);
        }
        const a = P(-0.42, 0.3, 0.14 + r * 0.26);
        const b = P(0.42, 0.3, 0.14 + r * 0.26);
        g.strokeStyle = '#2b1d11';
        g.lineWidth = T / 50;
        g.beginPath();
        g.moveTo(...a);
        g.lineTo(...b);
        g.stroke();
      }
    } else if (id === 'binnenmuur') {
      blok(g, T, -0.5, 0.5, -0.5, 0.5, 0, 0.75, '#28324f', '#3a4870');
      g.strokeStyle = 'rgba(76,201,255,.8)';
      g.lineWidth = T / 36;
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      g.beginPath();
      g.moveTo(...P(-0.5, 0.5, 0.5));
      g.lineTo(...P(0.5, 0.5, 0.5));
      g.lineTo(...P(0.5, -0.5, 0.5));
      g.stroke();
    }
    const hit = { c, ax, ay };
    eigenCache.set(key, hit);
    return hit;
  }

  // Alle vaste stukken van een kaart, al in de goede volgorde (van achter naar voor).
  function stukken(k) {
    const out = [];
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
      const c = teken(k, x, y);
      let st = null;
      if (c === 'T') st = { bu: hash(x, y, 1) < 0.55 ? 'boom' : 'den', kleur: '#4cc9ff' };
      else if (c === 'k') st = { bu: 'kristal', kleur: '#4cc9ff' };
      else if (c === 'f') st = { bu: 'fakkel', kleur: '#4cc9ff' };
      else if (c === 'R') st = { bu: 'muur', kleur: '#6b5bd6', muur: true };
      else if (c === 'p') st = { bu: 'banier', kleur: '#2ee6a6', plek: 'bord' };
      else if (c === 'x') st = { eigen: 'kast' };
      else if (c === 'v') st = { bu: 'lichtpaal', kleur: '#2ee6a6' };
      else if (c === 'W') st = { eigen: 'binnenmuur' };
      else if (STATION[c]) {
        const id = STATION[c];
        st = STUK[id] ? { bu: STUK[id], kleur: '#ffc94a', plek: id } : { eigen: id, plek: id };
      }
      if (st) out.push({ x, y, ...st });
    }
    // Het labo: één groot gebouw op 2 op 2 vakjes, getekend vanaf het voorste vakje.
    const h = vind(k, 'H');
    if (h) out.push({ x: h.x + 1, y: h.y + 1, groot: 'huisje', kleur: '#2ee6a6', labo: true, dx: -0.5, dy: -0.5 });
    out.sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
    return out;
  }

  function sprite(st, k, T) {
    if (st.eigen) return eigenStuk(st.eigen, T);
    if (st.groot) return BuArt.stuk(st.groot, st.kleur, T * 2, {}, 0);
    let n = {};
    if (st.muur) {
      const m = (x, y) => teken(k, x, y) === 'R' || teken(k, x, y) === 'c';
      n = { xp: m(st.x + 1, st.y), xm: m(st.x - 1, st.y), yp: m(st.x, st.y + 1), ym: m(st.x, st.y - 1) };
    }
    return BuArt.stuk(st.bu, st.kleur, T, n, Math.floor(hash(st.x, st.y, 2) * 4));
  }

  // De gloed van kristallen, fakkels en de plekken (BuArt rekent de plaatsen uit).
  function gloeiers(k, T, ox, oy) {
    const lijst = stukken(k);
    const op = new Map(lijst.filter(s => s.bu).map(s => [`${s.x},${s.y}`, s]));
    return BuArt.gloeiers({
      w: k.w, h: k.h,
      land: (x, y) => op.has(`${x},${y}`),
      stuk: (x, y) => { const s = op.get(`${x},${y}`); return s ? { id: s.bu } : null; },
      vloer: () => 'gras',
    }, T, ox, oy, { glinster: false });
  }

  return { KAARTEN, STATION, STUK, kaart, teken, loopbaar, plekken, vind, maat, bak, stukken, sprite, gloeiers, eigenStuk };
})();
