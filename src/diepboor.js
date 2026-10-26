// Diepboor: elke leerling graaft met een eigen boorridder naar beneden, door aarde, klei, steen, kristalgrotten en magma.
// Brandstof krijg je alleen met goede antwoorden. Stenen in je laadruim verkoop je bovenaan in de smidse; met dat goud
// koop je een snellere boor, een grotere tank, een groter laadruim en sterker pantser. Lava en gaszakken beschadigen je pantser.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De leerling graaft zelf (geen vertraging); de server controleert elk vakje (dezelfde mijn uit dezelfde seed) en houdt goud en laadruim bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/db-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 250;

class Diepboor {
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
    this.minutes = 6;
    this.tempo = 'normaal';
    this.seed = 1;
    this.startedAt = 0;
    this.endsAt = 0;
    this.digs = [];
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
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 6;
    this.tempo = tempoOf(tempo);
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.vragen = new Vragen(quiz, 'Diepboor', this.tempo);
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
      x: Math.floor(World.COLS / 2), y: -1, deepest: 0, gold: 0, earned: 0, cargo: [], dug: new Set(), found: {},
      lv: { boor: 1, tank: 1, ruim: 1, pantser: 1 }, tele: 1, wrecks: 0, score: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('db-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.addFeed('⛏️ De boren draaien. Graaf zo diep als je kan!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Graven ----------

  // De leerling boorde een vakje uit. Erts gaat in het laadruim als er plaats is.
  dig(playerId, { x, y } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= World.COLS || y < 0 || y >= World.ROWS) return { error: 'Buiten de mijn.' };
    const cell = y * World.COLS + x;
    if (p.dug.has(cell)) return { ok: true };
    const type = World.tile(this.seed, x, y);
    if (type === World.T.ROTS || type === World.T.LEEG) return { ok: true };
    p.dug.add(cell);
    this.digs.push([p.n, cell]);
    let kept = false;
    const ore = World.ORES[type];
    if (ore) {
      if (p.cargo.length < World.UPGRADES.ruim.val[p.lv.ruim - 1]) { p.cargo.push(type); kept = true; }
      p.found[ore.name] = (p.found[ore.name] || 0) + 1;
      if (type === World.T.NEON) this.addFeed(`💗 ${p.name} vond een neonkern op ${y} m!`);
      else if (type === World.T.KRISTAL && p.found.kristal === 1) this.addFeed(`💎 ${p.name} vond het eerste kristal`, false);
    }
    if (y > p.deepest) {
      const old = p.deepest;
      p.deepest = y;
      for (const b of World.BANDS.slice(0, -1)) if (old < b.to && y >= b.to) this.addFeed(`🕳️ ${p.name} bereikt de ${World.band(y).name.toLowerCase()}laag`, false);
    }
    p.dirty = true;
    return { ok: true, ore: ore ? type : 0, kept, cargo: p.cargo.length };
  }

  pos(playerId, { x, y } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || !Number.isFinite(x) || !Number.isFinite(y)) return;
    p.x = Math.max(0, Math.min(World.COLS - 1, x));
    p.y = Math.max(-1, Math.min(World.ROWS - 1, y));
  }

  // Bovenaan: alles uit het laadruim verkopen.
  sell(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (p.y > -0.5) return { error: 'Verkopen kan alleen bovenaan.' };
    const value = p.cargo.reduce((a, t) => a + World.ORES[t].value, 0);
    const count = p.cargo.length;
    p.cargo = [];
    p.gold += value;
    p.earned += value;
    p.dirty = true;
    if (value >= 300) this.addFeed(`💰 ${p.name} verkoopt een lading van ${value} goud!`);
    return { ok: true, value, count, gold: p.gold };
  }

  buy(playerId, item) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (item === 'teleport') {
      if (p.tele >= World.TELEPORT.max) return { error: 'Je hebt al genoeg teleporten.' };
      if (p.gold < World.TELEPORT.cost) return { error: `Een teleport kost ${World.TELEPORT.cost} goud.` };
      p.gold -= World.TELEPORT.cost;
      p.tele++;
    } else {
      const up = World.UPGRADES[item];
      if (!up) return { error: 'Onbekend.' };
      const lv = p.lv[item];
      if (lv >= up.val.length) return { error: 'Al op het hoogste niveau.' };
      if (p.gold < up.cost[lv]) return { error: `Nog ${up.cost[lv] - p.gold} goud nodig.` };
      p.gold -= up.cost[lv];
      p.lv[item]++;
      if (p.lv[item] === up.val.length) this.addFeed(`⭐ ${p.name} heeft het beste ${up.name.toLowerCase()}`, false);
    }
    p.dirty = true;
    return { ok: true, gold: p.gold, lv: p.lv, tele: p.tele };
  }

  teleport(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (p.tele <= 0) return { error: 'Geen teleport meer. Koop er een in de smidse.' };
    p.tele--;
    p.y = -1;
    p.dirty = true;
    return { ok: true, tele: p.tele };
  }

  // Pantser op: je laadruim is weg en je begint weer bovenaan.
  wreck(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    p.cargo = [];
    p.wrecks++;
    p.y = -1;
    p.dirty = true;
    this.addFeed(`💥 De boor van ${p.name} is kapot. Terug naar boven!`, false);
  }

  // ---------- Vragen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    return res;
  }

  // Juist: brandstof (meer bij een reeks). Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let fuel = 0;
    if (res.correct) {
      fuel = Math.round((32 + 5 * Math.min(p.streak - 1, 4)) * factor(this.tempo) * (1 + (p.lv.tank - 1) * .2));
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, fuel, streak: p.streak };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    // Wat nog in het laadruim zit, telt voor de helft mee.
    for (const p of this.players.values()) {
      const half = Math.round(p.cargo.reduce((a, t) => a + World.ORES[t].value, 0) / 2);
      p.earned += half;
      this.scoreOf(p);
    }
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} is de beste mijnridder!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.earned, p.deepest, p.wrecks, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`diepboor-${this.quiz.title}`, [['Diepboor', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Goud verdiend', 'Diepste meter', 'Kapot', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  scoreOf(p) {
    p.score = p.earned + p.deepest * 3;
    return p.score;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: this.scoreOf(p), earned: p.earned, deepest: p.deepest, wrecks: p.wrecks,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.deepest - a.deepest);
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

  // Het bord krijgt ook alle gegraven vakjes (om de mijnen te tekenen, ook na herladen).
  hostState() {
    const dug = [...this.players.values()].map(p => [p.n, [...p.dug]]);
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, dug };
  }

  me(p, ranking) {
    return {
      n: p.n, gold: p.gold, cargo: p.cargo, lv: p.lv, tele: p.tele, deepest: p.deepest, score: this.scoreOf(p),
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, dug: [...p.dug], at: [p.x, p.y] });
    return state;
  }

  // Posities [n, x, y] voor het bord; nieuwe gegraven vakjes [n, cel]. De leerling krijgt alleen zijn eigen stand als die veranderde.
  send(now) {
    const msg = { k: [...this.players.values()].map(p => [p.n, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]), d: this.digs };
    this.digs = [];
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      const ranking = this.ranking();
      this.io.to('host').emit('db-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
      for (const p of this.players.values()) if (p.dirty) { p.dirty = false; this.io.to(p.socketId).emit('db-me', this.me(p, ranking)); }
    } else this.io.to('host').emit('db-tick', msg);
  }

  broadcast() {
    this.io.to('host').emit('db-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('db-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('db-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('db-state', this.hostState());
    socket.on('db-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('diep');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('db-start', () => this.start());
    socket.on('db-kick', id => this.kick(id));
    socket.on('db-finish', () => this.finish());
    socket.on('db-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('db-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('db-state', this.base());
    socket.on('db-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.dbId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('db-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.dbId ? fn(socket.data.dbId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('db-dig', (id, c) => this.dig(id, c || {}));
    on('db-pos', (id, c) => this.pos(id, c || {}));
    on('db-sell', id => this.sell(id));
    on('db-buy', (id, item) => this.buy(id, String(item || '')));
    on('db-tele', id => this.teleport(id));
    on('db-wreck', id => this.wreck(id));
    on('db-question', id => guard.question(id));
    on('db-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Diepboor };
