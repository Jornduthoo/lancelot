// Voorlezen met de stem van LANcelot (src/stem.js) en welke stem elke leerling hoort (icoontje in het live overzicht).
// De spraakdiensten zijn hier nep-servers op 127.0.0.1: er gaat niets naar internet.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');
const S = require('../public/js/stem-kern');

const ROOT = path.join(__dirname, '..');

test('stem: een leerling meldt zijn stem, alleen een verandering telt, na 8 uur is het weg', () => {
  const stem = require('../src/stem');
  stem.wisStanden();
  assert.strictEqual(stem.zetStand({ naam: ' Mila ', stand: 'geen' }, 1000), true);
  assert.strictEqual(stem.zetStand({ naam: 'mila', stand: 'geen' }, 2000), false);
  assert.strictEqual(stem.zetStand({ naam: 'Noor', stand: 'iets' }), false, 'onbekende stand');
  assert.strictEqual(stem.zetStand({ naam: '', stand: 'geen' }), false);
  assert.deepStrictEqual(stem.standenView(3000).leerlingen, { mila: 'geen' });
  assert.deepStrictEqual(stem.standenView(2000 + 8 * 3600 * 1000 + 1).leerlingen, {});
});

test('stem: de stukken zijn op de server en in de browser dezelfde, ook bij geschudde keuzes en open vakjes', () => {
  // Zoals pf-paper.js en ob-sheet.js het samenzetten: vraag + "A: keuze" per regel, een open vakje als " … ".
  assert.deepStrictEqual(S.serverStukken('Wat is **rood**?\nA: peer\nB: appel'), ['Wat is rood?', 'A:', 'peer', 'B:', 'appel']);
  assert.deepStrictEqual(S.serverStukken('Vul in.\nDe kat  …  op de mat.'), ['Vul in.', 'De kat', 'op de mat.']);
  const stem = require('../src/stem');
  const view = {
    pages: [
      { type: 'meerkeuze', vraag: 'Wat is **rood**?', opties: [{ tekst: 'appel' }, { tekst: 'peer' }] },
      { type: 'dictee', delen: [{ zeg: 'fiets. De fiets is rood. fiets.' }] },
      { type: 'bron', titel: 'Het bos', tekst: 'Een lange tekst.', stukken: [{ t: 'Een' }], vragen: [{ type: 'kort', vraag: 'Waar?', voorlees: 'Luister goed.' }] },
    ],
  };
  const alles = stem.teksten(view);
  const heeft = (t, traag = false) => alles.some(x => x.tekst === t && x.traag === traag);
  for (const t of ['Wat is rood?', 'appel', 'peer', 'Het bos', 'Een lange tekst.', 'Waar?', 'A:', 'B:']) assert.ok(heeft(t), t);
  assert.ok(!heeft('C:') && !heeft('Kies uit:'), 'alleen de letters die er zijn');
  // Een luistertekst (dictee, voorlees) ook traag, gewone tekst niet.
  assert.ok(heeft('fiets. De fiets is rood. fiets.', true));
  assert.ok(heeft('Luister goed.', true));
  assert.ok(!heeft('Wat is rood?', true));
  assert.ok(!heeft('Een', false), 'de woordstukken van een brontekst niet apart');
  // Voorlezen uit (bv. een Franse toets): alleen de luisterteksten.
  const uit = stem.teksten(view, { voorlees: false });
  assert.deepStrictEqual([...new Set(uit.map(x => x.tekst))].sort(), ['Luister goed.', 'fiets. De fiets is rood. fiets.']);
});

test('stem: de taal volgt het vak', () => {
  const stem = require('../src/stem');
  assert.strictEqual(stem.taalVanVak('Frans'), 'fr');
  assert.strictEqual(stem.taalVanVak('Engels'), 'en');
  assert.strictEqual(stem.taalVanVak('Nederlands'), 'nl');
  assert.strictEqual(stem.taalVanVak(''), 'nl');
});

// Een nep-Azure en nep-Gemini: houden bij wat er gevraagd werd.
function nepDienst() {
  const vragen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      vragen.push({ url: req.url, key: req.headers['ocp-apim-subscription-key'] || req.headers['x-goog-api-key'], body });
      if (req.url.startsWith('/cognitiveservices/v1')) {
        if (req.headers['ocp-apim-subscription-key'] !== 'goede-sleutel') { res.statusCode = 401; return res.end(); }
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.end(Buffer.from(`MP3:${body}`));
      }
      if (req.url.includes(':generateContent')) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.alloc(480).toString('base64') } }] } }] }));
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, vragen, url: `http://127.0.0.1:${server.address().port}` })));
}

function runner(data, env) {
  return code => new Promise((resolve, reject) => execFile(process.execPath, ['-e', `
    const stem = require('./src/stem'), settings = require('./src/settings');
    (async () => { ${code} })().then(r => process.stdout.write('\\n@@' + JSON.stringify(r)), e => process.stdout.write('\\n@@' + JSON.stringify({ fout: e.message })));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, ...env }, encoding: 'utf8' }, (err, out) => {
    if (err) return reject(err);
    const t = out.split('\n@@').pop();
    resolve(t === '' || t === 'undefined' ? undefined : JSON.parse(t));
  }));
}

test('stem van LANcelot: vooraf maken, nooit twee keer, een leerling laat niets nieuws maken, teller en grens', async () => {
  const nep = await nepDienst();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'stem-'));
  const run = runner(data, { AZURE_TTS_BASE_URL: nep.url });
  try {
    // Zonder sleutel: niets aan, niets gemaakt, geen fout.
    assert.deepStrictEqual(await run(`return { aan: stem.aan(), f: await stem.geluid({ tekst: 'Hallo.' }) };`), { aan: false, f: null });
    const v = await run(`return stem.bewaar({ dienst: 'azure', sleutel: 'goede-sleutel', man: false, grens: 5000 });`);
    assert.strictEqual(v.aan, true);
    assert.strictEqual(JSON.stringify(v).includes('goede-sleutel'), false, 'de sleutel komt nooit naar het scherm');
    assert.strictEqual(v.diensten.azure.hint, '…utel');
    const bron = `[{ view: { pages: [{ type: 'dictee', delen: [{ zeg: 'fiets.' }] }, { type: 'kort', vraag: 'Hoe heet je kat?' }] }, taal: 'nl', voorlees: true }]`;
    const uit = await run(`
      await stem.zorgVoor(${bron});
      const eerst = stem.view();
      await stem.zorgVoor(${bron});
      return {
        eerst, na: stem.view(),
        leerling: await stem.geluid({ tekst: 'fiets.', taal: 'nl', traag: true }),
        vreemd: await stem.geluid({ tekst: 'Iets wat nergens staat.', taal: 'nl' }),
        test: !!(await stem.geluid({ tekst: ${JSON.stringify(S.TESTZIN.nl)}, taal: 'nl' })),
      };`);
    assert.strictEqual(uit.eerst.klaar, uit.eerst.nodig, 'alles is gemaakt');
    assert.strictEqual(uit.na.tekens, uit.eerst.tekens, 'de tweede ronde betaalt niets');
    assert.ok(uit.leerling && fs.existsSync(uit.leerling), 'de leerling krijgt het bewaarde geluid');
    assert.strictEqual(uit.vreemd, null, 'een leerling laat geen nieuwe tekst maken');
    assert.strictEqual(uit.test, true, 'de testzin mag altijd');
    const azure = nep.vragen.filter(x => x.url.startsWith('/cognitiveservices'));
    const traag = azure.find(x => x.body.includes('fiets.') && x.body.includes('-40%'));
    assert.ok(traag, 'ook de trage versie');
    assert.match(traag.body, /nl-BE-DenaNeural/);
    assert.strictEqual(azure.length, new Set(azure.map(x => x.body)).size, 'elke tekst maar één keer gevraagd');
    // Teller per maand en de grens: daarboven niets meer, het toestel leest voor.
    const n = azure.length;
    const grens = await run(`
      settings.write({ stemGrens: stem.teller().tekens + 5 });
      return { f: await stem.geluid({ tekst: 'Een nieuwe zin die te lang is.', taal: 'nl', leerkracht: true }), v: stem.view() };`);
    assert.strictEqual(grens.f, null);
    assert.strictEqual(grens.v.bijna, true, 'de leerkracht ziet de waarschuwing');
    assert.strictEqual(nep.vragen.filter(x => x.url.startsWith('/cognitiveservices')).length, n);
    // Een foute sleutel: een duidelijke fout, en het geluid van eerder blijft.
    const fout = await run(`
      stem.bewaar({ sleutel: 'foute', grens: 100000 });
      try { await stem.maak('Nog iets.', 'nl', false); } catch (e) { return { e: e.message, oud: !!(await stem.geluid({ tekst: 'fiets.', taal: 'nl', traag: true })) }; }`);
    assert.match(fout.e, /sleutel voor Azure Speech \(Microsoft\) werkt niet/);
    assert.strictEqual(fout.oud, true, 'het geluid van eerder blijft');
  } finally {
    nep.server.close();
  }
});

test('stem van LANcelot: Gemini met de AI-sleutel geeft een wav, de stemsleutels gaan niet mee in de back-up', async () => {
  const nep = await nepDienst();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'stem-gemini-'));
  fs.writeFileSync(path.join(data, 'settings.json'), JSON.stringify({ geminiKey: 'g-sleutel', stemAzureKey: 'az', stemGoogleKey: 'gg' }));
  const run = runner(data, { GEMINI_BASE_URL: nep.url });
  try {
    const uit = await run(`
      stem.bewaar({ dienst: 'gemini', man: true });
      const f = await stem.maak('Hallo.', 'nl', false);
      const G = require('./src/gegevens'), zip = require('./src/zip');
      const s = JSON.parse(zip.read(G.maakBackup()).find(x => x.name === 'settings.json').data.toString('utf8'));
      return { f, kop: require('fs').readFileSync(f).slice(0, 4).toString(), s };`);
    assert.match(uit.f, /\.wav$/);
    assert.strictEqual(uit.kop, 'RIFF');
    const vraag = JSON.parse(nep.vragen.find(x => x.url.includes(':generateContent')).body);
    assert.strictEqual(vraag.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Charon');
    assert.match(vraag.contents[0].parts[0].text, /Vlaams[\s\S]*Hallo\./);
    assert.strictEqual(nep.vragen[0].key, 'g-sleutel');
    for (const k of ['geminiKey', 'stemAzureKey', 'stemGoogleKey']) assert.strictEqual(uit.s[k], undefined, k);
    assert.strictEqual(uit.s.stemDienst, 'gemini');
  } finally {
    nep.server.close();
  }
});
