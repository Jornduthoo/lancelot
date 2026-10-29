// De denkpuzzels van de ontdekwereld, gedeeld door de server en de gsm (zoals toren-world.js).
// maak(soort, niveau, seed) bouwt een puzzel die altijd op te lossen is; check(soort, puzzel, poging) zegt of een poging klopt.
// Zo maakt de server dezelfde puzzel als de gsm en controleert hij zelf of hij opgelost is.
// Soorten: schuif (schuifpuzzel), robot (robotridder programmeren), licht (spiegels en een lichtstraal),
// stroom (stroomkring in het labo), tandwiel (tandwielen in het labo), wip (hefboom in het labo).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OdPuzzels = factory();
}(typeof self !== 'undefined' ? self : this, () => {
  const NIVEAUS = ['page', 'schildknaap', 'ridder'];

  // Een vaste toevalsreeks uit een tekst: dezelfde seed geeft dezelfde puzzel.
  function rng(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const ch of String(seed)) {
      h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);
    next.pick = list => list[next.int(list.length)];
    next.shuffle = list => {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = next.int(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    return next;
  }

  // Richtingen: 0 noord, 1 oost, 2 zuid, 3 west.
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  const niv = n => (NIVEAUS.includes(n) ? n : 'schildknaap');

  // ---------- Schuifpuzzel ----------
  // Vanuit de oplossing een reeks geldige zetten terug: zo is hij altijd op te lossen.

  function maakSchuif(n, r) {
    const size = { page: 3, schildknaap: 3, ridder: 4 }[n];
    const zetten = { page: 16, schildknaap: 46, ridder: 90 }[n];
    const bord = [...Array(size * size - 1).keys()].map(i => i + 1).concat(0);
    let leeg = bord.length - 1;
    let vorige = -1;
    for (let i = 0; i < zetten || schuifKlaar(bord); i++) {
      const buren = schuifBuren(leeg, size).filter(p => p !== vorige);
      const p = r.pick(buren);
      bord[leeg] = bord[p];
      bord[p] = 0;
      vorige = leeg;
      leeg = p;
    }
    return { size, bord };
  }

  function schuifBuren(p, size) {
    const x = p % size;
    const y = Math.floor(p / size);
    const out = [];
    if (y > 0) out.push(p - size);
    if (y < size - 1) out.push(p + size);
    if (x > 0) out.push(p - 1);
    if (x < size - 1) out.push(p + 1);
    return out;
  }

  const schuifKlaar = bord => bord.every((v, i) => v === (i === bord.length - 1 ? 0 : i + 1));

  // Een zet: de plaats van de tegel die naar het lege vakje schuift. Geeft het nieuwe bord, of null als het niet mag.
  function schuifZet(bord, size, p) {
    const leeg = bord.indexOf(0);
    if (!schuifBuren(leeg, size).includes(p)) return null;
    const uit = bord.slice();
    uit[leeg] = uit[p];
    uit[p] = 0;
    return uit;
  }

  function checkSchuif(pz, poging) {
    if (!Array.isArray(poging) || poging.length > 5000) return false;
    let bord = pz.bord.slice();
    for (const p of poging) {
      bord = schuifZet(bord, pz.size, Number(p));
      if (!bord) return false;
    }
    return schuifKlaar(bord);
  }

  // ---------- Robotridder ----------
  // Blokken: V = een stap vooruit, L = draai links, R = draai rechts. De Ridder schrijft één lus: blokken × herhaal.

  function robotLoop(pz, blokken, herhaal, stopBijDoel) {
    let { x, y, d } = pz.start;
    const pad = [{ x, y, d }];
    for (let k = 0; k < herhaal; k++) {
      for (const b of blokken) {
        if (b === 'L') d = (d + 3) % 4;
        else if (b === 'R') d = (d + 1) % 4;
        else if (b === 'V') {
          x += DX[d];
          y += DY[d];
          if (x < 0 || y < 0 || x >= pz.size || y >= pz.size) return { pad, fout: 'rand' };
          if (pz.muren && pz.muren.some(m => m[0] === x && m[1] === y)) return { pad, fout: 'muur' };
        } else return { pad, fout: 'blok' };
        pad.push({ x, y, d });
        if (stopBijDoel && x === pz.doel.x && y === pz.doel.y) return { pad, ok: true };
      }
    }
    return { pad, ok: x === pz.doel.x && y === pz.doel.y };
  }

  function maakRobot(n, r) {
    const size = { page: 5, schildknaap: 6, ridder: 7 }[n];
    for (let poging = 0; poging < 400; poging++) {
      const start = { x: r.int(size), y: r.int(size), d: r.int(4) };
      let blokken = [];
      let herhaal = 1;
      if (n === 'ridder') {
        // Een lus: 3 tot 5 blokken met minstens twee stappen en een draai, 2 tot 4 keer.
        const len = 3 + r.int(3);
        blokken = Array.from({ length: len }, () => r.pick(['V', 'V', 'V', 'L', 'R']));
        if (blokken.filter(b => b === 'V').length < 2 || !blokken.some(b => b !== 'V')) continue;
        if (blokken[0] !== 'V' && blokken[blokken.length - 1] !== 'V') continue;
        herhaal = 2 + r.int(3);
      } else {
        // Stukken rechtdoor met draaien ertussen.
        const stukken = n === 'page' ? 2 + r.int(2) : 3 + r.int(2);
        for (let i = 0; i < stukken; i++) {
          if (i) blokken.push(r.pick(['L', 'R']));
          const k = 1 + r.int(n === 'page' ? 3 : 3);
          for (let j = 0; j < k; j++) blokken.push('V');
        }
      }
      const pz = { size, start, doel: { x: -1, y: -1 }, muren: [] };
      const res = robotLoop(pz, blokken, herhaal, false);
      if (res.fout) continue;
      // Geen vakje twee keer (dan is het pad duidelijk) en het doel ligt niet op de start.
      const cellen = res.pad.map(p => `${p.x},${p.y}`);
      const uniek = [...new Set(cellen)];
      const eind = res.pad[res.pad.length - 1];
      if (uniek.length < cellen.filter((c, i) => i === 0 || c !== cellen[i - 1]).length) continue;
      if (eind.x === start.x && eind.y === start.y) continue;
      if (uniek.length < (n === 'page' ? 4 : 6)) continue;
      pz.doel = { x: eind.x, y: eind.y };
      // Muren op vakjes buiten het pad.
      const vrij = [];
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!uniek.includes(`${x},${y}`)) vrij.push([x, y]);
      const aantal = Math.round(vrij.length * { page: 0.18, schildknaap: 0.26, ridder: 0.3 }[n]);
      pz.muren = r.shuffle(vrij).slice(0, aantal);
      pz.opl = { blokken, herhaal }; // de server haalt dit eruit voor het naar de gsm gaat
      const alles = blokken.length * herhaal;
      if (n === 'page') pz.hulp = uniek.map(c => c.split(',').map(Number)); // Page ziet het pad als stippen
      if (n === 'schildknaap') pz.max = alles + 2;
      if (n === 'ridder') {
        pz.max = blokken.length;
        pz.lus = true;
      }
      return pz;
    }
    // Reserve: een eenvoudige rechte lijn.
    return { size, start: { x: 0, y: 0, d: 1 }, doel: { x: 3, y: 0 }, muren: [], max: n === 'ridder' ? 1 : null, lus: n === 'ridder' };
  }

  function checkRobot(pz, poging) {
    if (!poging || !Array.isArray(poging.blokken) || !poging.blokken.length || poging.blokken.length > 40) return false;
    if (pz.max && poging.blokken.length > pz.max) return false;
    const herhaal = pz.lus ? Math.max(1, Math.min(9, Math.round(Number(poging.herhaal) || 1))) : 1;
    return !!robotLoop(pz, poging.blokken, herhaal, true).ok;
  }

  // ---------- Lichtstraal met spiegels ----------
  // De bron schijnt van links naar rechts. Tik op een spiegel om hem om te draaien (/ of \).

  // Waar gaat het licht heen na een spiegel? '/' : oost->noord, noord->oost, west->zuid, zuid->west.
  const KAATS = {
    '/': [1, 0, 3, 2],
    '\\': [3, 2, 1, 0],
  };

  function lichtPad(pz, standen) {
    let x = 0;
    let y = pz.bron;
    let d = 1;
    const pad = [[-1, y]];
    for (let i = 0; i < 300; i++) {
      if (x < 0 || y < 0 || x >= pz.w || y >= pz.h) return { pad, ok: false };
      pad.push([x, y]);
      if (x === pz.doel.x && y === pz.doel.y) return { pad, ok: true };
      if (pz.rotsen && pz.rotsen.some(r => r[0] === x && r[1] === y)) return { pad, ok: false };
      const s = pz.spiegels.findIndex(m => m.x === x && m.y === y);
      if (s >= 0) d = KAATS[standen ? standen[s] : pz.spiegels[s].s][d];
      x += DX[d];
      y += DY[d];
    }
    return { pad, ok: false };
  }

  function maakLicht(n, r) {
    const w = { page: 5, schildknaap: 6, ridder: 7 }[n];
    const h = { page: 4, schildknaap: 5, ridder: 6 }[n];
    const nodig = { page: 2, schildknaap: 3, ridder: 4 }[n];
    for (let poging = 0; poging < 600; poging++) {
      const bron = r.int(h);
      let x = 0;
      let y = bron;
      let d = 1;
      const gezien = new Set([`${x},${y}`]);
      const spiegels = [];
      let rechtdoor = 0;
      let mislukt = false;
      while (true) {
        // Draaien (spiegel) of rechtdoor; na genoeg spiegels nog een paar stappen tot het doel.
        const magDraaien = rechtdoor >= 1 && spiegels.length < nodig;
        if (magDraaien && r() < 0.45) {
          const nd = r() < 0.5 ? (d + 1) % 4 : (d + 3) % 4;
          const s = KAATS['/'][d] === nd ? '/' : '\\';
          spiegels.push({ x, y, s });
          d = nd;
          rechtdoor = 0;
        } else if (spiegels.length >= nodig && rechtdoor >= 1 && r() < 0.5) break;
        x += DX[d];
        y += DY[d];
        rechtdoor++;
        if (x < 0 || y < 0 || x >= w || y >= h || gezien.has(`${x},${y}`)) {
          mislukt = true;
          break;
        }
        gezien.add(`${x},${y}`);
      }
      if (mislukt || spiegels.length < nodig) continue;
      const doel = { x, y };
      if (spiegels.some(m => m.x === x && m.y === y)) continue;
      const pz = { w, h, bron, doel, spiegels: spiegels.map(m => ({ ...m })), rotsen: [] };
      const vrij = [];
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (!gezien.has(`${xx},${yy}`)) vrij.push([xx, yy]);
      const extra = r.shuffle(vrij);
      // Lokspiegels en rotsen maken het moeilijker.
      const lok = { page: 0, schildknaap: 1, ridder: 2 }[n];
      for (let i = 0; i < lok && extra.length; i++) {
        const [xx, yy] = extra.pop();
        pz.spiegels.push({ x: xx, y: yy, s: r() < 0.5 ? '/' : '\\' });
      }
      const rots = { page: 0, schildknaap: 1, ridder: 2 }[n];
      for (let i = 0; i < rots && extra.length; i++) pz.rotsen.push(extra.pop());
      // Alle spiegels door elkaar draaien, tot het licht het doel niet meer raakt.
      for (const m of pz.spiegels) if (r() < 0.6) m.s = m.s === '/' ? '\\' : '/';
      let k = 0;
      while (lichtPad(pz).ok && k < pz.spiegels.length) {
        pz.spiegels[k].s = pz.spiegels[k].s === '/' ? '\\' : '/';
        k++;
      }
      if (lichtPad(pz).ok) continue;
      pz.spiegels.sort((a, b) => a.y - b.y || a.x - b.x);
      return pz;
    }
    return { w, h, bron: 0, doel: { x: 2, y: 1 }, spiegels: [{ x: 2, y: 0, s: '/' }], rotsen: [] };
  }

  function checkLicht(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.spiegels.length) return false;
    if (poging.some(s => s !== '/' && s !== '\\')) return false;
    return lichtPad(pz, poging).ok;
  }

  // ---------- Stroomkring (labo) ----------
  // Elk stukje draad heeft verbindingen: 1 noord, 2 oost, 4 zuid, 8 west. Draai ze tot de batterij de lamp raakt.

  const draai = (m, k) => {
    let out = m;
    for (let i = 0; i < ((k % 4) + 4) % 4; i++) out = ((out << 1) | (out >> 3)) & 15;
    return out;
  };
  const BIT = [1, 2, 4, 8];

  function stroomBereik(pz, rot) {
    const m = (x, y) => draai(pz.stukken[y * pz.w + x], rot ? rot[y * pz.w + x] || 0 : 0);
    const bereikt = new Set();
    if (!(m(0, pz.a) & 8)) return bereikt;
    const rij = [[0, pz.a]];
    bereikt.add(`0,${pz.a}`);
    while (rij.length) {
      const [x, y] = rij.shift();
      const mm = m(x, y);
      for (let d = 0; d < 4; d++) {
        if (!(mm & BIT[d])) continue;
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= pz.w || ny >= pz.h || bereikt.has(`${nx},${ny}`)) continue;
        if (!(m(nx, ny) & BIT[(d + 2) % 4])) continue;
        bereikt.add(`${nx},${ny}`);
        rij.push([nx, ny]);
      }
    }
    return bereikt;
  }

  function stroomOk(pz, rot) {
    const b = stroomBereik(pz, rot);
    const x = pz.w - 1;
    const y = pz.b;
    return b.has(`${x},${y}`) && !!(draai(pz.stukken[y * pz.w + x], rot ? rot[y * pz.w + x] || 0 : 0) & 2);
  }

  function maakStroom(n, r) {
    const w = { page: 4, schildknaap: 5, ridder: 6 }[n];
    const h = { page: 3, schildknaap: 4, ridder: 5 }[n];
    for (let poging = 0; poging < 200; poging++) {
      const a = r.int(h);
      const b = r.int(h);
      // Een kronkelpad van links naar rechts (diepte eerst, in willekeurige volgorde).
      const pad = [];
      const gezien = new Set();
      const zoek = (x, y) => {
        pad.push([x, y]);
        gezien.add(`${x},${y}`);
        if (x === w - 1 && y === b) return true;
        if (pad.length > w * h * 0.8) {
          pad.pop();
          return false;
        }
        for (const d of r.shuffle([0, 1, 2, 3])) {
          const nx = x + DX[d];
          const ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || gezien.has(`${nx},${ny}`)) continue;
          if (zoek(nx, ny)) return true;
        }
        pad.pop();
        return false;
      };
      if (!zoek(0, a)) continue;
      if (pad.length < w + (n === 'page' ? 0 : 2)) continue;
      const stukken = Array(w * h).fill(0);
      pad.forEach(([x, y], i) => {
        const van = i === 0 ? [-1, y] : pad[i - 1];
        const naar = i === pad.length - 1 ? [w, y] : pad[i + 1];
        let m = 0;
        for (const [px, py] of [van, naar]) {
          for (let d = 0; d < 4; d++) if (x + DX[d] === px && y + DY[d] === py) m |= BIT[d];
        }
        stukken[y * w + x] = m;
      });
      // Lege vakjes: niets (Page) of losse stukjes draad om je op het verkeerde been te zetten.
      const vul = n === 'page' ? [] : n === 'schildknaap' ? [5, 3, 0] : [5, 3, 7, 3];
      for (let i = 0; i < stukken.length; i++) if (!stukken[i] && vul.length) stukken[i] = r.pick(vul);
      const pz = { w, h, a, b, stukken };
      // Alles door elkaar draaien.
      pz.stukken = stukken.map(m => draai(m, r.int(4)));
      if (stroomOk(pz)) pz.stukken = pz.stukken.map(m => draai(m, 1));
      if (stroomOk(pz)) continue;
      return pz;
    }
    return { w: 3, h: 1, a: 0, b: 0, stukken: [5, 10, 5] };
  }

  function checkStroom(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.stukken.length) return false;
    return stroomOk(pz, poging.map(k => ((Math.round(Number(k)) || 0) % 4 + 4) % 4));
  }

  // ---------- Tandwielen (labo) ----------
  // Wielen die elkaar raken draaien de andere kant op. Het eerste wiel draait met de klok mee.
  // Op een rooster raken buren elkaar; een rooster kan je kleuren als een dambord, dus de richting volgt uit (x + y).

  function maakTandwiel(n, r) {
    if (n === 'ridder') {
      // Twee wielen met tanden: hoe vaak draait het kleine wiel, en in welke richting?
      const paren = [[24, 8], [36, 12], [30, 10], [32, 8], [40, 10], [24, 12], [36, 9], [20, 10], [48, 12], [30, 15]];
      const [ta, tb] = r.pick(paren);
      const keer = 1 + r.int(3);
      const tussen = r() < 0.5; // een tussenwiel keert de richting nog eens om
      const juist = { n: (keer * ta) / tb, d: tussen ? 'met' : 'tegen' };
      const getallen = r.shuffle([...new Set([juist.n, juist.n + keer, Math.max(1, juist.n - keer), keer * 2, ta / tb, juist.n * 2].filter(x => x > 0))]).filter(x => x !== juist.n).slice(0, 1);
      const opties = r.shuffle([
        `${juist.n}× ${juist.d === 'met' ? 'met de klok mee' : 'tegen de klok in'}`,
        `${juist.n}× ${juist.d === 'met' ? 'tegen de klok in' : 'met de klok mee'}`,
        `${getallen[0]}× ${juist.d === 'met' ? 'met de klok mee' : 'tegen de klok in'}`,
        `${keer}× ${juist.d === 'met' ? 'met de klok mee' : 'tegen de klok in'}`,
      ].filter((o, i, l) => l.indexOf(o) === i));
      const wielen = [{ x: 0, y: 0, t: ta }];
      if (tussen) wielen.push({ x: 1, y: 0, t: 16 });
      wielen.push({ x: wielen.length, y: 0, t: tb });
      return {
        wielen, vraagWiel: wielen.length - 1, keer, opties, ratio: true,
        vraag: `Het grote wiel (${ta} tanden) draait ${keer === 1 ? 'één keer' : `${keer} keer`} rond, met de klok mee. Hoe vaak draait het kleine wiel (${tb} tanden) rond, en in welke richting?`,
      };
    }
    // Een ketting van wielen op een rooster.
    const aantal = n === 'page' ? 3 + r.int(2) : 5 + r.int(3);
    const breed = n === 'page' ? 5 : 5;
    const hoog = n === 'page' ? 1 : 3;
    for (let poging = 0; poging < 200; poging++) {
      const wielen = [{ x: 0, y: r.int(hoog) }];
      const bezet = new Set([`${wielen[0].x},${wielen[0].y}`]);
      while (wielen.length < aantal) {
        const opties = [];
        for (const w of wielen) {
          for (let d = 0; d < 4; d++) {
            const x = w.x + DX[d];
            const y = w.y + DY[d];
            if (x < 0 || y < 0 || x >= breed || y >= hoog || bezet.has(`${x},${y}`)) continue;
            opties.push({ x, y });
          }
        }
        if (!opties.length) break;
        const keuze = n === 'page' ? opties.sort((a, b) => b.x - a.x)[0] : r.pick(opties);
        wielen.push(keuze);
        bezet.add(`${keuze.x},${keuze.y}`);
      }
      if (wielen.length < aantal) continue;
      const vraagWiel = n === 'page' ? wielen.length - 1 : 1 + r.int(wielen.length - 1);
      return {
        wielen: wielen.map(w => ({ ...w, t: 12 })), vraagWiel,
        opties: ['met de klok mee', 'tegen de klok in'],
        vraag: n === 'page'
          ? 'Het eerste wiel draait met de klok mee. Hoe draait het laatste wiel?'
          : 'Het wiel met de pijl draait met de klok mee. Hoe draait het wiel met het vraagteken?',
      };
    }
    return { wielen: [{ x: 0, y: 0, t: 12 }, { x: 1, y: 0, t: 12 }], vraagWiel: 1, opties: ['met de klok mee', 'tegen de klok in'], vraag: 'Hoe draait het tweede wiel?' };
  }

  function tandwielAntwoord(pz) {
    if (pz.ratio) {
      const ta = pz.wielen[0].t;
      const tb = pz.wielen[pz.wielen.length - 1].t;
      const met = pz.wielen.length === 3;
      return `${(pz.keer * ta) / tb}× ${met ? 'met de klok mee' : 'tegen de klok in'}`;
    }
    const a = pz.wielen[0];
    const b = pz.wielen[pz.vraagWiel];
    return (a.x + a.y + b.x + b.y) % 2 === 0 ? 'met de klok mee' : 'tegen de klok in';
  }

  const checkTandwiel = (pz, poging) => pz.opties[Number(poging)] === tandwielAntwoord(pz);

  // ---------- Wip (hefboom, labo) ----------
  // Plaatsen 1 tot 4 aan elke kant. In evenwicht als gewicht × afstand links gelijk is aan rechts.

  const BLOKKEN = [1, 2, 3, 4, 6];

  function maakWip(n, r) {
    if (n === 'page') {
      const w = 1 + r.int(3);
      const d = 1 + r.int(4);
      return { links: [{ w, d }], rechts: { w }, vraag: `Zet het blok van ${w} kg zo dat de wip in evenwicht is.` };
    }
    if (n === 'schildknaap') {
      const opties = [];
      for (const w1 of [1, 2, 3, 4, 6]) for (let d1 = 1; d1 <= 4; d1++) for (const w2 of [1, 2, 3, 4, 6]) {
        const d2 = (w1 * d1) / w2;
        if (w2 !== w1 && Number.isInteger(d2) && d2 >= 1 && d2 <= 4) opties.push({ w1, d1, w2 });
      }
      const o = r.pick(opties);
      return { links: [{ w: o.w1, d: o.d1 }], rechts: { w: o.w2 }, vraag: `Waar moet het blok van ${o.w2} kg staan om de wip in evenwicht te brengen?` };
    }
    // Ridder: twee blokken links, kies zelf een blok en een plaats rechts.
    for (let poging = 0; poging < 300; poging++) {
      const w1 = 1 + r.int(4);
      const w2 = 1 + r.int(4);
      const d1 = 1 + r.int(4);
      let d2 = 1 + r.int(4);
      if (d2 === d1) continue;
      const totaal = w1 * d1 + w2 * d2;
      if (!BLOKKEN.some(w => Number.isInteger(totaal / w) && totaal / w >= 1 && totaal / w <= 4)) continue;
      return { links: [{ w: w1, d: d1 }, { w: w2, d: d2 }], rechts: { kies: BLOKKEN }, vraag: 'Kies een blok en een plaats om de wip in evenwicht te brengen.' };
    }
    return { links: [{ w: 2, d: 2 }, { w: 1, d: 4 }], rechts: { kies: BLOKKEN }, vraag: 'Kies een blok en een plaats om de wip in evenwicht te brengen.' };
  }

  const wipLinks = pz => pz.links.reduce((t, b) => t + b.w * b.d, 0);

  function checkWip(pz, poging) {
    if (!poging) return false;
    const w = pz.rechts.kies ? Number(poging.w) : pz.rechts.w;
    const d = Number(poging.d);
    if (pz.rechts.kies && !pz.rechts.kies.includes(w)) return false;
    if (!Number.isInteger(d) || d < 1 || d > 4) return false;
    return w * d === wipLinks(pz);
  }

  // ---------- Samen ----------

  const SOORTEN = {
    schuif: { maak: maakSchuif, check: checkSchuif },
    robot: { maak: maakRobot, check: checkRobot },
    licht: { maak: maakLicht, check: checkLicht },
    stroom: { maak: maakStroom, check: checkStroom },
    tandwiel: { maak: maakTandwiel, check: checkTandwiel },
    wip: { maak: maakWip, check: checkWip },
  };

  function maak(soort, niveau, seed) {
    const s = SOORTEN[soort];
    if (!s) return null;
    return s.maak(niv(niveau), rng(`${soort}|${niveau}|${seed}`));
  }

  function check(soort, pz, poging) {
    const s = SOORTEN[soort];
    try {
      return !!(s && pz && s.check(pz, poging));
    } catch {
      return false;
    }
  }

  return {
    NIVEAUS, SOORTEN: Object.keys(SOORTEN), maak, check, rng,
    schuifZet, schuifKlaar, robotLoop, lichtPad, stroomBereik, stroomOk, draai, wipLinks, KAATS, DX, DY,
  };
}));
