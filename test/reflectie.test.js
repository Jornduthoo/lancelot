// Reflectie na een toets (wens 25 nov, punt 10): hoe zeker, wat moeilijk was en wat goed ging (algemeen, sinds 26 nov), bij de taak en bij de afname.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven');
  const tools = require('./src/connector-tools');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function map() {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'refl-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  const vragen = Array.from({ length: 6 }, (_, i) => ({ type: 'kort', vraag: `${i}+${i}?`, antwoord: String(2 * i) }));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), JSON.stringify({ title: 'Toets', vragen }));
  return A;
}

test('na het inleveren: algemene reflectie bewaren (smiley, wat moeilijk, wat goed)', () => {
  const A = map();
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    const tevroeg = fout(() => taken.reflectie({ id: t.id, naam: 'Lotte', zeker: 3 }));
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '0', waarde: '0' });
    const o = taken.inleveren({ id: t.id, naam: 'Lotte' });
    const leeg = fout(() => taken.reflectie({ id: t.id, naam: 'Lotte' }));
    const res = taken.reflectie({ id: t.id, naam: 'Lotte', zeker: 2, tekst: '  breuken   waren lastig ', goed: ' de tafels ' });
    const rec = proeven.laadAfname(taken.lijst()[0].afname);
    const na = taken.open({ id: t.id, naam: 'Lotte' });
    const l = taken.lijst()[0].leerlingen.find(x => x.naam === 'Lotte');
    const conn = tools.TOOLS.find(x => x.name === 'resultaten_toets').fn({ taak_id: t.id }).leerlingen[0].reflectie;
    return { tevroeg, o: o.reflectie, leeg, res: res.reflectie, inAfname: rec.spelers[0].reflectie, na: na.reflectie.gedaan, l: l.reflectie, conn, keuzes: taken.keuzesVoor(t.id).reflectie };
  `);
  assert.match(r.tevroeg, /Lever eerst je toets in/);
  assert.deepStrictEqual(r.o, { gedaan: null });
  assert.match(r.leeg, /Kies een smiley/);
  assert.strictEqual(r.res.zeker, 2);
  assert.strictEqual(r.res.goed, 'de tafels');
  assert.strictEqual(r.res.moeilijk, undefined);
  assert.strictEqual(r.res.tekst, 'breuken waren lastig');
  assert.deepStrictEqual(r.inAfname, r.res);
  assert.deepStrictEqual(r.na, r.res);
  assert.deepStrictEqual(r.l, r.res);
  assert.strictEqual(r.conn.zeker_tekst, 'een beetje zeker');
  assert.strictEqual(r.conn.wat_moeilijk, 'breuken waren lastig');
  assert.strictEqual(r.conn.wat_goed, 'de tafels');
  assert.strictEqual(r.keuzes, true);
});

test('enkel tekst mag ook; uit te zetten per toets', () => {
  const A = map();
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], vragenVast: true });
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    const a = taken.reflectie({ id: t.id, naam: 'Lotte', zeker: 3 }).reflectie;
    const n = taken.reflectie({ id: t.id, naam: 'Lotte', goed: 'alles' }).reflectie;
    const t2 = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Mats'], reflectie: false });
    taken.open({ id: t2.id, naam: 'Mats' });
    const o2 = taken.inleveren({ id: t2.id, naam: 'Mats' });
    let uit = null; try { taken.reflectie({ id: t2.id, naam: 'Mats', zeker: 1 }); } catch (e) { uit = e.message; }
    taken.zetKeuzes({ id: t2.id, reflectie: true });
    const weerAan = taken.open({ id: t2.id, naam: 'Mats' }).reflectie;
    return { a, n, o2: o2.reflectie || null, uit, weerAan, k: taken.keuzesVoor(t2.id).reflectie };
  `);
  assert.strictEqual(r.a.zeker, 3);
  assert.strictEqual(r.n.zeker, null);
  assert.strictEqual(r.n.goed, 'alles');
  assert.strictEqual(r.o2, null);
  assert.match(r.uit, /hoeft dat niet/);
  assert.deepStrictEqual(r.weerAan, { gedaan: null });
  assert.strictEqual(r.k, true);
});
