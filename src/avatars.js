// De ridders die leerlingen zelf samenstellen, bewaard op naam in avatars.json (naast de quizzen).
// Zo krijgt een leerling in elke les en elk spel dezelfde ridder.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const FILE = gegevens.pad('avatars.json');
const KEYS = {
  helm: 10, accent: 10, kleur: 10, vizier: 5, patroon: 6, schild: 8, wapen: 7, huid: 5,
  type: 2, haar: 6, haarkleur: 7, harnas: 5, rug: 5, arm: 2, runen: 5,
};
const MAX = 2000;

let all = null;

function load() {
  if (all) return all;
  try {
    all = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
  } catch {
    all = {};
  }
  return all;
}

function clean(av) {
  if (!av || typeof av !== 'object') return null;
  const out = {};
  for (const [k, n] of Object.entries(KEYS)) {
    // Ridders van een oudere versie missen nieuwere keuzes: dan de eerste.
    const v = av[k] === undefined ? 0 : Number(av[k]);
    if (!Number.isInteger(v) || v < 0 || v >= n) return null;
    out[k] = v;
  }
  return out;
}

const sleutel = name => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20).toLowerCase();

// De bewaarde ridder van één leerling (of null). De gsm of Chromebook neemt hem over bij het aanmelden,
// zodat een nieuw adres van de bord-pc, een andere Chromebook of een gewiste browser nooit een nieuwe ridder geeft.
function get(name) {
  const key = sleutel(name);
  return (key && load()[key]) || null;
}

function bewaar() {
  try {
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(all));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Ridders bewaren mislukt:', err.message);
  }
}

// Geeft true als er iets veranderde.
function set(name, avatar) {
  const key = sleutel(name);
  const av = clean(avatar);
  if (!key || !av) return false;
  const map = load();
  if (JSON.stringify(map[key]) === JSON.stringify(av)) return false;
  delete map[key];
  map[key] = av;
  // Niet eindeloos laten groeien: de oudste eruit.
  const keys = Object.keys(map);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete map[k];
  bewaar();
  return true;
}

// Tot november 2026 stond de ridder eerst in de browser. Kreeg de bord-pc een nieuw adres, dan was die browser leeg:
// de leerling kreeg een willekeurige ridder en die overschreef de echte op de pc. Eenmalig herstel:
// per leerling de ridder die in de dagelijkse back-ups het vaakst voorkomt (minstens twee keer), als die verschilt van nu.
// oud = lijst van avatars.json-inhoud uit back-ups. Geeft de namen terug die hersteld zijn.
function herstel(oud, huidig = load()) {
  const hersteld = [];
  for (const key of Object.keys(huidig)) {
    const tel = new Map();
    for (const map of oud) {
      const av = map && typeof map === 'object' ? clean(map[key]) : null;
      if (!av) continue;
      const j = JSON.stringify(av);
      tel.set(j, (tel.get(j) || 0) + 1);
    }
    let best = null;
    let n = 1;
    for (const [j, c] of tel) if (c > n) { best = j; n = c; }
    if (!best || best === JSON.stringify(clean(huidig[key]))) continue;
    huidig[key] = JSON.parse(best);
    hersteld.push(key);
  }
  return hersteld;
}

// Bij het opstarten, één keer per gegevensmap: de ridders uit de automatische back-ups terughalen.
// krans(naam) = de runenkrans die de leerling verdiende: wie die kwijt is (0 op de ridder), krijgt hem terug.
function herstelUitBackups(gegevens, settings, krans = () => 0) {
  try {
    if (settings.read().riddersHersteld) return [];
    const zip = require('./zip');
    const oud = [];
    for (const b of gegevens.lijst().filter(b => b.file.startsWith('auto_'))) {
      try {
        const f = zip.read(fs.readFileSync(path.join(gegevens.backupDir(), b.file))).find(f => f.name === 'avatars.json');
        if (f) oud.push(JSON.parse(f.data.toString('utf8')));
      } catch {}
    }
    all = null;
    const map = load();
    const hersteld = herstel(oud, map);
    for (const key of Object.keys(map)) {
      const k = Number(krans(key)) || 0;
      if (k > 0 && !map[key].runen) {
        map[key] = { ...map[key], runen: Math.min(k, KEYS.runen - 1) };
        if (!hersteld.includes(key)) hersteld.push(key);
      }
    }
    if (hersteld.length) {
      bewaar();
      console.log(`  ${hersteld.length} ridder(s) teruggehaald uit de back-ups.`);
    }
    settings.write({ riddersHersteld: new Date().toISOString().slice(0, 10) });
    return hersteld;
  } catch (err) {
    console.error('Ridders terughalen lukte niet:', err.message);
    return [];
  }
}

module.exports = { all: load, get, set, clean, herstel, herstelUitBackups };
