// Aantal pogingen (wens 25 nov, punt 1): een extra keuze, standaard één keer (zoals altijd).
// Met meer pogingen begint de leerling na het inleveren zelf opnieuw met een leeg blad, zolang de taak open is.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-pog-'));
  fs.mkdirSync(path.join(tmp, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(tmp, 'oefenbladen', 'blad.json'));
  return tmp;
}
const KLAS = "klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });";

test('zonder keuze: één poging, de leerling kan niet zelf opnieuw', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'] });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    let fout = '';
    try { taken.nogEens({ id: t.id, naam: 'Lotte' }); } catch (e) { fout = e.message; }
    return { k: taken.keuzesVoor(t.id).pogingen, open: taken.open({ id: t.id, naam: 'Lotte' }).nogEens, fout };
  `);
  assert.deepStrictEqual([r.k, r.open], [1, false]);
  assert.match(r.fout, /al je pogingen/);
});

test('drie pogingen: twee keer opnieuw, met een leeg blad, en dan niet meer', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], pogingen: 3 });
    let fout = '';
    try { taken.nogEens({ id: t.id, naam: 'Lotte' }); } catch (e) { fout = e.message; }
    taken.antwoord({ id: t.id, naam: 'Lotte', veld: '1.0', waarde: 'Brussel' });
    const eerst = taken.inleveren({ id: t.id, naam: 'Lotte' });
    const twee = taken.nogEens({ id: t.id, naam: 'Lotte' });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    const drie = taken.nogEens({ id: t.id, naam: 'Lotte' });
    const klaar3 = taken.inleveren({ id: t.id, naam: 'Lotte' });
    let op = '';
    try { taken.nogEens({ id: t.id, naam: 'Lotte' }); } catch (e) { op = e.message; }
    const l = taken.lijst()[0];
    return { fout, eerst: [eerst.nogEens, eerst.pogingen], twee: [twee.poging, twee.klaar, Object.keys(twee.answers).length], drie: drie.poging, klaar3: klaar3.nogEens, op, lijst: [l.pogingen, l.leerlingen[0].poging] };
  `);
  assert.match(r.fout, /Lever eerst in/);
  assert.deepStrictEqual(r.eerst, [true, 3]);
  assert.deepStrictEqual(r.twee, [1, false, 0]);
  assert.strictEqual(r.drie, 2);
  assert.strictEqual(r.klaar3, false);
  assert.match(r.op, /al je pogingen/);
  assert.deepStrictEqual(r.lijst, [3, 3]);
});

test('een afgesloten taak: niet meer opnieuw; pogingen achteraf veranderen en mee in het plan', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], pogingen: 2 });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    taken.sluit(t.id);
    const dicht = taken.open({ id: t.id, naam: 'Lotte' }).nogEens;
    taken.heropen({ id: t.id });
    taken.zetKeuzes({ id: t.id, pogingen: 1 });
    const een = taken.open({ id: t.id, naam: 'Lotte' }).nogEens;
    taken.zetKeuzes({ id: t.id, pogingen: 5 });
    const plan = JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, t.id + '.json'), 'utf8'));
    return { dicht, een, vijf: taken.keuzesVoor(t.id).pogingen, plan: plan.pogingen };
  `);
  assert.deepStrictEqual(r, { dicht: false, een: false, vijf: 5, plan: 5 });
});

test('connector: max_pogingen bij geven, keuzes, verplaatsen en heropenen', () => {
  const A = pc();
  const out = execFileSync(process.execPath, ['-e', `
    (async () => {
      const klas = require('./src/klas'), taken = require('./src/taken'), connector = require('./src/connector');
      klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
      const w = { sleutel: { naam: 'Claude' }, schrijven: true };
      const roep = async (name, args) => {
        const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, w);
        return r.result.isError ? { fout: r.result.content[0].text } : r.result.structuredContent;
      };
      const d = new Date(Date.now() + 2 * 864e5), lok = x => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const t = await roep('taak_geven', { soort: 'oefenblad', file: 'blad.json', hele_klas: true, max_pogingen: 3 });
      const te = await roep('taak_geven', { soort: 'oefenblad', file: 'blad.json', namen: ['Lotte'], opnieuw: true, max_pogingen: 9 });
      const k = await roep('taak_keuzes', { taak_id: t.taak_id, max_pogingen: 2 });
      const v = await roep('taak_verplaatsen', { taak_id: t.taak_id, vanaf: lok(new Date(Date.now() + 864e5)), einddatum: lok(d), tijdslimiet: 30, max_pogingen: 4 });
      const fout = await roep('taak_verplaatsen', { taak_id: t.taak_id, vanaf: lok(d), einddatum: lok(new Date(Date.now() + 864e5)) });
      await roep('taak_intrekken', { taak_id: t.taak_id });
      const h = await roep('taak_heropenen', { taak_id: t.taak_id, max_pogingen: 1, tijdslimiet: 0 });
      const lijst = await roep('taken', {});
      taken.flush();
      process.stdout.write('\\n@@' + JSON.stringify({ t, te, k, v, fout, h, lijst: lijst.taken.find(x => x.id === t.taak_id) }));
      process.exit(0);
    })().catch(e => { console.error(e); process.exit(1); });
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: A, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' });
  const r = JSON.parse(out.split('\n@@').pop());
  assert.strictEqual(r.t.max_pogingen, 3);
  assert.match(r.te.fout, /max_pogingen/);
  assert.strictEqual(r.k.keuzes.pogingen, 2);
  assert.deepStrictEqual([r.v.status, r.v.keuzes.pogingen, r.v.keuzes.tijd, !!r.v.keuzes.tot], ['gepland', 4, 30, true]);
  assert.match(r.fout.fout, /na "vanaf"/);
  assert.deepStrictEqual([r.h.status, r.h.keuzes.pogingen, r.h.keuzes.tijd], ['open', 1, null]);
  assert.strictEqual(r.lijst.max_pogingen, 1);
});
