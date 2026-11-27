// Sneller starten en laden (27 nov): de browser mag een bestand bewaren zolang het niet veranderde, ook na een herstart
// of een update (dan herladen alle Chromebooks tegelijk). Beelden die een spel zelf laadt, krijgen de stempel van hun map.
// De dagelijkse back-up houdt het opstarten niet meer op, de lijsten van quizzen en oefenbladen lezen enkel wat veranderde.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

async function start(data, port) {
  const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), LANCELOT_DATA: data } });
  let out = '';
  srv.stdout.on('data', d => { out += d; });
  srv.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/localhost:\d+/.test(out); i++) await new Promise(r => setTimeout(r, 100));
  assert.ok(/localhost:\d+/.test(out), 'server startte niet:\n' + out);
  return srv;
}
const stop = srv => new Promise(r => { srv.on('exit', r); srv.kill(); });

test('scripts en beelden: dezelfde link na een herstart, bewaren alleen als de stempel klopt', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sneller-starten-'));
  const port = 3941;
  const url = p => `http://localhost:${port}${p}`;
  let srv = await start(data, port);
  let eerst;
  try {
    eerst = await (await fetch(url('/host'))).text();
    const ui = eerst.match(/\/js\/ui\.js\?v=([\w.]+)"/);
    assert.ok(ui, 'ui.js met stempel');
    const goed = await fetch(url(`/js/ui.js?v=${ui[1]}`));
    assert.match(goed.headers.get('cache-control'), /immutable/);
    const fout = await fetch(url('/js/ui.js?v=oud123'));
    assert.strictEqual(fout.headers.get('cache-control'), 'no-cache');
    // Beelden van een spel: de stempel van de map staat in de pagina, vóór elk ander script.
    const m = eerst.match(/"img\/kolkridder":"(\w+)"/);
    assert.ok(m, 'stempel van de beeldmap in de pagina');
    assert.ok(eerst.indexOf('"img/kolkridder"') < eerst.indexOf('/taal.js'), 'het beeldscript staat voor de andere scripts');
    const beeld = await fetch(url(`/img/kolkridder/burcht.webp?m=${m[1]}`));
    assert.strictEqual(beeld.status, 200);
    assert.match(beeld.headers.get('cache-control'), /immutable/);
    assert.strictEqual((await fetch(url('/img/kolkridder/burcht.webp?m=xx'))).headers.get('cache-control'), 'no-cache');
    assert.strictEqual((await fetch(url('/img/kolkridder/burcht.webp'))).headers.get('cache-control'), 'no-cache');
    // Knopbeelden laden pas als ze te zien zijn.
    assert.match(eerst, /<img loading="lazy"[^>]*src="\/img\/icons\//);
  } finally {
    await stop(srv);
  }
  srv = await start(data, port);
  try {
    const daarna = await (await fetch(url('/host'))).text();
    const links = html => (html.match(/(?:src|href)="\/[^"]+\?v=[^"]+"/g) || []).sort().join('\n');
    assert.ok(links(eerst).length > 100);
    assert.strictEqual(links(daarna), links(eerst), 'na een herstart dezelfde links: de browser haalt niets opnieuw');
  } finally {
    await stop(srv);
  }
});

test('de dagelijkse back-up gebeurt na het starten, in de achtergrond, en is een geldige zip', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sneller-backup-'));
  const srv = await start(data, 3942);
  try {
    let zips = [];
    for (let i = 0; i < 50 && !zips.length; i++) {
      await new Promise(r => setTimeout(r, 100));
      try { zips = fs.readdirSync(path.join(data, 'back-ups')).filter(f => /^auto_.*\.zip$/.test(f)); } catch {}
    }
    assert.strictEqual(zips.length, 1);
    const zip = require('../src/zip');
    const files = zip.read(fs.readFileSync(path.join(data, 'back-ups', zips[0])));
    assert.ok(files.some(f => f.name === 'lancelot-backup.json'));
    assert.ok(files.some(f => f.name.startsWith('quizzes/')));
  } finally {
    await stop(srv);
  }
});

test('zip: in de achtergrond inpakken geeft dezelfde inhoud', async () => {
  const zip = require('../src/zip');
  const entries = [{ name: 'a.txt', data: Buffer.from('hallo '.repeat(1000)) }, { name: 'map/b.json', data: Buffer.from('{"x":1}') }];
  const a = zip.read(zip.write(entries)), b = zip.read(await zip.writeAsync(entries));
  assert.deepStrictEqual(b.map(f => [f.name, f.data.toString()]), a.map(f => [f.name, f.data.toString()]));
});

test('quizlijst: onthoudt wat niet veranderde, een wijziging komt meteen mee', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sneller-lijst-'));
  const out = JSON.parse(execFileSync(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path');
    const quizzes = require('./src/quizzes');
    const Q = t => ({ title: t, questions: [{ question: 'Hoeveel is 1+1?', answers: ['2', '3'], correct: 0 }] });
    const f = quizzes.save(Q('Eerste quiz'));
    const oud = s => { const t = new Date(Date.now() - s * 1000); fs.utimesSync(path.join(quizzes.DIR, f), t, t); };
    oud(60);
    const titels1 = quizzes.list().map(q => q.title);
    let reads = 0;
    const echt = fs.readFileSync;
    fs.readFileSync = (p, ...a) => { if (String(p).endsWith(f)) reads++; return echt(p, ...a); };
    quizzes.list();
    const rust = reads;
    quizzes.save(Q('Andere titel'), f);
    oud(30);
    const titels2 = quizzes.list().map(q => q.title);
    process.stdout.write('\\n@@' + JSON.stringify({ titels1, titels2, rust }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: tmp }, encoding: 'utf8' }).split('\n@@').pop());
  assert.ok(out.titels1.includes('Eerste quiz'));
  assert.strictEqual(out.rust, 0, 'onveranderd: niet opnieuw lezen');
  assert.ok(out.titels2.includes('Andere titel'), 'gewijzigd: de nieuwe titel');
  assert.ok(!out.titels2.includes('Eerste quiz'));
});

test('Start LANcelot.bat kijkt de onderdelen na zonder npm ls', () => {
  const bat = fs.readFileSync(path.join(ROOT, 'Start LANcelot.bat'), 'utf8');
  assert.ok(!/npm ls/.test(bat));
  assert.match(bat, /node src\\onderdelen\.js/);
  assert.strictEqual(require('../src/onderdelen').klopt(), true);
});

test('de leerplandoelen (groot) pas ophalen als een doelveld te zien is', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'js', 'doel-kies.js'), 'utf8');
  assert.match(js, /function alsZichtbaar\(el\)/);
  assert.match(js, /if \(value\) load\(\); else alsZichtbaar\(el\);/);
  assert.ok(!/function leerjaarKeuze\(\) \{\s*load\(\);/.test(js));
});
