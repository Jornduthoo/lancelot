// Neon Duel op het bord: de vechtende ridders, de levensbalken, de energie van beide teams en de beste slagen.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js en NeonDraw uit nd-draw.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

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
    loadGame('nd-load', { file: q.file, rounds: Number($('nd-rounds').value), seconds: Number($('nd-seconds').value), tempo: $('nd-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
  remove: q => {
    if (!confirm(`"${q.title}" verwijderen?`)) return;
    socket.emit('delete', q.file, res => { $('load-error').textContent = (res && res.error) || ''; });
  },
});

const scene = NeonDraw.create($('p-canvas'));

socket.on('nd-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Neon Duel · ${s.title}` : 'Neon Duel';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    scene.setState(s, offset);
    renderSide();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('nd-tick', msg => {
  if (!state || state.phase !== 'play') return;
  Object.assign(state, msg);
  scene.setState(state, offset);
  renderSide();
});

socket.on('nd-hit', ev => {
  if (view === 'play') scene.hit(ev);
});

let lastSide = '';
function renderSide() {
  if (!state) return;
  const key = JSON.stringify([state.ranking, state.feed]);
  if (key === lastSide) return;
  lastSide = key;
  for (let t = 0; t < 2; t++) {
    const list = (state.ranking || []).filter(r => r.team === t).slice(0, 4);
    $(`best-${t}`).innerHTML = list.map(r => `<li><span data-av="${esc(r.name)}">${esc(r.name)}</span><b>${Math.round(r.dmg)}</b></li>`).join('');
  }
  $('p-feed').innerHTML = (state.feed || []).slice(0, 4).map(f => `<li>${esc(f.text)}</li>`).join('');
}

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = !(state.sizes[0] && state.sizes[1]);
  for (let t = 0; t < 2; t++) {
    $(`size-${t}`).textContent = `(${state.sizes[t]})`;
    const box = $(`names-${t}`);
    const want = state.ranking.filter(p => p.team === t);
    const ids = new Set(want.map(p => p.id));
    for (const el of [...box.children]) if (!ids.has(el.dataset.id)) el.remove();
    const known = new Set([...box.children].map(el => el.dataset.id));
    for (const p of want) {
      if (known.has(p.id)) continue;
      const el = document.createElement('span');
      el.className = 'name';
      el.dataset.id = p.id;
      el.title = 'Naar het andere team';
      el.append(p.name);
      const x = document.createElement('i');
      x.className = 'nd-kick';
      x.textContent = '✕';
      x.title = 'Verwijderen';
      x.addEventListener('click', e => { e.stopPropagation(); socket.emit('nd-kick', p.id); });
      el.append(x);
      el.addEventListener('click', () => socket.emit('nd-swap', p.id));
      box.appendChild(el);
      if (prev && prev.phase === 'lobby' && !prev.ranking.some(r => r.id === p.id)) sfx.join();
    }
  }
  if (!(state.sizes[0] && state.sizes[1])) $('start-error').textContent = n ? 'Elk team heeft minstens één ridder nodig.' : '';
  else $('start-error').textContent = '';
}

function frame() {
  requestAnimationFrame(frame);
  if (view !== 'play') return;
  scene.frame();
}
requestAnimationFrame(frame);

$('start').addEventListener('click', () => socket.emit('nd-start', null, res => { $('start-error').textContent = (res && res.error) || ''; }));
$('shuffle').addEventListener('click', () => socket.emit('nd-shuffle'));
$('p-full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.querySelector('.nd-stage').requestFullscreen().catch(() => {});
});
$('p-finish').addEventListener('click', () => {
  if (confirm('Het duel nu stoppen en de eindstand tonen?')) socket.emit('nd-finish');
});
$('restart').addEventListener('click', () => socket.emit('nd-restart'));
$('close').addEventListener('click', () => socket.emit('nd-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('nd-stop', null, res => {
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

function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  const T = NeonDraw.TEAM;
  $('w-box').className = `center nd-win ${s.winner >= 0 ? `t${s.winner}` : ''}`;
  $('w-title').textContent = s.winner >= 0 ? `${T[s.winner].icon} ${T[s.winner].name} wint het Neon Duel!` : '🤝 Het Neon Duel eindigt gelijk';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const supers = s.ranking.reduce((a, r) => a + r.supers, 0);
  $('w-why').textContent = `Rondes ${s.wins[0]} - ${s.wins[1]} · samen ${right} vragen juist en ${supers} ${supers === 1 ? 'supermove' : 'supermoves'}.`;
  for (let t = 0; t < 2; t++) {
    $(`final-${t}`).innerHTML = s.ranking.filter(p => p.team === t).map((p, i) => `<li><span class="pos">${i + 1}</span><span>${esc(p.name)}</span><span class="muted">💥 ${p.supers} · ✔ ${p.right}</span><span class="pts">${Math.round(p.dmg)}</span></li>`).join('');
  }
  if (s.winner >= 0) { sfx.fanfare(); confetti(5000); }
}
