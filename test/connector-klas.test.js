// De connector, deel 4 (wens 26 nov): runenwoorden, weetjes en woorden van Het rijk van Lancelot, niveau per leerling,
// zorgnotities, Eer, de Leescheck en de weekplanning. Toevoegen en wijzigen, nooit wissen; alleen lezen blokkeert schrijven.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  (async () => {
    const klas = require('./src/klas'), connector = require('./src/connector'), tools = require('./src/connector-tools');
    const out = await (async () => { ${code} })();
    process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' }).split('\n@@').pop());

test('runenwoorden, weetjes, niveau, zorg, Eer, Leescheck en weekplanning via de connector', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-klas-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Bram'] });
    const gebeurd = [];
    tools.init({ naRunen: () => gebeurd.push('runen'), naOntdekToegang: t => gebeurd.push('toegang:' + t), naEer: () => gebeurd.push('eer'), naKlas: () => gebeurd.push('klas'), naPlanning: () => gebeurd.push('planning') });
    const roep = async (name, args, schrijven = true) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { sleutel: { naam: 'Claude' }, schrijven });
      if (r.error) throw new Error(r.error.message);
      return { fout: r.result.isError, data: r.result.isError ? r.result.content[0].text : r.result.structuredContent };
    };
    const out = {};
    out.lezen = await roep('runenwoorden_toevoegen', { woorden: [{ woord: 'kompas' }] }, false);
    out.rw1 = (await roep('runenwoorden_toevoegen', { woorden: [{ woord: 'Kompas', betekenis: 'toont het noorden' }, { woord: 'oogst', betekenis: 'wat je binnenhaalt', zin: 'De oogst is goed.' }, { woord: 'te lang woord' }, 'appelboom'] })).data;
    out.rw2 = (await roep('runenwoorden_toevoegen', { woorden: [{ woord: 'kompas', betekenis: 'iets anders', zin: 'Met een kompas vind je de weg.' }, { woord: 'muur', betekenis: 'een wand' }] })).data;
    out.rwz = (await roep('runenwoord_wijzigen', { woord: 'oogst', betekenis: 'wat je van het veld haalt' })).data;
    out.rwf = await roep('runenwoord_wijzigen', { woord: 'bestaatniet', zin: 'x' });
    out.rw = (await roep('runenwoorden', {})).data;
    const W = { niveau: 'page', onderwerp: 'Dieren', vraag: 'Hoeveel harten heeft een octopus?', opties: ['1', '2', '3'], juist: 2, weetje: 'Drie harten.' };
    out.wt = (await roep('weetjes_toevoegen', { weetjes: [W, W, { vraag: 'kapot', opties: ['a'] }], woorden: [{ woord: 'het moeras', betekenis: 'nat land', niveau: 'ridder' }] })).data;
    out.wz = (await roep('ontdek_wijzigen', { soort: 'weetje', nr: 1, wijziging: { juist: 1, opties: ['1', '3', '9'] } })).data;
    out.wzw = (await roep('ontdek_wijzigen', { soort: 'woord', woord: 'moeras', wijziging: { zin: 'In het moeras zakt je laars weg.' } })).data;
    out.wzf = await roep('ontdek_wijzigen', { soort: 'weetje', nr: 5, wijziging: { juist: 0 } });
    out.tg = (await roep('ontdek_toegang', { toegang: 'open' })).data;
    out.od = (await roep('ontdek_inhoud', {})).data;
    out.nv = (await roep('leerling_niveau', { naam: 'lotte', niveau: 'ridder' })).data;
    out.nvf = await roep('leerling_niveau', { naam: 'Niemand', niveau: 'page' });
    out.zn = (await roep('zorg_notitie', { naam: 'Bram', tekst: 'Werkt beter vooraan.' })).data;
    out.zl = (await roep('zorg_notities', {})).data;
    out.eer = (await roep('eer_geven', { namen: ['Lotte', 'Bram'], aantal: 3, reden: 'Goed samengewerkt' })).data;
    out.lc = await roep('leescheck', {});
    out.wp = (await roep('weekplanning', { week: '2026-W48' })).data;
    out.lp = (await roep('les_plannen', { week: '2026-W48', plek: '1-0', les: { vak: 'Rekenen', titel: 'Breuken', criteria: ['Ik vergelijk breuken.'] } })).data;
    out.lp2 = (await roep('les_plannen', { week: '2026-11-24', plek: '1-0', les: { notitie: 'Blokjes meenemen' } })).data;
    out.klas = klas.read().leerlingen.map(l => [l.naam, l.niveau || '']);
    out.gebeurd = gebeurd;
    out.log = connector.logboek(40).map(r => r.actie);
    return out;
  `);
  assert.equal(res.lezen.fout, true);
  assert.deepEqual(res.rw1.nieuw, ['kompas', 'oogst']);
  assert.equal(res.rw1.overgeslagen.length, 2);
  // Een woord dat er al staat: de betekenis blijft, enkel de ontbrekende zin komt erbij.
  assert.deepEqual(res.rw2.nieuw, ['muur']);
  assert.deepEqual(res.rw2.aangevuld, ['kompas']);
  const kompas = res.rw.woorden.find(x => x.woord === 'kompas');
  assert.equal(kompas.betekenis, 'toont het noorden');
  assert.equal(kompas.zin, 'Met een kompas vind je de weg.');
  assert.equal(res.rw.woorden.find(x => x.woord === 'oogst').betekenis, 'wat je van het veld haalt');
  assert.equal(res.rw.woorden.find(x => x.woord === 'muur').niveau, 'page');
  assert.equal(res.rw.aantal, 3);
  assert.equal(res.rwf.fout, true);
  assert.deepEqual(res.wt.toegevoegd, { weetjes: 1, woorden: 1 });
  assert.equal(res.wt.niet_toegevoegd.weetjes, 2);
  assert.equal(res.wz.gewijzigd.j, 1);
  assert.deepEqual(res.wz.gewijzigd.a, ['1', '3', '9']);
  assert.equal(res.wzw.gewijzigd.z, 'In het moeras zakt je laars weg.');
  assert.equal(res.wzf.fout, true);
  assert.equal(res.tg.toegang, 'open');
  assert.equal(res.od.toegang, 'open');
  assert.equal(res.od.weetjes.length, 1);
  assert.equal(res.od.weetjes[0].vraag, 'Hoeveel harten heeft een octopus?');
  assert.equal(res.od.woorden[0].woord, 'moeras');
  assert.equal(res.od.runenwoorden_met_betekenis, 3);
  assert.deepEqual(res.nv, { naam: 'Lotte', niveau: 'ridder' });
  assert.equal(res.nvf.fout, true);
  assert.deepEqual(res.klas, [['Lotte', 'ridder'], ['Bram', '']]);
  assert.equal(res.zn.aantal, 1);
  assert.equal(res.zl.leerlingen.length, 1);
  assert.equal(res.zl.leerlingen[0].notities[0].tekst, 'Werkt beter vooraan.');
  assert.equal(res.eer.gegeven, 2);
  assert.equal(res.lc.fout, false);
  assert.equal(res.wp.week, '2026-W48');
  assert.equal(res.wp.dagen.length, 5);
  assert.equal(res.wp.dagen[0].lesuren[0].plek, '1-0');
  assert.equal(res.lp.nieuw, true);
  // Een tweede keer op dezelfde plek: de les wordt aangevuld, niets gaat weg.
  assert.equal(res.lp2.bijgewerkt, true);
  assert.equal(res.lp2.les.titel, 'Breuken');
  assert.equal(res.lp2.les.notitie, 'Blokjes meenemen');
  assert.deepEqual(res.lp2.les.criteria, ['Ik vergelijk breuken.']);
  for (const g of ['runen', 'toegang:open', 'eer', 'klas', 'planning']) assert.ok(res.gebeurd.includes(g), g);
  for (const t of ['runenwoorden_toevoegen', 'runenwoord_wijzigen', 'weetjes_toevoegen', 'ontdek_wijzigen', 'ontdek_toegang', 'leerling_niveau', 'zorg_notitie', 'eer_geven', 'les_plannen']) assert.ok(res.log.includes(t), t);
});
