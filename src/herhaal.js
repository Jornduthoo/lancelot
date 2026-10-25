// Herhaalquizzen uit het zorgoverzicht.
// - Voor een groepje of een leerling: alle vragen uit je quizzen bij de doelen die nog niet lukken.
// - Persoonlijke herhaling: veel vragen van de voorbije weken, en elke leerling krijgt ze in zijn eigen volgorde
//   (gespreid herhalen): wat hij fout had of lang niet meer zag eerst, wat hij net goed had achteraan.
// Een herhaalquiz is een gewone quiz met herhaal: true, bewaard in de map Herhaling. Speel hem in een spel op eigen tempo.
const quizzes = require('./quizzes');
const logboek = require('./logboek');
const klas = require('./klas');

const DAG = 86400000;
const MAX = 60;
const MAP = 'Herhaling';
const key = text => String(text || '').trim().toLowerCase().slice(0, 160);

// Alle vragen uit alle quizzen, elke vraag één keer.
function alleVragen() {
  const out = [];
  const seen = new Set();
  for (const info of quizzes.list()) {
    if (info.folder === MAP) continue; // geen herhaling van een herhaling
    let quiz;
    try { quiz = quizzes.load(info.file); } catch { continue; }
    for (const q of quiz.questions) {
      const k = key(q.question);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(q);
    }
  }
  return out;
}

function bewaar(title, questions) {
  const file = quizzes.save({ title, herhaal: true, questions });
  try {
    let folder = quizzes.lib.folders().find(f => f.toLowerCase() === MAP.toLowerCase());
    if (!folder) {
      quizzes.lib.addFolder(MAP);
      folder = MAP;
    }
    quizzes.lib.move(file, folder);
  } catch (err) {
    console.error('Herhaalquiz in de map zetten mislukt:', err.message);
  }
  return file;
}

const datum = () => new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });

// Voor een groepje of een leerling: de vragen bij deze doelen.
function voorDoelen({ doelen = [], voor = '' } = {}) {
  const codes = new Set((Array.isArray(doelen) ? doelen : []).map(String));
  if (!codes.size) throw new Error('Er zijn geen doelen gekozen.');
  // Vragen die het vaakst fout gingen eerst.
  const fout = new Map();
  for (const e of logboek.read()) if (!e.juist && codes.has(e.doel)) fout.set(key(e.vraag), (fout.get(key(e.vraag)) || 0) + 1);
  const questions = alleVragen().filter(q => codes.has(q.doel))
    .sort((a, b) => (fout.get(key(b.question)) || 0) - (fout.get(key(a.question)) || 0))
    .slice(0, MAX);
  if (!questions.length) throw new Error('Er staan nog geen quizvragen met deze doelen in je quizzen. Maak eerst een quiz met dit doel (ook met AI kan dat).');
  const title = `Herhaling ${voor ? `${String(voor).slice(0, 40)} ` : ''}${datum()}`;
  return { file: bewaar(title, questions), title, vragen: questions.length };
}

// Persoonlijke herhaling: de vragen die de klas de voorbije weken speelde, plus vragen bij die doelen.
function persoonlijk({ dagen = 42 } = {}) {
  const vanaf = new Date(Date.now() - dagen * DAG).toISOString();
  const gespeeld = new Map();
  const doelen = new Set();
  for (const e of logboek.read()) {
    if (e.t < vanaf) continue;
    const s = gespeeld.get(key(e.vraag)) || { n: 0, fout: 0 };
    s.n++;
    if (!e.juist) s.fout++;
    gespeeld.set(key(e.vraag), s);
    if (e.doel) doelen.add(e.doel);
  }
  const score = q => {
    const s = gespeeld.get(key(q.question));
    return s ? 1 + s.fout / s.n : doelen.has(q.doel) ? 0.5 : 0;
  };
  const questions = alleVragen().filter(q => score(q) > 0).sort((a, b) => score(b) - score(a)).slice(0, MAX);
  if (questions.length < 3) throw new Error('Er is nog te weinig gespeeld om een persoonlijke herhaling te maken. Speel eerst een paar quizzen.');
  const title = `Persoonlijke herhaling ${datum()}`;
  return { file: bewaar(title, questions), title, vragen: questions.length };
}

// De volgorde voor één leerling in een herhaalquiz: hoe dringender, hoe eerder.
function volgorde(quiz, name) {
  const leerling = klas.match(name);
  const naam = String(name || '').toLowerCase();
  const mijn = new Map();
  const doelFout = new Map();
  for (const e of logboek.read()) {
    if (leerling ? e.leerling !== leerling.id && String(e.naam || '').toLowerCase() !== naam : String(e.naam || '').toLowerCase() !== naam) continue;
    const k = key(e.vraag);
    const s = mijn.get(k) || { n: 0, fout: 0, laatst: 0, laatsteJuist: false };
    s.n++;
    if (!e.juist) s.fout++;
    s.laatst = Date.parse(e.t) || 0;
    s.laatsteJuist = !!e.juist;
    mijn.set(k, s);
    if (e.doel) {
      const d = doelFout.get(e.doel) || { n: 0, fout: 0 };
      d.n++;
      if (!e.juist) d.fout++;
      doelFout.set(e.doel, d);
    }
  }
  const now = Date.now();
  const gewicht = q => {
    const s = mijn.get(key(q.question));
    const d = q.doel && doelFout.get(q.doel);
    let w = d ? d.fout / d.n : 0.3;
    if (!s) return w + 1 + Math.random() * 0.5;
    const dagen = (now - s.laatst) / DAG;
    w += 2 * (s.fout / s.n) + (s.laatsteJuist ? 0 : 1.5) + Math.min(dagen, 30) / 10;
    if (s.laatsteJuist && dagen < 1) w -= 2; // net nog goed: later
    return w + Math.random() * 0.5;
  };
  return quiz.questions.map((q, i) => [i, gewicht(q)]).sort((a, b) => b[1] - a[1]).map(([i]) => i);
}

module.exports = { voorDoelen, persoonlijk, volgorde, MAP };
