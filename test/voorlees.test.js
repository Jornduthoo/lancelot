// Voorlezen: minder losse stukken (elke overgang kan het begin van een zin kosten op een koptelefoon die gaat slapen),
// en het geluid blijft wakker zolang er voorgelezen wordt.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function laad({ stemmen = [{ name: 'Google Nederlands (België)', lang: 'nl-BE' }], taal } = {}) {
  const log = [];
  const ctx = { state: 'running', destination: {}, resume() { this.state = 'running'; log.push('resume'); }, suspend() { this.state = 'suspended'; log.push('suspend'); return Promise.resolve(); },
    createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start: () => log.push('osc aan'), stop: () => log.push('osc uit') }),
    createGain: () => ({ gain: {}, connect() {} }) };
  const synth = { getVoices: () => stemmen, addEventListener() {}, cancel: () => log.push('cancel'), speak: u => log.push(`zeg:${u.text}`) };
  const timers = [];
  const meldingen = [];
  const posts = [];
  const sandbox = {
    fetch: (url, o) => {
      if (o && o.method === 'POST') posts.push([url, JSON.parse(o.body)]);
      return Promise.resolve({ json: () => Promise.resolve({ aan: false }) });
    },
    window: { LANCELOT_TAAL: taal, Ui: { melding: t => { meldingen.push(t); log.push(`melding:${t}`); return Promise.resolve(true); } }, speechSynthesis: synth, SpeechSynthesisUtterance: function (t) { this.text = t; }, AudioContext: function () { return ctx; } },
    setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  };
  sandbox.SpeechSynthesisUtterance = sandbox.window.SpeechSynthesisUtterance;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/stem-kern.js'), 'utf8'), sandbox);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '../public/js/voorlees.js'), 'utf8')}; this.Voorlees = Voorlees;`, sandbox);
  return { V: sandbox.Voorlees, log, timers, meldingen, posts };
}

test('voorlezen: korte zinnen samen in stukken tot ±180 tekens, een lange zin blijft heel', () => {
  const { V } = laad();
  const zin = 'Tom fietst naar school.';
  const stukken = V.chunks(Array(20).fill(zin).join(' '));
  assert.ok(stukken.length < 5, `${stukken.length} stukken`);
  assert.ok(stukken.every(s => s.length <= 180));
  assert.strictEqual(stukken.join(' '), Array(20).fill(zin).join(' '));
  const lang = `${'woord '.repeat(60).trim()}.`;
  assert.deepStrictEqual([...V.chunks(`Kort. ${lang}`)], ['Kort.', lang]);
  assert.deepStrictEqual([...V.chunks('Lees **dit** goed.')], ['Lees dit goed.']);
});

test('voorlezen: eerst het stille signaal, dan pas de eerste zin; stoppen zet alles uit', () => {
  const { V, log, timers } = laad();
  const knop = { classList: { add() {}, remove() {} }, isConnected: true, getClientRects: () => [1] };
  V.speak('Eerste zin. Tweede zin.', knop);
  assert.ok(log.includes('osc aan'));
  assert.ok(!log.some(x => x.startsWith('zeg:')), 'nog geen zin tijdens het opwarmen');
  const [opwarmen, ms] = timers.find(([, t]) => t >= 300);
  assert.ok(ms >= 300 && ms <= 600);
  opwarmen();
  assert.ok(log.includes('zeg:Eerste zin. Tweede zin.'));
  V.stop();
  assert.ok(log.includes('osc uit'));
});

const knop = () => ({ classList: { add() {}, remove() {} }, isConnected: true, getClientRects: () => [1] });
const rust = () => new Promise(r => setImmediate(r));

test('voorlezen zonder stem op het toestel: een melding in plaats van stilte, en de leerkracht krijgt het te zien', async () => {
  const { V, log, meldingen, posts } = laad({ stemmen: [{ name: 'English', lang: 'en-US' }] });
  assert.strictEqual(V.ok, true, 'de knop staat er altijd');
  V.wie('Mila');
  V.speak('Schrijf het woord.', knop());
  await rust();
  assert.deepStrictEqual(meldingen, ['Voorlezen lukt niet op dit toestel. Steek je hand op.']);
  assert.ok(!log.some(x => x.startsWith('zeg:')));
  assert.deepStrictEqual(posts, [['/api/stem/stand', { naam: 'Mila', stand: 'geen' }]]);
});

test('voorlezen met een Hollandse stem: eerst één keer een melding, dan voorlezen', async () => {
  const { V, log, timers, meldingen, posts } = laad({ stemmen: [{ name: 'Google Nederlands', lang: 'nl-NL' }] });
  V.wie('Noor');
  V.speak('Eén.', knop());
  await rust();
  assert.deepStrictEqual(meldingen, ['Op dit toestel staat geen Vlaamse stem. Je hoort een andere Nederlandse stem.']);
  timers.find(([, t]) => t >= 300)[0]();
  assert.ok(log.includes('zeg:Eén.'));
  V.speak('Twee.', knop());
  await rust();
  assert.strictEqual(meldingen.length, 1, 'maar één keer gemeld');
  assert.deepStrictEqual(posts.map(p => p[1].stand), ['toestel-nl'], 'alleen een verandering wordt gemeld');
});

test('voorlezen kiest de Vlaamse stem voor een Nederlandse en een Franse stem voor een Franse taak', () => {
  const stemmen = [{ name: 'NL', lang: 'nl-NL' }, { name: 'BE', lang: 'nl-BE' }, { name: 'FR', lang: 'fr-FR' }];
  const { V } = laad({ stemmen });
  assert.strictEqual(V.info().stand, 'toestel-be');
  assert.strictEqual(V.voice().name, 'BE');
  V.taal('fr');
  assert.strictEqual(V.voice().name, 'FR');
  assert.strictEqual(V.info().stand, 'toestel');
  V.taal('');
  assert.strictEqual(V.voice().name, 'BE');
});
