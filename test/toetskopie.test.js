// De Proef: een kopie van de verbeterde toets per leerling (pdf) in Mijn lesmap, in een mapje per kind.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const T = require('../src/toetskopie');

test('toetskopie: een mapje per leerling, met een naam die overal mag', () => {
  assert.equal(T.veilig('Ann/Sofie: "B"?'), 'Ann Sofie B');
  assert.equal(T.veilig('  ...  '), 'zonder naam');
  const p = T.pad('/lesmap', { naam: 'Ada', datum: '2026-11-19T09:12:00.000Z', titel: 'Breuken: blok 3' });
  assert.equal(p, path.join('/lesmap', 'Toetsen per leerling', 'Ada', '2026-11-19 Breuken blok 3.pdf'));
  const k = T.pad('/lesmap', { klas: '6B', naam: 'Ada', datum: '2026-11-19T09:12:00.000Z', titel: 't' });
  assert.equal(k, path.join('/lesmap', 'Toetsen per leerling', '6B', 'Ada', '2026-11-19 t.pdf'));
});

test('toetskopie: zonder lesmap of zonder browser een melding, geen fout', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetskopie-'));
  const run = code => JSON.parse(execFileSync(process.execPath, ['-e', `
    const T = require('./src/toetskopie'), settings = require('./src/settings');
    (async () => { ${code} })().then(r => process.stdout.write('\\n@@' + JSON.stringify(r)));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_BROWSER: '' }, encoding: 'utf8' }).split('\n@@').pop());
  const rec = JSON.stringify({ title: 't', datum: new Date().toISOString(), spelers: [{ naam: 'Ada' }] });
  const zonder = run(`return T.maak({ rec: ${rec}, url: () => '' });`);
  assert.equal(zonder.gemaakt, 0);
  assert.match(zonder.fout, /Mijn lesmap/);
  const weg = run(`settings.write({ lesmap: ${JSON.stringify(path.join(data, 'bestaat-niet'))} }); return T.maak({ rec: ${rec}, url: () => '' });`);
  assert.match(weg.fout, /niet te vinden/);
  const aan = run(`T.zet(true); return T.view();`);
  assert.equal(aan.aan, true);
});

test('toetskopie: ontbreekt zegt of de pdf van een leerling nog niet in de lesmap staat (om in te halen)', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetskopie-ontbreekt-'));
  const lesmap = path.join(data, 'lesmap');
  fs.mkdirSync(lesmap);
  const out = execFileSync(process.execPath, ['-e', `
    const T = require('./src/toetskopie'), settings = require('./src/settings'), fs = require('fs'), path = require('path');
    const rec = { title: 'Taal', datum: '2026-11-20T08:00:00Z', spelers: [{ naam: 'Ada' }, { naam: 'Bo' }] };
    const r = [T.ontbreekt(rec, '')];
    settings.write({ lesmap: ${JSON.stringify(lesmap)}, toetsKopie: true });
    r.push(T.ontbreekt(rec, ''));
    for (const s of rec.spelers) { const p = T.pad(${JSON.stringify(lesmap)}, { naam: s.naam, datum: rec.datum, titel: rec.title }); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 'pdf'); }
    r.push(T.ontbreekt(rec, ''));
    process.stdout.write('\\n@@' + JSON.stringify(r));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  assert.deepStrictEqual(JSON.parse(out), [false, true, false]);
});
