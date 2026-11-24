// Meer aanduidvragen in dezelfde brontekst: elke vraag een eigen laag (wens Jorn 2026-11-24).
// Op het scherm: boven de tekst "Je duidt aan voor vraag X" met alleen de stiften van die vraag (of één stift "Duid aan").
// Op papier en in de verbetersleutel: elke aanduidvraag een eigen kopie van de tekst.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const K = require('../public/js/pf-kern.js');

const BRON = 'Ridders winnen toernooi\nGisteren wonnen de ridders van Camelot het grote toernooi in de stad. Meer dan duizend mensen kwamen kijken.\nDe wedstrijd duurde drie uur.\nVolgend jaar komt het toernooi terug naar Camelot.';
const toets = (twee = true) => K.validate({ title: 't', vragen: [{ type: 'bron', titel: 'b', tekst: BRON, vragen: [
  { type: 'markeren', vraag: 'Duid kop, inleiding en slot aan.', per: 'stuk', inBron: true, kleuren: [{ kleur: 'groen', uitleg: 'krantenkop' }, { kleur: 'blauw', uitleg: 'inleiding' }, { kleur: 'rood', uitleg: 'slot' }], doelen: [[0, 2, 1], [3, 20, 2], [26, 33, 3]] },
  ...(twee ? [{ type: 'markeren', vraag: 'Kleur één zin die een feit geeft.', per: 'zin', inBron: true, aantal: 1, doelen: [[3, 14, 1], [21, 25, 1]] }] : []),
] }] });

function paper() {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pf-paper.js'), 'utf8')}\nthis.PfPaper = PfPaper;`, ctx);
  return ctx.PfPaper;
}
const print = (t, key) => {
  const lijst = t.vragen;
  const zones = {};
  if (key) for (const { id, q } of K.vragenVan(lijst)) if (q.type === 'markeren') zones[id] = K.markeerSleutel(q);
  const box = { addEventListener() {} };
  paper().render(box, K.studentView(t, lijst).pages, { mode: 'print', nummer: true, sleutel: key ? {} : null, zones });
  return box.innerHTML;
};
const tel = (html, s) => html.split(s).length - 1;

test('op papier: twee aanduidvragen in één tekst krijgen elk een eigen kopie van de tekst', () => {
  const h = print(toets());
  assert.strictEqual(tel(h, 'pf-markeer-laag'), 2);
  // Zonder sleutel staat er niets aangeduid.
  assert.ok(!/pf-markeer-laag[^"]*">[^]*?background:/.test(h.split('pf-markeer-laag')[1].split('</div>')[0]));
});

test('op papier: één aanduidvraag in de tekst blijft zoals vroeger', () => {
  assert.strictEqual(tel(print(toets(false)), 'pf-markeer-laag'), 0);
});

test('verbetersleutel: per aanduidvraag de tekst met wat aangeduid moet worden', () => {
  for (const twee of [true, false]) {
    const h = print(toets(twee), true);
    const lagen = h.split('pf-markeer-laag').slice(1).map(x => x.split('</div>')[0]);
    assert.strictEqual(lagen.length, twee ? 2 : 1);
    assert.match(lagen[0], /background:#8ce99a/); // groen = krantenkop
    assert.match(lagen[0], /background:#8fd0ff/); // blauw = inleiding
    if (twee) assert.match(lagen[1], /background:#ffe14d/); // de gewone markeerstift
  }
});

test('het scherm heeft een laag boven de brontekst en de stiften staan daar, niet meer in de vraag', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pf-paper.js'), 'utf8');
  assert.match(src, /class="pf-laag"/);
  assert.match(src, /Je duidt aan voor vraag/);
  assert.match(src, /<span>Duid aan<\/span>/);
  // Het antwoord bewaart de kleur zoals vroeger: alleen met meer dan één kleur.
  assert.match(src, /el\.pfMarkKleur = mk\.kleuren && mk\.kleuren\.length > 1 \? 1 : 0;/);
});

test('punten blijven gelijk', () => {
  const t = toets();
  const [a, b] = t.vragen[0].vragen;
  assert.strictEqual(K.auto(a, [[0, 2, 1], [3, 20, 2]]), 2);
  assert.strictEqual(K.auto(b, [[3, 1]]), 1);
});
