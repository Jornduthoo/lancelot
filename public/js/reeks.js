// Reeks met AI: per les een quiz en een oefenblad, in mappen Vak > Blok in De Smidse.
// Met een eigen sleutel maakt de AI de lessen één voor één. Zonder sleutel kopieert de leerkracht een prompt per paar lessen.
// Wat al in de juiste map staat (zelfde titel), is klaar: zo kan je stoppen en later verder doen.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const BEWAAR = 'lancelot-reeks';
let hasKey = false;

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

socket.on('settings', s => {
  Ui.zetAi(s);
  hasKey = s.hasKey;
  $('r-direct').classList.toggle('hidden', !hasKey);
  $('r-plan-direct').classList.toggle('hidden', !hasKey);
  $('r-zonder').classList.toggle('hidden', !hasKey);
});

// ---------- Wat er al is ----------

let quizzen = [];
let bladen = [];
socket.on('quizzes', list => { quizzen = list; teken(); });
socket.on('ob-sheets', list => { bladen = list; teken(); });

// Net bewaard, nog voor de nieuwe lijst binnen is.
const bewaard = new Set();
// Wat in deze ronde misliep: { sleutel: foutmelding }.
const fouten = {};

// Dezelfde regels als de mappen op de server (src/library.js): geen / of \, hooguit 40 tekens per map.
const mapNaam = t => String(t || '').replace(/[\/\\]/g, '-').trim().replace(/\s+/g, ' ').slice(0, 40);
const sleutel = (les, soort) => `${soort}|${les.map.toLowerCase()}|${les.titel}`;

function klaar(les, soort) {
  if (bewaard.has(sleutel(les, soort))) return true;
  const lijst = soort === 'quiz' ? quizzen : bladen;
  return lijst.some(x => x.title === les.titel && (x.folder || '').toLowerCase() === les.map.toLowerCase());
}

// ---------- De lessenlijst ----------

// "# Blok 1" is een map, daaronder een les per regel: "Les 1 - Titel | wat erin zit".
function lessen() {
  const vak = mapNaam($('r-vak').value) || 'Reeks';
  let blok = '';
  const out = [];
  const gezien = new Set();
  for (const regel of $('r-lessen').value.split('\n')) {
    const r = regel.trim();
    if (!r) continue;
    if (r.startsWith('#')) {
      blok = mapNaam(r.replace(/^#+/, ''));
      continue;
    }
    const [titel, ...rest] = r.split('|');
    let t = titel.replace(/^[-*•]\s*/, '').trim().replace(/\s+/g, ' ').slice(0, 90);
    if (!t) continue;
    const map = blok ? `${vak}/${blok}` : vak;
    // Twee lessen met dezelfde naam in dezelfde map: de tweede krijgt (2).
    for (let i = 2; gezien.has(`${map.toLowerCase()}|${t}`); i++) t = `${titel.trim().slice(0, 84)} (${i})`;
    gezien.add(`${map.toLowerCase()}|${t}`);
    out.push({ titel: t, inhoud: rest.join('|').trim().slice(0, 400), blok, map });
  }
  return out.slice(0, 300);
}

const wil = () => [$('r-quiz').checked && 'quiz', $('r-blad').checked && 'oefenblad'].filter(Boolean);
const nodig = les => wil().filter(s => !klaar(les, s));
const teDoen = () => lessen().filter(l => nodig(l).length);

// ---------- De prompts ----------

const getal = (id, min, max, std) => Math.min(max, Math.max(min, Number($(id).value) || std));

const BLAD_FORMATS = [
  '{ "type": "invullen", "instruction": "Vul de ontbrekende woorden in.", "text": "Een tekst met gaten. Het woord dat de leerling invult staat tussen vierkante haken, zoals de [hoofdstad]. Meerdere goede antwoorden: [fiets|velo]." }',
  '{ "type": "meerkeuze", "instruction": "Kies het juiste antwoord.", "items": [ { "question": "de vraag", "options": ["keuze A", "keuze B", "keuze C"], "correct": 1 } ] }',
  '{ "type": "juistfout", "instruction": "Is de zin juist of fout?", "items": [ { "statement": "een stelling", "correct": true } ] }',
  '{ "type": "verbinden", "instruction": "Verbind wat bij elkaar hoort.", "pairs": [ ["links", "rechts"], ["links", "rechts"] ] }',
  '{ "type": "woorden", "instruction": "Schrijf het juiste woord.", "items": [ { "prompt": "de opgave, bijv. een som, vertaling of omschrijving", "answer": "het antwoord" } ] }',
];

function pakketPrompt(groep, metBijlage) {
  const vak = $('r-vak').value.trim() || 'de lessen hieronder';
  const level = $('r-level').value;
  const drie = $('r-drie').checked;
  const n = getal('r-vragen', 3, 10, 5);
  const oef = getal('r-oef', 2, 6, 3);
  const extra = $('r-extra').value.trim();
  const welke = groep.map((les, i) => {
    const maak = nodig(les).map(s => (s === 'quiz' ? 'een quiz' : 'een oefenblad')).join(' en ');
    return `${i + 1}. "${les.titel}"${les.blok ? ` (${les.blok})` : ''}${les.inhoud ? `: ${les.inhoud}` : ''}\n   Maak: ${maak}.`;
  }).join('\n');
  const quiz = groep.some(l => nodig(l).includes('quiz'));
  const blad = groep.some(l => nodig(l).includes('oefenblad'));
  const blocks = `[\n          ${BLAD_FORMATS.join(',\n          ')}\n        ]`;
  return `Je bent een ervaren leerkracht in Vlaanderen. Ik maak lesmateriaal voor ${vak}, ${level} (Belgisch onderwijs).
${metBijlage ? 'Gebruik de handleiding of lesstof uit dit gesprek als die er is, zodat het materiaal past bij wat in de les aan bod komt. Schrijf alles in je eigen woorden: neem geen teksten of oefeningen letterlijk over.\n' : ''}${extra ? `\nExtra wensen van de leerkracht:\n${extra}\n` : ''}
Maak materiaal voor ${groep.length === 1 ? 'deze les' : `deze ${groep.length} lessen`}:
${welke}
${quiz ? `
Regels voor de quiz:
- ${drie ? `Precies ${n} meerkeuzevragen per niveau, dus ${n * 3} vragen samen. Geef elke vraag "niveau": "page", "schildknaap" of "ridder".` : `Precies ${n} meerkeuzevragen.`}
- Elke vraag heeft 4 antwoorden (bij waar/niet waar 2), met precies één goed antwoord, niet steeds op dezelfde plek.
- De foute antwoorden zijn typische fouten of misvattingen van leerlingen, geen onzin.
- Elke vraag krijgt een korte "uitleg" (hooguit 200 tekens) die de regel of redenering uitlegt.
- Is het antwoord één getal (zoals 3,75 of 12 cm), zet dan "typ": "getal" en zet dat getal bij de antwoorden.
- Vragen hooguit 120 tekens, antwoorden hooguit 60 tekens.
` : ''}${blad ? `
Regels voor het oefenblad:
- ${drie ? `${oef} oefeningen per niveau` : `${oef} oefeningen`}, met ongeveer 6 vragen of gaten per oefening.
- Kies de soorten die het best bij de les passen en wissel af: invullen, meerkeuze, juistfout, verbinden, woorden.
- Elke oefening krijgt een korte opdrachtzin ("instruction"). Antwoorden zijn eenduidig, zodat de computer kan verbeteren.
- Bij invullen staat elk in te vullen woord tussen [vierkante haken]. Bij verbinden 4 tot 8 paren, elk woord maar één keer.
- Bij meerkeuze is "correct" het nummer van het goede antwoord, geteld vanaf 0.
` : ''}
Voor alles:
- Nederlands zoals in Vlaanderen, Belgische context: komma als decimaalteken, euro, Belgische namen en plaatsen.
- Moeilijkheid en taalgebruik passen bij ${level}. Bouw op van kennis naar begrip en toepassen.
- Controleer op het einde alles: reken elk antwoord opnieuw na en kijk of precies één antwoord juist is.
${drie ? `\n${Niveau.prompt(level, 'vragen en oefeningen')}\n` : ''}
Belangrijk: maak GEEN interactieve quiz, app of canvas en schrijf geen code. Ik heb enkel de gegevens nodig als tekst.
Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat (laat "quiz" of "oefenblad" weg als ik het bij die les niet vraag):
{
  "lessen": [
    {
      "les": "de titel van de les, precies zoals hierboven",
      "quiz": { "questions": [ { "question": "de vraag", "answers": ["A", "B", "C", "D"], "correct": 0, "time": 20, "uitleg": "waarom"${drie ? ', "niveau": "page"' : ''} } ] },
      "oefenblad": ${drie ? `{ "niveaus": {
        "page": [ ...oefeningen met hulp, in dezelfde vorm... ],
        "schildknaap": ${blocks},
        "ridder": [ ...uitdagende oefeningen, in dezelfde vorm... ]
      } }` : `{ "blocks": ${blocks} }`}
    }
  ]
}`;
}

function planPrompt() {
  const vak = $('r-vak').value.trim();
  const level = $('r-level').value;
  return `Je bent een ervaren leerkracht in Vlaanderen. In de bijgevoegde handleiding (of het jaarplan) staan de lessen${vak ? ` voor ${vak}` : ''}, ${level}. Maak er een lessenlijst van.
- Neem de lessen met leerstof of inoefening. Sla toetsen, evaluaties, differentiatie, remediëring, projecten en vrije lessen over.
- Geef elke les een korte titel (hooguit 60 tekens) die begint met het lesnummer, zoals "Les 3 - Breuken vergelijken".
- Schrijf per les in je eigen woorden wat erin aan bod komt (hooguit 300 tekens): de leerstof, de doelen en wat leerlingen vaak moeilijk vinden. Neem geen teksten letterlijk over.
- Groepeer de lessen per blok, thema of hoofdstuk zoals in de handleiding (naam hooguit 40 tekens, zoals "Blok 1 - Grote getallen").
Belangrijk: schrijf geen code en maak geen app. Geef je antwoord als één codeblok met JSON, zonder uitleg ervoor of erna, in dit formaat:
{ "blokken": [ { "naam": "Blok 1 - Grote getallen", "lessen": [ { "titel": "Les 1 - Getallen tot 1 miljard", "inhoud": "wat in de les aan bod komt" } ] } ] }`;
}

// ---------- Bewaren ----------

const emit = (event, arg) => new Promise(resolve => socket.emit(event, arg, res => resolve(res || { error: 'Geen antwoord van LANcelot.' })));

// Het antwoord van de AI bij de juiste lessen zetten en bewaren. Geeft het aantal bewaarde stukken terug.
async function bewaarPakket(pakket, groep) {
  let stukken = 0;
  const vrij = pakket.lessen.slice();
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [i, les] of groep.entries()) {
    const terug = vrij.find(l => norm(l.les) === norm(les.titel)) || (vrij.includes(pakket.lessen[i]) ? pakket.lessen[i] : null);
    if (terug) vrij.splice(vrij.indexOf(terug), 1);
    const misten = [];
    for (const soort of nodig(les)) {
      const data = terug && terug[soort];
      if (!data) {
        misten.push(terug ? terug.fouten.find(f => f.startsWith(soort === 'quiz' ? 'Quiz' : 'Oefenblad')) || `${soort === 'quiz' ? 'Quiz' : 'Oefenblad'} ontbrak in het antwoord.` : 'Deze les ontbrak in het antwoord.');
        continue;
      }
      data.title = les.titel;
      if (soort === 'quiz') {
        if ($('r-drie').checked) data.questions.sort((a, b) => Niveau.LIST.indexOf(a.niveau || 'schildknaap') - Niveau.LIST.indexOf(b.niveau || 'schildknaap'));
        else for (const q of data.questions) delete q.niveau;
      }
      const res = await emit('reeks-bewaar', { soort, data, map: les.map });
      if (res.error) misten.push(res.error);
      else {
        bewaard.add(sleutel(les, soort));
        stukken++;
      }
    }
    if (misten.length) fouten[les.map + les.titel] = misten.join(' ');
    else delete fouten[les.map + les.titel];
  }
  teken();
  return stukken;
}

// ---------- Met eigen sleutel: alles na elkaar ----------

let bezig = false;
let pauze = false;

$('r-start').addEventListener('click', async () => {
  $('r-error').textContent = '';
  if (!wil().length) return ($('r-error').textContent = 'Kies een quiz, een oefenblad of allebei.');
  if (!lessen().length) return ($('r-error').textContent = 'Zet eerst de lessen bij stap 1.');
  bezig = true;
  pauze = false;
  $('r-start').disabled = true;
  $('r-pauze').classList.remove('hidden');
  const geprobeerd = new Set();
  let opRij = 0;
  for (;;) {
    if (pauze) break;
    const les = teDoen().find(l => !geprobeerd.has(l.map + l.titel));
    if (!les) break;
    geprobeerd.add(les.map + les.titel);
    huidig = les;
    teken();
    const res = await emit('reeks-ai', { prompt: pakketPrompt([les], false) });
    if (res.error) {
      fouten[les.map + les.titel] = res.error;
      // Drie keer na elkaar mis: waarschijnlijk is de limiet bereikt of is er geen internet.
      if (++opRij >= 3) {
        $('r-error').textContent = `Gestopt na drie fouten na elkaar: ${res.error}`;
        break;
      }
      continue;
    }
    opRij = (await bewaarPakket(res, [les])) ? 0 : opRij + 1;
  }
  huidig = null;
  bezig = false;
  $('r-start').disabled = false;
  $('r-pauze').classList.add('hidden');
  $('r-pauze').disabled = false;
  teken();
  if (!teDoen().length) Ui.melding('De reeks is klaar! Je vindt alles in De Smidse bij Mijn quizzen en Mijn oefenbladen.');
});
$('r-pauze').addEventListener('click', () => {
  pauze = true;
  $('r-pauze').disabled = true;
});
window.addEventListener('beforeunload', e => {
  if (bezig) e.preventDefault();
});

// ---------- Zonder sleutel: kopiëren en plakken ----------

let groepNu = null;
let promptGekopieerd = false;
let laatsteKlembord = '';
let huidig = null;

function volgendeGroep() {
  const per = Number($('r-per').value) || 2;
  const open = teDoen();
  if (!open.length) return [];
  return open.filter(l => l.map === open[0].map).slice(0, per);
}

function kopieer(tekst) {
  Ui.kopieer(tekst);
  promptGekopieerd = true;
  laatsteKlembord = tekst;
}

let planGekopieerd = false;
async function kopieerPakket() {
  $('r-error').textContent = '';
  if (!wil().length) return ($('r-error').textContent = 'Kies een quiz, een oefenblad of allebei.') && false;
  if (!lessen().length) return ($('r-error').textContent = 'Zet eerst de lessen bij stap 1.') && false;
  groepNu = volgendeGroep();
  if (!groepNu.length) {
    $('r-copied').textContent = 'Alles is klaar.';
    return false;
  }
  planGekopieerd = false;
  await kopieer(pakketPrompt(groepNu, true));
  $('r-copied').textContent = `Gekopieerd: ${groepNu.map(l => l.titel).join(', ')}. Plak hem in de chatbot, kopieer het antwoord en kom hier terug.`;
  return true;
}
$('r-copy').addEventListener('click', kopieerPakket);
for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    // Eerst kopiëren (de pagina heeft dan nog de focus), dan meteen het venster openen.
    if (b.hasAttribute('data-plan')) {
      planGekopieerd = true;
      kopieer(planPrompt());
      return window.open(b.dataset.url, '_blank', 'noopener');
    }
    if (!wil().length || !volgendeGroep().length) return kopieerPakket();
    kopieerPakket();
    window.open(b.dataset.url, '_blank', 'noopener');
  });
}

async function leesAntwoord(tekst, stil) {
  const res = await emit('reeks-parse', tekst);
  if (res.error) {
    if (!stil) $('r-error').textContent = res.error;
    return;
  }
  $('r-error').textContent = '';
  $('r-answer').value = '';
  // Hoort het antwoord niet bij de laatst gekopieerde prompt? Dan zoeken we de lessen op titel.
  const groep = groepNu && groepNu.length ? groepNu : teDoen().slice(0, res.lessen.length);
  const stukken = await bewaarPakket(res, groep);
  groepNu = null;
  const rest = teDoen().length;
  $('r-copied').textContent = `${stukken} ${stukken === 1 ? 'stuk' : 'stukken'} bewaard. ${rest ? `Nog ${rest} ${rest === 1 ? 'les' : 'lessen'}: klik op "Alleen kopiëren" voor de volgende prompt en plak hem in hetzelfde gesprek.` : 'De reeks is klaar!'}`;
  $('r-copy').textContent = rest ? 'Kopieer de volgende prompt' : 'Alleen kopiëren';
}
$('r-answer').addEventListener('paste', () => setTimeout(() => leesAntwoord($('r-answer').value, false), 0));

async function leesPlan(tekst, stil) {
  const res = await emit('reeks-plan-parse', tekst);
  if (res.error) {
    if (!stil) $('r-plan-error').textContent = res.error;
    return;
  }
  zetPlan(res);
}
$('r-plan-answer').addEventListener('paste', () => setTimeout(() => leesPlan($('r-plan-answer').value, false), 0));

// Terug uit de chatbot: staat het antwoord al op het klembord?
window.addEventListener('focus', async () => {
  if (!promptGekopieerd || !navigator.clipboard?.readText) return;
  let tekst;
  try { tekst = await navigator.clipboard.readText(); } catch { return; }
  if (!tekst || tekst === laatsteKlembord) return;
  if (planGekopieerd && tekst.includes('"blokken"')) {
    laatsteKlembord = tekst;
    leesPlan(tekst, true);
  } else if (tekst.includes('"lessen"')) {
    laatsteKlembord = tekst;
    leesAntwoord(tekst, true);
  }
});

// ---------- Lessenlijst uit een handleiding ----------

async function zetPlan({ blokken }) {
  const tekst = blokken.map(b => [b.naam && `# ${b.naam}`, ...b.lessen.map(l => (l.inhoud ? `${l.titel} | ${l.inhoud}` : l.titel))].filter(Boolean).join('\n')).join('\n\n');
  if ($('r-lessen').value.trim() && !await Ui.vraag('De lessenlijst vervangen door wat de AI vond?', { ja: 'Vervangen' })) return;
  $('r-lessen').value = tekst;
  $('r-plan-answer').value = '';
  $('r-plan-error').textContent = '';
  onthoud();
  teken();
  $('r-lessen').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

let bestanden = [];
const MAX_BYTES = 15 * 1024 * 1024;
function toonBestanden() {
  const lijst = $('r-file-list');
  lijst.innerHTML = '';
  bestanden.forEach((f, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><button class="secondary" title="Verwijderen">✕</button>';
    li.querySelector('span').textContent = `${f.name} (${Math.ceil(f.size / 1024)} kB)`;
    li.querySelector('button').addEventListener('click', () => { bestanden.splice(i, 1); toonBestanden(); });
    lijst.appendChild(li);
  });
}
$('r-files').addEventListener('change', e => {
  $('r-plan-error').textContent = '';
  for (const file of e.target.files) {
    if (!/^image\/|^application\/pdf$/.test(file.type)) {
      $('r-plan-error').textContent = `${file.name}: alleen pdf's en afbeeldingen.`;
      continue;
    }
    if (bestanden.reduce((s, f) => s + f.size, 0) + file.size > MAX_BYTES) {
      $('r-plan-error').textContent = `${file.name} is te groot: samen hooguit 15 MB. Kies enkel het deel met de inhoudstafel, of gebruik de chatbot hieronder.`;
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => {
      bestanden.push({ name: file.name, size: file.size, mimeType: file.type, data: reader.result.split(',')[1] });
      toonBestanden();
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
});
$('r-plan-go').addEventListener('click', async () => {
  $('r-plan-error').textContent = '';
  if (!bestanden.length) return ($('r-plan-error').textContent = 'Kies eerst je handleiding of jaarplan.');
  $('r-plan-go').disabled = true;
  $('r-plan-busy').textContent = `${Ui.ai} leest de handleiding… dit kan een minuut duren.`;
  const res = await emit('reeks-plan-ai', { prompt: planPrompt(), files: bestanden.map(({ mimeType, data }) => ({ mimeType, data })) });
  $('r-plan-go').disabled = false;
  $('r-plan-busy').textContent = '';
  if (res.error) return ($('r-plan-error').textContent = res.error);
  zetPlan(res);
});

// ---------- Voortgang ----------

let tekenGepland = false;
function teken() {
  if (tekenGepland) return;
  tekenGepland = true;
  requestAnimationFrame(() => {
    tekenGepland = false;
    tekenNu();
  });
}

function tekenNu() {
  const alle = lessen();
  const soorten = wil();
  const af = alle.filter(l => soorten.length && soorten.every(s => klaar(l, s))).length;
  const blokken = new Set(alle.map(l => l.map)).size;
  $('r-telling').textContent = alle.length
    ? `${alle.length} ${alle.length === 1 ? 'les' : 'lessen'} in ${blokken} ${blokken === 1 ? 'map' : 'mappen'} · ${af} klaar`
    : '';
  const doos = $('r-voortgang');
  doos.innerHTML = '';
  let map = null;
  let lijst = null;
  for (const les of alle) {
    if (les.map !== map) {
      map = les.map;
      const kop = document.createElement('h4');
      kop.textContent = `📁 ${map.replace('/', ' › ')}`;
      lijst = document.createElement('ul');
      doos.append(kop, lijst);
    }
    const li = document.createElement('li');
    const naam = document.createElement('span');
    naam.className = 'r-les';
    naam.textContent = les.titel;
    li.appendChild(naam);
    for (const s of soorten) {
      const chip = document.createElement('span');
      const ok = klaar(les, s);
      const nu = huidig && huidig.map === les.map && huidig.titel === les.titel && !ok;
      const fout = !ok && !nu && fouten[les.map + les.titel];
      chip.className = `r-chip${ok ? ' ok' : nu ? ' nu' : fout ? ' fout' : ''}`;
      chip.textContent = `${s === 'quiz' ? 'Quiz' : 'Oefenblad'} ${ok ? '✓' : nu ? '…' : fout ? '✗' : '○'}`;
      li.appendChild(chip);
    }
    const fout = fouten[les.map + les.titel];
    if (fout && nodig(les).length) {
      const p = document.createElement('small');
      p.className = 'error';
      p.textContent = fout;
      li.appendChild(p);
    }
    lijst.appendChild(li);
  }
}

// ---------- Onthouden op deze pc ----------

const VELDEN = ['r-vak', 'r-level', 'r-lessen', 'r-quiz', 'r-vragen', 'r-blad', 'r-oef', 'r-drie', 'r-extra', 'r-per'];
function onthoud() {
  const data = {};
  for (const id of VELDEN) data[id] = $(id).type === 'checkbox' ? $(id).checked : $(id).value;
  try { localStorage.setItem(BEWAAR, JSON.stringify(data)); } catch {}
}
let opgeslagen = null;
try { opgeslagen = JSON.parse(localStorage.getItem(BEWAAR) || 'null'); } catch {}
if (opgeslagen) {
  for (const id of VELDEN) {
    if (!(id in opgeslagen)) continue;
    if ($(id).type === 'checkbox') $(id).checked = !!opgeslagen[id];
    else $(id).value = opgeslagen[id];
  }
} else {
  // Het niveau staat meteen op het leerjaar van de klas.
  socket.emit('klas-get', null, res => {
    const lj = res && res.klas && res.klas.leerjaar;
    const naam = /^\d$/.test(String(lj)) ? `${lj}e leerjaar` : '';
    if ([...$('r-level').options].some(o => o.value === naam)) $('r-level').value = naam;
  });
}
for (const id of VELDEN) {
  $(id).addEventListener('input', () => { onthoud(); teken(); });
  $(id).addEventListener('change', () => { onthoud(); teken(); });
}
teken();
