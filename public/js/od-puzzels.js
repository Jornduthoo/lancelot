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
    schuifZet, schuifKlaar, robotLoop, doolhofLoop, lijnGetallen, WAREN, ijsGlij, ijsLoop, spiegelVeld, slotHint, lampenTik, hanoiLoop, lichtPad, stroomBereik, stroomOk, draai, wipLinks, KAATS, DX, DY,
  };
}));
