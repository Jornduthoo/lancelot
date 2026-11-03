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
  assert.ok(W.STAD.markers.some(m => m.soort === 'dief') && W.STAD.markers.some(m => m.soort === 'race') && W.STAD.markers.some(m => m.soort === 'koerier'));
  const start = W.startPlek(R);
  for (const m of W.STAD.markers) {
    assert.ok(W.kan(0, m.x, m.y), `missieplek ${m.wijk} ligt niet vrij`);
    assert.ok(bereikbaar(start, m), `missieplek in ${m.wijk} is niet te bereiken`);
  }
  for (const r of W.parcours(R, W.STAD.markers[0])) assert.ok(W.kan(0, r[0], r[1]), 'racering ligt in een gebouw');
  for (const s of [...W.SCHANSEN, ...W.TURBO]) assert.equal(W.grondOp(s.x, s.y), W.G.weg, 'schans of turbo naast de straat');
  assert.equal(W.nacht(0), 0, 'het spel begint overdag');
  assert.ok(W.nacht(W.DAG_S / 2) > .9, 'halfweg de dag is het nacht');
});

test('rijden: gas geven, draaien, niet door muren, schansen en verkeer', () => {
  const s = { x: 110, y: W.kruis(2) + 1.9, a: 0, vx: 0, vy: 0, z: 0, vz: 0, veh: 0, boost: 0 };
  for (let i = 0; i < 120; i++) W.drive(s, { gas: 1, turn: 0 }, 1 / 60);
  assert.ok(Math.hypot(s.vx, s.vy) > 10, 'trekt niet op');
  // Recht op een gebouw af: je komt er nooit in
  const h = W.STAD.gebouwen.find(o => o.soort === 'huis');
  const t = { x: h.x, y: h.y1 + 3, a: -Math.PI / 2, vx: 0, vy: 0, z: 0, vz: 0, veh: 0, boost: 0 };
  for (let i = 0; i < 180; i++) { W.drive(t, { gas: 1, turn: 0 }, 1 / 60); assert.ok(t.y > h.y1, 'door een muur gereden'); }
  // Over een schans: de lucht in
  const sc = W.SCHANSEN[0];
  const u = { x: sc.x - 6 * sc.r, y: sc.y, a: sc.r > 0 ? 0 : Math.PI, vx: 14 * sc.r, vy: 0, z: 0, vz: 0, veh: 0, boost: 0 };
  let sprong = false;
  for (let i = 0; i < 60; i++) if (W.drive(u, { gas: 1, turn: 0 }, 1 / 60).jump) sprong = true;
  assert.ok(sprong, 'geen sprong');
  // Een auto duwt je opzij
  const c = W.VERKEER.find(c => c.as === 'h' && c.i === 2);
  const a = W.autoOp(c, 30);
  const v = { x: a.x, y: a.y, a: 0, vx: 0, vy: 0, z: 0, vz: 0, veh: 0, boost: 0 };
  assert.ok(W.drive(v, { gas: 0, turn: 0 }, 1 / 60, { tt: 30 }).toet, 'geen toet');
  assert.ok(Math.abs(v.y - a.y) > 1 || Math.abs(v.x - a.x) > 1, 'niet opzij geduwd');
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
  Object.assign(p, { x: p.missie.tx, y: p.missie.ty });
  s.volg(p, .03, Date.now());
  assert.equal(p.missie, null);
  assert.ok(p.kr >= voor + W.BELONING.koerier);
  assert.equal(p.missies, 1);
});

test('glitchdief: hij vlucht, en wie vlak bij hem blijft vangt hem', () => {
  const { s, p } = spel();
  const i = W.STAD.markers.findIndex(m => m.soort === 'dief');
  Object.assign(p, { x: W.STAD.markers[i].x, y: W.STAD.markers[i].y });
  s.doel('a', { soort: 'missie', m: i });
  juist(s, p);
  assert.ok(p.dief, 'geen dief');
  const x0 = p.dief.x, y0 = p.dief.y;
  let t = Date.now();
  for (let k = 0; k < 100; k++) { t += 33; s.volg(p, .033, t); } // eerst wacht hij 2 s, dan rijdt hij weg
  assert.ok(Math.hypot(p.dief.x - x0, p.dief.y - y0) > 2, 'de dief rijdt niet');
  for (const d of [p.dief.x, p.dief.y]) assert.ok(Number.isFinite(d));
  const voor = p.kr;
  for (let k = 0; k < 200 && p.dief; k++) { Object.assign(p, { x: p.dief.x + 1, y: p.dief.y }); t += 33; s.volg(p, .033, t); }
  assert.equal(p.dief, null, 'niet gevangen');
  assert.equal(p.dieven, 1);
  assert.ok(p.kr >= voor + W.BELONING.dief);
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
  Object.assign(p, { x: b.x, y: b.y + 8 });
  assert.ok(s.doel('a', { soort: 'blus' }).ok);
  juist(s, p);
  assert.equal(s.brand, null);
  assert.equal(p.geblust, 1);
  assert.ok(p.kr >= W.BELONING.blus + W.BELONING.geblust);
});

test('energievraag geeft nitro, gnoom vangen, nieuw voertuig en de plek controleren', () => {
  const { s, p } = spel();
  const n0 = p.nitro;
  const r = juist(s, p);
  assert.equal(r.doel, 'energie');
  assert.equal(p.kr, W.BELONING.vraag);
  assert.equal(p.nitro, n0 + 1);
  assert.ok(s.nitro('a').ok);
  assert.equal(p.nitro, n0);
  const g = s.gnomen[0];
  Object.assign(g, { x: p.x + 1, y: p.y });
  s.gnomenTick(.03, Date.now());
  assert.equal(p.gnomen, 1);
  assert.ok(s.voertuig('a', 3).error, 'griffioen nog niet verdiend');
  s.geef(p, 40);
  assert.equal(s.open(p), 4);
  assert.ok(s.voertuig('a', 3).ok);
  // Een sprong van 100 m in één keer, of in een huis: terug naar de oude plek
  s.voertuig('a', 0);
  const x = p.x, y = p.y;
  p.moveAt = Date.now() - 50;
  s.move('a', { x: x + 100, y, a: 0 });
  assert.equal(p.x, x);
  const h = W.STAD.gebouwen.find(o => o.soort === 'huis');
  p.moveAt = Date.now() - 1000;
  s.move('a', { x: h.x, y: h.y, a: 0 });
  assert.equal(p.x, x);
  p.moveAt = Date.now() - 100;
  s.move('a', { x: x + 1, y, a: .5 });
  assert.equal(p.x, x + 1);
});
