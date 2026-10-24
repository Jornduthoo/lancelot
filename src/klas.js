// De klaslijst, alleen op deze pc opgeslagen in klas/klas.json (staat in .gitignore).
// Leerlingen tikken bij het aanmelden hun naam aan, zodat hun antwoorden in elk spel bij dezelfde leerling horen.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'klas');
const FILE = path.join(DIR, 'klas.json');
const MAX = 40;

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { naam: data.naam || '', leerjaar: data.leerjaar || 6, leerlingen: Array.isArray(data.leerlingen) ? data.leerlingen : [] };
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
    leerlingen.push({ id: old ? old.id : Math.random().toString(36).slice(2, 10), naam: name });
  }
  if (leerlingen.length > MAX) throw new Error(`Een klas mag hooguit ${MAX} leerlingen hebben.`);
  const data = { naam: String(naam || '').trim().slice(0, 40), leerjaar: [5, 6].includes(Number(leerjaar)) ? Number(leerjaar) : 6, leerlingen };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

function names() {
  return read().leerlingen.map(l => l.naam);
}

// De leerling op de lijst met deze naam (hoofdletters maken niet uit), of null.
function match(name) {
  const key = cleanName(name).toLowerCase();
  return read().leerlingen.find(l => l.naam.toLowerCase() === key) || null;
}

module.exports = { read, write, names, match };
