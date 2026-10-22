// Resultaten van elke gespeelde quiz, als CSV-bestand in de map resultaten/ (opent in Excel).
const fs = require('fs');
const path = require('path');
const { TYPE_NAMES } = require('./rondetafel');

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

function slugOf(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'quiz';
}

function stamp(now) {
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Schrijft de regels weg als CSV-bestand met een unieke naam en geeft die naam terug.
function write(now, slug, lines) {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  fs.mkdirSync(DIR, { recursive: true });
  let file = `${date}_${time}_${slug}.csv`;
  for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${date}_${time}_${slug}-${i}.csv`;
  // BOM zodat Excel de é's en ë's goed toont.
  fs.writeFileSync(path.join(DIR, file), '\ufeff' + lines.join('\r\n') + '\r\n');
  return file;
}

function save(game) {
  const quiz = game.quiz;
  const now = new Date();

  const players = [...game.players.values()].sort((a, b) => b.score - a.score);
  // Bij een gestopte quiz zijn de latere vragen niet gespeeld.
  const played = game.phase === 'podium' ? quiz.questions.length : game.index + 1;
  const lines = [
    row(['Quiz', quiz.title]),
    row(['Datum', stamp(now)]),
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

  return write(now, slugOf(quiz.title), lines);
}

// Ronde Tafel: per vraag de verdeling van de stemmen, de woorden of de open antwoorden. Anoniem.
function saveRondeTafel(rt) {
  const { session } = rt;
  const now = new Date();
  const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '-');
  const lines = [
    row(['Ronde Tafel', session.title]),
    row(['Datum', stamp(now)]),
    row(['Deelnemers', rt.participants.size]),
  ];
  session.items.forEach((item, i) => {
    const sum = rt.summary(i);
    lines.push('', row([`Vraag ${i + 1}`, item.question]), row(['Soort', TYPE_NAMES[item.type]]), row(['Antwoorden van', `${sum.respondents} leerlingen`]));
    if (item.type === 'keuze') {
      lines.push(row(['Keuze', 'Stemmen', '%']));
      item.options.forEach((o, j) => lines.push(row([o, sum.counts[j], pct(sum.counts[j], sum.respondents)])));
    } else if (item.type === 'schaal') {
      lines.push(row(['Score', 'Stemmen', '%']));
      sum.counts.forEach((n, j) => lines.push(row([`${j + 1}${j === 0 ? ` (${item.min})` : j === 4 ? ` (${item.max})` : ''}`, n, pct(n, sum.respondents)])));
      lines.push(row(['Gemiddelde', sum.avg === null ? '-' : sum.avg.toFixed(1).replace('.', ',')]));
    } else if (item.type === 'woorden') {
      lines.push(row(['Woord', 'Aantal']));
      sum.words.forEach(w => lines.push(row([w.text, w.n])));
    } else {
      lines.push(row(['Antwoord']));
      sum.open.forEach(a => lines.push(row([a.text])));
    }
  });
  return write(now, `ronde-tafel-${slugOf(session.title)}`, lines);
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

// De prinses in de toren: per leerling hoe hoog hij kwam en hoeveel vragen goed waren.
function saveToren(t) {
  const now = new Date();
  const ranking = t.ranking();
  const time = ms => `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)}`;
  const lines = [
    row(['De prinses in de toren', t.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${t.minutes} minuten`]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Verdieping', 'Prinses gered', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((r, i) => row([
      i + 1, r.name, `${r.floor} / ${t.world.FLOORS}`, r.rescuedAt ? `ja, na ${time(r.rescuedAt)}` : 'nee',
      r.right, r.wrong, r.right + r.wrong ? `${Math.round((r.right / (r.right + r.wrong)) * 100)}%` : '-',
    ])),
  ];
  return write(now, `toren-${slugOf(t.quiz.title)}`, lines);
}

// Schattenjacht: goud, goede en foute antwoorden en de langste reeks per leerling.
function saveSchat(sj) {
  const now = new Date();
  const ranking = sj.ranking();
  const lines = [
    row(['Schattenjacht', sj.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${sj.minutes} minuten`]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Goud', 'Totaal verdiend', 'Vragen goed', 'Vragen fout', '% goed', 'Langste reeks']),
    ...ranking.map((r, i) => row([
      i + 1, r.name, r.gold, r.earned, r.right, r.wrong,
      r.right + r.wrong ? `${Math.round((r.right / (r.right + r.wrong)) * 100)}%` : '-', r.bestStreak,
    ])),
  ];
  return write(now, `schattenjacht-${slugOf(sj.quiz.title)}`, lines);
}

// Oefenblad: per leerling de score en per veld goed, fout of het antwoord op een open vraag.
function saveOefenblad(ob) {
  const now = new Date();
  const ranking = ob.ranking();
  const label = f => `Oef ${f.block + 1}.${Number(f.id.split('.')[1]) + 1}`;
  const lines = [
    row(['Oefenblad', ob.sheet.title]),
    row(['Datum', stamp(now)]),
    row(['Feedback', ob.feedback === 'direct' ? 'meteen' : 'na inleveren']),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Naam', 'Goed', 'Van', '% goed', 'Ingevuld', ...ob.fields.map(label)]),
    ...ranking.map(r => {
      const p = ob.players.get(r.id);
      return row([
        r.name, r.right, r.total, r.total ? `${Math.round((r.right / r.total) * 100)}%` : '-', `${r.done}/${ob.fields.length}`,
        ...ob.fields.map(f => (f.kind === 'open' ? p.answers[f.id] || '' : p.results[f.id] === true ? 'goed' : p.results[f.id] === false ? (f.kind === 'tekst' || f.kind === 'exact' ? `fout: ${p.answers[f.id]}` : 'fout') : '-')),
      ]);
    }),
  ];
  return write(now, `oefenblad-${slugOf(ob.sheet.title)}`, lines);
}

// Laserslag: punten, treffers en vragen per leerling, en bij teams de eindstand.
function saveLaserslag(ls) {
  const now = new Date();
  const ranking = ls.ranking();
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  const teams = ls.mode === 'teams';
  const lines = [
    row(['Laserslag', ls.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${ls.minutes} minuten`]),
    row(['Spelvorm', teams ? 'Rood tegen blauw' : 'Ieder voor zich']),
    ...(teams ? [row(['Eindstand', `Rood ${ls.score.rood} - ${ls.score.blauw} Blauw`])] : []),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', ...(teams ? ['Team'] : []), 'Punten', 'Slagen', 'Uitgeschakeld', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed', 'Raak geschoten']),
    ...ranking.map((r, i) => row([
      i + 1, r.name, ...(teams ? [r.team] : []), r.score, r.kills, r.deaths, r.bestStreak,
      r.right, r.wrong, pct(r.right, r.right + r.wrong), pct(r.hits, r.shots),
    ])),
  ];
  return write(now, `laserslag-${slugOf(ls.quiz.title)}`, lines);
}

function saveRace(r) {
  const now = new Date();
  const ranking = r.ranking();
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  const secs = ms => (ms ? (ms / 1000).toFixed(1).replace('.', ',') : '-');
  const lines = [
    row(['Ridderrace', r.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${r.minutes} minuten`]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Ronden', 'Afstand (ronden)', 'Snelste ronde (s)', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([
      i + 1, p.name, p.laps, p.progress.toFixed(2).replace('.', ','), secs(p.bestLap), p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong),
    ])),
  ];
  return write(now, `ridderrace-${slugOf(r.quiz.title)}`, lines);
}

function saveRoof(k) {
  const now = new Date();
  const ranking = k.ranking();
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  const lines = [
    row(['Kristalroof', k.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${k.minutes} minuten`]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Kristallen', 'Geslaagde roven', 'Geroofd', 'Zelf beroofd', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([
      i + 1, p.name, p.crystals, p.robs, p.stolen, p.robbed, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong),
    ])),
  ];
  return write(now, `kristalroof-${slugOf(k.quiz.title)}`, lines);
}

module.exports = { save, saveRace, saveRoof, saveRondeTafel, saveToren, saveSchat, saveLaserslag, saveOefenblad, list, filePath, DIR };
