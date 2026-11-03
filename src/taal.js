// De taal van LANcelot. Nederlands is de taal waarin alles geschreven is. Kiest de leerkracht een andere taal
// (Instellingen > Uiterlijk > Taal), dan krijgt elk scherm via /taal.js het woordenboek uit lang/<taal>/*.json
// en public/js/i18n.js, dat elke tekst op het scherm vertaalt. Leerlingen volgen vanzelf de taal van de server.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const settings = require('./settings');

const LANG = path.join(__dirname, '..', 'lang');
const I18N = path.join(__dirname, '..', 'public', 'js', 'i18n.js');
const TALEN = [
  { id: 'nl', naam: 'Nederlands', vlag: 'BE' },
  { id: 'en', naam: 'English', vlag: 'GB' },
  { id: 'fr', naam: 'Français', vlag: 'FR' },
  { id: 'es', naam: 'Español', vlag: 'ES' },
  { id: 'de', naam: 'Deutsch', vlag: 'DE' },
];
// Scheidingsteken in een CSV voor Excel: Engelstalige landen gebruiken een komma, de rest een puntkomma.
const CSV_SEP = { en: ',' };

function huidig() {
  const t = settings.read().taal;
  return TALEN.some(x => x.id === t) ? t : 'nl';
}
// De AI-prompts zijn in het Nederlands geschreven. In een andere taal zetten we er een korte opdracht voor,
// zodat alles wat de AI maakt (vragen, antwoorden, uitleg, woorden) in die taal komt. De JSON-sleutels blijven.
// Dezelfde tekst staat in public/js/i18n.js voor prompts die de leerkracht kopieert.
const AI_TAAL = {
  en: 'LANGUAGE: The teacher uses LANcelot in English. Write everything you create (titles, questions, answers, explanations, words, meanings, sentences, feedback) in English with British spelling, even where the instructions below ask for Dutch or Belgian Dutch. Keep JSON keys and fixed values (such as page, schildknaap, ridder) exactly as written below.\n\n',
  fr: 'LANGUE : LANcelot est utilisé en français. Write everything you create (titles, questions, answers, explanations, words, meanings, sentences, feedback) in French, even where the instructions below ask for Dutch or Belgian Dutch. Keep JSON keys and fixed values (such as page, schildknaap, ridder) exactly as written below.\n\n',
  es: 'IDIOMA: El docente usa LANcelot en español. Write everything you create (titles, questions, answers, explanations, words, meanings, sentences, feedback) in Spanish (Spain), even where the instructions below ask for Dutch or Belgian Dutch. Keep JSON keys and fixed values (such as page, schildknaap, ridder) exactly as written below.\n\n',
  de: 'SPRACHE: Die Lehrkraft benutzt LANcelot auf Deutsch. Write everything you create (titles, questions, answers, explanations, words, meanings, sentences, feedback) in German (Germany), even where the instructions below ask for Dutch or Belgian Dutch. Keep JSON keys and fixed values (such as page, schildknaap, ridder) exactly as written below.\n\n',
};
function aiPrompt(prompt) {
  const voor = AI_TAAL[huidig()];
  if (!voor || typeof prompt !== 'string' || !prompt.trim() || prompt.startsWith(voor)) return prompt;
  return voor + prompt;
}

// Inhoud met een eigen bestand per taal: runen-woorden.js (Nederlands), runen-woorden-en.js, runen-woorden-fr.js...
function inhoud(basis, id = huidig()) {
  return require(id === 'nl' ? `./${basis}` : `./${basis}-${id}`);
}
function woordenlijstPad(id = huidig()) {
  return path.join(__dirname, id === 'nl' ? 'woordenlijst.txt' : `woordenlijst-${id}.txt`);
}

function zet(id) {
  if (!TALEN.some(x => x.id === id)) throw new Error('Onbekende taal');
  settings.write({ taal: id });
  return id;
}

// Alle woorden van één taal, samengevoegd uit de bestanden in lang/<taal>/. Ontbreekt een tekst in het Frans, Spaans of
// Duits (nieuwe tekst die nog niet vertaald is), dan liever Engels dan Nederlands.
function woorden(id) {
  const uit = id !== 'en' && id !== 'nl' ? woorden('en') : {};
  const dir = path.join(LANG, id);
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort(); } catch { return uit; }
  for (const f of files) {
    try {
      const w = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const [k, v] of Object.entries(w)) {
        if (typeof v === 'string' && v !== k) uit[k] = v;
        else delete uit[k];
      }
    } catch (err) { console.error(`Taalbestand ${id}/${f}: ${err.message}`); }
  }
  return uit;
}

// ---------- Vertalen op de server ----------
// Voor wat niet via een scherm gaat, zoals een CSV-bestand voor Excel. Zelfde regels als public/js/i18n.js:
// eerst de tekst zelf, dan patronen met {0}. Onbekende tekst blijft zoals hij is.
let vertaler = null;
function maakVertaler(id) {
  const exact = new Map();
  const patronen = [];
  const esc = x => x.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  for (const [nl, uit] of Object.entries(woorden(id))) {
    if (!/\{\d+\}/.test(nl)) { exact.set(nl, uit); continue; }
    const volgorde = [];
    const bron = '^' + nl.split(/(\{\d+\})/).map(stuk => {
      const m = /^\{(\d+)\}$/.exec(stuk);
      if (m) { volgorde.push(+m[1]); return '([\\s\\S]+?)'; }
      return esc(stuk);
    }).join('') + '$';
    try { patronen.push({ re: new RegExp(bron), volgorde, uit, lit: nl.replace(/\{\d+\}/g, '').length }); } catch { /* ongeldig */ }
  }
  patronen.sort((a, b) => b.lit - a.lit);
  return s => {
    if (typeof s !== 'string' || s.length < 2 || !/[A-Za-zÀ-ÿ]/.test(s)) return s;
    const kern = s.trim();
    let uit = exact.get(kern);
    if (uit === undefined) {
      for (const p of patronen) {
        const m = p.re.exec(kern);
        if (!m) continue;
        const w = {};
        p.volgorde.forEach((nr, i) => { const v = m[i + 1]; w[nr] = exact.has(v.trim()) ? exact.get(v.trim()) : v; });
        uit = p.uit.replace(/\{(\d+)\}/g, (_, nr) => (w[nr] !== undefined ? w[nr] : ''));
        break;
      }
    }
    return uit === undefined ? s : s.replace(kern, uit);
  };
}
function vertaalFunctie(id) {
  const st = stempel(id);
  if (!vertaler || vertaler.id !== id || vertaler.st !== st) vertaler = { id, st, f: maakVertaler(id) };
  return vertaler.f;
}
function t(s, id = huidig()) {
  return id === 'nl' ? s : vertaalFunctie(id)(s);
}

// Een CSV van LANcelot (puntkomma's, zoals Excel in België) in de gekozen taal: elke cel vertaald. In het Engels
// komma's als scheidingsteken, zoals Excel in Engelstalige landen verwacht. In het Nederlands verandert er niets.
function csv(tekst, id = huidig()) {
  if (id === 'nl' || typeof tekst !== 'string') return tekst;
  const bom = tekst.startsWith('\ufeff') ? '\ufeff' : '';
  const regels = [];
  let rij = [];
  let cel = '';
  let inQuote = false;
  const body = tekst.slice(bom.length);
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuote) {
      if (c === '"' && body[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') inQuote = false; else cel += c;
    } else if (c === '"') inQuote = true;
    else if (c === ';') { rij.push(cel); cel = ''; } else if (c === '\r') { /* overslaan */ } else if (c === '\n') { rij.push(cel); regels.push(rij); rij = []; cel = ''; } else cel += c;
  }
  if (cel || rij.length) { rij.push(cel); regels.push(rij); }
  const f = vertaalFunctie(id);
  const sep = CSV_SEP[id] || ';';
  const zet = v => {
    const x = f(v);
    return x.includes(sep) || /["\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
  };
  return bom + regels.map(r => r.map(zet).join(sep)).join('\r\n') + '\r\n';
}

// Een kleine cache: het script wordt opnieuw gemaakt als een taalbestand of i18n.js verandert.
let cache = null;
function stempel(id) {
  const dir = path.join(LANG, id);
  let s = '';
  for (const d of id === 'nl' || id === 'en' ? [dir] : [path.join(LANG, 'en'), dir]) {
    try { for (const f of fs.readdirSync(d).sort()) s += f + fs.statSync(path.join(d, f)).mtimeMs; } catch { /* geen map */ }
  }
  try { s += fs.statSync(I18N).mtimeMs; } catch { /* geen bestand */ }
  return s;
}
function script(id) {
  if (id === 'nl') return { body: Buffer.from('window.LANCELOT_TAAL="nl";window.I18n={taal:"nl",locale:"nl-BE",t:function(s){return s}};\n'), tag: '"nl-1"' };
  const st = id + stempel(id);
  if (cache && cache.st === st) return cache;
  const js = `window.LANCELOT_TAAL=${JSON.stringify(id)};window.LANCELOT_WOORDEN=${JSON.stringify(woorden(id))};\n${fs.readFileSync(I18N, 'utf8')}`;
  const body = Buffer.from(js);
  cache = { st, body, gz: zlib.gzipSync(body), tag: `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"` };
  return cache;
}

function route(app) {
  app.get('/taal.js', (req, res) => {
    const s = script(huidig());
    res.set({ 'Cache-Control': 'no-cache', ETag: s.tag, Vary: 'Accept-Encoding' }).type('application/javascript');
    if (req.headers['if-none-match'] === s.tag) return res.status(304).end();
    if (s.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) return res.set('Content-Encoding', 'gzip').send(s.gz);
    res.send(s.body);
  });
}

module.exports = { TALEN, CSV_SEP, huidig, zet, woorden, route, aiPrompt, AI_TAAL, t, csv, inhoud, woordenlijstPad };
