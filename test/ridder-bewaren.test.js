// De ridder van een leerling staat op de pc van de leerkracht, niet in de browser: een nieuw adres mag hem nooit veranderen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { herstel, clean } = require('../src/avatars');

const ridder = (helm, runen = 0) => clean({ helm, runen });

test('herstel: de ridder die in de back-ups het vaakst voorkomt, komt terug', () => {
  const echt = ridder(3, 2);
  const huidig = { lotte: ridder(7), arne: ridder(1) };
  const oud = [{ lotte: echt, arne: ridder(1) }, { lotte: echt }, { lotte: ridder(5), arne: ridder(1) }];
  assert.deepEqual(herstel(oud, huidig), ['lotte']);
  assert.deepEqual(huidig.lotte, echt);
  assert.deepEqual(huidig.arne, ridder(1));
});

test('herstel: één keer gezien is niet genoeg, nieuwe leerlingen blijven zoals ze zijn', () => {
  const huidig = { mo: ridder(2), nieuw: ridder(4) };
  assert.deepEqual(herstel([{ mo: ridder(6) }, { mo: ridder(8) }], huidig), []);
  assert.deepEqual(huidig.mo, ridder(2));
});

test('leerling-pagina vraagt de ridder op aan de pc bij aanmelden en verbinden', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/js/av-player.js'), 'utf8');
  assert.match(js, /socket\.emit\('avatar-get'/);
  assert.match(js, /socket\.on\('connect', \(\) => avSync\(/);
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.match(server, /socket\.on\('avatar-get'/);
  assert.match(server, /herstelUitBackups\(/);
});
