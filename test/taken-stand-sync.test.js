// De stand van de leerlingen op je andere pc's (fout 21 nov): wie niet in het plan staat, telt niet bij "Nog niet af",
// en een soort die niet lukt in Mijn lesmap houdt de andere soorten (zoals de stand van de taken) niet tegen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code, pcNaam = 'PCA') => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), fs = require('fs'), path = require('path');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_PC: pcNaam }, encoding: 'utf8' }).split('\n@@').pop());

function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-stand-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
const kopieer = (van, naar, map, naam) => {
  fs.mkdirSync(path.join(naar, 'taken', map), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', map, naam), path.join(naar, 'taken', map, naam));
};
const NAMEN = "['Lotte', 'Mats', 'Noor', 'Daan']";

test('weggehaald op het bord: thuis ook weg (zolang nergens begonnen), en de stand van het bord telt', () => {
  const bord = pc(), thuis = pc();
  const { id } = run(bord, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ${NAMEN} });
    return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ${NAMEN} }).id };
  `, 'BORD');
  kopieer(bord, thuis, 'plan', `${id}.json`);
  // Thuis: de taak komt binnen met de vier namen. Thuis begint Daan (bv. thuis klaargezet en daar gemaakt).
  run(thuis, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ${NAMEN} });
    taken.uitLesmap();
    taken.open({ id: '${id}', naam: 'Daan' });
    taken.antwoord({ id: '${id}', naam: 'Daan', veld: '1.0', waarde: 'x' });
  `, 'THUIS');
  // Op het bord: Noor en Daan weg uit de taak, Lotte en Mats maken ze af. Het plan en de stand gaan naar de lesmap.
  run(bord, `
    taken.haalWeg({ id: '${id}', naam: 'Noor' });
    taken.haalWeg({ id: '${id}', naam: 'Daan' });
    for (const n of ['Lotte', 'Mats']) { taken.open({ id: '${id}', naam: n }); taken.antwoord({ id: '${id}', naam: n, veld: '1.0', waarde: 'Brussel' }); taken.inleveren({ id: '${id}', naam: n }); }
    taken.naarLesmapStand('');
  `, 'BORD');
  const plan = JSON.parse(fs.readFileSync(path.join(bord, 'taken', 'plan', `${id}.json`), 'utf8'));
  assert.deepStrictEqual(plan.namen.sort(), ['Lotte', 'Mats'], 'weghalen past ook het plan aan');
  kopieer(bord, thuis, 'plan', `${id}.json`);
  kopieer(bord, thuis, 'stand', `${id}@BORD.json`);
  const na = run(thuis, `
    taken.uitLesmap();
    const vandaag = require('./src/vandaag');
    const t = taken.lijst().find(x => x.id === '${id}');
    // Alsof de taak gisteren gegeven werd: wie staat er bij "Nog niet af"?
    const gisteren = { ...t, dag: new Date(Date.now() - 864e5).toISOString() };
    const s = vandaag.samenvatting([gisteren], []);
    return { leerlingen: t.leerlingen.map(l => l.naam + ':' + l.status), nietAf: s.nietAf.flatMap(x => x.namen.map(n => n.naam)), perPc: taken.standPerPc() };
  `, 'THUIS');
  // Noor (nergens begonnen) is weg. Daan begon thuis: zijn werk blijft. Lotte en Mats: klaar via de stand van het bord.
  assert.deepStrictEqual(na.leerlingen, ['Daan:bezig', 'Lotte:klaar', 'Mats:klaar']);
  assert.deepStrictEqual(na.nietAf, ['Daan']);
  assert.deepStrictEqual(na.perPc, { BORD: 1 });
});

test('Mijn lesmap: lukt één soort niet, dan gaan de andere soorten toch door (en je ziet wat binnenkwam)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lesmap-soort-'));
  const map = path.join(tmp, 'lesmap'), data = path.join(tmp, 'pc');
  fs.mkdirSync(path.join(map, 'tweede'), { recursive: true });
  fs.writeFileSync(path.join(map, 'tweede', 'a.json'), '{"x":1}');
  fs.writeFileSync(path.join(map, 'tweede', 'b.json'), '{"x":2}');
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), path = require('path');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    const dir = n => path.join(${JSON.stringify(data)}, n);
    lesmap.init([
      { kind: 'kapot', dir: () => { throw new Error('Map even niet bereikbaar.'); }, remote: 'eerste', validate: () => {} },
      { kind: 'takenstand', dir: () => dir('tweede'), remote: 'tweede', validate: () => {} },
    ], { overzicht: () => ({ takenstand: [{ pc: 'Digibord', n: 2 }] }) });
    lesmap.sync().then(changed => process.stdout.write('\\n@@' + JSON.stringify({ changed, view: lesmap.view() })));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  assert.deepStrictEqual(out.changed, ['takenstand']);
  assert.ok(fs.existsSync(path.join(data, 'tweede', 'b.json')), 'de tweede soort kwam toch binnen');
  assert.match(out.view.error, /Niet alles kon gesynchroniseerd worden/);
  const kapot = out.view.soorten.find(s => s.soort === 'kapot');
  assert.strictEqual(kapot.fout, 'Map even niet bereikbaar.');
  const stand = out.view.soorten.find(s => s.soort === 'takenstand');
  assert.strictEqual(stand.binnen.n, 2);
  assert.deepStrictEqual(stand.van, [{ pc: 'Digibord', n: 2 }]);
});
