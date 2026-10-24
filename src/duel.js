// Duel in de arena: één tegen één, met dezelfde vraag op hetzelfde moment. Wie eerst juist antwoordt,
// slaat toe en de ander verliest een hart. Fout geantwoord? Dan mag je bij die vraag niet meer.
// Alle duels van een ronde lopen tegelijk; de winnaars gaan door in een toernooischema tot er één kampioen is.
const logboek = require('./logboek');
const QUESTION_MS = 20000;
const RESULT_MS = 2600;       // na elke vraag even tonen wie toesloeg
const ROUND_BREAK_MS = 7000;  // tussen twee rondes
const START_MS = 4000;
const MAX_QUESTIONS = 12;      // daarna beslissen de harten (en bij gelijkstand de snelste juiste antwoorden)

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ronde 1 van 4 heet "Kwartfinale" als er nog 8 spelers over zijn, enzovoort.
function roundName(index, total) {
  const left = total - index;
  if (left === 1) return 'Finale';
  if (left === 2) return 'Halve finale';
  if (left === 3) return 'Kwartfinale';
  return `Ronde ${index + 1}`;
}

class Duel {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.roundTimer);
    clearTimeout(this.pending);
    if (this.rounds) for (const r of this.rounds) for (const m of r) clearTimeout(m.timer);
    this.pending = null;
    this.quiz = null;
    this.phase = 'idle'; // idle -> lobby -> duel -> einde
    this.players = new Map();
    this.hearts = 3;
    this.rounds = [];
    this.round = -1;
    this.nextAt = 0;
    this.champion = null;
    this.feed = [];
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, hearts) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.hearts = [2, 3, 4, 5].includes(hearts) ? hearts : 3;
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
    if (this.phase !== 'lobby') return { error: 'Het toernooi is al begonnen. Wacht op het volgende.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    this.players.set(playerId, { name: clean, socketId, right: 0, wrong: 0, wins: 0, out: null, times: [], seed: this.players.size });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    if (this.phase === 'lobby') {
      this.players.delete(playerId);
    } else {
      // Tijdens het toernooi: de speler geeft op, de tegenstander wint.
      const m = this.matchOf(playerId);
      if (m && !m.winner) this.win(m, m.a === playerId ? m.b : m.a, `${p.name} is verwijderd.`);
    }
    this.io.to(p.socketId).emit('du-kicked');
    this.broadcast();
  }

  // Het schema: aangevuld tot een macht van twee; wie geen tegenstander heeft, gaat vrij door.
  start() {
    if (this.phase !== 'lobby' || this.players.size < 2) return { error: 'Je hebt minstens 2 spelers nodig.' };
    const ids = shuffle([...this.players.keys()]);
    let size = 2;
    while (size < ids.length) size *= 2;
    const byes = size - ids.length;
    // Vrije doorgangen eerlijk verspreiden: elke vrije plaats komt tegenover een speler.
    const slots = [];
    let k = 0;
    for (let i = 0; i < size / 2; i++) {
      slots.push(ids[k++]);
      slots.push(i < byes ? null : ids[k++]);
    }
    const total = Math.log2(size);
    this.rounds = Array.from({ length: total }, (_, r) => Array.from({ length: size / 2 ** (r + 1) }, () => null));
    this.rounds[0] = [];
    for (let i = 0; i < slots.length; i += 2) this.rounds[0].push(this.newMatch(slots[i], slots[i + 1]));
    this.phase = 'duel';
    this.addFeed(`⚔️ Het toernooi begint met ${ids.length} ridders!`);
    this.startRound(0, START_MS);
    return { ok: true };
  }

  newMatch(a, b) {
    return {
      a, b, hp: { a: this.hearts, b: this.hearts }, winner: null, q: null, order: [], qAt: 0, until: 0,
      locked: {}, hit: null, number: 0, timer: null, note: '',
    };
  }

  startRound(index, delay) {
    this.round = index;
    this.nextAt = Date.now() + delay;
    for (const m of this.rounds[index]) {
      if (!m.b || !m.a) {
        // Vrije doorgang.
        m.winner = m.a || m.b;
        m.note = 'vrij';
        continue;
      }
      m.timer = setTimeout(() => this.ask(m), delay);
    }
    this.broadcast();
    this.checkRound();
  }

  matchOf(playerId) {
    if (this.round < 0) return null;
    return this.rounds[this.round].find(m => m && (m.a === playerId || m.b === playerId)) || null;
  }

  side(m, playerId) {
    return m.a === playerId ? 'a' : m.b === playerId ? 'b' : null;
  }

  ask(m) {
    if (m.winner || this.phase !== 'duel') return;
    if (m.number >= MAX_QUESTIONS) return this.win(m, this.leader(m), 'Na 12 vragen beslisten de harten.');
    if (m.order.length === 0) m.order = shuffle(this.quiz.questions.map((_, i) => i));
    m.q = m.order.shift();
    m.number++;
    m.qAt = Date.now();
    m.until = m.qAt + QUESTION_MS;
    m.locked = {};
    m.hit = null;
    clearTimeout(m.timer);
    m.timer = setTimeout(() => this.resolve(m, null), QUESTION_MS);
    this.sendMatch(m);
    this.changed();
  }

  answer(playerId, choice) {
    const m = this.matchOf(playerId);
    const s = m && this.side(m, playerId);
    if (!m || !s || m.winner || m.q === null || m.hit || Date.now() > m.until) return { error: 'Er staat geen vraag open.' };
    if (m.locked[s]) return { error: 'Je antwoordde al.' };
    const q = this.quiz.questions[m.q];
    const p = this.players.get(playerId);
    m.locked[s] = true;
    logboek.answer('Duel in de arena', this.quiz.title, p.name, q, choice === q.correct);
    if (choice === q.correct) {
      p.right++;
      p.times.push(Date.now() - m.qAt);
      this.resolve(m, s);
      return { correct: true, right: q.correct };
    }
    p.wrong++;
    const other = s === 'a' ? 'b' : 'a';
    if (m.locked[other]) this.resolve(m, null);
    else this.sendMatch(m);
    return { correct: false, right: null };
  }

  // Na een vraag: wie sloeg toe (of niemand), en dan de volgende vraag of het einde van het duel.
  resolve(m, striker) {
    if (m.hit || m.winner) return;
    clearTimeout(m.timer);
    const q = this.quiz.questions[m.q];
    m.hit = { by: striker, right: q.correct, at: Date.now() };
    if (striker) {
      m.hits = m.hits || {};
      m.hits[striker] = (m.hits[striker] || 0) + 1;
      const target = striker === 'a' ? 'b' : 'a';
      m.hp[target]--;
      if (m.hp[target] <= 0) {
        this.sendMatch(m);
        m.timer = setTimeout(() => this.win(m, m[striker]), RESULT_MS);
        this.changed();
        return;
      }
    }
    this.sendMatch(m);
    m.timer = setTimeout(() => this.ask(m), RESULT_MS);
    this.changed();
  }

  win(m, winnerId, note) {
    if (m.winner) return;
    clearTimeout(m.timer);
    m.winner = winnerId;
    m.q = null;
    if (note) m.note = note;
    const loserId = m.a === winnerId ? m.b : m.a;
    const w = this.players.get(winnerId);
    const l = this.players.get(loserId);
    if (w) w.wins++;
    if (l) l.out = this.round;
    const final = this.round === this.rounds.length - 1;
    if (w && l) this.addFeed(final ? `🏆 ${w.name} wint de finale tegen ${l.name}!` : `⚔️ ${w.name} wint van ${l.name}`);
    this.sendMatch(m);
    this.checkRound();
    this.changed();
  }

  checkRound() {
    if (this.phase !== 'duel') return;
    const round = this.rounds[this.round];
    if (!round.every(m => m.winner)) return;
    clearTimeout(this.roundTimer);
    if (this.round === this.rounds.length - 1) {
      this.champion = round[0].winner;
      this.roundTimer = setTimeout(() => this.finish(), 1500);
      return;
    }
    const next = this.round + 1;
    this.rounds[next] = [];
    for (let i = 0; i < round.length; i += 2) this.rounds[next].push(this.newMatch(round[i].winner, round[i + 1].winner));
    const name = roundName(next, this.rounds.length);
    this.roundTimer = setTimeout(() => {
      this.addFeed(`📣 ${name}!`);
      this.startRound(next, ROUND_BREAK_MS);
    }, RESULT_MS);
  }

  // Wie voorstaat: de meeste harten, dan de meeste juiste antwoorden in dit duel, dan het toeval.
  leader(m) {
    if (m.hp.a !== m.hp.b) return m.hp.a > m.hp.b ? m.a : m.b;
    const hits = s => (m.hits && m.hits[s]) || 0;
    if (hits('a') !== hits('b')) return hits('a') > hits('b') ? m.a : m.b;
    return Math.random() < .5 ? m.a : m.b;
  }

  // De leerkracht kan de lopende duels beslissen (bijvoorbeeld als een leerling weg is).
  decide() {
    if (this.phase !== 'duel') return;
    for (const m of this.rounds[this.round]) {
      if (m.winner) continue;
      this.win(m, this.leader(m), 'Beslist door de leerkracht.');
    }
  }

  finish() {
    if (this.phase !== 'duel') return;
    clearTimeout(this.roundTimer);
    for (const r of this.rounds) for (const m of r) if (m) clearTimeout(m.timer);
    if (!this.champion) {
      // Vroeg gestopt: de beste van de laatste ronde.
      const alive = this.rounds[this.round].flatMap(m => (m.winner ? [m.winner] : [m.a, m.b])).filter(Boolean);
      this.champion = alive.sort((x, y) => this.players.get(y).right - this.players.get(x).right)[0] || null;
    }
    this.phase = 'einde';
    const c = this.players.get(this.champion);
    if (c) this.addFeed(`👑 ${c.name} is de kampioen van de arena!`);
    try {
      this.resultsFile = this.onFinish(this);
    } catch (err) {
      console.error('Resultaten bewaren mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'duel') this.finish();
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  // Eindstand: kampioen, finalist, dan per ronde waarin je uitviel.
  ranking() {
    const total = this.rounds.length;
    const list = [...this.players.entries()].map(([id, p]) => {
      const avg = p.times.length ? p.times.reduce((a, b) => a + b, 0) / p.times.length : null;
      return {
        id, name: p.name, wins: p.wins, right: p.right, wrong: p.wrong, avg,
        reached: id === this.champion ? total : p.out === null ? (this.round < 0 ? 0 : this.round) : p.out,
        champion: id === this.champion,
      };
    });
    list.sort((a, b) => b.champion - a.champion || b.reached - a.reached || b.wins - a.wins || b.right - a.right || (a.avg || 1e9) - (b.avg || 1e9));
    let place = 0;
    list.forEach((r, i) => {
      if (i === 0 || r.reached !== list[i - 1].reached || r.champion !== list[i - 1].champion) place = i + 1;
      r.place = place;
      r.stage = r.champion ? 'Kampioen' : total ? roundName(Math.min(r.reached, total - 1), total) : '';
    });
    return list;
  }

  matchView(m) {
    if (!m) return null;
    const name = id => (id && this.players.get(id) ? this.players.get(id).name : null);
    return {
      a: m.a, b: m.b, an: name(m.a), bn: name(m.b), hp: m.hp, winner: m.winner, note: m.note, number: m.number,
      live: !m.winner && m.q !== null, hit: m.hit && { by: m.hit.by }, until: m.until,
    };
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, hearts: this.hearts,
      now: Date.now(), round: this.round, rounds: this.rounds.length, roundName: this.round >= 0 ? roundName(this.round, this.rounds.length) : '',
      nextAt: this.nextAt, champion: this.champion && this.players.get(this.champion) ? this.players.get(this.champion).name : null,
    };
  }

  hostState() {
    return {
      ...this.base(), feed: this.feed, resultsFile: this.resultsFile,
      players: [...this.players.entries()].map(([id, p]) => ({ id, name: p.name })),
      bracket: this.rounds.map((r, i) => ({ name: roundName(i, this.rounds.length), matches: r.map(m => this.matchView(m)) })),
      ranking: this.phase === 'einde' ? this.ranking() : null,
    };
  }

  // Wat één leerling ziet: zijn duel, met de vraag als die openstaat.
  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (!p) return state;
    Object.assign(state, { name: p.name, right: p.right, wins: p.wins, out: p.out, outName: p.out !== null ? roundName(p.out, this.rounds.length) : '' });
    const m = this.matchOf(playerId);
    if (m && this.phase === 'duel') {
      const s = this.side(m, playerId);
      const o = s === 'a' ? 'b' : 'a';
      const opp = m[o] && this.players.get(m[o]);
      state.match = {
        me: s, opponent: opp ? opp.name : null, hp: m.hp[s], opHp: m.hp[o], winner: m.winner ? (m.winner === playerId ? 'ik' : 'ander') : null,
        note: m.note, number: m.number, until: m.until, locked: !!m.locked[s], opLocked: !!m.locked[o],
        hit: m.hit ? { by: m.hit.by === s ? 'ik' : m.hit.by ? 'ander' : null, right: m.hit.right } : null,
      };
      if (m.q !== null && !m.winner) {
        const q = this.quiz.questions[m.q];
        state.match.question = q.question;
        state.match.answers = q.answers;
      }
    }
    if (this.phase === 'einde') {
      const r = this.ranking().find(x => x.id === playerId);
      Object.assign(state, { place: r.place, stage: r.stage, players: this.players.size });
    }
    return state;
  }

  sendMatch(m) {
    for (const id of [m.a, m.b]) {
      const p = id && this.players.get(id);
      if (p) this.io.to(p.socketId).emit('du-state', this.playerState(id));
    }
  }

  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('du-state', this.hostState());
    }, 150);
  }

  broadcast() {
    this.io.to('host').emit('du-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('du-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('du-state', this.base());
  }
}

module.exports = { Duel, roundName };
