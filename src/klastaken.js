// De Wachtlijst in de Wapenkamer: de klastaken en wie ze deze week doet.
// Alles staat in klas/wachtlijst/klastaken.json: die map gaat mee met Mijn lesmap.
// De volgorde van de leerlingen staat er met namen in (niet met id's), want elke pc heeft zijn eigen klaslijst.
// Alles zit in klas/, dus mee in elke back-up. De server bewaart alleen; het scherm rekent uit wie welke taak heeft.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');

// Het oude bestand van voor de lesmap (met id's); alleen nog om over te zetten.
const FILE = path.join(gegevens.pad('klas'), 'klastaken.json');
const DIR = path.join(gegevens.pad('klas'), 'wachtlijst');
const GEDEELD = path.join(DIR, 'klastaken.json');
const MAX_TAKEN = 20;

const STANDAARD = [
  { naam: 'Bordridder', aantal: 1 },
  { naam: 'Plantenwacht', aantal: 1 },
  { naam: 'Lichtwachter', aantal: 1 },
  { naam: 'Boodschapper', aantal: 1 },
  { naam: 'Vloerpatrouille', aantal: 2 },
  { naam: 'Rijenleider', aantal: 1 },
];

function maandag(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

const lees = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

const leerlingen = () => klas.read().leerlingen;

// Namen uit de lesmap naar de id's van de klaslijst op deze pc. Wie hier niet in de klas zit, valt weg.
function naarIds(namen) {
  const vrij = [...leerlingen()];
  const ids = [];
  for (const naam of namen) {
    const i = vrij.findIndex(l => l.naam.toLowerCase() === String(naam).toLowerCase());
    if (i >= 0) ids.push(vrij.splice(i, 1)[0].id);
  }
  return ids;
}

function read() {
  const oud = lees(FILE) || {};
  // Nog geen gedeeld bestand (van voor de lesmap): alles staat dan nog in het oude bestand.
  const d = lees(GEDEELD) || oud;
  return {
    taken: Array.isArray(d.taken) ? d.taken : STANDAARD,
    volgorde: Array.isArray(d.namen) ? naarIds(d.namen) : Array.isArray(oud.volgorde) ? oud.volgorde : [],
    stap: Number.isInteger(d.stap) ? d.stap : 0,
    sinds: typeof d.sinds === 'string' ? d.sinds : maandag(),
    auto: d.auto !== false,
  };
}

// Bewaar alleen als er echt iets veranderde, zodat de lesmap geen lege wijzigingen ziet.
function bewaar(file, data) {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, text);
  fs.renameSync(`${file}.tmp`, file);
}

// Id's van deze pc naar namen. Namen die hier niet in de klas zitten (bv. op een thuis-pc zonder klaslijst),
// blijven op hun plaats staan, zodat de volgorde op het digibord niet verloren gaat.
function naarNamen(ids, vorige) {
  const klasNu = leerlingen();
  const namen = ids.map(id => (klasNu.find(l => l.id === id) || {}).naam).filter(Boolean);
  const hier = new Set(klasNu.map(l => l.naam.toLowerCase()));
  vorige.forEach((naam, i) => { if (typeof naam === 'string' && !hier.has(naam.toLowerCase())) namen.splice(Math.min(i, namen.length), 0, naam); });
  return namen.slice(0, 60);
}

const tekst = (v, max) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);

function write(data = {}) {
  const taken = (Array.isArray(data.taken) ? data.taken : [])
    .map(t => ({ naam: tekst(t && t.naam, 40), aantal: Math.max(1, Math.min(6, parseInt(t && t.aantal, 10) || 1)), uitleg: tekst(t && t.uitleg, 90) }))
    .filter(t => t.naam)
    .slice(0, MAX_TAKEN);
  const ids = (Array.isArray(data.volgorde) ? data.volgorde : []).filter(id => typeof id === 'string' && id.length <= 20).slice(0, 60);
  const vorige = (lees(GEDEELD) || {}).namen;
  const gedeeld = {
    taken,
    namen: naarNamen(ids, Array.isArray(vorige) ? vorige : []),
    stap: Number.isInteger(data.stap) ? data.stap % 10000 : 0,
    sinds: /^\d{4}-\d{2}-\d{2}$/.test(data.sinds) ? data.sinds : maandag(),
    auto: data.auto !== false,
  };
  bewaar(GEDEELD, gedeeld);
  return read();
}

// Van voor de lesmap of van voor de namen: meteen overzetten naar het gedeelde bestand, zodat alles mee kan.
const gedeeld = lees(GEDEELD);
// Zonder klaslijst (een thuis-pc) niets overzetten: dan komt de volgorde straks uit de lesmap.
if ((!gedeeld && lees(FILE) && Array.isArray(lees(FILE).taken)) || (gedeeld && !Array.isArray(gedeeld.namen) && leerlingen().length)) {
  try { write(read()); } catch {}
}

// Voor Mijn lesmap: een bestand uit de lesmap moet een lijst taken hebben.
function geldig(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.taken)) throw new Error('Ongeldig bestand.');
}

module.exports = { read, write, geldig, DIR };
