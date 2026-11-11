// De Leescheck: leerlingen lezen elke dag een kwartier in hun eigen boek. In één minuut tonen ze op hun toestel dat ze lazen:
// de titel, de bladzijde waar ze nu zijn en een kort antwoord op een vraag die je alleen kunt beantwoorden als je echt las.
// De leerkracht ziet per leerling de dagen naast elkaar en wat opvalt: niets ingevuld, geen nieuwe bladzijden,
// een rare sprong, een heel kort antwoord of hetzelfde antwoord als eerder of als een klasgenoot.
// Standaard staat de Leescheck uit: pas als de leerkracht hem aanzet (Mijn klas > Lezen), zien leerlingen de knop.
// Alles staat per klas in de map lezen/ (in .gitignore): instellingen.json en één bestand per schooljaar.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const logboek = require('./logboek');
const taal = require('./taal');

const DIR = () => gegevens.pad('lezen');
const INSTELLINGEN = () => path.join(DIR(), 'instellingen.json');
const jaarFile = sj => path.join(DIR(), `${sj}.json`);

// Vragen die je alleen goed beantwoordt als je net las. Elke leerling krijgt elke dag een andere (zo helpt afkijken niet),
// en nooit twee dagen na elkaar dezelfde. Een sterretje vooraan: een kort antwoord is genoeg (een naam, één woord).
const VRAGEN = [
  'Wat gebeurde er in het stuk dat je net las? Vertel het in je eigen woorden.',
  'Welk personage kwam voor in wat je las? Wat deed of zei het?',
  'Waar speelde het stuk dat je las zich af? Beschrijf die plek.',
  'Wat denk je dat er hierna gebeurt? Waarom denk je dat?',
  'Hoe voelde het hoofdpersonage zich in wat je las? Hoe weet je dat?',
  'Wat was het spannendste, grappigste of raarste moment? Wat gebeurde er?',
  'Welk moeilijk of mooi woord las je? Schrijf de zin over waarin het stond.',
  'Schrijf de laatste zin over die je las.',
  'Wat heb je bijgeleerd of wat viel je op in wat je las?',
  'Wat wil het hoofdpersonage graag? Wat houdt het tegen?',
  'Welk probleem kwam er in wat je las? Is het al opgelost?',
  'Wat zou jij gedaan hebben in de plaats van het hoofdpersonage?',
  'Wat gebeurde er eerst, en wat daarna? Vertel het in twee zinnen.',
  'Welke vraag zou je willen stellen aan een personage? Aan wie?',
  'Hoe ziet het hoofdpersonage eruit? Beschrijf het.',
  'Waarom deed een personage iets in wat je las? Leg uit.',
  'Welke titel zou jij het stuk geven dat je las? Waarom?',
  'Wie vind je het leukste of het stomste personage? Waarom?',
  'Schrijf de eerste zin over van de bladzijde waar je stopte.',
  'Vertel in één zin wat je las aan iemand die het boek niet kent.',
  '* Hoe heet het hoofdpersonage?',
  '* Wie schreef je boek?',
  '* Welk personage kwam voor in wat je las? Schrijf de naam.',
  '* Waar speelde wat je las zich af?',
  '* Welk hoofdstuk las je? Schrijf het nummer of de titel.',
  '* Welk dier of voorwerp kwam voor in wat je las?',
  '* Was het stuk spannend, grappig, triest of saai?',
  '* Wat is het laatste woord dat je las?',
  '* Was het dag of nacht in het stuk dat je las?',
  '* Hoeveel personages kwamen voor in wat je las?',
  '* Welke score geef je je boek vandaag, van 1 tot 5?',
  '* Welk nieuw woord leerde je?',
];
// Een vraag als tekst ('* ...' = kort antwoord) naar { tekst, kort }.
function vraagVan(v) {
  const m = /^\s*\*\s*/.exec(v);
  return { tekst: v.slice(m ? m[0].length : 0).trim(), kort: !!m };
}
// In de taal van LANcelot (Instellingen > Uiterlijk > Taal).
const standaard = () => VRAGEN.map(v => {
  const q = vraagVan(v);
  return `${q.kort ? '* ' : ''}${taal.t(q.tekst)}`;
});
const MAX_VRAGEN = 60;
// Meer bladzijden dan dit per dag sinds de vorige keer: dat valt op.
const SPRONG_PER_DAG = 35;

function datum(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
const dagNaarDate = dag => new Date(`${dag}T12:00:00`);
const dagenTussen = (a, b) => Math.round((dagNaarDate(b) - dagNaarDate(a)) / 86400000);

function leesJson(f, leeg) {
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    return d && typeof d === 'object' ? d : leeg;
  } catch {
    return leeg;
  }
}
function schrijfJson(f, d) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + '.tmp', JSON.stringify(d));
  fs.renameSync(f + '.tmp', f);
}

// ---------- Instellingen ----------

function instellingen() {
  const d = leesJson(INSTELLINGEN(), {});
  const eigen = Array.isArray(d.vragen) ? d.vragen.filter(v => typeof v === 'string' && v.trim()).slice(0, MAX_VRAGEN) : [];
  return { aan: d.aan === true, eigen, vragen: eigen.length ? eigen : standaard() };
}

function zet({ aan, vragen } = {}) {
  const d = leesJson(INSTELLINGEN(), {});
  if (typeof aan === 'boolean') d.aan = aan;
  if (typeof vragen === 'string') {
    d.vragen = vragen.split('\n').map(v => v.trim().replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean).slice(0, MAX_VRAGEN);
  }
  schrijfJson(INSTELLINGEN(), d);
  return staat();
}

function staat() {
  const s = instellingen();
  return { aan: s.aan, vragen: s.vragen, eigen: s.eigen.length > 0 };
}

// ---------- Leerlingen ----------

function wie(naam) {
  const n = String(naam || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!n) throw new Error('Kies eerst je naam.');
  const l = klas.match(n);
  return { key: l ? `id:${l.id}` : `n:${n.toLowerCase()}`, naam: l ? l.naam : n };
}

function jaar(now = new Date()) {
  const sj = logboek.schooljaar(now);
  const d = leesJson(jaarFile(sj), null);
  return d && typeof d.dagen === 'object' ? d : { schooljaar: sj, dagen: {} };
}

// Elke leerling een andere vraag, en elke dag een andere: een vaste mengeling van dag en naam.
// Nooit dezelfde vraag als de vorige keer.
function vraagVoor(dag, key, vragen, vorigeVraag = '') {
  const lijst = vragen.map(vraagVan).filter(q => q.tekst);
  if (!lijst.length) return vraagVan(VRAGEN[0]);
  let h = 2166136261;
  for (const c of `${dag}|${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let i = h % lijst.length;
  if (lijst.length > 1 && lijst[i].tekst === vorigeVraag) i = (i + 1) % lijst.length;
  return lijst[i];
}

// De laatste keer vóór vandaag: welk boek en welke bladzijde.
function vorige(j, key, dag) {
  const dagen = Object.keys(j.dagen).filter(d => d < dag && j.dagen[d][key]).sort();
  if (!dagen.length) return null;
  const d = dagen[dagen.length - 1];
  const e = j.dagen[d][key];
  return { dag: d, boek: e.boek, blz: e.blz, vraag: e.vraag };
}

function view(naam, now = new Date()) {
  const s = instellingen();
  if (!s.aan) throw new Error('De leerkracht zette de Leescheck nog niet aan.');
  const w = wie(naam);
  const dag = datum(now);
  const j = jaar(now);
  const vandaag = (j.dagen[dag] || {})[w.key] || null;
  const vorig = vorige(j, w.key, dag);
  // Al ingevuld vandaag: dezelfde vraag houden, ook als de leerkracht de vragen intussen aanpaste.
  const q = vandaag ? { tekst: vandaag.vraag, kort: !!vandaag.kort } : vraagVoor(dag, w.key, s.vragen, vorig ? vorig.vraag : '');
  return {
    naam: w.naam,
    dag,
    vraag: q.tekst,
    kort: q.kort,
    vandaag: vandaag ? { boek: vandaag.boek, blz: vandaag.blz, antwoord: vandaag.antwoord } : null,
    vorige: vorig ? { dag: vorig.dag, boek: vorig.boek, blz: vorig.blz } : null,
  };
}

const woorden = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;

function bewaar({ naam, boek, blz, antwoord } = {}, now = new Date()) {
  const v = view(naam, now);
  const w = wie(naam);
  const titel = String(boek || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!titel) throw new Error('Schrijf de titel van je boek.');
  const nr = Number(blz);
  if (!Number.isInteger(nr) || nr < 1 || nr > 3000) throw new Error('Schrijf op welke bladzijde je nu bent.');
  const tekst = String(antwoord || '').trim().replace(/\s+/g, ' ').slice(0, 400);
  if (!tekst) throw new Error('Schrijf je antwoord.');
  const j = jaar(now);
  if (!j.dagen[v.dag]) j.dagen[v.dag] = {};
  j.dagen[v.dag][w.key] = { naam: w.naam, boek: titel, blz: nr, vraag: v.vraag, ...(v.kort ? { kort: true } : {}), antwoord: tekst, t: now.toISOString() };
  schrijfJson(jaarFile(j.schooljaar), j);
  return view(naam, now);
}

// ---------- Het overzicht voor de leerkracht ----------

// De laatste n schooldagen (maandag tot vrijdag), tot en met vandaag.
function schooldagen(n, now = new Date()) {
  const uit = [];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  while (uit.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) uit.unshift(datum(d));
    d.setDate(d.getDate() - 1);
  }
  return uit;
}

const normaal = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Wat valt op aan dit antwoord? Vergeleken met de vorige keer van dezelfde leerling en met de rest van de klas.
// klasgenoten: van elk antwoord (genormaliseerd) wie het schreef, over het hele schooljaar.
function signalen(e, vorig, eerder, klasgenoten = new Map(), key = '') {
  const uit = [];
  if (vorig && normaal(vorig.boek) === normaal(e.boek)) {
    const verschil = e.blz - vorig.blz;
    if (verschil <= 0) uit.push('stil');
    else if (verschil > SPRONG_PER_DAG * Math.max(1, dagenTussen(vorig.dag, e.dag))) uit.push('sprong');
  } else if (vorig) uit.push('nieuw');
  // Een korte vraag (een naam, één woord): dan is kort en hetzelfde gewoon normaal.
  if (e.kort) return uit;
  if (woorden(e.antwoord) < 7) uit.push('kort');
  const a = normaal(e.antwoord);
  if (a && (eerder.has(a) || [...(klasgenoten.get(a) || [])].some(k => k !== key))) uit.push('zelfde');
  return uit;
}

function overzicht({ dagen = 10 } = {}, now = new Date()) {
  const s = instellingen();
  const n = [5, 10, 20, 40].includes(Number(dagen)) ? Number(dagen) : 10;
  const lijst = schooldagen(n, now);
  const vandaag = datum(now);
  const j = jaar(now);
  const alle = Object.keys(j.dagen).sort();

  // Iedereen van de klaslijst, en wie zonder klaslijst-naam invulde.
  const leerlingen = new Map();
  for (const l of klas.read().leerlingen) leerlingen.set(`id:${l.id}`, { naam: l.naam, opLijst: true });
  for (const d of alle) for (const [key, e] of Object.entries(j.dagen[d])) if (!leerlingen.has(key)) leerlingen.set(key, { naam: e.naam, opLijst: false });

  const wieSchreef = new Map();
  for (const d of alle) for (const [key, e] of Object.entries(j.dagen[d])) {
    if (e.kort) continue;
    const a = normaal(e.antwoord);
    if (!wieSchreef.has(a)) wieSchreef.set(a, new Set());
    wieSchreef.get(a).add(key);
  }

  const rijen = [];
  for (const [key, l] of leerlingen) {
    const eerder = new Set();
    let vorig = null;
    const cellen = {};
    let gemist = 0;
    let gedaan = 0;
    let opvallend = 0;
    for (const d of alle) {
      const e = j.dagen[d][key];
      if (!e) continue;
      const sig = signalen({ ...e, dag: d }, vorig, eerder, wieSchreef, key);
      if (lijst.includes(d)) {
        cellen[d] = { boek: e.boek, blz: e.blz, vraag: e.vraag, antwoord: e.antwoord, signalen: sig };
        gedaan++;
        if (sig.some(x => x !== 'nieuw')) opvallend++;
      }
      if (!e.kort) eerder.add(normaal(e.antwoord));
      vorig = { dag: d, boek: e.boek, blz: e.blz };
    }
    // Gemist: schooldagen zonder leescheck, maar pas vanaf de eerste dag dat de klas de Leescheck gebruikte.
    const eersteKlasDag = alle[0] || vandaag;
    for (const d of lijst) {
      if (d < eersteKlasDag || d === vandaag) continue;
      if (!cellen[d]) gemist++;
    }
    rijen.push({ naam: l.naam, opLijst: l.opLijst, cellen, gemist, gedaan, opvallend, vandaag: !!cellen[vandaag], boek: vorig ? vorig.boek : '', blz: vorig ? vorig.blz : null });
  }
  rijen.sort((a, b) => (b.opLijst - a.opLijst) || a.naam.localeCompare(b.naam, 'nl'));
  const opLijst = rijen.filter(r => r.opLijst);
  return {
    aan: s.aan,
    dagen: lijst,
    vandaag,
    leerlingen: rijen,
    telling: { vandaag: rijen.filter(r => r.vandaag).length, totaal: opLijst.length || rijen.length },
  };
}

module.exports = { VRAGEN, staat, zet, view, bewaar, overzicht, schooldagen, signalen, datum, get DIR() { return DIR(); } };
