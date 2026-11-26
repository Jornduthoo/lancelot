// De Leescheck gaat mee met Mijn lesmap (Jorn 26 nov: de connector op de klas-pc zag niets van wat op het digibord
// ingevuld werd). Samenvoegen per dag en leerling (de laatste invulling wint), instellingen: de laatste wijziging wint,
// en een leerling met het id van een andere pc wordt op naam teruggevonden.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('Leescheck: samenvoegen van twee pc\'s en leerlingen op naam terugvinden', () => {
  process.env.LANCELOT_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'lezen-sync-'));
  const klas = require('../src/klas');
  const lezen = require('../src/lezen');
  klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Bram'] });
  const bram = klas.match('Bram');
  const a = { schooljaar: '2026-2027', dagen: { '2026-11-24': { 'id:ander': { naam: 'Lotte', boek: 'A', blz: 5, antwoord: 'x', t: '2026-11-24T08:00:00Z' } } } };
  const b = { schooljaar: '2026-2027', dagen: {
    '2026-11-24': { 'id:ander': { naam: 'Lotte', boek: 'A', blz: 9, antwoord: 'y', t: '2026-11-24T09:00:00Z' } },
    '2026-11-25': { [`id:${bram.id}`]: { naam: 'Bram', boek: 'B', blz: 3, antwoord: 'z', t: '2026-11-25T08:00:00Z' } },
  } };
  const samen = JSON.parse(lezen.syncSamen(JSON.stringify(a), JSON.stringify(b)));
  lezen.syncGeldig(samen);
  assert.equal(samen.dagen['2026-11-24']['id:ander'].blz, 9);
  assert.equal(samen.dagen['2026-11-25'][`id:${bram.id}`].boek, 'B');
  assert.throws(() => lezen.syncGeldig({ dagen: [] }));
  // Instellingen: de laatste wijziging wint.
  assert.equal(JSON.parse(lezen.syncSamen(JSON.stringify({ aan: false, t: '2026-11-20' }), JSON.stringify({ aan: true, t: '2026-11-25' }))).aan, true);
  // Binnengekomen via de lesmap: Lotte met het id van de andere pc staat in het overzicht bij de Lotte van hier.
  fs.mkdirSync(lezen.DIR, { recursive: true });
  fs.writeFileSync(path.join(lezen.DIR, '2026-2027.json'), JSON.stringify(samen));
  lezen.zet({ aan: true });
  const o = lezen.overzicht({ dagen: 5 }, new Date('2026-11-26T10:00:00'));
  const lotte = o.leerlingen.find(r => r.naam === 'Lotte');
  assert.equal(lotte.opLijst, true);
  assert.equal(lotte.cellen['2026-11-24'].blz, 9);
  assert.equal(o.leerlingen.filter(r => r.naam === 'Lotte').length, 1);
  assert.equal(o.leerlingen.find(r => r.naam === 'Bram').cellen['2026-11-25'].boek, 'B');
});
