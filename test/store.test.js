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

// De Store weigerde unvirtualizedResources (beleid 10.6.3, 2026-11-19). De gegevens staan in de gewone opslag van het pakket.
test('het Store-pakket vraagt geen unvirtualizedResources en zet de virtualisatie niet uit', () => {
  const m = require('fs').readFileSync(path.join(__dirname, '..', 'installer', 'store', 'AppxManifest.xml'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!/unvirtualizedResources/.test(m));
  assert.ok(!/WriteVirtualization/.test(m));
  assert.ok(/runFullTrust/.test(m));
});

test('Verkenner krijgt in de Store-versie de echte map in de opslag van het pakket', () => {
  const code = `const s = require('./src/store');
    const env = { LOCALAPPDATA: 'C:\\\\Users\\\\Lk\\\\AppData\\\\Local' };
    const ja = () => true, nee = () => false;
    console.log(JSON.stringify([
      s.echtPad('C:\\\\Users\\\\Lk\\\\AppData\\\\Local\\\\LANcelot\\\\resultaten', env, ja),
      s.echtPad('C:\\\\Users\\\\Lk\\\\AppData\\\\Local\\\\LANcelot', env, nee),
      s.echtPad('D:\\\\Lesmap', env, ja),
    ]));`;
  const uit = JSON.parse(execFileSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env: { ...process.env, LANCELOT_STORE: '1' } }).toString());
  assert.equal(uit[0], 'C:\\Users\\Lk\\AppData\\Local\\Packages\\Jorn.Lancelot_zw3ncfn30yjat\\LocalCache\\Local\\LANcelot\\resultaten');
  assert.equal(uit[1], 'C:\\Users\\Lk\\AppData\\Local\\LANcelot');
  assert.equal(uit[2], 'D:\\Lesmap');
  // Buiten de Store verandert er niets.
  assert.equal(require('../src/store').echtPad('C:\\Users\\Lk\\AppData\\Local\\LANcelot', { LOCALAPPDATA: 'C:\\Users\\Lk\\AppData\\Local' }, () => true), 'C:\\Users\\Lk\\AppData\\Local\\LANcelot');
});
