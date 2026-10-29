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
    const t = r.t || 0; // hoger op de trap: meer door elkaar, en een groter bord voor de Schildknaap
    const size = { page: 3, schildknaap: t >= 6 ? 4 : 3, ridder: 4 }[n];
    const zetten = { page: 16, schildknaap: 46, ridder: 90 }[n] + Math.min(150, t * 10);
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
    const t = r.t || 0;
    const size = { page: 5, schildknaap: 6, ridder: 7 }[n] + Math.min(3, Math.floor(t / 3));
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
        const stukken = (n === 'page' ? 2 + r.int(2) : 3 + r.int(2)) + Math.min(2, Math.floor(t / 3));
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
    const t = r.t || 0;
    const w = { page: 5, schildknaap: 6, ridder: 7 }[n] + Math.min(3, Math.floor(t / 3));
    const h = { page: 4, schildknaap: 5, ridder: 6 }[n] + Math.min(2, Math.floor(t / 4));
    const nodig = { page: 2, schildknaap: 3, ridder: 4 }[n] + Math.min(3, Math.floor(t / 3));
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
      const lok = { page: 0, schildknaap: 1, ridder: 2 }[n] + Math.min(3, Math.floor(t / 2));
      for (let i = 0; i < lok && extra.length; i++) {
        const [xx, yy] = extra.pop();
        pz.spiegels.push({ x: xx, y: yy, s: r() < 0.5 ? '/' : '\\' });
      }
      const rots = { page: 0, schildknaap: 1, ridder: 2 }[n] + Math.min(3, Math.floor(t / 2));
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
    const t = r.t || 0;
    const w = { page: 4, schildknaap: 5, ridder: 6 }[n] + Math.min(3, Math.floor(t / 3));
    const h = { page: 3, schildknaap: 4, ridder: 5 }[n] + Math.min(2, Math.floor(t / 4));
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


  // ---------- De Goudsmid: weegschalen ----------
  // Dingen op een weegschaal: hoeveel weegt één ding? Het antwoord (opl) blijft op de server.
  const WAREN = ['👑', '💎', '🛡️', '🗡️', '🥚', '🍎'];

  function maakWeeg(n, r) {
    const t = r.t || 0;
    const max = { page: 6, schildknaap: 9, ridder: 12 }[n] + Math.min(20, t * 2);
    const [a, b, c] = r.shuffle(WAREN);
    const wa = 2 + r.int(max - 1);
    const wb = 2 + r.int(max - 1);
    const wc = 2 + r.int(max - 1);
    const rij = (links, rechts) => ({ links, rechts });
    const keer = (ding, k) => Array(k).fill(ding);
    if (n === 'page') {
      // k keer hetzelfde ding = een aantal goudstukken
      const k = 2 + r.int(Math.min(4, 2 + Math.floor(t / 2)));
      return { schalen: [rij(keer(a, k), [`${k * wa}`])], vraag: a, opl: wa };
    }
    if (n === 'schildknaap') {
      // eerst één ding uitrekenen, dan het tweede
      const k = 2 + r.int(3);
      const schalen = [rij(keer(a, k), [`${k * wa}`]), rij([a, ...keer(b, 1 + r.int(2))], null)];
      const nb = schalen[1].links.length - 1;
      schalen[1].rechts = [`${wa + nb * wb}`];
      return { schalen: r() < 0.5 ? schalen : schalen.reverse(), vraag: b, opl: wb };
    }
    // Ridder: drie dingen, en een schaal met twee soorten aan één kant
    const k = 2 + r.int(2);
    const schalen = [
      rij(keer(a, k), [`${k * wa}`]),
      rij([a, b, b], [`${wa + 2 * wb}`]),
      rij([b, c, c, c], [`${wb + 3 * wc}`]),
    ];
    if (t >= 4) schalen[0] = rij([a, a, b], [`${2 * wa + wb}`]); // dan moet je ook a eerst zoeken met b
    if (t >= 4) schalen.splice(1, 0, rij([b, b, b], [`${3 * wb}`]));
    return { schalen: r.shuffle(schalen), vraag: c, opl: wc };
  }
  const checkWeeg = (pz, poging) => Number(poging) === pz.opl;

  // ---------- Het Drakennest: reeksen ----------
  // Welk getal komt er nu? Hoe hoger op de trap, hoe moeilijker de regel.

  function maakReeks(n, r) {
    const t = r.t || 0;
    const groot = 1 + Math.floor(t / 3);
    const regels = {
      page: [
        () => { const s = 1 + r.int(10); const d = 1 + r.int(4 + groot); return i => s + d * i; },
        () => { const d = 2 + r.int(3 + groot); const s = d * (8 + r.int(5)); return i => s - d * i; },
        () => { const d = [2, 5, 10][r.int(3)] * groot; const s = d * r.int(5); return i => s + d * i; },
      ],
      schildknaap: [
        () => { const s = 1 + r.int(3); const f = 2 + r.int(groot > 2 ? 2 : 1); return i => s * f ** i; },
        () => { const a = 2 + r.int(5); const b = 1 + r.int(4); const s = r.int(10); return i => s + Math.ceil(i / 2) * a - Math.floor(i / 2) * b; },
        () => { const s = 1 + r.int(5); const d = 1 + r.int(2 + groot); return i => s + d * (i * (i + 1)) / 2; },
        () => { const d = 3 + r.int(6 + groot * 2); const s = 2 + r.int(20); return i => s + d * i; },
      ],
      ridder: [
        () => { const a = 1 + r.int(3); const b = 1 + r.int(4); return i => { let x = a; let y = b; for (let k = 0; k < i; k++) [x, y] = [y, x + y]; return x; }; },
        () => { const s = 1 + r.int(4); return i => (i + s) ** 2; },
        () => { const s = 2 + r.int(5); const f = 2; const d = 1 + r.int(3); return i => { let x = s; for (let k = 0; k < i; k++) x = x * f - d; return x; }; },
        () => { const s = 50 + r.int(50) + groot * 20; const d = 1 + r.int(3); return i => s - d * (i * (i + 1)) / 2; },
        () => { const a = 2 + r.int(3); const s = 1 + r.int(4); return i => (i % 2 ? s * a ** Math.ceil(i / 2) : s + i * a); },
      ],
    }[n];
    // Hoger op de trap komen er ook regels van het niveau erboven bij.
    const pool = regels.slice();
    if (n === 'page' && t >= 5) pool.push(() => { const a = 3 + r.int(4); const b = 1 + r.int(2); const s0 = r.int(10); return i => s0 + Math.ceil(i / 2) * a - Math.floor(i / 2) * b; });
    if (n === 'schildknaap' && t >= 6) pool.push(() => { const a = 1 + r.int(3); const b = 1 + r.int(3); return i => { let x = a; let y = b; for (let k = 0; k < i; k++) [x, y] = [y, x + y]; return x; }; });
    for (let poging = 0; poging < 60; poging++) {
      const f = r.pick(pool)();
      const len = { page: 5, schildknaap: 6, ridder: 6 }[n];
      const rij = Array.from({ length: len + 1 }, (_, i) => f(i));
      if (rij.some(x => !Number.isInteger(x) || x < 0 || x > 9999)) continue;
      if (new Set(rij).size < 3) continue;
      // Ridder: soms ontbreekt er een getal in het midden in plaats van op het einde.
      const gat = n === 'ridder' && t >= 3 && r() < 0.5 ? 2 + r.int(len - 3) : len;
      const opl = rij[gat];
      const toon = rij.map((x, i) => (i === gat ? null : x));
      if (gat === len) toon.pop();
      return { rij: toon, opl };
    }
    return { rij: [2, 4, 6, 8, null], opl: 10 };
  }
  const checkReeks = (pz, poging) => Number(poging) === pz.opl;

  // ---------- Het Drakenbeeld: pixelpuzzel ----------
  // Kleur vakjes zodat elke rij en kolom de getallen volgt. Elke tekening die klopt met de getallen is goed.

  const lijnGetallen = rij => {
    const uit = [];
    let k = 0;
    for (const v of rij) {
      if (v) k++;
      else if (k) { uit.push(k); k = 0; }
    }
    if (k) uit.push(k);
    return uit.length ? uit : [0];
  };

  function maakPixel(n, r) {
    const t = r.t || 0;
    const size = { page: 5, schildknaap: 6, ridder: 8 }[n] + Math.min(4, Math.floor(t / 3));
    const vol = { page: 0.62, schildknaap: 0.56, ridder: 0.52 }[n];
    for (let poging = 0; poging < 40; poging++) {
      const veld = Array.from({ length: size }, () => Array.from({ length: size }, () => (r() < vol ? 1 : 0)));
      // spiegelen maakt het een mooier figuurtje
      if (r() < 0.7) for (const rij of veld) for (let x = 0; x < size / 2; x++) rij[size - 1 - x] = rij[x];
      const rijen = veld.map(lijnGetallen);
      const kolommen = veld[0].map((_, x) => lijnGetallen(veld.map(rij => rij[x])));
      if (rijen.some(g => g[0] === 0) || kolommen.some(g => g[0] === 0)) continue;
      return { size, rijen, kolommen };
    }
    return { size: 3, rijen: [[3], [1, 1], [3]], kolommen: [[3], [1, 1], [3]] };
  }

  function checkPixel(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.size * pz.size) return false;
    const v = poging.map(x => (x ? 1 : 0));
    for (let y = 0; y < pz.size; y++) if (lijnGetallen(v.slice(y * pz.size, y * pz.size + pz.size)).join() !== pz.rijen[y].join()) return false;
    for (let x = 0; x < pz.size; x++) if (lijnGetallen(Array.from({ length: pz.size }, (_, y) => v[y * pz.size + x])).join() !== pz.kolommen[x].join()) return false;
    return true;
  }

  // ---------- De Sterrenkoepel: sudoku ----------
  // 4 op 4 of 6 op 6. Elke rij, kolom en elk blok heeft elk getal één keer.

  function maakSudoku(n, r) {
    const t = r.t || 0;
    const size = n === 'page' ? 4 : n === 'schildknaap' ? (t >= 4 ? 6 : 4) : 6;
    const bw = size === 4 ? 2 : 3; // breedte van een blok
    const bh = 2;
    // Een geldig rooster uit een vast patroon, daarna rijen, kolommen en getallen schudden.
    const basis = (y, x) => ((y % bh) * bw + Math.floor(y / bh) + x) % size;
    const banden = r.shuffle([...Array(size / bh).keys()]);
    const rijen = banden.flatMap(b => r.shuffle([...Array(bh).keys()]).map(k => b * bh + k));
    const stapels = r.shuffle([...Array(size / bw).keys()]);
    const kols = stapels.flatMap(b => r.shuffle([...Array(bw).keys()]).map(k => b * bw + k));
    const getal = r.shuffle([...Array(size).keys()].map(i => i + 1));
    const opl = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) opl.push(getal[basis(rijen[y], kols[x])]);
    const leeg = size === 4 ? { page: 6, schildknaap: 8, ridder: 9 }[n] : { page: 14, schildknaap: 14, ridder: 18 }[n];
    const weg = Math.min(size * size - (size === 4 ? 4 : 10), leeg + Math.floor(t / 2));
    const cellen = r.shuffle([...opl.keys()]).slice(0, weg);
    const gegeven = opl.map((v, i) => (cellen.includes(i) ? 0 : v));
    return { size, bw, bh, gegeven };
  }

  function checkSudoku(pz, poging) {
    const { size, bw, bh, gegeven } = pz;
    if (!Array.isArray(poging) || poging.length !== size * size) return false;
    const v = poging.map(Number);
    if (gegeven.some((g, i) => g && g !== v[i])) return false;
    if (v.some(x => !Number.isInteger(x) || x < 1 || x > size)) return false;
    const groepen = [];
    for (let i = 0; i < size; i++) {
      groepen.push([...Array(size).keys()].map(x => i * size + x));
      groepen.push([...Array(size).keys()].map(y => y * size + i));
    }
    for (let by = 0; by < size; by += bh) for (let bx = 0; bx < size; bx += bw) {
      const g = [];
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) g.push(y * size + x);
      groepen.push(g);
    }
    return groepen.every(g => new Set(g.map(i => v[i])).size === size);
  }

  // ---------- De Donjon: doolhof met sleutels ----------
  // Een doolhof op een rooster. Deuren gaan pas open met de sleutel in dezelfde kleur.

  function maakDoolhof(n, r) {
    const t = r.t || 0;
    const cel = { page: 5, schildknaap: 6, ridder: 7 }[n] + Math.min(4, Math.floor(t / 2)); // cellen per kant
    const size = cel * 2 + 1;
    const muur = Array(size * size).fill(1);
    const id = (x, y) => y * size + x;
    // Diepte eerst door de cellen: een doolhof zonder lussen.
    const stapel = [[1, 1]];
    muur[id(1, 1)] = 0;
    while (stapel.length) {
      const [x, y] = stapel[stapel.length - 1];
      const buren = r.shuffle([0, 1, 2, 3]).map(d => [x + DX[d] * 2, y + DY[d] * 2, d]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && muur[id(nx, ny)]);
      if (!buren.length) { stapel.pop(); continue; }
      const [nx, ny, d] = buren[0];
      muur[id(x + DX[d], y + DY[d])] = 0;
      muur[id(nx, ny)] = 0;
      stapel.push([nx, ny]);
    }
    const start = { x: 1, y: 1 };
    const doel = { x: size - 2, y: size - 2 };
    // Het pad van start naar doel, en wat er vanaf de start bereikbaar is zonder over een vakje te gaan.
    const pad = (() => {
      const van = new Map([[id(start.x, start.y), -1]]);
      const rij = [id(start.x, start.y)];
      while (rij.length) {
        const p = rij.shift();
        if (p === id(doel.x, doel.y)) break;
        for (let d = 0; d < 4; d++) {
          const q = p + DX[d] + DY[d] * size;
          if (!muur[q] && !van.has(q)) { van.set(q, p); rij.push(q); }
        }
      }
      const uit = [];
      for (let p = id(doel.x, doel.y); p !== -1; p = van.get(p)) uit.unshift(p);
      return uit;
    })();
    const bereik = (van, dicht) => {
      const zien = new Set([van]);
      const rij = [van];
      while (rij.length) {
        const p = rij.shift();
        for (let d = 0; d < 4; d++) {
          const q = p + DX[d] + DY[d] * size;
          if (!muur[q] && !zien.has(q) && !dicht.includes(q)) { zien.add(q); rij.push(q); }
        }
      }
      return zien;
    };
    const aantal = { page: 0, schildknaap: 1, ridder: 2 }[n] + (t >= 6 && n !== 'ridder' ? 1 : 0);
    const deuren = [];
    const sleutels = [];
    const KLEUR = ['goud', 'blauw', 'rood'];
    // Deuren op het pad, verspreid; elke sleutel ligt in het stuk vóór zijn deur, liefst ver van het pad.
    for (let i = 0; i < aantal; i++) {
      const plek = pad[Math.floor((pad.length * (i + 1)) / (aantal + 1))];
      deuren.push(plek);
    }
    for (let i = 0; i < aantal; i++) {
      const voor = bereik(id(start.x, start.y), deuren.slice(i));
      const opPad = new Set(pad);
      const kand = [...voor].filter(p => !opPad.has(p) && !sleutels.includes(p));
      const kies = kand.length ? kand[r.int(kand.length)] : [...voor].filter(p => p !== id(start.x, start.y) && !sleutels.includes(p))[0];
      sleutels.push(kies);
    }
    return {
      size,
      muren: muur.map(m => (m ? 1 : 0)).join(''),
      start,
      doel,
      deuren: deuren.map((p, i) => ({ x: p % size, y: Math.floor(p / size), k: KLEUR[i] })),
      sleutels: sleutels.map((p, i) => ({ x: p % size, y: Math.floor(p / size), k: KLEUR[i] })),
    };
  }

  // Een wandeling door het doolhof: elke stap N/O/Z/W. Geeft de plaats, de sleutels en of je bij het doel bent.
  function doolhofLoop(pz, stappen) {
    let { x, y } = pz.start;
    const heb = new Set();
    for (const s of stappen) {
      const d = 'NOZW'.indexOf(s);
      if (d < 0) return { x, y, heb, fout: true };
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (pz.muren[ny * pz.size + nx] !== '0') continue; // tegen een muur: blijf staan
      const deur = pz.deuren.find(q => q.x === nx && q.y === ny);
      if (deur && !heb.has(deur.k)) continue;
      x = nx;
      y = ny;
      const sl = pz.sleutels.find(q => q.x === x && q.y === y);
      if (sl) heb.add(sl.k);
    }
    return { x, y, heb, ok: x === pz.doel.x && y === pz.doel.y };
  }
  const checkDoolhof = (pz, poging) => typeof poging === 'string' && poging.length < 4000 && doolhofLoop(pz, poging).ok;

  // ---------- De Gouden Toren: rekenmuur ----------
  // Elke steen is de som van de twee stenen eronder. Vul de lege stenen in.

  function torenRijen(onder) {
    const rijen = [onder];
    while (rijen[0].length > 1) {
      const r0 = rijen[0];
      rijen.unshift(r0.slice(1).map((v, i) => r0[i] + v));
    }
    return rijen; // rijen[0] is de top
  }

  function torenOplosbaar(rijen, open) {
    // open: set van "rij,kol" die leeg zijn. Vul in met optellen en aftrekken, tot er niets meer bij komt.
    const k = new Set(open);
    let bezig = true;
    while (bezig && k.size) {
      bezig = false;
      for (let y = 0; y < rijen.length - 1; y++) for (let x = 0; x <= y; x++) {
        const a = `${y},${x}`;
        const b = `${y + 1},${x}`;
        const c = `${y + 1},${x + 1}`;
        const leeg = [a, b, c].filter(q => k.has(q));
        if (leeg.length === 1) { k.delete(leeg[0]); bezig = true; }
      }
    }
    return k.size === 0;
  }

  function maakToren(n, r) {
    const t = r.t || 0;
    const hoog = { page: 3, schildknaap: 4, ridder: 5 }[n] + (t >= 5 ? 1 : 0);
    const max = { page: 9, schildknaap: 15, ridder: 20 }[n] + t * 3;
    for (let poging = 0; poging < 200; poging++) {
      const onder = Array.from({ length: hoog }, () => 1 + r.int(max));
      const rijen = torenRijen(onder);
      const alle = [];
      for (let y = 0; y < hoog; y++) for (let x = 0; x <= y; x++) alle.push(`${y},${x}`);
      // Page: alleen optellen (onderste rij gegeven). Hoger: ook aftrekken nodig.
      const kandidaten = n === 'page' ? alle.filter(q => Number(q.split(',')[0]) < hoog - 1) : alle;
      const aantal = Math.min(kandidaten.length, { page: hoog === 3 ? 3 : 5, schildknaap: 5, ridder: 8 }[n] + Math.floor(t / 2));
      const open = r.shuffle(kandidaten).slice(0, aantal);
      if (n !== 'page' && !open.some(q => Number(q.split(',')[0]) === hoog - 1)) continue; // er moet ook onderaan iets ontbreken
      if (!torenOplosbaar(rijen, open)) continue;
      return { rijen: rijen.map((rij, y) => rij.map((v, x) => (open.includes(`${y},${x}`) ? null : v))) };
    }
    const rijen = torenRijen([1, 2, 3]);
    return { rijen: rijen.map((rij, y) => rij.map(v => (y === 0 ? null : v))) };
  }

  function checkToren(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.rijen.length) return false;
    const v = poging.map((rij, y) => (Array.isArray(rij) ? rij.map(Number) : []));
    for (let y = 0; y < pz.rijen.length; y++) {
      if (v[y].length !== y + 1) return false;
      for (let x = 0; x <= y; x++) {
        if (!Number.isInteger(v[y][x])) return false;
        if (pz.rijen[y][x] !== null && pz.rijen[y][x] !== v[y][x]) return false;
        if (y < pz.rijen.length - 1 && v[y][x] !== v[y + 1][x] + v[y + 1][x + 1]) return false;
      }
    }
    return true;
  }


  // ---------- Het IJsmeer: glijden over het ijs ----------
  // Je glijdt door tot je tegen een rots of de rand botst. Kom op het doel terecht (daar stop je ook).

  function ijsGlij(pz, x, y, d) {
    for (;;) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= pz.w || ny >= pz.h || pz.rotsen.includes(ny * pz.w + nx)) return { x, y };
      x = nx;
      y = ny;
      if (x === pz.doel.x && y === pz.doel.y) return { x, y };
    }
  }

  function ijsKortst(pz) {
    const k = (x, y) => y * pz.w + x;
    const afstand = new Map([[k(pz.start.x, pz.start.y), 0]]);
    const rij = [pz.start];
    while (rij.length) {
      const p = rij.shift();
      const a = afstand.get(k(p.x, p.y));
      if (p.x === pz.doel.x && p.y === pz.doel.y) return a;
      for (let d = 0; d < 4; d++) {
        const q = ijsGlij(pz, p.x, p.y, d);
        if (!afstand.has(k(q.x, q.y))) { afstand.set(k(q.x, q.y), a + 1); rij.push(q); }
      }
    }
    return -1;
  }

  function maakIjs(n, r) {
    const t = r.t || 0;
    const w = { page: 6, schildknaap: 8, ridder: 10 }[n] + Math.min(3, Math.floor(t / 3));
    const h = { page: 6, schildknaap: 7, ridder: 9 }[n] + Math.min(2, Math.floor(t / 4));
    const [lo, hi] = { page: [2, 4], schildknaap: [4, 7], ridder: [6, 12] }[n];
    const min = lo + Math.min(4, Math.floor(t / 3));
    let beste = null;
    for (let poging = 0; poging < 300; poging++) {
      const rotsen = [];
      const aantal = Math.round(w * h * (0.1 + r() * 0.08));
      for (let i = 0; i < aantal; i++) rotsen.push(r.int(w * h));
      const vrij = [...Array(w * h).keys()].filter(i => !rotsen.includes(i));
      const a = r.pick(vrij);
      const b = r.pick(vrij);
      if (a === b) continue;
      const pz = { w, h, rotsen: [...new Set(rotsen)], start: { x: a % w, y: Math.floor(a / w) }, doel: { x: b % w, y: Math.floor(b / w) } };
      const k = ijsKortst(pz);
      if (k < 0) continue;
      if (k >= min && k <= hi + Math.floor(t / 2)) return { ...pz, zetten: k };
      if (k > 0 && (!beste || Math.abs(k - min) < Math.abs(beste.zetten - min))) beste = { ...pz, zetten: k };
    }
    return beste || { w: 3, h: 3, rotsen: [], start: { x: 0, y: 0 }, doel: { x: 2, y: 0 }, zetten: 1 };
  }

  function ijsLoop(pz, stappen) {
    let { x, y } = pz.start;
    for (const s of stappen) {
      const d = 'NOZW'.indexOf(s);
      if (d < 0) return { x, y, fout: true };
      ({ x, y } = ijsGlij(pz, x, y, d));
    }
    return { x, y, ok: x === pz.doel.x && y === pz.doel.y };
  }
  const checkIjs = (pz, poging) => typeof poging === 'string' && poging.length < 500 && ijsLoop(pz, poging).ok;

  // ---------- De Klokkentoren: klok lezen ----------
  // Een wijzerklok en vier antwoorden. Het juiste antwoord (opl) blijft op de server.

  const uurTekst = (u, m) => `${u}:${String(m).padStart(2, '0')}`;

  function eenKlok(n, r) {
    const t = r.t || 0;
    const stap = n === 'page' ? (t >= 4 ? 15 : 30) : n === 'schildknaap' ? (t >= 4 ? 5 : 15) : 5;
    let u = 1 + r.int(12);
    const m = stap * r.int(60 / stap);
    let vraag;
    let juist;
    let fout = [];
    if (n === 'page' || (n === 'schildknaap' && r() < 0.5)) {
      vraag = 'Hoe laat is het?';
      juist = uurTekst(u, m);
      // fouten: uur en minuten verwisseld, een uur ernaast, de wijzers omgekeerd
      fout = [uurTekst(u % 12 + 1, m), uurTekst(u === 1 ? 12 : u - 1, m), uurTekst(u, (m + 30) % 60), uurTekst(Math.max(1, Math.round(m / 5)) || 12, (u * 5) % 60)];
    } else if (n === 'schildknaap') {
      const erbij = [15, 30, 45, 20, 10][r.int(t >= 3 ? 5 : 3)];
      const tm = (u * 60 + m + erbij) % 720;
      vraag = `Hoe laat is het over ${erbij} minuten?`;
      juist = uurTekst(Math.floor(tm / 60) || 12, tm % 60);
      fout = [uurTekst(u, (m + erbij) % 60), uurTekst(Math.floor(((u * 60 + m - erbij + 720) % 720) / 60) || 12, (m - erbij + 60) % 60), uurTekst((Math.floor(tm / 60) % 12) + 1, tm % 60)];
    } else {
      // Ridder: hoeveel minuten tot een ander uur, of het uur 's avonds in 24 uur.
      if (r() < 0.5) {
        const tot = [u * 60 + m + 35 + 5 * r.int(10 + t)];
        const d = tot[0] - (u * 60 + m);
        const tu = Math.floor(tot[0] / 60);
        vraag = `Hoeveel minuten duurt het tot ${uurTekst(tu > 12 ? tu - 12 : tu, tot[0] % 60)}?`;
        juist = `${d} min`;
        fout = [`${d + 10} min`, `${d - 5} min`, `${d + 60} min`, `${Math.max(5, d - 15)} min`];
      } else {
        if (u > 10) u -= 4; // 11 en 12 uur 's avonds zijn verwarrend
        vraag = 'Het is avond. Hoe schrijf je dit uur met 24 uren?';
        juist = uurTekst(u + 12, m);
        fout = [uurTekst(u, m), uurTekst(u + 10, m), uurTekst(u + 2, m), uurTekst(u + 11, m)];
      }
    }
    const uniek = [...new Set(fout)].filter(x => x !== juist).slice(0, 3);
    // Altijd vier keuzes: vul aan met tijden een kwartier of een uur ernaast.
    for (let k = 1; uniek.length < 3 && k < 40; k++) {
      const tm = ((u * 60 + m + (k % 2 ? 1 : -1) * 15 * Math.ceil(k / 2)) % 720 + 720) % 720;
      const x = juist.endsWith('min') ? `${parseInt(juist, 10) + 5 * k} min` : uurTekst(Math.floor(tm / 60) || 12, tm % 60);
      if (x !== juist && !uniek.includes(x)) uniek.push(x);
    }
    const opties = r.shuffle([juist, ...uniek]);
    return { uur: u, min: m, vraag, opties, opl: opties.indexOf(juist) };
  }
  // Een paar klokken na elkaar: pas alles juist is het raadsel opgelost (zo helpt gokken niet).
  function maakKlok(n, r) {
    const aantal = (n === 'ridder' ? 4 : 3) + ((r.t || 0) >= 4 ? 1 : 0);
    const klokken = Array.from({ length: aantal }, () => eenKlok(n, r));
    return { klokken: klokken.map(({ opl, ...k }) => k), opl: klokken.map(k => k.opl) };
  }
  const checkKlok = (pz, poging) => Array.isArray(poging) && poging.length === pz.opl.length && poging.every((x, i) => Number(x) === pz.opl[i]);

  // ---------- Het IJsbeeld: symmetrie ----------
  // Maak de tekening af in de spiegel. Ridder: spiegel naar rechts én naar onder.

  function maakSpiegel(n, r) {
    const t = r.t || 0;
    const half = { page: 3, schildknaap: 4, ridder: 3 }[n] + Math.min(2, Math.floor(t / 3));
    const h = { page: 5, schildknaap: 6, ridder: 3 }[n] + Math.min(2, Math.floor(t / 3));
    const dubbel = n === 'ridder';
    const vol = 0.45;
    const kwart = Array.from({ length: h * half }, () => (r() < vol ? 1 : 0));
    if (!kwart.some(Boolean)) kwart[0] = 1;
    return { half, h, dubbel, kwart };
  }

  // Het volledige veld volgens de spiegel (breedte 2*half, hoogte h of 2*h).
  function spiegelVeld(pz) {
    const W = pz.half * 2;
    const H = pz.dubbel ? pz.h * 2 : pz.h;
    const v = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const kx = x < pz.half ? x : W - 1 - x;
      const ky = y < pz.h ? y : H - 1 - y;
      v.push(pz.kwart[ky * pz.half + kx]);
    }
    return { W, H, v };
  }
  function checkSpiegel(pz, poging) {
    const { v } = spiegelVeld(pz);
    return Array.isArray(poging) && poging.length === v.length && poging.every((x, i) => (x ? 1 : 0) === v[i]);
  }

  // ---------- De Lavapoort: het codeslot ----------
  // Aanwijzingen over gokjes ("1 cijfer juist en op de juiste plaats") leiden naar één code.

  function slotHint(code, gok) {
    let plek = 0;
    let ander = 0;
    const rest = { c: [], g: [] };
    for (let i = 0; i < code.length; i++) {
      if (code[i] === gok[i]) plek++;
      else { rest.c.push(code[i]); rest.g.push(gok[i]); }
    }
    for (const x of rest.g) {
      const j = rest.c.indexOf(x);
      if (j >= 0) { ander++; rest.c.splice(j, 1); }
    }
    return [plek, ander];
  }

  function maakSlot(n, r) {
    const t = r.t || 0;
    const len = n === 'ridder' || (n === 'schildknaap' && t >= 6) ? 4 : 3;
    const cijfers = n === 'page' ? 6 : 10; // page: alleen 1 tot 6
    const van = n === 'page' ? 1 : 0;
    const alle = [];
    const maakAlle = (pre) => {
      if (pre.length === len) return alle.push(pre);
      for (let c = van; c < van + cijfers; c++) if (n === 'ridder' || !pre.includes(String(c))) maakAlle(pre + c);
    };
    maakAlle('');
    for (let poging = 0; poging < 30; poging++) {
      const code = r.pick(alle);
      const hints = [];
      let kand = alle.slice();
      for (let i = 0; i < 12 && kand.length > 1; i++) {
        // een gok die zoveel mogelijk codes uitsluit, met een beetje toeval
        let best = null;
        for (let k = 0; k < 25; k++) {
          const gok = r.pick(alle);
          const h = slotHint(code, gok);
          if (h[0] === len) continue;
          const over = kand.filter(c => { const x = slotHint(c, gok); return x[0] === h[0] && x[1] === h[1]; }).length;
          if (!best || over < best.over) best = { gok, h, over };
        }
        if (!best) continue;
        hints.push({ gok: best.gok, plek: best.h[0], ander: best.h[1] });
        kand = kand.filter(c => { const x = slotHint(c, best.gok); return x[0] === best.h[0] && x[1] === best.h[1]; });
      }
      const max = { page: 5, schildknaap: 6, ridder: 7 }[n];
      if (kand.length === 1 && hints.length <= max) return { len, van, tot: van + cijfers - 1, uniek: n !== 'ridder', hints };
    }
    return { len: 3, van: 1, tot: 6, uniek: true, hints: [{ gok: '123', plek: 3, ander: 0 }] };
  }

  function checkSlot(pz, poging) {
    const p = String(poging || '');
    if (p.length !== pz.len || !/^\d+$/.test(p)) return false;
    return pz.hints.every(h => { const x = slotHint(p, h.gok); return x[0] === h.plek && x[1] === h.ander; });
  }

  // ---------- De Vuurkristallen: lampen aan ----------
  // Tik op een kristal: hij en zijn buren wisselen (aan wordt uit, uit wordt aan). Zet ze allemaal aan.

  function lampenTik(aan, size, i) {
    const x = i % size;
    const y = Math.floor(i / size);
    const uit = aan.slice();
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size) uit[ny * size + nx] = !uit[ny * size + nx];
    }
    return uit;
  }

  function maakLampen(n, r) {
    const t = r.t || 0;
    const size = { page: 3, schildknaap: 4, ridder: 5 }[n] + (t >= 6 && n !== 'ridder' ? 1 : 0);
    const tikken = { page: 2, schildknaap: 4, ridder: 6 }[n] + Math.min(5, Math.floor(t / 2));
    for (let poging = 0; poging < 50; poging++) {
      let aan = Array(size * size).fill(true);
      const gekozen = r.shuffle([...aan.keys()]).slice(0, Math.min(tikken, size * size - 1));
      for (const i of gekozen) aan = lampenTik(aan, size, i);
      if (aan.every(Boolean)) continue;
      return { size, aan: aan.map(x => (x ? 1 : 0)), min: gekozen.length };
    }
    return { size: 3, aan: [1, 0, 1, 0, 0, 0, 1, 0, 1], min: 1 };
  }
  function checkLampen(pz, poging) {
    if (!Array.isArray(poging) || poging.length > 400) return false;
    let aan = pz.aan.map(Boolean);
    for (const i of poging) {
      const k = Number(i);
      if (!Number.isInteger(k) || k < 0 || k >= aan.length) return false;
      aan = lampenTik(aan, pz.size, k);
    }
    return aan.every(Boolean);
  }

  // ---------- De Vuurtoren: de torens van Hanoi ----------
  // Verplaats de hele stapel naar de laatste paal. Nooit een grote schijf op een kleinere.

  function maakHanoi(n, r) {
    const t = r.t || 0;
    const schijven = { page: 3, schildknaap: 4, ridder: 5 }[n] + (t >= 5 ? 1 : 0) + (t >= 12 ? 1 : 0);
    return { schijven: Math.min(7, schijven), min: 2 ** Math.min(7, schijven) - 1, kleur: r.int(3) };
  }

  function hanoiLoop(pz, zetten) {
    const palen = [[...Array(pz.schijven).keys()].map(i => pz.schijven - i), [], []];
    for (const z of zetten) {
      const [a, b] = Array.isArray(z) ? z.map(Number) : [-1, -1];
      if (![0, 1, 2].includes(a) || ![0, 1, 2].includes(b) || a === b || !palen[a].length) return { palen, fout: true };
      const s = palen[a][palen[a].length - 1];
      if (palen[b].length && palen[b][palen[b].length - 1] < s) return { palen, fout: true };
      palen[b].push(palen[a].pop());
    }
    return { palen, ok: palen[2].length === pz.schijven };
  }
  const checkHanoi = (pz, poging) => Array.isArray(poging) && poging.length < 2000 && hanoiLoop(pz, poging).ok;

  // ---------- Koraalrif: de parelschelp (breuken) ----------
  // Kleur een breuk in een of meer taarten. Schildknaap: de taart heeft meer stukjes dan de noemer.

  function maakBreuk(n, r) {
    const t = r.t || 0;
    const noemers = { page: [2, 3, 4, 5, 6, 8], schildknaap: [2, 3, 4, 5, 6], ridder: [3, 4, 5, 6, 8] }[n];
    const noemer = r.pick(noemers);
    let maal = 1;
    if (n === 'schildknaap' || (n === 'ridder' && r() < 0.5) || t >= 6) maal = r.pick(noemer <= 4 ? [2, 3] : [2]);
    const delen = noemer * maal;
    // Ridder: soms meer dan één hele taart (een gemengd getal).
    const taarten = n === 'ridder' || (n === 'schildknaap' && t >= 4) ? 2 : 1;
    const max = taarten * noemer - 1;
    const teller = 1 + r.int(max);
    return { vorm: r.pick(['rond', 'vierkant']), taarten, delen, teller, noemer, nodig: (teller * delen) / noemer };
  }
  const checkBreuk = (pz, poging) => Array.isArray(poging) && new Set(poging.map(Number)).size === poging.length
    && poging.every(i => Number.isInteger(Number(i)) && i >= 0 && i < pz.taarten * pz.delen) && poging.length === pz.nodig;

  // ---------- Koraalrif: het wrak (geld) ----------
  // Betaal precies met munten en briefjes. Schildknaap: met zo weinig mogelijk. Ridder: geef wisselgeld terug.

  const GELD = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  function minMunten(bedrag) {
    let n = 0;
    for (const g of GELD.slice().reverse()) { n += Math.floor(bedrag / g); bedrag %= g; }
    return n;
  }
  function maakMunten(n, r) {
    const t = r.t || 0;
    if (n === 'ridder') {
      const prijs = 105 + 5 * r.int(t >= 4 ? 380 : 180);
      const betaal = GELD.find(g => g >= prijs && g >= 500 && g > prijs) || 5000;
      return { soort: 'terug', prijs, betaal, bedrag: betaal - prijs, max: minMunten(betaal - prijs), geld: GELD };
    }
    const bedrag = n === 'page' ? 5 + 5 * r.int(t >= 4 ? 39 : 19) : 23 + r.int(t >= 4 ? 1900 : 480);
    return { soort: 'betaal', bedrag, max: n === 'schildknaap' ? minMunten(bedrag) + (t >= 3 ? 0 : 1) : 0, geld: n === 'page' ? GELD.filter(g => g >= 5 && g <= 200) : GELD };
  }
  function checkMunten(pz, poging) {
    if (!Array.isArray(poging) || poging.length > 60 || !poging.every(g => pz.geld.includes(Number(g)))) return false;
    const som = poging.reduce((a, g) => a + Number(g), 0);
    return som === pz.bedrag && (!pz.max || poging.length <= pz.max);
  }

  // ---------- Koraalrif: de schatkaart (coördinaten) ----------
  // Page: tik het vakje (C4). Schildknaap: volg de route. Ridder: een assenstelsel met negatieve getallen.

  function maakCoord(n, r) {
    const t = r.t || 0;
    const aantal = 3 + (t >= 4 ? 1 : 0);
    const vragen = [];
    const opl = [];
    if (n === 'ridder') {
      const R = 4 + (t >= 6 ? 1 : 0);
      for (let i = 0; i < aantal; i++) {
        let x;
        let y;
        do { x = r.int(2 * R + 1) - R; y = r.int(2 * R + 1) - R; } while (!x || !y);
        vragen.push({ tekst: `Tik op het punt (${x}, ${y}).` });
        opl.push([x + R, R - y]);
      }
      return { assen: true, size: 2 * R + 1, R, vragen, opl };
    }
    const size = n === 'page' ? 6 : 8;
    const L = 'ABCDEFGH';
    for (let i = 0; i < aantal; i++) {
      const x = r.int(size);
      const y = r.int(size);
      if (n === 'page') { vragen.push({ tekst: `Tik op ${L[x]}${y + 1}.` }); opl.push([x, y]); continue; }
      // een route: start op een vakje en volg de stappen
      let px = x;
      let py = y;
      const stappen = [];
      for (let k = 0; k < 2 + (t >= 3 ? 1 : 0); k++) {
        const opties = [];
        for (let d = 1; d <= 4; d++) {
          if (px + d < size) opties.push(['naar rechts', d, 0]);
          if (px - d >= 0) opties.push(['naar links', -d, 0]);
          if (py + d < size) opties.push(['naar boven', 0, d]);
          if (py - d >= 0) opties.push(['naar onder', 0, -d]);
        }
        const [w, dx, dy] = r.pick(opties);
        stappen.push(`${Math.abs(dx || dy)} ${w}`);
        px += dx;
        py += dy;
      }
      vragen.push({ tekst: `Start op ${L[x]}${y + 1}, ga ${stappen.join(', dan ')}. Waar kom je uit?` });
      opl.push([px, py]);
    }
    return { assen: false, size, vragen, opl };
  }
  const checkCoord = (pz, poging) => Array.isArray(poging) && poging.length === pz.opl.length
    && poging.every((p, i) => Array.isArray(p) && Number(p[0]) === pz.opl[i][0] && Number(p[1]) === pz.opl[i][1]);

  // ---------- Wolkenstad: de wolkentoren (blokjes tellen) ----------
  // Een stapel blokjes in 3D. Naar achter worden de torens nooit lager, zodat je alles kan zien.

  function maakKubus(n, r) {
    const t = r.t || 0;
    const w = { page: 2, schildknaap: 3, ridder: 3 }[n] + (t >= 5 ? 1 : 0);
    const d = { page: 2, schildknaap: 3, ridder: 4 }[n];
    const max = { page: 2, schildknaap: 3, ridder: 4 }[n] + (t >= 3 ? 1 : 0);
    // hoogte[y][x], y = 0 achteraan; voor kan nooit hoger dan achter en links nooit lager dan rechts
    const h = [];
    for (let y = 0; y < d; y++) {
      h.push([]);
      for (let x = 0; x < w; x++) {
        const achter = y ? h[y - 1][x] : max;
        const links = x ? h[y][x - 1] : max;
        h[y].push(Math.max(0, Math.min(achter, links) - r.int(3)));
      }
    }
    if (!h[0][0]) h[0][0] = 1;
    const som = h.flat().reduce((a, b) => a + b, 0);
    const vol = Math.max(w, d, max);
    const vraag = n === 'ridder' && r() < 0.5 ? 'kubus' : 'tel';
    return { w, d, h, vraag, kubus: vol, opl: vraag === 'kubus' ? vol ** 3 - som : som };
  }
  const checkKubus = (pz, poging) => Number(poging) === pz.opl;

  // ---------- Wolkenstad: het windorgel (magisch vierkant) ----------
  // Elke rij, kolom en schuine lijn heeft dezelfde som.

  function maakMagisch(n, r) {
    const t = r.t || 0;
    const loShu = [2, 7, 6, 9, 5, 1, 4, 3, 8];
    const m = n === 'page' ? 1 : 1 + r.int(n === 'ridder' ? 4 : 2);
    const k = n === 'page' ? r.int(5) : r.int(n === 'ridder' ? 40 : 15);
    let v = loShu.map(x => x * m + k);
    const draai = g => [6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => g[i]);
    for (let i = r.int(4); i > 0; i--) v = draai(v);
    if (r() < 0.5) v = [2, 1, 0, 5, 4, 3, 8, 7, 6].map(i => v[i]);
    const leeg = { page: 3, schildknaap: 5, ridder: 6 }[n] + (t >= 4 ? 1 : 0);
    const som = 15 * m + 3 * k;
    // Alleen vierkanten die je stap voor stap kan oplossen (telkens een lijn met één leeg vakje).
    for (let poging = 0; poging < 200; poging++) {
      const weg = new Set(r.shuffle([...Array(9).keys()]).slice(0, Math.min(7, leeg)));
      const gegeven = v.map((x, i) => (weg.has(i) ? null : x));
      if (magischVul(gegeven, som, n === 'ridder')) return { som, gegeven, toonSom: true };
    }
    return { som, gegeven: v.map((x, i) => (i % 2 ? null : x)), toonSom: true };
  }
  const MAGISCH_LIJNEN = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  // Vul lijnen met één leeg vakje aan; de Ridder mag ook weten dat het midden een derde van de som is.
  function magischVul(gegeven, som, midden) {
    const v = gegeven.slice();
    if (midden && v[4] === null) v[4] = som / 3;
    for (let ok = true; ok;) {
      ok = false;
      for (const l of MAGISCH_LIJNEN) {
        const leeg = l.filter(i => v[i] === null);
        if (leeg.length === 1) { v[leeg[0]] = som - l.reduce((a, i) => a + (v[i] || 0), 0); ok = true; }
      }
    }
    return !v.includes(null);
  }
  function checkMagisch(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== 9) return false;
    const v = poging.map(Number);
    if (v.some((x, i) => !Number.isInteger(x) || (pz.gegeven[i] !== null && x !== pz.gegeven[i]))) return false;
    const lijnen = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    return lijnen.every(l => l.reduce((a, i) => a + v[i], 0) === pz.som);
  }

  // ---------- Wolkenstad: de luchthaven (kortste route) ----------
  // Wolkeneilandjes met bruggen; elke brug heeft een lengte. Zoek de kortste weg van start naar doel.

  function routeKort(pz, van, naar) {
    const afst = pz.punten.map(() => Infinity);
    afst[van] = 0;
    const klaar = new Set();
    while (klaar.size < pz.punten.length) {
      let u = -1;
      afst.forEach((a, i) => { if (!klaar.has(i) && (u < 0 || a < afst[u])) u = i; });
      if (afst[u] === Infinity) break;
      klaar.add(u);
      for (const [a, b, l] of pz.bruggen) {
        if (a === u && afst[u] + l < afst[b]) afst[b] = afst[u] + l;
        if (b === u && afst[u] + l < afst[a]) afst[a] = afst[u] + l;
      }
    }
    return afst[naar];
  }
  function maakRoute(n, r) {
    const t = r.t || 0;
    const [kol, rij] = { page: [3, 2], schildknaap: [4, 3], ridder: [5, 3] }[n];
    const extra = t >= 5 ? 1 : 0;
    for (let poging = 0; poging < 100; poging++) {
      const punten = [];
      for (let y = 0; y < rij + extra; y++) for (let x = 0; x < kol; x++) punten.push([x + (r() - 0.5) * 0.4, y + (r() - 0.5) * 0.4]);
      const id = (x, y) => y * kol + x;
      const bruggen = [];
      const maxL = n === 'page' ? 9 : n === 'schildknaap' ? 15 : 30;
      for (let y = 0; y < rij + extra; y++) for (let x = 0; x < kol; x++) {
        if (x + 1 < kol && r() < 0.8) bruggen.push([id(x, y), id(x + 1, y), 1 + r.int(maxL)]);
        if (y + 1 < rij + extra && r() < 0.7) bruggen.push([id(x, y), id(x, y + 1), 1 + r.int(maxL)]);
        if (n !== 'page' && x + 1 < kol && y + 1 < rij + extra && r() < 0.25) bruggen.push([id(x, y), id(x + 1, y + 1), 1 + r.int(maxL)]);
      }
      const start = id(0, r.int(rij + extra));
      const doel = id(kol - 1, r.int(rij + extra));
      const pz = { punten, bruggen, start, doel };
      const kort = routeKort(pz, start, doel);
      if (kort === Infinity) continue;
      return { ...pz, kort };
    }
    return { punten: [[0, 0], [1, 0]], bruggen: [[0, 1, 3]], start: 0, doel: 1, kort: 3 };
  }
  function routeLengte(pz, pad) {
    let l = 0;
    for (let i = 1; i < pad.length; i++) {
      const a = Number(pad[i - 1]);
      const b = Number(pad[i]);
      const br = pz.bruggen.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
      if (!br) return Infinity;
      l += br[2];
    }
    return l;
  }
  const checkRoute = (pz, poging) => Array.isArray(poging) && poging.length < 60 && Number(poging[0]) === pz.start
    && Number(poging[poging.length - 1]) === pz.doel && routeLengte(pz, poging) === pz.kort;

  // ---------- Onderzeelab: zinken of drijven ----------

  const DRIJVEN = {
    page: [['kurk', 1], ['sleutel', 0], ['houten blok', 1], ['steen', 0], ['plastic eendje', 1], ['munt', 0], ['ballon', 1], ['schaar', 0], ['blad van een boom', 1], ['spijker', 0], ['pingpongbal', 1], ['knikker', 0]],
    schildknaap: [['appel', 1], ['ijsblokje', 1], ['kaars', 1], ['aardappel', 0], ['lege fles met dop', 1], ['volle fles water', 0], ['potlood', 1], ['paperclip', 0], ['spons', 1], ['ring', 0], ['tak', 1], ['lepel', 0]],
    ridder: [['vers ei', 0], ['ei in heel zout water', 1], ['stalen schip', 1], ['bolletje klei', 0], ['bootje van klei', 1], ['druif', 0], ['sinaasappel met schil', 1], ['sinaasappel zonder schil', 0], ['blikje cola', 0], ['blikje cola light', 1], ['baksteen', 0], ['puimsteen', 1]],
  };
  function maakDrijven(n, r) {
    const t = r.t || 0;
    const aantal = { page: 4, schildknaap: 6, ridder: 6 }[n] + Math.min(2, Math.floor(t / 3));
    const lijst = r.shuffle(DRIJVEN[n]).slice(0, aantal);
    return { dingen: lijst.map(x => x[0]), opl: lijst.map(x => x[1]) };
  }
  const checkDrijven = (pz, poging) => Array.isArray(poging) && poging.length === pz.opl.length && poging.every((x, i) => (x ? 1 : 0) === pz.opl[i]);

  // ---------- Weerstation: de thermometer ----------

  function maakThermo(n, r) {
    const t = r.t || 0;
    const stap = { page: 1, schildknaap: 2, ridder: 2 }[n] * (t >= 4 && n !== 'page' ? 1 : 1);
    const min = n === 'page' ? 0 : -20;
    const max = n === 'page' ? 30 : 40;
    const temp = () => min + stap * r.int((max - min) / stap + 1);
    const a = n === 'page' ? 2 + r.int(28) : temp();
    if (n === 'ridder' && r() < 0.6) {
      let b = temp();
      while (b === a) b = temp();
      return { min, max, stap, temps: [a, b], vraag: 'verschil', opl: Math.abs(a - b) };
    }
    return { min, max, stap, temps: [a], vraag: 'lees', opl: a };
  }
  const checkThermo = (pz, poging) => Number(poging) === pz.opl;

  // ---------- Mijnen: de mijnkar (tafels) ----------
  // Een rij sommen na elkaar. Pas als alles juist is, rijdt de mijnkar.

  function maakTafels(n, r) {
    const t = r.t || 0;
    const aantal = 6 + (t >= 3 ? 2 : 0) + (t >= 8 ? 2 : 0);
    const sommen = [];
    const opl = [];
    for (let i = 0; i < aantal; i++) {
      let a;
      let b;
      if (n === 'page') {
        a = r.pick([1, 2, 3, 4, 5, 10].concat(t >= 4 ? [6, 7, 8, 9] : []));
        b = 1 + r.int(10);
        sommen.push(`${a} × ${b}`);
        opl.push(a * b);
      } else if (n === 'schildknaap' || r() < 0.5) {
        a = 2 + r.int(9);
        b = 1 + r.int(10);
        if (r() < 0.5) { sommen.push(`${a} × ${b}`); opl.push(a * b); } else { sommen.push(`${a * b} : ${a}`); opl.push(b); }
      } else {
        a = 2 + r.int(11);
        b = 2 + r.int(9);
        const nul = r.pick([10, 100]);
        if (r() < 0.5) { sommen.push(`${a} × ${b * nul}`); opl.push(a * b * nul); } else { sommen.push(`${a * b * nul} : ${a}`); opl.push(b * nul); }
      }
    }
    return { vragen: sommen.map(s => `${s} =`), opl };
  }
  const checkRij = (pz, poging) => Array.isArray(poging) && poging.length === pz.opl.length
    && poging.every((x, i) => Math.abs(Number(String(x).replace(',', '.')) - pz.opl[i]) < 1e-9);

  // ---------- Mijnen: het mijnspoor (getallenlijn) ----------

  function maakLijn(n, r) {
    const t = r.t || 0;
    const vragen = [];
    for (let i = 0; i < 3; i++) {
      let van = 0;
      let tot;
      let stap;
      let doel;
      if (n === 'page') {
        tot = t >= 4 ? 100 : 20;
        stap = tot === 20 ? 1 : 10;
        doel = 1 + r.int(tot - 1);
      } else if (n === 'schildknaap') {
        tot = r.pick(t >= 4 ? [1000, 10000] : [100, 1000]);
        stap = tot / 10;
        doel = (1 + r.int(99)) * (tot / 100);
      } else if (r() < 0.5) {
        van = -10;
        tot = 10;
        stap = 1;
        doel = r.int(19) - 9;
      } else {
        tot = r.pick([1, 10]);
        stap = tot / 10;
        doel = tot === 1 ? (1 + r.int(99)) / 100 : (1 + r.int(99)) / 10;
      }
      vragen.push({ van, tot, stap, doel });
    }
    return { vragen };
  }
  // Je mag er een beetje naast tikken: 2 procent van de lijn (de page iets ruimer).
  const lijnMarge = q => (q.tot - q.van) * (q.stap === 1 && q.tot <= 20 ? 0.03 : 0.02);
  const checkLijn = (pz, poging) => Array.isArray(poging) && poging.length === pz.vragen.length
    && poging.every((x, i) => Math.abs(Number(x) - pz.vragen[i].doel) <= lijnMarge(pz.vragen[i]) + 1e-9);

  // ---------- Mijnen: de edelsteenwand (patronen) ----------
  // De stenen volgen een vast patroon dat elke rij een stukje opschuift. Vul de gaten.

  function maakPatroon(n, r) {
    const t = r.t || 0;
    const [rij, kol] = { page: [3, 6], schildknaap: [4, 7], ridder: [5, 8] }[n];
    const p = { page: 2 + r.int(2), schildknaap: 3 + r.int(2), ridder: 4 + r.int(2) }[n] + (t >= 6 ? 1 : 0);
    const kleuren = Math.min(p, { page: 3, schildknaap: 4, ridder: 5 }[n]);
    const reeks = [];
    for (let i = 0; i < p; i++) reeks.push(i < kleuren ? i : r.int(kleuren));
    const rij0 = r.shuffle(reeks);
    if (new Set(rij0).size < 2) rij0[0] = (rij0[1] + 1) % kleuren;
    const schuif = n === 'page' ? 0 : 1 + r.int(p - 1);
    const v = [];
    for (let y = 0; y < rij; y++) for (let x = 0; x < kol; x++) v.push(rij0[(x + schuif * y) % p]);
    const leeg = { page: 4, schildknaap: 6, ridder: 9 }[n] + Math.min(4, Math.floor(t / 2));
    // nooit de hele eerste rij weg, anders zie je het patroon niet meer
    const kan = [...v.keys()].filter(i => i >= Math.min(p, kol));
    const gaten = r.shuffle(kan).slice(0, leeg).sort((a, b) => a - b);
    return { rij, kol, kleuren, gaten, v: v.map((c, i) => (gaten.includes(i) ? null : c)), opl: gaten.map(i => v[i]) };
  }
  const checkPatroon = (pz, poging) => Array.isArray(poging) && poging.length === pz.opl.length && poging.every((c, i) => Number(c) === pz.opl[i]);

  // ---------- Maanbasis: het maanlab (maten herleiden) ----------

  function maakEenheden(n, r) {
    const t = r.t || 0;
    const aantal = 4 + (t >= 4 ? 2 : 0);
    const vragen = [];
    const opl = [];
    const kom = x => String(Math.round(x * 1000) / 1000).replace('.', ',');
    const PAAR = [['m', 'cm', 100], ['kg', 'g', 1000], ['l', 'ml', 1000], ['km', 'm', 1000], ['m', 'mm', 1000], ['l', 'cl', 100], ['cm', 'mm', 10], ['u', 'min', 60]];
    for (let i = 0; i < aantal; i++) {
      const [groot, klein, f] = r.pick(n === 'page' ? PAAR.slice(0, 4) : PAAR);
      if (n === 'page') {
        const a = 1 + r.int(9);
        if (r() < 0.5) { vragen.push(`${a} ${groot} = ? ${klein}`); opl.push(a * f); } else { vragen.push(`${a * f} ${klein} = ? ${groot}`); opl.push(a); }
      } else if (n === 'schildknaap') {
        const a = f === 60 ? 1 + r.int(4) + r.pick([0, 0.5]) : (1 + r.int(40)) / (f >= 100 ? 4 : 2);
        if (r() < 0.5) { vragen.push(`${kom(a)} ${groot} = ? ${klein}`); opl.push(Math.round(a * f * 1000) / 1000); } else { vragen.push(`${kom(a * f)} ${klein} = ? ${groot}`); opl.push(a); }
      } else {
        const a = 1 + r.int(9);
        const b = 1 + r.int(f - 1);
        if (f === 60 || r() < 0.5) { vragen.push(`${a} ${groot} ${b} ${klein} = ? ${klein}`); opl.push(a * f + b); }
        else { vragen.push(`${kom(a * f + b)} ${klein} = ? ${groot}`); opl.push(Math.round(((a * f + b) / f) * 1000) / 1000); }
      }
    }
    return { vragen, opl };
  }

  // ---------- Maanbasis: de koepelbouw (oppervlakte en omtrek) ----------

  function maakOpp(n, r) {
    const t = r.t || 0;
    if (n === 'ridder') {
      // een L-vorm met maten
      const A = 6 + r.int(7 + t);
      const B = 5 + r.int(6 + t);
      const a = 2 + r.int(A - 3);
      const b = 2 + r.int(B - 3);
      const vraag = r() < 0.5 ? 'opp' : 'omtrek';
      return { soort: 'L', A, B, a, b, vraag, opl: vraag === 'opp' ? A * B - a * b : 2 * (A + B) };
    }
    const W = 6;
    const H = 5;
    const groot = { page: 5, schildknaap: 6 }[n] + r.int(4) + Math.min(4, Math.floor(t / 2));
    const cel = new Set([Math.floor(H / 2) * W + Math.floor(W / 2)]);
    while (cel.size < groot) {
      const c = r.pick([...cel]);
      const x = c % W;
      const y = Math.floor(c / W);
      const d = r.int(4);
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) cel.add(ny * W + nx);
    }
    const lijst = [...cel].sort((a, b) => a - b);
    const vraag = n === 'page' && t < 5 ? 'opp' : r() < 0.6 ? 'omtrek' : 'opp';
    let omtrek = 0;
    for (const c of lijst) for (let d = 0; d < 4; d++) {
      const nx = (c % W) + DX[d];
      const ny = Math.floor(c / W) + DY[d];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !cel.has(ny * W + nx)) omtrek++;
    }
    return { soort: 'raster', W, H, cellen: lijst, vraag, opl: vraag === 'opp' ? lijst.length : omtrek };
  }

  // ---------- Maanbasis: de sterrenkijker (verbind de sterren) ----------

  function maakSterren(n, r) {
    const t = r.t || 0;
    const aantal = { page: 7, schildknaap: 9, ridder: 10 }[n] + Math.min(4, Math.floor(t / 2));
    let start;
    let stap;
    if (n === 'page') { start = 1 + r.int(t >= 3 ? 30 : 10); stap = t >= 3 ? r.pick([1, 2, 10]) : 1; }
    else if (n === 'schildknaap') { stap = 3 + r.int(7); start = stap; }
    else if (r() < 0.5) { stap = r.pick([0.5, 0.25, 0.1]); start = 0; }
    else { stap = r.pick([2, 3, 5]); start = -stap * (2 + r.int(3)); }
    const getallen = Array.from({ length: aantal }, (_, i) => Math.round((start + i * stap) * 100) / 100);
    const tekst = getallen.map(x => String(x).replace('.', ','));
    // posities: willekeurig, maar niet te dicht bij elkaar
    const pos = [];
    for (let i = 0; i < aantal; i++) {
      let p;
      for (let k = 0; k < 200; k++) {
        p = [0.08 + r() * 0.84, 0.1 + r() * 0.8];
        if (pos.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.17)) break;
      }
      pos.push(p);
    }
    const volgorde = r.shuffle([...Array(aantal).keys()]); // volgorde[i] = welk getal ster i draagt
    return { sterren: volgorde.map((g, i) => ({ x: pos[i][0], y: pos[i][1], t: tekst[g], g: getallen[g] })) };
  }
  // Tik de sterren aan van klein naar groot.
  function checkSterren(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.sterren.length || new Set(poging).size !== poging.length) return false;
    return poging.every((i, k) => pz.sterren[i] && (!k || pz.sterren[i].g > pz.sterren[poging[k - 1]].g));
  }

  // ---------- Cyberstad: de datatoren (binaire lampjes) ----------
  // Elk lampje is een getal waard (1, 2, 4, 8...). Zet de lampjes aan voor een getal, of lees het getal af.

  function maakBinair(n, r) {
    const t = r.t || 0;
    const bits = { page: 4, schildknaap: 6, ridder: 8 }[n] + (t >= 6 && n !== 'ridder' ? 1 : 0);
    const vragen = [];
    for (let i = 0; i < 3; i++) {
      const getal = 1 + r.int(2 ** bits - 1);
      const lees = n !== 'page' && r() < 0.5;
      vragen.push(lees ? { soort: 'lees', bits, lampen: binairLampen(getal, bits) } : { soort: 'zet', bits, getal });
    }
    return { vragen };
  }
  // De lampjes van links (groot) naar rechts (1).
  const binairLampen = (getal, bits) => Array.from({ length: bits }, (_, i) => (getal >> (bits - 1 - i)) & 1);
  const binairWaarde = lampen => lampen.reduce((a, b) => a * 2 + (b ? 1 : 0), 0);
  // poging: per vraag de lampjes (zet) of het getal (lees)
  function checkBinair(pz, poging) {
    if (!Array.isArray(poging) || poging.length !== pz.vragen.length) return false;
    return pz.vragen.every((q, i) => (q.soort === 'zet'
      ? Array.isArray(poging[i]) && poging[i].length === q.bits && binairWaarde(poging[i]) === q.getal
      : Number(poging[i]) === binairWaarde(q.lampen)));
  }

  // ---------- Cyberstad: de stroompoort (logische poorten) ----------
  // Schakelaars, EN-, OF- en NIET-poorten en een lamp. Zet de schakelaars zo dat de lamp brandt.

  function poortWaarde(k, aan) {
    if (k.in !== undefined) return !!aan[k.in];
    if (k.op === 'NIET') return !poortWaarde(k.a, aan);
    const a = poortWaarde(k.a, aan);
    const b = poortWaarde(k.b, aan);
    return k.op === 'EN' ? a && b : a || b;
  }
  function maakPoorten(n, r) {
    const t = r.t || 0;
    const ingangen = { page: 2, schildknaap: 3, ridder: 4 }[n];
    const poorten = { page: 1, schildknaap: 2, ridder: 3 }[n] + (t >= 5 ? 1 : 0);
    for (let poging = 0; poging < 200; poging++) {
      // een boom van poorten: elke ingang komt één keer voor
      let delen = r.shuffle([...Array(ingangen).keys()]).map(i => ({ in: i }));
      let gebruikt = 0;
      while (delen.length > 1) {
        const a = delen.shift();
        const b = delen.shift();
        let k = { op: r() < 0.5 ? 'EN' : 'OF', a, b };
        gebruikt++;
        if (n !== 'page' && gebruikt < poorten && r() < 0.35) { k = { op: 'NIET', a: k }; gebruikt++; }
        delen.push(k);
      }
      let boom = delen[0];
      if (n === 'ridder' && boom.op !== 'NIET' && r() < 0.3) boom = { op: 'NIET', a: boom };
      // hoeveel standen laten de lamp branden? Niet alle, en minstens één.
      let goed = 0;
      for (let m = 0; m < 2 ** ingangen; m++) if (poortWaarde(boom, [...Array(ingangen).keys()].map(i => (m >> i) & 1))) goed++;
      if (goed === 0 || goed === 2 ** ingangen) continue;
      if (n !== 'page' && goed > 2 ** ingangen / 2) continue;
      return { ingangen, boom };
    }
    return { ingangen: 2, boom: { op: 'EN', a: { in: 0 }, b: { in: 1 } } };
  }
  const checkPoorten = (pz, poging) => Array.isArray(poging) && poging.length === pz.ingangen && poortWaarde(pz.boom, poging);

  // ---------- Cyberstad: het lichtlab (kleuren mengen met licht) ----------
  // Rood, groen en blauw licht samen maken nieuwe kleuren. Page: aan of uit. Hoger: ook half of fel.

  const LICHT_KLEUREN = [
    ['geel', [1, 1, 0]], ['cyaan (lichtblauw)', [0, 1, 1]], ['magenta (roze-paars)', [1, 0, 1]], ['wit', [1, 1, 1]],
    ['rood', [1, 0, 0]], ['groen', [0, 1, 0]], ['blauw', [0, 0, 1]],
  ];
  function maakLichtkleur(n, r) {
    const t = r.t || 0;
    const stappen = n === 'page' ? 1 : n === 'schildknaap' ? 2 : 3;
    const vragen = [];
    const keuze = r.shuffle(LICHT_KLEUREN.slice(0, t >= 3 ? 7 : 4));
    for (let i = 0; i < 3; i++) {
      if (stappen === 1) {
        const [naam, rgb] = keuze[i];
        vragen.push({ naam, rgb });
      } else {
        let rgb;
        do { rgb = [r.int(stappen + 1), r.int(stappen + 1), r.int(stappen + 1)]; } while (rgb.every(x => x === rgb[0]) || rgb.filter(Boolean).length < 2);
        vragen.push({ naam: '', rgb });
      }
    }
    return { stappen, vragen };
  }
  const checkLichtkleur = (pz, poging) => Array.isArray(poging) && poging.length === pz.vragen.length
    && poging.every((p, i) => Array.isArray(p) && p.length === 3 && p.every((x, k) => Number(x) === pz.vragen[i].rgb[k]));

  // ---------- Ruimtestation: het vrachtruim (precies laden) ----------

  function maakVracht(n, r) {
    const t = r.t || 0;
    const aantal = { page: 5, schildknaap: 7, ridder: 8 }[n] + Math.min(2, Math.floor(t / 4));
    const max = { page: 10, schildknaap: 40, ridder: 90 }[n];
    const half = n === 'ridder' && r() < 0.5;
    for (let poging = 0; poging < 100; poging++) {
      const kisten = Array.from({ length: aantal }, () => (1 + r.int(max)) * (half ? 0.5 : 1));
      const kies = r.shuffle([...kisten.keys()]).slice(0, { page: 2, schildknaap: 3, ridder: 4 }[n] + (t >= 6 ? 1 : 0));
      const doel = Math.round(kies.reduce((a, i) => a + kisten[i], 0) * 10) / 10;
      // niet te makkelijk: geen enkele kist mag zelf al het doel zijn
      if (kisten.some(k => k === doel)) continue;
      return { kisten, doel };
    }
    return { kisten: [2, 3, 5, 7], doel: 10 };
  }
  function checkVracht(pz, poging) {
    if (!Array.isArray(poging) || !poging.length || new Set(poging).size !== poging.length) return false;
    if (!poging.every(i => Number.isInteger(i) && i >= 0 && i < pz.kisten.length)) return false;
    return Math.abs(poging.reduce((a, i) => a + pz.kisten[i], 0) - pz.doel) < 1e-9;
  }

  // ---------- Ruimtestation: de aftelling (rekendoel) ----------
  // Maak het doelgetal met de getallen en + − × :. Elk getal mag je maar één keer gebruiken.

  function rekenUit(tekst) {
    // een kleine, veilige rekenmachine: getallen, + - * / en haakjes, met breuken zodat delen exact blijft
    const tok = String(tekst).replace(/×/g, '*').replace(/:/g, '/').replace(/−/g, '-').match(/\d+|[-+*/()]/g);
    if (!tok || tok.join('') !== String(tekst).replace(/×/g, '*').replace(/:/g, '/').replace(/−/g, '-').replace(/\s+/g, '')) return null;
    let p = 0;
    const getallen = [];
    const ggd = (a, b) => (b ? ggd(b, a % b) : Math.abs(a));
    const br = (a, b) => { if (!b) throw new Error('nul'); const g = ggd(a, b) || 1; return b < 0 ? [-a / g, -b / g] : [a / g, b / g]; };
    function factor() {
      const x = tok[p++];
      if (x === '(') { const v = som(); if (tok[p++] !== ')') throw new Error('haakje'); return v; }
      if (/^\d+$/.test(x || '')) { getallen.push(Number(x)); return [Number(x), 1]; }
      throw new Error('fout');
    }
    function term() {
      let v = factor();
      while (tok[p] === '*' || tok[p] === '/') {
        const o = tok[p++];
        const w = factor();
        v = o === '*' ? br(v[0] * w[0], v[1] * w[1]) : br(v[0] * w[1], v[1] * w[0]);
      }
      return v;
    }
    function som() {
      let v = term();
      while (tok[p] === '+' || tok[p] === '-') {
        const o = tok[p++];
        const w = term();
        v = br(o === '+' ? v[0] * w[1] + w[0] * v[1] : v[0] * w[1] - w[0] * v[1], v[1] * w[1]);
      }
      return v;
    }
    try {
      const v = som();
      if (p !== tok.length) return null;
      return { waarde: v[1] === 1 ? v[0] : v[0] / v[1], geheel: v[1] === 1, getallen };
    } catch {
      return null;
    }
  }
  function maakAftel(n, r) {
    const t = r.t || 0;
    const aantal = { page: 3, schildknaap: 4, ridder: 6 }[n];
    const klein = () => 1 + r.int(n === 'page' ? 9 : 10);
    for (let poging = 0; poging < 300; poging++) {
      const getallen = Array.from({ length: aantal }, klein);
      if (n === 'ridder') { getallen[0] = r.pick([25, 50, 75, 100]); if (t >= 4) getallen[1] = r.pick([25, 50, 75]); }
      // bouw een som met een paar getallen, van links naar rechts
      const kies = r.shuffle([...getallen.keys()]).slice(0, Math.min(aantal, (n === 'page' ? 2 : 3) + (t >= 3 ? 1 : 0)));
      let tekst = String(getallen[kies[0]]);
      let waarde = getallen[kies[0]];
      let gebruikt = 1;
      for (const i of kies.slice(1)) {
        const x = getallen[i];
        const ops = n === 'page' ? ['+', '-'] : ['+', '-', '*', '/'];
        const o = r.pick(ops);
        if (o === '-' && waarde - x < 0) continue;
        if (o === '/' && (waarde % x || x === 1)) continue;
        if (o === '*' && (x === 1 || waarde * x > (n === 'ridder' ? 999 : 100))) continue;
        waarde = o === '+' ? waarde + x : o === '-' ? waarde - x : o === '*' ? waarde * x : waarde / x;
        tekst = (o === '*' || o === '/') && /[+-]/.test(tekst) ? `(${tekst}) ${o} ${x}` : `${tekst} ${o} ${x}`;
        gebruikt++;
      }
      const min = { page: 5, schildknaap: 10, ridder: 100 }[n];
      if (waarde < min || getallen.includes(waarde) || gebruikt < (n === 'page' ? 2 : 3)) continue;
      // opl: een mogelijke oplossing (blijft op de server)
      return { getallen, doel: waarde, opl: tekst };
    }
    return { getallen: [2, 3, 4], doel: 9, opl: '2 + 3 + 4' };
  }
  function checkAftel(pz, poging) {
    const u = rekenUit(poging);
    if (!u || !u.geheel || u.waarde !== pz.doel) return false;
    const over = pz.getallen.slice();
    return u.getallen.every(g => { const i = over.indexOf(g); if (i < 0) return false; over.splice(i, 1); return true; });
  }

  // ---------- Ruimtestation: de seinpost (seinen ontcijferen) ----------

  const SEIN = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
    N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  };
  const SEIN_WOORDEN = {
    page: ['ZON', 'MAAN', 'STER', 'MARS', 'BAAN', 'CODE', 'DATA', 'LAMP', 'ROOD', 'NEON'],
    schildknaap: ['ROBOT', 'RAKET', 'LASER', 'DRONE', 'KOMEET', 'SATURN', 'BATTERIJ', 'SCHERM', 'ANTENNE', 'METEOOR'],
    ridder: ['PLANEET', 'SIGNAAL', 'ASTRONAUT', 'TELESCOOP', 'MELKWEG', 'HOLOGRAM', 'COMPUTER', 'ZWAARTEKRACHT', 'SATELLIET', 'RUIMTEPAK'],
  };
  function maakSein(n, r) {
    const woord = r.pick(SEIN_WOORDEN[n]);
    const letters = [...new Set(woord)];
    // de page krijgt alleen de nodige letters (en een paar extra), de rest het hele alfabet
    const extra = r.shuffle(Object.keys(SEIN).filter(l => !letters.includes(l))).slice(0, 4);
    const sleutel = n === 'page' ? r.shuffle(letters.concat(extra)).sort() : Object.keys(SEIN);
    return { seinen: [...woord].map(l => SEIN[l]), sleutel: Object.fromEntries(sleutel.map(l => [l, SEIN[l]])), opl: woord };
  }
  const checkSein = (pz, poging) => String(poging || '').trim().toUpperCase() === pz.opl;

  // ---------- Samen ----------

  const SOORTEN = {
    schuif: { maak: maakSchuif, check: checkSchuif },
    robot: { maak: maakRobot, check: checkRobot },
    licht: { maak: maakLicht, check: checkLicht },
    stroom: { maak: maakStroom, check: checkStroom },
    tandwiel: { maak: maakTandwiel, check: checkTandwiel },
    wip: { maak: maakWip, check: checkWip },
    weeg: { maak: maakWeeg, check: checkWeeg },
    reeks: { maak: maakReeks, check: checkReeks },
    pixel: { maak: maakPixel, check: checkPixel },
    sudoku: { maak: maakSudoku, check: checkSudoku },
    doolhof: { maak: maakDoolhof, check: checkDoolhof },
    toren: { maak: maakToren, check: checkToren },
    ijs: { maak: maakIjs, check: checkIjs },
    klok: { maak: maakKlok, check: checkKlok },
    spiegel: { maak: maakSpiegel, check: checkSpiegel },
    codeslot: { maak: maakSlot, check: checkSlot },
    lampen: { maak: maakLampen, check: checkLampen },
    hanoi: { maak: maakHanoi, check: checkHanoi },
    breuk: { maak: maakBreuk, check: checkBreuk },
    munten: { maak: maakMunten, check: checkMunten },
    coord: { maak: maakCoord, check: checkCoord },
    kubus: { maak: maakKubus, check: checkKubus },
    magisch: { maak: maakMagisch, check: checkMagisch },
    route: { maak: maakRoute, check: checkRoute },
    drijven: { maak: maakDrijven, check: checkDrijven },
    thermo: { maak: maakThermo, check: checkThermo },
    tafels: { maak: maakTafels, check: checkRij },
    lijn: { maak: maakLijn, check: checkLijn },
    patroon: { maak: maakPatroon, check: checkPatroon },
    eenheden: { maak: maakEenheden, check: checkRij },
    opp: { maak: maakOpp, check: (pz, poging) => Number(poging) === pz.opl },
    sterren: { maak: maakSterren, check: checkSterren },
    binair: { maak: maakBinair, check: checkBinair },
    poorten: { maak: maakPoorten, check: checkPoorten },
    lichtkleur: { maak: maakLichtkleur, check: checkLichtkleur },
    vracht: { maak: maakVracht, check: checkVracht },
    aftel: { maak: maakAftel, check: checkAftel },
    sein: { maak: maakSein, check: checkSein },
  };

  // trap: hoe vaak je deze plek al oploste (1, 2, 3...). Hoe hoger, hoe moeilijker.
  function maak(soort, niveau, seed, trap = 1) {
    const s = SOORTEN[soort];
    if (!s) return null;
    const t = Math.max(0, Math.min(60, (Number(trap) || 1) - 1));
    const r = rng(`${soort}|${niveau}|${seed}${t ? `|${t}` : ''}`);
    r.t = t;
    return s.maak(niv(niveau), r);
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
    schuifZet, schuifKlaar, robotLoop, doolhofLoop, lijnGetallen, WAREN, ijsGlij, ijsLoop, spiegelVeld, slotHint, lampenTik, hanoiLoop, routeLengte, minMunten, lijnMarge, binairLampen, binairWaarde, poortWaarde, rekenUit, lichtPad, stroomBereik, stroomOk, draai, wipLinks, KAATS, DX, DY,
  };
}));
