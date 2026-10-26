// Schattenjacht: elke leerling beantwoordt op eigen tempo vragen en verdient goud.
// Met dat goud koop je upgrades in de schatkamer. Wie na de speeltijd het meeste goud heeft, wint.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const logboek = require('./logboek');
const quizzes = require('./quizzes');

// Upgrades: per niveau de waarde en de prijs om dat niveau te kopen (niveau 0 is gratis).
const UPGRADES = {
  zwaard: { name: 'Scherper zwaard', what: 'goud per goed antwoord', values: [10, 25, 60, 150, 400], costs: [0, 100, 450, 1800, 7000] },
  reeks: { name: 'Kroon van de reeks', what: 'extra goud per antwoord op rij', values: [0, 4, 12, 35, 90], costs: [0, 80, 400, 1600, 6000] },
  schild: { name: 'Drakenschild', what: 'goud kwijt bij een fout', values: [50, 30, 15, 5, 0], costs: [0, 60, 300, 1200, 4500] },
};
// Power-up: een tijdje dubbel goud.
const DUBBEL = { name: 'Gouden dubbelaar', answers: 6, cost: count => 250 + count * 250 };

class Schat {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearTimeout(this.pending);
    this.pending = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 8;
    this.startedAt = 0;
    this.endsAt = 0;
    this.feed = [];
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 5, 8, 10, 12, 15].includes(minutes) ? minutes : 8;
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
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, {
      name: clean, socketId, gold: 0, earned: 0, streak: 0, bestStreak: 0, right: 0, wrong: 0,
      levels: { zwaard: 0, reeks: 0, schild: 0 }, dubbel: 0, dubbels: 0, question: null, order: [], last: null,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('sj-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'play';
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.broadcast();
  }

  playing(p) {
    return p && this.phase === 'play' && Date.now() >= this.startedAt;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'Het spel loopt niet.' };
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
    if (!this.playing(p) || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    logboek.answer('Schattenjacht', this.quiz.title, p.name, q, choice === q.correct);
    p.last = p.question;
    p.question = null;
    const base = UPGRADES.zwaard.values[p.levels.zwaard];
    let change;
    if (choice === q.correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      change = base + UPGRADES.reeks.values[p.levels.reeks] * (Math.min(p.streak, 10) - 1);
      if (p.dubbel > 0) {
        change *= 2;
        p.dubbel--;
      }
      p.earned += change;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
      change = -Math.min(p.gold, Math.round((base * UPGRADES.schild.values[p.levels.schild]) / 100));
    }
    p.gold += change;
    this.changed();
    return { correct: choice === q.correct, right: q.correct, change, ...this.wallet(p) };
  }

  buy(playerId, item) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'Het spel loopt niet.' };
    let cost;
    let label;
    if (item === 'dubbel') {
      cost = DUBBEL.cost(p.dubbels);
      if (p.gold < cost) return { error: 'Niet genoeg goud.' };
      p.dubbels++;
      p.dubbel += DUBBEL.answers;
      label = DUBBEL.name;
    } else {
      const up = UPGRADES[item];
      if (!up) return { error: 'Onbekende upgrade.' };
      const next = p.levels[item] + 1;
      if (next >= up.values.length) return { error: 'Dit is al het hoogste niveau.' };
      cost = up.costs[next];
      if (p.gold < cost) return { error: 'Niet genoeg goud.' };
      p.levels[item] = next;
      label = `${up.name} (niveau ${next + 1})`;
    }
    p.gold -= cost;
    this.addFeed(`🛒 ${p.name} koopt ${label}`);
    this.changed();
    return { ok: true, ...this.wallet(p) };
  }

  // Wat de leerling heeft en wat de winkel nu kost.
  wallet(p) {
    return { gold: p.gold, streak: p.streak, levels: p.levels, dubbel: p.dubbel, dubbelCost: DUBBEL.cost(p.dubbels) };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
    this.phase = 'einde';
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'play') this.finish();
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
      .map(([id, p]) => ({ id, name: p.name, gold: p.gold, earned: p.earned, right: p.right, wrong: p.wrong, streak: p.streak, bestStreak: p.bestStreak, levels: p.levels }))
      .sort((a, b) => b.gold - a.gold);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
      shop: { upgrades: UPGRADES, dubbel: { name: DUBBEL.name, answers: DUBBEL.answers } },
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, { name: p.name, ...this.wallet(p), rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length });
    }
    return state;
  }

  // Het bord en de rangen niet bij elk antwoord apart bijwerken, maar hooguit vijf keer per seconde.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('sj-state', this.hostState());
      const ranking = this.ranking();
      ranking.forEach((r, i) => {
        const p = this.players.get(r.id);
        this.io.to(p.socketId).emit('sj-rank', { rank: i + 1, players: ranking.length });
      });
    }, 200);
  }

  broadcast() {
    this.io.to('host').emit('sj-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('sj-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('sj-state', this.base());
  }
}

module.exports = { Schat, UPGRADES, DUBBEL };
