// Drie niveaus voor oefenbladen en quizzen, zodat elke leerling op zijn eigen hoogte oefent:
//   page         met hulp (voorbeelden, woordenbank, kleinere stappen)
//   schildknaap  het doel zelf (het gewone blad of de gewone vragen)
//   ridder       uitdaging (moeilijker, toepassen, uitbreiden)
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const NIVEAUS = ['page', 'schildknaap', 'ridder'];
const NAMES = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };

function clean(value) {
  const n = String(value || '').trim().toLowerCase();
  return NIVEAUS.includes(n) ? n : '';
}

// Een leerling kan per vak op een ander niveau zitten (Page voor wiskunde, Schildknaap voor Nederlands).
// WO bundelt aardrijkskunde, geschiedenis en wetenschap en techniek. Andere vakken volgen het algemene niveau.
const STANDAARD = [
  { id: 'wiskunde', naam: 'Wiskunde', vakken: ['Wiskunde'] },
  { id: 'nederlands', naam: 'Nederlands', vakken: ['Nederlands'] },
  { id: 'frans', naam: 'Frans', vakken: ['Frans'] },
  { id: 'wo', naam: 'WO', vakken: ['Aardrijkskunde', 'Geschiedenis', 'Wetenschap en techniek'] },
];

// Eigen vakken per school (verbeterpunten 20 nov, 8): toevoegen, hernoemen, verbergen. Een vak verdwijnt nooit echt:
// verborgen = niet in de kolommen, maar de niveaus van de leerlingen blijven bewaard. Gaat mee met Mijn lesmap.
const DIR = () => gegevens.pad('vakken');
const FILE = () => path.join(DIR(), 'vakken.json');
const schoonNaam = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
const ID = /^[a-z0-9-]{1,40}$/;

function schoon(d) {
  const uit = [];
  const gezien = new Set();
  for (const g of (d && Array.isArray(d.groepen) ? d.groepen : [])) {
    if (!g || !ID.test(String(g.id)) || gezien.has(g.id)) continue;
    const naam = schoonNaam(g.naam);
    if (!naam) continue;
    gezien.add(g.id);
    const vakken = [...new Set((Array.isArray(g.vakken) ? g.vakken : []).map(schoonNaam).filter(Boolean))].slice(0, 30);
    uit.push({ id: g.id, naam, vakken: vakken.length ? vakken : [naam], ...(g.uit ? { uit: true } : {}) });
  }
  // De vaste vakken blijven altijd bestaan (desnoods verborgen): oude niveaus en taken blijven kloppen.
  for (const g of STANDAARD) if (!gezien.has(g.id)) uit.push({ ...g, vakken: [...g.vakken] });
  return uit;
}

// Hooguit eens per seconde naar het bestand kijken: de lijst van taken vraagt dit per leerling en per taak op
// (sneller laden, 26 nov). Een wijziging (hier of via Mijn lesmap) is er dus binnen de seconde.
let memo = { file: '', mtime: -1, lijst: STANDAARD, gekeken: 0 };
const KIJK_MS = 1000;
function alle() {
  const nu = Date.now();
  if (memo.file && nu - memo.gekeken < KIJK_MS && nu >= memo.gekeken) return memo.lijst;
  let mtime = 0;
  try { mtime = fs.statSync(FILE()).mtimeMs; } catch {}
  if (mtime !== memo.mtime || memo.file !== FILE()) {
    let d = null;
    try { d = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch {}
    memo = { file: FILE(), mtime, lijst: d ? schoon(d) : STANDAARD.map(g => ({ ...g, vakken: [...g.vakken] })) };
  }
  memo.gekeken = nu;
  return memo.lijst;
}
const zichtbaar = () => alle().filter(g => !g.uit);

function geldig(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.groepen)) throw new Error('Ongeldige vakken.');
}

function bewaar(groepen) {
  const lijst = schoon({ groepen });
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ groepen: lijst, gewijzigd: new Date().toISOString() }, null, 2) + '\n');
  memo.mtime = -1;
  memo.gekeken = 0;
  return alle();
}

// Een nieuw vak: een id uit de naam, uniek.
function nieuw(naam) {
  const n = schoonNaam(naam);
  if (!n) throw new Error('Typ een naam voor het vak.');
  const basis = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'vak';
  const ids = new Set(alle().map(g => g.id));
  let id = basis, i = 2;
  while (ids.has(id)) id = `${basis}-${i++}`;
  return bewaar([...alle(), { id, naam: n, vakken: [n] }]);
}

// Twee pc's passen tegelijk de vakken aan (via Mijn lesmap, een trage gedeelde map): samenvoegen, niets gaat verloren.
// Een vak verdwijnt nooit (alleen verbergen), dus alles van beide kanten blijft. Staat een vak aan beide kanten,
// dan wint de laatst bewaarde lijst (hernoemen of verbergen), en die bepaalt ook de volgorde.
function samen(hier, daar) {
  const a = JSON.parse(hier), b = JSON.parse(daar);
  const [nieuw, oud] = String(a.gewijzigd || '') >= String(b.gewijzigd || '') ? [a, b] : [b, a];
  const groepen = schoon({ groepen: [...(nieuw.groepen || []), ...(oud.groepen || [])] });
  return JSON.stringify({ groepen, gewijzigd: nieuw.gewijzigd || oud.gewijzigd || new Date().toISOString() }, null, 2) + '\n';
}

// De vakgroep van een vak uit de doelen ('Geschiedenis' -> 'wo'), of '' als het vak het algemene niveau volgt.
// Een verborgen vak volgt het algemene niveau.
function groep(vak) {
  const g = zichtbaar().find(x => x.vakken.includes(vak) || x.naam === vak);
  return g ? g.id : '';
}

module.exports = {
  NIVEAUS, NAMES, STANDAARD, DIR, clean, groep, alle, bewaar, nieuw, geldig, samen,
  // De vakken in de kolommen (zonder de verborgen).
  get VAKGROEPEN() { return zichtbaar(); },
};
