// Bomber-Knight op het bord: de hele arena met alle ridders, mijnen en ontploffingen, en wie de meeste kristallen heeft.
// Gebruikt sfx, confetti uit fx.js, quizMakerUrl uit quiz-links.js, BomberDraw uit bk-draw.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let scene = null;

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

// Een mijn op een krat als logo bij de uitleg.
(function logo() {
  const c = $('logo-canvas');
  const g = c.getContext('2d');
  g.drawImage(BomberDraw.crate(150), 45, 70);
  g.drawImage(BomberDraw.glow('#ff6b3d', 90), 30, -10);
  g.drawImage(BomberDraw.mine(120, '#ffc94a'), 60, 10);
})();

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('bk-load', { file: q.file, minutes: Number($('bk-minutes').value), tempo: $('bk-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
  remove: q => {
    if (!confirm(`"${q.title}" verwijderen?`)) return;
    socket.emit('delete', q.file, res => { $('load-error').textContent = res.error || ''; });
  },
});

socket.on('bk-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Bomber-Knight · ${s.title}` : 'Bomber-Knight';
  if (s.arena) scene = BomberDraw.fromState(s, scene);
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (!prev || prev.phase !== 'play') sfx.go();
    show('play');
    renderSide(s.ranking, s.feed);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

let lastBoom = 0;
socket.on('bk-tick', msg => {
  if (!scene || !state || state.phase !== 'play') return;
  const events = BomberDraw.apply(scene, msg);
  if (events.some(e => e[0] === 'x') && performance.now() - lastBoom > 120) {
    lastBoom = performance.now();
    sfx.boom();
  }
  if (msg.ranking) state.ranking = msg.ranking;
  if (msg.feed) state.feed = msg.feed;
  if (msg.ranking || msg.feed) renderSide(state.ranking, state.feed);
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
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
    el.addEventListener('click', () => socket.emit('bk-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 10).map(r => `<li><i class="bb-dot" style="background:${BomberDraw.COLORS[r.color]}"></i><span data-av="${esc(r.name)}">${esc(r.name)}</span><b>${r.crystals} 💎</b></li>`).join('');
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${esc(f.text)}</li>`).join('');
  }
}

// ---------- De arena tekenen ----------

const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
function frame() {
  requestAnimationFrame(frame);
  if (view !== 'play' || !scene || !scene.arena) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.round(r.width * dpr));
  const h = Math.max(200, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const tile = Math.floor(Math.min(w / scene.W, h / scene.H));
  const cam = { tile, ox: Math.round((w - tile * scene.W) / 2), oy: Math.round((h - tile * scene.H) / 2) };
  BomberDraw.scene(ctx, scene, cam, { names: true });
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

$('start').addEventListener('click', () => socket.emit('bk-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('bk-finish');
});
$('restart').addEventListener('click', () => socket.emit('bk-restart'));
$('close').addEventListener('click', () => socket.emit('bk-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('bk-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} wint Bomber-Knight!` : 'Bomber-Knight is voorbij';
  const kos = s.ranking.reduce((a, r) => a + r.kos, 0);
  const crates = s.ranking.reduce((a, r) => a + r.crates, 0);
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  $('w-why').textContent = `Samen ${right} vragen juist, ${crates} kratten opgeblazen en ${kos} keer raak.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${BomberDraw.COLORS[p.color]}"></i>${esc(p.name)}</span><span class="muted">💥 ${p.kos} · 📦 ${p.crates} · ✔ ${p.right}</span><span class="pts">${p.crystals} 💎</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
