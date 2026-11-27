// De mappenindeling (_mappen.json) van quizzen, toetsen en oefenbladen veilig houden.
// Fout van 2026-11-27: de lijst "welke quiz in welke map" werd leeg (een lezing die mislukte, werd als "geen mappen"
// bewaard) en Mijn lesmap zette die lege lijst op elke pc: 778 quizzen stonden los.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOETS = n => ({ titel: n, vragen: [{ type: 'kort', vraag: 'Hoofdstad van België?', antwoord: 'Brussel', punten: 1 }] });
const N = 30;

// Een stukje code op een "pc" (eigen datamap) draaien, met Mijn lesmap als map gegeven is.
function pc(data, map, code) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path');
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
    ${map ? `settings.write({ lesmap: ${JSON.stringify(map)} });` : ''}
    lesmap.init([{ kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate }]);
    const lib = proeven.lib, T = ${TOETS.toString()}, N = ${N};
    const META = path.join(proeven.DIR, '_mappen.json');
    const telIn = () => { const w = lib.places(); return proeven.list().filter(x => w(x.file)).length; };
    (async () => {
      const uit = {};
      ${code}
      process.stdout.write('\\n@@' + JSON.stringify(uit));
    })().catch(err => { process.stdout.write('\\n@@' + JSON.stringify({ fout: err.message })); });
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
}

const MAAK = `
  for (let i = 0; i < N; i++) proeven.save(T('t' + i), 't' + i + '.json');
  lib.addFolder('Taal'); lib.addFolder('Wiskunde');
  for (let i = 0; i < N; i++) lib.move('t' + i + '.json', i % 2 ? 'Taal' : 'Wiskunde');
  // De kopie van vandaag: zoals de indeling stond voor de eerste wijziging van de dag (hier: na het maken).
  fs.rmSync(path.join(proeven.DIR, '_mappen-kopie'), { recursive: true, force: true });
  lib.verlies();`;

test('een _mappen.json die even niet te lezen is, wordt nooit als lege indeling bewaard', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-lezen-'));
  const data = path.join(tmp, 'pc');
  // Eerst goed gelezen, daarna even kapot (half geschreven, vastgehouden): de laatste goede lezing telt.
  let uit = pc(data, '', `${MAAK}
    lib.folders();
    fs.writeFileSync(META, '{"folders": ["Ta');
    lib.move('t0.json', 'Taal');
    uit.in = telIn(); uit.mappen = lib.folders();`);
  assert.strictEqual(uit.in, N);
  assert.deepStrictEqual(uit.mappen, ['Taal', 'Wiskunde']);
  // Een nieuwe start met een kapot bestand en een kopie van vandaag: de kopie telt.
  uit = pc(data, '', `
    fs.writeFileSync(META, 'kapot');
    lib.move('t1.json', 'Wiskunde');
    uit.in = telIn();`);
  assert.strictEqual(uit.in, N);
  // Geen goede lezing en geen kopie: liever een foutmelding dan alles los, en het bestand blijft zoals het was.
  fs.rmSync(path.join(data, 'proeven', '_mappen-kopie'), { recursive: true, force: true });
  fs.writeFileSync(path.join(data, 'proeven', '_mappen.json'), 'kapot');
  uit = pc(data, '', `
    try { lib.move('t2.json', 'Taal'); uit.gelukt = true; } catch (err) { uit.fout = err.message; }
    uit.tekst = fs.readFileSync(META, 'utf8');`);
  assert.ok(!uit.gelukt && /even niet te lezen/.test(uit.fout));
  assert.strictEqual(uit.tekst, 'kapot');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Mijn lesmap: een (bijna) lege indeling overschrijft nooit een grote', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-sync-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  pc(thuis, map, `${MAAK} await lesmap.sync();`);
  let uit = pc(bord, map, 'await lesmap.sync(); uit.in = telIn();');
  assert.strictEqual(uit.in, N);

  // 1. Op het bord wordt de indeling leeg (zonder tijden), en er gebeurt nog één verplaatsing: de sync houdt alles.
  uit = pc(bord, map, `
    fs.writeFileSync(META, JSON.stringify({ folders: [], place: {} }));
    await lesmap.sync();
    uit.in = telIn();`);
  assert.strictEqual(uit.in, N, 'het bord houdt de mappen');
  uit = pc(thuis, map, 'await lesmap.sync(); uit.in = telIn();');
  assert.strictEqual(uit.in, N, 'en thuis ook');

  // 2. Erger: een lege indeling mét tijden (alles "uit de map gehaald", alle mappen "weg"), maar niet door de leerkracht.
  uit = pc(bord, map, `
    const m = JSON.parse(fs.readFileSync(META, 'utf8'));
    const nu = Date.now();
    m.tijd = Object.fromEntries(Object.keys(m.place).map(f => [f, nu]));
    m.weg = Object.fromEntries(m.folders.map(f => [f, nu]));
    m.mapTijd = {}; m.place = {}; m.folders = []; delete m.bewust;
    fs.writeFileSync(META, JSON.stringify(m));
    await lesmap.sync();
    uit.in = telIn();
    uit.kopie = fs.readdirSync(path.join(proeven.DIR, '_mappen-kopie')).some(n => n.startsWith('geweigerd-'));
    uit.beschermd = !!lesmap.view().beschermd;`);
  assert.strictEqual(uit.in, N);
  assert.ok(uit.kopie, 'de geweigerde versie blijft bewaard');
  assert.ok(uit.beschermd);
  uit = pc(thuis, map, 'await lesmap.sync(); uit.in = telIn();');
  assert.strictEqual(uit.in, N);

  // 3. De leerkracht verwijdert zelf een grote map: dat mag wel, en het gaat naar de andere pc.
  uit = pc(thuis, map, `lib.removeFolder('Wiskunde'); lib.removeFolder('Taal'); await lesmap.sync(); uit.in = telIn();`);
  assert.strictEqual(uit.in, 0);
  uit = pc(bord, map, 'await lesmap.sync(); uit.in = telIn(); uit.mappen = lib.folders();');
  assert.strictEqual(uit.in, 0);
  assert.deepStrictEqual(uit.mappen, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('staan plots veel items los, dan zegt de lijst het en zet "Terugzetten" ze terug uit de dagkopie', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-melding-'));
  const data = path.join(tmp, 'pc');
  let uit = pc(data, '', `${MAAK}
    uit.eerst = lib.verlies();
    uit.kopie = fs.readdirSync(path.join(proeven.DIR, '_mappen-kopie')).filter(n => /^_mappen-\\d{4}-\\d\\d-\\d\\d\\.json$/.test(n)).length;`);
  assert.strictEqual(uit.eerst, null);
  assert.strictEqual(uit.kopie, 1, 'een kopie van vandaag');

  // De indeling wordt leeg (bv. een oude fout): melding, en terugzetten zet alles terug zonder iets te verwijderen.
  uit = pc(data, '', `
    fs.writeFileSync(META, JSON.stringify({ folders: ['Taal'], place: { 't1.json': 'Taal' } }));
    uit.voor = lib.verlies();
    uit.terug = lib.herstel(uit.voor.dag).terug;
    uit.in = telIn(); uit.mappen = lib.folders(); uit.na = lib.verlies(); uit.toetsen = proeven.list().length;`);
  assert.strictEqual(uit.voor.los, N - 1);
  assert.strictEqual(uit.terug, N - 1);
  assert.strictEqual(uit.in, N);
  assert.deepStrictEqual(uit.mappen, ['Taal', 'Wiskunde']);
  assert.strictEqual(uit.na, null);
  assert.strictEqual(uit.toetsen, N);

  // Zelf een map verwijderen geeft geen melding; "Klopt zo" laat de melding weg.
  uit = pc(data, '', `
    lib.removeFolder('Wiskunde');
    uit.zelf = lib.verlies();
    fs.writeFileSync(META, JSON.stringify({ folders: [], place: {} }));
    uit.leeg = lib.verlies();
    lib.kloptZo();
    uit.na = lib.verlies();`);
  assert.strictEqual(uit.zelf, null);
  assert.strictEqual(uit.leeg.los, N / 2);
  assert.strictEqual(uit.na, null);
  fs.rmSync(tmp, { recursive: true, force: true });
});
