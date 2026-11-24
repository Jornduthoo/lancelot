// Voorlezen met de stem van LANcelot. De leerling hoort een geluidsbestand dat deze pc maakte met een spraakdienst
// (Azure Speech, Google Cloud Text-to-Speech of Gemini) en bewaarde. Zo klinkt het op elk toestel hetzelfde, met een
// Vlaamse stem, ook op een Chromebook zonder stemmen.
// - Vooraf: bij het geven van een taak (en bij een live toets of oefenblad) maakt LANcelot meteen alle geluid, ook de
//   trage versie voor 🎧/🐢. Tijdens de les komt alles van deze pc, over het lokale netwerk.
// - Nooit twee keer: de bestandsnaam is een vingerafdruk van tekst + stem + snelheid (map stemmen/).
// - Alleen tekst uit taken en lessen (en de testzin) wordt gemaakt: een leerling kan zelf niets laten maken.
// - Een teller per maand (tekens) met een grens die de leerkracht kiest. Daarboven: de stem van het toestel.
// - Zonder sleutel of zonder internet: niets mis, voorlees.js valt terug op de stem van het toestel.
// Ook: welke stem elke leerling hoorde (de leerling meldt het zelf), voor het icoontje in het live overzicht.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('./settings');
const gegevens = require('./gegevens');
const S = require('../public/js/stem-kern');

const DIR = () => gegevens.pad('stemmen');
const TELLER = () => path.join(DIR(), 'teller.json');
const TALEN = ['nl', 'fr', 'en', 'de', 'es'];
const STANDAARD_GRENS = 400000;

// De stemmen per dienst, taal en vrouw/man. Nederlands = Vlaams (nl-BE).
const STEMMEN = {
  azure: {
    nl: ['nl-BE', 'nl-BE-DenaNeural', 'nl-BE-ArnaudNeural'],
    fr: ['fr-BE', 'fr-BE-CharlineNeural', 'fr-BE-GerardNeural'],
    en: ['en-GB', 'en-GB-SoniaNeural', 'en-GB-RyanNeural'],
    de: ['de-DE', 'de-DE-KatjaNeural', 'de-DE-ConradNeural'],
    es: ['es-ES', 'es-ES-ElviraNeural', 'es-ES-AlvaroNeural'],
  },
  google: {
    nl: ['nl-BE', 'nl-BE-Wavenet-A', 'nl-BE-Wavenet-B'],
    fr: ['fr-FR', 'fr-FR-Wavenet-A', 'fr-FR-Wavenet-B'],
    en: ['en-GB', 'en-GB-Wavenet-A', 'en-GB-Wavenet-B'],
    de: ['de-DE', 'de-DE-Wavenet-C', 'de-DE-Wavenet-B'],
    es: ['es-ES', 'es-ES-Wavenet-C', 'es-ES-Wavenet-B'],
  },
  // Gemini kiest de uitspraak via de opdracht; dezelfde stem als bij LANcelot Junior (Aoede).
  gemini: Object.fromEntries(TALEN.map(t => [t, [t, 'Aoede', 'Charon']])),
};
const DIENSTEN = {
  azure: { naam: 'Azure Speech (Microsoft)', key: 'azureSpeechKey', env: 'AZURE_SPEECH_KEY', oud: 'stemAzureKey' },
  google: { naam: 'Google Cloud Text-to-Speech', key: 'stemGoogleKey' },
  gemini: { naam: 'Gemini (je AI-sleutel)', key: 'geminiKey' },
};
const SLEUTELS = ['azureSpeechKey', 'stemAzureKey', 'stemGoogleKey'];
// De sleutel van een dienst: uit de instellingen, anders (Azure) uit de omgevingsvariabele AZURE_SPEECH_KEY.
const sleutelVan = (s, d) => (DIENSTEN[d] ? String(s[DIENSTEN[d].key] || (DIENSTEN[d].oud && s[DIENSTEN[d].oud]) || (DIENSTEN[d].env && process.env[DIENSTEN[d].env]) || '').trim() : '');
const REGIO = /^[a-z0-9]{2,30}$/;
const regioVan = s => [s.azureSpeechRegion, s.stemAzureRegio, process.env.AZURE_SPEECH_REGION].map(r => String(r || '').trim().toLowerCase()).find(r => REGIO.test(r)) || 'westeurope';
// Nog nooit een spraakdienst gekozen, maar wel een Azure-sleutel (bv. via AZURE_SPEECH_KEY): dan Azure.
const dienstVan = s => (DIENSTEN[s.stemDienst] ? s.stemDienst : s.stemDienst === undefined && sleutelVan(s, 'azure') ? 'azure' : '');

function instellingen() {
  const s = settings.read();
  return {
    dienst: dienstVan(s),
    man: s.stemGeslacht === 'man',
    regio: regioVan(s),
    grens: Number(s.stemGrens) > 0 ? Math.round(Number(s.stemGrens)) : STANDAARD_GRENS,
    key: sleutelVan(s, dienstVan(s)),
  };
}
const aan = () => { const i = instellingen(); return !!(i.dienst && i.key); };
const taalOk = t => (TALEN.includes(String(t || '').slice(0, 2)) ? String(t).slice(0, 2) : 'nl');

// De taal van een taak: uit het vak (Frans, Engels ...), anders de taal van LANcelot.
function taalVanVak(vak) {
  const v = String(vak || '').toLowerCase();
  if (/frans|fran[cç]ais|french/.test(v)) return 'fr';
  if (/engels|english/.test(v)) return 'en';
  if (/duits|deutsch|german/.test(v)) return 'de';
  if (/spaans|espa[nñ]ol|spanish/.test(v)) return 'es';
  try { return taalOk(require('./taal').huidig()); } catch { return 'nl'; }
}

function stemVoor(taal, i = instellingen()) {
  const [lang, vrouw, man] = STEMMEN[i.dienst][taalOk(taal)];
  return { lang, naam: i.man ? man : vrouw };
}

const schoon = t => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
function bestand(tekst, taal, traag, i = instellingen()) {
  const st = stemVoor(taal, i);
  const hash = crypto.createHash('sha1').update(`${i.dienst}|${st.naam}|${st.lang}|${traag ? 'traag' : 'normaal'}|${schoon(tekst)}`).digest('hex');
  return path.join(DIR(), `${hash}.${i.dienst === 'gemini' ? 'wav' : 'mp3'}`);
}

// ---------- De teller per maand ----------

const maand = (nu = new Date()) => nu.toISOString().slice(0, 7);
function teller() {
  try {
    const t = JSON.parse(fs.readFileSync(TELLER(), 'utf8'));
    if (t.maand === maand()) return { maand: t.maand, tekens: Number(t.tekens) || 0 };
  } catch {}
  return { maand: maand(), tekens: 0 };
}
function tel(n) {
  const t = teller();
  t.tekens += n;
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(TELLER(), JSON.stringify(t));
}

// ---------- De spraakdiensten ----------

const xml = t => t.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
const fout = (dienst, status, detail) => {
  if (status === 401 || status === 403) return new Error(`De sleutel voor ${DIENSTEN[dienst].naam} werkt niet. Controleer hem bij Instellingen > Voorlezen.`);
  if (status === 429) return new Error(`${DIENSTEN[dienst].naam} vraagt even te wachten (te veel tegelijk of je tegoed is op).`);
  return new Error(`${DIENSTEN[dienst].naam} gaf een fout (${status}${detail ? `: ${String(detail).slice(0, 120)}` : ''}).`);
};
async function haal(url, opties, dienst) {
  try {
    return await fetch(url, { ...opties, signal: AbortSignal.timeout(30000) });
  } catch {
    throw new Error(`Geen verbinding met ${DIENSTEN[dienst].naam}. Heeft deze pc internet?`);
  }
}

// Gemini geeft ruw geluid (16 bit, 24 kHz, mono): daar zetten we een wav-kop voor.
function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const UITSPRAAK = { nl: 'in het Vlaams, met een Belgische uitspraak', fr: 'en français', en: 'in British English', de: 'auf Deutsch', es: 'en español' };
const DIENST = {
  async azure(tekst, taal, traag, i) {
    const st = stemVoor(taal, i);
    const body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${st.lang}"><voice name="${st.naam}"><prosody rate="${traag ? '-40%' : '-5%'}">${xml(tekst)}</prosody></voice></speak>`;
    const basis = process.env.AZURE_TTS_BASE_URL || `https://${i.regio}.tts.speech.microsoft.com`;
    const res = await haal(`${basis}/cognitiveservices/v1`, {
      method: 'POST', body,
      headers: { 'Ocp-Apim-Subscription-Key': i.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'LANcelot' },
    }, 'azure');
    if (!res.ok) throw fout('azure', res.status, await res.text().catch(() => ''));
    return Buffer.from(await res.arrayBuffer());
  },
  async google(tekst, taal, traag, i) {
    const st = stemVoor(taal, i);
    const basis = process.env.GOOGLE_TTS_BASE_URL || 'https://texttospeech.googleapis.com';
    const res = await haal(`${basis}/v1/text:synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': i.key },
      body: JSON.stringify({ input: { text: tekst }, voice: { languageCode: st.lang, name: st.naam }, audioConfig: { audioEncoding: 'MP3', speakingRate: traag ? 0.6 : 0.95 } }),
    }, 'google');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.audioContent) throw fout('google', res.status, data.error && data.error.message);
    return Buffer.from(data.audioContent, 'base64');
  },
  async gemini(tekst, taal, traag, i) {
    const st = stemVoor(taal, i);
    const basis = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
    const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const opdracht = `Lees deze tekst letterlijk voor ${UITSPRAAK[taalOk(taal)]}, ${traag ? 'heel traag en duidelijk, met korte pauzes, zoals bij een dictee' : 'rustig en duidelijk'}. Zeg niets anders:\n${tekst}`;
    const res = await haal(`${basis}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': i.key },
      body: JSON.stringify({ contents: [{ parts: [{ text: opdracht }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: st.naam } } } } }),
    }, 'gemini');
    const data = await res.json().catch(() => ({}));
    const deel = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const audio = deel.find(p => p.inlineData && p.inlineData.data);
    if (!res.ok || !audio) throw fout('gemini', res.status, data.error && data.error.message);
    const rate = Number(((audio.inlineData.mimeType || '').match(/rate=(\d+)/) || [])[1]) || 24000;
    return wav(Buffer.from(audio.inlineData.data, 'base64'), rate);
  },
};

// ---------- Maken (één keer per tekst) ----------

const bezig = new Map(); // bestand -> Promise
let laatsteFout = '';

function maak(tekst, taal, traag) {
  const i = instellingen();
  if (!i.dienst || !i.key) return Promise.reject(new Error('Er is geen spraakdienst ingesteld.'));
  const t = schoon(tekst);
  const f = bestand(t, taal, traag, i);
  if (fs.existsSync(f)) return Promise.resolve(f);
  if (bezig.has(f)) return bezig.get(f);
  if (teller().tekens + t.length > i.grens) return Promise.reject(new Error('De grens voor deze maand is bereikt.'));
  const p = DIENST[i.dienst](t, taal, traag, i).then(buf => {
    fs.mkdirSync(DIR(), { recursive: true });
    fs.writeFileSync(`${f}.tmp`, buf);
    fs.renameSync(`${f}.tmp`, f);
    tel(t.length);
    laatsteFout = '';
    return f;
  }).catch(err => { laatsteFout = err.message; throw err; }).finally(() => bezig.delete(f));
  bezig.set(f, p);
  return p;
}

// ---------- Wat er voorgelezen kan worden ----------

// Uit wat de leerling te zien krijgt (een toets of een oefenblad): de teksten die een 🔊-, 🎧- of 🐢-knop voorleest.
// 'zeg' en 'voorlees' zijn luisterteksten (altijd, ook traag); de rest alleen als voorlezen aan staat.
const LUISTER = new Set(['voorlees', 'zeg']);
const GEWOON = new Set(['vraag', 'tekst', 'titel', 'title', 'text', 'instruction', 'question', 'options', 'opties', 'statement', 'prompt', 'lines', 'left', 'right', 'parts']);
function teksten(view, { voorlees = true } = {}) {
  const gewoon = new Set();
  const luister = new Set();
  let keuzes = 0; // hoeveel letters (A:, B: ...) er nodig zijn
  let kiesUit = false;
  const strings = (v, doel) => {
    if (typeof v === 'string') { if (v.trim()) doel.add(v); } else if (Array.isArray(v)) for (const x of v) strings(x, doel);
  };
  const loop = (v, diep = 0) => {
    if (!v || typeof v !== 'object' || diep > 12) return;
    if (Array.isArray(v)) return v.forEach(x => loop(x, diep + 1));
    for (const [k, x] of Object.entries(v)) {
      if (voorlees && (k === 'opties' || k === 'options' || k === 'right') && Array.isArray(x)) keuzes = Math.max(keuzes, x.length);
      if (voorlees && k === 'right' && Array.isArray(x)) kiesUit = true;
      if (LUISTER.has(k)) strings(x, luister);
      else if (voorlees && GEWOON.has(k)) strings(x, gewoon);
      // Een luisterknop op een blad (een tekst die de computer voorleest).
      if (k === 'tekst' && v.soort === 'luister') strings(x, luister);
      if (x && typeof x === 'object' && k !== 'stukken') loop(x, diep + 1);
    }
  };
  loop(view);
  const uit = new Map(); // `${traag}|${stuk}` -> { tekst, traag }
  const zet = (tekst, traag) => { for (const s of S.serverStukken(tekst, traag)) uit.set(`${traag ? 1 : 0}|${schoon(s)}`, { tekst: schoon(s), traag }); };
  for (const t of gewoon) zet(t, false);
  for (const t of luister) { zet(t, false); zet(t, true); }
  // "A: appel" wordt "A:" en "appel": alleen de letters die er echt zijn. "Kies uit:" bij verbinden (oefenblad).
  if (kiesUit) zet('Kies uit:', false);
  for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, keuzes)) zet(`${l}:`, false);
  return [...uit.values()];
}

// Wat gemaakt mag worden: alles uit taken en lessen (per taal), en de testzin. Een leerling vraagt alleen dit op.
let gewenst = new Map(); // `${taal}|${traag}|${tekst}` -> { tekst, taal, traag }
const sleutel = (tekst, taal, traag) => `${taalOk(taal)}|${traag ? 1 : 0}|${schoon(tekst)}`;
function magGemaakt(tekst, taal, traag) {
  if (!traag && schoon(tekst) === schoon(S.TESTZIN[taalOk(taal)])) return true;
  return gewenst.has(sleutel(tekst, taal, traag));
}

// bronnen: [{ view, taal, voorlees }] van alle open taken en lessen. Maakt in de achtergrond wat nog ontbreekt.
let rij = Promise.resolve();
function zorgVoor(bronnen) {
  const nieuw = new Map();
  for (const b of bronnen) {
    const taal = taalOk(b.taal);
    for (const { tekst, traag } of teksten(b.view, { voorlees: b.voorlees !== false })) nieuw.set(sleutel(tekst, taal, traag), { tekst, taal, traag });
  }
  for (const taal of new Set([...nieuw.values()].map(x => x.taal))) nieuw.set(sleutel(S.TESTZIN[taal], taal, false), { tekst: S.TESTZIN[taal], taal, traag: false });
  gewenst = nieuw;
  if (!aan()) return rij;
  const lijst = [...nieuw.values()];
  rij = rij.then(async () => {
    let mis = 0;
    for (const x of lijst) {
      if (!aan() || !gewenst.has(sleutel(x.tekst, x.taal, x.traag))) continue;
      try {
        await maak(x.tekst, x.taal, x.traag);
        mis = 0;
      } catch {
        // Geen internet, een foute sleutel of de grens: na drie keer stoppen, de volgende ronde probeert opnieuw.
        if (++mis >= 3) break;
      }
    }
  }).catch(() => {});
  return rij;
}

// Hoeveel van wat nodig is, er al is (voor de instellingen).
function klaar() {
  if (!aan()) return { nodig: gewenst.size, klaar: 0 };
  let n = 0;
  for (const x of gewenst.values()) if (fs.existsSync(bestand(x.tekst, x.taal, x.traag))) n++;
  return { nodig: gewenst.size, klaar: n };
}

// ---------- Voor de leerling en de leerkracht ----------

// Het geluid voor één stuk tekst: het bestand, of null (dan leest het toestel voor).
async function geluid({ tekst, taal, traag, leerkracht = false } = {}) {
  if (!aan()) return null;
  const t = schoon(tekst);
  if (!t) return null;
  const f = bestand(t, taal, traag);
  if (fs.existsSync(f)) return f;
  if (bezig.has(f)) return bezig.get(f).catch(() => null);
  if (!leerkracht && !magGemaakt(t, taal, traag)) return null;
  return maak(t, taal, traag).catch(() => null);
}

function view() {
  const s = settings.read();
  const i = instellingen();
  const t = teller();
  return {
    dienst: i.dienst, man: i.man, regio: i.regio, grens: i.grens, tekens: t.tekens, maand: t.maand,
    bijna: t.tekens >= i.grens * 0.8, op: t.tekens >= i.grens,
    diensten: Object.fromEntries(Object.keys(DIENSTEN).map(id => { const k = sleutelVan(s, id); return [id, { naam: DIENSTEN[id].naam, heeftSleutel: !!k, hint: k ? `…${k.slice(-4)}` : '', omgeving: !!k && !s[DIENSTEN[id].key] && !(DIENSTEN[id].oud && s[DIENSTEN[id].oud]) }]; })),
    aan: aan(), fout: laatsteFout, ...klaar(),
  };
}

// De leerkracht bewaart de instellingen. Een lege sleutel laat de oude staan.
function bewaar({ dienst, sleutel: key, regio, man, grens } = {}) {
  const ch = {};
  if (dienst !== undefined) ch.stemDienst = DIENSTEN[dienst] ? dienst : '';
  if (typeof regio === 'string' && regio.trim()) {
    if (!REGIO.test(regio.trim().toLowerCase())) throw new Error('Die regio ken ik niet (bv. swedencentral).');
    ch.azureSpeechRegion = regio.trim().toLowerCase();
  }
  if (man !== undefined) ch.stemGeslacht = man ? 'man' : 'vrouw';
  if (grens !== undefined) {
    const g = Math.round(Number(grens));
    if (!(g >= 1000 && g <= 100000000)) throw new Error('Kies een grens tussen 1000 en 100 000 000 tekens.');
    ch.stemGrens = g;
  }
  const d = ch.stemDienst !== undefined ? ch.stemDienst : dienstVan(settings.read());
  if (typeof key === 'string' && key.trim() && DIENSTEN[d]) ch[DIENSTEN[d].key] = key.trim();
  ch.stemTijd = Date.now();
  settings.write(ch);
  laatsteFout = '';
  return view();
}

function wisSleutel(dienst) {
  if (!SLEUTELS.includes((DIENSTEN[dienst] || {}).key)) return view();
  settings.write({ [DIENSTEN[dienst].key]: '', ...(DIENSTEN[dienst].oud ? { [DIENSTEN[dienst].oud]: '' } : {}), stemTijd: Date.now() });
  return view();
}

// ---------- Mee via Mijn lesmap ----------
// Jorn (2026-11-24): de instellingen van de spraakdienst, ook de sleutel, gaan mee naar je andere pc's (bv. het digibord),
// zodat je ze maar één keer invult. De laatste wijziging wint. De Gemini-sleutel (Instellingen > AI) gaat niet mee.
// Niet in de back-up (map stem-lesmap staat niet bij de onderdelen van de back-up).
const LESMAP_DIR = () => gegevens.vast('stem-lesmap');
const LESMAP_BESTAND = () => path.join(LESMAP_DIR(), 'instellingen.json');
const MEE = ['stemDienst', 'azureSpeechKey', 'azureSpeechRegion', 'stemGoogleKey', 'stemGeslacht', 'stemGrens'];
const syncTekst = d => `${JSON.stringify(d, null, 2)}\n`;

function syncGeldig(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || !(Number(d.tijd) > 0)) throw new Error('Ongeldig bestand.');
  if (d.stemDienst !== undefined && d.stemDienst !== '' && !DIENSTEN[d.stemDienst]) throw new Error('Ongeldig bestand.');
  for (const k of ['azureSpeechKey', 'azureSpeechRegion', 'stemGoogleKey', 'stemGeslacht']) if (d[k] !== undefined && typeof d[k] !== 'string') throw new Error('Ongeldig bestand.');
  if (d.azureSpeechRegion && !REGIO.test(d.azureSpeechRegion)) throw new Error('Ongeldig bestand.');
}
const nieuwste = (a, b) => ((Number(b.tijd) || 0) > (Number(a.tijd) || 0) ? b : a);
function lesmapSamen(hier, daar) { return syncTekst(nieuwste(JSON.parse(hier), JSON.parse(daar))); }

// Vóór het syncen: de instellingen van hier in het bestand voor Mijn lesmap (alleen als er hier ooit iets bewaard werd).
function naarLesmap() {
  const s = settings.read();
  if (!(Number(s.stemTijd) > 0)) return;
  const d = { tijd: Number(s.stemTijd) };
  for (const k of MEE) if (s[k] !== undefined) d[k] = s[k];
  if (!d.azureSpeechKey && s.stemAzureKey) d.azureSpeechKey = s.stemAzureKey;
  if (!d.azureSpeechRegion && s.stemAzureRegio) d.azureSpeechRegion = s.stemAzureRegio;
  let oud = '';
  try { oud = fs.readFileSync(LESMAP_BESTAND(), 'utf8'); } catch {}
  let tekst = syncTekst(d);
  try { const o = JSON.parse(oud); syncGeldig(o); tekst = syncTekst(nieuwste(o, d)); } catch {}
  if (oud === tekst) return;
  fs.mkdirSync(LESMAP_DIR(), { recursive: true });
  fs.writeFileSync(LESMAP_BESTAND(), tekst);
}

// Na het syncen: nieuwere instellingen van een andere pc overnemen. Geeft terug of er iets veranderde.
function uitLesmap() {
  let d;
  try { d = JSON.parse(fs.readFileSync(LESMAP_BESTAND(), 'utf8')); syncGeldig(d); } catch { return false; }
  if (Number(d.tijd) <= (Number(settings.read().stemTijd) || 0)) return false;
  const ch = { stemTijd: Number(d.tijd) };
  for (const k of MEE) ch[k] = d[k] !== undefined ? d[k] : k === 'stemDienst' ? '' : undefined;
  for (const k of Object.keys(ch)) if (ch[k] === undefined) delete ch[k];
  settings.write(ch);
  laatsteFout = '';
  return true;
}

// ---------- Welke stem elke leerling hoort ----------

// De leerling meldt het zelf (voorlees.js, POST /api/stem/stand) als het voorlezen begint of bij "Test geluid".
// Alleen in het geheugen: na een herstart of na 8 uur is het weg (het gaat alleen over de les van vandaag).
const STANDEN = ['server', 'toestel-be', 'toestel-nl', 'toestel', 'geen'];
const HOUD = 8 * 60 * 60 * 1000;
let standen = new Map(); // naam in kleine letters -> { naam, stand, tijd }
const naamSleutel = naam => String(naam || '').trim().toLowerCase();

function zetStand({ naam, stand } = {}, nu = Date.now()) {
  const n = String(naam || '').trim().slice(0, 60);
  if (!n || !STANDEN.includes(stand)) return false;
  const oud = standen.get(naamSleutel(n));
  standen.set(naamSleutel(n), { naam: n, stand, tijd: nu });
  return !oud || oud.stand !== stand;
}

// Voor het leerkrachtenscherm: { server: stem van LANcelot aan?, leerlingen: { 'naam in kleine letters': stand } }.
function standenView(nu = Date.now()) {
  const leerlingen = {};
  for (const [k, v] of standen) {
    if (nu - v.tijd > HOUD) standen.delete(k);
    else leerlingen[k] = v.stand;
  }
  return { server: aan(), leerlingen };
}

function wisStanden() {
  standen = new Map();
}

module.exports = {
  STANDEN, zetStand, standenView, wisStanden,
  LESMAP_DIR, syncGeldig, lesmapSamen, naarLesmap, uitLesmap,
  SLEUTELS, DIENSTEN, STEMMEN, aan, taalVanVak, teksten, zorgVoor, geluid, maak, magGemaakt, view, bewaar, wisSleutel, teller, wav,
};
