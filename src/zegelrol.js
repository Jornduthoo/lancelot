// De Zegelrol: het rapport. Eén JSON-bestand per rapport in zegelrol/ (rapport-<id>.json) en de opmaak in opmaak.json.
// Een rapport heeft een periode (van, tot). Elke toets uit De Proef die in die periode werd afgenomen, komt er vanzelf in,
// bij het juiste vak (uit de leerplandoelen van de vragen), met een korte inhoud en de punten van elke leerling.
// De leerkracht zet er eigen punten, vakken, symbolen (kroon, duim, vinkje, plantje), commentaar en "Hoe werk ik?" bij.
// Rapporten bevatten punten en commentaar: ze blijven op deze pc en gaan nooit mee naar de lesmap.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const gegevens = require('./gegevens');
const doelen = require('./doelen');
const klas = require('./klas');
const proeven = require('./proeven');

const DIR = gegevens.pad('zegelrol');
const OPMAAK = 'opmaak.json';
const ID = /^[a-f0-9]{8}$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VAKKEN = 24;
const MAX_ONDERDELEN = 40;
const MAX_ATT = 16;
const SYMBOLEN = ['kroon', 'duim', 'vinkje', 'plant'];
const SJABLONEN = ['perkament', 'strak', 'kleurrijk', 'compact'];
const SETS = ['ridder', 'smileys', 'sterren', 'woorden'];
const tekst = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x09\x0b-\x1f]/g, ' ').trim().slice(0, max);
const regel = (v, max) => tekst(v, max).replace(/\n/g, ' ');
const nieuwId = () => crypto.randomBytes(4).toString('hex');
const half = n => Math.round(n * 2) / 2;

function lees(naam, leeg) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, naam), 'utf8')); } catch { return leeg; }
}
function schrijf(naam, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const doel = path.join(DIR, naam);
  fs.writeFileSync(`${doel}.tmp`, JSON.stringify(data));
  fs.renameSync(`${doel}.tmp`, doel);
}
const bestand = id => {
  if (!ID.test(String(id))) throw new Error('Dat rapport bestaat niet.');
  return `rapport-${id}.json`;
};

// ---------- De opmaak: één keer kiezen, geldt voor elk rapport ----------

const TOON = {
  onderdelen: true, inhoud: true, totaal: true, procent: false, balkjes: true, gemiddelde: false, evolutie: false,
  symbool: true, commentaar: true, attitudes: true, algemeen: true, afwezig: true, niveau: false, handtekening: true, strookje: false, legenda: true, zegel: true,
};
const ZINNEN = [
  '{naam} werkt hard en dat zie je aan de resultaten. Hou zo vol!',
  '{naam} is een fijne klasgenoot die graag helpt.',
  '{naam} mag nog wat meer durven vragen als iets niet lukt.',
  'Blijf de maaltafels en deeltafels thuis oefenen.',
  'Lees elke dag een kwartiertje, dat helpt voor alle vakken.',
  'Werk nog wat rustiger en kijk je werk na voor je afgeeft.',
  '{naam} heeft een mooie groei gemaakt. Proficiat!',
  'Een prima rapport. Geniet van de vakantie!',
];

function schoonOpmaak(o = {}) {
  const toon = {};
  for (const [k, v] of Object.entries(TOON)) toon[k] = o.toon && typeof o.toon[k] === 'boolean' ? o.toon[k] : v;
  const labels = {};
  for (const s of SYMBOLEN) labels[s] = regel(o.labels && o.labels[s], 30);
  const logo = typeof o.logo === 'string' && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(o.logo) && o.logo.length < 400e3 ? o.logo : '';
  return {
    sjabloon: SJABLONEN.includes(o.sjabloon) ? o.sjabloon : 'perkament',
    kleur: /^#[0-9a-f]{6}$/i.test(o.kleur || '') ? o.kleur : '#1f4e8c',
    set: SETS.includes(o.set) ? o.set : 'ridder',
    labels,
    herleid: [0, 10, 20, 100].includes(Number(o.herleid)) ? Number(o.herleid) : 0,
    logo,
    school: regel(o.school, 80),
    adres: regel(o.adres, 120),
    leerkracht: regel(o.leerkracht, 60),
    directie: regel(o.directie, 60),
    schooljaar: regel(o.schooljaar, 20) || schooljaar(new Date()),
    toon,
    zinnen: (Array.isArray(o.zinnen) ? o.zinnen : ZINNEN).map(z => regel(z, 240)).filter(Boolean).slice(0, 40),
  };
}
function schooljaar(d) {
  const j = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${j}-${j + 1}`;
}
const opmaak = () => schoonOpmaak(lees(OPMAAK, {}));
function bewaarOpmaak(o) {
  const nu = schoonOpmaak(o);
  schrijf(OPMAAK, nu);
  return nu;
}

// ---------- Vakken en hoe een toets bij een vak komt ----------

const STANDAARD = [
  ['wiskunde', 'Wiskunde', '🧮', true], ['nederlands', 'Nederlands', '📖', true], ['frans', 'Frans', '🥐', true], ['wo', 'Wereldoriëntatie', '🌍', true],
  ['muzo', 'Muzische vorming', '🎨', false], ['lo', 'Lichamelijke opvoeding', '⚽', false], ['godsdienst', 'Godsdienst', '🕊️', false],
];
// Het vak uit de leerplandoelen ('Wiskunde', 'Geschiedenis' ...) of uit de titel van de toets.
const DOELVAK = { Wiskunde: 'wiskunde', Nederlands: 'nederlands', Frans: 'frans', Aardrijkskunde: 'wo', Geschiedenis: 'wo', 'Wetenschap en techniek': 'wo',
  'Muzische vorming': 'muzo', 'LO en motoriek': 'lo', 'Rooms-katholieke godsdienst': 'godsdienst', ICT: 'ict' };
const TITELVAK = [[/reken|wiskunde|getal|breuk|meten|meetkunde|maaltafel|deling|procent/i, 'wiskunde'], [/frans|français|mission/i, 'frans'],
  [/taal|spelling|nederlands|lezen|dictee|werkwoord|zinsontleding|woordenschat/i, 'nederlands'], [/wo\b|wereld|aardrijk|geschied|natuur|techniek|wetenschap/i, 'wo']];

function schoonVak(v) {
  if (!v || typeof v !== 'object') return null;
  const naam = regel(v.naam, 40);
  if (!naam) return null;
  return {
    id: /^[\w-]{1,24}$/.test(v.id || '') ? v.id : nieuwId(),
    naam,
    icoon: regel(v.icoon, 8),
    punten: v.punten !== false,
    onderdelen: (Array.isArray(v.onderdelen) ? v.onderdelen : []).slice(0, MAX_ONDERDELEN).map(o => {
      if (!o || typeof o !== 'object') return null;
      const max = Math.max(0.5, Math.min(1000, half(Number(o.max) || 0) || 10));
      return {
        id: /^[\w-]{1,24}$/.test(o.id || '') ? o.id : nieuwId(),
        naam: regel(o.naam, 80) || 'Toets',
        inhoud: regel(o.inhoud, 160),
        max,
        toets: typeof o.toets === 'string' && /^[\w-]+\.json$/.test(o.toets) ? o.toets : '',
        datum: DATUM.test(o.datum || '') ? o.datum : '',
      };
    }).filter(Boolean),
  };
}
const standaardVakken = () => STANDAARD.map(([id, naam, icoon, punten]) => ({ id, naam, icoon, punten, onderdelen: [] }));

function vakVanToets(toets, vakken) {
  const lijst = proeven.K.vragenVan(proeven.K.lijstVoor(toets, 'schildknaap'));
  const codes = lijst.flatMap(({ q }) => [q.doel, ...(Array.isArray(q.velden) ? q.velden.map(v => v && v.doel) : [])]).filter(Boolean);
  const id = DOELVAK[doelen.hoofdvak(codes)] || (TITELVAK.find(([re]) => re.test(toets.title || '')) || [])[1] || '';
  // Eigen vakken: op naam ("Rekenen" vangt ook wiskunde-toetsen als er geen vak Wiskunde is).
  if (id && vakken.some(v => v.id === id)) return id;
  const naam = Object.entries(DOELVAK).find(([, v]) => v === id)?.[0] || '';
  const hit = vakken.find(v => naam && v.naam.toLowerCase() === naam.toLowerCase())
    || vakken.find(v => TITELVAK.some(([re, t]) => t === id && re.test(v.naam)));
  return hit ? hit.id : '';
}

// Korte inhoud: de domeinen van de leerplandoelen ("Getallenkennis, Bewerkingen"), anders het begin van de inleiding.
function inhoudVan(toets) {
  const lijst = proeven.K.vragenVan(proeven.K.lijstVoor(toets, 'schildknaap'));
  const domeinen = [...new Set(lijst.map(({ q }) => q.doel && doelen.find(q.doel)).filter(Boolean).map(d => d.cluster || d.domein).filter(Boolean))];
  if (domeinen.length) return regel(domeinen.slice(0, 3).join(' · '), 160);
  return regel(String(toets.intro || '').split(/[.!?\n]/)[0], 120);
}

// ---------- Een rapport ----------

function schoonLeerling(l = {}) {
  const getallen = {};
  for (const [k, v] of Object.entries(l.p || {})) {
    if (!/^[\w-]{1,24}$/.test(k)) continue;
    if (v === 'A' || v === 'V') getallen[k] = v; // afwezig of vrijgesteld: telt niet mee
    else if (v !== null && v !== '' && Number.isFinite(Number(v))) getallen[k] = Math.max(0, half(Number(v)));
  }
  const sym = {};
  for (const [k, v] of Object.entries(l.s || {})) if (/^[\w-]{1,24}$/.test(k) && SYMBOLEN.includes(v)) sym[k] = v;
  const com = {};
  for (const [k, v] of Object.entries(l.c || {})) if (/^[\w-]{1,24}$/.test(k) && tekst(v, 1200)) com[k] = tekst(v, 1200);
  const n = v => Math.max(0, Math.min(200, half(Number(v) || 0)));
  return { p: getallen, s: sym, c: com, alg: tekst(l.alg, 2000), afw: { g: n(l.afw && l.afw.g), o: n(l.afw && l.afw.o) } };
}

function schoonRapport(r, id) {
  const leerlingen = {};
  for (const [k, v] of Object.entries((r && r.leerlingen) || {})) if (/^[\w-]{1,24}$/.test(k)) leerlingen[k] = schoonLeerling(v);
  const att = (Array.isArray(r && r.attitudes) ? r.attitudes : []).slice(0, MAX_ATT)
    .map(a => (a && regel(a.tekst, 100) ? { id: /^[\w-]{1,24}$/.test(a.id || '') ? a.id : nieuwId(), tekst: regel(a.tekst, 100) } : null)).filter(Boolean);
  const vakken = (Array.isArray(r && r.vakken) ? r.vakken : []).slice(0, MAX_VAKKEN).map(schoonVak).filter(Boolean);
  return {
    id,
    titel: regel(r && r.titel, 60) || 'Rapport',
    van: DATUM.test((r && r.van) || '') ? r.van : '',
    tot: DATUM.test((r && r.tot) || '') ? r.tot : '',
    datum: DATUM.test((r && r.datum) || '') ? r.datum : '',
    boodschap: tekst(r && r.boodschap, 600),
    vakken,
    attitudes: att,
    weg: (Array.isArray(r && r.weg) ? r.weg : []).filter(f => typeof f === 'string' && /^[\w-]+\.json$/.test(f)).slice(0, 500),
    leerlingen,
    gewijzigd: (r && r.gewijzigd) || new Date().toISOString(),
  };
}

const ATTITUDES = ['Ik werk zelfstandig.', 'Ik werk netjes en verzorgd.', 'Ik luister goed en volg de afspraken.', 'Ik werk goed samen en help anderen.',
  'Ik heb mijn materiaal en huiswerk in orde.', 'Ik zet door als iets moeilijk is.'];

function lijst() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => /^rapport-[a-f0-9]{8}\.json$/.test(f)).map(f => {
    const r = lees(f, null);
    if (!r) return null;
    const onderdelen = (r.vakken || []).reduce((n, v) => n + (v.onderdelen || []).length, 0);
    return { id: f.slice(8, 16), titel: r.titel, van: r.van, tot: r.tot, gewijzigd: r.gewijzigd, onderdelen };
  }).filter(Boolean).sort((a, b) => (b.tot || '').localeCompare(a.tot || '') || (b.gewijzigd || '').localeCompare(a.gewijzigd || ''));
}

function vandaag() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Een nieuw rapport. Met `kopie` krijgt het dezelfde vakken, eigen onderdelen (zonder punten) en "Hoe werk ik?".
function nieuw({ titel, van, tot, kopie } = {}) {
  const vorig = kopie ? lees(bestand(kopie), null) : null;
  const id = nieuwId();
  const r = schoonRapport({
    titel: titel || `Rapport ${lijst().length + 1}`, van, tot: tot || vandaag(), datum: tot || vandaag(),
    vakken: vorig ? vorig.vakken.map(v => ({ ...v, onderdelen: (v.onderdelen || []).filter(o => !o.toets).map(o => ({ ...o, id: nieuwId() })) })) : standaardVakken(),
    attitudes: vorig ? vorig.attitudes : ATTITUDES.map(t => ({ tekst: t })),
    boodschap: vorig ? vorig.boodschap : '',
  }, id);
  if (!r.van) throw new Error('Kies de eerste dag van de periode.');
  if (r.van > r.tot) throw new Error('De eerste dag ligt na de laatste dag.');
  schrijf(bestand(id), r);
  return laad(id);
}

// De toetsen van de periode erbij zetten: nieuwe afnames komen bij hun vak, verwijderde (weg) niet meer.
function haalToetsen(r) {
  const bekend = new Set([...r.weg, ...r.vakken.flatMap(v => v.onderdelen.map(o => o.toets).filter(Boolean))]);
  let nieuw = 0;
  for (const a of proeven.afnames()) {
    const dag = String(a.datum || '').slice(0, 10);
    if (bekend.has(a.file) || !dag || dag < r.van || (r.tot && dag > r.tot)) continue;
    let rec;
    try { rec = proeven.laadAfname(a.file); } catch { continue; }
    let vak = vakVanToets(rec.toets, r.vakken);
    if (!vak) {
      let andere = r.vakken.find(v => v.id === 'andere');
      if (!andere) {
        andere = { id: 'andere', naam: 'Andere toetsen', icoon: '📝', punten: true, onderdelen: [] };
        r.vakken.push(andere);
      }
      vak = andere.id;
    }
    const max = proeven.K.totaal ? proeven.K.totaal(proeven.K.lijstVoor(rec.toets, 'schildknaap')) : 0;
    r.vakken.find(v => v.id === vak).onderdelen.push({ id: nieuwId(), naam: regel(rec.title, 80), inhoud: inhoudVan(rec.toets), max: max || 10, toets: a.file, datum: dag });
    nieuw++;
  }
  for (const v of r.vakken) v.onderdelen.sort((x, y) => (x.datum || '9').localeCompare(y.datum || '9'));
  return nieuw;
}

// De punten van een toets per leerling-id, herleid naar het maximum van het onderdeel (een Page-toets kan minder punten hebben).
function toetsPunten(file, max) {
  let rec;
  try { rec = proeven.laadAfname(file); } catch { return { weg: true, punten: {} }; }
  const punten = {};
  for (const s of rec.spelers) {
    const l = klas.match(s.naam);
    if (!l) continue;
    const st = proeven.stand(rec, s);
    if (!st.max) continue;
    punten[l.id] = { p: half(st.punten / st.max * max), open: st.open };
  }
  return { punten, klaar: !!rec.klaar };
}

function laad(id) {
  const r = schoonRapport(lees(bestand(id), null) || (() => { throw new Error('Dat rapport bestaat niet meer.'); })(), id);
  if (haalToetsen(r)) schrijf(bestand(id), r);
  const auto = {};
  for (const v of r.vakken) for (const o of v.onderdelen) if (o.toets) auto[o.id] = toetsPunten(o.toets, o.max);
  const k = klas.read();
  return {
    rapport: r, auto,
    klas: { naam: k.naam, leerjaar: k.leerjaar, leerlingen: k.leerlingen.map(l => ({ id: l.id, naam: l.naam, niveau: l.niveau || 'schildknaap', vakNiveaus: l.vakNiveaus || {} })) },
    vorige: vorigePercenten(r),
  };
}

// Voor "evolutie": het percent per vak en per leerling in het vorige rapport (het laatste dat eerder eindigde).
function vorigePercenten(r) {
  const vorig = lijst().filter(x => x.id !== r.id && x.tot && r.van && x.tot < r.van).sort((a, b) => b.tot.localeCompare(a.tot))[0];
  if (!vorig) return null;
  const v = schoonRapport(lees(bestand(vorig.id), {}), vorig.id);
  const auto = {};
  for (const vak of v.vakken) for (const o of vak.onderdelen) if (o.toets) auto[o.id] = toetsPunten(o.toets, o.max);
  const per = {};
  for (const lid of Object.keys({ ...v.leerlingen, ...Object.fromEntries(klas.read().leerlingen.map(l => [l.id, 1])) })) {
    per[lid] = {};
    for (const vak of v.vakken) {
      let p = 0;
      let m = 0;
      for (const o of vak.onderdelen) {
        const eigen = v.leerlingen[lid] && v.leerlingen[lid].p[o.id];
        const w = eigen !== undefined ? eigen : auto[o.id] && auto[o.id].punten[lid] ? auto[o.id].punten[lid].p : undefined;
        if (typeof w === 'number') { p += w; m += o.max; }
      }
      if (m) per[lid][vak.naam.toLowerCase()] = Math.round(p / m * 100);
    }
  }
  return { titel: v.titel, per };
}

function bewaar(data) {
  const id = data && data.id;
  const oud = lees(bestand(id), null);
  if (!oud) throw new Error('Dat rapport bestaat niet meer.');
  const r = schoonRapport({ ...data, gewijzigd: new Date().toISOString() }, id);
  if (r.van && r.tot && r.van > r.tot) throw new Error('De eerste dag ligt na de laatste dag.');
  schrijf(bestand(id), r);
  return { gewijzigd: r.gewijzigd };
}

function verwijder(id) {
  const p = path.join(DIR, bestand(id));
  const bin = path.join(DIR, '_prullenbak');
  fs.mkdirSync(bin, { recursive: true });
  fs.renameSync(p, path.join(bin, `${Date.now()}-${bestand(id)}`));
}

// De prompt voor een commentaarvoorstel. Zonder naam: de AI krijgt enkel de cijfers en symbolen, {naam} vult LANcelot zelf in.
function commentaarPrompt({ vakken = [], attitudes = [], leerjaar } = {}) {
  const rij = (vakken || []).slice(0, 20).map(v => `- ${regel(v.naam, 40)}: ${v.pct != null ? `${Number(v.pct)}%` : 'geen punten'}${v.symbool ? `, ${regel(v.symbool, 30)}` : ''}`).join('\n');
  const att = (attitudes || []).slice(0, 16).map(a => `- ${regel(a.tekst, 100)}: ${regel(a.symbool, 30) || 'niet ingevuld'}`).join('\n');
  return `Je bent een warme, eerlijke leerkracht van het ${regel(leerjaar, 20) || '6e leerjaar'} in Vlaanderen. Schrijf het algemene commentaar voor het rapport van een leerling.
Gebruik {naam} waar de voornaam moet komen. Schrijf 3 tot 4 korte zinnen in eenvoudig Vlaams-Nederlands, gericht aan de leerling ("je"), positief en concreet: eerst wat goed gaat, dan één werkpunt met een tip, en sluit bemoedigend af. Geen cijfers herhalen, geen opsomming.
Resultaten per vak:
${rij || '- (geen)'}
Hoe werk ik?
${att || '- (geen)'}
Antwoord met JSON: {"commentaar": "..."}`;
}
const leesCommentaar = data => {
  const c = tekst(data && (data.commentaar || data.tekst), 2000);
  if (!c) throw new Error('Er kwam geen commentaar terug.');
  return { commentaar: c };
};

module.exports = { DIR, lijst, nieuw, laad, bewaar, verwijder, opmaak, bewaarOpmaak, commentaarPrompt, leesCommentaar, SYMBOLEN };
