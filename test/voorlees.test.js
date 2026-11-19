// Voorlezen: minder losse stukken (elke overgang kan het begin van een zin kosten op een koptelefoon die gaat slapen),
// en het geluid blijft wakker zolang er voorgelezen wordt.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function laad() {
  const log = [];
  const ctx = { state: 'running', destination: {}, resume() { this.state = 'running'; log.push('resume'); }, suspend() { this.state = 'suspended'; log.push('suspend'); return Promise.resolve(); },
    createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start: () => log.push('osc aan'), stop: () => log.push('osc uit') }),
    createGain: () => ({ gain: {}, connect() {} }) };
  const synth = { getVoices: () => [], addEventListener() {}, cancel: () => log.push('cancel'), speak: u => log.push(`zeg:${u.text}`) };
  const timers = [];
  const sandbox = {
    window: { speechSynthesis: synth, SpeechSynthesisUtterance: function (t) { this.text = t; }, AudioContext: function () { return ctx; } },
    setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  };
  sandbox.SpeechSynthesisUtterance = sandbox.window.SpeechSynthesisUtterance;
  vm.createContext(sandbox);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '../public/js/voorlees.js'), 'utf8')}; this.Voorlees = Voorlees;`, sandbox);
  return { V: sandbox.Voorlees, log, timers };
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
