// De Proef: toetsen. Ze staan als JSON-bestanden in de map proeven/, met de afbeeldingen erin (kleine webp's).
// De vraagsoorten, de controle en het verbeteren staan in public/js/pf-kern.js (dezelfde code als in de editor).
// Een afgenomen toets (een afname) komt in proeven/_afnames/: de antwoorden van elke leerling, de punten
// van de computer en die van de leerkracht (open vragen, op papier, de werkwijze bij een rekenvraag).
// Die blijven op deze pc: ze gaan niet mee naar de lesmap.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { library } = require('./library');
const { extract } = require('./ai-json');
const logboek = require('./logboek');
const K = require('../public/js/pf-kern');

const DIR = gegevens.pad('proeven');
const AFNAMES = path.join(DIR, '_afnames');

function list() {
  if (!fs.existsSync(DIR)) return [];
  const where = lib.places();
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(file => {
      const folder = where(file);
      try {
        const t = K.validate(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
        const types = new Set();
        for (const v of K.vragenVan(t.vragen)) types.add(v.q.type);
        return { file, folder, title: t.title, count: K.vragenVan(t.vragen).length, punten: K.totaal(t.vragen), types: [...types], niveaus: K.niveausVan(t), klaar: !K.problemen(t).length };
      } catch {
        return { file, folder, title: `${file} (ongeldig bestand)`, count: 0, punten: 0, types: [], niveaus: ['schildknaap'], klaar: false };
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl', { numeric: true }));
}

function checkFile(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json') || file.startsWith('_')) {
    throw new Error('Ongeldige bestandsnaam.');
  }
  return path.join(DIR, file);
}

function load(file) {
  return K.validate(JSON.parse(fs.readFileSync(checkFile(file), 'utf8')));
}

function slug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'toets';
}

function save(toets, file) {
  const clean = K.validate(toets);
  fs.mkdirSync(DIR, { recursive: true });
  if (!file) {
    const base = slug(clean.title);
    file = `${base}.json`;
    for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${base}-${i}.json`;
  }
  fs.writeFileSync(checkFile(file), JSON.stringify(clean) + '\n');
  return file;
}

function remove(file) {
  lib.trash([file]);
}

// Het antwoord van een chatbot omzetten in een toets.
function parseAiText(raw) {
  const data = extract(raw, 'toets', d => d.vragen !== undefined || d.niveaus !== undefined);
  if (data && data.title === 'korte titel van de toets') throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  return K.validate(data);
}

// Het antwoord van de AI met de antwoorden voor de vakjes op een blad.
function parseSleutel(raw) {
  const data = extract(raw, 'verbetersleutel', d => Array.isArray(d.velden) || Array.isArray(d));
  const velden = Array.isArray(data) ? data : data.velden;
  return velden.filter(v => v && typeof v === 'object').slice(0, 400);
}

const lib = library({ kind: 'proef', dir: DIR, checkFile, load, save, validate: K.validate, list });

// ---------- Afnames ----------

function afnamePad(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !/^[\w-]+\.json$/.test(file)) throw new Error('Ongeldige afname.');
  return path.join(AFNAMES, file);
}

function stempel(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Een nieuwe afname wegschrijven (bij het afsluiten). Geeft de bestandsnaam terug.
function bewaarAfname(rec) {
  fs.mkdirSync(AFNAMES, { recursive: true });
  const base = `${stempel(new Date(rec.datum))}_${slug(rec.title)}`;
  let file = `${base}.json`;
  for (let i = 2; fs.existsSync(path.join(AFNAMES, file)); i++) file = `${base}-${i}.json`;
  rec.file = file;
  schrijf(rec);
  return file;
}

function schrijf(rec) {
  const p = afnamePad(rec.file);
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(rec));
  fs.renameSync(`${p}.tmp`, p);
}

function laadAfname(file) {
  return JSON.parse(fs.readFileSync(afnamePad(file), 'utf8'));
}

// Per leerling: de punten (computer + leerkracht), het maximum en hoeveel er nog verbeterd moet worden.
function stand(rec, s) {
  const lijst = K.lijstVoor(rec.toets, s.niveau);
  let punten = 0;
  let max = 0;
  let open = 0;
  for (const { id, q } of K.vragenVan(lijst)) {
    max += K.maxVan(q);
    if (s.over && s.over[id] !== undefined && s.over[id] !== null) { punten += Number(s.over[id]) || 0; continue; }
    punten += Number(s.auto[id]) || 0;
    if (K.handPunten(q)) {
      if (s.hand[id] === undefined || s.hand[id] === null) open++;
      else punten += Number(s.hand[id]) || 0;
    }
  }
  return { punten: Math.round(punten * 2) / 2, max, open };
}

function afnames() {
  if (!fs.existsSync(AFNAMES)) return [];
  return fs.readdirSync(AFNAMES).filter(f => f.endsWith('.json')).map(file => {
    try {
      const rec = laadAfname(file);
      const open = rec.spelers.reduce((n, s) => n + stand(rec, s).open, 0);
      return { file, title: rec.title, datum: rec.datum, leerlingen: rec.spelers.length, open, klaar: !!rec.klaar };
    } catch {
      return null;
    }
  }).filter(Boolean).sort((a, b) => b.datum.localeCompare(a.datum));
}

// De punten die een vraag echt oplevert: wat de leerkracht zelf gaf (over), anders computer + leerkracht.
const kregen = (s, id) => (s.over && s.over[id] !== undefined && s.over[id] !== null ? Number(s.over[id]) : (Number(s.auto[id]) || 0) + (Number(s.hand[id]) || 0));

// Punten van de leerkracht voor één vraag van één leerling (null = nog niet verbeterd).
// over: true = de leerkracht zet de punten van de hele vraag zelf (ook als de computer al verbeterde); null = terug naar de computer.
function cijfer({ file, speler, id, punten, over, vak, goed } = {}) {
  const rec = laadAfname(file);
  const s = rec.spelers[Number(speler)];
  if (!s) throw new Error('Die leerling staat niet in deze afname.');
  const v = K.vragenVan(K.lijstVoor(rec.toets, s.niveau)).find(x => x.id === id);
  // Eén vakje van een blad zelf goed of fout zetten (goed: null = terug naar de computer).
  if (vak !== undefined) {
    const k = Number(vak);
    if (!v || v.q.type !== 'blad' || !v.q.velden[k]) throw new Error('Dat vakje bestaat niet.');
    s.vak = s.vak || {};
    s.vak[id] = s.vak[id] || {};
    if (goed === true || goed === false) s.vak[id][k] = goed; else delete s.vak[id][k];
    s.auto[id] = K.auto(v.q, s.antwoorden[id], s.vak[id]);
    if (s.over) delete s.over[id]; // een eigen oordeel per vakje vervangt de punten voor het hele blad
    schrijf(rec);
    return stand(rec, s);
  }
  if (over) {
    if (!v) throw new Error('Die vraag staat niet in deze toets.');
    s.over = s.over || {};
    if (punten === null || punten === '') delete s.over[id];
    else {
      const n = Math.round(Number(String(punten).replace(',', '.')) * 2) / 2;
      if (!Number.isFinite(n) || n < 0 || n > K.maxVan(v.q)) throw new Error(`Geef 0 tot ${K.maxVan(v.q)} punten.`);
      s.over[id] = n;
    }
    schrijf(rec);
    return stand(rec, s);
  }
  if (!v || !K.handPunten(v.q)) throw new Error('Deze vraag verbeter je niet zelf.');
  if (punten === null || punten === '') s.hand[id] = null;
  else {
    const n = Math.round(Number(String(punten).replace(',', '.')) * 2) / 2;
    if (!Number.isFinite(n) || n < 0 || n > K.handPunten(v.q)) throw new Error(`Geef 0 tot ${K.handPunten(v.q)} punten.`);
    s.hand[id] = n;
  }
  schrijf(rec);
  return stand(rec, s);
}

// Klaar met verbeteren: de resultaten als Excel-bestand en (één keer) alles in het logboek, met de leerplandoelen.
function klaar(file, saveCsv) {
  const rec = laadAfname(file);
  if (!rec.gelogd) {
    const entries = [];
    for (const s of rec.spelers) {
      for (const { id, q, nr } of K.vragenVan(K.lijstVoor(rec.toets, s.niveau))) {
        const max = K.maxVan(q);
        if (!max) continue;
        const kreeg = kregen(s, id);
        entries.push({
          naam: s.naam, spel: 'Toets', bron: rec.title, vraag: `Vraag ${nr}: ${q.vraag || K.NAMES[q.type]}`,
          doel: q.doel, juist: kreeg >= max / 2, sessie: `toets-${rec.file.replace(/\.json$/, '')}`, leeg: s.antwoorden[id] === undefined || s.antwoorden[id] === null,
        });
      }
    }
    logboek.add(entries);
    rec.gelogd = true;
  }
  rec.klaar = true;
  rec.resultaten = saveCsv(rec, s => stand(rec, s));
  schrijf(rec);
  return rec;
}

function verwijderAfname(file) {
  const p = afnamePad(file);
  const bin = path.join(DIR, '_prullenbak');
  fs.mkdirSync(bin, { recursive: true });
  fs.renameSync(p, path.join(bin, `afname-${Date.now()}-${file}`));
}

module.exports = { kregen, DIR, list, load, save, remove, parseAiText, parseSleutel, lib, bewaarAfname, laadAfname, afnames, cijfer, klaar, stand, verwijderAfname, K };
