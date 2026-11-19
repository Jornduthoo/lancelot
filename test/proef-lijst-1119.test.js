// De Proef, lijst van 19 november (na het nalopen van alle toetsen): tabelcellen, hokjesgroepen, figuurmeldingen,
// vaste volgorde en luistertoetsen omzetten.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern.js');

const blad = velden => ({ title: 'x', vragen: [{ type: 'blad', beeld: 'data:image/webp;base64,AAAA', velden }] });

test('een tabelcel van 148 tekens blijft heel (vroeger stil afgeknipt na 120)', () => {
  const zin = 'Hij zocht in de kast, onder het bed en achter de zetel naar alle verloren objecten van zijn zus → ze = ' + 'x'.repeat(40);
  assert.ok(zin.length > 140);
  const t = K.validate({ title: 'x', vragen: [{ type: 'tabel', rijen: [['zin', 'naar wie?'], [zin, '[Lies]']] }] });
  assert.strictEqual(t.vragen[0].rijen[1][0], zin);
});

test('hokjesgroepen: verschillende namen blijven verschillende groepen, getallen blijven wat ze zijn', () => {
  const v = K.validate(blad([
    { x: 1, y: 1, w: 2, h: 2, soort: 'kruis', groep: 'r34', antwoord: true },
    { x: 5, y: 1, w: 2, h: 2, soort: 'kruis', groep: 'r34' },
    { x: 1, y: 5, w: 2, h: 2, soort: 'kruis', groep: 'r36', antwoord: true },
    { x: 1, y: 9, w: 2, h: 2, soort: 'kruis', groep: 'r36.9', antwoord: true },
    { x: 1, y: 13, w: 2, h: 2, soort: 'kruis', groep: 1, antwoord: true },
    { x: 1, y: 17, w: 2, h: 2, soort: 'kruis', groep: 3 },
    { x: 1, y: 21, w: 2, h: 2, soort: 'kruis' },
  ])).vragen[0].velden.map(f => f.groep);
  assert.strictEqual(v[0], v[1]);
  assert.strictEqual(new Set([v[0], v[2], v[3], 1, 3]).size, 5);
  assert.deepStrictEqual([v[4], v[5], v[6]], [1, 3, 1]);
});

test('figuurmelding: alleen als de vraag naar een beeld wijst, niet bij een woord in een verhaal of een brontekst', () => {
  const n = q => K.waarschuwingen(K.validate({ title: 'x', vragen: [q] })).length;
  assert.strictEqual(n({ type: 'open', vraag: 'Hij gaf San een foto van mama. Waarom deed hij dat?' }), 0);
  assert.strictEqual(n({ type: 'open', vraag: 'Bekijk de foto. Wat zie je?' }), 1);
  assert.strictEqual(n({ type: 'open', vraag: 'Wat zie je op de kaart?' }), 1);
  assert.strictEqual(n({ type: 'open', vraag: 'Kleur de figuur hieronder.' }), 1);
  assert.strictEqual(n({ type: 'open', vraag: 'Lees de zinnen hieronder.' }), 0);
  assert.strictEqual(n({ type: 'bron', tekst: 'Oma bekeek de foto op de kast.', vragen: [{ type: 'open', vraag: 'Wie is oma?' }] }), 0);
});

test('vaste volgorde: blijft bewaard, en zonder schakelaar niets anders', () => {
  const q = [{ type: 'open', vraag: 'a' }, { type: 'open', vraag: 'b' }];
  assert.strictEqual(K.validate({ title: 'x', vragen: q, vasteVolgorde: true }).vasteVolgorde, true);
  assert.strictEqual('vasteVolgorde' in K.validate({ title: 'x', vragen: q }), false);
});

test('luistertoets omzetten: vragen na elkaar met dezelfde voorleestekst worden één bron, punten blijven', () => {
  const zeg = 'Fragment 1: Tom fietst naar school.';
  const lijst = [
    { type: 'open', vraag: 'intro' },
    { type: 'kort', vraag: 'Wie?', antwoord: 'Tom', voorlees: zeg, luisterMax: 2, punten: 2 },
    { type: 'kort', vraag: 'Waarheen?', antwoord: 'school', voorlees: zeg, luisterMax: 2 },
    { type: 'kort', vraag: 'Hoe?', antwoord: 'fiets', voorlees: 'Fragment 2' },
    { type: 'kort', vraag: 'Wat?', antwoord: 'x', voorlees: 'Fragment 3' },
  ];
  const r = K.luisterBronnen(lijst);
  assert.deepStrictEqual([r.bronnen, r.vragen, r.lijst.length], [1, 2, 4]);
  const bron = r.lijst[1];
  assert.deepStrictEqual([bron.type, bron.voorlees, bron.luisterMax, bron.vragen.length], ['bron', zeg, 2, 2]);
  assert.ok(bron.vragen.every(d => !d.voorlees && !d.luisterMax));
  const oud = K.validate({ title: 'x', vragen: lijst });
  const nieuw = K.validate({ title: 'x', vragen: r.lijst });
  assert.strictEqual(K.totaal(nieuw.vragen), K.totaal(oud.vragen));
  assert.strictEqual(K.luisterBronnen(r.lijst).bronnen, 0);
});
