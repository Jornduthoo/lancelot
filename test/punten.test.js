// Punten (wensenlijst 20 nov, punt 8): welke poging telt bij een herkansing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('punten: hoogste, laatste, eerste of gemiddelde; keuze per toets blijft bewaard', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'punten-'));
  const out = execFileSync(process.execPath, ['-e', `
    const p = require('./src/punten');
    const pog = [{ punten: 4, max: 10 }, { punten: 16, max: 20 }];
    const r = Object.fromEntries(p.KEUZES.map(k => [k, p.telt(pog, k)]));
    const voor = p.keuzes();
    p.zet({ toets: 'breuken.json', telt: 'laatste' });
    let fout = '';
    try { p.zet({ toets: 'x.json', telt: 'onzin' }); } catch (e) { fout = e.message; }
    process.stdout.write('\\n@@' + JSON.stringify({ r, voor, na: p.keuzes(), fout, leeg: p.telt([], 'hoogste') }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.r.hoogste, { punten: 16, max: 20 });
  assert.deepStrictEqual(o.r.laatste, { punten: 16, max: 20 });
  assert.deepStrictEqual(o.r.eerste, { punten: 4, max: 10 });
  assert.ok(Math.abs(o.r.gemiddelde.punten / o.r.gemiddelde.max - 0.6) < 1e-9);
  assert.deepStrictEqual(o.voor, { standaard: 'hoogste', telt: {} });
  assert.deepStrictEqual(o.na.telt, { 'breuken.json': 'laatste' });
  assert.ok(o.fout);
  assert.strictEqual(o.leeg, null);
});
