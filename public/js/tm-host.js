// Tuimelridder op het bord: de camera volgt de koploper door het stuntparcours, de anderen rijden als schimmen mee.
// Wie valt, tuimelt ook op het bord als ledenpop van zijn rijmachine. Bovenaan een strook met de parcoursen en waar iedereen is.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, TmWorld en TmDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
const others = new AK.Interp(120);
const stages = new Map(); // n -> etappe
let leaderN = -1;
let lastLeadBanner = 0;
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
    loadGame('tm-load', { file: q.file, minutes: Number($('tm-minutes').value), tempo: $('tm-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

socket.on('tm-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Tuimelridder · ${s.title}` : 'Tuimelridder';
  if (prev && prev.run !== s.run) { others.clear(); stages.clear(); dolls.clear(); leaderN = -1; cam = null; lastLead = 8; camY = null; wips = {}; }
  if (!live) return show('setup');
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

socket.on('tm-tick', msg => {
  if (!state || state.phase !== 'play') return;
  const t = performance.now();
  // De koploper wisselt alleen als iemand duidelijk voor ligt (3 m), en wie net gevallen is telt niet mee.
  // Zo springt de camera niet heen en weer tussen ridders die even ver zijn.
  let best = null, cur = null;
  for (const [n, x, y, a, f, st, vi] of msg.r) {
    const before = others.get(n);
    others.push(n, [x, y, a, f, st, vi], t);
    // Net gevallen: een ledenpop op het bord.
    if (before && (f & 8) && !(before[3] & 8) && roster.get(n)) {
      const p = { x: before[0], y: before[1], a: before[2], veh: TmWorld.vehicleOf(before[5]) };
      dolls.set(n, { rd: TmWorld.ragdoll(TmWorld.riderPose(p), (x - before[0]) * 6, -6, 4), color: roster.get(n).color, wreck: { x: p.x, y: p.y, a: p.a, vi: before[5], vx: (x - before[0]) * 3, vy: -4, va: 5 } });
    }
    stages.set(n, st);
    if (f & 8) continue;
    if (n === leaderN) cur = { n, x, st };
    if (!best || x > best.x) best = { n, x, st };
  }
  others.prune(t, 1500);
  if (best && (!cur || best.x > cur.x + 3)) {
    if (leaderN >= 0 && best.n !== leaderN && roster.size > 1 && best.st >= 1 && t - lastLeadBanner > 8000) {
      const who = roster.get(best.n);
      if (who) { banner(`🛡️ ${who.name} rijdt nu vooraan!`); sfx.whoosh(); lastLeadBanner = t; }
    }
    leaderN = best.n;
    cur = best;
  }
  if (cur) {
    const who = roster.get(cur.n);
    $('p-alive').textContent = who ? `👑 ${who.name} · ${TmWorld.THEMES[TmWorld.courseOf(cur.st)].name}` : '';
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
    el.addEventListener('click', () => socket.emit('tm-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">🏁 ${r.stage} · ⭐ ${r.stars}</small></span><b>${r.score}</b></li>`).join('');
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
const dolls = new Map(); // n -> { rd, color, wreck }
let cam = null;
let lastLead = 8;
let camY = null;
let wips = {};
const rots = new Map();
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if (view !== 'play' || !state) return;
  const { w, h } = AK.fit(canvas, 1.25);
  const strip = Math.round(h * .09);
  const S = (h - strip) / 14;
  const time = Math.max(0, (Date.now() + offset - state.startedAt) / 1000);
  const riders = [];
  let lead = null;
  for (const n of others.ids()) {
    const v = others.get(n);
    const who = roster.get(n);
    if (!v || !who || (v[3] & 8)) continue;
    const rot = rots.get(n) || { x: v[0], r: 0 };
    rot.r += (v[0] - rot.x) / .5;
    rot.x = v[0];
    rots.set(n, rot);
    const o = { x: v[0], y: v[1], a: v[2], vi: v[5], gas: v[3] & 1, turbo: v[3] & 4, color: who.color, name: who.name, alpha: .55, n, rot: rot.r };
    if (n === leaderN) lead = o;
    else riders.push(o);
  }
  if (lead) { lastLead = lead.x + 4; riders.push({ ...lead, alpha: 1, name: `👑 ${lead.name}` }); }
  if (lead) for (const st of TmWorld.near(lead.x)) for (const wp of st.wips) { const key = wp.id + ':' + st.k; wips[key] = TmWorld.wipUpdate(wp, wips[key], lead.x, dt); }
  // Ledenpoppen van wie net viel (alleen dicht bij de camera, en hooguit 2 seconden).
  const shown = [], wrecks = [];
  for (const [n, d] of dolls) {
    if (d.rd.t > 2 || (cam !== null && Math.abs(d.rd.pts[2].x - cam) > 30)) { dolls.delete(n); continue; }
    TmWorld.ragdollStep(d.rd, dt);
    const wr = d.wreck; wr.vy += 22 * dt; wr.x += wr.vx * dt; wr.y += wr.vy * dt; wr.a += wr.va * dt;
    shown.push({ rd: d.rd, color: d.color, alpha: Math.min(1, (2 - d.rd.t) * 2) });
    wrecks.push(wr);
  }
  const wantY = Math.min(lead ? lead.y - 1.5 : TmWorld.BASE - 2, TmWorld.PIT + 1.2 - (h - strip) / S / 2);
  if (camY === null) camY = wantY;
  camY += (wantY - camY) * Math.min(1, dt * 2);
  if (cam === null) cam = lastLead;
  const step = (lastLead - cam) * Math.min(1, dt * 2);
  cam += Math.max(-12 * dt, Math.min(12 * dt, step));
  ctx.save();
  ctx.translate(0, strip);
  TmDraw.render(ctx, w, h - strip, {
    t: time, cx: cam, cy: camY, S, riders, dolls: shown, wrecks, wip: wips, passed: lead ? stages.get(lead.n) || 0 : 0,
  });
  ctx.restore();
  drawStrip(w, strip);
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

// De strook bovenaan: de vijf parcoursen (met hun finish) en alle ridders op hun plek.
function drawStrip(w, sh) {
  ctx.fillStyle = '#0a0d22';
  ctx.fillRect(0, 0, w, sh);
  const W = TmWorld;
  let maxK = W.ETAPPES;
  const list = [];
  for (const n of others.ids()) {
    const v = others.get(n);
    const who = roster.get(n);
    if (!v || !who) continue;
    list.push([v[0], who.color]);
    maxK = Math.max(maxK, (Math.floor(v[4] / W.ETAPPES) + 1) * W.ETAPPES);
  }
  const end = W.startX(maxK);
  const pad = sh * .6;
  const X = x => pad + Math.max(0, x) / end * (w - pad * 2);
  const y = sh * .62;
  ctx.font = `800 ${Math.round(sh * .26)}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < maxK; k += W.PER) {
    const x0 = X(W.startX(k)), x1 = X(W.startX(k + W.PER));
    const th = W.themeOf(k);
    ctx.fillStyle = th.top;
    ctx.globalAlpha = .35;
    ctx.fillRect(x0 + 1, y - 3, x1 - x0 - 2, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.top;
    if (x1 - x0 > 90) ctx.fillText(th.name, (x0 + x1) / 2, sh * .2);
    ctx.fillText('🏁', x1, y - sh * .02);
  }
  for (const [x, color] of list) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(X(x), y, sh * .17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0d22';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('tm-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('tm-finish');
});
$('restart').addEventListener('click', () => socket.emit('tm-restart'));
$('close').addEventListener('click', () => socket.emit('tm-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('tm-stop', null, res => {
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
  const stars = s.ranking.reduce((a, r) => a + r.stars, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Tuimelridder!` : 'Tuimelridder is voorbij';
  $('w-why').textContent = `Samen ${stars} sterren verdiend en ${right} vragen juist.`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">🏁 ${p.stage} · ⭐ ${p.stars} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
