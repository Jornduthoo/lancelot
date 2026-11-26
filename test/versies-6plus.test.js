// Twee versies van één toets (wens 26 nov, punt 3): maakt een leerling de 6- en de 6+-versie, dan telt het beste op 10,
// in Opvolgen › Punten en in "Voor Bingel". Herkend aan de titels; "geen andere versie" maakt ze los.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const punten = require('../src/punten');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), taken = require('./src/taken'), bingel = require('./src/bingel'), opvolgen = require('./src/opvolgen'), punten = require('./src/punten');
  const tools = require('./src/connector-tools');
  const doe = (t, naam, a) => { taken.open({ id: t.id, naam }); taken.toetsAntwoord({ id: t.id, naam, vraag: '0', waarde: a }); taken.inleveren({ id: t.id, naam }); };
  const out = (() => { ${code} })();
  taken.flush();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

const k = (id, titel, dag, toets = '') => ({ id, soort: 'proef', titel, dag, toets });

test('herkent 6 en 6+ van dezelfde toets aan de titel, niet een andere toets van hetzelfde thema', () => {
  const kols = [
    k('a', 'Toets De Tweede Wereldoorlog', '2026-11-24T18:52:47Z'),
    k('b', '6+ · WO De Tweede Wereldoorlog · Toets synthese', '2026-11-24T18:52:47Z'),
    k('c', 'Taal thema 3 – dictee', '2026-11-24T18:09:21Z'),
    k('d', '6+ · Taal thema 3 · Toets spelling', '2026-11-24T18:09:21Z'),
    k('e', 'Toets getallenkennis - Blok 4', '2026-11-24T17:45:10Z'),
    k('f', '6+ · Rekenen blok 4 · Toets getallenkennis', '2026-11-24T17:45:10Z'),
    k('g', 'Taal thema 3 – taaldenken', '2026-11-24T12:33:55Z'),
    k('h', 'Iets anders', '2026-11-24T12:33:55Z', 'zes-plus-taal-t3-toets-taaldenken.json'),
    k('i', '6+ · Taal thema 3 · Toets taaldenken en betekenissen', '2026-11-24T12:33:56Z'),
    k('j', 'Toets De Tweede Wereldoorlog', '2026-10-01T10:00:00Z'),
    k('l', '6+ · Taal thema 9 · Dictee les 5', '2026-11-24T10:00:00Z'),
    k('m', 'Taal thema 9 – dictee les 10', '2026-11-24T10:00:00Z'),
  ];
  const v = punten.versies(kols, { herk: {}, los: [] });
  assert.deepStrictEqual(v, { b: 'a', f: 'e', i: 'g' });
  // Zelf losgemaakt: niet meer samen.
  assert.deepStrictEqual(punten.versies(kols, { herk: { b: '' }, los: ['b'] }), { f: 'e', i: 'g' });
});

test('wie beide versies maakte: het beste op 10 telt in Opvolgen en voor Bingel; losmaken kan', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  fs.mkdirSync(path.join(A, 'proeven'));
  fs.writeFileSync(path.join(A, 'proeven', 'wo.json'), JSON.stringify({ title: 'Toets De Tweede Wereldoorlog', vragen: [{ type: 'kort', vraag: 'Jaar?', antwoord: '1940', punten: 20 }] }));
  fs.writeFileSync(path.join(A, 'proeven', 'zes-plus-wo.json'), JSON.stringify({ title: '6+ · WO De Tweede Wereldoorlog · Toets synthese', vragen: [{ type: 'kort', vraag: 'Jaar?', antwoord: '1945', punten: 4 }] }));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Sam', 'Lotte'] });
    const t6 = taken.maak({ soort: 'proef', file: 'wo.json', namen: ['Sam', 'Lotte'] });
    const t6p = taken.maak({ soort: 'proef', file: 'zes-plus-wo.json', namen: ['Lotte'] });
    doe(t6, 'Sam', '1940'); doe(t6, 'Lotte', 'weet ik niet'); doe(t6p, 'Lotte', '1945');
    const ov = opvolgen.overzicht();
    const b = bingel.data({ kolom: t6.id });
    const tool = tools.TOOLS.find(x => x.name === 'bingel_export').fn({ taak_id: t6p.id });
    punten.koppel({ kolom: t6p.id, van: '' });
    const los = bingel.data({ kolom: t6.id });
    return { versie: ov.telt.versie, t6: t6.id, t6p: t6p.id, b, tool: tool.punten_tekst, los };
  `);
  assert.deepStrictEqual(r.versie, { [r.t6p]: r.t6 });
  assert.deepStrictEqual(r.b.rijen.map(x => [x.naam, x.op10]), [['Sam', 10], ['Lotte', 10]]);
  assert.strictEqual(r.b.herkansingen, 0);
  assert.strictEqual(r.b.beste_telt, true);
  assert.strictEqual(r.tool, '10\n10');
  assert.deepStrictEqual(r.los.rijen.map(x => [x.naam, x.op10]), [['Sam', 10], ['Lotte', 0]]);
  assert.strictEqual(r.los.beste_telt, undefined);
});
