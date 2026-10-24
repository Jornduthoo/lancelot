// Vragen voor de actiespellen Gauntlet en Ridder-Royale: elke leerling krijgt de quizvragen in een eigen volgorde.
// Tegen gokken: na een fout antwoord even wachten (het juiste antwoord blijft staan), en die vraag komt een paar vragen later terug.
// Elk antwoord gaat naar het logboek, met het leerplandoel van de vraag. Ook het CSV-bestand met de eindstand maken we hier.
const fs = require('fs');
const path = require('path');
const logboek = require('./logboek');
const results = require('./results');
const { factor } = require('./tempo');
const quizzes = require('./quizzes');

const WRONG_WAIT_MS = 3000;

class Vragen {
  constructor(quiz, spel, tempo) {
    this.quiz = quiz;
    this.spel = spel;
    this.tempo = tempo;
    this.log = [];
    this.lastFlush = Date.now();
  }

  // Na een fout antwoord: bij rustig tempo iets langer wachten, bij intens iets korter.
  get waitMs() {
    return Math.round(WRONG_WAIT_MS * Math.sqrt(factor(this.tempo)));
  }

  // p heeft velden question, order, last en waitUntil.
  next(p) {
    const now = Date.now();
    if (now < p.waitUntil) return { error: 'Even wachten.', wait: p.waitUntil - now };
    if (p.question === null || p.question === undefined) {
      if (!p.order || p.order.length === 0) {
        p.order = quizzes.order(this.quiz, p.name);
        if (p.order.length > 1 && p.order[0] === p.last) p.order.push(p.order.shift());
      }
      p.question = p.order.shift();
    }
    const q = this.quiz.questions[p.question];
    return { question: q.question, answers: q.answers };
  }

  // Geeft { correct, right, wait } terug, of null als er geen vraag openstond.
  answer(p, choice) {
    if (p.question === null || p.question === undefined) return null;
    const q = this.quiz.questions[p.question];
    const correct = choice === q.correct;
    this.log.push({ naam: p.name, spel: this.spel, bron: this.quiz.title, vraag: q.question, doel: q.doel, juist: correct });
    p.last = p.question;
    let wait = 0;
    if (correct) {
      p.right = (p.right || 0) + 1;
      p.streak = (p.streak || 0) + 1;
      p.bestStreak = Math.max(p.bestStreak || 0, p.streak);
    } else {
      p.wrong = (p.wrong || 0) + 1;
      p.streak = 0;
      wait = this.waitMs;
      p.waitUntil = Date.now() + wait;
      p.order.splice(Math.min(2, p.order.length), 0, p.question);
    }
    p.question = null;
    if (Date.now() - this.lastFlush > 5000) this.flush();
    return { correct, right: q.correct, wait };
  }

  flush() {
    this.lastFlush = Date.now();
    if (!this.log.length) return;
    logboek.add(this.log);
    this.log = [];
  }
}

// Een eindstand als CSV in resultaten/, zoals de andere spellen (puntkomma's en BOM voor Excel).
function saveCsv(slug, head, columns, rows) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const row = values => values.map(cell).join(';');
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const lines = [
    ...head.map(row),
    row(['Datum', `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`]),
    '',
    row(columns),
    ...rows.map(row),
  ];
  const clean = String(slug).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'spel';
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  fs.mkdirSync(results.DIR, { recursive: true });
  let file = `${stamp}_${clean}.csv`;
  for (let i = 2; fs.existsSync(path.join(results.DIR, file)); i++) file = `${stamp}_${clean}-${i}.csv`;
  fs.writeFileSync(path.join(results.DIR, file), '﻿' + lines.join('\r\n') + '\r\n');
  return file;
}

const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');

module.exports = { Vragen, saveCsv, pct };
