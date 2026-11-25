// Uitgebreide toetscontrole (wensenlijst 25 nov, punt 3). Drie dingen bovenop wat "nog niet af" al zegt:
// 1. Afbeeldingen die ontbreken, niet te lezen zijn of te klein (een prentje van 40 pixels is op een Chromebook niet te zien).
// 2. Getypte antwoorden (kort, invullen, vakjes op een blad): mogelijke andere goede schrijfwijzen die de computer nu fout rekent
//    (zonder lidwoord, zonder koppelteken, zonder accent, cijfer of woord, een getal met een eenheid die LANcelot niet kent).
//    Het blijven voorstellen: de leerkracht beslist en voegt ze toe met | (of de connector met vraag_wijzigen).
// 3. De 6- en de 6+-versie van een toets: bestaan ze allebei, en zijn ze allebei gepland (en op dezelfde dag)?
// Alles alleen lezen: er verandert niets aan de toets.
const fs = require('fs');
const path = require('path');
const proeven = require('./proeven');

const K = proeven.K;
const PUBLIC = path.join(__dirname, '..', 'public');

// ---------- 1. Afbeeldingen ----------

// De afmetingen uit de kop van het bestand (png, gif, jpeg, webp), zonder een bibliotheek. null = niet te lezen.
function maten(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 3) === 'GIF') return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const soort = buf.toString('ascii', 12, 16);
    if (soort === 'VP8X' && buf.length >= 30) return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (soort === 'VP8 ' && buf.length >= 30) return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (soort === 'VP8L' && buf.length >= 25) {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

// Wat er mis is met één beeld (of null). klein = een prentje bij een keuze of een kaartje: dan mag het kleiner.
const MIN = { gewoon: 150, klein: 60 };
function beeldFout(v, klein) {
  if (typeof v !== 'string' || !v.trim()) return null;
  if (v.startsWith('#')) return 'ontbreekt';
  let buf = null;
  if (v.startsWith('data:')) {
    const m = /^data:image\/[\w.+-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(v);
    if (!m) return 'is niet te lezen (geen gewoon beeld)';
    buf = Buffer.from(m[1], 'base64');
  } else if (/^https?:\/\//i.test(v)) {
    return 'staat op internet: zonder internet zien de leerlingen het niet';
  } else if (v.startsWith('/')) {
    const p = path.normalize(path.join(PUBLIC, decodeURIComponent(v.split('?')[0])));
    if (!p.startsWith(PUBLIC) || !fs.existsSync(p)) return 'ontbreekt (het bestand is er niet)';
    try { buf = fs.readFileSync(p); } catch { return 'is niet te lezen'; }
  } else {
    return 'is niet te lezen (onbekend adres)';
  }
  const m = maten(buf);
  if (!m || !m.w || !m.h) return 'is niet te lezen (kapot of onbekend formaat)';
  const min = klein ? MIN.klein : MIN.gewoon;
  if (m.w < min || m.h < Math.round(min / 3)) return `is te klein (${m.w} × ${m.h} pixels), op het scherm van een leerling is het moeilijk te zien`;
  return null;
}

// Alle beelden van een vraag: het beeld zelf, bij de keuzes, bij de items (ordenen, groeperen…), in een bron.
function beeldenVan(q) {
  const uit = [];
  const loop = (o, waar, klein) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x, i) => loop(x, waar ? `${waar} ${i + 1}` : `${i + 1}`, true)); return; }
    for (const [k, v] of Object.entries(o)) {
      if (k === 'vragen' || k === 'audio') continue;
      if (k === 'beeld' || k === 'img' || k === 'afbeelding') uit.push({ v, waar, klein });
      else if (v && typeof v === 'object') loop(v, ['opties', 'items', 'kaarten', 'paren', 'links', 'rechts'].includes(k) ? (k === 'opties' ? 'keuze' : 'item') : waar, klein || k !== 'velden');
    }
  };
  loop(q, '', false);
  return uit;
}

function beelden(t) {
  const out = [];
  const multi = K.niveausVan(t).length > 1;
  for (const n of K.niveausVan(t)) {
    for (const { q, nr } of K.vragenVan(K.lijstVoor(t, n))) {
      const tag = `${multi ? `${n}, ` : ''}vraag ${nr}`;
      if (q.beeldNodig || q.beeldPagina) continue; // staat al bij "niet af"
      for (const b of beeldenVan(q)) {
        const f = beeldFout(b.v, b.klein);
        if (f && f !== 'ontbreekt') out.push({ soort: 'beeld', tekst: `${tag}${b.waar ? ` (${b.waar})` : ''}: de afbeelding ${f}.` });
      }
    }
  }
  // Ook de bronnen (leesteksten met een prent): die zitten niet bij vragenVan als ze zelf geen vraag zijn.
  for (const n of K.niveausVan(t)) {
    K.lijstVoor(t, n).forEach((q, i) => {
      if (q.type !== 'bron' || !q.beeld) return;
      const f = beeldFout(q.beeld, false);
      if (f && f !== 'ontbreekt') out.push({ soort: 'beeld', tekst: `${multi ? `${n}, ` : ''}bron ${i + 1}: de afbeelding ${f}.` });
    });
  }
  return [...new Map(out.map(b => [b.tekst, b])).values()];
}

// ---------- 2. Andere goede schrijfwijzen ----------

const LIDWOORD = /^(de|het|een|'t|le|la|les|l'|un|une|des|the|a|an|der|die|das|el|los|las)\s+/i;
const CIJFERS = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien', 'twintig'];
const zonderAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// Spelling, dictee, werkwoorden, Frans: daar telt de schrijfwijze juist wel. Dan geen voorstellen over accenten of koppeltekens.
const SPELLING = /spelling|dictee|dictée|werkwoord|schrijf|frans|fran[cç]ais/i;

// Voorstellen voor één sleutel (alle goede antwoorden gescheiden door |).
function voorstellen(sleutel, { exact, eenheid, spelling } = {}) {
  const goed = K.alts(sleutel);
  if (!goed.length) return [];
  const al = s => goed.some(g => K.zelfde(g, s, { exact, eenheid }));
  const uit = new Set();
  for (const a of goed) {
    const lw = a.replace(LIDWOORD, '');
    if (lw !== a && lw.trim() && !al(lw)) uit.add(lw.trim());
    if (!spelling && /\w-\w/.test(a)) {
      const spatie = a.replace(/(\w)-(\w)/g, '$1 $2');
      if (!al(spatie)) uit.add(spatie);
    }
    if (!spelling && zonderAccent(a) !== a && !al(zonderAccent(a))) uit.add(zonderAccent(a));
    const t = a.trim().toLowerCase();
    if (CIJFERS.includes(t) && !al(String(CIJFERS.indexOf(t)))) uit.add(String(CIJFERS.indexOf(t)));
    // Een getal met iets erachter dat LANcelot niet als eenheid kent (45°, 12 stuks, 3 keer): het getal alleen telt dan fout.
    const m = /^(-?\d[\d.,\s]*?)\s*([^\d\s.,][^\d]*)$/.exec(a.trim());
    if (m && !eenheid && K.getal(a) === null && K.getal(m[1]) !== null && !al(m[1].trim())) uit.add(m[1].trim());
  }
  return [...uit].slice(0, 4);
}

function alternatieven(t) {
  const vak = proeven.vakVan(t) || '';
  const spelling = SPELLING.test(`${vak} ${t.title || ''}`);
  const out = [];
  const multi = K.niveausVan(t).length > 1;
  const zeg = (tag, sleutel, extra) => {
    const v = voorstellen(sleutel, { ...extra, spelling });
    if (v.length) out.push({ soort: 'antwoorden', tekst: `${tag}: "${K.alts(sleutel)[0]}" is goed. Misschien ook goed rekenen: ${v.map(x => `"${x}"`).join(', ')} (zet ze erbij met |).`, voorstel: v });
  };
  for (const n of K.niveausVan(t)) {
    for (const { q, nr } of K.vragenVan(K.lijstVoor(t, n))) {
      const tag = `${multi ? `${n}, ` : ''}vraag ${nr}`;
      if (q.type === 'kort' && !q.datum && !q.controle) {
        if (q.vakjes) K.goedeAntwoorden(q.antwoord).forEach((g, i) => zeg(`${tag}, antwoord ${i + 1}`, g.join('|'), q));
        else zeg(tag, q.antwoord, q);
      } else if (q.type === 'invullen' && !q.bank) {
        K.gapsOf(q.tekst).forEach((g, i) => { if (g.length) zeg(`${tag}, gat ${i + 1}`, g.join('|'), q); });
      } else if (q.type === 'blad') {
        (q.velden || []).forEach((f, i) => { if (f.soort === 'tekst' && f.antwoord && !f.formule && !K.heeftMarge(f)) zeg(`${tag}, vakje ${i + 1}`, f.antwoord, f); });
      }
      if (q.exact && ['kort', 'invullen', 'tabel'].includes(q.type)) out.push({ soort: 'antwoorden', tekst: `${tag}: "exact" staat aan, dus hoofdletters en leestekens tellen mee.` });
    }
  }
  return out.slice(0, 40);
}

// ---------- 3. De 6- en de 6+-versie ----------

const isPlus = x => /6\s*\+|zes-plus|6plus/i.test(`${x.title || x.titel || ''} ${x.folder || ''} ${x.file || ''}`);
// Wat de toets is, zonder het niveau: "6+ · Rekenen blok 4 · Toets getallenkennis" en "Toets getallenkennis - Blok 4" zijn dezelfde.
const WEG = new Set(['6', '6+', 'zes', 'plus', 'rekenen', 'wiskunde', 'taal', 'nederlands', 'page', 'schildknaap', 'ridder', 'versie', 'niveau']);
function kern(titel) {
  return String(titel || '').toLowerCase().replace(/6\s*\+/g, ' 6+ ').replace(/[·\-–—:(),|/]/g, ' ').split(/\s+/).filter(w => w && !WEG.has(w)).sort().join(' ');
}
// De map zonder het deel voor 6+: "Page – 6+/Rekenen/Blok 4" en "Rekenen/Blok 4" zijn dezelfde reeks.
const reeks = f => String(f || '').replace(/^[^/]*6\s*\+[^/]*\//i, '').toLowerCase();
const isOefen = x => /oefentoets|herkansing/i.test(x.title || x.titel || '');
const isPageVersie = x => /\(page\)|page\s*$/i.test(x.title || '') || /^page – klas/i.test(x.folder || '');

// De andere versie van deze toets (6 bij 6+, 6+ bij 6). Geeft { andere, zoek } of null als er niets op lijkt.
function versies(file, t, lijst, takenLijst, opgegeven) {
  const mij = lijst.find(x => x.file === file) || { file, title: t.title, folder: '' };
  if (!opgegeven && (isOefen(mij) || isPageVersie(mij))) return [];
  const k = kern(mij.title);
  const plus = isPlus(mij);
  const andere = opgegeven || lijst.filter(x => x.file !== file && isPlus(x) !== plus && !isOefen(x) && !isPageVersie(x) && kern(x.title) === k);
  // Hoort deze toets bij een reeks die een 6+-versie heeft? Alleen dan zeggen we dat er een ontbreekt (anders elke toets).
  const reeksHeeftPlus = lijst.some(x => isPlus(x) && !isOefen(x) && reeks(x.folder) === reeks(mij.folder));
  const out = [];
  const naam = plus ? '6' : '6+';
  if (!andere.length) {
    if (plus || reeksHeeftPlus) out.push({ soort: 'versie', tekst: `Geen ${naam}-versie gevonden van "${mij.title}". Bestaat ze onder een andere titel, dan geeft deze controle dat niet aan.` });
    return out;
  }
  const gepland = f => takenLijst.filter(x => x.soort === 'proef' && x.file === f && !x.dicht).map(x => ({ id: x.id, dag: String(x.vanaf || x.gemaakt || '').slice(0, 10), namen: x.leerlingen.map(l => l.naam) }));
  const hier = gepland(file);
  for (const a of andere) {
    const daar = gepland(a.file);
    if (hier.length && !daar.length) out.push({ soort: 'versie', tekst: `De ${naam}-versie "${a.title}" (${a.file}) is niet gepland, deze wel (${hier.map(x => x.dag).join(', ')}).` });
    else if (!hier.length && daar.length) out.push({ soort: 'versie', tekst: `Deze toets is niet gepland, de ${naam}-versie "${a.title}" wel (${daar.map(x => x.dag).join(', ')}).` });
    else if (hier.length && daar.length) {
      const d1 = new Set(hier.map(x => x.dag)), d2 = new Set(daar.map(x => x.dag));
      if (![...d1].some(d => d2.has(d))) out.push({ soort: 'versie', tekst: `De 6- en de 6+-versie staan op een andere dag: deze ${[...d1].join(', ')}, "${a.title}" ${[...d2].join(', ')}.` });
      const samen = hier.flatMap(x => x.namen).filter(n => daar.some(x => x.namen.includes(n)));
      if (samen.length) out.push({ soort: 'versie', tekst: `${samen.slice(0, 5).join(', ')}${samen.length > 5 ? ` en nog ${samen.length - 5}` : ''} ${samen.length === 1 ? 'krijgt' : 'krijgen'} allebei de versies.` });
    }
  }
  return out;
}
// Voor de connector en het scherm: de andere versie(s) met hun bestand.
function andereVersies(file, lijst) {
  const mij = lijst.find(x => x.file === file);
  if (!mij || isOefen(mij) || isPageVersie(mij)) return [];
  return lijst.filter(x => x.file !== file && isPlus(x) !== isPlus(mij) && !isOefen(x) && !isPageVersie(x) && kern(x.title) === kern(mij.title)).map(x => ({ file: x.file, titel: x.title, versie: isPlus(x) ? '6+' : '6' }));
}

// Alles samen: de extra bevindingen bij een toets.
function controleer({ file, toets, lijst, taken: takenLijst }) {
  return [...beelden(toets), ...alternatieven(toets), ...(file ? versies(file, toets, lijst || proeven.list(), takenLijst || []) : [])];
}

module.exports = { controleer, beelden, alternatieven, versies, andereVersies, voorstellen, beeldFout, maten, kern, isPlus };
