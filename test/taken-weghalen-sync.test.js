// Een leerling uit een taak weghalen blijft weghalen, ook na Mijn lesmap: ook bij een oudere taak zonder t.plan,
// terwijl er wel een (oud) plan in de lesmap staat.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-weg-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
const kopieerPlan = (van, naar, id) => {
  fs.mkdirSync(path.join(naar, 'taken', 'plan'), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', 'plan', `${id}.json`), path.join(naar, 'taken', 'plan', `${id}.json`));
};
const KLAS = `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });`;
const namen = (d, id) => run(d, `return taken.lijst().find(x => x.id === '${id}').leerlingen.map(l => l.naam).sort();`);
const planNamen = (d, id) => JSON.parse(fs.readFileSync(path.join(d, 'taken', 'plan', `${id}.json`), 'utf8')).namen.sort();
// Een oudere taak: t.plan staat niet in taken.json.
const zonderPlanVlag = (d, id) => {
  const f = fs.readdirSync(path.join(d, 'taken')).find(n => n.endsWith('.json'));
  const bestand = path.join(d, 'taken', f);
  const data = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  const lijst = Array.isArray(data) ? data : data.taken;
  const t = lijst.find(x => x.id === id);
  delete t.plan;
  fs.writeFileSync(bestand, JSON.stringify(data));
};

test('oudere taak zonder t.plan: weghalen werkt het plan bij en de leerling blijft weg na de sync', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats', 'Noor'] }).id };`);
  zonderPlanVlag(A, id);
  run(A, `taken.haalWeg({ id: '${id}', naam: 'Mats' });`);
  assert.deepStrictEqual(planNamen(A, id), ['Lotte', 'Noor']);
  run(A, `taken.uitLesmap();`);
  assert.deepStrictEqual(namen(A, id), ['Lotte', 'Noor']);
});

test('weggehaald toen het plan nog niet bijgewerkt werd: het oude plan zet hem niet terug', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats', 'Noor'] }).id };`);
  const oud = fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`));
  zonderPlanVlag(A, id);
  run(A, `taken.haalWeg({ id: '${id}', naam: 'Mats' });`);
  // Zoals vroeger: het plan in de lesmap heeft nog de oude namen, zonder tijd.
  fs.writeFileSync(path.join(A, 'taken', 'plan', `${id}.json`), oud);
  zonderPlanVlag(A, id);
  run(A, `taken.uitLesmap();`);
  assert.deepStrictEqual(namen(A, id), ['Lotte', 'Noor']);
  assert.deepStrictEqual(planNamen(A, id), ['Lotte', 'Noor']);
});

test('weghalen op pc A: ook weg op pc B, en een ouder plan van B zet hem niet terug op A', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats', 'Noor'] }).id };`);
  kopieerPlan(A, B, id);
  run(B, `${KLAS} taken.uitLesmap();`);
  const oudB = fs.readFileSync(path.join(B, 'taken', 'plan', `${id}.json`));
  run(A, `taken.haalWeg({ id: '${id}', naam: 'Mats' });`);
  // Het oudere plan komt toch nog eens binnen op A.
  fs.writeFileSync(path.join(A, 'taken', 'plan', `${id}.json`), oudB);
  run(A, `taken.uitLesmap();`);
  assert.deepStrictEqual(namen(A, id), ['Lotte', 'Noor']);
  kopieerPlan(A, B, id);
  run(B, `taken.uitLesmap();`);
  assert.deepStrictEqual(namen(B, id), ['Lotte', 'Noor']);
  // Later weer toevoegen op B: komt ook op A terug.
  run(B, `taken.voegToe({ id: '${id}', namen: ['Mats'] });`);
  kopieerPlan(B, A, id);
  run(A, `taken.uitLesmap();`);
  assert.deepStrictEqual(namen(A, id), ['Lotte', 'Mats', 'Noor']);
});

test('oudere taak zonder t.plan: toevoegen en niveau kiezen gaan ook in het plan', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }).id };`);
  zonderPlanVlag(A, id);
  run(A, `taken.voegToe({ id: '${id}', namen: ['Noor'] });`);
  assert.deepStrictEqual(planNamen(A, id), ['Lotte', 'Noor']);
});
