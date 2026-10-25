// Leraar-baas: de leerkracht is de eindbaas, een reuzenridder op het bord. De klas valt samen aan met goede antwoorden.
// Drie op rij = een ridderslag (driedubbel). De baas slaat terug: vanzelf af en toe, en met de knoppen van de leerkracht:
//   tegenaanval (iedereen even verdoofd, behalve wie een reeks heeft), moeilijke vraag (dezelfde vraag voor iedereen,
//   juist = driedubbel, fout = de klas verliest moed) en schildronde (breek samen het schild, anders geneest de baas).
// De klas wint als de baas op 0 staat. Is de moed van de klas op, of is de tijd om, dan wint de baas.
// De schade tonen we in punten: de volle levensbalk van de baas is 1000.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt later terug.
const logboek = require('./logboek');
const avatars = require('./avatars');
const { tempoOf, factor } = require('./tempo');
const quizzes = require('./quizzes');

const TICK_MS = 250;
const START_MS = 3000;
const WRONG_WAIT_MS = 3000;
const STUN_MS = 3500;
const PER_MINUTE = 6;        // goede antwoorden per leerling per minuut speeltijd om de baas te verslaan (normaal tempo, zonder ridderslagen)
const WRONG_MOED = 35;       // zoveel moed kosten alle foute antwoorden samen ongeveer in een heel spel
const RIGHT_MOED = 15;       // en zoveel geven alle goede antwoorden samen terug
const AUTO_MS = 40000;
const AUTO_ANGRY_MS = 25000;
const MOVES = {
  slag: { cd: 20000, moed: 6 },
  vraag: { cd: 45000, ms: 20000, moed: 14 },
  schild: { cd: 40000, ms: 15000, heal: 8, perPlayer: 1.5 },
};
const WEAK_MS = 8000;

// De eindbaas zoals de leerkracht hem samenstelt: een ridder (zoals die van de leerlingen) met extra's.
const EXTRAS = { harnas: 2, kroon: 2, mantel: 2, ogen: 2, troon: 2, ogenkleur: 4, aura: 4 };
function cleanBoss(boss) {
  if (!boss || typeof boss !== 'object') return null;
  const av = avatars.clean(boss.av || {});
  if (!av) return null;
  const extra = {};
  for (const [k, n] of Object.entries(EXTRAS)) {
    const v = Number((boss.extra || {})[k] ?? 1);
    extra[k] = Number.isInteger(v) && v >= 0 && v < n ? v : 0;
  }
  const text = (v, max, def) => String(v ?? def).trim().replace(/\s+/g, ' ').slice(0, max) || def;
  return { av, extra, naam: text(boss.naam, 24, 'De leerkracht'), titel: text(boss.titel, 32, 'de Onverslaanbare') };
}

class LeraarBaas {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.boss = null;
    try { this.boss = cleanBoss(require('./settings').read().teacherBoss); } catch {}
    this.reset();
  }

  static cleanBoss(boss) {
    return cleanBoss(boss);
  }

  reset() {
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.flushLog();
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.minutes = 8;
    this.tempo = 'normaal';
    this.auto = true;
    this.startedAt = 0;
    this.endsAt = 0;
    this.hp = 100;
    this.moed = 100;
    this.move = null;      // { kind: 'vraag' | 'schild', until, ... }
    this.cool = { slag: 0, vraag: 0, schild: 0 };
    this.weakUntil = 0;
    this.nextAuto = 0;
    this.angry = 0;        // 0, 1 (onder de helft), 2 (bijna verslagen)
    this.qStats = [];
    this.outcome = '';
    this.why = '';
    this.feed = [];
    this.log = [];
    this.lastFlush = 0;
    this.resultsFile = null;
    this.nextN = 0;
    this.bossQId = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo, auto) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [1, 2, 3, 5, 6, 8, 10, 12, 15].includes(minutes) ? minutes : 8;
    this.tempo = tempoOf(tempo);
    this.auto = auto !== false;
    this.qStats = quiz.questions.map(() => ({ right: 0, wrong: 0 }));
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
    if (this.phase === 'einde') return { error: 'Het gevecht is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, {
      n: this.nextN++, name: clean, socketId,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, dmg: 0, supers: 0, bossRight: 0,
      stunUntil: 0, question: null, order: [], last: null, waitUntil: 0, bossServed: 0, bossDone: 0,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('lb-kicked');
    this.broadcast();
  }

  setAuto(on) {
    this.auto = on;
    if (on) this.nextAuto = Date.now() + this.autoMs;
    this.broadcast();
  }

  get autoMs() {
    return this.angry ? AUTO_ANGRY_MS : AUTO_MS;
  }

  get size() {
    return Math.max(1, this.players.size);
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + START_MS;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.nextAuto = this.startedAt + AUTO_MS;
    this.addFeed(`👑 ${this.bossName} daagt de klas uit!`);
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish('tijd'), this.endsAt - now);
    this.broadcast();
  }

  get bossName() {
    return this.boss ? this.boss.naam : 'De leerkracht';
  }

  // ---------- Vragen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het gevecht loopt niet.' };
    if (now < this.startedAt) return { error: 'Nog even.', wait: this.startedAt - now };
    if (now < p.stunUntil) return { error: 'Verdoofd!', stun: p.stunUntil - now };
    // De moeilijke vraag van de baas gaat voor, voor iedereen dezelfde.
    const m = this.move;
    if (m && m.kind === 'vraag' && p.bossDone !== m.id) {
      p.bossServed = m.id;
      const q = this.quiz.questions[m.q];
      return { boss: true, question: q.question, answers: q.answers, left: m.until - now, streak: p.streak };
    }
    if (now < p.waitUntil) return { error: 'Even wachten.', wait: p.waitUntil - now };
    if (p.question === null) {
      if (p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers, streak: p.streak };
  }

  baseDamage() {
    return 100 / ((Math.max(PER_MINUTE, this.minutes * PER_MINUTE) / factor(this.tempo)) * this.size);
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play') return { error: 'Het gevecht loopt niet.' };
    const m = this.move;
    if (m && m.kind === 'vraag' && p.bossServed === m.id && p.bossDone !== m.id) return this.bossAnswer(p, choice, now);
    if (p.question === null) return { error: 'Er staat geen vraag open.' };
    const qi = p.question;
    const q = this.quiz.questions[qi];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: 'Leraar-baas', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    this.qStats[qi][correct ? 'right' : 'wrong']++;
    p.last = qi;
    p.question = null;
    if (!correct) {
      p.wrong++;
      p.streak = 0;
      p.waitUntil = now + WRONG_WAIT_MS;
      p.order.splice(Math.min(2, p.order.length), 0, qi);
      this.loseMoed(WRONG_MOED / (this.size * this.minutes * 2.5));
      return { correct, right: q.correct, wait: WRONG_WAIT_MS, streak: 0 };
    }
    p.right++;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    this.moed = Math.min(100, this.moed + RIGHT_MOED / (this.size * this.minutes * 5));
    const kind = p.streak % 3 === 0 ? 'super' : 'slag';
    if (kind === 'super') p.supers++;
    const shield = Boolean(this.move && this.move.kind === 'schild');
    const dmg = this.hit(p, kind, this.baseDamage() * (kind === 'super' ? 3 : 1), now);
    return { correct, right: q.correct, kind, dmg, streak: p.streak, shield, weak: now < this.weakUntil };
  }

  bossAnswer(p, choice, now) {
    const m = this.move;
    const q = this.quiz.questions[m.q];
    const correct = choice === q.correct;
    p.bossDone = m.id;
    this.log.push({ naam: p.name, spel: 'Leraar-baas', bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    this.qStats[m.q][correct ? 'right' : 'wrong']++;
    m.answers[correct ? 'right' : 'wrong']++;
    if (!correct) {
      p.streak = 0;
      p.wrong++;
      this.loseMoed(MOVES.vraag.moed / this.size);
      return { correct, boss: true, right: q.correct, wait: WRONG_WAIT_MS, streak: 0 };
    }
    p.right++;
    p.bossRight++;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.stunUntil = 0;
    const res = this.hit(p, 'boss', this.baseDamage() * 3, now);
    if (m.answers.right + m.answers.wrong >= this.players.size) this.endMove(now);
    return { correct, boss: true, right: q.correct, kind: 'boss', dmg: res, streak: p.streak };
  }

  // Een slag op de baas, of op zijn schild tijdens de schildronde.
  hit(p, kind, dmg, now) {
    const m = this.move;
    if (m && m.kind === 'schild') {
      m.hp = Math.max(0, m.hp - (kind === 'super' ? 3 : 1));
      this.io.to('host').emit('lb-hit', { n: p.n, name: p.name, kind, shield: true, dmg: 0, hp: this.hp, shieldHp: m.hp, shieldMax: m.max });
      if (m.hp <= 0) {
        this.move = null;
        this.weakUntil = now + WEAK_MS;
        this.addFeed(`🛡️💥 De klas breekt het schild! ${this.bossName} is kwetsbaar.`);
        this.io.to('host').emit('lb-event', { kind: 'schild-stuk' });
        this.broadcast();
      }
      return 0;
    }
    if (now < this.weakUntil) dmg *= 2;
    const real = Math.min(this.hp, dmg);
    this.hp = Math.max(0, this.hp - dmg);
    p.dmg += real;
    const out = Math.round(real * 10);
    this.io.to('host').emit('lb-hit', { n: p.n, name: p.name, kind, dmg: out, hp: this.hp, weak: now < this.weakUntil });
    const angry = this.hp <= 20 ? 2 : this.hp <= 50 ? 1 : 0;
    if (angry > this.angry) {
      this.angry = angry;
      this.addFeed(angry === 2 ? `😡 ${this.bossName} wankelt… nog één laatste duw!` : `😠 ${this.bossName} wordt kwaad en slaat vaker terug!`);
      this.io.to('host').emit('lb-event', { kind: angry === 2 ? 'bijna' : 'kwaad' });
    }
    if (this.hp <= 0) setImmediate(() => this.finish('klas'));
    return out;
  }

  loseMoed(x) {
    this.moed = Math.max(0, this.moed - x);
    if (this.moed <= 0 && this.phase === 'play') setImmediate(() => this.finish('moed'));
  }

  // ---------- De baas slaat terug ----------

  teacherMove(kind) {
    const now = Date.now();
    if (this.phase !== 'play' || now < this.startedAt) return { error: 'Het gevecht loopt niet.' };
    if (!MOVES[kind]) return { error: 'Onbekende aanval.' };
    if (now < this.cool[kind]) return { error: 'Nog even laden.', wait: this.cool[kind] - now };
    if (kind !== 'slag' && this.move) return { error: 'Er loopt al een aanval.' };
    this.cool[kind] = now + MOVES[kind].cd;
    if (kind === 'slag') this.strikeBack('slag', now);
    if (kind === 'vraag') this.hardQuestion(now);
    if (kind === 'schild') {
      const max = Math.max(3, Math.round(this.size * MOVES.schild.perPlayer));
      this.move = { kind: 'schild', until: now + MOVES.schild.ms, hp: max, max };
      this.addFeed(`🛡️ ${this.bossName} heft een schild op. Breek het samen!`);
    }
    this.broadcast();
    return { ok: true };
  }

  // Een klap: iedereen even verdoofd, behalve wie een reeks van minstens twee heeft (die pareert).
  strikeBack(kind, now) {
    const share = kind === 'auto' ? .35 : 1;
    const list = [...this.players.values()].filter(p => Math.random() < share);
    const stunned = [], parried = [];
    for (const p of list) {
      if (p.streak >= 2) { parried.push(p.n); continue; }
      p.stunUntil = now + STUN_MS;
      stunned.push(p.n);
      this.io.to(p.socketId).emit('lb-stun', { ms: STUN_MS, by: kind });
    }
    for (const p of this.players.values()) if (parried.includes(p.n)) this.io.to(p.socketId).emit('lb-parry');
    this.loseMoed(kind === 'auto' ? 3 : MOVES.slag.moed);
    this.io.to('host').emit('lb-attack', { kind, stunned, parried });
    this.addFeed(kind === 'auto' ? `⚡ ${this.bossName} slaat toe! ${stunned.length} verdoofd` : `⚔️ Tegenaanval! ${stunned.length} verdoofd, ${parried.length} gepareerd`);
  }

  // De vraag die tot nu toe het vaakst fout was (of nog niet gesteld), voor iedereen tegelijk.
  hardQuestion(now) {
    const score = s => (s.right + s.wrong ? s.right / (s.right + s.wrong) : .5) + Math.random() * .05;
    let best = 0;
    this.qStats.forEach((s, i) => { if (score(s) < score(this.qStats[best])) best = i; });
    this.move = { kind: 'vraag', id: ++this.bossQId, q: best, until: now + MOVES.vraag.ms, answers: { right: 0, wrong: 0 } };
    this.addFeed(`💀 ${this.bossName} stelt een moeilijke vraag!`);
    for (const p of this.players.values()) this.io.to(p.socketId).emit('lb-boss-q');
  }

  endMove(now) {
    const m = this.move;
    if (!m) return;
    this.move = null;
    if (m.kind === 'vraag') {
      // Wie niet antwoordde, telt als fout.
      let missed = 0;
      for (const p of this.players.values()) {
        if (p.bossDone === m.id) continue;
        p.bossDone = m.id;
        p.streak = 0;
        missed++;
      }
      if (missed) this.loseMoed((MOVES.vraag.moed / this.size) * missed);
      const q = this.quiz.questions[m.q];
      this.io.to('host').emit('lb-event', { kind: 'vraag-uit', right: m.answers.right, wrong: m.answers.wrong + missed, answer: q.answers[q.correct] });
      this.addFeed(`💀 Moeilijke vraag: ${m.answers.right} juist, ${m.answers.wrong + missed} fout`);
      for (const p of this.players.values()) this.io.to(p.socketId).emit('lb-boss-end', { right: q.correct });
    }
    if (m.kind === 'schild') {
      this.hp = Math.min(100, this.hp + MOVES.schild.heal);
      this.addFeed(`🛡️ Het schild hield stand. ${this.bossName} geneest!`);
      this.io.to('host').emit('lb-event', { kind: 'schild-heel' });
    }
    this.broadcast();
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    if (this.move && now >= this.move.until) this.endMove(now);
    if (this.auto && now >= this.nextAuto && now >= this.startedAt) {
      this.nextAuto = now + this.autoMs;
      if (!this.move) this.strikeBack('auto', now);
    }
    if (now - this.lastFlush > 5000) this.flushLog();
    const msg = this.live(now);
    this.io.to('host').emit('lb-tick', { ...msg, ranking: this.ranking().slice(0, 8), feed: this.feed });
    for (const p of this.players.values()) this.io.to(p.socketId).emit('lb-tick', msg);
  }

  live(now = Date.now()) {
    const m = this.move;
    return {
      now, hp: Math.round(this.hp * 10) / 10, moed: Math.round(this.moed * 10) / 10, weak: Math.max(0, this.weakUntil - now), angry: this.angry,
      move: m ? { kind: m.kind, left: Math.max(0, m.until - now), hp: m.hp, max: m.max, right: m.answers && m.answers.right, wrong: m.answers && m.answers.wrong } : null,
      cool: Object.fromEntries(Object.entries(this.cool).map(([k, v]) => [k, Math.max(0, v - now)])),
      stunned: [...this.players.values()].filter(p => now < p.stunUntil).map(p => p.n),
      auto: this.auto, nextAuto: this.auto ? Math.max(0, this.nextAuto - now) : 0,
    };
  }

  flushLog() {
    this.lastFlush = Date.now();
    if (!this.log || !this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }

  finish(why) {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.move = null;
    this.phase = 'einde';
    this.outcome = this.hp <= 0 ? 'klas' : 'baas';
    this.why = this.hp <= 0 ? 'klas' : why === 'moed' || this.moed <= 0 ? 'moed' : why === 'tijd' ? 'tijd' : 'gestopt';
    this.flushLog();
    this.addFeed(this.outcome === 'klas' ? `🏆 De klas verslaat ${this.bossName}!` : `👑 ${this.bossName} wint deze keer`);
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

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, dmg: Math.round(p.dmg * 10), supers: p.supers, bossRight: p.bossRight,
        right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.dmg - a.dmg || b.right - a.right);
  }

  base() {
    const m = this.move;
    const q = m && m.kind === 'vraag' ? this.quiz.questions[m.q] : null;
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, minutes: this.minutes,
      startedAt: this.startedAt, endsAt: this.endsAt, boss: this.boss, outcome: this.outcome, why: this.why,
      roster: [...this.players.values()].map(p => [p.n, p.name]),
      bossQ: q ? { question: q.question, answers: q.answers } : null,
      ...this.live(),
    };
  }

  hostState() {
    return { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    delete state.bossQ;
    if (p) {
      const ranking = this.ranking();
      Object.assign(state, {
        name: p.name, n: p.n, right: p.right, wrong: p.wrong, dmg: Math.round(p.dmg * 10), supers: p.supers, streak: p.streak,
        rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
      });
    }
    return state;
  }

  broadcast() {
    this.io.to('host').emit('lb-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('lb-state', this.playerState(id));
    }
    const pub = this.base();
    delete pub.bossQ;
    this.io.to('players').except(seen).emit('lb-state', pub);
  }
}

module.exports = { LeraarBaas, cleanBoss };
