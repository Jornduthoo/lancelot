// Punten (wensenlijst 20 nov, punt 8): welke poging telt als een leerling een toets herkanste.
// Een herkansing telt alleen als de leerkracht dat zegt (verbeterpunten 20 nov, 2): via "↻ Herkansing geven", of door
// een kolom zelf te koppelen ("is een herkansing van …"). Dezelfde toets twee keer geven is dus gewoon twee kolommen.
// herk: { <kolom>: <eerste kolom> } (kolom = taak-id of "afname:<bestand>"). Per eerste kolom kies je wat telt:
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
  const herk = {};
  for (const [k, v] of Object.entries(d.herk || {})) if (kolomId(k) && kolomId(v) && k !== v) herk[k] = v;
  return { standaard: KEUZES.includes(d.standaard) ? d.standaard : STANDAARD, telt: uit, herk };
}

const kolomId = v => typeof v === 'string' && v.length > 0 && v.length <= 200;
function bewaar(d) {
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ standaard: d.standaard, telt: d.telt, herk: d.herk }, null, 2) + '\n');
  return keuzes();
}

// De eerste kolom van een reeks herkansingen (volgt de koppelingen, zonder rondjes).
function eerste(kolom, herk) {
  let k = kolom;
  const gezien = new Set([k]);
  while (herk[k] && !gezien.has(herk[k])) { k = herk[k]; gezien.add(k); }
  return k;
}

// Koppel een kolom als herkansing van een andere (van leeg = "dit is geen herkansing").
function koppel({ kolom, van } = {}) {
  if (!kolomId(kolom)) throw new Error('Welke toets?');
  const d = keuzes();
  if (!van) delete d.herk[kolom];
  else {
    if (!kolomId(van) || van === kolom) throw new Error('Kies een andere toets.');
    if (eerste(van, d.herk) === kolom) throw new Error('Dat zou een rondje worden.');
    d.herk[kolom] = van;
  }
  return bewaar(d);
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
  return bewaar(d);
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

module.exports = { DIR, KEUZES, keuzes, zet, koppel, eerste, telt, geldig };
