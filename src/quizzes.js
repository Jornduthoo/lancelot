// Quizzen staan als JSON-bestanden in de map quizzes/.
// Mappen bestaan alleen in _mappen.json: de quizbestanden zelf blijven op hun plaats,
// zodat een quiz verplaatsen niets kapotmaakt.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { library } = require('./library');
const doelen = require('./doelen');
const { extract } = require('./ai-json');
const niveaus = require('./niveaus');
const settings = require('./settings');
const klas = require('./klas');

const DIR = gegevens.pad('quizzes');

function text(value, max) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
}

// Controleert een quiz en geeft een opgeschoonde kopie terug (zonder onbekende velden).
function validate(quiz) {
  if (!quiz || typeof quiz !== 'object') throw new Error('Dit is geen quiz.');
  const title = text(quiz.title, 100);
  if (!title) throw new Error('De quiz heeft geen titel.');
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) throw new Error('De quiz heeft geen vragen.');
  if (quiz.questions.length > 100) throw new Error('Een quiz mag hooguit 100 vragen hebben.');

  const questions = quiz.questions.map((q, i) => {
    const n = i + 1;
    if (!q || typeof q !== 'object') throw new Error(`Vraag ${n} is ongeldig.`);
    const question = text(q.question, 250);
    if (!question) throw new Error(`Vraag ${n} heeft geen tekst.`);
    if (!Array.isArray(q.answers)) throw new Error(`Vraag ${n} heeft geen antwoorden.`);
    const answers = q.answers.map(a => text(a, 120));
    if (answers.length < 2 || answers.length > 4) throw new Error(`Vraag ${n} moet 2 tot 4 antwoorden hebben.`);
    if (answers.some(a => !a)) throw new Error(`Vraag ${n} heeft een leeg antwoord.`);
    const correct = Number(q.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= answers.length) {
      throw new Error(`Vraag ${n} heeft geen geldig goed antwoord.`);
    }
    const time = Number(q.time);
    const out = { question, answers, correct, time: Number.isInteger(time) && time >= 5 && time <= 120 ? time : 20 };
    // Het leerplandoel dat deze vraag oefent (mag ontbreken).
    const doel = doelen.clean(q.doel);
    if (doel) out.doel = doel;
    // Page (met hulp), Schildknaap (het doel) of Ridder (uitdaging). Zonder niveau telt de vraag als Schildknaap.
    const niveau = niveaus.clean(q.niveau);
    if (niveau && niveau !== 'schildknaap') out.niveau = niveau;
    return out;
  });
  // Een herhaalquiz uit het zorgoverzicht: elke leerling krijgt de vragen in zijn eigen volgorde (gespreid herhalen).
  return quiz.herhaal === true ? { title, herhaal: true, questions } : { title, questions };
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  const where = lib.places();
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(file => {
      const folder = where(file);
      try {
        const quiz = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
        return { file, folder, title: quiz.title || file, count: (quiz.questions || []).length, niveaus: niveausOf(quiz) };
      } catch {
        return { file, folder, title: `${file} (ongeldig bestand)`, count: 0 };
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

// Welke niveaus komen in deze quiz voor? Een quiz zonder niveaus heeft alleen Schildknaap.
function niveausOf(quiz) {
  const used = new Set((quiz.questions || []).map(q => niveaus.clean(q && q.niveau) || 'schildknaap'));
  return niveaus.NIVEAUS.filter(n => used.has(n));
}

// Het niveau waarop de klas de spellen speelt (gekozen boven de quizlijst). 'alle' = alle vragen door elkaar,
// 'leerling' = elke leerling krijgt de vragen van zijn eigen niveau uit Mijn klas.
function classNiveau() {
  const n = settings.read().quizNiveau;
  return n === 'alle' || n === 'leerling' ? n : niveaus.clean(n) || 'schildknaap';
}

// Alleen de vragen van dit niveau. Heeft de quiz geen vragen op dat niveau, dan alle vragen.
function forNiveau(quiz, niveau) {
  if (!niveaus.clean(niveau) || niveausOf(quiz).length < 2) return quiz;
  const questions = quiz.questions.filter(q => (q.niveau || 'schildknaap') === niveau);
  return questions.length ? { ...quiz, questions } : quiz;
}

// Een quiz laden om te spelen: op het niveau van de klas, of met alle vragen als elke leerling zijn eigen niveau krijgt.
// shared: iedereen krijgt dezelfde vragen (Toernooi, Duel, Het Rijk); per leerling krijgt daar elke leerling
// dezelfde vraag in de versie van zijn eigen niveau (zie gedeeld).
function play(file, { shared = false } = {}) {
  const quiz = load(file);
  const n = classNiveau();
  if (n === 'leerling' && shared) return gedeeld(quiz);
  if (n === 'leerling') return niveausOf(quiz).length > 1 ? { ...quiz, perLeerling: true } : quiz;
  return forNiveau(quiz, n);
}

// Voor spellen waar iedereen tegelijk dezelfde vraag krijgt: de k-de Schildknaap-vraag hoort bij de k-de Page- en
// de k-de Ridder-vraag (zo maakt de AI een quiz "op de drie niveaus"). Elke vraag krijgt die versies mee als varianten;
// het bord toont Schildknaap, elke leerling krijgt zijn eigen versie (vraagVoor). Zonder Schildknaap-vragen: het eerste niveau.
function gedeeld(quiz) {
  const used = niveausOf(quiz);
  if (used.length < 2) return quiz;
  const per = Object.fromEntries(niveaus.NIVEAUS.map(n => [n, quiz.questions.filter(q => (q.niveau || 'schildknaap') === n)]));
  const basis = per.schildknaap.length ? 'schildknaap' : used[0];
  const hoofd = doelen.hoofdvak(quiz.questions.map(q => q.doel));
  const questions = per[basis].map((q, k) => {
    const varianten = {};
    for (const n of niveaus.NIVEAUS) if (n !== basis && per[n][k]) varianten[n] = per[n][k];
    return { ...q, vak: doelen.vak(q.doel) || hoofd, varianten };
  });
  return { ...quiz, questions, gedeeld: true };
}

// De versie van een gedeelde vraag voor deze leerling (op naam), volgens zijn niveau voor het vak van de vraag.
// Geen versie op dat niveau (of het niveau van het bord): de vraag zelf.
function vraagVoor(q, name) {
  if (!q || !q.varianten) return q;
  return q.varianten[klas.niveauVoor(klas.match(name), q.vak)] || q;
}

// De vragen voor één leerling, door elkaar (als nummers in quiz.questions).
// Speelt elke leerling op zijn eigen niveau, dan alleen de vragen van zijn niveau (Schildknaap als hij niet op de klaslijst staat).
// Het niveau hangt af van het vak: Page voor wiskunde kan samengaan met Schildknaap voor Nederlands.
// Een vraag zonder doel hoort bij het hoofdvak van de quiz. Heeft een vak geen vragen op dat niveau, dan Schildknaap.
function order(quiz, name) {
  if (quiz.herhaal) return require('./herhaal').volgorde(quiz, name);
  let all = quiz.questions.map((_, i) => i);
  if (quiz.perLeerling) {
    const leerling = klas.match(name);
    const hoofd = doelen.hoofdvak(quiz.questions.map(q => q.doel));
    const perVak = new Map();
    for (const i of all) {
      const v = doelen.vak(quiz.questions[i].doel) || hoofd;
      (perVak.get(v) || perVak.set(v, []).get(v)).push(i);
    }
    const mine = [];
    for (const [v, list] of perVak) {
      const op = n => list.filter(i => (quiz.questions[i].niveau || 'schildknaap') === n);
      const eigen = op(klas.niveauVoor(leerling, v));
      mine.push(...(eigen.length ? eigen : op('schildknaap')));
    }
    if (mine.length) all = mine;
  }
  return all.sort(() => Math.random() - .5);
}

function checkFile(file) {
  // Alleen bestandsnamen uit de quizmap, geen paden.
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json') || file.startsWith('_')) {
    throw new Error('Ongeldige bestandsnaam.');
  }
  return path.join(DIR, file);
}

function load(file) {
  return validate(JSON.parse(fs.readFileSync(checkFile(file), 'utf8')));
}

function slug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'quiz';
}

// Slaat een quiz op. Zonder bestandsnaam krijgt hij een nieuwe naam op basis van de titel.
function save(quiz, file) {
  const clean = validate(quiz);
  fs.mkdirSync(DIR, { recursive: true });
  if (!file) {
    const base = slug(clean.title);
    file = `${base}.json`;
    for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${base}-${i}.json`;
  }
  fs.writeFileSync(checkFile(file), JSON.stringify(clean, null, 2) + '\n');
  return file;
}

// Haalt de quiz uit het antwoord van een chatbot, ook als er tekst of ```json omheen staat.
function parseAiText(raw) {
  const data = extract(raw, 'quiz', d => d.title !== undefined || d.questions !== undefined);
  if (data && data.title === 'korte titel van de quiz') throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  return validate(data);
}

function remove(file) {
  fs.unlinkSync(checkFile(file));
  lib.forget(file);
}

const lib = library({ kind: 'quiz', dir: DIR, checkFile, load, save, validate, list });

module.exports = { list, load, play, order, gedeeld, vraagVoor, forNiveau, niveausOf, classNiveau, save, remove, validate, parseAiText, lib, DIR };
