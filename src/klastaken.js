// De Wachtlijst in de Wapenkamer: de klastaken en wie ze deze week doet.
// De taken en de beurt staan in klas/wachtlijst/klastaken.json: die map gaat mee met Mijn lesmap.
// De volgorde van de leerlingen blijft op deze pc (klas/klastaken.json), want de klaslijst synchroniseert niet.
// Alles zit in klas/, dus mee in elke back-up. De server bewaart alleen; het scherm rekent uit wie welke taak heeft.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

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
  return m.toISOString().slice(0, 10);
}

const lees = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

function read() {
  const lokaal = lees(FILE) || {};
  // Nog geen gedeeld bestand (van voor de lesmap): alles staat dan nog in het oude bestand.
  const d = lees(GEDEELD) || lokaal;
  return {
    taken: Array.isArray(d.taken) ? d.taken : STANDAARD,
    volgorde: Array.isArray(lokaal.volgorde) ? lokaal.volgorde : [],
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

function write(data = {}) {
  const taken = (Array.isArray(data.taken) ? data.taken : [])
    .map(t => ({ naam: String((t && t.naam) || '').trim().replace(/\s+/g, ' ').slice(0, 30), aantal: Math.max(1, Math.min(6, parseInt(t && t.aantal, 10) || 1)) }))
    .filter(t => t.naam)
    .slice(0, MAX_TAKEN);
  const volgorde = (Array.isArray(data.volgorde) ? data.volgorde : []).filter(id => typeof id === 'string' && id.length <= 20).slice(0, 60);
  const gedeeld = {
    taken,
    stap: Number.isInteger(data.stap) ? data.stap % 10000 : 0,
    sinds: /^\d{4}-\d{2}-\d{2}$/.test(data.sinds) ? data.sinds : maandag(),
    auto: data.auto !== false,
  };
  bewaar(GEDEELD, gedeeld);
  bewaar(FILE, { volgorde });
  return { ...gedeeld, volgorde };
}

// Van voor de lesmap: de taken uit het oude bestand meteen naar de gedeelde map, zodat ze mee kunnen.
if (!fs.existsSync(GEDEELD) && lees(FILE) && Array.isArray(lees(FILE).taken)) {
  try { write(read()); } catch {}
}

// Voor Mijn lesmap: een bestand uit de lesmap moet een lijst taken hebben.
function geldig(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.taken)) throw new Error('Ongeldig bestand.');
}

module.exports = { read, write, geldig, DIR };
