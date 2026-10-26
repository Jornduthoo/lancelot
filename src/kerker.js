// Ontsnap uit de kerker: de hele klas zit samen opgesloten en opent deur na deur met juiste antwoorden.
// Sleuteldeur: elk juist antwoord is een sleutel. Runenslot: elk juist antwoord toont één rune van de code aan wie antwoordde;
// samen vertellen en de code intypen. Laserhek: elke ridder moet minstens één keer juist antwoorden. Valhek: blijven
// antwoorden, anders zakt het terug. Op het einde de Kerkermeester, een robotbewaker die je samen neerhaalt.
// Hoeveel antwoorden een deur vraagt, hangt af van het aantal leerlingen en de speeltijd (KkWorld.need).
// Tegen gokken: na een fout antwoord even wachten, en die vraag komt later terug.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const World = require('../public/js/kk-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf } = require('./tempo');

const TICK_MS = 250;
const LIER_IDLE_MS = 3000; // zo lang mag het stil zijn voor het valhek begint te zakken
const LIER_SINK = .03; // per seconde
const HINT_AFTER_MS = 45000; // alle runen gevonden maar nog geen code: dan toont het bord er één
const HINT_EVERY_MS = 15000;
const CODE_WAIT_MS = 4000; // na een foute code

class Kerker {
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
    this.plan = [];
    this.d = 0;
    this.door = null;
    this.ev = [];
    this.startedAt = 0;
    this.endsAt = 0;
    this.escapedAt = 0;
    this.outcome = '';
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
    this.minutes = World.MINUTES.includes(minutes) ? minutes : 5;
    this.tempo = tempoOf(tempo);
    this.plan = World.plan(this.minutes);
    this.vragen = new Vragen(quiz, 'Ontsnap uit de kerker', this.tempo);
    this.phase = 'lobby';
    this.broadcast();
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
    const n = this.players.size ? Math.max(...[...this.players.values()].map(p => p.n)) + 1 : 0;
    this.players.set(playerId, {
      n, name: clean, socketId, color: World.COLORS[n % World.COLORS.length],
      help: 0, keys: 0, runes: 0, lamps: 0, lier: 0, hits: 0, codes: 0, known: {}, codeWaitUntil: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('kk-kicked');
    if (this.door) this.door.lamps.delete(p.n);
    this.broadcast();
  }

  // Leerlingen die nu verbonden zijn: het laserhek wacht niet op wie weg is.
  online() {
    let n = 0;
    for (const p of this.players.values()) if (p.socketId && this.io.sockets.sockets.get(p.socketId)) n++;
    return Math.max(1, n);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.d = 0;
    this.openDoor(this.startedAt);
    this.addFeed('🔒 De kerkerdeur valt dicht. Samen naar buiten!');
    this.ticker = setInterval(() => this.tick(Date.now()), TICK_MS);
    this.endTimer = setTimeout(() => this.finish('tijd'), this.endsAt - now);
    this.broadcast();
  }

  // De volgende deur klaarzetten. Ze telt meteen mee, ook al loopt de animatie van de vorige nog.
  openDoor(startsAt) {
    const type = this.plan[this.d];
    const need = World.need(type, this.players.size, this.minutes, this.tempo, this.plan);
    this.door = {
      i: this.d, type, need, have: 0, startsAt,
      code: type === 'runen' ? World.code() : null, holders: [[], [], [], []], foundAt: 0, revealed: [],
      lamps: new Set(), meter: 0, push: 0, hp: need, maxHp: need,
    };
    if (type === 'laser') this.door.need = Math.max(1, Math.ceil(this.online() * .8));
  }

  // Een juist antwoord helpt de deur van nu. Geeft terug wat de leerling kreeg.
  help(p, now) {
    const door = this.door;
    if (!door) return {};
    const out = { type: door.type };
    p.help++;
    if (door.type === 'sleutel') {
      const gold = p.streak > 0 && p.streak % 5 === 0;
      const k = gold ? 2 : 1;
      door.have = Math.min(door.need, door.have + k);
      p.keys += k;
      out.keys = k;
      this.ev.push(['key', p.n, k]);
      if (gold) this.addFeed(`🗝️ ${p.name} smeedt een gouden sleutel (5 op rij)`, false);
    } else if (door.type === 'runen') {
      const mine = p.known[door.i] || (p.known[door.i] = {});
      const open = [0, 1, 2, 3].filter(pos => mine[pos] === undefined);
      if (open.length) {
        const fewest = Math.min(...open.map(pos => door.holders[pos].length));
        const pick = open.filter(pos => door.holders[pos].length === fewest);
        const pos = pick[Math.floor(Math.random() * pick.length)];
        mine[pos] = door.code[pos];
        door.holders[pos].push(p.n);
        p.runes++;
        out.rune = { pos, r: door.code[pos] };
        this.ev.push(['rune', p.n, pos]);
        door.have = door.holders.filter(h => h.length).length;
        if (door.have === 4 && !door.foundAt) {
          door.foundAt = now;
          this.addFeed('ᛟ Alle vier de runen zijn gevonden. Vertel ze aan elkaar!');
        }
      } else out.all = true;
    } else if (door.type === 'laser') {
      if (!door.lamps.has(p.n)) {
        door.lamps.add(p.n);
        p.lamps++;
        out.lamp = true;
        this.ev.push(['lamp', p.n]);
      } else {
        out.lit = true;
        this.ev.push(['spark', p.n]);
      }
      door.have = door.lamps.size;
    } else if (door.type === 'lier') {
      door.meter = Math.min(1, door.meter + 1 / door.need);
      door.push = now;
      door.have = Math.round(door.meter * door.need);
      p.lier++;
      this.ev.push(['lier', p.n]);
    } else if (door.type === 'bewaker') {
      const dmg = p.streak >= 3 ? 2 : 1;
      door.hp = Math.max(0, door.hp - dmg);
      door.have = door.maxHp - door.hp;
      p.hits += dmg;
      out.dmg = dmg;
      this.ev.push(['hit', p.n, dmg]);
    }
    this.check(now);
    return out;
  }

  // Is de deur open? Dan de volgende, of de uitgang.
  check(now) {
    const door = this.door;
    if (!door || this.phase !== 'play') return;
    let open = false;
    if (door.type === 'sleutel') open = door.have >= door.need;
    else if (door.type === 'laser') open = door.lamps.size >= door.need;
    else if (door.type === 'lier') open = door.meter >= 1;
    else if (door.type === 'bewaker') open = door.hp <= 0;
    else if (door.type === 'runen') open = !!door.solved;
    if (!open) return;
    const info = World.DOORS[door.type];
    this.ev.push(['open', door.i]);
    if (this.d >= this.plan.length - 1) {
      this.addFeed('☀️ De Kerkermeester valt! Jullie zijn ONTSNAPT!');
      this.escapedAt = now;
      this.finish('ontsnapt');
      return;
    }
    this.addFeed(`🚪 ${info.name} is open (deur ${door.i + 1} van ${this.plan.length})`);
    this.d++;
    this.openDoor(Math.max(now, door.startsAt) + World.OPEN_MS);
  }

  // Iemand typt de code van het runenslot in.
  code(playerId, guess) {
    const p = this.players.get(playerId);
    const door = this.door;
    const now = Date.now();
    if (!p || this.phase !== 'play' || !door || door.type !== 'runen') return { error: 'Er is geen runenslot.' };
    if (now < door.startsAt) return { error: 'De deur gaat nog open.' };
    if (now < p.codeWaitUntil) return { error: 'Het slot is nog warm. Even wachten.', wait: p.codeWaitUntil - now };
    if (!Array.isArray(guess) || guess.length !== World.CODE_LEN || !guess.every(g => Number.isInteger(g) && g >= 0 && g < World.RUNES.length)) return { error: 'Kies vier runen.' };
    const good = guess.filter((g, i) => g === door.code[i]).length;
    if (good === World.CODE_LEN) {
      door.solved = true;
      p.codes++;
      p.help += 3;
      this.ev.push(['code', p.n]);
      this.addFeed(`ᛟ ${p.name} kraakt het runenslot!`);
      this.check(now);
      return { ok: true };
    }
    p.codeWaitUntil = now + CODE_WAIT_MS;
    this.ev.push(['codefout', p.n]);
    return { wrong: true, good, wait: CODE_WAIT_MS };
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    return { ...res, streak: p.streak };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    let got = {};
    if (res.correct) {
      got = this.help(p, Date.now());
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    }
    return { ...res, ...got, streak: p.streak };
  }

  tick(now) {
    const door = this.door;
    if (door && now >= door.startsAt) {
      if (door.type === 'lier' && door.meter > 0 && now - door.push > LIER_IDLE_MS) {
        door.meter = Math.max(0, door.meter - LIER_SINK * TICK_MS / 1000);
        door.have = Math.round(door.meter * door.need);
      }
      if (door.type === 'laser') {
        door.need = Math.max(1, Math.ceil(this.online() * .8));
        this.check(now);
      }
      // Lukt het niet met de code? Dan toont het bord om de zoveel tijd één rune.
      if (door.type === 'runen' && door.foundAt && !door.solved && door.revealed.length < World.CODE_LEN - 1) {
        const due = Math.floor((now - door.foundAt - HINT_AFTER_MS) / HINT_EVERY_MS) + 1;
        if (due > door.revealed.length) {
          const pos = [0, 1, 2, 3].find(i => !door.revealed.includes(i));
          door.revealed.push(pos);
          this.addFeed(`💡 Hulp van de burchtgeest: rune ${pos + 1} staat nu op het bord`, false);
        }
      }
    }
    if (this.phase === 'play') this.send(now);
  }

  finish(outcome = 'tijd') {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.outcome = outcome;
    if (outcome !== 'ontsnapt') this.addFeed(`⏳ De tijd is op. ${this.d} van de ${this.plan.length} deuren open.`);
    this.send(Date.now());
    this.phase = 'einde';
    this.vragen.flush();
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten bewaren mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'play') this.finish('gestopt');
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  // Hoeveel deuren zijn open en hoeveel tijd hield de klas over?
  result() {
    const opened = this.outcome === 'ontsnapt' ? this.plan.length : this.d;
    const total = this.minutes * 60000;
    const left = this.outcome === 'ontsnapt' ? Math.max(0, this.endsAt - this.escapedAt) : 0;
    return { outcome: this.outcome, opened, doors: this.plan.length, left, stars: this.outcome === 'ontsnapt' ? World.stars(left, total) : 0 };
  }

  save() {
    const r = this.result();
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.help, p.keys, p.runes, p.codes, p.lamps, p.lier, p.hits, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`kerker-${this.quiz.title}`, [
      ['Ontsnap uit de kerker', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size],
      ['Uitkomst', r.outcome === 'ontsnapt' ? `Ontsnapt met nog ${Math.round(r.left / 1000)} s over (${r.stars} sterren)` : `${r.opened} van ${r.doors} deuren open`],
    ], ['Rang', 'Naam', 'Hulp', 'Sleutels', 'Runen gevonden', 'Codes gekraakt', 'Lampjes', 'Lier', 'Treffers', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, help: p.help, keys: p.keys, runes: p.runes, codes: p.codes, lamps: p.lamps, lier: p.lier, hits: p.hits,
        right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.help - a.help || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  // De deur zoals iedereen ze ziet. De code zelf blijft geheim, behalve de runen die het bord als hulp toont.
  doorState() {
    const d = this.door;
    if (!d) return null;
    return {
      i: d.i, type: d.type, need: d.need, have: d.have, startsAt: d.startsAt, lamps: [...d.lamps], meter: d.meter, hp: d.hp, maxHp: d.maxHp,
      found: d.holders.map(h => h.length), all: !!d.foundAt, hints: d.revealed.map(pos => [pos, d.code[pos]]),
    };
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, plan: this.plan,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(), door: this.doorState(),
      result: this.phase === 'einde' ? this.result() : null,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  me(p, ranking) {
    const r = ranking.find(x => x.n === p.n) || {};
    const known = this.door ? p.known[this.door.i] || {} : {};
    return { n: p.n, help: p.help, rank: ranking.indexOf(r) + 1, players: this.players.size, known, right: p.right, streak: p.streak };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, this.ranking()), right: p.right, wrong: p.wrong });
    return state;
  }

  // Elke tick: de deur en wat er net gebeurde (voor de animaties). De stand en de hulp om de seconde.
  send(now) {
    const msg = { door: this.doorState(), ev: this.ev };
    this.ev = [];
    const full = this.feedChanged || now - this.lastRank > 1000;
    if (!full && !msg.ev.length && !(msg.door && msg.door.type === 'lier' && msg.door.meter > 0)) return;
    if (full) {
      this.lastRank = now;
      this.feedChanged = false;
      const ranking = this.ranking();
      this.io.to('host').emit('kk-tick', { ...msg, ranking, feed: this.feed });
      for (const p of this.players.values()) this.io.to(p.socketId).emit('kk-tick', { ...msg, me: this.me(p, ranking) });
      return;
    }
    this.io.to('host').emit('kk-tick', msg);
    for (const p of this.players.values()) this.io.to(p.socketId).emit('kk-tick', msg);
  }

  broadcast() {
    this.io.to('host').emit('kk-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('kk-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('kk-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('kk-state', this.hostState());
    socket.on('kk-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('kerker');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('kk-start', () => this.start());
    socket.on('kk-kick', id => this.kick(id));
    socket.on('kk-finish', () => this.finish('tijd'));
    socket.on('kk-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('kk-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('kk-state', this.base());
    socket.on('kk-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.kkId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('kk-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.kkId ? fn(socket.data.kkId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('kk-code', (id, guess) => this.code(id, guess));
    on('kk-question', id => guard.question(id));
    on('kk-answer', (id, choice) => guard.answer(id, choice));
  }
}

module.exports = { Kerker };
