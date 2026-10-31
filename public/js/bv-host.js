// Banierveld op het bord: het hele veld in één keer, met het land van elke ridder in zijn kleur, de lichtsporen en de ruiters.
// Rechts de stand (% land) en wat er gebeurt. Een grote verovering of een doorgesneden spoor geeft een flits op het veld.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, BvWorld en BvDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const colorOf = n => (roster.get(n) || {}).color;
let scene = new BvDraw.Scene(colorOf, 8);
const fx = new AK.Particles();

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
    loadGame('bv-load', { file: q.file, minutes: Number($('bv-minutes').value), tempo: $('bv-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('bv-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const before = roster.size;
  roster = new Map(s.roster.map(r => [r.n, r]));
  if (roster.size !== before) scene.recolor();
  const on = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Banierveld · ${s.title}` : 'Banierveld';
  if (prev && prev.run !== s.run) { scene = new BvDraw.Scene(colorOf, 8); scene.onEvent = onEvent; }
  if (!on) return show('setup');
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

socket.on('bv-world', msg => scene.setWorld(msg));
socket.on('bv-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  if (msg.ranking) {
    state.ranking = msg.ranking;
    if (msg.feed) state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

// Effecten op het veld (in vakjes; bij het tekenen omgerekend naar pixels)
const flashes = [];
function onEvent(e) {
  const G = scene.G;
  if (e[0] === 'cap' && e[2].length >= 30) {
    let sx = 0, sy = 0;
    for (let j = 0; j < e[2].length; j += 2) { sx += e[2][j] % G; sy += Math.floor(e[2][j] / G); }
    const m = e[2].length / 2;
    flashes.push({ x: sx / m, y: sy / m, t: performance.now() / 1000, color: colorOf(e[1]) || '#ffc94a', big: m });
    sfx.marker();
  } else if (e[0] === 'flits') {
    flashes.push({ x: e[3], y: e[4], t: performance.now() / 1000, color: '#ffffff', cut: true });
    sfx.boom();
  }
}
scene.onEvent = onEvent;

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
    el.addEventListener('click', () => socket.emit('bv-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

const pctText = v => `${String(v).replace('.', ',')} %`;
let lastFeed = '';
let lastTop = '';
function renderSide(ranking, feed) {
  const top = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">⚔️ ${r.cuts}</small></span><b>${pctText(r.land)}</b></li>`).join('');
  if (top !== lastTop) { lastTop = top; $('p-top').innerHTML = top; }
  const taken = (ranking || []).reduce((a, r) => a + r.land, 0);
  $('p-alive').textContent = `🏴 ${pctText(Math.round(taken * 10) / 10)} van het veld veroverd`;
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const { w, h, dpr } = AK.fit(canvas, 1.25);
  const sec = t / 1000;
  const G = scene.G || state.G;
  const s = Math.min(w, h) / (G + 3);
  const cam = { x: G / 2, y: G / 2, s, w, h };
  BvDraw.render(ctx, scene, cam, { roster, t: sec, rs: Math.max(s * 1.3, 15 * dpr), fs: Math.max(9, Math.min(15, s * 1.1)) * dpr / 1.25 + 2 });
  // Flitsen: een golf in de kleur van wie verovert, een witte flits waar een spoor doorgesneden werd
  const ox = w / 2 - cam.x * s, oy = h / 2 - cam.y * s;
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i], k = (sec - f.t) / (f.cut ? .7 : 1.1);
    if (k >= 1) { flashes.splice(i, 1); continue; }
    const x = ox + (f.x + .5) * s, y = oy + (f.y + .5) * s;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(2, s * .4) * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(x, y, s * (f.cut ? 1.5 + k * 5 : 2 + k * Math.min(14, Math.sqrt(f.big) * 1.2)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  fx.update(dt);
  fx.draw(ctx);
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(String(Math.ceil(wait / 1000)), w / 2, h / 2);
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

$('start').addEventListener('click', () => socket.emit('bv-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('bv-finish');
});
$('restart').addEventListener('click', () => socket.emit('bv-restart'));
$('close').addEventListener('click', () => socket.emit('bv-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('bv-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} verovert het meeste land!` : 'Banierveld is voorbij';
  $('w-why').textContent = top ? `${pctText(top.land)} van het veld in de kleur van ${top.name}. Samen ${right} vragen juist.` : '';
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">⚔️ ${p.cuts} · ✔ ${p.right}</span><span class="pts">${pctText(p.land)}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
