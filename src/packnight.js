// Pac-Knight: alle ridders lopen samen door één neon doolhof en rapen kristallen. Drones jagen op hen.
// Een goed antwoord geeft een kracht (💥). Met een actieve kracht (8 seconden bij normaal tempo) vluchten
// de drones, en wie er een raakt, schakelt hem uit. Wie zonder kracht gevangen wordt, verliest kristallen.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De server beslist alles: leerlingen sturen alleen een richting. Het doolhof wordt bij elke start opnieuw gemaakt.
const logboek = require('./logboek');
const { tempoOf, factor } = require('./tempo');
const quizzes = require('./quizzes');

const TICK_MS = 40;
const KNIGHT_MS = 165;      // tijd per vakje
const POWER_KNIGHT_MS = 140;
const DRONE_MS = 200;
const SCARED_MS = 300;
const POWER_MS = 8000;      // bij normaal tempo
const MAX_PELLETS = 3;
const WRONG_WAIT_MS = 3000;
const CAUGHT_MS = 3000;
const SAFE_MS = 2000;
const DRONE_BACK_MS = 5000;
const BIG_BACK_MS = 10000;
const SCARE_RANGE = 8;
const CHASE_RANGE = 14;
const LOST_ON_CATCH = 5;
const POINTS = { kristal: 1, groot: 5, drone: 10 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Een symmetrisch doolhof zonder doodlopende gangen, met in het midden de hangar van de drones
// en links en rechts een tunnel naar de overkant. W en H zijn 4k+3, zodat het midden op een gang valt.
function makeMaze(W, H, rnd = Math.random) {
  const g = Array.from({ length: H }, () => new Array(W).fill(1));
  const mid = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const inLeft = (x, y) => x >= 1 && x <= mid && y >= 1 && y <= H - 2;
  // Gangen graven in de linkerhelft (met de middenkolom erbij).
  g[1][1] = 0;
  const stack = [[1, 1]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = [0, 1, 2, 3].filter(d => inLeft(x + DX[d] * 2, y + DY[d] * 2) && g[y + DY[d] * 2][x + DX[d] * 2] === 1);
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[Math.floor(rnd() * opts.length)];
    g[y + DY[d]][x + DX[d]] = 0;
    g[y + DY[d] * 2][x + DX[d] * 2] = 0;
    stack.push([x + DX[d] * 2, y + DY[d] * 2]);
  }
  const mirror = () => {
    for (let y = 0; y < H; y++) for (let x = mid + 1; x < W; x++) g[y][x] = g[y][W - 1 - x];
  };
  const open = (x, y) => {
    g[y][x] = 0;
    g[y][W - 1 - x] = 0;
  };
  mirror();
  // Geen doodlopende gangen: zo kan je altijd ontsnappen.
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x <= mid; x += 2) {
      const ways = [0, 1, 2, 3].filter(d => g[y + DY[d]][x + DX[d]] === 0);
      if (ways.length > 1) continue;
      const walls = [0, 1, 2, 3].filter(d => {
        const wx = x + DX[d], wy = y + DY[d];
        return wx > 0 && wx < W - 1 && wy > 0 && wy < H - 1 && g[wy][wx] === 1;
      });
      const d = walls[Math.floor(rnd() * walls.length)];
      if (d !== undefined) open(x + DX[d], y + DY[d]);
    }
  }
  // Extra lussen, zodat het doolhof ruim aanvoelt zoals bij Pac-Man.
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x <= mid; x++) {
      if (g[y][x] !== 1 || (x % 2) === (y % 2)) continue;
      if (rnd() < .14) open(x, y);
    }
  }
  // De hangar in het midden en de tunnel.
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = mid - 3; x <= mid + 3; x++) g[y][x] = 2;
  g[cy][0] = 0;
  g[cy][W - 1] = 0;
  return g.map(row => row.map(c => (c === 1 ? '#' : c === 2 ? 'h' : '.')).join(''));
}

function sizeFor(players) {
  if (players <= 8) return { W: 31, H: 19 };
  if (players <= 18) return { W: 39, H: 23 };
  return { W: 47, H: 27 };
}

class PacKnight {
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
    this.flushLog();
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 5;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.maze = null;
    this.W = 0;
    this.H = 0;
    this.crystals = null;
    this.totalCrystals = 0;
    this.changes = [];
    this.bigsBack = [];
    this.drones = [];
    this.feed = [];
    this.log = [];
    this.lastFlush = 0;
    this.lastRank = 0;
    this.resultsFile = null;
    this.nextN = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get powerMs() {
    return Math.round(POWER_MS * Math.sqrt(factor(this.tempo)));
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 4, 5, 6, 8, 10, 12].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
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
      n: this.nextN++, name: clean, socketId, color: this.players.size % 10,
      x: 0, y: 0, px: 0, py: 0, dir: null, want: null, at: 0, next: 0,
      crystals: 0, drones: 0, caught: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
      pellets: 0, powerUntil: 0, asking: false, question: null, order: [], last: null, waitUntil: 0,
      caughtUntil: 0, safeUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    if (this.phase === 'play') this.spawn(p, Date.now());
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('pk-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const { W, H } = sizeFor(this.players.size);
    this.W = W;
    this.H = H;
    this.maze = makeMaze(W, H);
    this.crystals = new Uint8Array(W * H);
    this.fillCrystals();
    this.totalCrystals = this.crystals.reduce((a, c) => a + (c ? 1 : 0), 0);
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    const count = Math.min(9, 3 + Math.floor(this.players.size / 4));
    const cy = (H - 1) / 2;
    const mid = (W - 1) / 2;
    this.drones = Array.from({ length: count }, (_, i) => {
      const x = mid - 3 + ((i * 2) % 7);
      return { i, x, y: cy, px: x, py: cy, dir: i % 2 ? 1 : 3, at: now, next: this.startedAt + i * 600, deadUntil: 0, scared: false };
    });
    for (let k = 0; k < 4; k++) this.placeBig();
    for (const p of this.players.values()) this.spawn(p, now);
    this.changes = [];
    this.addFeed(`👾 ${count} drones jagen door het doolhof. Verzamel kristallen!`);
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Doolhof ----------

  open(x, y) {
    if (y < 0 || y >= this.H) return false;
    const c = this.maze[y][(x + this.W) % this.W];
    return c !== '#';
  }

  fillCrystals() {
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const c = this.maze[y][x];
        const i = y * this.W + x;
        if (c === '.' && !this.crystals[i]) {
          this.crystals[i] = 1;
          this.changes.push([i, 1]);
        }
      }
    }
  }

  placeBig() {
    const free = [];
    for (let i = 0; i < this.crystals.length; i++) {
      const x = i % this.W, y = Math.floor(i / this.W);
      if (this.maze[y][x] === '.' && this.crystals[i] !== 2 && x > 0 && x < this.W - 1) free.push(i);
    }
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)];
    this.crystals[i] = 2;
    this.changes.push([i, 2]);
  }

  // Een plek ver van de drones.
  spawn(p, now) {
    const cells = [];
    for (let y = 1; y < this.H - 1; y += 2) {
      for (let x = 1; x < this.W - 1; x += 2) {
        if (this.maze[y][x] !== '.') continue;
        const near = Math.min(99, ...this.drones.filter(d => !d.deadUntil).map(d => Math.abs(d.x - x) + Math.abs(d.y - y)));
        cells.push({ x, y, near });
      }
    }
    cells.sort((a, b) => b.near - a.near);
    const pick = cells[Math.floor(Math.random() * Math.min(cells.length, Math.max(6, cells.length / 3)))] || { x: 1, y: 1 };
    p.x = p.px = pick.x;
    p.y = p.py = pick.y;
    p.dir = null;
    p.want = null;
    p.at = now;
    p.next = Math.max(now, this.startedAt);
    p.caughtUntil = 0;
    p.safeUntil = Math.max(now, this.startedAt) + SAFE_MS;
    p.dirty = true;
  }

  // ---------- Besturing ----------

  steer(playerId, dir) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || ![0, 1, 2, 3].includes(dir)) return;
    p.want = dir;
    // Stilstaan en meteen een open richting kiezen: niet wachten tot de volgende stap.
    const now = Date.now();
    if (p.dir === null && p.next < now) p.next = now;
  }

  power(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (p.pellets <= 0) return { error: 'Je hebt geen kracht. Beantwoord een vraag!' };
    if (p.caughtUntil) return { error: 'Wacht tot je terug in het doolhof staat.' };
    p.pellets--;
    p.powerUntil = Math.max(now, p.powerUntil) + this.powerMs;
    p.dirty = true;
    return { ok: true, pellets: p.pellets, powerMs: p.powerUntil - now };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    if (p.asking) {
      p.dir = null;
      p.want = null;
    }
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (now < p.waitUntil) return { error: 'Even wachten.', wait: p.waitUntil - now };
    this.asking(playerId, true);
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, pellets: p.pellets, max: MAX_PELLETS };
  }

  // Juist: een kracht erbij (drie op rij: twee). Fout: even wachten, en de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Pac-Knight', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    let gained = 0;
    let wait = 0;
    if (correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      gained = p.streak % 3 === 0 ? 2 : 1;
      p.pellets = Math.min(MAX_PELLETS, p.pellets + gained);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
      wait = WRONG_WAIT_MS;
      p.waitUntil = Date.now() + wait;
      // Niet meteen opnieuw, maar wel binnen een paar vragen.
      p.order.splice(Math.min(2, p.order.length), 0, p.question);
    }
    p.question = null;
    p.dirty = true;
    return { correct, right: q.correct, gained, pellets: p.pellets, max: MAX_PELLETS, streak: p.streak, wait };
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    if (now >= this.startedAt) {
      for (const p of this.players.values()) {
        if (p.caughtUntil) {
          if (now >= p.caughtUntil) this.spawn(p, now);
          continue;
        }
        if (p.powerUntil && now >= p.powerUntil) {
          p.powerUntil = 0;
          p.dirty = true;
        }
        if (p.asking) {
          p.next = now;
          continue;
        }
        let steps = 0;
        while (p.next <= now && steps++ < 3) {
          this.stepKnight(p, now);
          p.next += p.powerUntil ? POWER_KNIGHT_MS : KNIGHT_MS;
        }
        if (p.next < now - 500) p.next = now;
      }
      for (const d of this.drones) {
        if (d.deadUntil) {
          if (now < d.deadUntil) continue;
          d.deadUntil = 0;
          d.x = d.px = (this.W - 1) / 2;
          d.y = d.py = (this.H - 1) / 2;
          d.at = now;
          d.next = now + 400;
        }
        let steps = 0;
        while (d.next <= now && steps++ < 3) {
          this.stepDrone(d, now);
          d.next += d.scared ? SCARED_MS : DRONE_MS;
        }
      }
      this.collide(now);
      while (this.bigsBack.length && this.bigsBack[0] <= now) {
        this.bigsBack.shift();
        this.placeBig();
      }
      const left = this.crystals.reduce((a, c) => a + (c === 1 ? 1 : 0), 0);
      if (left < this.totalCrystals * .3) {
        this.fillCrystals();
        this.addFeed('✨ Nieuwe kristallen groeien in het doolhof!');
      }
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    if (now - this.lastRank > 1000) {
      this.lastRank = now;
      for (const p of this.players.values()) p.dirty = true;
    }
    this.send(now);
  }

  stepKnight(p, now) {
    if (p.want !== null && this.open(p.x + DX[p.want], p.y + DY[p.want])) p.dir = p.want;
    p.px = p.x;
    p.py = p.y;
    p.at = now;
    if (p.dir === null || !this.open(p.x + DX[p.dir], p.y + DY[p.dir])) {
      p.dir = null;
      return;
    }
    p.x = (p.x + DX[p.dir] + this.W) % this.W;
    p.y += DY[p.dir];
    const i = p.y * this.W + p.x;
    const c = this.crystals[i];
    if (c) {
      const powered = p.powerUntil > now;
      p.crystals += (c === 2 ? POINTS.groot : POINTS.kristal) * (powered ? 2 : 1);
      this.crystals[i] = 0;
      this.changes.push([i, 0]);
      if (c === 2) this.bigsBack.push(now + BIG_BACK_MS);
      p.dirty = true;
    }
  }

  // Een kwetsbare ridder: in het doolhof, niet aan het antwoorden, niet net teruggekomen.
  vulnerable(p, now) {
    return !p.caughtUntil && !p.asking && now >= p.safeUntil && now >= this.startedAt;
  }

  stepDrone(d, now) {
    const dist = (x, y, p) => {
      const dx = Math.abs(x - p.x);
      return Math.min(dx, this.W - dx) + Math.abs(y - p.y);
    };
    let scaredOf = null;
    let target = null;
    let best = SCARE_RANGE + 1;
    let bestT = CHASE_RANGE + 1;
    for (const p of this.players.values()) {
      if (p.caughtUntil) continue;
      const k = dist(d.x, d.y, p);
      if (p.powerUntil > now) {
        if (k < best) { best = k; scaredOf = p; }
      } else if (this.vulnerable(p, now) && k < bestT) {
        bestT = k;
        target = p;
      }
    }
    if (d.scared !== Boolean(scaredOf)) d.scared = Boolean(scaredOf);
    const back = (d.dir + 2) % 4;
    let opts = [0, 1, 2, 3].filter(k => k !== back && this.open(d.x + DX[k], d.y + DY[k]));
    if (!opts.length) opts = [back].filter(k => this.open(d.x + DX[k], d.y + DY[k]));
    d.px = d.x;
    d.py = d.y;
    d.at = now;
    if (!opts.length) return;
    const score = k => {
      const x = (d.x + DX[k] + this.W) % this.W, y = d.y + DY[k];
      if (scaredOf) return -dist(x, y, scaredOf);
      if (target) return dist(x, y, target);
      return 0;
    };
    let dir;
    if ((scaredOf || target) && Math.random() > .15) {
      dir = opts.reduce((a, b) => (score(b) < score(a) ? b : a));
    } else {
      dir = opts.includes(d.dir) && Math.random() < .6 ? d.dir : opts[Math.floor(Math.random() * opts.length)];
    }
    d.dir = dir;
    d.x = (d.x + DX[dir] + this.W) % this.W;
    d.y += DY[dir];
  }

  collide(now) {
    for (const d of this.drones) {
      if (d.deadUntil) continue;
      for (const p of this.players.values()) {
        if (p.caughtUntil || p.asking) continue;
        const same = p.x === d.x && p.y === d.y;
        const crossed = p.x === d.px && p.y === d.py && p.px === d.x && p.py === d.y;
        if (!same && !crossed) continue;
        if (p.powerUntil > now) {
          d.deadUntil = now + DRONE_BACK_MS;
          d.scared = false;
          p.drones++;
          p.crystals += POINTS.drone;
          p.dirty = true;
          this.addFeed(`⚡ ${p.name} schakelt een drone uit`);
          break;
        }
        if (!d.scared && this.vulnerable(p, now)) {
          p.caught++;
          p.crystals = Math.max(0, p.crystals - LOST_ON_CATCH);
          p.caughtUntil = now + CAUGHT_MS;
          p.dir = null;
          p.want = null;
          p.dirty = true;
        }
      }
    }
  }

  flushLog() {
    this.lastFlush = Date.now();
    if (!this.log || !this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.flushLog();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint met ${top.crystals} kristallen!`);
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

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, crystals: p.crystals, drones: p.drones, caught: p.caught,
        right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.crystals - a.crystals || b.right - a.right);
  }

  roster() {
    return [...this.players.values()].map(p => [p.n, p.name, p.color]);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, powerMs: this.powerMs,
      W: this.W, H: this.H, maze: this.maze, crystals: this.crystals ? Array.from(this.crystals).join('') : null,
      roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, crystals: p.crystals, pellets: p.pellets, max: MAX_PELLETS, drones: p.drones, streak: p.streak,
      power: Math.max(0, p.powerUntil - now), caught: p.caughtUntil ? p.caughtUntil - now : 0,
      safe: Math.max(0, p.safeUntil - now), wait: Math.max(0, p.waitUntil - now),
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, { name: p.name, color: p.color, me: this.me(p, Date.now(), ranking), right: p.right, wrong: p.wrong });
    }
    return state;
  }

  // Elke tick: waar iedereen staat (met hoe lang geleden de laatste stap was, om vloeiend te tekenen) en welke kristallen weg zijn.
  send(now) {
    const flags = p => (p.powerUntil > now ? 1 : 0) | (p.asking ? 2 : 0) | (p.caughtUntil ? 4 : 0) | (now < p.safeUntil ? 8 : 0)
      | (p.powerUntil > now && p.powerUntil - now < 2000 ? 16 : 0);
    const k = [...this.players.values()].map(p => [p.n, p.x, p.y, p.px, p.py, now - p.at, p.powerUntil > now ? POWER_KNIGHT_MS : KNIGHT_MS, flags(p), p.dir === null ? -1 : p.dir]);
    const d = this.drones.map(x => [x.x, x.y, x.px, x.py, now - x.at, x.scared ? SCARED_MS : DRONE_MS, (x.scared ? 1 : 0) | (x.deadUntil ? 2 : 0), x.dir]);
    const msg = { k, d, c: this.changes };
    this.changes = [];
    if (this.feedChanged) {
      msg.feed = this.feed;
      this.feedChanged = false;
    }
    let ranking = null;
    if ([...this.players.values()].some(p => p.dirty)) {
      ranking = this.ranking();
      msg.ranking = ranking;
    }
    this.io.to('host').emit('pk-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('pk-tick', { ...msg, ranking: undefined, me: this.me(p, now, ranking || this.ranking()) });
      } else {
        this.io.to(p.socketId).emit('pk-tick', { k, d, c: msg.c, feed: msg.feed });
      }
    }
  }

  broadcast() {
    this.io.to('host').emit('pk-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('pk-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('pk-state', this.base());
  }
}

module.exports = { PacKnight, makeMaze };
