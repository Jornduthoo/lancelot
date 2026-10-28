// De Ronde Tafel: live polls, woordwolken, open vragen en schalen. Leerlingen antwoorden anoniem.
// Sessies staan als JSON-bestanden in de map rondetafel/.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { library } = require('./library');
const { extract } = require('./ai-json');

const DIR = gegevens.pad('rondetafel');
const TYPES = ['keuze', 'woorden', 'open', 'schaal'];
const TYPE_NAMES = { keuze: 'Meerkeuze', woorden: 'Woordwolk', open: 'Open vraag', schaal: 'Schaal' };
const MAX_WORDS = 3;  // woorden per leerling per woordwolk
const MAX_OPEN = 3;   // antwoorden per leerling per open vraag

function text(value, max) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

// Controleert een sessie en geeft een opgeschoonde kopie terug.
function validate(session) {
  if (!session || typeof session !== 'object') throw new Error('Dit is geen Ronde Tafel-sessie.');
  const title = text(session.title, 100);
  if (!title) throw new Error('De sessie heeft geen titel.');
  if (!Array.isArray(session.items) || session.items.length === 0) throw new Error('De sessie heeft geen vragen.');
  if (session.items.length > 50) throw new Error('Een sessie mag hooguit 50 vragen hebben.');
  const items = session.items.map((item, i) => {
    const n = i + 1;
    if (!item || typeof item !== 'object') throw new Error(`Vraag ${n} is ongeldig.`);
    const type = TYPES.includes(item.type) ? item.type : null;
    if (!type) throw new Error(`Vraag ${n} heeft geen geldige soort (keuze, woorden, open of schaal).`);
    const question = text(item.question, 200);
    if (!question) throw new Error(`Vraag ${n} heeft geen tekst.`);
    if (type === 'keuze') {
      const options = (Array.isArray(item.options) ? item.options : []).map(o => text(o, 80)).filter(Boolean);
      if (options.length < 2 || options.length > 6) throw new Error(`Vraag ${n} (meerkeuze) moet 2 tot 6 keuzes hebben.`);
      return { type, question, options };
    }
    if (type === 'schaal') {
      return { type, question, min: text(item.min, 40) || 'Helemaal niet', max: text(item.max, 40) || 'Helemaal wel' };
    }
    return { type, question };
  });
  return { title, items };
}

function checkFile(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json') || file.startsWith('_')) throw new Error('Ongeldige bestandsnaam.');
  return path.join(DIR, file);
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  const where = lib.places();
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(file => {
      const folder = where(file);
      try {
        const s = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
        return { file, folder, title: s.title || file, count: (s.items || []).length };
      } catch {
        return { file, folder, title: `${file} (ongeldig bestand)`, count: 0 };
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl', { numeric: true }));
}

function load(file) {
  return validate(JSON.parse(fs.readFileSync(checkFile(file), 'utf8')));
}

function slug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'sessie';
}

function save(session, file) {
  const clean = validate(session);
  fs.mkdirSync(DIR, { recursive: true });
  if (!file) {
    const base = slug(clean.title);
    file = `${base}.json`;
    for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${base}-${i}.json`;
  }
  fs.writeFileSync(checkFile(file), JSON.stringify(clean, null, 2) + '\n');
  return file;
}

// Naar de prullenbak (30 dagen), niet meteen weg.
function remove(file) {
  lib.trash([file]);
}

// Haalt de sessie uit het antwoord van een chatbot, ook met tekst of ```json eromheen.
function parseAiText(raw) {
  const data = extract(raw, 'sessie', d => d.title !== undefined || d.items !== undefined);
  if (data && data.title === 'korte titel van de sessie') throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  return validate(data);
}

// Woorden tellen we zonder hoofdletters en spaties aan de randen.
const norm = s => s.toLowerCase().normalize('NFC');

// --- De live sessie. Er draait hooguit één Ronde Tafel tegelijk. ---
class RondeTafel {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    this.session = null;
    this.phase = 'idle'; // idle -> open (index -1 is het welkomstscherm) -> einde
    this.index = -1;
    this.participants = new Set();
    this.answers = [];   // per vraag: Map playerId -> waarde (getal of lijst met teksten)
    this.hidden = [];    // per vraag: Set met verborgen woorden of id's van open antwoorden
    this.locked = [];
    this.showResults = true;
    this.nextId = 1;
    this.resultsFile = null;
    clearTimeout(this.pending);
    this.pending = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get item() {
    return this.session && this.index >= 0 ? this.session.items[this.index] : null;
  }

  load(session) {
    this.reset();
    this.run++;
    this.session = session;
    this.phase = 'open';
    this.answers = session.items.map(() => new Map());
    this.hidden = session.items.map(() => new Set());
    this.locked = session.items.map(() => false);
    this.broadcast();
  }

  go(index) {
    if (this.phase === 'idle') return;
    const total = this.session.items.length;
    if (index >= total) return this.finish();
    this.phase = 'open';
    this.index = Math.max(-1, Math.min(index, total - 1));
    this.showResults = true;
    this.broadcast();
  }

  finish() {
    if (this.phase !== 'open') return;
    this.phase = 'einde';
    this.save();
    this.broadcast();
  }

  save() {
    if (this.resultsFile || !this.answers.some(m => m.size > 0)) return;
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
    }
  }

  // Stoppen bewaart wat er al geantwoord is en geeft de bestandsnaam terug (of null).
  stop() {
    if (this.phase === 'idle') return null;
    this.save();
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  toggleLock() {
    if (!this.item) return;
    this.locked[this.index] = !this.locked[this.index];
    this.broadcast();
  }

  toggleResults() {
    this.showResults = !this.showResults;
    this.broadcast();
  }

  // De leerkracht verbergt een ongepast woord of antwoord.
  hide(key) {
    if (!this.item || (typeof key !== 'string' && typeof key !== 'number')) return;
    this.hidden[this.index].add(this.item.type === 'woorden' ? norm(String(key)) : Number(key));
    this.broadcast();
  }

  join(playerId) {
    if (!this.active) return null;
    if (!this.participants.has(playerId)) {
      this.participants.add(playerId);
      this.broadcastSoon();
    }
    return this.mine(playerId);
  }

  // Wat deze leerling bij de huidige vraag al heeft ingestuurd.
  mine(playerId) {
    if (!this.item) return null;
    const value = this.answers[this.index].get(playerId);
    if (value === undefined) return null;
    return Array.isArray(value) ? value.map(v => v.text) : value;
  }

  answer(playerId, value) {
    const item = this.item;
    if (!item || this.phase !== 'open') return { error: 'Er staat nu geen vraag open.' };
    if (this.locked[this.index]) return { error: 'De leerkracht heeft het antwoorden gesloten.' };
    this.participants.add(playerId);
    const answers = this.answers[this.index];
    if (item.type === 'keuze' || item.type === 'schaal') {
      const n = Number(value);
      const max = item.type === 'keuze' ? item.options.length - 1 : 4;
      if (!Number.isInteger(n) || n < 0 || n > max) return { error: 'Ongeldige keuze.' };
      answers.set(playerId, n);
    } else {
      const limit = item.type === 'woorden' ? MAX_WORDS : MAX_OPEN;
      const clean = text(value, item.type === 'woorden' ? 25 : 140);
      if (!clean) return { error: item.type === 'woorden' ? 'Typ eerst een woord.' : 'Typ eerst je antwoord.' };
      const list = answers.get(playerId) || [];
      if (list.length >= limit) return { error: `Je kunt hier hooguit ${limit} keer iets insturen.` };
      if (item.type === 'woorden' && list.some(w => norm(w.text) === norm(clean))) return { error: 'Dat woord heb je al gegeven.' };
      list.push({ id: this.nextId++, text: clean });
      answers.set(playerId, list);
    }
    this.broadcastSoon();
    return { ok: true, mine: this.mine(playerId) };
  }

  // Samenvatting van de antwoorden op één vraag (zonder verborgen antwoorden).
  summary(i) {
    const item = this.session.items[i];
    const values = [...this.answers[i].values()];
    const hidden = this.hidden[i];
    const base = { respondents: values.length };
    if (item.type === 'keuze') {
      return { ...base, counts: item.options.map((_, o) => values.filter(v => v === o).length) };
    }
    if (item.type === 'schaal') {
      const counts = [0, 1, 2, 3, 4].map(o => values.filter(v => v === o).length);
      const avg = values.length ? values.reduce((a, v) => a + v + 1, 0) / values.length : null;
      return { ...base, counts, avg };
    }
    const all = values.flat().filter(a => !hidden.has(item.type === 'woorden' ? norm(a.text) : a.id));
    if (item.type === 'open') return { ...base, open: all.sort((a, b) => a.id - b.id).slice(-200) };
    const words = new Map();
    for (const a of all) {
      const key = norm(a.text);
      const w = words.get(key) || { text: a.text, n: 0 };
      w.n++;
      words.set(key, w);
    }
    return { ...base, words: [...words.values()].sort((a, b) => b.n - a.n).slice(0, 80) };
  }

  hostState() {
    const item = this.item;
    return {
      run: this.run,
      phase: this.phase,
      title: this.session && this.session.title,
      index: this.index,
      total: this.session ? this.session.items.length : 0,
      item,
      participants: this.participants.size,
      locked: item ? this.locked[this.index] : false,
      showResults: this.showResults,
      results: item ? this.summary(this.index) : null,
      resultsFile: this.resultsFile,
    };
  }

  // Voor leerlingen: alleen de vraag, geen antwoorden van anderen.
  playerState() {
    const item = this.item;
    return {
      active: this.active,
      run: this.run,
      title: this.session && this.session.title,
      phase: this.phase,
      index: this.index,
      total: this.session ? this.session.items.length : 0,
      item,
      locked: item ? this.locked[this.index] : false,
      limit: item ? { woorden: MAX_WORDS, open: MAX_OPEN }[item.type] || 1 : 0,
    };
  }

  broadcast() {
    clearTimeout(this.pending);
    this.pending = null;
    this.io.to('host').emit('rt-state', this.hostState());
    this.io.to('players').emit('rt-state', this.playerState());
  }

  // Bij veel antwoorden tegelijk niet bij elk antwoord het hele bord opnieuw sturen.
  broadcastSoon() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('rt-state', this.hostState());
    }, 150);
  }
}

const lib = library({ kind: 'sessie', dir: DIR, checkFile, load, save, validate, list });

module.exports = { RondeTafel, validate, list, load, save, remove, parseAiText, lib, TYPE_NAMES, DIR };
