// De Postduif: een brief voor thuis, per leerling. Zoals het puntenboek van een schoolplatform en de berichtjes van een
// klasapp samen, maar zonder ouderaccounts en zonder cloud: LANcelot maakt het blad, de leerkracht drukt het af of
// bewaart het als PDF en stuurt het zelf (bv. als bijlage in een bericht aan de ouders).
// In de brief: de toetsen van de periode (met de verbeterde toets erbij), wat al lukt en wat nog oefenen (uit het logboek),
// de Eer en de complimentjes, het klasnieuws met foto's en een persoonlijk woordje.
// Bewaard in postduif/ bij de gegevens (brief-<id>.json): punten en berichten blijven op deze pc, nooit naar de lesmap.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const gegevens = require('./gegevens');
const klas = require('./klas');
const proeven = require('./proeven');
const logboek = require('./logboek');
const doelen = require('./doelen');
const burchten = require('./burchten');

const DIR = gegevens.pad('postduif');
const ID = /^[a-f0-9]{8}$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FOTOS = 3;
const MIN_DOEL = 3; // zo weinig antwoorden op een doel: nog niets over zeggen
const TOON = { toetsen: true, verbeterd: true, gemiddelde: true, doelen: true, eer: true, oefenen: true, nieuws: true, strookje: true };

const tekst = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x09\x0b-\x1f]/g, ' ').trim().slice(0, max);
const regel = (v, max) => tekst(v, max).replace(/\n/g, ' ');
const nieuwId = () => crypto.randomBytes(4).toString('hex');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const half = n => Math.round(n * 2) / 2;
const p2 = n => String(n).padStart(2, '0');
const dag = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const lokaleDag = t => dag(new Date(t));

function lees(naam, leeg) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, naam), 'utf8')); } catch { return leeg; }
}
function schrijf(naam, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const doel = path.join(DIR, naam);
  fs.writeFileSync(`${doel}.tmp`, JSON.stringify(data));
  fs.renameSync(`${doel}.tmp`, doel);
}
const bestand = id => {
  if (!ID.test(String(id))) throw new Error('Die brief bestaat niet.');
  return `brief-${id}.json`;
};

function schoon(b, id) {
  const toon = {};
  for (const [k, v] of Object.entries(TOON)) toon[k] = b && b.toon && typeof b.toon[k] === 'boolean' ? b.toon[k] : v;
  const woordje = {};
  for (const [k, v] of Object.entries((b && b.woordje) || {})) if (/^[\w-]{1,24}$/.test(k) && tekst(v, 800)) woordje[k] = tekst(v, 800);
  const fotos = (Array.isArray(b && b.fotos) ? b.fotos : [])
    .filter(f => typeof f === 'string' && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(f) && f.length < 500e3).slice(0, MAX_FOTOS);
  return {
    id,
    titel: regel(b && b.titel, 60) || 'Brief voor thuis',
    van: DATUM.test((b && b.van) || '') ? b.van : '',
    tot: DATUM.test((b && b.tot) || '') ? b.tot : '',
    nieuws: tekst(b && b.nieuws, 2000),
    fotos,
    woordje,
    toon,
    afzender: regel(b && b.afzender, 60),
    gewijzigd: (b && b.gewijzigd) || new Date().toISOString(),
  };
}

function lijst() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => /^brief-[a-f0-9]{8}\.json$/.test(f)).map(f => {
    const b = lees(f, null);
    return b ? { id: f.slice(6, 14), titel: b.titel, van: b.van, tot: b.tot, gewijzigd: b.gewijzigd } : null;
  }).filter(Boolean).sort((a, b) => (b.tot || '').localeCompare(a.tot || '') || (b.gewijzigd || '').localeCompare(a.gewijzigd || ''));
}

// Een nieuwe brief: standaard de voorbije week. De afzender en wat erin staat, nemen we over van de vorige brief.
function nieuw({ van, tot } = {}) {
  const vorig = lijst()[0];
  const oud = vorig ? lees(bestand(vorig.id), {}) : {};
  const nu = new Date();
  const id = nieuwId();
  const b = schoon({
    titel: `Brief van ${nu.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}`,
    van: van || dag(new Date(nu.getTime() - 6 * 86400000)), tot: tot || dag(nu),
    toon: oud.toon, afzender: oud.afzender,
  }, id);
  if (b.van > b.tot) throw new Error('De eerste dag ligt na de laatste dag.');
  schrijf(bestand(id), b);
  return laad(id);
}

function bewaar(data) {
  const id = data && data.id;
  if (!lees(bestand(id), null)) throw new Error('Die brief bestaat niet meer.');
  const b = schoon({ ...data, gewijzigd: new Date().toISOString() }, id);
  if (b.van && b.tot && b.van > b.tot) throw new Error('De eerste dag ligt na de laatste dag.');
  schrijf(bestand(id), b);
  return { gewijzigd: b.gewijzigd };
}

function verwijder(id) {
  const bin = path.join(DIR, '_prullenbak');
  fs.mkdirSync(bin, { recursive: true });
  fs.renameSync(path.join(DIR, bestand(id)), path.join(bin, `${Date.now()}-${bestand(id)}`));
}

// ---------- Wat er in de brief van elke leerling komt ----------

// De toetsen uit De Proef in de periode: per leerling de punten, en het klasgemiddelde.
function toetsen(van, tot) {
  const uit = [];
  for (const a of proeven.afnames()) {
    const d = lokaleDag(a.datum);
    if (d < van || d > tot) continue;
    let rec;
    try { rec = proeven.laadAfname(a.file); } catch { continue; }
    const per = {};
    const pcts = [];
    rec.spelers.forEach((s, i) => {
      const l = klas.match(s.naam);
      const st = proeven.stand(rec, s);
      if (!st.max) return;
      pcts.push(st.punten / st.max);
      if (l) per[l.id] = { speler: i, punten: half(st.punten), max: st.max, pct: pct(st.punten, st.max), open: st.open, niveau: s.niveau };
    });
    uit.push({ file: a.file, titel: rec.title, datum: d, klas: pcts.length > 2 ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length * 100) : null, per });
  }
  return uit.sort((x, y) => x.datum.localeCompare(y.datum));
}

// Uit het logboek: hoeveel geoefend, en per doel of het al lukt (de laatste antwoorden op dat doel).
function oefenen(van, tot, leerlingen) {
  const per = new Map(leerlingen.map(l => [l.id, { n: 0, juist: 0, dagen: new Set(), doelen: new Map() }]));
  for (const e of logboek.read()) {
    if (!e.leerling || e.leeg || !per.has(e.leerling)) continue;
    const d = lokaleDag(e.t);
    if (d < van || d > tot) continue;
    const s = per.get(e.leerling);
    s.n++;
    if (e.juist) s.juist++;
    s.dagen.add(d);
    if (!e.doel || !doelen.scoort(e.doel)) continue;
    const x = s.doelen.get(e.doel) || s.doelen.set(e.doel, []).get(e.doel);
    x.push(e.juist ? 1 : 0);
  }
  const uit = {};
  for (const [id, s] of per) {
    const lukt = [];
    const oefen = [];
    for (const [code, r] of s.doelen) {
      if (r.length < MIN_DOEL) continue;
      const laatste = r.slice(-10);
      const p = pct(laatste.reduce((a, b) => a + b, 0), laatste.length);
      const doc = doelen.find(code) || {};
      const item = { code, tekst: regel(doc.tekst || code, 160), vak: doc.vak || '', pct: p, n: r.length };
      if (p >= 80) lukt.push(item);
      else if (p < 60) oefen.push(item);
    }
    lukt.sort((a, b) => b.n - a.n || b.pct - a.pct);
    oefen.sort((a, b) => a.pct - b.pct || b.n - a.n);
    uit[id] = { vragen: s.n, pct: pct(s.juist, s.n), dagen: s.dagen.size, lukt: lukt.slice(0, 4), oefen: oefen.slice(0, 3) };
  }
  return uit;
}

// Alles voor de brieven van één periode: de brief zelf en per leerling wat erin komt.
function laad(id) {
  const b = schoon(lees(bestand(id), null) || (() => { throw new Error('Die brief bestaat niet meer.'); })(), id);
  const k = klas.read();
  const van = b.van || '0000-00-00';
  const tot = b.tot || '9999-99-99';
  const t = toetsen(van, tot);
  const oef = oefenen(van, tot, k.leerlingen);
  const leerlingen = k.leerlingen.map(l => ({
    id: l.id,
    naam: l.naam,
    toetsen: t.filter(x => x.per[l.id]).map(x => ({ file: x.file, titel: x.titel, datum: x.datum, klas: x.klas, ...x.per[l.id] })),
    oefenen: oef[l.id],
    eer: burchten.periode(l.id, van, tot),
  }));
  return { brief: b, klas: { naam: k.naam, leerjaar: k.leerjaar }, leerlingen, toetsen: t.length };
}

module.exports = { DIR, lijst, nieuw, laad, bewaar, verwijder };
