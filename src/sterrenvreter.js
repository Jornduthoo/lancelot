// Sterrenvreter: iedereen is een gloeiende ridderbol in één ruimte-arena, zoals agar.io.
// Eet sterrenstof en kleinere ridders om te groeien. Wie het zwaarst is, draagt de kroon.
// Goede antwoorden geven massa, ⚡ turbo en (drie op rij) 💥 supernova. In het midden groeit een zwart gat dat je uitspuwt.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De leerling beweegt zelf (geen vertraging) en stuurt zijn positie; de server beslist wie wat opeet.
const World = require('../public/js/sv-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const TICK_MS = 33;
const SEND_MS = 50;
const RESPAWN_MS = 2500;
const SAFE_MS = 2500;
const AFTER_QUESTION_MS = 1000;
const CELL = 220;
const DECAY_FROM = 120;      // boven deze massa smelt je langzaam (anders blijft één reus altijd winnen)
const DECAY = .004;          // deel van je massa per seconde
const POINTS = { slok: 50, kroon: 3 };

class Sterrenvreter {
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
    this.vragen = new Vragen(quiz, 'Sterrenvreter', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = true;
      if (this.phase === 'play') setTimeout(() => this.sendDust(existing), 50);
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const p = {
      n: this.nextN++, name: clean, socketId, color: World.COLORS[this.players.size % World.COLORS.length],
      x: 0, y: 0, m: World.START, alive: false, respawnAt: 0, safeUntil: 0, dashUntil: 0, moveAt: 0, fix: 0,
      turbo: 1, nova: 0, bonus: 0, eats: 0, deaths: 0, peak: World.START, kingMs: 0, score: 0, holes: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.broadcast();
    if (this.phase === 'play') {
      this.respawn(p, Date.now());
      this.sendDust(p);
    }
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('sv-kicked');
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
    this.ev = [];
    for (const p of this.players.values()) this.respawn(p, now, true);
    this.addFeed('🌌 De sterren zijn uitgestrooid. Eet, groei en pas op voor het zwarte gat!');
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
    for (const p of this.players.values()) this.sendDust(p);
    this.io.to('host').emit('sv-dust', this.dustList());
  }

  // ---------- Sterrenstof ----------

  key(x, y) {
    return `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  }

  // Zonder plek: ergens willekeurig in de arena (niet in het gat). Goud (v >= 3) is meer waard.
  addDust(x, y, v = 1, announce = true) {
    if (x === null) {
      const h = this.holeNow(Date.now());
      const a = Math.random() * Math.PI * 2, d = h.r + 60 + Math.sqrt(Math.random()) * (this.R - h.r - 90);
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
    }
    const c = World.clamp(this.R, x, y, 20);
    const dust = { id: this.nextDust++, x: Math.round(c.x), y: Math.round(c.y), v, c: v >= 3 ? 3 : Math.floor(Math.random() * World.DUST.length) };
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

  // Een wolk sterrenstof waar iemand massa verliest. Wordt samen hooguit 70% van wat er verloren ging.
  scatter(x, y, mass, spread, from = 0) {
    const pieces = Math.max(3, Math.min(28, Math.round(mass / 4)));
    const v = Math.max(2, Math.round((mass * .7) / pieces));
    for (let i = 0; i < pieces; i++) {
      const a = Math.random() * Math.PI * 2, d = from + Math.random() * spread;
      this.addDust(x + Math.cos(a) * d, y + Math.sin(a) * d, v);
    }
  }

  dustList() {
    return { R: this.R, list: [...this.dust.values()].map(d => [d.id, d.x, d.y, d.v, d.c]) };
  }

  sendDust(p) {
    this.io.to(p.socketId).emit('sv-dust', { ...this.dustList(), x: Math.round(p.x), y: Math.round(p.y), fix: p.fix });
  }

  holeNow(now) {
    return World.hole(Math.max(0, now - this.startedAt) / 1000, this.minutes * 60);
  }

  respawn(p, now, first = false) {
    const h = this.holeNow(now);
    const others = [...this.players.values()].filter(o => o !== p && o.alive).map(o => [o.x, o.y, World.radius(o.m)]);
    const at = World.spawn(this.R, h.r, others);
    p.x = at.x;
    p.y = at.y;
    p.m = World.START + p.bonus;
    p.bonus = 0;
    p.alive = true;
    p.moveAt = now;
    p.safeUntil = Math.max(now, this.startedAt) + SAFE_MS;
    p.fix++;
    p.dirty = true;
    if (!first) this.io.to(p.socketId).emit('sv-pos', { x: Math.round(p.x), y: Math.round(p.y), fix: p.fix, respawn: true });
  }

  // ---------- Besturing ----------

  move(playerId, { x, y, fix } = {}) {
    const p = this.players.get(playerId);
    if (!p || !p.alive || p.asking || fix !== p.fix || this.phase !== 'play') return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    if (now < this.startedAt) return;
    const dt = Math.min(1, (now - p.moveAt) / 1000);
    const mult = now < p.dashUntil + 250 ? World.DASH.mult : 1;
    const max = (World.speed(p.m) * mult + 260) * dt * 1.6 + 70;
    if (Math.hypot(x - p.x, y - p.y) > max) {
      p.fix++;
      this.io.to(p.socketId).emit('sv-pos', { x: Math.round(p.x), y: Math.round(p.y), fix: p.fix });
      return;
    }
    const c = World.clamp(this.R, x, y, World.radius(p.m));
    p.x = c.x;
    p.y = c.y;
    p.moveAt = now;
  }

  dash(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || !p.alive || p.asking || this.phase !== 'play' || now < this.startedAt) return { error: 'Nu even niet.' };
    if (p.turbo <= 0) return { error: 'Geen turbo! Beantwoord een vraag.' };
    if (now < p.dashUntil) return { ok: true, turbo: p.turbo };
    p.turbo--;
    p.dashUntil = now + World.DASH.ms;
    p.safeUntil = 0;
    p.dirty = true;
    this.ev.push(['dash', p.n]);
    return { ok: true, turbo: p.turbo, ms: World.DASH.ms };
  }

  // Supernova: kleinere ridders in de buurt vliegen weg en verliezen een kwart van hun massa als sterrenstof.
  nova(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || !p.alive || p.asking || this.phase !== 'play' || now < this.startedAt) return { error: 'Nu even niet.' };
    if (p.nova <= 0) return { error: 'Geen supernova: 3 juist op rij!' };
    p.nova--;
    p.safeUntil = 0;
    p.dirty = true;
    const range = World.radius(p.m) + World.NOVA.range;
    let hit = 0;
    for (const v of this.players.values()) {
      if (v === p || !v.alive || v.m >= p.m || this.safe(v, now)) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d > range + World.radius(v.m)) continue;
      hit++;
      const lost = Math.max(0, Math.round((v.m - World.START) * World.NOVA.loss));
      v.m -= lost;
      if (lost > 0) this.scatter(v.x, v.y, lost, World.radius(v.m) + 80, World.radius(v.m) * .5);
      const a = d > 1 ? Math.atan2(v.y - p.y, v.x - p.x) : Math.random() * Math.PI * 2;
      const c = World.clamp(this.R, v.x + Math.cos(a) * World.NOVA.push, v.y + Math.sin(a) * World.NOVA.push, World.radius(v.m));
      v.x = c.x;
      v.y = c.y;
      v.moveAt = now;
      v.fix++;
      v.dirty = true;
      this.io.to(v.socketId).emit('sv-pos', { x: Math.round(v.x), y: Math.round(v.y), fix: v.fix, by: p.name });
    }
    this.ev.push(['nova', p.n, Math.round(p.x), Math.round(p.y), Math.round(range)]);
    if (hit >= 2) this.addFeed(`💥 ${p.name} laat een supernova los op ${hit} ridders!`);
    return { ok: true, nova: p.nova, hit };
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
    p.dirty = true;
    return { ...res, alive: p.alive, m: Math.round(p.m), turbo: p.turbo, nova: p.nova };
  }

  // Juist: massa (meer bij een reeks), ⚡ turbo en om de drie op rij 💥 supernova. Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let gained = 0, turbo = 0, nova = false;
    if (res.correct) {
      gained = Math.round((14 + 5 * Math.min(p.streak - 1, 5)) * factor(this.tempo) + p.m * .05);
      if (p.alive) {
        p.m += gained;
        p.peak = Math.max(p.peak, p.m);
      } else p.bonus = Math.min(120, p.bonus + gained);
      if (p.turbo < World.MAX_TURBO) { p.turbo++; turbo = 1; }
      if (p.streak % 3 === 0 && p.nova < World.MAX_NOVA) { p.nova++; nova = true; }
      this.ev.push(['grow', p.n, gained]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, alive: p.alive, gained, turbo: p.turbo, gotTurbo: turbo, nova: p.nova, gotNova: nova, m: Math.round(p.m), streak: p.streak };
  }

  // ---------- Spel ----------

  safe(p, now) {
    return p.asking || p.safeUntil > now;
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now < this.startedAt) return this.maybeSend(now);
    const h = this.holeNow(now);
    const alive = [...this.players.values()].filter(p => p.alive);
    for (const p of alive) {
      if (p.m > DECAY_FROM) p.m -= (p.m - DECAY_FROM) * DECAY * dt * 2;
      const r = World.radius(p.m);
      // Sterrenstof opeten (via het rooster, zodat het ook met duizend stofjes snel blijft).
      if (!p.asking) {
        const x0 = Math.floor((p.x - r) / CELL), x1 = Math.floor((p.x + r) / CELL);
        const y0 = Math.floor((p.y - r) / CELL), y1 = Math.floor((p.y + r) / CELL);
        for (let cx = x0; cx <= x1; cx++) {
          for (let cy = y0; cy <= y1; cy++) {
            const cell = this.grid.get(`${cx},${cy}`);
            if (!cell) continue;
            for (const d of cell) {
              if ((d.x - p.x) ** 2 + (d.y - p.y) ** 2 > (r + 4) ** 2) continue;
              p.m += d.v;
              this.removeDust(d, p.n);
            }
          }
        }
        p.peak = Math.max(p.peak, p.m);
      }
      // Het zwarte gat spuwt je uit: de helft van je massa blijft achter als een ring van sterrenstof.
      if (!this.safe(p, now) && Math.hypot(p.x, p.y) < h.r + r * .25) {
        const lost = Math.round((p.m - World.START) / 2);
        p.m -= lost;
        p.holes++;
        if (lost > 0) this.scatter(0, 0, lost, 260, h.r + 60);
        const a = Math.random() * Math.PI * 2, d = this.R * (.55 + Math.random() * .3);
        p.x = Math.cos(a) * d;
        p.y = Math.sin(a) * d;
        p.moveAt = now;
        p.safeUntil = now + 1800;
        p.fix++;
        p.dirty = true;
        this.ev.push(['gat', p.n, lost]);
        this.io.to(p.socketId).emit('sv-pos', { x: Math.round(p.x), y: Math.round(p.y), fix: p.fix, hole: lost });
        if (lost >= 60) this.addFeed(`🕳️ Het zwarte gat spuwt ${p.name} uit (−${lost})`, false);
      }
    }
    // Ridders opslokken: zwaar genoeg, en de kleine moet grotendeels binnen je bol zitten.
    alive.sort((a, b) => b.m - a.m);
    for (const a of alive) {
      if (!a.alive || this.safe(a, now)) continue;
      const ra = World.radius(a.m);
      for (const b of alive) {
        if (b === a || !b.alive || this.safe(b, now) || a.m < b.m * World.EAT_RATIO) continue;
        const rb = World.radius(b.m);
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > (ra - rb * .35) ** 2) continue;
        this.swallow(a, b, now);
      }
    }
    // De kroon voor de zwaarste ridder, met punten voor elke seconde dat je hem draagt.
    let king = null;
    for (const p of alive) if (p.alive && (!king || p.m > king.m)) king = p;
    if (king) {
      king.kingMs += dt * 1000;
      if (king.n !== this.king) {
        this.king = king.n;
        this.ev.push(['kroon', king.n]);
        if (this.players.size > 1 && king.m >= 60 && now - (this.kingFeedAt || 0) > 8000) {
          this.kingFeedAt = now;
          this.addFeed(`👑 ${king.name} is nu de zwaarste ridder`, false);
        }
      }
    }
    for (const p of this.players.values()) {
      p.score = Math.round(p.peak) + p.eats * POINTS.slok + Math.floor(p.kingMs / 1000) * POINTS.kroon;
      if (!p.alive && now >= p.respawnAt && this.phase === 'play') this.respawn(p, now);
    }
    // Opgegeten stof groeit elders terug.
    const want = World.dustCount(this.players.size);
    let base = 0;
    for (const d of this.dust.values()) if (d.v === 1) base++;
    for (let i = 0; i < 6 && base < want; i++, base++) this.addDust(null, null, 1);
    // Te veel los stof (na grote botsingen)? Het oudste verdwijnt.
    if (this.dust.size > want * 1.6) {
      let extra = this.dust.size - Math.round(want * 1.6);
      for (const d of this.dust.values()) {
        if (extra <= 0) break;
        if (d.v > 1) { this.removeDust(d, -1); extra--; }
      }
    }
    this.maybeSend(now);
  }

  swallow(a, b, now) {
    a.m += b.m * .85;
    a.peak = Math.max(a.peak, a.m);
    a.eats++;
    a.dirty = true;
    b.alive = false;
    b.asking = false;
    b.deaths++;
    b.respawnAt = now + RESPAWN_MS;
    b.dirty = true;
    this.ev.push(['slok', a.n, b.n, Math.round(b.x), Math.round(b.y), Math.round(b.m)]);
    this.addFeed(`🌀 ${a.name} slokt ${b.name} op`, false);
    if (a.eats === 5 || a.eats === 10) this.addFeed(`🔥 ${a.name} heeft al ${a.eats} ridders opgeslokt!`);
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
    if (top) this.addFeed(`🏆 ${top.name} is de grootste Sterrenvreter!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.peak, p.eats, p.deaths, p.king, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`sterrenvreter-${this.quiz.title}`, [['Sterrenvreter', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Grootste massa', 'Opgeslokt', 'Zelf opgeslokt', 'Seconden met de kroon', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: p.score, m: Math.round(p.m), peak: Math.round(p.peak), eats: p.eats, deaths: p.deaths,
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
      n: p.n, m: Math.round(p.m), alive: p.alive, turbo: p.turbo, nova: p.nova, bonus: p.bonus, eats: p.eats, deaths: p.deaths, score: p.score,
      peak: Math.round(p.peak), respawn: p.alive ? 0 : Math.max(0, p.respawnAt - now), safe: Math.max(0, p.safeUntil - now),
      wait: Math.max(0, p.waitUntil - now), rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Compacte posities: [n, x, y, massa, vlaggen]. Vlaggen: 1 opgeslokt, 2 aan het antwoorden, 4 beschermd, 8 turbo.
  send(now) {
    const flags = p => (p.alive ? 0 : 1) | (p.asking ? 2 : 0) | (p.safeUntil > now ? 4 : 0) | (p.dashUntil > now ? 8 : 0);
    const h = this.holeNow(now);
    const msg = {
      k: [...this.players.values()].filter(p => p.alive).map(p => [p.n, Math.round(p.x), Math.round(p.y), Math.round(p.m), flags(p)]),
      ev: this.ev, bh: Math.round(h.r), king: this.king,
    };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').volatile.emit('sv-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('sv-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('sv-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('sv-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('sv-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('sv-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('sv-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('sv-state', this.hostState());
    if (this.phase === 'play') socket.emit('sv-dust', this.dustList());
    socket.on('sv-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('sterren');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('sv-start', () => this.start());
    socket.on('sv-kick', id => this.kick(id));
    socket.on('sv-finish', () => this.finish());
    socket.on('sv-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('sv-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('sv-state', this.base());
    socket.on('sv-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.svId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('sv-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.svId ? fn(socket.data.svId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('sv-move', (id, m) => this.move(id, m || {}));
    on('sv-dash', id => this.dash(id));
    on('sv-nova', id => this.nova(id));
    on('sv-asking', (id, v) => this.asking(id, v));
    on('sv-question', id => guard.question(id));
    on('sv-answer', (id, choice) => guard.answer(id, choice));
    socket.on('disconnect', () => { if (socket.data.svId) this.asking(socket.data.svId, false); });
  }
}

module.exports = { Sterrenvreter };
