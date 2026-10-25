// Drie niveaus voor oefenbladen en quizzen, zodat elke leerling op zijn eigen hoogte oefent:
//   page         met hulp (voorbeelden, woordenbank, kleinere stappen)
//   schildknaap  het doel zelf (het gewone blad of de gewone vragen)
//   ridder       uitdaging (moeilijker, toepassen, uitbreiden)
const NIVEAUS = ['page', 'schildknaap', 'ridder'];
const NAMES = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };

function clean(value) {
  const n = String(value || '').trim().toLowerCase();
  return NIVEAUS.includes(n) ? n : '';
}

// Een leerling kan per vak op een ander niveau zitten (Page voor wiskunde, Schildknaap voor Nederlands).
// WO bundelt aardrijkskunde, geschiedenis en wetenschap en techniek. Andere vakken volgen het algemene niveau.
const VAKGROEPEN = [
  { id: 'wiskunde', naam: 'Wiskunde', vakken: ['Wiskunde'] },
  { id: 'nederlands', naam: 'Nederlands', vakken: ['Nederlands'] },
  { id: 'frans', naam: 'Frans', vakken: ['Frans'] },
  { id: 'wo', naam: 'WO', vakken: ['Aardrijkskunde', 'Geschiedenis', 'Wetenschap en techniek'] },
];

// De vakgroep van een vak uit de doelen ('Geschiedenis' -> 'wo'), of '' als het vak het algemene niveau volgt.
function groep(vak) {
  const g = VAKGROEPEN.find(x => x.vakken.includes(vak));
  return g ? g.id : '';
}

module.exports = { NIVEAUS, NAMES, VAKGROEPEN, clean, groep };
