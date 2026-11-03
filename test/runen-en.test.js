// De Engelse, Franse, Spaanse en Duitse woorden van het Runenraadsel en de ontdekwereld: juiste lengte, in de woordenlijst, zelfde vorm als het Nederlands.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

for (const id of ['en', 'fr', 'es', 'de']) {
  test(`${id}: runenwoorden hebben de juiste lengte en staan in de woordenlijst`, () => {
    const w = require(`../src/runen-woorden-${id}`);
    const lijst = new Set(fs.readFileSync(path.join(__dirname, `../src/woordenlijst-${id}.txt`), 'utf8').split('\n'));
    const lens = { PAGE: [4], SCHILDKNAAP: [5], RIDDER: [6, 7] };
    for (const [niveau, ok] of Object.entries(lens)) {
      assert.ok(w[niveau].length >= 50, `${niveau}: te weinig woorden`);
      const gezien = new Set();
      for (const [woord, b, z] of w[niveau]) {
        assert.ok(ok.includes(woord.length), `${woord}: verkeerde lengte voor ${niveau}`);
        assert.ok(lijst.has(woord), `${woord} staat niet in woordenlijst-${id}.txt`);
        assert.ok(b && z, `${woord}: betekenis of zin ontbreekt`);
        assert.ok(!gezien.has(woord), `${woord} staat er twee keer in`);
        gezien.add(woord);
      }
    }
  });

  test(`${id}: weetjes hebben dezelfde vorm als de Nederlandse`, () => {
    const nl = require('../src/ontdek-inhoud');
    const en = require(`../src/ontdek-inhoud-${id}`);
    for (const k of ['PAGE', 'SCHILDKNAAP', 'RIDDER']) {
      assert.strictEqual(en[k].length, nl[k].length, k);
      en[k].forEach((x, i) => {
        assert.strictEqual(x.o, nl[k][i].o, `${k} ${i}: onderwerp`);
        assert.strictEqual(x.j, nl[k][i].j, `${k} ${i}: juist antwoord`);
        assert.strictEqual(x.a.length, nl[k][i].a.length, `${k} ${i}: keuzes`);
      });
    }
    for (const k of Object.keys(nl.LABO)) assert.strictEqual(en.LABO[k].length, nl.LABO[k].length, k);
  });
}
