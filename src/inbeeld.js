// In Beeld: vaste begrippenkaarten (één kaart per begrip uit de Op.stap-doelen, van de jongste kleuters tot het 6e leerjaar).
// De kaarten zelf maakt Jorn in het aparte project In Beeld (lancelot.network/inbeeld). LANcelot haalt ze op en brengt ze aan:
// - Ophalen: de kaarten van een leerjaar of project, met hun beeld, één keer van het internet. Daarna staat alles op deze pc
//   en werkt het in de klas over het schoolnetwerk. Wat je ophaalde, gaat mee met Mijn lesmap (welke sets): de andere pc haalt ze dan zelf.
// - Aanbrengen op het bord: eerst het beeld stukje per stukje (de klas raadt), dan het woord, de uitleg en de voorbeeldzin.
// - Woorden van de week (Runenraadsel en Hofschilder), een quiz met een doel per vraag, en LANcelot Junior.
// - Terugmelden: alleen "kaart X aangebracht in leerjaar Y". Nooit namen, antwoorden of het logboek.
// Alleen voor België (Op.stap) en niet in de Store-versie: de kaarten blijven Nederlands.
// Het formaat staat in docs/inbeeld-formaat.md.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const settings = require('./settings');
const doelen = require('./doelen');
const store = require('./store');

const DIR = () => gegevens.vast('inbeeld');
const DATA = () => path.join(DIR(), 'kaarten.json');
const BEELDEN = () => path.join(DIR(), 'beelden');
// Wat met Mijn lesmap meegaat: welke sets je ophaalde en de kaarten van de week. Klein, dus gewoon json.
const LESMAP_DIR = () => path.join(DIR(), 'lesmap');
const KEUZE = () => path.join(LESMAP_DIR(), 'keuze.json');

const BRON = 'https://lancelot.network/inbeeld/api';
const bron = () => String(settings.read().inbeeldBron || process.env.LANCELOT_INBEELD || BRON).replace(/\/+$/, '');

const NR = /^[A-Z]{1,3}-\d{1,5}$/;
const LEERJAREN = ['JK', 'K2', 'K3', '1', '2', '3', '4', '5', '6'];
const BEELD_NAAM = /^[A-Z]{1,3}-\d{1,5}\.(webp|png|jpg)$/;
const MAX_BEELD = 1.5 * 1024 * 1024;
const MAX_KAARTEN = 3000;
const MAX_WEEK = 30;

const aan = () => !store.ACTIEF;

const kort = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, max) : '');

// "4", 4, "L4", "4e leerjaar" -> "4". "K1", "jk", "instap" -> "JK". Onbekend: ''.
function leerjaar(v) {
  const s = String(v ?? '').trim().toUpperCase();
  if (/^(JK|K1|K0|INSTAP|PEUTER)/.test(s)) return 'JK';
  if (/^K[23]$/.test(s)) return s;
  const m = s.match(/^L?([1-6])(?!\d)/);
  return m ? m[1] : '';
}

// Het woord en het lidwoord: "de ophaalbrug" of { woord: "ophaalbrug", lidwoord: "de" }.
function splitsWoord(woord, lidwoord) {
  let w = kort(woord, 60);
  let l = kort(lidwoord, 4).toLowerCase();
  const m = w.match(/^(de|het|een)\s+(.+)$/i);
  if (m && !l) { l = m[1].toLowerCase(); w = m[2]; }
  if (!['de', 'het'].includes(l)) l = '';
  return { woord: w, lidwoord: l };
}

// Eén kaart uit In Beeld opschonen. Geeft null voor een kaart die niet klopt (die slaan we over, de rest niet).
function schoonKaart(k) {
  if (!k || typeof k !== 'object') return null;
  const nr = kort(k.nr || k.nummer, 12).toUpperCase();
  if (!NR.test(nr)) return null;
  const { woord, lidwoord } = splitsWoord(k.woord, k.lidwoord);
  const uitleg = kort(k.uitleg, 220);
  if (!woord || !uitleg) return null;
  const lijst = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;]/) : []);
  const leerjaren = [...new Set(lijst(k.leerjaren).map(leerjaar).filter(Boolean))].sort((a, b) => LEERJAREN.indexOf(a) - LEERJAREN.indexOf(b));
  const out = {
    nr, woord, lidwoord, uitleg,
    zin: kort(k.zin || k.voorbeeldzin, 220),
    leerjaren,
    doelen: [...new Set(lijst(k.doelen || k.doelcodes).map(doelen.clean).filter(Boolean))].slice(0, 6),
    verwant: [...new Set(lijst(k.verwant || k.verwante).map(x => kort(x, 12).toUpperCase()).filter(x => NR.test(x) && x !== nr))].slice(0, 12),
  };
  const vak = kort(k.vak, 40);
  if (vak) out.vak = vak;
  // Het beeld: een adres bij In Beeld (wordt opgehaald), een ingebouwd beeld (/img/...) of een bestand dat al hier staat.
  const beeld = kort(k.beeld, 300);
  if (beeld) out.beeld = beeld;
  return out;
}

// ---------- Opslag ----------

let cache = null;
function leesJson(f, leeg) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return leeg; }
}
function schrijf(f, data) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 1));
  fs.renameSync(f + '.tmp', f);
}
function data() {
  if (cache) return cache;
  const d = leesJson(DATA(), {});
  cache = {
    kaarten: d.kaarten && typeof d.kaarten === 'object' && !Array.isArray(d.kaarten) ? d.kaarten : {},
    // Per kaart: in welke leerjaren en wanneer ze aangebracht werd (alleen op deze pc).
    aangebracht: d.aangebracht && typeof d.aangebracht === 'object' ? d.aangebracht : {},
    // Terugmeldingen die nog niet weg konden (geen internet): de volgende keer opnieuw.
    wachtrij: Array.isArray(d.wachtrij) ? d.wachtrij.slice(-500) : [],
  };
  return cache;
}
function bewaar() {
  schrijf(DATA(), cache);
}
function keuze() {
  const k = leesJson(KEUZE(), {});
  return {
    sets: Array.isArray(k.sets) ? k.sets.filter(s => s && typeof s.id === 'string').map(s => ({ id: kort(s.id, 60), titel: kort(s.titel, 80) })) : [],
    week: Array.isArray(k.week) ? k.week.map(x => kort(x, 12)).filter(x => NR.test(x)).slice(0, MAX_WEEK) : [],
  };
}
function zetKeuze(k) {
  schrijf(KEUZE(), k);
}
// Mijn lesmap: wat binnenkomt moet kloppen.
function keuzeGeldig(k) {
  if (!k || typeof k !== 'object' || Array.isArray(k) || !Array.isArray(k.sets || []) || !Array.isArray(k.week || [])) throw new Error('Ongeldig bestand.');
}
// Na het synchroniseren: sets die hier nog niet staan, zelf ophalen (als er internet is).
async function uitLesmap() {
  cache = null;
  const k = keuze();
  const hier = new Set(Object.values(data().kaarten).map(x => x.set));
  for (const s of k.sets) {
    if (hier.has(s.id)) continue;
    try { await haalSet(s.id); } catch {}
  }
}

// ---------- Ingebouwde voorbeeldkaarten ----------
// Zo kan je alles meteen uitproberen, ook zonder dat de echte kaarten online staan. Beelden uit het Toverdorp van Junior.
const VOORBEELD = require('./inbeeld-voorbeeld');

// ---------- Ophalen bij In Beeld ----------

async function haal(url, soort = 'json') {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'LANcelot (klasapp)' }, signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error('In Beeld is niet bereikbaar. Is er internet op deze pc?');
  }
  if (!res.ok) throw new Error(res.status === 404 ? 'Die kaarten staan (nog) niet online bij In Beeld.' : `In Beeld gaf een fout (${res.status}).`);
  if (soort === 'json') {
    try { return await res.json(); } catch { throw new Error('In Beeld gaf een onleesbaar antwoord.'); }
  }
  return { type: res.headers.get('content-type') || '', buf: Buffer.from(await res.arrayBuffer()) };
}

// Welke sets er online staan (per leerjaar en per project).
async function online() {
  const d = await haal(`${bron()}/index.json`);
  const sets = (Array.isArray(d && d.sets) ? d.sets : []).map(s => ({
    id: kort(s && s.id, 60),
    titel: kort(s && s.titel, 80),
    soort: s && s.soort === 'project' ? 'project' : 'leerjaar',
    leerjaren: (Array.isArray(s && s.leerjaren) ? s.leerjaren : []).map(leerjaar).filter(Boolean),
    aantal: Math.max(0, Number(s && s.aantal) || 0),
  })).filter(s => /^[a-z0-9-]{1,60}$/.test(s.id) && s.titel);
  return { sets, voorbeeld: { id: VOORBEELD.id, titel: VOORBEELD.titel, aantal: VOORBEELD.kaarten.length } };
}

const soortVan = (type, buf) => {
  const kop = buf.subarray(0, 12);
  if (kop.subarray(0, 4).toString('hex') === '89504e47') return 'png';
  if (kop.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpg';
  if (kop.subarray(0, 4).toString() === 'RIFF' && kop.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
};

// Het beeld van een kaart ophalen en hier bewaren. Alleen van In Beeld zelf (zelfde adres als de kaarten).
async function haalBeeld(kaart, basis) {
  if (!kaart.beeld || kaart.beeld.startsWith('/img/')) return kaart.beeld || '';
  let u;
  try { u = new URL(kaart.beeld, basis + '/'); } catch { return ''; }
  const thuis = new URL(basis + '/');
  if (u.protocol !== 'https:' && u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return '';
  if (u.host !== thuis.host) return '';
  const { buf } = await haal(u.href, 'beeld');
  const ext = soortVan('', buf);
  if (!ext || buf.length > MAX_BEELD) return '';
  const naam = `${kaart.nr}.${ext}`;
  fs.mkdirSync(BEELDEN(), { recursive: true });
  for (const oud of ['webp', 'png', 'jpg']) if (oud !== ext) fs.rmSync(path.join(BEELDEN(), `${kaart.nr}.${oud}`), { force: true });
  fs.writeFileSync(path.join(BEELDEN(), naam), buf);
  return `/inbeeld/beeld/${naam}`;
}

function neemKaarten(setId, titel, kaarten) {
  const d = data();
  let n = 0;
  for (const ruw of kaarten) {
    const k = schoonKaart(ruw);
    if (!k) continue;
    if (!d.kaarten[k.nr] && Object.keys(d.kaarten).length >= MAX_KAARTEN) break;
    d.kaarten[k.nr] = { ...k, set: setId, setTitel: titel };
    n++;
  }
  bewaar();
  const kz = keuze();
  if (!kz.sets.some(s => s.id === setId)) zetKeuze({ ...kz, sets: [...kz.sets, { id: setId, titel }] });
  return n;
}

// Een set ophalen: de kaarten en hun beelden. Opnieuw ophalen werkt bij (een kaart met hetzelfde nummer wordt vervangen).
async function haalSet(id) {
  if (!aan()) throw new Error('In Beeld staat niet in deze versie.');
  const setId = kort(id, 60);
  if (setId === VOORBEELD.id) return { aantal: neemKaarten(VOORBEELD.id, VOORBEELD.titel, VOORBEELD.kaarten), titel: VOORBEELD.titel, zonderBeeld: 0 };
  if (!/^[a-z0-9-]{1,60}$/.test(setId)) throw new Error('Kies eerst welke kaarten.');
  const basis = bron();
  const d = await haal(`${basis}/sets/${setId}.json`);
  const titel = kort(d && d.titel, 80) || setId;
  const ruw = (Array.isArray(d && d.kaarten) ? d.kaarten : []).slice(0, 1000);
  const goed = ruw.map(schoonKaart).filter(Boolean);
  if (!goed.length) throw new Error('In deze set staan geen kaarten die LANcelot kan lezen.');
  let zonderBeeld = 0;
  // Een paar tegelijk ophalen: snel, maar zonder de schoolverbinding te verstoppen.
  for (let i = 0; i < goed.length; i += 4) {
    await Promise.all(goed.slice(i, i + 4).map(async k => {
      try { k.beeld = await haalBeeld(k, basis); } catch { k.beeld = ''; }
      if (!k.beeld) { zonderBeeld++; delete k.beeld; }
    }));
  }
  const aantal = neemKaarten(setId, titel, goed);
  stuurWachtrij();
  return { aantal, titel, zonderBeeld };
}

// Een set weer weghalen van deze pc (de kaarten die in geen andere set zitten, met hun beeld).
function wisSet(id) {
  const d = data();
  for (const [nr, k] of Object.entries(d.kaarten)) {
    if (k.set !== id) continue;
    delete d.kaarten[nr];
    for (const ext of ['webp', 'png', 'jpg']) fs.rmSync(path.join(BEELDEN(), `${nr}.${ext}`), { force: true });
  }
  bewaar();
  const kz = keuze();
  zetKeuze({ sets: kz.sets.filter(s => s.id !== id), week: kz.week.filter(nr => d.kaarten[nr]) });
}

const beeldBestand = naam => (BEELD_NAAM.test(String(naam)) ? path.join(BEELDEN(), naam) : null);

// ---------- Kijken ----------

const metLidwoord = k => (k.lidwoord ? `${k.lidwoord} ${k.woord}` : k.woord);

function view() {
  const d = data();
  const kz = keuze();
  const kaarten = Object.values(d.kaarten).sort((a, b) => a.nr.localeCompare(b.nr, 'nl', { numeric: true }))
    .map(k => ({ ...k, aangebracht: (d.aangebracht[k.nr] || []).map(a => a.lj) }));
  return {
    kaarten, sets: kz.sets, week: kz.week.filter(nr => d.kaarten[nr]),
    melden: settings.read().inbeeldMelden !== false, wachtrij: d.wachtrij.length,
    leerjaar: String(require('./klas').read().leerjaar || ''),
  };
}

const kaartenVan = nrs => {
  const d = data();
  return [...new Set((Array.isArray(nrs) ? nrs : []).map(x => kort(x, 12)))].map(nr => d.kaarten[nr]).filter(Boolean);
};

function zetWeek(nrs) {
  const kz = keuze();
  const week = kaartenVan(nrs).map(k => k.nr).slice(0, MAX_WEEK);
  zetKeuze({ ...kz, week });
  return week;
}
// De kaarten van de week, voor de Hofschilder (woord met uitleg en beeld).
function weekKaarten() {
  if (!aan()) return [];
  return kaartenVan(keuze().week);
}

// ---------- Aangebracht + terugmelden ----------

function zetMelden(aanzetten) {
  settings.write({ inbeeldMelden: !!aanzetten });
}

// De klas zag de kaart op het bord. Hier onthouden, en (als het mag) aan In Beeld melden: alleen kaart en leerjaar.
function aangebracht(nr, lj) {
  const d = data();
  const k = d.kaarten[kort(nr, 12)];
  if (!k) throw new Error('Die kaart staat niet meer op deze pc.');
  const l = leerjaar(lj);
  if (!l) throw new Error('Kies eerst het leerjaar.');
  const lijst = d.aangebracht[k.nr] || (d.aangebracht[k.nr] = []);
  const dag = new Date().toISOString().slice(0, 10);
  // Dezelfde kaart dezelfde dag nog eens tonen (herhalen) telt niet opnieuw.
  if (!lijst.some(a => a.lj === l && a.dag === dag)) {
    lijst.push({ lj: l, dag });
    if (settings.read().inbeeldMelden !== false && k.set !== VOORBEELD.id) d.wachtrij.push(melding(k.nr, l));
  }
  bewaar();
  stuurWachtrij();
  return lijst.map(a => a.lj);
}

// Precies dit gaat naar het internet, niets meer.
const melding = (nr, lj) => ({ kaart: nr, leerjaar: lj });

let bezig = false;
async function stuurWachtrij() {
  const d = data();
  if (bezig || !d.wachtrij.length || settings.read().inbeeldMelden === false) return;
  bezig = true;
  try {
    while (d.wachtrij.length) {
      const m = d.wachtrij[0];
      const res = await fetch(`${bron()}/aangebracht`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(melding(m.kaart, m.leerjaar)), signal: AbortSignal.timeout(10000),
      });
      // Een fout van In Beeld zelf (bv. nog niet klaar): niet blijven proberen met deze melding.
      if (!res.ok && res.status >= 500) break;
      d.wachtrij.shift();
    }
  } catch {
    // Geen internet: de volgende keer.
  } finally {
    bezig = false;
    try { bewaar(); } catch {}
  }
}

// ---------- Woorden van de week (Runenraadsel) ----------

// Het Runenraadsel kan alleen woorden van 4 tot 7 letters zonder spaties: de andere kaarten worden overgeslagen.
function naarRunen(nrs, runen) {
  const kaarten = kaartenVan(nrs);
  if (!kaarten.length) throw new Error('Kies eerst een of meer kaarten.');
  const l = runen.lijstView();
  const bestaand = new Set(l.woorden.map(x => x.w));
  const regels = [];
  const over = [];
  for (const k of kaarten) {
    const w = runen.normaal(k.woord);
    if (!/^[\p{L}]+$/u.test(k.woord) || w.length < 4 || w.length > 7) { over.push(metLidwoord(k)); continue; }
    if (bestaand.has(w)) continue;
    bestaand.add(w);
    regels.push(`${w} = ${k.uitleg.replace(/[|=]/g, ' ')} | ${k.zin.replace(/[|=]/g, ' ')}`);
  }
  const doel = l.doel || (kaarten.find(k => k.doelen.length) || { doelen: [''] }).doelen[0];
  if (regels.length) runen.bewaarLijst({ text: [l.text, ...regels].filter(Boolean).join('\n'), doel });
  zetWeek([...new Set([...keuze().week, ...kaarten.map(k => k.nr)])]);
  return { erbij: regels.length, overgeslagen: over };
}

// ---------- Quiz ----------

const schud = (a, rnd = Math.random) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};
const korter = (t, max = 120) => (t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);
// Het woord in de voorbeeldzin vervangen door een streep (ook met een hoofdletter aan het begin van de zin).
function gatenZin(k) {
  if (!k.zin) return '';
  const esc = k.woord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}])${esc}(?![\\p{L}])`, 'iu');
  if (!re.test(k.zin)) return '';
  return k.zin.replace(re, '$1___');
}

// Een quiz uit een kaartenset: per kaart drie soorten vragen (wat betekent het, wie ben ik, welk woord past in de zin),
// elk met het doel van de kaart. Zo werkt hij in alle Arena-spellen, Het Rijk en de taken.
function maakQuiz(nrs, titel, rnd = Math.random, lj = '') {
  const l = leerjaar(lj) || String(require('./klas').read().leerjaar || '');
  // Het doel van de kaart voor het leerjaar van de klas (2.1.GL4.3 hoort bij het 4e leerjaar), anders het eerste.
  const doelVoor = k => k.doelen.find(c => new RegExp(`\\.[GPS+A](L${l}|${l === 'JK' ? 'JK' : l})\\.`).test(c)) || k.doelen[0] || '';
  const kaarten = kaartenVan(nrs);
  if (kaarten.length < 4) throw new Error('Kies minstens 4 kaarten: de andere kaarten worden de foute antwoorden.');
  const vragen = [];
  const anders = (k, veld) => schud(kaarten.filter(x => x !== k && x[veld] && x[veld] !== k[veld]), rnd).slice(0, 3);
  const meerkeuze = (vraag, juist, fout, k, extra = {}) => {
    const answers = schud([juist, ...fout], rnd);
    const q = { question: korter(vraag, 250), answers, correct: answers.indexOf(juist), time: 30, ...extra };
    const doel = doelVoor(k);
    if (doel) q.doel = doel;
    vragen.push(q);
  };
  for (const k of kaarten) {
    const woord = metLidwoord(k);
    // 1. Wat betekent ...? (kies de uitleg)
    const f1 = anders(k, 'uitleg');
    if (f1.length >= 2) meerkeuze(`Wat betekent "${woord}"?`, korter(k.uitleg), f1.map(x => korter(x.uitleg)), k, { uitleg: korter(`${woord}: ${k.uitleg}`, 220) });
    // 2. Wie ben ik? (kies het woord bij de uitleg)
    const f2 = anders(k, 'woord');
    if (f2.length >= 2) meerkeuze(`Wie ben ik? ${k.uitleg}`, woord, f2.map(metLidwoord), k, { uitleg: k.zin ? korter(k.zin, 220) : '' });
    // 3. Welk woord past in de zin?
    const gat = gatenZin(k);
    if (gat && f2.length >= 2) meerkeuze(`Welk woord past? ${gat}`, k.woord, f2.map(x => x.woord), k, { uitleg: korter(k.zin, 220) });
  }
  for (const q of vragen) if (!q.uitleg) delete q.uitleg;
  return { title: kort(titel, 100) || `In Beeld: ${kaarten.slice(0, 3).map(metLidwoord).join(', ')}${kaarten.length > 3 ? '…' : ''}`, questions: schud(vragen, rnd).slice(0, 100) };
}

// ---------- LANcelot Junior ----------

// Junior: woorden van de week voor het raadsel van vandaag (woord = betekenis). Voor kleuters: alleen de eerste zin van de uitleg.
function naarJuniorWoorden(nrs, junior) {
  const kaarten = kaartenVan(nrs);
  if (!kaarten.length) throw new Error('Kies eerst een of meer kaarten.');
  const nu = junior.woorden();
  const lijst = [...nu, ...kaarten.map(k => ({ w: metLidwoord(k), b: korter((k.uitleg.match(/^[^.!?]+[.!?]?/) || [k.uitleg])[0], 80) }))];
  return junior.zetWoorden(lijst);
}

// Junior: een reeks "Waar is ...?" met drie beelden van kaarten om uit te kiezen (wordt voorgelezen op de tablet).
// De beelden gaan naar de fotomap van Junior, zodat de reeks ook werkt als de kaarten hier later weg zijn.
function naarJuniorReeks(nrs, junior, jrFoto, publicDir) {
  const kaarten = kaartenVan(nrs).filter(k => k.beeld);
  if (kaarten.length < 3) throw new Error('Kies minstens 3 kaarten met een beeld.');
  const foto = k => {
    const f = k.beeld.startsWith('/img/') ? path.join(publicDir, ...k.beeld.split('/').filter(Boolean)) : beeldBestand(k.beeld.split('/').pop());
    if (!f || !fs.existsSync(f)) return null;
    const buf = fs.readFileSync(f);
    return jrFoto.bewaar(buf, `image/${path.extname(f).slice(1).replace('jpg', 'jpeg')}`);
  };
  const fotos = new Map(kaarten.map(k => [k.nr, foto(k)]));
  const met = kaarten.filter(k => fotos.get(k.nr));
  if (met.length < 3) throw new Error('Kies minstens 3 kaarten met een beeld.');
  const vragen = met.slice(0, 20).map(k => {
    const fout = schud(met.filter(x => x !== k)).slice(0, 2);
    // Zonder woord onder het beeld: het kind moet het beeld herkennen, niet het woord lezen.
    const opties = schud([k, ...fout]).map(x => ({ f: fotos.get(x.nr), fb: 'In Beeld' }));
    return { vraag: `Waar is ${metLidwoord(k)}?`, opties, juist: opties.findIndex(o => o.f === fotos.get(k.nr)) };
  });
  const naam = kort(`In Beeld: ${met.slice(0, 2).map(x => x.woord).join(', ')}${met.length > 2 ? '…' : ''}`, 40);
  return junior.bewaarSet({ id: `ib-${Date.now().toString(36)}`, naam, vragen, map: 'In Beeld' });
}

module.exports = {
  aan, view, online, haalSet, wisSet, beeldBestand, zetWeek, weekKaarten, zetMelden, aangebracht, stuurWachtrij,
  naarRunen, maakQuiz, naarJuniorWoorden, naarJuniorReeks, schoonKaart, leerjaar, keuzeGeldig, uitLesmap, melding, metLidwoord,
  LEERJAREN, BRON, VOORBEELD,
  get LESMAP_DIR() { return LESMAP_DIR(); },
  _reset() { cache = null; },
};
