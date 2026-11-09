// Het Runenraadsel en Mijn lesmap: de woorden van de week gaan mee (thuis klaarzetten), de spelresultaten niet.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('Mijn lesmap: de woorden van de week van het Runenraadsel gaan mee, de resultaten blijven op het bord', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'runen-lesmap-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  const sync = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
    const klas = require('./src/klas'), lesmap = require('./src/lesmap'), settings = require('./src/settings'), runen = require('./src/runen');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    lesmap.init([{ kind: 'runen', dir: () => runen.WOORDEN_DIR, perKlas: true, remote: 'runenraadsel', validate: runen.lijstGeldig }]);
    (async () => {
      ${code}
      runen.verhuis();
      const c = await lesmap.sync();
      if (c.includes('runen')) runen.uitLesmap();
      runen.flush();
      process.stdout.write('\\n@@' + JSON.stringify({ lijst: runen.lijstView(), view: lesmap.view() }));
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

  // Op het bord: een oude weeklijst (los in runen/) en een leerling die speelde.
  fs.mkdirSync(path.join(bord, 'runen'), { recursive: true });
  fs.writeFileSync(path.join(bord, 'runen', 'weeklijst.json'), JSON.stringify({ woorden: [{ w: 'kasteel', b: 'burcht', z: '' }], doel: '' }));
  const b = sync(bord, `klas.write({ naam: '6A', namen: ['Lotte'] }); runen.raad({ naam: 'Lotte', niveau: 'page', woord: 'boom' });`);
  assert.strictEqual(b.view.error, '');
  assert.ok(fs.existsSync(path.join(bord, 'runen', 'woorden', 'weeklijst.json')), 'de oude weeklijst is verhuisd');
  assert.ok(!fs.existsSync(path.join(bord, 'runen', 'weeklijst.json')));
  // In de lesmap alleen de weeklijst, geen resultaten van leerlingen.
  assert.deepStrictEqual(fs.readdirSync(path.join(map, 'runenraadsel')), ['weeklijst.json']);
  assert.ok(!fs.readdirSync(map).some(n => n === 'runen'));

  // Thuis: de lijst van het bord staat er, en een nieuwe lijst gaat terug naar het bord.
  const t = sync(thuis, `klas.write({ naam: '6A', namen: ['Lotte'] });`);
  assert.deepStrictEqual(t.lijst.woorden.map(x => x.w), ['kasteel']);
  sync(thuis, `runen.bewaarLijst({ text: 'ridder = iemand met een harnas\\nschild' });`);
  const b2 = sync(bord, '');
  assert.deepStrictEqual(b2.lijst.woorden.map(x => x.w), ['ridder', 'schild']);

  // Een kapotte lijst in de lesmap komt niet binnen.
  fs.writeFileSync(path.join(map, 'runenraadsel', 'weeklijst.json'), JSON.stringify({ woorden: [{ w: 'veel te lang woord' }] }));
  const b3 = sync(bord, '');
  assert.deepStrictEqual(b3.lijst.woorden.map(x => x.w), ['ridder', 'schild']);
  fs.rmSync(tmp, { recursive: true, force: true });
});
