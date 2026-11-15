// In Beeld, de website (website/site/inbeeld): up-to-date met de kaartenbank en leesbaar voor LANcelot.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'website', 'site', 'inbeeld');

test('In Beeld-site: data/kaarten.js is up-to-date met de kaartenbank (node website/inbeeld/bouw.js)', () => {
  const { lees } = require('../website/inbeeld/bouw.js');
  const bron = lees();
  const tekst = fs.readFileSync(path.join(SITE, 'data', 'kaarten.js'), 'utf8');
  const site = JSON.parse(tekst.slice(tekst.indexOf('=') + 1).replace(/;\s*$/, ''));
  assert.equal(site.length, bron.length);
  assert.deepEqual(site.map(k => k.n), bron.map(k => k.n));
  for (const k of site) if (k.b) assert.ok(fs.existsSync(path.join(SITE, 'api', 'beelden', `${k.n}.webp`)), `beeld ${k.n}`);
});

test('In Beeld-site: elke set in api/ is geldig voor LANcelot', () => {
  const ib = require('../src/inbeeld');
  const index = JSON.parse(fs.readFileSync(path.join(SITE, 'api', 'index.json'), 'utf8'));
  assert.ok(index.sets.length >= 9);
  for (const s of index.sets) {
    const set = JSON.parse(fs.readFileSync(path.join(SITE, 'api', 'sets', `${s.id}.json`), 'utf8'));
    assert.equal(set.kaarten.length, s.aantal, s.id);
    for (const k of set.kaarten) {
      assert.ok(ib.schoonKaart(k), `${s.id}: ${k.nr}`);
      if (k.beeld) assert.ok(fs.existsSync(path.join(SITE, 'api', k.beeld)), k.beeld);
    }
  }
});

test('In Beeld-site: de Worker vangt enkel het terugmelden op', () => {
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8');
  assert.match(cfg, /"run_worker_first":\s*\["\/inbeeld\/api\/aangebracht"\]/);
  const w = fs.readFileSync(path.join(__dirname, '..', 'website', 'worker.js'), 'utf8');
  assert.match(w, /env\.ASSETS\.fetch\(req\)/);
  assert.match(w, /p_kaart: kaart, p_leerjaar: leerjaar/);
});
