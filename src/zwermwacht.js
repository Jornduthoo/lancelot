// Zwermwacht: elke leerling verdedigt op zijn eigen scherm een ridder tegen zwermen roestrobots.
// De wapens vuren vanzelf, de leerling stuurt alleen waar de ridder loopt. Kristallen vullen de balk:
// vol = een vraag. Juist = kies 1 van 3 upgrades (soms een gouden), fout = toch een kleine upgrade.
// Hartjes op = een vraag om weer recht te staan; niemand ligt eruit. Op 70 % van de tijd komt De IJzeren Kolos.
// De zwerm leeft op het toestel van de leerling (geen vertraging); de server houdt de stand bij, controleert
// de aantallen en geeft de vragen. Het bord toont alle ridders, het klasdoel en wie het langst overleeft.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/zm-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 500;

class Zwermwacht {
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
    this.seed = 1;
    this.startedAt = 0;
    this.endsAt = 0;
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.goal = 0;
    this.goalHit = false;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.vragen = new Vragen(quiz, 'Zwermwacht', this.tempo);
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
    const now = Date.now();
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      kills: 0, xp: 0, lvl: 0, hp: World.PLAYER.hp, maxHp: World.PLAYER.hp, alive: 0, w: '10000', boss: 0, bosses: 0,
      downs: 0, lifeAt: Math.max(now, this.startedAt), bestLife: 0, statAt: now, pts: 0, asking: '',
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0,
    });
    if (this.phase === 'play') this.setGoal();
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('zm-kicked');
    this.broadcast();
  }

  // Het klasdoel: samen zoveel robots, naar het aantal ridders en de speeltijd.
  setGoal() {
    if (this.goalHit) return;
    this.goal = Math.max(300, Math.round(this.players.size * this.minutes * 70 / 100) * 100);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) { p.lifeAt = this.startedAt; p.statAt = this.startedAt; }
    this.setGoal();
    this.addFeed('🛡️ De zwerm komt eraan. Hou je ridder heel!');
    this.ticker = setInterval(() => this.send(), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  get bossAt() {
    return this.startedAt + (this.endsAt - this.startedAt) * World.BOSS_AT;
  }

  totalKills() {
    let t = 0;
    for (const p of this.players.values()) t += p.kills;
    return t;
  }

  score(p) {
    return Math.round(p.kills * World.POINTS.kill + p.xp * World.POINTS.xp + p.bosses * World.POINTS.boss + p.pts);
  }

  // ---------- Wat de leerling doorstuurt ----------

  // Om de halve seconde: hoeveel robots, kristallen, hartjes en welke wapens. Aantallen gaan alleen omhoog en niet sneller dan kan.
  stat(playerId, s) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt || !s || typeof s !== 'object') return {};
    const dt = Math.max(.3, (now - p.statAt) / 1000);
    p.statAt = now;
    const num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : lo);
    const kills = num(s.kills, 0, 1e7), xp = num(s.xp, 0, 1e8);
    if (kills > p.kills) p.kills = Math.min(kills, p.kills + Math.ceil(World.MAX_KILLS_S * dt));
    if (xp > p.xp) p.xp = Math.min(xp, p.xp + Math.ceil(World.MAX_KILLS_S * 6 * dt));
    p.maxHp = num(s.maxHp, 1, World.PLAYER.hp + World.MAX_P);
    p.hp = num(s.hp, 0, p.maxHp);
    p.alive = num(s.alive, 0, 999);
    p.boss = s.boss ? 1 : 0;
    if (typeof s.w === 'string' && /^[0-5]{5}$/.test(s.w)) p.w = s.w;
    const total = this.totalKills();
    if (!this.goalHit && this.goal && total >= this.goal) {
      this.goalHit = true;
      this.addFeed(`🎯 Klasdoel gehaald: samen ${this.goal} robots!`);
    }
    return { ok: true };
  }

  // De Kolos verslagen. Kan pas als hij er is, en niet vaker dan hij kan terugkomen.
  boss(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return {};
    const max = now < this.bossAt ? 0 : 1 + Math.floor((now - this.bossAt) / 1000 / World.BOSS_AGAIN_S);
    if (p.bosses >= max) return {};
    p.bosses++;
    p.boss = 0;
    this.addFeed(p.bosses === 1 ? `👑 ${p.name} verslaat De IJzeren Kolos!` : `👑 ${p.name} verslaat al ${p.bosses} keer de Kolos!`);
    return { ok: true, points: World.POINTS.boss, bosses: p.bosses };
  }

  // Hartjes op: tot nu het langst overleefd?
  down(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return {};
    const life = (now - p.lifeAt) / 1000;
    p.bestLife = Math.max(p.bestLife, life);
    p.downs++;
    p.hp = 0;
    p.lifeAt = now;
    return { ok: true };
  }

  // Waarom staat er een vraag open: 'lvl' (balk vol), 'op' (hartjes op) of '' (dicht).
  asking(playerId, why) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = this.phase === 'play' && (why === 'lvl' || why === 'op') ? why : '';
    if (was === 'op' && !p.asking) p.lifeAt = Date.now(); // weer recht: een nieuw leven begint
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    return { ...res, streak: p.streak };
  }

  // Juist: punten. Bij een volle balk stijg je altijd een niveau (juist = zelf kiezen, fout = een kleine upgrade).
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let points = 0;
    if (res.correct) {
      points = Math.round(World.POINTS.vraag * factor(this.tempo));
      p.pts += points;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} vragen op rij juist`, false);
    }
    let lvl = p.lvl;
    if (p.asking === 'lvl') {
      p.lvl++;
      lvl = p.lvl;
      if (p.lvl % 5 === 0) this.addFeed(`⭐ ${p.name} is al niveau ${p.lvl}`, false);
    }
    return { ...res, points, lvl, gold: res.correct && p.streak >= 3, streak: p.streak };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    const now = Date.now();
    for (const p of this.players.values()) if (!p.asking) p.bestLife = Math.max(p.bestLife, (now - p.lifeAt) / 1000);
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint Zwermwacht!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.kills, p.lvl, p.bosses, Math.round(p.bestLife), p.downs, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`zwermwacht-${this.quiz.title}`, [['Zwermwacht', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size], ['Klasdoel', `${this.goal} robots${this.goalHit ? ' (gehaald)' : ''}`]],
      ['Rang', 'Naam', 'Punten', 'Robots', 'Niveau', 'Kolos verslagen', 'Langst overleefd (s)', 'Keren gevallen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  // Langst overleefd: het beste leven tot nu, of het leven dat nog bezig is.
  life(p, now = Date.now()) {
    const cur = this.phase === 'play' && !p.asking && now > p.lifeAt ? (now - p.lifeAt) / 1000 : 0;
    return Math.max(p.bestLife, cur);
  }

  ranking() {
    const now = Date.now();
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: this.score(p), kills: p.kills, lvl: p.lvl, bosses: p.bosses,
        bestLife: this.life(p, now), downs: p.downs, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.kills - a.kills);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, seed: this.seed,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(), goal: this.goal,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, kills: this.totalKills(), goalHit: this.goalHit };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    return { n: p.n, score: r.score || 0, kills: p.kills, lvl: p.lvl, bosses: p.bosses, bestLife: r.bestLife || 0, rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, lvl: p.lvl, kills: p.kills, xp: p.xp, bosses: p.bosses });
    return state;
  }

  // Twee keer per seconde naar het bord: [n, robots, niveau, hartjes, max, keren gevallen, vraag (0/1 balk/2 hartjes), wapens, robots rond je, Kolos].
  send() {
    const r = [...this.players.values()].map(p => [p.n, p.kills, p.lvl, p.hp, p.maxHp, p.downs, p.asking === 'lvl' ? 1 : p.asking === 'op' ? 2 : 0, p.w, p.alive, p.boss]);
    const ranking = this.ranking();
    const kills = this.totalKills();
    this.io.to('host').emit('zm-tick', { r, ranking, kills, goal: this.goal, goalHit: this.goalHit, feed: this.feedChanged ? this.feed : undefined });
    this.feedChanged = false;
    for (const p of this.players.values()) this.io.to(p.socketId).emit('zm-tick', { me: this.me(p, ranking), kills, goal: this.goal });
  }

  broadcast() {
    this.io.to('host').emit('zm-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('zm-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('zm-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('zm-state', this.hostState());
    socket.on('zm-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('zwerm');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('zm-start', () => this.start());
    socket.on('zm-kick', id => this.kick(id));
    socket.on('zm-finish', () => this.finish());
    socket.on('zm-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('zm-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('zm-state', this.base());
    socket.on('zm-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.zmId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('zm-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.zmId ? fn(socket.data.zmId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('zm-stat', (id, s) => this.stat(id, s));
    on('zm-boss', id => this.boss(id));
    on('zm-down', id => this.down(id));
    on('zm-asking', (id, why) => this.asking(id, why));
    on('zm-question', id => guard.question(id));
    on('zm-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.zmId) this.asking(socket.data.zmId, ''); });
  }
}

module.exports = { Zwermwacht };
