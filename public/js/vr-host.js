// De Verrader op het bord: de kristalkern, wie nog meedoet, de Ronde Tafel met stemmen en de onthulling.
// De rollen blijven geheim tot iemand verbannen wordt of het spel voorbij is.
// Gebruikt sfx en confetti uit fx.js, quizMakerUrl uit quiz-links.js.
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
    socket.emit('vr-load', {
      file: q.file, minutes: Number($('vr-minutes').value), traitors: $('vr-traitors').value, length: $('vr-length').value, talk: $('vr-talk').value,
    }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('vr-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', !['taken', 'tafel', 'rollen'].includes(s.phase));
  $('status').textContent = live ? `De Verrader · ${s.title}` : 'De Verrader';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (['rollen', 'taken', 'tafel'].includes(s.phase)) {
    $('p-title').textContent = s.title;
    show('play');
    renderPlay();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

function renderLobby() {
  const n = state.roster.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n < 3;
  $('start-error').textContent = n < 3 ? 'Je hebt minstens 3 spelers nodig.' : '';
  const box = $('names');
  const current = new Set(state.roster.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.roster) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('vr-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderPlay() {
  const s = state;
  const pct = s.target ? Math.min(100, (s.kern / s.target) * 100) : 0;
  $('p-kern').style.width = `${pct}%`;
  $('p-kern-num').textContent = `${Math.round(pct)}%`;
  const alive = s.roster.filter(p => p.alive).length;
  $('p-traitors').innerHTML = s.phase === 'rollen'
    ? '<p class="muted small">De rollen worden verdeeld...</p>'
    : `<div class="vr-mask">🎭</div><p>Er ${s.traitors === 1 ? 'is' : 'zijn'} <strong>${s.traitors}</strong> ${s.traitors === 1 ? 'verrader' : 'verraders'} in de burcht.</p><p class="muted small">${alive} van ${s.roster.length} spelers doen nog mee.</p>`;
  $('p-people').innerHTML = s.roster.map(p => {
    const status = p.fate === 'betoverd' ? '<small>👻 betoverd</small>' : p.fate === 'verbannen' ? `<small>${p.role === 'verrader' ? '🎭 verrader' : '⚖️ geen verrader'}</small>` : '';
    return `<div class="vr-person-card${p.alive ? '' : ' out'}${p.role === 'verrader' ? ' traitor' : ''}">${esc(p.name)}${status}</div>`;
  }).join('');
  const feedKey = JSON.stringify(s.feed);
  if (feedKey !== lastFeed) {
    const fresh = s.feed[0] && lastFeed && !lastFeed.includes(JSON.stringify(s.feed[0].text));
    lastFeed = feedKey;
    $('p-feed').innerHTML = s.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && /^🌀/.test(s.feed[0].text)) sfx.boom();
  }
  $('p-horn').classList.toggle('hidden', s.phase !== 'taken');
  renderStage();
}

// De Ronde Tafel groot op het bord.
function renderStage() {
  const s = state;
  const m = s.meeting;
  const stage = $('p-stage');
  if (s.phase === 'rollen') {
    stage.classList.remove('hidden');
    stage.dataset.step = 'rollen';
    $('m-title').textContent = '🎭 De rollen worden verdeeld';
    $('m-sub').textContent = `Kijk op je eigen scherm, en hou het geheim. Er ${s.traitors === 1 ? 'is' : 'zijn'} ${s.traitors} ${s.traitors === 1 ? 'verrader' : 'verraders'}.`;
    $('m-votes').innerHTML = '';
    $('m-skip').classList.add('hidden');
    if (!prev || prev.phase !== 'rollen') sfx.gong();
    return;
  }
  if (s.phase !== 'tafel' || !m) {
    stage.classList.add('hidden');
    return;
  }
  stage.classList.remove('hidden');
  stage.dataset.step = m.step;
  const fresh = !prev || !prev.meeting || prev.meeting.step !== m.step;
  $('m-skip').classList.toggle('hidden', !['gevonden', 'praten'].includes(m.step));
  $('m-votes').innerHTML = '';
  if (m.step === 'gevonden') {
    $('m-title').textContent = m.reason === 'betovering' ? `🌀 ${m.victim} is betoverd!` : `📯 ${m.caller} roept de Ronde Tafel samen!`;
    $('m-sub').textContent = 'Iedereen naar de Ronde Tafel.';
    if (fresh) sfx.gong();
  } else if (m.step === 'praten') {
    $('m-title').textContent = '🪑 De Ronde Tafel';
    $('m-sub').textContent = 'Praat met elkaar: wie gedraagt zich verdacht? Wie heeft een tip gekregen?';
  } else if (m.step === 'stemmen') {
    $('m-title').textContent = '⚖️ Stemmen!';
    $('m-sub').textContent = `${s.votesIn} van ${s.voters} stemmen binnen. Je kan wisselen tot de tijd om is.`;
    if (fresh) sfx.tick(false);
  } else if (m.step === 'uitslag') {
    const r = m.result;
    $('m-title').textContent = r.banished ? `${r.banished} is verbannen.` : 'Niemand is verbannen.';
    $('m-sub').textContent = r.banished
      ? (r.wasTraitor ? 'Het was een verrader! 🎭' : 'Het was geen verrader... 😱')
      : (r.tie ? 'De stemmen staken gelijk.' : 'De meesten sloegen over.');
    const rows = Object.entries(r.votes).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, r.skip, ...rows.map(x => x[1]));
    $('m-votes').innerHTML = [...rows, ...(r.skip ? [['Overslaan', r.skip]] : [])]
      .map(([name, n]) => `<div class="vr-vote"><span>${esc(name)}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join('');
    if (fresh) {
      if (r.banished && r.wasTraitor) { sfx.fanfare(); confetti(2500); } else sfx.bad();
    }
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 60000);
  const m = state.meeting;
  $('m-clock').textContent = m && ['praten', 'stemmen'].includes(m.step) ? Math.ceil(Math.max(0, m.until - now) / 1000) : '';
}, 250);

$('start').addEventListener('click', () => socket.emit('vr-start', null, res => { $('start-error').textContent = (res && res.error) || ''; }));
$('p-horn').addEventListener('click', () => socket.emit('vr-horn'));
$('m-skip').addEventListener('click', () => socket.emit('vr-skip'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen? De verraders winnen dan.')) socket.emit('vr-finish');
});
$('restart').addEventListener('click', () => socket.emit('vr-restart'));
$('close').addEventListener('click', () => socket.emit('vr-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('vr-stop', null, res => {
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

// Het einde: wie won, en alle rollen open.
function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  $('w-mark').textContent = s.winner === 'ridder' ? '🛡️' : '🎭';
  $('w-title').textContent = s.winner === 'ridder' ? 'De ridders winnen!' : 'De verraders winnen!';
  $('w-why').textContent = s.why;
  const order = [...s.roster].sort((a, b) => (a.role === 'verrader' ? -1 : 0) - (b.role === 'verrader' ? -1 : 0) || b.right - a.right);
  $('final').innerHTML = order.map(p => `<li class="${p.role}"><span class="pos">${p.role === 'verrader' ? '🎭' : '🛡️'}</span><span>${esc(p.name)}</span>
    <span class="muted">${p.fate === 'betoverd' ? '👻 betoverd' : p.fate === 'verbannen' ? '⚖️ verbannen' : 'overleefd'}${p.role === 'verrader' ? ` · 🌀 ${p.spells}` : ''}</span><span class="pts">${p.right} juist</span></li>`).join('');
  sfx.drumroll(1.6);
  setTimeout(() => { sfx.fanfare(); confetti(4000); }, 1700);
}
