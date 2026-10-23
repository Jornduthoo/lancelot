// Een oefenblad live in de klas: elke leerling vult het blad in op eigen tempo,
// de leerkracht ziet op het bord hoe ver iedereen staat en wat goed of fout is.
// Feedback: 'direct' (meteen groen of rood) of 'inleveren' (pas na het inleveren).
const sheets = require('./oefenbladen');

class OefenbladLive {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.pending);
    this.pending = null;
    this.sheet = null;
    this.file = null;
    this.phase = 'idle'; // idle -> open -> einde
    this.feedback = 'direct';
    this.players = new Map();
    this.fields = [];
    this.shuffles = [];
    this.view = null;
    this.revealed = false;
    this.startedAt = 0;
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(sheet, file, feedback) {
    this.reset();
    this.run++;
    this.sheet = sheet;
    this.file = file;
    this.feedback = feedback === 'inleveren' ? 'inleveren' : 'direct';
    this.fields = sheets.fields(sheet);
    this.shuffles = sheets.shufflesFor(sheet);
    this.view = sheets.studentView(sheet, this.shuffles);
    this.phase = 'open';
    this.startedAt = Date.now();
    this.broadcast();
  }

  get graded() {
    return this.fields.filter(f => f.kind !== 'open');
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen oefenblad gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    if (this.phase !== 'open') return { error: 'Dit oefenblad is al afgesloten.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, { name: clean, socketId, answers: {}, results: {}, submitted: false, submittedAt: 0, joinedAt: Date.now(), lastAt: Date.now() });
    this.changed();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('ob-kicked');
    this.changed();
  }

  answer(playerId, { id, value } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'open') return { error: 'Het oefenblad is gesloten.' };
    if (p.submitted) return { error: 'Je hebt dit blad al ingeleverd.' };
    const field = this.fields.find(f => f.id === id);
    if (!field) return { error: 'Onbekend veld.' };
    const clean = typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 1000) : '';
    if (clean === '') delete p.answers[id];
    else p.answers[id] = clean;
    p.results[id] = sheets.grade(field, clean, this.shuffles);
    p.lastAt = Date.now();
    this.changed();
    return this.feedback === 'direct' ? { ok: true, id, correct: p.results[id] } : { ok: true, id };
  }

  submit(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase === 'idle') return { error: 'Het oefenblad is gesloten.' };
    if (!p.submitted) {
      p.submitted = true;
      p.submittedAt = Date.now();
      this.changed();
    }
    return this.report(p);
  }

  // Een ingeleverd blad weer openzetten: de leerling werkt verder met de antwoorden die er al staan.
  // Zonder playerId voor iedereen. Was het blad al afgesloten, dan gaat het weer open.
  reopen(playerId) {
    if (!this.active) return { error: 'Er loopt geen oefenblad.' };
    const list = playerId ? [this.players.get(playerId)].filter(Boolean) : [...this.players.values()];
    if (!list.length) return { error: 'Die leerling is er niet meer.' };
    if (this.phase === 'einde') this.phase = 'open';
    for (const p of list) {
      p.submitted = false;
      p.submittedAt = 0;
      this.io.to(p.socketId).emit('ob-reopened');
    }
    this.broadcast();
    return { ok: true, count: list.length };
  }

  // Wat de leerling na het inleveren ziet: per veld goed of fout, en de oplossingen als de leerkracht die toont.
  report(p) {
    const score = this.score(p);
    return { ok: true, results: p.results, score, solutions: this.revealed ? sheets.solutions(this.sheet, this.shuffles) : null };
  }

  score(p) {
    const total = this.graded.length;
    const right = this.graded.filter(f => p.results[f.id] === true).length;
    return { right, total };
  }

  // De oplossingen tonen aan wie heeft ingeleverd (of aan iedereen na het afsluiten).
  reveal() {
    this.revealed = !this.revealed;
    for (const p of this.players.values()) {
      if (p.submitted || this.phase === 'einde') this.io.to(p.socketId).emit('ob-report', this.report(p));
    }
    this.changed();
  }

  // Afsluiten: iedereen levert in, de resultaten worden bewaard.
  finish() {
    if (this.phase !== 'open') return;
    this.phase = 'einde';
    for (const p of this.players.values()) {
      if (!p.submitted) { p.submitted = true; p.submittedAt = Date.now(); }
    }
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
    }
    this.broadcast();
    for (const p of this.players.values()) this.io.to(p.socketId).emit('ob-report', this.report(p));
  }

  stop() {
    if (this.phase === 'open' && this.players.size) this.finish();
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  // Eén leerling in detail, voor het bord.
  detail(playerId) {
    const p = this.players.get(playerId);
    if (!p) return { error: 'Die leerling is er niet meer.' };
    return { ok: true, name: p.name, answers: p.answers, results: p.results, submitted: p.submitted };
  }

  ranking() {
    const total = this.fields.length;
    return [...this.players.entries()].map(([id, p]) => {
      const done = this.fields.filter(f => p.answers[f.id] !== undefined).length;
      return { id, name: p.name, done, total, ...this.score(p), wrong: this.graded.filter(f => p.results[f.id] === false).length, submitted: p.submitted, submittedAt: p.submittedAt, joinedAt: p.joinedAt };
    }).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }

  // Per veld: hoeveel leerlingen het al invulden en hoeveel er goed waren.
  fieldStats() {
    return this.fields.map(f => {
      let filled = 0;
      let right = 0;
      for (const p of this.players.values()) {
        if (p.answers[f.id] === undefined) continue;
        filled++;
        if (p.results[f.id] === true) right++;
      }
      return { id: f.id, block: f.block, kind: f.kind, filled, right };
    });
  }

  base() {
    return { active: this.active, run: this.run, phase: this.phase, title: this.sheet && this.sheet.title, feedback: this.feedback, revealed: this.revealed };
  }

  hostState() {
    return {
      ...this.base(), file: this.file, sheet: this.sheet, shuffles: this.shuffles, solutions: this.sheet ? sheets.solutions(this.sheet, this.shuffles) : null,
      ranking: this.ranking(), stats: this.fieldStats(), resultsFile: this.resultsFile,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      Object.assign(state, {
        name: p.name, sheet: this.view, answers: p.answers, submitted: p.submitted,
        results: this.feedback === 'direct' || p.submitted ? p.results : {},
      });
      if (p.submitted) state.report = this.report(p);
    }
    return state;
  }

  // Het bord hooguit vier keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('ob-state', this.hostState());
    }, 250);
  }

  broadcast() {
    this.io.to('host').emit('ob-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('ob-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('ob-state', this.base());
  }
}

module.exports = { OefenbladLive };
