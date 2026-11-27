// Start LANcelot.bat: staan alle onderdelen (node_modules) uit package-lock.json er?
// (Een nieuwere versie na een update installeert de server zelf, zie bijwerken.pasToe in server.js.)
// Stopt met code 0 als alles klopt, anders met 1 (dan installeert de bat ze). Veel sneller dan "npm ls" bij elke start.
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..');

function klopt() {
  let lock;
  try { lock = JSON.parse(fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8')); } catch { lock = null; }
  if (lock && lock.packages) {
    for (const [pad, info] of Object.entries(lock.packages)) {
      if (!pad.startsWith('node_modules/') || info.dev || info.optional || info.devOptional || info.link) continue;
      if (!fs.existsSync(path.join(APP, pad, 'package.json'))) return false;
    }
    return true;
  }
  // Geen package-lock.json: dan minstens de onderdelen uit package.json.
  try {
    const deps = Object.keys(JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8')).dependencies || {});
    return deps.every(d => fs.existsSync(path.join(APP, 'node_modules', d, 'package.json')));
  } catch { return false; }
}

if (require.main === module) process.exit(klopt() ? 0 : 1);
module.exports = { klopt };
