// Neon-Camelot: de stad klopt (iedereen kan starten, elke missieplek is bereikbaar) en een missie, een brand,
// een gnoom en een nieuw voertuig werken zoals beloofd.
const test = require('node:test');
const assert = require('node:assert');
const W = require('../public/js/nc-world');
const { NeonCamelot } = require('../src/neoncamelot');
const klok = require('../src/pauze').klok;

const stil = { emit() {}, except: () => stil };
const io = { to: () => stil };
const quiz = { title: 'T', questions: [0, 1, 2, 3, 4, 5].map(i => ({ question: `q${i}`, answers: ['a', 'b', 'c'], correct: i % 3 })) };

const spellen = [];
test.after(() => { for (const s of spellen) s.stop(); });

function spel() {
  const s = new NeonCamelot(io, null);
  s.load(quiz, 10, 'normaal');
  s.vragen.stil = true;
  s.join('a', 'An', 'sa');
  s.start();
  klok.clearInterval(s.ticker);
  klok.clearTimeout(s.endTimer);
  spellen.push(s);
  s.startedAt = Date.now() - 1;
  return { s, p: s.players.get('a') };
}
const juist = (s, p) => {
  s.question('a');
  const r = s.answer('a', quiz.questions[p.question].correct);
  s.asking('a', false); // de leerling sluit het vragenvenster
  return r;
};

// Kan een robopaard van a naar b rijden? (breedte eerst over tegels)
function bereikbaar(a, b) {
  const start = W.tegel(a.x, a.y), doel = W.tegel(b.x, b.y);
  const seen = new Uint8Array(W.N * W.N);
  const rij = [start];
  seen[start] = 1;
  while (rij.length) {
    const i = rij.shift();
    if (i === doel) return true;
    const x = i % W.N, y = Math.floor(i / W.N);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * W.N + nx;
      if (nx < 0 || ny < 0 || nx >= W.N || ny >= W.N || seen[j]) continue;
      if (!W.kan(0, (nx + .5) * W.TILE, (ny + .5) * W.TILE)) continue;
      seen[j] = 1;
      rij.push(j);
    }
  }
  return false;
}

test('de stad: startplekken zijn vrij en elke missieplek is bereikbaar', () => {
  const R = W.rng(3);
  for (let i = 0; i < 100; i++) { const p = W.startPlek(R); assert.ok(W.kan(0, p.x, p.y), 'startplek zit vast'); }
  assert.ok(W.STAD.markers.length >= 10);
  const start = W.startPlek(R);
  for (const m of W.STAD.markers) {
    assert.ok(W.kan(0, m.x, m.y), `missieplek ${m.wijk} ligt niet op de straat`);
    assert.ok(bereikbaar(start, m), `missieplek in ${m.wijk} is niet te bereiken`);
  }
  for (const r of W.parcours(R, W.STAD.markers[0])) assert.ok(W.kan(0, r[0], r[1]), 'racering ligt in een gebouw');
});

test('missie: pas na een juist antwoord, en bezorgen geeft kristallen', () => {
  const { s, p } = spel();
  const i = W.STAD.markers.findIndex(m => m.soort === 'koerier');
  assert.ok(s.doel('a', { soort: 'missie', m: i }).error, 'te ver weg mag niet');
  Object.assign(p, { x: W.STAD.markers[i].x, y: W.STAD.markers[i].y });
  assert.ok(s.doel('a', { soort: 'missie', m: i }).ok);
  const r = juist(s, p);
  assert.equal(r.doel, 'missie');
  assert.ok(p.missie && p.missie.soort === 'koerier');
  const voor = p.kr;
  Object.assign(p, { x: p.missie.tx, y: p.missie.ty, dx: .1, dy: 0 });
  s.beweeg(p, .03, Date.now());
  assert.equal(p.missie, null);
  assert.ok(p.kr >= voor + W.BELONING.koerier);
  assert.equal(p.missies, 1);
});

test('fout antwoord op een missie: geen missie, even wachten', () => {
  const { s, p } = spel();
  const i = 0;
  Object.assign(p, { x: W.STAD.markers[i].x, y: W.STAD.markers[i].y });
  s.doel('a', { soort: 'missie', m: i });
  s.question('a');
  const fout = (quiz.questions[p.question].correct + 1) % 3;
  s.answer('a', fout);
  assert.equal(p.missie, null);
  assert.ok(s.doel('a', { soort: 'missie', m: i }).error);
});

test('brand blussen met juiste antwoorden, helpers krijgen kristallen', () => {
  const { s, p } = spel();
  s.event(Date.now());
  const b = s.brand;
  assert.ok(b);
  b.hp = 1;
  Object.assign(p, { x: b.x, y: b.y + 3 });
  assert.ok(s.doel('a', { soort: 'blus' }).ok);
  juist(s, p);
  assert.equal(s.brand, null);
  assert.equal(p.geblust, 1);
  assert.ok(p.kr >= W.BELONING.blus + W.BELONING.geblust);
});

test('energievraag, gnoom vangen en een nieuw voertuig', () => {
  const { s, p } = spel();
  const r = juist(s, p);
  assert.equal(r.doel, 'energie');
  assert.equal(p.kr, W.BELONING.vraag);
  const g = s.gnomen[0];
  Object.assign(g, { x: p.x + 1, y: p.y });
  s.gnomenTick(.03, Date.now());
  assert.equal(p.gnomen, 1);
  assert.ok(s.voertuig('a', 3).error, 'griffioen nog niet verdiend');
  s.geef(p, 40);
  assert.equal(s.open(p), 4);
  assert.ok(s.voertuig('a', 3).ok);
  assert.ok(W.kan(3, 50, 50) && !W.kan(0, 2, 2) && W.kan(1, 2, 120), 'griffioen vliegt, hoverboard rijdt over water');
});

test('de levende stad: schansen, turbo, verkeer en bewoners liggen op de straat', () => {
  for (const s of [...W.SCHANSEN, ...W.TURBO]) assert.equal(W.grondOp(s.x, s.y), W.G.weg, 'schans of turbo naast de straat');
  for (let t = 0; t < 300; t += 5) {
    for (const c of W.VERKEER) {
      const a = W.autoOp(c, t);
      if (a.x > 44 && a.x < W.L - 2 && a.y > 2 && a.y < W.L - 2) assert.equal(W.grondOp(a.x, a.y), W.G.weg, 'auto naast de straat');
    }
    for (const b of W.VOLK) { const a = W.bewonerOp(b, t); if (a.x > 44) assert.equal(W.grondOp(a.x, a.y), W.G.weg, 'bewoner naast de straat'); }
  }
  assert.equal(W.nacht(0), 0, 'het spel begint overdag');
  assert.ok(W.nacht(W.DAG_S / 2) > .9, 'halfweg de dag is het nacht');
});

test('schans: je springt, landt veilig en krijgt een stuntkristal', () => {
  const { s, p } = spel();
  const sc = W.SCHANSEN[0];
  const t0 = Date.now();
  Object.assign(p, { x: sc.x - .5 * sc.r, y: sc.y, dx: sc.r, dy: 0 });
  s.beweeg(p, .03, t0);
  assert.ok(p.sprong, 'geen sprong');
  assert.equal(p.stunts, 1);
  assert.equal(p.kr, W.BELONING.stunt);
  let t = t0;
  while (p.sprong) { t += 33; s.beweeg(p, .033, t); }
  assert.ok(Math.abs(p.x - sc.x) > 8, 'niet ver gesprongen');
  assert.ok(W.kan(0, p.x, p.y), 'geland in een muur');
});

test('turbo en verkeer: sneller over de plaat, een auto duwt je opzij', () => {
  const { s, p } = spel();
  const tp = W.TURBO[0];
  const t0 = Date.now();
  Object.assign(p, { x: tp.x, y: tp.y, dx: 0, dy: 1 });
  s.beweeg(p, .03, t0);
  assert.ok(p.turboTot > t0);
  const c = W.VERKEER.find(c => c.as === 'h' && c.i === 2);
  const tt = (t0 - s.startedAt) / 1000;
  const a = W.autoOp(c, tt);
  Object.assign(p, { x: a.x, y: a.y, dx: 0, dy: 0, turboTot: 0 });
  s.straat(p, t0, 0);
  const na = W.autoOp(c, tt);
  assert.ok(Math.abs(p.y - na.y) > 1.4 || Math.abs(p.x - na.x) > W.AUTOS[c.a][2] / 2, 'niet opzij geduwd');
  assert.ok(W.kan(0, p.x, p.y));
});
