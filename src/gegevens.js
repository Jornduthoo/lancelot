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
const ITEMS = ['klas', 'logboek', 'runen', 'ontdek', 'burchten', 'taken', 'rijken', 'resultaten', 'posters', 'quizzes', 'oefenbladen', 'rondetafel', 'proeven', 'kronieken', 'kronieken-links', 'zonnewijzer', 'zegelrol', 'postduif', 'avatars.json', 'settings.json', 'lesmap-sync.json'];
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
  if (process.env.LANCELOT_DATA) return { map: path.resolve(process.env.LANCELOT_DATA), van: APP };
  try {
    const p = JSON.parse(fs.readFileSync(POINTER, 'utf8'));
    if (p.map && path.isAbsolute(p.map)) return { map: path.resolve(p.map), van: p.van && path.isAbsolute(p.van) ? path.resolve(p.van) : APP };
  } catch {}
  if (fs.existsSync(path.join(APP, 'installatie.json'))) return { map: standaardMap(), van: APP };
  return { map: APP, van: APP };
}

// Kopieert de gegevens naar de nieuwe map. Nooit iets overschrijven en nooit iets wissen: de oude map blijft zoals ze was.
function verhuis(van, naar) {
  fs.mkdirSync(naar, { recursive: true });
  let n = 0;
  if (path.resolve(van) !== path.resolve(naar)) {
    // Ook de back-ups en een back-up die nog teruggezet moet worden, verhuizen mee.
    for (const item of [...ITEMS, BACKUPS, RESTORE]) {
      const src = path.join(van, item);
      if (!fs.existsSync(src)) continue;
      fs.cpSync(src, path.join(naar, item), { recursive: true, force: false, errorOnExist: false });
      n++;
    }
    try { fs.unlinkSync(path.join(van, RESTORE)); } catch {}
  }
  fs.writeFileSync(path.join(naar, MARKER), JSON.stringify({ van, op: new Date().toISOString() }, null, 2) + '\n');
  if (n && van === APP) {
    try {
      fs.writeFileSync(path.join(APP, 'GEGEVENS-STAAN-NU-ELDERS.txt'), `Je klaslijst, logboek, quizzen en andere gegevens staan sinds ${new Date().toLocaleDateString('nl-BE')} in:\r\n${naar}\r\n\r\nDe mappen hier naast de app zijn een oude kopie. LANcelot gebruikt ze niet meer.\r\n`);
    } catch {}
  }
  return n;
}

let DATA = APP;
let melding = '';
{
  const { map, van } = gekozen();
  if (map === APP) DATA = APP;
  else if (fs.existsSync(path.join(map, MARKER))) DATA = map;
  else {
    try {
      const n = verhuis(van, map);
      DATA = map;
      melding = n ? `Je gegevens zijn verhuisd naar ${map}.` : '';
      console.log(`  Gegevensmap: ${map}${n ? ' (gegevens gekopieerd)' : ''}`);
    } catch (err) {
      // Liever verder in de oude map dan half verhuisd.
      DATA = fs.existsSync(van) ? van : APP;
      melding = `Verhuizen naar ${map} lukte niet: ${err.message}. LANcelot werkt verder met ${DATA}.`;
      console.error(`  ${melding}`);
    }
  }
}

function pad(...parts) {
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
    const full = pad(item);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    const files = st.isDirectory() ? zip.listFiles(full).map(f => `${item}/${f}`) : [item];
    for (const name of files) {
      const file = pad(...name.split('/'));
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
  return pad(BACKUPS);
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
  fs.writeFileSync(pad(RESTORE), buf);
  return { bestanden: files.length - 1 };
}

function annuleerTerugzetten() {
  try { fs.unlinkSync(pad(RESTORE)); } catch {}
}

function terugzettenKlaar() {
  return fs.existsSync(pad(RESTORE));
}

// Bij het opstarten: eerst een back-up van hoe het nu is, dan per onderdeel de versie uit de back-up.
function zetTerug() {
  if (!terugzettenKlaar()) return;
  try {
    const files = controleer(fs.readFileSync(pad(RESTORE)));
    bewaar('voor-terugzetten');
    const SLEUTELS = ['geminiKey', 'claudeKey', 'openaiKey'];
    const sleutels = (() => {
      try {
        const s = JSON.parse(fs.readFileSync(pad('settings.json'), 'utf8'));
        return Object.fromEntries(SLEUTELS.filter(k => s[k]).map(k => [k, s[k]]));
      } catch { return {}; }
    })();
    const items = new Set(files.map(f => f.name.split('/')[0]).filter(i => ITEMS.includes(i)));
    for (const item of items) fs.rmSync(pad(item), { recursive: true, force: true });
    for (const f of files) {
      if (!items.has(f.name.split('/')[0])) continue;
      const target = pad(...f.name.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.data);
    }
    if (Object.keys(sleutels).length) {
      const s = (() => { try { return JSON.parse(fs.readFileSync(pad('settings.json'), 'utf8')); } catch { return {}; } })();
      fs.writeFileSync(pad('settings.json'), JSON.stringify({ ...s, ...sleutels }, null, 2) + '\n');
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
    vast: !!process.env.LANCELOT_DATA,
    melding,
    terugzetten: terugzettenKlaar(),
    backups: lijst().slice(0, 12),
  };
}

zetTerug();

module.exports = { APP, ITEMS, pad, maakBackup, bewaar, dagelijks, lijst, backupDir, zetKlaar, annuleerTerugzetten, kiesMap, view, stempel, get DATA() { return DATA; } };
