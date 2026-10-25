// Poortwacht op het bord: de hele kaart met het pad, alle torens met de naam van hun bouwer, de monsters en de poort.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, PwWorld en PwDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let scene = new PwDraw.Scene();
let roster = new Map();

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
    loadGame('pw-load', { file: q.file, minutes: Number($('pw-minutes').value), tempo: $('pw-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

scene.onEvent = onEvent;
let lastShotSound = 0;
function onEvent(e) {
  const t = performance.now();
  if (e[0] === 'golf' && e[1] > 1) { banner(`⚔️ GOLF ${e[1]}`); sfx.gong(); }
  else if (e[0] === 'draak') { banner('🐉 DE DRAAK KOMT!'); sfx.drumroll(); }
  else if (e[0] === 'poort') sfx.hit();
  else if (e[0] === 'bliksem') sfx.boom();
  else if ((e[0] === 'c' || e[0] === 'k') && t - lastShotSound > 180) { lastShotSound = t; e[0] === 'c' ? sfx.whoosh() : sfx.marker(); }
}

socket.on('pw-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Poortwacht · ${s.title}` : 'Poortwacht';
  if (prev && prev.run !== s.run) { scene = new PwDraw.Scene(); scene.onEvent = onEvent; }
  scene.setTowers(s.towers, s.slots);
  scene.gate = s.gate;
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

socket.on('pw-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  $('p-alive').textContent = `🏰 ${msg.gate} · ⚔️ ${scene.mons.size}`;
  if (msg.ranking) {
    state.ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'verdediger' : 'verdedigers';
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
    el.addEventListener('click', () => socket.emit('pw-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 12).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)}</span><b>${r.score}</b></li>`).join('');
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
  if (view !== 'play') return;
  scene.update(dt);
  const { w, h } = AK.fit(canvas, 1.5);
  PwDraw.render(ctx, scene, w, h, { roster, me: -1, labelPx: 15 * Math.min(1.5, devicePixelRatio || 1) });
  // Aftellen voor de start
  const wait = state ? state.startedAt - (Date.now() + offset) : 0;
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc94a';
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
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('pw-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('pw-finish');
});
$('restart').addEventListener('click', () => socket.emit('pw-restart'));
$('close').addEventListener('click', () => socket.emit('pw-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('pw-stop', null, res => {
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
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  $('w-title').textContent = s.won ? '🏆 De poort hield stand!' : '💥 De poort is gevallen…';
  $('w-why').textContent = `${s.won ? `Nog ${s.gate} van de ${PwWorld.GATE_HP} over. ` : 'Volgende keer meer goede antwoorden, sterkere torens! '}Samen ${right} vragen juist en ${s.kills} monsters verslagen.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">${AK.esc(p.tower)} · ⚔️ ${p.kills} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (s.won) { sfx.fanfare(); confetti(5000); } else sfx.bad();
}
