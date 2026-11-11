// LANcelot toont overal het vaste logo (logo.webp). Het bewegende 3D-logo is weg: het vertraagde de app.
// Faalt als een pagina of spel het oude bewegende logo terugbrengt, of als een aanmeldscherm zijn logo vergeet.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const lees = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const SPELERS = fs.readdirSync(path.join(PUB, 'js')).filter(f => /-player\.js$/.test(f)).map(f => 'js/' + f);
const HTML = fs.readdirSync(PUB).filter(f => f.endsWith('.html'));

const aanmeldschermen = tekst => [...tekst.matchAll(/<form id="([\w-]+)" class="screen welcome[^"]*">([\s\S]*?)<\/form>/g)]
  .map(m => ({ id: m[1], inhoud: m[2] }));

test('nergens nog het bewegende 3D-logo', () => {
  for (const f of [...HTML, ...SPELERS]) assert.doesNotMatch(lees(f), /data-logo-3d|logo-3d\.js/, `${f} gebruikt nog het bewegende logo`);
  assert.ok(!fs.existsSync(path.join(PUB, 'js', 'logo-3d.js')), 'logo-3d.js bestaat nog');
  assert.ok(!fs.existsSync(path.join(PUB, 'img', 'logo-3d')), 'img/logo-3d bestaat nog');
});

test('startscherm leerkracht toont het vaste logo', () => {
  assert.match(lees('host.html'), /<div class="hero">\s*<img src="\/img\/logo\.webp"/);
});

test('elk aanmeldscherm voor leerlingen toont het vaste logo', () => {
  let geteld = 0;
  for (const f of ['index.html', 'toets.html', 'mijn-taken.html', 'runen.html', 'burcht.html', 'huisdier.html', ...SPELERS]) {
    for (const s of aanmeldschermen(lees(f))) {
      geteld++;
      assert.match(s.inhoud, /<img [^>]*logo\.webp/, `${f}: aanmeldscherm #${s.id} zonder logo`);
    }
  }
  assert.ok(geteld > 40, 'te weinig aanmeldschermen gevonden: klopt de zoekopdracht nog?');
});
