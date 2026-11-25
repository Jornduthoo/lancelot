// Hulpknop voor leerlingen (wens 25 nov, punt 9): een wachtrij in volgorde, intrekken en afvinken.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), hulp = require('./src/hulp');
  const out = (() => { ${code} })();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('wie eerst vraagt, staat eerst; nog eens vragen houdt de plaats; intrekken en afvinken halen uit de rij', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'hulp-'));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    const a = hulp.vraag({ naam: 'mats', waar: 'Toets · vraag 3' });
    const b = hulp.vraag({ naam: 'Lotte' });
    const c = hulp.vraag({ naam: 'Mats', waar: 'Toets · vraag 4' });
    const rij1 = hulp.lijst();
    hulp.weg({ naam: 'Mats' });
    const lotte = hulp.stand('Lotte');
    const mats = hulp.stand('Mats');
    return { a, b, c, rij1: rij1.map(h => [h.plaats, h.naam, h.waar]), lotte, mats, vreemd: fout(() => hulp.vraag({ naam: 'Iemand' })) };
  `);
  assert.deepStrictEqual(r.a, { gevraagd: true, plaats: 1 });
  assert.deepStrictEqual(r.b, { gevraagd: true, plaats: 2 });
  assert.deepStrictEqual(r.c, { gevraagd: true, plaats: 1 });
  assert.deepStrictEqual(r.rij1, [[1, 'Mats', 'Toets · vraag 4'], [2, 'Lotte', '']]);
  assert.deepStrictEqual(r.lotte, { gevraagd: true, plaats: 1 });
  assert.deepStrictEqual(r.mats, { gevraagd: false });
  assert.match(r.vreemd, /Kies eerst je naam/);
});
