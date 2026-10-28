// De lessen van een map (Vak/Blok), samen voor De Kronieken en De Zonnewijzer.
// Een les = de quizzen en oefenbladen met een titel die begint met "Les 12", de voorkennisquiz in Voorkennis/<map>,
// en de pagina's in een boek die de leerkracht in De Kronieken aan die les koppelde.
const Lessen = (() => {
  const LES = /^les\s*(\d{1,3})\b\s*[·:.\-–]?\s*(.*)$/i;
  const VOORKENNIS = /^voorkennis\s+les\s*(\d{1,3})\b/i;
  const XL = /\(XL\)\s*$/i;
  const sleutel = b => (b.soort === 'online' ? `online:${b.id}` : b.map ? `${b.map}/${b.naam}` : b.naam);

  // bron = { quizzen, bladen, kronieken: { bestanden, lessen } }
  function van(map, bron) {
    if (!map) return [];
    const per = new Map();
    const les = nr => {
      if (!per.has(nr)) per.set(nr, { nr, titel: '', quiz: null, voorkennis: null, blad: null, xl: null, links: [] });
      return per.get(nr);
    };
    for (const q of bron.quizzen || []) {
      if (q.folder === map) {
        const m = LES.exec(q.title);
        if (m) {
          const l = les(Number(m[1]));
          if (!l.quiz) l.quiz = q;
          if (!l.titel) l.titel = m[2];
        }
      } else if (q.folder === `Voorkennis/${map}`) {
        const m = VOORKENNIS.exec(q.title);
        if (m) les(Number(m[1])).voorkennis = q;
      }
    }
    for (const s of bron.bladen || []) {
      if (s.folder !== map) continue;
      const m = LES.exec(s.title);
      if (!m) continue;
      const l = les(Number(m[1]));
      if (XL.test(s.title)) l.xl = l.xl || s;
      else l.blad = l.blad || s;
      if (!l.titel) l.titel = m[2].replace(XL, '').trim();
    }
    const kr = bron.kronieken || {};
    const boeken = new Map((kr.bestanden || []).map(b => [sleutel(b), b]));
    for (const [nr, links] of Object.entries((kr.lessen || {})[map] || {})) {
      const l = les(Number(nr));
      l.links = (links || []).filter(x => boeken.has(x.boek)).map(x => ({ ...x, bestand: boeken.get(x.boek) }));
    }
    for (const l of per.values()) if (!l.titel && l.voorkennis) l.titel = l.voorkennis.title.replace(/^voorkennis\s+les\s*\d+\s*[·:.\-–]?\s*/i, '');
    return [...per.values()].sort((a, b) => a.nr - b.nr);
  }

  // De mappen met minstens één les, voor een keuzelijst.
  function mappen(bron) {
    const s = new Set();
    for (const it of [...(bron.quizzen || []), ...(bron.bladen || [])]) if (it.folder && !/^(Voorkennis|Hofschilder)(\/|$)/i.test(it.folder) && LES.test(it.title)) s.add(it.folder);
    return [...s].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
  }

  // Waar de knoppen van een les naartoe gaan.
  const link = {
    quiz: q => `/host?quiz=${encodeURIComponent(q.file)}`,
    blad: s => `/oefenblad?live=${encodeURIComponent(s.file)}`,
    print: s => `/oefenblad-print?file=${encodeURIComponent(s.file)}`,
    boek: (b, pagina) => `/kronieken?${new URLSearchParams({ map: b.map, naam: b.naam, pagina })}`,
    // Een online bordboek dat zich niet laat inbedden opent meteen op de site zelf, anders in de lezer van De Kronieken.
    online: (b, url) => (b.inbed === false ? url || b.url : `/kronieken?${new URLSearchParams({ online: b.id, url: url || '' })}`),
  };

  return { van, mappen, link, sleutel };
})();
