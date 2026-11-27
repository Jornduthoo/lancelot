// De connector voor Claude (wens 25 nov): sleutel, alleen lezen, logboek, MCP en de aanvaardingstest:
// een proeftoets klaarzetten, toewijzen aan één leerling, het resultaat teruglezen en de taak intrekken, zonder één klik.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  (async () => {
    const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), connector = require('./src/connector');
    const express = require('express');
    const out = await (async () => { ${code} })();
    taken.flush();
    process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = {
  title: 'Proeftoets connector', vak: 'Wiskunde',
  vragen: [{ type: 'meerkeuze', vraag: '2 + 2?', opties: ['3', '4', '5'], juist: 1 }, { type: 'kort', vraag: '3 × 3?', antwoord: '9' }],
};

test('aanvaardingstest: toets klaarzetten, toewijzen, resultaat lezen, intrekken, alles in het logboek', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Testleerling', 'Mats'] });
    const w = { sleutel: { naam: 'Claude' }, schrijven: true };
    const roep = async (name, args) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, w);
      if (r.error) throw new Error(r.error.message);
      return { fout: r.result.isError, data: r.result.isError ? r.result.content[0].text : r.result.structuredContent };
    };
    const bewaard = await roep('toets_bewaren', { toets: ${JSON.stringify(TOETS)}, map: 'Archief/Wiskunde' });
    const dubbel = await roep('toets_bewaren', { toets: ${JSON.stringify(TOETS)} });
    const lijst = await roep('toetsen', { zoek: 'proeftoets' });
    const controle = await roep('toets_controleren', { file: bewaard.data.file });
    const taak = await roep('taak_geven', { file: bewaard.data.file, namen: ['testleerling'], voorlezen: 'uit', volgorde: 'alles', punten_tonen: true });
    const nogEens = await roep('taak_geven', { file: bewaard.data.file, namen: ['Testleerling'] });
    const onbekend = await roep('taak_geven', { file: bewaard.data.file, namen: ['Niemand'] });
    // De leerling maakt de toets (op zijn toestel).
    const id = taak.data.taak_id;
    const v = taken.open({ id, naam: 'Testleerling' });
    const mk = v.view.pages.find(p => p.type === 'meerkeuze');
    const vier = mk.opties.findIndex(o => (o.tekst || o) === '4');
    taken.toetsAntwoord({ id, naam: 'Testleerling', vraag: mk.id, waarde: vier });
    taken.toetsAntwoord({ id, naam: 'Testleerling', vraag: v.view.pages.find(p => p.type === 'kort').id, waarde: '8' });
    taken.inleveren({ id, naam: 'Testleerling' });
    const resultaat = await roep('resultaten_toets', { taak_id: id });
    const antw = await roep('antwoord', { taak_id: id, naam: 'Testleerling', vraag: '2' });
    const leerling = await roep('resultaten_leerling', { naam: 'Testleerling' });
    const weg = await roep('taak_intrekken', { taak_id: id });
    const na = await roep('taken', {});
    return { bewaard: bewaard.data, dubbel, lijst: lijst.data.toetsen.length, controle: controle.data, taak: taak.data, nogEens, onbekend, resultaat: resultaat.data, antw: antw.data, leerling: leerling.data, weg: weg.data, na: na.data.taken[0], log: connector.logboek(20), map: proeven.lib.places()(bewaard.data.file) };
  `);
  assert.equal(res.bewaard.map, 'Archief/Wiskunde');
  assert.equal(res.map, 'Archief/Wiskunde');
  assert.equal(res.dubbel.fout, true);
  assert.match(res.dubbel.data, /bestaat al/);
  assert.equal(res.lijst, 1);
  assert.equal(res.controle.in_orde, true);
  assert.deepEqual(res.taak.leerlingen.map(l => l.naam), ['Testleerling']);
  assert.equal(res.taak.keuzes.voorlees, 'uit');
  assert.equal(res.taak.keuzes.volgorde, 'alles');
  assert.equal(res.nogEens.fout, true);
  assert.match(res.nogEens.data, /bestaat al/);
  assert.match(res.onbekend.data, /Niemand/);
  assert.equal(res.resultaat.leerlingen.length, 1);
  assert.equal(res.resultaat.leerlingen[0].punten, 1);
  assert.equal(res.resultaat.leerlingen[0].max, 2);
  assert.deepEqual(res.resultaat.vaakst_fout.map(v => v.nr), ['2']);
  assert.equal(res.antw.vragen[0].antwoord, '8');
  assert.equal(res.antw.vragen[0].sleutel, '9');
  assert.equal(res.leerling.toetsen.length, 1);
  assert.equal(res.weg.status, 'afgesloten');
  assert.equal(res.na.status, 'afgesloten');
  assert.equal(res.na.leerlingen[0].status, 'klaar');
  const acties = res.log.map(r => r.actie);
  for (const a of ['toets_bewaren', 'taak_geven', 'resultaten_toets', 'taak_intrekken']) assert.ok(acties.includes(a), a);
  assert.ok(res.log.every(r => r.wie === 'Claude'));
});

test('alleen lezen, nieuwe versie van een gegeven toets, dagpresentatie, taak verplaatsen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-'));
  const morgen = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const roep = async (name, args, schrijven = true) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { sleutel: { naam: 'Claude' }, schrijven });
      return { fout: r.result.isError, data: r.result.isError ? r.result.content[0].text : r.result.structuredContent };
    };
    const lezen = await roep('toets_bewaren', { toets: ${JSON.stringify(TOETS)} }, false);
    const eerst = await roep('toets_bewaren', { toets: ${JSON.stringify(TOETS)} });
    const bijwerken = await roep('toets_bewaren', { toets: { ...${JSON.stringify(TOETS)}, intro: 'Veel succes' }, file: eerst.data.file });
    const t = await roep('taak_geven', { file: eerst.data.file, namen: ['Lotte'], vanaf: '${morgen}' });
    const verplaatst = await roep('taak_verplaatsen', { taak_id: t.data.taak_id });
    const nieuweVersie = await roep('toets_bewaren', { toets: { ...${JSON.stringify(TOETS)}, intro: 'Versie 3' }, file: eerst.data.file });
    const pres = await roep('dagpresentatie_plaatsen', { html: '<!doctype html><body><section class="dia"><h1>Goeiemorgen</h1></section></body>', titel: 'Donderdag' });
    const pres2 = await roep('dagpresentatie_plaatsen', { html: '<!doctype html><body><section class="dia"><h1>Tweede</h1></section></body>', titel: 'Donderdag' });
    const pres3 = await roep('dagpresentatie_plaatsen', { vervolg: pres.data.naam, html: '<section class="dia"><h1>Rekenen</h1></section><section class="dia"><h1>Taal</h1></section>' });
    const pres4 = await roep('dagpresentatie_plaatsen', { vervolg: 'bestaat niet.html', html: '<section class="dia"></section>' });
    const lees3 = await roep('dagpresentatie', { naam: pres.data.naam });
    const lees = await roep('dagpresentatie', {});
    const lijst = await connector.rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, { sleutel: { naam: 'x' }, schrijven: false });
    const vandaag = connector.presentatieVan();
    connector.presentatieKiezen(pres.data.naam);
    const gekozen = connector.presentatieVan();
    const leesGekozen = await roep('dagpresentatie', {});
    const versies = require('fs').readdirSync(require('path').join(proeven.DIR, '_versies')).length;
    return { pres3: pres3.data, pres4, lees3: lees3.data.html, lezen, eerst: eerst.data, bijwerken: bijwerken.data, verplaatst: verplaatst.data, nieuweVersie: nieuweVersie.data, pres: pres.data, pres2: pres2.data, lees: { gevonden: lees.data.gevonden, html: lees.data.html }, tools: lijst.result.tools.map(x => [x.name, x.annotations.readOnlyHint]), vandaag, gekozen, leesGekozen: leesGekozen.data.naam, versies };
  `);
  assert.equal(res.lezen.fout, true);
  assert.match(res.lezen.data, /alleen lezen/);
  assert.equal(res.bijwerken.file, res.eerst.file);
  assert.equal(res.bijwerken.nieuw, false);
  assert.equal(res.versies, 1);
  assert.equal(res.verplaatst.status, 'open');
  assert.notEqual(res.nieuweVersie.file, res.eerst.file);
  assert.match(res.nieuweVersie.melding, /al gegeven/);
  assert.match(res.pres.naam, /^\d{4}-\d{2}-\d{2} Donderdag\.html$/);
  assert.notEqual(res.pres2.naam, res.pres.naam);
  // Groot in stukken: met "vervolg" komen de dia's achteraan bij, voor </body> (wens 26 nov, punt 1).
  assert.equal(res.pres3.aangevuld, true);
  assert.equal(res.pres3.dias, 3);
  assert.match(res.lees3, /Goeiemorgen<\/h1><\/section><section class="dia"><h1>Rekenen[\s\S]*Taal<\/h1><\/section>\n<\/body>$/);
  assert.equal(res.pres4.fout, true);
  assert.equal(res.lees.gevonden, true);
  assert.ok(res.vandaag && res.vandaag.link.startsWith('/kronieken?map=Dagpresentaties'));
  // Meerdere versies op één dag: de laatst geplaatste is actief, ook al werd de eerste daarna nog aangevuld (wens 27 nov).
  assert.equal(res.vandaag.naam, res.pres2.naam);
  assert.deepEqual(res.vandaag.versies.map(v => v.naam).sort(), [res.pres.naam, res.pres2.naam].sort());
  // De leerkracht kiest een andere versie: die staat in Vandaag en de tool "dagpresentatie" leest ze.
  assert.equal(res.gekozen.naam, res.pres.naam);
  assert.equal(res.leesGekozen, res.pres.naam);
  const ro = Object.fromEntries(res.tools);
  assert.equal(ro.toetsen, true);
  assert.equal(ro.taak_geven, false);
});

test('aanmelden: uit, geen of foute sleutel, ingetrokken; nooit een sleutel in een antwoord', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-'));
  const res = run(tmp, `
    const app = express();
    connector.routes(app, express);
    const server = await new Promise(ok => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
    const url = 'http://127.0.0.1:' + server.address().port;
    const post = (pad, body, headers = {}) => fetch(url + pad, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: r.status === 202 ? null : await r.json() }));
    const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } };
    const uit = await post('/mcp', init);
    connector.zet({ aan: true });
    const { sleutel, id } = connector.maakSleutel('Claude');
    const geen = await post('/mcp', init);
    const fout = await post('/mcp/lnc_fout', init);
    const pad = await post('/mcp/' + sleutel, init);
    const kop = await post('/mcp', init, { Authorization: 'Bearer ' + sleutel });
    const melding = await post('/mcp/' + sleutel, { jsonrpc: '2.0', method: 'notifications/initialized' });
    const rest = await post('/api/v1/gezondheid', {}, { Authorization: 'Bearer ' + sleutel });
    const schrijf = await post('/api/v1/taak_intrekken', { taak_id: 'x' }, { Authorization: 'Bearer ' + sleutel });
    connector.trekIn(id);
    const ingetrokken = await post('/mcp/' + sleutel, init);
    server.close();
    const bestand = require('fs').readFileSync(require('path').join(connector.DIR(), 'connector.json'), 'utf8');
    return { uit: uit.status, geen: geen.status, fout: fout.status, pad: pad.body.result.serverInfo.name, kop: kop.status, proto: pad.body.result.protocolVersion, melding: melding.status, rest: rest.body, schrijf: schrijf.body, ingetrokken: ingetrokken.status, sleutelInBestand: bestand.includes(sleutel), view: JSON.stringify(connector.view('http://x')).includes(sleutel) };
  `);
  assert.equal(res.uit, 403);
  assert.equal(res.geen, 401);
  assert.equal(res.fout, 401);
  assert.equal(res.pad, 'lancelot');
  assert.equal(res.proto, '2025-03-26');
  assert.equal(res.kop, 200);
  assert.equal(res.melding, 202);
  assert.equal(res.rest.ok, true);
  assert.equal(res.rest.draait, undefined); // zonder server.js geen extra gezondheid, wel de klas
  assert.ok(res.rest.klas);
  assert.equal(res.schrijf.ok, false);
  assert.match(res.schrijf.error, /alleen lezen/);
  assert.equal(res.ingetrokken, 401);
  assert.equal(res.sleutelInBestand, false);
  assert.equal(res.view, false);
});

test('de gezondheid geeft geen sleutel van de voorleesstem terug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-'));
  fs.writeFileSync(path.join(tmp, 'settings.json'), JSON.stringify({ stemDienst: 'azure', azureSpeechKey: 'GEHEIM1234567890', azureSpeechRegion: 'westeurope' }));
  const res = run(tmp, `
    const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gezondheid', arguments: {} } }, { sleutel: { naam: 'Claude' }, schrijven: false });
    return r.result.content[0].text;
  `);
  assert.ok(!res.includes('GEHEIM'));
  assert.ok(!res.includes('7890'));
  assert.match(res, /"sleutel_ingesteld": true/);
});
