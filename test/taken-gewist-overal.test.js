// Een taak wissen op één pc haalt ze ook weg op je andere pc's (via Mijn lesmap), ook op de pc waar leerlingen er al
// aan begonnen (vroeger bleef ze daar open staan). Wie bezig was, levert eerst in: wat hij deed, gaat nooit verloren.
// Een oud plan van een andere pc zet een gewiste taak niet terug. Een leerling ziet meteen dat een taak dicht of weg is.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), logboek = require('./src/logboek'), fs = require('fs'), path = require('path');
  const out = (() => { ${code} })();
  taken.flush(); logboek.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-gewist-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
const kopieerPlan = (van, naar, id) => {
  fs.mkdirSync(path.join(naar, 'taken', 'plan'), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', 'plan', `${id}.json`), path.join(naar, 'taken', 'plan', `${id}.json`));
};
const KLAS = `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });`;

test('wissen op pc A: ook weg op pc B waar Lotte al bezig was, en haar werk staat in het logboek', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'] }).id };`);
  kopieerPlan(A, B, id);
  run(B, `${KLAS} taken.uitLesmap(); taken.open({ id: '${id}', naam: 'Lotte' }); taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.0', waarde: 'Brussel' });`);
  run(A, `taken.wis('${id}');`);
  const plan = JSON.parse(fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`), 'utf8'));
  assert.ok(plan.gewist, 'het plan zegt "gewist" (en is niet gewoon weg)');
  assert.strictEqual(plan.dicht, true);
  kopieerPlan(A, B, id);
  const b = run(B, `
    const veranderd = taken.uitLesmap();
    return { veranderd, er: taken.lijst().some(x => x.id === '${id}'), staat: taken.staat('${id}'), open: taken.aantal('Lotte'),
      logboek: logboek.read().filter(r => r.sessie === 'taak-${id}' && r.naam === 'Lotte').length };
  `);
  assert.strictEqual(b.veranderd, true);
  assert.strictEqual(b.er, false);
  assert.strictEqual(b.staat, 'weg');
  assert.strictEqual(b.open, 0);
  assert.ok(b.logboek > 0, 'wat Lotte invulde, staat in het logboek');
});

test('hier gewist: een oud plan van een andere pc zet de taak niet terug, en het plan blijft "gewist"', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }).id };`);
  const oud = fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`));
  run(A, `taken.wis('${id}');`);
  fs.writeFileSync(path.join(A, 'taken', 'plan', `${id}.json`), oud);
  const a = run(A, `taken.uitLesmap(); return { er: taken.lijst().some(x => x.id === '${id}'), gewist: !!JSON.parse(fs.readFileSync(path.join(taken.PLAN, '${id}.json'), 'utf8')).gewist };`);
  assert.deepStrictEqual(a, { er: false, gewist: true });
});

test('wissen terwijl een leerling bezig is: hij levert eerst in', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }); taken.open({ id: t.id, naam: 'Lotte' }); taken.antwoord({ id: t.id, naam: 'Lotte', veld: '1.0', waarde: 'Brussel' }); return { id: t.id };`);
  const n = run(A, `taken.wis('${id}'); return logboek.read().filter(r => r.sessie === 'taak-${id}').length;`);
  assert.ok(n > 0);
});

test('een gewiste taak wordt na 30 dagen vergeten (ook het plan "gewist")', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }).id };`);
  run(A, `taken.wis('${id}');`);
  const f = path.join(A, 'taken', 'taken.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.gewist[id] = new Date(Date.now() - 31 * 864e5).toISOString();
  fs.writeFileSync(f, JSON.stringify(d));
  run(A, `taken.uitLesmap();`);
  assert.strictEqual(fs.existsSync(path.join(A, 'taken', 'plan', `${id}.json`)), false);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).gewist, {});
});

test('een plan "gewist" is geldig voor een oudere LANcelot (die sluit de taak er dan mee af)', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] }).id };`);
  run(A, `taken.wis('${id}');`);
  const plan = JSON.parse(fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`), 'utf8'));
  assert.doesNotThrow(() => require('../src/taken').planGeldig(plan));
  assert.ok(Date.parse(plan.dichtTijd) && plan.dicht === true);
});

test('Mijn taken zegt per taak of ze dicht is; taken.staat zegt open, dicht of weg', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] });
    const voor = [taken.staat(t.id), taken.mijn('Lotte').taken[0].dicht];
    taken.sluit(t.id);
    const na = [taken.staat(t.id), taken.mijn('Lotte').taken[0].dicht];
    taken.wis(t.id);
    return { voor, na, weg: taken.staat(t.id) };
  `);
  assert.deepStrictEqual(r, { voor: ['open', false], na: ['dicht', true], weg: 'weg' });
});

test('het leerlingscherm stopt meteen bij een gesloten of gewiste taak', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'js', 'tk-player.js'), 'utf8');
  assert.match(js, /socket\.on\('tk-nieuw'[\s\S]*?tkNogOpen\(\)/);
  assert.match(js, /Deze taak is gesloten\. Wat je al deed, is bewaard\./);
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.match(server, /lesmap\.nieuwInLesmap\(\)/);
  assert.match(server, /solo\.controleer\(\)/);
});
