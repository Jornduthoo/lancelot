// Wat het logboek vertelt: een overzicht na elk spel en de doelenkaart (welke leerplandoelen elke leerling beheerst).
// Alles wordt berekend uit logboek/<schooljaar>.jsonl, niets apart bewaard. Ook de CSV-bestanden voor Excel maken we hier.
const logboek = require('./logboek');
const klas = require('./klas');
const doelen = require('./doelen');

// Onder deze score (in %) staat een vraag bij de moeilijkste en een leerling bij wie extra uitleg kan gebruiken.
const GRENS = 60;
// Een doel is beheerst als de laatste antwoorden op dat doel voor minstens 80% juist zijn, 'bijna' vanaf 50%.
const RECENT = 10;
const MIN_ANTWOORDEN = 3;
const STATUS = { ok: 'beheerst', bijna: 'bijna', niet: 'nog niet', weinig: 'te weinig antwoorden' };
const LEGACY_GAP_MS = 30 * 60000;

const pct = (juist, n) => (n ? Math.round((juist / n) * 100) : 0);

// Oudere antwoorden hebben nog geen sessie: die groeperen we per spel en bron, zolang er geen half uur tussen zit.
function withSessions(entries) {
  let prev = null;
  return entries.map(e => {
    if (e.sessie) return e;
    const t = Date.parse(e.t);
    if (!prev || prev.spel !== e.spel || prev.bron !== e.bron || t - prev.last > LEGACY_GAP_MS) prev = { id: `oud${t.toString(36)}`, spel: e.spel, bron: e.bron, last: t };
    prev.last = t;
    return { ...e, sessie: prev.id };
  });
}

// Wie is wie: een leerling van de klaslijst (ook als de naam pas later op de lijst kwam), anders de getypte naam.
function who(e, list) {
  const l = (e.leerling && list.find(x => x.id === e.leerling)) || list.find(x => x.naam.toLowerCase() === String(e.naam || '').toLowerCase());
  return l ? { key: l.id, naam: l.naam, opLijst: true } : { key: `naam:${String(e.naam || '').toLowerCase()}`, naam: e.naam || '?', opLijst: false };
}

function sessions(limit = 40) {
  const map = new Map();
  for (const e of withSessions(logboek.read())) {
    let s = map.get(e.sessie);
    if (!s) map.set(e.sessie, (s = { id: e.sessie, spel: e.spel, bron: e.bron, start: e.t, end: e.t, antwoorden: 0, juist: 0, namen: new Set() }));
    s.end = e.t;
    s.antwoorden++;
    if (e.juist) s.juist++;
    s.namen.add(String(e.naam || '').toLowerCase());
  }
  return [...map.values()].reverse().slice(0, limit).map(({ namen, ...s }) => ({ ...s, leerlingen: namen.size, pct: pct(s.juist, s.antwoorden) }));
}

// Het overzicht van één sessie: de moeilijkste vragen, wie extra uitleg kan gebruiken en hoe het per doel ging.
function session(id) {
  const entries = withSessions(logboek.read()).filter(e => e.sessie === id);
  if (!entries.length) return null;
  const list = klas.read().leerlingen;
  const vragen = new Map();
  const spelers = new Map();
  const perDoel = new Map();
  for (const e of entries) {
    const w = who(e, list);
    const v = vragen.get(e.vraag) || vragen.set(e.vraag, { vraag: e.vraag, doel: e.doel || '', antwoorden: 0, juist: 0, fout: new Set() }).get(e.vraag);
    v.antwoorden++;
    if (e.juist) v.juist++;
    else v.fout.add(w.naam);
    const s = spelers.get(w.key) || spelers.set(w.key, { naam: w.naam, opLijst: w.opLijst, antwoorden: 0, juist: 0, leeg: 0, foutDoelen: new Set() }).get(w.key);
    s.antwoorden++;
    if (e.juist) s.juist++;
    else if (e.doel) s.foutDoelen.add(e.doel);
    if (e.leeg) s.leeg++;
    if (e.doel) {
      const d = perDoel.get(e.doel) || perDoel.set(e.doel, { doel: e.doel, antwoorden: 0, juist: 0 }).get(e.doel);
      d.antwoorden++;
      if (e.juist) d.juist++;
    }
  }
  const juist = entries.filter(e => e.juist).length;
  // Het foute antwoord dat het vaakst gekozen werd, per vraag (uit logboek/<schooljaar>-keuze.jsonl).
  const van = Date.parse(entries[0].t) - 60000;
  const tot = Date.parse(entries[entries.length - 1].t) + 60000;
  const gekozen = new Map();
  for (const k of logboek.readKeuze()) {
    const t = Date.parse(k.t);
    if (t < van || t > tot || !vragen.has(k.vraag) || k.spel !== entries[0].spel) continue;
    const per = gekozen.get(k.vraag) || gekozen.set(k.vraag, new Map()).get(k.vraag);
    per.set(k.gekozen, (per.get(k.gekozen) || 0) + 1);
  }
  const vaakst = vraag => {
    const per = gekozen.get(vraag);
    if (!per) return null;
    const [tekst, keer] = [...per.entries()].sort((a, b) => b[1] - a[1])[0];
    return keer >= 2 ? { tekst, keer } : null;
  };
  // Leertijd: vragen per leerling per minuut. Pas vanaf twee minuten spelen zegt dat iets.
  const minuten = (Date.parse(entries[entries.length - 1].t) - Date.parse(entries[0].t)) / 60000;
  const beantwoord = entries.filter(e => !e.leeg).length;
  return {
    id,
    minuten: Math.round(minuten),
    perMinuut: minuten >= 2 && spelers.size ? Math.round((beantwoord / spelers.size / minuten) * 10) / 10 : null,
    spel: entries[0].spel,
    bron: entries[0].bron,
    start: entries[0].t,
    end: entries[entries.length - 1].t,
    antwoorden: entries.length,
    juist,
    pct: pct(juist, entries.length),
    grens: GRENS,
    minAntwoorden: MIN_ANTWOORDEN,
    vragen: [...vragen.values()].map(v => ({ ...v, fout: [...v.fout].sort(), pct: pct(v.juist, v.antwoorden), vaakstFout: vaakst(v.vraag) }))
      .sort((a, b) => a.pct - b.pct || b.antwoorden - a.antwoorden),
    spelers: [...spelers.values()].map(s => ({ ...s, foutDoelen: [...s.foutDoelen], pct: pct(s.juist, s.antwoorden) }))
      .sort((a, b) => a.pct - b.pct || a.naam.localeCompare(b.naam)),
    doelen: [...perDoel.values()].filter(d => doelen.scoort(d.doel)).map(d => ({ ...d, tekst: (doelen.find(d.doel) || {}).tekst || '', pct: pct(d.juist, d.antwoorden) }))
      .sort((a, b) => a.pct - b.pct),
  };
}

function status(n, recentJuist, recentN) {
  if (n < MIN_ANTWOORDEN) return 'weinig';
  const p = pct(recentJuist, recentN);
  return p >= 80 ? 'ok' : p >= 50 ? 'bijna' : 'niet';
}

// De doelenkaart: per leerplandoel en per leerling hoe ver ze staan. Zonder klaslijst tellen alle namen uit het logboek.
function kaart() {
  const list = klas.read().leerlingen;
  // Doelen voor de Ronde Tafel (SEL, leren leren, godsdienst) krijgen geen score.
  const entries = logboek.read().filter(e => e.doel && doelen.scoort(e.doel));
  const leerlingen = list.map(l => ({ key: l.id, naam: l.naam }));
  const extra = new Map();
  const cells = new Map();
  for (const e of entries) {
    const w = who(e, list);
    if (!w.opLijst) {
      if (list.length) continue;
      if (!extra.has(w.key)) extra.set(w.key, { key: w.key, naam: w.naam });
    }
    const id = `${e.doel}|${w.key}`;
    const c = cells.get(id) || cells.set(id, { n: 0, juist: 0, recent: [], laatst: '' }).get(id);
    c.n++;
    if (e.juist) c.juist++;
    c.recent.push(e.juist ? 1 : 0);
    if (c.recent.length > RECENT) c.recent.shift();
    c.laatst = e.t;
  }
  const all = [...leerlingen, ...[...extra.values()].sort((a, b) => a.naam.localeCompare(b.naam))];
  const order = new Map(doelen.all().map((d, i) => [d.code, i]));
  const codes = [...new Set(entries.map(e => e.doel))].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || a.localeCompare(b));
  const rows = codes.map(code => {
    const d = doelen.find(code) || {};
    const cellen = {};
    const telling = { ok: 0, bijna: 0, niet: 0, weinig: 0 };
    let n = 0;
    let juist = 0;
    for (const l of all) {
      const c = cells.get(`${code}|${l.key}`);
      if (!c) continue;
      const r = c.recent.reduce((a, b) => a + b, 0);
      const st = status(c.n, r, c.recent.length);
      telling[st]++;
      n += c.n;
      juist += c.juist;
      cellen[l.key] = { n: c.n, juist: c.juist, pct: pct(c.juist, c.n), recent: pct(r, c.recent.length), status: st, laatst: c.laatst };
    }
    return { code, tekst: d.tekst || '', domein: d.domein || '', vak: d.vak || '', antwoorden: n, pct: pct(juist, n), telling, cellen };
  });
  return { schooljaar: logboek.schooljaar(), leerlingen: all, doelen: rows, recent: RECENT, minAntwoorden: MIN_ANTWOORDEN, status: STATUS };
}

// --- CSV voor Excel: puntkomma's en een BOM, zoals de andere resultaten ---
function cell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const csv = rows => '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n') + '\r\n';
const pad = n => String(n).padStart(2, '0');
function datum(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function slug(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'logboek';
}

function sessionCsv(id) {
  const o = session(id);
  if (!o) return null;
  const d = new Date(o.start);
  const rows = [
    ['Overzicht', o.spel], ['Bron', o.bron], ['Datum', datum(o.start)], ['Antwoorden', o.antwoorden], ['Juist', `${o.pct}%`], [],
    ['Leerling', 'Antwoorden', 'Juist', '% juist', `Extra uitleg (< ${GRENS}%)`, 'Doelen met fouten'],
    ...o.spelers.map(s => [s.naam, s.antwoorden, s.juist, `${s.pct}%`, s.antwoorden >= MIN_ANTWOORDEN && s.pct < GRENS ? 'ja' : '', s.foutDoelen.join(', ')]),
    [],
    ['Vraag', 'Doel', 'Antwoorden', '% juist', 'Fout beantwoord door'],
    ...o.vragen.map(v => [v.vraag, v.doel, v.antwoorden, `${v.pct}%`, v.fout.join(', ')]),
  ];
  if (o.doelen.length) rows.push([], ['Doel', 'Omschrijving', 'Antwoorden', '% juist'], ...o.doelen.map(x => [x.doel, x.tekst, x.antwoorden, `${x.pct}%`]));
  return { name: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_overzicht-${slug(o.spel)}-${slug(o.bron)}.csv`, text: csv(rows) };
}

// Eén doel: per leerling hoe het staat, en per vraag hoe vaak die juist was.
function doelCsv(code) {
  const k = kaart();
  const row = k.doelen.find(d => d.code === code);
  if (!row) return null;
  const vragen = new Map();
  for (const e of logboek.read()) {
    if (e.doel !== code) continue;
    const v = vragen.get(e.vraag) || vragen.set(e.vraag, { n: 0, juist: 0, spel: new Set() }).get(e.vraag);
    v.n++;
    if (e.juist) v.juist++;
    v.spel.add(e.spel);
  }
  const rows = [
    ['Doel', code], ['Omschrijving', row.tekst], ['Schooljaar', k.schooljaar], ['Antwoorden', row.antwoorden], ['Juist', `${row.pct}%`],
    ['Beheerst', `${row.telling.ok} leerlingen`], ['Bijna', `${row.telling.bijna} leerlingen`], ['Nog niet', `${row.telling.niet} leerlingen`], [],
    ['Leerling', 'Status', 'Antwoorden', 'Juist', '% juist', `% juist bij laatste ${RECENT}`, 'Laatst geoefend'],
    ...k.leerlingen.map(l => {
      const c = row.cellen[l.key];
      return c ? [l.naam, STATUS[c.status], c.n, c.juist, `${c.pct}%`, `${c.recent}%`, datum(c.laatst)] : [l.naam, 'nog niet geoefend', 0, 0, '', '', ''];
    }),
    [],
    ['Vraag', 'Spel', 'Antwoorden', '% juist'],
    ...[...vragen.entries()].sort((a, b) => pct(a[1].juist, a[1].n) - pct(b[1].juist, b[1].n)).map(([q, v]) => [q, [...v.spel].join(', '), v.n, `${pct(v.juist, v.n)}%`]),
  ];
  return { name: `doel-${code}.csv`, text: csv(rows) };
}

// De hele doelenkaart: een rij per doel, een kolom per leerling.
function kaartCsv() {
  const k = kaart();
  const rows = [
    ['Doelenkaart', klas.read().naam || ''], ['Schooljaar', k.schooljaar],
    ['Uitleg', `beheerst = minstens 80% juist bij de laatste ${RECENT} antwoorden, bijna = minstens 50%, minder dan ${MIN_ANTWOORDEN} antwoorden = te weinig antwoorden`], [],
    ['Doel', 'Omschrijving', 'Beheerst', 'Bijna', 'Nog niet', '% juist', ...k.leerlingen.map(l => l.naam)],
    ...k.doelen.map(d => [d.code, d.tekst, d.telling.ok, d.telling.bijna, d.telling.niet, `${d.pct}%`, ...k.leerlingen.map(l => (d.cellen[l.key] ? `${STATUS[d.cellen[l.key].status]} (${d.cellen[l.key].recent}%)` : ''))]),
  ];
  return { name: `doelenkaart-${k.schooljaar}.csv`, text: csv(rows) };
}

module.exports = { sessions, session, kaart, sessionCsv, doelCsv, kaartCsv, GRENS };
