// Banierveld: alle leerlingen rijden op één groot veld met een zwevend ros en kleuren zo veel mogelijk land in hun kleur.
// Rij je buiten je land, dan laat je een lichtspoor achter. Kom je terug in je land, dan wordt alles binnen je lus van jou.
// Rijdt iemand door jouw spoor terwijl je buiten bent, dan flits je terug naar je burcht. Je land blijft van jou, niemand valt uit.
// Rijden kost energie. Is ze op, dan komt er een vraag: juist = volle energie en ⚡ turbo, drie op rij een 🛡 schild.
// Fout: even wachten (het juiste antwoord blijft staan), een beetje energie, en die vraag komt later terug.
// Tijdens een vraag sta je stil en is je spoor veilig. De server rijdt alle rossen (vakje per vakje) en beslist alles.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const W = require('../public/js/bv-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const TICK_MS = 20;
const SEND_MS = 45;

class Banierveld {
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
    this.byN = new Map();
    this.minutes = 5;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.G = W.size(1);
    this.own = new Uint16Array(this.G * this.G);
    this.trail = new Uint16Array(this.G * this.G);
    this.ev = [];
    this.moved = false;
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.lastSend = 0;
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
    this.vragen = new Vragen(quiz, 'Banierveld', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = true;
      if (this.phase === 'play') setTimeout(() => this.sendWorld(existing), 50);
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    if (this.nextN > 250) return { error: 'Het veld is vol.' };
    const p = {
      n: this.nextN++, name: clean, socketId, color: W.COLORS[this.players.size % W.COLORS.length],
      x: 0, y: 0, d: 0, queue: [], path: [], alive: false, respawnAt: 0, safeUntil: 0, stepAt: 0,
      energy: W.ENERGY, turboUntil: 0, shield: false, cells: 0, peak: 0, cuts: 0, cutBy: 0, best: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.byN.set(p.n, p);
    this.broadcast();
    if (this.phase === 'play') {
      this.base(p, Date.now());
      this.sendWorld();
    }
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.clearPath(p);
    const changes = [];
    for (let i = 0; i < this.own.length; i++) if (this.own[i] === p.n + 1) { this.own[i] = 0; changes.push(i, 0); }
    if (changes.length) this.ev.push(['o', changes]);
    this.players.delete(playerId);
    this.byN.delete(p.n);
    this.io.to(p.socketId).emit('bv-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.G = W.size(this.players.size);
    this.own = new Uint16Array(this.G * this.G);
    this.trail = new Uint16Array(this.G * this.G);
    for (const p of this.players.values()) this.base(p, now, true);
    this.ev = [];
    this.addFeed('🏴 De banieren staan klaar. Verover het veld!');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
    this.sendWorld();
  }

  // ---------- Het veld ----------

  // Een nieuw startland van 5 x 5 met een burcht in het midden, zo ver mogelijk van de anderen.
  base(p, now, first = false) {
    const G = this.G, R = W.START_R, m = R + 2;
    const heads = [...this.players.values()].filter(o => o !== p && o.alive);
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 40; i++) {
      const x = m + Math.floor(Math.random() * (G - 2 * m)), y = m + Math.floor(Math.random() * (G - 2 * m));
      let free = 0;
      for (let yy = y - R - 1; yy <= y + R + 1; yy++) for (let xx = x - R - 1; xx <= x + R + 1; xx++) if (!this.own[yy * G + xx] && !this.trail[yy * G + xx]) free++;
      let near = G;
      for (const o of heads) near = Math.min(near, Math.hypot(o.x - x, o.y - y));
      const score = free * 3 + Math.min(near, 18);
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    const changes = [];
    for (let yy = best.y - R; yy <= best.y + R; yy++) {
      for (let xx = best.x - R; xx <= best.x + R; xx++) {
        const i = yy * G + xx;
        if (this.trail[i]) continue;
        this.setOwner(i, p, changes);
      }
    }
    if (changes.length) this.ev.push(['o', changes]);
    p.home = best.y * G + best.x;
    this.place(p, best.x, best.y, now);
    p.peak = Math.max(p.peak, p.cells);
    if (!first) this.ev.push(['burcht', p.n, p.home]);
  }

  place(p, x, y, now) {
    p.x = x;
    p.y = y;
    p.d = x < this.G / 2 ? 0 : 2;
    p.queue = [];
    p.path = [];
    p.alive = true;
    p.stepAt = Math.max(now, this.startedAt);
    p.safeUntil = Math.max(now, this.startedAt) + W.SAFE_MS;
    p.dirty = true;
  }

  setOwner(i, p, changes) {
    const was = this.own[i];
    const v = p ? p.n + 1 : 0;
    if (was === v) return;
    if (was) { const q = this.byN.get(was - 1); if (q) q.cells--; }
    if (p) p.cells++;
    this.own[i] = v;
    changes.push(i, v);
  }

  clearPath(p) {
    for (const i of p.path) if (this.trail[i] === p.n + 1) this.trail[i] = 0;
    if (p.path.length) this.ev.push(['tc', p.n]);
    p.path = [];
  }

  // Terug in je land: het spoor en alles wat het insluit wordt van jou.
  // We kijken alleen in het kader rond je land en spoor: van de rand van dat kader vullen we alles wat niet van jou is;
  // wat we niet bereiken, ligt binnen je lus.
  capture(p) {
    const G = this.G, me = p.n + 1;
    const changes = [];
    for (const i of p.path) {
      if (this.trail[i] === me) this.trail[i] = 0;
      this.setOwner(i, p, changes);
    }
    p.path = [];
    let x0 = G, y0 = G, x1 = -1, y1 = -1;
    for (let i = 0; i < this.own.length; i++) {
      if (this.own[i] !== me) continue;
      const x = i % G, y = (i - x) / G;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    // Het kader is één vakje groter dan je land (ook buiten het veld): daar begint "buiten".
    const bx = x0 - 1, by = y0 - 1, bw = x1 - x0 + 3, bh = y1 - y0 + 3;
    const seen = new Uint8Array(bw * bh);
    const stack = [];
    const mine = (lx, ly) => {
      const x = lx + bx, y = ly + by;
      return x >= 0 && y >= 0 && x < G && y < G && this.own[y * G + x] === me;
    };
    for (let lx = 0; lx < bw; lx++) for (const ly of [0, bh - 1]) { seen[ly * bw + lx] = 1; stack.push(lx, ly); }
    for (let ly = 1; ly < bh - 1; ly++) for (const lx of [0, bw - 1]) { seen[ly * bw + lx] = 1; stack.push(lx, ly); }
    while (stack.length) {
      const ly = stack.pop(), lx = stack.pop();
      for (const [dx, dy] of W.DIRS) {
        const nx = lx + dx, ny = ly + dy;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
        const k = ny * bw + nx;
        if (seen[k] || mine(nx, ny)) continue;
        seen[k] = 1;
        stack.push(nx, ny);
      }
    }
    for (let ly = 1; ly < bh - 1; ly++) {
      for (let lx = 1; lx < bw - 1; lx++) {
        if (seen[ly * bw + lx] || mine(lx, ly)) continue;
        const i = (ly + by) * G + lx + bx;
        this.setOwner(i, p, changes);
      }
    }
    const gained = changes.length / 2;
    this.ev.push(['cap', p.n, changes]);
    p.peak = Math.max(p.peak, p.cells);
    p.best = Math.max(p.best, gained);
    if (gained >= Math.max(40, this.own.length * .04)) this.addFeed(`🏴 ${p.name} verovert in één keer ${gained} vakjes`, false);
    // Wie al zijn land kwijt is, krijgt een nieuw startland.
    const now = Date.now();
    for (const q of this.players.values()) {
      if (q === p || q.cells > 0 || !q.alive) continue;
      this.clearPath(q);
      this.base(q, now);
      this.io.to(q.socketId).emit('bv-flits', { by: p.n, land: true });
      this.addFeed(`🏰 ${q.name} krijgt een nieuwe burcht`, false);
    }
  }

  ghost(p, now) {
    return p.asking || p.energy <= 0 || p.safeUntil > now;
  }

  // Afgesneden: je spoor is weg en je flitst terug naar je land. Met een schild gebeurt er niets.
  cut(v, by, now) {
    if (v.shield) {
      v.shield = false;
      v.safeUntil = now + 1500;
      v.dirty = true;
      this.ev.push(['schild', v.n]);
      return;
    }
    this.clearPath(v);
    v.alive = false;
    v.asking = false;
    v.respawnAt = now + W.RESPAWN_MS;
    v.cutBy++;
    v.dirty = true;
    if (by) {
      by.cuts++;
      by.dirty = true;
      this.addFeed(`⚔️ ${by.name} snijdt het spoor van ${v.name} door`, false);
      if (by.cuts === 5 || by.cuts === 10) this.addFeed(`🔥 ${by.name} sneed al ${by.cuts} sporen door!`);
    }
    this.ev.push(['flits', v.n, by ? by.n : -1, v.x, v.y]);
  }

  // Terug na een flits: op het vakje van je land dat het dichtst bij je burcht ligt.
  respawn(p, now) {
    const G = this.G, me = p.n + 1;
    if (p.cells <= 0) return this.base(p, now);
    const hx = p.home % G, hy = (p.home - hx) / G;
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.own.length; i++) {
      if (this.own[i] !== me) continue;
      const x = i % G, y = (i - x) / G, d = (x - hx) ** 2 + (y - hy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const x = best % G;
    this.place(p, x, (best - x) / G, now);
  }

  // ---------- Besturing ----------

  turn(playerId, d) {
    const p = this.players.get(playerId);
    if (!p || !Number.isInteger(d) || d < 0 || d > 3) return;
    const lastD = p.queue.length ? p.queue[p.queue.length - 1] : p.d;
    if (d === lastD) return;
    p.queue.push(d);
    if (p.queue.length > 2) p.queue.shift();
  }

  // Eén vakje verder.
  step(p, now) {
    const G = this.G;
    while (p.queue.length) {
      const nd = p.queue.shift();
      // Rechtsomkeer mag alleen zonder spoor, anders rij je over je eigen spoor terug.
      if (nd === (p.d + 2) % 4 && p.path.length) continue;
      p.d = nd;
      break;
    }
    const [dx, dy] = W.DIRS[p.d];
    const nx = p.x + dx, ny = p.y + dy;
    if (nx < 0 || ny < 0 || nx >= G || ny >= G) return; // tegen de rand: wachten tot je draait
    p.x = nx;
    p.y = ny;
    this.moved = true;
    p.energy--;
    if (p.energy === 0 || p.energy === Math.round(W.ENERGY * .2)) p.dirty = true;
    const i = ny * G + nx, me = p.n + 1;
    const t = this.trail[i];
    if (t && t !== me) {
      const v = this.byN.get(t - 1);
      if (v && v.alive && !this.ghost(v, now)) this.cut(v, p, now);
    }
    if (this.own[i] === me) {
      if (p.path.length) this.capture(p);
    } else if (!this.trail[i]) {
      this.trail[i] = me;
      p.path.push(i);
      this.ev.push(['t', p.n, i]);
    }
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    if (was && !p.asking) {
      p.safeUntil = Math.max(p.safeUntil, Date.now() + 1000);
      p.stepAt = Math.max(p.stepAt, Date.now() + 300);
    }
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    p.dirty = true;
    return { ...res, energy: p.energy, land: this.landPct(p) };
  }

  // Juist: volle energie en ⚡ turbo, om de drie op rij een 🛡 schild. Fout: een beetje energie, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let shield = false;
    const now = Date.now();
    if (res.correct) {
      p.energy = Math.round(W.ENERGY * Math.min(1.5, factor(this.tempo)));
      p.turboUntil = Math.max(now, p.turboUntil) + W.TURBO_S * 1000;
      if (p.streak % 3 === 0 && !p.shield) { p.shield = true; shield = true; }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    } else p.energy = Math.max(p.energy, W.WRONG_ENERGY);
    p.dirty = true;
    return { ...res, energy: p.energy, shield: p.shield, gotShield: shield, turbo: res.correct ? W.TURBO_S : 0, streak: p.streak };
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    if (now >= this.startedAt) {
      // In willekeurige volgorde, zodat niemand altijd eerst rijdt.
      const list = [...this.players.values()].sort(() => Math.random() - .5);
      for (const p of list) {
        if (!p.alive) {
          if (now >= p.respawnAt) this.respawn(p, now);
          continue;
        }
        if (p.asking || p.energy <= 0) { p.stepAt = Math.max(p.stepAt, now); continue; }
        let guard = 3;
        while (p.alive && now >= p.stepAt && guard-- > 0) {
          p.stepAt += p.turboUntil > now ? W.TURBO_MS : W.STEP_MS;
          this.step(p, now);
        }
        if (now - p.stepAt > 500) p.stepAt = now;
      }
    }
    if (now - this.lastSend >= SEND_MS && (this.moved || this.ev.length || this.feedChanged || now - this.lastSend > 400)) {
      this.lastSend = now;
      this.moved = false;
      this.send(now);
    }
  }

  landPct(p) {
    return Math.round((p.cells / this.own.length) * 1000) / 10;
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} verovert het meeste land!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, String(p.land).replace('.', ','), String(p.peak).replace('.', ','), p.cuts, p.cutBy, p.best, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`banierveld-${this.quiz.title}`, [['Banierveld', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Land %', 'Meeste land %', 'Sporen doorgesneden', 'Zelf afgesneden', 'Grootste verovering (vakjes)', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    const total = this.own.length;
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, land: Math.round((p.cells / total) * 1000) / 10, peak: Math.round((p.peak / total) * 1000) / 10,
        score: Math.round((p.cells / total) * 1000) / 10, cuts: p.cuts, cutBy: p.cutBy, best: p.best, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.land - a.land || b.cuts - a.cuts || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base0() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, G: this.G,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base0(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, alive: p.alive, energy: p.energy, shield: p.shield, turbo: Math.max(0, p.turboUntil - now), land: this.landPct(p), cuts: p.cuts, cutBy: p.cutBy,
      respawn: p.alive ? 0 : Math.max(0, p.respawnAt - now), safe: Math.max(0, p.safeUntil - now), home: p.home,
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size, peak: Math.round((p.peak / this.own.length) * 1000) / 10,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base0();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Het hele veld (bij de start, voor wie later binnenkomt of herlaadt).
  worldMsg() {
    return {
      G: this.G, own: W.rle(this.own),
      paths: [...this.players.values()].filter(p => p.path.length).map(p => [p.n, p.path]),
      homes: [...this.players.values()].map(p => [p.n, p.home]),
    };
  }

  sendWorld() {
    const msg = this.worldMsg();
    this.io.to('host').emit('bv-world', msg);
    for (const p of this.players.values()) this.io.to(p.socketId).emit('bv-world', msg);
  }

  // Compact: [n, x, y, richting, vlaggen]. Vlaggen: 1 turbo, 2 aan het antwoorden, 4 beschermd, 8 schild, 16 energie op.
  send(now) {
    const flags = p => (p.turboUntil > now ? 1 : 0) | (p.asking ? 2 : 0) | (p.safeUntil > now ? 4 : 0) | (p.shield ? 8 : 0) | (p.energy <= 0 ? 16 : 0);
    const msg = { k: [...this.players.values()].filter(p => p.alive).map(p => [p.n, p.x, p.y, p.d, flags(p)]), ev: this.ev };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('bv-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('bv-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('bv-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('bv-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('bv-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('bv-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('bv-state', this.base0());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('bv-state', this.hostState());
    if (this.phase === 'play') socket.emit('bv-world', this.worldMsg());
    socket.on('bv-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('banier');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('bv-start', () => this.start());
    socket.on('bv-kick', id => this.kick(id));
    socket.on('bv-finish', () => this.finish());
    socket.on('bv-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('bv-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('bv-state', this.base0());
    socket.on('bv-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.bvId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) {
        socket.emit('bv-state', this.playerState(playerId));
        if (this.phase === 'play') socket.emit('bv-world', this.worldMsg());
      }
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.bvId ? fn(socket.data.bvId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('bv-turn', (id, d) => this.turn(id, d));
    on('bv-asking', (id, v) => this.asking(id, v));
    on('bv-question', id => guard.question(id));
    on('bv-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.bvId) this.asking(socket.data.bvId, false); });
  }
}

module.exports = { Banierveld };
