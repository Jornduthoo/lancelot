// De Proef: extra keuzes voor taaltoetsen (zinnen en stukjes aanduiden, kleuren, in de brontekst, "duid er 2 aan", punten per juist antwoord).
// Een oude toets zonder deze keuzes werkt en telt precies zoals vroeger.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');

const een = q => K.validate({ title: 't', vragen: [q] }).vragen[0];
const BAS = 'Bas stond voor de klas. Zijn handen trilden. "Ik ben zo nerveus," fluisterde hij. Toen lachte hij.';

test('woorden aanduiden zoals vroeger: dezelfde punten, ook met een stuk tussen haken als één woord', () => {
  const q = een({ type: 'markeren', vraag: 'x', tekst: 'De [hond] [blaft] en de [grote kat] slaapt.', punten: 3 });
  assert.equal(q.per, undefined);
  assert.equal(K.auto(q, [1, 2, 5]), 3);
  assert.equal(K.auto(q, [1, 2, 0]), 1);
  assert.equal(K.auto(q, [0, 3]), 0);
  const v = K.viewOf(q, '0');
  assert.deepEqual(v.stukken.filter(s => s.w !== undefined).map(s => s.t), ['De', 'hond', 'blaft', 'en', 'de', 'grote kat', 'slaapt']);
  assert.equal(K.oplossing(q), 'hond · blaft · grote kat');
  assert.deepEqual(K.schoon(q, [2, 1, 1, 'x']), [1, 2]);
});

test('zinnen: LANcelot knipt de tekst in zinnen, de maker zet de juiste zin tussen haken', () => {
  const q = een({ type: 'markeren', vraag: 'x', per: 'zin', tekst: 'Bas stond voor de klas. [Zijn handen trilden.] "Ik ben zo nerveus," fluisterde hij! Toen lachte hij?' });
  const m = K.markeerModel(q);
  assert.deepEqual([...new Set(m.woorden.map(w => w.z))], [0, 1, 2, 3]);
  assert.deepEqual(m.doelen, [{ a: 1, b: 1, k: 1 }]);
  assert.equal(K.auto(q, [1]), 1);
  assert.equal(K.auto(q, [2]), 0);
  assert.equal(K.auto(q, [1, 2]), 0);
  // De leerling ziet niet welke zin juist is: de tekst wordt zonder haken geknipt.
  const v = K.viewOf(q, '0');
  assert.ok(!v.stukken.some(x => /[\[\]]/.test(x.t)));
  assert.equal(new Set(v.stukken.filter(s => s.w !== undefined).map(s => s.z)).size, 4);
  // Een afkorting is geen einde van een zin.
  assert.equal(new Set(K.tekstWoorden('Neem bv. een appel. Of een peer.').map(w => w.z)).size, 2);
});

test('stukjes tekst: één woord te veel of te weinig aan de rand mag, en "duid er 2 aan"', () => {
  const q = een({ type: 'markeren', vraag: 'x', per: 'stuk', aantal: 2, tekst: 'Lien is blij [omdat de zon schijnt], [omdat het woensdag is] en [omdat oma komt].' });
  assert.equal(q.punten, 2);
  assert.equal(K.auto(q, [[3, 6, 1], [7, 10, 1]]), 2);
  assert.equal(K.auto(q, [[4, 6, 1], [6, 10, 1]]), 2);
  assert.equal(K.auto(q, [[3, 6, 1]]), 1);
  // drie juiste: ook alle punten; een fout stuk kost er één.
  assert.equal(K.auto(q, [[3, 6, 1], [7, 10, 1], [12, 14, 1]]), 2);
  assert.equal(K.auto(q, [[3, 6, 1], [0, 2, 1]]), 0);
  assert.equal(K.auto(q, [[5, 6, 1]]), 0);
  assert.deepEqual(K.schoon(q, [[3, 6, 1], [6, 3, 1], 'x', [1, 2, 9]]), [[3, 6, 1]]);
});

test('meerdere kleuren: elk woord in zijn kleur, een verkeerde kleur telt als fout', () => {
  const q = een({ type: 'markeren', vraag: 'x', kleuren: [{ kleur: 'groen', uitleg: 'eigennaam' }, { kleur: 'geel', uitleg: 'ander' }], tekst: '[Jan] fietst met zijn [fiets|2] naar [Gent].' });
  assert.equal(q.punten, 3);
  assert.equal(K.auto(q, [[0, 1], [4, 2], [6, 1]]), 3);
  assert.equal(K.auto(q, [[0, 1], [4, 1], [6, 1]]), 1);
  assert.equal(K.oplossing(q), 'groen (eigennaam): Jan, Gent · geel (ander): fiets');
  const v = K.viewOf(q, '0');
  assert.ok(!JSON.stringify(v).includes('|2'));
  assert.equal(v.kleuren.length, 2);
  assert.throws(() => een({ type: 'markeren', vraag: 'x', tekst: '[Jan|2] fietst.' }), /kleuren/);
});

test('aanduiden in de brontekst: de juiste stukken blijven juist als de tekst van de bron verandert', () => {
  const bron = tekst => K.validate({ title: 't', vragen: [{ type: 'bron', titel: 'b', tekst, vragen: [{ type: 'markeren', vraag: 'Kleur de zin.', per: 'zin', inBron: true, doelen: [[8, 11, 1, 'Ik ben zo nerveus']] }] }] }).vragen[0];
  const b = bron(BAS);
  const d = b.vragen[0];
  assert.equal(d.tekst, undefined);
  assert.equal(K.auto(d, [2]), 1);
  assert.equal(K.auto(d, [1]), 0);
  const v = K.studentView({ title: 't' }, [b]).pages[0];
  assert.ok(v.stukken.length > 10);
  assert.equal(v.vragen[0].stukken, undefined);
  assert.ok(!JSON.stringify(v).includes('doelen'));
  // Een zin erbij vooraan: de juiste zin schuift mee.
  const b2 = bron(`Het was maandag. ${BAS}`);
  assert.deepEqual(b2.vragen[0].doelen[0].slice(0, 2), [11, 14]);
  assert.equal(K.auto(b2.vragen[0], [3]), 1);
  assert.match(K.problemen({ title: 't', vragen: [K.validate({ title: 't', vragen: [{ type: 'bron', titel: 'b', tekst: BAS, vragen: [{ type: 'markeren', vraag: 'x', inBron: true }] }] }).vragen[0]] }).join(), /duid in de brontekst aan/);
});

test('meerkeuze met meerdere juiste: alles of niets zoals vroeger, of per juist antwoord, en "duid er 2 aan"', () => {
  const oud = een({ type: 'meerkeuze', vraag: 'x', opties: ['a', 'b', 'c', 'd'], juist: [0, 1, 2], punten: 3 });
  assert.equal(K.auto(oud, [0, 1, 2]), 3);
  assert.equal(K.auto(oud, [0, 1]), 0);
  const per = een({ type: 'meerkeuze', vraag: 'x', opties: ['a', 'b', 'c', 'd'], juist: [0, 1, 2], puntenPer: 'juist' });
  assert.equal(per.punten, 3);
  assert.equal(K.auto(per, [0, 1]), 2);
  assert.equal(K.auto(per, [0, 1, 3]), 1);
  assert.equal(K.auto(per, [3]), 0);
  const twee = een({ type: 'meerkeuze', vraag: 'x', opties: ['a', 'b', 'c', 'd'], juist: [0, 1, 2], aantal: 2 });
  assert.equal(K.auto(twee, [0, 2]), 1);
  assert.equal(K.auto(twee, [0, 2, 3]), 0);
  assert.equal(K.viewOf(twee, '0').aantal, 2);
  const tweePer = een({ type: 'meerkeuze', vraag: 'x', opties: ['a', 'b', 'c', 'd'], juist: [0, 1, 2], aantal: 2, puntenPer: 'juist' });
  assert.equal(tweePer.punten, 2);
  assert.equal(K.auto(tweePer, [0, 1, 2]), 2);
  assert.equal(K.auto(tweePer, [0, 3]), 0);
});
