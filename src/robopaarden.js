// Robopaarden: een race met robotpaarden over een circuit rond het burchtmeer, met zijwegen, een geheim bospad,
// een sprong over de Drakenkloof, schansen en nitrostroken. In de wachtzaal bouwt elke leerling zijn eigen robotpaard.
// Rij door een runenkist en je krijgt een vraag (je paard galoppeert intussen vanzelf verder). Juist = een wapen,
// of extra nitro als je al een wapen hebt. Wie na de speeltijd het verst staat, wint.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De gsm rijdt zelf en stuurt zijn plek; de server rekent de afstand, de ronden, de wapens en de treffers.
const World = require('../public/js/rp-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf } = require('./tempo');

const TICK_MS = 33;
const SEND_MS = 66;
const MAX_NITRO = 3;
const ITEM_KEYS = Object.keys(World.ITEMS);
const ITEM_CODE = { vuurbal: 1, valk: 2 };

// Welk wapen je krijgt, hangt af van je plaats: de koplopers krijgen vooral verdediging, wie achteraan rijdt de sterke dingen.
const ODDS = [
  { spijkers: 40, schild: 30, vuurbal: 25, turbo: 5 },
  { vuurbal: 35, valk: 25, turbo: 20, spijkers: 10, schild: 10 },
  { valk: 30, turbo: 35, vuurbal: 15, donder: 12, schild: 8 },
];

class Robopaarden {
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
    this.minutes = 4;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.shots = [];
    this.traps = [];
    this.trapsChanged = false;
    this.nextShot = 1;
    this.feed = [];
    this.changed = false;
    this.bestLap = null; // { name, ms }
    this.resultsFile = null;
    this.sentAt = 0;
    this.rankAt = 0;
    this.lastTick = 0;
    this.rosterTimer = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 4;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Robopaarden', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId, look) {
    if (!this.active) return { error: 'Er is nog geen race gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'De race is voorbij. Wacht op de volgende.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const n = this.players.size ? Math.max(...[...this.players.values()].map(p => p.n)) + 1 : 0;
    const p = {
      n, name: clean, socketId, look: World.cleanLook(look, clean, n),
      x: 0, y: 0, z: 0, a: 0, v: 0, boost: false, spawn: 0, movedAt: 0, prog: 0, lastS: 0, laps: 0, maxLap: 0, lapStart: 0, bestLap: 0, lastLap: 0,
      item: null, nitro: 0, shieldUntil: 0, spinUntil: 0, safeUntil: 0, zapUntil: 0, asking: false, boxOpen: false, boxes: new Map(),
      hits: 0, taken: 0, used: 0, falls: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0,
    };
    this.players.set(playerId, p);
    if (this.phase === 'play') this.place(p, this.players.size - 1);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('rp-kicked');
    this.broadcast();
  }

  // Een leerling past zijn robotpaard aan (in de wachtzaal, maar ook later mag).
  setLook(playerId, look) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.look = World.cleanLook(look, p.name, p.n);
    if (this.rosterTimer) return;
    this.rosterTimer = setTimeout(() => {
      this.rosterTimer = null;
      if (this.phase === 'play') this.io.to('host').to('players').emit('rp-roster', this.roster());
      else this.broadcast();
    }, 250);
  }

  // Op de startopstelling, of (wie later komt) achteraan.
  place(p, k) {
    const g = World.grid(Math.min(k, 39));
    p.x = g.x;
    p.y = g.y;
    p.z = 0;
    p.a = g.a;
    p.v = 0;
    p.spawn++;
    p.movedAt = Date.now();
    p.lastS = World.sAt(World.locate(p.x, p.y, {}));
    p.prog = p.lastS > World.L / 2 ? p.lastS - World.L : p.lastS;
    p.lapStart = Math.max(Date.now(), this.startedAt);
    this.sendMe(p);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 4000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    let k = 0;
    for (const p of this.players.values()) this.place(p, k++);
    this.addFeed('🏁 De robotpaarden staan aan de start!');
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  playing(p) {
    return p && this.phase === 'play' && Date.now() >= this.startedAt;
  }

  // De gsm meldt waar zijn paard staat. Onmogelijke sprongen worden teruggezet.
  move(playerId, { x, y, z, a, v, b, s } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || s !== p.spawn || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    const dt = Math.min(1.5, Math.max(.05, (now - Math.max(p.movedAt, this.startedAt)) / 1000));
    const l = World.locate(x, y, {});
    if (l.i < 0 || l.edge > World.OFF + 60 || Math.hypot(x - p.x, y - p.y) > Math.min(1400, World.HORSE.nitro * dt * 1.35 + 260)) {
      p.spawn++;
      return this.sendMe(p);
    }
    p.movedAt = now;
    p.x = x;
    p.y = y;
    p.z = Number.isFinite(z) ? Math.max(-400, Math.min(500, z)) : 0;
    if (Number.isFinite(a)) p.a = a;
    p.v = Number.isFinite(v) ? Math.max(-300, Math.min(1100, v)) : 0;
    p.boost = !!b;
    const sNow = World.sAt(l);
    let d = sNow - p.lastS;
    if (d > World.L / 2) d -= World.L;
    if (d < -World.L / 2) d += World.L;
    p.lastS = sNow;
    if (Math.abs(d) < 2500) p.prog += d;
    const lap = Math.floor(p.prog / World.L);
    p.laps = Math.max(0, lap);
    if (lap > p.maxLap) {
      p.maxLap = lap;
      this.lap(p, lap, now);
    }
  }

  lap(p, laps, now) {
    const ms = now - p.lapStart;
    p.lapStart = now;
    p.lastLap = ms;
    const personal = !p.bestLap || ms < p.bestLap;
    if (personal) p.bestLap = ms;
    const record = !this.bestLap || ms < this.bestLap.ms;
    if (record) {
      this.bestLap = { name: p.name, ms };
      this.addFeed(`⏱️ ${p.name} rijdt de snelste ronde: ${(ms / 1000).toFixed(1).replace('.', ',')} s`);
    }
    this.io.to(p.socketId).emit('rp-lap', { laps, ms, personal, record });
  }

  // In de kloof gevallen: terug op de weg, een eind voor de schans.
  fall(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return;
    const r = World.respawnFrom(p.x, p.y);
    p.falls++;
    p.x = r.x;
    p.y = r.y;
    p.a = r.a;
    p.z = 0;
    p.v = 0;
    p.spawn++;
    p.movedAt = Date.now();
    const s = World.sAt(World.locate(p.x, p.y, {}));
    let d = s - p.lastS;
    if (d > World.L / 2) d -= World.L;
    if (d < -World.L / 2) d += World.L;
    p.prog += d;
    p.lastS = s;
    p.safeUntil = Date.now() + World.SAFE_MS;
    if (p.falls === 1 || p.falls % 3 === 0) this.addFeed(`🐉 ${p.name} valt in de Drakenkloof!`, false);
    this.sendMe(p);
  }

  // Een runenkist opendoen: alleen als je er echt vlakbij bent en die kist niet net nog nam.
  openBox(playerId, box) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'De race loopt niet.' };
    if (p.boxOpen || (p.question !== null && p.question !== undefined)) return { ok: true };
    const b = World.BOXES[box];
    const now = Date.now();
    if (!b || Math.hypot(b.x - p.x, b.y - p.y) > 520) return { error: 'Geen kist.' };
    if (now - (p.boxes.get(box) || 0) < World.BOX_BACK_MS - 600) return { error: 'Geen kist.' };
    p.boxes.set(box, now);
    p.boxOpen = true;
    return { ok: true };
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'De race loopt niet.' };
    if (!p.boxOpen && (p.question === null || p.question === undefined)) return { error: 'Rij eerst door een runenkist.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    return { ...res, streak: p.streak, item: p.item };
  }

  roll(p) {
    const ranking = this.ranking();
    const n = ranking.length;
    const rank = ranking.findIndex(r => r.n === p.n);
    const f = n > 1 ? rank / (n - 1) : .5;
    const odds = { ...ODDS[f < .34 ? 0 : f > .66 ? 2 : 1] };
    if (n < 3) delete odds.donder;
    let total = 0;
    for (const k in odds) total += odds[k];
    let r = Math.random() * total;
    for (const k in odds) { r -= odds[k]; if (r <= 0) return k; }
    return 'vuurbal';
  }

  // Juist: een wapen (of extra nitro als je al een wapen hebt). Fout: even wachten, de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    p.boxOpen = false;
    let got = null;
    let nitro = false;
    if (res.correct) {
      if (!p.item) got = p.item = this.roll(p);
      else if (p.nitro < MAX_NITRO) { p.nitro++; nitro = true; }
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    this.sendMe(p);
    return { ...res, item: p.item, got, nitro, nitros: p.nitro, streak: p.streak };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = !!on && this.phase === 'play';
    if (!p.asking) p.safeUntil = Math.max(p.safeUntil, Date.now() + 600);
  }

  nitro(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.nitro <= 0) return { error: 'Geen nitro.' };
    p.nitro--;
    this.sendMe(p);
    return { ok: true, nitros: p.nitro };
  }

  // Een wapen gebruiken. a = de kijkrichting van de gsm (de server houdt die dicht bij de echte).
  use(playerId, { a } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.item) return { error: 'Geen wapen.' };
    if (p.asking) return { error: 'Eerst je vraag afmaken.' };
    const now = Date.now();
    const kind = p.item;
    p.item = null;
    p.used++;
    let angle = p.a;
    if (Number.isFinite(a) && Math.abs(World.wrap(a - p.a)) < .6) angle = a;
    p.safeUntil = Math.min(p.safeUntil, now);
    const spec = World.ITEMS[kind];
    let extra = {};
    if (kind === 'vuurbal' || kind === 'valk') {
      const target = kind === 'valk' ? this.ahead(p) : null;
      this.shots.push({
        id: this.nextShot++, kind, owner: p, target, x: p.x + Math.cos(angle) * 70, y: p.y + Math.sin(angle) * 70, a: angle,
        speed: spec.speed + Math.max(0, p.v) * .5, until: now + spec.life * 1000,
      });
      if (target) this.io.to(target.socketId).emit('rp-warn', { by: p.name, kind });
      this.addFeed(`${spec.icon} ${p.name} ${kind === 'valk' ? `stuurt een robovalk${target ? ` op ${target.name} af` : ''}` : 'gooit een vuurbal'}`, false);
    } else if (kind === 'spijkers') {
      const own = this.traps.filter(t => t.owner === p);
      if (own.length >= spec.max) this.traps.splice(this.traps.indexOf(own[0]), 1);
      this.traps.push({ id: this.nextShot++, owner: p, x: p.x - Math.cos(p.a) * 80, y: p.y - Math.sin(p.a) * 80, until: now + spec.life * 1000, armAt: now + 600 });
      this.trapsChanged = true;
    } else if (kind === 'schild') {
      p.shieldUntil = now + spec.ms;
    } else if (kind === 'turbo') {
      p.nitro = Math.min(MAX_NITRO + 2, p.nitro + spec.charges);
    } else if (kind === 'donder') {
      let n = 0;
      for (const v of this.players.values()) {
        if (v === p || v.prog <= p.prog) continue;
        if (this.blocked(v, now, true)) continue;
        v.zapUntil = now + spec.ms;
        n++;
        this.sendMe(v);
        this.io.to(v.socketId).emit('rp-zapped', { by: p.name, ms: spec.ms });
      }
      this.io.to('players').to('host').emit('rp-donder', { n: p.n });
      this.addFeed(`🌩️ ${p.name} laat de donder los: ${n} ${n === 1 ? 'paard' : 'paarden'} vertraagd!`);
      extra = { zapped: n };
    }
    this.sendMe(p);
    return { ok: true, kind, nitros: p.nitro, ...extra };
  }

  // Het paard vlak voor jou in de stand (het doelwit van de robovalk).
  ahead(p) {
    let best = null;
    for (const v of this.players.values()) {
      if (v === p || v.prog <= p.prog) continue;
      if (!best || v.prog < best.prog) best = v;
    }
    return best;
  }

  // Schild, aan het antwoorden, of net geraakt: dan doet een treffer niets. Een schild breekt wel.
  blocked(v, now, breakShield) {
    if (v.asking || now < v.safeUntil) return true;
    if (v.shieldUntil > now) {
      if (breakShield) v.shieldUntil = 0;
      return true;
    }
    return false;
  }

  hit(owner, v, kind, now) {
    const blocked = this.blocked(v, now, true);
    this.io.to('players').to('host').emit('rp-hit', { n: v.n, by: owner ? owner.n : -1, kind, x: Math.round(v.x), y: Math.round(v.y), blocked });
    if (blocked) { this.sendMe(v); return; }
    v.spinUntil = now + World.SPIN_MS;
    v.safeUntil = now + World.SPIN_MS + World.SAFE_MS;
    v.taken++;
    if (owner && owner !== v) {
      owner.hits++;
      const icon = World.ITEMS[kind] ? World.ITEMS[kind].icon : '💥';
      this.addFeed(`${owner.name} ${icon} ${v.name}`, false);
      this.io.to(owner.socketId).emit('rp-raak', { victim: v.name, kind });
    }
    this.io.to(v.socketId).emit('rp-spin', { by: owner ? owner.name : '', kind, ms: World.SPIN_MS });
    this.sendMe(v);
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.phase !== 'play') return;
    const gone = [];
    for (const s of this.shots) {
      if (now > s.until) { s.dead = true; gone.push(s); continue; }
      if (s.kind === 'valk' && s.target && this.players.has(this.idOf(s.target))) {
        const want = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        const turn = World.ITEMS.valk.turn * dt;
        s.a += Math.max(-turn, Math.min(turn, World.wrap(want - s.a)));
      }
      const steps = 3;
      for (let k = 0; k < steps && !s.dead; k++) {
        s.x += (Math.cos(s.a) * s.speed * dt) / steps;
        s.y += (Math.sin(s.a) * s.speed * dt) / steps;
        if (s.kind === 'vuurbal' && World.wallAt(s.x, s.y)) { s.dead = true; break; }
        for (const v of this.players.values()) {
          if (v === s.owner || v.z > 120) continue;
          if (s.kind === 'valk' && s.target && v !== s.target) continue;
          const r = World.ITEMS[s.kind].r + World.R;
          if ((v.x - s.x) ** 2 + (v.y - s.y) ** 2 > r * r) continue;
          s.dead = true;
          this.hit(s.owner, v, s.kind, now);
          break;
        }
      }
      if (s.dead) gone.push(s);
    }
    if (gone.length) {
      this.shots = this.shots.filter(s => !s.dead);
      for (const s of gone) this.io.to('players').to('host').emit('rp-pop', { id: s.id, x: Math.round(s.x), y: Math.round(s.y), kind: s.kind });
    }
    let trapsGone = false;
    for (const t of this.traps) {
      if (now > t.until) { t.dead = true; trapsGone = true; continue; }
      if (now < t.armAt) continue;
      for (const v of this.players.values()) {
        if (v === t.owner || v.z > 30) continue;
        const r = World.ITEMS.spijkers.r + World.R;
        if ((v.x - t.x) ** 2 + (v.y - t.y) ** 2 > r * r) continue;
        t.dead = true;
        trapsGone = true;
        this.hit(t.owner, v, 'spijkers', now);
        break;
      }
    }
    if (trapsGone) {
      this.traps = this.traps.filter(t => !t.dead);
      this.trapsChanged = true;
    }
    if (now - this.sentAt >= SEND_MS) {
      this.sentAt = now;
      this.sendWorld(now);
    }
  }

  idOf(p) {
    for (const [id, o] of this.players) if (o === p) return id;
    return null;
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    clearTimeout(this.rosterTimer);
    this.rosterTimer = null;
    this.ticker = null;
    this.phase = 'einde';
    this.shots = [];
    this.traps = [];
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint de race!`);
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
    clearTimeout(this.rosterTimer);
    this.reset();
    this.broadcast();
    return file;
  }

  save() {
    const fmt = ms => (ms ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : '-');
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.laps, `${Math.round(p.km * 10) / 10}`, fmt(p.bestLap), p.hits, p.taken, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`robopaarden-${this.quiz.title}`, [['Robopaarden', this.quiz.title], ['Racetijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Plaats', 'Naam', 'Ronden', 'Afgelegd (ronden)', 'Snelste ronde', 'Raak', 'Geraakt', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.changed = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, look: p.look, laps: p.laps, km: Math.max(0, p.prog) / World.L, prog: Math.round(p.prog), bestLap: p.bestLap,
        hits: p.hits, taken: p.taken, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak, asking: p.asking,
      }))
      .sort((a, b) => b.prog - a.prog);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, look: p.look }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, bestLap: this.bestLap, resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, {
        n: p.n, name: p.name, look: p.look, rank: ranking.findIndex(r => r.n === p.n) + 1, players: ranking.length,
        laps: p.laps, bestLap: p.bestLap, hits: p.hits, right: p.right, wrong: p.wrong, km: Math.max(0, p.prog) / World.L,
      });
    }
    return state;
  }

  // Wat alleen de leerling zelf moet weten: wapen, nitro, schild, en (na een correctie) de juiste plek.
  sendMe(p) {
    const now = Date.now();
    this.io.to(p.socketId).emit('rp-me', {
      n: p.n, item: p.item, nitro: p.nitro, spawn: p.spawn, x: Math.round(p.x), y: Math.round(p.y), a: p.a,
      shield: Math.max(0, p.shieldUntil - now), spin: Math.max(0, p.spinUntil - now), zap: Math.max(0, p.zapUntil - now),
      safe: Math.max(0, p.safeUntil - now), laps: p.laps, bestLap: p.bestLap, lapStart: p.lapStart, now,
    });
  }

  // Compacte posities: [n, x, y, z, hoek, snelheid, vlaggen]. Vlaggen: 1 tolt, 2 schild, 4 vraag, 8 nitro, 16 vertraagd.
  // Volatile: een gsm die achterloopt, krijgt meteen de nieuwste stand in plaats van een stapel oude.
  sendWorld(now) {
    const list = [...this.players.values()].map(p => {
      const flags = (p.spinUntil > now ? 1 : 0) | (p.shieldUntil > now ? 2 : 0) | (p.asking ? 4 : 0) | (p.boost ? 8 : 0) | (p.zapUntil > now ? 16 : 0);
      return [p.n, Math.round(p.x), Math.round(p.y), Math.round(p.z), +p.a.toFixed(2), Math.round(p.v), flags];
    });
    const shots = this.shots.map(s => [ITEM_CODE[s.kind], s.id, Math.round(s.x), Math.round(s.y), +s.a.toFixed(2)]);
    const payload = { now, p: list, s: shots };
    if (this.trapsChanged) {
      this.trapsChanged = false;
      payload.t = this.traps.map(t => [t.id, Math.round(t.x), Math.round(t.y)]);
    }
    const full = this.changed || now - this.rankAt > 500;
    if (full) {
      this.rankAt = now;
      const ranking = this.ranking();
      payload.r = ranking.map(r => [r.n, r.laps]);
      this.io.to('players').volatile.emit('rp-world', payload);
      payload.ranking = ranking;
      payload.feed = this.feed;
      payload.bestLap = this.bestLap;
      this.changed = false;
      this.io.to('host').volatile.emit('rp-world', payload);
      return;
    }
    this.io.to('players').to('host').volatile.emit('rp-world', payload);
  }

  broadcast() {
    this.io.to('host').emit('rp-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('rp-state', this.playerState(id));
      if (this.phase === 'play') this.sendMe(p);
    }
    this.io.to('players').except(seen).emit('rp-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('rp-state', this.hostState());
    socket.on('rp-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('paarden');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('rp-start', () => this.start());
    socket.on('rp-kick', id => this.kick(id));
    socket.on('rp-finish', () => this.finish());
    socket.on('rp-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('rp-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('rp-state', this.base());
    socket.on('rp-join', ({ playerId, name, look } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id, look);
      socket.data.rpId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) {
        socket.emit('rp-state', this.playerState(playerId));
        if (this.phase === 'play') this.sendMe(this.players.get(playerId));
      }
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.rpId ? fn(socket.data.rpId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    socket.on('rp-move', m => { if (socket.data.rpId) this.move(socket.data.rpId, m || {}); });
    on('rp-look', (id, look) => this.setLook(id, look));
    on('rp-fall', id => this.fall(id));
    on('rp-asking', (id, v) => this.asking(id, v));
    on('rp-nitro', id => this.nitro(id));
    on('rp-use', (id, m) => this.use(id, m || {}));
    on('rp-question', (id, m) => {
      const box = m && Number.isInteger(m.box) ? m.box : -1;
      const opened = this.openBox(id, box);
      if (opened.error) return opened;
      return guard.question(id);
    });
    on('rp-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Robopaarden };
