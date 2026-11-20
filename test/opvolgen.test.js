// Mijn klas › Opvolgen (wensenlijst 20 nov, punt 1): leerlingen × taken en toetsen, met één stand per vakje.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('opvolgen: rijen uit de klaslijst, een toets op het bord en een taak als kolommen', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'opvolgen-'));
  fs.mkdirSync(path.join(data, 'klas'), { recursive: true });
  fs.writeFileSync(path.join(data, 'klas', 'klas.json'), JSON.stringify({ naam: '6B', leerjaar: 6, leerlingen: [{ naam: 'Ada' }, { naam: 'Bo' }, { naam: 'Cas' }] }));
  const out = execFileSync(process.execPath, ['-e', `
    const proeven = require('./src/proeven'), taken = require('./src/taken'), opvolgen = require('./src/opvolgen');
    const K = proeven.K;
    const toets = K.validate({ titel: 'Taal', vragen: [{ type: 'kort', vraag: 'a?', antwoord: 'b', punten: 1 }, { type: 'open', vraag: 'Leg uit', punten: 2 }] });
    proeven.save(toets, 'taal.json');
    const s = (naam, auto) => ({ naam, antwoorden: {}, auto, hand: {}, events: [] });
    proeven.bewaarAfname({ title: 'Bordtoets', datum: new Date().toISOString(), toets, spelers: [s('Ada', { 0: 1 })], klaar: false });
    const t = taken.maak({ soort: 'proef', file: 'taal.json', namen: ['Ada', 'Bo'] });
    taken.flush && taken.flush();
    const o = opvolgen.overzicht();
    process.stdout.write('\\n@@' + JSON.stringify({ rijen: o.rijen.map(r => r.naam), kol: o.kolommen.map(k => ({ titel: k.titel, live: !!k.live, vakjes: k.vakjes })) }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.rijen, ['Ada', 'Bo', 'Cas']);
  const bord = o.kol.find(k => k.live);
  assert.strictEqual(bord.vakjes.ada.status, 'verbeteren', 'Ada heeft nog een open vraag');
  const taak = o.kol.find(k => !k.live);
  assert.strictEqual(taak.vakjes.bo.status, 'nieuw');
  assert.strictEqual(taak.vakjes.cas, undefined, 'Cas kreeg de taak niet: een streepje');
});
