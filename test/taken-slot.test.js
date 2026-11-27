// Op slot bij verlaten (wens 27 nov): een extra keuze bij een beveiligde toets als taak. Wie de toets verlaat,
// kan pas verder als de leerkracht hem weer opent. Standaard uit: zonder die keuze is wegklikken alleen een melding.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken');
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

const TOETS = { title: 'Toets op slot', vragen: [{ type: 'kort', vraag: '12 × 12?', antwoord: '144' }, { type: 'kort', vraag: '3 × 3?', antwoord: '9' }] };

test('op slot bij verlaten: antwoorden gaan niet meer, de leerkracht opent de toets weer', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-slot-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats', 'Noor'] });
    const gewoon = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Mats'], beveiligd: true });
    const t = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Lotte'], beveiligd: true, slot: true });
    // Zonder volledig scherm geen slot.
    const zonder = taken.maak({ soort: 'proef', file: 'toets.json', namen: ['Noor'], slot: true });
    const v = taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', pos: 0 });
    const q = v.view.pages[0];
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: q.id, waarde: '144' });
    const weg = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'tab' });
    let fout = '';
    try { taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: q.id, waarde: '9' }); } catch (e) { fout = e.message; }
    const nogEens = taken.verlaat({ id: t.id, naam: 'Lotte', soort: 'herladen' });
    const herladen = taken.open({ id: t.id, naam: 'Lotte' });
    const lijst = taken.lijst().find(x => x.id === t.id);
    const kz = taken.keuzesVoor(t.id);
    const open = taken.ontgrendel({ id: t.id, naam: 'Lotte' });
    const na = taken.open({ id: t.id, naam: 'Lotte' });
    taken.toetsAntwoord({ id: t.id, naam: 'Lotte', vraag: q.id, waarde: '144' });
    // Gewone beveiligde toets: alleen een melding.
    taken.toetsAntwoord({ id: gewoon.id, naam: 'Mats', pos: 0 });
    const gw = taken.verlaat({ id: gewoon.id, naam: 'Mats', soort: 'tab' });
    // Achteraf aanzetten via de keuzes, en weer uit: wie op slot stond, mag verder.
    taken.zetKeuzes({ id: gewoon.id, slot: true });
    taken.verlaat({ id: gewoon.id, naam: 'Mats', soort: 'herladen' });
    const gwSlot = taken.open({ id: gewoon.id, naam: 'Mats' }).opSlot;
    taken.zetKeuzes({ id: gewoon.id, slot: false });
    const gwVrij = taken.open({ id: gewoon.id, naam: 'Mats' }).opSlot;
    // Aanzetten op een toets zonder volledig scherm zet ook volledig scherm aan; volledig scherm uit = ook geen slot.
    taken.zetKeuzes({ id: zonder.id, slot: true });
    const zonderNa = taken.keuzesVoor(zonder.id);
    taken.zetBeveiligd({ id: zonder.id, aan: false });
    const zonderUit = taken.keuzesVoor(zonder.id);
    const plan = JSON.parse(require('fs').readFileSync(require('path').join(taken.PLAN, t.id + '.json'), 'utf8'));
    return { zonderSlot: !!taken.lijst().find(x => x.id === zonder.id) && v.slot, weg: weg.slot, fout, nogEens: nogEens.n, herladen: herladen.opSlot, lijst: lijst.slot, ll: lijst.leerlingen[0].opSlot, kz: kz.slot,
      open: open.namen, na: na.opSlot, gw: !!gw.slot, gwOpen: taken.open({ id: gewoon.id, naam: 'Mats' }).opSlot, gwSlot, gwVrij, zonderNa: [zonderNa.slot, zonderNa.beveiligd], zonderUit: [zonderUit.slot, zonderUit.beveiligd], plan: plan.slot };
  `);
  assert.equal(r.weg, true);
  assert.match(r.fout, /op slot/);
  assert.equal(r.nogEens, 1, 'op slot: nog eens weggaan telt niet dubbel');
  assert.equal(r.herladen, true, 'opnieuw geopend: nog altijd op slot');
  assert.equal(r.lijst, true);
  assert.equal(r.ll, true);
  assert.equal(r.kz, true);
  assert.deepEqual(r.open, ['Lotte']);
  assert.equal(r.na, false);
  assert.equal(r.gw, false);
  assert.equal(r.gwOpen, false);
  assert.equal(r.gwSlot, true);
  assert.equal(r.gwVrij, false);
  assert.deepEqual(r.zonderNa, [true, true]);
  assert.deepEqual(r.zonderUit, [false, false]);
  assert.equal(r.plan, true);
});

test('op slot: standaard uit, keuze in Instellingen › Taken en in de connector', () => {
  const std = require('../src/takenstandaard');
  assert.equal(std.STANDAARD ? std.STANDAARD.slot : false, false);
  const src = fs.readFileSync(path.join(ROOT, 'src', 'connector-tools.js'), 'utf8');
  assert.match(src, /op_slot/);
  const html = fs.readFileSync(path.join(ROOT, 'public', 'taken.html'), 'utf8');
  assert.match(html, /id="tk-slotkeuze"/);
  assert.match(html, /id="kz-slot"/);
});

test('op slot via de connector: zien wie op slot staat en de toets weer openen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taken-slot-c-'));
  fs.mkdirSync(path.join(tmp, 'proeven'));
  fs.writeFileSync(path.join(tmp, 'proeven', 'toets.json'), JSON.stringify(TOETS));
  const r = run(tmp, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Lotte', 'Mats'] });
    const ct = require('./src/connector-tools');
    const roep = (n, a) => ct.TOOLS.find(x => x.name === n).fn(a);
    const g = roep('taak_geven', { file: 'toets.json', soort: 'proef', namen: ['Lotte', 'Mats'], beveiligd: false, op_slot: true });
    for (const naam of ['Lotte', 'Mats']) { taken.open({ id: g.taak_id, naam }); taken.toetsAntwoord({ id: g.taak_id, naam, pos: 0 }); taken.verlaat({ id: g.taak_id, naam, soort: 'tab' }); }
    const lijst = roep('taken', {}).taken[0];
    const een = roep('toets_openen', { taak_id: g.taak_id, naam: 'Lotte' });
    let fout = '';
    try { roep('toets_openen', { taak_id: g.taak_id, naam: 'Lotte' }); } catch (e) { fout = e.message; }
    const rest = roep('toets_openen', { taak_id: g.taak_id });
    roep('taak_keuzes', { taak_id: g.taak_id, op_slot: false });
    return { kz: g.keuzes.slot, bv: g.keuzes.beveiligd, opSlot: lijst.op_slot, ll: lijst.leerlingen.map(l => [l.op_slot, l.toets_verlaten]), een: een.geopend, fout, rest: rest.geopend, na: roep('taken', {}).taken[0].keuzes.slot };
  `);
  assert.equal(r.kz, true);
  assert.equal(r.bv, true, 'op slot zet volledig scherm mee aan');
  assert.deepEqual(r.opSlot, ['Lotte', 'Mats']);
  assert.deepEqual(r.ll, [[true, 1], [true, 1]]);
  assert.deepEqual(r.een, ['Lotte']);
  assert.match(r.fout, /niet op slot/);
  assert.deepEqual(r.rest, ['Mats']);
  assert.equal(r.na, false);
});
