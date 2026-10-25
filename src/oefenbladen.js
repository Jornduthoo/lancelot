// Oefenbladen: digitale werkbladen die leerlingen live invullen, en die je ook kan printen.
// Ze staan als JSON-bestanden in de map oefenbladen/. Een blad bestaat uit blokken:
//   tekst          een leestekst of uitleg
//   invullen       een tekst met gaten: "De hoofdstad is [Brussel]." (meerdere goede antwoorden: [fiets|velo])
//   meerkeuze      vragen met 2 tot 5 keuzes en één goed antwoord
//   juistfout      stellingen die juist of fout zijn
//   verbinden      paren die de leerling aan elkaar koppelt
//   woorden        woordjes: een opgave en het woord dat de leerling typt
//   overschrijven  zinnen die de leerling foutloos overschrijft
//   open           open vragen (niet automatisch verbeterd)
// Een blad kan drie niveaus hebben: blocks is Schildknaap (het doel zelf), page (met hulp) en ridder (uitdaging)
// zijn optioneel. Een leerling op een niveau zonder eigen blokken krijgt het Schildknaap-blad.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { library } = require('./library');
const { extract } = require('./ai-json');
const doelen = require('./doelen');
const { NIVEAUS, NAMES } = require('./niveaus');

const DIR = gegevens.pad('oefenbladen');
const TYPES = ['tekst', 'invullen', 'meerkeuze', 'juistfout', 'verbinden', 'woorden', 'overschrijven', 'open'];
const TYPE_NAMES = {
  tekst: 'Tekst', invullen: 'Invullen', meerkeuze: 'Meerkeuze', juistfout: 'Juist of fout', verbinden: 'Verbinden',
  woorden: 'Woordjes', overschrijven: 'Overschrijven', open: 'Open vragen',
};
const DEFAULT_INSTRUCTION = {
  invullen: 'Vul de ontbrekende woorden in.',
  meerkeuze: 'Kies het juiste antwoord.',
  juistfout: 'Is de zin juist of fout?',
  verbinden: 'Verbind wat bij elkaar hoort.',
  woorden: 'Schrijf het juiste woord.',
  overschrijven: 'Schrijf de zinnen foutloos over.',
  open: 'Beantwoord de vragen.',
};

function text(value, max) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\r/g, '').trim().slice(0, max) : '';
}

function list(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

// Gaten in een invultekst: [antwoord] of [antwoord|ander antwoord].
const GAP = /\[([^\[\]]+)\]/g;

function cleanBlock(b, n) {
  if (!b || typeof b !== 'object' || !TYPES.includes(b.type)) throw new Error(`Oefening ${n} heeft een onbekende soort.`);
  const type = b.type;
  const instruction = text(b.instruction, 200) || DEFAULT_INSTRUCTION[type] || '';
  const where = `Oefening ${n} (${TYPE_NAMES[type].toLowerCase()})`;
  if (type === 'tekst') {
    const body = text(b.text, 4000);
    if (!body) throw new Error(`${where} is leeg.`);
    return { type, title: text(b.title, 100), text: body };
  }
  if (type === 'invullen') {
    const body = text(b.text, 4000);
    const gaps = body.match(GAP) || [];
    if (gaps.length === 0) throw new Error(`${where} heeft geen gaten. Zet de woorden die de leerling invult tussen [ en ].`);
    if (gaps.length > 40) throw new Error(`${where} heeft te veel gaten (hooguit 40).`);
    return { type, instruction, text: body };
  }
  if (type === 'meerkeuze') {
    const items = list(b.items, 30).map((q, i) => {
      const question = text(q && q.question, 250);
      const options = list(q && q.options, 5).map(o => text(o, 120)).filter(Boolean);
      const correct = Number(q && q.correct);
      if (!question || options.length < 2) throw new Error(`${where}, vraag ${i + 1}: een vraag en minstens twee keuzes nodig.`);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new Error(`${where}, vraag ${i + 1}: geen geldig goed antwoord.`);
      return { question, options, correct };
    });
    if (!items.length) throw new Error(`${where} heeft geen vragen.`);
    return { type, instruction, items };
  }
  if (type === 'juistfout') {
    const items = list(b.items, 40).map((q, i) => {
      const statement = text(q && q.statement, 250);
      if (!statement) throw new Error(`${where}, zin ${i + 1} is leeg.`);
      const c = q.correct;
      const correct = c === true || /^(j|juist|true|waar|ja)$/i.test(String(c));
      return { statement, correct };
    });
    if (!items.length) throw new Error(`${where} heeft geen zinnen.`);
    return { type, instruction, items };
  }
  if (type === 'verbinden') {
    const pairs = list(b.pairs, 15).map((p, i) => {
      const left = text(Array.isArray(p) ? p[0] : p && p.left, 120);
      const right = text(Array.isArray(p) ? p[1] : p && p.right, 120);
      if (!left || !right) throw new Error(`${where}, paar ${i + 1} is niet volledig.`);
      return { left, right };
    });
    if (pairs.length < 2) throw new Error(`${where} heeft minstens twee paren nodig.`);
    return { type, instruction, pairs };
  }
  if (type === 'woorden') {
    const items = list(b.items, 40).map((q, i) => {
      const prompt = text(q && q.prompt, 200);
      const answer = text(q && q.answer, 120);
      if (!prompt || !answer) throw new Error(`${where}, woord ${i + 1} is niet volledig.`);
      return { prompt, answer };
    });
    if (!items.length) throw new Error(`${where} heeft geen woorden.`);
    return { type, instruction, items };
  }
  if (type === 'overschrijven') {
    const lines = list(b.lines, 20).map(l => text(l, 250)).filter(Boolean);
    if (!lines.length) throw new Error(`${where} heeft geen zinnen.`);
    return { type, instruction, lines };
  }
  // open
  const items = list(b.items, 20).map((q, i) => {
    const question = text(q && (q.question || q), 250);
    if (!question) throw new Error(`${where}, vraag ${i + 1} is leeg.`);
    const lines = Math.min(10, Math.max(1, Number(q && q.lines) || 3));
    return { question, lines };
  });
  if (!items.length) throw new Error(`${where} heeft geen vragen.`);
  return { type, instruction, items };
}

function cleanBlocks(raw, prefix) {
  return list(raw, 30).map((b, i) => {
    let block;
    try {
      block = cleanBlock(b, i + 1);
    } catch (err) {
      throw new Error(prefix + err.message);
    }
    // Het leerplandoel dat deze oefening oefent (mag ontbreken).
    const doel = b.type !== 'tekst' && doelen.clean(b.doel);
    return doel ? { ...block, doel } : block;
  });
}

function validate(sheet) {
  if (!sheet || typeof sheet !== 'object') throw new Error('Dit is geen oefenblad.');
  const title = text(sheet.title, 100);
  if (!title) throw new Error('Het oefenblad heeft geen titel.');
  // Een AI geeft de niveaus soms samen terug: { "niveaus": { "page": [...], "schildknaap": [...], "ridder": [...] } }.
  const n = sheet.niveaus && typeof sheet.niveaus === 'object' ? sheet.niveaus : {};
  const pick = (key, alt) => {
    const v = n[key] !== undefined ? n[key] : sheet[alt || key];
    return v && !Array.isArray(v) && Array.isArray(v.blocks) ? v.blocks : v;
  };
  const multi = ['page', 'ridder'].some(k => list(pick(k)).length);
  const blocks = cleanBlocks(pick('schildknaap', 'blocks'), multi ? 'Schildknaap: ' : '');
  if (!blocks.length) throw new Error(multi ? 'Het Schildknaap-niveau heeft geen oefeningen.' : 'Het oefenblad heeft geen oefeningen.');
  const out = { title, level: text(sheet.level, 40), blocks };
  for (const k of ['page', 'ridder']) {
    const extra = cleanBlocks(pick(k), `${NAMES[k]}: `);
    if (extra.length) out[k] = extra;
  }
  return out;
}

// Welke niveaus heeft dit blad? Altijd minstens Schildknaap.
function niveausOf(sheet) {
  return NIVEAUS.filter(n => n === 'schildknaap' || (Array.isArray(sheet[n]) && sheet[n].length));
}

// Het blad zoals een leerling op dit niveau het krijgt.
function forNiveau(sheet, niveau) {
  const blocks = niveau !== 'schildknaap' && Array.isArray(sheet[niveau]) && sheet[niveau].length ? sheet[niveau] : sheet.blocks;
  return { title: sheet.title, level: sheet.level, blocks };
}

// Alle velden die een leerling invult, met de goede antwoorden. Elk veld heeft een vaste id.
function fields(sheet) {
  const out = [];
  sheet.blocks.forEach((b, bi) => {
    if (b.type === 'invullen') {
      let g = 0;
      for (const m of b.text.matchAll(GAP)) out.push({ id: `${bi}.${g++}`, block: bi, kind: 'tekst', answers: m[1].split('|').map(s => s.trim()).filter(Boolean) });
    } else if (b.type === 'meerkeuze') {
      b.items.forEach((q, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'keuze', answer: q.correct }));
    } else if (b.type === 'juistfout') {
      b.items.forEach((q, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'keuze', answer: q.correct ? 'J' : 'F' }));
    } else if (b.type === 'verbinden') {
      b.pairs.forEach((p, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'paar', pair: i }));
    } else if (b.type === 'woorden') {
      b.items.forEach((q, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'tekst', answers: q.answer.split('|').map(s => s.trim()).filter(Boolean) }));
    } else if (b.type === 'overschrijven') {
      b.lines.forEach((l, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'exact', answer: l }));
    } else if (b.type === 'open') {
      b.items.forEach((q, i) => out.push({ id: `${bi}.${i}`, block: bi, kind: 'open' }));
    }
  });
  return out;
}

// Hoofdletters tellen mee: "de Hond" is fout als het model "de hond" zegt. Spaties en een punt op het einde niet.
const loose = s => String(s || '').trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
const exact = s => String(s || '').trim().replace(/\s+/g, ' ');

// Is dit antwoord goed? null = wordt niet automatisch verbeterd (open vraag) of nog niet ingevuld.
function grade(field, value, shuffles) {
  if (value === undefined || value === null || value === '') return null;
  if (field.kind === 'open') return null;
  if (field.kind === 'tekst') return field.answers.some(a => loose(a) === loose(value));
  if (field.kind === 'exact') return exact(field.answer) === exact(value);
  if (field.kind === 'paar') return shuffles[field.block][Number(value)] === field.pair;
  return String(field.answer) === String(value);
}

// Wat de leerling te zien krijgt: alles behalve de goede antwoorden.
// shuffles: per verbind-oefening de volgorde van de rechterkant (dezelfde voor de hele klas).
function studentView(sheet, shuffles) {
  return {
    title: sheet.title,
    blocks: sheet.blocks.map((b, bi) => {
      if (b.type === 'tekst') return b;
      if (b.type === 'invullen') {
        const parts = [];
        let last = 0;
        let g = 0;
        for (const m of b.text.matchAll(GAP)) {
          parts.push(b.text.slice(last, m.index));
          const longest = Math.max(...m[1].split('|').map(s => s.trim().length));
          parts.push({ gap: `${bi}.${g++}`, size: Math.min(28, Math.max(5, longest + 2)) });
          last = m.index + m[0].length;
        }
        parts.push(b.text.slice(last));
        return { type: b.type, instruction: b.instruction, parts };
      }
      if (b.type === 'meerkeuze') return { type: b.type, instruction: b.instruction, items: b.items.map(q => ({ question: q.question, options: q.options })) };
      if (b.type === 'juistfout') return { type: b.type, instruction: b.instruction, items: b.items.map(q => ({ statement: q.statement })) };
      if (b.type === 'verbinden') return { type: b.type, instruction: b.instruction, left: b.pairs.map(p => p.left), right: shuffles[bi].map(i => b.pairs[i].right) };
      if (b.type === 'woorden') return { type: b.type, instruction: b.instruction, items: b.items.map(q => ({ prompt: q.prompt })) };
      if (b.type === 'overschrijven') return { type: b.type, instruction: b.instruction, lines: b.lines };
      return { type: b.type, instruction: b.instruction, items: b.items };
    }),
  };
}

// De goede antwoorden per veld, om na het inleveren te tonen.
function solutions(sheet, shuffles) {
  const out = {};
  for (const f of fields(sheet)) {
    if (f.kind === 'tekst') out[f.id] = f.answers[0];
    else if (f.kind === 'exact') out[f.id] = f.answer;
    else if (f.kind === 'paar') out[f.id] = shuffles[f.block].indexOf(f.pair);
    else if (f.kind === 'keuze') out[f.id] = f.answer;
  }
  return out;
}

// Met seed altijd dezelfde volgorde (voor het printblad en het verbeterblad, die moeten overeenkomen).
function shufflesFor(sheet, seed) {
  let h = 2166136261;
  for (const c of String(seed || '')) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = seed ? () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296) : Math.random;
  return sheet.blocks.map(b => {
    if (b.type !== 'verbinden') return null;
    const order = b.pairs.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Nooit alles op dezelfde plaats laten staan.
    if (order.every((v, i) => v === i)) order.push(order.shift());
    return order;
  });
}

// ---------- Opslaan ----------

function listSheets() {
  if (!fs.existsSync(DIR)) return [];
  const where = lib.places();
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(file => {
      const folder = where(file);
      try {
        const s = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
        return { file, folder, title: s.title || file, count: (s.blocks || []).length, types: [...new Set((s.blocks || []).map(b => b.type))], niveaus: niveausOf(s) };
      } catch {
        return { file, folder, title: `${file} (ongeldig bestand)`, count: 0, types: [], niveaus: ['schildknaap'] };
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

function checkFile(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json') || file.startsWith('_')) {
    throw new Error('Ongeldige bestandsnaam.');
  }
  return path.join(DIR, file);
}

function load(file) {
  return validate(JSON.parse(fs.readFileSync(checkFile(file), 'utf8')));
}

function slug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'oefenblad';
}

function save(sheet, file) {
  const clean = validate(sheet);
  fs.mkdirSync(DIR, { recursive: true });
  if (!file) {
    const base = slug(clean.title);
    file = `${base}.json`;
    for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${base}-${i}.json`;
  }
  fs.writeFileSync(checkFile(file), JSON.stringify(clean, null, 2) + '\n');
  return file;
}

function remove(file) {
  fs.unlinkSync(checkFile(file));
  lib.forget(file);
}

// Het antwoord van een chatbot omzetten in een oefenblad.
function parseAiText(raw) {
  const data = extract(raw, 'oefenblad', d => d.title !== undefined || d.blocks !== undefined || d.niveaus !== undefined);
  if (data && data.title === 'korte titel van het oefenblad') throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  return validate(data);
}

const lib = library({ kind: 'oefenblad', dir: DIR, checkFile, load, save, validate, list: listSheets });

module.exports = {
  TYPES, TYPE_NAMES, validate, niveausOf, forNiveau, fields, grade, studentView, solutions, shufflesFor,
  list: listSheets, load, save, remove, parseAiText, lib, DIR,
};
