// Ontsnap uit de kerker op het bord: de kerkergang met de deur van nu, de klas vooraan en de route naar buiten.
// Elk juist antwoord vliegt als sleutel, rune of laserstraal naar de deur. Gebruikt sfx, confetti en loadGame uit fx.js,
// quizMakerUrl uit quiz-links.js, AK, KkWorld en KkDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const W = KkWorld;
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
let prevDoor = null;
let cur = null; // de deur van nu
const jumps = new Map(); // n -> tijdstip van het sprongetje

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
    loadGame('kk-load', { file: q.file, minutes: Number($('kk-minutes').value), tempo: $('kk-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('kk-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Ontsnap uit de kerker · ${s.title}` : 'Ontsnap uit de kerker';
  if (!prev || prev.run !== s.run) { prevDoor = null; cur = null; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    setDoor(s.door);
    renderSide(s.ranking, s.feed);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    if (s.door) setDoor(s.door);
    show('podium');
    renderEnd();
  }
});

// Een nieuwe deur: de vorige onthouden we voor de animatie van het openen.
function setDoor(door) {
  if (!door) return;
  if (cur && cur.i !== door.i) prevDoor = cur;
  cur = door;
  renderRoute();
}

socket.on('kk-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const before = cur;
  if (msg.door) setDoor(msg.door);
  const now = performance.now();
  for (const e of msg.ev || []) {
    if (e[0] === 'open') {
      sfx.boom();
      setTimeout(() => sfx.fanfare(), 300);
      const info = W.DOORS[(before && before.i === e[1] ? before : prevDoor || {}).type] || {};
      banner(`🚪 ${info.name || 'Deur'} open!`);
      continue;
    }
    if (typeof e[1] === 'number') jumps.set(e[1], now);
    scene.event(e, view3(), now);
    if (e[0] === 'key' || e[0] === 'rune' || e[0] === 'lamp') { if (Math.random() < .6) sfx.marker(); }
    else if (e[0] === 'hit') sfx.hit();
    else if (e[0] === 'code') { sfx.power(); banner('ᛟ Runenslot gekraakt!'); }
    else if (e[0] === 'codefout') sfx.bad();
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
    el.addEventListener('click', () => socket.emit('kk-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// De route naar buiten: welke deuren zijn open, welke is nu aan de beurt.
let routeKey = '';
function renderRoute() {
  const door = cur;
  const plan = state.plan || [];
  const done = state.result && state.result.outcome === 'ontsnapt' ? plan.length : door ? door.i : 0;
  const key = `${plan.join()}|${done}`;
  if (key !== routeKey) {
    routeKey = key;
    $('p-route').innerHTML = plan.map((type, i) => {
      const info = W.DOORS[type];
      const cls = i < done ? 'open' : i === done ? 'nu' : '';
      return `<li class="${cls}" style="--c:${info.color}"><b>${i < done ? '✓' : i + 1}</b><span>${info.short}</span></li>`;
    }).join('') + `<li class="${done >= plan.length ? 'open' : ''} uit"><b>☀️</b><span>Buiten</span></li>`;
    $('p-door').textContent = door ? `Deur ${Math.min(plan.length, door.i + 1)} van ${plan.length}` : '';
    if (door) {
      const info = W.DOORS[door.type];
      $('p-how').innerHTML = `<strong style="color:${info.color}">${AK.esc(info.name)}</strong><span>${AK.esc(info.how)}</span>`;
    }
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 12).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)}</span><b>${r.help}</b></li>`).join('');
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
const scene = new KkDraw.Scene({ board: true });
let last = performance.now();
function view3() {
  const knights = [...roster.values()].map(r => ({ ...r, jumpAt: jumps.get(r.n) }));
  return { door: cur, prev: prevDoor, serverNow: Date.now() + offset, roster, knights };
}
function frame(pt) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (pt - last) / 1000);
  last = pt;
  if (view !== 'play' || !state || !cur) return;
  const { w, h } = AK.fit(canvas, 1.25);
  scene.resize(w, h);
  scene.fx.update(dt);
  scene.draw(ctx, pt, view3());
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = h * .012;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(String(Math.ceil(wait / 1000)), w / 2, h / 2 + h * .05);
    ctx.fillStyle = '#ffc94a';
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
}, 200);

$('start').addEventListener('click', () => socket.emit('kk-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de uitslag tonen?')) socket.emit('kk-finish');
});
$('restart').addEventListener('click', () => socket.emit('kk-restart'));
$('close').addEventListener('click', () => socket.emit('kk-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('kk-stop', null, res => {
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
  const r = s.result || {};
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  const right = s.ranking.reduce((a, p) => a + p.right, 0);
  const free = r.outcome === 'ontsnapt';
  $('w-stars').innerHTML = free ? [1, 2, 3].map(i => `<i class="${i <= r.stars ? 'on' : ''}" style="animation-delay:${i * 250}ms">★</i>`).join('') : '';
  $('w-title').textContent = free ? '☀️ Ontsnapt! De hele klas is buiten!' : `🔒 ${r.opened} van de ${r.doors} deuren open`;
  $('w-why').textContent = free
    ? `Met nog ${AK.clock(r.left)} op de klok, en samen ${right} vragen juist.`
    : `De Kerkermeester hield jullie nog vast. Samen ${right} vragen juist. Volgende keer verder?`;
  $('final').innerHTML = s.ranking.map((p, i) => {
    const bits = [p.keys && `🗝️ ${p.keys}`, p.runes && `ᛟ ${p.runes}`, p.codes && `🔓 ${p.codes}`, p.lamps && `🔴 ${p.lamps}`, p.lier && `⛓️ ${p.lier}`, p.hits && `⚔️ ${p.hits}`].filter(Boolean).join(' · ');
    return `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">${bits || '-'} · ✔ ${p.right}</span><span class="pts">${p.help}</span></li>`;
  }).join('');
  if (free) { sfx.fanfare(); confetti(6000); }
}
