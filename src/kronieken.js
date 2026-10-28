// De Kronieken: de methodes van de leerkracht (bordboeken, handleidingen, kopieerbladen) per vak, blok en les.
// De bestanden blijven lokaal in de gegevensmap (kronieken/<vak>/<blok>/...), nooit in een back-up-zip of op GitHub:
// het is uitgeversmateriaal en een bordboek is al snel 30 MB.
// In _kronieken.json staat per bestand de pagina waar je stopte, en per les een koppeling naar een pagina in een boek.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const DIR = gegevens.pad('kronieken');
const META = path.join(DIR, '_kronieken.json');
const PRULLENBAK = path.join(DIR, '_prullenbak');
const SOORTEN = { '.pdf': 'pdf', '.png': 'beeld', '.jpg': 'beeld', '.jpeg': 'beeld', '.webp': 'beeld' };
const MAX_DIEPTE = 6;
const MAX_LES = 999;

function leesMeta() {
  try {
    const m = JSON.parse(fs.readFileSync(META, 'utf8'));
    return {
      mappen: Array.isArray(m.mappen) ? m.mappen.filter(x => typeof x === 'string') : [],
      pagina: m.pagina && typeof m.pagina === 'object' ? m.pagina : {},
      lessen: m.lessen && typeof m.lessen === 'object' ? m.lessen : {},
    };
  } catch {
    return { mappen: [], pagina: {}, lessen: {} };
  }
}

function schrijfMeta(m) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(META, JSON.stringify(m, null, 2) + '\n');
}

// Zelfde regels als de mappen van de quizzen: geen schuine strepen in een naam, hooguit 40 tekens, 6 diep.
function deel(naam) {
  const schoon = String(naam || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '').slice(0, 40);
  if (!schoon || schoon.startsWith('_')) throw new Error('Geef de map een naam.');
  return schoon;
}

function mapPad(waarde) {
  const delen = String(waarde || '').split('/').map(p => p.trim()).filter(Boolean);
  if (delen.length > MAX_DIEPTE) throw new Error(`Dieper dan ${MAX_DIEPTE} mappen gaat niet.`);
  return delen.map(deel).join('/');
}

function bestandNaam(naam) {
  const ext = path.extname(String(naam || '')).toLowerCase();
  if (!SOORTEN[ext]) throw new Error('Enkel pdf-bestanden en afbeeldingen (png, jpg, webp) kunnen in De Kronieken.');
  const stam = path.basename(String(naam), path.extname(String(naam))).replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().replace(/\s+/g, ' ').replace(/^[._]+/, '').slice(0, 80);
  return `${stam || 'bestand'}${ext}`;
}

// Het volledige pad op schijf, en nooit buiten de map kronieken.
function volledig(map, naam) {
  const p = path.join(DIR, ...mapPad(map).split('/').filter(Boolean), naam ? bestandNaam(naam) : '');
  if (p !== DIR && !p.startsWith(DIR + path.sep)) throw new Error('Ongeldig pad.');
  return p;
}

const sleutel = (map, naam) => (map ? `${mapPad(map)}/${naam}` : naam);

function lijst() {
  const m = leesMeta();
  const mappen = new Set(m.mappen);
  const bestanden = [];
  const loop = (dir, map) => {
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      if (it.name.startsWith('_') || it.name.startsWith('.')) continue;
      const hier = map ? `${map}/${it.name}` : it.name;
      if (it.isDirectory()) {
        mappen.add(hier);
        if (hier.split('/').length < MAX_DIEPTE) loop(path.join(dir, it.name), hier);
      } else if (SOORTEN[path.extname(it.name).toLowerCase()]) {
        let st;
        try { st = fs.statSync(path.join(dir, it.name)); } catch { continue; }
        const k = map ? `${map}/${it.name}` : it.name;
        bestanden.push({ map, naam: it.name, soort: SOORTEN[path.extname(it.name).toLowerCase()], grootte: st.size, pagina: m.pagina[k] || 1 });
      }
    }
  };
  loop(DIR, '');
  // De mappen erboven bestaan ook.
  for (const p of [...mappen]) for (let i = p.indexOf('/'); i > 0; i = p.indexOf('/', i + 1)) mappen.add(p.slice(0, i));
  const sorteer = (a, b) => a.localeCompare(b, 'nl', { numeric: true });
  bestanden.sort((a, b) => sorteer(a.map, b.map) || sorteer(a.naam, b.naam));
  return { mappen: [...mappen].sort(sorteer), bestanden, lessen: m.lessen };
}

function nieuweMap(map) {
  const p = mapPad(map);
  if (!p) throw new Error('Geef de map een naam.');
  fs.mkdirSync(volledig(p), { recursive: true });
  const m = leesMeta();
  if (!m.mappen.includes(p)) m.mappen.push(p);
  schrijfMeta(m);
  return { map: p };
}

// Een bestand toevoegen. Bestaat de naam al, dan krijgt het nieuwe bestand (2), (3)... erachter.
function bewaar(map, naam, data) {
  if (!Buffer.isBuffer(data) || !data.length) throw new Error('Het bestand is leeg.');
  const schoon = bestandNaam(naam);
  const soort = SOORTEN[path.extname(schoon).toLowerCase()];
  if (soort === 'pdf' && data.subarray(0, 1024).indexOf('%PDF') < 0) throw new Error(`"${schoon}" is geen geldig pdf-bestand.`);
  const dir = volledig(map);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(schoon);
  const stam = schoon.slice(0, -ext.length);
  let doel = schoon;
  for (let n = 2; fs.existsSync(path.join(dir, doel)); n++) doel = `${stam} (${n})${ext}`;
  fs.writeFileSync(path.join(dir, doel), data);
  return { map: mapPad(map), naam: doel };
}

// Verwijderen = naar _prullenbak, zoals bij de quizzen. Koppelingen naar dat boek verdwijnen mee.
function verwijder(map, naam) {
  const bron = volledig(map, naam);
  if (!fs.existsSync(bron)) throw new Error('Dat bestand bestaat niet meer.');
  fs.mkdirSync(PRULLENBAK, { recursive: true });
  fs.renameSync(bron, path.join(PRULLENBAK, `${gegevens.stempel()}_${path.basename(bron)}`));
  const m = leesMeta();
  const k = sleutel(map, path.basename(bron));
  delete m.pagina[k];
  for (const lessen of Object.values(m.lessen)) {
    for (const [nr, links] of Object.entries(lessen)) {
      lessen[nr] = (Array.isArray(links) ? links : []).filter(l => l.boek !== k);
      if (!lessen[nr].length) delete lessen[nr];
    }
  }
  schrijfMeta(m);
}

// Een lege map weghalen. Een map met bestanden blijft: die verwijder je eerst één voor één.
function verwijderMap(map) {
  const p = mapPad(map);
  if (!p) throw new Error('Die map bestaat niet.');
  if (lijst().bestanden.some(b => b.map === p || b.map.startsWith(`${p}/`))) throw new Error('Er zitten nog bestanden in deze map.');
  try { fs.rmSync(volledig(p), { recursive: true, force: true }); } catch {}
  const m = leesMeta();
  m.mappen = m.mappen.filter(x => x !== p && !x.startsWith(`${p}/`));
  schrijfMeta(m);
}

const getal = (n, max) => {
  const v = Math.floor(Number(n));
  return v >= 1 && v <= max ? v : 0;
};

// Op welke pagina stopte je? Zo open je de volgende keer meteen daar.
function zetPagina(map, naam, pagina) {
  const p = getal(pagina, 100000);
  if (!p || !fs.existsSync(volledig(map, naam))) return;
  const m = leesMeta();
  m.pagina[sleutel(map, bestandNaam(naam))] = p;
  schrijfMeta(m);
}

// Een les (map + lesnummer) koppelen aan een pagina in een boek. Per les kan er een link naar elk boek zijn.
function koppel({ map, les, boek, pagina }) {
  const p = mapPad(map);
  const nr = getal(les, MAX_LES);
  if (!p || !nr) throw new Error('Kies een les.');
  const delen = String(boek || '').split('/');
  const naam = delen.pop();
  if (!fs.existsSync(volledig(delen.join('/'), naam))) throw new Error('Dat boek bestaat niet meer.');
  const k = sleutel(delen.join('/'), bestandNaam(naam));
  const m = leesMeta();
  const lessen = m.lessen[p] || (m.lessen[p] = {});
  const links = (Array.isArray(lessen[nr]) ? lessen[nr] : []).filter(l => l.boek !== k);
  links.push({ boek: k, pagina: getal(pagina, 100000) || 1 });
  lessen[nr] = links;
  schrijfMeta(m);
}

function ontkoppel({ map, les, boek }) {
  const p = mapPad(map);
  const nr = getal(les, MAX_LES);
  const m = leesMeta();
  if (!m.lessen[p] || !m.lessen[p][nr]) return;
  m.lessen[p][nr] = m.lessen[p][nr].filter(l => l.boek !== boek);
  if (!m.lessen[p][nr].length) delete m.lessen[p][nr];
  if (!Object.keys(m.lessen[p]).length) delete m.lessen[p];
  schrijfMeta(m);
}

function routes(app, isLeerkracht, express, wijzig) {
  // Het bestand zelf, om te tonen op het bord. sendFile ondersteunt Range, zodat een groot bordboek in stukjes laadt.
  app.get('/kronieken/bestand', (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    let file;
    try { file = volledig(String(req.query.map || ''), String(req.query.naam || '')); } catch { return res.status(404).end(); }
    res.sendFile(file, { headers: { 'Cache-Control': 'no-cache' } }, err => err && !res.headersSent && res.status(404).end());
  });
  app.post('/kronieken/toevoegen', express.raw({ type: () => true, limit: '400mb' }), (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    try {
      const r = bewaar(String(req.query.map || ''), String(req.query.naam || ''), req.body);
      res.json({ ok: true, ...r });
      wijzig();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

module.exports = { DIR, lijst, nieuweMap, bewaar, verwijder, verwijderMap, zetPagina, koppel, ontkoppel, routes };
