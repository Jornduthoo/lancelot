// Pixelridder op het bord: bovenaan een racebalk met alle ridders, daaronder camera's die meelopen met de koploper
// en (afwisselend) met andere leerlingen. Elke camera tekent de wereld van die leerling met alle ridders die erin zitten.
// Gebruikt sfx, confetti, Glow en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, Avatar, PxWorld, PxDraw en PxMusic.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const Wd = PxWorld;
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const pos = new AK.Interp(120);   // n -> [x, y, 0, vlaggen, wereld]
const info = new Map();           // n -> { w, gone: [] }
let ranking = [];
let leader = -1;
const pops = [];

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
  if (name === 'play') PxMusic.start(); else PxMusic.stop();
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
    loadGame('px-load', { file: q.file, minutes: Number($('px-minutes').value), tempo: $('px-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

function infoOf(n) {
  let i = info.get(n);
  if (!i) { i = { w: 0, gone: [] }; info.set(n, i); }
  return i;
}

socket.on('px-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Pixelridder · ${s.title}` : 'Pixelridder';
  if (prev && prev.run !== s.run) { info.clear(); pos.clear(); cams.forEach(c => { c.n = -1; }); leader = -1; }
  for (const [n, w, gone] of s.cams || []) { const i = infoOf(n); i.w = w; i.gone = gone.slice(); }
  for (const n of [...info.keys()]) if (!roster.has(n)) info.delete(n);
  if (s.ranking) ranking = s.ranking;
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    cams.forEach(c => { c.n = -1; });
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('px-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now();
  for (const [n, w, x, y, f] of msg.k) {
    const i = infoOf(n);
    if (i.w !== w) { i.w = w; i.gone = []; }
    pos.push(n, [x, y, 0, f, w], t);
  }
  for (const e of msg.ev) onEvent(e);
  if (msg.ranking) {
    ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(ranking, msg.feed);
  }
});

const GIFT = { kristal: '💎', zwaard: '🔥', ster: '⭐' };
function onEvent(e) {
  const [kind, n] = e;
  if (kind === 'g') {
    const [, , w, ...item] = e;
    const i = infoOf(n);
    if (i.w !== w) { i.w = w; i.gone = []; }
    i.gone.push(item);
    for (const c of cams) if (c.n === n && c.w === w) apply(c, item);
  } else if (kind === 'pw') {
    pops.push({ n, text: GIFT[e[2]] || '✨', t: 0 });
    spotlight(n);
    if (e[2] === 'ster') sfx.power();
  } else if (kind === 'poort') {
    const r = roster.get(n);
    if (r) banner(`🏁 ${r.name} haalt de runepoort van wereld ${e[2] + 1}!`);
    spotlight(n);
    sfx.go();
  } else if (kind === 'rune') {
    pops.push({ n, text: '✔', t: 0 });
  }
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
    el.addEventListener('click', () => socket.emit('px-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(list, feed) {
  list = list || [];
  const top = list[0];
  if (top && top.score > 0 && top.n !== leader) {
    if (leader >= 0 && list.length > 1) banner(`👑 ${top.name} neemt de leiding`);
    leader = top.n;
  }
  $('p-top').innerHTML = list.slice(0, 12).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${r.n === leader ? '👑 ' : ''}${AK.esc(r.name)} <small class="muted">W${r.w + 1}</small></span><b>${r.score}</b></li>`).join('');
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

// ---------- Camera's ----------
// Elke camera houdt zijn eigen kopie van de wereld bij (blokken, munten en vijanden van die ene leerling).
const cams = [0, 1, 2].map(() => ({ n: -1, w: -1, world: null, enemies: [], camX: 0, check: false, buf: document.createElement('canvas'), since: 0, rect: null }));
const queue = [];
function spotlight(n) {
  const i = queue.indexOf(n);
  if (i >= 0) queue.splice(i, 1);
  queue.unshift(n);
  if (queue.length > 8) queue.length = 8;
}

function apply(c, item) {
  const [k, a, b] = item;
  if (k === 'c') c.world.tiles[a] = 0;
  else if (k === 'b') c.world.tiles[a] = b;
  else if (k === 'cp') c.check = true;
  else if (k === 'k' || k === 's') {
    const e = c.enemies.find(x => x.id === a);
    if (!e) return;
    if (k === 's') { e.state = 'shell'; e.t = 0; e.vx = 0; }
    else if (e.state !== 'gone') { e.state = 'dead'; e.vy = -200; }
  }
}

function aim(c, n) {
  const i = infoOf(n);
  c.n = n;
  c.w = i.w;
  c.world = Wd.make(state.seed, i.w);
  c.enemies = Wd.freshEnemies(c.world);
  c.check = false;
  for (const item of i.gone) apply(c, item);
  for (const e of c.enemies) if (e.state === 'dead') e.state = 'gone';
  const p = pos.get(n);
  c.camX = p ? Math.max(0, p[0] - 120) : 0;
  c.since = performance.now();
}

// De koploper (verst gevorderd) altijd groot, de andere twee camera's wisselen om de negen seconden.
function choose(t) {
  if (!state || !roster.size) return;
  const byProg = ranking.slice().sort((a, b) => b.prog - a.prog);
  const first = byProg.length ? byProg[0].n : [...roster.keys()][0];
  if (cams[0].n !== first || cams[0].w !== infoOf(first).w) aim(cams[0], first);
  const want = Math.min(2, roster.size - 1);
  for (let k = 1; k <= 2; k++) {
    const c = cams[k];
    if (k > want) { c.n = -1; continue; }
    const others = [...roster.keys()].filter(n => n !== cams[0].n && !cams.some((o, j) => j !== k && o.n === n));
    const stale = c.n < 0 || !roster.has(c.n) || c.n === cams[0].n || t - c.since > 9000;
    if (c.n >= 0 && roster.has(c.n) && infoOf(c.n).w !== c.w) { aim(c, c.n); continue; }
    if (!stale || !others.length) continue;
    const fromQueue = queue.find(n => others.includes(n) && n !== c.n);
    let pick = fromQueue;
    if (pick === undefined) {
      const order = byProg.map(r => r.n).filter(n => others.includes(n));
      const at = order.indexOf(c.n);
      pick = order.length ? order[(at + 1) % order.length] : others[0];
    }
    if (fromQueue !== undefined) queue.splice(queue.indexOf(fromQueue), 1);
    if (pick !== undefined) aim(c, pick);
  }
}

function playersIn(c, t) {
  const out = [];
  for (const n of roster.keys()) {
    const v = pos.get(n, t);
    if (!v || v[4] !== c.w) continue;
    const r = roster.get(n);
    const f = v[3];
    out.push({ n, x: v[0], y: v[1], power: f & 3, star: !!(f & 4), left: !!(f & 8), act: (f >> 4) & 3, blink: !!(f & 64), asking: !!(f & 128), av: Avatar.byName(r.name) || PxDraw.DEFAULT_AV, ghost: n !== c.n, color: r.color });
  }
  // de gevolgde ridder bovenaan
  out.sort((a, b) => (a.n === c.n) - (b.n === c.n));
  return out;
}

function stepCam(c, dt, time, t) {
  if (c.n < 0 || !c.world) return;
  const me = pos.get(c.n, t);
  const vw = c.buf.width;
  if (me) {
    const want = Math.max(0, Math.min(c.world.len * Wd.T - vw, me[0] - vw * .42));
    c.camX += (want - c.camX) * Math.min(1, dt * 5);
  }
  for (const e of c.enemies) {
    if (e.state === 'gone') continue;
    if (!e.on) { if (e.x < c.camX + vw + 24) e.on = true; else continue; }
    if (e.state === 'dead') { e.vy += Wd.PHYS.grav * dt; e.y += e.vy * dt; if (e.y > Wd.H + 40) e.state = 'gone'; continue; }
    Wd.stepEnemy(c.world, e, dt, time);
  }
}

function drawCam(c, x, y, w, h, t, time) {
  if (c.n < 0 || !c.world) return;
  const vw = Math.max(200, Math.min(640, Math.round(Wd.H * w / h)));
  if (c.buf.width !== vw) { c.buf.width = vw; c.buf.height = Wd.H; }
  const b = c.buf.getContext('2d');
  b.imageSmoothingEnabled = false;
  PxDraw.scene(b, { world: c.world, camX: c.camX, viewW: vw, time, t: t / 1000, enemies: c.enemies, players: playersIn(c, t), checkLit: c.check ? (roster.get(c.n) || {}).color : null });
  ctx.imageSmoothingEnabled = false;
  // schalen zonder vervorming: de hoogte vult het vak
  const sc = h / Wd.H;
  const dw = vw * sc;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(c.buf, x + (w - dw) / 2, y, dw, h);
  // een power-up of juist antwoord: groot boven de ridder
  for (const p of pops) {
    if (p.n !== c.n) continue;
    const me = pos.get(c.n, t);
    if (!me) continue;
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    ctx.font = `${Math.round(h * .12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, x + (w - dw) / 2 + (me[0] - c.camX) * sc, y + (me[1] - 40) * sc - p.t * 40);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // naam, wereld en punten
  const r = roster.get(c.n);
  const rank = ranking.findIndex(q => q.n === c.n);
  const sc2 = rank >= 0 ? ranking[rank] : null;
  const narrow = w < h * 1.1;
  const fs = Math.max(12, Math.round(Math.min(h * .05, w * .045)));
  ctx.fillStyle = 'rgba(3,5,11,.72)';
  ctx.fillRect(x, y, w, fs * 1.9);
  ctx.font = `800 ${fs}px Orbitron, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = r ? r.color : '#fff';
  const label = `${c.n === leader ? '👑 ' : ''}${r ? r.name : ''}`;
  ctx.fillText(label.length > 14 ? `${label.slice(0, 13)}…` : label, x + fs * .6, y + fs * 1.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8f1ff';
  const world = narrow ? `W${c.w + 1}` : `W${c.w + 1} ${Wd.THEMES[c.world.theme].name.replace('De ', '')}`;
  ctx.fillText(`${world}${sc2 ? ` · ${sc2.score}` : ''}`, x + w - fs * .6, y + fs * 1.3);
  ctx.textAlign = 'left';
  ctx.strokeStyle = r ? r.color : '#4cc9ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

// De racebalk: per wereld een stuk, elke ridder op zijn plaats.
function drawRace(x, y, w, h, t) {
  ctx.fillStyle = '#070b18';
  ctx.fillRect(x, y, w, h);
  let maxW = 1;
  for (const r of ranking) maxW = Math.max(maxW, Math.floor(r.prog) + 1);
  const segs = Math.max(2, maxW + (maxW < 4 ? 1 : 0));
  const pad = Math.round(h * .3);
  const x0 = x + pad, x1 = x + w - pad;
  const seg = (x1 - x0) / segs;
  const ty = y + h * .62;
  ctx.font = `800 ${Math.max(10, Math.round(h * .16))}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  for (let i = 0; i < segs; i++) {
    const P = PxDraw.PAL[i % 4];
    ctx.fillStyle = P.grass;
    ctx.globalAlpha = .55;
    ctx.fillRect(x0 + i * seg + 2, ty - 3, seg - 4, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8fa3c7';
    ctx.fillText(`W${i + 1}`, x0 + (i + .5) * seg, y + h * .2);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x0 + (i + 1) * seg - 2, ty - 10, 4, 20);
  }
  ctx.textAlign = 'left';
  const size = Math.max(16, Math.round(h * .42));
  const list = ranking.slice().sort((a, b) => a.prog - b.prog);
  list.forEach((r, i) => {
    const px = x0 + Math.min(segs, r.prog) * seg;
    const lane = i % 3;
    const py = ty - size * .55 + (lane - 1) * size * .28;
    const av = Avatar.byName(r.name);
    const isLead = r.n === leader;
    if (isLead) Glow.glow(ctx, px, py, size * .9, '#ffc94a', .5);
    if (av) {
      const img = Avatar.head(av, 4);
      ctx.drawImage(img, px - size / 2, py - size * .35, size, size * img.height / img.width);
    } else {
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(px, py, size * .3, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = r.color;
    ctx.fillRect(px - 2, ty - 2, 4, 4);
  });
}

const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const { w, h } = AK.fit(canvas, 1);
  const time = Math.max(0, (Date.now() + offset - state.startedAt) / 1000);
  choose(t);
  for (const c of cams) stepCam(c, dt, time, t);
  for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.4) pops.splice(i, 1); }
  ctx.fillStyle = '#03050b';
  ctx.fillRect(0, 0, w, h);
  const gap = Math.round(w * .008) + 4;
  const raceH = Math.round(h * .16);
  drawRace(0, 0, w, raceH, t);
  // liggende camera's: de koploper groot, de andere twee eronder naast elkaar
  const top = raceH + gap, ch = h - top;
  const n = cams.filter(c => c.n >= 0).length;
  if (n <= 1) drawCam(cams[0], 0, top, w, ch, t, time);
  else {
    const bh = Math.round(ch * .6);
    drawCam(cams[0], 0, top, w, bh, t, time);
    const sy = top + bh + gap, sh = ch - bh - gap;
    if (n === 2) drawCam(cams[1], 0, sy, w, sh, t, time);
    else {
      const sw = Math.round((w - gap) / 2);
      drawCam(cams[1], 0, sy, sw, sh, t, time);
      drawCam(cams[2], sw + gap, sy, w - sw - gap, sh, t, time);
    }
  }
  // aftellen
  const wait = state.startedAt - (Date.now() + offset);
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
  let busy = 0;
  for (const n of roster.keys()) { const v = pos.get(n); if (v && v[3] & 128) busy++; }
  $('p-alive').textContent = `${roster.size} ${roster.size === 1 ? 'ridder' : 'ridders'}${busy ? ` · ❓ ${busy} aan een vraag` : ''}`;
  if (left < 60000 && left > 59000 && !state.warned) { state.warned = true; banner('⏳ Nog één minuut!'); sfx.go(); }
}, 200);

$('start').addEventListener('click', () => socket.emit('px-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('px-finish');
});
$('restart').addEventListener('click', () => socket.emit('px-restart'));
$('close').addEventListener('click', () => socket.emit('px-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('px-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} is de grootste Pixelridder!` : 'Pixelridder is voorbij';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const worlds = s.ranking.reduce((a, r) => a + r.worlds, 0);
  $('w-why').textContent = `Samen ${right} vragen juist en ${worlds} ${worlds === 1 ? 'runepoort' : 'runepoorten'} gehaald.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🏁 ${p.worlds} · 🪙 ${p.coins} · 👾 ${p.kills} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
