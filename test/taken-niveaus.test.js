// Eén taak, meerdere niveaus (wensenlijst 20 nov, punt 4): per leerling een niveau kiezen, of twee niveaus na elkaar.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('per leerling een niveau, en een tweede niveau dat pas verschijnt als het eerste af is', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-niveaus-'));
  const out = execFileSync(process.execPath, ['-e', `
    const klas = require('./src/klas'), taken = require('./src/taken'), quizzes = require('./src/quizzes');
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Ada', 'Bo', 'Cas'] });
    const v = (q, niveau) => ({ question: q, answers: ['ja', 'nee'], correct: 0, niveau });
    quizzes.save({ title: 'Breuken', questions: [v('p1', 'page'), v('p2', 'page'), v('s1', 'schildknaap'), v('s2', 'schildknaap'), v('r1', 'ridder')] }, 'breuken.json');
    const eerste = taken.maak({ soort: 'quiz', file: 'breuken.json', namen: ['Ada', 'Bo', 'Cas'], per: { Ada: 'page', Bo: 'ridder', Cas: 'onzin' } });
    const tweede = taken.maak({ soort: 'quiz', file: 'breuken.json', namen: ['Ada'], niveau: 'schildknaap', na: eerste.id });
    const lijst = () => taken.lijst();
    const nv = Object.fromEntries(lijst().find(t => t.id === eerste.id).leerlingen.map(l => [l.naam, l.niveau]));
    const voor = { mijn: taken.mijn('Ada').taken.map(t => t.id), aantal: taken.aantal('Ada'), wacht: lijst().find(t => t.id === tweede.id).leerlingen[0].wacht, na: lijst().find(t => t.id === tweede.id).na };
    let fout = '';
    try { taken.open({ id: tweede.id, naam: 'Ada' }); } catch (e) { fout = e.message; }
    taken.sluit(eerste.id);
    const na = { mijn: taken.mijn('Ada').taken.map(t => t.id), wacht: !!lijst().find(t => t.id === tweede.id).leerlingen[0].wacht };
    taken.flush();
    process.stdout.write('\\n@@' + JSON.stringify({ nv, voor, fout, na, ids: [eerste.id, tweede.id], plan: JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, eerste.id + '.json'), 'utf8')).per }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.nv, { Ada: 'page', Bo: 'ridder', Cas: 'schildknaap' }, 'gekozen niveau per leerling, onzin valt terug op Mijn klas');
  assert.deepStrictEqual(o.voor.mijn, [o.ids[0]], 'Ada ziet eerst alleen de eerste taak');
  assert.strictEqual(o.voor.aantal, 1);
  assert.strictEqual(o.voor.wacht, true);
  assert.strictEqual(o.voor.na.titel, 'Breuken');
  assert.ok(o.fout, 'de tweede taak opent nog niet');
  assert.ok(o.na.mijn.includes(o.ids[1]), 'na het afsluiten van de eerste verschijnt de tweede');
  assert.strictEqual(o.na.wacht, false);
  assert.deepStrictEqual(o.plan, { ada: 'page', bo: 'ridder' }, 'het gekozen niveau gaat mee naar je andere pc');
});

// Wensenlijst punt 6: oude taken opruimen sluit ze af (ze blijven bij Afgesloten), behalve waar iemand nog bezig is.
test('oude taken opruimen: afsluiten, niets wissen, wie bezig is blijft open', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-opruimen-'));
  const out = execFileSync(process.execPath, ['-e', `
    const klas = require('./src/klas'), taken = require('./src/taken'), quizzes = require('./src/quizzes');
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Ada', 'Bo'] });
    quizzes.save({ title: 'Q', questions: [{ question: 'a?', answers: ['ja', 'nee'], correct: 0 }, { question: 'b?', answers: ['ja', 'nee'], correct: 0 }] }, 'q.json');
    // Tien dagen geleden gegeven.
    const Echt = Date, terug = 10 * 864e5;
    global.Date = class extends Echt { constructor(...a) { if (a.length) super(...a); else super(Echt.now() - terug); } static now() { return Echt.now() - terug; } };
    const oud = taken.maak({ soort: 'quiz', file: 'q.json', namen: ['Ada'] });
    const bezig = taken.maak({ soort: 'quiz', file: 'q.json', namen: ['Bo'] });
    global.Date = Echt;
    const nieuw = taken.maak({ soort: 'quiz', file: 'q.json', namen: ['Ada'] });
    taken.quizAntwoord({ id: bezig.id, naam: 'Bo', keuze: 0 });
    const r = taken.ruimOp({ dagen: 7 });
    const l = Object.fromEntries(taken.lijst().map(t => [t.id, t.dicht]));
    process.stdout.write('\\n@@' + JSON.stringify({ r, oud: l[oud.id], bezig: l[bezig.id], nieuw: l[nieuw.id], n: taken.lijst().length }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.r, { n: 1, bezig: 1 });
  assert.strictEqual(o.oud, true);
  assert.strictEqual(o.bezig, false);
  assert.strictEqual(o.nieuw, false);
  assert.strictEqual(o.n, 3, 'niets verdwijnt');
});
