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
  assert.deepStrictEqual(o.nieuw.algemeen, { voorlees: 'iedereen', volgorde: 'alles', uitslag: true, beveiligd: true, feedback: 'direct', startuur: '08:30' });
  assert.deepStrictEqual(o.na.algemeen, { voorlees: 'uit', volgorde: 'alles', uitslag: true, beveiligd: true, feedback: 'direct', startuur: '08:30' });
  assert.deepStrictEqual(Object.keys(o.na.vakken), ['frans']);
  assert.strictEqual(o.frans.voorlees, 'iedereen');
  assert.strictEqual(o.frans.startuur, '10:15');
  assert.strictEqual(o.wo.voorlees, 'uit', 'WO volgt de algemene standaard');
  assert.strictEqual(o.leeg.vakgroep, '');
});

test('takenstandaard: een standaard van vroeger krijgt één keer de nieuwe goede standaard (wens 24 nov)', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'takenstandaard-'));
  fs.mkdirSync(path.join(data, 'taken-standaard'));
  fs.writeFileSync(path.join(data, 'taken-standaard', 'standaard.json'), JSON.stringify({ algemeen: { voorlees: 'page', volgorde: 'schud', uitslag: false, feedback: 'inleveren', startuur: '09:00' }, vakken: { frans: { voorlees: 'uit' } } }));
  const out = execFileSync(process.execPath, ['-e', `
    const s = require('./src/takenstandaard');
    const eerst = s.read();
    s.write({ algemeen: { ...eerst.algemeen, voorlees: 'page' }, vakken: eerst.vakken });
    process.stdout.write('\\n@@' + JSON.stringify({ eerst, daarna: s.read() }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.eerst.algemeen, { voorlees: 'iedereen', volgorde: 'alles', uitslag: true, beveiligd: true, feedback: 'inleveren', startuur: '09:00' });
  assert.strictEqual(o.eerst.vakken.frans.voorlees, 'uit', 'een uitzondering per vak blijft');
  assert.strictEqual(o.daarna.algemeen.voorlees, 'page', 'daarna blijft je eigen keuze staan');
});
