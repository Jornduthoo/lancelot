// Titanenstrijd: twee tot vier ploegen besturen elk een reuzenmech-ridder (een titan) op het bord.
// Elke leerling zit in één deel van zijn titan: zwaardarm, schildarm, kern, schouderkanon of benen.
// Juiste antwoorden laden je deel op. Is het vol, dan druk je op je knop:
//   zwaard en kanon vallen een andere titan aan (eerst even uithalen, zodat de anderen kunnen reageren),
//   het schild blokt een zwaardslag, de benen ontwijken een kanonschot, de kern herstelt de titan.
// Een treffer kan een deel kapotmaken: dat deel doet niets meer tot zijn leerling een vraag juist heeft (of de kern helpt).
// Titanenslag: hebben alle delen van één titan binnen 10 seconden een juist antwoord, dan slaat de titan alle anderen.
// Een titan die valt, staat na 12 seconden weer op. Niemand valt af. De ploeg met de meeste punten wint.
// De ploegen worden bij de start verdeeld: evenveel leerlingen en een eerlijke mix van niveaus (Mijn klas).
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor, reeks } = require('./tempo');
const klas = require('./klas');
const doelen = require('./doelen');

const TICK_MS = 100;
const START_MS = 3000;
const PLOEGEN = [
  { naam: 'Rood', kleur: '#ff5a5f' },
  { naam: 'Blauw', kleur: '#4ca6ff' },
  { naam: 'Groen', kleur: '#4fdc84' },
  { naam: 'Goud', kleur: '#ffc94a' },
];
// In deze volgorde krijgen de leerlingen van een ploeg een deel: een kleine ploeg heeft zo eerst de belangrijkste delen.
const DELEN = ['zwaard', 'schild', 'kern', 'kanon', 'benen'];
const AANVAL = { zwaard: { ms: 1800, dmg: 9, breek: .35 }, kanon: { ms: 2200, dmg: 11, breek: .25 } };
const AFWEER_MS = 4500;   // zo lang staat een schild of ontwijking klaar
const HEAL = 12;
const DOWN_MS = 12000;
const OP_HP = 60;
const SLAG_MS = 10000;     // venster voor de Titanenslag
const SLAG_CD = 25000;
const SLAG_DMG = 16;
const ACTIEF_MS = 60000;   // wie zo lang niets deed, telt niet mee voor de Titanenslag
const PUNT = { blok: 6, fix: 4, val: 40, slag: 30 };

class Titanenstrijd {
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
    this.byN = new Map();
    this.minutes = 8;
    this.tempo = 'normaal';
    this.nPloegen = 2;
    this.titans = [];
    this.attacks = [];
    this.startedAt = 0;
    this.endsAt = 0;
    this.ev = [];
    this.nextN = 0;
    this.nextA = 0;
    this.feed = [];
    this.resultsFile = null;
    this.lastSend = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo, ploegen) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 5, 8, 10, 12].includes(minutes) ? minutes : 8;
    this.tempo = tempoOf(tempo);
    this.nPloegen = [2, 3, 4].includes(ploegen) ? ploegen : 2;
    this.vragen = new Vragen(quiz, 'Titanenstrijd', this.tempo);
    this.vragen.reeks = reeks(this.tempo);
    this.vak = doelen.hoofdvak(quiz.questions.map(q => q.doel));
    this.phase = 'lobby';
    this.broadcast();
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.gone = false;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'Het gevecht is voorbij. Wacht op het volgende spel.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    if (this.nextN > 250) return { error: 'De arena is vol.' };
    const p = {
      n: this.nextN++, name: clean, socketId, team: -1, rol: null, charge: 0, gone: false, seenAt: Date.now(),
      points: 0, dmg: 0, blok: 0, heal: 0, fix: 0, acts: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, question: null, order: [], last: null, waitUntil: 0,
    };
    this.players.set(playerId, p);
    this.byN.set(p.n, p);
    if (this.phase === 'play') this.placeLate(p);
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.byN.delete(p.n);
    this.io.to(p.socketId).emit('ti-kicked');
    this.broadcast();
  }

  // Hoeveel antwoorden nodig zijn voor een volle balk: normaal 2, rustig 1, intens 3, veel vragen 5.
  get need() {
    return Math.max(1, Math.round(2 / factor(this.tempo)));
  }

  // ---------- Ploegen ----------

  // Sterkere leerlingen (volgens hun niveau in Mijn klas) eerst, dan heen en terug verdelen: elke ploeg een eerlijke mix.
  verdeel() {
    const gewicht = { ridder: 3, schildknaap: 2, page: 1 };
    const list = [...this.players.values()].map(p => ({ p, w: gewicht[klas.niveauVoor(klas.match(p.name), this.vak)] || 2, r: Math.random() }));
    list.sort((a, b) => b.w - a.w || a.r - b.r);
    const k = this.nPloegen;
    list.forEach((x, i) => {
      const ronde = Math.floor(i / k), pos = i % k;
      x.p.team = ronde % 2 === 0 ? pos : k - 1 - pos;
    });
    for (let t = 0; t < k; t++) {
      const leden = list.filter(x => x.p.team === t).map(x => x.p).sort(() => Math.random() - .5);
      leden.forEach((p, i) => { p.rol = DELEN[i % DELEN.length]; });
    }
  }

  placeLate(p) {
    const count = t => [...this.players.values()].filter(o => o !== p && o.team === t).length;
    let best = 0;
    for (let t = 1; t < this.nPloegen; t++) if (count(t) < count(best)) best = t;
    p.team = best;
    const inRol = r => [...this.players.values()].filter(o => o !== p && o.team === best && o.rol === r).length;
    p.rol = DELEN.reduce((a, r) => (inRol(r) < inRol(a) ? r : a), DELEN[0]);
  }

  leden(t) {
    return [...this.players.values()].filter(p => p.team === t);
  }

  // Grote ploegen slaan even hard als kleine: elke actie telt in verhouding tot de grootte van de ploeg.
  mul(t) {
    const avg = Math.max(1, this.players.size / this.nPloegen);
    return Math.max(.35, Math.min(2.5, avg / Math.max(1, this.leden(t).length)));
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.verdeel();
    this.titans = PLOEGEN.slice(0, this.nPloegen).map((pl, id) => ({
      id, naam: pl.naam, kleur: pl.kleur, hp: 100, downUntil: 0, schild: 0, benen: 0, kapot: new Set(),
      points: 0, dmg: 0, vallen: 0, kos: 0, slagen: 0, slagAt: 0, lastRight: {},
    }));
    this.phase = 'play';
    this.startedAt = now + START_MS;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) p.seenAt = now;
    this.addFeed('🤖 De titanen ontwaken. Laad je deel op!');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // ---------- Vragen ----------

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het gevecht loopt niet.' };
    const now = Date.now();
    if (now < this.startedAt) return { error: 'Nog even.', wait: this.startedAt - now };
    const t = this.titans[p.team];
    if (p.charge >= 100 && !(t && t.kapot.has(p.rol))) return { error: 'Je deel is vol.', vol: true };
    p.seenAt = now;
    return this.vragen.next(p);
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    const now = Date.now();
    p.seenAt = now;
    const t = this.titans[p.team];
    let fixed = false;
    if (res.correct && t) {
      if (t.kapot.has(p.rol)) {
        // Een kapot deel herstel je met één juist antwoord.
        t.kapot.delete(p.rol);
        fixed = true;
        p.fix++;
        this.score(p, PUNT.fix);
        this.ev.push(['fix', t.id, p.rol, p.n]);
      } else p.charge = Math.min(100, p.charge + 100 / this.need);
      t.lastRight[p.rol] = now;
      this.checkSlag(t, now);
    }
    if (res.correct && (p.streak === 5 || p.streak === 10)) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`);
    const vol = p.charge >= 100 && !(t && t.kapot.has(p.rol));
    return { ...res, more: res.more && !vol, charge: Math.round(p.charge), vol, fixed, streak: p.streak };
  }

  // ---------- Acties ----------

  act(playerId, arg) {
    const p = this.players.get(playerId);
    const now = Date.now();
    if (!p || this.phase !== 'play' || now < this.startedAt) return { error: 'Het gevecht loopt niet.' };
    const t = this.titans[p.team];
    if (!t) return { error: 'Je hebt nog geen titan.' };
    if (t.downUntil > now) return { error: 'Je titan ligt neer. Even wachten.' };
    if (t.kapot.has(p.rol)) return { error: 'Je deel is kapot. Herstel het met een vraag.' };
    if (p.charge < 100) return { error: 'Je deel is nog niet vol.' };
    p.seenAt = now;
    const m = this.mul(t.id);
    if (p.rol === 'zwaard' || p.rol === 'kanon') {
      const doelwit = this.titans.filter(o => o.id !== t.id && o.downUntil <= now);
      if (!doelwit.length) return { error: 'Er staat geen titan recht om aan te vallen.' };
      const want = Number(arg && arg.doel);
      const doel = doelwit.find(o => o.id === want) || doelwit.reduce((a, o) => (o.hp < a.hp ? o : a));
      const a = AANVAL[p.rol];
      this.attacks.push({ id: ++this.nextA, kind: p.rol, from: t.id, to: doel.id, n: p.n, at: now + a.ms, dmg: a.dmg * m });
      this.ev.push(['wind', p.rol, t.id, doel.id, a.ms, p.n]);
      // De verdedigers krijgen een seintje op hun toestel, zodat ze op tijd hun schild heffen of opzij stappen.
      const afweer = p.rol === 'zwaard' ? 'schild' : 'benen';
      for (const o of this.leden(doel.id)) if (o.rol === afweer) this.io.to(o.socketId).emit('ti-alarm', { kind: p.rol, from: t.id, ms: a.ms });
    } else if (p.rol === 'schild' || p.rol === 'benen') {
      t[p.rol] = now + AFWEER_MS;
      t[p.rol + 'N'] = p.n;
      this.ev.push(['guard', t.id, p.rol, p.n]);
    } else if (p.rol === 'kern') {
      const fixRol = DELEN.find(r => t.kapot.has(r)) || null;
      if (fixRol) t.kapot.delete(fixRol);
      const healed = Math.min(100 - t.hp, HEAL * m);
      t.hp += healed;
      p.heal += healed;
      this.score(p, Math.round(healed) + (fixRol ? PUNT.fix : 0));
      this.ev.push(['heal', t.id, Math.round(healed), fixRol, p.n]);
    }
    p.charge = 0;
    p.acts++;
    return { ok: true };
  }

  resolve(a, now) {
    const from = this.titans[a.from], to = this.titans[a.to];
    const p = this.byN.get(a.n);
    if (!to || to.downUntil > now) { this.ev.push(['mis', a.kind, a.from, a.to]); return; }
    const afweer = a.kind === 'zwaard' ? 'schild' : 'benen';
    if (to[afweer] > now) {
      to[afweer] = 0;
      const d = this.byN.get(to[afweer + 'N']);
      if (d) { d.blok++; this.score(d, PUNT.blok); }
      this.ev.push(['blok', a.kind, a.from, a.to, d ? d.n : -1]);
      if (d) this.addFeed(a.kind === 'zwaard' ? `🛡️ ${d.name} (${to.naam}) blokt de slag van ${from.naam}` : `🦿 ${d.name} (${to.naam}) ontwijkt het kanon van ${from.naam}`);
      return;
    }
    let breek = null;
    if (Math.random() < AANVAL[a.kind].breek) {
      const heel = DELEN.filter(r => r !== 'kern' && !to.kapot.has(r) && this.leden(to.id).some(o => o.rol === r));
      if (heel.length) { breek = heel[Math.floor(Math.random() * heel.length)]; to.kapot.add(breek); }
    }
    this.damage(from, to, a.dmg, p, now);
    this.ev.push(['hit', a.kind, a.from, a.to, Math.round(a.dmg * 10), breek, a.n]);
    if (breek) for (const o of this.leden(to.id)) if (o.rol === breek) this.io.to(o.socketId).emit('ti-kapot', { by: from.id });
  }

  damage(from, to, dmg, p, now) {
    const real = Math.min(to.hp, dmg);
    to.hp = Math.max(0, to.hp - dmg);
    from.dmg += real;
    if (p) { p.dmg += real; this.score(p, Math.round(real * 10)); }
    else from.points += Math.round(real * 10);
    if (to.hp <= 0) {
      to.downUntil = now + DOWN_MS;
      to.vallen++;
      from.kos++;
      from.points += PUNT.val;
      to.schild = to.benen = 0;
      this.attacks = this.attacks.filter(x => x.from !== to.id);
      this.ev.push(['val', to.id, from.id]);
      this.addFeed(`💥 ${from.naam} haalt ${to.naam} neer!`);
    }
  }

  // Titanenslag: elk deel van de titan dat meespeelt, had net een juist antwoord.
  checkSlag(t, now) {
    if (now - t.slagAt < SLAG_CD || t.downUntil > now) return;
    const rollen = [...new Set(this.leden(t.id).filter(p => !p.gone && now - p.seenAt < ACTIEF_MS).map(p => p.rol))];
    if (rollen.length < 2) return;
    if (!rollen.every(r => now - (t.lastRight[r] || 0) <= SLAG_MS)) return;
    t.slagAt = now;
    t.slagen++;
    t.points += PUNT.slag;
    this.ev.push(['slag', t.id]);
    this.addFeed(`⚡ TITANENSLAG van ${t.naam}! Alle delen samen juist.`);
    const m = this.mul(t.id);
    for (const o of this.titans) if (o.id !== t.id && o.downUntil <= now) this.damage(t, o, SLAG_DMG * Math.min(1.5, m), null, now);
    for (const p of this.leden(t.id)) this.io.to(p.socketId).emit('ti-slag');
  }

  score(p, pts) {
    p.points += pts;
    const t = this.titans[p.team];
    if (t) t.points += pts;
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    for (const a of this.attacks.filter(x => x.at <= now)) this.resolve(a, now);
    this.attacks = this.attacks.filter(x => x.at > now);
    for (const t of this.titans) {
      if (t.downUntil && t.downUntil <= now) {
        t.downUntil = 0;
        t.hp = OP_HP;
        t.kapot.clear();
        this.ev.push(['op', t.id]);
      }
    }
    if (now - this.lastSend >= 200 || this.ev.length) this.send(now);
  }

  titansMsg(now) {
    return this.titans.map(t => ({
      id: t.id, hp: Math.round(t.hp * 10) / 10, points: t.points, down: Math.max(0, t.downUntil - now),
      schild: Math.max(0, t.schild - now), benen: Math.max(0, t.benen - now), kapot: [...t.kapot],
      slag: Math.max(0, SLAG_CD - (now - t.slagAt)),
      lit: DELEN.filter(r => now - (t.lastRight[r] || 0) <= SLAG_MS),
    }));
  }

  send(now) {
    this.lastSend = now;
    const msg = { titans: this.titansMsg(now), ev: this.ev };
    this.ev = [];
    this.io.to('host').emit('ti-tick', { ...msg, feed: this.feed, crew: this.crew() });
    for (const p of this.players.values()) this.io.to(p.socketId).emit('ti-tick', { ...msg, me: this.me(p, now) });
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.attacks = [];
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.teamRanking()[0];
    if (top) this.addFeed(`🏆 ${top.naam} wint de Titanenstrijd!`);
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
    const ploeg = t => (this.titans[t] || {}).naam || '';
    const rows = this.ranking().map((p, i) => [i + 1, p.name, ploeg(p.team), p.rol || '', p.points, p.dmg, p.blok, p.heal, p.fix, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    const head = [['Titanenstrijd', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size],
      ...this.teamRanking().map((t, i) => [`${i + 1}. ${t.naam}`, `${t.points} punten`])];
    return saveCsv(`titanenstrijd-${this.quiz.title}`, head,
      ['Rang', 'Naam', 'Ploeg', 'Deel', 'Punten', 'Schade', 'Geblokt', 'Hersteld (leven)', 'Delen gemaakt', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, team: p.team, rol: p.rol, points: p.points, dmg: Math.round(p.dmg * 10), blok: p.blok,
        heal: Math.round(p.heal), fix: p.fix, right: p.right, wrong: p.wrong, bestStreak: p.bestStreak,
      }))
      .sort((a, b) => b.points - a.points || b.right - a.right);
  }

  teamRanking() {
    return this.titans.map(t => ({ id: t.id, naam: t.naam, kleur: t.kleur, points: t.points, kos: t.kos, vallen: t.vallen, slagen: t.slagen }))
      .sort((a, b) => b.points - a.points || b.kos - a.kos);
  }

  // Wie in welk deel zit (voor de namen onder de titans op het bord).
  crew() {
    return [...this.players.values()].filter(p => p.team >= 0).map(p => [p.n, p.team, p.rol, Math.round(p.charge)]);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, team: p.team, rol: p.rol }));
  }

  base0() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo, minutes: this.minutes,
      ploegen: this.nPloegen, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
      teams: this.titans.length ? this.titans.map(t => ({ id: t.id, naam: t.naam, kleur: t.kleur })) : PLOEGEN.slice(0, this.nPloegen).map((pl, id) => ({ id, ...pl })),
      titans: this.titans.length ? this.titansMsg(Date.now()) : [],
    };
  }

  hostState() {
    return { ...this.base0(), ranking: this.ranking(), teamRanking: this.teamRanking(), feed: this.feed, crew: this.crew(), resultsFile: this.resultsFile };
  }

  me(p, now) {
    const t = this.titans[p.team];
    return {
      n: p.n, team: p.team, rol: p.rol, charge: Math.round(p.charge), need: this.need, kapot: Boolean(t && t.kapot.has(p.rol)),
      down: t ? Math.max(0, t.downUntil - now) : 0, points: p.points,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base0();
    if (p) {
      const rank = this.teamRanking();
      Object.assign(state, {
        name: p.name, me: this.me(p, Date.now()), right: p.right, wrong: p.wrong, points: p.points, dmg: Math.round(p.dmg * 10), blok: p.blok,
        heal: Math.round(p.heal), fix: p.fix, teamRank: rank.findIndex(t => t.id === p.team) + 1, teamRanking: rank,
      });
    }
    return state;
  }

  broadcast() {
    this.io.to('host').emit('ti-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('ti-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('ti-state', this.base0());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('ti-state', this.hostState());
    socket.on('ti-load', handle(({ file, minutes, tempo, ploegen } = {}) => {
      const busy = busyWith('titan');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo, Number(ploegen));
      return {};
    }));
    socket.on('ti-start', () => this.start());
    socket.on('ti-kick', id => this.kick(id));
    socket.on('ti-finish', () => this.finish());
    socket.on('ti-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo, this.nPloegen));
    socket.on('ti-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('ti-state', this.base0());
    socket.on('ti-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.tiId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('ti-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.tiId ? fn(socket.data.tiId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('ti-question', id => guard.question(id));
    on('ti-answer', (id, choice) => guard.answer(id, choice));
    on('ti-act', (id, arg) => this.act(id, arg));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    const p = socket.data.tiId && this.players.get(socket.data.tiId);
    if (p) p.gone = true;
  }
}

module.exports = { Titanenstrijd, DELEN, PLOEGEN };
