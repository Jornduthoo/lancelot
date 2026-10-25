// Het Rijk: een spel dat weken doorloopt. Elke les verovert de klas in teams gebieden op een kaart.
// Een gebied onthoudt met welke leerstof het veroverd werd. In latere lessen komen vragen over die oudere
// leerstof terug: juist geeft dubbel, fout verzwakt een gebied dat met die leerstof veroverd werd.
// Zo wordt herhalen vanzelf deel van het spel. Elk rijk is een bestand in rijken/.
const fs = require('fs');
const path = require('path');
const logboek = require('./logboek');

const DIR = path.join(__dirname, '..', 'rijken');
const COLS = 11;
const ROWS = 7;
const WATER = 10;
const MAX_POWER = 5;
const NEUTRAL_COST = 2;  // zoveel aanvallen van één team om een vrij gebied te nemen
const OLD_SHARE = .35;   // deel van de vragen over oudere leerstof
const TEAMS = [
  { name: 'Rode Draken', color: '#ff4d6d' },
  { name: 'Blauwe Wolven', color: '#3d8bff' },
  { name: 'Gouden Leeuwen', color: '#ffb703' },
  { name: 'Groene Uilen', color: '#22c993' },
];
// Waar de burchten van de teams staan: hoeken die ver uit elkaar liggen.
const CASTLES = [[1, 1], [9, 5], [9, 1], [1, 5]];
const NAMES = [
  'Eikendal', 'Wolvenheuvel', 'Zilverbeek', 'Ravensburg', 'Dennenwoud', 'Kristalmeer', 'Valkenrots', 'Hazelhoek',
  'Mistvallei', 'Sterrenveld', 'Ijzerberg', 'Lindendaal', 'Zonnegaard', 'Donkerwoud', 'Hertenkamp', 'Stormkaap',
  'Goudmijn', 'Berkenrode', 'Uilenhof', 'Rozenbrug', 'Molenveld', 'Drakenpas', 'Heideland', 'Wilgenbeek',
  'Kasteelheuvel', 'Vossenhol', 'Maanmeer', 'Leeuwenpoort', 'Esdoornrijk', 'Zwanenvijver', 'Rotsenkust', 'Klaverveld',
  'Ridderdal', 'Neonpoort', 'Laserbos', 'Robotsmidse', 'Sterrenpoort', 'Ijsvlakte', 'Vuurberg', 'Windmolens',
  'Bijenkorf', 'Elfenbos', 'Smaragdheuvel', 'Hoefijzer', 'Kroonveld', 'Schildmuur', 'Zwaardrots', 'Torenkust',
  'Wachtpost', 'Lantaarnhoek', 'Koperdal', 'Glasberg', 'Parelstrand', 'Nevelrijk',
  'Appelgaard', 'Bronsveld', 'Cederwoud', 'Duinenrand', 'Echoberg', 'Fluitvallei', 'Gloeiwoud', 'Havikshoek',
  'Ivoortoren', 'Jaspisdal', 'Kometenveld', 'Lichtbaken', 'Magneetberg', 'Noorderlicht', 'Oeverland', 'Pixelpoort',
  'Quartsmeer', 'Regenwoud', 'Schemerdal', 'Tinnenmuur', 'Vonkenveld', 'Waterval', 'Zandloper', 'Bramenhof', 'Grafietkust',
];

const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// Zeshoeken in rijen; oneven rijen schuiven een halve plaats op.
function neighbours(index) {
  const c = index % COLS;
  const r = Math.floor(index / COLS);
  const odd = r % 2 === 1;
  const steps = odd
    ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  const out = [];
  for (const [dc, dr] of steps) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) out.push(nr * COLS + nc);
  }
  return out;
}

function makeMap(teamCount) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells = Array.from({ length: COLS * ROWS }, () => ({ land: true, name: '', castle: null, owner: null, power: 0, quiz: null, siege: {} }));
    const castles = CASTLES.slice(0, teamCount).map(([c, r]) => r * COLS + c);
    const safe = new Set(castles.flatMap(i => [i, ...neighbours(i)]));
    const free = shuffle([...cells.keys()].filter(i => !safe.has(i)));
    for (const i of free.slice(0, WATER)) cells[i].land = false;
    // Alle land moet bereikbaar zijn.
    const land = [...cells.keys()].filter(i => cells[i].land);
    const seen = new Set([castles[0]]);
    const todo = [castles[0]];
    while (todo.length) for (const n of neighbours(todo.pop())) if (cells[n].land && !seen.has(n)) { seen.add(n); todo.push(n); }
    if (seen.size !== land.length) continue;
    const names = shuffle([...NAMES]);
    land.forEach((i, k) => { cells[i].name = names[k % names.length]; });
    castles.forEach((i, t) => Object.assign(cells[i], { castle: t, owner: t, power: 3, name: `Burcht ${TEAMS[t].name.split(' ')[1]}` }));
    return cells;
  }
  throw new Error('Kon geen kaart maken.');
}

// ---------- Bestanden ----------

function slug(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'rijk';
}

function checkFile(file) {
  if (!/^[a-z0-9-]+\.json$/.test(String(file))) throw new Error('Ongeldig rijk.');
  return path.join(DIR, file);
}

function read(file) {
  const data = JSON.parse(fs.readFileSync(checkFile(file), 'utf8'));
  if (data.lancelot !== 'rijk' || !Array.isArray(data.cells) || !Array.isArray(data.teams)) throw new Error('Dit is geen rijk van LANcelot.');
  return data;
}

function write(file, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const target = checkFile(file);
  fs.writeFileSync(target + '.tmp', JSON.stringify(data));
  fs.renameSync(target + '.tmp', target);
}

function counts(data) {
  const n = data.teams.map(() => 0);
  for (const c of data.cells) if (c.owner !== null && c.owner !== undefined) n[c.owner]++;
  return n;
}

function summary(file, data) {
  return {
    file, name: data.name, created: data.created, teams: data.teams, counts: counts(data), lessons: data.lessons.length,
    last: data.lessons.length ? data.lessons[data.lessons.length - 1].at : null, members: Object.keys(data.members).length,
  };
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  const out = [];
  for (const file of fs.readdirSync(DIR)) {
    if (!/^[a-z0-9-]+\.json$/.test(file)) continue;
    try {
      out.push(summary(file, read(file)));
    } catch {
      // Een kapot bestand slaan we over.
    }
  }
  return out.sort((a, b) => (b.last || b.created).localeCompare(a.last || a.created));
}

function create(name, teamCount, teamNames) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!clean) throw new Error('Geef je rijk een naam.');
  const n = [2, 3, 4].includes(teamCount) ? teamCount : 2;
  let file = `${slug(clean)}.json`;
  for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${slug(clean)}-${i}.json`;
  const teams = TEAMS.slice(0, n).map((t, i) => ({
    name: String((teamNames && teamNames[i]) || '').trim().slice(0, 24) || t.name, color: t.color,
  }));
  const data = {
    lancelot: 'rijk', version: 1, name: clean, created: new Date().toISOString(), cols: COLS, rows: ROWS,
    teams, cells: makeMap(n), members: {}, quizzes: {}, lessons: [],
  };
  data.cells.forEach(c => { if (c.castle !== null) c.name = `Burcht van de ${teams[c.castle].name}`; });
  write(file, data);
  return file;
}

function remove(file) {
  fs.unlinkSync(checkFile(file));
}

// ---------- Het spel ----------

class Rijk {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.endTimer);
    clearInterval(this.saveTimer);
    clearTimeout(this.pending);
    this.pending = null;
    this.file = null;
    this.data = null;
    this.quiz = null;
    this.quizId = null;
    this.phase = 'idle'; // idle -> lobby -> spel -> einde
    this.players = new Map();
    this.minutes = 8;
    this.startedAt = 0;
    this.endsAt = 0;
    this.before = [];
    this.feed = [];
    this.recent = [];
    this.resultsFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(file, quiz, quizFile, minutes) {
    const data = read(file);
    this.reset();
    this.run++;
    this.file = file;
    this.data = data;
    this.quiz = quiz;
    this.quizId = String(quizFile || quiz.title).replace(/\.json$/, '');
    this.minutes = [1, 2, 3, 4, 6, 8, 10, 12, 15].includes(minutes) ? minutes : 8;
    this.phase = 'lobby';
    this.broadcast();
  }

  // Oudere leerstof: elke quiz uit vorige lessen behalve die van vandaag.
  olds() {
    return Object.keys(this.data.quizzes).filter(id => id !== this.quizId && this.data.quizzes[id].questions.length);
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nog geen spel gestart. Wacht op de leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      return { ok: true, name: existing.name };
    }
    if (this.phase === 'einde') return { error: 'De les is voorbij. Wacht op de volgende.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    // Wie al eens meespeelde, blijft in hetzelfde team. Nieuwe spelers gaan naar het kleinste team.
    const known = this.data.members[clean.toLowerCase()];
    let team = known ? known.team : null;
    if (team === null || team >= this.data.teams.length) {
      const sizes = this.data.teams.map(() => 0);
      for (const p of this.players.values()) sizes[p.team]++;
      team = sizes.indexOf(Math.min(...sizes));
    }
    this.data.members[clean.toLowerCase()] = { name: clean, team };
    this.players.set(playerId, {
      name: clean, socketId, team, points: 0, right: 0, wrong: 0, oldRight: 0, oldWrong: 0, actions: 0, conquered: 0,
      question: null, order: [], last: null, returning: !!known,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  // De leerkracht zet een leerling in een ander team (blijft zo bewaard).
  move(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase === 'einde') return;
    p.team = (p.team + 1) % this.data.teams.length;
    this.data.members[p.name.toLowerCase()] = { name: p.name, team: p.team };
    this.broadcast();
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('rk-kicked');
    this.broadcast();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    this.phase = 'spel';
    this.startedAt = Date.now() + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    this.before = counts(this.data);
    this.data.quizzes[this.quizId] = { title: this.quiz.title, questions: this.quiz.questions.map(q => ({ question: q.question, answers: q.answers, correct: q.correct, ...(q.doel ? { doel: q.doel } : {}) })) };
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - Date.now());
    this.saveTimer = setInterval(() => this.save(), 20000);
    const n = this.data.lessons.length + 1;
    this.addFeed(`📜 Les ${n} begint: ${this.quiz.title}`);
    if (this.olds().length) this.addFeed('🛡️ Vragen over oudere leerstof komen terug: juist = dubbel!');
    this.broadcast();
  }

  playing(p) {
    return p && this.phase === 'spel' && Date.now() >= this.startedAt;
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'Er wordt nu niet gespeeld.' };
    if (p.points > 0) return { act: p.points };
    if (!p.question) {
      const olds = this.olds();
      let id = this.quizId;
      if (olds.length && Math.random() < OLD_SHARE) {
        // Leerstof die meer gebieden draagt, komt vaker terug.
        const weight = olds.map(q => 1 + this.data.cells.filter(c => c.quiz === q && c.owner !== null).length);
        let pick = Math.random() * weight.reduce((a, b) => a + b, 0);
        id = olds.find((_, i) => (pick -= weight[i]) < 0) || olds[0];
      }
      const qs = this.data.quizzes[id].questions;
      let index;
      if (id === this.quizId) {
        if (p.order.length === 0) {
          p.order = shuffle(qs.map((_, i) => i));
          if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
        }
        index = p.order.shift();
        p.last = index;
      } else {
        index = Math.floor(Math.random() * qs.length);
      }
      p.question = { id, index };
    }
    const q = this.data.quizzes[p.question.id].questions[p.question.index];
    const old = p.question.id !== this.quizId ? this.data.quizzes[p.question.id].title : null;
    return { question: q.question, answers: q.answers, number: p.right + p.wrong + 1, old };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!this.playing(p) || !p.question) return { error: 'Er staat geen vraag open.' };
    const { id, index } = p.question;
    p.question = null;
    const q = this.data.quizzes[id].questions[index];
    const old = id !== this.quizId;
    const correct = choice === q.correct;
    logboek.answer('Het Rijk', this.quiz.title, p.name, q, correct);
    let gained = 0;
    let weakened = null;
    if (correct) {
      gained = old ? 2 : 1;
      p.points += gained;
      p.right++;
      if (old) p.oldRight++;
    } else {
      p.wrong++;
      if (old) {
        p.oldWrong++;
        // Fout op oude leerstof: een gebied dat met die leerstof veroverd werd, verzwakt.
        const own = this.data.cells.filter(c => c.owner === p.team && c.quiz === id && c.castle === null && c.power > 1);
        if (own.length) {
          const cell = own.sort((a, b) => b.power - a.power)[0];
          cell.power--;
          weakened = cell.name;
          this.mark(this.data.cells.indexOf(cell), 'zwak');
          this.changed();
        }
      }
    }
    return { correct, right: q.correct, gained, points: p.points, old, weakened };
  }

  // Wat een team met een punt kan doen: eigen gebied versterken of een buurgebied aanvallen.
  targets(team) {
    const out = {};
    const cells = this.data.cells;
    cells.forEach((c, i) => {
      if (!c.land) return;
      if (c.owner === team) {
        if (c.castle === null && c.power < MAX_POWER) out[i] = 'versterk';
        return;
      }
      if (c.castle !== null) return;
      if (neighbours(i).some(n => cells[n].owner === team)) out[i] = c.owner === null ? 'vrij' : 'vijand';
    });
    return out;
  }

  act(playerId, index) {
    const p = this.players.get(playerId);
    if (!this.playing(p)) return { error: 'Er wordt nu niet gespeeld.' };
    if (p.points <= 0) return { error: 'Beantwoord eerst een vraag.' };
    const kind = this.targets(p.team)[index];
    if (!kind) return { error: 'Dat gebied kan je nu niet kiezen.' };
    const cell = this.data.cells[index];
    const team = this.data.teams[p.team];
    let result;
    if (kind === 'versterk') {
      cell.power++;
      result = 'versterkt';
    } else if (kind === 'vrij') {
      cell.siege[p.team] = (cell.siege[p.team] || 0) + 1;
      result = 'beleg';
      if (cell.siege[p.team] >= NEUTRAL_COST) {
        Object.assign(cell, { owner: p.team, power: 1, quiz: this.quizId, siege: {} });
        result = 'veroverd';
        p.conquered++;
        this.addFeed(`🚩 ${team.name} veroveren ${cell.name}`);
      }
    } else {
      const enemy = this.data.teams[cell.owner];
      cell.power--;
      result = 'aanval';
      if (cell.power <= 0) {
        Object.assign(cell, { owner: p.team, power: 1, quiz: this.quizId, siege: {} });
        result = 'veroverd';
        p.conquered++;
        this.addFeed(`⚔️ ${team.name} nemen ${cell.name} in van ${enemy.name}`);
      }
    }
    p.points--;
    p.actions++;
    this.mark(index, result);
    this.changed();
    return { ok: true, result, points: p.points, name: cell.name };
  }

  mark(index, kind) {
    this.recent.unshift({ i: index, kind, at: Date.now() });
    this.recent.length = Math.min(this.recent.length, 30);
  }

  save() {
    if (!this.file || !this.data) return;
    try {
      write(this.file, this.data);
    } catch (err) {
      console.error('Rijk bewaren mislukt:', err.message);
    }
  }

  finish() {
    if (this.phase !== 'spel') return;
    clearTimeout(this.endTimer);
    clearInterval(this.saveTimer);
    this.phase = 'einde';
    for (const p of this.players.values()) {
      p.question = null;
      p.points = 0;
    }
    const after = counts(this.data);
    this.data.lessons.push({
      at: new Date().toISOString(), quiz: this.quizId, title: this.quiz.title, minutes: this.minutes, players: this.players.size,
      counts: after, gained: after.map((n, i) => n - (this.before[i] || 0)),
    });
    this.addFeed('🔔 De les is voorbij. Het rijk is bewaard.');
    this.save();
    try {
      this.resultsFile = this.onFinish(this);
    } catch (err) {
      console.error('Resultaten bewaren mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'spel') this.finish();
    const file = this.resultsFile;
    this.reset();
    this.broadcast();
    return file;
  }

  addFeed(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 10);
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, name: p.name, team: p.team, right: p.right, wrong: p.wrong, oldRight: p.oldRight, oldWrong: p.oldWrong,
        actions: p.actions, conquered: p.conquered, returning: p.returning,
      }))
      .sort((a, b) => b.actions - a.actions || b.right - a.right);
  }

  mapView() {
    return this.data.cells.map(c => ({ land: c.land, name: c.name, castle: c.castle, owner: c.owner, power: c.power, quiz: c.quiz, siege: c.siege }));
  }

  base() {
    const d = this.data;
    return {
      active: this.active, run: this.run, phase: this.phase, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt,
      title: this.quiz && this.quiz.title, rijk: d && d.name, cols: COLS, rows: ROWS, maxPower: MAX_POWER, neutralCost: NEUTRAL_COST,
      teams: d ? d.teams : [], counts: d ? counts(d) : [], lesson: d ? d.lessons.length + (this.phase === 'einde' ? 0 : 1) : 0,
      cells: d && this.phase !== 'idle' ? this.mapView() : [], hasOld: d ? this.olds().length > 0 : false,
      // Elke leerstof krijgt een nummer (in de volgorde waarin ze gespeeld werd); dat staat op de gebieden.
      stof: d ? Object.entries(d.quizzes).map(([id, q]) => ({ id, title: q.title })) : [],
    };
  }

  hostState() {
    const d = this.data;
    const titles = {};
    if (d) for (const [id, q] of Object.entries(d.quizzes)) titles[id] = q.title;
    return {
      ...this.base(), file: this.file, quizId: this.quizId, titles, ranking: this.ranking(), feed: this.feed, recent: this.recent,
      before: this.before, resultsFile: this.resultsFile, lessons: d ? d.lessons : [],
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (p) {
      Object.assign(state, {
        name: p.name, team: p.team, points: p.points, right: p.right, actions: p.actions, conquered: p.conquered,
        returning: p.returning, targets: this.phase === 'spel' ? this.targets(p.team) : {},
      });
    }
    return state;
  }

  // Bord en leerlingen hooguit vijf keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('rk-state', this.hostState());
      const msg = { cells: this.mapView(), counts: counts(this.data) };
      for (const p of this.players.values()) this.io.to(p.socketId).emit('rk-tick', { ...msg, targets: this.targets(p.team) });
    }, 200);
  }

  broadcast() {
    this.io.to('host').emit('rk-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('rk-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('rk-state', this.base());
  }
}

module.exports = { Rijk, list, create, remove, read, neighbours, DIR };
