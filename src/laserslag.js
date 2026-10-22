// Laserslag: ridders schieten elkaar met laserlansen uit de arena, rood tegen blauw of ieder voor zich.
// Munitie krijg je alleen door quizvragen juist te beantwoorden. Geraakt worden is niet erg:
// je teleporteert terug naar je kamp en kan daar meteen nieuwe munitie verdienen.
// De gsm stuurt zijn positie; de server beslist over schoten, treffers en punten.
const Arena = require('../public/js/laserslag-world');

const HP = 3;
const START_AMMO = 15;
const MAX_AMMO = 60;
const FIRE_MS = 280;
const RAPID_MS = 120;
const RESPAWN_MS = 3500;
const SAFE_MS = 2500;        // bescherming vlak na het terugkomen
const AFTER_QUESTION_MS = 800;
const POWER_MS = 12000;
const CRYSTAL_EVERY = 20000;
const TICK_MS = 33;
const SEND_MS = 50;
const POWERS = ['drie', 'snel', 'schild', 'hart'];
const POWER_TEXT = { drie: 'Drievoudig schot', snel: 'Snelvuur', schild: 'Energieschild', hart: 'Volle levens' };
const STREAKS = { 2: 'DUBBELE SLAG', 3: 'DRIEDUBBELE SLAG', 5: 'ONSTUITBAAR', 8: 'LEGENDARISCH', 12: 'GODDELIJK' };
const POINTS = { slag: 100, gezocht: 150, vraag: 25, kristal: 50 };

class Laserslag {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.mode = 'teams'; // teams of ieder
    this.players = new Map();
    this.minutes = 6;
    this.startedAt = 0;
    this.endsAt = 0;
    this.bullets = [];
    this.nextBullet = 1;
    this.crystal = null;
    this.crystalAt = 0;
    this.feed = [];
    this.score = { rood: 0, blauw: 0 };
    this.resultsFile = null;
    this.sentAt = 0;
    this.lastTick = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, mode) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 5, 6, 8, 10, 15].includes(minutes) ? minutes : 6;
    this.mode = mode === 'ieder' ? 'ieder' : 'teams';
    this.phase = 'lobby';
    this.broadcast();
  }

  // Nieuwe spelers gaan naar het kleinste team.
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
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const p = {
      name: clean, socketId, team: this.pickTeam(), color: this.players.size % 8,
      x: 0, y: 0, a: 0, hp: HP, armor: 0, ammo: START_AMMO, alive: true, respawnAt: 0, spawn: 0, safeUntil: 0,
      asking: false, power: {}, kills: 0, deaths: 0, streak: 0, bestStreak: 0, score: 0,
      right: 0, wrong: 0, qstreak: 0, shots: 0, hits: 0, lastShot: 0, question: null, order: [], last: null,
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
    this.io.to(p.socketId).emit('ls-kicked');
    this.broadcast();
  }

  // Teams wisselen kan alleen in de wachtkamer (de leerkracht klikt op een naam).
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
    this.crystalAt = this.startedAt + 8000;
    const taken = [];
    for (const p of this.players.values()) {
      this.respawn(p, taken);
      taken.push([p.x, p.y]);
    }
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.broadcast();
  }

  respawn(p, taken) {
    const others = taken || [...this.players.values()].filter(o => o !== p && o.alive).map(o => [o.x, o.y]);
    [p.x, p.y] = Arena.spawnPoint(p.team, others);
    p.a = p.team === 'blauw' ? Math.PI : 0;
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
  move(playerId, { x, y, a, s } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.alive || s !== p.spawn) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (Math.hypot(x - p.x, y - p.y) > 160 || Arena.blocked(x, y, Arena.R - 4)) {
      // Onmogelijke sprong: de gsm terugzetten op de plek die de server kent.
      p.spawn++;
      return this.sendMe(p);
    }
    p.x = x;
    p.y = y;
    if (Number.isFinite(a)) p.a = a;
    if (this.crystal && Math.hypot(x - this.crystal.x, y - this.crystal.y) < Arena.R + 22) this.takeCrystal(p);
  }

  shoot(playerId, angle) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.alive || p.asking) return { ammo: p ? p.ammo : 0 };
    const now = Date.now();
    const rapid = p.power.snel > now;
    if (now - p.lastShot < (rapid ? RAPID_MS : FIRE_MS) - 30) return { ammo: p.ammo };
    if (p.ammo <= 0) return { ammo: 0, empty: true };
    if (!Number.isFinite(angle)) angle = p.a;
    p.lastShot = now;
    p.ammo--;
    p.shots++;
    p.a = angle;
    p.safeUntil = 0; // wie schiet, is niet meer beschermd
    const spread = p.power.drie > now ? [-.16, 0, .16] : [0];
    for (const d of spread) {
      const a = angle + d;
      const b = {
        id: this.nextBullet++, owner: playerId, team: p.team,
        x: p.x + Math.cos(a) * (Arena.R + 4), y: p.y + Math.sin(a) * (Arena.R + 4),
        vx: Math.cos(a) * Arena.BULLET.speed, vy: Math.sin(a) * Arena.BULLET.speed, left: Arena.BULLET.range,
      };
      if (Arena.wallAt(b.x, b.y)) continue;
      this.bullets.push(b);
      this.io.to('players').to('host').emit('ls-shot', { id: b.id, x: Math.round(b.x), y: Math.round(b.y), a: +a.toFixed(3), owner: playerId, team: p.team, color: p.color });
    }
    return { ammo: p.ammo };
  }

  enemies(a, b) {
    return this.mode === 'teams' ? a.team !== b.team : a !== b;
  }

  protected(p, now) {
    return p.asking || p.safeUntil > now;
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    // Kogels verplaatsen, in kleine stapjes zodat ze niet door een ridder heen vliegen.
    const gone = [];
    for (const b of this.bullets) {
      const steps = 3;
      const shooter = this.players.get(b.owner);
      for (let i = 0; i < steps && !b.dead; i++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        b.left -= (Arena.BULLET.speed * dt) / steps;
        if (b.left <= 0 || Arena.wallAt(b.x, b.y)) { b.dead = true; break; }
        for (const [id, p] of this.players) {
          if (!p.alive || id === b.owner) continue;
          if (shooter ? !this.enemies(shooter, p) : this.mode === 'teams' && p.team === b.team) continue;
          if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 > (Arena.R + Arena.BULLET.r) ** 2) continue;
          b.dead = true;
          this.hit(b, shooter, id, p, now);
          break;
        }
      }
      if (b.dead) gone.push(b.id);
    }
    if (gone.length) {
      this.bullets = this.bullets.filter(b => !b.dead);
      this.io.to('players').to('host').emit('ls-pop', gone);
    }
    // Terugkomen na een treffer.
    for (const p of this.players.values()) {
      if (!p.alive && now >= p.respawnAt) this.respawn(p);
    }
    // Een kristal in het midden van de arena.
    if (!this.crystal && now >= this.crystalAt) {
      this.crystal = { ...Arena.CRYSTAL, power: POWERS[Math.floor(Math.random() * POWERS.length)] };
      this.addFeed('💎 Er verschijnt een kristal in het midden!');
    }
    if (now - this.sentAt >= SEND_MS) {
      this.sentAt = now;
      this.sendWorld();
    }
  }

  hit(b, shooter, victimId, v, now) {
    const blocked = this.protected(v, now);
    this.io.to('players').to('host').emit('ls-hit', { id: victimId, by: b.owner, x: Math.round(b.x), y: Math.round(b.y), blocked });
    if (blocked) return;
    if (shooter) shooter.hits++;
    if (v.armor > 0) v.armor--;
    else v.hp--;
    if (v.hp > 0) return this.sendMe(v);
    // Uitgeschakeld: terug naar je kamp.
    v.alive = false;
    v.deaths++;
    v.respawnAt = now + RESPAWN_MS;
    v.power = {};
    const victimStreak = v.streak;
    v.streak = 0;
    let text = '';
    if (shooter) {
      const wanted = victimStreak >= 3;
      shooter.kills++;
      shooter.streak++;
      shooter.bestStreak = Math.max(shooter.bestStreak, shooter.streak);
      const points = POINTS.slag + (wanted ? POINTS.gezocht : 0);
      shooter.score += points;
      if (this.mode === 'teams') this.score[shooter.team]++;
      const callout = STREAKS[shooter.streak] || null;
      if (callout) this.addFeed(`🔥 ${shooter.name}: ${callout.toLowerCase()}!`);
      if (wanted) this.addFeed(`🎯 ${shooter.name} stopt de reeks van ${v.name} (${victimStreak})`);
      text = `${shooter.name} ⚔ ${v.name}`;
      this.io.to(shooter.socketId).emit('ls-slag', { victim: v.name, points, streak: shooter.streak, callout, wanted });
      this.sendMe(shooter);
    }
    this.io.to(v.socketId).emit('ls-out', { by: shooter ? shooter.name : '', respawnAt: v.respawnAt });
    this.io.to('players').to('host').emit('ls-ko', { victim: victimId, killer: b.owner, text, x: Math.round(v.x), y: Math.round(v.y) });
    this.sendMe(v);
    this.changed = true;
  }

  takeCrystal(p) {
    const power = this.crystal.power;
    this.crystal = null;
    this.crystalAt = Date.now() + CRYSTAL_EVERY;
    p.score += POINTS.kristal;
    this.givePower(p, power);
    this.addFeed(`💎 ${p.name} pakt het kristal: ${POWER_TEXT[power].toLowerCase()}`);
  }

  givePower(p, power) {
    if (power === 'schild') p.armor = 2;
    else if (power === 'hart') p.hp = HP;
    else p.power[power] = Date.now() + POWER_MS;
    this.io.to(p.socketId).emit('ls-power', { power, text: POWER_TEXT[power] });
    this.sendMe(p);
  }

  // Tijdens een vraag sta je stil in een schild: niemand kan je raken, maar jij kan ook niet schieten.
  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = !!on && this.phase === 'play';
    if (!p.asking) p.safeUntil = Math.max(p.safeUntil, Date.now() + AFTER_QUESTION_MS);
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    p.asking = true;
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = this.quiz.questions.map((_, i) => i).sort(() => Math.random() - .5);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers };
  }

  // Juist: munitie, meer naarmate je reeks langer is. Elke derde juiste op rij: een kracht.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    p.last = p.question;
    p.question = null;
    let gained = 0;
    let power = null;
    if (correct) {
      p.right++;
      p.qstreak++;
      gained = 8 + 2 * Math.min(p.qstreak - 1, 6);
      p.ammo = Math.min(MAX_AMMO, p.ammo + gained);
      p.score += POINTS.vraag;
      if (p.qstreak % 3 === 0) {
        power = POWERS[Math.floor(Math.random() * POWERS.length)];
        this.givePower(p, power);
      }
    } else {
      p.wrong++;
      p.qstreak = 0;
    }
    this.sendMe(p);
    return { correct, right: q.correct, gained, ammo: p.ammo, qstreak: p.qstreak, power: power && POWER_TEXT[power] };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.phase = 'einde';
    this.bullets = [];
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
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
        id, name: p.name, team: p.team, color: p.color, kills: p.kills, deaths: p.deaths, score: p.score,
        bestStreak: p.bestStreak, right: p.right, wrong: p.wrong, shots: p.shots, hits: p.hits,
      }))
      .sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, mode: this.mode, title: this.quiz && this.quiz.title,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
    };
  }

  hostState() {
    return {
      ...this.base(), ranking: this.ranking(), feed: this.feed, score: this.score, winner: this.winner(), resultsFile: this.resultsFile,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, {
        name: p.name, team: p.team, color: p.color, score: this.score, winner: this.winner(),
        rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length,
        kills: p.kills, deaths: p.deaths, points: p.score, bestStreak: p.bestStreak, right: p.right,
      });
    }
    return state;
  }

  // Wat alleen de leerling zelf moet weten: levens, munitie, krachten.
  sendMe(p) {
    const now = Date.now();
    this.io.to(p.socketId).emit('ls-me', {
      hp: p.hp, armor: p.armor, ammo: p.ammo, alive: p.alive, respawnAt: p.respawnAt, spawn: p.spawn, x: Math.round(p.x), y: Math.round(p.y),
      safe: Math.max(0, p.safeUntil - now), power: Object.fromEntries(Object.entries(p.power).map(([k, v]) => [k, Math.max(0, v - now)])),
      kills: p.kills, deaths: p.deaths, streak: p.streak, points: p.score, now,
    });
  }

  // Compacte posities: [id, naam, x, y, hoek, team, kleur, levens, vlaggen, slagen, reeks].
  // Vlaggen: 1 dood, 2 beschermd, 4 aan het laden (vraag), 8 drievoudig, 16 snelvuur, 32 schild.
  sendWorld() {
    const now = Date.now();
    const list = [...this.players.entries()].map(([id, p]) => {
      const flags = (p.alive ? 0 : 1) | (p.safeUntil > now ? 2 : 0) | (p.asking ? 4 : 0) | (p.power.drie > now ? 8 : 0) | (p.power.snel > now ? 16 : 0) | (p.armor ? 32 : 0);
      return [id, p.name, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), p.team, p.color, p.hp, flags, p.kills, p.streak];
    });
    const payload = { now, players: list, crystal: this.crystal, score: this.score };
    this.io.to('players').emit('ls-world', payload);
    if (this.changed || now - (this.hostSentAt || 0) > 500) {
      this.changed = false;
      this.hostSentAt = now;
      payload.ranking = this.ranking();
      payload.feed = this.feed;
    }
    this.io.to('host').emit('ls-world', payload);
  }

  broadcast() {
    this.io.to('host').emit('ls-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('ls-state', this.playerState(id));
      if (this.phase === 'play') this.sendMe(p);
    }
    this.io.to('players').except(seen).emit('ls-state', this.base());
  }
}

module.exports = { Laserslag, HP, POWER_TEXT };
