// Een toets als taak kan beveiligd openen (volledig scherm, wegklikken gemeld), zoals een afname op het bord.
// Een extra keuze: een taak zonder die keuze werkt zoals vroeger. Wegklikken is alleen een melding: de antwoorden blijven.
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

const TOETS = { title: 'Beveiligde toets', vragen: [{ type: 'kort', vraag: '12 × 12?', antwoord: '144' }, { type: 'kort', vraag: '3 × 3?', antwoord: '9' }] };

test('beveiligde toets als taak: wegklikken wordt geteld, antwoorden blijven, in de afname bij de resultaten', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-bv-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  const res = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const oud = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Mats'] });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], beveiligd: true });
    const voor = taken.open({ id: t.id, naam: 'Lotte' });
    // Nog niet begonnen: wegklikken telt niet.
    const nogNiet = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'tab' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', pos: 0 });
    const q = voor.view.pages[0];
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: q.id, waarde: q.vraag === '12 × 12?' ? '144' : '9' });
    const een = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'scherm' });
    // Volledig scherm uit en ander tabblad tegelijk: één keer.
    const dubbel = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'tab' });
    taken.terugIn({ id: t.id, naam: 'Lotte' });
    const twee = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'herladen' });
    const terug = taken.open({ id: t.id, naam: 'Lotte' });
    const ll = taken.lijst().find(x => x.id === t.id);
    const det = taken.detail({ id: t.id, naam: 'Lotte' });
    // Een oude taak (zonder keuze): niets verandert, wegklikken telt niet.
    taken.toetsAntwoord({ id: oud.id, naam: 'Mats', pos: 0 });
    const oudWeg = taken.verlaat({ id: oud.id, naam: 'Mats', soort: 'tab' });
    const oudOpen = taken.open({ id: oud.id, naam: 'Mats' });
    // Achteraf aanzetten kan.
    const aan = taken.zetBeveiligd({ id: oud.id, aan: true });
    taken.inleveren({ id: t.id, naam: 'Lotte' });
    const rec = proeven.laadAfname(taken.detail({ id: t.id, naam: 'Lotte' }).afname);
    const plan = JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, t.id + '.json'), 'utf8'));
    return { voor: voor.beveiligd, nogNiet: nogNiet.n, een: een.n, dubbel: !!dubbel.dubbel, twee: twee.n, bewaard: Object.keys(terug.answers).length, bezig: terug.bezig,
      lijstBv: ll.beveiligd, lijstWeg: ll.leerlingen[0].weg, detWeg: det.weg.map(e => e.soort), ms: det.weg[0].ms !== undefined,
      oudBv: oudOpen.beveiligd, oudWeg: oudWeg.n, oudLijst: taken.lijst().find(x => x.id === oud.id).leerlingen[0].weg, aan: aan.aan,
      events: rec.spelers[0].events.map(e => e.soort), plan: plan.beveiligd };
  `);
  assert.equal(res.voor, true);
  assert.equal(res.nogNiet, 0);
  assert.equal(res.een, 1);
  assert.equal(res.dubbel, true);
  assert.equal(res.twee, 2);
  assert.equal(res.bewaard, 1, 'het antwoord blijft staan na wegklikken');
  assert.equal(res.bezig, true);
  assert.equal(res.lijstBv, true);
  assert.equal(res.lijstWeg, 2);
  assert.deepEqual(res.detWeg, ['scherm', 'herladen']);
  assert.equal(res.ms, true);
  assert.equal(res.oudBv, false);
  assert.equal(res.oudWeg, 0);
  assert.equal(res.oudLijst, undefined);
  assert.equal(res.aan, true);
  assert.deepEqual(res.events, ['scherm', 'herladen']);
  assert.equal(res.plan, true);
});
