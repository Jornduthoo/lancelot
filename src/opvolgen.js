// Opvolgen (Mijn klas › Opvolgen): één tabel met de leerlingen in de rijen en de taken en toetsen in de kolommen.
// Per vakje één stand: nog niet begonnen, bezig, te verbeteren, klaar (met punt), of niet voor deze leerling.
// Alles komt uit wat er al is: de taken (src/taken.js, ook de stand van je andere pc's) en de afnames van De Proef.
const proeven = require('./proeven');
const taken = require('./taken');
const klas = require('./klas');

const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();

// De stand van elke leerling in een afname: punten, maximum en nog te verbeteren.
function afnameStand(file) {
  const per = new Map();
  try {
    const rec = proeven.laadAfname(file);
    for (const s of rec.spelers) per.set(key(s.naam), { ...proeven.stand(rec, s), naam: s.naam });
  } catch {}
  return per;
}

function overzicht() {
  const kl = klas.read();
  const rijen = kl.leerlingen.map(l => ({ naam: l.naam, niveau: l.niveau || null }));
  const opLijst = new Set(rijen.map(r => key(r.naam)));
  const kolommen = [];
  const lijst = taken.lijst();
  const metTaak = new Set();
  for (const t of lijst) {
    const vakjes = {};
    const af = t.soort === 'proef' && t.afname ? afnameStand(t.afname) : null;
    if (t.afname) metTaak.add(t.afname);
    for (const l of t.leerlingen) {
      let v = { status: l.status, gedaan: l.gedaan, totaal: l.totaal };
      if (l.status === 'klaar') {
        if (t.soort === 'proef') {
          const st = af && af.get(key(l.naam));
          v = st ? { status: st.open ? 'verbeteren' : 'klaar', punten: st.punten, max: st.max, open: st.open } : { status: 'verbeteren' };
        } else v = { status: 'klaar', punten: l.juist, max: l.score };
      }
      if (l.elders) v.elders = l.elders;
      vakjes[key(l.naam)] = v;
      if (!opLijst.has(key(l.naam))) { opLijst.add(key(l.naam)); rijen.push({ naam: l.naam, niveau: l.niveau || null }); }
    }
    kolommen.push({ id: t.id, soort: t.soort, titel: t.titel, vak: t.vak || '', dag: t.dag || t.gemaakt, gepland: !!t.vanaf, dicht: !!t.dicht, afname: t.afname || null, vakjes });
  }
  // Toetsen die op het bord afgenomen werden (geen taak): ook een kolom.
  for (const a of proeven.afnames()) {
    if (a.taak || metTaak.has(a.file)) continue;
    const vakjes = {};
    for (const [k, st] of afnameStand(a.file)) {
      vakjes[k] = { status: st.open ? 'verbeteren' : 'klaar', punten: st.punten, max: st.max, open: st.open };
      if (!opLijst.has(k)) { opLijst.add(k); rijen.push({ naam: st.naam, niveau: null }); }
    }
    kolommen.push({ id: `afname:${a.file}`, soort: 'proef', titel: a.title, vak: '', dag: a.datum, gepland: false, dicht: true, afname: a.file, live: true, vakjes });
  }
  kolommen.sort((a, b) => String(b.dag || '').localeCompare(String(a.dag || '')));
  return { rijen, kolommen };
}

module.exports = { overzicht, key };
