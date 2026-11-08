// Meerdere klassen op één toestel: elke klas eigen klaslijst, logboek, taken, burchten en Junior-gegevens.
// De eerste klas blijft staan waar alles altijd stond, zodat een update niets verhuist of verliest.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const gegevens = require('./src/gegevens'), klas = require('./src/klas'), logboek = require('./src/logboek');
  const junior = require('./src/junior'), notities = require('./src/notities');
  const out = (() => { ${code} })();
  logboek.flush && logboek.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('de bestaande klas wordt de eerste klas, zonder iets te verplaatsen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  // Zoals op de pc van vandaag: één klas in klas/ en een logboek.
  run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    logboek.add([{ naam: 'Lotte', spel: 'Quiz', bron: 'Breuken', vraag: 'v1', juist: true }]);
  `);
  const voor = fs.readFileSync(path.join(tmp, 'klas', 'klas.json'), 'utf8');
  const res = run(tmp, 'return klas.klassen();');
  assert.strictEqual(res.actief, '1');
  assert.deepStrictEqual(res.klassen.map(k => [k.naam, k.aantal]), [['6A', 2]]);
  assert.strictEqual(fs.readFileSync(path.join(tmp, 'klas', 'klas.json'), 'utf8'), voor);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('een tweede klas heeft alles apart, en terugwisselen toont de eerste klas weer', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    logboek.add([{ naam: 'Lotte', spel: 'Quiz', bron: 'Breuken', vraag: 'v1', juist: true }]);
    junior.zetDraakNaam && junior.zetDraakNaam('Vonkje');
    notities.add && notities.add(klas.read().leerlingen[0].id, 'Leest traag');
  `);
  const twee = run(tmp, `
    const k = klas.nieuweKlas({ naam: '3e kleuter' });
    klas.voegToe(['Ella', 'Noah', 'Finn']);
    logboek.add([{ naam: 'Ella', spel: 'Junior', bron: 'Tellen', vraag: 'v2', juist: true }]);
    return { k, namen: klas.names(), logboek: logboek.read().map(e => e.naam), notities: notities.read() };
  `);
  assert.strictEqual(twee.k.klassen.length, 2);
  assert.notStrictEqual(twee.k.actief, '1');
  assert.deepStrictEqual(twee.namen, ['Ella', 'Noah', 'Finn']);
  assert.deepStrictEqual(twee.logboek, ['Ella']);
  assert.ok(!JSON.stringify(twee.notities).includes('Leest traag'));
  // De tweede klas staat in klassen/<id>/, de eerste klas bleef ongemoeid.
  assert.ok(fs.existsSync(path.join(tmp, 'klassen', twee.k.actief, 'klas', 'klas.json')));
  assert.ok(fs.existsSync(path.join(tmp, 'klassen', twee.k.actief, 'logboek')));

  // Na een herstart blijft de gekozen klas gekozen.
  assert.deepStrictEqual(run(tmp, 'return klas.names();'), ['Ella', 'Noah', 'Finn']);

  const een = run(tmp, `
    klas.kiesKlas('1');
    return { namen: klas.names(), logboek: logboek.read().map(e => e.naam), lijst: klas.klassen().klassen.map(k => [k.naam, k.aantal]) };
  `);
  assert.deepStrictEqual(een.namen, ['Lotte', 'Mats']);
  assert.deepStrictEqual(een.logboek, ['Lotte']);
  assert.deepStrictEqual(een.lijst, [['6A', 2], ['3e kleuter', 3]]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('wisselen binnen één start: wat nog in het geheugen zat, komt bij de juiste klas', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', namen: ['Lotte'] });
    logboek.answer('Quiz', 'Breuken', 'Lotte', { question: 'v1', doel: '' }, true); // wacht nog in het geheugen
    const b = klas.nieuweKlas({ naam: '5B' }).actief;
    klas.write({ naam: '5B', namen: ['Ella'] });
    logboek.answer('Quiz', 'Breuken', 'Ella', { question: 'v2', doel: '' }, true);
    logboek.flush();
    const inB = logboek.read().map(e => e.naam);
    klas.kiesKlas('1');
    return { inB, inA: logboek.read().map(e => e.naam) };
  `);
  assert.deepStrictEqual(res.inA, ['Lotte']);
  assert.deepStrictEqual(res.inB, ['Ella']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Junior: eigen dieren en klasdraakje per klas, de eigen reeksen gedeeld', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  run(tmp, `
    klas.write({ naam: 'K3', namen: ['Ella'] });
    const fs = require('fs'), path = require('path');
    fs.writeFileSync(path.join(gegevens.pad('klas'), 'junior.json'), JSON.stringify({ eten: 300, draakNaam: 'Vonkje', sets: [{ id: 'a', naam: 'Mijn reeks', vragen: [] }] }));
  `);
  const res = run(tmp, `
    klas.nieuweKlas({ naam: 'K2' });
    const d = JSON.parse(JSON.stringify({ sets: junior.sets() }));
    return d;
  `);
  assert.deepStrictEqual(res.sets.map(s => s.naam), ['Mijn reeks']);
  const eersteFile = JSON.parse(fs.readFileSync(path.join(tmp, 'klas', 'junior.json'), 'utf8'));
  assert.strictEqual(eersteFile.draakNaam, 'Vonkje');
  assert.strictEqual(eersteFile.eten, 300);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('een klas weghalen wist niets: de map gaat naar klassen/_weg', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', namen: ['Lotte'] });
    const id = klas.nieuweKlas({ naam: '5B' }).actief;
    klas.voegToe(['Ella']);
    let fout = '';
    try { klas.verwijderKlas('1'); } catch (e) { fout = e.message; }
    const na = klas.verwijderKlas(id);
    return { id, fout, na, namen: klas.names() };
  `);
  assert.match(res.fout, /eerste klas/);
  assert.strictEqual(res.na.klassen.length, 1);
  assert.deepStrictEqual(res.namen, ['Lotte']);
  const weg = fs.readdirSync(path.join(tmp, 'klassen', '_weg'));
  assert.strictEqual(weg.length, 1);
  assert.ok(fs.existsSync(path.join(tmp, 'klassen', '_weg', weg[0], 'klas', 'klas.json')));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('de back-up neemt alle klassen mee', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  const namen = run(tmp, `
    klas.write({ naam: '6A', namen: ['Lotte'] });
    klas.nieuweKlas({ naam: '5B' });
    klas.voegToe(['Ella']);
    return require('./src/zip').read(gegevens.maakBackup()).map(f => f.name);
  `);
  assert.ok(namen.includes('klas/klas.json'));
  assert.ok(namen.includes('klassen/klassen.json'));
  assert.ok(namen.some(n => /^klassen\/[a-z0-9]+\/klas\/klas\.json$/.test(n)));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Mijn lesmap: een andere klas gaat in klassen/<id>/ en de lijst van klassen gaat mee', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassen-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  const sync = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
    const klas = require('./src/klas'), lesmap = require('./src/lesmap'), settings = require('./src/settings');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    lesmap.init([
      { kind: 'klas', dir: () => klas.LESMAP, perKlas: true, remote: 'klas', validate: klas.lesmapGeldig, merge: klas.lesmapSamen },
      { kind: 'klassen', dir: klas.KLASSEN_LESMAP, remote: 'klassen-lijst', validate: klas.klassenGeldig, merge: klas.klassenSamen },
    ]);
    (async () => {
      ${code}
      const go = async () => { klas.naarLesmap(); klas.naarLesmapKlassen(); const c = await lesmap.sync(); if (c.includes('klassen')) klas.uitLesmapKlassen(); if (c.includes('klas')) klas.uitLesmap(); return c; };
      await go();
      process.stdout.write('\\n@@' + JSON.stringify({ klassen: klas.klassen(), namen: klas.names(), view: lesmap.view() }));
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  const b = sync(bord, `klas.write({ naam: '6A', namen: ['Lotte'] }); klas.nieuweKlas({ naam: '5B' }); klas.voegToe(['Ella']);`);
  assert.strictEqual(b.view.error, '');
  assert.ok(fs.existsSync(path.join(map, 'klas', 'klaslijst.json')) === false, 'de eerste klas was niet gekozen');
  assert.ok(fs.readdirSync(path.join(map, 'klassen')).length === 1);
  const t = sync(thuis, `klas.write({ naam: '6A', namen: ['Lotte'] });`);
  // Thuis kwam de klas 5B erbij, en de eerste klas bleef gekozen.
  assert.deepStrictEqual(t.klassen.klassen.map(k => k.naam), ['6A', '5B']);
  assert.deepStrictEqual(t.namen, ['Lotte']);
  const id = t.klassen.klassen[1].id;
  const t2 = sync(thuis, `klas.kiesKlas(${JSON.stringify(id)});`);
  assert.deepStrictEqual(t2.namen, ['Ella']);
  fs.rmSync(tmp, { recursive: true, force: true });
});
