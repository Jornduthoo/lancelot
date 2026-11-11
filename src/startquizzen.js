// Startquizzen: een handvol kant-en-klare quizzen per leerjaar (2 tot 6), in de taal van LANcelot, zodat een nieuwe
// leerkracht meteen kan spelen. De rekenquizzen maken we hier (altijd dezelfde vragen per leerjaar); de weetquizzen
// staan in startquizzen-inhoud.js. Ze komen pas bij de quizzen als de leerkracht op de knop drukt, in de map
// "Startquizzen". Een eigen quiz wordt nooit overschreven.
const fs = require('fs');
const path = require('path');
const quizzes = require('./quizzes');
const INHOUD = require('./startquizzen-inhoud');

const MAP = { nl: 'Startquizzen', en: 'Starter quizzes', fr: 'Quiz de départ', es: 'Cuestionarios de inicio', de: 'Startquiz' };
const VAN = { nl: 'van', en: 'of', fr: 'de', es: 'de', de: 'von' };
const TITELS = {
  plusmin100: { nl: 'Optellen en aftrekken tot 100', en: 'Adding and subtracting to 100', fr: 'Additions et soustractions jusqu’à 100', es: 'Sumas y restas hasta 100', de: 'Plus und minus bis 100' },
  tafels2510: { nl: 'Tafels van 2, 5 en 10', en: 'Times tables of 2, 5 and 10', fr: 'Tables de 2, 5 et 10', es: 'Tablas del 2, 5 y 10', de: 'Einmaleins mit 2, 5 und 10' },
  tafels: { nl: 'Tafels tot 10', en: 'Times tables to 10', fr: 'Tables de multiplication jusqu’à 10', es: 'Tablas de multiplicar hasta el 10', de: 'Einmaleins bis 10' },
  plusmin1000: { nl: 'Optellen en aftrekken tot 1000', en: 'Adding and subtracting to 1000', fr: 'Additions et soustractions jusqu’à 1000', es: 'Sumas y restas hasta 1000', de: 'Plus und minus bis 1000' },
  delen: { nl: 'Deeltafels', en: 'Division facts', fr: 'Divisions', es: 'Divisiones', de: 'Geteiltaufgaben' },
  breukdeel: { nl: 'Breuken: een deel van een getal', en: 'Fractions of a number', fr: 'Fractions d’un nombre', es: 'Fracciones de un número', de: 'Brüche: Teil einer Zahl' },
  komma: { nl: 'Rekenen met kommagetallen', en: 'Calculating with decimals', fr: 'Calculer avec des nombres décimaux', es: 'Calcular con decimales', de: 'Rechnen mit Kommazahlen' },
  procent: { nl: 'Procenten van een getal', en: 'Percentages of a number', fr: 'Pourcentages d’un nombre', es: 'Porcentajes de un número', de: 'Prozente einer Zahl' },
  volgorde: { nl: 'Volgorde van de bewerkingen', en: 'Order of operations', fr: 'Priorité des opérations', es: 'Orden de las operaciones', de: 'Punkt vor Strich' },
};
// Per leerjaar: twee of drie rekenquizzen en twee weetquizzen.
const PAKKET = {
  2: ['plusmin100', 'tafels2510', 'dieren'],
  3: ['tafels', 'plusmin1000', 'dieren', 'lichaam'],
  4: ['tafels', 'delen', 'breukdeel', 'lichaam', 'ruimte'],
  5: ['breukdeel', 'komma', 'procent', 'ruimte', 'europa'],
  6: ['procent', 'volgorde', 'komma', 'ruimte', 'europa'],
};
const AANTAL = 12;

// Een vaste toevalsrij per quiz, zodat dezelfde quiz altijd dezelfde vragen heeft.
function rij(zaad) {
  let s = zaad >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// De rekenvragen: [opgave, juist antwoord, afleiders]. Getallen blijven getallen tot het einde (komma of punt per taal).
const MAKERS = {
  plusmin100(r, k) { const plus = r() < 0.5; const a = k(11, 79); const b = plus ? k(3, 99 - a) : k(3, a - 2); return plus ? [`${a} + ${b}`, a + b] : [`${a} − ${b}`, a - b]; },
  plusmin1000(r, k) { const plus = r() < 0.5; const a = k(12, 80) * 10 + (r() < 0.5 ? 0 : 5); const b = k(2, 19) * 10; return plus ? [`${a} + ${b}`, a + b] : [`${a} − ${b}`, a - b]; },
  tafels2510(r, k) { const t = [2, 5, 10][k(0, 2)]; const a = k(2, 10); return [`${a} × ${t}`, a * t, [(a + 1) * t, (a - 1) * t, a * t + (t === 10 ? 1 : 2)]]; },
  tafels(r, k) { const a = k(3, 9); const b = k(3, 9); return [`${a} × ${b}`, a * b, [a * (b + 1), (a - 1) * b, a * b + 2]]; },
  delen(r, k) { const a = k(3, 9); const b = k(2, 9); return [`${a * b} : ${a}`, b, [b + 1, b - 1, b + 2]]; },
  breukdeel(r, k, t) { const n = [2, 3, 4, 5, 10][k(0, 4)]; const tel = n > 2 && r() < 0.4 ? k(2, n - 1) : 1; const deel = k(2, 12); return [`${tel}/${n} ${VAN[t]} ${n * deel}`, tel * deel, [deel * n, tel * deel + n, (tel + 1) * deel]]; },
  komma(r, k) { const plus = r() < 0.5; const a = k(11, 89) / 10; const b = k(2, 9) / 10; const som = Math.round((plus ? a + b : a - b) * 10) / 10; return [`${a} ${plus ? '+' : '−'} ${b}`, som, [Math.round((som + 1) * 10) / 10, Math.round((som + 0.1) * 10) / 10, Math.round((plus ? a + b * 10 : a + b) * 10) / 10]]; },
  procent(r, k, t) { const p = [10, 20, 25, 50, 75][k(0, 4)]; const g = k(1, 10) * (p % 25 === 0 && p !== 50 ? 40 : 20); const j = g * p / 100; return [`${p} % ${VAN[t]} ${g}`, j, [g - j, j * 2, j + 10]]; },
  volgorde(r, k) { const a = k(2, 9); const b = k(2, 6); const c = k(2, 6); const soort = k(0, 2);
    if (soort === 0) return [`${a} + ${b} × ${c}`, a + b * c, [(a + b) * c, a * b + c, a + b + c]];
    if (soort === 1) return [`(${a} + ${b}) × ${c}`, (a + b) * c, [a + b * c, a * b * c, a + b + c]];
    return [`${a * b + c * 3} − ${b} × ${a}`, c * 3, [(a * b + c * 3 - b) * a, c * 3 + a, c * 3 + b]]; },
};

function rekenquiz(id, taal) {
  const r = rij([...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
  const k = (van, tot) => van + Math.floor(r() * (tot - van + 1));
  const toon = n => (taal === 'en' ? String(n) : String(n).replace('.', ','));
  const questions = [];
  const gezien = new Set();
  for (let poging = 0; questions.length < AANTAL && poging < 400; poging++) {
    const [ruw, juist, eigen = []] = MAKERS[id](r, k, taal);
    const opgave = taal === 'en' ? ruw : ruw.replace(/(\d)\.(\d)/g, '$1,$2');
    if (gezien.has(opgave) || juist < 0) continue;
    gezien.add(opgave);
    // Drie foute antwoorden: eerst de typische fouten, dan getallen vlak bij het juiste.
    const fout = [];
    const stap = Number.isInteger(juist) ? (juist >= 100 ? 10 : 1) : 0.1;
    for (const f of [...eigen, juist + stap, juist - stap, juist + 2 * stap, juist + 10 * stap, juist + 3 * stap]) {
      const g = Math.round(f * 10) / 10;
      if (g >= 0 && g !== juist && !fout.includes(g) && fout.length < 3) fout.push(g);
    }
    const plek = k(0, 3);
    const answers = fout.slice(0, plek).concat(juist, fout.slice(plek)).map(toon);
    questions.push({ question: `${opgave} = ?`, answers, correct: plek, time: 20, typ: 'getal' });
  }
  return { title: TITELS[id][taal], questions };
}

// Een weetquiz: [vraag, juist, fout, fout, fout]. Het juiste antwoord krijgt een vaste, gespreide plaats.
function weetquiz(id, taal) {
  const q = INHOUD[id][taal];
  return { title: q.titel, questions: q.vragen.map(([question, ...a], i) => { const plek = (i * 3 + 1) % 4; return { question, answers: a.slice(1, plek + 1).concat(a[0], a.slice(plek + 1)), correct: plek, time: 20 }; }) };
}

const jaarVan = n => (PAKKET[n] ? Number(n) : 6);
const taalVan = t => (MAP[t] ? t : 'nl');
const maak = (id, taal) => (MAKERS[id] ? rekenquiz(id, taal) : weetquiz(id, taal));
const bestand = (id, taal) => `startquiz-${id}${taal === 'nl' ? '' : `-${taal}`}.json`;
const isStartquiz = file => /^(startquiz-|startpakket-|voorbeeld-|sample-quiz|quiz-exemple|cuestionario-ejemplo|beispielquiz)/.test(file);

// Zet de quizzen van dat leerjaar bij de quizzen van de leerkracht. Geeft terug hoeveel erbij kwamen en in welke map.
function installeer(leerjaar, taal) {
  taal = taalVan(taal);
  const map = MAP[taal];
  let folder = quizzes.lib.folders().find(f => f.toLowerCase() === map.toLowerCase());
  let erbij = 0;
  const files = [];
  for (const id of PAKKET[jaarVan(leerjaar)]) {
    const file = bestand(id, taal);
    files.push(file);
    if (fs.existsSync(path.join(quizzes.DIR, file))) continue;
    if (!folder) { quizzes.lib.addFolder(map); folder = map; }
    quizzes.save(maak(id, taal), file);
    quizzes.lib.move(file, folder);
    erbij++;
  }
  return { erbij, map, files };
}

module.exports = { installeer, maak, isStartquiz, PAKKET, MAP };
