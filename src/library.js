// Mappen en uitwisselen, samen voor quizzen, oefenbladen, Ronde Tafel-sessies en toetsen.
// Mappen (ook mappen in mappen) bestaan alleen in _mappen.json in de eigen map: de bestanden zelf blijven op hun plaats.
// Exporteren geeft één JSON-bestand met een of meer items (en hun map), dat je op een andere pc weer importeert.
const fs = require('fs');
const path = require('path');

const KINDS = {
  quiz: { one: 'quiz', many: 'quizzen', waar: 'Maken > Mijn quizzen' },
  oefenblad: { one: 'oefenblad', many: 'oefenbladen', waar: 'Maken > Mijn oefenbladen' },
  sessie: { one: 'sessie', many: 'sessies', waar: 'De Ronde Tafel' },
  proef: { one: 'toets', many: 'toetsen', waar: 'Maken > Mijn toetsen' },
  resultaat: { one: 'resultaat', many: 'resultaten', waar: 'Resultaten' },
};
const MAX_IMPORT = 2000;
const MAX_DEPTH = 6;

function slug(text, fallback) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || fallback;
}

// Wat veranderde tegenover de vorige stand, krijgt een tijd: een bestand dat verplaatst werd (ook naar "zonder map"),
// een map die bijkwam (mapTijd) of wegging (weg). Oude tijden (half jaar) vallen weg, zodat het bestand klein blijft.
const BEWAAR = 183 * 864e5;
function stempel(oud, meta, now) {
  const tijd = { ...(oud.tijd || {}), ...(meta.tijd || {}) };
  const mapTijd = { ...(oud.mapTijd || {}), ...(meta.mapTijd || {}) };
  const weg = { ...(oud.weg || {}), ...(meta.weg || {}) };
  for (const file of new Set([...Object.keys(oud.place || {}), ...Object.keys(meta.place || {})])) {
    if ((oud.place || {})[file] !== meta.place[file]) tijd[file] = now;
  }
  const was = new Set(oud.folders || []), is = new Set(meta.folders);
  for (const f of is) if (!was.has(f)) { mapTijd[f] = now; delete weg[f]; }
  for (const f of was) if (!is.has(f)) { weg[f] = now; delete mapTijd[f]; }
  const vers = (obj, houd) => Object.fromEntries(Object.entries(obj).filter(([k, t]) => Number.isFinite(t) && (houd(k) || now - t < BEWAAR)));
  meta.tijd = vers(tijd, f => f in meta.place);
  meta.mapTijd = vers(mapTijd, f => is.has(f));
  meta.weg = vers(weg, () => false);
}

// Het bestand zelf: geldig maken wat er staat (een kapot veld wordt leeg, de rest blijft).
function metaUit(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('Geen mappenlijst.');
  const out = { ...meta, folders: Array.isArray(meta.folders) ? meta.folders.filter(f => typeof f === 'string') : [], place: meta.place && typeof meta.place === 'object' && !Array.isArray(meta.place) ? meta.place : {} };
  if (Array.isArray(meta.gezien)) out.gezien = meta.gezien.filter(f => typeof f === 'string');
  else delete out.gezien;
  return out;
}

// Per _mappen.json: de laatste inhoud die we goed lazen of zelf schreven.
const laatsteGoed = new Map();
const wacht = new Int32Array(new SharedArrayBuffer(4));
const slaap = ms => { try { Atomics.wait(wacht, 0, 0, ms); } catch {} };

// Eerst naar een tijdelijk bestand, dan in één keer vervangen: nooit een half geschreven _mappen.json.
function schrijfVeilig(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  for (let poging = 0; ; poging++) {
    try { fs.renameSync(tmp, file); return; } catch (err) {
      if (poging >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      slaap(60);
    }
  }
}

// Elke dag een kopie van _mappen.json (zoals hij stond voor de eerste wijziging van die dag), in _mappen-kopie/.
// Die map gaat nooit naar Mijn lesmap. We houden de kopieën van de laatste 60 dagen.
const KOPIE = '_mappen-kopie';
const KOPIE_RE = /^_mappen-(\d{4}-\d{2}-\d{2})\.json$/;
const BEWAAR_KOPIE = 60;
const dagVan = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function kopieen(map) {
  try {
    return fs.readdirSync(path.join(map, KOPIE)).map(n => (KOPIE_RE.exec(n) || [])[1]).filter(Boolean).sort().reverse()
      .map(dag => ({ dag, file: path.join(map, KOPIE, `_mappen-${dag}.json`) }));
  } catch {
    return [];
  }
}
function dagKopie(map) {
  const bron = path.join(map, '_mappen.json');
  const doel = path.join(map, KOPIE, `_mappen-${dagVan()}.json`);
  if (fs.existsSync(doel)) return;
  let text;
  try { text = fs.readFileSync(bron, 'utf8'); metaUit(JSON.parse(text)); } catch { return; }
  try {
    fs.mkdirSync(path.join(map, KOPIE), { recursive: true });
    fs.writeFileSync(doel, text);
    for (const oud of kopieen(map).slice(BEWAAR_KOPIE)) fs.unlinkSync(oud.file);
  } catch {}
}

// Hoeveel items staan in een map (een map die ook bestaat), voor bestanden die er nog zijn.
function geplaatst(meta, bestaat) {
  const folders = new Set(meta.folders || []);
  return Object.entries(meta.place || {}).filter(([file, f]) => folders.has(f) && bestaat(file));
}

// kind: 'quiz', 'oefenblad', 'sessie' of 'proef' (een toets). checkFile, load, save, validate en list komen uit de module zelf.
// dir mag ook een functie zijn (de resultaten: elke klas haar eigen map).
function library({ kind, dir: map, checkFile, load, save, validate, list }) {
  const dir = () => (typeof map === 'function' ? map() : map);
  const META = () => path.join(dir(), '_mappen.json');
  const words = KINDS[kind];

  // _mappen.json: de mappen (folders), de map van elk bestand (place), en wanneer dat veranderde (tijd per bestand,
  // mapTijd/weg per map). Met die tijden voegt Mijn lesmap twee pc's per bestand samen: de laatste verplaatsing wint.
  // Nooit doen alsof er geen mappen zijn omdat het bestand even niet te lezen was (OneDrive of een virusscanner houdt het
  // vast, of het wordt net vervangen). Fout van 2026-11-27: zo'n lege lezing werd bij de volgende wijziging bewaard, en
  // Mijn lesmap zette die lege indeling op elke pc: 778 quizzen stonden los. Nu: opnieuw proberen, dan de laatste goede
  // lezing (of de kopie van vandaag), en lukt ook dat niet, dan liever een foutmelding dan een lege indeling bewaren.
  function readMeta(streng = true) {
    const file = META();
    for (let poging = 0; poging < 4; poging++) {
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT' && !laatsteGoed.has(file)) return { folders: [], place: {} };
        slaap(40);
        continue;
      }
      try {
        const out = metaUit(JSON.parse(text));
        laatsteGoed.set(file, text);
        return out;
      } catch {
        slaap(40);
      }
    }
    if (laatsteGoed.has(file)) return metaUit(JSON.parse(laatsteGoed.get(file)));
    const kopie = kopieen(dir())[0];
    if (kopie) try { return metaUit(JSON.parse(fs.readFileSync(kopie.file, 'utf8'))); } catch {}
    if (!streng) return { folders: [], place: {} };
    throw new Error('De mappen zijn even niet te lezen. Probeer het zo opnieuw.');
  }

  function writeMeta(meta) {
    stempel(readMeta(), meta, Date.now());
    fs.mkdirSync(dir(), { recursive: true });
    dagKopie(dir());
    const text = JSON.stringify(meta, null, 2) + '\n';
    schrijfVeilig(META(), text);
    laatsteGoed.set(META(), text);
  }

  // Mappen kunnen in mappen zitten. Een map is een pad: "Wiskunde/Breuken".
  function folderName(name) {
    const clean = String(name || '').replace(/[\/\\]/g, '-').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!clean) throw new Error('Geef de map een naam.');
    return clean;
  }

  function folderPath(value) {
    const parts = String(value || '').split('/').map(p => p.trim()).filter(Boolean).slice(0, MAX_DEPTH);
    return parts.map(folderName).join('/');
  }

  const parentOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const baseOf = p => p.slice(p.lastIndexOf('/') + 1);
  const within = (p, root) => p === root || p.startsWith(`${root}/`);
  const depth = p => p.split('/').length;
  const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

  function sortFolders(meta) {
    meta.folders.sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
  }

  // Een map en alles eronder een ander pad geven, met de items erin.
  function repath(meta, from, to) {
    meta.folders = meta.folders.map(f => (within(f, from) ? to + f.slice(from.length) : f));
    for (const [file, f] of Object.entries(meta.place)) if (within(f, from)) meta.place[file] = to + f.slice(from.length);
    sortFolders(meta);
  }

  // Een pad aanmaken (met de mappen erboven), en bestaande mappen met dezelfde naam hergebruiken.
  function ensurePath(meta, value) {
    let current = '';
    for (const part of folderPath(value).split('/').filter(Boolean)) {
      const want = current ? `${current}/${part}` : part;
      const found = meta.folders.find(f => sameName(f, want));
      if (!found) meta.folders.push(want);
      current = found || want;
    }
    sortFolders(meta);
    return current;
  }

  function folders() {
    return readMeta(false).folders;
  }

  // De map van elk bestand, voor in de lijst.
  function places() {
    const meta = readMeta(false);
    return file => (meta.folders.includes(meta.place[file]) ? meta.place[file] : '');
  }

  function addFolder(name, parent = '') {
    const meta = readMeta();
    if (parent && !meta.folders.includes(parent)) throw new Error('Die map bestaat niet meer.');
    if (parent && depth(parent) >= MAX_DEPTH) throw new Error(`Dieper dan ${MAX_DEPTH} mappen gaat niet.`);
    const full = parent ? `${parent}/${folderName(name)}` : folderName(name);
    if (meta.folders.some(f => sameName(f, full))) throw new Error('Die map bestaat al.');
    meta.folders.push(full);
    sortFolders(meta);
    writeMeta(meta);
  }

  // Alleen de naam verandert; de map blijft op dezelfde plaats.
  function renameFolder(from, to) {
    const meta = readMeta();
    if (!meta.folders.includes(from)) throw new Error('Die map bestaat niet meer.');
    const parent = parentOf(from);
    const full = parent ? `${parent}/${folderName(to)}` : folderName(to);
    if (full !== from && meta.folders.some(f => sameName(f, full) && f !== from)) throw new Error('Die map bestaat al.');
    repath(meta, from, full);
    writeMeta(meta);
  }

  // Een map (met alles erin) in een andere map zetten, of met '' terug bovenaan.
  function moveFolder(from, into) {
    const meta = readMeta();
    if (!meta.folders.includes(from)) throw new Error('Die map bestaat niet meer.');
    if (into && !meta.folders.includes(into)) throw new Error('Die map bestaat niet meer.');
    if (into && within(into, from)) throw new Error('Een map kan niet in zichzelf.');
    const full = into ? `${into}/${baseOf(from)}` : baseOf(from);
    if (full === from) return;
    if (meta.folders.some(f => sameName(f, full))) throw new Error(`Daar staat al een map "${baseOf(from)}".`);
    const deepest = Math.max(...meta.folders.filter(f => within(f, from)).map(depth)) - depth(from) + depth(full);
    if (deepest > MAX_DEPTH) throw new Error(`Dieper dan ${MAX_DEPTH} mappen gaat niet.`);
    repath(meta, from, full);
    writeMeta(meta);
  }

  // Een map verwijderen, met de mappen erin: de items blijven bestaan, in de map erboven.
  function removeFolder(name) {
    const meta = readMeta();
    const parent = parentOf(name);
    const los = [];
    meta.folders = meta.folders.filter(f => !within(f, name));
    for (const [file, f] of Object.entries(meta.place)) {
      if (!within(f, name)) continue;
      if (parent) meta.place[file] = parent;
      else { delete meta.place[file]; los.push(file); }
    }
    // Zelf gedaan: dan zegt de lijst niet dat ze "plots" geen map meer hebben (ook niet op je andere pc's).
    meta.bewust = Date.now();
    writeMeta(meta);
    erken(los);
  }

  // Eén bestand of een lijst (meerdere tegelijk verplaatsen): één keer _mappen.json schrijven.
  function move(file, folder) {
    const files = [].concat(file);
    files.forEach(checkFile);
    const meta = readMeta();
    if (folder && !meta.folders.includes(folder)) throw new Error('Die map bestaat niet meer.');
    for (const f of files) {
      if (folder) meta.place[f] = folder;
      else delete meta.place[f];
    }
    if (!folder) meta.bewust = Date.now();
    writeMeta(meta);
    if (!folder) erken(files);
  }

  // ---------- Plots veel items zonder map? ----------
  // We vergelijken met de dagkopieën van de laatste 14 dagen. Staan er minstens 10 items (en minstens een derde)
  // die toen in een map stonden nu los, dan toont de lijst één zin met "Terugzetten" en "Klopt zo".
  // Wat de leerkracht zelf uit een map haalde (of met "Klopt zo" goedkeurde), telt niet mee: _mappen-kopie/erkend.json.
  const ERKEND = () => path.join(dir(), KOPIE, 'erkend.json');
  function erkendeLijst() {
    try { const e = JSON.parse(fs.readFileSync(ERKEND(), 'utf8')); return e && typeof e === 'object' && !Array.isArray(e) ? e : {}; } catch { return {}; }
  }
  function erken(files) {
    if (!files.length) return;
    const e = erkendeLijst();
    const nu = Date.now();
    for (const f of files) e[f] = nu;
    try {
      fs.mkdirSync(path.join(dir(), KOPIE), { recursive: true });
      fs.writeFileSync(ERKEND(), JSON.stringify(e));
    } catch {}
  }
  function bestanden() {
    try { return new Set(fs.readdirSync(dir()).filter(n => /^[^_].*\.json$/.test(n))); } catch { return new Set(); }
  }
  let verliesMemo = null;
  function verliesBerekenen() {
    const meta = readMeta(false);
    const er = bestanden();
    const bestaat = f => er.has(f);
    const nu = new Set(geplaatst(meta, bestaat).map(([f]) => f));
    const erkend = erkendeLijst();
    const vanaf = dagVan(Date.now() - 14 * 864e5);
    let uit = null;
    for (const k of kopieen(dir())) {
      if (k.dag < vanaf) break;
      let km;
      try { km = metaUit(JSON.parse(fs.readFileSync(k.file, 'utf8'))); } catch { continue; }
      const toen = geplaatst(km, bestaat);
      const weg = toen.filter(([f]) => !nu.has(f) && !erkend[f]).map(([f]) => f);
      if (weg.length >= 10 && weg.length >= toen.length / 3 && (!uit || weg.length > uit.los)) uit = { los: weg.length, dag: k.dag, files: weg };
    }
    return uit;
  }
  // Snel: alleen opnieuw rekenen als _mappen.json of de erkende lijst veranderde (of het een nieuwe dag is).
  function verlies() {
    dagKopie(dir());
    const kenmerk = f => { try { const st = fs.statSync(f); return `${st.size}:${st.mtimeMs}`; } catch { return '-'; } };
    const sleutel = `${dir()}|${kenmerk(META())}|${kenmerk(ERKEND())}|${dagVan()}|${bestanden().size}`;
    if (!verliesMemo || verliesMemo.sleutel !== sleutel) verliesMemo = { sleutel, uit: verliesBerekenen() };
    const uit = verliesMemo.uit;
    return uit ? { los: uit.los, dag: uit.dag } : null;
  }

  // Terugzetten uit de kopie: alleen wat nu los staat gaat terug in zijn map (wat intussen elders staat, blijft daar).
  // Mappen uit de kopie die ontbreken, komen terug. Er wordt nooit iets verwijderd.
  function herstel(dag) {
    const k = kopieen(dir()).find(x => x.dag === dag);
    if (!k) throw new Error('Die kopie is er niet meer.');
    let km;
    try { km = metaUit(JSON.parse(fs.readFileSync(k.file, 'utf8'))); } catch { throw new Error('Die kopie is niet te lezen.'); }
    const meta = readMeta();
    const er = bestanden();
    for (const f of km.folders) if (!meta.folders.some(x => sameName(x, f))) ensurePath(meta, f);
    let terug = 0;
    for (const [file, f] of geplaatst(km, x => er.has(x))) {
      if (meta.place[file] && meta.folders.includes(meta.place[file])) continue;
      meta.place[file] = ensurePath(meta, f);
      terug++;
    }
    writeMeta(meta);
    verliesMemo = null;
    return { terug };
  }

  // "Klopt zo": wat nu los staat, mag los blijven.
  function kloptZo() {
    const uit = verliesBerekenen();
    if (uit) erken(uit.files);
    verliesMemo = null;
    return {};
  }

  // Nieuwe bestanden één keer vanzelf in een map zetten (pick geeft het pad, of niets).
  // Wat al eens bekeken is (gezien), blijft waar de leerkracht het zet, ook bovenaan.
  function autoPlace(files, pick) {
    const meta = readMeta();
    const seen = new Set(meta.gezien || []);
    const nieuw = files.filter(f => !seen.has(f));
    if (!nieuw.length) return;
    for (const f of nieuw) {
      let folder = '';
      try { folder = folderPath(pick(f) || ''); } catch {}
      if (folder && !meta.place[f]) meta.place[f] = ensurePath(meta, folder);
    }
    const bestaat = new Set(files);
    meta.gezien = [...seen].filter(f => bestaat.has(f)).concat(nieuw);
    writeMeta(meta);
  }

  // Verwijderen: de bestanden gaan naar _prullenbak in de eigen map en blijven daar 30 dagen.
  // Zo is een verkeerde klik nooit meteen weg. Geeft het aantal verwijderde bestanden terug.
  function trash(files) {
    const paths = files.map(checkFile);
    const bin = path.join(dir(), '_prullenbak');
    fs.mkdirSync(bin, { recursive: true });
    const now = Date.now();
    for (const old of fs.readdirSync(bin)) {
      try {
        const p = path.join(bin, old);
        if (now - fs.statSync(p).mtimeMs > 30 * 864e5) fs.unlinkSync(p);
      } catch {}
    }
    const meta = readMeta();
    let count = 0;
    files.forEach((file, i) => {
      if (!fs.existsSync(paths[i])) return;
      let to = path.join(bin, file);
      if (fs.existsSync(to)) to = path.join(bin, file.replace(/(\.\w+)$/, `-${now}$1`));
      fs.renameSync(paths[i], to);
      try { fs.utimesSync(to, new Date(now), new Date(now)); } catch {}
      delete meta.place[file];
      count++;
    });
    if (count) writeMeta(meta);
    return count;
  }

  // Eén item ({ file }), een hele map met de mappen erin ({ folder }) of alles ({}). Geeft { name, bundle } terug.
  // De mappen in het bestand zijn relatief: een geëxporteerde map "Wiskunde/Breuken" heet in het bestand "Breuken".
  function exportBundle({ file, folder } = {}) {
    const where = places();
    let files;
    let name;
    let base = '';
    let subfolders = [];
    if (file) {
      checkFile(file);
      files = [file];
    } else if (folder) {
      if (!folders().includes(folder)) throw new Error('Die map bestaat niet meer.');
      base = parentOf(folder);
      files = list().filter(x => x.folder && within(x.folder, folder)).map(x => x.file);
      subfolders = folders().filter(f => within(f, folder));
      name = `${words.many}-${slug(baseOf(folder), 'map')}`;
    } else {
      files = list().map(x => x.file);
      subfolders = folders();
      name = `alle-${words.many}`;
    }
    const rel = f => (base ? f.slice(base.length + 1) : f);
    const items = [];
    for (const f of files) {
      try {
        items.push({ folder: file ? undefined : (where(f) ? rel(where(f)) : undefined), data: load(f) });
      } catch {
        // Een kapot bestand slaan we over.
      }
    }
    if (!items.length && !subfolders.length) throw new Error('Er is niets om te exporteren.');
    if (!name) name = `${words.one}-${slug(items[0].data.title, words.one)}`;
    const bundle = { lancelot: kind, version: 2, exported: new Date().toISOString(), items };
    if (subfolders.length) bundle.folders = subfolders.map(rel);
    return { name: `${name}.json`, bundle };
  }

  // Een geëxporteerd bestand (of een los quizbestand) inladen. Bestaande items blijven staan; alles komt erbij.
  function importBundle(raw, intoFolder) {
    let data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw.replace(/^﻿/, ''));
      } catch {
        throw new Error('Dit is geen geldig LANcelot-bestand.');
      }
    }
    if (!data || typeof data !== 'object') throw new Error('Dit is geen geldig LANcelot-bestand.');
    let items;
    let emptyFolders = [];
    const into = p => folderPath([intoFolder, p].filter(Boolean).join('/'));
    if (data.lancelot) {
      if (data.lancelot !== kind) {
        const other = KINDS[data.lancelot];
        throw new Error(other ? `Dit bestand bevat ${other.many}, geen ${words.many}. Importeer het bij ${other.waar}.` : 'Dit is geen geldig LANcelot-bestand.');
      }
      items = Array.isArray(data.items) ? data.items : [];
      emptyFolders = Array.isArray(data.folders) ? data.folders.filter(f => typeof f === 'string').slice(0, MAX_IMPORT) : [];
    } else {
      items = [{ data }];
    }
    if (!items.length && !emptyFolders.length) throw new Error('Dit bestand is leeg.');
    if (items.length > MAX_IMPORT) throw new Error(`Te veel items in één keer (hooguit ${MAX_IMPORT}).`);
    // Eerst alles controleren, zodat een fout halverwege niets half importeert.
    const clean = items.map((item, i) => {
      try {
        validate(item && item.data);
      } catch (err) {
        throw new Error(items.length > 1 ? `Item ${i + 1}: ${err.message}` : err.message);
      }
      return { data: item.data, folder: into(item && typeof item.folder === 'string' ? item.folder : '') };
    });
    // Wat er precies zo al staat, slaan we over: zo kan je dezelfde export gerust twee keer inladen.
    const existing = new Map();
    for (const x of list()) {
      try { existing.set(JSON.stringify(load(x.file)), x.file); } catch {}
    }
    const meta = readMeta();
    if (intoFolder && !meta.folders.includes(intoFolder)) throw new Error('Die map bestaat niet meer.');
    const before = meta.folders.length;
    for (const f of emptyFolders) if (into(f)) ensurePath(meta, into(f));
    let skipped = 0;
    let placed = 0;
    for (const item of clean) {
      const key = JSON.stringify(validate(item.data));
      const same = existing.get(key);
      if (same) skipped++;
      const file = same || save(item.data);
      existing.set(key, file);
      if (!item.folder || (same && meta.place[file])) continue;
      meta.place[file] = ensurePath(meta, item.folder);
      if (same) placed++;
    }
    writeMeta(meta);
    return { count: clean.length - skipped, skipped, placed, folders: meta.folders.length - before };
  }

  return { folders, places, addFolder, renameFolder, moveFolder, removeFolder, move, trash, autoPlace, exportBundle, importBundle, verlies, herstel, kloptZo };
}

module.exports = { library, KINDS, dagKopie, kopieen, metaUit, geplaatst, KOPIE };
