// Vanzelf bijwerken (src/bijwerken.js startAuto): een klaargezette update wordt alleen geïnstalleerd op een rustig moment,
// en maar één keer. Wat "rustig" is (geen leerlingen, geen spel, niemand aan het bord) staat in server.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, '_update');
const KLAAR = path.join(DIR, 'klaar.zip');

test('een klaargezette update wacht tot het rustig is en start dan één keer opnieuw', { skip: fs.existsSync(KLAAR) && 'er staat een echte update klaar' }, async () => {
  process.env.LANCELOT_AUTO_BIJWERKEN = '1';
  const bijwerken = require('../src/bijwerken');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(KLAAR, 'test');
  let rustig = false;
  let herstart = 0;
  let gevraagd = 0;
  try {
    bijwerken.startAuto({ rustig: () => { gevraagd++; return rustig; }, herstart: () => { herstart++; }, opties: { eerste: 60000, zoekElke: 60000, kijkElke: 20 } });
    await new Promise(r => setTimeout(r, 150));
    assert.ok(gevraagd > 2, 'kijkt geregeld of het rustig is');
    assert.equal(herstart, 0, 'nooit opnieuw starten terwijl er een les loopt');
    rustig = true;
    await new Promise(r => setTimeout(r, 150));
    assert.equal(herstart, 1, 'op een rustig moment precies één keer opnieuw starten');
  } finally {
    bijwerken.stopAuto();
    fs.rmSync(KLAAR, { force: true });
    try { fs.rmdirSync(DIR); } catch { /* er staat nog iets in */ }
    delete process.env.LANCELOT_AUTO_BIJWERKEN;
  }
});

test('vanzelf bijwerken staat uit in een map met git (wie aan de code werkt) en in de Store-versie', () => {
  const bijwerken = require('../src/bijwerken');
  if (fs.existsSync(path.join(ROOT, '.git'))) assert.equal(bijwerken.autoAan(), false);
  assert.match(fs.readFileSync(path.join(ROOT, 'src', 'bijwerken.js'), 'utf8'), /store\.ACTIEF \|\| settings\.read\(\)\.autoBijwerken === false/);
});

test('server.js installeert alleen als er geen leerlingen, geen spel en niemand aan het bord is', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const rustig = src.slice(src.indexOf('function lesBezig()'), src.indexOf('async function herstartVoorUpdate'));
  assert.match(rustig, /!s\.data\.host && !isLocal/, 'een verbonden leerling houdt de update tegen');
  assert.match(rustig, /spel\.phase === 'idle'/, 'een spel met spelers houdt de update tegen');
  assert.match(rustig, /laatsteInvoer/, 'iemand aan het bord houdt de update tegen');
  // Na de herstart opent er geen nieuw venster: de open schermen laden zichzelf opnieuw.
  assert.match(src, /if \(bijwerken\.wasStil\(\)\) return;/);
  assert.match(fs.readFileSync(path.join(ROOT, 'public', 'js', 'ui.js'), 'utf8'), /socket\.emit\('in-gebruik'/);
});

test('de LANcelot-knop houdt geen afbeelding open (anders kan een update public\\img niet vervangen)', () => {
  const ps = fs.readFileSync(path.join(ROOT, 'src', 'systeemvak.ps1'), 'utf8');
  assert.doesNotMatch(ps, /FromFile|Icon \(Join-Path/, 'laad afbeeldingen via Lees-Stroom (geheugen)');
  // En lukt verplaatsen toch niet (welke foutcode ook), dan kopieert pasToe de bestanden er één voor één over.
  assert.match(fs.readFileSync(path.join(ROOT, 'src', 'bijwerken.js'), 'utf8'), /kopieerOver\(src, dst\)/);
});

test('een fout 504 van GitHub: nog eens proberen, en zeggen dat LANcelot het vanzelf opnieuw probeert', async () => {
  const bijwerken = require('../src/bijwerken');
  const echt = global.fetch;
  const echtTimeout = global.setTimeout;
  let n = 0;
  global.setTimeout = (f, ms, ...a) => echtTimeout(f, Math.min(ms, 5), ...a);
  try {
    global.fetch = async () => { n++; return n < 3 ? new Response('', { status: 504 }) : new Response(JSON.stringify({ sha: 'a'.repeat(40), commit: { message: 'x', committer: { date: '2026-11-24' } } }), { status: 200 }); };
    let v = await bijwerken.zoek();
    assert.equal(n, 3, 'twee keer opnieuw geprobeerd');
    assert.equal(v.fout, '');
    assert.equal(v.nieuwste.sha, 'a'.repeat(40));
    n = 0;
    global.fetch = async () => { n++; return new Response('', { status: 504 }); };
    v = await bijwerken.zoek();
    assert.equal(n, 3);
    assert.match(v.fout, /fout 504\)\. (LANcelot probeert het vanzelf opnieuw|Probeer het later opnieuw)\./);
  } finally {
    global.fetch = echt;
    global.setTimeout = echtTimeout;
  }
});
