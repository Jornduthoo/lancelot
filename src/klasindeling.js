// De Klasindeling in de Wapenkamer: je eigen lokaal nagebouwd (banken, bord, deur, accenten) en wie waar zit.
// Alles staat in klas/klasindeling/klasindeling.json: die map gaat mee met Mijn lesmap en in elke back-up.
// Per plaats staan het id én de naam van de leerling, want een andere pc heeft andere id's: het scherm zoekt dan op naam.
// De server bewaart alleen; het scherm verdeelt de leerlingen over de banken.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const DIR = path.join(gegevens.pad('klas'), 'klasindeling');
const FILE = path.join(DIR, 'klasindeling.json');
const MAX_OPSTELLINGEN = 8;
const MAX_STUKKEN = 160;

// Moet kloppen met STUK in public/js/wk-indeling.js.
const SOORTEN = new Set(['bank', 'duo', 'trio', 'groep', 'zes', 'bureau', 'bord', 'deur', 'raam', 'kast', 'boeken', 'wasbak', 'kapstok', 'computer',
  'tapijt', 'leeshoek', 'zitzak', 'plant', 'wereldbol', 'aquarium', 'prullenbak', 'schatkist', 'harnas', 'banier', 'lamp', 'kring',
  'zitbank', 'langetafel', 'rond', 'ridderronde', 'poef', 'krijtbord', 'piano', 'laadkar', 'printer', 'troon', 'zwaard', 'kroonluchter', 'schild', 'haard', 'draak']);

const lees = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const tekst = (v, max) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);
const getal = (v, min, max, std) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : std; };

// Een gewone klas om mee te beginnen: bord vooraan, 12 duobanken, het bureau, de deur, ramen en een plant.
function voorbeeld() {
  const stukken = [
    { id: 'bord', s: 'bord', x: 8, y: 0, r: 0 },
    { id: 'bureau', s: 'bureau', x: 18, y: 2, r: 0 },
    { id: 'deur', s: 'deur', x: 23, y: 12, r: 1 },
    { id: 'raam1', s: 'raam', x: 0, y: 2, r: 3 },
    { id: 'raam2', s: 'raam', x: 0, y: 7, r: 3 },
    { id: 'raam3', s: 'raam', x: 0, y: 12, r: 3 },
    { id: 'kast', s: 'kast', x: 9, y: 15, r: 0 },
    { id: 'plant', s: 'plant', x: 22, y: 1, r: 0 },
  ];
  let n = 0;
  for (let rij = 0; rij < 4; rij++) for (let kol = 0; kol < 3; kol++) stukken.push({ id: `b${++n}`, s: 'duo', x: 3 + kol * 6, y: 4 + rij * 3, r: 0 });
  return { id: 'o1', naam: 'Mijn klas', w: 24, h: 16, stukken, plaatsen: {} };
}

function schoonStuk(s, w, h) {
  if (!s || !SOORTEN.has(s.s)) return null;
  const stuk = { id: tekst(s.id, 16).replace(/[^\w-]/g, '') || null, s: s.s, x: getal(s.x, 0, w - 1, 0), y: getal(s.y, 0, h - 1, 0), r: getal(s.r, 0, 3, 0) };
  if (!stuk.id) return null;
  if (Array.isArray(s.dicht)) stuk.dicht = [...new Set(s.dicht.map(i => getal(i, 0, 7, 0)))];
  if (s.k != null) stuk.k = getal(s.k, 0, 5, 0);
  // Schuin: nog een achtste draai erbij (45°).
  if (s.d) stuk.d = true;
  // Uitgerekt: een eigen breedte en diepte (ongedraaid).
  if (s.sw != null) stuk.sw = getal(s.sw, 1, 40, 1);
  if (s.sh != null) stuk.sh = getal(s.sh, 1, 30, 1);
  return stuk;
}

function schoonOpstelling(o, i) {
  const w = getal(o && o.w, 10, 40, 24), h = getal(o && o.h, 8, 30, 16);
  const ids = new Set();
  const stukken = (Array.isArray(o && o.stukken) ? o.stukken : []).map(s => schoonStuk(s, w, h))
    .filter(s => s && !ids.has(s.id) && ids.add(s.id)).slice(0, MAX_STUKKEN);
  const plaatsen = {};
  const bron = o && o.plaatsen && typeof o.plaatsen === 'object' ? o.plaatsen : {};
  for (const [k, p] of Object.entries(bron)) {
    const [stuk, nr] = k.split('.');
    if (!ids.has(stuk) || !/^[0-7]$/.test(nr) || !p || typeof p !== 'object') continue;
    const naam = tekst(p.naam, 60);
    if (!naam) continue;
    plaatsen[k] = { id: tekst(p.id, 20), naam, ...(p.vast ? { vast: true } : {}) };
  }
  return { id: tekst(o && o.id, 16).replace(/[^\w-]/g, '') || `o${i + 1}`, naam: tekst(o && o.naam, 40) || 'Mijn klas', w, h, stukken, plaatsen };
}

function schoon(d) {
  const ops = (Array.isArray(d && d.opstellingen) ? d.opstellingen : []).slice(0, MAX_OPSTELLINGEN).map(schoonOpstelling);
  const ids = new Set();
  const opstellingen = ops.filter(o => !ids.has(o.id) && ids.add(o.id));
  if (!opstellingen.length) opstellingen.push(voorbeeld());
  const uitElkaar = (Array.isArray(d && d.uitElkaar) ? d.uitElkaar : [])
    .filter(p => Array.isArray(p) && p.length === 2)
    .map(p => [tekst(p[0], 60), tekst(p[1], 60)])
    .filter(([a, b]) => a && b && a.toLowerCase() !== b.toLowerCase())
    .slice(0, 40);
  return { actief: ids.has(d && d.actief) ? d.actief : opstellingen[0].id, opstellingen, uitElkaar };
}

const read = () => schoon(lees(FILE));

// Bewaar alleen als er echt iets veranderde, zodat de lesmap geen lege wijzigingen ziet.
function write(data = {}) {
  const schoner = schoon(data);
  const text = JSON.stringify(schoner, null, 1) + '\n';
  if (!(fs.existsSync(FILE) && fs.readFileSync(FILE, 'utf8') === text)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(`${FILE}.tmp`, text);
    fs.renameSync(`${FILE}.tmp`, FILE);
  }
  return schoner;
}

// Voor Mijn lesmap: een bestand uit de lesmap moet opstellingen hebben.
function geldig(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.opstellingen)) throw new Error('Ongeldig bestand.');
}

module.exports = { read, write, geldig, DIR, SOORTEN };
