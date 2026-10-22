// Laserslag op de gsm of Chromebook: lopen, richten, schieten en munitie verdienen met vragen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, Arena en SlagDraw.
const ls = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  me: null,           // eigen ridder: { x, y, a }
  info: null,         // levens, munitie, krachten van de server
  spawn: -1,
  others: new Map(),
  bullets: new Map(),
  crystal: null,
  score: { rood: 0, blauw: 0 },
  keys: {},
  stick: null,        // virtuele joystick: { id, sx, sy, dx, dy }
  mouse: null,        // muispositie op het scherm, als er met de muis gericht wordt
  firing: false,
  lastFire: 0,
  question: null,
  shake: 0,
  hurt: 0,
  marker: 0,
  cam: { x: 0, y: 0, scale: 1 },
  booms: [],
  look: null,
  recoil: 0,
};

const lsNow = () => Date.now() + ls.offset;
const LS_FIRE_MS = 280;
const LS_RAPID_MS = 120;

function lsShow(name) {
  for (const s of ['ls-join', 'ls-lobby', 'ls-game', 'ls-end']) $(s).classList.toggle('hidden', s !== name);
}

function lsJoin(name) {
  socket.emit('ls-join', { playerId, name }, res => {
    if (res.error) {
      ls.joined = false;
      $('ls-join-error').textContent = res.error;
      lsShow('ls-join');
      return;
    }
    ls.joined = true;
    store('lancelot-name', res.name);
    $('ls-join-error').textContent = '';
  });
}

$('ls-join').addEventListener('submit', e => {
  e.preventDefault();
  lsJoin($('ls-name').value);
});

const TEAM_NAME = { rood: 'Team Rood', blauw: 'Team Blauw' };

socket.on('ls-state', s => {
  ls.state = s;
  ls.offset = s.now - Date.now();
  document.body.dataset.ls = s.active ? '1' : '';
  if (!s.active) {
    ls.joined = false;
    ls.me = null;
    return;
  }
  if (ls.run !== s.run) {
    ls.run = s.run;
    ls.me = null;
    ls.info = null;
    ls.spawn = -1;
    ls.others.clear();
    ls.bullets.clear();
    ls.joined = false;
    delete $('ls-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!ls.joined && saved && ls.autoRun !== s.run) {
      ls.autoRun = s.run;
      lsJoin(saved);
    } else if (!ls.joined) {
      $('ls-name').value = saved || '';
      lsShow('ls-join');
    }
    return;
  }
  ls.joined = true;
  if (s.score) ls.score = s.score;
  if (s.phase === 'lobby') {
    $('ls-lobby-name').textContent = s.name;
    const badge = $('ls-lobby-team');
    badge.textContent = s.team ? TEAM_NAME[s.team] : 'Ieder voor zich';
    badge.dataset.team = s.team || '';
    $('ls-lobby-view').textContent = s.view === '3d'
      ? 'First person: je kijkt door de ogen van je ridder. Gsm: links slepen om te lopen, rechts slepen om rond te kijken. Chromebook: WASD en de muis.'
      : '';
    lsShow('ls-lobby');
  } else if (s.phase === 'play') {
    $('ls-game').dataset.view = s.view;
    document.querySelector('.ls-keys').textContent = s.view === '3d'
      ? 'Klik om de muis te vangen · WASD lopen · muis kijken · klik of spatie vuur · E munitie · Esc muis los'
      : 'WASD lopen · muis richten en klikken · spatie vuur · E munitie · 1-4 antwoorden';
    lsShow('ls-game');
    lsResize();
  } else if (s.phase === 'einde') {
    lsCloseQuestion();
    $('ls-out').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    let title = s.rank === 1 ? 'Jij bent de beste ridder!' : `Plek ${s.rank} van ${s.players}`;
    let medal = medals[s.rank - 1] || '⚔️';
    if (s.mode === 'teams') {
      const won = s.winner === s.team;
      title = s.winner === 'gelijk' ? 'Gelijkspel!' : won ? `${TEAM_NAME[s.team]} wint!` : `${TEAM_NAME[s.winner]} wint`;
      medal = s.winner === 'gelijk' ? '🤝' : won ? '🏆' : medal;
      $('ls-end-score').textContent = `Rood ${s.score.rood} – ${s.score.blauw} Blauw`;
    } else {
      $('ls-end-score').textContent = `${s.points} punten`;
    }
    $('ls-end-medal').textContent = medal;
    $('ls-end-title').textContent = title;
    $('ls-end-stats').textContent = `${s.kills} slagen · ${s.deaths} keer uitgeschakeld · ${s.right} vragen juist · plek ${s.rank} van ${s.players}`;
    if (!$('ls-end').dataset.done && (s.rank <= 3 || s.winner === s.team)) confetti(4000);
    $('ls-end').dataset.done = '1';
    lsShow('ls-end');
  }
});

socket.on('ls-kicked', () => {
  ls.joined = false;
  store('lancelot-name', null);
  $('ls-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  lsShow('ls-join');
});

socket.on('connect', () => {
  if (ls.joined) lsJoin(store('lancelot-name') || '');
});

// Eigen levens, munitie en krachten. Na een treffer zet de server ons terug in het kamp.
socket.on('ls-me', m => {
  const gotAmmo = ls.info && m.ammo > ls.info.ammo;
  m.at = Date.now();
  m.offset = m.now - Date.now();
  ls.info = m;
  if (m.spawn !== ls.spawn || !ls.me) {
    ls.spawn = m.spawn;
    ls.me = { x: m.x, y: m.y, a: ls.state && ls.state.team === 'blauw' ? Math.PI : 0 };
    if (m.alive && ls.state && ls.state.phase === 'play') $('ls-out').classList.add('hidden');
  }
  if (gotAmmo) $('ls-ammo-box').classList.add('pop');
  setTimeout(() => $('ls-ammo-box').classList.remove('pop'), 300);
  lsHud();
});

socket.on('ls-world', data => {
  ls.offset = data.now - Date.now();
  ls.crystal = data.crystal;
  ls.score = data.score;
  const seen = new Set();
  for (const [id, name, x, y, a, team, color, hp, flags, kills, streak] of data.players) {
    seen.add(id);
    if (id === playerId) {
      ls.myFlags = flags;
      continue;
    }
    const o = ls.others.get(id);
    if (o) {
      if (Math.hypot(o.tx - x, o.ty - y) > 200) { o.x = x; o.y = y; }
      Object.assign(o, { tx: x, ty: y, ta: a, team, color, hp, flags, name, kills, streak });
    } else {
      ls.others.set(id, { x, y, a, tx: x, ty: y, ta: a, team, color, hp, flags, name, kills, streak });
    }
  }
  for (const id of ls.others.keys()) if (!seen.has(id)) ls.others.delete(id);
  ls.ranking = data.players.slice().sort((p, q) => q[9] - p[9]);
});

socket.on('ls-shot', s => {
  const shooter = s.owner === playerId ? ls.state : ls.others.get(s.owner);
  SlagDraw.addBullet(ls.bullets, s, SlagDraw.colorOf(s.team, s.color));
  if (s.owner !== playerId && ls.me && Math.hypot(s.x - ls.me.x, s.y - ls.me.y) < 500) sfx.laser();
  if (shooter && s.owner !== playerId) { const o = ls.others.get(s.owner); if (o) o.ta = s.a; }
});

socket.on('ls-pop', ids => { for (const id of ids) ls.bullets.delete(id); });

socket.on('ls-hit', h => {
  SlagDraw.burst(h.x, h.y, h.blocked ? '#4cc9ff' : '#ffe08a', h.blocked ? 6 : 12);
  if (h.id === playerId && !h.blocked) {
    ls.shake = .35;
    ls.hurt = .5;
    sfx.hit();
    buzz(120);
  }
  if (h.by === playerId && h.id !== playerId) {
    ls.marker = .25;
    if (!h.blocked) sfx.marker();
  }
});

socket.on('ls-ko', k => {
  const o = k.victim === playerId ? null : ls.others.get(k.victim);
  const color = o ? SlagDraw.colorOf(o.team, o.color) : '#ffffff';
  ls.booms.push({ x: k.x, y: k.y, color, age: 0, life: .6 });
  SlagDraw.burst(k.x, k.y, color, 28, 380);
  SlagDraw.ring(k.x, k.y, color);
  if (ls.me && Math.hypot(k.x - ls.me.x, k.y - ls.me.y) < 700) sfx.boom();
  if (k.text) lsFeed(k.text, k.killer === playerId ? 'me' : k.victim === playerId ? 'bad' : '');
});

// Ik heb iemand uitgeschakeld.
socket.on('ls-slag', s => {
  lsBanner(s.callout || 'SLAG!', `${s.victim} · +${s.points}${s.wanted ? ' · gezochte ridder!' : ''}`, s.callout ? 'big' : '');
  buzz([40, 30, 60]);
  if (s.callout) sfx.fanfare(); else sfx.good();
});

// Ik ben uitgeschakeld: terug naar het kamp, ondertussen munitie verdienen.
socket.on('ls-out', o => {
  ls.outUntil = o.respawnAt;
  ls.firing = false;
  $('ls-out-by').textContent = o.by ? `door ${o.by}` : '';
  $('ls-out').classList.remove('hidden');
  buzz([200, 80, 200]);
});

socket.on('ls-power', p => {
  lsToast(`✨ ${p.text}!`, 'gold');
  sfx.power();
});

let lsToastTimer = null;
function lsToast(text, kind = '') {
  const el = $('ls-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(lsToastTimer);
  lsToastTimer = setTimeout(() => { el.className = 'tw-toast'; }, 2000);
}

let lsBannerTimer = null;
function lsBanner(title, sub, kind = '') {
  const el = $('ls-banner');
  el.innerHTML = `<strong></strong><span></span>`;
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = sub;
  el.className = `ls-banner show ${kind}`;
  clearTimeout(lsBannerTimer);
  lsBannerTimer = setTimeout(() => { el.className = 'ls-banner'; }, 1600);
}

function lsFeed(text, kind) {
  const el = document.createElement('div');
  el.className = `ls-feed-line ${kind}`;
  el.textContent = text;
  const feed = $('ls-feed');
  feed.prepend(el);
  while (feed.children.length > 4) feed.lastChild.remove();
  setTimeout(() => el.remove(), 5000);
}

// ---------- Besturing ----------

const LS_KEYS = { ArrowUp: 'up', w: 'up', z: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', q: 'left', ArrowRight: 'right', d: 'right' };
const ls3d = () => !!(ls.state && ls.state.view === '3d');
// In 3D draaien de pijltjes links en rechts je ridder; A en D stappen opzij.
function lsKey(e) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (ls3d() && (key === 'ArrowLeft' || key === 'ArrowRight')) return key === 'ArrowLeft' ? 'tl' : 'tr';
  return LS_KEYS[key];
}
document.addEventListener('keydown', e => {
  if (document.body.dataset.ls !== '1' || e.target.tagName === 'INPUT') return;
  const k = lsKey(e);
  if (ls.question) {
    if (ls.question.answers && !ls.question.done && /^[1-4]$/.test(e.key)) lsAnswer(Number(e.key) - 1);
    if (e.key === 'Escape' || (e.key === 'Enter' && ls.question.done)) lsCloseQuestion();
    return;
  }
  if (k) { ls.keys[k] = true; e.preventDefault(); }
  if (e.key === ' ') { ls.firing = 'auto'; e.preventDefault(); }
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') lsOpenQuestion();
});
document.addEventListener('keyup', e => {
  const k = lsKey(e);
  if (k) ls.keys[k] = false;
  if (e.key === ' ' && ls.firing === 'auto') ls.firing = false;
});

const lsCanvas = $('ls-canvas');
const lsCtx = lsCanvas.getContext('2d');
let lsView = { w: 0, h: 0, dpr: 1 };

// Muis (Chromebook): richten met de muis, klikken om te schieten.
lsCanvas.addEventListener('pointerdown', e => {
  sfx.unlock();
  if (e.pointerType === 'mouse') {
    ls.mouse = { x: e.offsetX, y: e.offsetY };
    // In 3D vangt het canvas de muis, zodat je met de muis rondkijkt.
    if (ls3d() && document.pointerLockElement !== lsCanvas && lsCanvas.requestPointerLock) {
      try { const r = lsCanvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {}
    }
    ls.firing = 'mouse';
    return;
  }
  // Aanraken in 3D: rechts slepen is rondkijken.
  if (ls3d() && e.offsetX >= lsCanvas.clientWidth * .45 && !ls.look) {
    e.preventDefault();
    lsCanvas.setPointerCapture(e.pointerId);
    ls.look = { id: e.pointerId, x: e.offsetX };
    return;
  }
  // Aanraken: links van het midden is de joystick.
  if (e.offsetX < lsCanvas.clientWidth * .55 && !ls.stick) {
    e.preventDefault();
    lsCanvas.setPointerCapture(e.pointerId);
    ls.stick = { id: e.pointerId, sx: e.offsetX, sy: e.offsetY, dx: 0, dy: 0 };
  }
});
lsCanvas.addEventListener('pointermove', e => {
  if (ls3d() && ls.me && !ls.question) {
    if (document.pointerLockElement === lsCanvas) ls.me.a += e.movementX * .0028;
    if (ls.look && e.pointerId === ls.look.id) {
      ls.me.a += (e.offsetX - ls.look.x) * .009;
      ls.look.x = e.offsetX;
    }
  }
  if (e.pointerType === 'mouse') ls.mouse = { x: e.offsetX, y: e.offsetY };
  if (ls.stick && e.pointerId === ls.stick.id) {
    ls.stick.dx = e.offsetX - ls.stick.sx;
    ls.stick.dy = e.offsetY - ls.stick.sy;
  }
});
const lsStickEnd = e => {
  if (ls.stick && e.pointerId === ls.stick.id) ls.stick = null;
  if (ls.look && e.pointerId === ls.look.id) ls.look = null;
  if (e.pointerType === 'mouse' && ls.firing === 'mouse') ls.firing = false;
};
lsCanvas.addEventListener('pointerup', lsStickEnd);
lsCanvas.addEventListener('pointercancel', lsStickEnd);
lsCanvas.addEventListener('contextmenu', e => e.preventDefault());

const fireBtn = $('ls-fire');
fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); ls.firing = 'auto'; fireBtn.classList.add('down'); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) fireBtn.addEventListener(ev, () => { if (ls.firing === 'auto') ls.firing = false; fireBtn.classList.remove('down'); });
$('ls-load').addEventListener('click', () => lsOpenQuestion());
$('ls-out-load').addEventListener('click', () => lsOpenQuestion());
$('ls-q-close').addEventListener('click', () => lsCloseQuestion());
for (const b of document.querySelectorAll('.ls-btn')) b.addEventListener('contextmenu', e => e.preventDefault());

// Automatisch richten op de dichtstbijzijnde vijand die je kan zien.
function lsTarget() {
  const me = ls.me;
  let best = null;
  let bestD = 650;
  for (const o of ls.others.values()) {
    if (o.flags & 1) continue;
    if (ls.state.mode === 'teams' && o.team === ls.state.team) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < bestD && Arena.clearLine(me.x, me.y, o.x, o.y)) { best = o; bestD = d; }
  }
  return best;
}

function lsEnemies() {
  return [...ls.others.values()].filter(o => !(o.flags & 1) && !(ls.state.mode === 'teams' && o.team === ls.state.team));
}

function lsAim() {
  const me = ls.me;
  if (ls3d()) return Slag3D.assist(me, me.a, lsEnemies());
  if (ls.mouse && ls.firing !== 'auto') {
    const { scale } = ls.cam;
    const wx = ls.cam.x + (ls.mouse.x * lsView.dpr) / scale;
    const wy = ls.cam.y + (ls.mouse.y * lsView.dpr) / scale;
    return Math.atan2(wy - me.y, wx - me.x);
  }
  const t = lsTarget();
  if (t) {
    // Een beetje voorhouden, zodat lopende ridders ook te raken zijn.
    const lead = Math.hypot(t.x - me.x, t.y - me.y) / Arena.BULLET.speed;
    return Math.atan2(t.y + (t.ty - t.y) * 2 * lead * 10 - me.y, t.x + (t.tx - t.x) * 2 * lead * 10 - me.x);
  }
  return me.a;
}

function lsFire(now) {
  const info = ls.info;
  if (!info || !info.alive || ls.question) return;
  const rapid = info.power && info.power.snel > 0 && Date.now() - info.at < info.power.snel;
  if (now - ls.lastFire < (rapid ? LS_RAPID_MS : LS_FIRE_MS)) return;
  ls.lastFire = now;
  if (info.ammo <= 0) {
    sfx.empty();
    buzz(60);
    lsToast('Geen munitie! Druk op ⚡ Laden', 'bad');
    $('ls-ammo-box').classList.add('empty');
    ls.firing = ls.firing === 'mouse' ? false : ls.firing;
    return;
  }
  const a = lsAim();
  if (!ls3d()) ls.me.a = a;
  ls.recoil = 1;
  info.ammo--;
  sfx.laser();
  socket.emit('ls-shoot', +a.toFixed(3), res => {
    if (res && typeof res.ammo === 'number' && ls.info) ls.info.ammo = res.ammo;
    lsHud();
  });
  lsHud();
}

// ---------- Vragen voor munitie ----------

function lsOpenQuestion() {
  if (ls.question || !ls.state || ls.state.phase !== 'play') return;
  if (lsNow() < ls.state.startedAt) return;
  ls.question = { loading: true };
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  ls.keys = {};
  ls.look = null;
  ls.stick = null;
  ls.firing = false;
  $('ls-question').classList.remove('hidden');
  $('ls-q-text').textContent = '…';
  $('ls-q-answers').innerHTML = '';
  $('ls-q-result').textContent = '';
  $('ls-q-result').className = 'tw-q-result';
  socket.emit('ls-question', null, res => {
    if (!res || res.error) return lsCloseQuestion();
    ls.question = { answers: res.answers };
    $('ls-q-text').textContent = res.question;
    $('ls-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('ls-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => lsAnswer(i));
    });
  });
}

function lsAnswer(i) {
  if (!ls.question || ls.question.done) return;
  ls.question.done = true;
  socket.emit('ls-answer', i, res => {
    if (!res || res.error) return lsCloseQuestion();
    const tiles = [...$('ls-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('ls-q-result');
    result.textContent = res.correct ? `Juist! +${res.gained} ⚡${res.qstreak > 1 ? ` · ${res.qstreak} op rij` : ''}` : 'Helaas, geen munitie.';
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) sfx.good(); else sfx.bad();
    if (res.power) setTimeout(() => lsBanner('KRACHT!', res.power, 'gold'), 300);
    buzz(res.correct ? [30, 40, 30] : 200);
    $('ls-ammo-box').classList.remove('empty');
    // Meteen de volgende vraag: wie wil, blijft laden. Sluiten kan altijd.
    setTimeout(() => {
      if (!ls.question || !ls.question.done) return;
      ls.question = null;
      lsOpenQuestion();
    }, res.correct ? 900 : 2000);
  });
}

function lsCloseQuestion() {
  if (ls.question) socket.emit('ls-asking', false);
  ls.question = null;
  $('ls-question').classList.add('hidden');
}

// ---------- Spel ----------

function lsResize() {
  const stage = $('ls-stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  lsCanvas.width = Math.round(w * dpr);
  lsCanvas.height = Math.round(h * dpr);
  lsCanvas.style.width = `${w}px`;
  lsCanvas.style.height = `${h}px`;
  // Ongeveer 1100 eenheden breed op een liggend scherm, 430 op een gsm rechtop.
  const scale = Math.min(lsCanvas.width / Math.min(1100, Math.max(430, w * 1.1)), lsCanvas.height / 560);
  lsView = { w: lsCanvas.width, h: lsCanvas.height, dpr, scale };
}
window.addEventListener('resize', lsResize);

let lsSent = '';
setInterval(() => {
  if (!ls.me || !ls.info || !ls.info.alive || !ls.state || ls.state.phase !== 'play') return;
  const msg = { x: Math.round(ls.me.x), y: Math.round(ls.me.y), a: +ls.me.a.toFixed(2), s: ls.spawn };
  const key = JSON.stringify(msg);
  if (key === lsSent) return;
  lsSent = key;
  socket.emit('ls-move', msg);
}, 50);

function lsMove(dt) {
  const me = ls.me;
  if (!ls.info || !ls.info.alive || ls.question || lsNow() < ls.state.startedAt) return;
  let dx = (ls.keys.right ? 1 : 0) - (ls.keys.left ? 1 : 0);
  let dy = (ls.keys.down ? 1 : 0) - (ls.keys.up ? 1 : 0);
  if (ls.stick) {
    const len = Math.hypot(ls.stick.dx, ls.stick.dy);
    const max = 50;
    if (len > 6) { dx = ls.stick.dx / Math.max(len, max); dy = ls.stick.dy / Math.max(len, max); }
  }
  if (ls3d()) {
    // Vooruit en opzij ten opzichte van waar je kijkt.
    me.a += ((ls.keys.tr ? 1 : 0) - (ls.keys.tl ? 1 : 0)) * 2.6 * dt;
    const fwd = -dy;
    const side = dx;
    dx = Math.cos(me.a) * fwd - Math.sin(me.a) * side;
    dy = Math.sin(me.a) * fwd + Math.cos(me.a) * side;
  }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  ls.moving = len > .05;
  if (len > .05) {
    [me.x, me.y] = Arena.slide(me.x, me.y, dx * Arena.SPEED * dt, dy * Arena.SPEED * dt);
    if (!ls3d() && !ls.mouse && !ls.firing) me.a = Math.atan2(dy, dx);
  }
  if (!ls3d() && ls.mouse && !ls.firing) me.a = lsAim();
}

function lsGlide(dt) {
  for (const o of ls.others.values()) {
    o.x += (o.tx - o.x) * Math.min(1, dt * 14);
    o.y += (o.ty - o.y) * Math.min(1, dt * 14);
    let da = o.ta - o.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    o.a += da * Math.min(1, dt * 14);
  }
}

function lsRender(t, dt) {
  const ctx = lsCtx;
  const { w, h, scale } = lsView;
  const me = ls.me;
  const viewW = w / scale;
  const viewH = h / scale;
  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  const cx = clamp(me.x - viewW / 2, -40, Arena.W + 40 - viewW);
  const cy = clamp(me.y - viewH / 2, -40, Arena.H + 40 - viewH);
  ls.cam.x += (cx - ls.cam.x) * Math.min(1, dt * 10);
  ls.cam.y += (cy - ls.cam.y) * Math.min(1, dt * 10);
  if (!ls.camReady) { ls.cam.x = cx; ls.cam.y = cy; ls.camReady = true; }
  ls.cam.scale = scale;
  let shakeX = 0;
  let shakeY = 0;
  if (ls.shake > 0) {
    ls.shake -= dt;
    shakeX = (Math.random() - .5) * 14 * ls.shake / .35;
    shakeY = (Math.random() - .5) * 14 * ls.shake / .35;
  }
  const cam = { x: ls.cam.x + shakeX / scale, y: ls.cam.y + shakeY / scale, scale };
  const sx = x => (x - cam.x) * scale;
  const sy = y => (y - cam.y) * scale;
  SlagDraw.arena(ctx, cam, w, h);
  if (ls.crystal) SlagDraw.crystal(ctx, sx(ls.crystal.x), sy(ls.crystal.y), scale, t);

  SlagDraw.moveBullets(ls.bullets, dt);
  for (const b of ls.bullets.values()) SlagDraw.bullet(ctx, sx(b.x), sy(b.y), b.a, b.color, scale);

  // De anderen, vloeiend tussen de berichten door.
  const teams = ls.state.mode === 'teams';
  const top = ls.ranking && ls.ranking[0] && ls.ranking[0][10] >= 3 ? ls.ranking[0][0] : null;
  lsGlide(dt);
  for (const [id, o] of ls.others) {
    if (o.flags & 1) continue;
    const color = SlagDraw.colorOf(o.team, o.color);
    const friend = teams && o.team === ls.state.team;
    SlagDraw.knight(ctx, sx(o.x), sy(o.y), o.a, color, scale, { bubble: o.flags & 6, asking: o.flags & 4, armor: o.flags & 32 });
    const wanted = o.streak >= 3 || id === top;
    SlagDraw.tag(ctx, sx(o.x), sy(o.y), o.name, friend ? o.hp : o.hp, color, scale, wanted ? '🎯' : o.flags & 4 ? '⚡' : '');
  }

  // Jezelf.
  if (ls.info && ls.info.alive) {
    const color = SlagDraw.colorOf(ls.state.team, ls.state.color);
    const flags = ls.myFlags || 0;
    SlagDraw.knight(ctx, sx(me.x), sy(me.y), me.a, color, scale, { me: true, bubble: (flags & 6) || ls.question, asking: (flags & 4) || ls.question, armor: ls.info.armor });
    // Richtlijn met de muis.
    if (ls.mouse) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, .18)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx(me.x), sy(me.y));
      ctx.lineTo(sx(me.x + Math.cos(me.a) * 260), sy(me.y + Math.sin(me.a) * 260));
      ctx.stroke();
      ctx.restore();
    } else {
      const target = lsTarget();
      if (target) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 77, 109, .8)';
        ctx.lineWidth = 2 * scale;
        const r = (Arena.R + 10 + Math.sin(t * 10) * 2) * scale;
        ctx.beginPath(); ctx.arc(sx(target.x), sy(target.y), r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
  SlagDraw.effects(ctx, cam, dt);
  lsOverlays(ctx, dt);
}

// First person: de wereld door de ogen van je ridder.
function ls3dRender(t, dt) {
  const ctx = lsCtx;
  const { w, h, dpr } = lsView;
  const me = ls.me;
  lsGlide(dt);
  SlagDraw.moveBullets(ls.bullets, dt);
  const top = ls.ranking && ls.ranking[0] && ls.ranking[0][10] >= 3 ? ls.ranking[0][0] : null;
  const others = [];
  for (const [id, o] of ls.others) {
    if (o.flags & 1) continue;
    others.push({ x: o.x, y: o.y, color: SlagDraw.colorOf(o.team, o.color), bubble: o.flags & 6, asking: o.flags & 4, name: o.name, hp: o.hp, wanted: id === top });
  }
  for (const b of ls.booms) b.age += dt;
  ls.booms = ls.booms.filter(b => b.age < b.life);
  if (ls.moving) ls.walk = (ls.walk || 0) + dt * 9;
  const tags = Slag3D.render(ctx, w, h, { me, a: me.a, others, bullets: [...ls.bullets.values()], crystal: ls.crystal, t, booms: ls.booms });
  // Naam en levens boven elke zichtbare ridder.
  for (const tg of tags) {
    const fs = Math.max(10 * dpr, Math.min(16 * dpr, tg.size * .2));
    ctx.save();
    ctx.font = `700 ${fs}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, .8)';
    const text = `${tg.o.wanted ? '🎯 ' : tg.o.asking ? '⚡ ' : ''}${tg.o.name}`;
    ctx.strokeText(text, tg.x, tg.y - fs * .9);
    ctx.fillStyle = '#eaf4ff';
    ctx.fillText(text, tg.x, tg.y - fs * .9);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < tg.o.hp ? tg.o.color : 'rgba(255, 255, 255, .2)';
      ctx.fillRect(tg.x - fs * 1.2 + i * fs * .85, tg.y - fs * .55, fs * .7, fs * .3);
    }
    ctx.restore();
  }
  if (ls.info && ls.info.alive) {
    ls.recoil = Math.max(0, (ls.recoil || 0) - dt * 6);
    Slag3D.weapon(ctx, w, h, SlagDraw.colorOf(ls.state.team, ls.state.color), ls.recoil, ls.walk || 0);
    Slag3D.crosshair(ctx, w, h, Slag3D.assist(me, me.a, lsEnemies()) !== me.a, dpr);
    if ((ls.myFlags & 6) || ls.question) {
      ctx.fillStyle = 'rgba(76, 201, 255, .1)';
      ctx.fillRect(0, 0, w, h);
    }
  }
  lsOverlays(ctx, dt);
}

// Treffers, rode rand, joystick en kaartje: in beide zichten hetzelfde.
function lsOverlays(ctx, dt) {
  const { w, h, scale } = lsView;
  const teams = ls.state.mode === 'teams';
  // Treffer-kruisje bij de muis of in het midden.
  if (ls.marker > 0) {
    ls.marker -= dt;
    const aimed = ls.mouse && !ls3d();
    const mx = aimed ? ls.mouse.x * lsView.dpr : w / 2;
    const my = aimed ? ls.mouse.y * lsView.dpr : ls3d() ? h / 2 : h / 2 - 40 * scale;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * lsView.dpr;
    const r = 10 * lsView.dpr;
    for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath(); ctx.moveTo(mx + ax * r * .5, my + ay * r * .5); ctx.lineTo(mx + ax * r * 1.3, my + ay * r * 1.3); ctx.stroke();
    }
    ctx.restore();
  }

  // Rode rand bij een treffer.
  if (ls.hurt > 0) {
    ls.hurt -= dt;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
    g.addColorStop(0, 'rgba(255, 30, 60, 0)');
    g.addColorStop(1, `rgba(255, 30, 60, ${ls.hurt})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Joystick.
  if (ls.stick) {
    const d = lsView.dpr;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, .35)';
    ctx.lineWidth = 3 * d;
    ctx.beginPath(); ctx.arc(ls.stick.sx * d, ls.stick.sy * d, 50 * d, 0, Math.PI * 2); ctx.stroke();
    const len = Math.hypot(ls.stick.dx, ls.stick.dy);
    const k = len > 50 ? 50 / len : 1;
    ctx.fillStyle = 'rgba(76, 201, 255, .55)';
    ctx.beginPath(); ctx.arc((ls.stick.sx + ls.stick.dx * k) * d, (ls.stick.sy + ls.stick.dy * k) * d, 24 * d, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  lsMinimap(ctx, w, h, teams);
}

// Kleine kaart rechtsboven: muren, jij, je teamgenoten en het kristal.
function lsMinimap(ctx, w, h, teams) {
  const d = lsView.dpr;
  const mw = Math.min(150 * d, w * .3);
  const k = mw / Arena.W;
  const mh = Arena.H * k;
  const x0 = w - mw - 10 * d;
  const y0 = 10 * d;
  ctx.save();
  ctx.globalAlpha = .85;
  ctx.fillStyle = 'rgba(6, 10, 19, .8)';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = 'rgba(76, 201, 255, .5)';
  ctx.lineWidth = 1 * d;
  ctx.strokeRect(x0, y0, mw, mh);
  ctx.fillStyle = 'rgba(76, 201, 255, .35)';
  for (const r of Arena.WALLS) ctx.fillRect(x0 + r.x * k, y0 + r.y * k, Math.max(1, r.w * k), Math.max(1, r.h * k));
  if (ls.crystal) { ctx.fillStyle = '#ffc94a'; ctx.fillRect(x0 + ls.crystal.x * k - 3 * d, y0 + ls.crystal.y * k - 3 * d, 6 * d, 6 * d); }
  if (teams) {
    for (const o of ls.others.values()) {
      if (o.team !== ls.state.team || o.flags & 1) continue;
      ctx.fillStyle = SlagDraw.TEAM[o.team];
      ctx.beginPath(); ctx.arc(x0 + o.x * k, y0 + o.y * k, 2.5 * d, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (ls.me) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x0 + ls.me.x * k, y0 + ls.me.y * k, 3.5 * d, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 * d;
    ctx.beginPath(); ctx.moveTo(x0 + ls.me.x * k, y0 + ls.me.y * k); ctx.lineTo(x0 + ls.me.x * k + Math.cos(ls.me.a) * 10 * d, y0 + ls.me.y * k + Math.sin(ls.me.a) * 10 * d); ctx.stroke();
  }
  ctx.restore();
}

function lsHud() {
  const info = ls.info;
  if (!info || !ls.state) return;
  $('ls-hearts').innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < info.hp ? 'on' : ''}"></i>`).join('') + (info.armor ? `<em>+${info.armor}🛡️</em>` : '');
  $('ls-ammo').textContent = info.ammo;
  $('ls-ammo-box').classList.toggle('low', info.ammo <= 3);
  if (info.ammo > 0) $('ls-ammo-box').classList.remove('empty');
  const left = k => (info.power && info.power[k] ? Math.max(0, Math.ceil((info.power[k] - (Date.now() - info.at)) / 1000)) : 0);
  const powers = [];
  if (left('drie')) powers.push(`🔱 ${left('drie')}s`);
  if (left('snel')) powers.push(`⚡⚡ ${left('snel')}s`);
  $('ls-powers').textContent = powers.join(' ');
  $('ls-score').innerHTML = ls.state.mode === 'teams'
    ? `<span class="r">${ls.score.rood}</span><span class="dash">–</span><span class="b">${ls.score.blauw}</span>`
    : `⚔️ ${info.kills} · ${info.points} p`;
  $('ls-game').dataset.team = ls.state.team || '';
}

let lsLast = performance.now();
let lsHudAt = 0;
function lsFrame(now) {
  requestAnimationFrame(lsFrame);
  const dt = Math.min(.1, (now - lsLast) / 1000);
  lsLast = now;
  if (!ls.me || !ls.state || ls.state.phase !== 'play' || $('ls-game').classList.contains('hidden')) return;
  if (!lsView.w) lsResize();
  const t = (lsNow() - ls.state.startedAt) / 1000;
  lsMove(dt);
  if (ls.firing) lsFire(now);
  if (ls3d()) ls3dRender(t, dt); else lsRender(t, dt);
  if (now - lsHudAt > 200) {
    lsHudAt = now;
    lsHud();
    const leftMs = Math.max(0, ls.state.endsAt - lsNow());
    $('ls-clock').textContent = `${Math.floor(leftMs / 60000)}:${String(Math.floor(leftMs / 1000) % 60).padStart(2, '0')}`;
    const cd = $('ls-countdown');
    cd.classList.toggle('hidden', t >= 0);
    if (t < 0) cd.textContent = Math.ceil(-t);
    if (ls.info && !ls.info.alive && ls.outUntil) {
      const wait = Math.max(0, Math.ceil((ls.outUntil - lsNow()) / 1000));
      $('ls-out-timer').textContent = wait ? `Terug in je kamp over ${wait}` : 'Klaar!';
    }
  }
}
requestAnimationFrame(lsFrame);
