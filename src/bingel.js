// Export voor Bingel (wensenlijst 25 nov, punt 7): per leerling de score (standaard op 10) en een korte feedback,
// in de volgorde van de klaslijst, klaar om over te nemen of te plakken in Bingel. Bingel heeft geen importbestand dat we
// kennen, dus: een kolom punten (één per regel), een kolom feedback, of de hele tabel (ook als csv). Niets gaat naar internet.
// De punten rekent LANcelot zoals Opvolgen › Punten: met de herkansingen en wat telt (hoogste, laatste…).
// De feedback: een woord over het cijfer en wat nog te oefenen is (de doelen of delen van de toets waar het fout liep).
const proeven = require('./proeven');
const opvolgen = require('./opvolgen');
const punten = require('./punten');
const herkansing = require('./herkansing');
const remediering = require('./remediering');
const weekrapport = require('./weekrapport');

const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const OP = [10, 20, 100];
const rond = x => Math.round(x * 10) / 10;
const komma = x => String(x).replace('.', ',');

// Waar het fout liep, kort: de doelen (of de titel van het deel van de toets), hooguit twee.
function nogOefenen(afname, naam) {
  if (!afname) return [];
  let rec;
  try { rec = proeven.laadAfname(afname); } catch { return []; }
  const p = remediering.fouten(rec, { namen: [naam] })[0];
  if (!p) return [];
  const uit = [];
  for (const f of p.fout) {
    const d = f.q.doel ? weekrapport.kortDoel(weekrapport.doelTekst(f.q.doel)) : f.bron && f.bron.titel ? String(f.bron.titel).trim() : '';
    if (d && !uit.some(x => x.toLowerCase() === d.toLowerCase())) uit.push(d);
  }
  return uit.slice(0, 2);
}

function feedback(op10, oefenen) {
  const z = [];
  if (op10 >= 9) z.push('Knap gedaan!');
  else if (op10 >= 7) z.push('Goed gewerkt.');
  else if (op10 >= 5) z.push('Voldoende, maar nog wat oefenen.');
  else z.push('Dit was nog moeilijk.');
  if (oefenen.length && op10 < 10) z.push(`Nog oefenen: ${oefenen.join('; ')}.`);
  return z.join(' ');
}

// kolom = id uit Opvolgen (taak-id of "afname:<bestand>"); op = 10, 20, 100 of 0 (zoals de toets).
function data({ kolom, op = 10 } = {}) {
  const o = Number(op);
  if (o && !OP.includes(o)) throw new Error('Omrekenen kan op 10, 20 of 100 (of 0: zoals de toets).');
  const ov = opvolgen.overzicht();
  const { eerste, ks } = herkansing.groep(ov, kolom);
  const keuze = (ov.telt.telt || {})[eerste] || ov.telt.standaard || 'hoogste';
  const rijen = [];
  for (const r of ov.rijen) {
    const k = key(r.naam);
    const doet = ks.some(c => c.vakjes[k]);
    const pog = ks.map(c => (c.vakjes[k] && c.vakjes[k].status === 'klaar' && c.vakjes[k].max ? { ...c.vakjes[k], afname: c.afname } : null)).filter(Boolean);
    const t = punten.telt(pog, keuze);
    if (!t) {
      const open = ks.some(c => c.vakjes[k] && c.vakjes[k].status === 'verbeteren');
      rijen.push({ naam: r.naam, score: null, op10: null, feedback: '', stand: !doet ? 'niet voor deze leerling' : open ? 'nog te verbeteren' : 'niet gemaakt' });
      continue;
    }
    const op10 = rond((t.punten / t.max) * 10);
    const score = o ? rond((t.punten / t.max) * o) : rond(t.punten);
    rijen.push({ naam: r.naam, score, max: o || t.max, op10, feedback: feedback(op10, nogOefenen(t.afname, r.naam)) });
  }
  const totaal = ks[0].toets ? (() => { try { return proeven.list().find(x => x.file === ks[0].toets) || null; } catch { return null; } })() : null;
  return { kolom: eerste, titel: ks[0].titel, vak: ks[0].vak || '', dag: ks[0].dag || '', op: o, telt: keuze, herkansingen: ks.length - 1, toets: totaal ? totaal.file : null, rijen };
}

// Tekst om te plakken: punten (één per regel), feedback (één per regel) of de hele tabel (tab gescheiden).
function tekst(d, wat = 'tabel') {
  const s = r => (r.score === null ? '' : komma(r.score));
  if (wat === 'punten') return d.rijen.map(s).join('\n');
  if (wat === 'feedback') return d.rijen.map(r => r.feedback).join('\n');
  const kop = ['Naam', d.op ? `Op ${d.op}` : 'Punten', 'Feedback'];
  return [kop, ...d.rijen.map(r => [r.naam, s(r), r.feedback || r.stand || ''])].map(x => x.join('\t')).join('\n');
}

module.exports = { data, tekst, feedback, OP };
