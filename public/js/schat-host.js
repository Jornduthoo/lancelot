// Schattenjacht op het bord: live goudrace, wat er gekocht wordt, klok en podium.
// Gebruikt sfx, confetti en CROWN uit fx.js, quizMakerUrl uit quiz-links.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
const fmt = n => Math.round(n).toLocaleString('nl-BE');

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
    loadGame('sj-load', { file: q.file, minutes: Number($('sj-minutes').value) }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('sj-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Schattenjacht · ${s.title}` : 'Schattenjacht';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderRace();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderPodium();
  }
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'schatzoeker' : 'schatzoekers';
  $('start').disabled = n === 0;
  const box = $('names');
  const current = new Set(state.ranking.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.ranking) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('sj-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// De goudrace: balken die meegroeien, rijen die van plaats wisselen.
let lastFeed = '';
let lastTotal = 0;
const goldOf = new Map();
function renderRace() {
  const list = $('p-race');
  const top = state.ranking.slice(0, 12);
  const max = Math.max(1, ...top.map(r => r.gold));
  const before = new Map([...list.children].map(li => [li.dataset.id, li.getBoundingClientRect().top]));
  const rows = new Map([...list.children].map(li => [li.dataset.id, li]));
  list.innerHTML = '';
  top.forEach((r, i) => {
    let li = rows.get(r.id);
    if (!li) {
      li = document.createElement('li');
      li.dataset.id = r.id;
      li.innerHTML = '<div class="bar"></div><span class="pos"></span><span class="name"></span><span class="gold"><span class="coin"></span><b></b></span>';
    }
    li.querySelector('.pos').textContent = i + 1;
    li.querySelector('.name').innerHTML = `${esc(r.name)}<small>${r.streak > 1 ? `🔥 ${r.streak} op rij · ` : ''}⚔️${r.levels.zwaard + 1} 👑${r.levels.reeks + 1} 🛡️${r.levels.schild + 1}</small>`;
    li.querySelector('b').textContent = fmt(r.gold);
    li.querySelector('.bar').style.transform = `scaleX(${r.gold / max})`;
    list.appendChild(li);
  });
  if (state.ranking.length > 12) list.insertAdjacentHTML('beforeend', `<li class="more">+ ${state.ranking.length - 12} schatzoekers</li>`);
  // Van plaats wisselen laten zien.
  for (const li of list.children) {
    const old = before.get(li.dataset.id);
    if (old === undefined) continue;
    const shift = old - li.getBoundingClientRect().top;
    if (shift) li.animate([{ transform: `translateY(${shift}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,1,.3,1)' });
  }
  // Wie goud bijkreeg, stuurt munten van zijn rij naar de schatkist.
  for (const r of top) {
    const before = goldOf.get(r.id);
    if (before !== undefined && r.gold > before && view === 'play') {
      const li = [...list.children].find(el => el.dataset.id === r.id);
      if (li) Scene.burst(li.querySelector('.gold'), r.gold - before);
    }
  }
  goldOf.clear();
  for (const r of state.ranking) goldOf.set(r.id, r.gold);
  const total = state.ranking.reduce((a, r) => a + r.gold, 0);
  if (total > lastTotal && view === 'play' && prev && prev.phase === 'play') sfx.tick(false);
  lastTotal = total;
  $('p-total').textContent = fmt(total);
  Scene.total(total);
  const feedKey = JSON.stringify(state.feed);
  if (feedKey !== lastFeed) {
    lastFeed = feedKey;
    $('p-feed').innerHTML = state.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
  }
}

// ---------- De schatkamer: achtergrond, vliegende munten en de kist ----------

const Scene = (() => {
  const back = $('p-back');
  const front = $('p-front');
  const chestCv = $('p-chest');
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');
  const cctx = chestCv.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let art = null;
  let coins = [];
  let pops = [];
  let open = 0;
  let openUntil = 0;
  let bounce = 0;
  let fill = 0;
  let sum = 0;
  let last = performance.now();

  function size() {
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    for (const c of [back, front]) {
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    }
    if (!art || art.c.width !== w || art.c.height !== h) art = SjArt.vault(w, h);
    const cw = Math.round(chestCv.clientWidth * dpr);
    const ch = Math.round(chestCv.clientHeight * dpr);
    if (cw && (chestCv.width !== cw || chestCv.height !== ch)) { chestCv.width = cw; chestCv.height = ch; }
  }

  function chestPoint() {
    const r = chestCv.getBoundingClientRect();
    return [(r.left + r.width / 2) * dpr, (r.top + r.height * .55) * dpr];
  }

  // Munten van een element naar de kist; meer goud = meer munten.
  function burst(el, amount) {
    if (!el || coins.length > 160) return;
    const r = el.getBoundingClientRect();
    const x0 = (r.left + 14) * dpr;
    const y0 = (r.top + r.height / 2) * dpr;
    const n = Math.min(14, 3 + Math.round(Math.log10(amount + 1) * 3));
    for (let i = 0; i < n; i++) {
      coins.push({ x0: x0 + (Math.random() - .5) * 30 * dpr, y0: y0 + (Math.random() - .5) * 16 * dpr, t: -i * .05, dur: .9 + Math.random() * .35, lift: (80 + Math.random() * 140) * dpr, spin: Math.random() * 6, r: (7 + Math.random() * 4) * dpr });
    }
    pops.push({ x: x0, y: y0 - 10 * dpr, t: 0, text: `+${fmt(amount)}` });
  }

  function total(n) {
    sum = n;
    fill = Math.min(1, Math.log10(n + 1) / 4);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (view !== 'play') return;
    size();
    const t = now / 1000;
    // Achtergrond: de gebakken kamer, fakkels en glinsters.
    bctx.drawImage(art.c, 0, 0);
    art.torches.forEach(([x, y, pw], i) => SjArt.torch(bctx, x, y, pw * .9, t, i * 2.3));
    art.sparkles.forEach(([x, y], i) => SjArt.sparkle(bctx, x, y, 7 * dpr, Math.sin(t * 1.7 + i * 2.1) * 1.2 - .2));
    Glow.vignette(bctx, back.width, back.height, .6);
    // Vliegende munten.
    fctx.clearRect(0, 0, front.width, front.height);
    const [tx, ty] = chestPoint();
    coins = coins.filter(c => {
      c.t += dt;
      if (c.t < 0) return true;
      const k = Math.min(1, c.t / c.dur);
      const e = k * k * (3 - 2 * k);
      const x = c.x0 + (tx - c.x0) * e;
      const y = c.y0 + (ty - c.y0) * e - Math.sin(k * Math.PI) * c.lift;
      Glow.glow(fctx, x, y, c.r * 2.5, '#ffd166', .5);
      SjArt.coin(fctx, x, y, c.r * (1 - k * .3), c.spin + c.t * 14);
      if (k >= 1) {
        openUntil = now + 900;
        bounce = 1;
        return false;
      }
      return true;
    });
    pops = pops.filter(p => {
      p.t += dt;
      const a = 1 - p.t / 1.2;
      if (a <= 0) return false;
      fctx.globalAlpha = a;
      fctx.font = `800 ${Math.round(20 * dpr)}px Orbitron, system-ui, sans-serif`;
      fctx.textAlign = 'left';
      fctx.fillStyle = '#ffd166';
      fctx.fillText(p.text, p.x - 60 * dpr, p.y - p.t * 40 * dpr);
      fctx.globalAlpha = 1;
      return true;
    });
    // De kist: gaat open als er munten in vallen en blijft een tijdje open.
    open += ((now < openUntil ? 1 : 0) - open) * Math.min(1, dt * 8);
    bounce = Math.max(0, bounce - dt * 3);
    const cw = chestCv.width;
    const ch = chestCv.height;
    if (cw) {
      cctx.clearRect(0, 0, cw, ch);
      const s = Math.min(cw * .62, ch * 1.1);
      SjArt.chest(cctx, cw / 2, ch * .5 - Math.sin(bounce * Math.PI) * 8 * dpr + Math.sin(t * 1.5) * 3 * dpr, s, Math.max(open, sum > 0 ? .15 : 0), fill, t);
    }
  }
  requestAnimationFrame(frame);
  return { burst, total };
})();

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', wait <= 0);
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);

$('start').addEventListener('click', () => socket.emit('sj-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu beëindigen en de eindstand tonen?')) socket.emit('sj-finish');
});
$('restart').addEventListener('click', () => socket.emit('sj-restart'));
$('close').addEventListener('click', () => socket.emit('sj-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('sj-stop', null, res => {
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

function renderPodium() {
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (state.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(state.resultsFile));
  }
  const ranking = state.ranking;
  const [p1, p2, p3] = ranking;
  const pillar = (p, n) => p ? `<div class="pillar p${n}">
      ${n === 1 ? `<div class="crown">${CROWN}</div>` : ''}
      <div class="who">${esc(p.name)}</div><div class="pts">${fmt(p.gold)} goud</div>
      <div class="block">${n}</div></div>` : '';
  $('podium-blocks').innerHTML = pillar(p2, 2) + pillar(p1, 1) + pillar(p3, 3);
  $('final').innerHTML = ranking.slice(3)
    .map((p, i) => `<li><span class="pos">${i + 4}</span><span>${esc(p.name)}</span><span></span><span class="pts">${fmt(p.gold)}</span></li>`).join('');
  const rise = (n, delay) => setTimeout(() => document.querySelector(`.pillar.p${n}`)?.classList.add('up'), delay);
  sfx.drumroll(2.6);
  rise(3, 300);
  rise(2, 1300);
  rise(1, 2700);
  setTimeout(() => { sfx.fanfare(); confetti(5000); }, 2900);
}
