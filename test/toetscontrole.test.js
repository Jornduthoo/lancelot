// Uitgebreide toetscontrole (wens 25 nov, punt 3): beelden, andere goede schrijfwijzen, 6- en 6+-versie.
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
process.env.LANCELOT_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'controle-'));
const tc = require('../src/toetscontrole');
const K = require('../src/proeven').K;

function png(w, h) {
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([Buffer.from(t), d])) : 0); return Buffer.concat([l, Buffer.from(t), d, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ch('IHDR', ihdr), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]).toString('base64');
}

test('maten: png, gif, jpeg en webp uit de kop', () => {
  assert.deepStrictEqual(tc.maten(Buffer.from(png(300, 200).split(',')[1], 'base64')), { w: 300, h: 200 });
  const gif = Buffer.from('GIF89a', 'ascii');
  assert.deepStrictEqual(tc.maten(Buffer.concat([gif, Buffer.from([0x40, 0x01, 0xc8, 0x00]), Buffer.alloc(20)])), { w: 320, h: 200 });
  const webp = fs.readFileSync(path.join(ROOT, 'public', 'img', 'logo.webp'));
  const m = tc.maten(webp);
  assert.ok(m && m.w > 50 && m.h > 50);
  assert.strictEqual(tc.maten(Buffer.from('geen beeld, gewoon tekst hier')), null);
});

test('beelden: te klein, kapot, op internet; een goed beeld zegt niets', () => {
  const t = K.validate({ titel: 'Prenten', vragen: [
    { type: 'kort', vraag: 'Wat zie je?', antwoord: 'kat', beeld: png(30, 20) },
    { type: 'kort', vraag: 'En hier?', antwoord: 'hond', beeld: png(400, 300) },
    { type: 'kort', vraag: 'En nu?', antwoord: 'vis', beeld: 'data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  ] });
  const b = tc.beelden(t).map(x => x.tekst).join('\n');
  assert.match(b, /vraag 1: de afbeelding is te klein \(30 × 20/);
  assert.doesNotMatch(b, /vraag 2/);
  assert.match(b, /vraag 3: de afbeelding is niet te lezen/);
  assert.strictEqual(tc.beeldFout('https://voorbeeld.be/a.png'), 'staat op internet: zonder internet zien de leerlingen het niet');
  assert.match(tc.beeldFout('/img/bestaat-niet.webp'), /ontbreekt/);
  assert.strictEqual(tc.beeldFout('/img/logo.webp'), null);
});

test('andere goede schrijfwijzen: lidwoord, koppelteken, accent, cijfer, onbekende eenheid', () => {
  assert.deepStrictEqual(tc.voorstellen('de Schelde'), ['Schelde']);
  assert.deepStrictEqual(tc.voorstellen('de Schelde|Schelde'), []);
  assert.deepStrictEqual(tc.voorstellen('Noord-Korea'), ['Noord Korea']);
  assert.deepStrictEqual(tc.voorstellen('Noord-Korea', { spelling: true }), []);
  assert.deepStrictEqual(tc.voorstellen('café'), ['cafe']);
  assert.deepStrictEqual(tc.voorstellen('drie'), ['3']);
  // Een getal als antwoord (een rekentoets): niet ook nog het woord voorstellen.
  assert.deepStrictEqual(tc.voorstellen('9'), []);
  assert.deepStrictEqual(tc.voorstellen('45°'), ['45']);
  // Getallen met een gewone eenheid rekent LANcelot al goed (12 = 12 cm = 12,0): niets voorstellen.
  assert.deepStrictEqual(tc.voorstellen('12 cm'), []);
  assert.deepStrictEqual(tc.voorstellen('0,5'), []);
  const t = K.validate({ titel: 'WO', vragen: [{ type: 'kort', vraag: 'Welke rivier?', antwoord: 'de Schelde' }, { type: 'invullen', tekst: 'De hoofdstad is [Brussel].' }] });
  const a = tc.alternatieven(t);
  assert.strictEqual(a.length, 1);
  assert.deepStrictEqual(a[0].voorstel, ['Schelde']);
  // Een spellingtoets: geen voorstellen over accenten.
  const sp = K.validate({ titel: 'Toets spelling', vragen: [{ type: 'kort', vraag: 'Schrijf', antwoord: 'café' }] });
  assert.strictEqual(tc.alternatieven(sp).length, 0);
});

test('6 en 6+: de andere versie vinden, en zeggen wat niet gepland is of op een andere dag staat', () => {
  assert.strictEqual(tc.kern('6+ · Rekenen blok 4 · Toets getallenkennis'), tc.kern('Toets getallenkennis - Blok 4'));
  const lijst = [
    { file: 'b4.json', title: 'Toets getallenkennis - Blok 4', folder: 'Rekenen/Blok 4' },
    { file: 'b4p.json', title: 'Toets getallenkennis - Blok 4 (Page)', folder: 'Page – klasleerstof/Rekenen/Blok 4' },
    { file: 'z4.json', title: '6+ · Rekenen blok 4 · Toets getallenkennis', folder: 'Page – 6+/Rekenen/Blok 4' },
    { file: 'z4o.json', title: '6+ oefentoets · Rekenen blok 4 · Getallenkennis', folder: 'Page – 6+/Extra oefentoetsen/Rekenen/Blok 4' },
    { file: 'b4m.json', title: 'Toets meetkunde - Blok 4', folder: 'Rekenen/Blok 4' },
    { file: 'ww.json', title: 'Werkwoordenblok 4', folder: 'Taal/Werkwoordenblokken' },
  ];
  const t = { title: 'x', vragen: [] };
  assert.deepStrictEqual(tc.andereVersies('b4.json', lijst), [{ file: 'z4.json', titel: '6+ · Rekenen blok 4 · Toets getallenkennis', versie: '6+' }]);
  const taak = (file, dag, namen) => ({ id: file + dag, soort: 'proef', file, dicht: false, vanaf: `${dag}T08:30`, leerlingen: namen.map(naam => ({ naam })) });
  assert.match(tc.versies('b4.json', t, lijst, [taak('b4.json', '2026-12-03', ['Lotte'])])[0].tekst, /6\+-versie .* is niet gepland/);
  assert.match(tc.versies('b4.json', t, lijst, [taak('b4.json', '2026-12-03', ['Lotte']), taak('z4.json', '2026-12-04', ['Mats'])])[0].tekst, /andere dag/);
  const dubbel = tc.versies('b4.json', t, lijst, [taak('b4.json', '2026-12-03', ['Lotte']), taak('z4.json', '2026-12-03', ['Lotte'])]);
  assert.match(dubbel[0].tekst, /Lotte krijgt allebei/);
  assert.deepStrictEqual(tc.versies('b4.json', t, lijst, [taak('b4.json', '2026-12-03', ['Lotte']), taak('z4.json', '2026-12-03', ['Mats'])]), []);
  // Een toets zonder 6+-reeks (werkwoordenblok): niets. Een 6-toets in een reeks met 6+ maar zonder tegenhanger: wel.
  assert.deepStrictEqual(tc.versies('ww.json', t, lijst, []), []);
  assert.match(tc.versies('b4m.json', t, lijst, [])[0].tekst, /Geen 6\+-versie/);
  assert.deepStrictEqual(tc.versies('z4o.json', t, lijst, []), []);
});

test('connector: toets_controleren geeft de nieuwe bevindingen en andere_versies', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'controle-c-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'b4.json'), JSON.stringify({ titel: 'Toets getallenkennis - Blok 4', vragen: [{ type: 'kort', vraag: 'Welke rivier?', antwoord: 'de Schelde' }] }));
  fs.writeFileSync(path.join(A, 'proeven', 'z4.json'), JSON.stringify({ titel: '6+ · Rekenen blok 4 · Toets getallenkennis', vragen: [{ type: 'kort', vraag: '1+1?', antwoord: '2' }] }));
  const out = execFileSync(process.execPath, ['-e', `
    (async () => {
      const connector = require('./src/connector');
      const r = await connector.rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'toets_controleren', arguments: { file: 'b4.json' } } }, { sleutel: { naam: 'Claude' }, schrijven: false });
      process.stdout.write('\\n@@' + JSON.stringify(r.result.structuredContent || r.result));
      process.exit(0);
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: A, LANCELOT_CONNECTOR_POORT: '0' }, encoding: 'utf8' });
  const r = JSON.parse(out.split('\n@@').pop());
  assert.deepStrictEqual(r.andere_versies.map(v => v.file), ['z4.json']);
  assert.ok(r.bevindingen.some(b => b.soort === 'antwoorden' && b.voorstel.includes('Schelde')));
  assert.strictEqual(r.in_orde, true);
});
