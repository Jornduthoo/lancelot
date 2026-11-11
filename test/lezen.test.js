// De Leescheck: standaard uit, per leerling elke dag een vraag, en het overzicht toont wat opvalt.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), lezen = require('./src/lezen');
  const dag = d => new Date(d + 'T10:00:00');
  const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
  const out = (() => { ${code} })();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('de Leescheck staat standaard uit en werkt pas als de leerkracht hem aanzet', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const uit = fout(() => lezen.view('Lotte'));
    lezen.zet({ aan: true });
    const v = lezen.view('lotte', dag('2026-11-09'));
    return { uit, naam: v.naam, vraag: v.vraag, vandaag: v.vandaag, aan: lezen.staat().aan };
  `);
  assert.match(res.uit, /nog niet aan/);
  assert.strictEqual(res.aan, true);
  assert.strictEqual(res.naam, 'Lotte');
  assert.ok(res.vraag.length > 10);
  assert.strictEqual(res.vandaag, null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('een antwoord moet titel, bladzijde en een antwoord hebben (een kort antwoord mag)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    lezen.zet({ aan: true });
    const t = dag('2026-11-09');
    return {
      geenBoek: fout(() => lezen.bewaar({ naam: 'Lotte', boek: '', blz: 5, antwoord: 'een twee drie vier vijf' }, t)),
      geenBlz: fout(() => lezen.bewaar({ naam: 'Lotte', boek: 'Matilda', blz: '', antwoord: 'een twee drie vier vijf' }, t)),
      leeg: fout(() => lezen.bewaar({ naam: 'Lotte', boek: 'Matilda', blz: 5, antwoord: '  ' }, t)),
      ok: lezen.bewaar({ naam: 'Lotte', boek: 'Matilda', blz: 12, antwoord: 'Matilda leest boeken in de bibliotheek.' }, t).vandaag,
      morgen: lezen.view('Lotte', dag('2026-11-10')).vorige,
    };
  `);
  assert.ok(res.geenBoek && res.geenBlz && res.leeg);
  assert.deepStrictEqual(res.ok, { boek: 'Matilda', blz: 12, antwoord: 'Matilda leest boeken in de bibliotheek.' });
  assert.deepStrictEqual(res.morgen, { dag: '2026-11-09', boek: 'Matilda', blz: 12 });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('het overzicht toont gemiste dagen, stilstand, sprongen en hetzelfde antwoord', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor', 'Finn'] });
    lezen.zet({ aan: true, vragen: 'Wat gebeurde er?\\nWie kwam er voor?' });
    const b = (naam, d, blz, antwoord, boek = 'Boek') => lezen.bewaar({ naam, boek, blz, antwoord }, dag(d));
    b('Lotte', '2026-11-09', 10, 'De heks vliegt naar het kasteel in het bos.');
    b('Lotte', '2026-11-10', 22, 'De ridder vindt een kaart onder de brug vandaag.');
    b('Mats', '2026-11-09', 30, 'Er gebeurde heel veel spannende dingen in het boek.');
    b('Mats', '2026-11-10', 30, 'Er gebeurde heel veel spannende dingen in het boek.');
    b('Noor', '2026-11-09', 20, 'Een meisje vindt een paard in het bos achter haar huis.');
    b('Noor', '2026-11-10', 300, 'De ridder vindt een kaart onder de brug vandaag!');
    const o = lezen.overzicht({ dagen: 5 }, dag('2026-11-11'));
    const r = n => o.leerlingen.find(l => l.naam === n);
    return { dagen: o.dagen, lotte: r('Lotte'), mats: r('Mats'), noor: r('Noor'), finn: r('Finn'), telling: o.telling };
  `);
  assert.deepStrictEqual(res.dagen, ['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11'], 'schooldagen, zonder weekend');
  assert.deepStrictEqual(res.lotte.cellen['2026-11-09'].signalen, []);
  assert.deepStrictEqual(res.lotte.cellen['2026-11-10'].signalen, ['zelfde'], 'Noor schreef hetzelfde');
  assert.ok(res.mats.cellen['2026-11-10'].signalen.includes('stil'));
  assert.ok(res.mats.cellen['2026-11-10'].signalen.includes('zelfde'));
  assert.ok(res.noor.cellen['2026-11-10'].signalen.includes('zelfde'), 'zelfde antwoord als een klasgenoot');
  assert.ok(res.noor.cellen['2026-11-10'].signalen.includes('sprong'), 'van niets naar 300 bladzijden');
  assert.strictEqual(res.finn.gemist, 2, 'Finn vulde niets in');
  assert.strictEqual(res.lotte.gemist, 0, 'dagen voor de eerste leescheck tellen niet');
  assert.deepStrictEqual(res.telling, { vandaag: 0, totaal: 4 });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('eigen vragen vervangen de standaardvragen, een lege lijst zet ze terug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-'));
  const res = run(tmp, `
    const eigen = lezen.zet({ aan: true, vragen: 'Vraag een?\\n\\nVraag twee?' });
    const terug = lezen.zet({ vragen: '' });
    return { eigen: eigen.vragen, isEigen: eigen.eigen, terug: terug.vragen.length, isEigenNa: terug.eigen };
  `);
  assert.deepStrictEqual(res.eigen, ['Vraag een?', 'Vraag twee?']);
  assert.strictEqual(res.isEigen, true);
  assert.strictEqual(res.isEigenNa, false);
  assert.ok(res.terug >= 5);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('nooit twee dagen na elkaar dezelfde vraag, en een korte vraag (*) geeft geen signaal kort of zelfde', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    lezen.zet({ aan: true, vragen: '* Hoe heet het hoofdpersonage?\\nWat gebeurde er?' });
    const dagen = lezen.schooldagen(12, dag('2026-11-27'));
    const vragen = [];
    for (const d of dagen) {
      const v = lezen.view('Lotte', dag(d));
      vragen.push(v.vraag);
      lezen.bewaar({ naam: 'Lotte', boek: 'Matilda', blz: 10 + vragen.length * 5, antwoord: v.kort ? 'Matilda' : 'Ze leest een boek over een walvis.' }, dag(d));
      lezen.bewaar({ naam: 'Mats', boek: 'Matilda', blz: 10 + vragen.length * 5, antwoord: 'Matilda' }, dag(d));
    }
    const o = lezen.overzicht({ dagen: 20 }, dag('2026-11-27'));
    const lotte = o.leerlingen.find(l => l.naam === 'Lotte');
    return { vragen, kortCellen: Object.values(lotte.cellen).filter(c => c.antwoord === 'Matilda').map(c => c.signalen) };
  `);
  for (let i = 1; i < res.vragen.length; i++) assert.notStrictEqual(res.vragen[i], res.vragen[i - 1]);
  assert.ok(res.vragen.includes('Hoe heet het hoofdpersonage?'), 'het sterretje staat niet in de vraag');
  for (const sig of res.kortCellen) assert.deepStrictEqual(sig, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});
