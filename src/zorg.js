// Het zorgoverzicht: in één oogopslag welke leerlingen uitvallen, waarop, en of het beter of slechter gaat.
// Alles komt uit het logboek (logboek/<schooljaar>.jsonl en -gok.jsonl), niets wordt apart bewaard.
// We vergelijken elke leerling met de klas op dezelfde vragen: een moeilijke quiz maakt zo niemand onterecht rood.
const logboek = require('./logboek');
const klas = require('./klas');
const doelen = require('./doelen');
const notities = require('./notities');

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
  return l ? { key: l.id, naam: l.naam, opLijst: true, niveau: l.niveau || 'schildknaap' } : { key: `naam:${String(e.naam || '').toLowerCase()}`, naam: e.naam || '?', opLijst: false, niveau: '' };
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
  for (const l of list) leerlingen.set(l.id, { key: l.id, naam: l.naam, opLijst: true, niveau: l.niveau || 'schildknaap', items: [] });
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

    // Niveau-advies: alleen voor leerlingen op de klaslijst en met genoeg antwoorden.
    let advies = null;
    if (s.opLijst && n >= MIN * 2) {
      const i = NIVEAUS.indexOf(s.niveau);
      if (recentPct >= 85 && (tovKlas === null || tovKlas >= 5) && i < 2) advies = { naar: NIVEAUS[i + 1], waarom: `${recentPct}% juist bij de laatste ${recent.length} antwoorden: klaar voor meer uitdaging` };
      else if (recentPct < 50 && i > 0) advies = { naar: NIVEAUS[i - 1], waarom: `${recentPct}% juist bij de laatste ${recent.length} antwoorden: eerst met meer hulp` };
    }

    rows.push({
      key: s.key, naam: s.naam, opLijst: s.opLijst, niveau: s.niveau,
      antwoorden: n, pct: pct(juist, n), recentPct, tovKlas, trend, gok, leeg, laatst, kleur, signalen, advies,
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

  return {
    schooljaar: logboek.schooljaar(),
    leerjaar: k.leerjaar,
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

module.exports = { overzicht };
