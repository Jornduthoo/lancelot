// Standaardkeuzes voor taken (wensenlijst 20 nov, punt 5): goede standaarden, uitzonderingen per vak.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('takenstandaard: goede standaard, een uitzondering per vak, ongeldige keuzes vallen weg', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'takenstandaard-'));
  const out = execFileSync(process.execPath, ['-e', `
    const s = require('./src/takenstandaard');
    const nieuw = s.read();
    s.write({ algemeen: { voorlees: 'uit', volgorde: 'onzin', startuur: '25:00' }, vakken: { frans: { voorlees: 'iedereen', startuur: '10:15' }, wo: {}, hack: { voorlees: 'uit' } } });
    process.stdout.write('\\n@@' + JSON.stringify({ nieuw, na: s.read(), frans: s.voor('Frans'), wo: s.voor('Geschiedenis'), leeg: s.voor('') }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.strictEqual(o.nieuw.bewaard, false);
  assert.deepStrictEqual(o.nieuw.algemeen, { voorlees: 'page', volgorde: 'schud', uitslag: false, feedback: 'direct', startuur: '08:30' });
  assert.deepStrictEqual(o.na.algemeen, { voorlees: 'uit', volgorde: 'schud', uitslag: false, feedback: 'direct', startuur: '08:30' });
  assert.deepStrictEqual(Object.keys(o.na.vakken), ['frans']);
  assert.strictEqual(o.frans.voorlees, 'iedereen');
  assert.strictEqual(o.frans.startuur, '10:15');
  assert.strictEqual(o.wo.voorlees, 'uit', 'WO volgt de algemene standaard');
  assert.strictEqual(o.leeg.vakgroep, '');
});
