// Het blok "Vandaag" op het startscherm (wensenlijst 20 nov, punt 9).
const test = require('node:test');
const assert = require('node:assert');
const { samenvatting, dagVan } = require('../src/vandaag');

const NU = new Date(2026, 10, 20, 9, 0).getTime(); // vrijdag 20 nov, 9 uur
const iso = (d, u = 10, m = 0) => new Date(2026, 10, d, u, m).toISOString();
const ll = (...rijen) => rijen.map(([naam, status, extra]) => ({ naam, status, ...(extra || {}) }));

test('verschijnt vandaag: alleen geplande taken van vandaag, vroegste eerst, zonder wie niet meedoet', () => {
  const taken = [
    { id: 'a', titel: 'Breuken', soort: 'oefenblad', vanaf: '2026-11-20T13:15', dag: '2026-11-20T13:15', leerlingen: ll(['Mo', 'nieuw'], ['Lien', 'nieuw'], ['Gast', 'nieuw', { niet: true }]) },
    { id: 'b', titel: 'Frans', soort: 'proef', vanaf: '2026-11-20T10:25', dag: '2026-11-20T10:25', leerlingen: ll(['Mo', 'nieuw']) },
    { id: 'c', titel: 'Morgen', soort: 'quiz', vanaf: '2026-11-21T08:30', dag: '2026-11-21T08:30', leerlingen: ll(['Mo', 'nieuw']) },
  ];
  const v = samenvatting(taken, [], NU);
  assert.deepStrictEqual(v.verschijnt.map(t => [t.id, t.uur, t.n]), [['b', '10:25', 1], ['a', '13:15', 2]]);
  assert.strictEqual(v.nietAf.length, 0);
  assert.strictEqual(v.leeg, false);
});

test('nog niet af: taken van vorige dagen, wie niet klaar is; niet wie niet meedoet of wacht; afwezig = inhalen', () => {
  const taken = [
    { id: 'x', titel: 'Woordjes', soort: 'quiz', dag: iso(18), leerlingen: ll(['Mo', 'klaar'], ['Lien', 'bezig'], ['Sam', 'nieuw', { afwezig: true }], ['Gast', 'nieuw', { niet: true }], ['Tim', 'nieuw', { wacht: true }]) },
    { id: 'y', titel: 'Vandaag gegeven', soort: 'oefenblad', dag: iso(20, 8), leerlingen: ll(['Mo', 'nieuw']) },
    { id: 'z', titel: 'Dicht', soort: 'oefenblad', dag: iso(17), dicht: true, leerlingen: ll(['Mo', 'nieuw']) },
    { id: 'o', titel: 'Te oud', soort: 'oefenblad', dag: iso(1), leerlingen: ll(['Mo', 'nieuw']) },
    { id: 'k', titel: 'Iedereen klaar', soort: 'oefenblad', dag: iso(19), leerlingen: ll(['Mo', 'klaar']) },
  ];
  const v = samenvatting(taken, [], NU);
  assert.deepStrictEqual(v.nietAf.map(t => t.id), ['x']);
  assert.deepStrictEqual(v.nietAf[0].namen, [{ naam: 'Lien', bezig: true }, { naam: 'Sam', afwezig: true }]);
});

test('toetsen: wie bezig is en open antwoorden van de laatste twee weken', () => {
  const afnames = [
    { file: 'a.json', title: 'Toets Frans', datum: iso(19), open: 12 },
    { file: 'b.json', title: 'Klaar', datum: iso(19), open: 0 },
    { file: 'c.json', title: 'Oud', datum: iso(2), open: 3 },
    { file: 'd.json', title: 'Nu bezig', datum: iso(20, 8), open: 0, bezig: 3 },
  ];
  const v = samenvatting([], afnames, NU);
  assert.deepStrictEqual(v.verbeteren.map(a => [a.file, a.open, a.bezig]), [['a.json', 12, 0], ['d.json', 0, 3]]);
});

test('niets te melden: leeg', () => {
  assert.strictEqual(samenvatting([], [], NU).leeg, true);
  assert.strictEqual(dagVan(NU), '2026-11-20');
});

test('standaard staat Vandaag aan en het blijft bij een andere standaard', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  process.env.LANCELOT_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vandaag-'));
  const ts = require('../src/takenstandaard');
  assert.strictEqual(ts.read().vandaag, true);
  assert.strictEqual(ts.zetVandaag(false).vandaag, false);
  assert.strictEqual(ts.write({ algemeen: { volgorde: 'alles' } }).vandaag, false);
  assert.strictEqual(ts.zetVandaag(true).vandaag, true);
});

test('Vandaag is inklapbaar en onthoudt dat (Jorn 24 nov)', () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '../public/host.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/js/host.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
  assert.match(html, /id="vandaag-klap"[^>]*aria-expanded/);
  assert.match(html, /id="vandaag-telling"/);
  assert.match(js, /lancelot-vandaag-dicht/);
  assert.match(css, /\.vandaag\.dicht \.vandaag-blok/);
});
