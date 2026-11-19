// Mijn lesmap en de mappen van toetsen (en quizzen, oefenbladen: dezelfde _mappen.json).
// Fout van 2026-11-19: een toets die thuis in een map gezet werd, sprong op het bord terug naar een oude map of naar
// "zonder map" zodra ook daar iets aan de mappen veranderd was. Nu wint per toets de laatste verplaatsing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOETS = n => ({ titel: n, vragen: [{ type: 'kort', vraag: 'Hoofdstad van België?', antwoord: 'Brussel', punten: 1 }] });

test('Mijn lesmap: mappen van toetsen worden per toets samengevoegd, de laatste verplaatsing wint', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-lesmap-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  let klok = Date.parse('2026-11-19T08:00:00Z');
  const pc = (data, code) => {
    klok += 60000;
    return JSON.parse(execFileSync(process.execPath, ['-e', `
      const realNow = Date.now; Date.now = () => ${klok};
      const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
      settings.write({ lesmap: ${JSON.stringify(map)} });
      lesmap.init([{ kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate }]);
      const lib = proeven.lib, T = ${TOETS.toString()};
      (async () => {
        ${code}
        await lesmap.sync();
        const where = lib.places();
        const plaats = {};
        for (const x of proeven.list()) plaats[x.file] = where(x.file);
        process.stdout.write('\\n@@' + JSON.stringify({ plaats, mappen: lib.folders(), error: lesmap.view().error }));
      })();
    `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  };

  // Thuis: drie toetsen, twee mappen. Het bord haalt alles op.
  let t = pc(thuis, `
    for (const n of ['taal', 'wo', 'frans']) proeven.save(T(n), n + '.json');
    lib.addFolder('Taal'); lib.addFolder('WO'); lib.addFolder('Oud');
    lib.move('taal.json', 'Oud'); lib.move('wo.json', 'WO');`);
  assert.strictEqual(t.error, '');
  let b = pc(bord, '');
  assert.deepStrictEqual(b.plaats, { 'taal.json': 'Oud', 'wo.json': 'WO', 'frans.json': '' });

  // Thuis: taal naar de map Taal, wo naar "zonder map". Op het bord ondertussen: frans in Taal (dus beide kanten veranderd).
  pc(thuis, `lib.move('taal.json', 'Taal'); lib.move('wo.json', '');`);
  b = pc(bord, `lib.move('frans.json', 'Taal');`);
  assert.deepStrictEqual(b.plaats, { 'taal.json': 'Taal', 'wo.json': '', 'frans.json': 'Taal' }, 'niets springt terug op het bord');
  t = pc(thuis, '');
  assert.deepStrictEqual(t.plaats, b.plaats, 'en thuis staat hetzelfde');

  // Een oude _mappen.json in de lesmap (OneDrive zet een oude versie terug): de nieuwere plaatsen blijven.
  const lm = path.join(map, 'toetsen', '_mappen.json');
  const oud = JSON.parse(fs.readFileSync(lm, 'utf8'));
  oud.place = { 'taal.json': 'Oud', 'wo.json': 'WO' };
  for (const k of Object.keys(oud.tijd)) oud.tijd[k] -= 3600e3;
  fs.writeFileSync(lm, JSON.stringify(oud));
  b = pc(bord, '');
  assert.deepStrictEqual(b.plaats, { 'taal.json': 'Taal', 'wo.json': '', 'frans.json': 'Taal' });

  // Een map verwijderen aan de ene kant, terwijl de andere kant iets anders deed: de map komt niet terug.
  pc(bord, `lib.removeFolder('Oud');`);
  t = pc(thuis, `lib.addFolder('Rekenen');`);
  assert.deepStrictEqual(t.mappen, ['Rekenen', 'Taal', 'WO']);
  b = pc(bord, '');
  assert.deepStrictEqual(b.mappen, ['Rekenen', 'Taal', 'WO']);

  // Een toets die het bord (nog) niet kan openen, houdt toch zijn map in de lesmap.
  fs.writeFileSync(path.join(map, 'toetsen', 'nieuw.json'), JSON.stringify({ kapot: true }));
  const meta = JSON.parse(fs.readFileSync(lm, 'utf8'));
  meta.place['nieuw.json'] = 'WO'; meta.tijd['nieuw.json'] = klok;
  fs.writeFileSync(lm, JSON.stringify(meta));
  pc(bord, '');
  assert.strictEqual(JSON.parse(fs.readFileSync(lm, 'utf8')).place['nieuw.json'], 'WO');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Mijn lesmap: een oude _mappen.json zonder tijden werkt zoals vroeger', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-oud-'));
  const bord = path.join(tmp, 'bord'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(path.join(map, 'toetsen'), { recursive: true });
  fs.mkdirSync(path.join(bord, 'proeven'), { recursive: true });
  fs.writeFileSync(path.join(map, 'toetsen', 'a.json'), JSON.stringify(TOETS('a')));
  fs.writeFileSync(path.join(map, 'toetsen', '_mappen.json'), JSON.stringify({ folders: ['X'], place: { 'a.json': 'X' } }));
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    lesmap.init([{ kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate }]);
    lesmap.sync().then(() => process.stdout.write('\\n@@' + JSON.stringify(proeven.lib.places()('a.json'))));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: bord }, encoding: 'utf8' }).split('\n@@').pop());
  assert.strictEqual(out, 'X');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Mijn lesmap: schrijft een ander toestel een oude _mappen.json (zonder tijden), dan zegt LANcelot het', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappen-ander-'));
  const bord = path.join(tmp, 'bord'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(path.join(map, 'toetsen'), { recursive: true });
  fs.mkdirSync(path.join(bord, 'proeven'), { recursive: true });
  for (const n of ['a', 'b']) fs.writeFileSync(path.join(map, 'toetsen', `${n}.json`), JSON.stringify(TOETS(n)));
  // Een oude lesmap van voor de tijden: de eerste ronde is geen melding (dat was deze pc zelf, voor de update).
  fs.writeFileSync(path.join(map, 'toetsen', '_mappen.json'), JSON.stringify({ folders: ['X'], place: { 'a.json': 'X', 'b.json': 'X' } }));
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const fs = require('fs');
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    lesmap.init([{ kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate }]);
    (async () => {
      await lesmap.sync();
      const eerst = !!lesmap.view().oudToestel;
      fs.writeFileSync(${JSON.stringify(path.join(map, 'toetsen', '_mappen.json'))}, JSON.stringify({ folders: ['X'], place: { 'a.json': 'X' } }));
      await lesmap.sync();
      process.stdout.write('\\n@@' + JSON.stringify({ eerst, daarna: !!lesmap.view().oudToestel }));
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: bord }, encoding: 'utf8' }).split('\n@@').pop());
  assert.deepStrictEqual(out, { eerst: false, daarna: true });
  fs.rmSync(tmp, { recursive: true, force: true });
});
