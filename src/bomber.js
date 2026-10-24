// Bomber-Knight: tot dertig ridders in één arena vol kratten en pilaren, zoals Bomberman.
// Een mijn kost ⚡ energie, en energie verdien je alleen met goede antwoorden. Een mijn ontploft na een paar
// seconden in een kruis; kratten springen open (💎 en soms een upgrade: 🔥 grotere ontploffing, 🛡️ schild, ⚡ energie).
// Wie geraakt wordt, verliest een paar kristallen en staat even later ergens anders weer op.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De server beslist alles: leerlingen sturen alleen een richting en "mijn leggen".
const logboek = require('./logboek');
const { tempoOf, factor } = require('./tempo');
const quizzes = require('./quizzes');

const TICK_MS = 50;
const STEP_MS = 175;        // tijd per vakje
const MINE_MS = 2300;       // tot een mijn ontploft
const BLAST_MS = 550;       // zo lang brandt een ontploffing
const KO_MS = 3000;
const SAFE_MS = 2000;
const WRONG_WAIT_MS = 3000;
const MAX_ENERGY = 6;
const START_ENERGY = 2;
const MAX_MINES = 3;        // tegelijk op het veld per ridder
const START_RANGE = 2;
const MAX_RANGE = 6;
const LOST_ON_KO = 3;
const POINTS = { krat: 1, gem: 3, ko: 5 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function sizeFor(players) {
  if (players <= 4) return { W: 17, H: 13 };
  if (players <= 8) return { W: 21, H: 15 };
  if (players <= 14) return { W: 25, H: 17 };
  if (players <= 20) return { W: 29, H: 19 };
  if (players <= 26) return { W: 33, H: 21 };
  return { W: 37, H: 23 };
}

// Rand en pilaren op elk even vakje, zoals in het echte spel. Een paar pilaren extra voor afwisseling.
function makeArena(W, H, rnd = Math.random) {
  const g = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      row += edge || (x % 2 === 0 && y % 2 === 0) ? '#' : '.';
    }
    g.push(row.split(''));
  }
  // Een handvol losse torens op oneven plekken, nooit naast elkaar, zodat alles bereikbaar blijft.
  const extra = Math.floor(W * H / 90);
  for (let i = 0; i < extra; i++) {
    const x = 1 + 2 * Math.floor(rnd() * ((W - 1) / 2)), y = 2 + 2 * Math.floor(rnd() * ((H - 3) / 2));
    if (g[y][x] === '.' && x > 2 && x < W - 3) g[y][x] = '#';
  }
  return g.map(r => r.join(''));
}

class Bomber {
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
    this.arena = null;
    this.W = 0;
    this.H = 0;
    this.crates = null;
    this.pickups = null;
    this.startCrates = 0;
    this.mines = [];
    this.blast = new Map(); // vakje -> { until, owner }
    this.changes = [];      // [vakje, krat, upgrade]
    this.events = [];
    this.mineId = 0;
    this.lastRegrow = 0;
    this.feed = [];
    this.feedChanged = false;
    this.log = [];
    this.lastFlush = 0;
    this.lastRank = 0;
    this.resultsFile = null;
    this.nextN = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get energyPerAnswer() {
    return Math.max(1, Math.round(2 * factor(this.tempo)));
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
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
      x: 1, y: 1, px: 1, py: 1, at: 0, next: 0, want: -1, face: 2,
      energy: START_ENERGY, range: START_RANGE, shield: false,
      crystals: 0, kos: 0, deaths: 0, crates: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
      asking: false, question: null, order: [], last: null, waitUntil: 0, koUntil: 0, safeUntil: 0, by: null, dirty: true,
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
    this.io.to(p.socketId).emit('bk-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const { W, H } = sizeFor(this.players.size);
    this.W = W;
    this.H = H;
    this.arena = makeArena(W, H);
    this.crates = new Uint8Array(W * H);
    this.pickups = new Uint8Array(W * H); // 0 niets, 1 💎, 2 🔥, 3 🛡️, 4 ⚡
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (this.arena[y][x] === '.' && Math.random() < .45) this.crates[y * W + x] = 1;
      }
    }
    this.startCrates = this.crates.reduce((a, c) => a + c, 0);
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.lastRegrow = now;
    for (const p of this.players.values()) this.spawn(p, now);
    this.changes = [];
    this.addFeed('💣 De arena gaat open. Verdien ⚡ energie voor je mijnen!');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Arena ----------

  free(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false;
    return this.arena[y][x] !== '#' && !this.crates[y * this.W + x];
  }

  setCrate(i, v) {
    this.crates[i] = v;
    this.changes.push([i, v, this.pickups[i]]);
  }

  setPickup(i, v) {
    this.pickups[i] = v;
    this.changes.push([i, this.crates[i], v]);
  }

  // Een vrije plek zonder mijnen in de buurt. Daarna een vluchtweg vrijmaken (een vakje opzij en een naar boven of onder).
  spawn(p, now) {
    const cells = [];
    for (let y = 1; y < this.H - 1; y++) {
      for (let x = 1; x < this.W - 1; x++) {
        if (!this.free(x, y) || this.blast.has(y * this.W + x)) continue;
        if (this.mines.some(m => Math.abs(m.x - x) + Math.abs(m.y - y) <= 3)) continue;
        let near = 99;
        for (const o of this.players.values()) if (o !== p && !o.koUntil) near = Math.min(near, Math.abs(o.x - x) + Math.abs(o.y - y));
        cells.push({ x, y, near });
      }
    }
    cells.sort((a, b) => b.near - a.near);
    const pick = cells[Math.floor(Math.random() * Math.min(cells.length, Math.max(8, cells.length / 3)))] || { x: 1, y: 1 };
    for (const [dx, dy] of [[Math.random() < .5 ? -1 : 1, 0], [0, Math.random() < .5 ? -1 : 1]]) {
      const x = pick.x + dx, y = pick.y + dy;
      const i = y * this.W + x;
      if (this.arena[y][x] !== '#' && this.crates[i]) this.setCrate(i, 0);
    }
    p.x = p.px = pick.x;
    p.y = p.py = pick.y;
    p.at = now;
    p.next = Math.max(now, this.startedAt);
    p.want = -1;
    p.koUntil = 0;
    p.by = null;
    p.safeUntil = Math.max(now, this.startedAt) + SAFE_MS;
    p.dirty = true;
  }

  // ---------- Besturing ----------

  steer(playerId, dir) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || ![-1, 0, 1, 2, 3].includes(dir)) return;
    p.want = dir;
    if (dir >= 0) p.face = dir;
    // Meteen een stap zetten als de ridder stilstond: zo voelt het direct aan.
    const now = Date.now();
    if (dir >= 0 && p.next <= now && now >= this.startedAt && !p.koUntil && !p.asking) {
      p.next = now;
      this.move(p, now);
    }
  }

  move(p, now) {
    let steps = 0;
    while (p.next <= now && steps++ < 3) {
      if (p.want < 0 || !this.free(p.x + DX[p.want], p.y + DY[p.want])) {
        p.px = p.x;
        p.py = p.y;
        p.next = now;
        return;
      }
      p.px = p.x;
      p.py = p.y;
      p.x += DX[p.want];
      p.y += DY[p.want];
      p.at = now;
      p.next += STEP_MS;
      this.collect(p);
    }
    if (p.next < now - 300) p.next = now;
  }

  collect(p) {
    const i = p.y * this.W + p.x;
    const k = this.pickups[i];
    if (!k) return;
    this.setPickup(i, 0);
    if (k === 1) p.crystals += POINTS.gem;
    else if (k === 2) p.range = Math.min(MAX_RANGE, p.range + 1);
    else if (k === 3) p.shield = true;
    else if (k === 4) p.energy = Math.min(MAX_ENERGY, p.energy + 1);
    this.events.push(['p', p.n, k]);
    p.dirty = true;
  }

  mine(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (p.koUntil) return { error: 'Wacht tot je terug in de arena staat.' };
    if (p.energy <= 0) return { error: 'Geen ⚡ energie. Beantwoord een vraag!', empty: true };
    if (this.mines.filter(m => m.owner === p.n).length >= MAX_MINES) return { error: 'Je hebt al drie mijnen liggen.' };
    if (this.mines.some(m => m.x === p.x && m.y === p.y)) return { error: 'Hier ligt al een mijn.' };
    p.energy--;
    this.mines.push({ id: this.mineId++, owner: p.n, x: p.x, y: p.y, at: now + MINE_MS, range: p.range });
    p.dirty = true;
    return { ok: true, energy: p.energy };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    if (p.asking) p.want = -1;
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
    return { question: q.question, answers: q.answers, energy: p.energy, max: MAX_ENERGY, gain: this.energyPerAnswer };
  }

  // Juist: energie erbij. Drie op rij: ook een grotere ontploffing. Vijf op rij: een schild.
  // Fout: even wachten, en de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Bomber-Knight', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    let gained = 0;
    let bonus = null;
    let wait = 0;
    if (correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      gained = Math.min(this.energyPerAnswer, MAX_ENERGY - p.energy);
      p.energy += gained;
      if (p.streak % 5 === 0) {
        p.shield = true;
        bonus = 'schild';
      } else if (p.streak % 3 === 0 && p.range < MAX_RANGE) {
        p.range++;
        bonus = 'bereik';
      }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
      wait = WRONG_WAIT_MS;
      p.waitUntil = Date.now() + wait;
      p.order.splice(Math.min(2, p.order.length), 0, p.question);
    }
    p.question = null;
    p.dirty = true;
    return { correct, right: q.correct, gained, bonus, energy: p.energy, max: MAX_ENERGY, range: p.range, shield: p.shield, streak: p.streak, wait };
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    if (now >= this.startedAt) {
      for (const p of this.players.values()) {
        if (p.koUntil) {
          if (now >= p.koUntil) this.spawn(p, now);
          continue;
        }
        if (p.asking) {
          p.next = now;
          p.px = p.x;
          p.py = p.y;
          continue;
        }
        this.move(p, now);
      }
      for (const m of [...this.mines]) if (m.at <= now && this.mines.includes(m)) this.explode(m, now);
      for (const [i, b] of this.blast) if (b.until <= now) this.blast.delete(i);
      this.hits(now);
      if (now - this.lastRegrow > 5000) this.regrow(now);
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    if (now - this.lastRank > 1000) {
      this.lastRank = now;
      for (const p of this.players.values()) p.dirty = true;
    }
    this.send(now);
  }

  // Een kruis van vuur. Pilaren houden het tegen, een krat springt open en stopt de ontploffing.
  // Raakt het vuur een andere mijn, dan gaat die meteen mee.
  explode(first, now) {
    const queue = [first];
    while (queue.length) {
      const m = queue.shift();
      const at = this.mines.indexOf(m);
      if (at < 0) continue;
      this.mines.splice(at, 1);
      const cells = [m.y * this.W + m.x];
      const opened = [];
      for (let d = 0; d < 4; d++) {
        for (let k = 1; k <= m.range; k++) {
          const x = m.x + DX[d] * k, y = m.y + DY[d] * k;
          if (this.arena[y][x] === '#') break;
          const i = y * this.W + x;
          cells.push(i);
          if (this.crates[i]) {
            opened.push(i);
            break;
          }
        }
      }
      const owner = [...this.players.values()].find(p => p.n === m.owner);
      for (const i of cells) {
        this.blast.set(i, { until: now + BLAST_MS, owner: m.owner });
        if (this.pickups[i] && !this.crates[i]) this.setPickup(i, 0);
        const other = this.mines.find(o => o.y * this.W + o.x === i);
        if (other && !queue.includes(other)) queue.push(other);
      }
      for (const i of opened) {
        const r = Math.random();
        this.pickups[i] = r < .3 ? 1 : r < .42 ? 2 : r < .48 ? 3 : r < .6 ? 4 : 0;
        this.setCrate(i, 0);
        if (owner) {
          owner.crates++;
          owner.crystals += POINTS.krat;
          owner.dirty = true;
        }
      }
      this.events.push(['x', m.x, m.y, cells, m.owner]);
    }
  }

  vulnerable(p, now) {
    return !p.koUntil && !p.asking && now >= p.safeUntil && now >= this.startedAt;
  }

  hits(now) {
    for (const p of this.players.values()) {
      if (!this.vulnerable(p, now)) continue;
      const b = this.blast.get(p.y * this.W + p.x);
      if (!b) continue;
      if (p.shield) {
        p.shield = false;
        p.safeUntil = now + 1200;
        p.dirty = true;
        this.events.push(['s', p.n]);
        continue;
      }
      const lost = Math.min(p.crystals, LOST_ON_KO);
      p.crystals -= lost;
      p.deaths++;
      p.koUntil = now + KO_MS;
      p.want = -1;
      p.dirty = true;
      const by = [...this.players.values()].find(o => o.n === b.owner);
      if (by && by !== p) {
        by.kos++;
        by.crystals += POINTS.ko;
        by.dirty = true;
        p.by = by.name;
        this.addFeed(`💥 ${by.name} schakelt ${p.name} uit`);
      } else {
        p.by = null;
      }
      this.events.push(['k', p.n, lost]);
    }
  }

  // Kratten groeien terug, zodat er altijd iets op te blazen valt. Nooit vlak naast een ridder.
  regrow(now) {
    this.lastRegrow = now;
    const count = this.crates.reduce((a, c) => a + c, 0);
    if (count > this.startCrates * .45) return;
    let added = 0;
    for (let tries = 0; tries < 200 && added < 8; tries++) {
      const x = 1 + Math.floor(Math.random() * (this.W - 2)), y = 1 + Math.floor(Math.random() * (this.H - 2));
      const i = y * this.W + x;
      if (!this.free(x, y) || this.pickups[i] || this.blast.has(i)) continue;
      if (this.mines.some(m => m.x === x && m.y === y)) continue;
      if ([...this.players.values()].some(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 2)) continue;
      this.setCrate(i, 1);
      added++;
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
        id, n: p.n, name: p.name, color: p.color, crystals: p.crystals, kos: p.kos, deaths: p.deaths, crates: p.crates,
        range: p.range, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.crystals - a.crystals || b.kos - a.kos || b.right - a.right);
  }

  roster() {
    return [...this.players.values()].map(p => [p.n, p.name, p.color]);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, step: STEP_MS, mineMs: MINE_MS, blastMs: BLAST_MS,
      W: this.W, H: this.H, arena: this.arena,
      crates: this.crates ? Array.from(this.crates).join('') : null,
      pickups: this.pickups ? Array.from(this.pickups).join('') : null,
      roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, crystals: p.crystals, energy: p.energy, max: MAX_ENERGY, range: p.range, shield: p.shield, kos: p.kos,
      ko: p.koUntil ? p.koUntil - now : 0, by: p.by, safe: Math.max(0, p.safeUntil - now), wait: Math.max(0, p.waitUntil - now),
      mines: this.mines.filter(m => m.owner === p.n).length, maxMines: MAX_MINES, streak: p.streak,
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

  // Elke tick: wie bewoog (met hoe lang geleden de laatste stap was, om vloeiend te tekenen), de mijnen als die
  // veranderden, de veranderde vakjes en wat er gebeurde (ontploffingen, upgrades, uitgeschakeld).
  // Wie stilstaat, wordt niet elke keer opnieuw gestuurd; één keer per seconde gaat iedereen mee. Zo blijft het
  // licht voor de wifi, ook met dertig ridders.
  send(now) {
    const flags = p => (p.asking ? 1 : 0) | (p.koUntil ? 2 : 0) | (now < p.safeUntil ? 4 : 0) | (p.shield ? 8 : 0);
    this.sendCount = (this.sendCount || 0) + 1;
    const full = this.sendCount % 20 === 0;
    const k = [];
    for (const p of this.players.values()) {
      const t = [p.n, p.x, p.y, p.px, p.py, Math.min(now - p.at, STEP_MS), p.face, flags(p)];
      const key = t.join();
      if (full || key !== p.sentKey) k.push(t);
      p.sentKey = key;
    }
    const mineKey = this.mines.map(x => x.id).join();
    const m = full || mineKey !== this.sentMines ? this.mines.map(x => [x.id, x.x, x.y, x.at - now, x.owner]) : undefined;
    this.sentMines = mineKey;
    const msg = { k, m, c: this.changes, e: this.events, full: full ? 1 : undefined };
    this.changes = [];
    this.events = [];
    if (this.feedChanged) {
      msg.feed = this.feed;
      this.feedChanged = false;
    }
    let ranking = null;
    if ([...this.players.values()].some(p => p.dirty)) {
      ranking = this.ranking();
      msg.ranking = ranking;
    }
    this.io.to('host').emit('bk-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('bk-tick', { ...msg, ranking: undefined, me: this.me(p, now, ranking || this.ranking()) });
      } else {
        this.io.to(p.socketId).emit('bk-tick', { k, m, c: msg.c, e: msg.e, feed: msg.feed, full: msg.full });
      }
    }
  }

  broadcast() {
    this.io.to('host').emit('bk-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('bk-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('bk-state', this.base());
  }
}

module.exports = { Bomber, makeArena, sizeFor };
