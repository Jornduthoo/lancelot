// Neon Duel: de klas in twee teams, en op het bord vechten twee grote ridders zoals in Street Fighter.
// Elk goed antwoord is een slag van de ridder van jouw team. Snel juist = combo, drie op rij = supermove.
// Elk goed antwoord vult ook de gedeelde energiebalk van het team: vol = NEON OVERDRIVE.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De schade tonen we in punten: een volle levensbalk is 1000.
// Een ronde duurt tot een ridder K.O. gaat of de tijd op is. Wie eerst de meeste rondes wint, wint het duel.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const logboek = require('./logboek');
const { tempoOf, factor } = require('./tempo');
const quizzes = require('./quizzes');

const TICK_MS = 250;
const WRONG_WAIT_MS = 3000;
const FAST_MS = 6000;        // binnen deze tijd juist = combo (bij normaal tempo)
const CHAIN_MS = 2500;       // slagen van het team kort na elkaar: de teller van de combo loopt op
const INTRO_MS = 4200;       // "Ronde 1 … FIGHT!"
const KO_MS = 5000;
const STRIKES = 12;          // gewone slagen per leerling voor een K.O., bij normaal tempo (combo's en supermoves gaan sneller)
const ENERGY_STRIKES = 6;    // goede antwoorden per leerling om de teambalk te vullen
const OVERDRIVE_DMG = 16;
const MULT = { slag: 1, combo: 1.5, super: 3 };
const TEAMS = ['Team Bliksem', 'Team Vuur'];

class NeonDuel {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearInterval(this.ticker);
    clearTimeout(this.stageTimer);
    this.ticker = null;
    this.stageTimer = null;
    this.flushLog();
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.bestOf = 3;
    this.roundSec = 120;
    this.tempo = 'normaal';
    this.round = 0;
    this.stage = 'intro'; // intro -> fight -> ko
    this.stageUntil = 0;
    this.roundEnds = 0;
    this.hp = [100, 100];
    this.energy = [0, 0];
    this.wins = [0, 0];
    this.chain = [0, 0];
    this.lastStrike = [0, 0];
    this.champions = ['', ''];
    this.championsUsed = [new Set(), new Set()];
    this.roundWinner = -1;
    this.winner = -1;
    this.history = [];
    this.feed = [];
    this.log = [];
    this.lastFlush = 0;
    this.resultsFile = null;
    this.nextN = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, bestOf, roundSec, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.bestOf = [1, 3, 5].includes(bestOf) ? bestOf : 3;
    this.roundSec = [30, 45, 60, 90, 120, 180].includes(roundSec) ? roundSec : 120;
    this.tempo = tempoOf(tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  teamSize(t) {
    let n = 0;
    for (const p of this.players.values()) if (p.team === t) n++;
    return n;
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het duel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const a = this.teamSize(0), b = this.teamSize(1);
    const team = a === b ? Math.floor(Math.random() * 2) : (a < b ? 0 : 1);
    this.players.set(playerId, {
      n: this.nextN++, name: clean, socketId, team,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, dmg: 0, supers: 0, combos: 0,
      question: null, askedAt: 0, order: [], last: null, waitUntil: 0,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('nd-kicked');
    this.broadcast();
  }

  // De leerkracht zet een leerling in het andere team (alleen in de lobby).
  swap(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'lobby') return;
    p.team = 1 - p.team;
    this.broadcast();
  }

  // Willekeurig verdelen, zodat de teams even groot zijn.
  shuffle() {
    if (this.phase !== 'lobby') return;
    const list = [...this.players.values()].sort(() => Math.random() - .5);
    list.forEach((p, i) => { p.team = i % 2; });
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby') return { error: 'Er is geen lobby.' };
    if (!this.teamSize(0) || !this.teamSize(1)) return { error: 'Elk team heeft minstens één ridder nodig.' };
    this.phase = 'play';
    this.wins = [0, 0];
    this.round = 0;
    this.history = [];
    this.addFeed('⚔️ Het Neon Duel begint!');
    this.nextRound();
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    return { ok: true };
  }

  // Voor elke ronde vecht een andere ridder uit elk team (met zijn eigen ridder op het bord).
  pickChampion(t) {
    const team = [...this.players.values()].filter(p => p.team === t);
    if (!team.length) return '';
    let pool = team.filter(p => !this.championsUsed[t].has(p.name));
    if (!pool.length) {
      this.championsUsed[t].clear();
      pool = team;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.championsUsed[t].add(pick.name);
    return pick.name;
  }

  nextRound() {
    const now = Date.now();
    this.round++;
    this.hp = [100, 100];
    this.chain = [0, 0];
    this.roundWinner = -1;
    this.champions = [this.pickChampion(0), this.pickChampion(1)];
    this.stage = 'intro';
    this.stageUntil = now + INTRO_MS;
    this.roundEnds = this.stageUntil + this.roundSec * 1000;
    clearTimeout(this.stageTimer);
    this.stageTimer = setTimeout(() => {
      this.stage = 'fight';
      this.broadcast();
    }, INTRO_MS);
    this.broadcast();
  }

  // De ronde is voorbij: een K.O. of de tijd is op.
  endRound(winner, why) {
    if (this.stage !== 'fight') return;
    const now = Date.now();
    this.stage = 'ko';
    this.roundWinner = winner;
    this.stageUntil = now + KO_MS;
    if (winner >= 0) this.wins[winner]++;
    this.history.push({ round: this.round, winner, why, hp: [...this.hp] });
    this.addFeed(winner >= 0 ? `🏆 ${TEAMS[winner]} wint ronde ${this.round}${why === 'ko' ? ' met een K.O.!' : ''}` : `🤝 Ronde ${this.round}: gelijkspel`);
    const need = Math.ceil(this.bestOf / 2);
    const done = this.wins[0] >= need || this.wins[1] >= need || this.round >= this.bestOf + 2;
    clearTimeout(this.stageTimer);
    this.stageTimer = setTimeout(() => (done ? this.finish() : this.nextRound()), KO_MS);
    this.broadcast();
  }

  // ---------- Vragen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het duel loopt niet.' };
    if (now < p.waitUntil) return { error: 'Even wachten.', wait: p.waitUntil - now };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
      p.askedAt = now;
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, streak: p.streak, fastMs: this.fastMs };
  }

  get fastMs() {
    return Math.round(FAST_MS * Math.sqrt(factor(this.tempo)));
  }

  // Hoeveel schade één slag doet: een groter team slaat vaker, dus elke slag doet iets minder.
  baseDamage(team) {
    const per = STRIKES / factor(this.tempo);
    return 100 / (per * Math.max(1, this.teamSize(team)));
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const now = Date.now();
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Neon Duel', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    const fast = now - p.askedAt <= this.fastMs;
    p.question = null;
    if (!correct) {
      p.wrong++;
      p.streak = 0;
      p.waitUntil = now + WRONG_WAIT_MS;
      // Niet meteen opnieuw, maar wel binnen een paar vragen.
      p.order.splice(Math.min(2, p.order.length), 0, p.last);
      return { correct, right: q.correct, wait: WRONG_WAIT_MS, streak: 0 };
    }
    p.right++;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    const kind = p.streak % 3 === 0 ? 'super' : (fast ? 'combo' : 'slag');
    const out = { correct, right: q.correct, kind, streak: p.streak, dmg: 0 };
    const t = p.team;
    // Elk goed antwoord vult de teambalk, ook tussen de rondes door.
    this.energy[t] = Math.min(100, this.energy[t] + 100 / ((ENERGY_STRIKES / factor(this.tempo)) * Math.max(1, this.teamSize(t))));
    if (this.stage !== 'fight') {
      out.pause = true;
      return out;
    }
    if (kind === 'super') p.supers++;
    if (kind === 'combo') p.combos++;
    this.chain[t] = now - this.lastStrike[t] <= CHAIN_MS ? this.chain[t] + 1 : 1;
    this.lastStrike[t] = now;
    const dmg = this.baseDamage(t) * MULT[kind] * (1 + .04 * Math.min(10, this.chain[t] - 1));
    out.dmg = this.strike(t, kind, dmg, p);
    if (kind === 'super') this.addFeed(`💥 SUPERMOVE van ${p.name}!`);
    if (this.energy[t] >= 100 && this.stage === 'fight') {
      this.energy[t] = 0;
      this.strike(t, 'overdrive', OVERDRIVE_DMG, null);
      this.addFeed(`⚡ NEON OVERDRIVE voor ${TEAMS[t]}!`);
      out.overdrive = true;
    }
    return out;
  }

  strike(t, kind, dmg, p) {
    const o = 1 - t;
    const real = Math.min(this.hp[o], dmg);
    this.hp[o] = Math.max(0, this.hp[o] - dmg);
    if (p) p.dmg += real;
    this.io.to('host').emit('nd-hit', {
      team: t, kind, dmg: Math.round(real * 10), name: p ? p.name : '', chain: this.chain[t],
      hp: this.hp, energy: this.energy,
    });
    if (this.hp[o] <= 0) this.endRound(t, 'ko');
    return Math.round(real * 10);
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    if (this.stage === 'fight' && now >= this.roundEnds) {
      const w = this.hp[0] === this.hp[1] ? -1 : (this.hp[0] > this.hp[1] ? 0 : 1);
      this.endRound(w, 'tijd');
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    const msg = this.live();
    this.io.to('host').emit('nd-tick', { ...msg, ranking: this.ranking(), feed: this.feed });
    for (const p of this.players.values()) this.io.to(p.socketId).emit('nd-tick', msg);
  }

  live() {
    const r = x => Math.round(x * 10) / 10;
    return { hp: this.hp.map(r), energy: this.energy.map(r), chain: this.chain, stage: this.stage, now: Date.now() };
  }

  flushLog() {
    this.lastFlush = Date.now();
    if (!this.log || !this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.stageTimer);
    this.ticker = null;
    this.phase = 'einde';
    // Nog midden in een ronde gestopt? Dan telt de stand van die ronde niet.
    this.winner = this.wins[0] === this.wins[1] ? -1 : (this.wins[0] > this.wins[1] ? 0 : 1);
    this.flushLog();
    this.addFeed(this.winner >= 0 ? `👑 ${TEAMS[this.winner]} wint het Neon Duel!` : '🤝 Het Neon Duel eindigt gelijk');
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten bewaren mislukt:', err.message);
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
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, team: p.team, dmg: Math.round(p.dmg * 10), supers: p.supers, combos: p.combos,
        right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.dmg - a.dmg || b.right - a.right);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      bestOf: this.bestOf, roundSec: this.roundSec, now: Date.now(), teams: TEAMS, sizes: [this.teamSize(0), this.teamSize(1)],
      round: this.round, stage: this.stage, stageUntil: this.stageUntil, roundEnds: this.roundEnds, roundWinner: this.roundWinner,
      wins: this.wins, champions: this.champions, winner: this.winner, ...this.live(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, history: this.history, resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      const mine = ranking.filter(r => r.team === p.team);
      Object.assign(state, {
        name: p.name, team: p.team, right: p.right, wrong: p.wrong, dmg: Math.round(p.dmg * 10), supers: p.supers,
        streak: p.streak, rank: mine.findIndex(r => r.n === p.n) + 1, teamCount: mine.length,
      });
    }
    return state;
  }

  broadcast() {
    this.io.to('host').emit('nd-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('nd-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('nd-state', this.base());
  }
}

module.exports = { NeonDuel, TEAMS };
