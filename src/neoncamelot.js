// Neon-Camelot: een open sci-fi ridderstad waar de hele klas tegelijk rondrijdt.
// Iedereen rijdt vrij door dezelfde stad (van bovenaf) in een hoverkart, zweefmotor, raketkar of op een griffioen.
// Vragen sturen alles: is je batterij op, dan komt er een vraag (juist = vol + een nitro). Een missie (glitchdief vangen, race, koerier)
// start pas na een juist antwoord, en een brand blus je met juiste antwoorden. Onderweg vang je glitchgnomen en raap je kristallen.
// Met kristallen krijg je nieuwe voertuigen. Samen laat de klas de stad oplichten. Niemand valt uit, niemand kan een ander iets doen.
// Elke leerling rekent zijn eigen kart uit (geen vertraging bij het sturen); de server controleert de plek en beslist de rest.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const W = require('../public/js/nc-world');
const { Vragen, saveCsv, pct } = require('./vragen');
const { tempoOf, factor, reeks } = require('./tempo');

const TICK_MS = 33;
const SEND_MS = 50;
const BIJ_MARKER = 6;        // zo dicht moet je bij een missieplek staan
const BIJ_BRAND = 11;        // en zo dicht bij een brand om te blussen
const GNOOM_V = 6.5;
const DIEF_MS = 50000;      // zo lang heb je om de glitchdief te vangen
const VANG_S = 2;           // zo lang moet je vlak bij de dief blijven
const EVENT_MS = 65000;      // om de zoveel tijd gebeurt er iets in de stad

const leeg = (p, now) => now >= p.energieAt;

class NeonCamelot {
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
    this.minutes = 10;
    this.tempo = 'normaal';
    this.startedAt = 0;
    this.endsAt = 0;
    this.R = W.rng(Date.now() & 0xffffff);
    this.gnomen = [];
    this.brand = null;
    this.regen = null;
    this.nextEvent = 0;
    this.eventNr = 0;
    this.totaal = 0;
    this.licht = 0;
    this.ev = [];
    this.nextN = 0;
    this.feed = [];
    this.feedChanged = false;
    this.wereldDirty = true;
    this.resultsFile = null;
    this.lastSend = 0;
    this.lastRank = 0;
    this.lastTick = 0;
  }

  get active() {
    return this.phase !== 'idle';
  }

  load(quiz, minutes, tempo) {
    this.reset();
    this.run++;
    this.quiz = quiz;
    this.minutes = [3, 5, 8, 10, 12, 15, 20].includes(minutes) ? minutes : 10;
    this.tempo = tempoOf(tempo);
    this.vragen = new Vragen(quiz, 'Neon-Camelot', this.tempo);
    this.vragen.reeks = reeks(this.tempo);
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
    if (this.nextN > 250) return { error: 'De stad is vol.' };
    const plek = W.startPlek(this.R);
    const p = {
      n: this.nextN++, name: clean, socketId, color: W.COLORS[this.players.size % W.COLORS.length],
      x: plek.x, y: plek.y, a: plek.a, z: 0, veh: 0, energieAt: 0, moveAt: 0, nitro: 1, nitroTot: 0,
      kr: 0, missies: 0, gnomen: 0, geblust: 0, rapen: 0, stunts: 0, dieven: 0, stuntAt: 0, missie: null, dief: null, doel: null, mcool: 0, spuit: 0,
      right: 0, wrong: 0, streak: 0, bestStreak: 0, asking: false, question: null, order: [], last: null, waitUntil: 0, dirty: true,
    };
    this.players.set(playerId, p);
    this.byN.set(p.n, p);
    if (this.phase === 'play') {
      p.energieAt = Math.max(Date.now(), this.startedAt) + this.energieMs();
      this.gnomenAantal();
    }
    this.broadcast();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.byN.delete(p.n);
    this.io.to(p.socketId).emit('nc-kicked');
    this.broadcast();
  }

  energieMs() {
    return W.ENERGIE_S * 1000 * Math.min(1.4, factor(this.tempo));
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    const now = Date.now();
    this.phase = 'play';
    this.startedAt = now + 3000;
    this.endsAt = this.startedAt + this.minutes * 60000;
    for (const p of this.players.values()) {
      const plek = W.startPlek(this.R);
      Object.assign(p, plek, { z: 0, moveAt: 0, fix: true });
      p.energieAt = this.startedAt + this.energieMs();
      p.dirty = true;
    }
    this.gnomen = [];
    this.gnomenAantal();
    this.nextEvent = this.startedAt + 40000;
    this.lastTick = now;
    this.addFeed('🏰 Welkom in Neon-Camelot! Rij naar een ⭐ missie.');
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.endTimer = setTimeout(() => this.finish(), this.endsAt - now);
    this.broadcast();
  }

  // Ongeveer één gnoom per drie spelers, minstens drie.
  gnomenAantal() {
    const want = Math.max(3, Math.min(12, Math.ceil(this.players.size / 3) + 2));
    while (this.gnomen.length < want) {
      const plek = W.vrijePlek(this.R);
      this.gnomen.push({ i: this.gnomen.length, x: plek.x, y: plek.y, dx: 0, dy: 0, wend: 0, terugAt: 0, weg: false });
    }
  }

  // ---------- Besturing ----------

  // De leerling stuurt zijn plek. Klopt die niet (te ver in één keer, of in een muur), dan zetten we hem terug.
  move(playerId, m) {
    const p = this.players.get(playerId);
    if (!p || !m || this.phase !== 'play') return;
    const x = Number(m.x), y = Number(m.y), a = Number(m.a), z = Number(m.z) || 0;
    if (![x, y, a, z].every(Number.isFinite)) return;
    const now = Date.now();
    const dt = Math.min(1, Math.max(.05, (now - (p.moveAt || now)) / 1000));
    p.moveAt = now;
    const V = W.VOERTUIGEN[p.veh];
    const ver = Math.hypot(x - p.x, y - p.y);
    const binnen = V.vliegt ? x > 0 && y > 0 && x < W.L && y < W.L : W.kan(p.veh, x, y);
    if (p.asking || now < this.startedAt || ver > V.max * 1.6 * dt + 4 || !binnen) {
      if (ver > .5) this.io.to(p.socketId).emit('nc-fix', { x: p.x, y: p.y, a: p.a, veh: p.veh });
      return;
    }
    p.x = x; p.y = y; p.a = a; p.z = Math.max(0, Math.min(8, z));
    // Over een schans gesprongen: een stuntkristal (hoogstens om de 6 seconden)
    if (m.j && now - p.stuntAt > 6000 && W.SCHANSEN.some(s => Math.abs(s.x - x) < 14 && Math.abs(s.y - y) < 4)) {
      p.stuntAt = now;
      p.stunts++;
      this.geef(p, W.BELONING.stunt);
      if (p.stunts % 5 === 0) this.addFeed(`🛹 ${p.name} sprong al ${p.stunts} keer over een schans`, false);
    }
  }

  // Nitro: verdiend met juiste antwoorden, een paar seconden supersnel.
  nitro(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play' || p.asking) return { error: 'Nu niet.' };
    if (p.nitro <= 0) return { error: 'Geen nitro meer. Een juist antwoord geeft nitro.' };
    p.nitro--;
    p.nitroTot = Date.now() + W.NITRO_S * 1000;
    p.dirty = true;
    return { ok: true, nitro: p.nitro };
  }

  asking(playerId, on) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.asking = Boolean(on) && this.phase === 'play';
    if (!p.asking) p.doel = null;
    p.dirty = true;
  }

  open(p) {
    return W.VOERTUIGEN.filter(v => p.kr >= v.nodig).length;
  }

  voertuig(playerId, v) {
    const p = this.players.get(playerId);
    v = Number(v);
    if (!p || !Number.isInteger(v) || v < 0 || v >= W.VOERTUIGEN.length) return { error: 'Dat voertuig bestaat niet.' };
    if (p.kr < W.VOERTUIGEN[v].nodig) return { error: `Nog ${W.VOERTUIGEN[v].nodig - p.kr} kristallen voor de ${W.VOERTUIGEN[v].naam}.` };
    if (!W.VOERTUIGEN[v].vliegt && !W.kan(v, p.x, p.y)) return { error: 'Hier kan je niet landen. Vlieg eerst naar de straat.' };
    p.veh = v;
    p.dirty = true;
    return { ok: true };
  }

  // Wat de volgende vraag betekent: een missie starten of een brand blussen. Zonder doel is het een energievraag.
  doel(playerId, d) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const now = Date.now();
    if (d && d.soort === 'blus') {
      const b = this.brand;
      if (!b || Math.hypot(b.x - p.x, b.y - p.y) > BIJ_BRAND) return { error: 'Je bent te ver van de brand.' };
      p.doel = { soort: 'blus' };
      return { ok: true };
    }
    if (d && d.soort === 'missie') {
      const m = W.STAD.markers[Number(d.m)];
      if (!m) return { error: 'Die missie bestaat niet.' };
      if (p.missie) return { error: 'Je bent al met een missie bezig.' };
      if (now < p.mcool) return { error: 'Even wachten, dan mag je opnieuw.' };
      if (Math.hypot(m.x - p.x, m.y - p.y) > BIJ_MARKER + 2) return { error: 'Rij eerst tot bij de ⭐.' };
      p.doel = { soort: 'missie', m: Number(d.m) };
      return { ok: true };
    }
    p.doel = null;
    return { ok: true };
  }

  question(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Het spel loopt niet.' };
    const res = this.vragen.next(p);
    if (res.error) return res;
    p.asking = true;
    p.dirty = true;
    return { ...res, doel: p.doel ? p.doel.soort : 'energie' };
  }

  answer(playerId, choice) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'play') return { error: 'Er staat geen vraag open.' };
    const res = this.vragen.answer(p, choice);
    if (!res) return { error: 'Er staat geen vraag open.' };
    const now = Date.now();
    const doel = p.doel ? p.doel.soort : 'energie';
    const out = { ...res, doel, kr: 0 };
    if (doel === 'missie') {
      delete out.more;
      if (res.correct) {
        const m = W.STAD.markers[p.doel.m];
        this.startMissie(p, m, now);
        out.missie = p.missie.soort;
      } else p.mcool = now + 5000;
      p.doel = null;
    } else if (doel === 'blus') {
      delete out.more;
      const b = this.brand;
      if (res.correct && b) {
        b.hp--;
        b.helpers.add(p.n);
        p.spuit++;
        out.kr = this.geef(p, W.BELONING.blus);
        this.ev.push(['b', p.n]);
        this.wereldDirty = true;
        if (b.hp <= 0) this.geblust(now);
      }
      p.doel = null;
    } else if (res.correct) {
      p.energieAt = now + this.energieMs();
      out.kr = this.geef(p, W.BELONING.vraag);
      p.nitro = Math.min(W.NITRO_MAX, p.nitro + 1);
      out.nitro = p.nitro;
    } else p.energieAt = Math.max(p.energieAt, now + W.WRONG_S * 1000);
    if (res.correct && (p.streak === 5 || p.streak === 10)) this.addFeed(`🧠 ${p.name} heeft ${p.streak} antwoorden op rij goed`, false);
    p.dirty = true;
    out.totaal = p.kr;
    out.streak = p.streak;
    return out;
  }

  // Kristallen geven. Wie genoeg heeft, krijgt een nieuw voertuig. Samen lichten jullie de stad op.
  geef(p, n) {
    const voor = this.open(p);
    p.kr += n;
    this.totaal += n;
    const na = this.open(p);
    if (na > voor) {
      const v = W.VOERTUIGEN[na - 1];
      this.addFeed(`${v.icoon} ${p.name} heeft nu een ${v.naam}!`, false);
      this.ev.push(['v', p.n, na - 1]);
    }
    while (this.licht < W.LICHT.length && this.totaal >= W.LICHT[this.licht]) {
      this.licht++;
      this.addFeed(`✨ Neon-Camelot licht op! Stadslicht ${this.licht} van ${W.LICHT.length}`);
      this.ev.push(['l', this.licht]);
      this.wereldDirty = true;
    }
    p.dirty = true;
    return n;
  }

  startMissie(p, m, now) {
    if (m.soort === 'dief') {
      // De dief springt tevoorschijn en rijdt weg naar het volgende kruispunt.
      const j = Math.max(0, Math.min(4, Math.round((m.y / W.TILE - 12) / W.BLOK)));
      let ti = Math.floor((m.x / W.TILE - 12) / W.BLOK) + 1, ri = 1;
      if (ti > 4) { ti = 4; ri = -1; }
      if (ti < 0) ti = 0;
      p.dief = { x: m.x + 10 * ri, y: W.kruis(j), a: ri > 0 ? 0 : Math.PI, ti, tj: j, ri, rj: 0, vangst: 0, wacht: 2 };
      p.missie = { soort: 'dief', ends: now + DIEF_MS, duur: DIEF_MS };
    } else if (m.soort === 'race') {
      const ringen = W.parcours(this.R, m);
      let len = 0, px = p.x, py = p.y;
      for (const [x, y] of ringen) { len += Math.hypot(x - px, y - py); px = x; py = y; }
      const duur = Math.round((len / 6.5 + 15) * 1000);
      p.missie = { soort: 'race', ringen, ri: 0, ends: now + duur, duur };
    } else {
      const kandidaten = W.STAD.markers.filter(o => o !== m && Math.hypot(o.x - p.x, o.y - p.y) > 70);
      const t = kandidaten[Math.floor(this.R() * kandidaten.length)] || W.STAD.markers[0];
      const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
      const duur = Math.round((d / 5 + 15) * 1000);
      p.missie = { soort: 'koerier', tx: t.x, ty: t.y + 3, naar: W.WIJK[t.wijk], ends: now + duur, duur };
    }
    p.dirty = true;
  }

  missieKlaar(p, now) {
    const m = p.missie;
    let n = m.soort === 'race' ? W.BELONING.race : m.soort === 'dief' ? W.BELONING.dief : W.BELONING.koerier;
    if (m.soort === 'dief') { p.dieven++; p.dief = null; }
    if (m.soort === 'koerier' && m.ends - now > m.duur / 2) n += W.BELONING.snel;
    this.geef(p, n);
    p.missies++;
    this.ev.push(['m', p.n, m.soort === 'race' ? 1 : m.soort === 'dief' ? 2 : 0, n]);
    if (m.soort === 'dief' && p.dieven % 2 === 1) this.addFeed(`🦹 ${p.name} ving een glitchdief!`, false);
    if (p.missies % 3 === 0) this.addFeed(`⭐ ${p.name} heeft al ${p.missies} missies gedaan`, false);
    p.missie = null;
    p.mcool = now + 1500;
    p.dirty = true;
  }

  geblust(now) {
    const b = this.brand;
    const wie = [...b.helpers].map(n => this.byN.get(n)).filter(Boolean);
    for (const p of wie) { this.geef(p, W.BELONING.geblust); p.geblust++; }
    this.addFeed(`💧 De brand in ${b.wijk} is geblust door ${wie.map(p => p.name).slice(0, 4).join(', ')}${wie.length > 4 ? ' en anderen' : ''}!`);
    this.ev.push(['g', b.o]);
    this.brand = null;
    this.wereldDirty = true;
    this.nextEvent = Math.min(this.nextEvent, now + 30000);
  }

  // ---------- De stad leeft ----------

  event(now) {
    this.eventNr++;
    if (this.eventNr % 2 === 1) {
      const huizen = W.STAD.gebouwen.filter(o => o.soort === 'huis');
      const o = huizen[Math.floor(this.R() * huizen.length)];
      const max = 2 + Math.ceil(this.players.size / 5);
      this.brand = { o: o.i, x: o.x, y: o.y, hp: max, max, until: now + 75000, helpers: new Set(), wijk: W.WIJK[W.wijkOp(o.x, o.y)] };
      this.addFeed(`🔥 Brand in ${this.brand.wijk}! Rij erheen en blus met juiste antwoorden.`);
    } else {
      const blokken = [];
      W.PLAN.forEach((rij, by) => [...rij].forEach((w, bx) => { if (w !== 'h' && w !== 'c') blokken.push([bx, by, w]); }));
      const [bx, by, w] = blokken[Math.floor(this.R() * blokken.length)];
      const stukjes = [];
      for (let i = 0; i < 18 + this.players.size; i++) { const pl = W.vrijePlek(this.R, [bx, by]); stukjes.push([i, Math.round(pl.x * 10) / 10, Math.round(pl.y * 10) / 10]); }
      this.regen = { until: now + 30000, stukjes, wijk: W.WIJK[w] };
      this.addFeed(`💎 Kristalregen in ${W.WIJK[w]}! Snel, raap ze op.`);
    }
    this.wereldDirty = true;
  }

  tick() {
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (now >= this.startedAt) {
      for (const p of this.players.values()) this.volg(p, dt, now);
      this.gnomenTick(dt, now);
      if (this.brand && now > this.brand.until) {
        this.addFeed(`🚒 De stadswacht bluste de brand in ${this.brand.wijk}.`, false);
        this.ev.push(['g', this.brand.o]);
        this.brand = null;
        this.wereldDirty = true;
      }
      if (this.regen && (now > this.regen.until || !this.regen.stukjes.length)) { this.regen = null; this.wereldDirty = true; }
      if (now >= this.nextEvent && !this.brand && !this.regen) { this.nextEvent = now + EVENT_MS; this.event(now); }
    }
    if (now - this.lastSend >= SEND_MS) {
      this.lastSend = now;
      this.send(now);
    }
  }

  // Wat er gebeurt waar je rijdt: missies, de dief, kristallen.
  volg(p, dt, now) {
    if (p.missie && now > p.missie.ends) {
      this.ev.push(['x', p.n, p.missie.soort]);
      p.missie = null;
      p.dief = null;
      p.dirty = true;
    }
    const m = p.missie;
    if (m && m.soort === 'dief' && p.dief && !p.asking) {
      const d = p.dief;
      if (d.wacht > 0) d.wacht -= dt; // even stilstaan: zo zie je hem eerst (vangen kan dan nog niet)
      else {
        W.diefStap(d, p, dt, this.R);
        const ver = Math.hypot(d.x - p.x, d.y - p.y);
        if (ver < 7) d.vangst += dt / VANG_S;
        else if (ver > 14) d.vangst = Math.max(0, d.vangst - dt * .12);
        if (d.vangst >= 1) this.missieKlaar(p, now);
      }
    } else if (m && m.soort === 'race') {
      const [rx, ry] = m.ringen[m.ri];
      if (Math.hypot(rx - p.x, ry - p.y) < 4.6) {
        m.ri++;
        this.ev.push(['r', p.n, m.ri]);
        p.dirty = true;
        if (m.ri >= m.ringen.length) this.missieKlaar(p, now);
      }
    } else if (m && Math.hypot(m.tx - p.x, m.ty - p.y) < 5) this.missieKlaar(p, now);
    // Kristallen rapen
    if (this.regen) {
      const s = this.regen.stukjes;
      for (let i = s.length - 1; i >= 0; i--) {
        if (Math.abs(s[i][1] - p.x) < 2.4 && Math.abs(s[i][2] - p.y) < 2.4) {
          this.ev.push(['c', s[i][0], p.n]);
          s.splice(i, 1);
          p.rapen++;
          this.geef(p, W.BELONING.regen);
        }
      }
    }
  }

  // Gnomen dwalen rond en lopen weg van wie dichtbij komt. Raak je er een, dan heb je hem.
  gnomenTick(dt, now) {
    const actief = [...this.players.values()].filter(p => !p.asking);
    for (const g of this.gnomen) {
      if (g.weg) {
        if (now >= g.terugAt) { Object.assign(g, W.vrijePlek(this.R), { weg: false }); }
        continue;
      }
      let near = null, nd = 14;
      for (const p of actief) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < nd) { nd = d; near = p; }
      }
      if (near && nd < 2.6) {
        g.weg = true;
        g.terugAt = now + 9000;
        near.gnomen++;
        this.geef(near, W.BELONING.gnoom);
        this.ev.push(['k', g.i, near.n]);
        if (near.gnomen % 5 === 0) this.addFeed(`🧙 ${near.name} ving al ${near.gnomen} glitchgnomen`, false);
        continue;
      }
      let sp = 2.2;
      if (near) {
        const a = Math.atan2(g.y - near.y, g.x - near.x) + Math.sin(now / 400 + g.i) * .5;
        g.dx = Math.cos(a); g.dy = Math.sin(a);
        sp = GNOOM_V;
      } else if (now > g.wend) {
        const a = this.R() * Math.PI * 2;
        g.dx = Math.cos(a); g.dy = Math.sin(a);
        g.wend = now + 1500 + this.R() * 2500;
      }
      const nx = g.x + g.dx * sp * dt, ny = g.y + g.dy * sp * dt;
      if (W.kan(0, nx, ny)) { g.x = nx; g.y = ny; }
      else if (W.kan(0, nx, g.y)) { g.x = nx; g.dy = -g.dy; }
      else if (W.kan(0, g.x, ny)) { g.y = ny; g.dx = -g.dx; }
      else { g.dx = -g.dx; g.dy = -g.dy; g.wend = now + 600; }
    }
  }

  finish() {
    if (this.phase !== 'play') return;
    clearInterval(this.ticker);
    clearTimeout(this.endTimer);
    this.ticker = null;
    this.phase = 'einde';
    this.vragen.flush();
    const top = this.ranking()[0];
    if (top) this.addFeed(`🏆 ${top.name} heeft de meeste kristallen!`);
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
    const rows = this.ranking().map((p, i) => [i + 1, p.name, p.kr, p.missies, p.geblust, p.gnomen, p.rapen, W.VOERTUIGEN[p.open - 1].naam, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)]);
    return saveCsv(`neoncamelot-${this.quiz.title}`, [['Neon-Camelot', this.quiz.title], ['Speeltijd', `${this.minutes} minuten`], ['Tempo', this.tempo], ['Leerlingen', this.players.size], ['Stadslicht', `${this.licht} van ${W.LICHT.length}`]],
      ['Rang', 'Naam', 'Kristallen', 'Missies', 'Branden geblust', 'Gnomen gevangen', 'Kristallen geraapt', 'Beste voertuig', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed'], rows);
  }

  addFeed(text, big = true) {
    this.feed.unshift({ text, at: Date.now(), big });
    this.feed.length = Math.min(this.feed.length, 8);
    this.feedChanged = true;
  }

  ranking() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id, n: p.n, name: p.name, color: p.color, kr: p.kr, score: p.kr, missies: p.missies, geblust: p.geblust, gnomen: p.gnomen, rapen: p.rapen,
        open: this.open(p), bestStreak: p.bestStreak, right: p.right, wrong: p.wrong,
      }))
      .sort((a, b) => b.kr - a.kr || b.missies - a.missies || b.right - a.right);
  }

  roster() {
    return [...this.players.entries()].map(([id, p]) => ({ id, n: p.n, name: p.name, color: p.color }));
  }

  base0() {
    return {
      active: this.active, run: this.run, phase: this.phase, title: this.quiz && this.quiz.title, tempo: this.tempo,
      minutes: this.minutes, now: Date.now(), startedAt: this.startedAt, endsAt: this.endsAt, roster: this.roster(),
    };
  }

  hostState() {
    return { ...this.base0(), ranking: this.ranking(), feed: this.feed, resultsFile: this.resultsFile, wereld: this.wereld() };
  }

  me(p, now, ranking) {
    const m = p.missie;
    return {
      n: p.n, kr: p.kr, veh: p.veh, open: this.open(p), missies: p.missies, gnomen: p.gnomen, geblust: p.geblust, stunts: p.stunts, dieven: p.dieven,
      nitro: p.nitro, fix: p.fix ? { x: p.x, y: p.y, a: p.a } : null,
      energie: Math.max(0, p.energieAt - Math.max(now, this.startedAt)), energieMax: this.energieMs(),
      missie: m ? { soort: m.soort, left: Math.max(0, m.ends - now), duur: m.duur, tx: m.tx, ty: m.ty, naar: m.naar, ringen: m.ringen, ri: m.ri } : null,
      cool: Math.max(0, p.mcool - now), rank: ranking.findIndex(r => r.n === p.n) + 1, players: this.players.size,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base0();
    if (p) Object.assign(state, { name: p.name, me: this.me(p, Date.now(), this.ranking()), right: p.right, wrong: p.wrong, wereld: this.wereld() });
    return state;
  }

  // Wat er in de stad gebeurt (brand, kristalregen, stadslicht), alleen verstuurd als het verandert.
  wereld() {
    const b = this.brand, r = this.regen;
    return {
      brand: b ? { o: b.o, x: b.x, y: b.y, hp: b.hp, max: b.max, wijk: b.wijk } : null,
      regen: r ? { stukjes: r.stukjes, wijk: r.wijk } : null,
      licht: this.licht, lichtMax: W.LICHT.length, totaal: this.totaal, volgende: W.LICHT[this.licht] || null,
    };
  }

  // Compact: spelers [n, x*10, y*10, hoek*100, voertuig, vlaggen, hoogte*10]. Vlaggen: 1 vraag, 2 energie op, 4 koerier, 8 race, 16 dief, 32 nitro.
  // Gnomen [i, x*10, y*10]. Dieven [n van de jager, x*10, y*10, hoek*100, gevangen*100].
  send(now) {
    const flags = p => (p.asking ? 1 : 0) | (now >= p.energieAt && now >= this.startedAt ? 2 : 0) | (p.missie && p.missie.soort === 'koerier' ? 4 : 0) | (p.missie && p.missie.soort === 'race' ? 8 : 0) | (p.dief ? 16 : 0) | (now < p.nitroTot ? 32 : 0);
    const spelers = [...this.players.values()];
    const msg = {
      p: spelers.map(p => [p.n, Math.round(p.x * 10), Math.round(p.y * 10), Math.round(p.a * 100), p.veh, flags(p), Math.round(p.z * 10)]),
      d: spelers.filter(p => p.dief).map(p => [p.n, Math.round(p.dief.x * 10), Math.round(p.dief.y * 10), Math.round(p.dief.a * 100), Math.round(p.dief.vangst * 100)]),
      g: this.gnomen.filter(g => !g.weg).map(g => [g.i, Math.round(g.x * 10), Math.round(g.y * 10)]),
      ev: this.ev,
    };
    this.ev = [];
    if (this.wereldDirty) { msg.w = this.wereld(); this.wereldDirty = false; }
    let ranking = null;
    if (this.feedChanged || now - this.lastRank > 1000) {
      this.lastRank = now;
      ranking = this.ranking();
      this.io.to('host').emit('nc-tick', { ...msg, ranking, feed: this.feed });
      this.feedChanged = false;
    } else this.io.to('host').emit('nc-tick', msg);
    for (const p of this.players.values()) {
      if (p.dirty || ranking) {
        p.dirty = false;
        this.io.to(p.socketId).emit('nc-tick', { ...msg, me: this.me(p, now, ranking || this.ranking()) });
        p.fix = false;
      } else this.io.to(p.socketId).emit('nc-tick', msg);
    }
  }

  broadcast() {
    this.io.to('host').emit('nc-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('nc-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('nc-state', this.base0());
  }

  attachHost(socket, handle, busyWith, busyError, quizzes) {
    socket.emit('nc-state', this.hostState());
    socket.on('nc-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('camelot');
      if (busy) throw busyError(busy);
      this.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('nc-start', () => this.start());
    socket.on('nc-kick', id => this.kick(id));
    socket.on('nc-finish', () => this.finish());
    socket.on('nc-restart', () => this.quiz && this.load(this.quiz, this.minutes, this.tempo));
    socket.on('nc-stop', (_, cb) => cb && cb({ file: this.stop() }));
  }

  // guard: dezelfde vragen, maar met de gokcontrole van antigok.js ervoor.
  attachPlayer(socket, validId, guard = this) {
    socket.emit('nc-state', this.base0());
    socket.on('nc-join', ({ playerId, name } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = this.join(playerId, name, socket.id);
      socket.data.ncId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit('nc-state', this.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.ncId ? fn(socket.data.ncId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    socket.on('nc-move', m => { if (socket.data.ncId) this.move(socket.data.ncId, m); });
    on('nc-nitro', id => this.nitro(id));
    on('nc-asking', (id, v) => this.asking(id, v));
    on('nc-doel', (id, d) => this.doel(id, d));
    on('nc-voertuig', (id, v) => this.voertuig(id, v));
    on('nc-question', id => guard.question(id));
    on('nc-answer', (id, choice) => guard.answer(id, choice));
  }

  // Wordt aangeroepen vanuit de ene centrale 'disconnect' in server.js (geen listener per spel).
  weg(socket) {
    if (socket.data.ncId) {
      this.asking(socket.data.ncId, false);
    }
  }
}

module.exports = { NeonCamelot };
