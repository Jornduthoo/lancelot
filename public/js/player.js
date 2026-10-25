// Leerlingscherm. Gebruikt ICONS uit fx.js.

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

// Pas verbinden als alle spelscripts geladen zijn: anders kan de eerste stand van een spel binnenkomen
// voordat dat spel luistert, en blijft de leerling op een leeg scherm staan.
const socket = io({ autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);
const sections = ['idle', 'join', 'lobby', 'intro', 'question', 'answered', 'reveal', 'podium'];
let joined = false;
let shownIndex = -1;
let autoJoined = false;
let shownReveal = -1;
let countdownTimer = null;

function show(name) {
  for (const s of sections) $(s).classList.toggle('hidden', s !== name);
  // Op de welkomstschermen staat het grote logo al; het kleine logo en de score alleen tijdens het spel.
  const big = ['idle', 'join'].includes(name);
  $('mini').classList.toggle('hidden', big);
  $('me').classList.toggle('hidden', big);
}

function buzz(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch {}
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
  });
}

$('join').addEventListener('submit', e => {
  e.preventDefault();
  join($('name').value);
});
$('name').value = myName;

// Tegen spieken: elke leerling krijgt de antwoorden in een eigen volgorde, en alle blokken hebben dezelfde kleur.
// De volgorde hangt af van de leerling en de vraag, zodat ze na herladen gelijk blijft.
function myOrder(n, index, question) {
  let h = 2166136261;
  for (const ch of `${playerId}|${index}|${question}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function buildButtons(state) {
  const box = $('answer-buttons');
  box.innerHTML = '';
  myOrder(state.answerCount, state.index, state.question).forEach((orig, i) => {
    const b = document.createElement('button');
    b.className = 'answer neutral enter';
    b.style.animationDelay = `${i * 70}ms`;
    b.innerHTML = `<b class="rune">${i + 1}</b><span class="label"></span>`;
    b.querySelector('.label').textContent = state.answers[orig];
    b.addEventListener('click', () => {
      socket.emit('answer', orig);
      buzz(30);
      show('answered');
    });
    box.appendChild(b);
  });
}

function startCountdown(ms) {
  clearInterval(countdownTimer);
  const end = Date.now() + ms;
  const tick = () => {
    const left = Math.max(1, Math.ceil((end - Date.now()) / 1000));
    $('countdown').textContent = left;
    if (Date.now() >= end) clearInterval(countdownTimer);
  };
  tick();
  countdownTimer = setInterval(tick, 200);
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
  $('me-name').textContent = state.name;
  $('me-score').textContent = `${state.score} punten`;
  switch (state.phase) {
    case 'lobby':
      $('lobby-name').textContent = state.name;
      show('lobby');
      break;
    case 'intro':
      $('intro-round').textContent = `Ronde ${state.index + 1} van ${state.total}`;
      startCountdown(state.introRemaining);
      show('intro');
      break;
    case 'question':
      $('zk-vraag').classList.toggle('hidden', !state.zekerVraag);
      $('zk-wacht').classList.toggle('hidden', !!state.zekerVraag);
      if (state.answered) return show('answered');
      const key = JSON.stringify([state.index, state.answers]);
      if (shownIndex !== key) {
        shownIndex = key;
        buildButtons(state);
      }
      $('q-progress').textContent = `Ronde ${state.index + 1} van ${state.total}`;
      $('q-small').textContent = state.question || '';
      show('question');
      break;
    case 'reveal': {
      const good = state.correct;
      $('reveal').className = `screen panel result ${good ? 'good' : 'bad'}`;
      $('r-mark').textContent = good ? '✔' : state.answered ? '✖' : '⌛';
      $('r-title').textContent = good ? 'Raak!' : state.answered ? 'Mis!' : 'Te laat!';
      $('r-points').textContent = good ? `+${state.points}` : '+0';
      $('r-streak').textContent = good && state.streak > 1 ? `🔥 ${state.streak} op een rij`
        : !good && state.zeker === 'zeker' ? 'Je was zeker, maar het is fout. Kijk goed naar het juiste antwoord op het bord!' : '';
      $('r-rank').textContent = `Je staat op plek ${state.rank}`;
      if (shownReveal !== state.index) {
        shownReveal = state.index;
        buzz(good ? [40, 60, 40] : 250);
      }
      show('reveal');
      break;
    }
    case 'podium': {
      const medals = ['🥇', '🥈', '🥉'];
      $('p-medal').textContent = medals[state.rank - 1] || '🛡️';
      $('p-rank').textContent = state.rank === 1 ? 'Jij wint het toernooi!' : `Plek ${state.rank}`;
      $('p-score').textContent = `${state.score} punten`;
      // Hoe goed schatte de leerling zichzelf in? Leren nadenken over je eigen leren.
      const t = state.zekerTel;
      $('p-zeker').innerHTML = '';
      if (t) {
        for (const [k, text] of [['zeker-juist', '💪 Terecht zeker'], ['twijfel-juist', '🤔 Getwijfeld, maar juist'], ['zeker-fout', '⚠️ Zeker, maar fout'], ['twijfel-fout', '🤔 Getwijfeld en fout']]) {
          if (!t[k]) continue;
          const row = document.createElement('span');
          row.textContent = `${text}: ${t[k]}×`;
          $('p-zeker').appendChild(row);
        }
      }
      if (!$('podium').dataset.done && state.rank <= 3) confetti(4000);
      $('podium').dataset.done = '1';
      show('podium');
      break;
    }
  }
}

socket.on('state', render);

for (const [id, value] of [['zk-zeker', 'zeker'], ['zk-twijfel', 'twijfel']]) {
  $(id).addEventListener('click', () => {
    socket.emit('zeker', value);
    buzz(20);
    $('zk-vraag').classList.add('hidden');
    $('zk-wacht').classList.remove('hidden');
  });
}

// Nieuwe quiz geladen of quiz gesloten: opnieuw aanmelden met dezelfde naam.
socket.on('reset', ({ open }) => {
  joined = false;
  shownIndex = -1;
  shownReveal = -1;
  delete $('podium').dataset.done;
  if (!open) return show('idle');
  if (myName) join(myName);
  else show('join');
});

socket.on('kicked', () => {
  joined = false;
  myName = '';
  store('lancelot-name', null);
  $('name').value = '';
  $('join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  show('join');
});

// Na een korte wifi-onderbreking automatisch weer aanmelden.
socket.on('connect', () => {
  if (joined && myName) join(myName);
});

show('idle');

// Chromebook: met de toetsen 1-4 antwoorden in de quiz, de Ronde Tafel en de spellen.
document.addEventListener('keydown', e => {
  if (!/^[1-4]$/.test(e.key) || e.target.matches('input, textarea')) return;
  // Niet antwoorden terwijl je je ridder samenstelt.
  if (document.querySelector('#av-maker:not(.hidden)')) return;
  const buttons = [...document.querySelectorAll('#answer-buttons .answer, #zk-vraag button, #sj-answers .answer, .rt-choice, #kr-answers .answer, #kr-chest-row .kr-chest, #kr-targets button, #vr-answers .answer, #vr-roster button, #bb-answers .answer, #du-answers .answer, #rk-answers .answer')]
    .filter(b => b.getClientRects().length && !b.disabled);
  if (buttons[e.key - 1]) buttons[e.key - 1].click();
});
