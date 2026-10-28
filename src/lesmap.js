// Mijn lesmap: quizzen, oefenbladen en Ronde Tafel-sessies gelijk houden met een map in OneDrive of Google Drive.
// Thuis maak je ze in je eigen LANcelot, het digibord haalt ze bij opstart (en daarna elke minuut) binnen, en omgekeerd.
// Alleen wat de leerkracht maakt gaat mee. Klaslijst, logboek, resultaten en avatars blijven altijd op deze pc.
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const gegevens = require('./gegevens');
const crypto = require('crypto');
const settings = require('./settings');

// Wat we bij de vorige keer zagen, om te weten wat aan welke kant veranderd of verwijderd is.
const STATE = gegevens.pad('lesmap-sync.json');
const TRASH = '_prullenbak';
const META = '_mappen.json';
const FILE_RE = /^[^_\\/][^\\/]*\.json$/;

let kinds = [];
let busy = null;
let status = { at: 0, pulled: 0, pushed: 0, removed: 0, error: '' };

function init(list) {
  kinds = list;
}

const hash = text => crypto.createHash('sha1').update(text).digest('hex');

async function readSide(dir) {
  const out = {};
  let names = [];
  try { names = await fsp.readdir(dir); } catch { return out; }
  for (const name of names) {
    if (!FILE_RE.test(name)) continue;
    try {
      const text = await fsp.readFile(path.join(dir, name), 'utf8');
      const stat = await fsp.stat(path.join(dir, name));
      out[name] = { text, hash: hash(text), mtime: stat.mtimeMs };
    } catch {}
  }
  return out;
}

async function readMeta(dir) {
  try {
    const text = await fsp.readFile(path.join(dir, META), 'utf8');
    const meta = JSON.parse(text);
    return { text, hash: hash(text), folders: Array.isArray(meta.folders) ? meta.folders.filter(f => typeof f === 'string') : [], place: meta.place && typeof meta.place === 'object' ? meta.place : {} };
  } catch {
    return null;
  }
}

async function write(dir, name, text) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, `${name}.tmp`), text);
  await fsp.rename(path.join(dir, `${name}.tmp`), path.join(dir, name));
}

// Nooit meteen weggooien: wat verwijderd wordt of een botsing verliest, gaat 30 dagen naar _prullenbak in dezelfde map.
const KEEP_DAYS = 30;
async function trash(dir, name) {
  const bin = path.join(dir, TRASH);
  try {
    await fsp.mkdir(bin, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    await fsp.rename(path.join(dir, name), path.join(bin, `${name.slice(0, -5)}-${stamp}.json`));
    for (const old of await fsp.readdir(bin)) {
      const stat = await fsp.stat(path.join(bin, old));
      if (Date.now() - stat.mtimeMs > KEEP_DAYS * 864e5) await fsp.unlink(path.join(bin, old));
    }
  } catch {}
}

function readState(root) {
  try {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    if (s.root === root && s.files && typeof s.files === 'object') return s;
  } catch {}
  // Een nieuwe lesmap: alles samenvoegen, niets verwijderen.
  return { root, files: {} };
}

// Eén soort (bv. quizzen) gelijk zetten. Geeft terug of er hier iets binnenkwam.
async function syncKind(kind, root, state, count) {
  const local = kind.dir;
  const remote = path.join(root, kind.remote);
  const seen = state.files[kind.kind] || {};
  // Is de map in de lesmap weg (nog niet gedownload, verkeerd verplaatst)? Dan niets verwijderen, en volgende keer opnieuw.
  if (Object.keys(seen).length && !(await fsp.stat(remote).catch(() => null))) throw new Error(`De map ${kind.remote} ontbreekt in de lesmap.`);
  const L = await readSide(local);
  const R = await readSide(remote);
  const next = {};
  let changedHere = false;

  for (const name of new Set([...Object.keys(L), ...Object.keys(R), ...Object.keys(seen)])) {
    const l = L[name], r = R[name], s = seen[name];
    if ((l && l.hash) === (r && r.hash)) {
      if (l) next[name] = l.hash;
      continue;
    }
    const lChanged = (l ? l.hash : undefined) !== s;
    const rChanged = (r ? r.hash : undefined) !== s;
    // Van de lesmap naar hier: alleen een geldig bestand komt binnen.
    // keep: bij een botsing gaat de versie die verliest naar de prullenbak.
    const pull = async keep => {
      try { kind.validate(JSON.parse(r.text)); } catch { return; }
      if (l && keep) await trash(local, name);
      await write(local, name, r.text);
      next[name] = r.hash;
      changedHere = true;
      count.pulled++;
    };
    const push = async keep => {
      if (r && keep) await trash(remote, name);
      await write(remote, name, l.text);
      next[name] = l.hash;
      count.pushed++;
    };
    if (lChanged && !rChanged) {
      if (l) await push();
      else { await trash(remote, name); count.removed++; }
    } else if (rChanged && !lChanged) {
      if (r) await pull();
      else { await trash(local, name); changedHere = true; count.removed++; }
    } else if (l && r) {
      // Aan beide kanten aangepast: de nieuwste wint, de andere versie gaat naar de prullenbak.
      if (r.mtime > l.mtime) await pull(true);
      else await push(true);
    } else if (l) await push();
    else if (r) await pull();
  }

  // De mappen in de lijst (_mappen.json): wie veranderde, wint. Allebei: samenvoegen.
  const lm = await readMeta(local);
  const rm = await readMeta(remote);
  const seenMeta = (state.meta || {})[kind.kind];
  let meta = null;
  if (lm && rm && lm.hash !== rm.hash) {
    if (lm.hash === seenMeta) meta = rm;
    else if (rm.hash === seenMeta) meta = lm;
    else meta = { folders: [...new Set([...rm.folders, ...lm.folders])].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true })), place: { ...rm.place, ...lm.place } };
  } else meta = lm || rm;
  if (meta) {
    const place = {};
    // Ook een bestand dat pas tijdens deze ronde binnenkwam (bv. een import) houdt zijn map.
    const exists = file => next[file] || fs.existsSync(path.join(local, file));
    for (const [file, f] of Object.entries(meta.place)) if (FILE_RE.test(file) && exists(file) && meta.folders.includes(f)) place[file] = f;
    const text = JSON.stringify({ folders: meta.folders, place }, null, 2) + '\n';
    if (!lm || lm.text !== text) { await write(local, META, text); changedHere = true; }
    if (!rm || rm.text !== text) await write(remote, META, text);
    state.meta = { ...state.meta, [kind.kind]: hash(text) };
  }
  state.files[kind.kind] = next;
  return changedHere;
}

// Alles synchroniseren. Geeft de soorten terug waar hier iets veranderde, zodat de lijsten bijgewerkt worden.
function sync() {
  if (busy) return busy;
  const root = settings.read().lesmap;
  if (!root) return Promise.resolve([]);
  busy = (async () => {
    const count = { pulled: 0, pushed: 0, removed: 0 };
    const changed = [];
    try {
      const stat = await fsp.stat(root).catch(() => null);
      if (!stat || !stat.isDirectory()) throw new Error('De lesmap is niet gevonden. Staat OneDrive of Google Drive aan?');
      const state = readState(root);
      for (const kind of kinds) if (await syncKind(kind, root, state, count)) changed.push(kind.kind);
      fs.writeFileSync(STATE, JSON.stringify(state) + '\n');
      status = { at: Date.now(), ...count, error: '' };
    } catch (err) {
      status = { ...status, error: err.message };
    }
    return changed;
  })().finally(() => { busy = null; });
  return busy;
}

// Waar OneDrive en Google Drive op deze pc staan, om met één klik te kiezen.
function suggestions() {
  const out = [];
  const add = (label, base) => {
    if (!base || out.some(s => s.path === path.join(base, 'LANcelot'))) return;
    try { if (fs.statSync(base).isDirectory()) out.push({ label, path: path.join(base, 'LANcelot') }); } catch {}
  };
  add('OneDrive van school', process.env.OneDriveCommercial);
  add('OneDrive', process.env.OneDriveConsumer);
  add('OneDrive', process.env.OneDrive);
  for (const letter of 'GHIJKLMNOPQRSTUVWXYZ') for (const sub of ['Mijn Drive', 'My Drive']) add('Google Drive', `${letter}:\\${sub}`);
  add('Google Drive', path.join(os.homedir(), 'Google Drive', 'Mijn Drive'));
  add('Google Drive', path.join(os.homedir(), 'Google Drive', 'My Drive'));
  return out;
}

function choose(folder) {
  const clean = String(folder || '').trim().replace(/^"|"$/g, '');
  if (!clean) {
    settings.write({ lesmap: '' });
    return;
  }
  if (!path.isAbsolute(clean)) throw new Error('Geef het volledige pad van de map, bv. C:\\Users\\jij\\OneDrive\\LANcelot.');
  const resolved = path.resolve(clean);
  // Nooit de mappen van LANcelot zelf als lesmap.
  const binnen = dir => resolved === dir || resolved.startsWith(dir + path.sep);
  if (binnen(gegevens.APP) || binnen(gegevens.DATA)) throw new Error('Kies een map buiten LANcelot, bv. in je OneDrive.');
  fs.mkdirSync(resolved, { recursive: true });
  settings.write({ lesmap: resolved });
  status = { at: 0, pulled: 0, pushed: 0, removed: 0, error: '' };
}

function view() {
  return { lesmap: settings.read().lesmap || '', ...status };
}

module.exports = { init, sync, choose, view, suggestions };
