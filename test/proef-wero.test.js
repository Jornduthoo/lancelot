// De Proef: wensen bij de WERO-thematoetsen (vragen die samen blijven bij het schudden, meerdere antwoordvakjes).
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');

const mk = (vraag, extra = {}) => ({ type: 'meerkeuze', vraag, opties: ['a', 'b'], juist: 0, ...extra });

test('schudden: zonder "blijft" dezelfde volgorde als vroeger', () => {
  const t = K.validate({ title: 't', vragen: Array.from({ length: 8 }, (_, i) => mk(`v${i}`)) });
  // De oude manier: alle vragen (geen blad) door elkaar met dezelfde seed.
  const oud = K.schud(8, 's|vragen');
  assert.deepEqual(K.volgorde(t.vragen, 's|vragen', true), oud);
});

test('schudden: een vraag met "blijft" staat altijd meteen na de vraag ervoor', () => {
  const vragen = Array.from({ length: 9 }, (_, i) => mk(`v${i}`, i === 3 || i === 4 || i === 0 ? { blijft: true } : {}));
  const t = K.validate({ title: 't', vragen });
  assert.equal(t.vragen[3].blijft, true);
  for (let s = 0; s < 40; s++) {
    const o = K.volgorde(t.vragen, `seed${s}`, true);
    assert.deepEqual([...o].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const p = o.indexOf(2);
    assert.deepEqual(o.slice(p, p + 3), [2, 3, 4]);
  }
  // Niet geschud: gewoon de volgorde van de toets.
  assert.deepEqual(K.volgorde(t.vragen, 'x', false), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('schudden: een blad blijft op zijn plaats, samen met de vraag die erbij blijft', () => {
  const beeld = 'data:image/webp;base64,AAAA';
  const blad = { type: 'blad', beeld, verhouding: 1.414, velden: [{ x: 1, y: 1, w: 10, h: 5, soort: 'tekst', antwoord: '1' }] };
  const t = K.validate({ title: 't', vragen: [mk('a'), blad, mk('b', { blijft: true }), mk('c'), mk('d'), mk('e')] });
  for (let s = 0; s < 20; s++) {
    const o = K.volgorde(t.vragen, `s${s}`, true);
    assert.deepEqual(o.slice(1, 3), [1, 2]);
  }
});

test('meerdere antwoordvakjes: elk ander goed antwoord telt, in elke volgorde', () => {
  const t = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'Geef 3 organen.', antwoord: 'hart|longen = long|maag|lever', vakjes: 3 }] });
  const q = t.vragen[0];
  assert.equal(q.vakjes, 3);
  assert.equal(q.punten, 3);
  assert.equal(K.viewOf(q, '0').vakjes, 3);
  assert.equal(K.auto(q, ['Maag', 'long', 'hart']), 3);
  // Hetzelfde antwoord twee keer (ook in een andere schrijfwijze) telt één keer.
  assert.equal(K.auto(q, ['longen', 'long', 'hart']), 2);
  assert.equal(K.auto(q, ['hart', 'nier', '']), 1);
  assert.deepEqual(K.vakjesGoed(q, ['nier', 'lever', 'hart']), [false, true, true]);
  assert.deepEqual(K.schoon(q, ['a', 'b', 'c', 'd']), ['a', 'b', 'c']);
  assert.equal(K.oplossing(q), '3 van: hart · longen · maag · lever');
  // Te weinig goede antwoorden voor het aantal vakjes: een duidelijke melding.
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'a|b', vakjes: 3 }] }), /minstens 3 goede antwoorden/);
  // Eén vakje: zoals vroeger.
  const een = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'a|b' }] }).vragen[0];
  assert.equal(een.vakjes, undefined);
  assert.equal(K.auto(een, 'b'), 1);
});

test('datum: elke gewone schrijfwijze van dezelfde datum is juist', () => {
  const q = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'Wanneer viel Japan Pearl Harbor aan?', antwoord: '7 december 1941', datum: true }] }).vragen[0];
  assert.equal(q.datum, true);
  for (const a of ['7 december 1941', '7/12/1941', '07-12-1941', '7 dec. 1941', '7.12.1941', 'zondag 7 december 1941', '7 Dec 1941', '7de december 1941']) assert.equal(K.auto(q, a), 1, a);
  for (const a of ['8 december 1941', '7/11/1941', '1941', 'december 1941', '7-12-41']) assert.equal(K.auto(q, a), 0, a);
  // Zonder vinkje: zoals vroeger, alleen de getypte schrijfwijze.
  const oud = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: '7 december 1941' }] }).vragen[0];
  assert.equal(K.auto(oud, '7/12/1941'), 0);
  // Ook met meerdere vakjes, en een juist antwoord dat geen datum is geeft een duidelijke melding.
  const twee = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: '1 september 1939|8 mei 1945', datum: true, vakjes: 2 }] }).vragen[0];
  assert.equal(K.auto(twee, ['8/5/1945', '01-09-1939']), 2);
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'de oorlog', datum: true }] }), /geen datum/);
});

test('verbinden met prenten: elke kant mag een prent zijn, oud blijft gelijk', () => {
  const b = 'data:image/webp;base64,AAAA';
  const t = K.validate({ title: 't', vragen: [
    { type: 'verbinden', vraag: 'v', paren: [['', 'rood'], ['Driehoek', '']], prenten: [[b, ''], ['', b]] },
    { type: 'verbinden', vraag: 'v', paren: [['Antwerpen', 'Schelde'], ['Luik', 'Maas']] },
  ] });
  const [q, oud] = t.vragen;
  assert.deepEqual(q.prenten, [[b, ''], ['', b]]);
  assert.equal(oud.prenten, undefined);
  const v = K.viewOf(q, '0', { 0: [1, 0] });
  assert.deepEqual(v.rechts, ['', 'rood']);
  assert.deepEqual(v.linksBeeld, [b, '']);
  assert.deepEqual(v.rechtsBeeld, [b, '']);
  assert.equal(K.viewOf(oud, '1').linksBeeld, undefined);
  assert.equal(K.auto(q, [0, 1]), q.punten);
  assert.equal(K.oplossing(q), 'prent 1 = rood · Driehoek = prent 2');
  // Zonder tekst en zonder prent: niet volledig.
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'verbinden', vraag: 'v', paren: [['', 'rood'], ['a', 'b']] }] }), /niet volledig/);
});
