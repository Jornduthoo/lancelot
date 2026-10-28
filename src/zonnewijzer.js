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
const MAX_UREN = 14;
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

// Een gewone schooldag: vier lesuren voor de middag, drie erna (woensdagnamiddag vrij).
function voorbeeldRooster() {
  const uren = [
    ['08:30', '09:20'], ['09:20', '10:10'], ['10:10', '10:25', 'pauze'], ['10:25', '11:15'], ['11:15', '12:05'],
    ['12:05', '13:15', 'pauze'], ['13:15', '14:05'], ['14:05', '14:55'], ['14:55', '15:10', 'pauze'], ['15:10', '16:00'],
  ].map(([van, tot, soort]) => ({ van, tot, soort: soort || 'les' }));
  const vakken = { 1: ['Rekenen', 'Taal', 'Frans', 'WO', 'Muzo', 'Muzo', 'LO'], 2: ['Rekenen', 'Taal', 'Spelling', 'WO', 'Godsdienst', 'WO', 'Lezen'],
    3: ['Rekenen', 'Taal', 'Frans', 'Spelling', '', '', ''], 4: ['Rekenen', 'Taal', 'WO', 'Godsdienst', 'Frans', 'LO', 'Muzo'], 5: ['Rekenen', 'Taal', 'Spelling', 'Lezen', 'WO', 'Godsdienst', 'Muzo'] };
  return { id: 'standaard', naam: 'Mijn rooster', uren, vakken };
}

function schoonRooster(r) {
  const uren = (Array.isArray(r && r.uren) ? r.uren : []).slice(0, MAX_UREN).map(u => ({ van: tijd(u.van), tot: tijd(u.tot), soort: u.soort === 'pauze' ? 'pauze' : 'les' }));
  const lesuren = uren.filter(u => u.soort === 'les').length;
  const vakken = {};
  for (const d of DAGEN) vakken[d] = Array.from({ length: lesuren }, (_, i) => tekst(((r.vakken || {})[d] || [])[i], 30));
  return { id: /^[\w-]{1,40}$/.test(r.id || '') ? r.id : crypto.randomBytes(4).toString('hex'), naam: tekst(r.naam, 40) || 'Rooster', uren, vakken };
}

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
    for (const d of DAGEN) (r.vakken[d] || []).forEach((v, u) => {
      if (v.toLowerCase() === vak) plekken.push({ w, slot: `${d}-${u}`, d, u });
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

module.exports = { DIR, roosters, bewaarRoosters, week, laatsteVan, zetLes, zetWeekRooster, vink, schuif, doelInfo, ikZin, weekVan };
