// Het Runenraadsel: elke dag een geheim woord om te raden, in zes pogingen.
// Page raadt 4 letters (met de betekenis als hulp), Schildknaap 5, Ridder 6 of 7. Na afloop: betekenis en voorbeeldzin.
// Leerlingen spelen het wanneer ze willen, naast de gewone spellen. Het woord zelf gaat pas naar de gsm als het raadsel klaar is.
// Wie het kraakt verdient runen; met genoeg runen krijgt je ridder een runenkrans (avatar-sleutel 'runen').
// Alles staat in de map runen/ (in .gitignore): één bestand per schooljaar en de woorden van de week van de leerkracht.
const fs = require('fs');
const path = require('path');
const klas = require('./klas');
const logboek = require('./logboek');
const doelen = require('./doelen');
const niveaus = require('./niveaus');
const ingebouwd = require('./runen-woorden');

const DIR = path.join(__dirname, '..', 'runen');
const LIJST = path.join(DIR, 'weeklijst.json');
const POGINGEN = 6;
const LEVELS = {
  page: { lens: [4], woorden: ingebouwd.PAGE },
  schildknaap: { lens: [5], woorden: ingebouwd.SCHILDKNAAP },
  ridder: { lens: [6, 7], woorden: ingebouwd.RIDDER },
};
const NIVEAUS = Object.keys(LEVELS);
// Schildknaap krijgt de betekenis als hulp na 4 foute pogingen; Page vanaf het begin; Ridder nooit.
const HULP_NA = { page: 0, schildknaap: 4, ridder: Infinity };
// Runenkrans voor je ridder: vanaf zoveel runen.
const KRANS = [0, 5, 15, 30, 50];
const KRANS_NAMEN = ['Geen krans', 'Runengloed', 'Zilveren runen', 'Gouden runen', 'Sterrenrunen'];
// Klasdoel: zoveel deel van de klas kraakt het raadsel, dan krijgt iedereen die het kraakte een rune extra.
const KLASDOEL = 0.8;
// Een ingebouwd woord komt pas na zoveel klasdagen terug.
const NIET_HERHALEN = 80;
// Woordenschatdoel van het 6e leerjaar: actief nieuwe woordbetekenissen zoeken.
const DOEL_6 = '1.5.GL6.3';

// ---------- Woordenlijst (om te controleren of een poging een bestaand woord is) ----------

let woordenlijst = null;
function bestaat(w) {
  if (!woordenlijst) {
    try {
      woordenlijst = new Set(fs.readFileSync(path.join(__dirname, 'woordenlijst.txt'), 'utf8').split('\n'));
    } catch {
      woordenlijst = new Set();
    }
    for (const l of Object.values(LEVELS)) for (const [w] of l.woorden) woordenlijst.add(w);
  }
  return woordenlijst.has(w) || lijst().woorden.some(x => x.w === w);
}

// Hoofdletters, accenten en spaties eruit: "Ruïne" wordt "ruine".
function normaal(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// ---------- Opslag ----------

function dagVan(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

const jaarFile = sj => path.join(DIR, `${sj}.json`);
let data = null; // { schooljaar, dagen: { 'YYYY-MM-DD': { woorden: { page: {w,b,z,eigen} }, spelers: { key: { naam, eigen, niveaus: { page: { p: [...], klaar, ok } } } } } } }
let saveTimer = null;

function jaar(now = new Date()) {
  const sj = logboek.schooljaar(now);
  if (data && data.schooljaar === sj) return data;
  if (data) flush();
  try {
    data = JSON.parse(fs.readFileSync(jaarFile(sj), 'utf8'));
    if (!data || typeof data.dagen !== 'object') throw new Error();
  } catch {
    data = { schooljaar: sj, dagen: {} };
  }
  data.schooljaar = sj;
  return data;
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!data) return;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const f = jaarFile(data.schooljaar);
    fs.writeFileSync(f + '.tmp', JSON.stringify(data));
    fs.renameSync(f + '.tmp', f);
  } catch (err) {
    console.error('Runenraadsel bewaren mislukt:', err.message);
  }
}

function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 1500);
}
process.on('exit', flush);

// ---------- Woorden van de week (van de leerkracht) ----------

let lijstCache = null;
function lijst() {
  if (lijstCache) return lijstCache;
  try {
    const l = JSON.parse(fs.readFileSync(LIJST, 'utf8'));
    lijstCache = { woorden: Array.isArray(l.woorden) ? l.woorden : [], doel: doelen.clean(l.doel) };
  } catch {
    lijstCache = { woorden: [], doel: '' };
  }
  return lijstCache;
}

// Tekst van de leerkracht: één woord per regel, eventueel "woord = betekenis | voorbeeldzin".
function leesLijst(text) {
  const woorden = [];
  const fout = [];
  for (const regel of String(text || '').split(/\r?\n/)) {
    if (!regel.trim()) continue;
    const [kop, ...rest] = regel.split('=');
    const [b = '', z = ''] = rest.join('=').split('|');
    const w = normaal(kop);
    if (w.length < 4 || w.length > 7) fout.push(kop.trim());
    else if (!woorden.some(x => x.w === w)) woorden.push({ w, b: b.trim().slice(0, 200), z: z.trim().slice(0, 200) });
  }
  if (fout.length) throw new Error(`Deze woorden passen niet (4 tot 7 letters, zonder spaties of cijfers): ${fout.slice(0, 6).join(', ')}`);
  if (woorden.length > 60) throw new Error('Hooguit 60 woorden tegelijk.');
  return woorden;
}

function bewaarLijst({ text, doel } = {}) {
  const l = { woorden: leesLijst(text), doel: doelen.clean(doel) };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(LIJST + '.tmp', JSON.stringify(l, null, 1));
  fs.renameSync(LIJST + '.tmp', LIJST);
  lijstCache = l;
  return lijstView();
}

function lijstView() {
  const l = lijst();
  const gebruikt = gebruikteWoorden();
  return {
    doel: l.doel,
    text: l.woorden.map(x => x.w + (x.b || x.z ? ` = ${x.b}${x.z ? ` | ${x.z}` : ''}` : '')).join('\n'),
    woorden: l.woorden.map(x => ({ ...x, niveau: niveauVanLengte(x.w.length), gebruikt: gebruikt.has(x.w) })),
  };
}

const niveauVanLengte = n => NIVEAUS.find(k => LEVELS[k].lens.includes(n));

function gebruikteWoorden() {
  const set = new Set();
  for (const d of Object.values(jaar().dagen)) for (const x of Object.values(d.woorden || {})) set.add(x.w);
  return set;
}

// De AI noemt de velden niet altijd hetzelfde ("betekenis", "uitleg", "meaning", "voorbeeldzin"...) en zet er
// soms een lidwoord bij ("het kompas"). Daarom zoeken we de velden op hun naam en het woord ook binnenin.
function aiItems(res) {
  const lijst = Array.isArray(res) ? res : Object.values(res || {}).find(Array.isArray) || [];
  return lijst.filter(r => r && typeof r === 'object').map(r => {
    const veld = re => String(Object.entries(r).find(([k, v]) => re.test(k) && typeof v === 'string')?.[1] || '').trim().slice(0, 200);
    return { woord: veld(/^(woord|word|term)$/i) || veld(/woord|word/i), b: veld(/betek|uitleg|mean|defin|omschr/i), z: veld(/zin|sentence|voorbeeld|example/i) };
  });
}

const aiVraag = (raw, aiJson) => aiJson.extract(raw, 'woordenlijst', d => aiItems(d).length > 0);
const lijstTekst = woorden => woorden.map(x => `${x.w}${x.b || x.z ? ` = ${x.b} | ${x.z}` : ''}`).join('\n');
const voorWie = () => {
  const lj = klas.read().leerjaar;
  return `Je helpt een leerkracht in Vlaanderen (${typeof lj === 'number' ? `${lj}e leerjaar` : 'kleuterklas'}). Gebruik Belgisch-Nederlands.`;
};
const UITLEG = 'een korte, eenvoudige betekenis (hooguit 15 woorden, zonder het woord zelf te gebruiken) en één voorbeeldzin die een kind van die leeftijd begrijpt';

// Betekenissen en voorbeeldzinnen die nog ontbreken laten aanvullen door Gemini.
async function vulAan(text, gemini, aiJson) {
  const woorden = leesLijst(text);
  const open = woorden.filter(x => !x.b || !x.z);
  if (!open.length) return { text: lijstTekst(woorden), aangevuld: 0 };
  const prompt = `${voorWie()}
Geef voor elk woord hieronder ${UITLEG}.
Antwoord enkel met JSON, met precies deze sleutels: {"woorden":[{"woord":"kompas","betekenis":"...","zin":"..."}]}
Woorden: ${open.map(x => x.w).join(', ')}`;
  const items = aiItems(await gemini.generateQuiz(prompt, [], raw => aiVraag(raw, aiJson)));
  let aangevuld = 0;
  open.forEach((x, i) => {
    // Eerst exact, dan "het kompas", en anders op volgorde (de AI antwoordt in dezelfde volgorde).
    const r = items.find(y => normaal(y.woord) === x.w) || items.find(y => normaal(y.woord).includes(x.w))
      || (items.length === open.length && !normaal(items[i].woord) ? items[i] : null);
    if (!r || (!r.b && !r.z)) return;
    if (!x.b) x.b = r.b;
    if (!x.z) x.z = r.z;
    aangevuld++;
  });
  if (!aangevuld) throw new Error('Gemini gaf geen bruikbare betekenissen terug. Probeer het nog eens.');
  return { text: lijstTekst(woorden), aangevuld, open: open.length };
}

// Een woordenlijst rond een thema: een week woorden voor elk niveau, met betekenis en voorbeeldzin.
// Ze komen onder wat er al staat; woorden die er al staan of niet passen vallen weg.
async function maakLijst(thema, text, gemini, aiJson) {
  thema = String(thema || '').trim().slice(0, 120);
  if (!thema) throw new Error('Typ eerst een thema, bijvoorbeeld "de middeleeuwen" of "het weer".');
  const woorden = String(text || '').trim() ? leesLijst(text) : [];
  const prompt = `${voorWie()}
Maak een woordenlijst rond het thema "${thema}" voor een woordraadspel. Kies bestaande, nuttige Nederlandse woorden (zelfstandige naamwoorden, werkwoorden of bijvoeglijke naamwoorden in hun gewone vorm), zonder spaties, koppeltekens of hoofdletters.
Geef 7 woorden van precies 4 letters, 7 woorden van precies 5 letters en 7 woorden van 6 of 7 letters. Tel de letters goed na.
Geef bij elk woord ${UITLEG}.
Antwoord enkel met JSON, met precies deze sleutels: {"woorden":[{"woord":"...","betekenis":"...","zin":"..."}]}`;
  const items = aiItems(await gemini.generateQuiz(prompt, [], raw => aiVraag(raw, aiJson)));
  const per = Object.fromEntries(NIVEAUS.map(n => [n, 0]));
  let nieuw = 0;
  for (const r of items) {
    const w = normaal(r.woord);
    const n = niveauVanLengte(w.length);
    // Een week (5 dagen) per niveau, en hooguit 60 woorden in totaal.
    if (!n || per[n] >= 5 || woorden.length >= 60 || /\s/.test(r.woord.trim()) || woorden.some(x => x.w === w)) continue;
    woorden.push({ w, b: r.b, z: r.z });
    per[n]++;
    nieuw++;
  }
  if (!nieuw) throw new Error('Gemini gaf geen woorden die passen. Probeer het nog eens of kies een ander thema.');
  return { text: lijstTekst(woorden), nieuw, per };
}

// ---------- Het woord van de dag ----------

// Een vaste, gemengde volgorde van de ingebouwde woorden (elk jaar dezelfde), zodat het niet alfabetisch gaat.
function gemengd(list, seed) {
  const out = list.slice();
  let h = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dagRecord(dag) {
  const j = jaar();
  if (!j.dagen[dag]) j.dagen[dag] = { woorden: {}, spelers: {} };
  return j.dagen[dag];
}

function woordVan(dag, niveau) {
  const rec = dagRecord(dag);
  if (rec.woorden[niveau]) return rec.woorden[niveau];
  const lens = LEVELS[niveau].lens;
  const gebruikt = gebruikteWoorden();
  // Eerst de woorden van de week, in de volgorde van de leerkracht.
  let keuze = lijst().woorden.find(x => lens.includes(x.w.length) && !gebruikt.has(x.w));
  if (keuze) keuze = { ...keuze, eigen: true };
  else {
    // Anders een ingebouwd woord dat de laatste tijd niet aan bod kwam.
    const recent = new Set();
    const dagen = Object.keys(jaar().dagen).filter(d => d < dag).sort().slice(-NIET_HERHALEN);
    for (const d of dagen) for (const x of Object.values(jaar().dagen[d].woorden || {})) recent.add(x.w);
    const lijstje = gemengd(LEVELS[niveau].woorden, niveau.length * 7919);
    const start = Math.floor(Date.parse(dag) / 864e5) % lijstje.length;
    for (let i = 0; i < lijstje.length && !keuze; i++) {
      const [w, b, z] = lijstje[(start + i) % lijstje.length];
      if (!recent.has(w)) keuze = { w, b, z };
    }
    if (!keuze) {
      const [w, b, z] = lijstje[start];
      keuze = { w, b, z };
    }
  }
  rec.woorden[niveau] = keuze;
  save();
  return keuze;
}

// Kleuren van een poging: g = juiste plaats, o = zit erin maar elders, x = zit er niet in (of niet zo vaak).
function kleur(poging, woord) {
  const out = Array(poging.length).fill('x');
  const over = {};
  for (let i = 0; i < woord.length; i++) {
    if (poging[i] === woord[i]) out[i] = 'g';
    else over[woord[i]] = (over[woord[i]] || 0) + 1;
  }
  for (let i = 0; i < poging.length; i++) {
    if (out[i] === 'g') continue;
    if (over[poging[i]]) {
      out[i] = 'o';
      over[poging[i]]--;
    }
  }
  return out.join('');
}

// ---------- Leerlingen ----------

function wie(naam) {
  const n = String(naam || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!n) return null;
  const l = klas.match(n);
  return { key: l ? `id:${l.id}` : `n:${n.toLowerCase()}`, naam: l ? l.naam : n, eigen: (l && niveaus.clean(l.niveau)) || 'schildknaap' };
}

// Runen, reeks en wat er vandaag al verdiend is, uit alle dagen van dit schooljaar.
function telling(key, vandaag = dagVan()) {
  const j = jaar();
  const dagen = Object.keys(j.dagen).filter(d => Object.keys(j.dagen[d].spelers || {}).length).sort();
  let runen = 0;
  let reeks = 0;
  let besteReeks = 0;
  let vandaagRunen = [];
  for (const d of dagen) {
    const s = j.dagen[d].spelers[key];
    const verdiend = [];
    const hoofd = s && hoofdOpgelost(s);
    if (s) {
      for (const n of NIVEAUS) {
        const lv = s.niveaus[n];
        if (!lv || !lv.ok) continue;
        if (n === hoofd) {
          verdiend.push({ wat: `${niveaus.NAMES[n]} gekraakt`, n: 2 });
          if (lv.p.length <= 3) verdiend.push({ wat: `In ${lv.p.length} ${lv.p.length === 1 ? 'poging' : 'pogingen'}`, n: 1 });
        } else {
          verdiend.push({ wat: `Ook ${niveaus.NAMES[n]} gekraakt`, n: 1 });
        }
      }
    }
    if (hoofd) {
      reeks++;
      if (reeks % 5 === 0) verdiend.push({ wat: `Reeks van ${reeks} dagen`, n: 2 });
      if (klasdoel(d).gehaald) verdiend.push({ wat: 'Klasdoel gehaald', n: 1 });
    } else if (d !== vandaag) {
      reeks = 0; // een klasdag gemist; vandaag kan nog
    }
    besteReeks = Math.max(besteReeks, reeks);
    runen += verdiend.reduce((t, v) => t + v.n, 0);
    if (d === vandaag) vandaagRunen = verdiend;
  }
  return { runen, reeks, besteReeks, vandaag: vandaagRunen };
}

// Het niveau dat telt voor de hoofdbeloning: je eigen niveau of hoger, het eerste dat je kraakte.
function hoofdOpgelost(s) {
  const min = NIVEAUS.indexOf(s.eigen || 'schildknaap');
  return NIVEAUS.find((n, i) => i >= min && s.niveaus[n] && s.niveaus[n].ok) || null;
}

function klasdoel(dag) {
  const rec = jaar().dagen[dag];
  const spelers = rec ? Object.values(rec.spelers || {}) : [];
  const gekraakt = spelers.filter(hoofdOpgelost).length;
  const leerlingen = klas.read().leerlingen.length;
  const totaal = leerlingen >= 3 ? leerlingen : Math.max(3, spelers.length);
  const nodig = Math.ceil(totaal * KLASDOEL);
  return { gekraakt, nodig, totaal, gehaald: gekraakt >= nodig };
}

const krans = runen => KRANS.reduce((lv, min, i) => (runen >= min ? i : lv), 0);

function kransView(runen) {
  const lv = krans(runen);
  return {
    niveau: lv,
    naam: KRANS_NAMEN[lv],
    volgende: lv + 1 < KRANS.length ? { naam: KRANS_NAMEN[lv + 1], runen: KRANS[lv + 1] } : null,
    drempels: KRANS,
    namen: KRANS_NAMEN,
  };
}

// Hoeveel runenkrans een leerling mag dragen (voor de ridder).
function kransVan(naam) {
  const w = wie(naam);
  return w ? krans(telling(w.key).runen) : 0;
}

function levelView(dag, niveau, lv) {
  const x = woordVan(dag, niveau);
  const p = lv ? lv.p : [];
  const klaar = !!(lv && lv.klaar);
  const fout = p.filter(w => w !== x.w).length;
  return {
    lengte: x.w.length,
    pogingen: p.map(w => ({ w, k: kleur(w, x.w) })),
    max: POGINGEN,
    status: !lv || !p.length ? 'nieuw' : lv.ok ? 'opgelost' : klaar ? 'mislukt' : 'bezig',
    // De betekenis als hulp: Page meteen, Schildknaap na 4 foute pogingen. Na afloop krijgt iedereen alles.
    hulp: klaar || fout >= HULP_NA[niveau] ? (x.b || '') : '',
    hulpNa: Number.isFinite(HULP_NA[niveau]) ? HULP_NA[niveau] : null,
    ...(klaar ? { woord: x.w, betekenis: x.b || '', zin: x.z || '' } : {}),
  };
}

function view(naam) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  const dag = dagVan();
  const rec = dagRecord(dag);
  const s = rec.spelers[w.key];
  const t = telling(w.key, dag);
  const levels = {};
  for (const n of NIVEAUS) levels[n] = levelView(dag, n, s && s.niveaus[n]);
  return {
    dag,
    naam: w.naam,
    eigen: (s && s.eigen) || w.eigen,
    levels,
    runen: t.runen,
    reeks: t.reeks,
    vandaag: t.vandaag,
    krans: kransView(t.runen),
    klasdoel: klasdoel(dag),
  };
}

// Eén poging. Geeft de nieuwe stand terug, of een foutmelding als het woord niet bestaat.
function raad({ naam, niveau, woord } = {}) {
  const w = wie(naam);
  if (!w) throw new Error('Kies eerst je naam.');
  if (!LEVELS[niveau]) throw new Error('Kies Page, Schildknaap of Ridder.');
  const dag = dagVan();
  const x = woordVan(dag, niveau);
  const poging = normaal(woord);
  if (poging.length !== x.w.length) throw new Error(`Het woord heeft ${x.w.length} letters.`);
  if (poging !== x.w && !bestaat(poging)) throw Object.assign(new Error('Dat woord kent LANcelot niet. Probeer een ander bestaand woord.'), { onbekend: true });
  const rec = dagRecord(dag);
  const s = rec.spelers[w.key] || (rec.spelers[w.key] = { naam: w.naam, eigen: w.eigen, niveaus: {} });
  s.naam = w.naam;
  const lv = s.niveaus[niveau] || (s.niveaus[niveau] = { p: [], klaar: false, ok: false });
  if (lv.klaar) throw new Error('Dit raadsel is voor vandaag al klaar.');
  if (lv.p.includes(poging)) throw Object.assign(new Error('Dat woord probeerde je al.'), { onbekend: true });
  const voor = telling(w.key, dag).runen;
  lv.p.push(poging);
  if (poging === x.w) lv.ok = lv.klaar = true;
  else if (lv.p.length >= POGINGEN) lv.klaar = true;
  save();
  if (lv.klaar) {
    // In het logboek, onder woordenschat: elk raadsel van elke dag is een eigen sessie, zodat het lopende spel niet gestoord wordt.
    const doel = x.eigen ? lijst().doel : (klas.read().leerjaar === 6 && doelen.find(DOEL_6) ? DOEL_6 : '');
    logboek.add([{
      sessie: `runen-${dag}`,
      naam: w.naam,
      spel: 'Runenraadsel',
      bron: `Runenraadsel ${dag}`,
      vraag: `${niveaus.NAMES[niveau]}: raad het woord "${x.w}"`,
      doel,
      juist: lv.ok,
    }]);
  }
  const v = view(naam);
  v.nieuweRunen = v.runen - voor;
  return v;
}

// ---------- Het bord ----------

function bord() {
  const dag = dagVan();
  const rec = dagRecord(dag);
  const perNiveau = {};
  for (const n of NIVEAUS) {
    const x = woordVan(dag, n);
    perNiveau[n] = { lengte: x.w.length, eigen: !!x.eigen, spelers: [] };
  }
  for (const [key, s] of Object.entries(rec.spelers)) {
    for (const n of NIVEAUS) {
      const lv = s.niveaus[n];
      if (!lv || !lv.p.length) continue;
      const x = rec.woorden[n];
      perNiveau[n].spelers.push({
        naam: s.naam,
        eigen: (s.eigen || 'schildknaap') === n,
        rijen: lv.p.map(w => kleur(w, x.w)), // alleen kleuren, nooit letters
        status: lv.ok ? 'opgelost' : lv.klaar ? 'mislukt' : 'bezig',
        key,
      });
    }
  }
  for (const n of NIVEAUS) {
    perNiveau[n].spelers.sort((a, b) => (a.status === 'opgelost' ? 0 : 1) - (b.status === 'opgelost' ? 0 : 1) || a.rijen.length - b.rijen.length || a.naam.localeCompare(b.naam, 'nl'));
    for (const p of perNiveau[n].spelers) delete p.key;
  }
  // Ranglijst over het hele schooljaar: wie speelde ooit mee?
  const keys = new Map();
  for (const d of Object.values(jaar().dagen)) for (const [k, s] of Object.entries(d.spelers || {})) keys.set(k, s.naam);
  const rang = [...keys].map(([k, naam]) => {
    const t = telling(k, dag);
    return { naam, runen: t.runen, reeks: t.reeks, krans: krans(t.runen) };
  }).filter(r => r.runen > 0).sort((a, b) => b.runen - a.runen || b.reeks - a.reeks || a.naam.localeCompare(b.naam, 'nl')).slice(0, 12);
  return { dag, perNiveau, klasdoel: klasdoel(dag), rang, weeklijst: lijst().woorden.length };
}

// De woorden van vandaag, voor de onthulling op het bord.
function onthul() {
  const dag = dagVan();
  const out = {};
  for (const n of NIVEAUS) {
    const x = woordVan(dag, n);
    out[n] = { woord: x.w, betekenis: x.b || '', zin: x.z || '' };
  }
  return { dag, woorden: out };
}

module.exports = { view, raad, bord, onthul, kransVan, bewaarLijst, lijstView, vulAan, maakLijst, kleur, normaal, dagVan, flush, DIR, KRANS, KRANS_NAMEN };
