// De kern van De Proef (toetsen): de vraagsoorten, de controle van een toets, wat de leerling te zien krijgt
// en het automatisch verbeteren. Dezelfde code draait op de server (require) en in de browser (PfKern),
// zodat de editor meteen ziet wat fout is, zonder telkens de hele toets met afbeeldingen naar de server te sturen.
// Het verbeteren dat telt, gebeurt altijd op de server.
//
// Een toets: { title, intro, vragen: [...], page: [...], ridder: [...] } (page en ridder zijn optioneel, zoals bij oefenbladen).
// Elke vraag: { type, vraag, beeld, punten, doel, beeldNodig, beeldPagina, ... } met per soort:
//   meerkeuze   opties: [tekst of { tekst, beeld }], juist: nummer of [nummers] (meerdere juiste: alle aanduiden)
//   juistfout   juist: true of false
//   invullen    tekst met gaten: "De hoofdstad is [Brussel]." (meerdere goede antwoorden: [fiets|velo]); bank: true = slepen uit een woordenbank, extra: [foute woorden]
//   kort        antwoord: "0,5|1/2" (meerdere goede antwoorden), eenheid
//   rekenen     antwoord (de uitkomst), eenheid, punten (voor de uitkomst) en werkPunten (de leerkracht verbetert de werkwijze)
//               rooster: true = de bewerking in een rekenrooster (kol kolommen, rij rijen, één teken per hokje) in plaats van een tekstvak
//   verbinden   paren: [[links, rechts]]
//   ordenen     items in de juiste volgorde
//   tabel       rijen: [[cel, cel]], de eerste rij is de kop; een cel "[12]" vult de leerling in, "{groter|kleiner}" is een keuzelijstje
//   kort/rekenen met breuk: true: de leerling typt in een breukvak (geheel, teller, noemer); vereenvoudigd: true = alleen zo eenvoudig mogelijk is juist
//   aanduiden   beeld, zones: [{ x, y, r }] in procent van de breedte; verhouding = hoogte / breedte van het beeld
//               zonder namen tikt de leerling één plek aan (elke zone is goed); met namen ({ x, y, r, naam }, bv. de provincies
//               op een kaart) zet de leerling elke naam op zijn plek: het antwoord is dan [{ x, y } of null] per zone, één punt per naam
//   open        model (het modelantwoord voor de leerkracht), regels
//   papier      een opdracht op papier (bv. tekenen met passer); de leerkracht geeft de punten
//   bron        titel, tekst, beeld en vragen (deelvragen a, b, c): de bron staat links, de vragen rechts
//   getallenas  min, max, stap (de streepjes), antwoord (een getal op een streepje), getallen: 'rand' | 'alle', breuk (getallen als breuk)
//   markeren    tekst waarin de leerling woorden aanduidt; de juiste staan tussen [ ]: "De [hond] [blaft] luid."
//   tekenen     een tekenvak (eventueel op een afbeelding: beeld, verhouding); de leerkracht geeft de punten
//   spreken     de leerling spreekt zijn antwoord in (seconden: hoe lang hooguit); de leerkracht geeft de punten
//   blad        een pagina van de eigen toets-pdf zoals hij is (beeld, verhouding), met invulvakjes erop:
//               velden: [{ x, y, w, h (procent van breedte en hoogte), soort: tekst | kruis | kies | open, antwoord, eenheid, punten, groep, opties }]
//               kies = een keuzelijstje: opties, antwoord is de juiste optie
//               teken = een vak om in te tekenen (de leerkracht verbetert), luister = een knop die audio afspeelt (geen antwoord)
//               breuk = teller boven noemer, sleep = de leerling sleept er een woord in (uit alle sleepwoorden van het blad + woorden: [foute keuzes])
//               plek = aanduiden: de leerling tikt in het vak een plek aan; doel: { x, y, r } (procent van het vak; r van de breedte)
//               lijn = verbinden: de leerling trekt een lijn van het bolletje (het vak) naar een plek op het blad; naar: { x, y } (procent van het blad), r: hoe dicht (procent van de breedte)
//               vlak = een gekleurd vlak dat iets op het blad bedekt (kleur), notitie = tekst van de leerkracht op het blad (tekst)
//               kruisjes met dezelfde groep tellen samen: alleen goed als precies de juiste aangekruist zijn
//               rond = een bolletje (meerkeuze: de leerling kiest er één per groep), label = een letter op het hokje (A, B, J, F)
//               bij tekst: hoofdletters, leestekens (tellen mee) en spaties (alle spaties negeren)
//               bij tekst en breuk: vereenvoudigd = zo eenvoudig mogelijk (6/8 is fout als 3/4 juist is; 7/4 fout als 1 3/4 juist is)
//               breuk met geheel: true = er staat een vakje voor het geheel ervoor (een gemengd getal: 1 3/4)
//               rooster = een rekenrooster voor een bewerking (cijferen): kol kolommen en rij rijen, één teken per hokje; zonder sleutel verbetert de leerkracht
//                 met sleutel (keuze): nakijk 'uitkomst' (uitkomst: "39393,6", eventueel uitkomstRij: 5), 'rijen' (punten per juiste rij) of
//                 'alles' (alles juist), sleutel = het hele rooster zoals de leerling het invult (rijen gescheiden door een nieuwe regel)
//                 'deling' (quotient: "246", rest: "4"; het quotiënt rechts naast de deler, de rest onderaan) of
//                 'cellen' (elk hokje apart op zijn eigen plek, bv. een grondplan of aanzicht: punten naar het deel juiste hokjes)
//               bij tekst met een getal (keuze): marge: 0.1 (± een getal), margeProcent: 5 (± procent) of van: 1700, tot: 2100
//               klad = kladruimte (vorm: 'typen' of 'tekenen'): telt niet mee, de leerkracht verbetert niets
//               puntlijn = lijnen tussen punten: pt: [{ x, y }] (procent van het vak), sleutel lijnen: [[0, 2], [1, 3]] (richting en volgorde maken
//                 niet uit, een lijn te veel of te weinig is fout) of doorPunt: 4 (elke lijn gaat door dat punt, bv. een middellijn) met aantal lijnen
//               cirkel = een cirkel tekenen: cirkels: [{ x, y (procent van het vak), r (straal in cm) }], marge (cm, standaard 0,1)
//               kleur = een kleurveld: kol x rij hokjes die de leerling inkleurt met vaste kleuren; kleuren: [{ kleur: 'rood', aantal: '60%' | '3/5' | '12' }]
//                 (het antwoord: één cijfer per hokje, 0 = niet gekleurd, 1 = de eerste kleur, ...)
//               veelhoek = een figuur op roosterpunten: kol x rij stippen; de leerling tikt de hoekpunten aan (de figuur sluit vanzelf).
//                 sleutel figuur: 'vierkant', 'ruit', 'trapezium', ... (de computer herkent de soort); strikt: true = precies die soort
//                 (een vierkant is dan geen ruit)
//               bij tekst (keuze): formule = gevolgfout, bv. "{1} * {2} / 2": juist als het getal klopt met de eigen antwoorden in vakje 1 en 2
//               schaal (op het blad): hoeveel cm het blad breed is (standaard 21, een A4), voor de lat en de cirkels
//               samen: vakjes met hetzelfde getal tellen samen als één vraag: alleen als ze allemaal juist zijn, krijgt de leerling de punten
//               (de punten van het groepje staan op het eerste vakje, de rest heeft 0)
// Bij invullen is {goed|fout|fout} een keuzelijstje: de eerste is de juiste, de leerling ziet ze alfabetisch.
// Elke vraag kan audio hebben (eigen opname of geluidsbestand, als data-adres): de leerling hoort de uitleg met 🔊.
// exact: true laat hoofdletters en leestekens meetellen bij invullen, kort en tabel.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PfKern = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const TYPES = ['meerkeuze', 'juistfout', 'invullen', 'kort', 'rekenen', 'verbinden', 'ordenen', 'tabel', 'aanduiden', 'getallenas', 'markeren', 'tekenen', 'spreken', 'open', 'papier', 'bron', 'blad', 'sorteren', 'dictee'];
  const NAMES = {
    meerkeuze: 'Meerkeuze', juistfout: 'Juist of fout', invullen: 'Invullen', kort: 'Kort antwoord', rekenen: 'Rekenvraag',
    verbinden: 'Verbinden', ordenen: 'Ordenen', tabel: 'Tabel invullen', aanduiden: 'Aanduiden op een afbeelding',
    getallenas: 'Getallenas', markeren: 'Woorden aanduiden', tekenen: 'Tekenen', spreken: 'Inspreken',
    open: 'Open vraag', papier: 'Op papier', bron: 'Bron met deelvragen', blad: 'Blad uit je pdf', sorteren: 'Sorteren', dictee: 'Dictee',
  };
  // Wat de leerkracht zelf verbetert.
  const MANUEEL = new Set(['open', 'papier', 'tekenen', 'spreken']);
  const NIVEAUS = ['page', 'schildknaap', 'ridder'];
  const MAX_VRAGEN = 80;
  const MAX_DEEL = 15;
  const MAX_VELDEN = 80;
  // Aanduiden: hoeveel plekken (met namen: bv. alle provincies of hoofdsteden op een kaart).
  const MAX_ZONES = 20;
  const metNamen = q => q.zones.some(z => z.naam);
  const SOORTEN = ['tekst', 'kruis', 'kies', 'open', 'teken', 'luister', 'breuk', 'sleep', 'vlak', 'notitie', 'plek', 'lijn', 'rooster', 'klad', 'puntlijn', 'cirkel', 'veelhoek', 'kleur'];
  // Vakjes zonder antwoord: ze staan alleen op het blad.
  const GEEN_ANTWOORD = new Set(['luister', 'vlak', 'notitie']);
  // Vakjes die de computer verbetert met een getypt of gekozen antwoord.
  const AUTO_VELD = new Set(['tekst', 'kies', 'breuk', 'sleep', 'plek', 'lijn', 'puntlijn', 'cirkel', 'veelhoek', 'kleur']);
  const VRIJ_SOORT = new Set(['tekst', 'breuk', 'sleep']);
  const RICHTING = ['evenwijdig', 'loodrecht', 'niet-loodrecht', 'niet-evenwijdig'];
  const KLEUREN = ['#ffffff', '#fff3b0', '#d8ecff', '#e4e4e4', '#ffd9d9'];
  // Wat de leerkracht verbetert op een blad (een rekenrooster alleen zonder sleutel).
  const HAND_VELD = new Set(['open', 'teken', 'rooster']);
  const NAKIJK = ['uitkomst', 'rijen', 'alles', 'deling', 'cellen'];
  // Een A4 is 21 cm breed: zo groot is de lat op het blad, tenzij de leerkracht een andere schaal kiest.
  const SCHAAL = 21;
  // Een rekenrooster: hoeveel hokjes breed en hoog (standaard en hooguit).
  const ROOSTER = { kol: 8, rij: 4, maxKol: 20, maxRij: 12 };
  const roosterMaat = (v, standaard, max) => Math.min(max, Math.max(2, Math.round(Number(v)) || standaard));
  // Een afbeelding is een klein webp-bestand (de editor verkleint), als data-adres in de toets zelf.
  const MAX_BEELD = 700000;
  // Audio: een opname van een minuut is ongeveer 300 kB; een geluidsbestand mag wat groter.
  const MAX_AUDIO = 2000000;
  // Een tekening of ingesproken antwoord van een leerling.
  const MAX_TEKENING = 500000;
  const MAX_OPNAME = 1500000;
  // Een gat [antwoord] of een keuzelijstje {juist|fout|fout}.
  const GAP = /\[([^\[\]]+)\]|\{([^{}]+)\}/g;

  const text = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\r/g, '').trim().slice(0, max) : '');
  const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const beeldOf = v => (typeof v === 'string' && /^data:image\/(webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_BEELD ? v : '');
  // Een plaatshouder voor een afbeelding terwijl de AI een toets aanpast ("#beeld3"); de editor zet het beeld terug.
  const audioOf = v => (typeof v === 'string' && /^data:audio\/[\w.+-]+(;codecs=[\w.,-]+)?;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_AUDIO ? v : '');
  const tekeningOf = v => (typeof v === 'string' && /^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_TEKENING ? v : null);
  const opnameOf = v => (typeof v === 'string' && /^data:audio\/[\w.+-]+(;codecs=[\w.,-]+)?;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_OPNAME ? v : null);
  const plaatsOf = v => (typeof v === 'string' && /^#beeld\d{1,3}$/.test(v) ? v : '');
  const punt = (v, standaard) => {
    if (v === undefined || v === null || v === '') return standaard;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.round(n * 2) / 2) : standaard;
  };
  const alts = s => String(s || '').split('|').map(a => a.trim()).filter(Boolean);
  // Per gat de goede antwoorden; bij een keuzelijstje alleen de eerste.
  const gapsOf = s => [...String(s || '').matchAll(GAP)].map(m => (m[2] !== undefined ? alts(m[2]).slice(0, 1) : alts(m[1])));
  // Een cel van een tabel die de leerling invult: [antwoord] of een keuzelijstje {juist|fout}. null = gewone cel.
  const celGat = c => {
    const m = /^\[([^\[\]]+)\]$/.exec(c) || /^\{([^{}]+)\}$/.exec(c);
    if (!m) return null;
    return c[0] === '{' ? { goed: alts(m[1])[0], opties: [...new Set(alts(m[1]))].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true })) } : { goed: m[1] };
  };
  // Woorden aanduiden: de tekst in stukken; w = het nummer van een woord dat de leerling kan aanduiden, doel = juist.
  const WOORD = /\[([^\[\]]+)\]|[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  function woordenVan(tekst) {
    const out = [];
    let last = 0;
    let w = 0;
    for (const m of String(tekst || '').matchAll(WOORD)) {
      if (m.index > last) out.push({ t: tekst.slice(last, m.index) });
      const h = m[1] !== undefined ? haakKleur(m[1].trim()) : null;
      out.push(h ? { t: h.t.trim(), w: w++, doel: true, k: h.k } : { t: m[0], w: w++, doel: false });
      last = m.index + m[0].length;
    }
    if (last < String(tekst || '').length) out.push({ t: tekst.slice(last) });
    return out;
  }
  const doelenVan = tekst => woordenVan(tekst).filter(s => s.doel).map(s => s.w);
  // ---------- Woorden aanduiden: woorden, zinnen of stukjes tekst, in één of meer kleuren ----------
  // per: 'zin' (de leerling tikt een hele zin aan) of 'stuk' (de leerling duidt een stuk tekst aan); zonder: losse woorden (zoals altijd).
  // kleuren: [{ kleur: 'groen', uitleg: 'eigennaam' }] (1 tot 4); in de tekst staat de kleur achter het juiste stuk: [Jan|2] = de tweede kleur.
  // aantal: hoeveel de leerling moet aanduiden ("duid er 2 aan"); leeg = allemaal.
  // inBron (een deelvraag van een bron): de leerling duidt aan in de tekst van de bron; doelen: [[eerste woord, laatste woord, kleur]].
  const PER = ['zin', 'stuk'];
  const STIFTEN = { geel: '#ffe14d', groen: '#8ce99a', blauw: '#8fd0ff', rood: '#ff9b9b', oranje: '#ffc078', paars: '#d6c2ff' };
  // Een donkere rand in dezelfde kleur: zo toont de sleutel wat juist is.
  const STIFT_RAND = { geel: '#b08f00', groen: '#2f9e44', blauw: '#1c7ed6', rood: '#e03131', oranje: '#e8590c', paars: '#7048e8' };
  const MAX_KLEUREN = 4;
  // Een stuk tussen haken, eventueel met de kleur erachter: [de hond|2].
  const HAAK = /\[([^\[\]]+)\]/g;
  const haakKleur = s => { const m = /^([\s\S]*?)\|([1-4])$/.exec(s); return m ? { t: m[1], k: Number(m[2]) } : { t: s, k: 1 }; };
  // De tekst zonder haken, met waar de juiste stukken staan (begin en einde in de tekst zonder haken).
  function zonderHaken(tekst) {
    let plain = '';
    let last = 0;
    const doelen = [];
    for (const m of String(tekst || '').matchAll(HAAK)) {
      plain += tekst.slice(last, m.index);
      const { t, k } = haakKleur(m[1]);
      doelen.push({ s: plain.length, e: plain.length + t.length, k });
      plain += t;
      last = m.index + m[0].length;
    }
    plain += String(tekst || '').slice(last);
    return { plain, doelen };
  }
  // Afkortingen: na deze woorden eindigt de zin niet.
  const AFKORTING = new Set(['bv', 'bijv', 'enz', 'nl', 'oa', 'dhr', 'mevr', 'mr', 'dr', 'ca', 'blz', 'nr', 'st', 'resp', 'evt', 'vb', 'o', 'a', 'd', 'w', 'z', 'm']);
  // Alle woorden van een tekst (zonder haken), met hun plaats en de zin waarin ze staan.
  // Een zin eindigt op . ! ? of … (eventueel gevolgd door een aanhalingsteken of haakje) en een spatie, of op een nieuwe regel.
  const LOS_WOORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  function tekstWoorden(plain) {
    const woorden = [];
    let z = 0;
    let last = 0;
    for (const m of String(plain || '').matchAll(LOS_WOORD)) {
      const tus = plain.slice(last, m.index);
      const vorig = woorden[woorden.length - 1];
      if (vorig && (/\n/.test(tus) || (/[.!?…]["'”’»)\]]*\s/.test(tus) && !(/^\.\s/.test(tus) && AFKORTING.has(vorig.t.toLowerCase()))))) z++;
      woorden.push({ t: m[0], s: m.index, e: m.index + m[0].length, z });
      last = m.index + m[0].length;
    }
    return woorden;
  }
  // De stukken om te tonen: tekst en woorden (w = nummer, z = zin). Een stuk tekst tussen woord w en w + 1 heeft n = w.
  function stukkenVan(plain, woorden) {
    const out = [];
    let last = 0;
    woorden.forEach((x, i) => {
      if (x.s > last) out.push(i ? { t: plain.slice(last, x.s), n: i - 1 } : { t: plain.slice(last, x.s) });
      out.push({ t: x.t, w: i, z: x.z });
      last = x.e;
    });
    if (last < plain.length) out.push({ t: plain.slice(last) });
    return out;
  }
  const nieuwMarkeren = q => !!(q.per || q.inBron);
  // Het model van een markeervraag: de stukken om te tonen, hoe de leerling aanduidt en wat juist is.
  // doelen: [{ a, b, k }] (woorden a tot b, kleur k); bij zinnen a = b = het nummer van de zin.
  function markeerModel(q) {
    if (!nieuwMarkeren(q)) {
      // Zoals altijd: losse woorden; een stuk tussen haken is één woord.
      const st = woordenVan(q.tekst);
      return { per: 'woord', stukken: st.map(s => (s.w === undefined ? { t: s.t } : { t: s.t, w: s.w })), doelen: st.filter(s => s.doel).map(s => ({ a: s.w, b: s.w, k: s.k || 1 })) };
    }
    const per = q.per || 'woord';
    let plain;
    let ruw;
    let haken = [];
    if (q.inBron) {
      plain = String(q.bronTekst || '');
      ruw = (q.doelen || []).map(([a, b, k]) => ({ a, b, k }));
    } else {
      const z = zonderHaken(q.tekst);
      plain = z.plain;
      ruw = null;
      haken = z.doelen;
    }
    const woorden = tekstWoorden(plain);
    if (!ruw) {
      ruw = haken.map(d => {
        const binnen = woorden.map((x, i) => (x.s < d.e && x.e > d.s ? i : -1)).filter(i => i >= 0);
        return binnen.length ? { a: binnen[0], b: binnen[binnen.length - 1], k: d.k } : null;
      }).filter(Boolean);
    }
    ruw = ruw.filter(d => d.a >= 0 && d.b >= d.a && d.b < woorden.length);
    let doelen;
    if (per === 'zin') {
      const gezien = new Map();
      for (const d of ruw) for (let i = d.a; i <= d.b; i++) if (!gezien.has(woorden[i].z)) gezien.set(woorden[i].z, d.k);
      doelen = [...gezien].map(([z, k]) => ({ a: z, b: z, k })).sort((x, y) => x.a - y.a);
    } else if (per === 'stuk') doelen = ruw.map(d => ({ ...d })).sort((x, y) => x.a - y.a);
    else {
      const gezien = new Map();
      for (const d of ruw) for (let i = d.a; i <= d.b; i++) if (!gezien.has(i)) gezien.set(i, d.k);
      doelen = [...gezien].map(([w, k]) => ({ a: w, b: w, k })).sort((x, y) => x.a - y.a);
    }
    return { per, plain, woorden, stukken: stukkenVan(plain, woorden), doelen };
  }
  // Een antwoord als lijst: [nummer, kleur] (woord of zin) of [eerste, laatste, kleur] (stuk). Een los getal = kleur 1 (zoals vroeger).
  function markeerAntwoord(a, per) {
    const out = [];
    for (const x of Array.isArray(a) ? a : []) {
      if (Number.isInteger(x)) out.push(per === 'stuk' ? [x, x, 1] : [x, 1]);
      else if (Array.isArray(x) && per === 'stuk' && x.length === 3) out.push(x);
      else if (Array.isArray(x) && per !== 'stuk' && x.length === 2) out.push(x);
    }
    return out;
  }
  // Hoeveel juist en fout aangeduid, en hoeveel er nodig zijn.
  function markeerTel(q, a) {
    const m = markeerModel(q);
    const gekozen = markeerAntwoord(a, m.per);
    const nodig = Math.max(1, q.aantal ? Math.min(q.aantal, m.doelen.length) : m.doelen.length);
    let goed = 0;
    let fout = 0;
    if (m.per === 'stuk') {
      // Een stuk is juist als het hetzelfde stuk is: aan elke rand mag er één woord te veel of te weinig staan.
      const vrij = m.doelen.slice();
      for (const [x, y, k] of gekozen) {
        const i = vrij.findIndex(d => d.k === k && Math.abs(d.a - x) <= 1 && Math.abs(d.b - y) <= 1 && x <= d.b && y >= d.a);
        if (i >= 0) { goed++; vrij.splice(i, 1); } else fout++;
      }
    } else {
      const doel = new Map(m.doelen.map(d => [d.a, d.k]));
      for (const [n, k] of gekozen) if (doel.get(n) === k) goed++; else fout++;
    }
    return { goed: Math.min(goed, nodig), fout, nodig, model: m, gekozen };
  }
  // De juiste stukken als tekst (voor de sleutel), per kleur.
  function markeerTekst(m, lijst) {
    const tekst = d => (m.per === 'woord' && !m.woorden ? (m.stukken.find(s => s.w === d.a) || {}).t || '?'
      : m.per === 'zin' ? stukTekst(m, m.woorden.findIndex(x => x.z === d.a), m.woorden.length - 1 - [...m.woorden].reverse().findIndex(x => x.z === d.a))
        : stukTekst(m, d.a, d.b));
    const stukTekst = (m2, a, b) => (m2.woorden[a] && m2.woorden[b] ? m2.plain.slice(m2.woorden[a].s, m2.woorden[b].e).replace(/\s+/g, ' ') : '?');
    return lijst.map(d => ({ k: d.k, t: tekst(d) }));
  }
  function markeerOplossing(q) {
    const m = markeerModel(q);
    const stukken = markeerTekst(m, m.doelen);
    const voor = q.aantal && q.aantal < m.doelen.length ? `${q.aantal} van: ` : '';
    if (!q.kleuren || !q.kleuren.length) return voor + stukken.map(s => s.t).join(' · ');
    return voor + q.kleuren.map((c, i) => { const l = stukken.filter(s => s.k === i + 1); return l.length ? `${c.kleur}${c.uitleg ? ` (${c.uitleg})` : ''}: ${l.map(s => s.t).join(', ')}` : ''; }).filter(Boolean).join(' · ');
  }
  // Wat juist is, in de vorm van een antwoord (voor de sleutel in de juiste kleur).
  function markeerSleutel(q) {
    const m = markeerModel(q);
    return m.doelen.map(d => (m.per === 'stuk' ? [d.a, d.b, d.k] : [d.a, d.k]));
  }
  // Het antwoord van een leerling als tekst.
  function markeerKort(q, a) {
    const m = markeerModel(q);
    const lijst = markeerAntwoord(a, m.per).map(x => (m.per === 'stuk' ? { a: x[0], b: x[1], k: x[2] } : { a: x[0], b: x[0], k: x[1] }));
    return markeerTekst(m, lijst).map(s => (q.kleuren && q.kleuren.length > 1 ? `${s.t} (${(q.kleuren[s.k - 1] || {}).kleur || s.k})` : s.t)).join(' · ');
  }
  // In de bron: de juiste stukken terugvinden als de tekst van de bron veranderde (woorden ervoor bij of weg).
  function doelenInBron(doelen, plain) {
    const woorden = tekstWoorden(plain).map(x => x.t);
    return list(doelen, 60).map(d => {
      const [a, b, k] = Array.isArray(d) ? d.map(Number) : [d && d.a, d && d.b, d && d.k].map(Number);
      const t = Array.isArray(d) ? d[3] : d && d.t;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a) return null;
      const kleur = k >= 1 && k <= MAX_KLEUREN ? k : 1;
      const tekst = typeof t === 'string' ? t.slice(0, 600) : '';
      if (tekst) {
        const zoek = tekst.split(' ');
        const past = i => zoek.every((w, j) => woorden[i + j] === w);
        if (!past(a)) {
          let beste = -1;
          for (let i = 0; i + zoek.length <= woorden.length; i++) if (past(i) && (beste < 0 || Math.abs(i - a) < Math.abs(beste - a))) beste = i;
          if (beste >= 0) return [beste, beste + zoek.length - 1, kleur, tekst];
          // Niet meer gevonden (de tekst van het stuk zelf veranderde): dan blijft het op zijn plaats.
          if (b >= woorden.length) return null;
          return [a, b, kleur, woorden.slice(a, b + 1).join(' ')];
        }
      }
      if (b >= woorden.length) return null;
      return [a, b, kleur, tekst || woorden.slice(a, b + 1).join(' ')];
    }).filter(Boolean);
  }
  // Een getal op de getallenas als tekst: 0,25 of als breuk 1/4 (de noemer volgt uit de stap).
  function asTekst(x, breuk) {
    if (breuk && Math.abs(x - Math.round(x)) > 1e-9) {
      for (let d = 2; d <= 100; d++) {
        const n = x * d;
        if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)}/${d}`;
      }
    }
    return String(Math.round(x * 1000) / 1000).replace('.', ',');
  }
  // Ook een AI die Engelse namen gebruikt, of een gewone vraag zonder soort, komt goed.
  const pick = (o, ...keys) => { for (const k of keys) if (o[k] !== undefined) return o[k]; return undefined; };

  // ---------- Sorteren in kolommen ----------
  // De leerling krijgt alle woorden alfabetisch (de volgorde verraadt niets) en zet elk woord in een kolom.
  // Het antwoord: per woord (in die volgorde) het nummer van de kolom, of null (blijft liggen).
  const sorteerWoorden = q => [...new Set([...q.kolommen.flatMap(k => k.woorden), ...(q.extra || [])])].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
  // In welke kolommen hoort een woord (meestal één, geen = een woord dat nergens hoort).
  const sorteerKolommen = (q, w) => q.kolommen.map((k, i) => (k.woorden.includes(w) ? i : -1)).filter(i => i >= 0);
  // Een item van ordenen als tekst (een prent zonder tekst wordt "prent 2").
  const itemTekst = (q, i) => (typeof q.items[i] === 'string' ? q.items[i] : q.items[i] ? q.items[i].tekst || `prent ${i + 1}` : '?');

  // ---------- Dictee ----------
  const MAX_DICTEE = 30;
  // De woorden van een zin, zoals we ze vergelijken: zonder hoofdletters of leestekens als die niet meetellen.
  function dicteeWoorden(q, t) {
    return String(t || '').trim().split(/\s+/).map(w => {
      let x = w.normalize('NFC').replace(/[‘’]/g, "'").replace(/[“”„]/g, '"');
      if (!q.leestekens) x = x.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (q.hoofdletters === false) x = x.toLocaleLowerCase('nl');
      return x;
    }).filter(Boolean);
  }
  const dicteeZinPunten = (q, d) => (q.vorm === 'zinnen' ? q.puntenZin || Math.max(1, dicteeWoorden(q, d.tekst).length) : 1);
  const dicteeMax = q => q.delen.reduce((s, d) => s + dicteeZinPunten(q, d), 0);
  // Woord per woord naast elkaar gelegd (zoals Levenshtein, maar met woorden): een fout, ontbrekend of extra woord is één fout.
  // Geeft het aantal fouten en per geschreven woord of het goed is.
  function dicteeVergelijk(q, juist, geschreven) {
    const a = dicteeWoorden(q, juist);
    const b = dicteeWoorden(q, geschreven);
    const ruw = String(geschreven || '').trim().split(/\s+/).filter(Boolean);
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    // Terug door de tabel: welke geschreven woorden kloppen.
    const goed = Array(b.length).fill(false);
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) { goed[j - 1] = true; i--; j--; } else if (d[i][j] === d[i - 1][j - 1] + 1) { i--; j--; } else if (d[i][j] === d[i][j - 1] + 1) j--; else i--;
    }
    // ruw en b hebben evenveel woorden, behalve als een "woord" alleen uit leestekens bestond.
    const woorden = ruw.length === b.length ? ruw : b;
    return { fouten: d[a.length][b.length], woorden: woorden.map((w, k) => [w, goed[k]]) };
  }
  // De punten van één deel: een woord juist of niet; een zin: zijn punten min één per fout, nooit onder nul.
  function dicteeDeel(q, d, a) {
    if (q.vorm !== 'zinnen') {
      const w = dicteeWoorden(q, a);
      return w.length === 1 && dicteeWoorden(q, d.tekst).join(' ') === w[0] ? 1 : 0;
    }
    if (!String(a || '').trim()) return 0;
    return Math.max(0, dicteeZinPunten(q, d) - dicteeVergelijk(q, d.tekst, a).fouten);
  }

  function cleanVraag(q, waar, deel, bronTekst) {
    if (!q || typeof q !== 'object') throw new Error(`${waar} is leeg.`);
    const type = TYPES.includes(q.type) ? q.type : null;
    if (!type) throw new Error(`${waar} heeft een onbekende soort${q.type ? ` (${String(q.type).slice(0, 20)})` : ''}.`);
    if (deel && (type === 'bron' || type === 'blad')) throw new Error(`${waar}: dit kan niet in een bron.`);
    const out = { type };
    const vraag = text(pick(q, 'vraag', 'question', 'opdracht'), 1500);
    if (vraag) out.vraag = vraag;
    const beeld = beeldOf(q.beeld) || plaatsOf(q.beeld);
    if (beeld) out.beeld = beeld;
    const nodig = text(q.beeldNodig, 160);
    if (nodig && !beeld) out.beeldNodig = nodig;
    const pagina = Math.round(Number(q.beeldPagina));
    if (pagina >= 1 && pagina <= 999 && !beeld) out.beeldPagina = pagina;
    if (q.doel && typeof q.doel === 'string') out.doel = q.doel.trim().slice(0, 40);
    if (q.exact === true) out.exact = true;
    const audio = audioOf(q.audio);
    if (audio) out.audio = audio;
    // Een tekst die de computer voorleest (🎧): de leerling hoort ze, maar ziet ze niet.
    const zeg = text(q.voorlees, 1000);
    if (zeg && type !== 'bron' && type !== 'blad') out.voorlees = zeg;
    // Hoe vaak de leerling het geluid of de voorleestekst mag beluisteren (zonder: onbeperkt). 🎧 en 🐢 tellen samen.
    const keer = Number(q.luisterMax);
    if ((audio || out.voorlees) && (keer === 1 || keer === 2)) out.luisterMax = keer;
    const naam = `${waar} (${NAMES[type].toLowerCase()})`;
    if (type === 'bron') {
      out.titel = text(q.titel || q.title, 120);
      out.tekst = text(q.tekst || q.text, 6000);
      out.vragen = list(q.vragen || q.questions, MAX_DEEL).map((d, j) => cleanVraag(d, `${waar}${'abcdefghijklmno'[j]}`, true, out.tekst));
      if (!out.vragen.length) throw new Error(`${naam} heeft geen deelvragen.`);
      if (!out.tekst && !out.beeld && !out.beeldNodig) throw new Error(`${naam} heeft geen tekst of afbeelding.`);
      return out;
    }
    if (type === 'blad') return cleanBlad(q, out, naam);
    if (!out.vraag && !['invullen', 'tabel'].includes(type)) throw new Error(`${naam}: de vraag is leeg.`);
    let max = 1;
    if (type === 'meerkeuze') {
      out.opties = list(pick(q, 'opties', 'options'), 8).map(o => {
        if (o && typeof o === 'object') {
          const t = text(o.tekst || o.text, 300);
          const b = beeldOf(o.beeld) || plaatsOf(o.beeld);
          return b ? { tekst: t, beeld: b } : t;
        }
        return text(o, 300);
      }).filter(o => o && (typeof o === 'string' || o.tekst || o.beeld));
      if (out.opties.length < 2) throw new Error(`${naam}: minstens twee keuzes nodig.`);
      const raw = pick(q, 'juist', 'correct');
      const juist = [...new Set((Array.isArray(raw) ? raw : [raw]).map(Number))].filter(n => Number.isInteger(n) && n >= 0 && n < out.opties.length).sort((a, b) => a - b);
      if (!juist.length) throw new Error(`${naam}: duid het juiste antwoord aan.`);
      out.juist = juist.length === 1 ? juist[0] : juist;
      // De keuzes altijd door elkaar, ook als de leerkracht de vragen in een vaste volgorde afneemt.
      if (q.schudden === true) out.schudden = true;
      // Meerdere juiste: punten per juist antwoord (een fout kost er één), en hoeveel de leerling moet aanduiden.
      if (juist.length > 1) {
        if (q.puntenPer === 'juist') out.puntenPer = 'juist';
        const aantal = Math.round(Number(q.aantal));
        if (aantal >= 1 && aantal < juist.length) out.aantal = aantal;
        if (out.puntenPer) max = out.aantal || juist.length;
      }
    } else if (type === 'juistfout') {
      const ja = c => c === true || /^(j|juist|true|waar|ja)$/i.test(String(c));
      // Meerdere stellingen in één vraag: per stelling juist of fout (of ja of nee), een punt per stelling.
      const st = list(q.stellingen, 20).map(x => (x && typeof x === 'object' ? { tekst: text(x.tekst, 300), juist: ja(x.juist) } : null)).filter(x => x && x.tekst);
      if (st.length) {
        out.stellingen = st;
        if (q.labels === 'janee') out.labels = 'janee';
        max = st.length;
      } else out.juist = ja(pick(q, 'juist', 'correct'));
    } else if (type === 'invullen') {
      out.tekst = text(q.tekst || q.text, 4000);
      const n = gapsOf(out.tekst).length;
      if (!n) throw new Error(`${naam} heeft geen gaten. Zet wat de leerling invult tussen [ en ].`);
      if (n > 40) throw new Error(`${naam} heeft te veel gaten (hooguit 40).`);
      // Alle gaten even breed: de lengte van het gat verraadt het antwoord niet.
      if (q.gelijk === true) out.gelijk = true;
      if (q.bank === true) {
        out.bank = true;
        const extra = [...new Set(list(q.extra, 20).map(w => text(w, 60)).filter(Boolean))];
        if (extra.length) out.extra = extra;
      }
      max = n;
    } else if (type === 'getallenas') {
      const min = getal(q.min);
      const maxi = getal(q.max);
      const stap = getal(q.stap);
      if (min === null || maxi === null || maxi <= min) throw new Error(`${naam}: kies een begin en een einde (het einde groter dan het begin).`);
      if (!(stap > 0) || (maxi - min) / stap > 100.000001) throw new Error(`${naam}: de stap tussen de streepjes is te klein (hooguit 100 streepjes).`);
      Object.assign(out, { min: text(q.min, 20), max: text(q.max, 20), stap: text(q.stap, 20) });
      const a = getal(pick(q, 'antwoord', 'answer'));
      if (a === null) throw new Error(`${naam}: het juiste getal ontbreekt.`);
      out.antwoord = text(pick(q, 'antwoord', 'answer'), 20);
      out.getallen = q.getallen === 'alle' ? 'alle' : 'rand';
      if (q.breuk === true) out.breuk = true;
    } else if (type === 'markeren') {
      if (PER.includes(q.per)) out.per = q.per;
      const kleuren = list(q.kleuren, MAX_KLEUREN).map(c => ({ kleur: STIFTEN[c && c.kleur] ? c.kleur : '', uitleg: text(c && c.uitleg, 60) })).filter(c => c.kleur);
      if (kleuren.length) out.kleuren = kleuren;
      const aantal = Math.round(Number(q.aantal));
      if (aantal >= 1 && aantal <= 99) out.aantal = aantal;
      if (deel && q.inBron === true) {
        out.inBron = true;
        out.bronTekst = bronTekst || '';
        out.doelen = doelenInBron(q.doelen, out.bronTekst).map(d => (d[2] > (kleuren.length || 1) ? [d[0], d[1], 1, d[3]] : d));
        if (!out.bronTekst) throw new Error(`${naam}: de bron heeft nog geen tekst om in aan te duiden.`);
      } else {
        out.tekst = text(q.tekst || q.text, 4000);
        if (!doelenVan(out.tekst).length) throw new Error(`${naam}: zet de woorden die de leerling moet aanduiden tussen [ en ].`);
      }
      // Een kleur die niet (meer) bestaat, wordt de eerste.
      const m = markeerModel(out);
      if (out.kleuren && m.doelen.some(d => d.k > out.kleuren.length)) throw new Error(`${naam}: een juist stuk heeft een kleur die er niet is.`);
      if (!out.kleuren && m.doelen.some(d => d.k > 1)) throw new Error(`${naam}: kies de kleuren (er staat een tweede kleur in de tekst).`);
      max = out.aantal ? Math.min(out.aantal, m.doelen.length) || out.aantal : m.doelen.length;
      if (out.aantal && out.aantal > m.doelen.length && m.doelen.length) throw new Error(`${naam}: de leerling moet er ${out.aantal} aanduiden, maar er zijn er maar ${m.doelen.length} juist.`);
      if (!out.inBron) max = Math.max(1, max);
    } else if (type === 'tekenen') {
      const v = Number(q.verhouding);
      out.verhouding = v > 0.05 && v < 20 ? Math.round(v * 1000) / 1000 : 0.6;
      const model = text(pick(q, 'model', 'modelantwoord'), 2000);
      if (model) out.model = model;
      max = 2;
    } else if (type === 'spreken') {
      out.seconden = Math.min(180, Math.max(10, Math.round(Number(q.seconden)) || 60));
      const model = text(pick(q, 'model', 'modelantwoord'), 2000);
      if (model) out.model = model;
      max = 2;
    } else if (type === 'kort' || type === 'rekenen') {
      out.antwoord = text(pick(q, 'antwoord', 'answer', 'uitkomst'), 300);
      if (!alts(out.antwoord).length) throw new Error(`${naam}: het juiste antwoord ontbreekt.`);
      const eenheid = text(q.eenheid, 20);
      if (eenheid) out.eenheid = eenheid;
      if (type === 'rekenen') out.werkPunten = punt(q.werkPunten, 1);
      if (type === 'rekenen' && q.rooster === true) {
        out.rooster = true;
        // Een losse rekenvraag heeft het hele scherm: een wat groter rooster.
        out.kol = roosterMaat(q.kol, 12, ROOSTER.maxKol);
        out.rij = roosterMaat(q.rij, 6, ROOSTER.maxRij);
      }
      if (q.breuk === true) out.breuk = true;
      if (q.vereenvoudigd === true) out.vereenvoudigd = true;
    } else if (type === 'verbinden') {
      out.paren = list(pick(q, 'paren', 'pairs'), 12).map((p, i) => {
        const l = text(Array.isArray(p) ? p[0] : p && (p.links || p.left), 200);
        const r = text(Array.isArray(p) ? p[1] : p && (p.rechts || p.right), 200);
        if (!l || !r) throw new Error(`${naam}, paar ${i + 1} is niet volledig.`);
        return [l, r];
      });
      if (out.paren.length < 2) throw new Error(`${naam} heeft minstens twee paren nodig.`);
      max = out.paren.length;
    } else if (type === 'ordenen') {
      // Een item is tekst, of { tekst, beeld } (een prent, met of zonder tekst), net als de keuzes bij meerkeuze.
      out.items = list(q.items, 12).map(i => {
        if (i && typeof i === 'object') {
          const t = text(i.tekst || i.text, 200);
          const b = beeldOf(i.beeld) || plaatsOf(i.beeld);
          return b ? { tekst: t, beeld: b } : t;
        }
        return text(i, 200);
      }).filter(i => i && (typeof i === 'string' || i.tekst || i.beeld));
      if (out.items.length < 2) throw new Error(`${naam} heeft minstens twee dingen om te ordenen nodig.`);
      // Punten per juiste plaats (in plaats van alles juist).
      if (q.puntenPer === 'plaats') { out.puntenPer = 'plaats'; max = out.items.length; }
    } else if (type === 'sorteren') {
      // Kolommen met de woorden die erin horen; extra = woorden die nergens horen (ze blijven liggen).
      const woord = w => text(w, 80);
      out.kolommen = list(q.kolommen, 6).map(k => ({ naam: text(k && k.naam, 60), woorden: [...new Set(list(k && k.woorden, 30).map(woord).filter(Boolean))] }))
        .filter(k => k.naam || k.woorden.length);
      if (out.kolommen.length < 2) throw new Error(`${naam} heeft minstens twee kolommen nodig.`);
      if (out.kolommen.some(k => !k.naam)) throw new Error(`${naam}: geef elke kolom een naam.`);
      const extra = [...new Set(list(q.extra, 20).map(woord).filter(Boolean))].filter(w => !out.kolommen.some(k => k.woorden.includes(w)));
      if (extra.length) out.extra = extra;
      const n = sorteerWoorden(out).filter(w => sorteerKolommen(out, w).length).length;
      if (!n) throw new Error(`${naam}: zet de woorden in hun kolom.`);
      if (sorteerWoorden(out).length > 60) throw new Error(`${naam} heeft te veel woorden (hooguit 60).`);
      max = n;
    } else if (type === 'dictee') {
      // Woorden: de leerling hoort een woord (en eventueel een zin ermee) en schrijft het woord. Zinnen: hij schrijft de hele zin.
      out.vorm = q.vorm === 'zinnen' ? 'zinnen' : 'woorden';
      out.delen = list(q.delen, MAX_DICTEE).map(d => (typeof d === 'string' ? { tekst: d } : d || {}))
        .map(d => ({ tekst: text(d.tekst, out.vorm === 'zinnen' ? 300 : 80).replace(/\s+/g, ' '), zin: out.vorm === 'woorden' ? text(d.zin, 300).replace(/\s+/g, ' ') : '' }))
        .filter(d => d.tekst).map(d => (d.zin ? d : { tekst: d.tekst }));
      if (!out.delen.length) throw new Error(out.vorm === 'zinnen' ? `${naam}: typ de zinnen die voorgelezen worden.` : `${naam}: typ de woorden die voorgelezen worden.`);
      if (q.hoofdletters === false) out.hoofdletters = false;
      if (q.leestekens === true) out.leestekens = true;
      const pz = Math.round(Number(q.puntenZin));
      if (out.vorm === 'zinnen' && pz >= 1 && pz <= 20) out.puntenZin = pz;
      max = dicteeMax(out);
    } else if (type === 'tabel') {
      out.rijen = list(q.rijen || q.rows, 20).map(r => list(r, 8).map(c => text(c, 120)));
      const breed = Math.max(0, ...out.rijen.map(r => r.length));
      out.rijen = out.rijen.filter(r => r.some(Boolean)).map(r => [...r, ...Array(breed - r.length).fill('')]);
      if (out.rijen.length < 2 || breed < 1) throw new Error(`${naam} heeft een kop en minstens één rij nodig.`);
      const n = out.rijen.slice(1).flat().filter(celGat).length;
      if (!n) throw new Error(`${naam}: zet de cellen die de leerling invult tussen [ en ], bv. [12].`);
      max = n;
    } else if (type === 'aanduiden') {
      out.zones = list(q.zones, MAX_ZONES).map(z => {
        const zone = {
          x: Math.min(100, Math.max(0, Number(z && z.x) || 0)),
          y: Math.min(100, Math.max(0, Number(z && z.y) || 0)),
          r: Math.min(50, Math.max(1, Number(z && z.r) || 6)),
        };
        const naam = text(z && (z.naam || z.name || z.label), 40);
        if (naam) zone.naam = naam;
        return zone;
      });
      const v = Number(q.verhouding);
      out.verhouding = v > 0.05 && v < 20 ? Math.round(v * 1000) / 1000 : 0.75;
      if (metNamen(out)) max = out.zones.length;
    } else if (type === 'open') {
      const model = text(pick(q, 'model', 'modelantwoord'), 2000);
      if (model) out.model = model;
      out.regels = Math.min(12, Math.max(1, Math.round(Number(q.regels)) || 3));
    } else if (type === 'papier') {
      const model = text(pick(q, 'model', 'modelantwoord'), 2000);
      if (model) out.model = model;
    }
    out.punten = punt(pick(q, 'punten', 'points'), max);
    return out;
  }

  const pct = (v, max = 100) => Math.round(Math.min(max, Math.max(0, Number(v) || 0)) * 100) / 100;

  // ---------- Rekenrooster met sleutel ----------
  // Een rooster als tekst: één regel per rij. Heeft een hokje meer dan één teken (7, met de komma erbij),
  // dan staat er | tussen de hokjes. Lege rijen onderaan vallen weg.
  function roosterCellen(v, kol = ROOSTER.maxKol, rij = ROOSTER.maxRij) {
    return String(v || '').replace(/\r/g, '').split('\n').slice(0, rij).map(r => (r.includes('|') ? r.split('|') : Array.from(r)).slice(0, kol).map(c => c.trim()));
  }
  function roosterTekst(v, kol, rij) {
    const rijen = roosterCellen(v, kol, rij).map(r => {
      const breed = r.some(c => c.length > 1);
      let cellen = r.map(c => c.replace(/\|/g, '').slice(0, 2));
      while (cellen.length && !cellen[cellen.length - 1]) cellen.pop();
      return breed ? cellen.join('|') : cellen.map(c => c || ' ').join('');
    });
    while (rijen.length && !rijen[rijen.length - 1].trim().replace(/\|/g, '')) rijen.pop();
    return rijen.join('\n').slice(0, 1000);
  }
  // Een rij om te vergelijken: zonder spaties en rekentekens, een punt is een komma. Een lijn (----) is leeg.
  const rijNorm = cellen => cellen.join('').toLowerCase().replace(/\s+/g, '').replace(/\./g, ',').replace(/[x*×÷:=+−–_-]/g, '');
  const rijZelfde = (a, b) => {
    if (a === b) return true;
    const x = getal(a);
    const y = getal(b);
    return x !== null && y !== null && Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(x));
  };
  // De stukken van een rij (gescheiden door lege hokjes), bv. bij een deling: "1234 | 5" en het quotiënt ernaast.
  const rijStukken = cellen => cellen.map(c => c || ' ').join('').split(/\s+/).map(c => rijNorm([c])).filter(Boolean);
  const roosterAuto = f => f.soort === 'rooster' && NAKIJK.includes(f.nakijk) && (f.nakijk === 'deling' ? !!f.quotient : !!(f.sleutel || (f.nakijk === 'uitkomst' && f.uitkomst)));
  // Eén hokje om te vergelijken: een kruisje is een x, een punt is een komma.
  const celNorm = c => String(c || '').trim().toLowerCase().replace(/[×✗✘]/g, 'x').replace(/\./g, ',');
  // De stukken van een rij bij een deling: gescheiden door lege hokjes of de streep (|), zonder min-tekens en zonder "r" of "rest" ervoor.
  const delingStukken = cellen => cellen.map(c => c || ' ').join('').split(/[\s|]+/).map(c => rijNorm([c]).replace(/^(rest|r)/, '')).filter(Boolean);
  // De uitkomst die de computer zoekt: zelf ingevuld, of de uitkomstrij (of de onderste rij) van de sleutel.
  function roosterUitkomst(f) {
    if (f.uitkomst) return f.uitkomst;
    const r = roosterCellen(f.sleutel);
    let i = f.uitkomstRij ? f.uitkomstRij - 1 : -1;
    if (i < 0) for (let j = r.length - 1; j >= 0; j--) if (rijNorm(r[j])) { i = j; break; }
    return i >= 0 && r[i] ? r[i].map(c => c || ' ').join('').trim() : '';
  }
  // Hoeveel van het rooster is juist: 0 tot 1 (per rij), of null zonder sleutel.
  function roosterScore(f, a) {
    if (!roosterAuto(f)) return null;
    const leerling = roosterCellen(a);
    const vol = leerling.filter(r => rijNorm(r));
    if (!vol.length) return 0;
    if (f.nakijk === 'deling') {
      // Het quotiënt rechts in een van de bovenste rijen (naast of onder de deler), de rest vooraan in de onderste ingevulde rij.
      const q = rijNorm([f.quotient]);
      const qGoed = vol.slice(0, 3).some(r => { const st = delingStukken(r); return st.length > 0 && rijZelfde(st[st.length - 1], q); });
      if (!f.rest) return qGoed ? 1 : 0;
      const st = delingStukken(vol[vol.length - 1]);
      return qGoed && st.length > 0 && rijZelfde(st[0], rijNorm([f.rest])) ? 1 : 0;
    }
    if (f.nakijk === 'cellen') {
      // Elk hokje op zijn plek; een hokje dat leeg moet blijven, telt alleen mee als de leerling er iets in zette.
      const sl = roosterCellen(f.sleutel);
      let n = 0;
      let goed = 0;
      for (let r = 0; r < Math.max(sl.length, leerling.length); r++) {
        for (let c = 0; c < Math.max((sl[r] || []).length, (leerling[r] || []).length); c++) {
          const x = celNorm((sl[r] || [])[c]);
          const y = celNorm((leerling[r] || [])[c]);
          if (!x && !y) continue;
          n++;
          if (x === y || (x && y && rijZelfde(x, y))) goed++;
        }
      }
      return n ? goed / n : 0;
    }
    if (f.nakijk === 'uitkomst') {
      const doel = rijNorm([roosterUitkomst(f)]);
      if (!doel) return 0;
      // De rij van de uitkomst (als de sleutel ze kent) of de onderste ingevulde rij.
      let rij = f.uitkomstRij;
      if (!rij && f.sleutel && !f.uitkomst) {
        const k = roosterCellen(f.sleutel);
        for (let j = k.length - 1; j >= 0; j--) if (rijNorm(k[j])) { rij = j + 1; break; }
      }
      const rijen = [vol[vol.length - 1]];
      if (rij && leerling[rij - 1]) rijen.unshift(leerling[rij - 1]);
      return rijen.some(r => rijZelfde(rijNorm(r), doel) || rijStukken(r).some(s => rijZelfde(s, doel))) ? 1 : 0;
    }
    const sleutel = roosterCellen(f.sleutel).map(rijNorm).filter(Boolean);
    const gegeven = vol.map(rijNorm);
    if (!sleutel.length) return 0;
    if (f.nakijk === 'alles') return gegeven.length === sleutel.length && sleutel.every((r, i) => rijZelfde(r, gegeven[i])) ? 1 : 0;
    // Per rij: de juiste rijen in dezelfde volgorde (een extra rij, bv. met onthouden cijfers, mag).
    let goed = 0;
    let j = 0;
    for (const r of sleutel) {
      const i = gegeven.findIndex((g, n) => n >= j && rijZelfde(g, r));
      if (i >= 0) { goed++; j = i + 1; }
    }
    return goed / sleutel.length;
  }

  // ---------- Marge bij een getal ----------
  function margeVan(f, veld) {
    const n = v => { const x = getal(v); return x === null ? null : x; };
    if (f.van !== undefined && f.tot !== undefined && f.van !== '' && f.tot !== '' && n(f.van) !== null && n(f.tot) !== null && n(f.van) <= n(f.tot)) {
      veld.van = text(f.van, 20);
      veld.tot = text(f.tot, 20);
      return;
    }
    const m = Number(String(f.marge ?? '').replace(',', '.'));
    if (f.marge !== undefined && f.marge !== '' && f.marge !== null && Number.isFinite(m) && m > 0) { veld.marge = Math.round(m * 1e6) / 1e6; return; }
    const p = Number(String(f.margeProcent ?? '').replace(',', '.'));
    if (f.margeProcent !== undefined && f.margeProcent !== '' && f.margeProcent !== null && Number.isFinite(p) && p > 0) veld.margeProcent = Math.min(100, Math.round(p * 100) / 100);
  }
  const heeftMarge = f => !!(f.marge || f.margeProcent || (f.van !== undefined && f.tot !== undefined));
  // De grenzen: [laagste, hoogste] of null.
  function margeGrenzen(f) {
    if (f.van !== undefined && f.tot !== undefined) {
      const a = getal(f.van);
      const b = getal(f.tot);
      return a === null || b === null ? null : [a, b];
    }
    const x = getal(alts(f.antwoord)[0], f.eenheid);
    if (x === null) return null;
    const d = f.marge ? f.marge : (Math.abs(x) * (f.margeProcent || 0)) / 100;
    return [x - d, x + d];
  }
  function margeGoed(f, gegeven) {
    const g = margeGrenzen(f);
    const y = getal(gegeven, f.eenheid);
    if (!g || y === null) return false;
    const eps = 1e-9 * Math.max(1, Math.abs(y));
    return y >= g[0] - eps && y <= g[1] + eps;
  }
  // Een getal zoals op een Belgisch blad: 1 800 en 0,5.
  function getalTekst(x) {
    const r = Math.round(x * 1e6) / 1e6;
    const [geheel, komma] = String(Math.abs(r)).split('.');
    const groepen = geheel.length > 3 ? geheel.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : geheel;
    return `${r < 0 ? '-' : ''}${groepen}${komma ? `,${komma}` : ''}`;
  }
  function margeTekst(f) {
    const g = margeGrenzen(f);
    if (!g) return alts(f.antwoord)[0] || '';
    const a = alts(f.antwoord)[0];
    const x = getal(a, f.eenheid);
    const midden = x !== null ? `≈ ${getalTekst(x)} ` : '';
    return `${midden}(${getalTekst(g[0])} – ${getalTekst(g[1])})`.trim();
  }

  // ---------- Lijnen tussen punten en cirkels ----------
  const puntNaam = i => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] || String(i + 1);
  // Een antwoord "0-2,1-3": de lijnen van de leerling, elk als [klein, groot].
  function puntLijnen(a, n) {
    const out = [];
    for (const s of String(a || '').split(',')) {
      const m = /^(\d+)-(\d+)$/.exec(s.trim());
      if (!m) continue;
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (x === y || x >= n || y >= n) continue;
      const l = [Math.min(x, y), Math.max(x, y)];
      if (!out.some(o => o[0] === l[0] && o[1] === l[1])) out.push(l);
    }
    return out;
  }
  function puntlijnGoed(f, a, verhouding = 1.414) {
    const n = (f.pt || []).length;
    const lijnen = puntLijnen(a, n);
    if (f.doorPunt !== undefined) {
      // Elke lijn gaat door het punt (bv. de middellijn door M), van een ander punt naar een ander punt.
      const P = i => ({ x: f.x + (f.pt[i].x * f.w) / 100, y: (f.y + (f.pt[i].y * f.h) / 100) * verhouding });
      const m = P(f.doorPunt);
      return lijnen.length === (f.aantal || 1) && lijnen.every(([i, j]) => {
        if (i === f.doorPunt || j === f.doorPunt) return false;
        const a1 = P(i);
        const b1 = P(j);
        const dx = b1.x - a1.x;
        const dy = b1.y - a1.y;
        const len2 = dx * dx + dy * dy;
        if (!len2) return false;
        const t = ((m.x - a1.x) * dx + (m.y - a1.y) * dy) / len2;
        const afstand = Math.hypot(a1.x + t * dx - m.x, a1.y + t * dy - m.y);
        return t > 0.05 && t < 0.95 && afstand <= 1.2;
      });
    }
    const sleutel = f.lijnen || [];
    return sleutel.length > 0 && lijnen.length === sleutel.length && sleutel.every(([i, j]) => lijnen.some(l => l[0] === i && l[1] === j));
  }
  // Een cirkel van de leerling: "x,y,s" (x, y in procent van het vak, s de straal in procent van de breedte van het blad).
  function cirkelsVan(a) {
    return String(a || '').split(';').map(c => c.split(',').map(Number)).filter(c => c.length === 3 && c.every(Number.isFinite) && c[2] > 0).slice(0, 12);
  }
  // De straal in cm, afgerond op een mm (zo ziet de leerling hem ook).
  const straalCm = (s, schaal = SCHAAL) => Math.round(((s / 100) * schaal) * 10) / 10;
  function cirkelGoed(f, a, verhouding = 1.414, schaal = SCHAAL) {
    const sleutel = f.cirkels || [];
    const gegeven = cirkelsVan(a);
    if (!sleutel.length || gegeven.length !== sleutel.length) return false;
    const marge = f.marge ?? 0.1;
    const vrij = gegeven.slice();
    return sleutel.every(k => {
      const i = vrij.findIndex(([x, y, s]) => {
        const dx = (((x - k.x) / 100) * f.w * schaal) / 100;
        const dy = (((y - k.y) / 100) * f.h * schaal * verhouding) / 100;
        return Math.hypot(dx, dy) <= Math.max(0.3, marge * 2) + 1e-9 && Math.abs(straalCm(s, schaal) - k.r) <= marge + 1e-9;
      });
      if (i < 0) return false;
      vrij.splice(i, 1);
      return true;
    });
  }

  // ---------- Veelhoek op roosterpunten ----------
  const FIGUREN = ['driehoek', 'gelijkzijdige driehoek', 'rechthoekige driehoek', 'gelijkbenige driehoek', 'stomphoekige driehoek', 'scherphoekige driehoek',
    'vierhoek', 'vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium', 'rechthoekig trapezium', 'gelijkbenig trapezium', 'vlieger', 'vijfhoek', 'zeshoek'];
  // Het antwoord "c,r;c,r;...": de hoekpunten (kolom, rij van de stip), in de volgorde waarin de leerling ze aantikte.
  function hoekpunten(a, f) {
    return String(a || '').split(';').map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isInteger) && p[0] >= 0 && p[1] >= 0 && p[0] < (f.kol || 99) && p[1] < (f.rij || 99)).slice(0, 12);
  }
  // Kruisen de zijden van deze figuur elkaar (de punten in een rare volgorde aangetikt)?
  function zijdenKruisen(pts) {
    const n = pts.length;
    const kruis = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [p1, p2, p3, p4] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      const d1 = kruis(p3, p4, p1); const d2 = kruis(p3, p4, p2); const d3 = kruis(p1, p2, p3); const d4 = kruis(p1, p2, p4);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
    return false;
  }
  // De hoekpunten rondom: wie ze in een andere volgorde aantikt (bv. eerst de uiteinden van de diagonalen), krijgt toch de figuur die hij bedoelt.
  function rondom(pts) {
    if (pts.length < 4 || !zijdenKruisen(pts)) return pts;
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [...pts].sort((a, b) => Math.atan2(a[1] - my, a[0] - mx) - Math.atan2(b[1] - my, b[0] - mx));
  }
  // De punten in echte verhoudingen (de stippen staan gelijk verdeeld over het vak).
  // Met diagonalen: punt 1-2 en 3-4 zijn de diagonalen, de vierhoek gaat 1, 3, 2, 4 rond.
  function veelhoekVolgorde(f, pts) {
    return f && f.diagonalen && pts.length === 4 ? [pts[0], pts[2], pts[1], pts[3]] : pts;
  }
  function veelhoekPunten(f, a, verhouding = 1.414) {
    const dx = f.w / Math.max(1, f.kol - 1);
    const dy = (f.h * verhouding) / Math.max(1, f.rij - 1);
    // Een rooster dat bijna vierkant is (zoals op het blad), telt als vierkant: dan rekenen we met hele stappen.
    const rho = !f.vrijePunten && Math.abs(dy / dx - 1) < 0.1 ? 1 : dy / dx;
    return rondom(veelhoekVolgorde(f, hoekpunten(a, f))).map(([c, r]) => [c, r * rho]);
  }
  // Welke figuren is dit? Een lijst van alle namen die passen (een vierkant is ook een rechthoek, ruit, ...), de meest precieze eerst.
  // tol (bij vrije punten, in cm): { len: marge voor even lang, hoek: marge in graden }. Zonder tol: precies (roosterpunten).
  function figurenVan(pts, tol) {
    const n = pts.length;
    if (n < 3) return [];
    const kruis = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const eps = 1e-6;
    // Geen twee keer hetzelfde punt, geen drie punten op één lijn, en de zijden kruisen elkaar niet.
    for (let i = 0; i < n; i++) {
      const a = pts[i]; const b = pts[(i + 1) % n]; const c = pts[(i + 2) % n];
      if (Math.abs(kruis(a, b, c)) < eps) return [];
      for (let j = i + 1; j < n; j++) if (Math.hypot(a[0] - pts[j][0], a[1] - pts[j][1]) < eps) return [];
    }
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [p1, p2, p3, p4] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      const d1 = kruis(p3, p4, p1); const d2 = kruis(p3, p4, p2); const d3 = kruis(p1, p2, p3); const d4 = kruis(p1, p2, p4);
      if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return [];
    }
    const z = i => [pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]];
    const len = v => Math.hypot(v[0], v[1]);
    const graden = (a, b) => (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b))))) * 180) / Math.PI;
    const evenLang = (a, b) => Math.abs(len(a) - len(b)) < (tol ? tol.len + 1e-9 : 1e-6);
    const evenwijdig = (a, b) => (tol ? Math.min(graden(a, b), 180 - graden(a, b)) <= tol.hoek : Math.abs(a[0] * b[1] - a[1] * b[0]) < 1e-6);
    const recht = (a, b) => (tol ? Math.abs(90 - graden(a, b)) <= tol.hoek : Math.abs(a[0] * b[0] + a[1] * b[1]) < 1e-6);
    const zijden = pts.map((_, i) => z(i));
    const hoekRecht = zijden.some((v, i) => recht(v, zijden[(i + 1) % n]));
    if (n === 3) {
      const out = [];
      const l = zijden.map(len).sort((a, b) => a - b);
      const verschil = l[2] * l[2] - l[0] * l[0] - l[1] * l[1];
      // De grootste hoek (tegenover de langste zijde), voor de marge bij vrije punten.
      const groot = (Math.acos(Math.max(-1, Math.min(1, (l[0] * l[0] + l[1] * l[1] - l[2] * l[2]) / (2 * l[0] * l[1])))) * 180) / Math.PI;
      const rechtH = tol ? Math.abs(groot - 90) <= tol.hoek : Math.abs(verschil) < 1e-6;
      const gelijk = (a, b) => Math.abs(a - b) < (tol ? tol.len + 1e-9 : 1e-6);
      // Volgorde: gelijkzijdig, rechthoekig, gelijkbenig, dan stomp- of scherphoekig (de eerste is wat 'precies' bedoelt).
      if (gelijk(l[0], l[1]) && gelijk(l[1], l[2]) && gelijk(l[0], l[2])) out.push('gelijkzijdige driehoek');
      if (rechtH) out.push('rechthoekige driehoek');
      if (gelijk(l[0], l[1]) || gelijk(l[1], l[2])) out.push('gelijkbenige driehoek');
      if (!rechtH) out.push(verschil > 0 ? 'stomphoekige driehoek' : 'scherphoekige driehoek');
      return [...out, 'driehoek'];
    }
    if (n === 4) {
      const [a, b, c, d] = zijden;
      const p1 = evenwijdig(a, c);
      const p2 = evenwijdig(b, d);
      const alleGelijk = evenLang(a, b) && evenLang(b, c) && evenLang(c, d);
      const diag = (i, j) => Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
      const out = [];
      if (alleGelijk && hoekRecht) out.push('vierkant');
      if (p1 && p2 && hoekRecht) out.push('rechthoek');
      if (alleGelijk) out.push('ruit');
      if (p1 && p2) out.push('parallellogram');
      if ((p1 || p2) && hoekRecht) out.push('rechthoekig trapezium');
      if ((p1 || p2) && Math.abs(diag(0, 2) - diag(1, 3)) < (tol ? tol.len + 1e-9 : 1e-6)) out.push('gelijkbenig trapezium');
      if (p1 || p2) out.push('trapezium');
      if ((evenLang(a, b) && evenLang(c, d)) || (evenLang(b, c) && evenLang(d, a))) out.push('vlieger');
      return [...out, 'vierhoek'];
    }
    return n === 5 ? ['vijfhoek'] : n === 6 ? ['zeshoek'] : [];
  }
  // De hoekpunten zonder punten die midden op een zijde liggen, als een vaste rij (om twee figuren te vergelijken).
  function vormSleutel(f, a) {
    let p = rondom(veelhoekVolgorde(f, hoekpunten(a, f)));
    const uniek = [];
    for (const x of p) if (!uniek.some(y => y[0] === x[0] && y[1] === x[1])) uniek.push(x);
    p = uniek;
    if (p.length >= 3) p = p.filter((b, i) => { const a2 = p[(i + p.length - 1) % p.length]; const c = p[(i + 1) % p.length]; return (b[0] - a2[0]) * (c[1] - a2[1]) - (b[1] - a2[1]) * (c[0] - a2[0]) !== 0; });
    return p;
  }
  // Dezelfde figuur op dezelfde plek: dezelfde hoekpunten in dezelfde volgorde rond (beginnen waar je wilt, in elke richting).
  function zelfdeVorm(f, a) {
    const x = vormSleutel(f, a);
    const y = vormSleutel({ kol: f.kol, rij: f.rij }, f.vorm);
    if (!y.length || x.length !== y.length) return false;
    const n = y.length;
    const s = p => `${p[0]},${p[1]}`;
    for (const r of [x, [...x].reverse()]) for (let i = 0; i < n; i++) if (y.every((p, j) => s(p) === s(r[(i + j) % n]))) return true;
    return false;
  }
  // Vrije punten: de hoekpunten in cm (volgens de schaal van het blad).
  function veelhoekCm(f, a, verhouding = 1.414, schaal = SCHAAL) {
    const per = ((f.w / Math.max(1, f.kol - 1)) / 100) * schaal;
    return veelhoekPunten(f, a, verhouding).map(([x, y]) => [x * per, y * per]);
  }
  function veelhoekGoed(f, a, verhouding, schaal = SCHAAL) {
    if (f.vorm && !f.vrijePunten) return zelfdeVorm(f, a);
    if (!f.figuur) return false;
    if (f.vrijePunten) {
      const pts = veelhoekCm(f, a, verhouding, schaal);
      const marge = f.zijdeMarge ?? 0.2;
      // Met een zijde: elke zijde zo lang (bv. een gelijkzijdige driehoek met zijden van 4 cm).
      if (f.zijde && !pts.every((p, i) => { const q2 = pts[(i + 1) % pts.length]; return Math.abs(Math.hypot(q2[0] - p[0], q2[1] - p[1]) - f.zijde) <= marge + 1e-9; })) return false;
      const soorten = figurenVan(pts, { len: marge, hoek: 3 });
      return f.strikt ? soorten[0] === f.figuur : soorten.includes(f.figuur);
    }
    const soorten = figurenVan(veelhoekPunten(f, a, verhouding));
    return f.strikt ? soorten[0] === f.figuur : soorten.includes(f.figuur);
  }

  // ---------- Gevolgfout: een rekenregel met de eigen antwoorden ----------
  // "{1} * {2} / 2": de getallen in vakje 1 en 2 van de leerling. Alleen + - * / ( ) en getallen, zonder eval.
  function rekenregel(formule, waarde) {
    const t = String(formule || '').replace(/×/g, '*').replace(/[÷:]/g, '/').replace(/\{(\d+)\}/g, (_, n) => {
      const x = waarde(Number(n));
      if (x === null || x === undefined || !Number.isFinite(x)) throw new Error(`vakje ${n} is geen getal`);
      return `(${x})`;
    }).replace(/(\d),(\d)/g, '$1.$2');
    let i = 0;
    const stuk = () => {
      while (t[i] === ' ') i++;
      if (t[i] === '(') { i++; const x = som(); while (t[i] === ' ') i++; if (t[i++] !== ')') throw new Error('haakje'); return x; }
      if (t[i] === '-') { i++; return -stuk(); }
      const m = /^\d+(\.\d+)?/.exec(t.slice(i));
      if (!m) throw new Error('teken');
      i += m[0].length;
      return Number(m[0]);
    };
    const maal = () => { let x = stuk(); for (;;) { while (t[i] === ' ') i++; if (t[i] === '*') { i++; x *= stuk(); } else if (t[i] === '/') { i++; x /= stuk(); } else return x; } };
    const som = () => { let x = maal(); for (;;) { while (t[i] === ' ') i++; if (t[i] === '+') { i++; x += maal(); } else if (t[i] === '-') { i++; x -= maal(); } else return x; } };
    const x = som();
    while (t[i] === ' ') i++;
    if (i < t.length) throw new Error('teken');
    return x;
  }
  // Wat klopt er niet aan de rekenregel? '' = goed. n: het aantal vakjes, k: dit vakje.
  function formuleFout(formule, n, k) {
    const nrs = [...String(formule).matchAll(/\{(\d+)\}/g)].map(m => Number(m[1]));
    if (!nrs.length) return 'gebruik een vakje, bv. {1}';
    const fout = nrs.find(x => x < 1 || x > n || x === k + 1);
    if (fout) return `vakje ${fout} kan niet`;
    try { rekenregel(formule, () => 1); } catch { return 'alleen getallen, {1}, + - * / en haakjes'; }
    return '';
  }
  // Klopt het getal van de leerling met de rekenregel en zijn eigen antwoorden? Afronden mag, zoals in de sleutel.
  function gevolgGoed(f, b, k) {
    let y;
    try { y = rekenregel(f.formule, n => (n - 1 === k ? null : getal(b[n - 1]))); } catch { return false; }
    const x = getal(b[k], f.eenheid);
    if (x === null || !Number.isFinite(y)) return false;
    const dec = s => { const m = /[.,](\d+)\s*$/.exec(String(s || '').replace(/[^\d.,]+$/, '')); return m ? m[1].length : 0; };
    const d = Math.max(dec(b[k]), dec(alts(f.antwoord)[0]));
    if (Math.abs(y - Math.round(y)) < 1e-9 && d === 0) return Math.abs(x - y) < 1e-9;
    return Math.abs(x - y) <= 0.5 * 10 ** -d + 1e-9;
  }

  // Verbetert de leerkracht dit vakje zelf? Een rekenrooster met sleutel verbetert de computer. Kladruimte telt nooit.
  const handVeld = f => f.soort === 'open' || f.soort === 'teken' || (f.soort === 'rooster' && !roosterAuto(f));
  const autoVeld = f => AUTO_VELD.has(f.soort) || roosterAuto(f);

  function cleanBlad(q, out, naam) {
    if (!out.beeld) throw new Error(`${naam}: de pagina ontbreekt.`);
    delete out.beeldNodig;
    delete out.beeldPagina;
    const v = Number(q.verhouding);
    out.verhouding = v > 0.05 && v < 20 ? Math.round(v * 10000) / 10000 : 1.414;
    out.velden = list(q.velden, MAX_VELDEN).filter(f => f && typeof f === 'object').map(f => {
      const soort = SOORTEN.includes(f.soort) ? f.soort : 'tekst';
      const veld = { x: pct(f.x, 99), y: pct(f.y, 99), w: Math.max(0.5, pct(f.w)), h: Math.max(0.5, pct(f.h)), soort };
      if (soort === 'kruis') {
        veld.antwoord = f.antwoord === true || /^(true|ja|x|✗|✔|juist)$/i.test(String(f.antwoord || ''));
        veld.groep = Math.max(1, Math.min(99, Math.round(Number(f.groep)) || 1));
        veld.punten = punt(f.punten, veld.antwoord ? 1 : 0);
        if (f.rond) veld.rond = true;
        // Omkringen: de leerling omcirkelt iets dat op het blad staat (een getal, een woord); verder als een hokje.
        if (f.omkring) veld.omkring = true;
        const label = text(f.label, 3);
        if (label) veld.label = label;
      } else if (soort === 'kies') {
        veld.opties = [...new Set(list(f.opties, 8).map(o => text(o, 80)).filter(Boolean))];
        const antwoord = text(f.antwoord, 80);
        if (antwoord) veld.antwoord = antwoord;
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'vlak') {
        veld.kleur = KLEUREN.includes(f.kleur) ? f.kleur : KLEUREN[0];
        veld.punten = 0;
      } else if (soort === 'notitie') {
        const tekst = text(f.tekst, 500);
        if (tekst) veld.tekst = tekst;
        veld.punten = 0;
      } else if (soort === 'luister') {
        const audio = audioOf(f.audio);
        if (audio) veld.audio = audio;
        const tekst = text(f.tekst, 1000);
        if (tekst) veld.tekst = tekst;
        const keer = Number(f.luisterMax);
        if ((audio || tekst) && (keer === 1 || keer === 2)) veld.luisterMax = keer;
        veld.punten = 0;
      } else if (soort === 'plek') {
        const d = f.doel && typeof f.doel === 'object' ? f.doel : null;
        if (d) veld.doel = { x: pct(d.x), y: pct(d.y), r: Math.max(2, Math.min(100, pct(d.r) || 12)) };
        // Meer juiste plekken (een tik in één ervan is juist), en een label dat de leerling op de plek zet.
        const extra = list(f.doelen, 8).filter(z => z && typeof z === 'object').map(z => ({ x: pct(z.x), y: pct(z.y), r: Math.max(2, Math.min(100, pct(z.r) || 12)) }));
        if (d && extra.length) veld.doelen = extra;
        const label = text(f.label, 30);
        if (label) veld.label = label;
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'lijn') {
        const n = f.naar && typeof f.naar === 'object' ? f.naar : null;
        if (n) veld.naar = { x: pct(n.x), y: pct(n.y) };
        veld.r = Math.max(0.5, Math.min(20, pct(f.r) || 3));
        // Een lijnstuk van een bepaalde lengte (cm, elke richting): dan telt de lengte, niet het eindpunt.
        const lengte = getal(f.lengte);
        if (lengte !== null && lengte > 0 && lengte <= 100) {
          veld.lengte = Math.round(lengte * 100) / 100;
          const m = getal(f.lengteMarge);
          veld.lengteMarge = m !== null && m >= 0 ? Math.min(5, Math.round(m * 100) / 100) : 0.2;
        }
        // Een rechte met een voorwaarde (evenwijdig met r, loodrecht op j, ...): dan telt de richting tegenover een rechte op het blad (ref: twee punten).
        const ref = f.ref && typeof f.ref === 'object' && f.ref.a && f.ref.b ? { a: { x: pct(f.ref.a.x), y: pct(f.ref.a.y) }, b: { x: pct(f.ref.b.x), y: pct(f.ref.b.y) } } : null;
        if (RICHTING.includes(f.richting) && ref && Math.hypot(ref.a.x - ref.b.x, ref.a.y - ref.b.y) > 0.5) {
          veld.richting = f.richting;
          veld.ref = ref;
          const hm = getal(f.hoekMarge);
          veld.hoekMarge = hm !== null && hm > 0 ? Math.min(15, Math.round(hm * 10) / 10) : 3;
        }
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'teken' || soort === 'rooster') {
        if (soort === 'rooster') {
          veld.kol = roosterMaat(f.kol, ROOSTER.kol, ROOSTER.maxKol);
          veld.rij = roosterMaat(f.rij, ROOSTER.rij, ROOSTER.maxRij);
          // De sleutel (een keuze): de computer verbetert de uitkomst, per rij of alles.
          if (NAKIJK.includes(f.nakijk)) {
            veld.nakijk = f.nakijk;
            const sleutel = roosterTekst(f.sleutel, veld.kol, veld.rij);
            if (sleutel) veld.sleutel = sleutel;
            const uitkomst = text(f.uitkomst, 60);
            if (uitkomst) veld.uitkomst = uitkomst;
            const rij = Math.round(Number(f.uitkomstRij));
            if (rij >= 1 && rij <= veld.rij) veld.uitkomstRij = rij;
            if (f.nakijk === 'deling') {
              const qu = text(f.quotient, 30);
              if (qu) veld.quotient = qu;
              const re = text(f.rest, 30);
              if (re) veld.rest = re;
            }
          }
        }
        const antwoord = text(f.antwoord, 1000);
        if (antwoord) veld.antwoord = antwoord;
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'klad') {
        // Kladruimte: typen of tekenen, het telt niet mee.
        veld.vorm = f.vorm === 'tekenen' ? 'tekenen' : 'typen';
        veld.punten = 0;
      } else if (soort === 'puntlijn') {
        veld.pt = list(f.pt, 26).filter(p => p && typeof p === 'object').map(p => ({ x: pct(p.x), y: pct(p.y) }));
        const n = veld.pt.length;
        const ok = i => Number.isInteger(i) && i >= 0 && i < n;
        const lijnen = [];
        for (const l of list(f.lijnen, 40)) {
          const [a, b] = Array.isArray(l) ? l.map(Number) : [];
          if (ok(a) && ok(b) && a !== b && !lijnen.some(([c, d]) => (c === a && d === b) || (c === b && d === a))) lijnen.push([Math.min(a, b), Math.max(a, b)]);
        }
        const door = f.doorPunt === undefined || f.doorPunt === null || f.doorPunt === '' ? NaN : Number(f.doorPunt);
        if (ok(door)) {
          veld.doorPunt = door;
          veld.aantal = Math.min(12, Math.max(1, Math.round(Number(f.aantal)) || 1));
        } else if (lijnen.length) veld.lijnen = lijnen;
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'kleur') {
        // Ook één rij of één kolom (een strook van 10 hokjes).
        const maat = (v, st) => Math.min(20, Math.max(1, Math.round(Number(v)) || st));
        veld.kol = maat(f.kol, 10);
        veld.rij = maat(f.rij, 1);
        const kl = list(f.kleuren, 3).filter(c => c && typeof c === 'object' && STIFTEN[c.kleur]);
        veld.kleuren = (kl.length ? kl : [{ kleur: 'rood' }]).map(c => { const a = text(c.aantal, 20); return a ? { kleur: c.kleur, aantal: a } : { kleur: c.kleur }; });
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'veelhoek') {
        veld.kol = roosterMaat(f.kol, 6, 16);
        veld.rij = roosterMaat(f.rij, 5, 16);
        // Vrije punten: de leerling tikt waar hij wil (geen stippen), bv. een gelijkzijdige driehoek. Intern een fijn rooster van 201 x 201.
        if (f.vrijePunten === true) {
          veld.vrijePunten = true;
          veld.kol = 201;
          veld.rij = 201;
          const z = getal(f.zijde);
          if (z !== null && z > 0 && z <= 50) veld.zijde = Math.round(z * 100) / 100;
          const zm = getal(f.zijdeMarge);
          if (zm !== null && zm >= 0) veld.zijdeMarge = Math.min(3, Math.round(zm * 100) / 100);
        }
        if (FIGUREN.includes(f.figuur)) veld.figuur = f.figuur;
        if (f.strikt) veld.strikt = true;
        // Of: precies deze figuur op deze plek (bv. het spiegelbeeld of de gedraaide figuur), als hoekpunten "kol,rij;kol,rij;...".
        const vorm = hoekpunten(f.vorm, veld);
        if (vorm.length >= 2) veld.vorm = vorm.map(p => p.join(',')).join(';');
        // Eerst de diagonalen: de leerling tikt 2 lijnstukken (4 punten); de vierhoek verbindt hun uiteinden.
        if (f.diagonalen === true) veld.diagonalen = true;
        // Een korte uitleg in het vak, tot de leerling het eerste punt tikt.
        const uitleg = text(f.uitleg, 80);
        if (uitleg) veld.uitleg = uitleg;
        veld.punten = punt(f.punten, 1);
      } else if (soort === 'cirkel') {
        veld.cirkels = list(f.cirkels, 8).filter(c => c && typeof c === 'object' && Number(c.r) > 0).map(c => ({ x: pct(c.x), y: pct(c.y), r: Math.round(Math.min(50, Number(c.r)) * 100) / 100 }));
        const m = Number(String(f.marge ?? '').replace(',', '.'));
        veld.marge = Number.isFinite(m) && m >= 0 && f.marge !== '' && f.marge !== undefined && f.marge !== null ? Math.min(5, Math.round(m * 100) / 100) : 0.1;
        veld.punten = punt(f.punten, 1);
      } else {
        const antwoord = text(f.antwoord, soort === 'open' ? 1000 : 300);
        if (antwoord) veld.antwoord = antwoord;
        const eenheid = soort === 'tekst' || soort === 'breuk' ? text(f.eenheid, 20) : '';
        if (eenheid) veld.eenheid = eenheid;
        if (soort === 'tekst') for (const k of ['hoofdletters', 'leestekens', 'spaties']) if (f[k]) veld[k] = true;
        if ((soort === 'tekst' || soort === 'breuk') && f.vereenvoudigd) veld.vereenvoudigd = true;
        if (soort === 'breuk' && f.geheel) veld.geheel = true;
        if (soort === 'tekst') margeVan(f, veld);
        if (soort === 'tekst') { const fo = text(f.formule, 120); if (fo) veld.formule = fo; }
        // De eenheid ook op het scherm naast het vakje tonen (m², euro, km).
        if (eenheid && f.toonEenheid) veld.toonEenheid = true;
        // Breuk: alleen precies deze schrijfwijze (25/100 is dan geen 1/4).
        if (soort === 'breuk' && f.precies) veld.precies = true;
        // Tijd: 4 u 30 min = 270 min = 4,5 u = 4:30.
        if (soort === 'tekst' && f.tijd) veld.tijd = true;
        // Mag leeg blijven of doorstreept worden (x, /, -).
        if (soort === 'tekst' && f.doorstreep) veld.doorstreep = true;
        veld.punten = punt(f.punten, 1);
      }
      // Volgorde vrij: de antwoorden van een groepje mogen in elk vakje van dat groepje staan.
      const vrij = Math.round(Number(f.vrij));
      if (VRIJ_SOORT.has(soort) && vrij >= 1 && vrij <= 9) veld.vrij = vrij;
      // Samen op punten: alleen bij vakjes die de computer verbetert (hokjes hebben hun eigen groep).
      const samen = Math.round(Number(f.samen));
      if (AUTO_VELD.has(soort) && samen >= 1 && samen <= 99) veld.samen = samen;
      return veld;
    });
    // Een groepje van één vakje is geen groepje.
    const tel = {};
    for (const f of out.velden) if (f.samen) tel[f.samen] = (tel[f.samen] || 0) + 1;
    for (const f of out.velden) if (f.samen && tel[f.samen] < 2) delete f.samen;
    const vt = {};
    for (const f of out.velden) if (f.vrij) vt[f.vrij] = (vt[f.vrij] || 0) + 1;
    for (const f of out.velden) if (f.vrij && vt[f.vrij] < 2) delete f.vrij;
    out.punten = out.velden.filter(f => !handVeld(f)).reduce((s, f) => s + f.punten, 0);
    const schaal = Number(String(q.schaal ?? '').replace(',', '.'));
    if (schaal >= 3 && schaal <= 300 && Math.abs(schaal - SCHAAL) > 1e-9) out.schaal = Math.round(schaal * 100) / 100;
    const woorden = [...new Set(list(q.woorden, 30).map(w => text(w, 60)).filter(Boolean))];
    if (woorden.length && out.velden.some(f => f.soort === 'sleep')) out.woorden = woorden;
    return out;
  }

  function cleanLijst(raw, prefix) {
    const vragen = list(raw, MAX_VRAGEN);
    let n = 0;
    return vragen.map(q => {
      n++;
      try {
        return cleanVraag(q, `Vraag ${n}`, false);
      } catch (err) {
        throw new Error(prefix + err.message);
      }
    });
  }

  const NIVEAU_NAAM = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };

  // Controleren en opschonen. Fout in de vorm: een duidelijke foutmelding.
  // Wat nog ontbreekt om af te nemen (een afbeelding, de plek bij aanduiden) staat in problemen().
  function validate(t) {
    if (!t || typeof t !== 'object') throw new Error('Dit is geen toets.');
    const title = text(t.title || t.titel, 100);
    if (!title) throw new Error('De toets heeft geen titel.');
    const n = t.niveaus && typeof t.niveaus === 'object' ? t.niveaus : {};
    const take = (key, alt) => {
      const v = n[key] !== undefined ? n[key] : t[alt || key];
      return v && !Array.isArray(v) && Array.isArray(v.vragen) ? v.vragen : v;
    };
    const multi = ['page', 'ridder'].some(k => list(take(k)).length);
    const vragen = cleanLijst(take('schildknaap', 'vragen'), multi ? 'Schildknaap: ' : '');
    if (!vragen.length) throw new Error(multi ? 'Het Schildknaap-niveau heeft geen vragen.' : 'De toets heeft nog geen vragen.');
    const out = { title, vragen };
    const intro = text(t.intro, 1000);
    if (intro) out.intro = intro;
    // Alles automatisch verbeteren: de editor toont wat de leerkracht nog zelf verbetert.
    if (t.auto === true) out.auto = true;
    for (const k of ['page', 'ridder']) {
      const extra = cleanLijst(take(k), `${NIVEAU_NAAM[k]}: `);
      if (extra.length) out[k] = extra;
    }
    return out;
  }

  // Alle vragen met een eigen antwoord (een bron telt niet, zijn deelvragen wel), met hun vaste id: "3" of "3.1".
  function vragenVan(lijst) {
    const out = [];
    lijst.forEach((q, i) => {
      if (q.type === 'bron') q.vragen.forEach((d, j) => out.push({ id: `${i}.${j}`, q: d, bron: q, nr: `${i + 1}${'abcdefghijklmno'[j]}` }));
      else out.push({ id: String(i), q, nr: String(i + 1) });
    });
    return out;
  }

  const niveausVan = t => NIVEAUS.filter(n => n === 'schildknaap' || (Array.isArray(t[n]) && t[n].length));
  const lijstVoor = (t, niveau) => (niveau !== 'schildknaap' && Array.isArray(t[niveau]) && t[niveau].length ? t[niveau] : t.vragen);

  // Wat de leerkracht nog moet doen voor de toets klaar is om af te nemen.
  function problemen(t) {
    const out = [];
    for (const n of niveausVan(t)) {
      const tag = niveausVan(t).length > 1 ? `${NIVEAU_NAAM[n]}, ` : '';
      lijstVoor(t, n).forEach((q, i) => {
        const items = q.type === 'bron' ? [{ q, nr: `${i + 1}` }, ...q.vragen.map((d, j) => ({ q: d, nr: `${i + 1}${'abcdefghijklmno'[j]}` }))] : [{ q, nr: `${i + 1}` }];
        for (const { q: v, nr } of items) {
          if (v.beeldNodig || v.beeldPagina) out.push(`${tag}vraag ${nr} wacht op een afbeelding${v.beeldPagina ? ` (pagina ${v.beeldPagina})` : ''}${v.beeldNodig ? `: ${v.beeldNodig}` : ''}`);
          if (v.type === 'aanduiden' && !v.beeld) out.push(`${tag}vraag ${nr}: kies de afbeelding waarop de leerling aanduidt`);
          else if (v.type === 'aanduiden' && !v.zones.length) out.push(`${tag}vraag ${nr}: klik op de afbeelding waar het juiste antwoord ligt`);
          else if (v.type === 'aanduiden' && metNamen(v) && v.zones.some(z => !z.naam)) out.push(`${tag}vraag ${nr}: geef elke plek een naam`);
          if (v.type === 'markeren' && v.inBron && !markeerModel(v).doelen.length) out.push(`${tag}vraag ${nr}: duid in de brontekst aan wat juist is`);
          if (typeof v.beeld === 'string' && v.beeld.startsWith('#')) out.push(`${tag}vraag ${nr}: de afbeelding ontbreekt`);
          if (v.type === 'getallenas') {
            const min = getal(v.min); const stap = getal(v.stap); const a = getal(v.antwoord);
            const k = (a - min) / stap;
            if (a < min - 1e-9 || a > getal(v.max) + 1e-9) out.push(`${tag}vraag ${nr}: het juiste getal ligt niet op de getallenas`);
            else if (Math.abs(k - Math.round(k)) > 1e-6) out.push(`${tag}vraag ${nr}: het juiste getal ligt niet op een streepje (kies een kleinere stap)`);
          }
          if (v.type === 'blad' && v.velden.some(f => f.soort === 'luister' && !f.audio && !f.tekst)) out.push(`${tag}blad ${nr}: een luisterknop heeft nog geen opname`);
          if (v.type === 'blad' && !v.velden.length) out.push(`${tag}blad ${nr}: zet invulvakjes op het blad`);
          if (v.type === 'blad') {
            const zonder = v.velden.map((f, k) => (zonderSleutel(f) ? k + 1 : 0)).filter(Boolean);
            v.velden.forEach((f, k) => { if (f.formule && formuleFout(f.formule, v.velden.length, k)) out.push(`${tag}blad ${nr}: de rekenregel van vakje ${k + 1} klopt niet (${formuleFout(f.formule, v.velden.length, k)})`); });
            if (zonder.length) out.push(`${tag}blad ${nr}: vakje ${zonder.slice(0, 6).join(', ')}${zonder.length > 6 ? ', …' : ''} ${zonder.length > 1 ? 'hebben' : 'heeft'} nog geen antwoord`);
          }
        }
      });
    }
    return out;
  }

  // Een vakje dat de computer verbetert, maar nog geen juist antwoord heeft.
  const zonderSleutel = f => ((f.soort === 'tekst' || f.soort === 'breuk' || f.soort === 'sleep') && !alts(f.antwoord).length && !f.doorstreep)
    || (f.soort === 'kies' && (f.opties.length < 2 || !f.opties.includes(f.antwoord))) || (f.soort === 'lijn' && !f.naar && !f.lengte && !f.richting)
    || (f.soort === 'rooster' && NAKIJK.includes(f.nakijk) && !roosterAuto(f))
    || (f.soort === 'puntlijn' && ((f.pt || []).length < 2 || (f.doorPunt === undefined && !(f.lijnen || []).length)))
    || (f.soort === 'cirkel' && !(f.cirkels || []).length)
    || (f.soort === 'veelhoek' && !f.figuur && !f.vorm)
    || (f.soort === 'kleur' && !(f.kleuren || []).some(c => kleurDoel(f, c) !== null));

  // Alles automatisch verbeteren: wat verbetert de leerkracht nog zelf? Een lijst om aan te passen.
  function handWerk(t) {
    const out = [];
    for (const n of niveausVan(t)) {
      const tag = niveausVan(t).length > 1 ? `${NIVEAU_NAAM[n]}, ` : '';
      for (const { q, nr } of vragenVan(lijstVoor(t, n))) {
        if (MANUEEL.has(q.type) && q.punten > 0) out.push({ niveau: n, nr, tekst: `${tag}vraag ${nr}: ${NAMES[q.type].toLowerCase()}` });
        else if (q.type === 'rekenen' && q.werkPunten > 0) out.push({ niveau: n, nr, tekst: `${tag}vraag ${nr}: de bewerking (${q.werkPunten === 1 ? '1 punt' : `${String(q.werkPunten).replace('.', ',')} punten`})` });
        else if (q.type === 'blad') {
          q.velden.forEach((f, k) => {
            if (!handVeld(f) || !(f.punten > 0)) return;
            const soort = f.soort === 'open' ? 'open antwoord' : f.soort === 'teken' ? 'tekenvak' : 'rekenrooster zonder sleutel';
            out.push({ niveau: n, nr, vak: k, tekst: `${tag}blad ${nr}, vakje ${k + 1}: ${soort}` });
          });
        }
      }
    }
    return out;
  }

  // Geen fout, wel een tip: een vraag die over een figuur gaat maar er geen heeft.
  const FIGUUR = /\b(figuur|figuren|tekening|afbeelding|prent|grafiek|kaart|foto|schets|rooster|diagram|hieronder|hiernaast)\b/i;
  function waarschuwingen(t) {
    const out = [];
    for (const n of niveausVan(t)) {
      const tag = niveausVan(t).length > 1 ? `${NIVEAU_NAAM[n]}, ` : '';
      lijstVoor(t, n).forEach((q, i) => {
        const items = q.type === 'bron' ? q.vragen.map((d, j) => ({ q: d, nr: `${i + 1}${'abcdefghijklmno'[j]}` })) : [{ q, nr: `${i + 1}` }];
        if (q.type === 'bron' && !q.beeld && FIGUUR.test(`${q.titel} ${q.tekst}`)) out.push(`${tag}vraag ${i + 1} spreekt over een figuur, maar de bron heeft geen afbeelding`);
        for (const { q: v, nr } of items) {
          if (v.type === 'blad' || v.beeld || v.beeldNodig || v.beeldPagina || q.beeld) continue;
          if (FIGUUR.test(`${v.vraag || ''} ${v.tekst || ''}`)) out.push(`${tag}vraag ${nr} spreekt over een figuur, maar heeft geen afbeelding`);
        }
      });
    }
    return out;
  }

  // Punten: wat de computer verbetert en wat de leerkracht verbetert.
  const openVelden = q => q.velden.filter(handVeld).reduce((s, f) => s + f.punten, 0);
  const handPunten = q => (MANUEEL.has(q.type) ? q.punten : q.type === 'rekenen' ? q.werkPunten : q.type === 'blad' ? openVelden(q) : 0);
  const autoPunten = q => (MANUEEL.has(q.type) ? 0 : q.punten);
  const maxVan = q => autoPunten(q) + handPunten(q);
  const totaal = lijst => vragenVan(lijst).reduce((s, v) => s + maxVan(v.q), 0);

  // ---------- Wat de leerling ziet ----------
  // perms[id]: de volgorde waarin de leerling keuzes, rechterkanten of items ziet (per leerling door elkaar).
  // De leerling antwoordt met de plaats op zijn scherm; de server zet dat terug met dezelfde perm.
  // img(dataAdres) geeft het adres waarlangs de leerling de afbeelding laadt (in de browser van de leerkracht: zichzelf).
  function partsOf(tekst) {
    const parts = [];
    let last = 0;
    let g = 0;
    for (const m of String(tekst).matchAll(GAP)) {
      parts.push(tekst.slice(last, m.index));
      if (m[2] !== undefined) parts.push({ gap: g++, opties: [...new Set(alts(m[2]))].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true })) });
      else parts.push({ gap: g++, size: Math.min(28, Math.max(4, Math.max(...alts(m[1]).map(s => s.length)) + 2)) });
      last = m.index + m[0].length;
    }
    parts.push(tekst.slice(last));
    return parts;
  }

  function viewOf(q, id, perms = {}, img = s => s) {
    const v = { id, type: q.type, punten: maxVan(q) };
    if (q.vraag) v.vraag = q.vraag;
    if (q.beeld && !q.beeld.startsWith('#')) v.beeld = img(q.beeld);
    if (q.audio) v.audio = img(q.audio);
    if ((q.audio || q.voorlees) && q.luisterMax) v.luisterMax = q.luisterMax;
    if (q.voorlees) v.voorlees = q.voorlees;
    const p = perms[id];
    if (q.type === 'meerkeuze') {
      const order = p || q.opties.map((_, i) => i);
      v.opties = order.map(i => (typeof q.opties[i] === 'string' ? { tekst: q.opties[i] } : { tekst: q.opties[i].tekst, beeld: q.opties[i].beeld && !q.opties[i].beeld.startsWith('#') ? img(q.opties[i].beeld) : undefined }));
      v.meer = Array.isArray(q.juist);
      if (q.aantal) v.aantal = q.aantal;
    } else if (q.type === 'juistfout' && q.stellingen) {
      v.stellingen = q.stellingen.map(x => x.tekst);
      if (q.labels) v.labels = q.labels;
    } else if (q.type === 'invullen') {
      v.parts = partsOf(q.tekst);
      if (q.gelijk) {
        const breed = Math.max(...v.parts.filter(x => x && x.size).map(x => x.size), 4);
        for (const x of v.parts) if (x && x.size) x.size = breed;
      }
      // Een woordenbank: de leerling sleept de woorden in de gaten in plaats van te typen.
      if (q.bank) v.bank = [...new Set([...[...String(q.tekst).matchAll(GAP)].filter(m => m[1] !== undefined).map(m => alts(m[1])[0]), ...(q.extra || [])])].sort((x, y) => x.localeCompare(y, 'nl', { numeric: true }));
    }
    else if (q.type === 'kort' || q.type === 'rekenen') {
      if (q.eenheid) v.eenheid = q.eenheid;
      if (q.type === 'rekenen') v.werk = true;
      if (q.type === 'rekenen' && q.rooster) { v.kol = q.kol; v.rij = q.rij; }
      if (q.breuk) v.breuk = true;
    } else if (q.type === 'verbinden') {
      v.links = q.paren.map(x => x[0]);
      v.rechts = (p || q.paren.map((_, i) => i)).map(i => q.paren[i][1]);
    } else if (q.type === 'ordenen') {
      v.items = (p || q.items.map((_, i) => i)).map(i => (typeof q.items[i] === 'string' ? q.items[i] : { tekst: q.items[i].tekst, beeld: q.items[i].beeld && !q.items[i].beeld.startsWith('#') ? img(q.items[i].beeld) : undefined }));
    } else if (q.type === 'dictee') {
      // De tekst gaat mee om voor te lezen (niet zichtbaar op het scherm).
      v.vorm = q.vorm;
      if (q.hoofdletters === false) v.hoofdletters = false;
      if (q.leestekens) v.leestekens = true;
      v.delen = q.delen.map(d => ({ zeg: d.zin ? `${d.tekst}. ${/[.!?…]$/.test(d.zin) ? d.zin : `${d.zin}.`} ${d.tekst}.` : d.tekst }));
    } else if (q.type === 'sorteren') {
      v.kolommen = q.kolommen.map(k => k.naam);
      v.woorden = sorteerWoorden(q);
      // Op papier: zoveel lege rijen als de langste kolom.
      v.rijen = Math.max(...q.kolommen.map(k => k.woorden.length));
    }
    else if (q.type === 'tabel') {
      let g = 0;
      v.rijen = q.rijen.map((r, ri) => r.map(c => {
        const m = ri > 0 && celGat(c);
        if (m && m.opties) return { gap: g++, opties: m.opties };
        return m ? { gap: g++, size: Math.min(14, Math.max(3, Math.max(...alts(m.goed).map(s => s.length)) + 1)) } : c;
      }));
    } else if (q.type === 'aanduiden' || q.type === 'tekenen') {
      v.verhouding = q.verhouding;
      // Met namen: de namen alfabetisch (de volgorde verraadt de plekken niet); n = het nummer van de zone.
      if (q.type === 'aanduiden' && metNamen(q)) v.namen = q.zones.map((z, n) => ({ n, t: z.naam || '?' })).sort((a, b) => a.t.localeCompare(b.t, 'nl', { numeric: true }));
    }
    else if (q.type === 'getallenas') {
      Object.assign(v, { min: getal(q.min), max: getal(q.max), stap: getal(q.stap), getallen: q.getallen });
      if (q.breuk) v.breuk = true;
    } else if (q.type === 'markeren') {
      // In de bron: de tekst staat links (bij de bron), hier alleen hoe de leerling aanduidt.
      if (!q.inBron) v.stukken = markeerModel(q).stukken;
      if (q.per) v.per = q.per;
      if (q.inBron) v.inBron = true;
      if (q.kleuren) v.kleuren = q.kleuren.map(c => ({ kleur: c.kleur, hex: STIFTEN[c.kleur], rand: STIFT_RAND[c.kleur], uitleg: c.uitleg }));
      if (q.aantal) v.aantal = q.aantal;
    }
    else if (q.type === 'spreken') v.seconden = q.seconden;
    else if (q.type === 'open') v.regels = q.regels;
    else if (q.type === 'blad') {
      v.verhouding = q.verhouding;
      v.schaal = q.schaal || SCHAAL;
      v.velden = q.velden.map(f => {
        const o = { x: f.x, y: f.y, w: f.w, h: f.h, soort: f.soort };
        if (f.soort === 'kies') o.opties = f.opties;
        if (f.soort === 'kruis') { o.groep = f.groep; if (f.rond) o.rond = true; if (f.omkring) o.omkring = true; if (f.label) o.label = f.label; }
        if (f.soort === 'rooster') { o.kol = f.kol; o.rij = f.rij; }
        if (f.soort === 'klad') o.vorm = f.vorm;
        if (f.soort === 'puntlijn') o.pt = f.pt || [];
        if (f.soort === 'kleur') { o.kol = f.kol; o.rij = f.rij; o.kleuren = f.kleuren.map(c => ({ kleur: c.kleur, hex: STIFTEN[c.kleur], rand: STIFT_RAND[c.kleur] })); }
        if (f.soort === 'veelhoek') { o.kol = f.kol; o.rij = f.rij; if (f.vrijePunten) o.vrijePunten = true; if (f.diagonalen) o.diagonalen = true; if (f.uitleg) o.uitleg = f.uitleg; }
        if (f.soort === 'breuk' && f.geheel) o.geheel = true;
        if (f.toonEenheid && f.eenheid) o.eenheid = f.eenheid;
        if (f.vrij) o.vrij = f.vrij;
        if (f.soort === 'luister') { if (f.audio) o.audio = img(f.audio); if (f.tekst) o.tekst = f.tekst; if (f.luisterMax) o.luisterMax = f.luisterMax; }
        if (f.soort === 'vlak') o.kleur = f.kleur;
        if (f.soort === 'plek' && f.label) o.label = f.label;
        if (f.soort === 'notitie') o.tekst = f.tekst || '';
        return o;
      });
      const bank = [...q.velden.filter(f => f.soort === 'sleep').map(f => alts(f.antwoord)[0]).filter(Boolean), ...(q.woorden || [])];
      if (bank.length) v.bank = [...new Set(bank)].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
    }
    return v;
  }

  // Eén pagina per vraag; een bron met zijn deelvragen is één pagina. order: de volgorde van de pagina's.
  function studentView(t, lijst, { order, perms, img = s => s } = {}) {
    const pages = (order || lijst.map((_, i) => i)).map(i => {
      const q = lijst[i];
      if (q.type !== 'bron') return viewOf(q, String(i), perms, img);
      const b = { id: String(i), type: 'bron', titel: q.titel, tekst: q.tekst, vragen: q.vragen.map((d, j) => viewOf(d, `${i}.${j}`, perms, img)) };
      // Een deelvraag duidt aan in de brontekst: de tekst in woorden en zinnen, zodat de leerling ze kan aantikken.
      if (q.vragen.some(d => d.type === 'markeren' && d.inBron)) b.stukken = stukkenVan(q.tekst, tekstWoorden(q.tekst));
      if (q.beeld && !q.beeld.startsWith('#')) b.beeld = img(q.beeld);
      // Een luisterfragment bij de bron (🎧), eventueel met een maximum aantal keer.
      if (q.audio) b.audio = img(q.audio);
      if (q.audio && q.luisterMax) b.luisterMax = q.luisterMax;
      return b;
    });
    return { title: t.title, intro: t.intro || '', pages, totaal: totaal(lijst) };
  }

  // ---------- Verbeteren ----------

  // Getallen zoals een leerling ze typt: 12,5 · 12.5 · 1 000 · 1.000 · ½ · 3/4 · 1 1/2 · € 3,50 · -4.
  const BREUK = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅛': '1/8' };
  function getal(s, eenheid) {
    let t = String(s ?? '').trim().toLowerCase().replace(/[−–]/g, '-');
    if (eenheid) t = t.split(eenheid.toLowerCase()).join(' ');
    // Een eenheid met een gewone 2 of 3 erachter: 6,8 cm2 en 1800 m2.
    t = t.replace(/(?<![a-z])(mm|cm|dm|km|hm|dam|m)[23](?![\d,.])/g, '$1 ');
    t = t.replace(/([a-z])[²³]/g, '$1 ').replace(/[€$%]|euro|(?<![a-z])(cm|mm|dm|km|hm|dam|m|ha|are|kg|hg|dag|g|mg|l|ml|cl|dl|hl|min|sec|s|u|uur)\b/g, ' ').replace(/[½¼¾⅓⅔⅕⅛]/g, c => ` ${BREUK[c]}`).trim();
    let m = /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (m && Number(m[4])) return (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4]));
    m = /^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(t);
    if (m && Number(m[2].replace(',', '.'))) return Number(m[1].replace(',', '.')) / Number(m[2].replace(',', '.'));
    t = t.replace(/\s+/g, '');
    // 1.000 is duizend, maar na een 0 is de punt een komma: 0.194.
    if (/^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(',', '.');
    return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : null;
  }

  // Zo eenvoudig mogelijk? "3/4" en "1 1/2" wel, "6/8" en "4/2" niet. Een geheel getal of kommagetal telt als eenvoudig.
  // Met de sleutel erbij: een onechte breuk (7/4) is alleen goed als de sleutel zelf ook een onechte breuk is,
  // anders moet het een gemengd getal zijn (1 3/4).
  const BREUK_EIND = /(\d+)\s*\/\s*(\d+)\s*$/;
  function vereenvoudigd(s, sleutel) {
    const m = BREUK_EIND.exec(String(s || ''));
    if (!m) return true;
    const ggd = (a, b) => (b ? ggd(b, a % b) : a);
    const t = Number(m[1]);
    const n = Number(m[2]);
    if (!(n > 1 && ggd(t, n) === 1)) return false;
    if (t >= n && sleutel !== undefined && !alts(sleutel).some(a => { const k = BREUK_EIND.exec(a); return k && Number(k[1]) >= Number(k[2]); })) return false;
    return true;
  }

  // o: true (exact: alles telt mee) of { exact, hoofdletters, leestekens, spaties }.
  // Leestekens tussen cijfers (1,5 en 1.000) blijven altijd staan.
  const zacht = (s, o) => {
    const { exact, hoofdletters, leestekens, spaties } = typeof o === 'object' && o ? o : { exact: !!o };
    let t = String(s || '').trim().replace(/[’‘`]/g, "'").replace(/[“”„]/g, '"');
    if (!exact && !leestekens) t = t.replace(/[!?;:¿¡"«»()]|(?<!\d)[.,]|[.,](?!\d)/g, ' ');
    if (!exact && !hoofdletters) t = t.toLowerCase();
    return spaties && !exact ? t.replace(/\s+/g, '') : t.trim().replace(/\s+/g, ' ');
  };

  // Is dit getypte antwoord goed? Getallen tellen ook in een andere schrijfwijze (0,5 = 0.5 = ½ = 1/2).
  function zelfde(goed, gegeven, { exact, eenheid, hoofdletters, leestekens, spaties } = {}) {
    if (gegeven === undefined || gegeven === null || String(gegeven).trim() === '') return false;
    const o = { exact, hoofdletters, leestekens, spaties };
    return alts(goed).some(a => {
      if (zacht(a, o) === zacht(gegeven, o)) return true;
      if (!exact && eenheid && zacht(`${a} ${eenheid}`, o) === zacht(gegeven, o)) return true;
      const x = getal(a, eenheid);
      const y = getal(gegeven, eenheid);
      return x !== null && y !== null && Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(x));
    });
  }

  const half = x => Math.round(x * 2) / 2;
  const leeg = a => a === undefined || a === null || a === '' || (Array.isArray(a) && !a.some(x => x !== null && x !== undefined && x !== ''));

  // Het antwoord van de leerling in de vorm van de toets zelf (de keuzes in hun eigen volgorde, niet die van zijn scherm).
  function canoniek(q, a, perm) {
    if (leeg(a)) return a === 0 ? 0 : null;
    const map = i => (perm && perm[Number(i)] !== undefined ? perm[Number(i)] : Number(i));
    if (q.type === 'meerkeuze') return Array.isArray(a) ? [...new Set(a.map(map))].filter(Number.isInteger).sort((x, y) => x - y) : map(a);
    if (q.type === 'verbinden') return list(a, q.paren.length).map(x => (x === null || x === '' || x === undefined ? null : map(x)));
    if (q.type === 'ordenen') return list(a, q.items.length).map(map);
    return a;
  }

  // Een aangetikte plek ("x,y" in procent van het vak) binnen de juiste cirkel? Rekent in echte verhoudingen.
  function plekGoed(f, a, verhouding = 1.414) {
    const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(String(a || ''));
    if (!m || !f.doel) return false;
    return [f.doel, ...(f.doelen || [])].some(d => {
      const dx = ((Number(m[1]) - d.x) / 100) * f.w;
      const dy = ((Number(m[2]) - d.y) / 100) * f.h * verhouding;
      return Math.hypot(dx, dy) <= (d.r / 100) * f.w;
    });
  }
  // Kleurveld: hoeveel hokjes moeten deze kleur hebben? "60%" en "3/5" zijn een deel van alle hokjes, "12" is een aantal.
  function kleurDoel(f, c) {
    const a = String((c && c.aantal) || '').trim();
    if (!a) return null;
    const n = f.kol * f.rij;
    const pr = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(a);
    if (pr) return Math.round((Number(pr[1].replace(',', '.')) / 100) * n);
    const x = getal(a);
    if (x === null || x < 0) return null;
    return a.includes('/') ? Math.round(x * n) : Math.round(x);
  }
  // Telt per kleur het juiste aantal hokjes? (Welke hokjes maakt niet uit.) Een kleur zonder aantal telt niet mee.
  function kleurGoed(f, a) {
    const s = String(a || '');
    const doelen = (f.kleuren || []).map(c => kleurDoel(f, c));
    if (!doelen.some(d => d !== null)) return false;
    return doelen.every((d, i) => d === null || [...s].filter(c => c === String(i + 1)).length === d);
  }
  // De lengte van een getrokken lijn in cm: van het midden van het bolletje tot het eindpunt.
  function lijnCm(f, a, verhouding = 1.414, schaal = SCHAAL) {
    const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(String(a || ''));
    if (!m) return null;
    return (Math.hypot(Number(m[1]) - (f.x + f.w / 2), (Number(m[2]) - (f.y + f.h / 2)) * verhouding) / 100) * schaal;
  }

  // Verbinden: het eindpunt van de lijn ("x,y" in procent van het blad) dicht genoeg bij de juiste plek?
  // De hoek (0 tot 90 graden) tussen de getrokken lijn en de rechte ref, in echte verhoudingen; null zonder lijn.
  function lijnHoek(f, a, verhouding = 1.414) {
    const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(String(a || ''));
    if (!m || !f.ref) return null;
    const u = [Number(m[1]) - (f.x + f.w / 2), (Number(m[2]) - (f.y + f.h / 2)) * verhouding];
    const v = [f.ref.b.x - f.ref.a.x, (f.ref.b.y - f.ref.a.y) * verhouding];
    const lu = Math.hypot(...u);
    const lv = Math.hypot(...v);
    if (lu < 0.5 || lv < 1e-9) return null;
    return (Math.acos(Math.min(1, Math.abs(u[0] * v[0] + u[1] * v[1]) / (lu * lv))) * 180) / Math.PI;
  }
  function lijnGoed(f, a, verhouding = 1.414, schaal = SCHAAL) {
    if (f.lengte || f.richting) {
      if (f.lengte) {
        const cm = lijnCm(f, a, verhouding, schaal);
        if (!(cm !== null && Math.abs(cm - f.lengte) <= (f.lengteMarge ?? 0.2) + 1e-9)) return false;
      }
      if (f.richting) {
        const h = lijnHoek(f, a, verhouding);
        if (h === null) return false;
        const mg = (f.hoekMarge ?? 3) + 1e-9;
        const ev = h <= mg;
        const lr = Math.abs(90 - h) <= mg;
        // "Niet loodrecht snijden": ook niet evenwijdig (dan snijdt ze niet).
        if (f.richting === 'evenwijdig' ? !ev : f.richting === 'loodrecht' ? !lr : f.richting === 'niet-loodrecht' ? ev || lr : ev) return false;
      }
      return true;
    }
    const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(String(a || ''));
    if (!m || !f.naar) return false;
    return Math.hypot(Number(m[1]) - f.naar.x, (Number(m[2]) - f.naar.y) * verhouding) <= (f.r || 3);
  }

  // Per vakje van een blad: hoeveel juist (1, 0, of een deel bij een rekenrooster per rij) of null (open vak, hokje).
  // ov: wat de leerkracht zelf aanduidde.
  function vakDeel(q, a, ov = {}) {
    const b = Array.isArray(a) ? a : [];
    return q.velden.map((f, k) => {
      if (!autoVeld(f)) return null;
      if (ov[k] === true || ov[k] === false) return ov[k] ? 1 : 0;
      if (f.soort === 'rooster') return roosterScore(f, b[k]);
      if (f.soort === 'kies') return b[k] === f.antwoord ? 1 : 0;
      if (f.soort === 'plek') return plekGoed(f, b[k], q.verhouding) ? 1 : 0;
      if (f.soort === 'lijn') return lijnGoed(f, b[k], q.verhouding, q.schaal || SCHAAL) ? 1 : 0;
      if (f.soort === 'puntlijn') return puntlijnGoed(f, b[k], q.verhouding) ? 1 : 0;
      if (f.soort === 'cirkel') return cirkelGoed(f, b[k], q.verhouding, q.schaal || SCHAAL) ? 1 : 0;
      if (f.soort === 'veelhoek') return veelhoekGoed(f, b[k], q.verhouding, q.schaal || SCHAAL) ? 1 : 0;
      if (f.soort === 'kleur') return kleurGoed(f, b[k]) ? 1 : 0;
      if (f.vrij) return vrijDeel(q, b, k);
      return vakWaarde(f, b[k], b, k);
    });
  }
  // Is w het juiste antwoord voor vakje f? (b en k alleen voor een gevolgfout.)
  function vakWaarde(f, w, b, k) {
    if (f.doorstreep && (String(w ?? '').trim() === '' || STREEP.test(String(w).trim()))) return 1;
    if (f.soort === 'sleep') return alts(f.antwoord).includes(String(w || '')) ? 1 : 0;
    if (f.soort === 'breuk' && f.precies) return alts(f.antwoord).some(a => breukNorm(a) === breukNorm(w)) && breukNorm(w) !== '' ? 1 : 0;
    if (f.vereenvoudigd && !vereenvoudigd(w, f.antwoord)) return 0;
    if (f.soort === 'tekst' && f.tijd) {
      const t = tijdGoed(f, w);
      if (t !== null) return t ? 1 : 0;
    }
    if (f.soort === 'tekst' && heeftMarge(f) && margeGoed(f, w)) return 1;
    if (f.soort === 'tekst' && f.formule && b && gevolgGoed(f, b, k)) return 1;
    return zelfde(f.antwoord, w, f) ? 1 : 0;
  }
  // Volgorde vrij: elk antwoord van het groepje telt bij één vakje waar het past (elk juist antwoord maar één keer).
  function vrijDeel(q, b, k) {
    const groep = q.velden.map((f, i) => i).filter(i => q.velden[i].vrij === q.velden[k].vrij);
    const bij = new Map(); // vakje van de sleutel -> vakje van de leerling
    const past = (i, j) => vakWaarde(q.velden[j], b[i], null, j) >= 1;
    const zoek = (i, gezien) => groep.some(j => {
      if (gezien.has(j) || !past(i, j)) return false;
      gezien.add(j);
      if (!bij.has(j) || zoek(bij.get(j), gezien)) { bij.set(j, i); return true; }
      return false;
    });
    for (const i of groep) zoek(i, new Set());
    return [...bij.values()].includes(k) ? 1 : 0;
  }
  // Een streep, kruis of liggend streepje: het vakje is doorstreept.
  const STREEP = /^[x×✗✘/\\\-–—_]+$/i;
  const breukNorm = s => String(s ?? '').trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');
  // Een tijdsduur in seconden: "4 u 30 min", "4u30", "270 min", "4,5 uur", "4:30". Zonder eenheid: de eenheid van het vakje.
  const TIJD = { u: 3600, uur: 3600, uren: 3600, h: 3600, min: 60, minuut: 60, minuten: 60, m: 60, s: 1, sec: 1, seconde: 1, seconden: 1 };
  function tijdSec(s, eenheid) {
    const t = String(s ?? '').trim().toLowerCase().replace(/,/g, '.').replace(/([a-z])\.(?!\d)/g, '$1').replace(/\ben\b/g, ' ').trim();
    if (!t) return null;
    const m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?\s*(u|uur|h)?$/.exec(t);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
    const re = /(\d+(?:\.\d+)?)\s*([a-z]*)/g;
    if (t.replace(re, '').trim()) return null;
    const delen = [...t.matchAll(re)];
    let tot = 0;
    let vorige = 0;
    for (const d of delen) {
      let maal = d[2] ? TIJD[d[2]] : vorige === 3600 ? 60 : vorige === 60 ? 1 : delen.length === 1 && eenheid ? TIJD[String(eenheid).toLowerCase().replace(/\.$/, '')] : undefined;
      if (!maal) return null;
      tot += Number(d[1]) * maal;
      vorige = maal;
    }
    return delen.length ? Math.round(tot) : null;
  }
  // Tijd: true/false, of null als het geen tijd is (dan gewoon vergelijken).
  function tijdGoed(f, w) {
    const y = tijdSec(w, f.eenheid);
    if (y === null) return null;
    const goed = alts(f.antwoord).map(a => tijdSec(a, f.eenheid)).filter(x => x !== null);
    return goed.length ? goed.includes(y) : null;
  }
  // Per vakje: goed (true), fout (false) of null. Een rekenrooster dat deels juist is, telt hier als fout.
  const vakGoed = (q, a, ov) => vakDeel(q, a, ov).map(d => (d === null ? null : d >= 1));

  // Punten die de computer geeft voor een antwoord (al canoniek gemaakt). null = de leerkracht verbetert (open, papier).
  // ov: bij een blad de vakjes die de leerkracht zelf goed of fout zette.
  function auto(q, a, ov) {
    if (MANUEEL.has(q.type)) return null;
    const p = q.punten;
    if (leeg(a) && a !== 0 && !(q.type === 'blad' && ov)) return 0;
    if (q.type === 'meerkeuze') {
      const juist = Array.isArray(q.juist) ? q.juist : [q.juist];
      const gekozen = [...new Set(Array.isArray(a) ? a : [a])];
      const nodig = q.aantal || juist.length;
      const goed = gekozen.filter(j => juist.includes(j)).length;
      const fout = gekozen.length - goed;
      if (q.puntenPer === 'juist') return half((p * Math.max(0, Math.min(goed, nodig) - fout)) / nodig);
      // Alles of niets: precies de juiste (of, met een aantal, zoveel juiste en geen foute).
      if (q.aantal) return goed === nodig && !fout ? p : 0;
      return juist.length === gekozen.length && juist.every(j => gekozen.includes(j)) ? p : 0;
    }
    if (q.type === 'juistfout' && q.stellingen) return Array.isArray(a) ? half((p * q.stellingen.filter((x, i) => (a[i] === 'J' || a[i] === 'F') && (a[i] === 'J') === x.juist).length) / q.stellingen.length) : 0;
    if (q.type === 'juistfout') return (a === 'J') === q.juist && (a === 'J' || a === 'F') ? p : 0;
    if (q.type === 'invullen') {
      const gaten = gapsOf(q.tekst);
      const goed = gaten.filter((g, k) => zelfde(g.join('|'), Array.isArray(a) ? a[k] : null, q)).length;
      return half((p * goed) / gaten.length);
    }
    if (q.type === 'kort' || q.type === 'rekenen') {
      const uit = q.type === 'rekenen' && a && typeof a === 'object' ? a.uitkomst : a;
      if (q.vereenvoudigd && !vereenvoudigd(uit, q.antwoord)) return 0;
      return zelfde(q.antwoord, uit, q) ? p : 0;
    }
    if (q.type === 'verbinden') {
      const goed = q.paren.filter((_, k) => Array.isArray(a) && a[k] === k).length;
      return half((p * goed) / q.paren.length);
    }
    if (q.type === 'ordenen' && q.puntenPer === 'plaats') return Array.isArray(a) && a.length === q.items.length ? half((p * a.filter((x, i) => x === i).length) / q.items.length) : 0;
    if (q.type === 'ordenen') return Array.isArray(a) && a.length === q.items.length && a.every((x, i) => x === i) ? p : 0;
    if (q.type === 'dictee') {
      const got = q.delen.reduce((s, d, i) => s + dicteeDeel(q, d, Array.isArray(a) ? a[i] : ''), 0);
      return half((p * got) / dicteeMax(q));
    }
    if (q.type === 'sorteren') {
      // Per juist gesorteerd woord; een woord dat nergens hoort maar toch in een kolom staat, kost er één.
      const woorden = sorteerWoorden(q);
      let goed = 0;
      let fout = 0;
      let n = 0;
      woorden.forEach((w, i) => {
        const kol = sorteerKolommen(q, w);
        const k = Array.isArray(a) ? a[i] : null;
        if (kol.length) n++;
        if (k === null || k === undefined) return;
        if (kol.includes(k)) goed++; else if (!kol.length) fout++;
      });
      return n ? half((p * Math.max(0, goed - fout)) / n) : 0;
    }
    if (q.type === 'tabel') {
      const cellen = q.rijen.slice(1).flat().map(celGat).filter(Boolean).map(m => m.goed);
      const goed = cellen.filter((c, k) => zelfde(c, Array.isArray(a) ? a[k] : null, q)).length;
      return half((p * goed) / cellen.length);
    }
    if (q.type === 'blad') {
      const b = Array.isArray(a) ? a : [];
      const deel = vakDeel(q, b, ov || {});
      const goed = deel.map(d => (d === null ? null : d >= 1));
      let som = 0;
      const groepen = new Map();
      // Samen op punten: het groepje is goed als elk vakje erin goed is.
      const samen = new Map();
      q.velden.forEach((f, k) => {
        if (f.samen && f.soort !== 'kruis') {
          const s = samen.get(f.samen) || { goed: true, punten: 0 };
          s.goed = s.goed && !!goed[k];
          s.punten += f.punten;
          samen.set(f.samen, s);
          return;
        }
        if (deel[k]) som += f.punten * deel[k];
        if (f.soort !== 'kruis') return;
        const g = groepen.get(f.groep) || { goed: true, punten: 0 };
        g.goed = g.goed && (b[k] === true) === f.antwoord;
        g.punten += f.punten;
        groepen.set(f.groep, g);
      });
      for (const g of groepen.values()) if (g.goed) som += g.punten;
      for (const s of samen.values()) if (s.goed) som += s.punten;
      return half(som);
    }
    if (q.type === 'getallenas') {
      const x = getal(q.antwoord);
      return Number.isFinite(Number(a)) && Math.abs(Number(a) - x) < Math.max(1e-6, getal(q.stap) / 1000) ? p : 0;
    }
    if (q.type === 'markeren') {
      // Een fout aangeduid stuk (of een stuk in de verkeerde kleur) kost evenveel als een juist oplevert.
      const { goed, fout, nodig } = markeerTel(q, a);
      return half((p * Math.max(0, goed - fout)) / nodig);
    }
    if (q.type === 'aanduiden' && metNamen(q)) {
      // Een naam is goed als hij in een plek met diezelfde naam staat (zo mag "rivier" twee keer voorkomen).
      const b = Array.isArray(a) ? a : [];
      const goed = q.zones.filter((z, n) => {
        const pt = b[n];
        return pt && typeof pt === 'object' && q.zones.some(y => y.naam === z.naam && Math.hypot(Number(pt.x) - y.x, (Number(pt.y) - y.y) * q.verhouding) <= y.r);
      }).length;
      return half((p * goed) / q.zones.length);
    }
    if (q.type === 'aanduiden') {
      if (!a || typeof a !== 'object') return 0;
      const x = Number(a.x);
      const y = Number(a.y);
      return q.zones.some(z => Math.hypot(x - z.x, (y - z.y) * q.verhouding) <= z.r) ? p : 0;
    }
    return 0;
  }

  // Een antwoord van de leerling opschonen (en niet te groot laten worden).
  function schoon(q, a) {
    const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 2000) : '');
    if (a === null || a === undefined) return null;
    if (q.type === 'meerkeuze') return Array.isArray(a) ? a.slice(0, 8).map(Number).filter(Number.isInteger) : Number.isInteger(Number(a)) && a !== '' ? Number(a) : null;
    if (q.type === 'juistfout' && q.stellingen) return list(a, 20).slice(0, q.stellingen.length).map(v => (v === 'J' || v === 'F' ? v : null));
    if (q.type === 'juistfout') return a === 'J' || a === 'F' ? a : null;
    if (q.type === 'invullen' || q.type === 'tabel') return list(a, 60).map(v => str(v).slice(0, 200));
    if (q.type === 'dictee') return list(a, MAX_DICTEE).slice(0, q.delen.length).map(v => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').slice(0, 400)));
    if (q.type === 'sorteren') return list(a, 60).map(v => (Number.isInteger(Number(v)) && v !== null && v !== '' && Number(v) >= 0 && Number(v) < q.kolommen.length ? Number(v) : null));
    if (q.type === 'verbinden' || q.type === 'ordenen') return list(a, 12).map(v => (v === null || v === '' ? null : Number.isInteger(Number(v)) ? Number(v) : null));
    if (q.type === 'rekenen') return a && typeof a === 'object' ? { werk: str(a.werk), uitkomst: str(a.uitkomst).slice(0, 200) } : null;
    if (q.type === 'blad') return list(a, MAX_VELDEN).map((v, k) => (v === true ? true : v === false || v === null ? null : q.velden[k] && (q.velden[k].soort === 'teken' || (q.velden[k].soort === 'klad' && q.velden[k].vorm === 'tekenen')) ? tekeningOf(v) : str(v).slice(0, 1000)));
    if (q.type === 'getallenas') return a !== '' && Number.isFinite(Number(a)) ? Math.round(Number(a) * 1e6) / 1e6 : null;
    if (q.type === 'markeren') {
      const n = v => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < 5000;
      const k = v => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= MAX_KLEUREN;
      if (!nieuwMarkeren(q) && !q.kleuren) return [...new Set(list(a, 400).map(Number).filter(x => Number.isInteger(x) && x >= 0))].sort((x, y) => x - y);
      const uit = [];
      const gezien = new Set();
      for (const x of list(a, 400)) {
        let r = null;
        if (n(x)) r = q.per === 'stuk' ? [Number(x), Number(x), 1] : [Number(x), 1];
        else if (Array.isArray(x) && q.per === 'stuk' && x.length === 3 && n(x[0]) && n(x[1]) && k(x[2]) && Number(x[0]) <= Number(x[1])) r = x.map(Number);
        else if (Array.isArray(x) && q.per !== 'stuk' && x.length === 2 && n(x[0]) && k(x[1])) r = x.map(Number);
        if (!r) continue;
        const sleutel = q.per === 'stuk' ? `${r[0]}-${r[1]}` : String(r[0]);
        if (gezien.has(sleutel)) continue;
        gezien.add(sleutel);
        uit.push(r);
      }
      return uit.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    }
    if (q.type === 'tekenen') return tekeningOf(a);
    if (q.type === 'spreken') return opnameOf(a);
    const pt = v => (v && typeof v === 'object' && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y)) ? { x: Math.round(Number(v.x) * 10) / 10, y: Math.round(Number(v.y) * 10) / 10 } : null);
    if (q.type === 'aanduiden' && metNamen(q)) return list(a, q.zones.length).map(pt);
    if (q.type === 'aanduiden') return pt(Array.isArray(a) ? null : a);
    return str(a);
  }

  // "36 cm", maar geen "36 cm cm" als de eenheid al in het antwoord staat.
  const metEenheid = (a, e) => (e && !String(a || '').toLowerCase().includes(e.toLowerCase()) ? `${a} ${e}` : String(a || ''));
  // Het juiste antwoord per vakje van een blad: tekst, ✗ (aankruisen) of leeg.
  const veldSleutel = q => q.velden.map(f => (f.soort === 'kruis' ? (f.antwoord ? (f.omkring ? '◯' : '✗') : '') : f.soort === 'plek' ? (f.doel ? '📍' : '') : f.soort === 'lijn' ? ([f.richting ? { evenwijdig: 'evenwijdig met de rechte', loodrecht: 'loodrecht op de rechte', 'niet-loodrecht': 'snijdt de rechte niet loodrecht', 'niet-evenwijdig': 'niet evenwijdig met de rechte' }[f.richting] : '', f.lengte ? `${getalTekst(f.lengte)} cm (± ${getalTekst(f.lengteMarge ?? 0.2)})` : ''].filter(Boolean).join(', ') || (f.naar ? '↗' : ''))
    : GEEN_ANTWOORD.has(f.soort) || f.soort === 'klad' ? ''
    : f.doorstreep && !alts(f.antwoord).length ? 'leeg of doorstreept'
    : f.soort === 'tekst' && heeftMarge(f) ? metEenheid(margeTekst(f), f.eenheid)
    : f.soort === 'tekst' || f.soort === 'breuk' ? metEenheid(alts(f.antwoord)[0] || '', f.eenheid) : f.soort === 'sleep' ? (alts(f.antwoord)[0] || '')
    : f.soort === 'rooster' && roosterAuto(f) ? (f.nakijk === 'uitkomst' ? `= ${roosterUitkomst(f)}` : f.nakijk === 'deling' ? `= ${f.quotient}${f.rest ? ` rest ${f.rest}` : ''}` : roosterCellen(f.sleutel).map(r => r.map(c => c || ' ').join('')).join('\n'))
    : f.soort === 'puntlijn' ? (f.doorPunt !== undefined ? `${f.aantal > 1 ? `${f.aantal} lijnen` : 'een lijn'} door het groene punt` : (f.lijnen || []).map(([a, b]) => `${puntNaam(a)}–${puntNaam(b)}`).join(', '))
    : f.soort === 'kleur' ? f.kleuren.filter(c => kleurDoel(f, c) !== null).map(c => `${c.aantal} ${c.kleur} (${kleurDoel(f, c)} van ${f.kol * f.rij} hokjes)`).join(', ')
    : f.soort === 'veelhoek' && f.vorm && !f.vrijePunten ? 'de figuur van de sleutel'
    : f.soort === 'veelhoek' ? (f.figuur ? (f.strikt ? `precies een ${f.figuur}` : f.figuur) + (f.vrijePunten && f.zijde ? `, zijden ${getalTekst(f.zijde)} cm (± ${getalTekst(f.zijdeMarge ?? 0.2)})` : '') : '')
    : f.soort === 'cirkel' ? (f.cirkels || []).map(c => `r = ${getalTekst(c.r)} cm`).join(', ') + ((f.cirkels || []).length ? ` (± ${getalTekst(f.marge ?? 0.1)})` : '')
    : (f.antwoord || '')));

  // Het juiste antwoord als tekst, voor het verbeterblad en de leerkracht.
  function oplossing(q) {
    const L = 'ABCDEFGH';
    if (q.type === 'meerkeuze') return (Array.isArray(q.juist) ? q.juist : [q.juist]).map(i => `${L[i]}${typeof q.opties[i] === 'string' ? `. ${q.opties[i]}` : q.opties[i].tekst ? `. ${q.opties[i].tekst}` : ''}`).join(' + ');
    if (q.type === 'juistfout' && q.stellingen) return q.stellingen.map((x, i) => `${i + 1}. ${q.labels === 'janee' ? (x.juist ? 'Ja' : 'Nee') : x.juist ? 'Juist' : 'Fout'}`).join(' · ');
    if (q.type === 'juistfout') return q.juist ? 'Juist' : 'Fout';
    if (q.type === 'invullen') return gapsOf(q.tekst).map(g => g[0]).join(' · ');
    if (q.type === 'kort' || q.type === 'rekenen') return metEenheid(alts(q.antwoord)[0], q.eenheid);
    if (q.type === 'blad') return veldSleutel(q).map((s, k) => (s ? `${k + 1}: ${s}` : '')).filter(Boolean).join(' · ');
    if (q.type === 'verbinden') return q.paren.map(p => `${p[0]} = ${p[1]}`).join(' · ');
    if (q.type === 'ordenen') return q.items.map((_, i) => itemTekst(q, i)).join(' → ');
    if (q.type === 'sorteren') return q.kolommen.map(k => `${k.naam}: ${k.woorden.join(', ')}`).join(' · ');
    if (q.type === 'dictee') return q.delen.map(d => d.tekst).join('\n');
    if (q.type === 'tabel') return q.rijen.slice(1).flat().map(celGat).filter(Boolean).map(m => alts(m.goed)[0]).join(' · ');
    if (q.type === 'getallenas') return asTekst(getal(q.antwoord), q.breuk);
    if (q.type === 'markeren') return markeerOplossing(q);
    if (MANUEEL.has(q.type)) return q.model || '';
    return '';
  }

  // De volgorde van de vragen voor één leerling: geschud, maar een blad uit de pdf blijft op zijn plaats.
  function volgorde(lijst, seed, schudden) {
    const order = lijst.map((_, i) => i);
    if (!schudden) return order;
    const los = order.filter(i => lijst[i].type !== 'blad');
    const mix = schud(los.length, seed).map(k => los[k]);
    return order.map(i => (lijst[i].type === 'blad' ? i : mix.shift()));
  }

  // Een willekeurige volgorde, met seed altijd dezelfde (zo blijft de volgorde na herladen gelijk).
  function schud(n, seed, nooitGelijk) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const rnd = () => ((h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
    const order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (nooitGelijk && n > 1 && order.every((v, i) => v === i)) order.push(order.shift());
    return order;
  }

  return {
    TYPES, NAMES, MANUEEL, NIVEAUS, MAX_BEELD, ROOSTER, validate, problemen, vragenVan, niveausVan, lijstVoor,
    maxVan, autoPunten, handPunten, totaal, viewOf, studentView, partsOf, getal, zelfde, canoniek, auto, schoon, oplossing, schud, alts, gapsOf,
    waarschuwingen, metNamen, MAX_ZONES, veldSleutel, vakGoed, vakDeel, handVeld, autoVeld, roosterAuto, roosterScore, roosterCellen, roosterTekst, roosterUitkomst,
    heeftMarge, margeGoed, tijdSec, VRIJ_SOORT, margeTekst, getalTekst, puntLijnen, puntlijnGoed, cirkelsVan, cirkelGoed, straalCm, puntNaam, handWerk, SCHAAL, NAKIJK, FIGUREN, figurenVan, veelhoekPunten, veelhoekVolgorde, hoekpunten, rondom, rekenregel, formuleFout, lijnGoed, lijnCm, veelhoekCm, lijnHoek, RICHTING, zelfdeVorm, kleurDoel, kleurGoed, metEenheid, volgorde, SOORTEN, HAND_VELD, woordenVan, doelenVan, sorteerWoorden, sorteerKolommen, dicteeVergelijk, dicteeDeel, dicteeZinPunten, MAX_DICTEE, itemTekst, markeerModel, markeerSleutel, doelenInBron, markeerTel, markeerKort, markeerAntwoord, tekstWoorden, stukkenVan, zonderHaken, STIFTEN, PER, asTekst, MAX_AUDIO, celGat, vereenvoudigd, GEEN_ANTWOORD, AUTO_VELD, KLEUREN,
  };
});
