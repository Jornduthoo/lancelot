// Eigen vakken per school (verbeterpunten 20 nov, 8): toevoegen, hernoemen, verbergen; vaste vakken blijven bestaan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('eigen vakken: toevoegen, hernoemen, verbergen, en een verborgen vak volgt Algemeen', () => {
  process.env.LANCELOT_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vakken-'));
  const niveaus = require('../src/niveaus');
  assert.deepStrictEqual(niveaus.VAKGROEPEN.map(g => g.id), ['wiskunde', 'nederlands', 'frans', 'wo']);
  let alle = niveaus.nieuw('Engels');
  assert.ok(alle.some(g => g.id === 'engels' && g.vakken[0] === 'Engels'));
  assert.strictEqual(niveaus.groep('Engels'), 'engels');
  // Hernoemen en verbergen; een vast vak weglaten kan niet (het komt terug).
  alle = niveaus.bewaar(alle.filter(g => g.id !== 'wiskunde').map(g => (g.id === 'wo' ? { ...g, naam: 'Mens en maatschappij' } : g.id === 'frans' ? { ...g, uit: true } : g)));
  assert.ok(alle.some(g => g.id === 'wiskunde'));
  assert.strictEqual(alle.find(g => g.id === 'wo').naam, 'Mens en maatschappij');
  assert.strictEqual(niveaus.groep('Frans'), '');
  assert.ok(!niveaus.VAKGROEPEN.some(g => g.id === 'frans'));
  assert.throws(() => niveaus.nieuw('  '));
  // Niveaus in een verborgen vak blijven bewaard; een hele kolom in één keer.
  const klas = require('../src/klas');
  klas.write({ naam: '6A', leerjaar: 6, namen: ['An', 'Bo', 'Cas'] });
  const ids = klas.read().leerlingen.map(l => l.id);
  let d = klas.setNiveaus([{ id: ids[0], niveau: 'page', vak: 'frans' }, ...ids.map(id => ({ id, niveau: 'ridder', vak: 'engels' })), { id: ids[1], niveau: 'niet', vak: 'wiskunde' }]);
  assert.strictEqual(d.leerlingen[0].vakNiveaus.frans, 'page');
  assert.ok(d.leerlingen.every(l => l.vakNiveaus.engels === 'ridder'));
  assert.deepStrictEqual(d.leerlingen[1].nietVakken, ['wiskunde']);
});

test('vakken op twee pc\'s tegelijk aangepast: samenvoegen, niets gaat verloren', () => {
  const niveaus = require('../src/niveaus');
  const std = niveaus.STANDAARD;
  const bord = JSON.stringify({ groepen: [...std, { id: 'muzo', naam: 'Muzo', vakken: ['Muzo'] }], gewijzigd: '2026-11-20T10:00:00.000Z' });
  const thuis = JSON.stringify({ groepen: [...std.map(g => (g.id === 'wo' ? { ...g, naam: 'Mens en maatschappij' } : g)), { id: 'godsdienst', naam: 'Godsdienst', vakken: ['Godsdienst'] }], gewijzigd: '2026-11-20T10:00:02.000Z' });
  for (const uit of [niveaus.samen(bord, thuis), niveaus.samen(thuis, bord)]) {
    const d = JSON.parse(uit);
    niveaus.geldig(d);
    assert.deepStrictEqual(d.groepen.map(g => g.id), ['wiskunde', 'nederlands', 'frans', 'wo', 'godsdienst', 'muzo']);
    // De laatst bewaarde lijst wint bij hetzelfde vak (de nieuwe naam blijft).
    assert.strictEqual(d.groepen.find(g => g.id === 'wo').naam, 'Mens en maatschappij');
    assert.strictEqual(d.gewijzigd, '2026-11-20T10:00:02.000Z');
  }
});
