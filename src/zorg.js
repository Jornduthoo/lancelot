// Het zorgoverzicht: in één oogopslag welke leerlingen uitvallen, waarop, en of het beter of slechter gaat.
// Alles komt uit het logboek (logboek/<schooljaar>.jsonl en -gok.jsonl), niets wordt apart bewaard.
// We vergelijken elke leerling met de klas op dezelfde vragen: een moeilijke quiz maakt zo niemand onterecht rood.
const logboek = require('./logboek');
const klas = require('./klas');
const doelen = require('./doelen');
const notities = require('./notities');
const niveaus = require('./niveaus');

const DAG = 86400000;
const RECENT = 20; // de laatste zoveel antwoorden van een leerling
const DOEL_RECENT = 10; // zoals de doelenkaart
const MIN = 10; // minder antwoorden: nog te weinig om iets te zeggen
const MIN_DOEL = 3;
const NIVEAUS = ['page', 'schildknaap', 'ridder'];

const pct = (juist, n) => (n ? Math.round((juist / n) * 100) : 0);
const avg = list => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

function who(e, list) {
  const l = (e.leerling && list.find(x => x.id === e.leerling)) || list.find(x => x.naam.toLowerCase() === String(e.naam || '').toLowerCase());
  return l ? { key: l.id, naam: l.naam, opLijst: true, niveau: l.niveau || 'schildknaap', vakNiveaus: l.vakNiveaus || {} } : { key: `naam:${String(e.naam || '').toLowerCase()}`, naam: e.naam || '?', opLijst: false, niveau: '' };
}

// dagen: 0 = heel het schooljaar. vak: alleen antwoorden op doelen van dat vak.
function overzicht({ dagen = 42, vak = '' } = {}) {
  const k = klas.read();
  const list = k.leerlingen;
  const vanaf = dagen ? new Date(Date.now() - dagen * DAG).toISOString() : '';
  const vakVan = code => (code && (doelen.find(code) || {}).vak) || '';
  const entries = logboek.read().filter(e => e.t >= vanaf && (!e.doel || doelen.scoort(e.doel)) && (!vak || vakVan(e.doel) === vak));
  const vakken = new Set();

  // Hoe moeilijk was elke vraag voor de klas?
  const vragen = new Map();
  for (const e of entries) {
    const v = vragen.get(e.vraag) || vragen.set(e.vraag, { n: 0, juist: 0 }).get(e.vraag);
    v.n++;
    if (e.juist) v.juist++;
  }
  const kans = q => {
    const v = vragen.get(q);
    return v && v.n > 1 ? v.juist / v.n : null;
  };

  // De sessies (één keer een spel spelen), voor de trend en de lijntjes.
  const sessies = new Map();
  const leerlingen = new Map();
  for (const l of list) leerlingen.set(l.id, { key: l.id, naam: l.naam, opLijst: true, niveau: l.niveau || 'schildknaap', vakNiveaus: l.vakNiveaus || {}, items: [] });
  for (const e of entries) {
    const w = who(e, list);
    if (!w.opLijst && list.length) continue;
    let s = leerlingen.get(w.key);
    if (!s) leerlingen.set(w.key, (s = { ...w, items: [] }));
    s.items.push(e);
    const sid = e.sessie || `${e.spel}|${e.t.slice(0, 13)}`;
    const ses = sessies.get(sid) || sessies.set(sid, { id: sid, spel: e.spel, bron: e.bron, t: e.t, n: 0, juist: 0 }).get(sid);
    ses.n++;
    if (e.juist) ses.juist++;
    const v = vakVan(e.doel);
    if (v) vakken.add(v);
  }

  const doelStatus = new Map(); // code -> { niet: [], bijna: [], ok: 0 }
  const misverstanden = new Map(); // code -> namen die zeker waren maar fout zaten
  const alleNotities = notities.read();
  const gokken = logboek.readGok().filter(g => g.t >= vanaf);
  const laatsteKlas = entries.length ? entries[entries.length - 1].t : '';

  const rows = [];
  for (const s of leerlingen.values()) {
    const n = s.items.length;
    const juist = s.items.filter(e => e.juist).length;
    const recent = s.items.slice(-RECENT);
    const recentPct = pct(recent.filter(e => e.juist).length, recent.length);
    // Verschil met de klas op dezelfde vragen, in procentpunten.
    const diffs = s.items.map(e => [e, kans(e.vraag)]).filter(([, p]) => p !== null).map(([e, p]) => (e.juist ? 1 : 0) - p);
    const tovKlas = diffs.length >= 5 ? Math.round(avg(diffs) * 100) : null;

    // Per sessie: score van de leerling en van de klas.
    const perSessie = new Map();
    for (const e of s.items) {
      const sid = e.sessie || `${e.spel}|${e.t.slice(0, 13)}`;
      const x = perSessie.get(sid) || perSessie.set(sid, { id: sid, n: 0, juist: 0, diff: [] }).get(sid);
      x.n++;
      if (e.juist) x.juist++;
      const p = kans(e.vraag);
      if (p !== null) x.diff.push((e.juist ? 1 : 0) - p);
    }
    const lijn = [...perSessie.values()].filter(x => x.n >= 2).map(x => {
      const ses = sessies.get(x.id);
      return { t: ses.t, spel: ses.spel, bron: ses.bron, pct: pct(x.juist, x.n), klas: pct(ses.juist, ses.n), diff: x.diff.length ? avg(x.diff) : 0 };
    });
    let trend = null;
    if (lijn.length >= 4) {
      const laatste = lijn.slice(-3).map(x => x.diff);
      const ervoor = lijn.slice(0, -3).map(x => x.diff);
      trend = Math.round((avg(laatste) - avg(ervoor)) * 100);
    }

    // Per vak en per doel.
    const perVak = new Map();
    const perDoel = new Map();
    for (const e of s.items) {
      if (!e.doel) continue;
      const v = vakVan(e.doel) || 'Ander';
      const x = perVak.get(v) || perVak.set(v, { vak: v, n: 0, juist: 0 }).get(v);
      x.n++;
      if (e.juist) x.juist++;
      const d = perDoel.get(e.doel) || perDoel.set(e.doel, { n: 0, recent: [] }).get(e.doel);
      d.n++;
      d.recent.push(e.juist ? 1 : 0);
      if (d.recent.length > DOEL_RECENT) d.recent.shift();
    }
    const nietDoelen = [];
    const sterk = [];
    for (const [code, d] of perDoel) {
      if (d.n < MIN_DOEL) continue;
      const p = pct(d.recent.reduce((a, b) => a + b, 0), d.recent.length);
      const st = p >= 80 ? 'ok' : p >= 50 ? 'bijna' : 'niet';
      const ds = doelStatus.get(code) || doelStatus.set(code, { niet: [], bijna: [], ok: 0 }).get(code);
      if (st === 'ok') ds.ok++;
      else ds[st].push(s.naam);
      if (st === 'niet') nietDoelen.push({ code, tekst: (doelen.find(code) || {}).tekst || '', pct: p, n: d.n });
      if (st === 'ok') sterk.push({ code, tekst: (doelen.find(code) || {}).tekst || '', pct: p, n: d.n });
    }
    nietDoelen.sort((a, b) => a.pct - b.pct);
    sterk.sort((a, b) => b.pct - a.pct || b.n - a.n);

    // Zeker of twijfel (Toernooi): hoe goed schat de leerling zichzelf in?
    const zk = { 'zeker-juist': 0, 'zeker-fout': 0, 'twijfel-juist': 0, 'twijfel-fout': 0 };
    for (const e of s.items) {
      if (!e.zeker) continue;
      zk[`${e.zeker}-${e.juist ? 'juist' : 'fout'}`]++;
      if (e.zeker === 'zeker' && !e.juist && e.doel) {
        const m = misverstanden.get(e.doel) || misverstanden.set(e.doel, new Map()).get(e.doel);
        m.set(s.naam, (m.get(s.naam) || 0) + 1);
      }
    }
    const zeker = zk['zeker-juist'] + zk['zeker-fout'];
    const twijfel = zk['twijfel-juist'] + zk['twijfel-fout'];

    const gok = gokken.filter(g => (g.leerling && g.leerling === s.key) || String(g.naam || '').toLowerCase() === s.naam.toLowerCase()).length;
    const leeg = s.items.filter(e => e.leeg).length;
    const laatst = n ? s.items[n - 1].t : '';

    // Waarom deze leerling aandacht vraagt. Elk signaal heeft een kleur: rood, oranje of info.
    const signalen = [];
    if (n >= MIN) {
      if (recentPct < 50) signalen.push({ niveau: 'rood', tekst: `Maar ${recentPct}% juist bij de laatste ${recent.length} antwoorden` });
      if (tovKlas !== null && tovKlas <= -20) signalen.push({ niveau: 'rood', tekst: `${-tovKlas} procentpunten onder de klas op dezelfde vragen` });
      else if (tovKlas !== null && tovKlas <= -10) signalen.push({ niveau: 'oranje', tekst: `${-tovKlas} procentpunten onder de klas op dezelfde vragen` });
      if (trend !== null && trend <= -15) signalen.push({ niveau: 'oranje', tekst: 'Gaat achteruit in de laatste lessen' });
      if (nietDoelen.length >= 3) signalen.push({ niveau: 'oranje', tekst: `${nietDoelen.length} doelen nog niet beheerst` });
      else if (nietDoelen.length) signalen.push({ niveau: 'info', tekst: `${nietDoelen.length === 1 ? '1 doel' : `${nietDoelen.length} doelen`} nog niet beheerst` });
      if (leeg >= 5 && leeg / n > 0.2) signalen.push({ niveau: 'info', tekst: `Liet ${leeg} vragen open` });
    }
    // Overschat zichzelf: de meeste fouten maakte hij terwijl hij zeker was. Onderschat: twijfelt vaak, en dat terwijl het meestal juist is.
    const fouten = zk['zeker-fout'] + zk['twijfel-fout'];
    if (zk['zeker-fout'] >= 3 && zk['zeker-fout'] / fouten >= 0.6 && zk['zeker-fout'] / zeker >= 0.2) signalen.push({ niveau: 'oranje', tekst: `Was ${zk['zeker-fout']} keer zeker, maar zat fout: overschat zichzelf of een misverstand?` });
    if (twijfel >= 5 && twijfel / (zeker + twijfel) >= 0.4 && zk['twijfel-juist'] / twijfel >= 0.7) signalen.push({ niveau: 'info', tekst: `Twijfelt vaak terwijl het juist is (${zk['twijfel-juist']}×): weinig zelfvertrouwen?` });
    if (gok >= 2) signalen.push({ niveau: 'oranje', tekst: `Gokte ${gok} keer (snel en fout na elkaar)` });
    else if (gok === 1) signalen.push({ niveau: 'info', tekst: 'Gokte 1 keer' });
    if (s.opLijst && laatsteKlas && (!laatst || Date.parse(laatsteKlas) - Date.parse(laatst) > 7 * DAG)) {
      signalen.push({ niveau: 'info', tekst: laatst ? 'Speelde de laatste week niet meer mee' : 'Speelde nog niet mee in deze periode' });
    }
    if (trend !== null && trend >= 15) signalen.push({ niveau: 'goed', tekst: 'Gaat vooruit in de laatste lessen' });

    const kleur = n < MIN && !signalen.some(x => x.niveau === 'rood' || x.niveau === 'oranje') ? 'weinig'
      : signalen.some(x => x.niveau === 'rood') ? 'rood' : signalen.some(x => x.niveau === 'oranje') ? 'oranje' : 'groen';

    // Niveau-advies per vak (Wiskunde, Nederlands, Frans, WO) en voor het algemene niveau (de andere vakken
    // en vragen zonder doel). Alleen voor leerlingen op de klaslijst en met genoeg antwoorden in dat vak.
    const adviezen = [];
    if (s.opLijst) {
      const perGroep = new Map();
      for (const e of s.items) {
        const g = niveaus.groep(vakVan(e.doel));
        (perGroep.get(g) || perGroep.set(g, []).get(g)).push(e);
      }
      for (const [g, items] of perGroep) {
        if (items.length < MIN * 2) continue;
        const eigen = g && s.vakNiveaus[g];
        const nu = eigen || s.niveau;
        const r = items.slice(-RECENT);
        const rp = pct(r.filter(e => e.juist).length, r.length);
        const d = items.map(e => [e, kans(e.vraag)]).filter(([, p]) => p !== null).map(([e, p]) => (e.juist ? 1 : 0) - p);
        const tk = d.length >= 5 ? Math.round(avg(d) * 100) : null;
        const i = NIVEAUS.indexOf(nu);
        const vakNaam = g ? niveaus.VAKGROEPEN.find(x => x.id === g).naam : '';
        const bij = vakNaam ? ` in ${vakNaam}` : '';
        if (rp >= 85 && (tk === null || tk >= 5) && i < 2) adviezen.push({ vak: g, vakNaam, van: nu, naar: NIVEAUS[i + 1], waarom: `${rp}% juist bij de laatste ${r.length} antwoorden${bij}: klaar voor meer uitdaging` });
        else if (rp < 50 && i > 0) adviezen.push({ vak: g, vakNaam, van: nu, naar: NIVEAUS[i - 1], waarom: `${rp}% juist bij de laatste ${r.length} antwoorden${bij}: eerst met meer hulp` });
      }
      adviezen.sort((a, b) => (a.vak ? 0 : 1) - (b.vak ? 0 : 1) || a.vakNaam.localeCompare(b.vakNaam));
    }
    const advies = adviezen[0] || null;

    rows.push({
      key: s.key, naam: s.naam, opLijst: s.opLijst, niveau: s.niveau, vakNiveaus: s.vakNiveaus || {},
      antwoorden: n, pct: pct(juist, n), recentPct, tovKlas, trend, gok, leeg, laatst, kleur, signalen, advies, adviezen,
      lijn: lijn.slice(-12).map(({ diff, ...x }) => x),
      vakken: [...perVak.values()].map(v => ({ ...v, pct: pct(v.juist, v.n) })).sort((a, b) => a.pct - b.pct),
      nietDoelen,
      sterk: sterk.slice(0, 6),
      zekerheid: zeker + twijfel ? zk : null,
      notities: s.opLijst ? (alleNotities[s.key] || []).slice().reverse() : [],
    });
  }

  const orde = { rood: 0, oranje: 1, groen: 3, weinig: 2 };
  rows.sort((a, b) => orde[a.kleur] - orde[b.kleur] || (a.tovKlas ?? 0) - (b.tovKlas ?? 0) || a.naam.localeCompare(b.naam));

  // Doelen waar veel leerlingen op vastzitten: klassikaal herhalen. Een paar leerlingen: een groepje voor verlengde instructie.
  const doelRows = [...doelStatus.entries()].map(([code, d]) => {
    const totaal = d.ok + d.bijna.length + d.niet.length;
    return { code, tekst: (doelen.find(code) || {}).tekst || '', vak: vakVan(code), totaal, ok: d.ok, bijna: d.bijna.sort(), niet: d.niet.sort() };
  }).filter(d => d.niet.length || d.bijna.length);
  const klassikaal = doelRows.filter(d => d.totaal >= 3 && d.niet.length / d.totaal >= 0.4).sort((a, b) => b.niet.length / b.totaal - a.niet.length / a.totaal);
  const groepjes = doelRows.filter(d => !klassikaal.includes(d) && d.niet.length).sort((a, b) => b.niet.length - a.niet.length || a.code.localeCompare(b.code));

  // Per vak: hoe doet de klas het?
  const klasVakken = new Map();
  for (const e of entries) {
    const v = vakVan(e.doel);
    if (!v) continue;
    const x = klasVakken.get(v) || klasVakken.set(v, { vak: v, n: 0, juist: 0 }).get(v);
    x.n++;
    if (e.juist) x.juist++;
  }

  // Doelen waar leerlingen zeker waren maar toch fout zaten: hardnekkige misverstanden, de moeite om klassikaal uit te klaren.
  const misRows = [...misverstanden.entries()].map(([code, m]) => ({ code, tekst: (doelen.find(code) || {}).tekst || '', vak: vakVan(code), namen: [...m.keys()].sort(), keer: [...m.values()].reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.namen.length - a.namen.length || b.keer - a.keer);

  // Veelgemaakte fouten: hetzelfde foute antwoord bij dezelfde vraag, door minstens twee leerlingen. Dat wijst op een denkfout.
  const fouten = new Map();
  for (const e of logboek.readKeuze()) {
    if (e.t < vanaf || (vak && vakVan(e.doel) !== vak) || (e.doel && !doelen.scoort(e.doel))) continue;
    const w = who(e, list);
    if (!w.opLijst && list.length) continue;
    const key = `${e.vraag}\u0000${String(e.gekozen).trim().toLowerCase()}`;
    const f = fouten.get(key) || fouten.set(key, { vraag: e.vraag, gekozen: e.gekozen, juist: e.juist, doel: e.doel || '', namen: new Set(), keer: 0 }).get(key);
    f.namen.add(w.naam);
    f.keer++;
  }
  const foutRows = [...fouten.values()].filter(f => f.namen.size >= 2)
    .map(f => ({ ...f, namen: [...f.namen].sort(), van: (vragen.get(f.vraag) || {}).n || 0 }))
    .sort((a, b) => b.namen.length - a.namen.length || b.keer - a.keer);

  // Leertijd per spel: hoeveel vragen beantwoordt een leerling per minuut? Zo zie je welke spellen vooral spelen zijn.
  const leertijd = new Map();
  for (const ses of leertijdSessies(entries)) {
    const x = leertijd.get(ses.spel) || leertijd.set(ses.spel, { spel: ses.spel, sessies: 0, antwoorden: 0, minuten: 0, juist: 0 }).get(ses.spel);
    x.sessies++;
    x.antwoorden += ses.antwoorden;
    x.juist += ses.juist;
    x.minuten += ses.minuten * ses.leerlingen;
  }

  return {
    schooljaar: logboek.schooljaar(),
    leerjaar: k.leerjaar,
    fouten: foutRows.slice(0, 10),
    leertijd: [...leertijd.values()].map(x => ({ spel: x.spel, sessies: x.sessies, perMinuut: Math.round((x.antwoorden / x.minuten) * 10) / 10, pct: pct(x.juist, x.antwoorden) }))
      .sort((a, b) => b.perMinuut - a.perMinuut),
    misverstanden: misRows.slice(0, 8),
    klas: k.naam,
    dagen,
    vak,
    vakken: [...vakken].sort((a, b) => a.localeCompare(b, 'nl')),
    antwoorden: entries.length,
    pct: pct(entries.filter(e => e.juist).length, entries.length),
    sessies: sessies.size,
    telling: { rood: rows.filter(r => r.kleur === 'rood').length, oranje: rows.filter(r => r.kleur === 'oranje').length, groen: rows.filter(r => r.kleur === 'groen').length, weinig: rows.filter(r => r.kleur === 'weinig').length },
    leerlingen: rows,
    klassikaal: klassikaal.slice(0, 8),
    groepjes: groepjes.slice(0, 12),
    klasVakken: [...klasVakken.values()].map(v => ({ ...v, pct: pct(v.juist, v.n) })).sort((a, b) => a.pct - b.pct),
    grenzen: { recent: RECENT, min: MIN },
  };
}

// Per sessie: hoe lang er gespeeld werd en hoeveel vragen elke leerling gemiddeld beantwoordde.
// Een sessie van minder dan twee minuten zegt te weinig (en de tijdstempels zijn een paar seconden grof).
function leertijdSessies(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!e.sessie || e.spel === 'Runenraadsel' || e.spel === 'Oefenblad') continue;
    const t = Date.parse(e.t);
    const s = map.get(e.sessie) || map.set(e.sessie, { spel: e.spel, start: t, end: t, antwoorden: 0, juist: 0, namen: new Set() }).get(e.sessie);
    s.start = Math.min(s.start, t);
    s.end = Math.max(s.end, t);
    if (!e.leeg) s.antwoorden++;
    if (e.juist) s.juist++;
    s.namen.add(String(e.naam || '').toLowerCase());
  }
  return [...map.values()].map(s => ({ ...s, leerlingen: s.namen.size, minuten: (s.end - s.start) / 60000 })).filter(s => s.minuten >= 2 && s.leerlingen);
}

module.exports = { overzicht, leertijdSessies };
