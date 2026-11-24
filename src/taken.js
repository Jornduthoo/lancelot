// Taken: de leerkracht geeft een oefenblad, een quiz of een toets (De Proef) aan één leerling, een paar leerlingen of de hele klas.
// Elke leerling werkt eraan in de klas, op zijn eigen toestel, in zijn eigen tempo en op zijn eigen niveau
// (zoals in Mijn klas, per vak). Er hoeft geen spel te lopen. De leerkracht ziet live wie bezig of klaar is.
// Een taak bewaart een kopie van het blad of de quiz: later iets aanpassen of wissen breekt een lopende taak niet.
// Alles staat in taken/taken.json bij de gegevens (in .gitignore), alleen op deze pc.
// Met Mijn lesmap gaat elke gegeven taak (zonder het werk van de leerlingen) als bestand in taken/plan mee naar de
// andere pc: thuis klaarzetten, en op het digibord staat ze klaar. Het werk en de voortgang blijven op de pc waar
// de leerlingen werken.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const toestellen = require('./toestellen');
const doelen = require('./doelen');
const logboek = require('./logboek');
const sheets = require('./oefenbladen');
const quizzes = require('./quizzes');
const proeven = require('./proeven');
const K = proeven.K;
const zonnewijzer = require('./zonnewijzer');
const { NAMES } = require('./niveaus');

const DIR = () => gegevens.pad('taken');
const FILE = () => path.join(DIR(), 'taken.json');
const PLAN = () => path.join(DIR(), 'plan');
// De stand van de leerlingen per taak, voor je andere pc's (via Mijn lesmap): één bestand per taak en per pc
// (<taak>@<pc>.json). Alleen de pc waar de leerlingen werken schrijft het; de andere pc's lezen het en tonen het.
const STAND = () => path.join(DIR(), 'stand');
const PC = String(process.env.LANCELOT_PC || require('os').hostname() || 'pc').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || 'pc';
const MAX = 80; // daarboven vallen de oudste afgesloten taken weg
const SAVE_MS = 1000;
// Tegen gokken bij meteen verbeteren, zoals bij het oefenblad live: na een fout keuzeantwoord even wachten.
const WRONG_MS = 3000;
// Een quiz kan de leerling ook alleen spelen in een spel zonder tegenstanders (solo.js). Zonder spel: vraag per vraag.
// De keuzelijst daarvoor staat in taken.html. Per spel: de naam en het icoon (public/img/icons).
const SOLO = {
  toren: ['De prinses in de toren', 'toren'], schat: ['Schattenjacht', 'schattenjacht'], pixel: ['Pixelridder', 'pixelridder'],
  diep: ['Diepboor', 'diepboor'], vlucht: ['Neonvlucht', 'neonvlucht'], robomol: ['Robomol', 'robomol'],
  raket: ['Raketridder', 'raketridder'], zwaard: ['Splijtzwaard', 'splijtzwaard'], wankel: ['Wankelwagen', 'wankelwagen'], plasma: ['Plasmapoort', 'plasmapoort'], tuimel: ['Tuimelridder', 'tuimelridder'], hooi: ['Hooibergjacht', 'hooibergjacht'], zwerm: ['Zwermwacht', 'zwermwacht'], haak: ['Haakridder', 'haakridder'], kegel: ['Kegelridder', 'kegelridder'], kolk: ['Kolkridder', 'kolkridder'],
};
const spelVan = t => (t.spel && SOLO[t.spel] ? { id: t.spel, naam: SOLO[t.spel][0], icoon: SOLO[t.spel][1], minuten: t.minuten } : null);
const MINUTEN = [3, 5, 8, 10];
const closed = field => field.kind === 'keuze' || field.kind === 'paar';
const key = naam => String(naam || '').trim().replace(/\s+/g, ' ').toLowerCase();
const clean = naam => String(naam || '').trim().replace(/\s+/g, ' ').slice(0, 20);

let data = null;
function all() {
  if (data) return data;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    data = Array.isArray(raw.taken) ? raw.taken : [];
  } catch {
    data = [];
  }
  return data;
}

// Wegschrijven gebeurt samen, hooguit eens per seconde: zo hapert niets als de hele klas tegelijk typt.
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(flush, SAVE_MS);
}
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!data) return;
  try {
    fs.mkdirSync(DIR(), { recursive: true });
    fs.writeFileSync(FILE() + '.tmp', JSON.stringify({ taken: data }) + '\n');
    fs.renameSync(FILE() + '.tmp', FILE());
  } catch (err) {
    console.error('Taken bewaren mislukt:', err.message);
  }
}
process.on('exit', flush);

function find(id) {
  const t = all().find(x => x.id === id);
  if (!t) throw new Error('Die taak bestaat niet meer.');
  return t;
}

// ---------- Inhoud ----------

// Het vak van de inhoud (uit de leerplandoelen), om het niveau per vak uit Mijn klas te kiezen.
function vakVan(soort, inhoud) {
  if (soort === 'proef') return proeven.vakVan(inhoud);
  if (soort === 'quiz') return doelen.hoofdvak(inhoud.questions.map(q => q.doel));
  return doelen.hoofdvak(['blocks', 'page', 'ridder'].flatMap(k => inhoud[k] || []).map(b => b.doel));
}

function laad(soort, file) {
  if (soort === 'quiz') return quizzes.load(file);
  if (soort === 'oefenblad') return sheets.load(file);
  if (soort === 'proef') {
    const t = proeven.load(file);
    const fout = K.problemen(t);
    if (fout.length) throw new Error(`Deze toets is nog niet af: ${fout[0]}`);
    return t;
  }
  throw new Error('Kies een oefenblad, een quiz of een toets.');
}

function niveausVan(soort, inhoud) {
  if (soort === 'proef') return K.niveausVan(inhoud);
  return soort === 'quiz' ? quizzes.niveausOf(inhoud) : sheets.niveausOf(inhoud);
}

// Het niveau waarop deze leerling de taak krijgt: zijn niveau voor dit vak, als de inhoud dat niveau heeft.
function niveauVoor(soort, inhoud, vak, naam) {
  const n = klas.niveauVoor(klas.match(naam), vak);
  const er = niveausVan(soort, inhoud);
  return er.includes(n) ? n : er.includes('schildknaap') ? 'schildknaap' : er[0];
}

// Een andere klas gekozen: eerst alles wegschrijven, dan vergeten (de nieuwe klas leest haar eigen bestanden).
gegevens.voorKlasWissel(() => { flush(); data = null; });

// Het blad op één niveau, met velden en een vaste volgorde bij verbinden (per taak en niveau).
const bladen = new Map();
function blad(t, niveau) {
  const k = `${t.id}:${niveau}`;
  if (!bladen.has(k)) {
    const s = sheets.forNiveau(t.inhoud, niveau);
    const shuffles = sheets.shufflesFor(s, k);
    bladen.set(k, { sheet: s, shuffles, fields: sheets.fields(s), view: sheets.studentView(s, shuffles) });
  }
  return bladen.get(k);
}

// Het niveau bij het geven: het vaste niveau van de taak, of het eigen niveau van de leerling.
function startNiveau(t, naam) {
  return (t.per && t.per[key(naam)]) || t.niveau || niveauVoor(t.soort, t.inhoud, t.vak, naam);
}

// De vragen van een quiz voor deze leerling, als nummers: alleen die van zijn niveau, door elkaar.
function volgordeVoor(t, naam, niveau) {
  const quiz = t.inhoud;
  if (quiz.herhaal) return quizzes.order(quiz, naam);
  if (quizzes.niveausOf(quiz).length < 2) return quizzes.order(quiz, naam);
  const eigen = quiz.questions.map((q, i) => i).filter(i => (quiz.questions[i].niveau || 'schildknaap') === niveau);
  return eigen.sort(() => Math.random() - .5);
}

// Een toets voor één leerling: de vragen van zijn niveau, in zijn eigen volgorde, met geschudde keuzes
// (zoals bij een afname op het bord). Vast per taak, leerling en niveau.
// De leerkracht kiest per taak: vragen in de volgorde van de toets (vragenVast) en keuzes van meerkeuze niet geschud
// (keuzesVast). Zonder keuze: allebei door elkaar, zoals vroeger. Een toets met "altijd in deze volgorde" blijft zo.
const toetsen = new Map();
function toets(t, w) {
  const v = vastVan(t, w);
  const k = `${t.id}:${key(w.naam)}:${w.niveau}`;
  const ck = `${k}:${v.vragenVast ? 1 : 0}${v.keuzesVast ? 1 : 0}`;
  if (!toetsen.has(ck)) {
    const lijst = K.lijstVoor(t.inhoud, w.niveau);
    const order = K.volgorde(lijst, `${k}|vragen`, !v.vragenVast && !t.inhoud.vasteVolgorde);
    const perms = {};
    for (const { id, q } of K.vragenVan(lijst)) {
      if (q.type === 'meerkeuze' && (!v.keuzesVast || q.schudden)) perms[id] = K.schud(q.opties.length, `${k}|${id}`);
      if (q.type === 'verbinden') perms[id] = K.schud(K.aantalRechts(q), `${k}|${id}`, true);
      if (q.type === 'ordenen') perms[id] = K.schud(q.items.length, `${k}|${id}`, true);
      if (q.type === 'groeperen') perms[id] = K.schud(K.groepKaarten(q).length, `${k}|${id}`, true);
    }
    toetsen.set(ck, { lijst, order, perms });
  }
  return toetsen.get(ck);
}

// Keuzes bij een toets als taak: voorlezen (uit, page, iedereen) en de volgorde. Alleen wat anders is dan vroeger.
// Bij een oefenblad (24 nov): voorlezen en punten tonen. Een oefenblad van vroeger (zonder keuzes) leest altijd voor
// en toont de punten na het inleveren; dat blijft zo. Een oefenblad blijft altijd in zijn volgorde.
const VOORLEES = ['uit', 'page', 'iedereen'];
function toetsKeuzes(t, p) {
  if (!p) return;
  if (t.soort === 'oefenblad') {
    if (VOORLEES.includes(p.voorlees)) t.voorlees = p.voorlees;
    if (typeof p.uitslag === 'boolean') t.uitslag = p.uitslag;
    return;
  }
  if (t.soort !== 'proef') return;
  if (p.voorlees === 'page' || p.voorlees === 'iedereen') t.voorlees = p.voorlees;
  if (p.vragenVast === true) t.vragenVast = true;
  if (p.keuzesVast === true) t.keuzesVast = true;
  if (p.uitslag === true) t.uitslag = true;
  if (p.beveiligd === true) t.beveiligd = true;
}
// Ziet de leerling zijn punten na het inleveren? Een oefenblad van vroeger: ja.
const puntenZien = t => (t.soort === 'oefenblad' ? t.uitslag !== false : !!t.uitslag);

// ---------- Keuzes achteraf veranderen (wens 24 nov, punt 2) ----------
// Hoe deze leerling werkt: verbeteren (oefenblad) en de volgorde (toets). Wie al begon (of de toets al open had),
// houdt wat gold toen hij begon: zo verandert er niets aan zijn werk of zijn punten. Wie nog niet begon, krijgt het nieuwe.
function vastVan(t, w) {
  if (w && w.vast) return w.vast;
  return { feedback: t.feedback, vragenVast: !!t.vragenVast, keuzesVast: !!t.keuzesVast };
}
function zetVast(t, w) {
  if (!w.vast) w.vast = vastVan(t, null);
}
// De keuzes van een gegeven taak veranderen. Voorlezen en punten tonen gelden meteen voor iedereen (ook wie al
// inleverde: punten tonen aan = de leerling ziet ze alsnog). Verbeteren en volgorde: voor wie nog niet begon.
function keuzesNaarTaak(t, p, absoluut) {
  for (const w of Object.values(t.werk)) if (w.status !== 'nieuw') zetVast(t, w);
  if (t.soort === 'oefenblad') {
    if (p.feedback === 'direct' || p.feedback === 'inleveren') t.feedback = p.feedback;
    if (VOORLEES.includes(p.voorlees)) t.voorlees = p.voorlees;
    if (typeof p.uitslag === 'boolean') t.uitslag = p.uitslag;
    return;
  }
  if (VOORLEES.includes(p.voorlees) || (absoluut && p.voorlees === null)) {
    if (p.voorlees === 'page' || p.voorlees === 'iedereen') t.voorlees = p.voorlees; else delete t.voorlees;
  }
  const vlag = (k, v) => { if (typeof v !== 'boolean') return; if (v) t[k] = true; else delete t[k]; };
  if (['schud', 'vragen', 'alles'].includes(p.volgorde)) {
    vlag('vragenVast', p.volgorde !== 'schud');
    vlag('keuzesVast', p.volgorde === 'alles');
  } else if (absoluut) {
    vlag('vragenVast', p.vragenVast);
    vlag('keuzesVast', p.keuzesVast);
  }
  vlag('uitslag', p.uitslag);
  if (absoluut) vlag('beveiligd', p.beveiligd);
}
function zetKeuzes({ id, ...p } = {}) {
  const t = find(id);
  if (t.soort === 'quiz') throw new Error('Bij een quiz is er niets in te stellen.');
  keuzesNaarTaak(t, p, false);
  t.keuzesTijd = new Date().toISOString();
  planBij(t);
  save();
  return keuzesVan(t);
}
// De keuzes zoals het venster ze toont.
function keuzesVan(t) {
  const bezig = Object.values(t.werk).filter(w => w.status !== 'nieuw').length;
  return {
    id: t.id, soort: t.soort, feedback: t.feedback, uitslag: puntenZien(t), bezig,
    voorlees: t.voorlees || (t.soort === 'oefenblad' ? 'iedereen' : 'uit'),
    volgorde: t.soort === 'proef' ? (t.keuzesVast ? 'alles' : t.vragenVast ? 'vragen' : 'schud') : 'alles',
  };
}
// Beveiligd (volledig scherm, wegklikken gemeld): ook achteraf aan of uit te zetten, voor wie nog werkt.
function zetBeveiligd({ id, aan } = {}) {
  const t = find(id);
  if (t.soort !== 'proef') throw new Error('Dit kan alleen bij een toets.');
  if (aan) t.beveiligd = true; else delete t.beveiligd;
  t.keuzesTijd = new Date().toISOString();
  if (t.plan) planBewaar(t);
  save();
  return { id: t.id, aan: !!t.beveiligd };
}
// De leerling verliet een beveiligde toets (ander tabblad of venster, volledig scherm uit, opnieuw geopend).
// Alleen een melding: zijn antwoorden blijven gewoon staan. Eén keer weggaan geeft vaak twee seintjes: één telt.
const WEG_SOORTEN = ['tab', 'scherm', 'herladen'];
function verlaat({ id, naam, soort } = {}) {
  const { t, w } = werkVan(id, naam);
  if (t.soort !== 'proef' || !t.beveiligd || t.dicht || w.status !== 'bezig') return { n: (w.weg || []).length };
  const s = WEG_SOORTEN.includes(soort) ? soort : 'tab';
  const nu = Date.now();
  w.weg = Array.isArray(w.weg) ? w.weg : [];
  const vorige = w.weg[w.weg.length - 1];
  if (vorige && vorige.ms === undefined && nu - vorige.t < 3000) return { n: w.weg.length, dubbel: true };
  w.weg.push({ t: nu, soort: s });
  if (w.weg.length > 100) w.weg.splice(0, w.weg.length - 100);
  save();
  return { n: w.weg.length, naam: w.naam, titel: t.titel, soort: s };
}
// Terug in de toets: hoelang hij weg was.
function terugIn({ id, naam } = {}) {
  const { w } = werkVan(id, naam);
  const e = (w.weg || [])[(w.weg || []).length - 1];
  if (e && e.ms === undefined) {
    e.ms = Math.max(0, Date.now() - e.t);
    save();
  }
  return { ok: true };
}
const wegVoorAfname = w => (w.weg || []).map(e => ({ t: Math.max(0, e.t - (Date.parse(w.begin) || e.t)), soort: e.soort, ...(e.ms !== undefined ? { ms: e.ms } : {}) }));
// Voorlezen aan of uit voor één leerling, ook terwijl hij werkt (zoals bij een afname op het bord).
function zetVoorlees({ id, naam, aan } = {}) {
  const t = find(id);
  if (t.soort !== 'proef') throw new Error('Voorlezen kan alleen bij een toets.');
  const w = t.werk[key(naam)];
  if (!w) throw new Error('Die leerling heeft deze taak niet.');
  const ergens = werkOveral(t, standen()).find(x => key(x.naam) === key(naam));
  if (ergens && ergens.elders) throw new Error(`${w.naam} werkt op ${ergens.elders.pc}. Zet voorlezen daar aan.`);
  w.voorlees = !!aan;
  save();
  return { naam: w.naam, aan: w.voorlees };
}
// Afwezig bij een taak: de leerling haalt ze later in. Zijn werk blijft staan; hij kan er gewoon aan verder.
function zetAfwezig({ id, naam, aan } = {}) {
  const t = find(id);
  const w = t.werk[key(naam)];
  if (!w) throw new Error('Die leerling heeft deze taak niet.');
  if (aan) w.afwezig = true; else delete w.afwezig;
  save();
  return { naam: w.naam, aan: !!w.afwezig };
}
// Voor het bord: de punten die de computer al gaf (live), de punten die hij kan geven, en wat de leerkracht nog verbetert.
function toetsStand(t, w) {
  let punten = 0, max = 0, hand = 0;
  for (const { id, q } of K.vragenVan(toets(t, w).lijst)) {
    max += K.maxVan(q) - K.handPunten(q);
    punten += Number(w.auto[id]) || 0;
    hand += K.handPunten(q);
  }
  return { punten, autoMax: max, hand, voorlees: voorleesVoor(t, w), pos: w.pos || 0 };
}

// Wat de leerling haalde, als de leerkracht dat toont na het inleveren (de open vragen tellen pas na het verbeteren).
function uitslagVoor(t, w) {
  if (!t.uitslag || w.status !== 'klaar') return null;
  let punten = 0, max = 0, hand = 0;
  for (const { id, q } of K.vragenVan(K.lijstVoor(t.inhoud, w.niveau))) {
    max += K.maxVan(q);
    punten += Number(w.auto[id]) || 0;
    hand += K.handPunten(q);
  }
  return { punten, max, hand };
}
// Leest de computer de vragen voor (🔊) bij deze leerling? 'page': wie de toets op Page maakt of in Mijn klas Page is.
function voorleesVoor(t, w) {
  // De leerkracht zette het voor deze leerling aan of uit terwijl hij werkt: dat gaat voor.
  if (typeof w.voorlees === 'boolean') return w.voorlees;
  if (t.soort === 'oefenblad' && !t.voorlees) return true;
  if (t.voorlees === 'iedereen') return true;
  if (t.voorlees !== 'page') return false;
  if (w.niveau === 'page') return true;
  const kl = klas.match(w.naam);
  return !!kl && klas.niveauVoor(kl, t.vak) === 'page';
}

function nieuwWerk(t, naam, niveau) {
  const w = { naam, niveau, status: 'nieuw', begin: null, klaar: null };
  if (t.soort === 'proef') Object.assign(w, { ruw: {}, answers: {}, auto: {}, pos: 0 });
  else if (t.soort === 'quiz') Object.assign(w, { volgorde: volgordeVoor(t, naam, niveau), antwoorden: [] });
  else Object.assign(w, { answers: {}, results: {}, first: {} });
  return w;
}

// ---------- Voor de leerkracht ----------

// Welk niveau elke leerling van de klas zou krijgen, om te tonen bij het kiezen.
function voorbeeld({ soort, file } = {}) {
  const inhoud = laad(soort, file);
  const vak = vakVan(soort, inhoud);
  const niveaus = niveausVan(soort, inhoud);
  const per = {};
  // Wie een niveau heeft dat deze inhoud niet heeft (bv. Page, maar de toets heeft geen Page-versie): dat zeggen we.
  const geenEigen = [];
  for (const naam of klas.names()) {
    per[naam] = niveauVoor(soort, inhoud, vak, naam);
    const eigen = klas.niveauVoor(klas.match(naam), vak);
    if (eigen !== per[naam]) geenEigen.push({ naam, eigen, krijgt: per[naam] });
  }
  // Wie dit vak niet bij mij volgt (of een gast is): niet aanvinken bij Hele klas.
  const niet = klas.read().leerlingen.filter(l => klas.doetNiet(l, vak)).map(l => l.naam);
  return { titel: inhoud.title, vak, niveaus, per, niet, geenEigen };
}

// De taak vooraf bekijken zoals een leerling op dit niveau ze krijgt: een gekozen bron (soort + file) of een gegeven taak (id).
function inhoud({ soort, file, id, niveau } = {}) {
  let bron;
  if (id) {
    const t = find(id);
    bron = { soort: t.soort, inhoud: t.inhoud, spel: spelVan(t) };
  } else bron = { soort, inhoud: laad(soort, file), spel: null };
  const niveaus = niveausVan(bron.soort, bron.inhoud);
  const nv = niveaus.includes(niveau) ? niveau : niveaus.includes('schildknaap') ? 'schildknaap' : niveaus[0];
  const base = { soort: bron.soort, titel: bron.inhoud.title, niveaus, niveau: nv, spel: bron.spel };
  if (bron.soort === 'proef') return { ...base, file: id ? find(id).file : file };
  if (bron.soort === 'quiz') {
    const qs = bron.inhoud.questions.filter(q => niveaus.length < 2 || (q.niveau || 'schildknaap') === nv);
    return { ...base, vragen: qs.map(q => ({ vraag: q.question, antwoorden: q.answers, correct: q.correct, uitleg: q.uitleg || '' })) };
  }
  const s = sheets.forNiveau(bron.inhoud, nv);
  const shuffles = sheets.shufflesFor(s, `voorbeeld:${nv}`);
  return { ...base, view: sheets.studentView(s, shuffles), solutions: sheets.solutions(s, shuffles) };
}

// Komt de taak uit een les van De Zonnewijzer, dan krijgt ze het doel en de succescriteria van die les mee:
// de leerling ziet dan bij de taak waarom hij oefent, en de les toont hoeveel leerlingen klaar zijn.
// Een kopie, zoals de inhoud: de les later aanpassen of doorschuiven breekt de taak niet.
const WEEK = /^\d{4}-W\d{2}$/;
const SLOT = /^[1-5]-\d{1,2}$/;
const kort = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x1f]/g, ' ').trim().slice(0, max);
function lesVan(les) {
  if (!les || !WEEK.test(String(les.week)) || !SLOT.test(String(les.slot))) return null;
  const l = zonnewijzer.week(les.week).lessen[les.slot];
  if (!l) return null;
  return schoonLes({ week: les.week, slot: les.slot, titel: l.titel, vak: l.vak, doel: l.doel, criteria: l.criteria });
}
// Een geplande taak: ze verschijnt pas bij de leerlingen vanaf dit moment ("JJJJ-MM-DDTHH:MM", tijd van deze pc).
const VANAF = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
function schoonVanaf(v) {
  return VANAF.test(String(v || '')) && Date.parse(v) > Date.now() ? String(v) : null;
}
const zichtbaar = t => !t.vanaf || Date.parse(t.vanaf) <= Date.now();
// Meerdere niveaus na elkaar: de volgende taak verschijnt pas voor een leerling als hij de vorige af heeft
// (of als die vorige afgesloten of gewist is).
function wacht(t, k) {
  if (!t.na) return false;
  const v = all().find(x => x.id === t.na);
  return !!(v && !v.dicht && v.werk[k] && v.werk[k].status !== 'klaar');
}
const voorLeerling = (t, k) => !!t.werk[k] && zichtbaar(t) && !wacht(t, k);
// Per leerling een gekozen niveau (bij het geven): alleen niveaus die de taak heeft.
function schoonPer(t, per) {
  const niveaus = niveausVan(t.soort, t.inhoud);
  const uit = {};
  if (niveaus.length > 1 && per && typeof per === 'object') for (const [n, v] of Object.entries(per)) if (niveaus.includes(v) && clean(n)) uit[key(n)] = v;
  return Object.keys(uit).length ? uit : null;
}
// Verscheen er sinds dit moment een geplande taak? (voor het seintje naar de leerlingen en het bord)
function gestartSinds(sinds) {
  const nu = Date.now();
  return all().some(t => t.vanaf && !t.dicht && Date.parse(t.vanaf) > sinds && Date.parse(t.vanaf) <= nu);
}
// Een geplande taak meteen laten verschijnen.
function startNu({ id } = {}) {
  const t = find(id);
  t.vanaf = null;
  save();
  planBewaar(t);
}
function schoonLes(l) {
  if (!l || !WEEK.test(String(l.week)) || !SLOT.test(String(l.slot))) return null;
  const les = {
    week: l.week, slot: l.slot, titel: kort(l.titel, 120), vak: kort(l.vak, 30), doel: kort(l.doel, 300),
    criteria: (Array.isArray(l.criteria) ? l.criteria : []).map(c => kort(c, 160)).filter(Boolean).slice(0, 8),
  };
  return les.titel || les.doel || les.criteria.length ? les : null;
}
// Voor de leerling: alleen het doel en de criteria.
const lesVoorLeerling = t => (t.les && (t.les.doel || t.les.criteria.length) ? { doel: t.les.doel, criteria: t.les.criteria } : null);

function maak({ soort, file, namen, feedback, spel, minuten, niveau, per, na, les, vanaf, voorlees, vragenVast, keuzesVast, uitslag, beveiligd } = {}) {
  const inhoud = laad(soort, file);
  const lijst = [...new Set((Array.isArray(namen) ? namen : []).map(clean).filter(Boolean))];
  if (!lijst.length) throw new Error('Kies minstens één leerling.');
  const vak = vakVan(soort, inhoud);
  const t = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), soort, file, titel: inhoud.title, vak,
    feedback: feedback === 'inleveren' ? 'inleveren' : 'direct', gemaakt: new Date().toISOString(), dicht: false, inhoud, werk: {},
  };
  if (soort === 'quiz' && SOLO[spel]) Object.assign(t, { spel, minuten: MINUTEN.includes(Number(minuten)) ? Number(minuten) : 5 });
  toetsKeuzes(t, { voorlees, vragenVast, keuzesVast, uitslag, beveiligd });
  t.keuzesTijd = t.gemaakt;
  const uitLes = lesVan(les);
  if (uitLes) t.les = uitLes;
  const start = schoonVanaf(vanaf);
  if (start) t.vanaf = start;
  // De leerkracht kan iedereen op één niveau zetten (bv. de hele klas eens Page), anders elk zijn eigen niveau.
  if (niveausVan(soort, inhoud).length > 1 && niveausVan(soort, inhoud).includes(niveau)) t.niveau = niveau;
  const eigen = schoonPer(t, per);
  if (eigen) t.per = eigen;
  if (typeof na === 'string' && all().some(x => x.id === na)) t.na = na;
  for (const naam of lijst) t.werk[key(naam)] = nieuwWerk(t, naam, startNiveau(t, naam));
  bewaarNieuw(t);
  planBewaar(t);
  return t;
}

function bewaarNieuw(t) {
  const list = all();
  list.unshift(t);
  // Niet eindeloos bijhouden: de oudste afgesloten taken vallen weg (hun antwoorden staan in het logboek).
  while (list.length > MAX) {
    const i = list.map(x => x.dicht).lastIndexOf(true);
    planWeg(list.splice(i >= 0 ? i : list.length - 1, 1)[0].id);
  }
  save();
}

// ---------- Mee met Mijn lesmap ----------

// De taak zoals ze gegeven werd: wat, voor wie en hoe. Geen antwoorden, geen voortgang.
function planBewaar(t) {
  try {
    fs.mkdirSync(PLAN(), { recursive: true });
    const plan = {
      id: t.id, soort: t.soort, file: t.file, titel: t.titel, vak: t.vak, feedback: t.feedback, gemaakt: t.gemaakt,
      spel: t.spel || null, minuten: t.minuten || null, niveau: t.niveau || null, les: t.les || null, vanaf: t.vanaf || null,
      per: t.per || null, na: t.na || null,
      // Wanneer er voor het laatst een leerling bij kwam of weg ging: de laatste wijziging wint, op elke pc.
      namenTijd: t.namenTijd || null,
      // Afgesloten of open, met wanneer: zo sluit een taak op al je pc's (de laatste wijziging wint).
      dicht: !!t.dicht, dichtTijd: t.dichtTijd || null,
      voorlees: t.voorlees || null, vragenVast: !!t.vragenVast, keuzesVast: !!t.keuzesVast, uitslag: puntenZien(t), beveiligd: !!t.beveiligd,
      // Wanneer de keuzes (voorlezen, punten tonen…) voor het laatst veranderden. Een plan zonder dit is van vroeger:
      // dan krijgt een oefenblad de keuzes van vroeger (altijd voorlezen, punten tonen).
      keuzesTijd: t.keuzesTijd || null,
      namen: Object.values(t.werk).map(w => w.naam), inhoud: t.inhoud,
    };
    fs.writeFileSync(path.join(PLAN(), `${t.id}.json`), JSON.stringify(plan) + '\n');
    t.plan = true;
  } catch (err) {
    console.error('Taak voor de lesmap bewaren mislukt:', err.message);
  }
}

// Een wijziging ook in het plan in Mijn lesmap zetten. Ook als t.plan (nog) niet gezet is maar er wel een plan
// bestaat (een oudere taak): anders zet het oude plan bij de volgende sync alles terug.
const heeftPlan = t => t.plan || fs.existsSync(path.join(PLAN(), `${t.id}.json`));
function planBij(t) {
  if (heeftPlan(t)) planBewaar(t);
}

// Afsluiten of heropenen: onthouden wanneer, en het plan in Mijn lesmap bijwerken.
function zetDicht(t, dicht, tijd = new Date().toISOString()) {
  t.dicht = !!dicht;
  t.dichtTijd = tijd;
  planBij(t);
}

function planWeg(id) {
  try { fs.unlinkSync(path.join(PLAN(), `${id}.json`)); } catch {}
}

function planGeldig(p) {
  if (!p || typeof p.id !== 'string' || !/^[a-z0-9]{4,20}$/.test(p.id)) throw new Error('Ongeldige taak.');
  if (!['quiz', 'oefenblad', 'proef'].includes(p.soort) || !p.inhoud || typeof p.inhoud !== 'object' || !Array.isArray(p.namen)) throw new Error('Ongeldige taak.');
}

// Na het synchroniseren: nieuwe taken uit de lesmap klaarzetten, en taken die aan de andere kant gewist zijn ook hier
// weghalen, maar alleen zolang hier nog niemand eraan begon (wat leerlingen deden, gaat nooit verloren).
// Geeft terug of er iets veranderde.
function uitLesmap() {
  let plannen = [];
  try { plannen = fs.readdirSync(PLAN()).filter(n => /^[a-z0-9]+\.json$/.test(n)); } catch {}
  const ids = new Set();
  let veranderd = false;
  let per = null;
  for (const naam of plannen) {
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(PLAN(), naam), 'utf8')); planGeldig(p); } catch { continue; }
    if (`${p.id}.json` !== naam) continue;
    ids.add(p.id);
    let t = all().find(x => x.id === p.id);
    // Een taak die hier al bestond zonder t.plan (een oudere taak), terwijl er wel een plan is: vanaf nu hoort ze bij dat plan.
    const nieuwPlan = !!t && !t.plan;
    if (nieuwPlan) { t.plan = true; veranderd = true; }
    if (!t) {
      t = {
        id: p.id, soort: p.soort, file: p.file, titel: String(p.titel || p.inhoud.title || 'Taak'), vak: p.vak || '',
        feedback: p.feedback === 'inleveren' ? 'inleveren' : 'direct', gemaakt: p.gemaakt || new Date().toISOString(), dicht: !!p.dicht,
        inhoud: p.inhoud, werk: {}, plan: true, uitLesmap: true,
      };
      if (typeof p.dichtTijd === 'string' && Date.parse(p.dichtTijd)) t.dichtTijd = p.dichtTijd;
      if (p.soort === 'quiz' && SOLO[p.spel]) Object.assign(t, { spel: p.spel, minuten: MINUTEN.includes(p.minuten) ? p.minuten : 5 });
      if (t.soort !== 'oefenblad' || p.keuzesTijd) toetsKeuzes(t, p);
      if (typeof p.keuzesTijd === 'string' && Date.parse(p.keuzesTijd)) t.keuzesTijd = p.keuzesTijd;
      if (niveausVan(t.soort, t.inhoud).includes(p.niveau) && niveausVan(t.soort, t.inhoud).length > 1) t.niveau = p.niveau;
      const eigen = schoonPer(t, p.per);
      if (eigen) t.per = eigen;
      if (typeof p.na === 'string' && /^[a-z0-9]+$/.test(p.na)) t.na = p.na;
      const les = schoonLes(p.les);
      if (les) t.les = les;
      const start = schoonVanaf(p.vanaf);
      if (start) t.vanaf = start;
      if (typeof p.namenTijd === 'string' && Date.parse(p.namenTijd)) t.namenTijd = p.namenTijd;
      bewaarNieuw(t);
      veranderd = true;
    } else if (typeof p.dichtTijd === 'string' && Date.parse(p.dichtTijd) && !!p.dicht !== !!t.dicht
      && (!t.dichtTijd || Date.parse(p.dichtTijd) > Date.parse(t.dichtTijd))) {
      // Op een andere pc afgesloten (of heropend), en dat is het laatste wat er gebeurde. Afsluiten gaat zoals hier:
      // wie nog bezig is, levert in wat er staat. Het werk van de leerlingen blijft altijd bewaard.
      if (p.dicht) for (const w of Object.values(t.werk)) if (w.status === 'bezig') inleverenWerk(t, w);
      t.dicht = !!p.dicht;
      t.dichtTijd = p.dichtTijd;
      veranderd = true;
    } else if (p.dicht === undefined && t.dicht) {
      // Een plan van vóór deze versie (zonder dicht) bij een taak die hier al afgesloten is: alsnog doorgeven,
      // zodat ze ook op je andere pc's sluit.
      t.dichtTijd = t.dichtTijd || new Date().toISOString();
      planBewaar(t);
      veranderd = true;
    } else if (t.dichtTijd && !!p.dicht !== !!t.dicht && !(Date.parse(p.dichtTijd) >= Date.parse(t.dichtTijd))) {
      // Hier later afgesloten of heropend dan wat de lesmap zegt (twee pc's tegelijk): onze stand terug in het plan.
      planBewaar(t);
    }
    // De keuzes (voorlezen, punten tonen, volgorde…): achteraf veranderd op een andere pc, en dat is het laatste: ook hier.
    // Hier later veranderd dan het plan zegt: onze keuzes terug in het plan. Een plan van vroeger (zonder tijd) zegt niets.
    const kPlan = Date.parse(p.keuzesTijd) || 0, kHier = Date.parse(t.keuzesTijd) || 0;
    if (kPlan > kHier && t.soort !== 'quiz') {
      keuzesNaarTaak(t, { ...p, feedback: p.feedback, voorlees: p.voorlees === undefined ? null : p.voorlees }, true);
      t.keuzesTijd = p.keuzesTijd;
      veranderd = true;
    } else if (kHier > kPlan && kPlan) planBewaar(t);
    // Wie in de taak zit: is de laatste wijziging hier gebeurd (of het plan oud en hier niet bijgewerkt), dan geldt
    // onze lijst en gaat die in het plan. Zo komt een weggehaalde leerling niet terug uit een oud plan.
    const tPlan = Date.parse(p.namenTijd) || 0, tHier = Date.parse(t.namenTijd) || 0;
    const onzeNamen = tHier > tPlan || (nieuwPlan && tHier >= tPlan);
    if (tPlan > tHier) { t.namenTijd = p.namenTijd; veranderd = true; }
    // De niveaus: wat het plan zegt (iedereen één niveau, of een eigen niveau per leerling) geldt ook hier, en wie nog niet
    // begon, krijgt het niveau dat nu bij hem hoort (ook als de niveaus van de klaslijst pas later binnenkwamen).
    // (Een oud plan dat hier nooit bijgewerkt werd, zegt niets over de niveaus: dan gelden die van hier.)
    if (!nieuwPlan && niveausVan(t.soort, t.inhoud).length > 1) {
      const nv = niveausVan(t.soort, t.inhoud).includes(p.niveau) ? p.niveau : null;
      const eigen = schoonPer(t, p.per);
      if ((t.niveau || null) !== nv) { if (nv) t.niveau = nv; else delete t.niveau; veranderd = true; }
      if (JSON.stringify(t.per || null) !== JSON.stringify(eigen)) { if (eigen) t.per = eigen; else delete t.per; veranderd = true; }
      for (const [k, w] of Object.entries(t.werk)) {
        if (w.status !== 'nieuw' || w.poging || w.begin) continue;
        const moet = startNiveau(t, w.naam);
        if (moet === w.niveau) continue;
        if (!per) per = standen();
        if ((per.get(t.id) || []).some(s => s.werk[k] && RANG[s.werk[k].status])) continue;
        t.werk[k] = nieuwWerk(t, w.naam, moet);
        veranderd = true;
      }
    }
    if (onzeNamen) { planBewaar(t); continue; }
    // Wie er aan de andere kant bij kwam, komt er hier ook bij (alleen wie op deze klaslijst staat).
    for (const n of p.namen.map(clean).filter(Boolean)) {
      if (t.werk[key(n)] || !klas.match(n)) continue;
      t.werk[key(n)] = nieuwWerk(t, klas.match(n).naam, startNiveau(t, n));
      veranderd = true;
    }
    // Wie niet (meer) in het plan staat (aan de andere kant weggehaald), gaat hier ook weg, maar alleen zolang hij
    // nergens begon: niet hier en niet op een andere pc. Anders telde hij bij "Nog niet af" voor een taak die hij niet heeft.
    const inPlan = new Set(p.namen.map(clean).filter(Boolean).map(key));
    for (const [k, w] of Object.entries(t.werk)) {
      if (inPlan.has(k) || inPlan.has(key(w.naam)) || w.status !== 'nieuw' || w.poging) continue;
      if (!per) per = standen();
      if ((per.get(t.id) || []).some(s => s.werk[k] && RANG[s.werk[k].status])) continue;
      delete t.werk[k];
      veranderd = true;
    }
    // Een oud plan dat we net overnamen: meteen bijwerken met wat hier geldt (de niveaus van hier).
    if (nieuwPlan) planBewaar(t);
  }
  const list = all();
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    if (!t.plan || ids.has(t.id)) continue;
    if (Object.values(t.werk).every(w => w.status === 'nieuw')) list.splice(i, 1);
    else t.plan = false;
    veranderd = true;
  }
  if (veranderd) save();
  return veranderd;
}

// Er later nog leerlingen bij zetten.
function voegToe({ id, namen } = {}) {
  const t = find(id);
  let n = 0;
  for (const naam of (Array.isArray(namen) ? namen : []).map(clean).filter(Boolean)) {
    if (t.werk[key(naam)]) continue;
    t.werk[key(naam)] = nieuwWerk(t, naam, startNiveau(t, naam));
    n++;
  }
  if (n) t.namenTijd = new Date().toISOString();
  if (t.dicht) zetDicht(t, false);
  else if (n) planBij(t);
  save();
  return n;
}

// Een leerling weghalen uit een taak (een vergissing bij het toewijzen).
function haalWeg({ id, naam } = {}) {
  const t = find(id);
  if (!t.werk[key(naam)]) return;
  delete t.werk[key(naam)];
  t.namenTijd = new Date().toISOString();
  // Ook in het plan: zo verdwijnt hij ook op je andere pc's uit de taak.
  planBij(t);
  save();
}

// De leerkracht zet een leerling op een ander niveau. Wat hij al deed, vervalt: het is een ander blad.
function zetNiveau({ id, naam, niveau } = {}) {
  const t = find(id);
  const w = t.werk[key(naam)];
  if (!w) throw new Error('Die leerling heeft deze taak niet.');
  if (!niveausVan(t.soort, t.inhoud).includes(niveau)) throw new Error('Dat niveau bestaat niet voor deze taak.');
  t.werk[key(naam)] = nieuwWerk(t, w.naam, niveau);
  // Onthouden als keuze voor deze leerling, en mee in Mijn lesmap: zo krijgt hij dit niveau ook op je andere pc's.
  t.per = { ...(t.per || {}), [key(naam)]: niveau };
  planBij(t);
  save();
}

// Afsluiten: wie al begonnen was, levert in (zoals het er nu staat). Wie nog niet begon, telt niet mee.
function sluit(id) {
  const t = find(id);
  for (const w of Object.values(t.werk)) if (w.status === 'bezig') inleverenWerk(t, w);
  zetDicht(t, true);
  save();
}

// Oude taken opruimen: open taken van meer dan `dagen` geleden afsluiten. Ze blijven bij Afgesloten (niets gaat weg).
// Een taak waar nog iemand aan bezig is, laten we open: die leerling werkt misschien nog verder.
function ruimOp({ dagen = 7 } = {}) {
  const grens = Date.now() - Math.max(1, Number(dagen) || 7) * 864e5;
  let n = 0, bezig = 0;
  for (const t of all()) {
    if (t.dicht || !zichtbaar(t) || Date.parse(t.vanaf || t.gemaakt) >= grens) continue;
    if (Object.values(t.werk).some(w => w.status === 'bezig')) { bezig++; continue; }
    zetDicht(t, true);
    n++;
  }
  if (n) save();
  return { n, bezig };
}

// Weer openzetten: voor één leerling (die werkt verder met wat er al stond) of de hele taak.
// Met opnieuw begint die leerling met een leeg blad; bij een toets gaat zijn vorige inzending uit de afname.
function heropen({ id, naam, opnieuw } = {}) {
  const t = find(id);
  if (t.dicht) zetDicht(t, false);
  if (naam) {
    const w = t.werk[key(naam)];
    if (!w) throw new Error('Die leerling heeft deze taak niet.');
    if (opnieuw === true) {
      const nw = nieuwWerk(t, w.naam, w.niveau);
      // Een oefenblad staat al in het logboek: niet nog eens.
      if (w.gelogd) nw.gelogd = true;
      nw.poging = (w.poging || 0) + 1;
      t.werk[key(naam)] = nw;
      if (t.soort === 'proef') uitAfname(t, w.naam);
    } else if (w.status === 'klaar') {
      w.status = 'bezig';
      w.klaar = null;
    }
  }
  save();
}

// Een leerling uit de afname van een taak halen (hij begint opnieuw).
function uitAfname(t, naam) {
  const rec = afnameVan(t);
  if (!rec) return;
  try {
    rec.spelers = rec.spelers.filter(s => key(s.naam) !== key(naam));
    // Onthouden dat hij eruit ging: anders brengt een andere pc hem via de lesmap terug.
    rec.weg = { ...(rec.weg || {}), [key(naam)]: Date.now() };
    proeven.schrijfAfname(rec);
    bijAfname(t.afname);
  } catch (err) {
    console.error('Uit de afname halen mislukt:', err.message);
  }
}

function wis(id) {
  const list = all();
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list.splice(i, 1);
  planWeg(id);
  save();
}

function voortgang(t, w) {
  // Een toets: hoeveel vragen ingevuld. Punten toont de leerling niet: de leerkracht verbetert in De Proef.
  if (t.soort === 'proef') {
    const ids = K.vragenVan(toets(t, w).lijst).map(v => v.id);
    return { gedaan: ids.filter(id => w.ruw[id] !== undefined).length, totaal: ids.length, juist: 0, score: 0 };
  }
  if (t.soort === 'quiz') {
    const juist = w.antwoorden.filter(a => a.juist).length;
    return { gedaan: w.antwoorden.length, totaal: w.volgorde.length, juist, score: w.antwoorden.length };
  }
  const { fields } = blad(t, w.niveau);
  const graded = fields.filter(f => f.kind !== 'open');
  return {
    gedaan: fields.filter(f => w.answers[f.id] !== undefined).length, totaal: fields.length,
    juist: graded.filter(f => w.results[f.id] === true).length, score: graded.length,
  };
}

// Geplande taken bovenaan, de eerstvolgende eerst; daarna de gegeven taken, de nieuwste eerst.
function volgorde(a, b) {
  if (a.vanaf || b.vanaf) return !a.vanaf ? 1 : !b.vanaf ? -1 : a.vanaf.localeCompare(b.vanaf);
  return String(b.gemaakt || '').localeCompare(String(a.gemaakt || ''));
}

// Alle taken voor het bord, zonder de inhoud.
// ---------- De stand op je andere pc's ----------
// Wat deze pc in de lesmap zet: per taak (uit of naar de lesmap) met leerlingen die begonnen, hun werk.
const standGezien = new Map();
function naarLesmapStand(adres) {
  fs.mkdirSync(STAND(), { recursive: true });
  const eigen = new Set();
  for (const t of all()) {
    if (!t.plan && !t.uitLesmap) continue;
    const werk = {};
    for (const [k, w] of Object.entries(t.werk)) if (w.status !== 'nieuw' && !w.elders) werk[k] = w;
    if (!Object.keys(werk).length) continue;
    const naam = `${t.id}@${PC}.json`;
    eigen.add(naam);
    const inhoud = JSON.stringify({ id: t.id, pc: PC, adres: adres || '', werk });
    if (standGezien.get(naam) === inhoud && fs.existsSync(path.join(STAND(), naam))) continue;
    fs.writeFileSync(path.join(STAND(), naam), JSON.stringify({ id: t.id, pc: PC, adres: adres || '', tijd: new Date().toISOString(), werk }) + '\n');
    standGezien.set(naam, inhoud);
  }
  // Een taak die hier weg is (gewist), haalt ook zijn stand weg.
  for (const naam of fs.readdirSync(STAND())) if (naam.endsWith(`@${PC}.json`) && !eigen.has(naam) && !all().some(t => naam === `${t.id}@${PC}.json`)) fs.rmSync(path.join(STAND(), naam), { force: true });
}
function standGeldig(s) {
  if (!s || typeof s.id !== 'string' || typeof s.pc !== 'string' || !s.werk || typeof s.werk !== 'object') throw new Error('Ongeldige stand.');
}
// De stand van de andere pc's, per taak.
// Elk bestand lezen we alleen opnieuw als het veranderde (grootte of tijdstip, of net veranderd).
const standMemo = new Map();
function leesStand(file) {
  const st = fs.statSync(file);
  const sleutel = `${st.size}|${st.mtimeMs}`;
  const oud = standMemo.get(file);
  if (oud && oud.sleutel === sleutel && Date.now() - st.mtimeMs > 5000) return oud.s;
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  standGeldig(s);
  standMemo.set(file, { sleutel, s });
  return s;
}
function standen() {
  const per = new Map();
  let namen = [];
  try { namen = fs.readdirSync(STAND()).filter(n => n.endsWith('.json') && !n.endsWith(`@${PC}.json`)); } catch {}
  const er = new Set(namen.map(n => path.join(STAND(), n)));
  for (const k of standMemo.keys()) if (!er.has(k)) standMemo.delete(k);
  for (const naam of namen) {
    try {
      const s = leesStand(path.join(STAND(), naam));
      if (!per.has(s.id)) per.set(s.id, []);
      per.get(s.id).push(s);
    } catch {}
  }
  return per;
}
// Hoeveel standen er van elke andere pc binnenkwamen (Instellingen › Lesmap): { pc: aantal }.
function standPerPc() {
  const uit = {};
  for (const lijst of standen().values()) for (const s of lijst) uit[s.pc] = (uit[s.pc] || 0) + 1;
  return uit;
}
// Het werk van elke leerling zoals het ergens staat: hier, of (als hij hier nog niet begon) op de pc waar hij werkt.
const RANG = { nieuw: 0, bezig: 1, klaar: 2 };
function werkOveral(t, per) {
  const lijst = per.get(t.id) || [];
  return Object.entries(t.werk).map(([k, w]) => {
    if (w.status !== 'nieuw') return w;
    let best = null;
    for (const s of lijst) {
      const r = s.werk[k];
      if (!r || !RANG[r.status]) continue;
      if (!best || RANG[r.status] > RANG[best.w.status] || (RANG[r.status] === RANG[best.w.status] && s.tijd > best.s.tijd)) best = { w: r, s };
    }
    return best ? { ...best.w, elders: { pc: toestellen.naamVan(best.s.pc), adres: best.s.adres, tijd: best.s.tijd } } : w;
  });
}
const eldersVan = (t, per) => (per.get(t.id) || []).map(s => ({ pc: toestellen.naamVan(s.pc), adres: s.adres, tijd: s.tijd }));

// Na welke taak (meerdere niveaus na elkaar): de titel en het niveau van die eerste taak.
function naInfo(id) {
  const v = all().find(x => x.id === id);
  return v ? { id, titel: v.titel, niveaus: [...new Set(Object.values(v.werk).map(w => w.niveau))] } : { id, weg: true };
}
function lijst() {
  const per = standen();
  // De afname van elke toets als taak: één keer de lijst van afnames, niet per taak opnieuw.
  let perTaak = null;
  const afnameVoor = id => {
    if (!perTaak) {
      perTaak = new Map();
      for (const a of proeven.afnames()) if (a.taak && !perTaak.has(a.taak)) perTaak.set(a.taak, a.file);
    }
    return perTaak.get(id) || null;
  };
  const ll = new Map(klas.read().leerlingen.map(l => [key(l.naam), l]));
  return all().map(t => ({
    id: t.id, soort: t.soort, file: t.soort === 'proef' ? t.file : undefined, titel: t.titel, vak: t.vak, feedback: t.feedback, gemaakt: t.gemaakt, dicht: t.dicht, spel: spelVan(t), uitLesmap: !!t.uitLesmap,
    niveaus: niveausVan(t.soort, t.inhoud), niveau: t.niveau || null, les: t.les || null, vanaf: zichtbaar(t) ? null : t.vanaf,
    dag: t.vanaf || t.gemaakt, bron: t.file, na: t.na ? naInfo(t.na) : null,
    elders: eldersVan(t, per),
    afname: t.soort === 'proef' ? (t.afname || afnameVoor(t.id)) : undefined,
    beveiligd: t.soort === 'proef' ? !!t.beveiligd : undefined,
    leerlingen: werkOveral(t, per).map(w => ({ naam: w.naam, niveau: w.niveau, status: w.status, klaar: w.klaar, elders: w.elders ? w.elders.pc : undefined,
      // Wie dit vak niet bij mij volgt (of een gast is) en wie afwezig was: telt niet mee bij "nog niet".
      ...(w.status === 'nieuw' && klas.doetNiet(ll.get(key(w.naam)), t.vak) ? { niet: true } : {}),
      ...(w.status === 'nieuw' && wacht(t, key(w.naam)) ? { wacht: true } : {}),
      ...(t.werk[key(w.naam)] && t.werk[key(w.naam)].afwezig && w.status !== 'klaar' ? { afwezig: true } : {}), ...voortgang(t, w), ...(t.soort === 'proef' ? toetsStand(t, w) : {}), ...((w.weg || []).length ? { weg: w.weg.length } : {}) }))
      .sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
  })).sort(volgorde);
}

// Een toets als taak, voor het overzicht in De Proef: wie begon, hoe ver, waar (ook op je andere pc's).
// per: de stand van de andere pc's, als die al gelezen is (voor een hele lijst afnames tegelijk).
function toetsLeerlingen(id, per) {
  const t = all().find(x => x.id === id);
  if (!t || t.soort !== 'proef') return null;
  return werkOveral(t, per || standen()).map(w => ({ naam: w.naam, status: w.status, elders: w.elders ? w.elders.pc : undefined, ...voortgang(t, w), ...toetsStand(t, w) }))
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

// Wat één leerling deed, voor het venster op het bord.
function detail({ id, naam } = {}) {
  const t = find(id);
  if (!t.werk[key(naam)]) throw new Error('Die leerling heeft deze taak niet.');
  // Werkt de leerling op een andere pc, dan tonen we zijn werk van daar (bekijken; verbeteren gebeurt daar).
  const w = werkOveral(t, standen()).find(x => key(x.naam) === key(naam));
  const base = { id, soort: t.soort, titel: t.titel, naam: w.naam, elders: w.elders || null, niveau: w.niveau, status: w.status, afwezig: !!t.werk[key(naam)].afwezig, niveaus: niveausVan(t.soort, t.inhoud), ...voortgang(t, w), ...(t.soort === 'proef' ? { weg: wegVoorAfname(w), begin: w.begin } : {}) };
  if (t.soort === 'proef') {
    // Wat de leerling invulde, met de sleutel erbij (zoals de kopie van een afname). Verbeteren gebeurt in De Proef.
    const { lijst } = toets(t, w);
    const sleutel = {};
    const zones = {};
    const punten = {};
    for (const { id: qid, q } of K.vragenVan(lijst)) {
      sleutel[qid] = q.type === 'blad' ? K.veldSleutel(q) : K.oplossing(q) || ' ';
      if (q.type === 'aanduiden') zones[qid] = q.zones;
      else if (q.type === 'markeren' && (q.per || q.inBron || q.kleuren || q.aantal)) zones[qid] = K.markeerSleutel(q);
      else if (q.type === 'blad') zones[qid] = q.velden;
      punten[qid] = [K.handPunten(q) ? null : Number(w.auto[qid]) || 0, K.maxVan(q)];
    }
    return { ...base, view: K.studentView(t.inhoud, lijst, { img: d => d }), answers: w.answers, sleutel, zones, punten, afname: (afnameVan(t) || {}).file || null };
  }
  if (t.soort === 'quiz') {
    return {
      ...base,
      vragen: w.antwoorden.map(a => {
        const q = t.inhoud.questions[a.i];
        return { vraag: q.question, gekozen: q.answers[a.keuze] ?? '(getypt)', juist: a.juist, goed: q.answers[q.correct] };
      }),
    };
  }
  const b = blad(t, w.niveau);
  return { ...base, view: b.view, answers: w.answers, results: w.results, solutions: sheets.solutions(b.sheet, b.shuffles) };
}

// ---------- Voor de leerling ----------

function werkVan(id, naam) {
  const t = find(id);
  const w = t.werk[key(naam)];
  if (!w || !zichtbaar(t)) throw new Error('Deze taak is niet voor jou.');
  if (wacht(t, key(naam))) throw new Error('Maak eerst de vorige taak af.');
  return { t, w };
}

// Mijn taken: wat nog open staat eerst, daarna wat klaar is (van de laatste twee weken).
function mijn(naam) {
  const k = key(naam);
  if (!k) throw new Error('Vul je naam in.');
  const sinds = Date.now() - 14 * 86400000;
  const lijst = all().filter(t => voorLeerling(t, k)).filter(t => {
    const w = t.werk[k];
    return (!t.dicht && w.status !== 'klaar') || Date.parse(w.klaar || t.gemaakt) > sinds;
  }).map(t => {
    const w = t.werk[k];
    const open = !t.dicht && w.status !== 'klaar';
    return { id: t.id, soort: t.soort, titel: t.titel, vak: t.vak, gemaakt: t.gemaakt, spel: spelVan(t), niveau: niveausVan(t.soort, t.inhoud).length > 1 ? w.niveau : null, status: open ? w.status : 'klaar', les: lesVoorLeerling(t), ...voortgang(t, w), ...(t.soort === 'oefenblad' && !puntenZien(t) ? { juist: 0, score: 0 } : {}) };
  });
  lijst.sort((a, b) => (a.status === 'klaar') - (b.status === 'klaar') || (a.gemaakt < b.gemaakt ? 1 : -1));
  const l = klas.match(naam);
  return { naam: l ? l.naam : clean(naam), taken: lijst };
}

// Hoeveel taken nog open staan voor deze leerling (voor het startscherm).
function aantal(naam) {
  const k = key(naam);
  return k ? all().filter(t => !t.dicht && voorLeerling(t, k) && t.werk[k].status !== 'klaar').length : 0;
}

function begin(t, w) {
  if (w.status !== 'nieuw') return;
  zetVast(t, w);
  w.status = 'bezig';
  w.begin = new Date().toISOString();
  zorgAfname(t);
}

// Een taak openen: het blad (zonder oplossingen) of de volgende vraag.
function open({ id, naam } = {}) {
  const { t, w } = werkVan(id, naam);
  const klaar = t.dicht || w.status === 'klaar';
  const base = { id, soort: t.soort, titel: t.titel, poging: w.poging || 0, spel: spelVan(t), niveau: niveausVan(t.soort, t.inhoud).length > 1 ? w.niveau : null, klaar, dicht: t.dicht, les: lesVoorLeerling(t), ...voortgang(t, w) };
  if (t.soort === 'proef') {
    if (klaar) return { ...base, uitslag: uitslagVoor(t, w) };
    // De toets staat open op zijn scherm: de volgorde ligt vast voor hem, ook als de leerkracht ze nu verandert.
    if (!w.vast) { zetVast(t, w); save(); }
    const { lijst, order, perms } = toets(t, w);
    return { ...base, intro: t.inhoud.intro || '', voorlees: voorleesVoor(t, w), beveiligd: !!t.beveiligd, bezig: w.status === 'bezig', totaal: K.totaal(lijst), view: K.studentView(t.inhoud, lijst, { order, perms, img: d => d }), answers: w.ruw, pos: w.pos || 0 };
  }
  if (t.soort === 'quiz') return { ...base, vraag: klaar ? null : vraagVoor(t, w), terug: klaar ? terugblik(t, w) : null };
  const b = blad(t, w.niveau);
  // Punten tonen uit: na het inleveren geen score en geen oplossingen (wat al groen of rood was, blijft zo).
  const zien = klaar && puntenZien(t);
  return {
    ...base, ...(puntenZien(t) ? {} : { juist: 0, score: 0 }), feedback: vastVan(t, w).feedback, view: b.view, answers: w.answers,
    results: vastVan(t, w).feedback === 'direct' || zien ? w.results : {},
    solutions: zien ? sheets.solutions(b.sheet, b.shuffles) : null,
    voorlees: voorleesVoor(t, w),
  };
}

function vraagVoor(t, w) {
  const i = w.volgorde[w.antwoorden.length];
  if (i === undefined) return null;
  const q = t.inhoud.questions[i];
  return { nr: w.antwoorden.length + 1, vraag: q.question, antwoorden: q.answers };
}

function terugblik(t, w) {
  return w.antwoorden.filter(a => !a.juist).map(a => {
    const q = t.inhoud.questions[a.i];
    return { vraag: q.question, goed: q.answers[q.correct], uitleg: q.uitleg || '' };
  });
}

function nogOpen(t, w) {
  if (t.dicht) throw new Error('Je leerkracht sloot deze taak af.');
  if (w.status === 'klaar') throw new Error('Je leverde deze taak al in.');
}

// Eén vakje van een oefenblad.
function antwoord({ id, naam, veld, waarde } = {}) {
  const { t, w } = werkVan(id, naam);
  nogOpen(t, w);
  if (t.soort !== 'oefenblad') throw new Error('Dit is geen oefenblad.');
  const { fields, shuffles } = blad(t, w.niveau);
  const field = fields.find(f => f.id === veld);
  if (!field) throw new Error('Onbekend vakje.');
  const now = Date.now();
  begin(t, w);
  const direct = vastVan(t, w).feedback === 'direct';
  const guard = direct && closed(field);
  w.lock = w.lock || {};
  if (guard && w.lock[veld] > now) return { wait: w.lock[veld] - now, id: veld, value: w.answers[veld] ?? '', error: 'Even wachten.' };
  const v = sheets.clean(field, waarde);
  if (v === '') delete w.answers[veld];
  else w.answers[veld] = v;
  w.results[veld] = sheets.grade(field, v, shuffles);
  if (closed(field) && w.first[veld] === undefined && w.results[veld] !== null) w.first[veld] = w.results[veld];
  save();
  if (!direct) return { id: veld };
  if (guard && w.results[veld] === false) {
    w.lock[veld] = now + WRONG_MS;
    return { id: veld, correct: false, wait: WRONG_MS };
  }
  return { id: veld, correct: w.results[veld] };
}

// Eén antwoord op een toets: zoals bij een afname op het bord (schoon, terug naar de echte volgorde, verbeterd).
function toetsAntwoord({ id, naam, vraag, waarde, pos } = {}) {
  const { t, w } = werkVan(id, naam);
  nogOpen(t, w);
  if (t.soort !== 'proef') throw new Error('Dit is geen toets.');
  const { lijst, perms } = toets(t, w);
  if (pos !== undefined) w.pos = Math.max(0, Math.round(Number(pos)) || 0);
  // Op Start drukken (of een andere vraag kiezen) is ook begonnen: dan ziet de leerkracht hem meteen als bezig.
  if (vraag === undefined) { if (pos !== undefined && w.status === 'nieuw') { begin(t, w); save(); } return { ok: true }; }
  const v = K.vragenVan(lijst).find(x => x.id === vraag);
  if (!v) throw new Error('Onbekende vraag.');
  begin(t, w);
  const ruw = K.schoon(v.q, waarde);
  if (ruw === null || ruw === '') {
    delete w.ruw[vraag];
    delete w.answers[vraag];
    delete w.auto[vraag];
  } else {
    w.ruw[vraag] = ruw;
    w.answers[vraag] = K.canoniek(v.q, ruw, perms[vraag]);
    const a = K.auto(v.q, w.answers[vraag]);
    if (a === null) delete w.auto[vraag];
    else w.auto[vraag] = a;
  }
  save();
  return { ok: true, ...voortgang(t, w) };
}

// Een ingeleverde toets komt bij de afname van deze taak in De Proef (Resultaten): daar verbetert de leerkracht
// de open vragen, zoals na een afname op het bord. Eén afname per taak; wie later inlevert, komt erbij.
// server.js zet bijAfname: die sluit de afname af als er niets meer met de hand te verbeteren is.
let bijAfname = () => {};
// De afname van een toets als taak: van deze pc, of (via Mijn lesmap) van een andere pc waar al iemand inleverde.
function afnameVan(t) {
  if (t.afname) try { return proeven.laadAfname(t.afname); } catch {}
  const a = proeven.afnameVanTaak(t.id);
  if (a) try { t.afname = a.file; return proeven.laadAfname(a.file); } catch {}
  return null;
}
function nieuweAfname(t) {
  const rec = { title: t.titel, datum: t.gemaakt, toetsFile: t.file, instellingen: { taak: true }, toets: t.inhoud, spelers: [], klaar: false, gelogd: false, taak: t.id };
  t.afname = proeven.bewaarAfname(rec);
  return rec;
}
// Zodra de eerste leerling begint, staat de toets al bij de resultaten in De Proef: één plek om hem op te volgen.
function zorgAfname(t) {
  if (t.soort !== 'proef' || afnameVan(t)) return;
  try { nieuweAfname(t); } catch (err) { console.error('Afname maken mislukt:', err.message); }
}
function naarAfname(t, w) {
  let rec = afnameVan(t);
  const nieuw = !rec;
  if (nieuw) rec = { title: t.titel, datum: t.gemaakt, toetsFile: t.file, instellingen: { taak: true }, toets: t.inhoud, spelers: [], klaar: false, gelogd: false, taak: t.id };
  const oud = rec.spelers.find(s => key(s.naam) === key(w.naam));
  const s = { naam: w.naam, niveau: w.niveau, antwoorden: w.answers, auto: w.auto, hand: {}, events: wegVoorAfname(w), begon: w.begin, ingeleverd: w.klaar, extra: 0, t: Date.now() };
  // Weer opengezet en opnieuw ingeleverd: wat de leerkracht al verbeterde blijft staan.
  if (oud && oud.niveau === s.niveau) Object.assign(s, { hand: oud.hand || {}, over: oud.over, vak: oud.vak, ht: oud.ht, gelogd: oud.gelogd });
  rec.spelers = rec.spelers.filter(x => x !== oud).concat(s).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  rec.klaar = false;
  rec.kt = Date.now();
  if (rec.weg) delete rec.weg[key(w.naam)];
  try {
    if (nieuw) t.afname = proeven.bewaarAfname(rec);
    else proeven.schrijfAfname(rec);
    bijAfname(t.afname);
  } catch (err) {
    console.error('Toets bij de afname zetten mislukt:', err.message);
  }
}

// Een oefenblad inleveren. Elk verbeterd vakje gaat in het logboek, met het leerplandoel van de oefening.
function inleveren({ id, naam } = {}) {
  const { t, w } = werkVan(id, naam);
  nogOpen(t, w);
  begin(t, w);
  inleverenWerk(t, w);
  save();
  return open({ id, naam });
}

function inleverenWerk(t, w) {
  w.status = 'klaar';
  w.klaar = new Date().toISOString();
  if (t.soort === 'proef') return naarAfname(t, w);
  if (t.soort !== 'oefenblad' || w.gelogd) return;
  // Na heropenen en opnieuw inleveren niet nog eens: anders telt hetzelfde blad dubbel.
  w.gelogd = true;
  const { sheet, fields } = blad(t, w.niveau);
  const tag = niveausVan(t.soort, t.inhoud).length > 1 ? `${NAMES[w.niveau]}, ` : '';
  logboek.add(fields.filter(f => f.kind !== 'open').map(f => {
    const block = sheet.blocks[f.block];
    return {
      naam: w.naam, spel: 'Taak', bron: t.titel, sessie: `taak-${t.id}`,
      vraag: `${tag}Oefening ${f.block + 1}.${Number(f.id.split('.')[1]) + 1}: ${block.instruction || (block.q && block.q.vraag) || ''}`,
      doel: block.doel, juist: w.results[f.id] === true && (vastVan(t, w).feedback !== 'direct' || w.first[f.id] !== false), leeg: w.answers[f.id] === undefined,
    };
  }));
}

// Een quizvraag beantwoorden: één poging per vraag, meteen naar het logboek.
function quizAntwoord({ id, naam, keuze } = {}) {
  const { t, w } = werkVan(id, naam);
  nogOpen(t, w);
  if (t.soort !== 'quiz') throw new Error('Dit is geen quiz.');
  const i = w.volgorde[w.antwoorden.length];
  if (i === undefined) throw new Error('Je beantwoordde alle vragen al.');
  const q = t.inhoud.questions[i];
  const k = Number(keuze);
  if (!Number.isInteger(k) || k < 0 || k >= q.answers.length) throw new Error('Kies een antwoord.');
  begin(t, w);
  const juist = k === q.correct;
  w.antwoorden.push({ i, keuze: k, juist });
  logboek.add([{ naam: w.naam, spel: 'Taak', bron: t.titel, sessie: `taak-${t.id}`, vraag: q.question, doel: q.doel, juist }]);
  if (!juist) logboek.keuze({ naam: w.naam, spel: 'Taak', bron: t.titel, vraag: q.question, doel: q.doel, gekozen: q.answers[k], juist: q.answers[q.correct] });
  const klaar = w.antwoorden.length >= w.volgorde.length;
  if (klaar) inleverenWerk(t, w);
  save();
  return { juist, goed: q.correct, uitleg: juist ? '' : q.uitleg || '', klaar, ...voortgang(t, w) };
}

// ---------- Solo in een spel ----------

// Een ronde in het spel: de vragen die de leerling nog niet beantwoordde, als een gewone quiz voor dat spel.
// nr zet een vraag van die quiz terug om naar haar nummer in de taak.
function soloRonde({ id, naam } = {}) {
  const { t, w } = werkVan(id, naam);
  nogOpen(t, w);
  if (!t.spel) throw new Error('Deze taak speel je niet in een spel.');
  const nr = w.volgorde.slice(w.antwoorden.length);
  if (!nr.length) throw new Error('Je beantwoordde alle vragen al.');
  const quiz = { title: t.titel, questions: nr.map(i => t.inhoud.questions[i]) };
  return { spel: t.spel, minuten: t.minuten, naam: w.naam, quiz, nr, ...voortgang(t, w) };
}

// Een antwoord uit het spel. Alleen de eerste poging op een vraag telt voor de taak en gaat naar het logboek
// (in het spel komt een foute vraag later terug, om te oefenen). De vragen die al beantwoord zijn, staan vooraan in de volgorde.
function soloAntwoord({ id, naam, i, keuze, juist } = {}) {
  const { t, w } = werkVan(id, naam);
  if (t.dicht || w.status === 'klaar' || t.soort !== 'quiz') return null;
  const plek = w.volgorde.indexOf(i);
  if (plek < w.antwoorden.length) return null;
  [w.volgorde[plek], w.volgorde[w.antwoorden.length]] = [w.volgorde[w.antwoorden.length], w.volgorde[plek]];
  const q = t.inhoud.questions[i];
  begin(t, w);
  w.antwoorden.push({ i, keuze: Number.isInteger(keuze) ? keuze : -1, juist: !!juist });
  logboek.add([{ naam: w.naam, spel: 'Taak', bron: t.titel, sessie: `taak-${t.id}`, vraag: q.question, doel: q.doel, juist: !!juist }]);
  const klaar = w.antwoorden.length >= w.volgorde.length;
  if (klaar) inleverenWerk(t, w);
  save();
  return { klaar, ...voortgang(t, w) };
}

// Welke toetsen als taak gegeven zijn, en wanneer (voor "Gegeven op …" in De Proef).
function toetsenGegeven() {
  const per = new Map();
  for (const t of all()) if (t.soort === 'proef' && t.file) (per.get(t.file) || per.set(t.file, []).get(t.file)).push(t.vanaf || t.gemaakt);
  return per;
}
proeven.gegevenHook = toetsenGegeven;

module.exports = { zetKeuzes, keuzesVoor: id => keuzesVan(find(id)), zetBeveiligd, verlaat, terugIn, toetsenGegeven, ruimOp, toetsLeerlingen, standen, standPerPc, toetsAntwoord, zetVoorlees, zetAfwezig, naarLesmapStand, standGeldig, get STAND() { return STAND(); }, PC, set bijAfname(fn) { bijAfname = fn; }, lesVan, gestartSinds, startNu, get PLAN() { return PLAN(); }, planGeldig, uitLesmap, SOLO, MINUTEN, soloRonde, soloAntwoord, voorbeeld, inhoud, maak, voegToe, haalWeg, zetNiveau, sluit, heropen, wis, lijst, detail, mijn, aantal, open, antwoord, inleveren, quizAntwoord, flush, get DIR() { return DIR(); } };
