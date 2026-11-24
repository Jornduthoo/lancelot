// Dezelfde toets opnieuw geven: de oude taak sluit voor die leerlingen (Instellingen › Taken, standaard aan).
// Wie bezig was, levert in (zijn punten blijven bij de Resultaten). En per toestel zie je welke taken daar open staan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), proeven = require('./src/proeven'), takenstandaard = require('./src/takenstandaard'), toestellen = require('./src/toestellen'), settings = require('./src/settings');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, LANCELOT_PC: 'BORD' }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = { title: 'Rekentoets', vragen: [{ type: 'meerkeuze', vraag: '2 + 2?', opties: ['3', '4', '5'], juist: 1 }, { type: 'kort', vraag: '3 + 3?', antwoord: '6' }] };
function pc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-opnieuw-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  fs.writeFileSync(path.join(tmp, 'proeven', 'ander.json'), JSON.stringify({ ...TOETS, title: 'Andere toets' }));
  return tmp;
}
const KLAS = `klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });`;
const begin = (id, naam) => `{ const o = taken.open({ id: ${id}, naam: '${naam}' }); const v = o.view.pages.find(p => p.type === 'kort'); taken.toetsAntwoord({ id: ${id}, naam: '${naam}', vraag: v.id, waarde: '6' }); }`;

test('opnieuw geven: wie bezig was levert in (punten bij de afname), wie nog niet begon gaat uit de oude taak', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const oud = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats', 'Noor'] });
    ${begin('oud.id', 'Lotte')}
    const nieuw = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    const o = taken.lijst().find(x => x.id === oud.id);
    const a0 = proeven.afnameVanTaak(oud.id); const afname = a0 && proeven.laadAfname(a0.file);
    return {
      dicht: o.dicht, namen: o.leerlingen.map(l => l.naam + ':' + l.status).sort(),
      lotteMijn: taken.mijn('Lotte').taken.filter(t => t.status !== 'klaar').map(t => t.id),
      nieuw: nieuw.id, inAfname: !!(afname && afname.spelers.some(s => s.naam === 'Lotte')),
    };
  `);
  assert.strictEqual(r.dicht, false, 'Noor moet de oude taak nog maken: die blijft open');
  assert.deepStrictEqual(r.namen, ['Lotte:klaar', 'Noor:nieuw']);
  assert.deepStrictEqual(r.lotteMijn, [r.nieuw], 'Lotte ziet alleen nog de nieuwe toets');
  assert.strictEqual(r.inAfname, true, 'wat Lotte al deed, staat bij de Resultaten');
});

test('opnieuw geven aan iedereen: de hele oude taak sluit; een andere toets blijft open', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    const oud = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    const ander = taken.maak({ soort: 'proef', file: 'ander.json', namen: ['Lotte', 'Mats'] });
    ${begin('oud.id', 'Mats')}
    taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte', 'Mats'] });
    const l = taken.lijst();
    const plan = JSON.parse(fs.readFileSync(path.join(taken.PLAN, oud.id + '.json'), 'utf8'));
    return { oud: l.find(x => x.id === oud.id).dicht, ander: l.find(x => x.id === ander.id).dicht, plan: plan.dicht };
  `.replace('const l =', 'const fs = require("fs"), path = require("path"); const l ='));
  assert.deepStrictEqual(r, { oud: true, ander: false, plan: true });
});

test('uit te zetten in Instellingen › Taken; een herkansing raakt wie klaar was niet; twee niveaus van dezelfde keer ook niet', () => {
  const A = pc();
  const r = run(A, `${KLAS}
    takenstandaard.zetOudeSluiten(false);
    const a = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] });
    taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] });
    const uit = taken.lijst().find(x => x.id === a.id).dicht;
    takenstandaard.zetOudeSluiten(true);
    const b = taken.maak({ soort: 'proef', file: 'ander.json', namen: ['Mats', 'Noor'] });
    taken.inleveren({ id: b.id, naam: 'Mats' });
    // Herkansing voor Mats (klaar): Noor moet nog, dus de oude blijft open, Mats blijft klaar in de oude.
    taken.maak({ soort: 'proef', file: 'ander.json', namen: ['Mats'] });
    const ob = taken.lijst().find(x => x.id === b.id);
    // Twee niveaus na elkaar (zelfde keer): de tweede taak sluit de eerste niet.
    const c = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Noor'] });
    taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Noor'], na: c.id });
    return { uit, herk: [ob.dicht, ob.leerlingen.map(l => l.naam + ':' + l.status).sort()], na: taken.lijst().find(x => x.id === c.id).leerlingen.length, std: takenstandaard.read().oudeSluiten };
  `);
  assert.deepStrictEqual(r, { uit: false, herk: [false, ['Mats:klaar', 'Noor:nieuw']], na: 1, std: true });
});

test('een geplande herhaling sluit de oude taak pas als ze verschijnt', () => {
  const A = pc();
  const morgen = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const r = run(A, `${KLAS}
    const oud = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] });
    const later = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], vanaf: '${morgen}' });
    const voor = taken.lijst().find(x => x.id === oud.id).dicht;
    taken.startNu({ id: later.id });
    return { voor, na: taken.lijst().find(x => x.id === oud.id).dicht };
  `);
  assert.deepStrictEqual(r, { voor: false, na: true });
});

test('per toestel: de hartslag zegt welke taken open staan, en een verschil valt op in de lijst', () => {
  const A = pc();
  const lesmap = fs.mkdtempSync(path.join(os.tmpdir(), 'lesmap-'));
  const r = run(A, `${KLAS}
    settings.write({ lesmap: ${JSON.stringify(lesmap)} });
    const x = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'] });
    const y = taken.maak({ soort: 'proef', file: 'ander.json', namen: ['Mats'] });
    taken.sluit(y.id);
    toestellen.hartslag(false, taken.openIds());
    const eigen = JSON.parse(require('fs').readFileSync(require('path').join(toestellen.DIR(), 'BORD.json'), 'utf8')).open;
    // Een andere pc (Thuis) waar y nog open staat en x niet.
    require('fs').writeFileSync(require('path').join(toestellen.DIR(), 'THUIS.json'), JSON.stringify({ id: 'THUIS', naam: 'Thuis', tijd: new Date().toISOString(), open: [y.id] }));
    const l = taken.lijst();
    const stand = toestellen.stand(new Map(), { lesmap: 'x', at: Date.now() }, taken.openIds().length);
    return { eigen: eigen.includes(x.id) && !eigen.includes(y.id), x: l.find(t => t.id === x.id).toestellen, y: l.find(t => t.id === y.id).toestellen, thuis: stand.anderen[0].open, hier: stand.dit.open };
  `);
  assert.deepStrictEqual(r, { eigen: true, x: { nietOpen: ['Thuis'] }, y: { nogOpen: ['Thuis'] }, thuis: 1, hier: 1 });
});
