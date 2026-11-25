// Deel 3 van de connector (wens 25 nov): Peilen. Peilingen (De Ronde Tafel: polls, stellingen, woordwolken, open
// vragen, schalen) maken, bijwerken, op het bord klaarzetten en de antwoorden lezen; voorkennis activeren (een peiling
// aan het begin van de les) en voorkennis peilen (een quiz met namen in de map Voorkennis/<map van de lessen>).
//
// Zelfde afspraken als de rest van de connector: niets verwijderen (een bijgewerkte peiling bewaart eerst de vorige
// versie in rondetafel/_versies), schrijven enkel als de leerkracht het toeliet, leerlingen antwoorden anoniem.
const fs = require('fs');
const path = require('path');
const rondetafel = require('./rondetafel');
const results = require('./results');
const quizzes = require('./quizzes');

const VOORKENNIS_MAP = 'Voorkennis';
const VK_QUIZ = /^voorkennis\s+les\s*(\d{1,3})\b\s*[·:.\-–]?\s*(.*)$/i;

function maak(ctx) {
  const { fout, mapMaken } = ctx;
  const hooks = () => ctx.hooks();

  const S = (description, extra) => ({ type: 'string', description, ...extra });
  const B = description => ({ type: 'boolean', description });
  const obj = (properties, required) => ({ type: 'object', properties, ...(required ? { required } : {}), additionalProperties: false });
  const DOEL = S('voorkennis = voorkennis activeren bij de start van een les (komt standaard in de map "Voorkennis"). Leeg = gewone peiling.', { enum: ['voorkennis', ''] });

  const json = (v, wat) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { fout(`"${wat}" is geen geldige JSON.`); }
  };

  const bestaat = file => {
    if (typeof file !== 'string' || !file) fout('Geef "file" (zie de tool "peilingen").');
    const f = path.basename(file);
    if (!f.endsWith('.json') || f.startsWith('_') || !fs.existsSync(path.join(rondetafel.DIR, f))) fout(`De peiling "${file}" bestaat niet.`);
    return f;
  };

  function versieBewaren(file) {
    const bron = path.join(rondetafel.DIR, file);
    if (!fs.existsSync(bron)) return;
    const map = path.join(rondetafel.DIR, '_versies');
    fs.mkdirSync(map, { recursive: true });
    const stempel = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').replace('Z', '');
    let naam = `${stempel}_${file}`;
    for (let i = 2; fs.existsSync(path.join(map, naam)); i++) naam = `${stempel}~${i}_${file}`;
    fs.copyFileSync(bron, path.join(map, naam));
  }

  const isVoorkennis = (x, map) => /^voorkennis(\/|$)/i.test(map || '') || /voorkennis/i.test(x.title || '');

  // ---------- Lezen ----------

  function peilingenLijst({ zoek, map, voorkennis } = {}) {
    const z = String(zoek || '').toLowerCase();
    const m = String(map || '').toLowerCase();
    const lijst = rondetafel.list()
      .filter(x => (!z || x.title.toLowerCase().includes(z) || x.file.includes(z)) && (!m || (x.folder || '').toLowerCase().startsWith(m)))
      .filter(x => !voorkennis || isVoorkennis(x, x.folder));
    return {
      aantal: lijst.length,
      peilingen: lijst.slice(0, 150).map(x => ({ file: x.file, titel: x.title, map: x.folder || '', vragen: x.count, ...(isVoorkennis(x, x.folder) ? { voorkennis: true } : {}) })),
      mappen: rondetafel.lib.folders(),
      live: liveKort(),
    };
  }

  function peilingLezen({ file } = {}) {
    const f = bestaat(file);
    return { file: f, map: rondetafel.lib.places()(f) || '', peiling: rondetafel.load(f) };
  }

  function liveKort() {
    const rt = hooks().rondeTafel && hooks().rondeTafel();
    if (!rt || !rt.active) return null;
    return { titel: rt.session.title, fase: rt.phase, vraag: rt.index + 1, vragen: rt.session.items.length, deelnemers: rt.participants.size };
  }

  // Een resultaat (CSV) van De Ronde Tafel omzetten naar iets leesbaars.
  function csvRijen(tekst) {
    return tekst.replace(/^﻿/, '').split(/\r?\n/).map(r => {
      const cellen = [];
      let c = '', q = false;
      for (let i = 0; i < r.length; i++) {
        const t = r[i];
        if (q) { if (t === '"' && r[i + 1] === '"') { c += '"'; i++; } else if (t === '"') q = false; else c += t; }
        else if (t === '"') q = true;
        else if (t === ';') { cellen.push(c); c = ''; }
        else c += t;
      }
      cellen.push(c);
      return cellen.map(x => x.replace(/^'(?=[=+\-@])/, ''));
    });
  }

  function leesResultaat(file) {
    const rijen = csvRijen(fs.readFileSync(results.filePath(file), 'utf8'));
    if ((rijen[0] || [])[0] !== 'Ronde Tafel') fout(`"${file}" is geen resultaat van een peiling.`);
    const uit = { file, titel: rijen[0][1] || '', datum: '', deelnemers: 0, vragen: [] };
    let v = null, kop = false;
    for (const r of rijen.slice(1)) {
      const [a, b, c] = r;
      if (a === 'Datum' && !v) { uit.datum = b; continue; }
      if (a === 'Deelnemers' && !v) { uit.deelnemers = Number(b) || 0; continue; }
      if (!a && r.length <= 1) continue;
      const nr = /^Vraag (\d+)$/.exec(a);
      if (nr) { v = { nr: Number(nr[1]), vraag: b, soort: '' }; uit.vragen.push(v); kop = false; continue; }
      if (!v) continue;
      if (a === 'Soort' && !v.soort) { v.soort = b; continue; }
      if (a === 'Antwoorden van') { v.antwoorden_van = parseInt(b, 10) || 0; continue; }
      if (!kop) { kop = true; continue; } // de kopregel (Keuze;Stemmen;% enz.)
      if (v.soort === 'Meerkeuze') (v.keuzes = v.keuzes || []).push({ keuze: a, stemmen: Number(b) || 0, procent: c });
      else if (v.soort === 'Schaal') {
        if (a === 'Gemiddelde') v.gemiddelde = b === '-' ? null : Number(String(b).replace(',', '.'));
        else (v.scores = v.scores || []).push({ score: a, stemmen: Number(b) || 0, procent: c });
      } else if (v.soort === 'Woordwolk') (v.woorden = v.woorden || []).push({ woord: a, aantal: Number(b) || 0 });
      else (v.antwoorden = v.antwoorden || []).push(a);
    }
    return uit;
  }

  // De live sessie: per vraag de stand (zonder verborgen antwoorden), anoniem.
  function liveStand(rt) {
    return {
      titel: rt.session.title, fase: rt.phase, huidige_vraag: rt.index + 1, deelnemers: rt.participants.size,
      vragen: rt.session.items.map((item, i) => {
        const s = rt.summary(i);
        const v = { nr: i + 1, vraag: item.question, soort: rondetafel.TYPE_NAMES[item.type], antwoorden_van: s.respondents };
        if (item.type === 'keuze') v.keuzes = item.options.map((o, j) => ({ keuze: o, stemmen: s.counts[j] }));
        else if (item.type === 'schaal') Object.assign(v, { scores: s.counts.map((n, j) => ({ score: j + 1, stemmen: n })), gemiddelde: s.avg === null ? null : Math.round(s.avg * 10) / 10, min: item.min, max: item.max });
        else if (item.type === 'woorden') v.woorden = s.words.map(w => ({ woord: w.text, aantal: w.n }));
        else v.antwoorden = s.open.map(a => a.text);
        return v;
      }),
    };
  }

  function peilingResultaten({ file, zoek, van, tot, live } = {}) {
    const rt = hooks().rondeTafel && hooks().rondeTafel();
    if (live) {
      if (!rt || !rt.active) return { live: null, uitleg: 'Er loopt nu geen peiling op het bord.' };
      return { live: liveStand(rt) };
    }
    if (file) return leesResultaat(path.basename(String(file)));
    const z = String(zoek || '').toLowerCase();
    const lijst = results.items().filter(r => r.soort === 'Ronde Tafel').map(r => {
      const m = r.file.match(/^(\d{4}-\d\d-\d\d)_(\d\d)(\d\d)/);
      return { file: r.file, titel: r.title, datum: m ? `${m[1]}T${m[2]}:${m[3]}` : '' };
    }).filter(r => (!z || r.titel.toLowerCase().includes(z)) && (!van || r.datum.slice(0, 10) >= van) && (!tot || r.datum.slice(0, 10) <= tot));
    return {
      aantal: lijst.length, resultaten: lijst.slice(0, 100), live: rt && rt.active ? liveKort() : null,
      uitleg: 'Geef "file" voor de antwoorden per vraag (stemmen, woorden, open antwoorden). Een peiling die nu loopt: "live": true. Leerlingen antwoorden anoniem: er staan geen namen in.',
    };
  }

  function voorkennisLijst({ map } = {}) {
    const m = String(map || '').toLowerCase();
    const quizzen = quizzes.list()
      .filter(q => /^voorkennis(\/|$)/i.test(q.folder || ''))
      .map(q => {
        const k = VK_QUIZ.exec(q.title);
        const lesMap = String(q.folder).replace(/^voorkennis\/?/i, '');
        return { file: q.file, titel: q.title, map: q.folder, lessen_map: lesMap, les: k ? Number(k[1]) : null, vragen: q.count, gekoppeld_aan_les: !!(k && lesMap) };
      })
      .filter(q => !m || q.lessen_map.toLowerCase().startsWith(m) || q.map.toLowerCase().startsWith(m));
    const activaties = rondetafel.list().filter(x => isVoorkennis(x, x.folder))
      .map(x => ({ file: x.file, titel: x.title, map: x.folder || '', vragen: x.count }));
    return {
      activeren: activaties,
      peilen: quizzen,
      uitleg: 'Voorkennis ACTIVEREN = een peiling (anoniem, op het bord): woordwolk, stellingen, schaal, open vraag. Maak ze met "peiling_maken" (doel "voorkennis"), zet ze klaar met "peiling_starten". '
        + 'Voorkennis PEILEN = een quiz met namen en juiste antwoorden over wat ze uit vorige leerjaren moeten kennen, in de map "Voorkennis/<map van de lessen>" met de titel "Voorkennis les <nr> · <onderwerp>": dan staat ze bij die les in De Kronieken en De Zonnewijzer. Maak ze met "voorkennisquiz_maken"; spelen in het Toernooi of als taak ("taak_geven" met soort quiz); resultaten met "quiz_resultaten".',
    };
  }

  // ---------- Klaarzetten ----------

  function peilingBewaren({ peiling, file, map, titel, doel, dubbel_mag } = {}) {
    let x = json(peiling, 'peiling');
    let f = null;
    if (file) {
      f = bestaat(file);
      if (x === undefined) x = rondetafel.load(f);
    }
    if (!x || typeof x !== 'object') fout('Geef "peiling" als JSON: { "title": "...", "items": [ { "type": "keuze" | "woorden" | "open" | "schaal", "question": "..." } ] }.');
    if (titel !== undefined) x = { ...x, title: String(titel) };
    let schoon;
    try { schoon = rondetafel.validate(x); } catch (err) { fout(`Niet bewaard: ${err.message}`); }
    if (!f && !dubbel_mag) {
      const zelfde = rondetafel.list().find(y => y.title.trim().toLowerCase() === schoon.title.trim().toLowerCase());
      if (zelfde) fout(`Er bestaat al een peiling "${zelfde.title}" (file: ${zelfde.file}). Werk die bij met "peiling_bijwerken", of geef "dubbel_mag": true.`);
    }
    if (f) versieBewaren(f);
    const bewaard = rondetafel.save(schoon, f);
    let inMap = rondetafel.lib.places()(bewaard) || '';
    const doelMap = map !== undefined ? map : (!f && doel === 'voorkennis' ? VOORKENNIS_MAP : undefined);
    if (doelMap !== undefined) { inMap = doelMap ? mapMaken(rondetafel.lib, doelMap) : ''; rondetafel.lib.move(bewaard, inMap); }
    hooks().naBib('sessie');
    return {
      file: bewaard, titel: schoon.title, map: inMap, vragen: schoon.items.length, nieuw: !f,
      ...(f ? { melding: 'Bijgewerkt. De vorige versie is bewaard.' } : {}),
      volgende_stap: 'Op het bord zetten met "peiling_starten" (de leerkracht leidt ze daarna op het bord), of later zelf in LANcelot › Peilen › Peilingen.',
    };
  }

  function peilingStarten({ file } = {}) {
    const f = bestaat(file);
    const h = hooks();
    if (!h.peilingStarten) fout('Een peiling op het bord zetten kan hier niet.');
    const sessie = rondetafel.load(f);
    h.peilingStarten(sessie);
    const poort = (h.gezondheid() || {}).poort || 3000;
    return {
      file: f, titel: sessie.title, vragen: sessie.items.length, status: 'klaar op het bord',
      uitleg: `Het welkomstscherm met de QR-code staat klaar. De leerkracht opent De Ronde Tafel op het bord (http://localhost:${poort}/rondetafel) en gaat zelf van vraag naar vraag. De leerlingen doen mee via de gewone LANcelot-link. Antwoorden volgen met "peiling_resultaten" en "live": true.`,
    };
  }

  function peilingStoppen() {
    const h = hooks();
    const rt = h.rondeTafel && h.rondeTafel();
    if (!rt || !rt.active) fout('Er loopt nu geen peiling op het bord.');
    const titel = rt.session.title;
    const bestand = h.peilingStoppen();
    return { titel, gestopt: true, resultaat: bestand || null, uitleg: bestand ? 'De antwoorden zijn bewaard: lees ze met "peiling_resultaten" en deze file.' : 'Er was nog niets geantwoord, dus er is geen resultaat.' };
  }

  function voorkennisquizMaken({ quiz, lessen_map, les, onderwerp, dubbel_mag } = {}) {
    const q = json(quiz, 'quiz');
    if (!q || typeof q !== 'object') fout('Geef "quiz" als JSON (zie "formaat" met soort quiz).');
    const nr = Number(les);
    if (!Number.isInteger(nr) || nr < 1 || nr > 999) fout('Geef "les": het nummer van de les (bv. 12).');
    const lm = String(lessen_map || '').split('/').map(s => s.trim()).filter(Boolean).join('/');
    if (!lm) fout('Geef "lessen_map": de map van de lessen in Maken, bv. "Wiskunde/Blok 3" (zie "mappen" met soort quiz).');
    if (/^voorkennis(\/|$)/i.test(lm)) fout('Geef de map van de lessen zelf (bv. "Wiskunde/Blok 3"), zonder "Voorkennis/" ervoor.');
    const ond = String(onderwerp || '').trim() || String(q.title || '').replace(VK_QUIZ, '$2').trim();
    const title = `Voorkennis les ${nr}${ond ? ` · ${ond}` : ''}`.slice(0, 100);
    const maken = ctx.tool('quiz_maken');
    const r = maken.fn({ quiz: { ...q, title }, map: `${VOORKENNIS_MAP}/${lm}`, dubbel_mag });
    const bestaatMap = quizzes.lib.folders().some(f => f.toLowerCase() === lm.toLowerCase());
    return {
      ...r, les: nr, lessen_map: lm,
      ...(bestaatMap ? {} : { let_op: `Er is (nog) geen quizmap "${lm}" met lessen. De voorkennisquiz staat bij een les zodra er in "${lm}" een quiz "Les ${nr} …" staat.` }),
      volgende_stap: 'Spelen in het Toernooi (met namen; de tekorten komen in Zorg) of als taak met "taak_geven" (soort quiz). Resultaten: "quiz_resultaten".',
    };
  }

  // ---------- De tools ----------

  const PEILING = { type: ['object', 'string'], description: '{ "title": "korte titel", "items": [ { "type": "woorden", "question": "..." }, { "type": "keuze", "question": "...", "options": ["Eens", "Twijfel", "Oneens"] }, { "type": "schaal", "question": "...", "min": "bij 1", "max": "bij 5" }, { "type": "open", "question": "..." } ] }' };
  const t = r => ({ titel: r.titel, file: r.file });

  return [
    { name: 'peilingen', title: 'Peilingen opzoeken', description: 'Alle peilingen (Peilen › Peilingen, De Ronde Tafel): file, titel, map, aantal vragen, of het een voorkennis-activering is. Ook of er nu een peiling op het bord loopt. Kijk hier eerst, zodat je niets dubbel maakt.', inputSchema: obj({ zoek: S('Stuk van de titel (optioneel).'), map: S('Alleen deze map en haar submappen.'), voorkennis: B('Alleen peilingen om voorkennis te activeren.') }), fn: peilingenLijst },
    { name: 'peiling', title: 'Peiling lezen', description: 'Eén peiling volledig: titel en alle vragen met hun soort en keuzes.', inputSchema: obj({ file: S('Bestandsnaam van de peiling.') }, ['file']), fn: peilingLezen },
    { name: 'peiling_resultaten', title: 'Resultaten van peilingen', description: 'De gespeelde peilingen, nieuwste eerst. Met "file": per vraag de stemmen per keuze, de schaal met gemiddelde, de woorden van de woordwolk en de open antwoorden. Met "live": true de stand van de peiling die nu op het bord loopt. Anoniem: geen namen.', inputSchema: obj({ file: S('Een resultaat uit de lijst.'), zoek: S('Stuk van de titel.'), van: S('JJJJ-MM-DD'), tot: S('JJJJ-MM-DD'), live: B('De peiling die nu loopt.') }), fn: peilingResultaten },
    { name: 'voorkennis', title: 'Voorkennis', description: 'Wat er klaarstaat om voorkennis te activeren (peilingen) en te peilen (voorkennisquizzen per les, in de map Voorkennis), met uitleg hoe je ze maakt en gebruikt.', inputSchema: obj({ map: S('Alleen de lessen van deze map, bv. "Wiskunde/Blok 3".') }), fn: voorkennisLijst },

    { name: 'peiling_maken', schrijft: true, title: 'Peiling maken', description: 'Een nieuwe peiling bewaren (Peilen › Peilingen). 1 tot 50 vragen; soorten: "keuze" (meerkeuze of stelling, 2 tot 6 keuzes, geen goed of fout), "woorden" (woordwolk, 1 tot 3 woorden per leerling), "open" (korte zin), "schaal" (1 tot 5, met "min" en "max"). Vragen hooguit 200 tekens, keuzes hooguit 80. Voorkennis activeren (doel "voorkennis"): begin met een woordwolk over wat ze al weten, dan een of twee stellingen over wat leerlingen vaak verkeerd denken (met "Ik weet het niet" als keuze), een schaal hoe goed ze het al kennen en sluit af met een open vraag wat ze nog willen weten. Bestaat de titel al: een fout, nooit stil overschrijven.', inputSchema: obj({ peiling: PEILING, map: S('Map, bv. "Wereldoriëntatie/Blok 2". Bestaat ze niet, dan maakt LANcelot ze.'), doel: DOEL, dubbel_mag: B('Toch een nieuwe peiling als de titel al bestaat.') }, ['peiling']), fn: peilingBewaren, log: (a, r) => t(r) },
    { name: 'peiling_bijwerken', schrijft: true, title: 'Peiling bijwerken', description: 'Een bestaande peiling aanpassen: de hele peiling opnieuw ("peiling": vragen toevoegen, wijzigen, weghalen, herordenen; lees ze eerst met "peiling"), een nieuwe titel en/of een andere map. De vorige versie blijft bewaard.', inputSchema: obj({ file: S('De peiling.'), peiling: PEILING, titel: S('Nieuwe titel.'), map: S('Andere map (leeg = bovenaan).') }, ['file']), fn: peilingBewaren, log: (a, r) => t(r) },
    { name: 'peiling_starten', schrijft: true, title: 'Peiling op het bord zetten', description: 'Een peiling klaarzetten op het bord: het welkomstscherm met de QR-code. De leerkracht leidt ze daarna zelf (vraag per vraag) in De Ronde Tafel. Kan niet als er al een spel of peiling loopt.', inputSchema: obj({ file: S('De peiling.') }, ['file']), fn: peilingStarten, log: (a, r) => t(r) },
    { name: 'peiling_stoppen', schrijft: true, title: 'Peiling stoppen', description: 'De peiling die op het bord loopt stoppen. Wat er al geantwoord is, wordt bewaard als resultaat.', inputSchema: obj({}), fn: peilingStoppen, log: (a, r) => ({ titel: r.titel, file: r.resultaat }) },
    { name: 'voorkennisquiz_maken', schrijft: true, title: 'Voorkennisquiz maken', description: 'Een quiz om voorkennis te peilen bij een les (met namen en juiste antwoorden, over wat ze uit vorige leerjaren moeten kennen). LANcelot geeft ze de titel "Voorkennis les <nr> · <onderwerp>" en zet ze in "Voorkennis/<lessen_map>", zodat ze bij die les staat in De Kronieken en De Zonnewijzer. Formaat van de quiz: zie "formaat" met soort quiz.', inputSchema: obj({ quiz: { type: ['object', 'string'], description: '{ title, questions: [...] } (de titel wordt "Voorkennis les <nr> · <onderwerp>").' }, lessen_map: S('De map van de lessen in Maken › Quizzen, bv. "Wiskunde/Blok 3".'), les: { type: 'integer', minimum: 1, maximum: 999, description: 'Het nummer van de les.' }, onderwerp: S('Kort onderwerp voor in de titel, bv. "breuken vereenvoudigen".'), dubbel_mag: B('Toch een nieuwe quiz als de titel al bestaat.') }, ['quiz', 'lessen_map', 'les']), fn: voorkennisquizMaken, log: (a, r) => t(r) },
  ];
}

module.exports = { maak };
