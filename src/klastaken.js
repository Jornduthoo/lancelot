// De Wachtlijst in de Wapenkamer: de klastaken en wie ze deze week doet.
// Bewaard naast de klaslijst in klas/klastaken.json (zit dus mee in elke back-up).
// De server bewaart alleen; het scherm rekent uit wie welke taak heeft.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const FILE = path.join(gegevens.pad('klas'), 'klastaken.json');
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

function read() {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return {
      taken: Array.isArray(d.taken) ? d.taken : STANDAARD,
      volgorde: Array.isArray(d.volgorde) ? d.volgorde : [],
      stap: Number.isInteger(d.stap) ? d.stap : 0,
      sinds: typeof d.sinds === 'string' ? d.sinds : maandag(),
      auto: d.auto !== false,
    };
  } catch {
    return { taken: STANDAARD, volgorde: [], stap: 0, sinds: maandag(), auto: true };
  }
}

function write(data = {}) {
  const taken = (Array.isArray(data.taken) ? data.taken : [])
    .map(t => ({ naam: String((t && t.naam) || '').trim().replace(/\s+/g, ' ').slice(0, 30), aantal: Math.max(1, Math.min(6, parseInt(t && t.aantal, 10) || 1)) }))
    .filter(t => t.naam)
    .slice(0, MAX_TAKEN);
  const volgorde = (Array.isArray(data.volgorde) ? data.volgorde : []).filter(id => typeof id === 'string' && id.length <= 20).slice(0, 60);
  const schoon = {
    taken,
    volgorde,
    stap: Number.isInteger(data.stap) ? data.stap % 10000 : 0,
    sinds: /^\d{4}-\d{2}-\d{2}$/.test(data.sinds) ? data.sinds : maandag(),
    auto: data.auto !== false,
  };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(schoon, null, 2) + '\n');
  return schoon;
}

module.exports = { read, write };
