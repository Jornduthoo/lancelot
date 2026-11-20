// Mijn lesmap: quizzen, oefenbladen en Ronde Tafel-sessies gelijk houden met een map in OneDrive of Google Drive.
// Thuis maak je ze in je eigen LANcelot, het digibord haalt ze bij opstart (en daarna elke minuut) binnen, en omgekeerd.
// Alleen wat de leerkracht maakt gaat mee, plus de namen en niveaus van de klaslijst (om thuis taken per kind klaar te zetten).
// Logboek, notities en avatars blijven altijd op deze pc. De resultaten van toetsen (afnames) gaan wel mee: zie proeven.afnameSamen. (Een pdf-kopie van verbeterde toetsen per leerling
// komt er alleen als de leerkracht dat aanzet: zie src/toetskopie.js.)
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
let voortgang = () => {};
// Wanneer een ander toestel voor het laatst een _mappen.json zonder tijden schreef (een oude LANcelot): dan zeggen we het.
let oudToestel = 0;
const OUD_DAGEN = 7;

// opties.voortgang: wordt opgeroepen tijdens het kopiëren van grote bestanden (de bordboeken), om dat te tonen.
function init(list, opties = {}) {
  kinds = list;
  if (typeof opties.voortgang === 'function') voortgang = opties.voortgang;
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
    const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    return { ...meta, oud: !('tijd' in meta), text, hash: hash(text), folders: Array.isArray(meta.folders) ? meta.folders.filter(f => typeof f === 'string') : [], place: obj(meta.place), tijd: obj(meta.tijd), mapTijd: obj(meta.mapTijd), weg: obj(meta.weg) };
  } catch {
    return null;
  }
}

// Twee verschillende _mappen.json samenvoegen. Met tijden (sinds 2026-11): per bestand en per map wint de laatste wijziging.
// Zonder tijd (een oude _mappen.json): wie sinds de vorige ronde veranderde, wint; allebei veranderd: hier wint.
function mergeMeta(lm, rm, seen) {
  const lNieuw = lm.hash !== seen, rNieuw = rm.hash !== seen;
  const voorkeur = !lNieuw && rNieuw ? rm : lm;
  const tijdVan = (m, veld, k) => Number(m[veld][k]) || 0;
  const max = veld => {
    const out = { ...lm[veld] };
    for (const [k, t] of Object.entries(rm[veld])) if (!(Number(out[k]) >= Number(t))) out[k] = t;
    return out;
  };
  // Mappen: wat aan beide kanten staat, blijft. Staat ze maar aan één kant: bijgemaakt na het verwijderen aan de andere kant?
  const lF = new Set(lm.folders), rF = new Set(rm.folders);
  const folders = [...new Set([...lm.folders, ...rm.folders])].filter(f => {
    if (lF.has(f) && rF.has(f)) return true;
    const [hier, daar] = lF.has(f) ? [lm, rm] : [rm, lm];
    const bij = tijdVan(hier, 'mapTijd', f), weg = tijdVan(daar, 'weg', f);
    if (bij || weg) return bij > weg;
    return lNieuw && rNieuw ? true : voorkeur === hier;
  }).sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
  // Bestanden: de kant met de laatste verplaatsing wint.
  const place = {};
  for (const file of new Set([...Object.keys(lm.place), ...Object.keys(rm.place)])) {
    const l = lm.place[file], r = rm.place[file];
    let f;
    if (l === r) f = l;
    else {
      const tl = tijdVan(lm, 'tijd', file), tr = tijdVan(rm, 'tijd', file);
      f = tl || tr ? (tr > tl ? r : l) : voorkeur.place[file];
    }
    if (typeof f === 'string' && f) place[file] = f;
  }
  const extra = {};
  if (Array.isArray(lm.gezien) || Array.isArray(rm.gezien)) extra.gezien = [...new Set([...(lm.gezien || []), ...(rm.gezien || [])])].filter(f => typeof f === 'string');
  return { ...rm, ...lm, ...extra, folders, place, tijd: max('tijd'), mapTijd: max('mapTijd'), weg: max('weg') };
}

function schrijfNu(dir, name, text) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.tmp`), text);
  fs.renameSync(path.join(dir, `${name}.tmp`), path.join(dir, name));
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
// Meerdere klassen: wat van de klas is (perKlas), gaat mee voor de klas die nu gekozen is.
// De eerste klas staat in de lesmap waar ze altijd stond; een andere klas in klassen/<id>/.
function plek(kind) {
  const id = gegevens.actieveKlas();
  const eerste = !kind.perKlas || id === gegevens.EERSTE;
  return {
    local: typeof kind.dir === 'function' ? kind.dir() : kind.dir,
    remote: eerste ? kind.remote : path.join('klassen', id, kind.remote),
    key: eerste ? kind.kind : `${kind.kind}@${id}`,
  };
}

async function syncKind(kind, root, state, count) {
  const p = plek(kind);
  const local = p.local;
  const remote = path.join(root, p.remote);
  kind = { ...kind, kind: p.key, remote: p.remote };
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
      // Kan samenvoegen (bv. de afnames van toetsen): wat hier intussen bijkwam (een leerling leverde net in), nooit
      // overschrijven. Opnieuw lezen en meteen schrijven, zonder te wachten: dan kan er niets tussen komen.
      if (kind.merge) {
        let nu = null;
        try { nu = fs.readFileSync(path.join(local, name), 'utf8'); } catch {}
        let text = r.text;
        if (nu !== null && nu !== (l ? l.text : null)) {
          try { text = kind.merge(nu, r.text); kind.validate(JSON.parse(text)); } catch { next[name] = s; return; }
        }
        schrijfNu(local, name, text);
        if (text !== r.text) { await write(remote, name, text); count.pushed++; }
        next[name] = hash(text);
        changedHere = true;
        count.pulled++;
        return;
      }
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
    } else if (l && r && kind.merge) {
      // Aan beide kanten aangepast en de soort kan samenvoegen (de klaslijst): niemand verliest iets.
      let text;
      let nu = l.text;
      try { nu = fs.readFileSync(path.join(local, name), 'utf8'); } catch {}
      try { text = kind.merge(nu, r.text); kind.validate(JSON.parse(text)); } catch { next[name] = s; continue; }
      if (text !== nu) { schrijfNu(local, name, text); changedHere = true; count.pulled++; }
      if (text !== r.text) { await write(remote, name, text); count.pushed++; }
      next[name] = hash(text);
    } else if (l && r) {
      // Aan beide kanten aangepast: de nieuwste wint, de andere versie gaat naar de prullenbak.
      if (r.mtime > l.mtime) await pull(true);
      else await push(true);
    } else if (l) await push();
    else if (r) await pull();
  }

  // De mappen in de lijst (_mappen.json): per bestand en per map samenvoegen, de laatste wijziging wint (ook "zonder map").
  const lm = await readMeta(local);
  const rm = await readMeta(remote);
  const seenMeta = (state.meta || {})[kind.kind];
  // Kwam er een _mappen.json zonder tijden binnen, terwijl wij er de vorige keer een met tijden schreven? Dan schreef
  // een ander toestel met een oude LANcelot hem. Samenvoegen gaat goed, maar zeg het: dat toestel moet bijgewerkt worden.
  if (rm && rm.oud && seenMeta && rm.hash !== seenMeta) oudToestel = Date.now();
  const meta = lm && rm && lm.hash !== rm.hash ? mergeMeta(lm, rm, seenMeta) : lm || rm;
  if (meta) {
    const place = {};
    // Ook een bestand dat pas tijdens deze ronde binnenkwam (bv. een import) houdt zijn map, en ook een bestand dat
    // hier (nog) niet binnenkon (bv. gemaakt met een nieuwere versie van LANcelot): anders springt het op de andere pc terug.
    const exists = file => next[file] || fs.existsSync(path.join(local, file)) || fs.existsSync(path.join(remote, file));
    for (const [file, f] of Object.entries(meta.place)) if (FILE_RE.test(file) && exists(file) && meta.folders.includes(f)) place[file] = f;
    const { text: _t, hash: _h, oud: _o, ...rest } = meta;
    const text = JSON.stringify({ ...rest, folders: meta.folders, place }, null, 2) + '\n';
    if (!lm || lm.text !== text) { await write(local, META, text); changedHere = true; }
    if (!rm || rm.text !== text) await write(remote, META, text);
    state.meta = { ...state.meta, [kind.kind]: hash(text) };
  }
  state.files[kind.kind] = next;
  return changedHere;
}

// ---------- Grote bestanden (de pdf's en afbeeldingen van Mijn methodes) ----------
// Anders dan de json-bestanden hierboven: in submappen (vak/blok), binair en groot. Daarom vergelijken we op grootte en
// tijdstip (per kant onthouden), en lezen we de inhoud alleen als twee bestanden even groot zijn maar anders lijken.
// Nooit iets kwijt: wat vervangen of verwijderd wordt, gaat naar een prullenbak (op deze pc die van de soort zelf,
// in de lesmap _prullenbak voor 30 dagen). Een bestand uit de lesmap komt pas binnen als het een ronde lang niet meer
// veranderde: zo halen we nooit een bordboek binnen dat OneDrive of Google Drive nog aan het downloaden is.
const MAX_DIEPTE = 6;
const TMP = '.lancelot-kopie';

async function bestandInfo(file) {
  try {
    const st = await fsp.stat(file);
    if (st.isFile() && st.size > 0) return { size: st.size, mtime: st.mtimeMs, fp: `${st.size}:${Math.floor(st.mtimeMs / 1000)}` };
  } catch {}
  return null;
}

async function lijstBestanden(dir, toegelaten) {
  const out = {};
  const loop = async (abs, rel, diepte) => {
    let items;
    try { items = await fsp.readdir(abs, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      if (it.name.startsWith('_') || it.name.startsWith('.')) continue;
      const r = rel ? `${rel}/${it.name}` : it.name;
      if (it.isDirectory()) {
        if (diepte < MAX_DIEPTE) await loop(path.join(abs, it.name), r, diepte + 1);
      } else if (toegelaten(r)) {
        const info = await bestandInfo(path.join(abs, it.name));
        if (info) out[r] = info;
      }
    }
  };
  await loop(dir, '', 0);
  return out;
}

const absPad = (dir, rel) => path.join(dir, ...rel.split('/'));

async function inhoudHash(file) {
  const h = crypto.createHash('sha1');
  for await (const stuk of fs.createReadStream(file)) h.update(stuk);
  return h.digest('hex');
}

// Kopiëren naar een tijdelijke naam (die niemand oppikt), het tijdstip van het origineel meegeven en dan pas op zijn plek.
async function kopieer(van, naar) {
  await fsp.mkdir(path.dirname(naar), { recursive: true });
  const tmp = path.join(path.dirname(naar), `${TMP}-${process.pid}-${path.basename(naar)}`);
  try {
    await fsp.copyFile(van, tmp);
    const st = await fsp.stat(van);
    await fsp.utimes(tmp, st.atime, st.mtime);
    await fsp.rename(tmp, naar);
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    throw err;
  }
}

async function naarLesmapBak(remote, rel) {
  const bin = path.join(remote, TRASH);
  await fsp.mkdir(bin, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const ext = path.extname(rel);
  await fsp.rename(absPad(remote, rel), path.join(bin, `${rel.slice(0, -ext.length).split('/').join(' - ')}-${stamp}${ext}`));
  try {
    for (const old of await fsp.readdir(bin)) {
      const stat = await fsp.stat(path.join(bin, old));
      if (Date.now() - stat.mtimeMs > KEEP_DAYS * 864e5) await fsp.unlink(path.join(bin, old));
    }
  } catch {}
}

async function syncBestanden(kind, root, state, count, fouten) {
  const local = typeof kind.dir === 'function' ? kind.dir() : kind.dir;
  const remote = path.join(root, kind.remote);
  const seen = state.files[kind.kind] || {};
  const wacht = (state.wacht || {})[kind.kind] || {};
  if (Object.keys(seen).length && !(await fsp.stat(remote).catch(() => null))) throw new Error(`De map ${kind.remote} ontbreekt in de lesmap.`);
  await fsp.mkdir(remote, { recursive: true });
  const L = await lijstBestanden(local, kind.toegelaten);
  const R = await lijstBestanden(remote, kind.toegelaten);
  const next = {};
  const nieuwWacht = {};
  const taken = [];

  for (const rel of new Set([...Object.keys(L), ...Object.keys(R), ...Object.keys(seen)])) {
    const l = L[rel], r = R[rel], s = seen[rel];
    // Uit de lesmap enkel wat een ronde stil lag (niet meer aan het downloaden).
    const rKlaar = r && wacht[rel] === r.fp;
    if (r) nieuwWacht[rel] = r.fp;
    if (l && r) {
      if (s && s.l === l.fp && s.r === r.fp) { next[rel] = s; continue; }
      if (l.size === r.size) {
        let zelfde = false;
        try { zelfde = (await inhoudHash(absPad(local, rel))) === (await inhoudHash(absPad(remote, rel))); } catch {}
        if (zelfde) { next[rel] = { l: l.fp, r: r.fp }; continue; }
      }
      const lAnders = !s || s.l !== l.fp, rAnders = !s || s.r !== r.fp;
      const binnen = rAnders && (!lAnders || r.mtime > l.mtime);
      if (binnen && !rKlaar) { if (s) next[rel] = s; continue; }
      taken.push({ rel, doe: binnen ? 'binnen' : 'weg', oud: s, vervang: true });
    } else if (l) {
      if (s && s.r && s.l === l.fp) taken.push({ rel, doe: 'wis-hier', oud: s });
      else taken.push({ rel, doe: 'weg' });
    } else if (r) {
      if (s && s.l && s.r === r.fp) taken.push({ rel, doe: 'wis-daar', oud: s });
      else if (rKlaar) taken.push({ rel, doe: 'binnen' });
    }
  }

  // Ontbreken plots veel bestanden aan één kant zonder dat iemand ze verwijderde (OneDrive nog niet klaar, een lege
  // map), dan verwijderen we niets. Wie in LANcelot verwijdert, zet het boek in de prullenbak: dat telt niet mee.
  let bakDaar = [];
  try { bakDaar = await fsp.readdir(path.join(remote, TRASH)); } catch {}
  const inBakDaar = rel => { const ext = path.extname(rel); const stam = rel.slice(0, -ext.length).split('/').join(' - '); return bakDaar.some(n => n.startsWith(`${stam}-`) && n.endsWith(ext)); };
  const wisHier = taken.filter(t => t.doe === 'wis-hier' && !inBakDaar(t.rel)).length;
  const wisDaar = taken.filter(t => t.doe === 'wis-daar' && !(kind.inPrullenbak && kind.inPrullenbak(t.rel))).length;
  const bekend = Object.keys(seen).length;
  const teVeel = n => n > 3 && n > bekend / 2;
  if (teVeel(wisHier) || teVeel(wisDaar)) {
    fouten.push('Veel bordboeken lijken weg aan één kant. Er werd niets verwijderd: kijk of OneDrive of Google Drive alles heeft binnengehaald.');
    for (const t of taken) if (t.doe === 'wis-hier' || t.doe === 'wis-daar') { t.doe = 'niets'; next[t.rel] = t.oud; }
  }

  const kopie = taken.filter(t => t.doe === 'binnen' || t.doe === 'weg');
  const totaal = kopie.length;
  let klaar = 0;
  let changedHere = false;
  const toon = (naam) => { status = { ...status, boeken: { klaar, totaal, naam } }; voortgang(); };
  for (const t of taken) {
    const { rel } = t;
    try {
      if (t.doe === 'binnen') {
        toon(rel);
        if (t.vervang) await kind.weg(rel, true);
        await kopieer(absPad(remote, rel), absPad(local, rel));
        next[rel] = { l: (await bestandInfo(absPad(local, rel))).fp, r: R[rel].fp };
        changedHere = true;
        count.pulled++;
        klaar++;
      } else if (t.doe === 'weg') {
        toon(rel);
        if (t.vervang) await naarLesmapBak(remote, rel);
        await kopieer(absPad(local, rel), absPad(remote, rel));
        next[rel] = { l: L[rel].fp, r: (await bestandInfo(absPad(remote, rel))).fp };
        count.pushed++;
        klaar++;
      } else if (t.doe === 'wis-hier') {
        await kind.weg(rel, false);
        changedHere = true;
        count.removed++;
      } else if (t.doe === 'wis-daar') {
        await naarLesmapBak(remote, rel);
        count.removed++;
      }
    } catch (err) {
      // Lukt één bestand niet (vol, in gebruik), dan de rest wel en dit de volgende keer opnieuw.
      if (t.oud) next[rel] = t.oud;
      fouten.push(`"${path.basename(rel)}" kopiëren lukte niet (${err.code || err.message}).`);
    }
  }
  if (totaal) toon('');
  state.files[kind.kind] = next;
  state.wacht = { ...state.wacht, [kind.kind]: nieuwWacht };
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
      const fouten = [];
      for (const kind of kinds) {
        if (kind.bestanden) {
          // De bordboeken: groot, dus apart, en uit te zetten. Uit: de vorige stand vergeten, zodat er na het weer
          // aanzetten eerst alleen samengevoegd wordt en niets verdwijnt.
          if (!boekenAan()) { delete state.files[kind.kind]; delete (state.wacht || {})[kind.kind]; continue; }
          if (await syncBestanden(kind, root, state, count, fouten)) changed.push(kind.kind);
          fs.writeFileSync(STATE, JSON.stringify(state) + '\n');
        } else if (await syncKind(kind, root, state, count)) changed.push(kind.kind);
      }
      fs.writeFileSync(STATE, JSON.stringify(state) + '\n');
      status = { at: Date.now(), ...count, error: fouten.join(' ') };
    } catch (err) {
      status = { ...status, error: err.message };
    }
    delete status.boeken;
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
  const oud = oudToestel && Date.now() - oudToestel < OUD_DAGEN * 864e5 ? { oudToestel } : {};
  return { lesmap: settings.read().lesmap || '', boekenAan: boekenAan(), ...status, ...oud };
}

const boekenAan = () => settings.read().lesmapBoeken !== false;
function zetBoeken(aan) {
  settings.write({ lesmapBoeken: !!aan });
}

module.exports = { init, sync, choose, view, suggestions, zetBoeken };
