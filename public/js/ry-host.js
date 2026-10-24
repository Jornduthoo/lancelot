// Ridder-Royale op het bord: de hele arena met de storm, alle ridders (ook in de struiken) en de stand met kronen.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, RyWorld en RyDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let scene = new RyDraw.Scene();
let roster = new Map();
let cam = null;

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
    loadGame('ry-load', { file: q.file, minutes: Number($('ry-minutes').value), tempo: $('ry-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

scene.onEvent = onEvent;
function onEvent(e) {
  if (e[0] === 'uit') sfx.boom();
  else if (e[0] === 'start') { sfx.go(); banner('VECHT!'); }
  else if (e[0] === 'ronde') {
    const win = roster.get(e[1]);
    sfx.fanfare();
    banner(win ? `👑 ${win.name} wint ronde ${scene.roundNo}!` : '🌀 De storm wint deze ronde');
    if (win) confetti(2500);
  }
}

socket.on('ry-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Ridder-Royale · ${s.title}` : 'Ridder-Royale';
  if (prev && prev.run !== s.run) { scene = new RyDraw.Scene(); scene.onEvent = onEvent; cam = null; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('ry-round', msg => {
  scene.round(msg);
  cam = null;
  $('p-round').textContent = `Ronde ${msg.round}`;
});

socket.on('ry-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  $('p-alive').textContent = `${msg.al} ${msg.al === 1 ? 'ridder' : 'ridders'} over`;
  if (msg.ranking) {
    state.ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'ridder' : 'ridders';
  $('start').disabled = list.length === 0;
  const box = $('names');
  const current = new Set(list.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of list) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.style.setProperty('--cape', p.color);
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('ry-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 12).map(r => `<li class="${r.alive ? '' : 'muted'}"><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)}${r.crowns ? ` ${'👑'.repeat(Math.min(3, r.crowns))}${r.crowns > 3 ? `×${r.crowns}` : ''}` : ''}</span><b>${r.score}</b></li>`).join('');
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !scene.ar) return;
  scene.update(dt);
  const { w, h } = AK.fit(canvas, 1.5);
  // De camera houdt de storm en alle ridders in beeld.
  const zn = scene.zone(t);
  let minX = zn.x - zn.r, maxX = zn.x + zn.r, minY = zn.y - zn.r, maxY = zn.y + zn.r;
  for (const id of scene.knights.ids()) {
    const k = scene.knights.get(id, t);
    if (!k || (k[4] & 1)) continue;
    minX = Math.min(minX, k[0]); maxX = Math.max(maxX, k[0]); minY = Math.min(minY, k[1]); maxY = Math.max(maxY, k[1]);
  }
  const pad = 120;
  const want = {
    x: (minX + maxX) / 2, y: (minY + maxY) / 2,
    zoom: Math.min(w / (maxX - minX + pad * 2), h / (maxY - minY + pad * 2), 1.6 * (w / 1400)),
  };
  if (!cam) cam = want;
  const k = Math.min(1, dt * 2);
  cam.x += (want.x - cam.x) * k;
  cam.y += (want.y - cam.y) * k;
  cam.zoom += (want.zoom - cam.zoom) * k;
  RyDraw.render(ctx, scene, { x: cam.x, y: cam.y, zoom: cam.zoom, w, h }, { roster, board: true });
  // Aftellen tot de ronde begint, en de pauze tussen twee rondes.
  const wait = scene.roundStart - t;
  if (scene.state === 'pauze' && wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc94a';
    ctx.shadowColor = '#ffc94a';
    ctx.shadowBlur = 30;
    ctx.fillText(String(Math.ceil(wait / 1000)), w / 2, h / 2 + h * .05);
    ctx.restore();
  }
}
requestAnimationFrame(frame);

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 30000);
}, 200);

// Ridders die rond elkaar cirkelen op het introscherm.
(function intro() {
  const c = $('intro');
  const ictx = c.getContext('2d');
  const colors = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80'];
  (function loop(t) {
    if (view === 'setup') {
      ictx.clearRect(0, 0, c.width, c.height);
      ictx.strokeStyle = '#e07bff';
      ictx.lineWidth = 3;
      ictx.shadowColor = '#c77dff';
      ictx.shadowBlur = 12;
      ictx.beginPath();
      ictx.arc(110, 70, 58 + Math.sin(t / 900) * 6, 0, Math.PI * 2);
      ictx.stroke();
      ictx.shadowBlur = 0;
      colors.forEach((col, i) => {
        const a = t / 1400 + (i * Math.PI) / 2;
        AK.knight(ictx, 110 + Math.cos(a) * 38, 70 + Math.sin(a) * 30, a + Math.PI / 2, { r: 14, color: col, kind: 'royale', t: t / 1000, moving: true });
      });
    }
    requestAnimationFrame(loop);
  })(0);
})();

$('start').addEventListener('click', () => socket.emit('ry-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('ry-finish');
});
$('restart').addEventListener('click', () => socket.emit('ry-restart'));
$('close').addEventListener('click', () => socket.emit('ry-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('ry-stop', null, res => {
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
  const top = s.ranking[0];
  $('w-title').textContent = top ? `🏆 ${top.name} wint Ridder-Royale!` : 'Ridder-Royale is voorbij';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  $('w-why').textContent = `${s.round} ${s.round === 1 ? 'ronde' : 'rondes'} gespeeld · samen ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">👑 ${p.crowns} · ⚔️ ${p.elims} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
