// Vragenstorm: drie vragen per leerling langs het spel zelf, daarna stopt de storm vanzelf.
const test = require('node:test');
const assert = require('node:assert');
const vragenstorm = require('../src/vragenstorm');

function opstelling() {
  const sent = [];
  const sockets = new Map([['s1', {}], ['s2', {}]]);
  const io = { sockets: { sockets }, to: room => ({ emit: (ev, data) => sent.push([room, ev, data]) }) };
  const spel = { phase: 'play', players: new Map([['a', { socketId: 's1' }], ['b', { socketId: 's2' }]]), asked: 0 };
  const g = {
    game: spel,
    question: () => { spel.asked++; return { question: 'Hoeveel?', answers: ['1', '2'] }; },
    answer: (id, choice) => ({ correct: choice === 1, right: 1, wait: choice === 1 ? 0 : 3000 }),
  };
  const s = vragenstorm.create(io, { '/spel': spel, '/ander': { phase: 'idle' } }, { spel: g });
  return { s, sent, spel };
}

test('start alleen tijdens een spel', () => {
  const { s } = opstelling();
  assert.ok(s.kan('/spel'));
  assert.ok(!s.kan('/ander'));
  assert.ok(s.start('/ander').error);
});

test('elke leerling krijgt 3 vragen, daarna is de storm voorbij', () => {
  const { s, sent } = opstelling();
  const st = s.start('/spel');
  assert.equal(st.totaal, 2);
  assert.equal(sent.filter(([, ev]) => ev === 'storm').length, 2);
  for (const sock of ['s1', 's2']) {
    for (let i = 0; i < 3; i++) {
      assert.ok(s.vraag({ id: sock }).question);
      const res = s.antwoord({ id: sock }, i === 0 ? 0 : 1);
      assert.equal(res.left, 2 - i);
    }
    assert.ok(s.vraag({ id: sock }).klaar);
  }
  assert.equal(s.stand().aan, false);
});

test('de leerkracht kan de storm stoppen', () => {
  const { s, sent } = opstelling();
  s.start('/spel');
  s.stop();
  assert.equal(s.stand().aan, false);
  assert.ok(sent.some(([, ev, d]) => ev === 'storm' && d && d.uit));
});
