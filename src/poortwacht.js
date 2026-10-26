// Poortwacht: de hele klas verdedigt samen de burchtpoort tegen golven sci-fi-monsters.
// Elke leerling heeft één torenplaats langs het pad. Goede antwoorden geven goud; daarmee bouw en verbeter je je toren.
// Drie juist op rij: een ⚡ bliksem rond je toren. Op het einde komt de draak. Houdt de poort stand tot de tijd om is, dan wint de klas.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De server rekent alles uit (monsters, torens, schoten); de schermen tekenen het na.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/pw-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const TICK_MS = 50;
const SEND_MS = 100;
const FIRST_WAVE_MS = 7000;
const WAVE_MS = 20000;
// Getest met een simulatie: een klas die vlot en meestal juist antwoordt, houdt de poort; een klas die gokt of treuzelt, niet.
const HP_SCALE = 1.5, HP_RAMP = 5.5, RATE = 1.4, BOSS = 2.5;

class Poortwacht {
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
    this.slots = [];       // [{ i, x, y, owner (n of -1) }]
    this.towers = new Map(); // slot -> { slot, n, type, lvl, cd }
    this.monsters = [];
    this.nextId = 1;
    this.spawnAcc = 0;
    this.wave = 0;
    this.bossAt = 0;
    this.boss = null;
    this.bossDone = false;
    this.gate = World.GATE_HP;
    this.won = null;
    this.kills = 0;
    this.leaks = 0;
    this.ev = [];
    this.feed = [];
    this.feedChanged = false;
    this.towersChanged = false;
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
    this.vragen = new Vragen(quiz, 'Poortwacht', this.tempo);
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
    const n = this.players.size ? Math.max(...[...this.players.values()].map(p => p.n)) + 1 : 0;
    const p = {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length], slot: -1,
      gold: World.START_GOLD, earned: 0, bolt: 0, dmg: 0, kills: 0, score: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    if (this.phase === 'play') this.giveSlot(p);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    if (p.slot >= 0) {
      const s = this.slots.find(o => o.i === p.slot);
      if (s) s.owner = -1;
      this.towers.delete(p.slot);
      this.towersChanged = true;
    }
    this.io.to(p.socketId).emit('pw-kicked');
    this.broadcast();
  }

  // Een vrije plaats voor wie later binnenkomt: de vrije plaats die het verst van de anderen ligt.
  giveSlot(p) {
    const used = new Set(this.slots.map(s => s.i));
    let best = -1, bestD = -1;
    World.SLOTS.forEach((s, i) => {
      if (used.has(i)) return;
      let near = Infinity;
      for (const o of this.slots) near = Math.min(near, Math.hypot(World.SLOTS[o.i].x - s.x, World.SLOTS[o.i].y - s.y));
      if (near > bestD) { bestD = near; best = i; }
    });
    const free = this.slots.find(s => s.owner < 0);
    if (free) { free.owner = p.n; p.slot = free.i; return; }
    if (best < 0) return;
    this.slots.push({ i: best, x: World.SLOTS[best].x, y: World.SLOTS[best].y, owner: p.n });
    p.slot = best;
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    const total = this.endsAt - this.startedAt;
    this.bossAt = Math.max(this.startedAt + total * .45, this.endsAt - 75000);
    const list = [...this.players.values()].sort(() => Math.random() - .5);
    const picks = World.pickSlots(list.length);
    this.slots = picks.map(i => ({ i, x: World.SLOTS[i].x, y: World.SLOTS[i].y, owner: -1 }));
    list.forEach((p, k) => {
      if (k < this.slots.length) { this.slots[k].owner = p.n; p.slot = this.slots[k].i; } else this.giveSlot(p);
    });
    this.addFeed('🏰 Bouw je toren! De eerste golf komt eraan.');
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Torens ----------

  build(playerId, type) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    if (!World.TOWERS[type]) return { error: 'Onbekende toren.' };
    if (p.slot < 0) return { error: 'Je hebt nog geen plaats.' };
    const t = this.towers.get(p.slot);
    if (t) {
      if (t.type === type) return { error: 'Die toren staat er al.' };
      if (p.gold < World.SWITCH) return { error: `Ombouwen kost ${World.SWITCH} goud.` };
      p.gold -= World.SWITCH;
      t.type = type;
      t.cd = .5;
    } else {
      if (p.gold < World.BUILD) return { error: `Bouwen kost ${World.BUILD} goud. Beantwoord vragen!` };
      p.gold -= World.BUILD;
      this.towers.set(p.slot, { slot: p.slot, n: p.n, type, lvl: 1, cd: .3 });
    }
    this.ev.push(['bouw', p.slot]);
    this.towersChanged = true;
    p.dirty = true;
    return { ok: true, gold: p.gold };
  }

  upgrade(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const t = this.towers.get(p.slot);
    if (!t) return { error: 'Bouw eerst een toren.' };
    if (t.lvl >= World.MAX_LVL) return { error: 'Je toren is al op het hoogste niveau.' };
    const cost = World.UPGRADE[t.lvl];
    if (p.gold < cost) return { error: `Nog ${cost - p.gold} goud nodig. Beantwoord vragen!` };
    p.gold -= cost;
    t.lvl++;
    this.ev.push(['op', p.slot, t.lvl]);
    if (t.lvl === World.MAX_LVL) this.addFeed(`⭐ ${p.name} heeft een ${World.TOWERS[t.type].name.toLowerCase()} op het hoogste niveau`, false);
    this.towersChanged = true;
    p.dirty = true;
    return { ok: true, gold: p.gold, lvl: t.lvl };
  }

  // Bliksem: alle monsters rond je toren verliezen een groot deel van hun leven.
  bolt(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || Date.now() < this.startedAt) return { error: 'Nu even niet.' };
    if (p.bolt <= 0) return { error: 'Geen bliksem: 3 juist op rij!' };
    if (p.slot < 0) return { error: 'Je hebt nog geen plaats.' };
    p.bolt--;
    p.dirty = true;
    const s = World.SLOTS[p.slot];
    let hit = 0;
    for (const m of this.monsters) {
      const at = World.pos(m.d);
      if (Math.hypot(at.x - s.x, at.y - s.y) > World.BOLT.range) continue;
      hit++;
      this.damage(m, m.max * (m.type === 'draak' ? World.BOLT.boss : World.BOLT.frac), p, true);
      this.ev.push(['z', p.slot, m.id]);
    }
    this.ev.push(['bliksem', p.slot]);
    if (hit >= 4) this.addFeed(`⚡ ${p.name} raakt ${hit} monsters met een bliksem!`);
    return { ok: true, bolt: p.bolt, hit };
  }

  // ---------- Vragen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    return { ...res, gold: p.gold };
  }

  // Juist: goud (meer bij een reeks) en om de drie op rij een ⚡ bliksem. Fout: even wachten, de vraag komt terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let gained = 0, bolt = false;
    if (res.correct) {
      gained = Math.round((22 + 4 * Math.min(p.streak - 1, 5)) * factor(this.tempo));
      p.gold += gained;
      p.earned += gained;
      if (p.streak % 3 === 0 && p.bolt < World.MAX_BOLT) { p.bolt++; bolt = true; }
      this.ev.push(['goud', p.slot, gained]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    p.dirty = true;
    return { ...res, gained, gold: p.gold, bolt: p.bolt, gotBolt: bolt, streak: p.streak };
  }

  // ---------- Spel ----------

  // Hoe ver het spel is (0 tot 1) en hoe sterk de monsters dan zijn. Meer spelers = meer monsters, niet sterkere.
  progress(now) {
    return Math.max(0, Math.min(1, (now - this.startedAt) / Math.max(1, this.endsAt - this.startedAt)));
  }

  spawn(type, now) {
    const base = World.MONSTERS[type];
    const f = this.progress(now);
    let hp = base.hp * HP_SCALE * Math.max(.35, this.players.size * .3) * (1 + HP_RAMP * Math.pow(f, 1.4));
    let speed = base.speed * (.94 + Math.random() * .12);
    if (type === 'draak') {
      hp = base.hp * BOSS * (.5 + .1 * this.players.size) * Math.max(.6, Math.min(1.5, Math.sqrt(this.minutes / 4)));
      speed = Math.min(80, World.LENGTH / Math.max(20, (this.endsAt - now) / 1000 * .85));
    }
    const m = { id: this.nextId++, type, d: -10 - Math.random() * 20, hp, max: hp, speed, slowUntil: 0, slowK: 1 };
    this.monsters.push(m);
    if (type === 'draak') this.boss = m;
    return m;
  }

  // Elke golf heeft een eigen mix: eerst kruipers, dan renners, dan gepantserde.
  pickType(wave) {
    const r = Math.random();
    if (wave <= 1) return r < .85 ? 'kruiper' : 'renner';
    if (wave === 2) return r < .6 ? 'kruiper' : 'renner';
    if (wave % 3 === 0) return r < .35 ? 'pantser' : r < .7 ? 'renner' : 'kruiper';
    return r < .2 ? 'pantser' : r < .55 ? 'renner' : 'kruiper';
  }

  damage(m, amount, p, magic = false) {
    if (m.hp <= 0) return;
    const armor = magic ? 0 : World.MONSTERS[m.type].armor;
    const dealt = Math.min(m.hp, Math.max(amount * .25, amount - armor));
    m.hp -= dealt;
    if (p) { p.dmg += dealt; }
    if (m.hp <= 0) {
      this.kills++;
      if (p) {
        p.kills++;
        p.gold += World.MONSTERS[m.type].gold;
        p.earned += World.MONSTERS[m.type].gold;
        p.dirty = true;
      }
      this.ev.push(['k', m.id, p ? p.slot : -1]);
      if (m.type === 'draak') {
        this.boss = null;
        this.bossDone = true;
        for (const o of this.players.values()) { o.gold += 30; o.earned += 30; o.dirty = true; }
        this.addFeed(`🐉 De draak is verslagen${p ? `! De laatste klap kwam van ${p.name}` : ''}. +30 goud voor iedereen`);
      }
    }
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now < this.startedAt) return this.maybeSend(now);
    const f = this.progress(now);
    const since = now - this.startedAt;
    // Golven en monsters
    if (since >= FIRST_WAVE_MS) {
      const wave = 1 + Math.floor((since - FIRST_WAVE_MS) / WAVE_MS);
      if (wave !== this.wave) {
        this.wave = wave;
        this.ev.push(['golf', wave]);
      }
      const n = this.players.size;
      const final = this.endsAt - now < Math.min(60000, (this.endsAt - this.startedAt) * .25);
      const rate = RATE * (.32 + .025 * n) * (.65 + 1.1 * f) * (final ? 1.35 : 1);
      // Een kort rustmoment aan het einde van elke golf.
      const inWave = (since - FIRST_WAVE_MS) % WAVE_MS;
      if (inWave < WAVE_MS - 3500) this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc--;
        this.spawn(this.pickType(this.wave), now);
      }
      if (!this.boss && !this.bossDone && now >= this.bossAt) {
        this.spawn('draak', now);
        this.ev.push(['draak']);
        this.addFeed('🐉 DE DRAAK KOMT! Alle torens vuur!');
      }
    }
    // Bewegen
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      const slow = now < m.slowUntil ? m.slowK : 1;
      m.d += m.speed * slow * dt;
      if (m.d >= World.LENGTH) {
        m.hp = 0;
        this.leaks++;
        const hit = World.MONSTERS[m.type].dmg;
        this.gate = Math.max(0, this.gate - hit);
        this.ev.push(['poort', m.id, hit]);
        if (m.type === 'draak') { this.boss = null; this.bossDone = true; this.addFeed('🐉 De draak beukt tegen de poort!'); }
        if (this.gate <= 0) {
          this.monsters = this.monsters.filter(o => o.hp > 0);
          this.maybeSend(now, true);
          return this.finish(false);
        }
        if (this.gate <= 25 && this.gate + hit > 25) this.addFeed('🔥 De poort houdt het bijna niet meer!');
      }
    }
    // Torens schieten op het monster dat het verst gevorderd is binnen hun bereik.
    const pos = new Map();
    for (const m of this.monsters) if (m.hp > 0 && m.d >= 0) pos.set(m, World.pos(m.d));
    const byN = new Map([...this.players.values()].map(p => [p.n, p]));
    for (const t of this.towers.values()) {
      t.cd -= dt;
      if (t.cd > 0) continue;
      const spec = World.TOWERS[t.type], L = t.lvl - 1;
      const s = World.SLOTS[t.slot];
      const range = spec.range[L];
      const inRange = [];
      for (const [m, at] of pos) if (m.hp > 0 && (at.x - s.x) ** 2 + (at.y - s.y) ** 2 <= range * range) inRange.push(m);
      if (!inRange.length) { t.cd = 0; continue; }
      inRange.sort((a, b) => b.d - a.d);
      t.cd = spec.rate[L];
      const p = byN.get(t.n);
      if (t.type === 'laser') {
        const m = inRange[0];
        this.damage(m, spec.dmg[L], p);
        this.ev.push(['s', t.slot, m.id]);
      } else if (t.type === 'ijs') {
        const hit = inRange.slice(0, spec.chain[L]);
        for (const m of hit) {
          this.damage(m, spec.dmg[L], p, true);
          if (m.type !== 'draak' || L >= 2) { m.slowUntil = now + 1600; m.slowK = m.type === 'draak' ? .75 : spec.slow[L]; }
        }
        this.ev.push(['i', t.slot, ...hit.map(m => m.id)]);
      } else {
        // De katapult mikt waar het monster straks is; de inslag raakt alles in de buurt.
        const m = inRange[0];
        const lead = World.pos(Math.min(World.LENGTH, m.d + m.speed * .45));
        this.ev.push(['c', t.slot, Math.round(lead.x), Math.round(lead.y)]);
        const splash = spec.splash[L];
        for (const [o, at] of pos) {
          if (o.hp <= 0) continue;
          const dd = Math.hypot(at.x - lead.x, at.y - lead.y);
          if (dd <= splash) this.damage(o, spec.dmg[L] * (dd < splash * .4 ? 1 : .6), p);
        }
      }
    }
    this.monsters = this.monsters.filter(m => m.hp > 0);
    for (const p of this.players.values()) p.score = p.right * 50 + Math.round(p.dmg / 20) + p.kills * 5;
    this.maybeSend(now);
  }

  maybeSend(now, force = false) {
    if (force || now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  finish(won = true) {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.won = won && this.gate > 0;
    this.vragen.flush();
    this.addFeed(this.won ? '🏆 De poort hield stand! De klas wint!' : '💥 De poort is gevallen…');
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.dmg, p.kills, p.tower, p.earned, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`poortwacht-${this.quiz.title}`, [['Poortwacht', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size], ['Uitslag', this.won ? 'De poort hield stand' : 'De poort is gevallen'], ['Poort', `${this.gate}/${World.GATE_HP}`]],
      ['Rang', 'Naam', 'Punten', 'Schade', 'Monsters verslagen', 'Toren', 'Goud verdiend', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => {
        const t = this.towers.get(p.slot);
        return {
          id, n: p.n, name: p.name, color: p.color, score: p.score, dmg: Math.round(p.dmg), kills: p.kills, earned: p.earned,
          tower: t ? `${World.TOWERS[t.type].name} ${t.lvl}` : '-', bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
        };
      })
      .sort((a, b) => b.score - a.score || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color, slot: p.slot }));
  }

  towerList() {
    return [...this.towers.values()].map(t => [t.slot, t.n, t.type, t.lvl]);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
      slots: this.slots.map(s => [s.i, s.owner]), towers: this.towerList(), gate: this.gate, won: this.won, kills: this.kills,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const t = this.towers.get(p.slot);
    return {
      n: p.n, slot: p.slot, gold: p.gold, bolt: p.bolt, score: p.score, kills: p.kills, dmg: Math.round(p.dmg),
      tower: t ? { type: t.type, lvl: t.lvl } : null, rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Compacte monsters: [id, soort (index), afstand, leven in %, vertraagd]. De schermen schuiven ze zelf verder tussen twee berichten.
  send(now) {
    const msg = {
      m: this.monsters.map(m => [m.id, World.TYPES.indexOf(m.type), Math.round(m.d), Math.max(1, Math.round((m.hp / m.max) * 100)), now < m.slowUntil ? 1 : 0, Math.round(m.speed * (now < m.slowUntil ? m.slowK : 1))]),
      ev: this.ev, gate: this.gate, wave: this.wave,
    };
    if (this.boss) msg.boss = Math.max(0, Math.round((this.boss.hp / this.boss.max) * 100));
    if (this.towersChanged) {
      this.towersChanged = false;
      msg.towers = this.towerList();
      msg.slots = this.slots.map(s => [s.i, s.owner]);
    }
    this.ev = [];
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('pw-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('pw-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty) {
        p.dirty = false;
        this.io.to(p.socketId).emit('pw-tick', { ...msg, me: this.me(p, ranking || this.ranking()) });
      } else this.io.to(p.socketId).emit('pw-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('pw-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('pw-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('pw-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('pw-state', this.hostState());
    socket.on('pw-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('poort');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('pw-start', () => this.start());
    socket.on('pw-kick', id => this.kick(id));
    socket.on('pw-finish', () => this.finish());
    socket.on('pw-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('pw-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('pw-state', this.base());
    socket.on('pw-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.pwId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('pw-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.pwId ? fn(socket.data.pwId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('pw-build', (id, type) => this.build(id, String(type || '')));
    on('pw-upgrade', id => this.upgrade(id));
    on('pw-bolt', id => this.bolt(id));
    on('pw-question', id => guard.question(id));
    on('pw-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Poortwacht };
