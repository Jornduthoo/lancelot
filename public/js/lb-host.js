// Leraar-baas op het bord: de eindbaas bouwen, de troonzaal met de klas, en de knoppen om terug te slaan.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, Avatar en BossDraw.
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
    loadGame('lb-load', { file: q.file, minutes: Number($('lb-minutes').value), tempo: $('lb-tempo').value, auto: $('lb-auto').checked }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
  remove: q => {
    if (!confirm(`"${q.title}" verwijderen?`)) return;
    socket.emit('delete', q.file, res => { $('load-error').textContent = (res && res.error) || ''; });
  },
});

// ---------- De eindbaas bouwen ----------

let boss = JSON.parse(JSON.stringify(BossDraw.DEFAULT));
const PARTS = [
  ['type', 'Ridder of ridderes', () => Avatar.TYPES.map(x => x.name)],
  ['helm', 'Helm', () => Avatar.HELMS.map(x => x.name)],
  ['accent', 'Versiering', () => Avatar.ACCENTS.map(x => x.name)],
  ['harnas', 'Soort harnas', () => Avatar.ARMORS.map(x => x.name)],
  ['kleur', 'Kleur harnas', () => Avatar.COLORS],
  ['vizier', 'Vizier', () => Avatar.VISORS],
  ['wapen', 'Wapen', () => Avatar.WEAPONS.map(x => x.name)],
  ['schild', 'Schild', () => Avatar.SHIELDS],
  ['patroon', 'Wapenschild', () => Avatar.PATTERNS.map(x => x.name)],
  ['rug', 'Op de rug', () => Avatar.BACKS.map(x => x.name)],
  ['arm', 'Arm', () => Avatar.ARMS.map(x => x.name)],
  ['huid', 'Huid', () => Avatar.SKINS],
  ['haar', 'Haar', () => Avatar.HAIRS.map(x => x.name)],
  ['haarkleur', 'Haarkleur', () => Avatar.HAIR_COLORS],
];

function renderBuilder() {
  $('b-naam').value = boss.naam === BossDraw.DEFAULT.naam ? '' : boss.naam;
  $('b-titel').value = boss.titel === BossDraw.DEFAULT.titel ? '' : boss.titel;
  $('b-extras').innerHTML = BossDraw.EXTRAS.map(x => `<button type="button" class="lb-chip ${boss.extra[x.key] ? 'on' : ''}" data-x="${x.key}"><span>${x.icon}</span>${x.name}</button>`).join('');
  $('b-ogen').innerHTML = BossDraw.EYES.map((e, i) => `<button type="button" class="lb-swatch ${boss.extra.ogenkleur === i ? 'on' : ''}" data-ogen="${i}" title="${e.name}" style="--c:${e.c}"></button>`).join('');
  $('b-aura').innerHTML = BossDraw.AURAS.map((a, i) => `<button type="button" class="lb-swatch ${boss.extra.aura === i ? 'on' : ''}" data-aura="${i}" title="${a.name}" style="--c:${a.c}"></button>`).join('');
  $('b-parts').innerHTML = PARTS.map(([key, label, list]) => {
    const items = list();
    const v = items[boss.av[key]] || '';
    const shown = /^#/.test(v) ? `<i class="lb-dot" style="background:${v}"></i>` : esc(v);
    return `<div class="lb-part"><span>${label}</span><button type="button" data-k="${key}" data-d="-1">◀</button><b>${shown}</b><button type="button" data-k="${key}" data-d="1">▶</button></div>`;
  }).join('');
}

let saveTimer = null;
function changed() {
  renderBuilder();
  $('b-saved').textContent = 'Bewaren…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    socket.emit('lb-boss-set', boss, res => {
      $('b-saved').textContent = res && res.ok ? '✔ Bewaard op deze pc' : 'Bewaren lukte niet';
    });
  }, 500);
}

$('b-extras').addEventListener('click', e => {
  const b = e.target.closest('[data-x]');
  if (!b) return;
  boss.extra[b.dataset.x] = boss.extra[b.dataset.x] ? 0 : 1;
  sfx.tick();
  changed();
});
$('b-ogen').addEventListener('click', e => {
  const b = e.target.closest('[data-ogen]');
  if (!b) return;
  boss.extra.ogenkleur = Number(b.dataset.ogen);
  boss.extra.ogen = 1;
  changed();
});
$('b-aura').addEventListener('click', e => {
  const b = e.target.closest('[data-aura]');
  if (!b) return;
  boss.extra.aura = Number(b.dataset.aura);
  changed();
});
$('b-parts').addEventListener('click', e => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  const n = Avatar.KEYS[b.dataset.k];
  boss.av[b.dataset.k] = (boss.av[b.dataset.k] + Number(b.dataset.d) + n) % n;
  sfx.tick();
  changed();
});
for (const id of ['b-naam', 'b-titel']) {
  $(id).addEventListener('input', () => {
    boss.naam = $('b-naam').value.trim() || BossDraw.DEFAULT.naam;
    boss.titel = $('b-titel').value.trim() || BossDraw.DEFAULT.titel;
    clearTimeout(saveTimer);
    $('b-saved').textContent = 'Bewaren…';
    saveTimer = setTimeout(() => socket.emit('lb-boss-set', boss, res => { $('b-saved').textContent = res && res.ok ? '✔ Bewaard op deze pc' : 'Bewaren lukte niet'; }), 700);
  });
}
$('b-random').addEventListener('click', () => {
  boss.av = Avatar.random();
  for (const x of BossDraw.EXTRAS) boss.extra[x.key] = Math.random() < .7 ? 1 : 0;
  boss.extra.ogenkleur = Math.floor(Math.random() * BossDraw.EYES.length);
  boss.extra.aura = Math.floor(Math.random() * BossDraw.AURAS.length);
  sfx.whoosh();
  changed();
});
socket.emit('lb-boss-get', null, saved => {
  if (saved && saved.av) boss = saved;
  renderBuilder();
});
renderBuilder();

// De voorvertoning: de baas in een kleine troonzaal.
const pc = $('b-canvas');
const pctx = pc.getContext('2d');
function preview() {
  requestAnimationFrame(preview);
  if (view !== 'setup') return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = pc.getBoundingClientRect();
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (!w || !h) return;
  if (pc.width !== w || pc.height !== h) { pc.width = w; pc.height = h; }
  const aura = BossDraw.AURAS[boss.extra.aura];
  const bg = pctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#05010c');
  bg.addColorStop(.7, '#1a0628');
  bg.addColorStop(1, '#060209');
  pctx.fillStyle = bg;
  pctx.fillRect(0, 0, w, h);
  const glow = pctx.createRadialGradient(w / 2, h * .45, 0, w / 2, h * .45, h * .6);
  glow.addColorStop(0, `${aura.glow}.3)`);
  glow.addColorStop(1, `${aura.glow}0)`);
  pctx.fillStyle = glow;
  pctx.fillRect(0, 0, w, h);
  pctx.strokeStyle = `${aura.glow}.25)`;
  for (let i = -8; i <= 8; i++) { pctx.beginPath(); pctx.moveTo(w / 2 + i * w * .03, h * .86); pctx.lineTo(w / 2 + i * w * .14, h); pctx.stroke(); }
  const kh = h * (boss.extra.troon ? .52 : .64);
  BossDraw.boss(pctx, boss, w / 2, h * .92, kh, { t: performance.now(), raise: (Math.sin(performance.now() / 1400) + 1) / 2 * .3 });
  pctx.textAlign = 'center';
  pctx.font = `900 ${Math.round(h * .055)}px Cinzel, serif`;
  pctx.fillStyle = '#fff';
  pctx.shadowColor = aura.c;
  pctx.shadowBlur = h * .03;
  pctx.fillText(boss.naam.toUpperCase(), w / 2, h * .08);
  pctx.shadowBlur = 0;
  pctx.font = `800 ${Math.round(h * .03)}px Orbitron, sans-serif`;
  pctx.lineWidth = h * .008;
  pctx.strokeStyle = '#05010c';
  pctx.strokeText(boss.titel.toUpperCase(), w / 2, h * .125);
  pctx.fillStyle = '#f0d8ff';
  pctx.fillText(boss.titel.toUpperCase(), w / 2, h * .125);
}
requestAnimationFrame(preview);

// ---------- Het spel ----------

const scene = BossDraw.create($('p-canvas'));

socket.on('lb-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Leraar-baas · ${s.title}` : 'Leraar-baas';
  if (s.boss && view === 'setup' && !saveTimer) { boss = s.boss; renderBuilder(); }
  if (!live) return show('setup');
  scene.setState(s, offset);
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (!prev || prev.phase !== 'play') sfx.go();
    show('play');
    renderSide();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    // Eerst het einde van het gevecht op het bord, dan de eindstand.
    if (prev && prev.phase === 'play' && view === 'play') {
      if (s.outcome === 'klas') sfx.fanfare();
      setTimeout(() => { if (state.phase === 'einde') { show('podium'); renderEnd(); } }, 3600);
    } else {
      show('podium');
      renderEnd();
    }
  }
});

socket.on('lb-tick', msg => {
  if (!state || state.phase !== 'play') return;
  Object.assign(state, msg);
  scene.setState(state, offset);
  renderSide();
});
socket.on('lb-hit', ev => { if (view === 'play') scene.hit(ev); });
socket.on('lb-attack', ev => { if (view === 'play') scene.attack(ev); });
socket.on('lb-event', ev => { if (view === 'play') scene.event(ev); });

let lastSide = '';
function renderSide() {
  const key = JSON.stringify([state.ranking, state.feed, state.cool, state.move && state.move.kind, state.auto]);
  if (key !== lastSide) {
    lastSide = key;
    $('p-top').innerHTML = (state.ranking || []).slice(0, 8).map(r => `<li><span data-av="${esc(r.name)}">${esc(r.name)}</span><b>${Math.round(r.dmg)}</b></li>`).join('');
    $('p-feed').innerHTML = (state.feed || []).slice(0, 6).map(f => `<li>${esc(f.text)}</li>`).join('');
    $('p-auto').checked = Boolean(state.auto);
  }
  const CD = { slag: 20000, vraag: 45000, schild: 40000 };
  for (const b of document.querySelectorAll('.lb-move')) {
    const k = b.dataset.move;
    const left = (state.cool && state.cool[k]) || 0;
    const busy = k !== 'slag' && state.move;
    b.disabled = left > 0 || Boolean(busy);
    b.querySelector('i').style.width = `${left > 0 ? (left / CD[k]) * 100 : 0}%`;
    b.classList.toggle('ready', !b.disabled);
  }
}

function move(kind) {
  socket.emit('lb-move', kind, res => {
    if (res && res.error) return;
    sfx.whoosh();
  });
}
for (const b of document.querySelectorAll('.lb-move')) b.addEventListener('click', () => move(b.dataset.move));
document.addEventListener('keydown', e => {
  if (view !== 'play' || e.target.tagName === 'INPUT') return;
  const k = { a: 'slag', v: 'vraag', s: 'schild' }[e.key.toLowerCase()];
  if (k) move(k);
});
$('p-auto').addEventListener('change', () => socket.emit('lb-auto', $('p-auto').checked));

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'ridder' : 'ridders';
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
    el.addEventListener('click', () => socket.emit('lb-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

function frame() {
  requestAnimationFrame(frame);
  if (view !== 'play') return;
  scene.frame();
}
requestAnimationFrame(frame);

$('start').addEventListener('click', () => socket.emit('lb-start'));
$('p-full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else $('p-stage').requestFullscreen().catch(() => {});
});
$('p-finish').addEventListener('click', () => {
  if (confirm('Het gevecht nu stoppen en de eindstand tonen?')) socket.emit('lb-finish');
});
$('restart').addEventListener('click', () => socket.emit('lb-restart'));
$('close').addEventListener('click', () => socket.emit('lb-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('lb-stop', null, res => {
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
  const name = (s.boss || BossDraw.DEFAULT).naam;
  const won = s.outcome === 'klas';
  $('w-title').textContent = won ? `🏆 De klas verslaat ${name}!` : `👑 ${name} wint deze keer`;
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const why = won ? 'De baas ligt neer.' : s.why === 'moed' ? 'De moed van de klas was op.' : `${s.why === 'tijd' ? 'De tijd was om' : 'Het gevecht werd gestopt'}, met de baas nog op ${Math.ceil(s.hp)}%.`;
  $('w-why').textContent = `${why} Samen ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span>${esc(p.name)}</span><span class="muted">⚔️ ${p.supers} · ✔ ${p.right}</span><span class="pts">${Math.round(p.dmg)}</span></li>`).join('');
  if (won) confetti(5000);
}
