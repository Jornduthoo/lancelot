// Raketridder: iedereen vliegt op zijn eigen scherm met een raketridder door dezelfde hindernisbaan in de lucht.
// Platforms, torenmuren, stekels, lasers en vuurraderen; onderaan wacht de lava. De raket heeft maar zoveel brandstof:
// landen vult hem weer bij. Val je, dan begin je opnieuw bij de laatste vlag.
// Elke vlag is een vraag. Juist: ⚡ turbo (sneller en onbeperkt brandstof) en punten. Fout: even wachten, die vraag komt later terug.
// Snel zijn loont: hoe sneller je een etappe vliegt, hoe meer punten de vlag geeft.
// De leerling vliegt zelf (geen vertraging); de server controleert de vlaggen en de energiecellen en houdt de stand bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/jp-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 100;
const POINTS = { vlag: 100, snel: 6, cel: 10, vraag: 60 };
const SNEL_S = 30; // onder deze tijd krijg je per seconde extra punten aan de vlag

class Raketridder {
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
    this.seed = 1 + Math.floor(Math.random() * 90000);
    this.vragen = new Vragen(quiz, 'Raketridder', this.tempo);
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
    const spawn = World.spawnOf(0);
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      x: spawn.x, y: spawn.y, f: 0, stage: 0, stageAt: Math.max(Date.now(), this.startedAt), best: 0, cells: new Set(), falls: 0, pts: 0, asking: false,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('jp-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.stageAt = this.startedAt;
    this.addFeed('🚀 De raketten branden. Op naar de eerste vlag!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Wat de leerling doorstuurt ----------

  // Positie (tien keer per seconde). f: 1 raket aan, 2 kijkt naar links, 4 turbo, 8 gevallen.
  pos(playerId, { x, y, f } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || Date.now() < this.startedAt) return;
    if (Number.isFinite(x)) p.x = Math.max(-6, Math.min((p.stage + 1) * World.L + 8, x));
    if (Number.isFinite(y)) p.y = Math.max(-3, Math.min(World.H + 2, y));
    p.f = Number(f) & 15;
  }

  // Gevallen: alleen voor de stand (geen strafpunten, wel tijd kwijt).
  fall(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    p.falls++;
    if (p.falls === 1 || p.falls % 10 === 0) p.dirty = true;
  }

  // Een energiecel geraapt: alleen in de etappe waar je bent (of de vorige, net over de vlag), en elke cel één keer.
  cell(playerId, id) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || typeof id !== 'string' || p.cells.has(id)) return {};
    const k = Number(id.split('.')[0]);
    if (!(k === p.stage || k === p.stage - 1)) return {};
    if (!World.stage(this.seed, k).cells.some(c => c.id === id)) return {};
    p.cells.add(id);
    p.pts += POINTS.cel;
    p.dirty = true;
    return { ok: true };
  }

  // Over de vlag van etappe k: punten, sneller = meer. Daarna komt de vraag.
  flag(playerId, k) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (k !== p.stage + 1) return { error: 'Verkeerde vlag.', stage: p.stage };
    const s = (now - p.stageAt) / 1000;
    if (s < World.MIN_STAGE_S || p.x < k * World.L - 4) return { error: 'Te snel.', stage: p.stage };
    p.stage = k;
    p.stageAt = now;
    const snel = Math.max(0, Math.round((SNEL_S - s) * POINTS.snel));
    p.pts += POINTS.vlag + snel;
    p.dirty = true;
    const rec = this.records.get(k);
    const first = ![...this.players.values()].some(o => o !== p && o.stage >= k);
    let record = false;
    if (!rec || s < rec.s) {
      this.records.set(k, { s, name: p.name });
      record = Boolean(rec);
    }
    if (first && (k <= 3 || k % 3 === 0)) {
      const theme = k % 3 === 0 ? ` en vliegt de ${World.themeOf(k).name} in` : '';
      this.addFeed(`🏁 ${p.name} haalt als eerste vlag ${k}${theme}!`);
    } else if (record) this.addFeed(`⏱️ Record: ${p.name} vliegt etappe ${k} in ${s.toFixed(1).replace('.', ',')} s`, false);
    return { ok: true, stage: k, s, points: POINTS.vlag + snel, record };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    // De tijd van de volgende etappe loopt pas als de vraag weg is.
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

  // Juist: turbo en punten. Fout: even wachten (het juiste antwoord blijft staan), de vraag komt later terug.
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
    if (top) this.addFeed(`🏆 ${top.name} wint Raketridder!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.stage, p.cells, p.falls, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`raketridder-${this.quiz.title}`, [['Raketridder', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Vlaggen', 'Energiecellen', 'Gevallen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.pts), stage: p.stage, cells: p.cells.size, falls: p.falls,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.stage - a.stage);
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
    return { n: p.n, score: r.score || 0, stage: p.stage, cells: p.cells.size, falls: p.falls, rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong, x: p.x, y: p.y, stage: p.stage, cellIds: [...p.cells] });
    return state;
  }

  // Iedereen krijgt de plek van iedereen: [n, x, y, vlaggen, etappe]. Vlaggen: 1 raket, 2 links, 4 turbo, 8 gevallen, 16 vraag.
  send(now) {
    const msg = { r: [...this.players.values()].map(p => [p.n, Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, p.f | (p.asking ? 16 : 0), p.stage]) };
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('jp-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('jp-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('jp-tick', { ...msg, me: this.me(p, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('jp-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('jp-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('jp-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('jp-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('jp-state', this.hostState());
    socket.on('jp-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('raket');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('jp-start', () => this.start());
    socket.on('jp-kick', id => this.kick(id));
    socket.on('jp-finish', () => this.finish());
    socket.on('jp-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('jp-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('jp-state', this.base());
    socket.on('jp-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.jpId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('jp-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.jpId ? fn(socket.data.jpId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('jp-pos', (id, m) => this.pos(id, m || {}));
    on('jp-fall', id => this.fall(id));
    on('jp-cell', (id, c) => this.cell(id, c));
    on('jp-flag', (id, k) => this.flag(id, Number(k)));
    on('jp-asking', (id, v) => this.asking(id, v));
    on('jp-question', id => guard.question(id));
    on('jp-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.jpId) this.asking(socket.data.jpId, false);
  }
}

module.exports = { Raketridder };
