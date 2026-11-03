// De vertaling (Instellingen > Uiterlijk > Taal). Elke tekst die op een scherm kan komen, moet een vertaling
// hebben in lang/en, lang/fr, lang/es en lang/de (*.json). Voeg je tekst toe? Kijk met `TAAL=fr node tools/i18n-todo.js <bestand>`
// wat er ontbreekt en zet de vertaling in lang/<taal>/<naam>.json ("Nederlandse tekst": "vertaling", of null om niet te vertalen).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { verzamel } = require('../tools/i18n-extract');
const { bekend, ontbrekend } = require('../tools/i18n-todo');

const ROOT = path.join(__dirname, '..');

test('elke pagina laadt /taal.js als eerste script', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'public')).filter(x => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
    const eerste = html.match(/<script\b[^>]*>/i);
    assert.ok(eerste && /src="\/taal\.js"/.test(eerste[0]), `${f}: zet <script src="/taal.js"></script> bovenaan in <head>`);
  }
});

const ANDERE = require('../src/taal').TALEN.map(t => t.id).filter(id => id !== 'nl');

test('de taalbestanden zijn geldig en houden de {0}-plekken', () => {
  for (const id of ANDERE) for (const f of fs.readdirSync(path.join(ROOT, 'lang', id)).filter(x => x.endsWith('.json'))) {
    const dir = path.join(ROOT, 'lang', id);
    const w = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const [nl, en] of Object.entries(w)) {
      assert.ok(en === null || typeof en === 'string', `${f}: "${nl}" moet tekst of null zijn`);
      if (typeof en !== 'string') continue;
      const plek = s => (s.match(/\{\d+\}/g) || []).sort().join();
      assert.equal(plek(en), plek(nl), `${f}: "${nl}" en "${en}" hebben andere {0}-plekken`);
    }
  }
});

for (const id of ANDERE) {
  test(`elke schermtekst heeft een vertaling (${id})`, () => {
    const mis = ontbrekend(verzamel(), bekend(id));
    const fout = Object.entries(mis);
    assert.deepEqual(fout.map(([f, l]) => `${f}: ${l.slice(0, 5).map(s => JSON.stringify(s)).join(', ')}${l.length > 5 ? ` (+${l.length - 5})` : ''}`), [],
      `Nieuwe tekst zonder vertaling. Zet ze in lang/${id}/<naam>.json (zie TAAL=${id} node tools/i18n-todo.js <bestand>).`);
  });
}

test('Frans, Spaans en Duits hebben dezelfde bestanden en teksten als het Engels', () => {
  const en = bekend('en');
  for (const id of ANDERE.filter(x => x !== 'en')) {
    const w = bekend(id);
    assert.deepEqual(Object.keys(en).filter(k => !(k in w)).slice(0, 5), [], `${id}: deze teksten ontbreken`);
  }
});

test('i18n.js vertaalt vaste tekst en patronen', () => {
  const geschreven = [];
  const ctx = {
    LANCELOT_TAAL: 'en',
    LANCELOT_WOORDEN: { 'Ronde {0} van {1}': 'Round {0} of {1}', Annuleren: 'Cancel', '{0} wint!': '{0} wins!', 'Ploeg rood': 'Team red' },
    document: { documentElement: {}, readyState: 'loading', addEventListener() {} },
    MutationObserver: class { observe() {} },
    HTMLInputElement: class {}, Document: class {}, NodeFilter: {},
    CanvasRenderingContext2D: class {},
    Intl, Date, String,
  };
  ctx.window = ctx;
  ctx.CanvasRenderingContext2D.prototype.fillText = s => geschreven.push(s);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/i18n.js'), 'utf8'), ctx);
  const t = ctx.I18n.t;
  assert.equal(t('Annuleren'), 'Cancel');
  assert.equal(t('  Annuleren '), '  Cancel ');
  assert.equal(t('Ronde 3 van 10'), 'Round 3 of 10');
  assert.equal(t('Ploeg rood wint!'), 'Team red wins!');
  assert.equal(t('Onbekend'), 'Onbekend');
  ctx.CanvasRenderingContext2D.prototype.fillText.call({}, 'Ronde 1 van 2');
  assert.deepEqual(geschreven, ['Round 1 of 2']);
});

test('de taalopdracht voor AI-prompts is op server en scherm dezelfde', () => {
  const { AI_TAAL } = require('../src/taal');
  const bron = fs.readFileSync(path.join(ROOT, 'public/js/i18n.js'), 'utf8');
  for (const [id, tekst] of Object.entries(AI_TAAL)) assert.ok(bron.includes(`${id}: ${JSON.stringify(tekst).replace(/"/g, "'")}`), id);
});

test('een CSV voor Excel wordt in het Engels vertaald, met komma\'s', () => {
  const taal = require('../src/taal');
  const uit = taal.csv('﻿Naam;Score;Aantal goed\r\nAn;"3;4";niet gespeeld\r\n', 'en');
  assert.strictEqual(uit, '﻿Name,Score,Number correct\r\nAn,3;4,not played\r\n');
  assert.strictEqual(taal.csv('a;b\r\n', 'nl'), 'a;b\r\n');
  assert.strictEqual(taal.csv('Naam;Score\r\n', 'fr'), 'Nom;Score\r\n');
  assert.strictEqual(taal.t('Vraag 3 heeft geen antwoorden.', 'en'), 'Question 3 has no answers.');
});
