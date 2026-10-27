// De Hofschilder: tekenen en raden. Om de beurt is één leerling de hofschilder en tekent een begrip uit de les
// op zijn eigen toestel; de anderen zien de tekening live verschijnen (ook op het bord) en raden op hun toestel.
// De begrippen komen uit een quiz (het juiste antwoord, met de vraag als hulp voor de tekenaar),
// uit de woorden van de week van het Runenraadsel, of uit een eigen lijst van de leerkracht.
// Wie raadt, wordt nagekeken met dezelfde regels als bij een woord typen: hoofdletters, accenten en "de/het/een" tellen niet.
// Elk raadsel komt in het logboek: juist geraden, of fout als je wel gokte maar het niet vond. De tekenaar: juist als iemand het raadde.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const logboek = require('./logboek');
const { saveCsv, pct } = require('./vragen');

const TICK_MS = 250;
const KIES_MS = 15000;
const TOON_MS = 7000;
const TIJDEN = [40, 60, 80, 100, 120];
const BEURTEN = [0, 5, 8, 10, 12, 15, 20]; // 0 = iedereen één keer
const MAX_PUNTEN = 40000; // hooguit zoveel tekenpunten per tekening
const W = 1000, H = 700; // het tekenvel, in eigen eenheden
const KLEUREN = 10, DIKTES = 4;
const COLORS = ['#ffc94a', '#4cc9ff', '#ff5d8f', '#7dff8a', '#c08bff', '#ff9a3c', '#5ee7d0', '#ff6b6b', '#9fb4ff', '#f4e285', '#e879f9', '#8bd450'];

// Zo vergelijken we een gok met het begrip.
const LIDWOORD = /^(de|het|een|der|den|'t|le|la|les|l'|un|une|des|the|a|an)\s+/;
function normaal(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s'-]/g, ' ').replace(/[-']/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(LIDWOORD, '');
}
const plat = text => normaal(text).replace(/\s/g, '');

function afstand(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// 'juist', 'bijna' of ''.
function vergelijk(gok, begrip) {
  const a = plat(gok), b = plat(begrip);
  if (!a) return '';
  if (a === b) return 'juist';
  // Meervoud of verkleinwoord van hetzelfde woord telt ook (ridders / ridder, kasteeltje / kasteel).
  if (b.length >= 4 && (a === b + 's' || a === b + 'en' || a === b + 'n' || a === b + 'tje' || a === b + 'je')) return 'juist';
  const d = afstand(a, b);
  if (b.length >= 4 && d <= (b.length >= 8 ? 2 : 1)) return 'bijna';
  if (b.length >= 5 && a.length >= 4 && b.includes(a)) return 'bijna';
  return '';
}

// Is een antwoord iets dat je kan tekenen en typen? Kort, met letters, niet enkel cijfers.
function tekenbaar(text) {
  const t = String(text || '').trim();
  if (t.length < 2 || t.length > 24) return false;
  if (t.split(/\s+/).length > 3) return false;
  if (!/[a-zA-ZÀ-ÿ]/.test(t)) return false;
  if (/^(ja|nee|waar|niet waar|juist|fout|alle(maal)?|geen)$/i.test(t)) return false;
  return /^[\p{L}\p{N}\s'’.-]+$/u.test(t);
}

function rand(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// De begrippen uit een quiz: het juiste antwoord, met de vraag als hulp.
function uitQuiz(quiz) {
  const out = [];
  const seen = new Set();
  for (const q of quiz.questions || []) {
    const w = String(q.answers[q.correct] || '').trim().replace(/[.!]$/, '');
    if (!tekenbaar(w) || seen.has(plat(w))) continue;
    seen.add(plat(w));
    out.push({ w, uitleg: q.question, doel: q.doel || '' });
  }
  return out;
}

// Eigen woorden: één per regel, eventueel "woord = uitleg".
function uitTekst(text) {
  const out = [];
  const fout = [];
  const seen = new Set();
  for (const regel of String(text || '').split(/\r?\n/)) {
    if (!regel.trim() || /^\s*(```|#)/.test(regel)) continue;
    const [kop, ...rest] = regel.split('=');
    const w = kop.trim().replace(/^[-*•\d.)\s]+/, '').trim();
    if (!tekenbaar(w)) { fout.push(kop.trim()); continue; }
    if (seen.has(plat(w))) continue;
    seen.add(plat(w));
    out.push({ w, uitleg: rest.join('=').trim().slice(0, 200), doel: '' });
  }
  if (fout.length) throw new Error(`Deze passen niet (hooguit 3 woorden of 24 tekens, met letters): ${fout.slice(0, 6).join(', ')}`);
  if (out.length > 200) throw new Error('Hooguit 200 woorden tegelijk.');
  return out;
}

// De opdracht voor de AI. In de prompt voor een chatbot blijft {thema} staan: de pagina vult het onderwerp zelf in.
function opdracht(thema) {
  const lj = require('./klas').read().leerjaar;
  return `Je helpt een leerkracht in Vlaanderen (${typeof lj === 'number' ? `${lj}e leerjaar` : 'lagere school'}). Gebruik Belgisch-Nederlands.
Maak 20 begrippen rond het onderwerp "${thema}" voor een teken- en raadspel: één leerling tekent het begrip, de klas raadt het.
Kies begrippen uit de leerstof die je goed kan TEKENEN (voorwerpen, dieren, plaatsen, gebouwen, handelingen, verschijnselen), geen abstracte woorden.
Elk begrip is 1 tot 3 woorden en hooguit 24 tekens, zonder cijfers. Schrijf het zoals een kind het zou typen (gewone schrijfwijze, kleine letters, geen lidwoord).
Geef bij elk begrip een korte, eenvoudige uitleg van hooguit 15 woorden, zonder het begrip zelf te gebruiken.`;
}

function chatPrompt() {
  return `${opdracht('{thema}')}
Antwoord met één codeblok, één begrip per regel, zonder nummers of kopjes, precies zo:
begrip = uitleg`;
}

// Begrippen rond een onderwerp, met AI: dingen die je kan tekenen, met een korte uitleg. Geeft tekst voor het vak "Eigen woorden".
async function maakBegrippen(thema, ai, aiJson) {
  thema = String(thema || '').trim().slice(0, 120);
  if (!thema) throw new Error('Typ eerst een onderwerp, bijvoorbeeld "de middeleeuwen" of "het menselijk lichaam".');
  const prompt = `${opdracht(thema)}
Antwoord enkel met JSON, met precies deze sleutels: {"begrippen":[{"begrip":"...","uitleg":"..."}]}`;
  const lijst = res => (Array.isArray(res) ? res : Object.values(res || {}).find(Array.isArray) || []).filter(r => r && typeof r === 'object');
  const veld = (r, re) => String(Object.entries(r).find(([k, v]) => re.test(k) && typeof v === 'string')?.[1] || '').trim();
  const items = lijst(await ai.generateQuiz(prompt, [], raw => aiJson.extract(raw, 'begrippenlijst', d => lijst(d).length > 0)));
  const regels = [];
  const seen = new Set();
  for (const r of items) {
    const w = veld(r, /begrip|woord|term|word/i).replace(/^(de|het|een)\s+/i, '');
    if (!tekenbaar(w) || seen.has(plat(w))) continue;
    seen.add(plat(w));
    regels.push(`${w} = ${veld(r, /uitleg|betek|omschr|mean|defin/i).replace(/=/g, ':').slice(0, 160)}`);
  }
  if (!regels.length) throw new Error('De AI gaf geen begrippen die passen. Probeer het nog eens of kies een ander onderwerp.');
  return regels.join('\n');
}

class Hofschilder {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearInterval(this.ticker);
    this.ticker = null;
    this.flush();
    this.log = [];
    this.phase = 'idle'; // idle -> lobby -> play -> einde
    this.players = new Map();
    this.title = '';
    this.bron = 'quiz';
    this.items = [];
    this.pool = [];
    this.seconden = 80;
    this.beurten = 8;
    this.turn = null; // de beurt van nu: { nr, stap: kies|teken|toon, painter, choices, item, ... }
    this.turns = 0;
    this.drawn = new Set(); // wie in deze ronde al tekende
    this.history = [];
    this.feed = [];
    this.changed = false;
    this.resultsFile = null;
    this.load_ = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load({ title, items, bron }, seconden, beurten) {
    this.reset();
    this.run++;
    this.title = title;
    this.bron = bron;
    this.items = items;
    this.pool = shuffle(items);
    this.seconden = TIJDEN.includes(seconden) ? seconden : 80;
    this.beurten = BEURTEN.includes(beurten) ? beurten : 8;
    this.load_ = { title, items, bron };
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
      n, name: clean, socketId, color: COLORS[n % COLORS.length],
      score: 0, geraden: 0, getekend: 0, gevonden: 0, // gevonden: hoeveel ridders jouw tekeningen raadden
      gokAt: 0, gokken: 0,
    });
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('hs-kicked');
    if (this.turn && this.turn.painter === playerId && this.turn.stap !== 'toon') this.endTurn('weg');
    this.broadcast();
  }

  online(p) {
    return !!(p && p.socketId && this.io.sockets.sockets.get(p.socketId));
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size < 2) return;
    this.phase = 'play';
    if (this.beurten === 0) this.limit = this.players.size;
    else this.limit = this.beurten;
    this.addFeed('🎨 Het penseel ligt klaar. De eerste hofschilder wordt gekozen…');
    this.ticker = setInterval(() => this.tick(Date.now()), TICK_MS);
    this.nextTurn();
  }

  // Wie tekent er nu? Eerst iedereen die nog niet tekende (en verbonden is), in willekeurige volgorde.
  pickPainter() {
    const free = [...this.players.entries()].filter(([id, p]) => this.online(p) && !this.drawn.has(id));
    if (!free.length) {
      this.drawn.clear();
      const all = [...this.players.entries()].filter(([, p]) => this.online(p));
      if (!all.length) return null;
      return shuffle(all)[0][0];
    }
    // Wie het minst tekende eerst, dan willekeurig.
    const min = Math.min(...free.map(([, p]) => p.getekend));
    return shuffle(free.filter(([, p]) => p.getekend === min))[0][0];
  }

  draw3() {
    const out = [];
    const used = new Set(this.history.map(h => plat(h.w)));
    for (let tries = 0; out.length < 3 && tries < 400; tries++) {
      if (!this.pool.length) this.pool = shuffle(this.items);
      const it = this.pool.shift();
      if (out.some(o => plat(o.w) === plat(it.w))) continue;
      if (used.has(plat(it.w)) && this.items.length > this.history.length + 3) continue;
      out.push(it);
    }
    return out;
  }

  nextTurn() {
    if (this.phase !== 'play') return;
    if (this.turns >= this.limit) return this.finish();
    const painter = this.pickPainter();
    if (!painter) return this.finish();
    this.turns++;
    this.drawn.add(painter);
    const now = Date.now();
    this.turn = {
      nr: this.turns, stap: 'kies', painter, choices: this.draw3(), item: null,
      endsAt: now + KIES_MS, startedAt: 0, strokes: [], points: 0,
      reveal: [], revealAt: [], hint: '', guessed: new Map(), tried: new Set(), first: null, why: '',
    };
    const p = this.players.get(painter);
    this.addFeed(`🖌️ ${p.name} is de hofschilder van beurt ${this.turns}.`, false);
    this.broadcast();
  }

  choose(playerId, i) {
    const t = this.turn;
    if (!t || t.stap !== 'kies' || t.painter !== playerId) return { error: 'Je kan nu niet kiezen.' };
    const item = t.choices[Number(i)];
    if (!item) return { error: 'Kies een van de woorden.' };
    this.startDrawing(item);
    return { ok: true };
  }

  startDrawing(item) {
    const t = this.turn;
    const now = Date.now();
    t.item = item;
    t.stap = 'teken';
    t.startedAt = now;
    t.endsAt = now + this.seconden * 1000;
    // Hulpletters: een paar letters komen vanzelf tevoorschijn, tussen 35% en 85% van de tijd.
    const letters = [...item.w].map((c, i) => (/[\p{L}\p{N}]/u.test(c) ? i : -1)).filter(i => i >= 0);
    const count = letters.length <= 3 ? 1 : Math.min(letters.length - 2, Math.round(letters.length * .4));
    const order = shuffle(letters, rand(now));
    t.reveal = order.slice(0, count);
    t.revealAt = t.reveal.map((_, k) => now + this.seconden * 1000 * (.35 + .5 * (count === 1 ? 0 : k / (count - 1))));
    t.shown = 0;
    t.hint = this.hint();
    this.broadcast();
  }

  // Het begrip met streepjes: letters die nog geheim zijn, worden _. Spaties en leestekens blijven.
  hint(all = false) {
    const t = this.turn;
    if (!t || !t.item) return '';
    const open = new Set(t.reveal.slice(0, t.shown || 0));
    return [...t.item.w].map((c, i) => (all || open.has(i) || !/[\p{L}\p{N}]/u.test(c) ? c : '_')).join('');
  }

  // Inkt van de hofschilder: stukjes van lijnen. Elk stuk: { i: lijn-id, c: kleur, s: dikte, p: [x, y, x, y, ...], e: klaar }.
  // c = -1 is de gom. We kijken alles na en sturen het door naar het bord en de anderen.
  ink(playerId, msg) {
    const t = this.turn;
    if (!t || t.stap !== 'teken' || t.painter !== playerId || !msg || typeof msg !== 'object') return;
    const out = [];
    if (msg.wis) {
      t.strokes = [];
      t.points = 0;
      out.push({ wis: true });
    }
    if (msg.undo !== undefined) {
      const i = t.strokes.findIndex(s => s.i === msg.undo);
      if (i >= 0) {
        t.points -= t.strokes[i].p.length / 2;
        t.strokes.splice(i, 1);
        out.push({ undo: msg.undo });
      }
    }
    for (const part of Array.isArray(msg.d) ? msg.d.slice(0, 20) : []) {
      if (!part || !Number.isInteger(part.i) || !Array.isArray(part.p)) continue;
      const pts = [];
      for (let k = 0; k + 1 < Math.min(part.p.length, 600); k += 2) {
        const x = Math.round(Number(part.p[k])), y = Math.round(Number(part.p[k + 1]));
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        pts.push(Math.max(-20, Math.min(W + 20, x)), Math.max(-20, Math.min(H + 20, y)));
      }
      if (t.points + pts.length / 2 > MAX_PUNTEN) break;
      let s = t.strokes.find(x => x.i === part.i);
      if (!s) {
        const c = Number.isInteger(part.c) && part.c >= -1 && part.c < KLEUREN ? part.c : 0;
        const size = Number.isInteger(part.s) && part.s >= 0 && part.s < DIKTES ? part.s : 1;
        if (!pts.length) continue;
        s = { i: part.i, c, s: size, p: [] };
        t.strokes.push(s);
      }
      s.p.push(...pts);
      t.points += pts.length / 2;
      if (part.e) s.e = 1;
      out.push({ i: s.i, c: s.c, s: s.s, p: pts, e: part.e ? 1 : 0 });
    }
    if (!out.length) return;
    const painter = this.players.get(playerId);
    this.io.to('host').emit('hs-ink', { nr: t.nr, d: out });
    for (const p of this.players.values()) if (p !== painter) this.io.to(p.socketId).emit('hs-ink', { nr: t.nr, d: out });
  }

  // Een gok van een leerling. Juist: punten voor jou en de tekenaar. Bijna: dat hoor jij alleen.
  guess(playerId, text) {
    const t = this.turn;
    const p = this.players.get(playerId);
    if (!p || !t || t.stap !== 'teken') return { error: 'Er valt nu niets te raden.' };
    if (t.painter === playerId) return { error: 'Jij tekent zelf!' };
    if (t.guessed.has(playerId)) return { error: 'Je hebt het al!' };
    const now = Date.now();
    if (now - p.gokAt < 600) return { error: 'Rustig aan: één gok per keer.' };
    p.gokAt = now;
    const gok = String(text || '').trim().slice(0, 40);
    if (!gok) return { error: 'Typ een woord.' };
    p.gokken++;
    t.tried.add(playerId);
    const res = vergelijk(gok, t.item.w);
    if (res !== 'juist') return { res };
    const left = Math.max(0, t.endsAt - now) / (this.seconden * 1000);
    const first = t.guessed.size === 0;
    const pts = 60 + Math.round(140 * left) + (first ? 40 : t.guessed.size === 1 ? 20 : 0);
    t.guessed.set(playerId, pts);
    if (first) t.first = playerId;
    p.score += pts;
    p.geraden++;
    this.log.push({ naam: p.name, spel: 'Hofschilder', bron: this.title, vraag: `Raden: ${t.item.w}`, doel: t.item.doel, juist: true });
    this.addFeed(`${first ? '⚡' : '✔'} ${p.name} heeft het${first ? ' als eerste' : ''}! +${pts}`, first);
    this.io.to('host').emit('hs-raak', { n: p.n, name: p.name, color: p.color, pts, first });
    const guessers = [...this.players.entries()].filter(([id, x]) => id !== t.painter && (this.online(x) || t.guessed.has(id)));
    if (guessers.every(([id]) => t.guessed.has(id))) this.endTurn('iedereen');
    else this.changed = true;
    return { res: 'juist', pts, word: t.item.w };
  }

  skip() {
    if (!this.turn || this.phase !== 'play') return;
    if (this.turn.stap === 'toon') return this.nextTurn();
    this.endTurn('overgeslagen');
  }

  wis() {
    const t = this.turn;
    if (!t || t.stap !== 'teken') return;
    t.strokes = [];
    t.points = 0;
    this.io.to('host').emit('hs-ink', { nr: t.nr, d: [{ wis: true }] });
    for (const p of this.players.values()) this.io.to(p.socketId).emit('hs-ink', { nr: t.nr, d: [{ wis: true }], leraar: true });
  }

  endTurn(why) {
    const t = this.turn;
    if (!t || t.stap === 'toon') return;
    const painter = this.players.get(t.painter);
    if (t.stap === 'kies' && why === 'tijd' && painter) {
      // Niet gekozen in de tijd: we nemen het eerste woord.
      return this.startDrawing(t.choices[0]);
    }
    t.why = why;
    const now = Date.now();
    if (t.item) {
      const got = t.guessed.size;
      if (painter) {
        const others = [...this.players.keys()].filter(id => id !== t.painter).length || 1;
        const pts = got ? 50 + Math.round(250 * Math.min(1, got / others)) : 0;
        painter.score += pts;
        painter.getekend++;
        painter.gevonden += got;
        t.painterPts = pts;
        if (why !== 'overgeslagen') this.log.push({ naam: painter.name, spel: 'Hofschilder', bron: this.title, vraag: `Tekenen: ${t.item.w}`, doel: t.item.doel, juist: got > 0 });
      }
      // Wie wel gokte maar het niet vond: dat begrip mag nog eens terugkomen.
      for (const id of t.tried) {
        if (t.guessed.has(id)) continue;
        const p = this.players.get(id);
        if (p && why !== 'overgeslagen') this.log.push({ naam: p.name, spel: 'Hofschilder', bron: this.title, vraag: `Raden: ${t.item.w}`, doel: t.item.doel, juist: false });
      }
      this.history.push({ w: t.item.w, painter: painter ? painter.name : '?', got });
      const word = t.item.w;
      if (why === 'iedereen') this.addFeed(`🏆 Iedereen raadde "${word}"!`);
      else if (why === 'overgeslagen') this.addFeed(`⏭ Overgeslagen. Het was "${word}".`);
      else if (why === 'weg') this.addFeed(`🚪 De hofschilder is weg. Het was "${word}".`);
      else this.addFeed(got ? `⌛ De tijd is om: ${got} ${got === 1 ? 'ridder raadde' : 'ridders raadden'} "${word}".` : `⌛ Niemand raadde "${word}".`);
    }
    t.stap = 'toon';
    t.hint = this.hint(true);
    t.endsAt = now + (t.item ? TOON_MS : 1500);
    this.flush();
    this.broadcast();
  }

  tick(now) {
    const t = this.turn;
    if (this.phase !== 'play' || !t) return;
    if (t.stap === 'teken') {
      let shown = 0;
      while (shown < t.revealAt.length && now >= t.revealAt[shown]) shown++;
      if (shown !== t.shown) {
        t.shown = shown;
        t.hint = this.hint();
        this.changed = true;
      }
      // De hofschilder is weg (niet meer verbonden): even wachten, dan de volgende.
      const painter = this.players.get(t.painter);
      if (!this.online(painter)) {
        t.gone = t.gone || now;
        if (now - t.gone > 8000) return this.endTurn('weg');
      } else t.gone = 0;
    }
    if (t.stap === 'kies') {
      const painter = this.players.get(t.painter);
      if (!this.online(painter) && now > t.endsAt - KIES_MS + 4000) {
        // Weg tijdens het kiezen: iemand anders mag.
        this.turns--;
        return this.nextTurn();
      }
    }
    if (now >= t.endsAt) {
      if (t.stap === 'toon') return this.nextTurn();
      return this.endTurn('tijd');
    }
    if (this.changed) {
      this.changed = false;
      this.sendTick();
    }
  }

  sendTick() {
    const ranking = this.ranking();
    const t = this.turn;
    const msg = { hint: t ? t.hint : '', got: t ? t.guessed.size : 0, ranking, feed: this.feed };
    this.io.to('host').emit('hs-tick', msg);
    for (const [id, p] of this.players) {
      this.io.to(p.socketId).emit('hs-tick', { hint: msg.hint, got: msg.got, me: this.me(id, p, ranking), top: ranking.slice(0, 5) });
    }
  }

  finish() {
    if (this.phase !== 'play') return;
    if (this.turn && this.turn.stap !== 'toon') this.endTurn('tijd');
    clearInterval(this.ticker);
    this.ticker = null;
    this.phase = 'einde';
    this.turn = null;
    this.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} wint de Hofschilder!`);
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

  flush() {
    if (!this.log || !this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }

  save() {
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.score, p.geraden, p.getekend, p.gevonden, p.gokken]);
    const woorden = this.history.map(h => `${h.w} (${h.painter}: ${h.got})`).join(', ');
    return saveCsv(`hofschilder-${this.title}`, [['Hofschilder', this.title], ['Beurten', this.history.length], ['Tijd per tekening', `${this.seconden} seconden`], ['Leerlingen', this.players.size], ['Getekend', woorden]],
      ['Rang', 'Naam', 'Punten', 'Geraden', 'Getekend', 'Eigen tekeningen geraden door', 'Gokken'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.changed = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color, score: p.score, geraden: p.geraden, getekend: p.getekend, gevonden: p.gevonden }))
      .sort((a, b) => b.score - a.score || b.geraden - a.geraden);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  // Wat iedereen van de beurt mag weten. Het woord pas als de beurt voorbij is.
  turnView() {
    const t = this.turn;
    if (!t) return null;
    const painter = this.players.get(t.painter);
    const v = {
      nr: t.nr, stap: t.stap, painter: painter ? { n: painter.n, name: painter.name, color: painter.color } : null,
      endsAt: t.endsAt, startedAt: t.startedAt, total: t.stap === 'kies' ? KIES_MS : t.stap === 'toon' ? TOON_MS : this.seconden * 1000,
      hint: t.hint, got: t.guessed.size, why: t.why,
    };
    if (t.stap === 'toon' && t.item) {
      v.word = t.item.w;
      v.uitleg = t.item.uitleg;
      v.painterPts = t.painterPts || 0;
      v.guessed = [...t.guessed.entries()].map(([id, pts]) => { const p = this.players.get(id); return p ? { name: p.name, color: p.color, pts, first: t.first === id } : null; }).filter(Boolean);
    }
    return v;
  }

  base() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.title, now: Date.now(),
      seconden: this.seconden, turns: this.turns, limit: this.limit || this.beurten, roster: this.roster(), turn: this.turnView(),
    };
  }

  hostState(ink = false) {
    const s = { ...this.base(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, history: this.history };
    if (ink && this.turn) s.ink = this.turn.strokes;
    return s;
  }

  me(id, p, ranking) {
    const r = ranking.findIndex(x => x.id === id);
    return { n: p.n, score: p.score, geraden: p.geraden, getekend: p.getekend, gevonden: p.gevonden, rank: r + 1, players: this.players.size };
  }

  playerState(playerId, ink = false) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (!p) return state;
    const t = this.turn;
    Object.assign(state, { name: p.name, me: this.me(playerId, p, this.ranking()) });
    if (t) {
      state.mine = t.painter === playerId;
      if (state.mine && t.stap === 'kies') state.choices = t.choices.map(c => ({ w: c.w, uitleg: c.uitleg }));
      if (state.mine && t.item) { state.word = t.item.w; state.uitleg = t.item.uitleg; }
      if (t.guessed.has(playerId)) { state.word = t.item.w; state.raak = t.guessed.get(playerId); }
      if (ink) state.ink = t.strokes;
    }
    if (this.phase === 'einde') state.top = this.ranking().slice(0, 3);
    return state;
  }

  broadcast() {
    this.io.to('host').emit('hs-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('hs-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('hs-state', this.base());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes, runen, ai, aiJson) {
    socket.emit('hs-state', this.hostState(true));
    socket.emit('hs-prompt', chatPrompt());
    socket.on('hs-ai', ({ thema } = {}, cb) => {
      maakBegrippen(thema, ai, aiJson)
        .then(text => cb && cb({ ok: true, text }))
        .catch(err => cb && cb({ error: err.message }));
    });
    socket.on('hs-load', handle(({ bron, file, text, seconden, beurten } = {}) => {
      const busy = busyWith('hofschilder');
      if (busy) throw busyError(busy);
      let set;
      if (bron === 'eigen') {
        const items = uitTekst(text);
        if (items.length < 3) throw new Error('Typ minstens 3 woorden, één per regel.');
        set = { title: 'Eigen woorden', items, bron };
      } else if (bron === 'week') {
        const l = runen.lijstView();
        let items = l.woorden.map(x => ({ w: x.w, uitleg: x.b || '', doel: l.doel || '' }));
        let title = 'Woorden van de week';
        if (items.length < 3) {
          // Nog geen eigen woorden van de week: de ingebouwde woordenschat van het Runenraadsel.
          const { PAGE, SCHILDKNAAP, RIDDER } = require('./runen-woorden');
          items = [...PAGE, ...SCHILDKNAAP, ...RIDDER].map(([w, b]) => ({ w, uitleg: b, doel: '' }));
          title = 'Woordenschat van het Runenraadsel';
        }
        set = { title, items, bron };
      } else {
        const quiz = quizzes.play(file);
        const items = uitQuiz(quiz);
        if (items.length < 3) throw new Error(`In "${quiz.title}" staan te weinig korte antwoorden om te tekenen (${items.length}). Kies een andere quiz, of typ zelf woorden.`);
        set = { title: quiz.title, items, bron: 'quiz' };
      }
      this.load(set, Number(seconden), Number(beurten));
      return { count: set.items.length };
    }));
    socket.on('hs-start', () => this.start());
    socket.on('hs-kick', id => this.kick(id));
    socket.on('hs-skip', () => this.skip());
    socket.on('hs-wis', () => this.wis());
    socket.on('hs-finish', () => this.finish());
    socket.on('hs-restart', () => this.load_ && this.load(this.load_, this.seconden, this.beurten));
    socket.on('hs-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  attachPlayer(socket, validId) {
    socket.emit('hs-state', this.base());
    socket.on('hs-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.hsId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('hs-state', this.playerState(playerId, true));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.hsId ? fn(socket.data.hsId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    on('hs-choose', (id, i) => this.choose(id, i));
    on('hs-guess', (id, text) => this.guess(id, text));
    socket.on('hs-ink', msg => { if (socket.data.hsId) this.ink(socket.data.hsId, msg); });
  }
}

module.exports = { Hofschilder, maakBegrippen, vergelijk, uitQuiz, uitTekst, normaal, W, H };
