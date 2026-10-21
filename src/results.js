// Resultaten van elke gespeelde quiz, als CSV-bestand in de map resultaten/ (opent in Excel).
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'resultaten');
const LETTERS = ['A', 'B', 'C', 'D'];

// Puntkomma als scheidingsteken, zoals Excel in België verwacht.
function cell(value) {
  let text = String(value ?? '');
  // Namen van leerlingen nooit als Excel-formule laten uitvoeren.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(values) {
  return values.map(cell).join(';');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function save(game) {
  const quiz = game.quiz;
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const slug = quiz.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'quiz';

  const players = [...game.players.values()].sort((a, b) => b.score - a.score);
  // Bij een gestopte quiz zijn de latere vragen niet gespeeld.
  const played = game.phase === 'podium' ? quiz.questions.length : game.index + 1;
  const lines = [
    row(['Quiz', quiz.title]),
    row(['Datum', `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`]),
    row(['Leerlingen', players.length]),
    ...(played < quiz.questions.length ? [row(['Status', `gestopt na vraag ${played} van ${quiz.questions.length}`])] : []),
    '',
    row(['Rang', 'Naam', 'Score', 'Aantal goed', ...quiz.questions.map((_, i) => `Vraag ${i + 1}`)]),
    ...players.map((p, i) => row([
      i + 1,
      p.name,
      p.score,
      p.results.filter(r => r && r.correct).length,
      ...quiz.questions.map((_, q) => {
        if (q >= played) return 'niet gespeeld';
        const r = p.results[q];
        if (!r || r.answer === null) return 'geen antwoord';
        return `${r.correct ? 'goed' : 'fout'} (${LETTERS[r.answer]})`;
      }),
    ])),
    '',
    row(['Vraag', 'Tekst', 'Goed antwoord', '% goed']),
    ...quiz.questions.map((q, i) => {
      const good = players.filter(p => p.results[i] && p.results[i].correct).length;
      return row([
        i + 1,
        q.question,
        `${LETTERS[q.correct]}: ${q.answers[q.correct]}`,
        i >= played ? 'niet gespeeld' : players.length ? `${Math.round((good / players.length) * 100)}%` : '-',
      ]);
    }),
  ];

  fs.mkdirSync(DIR, { recursive: true });
  let file = `${date}_${time}_${slug}.csv`;
  for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${date}_${time}_${slug}-${i}.csv`;
  // BOM zodat Excel de é's en ë's goed toont.
  fs.writeFileSync(path.join(DIR, file), '﻿' + lines.join('\r\n') + '\r\n');
  return file;
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => f.endsWith('.csv')).sort().reverse();
}

function filePath(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.csv')) {
    throw new Error('Ongeldige bestandsnaam.');
  }
  return path.join(DIR, file);
}

module.exports = { save, list, filePath, DIR };
