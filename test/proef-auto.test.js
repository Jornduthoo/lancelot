// De Proef: automatisch verbeteren als extra keuze (rekenrooster met sleutel, marge, kladruimte, lijnen tussen punten, cirkels).
const test = require('node:test');
const assert = require('node:assert');
const K = require('../public/js/pf-kern');

const beeld = 'data:image/webp;base64,AAAA';
const toets = (velden, extra = {}) => K.validate({ title: 't', vragen: [{ type: 'blad', beeld, verhouding: 1.414, velden, ...extra }] });
const blad = (velden, extra) => toets(velden, extra).vragen[0];
const SLEUTEL = '    1234\n×     56\n    7404\n   6170\n   69104';

test('rekenrooster zonder sleutel: de leerkracht verbetert, zoals vroeger', () => {
  const q = blad([{ x: 1, y: 1, w: 30, h: 10, soort: 'rooster', kol: 8, rij: 4, antwoord: '623', punten: 1 }]);
  assert.equal(K.handPunten(q), 1);
  assert.equal(K.autoPunten(q), 0);
  assert.deepEqual(K.vakGoed(q, ['  345\n+ 278\n  623']), [null]);
});

test('rekenrooster met sleutel: per rij, alles of alleen de uitkomst', () => {
  const v = { x: 1, y: 1, w: 30, h: 10, soort: 'rooster', kol: 12, rij: 6, sleutel: SLEUTEL, punten: 2 };
  const rijen = blad([{ ...v, nakijk: 'rijen' }]);
  assert.equal(K.handPunten(rijen), 0);
  assert.equal(K.autoPunten(rijen), 2);
  // Verschoven, met x in plaats van ×: toch juist.
  assert.equal(K.auto(rijen, ['  1234\nx 56\n 7404\n6170\n69104']), 2);
  // 3 van de 5 rijen juist: 3/5 van 2 punten = 1 (op een half punt).
  assert.equal(K.auto(rijen, ['1234\n56\n7404\n6160\n69004']), 1);
  // Een extra rij (onthouden cijfers) mag bij per rij.
  assert.equal(K.auto(rijen, ['   12\n1234\n56\n7404\n6170\n69104']), 2);
  const alles = blad([{ ...v, nakijk: 'alles' }]);
  assert.equal(K.auto(alles, ['1234\n×56\n7404\n6170\n69104']), 2);
  assert.equal(K.auto(alles, ['   12\n1234\n56\n7404\n6170\n69104']), 0);
  const uit = blad([{ ...v, nakijk: 'uitkomst', sleutel: undefined, uitkomst: '39393,6' }]);
  // De komma in een eigen hokje of bij een cijfer, een punt in plaats van een komma.
  assert.equal(K.auto(uit, ['4924,2\n\n3939|3,|6']), 2);
  assert.equal(K.auto(uit, ['4924,2\n\n39393.6']), 2);
  assert.equal(K.auto(uit, ['4924,2\n\n39394,6']), 0);
  // Een sleutel in het rooster en alleen de uitkomst: de onderste rij van de sleutel.
  const uit2 = blad([{ ...v, nakijk: 'uitkomst' }]);
  assert.equal(K.roosterUitkomst(uit2.velden[0]), '69104');
  assert.equal(K.auto(uit2, ['  1234\n   56\n 69104']), 2);
  // Een deling: het quotiënt in rij 2, naast de rest van de bewerking.
  const deling = blad([{ ...v, nakijk: 'uitkomst', sleutel: undefined, uitkomst: '246', uitkomstRij: 2 }]);
  assert.equal(K.auto(deling, ['1230  5\n-10   246\n 23\n-20\n  30']), 2);
  // Nakijken gekozen maar nog geen sleutel: een probleem, en de leerkracht verbetert tot dan.
  const zonder = toets([{ ...v, sleutel: undefined, nakijk: 'rijen' }]);
  assert.match(K.problemen(zonder).join(' '), /vakje 1 heeft nog geen antwoord/);
  assert.equal(K.handPunten(zonder.vragen[0]), 2);
});

test('roostertekst: een hokje met een cijfer en een komma blijft één hokje', () => {
  assert.equal(K.roosterTekst('39|39|3,|6', 12, 4), '39|39|3,|6');
  assert.deepEqual(K.roosterCellen('3|9|3,|6')[0], ['3', '9', '3,', '6']);
  assert.deepEqual(K.roosterCellen(' 12')[0], ['', '1', '2']);
});

test('marge bij een getal: ± getal, ± procent en van … tot …', () => {
  const q = blad([
    { x: 1, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '1800', van: '1700', tot: '2100', eenheid: 'm²' },
    { x: 1, y: 5, w: 10, h: 3, soort: 'tekst', antwoord: '2,5', marge: '0,1' },
    { x: 1, y: 9, w: 10, h: 3, soort: 'tekst', antwoord: '200', margeProcent: 5 },
  ]);
  assert.equal(q.velden[1].marge, 0.1);
  assert.deepEqual(K.vakGoed(q, ['1 950 m2', '2,6', '209']), [true, true, true]);
  assert.deepEqual(K.vakGoed(q, ['2200', '2,65', '211']), [false, false, false]);
  const s = K.veldSleutel(q);
  assert.equal(s[0], '≈ 1 800 (1 700 – 2 100) m²');
  assert.equal(s[1], '≈ 2,5 (2,4 – 2,6)');
});

test('getallen: cm2 en m2 met een gewone 2, en 0.194 is geen 194', () => {
  assert.equal(K.getal('6,8 cm2'), 6.8);
  assert.equal(K.getal('1800 m2'), 1800);
  assert.equal(K.getal('3 m3'), 3);
  assert.equal(K.getal('0.194'), 0.194);
  assert.equal(K.getal('1.000'), 1000);
  assert.equal(K.zelfde('6,8', '6,8 cm2', { eenheid: 'cm²' }), true);
  assert.equal(K.zelfde('1800', '1800 m2', { eenheid: 'm²' }), true);
  assert.equal(K.zelfde('0,194', '0.194'), true);
});

test('kladruimte telt niet mee en een vakje van 0 punten is geen werk voor de leerkracht', () => {
  const t = toets([
    { x: 1, y: 1, w: 30, h: 10, soort: 'klad', vorm: 'tekenen', punten: 3 },
    { x: 1, y: 20, w: 30, h: 10, soort: 'open', punten: 0 },
    { x: 1, y: 40, w: 10, h: 3, soort: 'tekst', antwoord: '5' },
  ], {});
  const q = t.vragen[0];
  assert.equal(q.velden[0].punten, 0);
  assert.equal(q.velden[0].vorm, 'tekenen');
  assert.equal(K.maxVan(q), 1);
  assert.deepEqual(K.handWerk(t), []);
  assert.deepEqual(K.vakGoed(q, ['data:image/png;base64,AAAA', 'iets', '5']), [null, null, true]);
  assert.equal(K.veldSleutel(q)[0], '');
});

test('lijnen tussen punten: juiste lijnen, of elke lijn door een punt', () => {
  const pt = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
  const q = blad([{ x: 10, y: 10, w: 40, h: 28.3, soort: 'puntlijn', pt, lijnen: [[2, 0], [1, 3]] }]);
  assert.deepEqual(q.velden[0].lijnen, [[0, 2], [1, 3]]);
  assert.deepEqual(K.vakGoed(q, ['3-1,0-2']), [true]);
  assert.deepEqual(K.vakGoed(q, ['0-2']), [false]);
  assert.deepEqual(K.vakGoed(q, ['0-2,1-3,0-1']), [false]);
  assert.equal(K.veldSleutel(q)[0], 'A–C, B–D');
  // Een middellijn door M (punt 4): A–C en B–D gaan erdoor, A–B niet.
  const m = blad([{ x: 10, y: 10, w: 40, h: 28.3, soort: 'puntlijn', pt: [...pt, { x: 50, y: 50 }], doorPunt: 4 }]);
  assert.deepEqual(K.vakGoed(m, ['0-2']), [true]);
  assert.deepEqual(K.vakGoed(m, ['1-3']), [true]);
  assert.deepEqual(K.vakGoed(m, ['0-1']), [false]);
  assert.deepEqual(K.vakGoed(m, ['0-4']), [false]);
  assert.deepEqual(K.vakGoed(m, ['0-2,1-3']), [false]);
  const leeg = toets([{ x: 10, y: 10, w: 40, h: 28.3, soort: 'puntlijn', pt }]);
  assert.match(K.problemen(leeg).join(' '), /nog geen antwoord/);
});

test('cirkel: middelpunt en straal in cm, met marge, volgens de schaal van het blad', () => {
  const v = { x: 0, y: 0, w: 50, h: 30, soort: 'cirkel', cirkels: [{ x: 50, y: 50, r: 2 }] };
  const q = blad([v]);
  assert.equal(q.velden[0].marge, 0.1);
  // A4: 21 cm breed, dus 2 cm = 9,524 % van de breedte.
  const s = (2 / 21) * 100;
  assert.deepEqual(K.vakGoed(q, [`50,50,${s}`]), [true]);
  assert.deepEqual(K.vakGoed(q, [`50,50,${(2.1 / 21) * 100}`]), [true]);
  assert.deepEqual(K.vakGoed(q, [`50,50,${(2.3 / 21) * 100}`]), [false]);
  // Het middelpunt 2 cm ernaast: fout.
  assert.deepEqual(K.vakGoed(q, [`${50 + (2 / 21) * 100 * 2},50,${s}`]), [false]);
  assert.deepEqual(K.vakGoed(q, [`50,50,${s};20,20,${s}`]), [false]);
  // Een blad dat 42 cm breed is: dezelfde cirkel op het scherm is dan 4 cm.
  const groot = blad([v], { schaal: 42 });
  assert.equal(groot.schaal, 42);
  assert.deepEqual(K.vakGoed(groot, [`50,50,${s}`]), [false]);
  assert.deepEqual(K.vakGoed(groot, [`50,50,${s / 2}`]), [true]);
  assert.equal(K.veldSleutel(q)[0], 'r = 2 cm (± 0,1)');
});

test('alles automatisch verbeteren: de lijst van wat de leerkracht nog zelf verbetert', () => {
  const t = K.validate({ title: 't', auto: true, vragen: [
    { type: 'open', vraag: 'Waarom?' },
    { type: 'rekenen', vraag: '3 x 4', antwoord: '12', werkPunten: 1 },
    { type: 'blad', beeld, verhouding: 1.414, velden: [
      { x: 1, y: 1, w: 30, h: 10, soort: 'rooster', punten: 1 },
      { x: 1, y: 20, w: 30, h: 10, soort: 'rooster', nakijk: 'uitkomst', uitkomst: '12', punten: 1 },
      { x: 1, y: 40, w: 30, h: 10, soort: 'teken', punten: 2 },
    ] },
  ] });
  assert.equal(t.auto, true);
  const lijst = K.handWerk(t).map(x => x.tekst);
  assert.deepEqual(lijst, ['vraag 1: open vraag', 'vraag 2: de bewerking (1 punt)', 'blad 3, vakje 1: rekenrooster zonder sleutel', 'blad 3, vakje 3: tekenvak']);
  assert.equal(K.validate({ title: 't', vragen: [{ type: 'kort', vraag: 'a', antwoord: '1' }] }).auto, undefined);
});
