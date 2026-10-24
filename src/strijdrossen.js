// Strijdrossen: hoverrossen in een gevechtsarena, zoals Smash Karts. Ieder voor zich of rood tegen blauw.
// Lasers, raketten en mijnen krijg je alleen met goede antwoorden. Uitgeschakeld? Na drie seconden rijd je weer mee.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De gsm rijdt zelf en stuurt zijn positie; de server beslist over schoten, treffers en punten.
const World = require('../public/js/sr-world');
const logboek = require('./logboek');
const { tempoOf, factor } = require('./tempo');

const HP = 3;
const START = { laser: 6, raket: 0, mijn: 0 };
const MAX = { laser: 40, raket: 3, mijn: 3 };
const RESPAWN_MS = 3000;
const SAFE_MS = 2500;
const AFTER_QUESTION_MS = 800;
const WRONG_WAIT_MS = 3000;
const TICK_MS = 33;
const SEND_MS = 50;
const STREAKS = { 2: 'DUBBELE SLAG', 3: 'DRIEDUBBELE SLAG', 5: 'ONSTUITBAAR', 8: 'LEGENDARISCH', 12: 'GODDELIJK' };
const POINTS = { slag: 100, gezocht: 50, raak: 10, vraag: 25 };
const WEAPONS = ['laser', 'raket', 'mijn'];

class Strijdrossen {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.ticker = null;
    this.flushLog();
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.mode = 'ieder'; // ieder of teams
    this.tempo = 'normaal';
    this.players = new Map();
    this.minutes = 5;
    this.startedAt = 0;
    this.endsAt = 0;
    this.lasers = [];
    this.rockets = [];
    this.mines = [];
    this.nextShot = 1;
    this.nextN = 0;
    this.feed = [];
    this.log = [];
    this.lastFlush = 0;
    this.score = { rood: 0, blauw: 0 };
    this.resultsFile = null;
    this.sentAt = 0;
    this.lastTick = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, mode, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.mode = mode === 'teams' ? 'teams' : 'ieder';
    this.tempo = tempoOf(tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  pickTeam() {
    if (this.mode !== 'teams') return null;
    const count = { rood: 0, blauw: 0 };
    for (const p of this.players.values()) count[p.team]++;
    return count.rood <= count.blauw ? 'rood' : 'blauw';
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
    const p = {
      n: this.nextN++, name: clean, socketId, team: this.pickTeam(), color: this.players.size % 8,
      x: 0, y: 0, z: 0, a: 0, v: 0, hp: HP, ammo: { ...START }, alive: true, respawnAt: 0, spawn: 0, safeUntil: 0,
      asking: false, kills: 0, deaths: 0, streak: 0, bestStreak: 0, score: 0, hits: 0, shots: 0,
      right: 0, wrong: 0, qstreak: 0, question: null, order: [], last: null, waitUntil: 0, lastFire: {},
    };
    this.players.set(playerId, p);
    if (this.phase === 'play') this.respawn(p);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('sr-kicked');
    this.broadcast();
  }

  switchTeam(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.mode !== 'teams' || this.phase !== 'lobby') return;
    p.team = p.team === 'rood' ? 'blauw' : 'rood';
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'play';
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    const taken = [];
    for (const p of this.players.values()) {
      this.respawn(p, taken);
      taken.push([p.x, p.y]);
    }
    this.addFeed('🐎 De strijdrossen staan klaar. Beantwoord vragen voor wapens!');
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.broadcast();
  }

  respawn(p, taken) {
    const others = taken || [...this.players.values()].filter(o => o !== p && o.alive).map(o => [o.x, o.y]);
    [p.x, p.y, p.a] = World.spawnPoint(p.team, others);
    p.v = 0;
    p.z = 0;
    p.hp = HP;
    p.alive = true;
    p.spawn++;
    p.safeUntil = Math.max(Date.now(), this.startedAt) + SAFE_MS;
    this.sendMe(p);
  }

  playing(p) {
    return p && this.phase === 'play' && Date.now() >= this.startedAt;
  }

  // Positie van de gsm. Wie na een treffer nog een oude positie stuurt (oude spawn), wordt genegeerd.
  move(playerId, { x, y, z, a, v, s } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.alive || p.asking || s !== p.spawn) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const h = Number.isFinite(z) ? Math.max(0, Math.min(400, z)) : 0;
    if (Math.hypot(x - p.x, y - p.y) > 260 || World.blocked(x, y, World.R - 6, h)) {
      // Onmogelijke sprong: de gsm terugzetten op de plek die de server kent.
      p.spawn++;
      return this.sendMe(p);
    }
    p.x = x;
    p.y = y;
    p.z = h;
    if (Number.isFinite(a)) p.a = a;
    if (Number.isFinite(v)) p.v = Math.max(-World.CAR.reverse, Math.min(World.CAR.boostMax, v));
  }

  enemies(a, b) {
    return a !== b && (this.mode !== 'teams' || a.team !== b.team);
  }

  protected(p, now) {
    return p.asking || p.safeUntil > now;
  }

  // Vuren met een wapen. Lasers volgen de hoek van de gsm (met richthulp), maar nooit ver naast je neus.
  fire(playerId, { kind, a } = {}) {
    const p = this.players.get(playerId);
    if (!WEAPONS.includes(kind)) return { error: 'Onbekend wapen.' };
    if (!this.playing(p) || !p.alive || p.asking) return { ammo: p ? p.ammo : START };
    const now = Date.now();
    const spec = { laser: World.LASER, raket: World.RAKET, mijn: World.MIJN }[kind];
    if (now - (p.lastFire[kind] || 0) < spec.every - 40) return { ammo: p.ammo };
    if (p.ammo[kind] <= 0) return { ammo: p.ammo, empty: kind };
    p.lastFire[kind] = now;
    p.ammo[kind]--;
    p.safeUntil = 0; // wie schiet, is niet meer beschermd
    let angle = p.a;
    if (Number.isFinite(a)) {
      let d = a - p.a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      angle = p.a + Math.max(-.35, Math.min(.35, d));
    }
    if (kind === 'mijn') {
      // Achter het ros neerleggen. Te veel mijnen? Dan verdwijnt je oudste.
      const mx = p.x - Math.cos(p.a) * (World.R + 22);
      const my = p.y - Math.sin(p.a) * (World.R + 22);
      const own = this.mines.filter(m => m.owner === p);
      if (own.length >= World.MIJN.max) this.mines.splice(this.mines.indexOf(own[0]), 1);
      this.mines.push({ id: this.nextShot++, owner: p, x: World.wallAt(mx, my) ? p.x : mx, y: World.wallAt(mx, my) ? p.y : my, armAt: now + World.MIJN.arm, until: now + World.MIJN.life });
      this.sendMe(p);
      return { ammo: p.ammo };
    }
    p.shots++;
    const x = p.x + Math.cos(angle) * (World.R + 8);
    const y = p.y + Math.sin(angle) * (World.R + 8);
    if (World.wallAt(x, y, p.z + 30)) {
      this.sendMe(p);
      return { ammo: p.ammo };
    }
    if (kind === 'laser') {
      const speed = World.LASER.speed + Math.max(0, p.v);
      const b = { id: this.nextShot++, owner: p, x, y, z: p.z + 30, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, left: World.LASER.range };
      this.lasers.push(b);
      this.io.to('players').to('host').emit('sr-shot', { id: b.id, x: Math.round(x), y: Math.round(y), z: Math.round(b.z), a: +angle.toFixed(3), speed: Math.round(speed), n: p.n, team: p.team, color: p.color });
    } else {
      this.rockets.push({ id: this.nextShot++, owner: p, x, y, a: angle, left: World.RAKET.range });
      this.addFeed(`🚀 ${p.name} vuurt een raket af`, false);
    }
    this.sendMe(p);
    return { ammo: p.ammo };
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.phase !== 'play') return;
    const gone = [];
    // Lasers, in kleine stapjes zodat ze niet door een ros heen vliegen.
    for (const b of this.lasers) {
      const steps = 4;
      for (let i = 0; i < steps && !b.dead; i++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        b.left -= (Math.hypot(b.vx, b.vy) * dt) / steps;
        if (b.left <= 0 || World.wallAt(b.x, b.y, b.z)) { b.dead = true; break; }
        for (const v of this.players.values()) {
          if (!v.alive || !this.enemies(b.owner, v)) continue;
          if ((v.x - b.x) ** 2 + (v.y - b.y) ** 2 > (World.R + World.LASER.r) ** 2 || Math.abs(v.z + 30 - b.z) > 70) continue;
          b.dead = true;
          this.damage(b.owner, v, World.LASER.dmg, b.x, b.y, now, 'laser');
          break;
        }
      }
      if (b.dead) gone.push(b.id);
    }
    if (gone.length) {
      this.lasers = this.lasers.filter(b => !b.dead);
      this.io.to('players').to('host').emit('sr-pop', gone);
    }
    // Raketten draaien naar de dichtstbijzijnde vijand voor hen.
    for (const r of this.rockets) {
      let target = null;
      let best = World.RAKET.seek;
      for (const v of this.players.values()) {
        if (!v.alive || !this.enemies(r.owner, v) || this.protected(v, now)) continue;
        const d = Math.hypot(v.x - r.x, v.y - r.y);
        let rel = Math.atan2(v.y - r.y, v.x - r.x) - r.a;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        if (d < best && Math.abs(rel) < 1.3) { best = d; target = rel; }
      }
      if (target !== null) r.a += Math.max(-World.RAKET.turn * dt, Math.min(World.RAKET.turn * dt, target));
      const steps = 3;
      for (let i = 0; i < steps && !r.dead; i++) {
        r.x += (Math.cos(r.a) * World.RAKET.speed * dt) / steps;
        r.y += (Math.sin(r.a) * World.RAKET.speed * dt) / steps;
        r.left -= (World.RAKET.speed * dt) / steps;
        if (r.left <= 0 || World.wallAt(r.x, r.y, 40)) { r.dead = true; break; }
        for (const v of this.players.values()) {
          if (!v.alive || !this.enemies(r.owner, v)) continue;
          if ((v.x - r.x) ** 2 + (v.y - r.y) ** 2 < (World.R + World.RAKET.r) ** 2) { r.dead = true; break; }
        }
      }
      if (r.dead) this.explode(r.owner, r.x, r.y, World.RAKET.blast, World.RAKET.dmg, now, 'raket');
    }
    this.rockets = this.rockets.filter(r => !r.dead);
    // Mijnen ontploffen als een vijand te dichtbij komt.
    for (const m of this.mines) {
      if (now >= m.until) { m.dead = true; continue; }
      if (now < m.armAt) continue;
      for (const v of this.players.values()) {
        if (!v.alive || !this.enemies(m.owner, v)) continue;
        if ((v.x - m.x) ** 2 + (v.y - m.y) ** 2 < (World.R + World.MIJN.trigger) ** 2) { m.dead = true; break; }
      }
      if (m.dead) this.explode(m.owner, m.x, m.y, World.MIJN.blast, World.MIJN.dmg, now, 'mijn');
    }
    this.mines = this.mines.filter(m => !m.dead);
    for (const p of this.players.values()) {
      if (!p.alive && now >= p.respawnAt) this.respawn(p);
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    if (now - this.sentAt >= SEND_MS) {
      this.sentAt = now;
      this.sendWorld();
    }
  }

  explode(owner, x, y, blast, dmg, now, kind) {
    this.io.to('players').to('host').emit('sr-boom', { x: Math.round(x), y: Math.round(y), kind, r: blast });
    for (const v of this.players.values()) {
      if (!v.alive || !this.enemies(owner, v)) continue;
      if ((v.x - x) ** 2 + (v.y - y) ** 2 > (blast + World.R) ** 2) continue;
      this.damage(owner, v, dmg, v.x, v.y, now, kind);
    }
  }

  damage(shooter, v, dmg, x, y, now, kind) {
    const blocked = this.protected(v, now);
    this.io.to('players').to('host').emit('sr-hit', { n: v.n, x: Math.round(x), y: Math.round(y), blocked, kind });
    if (blocked) return;
    const owner = this.players.get(this.idOf(shooter)) ? shooter : null;
    if (owner) {
      owner.hits++;
      owner.score += POINTS.raak;
    }
    v.hp -= dmg;
    if (v.hp > 0) {
      this.sendMe(v);
      return;
    }
    v.hp = 0;
    v.alive = false;
    v.v = 0;
    v.deaths++;
    v.respawnAt = now + RESPAWN_MS;
    const victimStreak = v.streak;
    v.streak = 0;
    let text = '';
    if (owner) {
      const wanted = victimStreak >= 3;
      owner.kills++;
      owner.streak++;
      owner.bestStreak = Math.max(owner.bestStreak, owner.streak);
      const points = POINTS.slag + (wanted ? POINTS.gezocht : 0);
      owner.score += points;
      if (this.mode === 'teams') this.score[owner.team]++;
      const callout = STREAKS[owner.streak] || null;
      if (callout) this.addFeed(`🔥 ${owner.name}: ${callout.toLowerCase()}!`);
      if (wanted) this.addFeed(`🎯 ${owner.name} stopt de reeks van ${v.name} (${victimStreak})`);
      const icon = { laser: '⚡', raket: '🚀', mijn: '💣' }[kind] || '⚔';
      text = `${owner.name} ${icon} ${v.name}`;
      this.addFeed(text, false);
      this.io.to(owner.socketId).emit('sr-slag', { victim: v.name, points, streak: owner.streak, callout, wanted, kind });
      this.sendMe(owner);
    }
    this.io.to(v.socketId).emit('sr-out', { by: owner ? owner.name : '', kind, respawn: RESPAWN_MS });
    this.io.to('players').to('host').emit('sr-ko', { victim: v.n, killer: owner ? owner.n : -1, x: Math.round(v.x), y: Math.round(v.y) });
    this.sendMe(v);
    this.changed = true;
  }

  idOf(p) {
    for (const [id, o] of this.players) if (o === p) return id;
    return null;
  }

  // Tijdens een vraag zweeft je ros stil in een schild: niemand kan je raken, maar jij kan ook niet vuren.
  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    if (p.asking) p.v = 0;
    else p.safeUntil = Math.max(p.safeUntil, Date.now() + AFTER_QUESTION_MS);
  }

  question(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    p.asking = true;
    p.v = 0;
    if (now < p.waitUntil) return { wait: p.waitUntil - now };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = this.quiz.questions.map((_, i) => i).sort(() => Math.random() - .5);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, ammo: p.ammo, max: MAX, qstreak: p.qstreak };
  }

  // Juist: lasers, en met een reeks ook raketten (2 op rij) en mijnen (3 op rij). Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Strijdrossen', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    const gained = { laser: 0, raket: 0, mijn: 0 };
    let wait = 0;
    if (correct) {
      p.right++;
      p.qstreak++;
      p.score += POINTS.vraag;
      gained.laser = Math.round((5 + Math.min(p.qstreak - 1, 5)) * factor(this.tempo));
      if (p.qstreak % 2 === 0) gained.raket = 1;
      if (p.qstreak % 3 === 0) gained.mijn = 1;
      for (const k of WEAPONS) {
        const before = p.ammo[k];
        p.ammo[k] = Math.min(MAX[k], p.ammo[k] + gained[k]);
        gained[k] = p.ammo[k] - before;
      }
      if (p.qstreak === 5 || p.qstreak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.qstreak} vragen op rij goed`);
    } else {
      p.wrong++;
      p.qstreak = 0;
      wait = WRONG_WAIT_MS;
      p.waitUntil = Date.now() + wait;
      // Niet meteen opnieuw, maar wel binnen een paar vragen.
      p.order.splice(Math.min(2, p.order.length), 0, p.question);
    }
    p.question = null;
    this.sendMe(p);
    return { correct, right: q.correct, gained, ammo: p.ammo, max: MAX, qstreak: p.qstreak, wait };
  }

  flushLog() {
    this.lastFlush = Date.now();
    if (!this.log || !this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.ticker = null;
    this.phase = 'einde';
    this.lasers = [];
    this.rockets = [];
    this.mines = [];
    this.flushLog();
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

  // Kleine meldingen (wie wie raakt) gaan alleen naar de feed; grote ook naar de banner op het bord.
  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.changed = true;
  }

  winner() {
    if (this.mode !== 'teams') return null;
    if (this.score.rood === this.score.blauw) return 'gelijk';
    return this.score.rood > this.score.blauw ? 'rood' : 'blauw';
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, team: p.team, color: p.color, kills: p.kills, deaths: p.deaths, score: p.score,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong, shots: p.shots, hits: p.hits,
      }))
      .sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, mode: this.mode, tempo: this.tempo, title: this.quiz && this.quiz.title,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, score: this.score, winner: this.winner(), resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, {
        n: p.n, name: p.name, team: p.team, color: p.color, score: this.score, winner: this.winner(),
        rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length,
        kills: p.kills, deaths: p.deaths, points: p.score, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      });
    }
    return state;
  }

  // Wat alleen de leerling zelf moet weten: levens, wapens, waar de server hem ziet.
  sendMe(p) {
    const now = Date.now();
    this.io.to(p.socketId).emit('sr-me', {
      n: p.n, hp: p.hp, ammo: p.ammo, max: MAX, alive: p.alive, respawn: p.alive ? 0 : Math.max(0, p.respawnAt - now), spawn: p.spawn,
      x: Math.round(p.x), y: Math.round(p.y), a: p.a, safe: Math.max(0, p.safeUntil - now), wait: Math.max(0, p.waitUntil - now),
      kills: p.kills, deaths: p.deaths, streak: p.streak, points: p.score, qstreak: p.qstreak, now,
    });
  }

  // Compacte posities: [n, naam, x, y, hoek, snelheid, team, kleur, levens, vlaggen, slagen, reeks, hoogte].
  // Vlaggen: 1 uitgeschakeld, 2 beschermd, 4 aan het antwoorden.
  sendWorld() {
    const now = Date.now();
    const list = [...this.players.values()].map(p => {
      const flags = (p.alive ? 0 : 1) | (p.safeUntil > now ? 2 : 0) | (p.asking ? 4 : 0);
      return [p.n, p.name, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), Math.round(p.v), p.team, p.color, p.hp, flags, p.kills, p.streak, Math.round(p.z)];
    });
    const rockets = this.rockets.map(r => [r.id, Math.round(r.x), Math.round(r.y), +r.a.toFixed(2), r.owner.n]);
    const mines = this.mines.map(m => [m.id, Math.round(m.x), Math.round(m.y), m.owner.n, now >= m.armAt ? 1 : 0]);
    const payload = { now, players: list, rockets, mines, score: this.score };
    if (this.changed || now - (this.hostSentAt || 0) > 1000) {
      this.changed = false;
      this.hostSentAt = now;
      payload.ranking = this.ranking();
      payload.feed = this.feed;
    }
    this.io.to('host').emit('sr-world', payload);
    const forPlayers = { ...payload, ranking: undefined };
    this.io.to('players').emit('sr-world', forPlayers);
  }

  broadcast() {
    this.io.to('host').emit('sr-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('sr-state', this.playerState(id));
      if (this.phase === 'play') this.sendMe(p);
    }
    this.io.to('players').except(seen).emit('sr-state', this.base());
  }
}

module.exports = { Strijdrossen, HP, MAX };
