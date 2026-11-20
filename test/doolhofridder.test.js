// Doolhofridder: inslaan in een zijgang lukt ook als de toets net te laat binnenkomt (wifi), omkeren gaat meteen,
// en de drones zeggen vooraf waar ze heen gaan (zodat de schermen vloeiend kunnen tekenen).
const test = require('node:test');
const assert = require('node:assert');
const { PacKnight } = require('../src/packnight');
const klok = require('../src/pauze').klok;

const sent = [];
const stil = { emit: (ev, msg) => sent.push([ev, msg]), except: () => stil };
const io = { to: () => stil };
const quiz = { title: 'T', questions: [{ question: 'q', answers: ['a', 'b'], correct: 0 }] };

// Een kruispunt: een gang van links naar rechts, met in het midden een gang naar boven en naar beneden.
const MAZE = ['#######', '###.###', '#.....#', '###.###', '#######'];

function spel() {
  const s = new PacKnight(io, null);
  s.load(quiz, 5, 'normaal');
  s.join('a', 'An', 'sa');
  s.start();
  klok.clearInterval(s.ticker);
  klok.clearTimeout(s.endTimer);
  s.startedAt = Date.now() - 1000;
  s.maze = MAZE;
  s.W = 7;
  s.H = 5;
  s.crystals = new Uint8Array(35);
  for (let i = 0; i < 35; i++) if (MAZE[Math.floor(i / 7)][i % 7] === '.') s.crystals[i] = 1;
  s.drones = [];
  const p = s.players.get('a');
  Object.assign(p, { x: 2, y: 2, px: 2, py: 2, dir: 1, want: 1, trail: [], crystals: 0, safeUntil: 0 });
  test.after(() => s.reset());
  return { s, p };
}

// De ridder loopt naar rechts: van (2,2) naar het kruispunt (3,2), en daarna voorbij het kruispunt naar (4,2).
function voorbij(s, p) {
  const t = Date.now();
  s.stepKnight(p, t - 200, t - 200);
  s.stepKnight(p, t - 35, t - 35);
  assert.deepStrictEqual([p.x, p.y, p.px, p.py], [4, 2, 3, 2]);
  return t;
}

test('net te laat ingeslagen: het scherm zegt welk kruispunt, de ridder gaat alsnog de zijgang in', () => {
  const { s, p } = spel();
  voorbij(s, p);
  const voor = p.crystals;
  s.steer('a', 0, { x: 3, y: 2 });
  assert.deepStrictEqual([p.x, p.y, p.px, p.py, p.dir], [3, 1, 3, 2, 0]);
  assert.strictEqual(s.crystals[2 * 7 + 4], 1, 'het kristal van het vakje waar hij niet echt kwam ligt er terug');
  assert.strictEqual(p.crystals, voor, 'eentje teruggelegd, eentje nieuw geraapt');
});

test('ook twee stappen te laat (wifi hield de toets op): de stappen worden overgedaan', () => {
  const { s, p } = spel();
  const t = Date.now();
  s.stepKnight(p, t - 300, t - 300); // (2,2) -> (3,2)
  s.stepKnight(p, t - 135, t - 135); // (3,2) -> (4,2)
  p.want = 1;
  s.stepKnight(p, t - 10, t - 10);   // (4,2) -> (5,2)
  s.steer('a', 2, { x: 3, y: 2 });
  assert.deepStrictEqual([p.x, p.y, p.dir], [3, 3, null], 'naar beneden de zijgang in (en daar stopt hij tegen de muur)');
  assert.strictEqual(s.crystals[2 * 7 + 4], 1);
  assert.strictEqual(s.crystals[2 * 7 + 5], 1);
});

test('zag het scherm geen kruispunt, dan onthoudt de ridder de richting gewoon voor later', () => {
  const { s, p } = spel();
  voorbij(s, p);
  s.steer('a', 0, false);
  assert.deepStrictEqual([p.x, p.y, p.dir, p.want], [4, 2, 1, 0]);
});

test('oude pagina zonder kruispunt: een korte speling na de stap', () => {
  const { s, p } = spel();
  voorbij(s, p);
  s.steer('a', 0);
  assert.deepStrictEqual([p.x, p.y], [3, 1]);
});

test('een kruispunt van lang geleden telt niet meer', () => {
  const { s, p } = spel();
  voorbij(s, p);
  for (const st of p.trail) st.at -= 2000;
  s.steer('a', 0, { x: 3, y: 2 });
  assert.deepStrictEqual([p.x, p.y], [4, 2]);
});

test('omkeren gaat meteen, vanaf waar de ridder nu staat', () => {
  const { s, p } = spel();
  const t = voorbij(s, p);
  s.steer('a', 3, false);
  assert.deepStrictEqual([p.x, p.y, p.px, p.py, p.dir], [3, 2, 4, 2, 3]);
  // Hij was 35 ms onderweg naar (4,2): terug duurt dus nog 35 ms (de rest van de stap telt als al gelopen).
  assert.ok(Math.abs(p.next - (t + 35)) <= 5, `volgende stap ${p.next - t}`);
});

test('drones plannen hun volgende vakje en dat gaat mee in het bericht', () => {
  const { s } = spel();
  const t = Date.now();
  const d = { i: 0, x: 1, y: 2, px: 1, py: 2, dir: 1, at: t, next: t, deadUntil: 0, scared: false };
  s.drones = [d];
  s.stepDrone(d, t, t);
  assert.deepStrictEqual([d.x, d.y], [2, 2]);
  assert.strictEqual(d.plan, 1, 'in een rechte gang verder naar rechts');
  sent.length = 0;
  s.send(t);
  const msg = sent.find(([ev]) => ev === 'pk-tick')[1];
  assert.strictEqual(msg.d[0][8], 1);
  assert.strictEqual(msg.k[0][9], 1, 'de gewenste richting van de ridder gaat ook mee');
  s.stepDrone(d, t + 200, t + 200);
  assert.deepStrictEqual([d.x, d.y], [3, 2], 'de drone volgt zijn plan');
});
