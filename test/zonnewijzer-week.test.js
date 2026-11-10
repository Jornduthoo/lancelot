// De weekplanning van De Zonnewijzer: een week mag anders zijn dan het vaste rooster (les versleept, langer gemaakt,
// uur weg, vrije dag), zonder dat het rooster zelf verandert.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const zw = require('./src/zonnewijzer');
  const out = (() => { ${code} })();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

const ROOSTER = { roosters: [{ id: 'r', naam: 'Gewoon', dagen: {
  2: [{ van: '08:30', tot: '09:20', soort: 'les', vak: 'Rekenen' }],
  3: [{ van: '08:30', tot: '09:20', soort: 'les', vak: 'Rekenen' }, { van: '09:20', tot: '10:10', soort: 'les', vak: 'Taal' }],
  4: [{ van: '08:30', tot: '09:20', soort: 'les', vak: 'Rekenen' }],
} }], standaard: 'r' };

test('een dag van één week aanpassen laat het vaste rooster en de andere weken met rust', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zw-'));
  const res = run(tmp, `
    zw.bewaarRoosters(${JSON.stringify(ROOSTER)});
    zw.zetLes({ week: '2026-W46', slot: '3-1', les: { vak: 'Taal', titel: 'Zinnen bouwen' } });
    // Taal langer maken en vóór Rekenen zetten: de les gaat mee.
    zw.zetDagen({ week: '2026-W46', dagen: { 3: { uren: [{ van: '08:30', tot: '09:40', soort: 'les', vak: 'Taal' }, { van: '09:40', tot: '10:30', soort: 'les', vak: 'Rekenen' }], lessen: { 0: { vak: 'Taal', titel: 'Zinnen bouwen' } } } } });
    return { w: zw.week('2026-W46'), ander: zw.week('2026-W47'), rooster: zw.roosters().roosters[0].dagen[3] };
  `);
  assert.deepStrictEqual(Object.keys(res.w.lessen), ['3-0']);
  assert.strictEqual(res.w.lessen['3-0'].titel, 'Zinnen bouwen');
  assert.strictEqual(res.w.dagen[3][0].tot, '09:40');
  assert.deepStrictEqual(res.ander.dagen, {});
  assert.strictEqual(res.rooster[0].vak, 'Rekenen');
});

test('een vrije dag: lessen schuiven naar het volgende uur van hun vak, de vrije dag telt niet mee', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zw-'));
  const res = run(tmp, `
    zw.bewaarRoosters(${JSON.stringify(ROOSTER)});
    zw.zetLes({ week: '2026-W46', slot: '2-0', les: { vak: 'Rekenen', titel: 'Les 1' } });
    zw.zetLes({ week: '2026-W46', slot: '3-0', les: { vak: 'Rekenen', titel: 'Les 2' } });
    zw.zetVrij({ week: '2026-W46', dag: 3, reden: 'Wapenstilstand' });
    const w = zw.schuif({ week: '2026-W46', slot: '3-0' });
    const terug = zw.zetVrij({ week: '2026-W46', dag: 3, reden: null });
    return { w, terug };
  `);
  assert.strictEqual(res.w.vrij[3], 'Wapenstilstand');
  assert.strictEqual(res.w.lessen['2-0'].titel, 'Les 1');
  assert.strictEqual(res.w.lessen['4-0'].titel, 'Les 2');
  assert.strictEqual(res.w.lessen['3-0'], undefined);
  assert.deepStrictEqual(res.terug.vrij, {});
});
