// Punten (wensenlijst 20 nov, punt 8): welke poging telt bij een herkansing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

test('punten: hoogste, laatste, eerste of gemiddelde; keuze per toets blijft bewaard', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'punten-'));
  const out = execFileSync(process.execPath, ['-e', `
    const p = require('./src/punten');
    const pog = [{ punten: 4, max: 10 }, { punten: 16, max: 20 }];
    const r = Object.fromEntries(p.KEUZES.map(k => [k, p.telt(pog, k)]));
    const voor = p.keuzes();
    p.zet({ toets: 'breuken.json', telt: 'laatste' });
    let fout = '';
    try { p.zet({ toets: 'x.json', telt: 'onzin' }); } catch (e) { fout = e.message; }
    process.stdout.write('\\n@@' + JSON.stringify({ r, voor, na: p.keuzes(), fout, leeg: p.telt([], 'hoogste') }));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop();
  const o = JSON.parse(out);
  assert.deepStrictEqual(o.r.hoogste, { punten: 16, max: 20 });
  assert.deepStrictEqual(o.r.laatste, { punten: 16, max: 20 });
  assert.deepStrictEqual(o.r.eerste, { punten: 4, max: 10 });
  assert.ok(Math.abs(o.r.gemiddelde.punten / o.r.gemiddelde.max - 0.6) < 1e-9);
  assert.deepStrictEqual(o.voor, { standaard: 'hoogste', telt: {}, herk: {} });
  assert.deepStrictEqual(o.na.telt, { 'breuken.json': 'laatste' });
  assert.ok(o.fout);
  assert.strictEqual(o.leeg, null);
});

test('herkansing alleen als de leerkracht het zegt: koppelen, ontkoppelen, geen rondjes', () => {
  process.env.LANCELOT_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'herk-'));
  const punten = require('../src/punten');
  let r = punten.koppel({ kolom: 'b', van: 'a' });
  assert.strictEqual(r.herk.b, 'a');
  r = punten.koppel({ kolom: 'c', van: 'b' });
  assert.strictEqual(punten.eerste('c', r.herk), 'a');
  assert.throws(() => punten.koppel({ kolom: 'a', van: 'c' }), /rondje/);
  assert.throws(() => punten.koppel({ kolom: 'a', van: 'a' }));
  r = punten.koppel({ kolom: 'b', van: '' });
  assert.strictEqual(r.herk.b, undefined);
  assert.strictEqual(r.herk.c, 'b');
});

test('punten op twee pc\'s tegelijk gekozen: per keuze wint de laatste, "geen herkansing" blijft', () => {
  const punten = require('../src/punten');
  const bord = JSON.stringify({ standaard: 'hoogste', telt: { t1: 'laatste' }, herk: { k2: 'k1', k3: '' }, tijd: { 'telt:t1': '2026-11-20T10:00:00Z', 'herk:k2': '2026-11-20T10:00:00Z', 'herk:k3': '2026-11-20T10:00:05Z' } });
  const thuis = JSON.stringify({ standaard: 'gemiddelde', telt: { t1: 'eerste', t2: 'hoogste' }, herk: { k3: 'k1' }, tijd: { standaard: '2026-11-20T10:00:01Z', 'telt:t1': '2026-11-20T09:00:00Z', 'telt:t2': '2026-11-20T10:00:01Z', 'herk:k3': '2026-11-20T10:00:01Z' } });
  for (const uit of [punten.samen(bord, thuis), punten.samen(thuis, bord)]) {
    const d = JSON.parse(uit);
    assert.strictEqual(d.standaard, 'gemiddelde');
    assert.deepStrictEqual(d.telt, { t1: 'laatste', t2: 'hoogste' });
    assert.deepStrictEqual(d.herk, { k2: 'k1', k3: '' });
  }
});
