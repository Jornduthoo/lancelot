// Herkansing met één klik (wens 25 nov, punt 6): een kopie van de toets, alleen voor wie onder de grens bleef.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), punten = require('./src/punten'), hk = require('./src/herkansing');
  const tools = require('./src/connector-tools');
  const maak = (file, namen) => taken.maak({ soort: 'proef', file, namen, voorlees: 'iedereen', vragenVast: true, uitslag: true });
  const doe = (t, naam, a, b) => { taken.open({ id: t.id, naam }); taken.toetsAntwoord({ id: t.id, naam, vraag: '0', waarde: a }); taken.toetsAntwoord({ id: t.id, naam, vraag: '1', waarde: b }); taken.inleveren({ id: t.id, naam }); };
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function map() {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), JSON.stringify({ title: 'Toets sommen', vragen: [{ type: 'kort', vraag: '2+2?', antwoord: '4', punten: 4 }, { type: 'kort', vraag: '3+3?', antwoord: '6', punten: 4 }] }));
  return A;
}
const KLAS = `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor', 'Sam'] });`;

test('voorstel en geven: alleen wie onder de grens zit krijgt een kopie, met de keuzes van de eerste keer, gekoppeld als herkansing', () => {
  const A = map();
  const r = run(A, `${KLAS}
    const t = maak('toets.json', ['Lotte', 'Mats', 'Noor', 'Sam']);
    doe(t, 'Lotte', '4', '6'); doe(t, 'Mats', '4', '0'); doe(t, 'Noor', '0', '0');
    const v = hk.voorstel({ kolom: t.id, grens: 0.5 });
    const v75 = hk.voorstel({ kolom: t.id, grens: 0.75 });
    const g = hk.geef({ kolom: t.id, grens: 0.75 });
    const nieuw = taken.lijst().find(x => x.id === g.taak_id);
    const kopie = proeven.load(g.file);
    // Nog eens: dezelfde kopie wordt opnieuw gebruikt, niet een tweede.
    const g2 = hk.geef({ kolom: g.taak_id, grens: 0.75, namen: ['Noor'] });
    return { v, v75, g, nieuw: { namen: nieuw.leerlingen.map(l => l.naam), file: nieuw.file }, keuzes: taken.keuzesVoor(g.taak_id), kopie: kopie.title, origineel: proeven.load('toets.json').title, herk: punten.keuzes().herk, g2: { file: g2.file, nieuw: g2.nieuweKopie }, aantal: proeven.list().length };
  `);
  assert.deepStrictEqual(r.v.laag.map(l => [l.naam, l.procent]), [['Noor', 0]]);
  assert.strictEqual(r.v.hoog, 2);
  assert.deepStrictEqual(r.v.nietGemaakt, ['Sam']);
  assert.deepStrictEqual(r.v75.laag.map(l => l.naam), ['Mats', 'Noor']);
  assert.strictEqual(r.v.kopie, 'Toets sommen · herkansing');
  assert.deepStrictEqual(r.nieuw.namen.sort(), ['Mats', 'Noor']);
  assert.notStrictEqual(r.nieuw.file, 'toets.json');
  assert.strictEqual(r.kopie, 'Toets sommen · herkansing');
  assert.strictEqual(r.origineel, 'Toets sommen');
  assert.strictEqual(r.keuzes.voorlees, 'iedereen');
  assert.strictEqual(r.keuzes.volgorde, 'vragen');
  assert.strictEqual(r.keuzes.uitslag, true);
  assert.strictEqual(r.herk[r.g.taak_id], r.v.kolom);
  // De tweede herkansing hangt ook aan de eerste toets (via de keten) en gebruikt dezelfde kopie.
  assert.strictEqual(r.g2.file, r.g.file);
  assert.strictEqual(r.g2.nieuw, false);
  assert.strictEqual(r.aantal, 2);
});

test('niemand onder de grens, of een naam die de toets niet maakte: een duidelijke fout; zonder kopie = dezelfde toets', () => {
  const A = map();
  const r = run(A, `${KLAS}
    const t = maak('toets.json', ['Lotte', 'Mats']);
    doe(t, 'Lotte', '4', '6'); doe(t, 'Mats', '4', '0');
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    const zelfde = hk.geef({ kolom: t.id, grens: 0.75, metKopie: false });
    return {
      niemand: fout(() => hk.geef({ kolom: t.id, grens: 0.3 })),
      vreemd: fout(() => hk.geef({ kolom: t.id, namen: ['Sam'] })),
      zelfde: zelfde.file, namen: zelfde.namen,
    };
  `);
  assert.match(r.niemand, /Niemand zit onder 30%/);
  assert.match(r.vreemd, /maakten de toets niet: Sam/);
  assert.strictEqual(r.zelfde, 'toets.json');
  assert.deepStrictEqual(r.namen, ['Mats']);
});

test('connector: herkansing_geven met droge_run en daarna echt', () => {
  const A = map();
  const r = run(A, `${KLAS}
    const t = maak('toets.json', ['Lotte', 'Mats']);
    doe(t, 'Lotte', '4', '6'); doe(t, 'Mats', '0', '0');
    const tool = tools.TOOLS.find(x => x.name === 'herkansing_geven');
    const d = tool.fn({ taak_id: t.id, droge_run: true });
    const e = tool.fn({ taak_id: t.id });
    return { schrijft: tool.schrijft, d: { droge_run: d.droge_run, namen: d.namen, gegeven: d.gegeven }, e: { namen: e.namen, gegeven: e.gegeven, titel: e.kopieTitel }, taken: taken.lijst().length };
  `);
  assert.strictEqual(r.schrijft, true);
  assert.deepStrictEqual(r.d, { droge_run: true, namen: ['Mats'], gegeven: false });
  assert.deepStrictEqual(r.e, { namen: ['Mats'], gegeven: true, titel: 'Toets sommen · herkansing' });
  assert.strictEqual(r.taken, 2);
});
