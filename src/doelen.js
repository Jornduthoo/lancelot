// Leerplandoelen uit Op.stap, één JSON-bestand per vak en leerjaar in de map doelen/.
// Een doelcode ziet er zo uit: 2.1.GL6.4 = wiskunde (2), domein 1, G-doel, 6e leerjaar, doel 4.
// Plusdoelen hebben een + in plaats van de G: 2.1.+L6.3.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'doelen');
const CODE = /^\d+(-\d+)?\.\d+\.[GPS+A][LF]\d+\.\d+$/;

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

module.exports = { all, find, clean };
