// De Zonnewijzer: lesroosters en een weekplanning, met per les het doel en de succescriteria.
// Alles staat in kleine JSON-bestanden in zonnewijzer/: roosters.json en één bestand per week (week-2026-W44.json).
// Zo gaat het mee met Mijn lesmap: thuis plannen, en 's morgens staat het op het digibord.
// Een les hangt aan een plek: dag (1 = maandag) en het hoeveelste lesuur van die dag (pauzes tellen niet mee).
// Wissel je het rooster van een week, dan blijven de lessen dus op "maandag, 2e lesuur" staan.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const gegevens = require('./gegevens');
const doelen = require('./doelen');

const DIR = gegevens.pad('zonnewijzer');
const ROOSTERS = 'roosters.json';
const WEEK = /^\d{4}-W\d{2}$/;
const DAGEN = [1, 2, 3, 4, 5];
const MAX_UREN = 20;
const MAX_ROOSTERS = 12;
const tekst = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x1f]/g, ' ').trim().slice(0, max);
const tijd = v => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? String(v) : '');

function lees(naam, leeg) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, naam), 'utf8')); } catch { return leeg; }
}
function schrijf(naam, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const doel = path.join(DIR, naam);
  fs.writeFileSync(`${doel}.tmp`, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(`${doel}.tmp`, doel);
}

// Een rooster = per dag (1 = maandag) een lijst uren: { van, tot, soort: 'les' | 'pauze', vak }.
// Elke dag heeft zijn eigen tijden: maandag begint met onthaal om 9 uur, woensdagnamiddag is vrij...
// Oudere roosters (één lijst uren voor alle dagen + vakken per dag) worden bij het lezen omgezet.

// Een gewone schooldag: vier lesuren voor de middag, drie erna (woensdagnamiddag vrij).
function voorbeeldRooster() {
  const uren = [
    ['08:30', '09:20'], ['09:20', '10:10'], ['10:10', '10:25', 'pauze'], ['10:25', '11:15'], ['11:15', '12:05'],
    ['12:05', '13:15', 'pauze'], ['13:15', '14:05'], ['14:05', '14:55'], ['14:55', '15:10', 'pauze'], ['15:10', '16:00'],
  ].map(([van, tot, soort]) => ({ van, tot, soort: soort || 'les' }));
  const vakken = { 1: ['Rekenen', 'Taal', 'Frans', 'WO', 'Muzo', 'Muzo', 'LO'], 2: ['Rekenen', 'Taal', 'Spelling', 'WO', 'Godsdienst', 'WO', 'Lezen'],
    3: ['Rekenen', 'Taal', 'Frans', 'Spelling'], 4: ['Rekenen', 'Taal', 'WO', 'Godsdienst', 'Frans', 'LO', 'Muzo'], 5: ['Rekenen', 'Taal', 'Spelling', 'Lezen', 'WO', 'Godsdienst', 'Muzo'] };
  return schoonRooster({ id: 'standaard', naam: 'Mijn rooster', uren, vakken });
}

// Van het oude formaat naar uren per dag. Een dag zonder vakken na de middag (woensdag) stopt na het laatste vak.
function naarDagen(r) {
  const dagen = {};
  for (const d of DAGEN) {
    const vakken = (r.vakken || {})[d] || [];
    let n = 0;
    const lijst = (Array.isArray(r.uren) ? r.uren : []).map(u => (u.soort === 'pauze' ? { ...u, vak: '' } : { ...u, vak: vakken[n++] || '' }));
    let laatste = -1;
    lijst.forEach((u, i) => { if (u.soort === 'les' && u.vak) laatste = i; });
    dagen[d] = laatste < 0 ? [] : lijst.slice(0, laatste + 1);
  }
  return dagen;
}

function schoonRooster(r) {
  const bron = r && r.dagen && typeof r.dagen === 'object' ? r.dagen : naarDagen(r || {});
  const dagen = {};
  for (const d of DAGEN) {
    dagen[d] = (Array.isArray(bron[d]) ? bron[d] : []).slice(0, MAX_UREN)
      .map(u => ({ van: tijd(u.van), tot: tijd(u.tot), soort: u.soort === 'pauze' ? 'pauze' : 'les', vak: u.soort === 'pauze' ? tekst(u.vak, 30) || '' : tekst(u.vak, 30) }))
      .sort((a, b) => (a.van && b.van ? a.van.localeCompare(b.van) : 0));
  }
  return { id: /^[\w-]{1,40}$/.test((r && r.id) || '') ? r.id : crypto.randomBytes(4).toString('hex'), naam: tekst(r && r.naam, 40) || 'Rooster', dagen };
}

// De lesuren van een dag met hun nummer (pauzes tellen niet mee): de plek van een les is "dag-nummer".
const lesUren = (r, d) => (r.dagen[d] || []).filter(u => u.soort === 'les');

function roosters() {
  const data = lees(ROOSTERS, null);
  if (!data || !Array.isArray(data.roosters) || !data.roosters.length) return { roosters: [voorbeeldRooster()], standaard: 'standaard', nieuw: true };
  const lijst = data.roosters.map(schoonRooster);
  return { roosters: lijst, standaard: lijst.some(r => r.id === data.standaard) ? data.standaard : lijst[0].id };
}

function bewaarRoosters(data) {
  const lijst = (Array.isArray(data && data.roosters) ? data.roosters : []).slice(0, MAX_ROOSTERS).map(schoonRooster);
  if (!lijst.length) throw new Error('Hou minstens één rooster over.');
  if (new Set(lijst.map(r => r.id)).size !== lijst.length) throw new Error('Twee roosters hebben dezelfde id.');
  const standaard = lijst.some(r => r.id === data.standaard) ? data.standaard : lijst[0].id;
  schrijf(ROOSTERS, { roosters: lijst, standaard });
  return roosters();
}

// Roosters uit een bestand toevoegen (bv. van een collega of uit het schoolrooster). Zelfde naam = vervangen.
function importeerRoosters(data) {
  const nieuw = (Array.isArray(data && data.roosters) ? data.roosters : Array.isArray(data) ? data : []).map(schoonRooster);
  if (!nieuw.length) throw new Error('In dit bestand staan geen lesroosters.');
  const nu = lees(ROOSTERS, null) ? roosters() : { roosters: [], standaard: '' };
  const lijst = nu.roosters.slice();
  for (const r of nieuw) {
    const i = lijst.findIndex(x => x.naam.toLowerCase() === r.naam.toLowerCase());
    if (i >= 0) lijst[i] = { ...r, id: lijst[i].id };
    else {
      if (lijst.some(x => x.id === r.id)) r.id = crypto.randomBytes(4).toString('hex');
      lijst.push(r);
    }
  }
  if (lijst.length > MAX_ROOSTERS) throw new Error(`Hooguit ${MAX_ROOSTERS} roosters.`);
  const standaard = lijst.some(r => r.id === nu.standaard) ? nu.standaard : lijst.find(r => r.naam.toLowerCase() === nieuw[0].naam.toLowerCase()).id;
  return { ...bewaarRoosters({ roosters: lijst, standaard }), toegevoegd: nieuw.length };
}

// ---------- Weken ----------

function weekNaam(week) {
  if (!WEEK.test(String(week))) throw new Error('Ongeldige week.');
  return `week-${week}.json`;
}

const SLOT = /^[1-5]-\d{1,2}$/;

function schoonLes(l) {
  if (!l || typeof l !== 'object') return null;
  const les = {
    vak: tekst(l.vak, 30),
    titel: tekst(l.titel, 120),
    map: tekst(l.map, 240),
    nr: Math.max(0, Math.min(999, Math.floor(Number(l.nr)) || 0)),
    doelen: (Array.isArray(l.doelen) ? l.doelen : []).map(doelen.clean).filter(Boolean).slice(0, 6),
    doel: tekst(l.doel, 300),
    criteria: (Array.isArray(l.criteria) ? l.criteria : []).map(c => tekst(c, 160)).filter(Boolean).slice(0, 8),
    af: (Array.isArray(l.af) ? l.af : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 8),
    notitie: tekst(l.notitie, 600),
  };
  if (!les.titel && !les.doel && !les.criteria.length && !les.notitie && !les.nr) return null;
  return les;
}

function week(id) {
  const data = lees(weekNaam(id), {});
  const lessen = {};
  for (const [slot, l] of Object.entries(data.lessen || {})) {
    const les = SLOT.test(slot) && schoonLes(l);
    if (les) lessen[slot] = les;
  }
  return { week: id, rooster: typeof data.rooster === 'string' ? data.rooster : '', lessen };
}

function bewaarWeek(w) {
  const naam = weekNaam(w.week);
  if (!w.rooster && !Object.keys(w.lessen).length) {
    try { fs.unlinkSync(path.join(DIR, naam)); } catch {}
    return;
  }
  schrijf(naam, { week: w.week, rooster: w.rooster, lessen: w.lessen });
}

function zetLes({ week: id, slot, les }) {
  if (!SLOT.test(String(slot))) throw new Error('Ongeldig lesuur.');
  const w = week(id);
  const schoon = schoonLes(les);
  if (schoon) w.lessen[slot] = schoon; else delete w.lessen[slot];
  bewaarWeek(w);
  return w;
}

// Meerdere lessen tegelijk, enkel op lege plekken (Vul de week aan).
function vul({ week: id, lessen }) {
  const w = week(id);
  for (const [slot, l] of Object.entries(lessen || {})) {
    if (!SLOT.test(slot) || w.lessen[slot]) continue;
    const les = schoonLes(l);
    if (les) w.lessen[slot] = les;
  }
  bewaarWeek(w);
  return w;
}

function zetWeekRooster({ week: id, rooster }) {
  const w = week(id);
  w.rooster = tekst(rooster, 40);
  bewaarWeek(w);
  return w;
}

// Afvinken tijdens de les: welke succescriteria zijn gehaald.
function vink({ week: id, slot, i, aan }) {
  const w = week(id);
  const l = w.lessen[slot];
  if (!l) throw new Error('Die les bestaat niet meer.');
  const set = new Set(l.af);
  if (aan) set.add(Number(i)); else set.delete(Number(i));
  l.af = [...set].filter(n => n < l.criteria.length).sort();
  bewaarWeek(w);
  return w;
}

// ---------- Doorschuiven ----------

// De maandag van een ISO-week, en terug.
function maandag(id) {
  const [j, n] = id.split('-W').map(Number);
  const vier = new Date(Date.UTC(j, 0, 4));
  const d = new Date(vier);
  d.setUTCDate(vier.getUTCDate() - ((vier.getUTCDay() + 6) % 7) + (n - 1) * 7);
  return d;
}
function weekVan(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const j = t.getUTCFullYear();
  const n = 1 + Math.round((t - new Date(Date.UTC(j, 0, 4))) / 864e5 / 7 - (3 - ((new Date(Date.UTC(j, 0, 4)).getUTCDay() + 6) % 7)) / 7);
  return `${j}-W${String(n).padStart(2, '0')}`;
}
const volgendeWeek = id => {
  const d = maandag(id);
  d.setUTCDate(d.getUTCDate() + 7);
  return weekVan(d);
};

// De laatst geplande les van dit vak vóór dit lesuur (tot 12 weken terug), om de volgende les voor te stellen.
const slotNr = k => k.split('-').map(Number);
const vroeger = (a, b) => { const [da, ua] = slotNr(a); const [db, ub] = slotNr(b); return da - db || ua - ub; };
const vorigeWeek = id => {
  const d = maandag(id);
  d.setUTCDate(d.getUTCDate() - 7);
  return weekVan(d);
};
function laatsteVan({ vak, week: id, slot } = {}) {
  const v = tekst(vak, 30).toLowerCase();
  if (!v || !WEEK.test(String(id))) return { les: null };
  let w = String(id);
  for (let i = 0; i < 12; i++, w = vorigeWeek(w)) {
    const lessen = week(w).lessen || {};
    const kandidaten = Object.keys(lessen)
      .filter(k => (i > 0 || !SLOT.test(String(slot)) || vroeger(k, slot) < 0) && lessen[k].map && lessen[k].nr && String(lessen[k].vak || '').toLowerCase() === v)
      .sort(vroeger);
    if (kandidaten.length) {
      const l = lessen[kandidaten[kandidaten.length - 1]];
      return { les: { map: l.map, nr: l.nr } };
    }
  }
  return { les: null };
}

function roosterVan(w, alle) {
  return alle.roosters.find(r => r.id === w.rooster) || alle.roosters.find(r => r.id === alle.standaard) || alle.roosters[0];
}

// Een les die niet gehaald werd, schuift naar het volgende uur van hetzelfde vak. De lessen erna schuiven mee,
// tot er een leeg uur van dat vak is. Hooguit acht weken vooruit.
function schuif({ week: id, slot }) {
  const alle = roosters();
  const start = week(id);
  const les = start.lessen[slot];
  if (!les) throw new Error('Daar staat geen les.');
  const vak = les.vak.toLowerCase();
  if (!vak) throw new Error('Geef de les eerst een vak: dan weet ik naar welk uur ze moet.');
  const weken = new Map([[id, start]]);
  const plekken = [];
  let w = id;
  for (let i = 0; i < 8 && plekken.length < 400; i++, w = volgendeWeek(w)) {
    const data = weken.get(w) || week(w);
    weken.set(w, data);
    const r = roosterVan(data, alle);
    for (const d of DAGEN) lesUren(r, d).forEach((x, u) => {
      if (x.vak.toLowerCase() === vak) plekken.push({ w, slot: `${d}-${u}`, d, u });
    });
  }
  plekken.sort((a, b) => a.w.localeCompare(b.w) || a.d - b.d || a.u - b.u);
  const [sd, su] = slot.split('-').map(Number);
  const vanaf = plekken.filter(p => p.w > id || (p.w === id && (p.d > sd || (p.d === sd && p.u >= su))));
  // Staat de les zelf niet op een uur van haar vak (rooster veranderd), dan begint de rij bij haar plek.
  if (!vanaf.length || vanaf[0].w !== id || vanaf[0].slot !== slot) vanaf.unshift({ w: id, slot });
  let mee = null;
  let geschoven = 0;
  for (const p of vanaf) {
    const data = weken.get(p.w);
    const hier = data.lessen[p.slot] || null;
    if (mee) data.lessen[p.slot] = { ...mee, af: [] }; else delete data.lessen[p.slot];
    mee = hier;
    if (hier) geschoven++;
    if (!hier && geschoven) break;
  }
  if (mee) throw new Error(`Er is geen vrij uur ${les.vak} meer in de komende acht weken.`);
  for (const data of weken.values()) bewaarWeek(data);
  return week(id);
}

// ---------- Doel en succescriteria ----------

// Van "De leerling kent ..." naar "Ik ken ...": een voorstel dat de leerkracht nog kan aanpassen.
const IK = { kan: 'kan', kunnen: 'kan', kent: 'ken', kennen: 'ken', weet: 'weet', weten: 'weet', is: 'ben', zijn: 'ben', heeft: 'heb', hebben: 'heb', verkent: 'verken', verkennen: 'verken', neemt: 'neem', nemen: 'neem', leest: 'lees', lezen: 'lees', schrijft: 'schrijf', schrijven: 'schrijf', maakt: 'maak', maken: 'maak', geeft: 'geef', geven: 'geef', gaat: 'ga', gaan: 'ga', doet: 'doe', doen: 'doe', ziet: 'zie', zien: 'zie' };
function ikZin(zin) {
  let s = String(zin || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  // Soms staat het onderwerp er twee keer: "De leerlingen kunnen, ... de leerling kan ...".
  s = s.replace(/^de leerling(?:en)?\s+\S+?[,:]?\s+(?=de leerling(?:en)?\s)/i, '');
  const m = /^de leerling(?:en)?\s+([^\s,]+),?\s*/i.exec(s);
  if (m) {
    const ww = m[1].toLowerCase();
    let ik = IK[ww];
    if (!ik) ik = /en$/.test(ww) ? ww.slice(0, -2).replace(/(.)\1$/, '$1').replace(/v$/, 'f').replace(/z$/, 's') : ww.replace(/([^t])t$/, '$1');
    const stam = w => (IK[w] || w.slice(0, -2).replace(/(.)\1$/, '$1').replace(/v$/, 'f').replace(/z$/, 's'));
    s = `Ik ${ik} ${s.slice(m[0].length).replace(/^en (\w+en)\b/, (_, w) => `en ${stam(w)}`)}`;
  } else s = `Ik kan ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  s = s.replace(/\bzijn\/haar\b/gi, 'mijn').replace(/\s+/g, ' ').trim();
  // Lange opsommingen worden ingekort: de details staan in het doel zelf.
  if (s.length > 150) s = `${s.slice(0, 147).replace(/[\s,;:]+\S*$/, '')}…`;
  return s.replace(/[.;:]$/, '');
}

function doelInfo(codes) {
  const lijst = (Array.isArray(codes) ? codes : []).map(doelen.clean).filter(Boolean).slice(0, 6);
  const info = lijst.map(code => {
    const d = doelen.find(code);
    return { code, tekst: d ? d.tekst : '', vak: d ? d.vak : '' };
  });
  const kort = t => ikZin(String(t).replace(/\s*\([^)]{15,}\)/g, ''));
  const eerste = info.find(d => d.tekst);
  // Het doel op het bord in de taal van de klas: "Vandaag leer ik ...".
  const doel = eerste ? `${kort(eerste.tekst).replace(/^Ik (kan|ken|weet) /, (_, ww) => (ww === 'kan' ? 'Vandaag leer ik ' : `Vandaag leer ik ${ww === 'ken' ? '' : 'weten '}`))}.`.replace(/^Ik /, 'Vandaag leer ik ') : '';
  return { doelen: info, doel, criteria: info.filter(d => d.tekst).map(d => kort(d.tekst)) };
}

// ---------- Mijn lessen: eigen lessen bewaren en later opnieuw kiezen (bv. elke maandag Onthaal) ----------
// Eén klein bestand in zonnewijzer/, dus het gaat mee met Mijn lesmap.
const MIJN = 'mijn-lessen.json';
const MAX_MIJN = 300;

function mijnLessen() {
  const d = lees(MIJN, {});
  return (Array.isArray(d.lessen) ? d.lessen : []).filter(l => l && typeof l.id === 'string');
}

function bewaarMijnLes(l) {
  const les = schoonLes(l);
  if (!les || !les.titel) throw new Error('Geef de les eerst een titel.');
  const { vak, titel, doel, criteria, doelen: codes, notitie } = les;
  const lijst = mijnLessen();
  // Dezelfde titel bij hetzelfde vak: die les bijwerken in plaats van een tweede te maken.
  const zelfde = x => x.titel.toLowerCase() === titel.toLowerCase() && x.vak.toLowerCase() === vak.toLowerCase();
  const oud = lijst.find(zelfde);
  const nieuw = { id: oud ? oud.id : crypto.randomBytes(6).toString('hex'), vak, titel, doel, criteria, doelen: codes, notitie, bewaard: Date.now() };
  const rest = lijst.filter(x => !zelfde(x));
  if (rest.length >= MAX_MIJN) throw new Error(`Hooguit ${MAX_MIJN} lessen in Mijn lessen. Haal er eerst een paar weg.`);
  schrijf(MIJN, { lessen: [nieuw, ...rest] });
  return { mijnLessen: mijnLessen(), id: nieuw.id };
}

function verwijderMijnLes(id) {
  schrijf(MIJN, { lessen: mijnLessen().filter(x => x.id !== id) });
  return { mijnLessen: mijnLessen() };
}

// ---------- Help me invullen: een doel en succescriteria voor een eigen les ----------
// Met een AI-sleutel vraagt de server het aan de AI; zonder sleutel (of als de AI faalt) komt dit ingebouwde voorstel.
const VASTE = [
  [/onthaal|ochtend|welkom|maandagverhaal|weekend/i, 'Ik kan vertellen hoe ik me voel en wat ik beleefde.'],
  [/journaal|nieuws|actua/i, 'Ik kan in eigen woorden vertellen wat er in het nieuws was.'],
  [/quiz/i, 'Ik kan de vragen beantwoorden en weet wat ik nog moet oefenen.'],
  [/kring|gesprek|klasraad/i, 'Ik kan luisteren naar anderen en wacht op mijn beurt.'],
  [/lees|bib|boek/i, 'Ik kan rustig lezen en vertellen waarover mijn boek gaat.'],
  [/contract|weektaak|hoek|zelfstandig/i, 'Ik kan zelfstandig werken en vraag hulp als ik vastzit.'],
  [/dictee|spelling/i, 'Ik kan de woorden juist schrijven met de regel die we leerden.'],
  [/toets|evaluatie|proef/i, 'Ik kan rustig en zelfstandig mijn toets maken en nakijken.'],
  [/turn|zwem|sport|bewe|lo\b/i, 'Ik kan veilig bewegen en hou me aan de afspraken.'],
  [/teken|knutsel|muzi|muziek|zang|drama|beeld/i, 'Ik kan mijn eigen idee uitwerken en vertellen wat ik maakte.'],
  [/godsdienst|levensbeschouw|filosof/i, 'Ik kan mijn mening vertellen en luister naar die van anderen.'],
  [/opruim|afsluit|einde|planning|agenda/i, 'Ik kan vertellen wat ik vandaag leerde en wat ik nog moet doen.'],
];

function ingebouwdVoorstel({ vak, titel } = {}) {
  const delen = tekst(titel, 120).split(/\s*(?:[/,;+&|]|\s-\s)\s*/).filter(Boolean);
  if (!delen.length && vak) delen.push(tekst(vak, 30));
  if (!delen.length) throw new Error('Geef de les eerst een titel, dan help ik met het doel en de succescriteria.');
  const criteria = [];
  for (const deel of delen.slice(0, 5)) {
    const vast = VASTE.find(([re]) => re.test(deel));
    const zin = vast ? vast[1] : `Ik kan vertellen wat ik leerde bij ${deel.charAt(0).toLowerCase()}${deel.slice(1)}.`;
    if (!criteria.includes(zin)) criteria.push(zin);
  }
  const lijst = delen.length > 1 ? `${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}` : delen[0];
  return { doel: `Vandaag: ${lijst.charAt(0).toLowerCase()}${lijst.slice(1)}.`, criteria };
}

function voorstelPrompt({ vak, titel, notitie, leerjaar } = {}) {
  return [
    `Je helpt een leerkracht in Vlaanderen (${leerjaar || '6e leerjaar'}) een les voor te bereiden.`,
    `Vak of activiteit: ${tekst(vak, 30) || 'onbekend'}. Titel van de les: ${tekst(titel, 120)}.`,
    notitie ? `Notitie van de leerkracht: ${tekst(notitie, 600)}` : '',
    'Schrijf het lesdoel zoals de klas het op het bord ziet, kort en in kindertaal, beginnend met "Vandaag leer ik" of "Vandaag".',
    'Schrijf 2 tot 4 succescriteria, elk één korte zin die begint met "Ik kan", concreet en zichtbaar voor de leerkracht.',
    'Standaardnederlands zoals in Vlaanderen. Geef enkel JSON: {"doel": "...", "criteria": ["Ik kan ...", "..."]}',
  ].filter(Boolean).join('\n');
}

function leesVoorstel(data) {
  const doel = tekst(data && data.doel, 300);
  const criteria = (Array.isArray(data && data.criteria) ? data.criteria : []).map(c => tekst(c, 160)).filter(Boolean).slice(0, 6);
  if (!doel && !criteria.length) throw new Error('De AI gaf geen bruikbaar voorstel.');
  return { doel, criteria };
}

module.exports = { DIR, mijnLessen, bewaarMijnLes, verwijderMijnLes, ingebouwdVoorstel, voorstelPrompt, leesVoorstel, vul, roosters, bewaarRoosters, importeerRoosters, schoonRooster, week, laatsteVan, zetLes, zetWeekRooster, vink, schuif, doelInfo, ikZin, weekVan };
