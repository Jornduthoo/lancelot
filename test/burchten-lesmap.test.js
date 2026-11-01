// Het Klaseiland via Mijn lesmap: het digibord zet een kopie klaar, thuis zie je dezelfde burchten (alleen bekijken).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), logboek = require('./src/logboek'), burchten = require('./src/burchten');
  const out = (() => { ${code} })();
  logboek.flush && logboek.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('thuis toont het Klaseiland de kopie van het digibord, en blokkeert aanpassen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bu-lesmap-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis');
  run(bord, `
    klas.write({ naam: '6A', namen: ['Lotte', 'Mats'] });
    logboek.add([1, 2, 3, 4, 5, 6].map(i => ({ naam: 'Lotte', spel: 'Quiz', bron: 'Breuken', vraag: 'v' + i, juist: true })));
    burchten.stijl('Lotte', { burchtnaam: 'Zonneburcht' });
    burchten.naarLesmap();
  `);
  const kopieen = fs.readdirSync(path.join(bord, 'burchten', 'lesmap'));
  assert.strictEqual(kopieen.length, 1);
  const tekst = fs.readFileSync(path.join(bord, 'burchten', 'lesmap', kopieen[0]), 'utf8');
  // Geen logboek in de lesmap: wat de leerling precies speelde, blijft op het bord.
  assert.ok(!tekst.includes('Breuken'));

  // De lesmap bracht de kopie naar de pc thuis.
  fs.mkdirSync(path.join(thuis, 'burchten', 'lesmap'), { recursive: true });
  fs.writeFileSync(path.join(thuis, 'burchten', 'lesmap', 'BORD-PC.json'), tekst);
  const res = run(thuis, `
    klas.write({ naam: '6A', namen: ['Lotte', 'Mats'] });
    let fout = '';
    try { burchten.geef({ leerlingen: klas.read().leerlingen.map(l => l.id), n: 5 }); } catch (e) { fout = e.message; }
    burchten.naarLesmap();
    const fs = require('fs'); return { eiland: burchten.eiland(), boek: burchten.ridderboek(), fout, eigen: fs.existsSync(burchten.LESMAP) ? fs.readdirSync(burchten.LESMAP) : [] };
  `);
  assert.ok(res.eiland.kopie, 'thuis is het een kopie');
  assert.strictEqual(res.eiland.burchten.find(b => b.leerling === 'Lotte').naam, 'Zonneburcht');
  assert.ok(res.boek.find(l => l.naam === 'Lotte').eer > 0);
  assert.match(res.fout, /kopie van het digibord/);
  // Thuis speelde niemand: die pc zet zelf geen kopie in de lesmap.
  assert.deepStrictEqual(res.eigen, ['BORD-PC.json']);

  // Op het bord zelf blijft alles gewoon (de eigen kopie telt niet).
  const opBord = run(bord, 'return burchten.eiland();');
  assert.ok(!opBord.kopie);
  fs.rmSync(tmp, { recursive: true, force: true });
});
