// Kolkridder op het bord: de hele stad schuin van boven, met alle kolken en hun namen.
// Rechts de stand (breedte van elke kolk) en wat er gebeurt. Een opgeslokte kolk of burcht geeft een flits.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, KoWorld en KoDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
const colorOf = n => (roster.get(n) || {}).color;
let scene = new KoDraw.Scene();
const fx = new AK.Particles();
const res = new KoDraw.Res(.7);

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
    loadGame('ko-load', { file: q.file, minutes: Number($('ko-minutes').value), tempo: $('ko-tempo').value, duel: $('ko-duel').value === 'aan' }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('ko-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
    roster = new Map(s.roster.map(r => [r.n, r]));
    const on = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Kolkridder · ${s.title}${s.duel ? ' · duel' : ''}` : 'Kolkridder';
  if (prev && prev.run !== s.run) { scene = new KoDraw.Scene(); scene.onEvent = onEvent; }
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

socket.on('ko-world', msg => scene.setWorld(msg));
socket.on('ko-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  if (msg.ranking) {
    state.ranking = msg.ranking;
    if (msg.feed) state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

// Effecten in de stad (in meters; bij het tekenen omgerekend naar pixels)
const flashes = [];
function onEvent(e) {
  if (e[0] === 'd') {
    flashes.push({ x: e[3], y: e[4], t: performance.now() / 1000, color: colorOf(e[2]) || '#ffffff', r: 3 });
    sfx.boom();
  } else if (e[0] === 'e' && scene.objs[e[1]] && scene.objs[e[1]].k >= KoWorld.K.toren) {
    const o = scene.objs[e[1]];
    flashes.push({ x: o.x, y: o.y, t: performance.now() / 1000, color: colorOf(e[2]) || '#ffc94a', r: KoWorld.KINDS[o.k][1] });
    sfx.marker();
  } else if (e[0] === 'b') sfx.power();
}
scene.onEvent = onEvent;

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'kolkridder' : 'kolkridders';
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
    el.addEventListener('click', () => socket.emit('ko-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

const mText = r => `${String(Math.round(r * 20) / 10).replace('.', ',')} m`;
let lastFeed = '';
let lastTop = '';
function renderSide(ranking, feed) {
  const top = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">🏠 ${r.big}${state && state.duel ? ` · 🌀 ${r.slok}` : ''}</small></span><b>${mText(r.r)}</b></li>`).join('');
  if (top !== lastTop) { lastTop = top; $('p-top').innerHTML = top; }
  const eaten = (ranking || []).reduce((a, r) => a + r.eaten, 0);
  $('p-alive').textContent = `🌀 ${eaten} voorwerpen opgeslokt`;
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
  if (view !== 'play' || !state || !scene.L) return;
  res.frame(dt);
  const { w, h, dpr } = AK.fit(canvas, res.dpr(1.25));
  const sec = t / 1000;
  const L = scene.L;
  // De hele stad in beeld: schuin van boven is ze minder hoog, maar torens steken boven de bovenrand uit.
  const S = Math.min(w / (L + 4), h / ((L + 4) * KoWorld.TILT + 10));
  const cam = { x: L / 2, y: L / 2 - 4 / KoWorld.TILT, S, w, h, bake: true };
  KoDraw.render(ctx, scene, cam, { roster, t: sec, small: true, fs: Math.max(11, 13 * dpr / 1.25), fmax: 22 * dpr });
  const sx = x => w / 2 + (x - cam.x) * S, sy = y => h / 2 + (y - cam.y) * S * KoWorld.TILT;
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i], k = (sec - f.t) / .9;
    if (k >= 1) { flashes.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(2, S * .5) * (1 - k) + 1;
    ctx.beginPath();
    ctx.ellipse(sx(f.x), sy(f.y), S * f.r * (1 + k * 2), S * f.r * (1 + k * 2) * KoWorld.TILT, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  fx.update(dt);
  fx.draw(ctx);
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

$('start').addEventListener('click', () => socket.emit('ko-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('ko-finish');
});
$('restart').addEventListener('click', () => socket.emit('ko-restart'));
$('close').addEventListener('click', () => socket.emit('ko-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('ko-stop', null, res => {
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
  const eaten = s.ranking.reduce((a, r) => a + r.eaten, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} heeft de grootste kolk!` : 'Kolkridder is voorbij';
  $('w-why').textContent = top ? `${mText(top.r)} breed. Samen ${eaten} voorwerpen opgeslokt en ${right} vragen juist.` : '';
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🏠 ${p.big}${s.duel ? ` · 🌀 ${p.slok}` : ''} · ✔ ${p.right}</span><span class="pts">${mText(p.r)}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
