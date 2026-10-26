// De Verrader: de ridders herstellen samen de kristalkern van de burcht door vragen juist te beantwoorden.
// Maar een of meer ridders zijn stiekem verraders. Zij beantwoorden ook vragen (om niet op te vallen),
// en met hun goede antwoorden laden ze een betovering op waarmee ze een ridder in een geest veranderen.
// Na elke betovering (of als iemand de hoorn blaast) komt de Ronde Tafel samen: praten, dan stemmen wie verbannen wordt.
// De ridders winnen als de kern hersteld is of alle verraders verbannen zijn. De verraders winnen als ze even talrijk
// worden als de ridders, of als de tijd op is.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const logboek = require('./logboek');
const quizzes = require('./quizzes');
const TALK_MS = { kort: 45000, normaal: 75000, lang: 120000 };
const VOTE_MS = 30000;
const RESULT_MS = 7000;
const REVEAL_MS = 6000;
const FOUND_MS = 4000;
const SPELL_COST = 3;          // goede antwoorden per betovering
const SPELL_COOLDOWN = 25000;
const HINT_EVERY = 4;          // elke vierde goede antwoord van een ridder: een tip
const PER_KNIGHT = { kort: 12, normaal: 20, lang: 30 };

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Verrader {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.timer);
    clearTimeout(this.endTimer);
    clearTimeout(this.pending);
    this.pending = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> rollen -> taken <-> tafel -> einde
    this.players = new Map();
    this.minutes = 15;
    this.traitorSetting = 'auto';
    this.length = 'normaal';
    this.talk = 'normaal';
    this.kern = 0;
    this.target = 0;
    this.startedAt = 0;
    this.endsAt = 0;
    this.meeting = null; // { step: 'gevonden'|'praten'|'stemmen'|'uitslag', until, reason, caller, victim, votes, result }
    this.feed = [];
    this.winner = null;
    this.why = '';
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, opts = {}) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 5, 8, 10, 12, 15, 20].includes(opts.minutes) ? opts.minutes : 15;
    this.traitorSetting = ['1', '2', '3'].includes(String(opts.traitors)) ? Number(opts.traitors) : 'auto';
    this.length = PER_KNIGHT[opts.length] ? opts.length : 'normaal';
    this.talk = TALK_MS[opts.talk] ? opts.talk : 'normaal';
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
    if (this.phase !== 'lobby') return { error: 'Het spel is al begonnen. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, {
      name: clean, socketId, color: this.players.size % 10, role: null, alive: true, fate: null,
      charge: 0, spellAt: 0, spells: 0, horn: true, vote: undefined, hints: [],
      right: 0, wrong: 0, question: null, order: [], last: null,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('vr-kicked');
    if (this.phase !== 'lobby') this.checkWin();
    this.broadcast();
  }

  traitorCount() {
    const n = this.players.size;
    if (this.traitorSetting !== 'auto') return Math.max(1, Math.min(this.traitorSetting, Math.floor((n - 1) / 2)));
    return n >= 16 ? 3 : n >= 8 ? 2 : 1;
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size < 3) return { error: 'Je hebt minstens 3 spelers nodig.' };
    const ids = shuffle([...this.players.keys()]);
    const traitors = new Set(ids.slice(0, this.traitorCount()));
    for (const [id, p] of this.players) p.role = traitors.has(id) ? 'verrader' : 'ridder';
    this.target = Math.max(10, (this.players.size - traitors.size) * PER_KNIGHT[this.length]);
    this.phase = 'rollen';
    this.startedAt = Date.now() + REVEAL_MS;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.timer = setTimeout(() => {
      this.phase = 'taken';
      this.endTimer = setTimeout(() => this.finish('verrader', 'De tijd is op en de kern is niet hersteld.'), this.endsAt - Date.now());
      for (const p of this.players.values()) p.spellAt = Date.now() + 20000;
      this.addFeed('⚔️ De ridders gaan aan het werk. Maar wie is de verrader?');
      this.broadcast();
    }, REVEAL_MS);
    this.broadcast();
    return { ok: true };
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'taken') return { error: 'Er zijn nu geen taken.' };
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

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'taken' || p.question === null) return { error: 'Er staat geen vraag open.' };
    const q = this.quiz.questions[p.question];
    p.last = p.question;
    p.question = null;
    const correct = choice === q.correct;
    logboek.answer('De Verrader', this.quiz.title, p.name, q, correct);
    let hint = null;
    if (correct) {
      p.right++;
      if (p.role === 'ridder') {
        this.kern = Math.min(this.target, this.kern + 1);
        if (p.alive && p.right % HINT_EVERY === 0) hint = this.hint(p);
      } else if (p.alive) {
        p.charge = Math.min(SPELL_COST, p.charge + 1);
      }
    } else {
      p.wrong++;
    }
    if (this.kern >= this.target) this.finish('ridder', 'De kristalkern is hersteld!');
    else this.changed();
    return { correct, right: q.correct, hint, ...this.mine(p) };
  }

  // Een tip voor een ridder: iemand die zeker te vertrouwen is.
  hint(p) {
    const known = new Set(p.hints);
    const pool = [...this.players.values()].filter(o => o !== p && o.role === 'ridder' && !known.has(o.name));
    if (!pool.length) return null;
    const o = pool[Math.floor(Math.random() * pool.length)];
    p.hints.push(o.name);
    return o.name;
  }

  // Een verrader betovert een ridder: die wordt een geest. Daarna komt de Ronde Tafel samen.
  spell(playerId, targetId) {
    const p = this.players.get(playerId);
    const t = this.players.get(targetId);
    if (!p || p.role !== 'verrader' || !p.alive || this.phase !== 'taken') return { error: 'Dat kan nu niet.' };
    if (p.charge < SPELL_COST) return { error: 'Je betovering is nog niet geladen.' };
    if (Date.now() < p.spellAt) return { error: 'Je betovering moet nog even rusten.' };
    if (!t || !t.alive || t.role === 'verrader') return { error: 'Die ridder kan je niet betoveren.' };
    p.charge = 0;
    p.spells++;
    p.spellAt = Date.now() + SPELL_COOLDOWN;
    t.alive = false;
    t.fate = 'betoverd';
    t.question = null;
    this.io.to(t.socketId).emit('vr-spelled');
    this.addFeed(`🌀 ${t.name} is betoverd!`);
    if (!this.checkWin()) this.meet('betovering', null, t.name);
    return { ok: true, ...this.mine(p) };
  }

  // De hoorn: elke levende speler mag één keer de Ronde Tafel samenroepen. De leerkracht kan het altijd.
  horn(playerId) {
    const p = playerId ? this.players.get(playerId) : null;
    if (this.phase !== 'taken') return { error: 'Dat kan nu niet.' };
    if (p) {
      if (!p.alive || !p.horn) return { error: 'Je hebt de hoorn al gebruikt.' };
      p.horn = false;
    }
    this.meet('hoorn', p ? p.name : 'De leerkracht', null);
    return { ok: true };
  }

  meet(reason, caller, victim) {
    clearTimeout(this.timer);
    this.phase = 'tafel';
    for (const p of this.players.values()) {
      p.vote = undefined;
      p.question = null;
    }
    this.meeting = { step: 'gevonden', reason, caller, victim, until: Date.now() + FOUND_MS, result: null };
    if (reason === 'hoorn') this.addFeed(`📯 ${caller} roept de Ronde Tafel samen!`);
    this.timer = setTimeout(() => this.talkStep(), FOUND_MS);
    this.broadcast();
  }

  talkStep() {
    this.meeting.step = 'praten';
    this.meeting.until = Date.now() + TALK_MS[this.talk];
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.voteStep(), TALK_MS[this.talk]);
    this.broadcast();
  }

  voteStep() {
    if (!this.meeting || this.meeting.step === 'stemmen' || this.meeting.step === 'uitslag') return;
    this.meeting.step = 'stemmen';
    this.meeting.until = Date.now() + VOTE_MS;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.count(), VOTE_MS);
    this.broadcast();
  }

  // De leerkracht kan het praten inkorten.
  skipTalk() {
    if (this.phase === 'tafel' && this.meeting && ['gevonden', 'praten'].includes(this.meeting.step)) this.voteStep();
  }

  vote(playerId, targetId) {
    const p = this.players.get(playerId);
    if (!p || !p.alive || this.phase !== 'tafel' || this.meeting.step !== 'stemmen') return { error: 'Je kan nu niet stemmen.' };
    if (targetId !== null && !(this.players.get(targetId) || {}).alive) return { error: 'Op die speler kan je niet stemmen.' };
    p.vote = targetId;
    const alive = [...this.players.values()].filter(o => o.alive);
    if (alive.every(o => o.vote !== undefined)) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.count(), 800);
    }
    this.changed();
    return { ok: true, vote: targetId };
  }

  count() {
    if (!this.meeting || this.meeting.step !== 'stemmen') return;
    const tally = new Map();
    let skip = 0;
    for (const p of this.players.values()) {
      if (!p.alive || p.vote === undefined) continue;
      if (p.vote === null) skip++;
      else tally.set(p.vote, (tally.get(p.vote) || 0) + 1);
    }
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    let result = { banished: null, tie: false, skip };
    if (sorted.length && sorted[0][1] > skip && !(sorted[1] && sorted[1][1] === sorted[0][1])) {
      const t = this.players.get(sorted[0][0]);
      t.alive = false;
      t.fate = 'verbannen';
      result = { banished: t.name, wasTraitor: t.role === 'verrader', skip };
      this.addFeed(t.role === 'verrader' ? `⚖️ ${t.name} is verbannen. Het was een verrader!` : `⚖️ ${t.name} is verbannen, maar was geen verrader.`);
    } else {
      result.tie = sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > skip;
      this.addFeed('⚖️ Niemand is verbannen.');
    }
    result.votes = Object.fromEntries([...tally.entries()].map(([id, n]) => [this.players.get(id).name, n]));
    result.traitorsLeft = [...this.players.values()].filter(p => p.alive && p.role === 'verrader').length;
    this.meeting.step = 'uitslag';
    this.meeting.result = result;
    this.meeting.until = Date.now() + RESULT_MS;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.checkWin()) return;
      this.phase = 'taken';
      this.meeting = null;
      for (const p of this.players.values()) p.spellAt = Math.max(p.spellAt, Date.now() + 15000);
      this.broadcast();
    }, RESULT_MS);
    this.broadcast();
  }

  checkWin() {
    if (this.phase === 'einde' || this.phase === 'lobby' || this.phase === 'idle') return false;
    const alive = [...this.players.values()].filter(p => p.alive);
    const traitors = alive.filter(p => p.role === 'verrader').length;
    const knights = alive.length - traitors;
    if (traitors === 0) { this.finish('ridder', 'Alle verraders zijn verbannen!'); return true; }
    if (traitors >= knights) { this.finish('verrader', 'De verraders zijn even talrijk als de ridders.'); return true; }
    return false;
  }

  finish(winner, why) {
    if (this.phase === 'einde' || this.phase === 'idle' || this.phase === 'lobby') return;
    clearTimeout(this.timer);
    clearTimeout(this.endTimer);
    this.phase = 'einde';
    this.winner = winner || 'verrader';
    this.why = why || 'Het spel is gestopt.';
    this.meeting = null;
    this.addFeed(this.winner === 'ridder' ? `🏆 De ridders winnen! ${this.why}` : `🎭 De verraders winnen! ${this.why}`);
    try {
      this.resultsFile = this.onFinish ? this.onFinish(this) : null;
    } catch (err) {
      console.error('Resultaten opslaan mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (!['idle', 'lobby', 'einde'].includes(this.phase)) this.finish('verrader', 'De leerkracht stopte het spel.');
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  mine(p) {
    return { charge: p.charge, need: SPELL_COST, ready: Math.max(0, p.spellAt - Date.now()), alive: p.alive, horn: p.horn };
  }

  // Wat iedereen mag zien: namen, levend of niet, en (pas op het einde) de rollen.
  roster() {
    const open = this.phase === 'einde';
    return [...this.players.entries()].map(([id, p]) => ({
      id, name: p.name, color: p.color, alive: p.alive, fate: p.fate,
      voted: this.meeting && this.meeting.step === 'stemmen' ? p.vote !== undefined : false,
      role: open || p.fate === 'verbannen' ? p.role : null,
      ...(open ? { right: p.right, wrong: p.wrong, spells: p.spells } : {}),
    })).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, minutes: this.minutes,
      now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, kern: this.kern, target: this.target,
      meeting: this.meeting, winner: this.winner, why: this.why,
      traitors: this.phase === 'lobby' ? null : [...this.players.values()].filter(p => p.role === 'verrader').length,
    };
  }

  hostState() {
    return {
      ...this.base(), roster: this.roster(), feed: this.feed, resultsFile: this.resultsFile,
      settings: { traitors: this.traitorSetting, length: this.length, talk: this.talk },
      votesIn: this.meeting && this.meeting.step === 'stemmen' ? [...this.players.values()].filter(p => p.alive && p.vote !== undefined).length : 0,
      voters: [...this.players.values()].filter(p => p.alive).length,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      const mates = p.role === 'verrader' ? [...this.players.values()].filter(o => o !== p && o.role === 'verrader').map(o => o.name) : [];
      Object.assign(state, {
        name: p.name, color: p.color, role: p.role, mates, hints: p.hints, vote: p.vote, roster: this.roster(), ...this.mine(p),
        right: p.right, fate: p.fate,
      });
    }
    return state;
  }

  // Het bord en de spelers hooguit vijf keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('vr-state', this.hostState());
      const msg = { kern: this.kern, target: this.target, roster: this.roster() };
      for (const p of this.players.values()) this.io.to(p.socketId).emit('vr-tick', msg);
    }, 200);
  }

  broadcast() {
    this.io.to('host').emit('vr-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('vr-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('vr-state', this.base());
  }
}

module.exports = { Verrader };
