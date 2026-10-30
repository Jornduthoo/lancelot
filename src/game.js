// Toernooi: de live quiz. Er draait altijd hooguit één spel tegelijk.
// Fases: idle -> lobby -> intro -> question -> reveal -> (intro ...) -> podium
// In de intro staat de vraag al op het bord, maar kunnen leerlingen nog niet antwoorden.

const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const logboek = require('./logboek');
const settings = require('./settings');
const quizzes = require('./quizzes');
const getal = require('./getal');

const MAX_POINTS = 1000;
const INTRO_MS = 4000;
// Zeker of twijfel: heeft iedereen geantwoord, dan krijgt de laatste nog even tijd om dat aan te tikken.
const ZEKER_MS = 2500;

class Game {
  // onFinish(game) wordt aangeroepen als de quiz klaar is en geeft de bestandsnaam van de resultaten terug.
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.reset();
  }

  reset() {
    this.quiz = null;
    this.phase = 'idle';
    this.index = -1;
    this.players = new Map(); // playerId -> { name, score, streak, answer, answeredAt, socketId, results }
    this.resultsFile = null;
    this.questionStartedAt = 0;
    clearTimeout(this.timer);
    this.timer = null;
  }

  load(quiz) {
    this.reset();
    this.quiz = quiz;
    this.zekerheid = settings.read().zekerheid !== false;
    this.phase = 'lobby';
    this.io.to('players').emit('reset', { open: true });
    this.broadcast();
  }

  get question() {
    return this.quiz && this.quiz.questions[this.index];
  }

  // De vraag zoals deze leerling ze krijgt: bij een quiz op drie niveaus en "Per leerling" de versie van zijn niveau.
  // Iedereen speelt op hetzelfde moment en met dezelfde tijd; alleen de vraag en de antwoorden verschillen.
  qFor(p) {
    return quizzes.vraagVoor(this.question, p.name);
  }

  join(playerId, name, socketId) {
    if (this.phase === 'idle') return { error: 'Er is nog geen quiz gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    const taken = [...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase());
    if (taken) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, { name: clean, score: 0, streak: 0, answer: null, answeredAt: 0, socketId, results: [] });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.next();
  }

  next() {
    if (!this.quiz) return;
    if (this.index + 1 >= this.quiz.questions.length) {
      this.phase = 'podium';
      try {
        this.resultsFile = this.onFinish ? this.onFinish(this) : null;
      } catch (err) {
        console.error('Resultaten opslaan mislukt:', err.message);
      }
      this.broadcast();
      return;
    }
    this.index++;
    for (const p of this.players.values()) {
      p.answer = null;
      p.answeredAt = 0;
      p.zeker = null;
    }
    this.phase = 'intro';
    this.introEndsAt = Date.now() + INTRO_MS;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(), INTRO_MS);
    this.broadcast();
  }

  // Na de intro mogen de leerlingen antwoorden.
  open() {
    if (this.phase !== 'intro') return;
    this.phase = 'question';
    this.questionStartedAt = Date.now();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reveal(), this.question.time * 1000);
    this.broadcast();
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    const q = p && this.qFor(p);
    if (!p || this.phase !== 'question' || p.answer !== null) return;
    // Een getalvraag: de leerling typte { getal: '3,5' }.
    p.getypt = null;
    if (choice && typeof choice === 'object' && q.typ === 'getal') {
      const typed = String(choice.getal ?? '').trim().slice(0, 30);
      if (!typed) return;
      p.getypt = typed;
      choice = getal.kies(q.answers, q.answers[q.correct], typed);
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.answers.length) return;
    p.answer = choice;
    p.answeredAt = Date.now() - this.questionStartedAt;
    this.checkDone();
  }

  // Na het antwoord: was de leerling zeker of twijfelde hij? Telt niet mee voor de punten, alleen voor het logboek.
  zeker(playerId, value) {
    const p = this.players.get(playerId);
    if (!p || !this.zekerheid || this.phase !== 'question' || p.answer === null || p.zeker) return;
    if (value !== 'zeker' && value !== 'twijfel') return;
    p.zeker = value;
    this.checkDone();
  }

  // Iedereen geantwoord (en, met zeker of twijfel, dat ook aangetikt)? Dan meteen het antwoord tonen.
  checkDone() {
    const all = [...this.players.values()];
    if (!all.every(pl => pl.answer !== null)) return this.broadcast();
    if (!this.zekerheid || all.every(pl => pl.zeker)) return this.reveal();
    if (!this.waiting) {
      this.waiting = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.reveal(), ZEKER_MS);
    }
    this.broadcast();
  }

  reveal() {
    if (this.phase !== 'question') return;
    this.waiting = false;
    clearTimeout(this.timer);
    const q = this.question;
    const limit = q.time * 1000;
    for (const p of this.players.values()) {
      p.q = this.qFor(p);
      if (p.answer === p.q.correct) {
        // Snel antwoorden levert meer op: tussen 500 en 1000 punten.
        const speed = Math.min(p.answeredAt / limit, 1);
        p.lastPoints = Math.round(MAX_POINTS * (1 - speed / 2));
        p.streak++;
      } else {
        p.lastPoints = 0;
        p.streak = 0;
      }
      p.score += p.lastPoints;
      p.results[this.index] = { answer: p.answer, correct: p.answer === p.q.correct, points: p.lastPoints };
    }
    logboek.add([...this.players.values()].map(p => ({
      naam: p.name, spel: this.quiz.spel || 'Toernooi', bron: this.quiz.title, vraag: p.q.question, doel: p.q.doel,
      juist: p.answer === p.q.correct, leeg: p.answer === null, zeker: p.zeker,
    })));
    // Fout of niet geantwoord: de uitleg op het eigen scherm. Wat een leerling fout koos, gaat naar de veelgemaakte fouten.
    for (const p of this.players.values()) {
      if (p.answer === p.q.correct) continue;
      const juist = p.q.answers[p.q.correct];
      if (p.q.uitleg) this.io.to(p.socketId).emit('uitleg', { tekst: p.q.uitleg, juist });
      if (p.answer !== null) {
        logboek.keuze({ naam: p.name, spel: this.quiz.spel || 'Toernooi', bron: this.quiz.title, vraag: p.q.question, doel: p.q.doel, gekozen: p.getypt || p.q.answers[p.answer], juist });
      }
    }
    for (const p of this.players.values()) {
      if (!p.zeker || p.answer === null) continue;
      const k = `${p.zeker}-${p.answer === p.q.correct ? 'juist' : 'fout'}`;
      p.zekerTel = p.zekerTel || {};
      p.zekerTel[k] = (p.zekerTel[k] || 0) + 1;
    }
    this.phase = 'reveal';
    this.broadcast();
  }

  // Quiz voortijdig stoppen. Wat al gespeeld is, wordt bewaard. Geeft de bestandsnaam terug (of null).
  stop() {
    let file = null;
    if (this.players.size > 0 && this.phase !== 'podium' && this.index >= (this.phase === 'intro' ? 1 : 0)) {
      // Een open vraag eerst afsluiten, zodat de antwoorden meetellen. Een vraag in de intro telt niet.
      if (this.phase === 'question') this.reveal();
      if (this.phase === 'intro') this.index--;
      try {
        file = this.onFinish ? this.onFinish(this) : null;
      } catch (err) {
        console.error('Resultaten opslaan mislukt:', err.message);
      }
    }
    this.reset();
    this.io.to('players').emit('reset', { open: false });
    this.broadcast();
    return file;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({ id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  // Volledige status voor het leerkrachtenscherm.
  hostState() {
    const q = this.question;
    const players = [...this.players.values()];
    return {
      phase: this.phase,
      title: this.quiz && this.quiz.title,
      index: this.index,
      total: this.quiz ? this.quiz.questions.length : 0,
      question: q ? { question: q.question, answers: q.answers, time: q.time, typ: q.typ || '' } : null,
      uitleg: this.phase === 'reveal' && q.uitleg ? q.uitleg : '',
      introRemaining: this.phase === 'intro' ? Math.max(0, this.introEndsAt - Date.now()) : 0,
      correct: this.phase === 'reveal' ? q.correct : null,
      remaining: this.phase === 'question' ? Math.max(0, q.time * 1000 - (Date.now() - this.questionStartedAt)) : 0,
      answered: players.filter(p => p.answer !== null).length,
      // Op het bord staat de Schildknaap-versie: de staafjes tellen alleen wie die versie kreeg.
      counts: q ? q.answers.map((_, i) => players.filter(p => p.answer === i && this.qFor(p) === q).length) : [],
      niveaus: !!(this.quiz && this.quiz.gedeeld),
      ranking: this.ranking(),
      lastPoints: this.phase === 'reveal' ? Object.fromEntries([...this.players.entries()].map(([id, p]) => [id, p.lastPoints])) : {},
      resultsFile: this.resultsFile,
    };
  }

  // Status voor één leerling: de vraag in het klein (groot staat ze op het bord) en het eigen resultaat.
  playerState(playerId) {
    const p = this.players.get(playerId);
    const q = p ? this.qFor(p) : this.question;
    const ranking = this.ranking();
    const state = {
      phase: this.phase,
      index: this.index,
      total: this.quiz ? this.quiz.questions.length : 0,
      answerCount: q ? q.answers.length : 0,
      answers: q ? q.answers : [],
      question: q ? q.question : '',
      typ: q && q.typ ? q.typ : '',
      introRemaining: this.phase === 'intro' ? Math.max(0, this.introEndsAt - Date.now()) : 0,
      remaining: this.phase === 'question' ? Math.max(0, q.time * 1000 - (Date.now() - this.questionStartedAt)) : 0,
    };
    if (p) {
      state.name = p.name;
      state.score = p.score;
      state.answered = p.answer !== null;
      state.zekerVraag = this.phase === 'question' && this.zekerheid && p.answer !== null && !p.zeker;
      state.zeker = p.zeker;
      if (this.phase === 'podium') state.zekerTel = p.zekerTel || null;
      state.rank = ranking.findIndex(r => r.id === playerId) + 1;
      if (this.phase === 'reveal') {
        state.correct = p.answer === q.correct;
        if (q.typ === 'getal') {
          state.getypt = p.getypt || '';
          state.juist = q.answers[q.correct];
        }
        state.points = p.lastPoints;
        state.streak = p.streak;
      }
    }
    return state;
  }

  broadcast() {
    this.io.to('host').emit('state', this.hostState());
    for (const [id, p] of this.players) {
      this.io.to(p.socketId).emit('state', this.playerState(id));
    }
  }
}

module.exports = { Game };
