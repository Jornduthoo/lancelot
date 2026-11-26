// Een toets als taak telt op de dag dat de leerling inleverde, niet op de dag dat de taak gegeven werd
// (bug 26 nov: begrijpend lezen thema 3, gegeven 19 nov, gemaakt en automatisch verbeterd 24 nov,
// ontbrak in resultaten_leerling vanaf 24 nov en in het weekrapport).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  (async () => {
    const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), connector = require('./src/connector'), wr = require('./src/weekrapport');
    const roep = async (name, args) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { sleutel: { naam: 'Claude' }, schrijven: false });
      if (r.error) throw new Error(r.error.message);
      if (r.result.isError) throw new Error(r.result.content[0].text);
      return r.result.structuredContent;
    };
    const out = await (async () => { ${code} })();
    taken.flush();
    process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' }).split('\n@@').pop());

const p2 = n => String(n).padStart(2, '0');
const dag = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

test('automatisch verbeterde toets als taak, dagen na het geven ingeleverd: punten in resultaten_leerling, afnames, weekrapport en weekexport', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'inleverdag-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'lezen.json'), JSON.stringify({ title: 'Begrijpend lezen', vragen: [{ type: 'kort', vraag: 'Wie?', antwoord: 'ridder', punten: 2 }, { type: 'meerkeuze', vraag: 'Waar?', opties: ['burcht', 'bos'], juist: 0, punten: 1 }] }));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const t = taken.maak({ soort: 'proef', file: 'lezen.json', namen: ['Lotte'], keuzesVast: true });
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '0', waarde: 'ridder' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '1', waarde: 0 });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    // De taak (en dus de afname) werd tien dagen eerder gegeven.
    const a = proeven.afnameVanTaak(t.id);
    const f = require('path').join(proeven.AFNAMES, a.file);
    const rec = JSON.parse(require('fs').readFileSync(f, 'utf8'));
    rec.datum = new Date(Date.now() - 10 * 864e5).toISOString();
    require('fs').writeFileSync(f, JSON.stringify(rec));
    const vandaag = ${JSON.stringify(dag(new Date()))};
    return {
      lijst: await roep('resultaten_leerling', { naam: 'Lotte', van: vandaag }),
      oud: await roep('resultaten_leerling', { naam: 'Lotte', tot: ${JSON.stringify(dag(new Date(Date.now() - 5 * 864e5)))} }),
      afnames: await roep('afnames', { van: vandaag }),
      week: wr.data({}).rapporten.find(x => x.naam === 'Lotte'),
      export: await roep('weekexport', {}),
    };
  `);
  assert.deepStrictEqual(r.lijst.toetsen.map(t => [t.titel, t.punten, t.max, t.nog_te_verbeteren]), [['Begrijpend lezen', 3, 3, 0]]);
  assert.ok(r.lijst.toetsen[0].gegeven, 'de dag van het geven staat er apart bij');
  const tk = r.lijst.taken.find(t => t.soort === 'proef');
  assert.deepStrictEqual([tk.status, tk.punten, tk.max], ['klaar', 3, 3]);
  assert.deepStrictEqual(r.oud.toetsen, [], 'niet bij de week waarin de taak alleen gegeven werd');
  assert.strictEqual(r.afnames.afnames.length, 1);
  assert.deepStrictEqual(r.week.toetsen.map(t => [t.punten, t.max, t.op10]), [[3, 3, 10]]);
  assert.ok(r.export.toetsen_en_taken.some(x => x.soort === 'toets' && x.naam === 'Lotte' && x.punten === 3));
});

test('datumVan: inleveren, anders begin, anders de datum van de afname', () => {
  const proeven = require('../src/proeven');
  const rec = { datum: '2026-11-19T15:40:48.211Z' };
  assert.strictEqual(proeven.datumVan(rec, { ingeleverd: '2026-11-24T08:50:14.174Z' }), '2026-11-24T08:50:14.174Z');
  assert.strictEqual(proeven.datumVan(rec, { ingeleverd: Date.parse('2026-11-24T08:00:00Z') }), '2026-11-24T08:00:00.000Z');
  assert.strictEqual(proeven.datumVan(rec, { ingeleverd: 0, begon: 0 }), '2026-11-19T15:40:48.211Z');
  const d = x => x.slice(0, 10);
  assert.ok(proeven.afnameInPeriode({ datum: rec.datum, eerste: '2026-11-24T08:00:00Z', laatste: '2026-11-24T10:00:00Z' }, '2026-11-23', '2026-11-29', d));
  assert.ok(!proeven.afnameInPeriode({ datum: rec.datum, eerste: '2026-11-24T08:00:00Z', laatste: '2026-11-24T10:00:00Z' }, '2026-11-25', null, d));
});
