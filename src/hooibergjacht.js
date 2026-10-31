// Hooibergjacht: iedereen graaft op zijn eigen scherm door een neonhooiberg op zoek naar één kristallen naald.
// Graven kost energie. Is je energie op, dan komt er een vraag. Juist: ⚡ volle energie, een beter werktuig
// (hooivork, plasmazeis, windkanon, wervelstorm) en het kompas wijst even waar de naald zit. Fout: even wachten, die vraag komt later terug.
// Naald gevonden: punten (sneller = meer) en meteen een nieuwe, grotere hooiberg.
// De leerling graaft zelf (geen vertraging); de server kent de plek van elke naald (hb-world.js) en houdt de stand bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/hb-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 500;
const POINTS_VRAAG = 60;

class Hooibergjacht {
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
    this.record = null; // { s, name }
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
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.vragen = new Vragen(quiz, 'Hooibergjacht', this.tempo);
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
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      k: 0, kAt: Math.max(Date.now(), this.startedAt), found: 0, items: new Set(), loot: 0, lvl: 0, prog: 0, pts: 0, asking: false,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('hb-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.kAt = this.startedAt;
    this.addFeed('🌾 De hooibergen staan klaar. Zoek de kristallen naald!');
    this.ticker = setInterval(() => this.send(), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Wat de leerling doorstuurt ----------

  // Hoeveel van de hooiberg al weg is (0-100), voor het bord.
  progress(playerId, prog) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || !Number.isFinite(prog)) return;
    p.prog = Math.max(0, Math.min(100, Math.round(prog)));
  }

  // Een tandwiel of runenmunt uit het hooi: alleen uit de hooiberg waar je nu in zit, en elk één keer.
  item(playerId, id) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || typeof id !== 'string' || p.items.has(id)) return {};
    if (Number(id.split('.')[0]) !== p.k) return {};
    const it = World.stack(this.seed, p.n, p.k).items.find(i => i.id === id);
    if (!it) return {};
    p.items.add(id);
    p.loot++;
    const points = World.POINTS[it.kind] || 10;
    p.pts += points;
    p.dirty = true;
    return { ok: true, points };
  }

  // De naald van hooiberg k gevonden: punten (sneller = meer) en de volgende hooiberg.
  found(playerId, k) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (k !== p.k) return { error: 'Verkeerde hooiberg.', k: p.k };
    const s = (now - p.kAt) / 1000;
    if (s < World.MIN_FIND_S) return { error: 'Te snel.', k: p.k };
    const snel = Math.max(0, Math.round((World.SNEL_S - s) * World.POINTS.snel));
    const points = World.POINTS.naald + snel + k * 25;
    p.pts += points;
    p.found++;
    p.k = k + 1;
    p.kAt = now;
    p.prog = 0;
    p.dirty = true;
    const first = ![...this.players.values()].some(o => o !== p && o.found >= p.found);
    let record = false;
    if (!this.record || s < this.record.s) {
      record = Boolean(this.record);
      this.record = { s, name: p.name };
    }
    if (first) this.addFeed(`📍 ${p.name} vindt als eerste naald ${p.found}!`);
    else if (record) this.addFeed(`⏱️ Record: ${p.name} vindt een naald in ${s.toFixed(1).replace('.', ',')} s`, false);
    else this.addFeed(`📍 ${p.name} vindt naald ${p.found}`, false);
    return { ok: true, k: p.k, s, points, record };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    // De tijd voor de naald loopt niet tijdens een vraag.
    if (was && !p.asking && this.phase === 'play') p.kAt += Math.min(60000, Date.now() - (p.askAt || Date.now()));
    if (!was && p.asking) p.askAt = Date.now();
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    if (!p.asking) this.asking(playerId, true);
    return { ...res, streak: p.streak };
  }

  // Juist: punten, een beter werktuig en het kompas. Fout: even wachten (het juiste antwoord blijft staan), de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let points = 0;
    let up = false;
    if (res.correct) {
      points = Math.round(POINTS_VRAAG * factor(this.tempo));
      p.pts += points;
      if (p.lvl < World.TOOLS.length - 1) {
        p.lvl++;
        up = true;
        if (p.lvl === World.TOOLS.length - 1) this.addFeed(`🌪️ ${p.name} heeft de Wervelstorm!`, false);
      }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} vragen op rij juist`, false);
    }
    p.dirty = true;
    return { ...res, points, lvl: p.lvl, up, streak: p.streak };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint Hooibergjacht!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.found, p.loot, World.TOOLS[p.lvl].name, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`hooibergjacht-${this.quiz.title}`, [['Hooibergjacht', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Naalden', 'Schatten', 'Werktuig', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.pts), found: p.found, loot: p.loot, lvl: p.lvl,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.found - a.found);
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
    return { n: p.n, score: r.score || 0, found: p.found, loot: p.loot, lvl: p.lvl, rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, k: p.k, lvl: p.lvl, itemIds: [...p.items] });
    return state;
  }

  // Twee keer per seconde: [n, hooiberg, % weg, naalden, werktuig, vraag open] van iedereen.
  send() {
    const r = [...this.players.values()].map(p => [p.n, p.k, p.prog, p.found, p.lvl, p.asking ? 1 : 0]);
    const ranking = this.ranking();
    this.io.to('host').emit('hb-tick', { r, ranking, feed: this.feedChanged ? this.feed : undefined });
    this.feedChanged = false;
    for (const p of this.players.values()) {
      p.dirty = false;
      this.io.to(p.socketId).emit('hb-tick', { r, me: this.me(p, ranking) });
    }
  }

  broadcast() {
    this.io.to('host').emit('hb-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('hb-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('hb-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('hb-state', this.hostState());
    socket.on('hb-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('hooi');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('hb-start', () => this.start());
    socket.on('hb-kick', id => this.kick(id));
    socket.on('hb-finish', () => this.finish());
    socket.on('hb-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('hb-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('hb-state', this.base());
    socket.on('hb-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.hbId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('hb-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.hbId ? fn(socket.data.hbId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('hb-prog', (id, v) => this.progress(id, Number(v)));
    on('hb-item', (id, it) => this.item(id, it));
    on('hb-found', (id, k) => this.found(id, Number(k)));
    on('hb-asking', (id, v) => this.asking(id, v));
    on('hb-question', id => guard.question(id));
    on('hb-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.hbId) this.asking(socket.data.hbId, false); });
  }
}

module.exports = { Hooibergjacht };
