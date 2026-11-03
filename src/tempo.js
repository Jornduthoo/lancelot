// Hoe vaak leerlingen nieuwe vragen moeten beantwoorden in de actiespellen (brandstof, munitie, energie).
// De leerkracht kiest het tempo; een goed antwoord levert dan meer of minder op.
// "Veel vragen" gaat nog een stap verder: minder per antwoord, en in de spellen met een vraag per vlag, poort
// of blok komen er twee vragen na elkaar (reeks).
const TEMPO = { rustig: 1.6, normaal: 1, intens: .6, veel: .4 };

const tempoOf = name => (TEMPO[name] ? name : 'normaal');
const factor = name => TEMPO[tempoOf(name)];
const reeks = name => (tempoOf(name) === 'veel' ? 2 : 1);

module.exports = { tempoOf, factor, reeks };
