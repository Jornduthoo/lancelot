// De lessen van een map (Vak/Blok), samen voor De Kronieken en De Zonnewijzer.
// Een les = de quizzen en oefenbladen met een titel die begint met "Les 12", de voorkennisquiz in Voorkennis/<map>,
// en de pagina's in een boek die de leerkracht in De Kronieken aan die les koppelde.
const Lessen = (() => {
  const LES = /^les\s*(\d{1,3})\b\s*[·:.\-–]?\s*(.*)$/i;
  const VOORKENNIS = /^voorkennis\s+les\s*(\d{1,3})\b/i;
  const XL = /\(XL\)\s*$/i;
  // Een map "RekenenXL" of "XL" houdt de lange oefenbladen van dezelfde lessen: Rekenen/RekenenXL/Blok 3 hoort bij Rekenen/Blok 3.
  const zonderXL = f => String(f || '').split('/').filter(d => !/^\S*XL$/.test(d)).join('/');
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
      const xlMap = s.folder !== map && zonderXL(s.folder) === map;
      if (s.folder !== map && !xlMap) continue;
      const m = LES.exec(s.title);
      if (!m) continue;
      const l = les(Number(m[1]));
      if (XL.test(s.title) || xlMap) l.xl = l.xl || s;
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
    for (const it of [...(bron.quizzen || []), ...(bron.bladen || [])]) if (it.folder && !/^(Voorkennis|Hofschilder)(\/|$)/i.test(it.folder) && zonderXL(it.folder) === it.folder && LES.test(it.title)) s.add(it.folder);
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

  // Een oefening die je zelf aan een les koppelt (De Zonnewijzer): wat (quiz, oefenblad of toets) en hoe het start.
  // icoon = een tegel uit public/img/icons, teken = een emoji als er geen tegel is.
  const SPELEN = [['/host', 'Toernooi', 'toernooi'], ['/hofschilder', 'De Hofschilder', 'hofschilder'], ['/duel', 'Duel in de arena', 'duel'],
    ['/kerker', 'Ontsnap uit de kerker', 'kerker'], ['/burchtbouwers', 'Burchtbouwers', 'burcht'], ['/poortwacht', 'Poortwacht', 'poortwacht'],
    ['/gauntlet', 'Gauntlet', 'gauntlet'], ['/cybergalaga', 'Cyber-Galaga', 'cybergalaga'], ['/leraarbaas', 'Leraar-baas', 'leraarbaas'],
    ['/verrader', 'De Verrader', 'verrader'], ['/ridderrace', 'Ridderrace', 'strijdros'], ['/robopaarden', 'Robopaarden', 'robopaarden'],
    ['/toren', 'De prinses in de toren', 'toren'], ['/pixelridder', 'Pixelridder', 'pixelridder'], ['/neonvlucht', 'Neonvlucht', 'neonvlucht'], ['/raketridder', 'Raketridder', 'raketridder'], ['/splijtzwaard', 'Splijtzwaard', 'splijtzwaard'], ['/wankelwagen', 'Wankelwagen', 'wankelwagen'], ['/plasmapoort', 'Plasmapoort', 'plasmapoort'], ['/hooibergjacht', 'Hooibergjacht', 'hooibergjacht'],
    ['/diepboor', 'Diepboor', 'diepboor'], ['/schattenjacht', 'Schattenjacht', 'schattenjacht'], ['/kristalroof', 'Kristalroof', 'kristalroof'],
    ['/laserslag', 'Laserslag', 'laserslag'], ['/strijdrossen', 'Strijdrossen', 'strijdrossen'], ['/bomberknight', 'Bomber-Knight', 'bomberknight'],
    ['/neonduel', 'Neon Duel', 'neonduel'], ['/ridder-royale', 'Ridder-Royale', 'royale'], ['/sterrenvreter', 'Sterrenvreter', 'sterrenvreter'],
    ['/ridderslang', 'Ridderslang', 'ridderslang'], ['/packnight', 'Pac-Knight', 'packnight'], ['/robomol', 'Robomol', 'robomol'], ['/burchtstorm', 'Burchtstorm', 'burchtstorm']];
  const taak = { id: 'taak', naam: 'Als taak per leerling', teken: '📋' };
  const VORMEN = {
    quiz: [...SPELEN.map(([id, naam, icoon]) => ({ id, naam, icoon })), taak],
    oefenblad: [{ id: 'live', naam: 'Live in de klas', icoon: 'oefenblad' }, { id: 'print', naam: 'Afdrukken', teken: '🖨' }, taak],
    proef: [{ id: 'afnemen', naam: 'Toets afnemen', icoon: 'proef' }, { id: 'print', naam: 'Afdrukken', teken: '🖨' }],
  };
  const SOORTEN = { quiz: 'Quiz', oefenblad: 'Oefenblad', proef: 'Toets' };
  const vorm = o => (VORMEN[o.soort] || []).find(v => v.id === o.vorm) || (VORMEN[o.soort] || [])[0];
  function oefenLink(o) {
    const f = encodeURIComponent(o.file);
    const v = vorm(o).id;
    if (v === 'taak') return `/taken?soort=${o.soort}&file=${f}`;
    if (o.soort === 'quiz') return `${v}?quiz=${f}`;
    if (o.soort === 'proef') return v === 'print' ? `/proef-print?file=${f}` : `/proef?afnemen=${f}`;
    return v === 'print' ? `/oefenblad-print?file=${f}` : `/oefenblad?live=${f}`;
  }
  link.oefen = oefenLink;

  return { van, mappen, link, sleutel, zonderXL, VORMEN, SOORTEN, vorm };
})();
