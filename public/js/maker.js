// Quizmaker: prompt voor een chatbot maken, het antwoord inlezen en de vragen bewerken.
// Gebruikt socket, $, esc, show en loadQuiz uit host.js.

let editingFile = null;

// Toegevoegde lesstof: { name, mimeType, data (base64), size }
let sources = [];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

function buildPrompt() {
  const hasSources = sources.length > 0;
  const topic = $('m-topic').value.trim() || (hasSources ? 'de bijgevoegde lesstof' : '[ONDERWERP]');
  const level = $('m-level').value;
  const count = Math.min(40, Math.max(3, Number($('m-count').value) || 10));
  const time = Math.min(120, Math.max(5, Number($('m-time').value) || 20));
  const extra = $('m-extra').value.trim();
  return `Je bent een ervaren leerkracht in Vlaanderen. Maak een quiz voor leerlingen uit: ${level} (Belgisch onderwijs). Onderwerp: ${topic}.
${hasSources ? `\nBaseer alle vragen op de bijgevoegde lesstof (${sources.length === 1 ? 'het bijgevoegde bestand' : `de ${sources.length} bijgevoegde bestanden`}). Vraag alleen naar dingen die daarin staan.\n` : ''}${extra ? `\nExtra wensen van de docent:\n${extra}\n` : ''}
Regels:
- Maak precies ${count} meerkeuzevragen in het Nederlands zoals in Vlaanderen.
- Elke vraag heeft 4 antwoorden (bij een waar/niet waar-vraag 2), met precies één goed antwoord.
- Zet het goede antwoord niet steeds op dezelfde plek.
- De foute antwoorden zijn geloofwaardig, maar duidelijk fout voor wie de stof kent.
- Houd vragen kort (hooguit 120 tekens) en antwoorden heel kort (hooguit 60 tekens).
- Pas de moeilijkheid en het taalgebruik aan het niveau ${level} aan.

Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat:
{
  "title": "korte titel van de quiz",
  "questions": [
    { "question": "de vraag", "answers": ["antwoord A", "antwoord B", "antwoord C", "antwoord D"], "correct": 0, "time": ${time} }
  ]
}
"correct" is het nummer van het goede antwoord, geteld vanaf 0 (0 = eerste antwoord, 3 = vierde antwoord).`;
}

function updatePrompt() {
  $('m-prompt').value = buildPrompt();
  $('m-copied').textContent = '';
  $('m-attach-note').classList.toggle('hidden', sources.length === 0);
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
  if (view !== 'maker' || e.target.id === 'm-answer') return;
  const files = [...(e.clipboardData?.files || [])];
  if (files.length === 0) return;
  e.preventDefault();
  files.forEach((f, i) => addSource(new File([f], f.name === 'image.png' ? `screenshot-${sources.length + i + 1}.png` : f.name, { type: f.type })));
});

for (const id of ['m-topic', 'm-level', 'm-count', 'm-time', 'm-extra']) {
  $(id).addEventListener('input', updatePrompt);
}

$('new-ai').addEventListener('click', () => {
  sources = [];
  renderSources();
  $('m-error').textContent = '';
  show('maker');
});

$('new-empty').addEventListener('click', () => {
  openEditor({ title: '', questions: [emptyQuestion()] }, null);
});

for (const b of document.querySelectorAll('[data-back]')) {
  b.addEventListener('click', () => show('idle'));
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText($('m-prompt').value);
  } catch {
    $('m-prompt').select();
    document.execCommand('copy');
  }
  promptCopied = true;
  lastClipboard = $('m-prompt').value;
  $('m-copied').textContent = 'Gekopieerd! Plak hem in de chatbot, kopieer het antwoord (de kopieerknop van het codeblok) en kom hier terug.';
}

$('m-copy').addEventListener('click', copyPrompt);

for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    // Het tabblad meteen openen, anders blokkeert de browser het als pop-up.
    window.open(b.dataset.url, '_blank', 'noopener');
    copyPrompt();
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
    openEditor(res.quiz, null);
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
      $('load-error').textContent = res.error;
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
  $('e-error').textContent = '';
  show('editor');
}

function renumber() {
  [...$('e-questions').children].forEach((el, i) => {
    el.querySelector('.q-number').textContent = `Vraag ${i + 1}`;
    for (const r of el.querySelectorAll('input[type=radio]')) r.name = `correct-${i}`;
  });
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
        <label class="inline">Seconden <input class="q-time" type="number" min="5" max="120" value="${q.time}"></label>
        <button class="secondary q-delete" title="Vraag verwijderen">✕</button>
      </div>
    </div>
    <textarea class="q-text" rows="2" maxlength="250" placeholder="De vraag">${esc(q.question)}</textarea>
    <p class="muted small">Klik het rondje aan bij het goede antwoord.</p>
    <div class="answers">${answers}</div>`;
  el.querySelector('.q-delete').addEventListener('click', () => {
    el.remove();
    renumber();
  });
  $('e-questions').appendChild(el);
  renumber();
}

$('e-add').addEventListener('click', () => {
  addQuestion(emptyQuestion());
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
    return { question: el.querySelector('.q-text').value, answers, correct, time: Number(el.querySelector('.q-time').value) };
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
    show('idle');
    if (play) loadQuiz(res.file);
  });
}

$('e-save').addEventListener('click', () => saveEditor(false));
$('e-play').addEventListener('click', () => saveEditor(true));

// --- Instellingen en Gemini ---

socket.on('settings', s => {
  $('s-status').textContent = s.hasKey ? `Er is een sleutel opgeslagen (${s.keyHint}).` : 'Er is nog geen sleutel opgeslagen.';
  $('s-model').value = s.geminiModel;
  $('s-remove').classList.toggle('hidden', !s.hasKey);
  $('m-gemini-panel').classList.toggle('hidden', !s.hasKey);
});

$('open-settings').addEventListener('click', () => {
  $('s-key').value = '';
  $('s-error').textContent = '';
  show('settings');
});

function saveSettings(changes) {
  socket.emit('save-settings', changes, res => {
    $('s-error').textContent = res.error || '';
    if (!res.error) $('s-key').value = '';
  });
}

$('s-save').addEventListener('click', () => {
  const changes = { geminiModel: $('s-model').value };
  if ($('s-key').value.trim()) changes.geminiKey = $('s-key').value;
  saveSettings(changes);
});

$('s-remove').addEventListener('click', () => {
  if (confirm('De Gemini-sleutel verwijderen van deze pc?')) saveSettings({ geminiKey: '' });
});

$('m-gemini').addEventListener('click', () => {
  const button = $('m-gemini');
  button.disabled = true;
  $('m-gemini-error').textContent = '';
  $('m-gemini-busy').textContent = 'Gemini is bezig, dit duurt meestal 10 tot 60 seconden…';
  const files = sources.map(({ mimeType, data }) => ({ mimeType, data }));
  socket.emit('generate', { prompt: buildPrompt(), files }, res => {
    button.disabled = false;
    $('m-gemini-busy').textContent = '';
    if (res.error) {
      $('m-gemini-error').textContent = res.error;
      return;
    }
    openEditor(res.quiz, null);
  });
});
