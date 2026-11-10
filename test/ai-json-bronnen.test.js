// Gemini zet bronverwijzingen ([cite: 14, 16]) in zijn antwoord; die moeten weg bij het inlezen.
const test = require('node:test');
const assert = require('node:assert');
const aiJson = require('../src/ai-json');

test('bronverwijzingen van Gemini verdwijnen uit het antwoord', () => {
  const tekst = '[cite_start]```json\n{"doel": "Vandaag leer ik vouwen[cite: 3]", "criteria": ["Ik kan vouwen [cite: 19, 22].", "Ik kan testen【4†bron】"]}\n```';
  assert.deepEqual(aiJson.extract(tekst, 'voorstel'), { doel: 'Vandaag leer ik vouwen', criteria: ['Ik kan vouwen.', 'Ik kan testen'] });
});
