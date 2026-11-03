// Tempo "Veel vragen": minder per antwoord, en in de vlag-spellen twee vragen na elkaar.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { factor, reeks, tempoOf } = require('../src/tempo');
const { Vragen } = require('../src/vragen');

const quiz = { title: 'T', questions: [0, 1, 2, 3].map(i => ({ question: `q${i}`, answers: ['a', 'b'], correct: 0 })) };

test('veel is een geldig tempo, met het kleinste deel per antwoord', () => {
  assert.equal(tempoOf('veel'), 'veel');
  assert.ok(factor('veel') < factor('intens'));
  assert.equal(reeks('veel'), 2);
  assert.equal(reeks('intens'), 1);
});

test('reeks: na het eerste antwoord volgt nog een vraag, na het tweede niet', () => {
  const v = new Vragen(quiz, 'Test', 'veel');
  v.stil = true;
  v.reeks = reeks('veel');
  const p = { name: 'An', waitUntil: 0 };
  v.next(p);
  assert.equal(v.answer(p, 0).more, true);
  v.next(p);
  assert.equal(v.answer(p, 0).more, false);
  v.next(p);
  assert.equal(v.answer(p, 0).more, true);
});

test('normaal: nooit een extra vraag', () => {
  const v = new Vragen(quiz, 'Test', 'normaal');
  v.stil = true;
  const p = { name: 'An', waitUntil: 0 };
  v.next(p);
  assert.equal(v.answer(p, 0).more, false);
});

test('elk tempo-menu heeft de stand Veel vragen', () => {
  const dir = path.join(__dirname, '..', 'public');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    if (html.includes('tempo-select')) assert.ok(html.includes('<option value="veel">'), f);
  }
});
