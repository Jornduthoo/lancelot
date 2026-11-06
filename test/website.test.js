// De website (website/site) staat in vijf talen en is gebouwd uit website/bron. Zie website/README.md.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BRON = path.join(__dirname, '..', 'website', 'bron');
const SITE = path.join(__dirname, '..', 'website', 'site');
const TALEN = ['nl', 'en', 'fr', 'es', 'de'];

function sleutels(o, pre = '') {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? [`${pre}${k}`, ...sleutels(v, `${pre}${k}.`)] : [`${pre}${k}`])).sort();
}

test('website: elke taal heeft dezelfde teksten als het Nederlands', () => {
  const nl = sleutels(JSON.parse(fs.readFileSync(path.join(BRON, 'teksten', 'nl.json'), 'utf8')));
  for (const t of TALEN) {
    const andere = sleutels(JSON.parse(fs.readFileSync(path.join(BRON, 'teksten', `${t}.json`), 'utf8')));
    assert.deepStrictEqual(andere, nl, `website/bron/teksten/${t}.json mist of heeft extra teksten`);
  }
});

test('website: elke taal heeft een pagina met zijn schermafbeeldingen', () => {
  for (const t of TALEN) {
    const html = fs.readFileSync(path.join(SITE, t === 'nl' ? 'index.html' : `${t}/index.html`), 'utf8');
    assert.match(html, new RegExp(`<html lang="${t}">`));
    for (const m of html.matchAll(/(?:src|href)="((?:\.\.\/)?(?:img|shots|fonts)\/[^"?]+)(?:\?v=\w+)?"/g)) {
      const bestand = path.join(t === 'nl' ? SITE : path.join(SITE, t), m[1]);
      assert.ok(fs.existsSync(bestand), `${t}: ${m[1]} ontbreekt`);
    }
  }
});

test('website: is up-to-date met de bron (node website/bron/bouw.js)', () => {
  // Vergelijkt de spellen die op de site staan met de app.
  const { spellen } = require('../website/bron/bouw.js');
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  for (const g of spellen().groepen) for (const s of g.spellen) {
    assert.ok(html.includes(`img/spellen/${s.icoon}`), `Spel ${s.naam} staat niet op de website: bouw ze opnieuw met node website/bron/bouw.js`);
  }
});

test('website: noemt geen bestaande spellen of merken', () => {
  // LANcelot wordt niet gratis (Jorn, 2026-11-04).
  const verboden = /\bgratis\b|\bfree\b|gratuit|kostenlos|kahoot|gimkit|mentimeter|quizizz|galaga|pac-?man|pac-knight|gauntlet|bomberman|bomber-knight|fortnite|mario/i;
  for (const t of TALEN) {
    const html = fs.readFileSync(path.join(SITE, t === 'nl' ? 'index.html' : `${t}/index.html`), 'utf8');
    const m = html.match(verboden);
    assert.ok(!m, `${t}: "${m && m[0]}" hoort niet op de website`);
  }
});

test('website: elk spel heeft een eigen pagina in elke taal, met extra info', () => {
  const { spellen } = require('../website/bron/bouw.js');
  const info = JSON.parse(fs.readFileSync(path.join(BRON, 'spellen.json'), 'utf8'));
  const verboden = /\bgratis\b|\bfree\b|gratuit|kostenlos|galaga|pac-?man|gauntlet|bomberman/i;
  for (const g of spellen().groepen) for (const s of g.spellen) {
    assert.ok(info[s.id], `Spel ${s.naam} mist extra info in website/bron/spellen.json`);
    for (const t of TALEN) {
      assert.ok(info[s.id].juist[t], `${s.id}: 'juist' mist in het ${t} (website/bron/spellen.json)`);
      const f = path.join(SITE, t === 'nl' ? '' : t, 'spellen', `${s.id}.html`);
      assert.ok(fs.existsSync(f), `${t}: pagina voor ${s.naam} ontbreekt: node website/bron/bouw.js`);
      const html = fs.readFileSync(f, 'utf8');
      assert.ok(!verboden.test(html), `${t}/${s.id}: verboden woord`);
      for (const m of html.matchAll(/(?:src|href)="((?:\.\.\/)+(?:img|beelden|fonts)\/[^"?]+)(?:\?v=\w+)?"/g)) {
        assert.ok(fs.existsSync(path.join(path.dirname(f), m[1])), `${t}/${s.id}: ${m[1]} ontbreekt`);
      }
    }
  }
});
