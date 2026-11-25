// Connector, deel 2: toetsen stap voor stap, versies, veel tegelijk, quizzen, oefenbladen, mappen en de weekexport.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  (async () => {
    const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), quizzes = require('./src/quizzes'), connector = require('./src/connector');
    const roep = async (name, args, schrijven = true) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { sleutel: { naam: 'Claude' }, schrijven });
      if (r.error) throw new Error(r.error.message);
      return { fout: r.result.isError, data: r.result.isError ? r.result.content[0].text : r.result.structuredContent };
    };
    const out = await (async () => { ${code} })();
    taken.flush();
    process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = {
  title: 'Bouwtoets', vak: 'Wiskunde',
  vragen: [{ type: 'kort', vraag: '3 × 3?', antwoord: '9' }, { type: 'kort', vraag: '4 × 4?', antwoord: '16' }],
};
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('toets stap voor stap: vraag toevoegen, wijzigen, verplaatsen, weghalen, niveau, beeld, versies, terugzetten', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-bouw-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const formaat = await roep('formaat', { soort: 'toets' });
    const droog = await roep('toets_controleren', { toets: { title: 'x', vragen: [{ type: 'onbestaand' }] } });
    const f = (await roep('toets_bewaren', { toets: ${JSON.stringify(TOETS)} })).data.file;
    const erbij = await roep('vraag_toevoegen', { file: f, vraag: { type: 'kort', vraag: '30 × 1000?', antwoord: '30000' }, positie: 1 });
    const sleutel = await roep('vraag_wijzigen', { file: f, nr: '1', velden: { antwoord: '30000|30 000', punten: 2 } });
    const fout = await roep('vraag_wijzigen', { file: f, nr: '9', velden: { punten: 1 } });
    const weg = await roep('vraag_verplaatsen', { file: f, nr: '1', naar: 3 });
    const bron = await roep('vraag_toevoegen', { file: f, vraag: { type: 'bron', titel: 'Lezen', tekst: 'Er was eens een ridder.', vragen: [{ type: 'juistfout', vraag: 'Er was een ridder.', juist: true }] } });
    const deel = await roep('vraag_toevoegen', { file: f, in_bron: '4', vraag: { type: 'kort', vraag: 'Wie?', antwoord: 'ridder' } });
    const niveau = await roep('niveau_maken', { file: f, niveau: 'ridder' });
    const ridder = await roep('vraag_wijzigen', { file: f, nr: '1', niveau: 'ridder', velden: { vraag: '33 × 3?', antwoord: '99' } });
    const beeld = await roep('beeld_toevoegen', { file: f, nr: '2', beeld: ${JSON.stringify(PNG)} });
    const slecht = await roep('beeld_toevoegen', { file: f, nr: '2', beeld: 'http://127.0.0.1/x.png' });
    const instellen = await roep('toets_instellen', { file: f, intro: 'Succes!', vaste_volgorde: true });
    const zonder = await roep('vraag_weghalen', { file: f, nr: '2' });
    const versies = await roep('toets_versies', { file: f });
    const terug = await roep('toets_terugzetten', { file: f, versie: versies.data.versies[0].versie });
    const t = proeven.load(f);
    // Gegeven: een wijziging komt in een nieuwe toets (v2).
    await roep('taak_geven', { file: f, namen: ['Lotte'] });
    const v2 = await roep('vraag_wijzigen', { file: f, nr: '1', velden: { punten: 3 } });
    const lezen = await roep('vraag_toevoegen', { file: f, vraag: { type: 'kort', vraag: '1?', antwoord: '1' } }, false);
    const log = connector.logboek(30).map(r => r.actie);
    return { formaat: formaat.data.uitleg.includes('meerkeuze'), droog: droog.data, erbij: erbij.data, sleutel: sleutel.data, fout, weg: weg.data, deel: deel.data, niveau: niveau.data, ridder: ridder.data, beeld: beeld.data, slecht, instellen: instellen.data, zonder: zonder.data, versies: versies.data.versies.length, terug: terug.data, t, v2: v2.data, f, oud: proeven.load(f), lezen, log };
  `);
  assert.equal(res.formaat, true);
  assert.equal(res.droog.in_orde, false);
  assert.equal(res.droog.droge_run, true);
  assert.equal(res.erbij.nr, '1');
  assert.equal(res.erbij.vragen, 3);
  assert.match(res.sleutel.voorbeeld, /proef-proberen\?file=/);
  assert.equal(res.fout.fout, true);
  assert.match(res.fout.data, /bestaat niet/);
  assert.equal(res.weg.nr, '3');
  assert.equal(res.deel.nr, '4b');
  assert.deepEqual(res.niveau.niveaus, ['schildknaap', 'ridder']);
  assert.equal(res.beeld.problemen.length, 0);
  assert.equal(res.slecht.fout, true);
  assert.equal(res.zonder.weg.type, 'kort');
  assert.ok(res.versies >= 9);
  // Terug naar de versie vlak voor het weghalen: de vraag is terug, de intro en de vaste volgorde ook.
  assert.equal(res.t.vragen.length, 4);
  assert.equal(res.t.intro, 'Succes!');
  assert.equal(res.t.vasteVolgorde, true);
  assert.ok(res.t.vragen[1].beeld.startsWith('data:image/png'));
  assert.equal(res.t.vragen[2].antwoord, '30000|30 000');
  assert.equal(res.t.vragen[2].punten, 2);
  assert.equal(res.t.ridder[0].antwoord, '99');
  assert.equal(res.t.vragen[3].vragen.length, 2);
  assert.equal(res.v2.nieuwe_versie, true);
  assert.notEqual(res.v2.file, res.f);
  assert.equal(res.v2.titel, 'Bouwtoets (v2)');
  assert.notEqual(res.oud.vragen[0].punten, 3);
  assert.equal(res.lezen.fout, true);
  for (const a of ['vraag_toevoegen', 'vraag_wijzigen', 'niveau_maken', 'beeld_toevoegen', 'toets_terugzetten']) assert.ok(res.log.includes(a), a);
});

test('veel toetsen tegelijk, quizzen, oefenbladen, mappen, quiz plannen en de weekexport', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-bouw-'));
  const morgen = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const bulk = await roep('toetsen_bewaren', { toetsen: [
      { toets: ${JSON.stringify(TOETS)}, map: 'Wiskunde/Blok 1' },
      { toets: { title: 'Leeg', vragen: [] } },
      { toets: { ...${JSON.stringify(TOETS)}, title: 'Tweede' }, map: 'Wiskunde/Blok 1' },
    ] });
    const QUIZ = { title: 'Karrewiet 25 november', questions: [{ question: 'Hoofdstad van België?', answers: ['Brussel', 'Gent'], correct: 0, uitleg: 'Brussel is de hoofdstad.' }] };
    const quiz = await roep('quiz_maken', { quiz: QUIZ, map: 'Karrewiet/2026-11' });
    const dubbel = await roep('quiz_maken', { quiz: QUIZ });
    const bij = await roep('quiz_bijwerken', { file: quiz.data.file, quiz: { ...QUIZ, questions: [...QUIZ.questions, { question: '2 + 2?', answers: ['3', '4'], correct: 1 }] } });
    const lijst = await roep('quizzen', { zoek: 'karrewiet' });
    const lees = await roep('quiz', { file: quiz.data.file });
    const ob = await roep('oefenblad_bewaren', { oefenblad: { title: 'Maaltafels', blocks: [{ type: 'meerkeuze', items: [{ question: '2 × 3?', options: ['5', '6'], correct: 1 }] }] }, map: 'Wiskunde' });
    const mappen = await roep('mappen', { soort: 'quiz' });
    const nieuw = await roep('map_maken', { soort: 'toets', map: 'Archief/Wiskunde/2026-11' });
    const hernoemd = await roep('map_hernoemen', { soort: 'toets', map: 'Wiskunde/Blok 1', nieuwe_naam: 'Blok één' });
    const naar = await roep('naar_map', { soort: 'toets', file: bulk.data.verslag[0].file, map: 'Archief/Wiskunde/2026-11' });
    const plan = await roep('taak_geven', { soort: 'quiz', file: quiz.data.file, hele_klas: true, vanaf: '${morgen}', spel: 'toren', minuten: 5 });
    const toets = await roep('taak_geven', { file: bulk.data.verslag[2].file, namen: ['Lotte'] });
    const week = await roep('weekexport', { formaat: 'csv' });
    const sync = await roep('sync_starten', {}, false);
    return { bulk: bulk.data, quiz: quiz.data, dubbel, bij: bij.data, lijst: lijst.data, lees: lees.data, ob, mappen: mappen.data, nieuw: nieuw.data, hernoemd: hernoemd.data, naar: naar.data, plan: plan.data, plaats: proeven.lib.places()(bulk.data.verslag[2].file), week: week.data, sync: sync.data, versies: require('fs').readdirSync(require('path').join(quizzes.DIR, '_versies')).length, taak: taken.lijst().find(t => t.id === plan.data.taak_id) };
  `);
  assert.equal(res.bulk.gelukt, 2);
  assert.equal(res.bulk.mislukt, 1);
  assert.equal(res.bulk.verslag[1].gelukt, false);
  assert.match(res.bulk.verslag[1].waarom, /vragen/);
  assert.equal(res.quiz.map, 'Karrewiet/2026-11');
  assert.equal(res.dubbel.fout, true);
  assert.match(res.dubbel.data, /bestaat al/);
  assert.equal(res.bij.vragen, 2);
  assert.equal(res.versies, 1);
  assert.equal(res.lijst.aantal, 1);
  assert.equal(res.lees.quiz.questions[0].uitleg, 'Brussel is de hoofdstad.');
  assert.equal(res.ob.fout, false, res.ob.data);
  assert.ok(res.mappen.mappen.includes('Karrewiet/2026-11'));
  assert.equal(res.nieuw.map, 'Archief/Wiskunde/2026-11');
  assert.equal(res.hernoemd.naar, 'Wiskunde/Blok één');
  assert.equal(res.plaats, 'Wiskunde/Blok één');
  assert.equal(res.naar.map, 'Archief/Wiskunde/2026-11');
  assert.equal(res.plan.status, 'gepland');
  assert.equal(res.taak.spel.id, 'toren');
  assert.match(res.week.csv, /^datum;soort;titel/);
  assert.ok(res.week.csv.includes('Lotte'));
  assert.equal(res.sync.ingesteld, false);
});
