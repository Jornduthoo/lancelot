// Titanenstrijd op het bord: de geschilderde arena met twee tot vier titans die vechten.
// De server beslist alles; hier tekenen we de bewegingen: uithalen, slaan, vuren, blokken, ontwijken, herstellen, vallen.
// Rechts per ploeg de punten en de bemanning (welk deel, en hoe vol). Gebruikt sfx, confetti en loadGame uit fx.js,
// quizMakerUrl uit quiz-links.js, AK en TiDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();
let crew = [];
const fx = new AK.Particles();
const ROL = {
  zwaard: { ic: '⚔️', naam: 'Zwaardarm' }, schild: { ic: '🛡️', naam: 'Schildarm' }, kern: { ic: '💠', naam: 'Kern' },
  kanon: { ic: '💥', naam: 'Kanon' }, benen: { ic: '🦿', naam: 'Benen' },
};
const DELEN = ['zwaard', 'schild', 'kern', 'kanon', 'benen'];
const ROL_IMG = {};
for (const r of DELEN) { const i = new Image(); i.src = `/img/titanenstrijd/i-${r}.webp`; ROL_IMG[r] = i; }

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
    loadGame('ti-load', { file: q.file, minutes: Number($('ti-minutes').value), tempo: $('ti-tempo').value, ploegen: Number($('ti-ploegen').value) }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

// ---------- Toestand per titan op het bord ----------
const anim = []; // per ploeg: { atk, hit, flash, fall, dodge, heal, shown }
const shots = [];   // vuurballen in de lucht
const marks = [];   // effecten op een plek: { name, x, y, size, t, life, ... }
const texts = [];   // zwevende tekst: -90, GEBLOKT!
let shake = 0;
const nowS = () => performance.now() / 1000;
const A = i => (anim[i] ||= { atk: null, flash: 0, fall: 0, dodge: 0, heal: 0, rise: 0, smoke: 0 });

socket.on('ti-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  if (s.crew) crew = s.crew;
  const on = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !on);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = on ? `Titanenstrijd · ${s.title}` : 'Titanenstrijd';
  if (prev && prev.run !== s.run) anim.length = 0;
  if (!on) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide();
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('ti-tick', msg => {
  if (!state || state.phase !== 'play') return;
  state.titans = msg.titans;
  if (msg.feed) state.feed = msg.feed;
  if (msg.crew) crew = msg.crew;
  for (const e of msg.ev) onEvent(e);
});

const nameOf = n => (roster.get(n) || {}).name || '';
const team = i => (state && state.teams[i]) || { naam: '', kleur: '#fff' };

function onEvent(e) {
  const t = nowS();
  const [k] = e;
  if (k === 'wind') {
    const [, kind, from, to, ms] = e;
    A(from).atk = { kind, to, t0: t, t1: t + ms / 1000 };
    if (kind === 'kanon') shots.push({ from, to, t0: t + ms / 1000 - .55, t1: t + ms / 1000 });
    sfx.whoosh();
  } else if (k === 'hit') {
    const [, kind, from, to, dmg, breek] = e;
    const p = chest(to);
    A(to).flash = t + .16;
    if (kind === 'zwaard') marks.push({ name: 'slag', x: p.x, y: p.y, size: p.s * 1.1, t, life: .45, flip: place(to).facing > 0, grow: .3 });
    marks.push({ name: 'ontploffing', x: p.x + (Math.random() - .5) * p.s * .3, y: p.y, size: p.s * (kind === 'kanon' ? .9 : .6), t: t + (kind === 'zwaard' ? .08 : 0), life: .5, grow: .5 });
    texts.push({ text: `-${dmg}`, x: p.x, y: p.y - p.s * .5, t, color: '#ff6b6b', size: 1 });
    if (breek) texts.push({ text: `${ROL[breek].ic} kapot!`, x: p.x, y: p.y - p.s * .85, t: t + .2, color: '#ffb36b', size: .8 });
    fx.burst(p.x, p.y, { n: 18, color: team(from).kleur, speed: 380, life: .6, size: 4 });
    shake = Math.max(shake, kind === 'kanon' ? .35 : .25);
    sfx.hit();
  } else if (k === 'blok') {
    const [, kind, , to] = e;
    const p = chest(to);
    if (kind === 'zwaard') {
      marks.push({ name: 'schild', x: p.x, y: p.y, size: p.s * 1.5, t, life: .6, add: true, grow: .15 });
      texts.push({ text: 'GEBLOKT!', x: p.x, y: p.y - p.s * .7, t, color: '#7fd4ff', size: 1 });
    } else {
      A(to).dodge = t;
      texts.push({ text: 'ONTWEKEN!', x: p.x, y: p.y - p.s * .7, t, color: '#9dffb0', size: 1 });
    }
    sfx.marker();
  } else if (k === 'mis') {
    // De titan viel al neer voor de klap aankwam.
  } else if (k === 'guard') {
    sfx.power();
  } else if (k === 'heal') {
    const [, id, amount] = e;
    const p = chest(id);
    A(id).heal = t;
    texts.push({ text: `+${Math.round(amount * 10)}`, x: p.x, y: p.y - p.s * .5, t, color: '#6dffb5', size: 1 });
    fx.burst(p.x, p.y, { n: 16, color: '#6dffb5', speed: 160, life: .9, size: 4, up: 120 });
    sfx.good();
  } else if (k === 'fix') {
    const [, id, rol] = e;
    const p = chest(id);
    texts.push({ text: `${ROL[rol].ic} hersteld`, x: p.x, y: p.y - p.s * .9, t, color: '#ffe17a', size: .7 });
    fx.burst(p.x, p.y - p.s * .2, { n: 10, color: '#ffe17a', speed: 200, life: .5, size: 3 });
  } else if (k === 'val') {
    const [, id, by] = e;
    const p = chest(id);
    A(id).fallT = t;
    marks.push({ name: 'ontploffing', x: p.x, y: p.y, size: p.s * 2, t, life: .8, grow: .6 });
    marks.push({ name: 'rook', x: p.x, y: p.y + p.s * .4, size: p.s * 1.6, t: t + .2, life: 2.2, grow: .4, up: .3 });
    shake = .7;
    banner(`💥 ${team(by).naam} haalt ${team(id).naam} neer!`);
    sfx.boom();
  } else if (k === 'op') {
    const [, id] = e;
    A(id).fallT = 0;
    A(id).riseT = t;
    sfx.go();
  } else if (k === 'slag') {
    const [, id] = e;
    const p = chest(id);
    marks.push({ name: 'ster', x: p.x, y: p.y, size: p.s * 2.4, t, life: .9, add: true, grow: .5, spin: 1 });
    for (const o of state.teams) if (o.id !== id) bolts.push({ from: id, to: o.id, t, life: .7 });
    shake = .8;
    banner(`⚡ TITANENSLAG van ${team(id).naam}!`);
    sfx.fanfare();
  }
}
const bolts = [];

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ---------- Lobby, zijkant, einde ----------
function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'piloot' : 'piloten';
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
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('ti-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastSide = '';
let lastFeed = '';
function renderSide() {
  if (!state || !state.titans) return;
  const html = state.teams.map(tm => {
    const ti = state.titans.find(x => x.id === tm.id) || { hp: 0, points: 0 };
    const leden = crew.filter(c => c[1] === tm.id).sort((a, b) => DELEN.indexOf(a[2]) - DELEN.indexOf(b[2]));
    const rows = leden.map(c => {
      const kapot = (ti.kapot || []).includes(c[2]);
      return `<li class="${kapot ? 'kapot' : c[3] >= 100 ? 'vol' : ''}"><span class="ti-ic">${ROL[c[2]].ic}</span><span class="ti-nm">${AK.esc(nameOf(c[0]))}</span><i class="ti-bar"><b style="width:${kapot ? 0 : c[3]}%"></b></i></li>`;
    }).join('');
    return `<div class="panel ti-team" style="--team:${tm.kleur}"><div class="ti-team-kop"><b>${AK.esc(tm.naam)}</b><span>${ti.points} pt</span></div><ul>${rows}</ul></div>`;
  }).join('');
  if (html !== lastSide) { lastSide = html; $('p-teams').innerHTML = html; }
  const key = JSON.stringify(state.feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (state.feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
  const lead = [...state.titans].sort((a, b) => b.points - a.points)[0];
  $('p-lead').textContent = lead ? `👑 ${team(lead.id).naam} leidt` : '';
}
setInterval(() => { if (view === 'play') renderSide(); }, 500);

function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  const tr = s.teamRanking || [];
  const top = tr[0];
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  $('w-title').textContent = top ? `🏆 ${top.naam} wint de Titanenstrijd!` : 'De Titanenstrijd is voorbij';
  $('w-why').textContent = top ? `${top.points} punten · ${top.kos} keer een titan neergehaald · ${top.slagen} Titanenslagen. Samen ${right} vragen juist.` : '';
  $('final-teams').innerHTML = tr.map((t, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${t.kleur}"></i>${AK.esc(t.naam)}</span><span class="muted">💥 ${t.kos} · ⚡ ${t.slagen}</span><span class="pts">${t.points}</span></li>`).join('');
  // De beste per deel, zodat ook een schildwacht of kern in de kijker komt.
  const best = DELEN.map(r => {
    const list = s.ranking.filter(p => p.rol === r);
    if (!list.length) return '';
    const b = list.reduce((a, p) => (p.points > a.points ? p : a));
    return `<div class="ti-best-kaart" style="--team:${team(b.team).kleur}"><img src="/img/titanenstrijd/i-${r}.webp" alt=""><small>Beste ${ROL[r].naam.toLowerCase()}</small><b>${AK.esc(b.name)}</b></div>`;
  }).join('');
  $('best').innerHTML = best;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${team(p.team).kleur}"></i>${p.rol ? ROL[p.rol].ic + ' ' : ''}${AK.esc(p.name)}</span><span class="muted">✔ ${p.right}</span><span class="pts">${p.points}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
let W = 1, H = 1;
const place = i => TiDraw.spot(state.teams.length, i, W, H);
// De borst van een titan: daar landen de klappen.
function chest(i) {
  const s = place(i);
  const a = anim[i] || {};
  return { x: s.x + (a.dx || 0), y: s.y - TiDraw.HEIGHT * s.scale * .58, s: TiDraw.HEIGHT * s.scale * .5 };
}
function muzzle(i) {
  const s = place(i);
  return { x: s.x + s.facing * 260 * s.scale, y: s.y - 690 * s.scale };
}
const ease = k => k * k * (3 - 2 * k);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (view !== 'play' || !state || !state.titans || !TiDraw.loaded()) return;
  const t = now / 1000;
  const fit = AK.fit(canvas, 1.25);
  W = fit.w;
  H = fit.h;
  ctx.save();
  if (shake > 0) {
    shake = Math.max(0, shake - dt);
    const m = shake * H * .012;
    ctx.translate((Math.random() - .5) * m, (Math.random() - .5) * m);
  }
  TiDraw.arena(ctx, W, H);
  // Achteraan eerst, zodat de voorste titans ervoor staan.
  const order = state.titans.map(x => x.id).sort((a, b) => place(a).y - place(b).y);
  for (const id of order) drawTitan(id, t);
  drawShots(t);
  drawMarks(t);
  fx.update(dt);
  fx.draw(ctx);
  drawTexts(t);
  ctx.restore();
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(H * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(String(Math.ceil(wait / 1000)), W / 2, H * .4);
    ctx.restore();
  }
}
requestAnimationFrame(frame);

function drawTitan(id, t) {
  const ti = state.titans.find(x => x.id === id);
  const s = place(id);
  const a = A(id);
  const tm = team(id);
  const tall = TiDraw.HEIGHT * s.scale;
  // Aanval: naar het doel toe stappen en het zwaard heffen, dan slaan. Kanon: richten, vuren, terugslag.
  let swing = 0, aim = 0, recoil = 0, dx = 0;
  if (a.atk) {
    const k = (t - a.atk.t0) / (a.atk.t1 - a.atk.t0);
    const dist = place(a.atk.to).x - s.x;
    if (a.atk.kind === 'zwaard') {
      if (k < 1) { swing = -ease(Math.min(1, k / .8)); if (k > .8) swing = -1 + ((k - .8) / .2) * 2; dx = ease(Math.min(1, k)) * dist * .32; }
      else if (k < 1.35) { const b = (k - 1) / .35; swing = 1 - b; dx = (1 - ease(b)) * dist * .32; }
      else a.atk = null;
    } else {
      if (k < 1) aim = ease(Math.min(1, k * 1.5));
      else if (k < 1.4) { const b = (k - 1) / .4; recoil = 1 - b; aim = 1 - b; }
      else a.atk = null;
      if (k > .7 && k < 1) recoil = (k - .7) / .3 * .6;
    }
  }
  // Ontwijken: snel opzij en terug.
  const dk = t - (a.dodge || 0);
  if (dk < .6) dx -= Math.sin((dk / .6) * Math.PI) * s.facing * tall * .25;
  // Vallen en weer opstaan.
  let fall = 0;
  if (ti.down > 0 && a.fallT) fall = Math.min(1, (t - a.fallT) / .7);
  else if (ti.down > 0) fall = 1;
  if (a.riseT && t - a.riseT < .8) fall = 1 - ease((t - a.riseT) / .8);
  a.dx = dx;
  const kapot = new Set(ti.kapot);
  const flash = t < (a.flash || 0);
  const shield = ti.schild > 0 ? Math.min(1, (a.shieldK = Math.min(1, (a.shieldK || 0) + .12))) : (a.shieldK = Math.max(0, (a.shieldK || 0) - .08));
  // Schaduw
  ctx.save();
  ctx.globalAlpha = .45;
  ctx.fillStyle = '#05020c';
  ctx.beginPath();
  ctx.ellipse(s.x + dx, s.y - tall * .01, tall * .28, tall * .05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Benen klaar om te ontwijken: gloed onder de voeten.
  if (ti.benen > 0) AK.glow(ctx, s.x + dx, s.y - tall * .02, tall * .3, '#5ae6ff', .55 + Math.sin(t * 10) * .15);
  // Een titan die net hersteld wordt, gloeit groen.
  if (t - (a.heal || 0) < .9) AK.glow(ctx, s.x + dx, s.y - tall * .5, tall * .6, '#6dffb5', .6 * (1 - (t - a.heal) / .9));
  TiDraw.titan(ctx, s.x + dx, s.y, s.scale, s.facing, tm.kleur, { t: t + id, swing, aim, recoil, shield, kapot, flash, fall, lean: fall ? 0 : swing > 0 ? swing * .06 : 0 });
  if (shield > .3 && ti.schild > 0) TiDraw.sprite(ctx, 'schild', s.x + dx + s.facing * tall * .08, s.y - tall * .55, tall * 1.05, { alpha: .35 + Math.sin(t * 6) * .08, add: true });
  // Rook uit kapotte delen.
  if (kapot.size && !fall) {
    a.smoke = (a.smoke || 0) - .016;
    if (a.smoke <= 0) {
      a.smoke = .35;
      fx.burst(s.x + dx, s.y - tall * .7, { n: 2, color: '#8a8698', speed: 40, life: 1.2, size: 7, glow: false, up: 60 });
    }
  }
  // Kanon aan het opladen: een gloeiende loop.
  if (aim > .3 && a.atk && a.atk.kind === 'kanon') { const m = muzzle(id); AK.glow(ctx, m.x + dx, m.y, tall * .1 * aim, '#ffa040', .9); }
  plate(id, ti, s, dx, tall, fall, t);
}

// Boven de titan: naam en punten, de levensbalk, en de delen die net een juist antwoord hadden (samen = Titanenslag).
function plate(id, ti, s, dx, tall, fall, t) {
  const tm = team(id);
  const x = s.x + dx;
  const sz = Math.max(20, tall * .08);
  const top = s.y - tall * (fall ? .42 : .98);
  const w = Math.max(120, tall * .55), h = Math.max(10, tall * .035);
  const barY = top - sz - 8 - h;
  const fs = Math.max(16, Math.round(tall * .058));
  ctx.save();
  ctx.font = `900 ${fs}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(5,2,14,.85)';
  ctx.strokeText(`${tm.naam} · ${ti.points}`, x, barY - 4);
  ctx.fillStyle = tm.kleur;
  ctx.fillText(`${tm.naam} · ${ti.points}`, x, barY - 4);
  ctx.fillStyle = 'rgba(5,2,14,.8)';
  AK.roundRect(ctx, x - w / 2 - 2, barY - 2, w + 4, h + 4, h);
  ctx.fill();
  const k = Math.max(0, ti.hp / 100);
  ctx.fillStyle = k > .5 ? '#5dff9b' : k > .25 ? '#ffd24a' : '#ff5a5f';
  if (k > 0) { AK.roundRect(ctx, x - w / 2, barY, w * k, h, h / 2); ctx.fill(); }
  if (ti.down > 0) {
    ctx.font = `900 ${fs * 2}px Orbitron, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.strokeText(String(Math.ceil(ti.down / 1000)), x, s.y - tall * .3);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.ceil(ti.down / 1000)), x, s.y - tall * .3);
  }
  const rollen = DELEN.filter(r => crew.some(c => c[1] === id && c[2] === r));
  const y2 = top - sz - 2;
  rollen.forEach((r, i) => {
    const xi = x + (i - (rollen.length - 1) / 2) * sz * 1.1;
    const lit = (ti.lit || []).includes(r);
    if (lit) AK.glow(ctx, xi, y2 + sz / 2, sz * .9, '#ffe17a', .6 + Math.sin(t * 8 + i) * .2);
    ctx.globalAlpha = lit ? 1 : (ti.kapot || []).includes(r) ? .25 : .55;
    if (ROL_IMG[r].complete) ctx.drawImage(ROL_IMG[r], xi - sz / 2, y2, sz, sz);
  });
  ctx.restore();
}

function drawShots(t) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const sh = shots[i];
    if (t > sh.t1) { shots.splice(i, 1); continue; }
    if (t < sh.t0) continue;
    const k = (t - sh.t0) / (sh.t1 - sh.t0);
    const a = muzzle(sh.from), b = chest(sh.to);
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * H * .08;
    const ang = Math.atan2(b.y - a.y - Math.cos(k * Math.PI) * H * .08 * Math.PI, b.x - a.x);
    TiDraw.sprite(ctx, 'vuurbal', x, y, b.s * .55, { rot: ang + Math.PI * .8 });
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const bo = bolts[i], k = (t - bo.t) / bo.life;
    if (k >= 1) { bolts.splice(i, 1); continue; }
    const a = chest(bo.from), b = chest(bo.to);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    AK.lightning(ctx, a.x, a.y, b.x, b.y, '#ffe17a', 5, .2);
    ctx.restore();
  }
}

function drawMarks(t) {
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i], k = (t - m.t) / m.life;
    if (k >= 1) { marks.splice(i, 1); continue; }
    if (k < 0) continue;
    TiDraw.sprite(ctx, m.name, m.x, m.y - (m.up || 0) * k * m.size, m.size * (1 + (m.grow || 0) * k), { alpha: k < .2 ? 1 : 1 - (k - .2) / .8, add: m.add, flip: m.flip, rot: m.spin ? k * 1.5 : 0 });
  }
}

function drawTexts(t) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const x = texts[i], k = (t - x.t) / 1.2;
    if (k >= 1) { texts.splice(i, 1); continue; }
    if (k < 0) continue;
    const fs = Math.round(H * .045 * x.size);
    ctx.save();
    ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3;
    ctx.font = `900 ${fs}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(3, fs * .14);
    ctx.strokeStyle = 'rgba(5,2,14,.9)';
    const y = x.y - k * H * .06;
    ctx.strokeText(x.text, x.x, y);
    ctx.fillStyle = x.color;
    ctx.fillText(x.text, x.x, y);
    ctx.restore();
  }
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('ti-start'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('ti-finish');
});
$('restart').addEventListener('click', () => socket.emit('ti-restart'));
$('close').addEventListener('click', () => socket.emit('ti-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('ti-stop', null, res => {
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
