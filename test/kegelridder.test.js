// Kegelridder: de scorekaart telt zoals echt bowlen (strike = 10 + 2 ballen, spare = 10 + 1 bal), na tien beurten
// begint een nieuw spel en telt je beste spel; "2 ballen per vraag" en de eenvoudige telling blijven werken.
const test = require('node:test');
const assert = require('node:assert');
const World = require('../public/js/kb-world');
const { Kegelridder, isSplit } = require('../src/kegelridder');
const klok = require('../src/pauze').klok;

const stil = { emit: () => {}, except: () => stil };
const io = { to: () => stil };
const quiz = { title: 'T', questions: [{ question: 'q', answers: ['a', 'b'], correct: 0 }] };

test('scorekaart: perfect spel, alles spare, alles 9', () => {
  assert.strictEqual(World.card(Array(12).fill(10)).score, 300);
  assert.strictEqual(World.card(Array(21).fill(5)).score, 150);
  assert.strictEqual(World.card(Array(20).fill(0).map((_, i) => (i % 2 ? 0 : 9))).score, 90);
  const c = World.card([10, 7, 3, 9, 0, 10, 0, 8, 8, 2, 0, 6, 10, 10, 10, 8, 1]);
  assert.strictEqual(c.score, 167);
  assert.deepStrictEqual(c.frames[1].marks, ['7', '/']);
  assert.deepStrictEqual(c.frames[9].marks, ['X', '8', '1']);
  assert.ok(c.done);
});

test('scorekaart: een strike telt pas als de volgende 2 ballen er zijn', () => {
  const c = World.card([10, 3]);
  assert.strictEqual(c.frames[0].total, null);
  assert.deepStrictEqual([c.frame, c.ball, c.fresh], [2, 2, false]);
  assert.strictEqual(World.card([10, 3, 4]).frames[0].total, 17);
});

test('tiende beurt: na een strike of spare een extra bal met een vers rek', () => {
  const nine = Array(18).fill(0);
  assert.deepStrictEqual(World.where([...nine, 3, 7]), { frame: 10, ball: 3, fresh: true, done: false });
  assert.deepStrictEqual(World.where([...nine, 10, 4]), { frame: 10, ball: 3, fresh: false, done: false });
  assert.strictEqual(World.where([...nine, 3, 6]).done, true);
});

test('split: voorste kegel om en twee losse groepjes', () => {
  const st = Array(10).fill(false);
  st[6] = true; st[9] = true; // 7-10
  assert.ok(isSplit(st));
  const buren = Array(10).fill(false);
  buren[1] = true; buren[3] = true; // 2-4 staan tegen elkaar
  assert.ok(!isSplit(buren));
});

function spel(opts) {
  const s = new Kegelridder(io, null);
  s.load(quiz, 5, 'normaal', opts);
  s.join('a', 'An', 'sa');
  s.start();
  klok.clearInterval(s.ticker);
  klok.clearTimeout(s.endTimer);
  s.startedAt = Date.now() - 1000;
  return s;
}
const recht = { x: 0.06, a: 0, v: 9, s: 0 };

test('echte telling: na tien beurten een nieuw spel, het beste spel telt', () => {
  const s = spel({});
  const p = s.players.get('a');
  let gooi = 0;
  while (p.games.length === 0 && gooi < 30) {
    p.balls = 1;
    p.lastThrow = 0;
    const res = s.throwBall('a', recht);
    assert.ok(res.ok, res.error);
    gooi++;
  }
  assert.strictEqual(p.games.length, 1);
  assert.deepStrictEqual(p.rolls, []);
  assert.strictEqual(p.frame, 1);
  assert.strictEqual(s.ranking()[0].score, p.bestGame);
  assert.ok(p.bestGame > 0);
});

test('2 ballen per juiste vraag', () => {
  const s = spel({ per: 2 });
  s.question('a');
  const res = s.answer('a', 0);
  assert.ok(res.correct);
  assert.strictEqual(res.balls, 2);
});

test('eenvoudige telling: kegels en extra punten', () => {
  const s = spel({ telling: 'eenvoudig' });
  const p = s.players.get('a');
  p.balls = 1;
  const res = s.throwBall('a', recht);
  assert.ok(res.ok);
  assert.strictEqual(s.ranking()[0].score, res.points);
});

test('de tijd is om terwijl een bal rolt: eerst uitrollen, dan de eindstand; daarna geen nieuwe worp', async () => {
  const s = spel({});
  const p = s.players.get('a');
  p.balls = 2;
  assert.ok(s.throwBall('a', recht).ok);
  s.endsAt = Date.now() - 1000;
  s.timeUp();
  assert.strictEqual(s.phase, 'play'); // de bal rolt nog uit
  p.lastThrow = 0;
  assert.strictEqual(s.throwBall('a', recht).error, 'De tijd is om.');
  klok.clearTimeout(s.endTimer);
  s.finish();
  assert.strictEqual(s.phase, 'einde');
  assert.ok(s.ranking()[0].score > 0); // wat al ligt, telt (ook als de beurt niet af is)
});
