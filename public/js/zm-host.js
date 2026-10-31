// Zwermwacht op het bord: alle ridders op de burchtplaats, elk met zijn niveau, hartjes, robots en wapens.
// Rond elke ridder zwermen kleine robots (hoe meer er op zijn scherm zijn, hoe meer). Bovenaan het klasdoel,
// rechts de stand, wie het langst overleeft en wat er gebeurt.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, ZmWorld en ZmDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const live = new Map(); // n -> { kills, lvl, hp, maxHp, downs, asking, w, alive, boss, flash, lvlFlash }

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
    loadGame('zm-load', { file: q.file, minutes: Number($('zm-minutes').value), tempo: $('zm-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('zm-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const on = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Zwermwacht · ${s.title}` : 'Zwermwacht';
  if (prev && prev.run !== s.run) live.clear();
  if (!on) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    renderGoal(s.kills || 0, s.goal, s.goalHit);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

let goalWas = false;
socket.on('zm-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now() / 1000;
  for (const [n, kills, lvl, hp, maxHp, downs, asking, w, alive, boss] of msg.r) {
    let v = live.get(n);
    if (!v) { v = { kills, lvl, flash: -9, lvlFlash: -9, bossWas: 0 }; live.set(n, v); }
    if (lvl > v.lvl) v.lvlFlash = t;
    if (v.boss && !boss && hp > 0) { v.flash = t; sfx.fanfare(); }
    Object.assign(v, { kills, lvl, hp, maxHp, downs, asking, w, alive, boss });
  }
  renderGoal(msg.kills, msg.goal, msg.goalHit);
  if (msg.ranking) {
    state.ranking = msg.ranking;
    if (msg.feed) state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

function renderGoal(kills, goal, hit) {
  const k = goal ? Math.min(1, kills / goal) : 0;
  $('p-doel').firstChild.style.width = `${Math.round(k * 100)}%`;
  $('p-doel').classList.toggle('vol', !!hit);
  $('p-alive').textContent = hit ? `🎯 Klasdoel gehaald: ${kills} robots!` : `🎯 Klasdoel: ${kills} / ${goal} robots`;
  if (hit && !goalWas) { sfx.fanfare(); confetti(3000); }
  goalWas = !!hit;
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
    el.addEventListener('click', () => socket.emit('zm-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let lastFeed = '';
let lastTop = '';
function renderSide(ranking, feed) {
  const top = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">⭐ ${r.lvl + 1} · 🤖 ${r.kills}</small></span><b>${r.score}</b></li>`).join('');
  if (top !== lastTop) { lastTop = top; $('p-top').innerHTML = top; }
  const best = (ranking || []).slice().sort((a, b) => b.bestLife - a.bestLife)[0];
  $('p-life').textContent = best ? `${best.name} · ${mmss(best.bestLife)}` : '';
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
const SWARM = ['kever', 'bij', 'kever', 'slijm', 'kever', 'schild', 'bij', 'drone'];
function frame(t) {
  requestAnimationFrame(frame);
  if (view !== 'play' || !state) return;
  const { w, h } = AK.fit(canvas, 1.25);
  const sec = t / 1000;
  ZmDraw.arena(ctx, w, h);
  const list = [...roster.values()].sort((a, b) => a.n - b.n);
  const n = Math.max(1, list.length);
  // Zoveel kolommen dat de vakjes zo groot mogelijk zijn (ongeveer vierkant).
  let cols = 1;
  let bestSize = 0;
  for (let c = 1; c <= n; c++) {
    const rows = Math.ceil(n / c);
    const size = Math.min(w / c, h / rows);
    if (size > bestSize) { bestSize = size; cols = c; }
  }
  const rows = Math.ceil(n / cols);
  const cw = w / cols, ch = h / rows;
  const u = Math.min(cw, ch);
  const fs = Math.max(10, Math.min(22, u * .085));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  list.forEach((p, i) => {
    const v = live.get(p.n) || { kills: 0, lvl: 0, hp: 5, maxHp: 5, downs: 0, asking: 0, w: '10000', alive: 0, boss: 0, flash: -9, lvlFlash: -9 };
    const cx = (i % cols + .5) * cw, cy = Math.floor(i / cols) * ch + ch * .44;
    const ks = u * .34;
    // Lichtring in de kleur van de leerling
    ZmDraw.glow(ctx, cx, cy + ks * .35, ks * .9, p.color, .45);
    // De zwerm rond de ridder: tot 8 robots, hoe meer er op zijn scherm zijn
    const m = Math.min(8, Math.ceil((v.alive || 0) / 12));
    for (let j = 0; j < m; j++) {
      const a = sec * (.5 + j * .07) + j / m * Math.PI * 2;
      const rr = ks * (.85 + .1 * Math.sin(sec * 2 + j));
      const sp = ZmDraw.sprite(SWARM[j], ks * .32, { flip: Math.cos(a) > 0 });
      ctx.drawImage(sp, cx + Math.cos(a) * rr - sp.width / 2, cy + Math.sin(a) * rr * .55 - sp.height / 2);
    }
    if (v.boss) {
      const sp = ZmDraw.sprite('kolos', ks * .7);
      ctx.drawImage(sp, cx + ks * .55, cy - ks * .6 + Math.sin(sec * 2) * 4);
    }
    // De ridder (doorschijnend als hij gevallen is)
    ctx.globalAlpha = v.asking === 2 ? .4 : 1;
    const kn = ZmDraw.sprite('ridder', ks, { color: p.color });
    ctx.drawImage(kn, cx - kn.width / 2, cy - kn.height * .55 + Math.sin(sec * 3 + i) * 2);
    ctx.globalAlpha = 1;
    // Net een niveau hoger of de Kolos verslagen
    const lf = sec - v.lvlFlash;
    if (lf >= 0 && lf < 1) { ctx.globalAlpha = 1 - lf; ctx.strokeStyle = '#5ee7ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, ks * (.5 + lf), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    const bf = sec - v.flash;
    if (bf >= 0 && bf < 2.5) { ctx.font = `900 ${fs * 1.3}px Orbitron, sans-serif`; ctx.fillStyle = '#ffc94a'; ctx.globalAlpha = Math.min(1, 2.5 - bf); ctx.fillText('👑 KOLOS VERSLAGEN', cx, cy - ks * .8); ctx.globalAlpha = 1; }
    if (v.asking) { ctx.font = `${fs * 1.6}px sans-serif`; ctx.fillText('❓', cx + ks * .45, cy - ks * .45); }
    // Naambordje
    const by = cy + ks * .62;
    ctx.font = `800 ${fs}px Orbitron, sans-serif`;
    const lw = Math.max(ctx.measureText(p.name).width, fs * 7) + fs * 1.2;
    ctx.fillStyle = 'rgba(6,10,28,.78)';
    AK.roundRect(ctx, cx - lw / 2, by, lw, fs * 3.5, fs * .5);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - lw / 2 + fs * .5, by, lw - fs, 2);
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(p.name, cx, by + fs * .8);
    ctx.font = `700 ${fs * .8}px sans-serif`;
    ctx.fillStyle = '#ffc94a';
    const hearts = '❤️'.repeat(Math.max(0, v.hp || 0)) + '🖤'.repeat(Math.max(0, (v.maxHp || 5) - (v.hp || 0)));
    ctx.fillText(`⭐ ${v.lvl + 1}  🤖 ${v.kills}  ${hearts}`, cx, by + fs * 1.85);
    const wp = ZmWorld.WEAPON_IDS.map((id, j) => (Number((v.w || '')[j]) ? `${ZmWorld.WEAPONS[id].icon}${v.w[j]}` : '')).filter(Boolean).join(' ');
    ctx.fillText(wp, cx, by + fs * 2.85);
  });
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(String(Math.ceil(wait / 1000)), w / 2, h / 2);
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

$('start').addEventListener('click', () => socket.emit('zm-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('zm-finish');
});
$('restart').addEventListener('click', () => socket.emit('zm-restart'));
$('close').addEventListener('click', () => socket.emit('zm-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('zm-stop', null, res => {
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
  $('w-title').textContent = top ? `🏆 ${top.name} wint Zwermwacht!` : 'Zwermwacht is voorbij';
  $('w-why').textContent = `Samen ${kills} robots verslagen${s.goalHit ? ' (klasdoel gehaald!)' : ''} en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">⭐ ${p.lvl + 1} · 🤖 ${p.kills} · ❤️ ${mmss(p.bestLife)}${p.bosses ? ` · 👑 ${p.bosses}` : ''} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
