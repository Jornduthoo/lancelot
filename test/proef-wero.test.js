// De Proef: wensen bij de WERO-thematoetsen (vragen die samen blijven bij het schudden, meerdere antwoordvakjes).
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');

const mk = (vraag, extra = {}) => ({ type: 'meerkeuze', vraag, opties: ['a', 'b'], juist: 0, ...extra });

test('schudden: zonder "blijft" dezelfde volgorde als vroeger', () => {
  const t = K.validate({ title: 't', vragen: Array.from({ length: 8 }, (_, i) => mk(`v${i}`)) });
  // De oude manier: alle vragen (geen blad) door elkaar met dezelfde seed.
  const oud = K.schud(8, 's|vragen');
  assert.deepEqual(K.volgorde(t.vragen, 's|vragen', true), oud);
});

test('schudden: een vraag met "blijft" staat altijd meteen na de vraag ervoor', () => {
  const vragen = Array.from({ length: 9 }, (_, i) => mk(`v${i}`, i === 3 || i === 4 || i === 0 ? { blijft: true } : {}));
  const t = K.validate({ title: 't', vragen });
  assert.equal(t.vragen[3].blijft, true);
  for (let s = 0; s < 40; s++) {
    const o = K.volgorde(t.vragen, `seed${s}`, true);
    assert.deepEqual([...o].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const p = o.indexOf(2);
    assert.deepEqual(o.slice(p, p + 3), [2, 3, 4]);
  }
  // Niet geschud: gewoon de volgorde van de toets.
  assert.deepEqual(K.volgorde(t.vragen, 'x', false), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('schudden: een blad blijft op zijn plaats, samen met de vraag die erbij blijft', () => {
  const beeld = 'data:image/webp;base64,AAAA';
  const blad = { type: 'blad', beeld, verhouding: 1.414, velden: [{ x: 1, y: 1, w: 10, h: 5, soort: 'tekst', antwoord: '1' }] };
  const t = K.validate({ title: 't', vragen: [mk('a'), blad, mk('b', { blijft: true }), mk('c'), mk('d'), mk('e')] });
  for (let s = 0; s < 20; s++) {
    const o = K.volgorde(t.vragen, `s${s}`, true);
    assert.deepEqual(o.slice(1, 3), [1, 2]);
  }
});

test('meerdere antwoordvakjes: elk ander goed antwoord telt, in elke volgorde', () => {
  const t = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'Geef 3 organen.', antwoord: 'hart|longen = long|maag|lever', vakjes: 3 }] });
  const q = t.vragen[0];
  assert.equal(q.vakjes, 3);
  assert.equal(q.punten, 3);
  assert.equal(K.viewOf(q, '0').vakjes, 3);
  assert.equal(K.auto(q, ['Maag', 'long', 'hart']), 3);
  // Hetzelfde antwoord twee keer (ook in een andere schrijfwijze) telt één keer.
  assert.equal(K.auto(q, ['longen', 'long', 'hart']), 2);
  assert.equal(K.auto(q, ['hart', 'nier', '']), 1);
  assert.deepEqual(K.vakjesGoed(q, ['nier', 'lever', 'hart']), [false, true, true]);
  assert.deepEqual(K.schoon(q, ['a', 'b', 'c', 'd']), ['a', 'b', 'c']);
  assert.equal(K.oplossing(q), '3 van: hart · longen · maag · lever');
  // Te weinig goede antwoorden voor het aantal vakjes: een duidelijke melding.
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'a|b', vakjes: 3 }] }), /minstens 3 goede antwoorden/);
  // Eén vakje: zoals vroeger.
  const een = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'a|b' }] }).vragen[0];
  assert.equal(een.vakjes, undefined);
  assert.equal(K.auto(een, 'b'), 1);
});

test('datum: elke gewone schrijfwijze van dezelfde datum is juist', () => {
  const q = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'Wanneer viel Japan Pearl Harbor aan?', antwoord: '7 december 1941', datum: true }] }).vragen[0];
  assert.equal(q.datum, true);
  for (const a of ['7 december 1941', '7/12/1941', '07-12-1941', '7 dec. 1941', '7.12.1941', 'zondag 7 december 1941', '7 Dec 1941', '7de december 1941']) assert.equal(K.auto(q, a), 1, a);
  for (const a of ['8 december 1941', '7/11/1941', '1941', 'december 1941', '7-12-41']) assert.equal(K.auto(q, a), 0, a);
  // Zonder vinkje: zoals vroeger, alleen de getypte schrijfwijze.
  const oud = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: '7 december 1941' }] }).vragen[0];
  assert.equal(K.auto(oud, '7/12/1941'), 0);
  // Ook met meerdere vakjes, en een juist antwoord dat geen datum is geeft een duidelijke melding.
  const twee = K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: '1 september 1939|8 mei 1945', datum: true, vakjes: 2 }] }).vragen[0];
  assert.equal(K.auto(twee, ['8/5/1945', '01-09-1939']), 2);
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'x', antwoord: 'de oorlog', datum: true }] }), /geen datum/);
});

test('verbinden met prenten: elke kant mag een prent zijn, oud blijft gelijk', () => {
  const b = 'data:image/webp;base64,AAAA';
  const t = K.validate({ title: 't', vragen: [
    { type: 'verbinden', vraag: 'v', paren: [['', 'rood'], ['Driehoek', '']], prenten: [[b, ''], ['', b]] },
    { type: 'verbinden', vraag: 'v', paren: [['Antwerpen', 'Schelde'], ['Luik', 'Maas']] },
  ] });
  const [q, oud] = t.vragen;
  assert.deepEqual(q.prenten, [[b, ''], ['', b]]);
  assert.equal(oud.prenten, undefined);
  const v = K.viewOf(q, '0', { 0: [1, 0] });
  assert.deepEqual(v.rechts, ['', 'rood']);
  assert.deepEqual(v.linksBeeld, [b, '']);
  assert.deepEqual(v.rechtsBeeld, [b, '']);
  assert.equal(K.viewOf(oud, '1').linksBeeld, undefined);
  assert.equal(K.auto(q, [0, 1]), q.punten);
  assert.equal(K.oplossing(q), 'prent 1 = rood · Driehoek = prent 2');
  // Zonder tekst en zonder prent: niet volledig.
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'verbinden', vraag: 'v', paren: [['', 'rood'], ['a', 'b']] }] }), /niet volledig/);
});

test('groeperen: wat samen staat telt, de kleur niet; per groep of per kaartje', () => {
  const b = 'data:image/webp;base64,AAAA';
  const t = K.validate({ title: 't', vragen: [
    { type: 'groeperen', vraag: 'v', groepen: [['Raad', 'Commissie', { tekst: '', beeld: b }], ['euro', 'cent'], ['Brussel', 'Straatsburg']] },
    { type: 'groeperen', vraag: 'v', groepen: [['a', 'b'], ['c', 'd']], puntenPer: 'kaart' },
  ] });
  const [q, k] = t.vragen;
  assert.equal(q.punten, 3);
  assert.equal(k.punten, 4);
  // Kaartjes in deze volgorde: Raad, Commissie, prent, euro, cent, Brussel, Straatsburg. Kleuren omgewisseld: toch juist.
  assert.equal(K.auto(q, [2, 2, 2, 0, 0, 1, 1]), 3);
  // De prent in de verkeerde groep: twee groepen kloppen niet meer.
  assert.equal(K.auto(q, [2, 2, 0, 0, 0, 1, 1]), 1);
  assert.equal(K.auto(q, []), 0);
  assert.equal(K.auto(k, [1, 1, 0, 0]), 4);
  assert.equal(K.auto(k, [1, 0, 0, 0]), 3);
  assert.equal(K.auto(k, [1, 1, 1, 1]), 2);
  const v = K.viewOf(q, '0', { 0: [6, 5, 4, 3, 2, 1, 0] });
  assert.equal(v.kleuren, 3);
  assert.deepEqual(v.kaarten.map(x => x.i), [6, 5, 4, 3, 2, 1, 0]);
  assert.equal(v.kaarten[4].beeld, b);
  assert.deepEqual(K.schoon(q, [0, '1', 9, null, 'x']), [0, 1, null, null, null]);
  assert.equal(K.oplossing(k), 'a, b | c, d');
  assert.throws(() => K.validate({ title: 't', vragen: [{ type: 'groeperen', vraag: 'v', groepen: [['a', 'b']] }] }), /minstens twee groepen/);
});

test('aankruisen met deelpunten: per juist hokje, of een fout hokje kost er één', () => {
  const beeld = 'data:image/webp;base64,AAAA';
  const hokje = (x, antwoord, groep, deelpunten) => ({ x, y: 1, w: 3, h: 3, soort: 'kruis', antwoord, groep, ...(deelpunten ? { deelpunten } : {}) });
  const velden = g => [hokje(1, true, g.groep, g.d), hokje(5, true, g.groep, g.d), hokje(9, true, g.groep, g.d), hokje(13, false, g.groep, g.d), hokje(17, false, g.groep, g.d)];
  const q = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden: [...velden({ groep: 1 }), ...velden({ groep: 2, d: 'juist' }), ...velden({ groep: 3, d: 'min' })] }] }).vragen[0];
  assert.equal(q.velden[5].deelpunten, 'juist');
  assert.equal(q.punten, 9);
  // Twee van de drie juiste aangekruist en één foute, in elke groep.
  const a = [true, true, false, true, false, true, true, false, true, false, true, true, false, true, false];
  // Alles juist (zoals vroeger): 0; per juist hokje: 2; met een min voor een fout: 1.
  assert.equal(K.auto(q, a), 0 + 2 + 1);
  // Alles juist aangekruist: overal de volle punten.
  const alles = [true, true, true, false, false, true, true, true, false, false, true, true, true, false, false];
  assert.equal(K.auto(q, alles), 9);
  // Een bolletje (één keuze) kan geen deelpunten hebben.
  const rond = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden: [{ ...hokje(1, true, 1, 'juist'), rond: true }, { ...hokje(5, false, 1, 'juist'), rond: true }] }] }).vragen[0];
  assert.equal(rond.velden[0].deelpunten, undefined);
});

test('per woord, begint met, bevat: bij kort antwoord en bij een vakje op een blad', () => {
  const t = K.validate({ title: 't', vragen: [
    { type: 'kort', vraag: 'Zet in het meervoud: Le chat noir dort.', antwoord: 'Les chats noirs dorment.', controle: 'woord' },
    { type: 'kort', vraag: 'Verzin een vraag met est-ce que.', antwoord: 'Est-ce que vous avez', controle: 'begint' },
    { type: 'kort', vraag: 'Waar ging je naartoe?', antwoord: 'cinéma|piscine', controle: 'bevat' },
    { type: 'kort', vraag: 'oud', antwoord: 'Les chats noirs dorment.' },
  ] });
  const [w, b, c, oud] = t.vragen;
  assert.equal(w.punten, 4);
  assert.equal(K.auto(w, 'les chats noirs dorment'), 4);
  assert.equal(K.auto(w, 'Les chat noirs dorment.'), 3);
  assert.equal(K.auto(w, 'Les chats dorment.'), 3);
  assert.equal(K.auto(w, 'Les chats noirs dorment bien.'), 3);
  assert.equal(K.auto(b, 'Est-ce que vous avez un chien ?'), 1);
  assert.equal(K.auto(b, 'est ce que vous avez des frères'), 1);
  assert.equal(K.auto(b, 'Vous avez un chien ?'), 0);
  assert.equal(K.auto(c, "J'ai été au cinéma."), 1);
  assert.equal(K.auto(c, 'cinémas'), 0);
  assert.equal(K.oplossing(b), 'begint met: Est-ce que vous avez');
  // Zonder keuze: alles of niets, zoals vroeger.
  assert.equal(K.auto(oud, 'Les chat noirs dorment.'), 0);
  // Op een blad: een vakje per woord.
  const beeld = 'data:image/webp;base64,AAAA';
  const q = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden: [{ x: 1, y: 1, w: 40, h: 4, soort: 'tekst', antwoord: 'Les chats noirs dorment.', controle: 'woord', punten: 4 }, { x: 1, y: 9, w: 40, h: 4, soort: 'tekst', antwoord: 'Est-ce que vous avez', controle: 'begint' }] }] }).vragen[0];
  assert.equal(K.auto(q, ['Les chat noirs dorment.', 'Est-ce que vous avez faim ?']), 4);
  assert.deepEqual(K.veldSleutel(q), ['Les chats noirs dorment.', 'begint met: Est-ce que vous avez']);
});

test('meer labels in één plek-kader: elk label op zijn eigen plek', () => {
  const beeld = 'data:image/webp;base64,AAAA';
  const q = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden: [
    { x: 10, y: 10, w: 40, h: 40, soort: 'plek', label: 'a', doel: { x: 20, y: 20, r: 8 }, meer: [{ label: 'b', doel: { x: 70, y: 20, r: 8 } }, { label: 'c', doel: { x: 50, y: 80, r: 8 } }, { label: 'd' }] },
    { x: 60, y: 10, w: 20, h: 20, soort: 'plek', label: 'x', doel: { x: 50, y: 50, r: 10 } },
  ] }] }).vragen[0];
  // Een label zonder plek valt weg; een punt per label.
  assert.deepEqual(q.velden[0].meer.map(m => m.label), ['b', 'c']);
  assert.equal(q.velden[0].punten, 3);
  assert.deepEqual(K.viewOf(q, '0').velden[0].meer, ['b', 'c']);
  assert.equal(K.auto(q, ['20,20|70,21|50,80', '50,50']), 4);
  assert.equal(K.auto(q, ['20,20|50,80|', '50,50']), 2);
  assert.equal(K.auto(q, ['|70,20|', '']), 1);
  // Een gewoon kader blijft zoals vroeger.
  assert.equal(K.plekDeel(q.velden[1], '50,50'), 1);
});

test('een woordenbank per groepje sleepvakjes', () => {
  const beeld = 'data:image/webp;base64,AAAA';
  const sleep = (x, antwoord, extra) => ({ x, y: 1, w: 8, h: 3, soort: 'sleep', antwoord, ...extra });
  const q = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, woorden: ['fout'], velden: [
    sleep(1, 'le'), sleep(10, 'chat', { bank: 1, extra: 'chien / chats' }), sleep(20, 'noir', { bank: 1 }), sleep(30, 'mange', { bank: 2 }), sleep(40, 'dort', { bank: 2 }),
  ] }] }).vragen[0];
  assert.equal(q.velden[1].bank, 1);
  assert.deepEqual(q.velden[1].extra, ['chien', 'chats']);
  const v = K.viewOf(q, '0');
  assert.deepEqual(v.bank, ['fout', 'le']);
  assert.deepEqual(v.banken, { 1: ['chat', 'chats', 'chien', 'noir'], 2: ['dort', 'mange'] });
  assert.equal(v.velden[3].bank, 2);
  assert.equal(K.auto(q, ['le', 'chat', 'noir', 'dort', 'mange']), 3);
  // Zonder bank: één bank zoals vroeger.
  const oud = K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden: [sleep(1, 'a'), sleep(10, 'b')] }] }).vragen[0];
  assert.deepEqual(K.viewOf(oud, '0').bank, ['a', 'b']);
  assert.equal(K.viewOf(oud, '0').banken, undefined);
});

test('Dictee: een woordgroep met een spatie is één deel, en de apostrof van ’s telt mee', () => {
  const t = K.validate({ titel: 'd', vragen: [{ type: 'dictee', vraag: 'Schrijf.', vorm: 'woorden', delen: ["'s nachts", 'in plaats van', 'fiets'], hoofdletters: false }] });
  const q = t.vragen[0];
  assert.strictEqual(K.dicteeDeel(q, q.delen[0], "'s nachts"), 1);
  assert.strictEqual(K.dicteeDeel(q, q.delen[0], '’s Nachts'), 1);
  assert.strictEqual(K.dicteeDeel(q, q.delen[0], 's nachts'), 0);
  assert.strictEqual(K.dicteeDeel(q, q.delen[1], 'in  plaats van'), 1);
  assert.strictEqual(K.dicteeDeel(q, q.delen[1], 'inplaats van'), 0);
  assert.strictEqual(K.dicteeDeel(q, q.delen[2], 'Fiets.'), 1);
  assert.strictEqual(K.dicteeDeel(q, q.delen[2], 'fiets fiets'), 0);
  assert.strictEqual(K.dicteeDeel(q, q.delen[2], ''), 0);
});

test('Voorleestekst: lang mag (tot 6000 tekens), ook bij een bron, met een maximum aantal keer luisteren', () => {
  const lang = 'Dit is een zin om te beluisteren. '.repeat(100).trim();
  assert.ok(lang.length > 3000);
  const t = K.validate({ titel: 'l', vragen: [
    { type: 'bron', titel: 'Luistertekst', tekst: '', voorlees: lang, luisterMax: 2, vragen: [{ type: 'kort', vraag: 'Wat hoor je?', antwoord: 'zin' }] },
    { type: 'kort', vraag: 'Wat hoor je?', antwoord: 'zin', voorlees: lang },
  ] });
  assert.strictEqual(t.vragen[0].voorlees, lang);
  assert.strictEqual(t.vragen[0].luisterMax, 2);
  assert.strictEqual(t.vragen[1].voorlees, lang);
  const v = K.studentView(t, t.vragen);
  assert.strictEqual(v.pages[0].voorlees, lang);
  assert.strictEqual(v.pages[0].luisterMax, 2);
  // Zonder voorleestekst en zonder geluid: geen maximum.
  const u = K.validate({ titel: 'l', vragen: [{ type: 'bron', titel: 'B', tekst: 'Tekst.', luisterMax: 2, vragen: [{ type: 'kort', vraag: 'V?', antwoord: 'x' }] }] });
  assert.strictEqual(u.vragen[0].luisterMax, undefined);
});

test('Verbinden: afleiders rechts horen nergens bij, de punten blijven per paar', () => {
  const t = K.validate({ titel: 'v', vragen: [{ type: 'verbinden', vraag: 'Verbind.', paren: [['Antwerpen', 'Schelde'], ['Luik', 'Maas']], afleiders: ['Leie', '', 'IJzer'] }] });
  const q = t.vragen[0];
  assert.deepStrictEqual(q.afleiders, ['Leie', 'IJzer']);
  assert.strictEqual(K.aantalRechts(q), 4);
  const perm = K.schud(4, 'x', true);
  const v = K.studentView(t, t.vragen, { perms: { 0: perm } }).pages[0];
  assert.strictEqual(v.rechts.length, 4);
  assert.deepStrictEqual([...v.rechts].sort(), ['IJzer', 'Leie', 'Maas', 'Schelde']);
  const pos = w => v.rechts.indexOf(w);
  assert.deepStrictEqual(K.canoniek(q, [pos('Schelde'), pos('Leie')], perm), [0, 2]);
  assert.strictEqual(K.auto(q, [0, 2]), 1);
  assert.strictEqual(K.auto(q, [0, 1]), 2);
  assert.strictEqual(K.paarTekst(q, 3, 1), 'IJzer');
  assert.match(K.oplossing(q), /hoort nergens bij: Leie, IJzer/);
  // Zonder afleiders: precies zoals vroeger.
  const oud = K.validate({ titel: 'v', vragen: [{ type: 'verbinden', vraag: 'Verbind.', paren: [['a', 'b'], ['c', 'd']] }] }).vragen[0];
  assert.strictEqual(oud.afleiders, undefined);
  assert.strictEqual(K.aantalRechts(oud), 2);
});
