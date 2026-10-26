// Ridderrace op het bord: het circuit van bovenaf met alle racers live, de stand en het podium.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js, Track en RaceDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
const secs = ms => (ms / 1000).toFixed(1).replace('.', ',');

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
  if (name === 'play') resize();
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
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
    loadGame('rr-load', { file: q.file, minutes: Number($('rr-minutes').value), tempo: $('rr-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('rr-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Ridderrace · ${s.title}` : 'Ridderrace';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (view !== 'play') racers.clear();
    show('play');
    renderSide(s.ranking, s.feed, s.bestLap);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderPodium();
  }
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n === 0;
  const before = new Set([...document.querySelectorAll('#names .name')].map(el => el.dataset.id));
  $('names').innerHTML = state.ranking.map(p => `<span class="name" data-id="${esc(p.id)}" style="border-color:${RaceDraw.colorOf(p.color)}">${esc(p.name)}<button class="x" title="Verwijderen">✕</button></span>`).join('');
  for (const el of document.querySelectorAll('#names .name')) {
    el.querySelector('.x').addEventListener('click', e => { e.stopPropagation(); socket.emit('rr-kick', el.dataset.id); });
    if (prev && prev.phase === 'lobby' && !before.has(el.dataset.id)) sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed, bestLap) {
  const top = ranking.slice(0, 12);
  $('p-rank').innerHTML = top.map((r, i) => `<li><span class="pos">${i + 1}</span><span class="dot" style="background:${RaceDraw.colorOf(r.color)}"></span>
    <span class="who">${esc(r.name)}${r.asking ? ' <small>⛽</small>' : ''}</span><span class="en">ronde ${Math.max(1, Math.floor(r.progress) + 1)}</span></li>`).join('')
    + (ranking.length > 12 ? `<li class="more">+ ${ranking.length - 12} ridders</li>` : '');
  $('p-record').textContent = bestLap ? `⏱️ Snelste ronde: ${bestLap.name} · ${secs(bestLap.ms)} s` : '';
  const key = JSON.stringify(feed);
  if (key !== lastFeed) {
    const fresh = feed[0] && lastFeed && !lastFeed.includes(JSON.stringify(feed[0].text));
    lastFeed = key;
    $('p-feed').innerHTML = feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && view === 'play' && /^👑|^⏱️/.test(feed[0].text)) {
      banner(feed[0].text.replace(/^\S+\s/, ''));
      sfx.marker();
    }
  }
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.innerHTML = '<strong></strong>';
  el.querySelector('strong').textContent = text;
  el.className = 'ls-banner show big';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.className = 'ls-banner'; }, 2400);
}

// ---------- Het circuit live ----------

const racers = new Map();
let leaderId = null;

socket.on('rr-world', data => {
  offset = data.now - Date.now();
  const seen = new Set();
  for (const [id, name, dist, x, speed, color, flags] of data.players) {
    seen.add(id);
    const o = racers.get(id);
    if (o) {
      if (Math.abs(o.tdist - dist) > 4000) o.dist = dist;
      Object.assign(o, { tdist: dist, tx: x, speed, name, color, flags });
    } else {
      racers.set(id, { dist, tdist: dist, x, tx: x, speed, name, color, flags });
    }
  }
  for (const id of racers.keys()) if (!seen.has(id)) racers.delete(id);
  if (data.ranking && state) {
    leaderId = data.ranking[0] && data.ranking[0].id;
    renderSide(data.ranking, data.feed, data.bestLap);
  }
});

const canvas = $('p-map');
const ctx = canvas.getContext('2d');
function resize() {
  const box = canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = box.clientWidth;
  const h = box.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (view !== 'play' || !state) return;
  if (!canvas.width) resize();
  const W = canvas.width;
  const H = canvas.height;
  for (const o of racers.values()) {
    o.tdist += o.speed * dt;
    o.dist += o.speed * dt + (o.tdist - o.dist) * Math.min(1, dt * 4);
    o.x += (o.tx - o.x) * Math.min(1, dt * 6);
  }
  const list = [...racers.entries()].map(([id, o]) => ({ dist: o.dist, x: o.x, speed: o.speed, color: o.color, name: o.name, flags: o.flags, lead: id === leaderId }));
  RaceDraw.board(ctx, W, H, list, now / 1000);
}
requestAnimationFrame(frame);

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

$('start').addEventListener('click', () => socket.emit('rr-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('De race nu beëindigen en de eindstand tonen?')) socket.emit('rr-finish');
});
$('restart').addEventListener('click', () => socket.emit('rr-restart'));
$('close').addEventListener('click', () => socket.emit('rr-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('De race stoppen en terug naar het begin?')) return;
  socket.emit('rr-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('De race is gestopt.');
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
  const laps = p => `${p.progress.toFixed(1).replace('.', ',')} ronden`;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${laps(p)}</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span class="muted">${p.bestLap ? `⏱️ ${secs(p.bestLap)} s` : ''}</span><span class="pts">${laps(p)}</span></li>`).join('');
  const rise = (n, delay) => setTimeout(() => document.querySelector(`.pillar.p${n}`)?.classList.add('up'), delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}
