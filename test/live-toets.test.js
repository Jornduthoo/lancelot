// Live overzicht tijdens een toets (wens 25 nov, punt 8): op welke vraag, sinds wanneer, en wanneer de leerling iets deed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken');
  const out = (async () => { ${code} })();
  out.then(o => { taken.flush(); process.stdout.write('\\n@@' + JSON.stringify(o === undefined ? null : o)); });
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('de lijst toont per leerling de vraag, het aantal vragen en sinds wanneer hij op die vraag staat', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'live-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'toets.json'), JSON.stringify({ title: 'Toets', vragen: [{ type: 'kort', vraag: '2+2?', antwoord: '4' }, { type: 'kort', vraag: '3+3?', antwoord: '6' }, { type: 'kort', vraag: '4+4?', antwoord: '8' }] }));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    const wacht = ms => new Promise(r => setTimeout(r, ms));
    taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', pos: 0 });
    const l1 = taken.lijst()[0].leerlingen.find(l => l.naam === 'Lotte');
    await wacht(15);
    // Een antwoord op dezelfde vraag: posSinds blijft, actief schuift op.
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '0', waarde: '4', pos: 0 });
    const l2 = taken.lijst()[0].leerlingen.find(l => l.naam === 'Lotte');
    await wacht(15);
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', pos: 2 });
    const l3 = taken.lijst()[0].leerlingen.find(l => l.naam === 'Lotte');
    const m = taken.lijst()[0].leerlingen.find(l => l.naam === 'Mats');
    return { l1, l2, l3, m };
  `);
  assert.strictEqual(r.l1.status, 'bezig');
  assert.strictEqual(r.l1.paginas, 3);
  assert.ok(r.l1.posSinds);
  assert.strictEqual(r.l2.posSinds, r.l1.posSinds);
  assert.ok(r.l2.actief > r.l1.actief);
  assert.strictEqual(r.l3.pos, 2);
  assert.ok(r.l3.posSinds > r.l2.posSinds);
  assert.strictEqual(r.m.status, 'nieuw');
  assert.strictEqual(r.m.posSinds, undefined);
});

test('live bij oefenbladen en quizzen: wanneer de leerling iets deed', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'live-'));
  fs.mkdirSync(path.join(A, 'oefenbladen'));
  fs.copyFileSync(path.join(ROOT, 'oefenbladen', 'voorbeeld-belgie.json'), path.join(A, 'oefenbladen', 'blad.json'));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'oefenblad', file: 'blad.json', namen: ['Lotte', 'Mats'] });
    taken.open({ id: t.id, naam: 'Lotte' });
    const d = taken.detail({ id: t.id, naam: 'Lotte' });
    const id = Object.keys(d.solutions || {})[0];
    taken.antwoord({ id: t.id, naam: 'Lotte', veld: id, waarde: 'x' });
    const ll = taken.lijst()[0].leerlingen;
    return { lotte: ll.find(l => l.naam === 'Lotte'), mats: ll.find(l => l.naam === 'Mats') };
  `);
  assert.strictEqual(r.lotte.status, 'bezig');
  assert.ok(r.lotte.actief);
  assert.strictEqual(r.mats.actief, undefined);
});
