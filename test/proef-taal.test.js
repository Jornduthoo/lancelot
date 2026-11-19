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

const IMG_A = 'data:image/webp;base64,UklGRaaa';
const IMG_B = 'data:image/webp;base64,UklGRbbb';

test('ordenen: oud blijft alles juist, nieuw per juiste plaats en met prenten', () => {
  const oud = een({ type: 'ordenen', vraag: 'x', items: ['a', 'b', 'c'], punten: 2 });
  assert.deepEqual(oud.items, ['a', 'b', 'c']);
  assert.equal(oud.puntenPer, undefined);
  assert.equal(K.auto(oud, [0, 1, 2]), 2);
  assert.equal(K.auto(oud, [1, 0, 2]), 0);
  const per = een({ type: 'ordenen', vraag: 'x', items: ['a', 'b', 'c', 'd'], puntenPer: 'plaats' });
  assert.equal(per.punten, 4);
  assert.equal(K.auto(per, [0, 1, 3, 2]), 2);
  assert.equal(K.auto(per, [0, 1, 2, 3]), 4);
  const pr = een({ type: 'ordenen', vraag: 'x', items: [{ tekst: 'op', beeld: IMG_A }, { tekst: '', beeld: IMG_B }, 'school'] });
  assert.deepEqual(pr.items[0], { tekst: 'op', beeld: IMG_A });
  assert.equal(K.itemTekst(pr, 2), 'school');
  const v = K.viewOf(pr, '0');
  assert.ok(JSON.stringify(v).includes(IMG_B));
  assert.equal(K.auto(pr, [0, 1, 2]), pr.punten);
});

test('sorteren: punten per juist gesorteerd woord, extra woorden horen nergens', () => {
  const q = een({ type: 'sorteren', vraag: 'x', kolommen: [{ naam: '-je', woorden: ['boompje', 'huisje'] }, { naam: '-tje', woorden: ['stoeltje'] }], extra: ['fiets'] });
  assert.equal(q.punten, 3);
  const v = K.viewOf(q, '0');
  assert.deepEqual(v.kolommen, ['-je', '-tje']);
  assert.equal(v.woorden.length, 4);
  assert.ok(!JSON.stringify(v).includes('extra'));
  const ant = w => v.woorden.map(x => (w[x] === undefined ? null : w[x]));
  assert.equal(K.auto(q, ant({ boompje: 0, huisje: 0, stoeltje: 1 })), 3);
  assert.equal(K.auto(q, ant({ boompje: 0, huisje: 1, stoeltje: 1 })), 2);
  assert.equal(K.auto(q, ant({ boompje: 0, huisje: 0, stoeltje: 1, fiets: 0 })), 2);
  assert.equal(K.auto(q, ant({})), 0);
  assert.throws(() => een({ type: 'sorteren', vraag: 'x', kolommen: [{ naam: 'a', woorden: ['b'] }] }));
});

test('dictee: woorden of zinnen, een fout, ontbrekend of extra woord is één fout; hoofdletters tellen, leestekens niet', () => {
  const z = een({ type: 'dictee', vraag: 'Schrijf', vorm: 'zinnen', delen: ['De kat slaapt op de mat.', 'Jan fietst naar Gent.'] });
  assert.equal(z.punten, 10);
  assert.equal(K.auto(z, ['De kat slaapt op de mat.', 'Jan fietst naar Gent.']), 10);
  assert.equal(K.auto(z, ['De kat slaapt op de mat', 'Jan fietst naar Gent']), 10); // leestekens tellen niet
  assert.equal(K.auto(z, ['De kat slaapt op de mat.', 'jan fietst naar Gent.']), 9); // hoofdletter vergeten
  assert.equal(K.auto(z, ['De kat slaap op de mat.', 'Jan fietst Gent.']), 8); // fout woord + ontbrekend woord
  assert.equal(K.auto(z, ['De kat slaapt op op de mat.', '']), 5); // extra woord, lege zin
  const v = K.dicteeVergelijk(z, 'De kat slaapt op de mat.', 'De kat slaap op de mat.');
  assert.equal(v.fouten, 1);
  assert.deepEqual(v.woorden.map(w => w[1]), [true, true, false, true, true, true]);
  // Twee punten per zin: elke fout kost er één, nooit onder nul.
  const pz = een({ type: 'dictee', vraag: 'x', vorm: 'zinnen', delen: ['De kat slaapt.', 'Jan fietst.'], puntenZin: 2 });
  assert.equal(pz.punten, 4);
  assert.equal(K.auto(pz, ['De hond slaapt.', 'jan loopt hard.']), 1);
  const zonder = een({ type: 'dictee', vraag: 'x', vorm: 'zinnen', delen: ['Jan fietst.'], hoofdletters: false, leestekens: true });
  assert.equal(K.auto(zonder, ['jan fietst.']), zonder.punten);
  assert.equal(K.auto(zonder, ['jan fietst']), 1); // het punt ontbreekt: één fout
  const w = een({ type: 'dictee', vraag: 'x', delen: [{ tekst: 'fiets', zin: 'Ik heb een nieuwe fiets.' }, 'boom'] });
  assert.equal(w.punten, 2);
  assert.equal(K.auto(w, ['fiets', 'Boom']), 1);
  const view = K.viewOf(w, '0');
  assert.equal(view.delen[0].zeg, 'fiets. Ik heb een nieuwe fiets. fiets.');
  assert.equal(K.oplossing(w), 'fiets\nboom');
  assert.throws(() => een({ type: 'dictee', vraag: 'x', delen: [] }));
});

test('voorlezen: een tekst bij elke vraag die de leerling hoort maar niet ziet', () => {
  const q = een({ type: 'kort', vraag: 'Welk woord hoor je?', antwoord: 'fiets', voorlees: 'fiets' });
  assert.equal(q.voorlees, 'fiets');
  assert.equal(K.viewOf(q, '0').voorlees, 'fiets');
  assert.equal(een({ type: 'kort', vraag: 'x', antwoord: '1' }).voorlees, undefined);
});
