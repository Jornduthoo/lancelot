// Resultaten van elke gespeelde quiz, als CSV-bestand in de map resultaten/ (opent in Excel).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { TYPE_NAMES } = require('./rondetafel');
const { library } = require('./library');

const DIR = gegevens.pad('resultaten');
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

// De eerste regel van elk bestand: de soort (Quiz, Toets, Oefenblad, een spel) en de titel. Bestanden veranderen niet, dus één keer lezen.
const koppen = new Map();
function kop(file) {
  if (koppen.has(file)) return koppen.get(file);
  let soort = '';
  let title = file.replace(/\.csv$/, '').replace(/^\d{4}-\d\d-\d\d_\d{4}_/, '').replace(/-/g, ' ');
  try {
    const fd = fs.openSync(path.join(DIR, file), 'r');
    const buf = Buffer.alloc(600);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const line = buf.toString('utf8', 0, n).replace(/^\ufeff/, '').split(/\r?\n/)[0];
    const cells = (line.match(/("([^"]|"")*"|[^;]*)(;|$)/g) || []).map(c => c.replace(/;$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (cells[0]) soort = cells[0];
    if (cells[1]) title = cells[1].replace(/^'(?=[=+\-@])/, '');
  } catch {}
  const k = { soort, title };
  koppen.set(file, k);
  return k;
}

// Een nieuw resultaat komt in dezelfde map als de quiz, het oefenblad, de toets of de Ronde Tafel waar het van komt.
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function bronnen() {
  const soorten = { quiz: './quizzes', oefenblad: './oefenbladen', sessie: './rondetafel', proef: './proeven' };
  const maps = {};
  return kind => {
    if (!maps[kind]) {
      maps[kind] = new Map();
      try {
        for (const q of require(soorten[kind]).list()) if (q.folder && !maps[kind].has(norm(q.title))) maps[kind].set(norm(q.title), q.folder);
      } catch {}
    }
    return maps[kind];
  };
}
function bronSoort(soort) {
  if (soort === 'Toets') return 'proef';
  if (soort === 'Oefenblad') return 'oefenblad';
  if (soort === 'Ronde Tafel') return 'sessie';
  if (soort === 'Het Rijk') return null;
  return 'quiz';
}

// De resultaten zoals de mappenlijst ze toont: nieuwste eerst, met titel, soort en datum.
function items() {
  const files = list();
  if (!files.length) return [];
  const bron = bronnen();
  lib.autoPlace(files, file => {
    const { soort, title } = kop(file);
    const kind = bronSoort(soort);
    return kind ? bron(kind).get(norm(title)) : '';
  });
  const where = lib.places();
  return files.map(file => {
    const { soort, title } = kop(file);
    const m = file.match(/^(\d{4})-(\d\d)-(\d\d)_(\d\d)(\d\d)/);
    return { file, folder: where(file), title, soort, datum: m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '' };
  });
}

const geen = () => { throw new Error('Resultaten kan je niet exporteren of importeren: download ze als Excel-bestand.'); };
const lib = library({ kind: 'resultaat', dir: DIR, checkFile: filePath, load: geen, save: geen, validate: geen, list: items });

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
  // Een tekening of opname (data-adres) past niet in Excel.
  const open = a => (typeof a === 'string' && !a.startsWith('data:') ? a : a ? '(ingevuld)' : '');
  const cell = (p, f) => (f.kind === 'open' ? open(p.answers[f.id]) : p.results[f.id] === true ? 'goed' : p.results[f.id] === false ? (f.kind === 'tekst' || f.kind === 'exact' ? `fout: ${p.answers[f.id]}` : 'fout') : '-');
  // Elk niveau heeft eigen oefeningen, dus per niveau een eigen tabel.
  const groups = Object.keys(ob.levels).map(n => ({ n, rows: ranking.filter(r => (ob.levels[r.niveau] ? r.niveau : 'schildknaap') === n) })).filter(g => g.rows.length || !ob.multi);
  const names = { page: 'Page (met hulp)', schildknaap: 'Schildknaap (het doel)', ridder: 'Ridder (uitdaging)' };
  const lines = [
    row(['Oefenblad', ob.sheet.title]),
    row(['Datum', stamp(now)]),
    row(['Feedback', ob.feedback === 'direct' ? 'meteen' : 'na inleveren']),
    row(['Leerlingen', ranking.length]),
  ];
  for (const g of groups) {
    const fields = ob.levels[g.n].fields;
    lines.push('');
    if (ob.multi) lines.push(row(['Niveau', names[g.n]]));
    lines.push(row(['Naam', 'Goed', 'Van', '% goed', 'Ingevuld', ...fields.map(label)]));
    for (const r of g.rows) {
      const p = ob.players.get(r.id);
      lines.push(row([r.name, r.right, r.total, r.total ? `${Math.round((r.right / r.total) * 100)}%` : '-', `${r.done}/${fields.length}`, ...fields.map(f => cell(p, f))]));
    }
  }
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

function saveVerrader(v) {
  const now = new Date();
  const roster = v.roster();
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
  const lines = [
    row(['De Verrader', v.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Winnaar', v.winner === 'ridder' ? 'De ridders' : 'De verraders']),
    row(['Waarom', v.why]),
    row(['Kristalkern', `${v.kern} van ${v.target}`]),
    row(['Leerlingen', roster.length]),
    '',
    row(['Naam', 'Rol', 'Uitkomst', 'Betoveringen', 'Vragen goed', 'Vragen fout', '% goed']),
    ...roster.map(p => row([
      p.name, p.role, p.fate || 'overleefd', p.role === 'verrader' ? p.spells : '', p.right, p.wrong, pct(p.right, p.right + p.wrong),
    ])),
  ];
  return write(now, `verrader-${slugOf(v.quiz.title)}`, lines);
}

function saveBurcht(b) {
  const now = new Date();
  const ranking = b.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const lines = [
    row(['Burchtbouwers', b.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${b.minutes} minuten`]),
    row(['Uitkomst', b.held ? 'De burcht houdt stand' : 'De burcht is gevallen']),
    row(['Nodige hoogte per deel', b.need]),
    ...b.parts.map(p => row([p.name, `${p.stones.length} stenen`, p.stones.length >= b.need ? 'houdt stand' : 'gevallen'])),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Naam', 'Stenen gelegd', 'Meest gebouwd aan', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map(p => row([p.name, p.placed, p.favorite, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `burchtbouwers-${slugOf(b.quiz.title)}`, lines);
}

function saveKnight(k) {
  const now = new Date();
  const ranking = k.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const lines = [
    row(['Pac-Knight', k.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${k.minutes} minuten`]),
    row(['Tempo', k.tempo]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Kristallen', 'Drones uitgeschakeld', 'Gevangen', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([i + 1, p.name, p.crystals, p.drones, p.caught, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `pac-knight-${slugOf(k.quiz.title)}`, lines);
}

function saveGalaga(g) {
  const now = new Date();
  const ranking = g.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const b = g.boss;
  const lines = [
    row(['Cyber-Galaga', g.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${g.minutes} minuten`]),
    row(['Tempo', g.tempo]),
    row(['Klasbaas', b.down ? 'verslagen' : b.on ? `ontsnapt (${Math.max(0, Math.round(b.hp))} van ${b.max} leven over)` : 'niet bereikt']),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Punten', 'Draken', 'Hoogste golf', 'Schade aan de baas', 'Neergestort', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([i + 1, p.name, p.score, p.dragons, p.wave, p.bossDmg, p.crashes, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `cyber-galaga-${slugOf(g.quiz.title)}`, lines);
}

function saveBomber(k) {
  const now = new Date();
  const ranking = k.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const lines = [
    row(['Bomber-Knight', k.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${k.minutes} minuten`]),
    row(['Tempo', k.tempo]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', 'Kristallen', 'Raak', 'Geraakt', 'Kratten', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([i + 1, p.name, p.crystals, p.kos, p.deaths, p.crates, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `bomber-knight-${slugOf(k.quiz.title)}`, lines);
}

function saveRossen(r) {
  const now = new Date();
  const ranking = r.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const teams = r.mode === 'teams';
  const lines = [
    row(['Strijdrossen', r.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${r.minutes} minuten`]),
    row(['Spelvorm', teams ? 'Rood tegen blauw' : 'Ieder voor zich']),
    row(['Tempo', r.tempo]),
    ...(teams ? [row(['Eindstand', `Rood ${r.score.rood} - ${r.score.blauw} Blauw`])] : []),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Rang', 'Naam', ...(teams ? ['Team'] : []), 'Punten', 'Uitgeschakeld (gewonnen)', 'Zelf uitgeschakeld', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map((p, i) => row([
      i + 1, p.name, ...(teams ? [p.team] : []), p.score, p.kills, p.deaths, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong),
    ])),
  ];
  return write(now, `strijdrossen-${slugOf(r.quiz.title)}`, lines);
}

function saveDuel(d) {
  const now = new Date();
  const ranking = d.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const secs = ms => (ms === null ? '-' : (ms / 1000).toFixed(1).replace('.', ','));
  const lines = [
    row(['Duel in de arena', d.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Harten per duel', d.hearts]),
    row(['Kampioen', d.champion && d.players.get(d.champion) ? d.players.get(d.champion).name : '-']),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Plaats', 'Naam', 'Tot in', 'Duels gewonnen', 'Vragen goed', 'Vragen fout', '% goed', 'Gem. tijd juist antwoord (s)']),
    ...ranking.map(p => row([p.place, p.name, p.stage, p.wins, p.right, p.wrong, pct(p.right, p.right + p.wrong), secs(p.avg)])),
  ];
  return write(now, `duel-${slugOf(d.quiz.title)}`, lines);
}

function saveRijk(r) {
  const now = new Date();
  const ranking = r.ranking();
  const d = r.data;
  const lesson = d.lessons[d.lessons.length - 1];
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const lines = [
    row(['Het Rijk', d.name]),
    row(['Les', d.lessons.length, r.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${r.minutes} minuten`]),
    '',
    row(['Team', 'Gebieden', 'Deze les']),
    ...d.teams.map((t, i) => row([t.name, lesson.counts[i], (lesson.gained[i] > 0 ? '+' : '') + lesson.gained[i]])),
    '',
    row(['Naam', 'Team', 'Acties', 'Veroverd', 'Vragen goed', 'Vragen fout', '% goed', 'Oude leerstof goed', 'Oude leerstof fout']),
    ...ranking.map(p => row([p.name, d.teams[p.team].name, p.actions, p.conquered, p.right, p.wrong, pct(p.right, p.right + p.wrong), p.oldRight, p.oldWrong])),
  ];
  return write(now, `rijk-${slugOf(d.name)}`, lines);
}

function saveNeon(d) {
  const now = new Date();
  const ranking = d.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const teams = d.teams || ['Team Bliksem', 'Team Vuur'];
  const lines = [
    row(['Neon Duel', d.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Rondes', `best of ${d.bestOf}`, `${d.roundSec} seconden per ronde`]),
    row(['Tempo', d.tempo]),
    row(['Eindstand', `${teams[0]} ${d.wins[0]} - ${d.wins[1]} ${teams[1]}`, d.winner >= 0 ? `${teams[d.winner]} wint` : 'gelijkspel']),
    ...d.history.map(h => row([`Ronde ${h.round}`, h.winner >= 0 ? teams[h.winner] : 'gelijk', h.why === 'ko' ? 'K.O.' : 'tijd op'])),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Naam', 'Team', 'Schade', 'Supermoves', 'Combo\'s', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map(p => row([p.name, teams[p.team], Math.round(p.dmg), p.supers, p.combos, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `neon-duel-${slugOf(d.quiz.title)}`, lines);
}

function saveBaas(b) {
  const now = new Date();
  const ranking = b.ranking();
  const pct = (a, n) => (n ? `${Math.round((a / n) * 100)}%` : '-');
  const lines = [
    row(['Leraar-baas', b.quiz.title]),
    row(['Datum', stamp(now)]),
    row(['Speeltijd', `${b.minutes} minuten`]),
    row(['Tempo', b.tempo]),
    row(['Uitkomst', b.outcome === 'klas' ? 'De klas verslaat de baas' : b.why === 'moed' ? 'De baas wint: de moed was op' : b.why === 'tijd' ? 'De baas wint: de tijd was om' : 'Gestopt', `baas nog ${Math.round(b.hp)}%`, `moed van de klas ${Math.round(b.moed)}%`]),
    row(['Leerlingen', ranking.length]),
    '',
    row(['Naam', 'Schade', 'Ridderslagen', 'Baasvragen juist', 'Langste reeks', 'Vragen goed', 'Vragen fout', '% goed']),
    ...ranking.map(p => row([p.name, Math.round(p.dmg), p.supers, p.bossRight, p.bestStreak, p.right, p.wrong, pct(p.right, p.right + p.wrong)])),
  ];
  return write(now, `leraar-baas-${slugOf(b.quiz.title)}`, lines);
}

// De Proef (een toets): punten per leerling en per vraag, en hoe vaak de leerling de toets verliet.
function saveProef(rec, standVan) {
  const K = require('../public/js/pf-kern');
  const now = new Date();
  const names = { page: 'Page (met hulp)', schildknaap: 'Schildknaap (het doel)', ridder: 'Ridder (uitdaging)' };
  const multi = K.niveausVan(rec.toets).length > 1;
  const nl = n => String(n).replace('.', ',');
  const lines = [
    row(['Toets', rec.title]),
    row(['Afgenomen', stamp(new Date(rec.datum))]),
    row(['Leerlingen', rec.spelers.length]),
  ];
  for (const n of K.niveausVan(rec.toets)) {
    const spelers = rec.spelers.filter(s => (multi ? s.niveau === n : true));
    if (multi && !spelers.length) continue;
    const vragen = K.vragenVan(K.lijstVoor(rec.toets, n));
    lines.push('');
    if (multi) lines.push(row(['Niveau', names[n]]));
    lines.push(row(['Naam', 'Punten', 'Op', '%', 'Verliet de toets', ...vragen.map(v => `V${v.nr} (/${nl(K.maxVan(v.q))})`)]));
    for (const s of spelers) {
      const st = standVan(s);
      const cel = v => {
        if (s.over && s.over[v.id] !== undefined && s.over[v.id] !== null) return nl(s.over[v.id]);
        const a = Number(s.auto[v.id]) || 0;
        const h = K.handPunten(v.q) ? s.hand[v.id] : 0;
        return h === null || h === undefined ? `${nl(a)} + ?` : nl(a + Number(h));
      };
      lines.push(row([s.naam, nl(st.punten), nl(st.max), st.max ? `${Math.round((st.punten / st.max) * 100)}%` : '-', (s.events || []).length, ...vragen.map(cel)]));
    }
  }
  return write(now, `toets-${slugOf(rec.title)}`, lines);
}

module.exports = { saveProef, save, saveKnight, saveRossen, saveRijk, saveRace, saveRoof, saveVerrader, saveBurcht, saveDuel, saveRondeTafel, saveToren, saveSchat, saveLaserslag, saveOefenblad, saveNeon, saveBaas, saveGalaga, saveBomber, list, items, lib, filePath, DIR };
