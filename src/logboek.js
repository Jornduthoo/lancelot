// Het logboek: elk antwoord van elke leerling, met het leerplandoel van de vraag.
// Eén bestand per schooljaar in de map logboek/ (staat in .gitignore), één regel JSON per antwoord.
// Elk antwoord hoort bij een sessie: één keer een spel spelen. Daaruit komen het overzicht na elk spel en de doelenkaart.
const fs = require('fs');
const path = require('path');
const klas = require('./klas');

const DIR = path.join(__dirname, '..', 'logboek');
// Een half uur geen antwoorden meer in hetzelfde spel: dan begint er een nieuwe sessie.
const SESSION_GAP_MS = 30 * 60000;
const FLUSH_MS = 3000;

// Het schooljaar begint op 1 september.
function schooljaar(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function file(now) {
  return path.join(DIR, `${schooljaar(now)}.jsonl`);
}

// Er loopt hooguit één spel tegelijk, dus één open sessie volstaat.
let current = null;

function sessionFor(spel, bron, now) {
  if (!current || current.spel !== spel || current.bron !== bron || now - current.last > SESSION_GAP_MS) {
    current = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, spel, bron, last: now };
  }
  current.last = now;
  return current.id;
}

// entries: [{ naam, spel, bron, vraag, doel, juist, leeg, zeker, sessie }] (zeker: 'zeker', 'twijfel' of niets).
// Met een eigen sessie (zoals het Runenraadsel, dat naast de andere spellen loopt) blijft de sessie van het lopende spel ongemoeid.
function add(entries) {
  if (!entries.length) return;
  const now = new Date();
  const lines = entries.map(e => {
    const leerling = klas.match(e.naam);
    const bron = String(e.bron || '').slice(0, 100);
    return JSON.stringify({
      t: now.toISOString(),
      sessie: e.sessie || sessionFor(e.spel, bron, now.getTime()),
      leerling: leerling ? leerling.id : null,
      naam: e.naam,
      spel: e.spel,
      bron,
      vraag: String(e.vraag || '').slice(0, 160),
      doel: e.doel || '',
      juist: Boolean(e.juist),
      ...(e.leeg ? { leeg: true } : {}),
      ...(e.zeker === 'zeker' || e.zeker === 'twijfel' ? { zeker: e.zeker } : {}),
    });
  });
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(file(now), lines.join('\n') + '\n');
  } catch (err) {
    console.error('Logboek bijwerken mislukt:', err.message);
  }
}

// Eén antwoord uit een spel. We schrijven ze per paar seconden samen weg, zodat het spel niet hapert.
let pending = [];
let timer = null;

function answer(spel, bron, naam, q, juist) {
  if (!q) return;
  pending.push({ naam, spel, bron, vraag: q.question, doel: q.doel, juist });
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

function flush() {
  clearTimeout(timer);
  timer = null;
  const list = pending;
  pending = [];
  add(list);
}

// Het spel is klaar: wat nog wacht wegschrijven en de sessie afsluiten. Geeft de id van die sessie terug.
function endSession() {
  flush();
  const id = current && current.id;
  current = null;
  return id || null;
}

// Het bestand van dit schooljaar, in het geheugen gehouden. Alleen wat er sinds de vorige keer bij kwam, lezen we opnieuw.
let cache = { path: '', size: 0, rest: '', list: [] };

function read(now) {
  const p = file(now);
  let size = 0;
  try { size = fs.statSync(p).size; } catch { return []; }
  if (cache.path !== p || size < cache.size) cache = { path: p, size: 0, rest: '', list: [] };
  if (size > cache.size) {
    let text = '';
    try {
      const fd = fs.openSync(p, 'r');
      const buf = Buffer.alloc(size - cache.size);
      fs.readSync(fd, buf, 0, buf.length, cache.size);
      fs.closeSync(fd);
      text = buf.toString('utf8');
    } catch {
      return cache.list;
    }
    cache.size = size;
    const lines = (cache.rest + text).split('\n');
    cache.rest = lines.pop();
    for (const l of lines) {
      if (!l) continue;
      try { cache.list.push(JSON.parse(l)); } catch {}
    }
  }
  return cache.list;
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

// Gokken (drie keer na elkaar snel en fout) bewaren we apart, voor het zorgoverzicht: logboek/<schooljaar>-gok.jsonl.
function gokFile(now) {
  return path.join(DIR, `${schooljaar(now)}-gok.jsonl`);
}

function gok(spel, naam) {
  const now = new Date();
  const leerling = klas.match(naam);
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(gokFile(now), JSON.stringify({ t: now.toISOString(), leerling: leerling ? leerling.id : null, naam, spel }) + '\n');
  } catch (err) {
    console.error('Gokken bijhouden mislukt:', err.message);
  }
}

// Een klein bestand: helemaal opnieuw lezen als het veranderd is.
let gokCache = { path: '', size: -1, list: [] };
function readGok(now) {
  const p = gokFile(now);
  let size = 0;
  try { size = fs.statSync(p).size; } catch { return []; }
  if (gokCache.path !== p || gokCache.size !== size) {
    const list = [];
    try {
      for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
        if (!l) continue;
        try { list.push(JSON.parse(l)); } catch {}
      }
    } catch {}
    gokCache = { path: p, size, list };
  }
  return gokCache.list;
}

process.on('exit', flush);

module.exports = { add, answer, flush, endSession, read, summary, schooljaar, gok, readGok, DIR };
