// De prinses in de toren: iedereen klimt in dezelfde toren. Springen kost energie,
// een goed antwoord op een quizvraag geeft nieuwe energie. De bewegingen gebeuren op de gsm;
// de server houdt de energie, de vragen en de hoogtes bij en stuurt iedereen elkaars positie.
const world = require('../public/js/toren-world');
const { tempoOf, factor } = require('./tempo');
const logboek = require('./logboek');

const START_ENERGY = 8;
const MAX_ENERGY = 20;
const GOOD_ENERGY = 5;
const BAD_ENERGY = 1;
const TICK_MS = 100;

class Toren {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 6;
    this.seed = 0;
    this.world = null;
    this.startedAt = 0;
    this.endsAt = 0;
    this.feed = [];
    this.resultsFile = null;
    this.dirty = false;
  }

  get active() {
    return this.phase !== 'idle';
  }

  // Energie voor een goed antwoord, volgens het tempo dat de leerkracht koos.
  good() {
    return Math.max(2, Math.round(GOOD_ENERGY * factor(this.tempo)));
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.tempo = tempoOf(tempo);
    this.minutes = [3, 5, 6, 8, 10, 15].includes(minutes) ? minutes : 6;
    this.seed = Math.floor(Math.random() * 2 ** 31);
    this.world = world.build(this.seed);
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
      name: clean, socketId, color: this.players.size % 8,
      x: world.W / 2 - 13, y: 0, face: 1, act: 0, best: 0, energy: START_ENERGY,
      right: 0, wrong: 0, jumps: 0, rescuedAt: 0, question: null, order: [], hits: 0,
    });
    this.addFeed(`${clean} betreedt de toren`);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('tw-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'play';
    // Eerst drie seconden aftellen, dan begint de klok.
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    // Posities van iedereen tien keer per seconde doorsturen, als er iets veranderd is.
    this.ticker = setInterval(() => this.sendWorld(), TICK_MS);
    this.broadcast();
  }

  // Een sprong kost een energiepunt. Zonder energie geen sprong.
  jump(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.energy <= 0) return { energy: p ? p.energy : 0 };
    p.energy--;
    p.jumps++;
    this.dirty = true;
    return { energy: p.energy };
  }

  // Positie van de gsm. Alleen ruwe grenzen: het blijft een klasspel.
  move(playerId, { x, y, face, act } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    p.x = Math.max(-10, Math.min(world.W, x));
    p.y = Math.max(0, Math.min(this.world.top + 10, y));
    p.face = face === -1 ? -1 : 1;
    p.act = Number.isInteger(act) ? act : 0;
    if (p.y > p.best) p.best = p.y;
    if (!p.rescuedAt && p.y >= this.world.top - 1) {
      p.rescuedAt = Date.now();
      const first = [...this.players.values()].filter(o => o.rescuedAt).length === 1;
      this.addFeed(first ? `👑 ${p.name} redt als eerste de prinses!` : `👑 ${p.name} bereikt de prinses`);
      this.io.to('players').to('host').emit('tw-rescued', { name: p.name, first });
      this.broadcast();
      if ([...this.players.values()].every(o => o.rescuedAt)) this.finish();
    }
    this.dirty = true;
  }

  // De ridder raakte een laser, drone of stekels.
  hit(playerId, what) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    p.hits++;
    const names = { laser: 'een laser', drone: 'een drone', spikes: 'de stekels' };
    if (names[what]) this.addFeed(`💥 ${p.name} raakt ${names[what]}`);
  }

  // Volgende vraag voor deze leerling, in een eigen willekeurige volgorde.
  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = this.quiz.questions.map((_, i) => i).sort(() => Math.random() - .5);
        // Niet twee keer na elkaar dezelfde vraag.
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    logboek.answer('De prinses in de toren', this.quiz.title, p.name, q, correct);
    p.last = p.question;
    p.question = null;
    if (correct) {
      p.right++;
      p.energy = Math.min(MAX_ENERGY, p.energy + this.good());
      if (p.right % 5 === 0) this.addFeed(`⚡ ${p.name} heeft al ${p.right} vragen goed`);
    } else {
      p.wrong++;
      p.energy = Math.min(MAX_ENERGY, p.energy + BAD_ENERGY);
    }
    this.dirty = true;
    return { correct, right: q.correct, gained: correct ? this.good() : BAD_ENERGY, energy: p.energy };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
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
    this.dirty = true;
  }

  // Wie de prinses redde staat bovenaan (de snelste eerst), daarna wie het hoogst kwam.
  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, name: p.name, color: p.color, floor: world.floorAt(this.world, p.best), best: Math.round(p.best),
        energy: p.energy, right: p.right, wrong: p.wrong, rescuedAt: p.rescuedAt ? p.rescuedAt - this.startedAt : 0,
      }))
      .sort((a, b) => (a.rescuedAt && b.rescuedAt ? a.rescuedAt - b.rescuedAt : (b.rescuedAt ? 1 : 0) - (a.rescuedAt ? 1 : 0) || b.best - a.best));
  }

  base() {
    return {
      active: this.active,
      run: this.run,
      phase: this.phase,
      title: this.quiz && this.quiz.title,
      seed: this.seed,
      minutes: this.minutes,
      now: Date.now(),
      startedAt: this.startedAt,
      endsAt: this.endsAt,
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
      Object.assign(state, {
        name: p.name, color: p.color, energy: p.energy, x: p.x, y: p.y,
        rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length,
        floor: world.floorAt(this.world, p.best), rescued: !!p.rescuedAt,
      });
    }
    return state;
  }

  // Compacte posities voor iedereen: [id, naam, x, y, kijkrichting, actie, kleur, hoogste punt, gered].
  sendWorld() {
    if (!this.dirty) return;
    this.dirty = false;
    const list = [...this.players.entries()].map(([id, p]) => [id, p.name, Math.round(p.x), Math.round(p.y), p.face, p.act, p.color, Math.round(p.best), p.rescuedAt ? 1 : 0]);
    const payload = { now: Date.now(), players: list };
    this.io.to('players').emit('tw-world', payload);
    this.io.to('host').emit('tw-world', { ...payload, ranking: this.ranking(), feed: this.feed });
  }

  broadcast() {
    this.io.to('host').emit('tw-state', this.hostState());
    const seen = new Set();
    for (const [id, p] of this.players) {
      seen.add(p.socketId);
      this.io.to(p.socketId).emit('tw-state', this.playerState(id));
    }
    // Wie nog niet meedoet, krijgt alleen de algemene status (om te kunnen aanmelden).
    this.io.to('players').except([...seen]).emit('tw-state', this.base());
  }
}

module.exports = { Toren, START_ENERGY, GOOD_ENERGY };
