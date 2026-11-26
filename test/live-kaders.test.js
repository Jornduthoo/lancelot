'use strict';
// 📡 Live in kaders op het startscherm (26 nov): Vandaag toont lopende quizzen en oefenbladen met een Live-knop,
// en de Live-knoppen openen een kader op het startscherm in plaats van naar Taken te gaan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vandaag = require('../src/vandaag');

test('Vandaag: quizzen en oefenbladen waar iemand nu aan werkt, staan bij Nu bezig', () => {
  const nu = Date.now();
  const iso = new Date(nu).toISOString();
  const s = vandaag.samenvatting([
    { id: 'q1', titel: 'Breuken', soort: 'quiz', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig' }, { naam: 'Mats', status: 'klaar' }, { naam: 'Gast', status: 'nieuw', niet: true }] },
    { id: 'o1', titel: 'Blad', soort: 'oefenblad', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'nieuw' }] },
    { id: 'p1', titel: 'Toets', soort: 'proef', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig' }] },
    { id: 'd1', titel: 'Dicht', soort: 'quiz', dag: iso, dicht: true, leerlingen: [{ naam: 'Lotte', status: 'bezig' }] },
  ], [], nu);
  assert.deepStrictEqual(s.bezig, [{ id: 'q1', titel: 'Breuken', soort: 'quiz', bezig: 1, klaar: 1, n: 2 }]);
  assert.strictEqual(s.leeg, false);
  assert.deepStrictEqual(vandaag.samenvatting([], [], nu).bezig, []);
});

test('startscherm: Live opent een kader, niet de pagina Taken', () => {
  const host = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'host.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'host.html'), 'utf8');
  assert.ok(host.includes('LiveKaders.open('));
  assert.ok(!/l\.href = `\/taken\?live=/.test(host), 'de Live-knop in Vandaag gaat niet meer naar Taken');
  assert.ok(html.indexOf('/js/live-raster.js') < html.indexOf('/js/live-kaders.js') && html.indexOf('/js/live-kaders.js') < html.indexOf('/js/host.js'));
  const taken = fs.readFileSync(path.join(__dirname, '..', 'public', 'taken.html'), 'utf8');
  assert.ok(taken.indexOf('/js/live-raster.js') < taken.indexOf('/js/tk-host.js'), 'Taken tekent met hetzelfde live overzicht');
});
