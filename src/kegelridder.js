// Kegelridder: bowlen in de kegelhal van de burcht. Elke leerling heeft zijn eigen baan op zijn eigen scherm.
// Antwoorden geven ballen: elke juiste vraag = één bal. Veeg de bal naar de tien runenkegels.
// Per beurt twee ballen: alles om in één bal = STRIKE (+10 extra), alles om met de tweede = SPARE (+5 extra).
// Drie juist op rij: de volgende bal is een gouden runenbal (groter en zwaarder).
// De server rekent elke worp zelf na (kb-world.js) en houdt de stand bij; het bord speelt de mooiste worpen na.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/kb-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor, reeks } = require('./tempo');

const SEND_MS = 400;
const POINTS = { strike: 10, spare: 5, vraag: 10 };
const GOLD_STREAK = 3;   // zoveel juist op rij = een runenbal
const MAX_BALLS = 9;     // meer ballen sparen kan niet (Vragenstorm)
const MIN_THROW_MS = 1500; // een worp duurt minstens zo lang (tegen klikken aan de lopende band)

class Kegelridder {
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
    this.minutes = 5;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.nextN = 0;
    this.feed = [];
    this.throws = []; // de laatste worpen, voor het bord
    this.throwId = 0;
    this.changed = false;
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Kegelridder', this.tempo);
    this.vragen.reeks = reeks(this.tempo); // Veel vragen: twee vragen per bal
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
    const n = this.nextN++;
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      balls: 0, gold: false, frame: 1, ball: 1, standing: Array(10).fill(true), firstDown: 0, frames: [], lastThrow: 0,
      pts: 0, pins: 0, strikes: 0, spares: 0, gutters: 0, thrown: 0, best: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, asking: false,
    });
    this.changed = true;
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('kb-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.addFeed('🎳 De kegels staan klaar. Beantwoord een vraag en verdien je eerste bal!');
    this.ticker = setInterval(() => this.send(), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Vragen: elke juiste = een bal ----------

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (p) p.asking = Boolean(on) && this.phase === 'play';
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (p.balls >= MAX_BALLS) return { error: 'Je hebt al genoeg ballen. Gooi eerst!' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    return { ...res, streak: p.streak, balls: p.balls };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let points = 0, gold = false;
    if (res.correct) {
      points = Math.round(POINTS.vraag * factor(this.tempo));
      p.pts += points;
      if (!res.more) p.balls = Math.min(MAX_BALLS, p.balls + 1);
      if (p.streak > 0 && p.streak % GOLD_STREAK === 0) { p.gold = true; gold = true; }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} vragen op rij juist`, false);
    }
    this.changed = true;
    return { ...res, points, balls: p.balls, gold: p.gold, newGold: gold, streak: p.streak };
  }

  // ---------- Een worp ----------

  throwBall(playerId, input) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (p.balls <= 0) return { error: 'Je hebt geen bal. Beantwoord eerst een vraag.' };
    if (now - p.lastThrow < MIN_THROW_MS) return { error: 'Je bal rolt nog.' };
    p.lastThrow = now;
    const t = World.clean(input);
    const before = p.standing.slice();
    const gold = p.gold;
    const sim = World.play(t, before, gold);
    p.balls--;
    p.gold = false;
    p.thrown++;
    const down = sim.down.length;
    p.pins += down;
    let points = down, kind = '';
    const frame = p.frame, ball = p.ball;
    for (const i of sim.down) p.standing[i] = false;
    const left = p.standing.filter(Boolean).length;
    if (sim.gutter) p.gutters++;
    if (p.ball === 1) {
      if (left === 0) {
        kind = 'strike';
        points += POINTS.strike;
        p.strikes++;
        p.frames.push('X');
        this.nextFrame(p);
      } else {
        p.firstDown = down;
        p.ball = 2;
      }
    } else {
      if (left === 0) {
        kind = 'spare';
        points += POINTS.spare;
        p.spares++;
        p.frames.push(`${p.firstDown}/`);
      } else p.frames.push(`${p.firstDown}${down}`);
      this.nextFrame(p);
    }
    p.pts += points;
    p.best = Math.max(p.best, points);
    if (kind === 'strike') {
      const rij = p.frames.length >= 3 && p.frames.slice(-3).every(f => f === 'X');
      this.addFeed(rij ? `🔥 ${p.name} gooit 3 strikes op rij!` : `🎳 STRIKE voor ${p.name}!`, rij || p.strikes <= 3);
    } else if (kind === 'spare') this.addFeed(`✨ Spare voor ${p.name}`, false);
    // Het bord speelt de worp na. Strikes en spares eerst.
    this.throws.push({ id: ++this.throwId, n: p.n, name: p.name, color: p.color, t, standing: before, gold, down: sim.down, kind, points, frame, ball });
    if (this.throws.length > 12) this.throws.shift();
    this.changed = true;
    return { ok: true, t, down: sim.down, kind, points, frame, ball, balls: p.balls, standing: p.standing.slice(), nextFrame: p.frame, nextBall: p.ball };
  }

  nextFrame(p) {
    p.frame++;
    p.ball = 1;
    p.firstDown = 0;
    p.standing = Array(10).fill(true);
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint Kegelridder!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.pins, p.strikes, p.spares, p.thrown, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`kegelridder-${this.quiz.title}`, [['Kegelridder', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Kegels', 'Strikes', 'Spares', 'Ballen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.changed = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.pts), pins: p.pins, strikes: p.strikes, spares: p.spares, thrown: p.thrown, frame: p.frame,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.strikes - a.strikes || b.pins - a.pins);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, throws: this.throws, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    return {
      n: p.n, score: r.score || 0, rank: ranking.indexOf(r) + 1, players: this.players.size, balls: p.balls, gold: p.gold, frame: p.frame, ball: p.ball,
      standing: p.standing, pins: p.pins, strikes: p.strikes, spares: p.spares, thrown: p.thrown, streak: p.streak, frames: p.frames.slice(-10),
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Alleen als er iets veranderde: geen posities, alleen de stand en de nieuwe worpen. Licht voor de schoolwifi.
  send() {
    if (!this.changed) return;
    this.changed = false;
    const ranking = this.ranking();
    this.io.to('host').emit('kb-tick', { ranking, feed: this.feed, throws: this.throws });
    for (const p of this.players.values()) this.io.to(p.socketId).emit('kb-tick', { me: this.me(p, ranking), feed: this.feed.slice(0, 3) });
  }

  broadcast() {
    this.io.to('host').emit('kb-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('kb-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('kb-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('kb-state', this.hostState());
    socket.on('kb-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('kegel');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('kb-start', () => this.start());
    socket.on('kb-kick', id => this.kick(id));
    socket.on('kb-finish', () => this.finish());
    socket.on('kb-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('kb-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('kb-state', this.base());
    socket.on('kb-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.kbId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('kb-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.kbId ? fn(socket.data.kbId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('kb-throw', (id, t) => this.throwBall(id, t || {}));
    on('kb-asking', (id, v) => this.asking(id, v));
    on('kb-question', id => guard.question(id));
    on('kb-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.kbId) this.asking(socket.data.kbId, false);
  }
}

module.exports = { Kegelridder };
