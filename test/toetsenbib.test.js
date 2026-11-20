// Toetsenbibliotheek (wensenlijst 20 nov, punt 7): vak, gewijzigd, gegeven op (bord en taak) en dubbels in de lijst.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('toetsenlijst: vak, gegeven op en dubbels', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsenbib-'));
  const out = execFileSync(process.execPath, ['-e', `
    const proeven = require('./src/proeven'), taken = require('./src/taken'), klas = require('./src/klas');
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Ada'] });
    const K = proeven.K;
    const t = K.validate({ titel: 'Frans 1', vragen: [{ type: 'kort', vraag: 'bonjour?', antwoord: 'hallo', punten: 1, doel: '10.1.GL5.1' }] });
    proeven.save(t, 'frans1.json');
    proeven.save({ ...t, title: 'Frans 1 kopie' }, 'kopie.json');
    proeven.save(K.validate({ titel: 'Ander', vragen: [{ type: 'kort', vraag: 'x?', antwoord: 'y', punten: 1 }] }), 'ander.json');
    proeven.bewaarAfname({ title: 'Ander', datum: '2026-11-02T08:00:00Z', toetsFile: 'ander.json', toets: t, spelers: [], klaar: true });
    taken.maak({ soort: 'proef', file: 'frans1.json', namen: ['Ada'] });
    const l = Object.fromEntries(proeven.list().map(q => [q.file, q]));
    process.stdout.write('\\n@@' + JSON.stringify(l));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const l = JSON.parse(out);
  assert.strictEqual(l['frans1.json'].vak, 'Frans');
  assert.strictEqual(l['frans1.json'].gegeven.length, 1, 'als taak gegeven');
  assert.deepStrictEqual(l['ander.json'].gegeven, ['2026-11-02'], 'op het bord afgenomen');
  assert.deepStrictEqual(l['kopie.json'].gegeven, []);
  assert.deepStrictEqual(l['kopie.json'].dubbel, ['Frans 1']);
  assert.deepStrictEqual(l['frans1.json'].dubbel, ['Frans 1 kopie']);
  assert.strictEqual(l['ander.json'].dubbel, undefined);
  assert.ok(l['ander.json'].gewijzigd);
  assert.strictEqual(l['ander.json'].sig, undefined, 'de handtekening gaat niet naar het scherm');
});
