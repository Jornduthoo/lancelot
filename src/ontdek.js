// De ontdekwereld: een kleine wereld van bovenaf waar leerlingen in hun vrije tijd rondlopen en raadsels oplossen.
// Denkpuzzels (schuifpuzzel, robotridder, lichtstraal), een labo met techniekproeven (stroomkring, tandwielen, wip),
// woordenschat (de Woordenwachter en het Runenportaal met geheimschrift) en weetjes (de Sterrenwacht). Alles op drie niveaus.
// Elk opgelost raadsel geeft een kristal (één per plek per dag) en komt in het logboek, zodat het Eer geeft voor Mijn burcht.
// Gevonden woorden komen in je woordenboek, weetjes in je ontdekkersboek.
// Wie mag erin? De leerkracht kiest: dicht, wie zijn taken af heeft, of iedereen.
// Alles staat in de map ontdek/ (in .gitignore): één bestand per schooljaar, de instellingen en de eigen inhoud van de leerkracht.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const logboek = require('./logboek');
const niveaus = require('./niveaus');
const taken = require('./taken');
const runen = require('./runen');
const runenWoorden = require('./runen-woorden');
const inhoud = require('./ontdek-inhoud');
const P = require('../public/js/od-puzzels');
const W = require('../public/js/od-wereld');

const NAAM = 'Het rijk van Lancelot';
const SPEL = NAAM; // zo staat het in het logboek
const DIR = gegevens.pad('ontdek');
const INSTELLINGEN = path.join(DIR, 'instellingen.json');
const EIGEN = path.join(DIR, 'eigen.json');
const NIVEAUS = niveaus.NIVEAUS;
const TOEGANG = ['dicht', 'klaar', 'open'];

// De plekken in de wereld. gebied: woud (begin), ruine (over de brug), labo (binnen in het labo).
const STATIONS = {
  uil: { soort: 'woorden', naam: 'De Woordenwachter', gebied: 'woud' },
  schuif: { soort: 'schuif', naam: 'De Zwaardsteen', gebied: 'woud' },
  robot: { soort: 'robot', naam: 'De Robotwerkplaats', gebied: 'woud' },
  licht: { soort: 'licht', naam: 'Het Lichtbaken', gebied: 'ruine' },
  code: { soort: 'code', naam: 'Het Runenportaal', gebied: 'ruine' },
  steen: { soort: 'weetje', naam: 'De Sterrenwacht', gebied: 'ruine' },
  stroom: { soort: 'stroom', naam: 'De Stroomkring', gebied: 'labo' },
  tandwiel: { soort: 'tandwiel', naam: 'De Tandwielen', gebied: 'labo' },
  wip: { soort: 'wip', naam: 'De Wip', gebied: 'labo' },
  smidse: { soort: 'weeg', naam: 'De Goudsmid', gebied: 'draken' },
  nest: { soort: 'reeks', naam: 'Het Drakennest', gebied: 'draken' },
  beeld: { soort: 'pixel', naam: 'Het Drakenbeeld', gebied: 'draken' },
  koepel: { soort: 'sudoku', naam: 'De Sterrenkoepel', gebied: 'sterren' },
  donjon: { soort: 'doolhof', naam: 'De Donjon', gebied: 'sterren' },
  goudtoren: { soort: 'toren', naam: 'De Gouden Toren', gebied: 'sterren' },
  ijsmeer: { soort: 'ijs', naam: 'Het IJsmeer', gebied: 'ijs' },
  klokkentoren: { soort: 'klok', naam: 'De Klokkentoren', gebied: 'ijs' },
  ijsbeeld: { soort: 'spiegel', naam: 'Het IJsbeeld', gebied: 'ijs' },
  lavapoort: { soort: 'codeslot', naam: 'De Lavapoort', gebied: 'vuur' },
  vuurkristal: { soort: 'lampen', naam: 'Het Vuurkristal', gebied: 'vuur' },
  vuurtoren: { soort: 'hanoi', naam: 'De Vuurtoren', gebied: 'vuur' },
};
// Bouwen met kristallen: zo wordt de wereld groter. nodig: wat er eerst moet staan.
const BOUW = {
  brug: { naam: 'de brug naar de Neonruïnes', kost: 3 },
  luchtschip: { naam: 'het luchtschip naar de Drakenkust', kost: 10 },
  sterrenpoort: { naam: 'de sterrenpoort naar de Sterrenhaven', kost: 20, nodig: 'brug' },
  drakenzadel: { naam: 'het drakenzadel naar de Vuurberg', kost: 30, nodig: 'luchtschip' },
  ijsraket: { naam: 'de ijsraket naar het IJsrijk', kost: 30, nodig: 'sterrenpoort' },
};
// Welk gebied pas open is als er iets gebouwd is.
const GEBIED_NODIG = { ruine: 'brug', draken: 'luchtschip', sterren: 'sterrenpoort', ijs: 'ijsraket', vuur: 'drakenzadel' };
const KRISTAL_PER_PLEK = 3; // zoveel kristallen kan je per plek per dag verdienen
const RUNEN = W.runen(); // de verborgen runenstenen ("kaart:x,y")
const WOORDEN_PER_RONDE = 3;

// ---------- Opslag ----------

function dagVan(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

const jaarFile = sj => path.join(DIR, `${sj}.json`);
let data = null; // { schooljaar, spelers: { key: { naam, kristallen, uitgegeven, gebouwd, woorden, weetjes, dagen, open, laatst } } }
let saveTimer = null;

function jaar(now = new Date()) {
  const sj = logboek.schooljaar(now);
  if (data && data.schooljaar === sj) return data;
  if (data) flush();
  try {
    data = JSON.parse(fs.readFileSync(jaarFile(sj), 'utf8'));
    if (!data || typeof data.spelers !== 'object') throw new Error();
  } catch {
    data = { schooljaar: sj, spelers: {} };
  }
  data.schooljaar = sj;
  return data;
}

function schrijf(file, obj) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(obj));
  fs.renameSync(file + '.tmp', file);
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!data) return;
  try {
    schrijf(jaarFile(data.schooljaar), data);
  } catch (err) {
    console.error(`${NAAM} bewaren mislukt:`, err.message);
  }
}

function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 1500);
}
process.on('exit', flush);

// ---------- Instellingen: wie mag erin ----------

let inst = null;
function instellingen() {
  if (inst) return inst;
  try {
    inst = JSON.parse(fs.readFileSync(INSTELLINGEN, 'utf8'));
  } catch {
    inst = {};
  }
  if (!TOEGANG.includes(inst.toegang)) inst.toegang = 'klaar';
  return inst;
}

function zetToegang(toegang) {
  if (!TOEGANG.includes(toegang)) throw new Error('Kies dicht, klaar of open.');
  instellingen().toegang = toegang;
  schrijf(INSTELLINGEN, inst);
  return { toegang };
}

function toegangVoor(naam) {
  const t = instellingen().toegang;
  if (t === 'dicht') return { mag: false, reden: 'dicht', tekst: `${NAAM} is nu gesloten. De leerkracht zet het open als er tijd is.` };
  if (t === 'klaar') {
    const open = taken.aantal(naam);
    if (open) return { mag: false, reden: 'taken', open, tekst: `Maak eerst je ${open === 1 ? 'taak' : `${open} taken`} af. Daarna mag je op ontdekking.` };
  }
  return { mag: true };
}

// ---------- Eigen inhoud van de leerkracht ----------

let eigenCache = null;
function eigen() {
  if (eigenCache) return eigenCache;
  try {
    const e = JSON.parse(fs.readFileSync(EIGEN, 'utf8'));
    eigenCache = { woorden: Array.isArray(e.woorden) ? e.woorden : [], weetjes: Array.isArray(e.weetjes) ? e.weetjes : [], leerjaar: e.leerjaar || '' };
  } catch {
    eigenCache = { woorden: [], weetjes: [], leerjaar: '' };
  }
  return eigenCache;
}

function bewaarEigen() {
  schrijf(EIGEN, eigenCache);
}

const tekst = (v, max = 200) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const woordVorm = w => tekst(w, 30).toLowerCase().replace(/^(de|het|een)\s+/, '');
const niveauVan = v => niveaus.clean(v) || '';

// Een weetje van de AI of uit het scherm netjes maken. Geeft null als er iets ontbreekt.
function schoonWeetje(x) {
  if (!x || typeof x !== 'object') return null;
  const veld = re => Object.entries(x).find(([k]) => re.test(k))?.[1];
  const v = tekst(veld(/^(vraag|question|v)$/i));
  const a = (veld(/^(opties|keuzes|antwoorden|options|a)$/i) || []).map(o => tekst(o, 90)).filter(Boolean).slice(0, 4);
  let j = veld(/^(juist|correct|answer|j)$/i);
  if (typeof j === 'string' && !/^\d+$/.test(j)) j = a.findIndex(o => o.toLowerCase() === j.trim().toLowerCase());
  j = Number(j);
  const w = tekst(veld(/^(weetje|uitleg|fact|w)$/i), 260);
  if (!v || a.length < 2 || !Number.isInteger(j) || j < 0 || j >= a.length || new Set(a).size !== a.length) return null;
  return { o: tekst(veld(/^(onderwerp|topic|o)$/i), 30) || 'Weetje', v, a, j, w: w || '', niveau: niveauVan(veld(/^niveau|level$/i)) };
}

function schoonWoord(x) {
  if (!x || typeof x !== 'object') return null;
  const veld = re => Object.entries(x).find(([k]) => re.test(k))?.[1];
  const w = woordVorm(veld(/^(woord|word|w)$/i));
  const b = tekst(veld(/^(betekenis|uitleg|meaning|b)$/i));
  if (!w || !b || w.length < 2 || /[^a-zà-ÿ' -]/i.test(w)) return null;
  return { w, b, z: tekst(veld(/^(zin|voorbeeldzin|sentence|z)$/i)), niveau: niveauVan(veld(/^niveau|level$/i)) };
}

// Tekst van de leerkracht: één woord per regel, "woord = betekenis | voorbeeldzin".
function leesWoorden(text) {
  const out = [];
  for (const regel of String(text || '').split(/\r?\n/)) {
    if (!regel.trim() || /^\s*(```|#)/.test(regel)) continue;
    const [kop, ...rest] = regel.split('=');
    const [b = '', z = ''] = rest.join('=').split('|');
    const x = schoonWoord({ w: kop, b, z });
    if (x && !out.some(y => y.w === x.w)) out.push(x);
  }
  return out;
}

function eigenView() {
  const e = eigen();
  return {
    leerjaar: e.leerjaar,
    woorden: e.woorden,
    woordenTekst: e.woorden.map(x => `${x.w} = ${x.b}${x.z ? ` | ${x.z}` : ''}`).join('\n'),
    weetjes: e.weetjes,
    weekwoorden: runen.lijstView().woorden.filter(x => x.b).length,
  };
}

function zetWoorden(text) {
  const woorden = leesWoorden(text);
  if (woorden.length > 300) throw new Error('Hooguit 300 woorden.');
  // Het niveau dat de AI meegaf blijft bewaard.
  const oud = new Map(eigen().woorden.map(x => [x.w, x.niveau]));
  eigenCache.woorden = woorden.map(x => ({ ...x, niveau: x.niveau || oud.get(x.w) || '' }));
  bewaarEigen();
  return eigenView();
}

function wisWeetje(i) {
  eigen().weetjes.splice(Number(i), 1);
  bewaarEigen();
  return eigenView();
}

function wisAlles() {
  eigen();
  eigenCache.weetjes = [];
  eigenCache.woorden = [];
  bewaarEigen();
  return eigenView();
}

// Wat de AI teruggaf (of wat de leerkracht uit een chatbot plakte) toevoegen.
function voegToe(res, leerjaar) {
  const e = eigen();
  const lijst = (re) => {
    if (Array.isArray(res)) return res;
    const k = Object.keys(res || {}).find(x => re.test(x));
    return k && Array.isArray(res[k]) ? res[k] : [];
  };
  let weetjes = 0;
  let woorden = 0;
  for (const x of lijst(/weetje|vragen|facts|questions/i)) {
    const w = schoonWeetje(x);
    if (!w || e.weetjes.some(y => y.v === w.v) || e.weetjes.length >= 300) continue;
    e.weetjes.push(w);
    weetjes++;
  }
  for (const x of lijst(/woord|words/i)) {
    const w = schoonWoord(x);
    if (!w || e.woorden.some(y => y.w === w.w) || e.woorden.length >= 300) continue;
    e.woorden.push(w);
    woorden++;
  }
  if (!weetjes && !woorden) throw new Error('Er zat niets bruikbaars in. Vraag de AI om enkel de JSON en probeer opnieuw.');
  if (leerjaar) e.leerjaar = tekst(leerjaar, 30);
  bewaarEigen();
  return { ...eigenView(), nieuw: { weetjes, woorden } };
}

function leerjaarTekst(lj) {
  const n = Number(lj);
  if (n >= 1 && n <= 6) return `het ${n}e leerjaar van de lagere school`;
  if (/^m\d$/i.test(String(lj))) return `het ${String(lj).slice(1)}e jaar middelbaar onderwijs`;
  if (/kleuter/i.test(String(lj))) return 'de 3e kleuterklas';
  return 'het 6e leerjaar van de lagere school';
}

function aiPrompt(leerjaar, onderwerp) {
  const over = tekst(onderwerp, 120);
  return `Je helpt een leerkracht in Vlaanderen. Gebruik Belgisch-Nederlands. Maak inhoud voor een ontdekspel voor kinderen uit ${leerjaarTekst(leerjaar)}.
${over ? `Onderwerp: ${over}.` : 'Onderwerpen: dieren, natuur, ruimte, uitvindingen, techniek, geschiedenis en het menselijk lichaam, door elkaar.'}
1. Geef 15 weetjes als meerkeuzevraag: 5 op niveau "page" (makkelijk, 3 keuzes), 5 op niveau "schildknaap" (gewoon, 4 keuzes) en 5 op niveau "ridder" (uitdaging, 4 keuzes). Elke vraag heeft precies één juist antwoord. Het weetje is één of twee korte zinnen die een kind verbazen. Alles moet feitelijk kloppen.
2. Geef 15 nuttige woorden voor de woordenschat (5 per niveau), met een korte, eenvoudige betekenis (hooguit 15 woorden, zonder het woord zelf) en een voorbeeldzin.
Antwoord enkel met JSON in één codeblok, met precies deze sleutels:
{"weetjes":[{"niveau":"page","onderwerp":"Dieren","vraag":"...","opties":["...","...","..."],"juist":0,"weetje":"..."}],"woorden":[{"niveau":"page","woord":"...","betekenis":"...","zin":"..."}]}
"juist" is de plaats van het juiste antwoord in "opties", te tellen vanaf 0.`;
}

const aiCheck = d => d && typeof d === 'object' && (Array.isArray(d.weetjes) || Array.isArray(d.woorden) || Array.isArray(d));

async function aiMaak({ leerjaar, onderwerp } = {}, ai, aiJson) {
  const res = await ai.generateQuiz(aiPrompt(leerjaar, onderwerp), [], raw => aiJson.extract(raw, 'lijst met weetjes', aiCheck));
  return voegToe(res, leerjaar);
}

function plak({ text, leerjaar } = {}, aiJson) {
  return voegToe(aiJson.extract(text, 'lijst met weetjes', aiCheck), leerjaar);
}

// ---------- Leerlingen ----------

// De leerkracht kan zelf rondkijken: alles open, de brug al gebouwd, en niets in het logboek of op het bord.
const LK = '\u0000leerkracht';
let lkSpeler = null;

function wie(naam) {
  if (naam === LK) return { key: 'lk', naam: 'Leerkracht', leerling: null, lk: true };
  const n = String(naam || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!n) return null;
  const l = klas.match(n);
  return { key: l ? `id:${l.id}` : `n:${n.toLowerCase()}`, naam: l ? l.naam : n, leerling: l };
}

function speler(w) {
  if (w.lk) return lkSpeler || (lkSpeler = { naam: w.naam, kristallen: 0, uitgegeven: 0, gebouwd: Object.keys(BOUW), woorden: {}, weetjes: {}, dagen: {}, open: {}, trap: {}, runen: {} });
  const j = jaar();
  const s = j.spelers[w.key] || (j.spelers[w.key] = { naam: w.naam, kristallen: 0, uitgegeven: 0, gebouwd: [], woorden: {}, weetjes: {}, dagen: {}, open: {} });
  s.naam = w.naam;
  s.trap = s.trap || {};
  s.runen = s.runen || {};
  return s;
}

function eigenNiveau(w, soort) {
  return klas.niveauVoor(w.leerling, soort === 'woorden' || soort === 'code' ? 'Nederlands' : '');
}

const kristallen = s => s.kristallen - s.uitgegeven;
// Hoeveel kristallen je vandaag al bij deze plek verdiende (een oud bestand telde er één).
const vandaagN = (d, id) => (d && d[id] ? d[id].n || 1 : 0);

function view(naam) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const s = w.lk ? speler(w) : jaar().spelers[w.key];
  const vandaag = (s && s.dagen[dagVan()]) || {};
  return {
    wereld: NAAM,
    naam: w.naam,
    niveau: klas.niveauVoor(w.leerling, ''),
    toegang: w.lk ? { mag: true } : toegangVoor(w.naam),
    leerkracht: !!w.lk,
    kristallen: s ? kristallen(s) : 0,
    gebouwd: s ? s.gebouwd : [],
    bouw: BOUW,
    stations: Object.fromEntries(Object.entries(STATIONS).map(([id, st]) => [id, {
      naam: st.naam, soort: st.soort, gebied: st.gebied,
      vandaag: vandaagN(vandaag, id) >= KRISTAL_PER_PLEK,
      kristallen: vandaagN(vandaag, id),
      trap: ((s && s.trap && s.trap[id]) || 0) + 1,
    }])),
    perPlek: KRISTAL_PER_PLEK,
    woorden: s ? Object.keys(s.woorden).length : 0,
    weetjes: s ? Object.keys(s.weetjes).length : 0,
    runen: s && s.runen ? Object.keys(s.runen) : [],
    runenTotaal: RUNEN.length,
  };
}

// ---------- Woorden en weetjes kiezen ----------

// Alle woorden met een betekenis voor een niveau: eerst de eigen woorden en de woorden van de week, dan de ingebouwde.
function woordenBank(niveau) {
  const eigenW = eigen().woorden.filter(x => !x.niveau || x.niveau === niveau);
  const week = runen.lijstView().woorden.filter(x => x.b).map(x => ({ w: x.w, b: x.b, z: x.z }));
  const ingebouwd = { page: runenWoorden.PAGE, schildknaap: runenWoorden.SCHILDKNAAP, ridder: runenWoorden.RIDDER }[niveau]
    .map(([w, b, z]) => ({ w, b, z }));
  const gezien = new Set();
  const out = [];
  for (const [bron, lijst] of [['eigen', eigenW], ['week', week], ['', ingebouwd]]) {
    for (const x of lijst) {
      if (gezien.has(x.w)) continue;
      gezien.add(x.w);
      out.push({ ...x, bron });
    }
  }
  return out;
}

// Liefst iets wat de leerling nog niet heeft, en de eigen inhoud van de leerkracht eerst.
function kiesNieuw(lijst, heb, r, sleutel) {
  const nieuw = lijst.filter(x => !heb[sleutel(x)]);
  const eerst = nieuw.filter(x => x.bron);
  const pool = eerst.length ? eerst : nieuw.length ? nieuw : lijst;
  return pool[r.int(pool.length)];
}

const weetjeId = x => x.id || `e:${x.v.slice(0, 60)}`;

function weetjesBank(niveau) {
  const eigenW = eigen().weetjes.filter(x => !x.niveau || x.niveau === niveau).map(x => ({ ...x, bron: 'eigen' }));
  const ingebouwd = { page: inhoud.PAGE, schildknaap: inhoud.SCHILDKNAAP, ridder: inhoud.RIDDER }[niveau].map((x, i) => ({ ...x, id: `${niveau[0]}${i}`, bron: '' }));
  return [...eigenW, ...ingebouwd];
}

// ---------- Een raadsel openen ----------

const CAESAR = 'abcdefghijklmnopqrstuvwxyz';
const versleutel = (woord, k) => woord.toUpperCase().replace(/[A-Z]/g, c => CAESAR[(CAESAR.indexOf(c.toLowerCase()) + k) % 26].toUpperCase());
const normaal = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// Een nieuw raadsel maken voor deze plek. Het juiste antwoord blijft op de server.
function nieuwRaadsel(w, s, id, niveau) {
  const st = STATIONS[id];
  const dag = dagVan();
  const nr = ((s.open[id] && s.open[id].nr) || 0) + 1;
  const trap = (s.trap[id] || 0) + 1; // elke keer dat je een plek oplost, ga je een trap hoger
  const seed = `${dag}|${w.key}|${id}|${nr}`;
  const r = P.rng(seed);
  const o = { niveau, nr, seed, trap };
  if (P.SOORTEN.includes(st.soort)) {
    o.pz = P.maak(st.soort, niveau, seed, trap);
  } else if (st.soort === 'woorden') {
    const bank = woordenBank(niveau);
    const rij = [];
    const aantal = WOORDEN_PER_RONDE + Math.min(3, Math.floor((trap - 1) / 3));
    for (let i = 0; i < aantal && rij.length < bank.length; i++) {
      const heb = { ...s.woorden };
      for (const x of rij) heb[x] = true;
      rij.push(kiesNieuw(bank, heb, r, x => x.w).w);
    }
    o.rij = rij;
    o.goed = 0;
    o.fout = 0;
  } else if (st.soort === 'code') {
    // Een woord van 4 tot 8 letters, liefst uit de eigen woorden of de woorden van de week.
    const lens = { page: [3, 6], schildknaap: [4, 8], ridder: [5, 12] }[niveau];
    const bank = woordenBank(niveau).filter(x => /^[a-z]+$/.test(x.w) && x.w.length >= lens[0] && x.w.length <= lens[1]);
    const x = kiesNieuw(bank.length ? bank : woordenBank(niveau), s.woorden, r, y => y.w);
    o.woord = x.w;
    o.sleutel = { page: 1 + r.int(3), schildknaap: 2 + r.int(5), ridder: 3 + r.int(10) }[niveau];
    o.pogingen = 0;
  } else if (st.soort === 'weetje') {
    const x = kiesNieuw(weetjesBank(niveau), s.weetjes, r, weetjeId);
    const volgorde = r.shuffle(x.a.map((_, i) => i));
    o.weetje = { id: weetjeId(x), o: x.o, v: x.v, a: volgorde.map(i => x.a[i]), j: volgorde.indexOf(x.j), w: x.w };
  }
  s.open[id] = o;
  save();
  return o;
}

function woordInfo(w, niveau) {
  return woordenBank(niveau).find(x => x.w === w) || woordenBank('page').concat(woordenBank('schildknaap'), woordenBank('ridder')).find(x => x.w === w) || { w, b: '', z: '' };
}

// Wat de gsm te zien krijgt (zonder antwoorden).
function publiek(id, o) {
  const st = STATIONS[id];
  const uit = { station: id, naam: st.naam, soort: st.soort, niveau: o.niveau, trap: o.trap || 1 };
  if (o.pz) {
    const { opl, ...pz } = o.pz;
    uit.pz = pz;
  } else if (st.soort === 'woorden') {
    const w = o.rij[0];
    const x = woordInfo(w, o.niveau);
    uit.vraag = { b: x.b, nr: o.goed + 1, van: o.goed + o.rij.length };
    if (o.niveau === 'ridder') {
      uit.vraag.hint = `${w[0].toUpperCase()}${'_'.repeat(w.length - 1)}`;
      uit.vraag.lengte = w.length;
    } else {
      // Keuzes: het juiste woord en woorden van ongeveer dezelfde lengte.
      const r = P.rng(`${o.seed}|${o.goed}|${o.fout}`);
      const ander = r.shuffle(woordenBank(o.niveau).filter(y => y.w !== w)).sort((a, b) => Math.abs(a.w.length - w.length) - Math.abs(b.w.length - w.length));
      uit.vraag.opties = r.shuffle([w, ...ander.slice(0, o.niveau === 'page' ? 2 : 3).map(y => y.w)]);
    }
  } else if (st.soort === 'code') {
    uit.code = { tekst: versleutel(o.woord, o.sleutel), lengte: o.woord.length };
    if (o.niveau === 'page') uit.code.sleutel = o.sleutel;
    if (o.niveau === 'schildknaap') uit.code.sleutel = o.sleutel;
    if (o.niveau === 'page' || o.niveau === 'ridder' || o.pogingen >= 3) uit.code.betekenis = woordInfo(o.woord, o.niveau).b;
    if (o.niveau === 'page') uit.code.tabel = true; // Page krijgt de hele vertaaltabel
    if (o.pogingen >= 3) uit.code.eerste = o.woord[0].toUpperCase();
  } else if (st.soort === 'weetje') {
    uit.weetje = { o: o.weetje.o, v: o.weetje.v, a: o.weetje.a };
  }
  return uit;
}

function open({ naam, station, niveau } = {}) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const st = STATIONS[station];
  if (!st) throw new Error('Deze plek bestaat niet.');
  const t = w.lk ? { mag: true } : toegangVoor(w.naam);
  if (!t.mag) throw new Error(t.tekst);
  const s = speler(w);
  const nodig = GEBIED_NODIG[st.gebied];
  if (nodig && !s.gebouwd.includes(nodig)) throw new Error(`Bouw eerst ${BOUW[nodig].naam}.`);
  s.laatst = new Date().toISOString();
  const n = niveaus.clean(niveau) || eigenNiveau(w, st.soort);
  let o = s.open[station];
  if (!o || o.niveau !== n || o.dag !== undefined) o = nieuwRaadsel(w, s, station, n);
  return { ...publiek(station, o), eigen: eigenNiveau(w, st.soort), vandaag: vandaagN(s.dagen[dagVan()], station) >= KRISTAL_PER_PLEK, perPlek: KRISTAL_PER_PLEK };
}

// ---------- Een poging ----------

function beloon(w, s, id, niveau) {
  const dag = dagVan();
  const d = s.dagen[dag] || (s.dagen[dag] = {});
  const n = vandaagN(d, id);
  if (n >= KRISTAL_PER_PLEK) return null;
  d[id] = { t: new Date().toISOString(), niveau, n: n + 1 };
  s.kristallen++;
  if (w.lk) return { kristal: 1 };
  logboek.add([{
    sessie: `ontdek-${dag}`,
    naam: w.naam,
    spel: SPEL,
    bron: `${NAAM} ${dag}`,
    vraag: `${STATIONS[id].naam} (${niveaus.NAMES[niveau]})`,
    juist: true,
  }]);
  return { kristal: 1 };
}

function weetjeLabo(s, soort) {
  const lijst = inhoud.LABO[soort] || [];
  const i = lijst.findIndex((_, k) => !s.weetjes[`lab-${soort}-${k}`]);
  const k = i >= 0 ? i : Math.floor(Math.random() * lijst.length);
  s.weetjes[`lab-${soort}-${k}`] = dagVan();
  return { o: 'Techniek', w: lijst[k] };
}

function poging({ naam, station, poging: p } = {}) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const st = STATIONS[station];
  if (!st) throw new Error('Deze plek bestaat niet.');
  const s = speler(w);
  const o = s.open[station];
  if (!o) throw new Error('Open het raadsel opnieuw.');
  s.laatst = new Date().toISOString();
  const klaar = extra => {
    const beloning = beloon(w, s, station, o.niveau);
    s.trap[station] = Math.max(s.trap[station] || 0, o.trap || 1);
    delete s.open[station];
    o.nr = o.nr || 1;
    s.open[station] = { nr: o.nr, niveau: o.niveau, dag: dagVan() }; // het volgende raadsel wordt een nieuw
    save();
    return { ok: true, klaar: true, beloning, trap: o.trap || 1, ...extra, stand: view(w.lk ? LK : w.naam) };
  };

  if (o.pz) {
    if (!P.check(st.soort, o.pz, p)) return { ok: false, tekst: 'Nog niet helemaal. Probeer het nog eens!' };
    const extra = ['stroom', 'tandwiel', 'wip'].includes(st.soort) ? { weetje: weetjeLabo(s, st.soort) } : {};
    return klaar(extra);
  }

  if (st.soort === 'woorden') {
    const doel = o.rij[0];
    const x = woordInfo(doel, o.niveau);
    const juist = normaal(p) === normaal(doel);
    o.rij.shift();
    if (juist) {
      o.goed++;
      s.woorden[doel] = s.woorden[doel] || dagVan();
    } else {
      o.fout++;
      if (o.rij.length < 6) o.rij.push(doel); // een fout woord komt op het einde terug
    }
    const info = { juist, woord: doel, b: x.b, z: x.z };
    if (!o.rij.length) return klaar({ woord: info });
    save();
    return { ok: juist, woord: info, volgende: publiek(station, o) };
  }

  if (st.soort === 'code') {
    if (normaal(p) !== normaal(o.woord)) {
      o.pogingen++;
      save();
      return { ok: false, tekst: o.pogingen === 3 ? 'Nog niet. Je krijgt nu een hint!' : 'Dat is het nog niet. Probeer nog eens!', volgende: publiek(station, o) };
    }
    const x = woordInfo(o.woord, o.niveau);
    s.woorden[o.woord] = s.woorden[o.woord] || dagVan();
    return klaar({ woord: { juist: true, woord: o.woord, b: x.b, z: x.z } });
  }

  if (st.soort === 'weetje') {
    const x = o.weetje;
    const juist = Number(p) === x.j;
    const info = { juist, antwoord: x.a[x.j], o: x.o, w: x.w };
    if (!juist) {
      // Een nieuwe vraag de volgende keer; dit weetje komt niet in je boek.
      nieuwRaadsel(w, s, station, o.niveau);
      return { ok: false, weetje: info, opnieuw: true };
    }
    s.weetjes[x.id] = s.weetjes[x.id] || dagVan();
    return klaar({ weetje: info });
  }
  throw new Error('Onbekend raadsel.');
}

// ---------- Bouwen ----------

function bouw({ naam, wat } = {}) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const b = BOUW[wat];
  if (!b) throw new Error('Dat kan je niet bouwen.');
  const s = speler(w);
  if (s.gebouwd.includes(wat)) return { stand: view(w.lk ? LK : w.naam) };
  if (b.nodig && !s.gebouwd.includes(b.nodig)) throw new Error(`Bouw eerst ${BOUW[b.nodig].naam}.`);
  if (kristallen(s) < b.kost) throw new Error(`Je hebt ${b.kost} kristallen nodig om ${b.naam} te bouwen. Los nog wat raadsels op!`);
  s.uitgegeven += b.kost;
  s.gebouwd.push(wat);
  save();
  return { stand: view(w.lk ? LK : w.naam) };
}

// ---------- Runenstenen ----------

// Een verborgen runensteen opgeraapt: één keer per steen, en elke steen is een kristal waard.
function vind({ naam, id } = {}) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  if (!RUNEN.includes(id)) throw new Error('Hier ligt geen runensteen.');
  const s = speler(w);
  const kaart = id.split(':')[0];
  const nodig = GEBIED_NODIG[kaart];
  if (nodig && !s.gebouwd.includes(nodig)) throw new Error('Hier kan je nog niet komen.');
  let nieuw = false;
  if (!s.runen[id]) {
    s.runen[id] = dagVan();
    s.kristallen++;
    nieuw = true;
    save();
  }
  return { nieuw, aantal: Object.keys(s.runen).length, totaal: RUNEN.length, stand: view(w.lk ? LK : w.naam) };
}

// ---------- Het woordenboek en het ontdekkersboek ----------

function boek(naam) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const s = w.lk ? speler(w) : jaar().spelers[w.key];
  if (!s) return { woorden: [], weetjes: [] };
  const woorden = Object.entries(s.woorden).map(([x, dag]) => ({ ...woordInfo(x, 'schildknaap'), dag, bron: undefined }))
    .sort((a, b) => a.w.localeCompare(b.w, 'nl'));
  const alle = [...inhoud.PAGE.map((x, i) => ({ ...x, id: `p${i}` })), ...inhoud.SCHILDKNAAP.map((x, i) => ({ ...x, id: `s${i}` })), ...inhoud.RIDDER.map((x, i) => ({ ...x, id: `r${i}` })), ...eigen().weetjes.map(x => ({ ...x, id: weetjeId(x) }))];
  const weetjes = Object.entries(s.weetjes).map(([id, dag]) => {
    const lab = /^lab-(\w+)-(\d+)$/.exec(id);
    if (lab) return { o: 'Techniek', w: (inhoud.LABO[lab[1]] || [])[Number(lab[2])], dag };
    const x = alle.find(y => y.id === id);
    return x ? { o: x.o, v: x.v, a: x.a[x.j], w: x.w, dag } : null;
  }).filter(x => x && x.w).sort((a, b) => a.o.localeCompare(b.o, 'nl') || (a.dag < b.dag ? -1 : 1));
  return { woorden, weetjes };
}

// ---------- Voor de leerkracht ----------

function bord(binnen = []) {
  const dag = dagVan();
  const rijen = Object.values(jaar().spelers).map(s => {
    const d = s.dagen[dag] || {};
    return {
      naam: s.naam,
      vandaag: Object.keys(d).map(id => ({ id, naam: STATIONS[id] ? STATIONS[id].naam : id, niveau: d[id].niveau })),
      kristallen: s.kristallen,
      woorden: Object.keys(s.woorden).length,
      weetjes: Object.keys(s.weetjes).length,
      brug: s.gebouwd.includes('brug'),
      laatst: s.laatst || '',
      binnen: binnen.some(n => n.toLowerCase() === s.naam.toLowerCase()),
    };
  }).sort((a, b) => b.vandaag.length - a.vandaag.length || (a.laatst < b.laatst ? 1 : -1));
  // Wie wel binnen is maar nog niets deed, staat er ook bij.
  for (const n of binnen) if (!rijen.some(r => r.naam.toLowerCase() === n.toLowerCase())) rijen.unshift({ naam: n, vandaag: [], kristallen: 0, woorden: 0, weetjes: 0, brug: false, laatst: '', binnen: true });
  return { wereld: NAAM, dag, toegang: instellingen().toegang, rijen, stations: STATIONS };
}

module.exports = {
  LK,
  vind,
  NAAM, SPEL, DIR, STATIONS, view, open, poging, bouw, boek, bord, zetToegang, toegangVoor,
  eigenView, zetWoorden, wisWeetje, wisAlles, aiMaak, aiPrompt, plak, flush, dagVan, versleutel,
};
