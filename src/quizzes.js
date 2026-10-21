// Quizzen staan als JSON-bestanden in de map quizzes/.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'quizzes');

function validate(quiz) {
  if (!quiz || typeof quiz.title !== 'string' || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('Een quiz heeft een "title" en minstens één vraag in "questions" nodig.');
  }
  quiz.questions.forEach((q, i) => {
    const n = i + 1;
    if (typeof q.question !== 'string' || !q.question.trim()) throw new Error(`Vraag ${n} heeft geen tekst.`);
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 4) {
      throw new Error(`Vraag ${n} moet 2 tot 4 antwoorden hebben.`);
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.answers.length) {
      throw new Error(`Vraag ${n} heeft geen geldig "correct" (index van het juiste antwoord, vanaf 0).`);
    }
    q.time = Number.isInteger(q.time) && q.time >= 5 && q.time <= 120 ? q.time : 20;
  });
  return quiz;
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
    });
}

function load(file) {
  // Alleen bestandsnamen uit de quizmap, geen paden.
  if (path.basename(file) !== file || !file.endsWith('.json')) throw new Error('Ongeldige bestandsnaam.');
  return validate(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
}

module.exports = { list, load, validate, DIR };
