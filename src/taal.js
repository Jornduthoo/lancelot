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
];

function huidig() {
  const t = settings.read().taal;
  return TALEN.some(x => x.id === t) ? t : 'nl';
}
function zet(id) {
  if (!TALEN.some(x => x.id === id)) throw new Error('Onbekende taal');
  settings.write({ taal: id });
  return id;
}

// Alle woorden van één taal, samengevoegd uit de bestanden in lang/<taal>/.
function woorden(id) {
  const dir = path.join(LANG, id);
  const uit = {};
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort(); } catch { return uit; }
  for (const f of files) {
    try {
      const w = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const [k, v] of Object.entries(w)) if (typeof v === 'string' && v !== k) uit[k] = v;
    } catch (err) { console.error(`Taalbestand ${id}/${f}: ${err.message}`); }
  }
  return uit;
}

// Een kleine cache: het script wordt opnieuw gemaakt als een taalbestand of i18n.js verandert.
let cache = null;
function stempel(id) {
  const dir = path.join(LANG, id);
  let s = '';
  try { for (const f of fs.readdirSync(dir).sort()) s += f + fs.statSync(path.join(dir, f)).mtimeMs; } catch { /* geen map */ }
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

module.exports = { TALEN, huidig, zet, woorden, route };
