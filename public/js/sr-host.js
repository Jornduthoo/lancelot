// Strijdrossen op het bord: de hele arena live (of de leider in 3D), de stand, wie wie uitschakelt en het podium.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js, SrWorld, SrDraw en Sr3D.
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
    loadGame('sr-load', { file: q.file, minutes: Number($('sr-minutes').value), mode: $('sr-mode').value, tempo: $('sr-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('sr-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Strijdrossen · ${s.title}` : 'Strijdrossen';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (view !== 'play') { lasers.clear(); players.clear(); }
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
    el.addEventListener('click', () => socket.emit('sr-team', el.dataset.id));
    el.querySelector('.x').addEventListener('click', e => { e.stopPropagation(); socket.emit('sr-kick', el.dataset.id); });
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
  $('p-rank').innerHTML = top.map((r, i) => `<li><span class="pos">${i + 1}</span><span class="dot" style="background:${SrDraw.colorOf(r.team, r.color)}"></span>
    <span class="who">${esc(r.name)}</span><span class="fl">⚔️ ${r.kills}</span><span class="en">${r.score} p</span></li>`).join('')
    + (ranking.length > 10 ? `<li class="more">+ ${ranking.length - 10} ridders</li>` : '');
  const key = JSON.stringify(feed);
  if (key !== lastFeed) {
    const fresh = feed[0] && (!lastFeed || !lastFeed.includes(JSON.stringify(feed[0].text)));
    lastFeed = key;
    $('p-feed').innerHTML = feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && view === 'play' && feed[0].big && /^🔥|^🎯/.test(feed[0].text)) banner(feed[0].text.replace(/^\S+\s/, ''));
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
const lasers = new Map();
let rockets = [];
let mines = [];

socket.on('sr-world', data => {
  offset = data.now - Date.now();
  SrDraw.sync(players, data);
  rockets = data.rockets.map(([id, x, y, a, n]) => ({ id, x, y, a, n }));
  mines = data.mines.map(([id, x, y, n, armed]) => ({ id, x, y, n, armed }));
  if (data.score) renderScore(data.score);
  if (data.ranking && state) {
    state.ranking = data.ranking;
    renderSide(data.ranking, data.feed);
  }
});

const colorOfN = n => {
  const o = players.get(n);
  return o ? SrDraw.colorOf(o.team, o.color) : '#fff';
};
socket.on('sr-shot', s => SrDraw.addLaser(lasers, s, SrDraw.colorOf(s.team, s.color)));
socket.on('sr-pop', ids => { for (const id of ids) lasers.delete(id); });
socket.on('sr-hit', h => {
  const color = h.blocked ? '#4cc9ff' : '#ffe08a';
  SrDraw.burst(h.x, h.y, color, h.blocked ? 6 : 12);
  Sr3D.spark(h.x, h.y, color);
});
socket.on('sr-boom', b => {
  SrDraw.boom(b.x, b.y, b.r);
  Sr3D.boom(b.x, b.y, b.r * 1.6);
});
socket.on('sr-ko', k => {
  const color = colorOfN(k.victim);
  SrDraw.burst(k.x, k.y, color, 28, 420);
  SrDraw.ring(k.x, k.y, color, 130);
  Sr3D.boom(k.x, k.y, 160);
  sfx.boom();
});

// De camera van het bord: de hele arena, of achter de leider in 3D.
let follow = false;
let camA = 0;
$('p-cam').addEventListener('click', () => {
  follow = !follow;
  $('p-cam').textContent = follow ? '🗺️ Hele arena' : '🎥 Volg de leider';
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
  const scale = Math.min(canvas.width / SrWorld.W, canvas.height / SrWorld.H);
  cam = { scale, x: -(canvas.width / scale - SrWorld.W) / 2, y: -(canvas.height / scale - SrWorld.H) / 2 };
}
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (view !== 'play' || !state) return;
  if (!canvas.width) resize();
  SrDraw.glide(players);
  SrDraw.flyRockets(rockets, dt);
  const teams = state.mode === 'teams';
  const top = [...players.values()].reduce((m, o) => (o.streak >= 3 && (!m || o.streak > m.streak) ? o : m), null);
  // De leider: de meeste punten, en die nog in de arena rijdt.
  const ranking = state.ranking || [];
  const leaderN = (ranking.find(r => { const o = players.get(r.n); return o && !(o.flags & 1); }) || {}).n;
  const leader = players.get(leaderN);
  if (follow && leader) {
    let da = leader.a - camA;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    camA += da * Math.min(1, dt * 5);
    const others = [...players.values()].filter(o => o !== leader && !(o.flags & 1)).map(o => ({
      ...o, color: SrDraw.colorOf(o.team, o.color), av: typeof Avatar !== 'undefined' ? Avatar.byName(o.name) : null,
    }));
    Sr3D.render(ctx, canvas.width, canvas.height, {
      me: leader, a: camA, teams, t: now / 1000, dt, boost: leader.v > SrWorld.CAR.max + 20,
      self: { color: SrDraw.colorOf(leader.team, leader.color), av: typeof Avatar !== 'undefined' ? Avatar.byName(leader.name) : null, boost: leader.v > SrWorld.CAR.max + 20, bubble: leader.flags & 6, asking: leader.flags & 4 },
      others,
      lasers: [...lasers.values()],
      rockets: rockets.map(r => ({ ...r, color: colorOfN(r.n) })),
      mines: mines.map(m => ({ ...m, color: colorOfN(m.n) })),
    });
    SrDraw.moveLasers(lasers, dt);
    const mw = Math.min(canvas.width * .24, 320);
    SrDraw.minimap(ctx, canvas.width - mw - 12, 12, mw, { players, me: leader.n });
    ctx.font = `800 ${Math.round(canvas.height / 28)}px 'Orbitron', 'Exo 2', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5, 8, 20, .7)';
    const label = `🎥 ${leader.name}`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(12, 12, tw + 24, canvas.height / 18);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(label, 24, 12 + canvas.height / 26);
  } else {
    SrDraw.scene(ctx, cam, canvas.width, canvas.height, { players, lasers, rockets, mines, teams, me: -1, t: now / 1000, top: top ? top.n : -1 }, dt);
  }
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

$('start').addEventListener('click', () => socket.emit('sr-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu beëindigen en de eindstand tonen?')) socket.emit('sr-finish');
});
$('restart').addEventListener('click', () => socket.emit('sr-restart'));
$('close').addEventListener('click', () => socket.emit('sr-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('sr-stop', null, res => {
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
    : 'De beste strijdrossen';
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
