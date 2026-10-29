// De klaslijst, alleen op deze pc opgeslagen in klas/klas.json (staat in .gitignore).
// Leerlingen tikken bij het aanmelden hun naam aan, zodat hun antwoorden in elk spel bij dezelfde leerling horen.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const niveaus = require('./niveaus');
const doelen = require('./doelen');

const DIR = gegevens.pad('klas');
const FILE = path.join(DIR, 'klas.json');
const MAX = 40;
// Mee met Mijn lesmap: alleen de namen en niveaus (geen id's, geen notities), zodat je thuis taken per kind klaarzet.
const LESMAP = path.join(DIR, 'lesmap');
const LIJST = path.join(LESMAP, 'klaslijst.json');

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { naam: data.naam || '', leerjaar: doelen.leerjaar(data.leerjaar || 6), leerlingen: Array.isArray(data.leerlingen) ? data.leerlingen : [] };
  } catch {
    return { naam: '', leerjaar: 6, leerlingen: [] };
  }
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
}

// Een leerling die al op de lijst stond, houdt zijn id: zo blijft het logboek kloppen als je de lijst aanpast.
function write({ naam, leerjaar, namen } = {}) {
  const before = read().leerlingen;
  const seen = new Set();
  const leerlingen = [];
  for (const raw of Array.isArray(namen) ? namen : []) {
    const name = cleanName(raw);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const old = before.find(l => l.naam.toLowerCase() === name.toLowerCase());
    // Ook het niveau (Page, Schildknaap of Ridder) en de niveaus per vak blijven bewaard.
    leerlingen.push({
      id: old ? old.id : Math.random().toString(36).slice(2, 10), naam: name,
      ...(old && old.niveau ? { niveau: old.niveau } : {}),
      ...(old && old.vakNiveaus ? { vakNiveaus: old.vakNiveaus } : {}),
    });
  }
  if (leerlingen.length > MAX) throw new Error(`Een klas mag hooguit ${MAX} leerlingen hebben.`);
  const data = { naam: String(naam || '').trim().slice(0, 40), leerjaar: doelen.leerjaar(leerjaar), leerlingen };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

// Het niveau waarop een leerling oefent. Zonder vak: het algemene niveau (Schildknaap wordt niet bewaard).
// Met een vakgroep (wiskunde, nederlands, frans, wo): het niveau voor dat vak, of leeg = zoals het algemene niveau.
function setNiveau(id, niveau, vak) {
  const data = read();
  const leerling = data.leerlingen.find(l => l.id === id);
  if (!leerling) throw new Error('Die leerling staat niet meer op de lijst.');
  const n = niveaus.clean(niveau);
  if (vak) {
    if (!niveaus.VAKGROEPEN.some(g => g.id === vak)) throw new Error('Dat vak kent LANcelot niet.');
    const per = { ...(leerling.vakNiveaus || {}) };
    if (n) per[vak] = n;
    else delete per[vak];
    if (Object.keys(per).length) leerling.vakNiveaus = per;
    else delete leerling.vakNiveaus;
  } else if (n && n !== 'schildknaap') leerling.niveau = n;
  else delete leerling.niveau;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

function names() {
  return read().leerlingen.map(l => l.naam);
}

// De leerling op de lijst met deze naam (hoofdletters maken niet uit), of null.
// Spellen vragen dit bij elke vraag op: de lijst wordt pas opnieuw gelezen als het bestand veranderde.
let cache = { mtime: -1, list: [] };
function match(name) {
  const key = cleanName(name).toLowerCase();
  let mtime = 0;
  try { mtime = fs.statSync(FILE).mtimeMs; } catch {}
  if (mtime !== cache.mtime) cache = { mtime, list: read().leerlingen };
  return cache.list.find(l => l.naam.toLowerCase() === key) || null;
}

// Het niveau van een leerling voor een vak uit de doelen ('Wiskunde', 'Geschiedenis' ...).
// Zonder eigen niveau voor dat vak: het algemene niveau, en anders Schildknaap.
function niveauVoor(leerling, vak) {
  if (!leerling) return 'schildknaap';
  const g = niveaus.groep(vak);
  return niveaus.clean(g && leerling.vakNiveaus && leerling.vakNiveaus[g]) || niveaus.clean(leerling.niveau) || 'schildknaap';
}

// ---------- Mee met Mijn lesmap ----------

function lesmapTekst(data) {
  const leerlingen = data.leerlingen.map(l => ({
    naam: l.naam, ...(l.niveau ? { niveau: l.niveau } : {}), ...(l.vakNiveaus ? { vakNiveaus: l.vakNiveaus } : {}),
  }));
  return JSON.stringify({ naam: data.naam, leerjaar: data.leerjaar, leerlingen }, null, 2) + '\n';
}

function lesmapGeldig(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.leerlingen) || !d.leerlingen.length || d.leerlingen.length > MAX
    || d.leerlingen.some(l => !l || !cleanName(l.naam))) throw new Error('Ongeldige klaslijst.');
}

// Voor het synchroniseren: de klaslijst van deze pc in de lesmap-map zetten (een lege lijst nooit).
function naarLesmap() {
  const data = read();
  if (!data.leerlingen.length) return;
  const text = lesmapTekst(data);
  let oud = '';
  try { oud = fs.readFileSync(LIJST, 'utf8'); } catch {}
  if (oud === text) return;
  fs.mkdirSync(LESMAP, { recursive: true });
  fs.writeFileSync(LIJST, text);
}

// Na het synchroniseren: kwam er een andere klaslijst binnen, dan wordt dat de klaslijst hier.
// Een leerling die hier al stond, houdt zijn id (en dus zijn logboek). Geeft terug of er iets veranderde.
function uitLesmap() {
  let d;
  try { d = JSON.parse(fs.readFileSync(LIJST, 'utf8')); lesmapGeldig(d); } catch { return false; }
  const data = read();
  if (lesmapTekst(data) === lesmapTekst({ naam: String(d.naam || '').trim().slice(0, 40), leerjaar: doelen.leerjaar(d.leerjaar || 6), leerlingen: d.leerlingen.map(l => ({ ...l, naam: cleanName(l.naam) })) })) return false;
  const seen = new Set();
  const leerlingen = [];
  for (const l of d.leerlingen) {
    const naam = cleanName(l.naam);
    if (!naam || seen.has(naam.toLowerCase())) continue;
    seen.add(naam.toLowerCase());
    const old = data.leerlingen.find(o => o.naam.toLowerCase() === naam.toLowerCase());
    const niveau = niveaus.clean(l.niveau);
    const per = {};
    for (const g of niveaus.VAKGROEPEN) if (l.vakNiveaus && niveaus.clean(l.vakNiveaus[g.id])) per[g.id] = niveaus.clean(l.vakNiveaus[g.id]);
    leerlingen.push({
      id: old ? old.id : Math.random().toString(36).slice(2, 10), naam,
      ...(niveau && niveau !== 'schildknaap' ? { niveau } : {}), ...(Object.keys(per).length ? { vakNiveaus: per } : {}),
    });
  }
  const nieuw = { naam: String(d.naam || '').trim().slice(0, 40), leerjaar: doelen.leerjaar(d.leerjaar || 6), leerlingen };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(nieuw, null, 2) + '\n');
  return true;
}

// Twee verschillende klaslijsten (bv. de eerste keer koppelen): samenvoegen, nooit iemand schrappen.
function lesmapSamen(hier, daar) {
  const a = JSON.parse(hier), b = JSON.parse(daar);
  const namen = new Set(b.leerlingen.map(l => cleanName(l.naam).toLowerCase()));
  const leerlingen = b.leerlingen.map(l => a.leerlingen.find(x => cleanName(x.naam).toLowerCase() === cleanName(l.naam).toLowerCase()) || l);
  for (const l of a.leerlingen) if (!namen.has(cleanName(l.naam).toLowerCase())) leerlingen.push(l);
  return JSON.stringify({ naam: a.naam || b.naam, leerjaar: a.leerjaar || b.leerjaar, leerlingen: leerlingen.slice(0, MAX) }, null, 2) + '\n';
}

module.exports = { read, write, setNiveau, niveauVoor, names, match, LESMAP, naarLesmap, uitLesmap, lesmapGeldig, lesmapSamen };
