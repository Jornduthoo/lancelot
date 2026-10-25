// Kristalroof: elke leerling beantwoordt vragen en mijnt kristallen. Na een goed antwoord kies je een kist:
// kristallen, een verdubbelaar, een schild, soms pech, of een roof. Bij een roof kies je een andere ridder
// en raad je diens geheime woord. Juist geraden? Dan neem je een deel van zijn kristallen mee.
const logboek = require('./logboek');
const quizzes = require('./quizzes');
const WORDS = [
  'draak', 'zwaard', 'kasteel', 'toren', 'ridder', 'kroon', 'schild', 'lans', 'burcht', 'kerker',
  'paard', 'banier', 'helm', 'harnas', 'boog', 'pijl', 'tovenaar', 'heks', 'reus', 'griffioen',
  'eenhoorn', 'feniks', 'komeet', 'planeet', 'raket', 'robot', 'laser', 'neon', 'satelliet', 'meteoor',
  'kristal', 'robijn', 'saffier', 'smaragd', 'goud', 'zilver', 'fakkel', 'brug', 'gracht', 'valhek',
];

// Kisten en hoe vaak ze voorkomen.
const CHESTS = [
  { kind: 'klein', weight: 34 },
  { kind: 'middel', weight: 22 },
  { kind: 'groot', weight: 9 },
  { kind: 'dubbel', weight: 5 },
  { kind: 'roof', weight: 17 },
  { kind: 'schild', weight: 6 },
  { kind: 'pech', weight: 7 },
];
const SHIELD_MS = 45000;
const AFTER_ROBBED_MS = 20000; // na een geslaagde roof even veilig, zodat niet iedereen op dezelfde valt

function pick(list) {
  const total = list.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of list) {
    r -= c.weight;
    if (r < 0) return c.kind;
  }
  return list[0].kind;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Kristalroof {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearTimeout(this.pending);
    this.pending = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 8;
    this.startedAt = 0;
    this.endsAt = 0;
    this.feed = [];
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 5, 8, 10, 12, 15].includes(minutes) ? minutes : 8;
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
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const options = shuffle(WORDS).slice(0, 4);
    this.players.set(playerId, {
      name: clean, socketId, options, secret: null, crystals: 0, mined: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
      chests: null, hack: null, shieldUntil: 0, robs: 0, robbed: 0, stolen: 0, lost: 0,
      question: null, order: [], last: null,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('kr-kicked');
    this.broadcast();
  }

  // Het geheime woord kies je uit vier woorden. Wie niet kiest, krijgt het eerste.
  secret(playerId, word) {
    const p = this.players.get(playerId);
    if (!p || !p.options.includes(word)) return { error: 'Kies een van de woorden.' };
    if (this.phase === 'play' && p.secret) return { error: 'Je geheime woord ligt al vast.' };
    p.secret = word;
    this.sendState(playerId);
    this.changed();
    return { ok: true, secret: word };
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'play';
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) if (!p.secret) p.secret = p.options[0];
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.broadcast();
  }

  playing(p) {
    return p && this.phase === 'play' && Date.now() >= this.startedAt;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'Het spel loopt niet.' };
    if (p.chests) return { chests: true };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, number: p.right + p.wrong + 1 };
  }

  // Hoeveel een kist waard is, groeit met het aantal goede antwoorden.
  amount(p, kind) {
    const base = Math.min(400, 20 + p.right * 6);
    return { klein: base, middel: base * 2, groot: base * 5 }[kind] || 0;
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    p.last = p.question;
    p.question = null;
    const correct = choice === q.correct;
    logboek.answer('Kristalroof', this.quiz.title, p.name, q, correct);
    if (correct) {
      p.right++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      // Drie kisten; zonder andere spelers geen roof.
      const others = this.players.size > 1;
      const pool = CHESTS.filter(c => others || c.kind !== 'roof');
      p.chests = [pick(pool), pick(pool), pick(pool)];
      if (p.streak === 5 || p.streak === 10) this.addFeed(`🔥 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    } else {
      p.wrong++;
      p.streak = 0;
    }
    this.changed();
    return { correct, right: q.correct, streak: p.streak, ...this.wallet(p) };
  }

  // Een kist openen: de andere twee worden ook getoond, zodat je ziet wat je miste.
  open(playerId, index) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.chests || ![0, 1, 2].includes(index)) return { error: 'Er staan geen kisten klaar.' };
    const reveal = p.chests.map(kind => ({ kind, amount: this.amount(p, kind) }));
    const kind = p.chests[index];
    p.chests = null;
    let change = 0;
    if (['klein', 'middel', 'groot'].includes(kind)) {
      change = this.amount(p, kind);
    } else if (kind === 'dubbel') {
      change = Math.max(this.amount(p, 'klein'), p.crystals);
      this.addFeed(`✨ Dubbel voor ${p.name}!`);
    } else if (kind === 'pech') {
      change = -Math.round(p.crystals * .15);
    } else if (kind === 'schild') {
      p.shieldUntil = Date.now() + SHIELD_MS;
    } else if (kind === 'roof') {
      p.hack = { stage: 'target' };
    }
    p.crystals += change;
    if (change > 0) p.mined += change;
    if (change < 0) p.lost -= change;
    this.changed();
    return { ok: true, kind, change, reveal, targets: kind === 'roof' ? this.targets(playerId) : null, ...this.wallet(p) };
  }

  targets(playerId) {
    const now = Date.now();
    return [...this.players.entries()]
      .filter(([id]) => id !== playerId)
      .map(([id, o]) => ({ id, name: o.name, crystals: o.crystals, shield: o.shieldUntil > now }))
      .sort((a, b) => b.crystals - a.crystals);
  }

  // Een slachtoffer kiezen: je krijgt drie woorden, waaronder het geheime woord.
  target(playerId, targetId) {
    const p = this.players.get(playerId);
    const t = this.players.get(targetId);
    if (!this.playing(p) || !p.hack || p.hack.stage !== 'target') return { error: 'Je bent niet aan het roven.' };
    if (!t || targetId === playerId) return { error: 'Die ridder is er niet meer.', targets: this.targets(playerId) };
    if (t.shieldUntil > Date.now()) return { error: `${t.name} staat achter een schild.`, targets: this.targets(playerId) };
    const decoys = shuffle(t.options.filter(w => w !== t.secret)).slice(0, 2);
    p.hack = { stage: 'guess', target: targetId, words: shuffle([t.secret, ...decoys]) };
    return { ok: true, name: t.name, crystals: t.crystals, words: p.hack.words };
  }

  guess(playerId, word) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.hack || p.hack.stage !== 'guess') return { error: 'Je bent niet aan het raden.' };
    const t = this.players.get(p.hack.target);
    p.hack = null;
    if (!t) return { error: 'Die ridder is er niet meer.' };
    if (word !== t.secret) {
      this.io.to(t.socketId).emit('kr-attempt', { by: p.name });
      this.changed();
      return { ok: true, success: false, secret: null, name: t.name, ...this.wallet(p) };
    }
    const pct = .15 + Math.random() * .25;
    const amount = Math.round(t.crystals * pct);
    t.crystals -= amount;
    t.lost += amount;
    t.robbed++;
    t.shieldUntil = Math.max(t.shieldUntil, Date.now() + AFTER_ROBBED_MS);
    p.crystals += amount;
    p.stolen += amount;
    p.robs++;
    this.addFeed(`🗝️ ${p.name} kraakt de kluis van ${t.name}: ${amount.toLocaleString('nl-BE')} 💎`);
    this.io.to(t.socketId).emit('kr-robbed', { by: p.name, amount, crystals: t.crystals });
    this.changed();
    return { ok: true, success: true, amount, pct: Math.round(pct * 100), name: t.name, ...this.wallet(p) };
  }

  // Wie geen zin heeft om te roven, mag de roof laten vallen.
  skip(playerId) {
    const p = this.players.get(playerId);
    if (p) p.hack = null;
    return { ok: true };
  }

  wallet(p) {
    return { crystals: p.crystals, streak: p.streak, shield: Math.max(0, p.shieldUntil - Date.now()) };
  }

  finish() {
    if (this.phase !== 'play') return;
    clearTimeout(this.endTimer);
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
  }

  ranking() {
    const now = Date.now();
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, name: p.name, crystals: p.crystals, right: p.right, wrong: p.wrong, streak: p.streak, bestStreak: p.bestStreak,
        robs: p.robs, robbed: p.robbed, stolen: p.stolen, lost: p.lost, ready: !!p.secret, shield: p.shieldUntil > now,
      }))
      .sort((a, b) => b.crystals - a.crystals);
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, {
        name: p.name, options: p.options, secret: p.secret, ...this.wallet(p), robs: p.robs, robbed: p.robbed, right: p.right,
        rank: ranking.findIndex(r => r.id === playerId) + 1, players: ranking.length,
      });
    }
    return state;
  }

  sendState(playerId) {
    const p = this.players.get(playerId);
    if (p) this.io.to(p.socketId).emit('kr-state', this.playerState(playerId));
  }

  // Het bord en de rangen hooguit vijf keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('kr-state', this.hostState());
      const ranking = this.ranking();
      ranking.forEach((r, i) => {
        const p = this.players.get(r.id);
        this.io.to(p.socketId).emit('kr-rank', { rank: i + 1, players: ranking.length, crystals: p.crystals });
      });
    }, 200);
  }

  broadcast() {
    this.io.to('host').emit('kr-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('kr-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('kr-state', this.base());
  }
}

module.exports = { Kristalroof, WORDS };
