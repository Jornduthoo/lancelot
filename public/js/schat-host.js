// Schattenjacht op het bord: live goudrace, wat er gekocht wordt, klok en podium.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
const fmt = n => Math.round(n).toLocaleString('nl-BE');

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').textContent = sfx.muted ? '🔇' : '🔊';
$('mute').addEventListener('click', () => { $('mute').textContent = sfx.toggle() ? '🔇' : '🔊'; });
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

function downloadLink(file) {
  const link = document.createElement('a');
  link.href = `/resultaten/${encodeURIComponent(file)}`;
  link.download = file;
  link.textContent = 'Download voor Excel';
  return link;
}

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('sj-load', { file: q.file, minutes: Number($('sj-minutes').value) }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('sj-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Schattenjacht · ${s.title}` : 'Schattenjacht';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderRace();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderPodium();
  }
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'schatzoeker' : 'schatzoekers';
  $('start').disabled = n === 0;
  const box = $('names');
  const current = new Set(state.ranking.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.ranking) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('sj-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// De goudrace: balken die meegroeien, rijen die van plaats wisselen.
let lastFeed = '';
let lastTotal = 0;
function renderRace() {
  const list = $('p-race');
  const top = state.ranking.slice(0, 12);
  const max = Math.max(1, ...top.map(r => r.gold));
  const before = new Map([...list.children].map(li => [li.dataset.id, li.getBoundingClientRect().top]));
  const rows = new Map([...list.children].map(li => [li.dataset.id, li]));
  list.innerHTML = '';
  top.forEach((r, i) => {
    let li = rows.get(r.id);
    if (!li) {
      li = document.createElement('li');
      li.dataset.id = r.id;
      li.innerHTML = '<div class="bar"></div><span class="pos"></span><span class="name"></span><span class="gold"><span class="coin"></span><b></b></span>';
    }
    li.querySelector('.pos').textContent = i + 1;
    li.querySelector('.name').innerHTML = `${esc(r.name)}<small>${r.streak > 1 ? `🔥 ${r.streak} op rij · ` : ''}⚔️${r.levels.zwaard + 1} 👑${r.levels.reeks + 1} 🛡️${r.levels.schild + 1}</small>`;
    li.querySelector('b').textContent = fmt(r.gold);
    li.querySelector('.bar').style.transform = `scaleX(${r.gold / max})`;
    list.appendChild(li);
  });
  if (state.ranking.length > 12) list.insertAdjacentHTML('beforeend', `<li class="more">+ ${state.ranking.length - 12} schatzoekers</li>`);
  // Van plaats wisselen laten zien.
  for (const li of list.children) {
    const old = before.get(li.dataset.id);
    if (old === undefined) continue;
    const shift = old - li.getBoundingClientRect().top;
    if (shift) li.animate([{ transform: `translateY(${shift}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,1,.3,1)' });
  }
  const total = state.ranking.reduce((a, r) => a + r.gold, 0);
  if (total > lastTotal && view === 'play' && prev && prev.phase === 'play') sfx.tick(false);
  lastTotal = total;
  $('p-total').textContent = fmt(total);
  const feedKey = JSON.stringify(state.feed);
  if (feedKey !== lastFeed) {
    lastFeed = feedKey;
    $('p-feed').innerHTML = state.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', wait <= 0);
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);

$('start').addEventListener('click', () => socket.emit('sj-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu beëindigen en de eindstand tonen?')) socket.emit('sj-finish');
});
$('restart').addEventListener('click', () => socket.emit('sj-restart'));
$('close').addEventListener('click', () => socket.emit('sj-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('sj-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Het spel is gestopt.');
    if (res && res.file) {
      note.append(' De resultaten zijn bewaard. ');
      note.append(downloadLink(res.file));
    }
    note.classList.remove('hidden');
    show('setup');
  });
});

function renderPodium() {
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (state.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(state.resultsFile));
  }
  const ranking = state.ranking;
  const [p1, p2, p3] = ranking;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${fmt(p.gold)} goud</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span></span><span class="pts">${fmt(p.gold)}</span></li>`).join('');
  const rise = (n, delay) => setTimeout(() => document.querySelector(`.pillar.p${n}`)?.classList.add('up'), delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}
