// De prinses in de toren op het bord. Gebruikt sfx, confetti en CROWN uit fx.js, Toren en TorenDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let world = null;
let offset = 0;
const knights = new Map(); // id -> { x, y, tx, ty, face, act, color, name, best }
let follow = null;         // id van de ridder die de grote camera volgt
let camY = 0;

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

// ---------- Quiz kiezen ----------

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('tw-load', { file: q.file, minutes: Number($('tw-minutes').value), tempo: $('tw-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

// ---------- Status ----------

socket.on('tw-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `De prinses in de toren · ${s.title}` : 'De prinses in de toren';
  if (live && (!world || world.seed !== s.seed)) {
    world = Toren.build(s.seed);
    knights.clear();
  }
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
    renderPodium();
  }
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
    el.style.setProperty('--cape', TorenDraw.COLORS[p.color % 8]);
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('tw-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

$('start').addEventListener('click', () => socket.emit('tw-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu beëindigen en de eindstand tonen?')) socket.emit('tw-finish');
});
$('restart').addEventListener('click', () => socket.emit('tw-restart'));
$('close').addEventListener('click', () => socket.emit('tw-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('tw-stop', null, res => {
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

socket.on('tw-world', data => {
  offset = data.now - Date.now();
  const seen = new Set();
  for (const [id, name, x, y, face, act, color, best] of data.players) {
    seen.add(id);
    const k = knights.get(id);
    if (k) Object.assign(k, { tx: x, ty: y, face, act, color, name, best });
    else knights.set(id, { x, y, tx: x, ty: y, face, act, color, name, best });
  }
  for (const id of knights.keys()) if (!seen.has(id)) knights.delete(id);
  if (data.ranking) renderSide(data.ranking, data.feed);
});

socket.on('tw-rescued', ({ first }) => {
  if (first) {
    sfx.fanfare();
    confetti(4000);
  } else {
    sfx.good();
  }
});

let lastFeed = '';
let lastLeader = null;
function renderSide(ranking, feed) {
  $('p-rank').innerHTML = ranking.slice(0, 10).map((r, i) => `
    <li class="${r.rescuedAt ? 'rescued' : ''}">
      <span class="pos">${i + 1}</span>
      <span class="dot" style="background:${TorenDraw.COLORS[r.color % 8]}"></span>
      <span class="who">${esc(r.name)}</span>
      <span class="fl">${r.rescuedAt ? '👑' : r.floor}</span>
      <span class="en">⚡${r.energy}</span>
    </li>`).join('') + (ranking.length > 10 ? `<li class="more">+ ${ranking.length - 10} ridders</li>` : '');
  const feedKey = JSON.stringify(feed);
  if (feedKey !== lastFeed) {
    lastFeed = feedKey;
    $('p-feed').innerHTML = feed.map(f => `<li>${esc(f.text)}</li>`).join('');
  }
  // De camera volgt wie het hoogst staat (en blijft even bij dezelfde ridder om niet te springen).
  const leader = ranking.find(r => !r.rescuedAt) || ranking[0];
  if (leader && leader.id !== lastLeader) {
    const current = knights.get(follow);
    const cand = knights.get(leader.id);
    if (!current || !cand || cand.ty > current.ty + 60) {
      follow = leader.id;
      lastLeader = leader.id;
    }
  }
}

// ---------- Tekenen ----------

const main = $('p-main');
const mctx = main.getContext('2d');
const mini = $('p-mini');
const nctx = mini.getContext('2d');

function fit(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  return dpr;
}

function label(ctx, text, x, y, color, size) {
  ctx.font = `700 ${size}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, .75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawMain(t, dt) {
  fit(main);
  const H = main.height;
  const scale = Math.min(main.width / (world.W + 40), H / 600);
  const ox = (main.width - world.W * scale) / 2;
  const target = knights.get(follow);
  const goal = target ? Math.max(-70, target.y - (H / scale) * .4) : -70;
  camY += (goal - camY) * Math.min(1, dt * 3);
  TorenDraw.scene(mctx, world, { y: camY, scale, H, ox }, Math.max(0, t));
  const { w: pw, h: ph } = world.PLAYER;
  const sy = wy => H - (wy - camY) * scale;
  for (const k of knights.values()) {
    k.x += (k.tx - k.x) * Math.min(1, dt * 10);
    k.y += (k.ty - k.y) * Math.min(1, dt * 10);
    if (k.y > camY + H / scale + 40 || k.y + ph < camY - 40) continue;
    TorenDraw.knight(mctx, ox + k.x * scale, sy(k.y), pw * scale, ph * scale, TorenDraw.COLORS[k.color % 8], k.face, k.act, t, 1, Avatar.byName(k.name));
    label(mctx, k.name, ox + (k.x + pw / 2) * scale, sy(k.y + ph + 6), '#eaf4ff', 12 * scale);
  }
  $('p-follow').textContent = target ? `🎥 ${target.name} · verdieping ${Toren.floorAt(world, target.y)} · ${world.zones[Toren.zoneAt(world, target.y)].name}` : '';
}

// Overzicht van de hele toren met een stip per ridder.
function drawMini(t) {
  const dpr = fit(mini);
  const W = mini.width;
  const H = mini.height;
  const pad = 26 * dpr;
  const tw = W * .46;
  const x0 = (W - tw) / 2;
  const sy = y => H - pad - (y / world.top) * (H - pad * 2);
  nctx.clearRect(0, 0, W, H);
  // Toren met kantelen.
  // Elke zone in haar eigen kleur, met de naam ernaast.
  world.zones.forEach(z => {
    const look = TorenDraw.LOOK[z.key];
    const y1 = sy(Math.min(z.y1, world.top));
    const y0 = sy(Math.max(0, z.y0));
    const g = nctx.createLinearGradient(0, y1, 0, y0);
    g.addColorStop(0, look.sky[2]);
    g.addColorStop(1, look.sky[0]);
    nctx.fillStyle = g;
    nctx.fillRect(x0, y1, tw, y0 - y1);
    nctx.fillStyle = look.accent;
    nctx.globalAlpha = .8;
    nctx.fillRect(x0, y1, tw, 1.5 * dpr);
    nctx.globalAlpha = 1;
    nctx.save();
    nctx.translate(x0 + tw + 12 * dpr, (y0 + y1) / 2);
    nctx.rotate(-Math.PI / 2);
    nctx.font = `700 ${9 * dpr}px Orbitron, sans-serif`;
    nctx.textAlign = 'center';
    nctx.fillStyle = look.accent;
    nctx.fillText(z.name.replace(/^De /, '').toUpperCase(), 0, 0);
    nctx.restore();
  });
  nctx.fillStyle = '#101a2e';
  nctx.strokeStyle = 'rgba(76, 201, 255, .5)';
  nctx.lineWidth = 1.5 * dpr;
  nctx.strokeRect(x0, sy(world.top), tw, sy(0) - sy(world.top));
  const cw = tw / 5;
  for (let i = 0; i < 5; i += 2) nctx.fillRect(x0 + i * cw, sy(world.top) - 10 * dpr, cw, 10 * dpr);
  nctx.font = `700 ${10 * dpr}px Orbitron, sans-serif`;
  nctx.textAlign = 'right';
  for (const p of world.platforms) {
    if (p.floor % 10 || p.floor === 0 || p.floor === world.FLOORS) continue;
    nctx.fillStyle = 'rgba(76, 201, 255, .25)';
    nctx.fillRect(x0, sy(p.y), tw, 1);
    nctx.fillStyle = 'rgba(143, 167, 199, .9)';
    nctx.fillText(p.floor, x0 - 4 * dpr, sy(p.y) + 4 * dpr);
  }
  TorenDraw.princess(nctx, W / 2 - 9 * dpr, sy(world.top) - 12 * dpr, 18 * dpr, t);
  // Ridders als gekleurde stippen; samen op dezelfde hoogte schuiven ze een beetje uit elkaar.
  const list = [...knights.values()].sort((a, b) => a.y - b.y);
  list.forEach((k, i) => {
    const y = sy(k.y);
    const x = x0 + (k.x / world.W) * tw;
    nctx.fillStyle = TorenDraw.COLORS[k.color % 8];
    nctx.beginPath();
    nctx.arc(x + ((i % 3) - 1) * 2 * dpr, y, 5 * dpr, 0, Math.PI * 2);
    nctx.fill();
    nctx.strokeStyle = '#fff';
    nctx.lineWidth = 1 * dpr;
    nctx.stroke();
  });
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (view !== 'play' || !world || !state) return;
  const t = (Date.now() + offset - state.startedAt) / 1000;
  drawMain(t, dt);
  drawMini(t);
  const left = Math.max(0, state.endsAt - (Date.now() + offset));
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 30000);
  $('p-countdown').classList.toggle('hidden', t >= 0);
  if (t < 0) $('p-countdown').textContent = Math.ceil(-t);
}
requestAnimationFrame(frame);

// ---------- Podium ----------

function renderPodium() {
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (state.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(state.resultsFile));
  }
  const ranking = state.ranking;
  const what = r => (r.rescuedAt ? `👑 gered na ${Math.floor(r.rescuedAt / 60000)}:${String(Math.floor(r.rescuedAt / 1000) % 60).padStart(2, '0')}` : `verdieping ${r.floor}`);
  const [p1, p2, p3] = ranking;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${what(p)}</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span></span><span class="pts">${p.rescuedAt ? '👑' : `verd. ${p.floor}`}</span></li>`).join('');
  const rise = (n, delay) => setTimeout(() => document.querySelector(`.pillar.p${n}`)?.classList.add('up'), delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}
