// Mappen en uitwisselen, samen voor quizzen, oefenbladen en Ronde Tafel-sessies.
// Mappen bestaan alleen in _mappen.json in de eigen map: de bestanden zelf blijven op hun plaats.
// Exporteren geeft één JSON-bestand met een of meer items (en hun map), dat je op een andere pc weer importeert.
const fs = require('fs');
const path = require('path');

const KINDS = {
  quiz: { one: 'quiz', many: 'quizzen' },
  oefenblad: { one: 'oefenblad', many: 'oefenbladen' },
  sessie: { one: 'sessie', many: 'sessies' },
};
const MAX_IMPORT = 300;

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

  function folderName(name) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!clean) throw new Error('Geef de map een naam.');
    return clean;
  }

  function folders() {
    return readMeta().folders;
  }

  // De map van elk bestand, voor in de lijst.
  function places() {
    const meta = readMeta();
    return file => (meta.folders.includes(meta.place[file]) ? meta.place[file] : '');
  }

  function addFolder(name) {
    const meta = readMeta();
    const clean = folderName(name);
    if (meta.folders.some(f => f.toLowerCase() === clean.toLowerCase())) throw new Error('Die map bestaat al.');
    meta.folders.push(clean);
    meta.folders.sort((a, b) => a.localeCompare(b, 'nl'));
    writeMeta(meta);
  }

  function renameFolder(from, to) {
    const meta = readMeta();
    const clean = folderName(to);
    if (!meta.folders.includes(from)) throw new Error('Die map bestaat niet meer.');
    if (clean !== from && meta.folders.some(f => f.toLowerCase() === clean.toLowerCase())) throw new Error('Die map bestaat al.');
    meta.folders = meta.folders.map(f => (f === from ? clean : f)).sort((a, b) => a.localeCompare(b, 'nl'));
    for (const [file, f] of Object.entries(meta.place)) if (f === from) meta.place[file] = clean;
    writeMeta(meta);
  }

  // Een map verwijderen: wat erin zit blijft bestaan, zonder map.
  function removeFolder(name) {
    const meta = readMeta();
    meta.folders = meta.folders.filter(f => f !== name);
    for (const [file, f] of Object.entries(meta.place)) if (f === name) delete meta.place[file];
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

  // Eén item ({ file }), een hele map ({ folder }) of alles ({}). Geeft { name, bundle } terug.
  function exportBundle({ file, folder } = {}) {
    const where = places();
    let files;
    let name;
    if (file) {
      checkFile(file);
      files = [file];
    } else if (folder) {
      if (!folders().includes(folder)) throw new Error('Die map bestaat niet meer.');
      files = list().filter(x => x.folder === folder).map(x => x.file);
      name = `${words.many}-${slug(folder, 'map')}`;
    } else {
      files = list().map(x => x.file);
      name = `alle-${words.many}`;
    }
    const items = [];
    for (const f of files) {
      try {
        items.push({ folder: where(f) || undefined, data: load(f) });
      } catch {
        // Een kapot bestand slaan we over.
      }
    }
    if (!items.length) throw new Error('Er is niets om te exporteren.');
    if (!name) name = `${words.one}-${slug(items[0].data.title, words.one)}`;
    return { name: `${name}.json`, bundle: { lancelot: kind, version: 1, exported: new Date().toISOString(), items } };
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
    if (data.lancelot) {
      if (data.lancelot !== kind) {
        const other = KINDS[data.lancelot];
        throw new Error(other ? `Dit bestand bevat ${other.many}, geen ${words.many}. Importeer het op de juiste pagina.` : 'Dit is geen geldig LANcelot-bestand.');
      }
      items = Array.isArray(data.items) ? data.items : [];
    } else {
      items = [{ data }];
    }
    if (!items.length) throw new Error('Dit bestand is leeg.');
    if (items.length > MAX_IMPORT) throw new Error(`Te veel items in één keer (hooguit ${MAX_IMPORT}).`);
    // Eerst alles controleren, zodat een fout halverwege niets half importeert.
    const clean = items.map((item, i) => {
      try {
        validate(item && item.data);
      } catch (err) {
        throw new Error(items.length > 1 ? `Item ${i + 1}: ${err.message}` : err.message);
      }
      const folder = intoFolder || (item && typeof item.folder === 'string' ? item.folder : '');
      return { data: item.data, folder: folder ? folderName(folder) : '' };
    });
    // Wat er precies zo al staat, slaan we over: zo kan je dezelfde export gerust twee keer inladen.
    const existing = new Map();
    for (const x of list()) {
      try { existing.set(JSON.stringify(load(x.file)), x.file); } catch {}
    }
    const meta = readMeta();
    let skipped = 0;
    for (const item of clean) {
      const key = JSON.stringify(validate(item.data));
      const same = existing.get(key);
      if (same) skipped++;
      const file = same || save(item.data);
      existing.set(key, file);
      if (!item.folder || (same && meta.place[file])) continue;
      let folder = meta.folders.find(f => f.toLowerCase() === item.folder.toLowerCase());
      if (!folder) {
        folder = item.folder;
        meta.folders.push(folder);
        meta.folders.sort((a, b) => a.localeCompare(b, 'nl'));
      }
      meta.place[file] = folder;
    }
    writeMeta(meta);
    return { count: clean.length - skipped, skipped };
  }

  return { folders, places, addFolder, renameFolder, removeFolder, move, forget, exportBundle, importBundle };
}

module.exports = { library, KINDS };
