// De Proef: zo eenvoudig mogelijk, vakjes samen op punten en het rekenrooster.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');

const beeld = 'data:image/webp;base64,AAAA';
const blad = velden => K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden }] }).vragen[0];

test('zo eenvoudig mogelijk: 6/8 en 7/4 zijn fout, 3/4 en 1 3/4 juist', () => {
  assert.equal(K.vereenvoudigd('3/4'), true);
  assert.equal(K.vereenvoudigd('6/8'), false);
  assert.equal(K.vereenvoudigd('4/2'), false);
  assert.equal(K.vereenvoudigd('0,75'), true);
  assert.equal(K.vereenvoudigd('7/4', '1 3/4'), false);
  assert.equal(K.vereenvoudigd('1 3/4', '1 3/4'), true);
  assert.equal(K.vereenvoudigd('7/4', '7/4'), true);
  const q = blad([
    { x: 1, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '3/4', vereenvoudigd: true },
    { x: 1, y: 10, w: 10, h: 5, soort: 'breuk', antwoord: '1 3/4', geheel: true, vereenvoudigd: true },
    { x: 1, y: 20, w: 10, h: 3, soort: 'tekst', antwoord: '3/4' },
  ]);
  assert.equal(q.velden[0].vereenvoudigd, true);
  assert.equal(q.velden[1].geheel, true);
  assert.deepEqual(K.vakGoed(q, ['6/8', '7/4', '6/8']), [false, false, true]);
  assert.deepEqual(K.vakGoed(q, ['3/4', '1 3/4', '3/4']), [true, true, true]);
  // Een losse vraag: ook zonder breukvak.
  const kort = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'Vereenvoudig 10/4', antwoord: '2 1/2', vereenvoudigd: true }] }).vragen[0];
  assert.equal(K.auto(kort, '5/2'), 0);
  assert.equal(K.auto(kort, '2 1/2'), 1);
  assert.equal(K.auto(kort, '2,5'), 1);
});

test('vakjes samen op punten: alleen alles juist geeft de punten', () => {
  const q = blad([
    { x: 1, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '12', samen: 1, punten: 1 },
    { x: 20, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '34', samen: 1, punten: 0 },
    { x: 40, y: 1, w: 10, h: 3, soort: 'kies', opties: ['<', '>'], antwoord: '<', samen: 1, punten: 0 },
    { x: 1, y: 10, w: 10, h: 3, soort: 'tekst', antwoord: '5', punten: 1 },
    { x: 1, y: 20, w: 10, h: 3, soort: 'tekst', antwoord: '9', samen: 2, punten: 1 },
  ]);
  assert.equal(q.punten, 3);
  assert.equal(q.velden[4].samen, undefined, 'een groepje van één vakje bestaat niet');
  assert.equal(K.auto(q, ['12', '34', '<', '5', '9']), 3);
  assert.equal(K.auto(q, ['12', '33', '<', '5', '9']), 2);
  assert.equal(K.auto(q, ['12', '33', '<', '5', '9'], { 1: true }), 3, 'de leerkracht zet een vakje toch goed');
  // Hokjes hebben hun eigen groep: samen wordt er niet op bewaard.
  const k = blad([{ x: 1, y: 1, w: 3, h: 2, soort: 'kruis', antwoord: true, groep: 1, samen: 1 }, { x: 5, y: 1, w: 3, h: 2, soort: 'kruis', antwoord: false, groep: 1, samen: 1 }]);
  assert.equal(k.velden[0].samen, undefined);
});

test('rekenrooster: op een blad (de leerkracht verbetert) en bij een rekenvraag', () => {
  const q = blad([{ x: 1, y: 1, w: 30, h: 10, soort: 'rooster', kol: 99, rij: 1, antwoord: '623' }]);
  assert.deepEqual([q.velden[0].kol, q.velden[0].rij], [20, 2]);
  assert.equal(K.HAND_VELD.has('rooster'), true);
  assert.equal(K.handPunten(q), 1);
  assert.equal(K.auto(q, ['  345\n +278\n  623']), 0);
  const v = K.viewOf(q, '0');
  assert.deepEqual([v.velden[0].kol, v.velden[0].rij], [20, 2]);
  const r = K.validate({ title: 't', vragen: [{ type: 'rekenen', vraag: '1234 × 5', antwoord: '6170', rooster: true }] }).vragen[0];
  assert.deepEqual([r.rooster, r.kol, r.rij], [true, 12, 6]);
  assert.deepEqual([K.viewOf(r, '0').kol, K.viewOf(r, '0').rij], [12, 6]);
  assert.equal(K.auto(r, { werk: '  1234\n    ×5\n  6170', uitkomst: '6170' }), 1);
  const zonder = K.validate({ title: 't', vragen: [{ type: 'rekenen', vraag: '1+1', antwoord: '2' }] }).vragen[0];
  assert.equal(zonder.rooster, undefined);
});
