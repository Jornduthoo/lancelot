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

// Geeft true als er iets veranderde.
function set(name, avatar) {
  const key = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20).toLowerCase();
  const av = clean(avatar);
  if (!key || !av) return false;
  const map = load();
  if (JSON.stringify(map[key]) === JSON.stringify(av)) return false;
  delete map[key];
  map[key] = av;
  // Niet eindeloos laten groeien: de oudste eruit.
  const keys = Object.keys(map);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete map[k];
  try {
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(map));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Ridders bewaren mislukt:', err.message);
  }
  return true;
}

module.exports = { all: load, set, clean };
