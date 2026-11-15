// De schoolinstaller (installer/maak-installer.js + lancelot.nsi): volledige versie, en nooit iets van de klas aanraken.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { verwijderLijst, MEE } = require('../installer/maak-installer');
const gegevens = require('../src/gegevens');

const ROOT = path.join(__dirname, '..');
const NSI = fs.readFileSync(path.join(ROOT, 'installer', 'lancelot.nsi'), 'utf8');

test('de installer neemt alles van de app mee, en geen Store-modus', () => {
  for (const m of MEE) assert.ok(fs.existsSync(path.join(ROOT, m)), `${m} bestaat niet meer`);
  assert.ok(MEE.includes('Start LANcelot.bat'));
  assert.ok(!MEE.some(m => /store\.json|website|test/.test(m)));
  assert.ok(!/store\.json/.test(NSI));
});

test('installeren per gebruiker, zonder beheerdersrechten, met de gegevens apart', () => {
  assert.match(NSI, /RequestExecutionLevel user/);
  assert.match(NSI, /InstallDir "\$LOCALAPPDATA\\Programs\\LANcelot"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'installer', 'installatie.json')));
  // De installer schrijft nooit in de gegevensmap.
  assert.ok(!/SetOutPath "\$LOCALAPPDATA\\LANcelot/.test(NSI));
  assert.ok(!/RMDir[^\n]*\$LOCALAPPDATA\\LANcelot/.test(NSI));
});

test('opnieuw installeren wist alleen mappen van de app', () => {
  const weg = [...NSI.matchAll(/RMDir \/r "\$INSTDIR\\([^"]+)"/g)].map(m => m[1]);
  assert.ok(weg.length);
  for (const w of weg) assert.ok(!gegevens.ITEMS.includes(w), `${w} is van de klas`);
});

test('verwijderen met gegevens in de app-map laat de klas staan', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-inst-'));
  for (const d of ['public', 'src', 'node', 'quizzes', 'oefenbladen', 'rondetafel']) fs.mkdirSync(path.join(dir, d));
  for (const f of ['server.js', 'installatie.json']) fs.writeFileSync(path.join(dir, f), '');
  const lijst = verwijderLijst(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  const namen = [...lijst.matchAll(/\$INSTDIR\\([^"]+)"/g)].map(m => m[1]);
  assert.ok(namen.includes('public') && namen.includes('server.js'));
  for (const n of namen) assert.ok(!gegevens.ITEMS.includes(n), `${n} is van de klas`);
});
