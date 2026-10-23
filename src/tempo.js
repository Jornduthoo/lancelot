// Hoe vaak leerlingen nieuwe vragen moeten beantwoorden in de actiespellen (brandstof, munitie, energie).
// De leerkracht kiest het tempo; een goed antwoord levert dan meer of minder op.
const TEMPO = { rustig: 1.6, normaal: 1, intens: .6 };

const tempoOf = name => (TEMPO[name] ? name : 'normaal');
const factor = name => TEMPO[tempoOf(name)];

module.exports = { tempoOf, factor };
