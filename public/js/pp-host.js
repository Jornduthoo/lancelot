// Plasmapoort op het bord: het burchtstadion speelt om beurt de trappen van de leerlingen na (schoten en reddingen).
// Bovenaan de ladder met de 8 robotridders en welke leerling tegen welke robot speelt.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, PpWorld en PpDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const W = PpWorld;
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
let live = new Map(); // n -> [robot, tier, vraag]

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
    loadGame('pp-load', { file: q.file, minutes: Number($('pp-minutes').value), tempo: $('pp-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('pp-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const liveGame = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !liveGame);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = liveGame ? `Plasmapoort · ${s.title}` : 'Plasmapoort';
  if (prev && prev.run !== s.run) { queue.length = 0; cur = null; live = new Map(); }
  if (!liveGame) return show('setup');
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

socket.on('pp-tick', msg => {
  if (!state || state.phase !== 'play') return;
  if (msg.live) live = new Map(msg.live.map(([n, robot, tier, q]) => [n, [robot, tier, q]]));
  if (msg.ranking) {
    state.ranking = msg.ranking;
    state.feed = msg.feed;
    renderSide(state.ranking, state.feed);
  }
});

// Elke trap van een leerling komt hier binnen; het bord speelt ze om beurt na.
const queue = [];
let cur = null;
let lastShown = -1;
socket.on('pp-ev', ev => {
  if (!state || state.phase !== 'play') return;
  ev.at = performance.now();
  queue.push(ev);
  if (queue.length > 40) queue.splice(0, queue.length - 40);
  if (ev.end && ev.end.won && (ev.champ || ev.robot >= 4)) ev.big = true;
});
function pick() {
  const t = performance.now();
  for (let i = queue.length - 1; i >= 0; i--) if (t - queue[i].at > 7000 && !queue[i].big) queue.splice(i, 1);
  if (!queue.length) return null;
  // Eerst een grote overwinning, dan iemand die we niet net toonden, anders de oudste.
  let i = queue.findIndex(e => e.big);
  if (i < 0) i = queue.findIndex(e => e.n !== lastShown);
  if (i < 0) i = 0;
  const ev = queue.splice(i, 1)[0];
  lastShown = ev.n;
  return ev;
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
    el.addEventListener('click', () => socket.emit('pp-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">🤖 ${r.robot + 1}/8${r.tier ? ' ' + '⭐'.repeat(Math.min(3, r.tier)) : ''}</small></span><b>${r.score}</b></li>`).join('');
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
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
const TXT = {
  shot: { goal: 'GOAL', save: 'gered door', paal: 'op de paal tegen', naast: 'naast tegen', over: 'over tegen' },
  keep: { goal: 'krijgt een goal van', save: 'redt tegen', paal: 'ziet de paal raken van', naast: 'ziet het schot naast gaan van', over: 'ziet het schot over gaan van' },
};
let ripple = null;
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const { w, h, dpr } = AK.fit(canvas, 1.25);
  const strip = Math.round(h * .13);
  const T = t / 1000;
  // Volgende trap om na te spelen
  if (!cur || (cur.landed && T - cur.landT > (cur.ev.end ? 2.4 : 1.3))) {
    const ev = pick();
    cur = ev ? { ...PpDraw.kickAnim(ev, T + .2, { run: ev.kind === 'keep' ? .9 : .55, fly: ev.kind === 'keep' ? .5 : (ev.gold ? .42 : .55) }), landed: false } : null;
    ripple = null;
  }
  const A = cur;
  const H = h - strip;
  const s = { t: T };
  let lo = PpDraw.layout(w, H);
  if (A) {
    const ev = A.ev;
    const who = roster.get(ev.n) || { name: 'iemand', color: '#4cc9ff' };
    const R = W.ROBOTS[ev.robot] || W.ROBOTS[0];
    const kickT = A.t0 + A.run;
    const run = Math.min(1, Math.max(0, (T - A.t0) / A.run));
    const kick = T > kickT - .08 ? Math.max(0, 1 - Math.abs(T - kickT) / .25) : 0;
    let dive;
    if (ev.kind === 'shot') dive = { x: ev.kx, y: ev.ky, k: (T - kickT - .05) / .32 };
    else {
      const hit = ev.result === 'save';
      const d = ev.dir || 0;
      dive = hit ? { x: ev.x, y: ev.y, k: (T - kickT + .1) / .3 } : { x: d * .78, y: d ? .42 : .65, k: (T - kickT + (ev.early ? .5 : .05)) / .3 };
    }
    if (ev.kind === 'shot') {
      s.shooter = { mech: false, color: who.color, run, kick };
      s.keeper = { mech: true, color: R.color, eye: R.eye, dive, ready: true };
    } else {
      s.shooter = { mech: true, color: R.color, eye: R.eye, run, kick };
      s.keeper = { mech: false, color: who.color, dive, ready: true, ring: true };
    }
    const b = PpDraw.ballAt(lo, A, T);
    b.gold = ev.gold;
    if (b.phase === 'fly') { A.trail.push({ x: b.x, y: b.y, r: b.r }); if (A.trail.length > 10) A.trail.shift(); } else if (A.trail.length) A.trail.shift();
    b.trail = A.trail;
    s.ball = b;
    if (b.phase === 'fly' && !A.kicked) { A.kicked = true; sfx.swoosh(); }
    if ((b.phase === 'net' || b.phase === 'out') && !A.landed) {
      A.landed = true;
      A.landT = T;
      const good = ev.kind === 'shot' ? ev.result === 'goal' : ev.result !== 'goal';
      if (ev.result === 'goal') ripple = { x: ev.x, y: ev.y, t: T, gold: ev.gold };
      if (good) sfx.good(); else sfx.hit();
      let text = ev.kind === 'shot'
        ? (ev.result === 'goal' ? `⚡ GOAL van ${who.name} tegen ${R.name}!` : `${who.name}: ${TXT.shot[ev.result]} ${R.name}`)
        : `🧤 ${who.name} ${TXT.keep[ev.result]} ${R.name}`;
      if (ev.end) {
        text = ev.end.won ? (ev.champ ? `🏆 ${who.name} is KAMPIOEN!` : `🏆 ${who.name} verslaat ${R.name} (${ev.end.ga}-${ev.end.gb})`) : `${R.name} wint van ${who.name} (${ev.end.gb}-${ev.end.ga})`;
        if (ev.end.won) { sfx.fanfare(); if (ev.champ) confetti(3000); }
      }
      banner(text);
    }
    if (ripple) s.ripple = { x: ripple.x, y: ripple.y, q: T - ripple.t, gold: ripple.gold };
    $('p-alive').textContent = `${who.name} tegen ${R.name}`;
  } else {
    // Niemand trapt nu: de keeper wacht.
    const top = state.ranking && state.ranking[0];
    const R = W.ROBOTS[top ? top.robot : 0];
    s.keeper = { mech: true, color: R.color, eye: R.eye, dive: { x: 0, y: 0, k: 0 }, ready: true };
    s.ball = PpDraw.ballAt(lo, { ev: { x: 0, y: 0 }, t0: 1e12, run: 1, fly: 1 }, T);
    $('p-alive').textContent = '';
  }
  ctx.save();
  ctx.translate(0, strip);
  PpDraw.render(ctx, w, H, s);
  if (A) drawMatch(A.ev, w, dpr);
  ctx.restore();
  drawLadder(w, strip, T);
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

// Het scorebordje van de wedstrijd die we naspelen.
function drawMatch(ev, w, dpr) {
  const k = Math.max(1, dpr);
  const who = roster.get(ev.n) || { name: '?', color: '#4cc9ff' };
  const R = W.ROBOTS[ev.robot] || W.ROBOTS[0];
  const a = ev.a || [], b = ev.b || [];
  const n = Math.max(W.KICKS, a.length, b.length);
  const gap = 26 * k, wName = 150 * k, width = wName + n * gap + 16 * k;
  const x0 = w / 2 - width / 2, y0 = 10 * k;
  ctx.fillStyle = 'rgba(5,6,15,.75)';
  ctx.fillRect(x0, y0, width, 56 * k);
  ctx.font = `800 ${14 * k}px Orbitron, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  [[who.name, who.color, a], [R.name, R.color, b]].forEach(([name, col, list], i) => {
    const y = y0 + 17 * k + i * 23 * k;
    ctx.fillStyle = col;
    ctx.fillText(name.length > 13 ? name.slice(0, 12) + '…' : name, x0 + 10 * k, y);
    for (let j = 0; j < n; j++) {
      const cx = x0 + wName + j * gap + 8 * k;
      ctx.beginPath(); ctx.arc(cx, y, 6 * k, 0, Math.PI * 2);
      if (list[j] === true) { ctx.fillStyle = '#4ade80'; ctx.fill(); } else if (list[j] === false) { ctx.fillStyle = '#ff4d6d'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke(); }
    }
  });
}

// De ladder: de 8 robotridders, met onder elke robot de leerlingen die nu tegen hem spelen.
function drawLadder(w, sh, T) {
  ctx.fillStyle = '#0a0d22';
  ctx.fillRect(0, 0, w, sh);
  const n = W.ROBOTS.length;
  const cw = w / n;
  const count = new Map();
  for (const [pn, [robot, tier]] of live) {
    const who = roster.get(pn);
    if (!who) continue;
    const list = count.get(robot) || [];
    list.push({ color: who.color, tier });
    count.set(robot, list);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const R = W.ROBOTS[i];
    const cx = cw * (i + .5);
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)';
    ctx.fillRect(cw * i, 0, cw, sh);
    PpDraw.portrait(ctx, cx - cw * .28, sh * .5, sh * .34, { color: R.color, eye: R.eye, t: T });
    ctx.font = `800 ${Math.round(Math.min(sh * .17, cw * .1))}px Orbitron, sans-serif`;
    ctx.fillStyle = R.color;
    ctx.fillText(R.name, cx + cw * .1, sh * .28);
    const list = count.get(i) || [];
    const r = Math.min(sh * .09, cw * .045);
    const per = Math.max(1, Math.floor((cw * .55) / (r * 2.4)));
    list.slice(0, per * 2).forEach((p, j) => {
      const x = cx - cw * .17 + (j % per) * r * 2.4 + r, y = sh * (.58 + Math.floor(j / per) * .24);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.tier ? '#ffc94a' : '#0a0d22'; ctx.lineWidth = 2; ctx.stroke();
    });
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('pp-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('pp-finish');
});
$('restart').addEventListener('click', () => socket.emit('pp-restart'));
$('close').addEventListener('click', () => socket.emit('pp-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('pp-stop', null, res => {
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
  const goals = s.ranking.reduce((a, r) => a + r.goals, 0);
  const saves = s.ranking.reduce((a, r) => a + r.saves, 0);
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Plasmapoort!` : 'Plasmapoort is voorbij';
  $('w-why').textContent = `Samen ${goals} goals, ${saves} reddingen en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🤖 ${p.wins} · ⚽ ${p.goals} · 🧤 ${p.saves} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
