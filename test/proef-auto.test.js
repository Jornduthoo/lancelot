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

test('veelhoek op roosterpunten: de computer herkent de soort', () => {
  const F = s => K.figurenVan(s.split(';').map(p => p.split(',').map(Number)));
  assert.equal(F('0,0;2,0;2,2;0,2')[0], 'vierkant');
  assert.ok(F('0,0;2,0;2,2;0,2').includes('ruit') && F('0,0;2,0;2,2;0,2').includes('parallellogram'));
  assert.equal(F('0,0;3,0;3,2;0,2')[0], 'rechthoek');
  assert.equal(F('1,0;2,1;1,2;0,1')[0], 'vierkant'); // een gedraaid vierkant
  assert.equal(F('0,0;2,1;4,0;2,-1')[0], 'ruit');
  assert.equal(F('0,0;3,0;4,2;1,2')[0], 'parallellogram');
  assert.equal(F('0,0;4,0;3,2;1,2')[0], 'gelijkbenig trapezium');
  assert.equal(F('0,0;4,0;2,2;0,2')[0], 'rechthoekig trapezium');
  assert.equal(F('0,0;1,2;0,3;-1,2')[0], 'vlieger');
  assert.equal(F('0,0;3,0;0,4')[0], 'rechthoekige driehoek');
  assert.equal(F('0,0;4,0;2,3')[0], 'gelijkbenige driehoek');
  assert.ok(F('0,0;5,0;1,1').includes('stomphoekige driehoek'));
  assert.deepEqual(F('0,0;1,0;2,0;1,1'), []); // drie punten op één lijn
  assert.deepEqual(F('0,0;2,2;2,0;0,2'), []); // zijden die kruisen
  const v = { x: 0, y: 0, w: 30, h: 30 / 1.414, soort: 'veelhoek', kol: 6, rij: 6, figuur: 'rechthoek' };
  const q = blad([v, { ...v, y: 50, strikt: true }]);
  assert.equal(q.velden[1].strikt, true);
  assert.equal(K.autoPunten(q), 2);
  assert.deepEqual(K.vakGoed(q, ['0,0;2,0;2,2;0,2', '0,0;2,0;2,2;0,2']), [true, false]);
  assert.deepEqual(K.vakGoed(q, ['0,0;3,0;3,2;0,2', '0,0;3,0;3,2;0,2']), [true, true]);
  assert.deepEqual(K.vakGoed(q, ['0,0;3,0', '']), [false, false]);
  // De uiteinden van de diagonalen na elkaar aangetikt: toch de bedoelde figuur (rondom).
  assert.deepEqual(K.rondom([[4, 1], [1, 3], [7, 3], [4, 5]]).map(String), ['4,1', '7,3', '4,5', '1,3']);
  const ruit = { x: 0, y: 0, w: 30, h: 30 / 1.414, soort: 'veelhoek', kol: 9, rij: 7, figuur: 'ruit', strikt: true };
  assert.deepEqual(K.vakGoed(blad([ruit]), ['4,1;1,3;7,3;4,5']), [true]);
  assert.deepEqual(K.vakGoed(blad([ruit]), ['4,1;7,3;4,5;1,3']), [true]);
  assert.equal(K.veldSleutel(q)[0], 'rechthoek');
  assert.equal(K.veldSleutel(q)[1], 'precies een rechthoek');
  const leeg = toets([{ ...v, figuur: undefined }]);
  assert.match(K.problemen(leeg).join(' '), /nog geen antwoord/);
});

test('gevolgfout: juist volgens een rekenregel met de eigen antwoorden', () => {
  assert.equal(K.rekenregel('{1} * {2} / 2', n => [8, 7][n - 1]), 28);
  assert.equal(K.rekenregel('({1} + 2) × 3 : 2', () => 4), 9);
  assert.equal(K.rekenregel('{1} * 1,5', () => 2), 3);
  assert.equal(K.formuleFout('{1} * {2}', 3, 2), '');
  assert.match(K.formuleFout('12 * 2', 3, 2), /gebruik een vakje/);
  assert.match(K.formuleFout('{9} * 2', 3, 2), /vakje 9 kan niet/);
  assert.match(K.formuleFout('{3} * 2', 3, 2), /vakje 3 kan niet/);
  assert.match(K.formuleFout('alert({1})', 3, 2), /alleen getallen/);
  const q = blad([
    { x: 1, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '8' },
    { x: 1, y: 5, w: 10, h: 3, soort: 'tekst', antwoord: '6' },
    { x: 1, y: 9, w: 10, h: 3, soort: 'tekst', antwoord: '24', formule: '{1} * {2} / 2' },
  ]);
  assert.deepEqual(K.vakGoed(q, ['8', '6', '24']), [true, true, true]);
  // Fout gemeten (7 in plaats van 8), maar juist verder gerekend.
  assert.deepEqual(K.vakGoed(q, ['7', '6', '21']), [false, true, true]);
  assert.deepEqual(K.vakGoed(q, ['7', '6', '22']), [false, true, false]);
  assert.deepEqual(K.vakGoed(q, ['', '6', '21']), [false, true, false]);
  // Afronden: zoveel cijfers na de komma als de leerling of de sleutel geeft.
  assert.deepEqual(K.vakGoed(q, ['7', '5', '17,5']), [false, false, true]);
  assert.deepEqual(K.vakGoed(q, ['7,3', '5', '18,3']), [false, false, true]);
  const fout = toets([{ x: 1, y: 1, w: 10, h: 3, soort: 'tekst', antwoord: '24', formule: '{4} * 2' }]);
  assert.match(K.problemen(fout).join(' '), /rekenregel van vakje 1 klopt niet/);
});

test('veelhoek: eerst de diagonalen en een korte uitleg in het vak (extra keuzes)', () => {
  const blad = v => K.validate({ title: 't', vragen: [{ type: 'blad', beeld: 'data:image/webp;base64,AAAA', velden: [{ soort: 'veelhoek', x: 10, y: 10, w: 50, h: 40, kol: 7, rij: 7, figuur: 'ruit', ...v }] }] }).vragen[0];
  const oud = blad({});
  assert.equal(oud.velden[0].diagonalen, undefined);
  assert.equal(oud.velden[0].uitleg, undefined);
  const d = blad({ diagonalen: true, uitleg: 'Tik eerst de diagonalen aan.' });
  assert.equal(d.velden[0].diagonalen, true);
  assert.equal(K.viewOf(d, '0').velden[0].uitleg, 'Tik eerst de diagonalen aan.');
  // Diagonalen (3,0)-(3,6) en (1,3)-(5,3): een ruit.
  const diag = '3,0;3,6;1,3;5,3';
  assert.equal(K.auto(d, [diag]), 1);
  // Zonder de keuze telt dezelfde tik-volgorde ook (de punten gaan vanzelf rondom).
  assert.equal(K.auto(oud, [diag]), 1);
  assert.equal(K.auto(d, ['3,0;3,6;1,3;4,3']), 0);
});

test('invulvakjes: eenheid tonen, precies deze breuk, volgorde vrij, tijd en doorstreept', () => {
  const t = toets([
    { x: 1, y: 1, w: 5, h: 5, soort: 'tekst', antwoord: '4 u 30 min', tijd: true },
    { x: 1, y: 10, w: 5, h: 5, soort: 'breuk', antwoord: '25/100', precies: true },
    { x: 1, y: 20, w: 5, h: 5, soort: 'tekst', doorstreep: true },
    { x: 1, y: 30, w: 5, h: 5, soort: 'tekst', antwoord: '12', vrij: 1 },
    { x: 1, y: 40, w: 5, h: 5, soort: 'tekst', antwoord: '15', vrij: 1 },
    { x: 1, y: 50, w: 5, h: 5, soort: 'tekst', antwoord: '8', eenheid: 'm²', toonEenheid: true },
    { x: 1, y: 60, w: 5, h: 5, soort: 'tekst', antwoord: '3', vrij: 2 },
  ]);
  const q = t.vragen[0];
  // Een groepje van één vakje valt weg; de eenheid staat alleen op het scherm als de leerkracht dat koos.
  assert.equal(q.velden[6].vrij, undefined);
  assert.equal(K.viewOf(q).velden[5].eenheid, 'm²');
  assert.equal(K.viewOf(q).velden[0].eenheid, undefined);
  assert.equal(K.viewOf(q).velden[2].doorstreep, undefined);
  assert.deepEqual(K.vakDeel(q, ['270 min', '25/100', 'x', '15', '12', '8', '3']), [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(K.vakDeel(q, ['4,5 u', '1/4', '', '15', '15', '8 m²', '3']), [1, 0, 1, 1, 0, 1, 1]);
  assert.deepEqual(K.vakDeel(q, ['4,5 min', '25 / 100', 'iets', '12', '', '', '']), [0, 1, 0, 1, 0, 0, 0]);
  for (const s of ['4u30', '4:30', '4 uur en 30 minuten', '4.5 h', '4 u 30']) assert.equal(K.tijdSec(s), 16200, s);
  assert.equal(K.tijdSec('270', 'min'), 16200);
  assert.equal(K.veldSleutel(q)[2], 'leeg of doorstreept');
  // Zonder de nieuwe keuzes blijft alles zoals vroeger: 1/4 is gelijk aan 25/100.
  const oud = toets([{ x: 1, y: 1, w: 5, h: 5, soort: 'breuk', antwoord: '25/100' }, { x: 1, y: 10, w: 5, h: 5, soort: 'tekst', antwoord: '12' }, { x: 1, y: 20, w: 5, h: 5, soort: 'tekst', antwoord: '15' }]).vragen[0];
  assert.deepEqual(K.vakDeel(oud, ['1/4', '15', '12']), [1, 0, 0]);
});

test('rekenrooster: een deling (quotiënt en rest) en elk hokje apart (grondplan)', () => {
  const q = blad([
    { x: 1, y: 1, w: 30, h: 30, soort: 'rooster', kol: 9, rij: 8, nakijk: 'deling', quotient: '246', rest: '4' },
    { x: 40, y: 1, w: 30, h: 30, soort: 'rooster', kol: 4, rij: 3, nakijk: 'cellen', sleutel: '21 3\n 1x' },
    { x: 1, y: 50, w: 30, h: 30, soort: 'rooster', kol: 6, rij: 4, nakijk: 'deling', quotient: '4' },
    { x: 40, y: 50, w: 30, h: 30, soort: 'rooster', kol: 6, rij: 4, nakijk: 'deling' },
  ]);
  assert.equal(K.roosterAuto(q.velden[3]), false);
  // Het quotiënt rechts naast de deler, de rest onderaan; min-tekens en "r" maken niet uit.
  assert.deepEqual(K.vakDeel(q, ['1234 5\n-10  246\n 23\n-20\n  34\n -30\n   4', '21 3\n 1x', '8 2\n8 4\n0']), [1, 1, 1, null]);
  assert.deepEqual(K.vakDeel(q, ['1234 5\n10   246\n r 4', '21 3\n 1X 5', '']), [1, 5 / 6, 0, null]);
  assert.deepEqual(K.vakDeel(q, ['1234 5\n10   246\n 23\n 20\n  34\n  30\n   3', '2 13\n 1x', '8 2\n8 3']), [0, 4 / 6, 0, null]);
  assert.deepEqual(K.veldSleutel(q).slice(0, 3), ['= 246 rest 4', '21 3\n 1x', '= 4']);
  // 0,5 + 0,5 punt is samen 1 punt; een deel van de hokjes geeft een halve punt.
  assert.equal(K.auto(q, ['', '21', '', '']), 0.5);
});
