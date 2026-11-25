// Hulpknop voor leerlingen (wensenlijst 25 nov, punt 9): een leerling vraagt stil hulp vanaf zijn eigen toestel.
// De leerkracht ziet een wachtrij in volgorde (wie eerst vroeg, staat bovenaan) en vinkt af als geholpen.
// Andere leerlingen zien niets: alleen de leerling zelf ziet dat hij hulp vroeg. De rij staat alleen in het geheugen
// van LANcelot (na een herstart is ze leeg); er gaat niets naar internet en niets naar het logboek.
const klas = require('./klas');

const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const kort = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
let rij = [];

function lijst() {
  return rij.map((h, i) => ({ ...h, plaats: i + 1 }));
}

// De leerling vraagt hulp (nog eens vragen = zijn plaats blijft, alleen "waar" wordt bijgewerkt).
function vraag({ naam, waar } = {}) {
  const l = klas.match(naam);
  if (!l) throw new Error('Kies eerst je naam.');
  const k = key(l.naam);
  const er = rij.find(h => key(h.naam) === k);
  if (er) { if (waar) er.waar = kort(waar, 120); return stand(l.naam); }
  rij.push({ naam: l.naam, sinds: new Date().toISOString(), waar: kort(waar, 120) });
  return stand(l.naam);
}

// De leerling trekt zijn vraag in, of de leerkracht vinkt af (geholpen): uit de rij.
function weg({ naam } = {}) {
  const k = key(naam);
  const voor = rij.length;
  rij = rij.filter(h => key(h.naam) !== k);
  return { weg: rij.length < voor };
}

// Wat de leerling zelf ziet: of hij hulp vroeg en op welke plaats.
function stand(naam) {
  const i = rij.findIndex(h => key(h.naam) === key(naam));
  return i < 0 ? { gevraagd: false } : { gevraagd: true, plaats: i + 1 };
}

function wis() { rij = []; }

module.exports = { lijst, vraag, weg, stand, wis, key };
