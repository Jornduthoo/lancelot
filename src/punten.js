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

function lees() {
  try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')) || {}; } catch { return {}; }
}
function keuzes() {
  const d = lees();
  const uit = {};
  for (const [toets, k] of Object.entries(d.telt || {})) if (KEUZES.includes(k)) uit[toets] = k;
  const herk = {};
  for (const [k, v] of Object.entries(d.herk || {})) if (kolomId(k) && kolomId(v) && k !== v) herk[k] = v;
  // Zelf losgemaakt ("dit is geen herkansing" of "geen andere versie"): nooit automatisch koppelen.
  const los = Object.entries(d.herk || {}).filter(([k, v]) => kolomId(k) && v === '').map(([k]) => k);
  return { standaard: KEUZES.includes(d.standaard) ? d.standaard : STANDAARD, telt: uit, herk, ...(los.length ? { los } : {}) };
}

const kolomId = v => typeof v === 'string' && v.length > 0 && v.length <= 200;
// Bewaart één wijziging, met het tijdstip per keuze: zo kan Mijn lesmap twee pc's samenvoegen (zie samen).
// "Geen herkansing" blijft staan als lege koppeling, anders zou de andere pc hem terugbrengen.
function bewaar(sleutel, zet) {
  const d = lees();
  const raw = { standaard: d.standaard, telt: { ...(d.telt || {}) }, herk: { ...(d.herk || {}) }, tijd: { ...(d.tijd || {}) } };
  zet(raw);
  raw.tijd[sleutel] = new Date().toISOString();
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(raw, null, 2) + '\n');
  return keuzes();
}

// Twee pc's kozen tegelijk iets (via een trage gedeelde map): per keuze wint de laatste, niets anders gaat verloren.
function samen(hier, daar) {
  const a = JSON.parse(hier), b = JSON.parse(daar);
  const ta = a.tijd || {}, tb = b.tijd || {};
  const uit = { standaard: undefined, telt: {}, herk: {}, tijd: {} };
  const kies = sleutel => (String(tb[sleutel] || '') > String(ta[sleutel] || '') ? b : a);
  const st = kies('standaard');
  uit.standaard = st.standaard !== undefined ? st.standaard : (a.standaard !== undefined ? a.standaard : b.standaard);
  for (const deel of ['telt', 'herk']) {
    for (const k of new Set([...Object.keys(a[deel] || {}), ...Object.keys(b[deel] || {})])) {
      const sleutel = deel + ':' + k;
      const bron = (kies(sleutel)[deel] || {})[k] !== undefined ? kies(sleutel) : (a[deel] || {})[k] !== undefined ? a : b;
      uit[deel][k] = bron[deel][k];
    }
  }
  for (const k of new Set([...Object.keys(ta), ...Object.keys(tb)])) uit.tijd[k] = String(tb[k] || '') > String(ta[k] || '') ? tb[k] : ta[k];
  if (uit.standaard === undefined) delete uit.standaard;
  return JSON.stringify(uit, null, 2) + '\n';
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
  if (van) {
    if (!kolomId(van) || van === kolom) throw new Error('Kies een andere toets.');
    if (eerste(van, d.herk) === kolom) throw new Error('Dat zou een rondje worden.');
  }
  return bewaar('herk:' + kolom, raw => { raw.herk[kolom] = van ? String(van) : ''; });
}

function zet({ toets, telt, standaard } = {}) {
  if (standaard !== undefined && !KEUZES.includes(standaard)) throw new Error('Die keuze bestaat niet.');
  if (toets !== undefined) {
    if (typeof toets !== 'string' || !toets || toets.length > 200) throw new Error('Welke toets?');
    if (!KEUZES.includes(telt)) throw new Error('Die keuze bestaat niet.');
  }
  if (standaard !== undefined) bewaar('standaard', raw => { raw.standaard = standaard; });
  if (toets !== undefined) bewaar('telt:' + toets, raw => { raw.telt[toets] = telt; });
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

// ---------- Twee versies van dezelfde toets (wens 26 nov, punt 3) ----------
// Een toets in twee versies, bv. "Toets De Tweede Wereldoorlog" en "6+ · WO De Tweede Wereldoorlog · Toets synthese".
// Maakt een leerling ze allebei, dan telt zijn beste resultaat (op 10, dus in procent). We herkennen ze vanzelf:
// - één titel heeft een plus-niveau ("6+", ook in de bestandsnaam "zes-plus"), de andere niet;
// - gegeven binnen 7 dagen van elkaar;
// - alle woorden van de kortste titel staan in de andere (zonder "toets", lidwoorden en het niveau zelf).
// Zo blijven "Toets spelling" en "Dictee" van hetzelfde thema twee aparte toetsen. Wie het anders wil, maakt ze los.
const PLUS = /(^|[^\w+])(\d{1,2})\s*\+(?!\w)/;
const STOP = new Set(['toets', 'de', 'het', 'een', 'en', 'van', 'over', 'in', 'op', 'les', 'versie', 'niveau']);
function isPlus(k) {
  return PLUS.test(String(k.titel || '')) || /(^|[\/_-])zes-plus/i.test(String(k.toets || ''));
}
function woorden(titel) {
  const t = String(titel || '').toLowerCase().replace(PLUS, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const w = t.split(/[^a-z0-9]+/).filter(x => x && !STOP.has(x));
  // Een losse "6" vooraan (zoals "6 · Taal …") is het niveau, geen inhoud.
  if (/^\s*\d{1,2}\s*[·:.\-–]/.test(t) && w.length && /^\d{1,2}$/.test(w[0])) w.shift();
  return new Set(w);
}
const dagVan = k => String(k.dag || '').slice(0, 10);
const dagenTussen = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
function zelfdeToets(a, b) {
  const wa = woorden(a.titel), wb = woorden(b.titel);
  const [kort, lang] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  if (kort.size < 2) return false;
  for (const w of kort) if (!lang.has(w)) return false;
  return true;
}
// { <kolom van de plus-versie>: <kolom van de gewone versie> } voor de toetsen (soort proef) in Opvolgen.
function versies(kolommen, k = keuzes()) {
  const los = new Set(k.los || []);
  const vast = new Set(Object.keys(k.herk || {}));
  const proef = kolommen.filter(c => c.soort === 'proef' && dagVan(c));
  const gewoon = proef.filter(c => !isPlus(c));
  const uit = {};
  const bezet = new Set();
  for (const p of proef.filter(isPlus)) {
    if (los.has(p.id) || vast.has(p.id)) continue;
    let best = null;
    for (const g of gewoon) {
      if (bezet.has(g.id)) continue;
      const d = dagenTussen(dagVan(p), dagVan(g));
      if (!(d <= 7) || !zelfdeToets(p, g)) continue;
      if (!best || d < best.d) best = { g, d };
    }
    if (best) { uit[p.id] = best.g.id; bezet.add(best.g.id); }
  }
  return uit;
}

module.exports = { DIR, KEUZES, keuzes, zet, koppel, eerste, telt, geldig, samen, versies, zelfdeToets };
