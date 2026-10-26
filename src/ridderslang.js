// Ridderslang: elke leerling is een neon lansslang in één arena, zoals slither.io.
// Eet lichtbollen om langer te worden. Raakt je lans het lichaam van een ander, dan spat jij uiteen in licht dat de rest opeet.
// Goede antwoorden geven lengte, ⚡ boost en (drie op rij) een 🛡 schild dat één botsing tegenhoudt.
// Tijdens een vraag word je een geest: je staat stil, niemand kan je raken en jij raakt niemand.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De leerling stuurt zelf (geen vertraging) en stuurt zijn kop door; de server houdt de lichamen bij en beslist over botsingen.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/rs-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const TICK_MS = 33;
const SEND_MS = 50;
const RESPAWN_MS = 3000;
const SAFE_MS = 2500;
const AFTER_QUESTION_MS = 1200;
const CELL = 120;
const POINTS = { slag: 50, kroon: 2 };

class Ridderslang {
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
    this.startedAt = 0;
    this.endsAt = 0;
    this.R = World.arenaR(1);
    this.dust = new Map();
    this.grid = new Map();
    this.nextDust = 1;
    this.ev = [];
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.king = -1;
    this.resultsFile = null;
    this.lastTick = 0;
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
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 6;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Ridderslang', this.tempo);
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
    const p = {
      n: this.nextN++, name: clean, socketId, color: World.COLORS[this.players.size % World.COLORS.length],
      x: 0, y: 0, a: 0, L: World.START, path: [], alive: false, respawnAt: 0, safeUntil: 0, boostMs: 2000, boosting: false, shield: false,
      moveAt: 0, fix: 0, bonus: 0, kills: 0, deaths: 0, peak: World.START, kingMs: 0, score: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.broadcast();
    if (this.phase === 'play') {
      this.respawn(p, Date.now());
      this.sendWorld(p);
    }
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('rs-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.R = World.arenaR(this.players.size);
    for (let i = World.dustCount(this.players.size); i > 0; i--) this.addDust(null, null, 1, false);
    for (const p of this.players.values()) this.respawn(p, now, true);
    this.ev = [];
    this.addFeed('🐍 De lansslangen zijn wakker. Eet licht en snij anderen af!');
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
    for (const p of this.players.values()) this.sendWorld(p);
    this.io.to('host').emit('rs-world', this.worldList());
  }

  // ---------- Lichtbollen ----------

  key(x, y) {
    return `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  }

  addDust(x, y, v = 1, announce = true) {
    if (x === null) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (this.R - 60);
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
    }
    const d0 = Math.hypot(x, y), max = this.R - 40;
    if (d0 > max) { x = (x / d0) * max; y = (y / d0) * max; }
    const dust = { id: this.nextDust++, x: Math.round(x), y: Math.round(y), v, c: v >= 3 ? 2 : Math.floor(Math.random() * World.DUST.length) };
    dust.k = this.key(dust.x, dust.y);
    this.dust.set(dust.id, dust);
    let cell = this.grid.get(dust.k);
    if (!cell) { cell = new Set(); this.grid.set(dust.k, cell); }
    cell.add(dust);
    if (announce) this.ev.push(['+', dust.id, dust.x, dust.y, v, dust.c]);
    return dust;
  }

  removeDust(d, by) {
    this.dust.delete(d.id);
    const cell = this.grid.get(d.k);
    if (cell) cell.delete(d);
    this.ev.push(['-', d.id, by]);
  }

  worldList() {
    return {
      R: this.R, list: [...this.dust.values()].map(d => [d.id, d.x, d.y, d.v, d.c]),
      paths: [...this.players.values()].filter(p => p.alive).map(p => [p.n, p.path.filter((_, i) => i % 6 < 2).map(Math.round)]),
    };
  }

  sendWorld(p) {
    this.io.to(p.socketId).emit('rs-world', { ...this.worldList(), x: Math.round(p.x), y: Math.round(p.y), a: p.a, fix: p.fix });
  }

  respawn(p, now, first = false) {
    const others = [...this.players.values()].filter(o => o !== p && o.alive).map(o => [o.x, o.y]);
    const at = World.spawn(this.R, others);
    p.x = at.x;
    p.y = at.y;
    p.a = at.a;
    p.L = World.START + p.bonus;
    p.bonus = 0;
    p.path = [];
    World.grow(p.path, p.x, p.y, 0);
    // Een kort lichaam achter de kop, zodat je meteen een slang bent.
    for (let i = 1; i <= Math.ceil(World.bodyLen(p.L) / World.STEP); i++) p.path.push(p.x - Math.cos(p.a) * World.STEP * i, p.y - Math.sin(p.a) * World.STEP * i);
    p.alive = true;
    p.moveAt = now;
    p.safeUntil = Math.max(now, this.startedAt) + SAFE_MS;
    p.fix++;
    p.dirty = true;
    this.ev.push(['in', p.n, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2)]);
    if (!first) this.io.to(p.socketId).emit('rs-pos', { x: Math.round(p.x), y: Math.round(p.y), a: p.a, fix: p.fix, respawn: true });
  }

  // ---------- Besturing ----------

  move(playerId, { x, y, a, b, fix } = {}) {
    const p = this.players.get(playerId);
    if (!p || !p.alive || p.asking || fix !== p.fix || this.phase !== 'play') return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    if (now < this.startedAt) return;
    const ms = Math.min(1000, now - p.moveAt);
    const boost = Boolean(b) && p.boostMs > 0;
    const max = World.SPEED * (boost || p.boosting ? World.BOOST : 1) * (ms / 1000) * 1.6 + 50;
    if (Math.hypot(x - p.x, y - p.y) > max) {
      p.fix++;
      this.io.to(p.socketId).emit('rs-pos', { x: Math.round(p.x), y: Math.round(p.y), a: p.a, fix: p.fix });
      return;
    }
    if (boost) {
      p.boostMs = Math.max(0, p.boostMs - ms);
      if (p.boostMs === 0) p.dirty = true;
    }
    if (boost !== p.boosting) { p.boosting = boost; p.dirty = true; }
    p.x = x;
    p.y = y;
    if (Number.isFinite(a)) p.a = a;
    p.moveAt = now;
    World.grow(p.path, x, y, World.bodyLen(p.L));
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    if (was && !p.asking) p.safeUntil = Math.max(p.safeUntil, Date.now() + AFTER_QUESTION_MS);
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = p.alive;
    p.boosting = false;
    p.dirty = true;
    return { ...res, alive: p.alive, L: Math.round(p.L), boost: p.boostMs, shield: p.shield };
  }

  // Juist: lengte, ⚡ boost en om de drie op rij een 🛡 schild. Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let gained = 0, shield = false;
    if (res.correct) {
      gained = Math.round((8 + 3 * Math.min(p.streak - 1, 5)) * factor(this.tempo) + p.L * .04);
      if (p.alive) {
        p.L += gained;
        p.peak = Math.max(p.peak, p.L);
      } else p.bonus = Math.min(80, p.bonus + gained);
      p.boostMs = Math.min(World.MAX_BOOST, p.boostMs + World.BOOST_PER_ANSWER);
      if (p.streak % 3 === 0 && !p.shield) { p.shield = true; shield = true; }
      this.ev.push(['grow', p.n, gained]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, alive: p.alive, gained, boost: p.boostMs, shield: p.shield, gotShield: shield, L: Math.round(p.L), streak: p.streak };
  }

  // ---------- Spel ----------

  ghost(p, now) {
    return p.asking || p.safeUntil > now;
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now < this.startedAt) return this.maybeSend(now);
    const alive = [...this.players.values()].filter(p => p.alive);
    // Alle lichaamspunten in een rooster, zodat botsingen ook met dertig lange slangen snel gaan.
    const body = new Map();
    for (const p of alive) {
      if (this.ghost(p, now)) continue;
      const path = p.path;
      for (let i = 0; i < path.length; i += 2) {
        const k = this.key(path[i], path[i + 1]);
        let cell = body.get(k);
        if (!cell) { cell = []; body.set(k, cell); }
        cell.push(p, path[i], path[i + 1]);
      }
    }
    const dead = [];
    for (const p of alive) {
      const w = World.width(p.L);
      // Lichtbollen eten met de kop (een beetje magnetisch).
      if (!p.asking) {
        const reach = w * .6 + 22;
        const x0 = Math.floor((p.x - reach) / CELL), x1 = Math.floor((p.x + reach) / CELL);
        const y0 = Math.floor((p.y - reach) / CELL), y1 = Math.floor((p.y + reach) / CELL);
        for (let cx = x0; cx <= x1; cx++) {
          for (let cy = y0; cy <= y1; cy++) {
            const cell = this.grid.get(`${cx},${cy}`);
            if (!cell) continue;
            for (const d of cell) {
              if ((d.x - p.x) ** 2 + (d.y - p.y) ** 2 > reach * reach) continue;
              p.L += d.v * .5;
              this.removeDust(d, p.n);
            }
          }
        }
        p.peak = Math.max(p.peak, p.L);
      }
      if (this.ghost(p, now)) continue;
      // Tegen de burchtmuur
      if (Math.hypot(p.x, p.y) > this.R - w * .5) { dead.push([p, null]); continue; }
      // Tegen een ander lichaam
      const cx0 = Math.floor(p.x / CELL);
      const cy0 = Math.floor(p.y / CELL);
      let killer = null;
      for (let cx = cx0 - 1; cx <= cx0 + 1 && !killer; cx++) {
        for (let cy = cy0 - 1; cy <= cy0 + 1 && !killer; cy++) {
          const cell = body.get(`${cx},${cy}`);
          if (!cell) continue;
          for (let i = 0; i < cell.length; i += 3) {
            const o = cell[i];
            if (o === p) continue;
            const reach = (w + World.width(o.L)) * .4;
            if ((cell[i + 1] - p.x) ** 2 + (cell[i + 2] - p.y) ** 2 < reach * reach) { killer = o; break; }
          }
        }
      }
      if (killer) dead.push([p, killer]);
    }
    for (const [p, killer] of dead) this.crash(p, killer, now);
    // De kroon voor de langste slang, met punten voor elke seconde dat je hem draagt.
    let king = null;
    for (const p of this.players.values()) if (p.alive && (!king || p.L > king.L)) king = p;
    if (king) {
      king.kingMs += dt * 1000;
      if (king.n !== this.king) {
        this.king = king.n;
        this.ev.push(['kroon', king.n]);
        if (this.players.size > 1 && king.L >= 60 && now - (this.kingFeedAt || 0) > 8000) {
          this.kingFeedAt = now;
          this.addFeed(`👑 ${king.name} is nu de langste slang`, false);
        }
      }
    }
    for (const p of this.players.values()) {
      p.score = Math.round(p.peak) + p.kills * POINTS.slag + Math.floor(p.kingMs / 1000) * POINTS.kroon;
      if (!p.alive && now >= p.respawnAt) this.respawn(p, now);
    }
    const want = World.dustCount(this.players.size);
    let base = 0;
    for (const d of this.dust.values()) if (d.v === 1) base++;
    for (let i = 0; i < 5 && base < want; i++, base++) this.addDust(null, null, 1);
    if (this.dust.size > want * 1.8) {
      let extra = this.dust.size - Math.round(want * 1.8);
      for (const d of this.dust.values()) {
        if (extra <= 0) break;
        if (d.v > 1) { this.removeDust(d, -1); extra--; }
      }
    }
    this.maybeSend(now);
  }

  // Botsing: met een schild overleef je het één keer. Anders spat je uiteen in licht langs je hele lichaam.
  crash(p, killer, now) {
    if (!p.alive) return;
    if (p.shield) {
      p.shield = false;
      p.safeUntil = now + 1500;
      p.dirty = true;
      this.ev.push(['schild', p.n, Math.round(p.x), Math.round(p.y)]);
      return;
    }
    p.alive = false;
    p.asking = false;
    p.boosting = false;
    p.deaths++;
    p.respawnAt = now + RESPAWN_MS;
    p.dirty = true;
    const pts = p.path.length / 2;
    const pieces = Math.max(4, Math.min(45, Math.round(pts / 3)));
    const v = Math.max(1, Math.round((p.L * .8) / pieces));
    for (let i = 0; i < pieces; i++) {
      const j = Math.floor((i / pieces) * pts) * 2;
      this.addDust(p.path[j] + (Math.random() - .5) * 26, p.path[j + 1] + (Math.random() - .5) * 26, v);
    }
    this.ev.push(['dood', p.n, killer ? killer.n : -1, Math.round(p.x), Math.round(p.y), Math.round(p.L)]);
    if (killer) {
      killer.kills++;
      killer.dirty = true;
      this.addFeed(`⚔️ ${p.name} botst op ${killer.name}`, false);
      if (killer.kills === 5 || killer.kills === 10) this.addFeed(`🔥 Al ${killer.kills} slangen botsten op ${killer.name}!`);
    } else this.addFeed(`🧱 ${p.name} vliegt tegen de burchtmuur`, false);
    p.path = [];
  }

  maybeSend(now) {
    if (now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} is de machtigste Ridderslang!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.peak, p.kills, p.deaths, p.king, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`ridderslang-${this.quiz.title}`, [['Ridderslang', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Grootste lengte', 'Afgesneden', 'Zelf gebotst', 'Seconden met de kroon', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: p.score, L: Math.round(p.L), peak: Math.round(p.peak), kills: p.kills, deaths: p.deaths,
        king: Math.floor(p.kingMs / 1000), bestStreak: p.bestStreak, right: p.right, wrong: p.wrong, alive: p.alive,
      }))
      .sort((a, b) => b.score - a.score || b.peak - a.peak || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, R: this.R,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, L: Math.round(p.L), alive: p.alive, boost: p.boostMs, shield: p.shield, bonus: p.bonus, kills: p.kills, deaths: p.deaths, score: p.score,
      peak: Math.round(p.peak), respawn: p.alive ? 0 : Math.max(0, p.respawnAt - now), safe: Math.max(0, p.safeUntil - now),
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Compact: [n, x, y, hoek, lengte, vlaggen]. Vlaggen: 2 aan het antwoorden, 4 beschermd, 8 boost, 16 schild.
  send(now) {
    const flags = p => (p.asking ? 2 : 0) | (p.safeUntil > now ? 4 : 0) | (p.boosting ? 8 : 0) | (p.shield ? 16 : 0);
    const msg = {
      k: [...this.players.values()].filter(p => p.alive).map(p => [p.n, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), Math.round(p.L), flags(p)]),
      ev: this.ev, king: this.king,
    };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('rs-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('rs-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('rs-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('rs-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('rs-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('rs-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('rs-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('rs-state', this.hostState());
    if (this.phase === 'play') socket.emit('rs-world', this.worldList());
    socket.on('rs-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('slang');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('rs-start', () => this.start());
    socket.on('rs-kick', id => this.kick(id));
    socket.on('rs-finish', () => this.finish());
    socket.on('rs-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('rs-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('rs-state', this.base());
    socket.on('rs-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.rsId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('rs-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.rsId ? fn(socket.data.rsId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('rs-move', (id, m) => this.move(id, m || {}));
    on('rs-asking', (id, v) => this.asking(id, v));
    on('rs-question', id => guard.question(id));
    on('rs-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.rsId) this.asking(socket.data.rsId, false); });
  }
}

module.exports = { Ridderslang };
