// Einddatum en tijdslimiet bij taken (wens 25 nov): allebei een extra keuze, standaard uit.
// Einddatum: de taak sluit vanzelf, op elke pc (wie bezig is, levert in). Tijdslimiet: vanaf het begin van de leerling,
// per leerling anders (meer tijd voor een zorgleerling). Een taak zonder keuze werkt zoals vroeger.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
// `over`: zoveel minuten later dan nu (Date.now verschuift, zoals een klok die verder loopt).
const run = (data, code, over = 0) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const Echt = Date, echt = Date.now, nu = () => echt() + ${over} * 60000;
  global.Date = class extends Echt { constructor(...a) { super(...(a.length ? a : [nu()])); } static now() { return nu(); } };
  const klas = require('./src/klas'), taken = require('./src/taken'), fs = require('fs'), path = require('path');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-tijd-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
const kopieerPlan = (van, naar, id) => {
  fs.mkdirSync(path.join(naar, 'taken', 'plan'), { recursive: true });
  fs.copyFileSync(path.join(van, 'taken', 'plan', `${id}.json`), path.join(naar, 'taken', 'plan', `${id}.json`));
};
const lokaal = ms => { const d = new Date(ms); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const KLAS = "klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });";

test('zonder keuze: geen einddatum en geen tijdslimiet, zoals vroeger', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] });
    const open = taken.open({ id: t.id, naam: 'Lotte' });
    return { keuzes: taken.keuzesVoor(t.id), tijd: open.tijd, rest: open.rest, status: taken.lijst()[0].leerlingen[0].status, tik: taken.tik() };
  `);
  assert.strictEqual(r.keuzes.tot, null);
  assert.strictEqual(r.keuzes.tijd, null);
  assert.strictEqual(r.tijd, null);
  assert.strictEqual(r.rest, null);
  // Openen zonder tijdslimiet is nog niet beginnen.
  assert.strictEqual(r.status, 'nieuw');
  assert.strictEqual(r.tik, false);
});

test('einddatum: de taak sluit vanzelf op elke pc, wie bezig is levert in, heropenen haalt de einddatum weg', () => {
  const A = pc(), B = pc();
  const tot = lokaal(Date.now() + 60 * 60000);
  assert.throws(() => run(A, `${KLAS} taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], tot: '${lokaal(Date.now() - 60000)}' });`), /einddatum in de toekomst/);
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'], tot: '${tot}' }).id };`);
  kopieerPlan(A, B, id);
  run(B, `${KLAS}
    taken.uitLesmap();
    taken.open({ id: '${id}', naam: 'Lotte' });
    taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.0', waarde: 'Brussel' });
  `);
  // Nog niet zo ver: niets verandert.
  assert.strictEqual(run(B, 'return taken.tik();', 30), false);
  const b = run(B, `
    const veranderd = taken.tik();
    const t = taken.lijst()[0];
    return { veranderd, dicht: t.dicht, vanzelf: t.vanzelfDicht, lotte: t.leerlingen.find(l => l.naam === 'Lotte').status, mats: taken.aantal('Mats'), tot: t.tot };
  `, 61);
  assert.deepStrictEqual(b, { veranderd: true, dicht: true, vanzelf: true, lotte: 'klaar', mats: 0, tot });
  // Pc A sluit ze zelf op hetzelfde moment: de plannen zeggen hetzelfde (geen heen en weer).
  run(A, 'taken.tik();', 61);
  const planA = JSON.parse(fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`), 'utf8'));
  const planB = JSON.parse(fs.readFileSync(path.join(B, 'taken', 'plan', `${id}.json`), 'utf8'));
  assert.strictEqual(planA.dichtTijd, planB.dichtTijd);
  assert.strictEqual(planA.dicht, true);
  // Weer openzetten (na de einddatum): de einddatum vervalt, ook op de andere pc, en ze sluit niet meteen weer.
  const her = run(A, `taken.heropen({ id: '${id}' }); const veranderd = taken.tik(); return { veranderd, dicht: taken.lijst()[0].dicht, tot: taken.keuzesVoor('${id}').tot };`, 62);
  assert.deepStrictEqual(her, { veranderd: false, dicht: false, tot: null });
  kopieerPlan(A, B, id);
  const b2 = run(B, `taken.uitLesmap(); const v = taken.tik(); return { v, dicht: taken.lijst()[0].dicht, tot: taken.keuzesVoor('${id}').tot };`, 63);
  assert.deepStrictEqual(b2, { v: false, dicht: false, tot: null });
});

test('tijdslimiet: vanaf het begin, levert vanzelf in, per leerling meer of geen tijd', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'], tijd: 10 }).id };`);
  // Mats is een zorgleerling: 20 minuten.
  const z = run(A, `return taken.zetTijd({ id: '${id}', naam: 'Mats', minuten: 20 });`);
  assert.strictEqual(z.tijd, 20);
  const open = run(A, `
    const l = taken.open({ id: '${id}', naam: 'Lotte' });
    const m = taken.open({ id: '${id}', naam: 'Mats' });
    const t = taken.lijst()[0];
    return { l: [l.tijd, l.rest > 9 * 60000], m: m.tijd, status: t.leerlingen.map(x => x.status), mijn: taken.mijn('Lotte').taken[0].tijd };
  `);
  assert.deepStrictEqual(open, { l: [10, true], m: 20, status: ['bezig', 'bezig'], mijn: 10 });
  // Na 11 minuten: Lotte levert vanzelf in, Mats werkt verder.
  const na = run(A, `
    const veranderd = taken.tik();
    const t = taken.lijst()[0];
    let fout = '';
    try { taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.0', waarde: 'x' }); } catch (e) { fout = e.message; }
    return { veranderd, st: t.leerlingen.map(x => [x.naam, x.status, !!x.tijdOp]), dicht: t.dicht, fout };
  `, 11);
  assert.deepStrictEqual(na.st, [['Lotte', 'klaar', true], ['Mats', 'bezig', false]]);
  assert.strictEqual(na.veranderd, true);
  assert.strictEqual(na.dicht, false);
  assert.match(na.fout, /al in|tijd is om/);
  // Lotte weer openzetten na de tijd: ze werkt verder zonder tijdslimiet.
  const her = run(A, `taken.heropen({ id: '${id}', naam: 'Lotte' }); const v = taken.tik(); return { v, d: taken.detail({ id: '${id}', naam: 'Lotte' }) };`, 12);
  assert.strictEqual(her.v, false);
  assert.strictEqual(her.d.geenLimiet, true);
  assert.strictEqual(her.d.status, 'bezig');
  // Geen limiet voor Mats (0): ook na een uur nog bezig.
  run(A, `taken.zetTijd({ id: '${id}', naam: 'Mats', minuten: 0 });`, 15);
  const laat = run(A, 'taken.tik(); return taken.lijst()[0].leerlingen.find(l => l.naam === \'Mats\').status;', 60);
  assert.strictEqual(laat, 'bezig');
});

test('wie te laat nog iets stuurt: zijn werk wordt ingeleverd met wat er stond', () => {
  const A = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], tijd: 5 }).id };`);
  run(A, `taken.open({ id: '${id}', naam: 'Lotte' }); taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.0', waarde: 'Brussel' });`);
  const r = run(A, `
    let fout = '';
    try { taken.antwoord({ id: '${id}', naam: 'Lotte', veld: '1.1', waarde: 'te laat' }); } catch (e) { fout = e.message; }
    const d = taken.detail({ id: '${id}', naam: 'Lotte' });
    return { fout, status: d.status, tijdOp: d.tijdOp, antwoord: d.answers['1.0'], laat: d.answers['1.1'] || null };
  `, 6);
  assert.deepStrictEqual(r, { fout: 'De tijd is om. Je werk is ingeleverd.', status: 'klaar', tijdOp: true, antwoord: 'Brussel', laat: null });
});

test('instellingen achteraf: einddatum en tijdslimiet gaan mee naar je andere pc, een oud plan wist ze niet', () => {
  const A = pc(), B = pc();
  const { id } = run(A, `${KLAS} return { id: taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'] }).id };`);
  kopieerPlan(A, B, id);
  run(B, `${KLAS} taken.uitLesmap();`);
  const oud = fs.readFileSync(path.join(A, 'taken', 'plan', `${id}.json`), 'utf8');
  const tot = lokaal(Date.now() + 2 * 864e5);
  assert.throws(() => run(A, `taken.zetKeuzes({ id: '${id}', tot: '${lokaal(Date.now() - 60000)}' });`), /einddatum in de toekomst/);
  const k = run(A, `taken.zetKeuzes({ id: '${id}', tot: '${tot}', tijd: 25 }); taken.zetTijd({ id: '${id}', naam: 'Mats', minuten: 40 }); return taken.keuzesVoor('${id}');`, 1);
  assert.deepStrictEqual([k.tot, k.tijd, k.tijdPer], [tot, 25, { mats: 40 }]);
  kopieerPlan(A, B, id);
  const b = run(B, `taken.uitLesmap(); return { k: taken.keuzesVoor('${id}'), mats: taken.open({ id: '${id}', naam: 'Mats' }).tijd };`, 2);
  assert.deepStrictEqual([b.k.tot, b.k.tijd, b.mats], [tot, 25, 40]);
  // Een plan van een oudere versie (zonder einddatum en tijd) komt binnen: de keuzes blijven staan.
  const p = JSON.parse(oud);
  delete p.tot; delete p.tijd; delete p.tijdPer;
  p.keuzesTijd = new Date(Date.now() + 3 * 60000).toISOString();
  fs.writeFileSync(path.join(B, 'taken', 'plan', `${id}.json`), JSON.stringify(p));
  const c = run(B, `taken.uitLesmap(); return taken.keuzesVoor('${id}');`, 4);
  assert.deepStrictEqual([c.tot, c.tijd], [tot, 25]);
  // Weghalen: tijd leeg = geen tijdslimiet meer.
  const d = run(A, `taken.zetKeuzes({ id: '${id}', tot: null, tijd: null }); return taken.keuzesVoor('${id}');`, 5);
  assert.deepStrictEqual([d.tot, d.tijd], [null, null]);
});

test('quiz: alleen een einddatum, geen tijdslimiet', () => {
  const A = pc();
  fs.mkdirSync(path.join(A, 'quizzes'));
  fs.writeFileSync(path.join(A, 'quizzes', 'q.json'), JSON.stringify({ title: 'Quiz', questions: [{ question: '1+1?', answers: ['1', '2'], correct: 1 }] }));
  const tot = lokaal(Date.now() + 864e5);
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'quiz', file: 'q.json', namen: ['Lotte'], tot: '${tot}', tijd: 10 });
    let fout = '';
    try { taken.zetKeuzes({ id: t.id, voorlees: 'iedereen' }); } catch (e) { fout = e.message; }
    let tijdFout = '';
    try { taken.zetTijd({ id: t.id, naam: 'Lotte', minuten: 5 }); } catch (e) { tijdFout = e.message; }
    const k = taken.zetKeuzes({ id: t.id, tot: null });
    return { tijd: taken.lijst()[0].tijd, fout, tijdFout, tot: k.tot, eerst: '${tot}' };
  `);
  assert.strictEqual(r.tijd, null);
  assert.match(r.fout, /alleen de einddatum/);
  assert.match(r.tijdFout, /geen tijdslimiet/);
  assert.strictEqual(r.tot, null);
});

test('connector: taak geven en keuzes veranderen met einddatum, tijdslimiet en tijd per leerling', () => {
  const A = pc();
  const tot = lokaal(Date.now() + 864e5);
  const out = execFileSync(process.execPath, ['-e', `
    (async () => {
      const klas = require('./src/klas'), taken = require('./src/taken'), connector = require('./src/connector');
      klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
      const w = { sleutel: { naam: 'Claude' }, schrijven: true };
      const roep = async (name, args) => {
        const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, w);
        return r.result.isError ? { fout: r.result.content[0].text } : r.result.structuredContent;
      };
      const t = await roep('taak_geven', { soort: 'oefenblad', file: 'blad.json', hele_klas: true, einddatum: '${tot}', tijdslimiet: 20, tijd_per_leerling: { mats: 35 } });
      const verleden = await roep('taak_geven', { soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], opnieuw: true, einddatum: '2020-01-01T08:00' });
      const k = await roep('taak_keuzes', { taak_id: t.taak_id, einddatum: '', tijdslimiet: 0, tijd_per_leerling: { Lotte: 10 } });
      const lijst = await roep('taken', {});
      taken.flush();
      process.stdout.write('\\n@@' + JSON.stringify({ t, verleden, k, lijst: lijst.taken.find(x => x.id === t.taak_id) }));
      process.exit(0);
    })().catch(e => { console.error(e); process.exit(1); });
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: A, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' });
  const r = JSON.parse(out.split('\n@@').pop());
  assert.strictEqual(r.t.einddatum, tot);
  assert.strictEqual(r.t.tijdslimiet, 20);
  assert.deepStrictEqual(r.t.leerlingen.map(l => [l.naam, l.tijdslimiet || null]), [['Lotte', null], ['Mats', 35]]);
  assert.match(r.verleden.fout, /toekomst/);
  assert.strictEqual(r.k.keuzes.tot, null);
  assert.strictEqual(r.k.keuzes.tijd, null);
  assert.deepStrictEqual(r.k.keuzes.tijdPer, { mats: 35, lotte: 10 });
  assert.strictEqual(r.lijst.einddatum, null);
  assert.deepStrictEqual(r.lijst.leerlingen.map(l => [l.naam, l.tijdslimiet || null]), [['Lotte', 10], ['Mats', 35]]);
});
