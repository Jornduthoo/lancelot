// Taken sneller (26 nov): de vakken worden hooguit eens per seconde opnieuw van schijf bekeken (de lijst van taken
// vraagt ze per leerling op). Wat je zelf bewaart, telt meteen; een wijziging van buitenaf (Mijn lesmap) binnen de seconde.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('vakken: eigen wijziging meteen, wijziging van buitenaf binnen de seconde', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-sneller-'));
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path');
    const niveaus = require('./src/niveaus');
    const voor = niveaus.groep('Muziek');
    niveaus.nieuw('Muziek');
    const meteen = niveaus.groep('Muziek');
    // Van buitenaf (zoals Mijn lesmap): het vak verbergen.
    const file = path.join(niveaus.DIR(), 'vakken.json');
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    d.groepen.find(g => g.naam === 'Muziek').uit = true;
    fs.writeFileSync(file, JSON.stringify(d));
    const t = new Date(Date.now() + 5000); fs.utimesSync(file, t, t);
    const kort = niveaus.groep('Muziek');
    setTimeout(() => process.stdout.write('\\n@@' + JSON.stringify({ voor, meteen, kort, later: niveaus.groep('Muziek') })), 1100);
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: tmp }, encoding: 'utf8' }).split('\n@@').pop());
  assert.strictEqual(out.voor, '');
  assert.strictEqual(out.meteen, 'muziek', 'zelf bewaard: meteen zichtbaar');
  assert.strictEqual(out.kort, 'muziek', 'binnen de seconde nog de vorige lijst');
  assert.strictEqual(out.later, '', 'na een seconde: de wijziging van buitenaf telt');
});

test('de pagina Taken tekent de namen pas bij openklappen en de kiezer pas bij openen', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'js', 'tk-host.js'), 'utf8');
  assert.match(js, /if \(!k\.classList\.contains\('ingeklapt'\)\) vulNamen\(\);/);
  assert.match(js, /mountKiezer\(tk\.soort\);/);
  assert.match(js, /function kaartVan\(t, vorige\)/);
});
