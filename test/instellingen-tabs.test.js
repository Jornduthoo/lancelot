// Instellingen: alle tabs blijven zichtbaar (Junior mag niet achter de rand verdwijnen).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
const host = fs.readFileSync(path.join(__dirname, '..', 'public', 'host.html'), 'utf8');

test('Instellingen-tabs lopen door op een tweede rij in plaats van te verdwijnen', () => {
  const regel = css.match(/#set-tabs\s*\{([^}]*)\}/);
  assert.ok(regel, '#set-tabs regel ontbreekt in style.css');
  assert.match(regel[1], /flex-wrap:\s*wrap/);
  assert.match(regel[1], /overflow:\s*visible/);
});

test('Junior-tab staat in Instellingen', () => {
  const nav = host.match(/<nav class="tabbalk" id="set-tabs"[\s\S]*?<\/nav>/);
  assert.ok(nav);
  assert.match(nav[0], /data-tab="junior"/);
  assert.match(host, /id="junior-panel" data-tab="junior"/);
});
