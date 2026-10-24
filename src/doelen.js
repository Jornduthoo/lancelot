// Leerplandoelen uit Op.stap, één JSON-bestand per vak en leerjaar in de map doelen/.
// Een doelcode ziet er zo uit: 2.1.GL6.4 = wiskunde (2), domein 1, G-doel, 6e leerjaar, doel 4.
// Plusdoelen hebben een + in plaats van de G: 2.1.+L6.3. Kleuterdoelen: JK (jongste kleuter), K2 en K3, bv. 2.1.GK3.5.
// SEL, leren leren en godsdienst hebben "score": false: die doelen zijn voor gesprekken (Ronde Tafel), niet voor punten.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'doelen');
const CODE = /^\d+(-\d+)?\.\d+\.[GPS+A]([LF]\d+|JK|K\d)\.\d+$/;

// Alle leerjaren waarvoor doelen kunnen bestaan, van jong naar oud. De naam past bij de niveaus in de quizmaker.
const LEERJAREN = [
  { id: 'JK', naam: '1e kleuterklas' },
  { id: 'K2', naam: '2e kleuterklas' },
  { id: 'K3', naam: '3e kleuterklas' },
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: n, naam: `${n}e leerjaar` })),
];

let cache = null;

function all() {
  if (cache) return cache;
  cache = [];
  if (!fs.existsSync(DIR)) return cache;
  for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
      for (const d of data.doelen || []) if (CODE.test(d.code)) cache.push(d);
    } catch (err) {
      console.error(`Doelen in ${file} niet ingelezen:`, err.message);
    }
  }
  return cache;
}

function find(code) {
  return all().find(d => d.code === code) || null;
}

// Een doelcode uit een quiz of oefenblad: geldig, of leeg.
function clean(code) {
  const c = typeof code === 'string' ? code.trim() : '';
  return CODE.test(c) ? c : '';
}

// Een leerjaar uit een formulier of een oud bestand ('6', 6 of 'K2'), of het 6e leerjaar als het niet bestaat.
function leerjaar(value) {
  const l = LEERJAREN.find(x => String(x.id) === String(value).trim().toUpperCase());
  return l ? l.id : 6;
}

// Telt een doel mee voor scores (doelenkaart, overzicht)? Doelen voor de Ronde Tafel niet.
function scoort(code) {
  const d = find(code);
  return !d || d.score !== false;
}

module.exports = { all, find, clean, leerjaar, scoort, LEERJAREN };
