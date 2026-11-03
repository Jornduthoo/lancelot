// Neon-Camelot op het bord: de hele stad schuin van boven, met alle ridders, hun voertuigen en namen.
// Rechts de stand (kristallen), het stadslicht van de klas en wat er gebeurt. Een brand of kristalregen zie je meteen.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, NcWorld en NcDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const W = NcWorld;
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
let scene = new NcDraw.Scene();
const res = new NcDraw.Res(.7);

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
    loadGame('nc-load', { file: q.file, minutes: Number($('nc-minutes').value), tempo: $('nc-tempo').value }, r => { $('load-error').textContent = r.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('nc-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const on = s.phase !== 'idle';
  if (on) NcDraw.laad();
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Neon-Camelot · ${s.title}` : 'Neon-Camelot';
  if (prev && prev.run !== s.run) { scene = new NcDraw.Scene(); scene.onEvent = onEvent; }
  if (s.wereld) { scene.wereld = s.wereld; renderLicht(); }
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

socket.on('nc-tick', msg => {
  if (!state || state.phase !== 'play') return;
  scene.apply(msg);
  if (msg.w) renderLicht();
  if (msg.ranking) {
    state.ranking = msg.ranking;
    if (msg.feed) state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

let flits = null;
function onEvent(e) {
  if (e[0] === 'm') sfx.marker();
  else if (e[0] === 'l') { sfx.fanfare(); flits = { t: performance.now() / 1000, kleur: '#ffe17a' }; }
  else if (e[0] === 'v') sfx.power();
  else if (e[0] === 'g') sfx.good();
}
scene.onEvent = onEvent;

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
    el.addEventListener('click', () => socket.emit('nc-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

function renderLicht() {
  const w = scene.wereld;
  if (!w) return;
  const vorige = w.licht ? W.LICHT[w.licht - 1] : 0;
  const k = w.volgende ? (w.totaal - vorige) / (w.volgende - vorige) : 1;
  $('p-licht').style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
  $('p-licht-tekst').textContent = w.volgende ? `✨ Stadslicht ${w.licht} van ${w.lichtMax} · samen ${w.totaal} van ${w.volgende} 💎` : `✨ De hele stad licht op! ${w.totaal} 💎`;
}

let lastFeed = '';
let lastTop = '';
function renderSide(ranking, feed) {
  const top = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">${W.VOERTUIGEN[r.open - 1].icoon} ⭐ ${r.missies}</small></span><b>${r.kr}</b></li>`).join('');
  if (top !== lastTop) { lastTop = top; $('p-top').innerHTML = top; }
  const missies = (ranking || []).reduce((a, r) => a + r.missies, 0);
  $('p-alive').textContent = `⭐ ${missies} missies gedaan`;
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
  res.frame(dt);
  const { w, h, dpr } = AK.fit(canvas, res.dpr(1.25));
  const sec = t / 1000;
  // De hele stad in beeld; torens steken boven de bovenrand uit.
  const S = Math.min(w / (W.L + 4), h / ((W.L + 4) * W.TILT + 22));
  const cam = { x: W.L / 2, y: W.L / 2 - 11 / W.TILT, S, w, h, bake: true };
  NcDraw.render(ctx, scene, cam, { roster, t: sec, fs: Math.max(11, 12 * dpr / 1.25) });
  if (flits) {
    const k = (sec - flits.t) / 1.2;
    if (k >= 1) flits = null;
    else { ctx.fillStyle = `rgba(255,225,122,${.25 * (1 - k)})`; ctx.fillRect(0, 0, w, h); }
  }
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

$('start').addEventListener('click', () => socket.emit('nc-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('nc-finish');
});
$('restart').addEventListener('click', () => socket.emit('nc-restart'));
$('close').addEventListener('click', () => socket.emit('nc-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('nc-stop', null, r => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Het spel is gestopt.');
    if (r && r.file) {
      note.append(' De resultaten zijn bewaard. ');
      note.append(downloadLink(r.file));
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
  const missies = s.ranking.reduce((a, r) => a + r.missies, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} heeft de meeste kristallen!` : 'Neon-Camelot is voorbij';
  $('w-why').textContent = top ? `${top.kr} 💎. Samen ${missies} missies en ${right} vragen juist. Stadslicht ${(s.wereld || {}).licht || 0} van ${W.LICHT.length}.` : '';
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">${W.VOERTUIGEN[p.open - 1].icoon} · ⭐ ${p.missies} · 🧙 ${p.gnomen} · ✔ ${p.right}</span><span class="pts">${p.kr} 💎</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
