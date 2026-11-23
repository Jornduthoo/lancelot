// Het toetsarchief: elke afgenomen toets vast bewaard per schooljaar > vak > maand, en het groeit alleen.
// (De pdf's zelf maakt de browser zonder venster; dat test de end-to-end-proef, hier gaat het om de mappen en de inhoud.)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const A = require('./src/toetsarchief'), settings = require('./src/settings'), proeven = require('./src/proeven'), gegevens = require('./src/gegevens');
  const fs = require('fs'), path = require('path');
  (async () => { ${code} })().then(r => process.stdout.write('\\n@@' + JSON.stringify(r === undefined ? null : r)), e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_BROWSER: '' }, encoding: 'utf8' }).split('\n@@').pop());

// Zoals in een echte afname: de gecontroleerde toets (met de punten per vraag ingevuld).
const TOETS = require('../public/js/pf-kern').validate({ title: 'Toets Frans 3', vragen: [{ type: 'meerkeuze', vraag: 'Bonjour?', opties: ['Goeiedag', 'Dag'], juist: 0 }, { type: 'open', vraag: 'Stel je voor.', punten: 2 }] });
const speler = (naam, mk, open) => ({ naam, niveau: 'schildknaap', antwoorden: { 0: mk }, auto: { 0: mk === 0 ? 1 : 0 }, hand: { 1: open }, events: [], begon: '2026-11-23T08:00:00.000Z', ingeleverd: '2026-11-23T08:20:00.000Z' });
const afname = (file, extra = {}) => ({ file, title: TOETS.title, datum: '2026-11-23T08:00:00.000Z', toetsFile: 'frans.json', toets: TOETS, spelers: [speler('Ada', 0, 2), speler('Bo', 1, 1)], klaar: true, gelogd: true, ...extra });
const nieuweData = naam => fs.mkdtempSync(path.join(os.tmpdir(), `archief-${naam}-`));

test('toetsarchief: schooljaar van september tot augustus, en het vak uit de titel voor oude toetsen', () => {
  const r = run(nieuweData('jaar'), `return [
    A.schooljaar(new Date(2026, 8, 1)), A.schooljaar(new Date(2027, 7, 31)), A.schooljaar(new Date(2026, 7, 31)),
    A.maandMap(new Date(2026, 10, 23)),
    A.vakUitTitel('Toets Frans 3'), A.vakUitTitel('rekenen blok 4'), A.vakUitTitel('Spelling week 3'), A.vakUitTitel('Kerstquiz'),
    A.vakVan({ title: 'Toets Frans 3', toets: { ...${JSON.stringify(TOETS)}, vak: 'Nederlands' } }),
    A.vakVan({ title: 'Kerstquiz', toets: ${JSON.stringify(TOETS)} }),
  ];`);
  assert.deepEqual(r, ['2026-2027', '2026-2027', '2025-2026', '11 november', 'Frans', 'Wiskunde', 'Nederlands', '', 'Nederlands', 'Zonder vak']);
});

test('toetsarchief: het vak is een echt veld van de toets, en verandert niets aan de punten', () => {
  const K = require('../public/js/pf-kern');
  const met = K.validate({ ...TOETS, vak: 'Frans' });
  assert.equal(met.vak, 'Frans');
  assert.equal(K.validate(TOETS).vak, undefined);
  assert.equal(K.totaal(met.vragen), K.totaal(K.validate(TOETS).vragen));
  // De bibliotheek en een taak nemen het gekozen vak, anders (zoals vroeger) het vak uit de doelen.
  const r = run(nieuweData('vak'), `
    proeven.save({ ...${JSON.stringify(TOETS)}, vak: 'Frans' }, 'frans.json');
    proeven.save(${JSON.stringify(TOETS)}, 'zonder.json');
    const l = proeven.list();
    return [l.find(t => t.file === 'frans.json').vak, l.find(t => t.file === 'zonder.json').vak];`);
  assert.deepEqual(r, ['Frans', '']);
});

test('toetsarchief: map per toets met opgave, resultaten (json + csv) en een map voor de pdf per leerling', () => {
  const data = nieuweData('bewaar');
  const r = run(data, `
    const res = A.bewaar(${JSON.stringify(afname('a1.json'))}, { klasId: 'eerste', klasNaam: '' });
    const rel = path.relative(A.map(), res.map);
    const json = JSON.parse(fs.readFileSync(path.join(res.map, 'resultaten.json'), 'utf8'));
    const csv = fs.readFileSync(path.join(res.map, 'resultaten.csv'), 'utf8');
    const opg = JSON.parse(fs.readFileSync(path.join(res.map, 'opgave.json'), 'utf8'));
    return { rel, root: A.map(), bestanden: fs.readdirSync(res.map).sort(), punten: json.leerlingen.map(l => [l.naam, l.punten, l.max]), vraag: json.leerlingen[0].vragen[1], csv: csv.split('\\r\\n').slice(4, 7), opgave: opg.opgave.title, vak: opg.vak };`);
  assert.equal(r.rel, path.join('2026-2027', 'Frans', '11 november', '2026-11-23 Toets Frans 3'));
  assert.equal(r.root, path.join(data, 'toetsarchief'));
  assert.deepEqual(r.bestanden, ['Leerlingen', '_archief.json', 'opgave.json', 'resultaten.csv', 'resultaten.json']);
  assert.deepEqual(r.punten, [['Ada', 3, 3], ['Bo', 1, 3]]);
  assert.deepEqual({ nr: r.vraag.nr, max: r.vraag.max, punten: r.vraag.punten }, { nr: 2, max: 2, punten: 2 });
  assert.match(r.csv[0], /^Naam;Punten;Op/);
  assert.match(r.csv[1], /^Ada;3;3;100%/);
  assert.equal(r.opgave, 'Toets Frans 3');
  assert.equal(r.vak, 'Frans');
});

test('toetsarchief: groeit alleen (een leerling die uit de afname verdwijnt, blijft; een gewijzigde opgave komt ernaast)', () => {
  const data = nieuweData('groei');
  const een = afname('a1.json');
  const twee = { ...afname('a1.json'), spelers: [speler('Ada', 0, 1)], toets: { ...TOETS, vragen: [{ ...TOETS.vragen[0], vraag: 'Anders?' }, TOETS.vragen[1]] } };
  const r = run(data, `
    const a = A.bewaar(${JSON.stringify(een)}, { klasId: 'eerste' });
    const b = A.bewaar(${JSON.stringify(twee)}, { klasId: 'eerste' });
    const json = JSON.parse(fs.readFileSync(path.join(b.map, 'resultaten.json'), 'utf8'));
    const csv = fs.readFileSync(path.join(b.map, 'resultaten.csv'), 'utf8');
    const opg = JSON.parse(fs.readFileSync(path.join(b.map, 'opgave.json'), 'utf8'));
    return { zelfde: a.map === b.map, ll: json.leerlingen.map(l => [l.naam, l.punten, !!l.nietMeerInLANcelot]), bo: /\\r\\nBo;/.test(csv),
      opgave: opg.opgave.vragen[0].vraag, versies: fs.readdirSync(b.map).filter(f => f.startsWith('opgave')).sort() };`);
  assert.equal(r.zelfde, true);
  assert.deepEqual(r.ll, [['Ada', 2, false], ['Bo', 1, true]]);
  assert.equal(r.bo, true);
  assert.equal(r.opgave, 'Bonjour?');
  assert.deepEqual(r.versies, ['opgave (versie 2).json', 'opgave.json']);
});

test('toetsarchief: twee afnames van dezelfde toets op dezelfde dag elk in een eigen map; met meerdere klassen per klas', () => {
  const r = run(nieuweData('twee'), `
    const a = A.bewaar(${JSON.stringify(afname('a1.json'))}, { klasId: 'eerste' });
    const b = A.bewaar(${JSON.stringify(afname('a2.json'))}, { klasId: 'eerste' });
    // Verwijderd en in dezelfde minuut opnieuw gestart: dezelfde bestandsnaam, een ander begin.
    const c = A.bewaar(${JSON.stringify(afname('a1.json', { datum: '2026-11-23T08:00:30.000Z' }))}, { klasId: 'eerste' });
    const k = A.bewaar(${JSON.stringify(afname('a1.json'))}, { klasId: 'k2', klasNaam: '6B' });
    return [a, b, c, k].map(x => path.relative(A.map(), x.map));`);
  assert.deepEqual(r, [
    path.join('2026-2027', 'Frans', '11 november', '2026-11-23 Toets Frans 3'),
    path.join('2026-2027', 'Frans', '11 november', '2026-11-23 Toets Frans 3 (2)'),
    path.join('2026-2027', 'Frans', '11 november', '2026-11-23 Toets Frans 3 (3)'),
    path.join('2026-2027', '6B', 'Frans', '11 november', '2026-11-23 Toets Frans 3'),
  ]);
});

test('toetsarchief: een ronde bewaart wat klaar is (de maandronde ook wat nog niet klaar is); vóór verwijderen altijd', () => {
  const data = nieuweData('ronde');
  const dir = path.join(data, 'proeven', '_afnames');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'klaar.json'), JSON.stringify(afname('klaar.json')));
  fs.writeFileSync(path.join(dir, 'open.json'), JSON.stringify({ ...afname('open.json'), title: 'Spelling 4', klaar: false, datum: '2026-10-02T08:00:00.000Z' }));
  fs.writeFileSync(path.join(dir, 'weg.json'), JSON.stringify({ ...afname('weg.json'), title: 'Rekenen blok 2', klaar: false, datum: '2026-09-15T08:00:00.000Z' }));
  const r = run(data, `
    settings.write({ archiefMaandGedaan: '2000-01' });
    const toetsen = () => A.jaren().reduce((n, j) => n + j.toetsen, 0);
    const een = await A.ronde();
    const nog = await A.ronde();
    const na1 = toetsen();
    A.voorWeg('weg.json');
    const na2 = toetsen();
    const maand = await A.ronde({ alles: true });
    const uit = A.zet({ aan: false });
    const niets = A.bewaar(JSON.parse(fs.readFileSync(path.join(${JSON.stringify(dir)}, 'klaar.json'), 'utf8')), { klasId: 'x' });
    return { een: een.bewaard, nog: nog.bewaard, na1, na2, maand: maand.bewaard, na3: toetsen(), uit: uit.aan, niets, gedaan: settings.read().archiefMaandGedaan };`);
  assert.equal(r.een, 1);
  assert.equal(r.nog, 0);
  assert.equal(r.na1, 1);
  assert.equal(r.na2, 2);
  assert.equal(r.maand, 2);
  assert.equal(r.na3, 3);
  assert.equal(r.uit, false);
  assert.equal(r.niets, null);
  assert.match(r.gedaan, /^\d{4}-\d{2}$/);
});

test('toetsarchief: in een gedeelde archiefmap (Mijn lesmap) bewaart alleen de pc die de toets afnam', () => {
  const data = nieuweData('gedeeld');
  const lesmap = path.join(data, 'lesmap');
  fs.mkdirSync(lesmap);
  const dir = path.join(data, 'proeven', '_afnames');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ander.json'), JSON.stringify(afname('ander.json', { pc: 'ANDERE-PC' })));
  const r = run(data, `
    settings.write({ lesmap: ${JSON.stringify(lesmap)} });
    const a = await A.ronde();
    settings.write({ archiefMap: ${JSON.stringify(path.join(data, 'eigen'))} });
    const b = await A.ronde();
    return { map: A.map(), a: a.bewaard, b: b.bewaard };`);
  assert.equal(r.a, 0);
  assert.equal(r.b, 1);
  assert.equal(r.map, path.join(data, 'eigen'));
});

test('toetsarchief: Exporteer schooljaar maakt een zip met alles van dat jaar', () => {
  const data = nieuweData('zip');
  const uit = path.join(data, 'jaar.zip');
  const r = run(data, `
    A.bewaar(${JSON.stringify(afname('a1.json'))}, { klasId: 'eerste' });
    const n = await A.exporteer('2026-2027', ${JSON.stringify(uit)});
    let fout = '';
    try { await A.exporteer('2019-2020', ${JSON.stringify(uit + '2')}); } catch (e) { fout = e.message; }
    return { n, fout, jaren: A.jaren() };`);
  const namen = require('../src/zip').read(fs.readFileSync(uit)).map(e => e.name).sort();
  assert.equal(r.n, 3);
  assert.deepEqual(namen, ['opgave.json', 'resultaten.csv', 'resultaten.json'].map(f => `Toetsarchief 2026-2027/Frans/11 november/2026-11-23 Toets Frans 3/${f}`));
  assert.match(r.fout, /nog niets/);
  assert.deepEqual(r.jaren, [{ jaar: '2026-2027', toetsen: 1 }]);
});

test('toetsarchief: een eigen map moet bestaan en mag niet in de map van LANcelot zelf', () => {
  const data = nieuweData('map');
  const r = run(data, `
    const fout = m => { try { A.zet({ map: m }); return ''; } catch (e) { return e.message; } };
    return [fout('relatief/pad'), fout(gegevens.APP), fout(path.join(${JSON.stringify(data)}, 'bestaat', 'niet')), fout(path.join(${JSON.stringify(data)}, 'goed')), A.view().eigen];`);
  assert.match(r[0], /volledige pad/);
  assert.match(r[1], /buiten de map van LANcelot/);
  assert.match(r[2], /niet te vinden/);
  assert.equal(r[3], '');
  assert.equal(r[4], true);
});
