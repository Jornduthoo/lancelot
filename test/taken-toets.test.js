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

test('heropenen: verder werken houdt de antwoorden, opnieuw beginnen geeft een leeg blad en haalt de leerling uit de afname', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-opnieuw-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    for (const naam of ['Lotte', 'Mats']) {
      taken.open({ id: t.id, naam });
      taken.toetsAntwoord({ id: t.id, naam, vraag: '1', waarde: 'Omdat.' });
      taken.inleveren({ id: t.id, naam });
    }
    taken.heropen({ id: t.id, naam: 'Lotte' });
    const verder = taken.open({ id: t.id, naam: 'Lotte' });
    taken.heropen({ id: t.id, naam: 'Mats', opnieuw: true });
    const m = taken.open({ id: t.id, naam: 'Mats' });
    const mats = [m.klaar, Object.keys(m.answers).length, m.poging];
    const file = taken.detail({ id: t.id, naam: 'Lotte' }).afname;
    const voor = proeven.laadAfname(file).spelers.map(s => s.naam);
    taken.toetsAntwoord({ id: t.id, naam: 'Mats', vraag: '1', waarde: 'Nieuw.' });
    taken.inleveren({ id: t.id, naam: 'Mats' });
    const na = proeven.laadAfname(file).spelers.find(s => s.naam === 'Mats');
    return { verder: [verder.klaar, verder.answers['1']], mats, voor, na: na.antwoorden['1'] };
  `);
  assert.deepEqual(res.verder, [false, 'Omdat.']);
  assert.deepEqual(res.mats, [false, 0, 1]);
  assert.deepEqual(res.voor, ['Lotte']);
  assert.equal(res.na, 'Nieuw.');
});

test('toets als taak: voorlezen, volgorde en punten na het inleveren zijn keuzes; zonder keuze zoals vroeger', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-toets-keuzes-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  const vragen = Array.from({ length: 8 }, (_, i) => ({ type: 'meerkeuze', vraag: `Vraag ${i + 1}`, opties: ['a', 'b', 'c', 'd', 'e', 'f'], juist: 0 }));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify({ title: 'Volgorde', vragen }));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const zie = t => { const o = taken.open({ id: t.id, naam: 'Lotte' }); return { voorlees: o.voorlees, vragen: o.view.pages.map(p => p.vraag).join(','), keuzes: o.view.pages.map(p => p.opties.map(x => x.tekst ?? x).join('')).join(',') }; };
    const oud = zie(taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] }));
    const vragenVast = zie(taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], voorlees: 'iedereen', vragenVast: true }));
    const alles = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], vragenVast: true, keuzesVast: true, uitslag: true });
    const allesZie = zie(alles);
    const o = taken.open({ id: alles.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: alles.id, naam: 'Lotte', vraag: o.view.pages[0].id, waarde: 0 });
    taken.inleveren({ id: alles.id, naam: 'Lotte' });
    return { oud, vragenVast, allesZie, uitslag: taken.open({ id: alles.id, naam: 'Lotte' }).uitslag };
  `);
  const inVolgorde = vragen.map(q => q.vraag).join(',');
  assert.equal(res.oud.voorlees, false);
  assert.notEqual(res.oud.vragen, inVolgorde, 'zonder keuze: vragen door elkaar zoals vroeger');
  assert.equal(res.vragenVast.voorlees, true);
  assert.equal(res.vragenVast.vragen, inVolgorde);
  assert.notEqual(res.vragenVast.keuzes, Array(8).fill('abcdef').join(','), 'keuzes nog door elkaar');
  assert.equal(res.allesZie.keuzes, Array(8).fill('abcdef').join(','));
  assert.deepEqual(res.uitslag, { punten: 1, max: 8, hand: 0 });
  fs.rmSync(tmp, { recursive: true, force: true });
});
