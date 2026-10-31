// Plasmapoort: strafschoppen in de burcht. Elke leerling speelt op zijn eigen scherm een toernooi tegen een rij robotridders:
// telkens 5 strafschoppen per kant (jij schiet, dan keep jij), bij gelijkspel sudden death. Win je, dan komt de volgende robot.
// Versla je ze alle 8, dan ben je kampioen en begint een nieuw, moeilijker toernooi (een ster erbij).
// Voor elke trap van jou komt een vraag. Juist: een gouden bal (het vizier zwaait trager, de keeper duikt minder goed)
// en een groot schild voor je volgende redding. Fout: even wachten, die vraag komt later terug.
// De leerling mikt en duikt zelf; de server beslist of het raak is en houdt de stand bij.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/pp-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor } = require('./tempo');

const SEND_MS = 500;
const GAP_MS = 1400; // zo lang duurt een trap minstens (de animatie): sneller kan de server niets aannemen
const P = World.POINTS;

const rnd = (a, b) => a + Math.random() * (b - a);
const side = () => (Math.random() < .5 ? -1 : 1);
const pickZone = () => { const r = Math.random(); return r < .4 ? -1 : r < .6 ? 0 : 1; };

class Plasmapoort {
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
    this.minutes = 5;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.resultsFile = null;
    this.lastRank = 0;
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
    this.vragen = new Vragen(quiz, 'Plasmapoort', this.tempo);
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
    const n = this.nextN++;
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      pts: 0, robot: 0, tier: 0, a: [], b: [], gold: false, shield: false, keep: null, nextAt: 0,
      wins: 0, losses: 0, champ: 0, goals: 0, shots: 0, saves: 0, keeps: 0, asking: false,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('pp-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.nextAt = this.startedAt;
    this.addFeed('⚡ De poorten gaan open. Het toernooi begint!');
    this.ticker = setInterval(() => this.send(Date.now()), SEND_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- De strafschoppen ----------

  ready(p) {
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het spel loopt niet.' };
    if (now < p.nextAt) return { error: 'Even wachten.', wait: p.nextAt - now };
    return null;
  }

  // Jij schiet op de poort: x en y uit het vizier. De robot duikt en de server beslist.
  shoot(playerId, { x, y } = {}) {
    const p = this.players.get(playerId);
    const bad = this.ready(p);
    if (bad) return bad;
    if (World.turnOf(p.a, p.b) !== 'shoot') return { error: 'Je moet nu keepen.', turn: 'keep' };
    x = Math.max(-1.3, Math.min(1.3, Number(x) || 0));
    y = Math.max(0, Math.min(1.3, Number(y) || 0));
    const L = World.level(p.robot, p.tier);
    const gold = p.gold;
    p.gold = false;
    let result = World.outOf(x, y);
    let viaPaal = false;
    if (result === 'paal' && Math.random() < .3) { result = null; viaPaal = true; }
    // De keeper: soms leest hij je schot, anders gokt hij.
    const zone = World.zoneOf(x);
    const reads = Math.random() < (.22 + .5 * L) * (gold ? .7 : 1);
    const dive = reads ? zone : pickZone();
    let kx = dive === 0 ? rnd(-.15, .15) : dive * rnd(.5, .8), ky = dive === 0 ? rnd(.1, .5) : rnd(.25, .6);
    if (!result) {
      if (dive === zone) {
        const corner = Math.abs(x) > .75 || y > .8;
        let saveP = corner ? .3 + .4 * L : .8 + .15 * L;
        if (gold) saveP *= .5;
        if (viaPaal) saveP *= .3;
        if (Math.random() < saveP) { result = 'save'; kx = x; ky = y; } else {
          result = 'goal';
          const s = x >= 0 ? 1 : -1;
          kx = x - s * rnd(.15, .25);
          ky = Math.max(.1, y - rnd(.1, .25));
        }
      } else result = 'goal';
    }
    const goal = result === 'goal';
    p.a.push(goal);
    p.shots++;
    p.nextAt = Date.now() + GAP_MS;
    let points = 0;
    if (goal) {
      p.goals++;
      points = P.goal + (gold ? P.gold : 0);
      const corner = Math.abs(x) > .75 && y > .7;
      if (corner && Math.random() < .35) this.addFeed(`🎯 ${p.name} schiet in de kruising tegen ${World.ROBOTS[p.robot].name}!`, false);
    }
    p.pts += points;
    p.dirty = true;
    const out = { kind: 'shot', result, viaPaal, x, y, kx, ky, gold, points };
    return this.after(p, out);
  }

  // Jij keept: de robot neemt aanloop en schiet. Je krijgt waar hij naartoe schiet en hoe lang hij het verraadt.
  keep(playerId) {
    const p = this.players.get(playerId);
    const bad = this.ready(p);
    if (bad) return bad;
    if (World.turnOf(p.a, p.b) !== 'keep') return { error: 'Je moet nu schieten.', turn: 'shoot' };
    if (!p.keep) {
      const L = World.level(p.robot, p.tier);
      const zone = pickZone();
      let x = zone === 0 ? rnd(-.3, .3) : zone * rnd(.45, .92);
      let y = rnd(.08, .9);
      const miss = Math.random() < .14 - .1 * L;
      if (miss) {
        if (Math.random() < .5) x = side() * rnd(1.1, 1.25);
        else y = rnd(1.1, 1.2);
      }
      p.keep = {
        x, y, miss, shield: p.shield, windMs: World.KEEP.windMs,
        tellMs: Math.round(1050 - 700 * L), travelMs: Math.round(640 - 260 * L), clarity: Math.round((1 - .65 * L) * 100) / 100,
      };
    }
    const k = p.keep;
    return { x: k.x, y: k.y, windMs: k.windMs, tellMs: k.tellMs, travelMs: k.travelMs, clarity: k.clarity, shield: k.shield };
  }

  // Je duikt: dir -1 links, 0 midden, 1 rechts. t: hoeveel ms na de trap (negatief = ervoor).
  // Te vroeg geduikt? Dan schiet de robot naar de andere kant. Te laat? Dan blijf je in het midden staan.
  dive(playerId, { dir, t } = {}) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || !p.keep) return { error: 'Er komt geen schot.' };
    const k = p.keep;
    dir = [-1, 0, 1].includes(dir) ? dir : 0;
    t = Number.isFinite(t) ? t : 9999;
    let { x, y } = k;
    const early = dir !== 0 && t < -World.KEEP.early;
    if (early && !k.miss && World.zoneOf(x) !== -dir) x = -dir * rnd(.5, .88);
    if (t > k.travelMs - 90) dir = 0;
    let result = World.outOf(x, y);
    if (!result) {
      const zone = World.zoneOf(x);
      let saved = dir === zone;
      const corner = Math.abs(x) > .75 || y > .8;
      if (saved && corner && !k.shield) saved = Math.random() < .7;
      if (!saved && k.shield && dir === 0 && Math.abs(x) < .6) saved = true;
      result = saved ? 'save' : 'goal';
    }
    p.keep = null;
    p.shield = false;
    p.b.push(result === 'goal');
    p.keeps++;
    p.nextAt = Date.now() + GAP_MS;
    let points = 0;
    if (result === 'save') { p.saves++; points = P.save; } else if (result !== 'goal') points = P.gemist;
    p.pts += points;
    p.dirty = true;
    return this.after(p, { kind: 'keep', result, x, y, dir, early, points });
  }

  // Na elke trap: is de wedstrijd beslist? Dan volgt de volgende robot (of opnieuw dezelfde).
  after(p, out) {
    const robot = p.robot, tier = p.tier;
    const ga = p.a.filter(Boolean).length, gb = p.b.filter(Boolean).length;
    Object.assign(out, { robot, tier, a: [...p.a], b: [...p.b] });
    const d = World.decided(p.a, p.b);
    if (d) {
      const R = World.ROBOTS[robot];
      if (d > 0) {
        p.wins++;
        const bonus = P.win + P.perRobot * robot;
        p.pts += bonus;
        out.points += bonus;
        p.robot++;
        if (p.robot >= World.ROBOTS.length) {
          p.robot = 0;
          p.tier++;
          p.champ++;
          p.pts += P.kampioen;
          out.points += P.kampioen;
          out.champ = true;
          this.addFeed(`🏆 ${p.name} verslaat ${R.name} en is KAMPIOEN van Plasmapoort${p.tier > 1 ? ` (${p.tier}⭐)` : ''}!`);
        } else if (robot >= 3 && !this.someoneBeat(p, robot)) this.addFeed(`⚡ ${p.name} verslaat als eerste ${R.name} (${ga}-${gb})!`);
      } else p.losses++;
      p.a = [];
      p.b = [];
      p.keep = null;
      p.nextAt = Date.now() + GAP_MS + 1600; // even tijd voor de eindstand van de wedstrijd
      out.end = { won: d > 0, ga, gb, robot: p.robot, tier: p.tier, bonus: d > 0 ? out.points : 0 };
    }
    this.io.to('host').emit('pp-ev', { n: p.n, ...out });
    return { ok: true, ...out, turn: World.turnOf(p.a, p.b) };
  }

  // Heeft iemand anders deze robot (in hetzelfde of een later toernooi) al verslagen?
  someoneBeat(p, robot) {
    return [...this.players.values()].some(o => o !== p && (o.tier > p.tier || (o.tier === p.tier && o.robot > robot)));
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (p) p.asking = Boolean(on) && this.phase === 'play';
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    return { ...res, streak: p.streak };
  }

  // Juist: gouden bal en groot schild, en punten. Fout: even wachten, de vraag komt later terug.
  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let points = 0;
    if (res.correct) {
      points = Math.round(P.vraag * factor(this.tempo));
      p.pts += points;
      p.gold = true;
      p.shield = true;
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} vragen op rij juist`, false);
    }
    p.dirty = true;
    return { ...res, points, gold: p.gold, streak: p.streak };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint Plasmapoort!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.wins, p.champ, p.goals, p.shots, p.saves, p.keeps, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`plasmapoort-${this.quiz.title}`, [['Plasmapoort', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size]],
      ['Rang', 'Naam', 'Punten', 'Robots verslagen', 'Kampioen', 'Doelpunten', 'Schoten', 'Reddingen', 'Keer gekeept', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, score: Math.round(p.pts), robot: p.robot, tier: p.tier, wins: p.wins, champ: p.champ,
        goals: p.goals, shots: p.shots, saves: p.saves, keeps: p.keeps, bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.score - a.score || b.wins - a.wins);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    return { n: p.n, score: r.score || 0, wins: p.wins, champ: p.champ, goals: p.goals, saves: p.saves, rank: ranking.indexOf(r) + 1, players: this.players.size, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      Object.assign(state, {
        name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong,
        match: { robot: p.robot, tier: p.tier, a: p.a, b: p.b, gold: p.gold, shield: p.shield, turn: World.turnOf(p.a, p.b) },
      });
    }
    return state;
  }

  send(now) {
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      const ranking = this.ranking();
      this.io.to('host').emit('pp-tick', { ranking, feed: this.feed, live: [...this.players.values()].map(p => [p.n, p.robot, p.tier, p.asking ? 1 : 0]) });
      this.feedChanged = false;
      for (const p of this.players.values()) {
        p.dirty = false;
        this.io.to(p.socketId).emit('pp-tick', { me: this.me(p, ranking), feed: this.feed.slice(0, 3) });
      }
    }
  }

  broadcast() {
    this.io.to('host').emit('pp-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('pp-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('pp-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('pp-state', this.hostState());
    socket.on('pp-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('plasma');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('pp-start', () => this.start());
    socket.on('pp-kick', id => this.kick(id));
    socket.on('pp-finish', () => this.finish());
    socket.on('pp-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('pp-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('pp-state', this.base());
    socket.on('pp-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.ppId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('pp-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.ppId ? fn(socket.data.ppId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('pp-shoot', (id, m) => this.shoot(id, m || {}));
    on('pp-keep', id => this.keep(id));
    on('pp-dive', (id, m) => this.dive(id, m || {}));
    on('pp-asking', (id, v) => this.asking(id, v));
    on('pp-question', id => guard.question(id));
    on('pp-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.ppId) this.asking(socket.data.ppId, false);
  }
}

module.exports = { Plasmapoort };
