// Burchtbouwers op het bord: de burcht groeit steen per steen, en op het einde valt de draak aan.
// Gebruikt sfx, confetti uit fx.js, quizMakerUrl uit quiz-links.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

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

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('bb-load', { file: q.file, minutes: Number($('bb-minutes').value), level: $('bb-level').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('bb-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'bouwen');
  $('status').textContent = live ? `Burchtbouwers · ${s.title}` : 'Burchtbouwers';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'bouwen' || s.phase === 'draak') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide();
    $('p-dragon').classList.toggle('hidden', s.phase !== 'bouwen');
    if (s.phase === 'draak' && (!prev || prev.phase !== 'draak')) {
      sfx.gong();
      banner('🐉 De draak valt aan!');
    }
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'bouwer' : 'bouwers';
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
    el.addEventListener('click', () => socket.emit('bb-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
let lastTotal = 0;
function renderSide() {
  $('p-need').textContent = state.need;
  $('p-builders').innerHTML = state.ranking.slice(0, 6).map(r => `<li><i class="bb-dot" style="background:${COLORS[r.color]}"></i><span data-av="${esc(r.name)}">${esc(r.name)}</span><b>${r.placed} 🧱</b></li>`).join('');
  const total = state.parts.reduce((a, p) => a + p.height, 0);
  if (total > lastTotal && prev && prev.phase === 'bouwen') sfx.marker();
  lastTotal = total;
  const feedKey = JSON.stringify(state.feed);
  if (feedKey !== lastFeed) {
    const fresh = state.feed[0] && lastFeed && !lastFeed.includes(JSON.stringify(state.feed[0].text));
    lastFeed = feedKey;
    $('p-feed').innerHTML = state.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && /^✅/.test(state.feed[0].text)) sfx.power();
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

// ---------- De burcht tekenen ----------

const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#f2f2f2'];
const SHAPE = {
  toren: { w: 1, perRow: 3 },
  muur: { w: 1.35, perRow: 4 },
  poort: { w: 1.25, perRow: 4 },
  donjon: { w: 1.45, perRow: 5 },
};

function fit(canvas) {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.round(r.width * dpr));
  const h = Math.max(200, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}

// fallen: per deel hoe ver het al ingestort is (0 tot 1); fire: welk deel nu brandt.
function drawCastle(canvas, s, fx = {}) {
  const { w, h, dpr } = fit(canvas);
  BbArt.castle(canvas.getContext('2d'), w, h, dpr, s, fx, SHAPE, COLORS);
}

// Positie van de draak en wat er gebeurd is, op tijdstip now.
function attackFx(s, now) {
  const a = s.attack;
  if (!a) return {};
  const t = now - a.at;
  const n = a.results.length;
  const totalW = s.parts.reduce((acc, p) => acc + SHAPE[p.kind].w, 0);
  let acc = 0;
  const centers = s.parts.map(p => { const c = (acc + SHAPE[p.kind].w / 2) / totalW; acc += SHAPE[p.kind].w; return .05 + c * .9; });
  const fx = { fallen: [], result: [] };
  if (t < 0) {
    // Nog even: de draak vliegt van rechts binnen.
    fx.dragon = { x: 1.05 - (t / 2500) * .2, y: .22 };
    return fx;
  }
  const step = Math.min(n - 1, Math.floor(t / a.step));
  const within = (t % a.step) / a.step;
  for (let i = 0; i < n; i++) {
    const done = i < step || (i === step && within > .7) || t > n * a.step;
    if (done) {
      fx.result[i] = a.results[i].held ? 'held' : 'fallen';
      if (!a.results[i].held) fx.fallen[i] = i < step || t > n * a.step ? 1 : Math.min(1, (within - .7) / .3);
    }
  }
  if (t < n * a.step) {
    const from = step > 0 ? centers[step - 1] : 1.05;
    fx.dragon = { x: from + (centers[step] - from) * Math.min(1, within * 2.5), y: .2 + Math.sin(t / 300) * .02 };
    if (within > .25 && within < .75) fx.fire = step;
  } else {
    fx.dragon = { x: centers[n - 1] - (t - n * a.step) / 1500, y: .18 };
  }
  return fx;
}

let lastStep = -1;
function frame() {
  requestAnimationFrame(frame);
  if (!state) return;
  const now = Date.now() + offset;
  if (view === 'play' && (state.phase === 'bouwen' || state.phase === 'draak')) {
    const fx = attackFx(state, now);
    drawCastle($('p-canvas'), state, fx);
    if (state.attack) {
      const step = Math.floor((now - state.attack.at) / state.attack.step);
      if (step !== lastStep && step >= 0 && step < state.attack.results.length) {
        lastStep = step;
        sfx.boom();
        setTimeout(() => (state.attack && state.attack.results[step] && state.attack.results[step].held ? sfx.marker() : sfx.hit()), state.attack.step * .7);
      }
    } else {
      lastStep = -1;
    }
  }
}
requestAnimationFrame(frame);

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = state.phase === 'draak' ? '🐉' : `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', state.phase === 'bouwen' && left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', !(state.phase === 'bouwen' && wait > 0));
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);

$('start').addEventListener('click', () => socket.emit('bb-start'));
$('p-dragon').addEventListener('click', () => {
  if (confirm('De draak nu laten aanvallen? Dan stopt het bouwen.')) socket.emit('bb-dragon');
});
$('restart').addEventListener('click', () => socket.emit('bb-restart'));
$('close').addEventListener('click', () => socket.emit('bb-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('bb-stop', null, res => {
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
  const fallen = s.attack ? s.attack.fallen : 0;
  $('w-title').textContent = s.held ? '🏰 De burcht houdt stand!' : '🔥 De draak heeft de burcht verwoest...';
  $('w-why').textContent = fallen === 0 ? 'Geen enkel deel is gevallen. Een onneembare burcht!'
    : s.held ? 'Eén deel is gevallen, maar de burcht houdt stand.'
      : `${fallen} delen zijn gevallen. Volgende keer beter verdelen!`;
  requestAnimationFrame(drawFinal);
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${COLORS[p.color]}"></i>${esc(p.name)}</span><span class="muted">${p.favorite ? `vooral ${esc(p.favorite)}` : ''}</span><span class="pts">${p.placed} 🧱</span></li>`).join('');
  if (s.held) { sfx.fanfare(); confetti(5000); } else sfx.bad();
}
// De burcht na de aanval: wat viel, ligt in puin.
function drawFinal() {
  const s = state;
  const fx = s.attack ? { fallen: s.attack.results.map(r => (r.held ? 0 : 1)), result: s.attack.results.map(r => (r.held ? 'held' : 'fallen')) } : {};
  drawCastle($('w-canvas'), s, fx);
}
window.addEventListener('resize', () => { if (view === 'podium' && state) drawFinal(); });
