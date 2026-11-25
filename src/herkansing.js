// Herkansing met één klik (wensenlijst 25 nov, punt 6): een kopie van de toets, alleen voor wie onder de grens bleef.
// Wie onder de grens zit, rekent LANcelot zoals Opvolgen › Punten: over de toets en zijn herkansingen, met wat telt
// (hoogste, laatste…). Wie nog niet helemaal verbeterd is of de toets niet maakte, krijgt niets (dat zie je wel staan).
// De kopie heet "<titel> · herkansing", staat in dezelfde map en krijgt de keuzes van de eerste keer (voorlezen, volgorde,
// punten tonen, tijdslimiet…). Bestaat zo'n kopie al, dan wordt die opnieuw gebruikt. De nieuwe taak telt als herkansing
// in Opvolgen › Punten. De toets zelf en de punten van de eerste keer veranderen niet.
const proeven = require('./proeven');
const taken = require('./taken');
const punten = require('./punten');
const opvolgen = require('./opvolgen');

const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const ACHTER = ' · herkansing';

// De groep kolommen (toets + herkansingen) waar deze kolom bij hoort, oudste eerst.
function groep(ov, kolom) {
  const herk = (ov.telt && ov.telt.herk) || {};
  const eerste = punten.eerste(String(kolom || ''), herk);
  const ks = ov.kolommen.filter(k => k.soort === 'proef' && punten.eerste(k.id, herk) === eerste)
    .sort((a, b) => String(a.dag || '').localeCompare(String(b.dag || '')));
  if (!ks.length) throw new Error('Die toets staat niet bij Opvolgen (of is geen toets).');
  return { eerste, ks };
}

// Wie krijgt de herkansing? grens = deel van de punten (0.5 = onder de helft).
function voorstel({ kolom, grens = 0.5 } = {}) {
  const g = Number(grens);
  if (!(g > 0 && g <= 1)) throw new Error('De grens is een procent tussen 1 en 100.');
  const ov = opvolgen.overzicht();
  const { eerste, ks } = groep(ov, kolom);
  const keuze = (ov.telt.telt || {})[eerste] || ov.telt.standaard || 'hoogste';
  const laag = [], hoog = [], open = [], niet = [];
  for (const r of ov.rijen) {
    const k = key(r.naam);
    if (!ks.some(c => c.vakjes[k])) continue;
    const pog = ks.map(c => c.vakjes[k]).filter(v => v && v.status === 'klaar' && v.max);
    const t = punten.telt(pog, keuze);
    const nogOpen = ks.some(c => c.vakjes[k] && c.vakjes[k].status === 'verbeteren');
    if (!t) { (nogOpen ? open : niet).push(r.naam); continue; }
    const procent = Math.round((t.punten / t.max) * 100);
    (t.punten / t.max < g - 1e-9 ? laag : hoog).push({ naam: r.naam, punten: t.punten, max: t.max, procent });
  }
  const toets = ks[0].toets;
  return {
    kolom: eerste, laatste: ks[ks.length - 1].id, titel: ks[0].titel, toets: toets || null, grens: Math.round(g * 100), telt: keuze,
    herkansingen: ks.length - 1, laag, hoog: hoog.length, nogTeVerbeteren: open, nietGemaakt: niet,
    kopie: toets ? kopieNaam(toets) : null,
  };
}

function kopieNaam(file) {
  try { const t = proeven.load(file); return `${basis(t.title)}${ACHTER}`.slice(0, 100); } catch { return null; }
}
// "Toets · herkansing" van een herkansing blijft "Toets · herkansing".
const basis = titel => String(titel || '').replace(/\s*[·-]\s*herkansing( \d+)?\s*$/i, '').trim();

// De kopie van de toets: een bestaande "… · herkansing" opnieuw, anders een nieuwe in dezelfde map.
function kopie(file) {
  const t = proeven.load(file);
  const titel = `${basis(t.title)}${ACHTER}`.slice(0, 100);
  if (key(t.title) === key(titel)) return { file, titel, nieuw: false };
  const er = proeven.list().find(x => key(x.title) === key(titel));
  if (er) return { file: er.file, titel: er.title, nieuw: false };
  t.title = titel;
  const bewaard = proeven.save(t, null);
  const map = proeven.lib.places()(file);
  if (map) proeven.lib.move(bewaard, map);
  return { file: bewaard, titel, nieuw: true };
}

// Geven: de kopie (of dezelfde toets) als taak aan wie onder de grens bleef, gekoppeld als herkansing.
// namen = zelf kiezen (moet een deel van de leerlingen van deze toets zijn); droog = alleen tonen wat er zou gebeuren.
function geef({ kolom, grens = 0.5, namen, metKopie = true, vanaf, tot, pogingen, droog = false } = {}) {
  const v = voorstel({ kolom, grens });
  if (!v.toets) throw new Error('De toets van deze kolom bestaat niet meer; een herkansing kan niet.');
  let wie = v.laag.map(l => l.naam);
  if (Array.isArray(namen) && namen.length) {
    const ov = opvolgen.overzicht();
    const { ks } = groep(ov, kolom);
    const mag = new Map(ov.rijen.filter(r => ks.some(c => c.vakjes[key(r.naam)])).map(r => [key(r.naam), r.naam]));
    const fout = namen.filter(n => !mag.has(key(n)));
    if (fout.length) throw new Error(`Deze leerlingen maakten de toets niet: ${fout.join(', ')}.`);
    wie = [...new Set(namen.map(n => mag.get(key(n))))];
  }
  if (!wie.length) throw new Error(`Niemand zit onder ${v.grens}%: er is geen herkansing nodig.`);
  if (droog) return { ...v, namen: wie, gegeven: false };
  const k = metKopie ? kopie(v.toets) : { file: v.toets, titel: v.titel, nieuw: false };
  // De keuzes van de eerste keer (als dat een taak was).
  const oud = taken.lijst().find(x => x.id === v.kolom) || taken.lijst().find(x => x.id === v.laatste);
  let keuzes = {};
  if (oud) {
    try {
      const kz = taken.keuzesVoor(oud.id);
      keuzes = { feedback: kz.feedback, voorlees: kz.voorlees, vragenVast: kz.volgorde !== 'schud', keuzesVast: kz.volgorde === 'alles', uitslag: kz.uitslag, beveiligd: !!oud.beveiligd, tijd: kz.tijd || undefined, tijdPer: kz.tijdPer || undefined };
    } catch {}
  }
  const t = taken.maak({ soort: 'proef', file: k.file, namen: wie, ...keuzes, vanaf, tot, pogingen });
  try { punten.koppel({ kolom: t.id, van: v.kolom }); } catch {}
  return { ...v, namen: wie, gegeven: true, taak_id: t.id, file: k.file, kopieTitel: k.titel, nieuweKopie: k.nieuw };
}

module.exports = { voorstel, geef, kopie, basis, ACHTER };
