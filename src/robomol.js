// Robomol: robotmollen schieten uit de putten van het burchtplein, iedereen slaat ze met zijn zwaard op zijn eigen scherm.
// Iedereen ziet dezelfde mollen op hetzelfde moment (seed). Het bord toont wie welke mol als eerste raakte.
// Je zwaardlading raakt leeg: een juist antwoord laadt hem op en geeft het Vuurzwaard (dubbele punten, je slag raakt ook de buurputten).
// Tegen gokken: na een fout antwoord even wachten, en die vraag komt later terug.
// De server kijkt elke slag na met hetzelfde schema van de mollen en rekent zelf de punten.
const World = require('../public/js/mo-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 250;

class Robomol {
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
    this.minutes = 3;
    this.tempo = 'normaal';
    this.seed = 1;
    this.moles = [];
    this.firstHit = new Map(); // mol-id -> n van wie hem als eerste uitschakelde
    this.bonks = [];
    this.total = 0;
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

  get energyMs() {
    return Math.round(World.ENERGY_MS * factor(this.tempo));
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 3;
    this.tempo = tempoOf(tempo);
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.moles = World.schedule(this.seed, this.minutes * 60000);
    this.vragen = new Vragen(quiz, 'Robomol', this.tempo);
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
    const now = Date.now();
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      score: 0, kills: 0, golds: 0, bombs: 0, misses: 0, combo: 0, bestCombo: 0,
      energyUntil: this.phase === 'play' ? Math.max(now, this.startedAt) + this.energyMs : 0,
      fireUntil: 0, stunUntil: 0, swingAt: 0, hits: new Map(),
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('mo-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.energyUntil = this.startedAt + this.energyMs;
    this.addFeed('⚔️ De putten gaan open. Meppen maar!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // Eén slag op put hole. ids: de mollen die de leerling raakte (in die put, of met het Vuurzwaard ook in de buurputten).
  // Geen ids = mis: je reeks valt terug naar nul.
  swing(playerId, { hole, ids } = {}) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (!Number.isInteger(hole) || hole < 0 || hole > 8) return { error: 'Geen geldige put.' };
    if (now - p.swingAt < World.SWING_MS * .7) return { error: 'Te snel.' };
    p.swingAt = now;
    if (now < p.stunUntil - 250) return { error: 'Verdoofd.', stun: p.stunUntil - now };
    if (now > p.energyUntil + 800) return { error: 'Je zwaard is leeg.', empty: true };
    const t = now - this.startedAt;
    const fire = now <= p.fireUntil + 500;
    const reach = fire ? [hole, ...World.neighbours(hole)] : [hole];
    const out = [];
    for (const id of Array.isArray(ids) ? ids.slice(0, 5) : []) {
      const m = this.moles[id];
      if (!m || !reach.includes(m.hole) || !World.hittable(m, t + 80, World.GRACE)) continue;
      if (m.type === 'bom' && m.hole !== hole) continue; // de vuurslag laat bommen met rust
      const type = World.TYPES[m.type];
      const done = p.hits.get(id) || 0;
      if (done >= type.hp) continue;
      p.hits.set(id, done + 1);
      if (m.type === 'bom') {
        p.score = Math.max(0, p.score + type.pts);
        p.combo = 0;
        p.bombs++;
        p.stunUntil = now + World.STUN_MS;
        out.push({ id, kill: true, pts: type.pts, bom: true });
        this.bonk(id, p, type.pts);
        continue;
      }
      p.combo++;
      p.bestCombo = Math.max(p.bestCombo, p.combo);
      if (done + 1 < type.hp) { out.push({ id, kill: false, pts: 0 }); continue; }
      const pts = type.pts * World.comboMult(p.combo) * (fire ? 2 : 1);
      p.score += pts;
      p.kills++;
      if (m.type === 'goud') p.golds++;
      this.total++;
      out.push({ id, kill: true, pts });
      this.bonk(id, p, pts);
      if (p.combo === 15 || p.combo === 30) this.addFeed(`🔥 ${p.name} mept ${p.combo} op rij!`, false);
    }
    if (!out.length) {
      p.misses++;
      p.combo = 0;
    }
    p.dirty = true;
    return { hits: out, score: p.score, combo: p.combo, mult: World.comboMult(p.combo), fire };
  }

  bonk(id, p, pts) {
    if (this.firstHit.has(id)) return;
    this.firstHit.set(id, p.n);
    this.bonks.push([id, p.n, pts]);
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    return { ...res, streak: p.streak };
  }

  // Juist: volle zwaardlading, het Vuurzwaard en een bonus. Fout: even wachten, de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    const now = Date.now();
    let bonus = 0;
    if (res.correct) {
      bonus = Math.round(25 * factor(this.tempo));
      p.score += bonus;
      p.energyUntil = Math.max(now, this.startedAt) + this.energyMs;
      p.fireUntil = Math.max(now, this.startedAt) + World.FIRE_MS;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, bonus, streak: p.streak, energy: p.energyUntil - now, fire: Math.max(0, p.fireUntil - now) };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.send(Date.now());
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} is de beste mollenmepper!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.kills, p.golds, p.bombs, p.bestCombo, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`robomol-${this.quiz.title}`, [['Robomol', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Mollen', 'Goudhelmen', 'Bommen geraakt', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: p.score, kills: p.kills, golds: p.golds, bombs: p.bombs,
        combo: p.combo, bestCombo: p.bestCombo, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.kills - a.kills);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, seed: this.seed,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(), total: this.total,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const now = Date.now();
    const r = ranking.find(x => x.n === p.n) || {};
    return {
      n: p.n, score: p.score, kills: p.kills, combo: p.combo, mult: World.comboMult(p.combo), rank: ranking.indexOf(r) + 1, players: this.players.size,
      energy: Math.max(0, p.energyUntil - now), energyMax: this.energyMs, fire: Math.max(0, p.fireUntil - now), stun: Math.max(0, p.stunUntil - now),
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, hits: [...p.hits] });
    return state;
  }

  // Het bord krijgt elke tick wie welke mol raakte; de rangschikking om de seconde. Leerlingen enkel hun eigen stand.
  send(now) {
    const msg = { b: this.bonks, total: this.total };
    this.bonks = [];
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      const ranking = this.ranking();
      this.io.to('host').emit('mo-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
      for (const p of this.players.values()) {
        p.dirty = false;
        this.io.to(p.socketId).emit('mo-tick', { total: this.total, me: this.me(p, ranking) });
      }
      return;
    }
    if (msg.b.length) this.io.to('host').emit('mo-tick', msg);
  }

  broadcast() {
    this.io.to('host').emit('mo-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('mo-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('mo-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('mo-state', this.hostState());
    socket.on('mo-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('robomol');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('mo-start', () => this.start());
    socket.on('mo-kick', id => this.kick(id));
    socket.on('mo-finish', () => this.finish());
    socket.on('mo-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('mo-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('mo-state', this.base());
    socket.on('mo-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.moId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('mo-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.moId ? fn(socket.data.moId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('mo-swing', (id, m) => this.swing(id, m || {}));
    on('mo-question', id => guard.question(id));
    on('mo-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Robomol };
