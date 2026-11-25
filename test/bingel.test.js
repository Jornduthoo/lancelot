// Export voor Bingel (wens 25 nov, punt 7): punten op 10 en een korte feedback per leerling, in klasvolgorde.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), bingel = require('./src/bingel'), hk = require('./src/herkansing');
  const tools = require('./src/connector-tools');
  const doe = (t, naam, a, b) => { taken.open({ id: t.id, naam }); taken.toetsAntwoord({ id: t.id, naam, vraag: '0.0', waarde: a }); taken.toetsAntwoord({ id: t.id, naam, vraag: '1', waarde: b }); taken.inleveren({ id: t.id, naam }); };
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('punten op 10 in klasvolgorde, feedback met wat nog te oefenen, herkansing telt mee, tekst om te plakken', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), JSON.stringify({ title: 'Toets sommen', vragen: [
    { type: 'bron', titel: 'Optellen', tekst: 'Tel op.', vragen: [{ type: 'kort', vraag: '2+2?', antwoord: '4', punten: 4 }] },
    { type: 'kort', vraag: '3x3?', antwoord: '9', punten: 4 },
  ] }));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Sam', 'Lotte', 'Mats', 'Noor'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats', 'Noor'] });
    doe(t, 'Lotte', '4', '9'); doe(t, 'Mats', '0', '9'); doe(t, 'Noor', '0', '0');
    const voor = bingel.data({ kolom: t.id });
    const h = hk.geef({ kolom: t.id, grens: 0.5, metKopie: false });
    doe({ id: h.taak_id }, 'Noor', '4', '9');
    const na = bingel.data({ kolom: t.id });
    const op20 = bingel.data({ kolom: t.id, op: 20 });
    const tool = tools.TOOLS.find(x => x.name === 'bingel_export').fn({ taak_id: t.id });
    return { voor, na, op20: op20.rijen.map(x => x.score), punten: bingel.tekst(na, 'punten'), tabel: bingel.tekst(na, 'tabel'), tool: tool.punten_tekst };
  `);
  assert.deepStrictEqual(r.voor.rijen.map(x => [x.naam, x.score]), [['Sam', null], ['Lotte', 10], ['Mats', 5], ['Noor', 0]]);
  assert.strictEqual(r.voor.rijen[0].stand, 'niet voor deze leerling');
  assert.strictEqual(r.voor.rijen[1].feedback, 'Knap gedaan!');
  assert.strictEqual(r.voor.rijen[2].feedback, 'Voldoende, maar nog wat oefenen. Nog oefenen: Optellen.');
  assert.match(r.voor.rijen[3].feedback, /^Dit was nog moeilijk\. Nog oefenen: Optellen\.$/);
  // Na de herkansing telt (standaard) de hoogste: Noor 10.
  assert.strictEqual(r.na.herkansingen, 1);
  assert.strictEqual(r.na.rijen[3].score, 10);
  assert.deepStrictEqual(r.op20, [null, 20, 10, 20]);
  assert.strictEqual(r.punten, '\n10\n5\n10');
  assert.strictEqual(r.tabel.split('\n')[0], 'Naam\tOp 10\tFeedback');
  assert.strictEqual(r.tool, r.punten);
});
