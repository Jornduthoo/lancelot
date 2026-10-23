// Duel in de arena op het bord: het toernooischema met alle duels live, en tussen de rondes wie tegen wie.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js.
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
$('w-crown').innerHTML = CROWN;

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
    loadGame('du-load', { file: q.file, hearts: Number($('du-hearts').value) }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('du-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'duel');
  $('status').textContent = live ? `Duel in de arena · ${s.title}` : 'Duel in de arena';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'duel') {
    show('play');
    renderPlay();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

function renderLobby() {
  const n = state.players.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n < 2;
  const box = $('names');
  const current = new Set(state.players.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.players) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('du-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// ---------- Het toernooischema ----------

function hearts(n, max) {
  return Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">♥</i>`).join('');
}

function side(m, s) {
  const id = m[s];
  const name = m[s + 'n'];
  if (!id) return `<div class="du-side empty">${m.note === 'vrij' ? 'vrije doorgang' : '?'}</div>`;
  const cls = m.winner ? (m.winner === id ? 'won' : 'lost') : '';
  const struck = m.live && m.hit && m.hit.by && m.hit.by !== s ? ' struck' : '';
  return `<div class="du-side ${cls}${struck}"><span class="du-who" data-av="${esc(name || '')}">${esc(name || '?')}</span><span class="du-hp">${m.note === 'vrij' ? '' : hearts(m.hp[s], state.hearts)}</span></div>`;
}

let lastHits = {};
function renderPlay() {
  const s = state;
  $('p-round').textContent = s.roundName;
  const running = s.bracket[s.round] ? s.bracket[s.round].matches.filter(m => m && !m.winner).length : 0;
  $('p-info').textContent = running ? `${running} ${running === 1 ? 'duel bezig' : 'duels bezig'}` : 'Op naar de volgende ronde...';
  $('p-decide').disabled = running === 0;
  $('p-bracket').style.setProperty('--rounds', s.bracket.length);
  $('p-bracket').innerHTML = s.bracket.map((r, ri) => `
    <div class="du-col${ri === s.round ? ' now' : ''}">
      <h3>${esc(r.name)}</h3>
      <div class="du-col-matches">${r.matches.map(m => (m ? `
        <div class="du-match${m.live ? ' live' : ''}${m.winner ? ' done' : ''}${m.note === 'vrij' ? ' bye' : ''}">
          ${side(m, 'a')}${side(m, 'b')}
          ${m.live ? `<span class="du-q">vraag ${m.number}</span>` : ''}
        </div>` : '<div class="du-match wait"><div class="du-side empty">?</div><div class="du-side empty">?</div></div>')).join('')}</div>
    </div>`).join('');
  // Geluid bij een slag.
  const hits = {};
  for (const m of (s.bracket[s.round] || { matches: [] }).matches) {
    if (!m) continue;
    const key = `${m.a}-${m.b}`;
    hits[key] = m.hp.a + m.hp.b;
    if (lastHits[key] !== undefined && hits[key] < lastHits[key]) sfx.hit();
  }
  lastHits = hits;
  $('p-feed').innerHTML = s.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
  if (prev && prev.phase === 'duel' && prev.round !== s.round) sfx.gong();
  renderStage();
}

// Tussen de rondes (en bij de start): wie tegen wie, groot op het bord.
function renderStage() {
  const s = state;
  const wait = s.nextAt - (Date.now() + offset);
  const stage = $('p-stage');
  if (wait <= 0) return stage.classList.add('hidden');
  const round = s.bracket[s.round];
  const pairs = round.matches.filter(m => m && m.a && m.b);
  const final = s.round === s.rounds - 1;
  stage.classList.toggle('final', final);
  $('s-round').textContent = final ? '🏆 De finale!' : s.roundName;
  $('s-vs').innerHTML = pairs.map(m => `<div class="du-pair"><span data-av="${esc(m.an)}">${esc(m.an)}</span><b>⚔️</b><span data-av="${esc(m.bn)}">${esc(m.bn)}</span></div>`).join('')
    + round.matches.filter(m => m && m.note === 'vrij').map(m => `<div class="du-pair bye">🎟️ ${esc(m.an || m.bn)} gaat vrij door</div>`).join('');
  stage.classList.remove('hidden');
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const wait = state.nextAt - (Date.now() + offset);
  if (wait > 0) {
    if ($('p-stage').classList.contains('hidden')) renderStage();
    $('s-count').textContent = Math.ceil(wait / 1000);
  } else {
    $('p-stage').classList.add('hidden');
  }
}, 150);

$('start').addEventListener('click', () => socket.emit('du-start', null, res => { $('start-error').textContent = (res && res.error) || ''; }));
$('p-decide').addEventListener('click', () => {
  if (confirm('Alle lopende duels nu beslissen? Wie de meeste harten heeft, wint.')) socket.emit('du-decide');
});
$('p-finish').addEventListener('click', () => {
  if (confirm('Het toernooi nu stoppen? Wie het verst kwam en de meeste vragen juist had, wint.')) socket.emit('du-finish');
});
$('restart').addEventListener('click', () => socket.emit('du-restart'));
$('close').addEventListener('click', () => socket.emit('du-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('du-stop', null, res => {
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
  $('w-name').textContent = s.champion || 'Geen kampioen';
  $('w-name').dataset.av = s.champion || '';
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  $('final').innerHTML = (s.ranking || []).map(p => `<li><span class="pos">${p.place}</span><span>${esc(p.name)}</span><span class="muted">${esc(p.stage)} · ${p.wins} ${p.wins === 1 ? 'duel' : 'duels'} gewonnen</span><span class="pts">${p.right} ✔</span></li>`).join('');
  sfx.fanfare();
  confetti(6000);
}
