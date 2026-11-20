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

// Punt 3: wie niet meedoet, telt niet mee (gast, een vak niet bij mij, afwezig = inhalen).
test('opvolgen: een gast en een vak "niet bij mij" tellen niet mee, afwezig geeft inhalen', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'opvolgen-niet-'));
  fs.mkdirSync(path.join(data, 'klas'), { recursive: true });
  fs.writeFileSync(path.join(data, 'klas', 'klas.json'), JSON.stringify({ naam: '6B', leerjaar: 6, leerlingen: [{ id: 'a', naam: 'Ada' }, { id: 'b', naam: 'Bo' }, { id: 'c', naam: 'Cas' }, { id: 'd', naam: 'Dex' }] }));
  const out = execFileSync(process.execPath, ['-e', `
    const proeven = require('./src/proeven'), taken = require('./src/taken'), opvolgen = require('./src/opvolgen'), klas = require('./src/klas');
    klas.setNiveau('b', 'niet', 'frans');
    klas.setNiveau('c', 'gast');
    const K = proeven.K;
    const toets = K.validate({ titel: 'Frans', vragen: [{ type: 'kort', vraag: 'bonjour?', antwoord: 'hallo', punten: 1, doel: '10.1.GL5.1' }] });
    proeven.save(toets, 'frans.json');
    const vb = taken.voorbeeld({ soort: 'proef', file: 'frans.json' });
    const t = taken.maak({ soort: 'proef', file: 'frans.json', namen: ['Ada', 'Bo', 'Cas', 'Dex'] });
    const id = taken.lijst()[0].id;
    taken.zetAfwezig({ id, naam: 'Dex', aan: true });
    const ll = taken.lijst()[0].leerlingen;
    const o = opvolgen.overzicht();
    process.stdout.write('\\n@@' + JSON.stringify({ vb, ll, rijen: o.rijen.map(r => r.naam), gasten: o.gasten, vakjes: o.kolommen[0].vakjes, klas: klas.read().leerlingen }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.strictEqual(o.vb.vak, 'Frans');
  assert.deepStrictEqual(o.vb.niet.sort(), ['Bo', 'Cas'], 'Hele klas vinkt Bo (Frans niet bij mij) en Cas (gast) niet aan');
  const per = Object.fromEntries(o.ll.map(l => [l.naam, l]));
  assert.ok(per.Bo.niet && per.Cas.niet && !per.Ada.niet);
  assert.ok(per.Dex.afwezig);
  assert.deepStrictEqual(o.rijen, ['Ada', 'Bo', 'Dex'], 'de gast staat niet in Opvolgen');
  assert.deepStrictEqual(o.gasten, ['Cas']);
  assert.strictEqual(o.vakjes.bo, undefined, 'Frans niet bij mij: een streepje');
  assert.strictEqual(o.vakjes.dex.inhalen, true);
  const k = Object.fromEntries(o.klas.map(l => [l.naam, l]));
  assert.deepStrictEqual(k.Bo.nietVakken, ['frans']);
  assert.strictEqual(k.Cas.gast, true);
});

test('klas: gast en "niet bij mij" blijven bij bewaren, en weer weghalen kan', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'klas-niet-'));
  const out = execFileSync(process.execPath, ['-e', `
    const klas = require('./src/klas');
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Ada', 'Bo'] });
    const id = n => klas.read().leerlingen.find(l => l.naam === n).id;
    klas.setNiveau(id('Ada'), 'gast');
    klas.setNiveau(id('Bo'), 'niet', 'wo');
    klas.setNiveau(id('Bo'), 'ridder', 'frans');
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Ada', 'Bo', 'Cas'] });
    const na = klas.read().leerlingen;
    klas.setNiveau(id('Ada'), 'page');
    klas.setNiveau(id('Bo'), '', 'wo');
    process.stdout.write('\\n@@' + JSON.stringify({ na, terug: klas.read().leerlingen }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  const na = Object.fromEntries(o.na.map(l => [l.naam, l]));
  assert.strictEqual(na.Ada.gast, true, 'gast blijft na het bewaren van de klaslijst');
  assert.deepStrictEqual(na.Bo.nietVakken, ['wo']);
  assert.strictEqual(na.Bo.vakNiveaus.frans, 'ridder');
  const terug = Object.fromEntries(o.terug.map(l => [l.naam, l]));
  assert.strictEqual(terug.Ada.gast, undefined);
  assert.strictEqual(terug.Ada.niveau, 'page');
  assert.strictEqual(terug.Bo.nietVakken, undefined);
});
