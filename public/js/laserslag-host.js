// Laserslag op het bord: de hele arena live, de teamstand, wie wie uitschakelt en het podium.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js, Arena en SlagDraw.
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
  if (name === 'play') resize();
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

// Vanaf de kaart Laserslag 3D op het startscherm staat first person al klaar.

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    socket.emit('ls-load', { file: q.file, minutes: Number($('ls-minutes').value), mode: $('ls-mode').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('ls-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Laserslag · ${s.title}` : 'Laserslag';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (view !== 'play') { bullets.clear(); players.clear(); }
    show('play');
    renderSide(s.ranking, s.feed);
    renderScore(s.score);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderPodium();
  }
});

// Wachtkamer: bij teams twee kolommen, klik op een naam om van team te wisselen.
function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n === 0;
  const teams = state.mode === 'teams';
  $('lobby-tip').textContent = teams ? 'Klik op een naam om die speler naar het andere team te sturen, ✕ om te verwijderen.' : 'Klik op ✕ om een speler te verwijderen.';
  const groups = teams ? [['rood', 'Team Rood'], ['blauw', 'Team Blauw']] : [[null, 'Ieder voor zich']];
  const before = new Set([...document.querySelectorAll('#teams .name')].map(el => el.dataset.id));
  $('teams').innerHTML = groups.map(([team, title]) => {
    const list = state.ranking.filter(p => !teams || p.team === team);
    return `<div class="ls-team ${team || 'ieder'}"><h3>${title} <span class="muted">· ${list.length}</span></h3><div class="names">${
      list.map(p => `<span class="name" data-id="${esc(p.id)}">${esc(p.name)}<button class="x" title="Verwijderen">✕</button></span>`).join('')}</div></div>`;
  }).join('');
  for (const el of document.querySelectorAll('#teams .name')) {
    el.addEventListener('click', () => socket.emit('ls-team', el.dataset.id));
    el.querySelector('.x').addEventListener('click', e => { e.stopPropagation(); socket.emit('ls-kick', el.dataset.id); });
    if (prev && prev.phase === 'lobby' && !before.has(el.dataset.id)) sfx.join();
  }
}

function renderScore(score) {
  if (!state) return;
  $('p-score').innerHTML = state.mode === 'teams'
    ? `<span class="r">${score.rood}</span><span class="vs">ROOD · BLAUW</span><span class="b">${score.blauw}</span>`
    : '';
}

let lastFeed = '';
function renderSide(ranking, feed) {
  const teams = state.mode === 'teams';
  const top = ranking.slice(0, 10);
  $('p-rank').innerHTML = top.map((r, i) => `<li><span class="pos">${i + 1}</span><span class="dot" style="background:${SlagDraw.colorOf(r.team, r.color)}"></span>
    <span class="who">${esc(r.name)}</span><span class="fl">⚔️ ${r.kills}</span><span class="en">${r.score} p</span></li>`).join('')
    + (ranking.length > 10 ? `<li class="more">+ ${ranking.length - 10} ridders</li>` : '');
  const key = JSON.stringify(feed);
  if (key !== lastFeed) {
    const fresh = feed[0] && (!lastFeed || !lastFeed.includes(JSON.stringify(feed[0].text)));
    lastFeed = key;
    $('p-feed').innerHTML = feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && view === 'play' && /^🔥|^🎯/.test(feed[0].text)) banner(feed[0].text.replace(/^\S+\s/, ''));
  }
  if (!teams) $('p-score').innerHTML = '';
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.innerHTML = '<strong></strong>';
  el.querySelector('strong').textContent = text;
  el.className = 'ls-banner show big';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.className = 'ls-banner'; }, 2200);
}

// ---------- De arena live ----------

const players = new Map();
const bullets = new Map();
let crystal = null;

socket.on('ls-world', data => {
  offset = data.now - Date.now();
  crystal = data.crystal;
  const seen = new Set();
  for (const [id, name, x, y, a, team, color, hp, flags, kills, streak] of data.players) {
    seen.add(id);
    const o = players.get(id);
    if (o) {
      if (Math.hypot(o.tx - x, o.ty - y) > 200) { o.x = x; o.y = y; }
      Object.assign(o, { tx: x, ty: y, ta: a, name, team, color, hp, flags, kills, streak });
    } else {
      players.set(id, { x, y, a, tx: x, ty: y, ta: a, name, team, color, hp, flags, kills, streak });
    }
  }
  for (const id of players.keys()) if (!seen.has(id)) players.delete(id);
  if (data.score) renderScore(data.score);
  if (data.ranking && state) renderSide(data.ranking, data.feed);
});

socket.on('ls-shot', s => SlagDraw.addBullet(bullets, s, SlagDraw.colorOf(s.team, s.color)));
socket.on('ls-pop', ids => { for (const id of ids) bullets.delete(id); });
socket.on('ls-hit', h => SlagDraw.burst(h.x, h.y, h.blocked ? '#4cc9ff' : '#ffe08a', h.blocked ? 6 : 12));
socket.on('ls-ko', k => {
  const o = players.get(k.victim);
  const color = o ? SlagDraw.colorOf(o.team, o.color) : '#fff';
  SlagDraw.burst(k.x, k.y, color, 28, 380);
  SlagDraw.ring(k.x, k.y, color);
  sfx.boom();
});

const canvas = $('p-arena');
const ctx = canvas.getContext('2d');
let cam = { x: 0, y: 0, scale: 1 };
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
  const scale = Math.min(canvas.width / Arena.W, canvas.height / Arena.H);
  cam = { scale, x: -(canvas.width / scale - Arena.W) / 2, y: -(canvas.height / scale - Arena.H) / 2 };
}
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (view !== 'play' || !state) return;
  if (!canvas.width) resize();
  const t = (Date.now() + offset - state.startedAt) / 1000;
  const s = cam.scale;
  const sx = x => (x - cam.x) * s;
  const sy = y => (y - cam.y) * s;
  SlagDraw.arena(ctx, cam, canvas.width, canvas.height);
  if (crystal) SlagDraw.crystal(ctx, sx(crystal.x), sy(crystal.y), s * 1.2, t);
  SlagDraw.moveBullets(bullets, dt);
  for (const b of bullets.values()) SlagDraw.bullet(ctx, sx(b.x), sy(b.y), b.a, b.color, s * 1.2);
  const top = [...players.values()].reduce((m, o) => (o.streak >= 3 && (!m || o.streak > m.streak) ? o : m), null);
  for (const o of players.values()) {
    o.x += (o.tx - o.x) * Math.min(1, dt * 14);
    o.y += (o.ty - o.y) * Math.min(1, dt * 14);
    let da = o.ta - o.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    o.a += da * Math.min(1, dt * 14);
    if (o.flags & 1) continue;
    const color = SlagDraw.colorOf(o.team, o.color);
    SlagDraw.knight(ctx, sx(o.x), sy(o.y), o.a, color, s * 1.3, { bubble: o.flags & 6, asking: o.flags & 4, armor: o.flags & 32 });
    SlagDraw.tag(ctx, sx(o.x), sy(o.y), o.name, o.hp, color, Math.max(s * 1.3, .9), o === top ? '🎯' : o.flags & 4 ? '⚡' : '');
  }
  SlagDraw.effects(ctx, cam, dt);
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

$('start').addEventListener('click', () => socket.emit('ls-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu beëindigen en de eindstand tonen?')) socket.emit('ls-finish');
});
$('restart').addEventListener('click', () => socket.emit('ls-restart'));
$('close').addEventListener('click', () => socket.emit('ls-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('ls-stop', null, res => {
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
  const w = state.winner;
  $('podium-title').textContent = state.mode === 'teams'
    ? (w === 'gelijk' ? `Gelijkspel! ${state.score.rood} – ${state.score.blauw}` : `Team ${w === 'rood' ? 'Rood' : 'Blauw'} wint met ${Math.max(state.score.rood, state.score.blauw)} – ${Math.min(state.score.rood, state.score.blauw)}!`)
    : 'De beste ridders';
  const ranking = state.ranking;
  const [p1, p2, p3] = ranking;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${p.score} p · ⚔️ ${p.kills}</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span class="muted">⚔️ ${p.kills}</span><span class="pts">${p.score}</span></li>`).join('');
  const rise = (n, delay) => setTimeout(() => document.querySelector(`.pillar.p${n}`)?.classList.add('up'), delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}
