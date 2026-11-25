// De connector voor Claude (en andere AI-assistenten): wat een assistent rechtstreeks in LANcelot kan lezen en doen,
// zonder op het scherm te klikken. Elke functie hier is één "tool" van de MCP-server (src/connector.js) en ook een
// gewone JSON-route (POST /api/v1/<naam>). De teksten in dit bestand zijn voor de assistent, niet voor een scherm.
//
// Afspraken (wens 25 nov):
// - Niets definitief verwijderen. Een taak intrekken = afsluiten (het werk blijft); een toets bijwerken die al
//   gegeven werd, geeft een nieuwe versie (de oude en het werk van de leerlingen blijven).
// - Nooit een sleutel of wachtwoord teruggeven (gezondheid toont enkel of iets ingesteld is).
// - Schrijven kan alleen als de leerkracht "Mag ook klaarzetten" aanzette (anders alleen lezen).
const fs = require('fs');
const path = require('path');
const klas = require('./klas');
const taken = require('./taken');
const proeven = require('./proeven');
const kronieken = require('./kronieken');
const takenstandaard = require('./takenstandaard');
const stem = require('./stem');
const gegevens = require('./gegevens');
const toetscontrole = require('./toetscontrole');
const K = proeven.K;

const PRESENTATIES = 'Dagpresentaties';
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const VANAF = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Wat server.js na een wijziging moet doen (het bord bijwerken, Mijn lesmap...). Zie init().
let hooks = { naTaken() {}, naToetsen() {}, naKronieken() {}, naBib() {}, rondeTafel: () => null, syncNu: async () => ({ ingesteld: false }), gezondheid: () => ({}) };
function init(h) { hooks = { ...hooks, ...h }; }

const fout = msg => { throw new Error(msg); };
const sleutel = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const dag = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const vandaag = () => dag(Date.now());
const procent = (p, m) => (m ? Math.round((p / m) * 1000) / 10 : null);

// ---------- Hulp ----------

// De namen uit de vraag, zoals ze op de klaslijst staan. Een onbekende naam is een fout (geen gokwerk).
function leerlingen(namen, heleKlas) {
  const lijst = klas.read().leerlingen;
  if (heleKlas) return lijst.filter(l => !l.gast).map(l => l.naam);
  if (!Array.isArray(namen) || !namen.length) fout('Geef "namen" (een lijst leerlingen) of "hele_klas": true.');
  const uit = [];
  const onbekend = [];
  for (const n of namen) {
    const l = klas.match(n);
    if (l) { if (!uit.includes(l.naam)) uit.push(l.naam); } else onbekend.push(String(n));
  }
  if (onbekend.length) fout(`Deze namen staan niet op de klaslijst: ${onbekend.join(', ')}. Vraag de lijst op met de tool "klas".`);
  return uit;
}

function toetsBestaat(file) {
  if (typeof file !== 'string' || !file) fout('Geef "file" (de bestandsnaam van de toets, zie de tool "toetsen").');
  if (!fs.existsSync(path.join(proeven.DIR, path.basename(file)))) fout(`De toets "${file}" bestaat niet.`);
  return path.basename(file);
}

function toetsUit(toets) {
  let t = toets;
  if (typeof t === 'string') {
    try { t = JSON.parse(t); } catch { return proeven.parseAiText(t); }
  }
  return K.validate(t);
}

// Een map (bv. "Archief/Wiskunde/2026-11") in de bibliotheek, met de mappen erboven. Bestaat ze al, dan die.
function mapMaken(lib, pad) {
  const delen = String(pad || '').split('/').map(s => s.trim()).filter(Boolean);
  let ouder = '';
  for (const d of delen) {
    const vol = ouder ? `${ouder}/${d}` : d;
    const er = lib.folders().find(f => f.toLowerCase() === vol.toLowerCase());
    if (er) { ouder = er; continue; }
    lib.addFolder(d, ouder);
    ouder = lib.folders().find(f => f.toLowerCase() === vol.toLowerCase()) || vol;
  }
  return ouder;
}

const isGegeven = file => {
  const item = proeven.list().find(x => x.file === file);
  return !!(item && item.gegeven && item.gegeven.length) || taken.lijst().some(t => t.soort === 'proef' && t.file === file);
};

// De afname (resultaten) van een taak of een afname-bestand.
function afnameVan({ taak_id, afname } = {}) {
  if (afname) return proeven.laadAfname(path.basename(String(afname)));
  if (!taak_id) fout('Geef "taak_id" (zie de tool "taken") of "afname" (zie de tool "afnames").');
  const t = taken.lijst().find(x => x.id === taak_id);
  if (!t) fout(`De taak "${taak_id}" bestaat niet (meer).`);
  if (t.soort !== 'proef') fout('Deze taak is geen toets. De stand per leerling staat in de tool "taken".');
  const a = t.afname || (proeven.afnameVanTaak(taak_id) || {}).file;
  if (!a) return null;
  return proeven.laadAfname(a);
}

function vraagTekst(q) {
  return String(q.vraag || q.titel || q.tekst || K.NAMES[q.type] || q.type || '').replace(/\s+/g, ' ').slice(0, 200);
}

// ---------- Lezen ----------

function gezondheid() {
  const s = stem.view();
  const kl = klas.read();
  const lijst = taken.lijst();
  return {
    ...hooks.gezondheid(),
    klas: { naam: kl.naam, leerjaar: kl.leerjaar, leerlingen: kl.leerlingen.filter(l => !l.gast).length, actief: gegevens.actieveKlas ? gegevens.actieveKlas() : undefined },
    taken: { open: lijst.filter(t => !t.dicht && !t.vanaf).length, gepland: lijst.filter(t => t.vanaf && !t.dicht).length },
    voorlezen: {
      dienst: s.dienst || 'toestel', aan: !!s.aan, sleutel_ingesteld: !!(s.dienst && s.diensten && s.diensten[s.dienst] && s.diensten[s.dienst].heeftSleutel),
      tekens_deze_maand: s.tekens, grens: s.grens, maand: s.maand, laatste_fout: s.fout || null,
    },
  };
}

function klasInfo() {
  const kl = klas.read();
  return {
    naam: kl.naam, leerjaar: kl.leerjaar,
    leerlingen: kl.leerlingen.map(l => ({ naam: l.naam, niveau: l.niveau || 'schildknaap', ...(l.niveaus && Object.keys(l.niveaus).length ? { niveaus_per_vak: l.niveaus } : {}), ...(l.gast ? { gast: true } : {}) })),
  };
}

// Zonder zoekterm of map bij een grote bib: per map het aantal, zodat het antwoord klein blijft (een klas heeft er snel honderden).
const TOETSEN_MAX = 80;
function toetsenLijst({ zoek, map, alles } = {}) {
  const z = String(zoek || '').toLowerCase();
  const m = String(map || '').toLowerCase();
  const lijst = proeven.list()
    .filter(t => (!z || t.title.toLowerCase().includes(z) || t.file.includes(z)) && (!m || (t.folder || '').toLowerCase().startsWith(m)));
  if (!alles && lijst.length > TOETSEN_MAX && !z && !m) {
    const perMap = {};
    for (const t of lijst) perMap[t.folder || ''] = (perMap[t.folder || ''] || 0) + 1;
    return {
      aantal: lijst.length,
      uitleg: `Er zijn ${lijst.length} toetsen. Vraag ze op per map (map) of zoek op titel (zoek); "alles": true geeft ze toch allemaal.`,
      mappen: Object.entries(perMap).sort((a, b) => a[0].localeCompare(b[0])).map(([naam, n]) => ({ map: naam, toetsen: n })),
    };
  }
  const kort = !alles && lijst.length > TOETSEN_MAX;
  return {
    aantal: lijst.length,
    ...(kort ? { uitleg: `Alleen de eerste ${TOETSEN_MAX} van ${lijst.length}. Zoek nauwkeuriger of geef "alles": true.` } : {}),
    toetsen: (kort ? lijst.slice(0, TOETSEN_MAX) : lijst).map(t => ({ file: t.file, titel: t.title, map: t.folder || '', vak: t.vak || '', vragen: t.count, punten: t.punten, niveaus: t.niveaus, klaar: t.klaar, gegeven: t.gegeven, gewijzigd: t.gewijzigd, ...(t.dubbel ? { dubbel_met: t.dubbel } : {}) })),
    ...(z || m ? {} : { mappen: proeven.lib.folders() }),
  };
}

function toetsLezen({ file } = {}) {
  const f = toetsBestaat(file);
  const t = proeven.load(f);
  return { file: f, toets: t, problemen: K.problemen(t) };
}

// Een toets nakijken vóór de les: kan hij af, heeft elke vraag een sleutel, klopt voorlezen bij een taaltoets.
// Zonder file maar met "toets": een droge run (niets bewaard), om een toets na te kijken vóór hij bewaard wordt.
function toetsControleren({ file, toets, andere_versie } = {}) {
  let f = null;
  let t;
  if (!file && toets !== undefined) {
    try { t = toetsUit(toets); } catch (err) { return { droge_run: true, in_orde: false, bevindingen: [{ soort: 'ongeldig', tekst: err.message }] }; }
  } else {
    f = toetsBestaat(file);
    t = proeven.load(f);
  }
  const bevindingen = K.problemen(t).map(p => ({ soort: 'niet af', tekst: p }));
  const vak = proeven.vakVan(t);
  for (const n of K.niveausVan(t)) {
    for (const { q, nr } of K.vragenVan(K.lijstVoor(t, n))) {
      if (!K.maxVan(q)) continue;
      if (!K.handPunten(q) && !String(K.oplossing(q) || '').trim()) bevindingen.push({ soort: 'sleutel', tekst: `${n}, vraag ${nr}: geen sleutel (juist antwoord) gevonden.` });
    }
  }
  const taal = stem.taalVanVak(vak);
  const s = stem.view();
  for (const tk of f ? taken.lijst().filter(x => x.soort === 'proef' && x.file === f && !x.dicht) : []) {
    const keuzes = taken.keuzesVoor(tk.id);
    if (taal !== 'nl' && /frans|fran/i.test(vak) && keuzes.voorlees !== 'uit') bevindingen.push({ soort: 'voorlezen', tekst: `Taak ${tk.id} (${tk.titel}): voorlezen staat op "${keuzes.voorlees}" bij een Franse toets.` });
    if (keuzes.voorlees !== 'uit' && !s.aan) bevindingen.push({ soort: 'voorlezen', tekst: `Taak ${tk.id}: voorlezen staat aan, maar de stem van LANcelot is niet ingesteld. De leerlingen horen de stem van hun toestel.` });
  }
  // Uitgebreid (wens 25 nov, punt 3): beelden, andere goede schrijfwijzen, de 6- en 6+-versie.
  const lijst = proeven.list();
  const takenNu = taken.lijst();
  let extra = toetscontrole.controleer({ file: f, toets: t, lijst, taken: takenNu });
  let versies = f ? toetscontrole.andereVersies(f, lijst) : [];
  if (f && andere_versie) {
    const a = toetsBestaat(andere_versie);
    const item = lijst.find(x => x.file === a);
    versies = [{ file: a, titel: item ? item.title : a, versie: toetscontrole.isPlus(item || { file: a }) ? '6+' : '6' }];
    extra = extra.filter(b => b.soort !== 'versie').concat(toetscontrole.versies(f, t, lijst, takenNu, [item || { file: a, title: a }]));
  }
  bevindingen.push(...extra);
  const handwerk = K.niveausVan(t).reduce((n, nv) => n + K.vragenVan(K.lijstVoor(t, nv)).filter(v => K.handPunten(v.q)).length, 0);
  const poort = (hooks.gezondheid() || {}).poort || 3000;
  return { ...(f ? { file: f, voorbeeld: `http://localhost:${poort}/proef-proberen?file=${encodeURIComponent(f)}` } : { droge_run: true }), titel: t.title, vak, niveaus: K.niveausVan(t), vragen: K.vragenVan(t.vragen).length, punten: K.totaal(t.vragen), zelf_te_verbeteren: handwerk, ...(f ? { andere_versies: versies } : {}), in_orde: !bevindingen.some(b => b.soort !== 'antwoorden'), bevindingen };
}

function takenLijst({ open, soort, file } = {}) {
  const lijst = taken.lijst().filter(t => (!open || !t.dicht) && (!soort || t.soort === soort) && (!file || t.file === file));
  return {
    taken: lijst.map(t => {
      const tel = { nieuw: 0, bezig: 0, klaar: 0 };
      for (const l of t.leerlingen) tel[l.status] = (tel[l.status] || 0) + 1;
      return {
        id: t.id, soort: t.soort, titel: t.titel, file: t.file || t.bron, vak: t.vak, status: t.dicht ? 'afgesloten' : t.vanaf ? 'gepland' : 'open',
        gemaakt: t.gemaakt, vanaf: t.vanaf || null, einddatum: t.tot || null, tijdslimiet: t.tijd || null, max_pogingen: t.pogingen || 1, ...(t.vanzelfDicht ? { vanzelf_gesloten: true } : {}),
        afname: t.afname || null, keuzes: t.soort === 'quiz' ? undefined : taken.keuzesVoor(t.id),
        aantal: tel,
        leerlingen: t.leerlingen.map(l => ({ naam: l.naam, niveau: l.niveau, status: l.status, gedaan: l.gedaan, totaal: l.totaal, ...(l.klaar ? { ingeleverd: l.klaar } : {}), ...(l.afwezig ? { afwezig: true } : {}), ...(l.niet ? { volgt_vak_niet: true } : {}), ...(l.elders ? { op_pc: l.elders } : {}), ...(l.tijd && l.tijd !== t.tijd ? { tijdslimiet: l.tijd } : {}), ...(l.rest !== undefined ? { tijd_over_minuten: Math.ceil(l.rest / 60000) } : {}), ...(l.tijdOp ? { tijd_was_om: true } : {}), ...(l.poging ? { poging: l.poging } : {}) })),
      };
    }),
  };
}

function afnamesLijst({ van, tot } = {}) {
  return {
    afnames: proeven.afnames().filter(a => (!van || dag(a.datum) >= van) && (!tot || dag(a.datum) <= tot))
      .map(a => ({ afname: a.file, titel: a.title, datum: a.datum, leerlingen: a.leerlingen, nog_te_verbeteren: a.open, verbeterd: a.klaar, taak_id: a.taak, toets_file: a.toetsFile })),
  };
}

function resultatenToets(arg = {}) {
  const rec = afnameVan(arg);
  // Wie de taak kreeg maar (nog) niet inleverde.
  let nietIngeleverd = [];
  const taakId = arg.taak_id || (rec && rec.taak);
  if (taakId) {
    const t = taken.lijst().find(x => x.id === taakId);
    if (t) nietIngeleverd = t.leerlingen.filter(l => l.status !== 'klaar' && !l.niet).map(l => ({ naam: l.naam, status: l.status, ...(l.afwezig ? { afwezig: true } : {}) }));
  }
  if (!rec) return { taak_id: taakId, nog_niemand_ingeleverd: true, niet_ingeleverd: nietIngeleverd };
  const perVraag = new Map();
  const ll = rec.spelers.map(s => {
    const st = proeven.stand(rec, s);
    const vragen = {};
    for (const { id, q, nr } of K.vragenVan(K.lijstVoor(rec.toets, s.niveau))) {
      const max = K.maxVan(q);
      if (!max) continue;
      const kreeg = proeven.kregen(s, id);
      const nog = K.handPunten(q) && (s.hand || {})[id] == null && !(s.over && s.over[id] != null);
      vragen[nr] = nog ? [null, max] : [kreeg, max];
      const k = `${s.niveau}|${id}`;
      if (!perVraag.has(k)) perVraag.set(k, { niveau: s.niveau, nr, id, vraag: vraagTekst(q), type: q.type, max, n: 0, som: 0, fout: 0 });
      const v = perVraag.get(k);
      if (!nog) { v.n++; v.som += kreeg; if (kreeg < max / 2) v.fout++; }
    }
    const minuten = s.begon && s.ingeleverd ? Math.round((Date.parse(s.ingeleverd) - Date.parse(s.begon)) / 6000) / 10 : null;
    return { naam: s.naam, niveau: s.niveau, punten: st.punten, max: st.max, procent: procent(st.punten, st.max), nog_te_verbeteren: st.open, ...(s.begon ? { begon: s.begon } : {}), ...(s.ingeleverd ? { ingeleverd: s.ingeleverd } : {}), ...(minuten != null ? { minuten } : {}), per_vraag: vragen };
  });
  const vragen = [...perVraag.values()].map(v => ({ niveau: v.niveau, nr: v.nr, vraag: v.vraag, type: v.type, max: v.max, verbeterd: v.n, gemiddeld: v.n ? Math.round((v.som / v.n) * 10) / 10 : null, fout: v.fout }));
  return {
    afname: rec.file, titel: rec.title, datum: rec.datum, taak_id: rec.taak || null, verbeterd: !!rec.klaar,
    leerlingen: ll, vragen, vaakst_fout: vragen.filter(v => v.fout).sort((a, b) => b.fout - a.fout).slice(0, 5), niet_ingeleverd: nietIngeleverd,
  };
}

function resultatenLeerling({ naam, van, tot } = {}) {
  const l = klas.match(naam);
  if (!l) fout(`"${naam}" staat niet op de klaslijst.`);
  const k = sleutel(l.naam);
  const toetsen = [];
  for (const a of proeven.afnames()) {
    const d = dag(a.datum);
    if ((van && d < van) || (tot && d > tot)) continue;
    let rec;
    try { rec = proeven.laadAfname(a.file); } catch { continue; }
    const s = rec.spelers.find(x => sleutel(x.naam) === k);
    if (!s) continue;
    const st = proeven.stand(rec, s);
    toetsen.push({ afname: a.file, titel: rec.title, datum: rec.datum, vak: proeven.vakVan(rec.toets), niveau: s.niveau, punten: st.punten, max: st.max, procent: procent(st.punten, st.max), nog_te_verbeteren: st.open });
  }
  const tk = taken.lijst().filter(t => (!van || dag(t.dag) >= van) && (!tot || dag(t.dag) <= tot)).map(t => {
    const w = t.leerlingen.find(x => sleutel(x.naam) === k);
    return w ? { taak_id: t.id, soort: t.soort, titel: t.titel, dag: t.dag, status: w.status, gedaan: w.gedaan, totaal: w.totaal, ...(t.soort === 'oefenblad' ? { juist: w.juist, te_verbeteren: w.score } : {}) } : null;
  }).filter(Boolean);
  return { naam: l.naam, van: van || null, tot: tot || null, toetsen, taken: tk };
}

function antwoord({ taak_id, afname, naam, vraag } = {}) {
  const rec = afnameVan({ taak_id, afname });
  if (!rec) fout('Er is nog niets ingeleverd voor deze taak.');
  const s = rec.spelers.find(x => sleutel(x.naam) === sleutel(naam));
  if (!s) fout(`${naam} staat niet in deze afname.`);
  const alle = K.vragenVan(K.lijstVoor(rec.toets, s.niveau));
  const lijst = vraag === undefined || vraag === null || vraag === '' ? alle : alle.filter(v => v.nr === String(vraag) || v.id === String(vraag));
  if (!lijst.length) fout(`Vraag "${vraag}" bestaat niet. Gebruik het nummer zoals 3 of 3a.`);
  return {
    afname: rec.file, titel: rec.title, naam: s.naam, niveau: s.niveau,
    vragen: lijst.map(({ id, q, nr }) => {
      const nog = K.handPunten(q) && (s.hand || {})[id] == null && !(s.over && s.over[id] != null);
      return { nr, vraag: vraagTekst(q), type: q.type, antwoord: s.antwoorden ? s.antwoorden[id] ?? null : null, sleutel: K.oplossing(q) || null, punten: nog ? null : proeven.kregen(s, id), max: K.maxVan(q), ...(nog ? { nog_te_verbeteren: true } : {}) };
    }),
  };
}

// De dagpresentaties: html-bestanden in Mijn methodes, map Dagpresentaties, met de datum vooraan in de naam.
function presentaties() {
  return kronieken.lijst().bestanden.filter(b => b.map === PRESENTATIES && b.soort === 'html')
    .map(b => ({ naam: b.naam, datum: (b.naam.match(/^\d{4}-\d{2}-\d{2}/) || [''])[0] || null, grootte: b.grootte, open_op_bord: `/kronieken?map=${encodeURIComponent(PRESENTATIES)}&naam=${encodeURIComponent(b.naam)}` }))
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || b.naam.localeCompare(a.naam, 'nl', { numeric: true }));
}
// De dagpresentatie van vandaag (de laatst geplaatste), voor het blok Vandaag op het startscherm. Leest enkel die ene map.
function presentatieVan(datum = vandaag()) {
  const dir = path.join(kronieken.DIR, PRESENTATIES);
  let namen = [];
  try { namen = fs.readdirSync(dir).filter(n => n.startsWith(datum) && /\.html?$/i.test(n)); } catch { return null; }
  if (!namen.length) return null;
  const naam = namen.map(n => ({ n, t: (() => { try { return fs.statSync(path.join(dir, n)).mtimeMs; } catch { return 0; } })() })).sort((a, b) => b.t - a.t)[0].n;
  return { naam, titel: naam.replace(/\.html?$/i, '').slice(datum.length).trim() || naam, link: `/kronieken?map=${encodeURIComponent(PRESENTATIES)}&naam=${encodeURIComponent(naam)}` };
}
function dagpresentatieLezen({ datum, naam } = {}) {
  const lijst = presentaties();
  const p = naam ? lijst.find(x => x.naam === naam) : lijst.find(x => x.datum === (datum || vandaag()));
  if (!p) return { gevonden: false, presentaties: lijst.slice(0, 20) };
  const html = fs.readFileSync(path.join(kronieken.DIR, PRESENTATIES, p.naam), 'utf8');
  return { gevonden: true, ...p, html: html.length > 2e6 ? null : html, ...(html.length > 2e6 ? { te_groot_om_te_tonen: true } : {}) };
}

// ---------- Schrijven ----------

function toetsBewaren({ toets, file, map, dubbel_mag } = {}) {
  const t = toetsUit(toets);
  let doel = null;
  let melding = '';
  if (file) {
    const f = toetsBestaat(file);
    if (isGegeven(f)) {
      melding = `"${f}" werd al gegeven: de nieuwe versie staat in een nieuw bestand. De oude toets en het werk van de leerlingen blijven zoals ze waren.`;
    } else {
      // Bijwerken mag, maar de vorige versie blijft bewaard (proeven/_versies).
      const versies = path.join(proeven.DIR, '_versies');
      fs.mkdirSync(versies, { recursive: true });
      fs.copyFileSync(path.join(proeven.DIR, f), path.join(versies, `${gegevens.stempel()}_${f}`));
      doel = f;
      melding = `"${f}" bijgewerkt. De vorige versie staat in proeven/_versies.`;
    }
  } else if (!dubbel_mag) {
    const zelfde = proeven.list().find(x => x.title.trim().toLowerCase() === t.title.trim().toLowerCase());
    if (zelfde) fout(`Er bestaat al een toets "${zelfde.title}" (file: ${zelfde.file}). Geef "file" mee om die bij te werken, of "dubbel_mag": true voor een tweede toets met dezelfde titel.`);
  }
  const bewaard = proeven.save(t, doel);
  let inMap = proeven.lib.places()(bewaard) || '';
  if (map) { inMap = mapMaken(proeven.lib, map); proeven.lib.move(bewaard, inMap); }
  hooks.naToetsen();
  return { file: bewaard, titel: t.title, map: inMap, nieuw: bewaard !== doel, problemen: K.problemen(t), melding: melding || `Toets "${t.title}" bewaard als ${bewaard}.` };
}

function toetsKopieren({ file, titel, map } = {}) {
  const f = toetsBestaat(file);
  const t = proeven.load(f);
  t.title = String(titel || `${t.title} (kopie)`).slice(0, 100);
  const bewaard = proeven.save(t, null);
  const inMap = map ? mapMaken(proeven.lib, map) : proeven.lib.places()(f);
  if (inMap) proeven.lib.move(bewaard, inMap);
  hooks.naToetsen();
  return { file: bewaard, titel: t.title, map: inMap || '' };
}

function toetsNaarMap({ file, map } = {}) {
  const f = toetsBestaat(file);
  const inMap = map ? mapMaken(proeven.lib, map) : '';
  proeven.lib.move(f, inMap);
  hooks.naToetsen();
  return { file: f, map: inMap };
}

const VOLGORDE = { schud: [false, false], vragen: [true, false], alles: [true, true] };
function vanafUit(v) {
  if (v === undefined || v === null || v === '') return null;
  if (!VANAF.test(String(v))) fout('"vanaf" is "JJJJ-MM-DDTHH:MM" in de tijd van de klas-pc, bv. 2026-11-26T08:30.');
  if (Date.parse(v) <= Date.now()) return null;
  return String(v);
}

// Einddatum en tijdslimiet (wens 25 nov): allebei een extra keuze, standaard uit.
function totUit(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (!VANAF.test(String(v))) fout('"einddatum" is "JJJJ-MM-DDTHH:MM" in de tijd van de klas-pc, bv. 2026-11-28T15:30.');
  if (Date.parse(v) <= Date.now()) fout('De einddatum moet in de toekomst liggen.');
  return String(v);
}
function tijdUit(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '' || Number(v) === 0) return null;
  const n = Math.round(Number(v));
  if (!(n >= 1 && n <= taken.MAX_MINUTEN)) fout(`"tijdslimiet" is 1 tot ${taken.MAX_MINUTEN} minuten (0 = geen).`);
  return n;
}
// Aantal pogingen (wens 25 nov, punt 1): 1 = zoals vroeger (alleen de leerkracht zet opnieuw open), tot 5.
function pogingenUit(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '' || Number(v) === 0) return 1;
  const n = Math.round(Number(v));
  if (!(n >= 1 && n <= taken.MAX_POGINGEN)) fout(`"max_pogingen" is 1 tot ${taken.MAX_POGINGEN} (1 = één keer, zoals altijd).`);
  return n;
}
function tijdPerUit(per) {
  if (per === undefined || per === null) return undefined;
  if (typeof per !== 'object' || Array.isArray(per)) fout('"tijd_per_leerling" is bv. {"Lotte": 30}: minuten per naam (0 = geen limiet, null = zoals de taak).');
  const uit = {};
  for (const [n, v] of Object.entries(per)) {
    const naam = leerlingen([n])[0];
    if (v === null) { uit[naam] = null; continue; }
    const m = Math.round(Number(v));
    if (!(m >= 0 && m <= taken.MAX_MINUTEN)) fout(`Tijd voor ${naam}: 0 tot ${taken.MAX_MINUTEN} minuten.`);
    uit[naam] = m;
  }
  return uit;
}

function taakGeven(arg = {}) {
  const soort = arg.soort || 'proef';
  if (!['proef', 'oefenblad', 'quiz'].includes(soort)) fout('"soort" is proef (toets), oefenblad of quiz.');
  if (soort === 'proef') toetsBestaat(arg.file);
  const namen = leerlingen(arg.namen, arg.hele_klas);
  const vanaf = vanafUit(arg.vanaf);
  const tot = totUit(arg.einddatum);
  if (tot && vanaf && Date.parse(tot) <= Date.parse(vanaf)) fout('De einddatum moet na "vanaf" liggen.');
  const tijd = tijdUit(arg.tijdslimiet);
  const tijdPer = tijdPerUit(arg.tijd_per_leerling);
  const pogingen = pogingenUit(arg.max_pogingen);
  if (soort === 'quiz' && (tijd || tijdPer)) fout('Een quiz heeft geen tijdslimiet (wel een einddatum).');
  // Nooit dubbel: staat dezelfde toets al open (of gepland) voor een van deze leerlingen, dan eerst vragen.
  if (!arg.opnieuw) {
    const al = taken.lijst().filter(t => !t.dicht && t.soort === soort && t.file === arg.file);
    for (const t of al) {
      const zelfde = t.leerlingen.filter(l => namen.some(n => sleutel(n) === sleutel(l.naam))).map(l => l.naam);
      if (zelfde.length) fout(`Deze taak bestaat al: taak ${t.id} (${t.titel}, ${t.vanaf ? `gepland ${t.vanaf}` : 'open'}) voor ${zelfde.join(', ')}. Gebruik "taak_leerlingen_toevoegen", of geef "opnieuw": true om ze nog eens te geven.`);
    }
  }
  const std = takenstandaard.voor(soort === 'proef' ? proeven.vakVan(proeven.load(path.basename(arg.file))) : '');
  const volgorde = VOLGORDE[arg.volgorde] ? arg.volgorde : std.volgorde;
  const voorlees = ['uit', 'page', 'iedereen'].includes(arg.voorlezen) ? arg.voorlezen : std.voorlees;
  const p = {
    soort, file: arg.file, namen, vanaf,
    feedback: arg.verbeteren === 'inleveren' ? 'inleveren' : arg.verbeteren === 'direct' ? 'direct' : std.feedback,
    voorlees, vragenVast: VOLGORDE[volgorde][0], keuzesVast: VOLGORDE[volgorde][1],
    uitslag: typeof arg.punten_tonen === 'boolean' ? arg.punten_tonen : std.uitslag,
    beveiligd: typeof arg.beveiligd === 'boolean' ? arg.beveiligd : std.beveiligd,
    niveau: arg.niveau, per: arg.niveau_per_leerling,
    tot: tot || undefined, tijd: tijd || undefined, pogingen: pogingen > 1 ? pogingen : undefined,
  };
  if (soort === 'quiz' && arg.spel) Object.assign(p, { spel: arg.spel, minuten: arg.minuten });
  const t = taken.maak(p);
  // Een toets die al gegeven werd, houdt in "voorlezen uit" zijn eigen keuze (maak zet alleen wat anders is).
  if (soort !== 'quiz') taken.zetKeuzes({ id: t.id, voorlees: voorlees, uitslag: p.uitslag, volgorde });
  for (const [naam, m] of Object.entries(tijdPer || {})) taken.zetTijd({ id: t.id, naam, minuten: m });
  hooks.naTaken({ toets: soort === 'proef' });
  const item = taken.lijst().find(x => x.id === t.id);
  return {
    taak_id: t.id, titel: t.titel, status: item && item.vanaf ? 'gepland' : 'open', vanaf: (item && item.vanaf) || null,
    keuzes: soort === 'quiz' ? undefined : taken.keuzesVoor(t.id),
    einddatum: (item && item.tot) || null, tijdslimiet: (item && item.tijd) || null, max_pogingen: (item && item.pogingen) || 1,
    leerlingen: item ? item.leerlingen.map(l => ({ naam: l.naam, niveau: l.niveau, ...(l.tijd && l.tijd !== item.tijd ? { tijdslimiet: l.tijd } : {}) })) : namen,
  };
}

function bestaandeTaak(id) {
  const t = taken.lijst().find(x => x.id === id);
  if (!t) fout(`De taak "${id}" bestaat niet (meer). Zie de tool "taken".`);
  return t;
}

function taakToevoegen({ taak_id, namen } = {}) {
  const t = bestaandeTaak(taak_id);
  const n = taken.voegToe({ id: t.id, namen: leerlingen(namen) });
  hooks.naTaken({});
  return { taak_id: t.id, titel: t.titel, toegevoegd: n };
}

function taakSluiten({ taak_id } = {}) {
  const t = bestaandeTaak(taak_id);
  if (t.dicht) return { taak_id: t.id, titel: t.titel, status: 'afgesloten', melding: 'Deze taak was al afgesloten.' };
  taken.sluit(t.id);
  hooks.naTaken({});
  return { taak_id: t.id, titel: t.titel, status: 'afgesloten', melding: 'Ingetrokken: wie bezig was, leverde in wat er stond. Niets van de leerlingen ging verloren. Heropenen kan met "taak_heropenen".' };
}

// Einddatum, tijdslimiet en pogingen meegeven bij verplaatsen of heropenen (wens 25 nov, punt 1): eerst alles nakijken,
// dan pas iets veranderen (een fout laat de taak zoals ze was).
const TIJD_ARG = ['einddatum', 'tijdslimiet', 'max_pogingen', 'tijd_per_leerling'];
function tijdArgs(t, arg, vanaf) {
  const a = {};
  for (const k of TIJD_ARG) if (arg[k] !== undefined) a[k] = arg[k];
  if (!Object.keys(a).length) return null;
  const tot = totUit(a.einddatum);
  if (tot && vanaf && Date.parse(tot) <= Date.parse(vanaf)) fout('De einddatum moet na "vanaf" liggen.');
  tijdUit(a.tijdslimiet);
  pogingenUit(a.max_pogingen);
  if (t.soort === 'quiz' && (a.tijdslimiet || a.tijd_per_leerling)) fout('Een quiz heeft geen tijdslimiet (wel een einddatum).');
  tijdPerUit(a.tijd_per_leerling);
  return a;
}

function taakHeropenen({ taak_id, ...arg } = {}) {
  const t = bestaandeTaak(taak_id);
  const a = tijdArgs(t, arg, null);
  taken.heropen({ id: t.id });
  const k = a ? taakKeuzes({ taak_id: t.id, ...a }).keuzes : undefined;
  hooks.naTaken({});
  return { taak_id: t.id, titel: t.titel, status: 'open', ...(k ? { keuzes: k } : {}) };
}

function taakVerplaatsen({ taak_id, vanaf, ...arg } = {}) {
  const t = bestaandeTaak(taak_id);
  const v = vanafUit(vanaf);
  const a = tijdArgs(t, arg, v);
  taken.zetVanaf({ id: t.id, vanaf: v });
  const k = a ? taakKeuzes({ taak_id: t.id, ...a }).keuzes : undefined;
  hooks.naTaken({});
  return { taak_id: t.id, titel: t.titel, status: v ? 'gepland' : 'open', vanaf: v, ...(k ? { keuzes: k } : {}) };
}

function taakKeuzes({ taak_id, voorlezen, punten_tonen, volgorde, verbeteren, einddatum, tijdslimiet, tijd_per_leerling, max_pogingen } = {}) {
  const t = bestaandeTaak(taak_id);
  const p = { id: t.id };
  const tot = totUit(einddatum === (t.tot || '') ? undefined : einddatum);
  if (tot !== undefined) p.tot = tot;
  const tijd = tijdUit(tijdslimiet);
  if (tijd !== undefined) p.tijd = tijd;
  const pog = pogingenUit(max_pogingen);
  if (pog !== undefined) p.pogingen = pog;
  const tijdPer = tijdPerUit(tijd_per_leerling);
  if (t.soort === 'quiz' && (tijd !== undefined || tijdPer)) fout('Een quiz heeft geen tijdslimiet (wel een einddatum).');
  if (voorlezen !== undefined) p.voorlees = voorlezen;
  if (typeof punten_tonen === 'boolean') p.uitslag = punten_tonen;
  if (volgorde !== undefined) p.volgorde = volgorde;
  if (verbeteren !== undefined) p.feedback = verbeteren;
  const r = Object.keys(p).length > 1 || t.soort !== 'quiz' ? taken.zetKeuzes(p) : taken.keuzesVoor(t.id);
  for (const [naam, m] of Object.entries(tijdPer || {})) taken.zetTijd({ id: t.id, naam, minuten: m });
  hooks.naTaken({ keuzes: t.id });
  return { taak_id: t.id, titel: t.titel, keuzes: tijdPer ? taken.keuzesVoor(t.id) : r };
}

function dagpresentatiePlaatsen({ html, datum, titel } = {}) {
  if (typeof html !== 'string' || !html.trim()) fout('Geef "html": de volledige presentatie als tekst.');
  const d = datum || vandaag();
  if (!DATUM.test(d)) fout('"datum" is JJJJ-MM-DD.');
  const naam = `${d} ${String(titel || 'Dagpresentatie').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().slice(0, 60) || 'Dagpresentatie'}.html`;
  kronieken.nieuweMap(PRESENTATIES);
  const r = kronieken.bewaar(PRESENTATIES, naam, Buffer.from(html, 'utf8'));
  hooks.naKronieken();
  return { naam: r.naam, map: r.map, datum: d, open_op_bord: `/kronieken?map=${encodeURIComponent(r.map)}&naam=${encodeURIComponent(r.naam)}`, melding: d === vandaag() ? 'Staat klaar: op het startscherm, in het blok Vandaag, opent hij met één tik.' : `Staat klaar in Mijn methodes › ${PRESENTATIES}. Op ${d} staat hij in het blok Vandaag.` };
}

// Remediëring (wens 25 nov, punt 4): na een toets per leerling een oefenblad op wat fout liep, in zijn eigen versie.
function remedieringTool({ taak_id, afname, grens_procent, namen, droge_run, vanaf, einddatum, max_pogingen } = {}) {
  const rem = require('./remediering');
  const rec = afnameVan({ taak_id, afname });
  if (!rec) fout('Er is nog niets ingeleverd voor deze toets.');
  const g = grens_procent === undefined ? 0.5 : Number(grens_procent) / 100;
  if (!(g > 0 && g <= 1)) fout('"grens_procent" is 1 tot 100 (standaard 50: minder dan de helft van de punten op een vraag is fout).');
  const wie = namen ? leerlingen(namen) : undefined;
  if (droge_run) return { droge_run: true, ...rem.samenvatting(rem.voorstel(rec, { grens: g, namen: wie })) };
  const v = vanafUit(vanaf);
  const tot = totUit(einddatum);
  const pog = pogingenUit(max_pogingen);
  const r = rem.maak(rec, { grens: g, namen: wie, vanaf: v || undefined, tot: tot || undefined, pogingen: pog > 1 ? pog : undefined });
  hooks.naTaken({});
  return { ...r, melding: 'De oefenbladen staan in Maken › Mijn oefenbladen (map ' + r.map + ') en als taak bij Mijn taken. De toets zelf veranderde niet.' };
}

// Herkansing met één klik (wens 25 nov, punt 6): een kopie van de toets voor wie onder de grens bleef.
function herkansingTool({ taak_id, afname, grens_procent, namen, kopie, droge_run, vanaf, einddatum, max_pogingen } = {}) {
  const hk = require('./herkansing');
  let kolom = taak_id ? String(taak_id) : '';
  if (!kolom && afname) {
    const a = proeven.afnames().find(x => x.file === require('path').basename(String(afname)));
    if (!a) fout('Die afname bestaat niet (tool "afnames").');
    kolom = a.taak || `afname:${a.file}`;
  }
  if (!kolom) fout('Geef "taak_id" of "afname".');
  const g = grens_procent === undefined ? 0.5 : Number(grens_procent) / 100;
  if (!(g > 0 && g <= 1)) fout('"grens_procent" is 1 tot 100 (standaard 50).');
  const wie = namen ? leerlingen(namen) : undefined;
  const opts = { kolom, grens: g, namen: wie, metKopie: kopie !== false };
  if (droge_run) return { droge_run: true, ...hk.geef({ ...opts, droog: true }) };
  const v = vanafUit(vanaf);
  const tot = totUit(einddatum);
  const pog = pogingenUit(max_pogingen);
  const r = hk.geef({ ...opts, vanaf: v || undefined, tot: tot || undefined, pogingen: pog > 1 ? pog : undefined });
  hooks.naToetsen();
  hooks.naTaken({});
  return { ...r, melding: `Herkansing "${r.kopieTitel}" gegeven aan ${r.namen.join(', ')}. Ze telt als herkansing in Opvolgen › Punten. De eerste toets en zijn punten veranderden niet.` };
}

// Weekrapport per leerling (wens 25 nov, punt 5): de gegevens, en waar de leerkracht het afdrukt of als pdf bewaart.
function weekrapportTool({ van, tot, naam } = {}) {
  const d = require('./weekrapport').data({ van, tot, naam });
  const poort = (hooks.gezondheid() || {}).poort || 3000;
  return { ...d, afdrukken: `http://localhost:${poort}/weekrapport?van=${d.van}`, uitleg: 'Op de klas-pc: één A4 per leerling, printen of bewaren als pdf, of "Pdf per leerling in Mijn lesmap" (Weekrapporten/<naam>/). De feedback is een voorstel van LANcelot, tenzij de leerkracht ze aanpaste (eigen: true); aanpassen met weekrapport_feedback.' };
}
function weekrapportFeedback({ van, naam, tekst } = {}) {
  const w = require('./weekrapport');
  return w.zetOpmerking({ van: w.week(van).van, naam, tekst });
}

// ---------- De lijst van tools ----------
// schrijft: alleen als de leerkracht schrijven toeliet. log: een korte regel voor het logboek van de connector.

const obj = (props, required = []) => ({ type: 'object', properties: props, ...(required.length ? { required } : {}), additionalProperties: false });
const S = (description, extra = {}) => ({ type: 'string', description, ...extra });
const B = description => ({ type: 'boolean', description });
const NAMEN = { type: 'array', items: { type: 'string' }, description: 'Namen zoals op de klaslijst (tool "klas").' };
const VOORLEES = S('uit, page (enkel wie op Page werkt) of iedereen.', { enum: ['uit', 'page', 'iedereen'] });
const VOLG = S('schud (vragen en keuzes door elkaar), vragen (vragen in volgorde, keuzes geschud) of alles (alles in volgorde).', { enum: ['schud', 'vragen', 'alles'] });
const POGINGEN = { type: 'integer', minimum: 1, maximum: 5, description: 'Hoe vaak de leerling de taak mag maken: na het inleveren begint hij zelf opnieuw met een leeg blad, zolang de taak open is (zijn laatste poging telt; bij een toets gaat zijn vorige inzending uit de afname). 1 of leeg = één keer (standaard, zoals altijd).' };
const TIJD_PER = { type: 'object', additionalProperties: { type: ['integer', 'null'] }, description: 'Een eigen tijdslimiet per leerling, bv. {"Lotte": 40} voor een zorgleerling. 0 = geen limiet, null = zoals de taak.' };
// Bij verplaatsen en heropenen: dezelfde keuzes als bij taak_keuzes.
const TIJD_SCHEMA = {
  einddatum: S('Sluit vanzelf op "JJJJ-MM-DDTHH:MM"; leeg ("") = geen einddatum meer.'),
  tijdslimiet: { type: 'integer', minimum: 0, maximum: taken.MAX_MINUTEN, description: 'Minuten per leerling (0 = geen).' },
  tijd_per_leerling: TIJD_PER, max_pogingen: POGINGEN,
};
const DAGP = S('Datum JJJJ-MM-DD.');

const TOOLS = [
  { name: 'gezondheid', title: 'Gezondheidscontrole', description: 'Draait LANcelot, welke versie, gaat de sync met Mijn lesmap goed, is de voorleesstem ingesteld en hoeveel tekens werden deze maand voorgelezen, hoeveel leerlingen en open taken. Geeft nooit sleutels terug.', inputSchema: obj({}), fn: gezondheid },
  { name: 'klas', title: 'Klaslijst', description: 'De klaslijst: namen en niveaus (Page, Schildknaap, Ridder), ook per vak. Gebruik deze namen bij het toewijzen.', inputSchema: obj({}), fn: klasInfo },
  { name: 'toetsen', title: 'Toetsen opzoeken', description: 'Alle toetsen (De Proef): file, titel, map, vak, aantal vragen, punten, niveaus, klaar om af te nemen, wanneer gegeven. Kijk hier eerst, zodat je nooit een toets dubbel maakt. Bij meer dan 80 toetsen zonder zoek of map krijg je eerst het aantal per map.', inputSchema: obj({ zoek: S('Stuk van de titel (optioneel).'), map: S('Alleen toetsen in deze map en haar submappen (optioneel).'), alles: B('Ook bij een grote lijst alle toetsen geven (anders bij meer dan 80 een overzicht per map).') }), fn: toetsenLijst },
  { name: 'toets', title: 'Toets lezen', description: 'De volledige toets (JSON zoals LANcelot hem inleest) en wat er nog ontbreekt om hem af te nemen.', inputSchema: obj({ file: S('Bestandsnaam van de toets.') }, ['file']), fn: toetsLezen },
  { name: 'toets_controleren', title: 'Toets controleren', description: 'Controle vóór de les: ontbreekt er iets, heeft elke vraag een sleutel, staat voorlezen uit bij een Franse toets, is de voorleesstem ingesteld; afbeeldingen die ontbreken, niet te lezen of te klein zijn (soort "beeld"); bij getypte antwoorden mogelijke andere goede schrijfwijzen (soort "antwoorden", met "voorstel": jij beslist, toevoegen met vraag_wijzigen en |); bestaat de 6- en de 6+-versie en zijn ze allebei gepland, op dezelfde dag (soort "versie", plus "andere_versies"). "in_orde" kijkt niet naar de voorstellen. Geeft ook een voorbeeldlink. Met "toets" in plaats van "file": een droge run vóór het bewaren.', inputSchema: obj({ file: S('Bestandsnaam van de toets.'), toets: { type: ['object', 'string'], description: 'Of: een toets als JSON om na te kijken zonder te bewaren (droge run).' }, andere_versie: S('Optioneel: het bestand van de andere versie (6 of 6+), als de titels niet op elkaar lijken.') }), fn: toetsControleren },
  { name: 'taken', title: 'Taken en toewijzingen', description: 'Alle gegeven taken (toetsen, oefenbladen, quizzen): id, titel, file, status (open, gepland, afgesloten), vanaf, einddatum, tijdslimiet, keuzes (voorlezen, volgorde, punten tonen) en per leerling de status (nieuw, bezig, klaar).', inputSchema: obj({ open: B('Alleen taken die nog niet afgesloten zijn.'), soort: S('proef, oefenblad of quiz.', { enum: ['proef', 'oefenblad', 'quiz'] }), file: S('Alleen taken van deze toets of dit bestand.') }), fn: takenLijst },
  { name: 'afnames', title: 'Afgenomen toetsen', description: 'De afgenomen toetsen (resultaten in De Proef), met datum, aantal leerlingen en hoeveel er nog te verbeteren is.', inputSchema: obj({ van: DAGP, tot: DAGP }), fn: afnamesLijst },
  { name: 'resultaten_toets', title: 'Resultaten van een toets', description: 'Per leerling de punten, het percentage, de punten per vraag en de tijd; per vraag het gemiddelde en hoe vaak fout; de vragen die het vaakst fout waren; wie nog niet inleverde.', inputSchema: obj({ taak_id: S('Id van de taak (tool "taken").'), afname: S('Of: de afname (tool "afnames").') }), fn: resultatenToets },
  { name: 'resultaten_leerling', title: 'Resultaten van een leerling', description: 'Alle toetsen (punten) en taken (status) van één leerling in een periode. Voor het rapport, remediëring of een puntenlijst.', inputSchema: obj({ naam: S('Naam zoals op de klaslijst.'), van: DAGP, tot: DAGP }, ['naam']), fn: resultatenLeerling },
  { name: 'antwoord', title: 'Antwoord van een leerling', description: 'Wat één leerling antwoordde op één vraag (of alle vragen), met de sleutel en de punten erbij.', inputSchema: obj({ taak_id: S('Id van de taak.'), afname: S('Of: de afname.'), naam: S('Naam van de leerling.'), vraag: S('Nummer zoals in de toets: 3 of 3a. Leeg = alle vragen.') }, ['naam']), fn: antwoord },
  { name: 'dagpresentaties', title: 'Dagpresentaties', description: 'De dagpresentaties in Mijn methodes (map Dagpresentaties), de nieuwste eerst.', inputSchema: obj({}), fn: () => ({ presentaties: presentaties() }) },
  { name: 'dagpresentatie', title: 'Dagpresentatie lezen', description: 'De html van de dagpresentatie van een dag (standaard vandaag) of met deze naam.', inputSchema: obj({ datum: DAGP, naam: S('Bestandsnaam (tool "dagpresentaties").') }), fn: dagpresentatieLezen },
  { name: 'logboek', title: 'Logboek van de connector', description: 'Wat er via de connector gebeurde (de nieuwste eerst), zoals de leerkracht het ziet in Instellingen › Connector.', inputSchema: obj({ aantal: { type: 'integer', minimum: 1, maximum: 200, description: 'Hoeveel regels (standaard 30).' } }), fn: null },

  { name: 'toets_bewaren', schrijft: true, title: 'Toets bewaren', description: 'Een toets aanmaken of bijwerken uit JSON (hetzelfde formaat als "toets" teruggeeft: title, vak, vragen, en eventueel page/ridder voor de niveaus). Zonder file: nieuwe toets (fout als de titel al bestaat). Met file: bijwerken; werd die toets al gegeven, dan komt er een nieuwe versie en blijft het werk van de leerlingen staan.', inputSchema: obj({ toets: { type: ['object', 'string'], description: 'De toets als JSON.' }, file: S('Bestaande toets om bij te werken (optioneel).'), map: S('Map, bv. "Wiskunde/Blok 3". Bestaat ze niet, dan maakt LANcelot ze.'), dubbel_mag: B('Toch een nieuwe toets als de titel al bestaat.') }, ['toets']), fn: toetsBewaren, log: (a, r) => ({ titel: r.titel, file: r.file }) },
  { name: 'toets_kopieren', schrijft: true, title: 'Toets kopiëren', description: 'Een kopie van een toets maken (bv. een versie 6+), eventueel met een nieuwe titel en in een map.', inputSchema: obj({ file: S('De toets om te kopiëren.'), titel: S('Titel van de kopie.'), map: S('Map van de kopie.') }, ['file']), fn: toetsKopieren, log: (a, r) => ({ titel: r.titel, file: r.file }) },
  { name: 'toets_naar_map', schrijft: true, title: 'Toets naar een map', description: 'Een toets in een map zetten (bv. "Archief/Wiskunde/2026-11"). Lege map = bovenaan.', inputSchema: obj({ file: S('De toets.'), map: S('De map.') }, ['file']), fn: toetsNaarMap, log: (a, r) => ({ file: r.file, map: r.map }) },
  { name: 'taak_geven', schrijft: true, title: 'Taak geven', description: 'Een toets (soort proef, standaard), oefenblad of quiz toewijzen aan leerlingen of de hele klas, meteen of gepland (vanaf, bv. een quiz op een werkdag om 18.05). Keuzes die je niet meegeeft, komen uit Instellingen › Taken. Einddatum en tijdslimiet staan standaard uit. Fout als dezelfde taak al open staat voor die leerlingen.', inputSchema: obj({ file: S('Bestandsnaam van de toets, het oefenblad of de quiz.'), soort: S('proef, oefenblad of quiz.', { enum: ['proef', 'oefenblad', 'quiz'] }), namen: NAMEN, hele_klas: B('Iedereen van de klas (zonder gasten).'), vanaf: S('Pas zichtbaar vanaf "JJJJ-MM-DDTHH:MM" (tijd van de klas-pc). Leeg = meteen.'), voorlezen: VOORLEES, volgorde: VOLG, punten_tonen: B('De leerling ziet zijn punten na het inleveren.'), beveiligd: B('Volledig scherm; wegklikken wordt gemeld.'), verbeteren: S('Oefenblad: direct of inleveren.', { enum: ['direct', 'inleveren'] }), niveau: S('Iedereen op dit niveau (page, schildknaap, ridder). Leeg = ieder zijn eigen niveau.'), niveau_per_leerling: { type: 'object', additionalProperties: { type: 'string' }, description: 'Per naam een niveau, bv. {"Lotte": "ridder"}.' }, opnieuw: B('Toch geven, ook als dezelfde taak al open staat (herkansing).'), spel: S('Quiz: de leerling speelt ze alleen in dit spel (zonder spel: vraag per vraag).', { enum: Object.keys(taken.SOLO) }), minuten: { type: 'integer', enum: taken.MINUTEN, description: 'Quiz in een spel: hoe lang (minuten).' }, einddatum: S('Sluit vanzelf op "JJJJ-MM-DDTHH:MM" (tijd van de klas-pc), zoals taak_intrekken: wie bezig is, levert in. Leeg = de leerkracht sluit zelf.'), tijdslimiet: { type: 'integer', minimum: 0, maximum: taken.MAX_MINUTEN, description: 'Toets of oefenblad: minuten vanaf het moment dat de leerling begint; daarna levert hij vanzelf in. 0 of leeg = geen (standaard).' }, tijd_per_leerling: TIJD_PER, max_pogingen: POGINGEN }, ['file']), fn: taakGeven, log: (a, r) => ({ titel: r.titel, n: (r.leerlingen || []).length, vanaf: r.vanaf }) },
  { name: 'taak_leerlingen_toevoegen', schrijft: true, title: 'Leerlingen toevoegen', description: 'Leerlingen bij een gegeven taak zetten.', inputSchema: obj({ taak_id: S('Id van de taak.'), namen: NAMEN }, ['taak_id', 'namen']), fn: taakToevoegen, log: (a, r) => ({ titel: r.titel, n: r.toegevoegd }) },
  { name: 'remediering', schrijft: true, title: 'Remediëring na een toets', description: 'Na een toets per leerling een oefenblad met de vragen waarop hij minder dan de grens haalde (standaard minder dan de helft), uit zijn eigen versie (6, 6+ of zijn niveau), per doel gegroepeerd, en dat als taak klaarzetten (direct verbeteren, punten tonen). Leerlingen met dezelfde fouten krijgen samen één blad. Open vragen die nog niet verbeterd zijn, tellen niet mee. "droge_run": true toont eerst wie wat krijgt.', inputSchema: obj({ taak_id: S('Id van de toets-taak (tool "taken").'), afname: S('Of: de afname (tool "afnames").'), grens_procent: { type: 'number', minimum: 1, maximum: 100, description: 'Een vraag is fout onder dit percentage van zijn punten (standaard 50).' }, namen: NAMEN, droge_run: B('Alleen tonen wie wat krijgt, niets bewaren.'), vanaf: S('Pas zichtbaar vanaf "JJJJ-MM-DDTHH:MM".'), einddatum: S('Sluit vanzelf op "JJJJ-MM-DDTHH:MM".'), max_pogingen: POGINGEN }), fn: remedieringTool, log: (a, r) => ({ titel: r.titel, n: (r.bladen || r.groepen || []).length }) },
  { name: 'herkansing_geven', schrijft: true, title: 'Herkansing met één klik', description: 'Na een toets een herkansing geven aan alleen de leerlingen onder de grens (standaard 50 %, gerekend zoals Opvolgen › Punten, met wat telt bij eerdere herkansingen). Standaard een kopie van de toets ("<titel> · herkansing", dezelfde map; een bestaande kopie wordt opnieuw gebruikt) met dezelfde keuzes als de eerste keer; ze telt als herkansing bij de punten. Wie nog niet verbeterd is of de toets niet maakte, krijgt niets. "droge_run": true toont eerst wie.', inputSchema: obj({ taak_id: S('Id van de toets-taak (tool "taken"); een eerdere herkansing mag ook.'), afname: S('Of: de afname (tool "afnames").'), grens_procent: { type: 'number', minimum: 1, maximum: 100, description: 'Wie minder dan dit percentage haalde, krijgt de herkansing (standaard 50).' }, namen: { ...NAMEN, description: 'Zelf kiezen wie (in plaats van de grens); alleen leerlingen die de toets maakten.' }, kopie: B('Standaard true: een kopie van de toets. false = dezelfde toets nog eens.'), droge_run: B('Alleen tonen wie de herkansing zou krijgen.'), vanaf: S('Pas zichtbaar vanaf "JJJJ-MM-DDTHH:MM".'), einddatum: S('Sluit vanzelf op "JJJJ-MM-DDTHH:MM".'), max_pogingen: POGINGEN }), fn: herkansingTool, log: (a, r) => ({ titel: r.titel, n: (r.namen || []).length }) },
  { name: 'weekrapport', title: 'Weekrapport per leerling', description: 'Per leerling de toetsen van de week (punten, procent, op 10), de taken (af of niet), de doelen (behaald vanaf 70 % juist in het logboek, anders nog oefenen) en een korte feedback, plus de link om af te drukken of als pdf te bewaren voor de ouders.', inputSchema: obj({ van: S('Maandag JJJJ-MM-DD (standaard deze week).'), tot: S('JJJJ-MM-DD (standaard zondag erna).'), naam: S('Eén leerling (optioneel).') }), fn: weekrapportTool },
  { name: 'weekrapport_feedback', schrijft: true, title: 'Feedback in het weekrapport', description: 'De feedback van één leerling in het weekrapport van die week zetten (leeg = het voorstel van LANcelot). Kort en vriendelijk, voor de ouders.', inputSchema: obj({ van: S('Een dag van die week, JJJJ-MM-DD.'), naam: S('De leerling.'), tekst: S('De feedback (hooguit 1200 tekens).') }, ['naam']), fn: weekrapportFeedback, log: (a, r) => ({ naam: r.naam }) },
  { name: 'taak_verplaatsen', schrijft: true, title: 'Taak verplaatsen', description: 'Het startmoment van een geplande taak veranderen (vanaf), of leeg om ze meteen te laten verschijnen. Kan alleen zolang de taak gepland is of niemand begon.', inputSchema: obj({ taak_id: S('Id van de taak.'), vanaf: S('JJJJ-MM-DDTHH:MM of leeg.'), ...TIJD_SCHEMA }, ['taak_id']), fn: taakVerplaatsen, log: (a, r) => ({ titel: r.titel, vanaf: r.vanaf }) },
  { name: 'taak_keuzes', schrijft: true, title: 'Keuzes van een taak', description: 'Voorlezen, punten tonen, einddatum en tijdslimiet veranderen (geldt meteen voor iedereen, ook wie bezig is), en de volgorde of het verbeteren (voor wie nog niet begon). Ook een eigen tijd per leerling. Bij een quiz alleen de einddatum.', inputSchema: obj({ taak_id: S('Id van de taak.'), voorlezen: VOORLEES, punten_tonen: B('Punten tonen na het inleveren.'), volgorde: VOLG, verbeteren: S('Oefenblad: direct of inleveren.', { enum: ['direct', 'inleveren'] }), einddatum: S('Sluit vanzelf op "JJJJ-MM-DDTHH:MM"; leeg ("") = geen einddatum meer. Ook bij een quiz.'), tijdslimiet: { type: 'integer', minimum: 0, maximum: taken.MAX_MINUTEN, description: 'Minuten per leerling (0 = geen). Geldt meteen, ook voor wie bezig is.' }, tijd_per_leerling: TIJD_PER, max_pogingen: POGINGEN }, ['taak_id']), fn: taakKeuzes, log: (a, r) => ({ titel: r.titel }) },
  { name: 'taak_intrekken', schrijft: true, title: 'Taak intrekken', description: 'Een taak afsluiten (intrekken). Wie bezig is, levert in wat er staat; niets van de leerlingen gaat verloren. Heropenen kan.', inputSchema: obj({ taak_id: S('Id van de taak.') }, ['taak_id']), fn: taakSluiten, log: (a, r) => ({ titel: r.titel }) },
  { name: 'taak_heropenen', schrijft: true, title: 'Taak heropenen', description: 'Een afgesloten taak weer openzetten, eventueel meteen met een nieuwe einddatum, tijdslimiet of aantal pogingen.', inputSchema: obj({ taak_id: S('Id van de taak.'), ...TIJD_SCHEMA }, ['taak_id']), fn: taakHeropenen, log: (a, r) => ({ titel: r.titel }) },
  { name: 'dagpresentatie_plaatsen', schrijft: true, title: 'Dagpresentatie plaatsen', description: 'Een html-presentatie (dia\'s als <section class="dia">, stappen met class="stap"; eigen scripts draaien niet) in Mijn methodes › Dagpresentaties zetten als "dag van <datum>". Op die dag staat ze op het startscherm in het blok Vandaag. Een bestaande wordt nooit overschreven.', inputSchema: obj({ html: S('De volledige html.'), datum: DAGP, titel: S('Korte titel, bv. "Donderdag".') }, ['html']), fn: dagpresentatiePlaatsen, log: (a, r) => ({ naam: r.naam }) },
];

// Deel 2: toetsen stap voor stap, quizzen, oefenbladen, mappen, de week, sync (src/connector-bouw.js).
TOOLS.push(...require('./connector-bouw').maak({ fout, toetsBestaat, isGegeven, mapMaken, toetsBewaren, dag, vandaag, hooks: () => hooks }));
// Deel 3: Peilen, peilingen en voorkennis (src/connector-peilen.js).
TOOLS.push(...require('./connector-peilen').maak({ fout, mapMaken, hooks: () => hooks, tool: n => TOOLS.find(x => x.name === n) }));

// De antwoorden van de connector zelf (src/connector.js), voor de assistent.
const TEKST = {
  uit: 'De connector staat uit. De leerkracht zet hem aan in LANcelot › Instellingen › Connector.',
  teVeel: 'Te veel foute sleutels. Probeer het over een minuut opnieuw.',
  ongeldig: 'Deze sleutel is niet (meer) geldig. Maak een nieuwe in LANcelot › Instellingen › Connector.',
  geen: 'Geen sleutel. Zet de sleutel van LANcelot in het adres (…/mcp/<sleutel>) of als Authorization: Bearer <sleutel>.',
  onbekendeTool: n => `Onbekende tool "${n}".`,
  alleenLezen: 'De connector staat op "alleen lezen". De leerkracht kan klaarzetten toelaten in LANcelot › Instellingen › Connector.',
  verzoek: 'Ongeldig verzoek.',
  methode: m => `Onbekende methode "${m}".`,
  stream: 'Deze MCP-server werkt zonder stream: gebruik POST.',
  niet: 'Niet gevonden.',
  groot: 'Te groot.',
  json: 'Ongeldige JSON.',
};
const UITLEG = 'LANcelot is de klas-app van de leerkracht (toetsen in De Proef, taken per leerling, resultaten). '
  + 'Kijk altijd eerst met "toetsen", "quizzen" en "taken" wat er al bestaat, zodat je niets dubbel aanmaakt. '
  + 'Lees "formaat" voor je een toets of quiz maakt; kleine aanpassingen doe je met "vraag_wijzigen" in plaats van de hele toets te vervangen. '
  + 'Niets wordt ooit verwijderd: een taak intrekken sluit ze af en het werk van de leerlingen blijft. '
  + 'Namen van leerlingen zijn persoonsgegevens: gebruik ze enkel voor wat de leerkracht vraagt.';

module.exports = { init, TOOLS, TEKST, UITLEG, presentatieVan, PRESENTATIES, mapMaken };
