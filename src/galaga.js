// Cyber-Galaga: elke leerling vliegt op zijn eigen toestel met een jetpack tegen golven cyberdraken.
// Het vliegen en schieten gebeurt helemaal op het toestel zelf (geen vertraging over het netwerk).
// De server beslist over de vragen en de beloningen, houdt de scores bij en beheert de klasbaas:
// op het einde vecht de hele klas samen tegen één reuzendraak met één gedeelde levensbalk.
// Een goed antwoord geeft een beloning naar keuze: dubbele laser, schild of bom. Drie op rij: twee beloningen.
// Tegen gokken: na een fout antwoord raakt je jetpack oververhit (even wachten, het juiste antwoord blijft staan)
// en die vraag komt later terug.
const logboek = require('./logboek');
const { tempoOf, factor } = require('./tempo');
const quizzes = require('./quizzes');

const TICK_MS = 500;
const WRONG_WAIT_MS = 3000;
const MAX_REWARDS = 3;
const MAX_BOMBS = 3;
const LASER_MS = 12000;      // dubbele laser bij normaal tempo
const SHIELD_MS = 20000;
const BOSS_HP_PER_PLAYER = 320; // voor 90 seconden baasgevecht
const BOSS_DPS_CAP = 45;     // meer schade per seconde kan één leerling niet doen
const REWARDS = ['laser', 'schild', 'bom'];

function bossMsFor(minutes) {
  if (minutes <= 1) return 30000;
  if (minutes <= 2) return 45000;
  if (minutes <= 3) return 60000;
  if (minutes <= 5) return 90000;
  return 120000;
}

class Galaga {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    clearTimeout(this.winTimer);
    this.ticker = null;
    this.flushLog();
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 5;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.bossAt = 0;
    this.boss = { on: false, hp: 0, max: 0, down: false, escaped: false };
    this.feed = [];
    this.feedChanged = false;
    this.log = [];
    this.lastFlush = 0;
    this.resultsFile = null;
    this.nextN = 0;
    this.dirty = true;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get laserMs() {
    return Math.round(LASER_MS * factor(this.tempo));
  }

  get shieldMs() {
    return Math.round(SHIELD_MS * factor(this.tempo));
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
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
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, {
      n: this.nextN++, name: clean, socketId, color: this.players.size % 10,
      score: 0, dragons: 0, wave: 1, crashes: 0, bossDmg: 0, lastDmgAt: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, rewards: 0, bombs: 0, used: { laser: 0, schild: 0, bom: 0 },
      question: null, order: [], last: null, waitUntil: 0,
    });
    this.dirty = true;
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('cg-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.bossAt = this.endsAt - bossMsFor(this.minutes);
    this.addFeed('🐉 De cyberdraken komen eraan. Vlieg, ridders!');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Vragen en beloningen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (now < p.waitUntil) return { error: 'Je jetpack koelt nog af.', wait: p.waitUntil - now };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, rewards: p.rewards, max: MAX_REWARDS };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Cyber-Galaga', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    let gained = 0;
    let wait = 0;
    if (correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      gained = p.streak % 3 === 0 ? 2 : 1;
      p.rewards = Math.min(MAX_REWARDS, p.rewards + gained);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
      wait = WRONG_WAIT_MS;
      p.waitUntil = Date.now() + wait;
      // Niet meteen opnieuw, maar wel binnen een paar vragen.
      p.order.splice(Math.min(2, p.order.length), 0, p.question);
    }
    p.question = null;
    this.dirty = true;
    return { correct, right: q.correct, gained, rewards: p.rewards, streak: p.streak, wait };
  }

  // Een beloning kiezen. Het toestel voert ze uit; de server telt mee.
  reward(playerId, kind) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (!REWARDS.includes(kind)) return { error: 'Onbekende beloning.' };
    if (p.rewards <= 0) return { error: 'Beantwoord eerst een vraag.' };
    if (kind === 'bom' && p.bombs >= MAX_BOMBS) return { error: 'Je hebt al drie bommen.' };
    p.rewards--;
    p.used[kind]++;
    if (kind === 'bom') p.bombs++;
    return { ok: true, kind, rewards: p.rewards, bombs: p.bombs, ms: kind === 'laser' ? this.laserMs : kind === 'schild' ? this.shieldMs : 0 };
  }

  bomb(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (p.bombs <= 0) return { error: 'Geen bommen. Beantwoord een vraag!' };
    p.bombs--;
    return { ok: true, bombs: p.bombs };
  }

  // Het toestel meldt zijn stand. Schade aan de baas wordt begrensd, zodat niemand de baas alleen kan verslaan.
  report(playerId, r) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || !r) return;
    const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
    const score = num(r.score, 1e7);
    if (score > p.score) p.score = Math.min(score, p.score + 5000);
    p.dragons = Math.max(p.dragons, num(r.dragons, 1e5));
    const wave = num(r.wave, 999);
    if (wave > p.wave) {
      p.wave = wave;
      if (wave % 5 === 0) this.addFeed(`🚀 ${p.name} haalt golf ${wave}`);
    }
    p.crashes = Math.max(p.crashes, num(r.crashes, 999));
    const dmg = num(r.dmg, 2000);
    const b = this.boss;
    if (dmg && b.on && !b.down && !b.escaped) {
      const now = Date.now();
      const since = Math.min(3000, now - (p.lastDmgAt || now - 1000));
      const allowed = Math.ceil(BOSS_DPS_CAP * since / 1000) + 30;
      const done = Math.min(dmg, allowed, b.hp);
      p.lastDmgAt = now;
      p.bossDmg += done;
      b.hp -= done;
      if (b.hp <= 0) this.bossDown(p);
    }
    this.dirty = true;
  }

  bossDown(p) {
    const b = this.boss;
    b.hp = 0;
    b.down = true;
    this.addFeed(`🏆 De klasbaas is verslagen! ${p.name} gaf de laatste klap.`);
    this.broadcast();
    // Even feest op alle schermen, dan de eindstand.
    this.winTimer = setTimeout(() => this.finish(), 6000);
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const b = this.boss;
    if (!b.on && now >= this.bossAt) {
      b.on = true;
      b.max = Math.round(BOSS_HP_PER_PLAYER * Math.max(1, this.players.size) * (this.endsAt - this.bossAt) / 90000);
      b.hp = b.max;
      this.addFeed('🐲 DE KLASBAAS VERSCHIJNT! Vecht samen!');
      this.broadcast();
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    this.send();
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
    clearTimeout(this.endTimer);
    clearTimeout(this.winTimer);
    this.ticker = null;
    this.phase = 'einde';
    if (this.boss.on && !this.boss.down) {
      this.boss.escaped = true;
      this.addFeed('🐲 De klasbaas is ontsnapt…');
    }
    this.flushLog();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint met ${top.score} punten!`);
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
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: p.score, dragons: p.dragons, wave: p.wave, crashes: p.crashes,
        bossDmg: p.bossDmg, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak, used: p.used,
      }))
      .sort((a, b) => b.score - a.score || b.right - a.right);
  }

  bossView() {
    const b = this.boss;
    return { on: b.on, hp: Math.max(0, Math.round(b.hp)), max: b.max, down: b.down, escaped: b.escaped };
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, bossAt: this.bossAt,
      laserMs: this.laserMs, shieldMs: this.shieldMs, boss: this.bossView(), players: this.players.size,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    return {
      n: p.n, score: p.score, rewards: p.rewards, bombs: p.bombs, wait: Math.max(0, p.waitUntil - Date.now()),
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size, bossDmg: p.bossDmg,
      right: p.right, wrong: p.wrong, dragons: p.dragons, wave: p.wave,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, color: p.color, me: this.me(p, this.ranking()) });
    return state;
  }

  // Twee keer per seconde: de baas, de stand en het nieuws. Het vliegen zelf gaat niet over het netwerk.
  send() {
    const msg = { boss: this.bossView(), now: Date.now() };
    if (this.feedChanged) {
      msg.feed = this.feed;
      this.feedChanged = false;
    }
    if (!this.dirty && !msg.feed && !this.boss.on) return;
    const ranking = this.ranking();
    this.dirty = false;
    this.io.to('host').emit('cg-tick', { ...msg, ranking });
    const top = ranking.slice(0, 5).map(r => [r.name, r.score]);
    for (const p of this.players.values()) this.io.to(p.socketId).emit('cg-tick', { ...msg, top, me: this.me(p, ranking) });
  }

  broadcast() {
    this.io.to('host').emit('cg-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('cg-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('cg-state', this.base());
  }
}

module.exports = { Galaga, bossMsFor };
