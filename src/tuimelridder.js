// Tuimelridder: iedereen rijdt op zijn eigen scherm met een rijmachine door hetzelfde stuntparcours: springplanken,
// zwaaiende hamers, laserpoorten, kanonnen, wippen en stekels. Raakt de helm iets, of word je geraakt, dan tuimelt je
// ridder eraf en begin je opnieuw bij de laatste vlag. 5 parcoursen van 4 etappes; aan de finish krijg je sterren
// (geen enkele val = 3 sterren) en kies je een rijmachine voor het volgende parcours.
// Elke vlag is een vraag. Juist: ⚡ turbo en punten. Fout: verder rijden, die vraag komt later terug.
// De leerling rijdt zelf (geen vertraging); de server controleert de vlaggen en houdt de stand bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/tm-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 100;
const POINTS = { vlag: 100, snel: 5, finish: 150, ster: 50, vraag: 60 };
const SNEL_S = 20; // onder deze tijd krijg je per seconde extra punten aan de vlag

class Tuimelridder {
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
    this.records = new Map(); // etappe -> { s, name }
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
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Tuimelridder', this.tempo);
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
    const n = this.nextN++;
    const spawn = World.spawn(0, 0);
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length], vi: 0,
      x: spawn.x, y: spawn.y, a: 0, f: 0, stage: 0, stageAt: Math.max(Date.now(), this.startedAt), falls: 0, courseFalls: 0, stars: [], pts: 0, asking: false,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('tm-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.stageAt = this.startedAt;
    this.addFeed('🛡️ De ridders vertrekken. Op naar de eerste vlag!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Wat de leerling doorstuurt ----------

  // Positie (tien keer per seconde): zwaartepunt, hoek, rijmachine. f: 1 gas, 4 turbo, 8 gevallen.
  pos(playerId, { x, y, a, f, v } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || Date.now() < this.startedAt) return;
    if (Number.isFinite(x)) p.x = Math.max(-6, Math.min(World.startX(p.stage + 1) + 8, x));
    if (Number.isFinite(y)) p.y = Math.max(-20, Math.min(World.VOID + 2, y));
    if (Number.isFinite(a)) p.a = Math.max(-50, Math.min(50, a));
    if (Number.isInteger(v) && v >= 0 && v < World.VEHICLES.length) p.vi = v;
    p.f = Number(f) & 15;
  }

  // Gevallen: telt mee voor de sterren van dit parcours (geen strafpunten, wel tijd kwijt).
  fall(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    p.falls++;
    p.courseFalls++;
    p.dirty = true;
  }

  // Een rijmachine kiezen (aan de start en aan elke finish).
  vehicle(playerId, v) {
    const p = this.players.get(playerId);
    if (!p || !Number.isInteger(v) || v < 0 || v >= World.VEHICLES.length) return {};
    p.vi = v;
    return { ok: true };
  }

  // Over de vlag van etappe k: punten, sneller = meer. Is het een finish, dan ook sterren. Daarna komt de vraag.
  flag(playerId, k) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (k !== p.stage + 1) return { error: 'Verkeerde vlag.', stage: p.stage };
    const s = (now - p.stageAt) / 1000;
    if (s < World.MIN_STAGE_S || p.x < World.startX(k) - 4) return { error: 'Te snel.', stage: p.stage };
    p.stage = k;
    p.stageAt = now;
    const snel = Math.max(0, Math.round((SNEL_S - s) * POINTS.snel));
    let points = POINTS.vlag + snel;
    let stars = 0;
    if (World.isFinish(k)) {
      stars = p.courseFalls === 0 ? 3 : p.courseFalls <= 2 ? 2 : 1;
      p.stars.push(stars);
      points += POINTS.finish + stars * POINTS.ster;
      p.courseFalls = 0;
      const course = World.THEMES[World.courseOf(k - 1)].name;
      if (stars === 3) this.addFeed(`⭐⭐⭐ ${p.name} rijdt ${course} zonder één val!`);
      else if (![...this.players.values()].some(o => o !== p && o.stage >= k)) this.addFeed(`🏁 ${p.name} haalt als eerste de finish van ${course}!`);
    }
    p.pts += points;
    p.dirty = true;
    const rec = this.records.get(k);
    let record = false;
    if (!rec || s < rec.s) {
      this.records.set(k, { s, name: p.name });
      record = Boolean(rec);
    }
    const first = ![...this.players.values()].some(o => o !== p && o.stage >= k);
    if (!World.isFinish(k) && first && k <= 2) this.addFeed(`🏁 ${p.name} haalt als eerste vlag ${k}!`);
    else if (!World.isFinish(k) && record) this.addFeed(`⏱️ Record: ${p.name} rijdt etappe ${k} in ${s.toFixed(1).replace('.', ',')} s`, false);
    return { ok: true, stage: k, s, points, record, stars };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    if (was && !p.asking && this.phase === 'play') p.stageAt = Math.max(p.stageAt, Date.now());
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    return { ...res, streak: p.streak };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let points = 0;
    if (res.correct) {
      points = Math.round(POINTS.vraag * factor(this.tempo));
      p.pts += points;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} vlaggen op rij juist`, false);
    }
    p.dirty = true;
    return { ...res, points, turbo: res.correct ? World.TURBO_S : 0, streak: p.streak };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint Tuimelridder!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.stage, p.courses, p.stars, p.falls, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`tuimelridder-${this.quiz.title}`, [['Tuimelridder', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Vlaggen', 'Parcoursen', 'Sterren', 'Gevallen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.pts), stage: p.stage, courses: p.stars.length, stars: p.stars.reduce((a, b) => a + b, 0),
        falls: p.falls, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.stage - a.stage);
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
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    return { n: p.n, score: r.score || 0, stage: p.stage, stars: r.stars || 0, courses: r.courses || 0, falls: p.falls, courseFalls: p.courseFalls, rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, stage: p.stage, vi: p.vi });
    return state;
  }

  // Iedereen krijgt de plek van iedereen: [n, x, y, hoek, vlaggen, etappe, rijmachine]. Vlaggen: 1 gas, 4 turbo, 8 gevallen, 16 vraag.
  send(now) {
    const r2 = v => Math.round(v * 100) / 100;
    const msg = { r: [...this.players.values()].map(p => [p.n, r2(p.x), r2(p.y), r2(p.a), p.f | (p.asking ? 16 : 0), p.stage, p.vi]) };
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('tm-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('tm-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('tm-tick', { ...msg, me: this.me(p, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('tm-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('tm-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('tm-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('tm-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('tm-state', this.hostState());
    socket.on('tm-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('tuimel');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('tm-start', () => this.start());
    socket.on('tm-kick', id => this.kick(id));
    socket.on('tm-finish', () => this.finish());
    socket.on('tm-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('tm-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('tm-state', this.base());
    socket.on('tm-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.tmId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('tm-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.tmId ? fn(socket.data.tmId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('tm-pos', (id, m) => this.pos(id, m || {}));
    on('tm-fall', id => this.fall(id));
    on('tm-veh', (id, v) => this.vehicle(id, Number(v)));
    on('tm-flag', (id, k) => this.flag(id, Number(k)));
    on('tm-asking', (id, v) => this.asking(id, v));
    on('tm-question', id => guard.question(id));
    on('tm-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.tmId) this.asking(socket.data.tmId, false);
  }
}

module.exports = { Tuimelridder };
