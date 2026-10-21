const SHAPES = ['▲', '◆', '●', '■'];
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let deadline = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let view = 'idle';

function show(name) {
  view = name;
  for (const s of ['idle', 'settings', 'maker', 'editor', 'lobby', 'question', 'podium']) $(s).classList.toggle('hidden', s !== name);
}

function loadQuiz(file) {
  socket.emit('load', file, res => {
    $('load-error').textContent = res.error || '';
  });
}

socket.on('quizzes', list => {
  const box = $('quiz-list');
  box.innerHTML = '';
  if (list.length === 0) box.innerHTML = '<p class="muted">Nog geen quizzen. Maak er een met de knoppen hierboven.</p>';
  for (const q of list) {
    const row = document.createElement('div');
    row.className = 'quiz-row';
    row.innerHTML = `<button class="play">${esc(q.title)} <span class="muted">· ${q.count} vragen</span></button>
      <button class="secondary edit">Bewerken</button>
      <button class="secondary delete" title="Verwijderen">✕</button>`;
    row.querySelector('.play').addEventListener('click', () => loadQuiz(q.file));
    row.querySelector('.edit').addEventListener('click', () => editQuiz(q.file));
    row.querySelector('.delete').addEventListener('click', () => {
      if (!confirm(`"${q.title}" verwijderen?`)) return;
      socket.emit('delete', q.file, res => { $('load-error').textContent = res.error || ''; });
    });
    box.appendChild(row);
  }
});

// Het eerste adres is meestal het goede. Klik op een ander adres om de QR-code daarvoor te tonen.
function showAddress(list, i) {
  const main = list[i];
  $('join-url').textContent = main ? main.url : 'Geen netwerk gevonden';
  $('qr').innerHTML = main ? main.qr : '';
  const others = $('other-urls');
  others.innerHTML = '';
  list.forEach((a, j) => {
    if (j === i) return;
    if (!others.textContent) others.append('Werkt dit niet? Probeer ');
    else others.append(' of ');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = a.url;
    link.addEventListener('click', e => { e.preventDefault(); showAddress(list, j); });
    others.append(link);
  });
}

socket.on('addresses', list => showAddress(list, 0));

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = `${n} ${n === 1 ? 'speler' : 'spelers'}`;
  $('start').disabled = n === 0;
  $('names').innerHTML = '';
  for (const p of state.ranking) {
    const el = document.createElement('span');
    el.className = 'name';
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('kick', p.id));
    $('names').appendChild(el);
  }
}

function renderQuestion() {
  const q = state.question;
  const revealed = state.phase === 'reveal';
  $('q-progress').textContent = `Vraag ${state.index + 1} van ${state.total}`;
  $('q-text').textContent = q.question;
  $('q-answered').textContent = `${state.answered} / ${state.ranking.length} geantwoord`;
  $('q-answers').innerHTML = q.answers.map((a, i) => {
    const dim = revealed && i !== state.correct ? ' dim' : '';
    const count = revealed ? `<span class="count">${state.counts[i]}</span>` : '';
    return `<div class="answer a${i}${dim}"><span class="shape">${SHAPES[i]}</span>${esc(a)}${count}</div>`;
  }).join('');
  $('reveal').classList.toggle('hidden', revealed);
  $('next').classList.toggle('hidden', !revealed);
  $('next').textContent = state.index + 1 >= state.total ? 'Naar de eindstand' : 'Volgende vraag';
  $('timer').classList.toggle('hidden', revealed);
  $('top').classList.toggle('hidden', !revealed);
  $('top').innerHTML = state.ranking.slice(0, 5)
    .map(p => `<li><span>${esc(p.name)}</span><span>${p.score}</span></li>`).join('');
  if (!revealed) deadline = Date.now() + state.remaining;
}

function renderPodium() {
  const [p1, p2, p3] = state.ranking;
  const block = (p, cls) => p ? `<div class="${cls}">${esc(p.name)}<br>${p.score}</div>` : '';
  $('podium-blocks').innerHTML = block(p2, 'p2') + block(p1, 'p1') + block(p3, 'p3');
  $('final').innerHTML = state.ranking.slice(3)
    .map((p, i) => `<li><span>${i + 4}. ${esc(p.name)}</span><span>${p.score}</span></li>`).join('');
}

socket.on('state', s => {
  state = s;
  $('status').textContent = s.title || '';
  // In de quizmaker blijven we staan; anders terug naar de quizlijst.
  if (s.phase === 'idle' && !['settings', 'maker', 'editor'].includes(view)) show('idle');
  if (s.phase === 'lobby') { renderLobby(); show('lobby'); }
  if (s.phase === 'question' || s.phase === 'reveal') { renderQuestion(); show('question'); }
  if (s.phase === 'podium') { renderPodium(); show('podium'); }
});

setInterval(() => {
  if (state && state.phase === 'question') {
    $('timer').textContent = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }
}, 200);

$('start').addEventListener('click', () => socket.emit('start'));
$('reveal').addEventListener('click', () => socket.emit('reveal'));
$('next').addEventListener('click', () => socket.emit('next'));
$('restart').addEventListener('click', () => socket.emit('restart'));
$('close').addEventListener('click', () => socket.emit('close'));
