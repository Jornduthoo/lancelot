// Mijn huisdier: elke leerling kiest een ei. Het komt uit zodra je Eer verdient, en groeit mee met je Eer en je zorg.
// Verzorgen: voeren (met snoepjes die je met Eer verdient), poetsen en spelen. Nooit straf: een huisdier
// dat je lang niet zag, valt gewoon in slaap en wordt blij wakker. Het gaat nooit dood en verliest nooit iets.
// Hoedjes verdien je met je wapenschilden en je rang uit Mijn burcht.
// Bewaard in burchten/huisdieren.json bij de gegevens (die map staat al in .gitignore en in de back-up).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const art = require('../public/js/hd-art');

const FILE = path.join(gegevens.pad('burchten'), 'huisdieren.json');

const UIT_NA = 5; // zoveel Eer na het kiezen van je ei, en het komt uit
const SNOEP_PER = 10; // elke 10 Eer: een snoepje
const SNOEP_START = 3;
const UUR = 3600 * 1000;
// Na hoeveel uur een behoefte helemaal leeg is.
const DUUR = { voer: 48 * UUR, speel: 36 * UUR, poets: 60 * UUR };
const SLAAP = 0.2; // gemiddeld lager dan dit: dan slaapt je huisdier
const PER_DAG = 3; // zo vaak per dag geeft poetsen of spelen groei
const XP = { voer: 3, poets: 2, speel: 5 };
// Welk hoedje bij welk wapenschild (of rang) hoort.
const HOED_NODIG = { strik: () => true, sjaal: s => s.schilden.includes('eerste'), helm: s => s.rang >= 1, krans: s => s.schilden.includes('trouw'),
  bril: s => s.schilden.includes('groeier'), koptel: s => s.schilden.includes('herhaler'), tover: s => s.schilden.includes('runen'),
  bouw: s => s.schilden.includes('bouwmeester'), cape: s => s.schilden.includes('volhouder'), kroon: s => s.schilden.includes('geeerd') };

let data = null;
function load() {
  if (data) return data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    data = {};
  }
  if (!data.dieren || typeof data.dieren !== 'object') data.dieren = {};
  return data;
}
function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Huisdieren bewaren mislukt:', err.message);
  }
}

const p2 = n => String(n).padStart(2, '0');
const vandaag = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
const schoon = (t, max = 16) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max);

function wie(naam) {
  const l = klas.match(naam);
  if (!l) throw new Error('Kies je naam uit de klaslijst. Alleen leerlingen van de klas hebben een huisdier.');
  return l;
}

// De Eer, rang en wapenschilden komen uit Mijn burcht (pas hier opgevraagd: burchten.js gebruikt dit bestand ook).
const burchtStand = naam => require('./burchten').view(naam);

// Hoe vol een behoefte is (0..1), en het tijdstip dat bij een waarde hoort.
const peil = (d, wat, nu) => Math.max(0, Math.min(1, 1 - (nu - Date.parse(d.zorg[wat])) / DUUR[wat]));
const zet = (d, wat, v, nu) => { d.zorg[wat] = new Date(nu - (1 - v) * DUUR[wat]).toISOString(); };

// Ei, baby, jong, groot of ridder, en of er sindsdien iets nieuws is. Komt het ei uit, dan wordt dat bewaard.
function groei(d, eer) {
  const sinds = Math.max(0, eer - (d.start || 0));
  if (!d.uit) {
    if (sinds < UIT_NA) return { fase: 0, groei: 0, sinds };
    const nu = Date.now();
    d.uit = new Date(nu).toISOString();
    d.zorg = {};
    for (const w of Object.keys(DUUR)) zet(d, w, 0.7, nu);
    save();
  }
  const g = sinds + (d.xp || 0);
  let fase = 1;
  for (let i = 1; i < art.FASEN.length; i++) if (g >= art.FASEN[i].vanaf) fase = i;
  return { fase, groei: g, sinds };
}

// Wat een leerling over zijn huisdier ziet.
function view(naam) {
  const st = burchtStand(naam);
  const d = load().dieren[st.id];
  const hoeden = art.HOEDEN.filter(h => !h.id || HOED_NODIG[h.id](st)).map(h => h.id);
  if (!d) return { naam: st.naam, dier: null, hoeden };
  const { fase, groei: g, sinds } = groei(d, st.eer);
  const out = {
    naam: st.naam,
    dier: { soort: d.soort, kleur: d.kleur, naam: d.naam, hoed: hoeden.includes(d.hoed) ? d.hoed : '', fase },
    hoeden,
    groei: g,
    nogTotUit: fase ? 0 : UIT_NA - sinds,
    volgende: art.FASEN[fase + 1] ? art.FASEN[fase + 1].vanaf : null,
    snoepjes: Math.max(0, SNOEP_START + Math.floor(sinds / SNOEP_PER) - (d.snoep || 0)),
    totSnoep: SNOEP_PER - (sinds % SNOEP_PER),
  };
  if (fase) {
    const nu = Date.now();
    for (const w of Object.keys(DUUR)) out[w] = Math.round(peil(d, w, nu) * 100) / 100;
    out.slaapt = (out.voer + out.speel + out.poets) / 3 < SLAAP;
  }
  // Net gegroeid? Eén keer melden.
  if ((d.gezien || 0) < fase) {
    out.nieuw = d.gezien ? 'groei' : 'uit';
    d.gezien = fase;
    save();
  }
  return out;
}

// Een ei kiezen (of zolang het nog een ei is, een ander kiezen).
function kies(naam, { soort, kleur, dierNaam } = {}) {
  const st = burchtStand(naam);
  const d = load();
  const oud = d.dieren[st.id];
  if (oud && oud.uit) throw new Error('Je huisdier is al uit het ei.');
  if (!art.SOORTEN.some(s => s.id === soort)) throw new Error('Kies eerst een soort.');
  const k = Number(kleur);
  d.dieren[st.id] = {
    soort,
    kleur: Number.isInteger(k) && k >= 0 && k < art.KLEUREN.length ? k : 0,
    naam: schoon(dierNaam) || (oud && oud.naam) || '',
    hoed: '',
    start: oud ? oud.start : st.eer,
    t: oud ? oud.t : new Date().toISOString(),
    xp: 0,
    snoep: 0,
  };
  save();
  return view(naam);
}

// Naam, kleur en hoedje: mag altijd.
function stijl(naam, { dierNaam, kleur, hoed } = {}) {
  const v = view(naam);
  const st = burchtStand(naam);
  const d = load().dieren[st.id];
  if (!d) throw new Error('Kies eerst een ei.');
  if (dierNaam !== undefined) d.naam = schoon(dierNaam);
  if (kleur !== undefined) {
    const k = Number(kleur);
    if (Number.isInteger(k) && k >= 0 && k < art.KLEUREN.length) d.kleur = k;
  }
  if (hoed !== undefined) {
    if (hoed && !v.hoeden.includes(hoed)) throw new Error('Dat hoedje heb je nog niet verdiend.');
    d.hoed = hoed || '';
  }
  save();
  return view(naam);
}

// Verzorgen: wakker maken, voeren, poetsen of spelen (score: hoeveel sterren je ving in het spelletje).
function zorg(naam, { wat, score } = {}) {
  const v = view(naam);
  const st = burchtStand(naam);
  const d = load().dieren[st.id];
  if (!d || !v.dier.fase) throw new Error('Je ei moet eerst uitkomen. Verdien wat Eer!');
  const nu = Date.now();
  const dag = vandaag();
  if (!d.dag || d.dag.d !== dag) d.dag = { d: dag, poets: 0, speel: 0 };
  let erbij = 0;
  if (wat === 'wakker') {
    if (!v.slaapt) return v;
    for (const w of Object.keys(DUUR)) zet(d, w, Math.max(peil(d, w, nu), 0.6), nu);
  } else if (wat === 'voer') {
    if (v.voer >= 0.95) throw new Error(`${d.naam || 'Je huisdier'} zit vol!`);
    if (v.snoepjes < 1) throw new Error(`Nog ${v.totSnoep} Eer tot je volgende snoepje.`);
    d.snoep = (d.snoep || 0) + 1;
    zet(d, 'voer', Math.min(1, peil(d, 'voer', nu) + 0.45), nu);
    erbij = XP.voer;
  } else if (wat === 'poets') {
    if (v.poets < 0.7 && d.dag.poets < PER_DAG) {
      d.dag.poets++;
      erbij = XP.poets;
    }
    zet(d, 'poets', 1, nu);
  } else if (wat === 'speel') {
    if (d.dag.speel < PER_DAG) {
      d.dag.speel++;
      erbij = Math.max(1, Math.min(XP.speel, Math.round(Number(score) || 0)));
    }
    zet(d, 'speel', 1, nu);
  } else throw new Error('Dat kan je huisdier niet.');
  // Wie verzorgt, maakt ook wakker.
  for (const w of Object.keys(DUUR)) if (peil(d, w, nu) < 0.3) zet(d, w, 0.3, nu);
  d.xp = (d.xp || 0) + erbij;
  save();
  return { ...view(naam), erbij };
}

// Voor het Klaseiland en Mijn burcht: per leerling-id het dier om te tekenen (of niets).
function tekenVan(id, eer, rang, schilden) {
  const d = load().dieren[id];
  if (!d) return null;
  const sinds = Math.max(0, eer - (d.start || 0));
  let fase = 0;
  if (d.uit) {
    const g = sinds + (d.xp || 0);
    fase = 1;
    for (let i = 1; i < art.FASEN.length; i++) if (g >= art.FASEN[i].vanaf) fase = i;
  }
  const mag = d.hoed && HOED_NODIG[d.hoed] && HOED_NODIG[d.hoed]({ rang, schilden: schilden || [] });
  return { soort: d.soort, kleur: d.kleur, naam: d.naam, hoed: mag ? d.hoed : '', fase };
}

// Alleen om te tekenen (Het rijk van Lancelot): zonder iets te melden of te bewaren.
function tekenNaam(naam) {
  const st = burchtStand(naam);
  return tekenVan(st.id, st.eer, st.rang, st.schilden);
}

// De leerkracht wist een naam die niet door de beugel kan.
function wisNaam(id) {
  const d = load().dieren[id];
  if (d) {
    d.naam = '';
    save();
  }
}
const naamVan = id => (load().dieren[id] || {}).naam || '';

module.exports = { view, kies, stijl, zorg, tekenVan, tekenNaam, wisNaam, naamVan };
