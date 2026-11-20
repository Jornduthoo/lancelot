// Een taak afsluiten op één pc sluit ze ook op je andere pc's (via Mijn lesmap), en het werk van de leerlingen blijft.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), fs = require('fs'), path = require('path');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-dicht-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
// Wat Mijn lesmap doet: het plan van de ene pc naar de andere kopiëren.
const kopieerPlan = (van, naar, id) => {
  fs.mkdirSync(path.join(naar, 'taken', 'plan'), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', 'plan', `${id}.json`), path.join(naar, 'taken', 'plan', `${id}.json`));
};

test('afsluiten op pc A: na de sync ook afgesloten op pc B, wie bezig was levert in', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'] }).id };
  `);
  kopieerPlan(A, B, id);
  const voor = run(B, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    taken.uitLesmap();
    taken.open({ id: '${id}', naam: 'Lotte' });
    taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.0', waarde: 'Brussel' });
    const t = taken.lijst().find(x => x.id === '${id}');
    return { dicht: t.dicht, lotte: t.leerlingen.find(l => l.naam === 'Lotte').status, nogNietAf: taken.aantal('Mats') };
  `);
  assert.deepStrictEqual(voor, { dicht: false, lotte: 'bezig', nogNietAf: 1 });
  run(A, `taken.sluit('${id}');`);
  kopieerPlan(A, B, id);
  const na = run(B, `
    const veranderd = taken.uitLesmap();
    const t = taken.lijst().find(x => x.id === '${id}');
    return { veranderd, dicht: t.dicht, lotte: t.leerlingen.find(l => l.naam === 'Lotte').status, nogNietAf: taken.aantal('Mats') };
  `);
  assert.deepStrictEqual(na, { veranderd: true, dicht: true, lotte: 'klaar', nogNietAf: 0 });
  // Heropenen op B (later): het plan op B zegt open, en A neemt dat over.
  run(B, `taken.heropen({ id: '${id}' });`);
  kopieerPlan(B, A, id);
  const a = run(A, `taken.uitLesmap(); return taken.lijst().find(x => x.id === '${id}').dicht;`);
  assert.strictEqual(a, false);
});

test('twee pcs tegelijk: de laatste wijziging wint, ook als het oudere plan binnenkomt', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }).id };
  `);
  kopieerPlan(A, B, id);
  run(B, `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] }); taken.uitLesmap();`);
  run(A, `taken.sluit('${id}');`);
  const oud = fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`));
  // B heropent later; dan komt toch het oudere plan van A binnen.
  run(B, `taken.sluit('${id}'); taken.heropen({ id: '${id}' });`);
  fs.writeFileSync(path.join(B, 'taken', 'plan', `${id}.json`), oud);
  const b = run(B, `taken.uitLesmap(); return { dicht: taken.lijst().find(x => x.id === '${id}').dicht, plan: JSON.parse(fs.readFileSync(path.join(taken.PLAN, '${id}.json'), 'utf8')).dicht };`);
  assert.deepStrictEqual(b, { dicht: false, plan: false });
});
