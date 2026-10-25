// Ridderslang op het bord: de burchtarena met alle lansslangen, hun namen en de stand.
// De camera houdt alle slangen in beeld en zoomt in als ze dicht bij elkaar zitten.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, RsWorld en RsDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let scene = new RsDraw.Scene();
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
    loadGame('rs-load', { file: q.file, minutes: Number($('rs-minutes').value), tempo: $('rs-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

scene.onEvent = onEvent;
function onEvent(e) {
  if (e[0] === 'dood') {
    sfx.boom();
    const v = roster.get(e[1]), k = roster.get(e[2]);
    if (v && k && e[5] >= 80) banner(`⚔️ ${k.name} snijdt de lange slang van ${v.name} af!`);
  } else if (e[0] === 'kroon') {
    const k = roster.get(e[1]);
    if (k && roster.size > 1) { sfx.fanfare(); banner(`👑 ${k.name} is de langste slang`); }
  } else if (e[0] === 'schild') sfx.hit();
}

socket.on('rs-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  scene.R = s.R;
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Ridderslang · ${s.title}` : 'Ridderslang';
  if (prev && prev.run !== s.run) { scene = new RsDraw.Scene(); scene.onEvent = onEvent; scene.R = s.R; cam = null; }
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

socket.on('rs-world', msg => scene.setWorld(msg));

socket.on('rs-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  $('p-alive').textContent = `${msg.k.length} ${msg.k.length === 1 ? 'slang' : 'slangen'} in de arena`;
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
    el.addEventListener('click', () => socket.emit('rs-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  const king = scene.king;
  const byMass = (ranking || []).slice().sort((a, b) => (b.alive - a.alive) || b.L - a.L);
  $('p-top').innerHTML = byMass.slice(0, 12).map(r => `<li class="${r.alive ? '' : 'muted'}"><i class="bb-dot" style="background:${r.color}"></i><span>${r.n === king ? '👑 ' : ''}${AK.esc(r.name)}</span><b>${r.alive ? r.L : '💥'}</b></li>`).join('');
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
  // De camera houdt alle slangen in beeld (kop en lichaam), maar nooit meer dan de hele arena.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const path of scene.paths.values()) {
    for (let i = 0; i < path.length; i += 10) {
      minX = Math.min(minX, path[i]); maxX = Math.max(maxX, path[i]); minY = Math.min(minY, path[i + 1]); maxY = Math.max(maxY, path[i + 1]);
    }
  }
  if (minX === Infinity) { minX = minY = -600; maxX = maxY = 600; }
  const pad = 260;
  const R = scene.R + 60;
  minX = Math.max(-R, minX - pad); maxX = Math.min(R, maxX + pad); minY = Math.max(-R, minY - pad); maxY = Math.min(R, maxY + pad);
  const spanX = Math.max(1400, maxX - minX), spanY = Math.max(900, maxY - minY);
  const want = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: Math.min(w / spanX, h / spanY) };
  if (!cam) cam = want;
  const k = Math.min(1, dt * 1.5);
  cam.x += (want.x - cam.x) * k;
  cam.y += (want.y - cam.y) * k;
  cam.zoom += (want.zoom - cam.zoom) * k;
  RsDraw.render(ctx, scene, { x: cam.x, y: cam.y, zoom: cam.zoom, w, h }, { roster, board: true });
  const ms = Math.min(w * .16, 220);
  RsDraw.minimap(ctx, scene, w - ms - 14, 14, ms, null, roster);
  // Aftellen voor de start
  const wait = state ? state.startedAt - (Date.now() + offset) : 0;
  if (wait > 0) {
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
  $('p-clock').classList.toggle('low', left < 60000);
  if (left < 60000 && left > 59000 && !state.warned) { state.warned = true; banner('⏳ Nog één minuut!'); sfx.go(); }
}, 200);


$('start').addEventListener('click', () => socket.emit('rs-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('rs-finish');
});
$('restart').addEventListener('click', () => socket.emit('rs-restart'));
$('close').addEventListener('click', () => socket.emit('rs-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('rs-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} is de machtigste Ridderslang!` : 'Ridderslang is voorbij';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const kills = s.ranking.reduce((a, r) => a + r.kills, 0);
  $('w-why').textContent = `Samen ${right} vragen juist en ${kills} slangen afgesneden.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🐍 ${p.peak} · ⚔️ ${p.kills} · 👑 ${p.king}s · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
