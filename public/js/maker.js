// Quizmaker: prompt voor een chatbot maken, het antwoord inlezen en de vragen bewerken.
// Gebruikt socket, $, esc, show en loadQuiz uit host.js.

let editingFile = null;
// Waar de maker en de editor naar teruggaan: het Toernooi ('idle') of de quizbibliotheek.
let quizBase = 'idle';

// Toegevoegde lesstof: { name, mimeType, data (base64), size }
let sources = [];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

// forGemini: de lesstof gaat via LANcelot mee naar Gemini. Anders voegt de leerkracht hem zelf toe in de chatbot.
// De leerplandoelen waarover de AI vragen maakt (mag leeg). Elke vraag krijgt een van die doelen.
const makerDoel = DoelKies.multi({
  // Het niveau volgt het leerjaar van de doelen.
  onChange: codes => {
    const doel = DoelKies.find(codes[0]);
    if (doel) $('m-level').value = DoelKies.naam(doel.leerjaar);
    updatePrompt();
  },
});
$('m-doel').appendChild(makerDoel);

// Een quiz heeft één niveau (standaard Schildknaap). Page en Ridder kies je bewust.
// "drie": elke vraag op de drie niveaus, met "niveau" per vraag, zoals Per leerling het gebruikt.
const QUIZ_NIVEAU = {
  page: 'Niveau Page (met hulp): eenvoudiger en kortere vragen, met een tip of voorbeeld in de vraag waar dat helpt, en foute antwoorden die duidelijk fout zijn.',
  ridder: 'Niveau Ridder (uitdaging): moeilijkere vragen waarbij de leerling de leerstof toepast in een nieuwe situatie of meerdere denkstappen zet.',
};

function withDoel(quiz) {
  // Elke vraag krijgt het gekozen niveau. Op drie niveaus houdt elke vraag het niveau van de AI (zonder: Schildknaap),
  // en staan de vragen per niveau bij elkaar: eerst Page, dan Schildknaap, dan Ridder.
  const niveau = $('m-niveau').value;
  for (const q of quiz.questions) q.niveau = q.niveau || (niveau === 'drie' ? 'schildknaap' : niveau);
  if (niveau === 'drie') quiz.questions.sort((a, b) => Niveau.LIST.indexOf(a.niveau) - Niveau.LIST.indexOf(b.niveau));
  DoelKies.apply(quiz.questions, makerDoel.codes());
  return quiz;
}

function buildPrompt(forGemini = false) {
  const hasSources = forGemini ? sources.length > 0 : $('m-attach').checked;
  const codes = makerDoel.codes();
  const doel = DoelKies.find(codes[0]);
  const topic = $('m-topic').value.trim() || (doel ? doel.cluster : '') || (hasSources ? 'de bijgevoegde lesstof' : '[ONDERWERP]');
  const level = $('m-level').value;
  const niveau = $('m-niveau').value;
  const drie = niveau === 'drie';
  // Op drie niveaus is het aantal per niveau; samen blijft het onder de 100 vragen per quiz.
  const count = Math.min(drie ? 30 : 40, Math.max(3, Number($('m-count').value) || 10));
  const time = Math.min(120, Math.max(5, Number($('m-time').value) || 20));
  const extra = $('m-extra').value.trim();
  return `Je bent een ervaren leerkracht in Vlaanderen. Maak een quiz voor leerlingen uit: ${level} (Belgisch onderwijs). Onderwerp: ${topic}.
${DoelKies.prompt(codes, 'vragen')}${hasSources ? '\nBaseer alle vragen op de bijgevoegde lesstof. Vraag alleen naar dingen die daarin staan.\n' : ''}${extra ? `\nExtra wensen van de docent:\n${extra}\n` : ''}
Regels:
- Maak precies ${drie ? `${count} meerkeuzevragen per niveau, dus ${count * 3} vragen samen,` : `${count} meerkeuzevragen`} in het Nederlands zoals in Vlaanderen.
- Elke vraag heeft 4 antwoorden (bij een waar/niet waar-vraag 2), met precies één goed antwoord.
- Zet het goede antwoord niet steeds op dezelfde plek.
- De foute antwoorden zijn typische fouten of misvattingen van leerlingen (bijvoorbeeld een rekenfout die vaak gemaakt wordt, of een begrip dat ze vaak verwarren). Zo zie ik achteraf welke denkfout er zit. Geen onzinantwoorden, en duidelijk fout voor wie de stof kent.
- Wissel af: kennis (feiten en begrippen die ze moeten kennen), begrip (waarom of hoe) en toepassen in een korte, herkenbare situatie.
- Geef elke vraag een korte uitleg ("uitleg", hooguit 200 tekens) die de leerling ziet na een fout antwoord: leg de regel of de redenering uit, niet enkel het antwoord herhalen.
- Bij een rekenvraag waarvan het antwoord één getal is (zoals 3,75 of 12 cm of 3/4): zet "typ": "getal". De leerling typt dan zelf het getal. Zet het juiste getal ook bij de antwoorden, en als foute antwoorden de getallen die je krijgt bij typische rekenfouten. Bij andere vragen laat je "typ" weg.
- Gebruik de Belgische schrijfwijze en context: komma als decimaalteken, euro, Belgische namen en plaatsen, Vlaamse woorden.
- Houd vragen kort (hooguit 120 tekens) en antwoorden heel kort (hooguit 60 tekens).
- Pas de moeilijkheid en het taalgebruik aan het niveau ${level} aan.
- Controleer op het einde elke vraag: reken het antwoord opnieuw na, kijk of precies één antwoord juist is en of "correct" naar dat antwoord wijst.
${QUIZ_NIVEAU[niveau] ? `- ${QUIZ_NIVEAU[niveau]}\n` : ''}${drie ? `\n${Niveau.prompt(level, 'vragen')}\nGeef elke vraag het veld "niveau" met "page", "schildknaap" of "ridder". Zet eerst alle Page-vragen, dan Schildknaap, dan Ridder.\n` : ''}
Belangrijk: maak GEEN interactieve quiz, app, webpagina of canvas en schrijf geen code. Ik heb enkel de gegevens nodig als tekst.
Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat:
{
  "title": "korte titel van de quiz",
  "questions": [
    { "question": "de vraag", "answers": ["antwoord A", "antwoord B", "antwoord C", "antwoord D"], "correct": 0, "time": ${time}, "uitleg": "waarom het juiste antwoord juist is"${drie ? ', "niveau": "page"' : ''}${codes.length > 1 ? ', "doel": "code van het doel"' : ''} }
  ]
}
"correct" is het nummer van het goede antwoord, geteld vanaf 0 (0 = eerste antwoord, 3 = vierde antwoord).`;
}

function updatePrompt() {
  const drie = $('m-niveau').value === 'drie';
  $('m-count-label').textContent = drie ? 'Vragen per niveau' : 'Aantal vragen';
  $('m-drie-note').classList.toggle('hidden', !drie);
  $('m-prompt').value = buildPrompt();
  $('m-copied').textContent = '';
  $('m-attach-note').classList.toggle('hidden', !$('m-attach').checked);
}

function renderSources() {
  const list = $('m-file-list');
  list.innerHTML = '';
  sources.forEach((src, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span></span><button class="secondary" title="Verwijderen">✕</button>`;
    li.querySelector('span').textContent = `${src.name} (${Math.ceil(src.size / 1024)} kB)`;
    li.querySelector('button').addEventListener('click', () => {
      sources.splice(i, 1);
      renderSources();
    });
    list.appendChild(li);
  });
  updatePrompt();
}

function addSource(file) {
  if (!/^image\/|^application\/pdf$/.test(file.type)) {
    $('m-error').textContent = `${file.name}: alleen afbeeldingen en pdf's kunnen als lesstof.`;
    return;
  }
  const total = sources.reduce((sum, s) => sum + s.size, 0) + file.size;
  if (total > MAX_SOURCE_BYTES) {
    $('m-error').textContent = 'De lesstof is samen groter dan 15 MB. Kies minder of kleinere bestanden.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    sources.push({ name: file.name, mimeType: file.type, size: file.size, data: reader.result.split(',')[1] });
    renderSources();
  };
  reader.readAsDataURL(file);
}

$('m-files').addEventListener('change', e => {
  $('m-error').textContent = '';
  [...e.target.files].forEach(addSource);
  e.target.value = '';
});

// Screenshot plakken met Ctrl+V terwijl de quizmaker open staat.
document.addEventListener('paste', e => {
  if (view !== 'maker' || !hasKey || e.target.id === 'm-answer') return;
  const files = [...(e.clipboardData?.files || [])];
  if (files.length === 0) return;
  e.preventDefault();
  files.forEach((f, i) => addSource(new File([f], f.name === 'image.png' ? `screenshot-${sources.length + i + 1}.png` : f.name, { type: f.type })));
});

let hasKey = false;

for (const id of ['m-topic', 'm-level', 'm-count', 'm-time', 'm-extra', 'm-attach', 'm-niveau']) {
  $(id).addEventListener('input', updatePrompt);
}

function openMaker() {
  sources = [];
  $('m-attach').checked = false;
  renderSources();
  $('m-error').textContent = '';
  // Het niveau staat meteen op het leerjaar van de klas; de leerkracht kan het nog veranderen.
  DoelKies.leerjaar(lj => {
    if (!makerDoel.codes().length) {
      $('m-level').value = DoelKies.naam(lj);
      updatePrompt();
    }
  });
  show('maker');
}
const openEmpty = () => openEditor({ title: '', questions: [emptyQuestion()] }, null);
const vanuit = (base, fn) => () => { quizBase = base; fn(); };

$('new-ai').addEventListener('click', vanuit('idle', openMaker));
$('new-empty').addEventListener('click', vanuit('idle', openEmpty));
$('lib-new-ai').addEventListener('click', vanuit('bibliotheek', openMaker));
$('lib-new-empty').addEventListener('click', vanuit('bibliotheek', openEmpty));
// Startscherm: meteen een nieuwe quiz maken, of naar de bibliotheek. Na het bewaren kom je in de bibliotheek.
$('home-quizzen').addEventListener('click', () => show('bibliotheek'));

// Vanuit een ander spel een quiz maken: daarna gaan we daar weer naartoe.
const params = new URLSearchParams(location.search);
// Elk spel met een knop 'Nieuwe quiz' moet hier staan, anders opent de quizmaker niet.
const GAMES = ['/toren', '/schattenjacht', '/laserslag', '/ridderrace', '/kristalroof', '/verrader', '/burchtbouwers', '/duel', '/packnight', '/strijdrossen', '/gauntlet', '/ridder-royale', '/sterrenvreter', '/ridderslang', '/burchtstorm', '/poortwacht', '/neonvlucht', '/diepboor', '/pixelridder', '/robomol', '/kerker', '/hofschilder', '/robopaarden', '/neonduel', '/leraarbaas', '/cybergalaga', '/bomberknight', '/rijk'];
const returnTo = GAMES.includes(params.get('terug')) ? params.get('terug') : null;

for (const b of document.querySelectorAll('[data-back]')) {
  b.addEventListener('click', () => {
    if (returnTo && ['maker', 'editor'].includes(view)) location.href = returnTo;
    else show(b.dataset.back || quizBase);
  });
}

function copyPrompt() {
  if (!Ui.kopieer($('m-prompt').value)) {
    $('m-prompt').select();
    $('m-copied').textContent = 'Kopiëren lukte niet. Klik in de prompt hieronder, druk Ctrl+A en dan Ctrl+C.';
    return;
  }
  promptCopied = true;
  lastClipboard = $('m-prompt').value;
  $('m-copied').textContent = 'Gekopieerd! Plak hem in de chatbot, kopieer het antwoord (de kopieerknop van het codeblok) en kom hier terug.';
}

$('m-copy').addEventListener('click', copyPrompt);

for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    // Eerst kopiëren (de pagina heeft dan nog de focus), dan pas het tabblad openen.
    copyPrompt();
    window.open(b.dataset.url, '_blank', 'noopener');
  });
}

function parseAnswer(text, quiet) {
  socket.emit('parse', text, res => {
    if (res.error) {
      if (!quiet) $('m-error').textContent = res.error;
      return;
    }
    $('m-error').textContent = '';
    $('m-answer').value = '';
    openEditor(withDoel(res.quiz), null);
  });
}

$('m-parse').addEventListener('click', () => parseAnswer($('m-answer').value, false));

// Plakken in het antwoordvak: meteen controleren, zonder op de knop te drukken.
$('m-answer').addEventListener('paste', () => {
  setTimeout(() => parseAnswer($('m-answer').value, false), 0);
});

// Terug uit de chatbot? Dan kijken we of het gekopieerde antwoord al op het klembord staat.
// De browser vraagt hier de eerste keer toestemming voor; zonder toestemming blijft plakken werken.
let promptCopied = false;
let lastClipboard = '';

async function checkClipboard() {
  if (view !== 'maker' || !promptCopied || !navigator.clipboard?.readText) return;
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return;
  }
  if (!text || text === lastClipboard || text === $('m-prompt').value || !text.includes('"questions"')) return;
  lastClipboard = text;
  $('m-copied').textContent = 'Antwoord van de AI gevonden op het klembord!';
  parseAnswer(text, false);
}

window.addEventListener('focus', checkClipboard);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkClipboard();
});

function editQuiz(file) {
  socket.emit('open-quiz', file, res => {
    if (res.error) {
      $(quizBase === 'bibliotheek' ? 'lib-error' : 'load-error').textContent = res.error;
      return;
    }
    openEditor(res.quiz, file);
  });
}

// --- Editor ---

function emptyQuestion() {
  return { question: '', answers: ['', '', '', ''], correct: 0, time: 20 };
}

function openEditor(quiz, file) {
  editingFile = file;
  $('e-heading').textContent = file ? 'Quiz bewerken' : 'Nieuwe quiz controleren';
  $('e-title').value = quiz.title;
  $('e-questions').innerHTML = '';
  quiz.questions.forEach(addQuestion);
  showNiveaus();
  $('e-error').textContent = '';
  // Opslaan en spelen start het Toernooi: dat kan alleen vanuit het Toernooi.
  $('e-play').classList.toggle('hidden', !!returnTo || quizBase !== 'idle');
  show('editor');
}

// Heeft de quiz vragen op meer dan één niveau? Dan tonen we hoeveel per niveau, en het niveau bij elke vraag.
function showNiveaus() {
  const els = [...$('e-questions').children];
  const count = {};
  for (const el of els) count[el.querySelector('.q-niveau').value] = (count[el.querySelector('.q-niveau').value] || 0) + 1;
  const used = Niveau.LIST.filter(n => count[n]);
  const multi = used.length > 1;
  $('e-niveaus').classList.toggle('hidden', !multi);
  $('e-niveaus').textContent = multi ? `Quiz op ${used.length} niveaus: ${used.map(n => `${Niveau.label(n)} ${count[n]}`).join(' · ')}. Met "👤 Per leerling" krijgt elke leerling de vragen van zijn niveau. In Toernooi, Duel en Het Rijk krijgt iedereen dezelfde vraag, elk in de versie van zijn niveau.` : '';
  els.forEach((el, i) => {
    el.querySelector('.q-number').textContent = `Vraag ${i + 1}${multi ? ` · ${Niveau.label(el.querySelector('.q-niveau').value)}` : ''}`;
  });
}

function renumber() {
  [...$('e-questions').children].forEach((el, i) => {
    for (const r of el.querySelectorAll('input[type=radio]')) r.name = `correct-${i}`;
  });
  showNiveaus();
}

function addQuestion(q) {
  const el = document.createElement('div');
  el.className = 'panel form question-edit';
  const answers = [0, 1, 2, 3].map(i => `
    <label class="answer-edit a${i}">
      <input type="radio" value="${i}" ${q.correct === i ? 'checked' : ''} title="Dit is het goede antwoord">
      <input class="a-text" maxlength="120" placeholder="Antwoord ${i + 1}${i > 1 ? ' (mag leeg)' : ''}" value="${esc(q.answers[i] || '')}">
    </label>`).join('');
  el.innerHTML = `
    <div class="bar">
      <strong class="q-number"></strong>
      <div class="actions">
        <label class="inline">Niveau <select class="q-niveau">${Niveau.LIST.map(n => `<option value="${n}"${(q.niveau || 'schildknaap') === n ? ' selected' : ''}>${Niveau.label(n)}</option>`).join('')}</select></label>
        <label class="inline">Seconden <input class="q-time" type="number" min="5" max="120" value="${q.time}"></label>
        <button class="secondary q-delete" title="Vraag verwijderen">✕</button>
      </div>
    </div>
    <textarea class="q-text" rows="2" maxlength="250" placeholder="De vraag">${esc(q.question)}</textarea>
    <p class="muted small">Klik het rondje aan bij het goede antwoord.</p>
    <div class="answers">${answers}</div>
    <label class="q-uitleg-veld">Uitleg na een fout antwoord (waarom is het juiste antwoord juist?)
      <input class="q-uitleg" maxlength="220" placeholder="bv. Je deelt teller en noemer door hetzelfde getal, dus 4/8 = 1/2." value="${esc(q.uitleg || '')}">
    </label>
    <label class="inline q-getal-veld"><input type="checkbox" class="q-getal" ${q.typ === 'getal' ? 'checked' : ''}> Leerlingen typen het getal zelf (het goede antwoord moet een getal zijn)</label>`;
  el.appendChild(DoelKies.field(q.doel));
  el.querySelector('.q-niveau').addEventListener('change', showNiveaus);
  el.querySelector('.q-delete').addEventListener('click', () => {
    el.remove();
    renumber();
  });
  $('e-questions').appendChild(el);
  renumber();
}

$('e-add').addEventListener('click', () => {
  // Een nieuwe vraag oefent meestal hetzelfde doel als de vorige.
  const last = $('e-questions').lastElementChild;
  addQuestion({ ...emptyQuestion(), doel: last ? DoelKies.read(last.querySelector('.doel-veld')) : '', niveau: last ? last.querySelector('.q-niveau').value : '' });
  $('e-questions').lastElementChild.querySelector('.q-text').focus();
});

// Leest de quiz uit het formulier. Lege antwoorden vallen weg.
function readEditor() {
  const questions = [...$('e-questions').children].map((el, i) => {
    const texts = [...el.querySelectorAll('.a-text')].map(a => a.value.trim());
    const checked = Number(el.querySelector('input[type=radio]:checked')?.value ?? -1);
    if (checked < 0 || !texts[checked]) throw new Error(`Vraag ${i + 1}: kies een goed antwoord dat niet leeg is.`);
    const answers = [];
    let correct = 0;
    texts.forEach((t, j) => {
      if (!t) return;
      if (j === checked) correct = answers.length;
      answers.push(t);
    });
    return { question: el.querySelector('.q-text').value, answers, correct, time: Number(el.querySelector('.q-time').value), niveau: el.querySelector('.q-niveau').value, doel: DoelKies.read(el.querySelector('.doel-veld')),
      uitleg: el.querySelector('.q-uitleg').value.trim(), typ: el.querySelector('.q-getal').checked ? 'getal' : '' };
  });
  return { title: $('e-title').value, questions };
}

function saveEditor(play) {
  let quiz;
  try {
    quiz = readEditor();
  } catch (err) {
    $('e-error').textContent = err.message;
    return;
  }
  socket.emit('save', { quiz, file: editingFile }, res => {
    if (res.error) {
      $('e-error').textContent = res.error;
      return;
    }
    editingFile = res.file;
    if (returnTo) {
      location.href = returnTo;
      return;
    }
    show(quizBase);
    if (play && quizBase === 'idle') loadQuiz(res.file);
  });
}

$('e-save').addEventListener('click', () => saveEditor(false));
$('e-play').addEventListener('click', () => saveEditor(true));

// --- Instellingen en de eigen AI-sleutel ---

// Wat elke AI-dienst nodig heeft: waar je een sleutel haalt, wat het kost en welke modellen er zijn.
const DIENST_INFO = {
  gemini: {
    uitleg: 'Een sleutel maak je gratis aan op <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Zolang je daar geen betaalgegevens koppelt, kost het niets; er geldt dan een gratis daglimiet.',
    modellen: ['auto'],
    model: 'Laat op <strong>auto</strong> staan: LANcelot kiest dan zelf een werkend Gemini-model, ook als Google oude modellen stopzet.',
  },
  claude: {
    uitleg: 'Een sleutel maak je op <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Je betaalt per gebruik met tegoed dat je vooraf koopt: één quiz kost ongeveer 2 tot 10 cent. Een gewoon Claude Pro-abonnement telt hier niet.',
    modellen: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    model: '<strong>claude-opus-5-5</strong> is het sterkst. Goedkoper: claude-sonnet-5-5 (ongeveer de helft) of claude-haiku-5-5 (minder dan 1 cent per quiz).',
  },
  openai: {
    uitleg: 'Een sleutel maak je op <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a>. Je betaalt per gebruik met tegoed dat je vooraf koopt: één quiz kost ongeveer 2 tot 5 cent. Een gewoon ChatGPT Plus-abonnement telt hier niet.',
    modellen: ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna'],
    model: '<strong>gpt-6.1-sol</strong> is een goede keuze. Goedkoper: gpt-6-luna (minder dan 1 cent per quiz).',
  },
};
const VELDEN = { gemini: ['geminiKey', 'geminiModel'], claude: ['claudeKey', 'claudeModel'], openai: ['openaiKey', 'openaiModel'] };
let aiSettings = null;

function toonDienst() {
  if (!aiSettings) return;
  const id = $('s-dienst').value;
  const d = aiSettings.diensten[id];
  const info = DIENST_INFO[id];
  $('s-uitleg').innerHTML = info.uitleg;
  $('s-model-uitleg').innerHTML = `${info.model} ${id === 'gemini' && aiSettings.geminiAutoModel ? `Nu in gebruik: ${aiSettings.geminiAutoModel}.` : ''}`;
  $('s-modellen').innerHTML = info.modellen.map(m => `<option value="${m}">`).join('');
  $('s-model').value = d.model;
  $('s-model').placeholder = info.modellen[0];
  const actief = id === aiSettings.aiDienst ? ' Deze AI wordt nu gebruikt.' : '';
  $('s-status').textContent = d.hasKey ? `Er is een ${d.naam}-sleutel opgeslagen (${d.keyHint}).${actief}` : `Er is nog geen ${d.naam}-sleutel opgeslagen.${actief}`;
  $('s-remove').classList.toggle('hidden', !d.hasKey);
}

socket.on('settings', s => {
  aiSettings = s;
  Ui.zetAi(s);
  if (document.activeElement !== $('s-dienst')) $('s-dienst').value = s.aiDienst;
  toonDienst();
  $('m-gemini-panel').classList.toggle('hidden', !s.hasKey);
  hasKey = s.hasKey;
  updatePrompt();
});

$('s-dienst').addEventListener('change', () => {
  $('s-key').value = '';
  $('s-error').textContent = '';
  toonDienst();
});

$('open-settings').addEventListener('click', () => {
  $('s-key').value = '';
  $('s-error').textContent = '';
  if (aiSettings) $('s-dienst').value = aiSettings.aiDienst;
  toonDienst();
  show('settings');
});

function saveSettings(changes) {
  socket.emit('save-settings', changes, res => {
    $('s-error').textContent = res.error || '';
    if (!res.error) $('s-key').value = '';
  });
}

$('s-save').addEventListener('click', () => {
  const id = $('s-dienst').value;
  const [key, model] = VELDEN[id];
  const changes = { aiDienst: id, [model]: $('s-model').value };
  if ($('s-key').value.trim()) changes[key] = $('s-key').value;
  saveSettings(changes);
});

$('s-remove').addEventListener('click', async () => {
  const id = $('s-dienst').value;
  if (await Ui.vraag(`De ${aiSettings.diensten[id].naam}-sleutel verwijderen van deze pc?`)) saveSettings({ [VELDEN[id][0]]: '' });
});

$('m-gemini').addEventListener('click', () => {
  const button = $('m-gemini');
  button.disabled = true;
  $('m-gemini-error').textContent = '';
  $('m-gemini-busy').textContent = `${Ui.ai} is bezig, dit duurt meestal 10 tot 60 seconden…`;
  const files = sources.map(({ mimeType, data }) => ({ mimeType, data }));
  socket.emit('generate', { prompt: buildPrompt(true), files }, res => {
    button.disabled = false;
    $('m-gemini-busy').textContent = '';
    if (res.error) {
      $('m-gemini-error').textContent = res.error;
      return;
    }
    openEditor(withDoel(res.quiz), null);
  });
});

if (returnTo) {
  $('e-play').classList.add('hidden');
  $('e-save').textContent = 'Opslaan en terug';
  $('e-save').classList.remove('secondary');
  if (params.get('maak') === 'ai') $('new-ai').click();
  else if (params.get('maak') === 'leeg') $('new-empty').click();
  else if (params.get('bewerk')) editQuiz(params.get('bewerk'));
}

// Het startpakket 6e leerjaar: tonen zolang er quizzen of oefenbladen uit het pakket nog niet bij de leerkracht staan.
function startpakketStatus() {
  socket.emit('startpakket-status', null, res => {
    if (!res || !res.ok) return;
    $('startpakket').classList.toggle('hidden', !res.nieuw);
    $('sp-tekst').textContent = `${res.nieuw} kant-en-klare quizzen en oefenbladen bij Op.stap-doelen (breuken en procenten, deelbaarheid, schaal, oppervlakte, werkwoorden, Europa, WO II), met uitleg bij elke vraag. Ze komen in de map "Startpakket 6e leerjaar".`;
  });
}
$('sp-knop').addEventListener('click', () => {
  $('sp-knop').disabled = true;
  socket.emit('startpakket-installeer', null, res => {
    $('sp-knop').disabled = false;
    if (!res || res.error) return Ui.melding(res ? res.error : 'Dat lukte niet.');
    $('startpakket').classList.add('hidden');
    Ui.melding(`${res.erbij} quizzen en oefenbladen staan nu in de map "${res.map}".`);
  });
});
socket.on('connect', startpakketStatus);
startpakketStatus();
