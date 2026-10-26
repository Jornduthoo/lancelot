// Burchtstorm op het bord: alle burchttorens naast elkaar, met de aanvallen die als lichtbollen van toren naar toren vliegen.
// Elke toren wordt alleen opnieuw getekend als hij veranderde; elke frame kopiëren we de klaar getekende torens.
// Gebruikt sfx, confetti, Glow en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, BsCore en BsDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const towers = new Map(); // n -> { b, f, inc, combo, canvas, dirty, x, y, w, h, hit }
const sparks = BsDraw.Sparks();
const flights = [];
const pops = [];
let leader = -1;

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
    loadGame('bs-load', { file: q.file, minutes: Number($('bs-minutes').value), tempo: $('bs-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

function tower(n) {
  let t = towers.get(n);
  if (!t) {
    t = { b: '0'.repeat(BsCore.VIS * BsCore.W), f: 0, inc: 0, combo: 0, canvas: document.createElement('canvas'), dirty: true, x: 0, y: 0, w: 0, h: 0, hit: 0 };
    towers.set(n, t);
  }
  return t;
}
function setBoards(list) {
  for (const [n, b, f, inc, combo] of list || []) {
    const t = tower(n);
    if (t.b !== b || (t.f & 8) !== (f & 8)) t.dirty = true;
    t.b = b;
    t.f = f;
    t.inc = inc;
    t.combo = combo;
  }
}

socket.on('bs-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Burchtstorm · ${s.title}` : 'Burchtstorm';
  if (prev && prev.run !== s.run) { towers.clear(); flights.length = 0; leader = -1; }
  for (const n of [...towers.keys()]) if (!roster.has(n)) towers.delete(n);
  setBoards(s.boards);
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    layoutDirty = true;
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('bs-tick', msg => {
  if (!state || state.phase !== 'play') return;
  setBoards(msg.b);
  for (const e of msg.ev) onEvent(e);
  if (msg.ranking) {
    state.ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function center(n) {
  const t = towers.get(n);
  return t ? { x: t.x + t.w / 2, y: t.y + t.h * .45 } : null;
}

function onEvent(e) {
  const [kind] = e;
  if (kind === 'atk' || kind === 'vuur' || kind === 'blok') {
    const a = center(e[1]), b = center(e[2]);
    if (a && b) flights.push({ a, b, to: e[2], n: e[3], t: 0, color: kind === 'vuur' ? '#ff7a45' : (roster.get(e[1]) || {}).color || '#ffc94a', blok: kind === 'blok' });
    if (kind === 'vuur') {
      const f = roster.get(e[1]), t = roster.get(e[2]);
      if (f && t) banner(`🐉 ${f.name} spuwt drakenvuur naar ${t.name}!`);
      sfx.whoosh();
    } else if (e[3] >= 4) sfx.laser();
  } else if (kind === 'ko') {
    const c = center(e[1]);
    if (c) {
      for (let i = 0; i < 30; i++) sparks.add(c.x + (Math.random() - .5) * 60, c.y + (Math.random() - .5) * 120, '#ff4d6d', 1, 380, 5, 1);
      pops.push({ x: c.x, y: c.y, text: 'INGESTORT', color: '#ff4d6d', t: 0 });
    }
    sfx.boom();
  } else if (kind === 'clr') {
    const c = center(e[1]), r = roster.get(e[1]);
    const what = e[3] === 'pc' ? 'PERFECT!' : e[3] === 't' ? 'T-SPIN!' : e[2] === 4 ? 'STORM!' : `COMBO ×${e[4] + 1}`;
    if (c) {
      pops.push({ x: c.x, y: c.y, text: what, color: '#ffc94a', t: 0 });
      for (let i = 0; i < 18; i++) sparks.add(c.x, c.y, BsCore.COLORS[1 + (i % 7)], 1, 320, 4, .9);
    }
    if (r && (e[3] || e[2] === 4)) { banner(`⚡ ${r.name}: ${e[3] === 'pc' ? 'een perfect lege burcht' : e[3] === 't' ? 'T-SPIN' : 'BURCHTSTORM, vier rijen'}!`); sfx.power(); }
  } else if (kind === 'rune') {
    const c = center(e[1]);
    if (c) for (let i = 0; i < 10; i++) sparks.add(c.x, c.y, '#7ef0ff', 1, 200, 3, .7);
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
    el.addEventListener('click', () => socket.emit('bs-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
let scores = new Map();
function renderSide(ranking, feed) {
  ranking = ranking || [];
  scores = new Map(ranking.map((r, i) => [r.n, { score: r.score, rank: i + 1 }]));
  const top = ranking[0];
  if (top && top.score > 0 && top.n !== leader) {
    if (leader >= 0 && ranking.length > 1) banner(`👑 ${top.name} neemt de leiding`);
    leader = top.n;
  }
  $('p-top').innerHTML = ranking.slice(0, 12).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${r.n === leader ? '👑 ' : ''}${AK.esc(r.name)}</span><b>${r.score}</b></li>`).join('');
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
let layoutDirty = true;
let lay = { w: 0, h: 0, n: 0, cell: 0 };

// Zoek het raster (kolommen x rijen) waarin de torens zo groot mogelijk zijn.
function place(w, h) {
  const list = [...roster.keys()];
  const count = Math.max(1, list.length);
  let best = { cell: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cell = Math.floor(Math.min((w / cols - 18) / (BsCore.W + 1.6), (h / rows - 34) / (BsCore.VIS + 2.4)));
    if (cell > best.cell) best = { cols, rows, cell };
  }
  const cell = Math.max(3, Math.min(best.cell, 34));
  const sample = BsDraw.well(cell);
  const tw = sample.c.width, th = sample.c.height;
  const gy = Math.max(4, (h - best.rows * (th + 30)) / (best.rows + 1));
  list.forEach((n, i) => {
    const t = tower(n);
    const col = i % best.cols, row = Math.floor(i / best.cols);
    // de laatste rij in het midden
    const inRow = row === best.rows - 1 ? list.length - row * best.cols : best.cols;
    const rowGx = (w - inRow * tw) / (inRow + 1);
    t.x = Math.round(rowGx + col * (tw + rowGx));
    t.y = Math.round(gy + row * (th + 30 + gy));
    t.w = tw;
    t.h = th;
    t.dirty = true;
  });
  lay = { w, h, n: list.length, cell };
}

let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play') return;
  const { w, h } = AK.fit(canvas, 1.25);
  if (layoutDirty || lay.w !== w || lay.h !== h || lay.n !== roster.size) { place(w, h); layoutDirty = false; }
  BsDraw.background($('p-bg'), w, h);
  ctx.clearRect(0, 0, w, h);
  const cell = lay.cell;
  const font = Math.max(11, Math.round(cell * .62));
  for (const [n, tw] of towers) {
    const r = roster.get(n);
    if (!r) continue;
    if (tw.dirty) { BsDraw.boardCanvas(tw.canvas, tw.b, cell, r.color, tw.f); tw.dirty = false; }
    tw.hit = Math.max(0, tw.hit - dt * 3);
    const sx = tw.hit ? (Math.random() - .5) * tw.hit * 10 : 0;
    // De koploper staat in een gouden gloed met een kroon.
    if (n === leader) Glow.glow(ctx, tw.x + tw.w / 2, tw.y + tw.h / 2, tw.h * .7, '#ffc94a', .35 + Math.sin(t / 300) * .1);
    if (tw.f & 2) Glow.glow(ctx, tw.x + tw.w / 2, tw.y + cell * .4, tw.w * .7, '#ff9a3d', .55 + Math.sin(t / 140) * .2, .4);
    ctx.drawImage(tw.canvas, tw.x + sx, tw.y);
    if (tw.f & 1) {
      ctx.save();
      ctx.strokeStyle = '#7ef0ff';
      ctx.lineWidth = Math.max(2, cell * .14);
      ctx.setLineDash([cell * .6, cell * .35]);
      ctx.lineDashOffset = -t / 30;
      ctx.globalAlpha = .75;
      ctx.strokeRect(tw.x + 1, tw.y + 1, tw.w - 2, tw.h - 2);
      ctx.restore();
    }
    // inkomende belegering: rode balk links naast de toren
    if (tw.inc) {
      const ph = Math.min(BsCore.VIS, tw.inc) * cell;
      ctx.fillStyle = `rgba(255,60,90,${.7 + Math.sin(t / 90) * .25})`;
      ctx.fillRect(tw.x - cell * .5, tw.y + tw.h - ph - cell * .45, cell * .35, ph);
    }
    if (tw.f & 4) {
      ctx.fillStyle = 'rgba(3,5,11,.55)';
      ctx.fillRect(tw.x, tw.y, tw.w, tw.h);
      ctx.font = `${Math.round(tw.w * .35)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('❓', tw.x + tw.w / 2, tw.y + tw.h / 2 + tw.w * .12);
    }
    // naam en punten
    const sc = scores.get(n);
    ctx.textAlign = 'center';
    ctx.font = `800 ${font}px Rajdhani, sans-serif`;
    ctx.fillStyle = r.color;
    const label = `${n === leader ? '👑 ' : ''}${r.name}`;
    ctx.fillText(label.length > 16 ? `${label.slice(0, 15)}…` : label, tw.x + tw.w / 2, tw.y + tw.h + font * 1.05);
    if (sc) {
      ctx.fillStyle = '#e8f1ff';
      ctx.font = `800 ${Math.round(font * .85)}px Orbitron, sans-serif`;
      ctx.fillText(`#${sc.rank} · ${sc.score}`, tw.x + tw.w / 2, tw.y + tw.h + font * 2.05);
    }
    if (tw.combo >= 2) {
      ctx.fillStyle = '#ffc94a';
      ctx.font = `900 ${Math.round(font * .9)}px Orbitron, sans-serif`;
      ctx.fillText(`×${tw.combo + 1}`, tw.x + tw.w / 2, tw.y + cell * 2.4);
    }
  }
  ctx.textAlign = 'left';
  // Aanvallen in de lucht
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i];
    f.t += dt / .7;
    if (f.t >= 1) {
      flights.splice(i, 1);
      const tw = towers.get(f.to);
      if (f.blok) {
        for (let k = 0; k < 16; k++) sparks.add(f.b.x, f.b.y, '#7ef0ff', 1, 300, 4, .6);
        pops.push({ x: f.b.x, y: f.b.y, text: '🛡', color: '#7ef0ff', t: 0 });
        sfx.hit();
      } else {
        for (let k = 0; k < 6 + f.n * 2; k++) sparks.add(f.b.x, f.b.y + lay.cell * 6, f.color, 1, 260, 4, .6);
        if (tw) tw.hit = Math.min(1, .4 + f.n * .1);
      }
      continue;
    }
    BsDraw.bolt(ctx, f.a.x, f.a.y, f.b.x, f.b.y, f.t, f.color, f.n);
  }
  sparks.update(dt);
  sparks.draw(ctx);
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt;
    if (p.t > 1.1) { pops.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, (1.1 - p.t) * 2);
    ctx.fillStyle = p.color;
    ctx.font = `900 ${Math.max(14, Math.round(lay.cell * 1.1))}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y - p.t * 40);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  // Aftellen voor de start
  const wait = state ? state.startedAt - (Date.now() + offset) : 0;
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
  const busy = [...towers.values()].filter(t => t.f & 4).length;
  $('p-alive').textContent = `${roster.size} ${roster.size === 1 ? 'burcht' : 'burchten'}${busy ? ` · ❓ ${busy} aan een vraag` : ''}`;
  if (left < 60000 && left > 59000 && !state.warned) { state.warned = true; banner('⏳ Nog één minuut!'); sfx.go(); }
}, 200);

$('start').addEventListener('click', () => socket.emit('bs-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('bs-finish');
});
$('restart').addEventListener('click', () => socket.emit('bs-restart'));
$('close').addEventListener('click', () => socket.emit('bs-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('bs-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} is de Heer van de Burchtstorm!` : 'Burchtstorm is voorbij';
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const lines = s.ranking.reduce((a, r) => a + r.lines, 0);
  $('w-why').textContent = `Samen ${right} vragen juist en ${lines} rijen opgeruimd.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">⚔ ${p.sent} · 🧱 ${p.lines} · 💥 ${p.kos} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
