// Remediëring na een toets (wensenlijst 25 nov, punt 4): per leerling een oefenblad met wat fout liep, en dat als taak klaarzetten.
// Wat fout liep = een vraag waarop de leerling minder dan de grens haalde (standaard: minder dan de helft van de punten).
// De vragen komen uit de versie die de leerling zelf maakte: wie de 6+-toets (of het Page-niveau) kreeg, oefent op die vragen.
// Per doel gegroepeerd (het leerplandoel van de vraag, anders de titel van de bron, anders "vraag 3"). Een vraag uit een bron
// krijgt de bron mee (de tekst als tekstblok, de prent bij de eerste vraag). Vragen die de leerkracht nog verbetert en nog geen
// punt hebben, tellen (nog) niet mee. Leerlingen met precies dezelfde foute vragen krijgen samen één blad.
// De bladen komen in Maken › Mijn oefenbladen, map "Remediëring/<titel van de toets>". De toets zelf verandert niet.
const proeven = require('./proeven');
const oefenbladen = require('./oefenbladen');
const taken = require('./taken');
const takenstandaard = require('./takenstandaard');

const K = proeven.K;
const MAP = 'Remediëring';
const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const kort = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Welke vragen liepen fout, per leerling. grens = deel van de punten (0.5 = minder dan de helft is fout).
function fouten(rec, { grens = 0.5, namen } = {}) {
  const wie = namen && namen.length ? new Set(namen.map(key)) : null;
  const uit = [];
  for (const s of rec.spelers) {
    if (wie && !wie.has(key(s.naam))) continue;
    const lijst = K.lijstVoor(rec.toets, s.niveau);
    const fout = [];
    let nogTeVerbeteren = 0;
    for (const { id, q, bron, nr } of K.vragenVan(lijst)) {
      const max = K.maxVan(q);
      if (!max) continue;
      const over = s.over && s.over[id] !== undefined && s.over[id] !== null;
      if (K.handPunten(q) && !over && (s.hand || {})[id] == null) { nogTeVerbeteren++; continue; }
      const kreeg = proeven.kregen(s, id);
      if (kreeg < max * grens - 1e-9) fout.push({ id, q, bron, nr, kreeg, max, doel: q.doel || (bron && bron.titel) || '' });
    }
    uit.push({ naam: s.naam, niveau: s.niveau, fout, nogTeVerbeteren });
  }
  return uit;
}

// Het oefenblad voor een rij foute vragen. Vragen die een oefenblad niet kan tonen (aanduiden in de bron…), vallen weg.
function blad(rec, fout, titel) {
  const blocks = [];
  const gezien = new Set();
  const perDoel = new Map();
  for (const f of fout) (perDoel.get(f.doel) || perDoel.set(f.doel, []).get(f.doel)).push(f);
  for (const [doel, lijst] of perDoel) {
    for (const f of lijst) {
      const q = JSON.parse(JSON.stringify(f.q));
      delete q.doel;
      if (f.bron && !gezien.has(f.bron)) {
        gezien.add(f.bron);
        const tekst = kort(f.bron.tekst, 4000);
        if (tekst) blocks.push({ type: 'tekst', title: kort(f.bron.titel, 100), text: tekst });
        if (f.bron.beeld && !q.beeld) q.beeld = f.bron.beeld;
      }
      const b = { type: 'vraag', instruction: doel && /\s/.test(doel) && !f.q.doel ? `Oefen: ${kort(doel, 180)}` : '', q, ...(f.q.doel ? { doel: f.q.doel } : {}) };
      try { oefenbladen.validate({ title: 'x', blocks: [b] }); blocks.push(b); } catch {}
    }
  }
  // Alleen tekst over (de vragen konden niet op een blad): geen blad.
  if (!blocks.some(b => b.type === 'vraag')) return null;
  return oefenbladen.validate({ title: kort(titel, 100), blocks: blocks.slice(0, 30) });
}

// Het voorstel: per groep leerlingen (zelfde foute vragen) welk blad ze krijgen. Niets wordt bewaard.
function voorstel(rec, opts = {}) {
  const per = fouten(rec, opts);
  const groepen = new Map();
  const zonder = [];
  for (const p of per) {
    if (!p.fout.length) { zonder.push({ naam: p.naam, nogTeVerbeteren: p.nogTeVerbeteren }); continue; }
    const sl = `${p.niveau}|${p.fout.map(f => f.id).join(',')}`;
    if (!groepen.has(sl)) groepen.set(sl, { niveau: p.niveau, fout: p.fout, namen: [] });
    groepen.get(sl).namen.push(p.naam);
  }
  const lijst = [...groepen.values()].sort((a, b) => b.namen.length - a.namen.length);
  return {
    titel: rec.title, grens: opts.grens || 0.5,
    groepen: lijst.map((g, i) => ({
      nr: i + 1, namen: g.namen, niveau: g.niveau, vragen: g.fout.map(f => f.nr),
      doelen: [...new Set(g.fout.map(f => f.doel || `vraag ${f.nr}`))],
      blad: blad(rec, g.fout, `Remediëring · ${rec.title}${lijst.length > 1 ? ` · ${i + 1}` : ''}`),
    })),
    zonder,
    nogTeVerbeteren: per.filter(p => p.nogTeVerbeteren).map(p => ({ naam: p.naam, vragen: p.nogTeVerbeteren })),
  };
}

// Maken: de bladen bewaren (in de map Remediëring/<toets>) en, met geven, als taak klaarzetten (verbeteren direct, punten tonen).
function maak(rec, { grens, namen, geven = true, vanaf, tot, pogingen } = {}) {
  const v = voorstel(rec, { grens, namen });
  const lib = oefenbladen.lib;
  const map = mapMaken(lib, `${MAP}/${kort(rec.title, 60).replace(/[\\/]/g, '-')}`);
  const uit = [];
  for (const g of v.groepen) {
    if (!g.blad) { uit.push({ namen: g.namen, overgeslagen: 'Deze vragen kunnen niet op een oefenblad.' }); continue; }
    const file = oefenbladen.save(g.blad);
    lib.move(file, map);
    let taak = null;
    if (geven) {
      const std = takenstandaard.voor(proeven.vakVan(rec.toets));
      const t = taken.maak({ soort: 'oefenblad', file, namen: g.namen, feedback: 'direct', uitslag: true, voorlees: std.voorlees, vanaf, tot, pogingen });
      taak = t.id;
    }
    uit.push({ file, titel: g.blad.title, namen: g.namen, vragen: g.vragen, doelen: g.doelen, taak_id: taak });
  }
  return { titel: rec.title, map, bladen: uit, zonder: v.zonder, nogTeVerbeteren: v.nogTeVerbeteren };
}

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

// De afname van een taak (of een afname-bestand) voor het scherm en de connector.
function afnameVan({ taak_id, afname } = {}) {
  if (afname) return proeven.laadAfname(require('path').basename(String(afname)));
  const t = taken.lijst().find(x => x.id === taak_id);
  if (!t) throw new Error('Die taak bestaat niet (meer).');
  if (t.soort !== 'proef') throw new Error('Remediëring kan alleen na een toets.');
  const a = t.afname || (proeven.afnameVanTaak(taak_id) || {}).file;
  if (!a) throw new Error('Er is nog niets ingeleverd voor deze toets.');
  return proeven.laadAfname(a);
}

// Kort voor het scherm: wie krijgt wat (zonder de bladen zelf).
function samenvatting(v) {
  return { titel: v.titel, groepen: v.groepen.map(g => ({ namen: g.namen, vragen: g.vragen, doelen: g.doelen, kan: !!g.blad })), zonder: v.zonder.map(z => z.naam), nogTeVerbeteren: v.nogTeVerbeteren };
}

module.exports = { fouten, blad, voorstel, maak, afnameVan, samenvatting, MAP };
