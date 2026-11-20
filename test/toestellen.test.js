// Dezelfde stand op elke pc (wensenlijst 20 nov, punt 2): de regel "Bijgewerkt van …" alleen bij meer dan één toestel.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('toestellen: geen regel met één pc, wel met twee, rood als een pc met leerlingen bezig stilvalt', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toestellen-'));
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'toestellen-map-'));
  const out = execFileSync(process.execPath, ['-e', `
    const settings = require('./src/settings'), t = require('./src/toestellen'), fs = require('fs'), path = require('path');
    const view = { lesmap: ${JSON.stringify(map)}, at: Date.now(), error: '' };
    const zonder = t.stand(new Map(), { lesmap: '' });
    settings.write({ lesmap: ${JSON.stringify(map)} });
    t.zetNaam('  Digibord <b> ');
    const alleen = t.stand(new Map(), view);
    fs.writeFileSync(path.join(t.DIR(), 'NucPC.json'), JSON.stringify({ id: 'NucPC', naam: 'Thuis', tijd: new Date(Date.now() - 600000).toISOString() }));
    const twee = (b => new Promise(r => setTimeout(() => r(b()), 5100)))(() => ({
      rustig: t.stand(new Map(), view),
      rood: t.stand(new Map([['x', [{ id: 'x', pc: 'NucPC', werk: { bo: { naam: 'Bo', status: 'bezig' } } }]]]), view),
      naam: t.naamVan('NucPC'),
    }));
    twee.then(r => process.stdout.write('\\n@@' + JSON.stringify({ zonder, alleen, ...r })));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_PC: 'Bord1' }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.strictEqual(o.zonder.toon, false, 'zonder lesmap: geen regel');
  assert.strictEqual(o.alleen.toon, false, 'één pc: geen regel');
  assert.strictEqual(o.alleen.dit.naam, 'Digibord b', 'de naam wordt opgekuist');
  assert.strictEqual(o.rustig.toon, true);
  assert.deepStrictEqual(o.rustig.anderen.map(a => [a.naam, a.stil]), [['Thuis', false]], 'een pc die stil is zonder leerlingen: niet rood');
  assert.strictEqual(o.rood.anderen[0].stil, true);
  assert.strictEqual(o.rood.anderen[0].bezig, 1);
  assert.strictEqual(o.naam, 'Thuis');
});
