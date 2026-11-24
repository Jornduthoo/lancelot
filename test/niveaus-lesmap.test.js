// De niveaus gaan mee met Mijn lesmap: het niveau per leerling (klaslijst) en het niveau per leerling in een taak.
// Thuis aangepast = op het bord ook zo, ook als het bord intussen iets anders aan de klaslijst veranderde.
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

const TOETS = {
  title: 'Toets op niveaus',
  vragen: [{ type: 'meerkeuze', vraag: '2 + 2?', opties: ['3', '4', '5'], juist: 1 }],
  page: [{ type: 'meerkeuze', vraag: '1 + 1?', opties: ['2', '3'], juist: 0 }],
  ridder: [{ type: 'kort', vraag: '12 × 12?', antwoord: '144' }],
};
function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'niveaus-lesmap-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  return tmp;
}
const kopieerPlan = (van, naar, id) => {
  fs.mkdirSync(path.join(naar, 'taken', 'plan'), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', 'plan', `${id}.json`), path.join(naar, 'taken', 'plan', `${id}.json`));
};

test('klaslijst aan twee kanten aangepast: de laatste niveauwijziging wint, niemand verliest zijn niveau', () => {
  const A = pc(), B = pc();
  const lijst = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });
    const id = n => klas.read().leerlingen.find(l => l.naam === n).id;
    klas.setNiveau(id('Lotte'), 'page');
    klas.setNiveau(id('Mats'), 'ridder', 'wiskunde');
    klas.naarLesmap();
    return fs.readFileSync(klas.LESMAP + '/klaslijst.json', 'utf8');
  `);
  // Op het bord (B) staat nog de oude lijst zonder niveaus, en daar komt intussen iemand bij.
  const samen = run(B, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor', 'Sam'] });
    klas.naarLesmap();
    const hier = fs.readFileSync(klas.LESMAP + '/klaslijst.json', 'utf8');
    return JSON.parse(klas.lesmapSamen(hier, ${JSON.stringify(lijst)})).leerlingen;
  `);
  const by = n => samen.find(l => l.naam === n);
  assert.equal(by('Lotte').niveau, 'page');
  assert.deepStrictEqual(by('Mats').vakNiveaus, { wiskunde: 'ridder' });
  assert.ok(by('Sam'));
  // Een oude lijst zonder tijden: wat aan de andere kant als niveau staat, blijft toch bewaard.
  const oud = JSON.parse(lijst);
  for (const l of oud.leerlingen) delete l.nt;
  const zonder = JSON.parse(run(B, `return klas.lesmapSamen(fs.readFileSync(klas.LESMAP + '/klaslijst.json', 'utf8'), ${JSON.stringify(JSON.stringify(oud))});`)).leerlingen;
  assert.equal(zonder.find(l => l.naam === 'Lotte').niveau, 'page');
  // Later op het bord terug naar Schildknaap: dat is nu de laatste wijziging en wint.
  const terug = run(B, `
    fs.writeFileSync(klas.LESMAP + '/klaslijst.json', ${JSON.stringify(lijst)});
    klas.uitLesmap();
    klas.setNiveau(klas.read().leerlingen.find(l => l.naam === 'Lotte').id, 'schildknaap');
    klas.naarLesmap();
    return JSON.parse(klas.lesmapSamen(${JSON.stringify(lijst)}, fs.readFileSync(klas.LESMAP + '/klaslijst.json', 'utf8'))).leerlingen.find(l => l.naam === 'Lotte').niveau || '';
  `);
  assert.equal(terug, '');
});

test('niveau per leerling in een taak: thuis aangepast, op het bord ook (wie al begon, houdt zijn werk)', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    return { id: taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] }).id };
  `);
  kopieerPlan(A, B, id);
  run(B, `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] }); taken.uitLesmap(); const v = taken.open({ id: '${id}', naam: 'Mats' }).view; taken.toetsAntwoord({ id: '${id}', naam: 'Mats', vraag: v.pages[0].id, waarde: 0 });`);
  run(A, `taken.zetNiveau({ id: '${id}', naam: 'Lotte', niveau: 'ridder' }); taken.zetNiveau({ id: '${id}', naam: 'Mats', niveau: 'page' });`);
  kopieerPlan(A, B, id);
  const b = run(B, `
    const veranderd = taken.uitLesmap();
    const t = taken.lijst().find(x => x.id === '${id}');
    return { veranderd, lotte: t.leerlingen.find(l => l.naam === 'Lotte').niveau, mats: t.leerlingen.find(l => l.naam === 'Mats') };
  `);
  assert.equal(b.veranderd, true);
  assert.equal(b.lotte, 'ridder');
  // Mats was op het bord al begonnen: zijn werk blijft, op zijn niveau.
  assert.equal(b.mats.niveau, 'schildknaap');
  assert.notEqual(b.mats.status, 'nieuw');
});

test('taak uit de lesmap: kwamen de niveaus van de klaslijst pas later, dan krijgt wie nog niet begon toch zijn niveau', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    return { id: taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] }).id };
  `);
  kopieerPlan(A, B, id);
  const voor = run(B, `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] }); taken.uitLesmap(); return taken.lijst()[0].leerlingen[0].niveau;`);
  assert.equal(voor, 'schildknaap');
  const na = run(B, `klas.setNiveau(klas.read().leerlingen[0].id, 'page'); taken.uitLesmap(); return taken.lijst()[0].leerlingen[0].niveau;`);
  assert.equal(na, 'page');
});
