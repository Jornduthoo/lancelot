// Burchtstorm: elke leerling bouwt een burcht uit vallende neonstenen. Volle rijen worden katapultstenen
// die als belegeringsrijen onderaan bij een andere ridder terechtkomen.
// Om de acht stenen komt er een vraag. Juist: een 🛡 runeschild (houdt de volgende aanval tegen) en je volgende aanval telt dubbel.
// Drie op rij juist: er vliegt meteen een drakenvuur van drie rijen naar de koploper. Fout: één belegeringsrij bij jezelf.
// Niemand valt af: stort je burcht in, dan begin je opnieuw met een lege schacht (en verlies je wat punten).
// De leerling speelt zelf (geen vertraging); de server kiest de doelwitten, houdt de stand bij en toont alle burchten op het bord.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const Core = require('../public/js/bs-core');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 150;
const KO_WINDOW_MS = 8000;
const MAX_ATTACK = 16;
const POINTS = { rij: 10, lijn: 2, ko: 50, vraag: 15, val: 25 };

class Burchtstorm {
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
    this.ev = [];
    this.nextN = 0;
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
    this.vragen = new Vragen(quiz, 'Burchtstorm', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = existing.boardDirty = true;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const p = {
      n: this.nextN++, name: clean, socketId, color: Core.PLAYER_COLORS[this.players.size % Core.PLAYER_COLORS.length],
      board: '0'.repeat(Core.VIS * Core.W), boardDirty: true, inc: 0, combo: 0,
      lines: 0, pieces: 0, sent: 0, recv: 0, blocked: 0, kos: 0, falls: 0, storms: 0, spins: 0, score: 0,
      shield: false, power: false, lastHit: null, rival: -1, asking: false, seed: Math.floor(Math.random() * 2e9),
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('bs-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.addFeed('🏰 De storm breekt los. Bouw, ruim op en bestook de anderen!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  byN(n) {
    for (const p of this.players.values()) if (p.n === n) return p;
    return null;
  }

  // ---------- Wat de leerling doorstuurt ----------

  board(playerId, { b, l, k, i, c } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return;
    if (typeof b === 'string' && b.length === Core.VIS * Core.W && /^[0-8]+$/.test(b) && b !== p.board) { p.board = b; p.boardDirty = true; }
    if (Number.isFinite(l) && l >= p.lines && l < p.lines + 20) p.lines = l;
    if (Number.isFinite(k) && k >= p.pieces && k < p.pieces + 30) p.pieces = k;
    if (Number.isFinite(i)) p.inc = Math.max(0, Math.min(40, Math.round(i)));
    if (Number.isFinite(c)) p.combo = Math.max(0, Math.min(30, Math.round(c)));
  }

  // Wie krijgt de aanval? Meestal wraak op wie jou het laatst raakte, anders iemand anders.
  // Wie een vraag beantwoordt of net ingestort is, wordt niet bestookt.
  target(p, now, leader = false) {
    const others = [...this.players.values()].filter(o => o !== p && !o.asking && !(o.downUntil > now));
    if (!others.length) return null;
    if (leader) return others.reduce((a, o) => (o.score > a.score ? o : a), others[0]);
    if (p.lastHit && now - p.lastHit.at < 15000 && Math.random() < .45) {
      const o = this.byN(p.lastHit.n);
      if (o && others.includes(o)) return o;
    }
    return others[Math.floor(Math.random() * others.length)];
  }

  hit(p, n, now, kind = 'atk', leader = false) {
    const t = this.target(p, now, leader);
    if (!t) return null;
    p.sent += n;
    if (t.shield) {
      t.shield = false;
      t.blocked += n;
      t.dirty = true;
      this.ev.push(['blok', p.n, t.n, n]);
      return t;
    }
    t.recv += n;
    t.lastHit = { n: p.n, at: now };
    t.rival = p.n;
    t.dirty = true;
    this.io.to(t.socketId).emit('bs-garbage', { n, from: p.n, hole: Math.floor(Math.random() * Core.W) });
    this.ev.push([kind, p.n, t.n, n]);
    return t;
  }

  // Een opruiming met aanval (wat overbleef na het wegwerken van je eigen belegering).
  attack(playerId, { n, lines, spin, combo, pc } = {}) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return {};
    if (lines === 4) p.storms++;
    if (spin && lines > 0) p.spins++;
    let lines2 = Math.max(0, Math.min(MAX_ATTACK, Math.round(Number(n) || 0)));
    // Grote opruimingen ook tonen als er niets overbleef om te sturen.
    if (lines === 4 || (spin && lines > 0) || pc || combo >= 4) this.ev.push(['clr', p.n, lines, spin ? 't' : pc ? 'pc' : '', combo || 0]);
    if (pc) this.addFeed(`✨ ${p.name} maakt de schacht helemaal leeg!`, false);
    else if (lines === 4 && p.storms % 3 === 1) this.addFeed(`⚡ ${p.name}: BURCHTSTORM, vier rijen tegelijk!`, false);
    if (!lines2) return {};
    let doubled = false;
    if (p.power) {
      p.power = false;
      doubled = true;
      lines2 = Math.min(MAX_ATTACK, lines2 * 2);
      p.dirty = true;
    }
    const t = this.hit(p, lines2, now);
    return { n: lines2, doubled, to: t ? t.n : -1 };
  }

  // Je burcht stortte in. Wie je de laatste klap gaf, krijgt de eer.
  topout(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || p.downUntil > now) return;
    p.falls++;
    p.downUntil = now + 2500;
    p.dirty = true;
    const k = p.lastHit && now - p.lastHit.at < KO_WINDOW_MS ? this.byN(p.lastHit.n) : null;
    p.lastHit = null;
    if (k) {
      k.kos++;
      k.dirty = true;
      if (k.kos === 3 || k.kos === 6 || k.kos === 10) this.addFeed(`🔥 ${k.name} liet al ${k.kos} burchten instorten!`);
      else this.addFeed(`💥 ${k.name} doet de burcht van ${p.name} instorten`, false);
    } else this.addFeed(`🧱 De burcht van ${p.name} stort in`, false);
    this.ev.push(['ko', p.n, k ? k.n : -1]);
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    p.dirty = true;
    return { ...res, shield: p.shield, power: p.power, streak: p.streak };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let fire = 0, penalty = 0;
    if (res.correct) {
      p.shield = true;
      p.power = true;
      this.ev.push(['rune', p.n]);
      // Drie op rij: een drakenvuur naar de koploper. Bij rustig tempo iets meer, bij intens iets minder.
      if (p.streak % 3 === 0) {
        fire = Math.max(2, Math.round(3 * factor(this.tempo)));
        this.hit(p, fire, Date.now(), 'vuur', true);
        if (p.streak === 6 || p.streak === 9) this.addFeed(`🐉 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
      }
    } else penalty = 1;
    p.dirty = true;
    return { ...res, shield: p.shield, power: p.power, fire, penalty, streak: p.streak };
  }

  // ---------- Stand ----------

  scoreOf(p) {
    return Math.max(0, p.sent * POINTS.rij + p.lines * POINTS.lijn + p.kos * POINTS.ko + p.right * POINTS.vraag - p.falls * POINTS.val);
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} is de Heer van de Burchtstorm!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.sent, p.lines, p.kos, p.falls, p.storms, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`burchtstorm-${this.quiz.title}`, [['Burchtstorm', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Rijen gestuurd', 'Rijen opgeruimd', 'Burchten neergehaald', 'Zelf ingestort', 'Viervoudige rijen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: this.scoreOf(p), sent: p.sent, lines: p.lines, kos: p.kos, falls: p.falls, storms: p.storms,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.sent - a.sent || b.right - a.right);
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
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, boards: this.boards(true) };
  }

  me(p, ranking) {
    return {
      n: p.n, score: this.scoreOf(p), sent: p.sent, lines: p.lines, kos: p.kos, falls: p.falls, shield: p.shield, power: p.power,
      rival: p.rival, rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size, seed: p.seed,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Vlaggen: 1 schild, 2 dubbele aanval, 4 aan het antwoorden, 8 net ingestort.
  flags(p, now) {
    return (p.shield ? 1 : 0) | (p.power ? 2 : 0) | (p.asking ? 4 : 0) | (p.downUntil > now ? 8 : 0);
  }

  // Alleen de burchten die veranderden (of allemaal), als [n, schacht, vlaggen, inkomend, combo].
  boards(all = false) {
    const now = Date.now();
    const out = [];
    for (const p of this.players.values()) {
      const f = this.flags(p, now);
      if (all || p.boardDirty || f !== p.sentFlags || p.inc !== p.sentInc) {
        out.push([p.n, p.board, f, p.inc, p.combo]);
        p.sentFlags = f;
        p.sentInc = p.inc;
        if (!all) p.boardDirty = false;
      }
    }
    return out;
  }

  send(now) {
    if (this.phase !== 'play') return;
    const changed = new Set();
    const boards = this.boards();
    for (const b of boards) changed.add(b[0]);
    const msg = { ev: this.ev };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('bs-tick', { ...msg, b: boards, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('bs-tick', { ...msg, b: boards });
    // Elke leerling ziet ook de burcht van zijn rivaal (wie hem het laatst raakte, anders de koploper).
    let top = null;
    for (const p of this.players.values()) if (!top || this.scoreOf(p) > this.scoreOf(top)) top = p;
    for (const p of this.players.values()) {
      const out = { ...msg };
      const rv = p.rival >= 0 && this.byN(p.rival) ? this.byN(p.rival) : top !== p ? top : null;
      if (rv && (changed.has(rv.n) || p.sentRival !== rv.n)) {
        out.rv = [rv.n, rv.board, this.flags(rv, now)];
        p.sentRival = rv.n;
      }
      // Om de seconde (met de stand) of als er iets veranderde: je eigen cijfers en plaats.
      if (p.dirty || ranking) {
        p.dirty = false;
        out.me = this.me(p, ranking || this.ranking());
      }
      this.io.to(p.socketId).emit('bs-tick', out);
    }
  }

  broadcast() {
    this.io.to('host').emit('bs-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('bs-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('bs-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('bs-state', this.hostState());
    socket.on('bs-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('storm');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('bs-start', () => this.start());
    socket.on('bs-kick', id => this.kick(id));
    socket.on('bs-finish', () => this.finish());
    socket.on('bs-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('bs-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('bs-state', this.base());
    socket.on('bs-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.bsId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('bs-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.bsId ? fn(socket.data.bsId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('bs-board', (id, m) => this.board(id, m || {}));
    on('bs-attack', (id, m) => this.attack(id, m || {}));
    on('bs-topout', id => this.topout(id));
    on('bs-asking', (id, v) => this.asking(id, v));
    on('bs-question', id => guard.question(id));
    on('bs-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.bsId) this.asking(socket.data.bsId, false);
  }
}

module.exports = { Burchtstorm };
