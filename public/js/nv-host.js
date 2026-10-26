// Neonvlucht op het bord: de camera volgt de koploper door de neonburcht, de anderen lopen als schimmen mee.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, NvWorld en NvDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
const runners = new Map(); // n -> { z, lane, x, v, t, flags, coins, mult }
let leaderN = -1;
let roster = new Map();

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
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
    loadGame('nv-load', { file: q.file, minutes: Number($('nv-minutes').value), tempo: $('nv-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('nv-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Neonvlucht · ${s.title}` : 'Neonvlucht';
  if (prev && prev.run !== s.run) { runners.clear(); leaderN = -1; }
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

socket.on('nv-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now();
  let best = null;
  for (const [n, z, lane, mult, flags, coins] of msg.r) {
    let o = runners.get(n);
    if (!o) { o = { z, lane, x: NvWorld.LANE_X[lane], v: 0, t }; runners.set(n, o); }
    o.v = Math.max(0, Math.min(45, (z - o.z) / Math.max(.05, (t - o.t) / 1000)));
    Object.assign(o, { z, lane, t, flags, coins, mult });
    if (!best || z > best.z) best = { n, z };
  }
  if (best) {
    if (best.n !== leaderN && leaderN >= 0 && roster.size > 1) {
      const who = roster.get(best.n);
      if (who && best.z > 50) { banner(`⚡ ${who.name} neemt de leiding!`); sfx.whoosh(); }
    }
    leaderN = best.n;
    const who = roster.get(best.n);
    $('p-alive').textContent = who ? `🏃 ${who.name} · ${Math.round(best.z)} m` : '';
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
  $('player-word').textContent = list.length === 1 ? 'loper' : 'lopers';
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
    el.addEventListener('click', () => socket.emit('nv-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">×${r.mult}</small></span><b>${r.score}</b></li>`).join('');
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
  const { w, h } = AK.fit(canvas, 1.25);
  // De camera volgt de koploper; de anderen lopen als schimmen mee.
  const ghosts = [];
  let me = null;
  for (const [n, o] of runners) {
    const who = roster.get(n);
    if (!who) continue;
    const z = o.z + o.v * Math.min(.4, (t - o.t) / 1000);
    o.x += (NvWorld.LANE_X[o.lane] - o.x) * Math.min(1, dt * 10);
    const r = { x: o.x, y: o.flags & 4 ? .6 : 0, z, color: who.color, name: who.name, coins: o.coins, stride: z * 1.15, turbo: o.flags & 1 };
    if (n === leaderN) me = { ...r, name: `👑 ${who.name}` };
    else ghosts.push({ ...r, alpha: .55 });
  }
  NvDraw.render(ctx, w, h, { z: me ? me.z : 0, x: me ? me.x : 0, seed: state.seed, t: t / 1000, ghosts, me });
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

$('start').addEventListener('click', () => socket.emit('nv-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('nv-finish');
});
$('restart').addEventListener('click', () => socket.emit('nv-restart'));
$('close').addEventListener('click', () => socket.emit('nv-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('nv-stop', null, res => {
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
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const meters = s.ranking.reduce((a, r) => a + r.dist, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint de Neonvlucht!` : 'Neonvlucht is voorbij';
  $('w-why').textContent = `Samen ${meters} meter gerend en ${right} poorten juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🏃 ${p.dist} m · 🪙 ${p.coins} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
