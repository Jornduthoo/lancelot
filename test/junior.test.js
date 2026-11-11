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

// Raadsel van vandaag per klas (Jorn 2026-11-11: veel te makkelijk voor het 2e leerjaar): elke klas eigen raadsels,
// één juist antwoord, geen dubbele keuzes, en de denkraadsels kloppen echt.
test('raadsel van vandaag: per leerjaar, juist en niet te makkelijk', () => {
  const J = laad('nl');
  const getal = o => Number(String(o.html).replace(/<[^>]*>/g, '').trim());
  const max = [20, 20, 100, 1000];
  for (let niv = 0; niv < 4; niv++) {
    const zinnen = new Set();
    for (let seed = 1; seed <= 400; seed++) {
      const r = J.toeval(seed);
      for (let i = 0; i < 3; i++) {
        const v = J.vraag('raadsel', niv, r);
        assert.ok(v && v.soort, `niveau ${niv} seed ${seed}: geen vraag`);
        assert.ok(!JSON.stringify(v).includes('undefined') && !JSON.stringify(v).includes('NaN'), `niveau ${niv} seed ${seed}: undefined/NaN`);
        zinnen.add(JSON.stringify(v.zeg[0]));
        if (v.soort !== 'kies') continue;
        assert.strictEqual(v.opties.filter(o => o.juist).length, 1, `niveau ${niv} seed ${seed}: één juist antwoord`);
        const html = v.opties.map(o => o.html);
        assert.strictEqual(new Set(html).size, html.length, `niveau ${niv} seed ${seed}: dubbele keuzes`);
        // Een som of getallenrij in de kop: rekenen we na met het juiste antwoord.
        const som = (v.kop || '').replace(/<[^>]*>/g, '');
        const juist = v.opties.find(o => o.juist);
        if (v.stenen && /\?/.test(som)) {
          const x = getal(juist);
          assert.ok(Number.isInteger(x) && x >= 0 && x <= max[niv], `niveau ${niv} seed ${seed}: ${som} -> ${x}`);
          if (som.includes('=')) {
            const [links, rechts] = som.replace('?', x).replace('×', '*').replace('−', '-').replace(':', '/').split('=');
            assert.strictEqual(Function(`return ${links}`)(), Number(rechts), `niveau ${niv} seed ${seed}: ${som} met ${x}`);
          } else if (som.includes(',')) {
            const rij = som.split(',').slice(0, -1).map(Number).concat(x);
            const d = rij.slice(1).map((y, k) => y - rij[k]);
            const q = rij.slice(1).map((y, k) => y / rij[k]);
            assert.ok(d.every(y => y === d[0]) || q.every(y => y === q[0]), `niveau ${niv} seed ${seed}: rij ${rij}`);
            assert.ok(rij.every(y => y >= 0 && y <= max[niv]), `niveau ${niv} seed ${seed}: rij ${rij} buiten bereik`);
          }
        }
      }
    }
    // Vanaf het 1e leerjaar geen kleuteropdrachten meer (wat hoort er niet bij, waar is het draakje).
    if (niv > 0) {
      const kleuter = laadZin('nl');
      assert.ok(!zinnen.has(JSON.stringify(kleuter.nietBij)), `niveau ${niv}: nog kleuterraadsels`);
    }
    if (niv >= 2) assert.ok(zinnen.has(JSON.stringify(laadZin('nl').getalPast)), `niveau ${niv}: geen denkraadsel`);
    if (niv >= 1) assert.ok(zinnen.has(JSON.stringify(laadZin('nl').betekenis)), `niveau ${niv}: geen woordenschat`);
  }
});
function laadZin(t) { return inhoudBestand(t).zin; }

test('woordenschat: elke taal 3 leerjaren met elk 20 woorden en verschillende betekenissen', () => {
  for (const t of TALEN) {
    const w = inhoudBestand(t).woordenschat;
    assert.strictEqual(w.length, 3, t);
    for (const lijst of w) {
      assert.ok(lijst.length >= 15, t);
      assert.strictEqual(new Set(lijst.map(x => x.b)).size, lijst.length, `${t}: dubbele betekenis`);
      assert.ok(lijst.every(x => x.w && x.b), t);
    }
  }
});

test('woorden van de week: typen, AI-antwoord inlezen en in het raadsel', () => {
  assert.deepStrictEqual(junior.leesWoordRegels('dapper = je durft veel\nde oogst: wat je van het veld haalt\nsluipen - heel stil stappen\nzonder betekenis'),
    [{ w: 'dapper', b: 'je durft veel' }, { w: 'de oogst', b: 'wat je van het veld haalt' }, { w: 'sluipen', b: 'heel stil stappen' }]);
  assert.throws(() => junior.leesWoorden({ woorden: [{ woord: 'a', betekenis: 'b' }] }));
  assert.strictEqual(junior.leesWoorden({ woorden: Array.from({ length: 50 }, (_, i) => ({ woord: `w${i}`, betekenis: `b${i}` })) }).length, 30);
  assert.ok(junior.woordPrompt({ onderwerp: 'de herfst' }).includes('de herfst'));
  const J = laad('nl');
  J.woorden = [{ w: 'egel', b: 'dier met stekels' }, { w: 'eikel', b: 'vrucht van de eik' }, { w: 'mist', b: 'wolk vlak bij de grond' }];
  for (let seed = 1; seed <= 20; seed++) {
    const v = J.vraag('woord', 1, J.toeval(seed));
    assert.ok(J.woorden.some(x => v.zeg[1] === x.w), 'eigen woord');
    assert.strictEqual(v.opties.filter(o => o.juist).length, 1);
  }
});
