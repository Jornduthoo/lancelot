// Mappen en uitwisselen, samen voor quizzen, oefenbladen en Ronde Tafel-sessies.
// Mappen (ook mappen in mappen) bestaan alleen in _mappen.json in de eigen map: de bestanden zelf blijven op hun plaats.
// Exporteren geeft één JSON-bestand met een of meer items (en hun map), dat je op een andere pc weer importeert.
const fs = require('fs');
const path = require('path');

const KINDS = {
  quiz: { one: 'quiz', many: 'quizzen' },
  oefenblad: { one: 'oefenblad', many: 'oefenbladen' },
  sessie: { one: 'sessie', many: 'sessies' },
};
const MAX_IMPORT = 2000;
const MAX_DEPTH = 6;

function slug(text, fallback) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || fallback;
}

// kind: 'quiz', 'oefenblad' of 'sessie'. checkFile, load, save, validate en list komen uit de module zelf.
function library({ kind, dir, checkFile, load, save, validate, list }) {
  const META = path.join(dir, '_mappen.json');
  const words = KINDS[kind];

  function readMeta() {
    try {
      const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
      return { folders: Array.isArray(meta.folders) ? meta.folders.filter(f => typeof f === 'string') : [], place: meta.place && typeof meta.place === 'object' ? meta.place : {} };
    } catch {
      return { folders: [], place: {} };
    }
  }

  function writeMeta(meta) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
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
    return readMeta().folders;
  }

  // De map van elk bestand, voor in de lijst.
  function places() {
    const meta = readMeta();
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
    meta.folders = meta.folders.filter(f => !within(f, name));
    for (const [file, f] of Object.entries(meta.place)) {
      if (!within(f, name)) continue;
      if (parent) meta.place[file] = parent;
      else delete meta.place[file];
    }
    writeMeta(meta);
  }

  function move(file, folder) {
    checkFile(file);
    const meta = readMeta();
    if (folder && !meta.folders.includes(folder)) throw new Error('Die map bestaat niet meer.');
    if (folder) meta.place[file] = folder;
    else delete meta.place[file];
    writeMeta(meta);
  }

  // Na het verwijderen van een bestand.
  function forget(file) {
    const meta = readMeta();
    if (meta.place[file]) {
      delete meta.place[file];
      writeMeta(meta);
    }
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
        throw new Error(other ? `Dit bestand bevat ${other.many}, geen ${words.many}. Importeer het op de juiste pagina.` : 'Dit is geen geldig LANcelot-bestand.');
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

  return { folders, places, addFolder, renameFolder, moveFolder, removeFolder, move, forget, exportBundle, importBundle };
}

module.exports = { library, KINDS };
