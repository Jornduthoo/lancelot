// De Zegelrol: het rekenwerk van een rapport. Dezelfde code draait op de server (evolutie over vorige rapporten)
// en in de browser (editor, rapportblad), zodat een percent overal hetzelfde is.
// Punten: een eigen getal van de leerkracht gaat voor, anders de punten uit De Proef. 'A' = afwezig, 'V' = vrijgesteld: telt niet mee.
// Een vak kan domeinen hebben (Frans: Woordenschat, Lezen...). Hebben domeinen een gewicht, dan telt het vak die gewogen;
// anders gewoon alle punten samen. Het eindtotaal weegt de vakken met hun gewicht (geen gewichten = elk vak even zwaar).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZrReken = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const rond = n => Math.round(n * 10) / 10;

  function waarde(data, lid, o) {
    const l = data.rapport.leerlingen[lid];
    const eigen = l && l.p[o.id];
    if (eigen !== undefined) return { w: eigen, eigen: true };
    const a = o.toets && data.auto && data.auto[o.id] && data.auto[o.id].punten[lid];
    if (a) return { w: a.p, open: a.open > 0, auto: true };
    return { w: null };
  }

  function som(data, lid, onderdelen) {
    let p = 0;
    let m = 0;
    let open = false;
    for (const o of onderdelen) {
      const v = waarde(data, lid, o);
      if (typeof v.w === 'number') { p += v.w; m += o.max; }
      if (v.open) open = true;
    }
    return { p: rond(p), m, pct: m ? Math.round(p / m * 100) : null, open };
  }

  // De onderdelen per domein (zonder domein = '').
  function vanDomein(vak, id) {
    const bekend = new Set((vak.domeinen || []).map(d => d.id));
    return vak.onderdelen.filter(o => (id ? o.domein === id : !bekend.has(o.domein)));
  }

  // Gewichten: wie geen gewicht kreeg, deelt wat overblijft tot 100% (blijft er niets over, dan telt hij niet mee).
  function gewichten(lijst) {
    if (!lijst.some(x => x.gewicht > 0)) return lijst.map(() => 1);
    const vast = lijst.reduce((s, x) => s + (x.gewicht || 0), 0);
    const zonder = lijst.filter(x => !(x.gewicht > 0)).length;
    const rest = zonder && vast < 100 ? (100 - vast) / zonder : 0;
    return lijst.map(x => (x.gewicht > 0 ? x.gewicht : rest));
  }
  // Een gewogen gemiddelde van percenten; lege (null) tellen niet mee.
  function gewogen(pcts, gw) {
    let s = 0;
    let w = 0;
    pcts.forEach((p, i) => { if (p !== null && gw[i]) { s += p * gw[i]; w += gw[i]; } });
    return w ? Math.round(s / w) : null;
  }

  function totaal(data, lid, vak) {
    const t = som(data, lid, vak.onderdelen);
    const doms = vak.domeinen || [];
    if (!doms.some(d => d.gewicht > 0) || t.pct === null) return t;
    const groepen = [...doms, { id: '', gewicht: 0 }].map(d => ({ d, lijst: vanDomein(vak, d.id) })).filter(g => g.lijst.length);
    const pct = gewogen(groepen.map(g => som(data, lid, g.lijst).pct), gewichten(groepen.map(g => g.d)));
    if (pct === null) return t;
    return { ...t, pct, p: rond(pct / 100 * t.m), gewogen: true };
  }

  function eind(data, lid) {
    const vakken = data.rapport.vakken.filter(v => v.punten && v.onderdelen.length);
    return gewogen(vakken.map(v => totaal(data, lid, v).pct), gewichten(vakken));
  }

  const gem = lijst => {
    const x = lijst.filter(n => n !== null && n !== undefined);
    return x.length ? Math.round(x.reduce((a, b) => a + b, 0) / x.length) : null;
  };
  const ids = data => data.klas.leerlingen.map(l => l.id);
  const klasVak = (data, vak) => gem(ids(data).map(id => totaal(data, id, vak).pct));
  const klasEind = data => gem(ids(data).map(id => eind(data, id)));
  // Het klasgemiddelde van één toets, in punten op het maximum van die toets.
  function klasToets(data, o) {
    const w = ids(data).map(id => waarde(data, id, o).w).filter(x => typeof x === 'number');
    if (!w.length) return null;
    return { gem: rond(w.reduce((a, b) => a + b, 0) / w.length), min: Math.min(...w), max: Math.max(...w), n: w.length };
  }

  // Per leerling: het percent per vak (op naam, kleine letters) en het eindtotaal. Voor de evolutie over rapporten.
  function percenten(data) {
    const per = {};
    for (const id of ids(data)) {
      per[id] = { _eind: eind(data, id) };
      for (const v of data.rapport.vakken) if (v.punten) { const t = totaal(data, id, v); if (t.pct !== null) per[id][v.naam.toLowerCase()] = t.pct; }
    }
    return per;
  }

  return { gewichten, waarde, som, totaal, eind, vanDomein, klasVak, klasEind, klasToets, percenten, gem };
});
