// De Proef: toetsen. Ze staan als JSON-bestanden in de map proeven/, met de afbeeldingen erin (kleine webp's).
// De vraagsoorten, de controle en het verbeteren staan in public/js/pf-kern.js (dezelfde code als in de editor).
// Een afgenomen toets (een afname) komt in proeven/_afnames/: de antwoorden van elke leerling, de punten
// van de computer en die van de leerkracht (open vragen, op papier, de werkwijze bij een rekenvraag).
// Met Mijn lesmap gaan ze mee naar je andere pc's (toetsen-afnames/): daar zie en verbeter je hetzelfde.
// Komen twee pc's elkaar tegen, dan voegt afnameSamen ze samen per leerling en per vraag: de laatste wijziging wint.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const { library } = require('./library');
const { extract } = require('./ai-json');
const logboek = require('./logboek');
const K = require('../public/js/pf-kern');

const DIR = gegevens.pad('proeven');
// De afnames horen bij de klas (Meerdere klassen): elke klas heeft haar eigen punten.
const AFNAMES = () => gegevens.pad('proeven', '_afnames');

function list() {
  if (!fs.existsSync(DIR)) return [];
  const where = lib.places();
  const namen = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const er = new Set(namen);
  for (const k of lijstMemo.keys()) if (!er.has(k)) lijstMemo.delete(k);
  const lijst = namen
    .map(file => ({ ...lijstItem(file), folder: where(file) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'nl', { numeric: true }));
  // Gegeven op … (afnames op het bord en toetsen als taak) en dubbels (dezelfde inhoud onder een andere naam).
  const gegeven = new Map();
  const zet = (file, datum) => { if (file && datum) (gegeven.get(file) || gegeven.set(file, new Set()).get(file)).add(String(datum).slice(0, 10)); };
  for (const a of afnames()) zet(a.toetsFile, a.datum);
  try { for (const [file, data] of gegevenHook()) for (const d of data) zet(file, d); } catch {}
  const perSig = new Map();
  for (const q of lijst) if (q.sig) (perSig.get(q.sig) || perSig.set(q.sig, []).get(q.sig)).push(q);
  return lijst.map(q => {
    const g = [...(gegeven.get(q.file) || [])].sort().reverse();
    const dubbel = q.sig ? perSig.get(q.sig).filter(x => x !== q).map(x => x.title) : [];
    const { sig, ...rest } = q;
    return { ...rest, gegeven: g, ...(dubbel.length ? { dubbel } : {}) };
  });
}
// Toetsen die als taak gegeven zijn (src/taken.js zet dit, zonder dat de twee elkaar laden): Map(file → [datums]).
let gegevenHook = () => [];

// Wat de lijst van een toets toont. Niet elke keer elk bestand (met de afbeeldingen) opnieuw lezen: alleen wat veranderde.
// Een bestand dat net veranderde (de laatste seconden), lezen we altijd: sommige schijven tonen het tijdstip grof.
const lijstMemo = new Map();
function lijstItem(file) {
  let st = null;
  try { st = fs.statSync(path.join(DIR, file)); } catch {}
  const sleutel = st ? `${st.size}|${st.mtimeMs}` : '';
  const oud = lijstMemo.get(file);
  if (st && oud && oud.sleutel === sleutel && Date.now() - st.mtimeMs > 5000) return oud.item;
  let item;
  try {
    const t = K.validate(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
    const types = new Set();
    for (const v of K.vragenVan(t.vragen)) types.add(v.q.type);
    const doelen = require('./doelen');
    const vak = doelen.hoofdvak(K.niveausVan(t).flatMap(n => K.vragenVan(K.lijstVoor(t, n)).map(v => v.q.doel))) || '';
    const { title, ...inhoud } = t;
    const sig = require('crypto').createHash('sha1').update(JSON.stringify(inhoud)).digest('hex');
    item = { file, title: t.title, count: K.vragenVan(t.vragen).length, punten: K.totaal(t.vragen), types: [...types], niveaus: K.niveausVan(t), klaar: !K.problemen(t).length, vak, gewijzigd: st ? new Date(st.mtimeMs).toISOString() : null, ...(K.vragenVan(t.vragen).length ? { sig } : {}) };
  } catch {
    item = { file, title: `${file} (ongeldig bestand)`, count: 0, punten: 0, types: [], niveaus: ['schildknaap'], klaar: false };
  }
  if (st) lijstMemo.set(file, { sleutel, item });
  return item;
}

function checkFile(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json') || file.startsWith('_')) {
    throw new Error('Ongeldige bestandsnaam.');
  }
  return path.join(DIR, file);
}

function load(file) {
  return K.validate(JSON.parse(fs.readFileSync(checkFile(file), 'utf8')));
}

function slug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'toets';
}

function save(toets, file) {
  const clean = K.validate(toets);
  fs.mkdirSync(DIR, { recursive: true });
  if (!file) {
    const base = slug(clean.title);
    file = `${base}.json`;
    for (let i = 2; fs.existsSync(path.join(DIR, file)); i++) file = `${base}-${i}.json`;
  }
  fs.writeFileSync(checkFile(file), JSON.stringify(clean) + '\n');
  lijstMemo.delete(file);
  return file;
}

function remove(file) {
  lib.trash([file]);
}

// Het antwoord van een chatbot omzetten in een toets.
function parseAiText(raw) {
  const data = extract(raw, 'toets', d => d.vragen !== undefined || d.niveaus !== undefined);
  if (data && data.title === 'korte titel van de toets') throw new Error('Dit is de prompt zelf. Plak hier het antwoord dat de AI teruggeeft.');
  return K.validate(data);
}

// Het antwoord van de AI met de antwoorden voor de vakjes op een blad.
function parseSleutel(raw) {
  const data = extract(raw, 'verbetersleutel', d => Array.isArray(d.velden) || Array.isArray(d));
  const velden = Array.isArray(data) ? data : data.velden;
  return velden.filter(v => v && typeof v === 'object').slice(0, 400);
}

const lib = library({ kind: 'proef', dir: DIR, checkFile, load, save, validate: K.validate, list });

// ---------- Afnames ----------

function afnamePad(file) {
  if (typeof file !== 'string' || path.basename(file) !== file || !/^[\w-]+\.json$/.test(file)) throw new Error('Ongeldige afname.');
  return path.join(AFNAMES(), file);
}

function stempel(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Een nieuwe afname wegschrijven (bij het afsluiten). Geeft de bestandsnaam terug.
function bewaarAfname(rec) {
  fs.mkdirSync(AFNAMES(), { recursive: true });
  const base = `${stempel(new Date(rec.datum))}_${slug(rec.title)}`;
  let file = `${base}.json`;
  for (let i = 2; fs.existsSync(path.join(AFNAMES(), file)); i++) file = `${base}-${i}.json`;
  rec.file = file;
  schrijf(rec);
  return file;
}

const PC = String(process.env.LANCELOT_PC || require('os').hostname() || 'pc').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || 'pc';
let naSchrijf = () => {};
function schrijf(rec) {
  const p = afnamePad(rec.file);
  if (!rec.pc) rec.pc = PC;
  memo.delete(rec.file);
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(rec));
  fs.renameSync(`${p}.tmp`, p);
  naSchrijf(rec.file);
}

function laadAfname(file) {
  return JSON.parse(fs.readFileSync(afnamePad(file), 'utf8'));
}

// Per leerling: de punten (computer + leerkracht), het maximum en hoeveel er nog verbeterd moet worden.
function stand(rec, s) {
  const lijst = K.lijstVoor(rec.toets, s.niveau);
  let punten = 0;
  let max = 0;
  let open = 0;
  for (const { id, q } of K.vragenVan(lijst)) {
    max += K.maxVan(q);
    if (s.over && s.over[id] !== undefined && s.over[id] !== null) { punten += Number(s.over[id]) || 0; continue; }
    punten += Number(s.auto[id]) || 0;
    if (K.handPunten(q)) {
      if (s.hand[id] === undefined || s.hand[id] === null) open++;
      else punten += Number(s.hand[id]) || 0;
    }
  }
  return { punten: Math.round(punten * 2) / 2, max, open };
}

// De lijst leest niet elke keer elk bestand opnieuw: alleen wat veranderde (op deze pc of via de lesmap).
const memo = new Map();
function afnames() {
  if (!fs.existsSync(AFNAMES())) return [];
  const namen = fs.readdirSync(AFNAMES()).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const er = new Set(namen);
  for (const k of memo.keys()) if (!er.has(k)) memo.delete(k);
  return namen.map(file => {
    try {
      const st = fs.statSync(path.join(AFNAMES(), file));
      const sleutel = `${AFNAMES()}|${file}|${st.size}|${st.mtimeMs}`;
      const oud = memo.get(file);
      if (oud && oud.sleutel === sleutel) return oud.item;
      const rec = laadAfname(file);
      const open = rec.spelers.reduce((n, s) => n + stand(rec, s).open, 0);
      const item = { file, title: rec.title, datum: rec.datum, leerlingen: rec.spelers.length, open, klaar: !!rec.klaar, taak: rec.taak || null, gemaild: rec.spelers.filter(s => s.gemaild).length, toetsFile: rec.toetsFile || null };
      memo.set(file, { sleutel, item });
      return item;
    } catch {
      return null;
    }
  }).filter(Boolean).sort((a, b) => b.datum.localeCompare(a.datum));
}
const afnameVanTaak = id => (id && afnames().find(a => a.taak === id)) || null;

// ---------- Samenvoegen (Mijn lesmap) ----------
const ms = x => (typeof x === 'number' ? x : Date.parse(x || 0) || 0);
const sleutelVan = naam => String(naam || '').trim().replace(/\s+/g, ' ').toLowerCase();
// Eén leerling van twee pc's: zijn inzending van de laatste keer inleveren, en per vraag het laatste oordeel van de leerkracht.
function spelerSamen(a, b) {
  const nieuwer = ms(b.ingeleverd) > ms(a.ingeleverd) || (ms(b.ingeleverd) === ms(a.ingeleverd) && ms(b.t) > ms(a.t));
  const [w, o] = nieuwer ? [b, a] : [a, b];
  const m = JSON.parse(JSON.stringify(w));
  m.hand = m.hand || {};
  m.ht = { ...(m.ht || {}) };
  const zelfdeInzending = ms(a.ingeleverd) === ms(b.ingeleverd) && a.niveau === b.niveau;
  for (const [id, t] of Object.entries(o.ht || {})) {
    if (!(ms(t) > ms(m.ht[id]))) continue;
    m.ht[id] = t;
    const zet = (veld, v) => {
      if (v === undefined) { if (m[veld]) delete m[veld][id]; return; }
      m[veld] = m[veld] || {};
      m[veld][id] = v;
    };
    zet('hand', o.hand ? o.hand[id] : undefined);
    zet('over', o.over ? o.over[id] : undefined);
    zet('vak', o.vak ? o.vak[id] : undefined);
    if (zelfdeInzending) zet('auto', o.auto ? o.auto[id] : undefined);
  }
  if (!m.gemaild && o.gemaild) m.gemaild = o.gemaild;
  if (o.gelogd) m.gelogd = true;
  m.t = Math.max(ms(a.t), ms(b.t)) || undefined;
  return m;
}
function afnameSamen(lText, rText) {
  const l = JSON.parse(lText), r = JSON.parse(rText);
  const weg = { ...(r.weg || {}) };
  for (const [k, t] of Object.entries(l.weg || {})) if (!(ms(weg[k]) >= ms(t))) weg[k] = t;
  const per = new Map();
  for (const s of r.spelers || []) per.set(sleutelVan(s.naam), s);
  const spelers = [];
  const gezien = new Set();
  for (const s of l.spelers || []) {
    const k = sleutelVan(s.naam);
    gezien.add(k);
    spelers.push(per.has(k) ? spelerSamen(s, per.get(k)) : s);
  }
  for (const [k, s] of per) if (!gezien.has(k)) spelers.push(s);
  const m = { ...r, ...l };
  m.spelers = spelers.filter(s => !(ms(weg[sleutelVan(s.naam)]) >= Math.max(ms(s.ingeleverd), ms(s.t)))).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  if (Object.keys(weg).length) m.weg = weg;
  // Klaar of weer open (er kwam iemand bij): wat het laatst gebeurde.
  if (ms(r.kt) > ms(l.kt)) { m.klaar = r.klaar; m.kt = r.kt; }
  m.gelogd = !!(l.gelogd || r.gelogd);
  if (l.mailWacht || r.mailWacht) m.mailWacht = true;
  if (!l.resultaten && r.resultaten) m.resultaten = r.resultaten;
  return JSON.stringify(m);
}
function afnameGeldig(rec) {
  if (!rec || typeof rec !== 'object' || typeof rec.title !== 'string' || !rec.toets || !Array.isArray(rec.spelers)) throw new Error('Ongeldige afname.');
  for (const s of rec.spelers) if (!s || typeof s.naam !== 'string' || !s.auto || typeof s.auto !== 'object') throw new Error('Ongeldige afname.');
}
const nu = () => new Date().toISOString();

// De punten die een vraag echt oplevert: wat de leerkracht zelf gaf (over), anders computer + leerkracht.
const kregen = (s, id) => (s.over && s.over[id] !== undefined && s.over[id] !== null ? Number(s.over[id]) : (Number(s.auto[id]) || 0) + (Number(s.hand[id]) || 0));

// Punten van de leerkracht voor één vraag van één leerling (null = nog niet verbeterd).
// over: true = de leerkracht zet de punten van de hele vraag zelf (ook als de computer al verbeterde); null = terug naar de computer.
// naam: welke leerling (de plaats in de lijst kan verschuiven als er iemand bijkomt, op deze of een andere pc).
function cijfer({ file, speler, naam, id, punten, over, vak, goed } = {}) {
  const rec = laadAfname(file);
  const s = typeof naam === 'string' ? rec.spelers.find(x => sleutelVan(x.naam) === sleutelVan(naam)) : rec.spelers[Number(speler)];
  if (!s) throw new Error('Die leerling staat niet in deze afname.');
  s.ht = s.ht || {};
  s.ht[id] = Date.now();
  s.t = Date.now();
  const v = K.vragenVan(K.lijstVoor(rec.toets, s.niveau)).find(x => x.id === id);
  // Eén vakje van een blad zelf goed of fout zetten (goed: null = terug naar de computer).
  if (vak !== undefined) {
    const k = Number(vak);
    if (!v || v.q.type !== 'blad' || !v.q.velden[k]) throw new Error('Dat vakje bestaat niet.');
    s.vak = s.vak || {};
    s.vak[id] = s.vak[id] || {};
    if (goed === true || goed === false) s.vak[id][k] = goed; else delete s.vak[id][k];
    s.auto[id] = K.auto(v.q, s.antwoorden[id], s.vak[id]);
    if (s.over) delete s.over[id]; // een eigen oordeel per vakje vervangt de punten voor het hele blad
    schrijf(rec);
    return stand(rec, s);
  }
  if (over) {
    if (!v) throw new Error('Die vraag staat niet in deze toets.');
    s.over = s.over || {};
    if (punten === null || punten === '') delete s.over[id];
    else {
      const n = Math.round(Number(String(punten).replace(',', '.')) * 2) / 2;
      if (!Number.isFinite(n) || n < 0 || n > K.maxVan(v.q)) throw new Error(`Geef 0 tot ${K.maxVan(v.q)} punten.`);
      s.over[id] = n;
    }
    schrijf(rec);
    return stand(rec, s);
  }
  if (!v || !K.handPunten(v.q)) throw new Error('Deze vraag verbeter je niet zelf.');
  if (punten === null || punten === '') s.hand[id] = null;
  else {
    const n = Math.round(Number(String(punten).replace(',', '.')) * 2) / 2;
    if (!Number.isFinite(n) || n < 0 || n > K.handPunten(v.q)) throw new Error(`Geef 0 tot ${K.handPunten(v.q)} punten.`);
    s.hand[id] = n;
  }
  schrijf(rec);
  return stand(rec, s);
}

// Klaar met verbeteren: de resultaten als Excel-bestand en (één keer) alles in het logboek, met de leerplandoelen.
function klaar(file, saveCsv) {
  const rec = laadAfname(file);
  // Een toets als taak (rec.taak) krijgt later nog leerlingen bij: wie al in het logboek staat (s.gelogd), niet opnieuw.
  if (!rec.gelogd) {
    const entries = [];
    for (const s of rec.spelers) {
      if (s.gelogd) continue;
      s.gelogd = true;
      for (const { id, q, nr } of K.vragenVan(K.lijstVoor(rec.toets, s.niveau))) {
        const max = K.maxVan(q);
        if (!max) continue;
        const kreeg = kregen(s, id);
        entries.push({
          naam: s.naam, spel: 'Toets', bron: rec.title, vraag: `Vraag ${nr}: ${q.vraag || K.NAMES[q.type]}`,
          doel: q.doel, juist: kreeg >= max / 2, sessie: `toets-${rec.file.replace(/\.json$/, '')}`, leeg: s.antwoorden[id] === undefined || s.antwoorden[id] === null,
        });
      }
    }
    logboek.add(entries);
    rec.gelogd = !rec.taak;
  }
  rec.klaar = true;
  rec.kt = Date.now();
  rec.resultaten = saveCsv(rec, s => stand(rec, s));
  schrijf(rec);
  return rec;
}

function verwijderAfname(file) {
  const p = afnamePad(file);
  const bin = path.join(DIR, '_prullenbak');
  fs.mkdirSync(bin, { recursive: true });
  fs.renameSync(p, path.join(bin, `afname-${Date.now()}-${file}`));
}

// Wat de kopie van één leerling toont (proef-print.html?kopie): de toets met zijn antwoorden, punten en ✔/✘ per vakje.
// speler: de plaats in de lijst, of de naam (vast, ook als er intussen iemand bijkwam).
function kopieData(file, speler) {
  const rec = laadAfname(file);
  const s = typeof speler === 'string' ? rec.spelers.find(x => sleutelVan(x.naam) === sleutelVan(speler)) : rec.spelers[Number(speler)];
  if (!s) throw new Error('Die leerling staat niet in deze afname.');
  const punten = {};
  const vakken = {};
  for (const { id, q } of K.vragenVan(K.lijstVoor(rec.toets, s.niveau))) {
    punten[id] = [kregen(s, id), K.maxVan(q)];
    if (q.type === 'blad') {
      const zelf = (s.vak && s.vak[id]) || {};
      vakken[id] = { goed: K.vakGoed(q, s.antwoorden[id], zelf), zelf };
    }
  }
  return { title: rec.title, datum: rec.datum, naam: s.naam, niveau: s.niveau, toets: rec.toets, antwoorden: s.antwoorden, punten, vakken, stand: stand(rec, s) };
}

module.exports = { set gegevenHook(fn) { gegevenHook = fn; }, afnameSamen, afnameGeldig, afnameVanTaak, sleutelVan, PC, set naSchrijf(fn) { naSchrijf = fn; }, get AFNAMES() { return AFNAMES(); }, kregen, DIR, list, load, save, remove, parseAiText, parseSleutel, lib, bewaarAfname, schrijfAfname: schrijf, laadAfname, afnames, cijfer, klaar, stand, verwijderAfname, kopieData, K };
