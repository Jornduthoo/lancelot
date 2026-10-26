// Robomol op het bord: hetzelfde burchtplein met dezelfde mollen als op de toestellen van de leerlingen.
// Wie een mol als eerste mept, zie je met naam en kleur. Gebruikt sfx, confetti en loadGame uit fx.js,
// quizMakerUrl uit quiz-links.js, AK, MoWorld en MoDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
let moles = [];
let first = 0;
const bonked = new Map(); // mol-id -> { n, pts, at }

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
    loadGame('mo-load', { file: q.file, minutes: Number($('mo-minutes').value), tempo: $('mo-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('mo-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Robomol · ${s.title}` : 'Robomol';
  if (!prev || prev.run !== s.run || prev.seed !== s.seed) { bonked.clear(); first = 0; moles = s.active ? MoWorld.schedule(s.seed, s.minutes * 60000) : []; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    total(s.total);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('mo-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const at = Date.now() + offset - state.startedAt;
  for (const [id, n, pts] of msg.b || []) {
    if (bonked.has(id)) continue;
    bonked.set(id, { n, pts, at });
    const m = moles[id], who = roster.get(n);
    if (!m || !who) continue;
    const [x, y] = scene.target(m.hole);
    const o = scene.holes[m.hole];
    if (m.type === 'bom') {
      fx.shock(x, y, o.scale * 1.1, '#ff4d6d', .6);
      fx.burst(x, y, { n: 30, color: '#ff8c42', speed: o.scale * 4, life: .7, size: 5 });
      fx.smoke(x, y, { n: 8, size: o.scale * .3, speed: o.scale });
      fx.pop(x, y - o.scale * .5, `💣 ${who.name}`, '#ff4d6d', Math.max(20, o.scale * .32));
      sfx.boom();
    } else {
      fx.shock(x, y, o.scale * .6, who.color, .45);
      fx.sparks(x, y, { n: 14, color: who.color, speed: o.scale * 6 });
      fx.pop(x, y - o.scale * .55, `+${pts}`, pts >= 60 ? '#ffc94a' : '#ffffff', Math.max(18, o.scale * (pts >= 60 ? .45 : .34)));
      if (Math.random() < .5) sfx.marker();
    }
  }
  if (msg.total !== undefined) total(msg.total);
  if (msg.ranking) {
    state.ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function total(n) {
  $('p-alive').innerHTML = `<span class="mo-total">🔨 ${n || 0}</span> <small class="muted">mollen gemept door de klas</small>`;
}

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
    el.addEventListener('click', () => socket.emit('mo-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">🔨 ${r.kills}</small></span><b>${r.score}</b></li>`).join('');
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
const scene = new MoDraw.Scene({ board: true });
const fx = new AK.Particles();
let last = performance.now();
function frame(pt) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (pt - last) / 1000);
  last = pt;
  if (view !== 'play' || !state) return;
  const { w, h } = AK.fit(canvas, 1.25);
  scene.resize(w, h);
  const t = Date.now() + offset - state.startedAt;
  const res = MoWorld.active(moles, t, first);
  first = res.first;
  const list = [];
  for (const m of res.list) {
    const b = bonked.get(m.id);
    if (b) {
      if (m.type === 'bom') continue;
      const a = t - b.at, base = MoWorld.rise(m, b.at);
      const who = roster.get(b.n);
      list.push({ m, state: 'hit', r: a < 160 ? base : Math.max(0, base - (a - 160) / 300), squash: Math.max(0, 1 - a / 160), color: who && who.color, name: who ? who.name : '' });
    } else list.push({ m, state: '', r: MoWorld.rise(m, t), squash: 0 });
  }
  scene.draw(ctx, pt / 1000, list);
  fx.update(dt);
  fx.draw(ctx);
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = h * .012;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(String(Math.ceil(wait / 1000)), w / 2, h / 2 + h * .05);
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

$('start').addEventListener('click', () => socket.emit('mo-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('mo-finish');
});
$('restart').addEventListener('click', () => socket.emit('mo-restart'));
$('close').addEventListener('click', () => socket.emit('mo-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('mo-stop', null, res => {
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
  const kills = s.ranking.reduce((a, r) => a + r.kills, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} is de beste mollenmepper!` : 'Robomol is voorbij';
  $('w-why').textContent = `Samen ${kills} robotmollen gemept en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🔨 ${p.kills} · 👑 ${p.golds} · 🔥 reeks ${p.bestCombo} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
