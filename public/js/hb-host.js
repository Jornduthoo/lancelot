// Hooibergjacht op het bord: alle hooibergen naast elkaar in de neonschuur. Hoe meer hooi weg is, hoe lager de berg.
// Wie een naald vindt, krijgt een fonkelende naald boven zijn berg. Rechts de stand en wat er gebeurt.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, HbWorld en HbDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const live = new Map(); // n -> { k, prog, shown, found, lvl, asking, flash }

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
    loadGame('hb-load', { file: q.file, minutes: Number($('hb-minutes').value), tempo: $('hb-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('hb-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const on = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Hooibergjacht · ${s.title}` : 'Hooibergjacht';
  if (prev && prev.run !== s.run) live.clear();
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

socket.on('hb-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now() / 1000;
  let total = 0;
  for (const [n, k, prog, found, lvl, asking] of msg.r) {
    let v = live.get(n);
    if (!v) { v = { k, prog, shown: prog, found, lvl, asking, flash: -9 }; live.set(n, v); }
    if (found > v.found) { v.flash = t; sfx.marker(); }
    Object.assign(v, { k, prog, found, lvl, asking });
    total += found;
  }
  $('p-alive').textContent = `📍 ${total} ${total === 1 ? 'naald' : 'naalden'} gevonden`;
  if (msg.ranking) {
    state.ranking = msg.ranking;
    if (msg.feed) state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'naaldzoeker' : 'naaldzoekers';
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
    el.addEventListener('click', () => socket.emit('hb-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
let lastTop = '';
function renderSide(ranking, feed) {
  const top = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">📍 ${r.found}</small></span><b>${r.score}</b></li>`).join('');
  if (top !== lastTop) { lastTop = top; $('p-top').innerHTML = top; }
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
  const { w, h } = AK.fit(canvas, 1.25);
  const sec = t / 1000;
  HbDraw.barn(ctx, w, h, sec);
  const list = [...roster.values()].sort((a, b) => a.n - b.n);
  const n = Math.max(1, list.length);
  // Zoveel kolommen dat de bergen zo groot mogelijk zijn
  let cols = 1;
  for (let c = 1; c <= n; c++) {
    const rows = Math.ceil(n / c);
    const cw = w / c, ch = (h * .8) / rows;
    const best = Math.min(cw / 1.4, ch);
    const cur = Math.min(w / cols / 1.4, (h * .8) / Math.ceil(n / cols));
    if (best > cur) cols = c;
  }
  const rows = Math.ceil(n / cols);
  const cw = w / cols, ch = (h * .8) / rows;
  const fs = Math.max(10, Math.min(22, ch * .13));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  list.forEach((p, i) => {
    const v = live.get(p.n) || { prog: 0, shown: 0, found: 0, lvl: 0, asking: 0, flash: -9 };
    v.shown = v.shown === undefined ? v.prog : v.shown + (v.prog - v.shown) * Math.min(1, dt * 3);
    const cx = (i % cols + .5) * cw, top = h * .06 + Math.floor(i / cols) * ch;
    const mw = Math.min(cw * .8, ch * 1.15), mh = mw * .6;
    const base = top + ch * .78;
    HbDraw.glow(ctx, cx, base, mw * .6, AK.rgba ? AK.rgba(p.color, .35) : 'rgba(94,231,255,.3)');
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - mw * .5, base - 1, mw, 3);
    HbDraw.mini(ctx, cx - mw / 2, base - mh, mw, mh, v.shown, sec);
    // Net een naald gevonden: een grote fonkelende naald erboven
    const f = sec - v.flash;
    if (f >= 0 && f < 2.2) {
      const k = Math.min(1, f / .4) * Math.min(1, (2.2 - f) / .5);
      HbDraw.needle(ctx, cx, base - mh - mh * .25 * k, mw * .45 * k, -.5 + Math.sin(sec * 3) * .2, sec, k);
      HbDraw.sparkle(ctx, cx + mw * .2, base - mh * 1.1, mw * .08, k);
    }
    ctx.font = `800 ${fs}px Orbitron, sans-serif`;
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(p.name, cx, base + fs * 1.05);
    ctx.font = `700 ${fs * .85}px sans-serif`;
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(`📍 ${v.found}  ${HbWorld.TOOLS[v.lvl || 0].icon}${v.asking ? '  ❓' : ''}`, cx, base + fs * 2.15);
  });
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
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

$('start').addEventListener('click', () => socket.emit('hb-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('hb-finish');
});
$('restart').addEventListener('click', () => socket.emit('hb-restart'));
$('close').addEventListener('click', () => socket.emit('hb-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('hb-stop', null, res => {
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
  const needles = s.ranking.reduce((a, r) => a + r.found, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Hooibergjacht!` : 'Hooibergjacht is voorbij';
  $('w-why').textContent = `Samen ${needles} ${needles === 1 ? 'naald' : 'naalden'} gevonden en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">📍 ${p.found} · ⚙️ ${p.loot} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
