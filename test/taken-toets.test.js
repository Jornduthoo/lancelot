// Een toets als taak: per leerling, op zijn eigen niveau (of een ander), gepland of meteen. Wat ingeleverd is,
// komt bij één afname per taak in De Proef, zodat de leerkracht daar verbetert zoals na een afname op het bord.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = {
  title: 'Toets op niveaus',
  vragen: [{ type: 'meerkeuze', vraag: '2 + 2?', opties: ['3', '4', '5'], juist: 1 }, { type: 'open', vraag: 'Waarom?', punten: 2 }],
  page: [{ type: 'meerkeuze', vraag: '1 + 1?', opties: ['2', '3'], juist: 0 }],
  ridder: [{ type: 'kort', vraag: '12 × 12?', antwoord: '144' }],
};

test('toets als taak: niveau per kind, gepland, verbeterd zoals op het bord en in één afname', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-toets-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  const morgen = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    taken.zetNiveau({ id: t.id, naam: 'Mats', niveau: 'ridder' });
    const later = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Noor'], vanaf: '${morgen}' });
    const noor = taken.mijn('Noor').taken.length;
    const lotte = taken.open({ id: t.id, naam: 'Lotte' });
    // De keuzes staan door elkaar: zoek waar "4" staat in de eigen volgorde van Lotte.
    const mk = lotte.view.pages.find(p => p.type === 'meerkeuze');
    const vier = mk.opties.findIndex(o => (o.tekst || o) === '4');
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: mk.id, waarde: vier });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '1', waarde: 'Omdat.' });
    const tussen = taken.mijn('Lotte').taken[0];
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    const mats = taken.open({ id: t.id, naam: 'Mats' });
    taken.toetsAntwoord({ id: t.id, naam: 'Mats', vraag: mats.view.pages[0].id, waarde: '144' });
    taken.inleveren({ id: t.id, naam: 'Mats' });
    const file = taken.lijst().find(x => x.id === t.id) && taken.detail({ id: t.id, naam: 'Lotte' }).afname;
    const rec = proeven.laadAfname(file);
    let fout = '';
    try { taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: '0', waarde: 0 }); } catch (e) { fout = e.message; }
    return {
      noor, lotteVragen: lotte.view.pages.length, matsVraag: mats.view.pages[0].vraag, tussen: [tussen.gedaan, tussen.totaal, tussen.status],
      spelers: rec.spelers.map(s => [s.naam, s.niveau, proeven.stand(rec, s)]), taak: rec.taak === t.id, fout,
      lotteKlaar: taken.open({ id: t.id, naam: 'Lotte' }).view === undefined, gepland: !!taken.lijst().find(x => x.id === later.id).vanaf,
    };
  `);
  assert.equal(res.noor, 0);
  assert.equal(res.gepland, true);
  assert.equal(res.lotteVragen, 2);
  assert.equal(res.matsVraag, '12 × 12?');
  assert.deepEqual(res.tussen, [2, 2, 'bezig']);
  assert.deepEqual(res.spelers, [['Lotte', 'schildknaap', { punten: 1, max: 3, open: 1 }], ['Mats', 'ridder', { punten: 1, max: 1, open: 0 }]]);
  assert.equal(res.taak, true);
  assert.match(res.fout, /al in/);
  assert.equal(res.lotteKlaar, true);
});
