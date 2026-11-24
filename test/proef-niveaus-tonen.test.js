// De niveaus van een toets zijn zichtbaar voor de leerkracht (wens 24 nov), ook als de toets ze in een andere vorm bewaart.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern.js');

const mk = (v, extra = {}) => ({ type: 'meerkeuze', vraag: v, opties: ['a', 'b'], juist: 0, ...extra });

test('niveaus in andere vormen worden herkend', () => {
  const vormen = [
    { title: 'x', vragen: [mk('s'), mk('p', { niveau: 'Page' }), mk('r', { niveau: 'ridder' })] },
    { title: 'x', niveaus: { Schildknaap: [mk('s')], Page: [mk('p')], Ridder: [mk('r')] } },
    { title: 'x', versies: [{ niveau: 'Schildknaap', vragen: [mk('s')] }, { niveau: 'Page', vragen: [mk('p')] }, { niveau: 'Ridder', vragen: [mk('r')] }] },
    { title: 'x', vragen: [mk('s')], Page: [mk('p')], Ridder: [mk('r')] },
  ];
  for (const v of vormen) {
    const t = K.validate(v);
    assert.deepStrictEqual(K.niveausVan(t), ['page', 'schildknaap', 'ridder']);
    assert.deepStrictEqual(['page', 'schildknaap', 'ridder'].map(n => K.lijstVoor(t, n)[0].vraag), ['p', 's', 'r']);
  }
});

test('een gewone toets blijft precies zoals hij was', () => {
  const gewoon = { title: 'x', vragen: [mk('s')], page: [mk('p')] };
  const t = K.validate(gewoon);
  assert.deepStrictEqual(K.niveausVan(t), ['page', 'schildknaap']);
  assert.equal(K.totaal(t.vragen), K.totaal(K.validate({ title: 'x', vragen: [mk('s')] }).vragen));
  assert.deepStrictEqual(K.niveausVan(K.validate({ title: 'x', vragen: [mk('s'), mk('t')] })), ['schildknaap']);
});
