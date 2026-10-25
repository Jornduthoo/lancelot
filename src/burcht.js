// Burchtbouwers: de hele klas bouwt samen één burcht. Elk goed antwoord levert stenen op, en de leerling
// kiest zelf op welk deel van de burcht ze komen. Als de tijd om is, valt de draak aan: elk deel moet
// hoog genoeg zijn om zijn vuur te doorstaan. De burcht houdt stand als hooguit één deel valt.
// Een samenwerkingsspel: niemand wint alleen, en elke steen telt.
const logboek = require('./logboek');
const quizzes = require('./quizzes');
const PARTS = [
  { key: 'toren-w', name: 'Westertoren', kind: 'toren' },
  { key: 'muur-w', name: 'Westmuur', kind: 'muur' },
  { key: 'poort', name: 'Poort', kind: 'poort' },
  { key: 'donjon', name: 'Donjon', kind: 'donjon' },
  { key: 'muur-o', name: 'Oostmuur', kind: 'muur' },
  { key: 'toren-o', name: 'Oostertoren', kind: 'toren' },
];
// Hoeveel goede antwoorden per leerling per minuut we verwachten, en welk deel daarvan de draak vraagt.
const PACE = 2.4;
const LEVELS = { makkelijk: .45, normaal: .6, moeilijk: .75 };
const STEP_MS = 1800;      // de draak valt elk deel apart aan
const DRAGON_LEAD_MS = 2500;
const MAX_FALLEN = 1;

class Burcht {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearTimeout(this.dragonTimer);
    clearTimeout(this.pending);
    this.pending = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> bouwen -> draak -> einde
    this.players = new Map();
    this.minutes = 6;
    this.level = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.need = 0;
    this.parts = PARTS.map(p => ({ ...p, stones: [] }));
    this.attack = null;
    this.held = null;
    this.feed = [];
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, level) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10, 12].includes(minutes) ? minutes : 6;
    this.level = LEVELS[level] ? level : 'normaal';
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    if (this.phase !== 'lobby' && this.phase !== 'bouwen') return { error: 'Het spel is bijna voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, {
      name: clean, socketId, color: this.players.size % 10, hand: 0, placed: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
      perPart: {}, question: null, order: [], last: null,
    });
    // Wie te laat binnenkomt, maakt de draak niet sterker: de lat ligt vast bij de start.
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('bb-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'bouwen';
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    const total = this.players.size * this.minutes * PACE * LEVELS[this.level];
    this.need = Math.max(3, Math.round(total / PARTS.length));
    this.endTimer = setTimeout(() => this.dragon(), this.endsAt - Date.now());
    this.addFeed('🧱 De bouw begint! De draak komt over ' + (this.minutes === 1 ? '1 minuut.' : this.minutes + ' minuten.'));
    this.broadcast();
  }

  building(p) {
    return p && this.phase === 'bouwen' && Date.now() >= this.startedAt;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!this.building(p)) return { error: 'Er wordt nu niet gebouwd.' };
    if (p.hand > 0) return { place: p.hand };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, number: p.right + p.wrong + 1 };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!this.building(p) || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    p.last = p.question;
    p.question = null;
    const correct = choice === q.correct;
    logboek.answer('Burchtbouwers', this.quiz.title, p.name, q, correct);
    let gained = 0;
    if (correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      gained = p.streak >= 3 ? 2 : 1;
      p.hand += gained;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
    }
    this.changed();
    return { correct, right: q.correct, gained, hand: p.hand, streak: p.streak, parts: this.partView() };
  }

  // De stenen in je hand op een deel van de burcht leggen.
  place(playerId, index) {
    const p = this.players.get(playerId);
    const part = this.parts[index];
    if (!this.building(p) || !part) return { error: 'Je kan nu niet bouwen.' };
    if (p.hand <= 0) return { error: 'Je hebt geen stenen. Beantwoord eerst een vraag.' };
    const n = p.hand;
    p.hand = 0;
    p.placed += n;
    p.perPart[part.key] = (p.perPart[part.key] || 0) + n;
    for (let i = 0; i < n; i++) part.stones.push(p.color);
    const height = part.stones.length;
    if (height === this.need) this.addFeed(`✅ ${part.name} is sterk genoeg voor de draak!`);
    this.changed();
    return { ok: true, placed: n, parts: this.partView() };
  }

  partView() {
    return this.parts.map(p => ({ key: p.key, name: p.name, kind: p.kind, height: p.stones.length }));
  }

  // De draak valt aan: deel per deel, van links naar rechts.
  dragon() {
    if (this.phase !== 'bouwen') return;
    clearTimeout(this.endTimer);
    this.phase = 'draak';
    for (const p of this.players.values()) {
      p.question = null;
      p.hand = 0;
    }
    const results = this.parts.map(part => ({ key: part.key, name: part.name, height: part.stones.length, held: part.stones.length >= this.need }));
    const fallen = results.filter(r => !r.held).length;
    this.held = fallen <= MAX_FALLEN;
    this.attack = { at: Date.now() + DRAGON_LEAD_MS, step: STEP_MS, results, fallen };
    this.addFeed('🐉 De draak valt aan!');
    this.broadcast();
    this.dragonTimer = setTimeout(() => this.finish(), DRAGON_LEAD_MS + STEP_MS * PARTS.length + 2500);
  }

  finish() {
    if (this.phase === 'bouwen') return this.dragon();
    if (this.phase !== 'draak') return;
    clearTimeout(this.dragonTimer);
    this.phase = 'einde';
    this.addFeed(this.held ? '🏰 De burcht houdt stand!' : '🔥 De burcht is gevallen...');
    try {
      this.resultsFile = this.onFinish(this);
    } catch (err) {
      console.error('Resultaten bewaren mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'bouwen' || this.phase === 'draak') {
      if (this.phase === 'bouwen') this.dragon();
      this.finish();
    }
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => {
        const fav = Object.entries(p.perPart).sort((a, b) => b[1] - a[1])[0];
        return {
          id, name: p.name, color: p.color, placed: p.placed, right: p.right, wrong: p.wrong, streak: p.streak, bestStreak: p.bestStreak,
          favorite: fav ? PARTS.find(x => x.key === fav[0]).name : '',
        };
      })
      .sort((a, b) => b.placed - a.placed || b.right - a.right);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, level: this.level,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, need: this.need,
      parts: this.partView(), attack: this.attack, held: this.held, maxFallen: MAX_FALLEN,
    };
  }

  hostState() {
    return {
      ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile,
      stones: this.parts.map(p => p.stones),
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      Object.assign(state, {
        name: p.name, color: p.color, hand: p.hand, placed: p.placed, right: p.right, streak: p.streak,
        players: this.players.size,
      });
    }
    return state;
  }

  // Het bord en de leerlingen hooguit vijf keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('bb-state', this.hostState());
      const msg = { parts: this.partView(), need: this.need };
      for (const p of this.players.values()) this.io.to(p.socketId).emit('bb-tick', msg);
    }, 200);
  }

  broadcast() {
    this.io.to('host').emit('bb-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('bb-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('bb-state', this.base());
  }
}

module.exports = { Burcht, PARTS };
