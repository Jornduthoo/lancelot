// Robopaarden op het bord: de stal met alle zelfgebouwde paarden, dan de baan van bovenaf met alle paarden live
// (of in 3D achter de leider aan), de stand met ronden en wie er net een vraag beantwoordt.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, RpWorld, RpDraw en Rp3D.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const Wd = RpWorld;
let state = null;
let prev = null;
let offset = 0;
const info = new Map(); // n -> { name, look, neon, av, phase }
const interp = new AK.Interp(130);
let flags = new Map();
let shots = [];
let traps = [];
let order = [];
const rings = [];

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
    loadGame('rp-load', { file: q.file, minutes: Number($('rp-minutes').value), tempo: $('rp-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

function setRoster(list) {
  const seen = new Set();
  for (const r of list || []) {
    seen.add(r.n);
    const old = info.get(r.n);
    info.set(r.n, {
      id: r.id, name: r.name, look: r.look, neon: RpDraw.colors(r.look).neon,
      av: typeof Avatar !== 'undefined' ? Avatar.byName(r.name) : null, phase: old ? old.phase : Math.random(),
    });
  }
  for (const n of [...info.keys()]) if (!seen.has(n)) info.delete(n);
}

socket.on('rp-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  setRoster(s.roster);
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Robopaarden · ${s.title}` : 'Robopaarden';
  if (!prev || prev.run !== s.run) { interp.clear(); shots = []; traps = []; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed, s.bestLap);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});
socket.on('rp-roster', list => { setRoster(list); if (state) state.roster = list; });

socket.on('rp-world', d => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now();
  for (const [n, x, y, z, a, v, f] of d.p) {
    interp.push(n, [x, y, a, z, v, f], t);
    flags.set(n, f);
  }
  interp.prune(t, 1500);
  shots = d.s.map(([k, id, x, y, a]) => ({ kind: k === 2 ? 'valk' : 'vuurbal', id, x, y, a }));
  if (d.t) traps = d.t.map(([id, x, y]) => ({ id, x, y }));
  if (d.ranking) {
    state.ranking = d.ranking;
    order = d.ranking.map(r => r.n);
    renderSide(d.ranking, d.feed, d.bestLap);
  }
});
socket.on('rp-hit', h => {
  rings.push({ x: h.x, y: h.y, at: performance.now(), color: h.blocked ? '#7fd8ff' : '#ff8c42' });
  Rp3D.boom(h.x, h.y, 200, h.blocked ? 'blue' : 'fire');
  if (Math.random() < .6) sfx.boom();
});
socket.on('rp-donder', () => { flash = performance.now() + 400; sfx.boom(); });
let flash = 0;

// ---------- De stal ----------
function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'robotpaard' : 'robotpaarden';
  $('start').disabled = list.length === 0;
  const box = $('names');
  const current = new Set(list.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Map([...box.children].map(el => [el.dataset.id, el]));
  for (const p of list) {
    let el = known.get(p.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'rp-card';
      el.dataset.id = p.id;
      el.title = 'Verwijderen';
      el.innerHTML = '<canvas width="210" height="168"></canvas><b></b>';
      el.addEventListener('click', () => { if (confirm(`${p.name} uit de race halen?`)) socket.emit('rp-kick', p.id); });
      box.appendChild(el);
      if (prev && prev.phase === 'lobby') sfx.join();
    }
    el.querySelector('b').textContent = p.name;
    el.style.setProperty('--c', RpDraw.colors(p.look).neon);
    el.dataset.n = p.n;
  }
}

// ---------- Stand en feed ----------
let lastFeed = '';
function renderSide(ranking, feed, bestLap) {
  $('p-rank').innerHTML = (ranking || []).slice(0, 16).map((r, i) => {
    const neon = RpDraw.colors(r.look).neon;
    return `<li><span class="pos">${i + 1}</span><i class="dot" style="--c:${neon}"></i><span>${AK.esc(r.name)}${r.asking ? ' <small>❓</small>' : ''}</span><small>ronde ${r.laps + 1}</small></li>`;
  }).join('');
  $('p-record').textContent = bestLap ? `⏱️ ${bestLap.name}: ${(bestLap.ms / 1000).toFixed(1).replace('.', ',')} s` : '';
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    const fresh = feed && feed[0] && (!lastFeed || !lastFeed.includes(JSON.stringify(feed[0].text)));
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
    if (fresh && feed[0].big) banner(feed[0].text);
  }
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = text;
  el.append(strong);
  el.className = 'ls-banner show gold';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- Tekenen ----------
const canvas = $('p-map');
const ctx = canvas.getContext('2d');
let follow = false;
$('p-view').addEventListener('click', () => {
  follow = !follow;
  $('p-view').textContent = follow ? '🗺️ Hele baan' : '🎥 Volg de leider';
});
let map = null;
let mapBg = null;
let camA = 0;
// Haalt het bord het niet, dan tekenen we op minder pixels (iets zachter, maar vloeiend).
let sharp = 1.25;
const bq = { from: 0, frames: 0 };
function boardQuality(t) {
  if (!bq.from) bq.from = t;
  bq.frames++;
  if (t - bq.from < 2000) return;
  const fps = (bq.frames * 1000) / (t - bq.from);
  bq.from = t;
  bq.frames = 0;
  if (fps < 40 && sharp > .8) sharp = Math.max(.8, sharp - .15);
}
let last = performance.now();
function frame(pt) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (pt - last) / 1000);
  last = pt;
  if (view === 'lobby') return drawStall(pt);
  if (view !== 'play' || !state) return;
  boardQuality(pt);
  // De 3D-camera op het grote bord: minder pixels, het beeld is toch zacht (mist, lucht).
  const { w, h } = AK.fit(canvas, follow ? Math.min(sharp, .7) : sharp);
  const ranks = new Map(order.map((n, i) => [n, i + 1]));
  const horses = [];
  for (const n of interp.ids()) {
    const o = interp.get(n, pt);
    const inf = info.get(n);
    if (!o || !inf) continue;
    inf.phase = (inf.phase + (Math.abs(o[4]) * dt) / 190) % 1;
    const f = o[5];
    horses.push({ n, x: o[0], y: o[1], a: o[2], z: o[3], v: o[4], look: inf.look, av: inf.av, name: inf.name, neon: inf.neon, rank: ranks.get(n),
      frame: Math.floor(inf.phase * RpDraw.FRAMES), spin: f & 1, shield: f & 2, asking: f & 4, boost: f & 8, zap: f & 16 });
  }
  const leader = horses.find(o => o.n === order[0]);
  if (follow && leader) {
    camA += Wd.wrap(leader.a - camA) * Math.min(1, dt * 4);
    Rp3D.render(ctx, w, h, {
      me: leader, a: camA, t: pt / 1000, quality: .9,
      self: { ...leader, frame: leader.frame },
      others: horses.filter(o => o !== leader), boxes: null, shots, traps,
    });
    ctx.font = `800 ${Math.round(h * .035)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5, 8, 20, .7)';
    ctx.fillRect(10, 10, ctx.measureText(`👑 ${leader.name}`).width + 24, h * .055);
    ctx.fillStyle = '#ffd34f';
    ctx.fillText(`👑 ${leader.name}`, 22, 10 + h * .042);
  } else {
    drawMap(w, h, pt, horses);
  }
  if (pt < flash) {
    ctx.fillStyle = `rgba(200, 230, 255, ${(flash - pt) / 800})`;
    ctx.fillRect(0, 0, w, h);
  }
  const wait = state.startedAt - (Date.now() + offset);
  $('p-countdown').classList.toggle('hidden', !(wait > -800));
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
  else if (wait > -800) $('p-countdown').textContent = 'GO!';
}
requestAnimationFrame(frame);

function drawMap(w, h, pt, horses) {
  if (!map) map = RpDraw.mapImage(.2, { hideSecret: true });
  const k = Math.min(w / Wd.W, h / Wd.H);
  const ox = (w - Wd.W * k) / 2, oy = (h - Wd.H * k) / 2;
  // De kaart één keer op schermgrootte zetten: elke frame verkleinen kost te veel op een zwak bord.
  if (!mapBg || mapBg.width !== w || mapBg.height !== h) {
    mapBg = document.createElement('canvas');
    mapBg.width = w;
    mapBg.height = h;
    const m = mapBg.getContext('2d');
    m.fillStyle = '#0c1f20';
    m.fillRect(0, 0, w, h);
    m.drawImage(map, ox, oy, Wd.W * k, Wd.H * k);
  }
  ctx.drawImage(mapBg, 0, 0);
  const X = x => ox + x * k, Y = y => oy + y * k;
  // Runenkisten: kleine gouden blokjes.
  ctx.fillStyle = 'rgba(255, 211, 79, .85)';
  const bs = Math.max(3, 34 * k);
  for (const b of Wd.BOXES) ctx.fillRect(X(b.x) - bs / 2, Y(b.y) - bs / 2 + Math.sin(pt / 300 + b.id) * bs * .15, bs, bs);
  for (const t of traps) {
    ctx.fillStyle = '#c9d2e6';
    ctx.beginPath(); ctx.arc(X(t.x), Y(t.y), Math.max(3, 30 * k), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath(); ctx.arc(X(t.x), Y(t.y), Math.max(1.5, 12 * k), 0, Math.PI * 2); ctx.fill();
  }
  for (const s of shots) {
    const r = Math.max(5, 60 * k);
    const g = ctx.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), r);
    g.addColorStop(0, '#fff');
    g.addColorStop(.3, s.kind === 'valk' ? '#7fd8ff' : '#ff9b2f');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    const age = (pt - r.at) / 600;
    if (age >= 1) { rings.splice(i, 1); continue; }
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = 1 - age;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), (20 + age * 160) * k * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // De paarden: de leider bovenop.
  const size = Math.max(9, 60 * k);
  const sorted = [...horses].sort((a, b) => (b.rank || 99) - (a.rank || 99));
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.max(12, Math.round(size * .9))}px 'Exo 2', sans-serif`;
  for (const o of sorted) {
    const x = X(o.x), y = Y(o.y) - Math.max(0, o.z) * k * .6;
    const a = o.spin ? o.a + pt / 60 : o.a;
    RpDraw.marker(ctx, x, y, a, size * (1 + Math.max(0, o.z) / 600), o.look, { shield: o.shield, boost: o.boost });
    if (o.asking) {
      ctx.fillStyle = '#ffd34f';
      ctx.fillText('❓', x, y - size * 1.2);
    }
    const label = `${o.rank ? o.rank + '. ' : ''}${o.name}`;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(5, 8, 20, .72)';
    ctx.fillRect(x - tw / 2, y + size * .9, tw, size * 1.15);
    ctx.fillStyle = o.rank === 1 ? '#ffd34f' : o.neon;
    ctx.fillText(label, x, y + size * 1.8);
  }
}

// De stal: alle paarden galopperen ter plaatse.
function drawStall(pt) {
  for (const el of $('names').children) {
    const inf = info.get(Number(el.dataset.n));
    if (!inf) continue;
    const c = el.querySelector('canvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const frameNo = Math.floor(((pt / 650 + inf.phase) % 1) * RpDraw.FRAMES);
    RpDraw.horse(g, c.width / 2, c.height - 6, c.width * .95, inf.look, inf.av, 'side', frameNo, 1, true);
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const left = state.endsAt - (Date.now() + offset);
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('rp-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('De race nu stoppen en de eindstand tonen?')) socket.emit('rp-finish');
});
$('restart').addEventListener('click', () => socket.emit('rp-restart'));
$('close').addEventListener('click', () => socket.emit('rp-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('rp-stop', null, res => {
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

// ---------- Het podium: de drie snelste paarden op een erepodium ----------
let podiumRun = 0;
function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  const top = s.ranking[0];
  $('w-title').textContent = top ? `🏆 ${top.name} wint de race!` : 'De race is voorbij';
  const fmt = ms => (ms ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : '-');
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${RpDraw.colors(p.look).neon}"></i>${AK.esc(p.name)}</span><span class="muted">🏁 ${p.laps} ${p.laps === 1 ? 'ronde' : 'ronden'} · ⏱️ ${fmt(p.bestLap)} · 💥 ${p.hits} · ✔ ${p.right}</span><span class="pts">${(Math.round(p.km * 10) / 10).toString().replace('.', ',')}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
  const run = ++podiumRun;
  const c = $('podium-canvas');
  const g = c.getContext('2d');
  const spots = [[600, 330, 1], [330, 390, 2], [870, 420, 3]];
  (function draw(pt) {
    if (run !== podiumRun || view !== 'podium') return;
    requestAnimationFrame(draw);
    g.clearRect(0, 0, c.width, c.height);
    const glow = g.createRadialGradient(600, 300, 40, 600, 300, 600);
    glow.addColorStop(0, 'rgba(255, 211, 79, .18)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, c.width, c.height);
    for (const [x, y, place] of spots) {
      const r = s.ranking[place - 1];
      g.fillStyle = ['#ffd34f', '#c9d2e6', '#d08a4c'][place - 1];
      g.fillRect(x - 120, y, 240, 520 - y);
      g.fillStyle = 'rgba(0, 0, 0, .35)';
      g.fillRect(x - 120, y, 240, 12);
      g.font = "900 64px Orbitron, sans-serif";
      g.textAlign = 'center';
      g.fillStyle = 'rgba(10, 12, 30, .75)';
      g.fillText(String(place), x, y + 80);
      if (!r) continue;
      const av = typeof Avatar !== 'undefined' ? Avatar.byName(r.name) : null;
      RpDraw.live(g, r.look, av, 'side', ((pt / 650) + place * .3) % 1, pt / 1000, x, y - 4, 1.35);
      g.font = "800 28px 'Exo 2', sans-serif";
      g.fillStyle = '#fff';
      g.fillText(r.name, x, y - 250);
    }
  })(performance.now());
}
