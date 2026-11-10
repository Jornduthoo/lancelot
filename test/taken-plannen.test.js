// Taken plannen: een geplande taak staat al bij de leerkracht, maar de leerlingen zien ze pas vanaf dat moment.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('een geplande taak verschijnt pas op het geplande moment, of meteen met Nu al geven', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-plannen-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  const lokaal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const morgen = lokaal(new Date(Date.now() + 86400000));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const nu = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] });
    const later = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], vanaf: '${morgen}' });
    const voorbij = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Mats'], vanaf: '2020-01-01T08:30' });
    const voor = { mijn: taken.mijn('Lotte').taken.length, aantal: taken.aantal('Lotte'), vanaf: taken.lijst().find(t => t.id === later.id).vanaf, voorbij: taken.lijst().find(t => t.id === voorbij.id).vanaf };
    let dicht = '';
    try { taken.open({ id: later.id, naam: 'Lotte' }); } catch (e) { dicht = e.message; }
    taken.startNu({ id: later.id });
    return { voor, dicht, na: taken.aantal('Lotte'), gestart: taken.gestartSinds(Date.now() - 60000) };
  `);
  assert.deepStrictEqual(res.voor, { mijn: 1, aantal: 1, vanaf: morgen, voorbij: null });
  assert.ok(res.dicht);
  assert.strictEqual(res.na, 2);
  assert.strictEqual(res.gestart, false);
});
