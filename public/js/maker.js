// Quizmaker: prompt voor een chatbot maken, het antwoord inlezen en de vragen bewerken.
// Gebruikt socket, $, esc, show en loadQuiz uit host.js.

let editingFile = null;

function buildPrompt() {
  const topic = $('m-topic').value.trim() || '[ONDERWERP]';
  const level = $('m-level').value;
  const count = Math.min(40, Math.max(3, Number($('m-count').value) || 10));
  const time = Math.min(120, Math.max(5, Number($('m-time').value) || 20));
  const extra = $('m-extra').value.trim();
  return `Je bent een ervaren docent. Maak een quiz voor leerlingen van ${level} over: ${topic}.
${extra ? `\nExtra wensen van de docent:\n${extra}\n` : ''}
Regels:
- Maak precies ${count} meerkeuzevragen in het Nederlands.
- Elke vraag heeft 4 antwoorden (bij een waar/niet waar-vraag 2), met precies één goed antwoord.
- Zet het goede antwoord niet steeds op dezelfde plek.
- De foute antwoorden zijn geloofwaardig, maar duidelijk fout voor wie de stof kent.
- Houd vragen kort (hooguit 120 tekens) en antwoorden heel kort (hooguit 60 tekens).
- Pas de moeilijkheid en het taalgebruik aan het niveau ${level} aan.

Geef ALLEEN de JSON terug, zonder uitleg ervoor of erna, precies in dit formaat:
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
}

for (const id of ['m-topic', 'm-level', 'm-count', 'm-time', 'm-extra']) {
  $(id).addEventListener('input', updatePrompt);
}

$('new-ai').addEventListener('click', () => {
  updatePrompt();
  $('m-error').textContent = '';
  show('maker');
});

$('new-empty').addEventListener('click', () => {
  openEditor({ title: '', questions: [emptyQuestion()] }, null);
});

for (const b of document.querySelectorAll('[data-back]')) {
  b.addEventListener('click', () => show('idle'));
}

$('m-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('m-prompt').value);
  } catch {
    $('m-prompt').select();
    document.execCommand('copy');
  }
  $('m-copied').textContent = 'Gekopieerd! Plak hem nu in de chatbot.';
});

$('m-parse').addEventListener('click', () => {
  socket.emit('parse', $('m-answer').value, res => {
    if (res.error) {
      $('m-error').textContent = res.error;
      return;
    }
    $('m-error').textContent = '';
    $('m-answer').value = '';
    openEditor(res.quiz, null);
  });
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
