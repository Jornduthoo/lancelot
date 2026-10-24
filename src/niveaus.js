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

module.exports = { NIVEAUS, NAMES, clean };
