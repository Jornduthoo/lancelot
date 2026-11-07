// LANcelot Junior: de wereld voor de 3e kleuterklas tot het 3e leerjaar, in dezelfde app.
// Dezelfde klaslijst en hetzelfde logboek als LANcelot. Kinderen loggen in met een dier, alles wordt voorgelezen,
// en de klas laat samen het klasdraakje groeien. Geen ranglijsten: elk kind krijgt stickers.
// Drie manieren van spelen: op het bord in 4 kleurteams, met twee op een tablet, of om de beurt (hoekenwerk).
// Bewaard in klas/junior.json bij de gegevens (die map gaat mee in de back-up en staat in .gitignore).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const logboek = require('./logboek');

const FILE = path.join(gegevens.pad('klas'), 'junior.json');
// Eigen symbooltjes van de klas (zoals aan de kapstok): één prent per kind, opgeladen door de leerkracht.
const SYMBOLEN = path.join(gegevens.pad('klas'), 'junior-symbolen');
const SOORTEN = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const DIEREN = 30; // public/img/junior/dier/1..30.webp
const STICKERS = 16; // public/img/junior/sticker/1..16.webp
const PER_RONDE = 5; // zoveel opdrachten, en dan een sticker (de leerkracht kan 3, 5 of 8 kiezen)
const RONDES = [3, 5, 8];
// Hoeveel eten het klasdraakje nodig heeft voor elke fase: ei, ei dat openbreekt, baby, jong draakje, ridderdraak.
const FASEN = [0, 15, 50, 120, 250];
const MANIEREN = ['bord', 'duo', 'beurt'];

// De spelletjes van fase 1. Elk spel heeft niveaus; de leerkracht kiest er één. Alles wat gezegd wordt, staat per taal
// in junior-inhoud(-en/-fr/-es/-de).js; hier staan alleen de namen voor de leerkracht (vertaald via lang/*/junior.json).
const SPELLEN = [
  { id: 'eieren', naam: 'Drakeneieren tellen', zin: 'Tel de eieren in het nest.', groep: 'getallen', jaar: '3e kl - 1e lj', beeld: 'stuk/1',
    niveaus: ['Tot 5', 'Tot 10', 'Tot 20'] },
  { id: 'splits', naam: 'Splitshuisjes', zin: 'Verdeel de draakjes over twee huisjes.', groep: 'getallen', jaar: '1e - 2e lj', beeld: 'stuk/3',
    niveaus: ['Tot 5', 'Tot 10', 'Tot 20'] },
  { id: 'rivier', naam: 'Rekenrivier', zin: 'Spring van steen naar steen met het juiste antwoord.', groep: 'getallen', jaar: '1e - 2e lj', beeld: 'stuk/6',
    niveaus: ['Plus tot 10', 'Plus en min tot 10', 'Plus en min tot 20', 'Tientallen tot 100'] },
  { id: 'groot', naam: 'Groot of klein', zin: 'Wat is het grootste, kleinste, langste of kortste?', groep: 'meten', jaar: '2e kl - 1e lj', beeld: 'dier/13',
    niveaus: ['Groot en klein', 'Groot, klein, lang en kort'] },
  { id: 'dagboog', naam: 'Dagboog', zin: 'Zet de prenten van de dag in de juiste volgorde.', groep: 'meten', jaar: '2e kl - 1e lj', beeld: 'sticker/11',
    niveaus: ['Ochtend, middag, avond', 'Mijn dag', 'De seizoenen', 'De dagen van de week'] },
  { id: 'vormen', naam: 'Vormenjacht', zin: 'Zoek de cirkels, driehoeken en vierkanten.', groep: 'meetkunde', jaar: '2e kl - 1e lj', beeld: 'sticker/7',
    niveaus: ['Cirkel, driehoek, vierkant', 'Met rechthoeken', 'Sorteer de vormen'] },
  { id: 'waar', naam: 'Waar is het draakje?', zin: 'Zet het draakje op, onder of naast de tafel.', groep: 'meetkunde', jaar: '2e kl - 1e lj', beeld: 'stuk/8',
    niveaus: ['Op, onder, naast', 'Ook boven, links en rechts'] },
  { id: 'geluiden', naam: 'Geluidenbos', zin: 'Luister goed: wie maakt dit geluid?', groep: 'taal', jaar: '2e - 3e kl', beeld: 'dier/2',
    niveaus: ['Dieren', 'Dieren en dingen'] },
  { id: 'trein', naam: 'Klankentrein', zin: 'Zet de letters op de wagons, en de trein rijdt weg.', groep: 'taal', jaar: '3e kl - 1e lj', beeld: 'stuk/4',
    niveaus: ['Beginklank', 'Korte woorden', 'Langere woorden'] },
  { id: 'woordbrug', naam: 'Woordbrug', zin: 'Lees het woord en tik de juiste prent.', groep: 'taal', jaar: '1e - 2e lj', beeld: 'stuk/7',
    niveaus: ['Korte woorden', 'Langere woorden', 'Moeilijke klanken'] },
  { id: 'dans', naam: 'Bewegingsdans', zin: 'Het draakje danst voor, de klas doet mee.', groep: 'samen', jaar: 'Iedereen', beeld: 'draak/4', bordAlleen: true,
    niveaus: ['Tellen tot 5', 'Tellen tot 10'] },
  { id: 'kring', naam: 'Kringvragen', zin: 'Een vraag op het bord, elk kind kiest een prent.', groep: 'samen', jaar: 'Iedereen', beeld: 'sticker/8', geenFout: true,
    niveaus: ['Hoe voel je je?', 'Wat vind jij leuk?'] },
  // De eigen vragen van de leerkracht (blok Maken, met of zonder AI). Elk niveau is één reeks vragen.
  { id: 'eigen', naam: 'Mijn vragen', zin: 'Je eigen vragen met prentjes, voorgelezen.', groep: 'eigen', jaar: 'Iedereen', beeld: 'stuk/7',
    niveaus: [] },
  // Geen tegel voor de leerkracht: kinderen starten dit zelf op de tablet, één keer per dag een sticker.
  { id: 'raadsel', naam: 'Raadsel van vandaag', zin: 'Drie korte raadsels, elke dag nieuw.', groep: 'raadsel', jaar: 'Iedereen', beeld: 'sticker/1', verborgen: true,
    niveaus: ['Vandaag'] },
];
const RAADSEL_VRAGEN = 3;
const SPEL = Object.fromEntries(SPELLEN.map(s => [s.id, s]));

let data = null;
function load() {
  if (data) return data;
  try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = {}; }
  if (!data.dieren || typeof data.dieren !== 'object') data.dieren = {};
  if (!data.stickers || typeof data.stickers !== 'object') data.stickers = {};
  if (!data.symbolen || typeof data.symbolen !== 'object') data.symbolen = {};
  if (!data.raadsel || typeof data.raadsel !== 'object') data.raadsel = {};
  if (!Number.isFinite(data.eten)) data.eten = 0;
  if (typeof data.draakNaam !== 'string') data.draakNaam = '';
  if (!data.voortgang || typeof data.voortgang !== 'object') data.voortgang = {};
  if (!Array.isArray(data.sets)) data.sets = [];
  if (!data.instellingen || typeof data.instellingen !== 'object') data.instellingen = {};
  return data;
}
function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Junior bewaren mislukt:', err.message);
  }
}

// Elk kind van de klaslijst krijgt een vast dier. Nieuwe kinderen krijgen het eerste vrije dier.
// Zijn er meer dan 30 kinderen, dan krijgen er twee hetzelfde dier (hun naam staat eronder).
// Het dier van elk kind groeit mee met de stickers: eerst gewoon, dan schildknaap (blauwe kap), dan ridder (helm met pluim).
const DIER_GROEI = [0, 10, 30]; // public/img/junior/dier, dier2, dier3
// De instellingen van de leerkracht (knop ⚙️): opdrachten per ronde, voorlezen op de tablets, dieren die meegroeien.
function instellingen() {
  const i = load().instellingen;
  return { perRonde: RONDES.includes(i.perRonde) ? i.perRonde : PER_RONDE, voorlezen: i.voorlezen !== false, groei: i.groei !== false };
}
function zetInstellingen(nieuw = {}) {
  const i = load().instellingen;
  if (RONDES.includes(Number(nieuw.perRonde))) i.perRonde = Number(nieuw.perRonde);
  if (typeof nieuw.voorlezen === 'boolean') i.voorlezen = nieuw.voorlezen;
  if (typeof nieuw.groei === 'boolean') i.groei = nieuw.groei;
  save();
  return instellingen();
}
function dierFase(stickers) {
  let f = 1;
  while (f < DIER_GROEI.length && stickers >= DIER_GROEI[f]) f++;
  return f;
}
function kinderen() {
  const d = load();
  const lijst = klas.read().leerlingen;
  const groeit = instellingen().groei;
  const bezet = new Set(lijst.map(l => d.dieren[l.id]).filter(Boolean));
  let veranderd = false;
  const uit = lijst.map(l => {
    let dier = d.dieren[l.id];
    if (!(dier >= 1 && dier <= DIEREN)) {
      dier = 1;
      while (bezet.has(dier) && dier < DIEREN) dier++;
      if (bezet.has(dier)) dier = 1 + (Object.keys(d.dieren).length % DIEREN);
      d.dieren[l.id] = dier;
      bezet.add(dier);
      veranderd = true;
    }
    const sym = d.symbolen[l.id];
    const stickers = (d.stickers[l.id] || []).length;
    const groei = groeit ? dierFase(stickers) : 1;
    const map = groei === 1 ? 'dier' : `dier${groei}`;
    return { id: l.id, naam: l.naam, dier, groei, eigen: !!sym, beeld: sym ? `/junior/symbool/${l.id}?v=${sym.v}` : `/img/junior/${map}/${dier}.webp`, stickers };
  });
  if (veranderd) save();
  return uit;
}

// De leerkracht tikt op het dier van een kind: het volgende vrije dier.
function wisselDier(id) {
  const lijst = kinderen();
  const kind = lijst.find(k => k.id === id);
  if (!kind) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const bezet = new Set(lijst.filter(k => k.id !== id).map(k => k.dier));
  let dier = kind.dier;
  for (let i = 0; i < DIEREN; i++) {
    dier = (dier % DIEREN) + 1;
    if (!bezet.has(dier)) break;
  }
  load().dieren[id] = dier;
  save();
  return kinderen();
}

// Een eigen symbooltje opladen (data-URL van een png, jpg of webp, al verkleind door het scherm van de leerkracht) of wissen (leeg).
function zetSymbool(id, dataUrl) {
  if (!klas.read().leerlingen.some(l => l.id === id)) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const d = load();
  const oud = d.symbolen[id];
  if (oud) { try { fs.unlinkSync(path.join(SYMBOLEN, `${id}.${oud.ext}`)); } catch {} }
  delete d.symbolen[id];
  if (dataUrl) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
    if (!m) throw new Error('Kies een prent (png, jpg of webp).');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 400 * 1024) throw new Error('Die prent is te groot.');
    const ext = SOORTEN[m[1]];
    fs.mkdirSync(SYMBOLEN, { recursive: true });
    fs.writeFileSync(path.join(SYMBOLEN, `${id}.${ext}`), buf);
    d.symbolen[id] = { ext, v: Date.now().toString(36) };
  }
  save();
  return kinderen();
}
function symboolBestand(id) {
  const s = load().symbolen[id];
  return s ? { file: path.join(SYMBOLEN, `${id}.${s.ext}`), ext: s.ext } : null;
}

function fase(eten) {
  let f = 0;
  while (f + 1 < FASEN.length && eten >= FASEN[f + 1]) f++;
  return f;
}
function draak() {
  const d = load();
  const f = fase(d.eten);
  const van = FASEN[f], tot = FASEN[f + 1];
  return { naam: d.draakNaam, eten: d.eten, fase: f + 1, fasen: FASEN.length, tot: tot ? Math.round(((d.eten - van) / (tot - van)) * 100) : 100 };
}
function noemDraak(naam) {
  load().draakNaam = String(naam || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  save();
  return draak();
}
// Het klasdraakje eet bij elk goed antwoord. Zegt of het net een fase groeide.
function voer(n = 1) {
  const d = load();
  const voor = fase(d.eten);
  d.eten += Math.max(0, Math.min(20, Math.round(n) || 0));
  save();
  return fase(d.eten) > voor;
}

// ---------- De les die nu loopt ----------
// Er loopt hooguit één Junior-les tegelijk. Per kind: hoeveel opdrachten, hoeveel meteen goed, en of het al geweest is.
let les = null;
function nieuweKring() { return { vraag: 0, keuzes: {} }; }

function niveausVan(s) {
  return s.id === 'eigen' ? load().sets.map(x => x.naam) : s.niveaus;
}
function start({ spel, niveau, manier } = {}) {
  const s = SPEL[spel];
  if (!s) throw new Error('Kies een spel.');
  if (s.id === 'eigen' && !load().sets.length) throw new Error('Maak eerst een reeks vragen bij Maken.');
  const n = Math.max(0, Math.min(niveausVan(s).length - 1, Number(niveau) || 0));
  const m = s.bordAlleen ? 'bord' : MANIEREN.includes(manier) ? manier : 'beurt';
  les = { spel: s.id, niveau: n, manier: m, seed: Math.floor(Math.random() * 1e9), sinds: Date.now(), kinderen: {}, teams: [0, 0, 0, 0], kring: nieuweKring() };
  return stand();
}
function stop() {
  logboek.flush();
  les = null;
}
function stand() {
  if (!les) return { actief: false, draak: draak(), voorlezen: instellingen().voorlezen };
  const s = SPEL[les.spel];
  return {
    actief: true, spel: les.spel, naam: s.naam, niveau: les.niveau, niveauNaam: niveausVan(s)[les.niveau], manier: les.manier, seed: les.seed,
    eigen: les.spel === 'eigen' ? load().sets[les.niveau] || null : undefined,
    perRonde: instellingen().perRonde, voorlezen: instellingen().voorlezen, teams: les.teams, kring: { vraag: les.kring.vraag }, draak: draak(),
  };
}
// Voor de leerkracht: per kind hoe het gaat. Bezig = nu op een tablet ingelogd.
function overzicht(bezig = new Set()) {
  return kinderen().map(k => {
    const p = les && les.kinderen[k.id];
    return { ...k, bezig: bezig.has(k.id), gedaan: p ? p.gedaan : 0, goed: p ? p.goed : 0, rondes: p ? p.rondes : 0 };
  });
}

// Een kind antwoordde (meteen goed of niet). Na elke ronde van 5: een sticker.
// Apart oefenen (een ondersteuner met één kind, los van de klas): het spel en niveau komen van de tablet.
const apartTel = new Map();
function antwoord(id, { vraag, juist, apart } = {}) {
  const eigen = apart && SPEL[apart.spel] ? { spel: apart.spel, niveau: Math.max(0, Math.min(niveausVan(SPEL[apart.spel]).length - 1, Number(apart.niveau) || 0)) } : null;
  if (!les && !eigen) throw new Error('Er loopt geen spel.');
  const kind = kinderen().find(k => k.id === id);
  if (!kind) throw new Error('Tik op je dier.');
  const p = eigen
    ? (apartTel.get(`${id}:${eigen.spel}`) || apartTel.set(`${id}:${eigen.spel}`, { gedaan: 0, goed: 0, rondes: 0 }).get(`${id}:${eigen.spel}`))
    : (les.kinderen[id] || (les.kinderen[id] = { gedaan: 0, goed: 0, rondes: 0 }));
  p.gedaan++;
  if (juist) p.goed++;
  const s = SPEL[eigen ? eigen.spel : les.spel];
  const niveau = eigen ? eigen.niveau : les.niveau;
  if (!s.geenFout) logboek.answer(`Junior · ${s.naam}`, `LANcelot Junior · ${niveausVan(s)[niveau]}${eigen ? ' · apart' : ''}`, kind.naam, { question: String(vraag || s.naam).slice(0, 160), doel: '' }, !!juist);
  // De opvolging: per kind en per spel hoeveel opdrachten, hoeveel meteen goed, en wanneer het laatst.
  if (!s.geenFout && s.id !== 'raadsel') {
    const v = load().voortgang;
    const rij = v[id] || (v[id] = {});
    const c = rij[s.id] || (rij[s.id] = { n: 0, g: 0, t: '' });
    c.n++;
    if (juist) c.g++;
    c.t = new Date().toISOString().slice(0, 10);
  }
  const gegroeid = juist ? voer(1) : false;
  let sticker = null;
  // Het raadsel van vandaag: na de derde opdracht een sticker, maar maar één keer per dag.
  const vandaag = new Date().toISOString().slice(0, 10);
  const raadsel = eigen && eigen.spel === 'raadsel';
  const verdiend = raadsel
    ? p.gedaan % RAADSEL_VRAGEN === 0 && load().raadsel[id] !== vandaag
    : p.gedaan % (eigen ? PER_RONDE : instellingen().perRonde) === 0;
  if (raadsel && verdiend) load().raadsel[id] = vandaag;
  if (verdiend) {
    p.rondes++;
    sticker = 1 + Math.floor(Math.random() * STICKERS);
    const d = load();
    (d.stickers[id] = d.stickers[id] || []).push(sticker);
    if (d.stickers[id].length > 500) d.stickers[id] = d.stickers[id].slice(-500);
    save();
  }
  return { sticker, gegroeid, draak: draak() };
}

// Op het bord: een team antwoordde goed.
function teamGoed(team) {
  if (!les) throw new Error('Er loopt geen spel.');
  const t = Number(team);
  if (!(t >= 0 && t < 4)) throw new Error('Onbekend team.');
  les.teams[t]++;
  return { gegroeid: voer(1), draak: draak(), teams: les.teams };
}
// Na de bewegingsdans of een kringgesprek krijgt het draakje een beloning voor de hele klas.
function klasBeloning(n) {
  return { gegroeid: voer(n), draak: draak() };
}

// Opvolging voor de leerkracht: elk kind, elk spel (zonder de samen-spelletjes en het raadsel).
function voortgang() {
  const d = load();
  const spellen = SPELLEN.filter(s => !s.geenFout && !s.bordAlleen && !s.verborgen).map(({ id, naam, beeld, groep }) => ({ id, naam, beeld, groep }));
  return { kinderen: kinderen().map(({ id, naam, beeld, stickers: st }) => ({ id, naam, beeld, stickers: st })), spellen, cellen: d.voortgang };
}

// ---------- Eigen vragen (blok Maken) ----------
// Een reeks: { id, naam, vragen: [{ vraag, opties: [{ e: emoji, w: woord }], juist }] }. Elke vraag heeft 2 tot 4 opties.
const MAX_SETS = 40;
const MAX_VRAGEN = 30;
const kort = (x, n) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n);
function schoonSet(set = {}) {
  const naam = kort(set.naam, 40);
  if (!naam) throw new Error('Geef de reeks een naam.');
  const vragen = (Array.isArray(set.vragen) ? set.vragen : []).map(v => {
    const opties = (Array.isArray(v && v.opties) ? v.opties : []).map(o => ({ e: kort(o && (o.e || o.emoji), 16), w: kort(o && (o.w || o.woord), 30) }))
      .filter(o => o.e || o.w).slice(0, 4);
    const juist = Math.max(0, Math.min(opties.length - 1, Number(v && v.juist) || 0));
    return { vraag: kort(v && v.vraag, 160), opties, juist };
  }).filter(v => v.vraag && v.opties.length >= 2).slice(0, MAX_VRAGEN);
  if (!vragen.length) throw new Error('Zet minstens één vraag met twee antwoorden in de reeks.');
  return { id: kort(set.id, 20) || Date.now().toString(36), naam, vragen };
}
function sets() { return load().sets; }
function bewaarSet(set) {
  const s = schoonSet(set);
  const d = load();
  const i = d.sets.findIndex(x => x.id === s.id);
  if (i >= 0) d.sets[i] = s;
  else {
    if (d.sets.length >= MAX_SETS) throw new Error(`Je hebt al ${MAX_SETS} reeksen. Wis er eerst een.`);
    d.sets.push(s);
  }
  save();
  return d.sets;
}
function wisSet(id) {
  const d = load();
  if (les && les.spel === 'eigen') throw new Error('Stop eerst het spel dat nu loopt.');
  d.sets = d.sets.filter(x => x.id !== id);
  save();
  return d.sets;
}
const TAALNAAM = { nl: 'Nederlands (Vlaams)', en: 'English', fr: 'français', es: 'español', de: 'Deutsch' };
function eigenPrompt({ onderwerp, aantal, taal: t } = {}) {
  const ond = kort(onderwerp, 200);
  if (!ond) throw new Error('Typ eerst een onderwerp, bijvoorbeeld: de herfst.');
  const n = Math.max(3, Math.min(MAX_VRAGEN, Number(aantal) || 8));
  return `Je maakt vragen voor jonge kinderen van 5 tot 8 jaar (kleuterklas tot 2e leerjaar) die nog niet of nauwelijks lezen.
Onderwerp: ${ond}
Taal van de vragen: ${TAALNAAM[t] || TAALNAAM.nl}

Maak ${n} korte vragen. Elke vraag wordt voorgelezen, dus schrijf ze zoals een leerkracht ze zegt: kort, eenvoudig en vriendelijk.
Elke vraag heeft 3 antwoorden. Elk antwoord is één duidelijke emoji en één kort woord (de emoji moet het woord tonen, kinderen kiezen op de prent).
Precies één antwoord is juist. Wissel de plaats van het juiste antwoord af. Geen strikvragen, geen negatieve vragen.

Geef ALLEEN deze JSON, zonder uitleg en zonder codeblok:
{"naam": "korte titel van de reeks", "vragen": [{"vraag": "Welk dier zegt miauw?", "opties": [{"emoji": "🐶", "woord": "hond"}, {"emoji": "🐱", "woord": "kat"}, {"emoji": "🐮", "woord": "koe"}], "juist": 1}]}
"juist" is de plaats van het juiste antwoord (0, 1 of 2).`;
}
function leesEigen(data) {
  const s = schoonSet({ naam: data && data.naam, vragen: data && data.vragen });
  delete s.id;
  return s;
}

function stickers(id) {
  return (load().stickers[id] || []).slice(-60);
}

// Kringvragen: elk kind kiest een prent. Het bord toont hoeveel kinderen elke prent kozen (nooit wie).
function kringKies(id, keuze) {
  if (!les || les.spel !== 'kring') throw new Error('Er loopt geen kringgesprek.');
  if (!kinderen().some(k => k.id === id)) throw new Error('Tik op je dier.');
  les.kring.keuzes[id] = Math.max(0, Math.min(5, Number(keuze) || 0));
  return kringStand();
}
function kringStand() {
  if (!les || les.spel !== 'kring') return null;
  const tel = [0, 0, 0, 0, 0, 0];
  for (const k of Object.values(les.kring.keuzes)) tel[k]++;
  return { vraag: les.kring.vraag, tel, aantal: Object.keys(les.kring.keuzes).length };
}
function kringVolgende(stap = 1) {
  if (!les || les.spel !== 'kring') throw new Error('Er loopt geen kringgesprek.');
  les.kring = { vraag: Math.max(0, les.kring.vraag + (stap < 0 ? -1 : 1)), keuzes: {} };
  return kringStand();
}

// De inhoud (zinnen, woorden, geluiden...) in de taal van LANcelot.
function inhoud(taalId) {
  const id = ['en', 'fr', 'es', 'de'].includes(taalId) ? taalId : 'nl';
  return require(id === 'nl' ? './junior-inhoud' : `./junior-inhoud-${id}`);
}

module.exports = {
  SPELLEN, FASEN, PER_RONDE, RONDES, DIEREN, instellingen, zetInstellingen, STICKERS, DIER_GROEI, dierFase,
  kinderen, wisselDier, zetSymbool, symboolBestand, draak, noemDraak, start, stop, stand, overzicht, antwoord, teamGoed, klasBeloning, stickers,
  kringKies, kringStand, kringVolgende, inhoud, fase, niveausVan,
  voortgang, sets, bewaarSet, wisSet, eigenPrompt, leesEigen,
  get actief() { return !!les; },
};
