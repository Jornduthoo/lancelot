// Pixelridder: elke leerling rent en springt met zijn eigen ridder door zijwaarts scrollende werelden in retro pixelstijl.
// Iedereen speelt dezelfde werelden (zelfde seed) en ziet klasgenoten in dezelfde wereld als doorschijnende ridders.
// Spring je tegen een runeblok, dan krijg je een vraag. Juist: een power-up komt uit het blok (energiekristal = groter,
// plasmazwaard = schieten, sterrenschild = even onkwetsbaar). Fout: even wachten, de vraag komt later terug, en het blok geeft maar een munt.
// Elke runepoort brengt je naar een nieuwe, moeilijkere wereld. Niemand valt af: wie valt, begint opnieuw bij de laatste vlag.
// De leerling speelt zelf (geen vertraging); de server controleert munten, vijanden en poorten, houdt de stand bij en toont alles op het bord.
const World = require('../public/js/px-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 100;
const COLORS = ['#ff4d6d', '#4cc9ff', '#ffd166', '#39ffb0', '#c77dff', '#ff8c42', '#ff5fd2', '#9be15d', '#5ee7ff', '#f4f1de'];
const STOMP = [100, 200, 400, 800, 1000];
const POINTS = { munt: 10, poort: 500, vraag: 50, val: 50 };
const STAR_MS = 8000;
const MIN_WORLD_MS = 8000;

class Pixelridder {
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
    this.seed = 1;
    this.worlds = new Map();
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

  world(w) {
    let wd = this.worlds.get(w);
    if (!wd) {
      wd = World.make(this.seed, w);
      // Hoeveel munten er in die wereld maximaal te rapen zijn (losse munten, muntstenen, verborgen blokken, runeblokken).
      let extra = 0;
      for (const t of wd.tiles) if (t === World.COINBRICK) extra += 6; else if (t === World.HIDDEN) extra += 5; else if (t === World.RUNE) extra += 1;
      wd.maxCoins = wd.coins + extra + 4;
      wd.enemyIds = new Set(wd.enemies.map(e => e.id));
      this.worlds.set(w, wd);
    }
    return wd;
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Pixelridder', this.tempo);
    this.seed = Math.floor(Math.random() * 2e9);
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
    const p = {
      n: this.nextN++, name: clean, socketId, color: COLORS[this.players.size % COLORS.length],
      w: 0, x: 40, y: World.GY * World.T, f: 0, worldAt: Math.max(Date.now(), this.startedAt), check: false,
      coins: 0, coinSet: new Set(), killSet: new Set(), shellSet: new Set(), gone: [], kills: 0, worlds: 0, deaths: 0, pts: 0,
      power: 0, starUntil: 0, grant: null, asking: false,
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
    this.io.to(p.socketId).emit('px-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.worldAt = this.startedAt;
    this.world(0);
    this.addFeed('🎮 De pixelridders rennen weg. Op naar de runepoort!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  byN(n) {
    for (const p of this.players.values()) if (p.n === n) return p;
    return null;
  }

  // ---------- Wat de leerling doorstuurt ----------

  // Positie (tien keer per seconde) met wat er intussen gebeurde: munten, blokken, vijanden, power-ups, vallen.
  pos(playerId, { w, x, y, f, ev } = {}) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt || w !== p.w) return;
    const wd = this.world(p.w);
    if (Number.isFinite(x)) p.x = Math.max(0, Math.min(wd.len * World.T, x));
    if (Number.isFinite(y)) p.y = Math.max(-64, Math.min(World.H + 64, y));
    if (Number.isInteger(f)) p.f = f & 127;
    if (!Array.isArray(ev)) return;
    for (const e of ev.slice(0, 24)) {
      if (!Array.isArray(e)) continue;
      const [kind, a, b] = e;
      if (kind === 'c' && Number.isInteger(a) && !p.coinSet.has(a) && p.coinSet.size < wd.maxCoins) {
        p.coinSet.add(a);
        p.coins++;
        if (a < wd.tiles.length) this.gone(p, ['c', a]);
        if (p.coins % 50 === 0) this.addFeed(`🪙 ${p.name} heeft al ${p.coins} munten`, false);
      } else if (kind === 'b' && Number.isInteger(a) && a >= 0 && a < wd.tiles.length && (b === World.AIR || b === World.USED)) {
        this.gone(p, ['b', a, b]);
      } else if ((kind === 'k' || kind === 's') && wd.enemyIds.has(a)) {
        const set = kind === 'k' ? p.killSet : p.shellSet;
        if (set.has(a)) continue;
        set.add(a);
        if (kind === 'k') p.kills++;
        if (kind === 'k' && p.shellSet.has(a)) { this.gone(p, ['k', a]); continue; }
        p.pts += STOMP[Math.max(0, Math.min(STOMP.length - 1, Number(b) || 0))];
        this.gone(p, [kind, a]);
      } else if (kind === 'p' && a === p.grant) {
        p.grant = null;
        if (a === 'kristal') p.power = Math.max(p.power, 1);
        else if (a === 'zwaard') p.power = 2;
        else if (a === 'ster') p.starUntil = now + STAR_MS;
        p.dirty = true;
        this.ev.push(['pw', p.n, a]);
      } else if (kind === 'h' && p.starUntil < now) {
        p.power = Math.max(0, p.power - 1);
        p.dirty = true;
      } else if (kind === 'd') {
        p.deaths++;
        p.pts -= POINTS.val;
        p.power = 0;
        p.starUntil = 0;
        p.dirty = true;
        this.ev.push(['d', p.n]);
      } else if (kind === 'cp' && wd.check && p.x >= (wd.check - 3) * World.T) {
        p.check = true;
        this.gone(p, ['cp']);
      }
    }
  }

  gone(p, item) {
    if (p.gone.length < 600) p.gone.push(item);
    this.ev.push(['g', p.n, p.w, ...item]);
  }

  // Door de runepoort: punten (sneller = meer) en de volgende wereld.
  gate(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const wd = this.world(p.w);
    if (p.x < (wd.gate - 2) * World.T || now - p.worldAt < MIN_WORLD_MS) return { error: 'Nog niet aan de poort.' };
    const secs = (now - p.worldAt) / 1000;
    const bonus = Math.max(0, Math.round(400 - secs * 3));
    p.pts += POINTS.poort + bonus;
    p.worlds++;
    const done = p.w;
    p.w++;
    p.worldAt = now;
    p.coinSet = new Set();
    p.killSet = new Set();
    p.shellSet = new Set();
    p.gone = [];
    p.check = false;
    p.x = 40;
    p.dirty = true;
    this.world(p.w);
    this.world(p.w + 1);
    this.ev.push(['poort', p.n, done]);
    const first = ![...this.players.values()].some(o => o !== p && o.w >= p.w);
    if (first) this.addFeed(`🏁 ${p.name} is als eerste in wereld ${p.w + 1}: ${World.THEMES[p.w % World.THEMES.length].name}!`);
    else this.addFeed(`🏁 ${p.name} haalt de runepoort van wereld ${done + 1}`, false);
    return { ok: true, w: p.w, bonus, points: POINTS.poort + bonus };
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
    return { ...res, power: p.power, streak: p.streak };
  }

  // Juist: de volgende power-up (kristal, dan zwaard, dan sterrenschild) en punten. Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let grant = null, points = 0;
    if (res.correct) {
      grant = p.power === 0 ? 'kristal' : p.power === 1 ? 'zwaard' : 'ster';
      p.grant = grant;
      points = Math.round(POINTS.vraag * factor(this.tempo));
      p.pts += points;
      this.ev.push(['rune', p.n]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, grant, points, streak: p.streak };
  }

  // ---------- Stand ----------

  scoreOf(p) {
    return Math.max(0, p.pts + p.coins * POINTS.munt);
  }

  progress(p) {
    const wd = this.worlds.get(p.w);
    return p.w + (wd ? Math.min(1, p.x / (wd.gate * World.T)) : 0);
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} is de grootste Pixelridder!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.worlds, p.coins, p.kills, p.deaths, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`pixelridder-${this.quiz.title}`, [['Pixelridder', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Werelden gehaald', 'Munten', 'Vijanden verslagen', 'Keer gevallen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: this.scoreOf(p), w: p.w, worlds: p.worlds, coins: p.coins, kills: p.kills, deaths: p.deaths,
        prog: +this.progress(p).toFixed(3), bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.prog - a.prog || b.right - a.right);
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

  // Het bord krijgt ook per leerling wat er in zijn wereld al veranderde, zodat de camera's kloppen na herladen.
  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, cams: [...this.players.values()].map(p => [p.n, p.w, p.gone]) };
  }

  me(p, ranking, now = Date.now()) {
    return {
      n: p.n, w: p.w, score: this.scoreOf(p), coins: p.coins, worlds: p.worlds, kills: p.kills, deaths: p.deaths, power: p.power,
      star: Math.max(0, p.starUntil - now), grant: p.grant, rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), gone: p.gone, check: p.check, right: p.right, wrong: p.wrong });
    return state;
  }

  // Compact: [n, wereld, x, y, vlaggen]. Vlaggen (van de leerling): 1-2 kracht, 4 ster, 8 naar links, 16-32 houding, 64 knipperen; 128 aan het antwoorden.
  send(now) {
    if (this.phase !== 'play') return;
    const all = [];
    const byWorld = new Map();
    for (const p of this.players.values()) {
      const row = [p.n, p.w, Math.round(p.x), Math.round(p.y), p.f | (p.asking ? 128 : 0)];
      all.push(row);
      let list = byWorld.get(p.w);
      if (!list) { list = []; byWorld.set(p.w, list); }
      list.push(row);
    }
    const msg = { k: all, ev: this.ev };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('px-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('px-tick', msg);
    // Elke leerling ziet de anderen in dezelfde wereld, en hoort wie er een poort haalt.
    const big = msg.ev.filter(e => e[0] === 'poort' || e[0] === 'pw');
    for (const p of this.players.values()) {
      const out = { o: (byWorld.get(p.w) || []).filter(r => r[0] !== p.n).map(r => [r[0], r[2], r[3], r[4]]) };
      if (big.length) out.ev = big;
      if (p.dirty || ranking) {
        p.dirty = false;
        out.me = this.me(p, ranking || this.ranking(), now);
      }
      this.io.to(p.socketId).emit('px-tick', out);
    }
  }

  broadcast() {
    this.io.to('host').emit('px-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('px-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('px-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('px-state', this.hostState());
    socket.on('px-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('pixel');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('px-start', () => this.start());
    socket.on('px-kick', id => this.kick(id));
    socket.on('px-finish', () => this.finish());
    socket.on('px-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('px-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('px-state', this.base());
    socket.on('px-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.pxId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('px-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.pxId ? fn(socket.data.pxId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('px-pos', (id, m) => this.pos(id, m || {}));
    on('px-gate', id => this.gate(id));
    on('px-asking', (id, v) => this.asking(id, v));
    on('px-question', id => guard.question(id));
    on('px-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.pxId) this.asking(socket.data.pxId, false); });
  }
}

module.exports = { Pixelridder };
