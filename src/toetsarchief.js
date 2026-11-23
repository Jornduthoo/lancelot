// Het toetsarchief: elke afgenomen toets (De Proef) vast bewaard, per schooljaar. Het groeit alleen: wat je in LANcelot
// verwijdert of later anders verbetert, blijft hier staan (een oudere pdf gaat naar "eerdere versies", nooit weg).
// Anders dan Mijn lesmap, die een spiegel is van wat nu in LANcelot staat.
//
//   <archiefmap>/<schooljaar>/[<klas>/]<vak>/<maand>/<datum> <toets>/
//       opgave.json, opgave.pdf, verbetersleutel.pdf   de toets zoals ze toen afgenomen werd (de latere bewerking niet)
//       resultaten.json, resultaten.csv                 antwoorden en punten per leerling (de csv opent in Excel)
//       Leerlingen/<naam>.pdf                           het verslag per leerling (Leerlingen/eerdere versies/: oudere)
//       _archief.json                                   wat LANcelot al bewaarde (om niets dubbel te doen)
//
// Standaard aan. De archiefmap: zelf gekozen, anders "Toetsarchief" in Mijn lesmap (zo staat ze ook in OneDrive of
// Google Drive), anders in de gegevensmap op deze pc. Wanneer: na "Klaar met verbeteren", vóór een afname verwijderd
// wordt (hier of via de lesmap van een andere pc), bij het opstarten en om de paar uur wat veranderde, en (instelling
// "elke maand") één keer per maand ook de toetsen die nog niet klaar zijn.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('./settings');
const gegevens = require('./gegevens');

const MAP_NAAM = 'Toetsarchief';
const META = '_archief.json';
const LEERLINGEN = 'Leerlingen';
const EERDER = 'eerdere versies';
const ZONDER_VAK = 'Zonder vak';
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const INDEX = () => gegevens.vast('toetsarchief-index.json');

// Lazy: deze modules laden elkaar (en de server) niet bij het opstarten van een test.
const proeven = () => require('./proeven');
const kopie = () => require('./toetskopie');
const K = () => require('../public/js/pf-kern');

const aan = () => settings.read().archief !== false;
const maandAan = () => settings.read().archiefMaand !== false;
const standaardMap = () => {
  const lm = settings.read().lesmap;
  return lm ? path.join(lm, MAP_NAAM) : gegevens.vast('toetsarchief');
};
const map = () => settings.read().archiefMap || standaardMap();
const binnen = (kind, ouder) => !!ouder && (path.resolve(kind) + path.sep).startsWith(path.resolve(ouder) + path.sep);
// In de lesmap (gedeeld met je andere pc's): dan bewaart de pc die de toets afnam hem, niet elke pc nog eens.
const gedeeld = () => binnen(map(), settings.read().lesmap);

const veilig = (s, standaard) => kopie().veilig(s, standaard);
const sleutelVan = naam => String(naam || '').trim().replace(/\s+/g, ' ').toLowerCase();
const hash = x => crypto.createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const p2 = n => String(n).padStart(2, '0');

// Het schooljaar loopt van 1 september tot 31 augustus.
function schooljaar(d) {
  const j = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${j}-${j + 1}`;
}
const maandMap = d => `${p2(d.getMonth() + 1)} ${MAANDEN[d.getMonth()]}`;
const datumTekst = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

// Een vak in de titel ("Toets Frans 3", "rekenen blok 4"): voor oude toetsen zonder vak en zonder doelen.
const VAN_WOORD = { rekenen: 'Wiskunde', wiskunde: 'Wiskunde', meetkunde: 'Wiskunde', getallenkennis: 'Wiskunde', taal: 'Nederlands', spelling: 'Nederlands', lezen: 'Nederlands', nederlands: 'Nederlands', frans: 'Frans', francais: 'Frans', 'français': 'Frans', engels: 'Engels', wo: 'WO', aardrijkskunde: 'Aardrijkskunde', geschiedenis: 'Geschiedenis', godsdienst: 'Godsdienst', zedenleer: 'Zedenleer', muzo: 'Muzo', 'lichamelijke opvoeding': 'Lichamelijke opvoeding', lo: 'Lichamelijke opvoeding' };
function vakUitTitel(titel) {
  const t = ` ${String(titel || '').toLowerCase().normalize('NFC')} `;
  const namen = new Map(Object.entries(VAN_WOORD));
  try { for (const g of require('./niveaus').alle()) for (const v of [g.naam, ...g.vakken]) namen.set(v.toLowerCase(), v); } catch {}
  // De langste naam eerst ("wetenschap en techniek" vóór "techniek").
  for (const [woord, vak] of [...namen].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`[^\\p{L}\\p{N}]${woord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\p{L}\\p{N}]`, 'u');
    if (re.test(t)) return vak;
  }
  return '';
}

// Het vak van een afname: wat de leerkracht bij de toets koos (toen, of nu in de bibliotheek), anders uit de doelen
// van de vragen, anders uit de titel. Lukt niets, dan "Zonder vak".
function vakVan(rec) {
  if (rec.toets && rec.toets.vak) return rec.toets.vak;
  if (rec.toetsFile) try { const t = proeven().load(rec.toetsFile); if (t.vak) return t.vak; } catch {}
  try { const v = proeven().vakVan(rec.toets); if (v) return v; } catch {}
  return vakUitTitel(rec.title) || ZONDER_VAK;
}

// ---------- Het register op deze pc: welke afname in welke map, en wat er al bewaard is ----------
function leesIndex() {
  let ix = null;
  try { ix = JSON.parse(fs.readFileSync(INDEX(), 'utf8')); } catch {}
  return { afnames: {}, bestanden: {}, ...(ix || {}) };
}
function schrijfIndex(ix) {
  try {
    fs.mkdirSync(path.dirname(INDEX()), { recursive: true });
    fs.writeFileSync(`${INDEX()}.tmp`, JSON.stringify(ix));
    fs.renameSync(`${INDEX()}.tmp`, INDEX());
  } catch (err) { console.error('Toetsarchief: register bewaren mislukt:', err.message); }
}
function leesJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function schrijfJson(file, data) {
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(`${file}.tmp`, file);
}

// De map van deze afname in het archief: dezelfde als de vorige keer (ook als de titel of het vak intussen veranderde).
function mapVoor(root, rec, ctx, id, ix) {
  const oud = ix.afnames[id];
  if (oud && oud.map && fs.existsSync(path.join(root, oud.map))) return oud.map;
  const d = new Date(rec.datum);
  const datum = Number.isNaN(d.getTime()) ? new Date() : d;
  const delen = [schooljaar(datum)];
  if (ctx.klasNaam) delen.push(veilig(ctx.klasNaam, 'klas'));
  delen.push(veilig(vakVan(rec), ZONDER_VAK), maandMap(datum));
  const basis = path.join(...delen, `${datumTekst(datum)} ${veilig(rec.title, 'toets')}`);
  for (let i = 1; i < 100; i++) {
    const kand = i === 1 ? basis : `${basis} (${i})`;
    const meta = leesJson(path.join(root, kand, META));
    if (!fs.existsSync(path.join(root, kand)) || (meta && meta.id === id)) return kand;
  }
  return `${basis} (${Date.now()})`;
}

// Eén leerling zoals het archief hem bewaart: leesbaar (punten per vraag, het antwoord) en ruw (om alles terug te maken).
function leerling(rec, s) {
  s = { ...s, hand: s.hand || {}, auto: s.auto || {}, antwoorden: s.antwoorden || {} };
  const P = proeven();
  const k = K();
  const st = P.stand(rec, s);
  const vragen = k.vragenVan(k.lijstVoor(rec.toets, s.niveau)).map(({ id, q, nr }) => {
    const open = k.handPunten(q) && !(s.over && s.over[id] != null) && (s.hand[id] === undefined || s.hand[id] === null);
    return { nr, vraag: q.vraag || k.NAMES[q.type] || q.type, max: k.maxVan(q), punten: open ? null : P.kregen(s, id), antwoord: s.antwoorden ? s.antwoorden[id] : undefined };
  });
  return {
    naam: s.naam, niveau: s.niveau || 'schildknaap', begon: s.begon || null, ingeleverd: s.ingeleverd || null,
    punten: st.punten, max: st.max, nogTeVerbeteren: st.open, verlietDeToets: (s.events || []).length, vragen,
    ruw: { antwoorden: s.antwoorden || {}, auto: s.auto || {}, hand: s.hand || {}, over: s.over, vak: s.vak, events: s.events || [] },
  };
}
// Terug naar een speler (voor een leerling die alleen nog in het archief staat).
const spelerUit = l => ({ naam: l.naam, niveau: l.niveau, begon: l.begon, ingeleverd: l.ingeleverd, ...l.ruw, hand: (l.ruw && l.ruw.hand) || {}, auto: (l.ruw && l.ruw.auto) || {} });
// Wat er in de pdf van een leerling staat: verandert dit, dan maken we een nieuwe pdf.
const pdfSig = l => hash([l.niveau, l.punten, l.max, l.ruw.antwoorden, l.ruw.auto, l.ruw.hand, l.ruw.over || null, l.ruw.vak || null]);

// ---------- Bewaren ----------
let laatsteFout = '';
let bezig = Promise.resolve();
let wachtrij = 0;
const werk = new Map(); // id -> { rec } voor de pdf-pagina's (/archief-kopie, /archief-opgave)
let pdfUrl = null; // server.js: (werkId, { naam } | { sleutel }) => 'http://127.0.0.1:…'

// De archiefmap zelf: bestaat de map erboven niet (OneDrive staat uit, een usb-stick is weg), dan niets.
function klaarMap() {
  const root = map();
  if (fs.existsSync(root)) return root;
  const ouder = path.dirname(root);
  if (!fs.existsSync(ouder)) throw new Error(settings.read().archiefMap ? 'De archiefmap is niet te vinden. Staat de schijf of OneDrive aan?' : 'Je lesmap is niet te vinden. Staat OneDrive of Google Drive aan?');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

// Wat meteen moet (ook vlak voor het verwijderen): de opgave en de resultaten. De pdf's komen erna, op de achtergrond.
// ctx: { klasId, klasNaam (alleen met meerdere klassen) }. Geeft { map, pdf: Promise } of null (archief uit).
function bewaar(rec, ctx = {}, { pdf = true } = {}) {
  if (!aan() || !rec || !rec.toets || !Array.isArray(rec.spelers)) return null;
  let root;
  try { root = klaarMap(); } catch (err) { laatsteFout = err.message; return null; }
  // Dezelfde afname, ook op een andere pc (de bestandsnaam en het begin gaan mee met de lesmap). Met het begin erbij:
  // een afname die verwijderd en in dezelfde minuut opnieuw gestart werd, krijgt dezelfde bestandsnaam.
  const id = `${ctx.klasId || gegevens.EERSTE}|${rec.file || hash([rec.title])}|${rec.datum || ''}`;
  const ix = leesIndex();
  const rel = mapVoor(root, rec, ctx, id, ix);
  const dir = path.join(root, rel);
  fs.mkdirSync(path.join(dir, LEERLINGEN), { recursive: true });
  const meta = leesJson(path.join(dir, META)) || { id, gemaakt: new Date().toISOString(), leerlingen: {}, opgaven: [] };
  const nu = new Date().toISOString();

  // De opgave: één keer. Komt er later een andere versie binnen (een toets als taak die nog bewerkt werd), dan ernaast.
  const opgSig = hash(rec.toets);
  if (!meta.opgaven.includes(opgSig)) {
    const naam = meta.opgaven.length ? `opgave (versie ${meta.opgaven.length + 1}).json` : 'opgave.json';
    schrijfJson(path.join(dir, naam), { toets: rec.title, afgenomen: rec.datum, klas: ctx.klasNaam || undefined, vak: vakVan(rec), opgave: rec.toets });
    meta.opgaven.push(opgSig);
  }

  // De resultaten: wie er vroeger in stond en nu niet meer (verwijderd in LANcelot), blijft erin.
  const oud = leesJson(path.join(dir, 'resultaten.json'));
  const nieuw = rec.spelers.map(s => leerling(rec, s));
  const er = new Set(nieuw.map(l => sleutelVan(l.naam)));
  const weg = ((oud && oud.leerlingen) || []).filter(l => !er.has(sleutelVan(l.naam))).map(l => ({ ...l, nietMeerInLANcelot: l.nietMeerInLANcelot || nu }));
  const alle = [...nieuw, ...weg].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  const res = {
    toets: rec.title, afgenomen: rec.datum, klas: ctx.klasNaam || undefined, vak: vakVan(rec), schooljaar: rel.split(path.sep)[0],
    verbeterd: !!rec.klaar, alsTaak: !!rec.taak, bijgewerkt: nu, leerlingen: alle,
  };
  schrijfJson(path.join(dir, 'resultaten.json'), res);
  const recAlle = { ...rec, spelers: alle.map(spelerUit) };
  const regels = require('./results').proefRegels(recAlle, s => proeven().stand(recAlle, s));
  fs.writeFileSync(path.join(dir, 'resultaten.csv'), '\ufeff' + regels.join('\r\n') + '\r\n');

  meta.id = id;
  meta.toets = rec.title;
  meta.afgenomen = rec.datum;
  meta.pc = rec.pc || '';
  meta.bijgewerkt = nu;
  schrijfJson(path.join(dir, META), meta);
  ix.afnames[id] = { ...(ix.afnames[id] || {}), map: rel, bij: nu };
  schrijfIndex(ix);
  laatsteFout = '';

  const klaar = pdf ? pdfs(dir, recAlle, alle, opgSig) : Promise.resolve({ gemaakt: 0 });
  return { map: dir, rel, pdf: klaar };
}

// De pdf's: de opgave en de verbetersleutel (één keer), en per leerling (opnieuw als zijn punten veranderden).
function pdfs(dir, rec, alle, opgSig) {
  if (!pdfUrl) return Promise.resolve({ gemaakt: 0 });
  wachtrij++;
  const taak = bezig.then(async () => {
    const T = kopie();
    const browser = T.zoekBrowser();
    if (!browser) return { gemaakt: 0, fout: 'Geen Edge of Chrome gevonden om de pdf te maken.' };
    const wid = crypto.randomBytes(8).toString('hex');
    werk.set(wid, { rec });
    let gemaakt = 0;
    const mislukt = [];
    try {
      const meta = leesJson(path.join(dir, META)) || { leerlingen: {} };
      meta.leerlingen = meta.leerlingen || {};
      if (!meta.opgavePdf || meta.opgavePdf !== opgSig) {
        try {
          const extra = meta.opgavePdf ? ` (versie ${meta.opgaven.indexOf(opgSig) + 1})` : '';
          await T.pdf(browser, pdfUrl(wid, { sleutel: false }), path.join(dir, `opgave${extra}.pdf`));
          await T.pdf(browser, pdfUrl(wid, { sleutel: true }), path.join(dir, `verbetersleutel${extra}.pdf`));
          meta.opgavePdf = opgSig;
          gemaakt += 2;
        } catch (err) { mislukt.push('de opgave'); console.error('Toetsarchief: pdf van de opgave mislukt:', err.message); }
      }
      for (const l of alle) {
        if (!rec.spelers.some(s => sleutelVan(s.naam) === sleutelVan(l.naam))) continue;
        const sig = pdfSig(l);
        const uit = path.join(dir, LEERLINGEN, `${veilig(l.naam, 'leerling')}.pdf`);
        if (meta.leerlingen[sleutelVan(l.naam)] === sig && fs.existsSync(uit)) continue;
        try {
          // De vorige versie blijft bewaard (bv. de punten vóór het oudercontact).
          if (fs.existsSync(uit)) {
            const eerder = path.join(dir, LEERLINGEN, EERDER);
            fs.mkdirSync(eerder, { recursive: true });
            const t = fs.statSync(uit).mtime;
            fs.renameSync(uit, path.join(eerder, `${veilig(l.naam, 'leerling')} tot ${datumTekst(t)} ${p2(t.getHours())}${p2(t.getMinutes())}.pdf`));
          }
          await T.pdf(browser, pdfUrl(wid, { naam: l.naam }), uit);
          meta.leerlingen[sleutelVan(l.naam)] = sig;
          gemaakt++;
        } catch (err) { mislukt.push(l.naam); console.error(`Toetsarchief: pdf voor ${l.naam} mislukt:`, err.message); }
      }
      const nu = leesJson(path.join(dir, META)) || meta;
      schrijfJson(path.join(dir, META), { ...nu, leerlingen: { ...(nu.leerlingen || {}), ...meta.leerlingen }, opgavePdf: meta.opgavePdf });
    } finally {
      werk.delete(wid);
    }
    return { gemaakt, fout: mislukt.length ? `Pdf niet gelukt voor ${mislukt.join(', ')}.` : '' };
  });
  bezig = taak.catch(() => {}).finally(() => { wachtrij--; });
  return taak;
}

// Voor de pdf-pagina's van server.js.
function werkKopie(wid, naam) {
  const w = werk.get(String(wid || ''));
  if (!w) throw new Error('Niet (meer) te vinden.');
  return proeven().kopieVan(w.rec, String(naam || ''));
}
function werkOpgave(wid) {
  const w = werk.get(String(wid || ''));
  if (!w) throw new Error('Niet (meer) te vinden.');
  return { toets: w.rec.toets };
}

// ---------- Welke afnames, van welke klas ----------
function klasCtx(klasId) {
  try {
    const k = require('./klas').klassen();
    const deze = k.klassen.find(x => x.id === klasId);
    return { klasId, klasNaam: k.klassen.length > 1 && deze ? (deze.naam || `Klas ${deze.nr}`) : '' };
  } catch { return { klasId, klasNaam: '' }; }
}
const afnameMap = klasId => gegevens.klasPad(klasId, 'proeven', '_afnames');
const ingeleverd = rec => Array.isArray(rec.spelers) && rec.spelers.some(s => s && s.ingeleverd);

// Vlak voor een afname verwijderd wordt (in De Proef, of omdat ze op een andere pc verwijderd werd): eerst vast bewaren.
// file: de naam in proeven/_afnames van de klas die nu gekozen is, of een volledig pad.
function voorWeg(file) {
  try {
    const p = path.isAbsolute(file) ? file : path.join(proeven().AFNAMES, file);
    const rec = leesJson(p);
    if (!rec || !ingeleverd(rec)) return null;
    rec.file = rec.file || path.basename(p);
    return bewaar(rec, klasCtx(gegevens.actieveKlas()));
  } catch (err) {
    console.error('Toetsarchief: bewaren vóór het verwijderen mislukt:', err.message);
    return null;
  }
}

// Alle afnames van een klas (bv. vlak voor die klas weggehaald wordt).
function heleKlas(klasId) {
  const dir = afnameMap(klasId);
  let n = 0;
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter(x => x.endsWith('.json') && !x.startsWith('_'))) {
    const rec = leesJson(path.join(dir, f));
    if (!rec || !ingeleverd(rec)) continue;
    rec.file = rec.file || f;
    if (bewaar(rec, klasCtx(klasId))) n++;
  }
  return n;
}

// Een ronde: wat nog niet (of niet meer zoals nu) in het archief staat. Toetsen die nog niet klaar zijn, alleen
// met alles: true (de maandelijkse ronde of de knop "Nu archiveren"). Leest een afname alleen als ze veranderde.
async function ronde({ alles = false } = {}) {
  if (!aan()) return { bewaard: 0 };
  try { klaarMap(); } catch (err) { laatsteFout = err.message; return { bewaard: 0, fout: err.message }; }
  await verhuis();
  const PC = proeven().PC;
  let bewaard = 0;
  const werkjes = [];
  for (const klasId of gegevens.klasIds()) {
    const dir = afnameMap(klasId);
    if (!fs.existsSync(dir)) continue;
    const ctx = klasCtx(klasId);
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json') && !x.startsWith('_'))) {
      let st;
      try { st = fs.statSync(path.join(dir, f)); } catch { continue; }
      const id = `${klasId}|${f}`;
      const sleutel = `${st.size}|${Math.round(st.mtimeMs)}`;
      const was = leesIndex().bestanden[id];
      if (was && was.sleutel === sleutel && was.map && fs.existsSync(path.join(map(), was.map))) continue;
      const rec = leesJson(path.join(dir, f));
      if (!rec || !ingeleverd(rec)) continue;
      if (!rec.klaar && !alles) continue;
      // In een gedeelde archiefmap bewaart de pc die de toets afnam hem (anders doen twee pc's hetzelfde werk).
      if (gedeeld() && rec.pc && rec.pc !== PC) continue;
      rec.file = rec.file || f;
      const r = bewaar(rec, ctx);
      if (!r) continue;
      bewaard++;
      werkjes.push(r.pdf);
      const ix2 = leesIndex();
      ix2.bestanden[id] = { sleutel, map: r.rel };
      schrijfIndex(ix2);
    }
  }
  settings.write({ archiefRonde: new Date().toISOString(), ...(alles ? { archiefMaandGedaan: maandSleutel() } : {}) });
  const pdf = await Promise.all(werkjes);
  const fout = pdf.map(r => r && r.fout).filter(Boolean)[0] || '';
  return { bewaard, gemaakt: pdf.reduce((n, r) => n + ((r && r.gemaakt) || 0), 0), fout };
}
const maandSleutel = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
// Bij het opstarten en om de paar uur: is de maand om (en staat "elke maand" aan), dan ook wat nog niet klaar is.
function vanzelf() {
  const alles = maandAan() && settings.read().archiefMaandGedaan !== maandSleutel();
  return ronde({ alles });
}

// Een andere archiefmap (zelf gekozen, of de lesmap kwam erbij): wat al in de oude stond, gaat mee (kopiëren, nooit wissen).
async function verhuis() {
  const nu = path.resolve(map());
  const oud = settings.read().archiefVorigeMap;
  if (oud && path.resolve(oud) !== nu && fs.existsSync(oud) && !binnen(nu, oud) && !binnen(oud, nu)) {
    try {
      await fs.promises.cp(oud, nu, { recursive: true, force: false, errorOnExist: false });
      // Het register op deze pc wijst naar mappen ten opzichte van de archiefmap: die blijven hetzelfde.
    } catch (err) { console.error('Toetsarchief: naar de nieuwe map kopiëren mislukt:', err.message); return; }
  }
  if (oud !== nu) settings.write({ archiefVorigeMap: nu });
}

// ---------- Instellingen en export ----------
function jaren() {
  let root;
  try { root = map(); } catch { return []; }
  if (!fs.existsSync(root)) return [];
  const tel = dir => {
    let n = 0;
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
    if (items.some(i => i.isFile() && i.name === META)) return 1;
    for (const i of items) if (i.isDirectory() && i.name !== LEERLINGEN) n += tel(path.join(dir, i.name));
    return n;
  };
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(i => i.isDirectory() && /^\d{4}-\d{4}$/.test(i.name))
    .map(i => ({ jaar: i.name, toetsen: tel(path.join(root, i.name)) }))
    .sort((a, b) => b.jaar.localeCompare(a.jaar));
}

function view() {
  const s = settings.read();
  return {
    aan: aan(), maand: maandAan(), map: map(), eigen: !!s.archiefMap, standaard: standaardMap(), lesmap: !!s.lesmap,
    gedeeld: gedeeld(), jaren: jaren(), laatst: s.archiefRonde || null, bezig: wachtrij > 0, fout: laatsteFout,
    store: !!(require('./store').ACTIEF),
  };
}

function zet({ aan: a, maand, map: m } = {}) {
  const w = {};
  if (a !== undefined) w.archief = a !== false;
  if (maand !== undefined) w.archiefMaand = maand !== false;
  if (m !== undefined) {
    const t = String(m || '').trim();
    if (!t) w.archiefMap = '';
    else {
      if (!path.isAbsolute(t)) throw new Error('Typ het volledige pad van de map, bv. D:\\Toetsarchief.');
      const r = path.resolve(t);
      if (binnen(r, gegevens.APP) || binnen(gegevens.APP, r)) throw new Error('Kies een map buiten de map van LANcelot zelf.');
      if (!fs.existsSync(path.dirname(r))) throw new Error('Die map is niet te vinden.');
      try { fs.mkdirSync(r, { recursive: true }); fs.accessSync(r, fs.constants.W_OK); } catch { throw new Error('In die map kan LANcelot niet schrijven. Kies een andere.'); }
      w.archiefMap = r;
    }
  }
  settings.write(w);
  return view();
}

// Een schooljaar als zip (naar een tijdelijk bestand; server.js stuurt het en ruimt het op).
async function exporteer(jaar, uit) {
  if (!/^\d{4}-\d{4}$/.test(String(jaar || ''))) throw new Error('Kies een schooljaar.');
  const root = map();
  const dir = path.join(root, jaar);
  if (!fs.existsSync(dir)) throw new Error('Van dat schooljaar staat nog niets in het archief.');
  const zip = require('./zip');
  const files = zip.listFiles(dir, dir, rel => rel.endsWith('.tmp') || rel.endsWith('.tmp.pdf'));
  const n = await zip.writeFile(uit, files.filter(f => path.posix.basename(f) !== META).map(f => ({ name: `${MAP_NAAM} ${jaar}/${f}`, file: path.join(dir, ...f.split('/')) })));
  if (!n) throw new Error('Van dat schooljaar staat nog niets in het archief.');
  return n;
}

module.exports = {
  MAP_NAAM, aan, map, standaardMap, schooljaar, maandMap, vakVan, vakUitTitel, bewaar, voorWeg, heleKlas, ronde, vanzelf,
  view, zet, exporteer, jaren, werkKopie, werkOpgave, klasCtx, set pdfUrl(fn) { pdfUrl = fn; }, wacht: () => bezig,
};
