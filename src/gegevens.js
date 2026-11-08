// Waar LANcelot de gegevens van de klas bewaart: klaslijst, logboek, quizzen, resultaten, posters, instellingen...
// Standaard naast de app, zoals altijd. Wie de gegevens apart zet (Instellingen > Mijn gegevens, of later de installer),
// kan de app vervangen of herinstalleren zonder ooit iets van de klas kwijt te raken.
// Volgorde: de omgevingsvariabele LANCELOT_DATA, dan gegevensmap.json naast de app, dan installatie.json
// (die de installer zal meeleveren: dan de standaardmap), anders de map van de app zelf.
// Een verhuis of het terugzetten van een back-up gebeurt bij het opstarten, voordat iets anders de bestanden leest.
const fs = require('fs');
const os = require('os');
const path = require('path');
const zip = require('./zip');

const APP = path.resolve(__dirname, '..');
// Alles wat van de leerkracht en de klas is. De rest (public, src, doelen...) hoort bij de app.
const ITEMS = ['klas', 'klassen', 'logboek', 'runen', 'ontdek', 'burchten', 'taken', 'rijken', 'resultaten', 'posters', 'quizzes', 'oefenbladen', 'rondetafel', 'proeven', 'kronieken', 'kronieken-links', 'zonnewijzer', 'zegelrol', 'postduif', 'avatars.json', 'settings.json', 'lesmap-sync.json', 'doelen-eigen.json'];
// Bordboeken en handleidingen zijn te groot voor de dagelijkse back-up-zip. Ze verhuizen wel mee en een update laat ze staan.
const NIET_IN_BACKUP = new Set(['kronieken']);
const POINTER = path.join(APP, 'gegevensmap.json');
const MARKER = '.lancelot-gegevens.json';
const RESTORE = 'terugzetten.zip';
const BACKUPS = 'back-ups';
const KEEP = 10;

function standaardMap() {
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'LANcelot');
  return path.join(os.homedir(), '.lancelot');
}

function gekozen() {
  // Een vaste map (een test, of "Test Store-versie.bat"): een lege start met enkel de voorbeelden, nooit de klas van de app-map.
  if (process.env.LANCELOT_DATA) return { map: path.resolve(process.env.LANCELOT_DATA), van: APP, leeg: true };
  try {
    const p = JSON.parse(fs.readFileSync(POINTER, 'utf8'));
    if (p.map && path.isAbsolute(p.map)) return { map: path.resolve(p.map), van: p.van && path.isAbsolute(p.van) ? path.resolve(p.van) : APP };
  } catch {}
  if (fs.existsSync(path.join(APP, 'installatie.json'))) return { map: standaardMap(), van: APP };
  return { map: APP, van: APP };
}

// Kopieert de gegevens naar de nieuwe map. Nooit iets overschrijven en nooit iets wissen: de oude map blijft zoals ze was.
const VOORBEELDEN = ['quizzes', 'oefenbladen', 'rondetafel'];
function verhuis(van, naar, leeg = false) {
  fs.mkdirSync(naar, { recursive: true });
  let n = 0;
  if (path.resolve(van) !== path.resolve(naar)) {
    // Ook de back-ups en een back-up die nog teruggezet moet worden, verhuizen mee.
    // De Store-versie in een andere taal dan Nederlands: de voorbeelden in die taal (voorbeelden/<taal>/), niet de Vlaamse.
    const store = require('./store');
    const taal = store.ACTIEF && van === APP ? store.taalVanSysteem() : 'nl';
    const anders = taal !== 'nl' && fs.existsSync(path.join(APP, 'voorbeelden', taal));
    for (const item of leeg ? VOORBEELDEN : [...ITEMS, BACKUPS, RESTORE]) {
      const src = anders && VOORBEELDEN.includes(item) ? path.join(APP, 'voorbeelden', taal, item) : path.join(van, item);
      if (!fs.existsSync(src)) continue;
      fs.cpSync(src, path.join(naar, item), { recursive: true, force: false, errorOnExist: false });
      n++;
    }
    if (!leeg) try { fs.unlinkSync(path.join(van, RESTORE)); } catch {}
  }
  fs.writeFileSync(path.join(naar, MARKER), JSON.stringify({ van, op: new Date().toISOString() }, null, 2) + '\n');
  if (n && van === APP && !leeg) {
    try {
      fs.writeFileSync(path.join(APP, 'GEGEVENS-STAAN-NU-ELDERS.txt'), `Je klaslijst, logboek, quizzen en andere gegevens staan sinds ${new Date().toLocaleDateString('nl-BE')} in:\r\n${naar}\r\n\r\nDe mappen hier naast de app zijn een oude kopie. LANcelot gebruikt ze niet meer.\r\n`);
    } catch {}
  }
  return n;
}

let DATA = APP;
let melding = '';
{
  const { map, van, leeg } = gekozen();
  if (map === APP) DATA = APP;
  else if (fs.existsSync(path.join(map, MARKER))) DATA = map;
  else {
    try {
      const n = verhuis(van, map, leeg);
      DATA = map;
      melding = n && !leeg ? `Je gegevens zijn verhuisd naar ${map}.` : '';
      console.log(`  Gegevensmap: ${map}${n ? ' (gegevens gekopieerd)' : ''}`);
    } catch (err) {
      // Liever verder in de oude map dan half verhuisd.
      DATA = fs.existsSync(van) ? van : APP;
      melding = `Verhuizen naar ${map} lukte niet: ${err.message}. LANcelot werkt verder met ${DATA}.`;
      console.error(`  ${melding}`);
    }
  }
}

// De vaste plek in de gegevensmap, zonder rekening te houden met de gekozen klas (back-ups, verhuizen).
function vast(...parts) {
  return path.join(DATA, ...parts);
}

// --- Back-ups ---

function stempel(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Een zip met alle gegevens van de klas. De AI-sleutels gaan nooit mee in een back-up.
function maakBackup() {
  const entries = [{ name: 'lancelot-backup.json', data: Buffer.from(JSON.stringify({ gemaakt: new Date().toISOString(), map: DATA }, null, 2)) }];
  for (const item of ITEMS) {
    if (NIET_IN_BACKUP.has(item)) continue;
    const full = vast(item);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    const files = st.isDirectory() ? zip.listFiles(full).map(f => `${item}/${f}`) : [item];
    for (const name of files) {
      const file = vast(...name.split('/'));
      let data;
      try { data = fs.readFileSync(file); } catch { continue; }
      if (name === 'settings.json') {
        try {
          const s = JSON.parse(data);
          for (const k of ['geminiKey', 'claudeKey', 'openaiKey']) delete s[k];
          data = Buffer.from(JSON.stringify(s, null, 2) + '\n');
        } catch {}
      }
      entries.push({ name, data, mtime: fs.statSync(file).mtime });
    }
  }
  return zip.write(entries);
}

function backupDir() {
  return vast(BACKUPS);
}

function lijst() {
  try {
    return fs.readdirSync(backupDir()).filter(f => f.endsWith('.zip')).sort().reverse()
      .map(f => ({ file: f, size: fs.statSync(path.join(backupDir(), f)).size }));
  } catch {
    return [];
  }
}

// Bewaart een back-up in de map back-ups en houdt er hooguit tien van dezelfde soort.
function bewaar(soort = 'auto') {
  fs.mkdirSync(backupDir(), { recursive: true });
  const file = `${soort}_${stempel()}.zip`;
  fs.writeFileSync(path.join(backupDir(), file), maakBackup());
  const oud = lijst().filter(b => b.file.startsWith(`${soort}_`)).slice(KEEP);
  for (const b of oud) {
    try { fs.unlinkSync(path.join(backupDir(), b.file)); } catch {}
  }
  return file;
}

// Elke dag bij het opstarten één automatische back-up.
function dagelijks() {
  const vandaag = stempel().slice(0, 10);
  if (lijst().some(b => b.file.startsWith(`auto_${vandaag}`))) return;
  try { bewaar('auto'); } catch (err) { console.error('Back-up maken lukte niet:', err.message); }
}

function controleer(buf) {
  const files = zip.read(buf);
  if (!files.some(f => f.name === 'lancelot-backup.json')) throw new Error('Dit is geen back-up van LANcelot.');
  return files;
}

// Een back-up klaarzetten: hij wordt pas teruggezet bij de volgende start, zodat een lopend spel niets merkt.
function zetKlaar(buf) {
  const files = controleer(buf);
  fs.writeFileSync(vast(RESTORE), buf);
  return { bestanden: files.length - 1 };
}

function annuleerTerugzetten() {
  try { fs.unlinkSync(vast(RESTORE)); } catch {}
}

function terugzettenKlaar() {
  return fs.existsSync(vast(RESTORE));
}

// Bij het opstarten: eerst een back-up van hoe het nu is, dan per onderdeel de versie uit de back-up.
function zetTerug() {
  if (!terugzettenKlaar()) return;
  try {
    const files = controleer(fs.readFileSync(vast(RESTORE)));
    bewaar('voor-terugzetten');
    const SLEUTELS = ['geminiKey', 'claudeKey', 'openaiKey'];
    const sleutels = (() => {
      try {
        const s = JSON.parse(fs.readFileSync(vast('settings.json'), 'utf8'));
        return Object.fromEntries(SLEUTELS.filter(k => s[k]).map(k => [k, s[k]]));
      } catch { return {}; }
    })();
    const items = new Set(files.map(f => f.name.split('/')[0]).filter(i => ITEMS.includes(i)));
    for (const item of items) fs.rmSync(vast(item), { recursive: true, force: true });
    for (const f of files) {
      if (!items.has(f.name.split('/')[0])) continue;
      const target = vast(...f.name.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.data);
    }
    if (Object.keys(sleutels).length) {
      const s = (() => { try { return JSON.parse(fs.readFileSync(vast('settings.json'), 'utf8')); } catch { return {}; } })();
      fs.writeFileSync(vast('settings.json'), JSON.stringify({ ...s, ...sleutels }, null, 2) + '\n');
    }
    melding = 'De back-up is teruggezet. Een kopie van hoe het ervoor was, staat bij je back-ups.';
    console.log(`  ${melding}`);
  } catch (err) {
    melding = `De back-up terugzetten lukte niet: ${err.message}. Er is niets veranderd.`;
    console.error(`  ${melding}`);
  }
  annuleerTerugzetten();
}

// --- Verhuizen vanuit Instellingen ---

// De nieuwe map wordt onthouden; de verhuis zelf gebeurt bij de volgende start.
function kiesMap(map) {
  if (require('./store').ACTIEF) throw new Error('In de versie uit de Microsoft Store blijven je gegevens in de vaste map.');
  if (process.env.LANCELOT_DATA) throw new Error('De gegevensmap is vastgezet met LANCELOT_DATA.');
  const clean = String(map || '').trim().replace(/^"|"$/g, '');
  if (!clean) {
    try { fs.unlinkSync(POINTER); } catch {}
    return;
  }
  if (!path.isAbsolute(clean)) throw new Error('Geef het volledige pad van de map, bv. C:\\Users\\jij\\AppData\\Local\\LANcelot.');
  const naar = path.resolve(clean);
  if (naar === DATA) {
    try { fs.unlinkSync(POINTER); } catch {}
    if (DATA !== APP) fs.writeFileSync(POINTER, JSON.stringify({ map: DATA, van: DATA }, null, 2) + '\n');
    return;
  }
  if (naar === APP || naar.startsWith(APP + path.sep)) throw new Error('Kies een map buiten de map van de app, anders kan ze verloren gaan bij een update.');
  fs.writeFileSync(POINTER, JSON.stringify({ map: naar, van: DATA }, null, 2) + '\n');
}

function view() {
  const { map } = gekozen();
  return {
    map: DATA,
    app: APP,
    apart: DATA !== APP,
    volgende: map !== DATA ? map : '',
    standaard: standaardMap(),
    vast: !!process.env.LANCELOT_DATA || require('./store').ACTIEF,
    melding,
    terugzetten: terugzettenKlaar(),
    backups: lijst().slice(0, 12),
  };
}

zetTerug();

// --- Meerdere klassen op één toestel ---
// Elke klas heeft haar eigen klaslijst, logboek, taken, burchten, huisdieren, stickers, zorg en rapporten.
// De eerste klas staat waar alles altijd stond (klas/, logboek/ ...): bij het bijwerken verhuist er dus niets.
// Elke extra klas staat in klassen/<id>/ met dezelfde mappen. Wat de leerkracht maakt (quizzen, oefenbladen,
// toetsen, de Zonnewijzer, bordboeken, instellingen) blijft gedeeld door alle klassen.
// klassen/klassen.json: { actief: '1', ids: ['1', 'k7f3a2c9'] }. De naam van een klas staat in haar eigen klaslijst.
const PER_KLAS = new Set(['klas', 'logboek', 'taken', 'burchten', 'runen', 'ontdek', 'rijken', 'resultaten', 'zegelrol', 'postduif']);
const EERSTE = '1';
const KLASSEN_FILE = () => vast('klassen', 'klassen.json');
const ID_RE = /^[a-z0-9]{1,12}$/;
const MAX_KLASSEN = 12;
let klassen = { actief: EERSTE, ids: [EERSTE] };

function leesKlassen() {
  try {
    const d = JSON.parse(fs.readFileSync(KLASSEN_FILE(), 'utf8'));
    const ids = [EERSTE, ...(Array.isArray(d.ids) ? d.ids : []).filter(id => typeof id === 'string' && ID_RE.test(id) && id !== EERSTE)];
    const uniek = [...new Set(ids)];
    klassen = { actief: uniek.includes(d.actief) ? d.actief : EERSTE, ids: uniek };
  } catch {
    klassen = { actief: EERSTE, ids: [EERSTE] };
  }
}
leesKlassen();

function bewaarKlassen() {
  fs.mkdirSync(vast('klassen'), { recursive: true });
  const tmp = KLASSEN_FILE() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(klassen, null, 2) + '\n');
  fs.renameSync(tmp, KLASSEN_FILE());
}

const perKlas = parts => parts.length > 0 && (PER_KLAS.has(parts[0]) || (parts[0] === 'proeven' && parts[1] === '_afnames'));

// Het pad van iets van een bepaalde klas (zonder id: de klas die nu gekozen is).
function klasPad(id, ...parts) {
  if (!id || id === EERSTE) return vast(...parts);
  return vast('klassen', id, ...parts);
}

// Het pad in de gegevensmap. Voor de mappen van de klas: die van de klas die nu gekozen is.
function pad(...parts) {
  return perKlas(parts) ? klasPad(klassen.actief, ...parts) : vast(...parts);
}

// Modules met gegevens in het geheugen schrijven die eerst weg en vergeten ze, vóór een andere klas gekozen wordt.
const wisselaars = [];
function voorKlasWissel(fn) {
  wisselaars.push(fn);
}

function actieveKlas() {
  return klassen.actief;
}

function klasIds() {
  return klassen.ids.slice();
}

function kiesKlas(id) {
  if (!klassen.ids.includes(id)) throw new Error('Die klas bestaat niet (meer).');
  if (id === klassen.actief) return;
  for (const fn of wisselaars) {
    try { fn(); } catch (err) { console.error('Klas wisselen:', err.message); }
  }
  klassen.actief = id;
  bewaarKlassen();
}

function nieuweKlas(id) {
  if (klassen.ids.length >= MAX_KLASSEN) throw new Error(`Je kan hooguit ${MAX_KLASSEN} klassen hebben.`);
  let nieuw = id && ID_RE.test(id) && !klassen.ids.includes(id) ? id : '';
  while (!nieuw || klassen.ids.includes(nieuw)) nieuw = 'k' + Math.random().toString(36).slice(2, 9);
  fs.mkdirSync(klasPad(nieuw, 'klas'), { recursive: true });
  klassen.ids.push(nieuw);
  bewaarKlassen();
  return nieuw;
}

// Een klas weghalen: niets wordt gewist. De map gaat naar klassen/_weg/, zodat een vergissing te herstellen is.
// De eerste klas kan niet weg (daar staan de gegevens van altijd).
function verwijderKlas(id) {
  if (id === EERSTE) throw new Error('De eerste klas kan je niet weghalen. Geef ze gerust een andere naam.');
  if (!klassen.ids.includes(id)) throw new Error('Die klas bestaat niet (meer).');
  if (id === klassen.actief) kiesKlas(EERSTE);
  const van = klasPad(id);
  if (fs.existsSync(van)) {
    const naar = vast('klassen', '_weg', `${id}-${stempel()}`);
    fs.mkdirSync(path.dirname(naar), { recursive: true });
    fs.renameSync(van, naar);
  }
  klassen.ids = klassen.ids.filter(k => k !== id);
  bewaarKlassen();
}

module.exports = { APP, ITEMS, pad, vast, klasPad, EERSTE, actieveKlas, klasIds, kiesKlas, nieuweKlas, verwijderKlas, voorKlasWissel, perKlas, maakBackup, bewaar, dagelijks, lijst, backupDir, zetKlaar, annuleerTerugzetten, kiesMap, view, stempel, get DATA() { return DATA; } };
