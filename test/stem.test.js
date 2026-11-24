// Voorlezen: welke stem elke leerling hoort (src/stem.js), voor het icoontje in het live overzicht.
const test = require('node:test');
const assert = require('node:assert');
const stem = require('../src/stem');

test('stem: een leerling meldt zijn stem, alleen een verandering telt, na 8 uur is het weg', () => {
  stem.wisStanden();
  assert.strictEqual(stem.zetStand({ naam: ' Mila ', stand: 'geen' }, 1000), true);
  assert.strictEqual(stem.zetStand({ naam: 'mila', stand: 'geen' }, 2000), false);
  assert.strictEqual(stem.zetStand({ naam: 'Noor', stand: 'iets' }), false, 'onbekende stand');
  assert.strictEqual(stem.zetStand({ naam: '', stand: 'geen' }), false);
  assert.deepStrictEqual(stem.standenView(3000).leerlingen, { mila: 'geen' });
  assert.deepStrictEqual(stem.standenView(2000 + 8 * 3600 * 1000 + 1).leerlingen, {});
});
