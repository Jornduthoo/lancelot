// Ridderrace: ridders racen op hoverrossen over een neoncircuit rond een burcht.
// Rijden kost brandstof. Tanken doe je in de pitstop met quizvragen: elk goed antwoord vult de tank,
// twee juist op rij geeft een turbo. Wie na de speeltijd het verst staat, wint.
// De gsm rijdt zelf en stuurt zijn afstand; de server bewaakt brandstof, ronden en de stand.
const Track = require('../public/js/race-track');
const { tempoOf, factor } = require('./tempo');
const logboek = require('./logboek');
const quizzes = require('./quizzes');

const START_FUEL = 100;
const MAX_TURBOS = 5;
const CRYSTAL_FUEL = 2;
const TICK_MS = 100;

class Ridderrace {
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
    this.players = new Map();
    this.minutes = 5;
    this.startedAt = 0;
    this.endsAt = 0;
    this.feed = [];
    this.leader = null;
    this.candidate = null;
    this.candidateAt = 0;
    this.bestLap = null; // { name, ms }
    this.resultsFile = null;
    this.changed = false;
    this.hostSentAt = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 4, 5, 6, 8, 10].includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen race gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const p = {
      name: clean, socketId, color: this.players.size % 8,
      dist: 0, x: 0, speed: 0, fuel: START_FUEL, turbos: 0, turboUntil: 0, asking: false, spawn: 0, movedAt: 0,
      laps: 0, lapStart: 0, bestLap: 0, lastLap: 0, crystals: new Set(),
      right: 0, wrong: 0, qstreak: 0, bestStreak: 0, question: null, order: [], last: null,
    };
    this.players.set(playerId, p);
    // Wie later aansluit, start achteraan het veld.
    if (this.phase === 'play') this.place(p, this.players.size - 1, true);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('rr-kicked');
    this.broadcast();
  }

  // De startopstelling: rijen van vier achter de startlijn.
  place(p, n, late) {
    const lanes = [-.6, -.2, .2, .6];
    p.dist = late ? Math.min(0, ...[...this.players.values()].filter(o => o !== p).map(o => o.dist)) - 600 : -(Math.floor(n / 4) + 1) * 500;
    p.x = lanes[n % 4];
    p.speed = 0;
    p.spawn++;
    p.movedAt = Date.now();
    p.lapStart = Math.max(Date.now(), this.startedAt);
    this.sendMe(p);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'play';
    this.startedAt = Date.now() + 4000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    let n = 0;
    for (const p of this.players.values()) this.place(p, n++);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.addFeed('🚦 De race is begonnen!');
    this.broadcast();
  }

  playing(p) {
    return p && this.phase === 'play' && Date.now() >= this.startedAt;
  }

  // De gsm meldt hoe ver hij staat. Te grote sprongen worden teruggezet.
  move(playerId, { d, x, v, s } = {}) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || s !== p.spawn || !Number.isFinite(d) || !Number.isFinite(x)) return;
    const now = Date.now();
    const dt = Math.min(1.5, Math.max(.05, (now - Math.max(p.movedAt, this.startedAt)) / 1000));
    const delta = d - p.dist;
    const fast = p.fuel > 0 || p.turboUntil + 400 > now;
    const limit = (fast ? Track.TURBO_SPEED : Track.TURBO_SPEED * Track.CRAWL * 1.3) * dt * 1.25 + 400;
    p.movedAt = now;
    if (delta < -300 || delta > limit) {
      p.spawn++;
      return this.sendMe(p);
    }
    const before = p.dist;
    const hadFuel = p.fuel > 0;
    if (p.turboUntil < now && delta > 0) p.fuel = Math.max(0, p.fuel - delta * Track.FUEL_RATE);
    p.dist = d;
    p.x = Math.max(-3, Math.min(3, x));
    p.speed = Number.isFinite(v) ? Math.max(0, Math.min(Track.TURBO_SPEED * 1.1, v)) : 0;
    if (hadFuel && p.fuel <= 0) this.sendMe(p);
    const lapBefore = Math.floor(before / Track.LENGTH);
    const lapNow = Math.floor(d / Track.LENGTH);
    if (lapNow > lapBefore && lapNow >= 1) this.lap(p, lapNow, now);
  }

  lap(p, laps, now) {
    const ms = now - p.lapStart;
    p.laps = laps;
    p.lapStart = now;
    p.lastLap = ms;
    const personal = !p.bestLap || ms < p.bestLap;
    if (personal) p.bestLap = ms;
    const record = !this.bestLap || ms < this.bestLap.ms;
    if (record) {
      this.bestLap = { name: p.name, ms };
      this.addFeed(`⏱️ ${p.name} rijdt de snelste ronde: ${(ms / 1000).toFixed(1).replace('.', ',')} s`);
    }
    if (this.leader === p.name) this.addFeed(`🏁 ${p.name} begint aan ronde ${laps + 1}`);
    this.io.to(p.socketId).emit('rr-lap', { laps, ms, personal, record });
    this.sendMe(p);
  }

  crystal(playerId, segment) {
    const p = this.players.get(playerId);
    const s = Track.segments[segment];
    if (!this.playing(p) || !s || !s.crystal) return;
    const lap = Math.floor(p.dist / Track.LENGTH);
    const key = `${lap}:${segment}`;
    const here = Math.floor(Track.wrap(p.dist) / Track.SEG);
    const gap = Math.min(Math.abs(here - segment), Track.COUNT - Math.abs(here - segment));
    if (p.crystals.has(key) || gap > 12) return;
    p.crystals.add(key);
    p.fuel = Math.min(100, p.fuel + CRYSTAL_FUEL);
    return { fuel: p.fuel };
  }

  turbo(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.asking || p.turbos <= 0) return { error: 'Geen turbo.' };
    const now = Date.now();
    p.turbos--;
    p.turboUntil = Math.max(now, p.turboUntil) + Track.TURBO_MS;
    this.sendMe(p);
    return { ok: true, turbos: p.turbos, ms: p.turboUntil - now };
  }

  // In de pitstop sta je stil en beantwoord je vragen.
  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = !!on && this.phase === 'play';
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'De race loopt niet.' };
    p.asking = true;
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers };
  }

  // Juist: brandstof, meer naarmate je reeks langer is. Twee juist op rij: een turbo.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    logboek.answer('Ridderrace', this.quiz.title, p.name, q, correct);
    p.last = p.question;
    p.question = null;
    let gained = 0;
    let turbo = false;
    if (correct) {
      p.right++;
      p.qstreak++;
      p.bestStreak = Math.max(p.bestStreak, p.qstreak);
      gained = Math.min(100 - p.fuel, Math.round((25 + 5 * Math.min(p.qstreak - 1, 5)) * factor(this.tempo)));
      p.fuel += gained;
      if (p.qstreak % 2 === 0 && p.turbos < MAX_TURBOS) {
        p.turbos++;
        turbo = true;
      }
    } else {
      p.wrong++;
      p.qstreak = 0;
    }
    this.sendMe(p);
    return { correct, right: q.correct, gained: Math.round(gained), fuel: p.fuel, turbos: p.turbos, qstreak: p.qstreak, turbo };
  }

  // Een nieuwe leider wordt pas gemeld als die de kop twee seconden houdt (en niet in het startgewoel).
  tick() {
    const ranking = this.ranking();
    const now = Date.now();
    const first = ranking[0] && ranking[0].name;
    if (first && first !== this.leader) {
      if (this.candidate !== first) {
        this.candidate = first;
        this.candidateAt = now;
      } else if (now - this.candidateAt > 2000) {
        if (this.leader !== null && now > this.startedAt + 10000) this.addFeed(`👑 ${first} neemt de leiding!`);
        this.leader = first;
      }
    } else {
      this.candidate = null;
    }
    this.sendWorld(ranking);
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
    clearInterval(this.ticker);
    this.phase = 'einde';
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

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, name: p.name, color: p.color, dist: Math.round(p.dist), laps: p.laps, progress: +(Math.max(0, p.dist) / Track.LENGTH).toFixed(3),
        bestLap: p.bestLap, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak, asking: p.asking,
      }))
      .sort((a, b) => b.dist - a.dist);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
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
        name: p.name, color: p.color, rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length,
        laps: p.laps, progress: Math.max(0, p.dist) / Track.LENGTH, bestLap: p.bestLap, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      });
    }
    return state;
  }

  // Wat alleen de leerling zelf moet weten: tank, turbo's en (na een correctie) de juiste plek.
  sendMe(p) {
    const now = Date.now();
    this.io.to(p.socketId).emit('rr-me', {
      fuel: p.fuel, turbos: p.turbos, turbo: Math.max(0, p.turboUntil - now), spawn: p.spawn, dist: p.dist, x: p.x,
      laps: p.laps, bestLap: p.bestLap, lapStart: p.lapStart, now,
    });
  }

  // Compacte posities: [id, naam, afstand, x, snelheid, kleur, vlaggen]. Vlaggen: 1 pitstop, 2 turbo, 4 lege tank.
  sendWorld(ranking) {
    const now = Date.now();
    const list = [...this.players.entries()].map(([id, p]) => {
      const flags = (p.asking ? 1 : 0) | (p.turboUntil > now ? 2 : 0) | (p.fuel <= 0 ? 4 : 0);
      return [id, p.name, Math.round(p.dist), +p.x.toFixed(2), Math.round(p.speed), p.color, flags];
    });
    const payload = { now, players: list };
    this.io.to('players').emit('rr-world', payload);
    if (this.changed || now - this.hostSentAt > 500) {
      this.changed = false;
      this.hostSentAt = now;
      payload.ranking = ranking;
      payload.feed = this.feed;
      payload.bestLap = this.bestLap;
    }
    this.io.to('host').emit('rr-world', payload);
  }

  broadcast() {
    this.io.to('host').emit('rr-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('rr-state', this.playerState(id));
      if (this.phase === 'play') this.sendMe(p);
    }
    this.io.to('players').except(seen).emit('rr-state', this.base());
  }
}

module.exports = { Ridderrace };
