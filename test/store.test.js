// De versie uit de Microsoft Store: proefmaand, gekocht of verlopen (src/store.js). Zonder store.json verandert er niets.
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const path = require('path');
const { beoordeel, ACTIEF } = require('../src/store');

const NU = Date.parse('2026-11-05T12:00:00Z');
const DAG = 24 * 60 * 60 * 1000;

test('zonder store.json is er geen Store-versie en geen proefperiode', () => {
  assert.equal(ACTIEF, false);
  assert.equal(require('../src/bijwerken').view().store, undefined);
});

test('de licentie van de Store wordt juist gelezen', () => {
  assert.deepEqual(beoordeel({ active: true, trial: false, expires: '9999-12-31T00:00:00Z' }, NU), { soort: 'volledig' });
  const proef = beoordeel({ active: true, trial: true, expires: new Date(NU + 20.5 * DAG).toISOString() }, NU);
  assert.equal(proef.soort, 'proef');
  assert.equal(proef.dagen, 21);
  assert.equal(beoordeel({ active: true, trial: true, expires: new Date(NU - 1000).toISOString() }, NU).soort, 'verlopen');
  assert.equal(beoordeel({ active: false, trial: true, expires: new Date(NU - DAG).toISOString() }, NU).soort, 'verlopen');
  assert.equal(beoordeel({ active: false, trial: false, expires: '' }, NU).soort, 'verlopen');
  // Een proef die nooit verloopt: geen aftelling.
  assert.equal(beoordeel({ active: true, trial: true, expires: '9999-12-31T00:00:00Z' }, NU).dagen, null);
  // Niets bekend (bv. PowerShell geblokkeerd en nog nooit gecontroleerd): niets blokkeren.
  assert.equal(beoordeel(null, NU).soort, 'onbekend');
});

test('in de Store-versie zijn eigen updates uit en volgt het blokkeren de licentie', () => {
  const code = `
    const store = require('./src/store');
    const b = require('./src/bijwerken');
    if (!store.ACTIEF || !b.view().store || b.pasToe() !== null) process.exit(2);
    b.zoek().then(() => process.exit(3), () => store.controleer().then(v => process.exit(v.soort === 'verlopen' && store.geblokkeerd() ? 0 : 4)));`;
  const env = { ...process.env, LANCELOT_STORE: '1', LANCELOT_DATA: require('fs').mkdtempSync(path.join(require('os').tmpdir(), 'lc-store-')),
    LANCELOT_STORE_LICENTIE: JSON.stringify({ active: false, trial: true, expires: '2026-01-01T00:00:00Z' }) };
  execFileSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, stdio: 'pipe' });
});
