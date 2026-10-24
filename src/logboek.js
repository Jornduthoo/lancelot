// Het logboek: elk antwoord van elke leerling, met het leerplandoel van de vraag.
// Eén bestand per schooljaar in de map logboek/ (staat in .gitignore), één regel JSON per antwoord.
// Hieruit komen later de doelenkaart en de Opwarmer.
const fs = require('fs');
const path = require('path');
const klas = require('./klas');

const DIR = path.join(__dirname, '..', 'logboek');

// Het schooljaar begint op 1 september.
function schooljaar(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function file(now) {
  return path.join(DIR, `${schooljaar(now)}.jsonl`);
}

// entries: [{ naam, spel, bron, vraag, doel, juist, leeg }]
function add(entries) {
  if (!entries.length) return;
  const now = new Date();
  const lines = entries.map(e => {
    const leerling = klas.match(e.naam);
    return JSON.stringify({
      t: now.toISOString(),
      leerling: leerling ? leerling.id : null,
      naam: e.naam,
      spel: e.spel,
      bron: String(e.bron || '').slice(0, 100),
      vraag: String(e.vraag || '').slice(0, 160),
      doel: e.doel || '',
      juist: Boolean(e.juist),
      ...(e.leeg ? { leeg: true } : {}),
    });
  });
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(file(now), lines.join('\n') + '\n');
  } catch (err) {
    console.error('Logboek bijwerken mislukt:', err.message);
  }
}

function read(now) {
  try {
    return fs.readFileSync(file(now), 'utf8').split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// Per doel: hoeveel antwoorden en hoeveel daarvan juist, dit schooljaar.
function summary() {
  const entries = read();
  const perDoel = {};
  for (const e of entries) {
    if (!e.doel) continue;
    const s = perDoel[e.doel] || (perDoel[e.doel] = { antwoorden: 0, juist: 0, laatst: '' });
    s.antwoorden++;
    if (e.juist) s.juist++;
    if (e.t > s.laatst) s.laatst = e.t;
  }
  return {
    schooljaar: schooljaar(),
    totaal: entries.length,
    metDoel: entries.filter(e => e.doel).length,
    zonderKlaslijst: entries.filter(e => !e.leerling).length,
    perDoel,
  };
}

module.exports = { add, read, summary, schooljaar, DIR };
