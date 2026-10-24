// Ridder-Royale: alle ridders in één ronde arena, en een neonstorm die steeds kleiner wordt. De laatste ridder wint de ronde.
// Munitie en een schild verdien je met goede antwoorden. Een fout antwoord kost geen leven: je bent even traag.
// Wie uitgeschakeld is, kijkt mee en verdient met vragen extra munitie voor de volgende ronde. Er volgen rondes tot de tijd op is.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De leerling beweegt zelf (geen vertraging) en stuurt zijn positie; de server beslist over schoten, treffers en de storm.
const World = require('../public/js/ry-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const { R, SPEED, SLOW, HP, MAX_SHIELD, LASER, SUPER } = World;
const TICK_MS = 33;
const SEND_MS = 50;
const START_AMMO = 4;
const AMMO_PER_ANSWER = 5;
const SHIELD_PER_ANSWER = 15;
const MAX_AMMO = 30;
const MAX_BONUS = 10;
const SLOW_MS = 4000;
const BREAK_MS = 7000;
const ASKING_DMG = .5;
const POINTS = { kroon: 10, uit: 3, overleefd: 1 };
const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#f0f0ff', '#ffd6a5', '#9bf6ff'];

class Royale {
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
    this.minutes = 8;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.round = 0;
    this.roundState = 'pauze'; // pauze (tussen twee rondes) of strijd
    this.roundAt = 0;           // start van de strijd van deze ronde
    this.roundSeed = 0;
    this.roundPlayers = 0;
    this.arena = null;
    this.shots = [];
    this.loot = [];
    this.ev = [];
    this.nextN = 0;
    this.nextId = 1;
    this.feed = [];
    this.feedChanged = false;
    this.lastWinner = null;
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
    this.minutes = [4, 5, 6, 8, 10, 12, 15].includes(minutes) ? minutes : 8;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Ridder-Royale', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = true;
      if (this.phase === 'play') setTimeout(() => this.sendRound(existing), 50);
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const p = {
      n: this.nextN++, name: clean, socketId, color: COLORS[this.players.size % COLORS.length],
      x: 0, y: 0, a: 0, hp: HP, shield: 0, ammo: START_AMMO, supers: 0, bonus: 0, alive: false, lastShot: 0, moveAt: 0,
      slowUntil: 0, crowns: 0, elims: 0, survived: 0, score: 0, hits: 0, placeSum: 0, rounds: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true, fix: 0,
    };
    this.players.set(playerId, p);
    // Tijdens de strijd doe je mee vanaf de volgende ronde; tot dan kijk je mee.
    this.broadcast();
    if (this.phase === 'play') this.sendRound(p);
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('ry-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.newRound(now, 3000);
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // Een nieuwe ronde: nieuwe arena, iedereen op een startplek, munitie plus wat je als toeschouwer verdiende.
  newRound(now, delay) {
    this.round++;
    this.roundState = 'pauze';
    this.roundAt = now + delay;
    this.roundSeed = Math.floor(Math.random() * 1e9);
    const list = [...this.players.values()];
    this.roundPlayers = list.length;
    this.arena = World.makeArena(this.roundSeed, list.length);
    this.shots = [];
    this.loot = this.arena.crates.map((c, i) => ({ id: i, x: c.x, y: c.y, kind: 'krat', taken: false }));
    const spots = World.spawns(this.arena, list.length, this.roundSeed).sort(() => Math.random() - .5);
    list.forEach((p, i) => {
      p.alive = true;
      p.hp = HP;
      p.shield = 0;
      p.ammo = Math.min(MAX_AMMO, START_AMMO + p.bonus);
      p.bonus = 0;
      p.supers = 0;
      p.slowUntil = 0;
      p.rounds++;
      p.diedAt = 0;
      this.place(p, spots[i], now);
    });
    this.lastWinner = null;
    this.addFeed(`👑 Ronde ${this.round}: ${list.length} ridders in de arena. De storm komt eraan!`);
    for (const p of list) this.sendRound(p);
    this.io.to('host').emit('ry-round', this.roundInfo());
  }

  roundInfo() {
    return { round: this.round, seed: this.roundSeed, players: this.roundPlayers, at: this.roundAt, now: Date.now(), taken: this.loot.filter(l => l.taken).map(l => l.id), loot: this.loot.filter(l => l.kind !== 'krat' && !l.taken).map(l => [l.id, Math.round(l.x), Math.round(l.y), l.kind]) };
  }

  sendRound(p) {
    this.io.to(p.socketId).emit('ry-round', { ...this.roundInfo(), x: p.x, y: p.y, fix: p.fix, alive: p.alive });
  }

  place(p, at, now) {
    p.x = at.x;
    p.y = at.y;
    p.moveAt = now;
    p.fix++;
    p.dirty = true;
  }

  fighting(now = Date.now()) {
    return this.phase === 'play' && this.roundState === 'strijd' && now >= this.roundAt;
  }

  // ---------- Besturing ----------

  move(playerId, { x, y, a, fix } = {}) {
    const p = this.players.get(playerId);
    if (!p || !p.alive || p.asking || fix !== p.fix || this.phase !== 'play') return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    if (now < this.roundAt) return;
    const dt = Math.min(1, (now - p.moveAt) / 1000);
    const far = Math.hypot(x - p.x, y - p.y) > SPEED * dt * 1.6 + 60;
    if (far || World.solidAt(this.arena, x, y, R - 5)) {
      p.fix++;
      this.io.to(p.socketId).emit('ry-pos', { x: p.x, y: p.y, fix: p.fix });
      return;
    }
    p.x = x;
    p.y = y;
    p.moveAt = now;
    if (Number.isFinite(a)) p.a = a;
  }

  fire(playerId, { a, seq, big } = {}) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || !p.alive || p.asking || !this.fighting(now) || !Number.isFinite(a)) return { error: 'Nu even niet.' };
    if (now - p.lastShot < LASER.cd - 60) return {};
    if (big) {
      if (p.supers <= 0) return { error: 'Geen superschot.' };
      p.supers--;
    } else {
      if (p.ammo <= 0) return { error: 'Geen munitie! Beantwoord een vraag.' };
      p.ammo--;
    }
    p.lastShot = now;
    p.a = a;
    p.dirty = true;
    const w = big ? SUPER : LASER;
    const s = {
      id: this.nextId++, x: p.x + Math.cos(a) * (R + 6), y: p.y + Math.sin(a) * (R + 6),
      vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.life, dmg: w.dmg, r: w.r, owner: p, big: Boolean(big), hit: new Set(),
    };
    this.shots.push(s);
    this.ev.push(['shot', s.id, Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.life, p.n, typeof seq === 'number' ? seq : 0, big ? 1 : 0]);
    return { ok: true, ammo: p.ammo, supers: p.supers };
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
    p.asking = p.alive;
    p.dirty = true;
    return { ...res, alive: p.alive, ammo: p.ammo, bonus: p.bonus };
  }

  // Juist: munitie en schild (meedoen) of munitie voor de volgende ronde (meekijken). Fout: even traag.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let ammo = 0, shield = 0, superShot = false, bonus = 0;
    if (res.correct) {
      if (p.alive) {
        ammo = Math.round(AMMO_PER_ANSWER * factor(this.tempo));
        p.ammo = Math.min(MAX_AMMO, p.ammo + ammo);
        shield = Math.min(SHIELD_PER_ANSWER, MAX_SHIELD - p.shield);
        p.shield += shield;
        if (p.streak % 3 === 0) { p.supers++; superShot = true; }
      } else {
        bonus = Math.min(2, MAX_BONUS - p.bonus);
        p.bonus += bonus;
      }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    } else if (p.alive) {
      p.slowUntil = Date.now() + Math.round(SLOW_MS * Math.sqrt(factor(this.tempo)));
      this.ev.push(['traag', p.n]);
    }
    p.dirty = true;
    return { ...res, alive: p.alive, ammo: p.ammo, gained: ammo, shield, superShot, supers: p.supers, bonus, bonusTotal: p.bonus, slow: res.correct ? 0 : p.slowUntil - Date.now(), streak: p.streak };
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.roundState === 'pauze' && now >= this.roundAt) {
      this.roundState = 'strijd';
      this.ev.push(['start']);
    }
    if (this.roundState === 'strijd') this.fight(now, dt);
    else if (this.roundState === 'einde' && now >= this.breakUntil) this.newRound(now, 3000);
    if (now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  fight(now, dt) {
    const ar = this.arena;
    const zone = World.zoneAt(ar, (now - this.roundAt) / 1000);
    const alive = [...this.players.values()].filter(p => p.alive);
    for (const p of alive) {
      // Buiten de storm verlies je levenspunten (eerst je schild).
      if (Math.hypot(p.x - zone.x, p.y - zone.y) > zone.r) {
        p.stormAcc = (p.stormAcc || 0) + zone.dps * dt;
        if (p.stormAcc >= 1) {
          const d = Math.floor(p.stormAcc);
          p.stormAcc -= d;
          this.hurt(p, d, null, now, true);
        }
      }
    }
    // Schoten
    const keep = [];
    for (const s of this.shots) {
      s.life -= dt;
      const res = this.stepShot(s, alive, now, dt);
      if (res === 'keep' && s.life > 0) keep.push(s);
      else this.ev.push(['weg', s.id, Math.round(s.x), Math.round(s.y), res === 'raak' ? 1 : 0]);
    }
    this.shots = keep;
    // Kratten en buit
    for (const l of this.loot) {
      if (l.taken) continue;
      for (const p of alive) {
        if (!p.alive || Math.hypot(p.x - l.x, p.y - l.y) > R + 22) continue;
        l.taken = true;
        if (l.kind === 'krat') {
          // Een krat: munitie of een energiecel.
          const heal = p.hp < 70 && Math.random() < .5;
          if (heal) p.hp = Math.min(HP, p.hp + 30);
          else p.ammo = Math.min(MAX_AMMO, p.ammo + 4);
          this.ev.push(['pak', l.id, p.n, heal ? 'cel' : 'munitie']);
        } else {
          p.ammo = Math.min(MAX_AMMO, p.ammo + (l.ammo || 3));
          this.ev.push(['pak', l.id, p.n, 'buit']);
        }
        p.dirty = true;
        break;
      }
    }
    // Einde van de ronde: nog één ridder over, of de storm heeft alles opgeslokt.
    const left = [...this.players.values()].filter(p => p.alive);
    if ((this.roundPlayers > 1 && left.length <= 1) || left.length === 0) this.endRound(now, left[0] || null);
  }

  stepShot(s, alive, now, dt) {
    const n = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 14));
    for (let i = 0; i < n; i++) {
      s.x += (s.vx * dt) / n;
      s.y += (s.vy * dt) / n;
      if (World.solidAt(this.arena, s.x, s.y)) return 'muur';
      for (const p of alive) {
        if (p === s.owner || !p.alive || s.hit.has(p) || Math.hypot(p.x - s.x, p.y - s.y) > R + s.r) continue;
        s.hit.add(p);
        this.hurt(p, s.dmg, s.owner, now);
        s.owner.hits++;
        if (!s.big) return 'raak';
      }
    }
    return 'keep';
  }

  hurt(p, dmg, by, now, storm = false) {
    if (!p.alive) return;
    if (p.asking && !storm) dmg = Math.ceil(dmg * ASKING_DMG);
    const fromShield = Math.min(p.shield, storm ? 0 : dmg);
    p.shield -= fromShield;
    p.hp -= dmg - fromShield;
    p.dirty = true;
    this.ev.push(['au', p.n, dmg, storm ? 1 : 0]);
    if (p.hp > 0) return;
    p.hp = 0;
    p.alive = false;
    p.asking = false;
    p.diedAt = now;
    const alive = [...this.players.values()].filter(q => q.alive);
    p.place = alive.length + 1;
    p.placeSum += p.place;
    for (const q of alive) { q.survived += POINTS.overleefd; q.score += POINTS.overleefd; q.dirty = true; }
    // Wat je bij je had, blijft liggen voor wie het komt halen.
    if (p.ammo > 0) {
      const l = { id: 1000 + this.nextId++, x: p.x, y: p.y, kind: 'buit', ammo: Math.max(3, Math.ceil(p.ammo / 2)), taken: false };
      this.loot.push(l);
      this.ev.push(['buit', l.id, Math.round(l.x), Math.round(l.y)]);
    }
    if (by && by !== p) {
      by.elims++;
      by.score += POINTS.uit;
      by.dirty = true;
      this.addFeed(`⚔️ ${by.name} schakelt ${p.name} uit`, false);
    } else this.addFeed(`🌀 ${p.name} verdwijnt in de storm`, false);
    this.ev.push(['uit', p.n, by ? by.n : -1, Math.round(p.x), Math.round(p.y)]);
  }

  endRound(now, winner) {
    this.roundState = 'einde';
    this.breakUntil = now + BREAK_MS;
    this.shots = [];
    if (winner) {
      winner.crowns++;
      winner.score += POINTS.kroon;
      winner.place = 1;
      winner.placeSum += 1;
      winner.dirty = true;
      this.lastWinner = winner.n;
      this.addFeed(`👑 ${winner.name} wint ronde ${this.round}!`);
    } else this.addFeed(`🌀 De storm wint ronde ${this.round}. Niemand overleeft!`);
    this.ev.push(['ronde', winner ? winner.n : -1, BREAK_MS]);
    // Is er geen tijd meer voor een nieuwe ronde? Dan stopt het spel na deze ronde.
    if (this.endsAt - now < 40000) {
      clearTimeout(this.endTimer);
      this.endTimer = setTimeout(() => this.finish(), 4000);
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
    if (top) this.addFeed(`🏆 ${top.name} wint Ridder-Royale met ${top.crowns} ${top.crowns === 1 ? 'kroon' : 'kronen'}!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.crowns, p.elims, p.survived, p.rounds, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`ridder-royale-${this.quiz.title}`, [['Ridder-Royale', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Rondes', this.round], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Kronen', 'Uitgeschakeld', 'Overleefpunten', 'Rondes gespeeld', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color, score: p.score, crowns: p.crowns, elims: p.elims, survived: p.survived, rounds: p.rounds, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong, alive: p.alive }))
      .sort((a, b) => b.score - a.score || b.crowns - a.crowns || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, round: this.round, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, hp: Math.max(0, Math.round(p.hp)), shield: p.shield, ammo: p.ammo, supers: p.supers, bonus: p.bonus, alive: p.alive,
      slow: Math.max(0, p.slowUntil - now), wait: Math.max(0, p.waitUntil - now), crowns: p.crowns, elims: p.elims, score: p.score, place: p.place || 0,
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  send(now) {
    const flags = p => (p.alive ? 0 : 1) | (p.asking ? 2 : 0) | (now < p.slowUntil ? 4 : 0) | (p.shield > 0 ? 8 : 0);
    const msg = {
      k: [...this.players.values()].filter(p => p.alive || now - (p.diedAt || 0) < 600).map(p => [p.n, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), p.hp, flags(p)]),
      ev: this.ev, rs: this.roundState, ra: this.roundAt - now, br: this.roundState === 'einde' ? this.breakUntil - now : 0,
      al: [...this.players.values()].filter(p => p.alive).length,
    };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('ry-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('ry-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('ry-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('ry-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('ry-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('ry-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('ry-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('ry-state', this.hostState());
    if (this.phase === 'play') socket.emit('ry-round', this.roundInfo());
    socket.on('ry-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('royale');
      if (busy) throw busyError(busy);
      this.load(quizzes.load(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('ry-start', () => this.start());
    socket.on('ry-kick', id => this.kick(id));
    socket.on('ry-finish', () => this.finish());
    socket.on('ry-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('ry-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('ry-state', this.base());
    socket.on('ry-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.ryId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('ry-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.ryId ? fn(socket.data.ryId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('ry-move', (id, m) => this.move(id, m || {}));
    on('ry-fire', (id, m) => this.fire(id, m || {}));
    on('ry-asking', (id, v) => this.asking(id, v));
    on('ry-question', id => guard.question(id));
    on('ry-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Royale };
