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
  $('p-builders').innerHTML = state.ranking.slice(0, 6).map(r => `<li><i class="bb-dot" style="background:${COLORS[r.color]}"></i>${esc(r.name)}<b>${r.placed} 🧱</b></li>`).join('');
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
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97) % 1000 / 1000, y: (i * 37) % 100 / 100 * .55, s: i % 5 ? 1 : 2 }));

function fit(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.round(r.width * dpr));
  const h = Math.max(200, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}

// fallen: per deel hoe ver het al ingestort is (0 tot 1); fire: welk deel nu brandt.
function drawCastle(canvas, s, fx = {}) {
  const { w, h, dpr } = fit(canvas);
  const g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#040814');
  sky.addColorStop(1, fx.fire !== undefined ? '#3a1408' : '#12233f');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#c9e6ff';
  for (const st of STARS) g.fillRect(st.x * w, st.y * h, st.s * dpr, st.s * dpr);
  g.fillStyle = '#f4f1d0';
  g.beginPath(); g.arc(w * .9, h * .14, h * .05, 0, Math.PI * 2); g.fill();
  const ground = h * .84;
  g.fillStyle = '#0b1424';
  g.fillRect(0, ground, w, h - ground);
  g.fillStyle = 'rgba(76, 201, 255, .35)';
  g.fillRect(0, ground, w, 2 * dpr);

  const parts = s.parts;
  const need = Math.max(1, s.need);
  const totalW = parts.reduce((a, p) => a + SHAPE[p.kind].w, 0);
  const margin = w * .05;
  const unit = (w - margin * 2) / totalW;
  const rowsOf = (n, kind) => n / SHAPE[kind].perRow;
  const maxRows = Math.max(...parts.map(p => Math.max(rowsOf(p.height, p.kind), rowsOf(need, p.kind) * 1.35)), 4);
  const bh = Math.min(30 * dpr, (ground - h * .12) / maxRows);
  const stones = s.stones || [];
  let x = margin;
  parts.forEach((p, i) => {
    const shape = SHAPE[p.kind];
    const pw = unit * shape.w;
    const inset = p.kind === 'toren' || p.kind === 'donjon' ? pw * .08 : pw * .02;
    const left = x + inset;
    const width = pw - inset * 2;
    const bw = width / shape.perRow;
    const fall = fx.fallen ? fx.fallen[i] || 0 : 0;
    const shown = Math.round(p.height * (1 - fall * .75));
    const colors = stones[i] || [];
    for (let k = 0; k < shown; k++) {
      const row = Math.floor(k / shape.perRow);
      const col = k % shape.perRow;
      const shift = row % 2 ? bw / 2 : 0;
      let bx = left + col * bw + shift;
      if (bx + bw > left + width + 1) bx -= width;
      const by = ground - (row + 1) * bh;
      g.fillStyle = '#56637c';
      g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#7d8ba3';
      g.fillRect(bx + dpr, by + dpr, bw - 2 * dpr, bh - 2 * dpr);
      const c = COLORS[colors[k] % COLORS.length] || '#9fb4d9';
      g.fillStyle = c;
      g.globalAlpha = .55;
      g.fillRect(bx + dpr, by + bh - 4 * dpr, bw - 2 * dpr, 3 * dpr);
      g.globalAlpha = 1;
    }
    const rows = Math.ceil(shown / shape.perRow);
    const top = ground - rows * bh;
    // Kantelen, poort en vlag.
    if (rows > 0 && (p.kind === 'toren' || p.kind === 'donjon' || p.kind === 'muur')) {
      const n = p.kind === 'muur' ? 5 : 3;
      for (let k = 0; k < n; k++) {
        g.fillStyle = '#6b7891';
        const mw = width / (n * 2 - 1);
        g.fillRect(left + k * mw * 2, top - bh * .6, mw, bh * .6);
      }
    }
    if (p.kind === 'poort' && rows >= 2) {
      const gw = width * .45;
      const gh = Math.min(rows, 4) * bh * .85;
      g.fillStyle = '#0b0f1c';
      g.beginPath();
      g.moveTo(left + (width - gw) / 2, ground);
      g.lineTo(left + (width - gw) / 2, ground - gh + gw / 2);
      g.arc(left + width / 2, ground - gh + gw / 2, gw / 2, Math.PI, 0);
      g.lineTo(left + (width + gw) / 2, ground);
      g.fill();
      g.strokeStyle = 'rgba(255, 201, 74, .5)';
      g.lineWidth = 2 * dpr;
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(left + (width - gw) / 2 + (gw * k) / 4, ground); g.lineTo(left + (width - gw) / 2 + (gw * k) / 4, ground - gh + gw / 3); g.stroke(); }
    }
    if (p.kind === 'donjon' && rows > 0) {
      g.strokeStyle = '#c9d6e6';
      g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(left + width / 2, top - bh * .6); g.lineTo(left + width / 2, top - bh * 2.6); g.stroke();
      g.fillStyle = '#ffc94a';
      g.beginPath(); g.moveTo(left + width / 2, top - bh * 2.6); g.lineTo(left + width / 2 + bh * 1.4, top - bh * 2.2); g.lineTo(left + width / 2, top - bh * 1.8); g.fill();
    }
    // De streep van de draak.
    const needY = ground - rowsOf(need, p.kind) * bh;
    const ok = p.height >= need;
    g.setLineDash([8 * dpr, 6 * dpr]);
    g.strokeStyle = ok ? 'rgba(46, 230, 166, .9)' : 'rgba(255, 120, 60, .95)';
    g.lineWidth = 3 * dpr;
    g.beginPath(); g.moveTo(x + 2 * dpr, needY); g.lineTo(x + pw - 2 * dpr, needY); g.stroke();
    g.setLineDash([]);
    // Naam en hoogte onder het deel.
    g.textAlign = 'center';
    g.fillStyle = '#eaf4ff';
    g.font = `700 ${Math.round(Math.min(18 * dpr, unit * .16))}px 'Exo 2', sans-serif`;
    g.fillText(p.name, x + pw / 2, ground + (h - ground) * .38);
    g.fillStyle = ok ? '#2ee6a6' : '#ff9a5c';
    g.font = `800 ${Math.round(Math.min(20 * dpr, unit * .18))}px 'Exo 2', sans-serif`;
    g.fillText(`${p.height} / ${need}${ok ? ' ✔' : ''}`, x + pw / 2, ground + (h - ground) * .75);
    // Vuur op het deel dat nu aangevallen wordt, en een schild of rook erna.
    if (fx.fire === i) {
      for (let k = 0; k < 40; k++) {
        const t = (performance.now() / 600 + k / 40) % 1;
        g.fillStyle = `rgba(255, ${120 + Math.round(k * 3) % 120}, 40, ${1 - t})`;
        g.beginPath();
        g.arc(x + pw / 2 + Math.sin(k * 7 + t * 6) * pw * .35, needY - h * .25 * (1 - t), (6 + t * 18) * dpr, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (fx.result && fx.result[i] === 'held') {
      g.strokeStyle = 'rgba(76, 201, 255, .8)';
      g.lineWidth = 4 * dpr;
      g.beginPath(); g.ellipse(x + pw / 2, ground - (top < needY ? ground - top : ground - needY) / 2, pw * .55, Math.max(bh, (ground - Math.min(top, needY)) * .6), 0, Math.PI, 0); g.stroke();
    } else if (fx.result && fx.result[i] === 'fallen') {
      g.fillStyle = 'rgba(40, 40, 50, .55)';
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + pw * (.2 + k * .13), top - bh * (1 + (k % 3)), bh * 1.4, 0, Math.PI * 2); g.fill(); }
    }
    x += pw;
  });
  // De draak.
  if (fx.dragon) {
    g.save();
    g.font = `${Math.round(h * .22)}px serif`;
    g.textAlign = 'center';
    g.translate(fx.dragon.x * w, fx.dragon.y * h);
    g.scale(-1, 1);
    g.fillText('🐉', 0, 0);
    g.restore();
  }
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
