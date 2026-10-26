// De Verrader op het bord: de kristalkern, wie nog meedoet, de Ronde Tafel met stemmen en de onthulling.
// De rollen blijven geheim tot iemand verbannen wordt of het spel voorbij is.
// Gebruikt sfx en confetti uit fx.js, quizMakerUrl uit quiz-links.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

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
    loadGame('vr-load', {
      file: q.file, minutes: Number($('vr-minutes').value), traitors: $('vr-traitors').value, length: $('vr-length').value, talk: $('vr-talk').value,
    }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('vr-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', !['taken', 'tafel', 'rollen'].includes(s.phase));
  $('status').textContent = live ? `De Verrader · ${s.title}` : 'De Verrader';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (['rollen', 'taken', 'tafel'].includes(s.phase)) {
    $('p-title').textContent = s.title;
    show('play');
    renderPlay();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

function renderLobby() {
  const n = state.roster.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
  $('start').disabled = n < 3;
  $('start-error').textContent = n < 3 ? 'Je hebt minstens 3 spelers nodig.' : '';
  const box = $('names');
  const current = new Set(state.roster.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.roster) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('vr-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderPlay() {
  const s = state;
  const pct = s.target ? Math.min(100, (s.kern / s.target) * 100) : 0;
  $('p-kern').style.width = `${pct}%`;
  $('p-kern-num').textContent = `${Math.round(pct)}%`;
  const alive = s.roster.filter(p => p.alive).length;
  $('p-traitors').innerHTML = s.phase === 'rollen'
    ? '<p class="muted small">De rollen worden verdeeld...</p>'
    : `<div class="vr-mask">🎭</div><p>Er ${s.traitors === 1 ? 'is' : 'zijn'} <strong>${s.traitors}</strong> ${s.traitors === 1 ? 'verrader' : 'verraders'} in de burcht.</p><p class="muted small">${alive} van ${s.roster.length} spelers doen nog mee.</p>`;
  $('p-people').innerHTML = s.roster.map(p => {
    const status = p.fate === 'betoverd' ? '<small>👻 betoverd</small>' : p.fate === 'verbannen' ? `<small>${p.role === 'verrader' ? '🎭 verrader' : '⚖️ geen verrader'}</small>` : '';
    return `<div class="vr-person-card${p.alive ? '' : ' out'}${p.role === 'verrader' ? ' traitor' : ''}${p.fate === 'betoverd' ? ' ghost' : ''}" data-av="${esc(p.name)}">${esc(p.name)}${status}</div>`;
  }).join('');
  const feedKey = JSON.stringify(s.feed);
  if (feedKey !== lastFeed) {
    const fresh = s.feed[0] && lastFeed && !lastFeed.includes(JSON.stringify(s.feed[0].text));
    lastFeed = feedKey;
    $('p-feed').innerHTML = s.feed.map(f => `<li>${esc(f.text)}</li>`).join('');
    if (fresh && /^🌀/.test(s.feed[0].text)) { sfx.boom(); VrScene.spell(); }
  }
  $('p-horn').classList.toggle('hidden', s.phase !== 'taken');
  renderStage();
}

// De Ronde Tafel groot op het bord.
function renderStage() {
  const s = state;
  const m = s.meeting;
  const stage = $('p-stage');
  if (s.phase === 'rollen') {
    stage.classList.remove('hidden');
    stage.dataset.step = 'rollen';
    $('m-title').textContent = '🎭 De rollen worden verdeeld';
    $('m-sub').textContent = `Kijk op je eigen scherm, en hou het geheim. Er ${s.traitors === 1 ? 'is' : 'zijn'} ${s.traitors} ${s.traitors === 1 ? 'verrader' : 'verraders'}.`;
    $('m-votes').innerHTML = '';
    $('m-skip').classList.add('hidden');
    if (!prev || prev.phase !== 'rollen') sfx.gong();
    return;
  }
  if (s.phase !== 'tafel' || !m) {
    stage.classList.add('hidden');
    return;
  }
  stage.classList.remove('hidden');
  stage.dataset.step = m.step;
  const fresh = !prev || !prev.meeting || prev.meeting.step !== m.step;
  $('m-skip').classList.toggle('hidden', !['gevonden', 'praten'].includes(m.step));
  $('m-votes').innerHTML = '';
  if (m.step === 'gevonden') {
    $('m-title').textContent = m.reason === 'betovering' ? `🌀 ${m.victim} is betoverd!` : `📯 ${m.caller} roept de Ronde Tafel samen!`;
    $('m-sub').textContent = 'Iedereen naar de Ronde Tafel.';
    if (fresh) sfx.gong();
  } else if (m.step === 'praten') {
    $('m-title').textContent = '🪑 De Ronde Tafel';
    $('m-sub').textContent = 'Praat met elkaar: wie gedraagt zich verdacht? Wie heeft een tip gekregen?';
  } else if (m.step === 'stemmen') {
    $('m-title').textContent = '⚖️ Stemmen!';
    $('m-sub').textContent = `${s.votesIn} van ${s.voters} stemmen binnen. Je kan wisselen tot de tijd om is.`;
    if (fresh) sfx.tick(false);
  } else if (m.step === 'uitslag') {
    const r = m.result;
    $('m-title').textContent = r.banished ? `${r.banished} is verbannen.` : 'Niemand is verbannen.';
    $('m-sub').textContent = r.banished
      ? (r.wasTraitor ? 'Het was een verrader! 🎭' : 'Het was geen verrader... 😱')
      : (r.tie ? 'De stemmen staken gelijk.' : 'De meesten sloegen over.');
    if (r.skip) $('m-sub').textContent += ` · ${r.skip}× overgeslagen`;
    const rows = Object.entries(r.votes).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, r.skip, ...rows.map(x => x[1]));
    $('m-votes').innerHTML = [...rows, ...(r.skip ? [['Overslaan', r.skip]] : [])]
      .map(([name, n]) => `<div class="vr-vote"><span>${esc(name)}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join('');
    if (fresh) {
      if (r.banished && r.wasTraitor) { sfx.fanfare(); confetti(2500); } else sfx.bad();
    }
  }
}

// De burchtzaal achter het bord, de kristalkern die heelt en de Ronde Tafel tijdens een vergadering.
const VrScene = (() => {
  const back = $('p-back');
  const coreCv = $('p-core');
  const tableCv = $('m-table');
  const bctx = back.getContext('2d');
  const cctx = coreCv.getContext('2d');
  const tctx = tableCv.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let art = null;
  let shown = 0;
  let hit = 0;
  let spell = 0;
  let bolts = [];
  let last = performance.now();
  const fit = c => {
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (w && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
    return w > 0;
  };
  // Wie zit waar aan tafel, en wat staat er op zijn schild.
  function seats() {
    const m = state.meeting;
    const r = m && m.step === 'uitslag' ? m.result : null;
    return state.roster.map(p => {
      const votes = r && r.votes ? r.votes[p.name] || 0 : 0;
      const hot = (r && r.banished === p.name) || (m && m.step === 'gevonden' && m.victim === p.name);
      const mark = r ? (votes ? String(votes) : '') : p.fate === 'betoverd' ? '👻' : p.fate === 'verbannen' ? '⚖️' : '';
      return { name: p.name, out: !p.alive && !hot, hot, mark, color: p.role === 'verrader' ? '#ff4d6d' : '#4cc9ff' };
    });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (view !== 'play' || !state) return;
    const t = now / 1000;
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (back.width !== w || back.height !== h) { back.width = w; back.height = h; }
    if (!art || art.c.width !== w || art.c.height !== h) art = VrArt.hall(w, h);
    bctx.drawImage(art.c, 0, 0);
    art.torches.forEach(([x, y, u], i) => VrArt.torch(bctx, x, y, u, t, i * 2.7));
    // Een betovering: paarse bliksem en een donkere flits.
    if (spell > 0) {
      bctx.fillStyle = `rgba(90, 20, 140, ${spell * .3})`;
      bctx.fillRect(0, 0, w, h);
      if (Math.random() < .3) bolts.push({ x: Math.random() * w, life: .25 });
      spell = Math.max(0, spell - dt * .8);
    }
    bolts = bolts.filter(b => {
      b.life -= dt;
      if (b.life <= 0) return false;
      Glow.lightning(bctx, b.x, 0, b.x + (Math.random() - .5) * w * .2, h * .7, '#d9a8ff', 3 * dpr);
      return true;
    });
    Glow.vignette(bctx, w, h, .55);
    // De kern.
    const pct = state.target ? Math.min(1, state.kern / state.target) : 0;
    if (pct > shown + .001) hit = 1;
    shown += (pct - shown) * Math.min(1, dt * 3);
    hit = Math.max(0, hit - dt * 2);
    if (fit(coreCv)) {
      cctx.clearRect(0, 0, coreCv.width, coreCv.height);
      VrArt.core(cctx, coreCv.width / 2, coreCv.height * .42, Math.min(coreCv.width * .22, coreCv.height * .36), shown, t, hit);
    }
    // De Ronde Tafel.
    if (!$('p-stage').classList.contains('hidden') && state.phase === 'tafel' && fit(tableCv)) {
      const W = tableCv.width, H = tableCv.height;
      tctx.clearRect(0, 0, W, H);
      const rx = Math.min(W * .3, H * .42), ry = rx * .38;
      VrArt.table(tctx, W / 2, H * .66, rx, ry, seats(), t);
    } else if (tableCv.width) tctx.clearRect(0, 0, tableCv.width, tableCv.height);
  }
  requestAnimationFrame(frame);
  return { spell: () => { spell = 1; } };
})();

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 60000);
  const m = state.meeting;
  $('m-clock').textContent = m && ['praten', 'stemmen'].includes(m.step) ? Math.ceil(Math.max(0, m.until - now) / 1000) : '';
}, 250);

$('start').addEventListener('click', () => socket.emit('vr-start', null, res => { $('start-error').textContent = (res && res.error) || ''; }));
$('p-horn').addEventListener('click', () => socket.emit('vr-horn'));
$('m-skip').addEventListener('click', () => socket.emit('vr-skip'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen? De verraders winnen dan.')) socket.emit('vr-finish');
});
$('restart').addEventListener('click', () => socket.emit('vr-restart'));
$('close').addEventListener('click', () => socket.emit('vr-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('vr-stop', null, res => {
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

// Het einde: wie won, en alle rollen open.
function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  $('w-mark').textContent = s.winner === 'ridder' ? '🛡️' : '🎭';
  $('w-title').textContent = s.winner === 'ridder' ? 'De ridders winnen!' : 'De verraders winnen!';
  $('w-why').textContent = s.why;
  const order = [...s.roster].sort((a, b) => (a.role === 'verrader' ? -1 : 0) - (b.role === 'verrader' ? -1 : 0) || b.right - a.right);
  $('final').innerHTML = order.map(p => `<li class="${p.role}"><span class="pos">${p.role === 'verrader' ? '🎭' : '🛡️'}</span><span>${esc(p.name)}</span>
    <span class="muted">${p.fate === 'betoverd' ? '👻 betoverd' : p.fate === 'verbannen' ? '⚖️ verbannen' : 'overleefd'}${p.role === 'verrader' ? ` · 🌀 ${p.spells}` : ''}</span><span class="pts">${p.right} juist</span></li>`).join('');
  sfx.drumroll(1.6);
  setTimeout(() => { sfx.fanfare(); confetti(4000); }, 1700);
}
