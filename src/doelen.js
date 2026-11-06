// Leerplandoelen. Welke lijst LANcelot gebruikt, kiest de leerkracht in Mijn klas > Doelen (settings.json: doelenLand):
// - 'be': Op.stap (Vlaanderen), één JSON-bestand per vak en leerjaar in de map doelen/. De standaard, behalve in de Store-versie.
// - 'nl', 'en', 'us', 'fr', 'de': de officiële doelen van dat land, in doelen-landen/<land>/ (zie doelen-landen/BRONNEN.md).
// - 'geen': geen lijst. De standaard in de Store-versie: alles werkt zonder doelen.
// Daarbovenop altijd de eigen doelen van de leerkracht (doelen-eigen.json in de gegevensmap), codes EIGEN.1, EIGEN.2 ...
// Een Op.stap-code ziet er zo uit: 2.1.GL6.4 = wiskunde (2), domein 1, G-doel, 6e leerjaar, doel 4. Plusdoelen: 2.1.+L6.3.
// Codes van andere landen beginnen met het land: NL.10A.3, EN.MA.4.12, US.4.NBT.B.5, FR.CE1.M12, DE.M.1.1.1.
// Een doel geldt voor één leerjaar (leerjaar) of voor meerdere (leerjaren: [3, 4]). leerjaar is altijd het eerste.
// SEL, leren leren en godsdienst hebben "score": false: die doelen zijn voor gesprekken (Ronde Tafel), niet voor punten.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'doelen');
const LANDEN_DIR = path.join(__dirname, '..', 'doelen-landen');
const OPSTAP = /^\d+(-\d+)?\.\d+\.[GPS+A]([LF]\d+|JK|K\d)\.\d+$/;
const ANDER = /^(NL|EN|US|FR|DE|EIGEN)\.[A-Za-z0-9.+-]{1,40}$/;
const geldig = c => OPSTAP.test(c) || ANDER.test(c);
const MAX_EIGEN = 500;

// De lijsten. jaren: de leerjaren die je kan kiezen. naam(n): hoe dat land het leerjaar noemt.
// Kleuterklas en 1e leerjaar van Op.stap zijn voor later (LANcelot Junior): hun bestanden blijven in doelen/, maar worden niet ingelezen.
const LANDEN = {
  be: { naam: 'België (Vlaanderen)', bron: 'Op.stap, leerroutes voor iedereen (Katholiek Onderwijs Vlaanderen), leerplanversie V1.3', jaren: [2, 3, 4, 5, 6], jaar: n => `${n}e leerjaar` },
  nl: { naam: 'Nederland', bron: 'Kerndoelen funderend onderwijs, primair onderwijs (SLO, definitieve conceptversie)', jaren: [1, 2, 3, 4, 5, 6], jaar: n => `groep ${n + 2}` },
  en: { naam: 'England', bron: 'National curriculum in England (Department for Education)', jaren: [1, 2, 3, 4, 5, 6], jaar: n => `Year ${n}` },
  us: { naam: 'United States', bron: 'Common Core State Standards (Math, English Language Arts)', jaren: [1, 2, 3, 4, 5, 6], jaar: n => `Grade ${n}` },
  fr: { naam: 'France', bron: 'Programmes du cycle 2 (CP, CE1, CE2), BO n° 41 du 31 octobre 2024 (ministère de l’Éducation nationale)', jaren: [1, 2, 3], jaar: n => ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e'][n - 1] || `${n}` },
  de: { naam: 'Deutschland', bron: 'Bildungsstandards der KMK für den Primarbereich (2022)', jaren: [1, 2, 3, 4], jaar: n => `Klasse ${n}` },
};
const KEUZES = [...Object.keys(LANDEN), 'geen'];

let settings = null;
let gegevens = null;
const instellingen = () => (settings || (settings = require('./settings'))).read();

// De gekozen lijst. Niets gekozen: Op.stap, behalve in de Store-versie (daar beginnen leerkrachten zonder doelen).
function land() {
  const s = instellingen().doelenLand;
  if (KEUZES.includes(s)) return s;
  return require('./store').ACTIEF ? 'geen' : 'be';
}

// Een lijst inlezen: Op.stap uit doelen/, een land uit doelen-landen/<land>/.
const geladen = new Map();
function lees(id) {
  if (geladen.has(id)) return geladen.get(id);
  const uit = [];
  const dir = id === 'be' ? DIR : path.join(LANDEN_DIR, id);
  const toonbaar = id === 'be' ? new Set(LANDEN.be.jaren.map(String)) : null;
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        for (const d of data.doelen || []) {
          if (!geldig(d.code) || (toonbaar && !toonbaar.has(String(d.leerjaar)))) continue;
          uit.push({ ...d, land: id });
        }
      } catch (err) {
        console.error(`Doelen in ${file} niet ingelezen:`, err.message);
      }
    }
  }
  geladen.set(id, uit);
  return uit;
}

// De eigen doelen van de leerkracht: [{ code: 'EIGEN.1', vak, tekst, leerjaar }].
function eigenBestand() {
  if (!gegevens) gegevens = require('./gegevens');
  return gegevens.pad('doelen-eigen.json');
}
let eigenCache = null;
function eigen() {
  if (eigenCache) return eigenCache;
  try {
    const data = JSON.parse(fs.readFileSync(eigenBestand(), 'utf8'));
    eigenCache = (Array.isArray(data.doelen) ? data.doelen : []).filter(d => d && ANDER.test(d.code) && d.tekst)
      .map(d => ({ code: d.code, vak: String(d.vak || 'Eigen doelen'), domein: String(d.domein || ''), tekst: String(d.tekst), leerjaar: Number(d.leerjaar) || 0, eigen: true }));
  } catch {
    eigenCache = [];
  }
  return eigenCache;
}

let cache = null;
let byCode = null;
function vergeet() {
  cache = null;
  byCode = null;
  eigenCache = null;
}

// De doelen waarmee de leerkracht nu werkt: de gekozen lijst plus de eigen doelen.
function all() {
  if (cache) return cache;
  const l = land();
  cache = [...(l === 'geen' ? [] : lees(l)), ...eigen()];
  return cache;
}

// Opzoeken per code gebeurt voor elk antwoord in het logboek: daarom een Map.
// Ook doelen uit een andere lijst worden gevonden, zodat oude quizzen en het logboek leesbaar blijven na een wissel.
function find(code) {
  if (!byCode) {
    byCode = new Map(all().map(d => [d.code, d]));
  }
  if (byCode.has(code)) return byCode.get(code);
  if (typeof code !== 'string' || !geldig(code)) return null;
  const id = OPSTAP.test(code) ? 'be' : code.split('.')[0].toLowerCase();
  if (!LANDEN[id]) return null;
  const d = lees(id).find(x => x.code === code) || null;
  byCode.set(code, d);
  return d;
}

// Een doelcode uit een quiz of oefenblad: geldig, of leeg.
function clean(code) {
  const c = typeof code === 'string' ? code.trim() : '';
  return geldig(c) ? c : '';
}

// De leerjaren die de gekozen lijst kent, met de naam die dat land gebruikt.
// Zonder lijst (of met alleen eigen doelen): 1e tot 6e leerjaar.
function leerjaren() {
  const l = land();
  const info = LANDEN[l];
  if (!info) return [1, 2, 3, 4, 5, 6].map(n => ({ id: n, naam: `${n}e leerjaar` }));
  return info.jaren.map(n => ({ id: n, naam: info.jaar(n) }));
}
const LEERJAREN = [2, 3, 4, 5, 6].map(n => ({ id: n, naam: `${n}e leerjaar` }));

// Een leerjaar uit een formulier of een oud bestand ('6', 6 of 'K2'), of het 6e leerjaar als het niet bestaat.
function leerjaar(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : 6;
}

// Hoort een doel bij dit leerjaar? Doelen van Nederland en eigen doelen zonder leerjaar gelden voor elk leerjaar.
function inJaar(d, lj) {
  if (!d) return false;
  const jaren = Array.isArray(d.leerjaren) && d.leerjaren.length ? d.leerjaren : [d.leerjaar];
  return jaren.some(j => !Number(j) || String(j) === String(lj));
}

// Telt een doel mee voor scores (doelenkaart, overzicht)? Doelen voor de Ronde Tafel niet.
function scoort(code) {
  const d = find(code);
  return !d || d.score !== false;
}

// Het vak van een doelcode ('Wiskunde'), of ''.
function vak(code) {
  const d = code && find(code);
  return d ? d.vak : '';
}

// Het vak dat het vaakst voorkomt bij deze doelcodes: zo weet een quiz of oefenblad bij welk vak hij hoort.
function hoofdvak(codes) {
  const tel = new Map();
  for (const c of codes) {
    const v = vak(c);
    if (v) tel.set(v, (tel.get(v) || 0) + 1);
  }
  return [...tel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

// Welke lijst en welke eigen doelen: voor Mijn klas > Doelen.
function keuze() {
  const l = land();
  return {
    land: l,
    landen: Object.entries(LANDEN).map(([id, x]) => ({ id, naam: x.naam, bron: x.bron, aantal: lees(id).length })),
    bron: LANDEN[l] ? LANDEN[l].bron : '',
    eigen: eigen(),
  };
}

function kiesLand(id) {
  if (!KEUZES.includes(id)) throw new Error('Kies een land uit de lijst.');
  if (!settings) settings = require('./settings');
  settings.write({ doelenLand: id });
  vergeet();
  return keuze();
}

// Eigen doelen uit een geplakte lijst: één doel per regel. "Vak: doel" zet het vak; "Vak | 3 | doel" ook het leerjaar.
// Bestaande eigen doelen met dezelfde tekst houden hun code, zodat quizzen en het logboek blijven kloppen.
function zetEigen(tekst) {
  const oud = new Map(eigen().map(d => [`${d.vak}|${d.tekst}`.toLowerCase(), d.code]));
  let volgend = eigen().reduce((m, d) => Math.max(m, Number(d.code.split('.')[1]) || 0), 0) + 1;
  const doelen = [];
  const gezien = new Set();
  for (const regel of String(tekst || '').split(/\r?\n/)) {
    let r = regel.trim().replace(/^[-*•]\s*/, '');
    if (!r) continue;
    let vakNaam = 'Eigen doelen';
    let lj = 0;
    const delen = r.split('|').map(x => x.trim());
    if (delen.length >= 3 && /^\d$/.test(delen[1])) {
      [vakNaam, lj, r] = [delen[0] || vakNaam, Number(delen[1]), delen.slice(2).join(' | ')];
    } else if (delen.length === 2) {
      [vakNaam, r] = [delen[0] || vakNaam, delen[1]];
    } else {
      const m = r.match(/^([^:]{2,30}):\s+(.+)$/);
      if (m) [vakNaam, r] = [m[1].trim(), m[2].trim()];
    }
    r = r.slice(0, 400);
    vakNaam = vakNaam.slice(0, 40);
    const sleutel = `${vakNaam}|${r}`.toLowerCase();
    if (!r || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    doelen.push({ code: oud.get(sleutel) || `EIGEN.${volgend++}`, vak: vakNaam, tekst: r, leerjaar: lj >= 1 && lj <= 6 ? lj : 0 });
    if (doelen.length >= MAX_EIGEN) break;
  }
  fs.writeFileSync(eigenBestand(), JSON.stringify({ doelen }, null, 2) + '\n');
  vergeet();
  return keuze();
}

// De eigen doelen als tekst, om te bewerken: "Vak | leerjaar | doel" of "Vak: doel".
function eigenTekst() {
  return eigen().map(d => (d.leerjaar ? `${d.vak} | ${d.leerjaar} | ${d.tekst}` : `${d.vak}: ${d.tekst}`)).join('\n');
}

// De prompt om eigen doelen te laten voorstellen door een AI-chatbot.
function aiPrompt({ land: l = '', leerjaar: lj = '', vak: v = '' } = {}) {
  return `Je bent een ervaren leerkracht in het basisonderwijs. Ik geef les in ${lj || 'de lagere school'}${l ? ` in ${l}` : ''}.
Geef de officiële leerplandoelen${v ? ` voor ${v}` : ' voor de belangrijkste vakken (taal, wiskunde/rekenen, wereldoriëntatie)'} die bij dat leerjaar horen, zoals ze in het leerplan of curriculum van mijn land of school staan.
Schrijf elk doel op één regel, zonder nummering, in dit formaat:
Vak | ${/^\d$/.test(String(lj)) ? lj : 'leerjaar (1-6)'} | doel
Bijvoorbeeld: Wiskunde | 4 | De leerling kan breuken met dezelfde noemer optellen.
Geef alleen de regels, geen uitleg ervoor of erna. Maximaal 150 doelen. Schrijf in de taal van mijn land.`;
}

module.exports = { all, find, clean, leerjaar, leerjaren, inJaar, scoort, vak, hoofdvak, keuze, kiesLand, zetEigen, eigenTekst, aiPrompt, land, LANDEN, LEERJAREN };
