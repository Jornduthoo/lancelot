// Haakridder op het bord: de camera volgt de koploper door de zwevende burcht, de anderen slingeren als schimmen mee.
// Bovenaan een strook met alle vlaggen en waar elke haakridder nu is.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, HkWorld en HkDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
const others = new AK.Interp(120);
const stages = new Map(); // n -> etappe
let leaderN = -1;
let lastLeadBanner = 0;
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
    loadGame('hk-load', { file: q.file, minutes: Number($('hk-minutes').value), tempo: $('hk-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('hk-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Haakridder · ${s.title}` : 'Haakridder';
  if (prev && prev.run !== s.run) { others.clear(); stages.clear(); leaderN = -1; cam = null; lastLead = HkWorld.spawnOf(0).x + 8; }
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

socket.on('hk-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now();
  // De koploper wisselt alleen als iemand duidelijk voor ligt (3 m), en wie net gevallen is telt niet mee.
  // Zo springt de camera niet heen en weer tussen ridders die even ver zijn.
  let best = null, cur = null;
  for (const [n, x, y, f, st, ax, ay, rot] of msg.r) {
    others.push(n, [x, y, rot, f, st, ax, ay], t);
    stages.set(n, st);
    if (f & 8) continue;
    if (n === leaderN) cur = { n, x, st };
    if (!best || x > best.x) best = { n, x, st };
  }
  others.prune(t, 1500);
  if (best && (!cur || best.x > cur.x + 3)) {
    if (leaderN >= 0 && best.n !== leaderN && roster.size > 1 && best.st >= 1 && t - lastLeadBanner > 8000) {
      const who = roster.get(best.n);
      if (who) { banner(`🪝 ${who.name} slingert nu vooraan!`); sfx.whoosh(); lastLeadBanner = t; }
    }
    leaderN = best.n;
    cur = best;
  }
  if (cur) {
    const who = roster.get(cur.n);
    $('p-alive').textContent = who ? `🪝 ${who.name} · 🏁 ${cur.st}` : '';
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
  $('player-word').textContent = list.length === 1 ? 'haakridder' : 'haakridders';
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
    el.addEventListener('click', () => socket.emit('hk-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">🏁 ${r.stage}</small></span><b>${r.score}</b></li>`).join('');
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
let cam = null;
let lastLead = HkWorld.spawnOf(0).x + 8;
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const { w, h } = AK.fit(canvas, 1.25);
  const strip = Math.round(h * .09);
  const S = (h - strip) / 16;
  const time = Math.max(0, (Date.now() + offset - state.startedAt) / 1000);
  const ghosts = [];
  let lead = null;
  for (const n of others.ids()) {
    const v = others.get(n);
    const who = roster.get(n);
    if (!v || !who || (v[3] & 8)) continue;
    const o = { x: v[0], y: v[1], rot: v[2], hook: Boolean(v[3] & 1), ground: Boolean(v[3] & 2), gold: Boolean(v[3] & 4), ax: v[5], ay: v[6], color: who.color, name: who.name, alpha: .55, n };
    if (n === leaderN) lead = o;
    else ghosts.push(o);
  }
  if (lead) lastLead = lead.x + 4;
  const wantX = lastLead;
  if (cam === null) cam = wantX;
  // Rustig volgen: zacht bijsturen en nooit sneller dan 12 m per seconde schuiven.
  const step = (wantX - cam) * Math.min(1, dt * 2);
  cam += Math.max(-12 * dt, Math.min(12 * dt, step));
  ctx.save();
  ctx.translate(0, strip);
  HkDraw.render(ctx, w, h - strip, {
    seed: state.seed, t: time, cx: cam, cy: HkWorld.H / 2 + 1, S, ghosts, passed: lead ? stages.get(lead.n) || 0 : 0,
    me: lead ? { ...lead, alpha: 1, name: `👑 ${lead.name}` } : null,
  });
  ctx.restore();
  drawStrip(w, strip);
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
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

// De strook bovenaan: vlaggen en alle haakridders op hun plek in de baan.
function drawStrip(w, sh) {
  ctx.fillStyle = '#0a0d22';
  ctx.fillRect(0, 0, w, sh);
  let maxX = HkWorld.L * 3;
  const list = [];
  for (const n of others.ids()) {
    const v = others.get(n);
    const who = roster.get(n);
    if (!v || !who) continue;
    list.push([v[0], who.color]);
    maxX = Math.max(maxX, v[0] + HkWorld.L * .6);
  }
  const flags = Math.ceil(maxX / HkWorld.L);
  const pad = sh * .6;
  const X = x => pad + Math.max(0, x) / (flags * HkWorld.L) * (w - pad * 2);
  const y = sh * .58;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(pad, y - 2, w - pad * 2, 4);
  ctx.font = `800 ${Math.round(sh * .28)}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 1; k <= flags; k++) {
    const x = X(k * HkWorld.L);
    ctx.fillStyle = k % 3 === 0 ? '#5ee7ff' : '#ffc94a';
    ctx.fillRect(x - 1, y - sh * .3, 2, sh * .5);
    if (flags <= 30 || k % 2 === 0) ctx.fillText(String(k), x, sh * .17);
  }
  for (const [x, color] of list) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(X(x), y, sh * .17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0d22';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('hk-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('hk-finish');
});
$('restart').addEventListener('click', () => socket.emit('hk-restart'));
$('close').addEventListener('click', () => socket.emit('hk-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('hk-stop', null, res => {
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
  const flags = s.ranking.reduce((a, r) => a + r.stage, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Haakridder!` : 'Haakridder is voorbij';
  $('w-why').textContent = `Samen ${flags} vlaggen gehaald en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🏁 ${p.stage} · 🤸 ${p.saltos} · 💎 ${p.cells} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
