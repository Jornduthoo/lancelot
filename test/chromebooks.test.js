// Chromebooks met de LANcelot-extensie (src/chromebooks.js): wie is wie, op het bord, geschiedenis, vastzetten.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (data, code) => JSON.parse(execFileSync(process.execPath, ['-e', `
  const klas = require('./src/klas'), cb = require('./src/chromebooks');
  const out = (() => { ${code} })();
  process.stdout.write('\\n@@' + JSON.stringify(out === undefined ? null : out));
`], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());

test('een Chromebook koppelt zich vanzelf, op het bord alleen wie elders zit en alleen als tonen aanstaat', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-'));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Emma Peeters', 'Mats', 'Noor'] });
    const tab = (id, soort, host, actief) => ({ id, soort, host, titel: host + ' titel', actief });
    // Emma: geraden uit het account. Mats: zit op die Chromebook met zijn naam in LANcelot.
    cb.meld('s1', { email: 'emma.peeters@school.be', tabs: [tab(1, 'web', 'youtube.com', true), tab(2, 'lancelot', '', false)] }, '::ffff:10.0.0.5', () => '');
    cb.meld('s2', { email: 'm.x@school.be', tabs: [tab(5, 'lancelot', '', true)] }, '10.0.0.6', ip => ip === '10.0.0.6' ? 'Mats' : '');
    const lijst = cb.toestellen().map(t => [t.naam, t.gekoppeld, t.elders, t.ip]);
    const uit = cb.bord();
    cb.zet({ tonen: true });
    const aan = cb.bord();
    cb.koppel('emma.peeters@school.be', 'emma peeters');
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    return { lijst, uit, aan, emma: cb.naamVan('EMMA.peeters@school.be'), vreemd: fout(() => cb.koppel('x@school.be', 'Iemand')) };
  `);
  assert.deepStrictEqual(r.lijst, [['Emma Peeters', false, true, '10.0.0.5'], ['Mats', true, false, '10.0.0.6']]);
  assert.deepStrictEqual(r.uit, []);
  assert.deepStrictEqual(r.aan.map(b => [b.naam, b.actief, b.sites]), [['Emma Peeters', 'youtube.com', ['youtube.com']]]);
  assert.deepStrictEqual(r.emma, { naam: 'Emma Peeters', gekoppeld: true, auto: false });
  assert.match(r.vreemd, /niet op de klaslijst/);
});

test('de surfgeschiedenis: één bezoek per site, LANcelot apart, uit = niets bijhouden', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-'));
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Noor'] });
    cb.koppel('noor@school.be', 'Noor');
    const m = (host, soort = 'web') => cb.meld('s', { email: 'noor@school.be', tabs: [{ id: 1, soort, host, titel: host, actief: true }] }, '', () => '');
    m('youtube.com'); m('youtube.com'); m('', 'lancelot'); m('bingel.be');
    cb.weg('s');
    cb.schrijfNu();
    const d = cb.dag();
    const een = cb.geschiedenis(d).bezoeken.map(b => [b.naam, b.host]);
    const filter = cb.geschiedenis(d, 'noor').bezoeken.length;
    const ander = cb.geschiedenis(d, 'mats').bezoeken.length;
    cb.zet({ geschiedenis: false });
    m('spel.io');
    cb.schrijfNu();
    const uit = cb.geschiedenis(d).bezoeken.length;
    const bestand = require('fs').existsSync(require('path').join(process.env.LANCELOT_DATA, 'chromebooks', 'geschiedenis', d + '.json'));
    cb.wisGeschiedenis();
    return { een, filter, ander, uit, bestand, dagen: cb.dagen() };
  `);
  assert.deepStrictEqual(r.een, [['Noor', 'youtube.com'], ['Noor', 'LANcelot'], ['Noor', 'bingel.be']]);
  assert.strictEqual(r.filter, 3);
  assert.strictEqual(r.ander, 0);
  assert.strictEqual(r.uit, 3);
  assert.strictEqual(r.bestand, true);
  assert.deepStrictEqual(r.dagen, []);
});

test('oude dagen gaan weg, de leerkracht wordt nooit gevolgd, vastzetten laat gestuurde links toe', () => {
  const A = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-'));
  const dir = path.join(A, 'chromebooks', 'geschiedenis');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '2020-01-06.json'), '{}');
  const r = run(A, `
    klas.write({ naam: '6A', leerjaar: 6, namen: ['Noor'] });
    const weg = cb.opruimen();
    const fout = f => { try { f(); return null; } catch (e) { return e.message; } };
    const slecht = fout(() => cb.zet({ leerkrachten: 'geen-adres' }));
    cb.zet({ leerkrachten: 'Jorn@School.be, ' });
    const lk = cb.meld('s9', { email: 'jorn@school.be', tabs: [{ id: 1, soort: 'web', host: 'x.be', actief: true }] });
    cb.zet({ vast: true });
    cb.staToe(cb.link('www.bingel.be/les').hostname);
    const vast = cb.stand({ aan: true, tekst: 'Kijk' });
    cb.zet({ vast: false });
    return { weg, slecht, lk, toestellen: cb.toestellen().length, vast, los: cb.stand().toegestaan, links: ['javascript:alert(1)', 'bingel', 'https://ok.be/x'].map(u => !!cb.link(u)) };
  `);
  assert.strictEqual(r.weg, 1);
  assert.match(r.slecht, /geen e-mailadres/);
  assert.deepStrictEqual(r.lk, { leerkracht: true });
  assert.strictEqual(r.toestellen, 0);
  assert.deepStrictEqual(r.vast, { vast: true, toegestaan: ['bingel.be'], pauze: { aan: true, tekst: 'Kijk' } });
  assert.deepStrictEqual(r.los, []);
  assert.deepStrictEqual(r.links, [false, false, true]);
});

test('de extensie: geldige manifest, alle talen hebben dezelfde teksten, de server bouwt er een zip van', () => {
  const map = path.join(ROOT, 'src', 'chromebook-extensie');
  const m = JSON.parse(fs.readFileSync(path.join(map, 'manifest.json'), 'utf8'));
  assert.strictEqual(m.manifest_version, 3);
  assert.ok(m.storage && m.storage.managed_schema, 'het adres komt uit Google Admin');
  for (const f of [m.background.service_worker, m.action.default_popup, m.storage.managed_schema, ...Object.values(m.icons)]) assert.ok(fs.existsSync(path.join(map, f)), f);
  const nl = Object.keys(JSON.parse(fs.readFileSync(path.join(map, '_locales/nl/messages.json'), 'utf8'))).sort();
  for (const t of ['en', 'fr', 'es', 'de']) assert.deepStrictEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(map, `_locales/${t}/messages.json`), 'utf8'))).sort(), nl, t);
  // Elke data-t in de pagina's bestaat.
  for (const f of fs.readdirSync(map).filter(x => x.endsWith('.html'))) for (const [, k] of fs.readFileSync(path.join(map, f), 'utf8').matchAll(/data-t(?:-ph)?="([^"]+)"/g)) assert.ok(nl.includes(k), `${f}: ${k}`);
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.match(server, /\/chromebooks\/extensie\.zip/);
  assert.match(server, /socket\.io\.min\.js/);
});
