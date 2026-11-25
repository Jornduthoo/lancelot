// Reflectie na een toets (wens 25 nov, punt 10): hoe zeker en wat moeilijk, bij de taak en bij de afname.
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

test('na het inleveren: reflectie bewaren, met de vraagnummers van de toets (ook als de vragen geschud waren)', () => {
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
    const res = taken.reflectie({ id: t.id, naam: 'Lotte', zeker: 2, moeilijk: [1, 2, 99], tekst: '  breuken   waren lastig ' });
    const rec = proeven.laadAfname(taken.lijst()[0].afname);
    const na = taken.open({ id: t.id, naam: 'Lotte' });
    const l = taken.lijst()[0].leerlingen.find(x => x.naam === 'Lotte');
    const conn = tools.TOOLS.find(x => x.name === 'resultaten_toets').fn({ taak_id: t.id }).leerlingen[0].reflectie;
    return { tevroeg, o: o.reflectie, leeg, res: res.reflectie, inAfname: rec.spelers[0].reflectie, na: na.reflectie.gedaan, l: l.reflectie, conn, keuzes: taken.keuzesVoor(t.id).reflectie };
  `);
  assert.match(r.tevroeg, /Lever eerst je toets in/);
  assert.deepStrictEqual(r.o, { vragen: 6, gedaan: null });
  assert.match(r.leeg, /Kies een smiley/);
  assert.strictEqual(r.res.zeker, 2);
  assert.deepStrictEqual(r.res.gezien, [1, 2]);
  assert.strictEqual(r.res.moeilijk.length, 2);
  assert.ok(r.res.moeilijk.every(n => n >= 1 && n <= 6));
  assert.strictEqual(r.res.tekst, 'breuken waren lastig');
  assert.deepStrictEqual(r.inAfname, r.res);
  assert.deepStrictEqual(r.na, r.res);
  assert.deepStrictEqual(r.l, r.res);
  assert.strictEqual(r.conn.zeker_tekst, 'een beetje zeker');
  assert.strictEqual(r.keuzes, true);
});

test('vragen in volgorde: het nummer van de leerling is het nummer in de toets; uit te zetten per toets', () => {
  const A = map();
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], vragenVast: true });
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    const a = taken.reflectie({ id: t.id, naam: 'Lotte', zeker: 3, moeilijk: [4], niets: false }).reflectie;
    const n = taken.reflectie({ id: t.id, naam: 'Lotte', niets: true, moeilijk: [2] }).reflectie;
    const t2 = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Mats'], reflectie: false });
    taken.open({ id: t2.id, naam: 'Mats' });
    const o2 = taken.inleveren({ id: t2.id, naam: 'Mats' });
    let uit = null; try { taken.reflectie({ id: t2.id, naam: 'Mats', zeker: 1 }); } catch (e) { uit = e.message; }
    taken.zetKeuzes({ id: t2.id, reflectie: true });
    const weerAan = taken.open({ id: t2.id, naam: 'Mats' }).reflectie;
    return { a, n, o2: o2.reflectie || null, uit, weerAan, k: taken.keuzesVoor(t2.id).reflectie };
  `);
  assert.deepStrictEqual(r.a.moeilijk, [4]);
  assert.deepStrictEqual(r.n.moeilijk, []);
  assert.strictEqual(r.n.niets, true);
  assert.strictEqual(r.o2, null);
  assert.match(r.uit, /hoeft dat niet/);
  assert.deepStrictEqual(r.weerAan, { vragen: 6, gedaan: null });
  assert.strictEqual(r.k, true);
});
