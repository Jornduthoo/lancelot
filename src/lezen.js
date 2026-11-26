// De Leescheck: leerlingen lezen elke dag een kwartier in hun eigen boek. In één minuut tonen ze op hun toestel dat ze lazen:
// de titel, de bladzijde waar ze nu zijn en een kort antwoord op een vraag die je alleen kunt beantwoorden als je echt las.
// De leerkracht ziet per leerling de dagen naast elkaar en wat opvalt: niets ingevuld, geen nieuwe bladzijden,
// een rare sprong, een heel kort antwoord of hetzelfde antwoord als eerder of als een klasgenoot.
// Standaard staat de Leescheck uit: pas als de leerkracht hem aanzet (Mijn klas > Lezen), zien leerlingen de knop.
// Alles staat per klas in de map lezen/ (in .gitignore): instellingen.json en één bestand per schooljaar.
// Die map gaat mee met Mijn lesmap: wat leerlingen op het digibord invullen, zie je ook op je andere pc's (en via de connector).
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
  'Welk gevoel had een personage in wat je las? Welke woorden in de tekst tonen dat?',
  'Waar en wanneer speelde het stuk dat je las? Hoe weet je dat?',
  'Wat gebeurde er in wat je las, en waardoor gebeurde het?',
  'Wie vertelt het verhaal: een personage (ik) of een verteller? Hoe merk je dat?',
  'Welke eigenschap past bij het hoofdpersonage (dapper, slim, verlegen...)? Geef een voorbeeld uit wat je las.',
  'Kwam er een nieuw personage bij? Wie is het en wat deed het?',
  'Wat was het belangrijkste dat gebeurde in wat je las? Waarom vind je dat?',
  'Welke zin vond je mooi, grappig of spannend? Schrijf hem over.',
  'Welke tekening zou je maken bij wat je las? Beschrijf ze.',
  'Lijkt een personage op jou of op iemand die je kent? Waarin?',
  'Wat zou er gebeuren als het hoofdpersonage een andere keuze maakte?',
  'Wat denkt een personage, maar zegt het niet? Waarom denk je dat?',
  'Welk probleem was er tussen twee personages? Hoe liep het af?',
  'Schrijf twee dingen op die je te weten kwam over een personage.',
  'Wat vond je verrassend in wat je las? Had je het verwacht?',
  'Welk woord las je dat je niet kende? Wat denk je dat het betekent?',
  'Schrijf een zin over waarin iemand iets zegt. Wie zegt het?',
  'Schrijf een zin over met een vraagteken of een uitroepteken.',
  'Schrijf een zin over uit wat je las. Wat is het onderwerp en wat is de persoonsvorm?',
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
  '* Welk zelfstandig naamwoord las je? Schrijf er een op.',
  '* Schrijf drie zelfstandige naamwoorden op uit wat je las.',
  '* Welk werkwoord las je? Schrijf het op zoals het in de zin stond.',
  '* Schrijf een werkwoord op uit wat je las. Wat is het hele werkwoord?',
  '* Schrijf een werkwoord in de verleden tijd op uit wat je las.',
  '* Welk bijvoeglijk naamwoord las je? Bij welk woord hoorde het?',
  '* Schrijf een verkleinwoord op dat je las.',
  '* Schrijf een woord in het meervoud op dat je las.',
  '* Schrijf een samengesteld woord op dat je las (zoals voetbalveld).',
  '* Welk persoonlijk voornaamwoord (ik, jij, hij, zij, wij...) las je? Over wie ging het?',
  '* Schrijf een naam op die met een hoofdletter in je boek stond.',
  '* Schrijf een woord uit je boek op en zijn tegenstelling (zoals groot en klein).',
  '* Welk lang woord las je? Hoeveel lettergrepen heeft het?',
  '* Welk woord vertelde wanneer iets gebeurde (zoals toen, plots, de volgende dag)?',
  '* Welk gevoel paste bij wat je las: blij, bang, boos, verdrietig of verbaasd?',
  '* Welke kleur kwam voor in wat je las? Wat had die kleur?',
  '* Wie zei als laatste iets in wat je las?',
  '* Welk getal kwam voor in wat je las?',
  '* Is je boek echt gebeurd of verzonnen?',
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
const MAX_VRAGEN = 120;
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
  // Wanneer het laatst gewijzigd: bij Mijn lesmap wint de laatste wijziging.
  d.t = new Date().toISOString();
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
  return d && typeof d.dagen === 'object' && d.dagen ? opDezeLijst(d) : { schooljaar: sj, dagen: {} };
}

// Van een andere pc (Mijn lesmap) komt een leerling met het id van daar: op naam terugzoeken op de klaslijst van hier.
// Twee keer dezelfde leerling op één dag: de laatste invulling telt.
function opDezeLijst(j) {
  const ids = new Set(klas.read().leerlingen.map(l => `id:${l.id}`));
  for (const [dag, per] of Object.entries(j.dagen)) {
    if (!per || typeof per !== 'object') { delete j.dagen[dag]; continue; }
    for (const [key, e] of Object.entries(per)) {
      if (ids.has(key) || !e || !e.naam) continue;
      const l = klas.match(e.naam);
      if (!l) continue;
      const k = `id:${l.id}`;
      delete per[key];
      if (!per[k] || String(e.t || '') > String(per[k].t || '')) per[k] = { ...e, naam: l.naam };
    }
  }
  return j;
}

// ---------- Mee met Mijn lesmap ----------

function syncGeldig(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Ongeldig bestand.');
  if ('dagen' in d && (!d.dagen || typeof d.dagen !== 'object' || Array.isArray(d.dagen))) throw new Error('Ongeldig bestand.');
}

// Twee pc's vulden in: alles samen. Een schooljaar: per dag en per leerling de laatste invulling.
// De instellingen (aan of uit, eigen vragen): de laatste wijziging wint.
function syncSamen(hier, daar) {
  const a = JSON.parse(hier), b = JSON.parse(daar);
  if (!('dagen' in a) && !('dagen' in b)) return JSON.stringify(String(b.t || '') > String(a.t || '') ? b : a);
  const uit = { ...a, dagen: {} };
  for (const bron of [a, b]) {
    for (const [dag, per] of Object.entries(bron.dagen || {})) {
      if (!per || typeof per !== 'object') continue;
      const doel = uit.dagen[dag] || (uit.dagen[dag] = {});
      for (const [key, e] of Object.entries(per)) if (!doel[key] || String((e && e.t) || '') > String(doel[key].t || '')) doel[key] = e;
    }
  }
  return JSON.stringify(uit);
}

// Elke leerling een andere vraag, en elke dag een andere: een vaste mengeling van dag en naam.
// Nooit een vraag die de leerling de laatste keren al kreeg (zo blijft het fris), zolang er genoeg vragen zijn.
const NIET_HERHALEN = 10;
function vraagVoor(dag, key, vragen, recent = []) {
  const lijst = vragen.map(vraagVan).filter(q => q.tekst);
  if (!lijst.length) return vraagVan(VRAGEN[0]);
  const al = (Array.isArray(recent) ? recent : [recent]).filter(Boolean);
  // Bij een korte eigen lijst: minstens één vraag blijft altijd over.
  const vermijd = new Set(al.slice(-Math.min(NIET_HERHALEN, lijst.length - 1)));
  let h = 2166136261;
  for (const c of `${dag}|${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let i = h % lijst.length;
  for (let n = 0; n < lijst.length && vermijd.has(lijst[i].tekst); n++) i = (i + 1) % lijst.length;
  return lijst[i];
}

// De vragen die de leerling de laatste keren kreeg (oudste eerst).
function recenteVragen(j, key, dag) {
  return Object.keys(j.dagen).filter(d => d < dag && j.dagen[d][key]).sort().slice(-NIET_HERHALEN).map(d => j.dagen[d][key].vraag);
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
  const q = vandaag ? { tekst: vandaag.vraag, kort: !!vandaag.kort } : vraagVoor(dag, w.key, s.vragen, recenteVragen(j, w.key, dag));
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

module.exports = { syncGeldig, syncSamen, VRAGEN, staat, zet, view, bewaar, overzicht, schooldagen, signalen, datum, get DIR() { return DIR(); } };
