// Lijsten van quizzen en oefenbladen sneller: niet bij elke vraag naar de lijst elk bestand opnieuw lezen en ontleden,
// alleen wat veranderde (grootte of datum anders). Een bestand dat net veranderde (de laatste seconden), lezen we
// altijd opnieuw: sommige schijven tonen het tijdstip grof. Zelfde werkwijze als de lijst van de toetsen (proeven.js).
const fs = require('fs');
const path = require('path');

// Sorteren op titel zoals localeCompare(b, 'nl', { numeric: true }), maar veel sneller voor honderden titels.
const nl = new Intl.Collator('nl', { numeric: true });

function lijstMemo() {
  const memo = new Map();
  // item(dir, file, maak): maak(inhoud) geeft wat de lijst van dit bestand toont.
  function item(dir, file, maak) {
    const vol = path.join(dir, file);
    let st = null;
    try { st = fs.statSync(vol); } catch {}
    const sleutel = st ? `${st.size}|${st.mtimeMs}` : '';
    const oud = memo.get(vol);
    if (st && oud && oud.sleutel === sleutel && Date.now() - st.mtimeMs > 5000) return oud.item;
    const nieuw = maak(fs.readFileSync(vol, 'utf8'));
    if (st) memo.set(vol, { sleutel, item: nieuw });
    return nieuw;
  }
  // Bestanden die er niet meer zijn, vergeten.
  function houd(dir, namen) {
    const er = new Set(namen.map(f => path.join(dir, f)));
    for (const k of memo.keys()) if (!er.has(k)) memo.delete(k);
  }
  return { item, houd };
}

module.exports = { lijstMemo, nl };
