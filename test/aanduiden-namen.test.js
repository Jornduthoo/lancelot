// Aanduiden met namen: de leerling zet elke naam (bv. een provincie) op de juiste plek van een afbeelding.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');
const sheets = require('../src/oefenbladen');

const BEELD = 'data:image/png;base64,iVBORw0KGgo=';
const vraag = {
  type: 'aanduiden', vraag: 'Zet de steden op de kaart.', beeld: BEELD, verhouding: 1,
  zones: [{ x: 20, y: 20, r: 5, naam: 'Gent' }, { x: 80, y: 30, r: 5, naam: 'Antwerpen' }, { x: 50, y: 80, r: 5, naam: 'Rivier' }, { x: 60, y: 60, r: 5, naam: 'Rivier' }],
};

test('met namen: één punt per naam, de namen alfabetisch voor de leerling', () => {
  const q = K.validate({ title: 't', vragen: [vraag] }).vragen[0];
  assert.equal(q.punten, 4);
  const v = K.viewOf(q, '0');
  assert.deepEqual(v.namen.map(x => x.t), ['Antwerpen', 'Gent', 'Rivier', 'Rivier']);
  assert.ok(!('zones' in v), 'de leerling ziet de plekken niet');
  // Gent goed, Antwerpen fout, beide rivieren goed (ook omgewisseld), want ze heten hetzelfde.
  const a = K.schoon(q, [{ x: 21, y: 19 }, { x: 10, y: 90 }, { x: 60, y: 61 }, { x: 50, y: 79 }]);
  assert.equal(K.auto(q, a), 3);
  assert.equal(K.auto(q, K.schoon(q, [null, null, null, null])), 0);
  assert.deepEqual(K.problemen({ title: 't', vragen: [q] }), []);
});

test('zonder namen blijft het één plek aantikken', () => {
  const q = K.validate({ title: 't', vragen: [{ ...vraag, zones: [{ x: 20, y: 20, r: 5 }] }] }).vragen[0];
  assert.equal(q.punten, 1);
  assert.equal(K.viewOf(q, '0').namen, undefined);
  assert.equal(K.auto(q, K.schoon(q, { x: 21, y: 21 })), 1);
  assert.equal(K.auto(q, K.schoon(q, { x: 70, y: 21 })), 0);
});

test('een plek zonder naam tussen plekken met naam wordt gemeld', () => {
  const q = K.validate({ title: 't', vragen: [{ ...vraag, zones: [{ x: 20, y: 20, r: 5, naam: 'Gent' }, { x: 50, y: 50, r: 5 }] }] }).vragen[0];
  assert.match(K.problemen({ title: 't', vragen: [q] }).join(), /geef elke plek een naam/);
});

test('op een oefenblad: alles goed telt als juist, de sleutel zijn de plekken', () => {
  const sheet = sheets.validate({ title: 'Kaart', blocks: [{ type: 'vraag', q: vraag }] });
  const sh = sheets.shufflesFor(sheet, 'x');
  const sol = sheets.solutions(sheet, sh);
  assert.equal(sol['0.0'].length, 4);
  assert.equal(sol['0.0'][0].naam, 'Gent');
});
