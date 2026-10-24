// Strijdrossen op de gsm of Chromebook: met je hoverros door de arena, vuren en wapens verdienen met vragen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, SrWorld, SrDraw en Sr3D.
const sr = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  me: null,           // eigen stand van de server: levens, wapens, punten
  car: { x: 0, y: 0, z: 0, vz: 0, a: 0, v: 0, boost: 0 },
  spawn: -1,
  others: new Map(),  // n -> ros van een andere leerling
  lasers: new Map(),
  rockets: [],
  mines: [],
  score: { rood: 0, blauw: 0 },
  keys: {},
  stick: null,        // duimjoystick op de gsm: { id, x, y, dx, dy }
  touch: false,       // op een gsm geeft het ros vanzelf gas
  firing: false,
  lastFire: 0,
  lastSend: 0,
  question: null,
  camA: 0,
  hurt: 0,
  bump: 0,
  view: store('lancelot-sr-view') === 'boven' ? 'boven' : 'achter',
};

const srNow = () => Date.now() + sr.offset;
const SR_VIEWS = {
  achter: { icon: '🎥', name: 'Achter je ros', keys: 'pijltjes of ZQSD rijden · spatie laser · F raket · X mijn · E vraag · V zicht' },
  boven: { icon: '🗺️', name: 'Van bovenaf', keys: 'pijltjes of ZQSD rijden · spatie laser · F raket · X mijn · E vraag · V zicht' },
};

function srShow(name) {
  for (const s of ['sr-join', 'sr-lobby', 'sr-game', 'sr-end']) $(s).classList.toggle('hidden', s !== name);
}

function srSetView(view) {
  if (!SR_VIEWS[view]) return;
  sr.view = view;
  store('lancelot-sr-view', view);
  $('sr-view-btn').textContent = SR_VIEWS[view].icon;
  $('sr-view-btn').title = `Zicht: ${SR_VIEWS[view].name} (V)`;
  $('sr-keys').textContent = SR_VIEWS[view].keys;
}
srSetView(sr.view);

function srJoin(name) {
  socket.emit('sr-join', { playerId, name }, res => {
    if (res.error) {
      sr.joined = false;
      $('sr-join-error').textContent = res.error;
      srShow('sr-join');
      return;
    }
    sr.joined = true;
    store('lancelot-name', res.name);
    $('sr-join-error').textContent = '';
  });
}

$('sr-join').addEventListener('submit', e => {
  e.preventDefault();
  srJoin($('sr-name').value);
});

socket.on('sr-state', s => {
  sr.state = s;
  sr.offset = s.now - Date.now();
  document.body.dataset.sr = s.active ? '1' : '';
  if (!s.active) {
    sr.joined = false;
    return;
  }
  if (sr.run !== s.run) {
    sr.run = s.run;
    sr.joined = false;
    sr.me = null;
    sr.spawn = -1;
    sr.others.clear();
    sr.lasers.clear();
    srCloseQuestion();
    delete $('sr-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!sr.joined && saved && sr.autoRun !== s.run) {
      sr.autoRun = s.run;
      srJoin(saved);
    } else if (!sr.joined) {
      $('sr-name').value = saved || '';
      srShow('sr-join');
    }
    return;
  }
  sr.joined = true;
  const team = s.mode === 'teams' ? s.team : '';
  $('sr-game').dataset.team = team || '';
  if (s.phase === 'lobby') {
    $('sr-lobby-name').textContent = s.name;
    $('sr-lobby-team').classList.toggle('hidden', !team);
    $('sr-lobby-team').dataset.team = team || '';
    $('sr-lobby-team').textContent = team ? `Team ${team === 'rood' ? 'Rood' : 'Blauw'}` : '';
    srShow('sr-lobby');
  } else if (s.phase === 'play') {
    srShow('sr-game');
    srResize();
    srScore(s.score);
  } else if (s.phase === 'einde') {
    srCloseQuestion();
    $('sr-out').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    let title = s.rank === 1 ? 'Jij bent de beste strijdros!' : `Plek ${s.rank} van ${s.players}`;
    if (s.mode === 'teams' && s.winner) title = s.winner === 'gelijk' ? 'Gelijkspel!' : s.winner === s.team ? 'Jouw team wint!' : 'Het andere team wint';
    $('sr-end-medal').textContent = medals[s.rank - 1] || '🐎';
    $('sr-end-title').textContent = title;
    $('sr-end-score').textContent = `${s.points || 0} punten`;
    $('sr-end-stats').textContent = `${s.kills || 0} uitgeschakeld · ${s.right || 0} ${s.right === 1 ? 'vraag' : 'vragen'} juist · plek ${s.rank} van ${s.players}`;
    if (!$('sr-end').dataset.done && s.rank && s.rank <= 3) confetti(4000);
    $('sr-end').dataset.done = '1';
    srShow('sr-end');
  }
});

socket.on('sr-kicked', () => {
  sr.joined = false;
  store('lancelot-name', null);
  $('sr-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  srShow('sr-join');
});

socket.on('connect', () => {
  if (sr.joined) srJoin(store('lancelot-name') || '');
});

// De eigen stand van de server. Een nieuwe spawn betekent: je staat ergens anders (start, terug na uitgeschakeld).
socket.on('sr-me', me => {
  const old = sr.me;
  sr.me = me;
  sr.offset = me.now - Date.now();
  if (me.spawn !== sr.spawn) {
    sr.spawn = me.spawn;
    Object.assign(sr.car, { x: me.x, y: me.y, z: 0, vz: 0, a: me.a, v: 0, boost: 0 });
    sr.camA = me.a;
  }
  if (old && me.alive && me.hp < old.hp) {
    sr.hurt = 1;
    buzz(120);
    sfx.hit();
  }
  if (me.alive) $('sr-out').classList.add('hidden');
  sr.outEnd = me.alive ? 0 : performance.now() + me.respawn;
  sr.safeEnd = performance.now() + me.safe;
  srHud();
});

function srHud() {
  const me = sr.me;
  if (!me) return;
  $('sr-hearts').innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < me.hp ? 'on' : ''}"></i>`).join('');
  const a = me.ammo;
  $('sr-ammo').innerHTML = `<span class="${a.laser ? '' : 'empty'}">⚡<b>${a.laser}</b></span><span class="${a.raket ? '' : 'empty'}">🚀<b>${a.raket}</b></span><span class="${a.mijn ? '' : 'empty'}">💣<b>${a.mijn}</b></span>`;
  $('sr-points').textContent = `${me.points} p · ⚔️ ${me.kills}`;
  $('sr-laser').classList.toggle('empty', !a.laser);
  $('sr-raket').classList.toggle('ready', a.raket > 0);
  $('sr-mijn').classList.toggle('ready', a.mijn > 0);
  $('sr-raket').disabled = !a.raket;
  $('sr-mijn').disabled = !a.mijn;
  $('sr-ask').classList.toggle('call', !a.laser && !a.raket && !a.mijn);
}

function srScore(score) {
  if (!sr.state || sr.state.mode !== 'teams') { $('sr-score').innerHTML = ''; return; }
  $('sr-score').innerHTML = `<span class="r">${score.rood}</span><span class="dash">–</span><span class="b">${score.blauw}</span>`;
}

// ---------- De wereld van de server ----------

socket.on('sr-world', data => {
  if (!sr.state || sr.state.phase !== 'play') return;
  const seen = new Set();
  for (const [n, name, x, y, a, v, team, color, hp, flags, kills, streak, z] of data.players) {
    if (sr.me && n === sr.me.n) continue;
    seen.add(n);
    const o = sr.others.get(n);
    if (o) {
      if (Math.hypot(o.tx - x, o.ty - y) > 260 || (o.flags & 1 && !(flags & 1))) { o.x = x; o.y = y; o.a = a; }
      Object.assign(o, { tx: x, ty: y, ta: a, tz: z || 0, v, name, team, color, hp, flags, kills, streak, at: performance.now() });
    } else {
      sr.others.set(n, { n, x, y, a, z: z || 0, tx: x, ty: y, ta: a, tz: z || 0, v, name, team, color, hp, flags, kills, streak, at: performance.now() });
    }
  }
  for (const n of sr.others.keys()) if (!seen.has(n)) sr.others.delete(n);
  sr.rockets = data.rockets.map(([id, x, y, a, n]) => ({ id, x, y, a, n }));
  sr.mines = data.mines.map(([id, x, y, n, armed]) => ({ id, x, y, n, armed }));
  if (data.score) srScore(data.score);
  if (data.feed) srFeed(data.feed);
});

const srColorOf = n => {
  if (sr.me && n === sr.me.n) return SrDraw.colorOf(sr.state.mode === 'teams' ? sr.state.team : null, sr.state.color);
  const o = sr.others.get(n);
  return o ? SrDraw.colorOf(o.team, o.color) : '#fff';
};

socket.on('sr-shot', s => {
  if (!sr.state || sr.state.phase !== 'play') return;
  SrDraw.addLaser(sr.lasers, s, SrDraw.colorOf(s.team, s.color));
  if (!sr.me || s.n !== sr.me.n) {
    const d = Math.hypot(s.x - sr.car.x, s.y - sr.car.y);
    if (d < 900) sfx.laser();
  }
});
socket.on('sr-pop', ids => { for (const id of ids) sr.lasers.delete(id); });
socket.on('sr-hit', h => {
  const color = h.blocked ? '#4cc9ff' : '#ffe08a';
  SrDraw.burst(h.x, h.y, color, h.blocked ? 6 : 12);
  Sr3D.spark(h.x, h.y, color);
  if (sr.me && h.n === sr.me.n && h.blocked) srToast('Je schild houdt het tegen!', '');
});
socket.on('sr-boom', b => {
  SrDraw.boom(b.x, b.y, b.r);
  Sr3D.boom(b.x, b.y, b.r * 1.6);
  const d = Math.hypot(b.x - sr.car.x, b.y - sr.car.y);
  if (d < 1200) sfx.boom();
});
socket.on('sr-ko', k => {
  const color = srColorOf(k.victim);
  SrDraw.burst(k.x, k.y, color, 26, 420);
  SrDraw.ring(k.x, k.y, color, 120);
  Sr3D.boom(k.x, k.y, 160);
});
socket.on('sr-slag', s => {
  sfx.power();
  buzz([40, 30, 60]);
  srBanner(s.callout || 'RAAK!', `${s.victim} is uitgeschakeld · +${s.points}${s.wanted ? ' 🎯' : ''}`, s.callout ? 'big' : 'gold');
});
socket.on('sr-out', o => {
  sr.firing = false;
  sr.car.v = 0;
  const how = { laser: 'met een laser', raket: 'met een raket', mijn: 'met een mijn' }[o.kind] || '';
  $('sr-out-by').textContent = o.by ? `${o.by} raakte je ${how}` : 'Je bent uitgeschakeld';
  $('sr-out').classList.remove('hidden');
  sr.outEnd = performance.now() + o.respawn;
  sfx.boom();
  buzz(300);
});

function srFeed(feed) {
  const box = $('sr-feed');
  const fresh = feed[0];
  if (!fresh || box.dataset.last === String(fresh.at)) return;
  box.dataset.last = String(fresh.at);
  const line = document.createElement('div');
  line.className = 'ls-feed-line';
  if (sr.state && sr.state.name && fresh.text.includes(sr.state.name)) line.classList.add('me');
  line.textContent = fresh.text;
  box.prepend(line);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => line.remove(), 5000);
}

let srToastTimer = null;
function srToast(text, kind = '') {
  const el = $('sr-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(srToastTimer);
  srToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

let srBannerTimer = null;
function srBanner(title, sub, kind = '') {
  const el = $('sr-banner');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = sub || '';
  el.append(strong, span);
  el.className = `ls-banner show ${kind}`;
  clearTimeout(srBannerTimer);
  srBannerTimer = setTimeout(() => el.classList.remove('show'), 1700);
}

// ---------- Besturing ----------

function srPlaying() {
  return sr.state && sr.state.phase === 'play' && sr.me && sr.me.alive && !sr.question && srNow() >= sr.state.startedAt;
}

function srEnemies() {
  const teams = sr.state.mode === 'teams';
  return [...sr.others.values()].filter(o => !(o.flags & 1) && !(o.flags & 6) && (!teams || o.team !== sr.state.team));
}

function srFire(kind) {
  if (!sr.me) return;
  if (!srPlaying()) return;
  const spec = { laser: SrWorld.LASER, raket: SrWorld.RAKET, mijn: SrWorld.MIJN }[kind];
  const t = performance.now();
  sr.lastShot = sr.lastShot || {};
  if (t - (sr.lastShot[kind] || 0) < spec.every) return;
  if (sr.me.ammo[kind] <= 0) {
    if (t - (sr.lastEmpty || 0) > 900) {
      sr.lastEmpty = t;
      sfx.empty();
      srToast(kind === 'laser' ? 'Geen lasers! Druk op ⚡ Vraag (E)' : kind === 'raket' ? 'Raket: 2 vragen op rij juist' : 'Mijn: 3 vragen op rij juist', 'bad');
    }
    return;
  }
  sr.lastShot[kind] = t;
  const aim = kind === 'laser' ? Sr3D.assist(sr.car, sr.car.a, srEnemies()) : null;
  if (kind === 'laser') sfx.laser();
  else sfx.whoosh();
  socket.emit('sr-fire', { kind, a: aim === null ? sr.car.a : aim }, res => {
    if (res && res.ammo && sr.me) {
      sr.me.ammo = res.ammo;
      srHud();
    }
  });
  sr.me.ammo[kind]--;
  srHud();
}

const SR_DRIVE = { ArrowUp: 'up', w: 'up', z: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', q: 'left', ArrowRight: 'right', d: 'right' };
document.addEventListener('keydown', e => {
  if (document.body.dataset.sr !== '1' || e.target.tagName === 'INPUT') return;
  if (sr.question) {
    if (sr.question.answers && !sr.question.done && /^[1-4]$/.test(e.key)) srAnswer(Number(e.key) - 1);
    if (e.key === 'Escape' || (e.key === 'Enter' && sr.question.done)) srCloseQuestion();
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (SR_DRIVE[key]) {
    e.preventDefault();
    sr.keys[SR_DRIVE[key]] = true;
    sr.touch = false;
  }
  if (e.key === ' ') { e.preventDefault(); sr.firing = true; srFire('laser'); }
  if (key === 'f' && !e.repeat) srFire('raket');
  if ((key === 'x' || key === 'c') && !e.repeat) srFire('mijn');
  if ((key === 'e' || e.key === 'Enter') && !e.repeat) srOpenQuestion();
  if (key === 'v' && !e.repeat) srSetView(sr.view === 'achter' ? 'boven' : 'achter');
});
document.addEventListener('keyup', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (SR_DRIVE[key]) sr.keys[SR_DRIVE[key]] = false;
  if (e.key === ' ') sr.firing = false;
});
window.addEventListener('blur', () => { sr.keys = {}; sr.firing = false; });

function srHold(btn, on, off) {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    sfx.unlock();
    sr.touch = true;
    btn.classList.add('down');
    try { btn.setPointerCapture(e.pointerId); } catch {}
    on();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    btn.addEventListener(ev, () => { btn.classList.remove('down'); off(); });
  }
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
// De duimjoystick: zet je duim ergens op de linkerhelft en schuif. Links en rechts sturen, naar beneden remmen.
const SR_STICK = 60;
const srStage = $('sr-stage');
srStage.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || e.target.closest('button') || sr.stick) return;
  const r = srStage.getBoundingClientRect();
  if (e.clientX - r.left > r.width * .55) return;
  e.preventDefault();
  sfx.unlock();
  sr.touch = true;
  sr.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  try { srStage.setPointerCapture(e.pointerId); } catch {}
  srStickPaint();
});
srStage.addEventListener('pointermove', e => {
  const st = sr.stick;
  if (!st || st.id !== e.pointerId) return;
  let dx = e.clientX - st.x, dy = e.clientY - st.y;
  const d = Math.hypot(dx, dy);
  // Ver doorschuiven? Dan schuift de joystick mee, zo blijft hij onder je duim.
  if (d > SR_STICK * 1.4) {
    st.x += (dx / d) * (d - SR_STICK * 1.4);
    st.y += (dy / d) * (d - SR_STICK * 1.4);
    dx = e.clientX - st.x;
    dy = e.clientY - st.y;
  }
  st.dx = dx;
  st.dy = dy;
  srStickPaint();
});
for (const ev of ['pointerup', 'pointercancel']) {
  srStage.addEventListener(ev, e => {
    if (!sr.stick || sr.stick.id !== e.pointerId) return;
    sr.stick = null;
    srStickPaint();
  });
}
function srStickPaint() {
  const el = $('sr-stick');
  const st = sr.stick;
  el.classList.toggle('on', Boolean(st));
  $('sr-stick-hint').classList.toggle('hidden', Boolean(st));
  if (!st) return;
  const r = srStage.getBoundingClientRect();
  el.style.left = `${st.x - r.left}px`;
  el.style.top = `${st.y - r.top}px`;
  const d = Math.hypot(st.dx, st.dy);
  const k = d > SR_STICK ? SR_STICK / d : 1;
  el.firstElementChild.style.transform = `translate(${st.dx * k}px, ${st.dy * k}px)`;
}
srHold($('sr-laser'), () => { sr.firing = true; srFire('laser'); }, () => { sr.firing = false; });
for (const kind of ['raket', 'mijn']) srHold($(`sr-${kind}`), () => srFire(kind), () => {});
$('sr-ask').addEventListener('click', e => { e.currentTarget.blur(); srOpenQuestion(); });
$('sr-view-btn').addEventListener('click', e => { e.currentTarget.blur(); srSetView(sr.view === 'achter' ? 'boven' : 'achter'); });
$('sr-out-ask').addEventListener('click', () => srOpenQuestion());
$('sr-q-close').addEventListener('click', () => srCloseQuestion());

// ---------- Vragen voor wapens ----------

function srOpenQuestion() {
  if (sr.question || !sr.state || sr.state.phase !== 'play') return;
  if (srNow() < sr.state.startedAt) return;
  sr.question = { loading: true };
  sr.firing = false;
  sr.keys = {};
  sr.car.v = 0;
  sr.car.boost = 0;
  $('sr-question').classList.remove('hidden');
  $('sr-q-text').textContent = '…';
  $('sr-q-answers').innerHTML = '';
  $('sr-q-result').textContent = '';
  $('sr-q-result').className = 'tw-q-result';
  socket.emit('sr-question', null, res => {
    if (!sr.question) return;
    if (res && res.wait) {
      // Nog even wachten na een fout antwoord.
      $('sr-q-text').textContent = 'Even nadenken…';
      srWait(res.wait, () => { sr.question = null; srOpenQuestion(); });
      return;
    }
    if (!res || res.error) return srCloseQuestion();
    sr.question = { answers: res.answers };
    const next = res.qstreak % 3 === 2 ? ' + 💣' : res.qstreak % 2 === 1 ? ' + 🚀' : '';
    $('sr-q-status').textContent = `Juist = ⚡ lasers${next} · je bent beschermd`;
    $('sr-q-text').textContent = res.question;
    $('sr-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('sr-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => srAnswer(i));
    });
  });
}

let srWaitTimer = null;
function srWait(ms, then) {
  clearInterval(srWaitTimer);
  const end = performance.now() + ms;
  const result = $('sr-q-result');
  if (!result.querySelector('small')) result.append(document.createElement('small'));
  const tickWait = () => {
    const left = end - performance.now();
    if (!sr.question) return clearInterval(srWaitTimer);
    if (left <= 0) {
      clearInterval(srWaitTimer);
      then();
      return;
    }
    result.querySelector('small').textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
  };
  tickWait();
  srWaitTimer = setInterval(tickWait, 200);
}

function srAnswer(i) {
  if (!sr.question || sr.question.done || !sr.question.answers) return;
  sr.question.done = true;
  socket.emit('sr-answer', i, res => {
    if (!res || res.error) return srCloseQuestion();
    const tiles = [...$('sr-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('sr-q-result');
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) {
      const g = res.gained;
      const parts = [g.laser ? `+${g.laser} ⚡` : '', g.raket ? '+1 🚀' : '', g.mijn ? '+1 💣' : ''].filter(Boolean);
      result.textContent = `Juist! ${parts.join(' ') || 'Je wapens zitten vol'}`;
      sfx.good();
      buzz([30, 40, 30]);
      if (sr.me) { sr.me.ammo = res.ammo; srHud(); }
      // Lasers vol? Dan terug de arena in. Anders meteen de volgende vraag; sluiten kan altijd.
      setTimeout(() => {
        if (!sr.question || !sr.question.done) return;
        if (res.ammo.laser >= res.max.laser) {
          srCloseQuestion();
          srToast('Lasers vol! Ga ervoor!', 'gold');
        } else {
          sr.question = null;
          srOpenQuestion();
        }
      }, 900);
    } else {
      // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
      result.textContent = 'Helaas! Kijk naar het juiste antwoord.';
      result.append(document.createElement('br'), document.createElement('small'));
      sfx.bad();
      buzz(200);
      srWait(res.wait || 3000, () => {
        if (!sr.question) return;
        sr.question = null;
        srOpenQuestion();
      });
    }
  });
}

function srCloseQuestion() {
  clearInterval(srWaitTimer);
  if (sr.question) socket.emit('sr-asking', false);
  sr.question = null;
  $('sr-question').classList.add('hidden');
}

// ---------- Rijden en tekenen ----------

const srCanvas = $('sr-canvas');
const srCtx = srCanvas.getContext('2d');
let srView = { w: 0, h: 0, dpr: 1 };

function srResize() {
  const stage = $('sr-stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  srCanvas.width = Math.round(w * dpr);
  srCanvas.height = Math.round(h * dpr);
  srCanvas.style.width = `${w}px`;
  srCanvas.style.height = `${h}px`;
  srView = { w: srCanvas.width, h: srCanvas.height, dpr };
}
window.addEventListener('resize', srResize);

function srInput() {
  let turn = (sr.keys.right ? 1 : 0) - (sr.keys.left ? 1 : 0);
  let gas = (sr.keys.up ? 1 : 0) - (sr.keys.down ? 1 : 0);
  if (sr.touch) {
    // Op de gsm geeft het ros vanzelf gas. De joystick stuurt zacht in het midden en scherp aan de rand.
    gas = 1;
    const st = sr.stick;
    if (st) {
      const x = Math.max(-1, Math.min(1, st.dx / SR_STICK));
      turn = Math.abs(x) < .12 ? 0 : Math.sign(x) * ((Math.abs(x) - .12) / .88) ** 1.3;
      if (st.dy > SR_STICK * .75 && Math.abs(st.dy) > Math.abs(st.dx)) gas = -1;
    }
  }
  return { gas, turn };
}

let srLast = performance.now();
function srFrame(t) {
  requestAnimationFrame(srFrame);
  const dt = Math.min(.05, (t - srLast) / 1000);
  srLast = t;
  if (document.body.dataset.sr !== '1' || !sr.state || sr.state.phase !== 'play') return;
  const now = srNow();
  const left = Math.max(0, sr.state.endsAt - now);
  $('sr-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  const wait = sr.state.startedAt - now;
  $('sr-countdown').classList.toggle('hidden', !(wait > 0));
  if (wait > 0) $('sr-countdown').textContent = Math.ceil(wait / 1000);
  if (sr.outEnd) $('sr-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil((sr.outEnd - t) / 1000))}…`;
  const input = srInput();
  if (srPlaying()) {
    const what = SrWorld.drive(sr.car, input, dt);
    if (what.bump && t - sr.bump > 400) {
      sr.bump = t;
      buzz(40);
    }
    if (what.jump) sfx.jump();
    if (what.land) buzz(30);
    if (sr.firing) srFire('laser');
    if (t - sr.lastSend > 50) {
      sr.lastSend = t;
      const c = sr.car;
      socket.emit('sr-move', { x: Math.round(c.x), y: Math.round(c.y), z: Math.round(c.z), a: +c.a.toFixed(3), v: Math.round(c.v), s: sr.spawn });
    }
  }
  for (const o of sr.others.values()) {
    // Een beetje vooruit rekenen met de snelheid, dan bijsturen: zo rijden de anderen vloeiend.
    const ahead = Math.min(.12, (t - o.at) / 1000);
    const tx = o.tx + Math.cos(o.ta) * o.v * ahead;
    const ty = o.ty + Math.sin(o.ta) * o.v * ahead;
    o.x += (tx - o.x) * Math.min(1, dt * 12);
    o.y += (ty - o.y) * Math.min(1, dt * 12);
    let da = o.ta - o.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    o.a += da * Math.min(1, dt * 12);
    o.z = (o.z || 0) + ((o.tz || 0) - (o.z || 0)) * Math.min(1, dt * 14);
  }
  if ($('sr-game').classList.contains('hidden')) return;
  if (!srView.w) srResize();
  if (!srView.w) return;
  const { w, h, dpr } = srView;
  const myColor = SrDraw.colorOf(sr.state.mode === 'teams' ? sr.state.team : null, sr.state.color);
  const protectedNow = Boolean(sr.question) || t < (sr.safeEnd || 0);
  if (sr.view === 'achter') {
    // De camera draait iets trager mee dan het ros: zo voel je de bochten.
    let da = sr.car.a - sr.camA;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    sr.camA += da * Math.min(1, dt * 7);
    const others = [...sr.others.values()].filter(o => !(o.flags & 1)).map(o => ({
      ...o, color: SrDraw.colorOf(o.team, o.color), av: typeof Avatar !== 'undefined' ? Avatar.byName(o.name) : null,
    }));
    const alive = !sr.me || sr.me.alive;
    const view = Sr3D.render(srCtx, w, h, {
      me: sr.car, a: sr.camA, teams: sr.state.mode === 'teams', t: t / 1000, dt, boost: sr.car.boost > 0,
      self: alive ? { color: myColor, av: typeof Avatar !== 'undefined' ? Avatar.mine() : null, boost: sr.car.boost > 0, bubble: protectedNow, asking: !!sr.question, tilt: input.turn } : null,
      others,
      lasers: [...sr.lasers.values()],
      rockets: sr.rockets.map(r => ({ ...r, color: srColorOf(r.n) })),
      mines: sr.mines.map(m => ({ ...m, color: srColorOf(m.n) })),
    });
    SrDraw.moveLasers(sr.lasers, dt);
    if (alive && !sr.question) {
      const aim = Sr3D.assist(sr.car, sr.car.a, srEnemies());
      const a = aim === null ? sr.car.a : aim;
      const at = view.place(sr.car.x + Math.cos(a) * 520, sr.car.y + Math.sin(a) * 520, 34);
      Sr3D.crosshair(srCtx, at, aim !== null, dpr);
    }
    const mw = Math.min(w * .26, 190 * dpr);
    SrDraw.minimap(srCtx, w - mw - 10 * dpr, 10 * dpr, mw, { players: srMapPlayers(), me: sr.me ? sr.me.n : -1 });
  } else {
    const scale = Math.min(w, h) / 1100;
    const cam = { scale, x: sr.car.x - w / 2 / scale, y: sr.car.y - h / 2 / scale };
    SrDraw.scene(srCtx, cam, w, h, {
      players: srMapPlayers(), lasers: sr.lasers, rockets: sr.rockets, mines: sr.mines, teams: sr.state.mode === 'teams', me: sr.me ? sr.me.n : -1, t: t / 1000, top: -1,
    }, dt);
  }
  sr.hurt = Math.max(0, sr.hurt - dt * 2.5);
  $('sr-hurt').style.opacity = sr.hurt.toFixed(2);
}
requestAnimationFrame(srFrame);

// Alle rossen voor het kaartje en het zicht van bovenaf, met je eigen ros op de plek waar jij hem ziet.
function srMapPlayers() {
  const map = new Map(sr.others);
  if (sr.me && sr.state) {
    map.set(sr.me.n, {
      n: sr.me.n, name: sr.state.name, x: sr.car.x, y: sr.car.y, a: sr.car.a, v: sr.car.boost > 0 ? SrWorld.CAR.boostMax : sr.car.v,
      team: sr.state.mode === 'teams' ? sr.state.team : null, color: sr.state.color, hp: sr.me.hp,
      flags: (sr.me.alive ? 0 : 1) | (performance.now() < (sr.safeEnd || 0) ? 2 : 0) | (sr.question ? 4 : 0),
    });
  }
  return map;
}
