// Elk leerlingscherm met een aanmeldscherm toont het bewegende 3D-logo, nooit het vaste logo.webp.
// Faalt dus als een nieuw spel (xx-player.js) of een nieuwe leerlingpagina het logo vergeet.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const lees = f => fs.readFileSync(path.join(PUB, f), 'utf8');

// De pagina's die leerlingen op hun eigen toestel openen (de rest is enkel voor de leerkracht).
// Ontdek heeft bewust zijn eigen grote wereldbeeld in plaats van het logo.
const LEERLINGPAGINAS = ['index.html', 'toets.html', 'mijn-taken.html', 'runen.html', 'burcht.html', 'huisdier.html'];
const SPELERS = fs.readdirSync(path.join(PUB, 'js')).filter(f => /-player\.js$/.test(f)).map(f => 'js/' + f);

// Alle aanmeldschermen (<form ... class="screen welcome ...">) uit een bestand, met hun inhoud.
const aanmeldschermen = tekst => [...tekst.matchAll(/<form id="([\w-]+)" class="screen welcome[^"]*">([\s\S]*?)<\/form>/g)]
  .map(m => ({ id: m[1], inhoud: m[2] }));

test('elke leerlingpagina laadt het bewegende logo', () => {
  for (const f of LEERLINGPAGINAS) assert.match(lees(f), /<script src="\/js\/logo-3d\.js"><\/script>/, `${f} laadt logo-3d.js niet`);
});

test('elk aanmeldscherm voor leerlingen toont het bewegende logo', () => {
  let geteld = 0;
  for (const f of [...LEERLINGPAGINAS, ...SPELERS]) {
    for (const s of aanmeldschermen(lees(f))) {
      geteld++;
      assert.match(s.inhoud, /<img [^>]*data-logo-3d/, `${f}: aanmeldscherm #${s.id} heeft geen bewegend logo (<img src="/img/logo.webp" alt="LANcelot" data-logo-3d>)`);
    }
  }
  assert.ok(geteld > 40, 'te weinig aanmeldschermen gevonden: klopt de zoekopdracht nog?');
});

test('elk spel dat leerlingen spelen heeft een aanmeldscherm met logo', () => {
  const index = lees('index.html');
  for (const f of SPELERS) {
    if (!index.includes(`src="/${f}"`)) continue;
    const t = lees(f);
    if (!/class="screen welcome/.test(t)) continue; // hulpspelers zonder eigen aanmelding (bv. avatar)
    assert.ok(aanmeldschermen(t).length > 0, `${f}: aanmeldscherm niet herkend`);
  }
});

test('nergens bij leerlingen het vaste logo zonder data-logo-3d', () => {
  for (const f of [...LEERLINGPAGINAS, ...SPELERS]) {
    for (const img of lees(f).match(/<img [^>]*logo\.webp[^>]*>/g) || []) {
      assert.match(img, /data-logo-3d/, `${f}: vast logo ${img}`);
    }
  }
});

test('valt het filmpje uit, dan blijft de ridder bewegen', () => {
  const js = lees('js/logo-3d.js');
  assert.doesNotMatch(js, /replaceWith\(oud\)\s*\)/, 'bij een fout komt het vaste logo terug');
  assert.match(js, /addEventListener\('error'[^\n]*ridder-ios\.webp/, 'geen bewegende reserve bij een filmfout');
  for (const f of ['achter.webp', 'voor.webp', 'ridder.webm', 'ridder-ios.webp', 'ridder-start.webp']) {
    assert.ok(fs.existsSync(path.join(PUB, 'img', 'logo-3d', f)), `img/logo-3d/${f} ontbreekt`);
  }
});
