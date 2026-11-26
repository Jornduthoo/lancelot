// Mijn methodes: een html-presentatie (docs/presentaties-html.md). Ze draait afgeschermd: sandbox, enkel de
// dia-speler van LANcelot mag scripts draaien, niets kan versturen of doorsturen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const metData = code => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'presentaties-'));
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const kronieken = require('./src/kronieken');
    const uit = (() => { ${code} })();
    process.stdout.write('\\n@@' + JSON.stringify(uit));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
};

test('een .html-presentatie mag in Mijn methodes en gaat mee via Mijn lesmap', () => {
  const r = metData(`
    const html = require('fs').readFileSync('docs/voorbeeld-presentatie.html');
    const b = kronieken.bewaar('Rekenen/Blok 2', 'Breuken.html', html);
    let fout = '';
    try { kronieken.bewaar('Rekenen', 'nep.html', Buffer.from([0, 1, 2, 3, 0, 5])); } catch (e) { fout = e.message; }
    return { b, fout, lijst: kronieken.lijst().bestanden, sync: [kronieken.syncNaam('Rekenen/Blok 2/Breuken.html'), kronieken.syncNaam('Rekenen/x.htm'), kronieken.syncNaam('Rekenen/x.exe')] };
  `);
  assert.deepEqual(r.b, { map: 'Rekenen/Blok 2', naam: 'Breuken.html' });
  assert.match(r.fout, /geen geldige presentatie/);
  assert.equal(r.lijst.find(x => x.naam === 'Breuken.html').soort, 'html');
  assert.deepEqual(r.sync, [true, true, false]);
});

test('de presentatie draait afgeschermd met enkel de dia-speler', () => {
  const kronieken = require('../src/kronieken');
  const { tekst, csp } = kronieken.presentatie('<html><head><meta http-equiv="refresh" content="0;url=/host"></head><body><section class="dia"><p class="stap">a</p></section><script>alert(1)</script></body></html>');
  assert.match(csp, /^sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox;/);
  assert.doesNotMatch(csp, /allow-same-origin|allow-forms|allow-top-navigation/);
  for (const regel of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "object-src 'none'"]) assert.ok(csp.includes(regel), regel);
  const nonce = /script-src 'nonce-([^']+)'/.exec(csp)[1];
  assert.ok(tekst.includes(`<script nonce="${nonce}">`), 'de speler krijgt de nonce');
  assert.ok(tekst.indexOf('<script nonce') > tekst.indexOf('</section>'), 'de speler staat na de dia\'s');
  assert.doesNotMatch(tekst, /http-equiv/i, 'meta http-equiv is weg');
  assert.ok(kronieken.presentatie('x').csp !== csp, 'elke keer een nieuwe nonce');
  // Het iframe in de lezer heeft dezelfde afscherming.
  const pagina = fs.readFileSync(path.join(ROOT, 'public/kronieken.html'), 'utf8');
  assert.match(pagina, new RegExp(`<iframe id="kr-html"[^>]*sandbox="${kronieken.SANDBOX}"`));
});

test('de lettertypes van LANcelot (Barlow, Questrial, Mali) staan in elke presentatie, van het eigen adres', () => {
  const kronieken = require('../src/kronieken');
  const { tekst, csp } = kronieken.presentatie('<html><head><title>x</title></head><body><section class="dia" style="font-family:Mali">a</section></body></html>', '192.168.1.109:3000');
  for (const f of ['Barlow', 'Questrial', 'Mali']) assert.ok(tekst.includes(`font-family:'${f}'`), f);
  assert.match(tekst, /<head><style>@font-face\{[^<]*url\('http:\/\/192\.168\.1\.109:3000\/fonts\/mali-latin-400-normal\.woff2'\)/);
  assert.match(csp, /font-src data: https: 'self' http:\/\/192\.168\.1\.109:3000;/);
  for (const [, b] of tekst.matchAll(/\/fonts\/([\w-]+\.woff2)/g)) assert.ok(fs.existsSync(path.join(ROOT, 'public', 'fonts', b)), b);
  // Een rare host komt nooit in de regels of de html.
  const raar = kronieken.presentatie('<body></body>', 'x"; script-src *');
  assert.doesNotMatch(raar.csp, /script-src \*/);
  assert.match(raar.tekst, /url\('\/fonts\//);
});
