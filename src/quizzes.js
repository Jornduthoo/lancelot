// Quizzen staan als JSON-bestanden in de map quizzes/.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'quizzes');

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
    return { question, answers, correct, time: Number.isInteger(time) && time >= 5 && time <= 120 ? time : 20 };
  });
  return { title, questions };
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json'))
    .map(file => {
      try {
        const quiz = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
        return { file, title: quiz.title || file, count: (quiz.questions || []).length };
      } catch {
        return { file, title: `${file} (ongeldig bestand)`, count: 0 };
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

function checkFile(file) {
  // Alleen bestandsnamen uit de quizmap, geen paden.
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json')) {
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
  const str = String(raw || '');
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Geen quiz gevonden in de geplakte tekst. Plak het hele antwoord van de AI.');
  let data;
  try {
    data = JSON.parse(str.slice(start, end + 1));
  } catch {
    throw new Error('De geplakte tekst is geen geldige JSON. Vraag de AI om "alleen de JSON" en probeer opnieuw.');
  }
  return validate(data);
}

function remove(file) {
  fs.unlinkSync(checkFile(file));
}

module.exports = { list, load, save, remove, validate, parseAiText, DIR };
