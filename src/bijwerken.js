// Bijwerken vanuit de app: de nieuwste versie van GitHub ophalen en bij de volgende start installeren.
// Alleen de bestanden van de app worden vervangen. De gegevens van de klas (zie gegevens.js) blijven altijd staan,
// en wat er werd vervangen, wordt tot de volgende update bewaard in _update/oud.
// Vanzelf bijwerken (startAuto): LANcelot kijkt zelf af en toe of er een nieuwe versie is, downloadt ze en installeert ze
// pas op een rustig moment (geen leerlingen, geen spel, een tijd niemand aan het bord; zie rustig() in server.js).
// Dan stopt de server even en start meteen opnieuw: de open schermen laden zichzelf opnieuw. Nooit midden in een les.
// De bron is GitHub, zolang de repository publiek is. Een eigen update-adres (Instellingen, of update-bron.json naast de app)
// wijst naar een klein json-bestand { versie, datum, bericht, zip } ergens online. En een zip van LANcelot kan altijd ook
// als bestand: dat werkt zonder internet en los van GitHub.
const fs = require('fs');
const path = require('path');
const zip = require('./zip');
const gegevens = require('./gegevens');
const settings = require('./settings');
const store = require('./store');

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

// De versie uit de Microsoft Store wordt door de Store bijgewerkt (de map van de app is daar ook alleen-lezen).
const VIA_STORE = 'Deze versie komt uit de Microsoft Store en wordt daar vanzelf bijgewerkt.';
function nietInStore() {
  if (store.ACTIEF) throw new Error(VIA_STORE);
}

function kiesBron(url) {
  nietInStore();
  const clean = String(url || '').trim();
  if (clean && !/^https?:\/\/\S+$/i.test(clean)) throw new Error('Een update-adres begint met https://');
  settings.write({ updateBron: clean });
  status = { ...status, nieuwste: null, fout: '' };
  return view();
}

// Vanzelf bijwerken staat aan, behalve in de Store-versie, als de leerkracht het uitzette, of in een map met git
// (daar werkt iemand aan de code zelf; LANCELOT_AUTO_BIJWERKEN=1 zet het daar toch aan, om te testen).
function autoAan() {
  if (store.ACTIEF || settings.read().autoBijwerken === false) return false;
  return process.env.LANCELOT_AUTO_BIJWERKEN === '1' || !fs.existsSync(path.join(APP, '.git'));
}
function zetAuto(aan) {
  nietInStore();
  settings.write({ autoBijwerken: !!aan });
  return view();
}

function view() {
  if (store.ACTIEF) return { store: true, melding: VIA_STORE };
  return { ...status, auto: autoAan(), bron: eigenBron(), github: !eigenBron(), huidig: leesJson(VERSIE), klaar: fs.existsSync(KLAAR) ? leesJson(KLAAR_INFO) : null, melding: laatsteMelding || (process.env.LANCELOT_BIJGEWERKT ? 'LANcelot is bijgewerkt naar de nieuwste versie.' : '') };
}

// Nooit eindeloos wachten: een hangende verbinding (proxy, slechte wifi) geeft na een tijd een duidelijke fout.
// Een fout 500-599 of een verbinding die wegvalt, is bij GitHub (of een schoolnetwerk ertussen) bijna altijd even:
// dan nog twee keer proberen, na 5 en 20 seconden, voor we een fout tonen.
async function haal(url, ms = 20000, pogingen = 3) {
  for (let i = 1; ; i++) {
    try {
      return await haalEen(url, ms);
    } catch (err) {
      if (i >= pogingen || !err.opnieuw) throw err;
      await new Promise(r => setTimeout(r, (i === 1 ? 5000 : 20000) / (SNEL > 1 ? 1000 : 1)));
    }
  }
}
async function haalEen(url, ms) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'LANcelot', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(ms) });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') throw Object.assign(new Error('Geen verbinding met de update-server.'), { opnieuw: true, soort: 'stil' });
    throw Object.assign(err, { opnieuw: true });
  }
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub krijgt even te veel vragen. Probeer het over een uur opnieuw.');
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    throw new Error(eigenBron()
      ? `Het update-adres antwoordt niet (fout ${res.status}). Kijk het adres na, of werk bij met een zip-bestand.`
      : 'GitHub geeft de nieuwste versie niet vrij (staat de repository op privé?). Werk bij met een zip-bestand, of vul een eigen update-adres in.');
  }
  if (!res.ok) throw Object.assign(new Error(`De update-server antwoordde met fout ${res.status}.`), { opnieuw: res.status >= 500, status: res.status });
  return res;
}

// De fout voor de leerkracht. Een fout die vanzelf overgaat (geen internet, server even weg): zeggen dat LANcelot het zelf
// opnieuw probeert, als vanzelf bijwerken aanstaat.
function foutTekst(err) {
  const auto = autoAan();
  if (/fetch failed|ENOTFOUND|ECONN|EAI_AGAIN/i.test(err.message) || err.soort === 'stil') {
    return auto ? 'Geen verbinding met de update-server. LANcelot probeert het vanzelf opnieuw.' : 'Geen verbinding met de update-server. Probeer het later opnieuw, of werk bij met een zip-bestand.';
  }
  if (err.status >= 500) {
    return auto ? `De update-server antwoordde even niet (fout ${err.status}). LANcelot probeert het vanzelf opnieuw.` : `De update-server antwoordde even niet (fout ${err.status}). Probeer het later opnieuw.`;
  }
  return err.message;
}

// Welke versie staat er nu op GitHub?
async function zoek() {
  nietInStore();
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
      await zelfdeApp();
    }
    status.gecontroleerd = Date.now();
  } catch (err) {
    status.fout = foutTekst(err);
  } finally {
    status.bezig = false;
  }
  return view();
}

// Veranderde er op GitHub alleen iets buiten de app (de website, de tests, de installer)? Dan is er niets te installeren:
// we noteren gewoon de nieuwe versie. Zo start LANcelot niet opnieuw voor iets wat de leerkracht nooit ziet.
const BUITEN_APP = /^(website|test|installer|\.github)\/|^wrangler\.jsonc$/;
async function zelfdeApp() {
  const huidig = leesJson(VERSIE);
  const nieuw = status.nieuwste;
  if (!huidig || !/^[0-9a-f]{40}$/.test(huidig.sha || '') || !nieuw || huidig.sha === nieuw.sha) return;
  try {
    const v = await (await haal(`https://api.github.com/repos/${REPO}/compare/${huidig.sha}...${nieuw.sha}`)).json();
    const files = Array.isArray(v.files) ? v.files : [];
    // Alleen als GitHub zegt dat de nieuwe versie gewoon verder bouwt op de onze, en de lijst volledig is.
    if (v.status !== 'ahead' || !files.length || files.length >= 300) return;
    if (!files.every(f => BUITEN_APP.test(f.filename || '') && (!f.previous_filename || BUITEN_APP.test(f.previous_filename)))) return;
    fs.writeFileSync(VERSIE, JSON.stringify({ ...huidig, sha: nieuw.sha, datum: nieuw.datum || huidig.datum, bericht: nieuw.bericht || huidig.bericht }, null, 2) + '\n');
  } catch { /* dan gewoon de volledige update */ }
}

// De nieuwste versie downloaden en klaarzetten. Installeren gebeurt bij de volgende start.
async function download() {
  nietInStore();
  if (!status.nieuwste) await zoek();
  if (!status.nieuwste) return view();
  const { sha, datum, bericht } = status.nieuwste;
  status = { ...status, bezig: true, fout: '' };
  try {
    const url = status.nieuwste.zip || `https://codeload.github.com/${REPO}/zip/${sha}`;
    const buf = Buffer.from(await (await haal(url, 5 * 60000)).arrayBuffer());
    zetKlaar(buf, { sha, datum, bericht });
  } catch (err) {
    status.fout = foutTekst(err);
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
  nietInStore();
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

// De nieuwe bestanden over de oude kopiëren, alleen wat echt anders is.
function kopieerOver(src, dst) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const naam of fs.readdirSync(src)) kopieerOver(path.join(src, naam), path.join(dst, naam));
    return;
  }
  try {
    const a = fs.statSync(src);
    const b = fs.statSync(dst);
    if (a.size === b.size && fs.readFileSync(src).equals(fs.readFileSync(dst))) return;
  } catch { /* nog niet aanwezig */ }
  fs.copyFileSync(src, dst);
}

let laatsteMelding = '';
// Foutcodes van Windows als een bestand of map nog open is bij een ander programma.
const VAST = new Set(['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY']);

// Bij het opstarten, nog voor de server: een klaargezette update installeren.
// Geeft { npm } terug als er geïnstalleerd werd (npm: de onderdelen moeten opnieuw geïnstalleerd worden), anders null.
function pasToe() {
  if (store.ACTIEF) return null;
  if (!fs.existsSync(KLAAR)) return null;
  const info = leesJson(KLAAR_INFO) || {};
  const nieuw = path.join(DIR, 'nieuw');
  const oud = path.join(DIR, 'oud');
  const gedaan = [];
  let bewaar = false;
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
      try {
        if (had) fs.renameSync(dst, path.join(oud, top));
        fs.renameSync(src, dst);
        gedaan.push({ top, had });
      } catch (err) {
        // Windows: een map waarin iets open is (de LANcelot-knop, de Verkenner, een virusscanner) kan niet verplaatst
        // worden, met allerlei foutcodes (EPERM, EBUSY, zelfs EPIPE). Dan kopiëren we de bestanden erover, één voor één.
        // Een bestand dat al hetzelfde is, slaan we over: zo hindert een open bestand dat niet veranderde nooit.
        if (had && !fs.existsSync(path.join(oud, top))) fs.cpSync(dst, path.join(oud, top), { recursive: true });
        kopieerOver(src, dst);
        gedaan.push({ top, had, kopie: true });
      }
    }
    fs.writeFileSync(VERSIE, JSON.stringify({ sha: info.sha || '', datum: info.datum || '', bericht: info.bericht || '', geinstalleerd: new Date().toISOString() }, null, 2) + '\n');
    const lockNa = (() => { try { return fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'); } catch { return ''; } })();
    laatsteMelding = 'LANcelot is bijgewerkt.';
    return { npm: lockVoor !== lockNa };
  } catch (err) {
    // Alles terugzetten zoals het was.
    for (const { top, had, kopie } of gedaan.reverse()) {
      try {
        if (kopie) { if (had) kopieerOver(path.join(oud, top), path.join(APP, top)); continue; }
        fs.rmSync(path.join(APP, top), { recursive: true, force: true });
        if (had) fs.renameSync(path.join(oud, top), path.join(APP, top));
      } catch {}
    }
    // Zat er alleen iets vast (een ander venster), dan blijft de update klaarstaan voor de volgende start.
    bewaar = VAST.has(err.code) || /being used by another process|EPIPE/i.test(`${err.code} ${err.message}`);
    laatsteMelding = bewaar
      ? 'Bijwerken lukte nog niet: een bestand van LANcelot was nog open bij een ander programma. De update blijft klaarstaan en wordt opnieuw geprobeerd de volgende keer dat LANcelot start.'
      : `Bijwerken lukte niet: ${err.message}. LANcelot draait verder met de vorige versie.`;
    console.error(`  ${laatsteMelding}`);
    return null;
  } finally {
    try { fs.rmSync(nieuw, { recursive: true, force: true }); } catch {}
    if (!bewaar) for (const f of [KLAAR, KLAAR_INFO]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

// Vanzelf bijwerken terwijl LANcelot draait. rustig(): mag het nu (geen les bezig)? herstart(): stopt de server, installeert
// de klaargezette update en start LANcelot opnieuw (server.js). Is er geen internet, dan proberen we het later gewoon opnieuw.
// LANCELOT_AUTO_SNEL=1 (alleen om te testen): een minuut wordt een seconde.
const SNEL = process.env.LANCELOT_AUTO_SNEL === '1' ? 60 : 1;
const AUTO = SNEL > 1 ? { eerste: 1500, zoekElke: 5000, kijkElke: 500 } : { eerste: 60 * 1000, zoekElke: 30 * 60 * 1000, kijkElke: 30 * 1000 };
let autoTimers = [];
function startAuto({ rustig, herstart, opties = {} }) {
  stopAuto();
  const t = { ...AUTO, ...opties };
  // Lukte installeren bij deze start niet (bv. een map die vastzat), dan niet nog eens vanzelf: anders start LANcelot steeds opnieuw.
  if (/^Bijwerken lukte/.test(laatsteMelding)) return;
  let bezig = false;
  const zoekEnHaal = async () => {
    if (bezig || status.bezig || !autoAan() || fs.existsSync(KLAAR)) return;
    bezig = true;
    try {
      await zoek();
      const n = status.nieuwste;
      const huidig = leesJson(VERSIE) || {};
      if (!status.fout && n && n.sha && n.sha !== huidig.sha) await download();
    } catch { /* volgende keer opnieuw */ } finally { bezig = false; }
  };
  let gestart = false;
  const kijk = () => {
    if (gestart || bezig || status.bezig || !autoAan() || !fs.existsSync(KLAAR)) return;
    let ok = false;
    try { ok = rustig(); } catch { ok = false; }
    if (!ok) return;
    gestart = true;
    stopAuto();
    herstart();
  };
  // Mislukte het (geen internet, server even weg), dan over 5 minuten nog eens, niet pas over een half uur.
  const metHerkans = async () => {
    await zoekEnHaal();
    if (status.fout && autoAan() && !fs.existsSync(KLAAR)) {
      const x = setTimeout(zoekEnHaal, t.herkans || 5 * 60 * 1000 / SNEL);
      x.unref?.();
      autoTimers.push(x);
    }
  };
  autoTimers = [setTimeout(metHerkans, t.eerste), setInterval(metHerkans, t.zoekElke), setInterval(kijk, t.kijkElke)];
  for (const x of autoTimers) x.unref?.();
}
function stopAuto() {
  for (const x of autoTimers) { clearTimeout(x); clearInterval(x); }
  autoTimers = [];
}

// Na een automatische update geen nieuw venster openen: de schermen die openstonden, laden zichzelf opnieuw.
const STIL = path.join(DIR, 'stil');
function zetStil() {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(STIL, String(Date.now())); } catch {}
}
function wasStil() {
  try {
    const t = Number(fs.readFileSync(STIL, 'utf8'));
    fs.unlinkSync(STIL);
    return Date.now() - t < 10 * 60 * 1000;
  } catch { return false; }
}

module.exports = { SNEL, view, zoek, download, annuleer, pasToe, uitBestand, kiesBron, zetAuto, autoAan, startAuto, stopAuto, zetStil, wasStil };
