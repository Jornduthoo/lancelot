const SHAPES = ['▲', '◆', '●', '■'];

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

// Een vaste id per browser, zodat een leerling na een herlaadactie zijn score houdt.
let playerId = store('lancelot-id');
if (!playerId) {
  playerId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  store('lancelot-id', playerId);
}
let myName = store('lancelot-name') || '';

const socket = io();
const $ = id => document.getElementById(id);
const sections = ['idle', 'join', 'lobby', 'question', 'answered', 'reveal', 'podium'];
let joined = false;
let shownIndex = -1;
let autoJoined = false;

function show(name) {
  for (const s of sections) $(s).classList.toggle('hidden', s !== name);
}

function join(name) {
  socket.emit('join', { playerId, name }, res => {
    if (res.error) {
      joined = false;
      $('join-error').textContent = res.error;
      show('join');
      return;
    }
    joined = true;
    myName = res.name;
    store('lancelot-name', myName);
    $('join-error').textContent = '';
    $('me').textContent = myName;
  });
}

$('join').addEventListener('submit', e => {
  e.preventDefault();
  join($('name').value);
});
$('name').value = myName;

function buildButtons(state) {
  const box = $('answer-buttons');
  box.innerHTML = '';
  for (let i = 0; i < state.answerCount; i++) {
    const b = document.createElement('button');
    b.className = `answer a${i}`;
    b.innerHTML = `<span class="shape">${SHAPES[i]}</span><span class="label"></span>`;
    b.querySelector('.label').textContent = state.answers[i];
    b.addEventListener('click', () => {
      socket.emit('answer', i);
      show('answered');
    });
    box.appendChild(b);
  }
}

function render(state) {
  if (!joined || !state.name) {
    show(state.phase === 'idle' ? 'idle' : 'join');
    // Pagina herladen tijdens een quiz: meteen terug in het spel.
    if (state.phase !== 'idle' && myName && !autoJoined) {
      autoJoined = true;
      join(myName);
    }
    return;
  }
  $('me').textContent = `${state.name} · ${state.score} punten`;
  switch (state.phase) {
    case 'lobby':
      show('lobby');
      break;
    case 'question':
      if (state.answered) return show('answered');
      if (shownIndex !== state.index) {
        shownIndex = state.index;
        buildButtons(state);
      }
      $('q-progress').textContent = `Vraag ${state.index + 1} van ${state.total}`;
      show('question');
      break;
    case 'reveal':
      $('reveal').className = `panel center ${state.correct ? 'result-good' : 'result-bad'}`;
      $('r-title').textContent = state.correct ? 'Goed!' : state.answered ? 'Helaas, fout' : 'Te laat!';
      $('r-points').textContent = state.correct
        ? `+${state.points} punten${state.streak > 1 ? ` · ${state.streak} op een rij 🔥` : ''}`
        : 'Volgende keer beter!';
      $('r-rank').textContent = `Je staat op plek ${state.rank}`;
      show('reveal');
      break;
    case 'podium':
      $('p-rank').textContent = `Je bent geëindigd op plek ${state.rank}`;
      $('p-score').textContent = `${state.score} punten`;
      show('podium');
      break;
  }
}

socket.on('state', render);

// Nieuwe quiz geladen of quiz gesloten: opnieuw aanmelden met dezelfde naam.
socket.on('reset', ({ open }) => {
  joined = false;
  shownIndex = -1;
  if (!open) return show('idle');
  if (myName) join(myName);
  else show('join');
});

socket.on('kicked', () => {
  joined = false;
  myName = '';
  store('lancelot-name', null);
  $('name').value = '';
  $('me').textContent = '';
  $('join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  show('join');
});

// Na een korte wifi-onderbreking automatisch weer aanmelden.
socket.on('connect', () => {
  if (joined && myName) join(myName);
});
