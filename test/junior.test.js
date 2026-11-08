// LANcelot Junior: elk spel maakt op elk niveau, in elke taal, een geldige vraag, en elke taal heeft dezelfde zinnen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const junior = require('../src/junior');
const TALEN = ['nl', 'en', 'fr', 'es', 'de'];
const inhoudBestand = t => require(t === 'nl' ? '../src/junior-inhoud' : `../src/junior-inhoud-${t}`);
const SPEL_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'jr-spel.js'), 'utf8');

function laad(taal) {
  const JR = { ...junior.inhoud(taal), spellen: junior.SPELLEN };
  const window = { JR };
  window.window = window;
  const ctx = { window, JR, document: { createElement: () => ({}) }, localStorage: { getItem() {}, setItem() {} }, console, Math, setTimeout, fetch: () => Promise.reject(new Error('geen net')) };
  vm.createContext(ctx);
  vm.runInContext(SPEL_JS, ctx);
  return window.Junior;
}

test('elke taal heeft dezelfde zinnen als het Nederlands', () => {
  const nl = Object.keys(inhoudBestand('nl').zin).sort();
  for (const t of TALEN.slice(1)) assert.deepStrictEqual(Object.keys(inhoudBestand(t).zin).sort(), nl, `zinnen ${t}`);
});

test('elke taal heeft 30 dieren', () => {
  for (const t of TALEN) assert.strictEqual(inhoudBestand(t).dieren.length, junior.DIEREN, `dieren ${t}`);
});

test('elk spel maakt op elk niveau een vraag, in elke taal', () => {
  for (const t of TALEN) {
    const J = laad(t);
    for (const s of junior.SPELLEN) {
      if (!J.MAKERS[s.id]) continue; // dans en kring lopen op het bord
      for (let n = 0; n < s.niveaus.length; n++) {
        for (let seed = 1; seed <= 30; seed++) {
          const v = J.vraag(s.id, n, J.toeval(seed));
          assert.ok(v && v.soort, `${t} ${s.id} niveau ${n} seed ${seed}: geen vraag`);
          assert.ok(!JSON.stringify(v).includes('undefined'), `${t} ${s.id} niveau ${n} seed ${seed}: undefined`);
        }
      }
    }
  }
});

test('de leerkracht wordt nergens "juf" genoemd', () => {
  const bestanden = ['public/junior.html', 'public/junior-leerkracht.html', 'src/junior-inhoud.js', 'public/js/jr-kind.js', 'public/js/jr-leerkracht.js'];
  for (const f of bestanden) assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), /\bjuf\b/i, f);
});

test('het dier groeit mee met de stickers en elk groeibeeld bestaat', () => {
  assert.strictEqual(junior.dierFase(0), 1);
  assert.strictEqual(junior.dierFase(junior.DIER_GROEI[1]), 2);
  assert.strictEqual(junior.dierFase(junior.DIER_GROEI[2] + 5), 3);
  for (const map of ['dier', 'dier2', 'dier3']) {
    for (let i = 1; i <= junior.DIEREN; i++) assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'img', 'junior', map, `${i}.webp`)), `${map}/${i}.webp`);
  }
});

test('op maat: een niveau makkelijker of moeilijker, nooit buiten de niveaus, en bord en tablet rekenen hetzelfde', () => {
  const J = laad('nl');
  for (const s of junior.SPELLEN.filter(x => x.id !== 'eigen' && x.niveaus.length)) {
    const laatste = s.niveaus.length - 1;
    for (let basis = 0; basis <= laatste; basis++) {
      for (const stap of [-1, 0, 1]) {
        const kind = { maat: { stap } };
        const verwacht = Math.max(0, Math.min(laatste, basis + stap));
        assert.strictEqual(junior.niveauVoor(kind, s.id, basis), verwacht, `${s.id} ${basis}${stap}`);
        assert.strictEqual(J.niveauVoor(kind, s.id, basis), verwacht, `tablet ${s.id} ${basis}${stap}`);
      }
    }
  }
  assert.strictEqual(junior.niveauVoor({ maat: { stap: 1 } }, 'eigen', 0), 0, 'eigen vragen zijn reeksen, geen niveaus');
  assert.strictEqual(J.niveauVoor({}, 'tel', 1), 1, 'zonder op maat: het niveau van de klas');
});

test('op maat: minder prenten houdt de juiste prent en precies één andere', () => {
  const J = laad('nl');
  let getest = 0;
  for (const s of junior.SPELLEN) {
    if (!J.MAKERS[s.id]) continue;
    for (let n = 0; n < s.niveaus.length; n++) {
      for (let seed = 1; seed <= 10; seed++) {
        const v = J.vraag(s.id, n, J.toeval(seed));
        const m = J.minder(v);
        if (!v || v.soort !== 'kies' || v.opties.length <= 2 || v.opties.filter(o => o.juist).length !== 1) { assert.strictEqual(m, v); continue; }
        getest++;
        assert.strictEqual(m.opties.length, 2, `${s.id} ${n}`);
        assert.strictEqual(m.opties.filter(o => o.juist).length, 1, `${s.id} ${n}: de juiste prent blijft`);
      }
    }
  }
  assert.ok(getest > 50, 'er zijn genoeg kies-vragen getest');
});

test('Geldmarkt werkt in euro, dollar en pond, en elk geldbeeld bestaat', () => {
  const J = laad('en');
  for (const [munt, map, teken] of [['eur', '', '€'], ['usd', 'usd/', '$'], ['gbp', 'gbp/', '£']]) {
    J.munt = munt;
    for (let n = 0; n < 3; n++) {
      for (let seed = 1; seed <= 30; seed++) {
        const v = J.vraag('geld', n, J.toeval(seed));
        assert.ok(v.opties.every(o => o.html.includes(teken)), `${munt} niveau ${n}: teken`);
        for (const [, s] of v.scene.matchAll(/geld\/(?:usd\/|gbp\/)?(\d+)/g)) {
          assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'img', 'junior', 'geld', `${map}${s}.webp`)), `${munt} ${s}`);
        }
      }
    }
  }
  junior.zetInstellingen && assert.strictEqual(typeof junior.muntNu(), 'string');
});
