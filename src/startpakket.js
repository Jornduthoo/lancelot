// Het startpakket: kant-en-klare quizzen en oefenbladen voor het 6e leerjaar, bij echte Op.stap-doelen,
// met uitleg bij elke vraag en getalvragen voor rekenen. Ze staan in de map startpakket/ van de app (een update brengt
// nieuwe mee) en komen pas bij de quizzen van de leerkracht als hij op de knop drukt. Een eigen quiz wordt nooit overschreven.
const fs = require('fs');
const path = require('path');
const quizzes = require('./quizzes');
const oefenbladen = require('./oefenbladen');

const DIR = path.join(__dirname, '..', 'startpakket');
const MAP = 'Startpakket 6e leerjaar';
const SOORTEN = [
  { sub: 'quizzes', mod: quizzes },
  { sub: 'oefenbladen', mod: oefenbladen },
];

function bestanden(sub) {
  try { return fs.readdirSync(path.join(DIR, sub)).filter(f => f.endsWith('.json')); } catch { return []; }
}

// Hoeveel quizzen en oefenbladen uit het pakket nog niet bij de leerkracht staan.
function status() {
  const out = { totaal: 0, nieuw: 0 };
  for (const { sub, mod } of SOORTEN) {
    for (const f of bestanden(sub)) {
      out.totaal++;
      if (!fs.existsSync(path.join(mod.DIR, f))) out.nieuw++;
    }
  }
  return out;
}

function installeer() {
  let erbij = 0;
  for (const { sub, mod } of SOORTEN) {
    const nieuw = bestanden(sub).filter(f => !fs.existsSync(path.join(mod.DIR, f)));
    if (!nieuw.length) continue;
    let folder = mod.lib.folders().find(f => f.toLowerCase() === MAP.toLowerCase());
    if (!folder) {
      mod.lib.addFolder(MAP);
      folder = MAP;
    }
    for (const f of nieuw) {
      try {
        const data = mod.validate(JSON.parse(fs.readFileSync(path.join(DIR, sub, f), 'utf8')));
        fs.mkdirSync(mod.DIR, { recursive: true });
        fs.writeFileSync(path.join(mod.DIR, f), JSON.stringify(data, null, 2) + '\n');
        mod.lib.move(f, folder);
        erbij++;
      } catch (err) {
        console.error(`Startpakket: ${f} overgeslagen:`, err.message);
      }
    }
  }
  return { erbij, map: MAP, ...status() };
}

module.exports = { status, installeer, MAP };
