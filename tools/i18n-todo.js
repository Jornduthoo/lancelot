// Welke teksten hebben nog geen vertaling? Gebruik:
//   node tools/i18n-todo.js                 telt per bronbestand wat er nog ontbreekt
//   node tools/i18n-todo.js public/host.html src/kerker.js   toont de ontbrekende teksten als json, klaar om te vertalen
//   TAAL=fr node tools/i18n-todo.js ...      hetzelfde voor het Frans (es: Spaans, de: Duits)
// Een vertaling hoort in lang/en/<naam>.json: { "Nederlandse tekst": "English text" }, en ook in lang/fr en lang/es.
// null betekent: deze tekst bewust niet vertalen (een naam, code, of een AI-opdracht die apart geregeld is).
'use strict';
const fs = require('fs');
const path = require('path');
const { verzamel } = require('./i18n-extract');

function bekend(taal = 'en') {
  const dir = path.join(__dirname, '..', 'lang', taal);
  const uit = {};
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) Object.assign(uit, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  return uit;
}
function ontbrekend(perBestand, woorden) {
  const uit = {};
  for (const [f, lijst] of Object.entries(perBestand)) {
    const mis = lijst.filter(s => !(s in woorden));
    if (mis.length) uit[f] = mis;
  }
  return uit;
}
module.exports = { bekend, ontbrekend };

if (require.main === module) {
  const per = verzamel();
  const mis = ontbrekend(per, bekend(process.env.TAAL || 'en'));
  const vraag = process.argv.slice(2);
  if (!vraag.length) {
    const rij = Object.entries(mis).map(([f, l]) => [f, l.length]).sort((a, b) => b[1] - a[1]);
    for (const [f, n] of rij) console.log(String(n).padStart(5), f);
    console.log(String(rij.reduce((a, b) => a + b[1], 0)).padStart(5), 'totaal');
  } else {
    const gezien = new Set();
    const uit = {};
    for (const f of vraag) for (const s of mis[f] || []) if (!gezien.has(s)) { gezien.add(s); uit[s] = ''; }
    console.log(JSON.stringify(uit, null, 1));
  }
}
