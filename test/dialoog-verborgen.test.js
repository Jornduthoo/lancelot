// Een <dialog> met een klasse die display zet (zoals .form) blijft altijd zichtbaar, ook gesloten (bug 24 nov).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('geen <dialog> met de klasse form', () => {
  const pub = path.join(__dirname, '..', 'public');
  const fout = [];
  for (const f of fs.readdirSync(pub).filter(n => n.endsWith('.html'))) {
    for (const m of fs.readFileSync(path.join(pub, f), 'utf8').matchAll(/<dialog[^>]*class="([^"]*)"/g)) {
      if (m[1].split(/\s+/).includes('form')) fout.push(f);
    }
  }
  assert.deepStrictEqual(fout, []);
});
