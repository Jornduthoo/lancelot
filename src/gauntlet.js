// Gauntlet: ploegen van vier ridders (paladijn, mage, ranger en mech) vechten zich samen door een cyberkerker naar de uitgang.
// Je levenspunten lopen langzaam weg, zoals in de echte Gauntlet. Een goed antwoord geneest je hele ploeg en laadt je speciale kracht.
// Geveld? Dan beantwoord je een vraag om terug te komen. Elke ploeg krijgt dezelfde kerkers: wie raakt het diepst?
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
// De leerling beweegt zelf (geen vertraging) en stuurt zijn positie; de server beslist over monsters, schoten en treffers.
const World = require('../public/js/gt-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const { T, R, CLASSES, CLASS_IDS, MONSTERS, POORT } = World;
const TICK_MS = 33;
const SEND_MS = 50;
const DRAIN = 1.6;          // levenspunten per seconde (normaal tempo)
const HEAL = 26;            // per goed antwoord, voor elke ridder in je ploeg
const REVIVE = .55;         // terug met dit deel van je levenspunten
const MAX_CHARGES = 3;
const EXIT_HOLD_MS = 1200;
const WIPE_MS = 4000;
const NEXT_LEVEL_MS = 2500;
const SHIELD_MS = 4000;
const TURRET_MS = 8000;
const MAX_MONSTERS = 36;
const TEAM_NAMES = ['Draak', 'Griffioen', 'Feniks', 'Wolf', 'Leeuw', 'Valk', 'Hydra', 'Eenhoorn', 'Kraken', 'Uil'];
const TEAM_COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#f0f0ff'];

class Gauntlet {
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
    this.teams = [];
    this.minutes = 8;
    this.tempo = 'normaal';
    this.seed = 1;
    this.startedAt = 0;
    this.endsAt = 0;
    this.nextN = 0;
    this.nextId = 1;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.lastTick = 0;
    this.lastSend = 0;
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
    this.vragen = new Vragen(quiz, 'Gauntlet', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.dirty = true;
      const team = this.teams[existing.team];
      if (team && this.phase === 'play') setTimeout(() => this.sendLevel(team, existing), 50);
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het spel is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    // Een klasse die nog weinig gekozen is.
    const count = id => [...this.players.values()].filter(p => p.cls === id).length;
    const cls = CLASS_IDS.slice().sort((a, b) => count(a) - count(b))[0];
    const p = {
      n: this.nextN++, name: clean, socketId, cls, team: -1,
      x: 0, y: 0, a: 0, hp: 0, max: CLASSES[cls].hp, down: false, charges: 1, lastAttack: 0, moveAt: 0,
      kills: 0, dmg: 0, healed: 0, revives: 0, gold: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
      asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true, fix: 0,
    };
    this.players.set(playerId, p);
    if (this.phase === 'play') this.lateJoin(p);
    this.broadcast();
    return { ok: true, name: clean };
  }

  pick(playerId, cls) {
    const p = this.players.get(playerId);
    if (!p || !CLASSES[cls]) return { error: 'Onbekende klasse.' };
    if (this.phase === 'play' && p.team >= 0) return { error: 'Je klasse kies je voor het spel begint.' };
    p.cls = cls;
    p.max = CLASSES[cls].hp;
    this.broadcast();
    return { ok: true };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    const team = this.teams[p.team];
    if (team) team.members = team.members.filter(id => id !== playerId);
    this.io.to(p.socketId).emit('gt-kicked');
    this.broadcast();
  }

  // Ploegen van vier, met zoveel mogelijk verschillende klassen in elke ploeg.
  makeTeams() {
    const ids = [...this.players.keys()].sort(() => Math.random() - .5);
    const n = Math.max(1, Math.ceil(ids.length / 4));
    const size = Math.ceil(ids.length / n);
    this.teams = Array.from({ length: n }, (_, i) => this.newTeam(i));
    const byClass = CLASS_IDS.flatMap(c => ids.filter(id => this.players.get(id).cls === c));
    for (const id of byClass) {
      const p = this.players.get(id);
      const open = this.teams.filter(t => t.members.length < size);
      const lacks = open.filter(t => !t.members.some(m => this.players.get(m).cls === p.cls));
      const pool = lacks.length ? lacks : open;
      const team = pool.sort((a, b) => a.members.length - b.members.length)[0];
      team.members.push(id);
      p.team = team.id;
    }
  }

  newTeam(i) {
    return {
      id: i, name: `Ploeg ${TEAM_NAMES[i % TEAM_NAMES.length]}`, color: TEAM_COLORS[i % TEAM_COLORS.length], members: [],
      level: 1, cleared: 0, gold: 0, kills: 0, d: null, monsters: [], shots: [], items: [], poorten: [], turrets: [],
      flow: null, flowAt: 0, exitSince: 0, wipeAt: 0, nextAt: 0, shieldUntil: 0, ev: [], times: [], levelAt: 0,
    };
  }

  lateJoin(p) {
    let team = this.teams.filter(t => t.members.length < 4).sort((a, b) => a.members.length - b.members.length)[0];
    if (!team) {
      team = this.newTeam(this.teams.length);
      this.teams.push(team);
      this.startLevel(team, Date.now());
    }
    const id = [...this.players.entries()].find(([, q]) => q === p)[0];
    team.members.push(id);
    p.team = team.id;
    const mate = this.alive(team)[0];
    this.place(p, mate ? { x: mate.x, y: mate.y } : team.d.start, Date.now());
    this.sendLevel(team, p);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.seed = Math.floor(Math.random() * 1e9);
    this.makeTeams();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const team of this.teams) this.startLevel(team, now);
    this.addFeed(`🗝️ ${this.teams.length} ${this.teams.length === 1 ? 'ploeg daalt' : 'ploegen dalen'} af in de kerker. Wie raakt het diepst?`);
    this.lastTick = now;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Kerker ----------

  members(team) {
    return team.members.map(id => this.players.get(id)).filter(Boolean);
  }

  alive(team) {
    return this.members(team).filter(p => !p.down);
  }

  startLevel(team, now, again = false) {
    const d = World.makeDungeon(this.seed, team.level);
    team.d = d;
    team.monsters = [];
    team.shots = [];
    team.turrets = [];
    team.items = d.items.map(it => ({ ...it, taken: false }));
    const scale = 1 + (team.level - 1) * .18;
    team.poorten = d.poorten.map(q => ({ ...q, hp: Math.round(POORT.hp * scale), max: Math.round(POORT.hp * scale), next: 0, out: 0 }));
    team.flow = null;
    team.exitSince = 0;
    team.wipeAt = 0;
    team.nextAt = 0;
    team.levelAt = now;
    const ms = this.members(team);
    ms.forEach((p, i) => {
      if (!again && team.level === 1) p.hp = p.max;
      if (p.down || again) p.hp = Math.round(p.max * (again ? .7 : REVIVE));
      p.down = false;
      p.hp = Math.max(p.hp, Math.round(p.max * .4));
      const ang = (i / Math.max(1, ms.length)) * Math.PI * 2;
      this.place(p, { x: d.start.x + Math.cos(ang) * 30, y: d.start.y + Math.sin(ang) * 30 }, now);
    });
    for (const p of ms) this.sendLevel(team, p);
    this.sendHostLevel(team);
  }

  place(p, at, now) {
    const spot = World.blocked(this.teams[p.team].d, at.x, at.y, R) ? this.teams[p.team].d.start : at;
    p.x = spot.x;
    p.y = spot.y;
    p.moveAt = now;
    p.fix++;
    p.dirty = true;
  }

  levelInfo(team) {
    return {
      team: team.id, seed: this.seed, level: team.level,
      taken: team.items.map((it, i) => (it.taken ? i : -1)).filter(i => i >= 0),
      poorten: team.poorten.map(q => (q.hp > 0 ? Math.round((q.hp / q.max) * 100) : 0)),
    };
  }

  sendLevel(team, p) {
    this.io.to(p.socketId).emit('gt-level', { ...this.levelInfo(team), x: p.x, y: p.y, fix: p.fix });
  }

  sendHostLevel(team) {
    this.io.to('host').emit('gt-level', this.levelInfo(team));
  }

  // ---------- Besturing ----------

  playing(p) {
    return p && this.phase === 'play' && p.team >= 0 && Date.now() >= this.startedAt;
  }

  move(playerId, { x, y, a, fix } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.down || p.asking || fix !== p.fix) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const team = this.teams[p.team];
    if (!team || team.nextAt) return;
    const now = Date.now();
    const dt = Math.min(1, (now - p.moveAt) / 1000);
    const far = Math.hypot(x - p.x, y - p.y) > CLASSES[p.cls].speed * dt * 1.6 + 60;
    if (far || World.blocked(team.d, x, y, R - 4)) {
      p.fix++;
      this.io.to(p.socketId).emit('gt-pos', { x: p.x, y: p.y, fix: p.fix });
      return;
    }
    p.x = x;
    p.y = y;
    p.moveAt = now;
    if (Number.isFinite(a)) p.a = a;
  }

  attack(playerId, { a, seq } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.down || p.asking || !Number.isFinite(a)) return;
    const team = this.teams[p.team];
    if (!team || team.nextAt || team.wipeAt) return;
    const now = Date.now();
    const c = CLASSES[p.cls];
    if (now - p.lastAttack < c.cd - 60) return;
    p.lastAttack = now;
    p.a = a;
    const at = c.attack;
    if (at.kind === 'slag') {
      team.ev.push(['slag', p.n, +a.toFixed(2)]);
      for (const m of team.monsters) {
        const dx = m.x - p.x, dy = m.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > at.range + m.r) continue;
        let diff = Math.atan2(dy, dx) - a;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > at.arc / 2 && dist > m.r + R) continue;
        this.hurt(team, m, at.dmg, p);
        m.x += (dx / (dist || 1)) * 14;
        m.y += (dy / (dist || 1)) * 14;
      }
      for (const q of team.poorten) {
        if (q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < at.range + POORT.r) this.hurtPoort(team, q, at.dmg, p);
      }
      return;
    }
    const spread = at.spread ? (Math.random() - .5) * at.spread : 0;
    this.shoot(team, p, a + spread, at, typeof seq === 'number' ? seq : 0);
  }

  shoot(team, p, a, at, seq = 0, x = p.x, y = p.y) {
    const s = {
      id: this.nextId++, kind: at.kind, x: x + Math.cos(a) * (R + 4), y: y + Math.sin(a) * (R + 4),
      vx: Math.cos(a) * at.speed, vy: Math.sin(a) * at.speed, life: at.life, dmg: at.dmg, r: at.r, owner: p ? p.n : -1, friendly: true,
    };
    team.shots.push(s);
    team.ev.push(['shot', s.id, s.kind, Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.life, s.owner, seq]);
  }

  special(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.down || p.asking) return { error: 'Nu even niet.' };
    const team = this.teams[p.team];
    if (!team || team.nextAt || team.wipeAt) return { error: 'Nu even niet.' };
    if (p.charges <= 0) return { error: 'Geen lading. Beantwoord een vraag!' };
    p.charges--;
    p.dirty = true;
    const now = Date.now();
    if (p.cls === 'paladijn') {
      team.shieldUntil = now + SHIELD_MS;
      for (const q of this.alive(team)) this.heal(q, 30, p);
      team.ev.push(['schild', p.n]);
      this.addFeed(`✨ ${p.name} beschermt ${team.name} met een heilig schild`, false);
    } else if (p.cls === 'mage') {
      team.ev.push(['nova', Math.round(p.x), Math.round(p.y)]);
      for (const m of [...team.monsters]) {
        if (Math.hypot(m.x - p.x, m.y - p.y) < 240 + m.r) this.hurt(team, m, 150, p);
      }
      for (const q of team.poorten) if (q.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < 260) this.hurtPoort(team, q, 70, p);
    } else if (p.cls === 'ranger') {
      const at = { kind: 'pijl', speed: 760, dmg: 30, life: .9, r: 7 };
      for (let i = 0; i < 16; i++) this.shoot(team, p, (i / 16) * Math.PI * 2, at);
      team.ev.push(['regen', p.n]);
    } else if (p.cls === 'mech') {
      team.turrets.push({ x: p.x, y: p.y, until: now + TURRET_MS, next: 0, owner: p });
      team.ev.push(['toren', Math.round(p.x), Math.round(p.y), TURRET_MS]);
    }
    return { ok: true, charges: p.charges };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    p.dirty = true;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.team < 0) return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    p.dirty = true;
    return { ...res, charges: p.charges, max: MAX_CHARGES, down: p.down };
  }

  // Juist: je hele ploeg geneest en jij krijgt een lading. Geveld? Dan kom je terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    const team = this.teams[p.team];
    let revived = false;
    let healed = 0;
    if (res.correct && team) {
      const amount = Math.round(HEAL * factor(this.tempo) * (p.streak % 3 === 0 ? 1.6 : 1));
      if (p.down) {
        this.revive(team, p);
        revived = true;
      } else {
        p.charges = Math.min(MAX_CHARGES, p.charges + 1);
      }
      for (const q of this.alive(team)) healed += this.heal(q, amount, p);
      team.gold += 3;
      team.ev.push(['heal', p.n, amount]);
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    }
    p.dirty = true;
    return { ...res, charges: p.charges, max: MAX_CHARGES, revived, healed, streak: p.streak };
  }

  heal(q, amount, by) {
    if (q.down) return 0;
    const before = q.hp;
    q.hp = Math.min(q.max, q.hp + amount);
    q.dirty = true;
    const got = Math.round(q.hp - before);
    if (by && by !== q) by.healed += got;
    return got;
  }

  revive(team, p) {
    const mate = this.alive(team).filter(q => q !== p)[0];
    p.down = false;
    p.hp = Math.round(p.max * REVIVE);
    p.revives++;
    this.place(p, mate ? { x: mate.x, y: mate.y } : { x: p.x, y: p.y }, Date.now());
    this.io.to(p.socketId).emit('gt-pos', { x: p.x, y: p.y, fix: p.fix });
    team.ev.push(['terug', p.n]);
  }

  // ---------- Spel ----------

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now >= this.startedAt) for (const team of this.teams) this.tickTeam(team, now, dt);
    if (now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  tickTeam(team, now, dt) {
    const d = team.d;
    if (!d || !team.members.length) return;
    if (team.nextAt) {
      if (now >= team.nextAt) {
        team.level++;
        this.startLevel(team, now);
      }
      return;
    }
    if (team.wipeAt) {
      if (now >= team.wipeAt) this.startLevel(team, now, true);
      return;
    }
    const drain = (DRAIN / Math.sqrt(factor(this.tempo))) * (1 + (team.level - 1) * .08);
    const shielded = now < team.shieldUntil;
    for (const p of this.members(team)) {
      if (p.down || shielded) continue;
      p.hp -= drain * dt;
      if (p.hp <= 0) this.fell(team, p);
    }
    const living = this.alive(team);
    if (!living.length) {
      team.wipeAt = now + WIPE_MS;
      team.ev.push(['wipe']);
      this.addFeed(`💀 ${team.name} is geveld en begint niveau ${team.level} opnieuw`, false);
      return;
    }
    // Waar de ridders staan: de monsters volgen de kortste weg ernaartoe.
    if (!team.flow || now - team.flowAt > 300) {
      team.flowAt = now;
      team.flow = World.flow(World.grid(d), d.W, d.H, living.filter(p => !p.asking).map(p => [Math.floor(p.x / T), Math.floor(p.y / T)]));
    }
    this.tickPoorten(team, living, now);
    this.tickMonsters(team, living, now, dt, shielded);
    this.tickShots(team, living, now, dt, shielded);
    this.tickTurrets(team, now);
    // Schatten en energiecellen oprapen.
    team.items.forEach((it, i) => {
      if (it.taken) return;
      for (const p of living) {
        if (Math.hypot(p.x - it.x, p.y - it.y) > R + 18) continue;
        it.taken = true;
        if (it.kind === 'cel') this.heal(p, 45);
        const gold = it.kind === 'kist' ? 25 : it.kind === 'goud' ? 8 : 0;
        team.gold += gold;
        p.gold += gold;
        p.dirty = true;
        team.ev.push(['pak', i, p.n]);
        break;
      }
    });
    // De uitgang: alle ridders die rechtop staan en niet aan het antwoorden zijn, samen op het portaal.
    const walking = living.filter(p => !p.asking);
    const onExit = walking.length > 0 && walking.every(p => Math.hypot(p.x - d.exit.x, p.y - d.exit.y) < T * 1.7);
    if (onExit) {
      if (!team.exitSince) team.exitSince = now;
      if (now - team.exitSince > EXIT_HOLD_MS) this.clearLevel(team, now);
    } else team.exitSince = 0;
  }

  fell(team, p) {
    p.hp = 0;
    p.down = true;
    p.dirty = true;
    team.ev.push(['val', p.n]);
  }

  clearLevel(team, now) {
    team.cleared = team.level;
    team.gold += 50 + team.level * 25;
    team.times.push(Math.round((now - team.levelAt) / 1000));
    team.nextAt = now + NEXT_LEVEL_MS;
    team.shots = [];
    team.ev.push(['uit', team.level]);
    // Wie geveld was, komt mee naar het volgende niveau.
    this.addFeed(`🚪 ${team.name} haalt de uitgang van niveau ${team.level}!`);
  }

  tickPoorten(team, living, now) {
    const scale = 1 + (team.level - 1) * .18;
    const every = POORT.every / (1 + (team.level - 1) * .12);
    team.poorten.forEach((q, i) => {
      if (q.hp <= 0) return;
      if (now < q.next || team.monsters.length >= MAX_MONSTERS) return;
      const near = living.some(p => Math.hypot(p.x - q.x, p.y - q.y) < POORT.wake && World.clear(team.d, q.x, q.y, p.x, p.y));
      if (!near) return;
      q.next = now + every * (.75 + Math.random() * .5);
      if (team.monsters.filter(m => m.from === i).length >= POORT.max + Math.floor(team.level / 3)) return;
      const k = MONSTERS[q.kind];
      const a = Math.random() * Math.PI * 2;
      const x = q.x + Math.cos(a) * (POORT.r + k.r + 2), y = q.y + Math.sin(a) * (POORT.r + k.r + 2);
      if (World.blocked(team.d, x, y, k.r)) return;
      const hp = Math.round(k.hp * scale);
      team.monsters.push({ id: this.nextId++, kind: q.kind, x, y, a, hp, max: hp, r: k.r, next: 0, from: i, keep: 0 });
    });
  }

  tickMonsters(team, living, now, dt, shielded) {
    const d = team.d;
    const flow = team.flow;
    const targets = living.filter(p => !p.asking);
    const dmgScale = (1 + (team.level - 1) * .12) / Math.sqrt(factor(this.tempo));
    for (const m of team.monsters) {
      const k = MONSTERS[m.kind];
      // Het dichtstbijzijnde doelwit dat ze kunnen zien.
      let target = null, best = Infinity;
      for (const p of targets) {
        const dist = Math.hypot(p.x - m.x, p.y - m.y);
        if (dist < best) { best = dist; target = p; }
      }
      let vx = 0, vy = 0;
      const sees = target && best < 520 && World.clear(d, m.x, m.y, target.x, target.y);
      if (target && sees) {
        const dx = target.x - m.x, dy = target.y - m.y;
        m.a = Math.atan2(dy, dx);
        if (k.ranged) {
          // De kanonnier houdt afstand en schiet.
          const want = best < 220 ? -1 : best > 330 ? 1 : 0;
          vx = (dx / best) * want;
          vy = (dy / best) * want;
          if (best < k.reach && now >= m.next) {
            m.next = now + k.cd;
            const s = { id: this.nextId++, kind: 'vijand', x: m.x, y: m.y, vx: Math.cos(m.a) * 380, vy: Math.sin(m.a) * 380, life: 1.4, dmg: Math.round(k.dmg * dmgScale), r: 8, owner: -1, friendly: false };
            team.shots.push(s);
            team.ev.push(['shot', s.id, s.kind, Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.life, -1, 0]);
          }
        } else {
          vx = dx / best;
          vy = dy / best;
          if (best < k.reach + m.r + R && now >= m.next) {
            m.next = now + k.cd;
            vx = vy = 0;
            if (!shielded) this.hurtKnight(team, target, Math.round(k.dmg * dmgScale));
            team.ev.push(['bijt', m.id]);
          }
        }
      } else if (flow) {
        // Geen zicht: de kortste weg door de gangen volgen.
        const tx = Math.floor(m.x / T), ty = Math.floor(m.y / T);
        const here = flow[ty * d.W + tx];
        let bx = tx, by = ty, bd = here;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const v = flow[(ty + oy) * d.W + tx + ox];
          if (v !== undefined && v < bd) { bd = v; bx = tx + ox; by = ty + oy; }
        }
        if (bd < 40 && bd < here) {
          const dx = (bx + .5) * T - m.x, dy = (by + .5) * T - m.y;
          const l = Math.hypot(dx, dy) || 1;
          vx = dx / l;
          vy = dy / l;
          m.a = Math.atan2(dy, dx);
        }
      }
      // Niet op elkaar kruipen.
      for (const o of team.monsters) {
        if (o === m) continue;
        const dx = m.x - o.x, dy = m.y - o.y;
        const l = Math.hypot(dx, dy);
        const min = m.r + o.r;
        if (l > 0 && l < min) {
          vx += (dx / l) * .8;
          vy += (dy / l) * .8;
        }
      }
      const sp = k.speed * (1 + (team.level - 1) * .05);
      const l = Math.hypot(vx, vy);
      if (l > 0) {
        const res = World.slide(d, m.x, m.y, (vx / Math.max(1, l)) * sp * dt, (vy / Math.max(1, l)) * sp * dt, m.r);
        m.x = res.x;
        m.y = res.y;
      }
    }
  }

  tickShots(team, living, now, dt, shielded) {
    const keep = [];
    for (const s of team.shots) {
      s.life -= dt;
      const res = this.stepShot(team, s, living, now, dt, shielded);
      if (res === 'keep' && s.life > 0) keep.push(s);
      else team.ev.push(['weg', s.id, Math.round(s.x), Math.round(s.y), res === 'raak' ? 1 : 0]);
    }
    team.shots = keep;
  }

  stepShot(team, s, living, now, dt, shielded) {
    const n = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 14));
    for (let i = 0; i < n; i++) {
      s.x += (s.vx * dt) / n;
      s.y += (s.vy * dt) / n;
      if (World.solid(team.d, Math.floor(s.x / T), Math.floor(s.y / T))) return 'muur';
      if (s.friendly) {
        const owner = s.owner >= 0 ? this.byN(s.owner) : null;
        for (const m of team.monsters) {
          if (Math.hypot(m.x - s.x, m.y - s.y) < m.r + s.r) {
            this.hurt(team, m, s.dmg, owner);
            return 'raak';
          }
        }
        for (const q of team.poorten) {
          if (q.hp > 0 && Math.hypot(q.x - s.x, q.y - s.y) < POORT.r + s.r) {
            this.hurtPoort(team, q, s.dmg, owner);
            return 'raak';
          }
        }
      } else {
        for (const p of living) {
          if (p.asking || Math.hypot(p.x - s.x, p.y - s.y) > R + s.r) continue;
          if (!shielded) this.hurtKnight(team, p, s.dmg);
          return 'raak';
        }
      }
    }
    return 'keep';
  }

  tickTurrets(team, now) {
    team.turrets = team.turrets.filter(t => now < t.until);
    for (const t of team.turrets) {
      if (now < t.next) continue;
      let target = null, best = 460;
      for (const m of team.monsters) {
        const dist = Math.hypot(m.x - t.x, m.y - t.y);
        if (dist < best && World.clear(team.d, t.x, t.y, m.x, m.y)) { best = dist; target = m; }
      }
      if (!target) continue;
      t.next = now + 230;
      const a = Math.atan2(target.y - t.y, target.x - t.x);
      this.shoot(team, t.owner, a, { kind: 'plasma', speed: 700, dmg: 16, life: .8, r: 7 }, 0, t.x, t.y);
    }
  }

  byN(n) {
    for (const p of this.players.values()) if (p.n === n) return p;
    return null;
  }

  hurt(team, m, dmg, by) {
    if (m.hp <= 0) return;
    m.hp -= dmg;
    if (by) by.dmg += dmg;
    if (m.hp > 0) return;
    team.monsters = team.monsters.filter(o => o !== m);
    const k = MONSTERS[m.kind];
    team.kills++;
    team.gold += k.gold;
    if (by) { by.kills++; by.gold += k.gold; by.dirty = true; }
    team.ev.push(['boem', Math.round(m.x), Math.round(m.y), m.kind]);
  }

  hurtPoort(team, q, dmg, by) {
    if (q.hp <= 0) return;
    q.hp -= dmg;
    if (by) by.dmg += dmg;
    if (q.hp > 0) return;
    q.hp = 0;
    team.gold += 15;
    if (by) { by.gold += 15; by.dirty = true; }
    team.ev.push(['poort', team.poorten.indexOf(q), Math.round(q.x), Math.round(q.y)]);
  }

  hurtKnight(team, p, dmg) {
    if (p.down || p.asking) return;
    p.hp -= dmg;
    p.dirty = true;
    team.ev.push(['au', p.n, dmg]);
    if (p.hp <= 0) this.fell(team, p);
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.teamRanking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint: ${top.cleared} ${top.cleared === 1 ? 'niveau' : 'niveaus'} en ${top.gold} goud!`);
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
    const teams = this.teamRanking();
    const rows = [];
    teams.forEach((t, i) => {
      for (const p of t.players) {
        rows.push([i + 1, t.name, p.name, CLASSES[p.cls].name, t.cleared, t.gold, p.kills, p.healed, p.revives, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
      }
    });
    return saveCsv(`gauntlet-${this.quiz.title}`, [['Gauntlet', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Plaats ploeg', 'Ploeg', 'Naam', 'Klasse', 'Niveaus gehaald', 'Goud ploeg', 'Monsters verslagen', 'Genezen', 'Teruggekomen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  teamRanking() {
    return this.teams.map(t => ({
      id: t.id, name: t.name, color: t.color, level: t.level, cleared: t.cleared, gold: t.gold, kills: t.kills,
      players: this.members(t).map(p => ({ n: p.n, name: p.name, cls: p.cls, kills: p.kills, healed: p.healed, revives: p.revives, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong })),
    })).sort((a, b) => b.cleared - a.cleared || b.gold - a.gold);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, cls: p.cls, team: p.team }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, seed: this.seed,
      roster: this.roster(), teams: this.teams.map(t => ({ id: t.id, name: t.name, color: t.color })),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.teamRanking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, now) {
    const team = this.teams[p.team];
    return {
      n: p.n, cls: p.cls, team: p.team, hp: Math.max(0, Math.round(p.hp)), max: p.max, down: p.down, charges: p.charges, maxCharges: MAX_CHARGES,
      kills: p.kills, gold: team ? team.gold : 0, wait: Math.max(0, p.waitUntil - now), level: team ? team.level : 1,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const team = this.teams[p.team];
      Object.assign(state, {
        name: p.name, me: this.me(p, Date.now()), right: p.right, wrong: p.wrong,
        rank: team ? this.teamRanking().findIndex(t => t.id === team.id) + 1 : 0,
      });
    }
    return state;
  }

  teamTick(team, now) {
    const flags = p => (p.down ? 1 : 0) | (p.asking ? 2 : 0);
    return {
      id: team.id,
      k: this.members(team).map(p => [p.n, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), Math.round((Math.max(0, p.hp) / p.max) * 100), flags(p)]),
      m: team.monsters.map(m => [m.id, m.kind, Math.round(m.x), Math.round(m.y), Math.round((m.hp / m.max) * 100), +m.a.toFixed(1)]),
      p: team.poorten.map(q => (q.hp > 0 ? Math.round((q.hp / q.max) * 100) : 0)),
      tu: team.turrets.map(t => [Math.round(t.x), Math.round(t.y), t.until - now]),
      ev: team.ev,
      lv: team.level, g: team.gold, sh: Math.max(0, team.shieldUntil - now), ex: team.exitSince ? now - team.exitSince : 0,
      nx: team.nextAt ? team.nextAt - now : 0, wp: team.wipeAt ? team.wipeAt - now : 0,
    };
  }

  send(now) {
    const all = [];
    for (const team of this.teams) {
      const msg = this.teamTick(team, now);
      team.ev = [];
      all.push(msg);
      for (const p of this.members(team)) {
        if (p.dirty) {
          p.dirty = false;
          this.io.to(p.socketId).emit('gt-tick', { ...msg, me: this.me(p, now) });
        } else this.io.to(p.socketId).emit('gt-tick', msg);
      }
    }
    const host = { teams: all };
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      host.feed = this.feed;
      host.ranking = this.teamRanking();
      this.feedChanged = false;
    }
    this.io.to('host').emit('gt-tick', host);
  }

  broadcast() {
    this.io.to('host').emit('gt-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('gt-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('gt-state', this.base());
  }

  // De socket-berichten van het bord en van de leerlingen.
  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('gt-state', this.hostState());
    for (const t of this.teams) if (t.d) socket.emit('gt-level', this.levelInfo(t));
    socket.on('gt-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('gauntlet');
      if (busy) throw busyError(busy);
      this.load(quizzes.load(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('gt-start', () => this.start());
    socket.on('gt-kick', id => this.kick(id));
    socket.on('gt-finish', () => this.finish());
    socket.on('gt-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('gt-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('gt-state', this.base());
    socket.on('gt-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.gtId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('gt-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.gtId ? fn(socket.data.gtId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('gt-class', (id, cls) => this.pick(id, String(cls)));
    on('gt-move', (id, m) => this.move(id, m || {}));
    on('gt-attack', (id, m) => this.attack(id, m || {}));
    on('gt-special', id => this.special(id));
    on('gt-asking', (id, v) => this.asking(id, v));
    on('gt-question', id => guard.question(id));
    on('gt-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Gauntlet };
