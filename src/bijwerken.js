// Bijwerken vanuit de app: de nieuwste versie van GitHub ophalen en bij de volgende start installeren.
// Alleen de bestanden van de app worden vervangen. De gegevens van de klas (zie gegevens.js) blijven altijd staan,
// en wat er werd vervangen, wordt tot de volgende update bewaard in _update/oud.
// Installeren gebeurt nooit terwijl LANcelot draait: zo gaat er nooit een lopend spel verloren.
// De bron is GitHub, zolang de repository publiek is. Een eigen update-adres (Instellingen, of update-bron.json naast de app)
// wijst naar een klein json-bestand { versie, datum, bericht, zip } ergens online. En een zip van LANcelot kan altijd ook
// als bestand: dat werkt zonder internet en los van GitHub.
const fs = require('fs');
const path = require('path');
const zip = require('./zip');
const gegevens = require('./gegevens');
const settings = require('./settings');

const REPO = 'Jornduthoo/lancelot';
const TAK = 'main';
const APP = gegevens.APP;
const DIR = path.join(APP, '_update');
const KLAAR = path.join(DIR, 'klaar.zip');
const KLAAR_INFO = path.join(DIR, 'klaar.json');
const VERSIE = path.join(APP, 'versie.json');
const BRON = path.join(APP, 'update-bron.json');
// Nooit vervangen: van de leerkracht, of eigen aan deze pc.
const BEHOUD = new Set([...gegevens.ITEMS, 'node_modules', '_update', 'versie.json', 'gegevensmap.json', 'installatie.json', 'update-bron.json', 'node', '.env', '.git']);
// In deze mappen zitten de voorbeelden: die komen er alleen bij als ze er nog niet zijn.
const VOORBEELDEN = new Set(['quizzes', 'oefenbladen', 'rondetafel']);

function leesJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

let status = { bezig: false, fout: '', nieuwste: null, gecontroleerd: 0 };

// Een eigen update-adres, anders GitHub.
function eigenBron() {
  const url = settings.read().updateBron || (leesJson(BRON) || {}).manifest || '';
  return /^https?:\/\//i.test(url) ? url : '';
}

function kiesBron(url) {
  const clean = String(url || '').trim();
  if (clean && !/^https?:\/\/\S+$/i.test(clean)) throw new Error('Een update-adres begint met https://');
  settings.write({ updateBron: clean });
  status = { ...status, nieuwste: null, fout: '' };
  return view();
}

function view() {
  return { ...status, bron: eigenBron(), github: !eigenBron(), huidig: leesJson(VERSIE), klaar: fs.existsSync(KLAAR) ? leesJson(KLAAR_INFO) : null, melding: laatsteMelding || (process.env.LANCELOT_BIJGEWERKT ? 'LANcelot is bijgewerkt naar de nieuwste versie.' : '') };
}

async function haal(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'LANcelot', Accept: 'application/vnd.github+json' } });
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub krijgt even te veel vragen. Probeer het over een uur opnieuw.');
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    throw new Error(eigenBron()
      ? `Het update-adres antwoordt niet (fout ${res.status}). Kijk het adres na, of werk bij met een zip-bestand.`
      : 'GitHub geeft de nieuwste versie niet vrij (staat de repository op privé?). Werk bij met een zip-bestand, of vul een eigen update-adres in.');
  }
  if (!res.ok) throw new Error(`GitHub antwoordde met fout ${res.status}. Probeer later opnieuw.`);
  return res;
}

// Welke versie staat er nu op GitHub?
async function zoek() {
  status = { ...status, bezig: true, fout: '' };
  try {
    const bron = eigenBron();
    if (bron) {
      const m = await (await haal(bron)).json();
      if (!m || !/^https?:\/\//i.test(m.zip || '') || !m.versie) throw new Error('Op het update-adres staat geen geldige versie (versie en zip ontbreken).');
      status.nieuwste = { sha: String(m.versie).slice(0, 80), datum: m.datum || '', bericht: String(m.bericht || '').slice(0, 120), zip: m.zip };
    } else {
      const c = await (await haal(`https://api.github.com/repos/${REPO}/commits/${TAK}`)).json();
      status.nieuwste = { sha: c.sha, datum: c.commit && c.commit.committer && c.commit.committer.date, bericht: String((c.commit && c.commit.message) || '').split('\n')[0].slice(0, 120) };
    }
    status.gecontroleerd = Date.now();
  } catch (err) {
    status.fout = /fetch failed|ENOTFOUND|ECONN/i.test(err.message) ? 'Geen internet: bijwerken lukt alleen met internet.' : err.message;
  } finally {
    status.bezig = false;
  }
  return view();
}

// De nieuwste versie downloaden en klaarzetten. Installeren gebeurt bij de volgende start.
async function download() {
  if (!status.nieuwste) await zoek();
  if (!status.nieuwste) return view();
  const { sha, datum, bericht } = status.nieuwste;
  status = { ...status, bezig: true, fout: '' };
  try {
    const url = status.nieuwste.zip || `https://codeload.github.com/${REPO}/zip/${sha}`;
    const buf = Buffer.from(await (await haal(url)).arrayBuffer());
    zetKlaar(buf, { sha, datum, bericht });
  } catch (err) {
    status.fout = /fetch failed|ENOTFOUND|ECONN/i.test(err.message) ? 'Geen internet: bijwerken lukt alleen met internet.' : err.message;
  } finally {
    status.bezig = false;
  }
  return view();
}

// Waar in de zip de app staat: bij GitHub in een map (lancelot-abc123/), bij de schoolzip in LANcelot/, soms meteen bovenaan.
function wortel(files) {
  const kandidaten = files.map(f => f.name).filter(n => /(^|\/)server\.js$/.test(n)).sort((a, b) => a.split('/').length - b.split('/').length);
  if (!kandidaten.length) return null;
  const prefix = kandidaten[0].slice(0, -'server.js'.length);
  const pkg = files.find(f => f.name === `${prefix}package.json`);
  try {
    if (pkg && JSON.parse(pkg.data.toString('utf8')).name === 'lancelot') return prefix;
  } catch {}
  return null;
}

function zetKlaar(buf, info) {
  let files;
  try { files = zip.read(buf); } catch { throw new Error('Dat bestand is geen geldige zip.'); }
  if (wortel(files) === null) throw new Error('Dit is geen volledige versie van LANcelot (server.js of package.json ontbreekt).');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(KLAAR + '.tmp', buf);
  fs.renameSync(KLAAR + '.tmp', KLAAR);
  fs.writeFileSync(KLAAR_INFO, JSON.stringify({ ...info, gedownload: new Date().toISOString() }, null, 2) + '\n');
}

// Bijwerken met een zip van LANcelot (bv. de schoolzip op een usb-stick): zonder internet en zonder GitHub.
function uitBestand(buf, naam) {
  if (status.bezig) throw new Error('Er loopt al een update. Wacht even.');
  zetKlaar(Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []), { sha: '', datum: new Date().toISOString(), bericht: `uit ${String(naam || 'een zip-bestand').replace(/[^\w .()-]/g, '').slice(0, 80)}`, bestand: true });
  return view();
}

function annuleer() {
  for (const f of [KLAAR, KLAAR_INFO]) {
    try { fs.unlinkSync(f); } catch {}
  }
  return view();
}

let laatsteMelding = '';

// Bij het opstarten, nog voor de server: een klaargezette update installeren.
// Geeft { npm } terug als er geïnstalleerd werd (npm: de onderdelen moeten opnieuw geïnstalleerd worden), anders null.
function pasToe() {
  if (!fs.existsSync(KLAAR)) return null;
  const info = leesJson(KLAAR_INFO) || {};
  const nieuw = path.join(DIR, 'nieuw');
  const oud = path.join(DIR, 'oud');
  const gedaan = [];
  try {
    const files = zip.read(fs.readFileSync(KLAAR));
    const prefix = wortel(files);
    if (prefix === null) throw new Error('de update is onvolledig.');
    fs.rmSync(nieuw, { recursive: true, force: true });
    fs.rmSync(oud, { recursive: true, force: true });
    const tops = new Set();
    for (const f of files) {
      if (!f.name.startsWith(prefix)) continue;
      const rel = f.name.slice(prefix.length).split('/');
      if (!rel.length || !rel[rel.length - 1]) continue;
      const top = rel[0];
      // De installatie van Node (in de schoolzip) hoort niet in de app.
      if (rel.length === 1 && /\.(msi|exe)$/i.test(top)) continue;
      if (VOORBEELDEN.has(top) && rel.length === 2 && gegevens.DATA === APP) {
        // Een nieuw voorbeeld erbij, nooit een eigen quiz overschrijven.
        const target = path.join(APP, ...rel);
        if (!fs.existsSync(target)) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, f.data);
        }
        continue;
      }
      if (BEHOUD.has(top)) continue;
      tops.add(top);
      const target = path.join(nieuw, ...rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.data);
    }
    if (!fs.existsSync(path.join(nieuw, 'server.js'))) throw new Error('server.js ontbreekt in de update.');
    const lockVoor = (() => { try { return fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'); } catch { return ''; } })();
    fs.mkdirSync(oud, { recursive: true });
    for (const top of tops) {
      const src = path.join(nieuw, top);
      const dst = path.join(APP, top);
      // Een .bat die cmd nog aan het lezen is, vervangen we alleen als hij echt veranderde.
      if (top.endsWith('.bat') && fs.existsSync(dst) && fs.readFileSync(dst).equals(fs.readFileSync(src))) continue;
      const had = fs.existsSync(dst);
      if (had) fs.renameSync(dst, path.join(oud, top));
      fs.renameSync(src, dst);
      gedaan.push({ top, had });
    }
    fs.writeFileSync(VERSIE, JSON.stringify({ sha: info.sha || '', datum: info.datum || '', bericht: info.bericht || '', geinstalleerd: new Date().toISOString() }, null, 2) + '\n');
    const lockNa = (() => { try { return fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'); } catch { return ''; } })();
    laatsteMelding = 'LANcelot is bijgewerkt.';
    return { npm: lockVoor !== lockNa };
  } catch (err) {
    // Alles terugzetten zoals het was.
    for (const { top, had } of gedaan.reverse()) {
      try {
        fs.rmSync(path.join(APP, top), { recursive: true, force: true });
        if (had) fs.renameSync(path.join(oud, top), path.join(APP, top));
      } catch {}
    }
    laatsteMelding = `Bijwerken lukte niet: ${err.message}. LANcelot draait verder met de vorige versie.`;
    console.error(`  ${laatsteMelding}`);
    return null;
  } finally {
    fs.rmSync(nieuw, { recursive: true, force: true });
    for (const f of [KLAAR, KLAAR_INFO]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

module.exports = { view, zoek, download, annuleer, pasToe, uitBestand, kiesBron };
