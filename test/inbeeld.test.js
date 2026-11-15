// In Beeld (Woordkaarten): kaarten ophalen, aanbrengen, woorden van de week, quiz met doel per vraag, Junior,
// en terugmelden met alleen kaart en leerjaar. Niet in de Store-versie.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code, env = {}) => new Promise((resolve, reject) => {
  execFile(process.execPath, ['-e', `
    const ib = require('./src/inbeeld'), runen = require('./src/runen'), quizzes = require('./src/quizzes'), junior = require('./src/junior'), jrFoto = require('./src/jr-foto');
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    (async () => { ${code} })().then(out => { runen.flush(); process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out)); setTimeout(() => process.exit(0), 50); },
      err => { console.error(err); process.exit(1); });
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, ...env }, encoding: 'utf8' }, (err, stdout, stderr) => {
    if (err) return reject(new Error(stderr || err.message));
    resolve(JSON.parse(stdout.split('\n@@').pop()));
  });
});
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'inbeeld-'));

test('een kaart van In Beeld wordt juist gelezen; een kaart die niet klopt wordt overgeslagen', () => {
  const ib = require('../src/inbeeld');
  const k = ib.schoonKaart({ nr: 'w-142', woord: 'de ophaalbrug', uitleg: 'Een brug die omhoog kan.', voorbeeldzin: 'De ophaalbrug gaat dicht.', leerjaren: ['L4', 5, 'K1', 'onzin'], doelen: ['4.2.GL4.1', 'niet-een-doel'], verwant: ['W-143', 'W-142'], beeld: 'beelden/W-142.webp' });
  assert.deepEqual(k, { nr: 'W-142', woord: 'ophaalbrug', lidwoord: 'de', uitleg: 'Een brug die omhoog kan.', zin: 'De ophaalbrug gaat dicht.', leerjaren: ['JK', '4', '5'], doelen: ['4.2.GL4.1'], verwant: ['W-143'], beeld: 'beelden/W-142.webp' });
  assert.equal(ib.schoonKaart({ nr: 'W-1', woord: 'kasteel' }), null, 'zonder uitleg');
  assert.equal(ib.schoonKaart({ nr: '142', woord: 'kasteel', uitleg: 'x' }), null, 'zonder geldig nummer');
  assert.equal(ib.leerjaar('4e leerjaar'), '4');
  assert.equal(ib.leerjaar('K3'), 'K3');
});

test('de voorbeeldkaarten: allemaal geldig, met een beeld dat bestaat en een Op.stap-doel', () => {
  const ib = require('../src/inbeeld');
  for (const ruw of ib.VOORBEELD.kaarten) {
    const k = ib.schoonKaart(ruw);
    assert.ok(k, ruw.nr);
    assert.ok(fs.existsSync(path.join(ROOT, 'public', k.beeld)), k.beeld);
    assert.ok(k.doelen.length && k.leerjaren.length, k.nr);
    for (const v of k.verwant) assert.ok(ib.VOORBEELD.kaarten.some(x => x.nr === v), `${k.nr} -> ${v}`);
  }
});

test('voorbeeldkaarten: quiz met doel per vraag, woorden van de week, Hofschilder en Junior', async () => {
  const res = await run(tmp(), `
    await ib.haalSet('voorbeeld');
    const v = ib.view();
    const nrs = v.kaarten.map(k => k.nr);
    const te_weinig = fout(() => ib.maakQuiz(nrs.slice(0, 3)));
    const quiz = ib.maakQuiz(nrs, 'Test', Math.random, '4');
    quizzes.validate(quiz);
    const r = ib.naarRunen(['V-1', 'V-2', 'V-3', 'V-16'], runen);
    const lijst = runen.lijstView();
    const week = ib.weekKaarten().map(k => k.nr);
    const jrW = ib.naarJuniorWoorden(['V-1', 'V-10'], junior);
    const sets = ib.naarJuniorReeks(['V-1', 'V-2', 'V-3', 'V-4'], junior, jrFoto, require('path').join(process.cwd(), 'public'));
    const reeks = sets.find(s => s.map === 'In Beeld');
    return { aantal: v.kaarten.length, te_weinig, vragen: quiz.questions.length, zonderDoel: quiz.questions.filter(q => !q.doel).length,
      doelen: [...new Set(quiz.questions.map(q => q.doel))], soorten: [...new Set(quiz.questions.map(q => q.question.split(' ')[0]))],
      r, runen: lijst.woorden.map(x => x.w), doel: lijst.doel, week, jrW, reeks: { vragen: reeks.vragen.length, eerste: reeks.vragen[0], fotos: reeks.vragen.every(q => q.opties.every(o => jrFoto.bestand(o.f) && require('fs').existsSync(jrFoto.bestand(o.f)))) } };
  `);
  assert.equal(res.aantal, 16);
  assert.match(res.te_weinig, /minstens 4 kaarten/);
  assert.equal(res.vragen, 48, 'drie vragen per kaart');
  assert.equal(res.zonderDoel, 0, 'elke vraag heeft een doel');
  assert.ok(res.doelen.every(d => /^1\.5\.G/.test(d)));
  assert.ok(res.doelen.includes('1.5.GL4.7'), 'het doel van het gekozen leerjaar gaat voor');
  assert.deepEqual(res.soorten.sort(), ['Wat', 'Welk', 'Wie']);
  // schip (5), anker (5) en planeet (7) passen in het Runenraadsel; vuurtoren (9) niet, maar staat wel in de week.
  assert.deepEqual(res.runen.sort(), ['anker', 'planeet', 'schip']);
  assert.deepEqual(res.r.overgeslagen, ['de vuurtoren']);
  assert.ok(res.doel);
  assert.deepEqual(res.week, ['V-1', 'V-2', 'V-3', 'V-16']);
  assert.deepEqual(res.jrW.map(x => x.w), ['het schip', 'de kroon']);
  assert.equal(res.reeks.vragen, 4);
  assert.match(res.reeks.eerste.vraag, /^Waar is (het|de) /);
  assert.equal(res.reeks.eerste.opties.length, 3);
  assert.ok(res.reeks.fotos, 'de beelden staan in de fotomap van Junior');
});

test('ophalen bij In Beeld en terugmelden: alleen kaart en leerjaar gaan naar het internet', async () => {
  const png = fs.readFileSync(path.join(ROOT, 'public/favicon.png'));
  const meldingen = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/inbeeld/api/aangebracht') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => { meldingen.push(JSON.parse(body)); res.writeHead(204).end(); });
      return;
    }
    if (req.url === '/inbeeld/api/index.json') return res.end(JSON.stringify({ sets: [{ id: 'leerjaar-4', titel: '4e leerjaar', leerjaren: [4], aantal: 2 }, { id: 'Slecht id!', titel: 'x' }] }));
    if (req.url === '/inbeeld/api/sets/leerjaar-4.json') {
      return res.end(JSON.stringify({ titel: '4e leerjaar', kaarten: [
        { nr: 'W-142', woord: 'de ophaalbrug', uitleg: 'Een brug die omhoog kan.', zin: 'De ophaalbrug gaat dicht.', leerjaren: ['4'], doelen: ['4.2.GL4.1'], beeld: 'beelden/W-142.png' },
        { nr: 'W-143', woord: 'de slotgracht', uitleg: 'Water rond een kasteel.', zin: '', leerjaren: ['4'], beeld: 'https://elders.example/W-143.png' },
        { nr: 'fout', woord: 'x' },
      ] }));
    }
    if (req.url === '/inbeeld/api/beelden/W-142.png') return res.end(png);
    res.writeHead(404).end();
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const bron = `http://127.0.0.1:${server.address().port}/inbeeld/api`;
  try {
    const data = tmp();
    const res = await run(data, `
      const online = await ib.online();
      const haal = await ib.haalSet('leerjaar-4');
      const v = ib.view();
      ib.aangebracht('W-142', '4');
      ib.aangebracht('W-142', '4');
      await new Promise(r => setTimeout(r, 300));
      ib.zetMelden(false);
      ib.aangebracht('W-143', '4');
      await new Promise(r => setTimeout(r, 200));
      return { online, haal, kaarten: v.kaarten.map(k => [k.nr, k.beeld || '']), aangebracht: ib.view().kaarten.map(k => k.aangebracht), wachtrij: ib.view().wachtrij };
    `, { LANCELOT_INBEELD: bron });
    assert.deepEqual(res.online.sets.map(s => s.id), ['leerjaar-4']);
    assert.deepEqual(res.haal, { aantal: 2, titel: '4e leerjaar', zonderBeeld: 1 });
    // Een beeld van een ander adres halen we niet op.
    assert.deepEqual(res.kaarten, [['W-142', '/inbeeld/beeld/W-142.png'], ['W-143', '']]);
    assert.ok(fs.existsSync(path.join(data, 'inbeeld', 'beelden', 'W-142.png')));
    assert.deepEqual(res.aangebracht, [['4'], ['4']]);
    assert.equal(res.wachtrij, 0);
    // Dezelfde dag twee keer = één melding, en met melden uit geen enkele meer. Nooit meer dan kaart en leerjaar.
    assert.deepEqual(meldingen, [{ kaart: 'W-142', leerjaar: '4' }]);
    // Welke sets je ophaalde, gaat mee met Mijn lesmap.
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(data, 'inbeeld', 'lesmap', 'keuze.json'), 'utf8')).sets, [{ id: 'leerjaar-4', titel: '4e leerjaar' }]);
  } finally {
    server.close();
  }
});

test('In Beeld staat niet in de Store-versie', async () => {
  const res = await run(tmp(), `
    let fout = null;
    try { await ib.haalSet('voorbeeld'); } catch (e) { fout = e.message; }
    return { aan: ib.aan(), fout, week: ib.weekKaarten() };
  `, { LANCELOT_STORE: '1' });
  assert.deepEqual(res, { aan: false, fout: 'In Beeld staat niet in deze versie.', week: [] });
  const host = fs.readFileSync(path.join(ROOT, 'public/host.html'), 'utf8');
  const blok = host.slice(host.indexOf('<div class="niet-in-store">'), host.indexOf('<h3>Opvolgen'));
  assert.ok(blok.includes('data-module="inbeeld"'), 'de tegel staat in het blok dat de Store-versie verbergt');
});
