// Spelstatus van één live quiz. Er draait altijd hooguit één spel tegelijk.
// Fases: idle -> lobby -> question -> reveal -> (question ...) -> podium

const MAX_POINTS = 1000;

class Game {
  constructor(io) {
    this.io = io;
    this.reset();
  }

  reset() {
    this.quiz = null;
    this.phase = 'idle';
    this.index = -1;
    this.players = new Map(); // playerId -> { name, score, streak, answer, answeredAt, socketId }
    this.questionStartedAt = 0;
    clearTimeout(this.timer);
    this.timer = null;
  }

  load(quiz) {
    this.reset();
    this.quiz = quiz;
    this.phase = 'lobby';
    this.io.to('players').emit('reset', { open: true });
    this.broadcast();
  }

  get question() {
    return this.quiz && this.quiz.questions[this.index];
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
    this.players.set(playerId, { name: clean, score: 0, streak: 0, answer: null, answeredAt: 0, socketId });
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
      this.broadcast();
      return;
    }
    this.index++;
    for (const p of this.players.values()) {
      p.answer = null;
      p.answeredAt = 0;
    }
    this.phase = 'question';
    this.questionStartedAt = Date.now();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reveal(), this.question.time * 1000);
    this.broadcast();
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    const q = this.question;
    if (!p || this.phase !== 'question' || p.answer !== null) return;
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.answers.length) return;
    p.answer = choice;
    p.answeredAt = Date.now() - this.questionStartedAt;
    if ([...this.players.values()].every(pl => pl.answer !== null)) {
      this.reveal();
    } else {
      this.broadcast();
    }
  }

  reveal() {
    if (this.phase !== 'question') return;
    clearTimeout(this.timer);
    const q = this.question;
    const limit = q.time * 1000;
    for (const p of this.players.values()) {
      if (p.answer === q.correct) {
        // Snel antwoorden levert meer op: tussen 500 en 1000 punten.
        const speed = Math.min(p.answeredAt / limit, 1);
        p.lastPoints = Math.round(MAX_POINTS * (1 - speed / 2));
        p.streak++;
      } else {
        p.lastPoints = 0;
        p.streak = 0;
      }
      p.score += p.lastPoints;
    }
    this.phase = 'reveal';
    this.broadcast();
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({ id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  // Volledige status voor het docentenscherm.
  hostState() {
    const q = this.question;
    const players = [...this.players.values()];
    return {
      phase: this.phase,
      title: this.quiz && this.quiz.title,
      index: this.index,
      total: this.quiz ? this.quiz.questions.length : 0,
      question: q ? { question: q.question, answers: q.answers, time: q.time } : null,
      correct: this.phase === 'reveal' ? q.correct : null,
      remaining: this.phase === 'question' ? Math.max(0, q.time * 1000 - (Date.now() - this.questionStartedAt)) : 0,
      answered: players.filter(p => p.answer !== null).length,
      counts: q ? q.answers.map((_, i) => players.filter(p => p.answer === i).length) : [],
      ranking: this.ranking(),
    };
  }

  // Status voor één leerling: geen vraagtekst nodig (die staat op het bord), wel eigen resultaat.
  playerState(playerId) {
    const p = this.players.get(playerId);
    const q = this.question;
    const ranking = this.ranking();
    const state = {
      phase: this.phase,
      index: this.index,
      total: this.quiz ? this.quiz.questions.length : 0,
      answerCount: q ? q.answers.length : 0,
      answers: q ? q.answers : [],
      remaining: this.phase === 'question' ? Math.max(0, q.time * 1000 - (Date.now() - this.questionStartedAt)) : 0,
    };
    if (p) {
      state.name = p.name;
      state.score = p.score;
      state.answered = p.answer !== null;
      state.rank = ranking.findIndex(r => r.id === playerId) + 1;
      if (this.phase === 'reveal') {
        state.correct = p.answer === q.correct;
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
