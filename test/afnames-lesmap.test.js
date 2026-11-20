// Toetsresultaten op elke pc (2026-11-20): de afnames gaan via Mijn lesmap mee. Verbeter je thuis terwijl op het bord
// nog leerlingen inleveren, dan blijft alles: per leerling en per vraag wint de laatste wijziging, gemaild blijft gemaild,
// en wie opnieuw moest beginnen, komt niet terug via de andere pc.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('Mijn lesmap: afnames van toetsen per leerling en per vraag samenvoegen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afnames-lesmap-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  let klok = Date.parse('2026-11-20T08:00:00Z');
  const pc = (data, code) => {
    klok += 60000;
    return JSON.parse(execFileSync(process.execPath, ['-e', `
      Date.now = () => ${klok};
      const lesmap = require('./src/lesmap'), settings = require('./src/settings'), proeven = require('./src/proeven');
      settings.write({ lesmap: ${JSON.stringify(map)} });
      lesmap.init([{ kind: 'afnames', dir: () => proeven.AFNAMES, perKlas: true, remote: 'toetsen-resultaten', validate: proeven.afnameGeldig, merge: proeven.afnameSamen }]);
      const K = proeven.K;
      const toets = K.validate({ titel: 'Taal', vragen: [{ type: 'kort', vraag: 'a?', antwoord: 'b', punten: 1 }, { type: 'open', vraag: 'Leg uit', punten: 2 }] });
      const leerling = (naam, t) => ({ naam, antwoorden: { 0: 'b', 1: 'omdat' }, auto: { 0: 1 }, hand: {}, events: [], ingeleverd: new Date(t).toISOString(), t });
      const een = () => proeven.afnames()[0].file;
      (async () => {
        await lesmap.sync();
        ${code}
        await lesmap.sync();
        const out = proeven.afnames().map(a => {
          const rec = proeven.laadAfname(a.file);
          return { file: a.file, klaar: !!rec.klaar, spelers: rec.spelers.map(s => ({ naam: s.naam, hand: s.hand, gemaild: !!s.gemaild, ...proeven.stand(rec, s) })) };
        });
        process.stdout.write('\\n@@' + JSON.stringify({ out, error: lesmap.view().error }));
      })();
    `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  };

  // Het bord: Amira levert in. Thuis ziet het meteen.
  let r = pc(bord, `proeven.bewaarAfname({ title: 'Taal', datum: '2026-11-20T08:00:00Z', toets, spelers: [leerling('Amira', Date.now())], klaar: false, taak: 'tk1' });`);
  assert.strictEqual(r.out[0].spelers.length, 1);
  r = pc(thuis, '');
  assert.deepStrictEqual(r.out[0].spelers.map(s => s.naam), ['Amira']);
  assert.strictEqual(r.out[0].spelers[0].open, 1, 'thuis: de open vraag van Amira staat klaar om te verbeteren');

  // Thuis verbeter je Amira (nog niet gesynchroniseerd), op het bord levert Bram in en krijgt Amira daar een mail.
  r = pc(thuis, `proeven.cijfer({ file: een(), naam: 'Amira', id: '1', punten: 2 });`);
  r = pc(bord, `
    const rec = proeven.laadAfname(een());
    rec.spelers.push(leerling('Bram', Date.now()));
    rec.spelers.find(s => s.naam === 'Amira').gemaild = new Date().toISOString();
    proeven.schrijfAfname(rec);`);
  const amira = r.out[0].spelers.find(s => s.naam === 'Amira');
  assert.deepStrictEqual(r.out[0].spelers.map(s => s.naam), ['Amira', 'Bram'], 'bord: Bram blijft, ook na het samenvoegen');
  assert.strictEqual(amira.hand['1'], 2, 'bord: de punten van thuis staan erbij');
  assert.strictEqual(amira.gemaild, true);
  assert.strictEqual(amira.punten, 3);

  // Allebei een andere vraag/leerling tegelijk verbeterd: niets gaat verloren.
  pc(thuis, '');
  pc(thuis, `proeven.cijfer({ file: een(), naam: 'Bram', id: '1', punten: 1 });`);
  pc(bord, `proeven.cijfer({ file: een(), naam: 'Amira', id: '1', punten: 1.5 });`);
  r = pc(thuis, '');
  const t = Object.fromEntries(r.out[0].spelers.map(s => [s.naam, s]));
  assert.strictEqual(t.Bram.hand['1'], 1);
  assert.strictEqual(t.Amira.hand['1'], 1.5, 'de laatste wijziging (op het bord) wint');
  assert.strictEqual(t.Amira.gemaild, true, 'gemaild blijft gemaild: geen tweede mail');

  // Bram moet opnieuw beginnen (op het bord). Thuis brengt hem niet terug.
  pc(bord, `
    const rec = proeven.laadAfname(een());
    rec.spelers = rec.spelers.filter(s => s.naam !== 'Bram');
    rec.weg = { bram: Date.now() };
    proeven.schrijfAfname(rec);`);
  pc(thuis, `proeven.cijfer({ file: een(), naam: 'Amira', id: '0', punten: 1, over: true });`);
  r = pc(bord, '');
  assert.deepStrictEqual(r.out[0].spelers.map(s => s.naam), ['Amira']);
  r = pc(thuis, '');
  assert.deepStrictEqual(r.out[0].spelers.map(s => s.naam), ['Amira']);
  assert.strictEqual(r.error, '');
});

test('afnameSamen: een leerling die opnieuw inleverde, houdt zijn nieuwe antwoorden en de punten van de leerkracht', () => {
  const proeven = require('../src/proeven');
  const oud = { naam: 'Cas', antwoorden: { 1: 'oud' }, auto: { 0: 0 }, hand: { 1: 1 }, ht: { 1: 100 }, ingeleverd: '2026-11-20T08:00:00Z', t: 100 };
  const nieuw = { naam: 'Cas', antwoorden: { 1: 'nieuw' }, auto: { 0: 1 }, hand: { 1: 1 }, ht: { 1: 100 }, ingeleverd: '2026-11-20T09:00:00Z', t: 200 };
  const basis = { title: 'T', toets: {}, spelers: [] };
  const m = JSON.parse(proeven.afnameSamen(JSON.stringify({ ...basis, spelers: [oud] }), JSON.stringify({ ...basis, spelers: [nieuw] })));
  assert.strictEqual(m.spelers[0].antwoorden[1], 'nieuw');
  assert.strictEqual(m.spelers[0].auto[0], 1);
  assert.strictEqual(m.spelers[0].hand[1], 1);
});
