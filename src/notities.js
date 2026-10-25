// Notities per leerling voor de zorg (observaties, afspraken), alleen op deze pc in klas/notities.json (map klas/ staat in .gitignore).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'klas', 'notities.json');
const MAX = 200; // per leerling

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
}

function key(leerling) {
  const k = String(leerling || '').slice(0, 80);
  if (!k) throw new Error('Kies eerst een leerling.');
  return k;
}

function add(leerling, tekst) {
  const k = key(leerling);
  const t = String(tekst || '').trim().slice(0, 1000);
  if (!t) throw new Error('De notitie is leeg.');
  const data = read();
  const list = Array.isArray(data[k]) ? data[k] : [];
  list.push({ t: new Date().toISOString(), tekst: t });
  data[k] = list.slice(-MAX);
  write(data);
  return data[k];
}

function remove(leerling, t) {
  const k = key(leerling);
  const data = read();
  data[k] = (Array.isArray(data[k]) ? data[k] : []).filter(n => n.t !== t);
  if (!data[k].length) delete data[k];
  write(data);
  return data[k] || [];
}

module.exports = { read, add, remove };
