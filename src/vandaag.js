// Het blok "Vandaag" op het startscherm (wensenlijst 20 nov, punt 9): in één oogopslag wat er vandaag
// verschijnt (met "Nu al geven"), welke toetsen je nog moet verbeteren en wie iets van de vorige dagen niet afmaakte.
// Rekent alleen met wat al gelezen is (taken.lijst() en de lijst van afnames): geen extra lezen per taak.
const TWEE_WEKEN = 14 * 864e5;

// De datum op de klok van deze pc (2026-11-20), ook voor een tijd zonder tijdzone zoals een geplande taak.
function dagVan(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const uurVan = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Wie telt bij een taak: niet wie het vak niet volgt (of een gast is) en niet wie nog op een eerste deel wacht.
const telt = l => !l.niet && !l.wacht;

function samenvatting(takenLijst, afnames, nu = Date.now()) {
  const vandaag = dagVan(nu);
  const verschijnt = [];
  const nietAf = [];
  // Quizzen en oefenbladen waar nu iemand aan werkt: met 📡 Live (toetsen staan al bij Toetsen).
  const bezig = [];
  for (const t of takenLijst || []) {
    if (t.dicht) continue;
    const ll = (t.leerlingen || []).filter(telt);
    const nBezig = ll.filter(l => l.status === 'bezig').length;
    if (!t.vanaf && nBezig && t.soort !== 'proef') bezig.push({ id: t.id, titel: t.titel, soort: t.soort, bezig: nBezig, klaar: ll.filter(l => l.status === 'klaar').length, n: ll.length });
    if (t.vanaf) {
      // Gepland voor later vandaag: met de knop "Nu al geven".
      if (dagVan(t.vanaf) === vandaag) verschijnt.push({ id: t.id, titel: t.titel, soort: t.soort, uur: uurVan(t.vanaf), n: ll.length });
      continue;
    }
    // Van een vorige schooldag (de laatste twee weken): wie is nog niet klaar?
    const dag = dagVan(t.dag);
    if (!dag || dag >= vandaag || nu - Date.parse(t.dag) > TWEE_WEKEN) continue;
    const namen = ll.filter(l => l.status !== 'klaar').map(l => ({ naam: l.naam, ...(l.afwezig ? { afwezig: true } : {}), ...(l.status === 'bezig' ? { bezig: true } : {}) }));
    if (namen.length) nietAf.push({ id: t.id, titel: t.titel, soort: t.soort, dag: t.dag, namen });
  }
  verschijnt.sort((a, b) => a.uur.localeCompare(b.uur));
  nietAf.sort((a, b) => (a.dag < b.dag ? 1 : -1));
  // Toetsen: wie nu bezig is en wat nog te verbeteren is (vroeger de gouden balk), in één regel per toets.
  const verbeteren = (afnames || [])
    .filter(a => a.bezig || (a.open && nu - Date.parse(a.datum) < TWEE_WEKEN))
    .map(a => ({ file: a.file, titel: a.title, open: a.open || 0, bezig: a.bezig || 0, datum: a.datum, ...(a.taak ? { taak: a.taak } : {}) }));
  return { verschijnt, bezig, verbeteren, nietAf, leeg: !verschijnt.length && !bezig.length && !verbeteren.length && !nietAf.length };
}

module.exports = { samenvatting, dagVan };
