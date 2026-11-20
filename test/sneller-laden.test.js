// Sneller laden (2026-11-20): Mijn lesmap leest een bestand alleen opnieuw als het veranderde, en de lijst van toetsen
// leest niet elke keer elke toets (met afbeeldingen) opnieuw. Een wijziging moet wel altijd meekomen, ook bij dezelfde grootte.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('Mijn lesmap: onveranderde bestanden niet opnieuw lezen, een wijziging (even groot) wel overnemen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sneller-laden-'));
  const data = path.join(tmp, 'bord'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path');
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
    settings.write({ lesmap: ${JSON.stringify(map)} });
    lesmap.init([{ kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate }]);
    const T = titel => ({ title: titel, vragen: [{ type: 'kort', vraag: 'Hoofdstad van België?', antwoord: 'Brussel' }] });
    const oud = (file, s) => { const t = new Date(Date.now() - s * 1000); fs.utimesSync(file, t, t); };
    let reads = 0;
    const echt = fs.promises.readFile;
    fs.promises.readFile = (f, ...a) => { if (!String(f).endsWith('_mappen.json')) reads++; return echt(f, ...a); };
    (async () => {
      for (const n of ['aaaa', 'bbbb', 'cccc']) proeven.save(T(n), n + '.json');
      await lesmap.sync();
      const remote = path.join(${JSON.stringify(map)}, 'toetsen');
      for (const d of [proeven.DIR, remote]) for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) oud(path.join(d, f), 60);
      await lesmap.sync();
      reads = 0;
      await lesmap.sync();
      const rust = reads;
      const titels1 = proeven.list().map(x => x.title);
      // Thuis aangepast: even groot, ander tijdstip (ook al een tijdje geleden).
      fs.writeFileSync(path.join(remote, 'bbbb.json'), JSON.stringify(T('zzzz')) + '\\n');
      oud(path.join(remote, 'bbbb.json'), 30);
      await lesmap.sync();
      const titels2 = proeven.list().map(x => x.title);
      // Op deze pc aangepast, even groot: gaat naar de lesmap.
      proeven.save(T('yyyy'), 'cccc.json');
      oud(path.join(proeven.DIR, 'cccc.json'), 20);
      await lesmap.sync();
      const thuis = JSON.parse(fs.readFileSync(path.join(remote, 'cccc.json'), 'utf8')).title;
      process.stdout.write('\\n@@' + JSON.stringify({ rust, titels1, titels2, thuis, titels3: proeven.list().map(x => x.title), error: lesmap.view().error }));
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  assert.strictEqual(out.error, '');
  assert.strictEqual(out.rust, 0, 'niets veranderd: geen enkel bestand opnieuw gelezen');
  assert.deepStrictEqual(out.titels1, ['aaaa', 'bbbb', 'cccc']);
  assert.deepStrictEqual(out.titels2, ['aaaa', 'cccc', 'zzzz'], 'de wijziging uit de lesmap staat in de lijst');
  assert.strictEqual(out.thuis, 'yyyy');
  assert.deepStrictEqual(out.titels3, ['aaaa', 'yyyy', 'zzzz']);
});
