// Een toets afnemen in de klas (De Proef). Elke leerling maakt de toets op zijn eigen toestel, vraag per vraag.
// Beveiligd zover een browser dat kan: de toets vraagt het volledige scherm, schudt vragen en keuzes per leerling,
// en wie de toets verlaat (ander tabblad, ander venster, volledig scherm uit) staat meteen op het bord.
// Met slot: 'slot' gaat de toets dan op slot tot de leerkracht hem vrijgeeft; met 'melden' komt er alleen een melding.
// Een browser kan een Chromebook niet echt vergrendelen: dat kan alleen de school (kioskmodus). We merken en melden.
// Feedback is er niet tijdens de toets. Na het afsluiten komt alles in een afname, waar de leerkracht verder verbetert.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const K = require('../public/js/pf-kern');
const klas = require('./klas');
const doelen = require('./doelen');

const MODES = [...K.NIVEAUS, 'klas', 'kies'];
const SOORTEN = { tab: 'ander tabblad of venster', scherm: 'volledig scherm verlaten', herladen: 'pagina herladen of opnieuw geopend', plak: 'probeerde te plakken' };

function instellingen(raw = {}) {
  const tijd = Math.round(Number(raw.tijd));
  return {
    schudden: raw.schudden !== false,
    terug: raw.terug !== false,
    tijd: tijd > 0 ? Math.min(240, tijd) : 0,
    slot: raw.slot === 'melden' ? 'melden' : 'slot',
    scherm: raw.scherm !== false,
    uitslag: raw.uitslag === true,
    niveau: MODES.includes(raw.niveau) ? raw.niveau : 'klas',
    voorlees: ['iedereen', 'page', 'uit'].includes(raw.voorlees) ? raw.voorlees : 'uit',
  };
}

class ProefLive {
  constructor(io, onFinish) {
    this.io = io;
    this.onFinish = onFinish;
    this.run = 0;
    this.reset();
  }

  reset() {
    clearTimeout(this.pending);
    clearInterval(this.klok);
    this.pending = null;
    this.klok = null;
    this.toets = null;
    this.file = null;
    this.phase = 'idle'; // idle -> open -> einde
    this.inst = instellingen();
    this.players = new Map();
    this.levels = {};
    this.beelden = [];
    this.beeldIndex = new Map();
    this.startedAt = 0;
    this.afname = null;
    this.afnameFile = null;
  }

  get active() {
    return this.phase !== 'idle';
  }

  get multi() {
    return Object.keys(this.levels).length > 1;
  }

  load(toets, file, inst) {
    const fout = K.problemen(toets);
    if (fout.length) throw new Error(`De toets is nog niet klaar: ${fout[0]}.`);
    this.reset();
    this.run++;
    this.toets = toets;
    this.file = file;
    this.inst = instellingen(inst);
    for (const n of K.niveausVan(toets)) this.levels[n] = K.lijstVoor(toets, n);
    this.vak = doelen.hoofdvak(Object.values(this.levels).flatMap(l => K.vragenVan(l).map(v => v.q.doel)));
    this.phase = 'open';
    this.startedAt = Date.now();
    this.klok = setInterval(() => this.tick(), 1000);
    this.broadcast();
    this.io.to('host').emit('pf-toets', this.hostToets());
  }

  // Afbeeldingen gaan niet mee in elke stand: de leerling laadt ze één keer via /toets-beeld/<run>/<nummer>.
  img(data) {
    if (!this.beeldIndex.has(data)) {
      const m = /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(data);
      if (!m) return '';
      this.beeldIndex.set(data, this.beelden.length);
      this.beelden.push({ mime: m[1], buf: Buffer.from(m[2], 'base64') });
    }
    return `/toets-beeld/${this.run}/${this.beeldIndex.get(data)}`;
  }

  beeld(run, nr) {
    if (!this.active || Number(run) !== this.run) return null;
    return this.beelden[Number(nr)] || null;
  }

  lijst(p) {
    return this.levels[p.niveau] || this.levels.schildknaap;
  }

  startNiveau(name) {
    if (this.levels[this.inst.niveau]) return this.inst.niveau;
    if (this.inst.niveau === 'klas') {
      const l = klas.match(name);
      const n = klas.niveauVoor(l, this.vak);
      if (l && this.levels[n]) return n;
    }
    return 'schildknaap';
  }

  // De eigen volgorde van deze leerling: de vragen (als de leerkracht schudt), de keuzes, en altijd verbinden en ordenen.
  schik(id, p) {
    const lijst = this.lijst(p);
    const seed = `${this.run}|${id}|${p.niveau}`;
    p.order = K.volgorde(lijst, `${seed}|vragen`, this.inst.schudden);
    p.perms = {};
    for (const { id: qid, q } of K.vragenVan(lijst)) {
      if (q.type === 'meerkeuze' && this.inst.schudden) p.perms[qid] = K.schud(q.opties.length, `${seed}|${qid}`);
      if (q.type === 'verbinden') p.perms[qid] = K.schud(q.paren.length, `${seed}|${qid}`, true);
      if (q.type === 'ordenen') p.perms[qid] = K.schud(q.items.length, `${seed}|${qid}`, true);
    }
    p.view = null;
  }

  join(playerId, name, socketId) {
    if (!this.active) return { error: 'Er is nu geen toets bezig. Wacht op je leerkracht.' };
    const existing = this.players.get(playerId);
    if (existing) {
      existing.socketId = socketId;
      this.changed();
      return { ok: true, name: existing.name };
    }
    if (this.phase !== 'open') return { error: 'Deze toets is al afgesloten.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) return { error: 'Vul een naam in.' };
    if ([...this.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) return { error: 'Die naam is al bezet.' };
    const kl = klas.match(clean);
    const p = {
      name: clean, socketId, niveau: this.startNiveau(clean), choosing: this.inst.niveau === 'kies' && this.multi,
      klasPage: !!kl && klas.niveauVoor(kl, this.vak) === 'page',
      ruw: {}, answers: {}, auto: {}, begon: 0, ingeleverd: 0, pos: 0, verst: 0, slot: false, wegSinds: 0, events: [], extra: 0, joinedAt: Date.now(),
    };
    this.schik(playerId, p);
    this.players.set(playerId, p);
    this.changed();
    return { ok: true, name: clean };
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.io.to(p.socketId).emit('pf-kicked');
    this.changed();
  }

  choose(playerId, niveau) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'open') return { error: 'De toets is gesloten.' };
    if (!p.choosing || p.begon) return { error: 'Je niveau ligt al vast.' };
    if (!this.levels[niveau]) return { error: 'Dat niveau bestaat niet voor deze toets.' };
    p.niveau = niveau;
    p.choosing = false;
    this.schik(playerId, p);
    this.sendPlayer(playerId);
    this.changed();
    return { ok: true };
  }

  // De leerkracht zet een leerling op een ander niveau (alleen zolang hij nog niet begonnen is).
  setNiveau(playerId, niveau) {
    const p = this.players.get(playerId);
    if (!p) return { error: 'Die leerling is er niet meer.' };
    if (p.begon) return { error: 'Deze leerling is al begonnen aan de toets.' };
    if (!this.levels[niveau]) return { error: 'Dat niveau bestaat niet voor deze toets.' };
    p.niveau = niveau;
    p.choosing = false;
    this.schik(playerId, p);
    this.sendPlayer(playerId);
    this.changed();
    return { ok: true };
  }

  eindeVan(p) {
    return this.inst.tijd && p.begon ? p.begon + (this.inst.tijd + p.extra) * 60000 : 0;
  }

  start(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'open') return { error: 'De toets is gesloten.' };
    if (p.choosing) return { error: 'Kies eerst je niveau.' };
    if (!p.begon) {
      p.begon = Date.now();
      this.changed();
    }
    this.sendPlayer(playerId);
    return { ok: true };
  }

  vraagVan(p, qid) {
    return K.vragenVan(this.lijst(p)).find(v => v.id === qid);
  }

  // Op welke pagina staat deze vraag in de volgorde van de leerling?
  paginaVan(p, qid) {
    return p.order.indexOf(Number(String(qid).split('.')[0]));
  }

  bezig(p) {
    if (!p || this.phase !== 'open') return 'De toets is gesloten.';
    if (!p.begon) return 'Begin eerst aan de toets.';
    if (p.ingeleverd) return 'Je hebt je toets al ingeleverd.';
    if (p.slot) return 'Je toets staat op slot. Wacht op je leerkracht.';
    return null;
  }

  answer(playerId, { id, value } = {}) {
    const p = this.players.get(playerId);
    const fout = this.bezig(p);
    if (fout) return { error: fout };
    const v = this.vraagVan(p, id);
    if (!v) return { error: 'Onbekende vraag.' };
    if (!this.inst.terug && this.paginaVan(p, id) < p.verst) return { error: 'Terugkeren naar een vorige vraag mag niet bij deze toets.' };
    const ruw = K.schoon(v.q, value);
    if (ruw === null || ruw === '') {
      delete p.ruw[id];
      delete p.answers[id];
      delete p.auto[id];
    } else {
      p.ruw[id] = ruw;
      p.answers[id] = K.canoniek(v.q, ruw, p.perms[id]);
      const a = K.auto(v.q, p.answers[id]);
      if (a === null) delete p.auto[id];
      else p.auto[id] = a;
    }
    this.changed();
    return { ok: true, id };
  }

  // Op welke pagina de leerling zit. Zonder terugkeren kan hij niet meer terug naar wat hij al voorbij was.
  pos(playerId, i) {
    const p = this.players.get(playerId);
    if (this.bezig(p)) return { error: this.bezig(p) };
    const n = Math.max(0, Math.min(p.order.length - 1, Math.round(Number(i)) || 0));
    if (!this.inst.terug && n < p.verst) return { error: 'Terugkeren mag niet bij deze toets.', pos: p.verst };
    p.pos = n;
    p.verst = Math.max(p.verst, n);
    this.changed();
    return { ok: true, pos: n };
  }

  // De leerling verliet de toets (ander tabblad, volledig scherm uit, ...). Op het bord meteen zichtbaar.
  weg(playerId, soort) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'open' || !p.begon || p.ingeleverd) return { ok: true };
    const s = SOORTEN[soort] ? soort : 'tab';
    const now = Date.now();
    // Eén keer weggaan geeft vaak twee seintjes (volledig scherm uit en ander tabblad): één melding volstaat.
    const vorige = p.events[p.events.length - 1];
    if (p.wegSinds && vorige && now - p.begon - vorige.t < 3000) return { ok: true, slot: p.slot };
    p.events.push({ t: now - p.begon, soort: s });
    // Plakken houdt de toets tegen (het plakken zelf gaat niet), maar zet hem niet op slot.
    if (s !== 'plak') p.wegSinds = now;
    if (this.inst.slot === 'slot' && s !== 'plak') p.slot = true;
    this.io.to('host').emit('pf-alarm', { name: p.name, soort: SOORTEN[s], slot: p.slot });
    this.changed();
    this.sendPlayer(playerId);
    return { ok: true, slot: p.slot };
  }

  terug(playerId) {
    const p = this.players.get(playerId);
    if (!p || !p.wegSinds) return { ok: true };
    const e = p.events[p.events.length - 1];
    if (e && e.ms === undefined) e.ms = Date.now() - p.wegSinds;
    p.wegSinds = 0;
    this.changed();
    return { ok: true };
  }

  vrijgeven(playerId) {
    const list = playerId ? [this.players.get(playerId)].filter(Boolean) : [...this.players.values()].filter(p => p.slot);
    for (const p of list) p.slot = false;
    for (const [id, p] of this.players) if (list.includes(p)) this.sendPlayer(id);
    this.changed();
    return { ok: true, count: list.length };
  }

  extraTijd(playerId, minuten) {
    const m = Math.max(-60, Math.min(60, Math.round(Number(minuten)) || 0));
    const list = playerId ? [this.players.get(playerId)].filter(Boolean) : [...this.players.values()];
    for (const p of list) p.extra += m;
    for (const [id, p] of this.players) if (list.includes(p)) this.sendPlayer(id);
    this.changed();
    return { ok: true };
  }

  submit(playerId) {
    const p = this.players.get(playerId);
    if (!p || this.phase === 'idle') return { error: 'De toets is gesloten.' };
    if (!p.begon) return { error: 'Je bent nog niet begonnen.' };
    if (!p.ingeleverd) {
      p.ingeleverd = Date.now();
      p.wegSinds = 0;
      this.changed();
    }
    this.sendPlayer(playerId);
    return { ok: true };
  }

  // Een ingeleverde toets weer openzetten: de leerling werkt verder met zijn antwoorden.
  heropen(playerId) {
    if (this.phase !== 'open') return { error: 'De toets is al afgesloten.' };
    const p = this.players.get(playerId);
    if (!p) return { error: 'Die leerling is er niet meer.' };
    p.ingeleverd = 0;
    p.slot = false;
    // Was de tijd om, dan krijgt hij er vijf minuten bij.
    if (this.eindeVan(p) && this.eindeVan(p) <= Date.now()) p.extra += Math.ceil((Date.now() - this.eindeVan(p)) / 60000) + 5;
    this.sendPlayer(playerId);
    this.changed();
    return { ok: true };
  }

  // Elke seconde: wie zijn tijd om is, levert vanzelf in.
  tick() {
    if (this.phase !== 'open' || !this.inst.tijd) return;
    const now = Date.now();
    for (const [id, p] of this.players) {
      if (p.begon && !p.ingeleverd && this.eindeVan(p) <= now) {
        p.ingeleverd = now;
        p.wegSinds = 0;
        this.sendPlayer(id);
        this.changed();
      }
    }
  }

  // Afsluiten: iedereen levert in en alles gaat naar een afname om verder te verbeteren.
  finish() {
    if (this.phase !== 'open') return;
    this.phase = 'einde';
    clearInterval(this.klok);
    const now = Date.now();
    for (const p of this.players.values()) if (p.begon && !p.ingeleverd) p.ingeleverd = now;
    // De klok van de pauzeknop loopt achter op de echte tijd (zoveel als alle pauzes samen): voor de datums de echte.
    const iso = t => new globalThis.Date(t + globalThis.Date.now() - now).toISOString();
    this.afname = {
      title: this.toets.title, datum: iso(this.startedAt), toetsFile: this.file, instellingen: this.inst, toets: this.toets,
      spelers: [...this.players.values()].filter(p => p.begon).sort((a, b) => a.name.localeCompare(b.name, 'nl')).map(p => ({
        naam: p.name, niveau: this.levels[p.niveau] ? p.niveau : 'schildknaap', antwoorden: p.answers, auto: p.auto, hand: {},
        events: p.events, begon: iso(p.begon), ingeleverd: iso(p.ingeleverd), extra: p.extra,
      })),
      klaar: false, gelogd: false,
    };
    try {
      this.afnameFile = this.onFinish ? this.onFinish(this.afname) : null;
    } catch (err) {
      console.error('De afname bewaren mislukt:', err.message);
    }
    this.broadcast();
  }

  stop() {
    if (this.phase === 'open' && [...this.players.values()].some(p => p.begon)) this.finish();
    const file = this.afnameFile;
    this.reset();
    this.broadcast();
    return file;
  }

  // Wat de leerling haalde, als de leerkracht de uitslag toont (de open vragen tellen pas na het verbeteren).
  uitslag(p) {
    if (!this.inst.uitslag || !p.ingeleverd) return null;
    let punten = 0;
    let max = 0;
    let hand = 0;
    for (const { id, q } of K.vragenVan(this.lijst(p))) {
      max += K.maxVan(q);
      punten += Number(p.auto[id]) || 0;
      hand += K.handPunten(q);
    }
    return { punten, max, hand };
  }

  toonUitslag(aan) {
    this.inst.uitslag = !!aan;
    for (const [id, p] of this.players) if (p.ingeleverd) this.sendPlayer(id);
    this.changed();
  }

  status(p) {
    if (p.choosing) return 'kiest';
    if (!p.begon) return 'wacht';
    if (p.ingeleverd) return 'klaar';
    if (p.slot) return 'slot';
    if (p.wegSinds) return 'weg';
    return 'bezig';
  }

  ranking() {
    const now = Date.now();
    return [...this.players.entries()].map(([id, p]) => {
      const vragen = K.vragenVan(this.lijst(p));
      const online = !!(p.socketId && this.io.sockets.sockets.get(p.socketId));
      const e = this.eindeVan(p);
      return {
        id, name: p.name, niveau: p.niveau, status: this.status(p), online, gedaan: vragen.filter(v => p.answers[v.id] !== undefined).length,
        vragen: vragen.length, pos: p.pos + 1, paginas: p.order.length, weg: p.events.length, laatste: p.events.length ? p.events[p.events.length - 1].soort : null,
        rest: e && !p.ingeleverd ? Math.max(0, e - now) : null, extra: p.extra,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }

  detail(playerId) {
    const p = this.players.get(playerId);
    if (!p) return { error: 'Die leerling is er niet meer.' };
    return { ok: true, name: p.name, niveau: p.niveau, answers: p.answers, auto: p.auto, events: p.events.map(e => ({ ...e, soort: SOORTEN[e.soort] })), status: this.status(p) };
  }

  base() {
    return { active: this.active, run: this.run, phase: this.phase, title: this.toets && this.toets.title };
  }

  hostState() {
    return { ...this.base(), file: this.file, inst: this.inst, multi: this.multi, niveaus: Object.keys(this.levels), ranking: this.ranking(), afname: this.afnameFile || null };
  }

  // De volledige toets (met afbeeldingen) voor het bord: één keer bij het starten, niet bij elke verandering.
  hostToets() {
    return this.active ? { run: this.run, toets: this.toets } : null;
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    const state = this.base();
    if (!p) return state;
    const e = this.eindeVan(p);
    Object.assign(state, {
      name: p.name, status: this.status(p), niveau: this.multi ? p.niveau : null, choosing: p.choosing, niveaus: p.choosing ? Object.keys(this.levels) : null,
      inst: { terug: this.inst.terug, scherm: this.inst.scherm, tijd: this.inst.tijd, slot: this.inst.slot },
      intro: this.toets.intro || '', vragen: K.vragenVan(this.lijst(p)).length, totaal: K.totaal(this.lijst(p)),
      rest: e && !p.ingeleverd ? Math.max(0, e - Date.now()) : null,
      voorlees: this.inst.voorlees === 'iedereen' || (this.inst.voorlees === 'page' && (this.multi ? p.niveau === 'page' : p.klasPage)),
    });
    if (p.begon && !p.ingeleverd) {
      if (!p.view) p.view = K.studentView(this.toets, this.lijst(p), { order: p.order, perms: p.perms, img: d => this.img(d) });
      Object.assign(state, { view: p.view, answers: p.ruw, pos: p.pos, verst: p.verst });
    }
    if (p.ingeleverd) state.uitslag = this.uitslag(p);
    return state;
  }

  sendPlayer(playerId) {
    const p = this.players.get(playerId);
    if (p) this.io.to(p.socketId).emit('pf-state', this.playerState(playerId));
  }

  // Het bord hooguit vier keer per seconde bijwerken.
  changed() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      this.io.to('host').emit('pf-state', this.hostState());
    }, 250);
  }

  broadcast() {
    this.io.to('host').emit('pf-state', this.hostState());
    const seen = [];
    for (const [id, p] of this.players) {
      seen.push(p.socketId);
      this.io.to(p.socketId).emit('pf-state', this.playerState(id));
    }
    this.io.to('players').except(seen).emit('pf-state', this.base());
  }
}

module.exports = { ProefLive, instellingen };
