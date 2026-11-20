// Punten (wensenlijst 20 nov, punt 8): welke poging telt als een leerling een toets herkanste.
// Een herkansing is gewoon dezelfde toets nog eens gegeven (als taak of op het bord); per toets kies je wat telt:
// de hoogste, de laatste, de eerste of het gemiddelde. Gaat mee met Mijn lesmap.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const DIR = () => gegevens.pad('punten');
const FILE = () => path.join(DIR(), 'herkansing.json');
const KEUZES = ['hoogste', 'laatste', 'eerste', 'gemiddelde'];
const STANDAARD = 'hoogste';

function geldig(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Ongeldige keuze.');
}

function keuzes() {
  let d = {};
  try { d = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch {}
  const uit = {};
  for (const [toets, k] of Object.entries(d.telt || {})) if (KEUZES.includes(k)) uit[toets] = k;
  return { standaard: KEUZES.includes(d.standaard) ? d.standaard : STANDAARD, telt: uit };
}

function zet({ toets, telt, standaard } = {}) {
  const d = keuzes();
  if (standaard !== undefined) {
    if (!KEUZES.includes(standaard)) throw new Error('Die keuze bestaat niet.');
    d.standaard = standaard;
  }
  if (toets !== undefined) {
    if (typeof toets !== 'string' || !toets || toets.length > 200) throw new Error('Welke toets?');
    if (!KEUZES.includes(telt)) throw new Error('Die keuze bestaat niet.');
    d.telt[toets] = telt;
  }
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ standaard: d.standaard, telt: d.telt }, null, 2) + '\n');
  return keuzes();
}

// Wat telt uit een reeks pogingen (oudste eerst), elk { punten, max }.
function telt(pogingen, keuze) {
  const p = pogingen.filter(x => x && x.max > 0);
  if (!p.length) return null;
  if (keuze === 'laatste') return p[p.length - 1];
  if (keuze === 'eerste') return p[0];
  if (keuze === 'gemiddelde') {
    const pct = p.reduce((n, x) => n + x.punten / x.max, 0) / p.length;
    return { punten: pct * p[p.length - 1].max, max: p[p.length - 1].max };
  }
  return p.reduce((a, b) => (b.punten / b.max > a.punten / a.max ? b : a));
}

module.exports = { DIR, KEUZES, keuzes, zet, telt, geldig };
