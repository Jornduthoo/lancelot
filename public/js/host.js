// Docentenscherm. Gebruikt ICONS, sfx en confetti uit fx.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let deadline = 0;
let introEnds = 0;
let shownIndex = -1;
let builtKey = null; // welke vraag nu als tegels op het bord staat
let lastRanks = new Map();

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let view = 'home';
const VIEWS = ['home', 'idle', 'opwarmer', 'results', 'settings', 'maker', 'editor', 'lobby', 'question', 'board', 'podium'];
// Schermen die de leerkracht zelf opent en die een statusupdate niet mag wegklikken.
const OWN_VIEWS = ['home', 'idle', 'opwarmer', 'results', 'settings', 'maker', 'editor'];
// Tijdens het maken of bewerken van een quiz springen we nooit naar een lopend toernooi.
const EDITING = ['results', 'settings', 'maker', 'editor'];
const follow = name => { if (!EDITING.includes(view)) show(name); };

function show(name) {
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
  window.scrollTo(0, 0);
}

// Browsers spelen pas geluid af na een klik; elke klik ontgrendelt het geluid.
document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').textContent = sfx.muted ? '🔇' : '🔊';
$('mute').addEventListener('click', () => { $('mute').textContent = sfx.toggle() ? '🔇' : '🔊'; });

$('brand').addEventListener('click', () => {
  if (OWN_VIEWS.includes(view)) show('home');
});
// Startscherm: drie rijken. De gekozen tegel toont zijn onderdelen eronder en wordt onthouden.
function openRealm(id, scroll) {
  for (const t of document.querySelectorAll('.realm')) t.classList.toggle('on', t.dataset.realm === id);
  for (const p of document.querySelectorAll('.realm-panel')) p.classList.toggle('hidden', p.id !== `realm-${id}`);
  try { localStorage.setItem('lancelot-realm', id); } catch {}
  fillRows();
  if (scroll) $(`realm-${id}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// Elke rij tegels vol: de eerste tegels worden breed tot de laatste rij gevuld is.
function fillRows() {
  const grid = document.querySelector('.realm-panel:not(.hidden) .modules');
  if (!grid) return;
  const tiles = [...grid.children];
  for (const t of tiles) t.style.gridColumn = '';
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const cols = Math.min(tiles.length, Math.floor((grid.clientWidth + gap) / (240 + gap)));
  const extra = cols > 1 ? (cols - tiles.length % cols) % cols : 0;
  for (const t of tiles.slice(0, extra)) t.style.gridColumn = 'span 2';
}
addEventListener('resize', fillRows);
document.querySelector('[data-realm="arena"] .tag').textContent = `${document.querySelectorAll('#realm-arena .module').length} spellen`;
for (const t of document.querySelectorAll('.realm')) t.addEventListener('click', () => { openRealm(t.dataset.realm, true); sfx.tick(); });
let savedRealm = 'arena';
try { savedRealm = localStorage.getItem('lancelot-realm') || 'arena'; } catch {}
openRealm(document.getElementById(`realm-${savedRealm}`) ? savedRealm : 'arena');

document.querySelector('[data-module="toernooi"]').addEventListener('click', () => show('idle'));
document.querySelector('[data-module="rondetafel"]').addEventListener('click', () => { location.href = '/rondetafel'; });
document.querySelector('[data-module="runenraadsel"]').addEventListener('click', () => { location.href = '/runenraadsel'; });
document.querySelector('[data-module="toren"]').addEventListener('click', () => { location.href = '/toren'; });
document.querySelector('[data-module="schattenjacht"]').addEventListener('click', () => { location.href = '/schattenjacht'; });
document.querySelector('[data-module="laserslag"]').addEventListener('click', () => { location.href = '/laserslag'; });
document.querySelector('[data-module="ridderrace"]').addEventListener('click', () => { location.href = '/ridderrace'; });
document.querySelector('[data-module="kristalroof"]').addEventListener('click', () => { location.href = '/kristalroof'; });
document.querySelector('[data-module="verrader"]').addEventListener('click', () => { location.href = '/verrader'; });
document.querySelector('[data-module="burchtbouwers"]').addEventListener('click', () => { location.href = '/burchtbouwers'; });
document.querySelector('[data-module="duel"]').addEventListener('click', () => { location.href = '/duel'; });
document.querySelector('[data-module="packnight"]').addEventListener('click', () => { location.href = '/packnight'; });
document.querySelector('[data-module="neonduel"]').addEventListener('click', () => { location.href = '/neonduel'; });
document.querySelector('[data-module="leraarbaas"]').addEventListener('click', () => { location.href = '/leraarbaas'; });
document.querySelector('[data-module="strijdrossen"]').addEventListener('click', () => { location.href = '/strijdrossen'; });
document.querySelector('[data-module="cybergalaga"]').addEventListener('click', () => { location.href = '/cybergalaga'; });
document.querySelector('[data-module="bomberknight"]').addEventListener('click', () => { location.href = '/bomberknight'; });
document.querySelector('[data-module="gauntlet"]').addEventListener('click', () => { location.href = '/gauntlet'; });
document.querySelector('[data-module="royale"]').addEventListener('click', () => { location.href = '/ridder-royale'; });
document.querySelector('[data-module="sterrenvreter"]').addEventListener('click', () => { location.href = '/sterrenvreter'; });
document.querySelector('[data-module="poortwacht"]').addEventListener('click', () => { location.href = '/poortwacht'; });
document.querySelector('[data-module="neonvlucht"]').addEventListener('click', () => { location.href = '/neonvlucht'; });
document.querySelector('[data-module="robomol"]').addEventListener('click', () => { location.href = '/robomol'; });
document.querySelector('[data-module="robopaarden"]').addEventListener('click', () => { location.href = '/robopaarden'; });
document.querySelector('[data-module="diepboor"]').addEventListener('click', () => { location.href = '/diepboor'; });
document.querySelector('[data-module="ridderslang"]').addEventListener('click', () => { location.href = '/ridderslang'; });
document.querySelector('[data-module="burchtstorm"]').addEventListener('click', () => { location.href = '/burchtstorm'; });
document.querySelector('[data-module="pixelridder"]').addEventListener('click', () => { location.href = '/pixelridder'; });
document.querySelector('[data-module="rijk"]').addEventListener('click', () => { location.href = '/rijk'; });
document.querySelector('[data-module="voorkennis"]').addEventListener('click', () => { location.href = '/rondetafel?doel=voorkennis'; });
document.querySelector('[data-module="oefenblad"]').addEventListener('click', () => { location.href = '/oefenblad'; });
document.querySelector('[data-module="werkblad"]').addEventListener('click', () => { location.href = '/oefenblad?maak=ai'; });

function loadQuiz(file) {
  loadGame('load', file, res => {
    $('load-error').textContent = res.error || '';
    if (!res.error) show('lobby');
  });
}

QuizList.mount($('quiz-list'), {
  go: 'Speel ▶',
  play: q => loadQuiz(q.file),
  edit: q => editQuiz(q.file),
  remove: q => {
    if (!confirm(`"${q.title}" verwijderen?`)) return;
    socket.emit('delete', q.file, res => { $('load-error').textContent = res.error || ''; });
  },
});

// ---------- Lobby ----------

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n === 0;
  const known = new Set([...$('names').children].map(el => el.dataset.id));
  const current = new Set(state.ranking.map(p => p.id));
  for (const el of [...$('names').children]) if (!current.has(el.dataset.id)) el.remove();
  for (const p of state.ranking) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('kick', p.id));
    $('names').appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// ---------- Vraag ----------

const RING = 2 * Math.PI * 42;
$('ring-fill').style.strokeDasharray = RING;

function renderQuestion() {
  const q = state.question;
  const phase = state.phase;
  const revealed = phase === 'reveal';
  const fresh = shownIndex !== state.index;
  $('q-progress').textContent = `RONDE ${state.index + 1} / ${state.total}${state.niveaus ? ' · 🪶🛡️⚔️ elk op zijn niveau' : ''}`;
  $('q-text').textContent = q.question;
  $('q-answered').textContent = `${state.answered} / ${state.ranking.length} geantwoord`;

  $('intro').classList.toggle('hidden', phase !== 'intro');
  $('ring').style.visibility = phase === 'question' ? 'visible' : 'hidden';
  $('q-answers').classList.toggle('hidden', phase === 'intro');
  $('reveal').classList.toggle('hidden', phase !== 'question');
  $('to-board').classList.toggle('hidden', !revealed);
  $('next').classList.toggle('hidden', !revealed);
  $('next').textContent = state.index + 1 >= state.total ? 'Naar de eindstand' : 'Volgende ronde';

  if (phase === 'intro') {
    if (fresh) {
      shownIndex = state.index;
      $('q-answers').innerHTML = '';
      builtKey = null;
      sfx.whoosh();
      const fill = $('intro-fill');
      fill.style.transition = 'none';
      fill.style.transform = 'scaleX(1)';
      introEnds = Date.now() + state.introRemaining;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = `transform ${state.introRemaining}ms linear`;
        fill.style.transform = 'scaleX(0)';
      }));
    }
    return;
  }

  // Antwoordtegels opbouwen zodra de vraag opengaat (of na herladen van de pagina).
  // De sleutel hoort bij de vraag zelf, zodat er nooit tegels van een vorige quiz blijven staan.
  const key = JSON.stringify([state.title, state.index, q.question, q.answers]);
  if (builtKey !== key) {
    builtKey = key;
    $('q-answers').innerHTML = q.answers.map((a, i) => `
      <div class="answer a${i} enter" style="animation-delay:${i * 90}ms">
        ${ICONS[i]}<span>${esc(a)}</span><span class="count"></span><div class="fillbar"></div>
      </div>`).join('');
    if (phase === 'question') sfx.go();
  }

  if (phase === 'question') {
    deadline = Date.now() + state.remaining;
    return;
  }

  // Onthulling: goede tegel laten oplichten, staafjes laten groeien.
  const tiles = [...$('q-answers').children];
  const total = Math.max(1, state.counts.reduce((a, b) => a + b, 0));
  tiles.forEach((tile, i) => {
    tile.classList.remove('enter');
    tile.classList.toggle('dim', i !== state.correct);
    tile.classList.toggle('right', i === state.correct);
    tile.querySelector('.count').textContent = state.counts[i];
    requestAnimationFrame(() => { tile.querySelector('.fillbar').style.transform = `scaleX(${state.counts[i] / total})`; });
  });
  if (prev && prev.phase === 'question') sfx.gong();
}

// Klok rond de vraag, met tikjes in de laatste vijf seconden.
let lastSecond = null;
setInterval(() => {
  if (!state || state.phase !== 'question' || view !== 'question') return;
  const left = Math.max(0, deadline - Date.now());
  const secs = Math.ceil(left / 1000);
  const total = state.question.time * 1000;
  $('timer').textContent = secs;
  $('ring-fill').style.strokeDashoffset = RING * (1 - left / total);
  $('ring').classList.toggle('low', secs <= 5);
  if (secs !== lastSecond && secs <= 5 && secs > 0) sfx.tick(secs <= 3);
  lastSecond = secs;
}, 100);

// ---------- Scorebord ----------

function renderBoard() {
  const top = state.ranking.slice(0, 6);
  const list = $('top');
  // FLIP: oude posities onthouden, nieuwe tekenen en dan laten verschuiven.
  const before = new Map([...list.children].map(li => [li.dataset.id, li.getBoundingClientRect().top]));
  list.innerHTML = top.map((p, i) => {
    const gain = state.lastPoints[p.id] || 0;
    return `<li data-id="${esc(p.id)}"><span class="pos">${i + 1}</span><span>${esc(p.name)}</span>
      <span class="gain">${gain ? `+${gain}` : ''}</span><span class="pts">${p.score}</span></li>`;
  }).join('');
  const rows = [...list.children];
  rows.forEach((li, i) => {
    const oldRank = lastRanks.get(li.dataset.id);
    const fromTop = before.get(li.dataset.id);
    const shift = fromTop !== undefined
      ? fromTop - li.getBoundingClientRect().top
      : oldRank !== undefined ? (oldRank - i) * (li.offsetHeight + 10) : 40;
    li.animate([{ transform: `translateY(${shift}px)`, opacity: oldRank === undefined && fromTop === undefined ? 0 : 1 }, { transform: 'none', opacity: 1 }],
      { duration: 900, delay: 150 + i * 60, easing: 'cubic-bezier(.2,1,.3,1)', fill: 'backwards' });
  });
  lastRanks = new Map(state.ranking.map((p, i) => [p.id, i]));
  $('board-progress').textContent = `Na ronde ${state.index + 1} van ${state.total}`;
  $('board-next').textContent = state.index + 1 >= state.total ? 'Naar de eindstand' : 'Volgende ronde';
  sfx.swoosh();
}

$('to-board').addEventListener('click', () => { renderBoard(); show('board'); });

// ---------- Podium ----------

socket.on('results', files => {
  const box = $('results-list');
  box.innerHTML = files.length ? '' : '<p class="muted">Nog geen resultaten. Speel eerst een quiz tot het einde.</p>';
  for (const file of files) {
    const row = document.createElement('div');
    row.className = 'quiz-row';
    row.innerHTML = `<span class="play"></span><a class="button" download href="/resultaten/${encodeURIComponent(file)}">Download</a>`;
    row.querySelector('.play').textContent = file.replace(/\.csv$/, '').replace(/_/g, ' ');
    box.appendChild(row);
  }
});

$('open-results').addEventListener('click', () => show('results'));
$('open-klas').addEventListener('click', () => { location.href = '/klas'; });
$('open-zorg').addEventListener('click', () => { location.href = '/zorg'; });
socket.on('zekerheid', on => { $('zekerheid').checked = on; });
$('zekerheid').addEventListener('change', e => socket.emit('zekerheid', e.target.checked));
$('open-netwerk').addEventListener('click', () => { location.href = '/netwerk'; });
for (const b of document.querySelectorAll('.open-folder')) {
  b.addEventListener('click', () => socket.emit('open-results-folder'));
}

function renderPodium() {
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (state.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    const link = document.createElement('a');
    link.href = `/resultaten/${encodeURIComponent(state.resultsFile)}`;
    link.download = state.resultsFile;
    link.textContent = 'Download voor Excel';
    saved.append(link);
  }
  const [p1, p2, p3] = state.ranking;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${p.score} punten</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = state.ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span></span><span class="pts">${p.score}</span></li>`).join('');

  // Eerst plek 3, dan 2, en na tromgeroffel de winnaar.
  const rise = (n, delay) => setTimeout(() => {
    const el = document.querySelector(`.pillar.p${n}`);
    if (el) el.classList.add('up');
  }, delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}

// ---------- Stoppen ----------

$('stop').addEventListener('click', () => {
  if (!confirm('Toernooi stoppen en terug naar de quizlijst?')) return;
  socket.emit('stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Toernooi gestopt.');
    if (res && res.file) {
      note.append(' De resultaten tot nu toe zijn bewaard. ');
      const link = document.createElement('a');
      link.href = `/resultaten/${encodeURIComponent(res.file)}`;
      link.download = res.file;
      link.textContent = 'Download voor Excel';
      note.append(link);
    }
    note.classList.remove('hidden');
    show('idle');
  });
});

// ---------- Status van de server ----------

socket.on('state', s => {
  prev = state;
  state = s;
  $('status').textContent = s.title ? `Toernooi · ${s.title}` : 'Docentenscherm';
  $('stop').classList.toggle('hidden', !['lobby', 'intro', 'question', 'reveal'].includes(s.phase));
  if (s.phase !== 'idle') $('stopped').classList.add('hidden');

  if (s.phase === 'idle') {
    shownIndex = -1;
    builtKey = null;
    $('q-answers').innerHTML = '';
    lastRanks = new Map();
    if (!OWN_VIEWS.includes(view)) show('idle');
  }
  if (s.phase === 'lobby') {
    if (!prev || prev.phase !== 'lobby') { $('names').innerHTML = ''; lastRanks = new Map(); shownIndex = -1; builtKey = null; $('q-answers').innerHTML = ''; }
    renderLobby();
    follow('lobby');
  }
  if (['intro', 'question', 'reveal'].includes(s.phase)) {
    renderQuestion();
    // Op het scorebord blijven staan tot de leerkracht verder klikt.
    if (!(view === 'board' && s.phase === 'reveal')) follow('question');
  }
  if (s.phase === 'podium' && (!prev || prev.phase !== 'podium' || view !== 'podium')) {
    follow('podium');
    renderPodium();
  }
});

$('start').addEventListener('click', () => socket.emit('start'));
$('reveal').addEventListener('click', () => socket.emit('reveal'));
$('next').addEventListener('click', () => socket.emit('next'));
$('board-next').addEventListener('click', () => socket.emit('next'));
$('restart').addEventListener('click', () => socket.emit('restart'));
$('close').addEventListener('click', () => socket.emit('close'));
