// Taken: de leerkracht geeft een oefenblad of een quiz aan één leerling, een paar leerlingen of de hele klas.
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
const doelen = require('./doelen');
const logboek = require('./logboek');
const sheets = require('./oefenbladen');
const quizzes = require('./quizzes');
const { NAMES } = require('./niveaus');

const DIR = gegevens.pad('taken');
const FILE = path.join(DIR, 'taken.json');
const PLAN = path.join(DIR, 'plan');
const MAX = 80; // daarboven vallen de oudste afgesloten taken weg
const SAVE_MS = 1000;
// Tegen gokken bij meteen verbeteren, zoals bij het oefenblad live: na een fout keuzeantwoord even wachten.
const WRONG_MS = 3000;
// Een quiz kan de leerling ook alleen spelen in een spel zonder tegenstanders (solo.js). Zonder spel: vraag per vraag.
// De keuzelijst daarvoor staat in taken.html. Per spel: de naam en het icoon (public/img/icons).
const SOLO = {
  toren: ['De prinses in de toren', 'toren'], schat: ['Schattenjacht', 'schattenjacht'], pixel: ['Pixelridder', 'pixelridder'],
  diep: ['Diepboor', 'diepboor'], vlucht: ['Neonvlucht', 'neonvlucht'], robomol: ['Robomol', 'robomol'],
  raket: ['Raketridder', 'raketridder'], zwaard: ['Splijtzwaard', 'splijtzwaard'], wankel: ['Wankelwagen', 'wankelwagen'], plasma: ['Plasmapoort', 'plasmapoort'], hooi: ['Hooibergjacht', 'hooibergjacht'],
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
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
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
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify({ taken: data }) + '\n');
    fs.renameSync(FILE + '.tmp', FILE);
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
  if (soort === 'quiz') return doelen.hoofdvak(inhoud.questions.map(q => q.doel));
  return doelen.hoofdvak(['blocks', 'page', 'ridder'].flatMap(k => inhoud[k] || []).map(b => b.doel));
}

function laad(soort, file) {
  if (soort === 'quiz') return quizzes.load(file);
  if (soort === 'oefenblad') return sheets.load(file);
  throw new Error('Kies een oefenblad of een quiz.');
}

function niveausVan(soort, inhoud) {
  return soort === 'quiz' ? quizzes.niveausOf(inhoud) : sheets.niveausOf(inhoud);
}

// Het niveau waarop deze leerling de taak krijgt: zijn niveau voor dit vak, als de inhoud dat niveau heeft.
function niveauVoor(soort, inhoud, vak, naam) {
  const n = klas.niveauVoor(klas.match(naam), vak);
  const er = niveausVan(soort, inhoud);
  return er.includes(n) ? n : er.includes('schildknaap') ? 'schildknaap' : er[0];
}

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
  return t.niveau || niveauVoor(t.soort, t.inhoud, t.vak, naam);
}

// De vragen van een quiz voor deze leerling, als nummers: alleen die van zijn niveau, door elkaar.
function volgordeVoor(t, naam, niveau) {
  const quiz = t.inhoud;
  if (quiz.herhaal) return quizzes.order(quiz, naam);
  if (quizzes.niveausOf(quiz).length < 2) return quizzes.order(quiz, naam);
  const eigen = quiz.questions.map((q, i) => i).filter(i => (quiz.questions[i].niveau || 'schildknaap') === niveau);
  return eigen.sort(() => Math.random() - .5);
}

function nieuwWerk(t, naam, niveau) {
  const w = { naam, niveau, status: 'nieuw', begin: null, klaar: null };
  if (t.soort === 'quiz') Object.assign(w, { volgorde: volgordeVoor(t, naam, niveau), antwoorden: [] });
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
  for (const naam of klas.names()) per[naam] = niveauVoor(soort, inhoud, vak, naam);
  return { titel: inhoud.title, vak, niveaus, per };
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
  if (bron.soort === 'quiz') {
    const qs = bron.inhoud.questions.filter(q => niveaus.length < 2 || (q.niveau || 'schildknaap') === nv);
    return { ...base, vragen: qs.map(q => ({ vraag: q.question, antwoorden: q.answers, correct: q.correct, uitleg: q.uitleg || '' })) };
  }
  const s = sheets.forNiveau(bron.inhoud, nv);
  const shuffles = sheets.shufflesFor(s, `voorbeeld:${nv}`);
  return { ...base, view: sheets.studentView(s, shuffles), solutions: sheets.solutions(s, shuffles) };
}

function maak({ soort, file, namen, feedback, spel, minuten, niveau } = {}) {
  const inhoud = laad(soort, file);
  const lijst = [...new Set((Array.isArray(namen) ? namen : []).map(clean).filter(Boolean))];
  if (!lijst.length) throw new Error('Kies minstens één leerling.');
  const vak = vakVan(soort, inhoud);
  const t = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), soort, file, titel: inhoud.title, vak,
    feedback: feedback === 'inleveren' ? 'inleveren' : 'direct', gemaakt: new Date().toISOString(), dicht: false, inhoud, werk: {},
  };
  if (soort === 'quiz' && SOLO[spel]) Object.assign(t, { spel, minuten: MINUTEN.includes(Number(minuten)) ? Number(minuten) : 5 });
  // De leerkracht kan iedereen op één niveau zetten (bv. de hele klas eens Page), anders elk zijn eigen niveau.
  if (niveausVan(soort, inhoud).length > 1 && niveausVan(soort, inhoud).includes(niveau)) t.niveau = niveau;
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
    fs.mkdirSync(PLAN, { recursive: true });
    const plan = {
      id: t.id, soort: t.soort, file: t.file, titel: t.titel, vak: t.vak, feedback: t.feedback, gemaakt: t.gemaakt,
      spel: t.spel || null, minuten: t.minuten || null, niveau: t.niveau || null,
      namen: Object.values(t.werk).map(w => w.naam), inhoud: t.inhoud,
    };
    fs.writeFileSync(path.join(PLAN, `${t.id}.json`), JSON.stringify(plan) + '\n');
    t.plan = true;
  } catch (err) {
    console.error('Taak voor de lesmap bewaren mislukt:', err.message);
  }
}

function planWeg(id) {
  try { fs.unlinkSync(path.join(PLAN, `${id}.json`)); } catch {}
}

function planGeldig(p) {
  if (!p || typeof p.id !== 'string' || !/^[a-z0-9]{4,20}$/.test(p.id)) throw new Error('Ongeldige taak.');
  if (!['quiz', 'oefenblad'].includes(p.soort) || !p.inhoud || typeof p.inhoud !== 'object' || !Array.isArray(p.namen)) throw new Error('Ongeldige taak.');
}

// Na het synchroniseren: nieuwe taken uit de lesmap klaarzetten, en taken die aan de andere kant gewist zijn ook hier
// weghalen, maar alleen zolang hier nog niemand eraan begon (wat leerlingen deden, gaat nooit verloren).
// Geeft terug of er iets veranderde.
function uitLesmap() {
  let plannen = [];
  try { plannen = fs.readdirSync(PLAN).filter(n => /^[a-z0-9]+\.json$/.test(n)); } catch {}
  const ids = new Set();
  let veranderd = false;
  for (const naam of plannen) {
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(PLAN, naam), 'utf8')); planGeldig(p); } catch { continue; }
    if (`${p.id}.json` !== naam) continue;
    ids.add(p.id);
    let t = all().find(x => x.id === p.id);
    if (!t) {
      t = {
        id: p.id, soort: p.soort, file: p.file, titel: String(p.titel || p.inhoud.title || 'Taak'), vak: p.vak || '',
        feedback: p.feedback === 'inleveren' ? 'inleveren' : 'direct', gemaakt: p.gemaakt || new Date().toISOString(), dicht: false,
        inhoud: p.inhoud, werk: {}, plan: true, uitLesmap: true,
      };
      if (p.soort === 'quiz' && SOLO[p.spel]) Object.assign(t, { spel: p.spel, minuten: MINUTEN.includes(p.minuten) ? p.minuten : 5 });
      if (niveausVan(t.soort, t.inhoud).includes(p.niveau) && niveausVan(t.soort, t.inhoud).length > 1) t.niveau = p.niveau;
      bewaarNieuw(t);
      veranderd = true;
    }
    // Wie er aan de andere kant bij kwam, komt er hier ook bij (alleen wie op deze klaslijst staat).
    for (const n of p.namen.map(clean).filter(Boolean)) {
      if (t.werk[key(n)] || !klas.match(n)) continue;
      t.werk[key(n)] = nieuwWerk(t, klas.match(n).naam, startNiveau(t, n));
      veranderd = true;
    }
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
  t.dicht = false;
  if (n && t.plan) planBewaar(t);
  save();
  return n;
}

// Een leerling weghalen uit een taak (een vergissing bij het toewijzen).
function haalWeg({ id, naam } = {}) {
  const t = find(id);
  delete t.werk[key(naam)];
  save();
}

// De leerkracht zet een leerling op een ander niveau. Wat hij al deed, vervalt: het is een ander blad.
function zetNiveau({ id, naam, niveau } = {}) {
  const t = find(id);
  const w = t.werk[key(naam)];
  if (!w) throw new Error('Die leerling heeft deze taak niet.');
  if (!niveausVan(t.soort, t.inhoud).includes(niveau)) throw new Error('Dat niveau bestaat niet voor deze taak.');
  t.werk[key(naam)] = nieuwWerk(t, w.naam, niveau);
  save();
}

// Afsluiten: wie al begonnen was, levert in (zoals het er nu staat). Wie nog niet begon, telt niet mee.
function sluit(id) {
  const t = find(id);
  for (const w of Object.values(t.werk)) if (w.status === 'bezig') inleverenWerk(t, w);
  t.dicht = true;
  save();
}

// Weer openzetten: voor één leerling (die werkt verder met wat er al stond) of de hele taak.
function heropen({ id, naam } = {}) {
  const t = find(id);
  t.dicht = false;
  if (naam) {
    const w = t.werk[key(naam)];
    if (!w) throw new Error('Die leerling heeft deze taak niet.');
    if (w.status === 'klaar') {
      w.status = 'bezig';
      w.klaar = null;
    }
  }
  save();
}

function wis(id) {
  const list = all();
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list.splice(i, 1);
  planWeg(id);
  save();
}

function voortgang(t, w) {
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

// Alle taken voor het bord, zonder de inhoud.
function lijst() {
  return all().map(t => ({
    id: t.id, soort: t.soort, titel: t.titel, vak: t.vak, feedback: t.feedback, gemaakt: t.gemaakt, dicht: t.dicht, spel: spelVan(t), uitLesmap: !!t.uitLesmap,
    niveaus: niveausVan(t.soort, t.inhoud), niveau: t.niveau || null,
    leerlingen: Object.values(t.werk).map(w => ({ naam: w.naam, niveau: w.niveau, status: w.status, klaar: w.klaar, ...voortgang(t, w) }))
      .sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
  }));
}

// Wat één leerling deed, voor het venster op het bord.
function detail({ id, naam } = {}) {
  const t = find(id);
  const w = t.werk[key(naam)];
  if (!w) throw new Error('Die leerling heeft deze taak niet.');
  const base = { id, soort: t.soort, titel: t.titel, naam: w.naam, niveau: w.niveau, status: w.status, niveaus: niveausVan(t.soort, t.inhoud), ...voortgang(t, w) };
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
  if (!w) throw new Error('Deze taak is niet voor jou.');
  return { t, w };
}

// Mijn taken: wat nog open staat eerst, daarna wat klaar is (van de laatste twee weken).
function mijn(naam) {
  const k = key(naam);
  if (!k) throw new Error('Vul je naam in.');
  const sinds = Date.now() - 14 * 86400000;
  const lijst = all().filter(t => t.werk[k]).filter(t => {
    const w = t.werk[k];
    return (!t.dicht && w.status !== 'klaar') || Date.parse(w.klaar || t.gemaakt) > sinds;
  }).map(t => {
    const w = t.werk[k];
    const open = !t.dicht && w.status !== 'klaar';
    return { id: t.id, soort: t.soort, titel: t.titel, vak: t.vak, gemaakt: t.gemaakt, spel: spelVan(t), niveau: niveausVan(t.soort, t.inhoud).length > 1 ? w.niveau : null, status: open ? w.status : 'klaar', ...voortgang(t, w) };
  });
  lijst.sort((a, b) => (a.status === 'klaar') - (b.status === 'klaar') || (a.gemaakt < b.gemaakt ? 1 : -1));
  const l = klas.match(naam);
  return { naam: l ? l.naam : clean(naam), taken: lijst };
}

// Hoeveel taken nog open staan voor deze leerling (voor het startscherm).
function aantal(naam) {
  const k = key(naam);
  return k ? all().filter(t => !t.dicht && t.werk[k] && t.werk[k].status !== 'klaar').length : 0;
}

function begin(t, w) {
  if (w.status !== 'nieuw') return;
  w.status = 'bezig';
  w.begin = new Date().toISOString();
}

// Een taak openen: het blad (zonder oplossingen) of de volgende vraag.
function open({ id, naam } = {}) {
  const { t, w } = werkVan(id, naam);
  const klaar = t.dicht || w.status === 'klaar';
  const base = { id, soort: t.soort, titel: t.titel, spel: spelVan(t), niveau: niveausVan(t.soort, t.inhoud).length > 1 ? w.niveau : null, klaar, dicht: t.dicht, ...voortgang(t, w) };
  if (t.soort === 'quiz') return { ...base, vraag: klaar ? null : vraagVoor(t, w), terug: klaar ? terugblik(t, w) : null };
  const b = blad(t, w.niveau);
  return {
    ...base, feedback: t.feedback, view: b.view, answers: w.answers,
    results: t.feedback === 'direct' || klaar ? w.results : {},
    solutions: klaar ? sheets.solutions(b.sheet, b.shuffles) : null,
    voorlees: true,
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
  const guard = t.feedback === 'direct' && closed(field);
  w.lock = w.lock || {};
  if (guard && w.lock[veld] > now) return { wait: w.lock[veld] - now, id: veld, value: w.answers[veld] ?? '', error: 'Even wachten.' };
  const v = sheets.clean(field, waarde);
  begin(t, w);
  if (v === '') delete w.answers[veld];
  else w.answers[veld] = v;
  w.results[veld] = sheets.grade(field, v, shuffles);
  if (closed(field) && w.first[veld] === undefined && w.results[veld] !== null) w.first[veld] = w.results[veld];
  save();
  if (t.feedback !== 'direct') return { id: veld };
  if (guard && w.results[veld] === false) {
    w.lock[veld] = now + WRONG_MS;
    return { id: veld, correct: false, wait: WRONG_MS };
  }
  return { id: veld, correct: w.results[veld] };
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
      doel: block.doel, juist: w.results[f.id] === true && (t.feedback !== 'direct' || w.first[f.id] !== false), leeg: w.answers[f.id] === undefined,
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

module.exports = { PLAN, planGeldig, uitLesmap, SOLO, MINUTEN, soloRonde, soloAntwoord, voorbeeld, inhoud, maak, voegToe, haalWeg, zetNiveau, sluit, heropen, wis, lijst, detail, mijn, aantal, open, antwoord, inleveren, quizAntwoord, flush, DIR };
