// Geplakte antwoorden van ChatGPT, Claude en Gemini moeten allemaal ingelezen worden, hoe ze ook gekopieerd zijn.
const test = require('node:test');
const assert = require('node:assert');
const aiJson = require('../src/ai-json');
const goed = { naam: 'Op avontuur in het bos', vragen: [{ vraag: 'Welk dier heeft een lange slurf?', opties: ['🐘', '🐭', '🐸'], goed: 0 }] };
const check = d => Array.isArray(d.vragen);

test('ChatGPT gekopieerd als markdown: backslash op elke regel en &#x20; als spatie', () => {
  const tekst = '```json\n{\\\n&#x20; "naam": "Op avontuur in het bos",\\\n&#x20; "vragen": [\\\n&#x20;   {\\\n&#x20;     "vraag": "Welk dier heeft een lange slurf?",\\\n&#x20;     "opties": ["🐘", "🐭", "🐸"],\\\n&#x20;     "goed": 0\\\n&#x20;   }\\\n&#x20; ]\\\n}\n```';
  assert.deepEqual(aiJson.extract(tekst, 'vragenreeks', check), goed);
});

test('ChatGPT met &nbsp;, &quot;, harde spaties en markdown-escapes', () => {
  const tekst = 'Hier is je reeks:\n{&nbsp;"naam": &quot;Op avontuur in het bos&quot;, "vragen": [ { "vraag": "Welk dier heeft een lange slurf?", "opties": ["🐘", "🐭", "🐸"], "goed": 0 } ] }\nVeel plezier!';
  assert.deepEqual(aiJson.extract(tekst, 'vragenreeks', check), goed);
  const md = '{ "naam": "Op avontuur in het bos", "vragen": [ { "vraag": "Welk dier heeft een lange slurf?", "opties": \\["🐘", "🐭", "🐸"\\], "goed": 0 } ] }';
  assert.deepEqual(aiJson.extract(md, 'vragenreeks', check), goed);
});

test('Claude: uitleg ervoor en erna, codeblok, krulletjes-aanhalingstekens, komma te veel', () => {
  const tekst = 'Natuurlijk! Hier is de reeks.\n\n```json\n{\n  “naam”: “Op avontuur in het bos”,\n  “vragen”: [\n    { “vraag”: “Welk dier heeft een lange slurf?”, “opties”: [“🐘”, “🐭”, “🐸”], “goed”: 0, },\n  ],\n}\n```\n\nWil je er nog meer?';
  assert.deepEqual(aiJson.extract(tekst, 'vragenreeks', check), goed);
});

test('Gemini met bronverwijzingen blijft werken', () => {
  const tekst = '[cite_start]{"naam": "Op avontuur in het bos [cite: 1]", "vragen": [{"vraag": "Welk dier heeft een lange slurf?", "opties": ["🐘", "🐭", "🐸"], "goed": 0}]}';
  assert.deepEqual(aiJson.extract(tekst, 'vragenreeks', check), goed);
});

test('echte backslash-escapes in JSON blijven heel', () => {
  assert.deepEqual(aiJson.extract('{"a": "regel\\nnieuw \\"x\\""}', 'test'), { a: 'regel\nnieuw "x"' });
});

test('onleesbare tekst geeft één gewone zin, geen code', () => {
  assert.throws(() => aiJson.extract('{ dit is geen json', 'vragenreeks', check), e => !/[{}<>]/.test(e.message.replace(/"[^"]*"/g, '')) && e.message.length < 200);
});
