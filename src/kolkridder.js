// Kolkridder: elke leerling stuurt een gloeiende plasmakolk door dezelfde sci-fi ridderstad.
// Alles wat kleiner is dan je kolk en erboven komt, slok je op: munten, tonnen, karren, huizen, torens, de burcht.
// Hoe meer je slokt, hoe groter je wordt. Je kolk draait op plasma: is die op, dan komt er een vraag.
// Juist = je kolk groeit meteen en krijgt 🌪 zuigkracht (slokt van verder). Fout = even wachten, een beetje plasma.
// Tijdens een vraag sta je stil en ben je beschermd. Niemand valt uit.
// Duelmodus (keuze van de leerkracht): een kolk die duidelijk groter is, slokt een kleinere op. Die verliest een deel
// van zijn grootte en komt meteen ergens anders terug. De server beweegt alle kolken en beslist alles.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const W = require('../public/js/ko-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const TICK_MS = 33;
const SEND_MS = 50;

class Kolkridder {
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
    this.duel = false;
    this.startedAt = 0;
    this.endsAt = 0;
    this.seed = 1;
    this.L = W.size(1);
    this.objs = [];
    this.dead = new Map(); // index -> wanneer opgeslokt
    this.grid = null;
    this.ev = [];
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.lastSend = 0;
    this.lastRank = 0;
    this.lastRegrow = 0;
    this.lastTick = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo, duel) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.duel = duel === true;
    this.vragen = new Vragen(quiz, 'Kolkridder', this.tempo);
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
    if (this.nextN > 250) return { error: 'De stad is vol.' };
    const p = {
      n: this.nextN++, name: clean, socketId, color: W.COLORS[this.players.size % W.COLORS.length],
      x: 0, y: 0, area: 1, dx: 0, dy: 0, alive: true, respawnAt: 0, safeUntil: 0, zuigUntil: 0, plasmaAt: 0,
      eaten: 0, big: 0, slok: 0, geslokt: 0, maxR: 1,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.byN.set(p.n, p);
    this.broadcast();
    if (this.phase === 'play') {
      // Wie later binnenkomt, begint niet piepklein tussen de reuzen: half zo groot als de middelste kolk.
      const areas = [...this.players.values()].filter(o => o !== p).map(o => o.area).sort((a, b) => a - b);
      if (areas.length) p.area = Math.max(1, areas[Math.floor(areas.length / 2)] * .5);
      p.maxR = W.radius(p.area);
      this.spawn(p, Date.now());
      p.plasmaAt = Date.now() + this.plasmaMs();
      this.sendWorld(p);
    }
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.byN.delete(p.n);
    this.io.to(p.socketId).emit('ko-kicked');
    this.broadcast();
  }

  plasmaMs() {
    return W.PLASMA_S * 1000 * Math.min(1.4, factor(this.tempo));
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.seed = Math.floor(Math.random() * 1e9);
    this.L = W.size(this.players.size);
    this.objs = W.city(this.seed, this.L);
    this.grid = W.grid(this.objs, this.L);
    this.dead = new Map();
    for (const p of this.players.values()) {
      this.spawn(p, now);
      p.plasmaAt = this.startedAt + this.plasmaMs();
    }
    this.ev = [];
    this.lastTick = now;
    this.addFeed('🌀 De kolken draaien. Slok de stad op!');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
    this.sendWorld();
  }

  // Een plek op een straat, zo ver mogelijk van de andere kolken.
  spawn(p, now) {
    const B = 20, N = Math.floor(this.L / B);
    const others = [...this.players.values()].filter(o => o !== p && o.alive);
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 30; i++) {
      const x = (1 + Math.floor(Math.random() * (N - 1))) * B, y = 4 + Math.random() * (this.L - 8);
      const pt = Math.random() < .5 ? { x, y } : { x: y, y: x };
      let near = this.L;
      for (const o of others) near = Math.min(near, Math.hypot(o.x - pt.x, o.y - pt.y) - W.radius(o.area));
      const score = Math.min(near, 30) + Math.random() * 3;
      if (score > bestScore) { bestScore = score; best = pt; }
    }
    p.x = best.x;
    p.y = best.y;
    p.alive = true;
    p.safeUntil = Math.max(now, this.startedAt) + (this.duel ? W.SAFE_MS : 0);
    p.dirty = true;
  }

  // ---------- Besturing ----------

  steer(playerId, v) {
    const p = this.players.get(playerId);
    if (!p || !Array.isArray(v)) return;
    let dx = Number(v[0]), dy = Number(v[1]);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    p.dx = dx;
    p.dy = dy;
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.asking;
    p.asking = Boolean(on) && this.phase === 'play';
    if (was && !p.asking && this.duel) p.safeUntil = Math.max(p.safeUntil, Date.now() + 1500);
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    p.dirty = true;
    return { ...res, r: Math.round(W.radius(p.area) * 10) / 10 };
  }

  // Juist: volle plasma, je kolk groeit meteen en krijgt zuigkracht. Fout: een beetje plasma, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    const now = Date.now();
    let grow = 0;
    if (res.correct) {
      const f = Math.min(1.5, factor(this.tempo));
      grow = Math.max(.8, p.area * .08) * f;
      p.area += grow;
      p.plasmaAt = now + this.plasmaMs();
      p.zuigUntil = Math.max(now, p.zuigUntil) + W.ZUIG_S * 1000;
      this.ev.push(['b', p.n]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    } else p.plasmaAt = Math.max(p.plasmaAt, now + W.WRONG_S * 1000);
    p.maxR = Math.max(p.maxR, W.radius(p.area));
    p.dirty = true;
    return { ...res, r: Math.round(W.radius(p.area) * 10) / 10, zuig: res.correct ? W.ZUIG_S : 0, streak: p.streak };
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now >= this.startedAt) {
      for (const p of this.players.values()) {
        if (!p.alive) {
          if (now >= p.respawnAt) this.spawn(p, now);
          continue;
        }
        if (p.asking) continue;
        const r = W.radius(p.area);
        const empty = now >= p.plasmaAt;
        const v = W.speed(r) * (empty ? .35 : 1) * dt;
        p.x = Math.max(0, Math.min(this.L, p.x + p.dx * v));
        p.y = Math.max(0, Math.min(this.L, p.y + p.dy * v));
        this.swallow(p, r, now);
      }
      if (this.duel) this.duels(now);
      if (now - this.lastRegrow > 1000) { this.lastRegrow = now; this.regrow(now); }
    }
    if (now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  // Alles wat past en boven de kolk ligt, valt erin. Met zuigkracht ook wat verder ligt.
  swallow(p, r, now) {
    const reach = p.zuigUntil > now ? r * W.ZUIG : r;
    let grew = 0;
    this.grid.each(p.x, p.y, reach + 1, i => {
      if (this.dead.has(i)) return;
      const o = this.objs[i];
      if (!W.fits(o.k, r)) return;
      const s = W.KINDS[o.k][1];
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d + s * .4 > reach) return;
      this.dead.set(i, now);
      grew += W.value(o.k);
      p.eaten++;
      this.ev.push(['e', i, p.n]);
      if (o.k >= W.K.huis) {
        p.big++;
        if (o.k === W.K.burcht) this.addFeed(`🏰 ${p.name} slokt de burcht op!`);
        else if (o.k === W.K.toren && p.big % 4 === 1) this.addFeed(`🗼 ${p.name} slokt een toren op`, false);
      }
    });
    if (grew) {
      p.area += grew;
      const nr = W.radius(p.area);
      if (Math.floor(nr) > Math.floor(p.maxR)) {
        p.dirty = true;
        if (nr >= 4 && Math.floor(nr) % 2 === 0) this.addFeed(`🌀 ${p.name} is al ${Math.round(nr * 2)} meter breed`, false);
      }
      p.maxR = Math.max(p.maxR, nr);
    }
  }

  // Duelmodus: de grote kolk slokt de kleine als het midden van de kleine ver genoeg in de grote zit.
  duels(now) {
    const list = [...this.players.values()].filter(p => p.alive && !p.asking && p.safeUntil <= now && now >= this.startedAt);
    for (const a of list) {
      const ra = W.radius(a.area);
      for (const b of list) {
        if (a === b || !a.alive || !b.alive) continue;
        const rb = W.radius(b.area);
        if (ra < rb * W.DUEL_BIG) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > ra - rb * .4) continue;
        const loss = b.area * .4;
        b.area = Math.max(1, b.area - loss);
        a.area += loss * .6;
        a.maxR = Math.max(a.maxR, W.radius(a.area));
        a.slok++;
        b.geslokt++;
        b.alive = false;
        b.respawnAt = now + W.RESPAWN_MS;
        a.dirty = b.dirty = true;
        this.ev.push(['d', b.n, a.n, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10]);
        this.addFeed(`🌀 ${a.name} slokt de kolk van ${b.name} op`, false);
      }
    }
  }

  // Opgeslokte voorwerpen komen terug, maar niet onder de neus van een kolk.
  regrow(now) {
    const holes = [...this.players.values()].filter(p => p.alive).map(p => [p.x, p.y, W.radius(p.area)]);
    for (const [i, at] of this.dead) {
      if (now - at < W.REGROW_MS) continue;
      const o = this.objs[i], s = W.KINDS[o.k][1];
      if (holes.some(([x, y, r]) => Math.hypot(o.x - x, o.y - y) < r + s + 3)) continue;
      this.dead.delete(i);
      this.ev.push(['r', i]);
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
    if (top) this.addFeed(`🏆 ${top.name} heeft de grootste kolk!`);
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
    const m = v => String(Math.round(v * 20) / 10).replace('.', ',');
    const rows = this.ranking().map((p, i) => [i + 1, p.name, m(p.r), m(p.maxR), p.eaten, p.big, p.slok, p.geslokt, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`kolkridder-${this.quiz.title}`, [['Kolkridder', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Duelmodus', this.duel ? 'aan' : 'uit'], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Breedte kolk (m)', 'Grootste breedte (m)', 'Voorwerpen opgeslokt', 'Gebouwen opgeslokt', 'Kolken opgeslokt', 'Zelf opgeslokt', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, r: Math.round(W.radius(p.area) * 100) / 100, maxR: Math.round(p.maxR * 100) / 100,
        score: Math.round(W.radius(p.area) * 20) / 10, eaten: p.eaten, big: p.big, slok: p.slok, geslokt: p.geslokt,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.r - a.r || b.eaten - a.eaten || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base0() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, duel: this.duel, L: this.L,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base0(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now, ranking) {
    return {
      n: p.n, alive: p.alive, r: Math.round(W.radius(p.area) * 100) / 100, plasma: Math.max(0, p.plasmaAt - Math.max(now, this.startedAt)), plasmaMax: this.plasmaMs(),
      zuig: Math.max(0, p.zuigUntil - now), respawn: p.alive ? 0 : Math.max(0, p.respawnAt - now), safe: Math.max(0, p.safeUntil - now),
      eaten: p.eaten, big: p.big, slok: p.slok, geslokt: p.geslokt, maxR: Math.round(p.maxR * 100) / 100,
      rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base0();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // De hele stad: alleen de seed en wat al opgeslokt is.
  worldMsg() {
    return { seed: this.seed, L: this.L, dead: [...this.dead.keys()] };
  }

  sendWorld(only) {
    const msg = this.worldMsg();
    if (only) return this.io.to(only.socketId).emit('ko-world', msg);
    this.io.to('host').emit('ko-world', msg);
    for (const p of this.players.values()) this.io.to(p.socketId).emit('ko-world', msg);
  }

  // Compact: [n, x*100, y*100, r*100, vlaggen]. Vlaggen: 1 zuigkracht, 2 aan het antwoorden, 4 beschermd, 8 plasma op.
  send(now) {
    const flags = p => (p.zuigUntil > now ? 1 : 0) | (p.asking ? 2 : 0) | (p.safeUntil > now ? 4 : 0) | (now >= p.plasmaAt && now >= this.startedAt ? 8 : 0);
    const msg = { k: [...this.players.values()].filter(p => p.alive).map(p => [p.n, Math.round(p.x * 100), Math.round(p.y * 100), Math.round(W.radius(p.area) * 100), flags(p)]), ev: this.ev };
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('ko-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('ko-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('ko-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('ko-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('ko-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('ko-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('ko-state', this.base0());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('ko-state', this.hostState());
    if (this.phase === 'play') socket.emit('ko-world', this.worldMsg());
    socket.on('ko-load', handle(({ file, minutes, tempo, duel } = {}) => {
      const busy = busyWith('kolk');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo, duel === true);
      return {};
    }));
    socket.on('ko-start', () => this.start());
    socket.on('ko-kick', id => this.kick(id));
    socket.on('ko-finish', () => this.finish());
    socket.on('ko-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo, this.duel));
    socket.on('ko-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('ko-state', this.base0());
    socket.on('ko-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.koId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) {
        socket.emit('ko-state', this.playerState(playerId));
        if (this.phase === 'play') socket.emit('ko-world', this.worldMsg());
      }
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.koId ? fn(socket.data.koId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('ko-steer', (id, v) => this.steer(id, v));
    on('ko-asking', (id, v) => this.asking(id, v));
    on('ko-question', id => guard.question(id));
    on('ko-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.koId) {
      this.asking(socket.data.koId, false);
      this.steer(socket.data.koId, [0, 0]);
    }
  }
}

module.exports = { Kolkridder };
