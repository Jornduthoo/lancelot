// De startquizzen: elk leerjaar heeft in elke taal geldige quizzen met vier verschillende antwoorden.
const test = require('node:test');
const assert = require('node:assert');
const startquizzen = require('../src/startquizzen');
const quizzes = require('../src/quizzes');

test('startquizzen: elk leerjaar, elke taal', () => {
  for (const [jaar, ids] of Object.entries(startquizzen.PAKKET)) {
    assert.ok(ids.length >= 3, `leerjaar ${jaar}`);
    for (const taal of Object.keys(startquizzen.MAP)) {
      for (const id of ids) {
        const quiz = quizzes.validate(startquizzen.maak(id, taal));
        assert.ok(quiz.questions.length >= 10, `${id} ${taal}`);
        for (const q of quiz.questions) assert.strictEqual(new Set(q.answers).size, q.answers.length, `${id} ${taal}: ${q.question}`);
      }
    }
  }
});

test('startquizzen: dezelfde quiz heeft altijd dezelfde vragen', () => {
  assert.deepStrictEqual(startquizzen.maak('tafels', 'nl'), startquizzen.maak('tafels', 'nl'));
  assert.ok(startquizzen.isStartquiz('startquiz-tafels-fr.json'));
  assert.ok(!startquizzen.isStartquiz('mijn-quiz.json'));
});
