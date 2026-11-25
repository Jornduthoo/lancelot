// Weekrapport per leerling (wensenlijst 25 nov, punt 5): wat deed hij deze week, klaar om met de ouders te delen.
// Per leerling: de toetsen (punten, procent en op 10), de taken (af of niet, juist bij een oefenblad), de doelen van de week
// (uit het logboek: behaald vanaf 70 % juist, anders nog oefenen) en een korte feedback die LANcelot voorstelt.
// De leerkracht kan de feedback aanpassen; dat bewaart LANcelot op deze pc (weekrapport/<maandag>.json), niet in de browser.
// Afdrukken of bewaren als pdf (één A4 per leerling), of in één klik een pdf per leerling in Mijn lesmap (Weekrapporten/<naam>/).
// Niets gaat naar een dienst op internet.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const proeven = require('./proeven');
const taken = require('./taken');
const klas = require('./klas');
const logboek = require('./logboek');
const doelen = require('./doelen');

const DIR = () => gegevens.pad('weekrapport');
const BEHAALD = 0.7;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const p2 = n => String(n).padStart(2, '0');
const dag = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const op10 = (p, m) => (m ? Math.round((p / m) * 100) / 10 : null);

// De week: maandag tot zondag rond een dag (standaard vandaag).
function week(van, tot) {
  if (van && !DATUM.test(van)) throw new Error('"van" is JJJJ-MM-DD.');
  if (tot && !DATUM.test(tot)) throw new Error('"tot" is JJJJ-MM-DD.');
  const d = new Date(`${van || dag(Date.now())}T12:00:00`);
  // Zonder einddag: de hele week (maandag tot zondag) van die dag.
  if (!tot) d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const v = dag(d);
  const e = tot ? new Date(`${tot}T12:00:00`) : new Date(d.getTime() + 6 * 864e5);
  return { van: v, tot: dag(e) };
}

function doelTekst(code) {
  const d = code && doelen.find(code);
  return d ? d.tekst.replace(/^De leerlingen kunnen\s*/i, '').replace(/^\w/, c => c.toUpperCase()) : String(code || '');
}

// Opmerkingen van de leerkracht (per week, per leerling).
const bestand = van => path.join(DIR(), `${van}.json`);
function opmerkingen(van) {
  try { return JSON.parse(fs.readFileSync(bestand(van), 'utf8')) || {}; } catch { return {}; }
}
function zetOpmerking({ van, naam, tekst } = {}) {
  if (!DATUM.test(String(van || ''))) throw new Error('Welke week?');
  const l = klas.match(naam);
  if (!l) throw new Error('Die leerling staat niet op de klaslijst.');
  const d = opmerkingen(van);
  const t = String(tekst || '').replace(/\r/g, '').trim().slice(0, 1200);
  if (t) d[key(l.naam)] = t; else delete d[key(l.naam)];
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(bestand(van), JSON.stringify(d, null, 2) + '\n');
  return { naam: l.naam, tekst: t };
}

// Een korte feedback uit de cijfers: wat ging goed, wat nog oefenen. Altijd vriendelijk en concreet.
function voorstelFeedback(r) {
  const zinnen = [];
  const af = r.taken.filter(t => t.status === 'klaar').length;
  if (r.taken.length) zinnen.push(af === r.taken.length ? (r.taken.length === 1 ? 'De taak is af: goed gewerkt!' : `Alle ${r.taken.length} taken af: goed gewerkt!`) : (r.taken.length === 1 ? 'De taak is nog niet af.' : `${af} van de ${r.taken.length} taken af.`));
  const verbeterd = r.toetsen.filter(t => t.op10 !== null && !t.nogTeVerbeteren);
  if (verbeterd.length) {
    const gem = Math.round((verbeterd.reduce((s, t) => s + t.op10, 0) / verbeterd.length) * 10) / 10;
    const cijfer = `${verbeterd.length > 1 ? 'gemiddeld ' : ''}${String(gem).replace('.', ',')} op 10`;
    const een = verbeterd.length === 1;
    if (gem >= 8) zinnen.push(een ? `Sterke toets (${cijfer}).` : `Sterke toetsen (${cijfer}).`);
    else if (gem >= 6) zinnen.push(een ? `De toets ging goed (${cijfer}).` : `De toetsen gingen goed (${cijfer}).`);
    else zinnen.push(een ? `De toets was nog moeilijk (${cijfer}).` : `De toetsen waren nog moeilijk (${cijfer}).`);
  }
  const goed = r.doelen.filter(d => d.behaald).slice(0, 2);
  const nog = r.doelen.filter(d => !d.behaald).slice(0, 2);
  if (goed.length) zinnen.push(`Goed: ${goed.map(d => d.kort).join('; ')}.`);
  if (nog.length) zinnen.push(`Nog oefenen: ${nog.map(d => d.kort).join('; ')}.`);
  if (!zinnen.length) zinnen.push('Deze week nog geen toetsen of taken.');
  return zinnen.join(' ');
}

const kortDoel = t => { const z = t.replace(/[.\s]+$/, ''); return z.length > 70 ? `${z.slice(0, 67).replace(/\s+\S*$/, '')}…` : z; };

// Alle rapporten van de week (of van één leerling).
function data({ van, tot, naam } = {}) {
  const w = week(van, tot);
  const kl = klas.read();
  let ll = kl.leerlingen.filter(l => !l.gast);
  if (naam) {
    const l = klas.match(naam);
    if (!l) throw new Error('Die leerling staat niet op de klaslijst.');
    ll = [l];
  }
  const per = new Map(ll.map(l => [key(l.naam), { naam: l.naam, toetsen: [], taken: [], doelen: [] }]));
  const inWeek = d => d >= w.van && d <= w.tot;
  // Toetsen: elke afname van de week.
  for (const a of proeven.afnames()) {
    if (!inWeek(dag(a.datum))) continue;
    let rec;
    try { rec = proeven.laadAfname(a.file); } catch { continue; }
    for (const s of rec.spelers) {
      const r = per.get(key(s.naam));
      if (!r) continue;
      const st = proeven.stand(rec, s);
      r.toetsen.push({ titel: rec.title, datum: dag(rec.datum), vak: proeven.vakVan(rec.toets) || '', punten: st.punten, max: st.max, procent: st.max ? Math.round((st.punten / st.max) * 100) : null, op10: op10(st.punten, st.max), nogTeVerbeteren: st.open });
    }
  }
  // Taken (oefenbladen en quizzen; een toets staat al bij de toetsen) die deze week gegeven werden.
  for (const t of taken.lijst()) {
    if (t.soort === 'proef' || !inWeek(dag(t.dag))) continue;
    for (const l of t.leerlingen) {
      const r = per.get(key(l.naam));
      if (!r || l.niet) continue;
      r.taken.push({ titel: t.titel, soort: t.soort, datum: dag(t.dag), status: l.status, ...(l.status === 'klaar' && l.score ? { juist: l.juist, van: l.score } : {}) });
    }
  }
  // Doelen: alle antwoorden van de week in het logboek met een leerplandoel.
  const telling = new Map();
  for (const e of logboek.read(new Date(`${w.tot}T12:00:00`))) {
    if (!e.doel || e.leeg || !inWeek(dag(e.t))) continue;
    const k = key(e.naam);
    if (!per.has(k)) continue;
    const t = telling.get(k) || telling.set(k, new Map()).get(k);
    const d = t.get(e.doel) || t.set(e.doel, { n: 0, juist: 0 }).get(e.doel);
    d.n++;
    if (e.juist) d.juist++;
  }
  const notes = opmerkingen(w.van);
  const rapporten = [...per.values()].map(r => {
    r.doelen = [...(telling.get(key(r.naam)) || new Map())].map(([code, d]) => {
      const tekst = doelTekst(code);
      return { code, tekst, kort: kortDoel(tekst), n: d.n, juist: d.juist, procent: Math.round((d.juist / d.n) * 100), behaald: d.juist / d.n >= BEHAALD };
    }).sort((a, b) => b.n - a.n).slice(0, 12);
    r.toetsen.sort((a, b) => a.datum.localeCompare(b.datum));
    r.taken.sort((a, b) => a.datum.localeCompare(b.datum));
    r.voorstel = voorstelFeedback(r);
    r.feedback = notes[key(r.naam)] || r.voorstel;
    r.eigen = !!notes[key(r.naam)];
    return r;
  });
  return { ...w, klas: kl.naam || '', leerkracht: '', rapporten };
}

// Een pdf per leerling in Mijn lesmap: <lesmap>/Weekrapporten/[klas/]<naam>/<maandag> weekrapport.pdf.
async function naarLesmap({ van, tot, url, browser } = {}) {
  const settings = require('./settings');
  const toetskopie = require('./toetskopie');
  const root = settings.read().lesmap;
  if (!root) return { gemaakt: 0, fout: 'Kies eerst Mijn lesmap (bij Instellingen).' };
  if (!fs.existsSync(root)) return { gemaakt: 0, fout: 'Je lesmap is niet te vinden. Staat OneDrive of Google Drive aan?' };
  const b = browser || toetskopie.zoekBrowser();
  if (!b) return { gemaakt: 0, fout: 'Geen Edge of Chrome gevonden om de pdf te maken.' };
  const d = data({ van, tot });
  const kl = gegevens.klasIds && gegevens.klasIds().length > 1 ? toetskopie.veilig(d.klas, 'klas') : '';
  let gemaakt = 0;
  const mislukt = [];
  for (const r of d.rapporten) {
    const uit = path.join(root, 'Weekrapporten', ...(kl ? [kl] : []), toetskopie.veilig(r.naam), `${d.van} weekrapport.pdf`);
    try {
      fs.mkdirSync(path.dirname(uit), { recursive: true });
      await toetskopie.pdf(b, url(r.naam, d.van, d.tot), uit);
      gemaakt++;
    } catch (err) {
      mislukt.push(r.naam);
    }
  }
  return { gemaakt, map: path.join(root, 'Weekrapporten'), fout: mislukt.length ? `Niet gelukt voor ${mislukt.join(', ')}.` : '' };
}

module.exports = { data, week, zetOpmerking, opmerkingen, naarLesmap, voorstelFeedback, BEHAALD };
