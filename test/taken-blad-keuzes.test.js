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

test('keuzes achteraf: punten alsnog tonen, wie begon houdt zijn volgorde en verbeteren, gaat mee naar je andere pc', () => {
  const tmp = map();
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify({ title: 'T', vragen: [
    { type: 'meerkeuze', vraag: 'a?', opties: ['1', '2', '3', '4', '5', '6'], juist: 0 },
    { type: 'meerkeuze', vraag: 'b?', opties: ['1', '2', '3', '4', '5', '6'], juist: 1 },
    { type: 'meerkeuze', vraag: 'c?', opties: ['1', '2', '3', '4', '5', '6'], juist: 2 }] }));
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const b = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'], uitslag: false, feedback: 'direct', voorlees: 'uit' });
    const veld = taken.detail({ id: b.id, naam: 'Lotte' }).view.blocks.flatMap(x => x.fields || []).map(f => f.id)[0];
    taken.inleveren({ id: b.id, naam: 'Lotte' });
    const voor = taken.open({ id: b.id, naam: 'Lotte' });
    const k = taken.zetKeuzes({ id: b.id, uitslag: true, voorlees: 'iedereen', feedback: 'inleveren' });
    const na = taken.open({ id: b.id, naam: 'Lotte' });
    const mats = taken.open({ id: b.id, naam: 'Mats' });
    const plan = JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, b.id + '.json'), 'utf8'));

    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'], vragenVast: true, keuzesVast: true });
    const lotteVoor = taken.open({ id: t.id, naam: 'Lotte' }).view.pages.map(p => p.vraag + p.opties.map(o => o.tekst || o).join(''));
    taken.zetKeuzes({ id: t.id, volgorde: 'schud' });
    const lotteNa = taken.open({ id: t.id, naam: 'Lotte' }).view.pages.map(p => p.vraag + p.opties.map(o => o.tekst || o).join(''));
    const matsNa = taken.open({ id: t.id, naam: 'Mats' }).view.pages.map(p => p.vraag + p.opties.map(o => o.tekst || o).join(''));
    let quiz = '';
    try { taken.zetKeuzes({ id: 'bestaatniet' }); } catch (e) { quiz = e.message; }
    return { voor: [voor.score, !!voor.solutions], na: [na.score > 0, !!na.solutions, na.voorlees, na.feedback], mats: mats.feedback, k,
      plan: [plan.uitslag, plan.voorlees, plan.feedback, plan.keuzesTijd > plan.gemaakt], lotteVoor, lotteNa, matsAnders: matsNa.join() !== lotteVoor.join(), quiz };
  `);
  assert.deepStrictEqual(r.voor, [0, false]);
  assert.deepStrictEqual(r.na, [true, true, true, 'direct'], 'punten alsnog zichtbaar; Lotte begon met meteen verbeteren en houdt dat');
  assert.strictEqual(r.mats, 'inleveren', 'wie nog niet begon, krijgt het nieuwe');
  assert.deepStrictEqual(r.plan, [true, 'iedereen', 'inleveren', true], 'het plan in Mijn lesmap is bijgewerkt');
  assert.deepStrictEqual(r.lotteNa, r.lotteVoor, 'wie de toets al open had, houdt zijn volgorde');
  assert.ok(r.matsAnders, 'wie nog niet begon, krijgt alles door elkaar');
  assert.ok(r.quiz);
});

test('keuzes achteraf op de andere pc: het nieuwere plan wint', () => {
  const tmp = map();
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const fs = require('fs'), path = require('path');
    const b = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], uitslag: false });
    const f = path.join(taken.PLAN, b.id + '.json');
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    fs.writeFileSync(f, JSON.stringify({ ...p, uitslag: true, voorlees: 'page', keuzesTijd: new Date(Date.now() + 5000).toISOString() }));
    taken.uitLesmap();
    const na = taken.keuzesVoor(b.id);
    const oud = { ...JSON.parse(fs.readFileSync(f, 'utf8')), uitslag: false, keuzesTijd: new Date(Date.now() - 60000).toISOString() };
    fs.writeFileSync(f, JSON.stringify(oud));
    taken.uitLesmap();
    return { na: [na.uitslag, na.voorlees], oud: taken.keuzesVoor(b.id).uitslag, terug: JSON.parse(fs.readFileSync(f, 'utf8')).uitslag };
  `);
  assert.deepStrictEqual(r.na, [true, 'page']);
  assert.strictEqual(r.oud, true, 'een ouder plan zet niets terug');
  assert.strictEqual(r.terug, true, 'onze nieuwere keuzes gaan terug in het plan');
});
