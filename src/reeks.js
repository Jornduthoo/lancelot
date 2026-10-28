// Een hele reeks lesmateriaal in één keer: per les een quiz en een oefenblad, in mappen Vak > Blok.
// De prompts maakt de browser (public/js/reeks.js). Hier lezen we de antwoorden van de AI in en bewaren we.
// Een handleiding of jaarplan gaat enkel mee naar de AI om de lessenlijst te maken: LANcelot bewaart hem nooit.
const { extract } = require('./ai-json');
const quizzes = require('./quizzes');
const oefenbladen = require('./oefenbladen');

const MAX_BLOKKEN = 40;
const MAX_LESSEN = 300;

function tekst(value, max) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// De lessenlijst uit een handleiding of jaarplan: { blokken: [{ naam, lessen: [{ titel, inhoud }] }] }.
function parsePlan(raw) {
  const data = extract(raw, 'lessenlijst', d => Array.isArray(d.blokken) || Array.isArray(d.lessen));
  const ruw = Array.isArray(data.blokken) ? data.blokken : [{ naam: '', lessen: data.lessen }];
  let aantal = 0;
  const blokken = ruw.slice(0, MAX_BLOKKEN).map(b => ({
    naam: tekst(b && b.naam, 40),
    lessen: (Array.isArray(b && b.lessen) ? b.lessen : []).map(l => ({
      titel: tekst(l && (l.titel || l.title), 90),
      inhoud: tekst(l && l.inhoud, 400),
    })).filter(l => l.titel && aantal++ < MAX_LESSEN),
  })).filter(b => b.lessen.length);
  if (!blokken.length) throw new Error('De AI vond geen lessen. Kijk of de juiste handleiding meeging, of typ de lessen zelf.');
  return { blokken };
}

// Een pakket lessen: { lessen: [{ les, quiz, oefenblad }] }. Elke quiz en elk blad apart gecontroleerd,
// zodat één fout blad de rest niet tegenhoudt. De browser zet de titels en de map.
function parsePakket(raw) {
  const data = extract(raw, 'reeks', d => Array.isArray(d.lessen));
  if (data.lessen.length && data.lessen[0] && data.lessen[0].les === 'de titel van de les, precies zoals hierboven') {
    throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  }
  const lessen = data.lessen.slice(0, 20).map(l => {
    const out = { les: tekst(l && l.les, 100), fouten: [] };
    const titel = out.les || 'Les';
    if (l && l.quiz) {
      try {
        out.quiz = quizzes.validate({ ...l.quiz, title: l.quiz.title || titel });
      } catch (err) {
        out.fouten.push(`Quiz: ${err.message}`);
      }
    }
    if (l && l.oefenblad) {
      try {
        out.oefenblad = oefenbladen.validate({ ...l.oefenblad, title: l.oefenblad.title || titel });
      } catch (err) {
        out.fouten.push(`Oefenblad: ${err.message}`);
      }
    }
    return out;
  });
  if (!lessen.length) throw new Error('Er staan geen lessen in het antwoord. Plak het hele antwoord van de AI.');
  return { lessen };
}

// Eén quiz of één oefenblad in zijn map zetten. Dezelfde weg als Importeren: de mappen komen er vanzelf bij,
// en wat er precies zo al staat, komt er niet nog eens bij.
function bewaar({ soort, data, map } = {}) {
  const mod = soort === 'quiz' ? quizzes : soort === 'oefenblad' ? oefenbladen : null;
  if (!mod) throw new Error('Onbekende soort.');
  return mod.lib.importBundle({ lancelot: soort, items: [{ folder: typeof map === 'string' ? map : '', data }] });
}

module.exports = { parsePlan, parsePakket, bewaar };
