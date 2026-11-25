// Weekrapport per leerling (wens 25 nov, punt 5).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), logboek = require('./src/logboek'), wr = require('./src/weekrapport');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('week: maandag tot zondag rond een dag', () => {
  const wr = require('../src/weekrapport');
  assert.deepStrictEqual(wr.week('2026-11-26'), { van: '2026-11-23', tot: '2026-11-29' });
  assert.throws(() => wr.week('morgen'), /JJJJ-MM-DD/);
});

test('rapport: toetsen op 10, taken, doelen uit het logboek, feedback voorstel en eigen tekst', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), JSON.stringify({ title: 'Toets', vragen: [{ type: 'kort', vraag: '2+2?', antwoord: '4', punten: 4 }, { type: 'kort', vraag: '3+3?', antwoord: '6', punten: 4 }] }));
  fs.mkdirSync(path.join(A, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(A, 'oefenbladen', 'blad.json'));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] });
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '0', waarde: '4' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '1', waarde: '7' });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'] });
    logboek.add([
      { naam: 'Lotte', spel: 'Taak', bron: 'x', vraag: 'a', doel: '4.1.GL2.1', juist: true },
      { naam: 'Lotte', spel: 'Taak', bron: 'x', vraag: 'b', doel: '4.1.GL2.1', juist: true },
      { naam: 'Lotte', spel: 'Taak', bron: 'x', vraag: 'c', doel: 'eigen-doel', juist: false },
      { naam: 'Mats', spel: 'Taak', bron: 'x', vraag: 'a', doel: '4.1.GL2.1', juist: false },
    ]);
    const d = wr.data({});
    const zet = wr.zetOpmerking({ van: d.van, naam: 'lotte', tekst: 'Knap gedaan, Lotte!' });
    const na = wr.data({ naam: 'Lotte' });
    return { d, zet, na };
  `);
  const lotte = r.d.rapporten.find(x => x.naam === 'Lotte');
  assert.deepStrictEqual(lotte.toetsen.map(t => [t.punten, t.max, t.op10, t.procent]), [[4, 8, 5, 50]]);
  assert.deepStrictEqual(lotte.taken.map(t => t.status), ['nieuw']);
  const doel = lotte.doelen.find(x => x.code === '4.1.GL2.1');
  assert.ok(doel.behaald);
  assert.match(doel.tekst, /werelddelen/);
  assert.strictEqual(lotte.doelen.find(x => x.code === 'eigen-doel').behaald, false);
  assert.match(lotte.feedback, /De taak is nog niet af/);
  assert.match(lotte.feedback, /Nog oefenen: eigen-doel/);
  assert.strictEqual(lotte.eigen, false);
  assert.strictEqual(r.d.rapporten.find(x => x.naam === 'Mats').doelen[0].behaald, false);
  assert.strictEqual(r.zet.naam, 'Lotte');
  assert.deepStrictEqual([r.na.rapporten.length, r.na.rapporten[0].feedback, r.na.rapporten[0].eigen], [1, 'Knap gedaan, Lotte!', true]);
});
