// De connector, deel 3 (wens 25 nov): peilingen en voorkennis. Een peiling maken, bijwerken (vorige versie bewaard),
// op het bord zetten, leerlingen laten antwoorden, live lezen, stoppen en het resultaat teruglezen; een voorkennisquiz
// bij een les; alleen lezen blokkeert het schrijven.
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
    const rondetafel = require('./src/rondetafel'), results = require('./src/results'), quizzes = require('./src/quizzes');
    const out = await (async () => { ${code} })();
    process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' }).split('\n@@').pop());

const PEILING = {
  title: 'Wat weet je al over vulkanen?',
  items: [
    { type: 'woorden', question: 'Waar denk je aan bij een vulkaan?' },
    { type: 'keuze', question: 'Alle vulkanen zijn actief.', options: ['Eens', 'Oneens', 'Ik weet het niet'] },
    { type: 'schaal', question: 'Hoe goed ken je vulkanen al?', min: 'Niets', max: 'Heel goed' },
    { type: 'open', question: 'Wat wil je nog weten?' },
  ],
};

test('peilingen en voorkennis: maken, bijwerken, op het bord, live, stoppen, resultaat, voorkennisquiz', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-peilen-'));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte'] });
    const io = { to: () => ({ emit() {} }) };
    const rt = new rondetafel.RondeTafel(io, r => results.saveRondeTafel(r));
    tools.init({ rondeTafel: () => rt, peilingStarten: s => { if (rt.active) throw new Error('De Ronde Tafel loopt nog. Stop die eerst.'); rt.load(s); }, peilingStoppen: () => rt.stop() });
    const roep = async (name, args, schrijven = true) => {
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { sleutel: { naam: 'Claude' }, schrijven });
      if (r.error) throw new Error(r.error.message);
      return { fout: r.result.isError, data: r.result.isError ? r.result.content[0].text : r.result.structuredContent };
    };
    const lezen = await roep('peiling_maken', { peiling: ${JSON.stringify(PEILING)} }, false);
    const gemaakt = await roep('peiling_maken', { peiling: ${JSON.stringify(PEILING)}, doel: 'voorkennis' });
    const dubbel = await roep('peiling_maken', { peiling: ${JSON.stringify(PEILING)} });
    const fout = await roep('peiling_maken', { peiling: { title: 'Leeg', items: [{ type: 'keuze', question: 'x', options: ['a'] }] } });
    const bij = await roep('peiling_bijwerken', { file: gemaakt.data.file, titel: 'Vulkanen: wat weet je al?' });
    const lijst = await roep('peilingen', { voorkennis: true });
    const een = await roep('peiling', { file: gemaakt.data.file });
    const start = await roep('peiling_starten', { file: gemaakt.data.file });
    const nogEens = await roep('peiling_starten', { file: gemaakt.data.file });
    rt.go(0); rt.answer('p1', 'lava'); rt.answer('p2', 'Lava'); rt.answer('p2', 'vuur');
    rt.go(1); rt.answer('p1', 1); rt.answer('p2', 2);
    rt.go(2); rt.answer('p1', 4); rt.answer('p2', 2);
    rt.go(3); rt.answer('p1', 'Waarom ontploffen ze?');
    const live = await roep('peiling_resultaten', { live: true });
    const stop = await roep('peiling_stoppen', {});
    const geenLive = await roep('peiling_stoppen', {});
    const resLijst = await roep('peiling_resultaten', {});
    const res = await roep('peiling_resultaten', { file: stop.data.resultaat });
    quizzes.lib.addFolder('Wiskunde', '');
    const vq = await roep('voorkennisquiz_maken', { quiz: { title: 'x', questions: [{ question: '1/2 = ?', answers: ['0,5', '2'], correct: 0 }] }, lessen_map: 'Wiskunde', les: 12, onderwerp: 'breuken' });
    const vk = await roep('voorkennis', {});
    const versies = require('fs').readdirSync(require('path').join(rondetafel.DIR, '_versies')).length;
    return { lezen, gemaakt: gemaakt.data, dubbel, fout, bij: bij.data, lijst: lijst.data, een: een.data, start: start.data, nogEens, live: live.data, stop: stop.data, geenLive, resLijst: resLijst.data, res: res.data, vq: vq.data, vk: vk.data, versies, log: connector.logboek(30).map(r => r.actie) };
  `);
  assert.equal(res.lezen.fout, true);
  assert.match(res.lezen.data, /alleen lezen/);
  assert.equal(res.gemaakt.map, 'Voorkennis');
  assert.equal(res.gemaakt.vragen, 4);
  assert.match(res.dubbel.data, /bestaat al/);
  assert.match(res.fout.data, /2 tot 6 keuzes/);
  assert.equal(res.bij.titel, 'Vulkanen: wat weet je al?');
  assert.equal(res.bij.file, res.gemaakt.file);
  assert.equal(res.versies, 1);
  assert.equal(res.lijst.peilingen.length, 1);
  assert.equal(res.een.peiling.items[1].options.length, 3);
  assert.equal(res.start.status, 'klaar op het bord');
  assert.equal(res.nogEens.fout, true);
  assert.equal(res.live.live.deelnemers, 2);
  assert.deepEqual(res.live.live.vragen[0].woorden, [{ woord: 'lava', aantal: 2 }, { woord: 'vuur', aantal: 1 }]);
  assert.equal(res.live.live.vragen[2].gemiddelde, 4);
  assert.ok(res.stop.resultaat);
  assert.match(res.geenLive.data, /geen peiling/);
  assert.equal(res.resLijst.aantal, 1);
  assert.equal(res.res.titel, 'Vulkanen: wat weet je al?');
  assert.equal(res.res.deelnemers, 2);
  assert.equal(res.res.vragen.length, 4);
  assert.deepEqual(res.res.vragen[1].keuzes.map(k => k.stemmen), [0, 1, 1]);
  assert.equal(res.res.vragen[2].gemiddelde, 4);
  assert.equal(res.res.vragen[0].woorden[0].woord, 'lava');
  assert.deepEqual(res.res.vragen[3].antwoorden, ['Waarom ontploffen ze?']);
  assert.equal(res.vq.titel, 'Voorkennis les 12 · breuken');
  assert.equal(res.vq.map, 'Voorkennis/Wiskunde');
  assert.equal(res.vk.peilen[0].les, 12);
  assert.equal(res.vk.peilen[0].lessen_map, 'Wiskunde');
  assert.equal(res.vk.activeren.length, 1);
  for (const t of ['peiling_maken', 'peiling_bijwerken', 'peiling_starten', 'peiling_stoppen', 'voorkennisquiz_maken']) assert.ok(res.log.includes(t), t);
});
