'use strict';
// 📡 Live in kaders op het startscherm (26 nov): Vandaag toont lopende quizzen en oefenbladen met een Live-knop,
// en de Live-knoppen openen een kader op het startscherm in plaats van naar Taken te gaan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vandaag = require('../src/vandaag');

test('Vandaag: alleen quizzen en oefenbladen waar iemand nu echt aan werkt, staan bij Nu bezig', () => {
  const nu = Date.now();
  const iso = new Date(nu).toISOString();
  const net = new Date(nu - 2 * 60000).toISOString();
  const oud = new Date(nu - 60 * 60000).toISOString();
  const s = vandaag.samenvatting([
    { id: 'q1', titel: 'Breuken', soort: 'quiz', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig', actief: net }, { naam: 'Mats', status: 'klaar' }, { naam: 'Noor', status: 'bezig', actief: oud }, { naam: 'Gast', status: 'nieuw', niet: true }] },
    // Begonnen en laten liggen (een uur niets gedaan): geen Live.
    { id: 'o1', titel: 'Taal', soort: 'oefenblad', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig', actief: oud }] },
    { id: 'o2', titel: 'Leeg', soort: 'oefenblad', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'nieuw' }] },
    { id: 'p1', titel: 'Toets', soort: 'proef', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig', actief: net }] },
    { id: 'p2', titel: 'Oude toets', soort: 'proef', dag: iso, leerlingen: [{ naam: 'Lotte', status: 'bezig', actief: oud }] },
    { id: 'd1', titel: 'Dicht', soort: 'quiz', dag: iso, dicht: true, leerlingen: [{ naam: 'Lotte', status: 'bezig', actief: net }] },
  ], [
    { file: 'a.json', title: 'Toets', bezig: 1, datum: iso, taak: 'p1' },
    { file: 'b.json', title: 'Oude toets', bezig: 1, datum: iso, taak: 'p2' },
  ], nu);
  assert.deepStrictEqual(s.bezig, [{ id: 'q1', titel: 'Breuken', soort: 'quiz', bezig: 1, klaar: 1, n: 3 }]);
  // Toetsen: 📡 Live (nu) alleen bij wie nu echt bezig is.
  assert.strictEqual(s.verbeteren.find(a => a.taak === 'p1').nu, 1);
  assert.strictEqual(s.verbeteren.find(a => a.taak === 'p2').nu, undefined);
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

test('startscherm: een leerling aantikken in een Live-kader toont zijn werk hier, niet in Taken', () => {
  const k = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'live-kaders.js'), 'utf8');
  assert.ok(k.includes('opKlik: l => kijk(t, l)'));
  assert.ok(!/opKlik:[^\n]*location\.href/.test(k));
  assert.ok(k.includes("socket.emit('tk-detail'"));
});
