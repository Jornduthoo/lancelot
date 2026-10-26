// Neonvlucht: iedereen rent op zijn eigen scherm door dezelfde neonburcht, over drie banen.
// Springen, glijden en opzij gaan voor hindernissen. Af en toe komt er een vraag: de banen worden poorten met een antwoord.
// Loop door de juiste poort: turbo, een schild en een hogere vermenigvuldiger (tot ×5). Foute poort: struikelen en de vermenigvuldiger valt terug.
// Tegen gokken: na een fout antwoord even wachten tot de volgende vraagpoort, en die vraag komt later terug.
// De leerling rent zelf (geen vertraging); de server houdt de afstand, de munten en de punten bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/nv-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 200;

class Neonvlucht {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    if (this.vragen) this.vragen.flush();
    this.vragen = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 4;
    this.tempo = 'normaal';
    this.seed = 1;
    this.startedAt = 0;
    this.endsAt = 0;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.lastRank = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 4;
    this.tempo = tempoOf(tempo);
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.vragen = new Vragen(quiz, 'Neonvlucht', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = true;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const n = this.players.size ? Math.max(...[...this.players.values()].map(p => p.n)) + 1 : 0;
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      z: 0, lane: 1, coins: 0, dist: 0, score: 0, crashes: 0, flags: 0, posAt: 0, gates: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, shown: null, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('nv-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.posAt = this.startedAt;
    this.addFeed('⚡ De neonpoorten gaan open. Rennen!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  mult(p) {
    return 1 + Math.min(World.MAX_MULT - 1, p.streak);
  }

  // De leerling meldt waar hij is. We laten niet meer afstand toe dan je met turbo kan lopen, en de punten rekenen we zelf.
  pos(playerId, { z, lane, coins, crash, flags } = {}) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return;
    if (!Number.isFinite(z)) return;
    const dt = Math.max(.05, (now - p.posAt) / 1000);
    p.posAt = now;
    const max = World.speed(1) * World.TURBO.mult * dt * 1.5 + 4;
    const dz = Math.max(0, Math.min(max, z - p.z));
    p.z += dz;
    p.score += dz * this.mult(p);
    if ([0, 1, 2].includes(lane)) p.lane = lane;
    if (Number.isInteger(coins) && coins > p.coins) p.coins = Math.min(p.coins + 25, coins);
    if (crash) p.crashes++;
    p.flags = Number(flags) & 7;
  }

  // Een vraag met hooguit drie antwoorden (er zijn maar drie banen): het juiste antwoord zit er altijd bij.
  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    const q = this.quiz.questions[p.question];
    if (!p.shown || p.shownFor !== p.question) {
      const wrong = q.answers.map((_, i) => i).filter(i => i !== q.correct).sort(() => Math.random() - .5);
      p.shown = [q.correct, ...wrong.slice(0, 2)].sort(() => Math.random() - .5);
      p.shownFor = p.question;
    }
    return { question: res.question, answers: p.shown.map(i => q.answers[i]), mult: this.mult(p) };
  }

  // choice is de baan (0, 1, 2) waar je door de poort liep. Juist: turbo, schild en ×+1. Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || !p.shown) return { error: 'Er staat geen vraag open.' };
    const original = p.shown[Number(choice)];
    if (original === undefined) return { error: 'Geen geldige poort.' };
    const shown = p.shown;
    const res = this.vragen.answer(p, original);
    if (!res) return { error: 'Er staat geen vraag open.' };
    p.shown = null;
    p.gates++;
    let bonus = 0;
    if (res.correct) {
      bonus = Math.round(40 * factor(this.tempo));
      p.score += bonus * this.mult(p);
      if (p.streak === 4) this.addFeed(`⚡ ${p.name} rent met ×${World.MAX_MULT}!`, false);
      if (p.streak === 8) this.addFeed(`🧠 ${p.name} heeft 8 poorten op rij juist`, false);
    }
    p.dirty = true;
    return { correct: res.correct, right: shown.indexOf(res.right), wait: res.wait, mult: this.mult(p), streak: p.streak, bonus };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint de Neonvlucht!`);
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

  save() {
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.dist, p.coins, p.crashes, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`neonvlucht-${this.quiz.title}`, [['Neonvlucht', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Meter', 'Munten', 'Gestruikeld', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.score + p.coins * 10), dist: Math.round(p.z), coins: p.coins, crashes: p.crashes,
        mult: this.mult(p), bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.dist - a.dist);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, seed: this.seed,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    return { n: p.n, score: r.score || 0, mult: this.mult(p), coins: p.coins, dist: Math.round(p.z), rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, z: p.z });
    return state;
  }

  // Iedereen krijgt de plek van iedereen: [n, afstand, baan, vermenigvuldiger, vlaggen, munten]. Vlaggen: 1 turbo, 2 struikelt, 4 springt.
  send(now) {
    const msg = { r: [...this.players.values()].map(p => [p.n, Math.round(p.z * 10) / 10, p.lane, this.mult(p), p.flags, p.coins]) };
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('nv-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('nv-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('nv-tick', { ...msg, me: this.me(p, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('nv-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('nv-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('nv-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('nv-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('nv-state', this.hostState());
    socket.on('nv-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('vlucht');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('nv-start', () => this.start());
    socket.on('nv-kick', id => this.kick(id));
    socket.on('nv-finish', () => this.finish());
    socket.on('nv-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('nv-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('nv-state', this.base());
    socket.on('nv-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.nvId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('nv-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.nvId ? fn(socket.data.nvId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('nv-pos', (id, m) => this.pos(id, m || {}));
    on('nv-question', id => guard.question(id));
    on('nv-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Neonvlucht };
