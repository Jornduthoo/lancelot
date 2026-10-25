// Gauntlet op het bord: voor elke ploeg een venster in haar kerker, en welke ploeg het diepst zit.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, GtWorld en GtDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const { CLASSES } = GtWorld;
let state = null;
let prev = null;
let offset = 0;
const scenes = new Map(); // ploeg -> GtDraw.Scene
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
    loadGame('gt-load', { file: q.file, minutes: Number($('gt-minutes').value), tempo: $('gt-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

function scene(id) {
  let s = scenes.get(id);
  if (!s) {
    s = new GtDraw.Scene();
    s.onEvent = e => {
      if (e[0] === 'uit') { sfx.fanfare(); banner(id, `NIVEAU ${e[1]} GEHAALD!`); }
      if (e[0] === 'poort') sfx.boom();
      if (e[0] === 'wipe') banner(id, 'GEVELD…');
    };
    scenes.set(id, s);
  }
  return s;
}

socket.on('gt-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Gauntlet · ${s.title}` : 'Gauntlet';
  if (!prev || prev.run !== s.run) { scenes.clear(); $('p-grid').innerHTML = ''; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (!prev || prev.phase !== 'play') sfx.go();
    show('play');
    buildGrid();
    renderSide(s.ranking, s.feed);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('gt-level', msg => {
  scene(msg.team).level(msg);
  buildGrid();
});

socket.on('gt-tick', msg => {
  if (!state || state.phase !== 'play') return;
  for (const t of msg.teams) {
    const s = scenes.get(t.id);
    if (s && s.d) s.apply(t);
    tiles.get(t.id) && updateTile(t);
  }
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
  const key = list.map(r => `${r.id}:${r.cls}`).join('|');
  if (box.dataset.key === key) return;
  const before = box.children.length;
  box.dataset.key = key;
  box.innerHTML = '';
  for (const p of list) {
    const el = document.createElement('span');
    el.className = 'name';
    el.style.setProperty('--cape', CLASSES[p.cls].color);
    el.textContent = `${CLASSES[p.cls].icon} ${p.name}`;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('gt-kick', p.id));
    box.appendChild(el);
  }
  if (list.length > before && prev && prev.phase === 'lobby') sfx.join();
}

// ---------- Een venster per ploeg ----------
const tiles = new Map();
function buildGrid() {
  if (!state || !state.teams) return;
  const grid = $('p-grid');
  grid.dataset.n = Math.min(9, state.teams.length);
  for (const t of state.teams) {
    if (tiles.has(t.id) && grid.contains(tiles.get(t.id).el)) continue;
    const el = document.createElement('div');
    el.className = 'gt-tile';
    el.style.setProperty('--team', t.color);
    el.innerHTML = `<canvas></canvas><div class="gt-tile-head"><strong>${AK.esc(t.name)}</strong><span class="lv"></span><span class="gold"></span></div><div class="gt-tile-hp"></div><div class="gt-tile-banner hidden"></div>`;
    grid.appendChild(el);
    tiles.set(t.id, { el, canvas: el.querySelector('canvas'), cam: null });
    scene(t.id);
  }
}

function updateTile(t) {
  const tile = tiles.get(t.id);
  tile.el.querySelector('.lv').textContent = `Niveau ${t.lv}`;
  tile.el.querySelector('.gold').textContent = `${t.g} 💰`;
  const hp = t.k.map(k => {
    const r = roster.get(k[0]) || {};
    const c = CLASSES[r.cls] || CLASSES.paladijn;
    return `<span class="${k[5] & 1 ? 'down' : ''}" title="${AK.esc(r.name || '')}">${c.icon}<i style="width:${k[4]}%"></i></span>`;
  }).join('');
  const box = tile.el.querySelector('.gt-tile-hp');
  if (box.dataset.key !== hp) { box.dataset.key = hp; box.innerHTML = hp; }
}

const bannerTimers = new Map();
function banner(id, text) {
  const tile = tiles.get(id);
  if (!tile) return;
  const el = tile.el.querySelector('.gt-tile-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimers.get(id));
  bannerTimers.set(id, setTimeout(() => el.classList.add('hidden'), 2500));
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)}</span><b>niv. ${r.level} · ${r.gold} 💰</b></li>`).join('');
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
}

// ---------- Tekenen ----------
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play') return;
  for (const [id, tile] of tiles) {
    const s = scenes.get(id);
    if (!s || !s.d) continue;
    s.update(dt);
    const { w, h, dpr } = AK.fit(tile.canvas, 1.5);
    // De camera volgt het midden van de ploeg, en zoomt uit als ze ver uit elkaar lopen.
    let sx = 0, sy = 0, n = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const kid of s.knights.ids()) {
      const k = s.knights.get(kid, t);
      if (!k || (k[4] & 1)) continue;
      sx += k[0]; sy += k[1]; n++;
      minX = Math.min(minX, k[0]); maxX = Math.max(maxX, k[0]); minY = Math.min(minY, k[1]); maxY = Math.max(maxY, k[1]);
    }
    const want = n ? { x: sx / n, y: sy / n } : s.d.start;
    const spread = n ? Math.max(maxX - minX, (maxY - minY) * w / h) : 0;
    const zoom = Math.max(.35 * dpr, Math.min(1.1 * dpr, w / (Math.max(GtWorld.T * 10, spread + 420))));
    if (!tile.cam) tile.cam = { x: want.x, y: want.y, zoom };
    const k = Math.min(1, dt * 4);
    tile.cam.x += (want.x - tile.cam.x) * k;
    tile.cam.y += (want.y - tile.cam.y) * k;
    tile.cam.zoom += (zoom - tile.cam.zoom) * k;
    const ctx = tile.canvas.getContext('2d');
    GtDraw.render(ctx, s, { x: tile.cam.x, y: tile.cam.y, zoom: tile.cam.zoom, w, h }, { roster, light: .55 });
    const mw = Math.min(w * .26, 160 * dpr);
    GtDraw.minimap(ctx, s, w - mw - 8 * dpr, h - mw * s.d.H / s.d.W - 8 * dpr, mw, mw * s.d.H / s.d.W);
  }
}
requestAnimationFrame(frame);

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', !(wait > 0));
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);


$('start').addEventListener('click', () => socket.emit('gt-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('gt-finish');
});
$('restart').addEventListener('click', () => socket.emit('gt-restart'));
$('close').addEventListener('click', () => socket.emit('gt-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('gt-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} wint Gauntlet!` : 'Gauntlet is voorbij';
  const right = s.ranking.reduce((a, t) => a + t.players.reduce((b, p) => b + p.right, 0), 0);
  const kills = s.ranking.reduce((a, t) => a + t.kills, 0);
  $('w-why').textContent = `Samen ${right} vragen juist en ${kills} monsters verslagen.`;
  $('final').innerHTML = s.ranking.map((t, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${t.color}"></i>${AK.esc(t.name)} <small class="muted">${t.players.map(p => `${CLASSES[p.cls].icon} ${AK.esc(p.name)}`).join(' · ')}</small></span><span class="muted">niveau ${t.cleared} gehaald</span><span class="pts">${t.gold} 💰</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
