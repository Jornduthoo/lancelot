// Een oefenblad als taak (24 nov): voorlezen en punten tonen worden bewaard, zoals bij een toets, en gaan mee
// naar je andere pc. Een oefenblad van vroeger (zonder keuzes) blijft voorlezen en punten tonen.
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

function map() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-blad-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}

test('oefenblad bewaart voorlezen en punten tonen, en een oud oefenblad blijft zoals vroeger', () => {
  const tmp = map();
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const stil = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], voorlees: 'uit', uitslag: false, feedback: 'inleveren' });
    const oud = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Mats'] });
    const a = taken.open({ id: stil.id, naam: 'Lotte' });
    taken.inleveren({ id: stil.id, naam: 'Lotte' });
    const na = taken.open({ id: stil.id, naam: 'Lotte' });
    taken.inleveren({ id: oud.id, naam: 'Mats' });
    const oudNa = taken.open({ id: oud.id, naam: 'Mats' });
    const plan = JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, stil.id + '.json'), 'utf8'));
    return {
      voorlees: a.voorlees, oudVoorlees: oudNa.voorlees, na: [na.klaar, na.score, na.solutions, Object.keys(na.results).length],
      oudNa: [oudNa.score > 0, !!oudNa.solutions], mijn: taken.mijn('Lotte').taken[0].score,
      plan: [plan.voorlees, plan.uitslag, !!plan.keuzesTijd],
    };
  `);
  assert.strictEqual(r.voorlees, false, 'voorlezen uit wordt bewaard');
  assert.strictEqual(r.oudVoorlees, true, 'een oefenblad zonder keuze leest voor zoals vroeger');
  assert.deepStrictEqual(r.na, [true, 0, null, 0], 'punten tonen uit: geen score, geen oplossingen');
  assert.deepStrictEqual(r.oudNa, [true, true], 'zonder keuze: punten en oplossingen zoals vroeger');
  assert.strictEqual(r.mijn, 0, 'ook in Mijn taken geen score');
  assert.deepStrictEqual(r.plan, ['uit', false, true], 'de keuzes gaan mee in Mijn lesmap');
});

test('uit Mijn lesmap: een nieuw plan neemt de keuzes over, een plan van vroeger niet', () => {
  const tmp = map();
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const fs = require('fs'), path = require('path');
    const inhoud = JSON.parse(fs.readFileSync(path.join(process.env.LANCELOT_DATA, 'oefenbladen', 'blad.json'), 'utf8'));
    fs.mkdirSync(taken.PLAN, { recursive: true });
    const basis = { soort: 'oefenblad', file: 'blad.json', titel: 'Blad', feedback: 'direct', gemaakt: new Date().toISOString(), namen: ['Lotte'], inhoud };
    fs.writeFileSync(path.join(taken.PLAN, 'nieuw1.json'), JSON.stringify({ ...basis, id: 'nieuw1', voorlees: 'page', uitslag: false, keuzesTijd: basis.gemaakt }));
    fs.writeFileSync(path.join(taken.PLAN, 'oud001.json'), JSON.stringify({ ...basis, id: 'oud001', voorlees: null, uitslag: false }));
    taken.uitLesmap();
    const n = taken.open({ id: 'nieuw1', naam: 'Lotte' }), o = taken.open({ id: 'oud001', naam: 'Lotte' });
    taken.inleveren({ id: 'oud001', naam: 'Lotte' });
    return { n: n.voorlees, o: o.voorlees, oSol: !!taken.open({ id: 'oud001', naam: 'Lotte' }).solutions };
  `);
  assert.strictEqual(r.n, false, 'voorlezen voor Page: Lotte is geen Page');
  assert.strictEqual(r.o, true);
  assert.strictEqual(r.oSol, true, 'een plan van vroeger toont de punten zoals vroeger');
});
