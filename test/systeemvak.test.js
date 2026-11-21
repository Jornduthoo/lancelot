// Start LANcelot.bat start LANcelot zonder zwart venster, met het schild naast de klok (src/systeemvak.*).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { opdracht } = require('../src/systeemvak');

const ROOT = path.join(__dirname, '..');
const bat = fs.readFileSync(path.join(ROOT, 'Start LANcelot.bat'), 'utf8');
const ps1 = fs.readFileSync(path.join(ROOT, 'src', 'systeemvak.ps1'), 'utf8');

test('Start LANcelot.bat probeert eerst het schild en valt anders terug op het venster', () => {
  const schild = bat.indexOf('node src\\systeemvak.js');
  const venster = bat.lastIndexOf('node server.js');
  assert.ok(schild > 0 && venster > schild);
  assert.match(bat, /if not defined LANCELOT_VENSTER/);
  assert.match(bat, /if not errorlevel 1 exit \/b 0/);
});

test('het schild gebruikt het LANcelot-icoon en past op de opdrachtregel van Windows', () => {
  assert.ok(ps1.includes("public\\img\\systeemvak.ico"));
  assert.ok(fs.existsSync(path.join(ROOT, 'public', 'img', 'systeemvak.ico')));
  assert.ok(opdracht().join(' ').length < 30000);
  assert.ok(ps1.includes('LANCELOT_KLAAR'));
});

test('de teksten van de LANcelot-knop bestaan in vijf talen', () => {
  for (const taal of ['nl', 'en', 'fr', 'de', 'es']) assert.match(ps1, new RegExp(`\\n  ${taal} = @\\{ zin = `));
  assert.ok(fs.existsSync(path.join(ROOT, 'public', 'img', 'icon-192.png')));
});

test('na een update start de knop alles opnieuw, oude knoppen houden het oude gedrag', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.match(server, /if \(process\.env\.LANCELOT_KAN_HERSTARTEN\) process\.exit\(75\)/);
  assert.ok(ps1.includes("EnvironmentVariables['LANCELOT_KAN_HERSTARTEN']"));
  assert.ok(ps1.includes('$code -eq 75'));
});
