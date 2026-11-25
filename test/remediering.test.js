// Remediëring na een toets (wens 25 nov, punt 4): per leerling een oefenblad met wat fout liep, in zijn eigen versie.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), rem = require('./src/remediering'), oefenbladen = require('./src/oefenbladen');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = JSON.stringify({
  title: 'Toets breuken',
  vragen: [
    { type: 'bron', titel: 'Deel 1: breuken', tekst: 'Een pizza in 8 stukken.', vragen: [{ type: 'kort', vraag: '3 van 8 stukken?', antwoord: '3/8', punten: 2 }, { type: 'kort', vraag: 'Helft?', antwoord: '4/8|1/2' }] },
    { type: 'kort', vraag: '1/2 + 1/4?', antwoord: '3/4', punten: 2, doel: 'WI-GK-3' },
    { type: 'open', vraag: 'Leg uit.', punten: 2 },
  ],
  ridder: [{ type: 'kort', vraag: '5/6 - 1/3?', antwoord: '1/2', punten: 2 }, { type: 'kort', vraag: '2/3 van 12?', antwoord: '8' }],
});
const REC = `const rec = { title: 'Toets breuken', toets: proeven.K.validate(${TOETS}), spelers: [
  { naam: 'Lotte', niveau: 'schildknaap', antwoorden: {}, auto: { '0.0': 0, '0.1': 1, '1': 2 }, hand: { '2': 2 } },
  { naam: 'Mats', niveau: 'schildknaap', antwoorden: {}, auto: { '0.0': 0, '0.1': 1, '1': 2 }, hand: { '2': 1 } },
  { naam: 'Noor', niveau: 'ridder', antwoorden: {}, auto: { '0': 0, '1': 1 }, hand: {} },
  { naam: 'Sam', niveau: 'schildknaap', antwoorden: {}, auto: { '0.0': 2, '0.1': 1, '1': 2 }, hand: {} },
  { naam: 'Ilse', niveau: 'schildknaap', antwoorden: {}, auto: { '0.0': 2, '0.1': 1, '1': 1 }, hand: { '2': 2 } },
] };`;

test('voorstel: per leerling de foute vragen uit zijn eigen versie, zelfde fouten = één blad, open vragen pas na verbeteren', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'rem-'));
  const v = run(A, `${REC} return rem.samenvatting(rem.voorstel(rec));`);
  assert.deepStrictEqual(v.groepen.map(g => [g.namen, g.vragen]), [[['Lotte', 'Mats'], ['1a']], [['Noor'], ['1']]]);
  assert.deepStrictEqual(v.groepen[0].doelen, ['Deel 1: breuken']);
  // Sam en Ilse: alles goed (Ilse haalde precies de helft op vraag 2: niet fout). Sam heeft nog een open vraag.
  assert.deepStrictEqual(v.zonder.sort(), ['Ilse', 'Sam']);
  assert.deepStrictEqual(v.nogTeVerbeteren, [{ naam: 'Sam', vragen: 1 }]);
  // Een strengere grens (75%): Ilse ook.
  const s = run(A, `${REC} return rem.samenvatting(rem.voorstel(rec, { grens: 0.75 }));`);
  assert.ok(s.groepen.some(g => g.namen.includes('Ilse') && g.vragen.join() === '2'));
});

test('maken: bladen in de map Remediëring, met de bron erbij, als taak met direct verbeteren; de toets verandert niet', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'rem-'));
  const r = run(A, `${REC}
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor', 'Sam', 'Ilse'] });
    const voor = JSON.stringify(rec.toets);
    const m = rem.maak(rec, { pogingen: 2 });
    const blad = oefenbladen.load(m.bladen[0].file);
    const t = taken.lijst().find(x => x.id === m.bladen[0].taak_id);
    const plek = oefenbladen.lib.places()(m.bladen[0].file);
    return { m, blad, plek, t: { soort: t.soort, namen: t.leerlingen.map(l => l.naam), pogingen: t.pogingen }, keuzes: taken.keuzesVoor(t.id), zelfde: voor === JSON.stringify(rec.toets) };
  `);
  assert.strictEqual(r.m.bladen.length, 2);
  assert.strictEqual(r.plek, 'Remediëring/Toets breuken');
  assert.deepStrictEqual(r.blad.blocks.map(b => b.type), ['tekst', 'vraag']);
  assert.strictEqual(r.blad.blocks[0].title, 'Deel 1: breuken');
  assert.strictEqual(r.blad.blocks[1].q.antwoord, '3/8');
  assert.deepStrictEqual(r.t, { soort: 'oefenblad', namen: ['Lotte', 'Mats'], pogingen: 2 });
  assert.strictEqual(r.keuzes.feedback, 'direct');
  assert.strictEqual(r.keuzes.uitslag, true);
  assert.strictEqual(r.zelfde, true);
  // Noor (ridder) oefent op de ridder-vraag.
  assert.match(JSON.stringify(r.m.bladen[1]), /Noor/);
});

test('connector: remediering met droge_run en daarna echt', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'rem-c-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), TOETS);
  const out = execFileSync(process.execPath, ['-e', `
    (async () => {
      const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), connector = require('./src/connector');
      klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
      const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
      for (const n of ['Lotte', 'Mats']) { taken.open({ id: t.id, naam: n }); taken.toetsAntwoord({ id: t.id, naam: n, vraag: '1', waarde: n === 'Lotte' ? '3/4' : '1' }); taken.inleveren({ id: t.id, naam: n }); }
      const w = { sleutel: { naam: 'Claude' }, schrijven: true };
      const roep = async (name, args) => {
        const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, w);
        return r.result.isError ? { fout: r.result.content[0].text } : r.result.structuredContent;
      };
      const droog = await roep('remediering', { taak_id: t.id, droge_run: true });
      const echt = await roep('remediering', { taak_id: t.id });
      taken.flush();
      process.stdout.write('\\n@@' + JSON.stringify({ droog, echt, n: taken.lijst().filter(x => x.soort === 'oefenblad').length }));
      process.exit(0);
    })().catch(e => { console.error(e); process.exit(1); });
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: A, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' });
  const r = JSON.parse(out.split('\n@@').pop());
  assert.strictEqual(r.droog.droge_run, true);
  assert.ok(r.droog.groepen.length >= 1);
  assert.ok(r.echt.bladen.length >= 1, JSON.stringify(r.echt));
  assert.strictEqual(r.n, r.echt.bladen.filter(b => b.taak_id).length);
});
