// Connector, deel 2 (wens 25 nov, uitgebreid): toetsen stap voor stap opbouwen (vragen toevoegen, wijzigen,
// verplaatsen, weghalen, beelden, niveaus, versies, veel tegelijk), quizzen en oefenbladen maken en bijwerken,
// mappen, de week exporteren en Mijn lesmap meteen laten synchroniseren.
// De teksten zijn voor de AI-assistent (nooit op een scherm), net als in src/connector-tools.js.
//
// Afspraken:
// - Elke wijziging bewaart eerst de vorige versie (<map>/_versies). Terugzetten kan met "toets_terugzetten".
// - Een toets die al gegeven werd, wordt nooit stil aangepast: de wijziging komt in een nieuwe toets (titel "(v2)").
// - Een quiz of oefenblad mag wel bijgewerkt worden: een taak bewaart zijn eigen kopie, lopend werk breekt niet.
// - Niets wordt verwijderd. Een vraag weghalen kan (de vorige versie blijft), een toets of quiz weggooien niet.
const fs = require('fs');
const path = require('path');
const proeven = require('./proeven');
const quizzes = require('./quizzes');
const oefenbladen = require('./oefenbladen');
const results = require('./results');
const taken = require('./taken');
const klas = require('./klas');
const K = proeven.K;

const NIVEAUS = ['schildknaap', 'page', 'ridder'];
const LETTERS = 'abcdefghijklmno';
const MAX_BULK = 50;

// ctx komt uit connector-tools.js: fout, toetsBestaat, isGegeven, mapMaken, toetsBewaren, toetsControleren, hooks, dag, vandaag.
function maak(ctx) {
  const { fout } = ctx;
  const hooks = () => ctx.hooks();

  // ---------- Hulp ----------

  const S = (description, extra) => ({ type: 'string', description, ...extra });
  const B = description => ({ type: 'boolean', description });
  const N = description => ({ type: 'integer', minimum: 1, description });
  const obj = (properties, required) => ({ type: 'object', properties, ...(required ? { required } : {}), additionalProperties: false });
  const NIVEAU = S('page, schildknaap of ridder. Leeg = schildknaap (het gewone niveau).', { enum: NIVEAUS });
  const SOORT = S('toets, quiz of oefenblad.', { enum: ['toets', 'quiz', 'oefenblad'] });

  const json = (v, wat) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { fout(`"${wat}" is geen geldige JSON.`); }
  };

  // Een vorige versie bewaren in <dir>/_versies, met een tijd tot op de seconde (nooit een oude overschrijven).
  function versieBewaren(dir, file) {
    const bron = path.join(dir, file);
    if (!fs.existsSync(bron)) return null;
    const map = path.join(dir, '_versies');
    fs.mkdirSync(map, { recursive: true });
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const stempel = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
    let naam = `${stempel}_${file}`;
    for (let i = 2; fs.existsSync(path.join(map, naam)); i++) naam = `${stempel}~${i}_${file}`;
    fs.copyFileSync(bron, path.join(map, naam));
    return naam;
  }
  function versiesVan(dir, file) {
    try {
      return fs.readdirSync(path.join(dir, '_versies')).filter(n => n.endsWith(`_${file}`)).sort().reverse()
        .map(n => ({ versie: n, bewaard: n.slice(0, n.length - file.length - 1) }));
    } catch { return []; }
  }

  const volgendeTitel = titel => {
    const m = String(titel).match(/^(.*) \(v(\d+)\)$/);
    return (m ? `${m[1]} (v${Number(m[2]) + 1})` : `${titel} (v2)`).slice(0, 100);
  };

  function voorbeeld(file) {
    const poort = (hooks().gezondheid() || {}).poort || 3000;
    return { voorbeeld: `http://localhost:${poort}/proef-proberen?file=${encodeURIComponent(file)}`, voorbeeld_uitleg: 'Opent op de klas-pc zelf (niet via de tunnel): de toets zoals de leerling hem ziet.' };
  }

  // Een toets laden, aanpassen (maak past t aan) en bewaren: vorige versie bewaard, gegeven toets = nieuwe toets.
  function wijzigToets(file, aanpas) {
    const f = ctx.toetsBestaat(file);
    const t = JSON.parse(JSON.stringify(proeven.load(f)));
    const extra = aanpas(t) || {};
    let schoon;
    try { schoon = K.validate(t); } catch (err) { fout(`Niet bewaard: ${err.message}`); }
    const gegeven = ctx.isGegeven(f);
    let bewaard;
    if (gegeven) {
      schoon.title = volgendeTitel(schoon.title);
      bewaard = proeven.save(schoon, null);
      const m = proeven.lib.places()(f);
      if (m) proeven.lib.move(bewaard, m);
    } else {
      versieBewaren(proeven.DIR, f);
      bewaard = proeven.save(schoon, f);
    }
    hooks().naToetsen();
    return {
      file: bewaard, titel: schoon.title, ...extra,
      niveaus: K.niveausVan(schoon), vragen: K.vragenVan(schoon.vragen).length, punten: K.totaal(schoon.vragen), problemen: K.problemen(schoon),
      ...(gegeven ? { nieuwe_versie: true, melding: `"${f}" werd al gegeven en blijft zoals hij was. De wijziging staat in een nieuwe toets "${schoon.title}": werk verder met file "${bewaard}".` } : {}),
      ...voorbeeld(bewaard),
    };
  }

  function lijstVan(t, niveau, maakAan) {
    const n = niveau || 'schildknaap';
    if (!NIVEAUS.includes(n)) fout('"niveau" is page, schildknaap of ridder.');
    if (n === 'schildknaap') return t.vragen;
    if (!Array.isArray(t[n]) || !t[n].length) {
      if (!maakAan) fout(`Deze toets heeft geen ${n}-niveau. Maak het eerst met "niveau_maken".`);
      t[n] = [];
    }
    return t[n];
  }

  // "3" = vraag 3, "3a" = deelvraag a van bron 3.
  function plek(lijst, nr) {
    const m = String(nr ?? '').trim().toLowerCase().match(/^(\d+)([a-o])?$/);
    if (!m) fout('"nr" is het vraagnummer zoals in de toets: 3, of 3a voor een deelvraag van een bron.');
    const i = Number(m[1]) - 1;
    if (!lijst[i]) fout(`Vraag ${m[1]} bestaat niet (dit niveau heeft ${lijst.length} vragen).`);
    if (!m[2]) return { arr: lijst, i, nr: String(i + 1) };
    if (lijst[i].type !== 'bron') fout(`Vraag ${m[1]} is geen bron, dus er is geen deelvraag ${m[1]}${m[2]}.`);
    const j = LETTERS.indexOf(m[2]);
    if (!lijst[i].vragen[j]) fout(`Bron ${m[1]} heeft geen deelvraag ${m[2]}.`);
    return { arr: lijst[i].vragen, i: j, nr: `${i + 1}${m[2]}` };
  }

  const vraagUit = v => {
    const q = json(v, 'vraag');
    if (!q || typeof q !== 'object' || Array.isArray(q)) fout('Geef "vraag" als object, bv. {"type": "kort", "vraag": "3 × 4 = ?", "antwoord": "12"}. Het formaat staat in de tool "formaat".');
    return q;
  };

  // ---------- Toetsen stap voor stap ----------

  function vraagToevoegen({ file, vraag, niveau, positie, in_bron } = {}) {
    const q = vraagUit(vraag);
    return wijzigToets(file, t => {
      const lijst = lijstVan(t, niveau, true);
      if (in_bron !== undefined && in_bron !== null && in_bron !== '') {
        const b = plek(lijst, in_bron);
        const bron = b.arr[b.i];
        if (bron.type !== 'bron' || b.arr !== lijst) fout(`"in_bron" is het nummer van een bron (een vraag van soort bron), bv. 4.`);
        const p = positie ? Math.min(Math.max(1, positie), bron.vragen.length + 1) - 1 : bron.vragen.length;
        bron.vragen.splice(p, 0, q);
        return { nr: `${b.i + 1}${LETTERS[p]}` };
      }
      const p = positie ? Math.min(Math.max(1, positie), lijst.length + 1) - 1 : lijst.length;
      lijst.splice(p, 0, q);
      return { nr: String(p + 1) };
    });
  }

  function vraagWijzigen({ file, nr, niveau, vraag, velden } = {}) {
    if (vraag === undefined && velden === undefined) fout('Geef "vraag" (de hele vraag opnieuw) of "velden" (alleen die velden veranderen).');
    return wijzigToets(file, t => {
      const p = plek(lijstVan(t, niveau), nr);
      if (vraag !== undefined) p.arr[p.i] = vraagUit(vraag);
      else {
        const v = json(velden, 'velden');
        if (!v || typeof v !== 'object' || Array.isArray(v)) fout('"velden" is een object, bv. {"antwoord": "30000|30 000", "punten": 2}. null haalt een veld weg.');
        const q = { ...p.arr[p.i] };
        for (const [k, w] of Object.entries(v)) { if (w === null) delete q[k]; else q[k] = w; }
        p.arr[p.i] = q;
      }
      return { nr: p.nr };
    });
  }

  function vraagVerplaatsen({ file, nr, naar, niveau } = {}) {
    if (!Number.isInteger(naar) || naar < 1) fout('"naar" is de nieuwe plaats (1 = eerste).');
    return wijzigToets(file, t => {
      const p = plek(lijstVan(t, niveau), nr);
      const [q] = p.arr.splice(p.i, 1);
      const n = Math.min(naar, p.arr.length + 1) - 1;
      p.arr.splice(n, 0, q);
      return { van: p.nr, nr: /[a-o]$/.test(p.nr) ? `${p.nr.slice(0, -1)}${LETTERS[n]}` : String(n + 1) };
    });
  }

  function vraagWeghalen({ file, nr, niveau } = {}) {
    return wijzigToets(file, t => {
      const p = plek(lijstVan(t, niveau), nr);
      const [q] = p.arr.splice(p.i, 1);
      return { nr: p.nr, weg: { type: q.type, vraag: String(q.vraag || q.titel || '').slice(0, 120) } };
    });
  }

  function toetsInstellen({ file, titel, vak, intro, vaste_volgorde, alles_automatisch } = {}) {
    return wijzigToets(file, t => {
      if (titel !== undefined) t.title = String(titel);
      if (vak !== undefined) t.vak = String(vak);
      if (intro !== undefined) t.intro = String(intro);
      if (typeof vaste_volgorde === 'boolean') t.vasteVolgorde = vaste_volgorde;
      if (typeof alles_automatisch === 'boolean') t.auto = alles_automatisch;
    });
  }

  function niveauMaken({ file, niveau, kopie_van } = {}) {
    if (!['page', 'ridder'].includes(niveau)) fout('"niveau" is page (met hulp) of ridder (uitdaging). Schildknaap is er altijd.');
    return wijzigToets(file, t => {
      if (Array.isArray(t[niveau]) && t[niveau].length) fout(`Deze toets heeft al een ${niveau}-niveau. Pas de vragen aan met "vraag_wijzigen" en niveau "${niveau}".`);
      const bron = kopie_van && kopie_van !== 'schildknaap' ? lijstVan(t, kopie_van) : t.vragen;
      t[niveau] = JSON.parse(JSON.stringify(bron));
      return { niveau, melding: `Het ${niveau}-niveau is een kopie van ${kopie_van || 'schildknaap'}. Pas nu de vragen aan met niveau "${niveau}".` };
    });
  }

  // Een beeld of geluid: een data-adres, of een https-adres dat LANcelot zelf ophaalt (alleen beelden en geluid, klein).
  async function mediaUit(v, soort) {
    const max = soort === 'audio' ? 2000000 : 700000;
    const re = soort === 'audio' ? /^data:audio\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/ : /^data:image\/(webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/;
    if (typeof v !== 'string' || !v) fout(`Geef "${soort}" als data-adres of https-adres.`);
    if (v.startsWith('data:')) {
      if (!re.test(v)) fout(soort === 'audio' ? 'Het geluid moet een data:audio/...;base64,... zijn.' : 'Het beeld moet webp, png, jpeg of gif zijn (data:image/...;base64,...).');
      if (v.length > max) fout(`Te groot (${Math.round(v.length / 1000)} kB, hooguit ${max / 1000} kB als data-adres). Verklein het eerst (webp of jpeg).`);
      return v;
    }
    let u;
    try { u = new URL(v); } catch { fout('Ongeldig adres.'); }
    if (u.protocol !== 'https:') fout('Alleen https-adressen.');
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[|0\.)/i.test(u.hostname) || /\.local$/i.test(u.hostname)) fout('Dat adres is niet toegelaten.');
    let res;
    try { res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) }); } catch (err) { fout(`Ophalen mislukt: ${err.message}`); }
    if (!res.ok) fout(`Ophalen mislukt (${res.status}).`);
    const type = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ok = soort === 'audio' ? /^audio\/[\w.+-]+$/.test(type) : /^image\/(webp|png|jpeg|gif)$/.test(type);
    if (!ok) fout(`Dit adres geeft geen ${soort === 'audio' ? 'geluid' : 'beeld (webp, png, jpeg, gif)'} maar "${type || 'onbekend'}".`);
    const buf = Buffer.from(await res.arrayBuffer());
    const data = `data:${type};base64,${buf.toString('base64')}`;
    if (data.length > max) fout(`Te groot (${Math.round(buf.length / 1000)} kB). Kies een kleiner beeld (hooguit ongeveer ${Math.round(max * 0.74 / 1000)} kB).`);
    return data;
  }

  async function beeldToevoegen({ file, nr, niveau, beeld, audio, optie, verhouding } = {}) {
    if (beeld === undefined && audio === undefined) fout('Geef "beeld" of "audio".');
    const b = beeld !== undefined ? await mediaUit(beeld, 'beeld') : null;
    const a = audio !== undefined ? await mediaUit(audio, 'audio') : null;
    return wijzigToets(file, t => {
      const p = plek(lijstVan(t, niveau), nr);
      const q = { ...p.arr[p.i] };
      if (b && optie) {
        if (!Array.isArray(q.opties) || !q.opties[optie - 1]) fout(`Vraag ${p.nr} heeft geen keuze ${optie}.`);
        const o = q.opties[optie - 1];
        q.opties = q.opties.slice();
        q.opties[optie - 1] = { ...(typeof o === 'object' ? o : { tekst: o }), beeld: b };
      } else if (b) {
        q.beeld = b;
        delete q.beeldNodig;
        delete q.beeldPagina;
      }
      if (a) q.audio = a;
      if (typeof verhouding === 'number' && verhouding > 0) q.verhouding = verhouding;
      p.arr[p.i] = q;
      return { nr: p.nr };
    });
  }

  function toetsVersies({ file } = {}) {
    const f = ctx.toetsBestaat(file);
    return { file: f, versies: versiesVan(proeven.DIR, f) };
  }

  function toetsTerugzetten({ file, versie } = {}) {
    const f = ctx.toetsBestaat(file);
    const v = versiesVan(proeven.DIR, f).find(x => x.versie === versie);
    if (!v) fout(`Die versie bestaat niet. Zie "toets_versies" voor "${f}".`);
    const oud = JSON.parse(fs.readFileSync(path.join(proeven.DIR, '_versies', v.versie), 'utf8'));
    return wijzigToets(f, t => {
      for (const k of Object.keys(t)) delete t[k];
      Object.assign(t, oud);
      return { teruggezet_naar: v.bewaard };
    });
  }

  function toetsenBewaren({ toetsen } = {}) {
    const lijst = json(toetsen, 'toetsen');
    if (!Array.isArray(lijst) || !lijst.length) fout('Geef "toetsen": een lijst van { toets, file?, map?, dubbel_mag? }.');
    if (lijst.length > MAX_BULK) fout(`Hooguit ${MAX_BULK} toetsen per keer.`);
    const verslag = lijst.map((item, i) => {
      try {
        const r = ctx.toetsBewaren(item || {});
        return { nr: i + 1, gelukt: true, file: r.file, titel: r.titel, map: r.map, nieuw: r.nieuw, problemen: r.problemen };
      } catch (err) {
        const titel = item && item.toets && (item.toets.title || item.toets.titel);
        return { nr: i + 1, gelukt: false, ...(titel ? { titel } : {}), waarom: err.message };
      }
    });
    return { gelukt: verslag.filter(v => v.gelukt).length, mislukt: verslag.filter(v => !v.gelukt).length, verslag };
  }

  // ---------- Het formaat ----------

  // De uitleg bovenaan de bronbestanden is de handleiding van het formaat (dezelfde als voor de editor).
  function kopUitleg(bestand, tot) {
    const regels = fs.readFileSync(path.join(__dirname, bestand), 'utf8').split('\n');
    const uit = [];
    for (const r of regels) {
      if (tot.test(r)) break;
      if (r.startsWith('//')) uit.push(r.replace(/^\/\/ ?/, ''));
    }
    return uit.join('\n');
  }
  function formaat({ soort } = {}) {
    if (soort === 'quiz') {
      return {
        soort: 'quiz',
        uitleg: 'Een quiz: { "title": "...", "questions": [ { "question": "...", "answers": ["a", "b", "c", "d"] (2 tot 4), "correct": nummer van het juiste antwoord (0 = eerste), '
          + '"time": seconden (5-120, standaard 20), "uitleg": "waarom dit juist is" (optioneel), "niveau": "page" | "ridder" (optioneel; leeg = schildknaap), '
          + '"doel": "leerplandoel" (optioneel), "typ": "getal" (de leerling typt het getal zelf, alleen als het juiste antwoord een getal is) } ] }. Hooguit 100 vragen.',
      };
    }
    if (soort === 'oefenblad') {
      return {
        soort: 'oefenblad',
        uitleg: kopUitleg('oefenbladen.js', /^const /) + '\nVorm: { "title": "...", "blocks": [ ...blokken... ] } of met niveaus: { "title": "...", "niveaus": { "page": [...], "schildknaap": [...], "ridder": [...] } }. Een losse vraag zoals in een toets (kort, rekenen, ordenen, tabel, getallenas, markeren, tekenen) is ook een blok.',
        voorbeelden: [
          { type: 'tekst', title: 'titel van de leestekst', text: 'een korte leestekst' },
          { type: 'invullen', instruction: 'Vul de ontbrekende woorden in.', text: 'De [hoofdstad] van België is [Brussel]. Meerdere goede: [fiets|velo].' },
          { type: 'meerkeuze', instruction: 'Kies het juiste antwoord.', items: [{ question: 'de vraag', options: ['A', 'B', 'C'], correct: 1 }] },
          { type: 'juistfout', instruction: 'Is de zin juist of fout?', items: [{ statement: 'een stelling', correct: true }] },
          { type: 'verbinden', instruction: 'Verbind wat bij elkaar hoort.', pairs: [['links', 'rechts'], ['links', 'rechts']] },
          { type: 'woorden', instruction: 'Schrijf het juiste woord.', items: [{ prompt: 'de opgave', answer: 'het woord|andere schrijfwijze' }] },
          { type: 'overschrijven', instruction: 'Schrijf de zinnen foutloos over.', lines: ['een zin'] },
          { type: 'open', instruction: 'Beantwoord de vragen.', items: [{ question: 'een open vraag', lines: 3 }] },
          { type: 'kort', vraag: 'de vraag', antwoord: 'het antwoord|andere schrijfwijze', eenheid: '' },
          { type: 'rekenen', vraag: 'een vraagstuk', antwoord: '36', eenheid: 'cm' },
        ],
      };
    }
    return {
      soort: 'toets',
      uitleg: kopUitleg('../public/js/pf-kern.js', /^\(function/),
      tips: [
        'Een leestekst (begrijpend lezen) is een vraag van soort "bron" met titel, tekst en deelvragen in "vragen". "voorlees": de tekst die de computer voorleest (de leerling hoort ze maar ziet ze niet).',
        'Meerdere juiste schrijfwijzen: "antwoord": "30000|30 000". Bij een getal in een blad-vakje: marge, margeProcent of van/tot.',
        'Punten per vraag: "punten". Uitleg bij een fout antwoord bestaat niet per vraag in een toets (wel in een quiz).',
        'Niveaus: "page" en "ridder" zijn lijsten naast "vragen" (schildknaap). "niveau_maken" maakt er een kopie van om aan te passen.',
        'Voorlezen, volgorde en punten tonen kies je per taak (taak_geven, taak_keuzes); "vasteVolgorde" per toets met "toets_instellen".',
        'Einddatum, tijdslimiet en aantal pogingen kies je per taak (taak_geven, taak_keuzes, taak_verplaatsen, taak_heropenen).',
      ],
    };
  }

  // ---------- Quizzen en oefenbladen ----------

  const BIB = {
    quiz: { mod: quizzes, kind: 'quiz', een: 'quiz', veld: 'quiz', vragen: x => (x.questions || []).length },
    oefenblad: { mod: oefenbladen, kind: 'oefenblad', een: 'oefenblad', veld: 'oefenblad', vragen: x => (x.blocks || []).length },
  };
  const bestaat = (b, file) => {
    if (typeof file !== 'string' || !file) fout(`Geef "file" (zie de lijst van ${b.een === 'quiz' ? 'quizzen' : 'oefenbladen'}).`);
    const f = path.basename(file);
    if (!fs.existsSync(path.join(b.mod.DIR, f))) fout(`"${file}" bestaat niet.`);
    return f;
  };
  const gewijzigd = (b, file) => { try { return new Date(fs.statSync(path.join(b.mod.DIR, file)).mtimeMs).toISOString(); } catch { return null; } };

  function bibLijst(b, { zoek, map, alles } = {}) {
    const z = String(zoek || '').toLowerCase();
    const m = String(map || '').toLowerCase();
    const lijst = b.mod.list().filter(x => (!z || x.title.toLowerCase().includes(z) || x.file.includes(z)) && (!m || (x.folder || '').toLowerCase().startsWith(m)));
    if (!alles && lijst.length > 80 && !z && !m) {
      const perMap = {};
      for (const x of lijst) perMap[x.folder || ''] = (perMap[x.folder || ''] || 0) + 1;
      return { aantal: lijst.length, uitleg: `Er zijn er ${lijst.length}. Vraag ze op per map (map) of zoek op titel (zoek); "alles": true geeft ze toch allemaal.`, mappen: Object.entries(perMap).sort((a, c) => a[0].localeCompare(c[0])).map(([naam, n]) => ({ map: naam, aantal: n })) };
    }
    return {
      aantal: lijst.length,
      items: lijst.slice(0, alles ? undefined : 80).map(x => ({ file: x.file, titel: x.title, map: x.folder || '', vragen: x.count, niveaus: x.niveaus, gewijzigd: gewijzigd(b, x.file) })),
      ...(z || m ? {} : { mappen: b.mod.lib.folders() }),
    };
  }

  function bibLezen(b, { file } = {}) {
    const f = bestaat(b, file);
    return { file: f, map: b.mod.lib.places()(f) || '', [b.veld]: b.mod.load(f) };
  }

  function bibBewaren(b, { inhoud, file, map, dubbel_mag, titel }) {
    let x = json(inhoud, b.veld);
    let f = null;
    let melding = '';
    if (file) {
      f = bestaat(b, file);
      if (x === undefined) x = b.mod.load(f);
    }
    if (!x || typeof x !== 'object') fout(`Geef "${b.veld}" als JSON. Het formaat staat in de tool "formaat" (soort ${b.een}).`);
    if (titel !== undefined) x = { ...x, title: String(titel) };
    let schoon;
    try { schoon = b.mod.validate(x); } catch (err) { fout(`Niet bewaard: ${err.message}`); }
    if (!f && !dubbel_mag) {
      const zelfde = b.mod.list().find(y => y.title.trim().toLowerCase() === schoon.title.trim().toLowerCase());
      if (zelfde) fout(`Er bestaat al een ${b.een} "${zelfde.title}" (file: ${zelfde.file}). Werk die bij met "${b.een}_bijwerken", of geef "dubbel_mag": true.`);
    }
    if (f) { versieBewaren(b.mod.DIR, f); melding = `Bijgewerkt. De vorige versie is bewaard. Taken die al gegeven zijn, houden hun eigen kopie.`; }
    const bewaard = b.mod.save(schoon, f);
    let inMap = b.mod.lib.places()(bewaard) || '';
    if (map !== undefined) { inMap = map ? ctx.mapMaken(b.mod.lib, map) : ''; b.mod.lib.move(bewaard, inMap); }
    hooks().naBib(b.kind);
    return { file: bewaard, titel: schoon.title, map: inMap, vragen: b.vragen(schoon), nieuw: !f, ...(melding ? { melding } : {}) };
  }

  // De resultaten van gespeelde quizzen (CSV in Resultaten), nieuwste eerst.
  function quizResultaten({ zoek, file, van, tot } = {}) {
    if (file) {
      const f = path.basename(String(file));
      const tekst = fs.readFileSync(results.filePath(f), 'utf8').replace(/^﻿/, '');
      const rijen = tekst.split(/\r?\n/).slice(0, 400).map(r => (r.match(/("([^"]|"")*"|[^;]*)(;|$)/g) || []).filter((c, i, a) => i < a.length - 1 || c).map(c => c.replace(/;$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').replace(/^'(?=[=+\-@])/, '')));
      return { file: f, rijen };
    }
    const z = String(zoek || '').toLowerCase();
    const niet = new Set(['Toets', 'Oefenblad', 'Ronde Tafel']);
    const lijst = results.items().filter(r => !niet.has(r.soort)).map(r => {
      const m = r.file.match(/^(\d{4}-\d\d-\d\d)_(\d\d)(\d\d)/);
      return { file: r.file, titel: r.title, soort: r.soort, datum: m ? `${m[1]}T${m[2]}:${m[3]}` : '', map: r.folder || '' };
    }).filter(r => (!z || r.titel.toLowerCase().includes(z)) && (!van || r.datum.slice(0, 10) >= van) && (!tot || r.datum.slice(0, 10) <= tot));
    return { aantal: lijst.length, resultaten: lijst.slice(0, 100), uitleg: 'Geef "file" voor de ranglijst en de antwoorden per vraag. Een quiz als taak: zie de tool "taken".' };
  }

  // ---------- Mappen ----------

  const LIBS = { toets: proeven.lib, quiz: quizzes.lib, oefenblad: oefenbladen.lib };
  const libVan = soort => LIBS[soort] || fout('"soort" is toets, quiz of oefenblad.');
  const naHooks = soort => (soort === 'toets' ? hooks().naToetsen() : hooks().naBib(soort));

  function mappen({ soort } = {}) {
    return { soort, mappen: libVan(soort).folders() };
  }
  function mapAanmaken({ soort, map } = {}) {
    const lib = libVan(soort);
    if (!String(map || '').trim()) fout('Geef "map", bv. "Wiskunde/Blok 3".');
    const bestond = lib.folders().some(x => x.toLowerCase() === String(map).trim().toLowerCase());
    const m = ctx.mapMaken(lib, map);
    naHooks(soort);
    return { soort, map: m, bestond_al: bestond };
  }
  function mapHernoemen({ soort, map, nieuwe_naam } = {}) {
    const lib = libVan(soort);
    const er = lib.folders().find(x => x.toLowerCase() === String(map || '').trim().toLowerCase());
    if (!er) fout(`De map "${map}" bestaat niet. Zie de tool "mappen".`);
    if (!String(nieuwe_naam || '').trim() || /[\/\\]/.test(nieuwe_naam)) fout('"nieuwe_naam" is de nieuwe naam van de map zelf (zonder /).');
    lib.renameFolder(er, nieuwe_naam);
    naHooks(soort);
    const ouder = er.includes('/') ? er.slice(0, er.lastIndexOf('/') + 1) : '';
    return { soort, van: er, naar: `${ouder}${String(nieuwe_naam).trim()}` };
  }
  function naarMap({ soort, file, map } = {}) {
    const lib = libVan(soort);
    const f = soort === 'toets' ? ctx.toetsBestaat(file) : bestaat(BIB[soort], file);
    const m = map ? ctx.mapMaken(lib, map) : '';
    lib.move(f, m);
    naHooks(soort);
    return { soort, file: f, map: m };
  }

  // ---------- De week ----------

  function maandag(d) {
    const x = new Date(d);
    x.setHours(12, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return ctx.dag(x);
  }
  function weekexport({ van, tot, formaat: vorm } = {}) {
    const v = van || maandag(Date.now());
    const t = tot || (() => { const d = new Date(`${v}T12:00:00`); d.setDate(d.getDate() + 6); return ctx.dag(d); })();
    const rijen = [];
    for (const a of proeven.afnames()) {
      if (!proeven.afnameInPeriode(a, v, t, ctx.dag)) continue;
      let rec;
      try { rec = proeven.laadAfname(a.file); } catch { continue; }
      for (const s of rec.spelers) {
        const d = ctx.dag(proeven.datumVan(rec, s));
        if (d < v || d > t) continue;
        const st = proeven.stand(rec, s);
        rijen.push({ datum: d, soort: 'toets', titel: rec.title, vak: proeven.vakVan(rec.toets), naam: s.naam, niveau: s.niveau, punten: st.punten, max: st.max, procent: st.max ? Math.round((st.punten / st.max) * 1000) / 10 : null, status: st.open ? 'nog te verbeteren' : 'verbeterd' });
      }
    }
    for (const tk of taken.lijst()) {
      if (tk.soort === 'proef') continue;
      const d = ctx.dag(tk.dag);
      if (d < v || d > t) continue;
      for (const l of tk.leerlingen) {
        if (l.niet) continue;
        rijen.push({ datum: d, soort: tk.soort, titel: tk.titel, vak: tk.vak || '', naam: l.naam, niveau: l.niveau, punten: tk.soort === 'oefenblad' ? l.juist ?? null : null, max: tk.soort === 'oefenblad' ? l.totaal ?? null : null, procent: null, status: l.status, gedaan: l.gedaan, totaal: l.totaal });
      }
    }
    rijen.sort((a, b) => a.datum.localeCompare(b.datum) || a.titel.localeCompare(b.titel) || a.naam.localeCompare(b.naam));
    const quizzenGespeeld = quizResultaten({ van: v, tot: t }).resultaten;
    const uit = { van: v, tot: t, rijen: rijen.length, leerlingen: klas.read().leerlingen.filter(l => !l.gast).length, toetsen_en_taken: rijen, quizzen_gespeeld: quizzenGespeeld };
    if (vorm === 'csv') {
      const cel = x => { let s = String(x ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const kol = ['datum', 'soort', 'titel', 'vak', 'naam', 'niveau', 'punten', 'max', 'procent', 'status'];
      uit.csv = [kol.join(';'), ...rijen.map(r => kol.map(k => cel(r[k])).join(';'))].join('\r\n');
      delete uit.toetsen_en_taken;
    }
    return uit;
  }

  async function syncStarten() {
    const r = await hooks().syncNu();
    return { ...r, melding: r && r.ingesteld === false ? 'Mijn lesmap is op deze pc niet ingesteld.' : 'Mijn lesmap is gesynchroniseerd.' };
  }

  // ---------- De tools ----------

  const t = x => ({ titel: x.titel, file: x.file });
  return [
    { name: 'formaat', title: 'Formaat van een toets, quiz of oefenblad', description: 'De handleiding van het JSON-formaat (alle vraagsoorten van een toets met hun velden, de sleutel, niveaus, bronnen/leesteksten, bladen met invulvakjes). Lees dit voor je een toets of quiz maakt of een vraag wijzigt.', inputSchema: obj({ soort: SOORT }), fn: formaat },
    { name: 'toets_versies', title: 'Versies van een toets', description: 'De vorige versies van een toets (elke wijziging via de connector bewaart eerst de vorige). Terugzetten met "toets_terugzetten".', inputSchema: obj({ file: S('De toets.') }, ['file']), fn: toetsVersies },
    { name: 'mappen', title: 'Mappen', description: 'De mappen (en submappen) van de toetsen, quizzen of oefenbladen, zoals in Maken.', inputSchema: obj({ soort: SOORT }, ['soort']), fn: mappen },
    { name: 'quizzen', title: 'Quizzen opzoeken', description: 'Alle quizzen (Maken › Mijn quizzen): file, titel, map, aantal vragen, niveaus, laatste wijziging. Kijk hier eerst, zodat je nooit een quiz dubbel maakt. Bij meer dan 80 zonder zoek of map: eerst het aantal per map.', inputSchema: obj({ zoek: S('Stuk van de titel (optioneel).'), map: S('Alleen deze map en haar submappen (optioneel).'), alles: B('Ook bij een grote lijst alles geven.') }), fn: a => bibLijst(BIB.quiz, a) },
    { name: 'quiz', title: 'Quiz lezen', description: 'Eén quiz volledig: alle vragen, antwoorden, het juiste antwoord, uitleg, niveaus.', inputSchema: obj({ file: S('Bestandsnaam van de quiz.') }, ['file']), fn: a => bibLezen(BIB.quiz, a) },
    { name: 'quiz_resultaten', title: 'Resultaten van quizzen', description: 'Gespeelde quizzen (op het bord of in een spel), nieuwste eerst. Met "file": de ranglijst en per vraag goed/fout per leerling.', inputSchema: obj({ zoek: S('Stuk van de titel.'), file: S('Een resultaatbestand uit de lijst.'), van: S('JJJJ-MM-DD'), tot: S('JJJJ-MM-DD') }), fn: quizResultaten },
    { name: 'oefenbladen', title: 'Oefenbladen opzoeken', description: 'Alle oefenbladen (Maken › Mijn oefenbladen): file, titel, map, aantal blokken, niveaus.', inputSchema: obj({ zoek: S('Stuk van de titel (optioneel).'), map: S('Alleen deze map (optioneel).'), alles: B('Ook bij een grote lijst alles geven.') }), fn: a => bibLijst(BIB.oefenblad, a) },
    { name: 'oefenblad', title: 'Oefenblad lezen', description: 'Eén oefenblad volledig (alle blokken en antwoorden).', inputSchema: obj({ file: S('Bestandsnaam van het oefenblad.') }, ['file']), fn: a => bibLezen(BIB.oefenblad, a) },
    { name: 'weekexport', title: 'Export van de week', description: 'Alles van een week (standaard deze week, maandag tot zondag) in één keer: per leerling de toetsen (punten, procent) en de taken (oefenbladen, quizzen: status), plus de gespeelde quizzen. formaat "csv" geeft ook een CSV-tekst (puntkomma, voor Excel).', inputSchema: obj({ van: S('JJJJ-MM-DD (standaard maandag van deze week).'), tot: S('JJJJ-MM-DD (standaard zondag erna).'), formaat: S('json of csv.', { enum: ['json', 'csv'] }) }), fn: weekexport },
    { name: 'sync_starten', title: 'Mijn lesmap synchroniseren', description: 'Mijn lesmap (OneDrive/Google Drive) nu synchroniseren en de stand teruggeven: wat binnenkwam, wat vertrok, fouten. Verandert niets aan toetsen of resultaten.', inputSchema: obj({}), fn: syncStarten, log: () => ({}) },

    { name: 'vraag_toevoegen', schrijft: true, title: 'Vraag toevoegen', description: 'Eén vraag aan een toets toevoegen (achteraan, of op "positie"), of als deelvraag in een bron ("in_bron"). Alle vraagsoorten: zie "formaat". Werd de toets al gegeven, dan komt de wijziging in een nieuwe toets (v2).', inputSchema: obj({ file: S('De toets.'), vraag: { type: ['object', 'string'], description: 'De vraag als JSON, bv. {"type": "kort", "vraag": "3 × 4 = ?", "antwoord": "12", "punten": 1}.' }, niveau: NIVEAU, positie: N('Plaats (1 = eerste). Leeg = achteraan.'), in_bron: S('Nummer van een bron: de vraag wordt een deelvraag daarvan.') }, ['file', 'vraag']), fn: vraagToevoegen, log: (a, r) => ({ ...t(r), nr: r.nr }) },
    { name: 'vraag_wijzigen', schrijft: true, title: 'Vraag wijzigen', description: 'Eén vraag aanpassen zonder de hele toets te vervangen: "vraag" = de hele vraag opnieuw, of "velden" = alleen die velden (bv. de sleutel {"antwoord": "30000|30 000"} of {"punten": 2}; null haalt een veld weg). Lees de vraag eerst met "toets".', inputSchema: obj({ file: S('De toets.'), nr: S('Vraagnummer: 3, of 3a voor een deelvraag van een bron.'), niveau: NIVEAU, vraag: { type: ['object', 'string'], description: 'De hele vraag opnieuw.' }, velden: { type: ['object', 'string'], description: 'Alleen deze velden veranderen.' } }, ['file', 'nr']), fn: vraagWijzigen, log: (a, r) => ({ ...t(r), nr: r.nr }) },
    { name: 'vraag_verplaatsen', schrijft: true, title: 'Vraag verplaatsen', description: 'Een vraag naar een andere plaats zetten (binnen hetzelfde niveau, of binnen dezelfde bron).', inputSchema: obj({ file: S('De toets.'), nr: S('Vraagnummer: 3 of 3a.'), naar: N('De nieuwe plaats (1 = eerste).'), niveau: NIVEAU }, ['file', 'nr', 'naar']), fn: vraagVerplaatsen, log: (a, r) => ({ ...t(r), nr: r.van }) },
    { name: 'vraag_weghalen', schrijft: true, title: 'Vraag weghalen', description: 'Een vraag uit een toets halen. De vorige versie van de toets blijft bewaard (toets_versies); bij een gegeven toets komt het in een nieuwe toets (v2).', inputSchema: obj({ file: S('De toets.'), nr: S('Vraagnummer: 3 of 3a.'), niveau: NIVEAU }, ['file', 'nr']), fn: vraagWeghalen, log: (a, r) => ({ ...t(r), nr: r.nr }) },
    { name: 'toets_instellen', schrijft: true, title: 'Toets instellen', description: 'Titel, vak, intro, vaste volgorde (vragen nooit schudden, bv. een luistertoets) en alles automatisch verbeteren van een toets.', inputSchema: obj({ file: S('De toets.'), titel: S('Nieuwe titel.'), vak: S('Vak, bv. Wiskunde of Frans.'), intro: S('Uitleg bovenaan de toets.'), vaste_volgorde: B('Vragen altijd in deze volgorde.'), alles_automatisch: B('Alles automatisch verbeteren.') }, ['file']), fn: toetsInstellen, log: (a, r) => t(r) },
    { name: 'niveau_maken', schrijft: true, title: 'Niveau maken', description: 'Een page-niveau (met hulp) of ridder-niveau (uitdaging) maken als kopie van schildknaap (of een ander niveau); pas daarna de vragen aan met niveau "page" of "ridder".', inputSchema: obj({ file: S('De toets.'), niveau: S('page of ridder.', { enum: ['page', 'ridder'] }), kopie_van: NIVEAU }, ['file', 'niveau']), fn: niveauMaken, log: (a, r) => ({ ...t(r), niveau: a.niveau }) },
    { name: 'beeld_toevoegen', schrijft: true, title: 'Beeld of geluid toevoegen', description: 'Een beeld (webp, png, jpeg, gif) of geluid aan een vraag hangen, of een beeld aan één keuze van een meerkeuzevraag ("optie"). Als data-adres (data:image/...;base64,...) of als https-adres dat LANcelot ophaalt. Een beeld is hooguit ongeveer 500 kB. Bij een blad of aanduiden: "verhouding" = hoogte / breedte.', inputSchema: obj({ file: S('De toets.'), nr: S('Vraagnummer: 3 of 3a.'), niveau: NIVEAU, beeld: S('data-adres of https-adres van het beeld.'), audio: S('data-adres of https-adres van het geluid.'), optie: N('Nummer van de keuze (1 = eerste) bij meerkeuze.'), verhouding: { type: 'number', description: 'Hoogte / breedte van het beeld.' } }, ['file', 'nr']), fn: beeldToevoegen, log: (a, r) => ({ ...t(r), nr: r.nr }) },
    { name: 'toets_terugzetten', schrijft: true, title: 'Toets terugzetten', description: 'Een toets terugzetten naar een vorige versie (zie "toets_versies"). De huidige versie wordt eerst zelf bewaard.', inputSchema: obj({ file: S('De toets.'), versie: S('De versie uit "toets_versies".') }, ['file', 'versie']), fn: toetsTerugzetten, log: (a, r) => t(r) },
    { name: 'toetsen_bewaren', schrijft: true, title: 'Veel toetsen tegelijk', description: `Tot ${MAX_BULK} toetsen in één keer bewaren, elk zoals "toets_bewaren" ({ toets, file?, map?, dubbel_mag? }). Geeft per toets: gelukt of mislukt en waarom. Een mislukte toets houdt de andere niet tegen.`, inputSchema: obj({ toetsen: { type: ['array', 'string'], items: { type: 'object' }, description: 'Lijst van { toets, file?, map?, dubbel_mag? }.' } }, ['toetsen']), fn: toetsenBewaren, log: (a, r) => ({ n: r.gelukt, mislukt: r.mislukt }) },
    { name: 'quiz_maken', schrijft: true, title: 'Quiz maken', description: 'Een nieuwe quiz bewaren (in Maken › Mijn quizzen), in een map (wordt gemaakt als ze niet bestaat). Formaat: zie "formaat" met soort quiz. Bestaat de titel al: een fout, nooit stil overschrijven.', inputSchema: obj({ quiz: { type: ['object', 'string'], description: '{ title, questions: [...] }' }, map: S('Map, bv. "Karrewiet/2026-11".'), dubbel_mag: B('Toch een nieuwe quiz als de titel al bestaat.') }, ['quiz']), fn: a => bibBewaren(BIB.quiz, { inhoud: a.quiz, map: a.map, dubbel_mag: a.dubbel_mag }), log: (a, r) => t(r) },
    { name: 'quiz_bijwerken', schrijft: true, title: 'Quiz bijwerken', description: 'Een bestaande quiz aanpassen: de hele quiz opnieuw ("quiz": vragen toevoegen, wijzigen, weghalen, herordenen), een nieuwe titel en/of een andere map. De vorige versie blijft bewaard; taken die al gegeven zijn, houden hun eigen kopie.', inputSchema: obj({ file: S('De quiz.'), quiz: { type: ['object', 'string'], description: 'De hele quiz opnieuw (lees hem eerst met "quiz").' }, titel: S('Nieuwe titel.'), map: S('Andere map (leeg = bovenaan).') }, ['file']), fn: a => bibBewaren(BIB.quiz, { inhoud: a.quiz, file: a.file, map: a.map, titel: a.titel }), log: (a, r) => t(r) },
    { name: 'oefenblad_bewaren', schrijft: true, title: 'Oefenblad bewaren', description: 'Een oefenblad maken (zonder file) of bijwerken (met file), in een map. Formaat: zie "formaat" met soort oefenblad. De vorige versie blijft bewaard.', inputSchema: obj({ oefenblad: { type: ['object', 'string'], description: 'Het oefenblad als JSON.' }, file: S('Bestaand oefenblad om bij te werken.'), map: S('Map.'), dubbel_mag: B('Toch nieuw als de titel al bestaat.') }), fn: a => bibBewaren(BIB.oefenblad, { inhoud: a.oefenblad, file: a.file, map: a.map, dubbel_mag: a.dubbel_mag }), log: (a, r) => t(r) },
    { name: 'map_maken', schrijft: true, title: 'Map maken', description: 'Een map (met submappen) maken voor toetsen, quizzen of oefenbladen, bv. "Wiskunde/Blok 3/Les 2". Bestaat ze al, dan gebeurt er niets.', inputSchema: obj({ soort: SOORT, map: S('Het pad van de map.') }, ['soort', 'map']), fn: mapAanmaken, log: (a, r) => ({ map: r.map }) },
    { name: 'map_hernoemen', schrijft: true, title: 'Map hernoemen', description: 'Een map een nieuwe naam geven (alles erin blijft erin).', inputSchema: obj({ soort: SOORT, map: S('Het pad van de map.'), nieuwe_naam: S('De nieuwe naam (alleen de map zelf).') }, ['soort', 'map', 'nieuwe_naam']), fn: mapHernoemen, log: (a, r) => ({ van: r.van, naar: r.naar }) },
    { name: 'naar_map', schrijft: true, title: 'Naar een map', description: 'Een toets, quiz of oefenblad in een map zetten (bv. een archiefmap per maand). Lege map = bovenaan.', inputSchema: obj({ soort: SOORT, file: S('Het bestand.'), map: S('De map (wordt gemaakt als ze niet bestaat).') }, ['soort', 'file']), fn: naarMap, log: (a, r) => ({ file: r.file, map: r.map }) },
  ];
}

module.exports = { maak };
