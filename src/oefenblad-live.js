// Een oefenblad live in de klas: elke leerling vult het blad in op eigen tempo,
// de leerkracht ziet op het bord hoe ver iedereen staat en wat goed of fout is.
// Feedback: 'direct' (meteen groen of rood) of 'inleveren' (pas na het inleveren).
// Heeft het blad niveaus, dan werkt elke leerling op Page, Schildknaap of Ridder, elk met een eigen blad.
// Wie welk niveau krijgt: de hele klas hetzelfde, per leerling zoals in Mijn klas ('klas'), of de leerling kiest ('kies').
// De leerkracht kan het niveau van een leerling tijdens het werken nog veranderen.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const sheets = require('./oefenbladen');
const logboek = require('./logboek');
const klas = require('./klas');
const doelen = require('./doelen');
const { NIVEAUS, NAMES } = require('./niveaus');

const MODES = [...NIVEAUS, 'klas', 'kies'];
// Tegen gokken bij meteen verbeteren: na een fout keuzeantwoord even wachten voor je dat vakje opnieuw kiest,
// en wie snel na elkaar fout klikt, geeft de leerkracht een seintje. In het logboek telt de eerste poging.
const WRONG_MS = 3000;
const FAST_MS = 1500;
const closed = field => field.kind === 'keuze' || field.kind === 'paar';

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
    this.voorlees = 'iedereen';
    this.mode = 'schildknaap';
    this.players = new Map();
    this.levels = {};
    this.revealed = false;
    this.startedAt = 0;
    this.resultsFile = null;
    this.logged = false;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(sheet, file, feedback, niveau, voorlees) {
    this.reset();
    this.run++;
    this.sheet = sheet;
    this.file = file;
    this.feedback = feedback === 'inleveren' ? 'inleveren' : 'direct';
    this.voorlees = ['iedereen', 'page', 'uit'].includes(voorlees) ? voorlees : 'iedereen';
    this.mode = MODES.includes(niveau) ? niveau : 'schildknaap';
    // Het vak van het blad (uit de doelen van de oefeningen) kiest welk niveau uit Mijn klas geldt.
    const blocks = ['blocks', 'page', 'ridder'].flatMap(k => sheet[k] || []);
    this.vak = doelen.hoofdvak(blocks.map(b => b.doel));
    for (const n of sheets.niveausOf(sheet)) {
      const s = sheets.forNiveau(sheet, n);
      const shuffles = sheets.shufflesFor(s);
      this.levels[n] = { sheet: s, fields: sheets.fields(s), shuffles, view: sheets.studentView(s, shuffles) };
    }
    this.phase = 'open';
    this.startedAt = Date.now();
    this.broadcast();
  }

  get multi() {
    return Object.keys(this.levels).length > 1;
  }

  // Het blad, de velden en de volgorde bij verbinden van het niveau van deze leerling.
  lv(p) {
    return this.levels[p.niveau] || this.levels.schildknaap;
  }

  graded(p) {
    return this.lv(p).fields.filter(f => f.kind !== 'open');
  }

  // Met welk niveau een nieuwe leerling begint.
  startNiveau(name) {
    if (this.levels[this.mode]) return this.mode;
    if (this.mode === 'klas') {
      const l = klas.match(name);
      const n = klas.niveauVoor(l, this.vak);
      if (l && this.levels[n]) return n;
    }
    return 'schildknaap';
  }

  // Op 🪶 Page: op dit blad, of anders zoals ingesteld bij Mijn klas (ook bij een blad met één niveau).
  isPage(p) {
    return this.multi ? p.niveau === 'page' : p.klasPage;
  }

  // Een ander niveau: de leerling begint op een ander blad, dus de antwoorden van het oude blad vervallen.
  switchNiveau(p, niveau) {
    if (p.niveau === niveau) return;
    p.niveau = niveau;
    p.answers = {};
    p.results = {};
    p.submitted = false;
    p.submittedAt = 0;
  }

  // De leerling kiest zelf zijn niveau (alleen als de leerkracht dat toelaat, en alleen bij het begin).
  choose(playerId, niveau) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'open') return { error: 'Het oefenblad is gesloten.' };
    if (!p.choosing) return { error: 'Je niveau ligt al vast.' };
    if (!this.levels[niveau]) return { error: 'Dat niveau bestaat niet voor dit blad.' };
    this.switchNiveau(p, niveau);
    p.choosing = false;
    this.io.to(p.socketId).emit('ob-state', this.playerState(playerId));
    this.changed();
    return { ok: true };
  }

  // De leerkracht zet een leerling op een ander niveau.
  setNiveau(playerId, niveau) {
    const p = this.players.get(playerId);
    if (!p) return { error: 'Die leerling is er niet meer.' };
    if (!this.levels[niveau]) return { error: 'Dat niveau bestaat niet voor dit blad.' };
    this.switchNiveau(p, niveau);
    p.choosing = false;
    this.io.to(p.socketId).emit('ob-state', this.playerState(playerId));
    this.changed();
    return { ok: true };
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
    const kl = klas.match(clean);
    this.players.set(playerId, {
      name: clean, socketId, niveau: this.startNiveau(clean), klasPage: !!kl && klas.niveauVoor(kl, this.vak) === 'page', choosing: this.mode === 'kies' && this.multi,
      answers: {}, results: {}, first: {}, lockUntil: {}, submitted: false, submittedAt: 0, joinedAt: Date.now(), lastAt: Date.now(),
    });
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
    if (p.choosing) return { error: 'Kies eerst je niveau.' };
    const { fields, shuffles } = this.lv(p);
    const field = fields.find(f => f.id === id);
    if (!field) return { error: 'Onbekend veld.' };
    const now = Date.now();
    const guard = this.feedback === 'direct' && closed(field);
    if (guard && p.lockUntil[id] > now) return { error: 'Even wachten.', wait: p.lockUntil[id] - now, id, value: p.answers[id] ?? '' };
    const clean = sheets.clean(field, value);
    if (clean === '') delete p.answers[id];
    else p.answers[id] = clean;
    p.results[id] = sheets.grade(field, clean, shuffles);
    if (closed(field) && p.first[id] === undefined && p.results[id] !== null) p.first[id] = p.results[id];
    const since = now - p.lastAt;
    p.lastAt = now;
    this.changed();
    if (this.feedback !== 'direct') return { ok: true, id };
    if (guard && p.results[id] !== null && this.gok) {
      this.gok.judge('oefenblad', playerId, { correct: p.results[id], ms: since, limit: FAST_MS, name: p.name, socketId: p.socketId, spel: 'Oefenblad' });
    }
    if (guard && p.results[id] === false) {
      p.lockUntil[id] = now + WRONG_MS;
      return { ok: true, id, correct: false, wait: WRONG_MS };
    }
    return { ok: true, id, correct: p.results[id] };
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
    const { sheet, shuffles } = this.lv(p);
    return { ok: true, results: p.results, score, solutions: this.revealed ? sheets.solutions(sheet, shuffles) : null };
  }

  score(p) {
    const graded = this.graded(p);
    const total = graded.length;
    const right = graded.filter(f => p.results[f.id] === true).length;
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
    this.log();
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
    }
    this.broadcast();
    for (const p of this.players.values()) this.io.to(p.socketId).emit('ob-report', this.report(p));
  }

  // Elk verbeterd veld in het logboek, met het leerplandoel van de oefening. Een leeg veld telt als fout.
  // Na heropenen en opnieuw afsluiten niet nog eens, anders telt hetzelfde blad dubbel.
  log() {
    if (this.logged) return;
    this.logged = true;
    const entries = [];
    for (const p of this.players.values()) {
      // Wie nog zijn niveau aan het kiezen was, is nog niet begonnen.
      if (p.choosing) continue;
      const { sheet } = this.lv(p);
      const tag = this.multi ? `${NAMES[p.niveau]}, ` : '';
      for (const f of this.graded(p)) {
        const block = sheet.blocks[f.block];
        entries.push({
          naam: p.name, spel: 'Oefenblad', bron: this.sheet.title, vraag: `${tag}Oefening ${f.block + 1}.${Number(f.id.split('.')[1]) + 1}: ${block.instruction || (block.q && block.q.vraag) || ''}`,
          // Meteen verbeterd: een keuzevraag telt pas als juist als de eerste poging goed was.
          doel: block.doel, juist: p.results[f.id] === true && (this.feedback !== 'direct' || p.first[f.id] !== false), leeg: p.answers[f.id] === undefined,
        });
      }
    }
    logboek.add(entries);
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
    return { ok: true, name: p.name, niveau: p.niveau, answers: p.answers, results: p.results, submitted: p.submitted };
  }

  ranking() {
    return [...this.players.entries()].map(([id, p]) => {
      const { fields } = this.lv(p);
      const done = fields.filter(f => p.answers[f.id] !== undefined).length;
      return {
        id, name: p.name, niveau: p.niveau, choosing: p.choosing, done, ...this.score(p), fields: fields.length,
        wrong: this.graded(p).filter(f => p.results[f.id] === false).length, submitted: p.submitted, submittedAt: p.submittedAt, joinedAt: p.joinedAt,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }

  // Per veld: hoeveel leerlingen het al invulden en hoeveel er goed waren (per niveau, want elk niveau heeft eigen velden).
  fieldStats(niveau = 'schildknaap') {
    const level = this.levels[niveau];
    if (!level) return [];
    const players = [...this.players.values()].filter(p => (this.levels[p.niveau] ? p.niveau : 'schildknaap') === niveau);
    return level.fields.map(f => {
      let filled = 0;
      let right = 0;
      for (const p of players) {
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

  // sheet, shuffles, solutions en stats zijn die van Schildknaap; levels heeft ze per niveau.
  hostState() {
    const levels = {};
    for (const [n, l] of Object.entries(this.levels)) {
      levels[n] = { sheet: l.sheet, shuffles: l.shuffles, solutions: sheets.solutions(l.sheet, l.shuffles), stats: this.fieldStats(n) };
    }
    const main = levels.schildknaap;
    return {
      ...this.base(), file: this.file, mode: this.mode, multi: this.multi, levels,
      sheet: main ? main.sheet : null, shuffles: main ? main.shuffles : [], solutions: main ? main.solutions : null, stats: main ? main.stats : [],
      ranking: this.ranking(), resultsFile: this.resultsFile,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      Object.assign(state, {
        name: p.name, sheet: this.lv(p).view, niveau: this.multi ? p.niveau : null, choosing: p.choosing,
        niveaus: p.choosing ? Object.keys(this.levels) : null, answers: p.answers, submitted: p.submitted,
        results: this.feedback === 'direct' || p.submitted ? p.results : {},
        voorlees: this.voorlees === 'iedereen' || (this.voorlees === 'page' && this.isPage(p)),
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
