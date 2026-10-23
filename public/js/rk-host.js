// Het Rijk op het bord: rijk kiezen, teams in de lobby, en de kaart die tijdens de les verandert.
// Gebruikt sfx, confetti uit fx.js, quizMakerUrl uit quiz-links.js, RijkMap uit rijk-map.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let chosen = null; // het bestand van het gekozen rijk

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

const dateOf = iso => new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });

// ---------- Rijk kiezen ----------

function loadList() {
  socket.emit('rk-list', null, list => {
    const box = $('rk-list');
    if (!list.length) {
      box.innerHTML = '<p class="muted">Nog geen rijk. Maak hieronder je eerste rijk, bijvoorbeeld één per klas.</p>';
      return;
    }
    box.innerHTML = list.map(r => `
      <div class="panel rk-card" data-file="${esc(r.file)}">
        <div class="rk-card-top"><strong>${esc(r.name)}</strong><span class="muted small">${r.lessons} ${r.lessons === 1 ? 'les' : 'lessen'} · ${r.members} ridders${r.last ? ` · laatst ${dateOf(r.last)}` : ''}</span></div>
        <div class="rk-bars">${r.teams.map((t, i) => `<span style="background:${t.color};flex:${Math.max(1, r.counts[i])}" title="${esc(t.name)}: ${r.counts[i]} gebieden">${r.counts[i]}</span>`).join('')}</div>
        <div class="actions"><button class="rk-pick">Kies</button><button class="secondary icon rk-del" title="Verwijderen">🗑</button></div>
      </div>`).join('');
    for (const card of box.children) {
      card.querySelector('.rk-pick').addEventListener('click', () => choose(card.dataset.file));
      card.querySelector('.rk-del').addEventListener('click', () => {
        const name = card.querySelector('strong').textContent;
        if (!confirm(`Het rijk "${name}" echt verwijderen? Alle veroverde gebieden zijn dan weg.`)) return;
        socket.emit('rk-delete', { file: card.dataset.file }, res => {
          if (res.error) return alert(res.error);
          loadList();
        });
      });
    }
  });
}

$('rk-new').addEventListener('submit', e => {
  e.preventDefault();
  socket.emit('rk-create', { name: $('rk-name').value, teams: Number($('rk-teams').value) }, res => {
    $('rk-new-error').textContent = res.error || '';
    if (res.error) return;
    $('rk-name').value = '';
    choose(res.file);
  });
});

let peek = null;
function choose(file) {
  socket.emit('rk-peek', { file }, res => {
    if (res.error) return alert(res.error);
    chosen = file;
    peek = res;
    try { localStorage.setItem('lancelot-rijk', file); } catch {}
    $('rk-chosen').textContent = res.name;
    $('rk-history').innerHTML = res.lessons.length
      ? res.lessons.map((l, i) => `<li><span>${esc(l.title)}</span><span class="muted small">${dateOf(l.at)}</span></li>`).join('')
      : '<li class="muted">Nog geen lessen gespeeld. Les 1 begint met de quiz die je hieronder kiest.</li>';
    $('pick-rijk').classList.add('hidden');
    $('pick-quiz').classList.remove('hidden');
    drawPreview();
  });
}

function drawPreview() {
  if (!peek || $('pick-quiz').classList.contains('hidden')) return;
  const ids = Object.keys(peek.titles);
  const lessonOf = Object.fromEntries(ids.map((id, i) => [id, i + 1]));
  RijkMap.draw($('rk-preview'), { ...peek, maxPower: 5 }, { lessonOf });
}

$('rk-other').addEventListener('click', () => {
  chosen = null;
  try { localStorage.removeItem('lancelot-rijk'); } catch {}
  $('pick-quiz').classList.add('hidden');
  $('pick-rijk').classList.remove('hidden');
  loadList();
});

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('rk-load', { rijk: chosen, quiz: q.file, minutes: Number($('rk-minutes').value) }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

function backToSetup() {
  show('setup');
  let saved = null;
  try { saved = localStorage.getItem('lancelot-rijk'); } catch {}
  if (saved) choose(saved); else loadList();
}

// ---------- Spel ----------

socket.on('rk-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'spel');
  $('status').textContent = live ? `Het Rijk · ${s.rijk}` : 'Het Rijk';
  if (!live) {
    if (view !== 'setup' || !prev) backToSetup();
    return;
  }
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'spel') {
    $('p-title').textContent = `${s.rijk} · les ${s.lesson}`;
    show('play');
    renderSide($('p-scores'), true);
    sounds();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n === 0;
  const before = prev && prev.phase === 'lobby' ? prev.ranking.length : n;
  if (n > before) sfx.join();
  $('teams').innerHTML = state.teams.map((t, ti) => {
    const members = state.ranking.filter(p => p.team === ti);
    return `<div class="panel rk-team" style="--team:${t.color}">
      <h3>${esc(t.name)} <span class="muted small">${members.length}</span></h3>
      <div class="names">${members.map(p => `<span class="name" data-id="${esc(p.id)}" title="Naar een ander team">${esc(p.name)}${p.returning ? '' : ' <em class="rk-new-tag">nieuw</em>'}<b class="rk-x" data-kick="${esc(p.id)}" title="Verwijderen">✕</b></span>`).join('')}</div>
    </div>`;
  }).join('');
  for (const el of $('teams').querySelectorAll('.name')) {
    el.addEventListener('click', e => {
      if (e.target.dataset.kick) socket.emit('rk-kick', e.target.dataset.kick);
      else socket.emit('rk-move', el.dataset.id);
    });
  }
}

function renderSide(box, live) {
  const s = state;
  const best = Math.max(...s.counts);
  box.innerHTML = s.teams.map((t, i) => {
    const delta = s.before && s.before.length ? s.counts[i] - s.before[i] : 0;
    return `<div class="rk-score${s.counts[i] === best ? ' lead' : ''}" style="--team:${t.color}">
      <span class="rk-dot"></span><span class="rk-tname">${esc(t.name)}</span>
      <b>${s.counts[i]}</b><span class="rk-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta > 0 ? '+' : ''}${delta || (live ? '' : '0')}</span>
    </div>`;
  }).join('');
  $('p-legend').innerHTML = s.stof.map((q, i) => `<li><b>${i + 1}</b> ${esc(q.title)}${q.id === s.quizId ? ' <em class="muted">(vandaag)</em>' : ''}</li>`).join('');
  $('p-feed').innerHTML = s.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
}

let lastRecent = 0;
function sounds() {
  const r = state.recent[0];
  if (!r || r.at <= lastRecent) return;
  const fresh = state.recent.filter(x => x.at > lastRecent);
  lastRecent = r.at;
  if (!prev || prev.phase !== 'spel') return;
  if (fresh.some(x => x.kind === 'veroverd')) sfx.power();
  else if (fresh.some(x => x.kind === 'zwak')) sfx.bad();
  else sfx.marker();
}

const lessonOf = () => Object.fromEntries(state.stof.map((q, i) => [q.id, i + 1]));

function frame() {
  if (state && view === 'play') {
    RijkMap.draw($('p-canvas'), state, { recent: state.recent, now: Date.now() + offset, lessonOf: lessonOf(), names: true });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', !(wait > 0));
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);

$('start').addEventListener('click', () => socket.emit('rk-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('De les nu beëindigen? Het rijk wordt bewaard zoals het nu is.')) socket.emit('rk-finish');
});
$('close').addEventListener('click', () => socket.emit('rk-stop', null, () => backToSetup()));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen? Het rijk wordt bewaard zoals het nu is.')) return;
  socket.emit('rk-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Het spel is gestopt en het rijk is bewaard.');
    if (res && res.file) {
      note.append(' ');
      note.append(downloadLink(res.file));
    }
    note.classList.remove('hidden');
    backToSetup();
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
  const lesson = s.lessons[s.lessons.length - 1];
  const gained = lesson ? lesson.gained : s.teams.map(() => 0);
  const top = Math.max(...gained);
  const winners = s.teams.filter((_, i) => gained[i] === top && top > 0);
  $('w-title').textContent = `Les ${s.lessons.length} is voorbij`;
  $('w-why').textContent = winners.length === 1 ? `De ${winners[0].name} wonnen deze les het meeste land (+${top}). Het rijk is bewaard voor de volgende les.`
    : 'Het rijk is bewaard voor de volgende les.';
  renderSide($('w-scores'), false);
  $('w-best').innerHTML = s.ranking.slice(0, 8).map(p => `<li><span class="rk-dot" style="--team:${s.teams[p.team].color}"></span><span data-av="${esc(p.name)}">${esc(p.name)}</span><span class="muted small">${p.conquered ? `🚩 ${p.conquered}` : ''}${p.oldRight ? ` 🛡️ ${p.oldRight}` : ''}</span><b>${p.actions}</b></li>`).join('');
  requestAnimationFrame(() => RijkMap.draw($('w-canvas'), s, { lessonOf: lessonOf(), names: true }));
  sfx.fanfare();
  if (top > 0) confetti(4000);
}

window.addEventListener('resize', () => {
  if (view === 'podium' && state) RijkMap.draw($('w-canvas'), state, { lessonOf: lessonOf(), names: true });
  drawPreview();
});
