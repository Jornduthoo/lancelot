// Sterrenvreter op het bord: de ruimte-arena met het zwarte gat, alle ridderbollen met hun naam en de stand.
// De camera houdt alle ridders in beeld en zoomt in als ze dicht bij elkaar zitten.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, SvWorld en SvDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let scene = new SvDraw.Scene();
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
    loadGame('sv-load', { file: q.file, minutes: Number($('sv-minutes').value), tempo: $('sv-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

scene.onEvent = onEvent;
function onEvent(e) {
  if (e[0] === 'slok') {
    sfx.boom();
    const a = roster.get(e[1]);
    if (a && e[5] >= 80) banner(`🌀 ${a.name} slokt een grote ridder op!`);
  } else if (e[0] === 'kroon') {
    const k = roster.get(e[1]);
    if (k && roster.size > 1) { sfx.fanfare(); banner(`👑 ${k.name} draagt de kroon`); }
  } else if (e[0] === 'nova') sfx.boom();
  else if (e[0] === 'gat' && e[2] >= 40) sfx.hit();
}

socket.on('sv-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  scene.R = s.R;
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Sterrenvreter · ${s.title}` : 'Sterrenvreter';
  if (prev && prev.run !== s.run) { scene = new SvDraw.Scene(); scene.onEvent = onEvent; scene.R = s.R; cam = null; }
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

socket.on('sv-dust', msg => scene.setDust(msg));

socket.on('sv-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  $('p-alive').textContent = `🕳️ zwart gat ${msg.bh}`;
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
    el.addEventListener('click', () => socket.emit('sv-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  const king = scene.king;
  const byMass = (ranking || []).slice().sort((a, b) => b.m - a.m);
  $('p-top').innerHTML = byMass.slice(0, 12).map(r => `<li class="${r.alive ? '' : 'muted'}"><i class="bb-dot" style="background:${r.color}"></i><span>${r.n === king ? '👑 ' : ''}${AK.esc(r.name)}</span><b>${r.alive ? r.m : '🌀'}</b></li>`).join('');
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
  // De camera houdt alle ridders en het gat in beeld, maar nooit meer dan de hele arena.
  let minX = -scene.bhShown * 2, maxX = scene.bhShown * 2, minY = minX, maxY = maxX;
  for (const id of scene.orbs.ids()) {
    const k = scene.orbs.get(id, t);
    if (!k) continue;
    const r = SvWorld.radius(k[3]);
    minX = Math.min(minX, k[0] - r); maxX = Math.max(maxX, k[0] + r); minY = Math.min(minY, k[1] - r); maxY = Math.max(maxY, k[1] + r);
  }
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
  SvDraw.render(ctx, scene, { x: cam.x, y: cam.y, zoom: cam.zoom, w, h }, { roster, board: true });
  const ms = Math.min(w * .16, 220);
  SvDraw.minimap(ctx, scene, w - ms - 14, 14, ms, null, roster);
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
  if (left < 60000 && left > 59000 && !state.warned) { state.warned = true; banner('🕳️ EINDSTORM! Het zwarte gat groeit!'); sfx.go(); }
}, 200);


$('start').addEventListener('click', () => socket.emit('sv-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('sv-finish');
});
$('restart').addEventListener('click', () => socket.emit('sv-restart'));
$('close').addEventListener('click', () => socket.emit('sv-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('sv-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} is de grootste Sterrenvreter!` : 'Sterrenvreter is voorbij';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const eats = s.ranking.reduce((a, r) => a + r.eats, 0);
  $('w-why').textContent = `Samen ${right} vragen juist en ${eats} ridders opgeslokt.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🌑 ${p.peak} · 🌀 ${p.eats} · 👑 ${p.king}s · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
