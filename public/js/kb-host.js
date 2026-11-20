// Kegelridder op het bord: de kegelhal speelt de mooiste worpen van de klas na (strikes en spares eerst),
// met naast de baan de stand en wat er net gebeurde. Elke worp is vier getallen; het bord rekent hem zelf na (kb-world.js).
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, KbWorld en KbDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const W = KbWorld;
let state = null;
let prev = null;
let offset = 0;
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
    loadGame('kb-load', { file: q.file, minutes: Number($('kb-minutes').value), tempo: $('kb-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('kb-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Kegelridder · ${s.title}` : 'Kegelridder';
  if (prev && prev.run !== s.run) { queue.length = 0; replay = null; seen = 0; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    take(s.throws);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('kb-tick', msg => {
  if (!state || state.phase !== 'play') return;
  state.ranking = msg.ranking;
  state.feed = msg.feed;
  renderSide(msg.ranking, msg.feed);
  take(msg.throws);
});

// ---------- De worpen naspelen ----------
const queue = [];
let seen = 0;
let replay = null;
function take(throws) {
  for (const t of throws || []) {
    if (t.id <= seen) continue;
    seen = t.id;
    queue.push(t);
  }
  // Te veel in de wachtrij: gewone worpen vallen weg, strikes en spares blijven (maar nooit meer dan 4).
  while (queue.length > 3) {
    const i = queue.findIndex(t => !t.kind);
    if (i >= 0) queue.splice(i, 1); else queue.shift();
  }
}

function nextReplay(t) {
  const th = queue.shift();
  if (!th) return null;
  const sim = W.create(th.t, th.standing, th.gold);
  // De server wist al welke kegels vielen; dat tonen we ook als de uitslag.
  return { th, sim, clock: 0, hitAt: -1, ended: 0, hits: 0, shown: false };
}

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'kegelridder' : 'kegelridders';
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
    el.addEventListener('click', () => socket.emit('kb-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastSide = '';
let lastFeed = '';
function renderSide(ranking, feed) {
  const html = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">${r.strikes ? `X ${r.strikes}` : ''}${r.spares ? ` · / ${r.spares}` : ''}</small></span><b>${r.score}</b></li>`).join('');
  if (html !== lastSide) { lastSide = html; $('p-top').innerHTML = html; }
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
  const pins = (ranking || []).reduce((a, r) => a + r.pins, 0);
  $('p-alive').textContent = `🎳 ${pins} ${pins === 1 ? 'kegel' : 'kegels'} om`;
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
const fx = new AK.Particles();
let camY = -2.2, camX = 0;
let last = performance.now();
const SPEED = 1.3; // het bord speelt iets sneller na, zo blijft het bij
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const fit = AK.fit(canvas, 1.25);
  const w = fit.w, h = fit.h;
  if (!replay && queue.length) replay = nextReplay(t);
  const o = { t: t / 1000 };
  let wantY = -2.2, wantX = 0;
  if (replay) {
    const r = replay;
    const slow = r.hitAt >= 0 && r.sim.t - r.hitAt < .9;
    r.clock += dt * (slow ? .45 : SPEED);
    W.runTo(r.sim, r.clock);
    const down = r.sim.pins.filter(p => p.down).length;
    if (down > r.hits) { if (!r.hits) { sfx.boom(); r.hitAt = r.sim.t; } r.hits = down; }
    o.sim = r.sim;
    o.name = r.th;
    wantY = KbDraw.camFor(r.sim.b.pit ? W.HEAD : r.sim.b.y);
    wantX = r.sim.b.gutter ? 0 : r.sim.b.x * .4;
    if (r.sim.done) {
      if (!r.ended) r.ended = t;
      if (!r.shown) {
        r.shown = true;
        const n = r.th.down.length;
        if (r.th.kind === 'strike') { banner(`🎳 STRIKE! ${r.th.name}`); sfx.fanfare(); stars(w / fit.dpr / 2, h / fit.dpr * .35, 50); }
        else if (r.th.kind === 'spare') { banner(`✨ SPARE! ${r.th.name}`); sfx.go(); stars(w / fit.dpr / 2, h / fit.dpr * .35, 26); }
        else banner(`${r.th.name}: ${n} ${n === 1 ? 'kegel' : 'kegels'}`);
      }
      o.fade = Math.max(0, 1 - (t - r.ended) / 900);
      if (t - r.ended > (r.th.kind ? 1600 : 900)) replay = null;
    }
  } else {
    o.standing = Array(10).fill(true);
  }
  camY += (wantY - camY) * Math.min(1, dt * 5);
  camX += (wantX - camX) * Math.min(1, dt * 3);
  o.camY = camY;
  o.camX = camX;
  KbDraw.render(ctx, w, h, o);
  // Wie gooit er nu?
  if (replay) {
    const th = replay.th;
    ctx.save();
    ctx.font = `800 ${Math.round(h * .036)}px Orbitron, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(5,6,15,.6)';
    const label = `${th.name} · beurt ${th.frame} · bal ${th.ball}${th.gold ? ' · ✨' : ''}`;
    const tw = Math.min(ctx.measureText(label).width, w * .26);
    ctx.fillRect(h * .02, h * .02, tw + h * .05, h * .065);
    ctx.fillStyle = th.color;
    ctx.fillRect(h * .02, h * .02, h * .012, h * .065);
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(label, h * .045, h * .035, w * .26);
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = `800 ${Math.round(h * .05)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc94a';
    ctx.globalAlpha = .75 + .25 * Math.sin(t / 400);
    ctx.fillText('Wie gooit de volgende strike?', w / 2, h * .12);
    ctx.restore();
  }
  fx.update(dt);
  ctx.save();
  ctx.scale(fit.dpr, fit.dpr);
  fx.draw(ctx);
  ctx.restore();
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

// Glimmende runensterren (geen confetti).
function stars(x, y, n) {
  fx.burst(x, y, { n, color: '#ffc94a', speed: 520, life: 1.1, size: 6, up: 140 });
  fx.sparks(x, y, { n: Math.round(n / 2), color: '#5ee7ff', speed: 620 });
  fx.shock(x, y, 120, '#ffc94a');
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('kb-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('kb-finish');
});
$('restart').addEventListener('click', () => socket.emit('kb-restart'));
$('close').addEventListener('click', () => socket.emit('kb-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('kb-stop', null, res => {
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
  const pins = s.ranking.reduce((a, r) => a + r.pins, 0);
  const strikes = s.ranking.reduce((a, r) => a + r.strikes, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Kegelridder!` : 'Kegelridder is voorbij';
  $('w-why').textContent = `Samen ${pins} kegels om, ${strikes} strikes en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🎳 ${p.pins} · X ${p.strikes} · / ${p.spares} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
