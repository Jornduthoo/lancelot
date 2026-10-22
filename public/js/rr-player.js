// Ridderrace op de gsm of Chromebook: sturen, turbo, en tanken in de pitstop met quizvragen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, Track en RaceDraw.
const rr = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  me: null,            // eigen ros: { dist, x, speed }
  spawn: -1,
  fuel: 100,
  turbos: 0,
  turboUntil: 0,
  boostUntil: 0,
  others: new Map(),
  taken: new Map(),    // ronde -> kristallen die al gepakt zijn
  keys: {},
  touch: { left: false, right: false },
  question: null,
  tilt: 0,
  bump: 0,
  rank: 0,
  count: 0,
  empty: false,
  lastLap: 0,
};

const rrNow = () => Date.now() + rr.offset;

function rrShow(name) {
  for (const s of ['rr-join', 'rr-lobby', 'rr-game', 'rr-end']) $(s).classList.toggle('hidden', s !== name);
  if (name !== 'rr-game') sfx.engine(0);
}

function rrJoin(name) {
  socket.emit('rr-join', { playerId, name }, res => {
    if (res.error) {
      rr.joined = false;
      $('rr-join-error').textContent = res.error;
      rrShow('rr-join');
      return;
    }
    rr.joined = true;
    store('lancelot-name', res.name);
    $('rr-join-error').textContent = '';
  });
}

$('rr-join').addEventListener('submit', e => {
  e.preventDefault();
  rrJoin($('rr-name').value);
});

socket.on('rr-state', s => {
  rr.state = s;
  rr.offset = s.now - Date.now();
  document.body.dataset.rr = s.active ? '1' : '';
  if (!s.active) {
    rr.joined = false;
    rr.me = null;
    sfx.engine(0);
    return;
  }
  if (rr.run !== s.run) {
    rr.run = s.run;
    rr.me = null;
    rr.spawn = -1;
    rr.others.clear();
    rr.taken.clear();
    rr.joined = false;
    rr.lights = 0;
    delete $('rr-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!rr.joined && saved && rr.autoRun !== s.run) {
      rr.autoRun = s.run;
      rrJoin(saved);
    } else if (!rr.joined) {
      $('rr-name').value = saved || '';
      rrShow('rr-join');
    }
    return;
  }
  rr.joined = true;
  if (s.phase === 'lobby') {
    $('rr-lobby-name').textContent = s.name;
    rrShow('rr-lobby');
  } else if (s.phase === 'play') {
    rrShow('rr-game');
    rrResize();
  } else if (s.phase === 'einde') {
    rrCloseQuestion();
    const medals = ['🥇', '🥈', '🥉'];
    $('rr-end-medal').textContent = medals[s.rank - 1] || '🏁';
    $('rr-end-title').textContent = s.rank === 1 ? 'Jij wint de Ridderrace!' : `Plek ${s.rank} van ${s.players}`;
    $('rr-end-score').textContent = `${s.progress.toFixed(1).replace('.', ',')} ronden`;
    const best = s.bestLap ? ` · snelste ronde ${(s.bestLap / 1000).toFixed(1).replace('.', ',')} s` : '';
    $('rr-end-stats').textContent = `${s.right} vragen juist${best} · plek ${s.rank} van ${s.players}`;
    if (!$('rr-end').dataset.done && s.rank <= 3) confetti(4000);
    $('rr-end').dataset.done = '1';
    rrShow('rr-end');
  }
});

socket.on('rr-kicked', () => {
  rr.joined = false;
  store('lancelot-name', null);
  $('rr-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  rrShow('rr-join');
});

socket.on('connect', () => {
  if (rr.joined) rrJoin(store('lancelot-name') || '');
});

// Tank, turbo's en (na een correctie of bij de start) de plek die de server kent.
socket.on('rr-me', m => {
  rr.fuel = m.fuel;
  rr.turbos = m.turbos;
  if (m.turbo) rr.turboUntil = Math.max(rr.turboUntil, Date.now() + m.turbo);
  if (m.spawn !== rr.spawn || !rr.me) {
    rr.spawn = m.spawn;
    rr.me = { dist: m.dist, x: m.x, speed: 0 };
  }
  rr.lapStart = m.lapStart - (m.now - Date.now());
  rrHud();
});

socket.on('rr-world', data => {
  rr.offset = data.now - Date.now();
  const seen = new Set();
  let ahead = 0;
  for (const [id, name, dist, x, speed, color, flags] of data.players) {
    if (id === playerId) continue;
    seen.add(id);
    if (rr.me && dist > rr.me.dist) ahead++;
    const o = rr.others.get(id);
    if (o) {
      if (Math.abs(o.tdist - dist) > 4000) o.dist = dist;
      Object.assign(o, { tdist: dist, tx: x, speed, name, color, flags });
    } else {
      rr.others.set(id, { dist, x, tdist: dist, tx: x, speed, name, color, flags, seed: rr.others.size * 1.7 });
    }
  }
  for (const id of rr.others.keys()) if (!seen.has(id)) rr.others.delete(id);
  const rank = ahead + 1;
  if (rr.rank && rank < rr.rank && rrNow() > rr.state.startedAt + 3000) {
    sfx.marker();
    rrToast(`Je staat nu ${rank}e!`, 'gold');
  }
  rr.rank = rank;
  rr.count = data.players.length;
});

socket.on('rr-lap', l => {
  const secs = (l.ms / 1000).toFixed(1).replace('.', ',');
  if (l.record) {
    rrBanner('SNELSTE RONDE!', `${secs} s`, 'gold');
    sfx.fanfare();
  } else {
    rrBanner(`RONDE ${l.laps + 1}`, `${secs} s${l.personal ? ' · je beste ronde!' : ''}`);
    sfx.go();
  }
  buzz([40, 40, 40]);
});

let rrToastTimer = null;
function rrToast(text, kind = '') {
  const el = $('rr-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(rrToastTimer);
  rrToastTimer = setTimeout(() => { el.className = 'tw-toast'; }, 1800);
}

let rrBannerTimer = null;
function rrBanner(title, sub, kind = '') {
  const el = $('rr-banner');
  el.innerHTML = '<strong></strong><span></span>';
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = sub;
  el.className = `ls-banner show ${kind}`;
  clearTimeout(rrBannerTimer);
  rrBannerTimer = setTimeout(() => { el.className = 'ls-banner'; }, 1800);
}

// ---------- Besturing ----------

const RR_KEYS = { ArrowLeft: 'left', a: 'left', q: 'left', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down' };
document.addEventListener('keydown', e => {
  if (document.body.dataset.rr !== '1' || e.target.tagName === 'INPUT') return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (rr.question) {
    if (rr.question.answers && !rr.question.done && /^[1-4]$/.test(e.key)) rrAnswer(Number(e.key) - 1);
    if (e.key === 'Escape' || (e.key === 'Enter' && rr.question.done)) rrCloseQuestion();
    return;
  }
  if (RR_KEYS[key]) { rr.keys[RR_KEYS[key]] = true; e.preventDefault(); }
  if (e.key === ' ') { rrTurbo(); e.preventDefault(); }
  if (key === 'e' || e.key === 'Enter') rrOpenQuestion();
});
document.addEventListener('keyup', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (RR_KEYS[key]) rr.keys[RR_KEYS[key]] = false;
});

for (const side of ['left', 'right']) {
  const btn = $(`rr-${side}`);
  const on = e => { e.preventDefault(); sfx.unlock(); rr.touch[side] = true; btn.classList.add('down'); };
  const off = () => { rr.touch[side] = false; btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
$('rr-turbo').addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); rrTurbo(); });
$('rr-pit').addEventListener('click', () => { sfx.unlock(); rrOpenQuestion(); });
$('rr-empty').addEventListener('click', () => rrOpenQuestion());
$('rr-canvas').addEventListener('pointerdown', () => sfx.unlock());

function rrTurbo() {
  if (!rr.me || rr.question || rrNow() < rr.state.startedAt) return;
  if (rr.turbos <= 0) {
    rrToast('Geen turbo. Twee juist op rij in de pitstop!', 'bad');
    sfx.empty();
    return;
  }
  socket.emit('rr-turbo', null, res => {
    if (!res || res.error) return;
    rr.turbos = res.turbos;
    rr.turboUntil = Date.now() + res.ms;
    rrBanner('TURBO!', '', 'gold');
    sfx.power();
    buzz(60);
    rrHud();
  });
}

// ---------- Pitstop: tanken met vragen ----------

function rrOpenQuestion() {
  if (rr.question || !rr.state || rr.state.phase !== 'play') return;
  if (rrNow() < rr.state.startedAt) return;
  rr.question = { loading: true };
  rr.keys = {};
  rr.touch = { left: false, right: false };
  $('rr-question').classList.remove('hidden');
  $('rr-q-text').textContent = '…';
  $('rr-q-answers').innerHTML = '';
  $('rr-q-result').textContent = '';
  $('rr-q-result').className = 'tw-q-result';
  $('rr-q-fuel').style.width = `${rr.fuel}%`;
  socket.emit('rr-question', null, res => {
    if (!res || res.error) return rrCloseQuestion();
    rr.question = { answers: res.answers };
    $('rr-q-text').textContent = res.question;
    $('rr-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('rr-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => rrAnswer(i));
    });
  });
}

function rrAnswer(i) {
  if (!rr.question || rr.question.done) return;
  rr.question.done = true;
  socket.emit('rr-answer', i, res => {
    if (!res || res.error) return rrCloseQuestion();
    const tiles = [...$('rr-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    rr.fuel = res.fuel;
    rr.turbos = res.turbos;
    $('rr-q-fuel').style.width = `${rr.fuel}%`;
    const result = $('rr-q-result');
    result.textContent = res.correct
      ? `Juist! ${res.gained ? `+${res.gained}% ⛽` : 'Je tank is vol'}${res.turbo ? ' · 🚀 turbo erbij!' : res.qstreak > 1 ? ` · ${res.qstreak} op rij` : ''}`
      : 'Helaas, geen brandstof.';
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) sfx.good(); else sfx.bad();
    if (res.turbo) setTimeout(() => sfx.power(), 250);
    buzz(res.correct ? [30, 40, 30] : 200);
    rrHud();
    // Meteen de volgende vraag: wie wil, blijft tanken. Terug de baan op kan altijd.
    setTimeout(() => {
      if (!rr.question || !rr.question.done) return;
      rr.question = null;
      rrOpenQuestion();
    }, res.correct ? 900 : 2000);
  });
}

function rrCloseQuestion() {
  if (rr.question) socket.emit('rr-asking', false);
  rr.question = null;
  $('rr-question').classList.add('hidden');
}
$('rr-q-close').addEventListener('click', rrCloseQuestion);

// ---------- Rijden ----------

const rrCanvas = $('rr-canvas');
const rrCtx = rrCanvas.getContext('2d');
const rrMap = $('rr-map');
const rrMapCtx = rrMap.getContext('2d');
let rrView = { w: 0, h: 0 };

function rrResize() {
  const stage = $('rr-stage');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  rrCanvas.width = Math.round(w * dpr);
  rrCanvas.height = Math.round(h * dpr);
  rrCanvas.style.width = `${w}px`;
  rrCanvas.style.height = `${h}px`;
  const m = Math.round(Math.min(150, Math.max(90, Math.min(w, h) * .26)));
  rrMap.width = Math.round(m * dpr);
  rrMap.height = Math.round(m * dpr);
  rrMap.style.width = `${m}px`;
  rrMap.style.height = `${m}px`;
  rrView = { w: rrCanvas.width, h: rrCanvas.height };
}
window.addEventListener('resize', rrResize);

setInterval(() => {
  if (!rr.me || !rr.state || rr.state.phase !== 'play') return;
  socket.emit('rr-move', { d: Math.round(rr.me.dist), x: +rr.me.x.toFixed(3), v: Math.round(rr.me.speed), s: rr.spawn });
}, 100);

function rrDrive(dt) {
  const T = Track;
  const me = rr.me;
  const now = Date.now();
  const started = rrNow() >= rr.state.startedAt;
  const turbo = now < rr.turboUntil;
  const boost = now < rr.boostUntil;
  let top = rr.fuel > 0 ? T.MAX_SPEED : T.MAX_SPEED * T.CRAWL;
  if (turbo) top = T.TURBO_SPEED;
  else if (boost) top = rr.fuel > 0 ? T.TURBO_SPEED : T.TURBO_SPEED * T.CRAWL * 1.2;
  if (!started || rr.question) {
    me.speed = Math.max(0, me.speed - T.MAX_SPEED * 1.6 * dt);
  } else if (rr.keys.down) {
    me.speed = Math.max(0, me.speed - T.MAX_SPEED * 1.3 * dt);
  } else if (me.speed < top) {
    me.speed = Math.min(top, me.speed + T.MAX_SPEED * (turbo || boost ? 1.2 : .32) * dt);
  } else {
    me.speed = Math.max(top, me.speed - T.MAX_SPEED * .8 * dt);
  }
  const seg = T.segmentAt(me.dist);
  const pct = me.speed / T.MAX_SPEED;
  const dir = (rr.keys.left || rr.touch.left ? -1 : 0) + (rr.keys.right || rr.touch.right ? 1 : 0);
  if (started && !rr.question) me.x += dir * dt * 2.1 * Math.min(1, pct + .25);
  me.x -= dt * 2 * pct * pct * seg.curve * .3;
  me.x = Math.max(-2.4, Math.min(2.4, me.x));
  rr.tilt += (dir - rr.tilt) * Math.min(1, dt * 8);
  // Naast de weg: trager en hobbelig.
  rr.bump = 0;
  if (Math.abs(me.x) > 1.05 && me.speed > 0) {
    if (me.speed > T.MAX_SPEED * .3) me.speed -= T.MAX_SPEED * 1.3 * dt;
    rr.bump = (Math.random() - .5) * 60 * Math.min(1, pct * 2);
  }
  // Botsen tegen een ros vlak voor je.
  for (const o of rr.others.values()) {
    const gap = Track.wrap(o.dist - me.dist);
    if (gap < 330 && Math.abs(o.x - me.x) < .3 && me.speed > o.speed) {
      me.speed = o.speed * .85;
      me.dist = o.dist - 340;
      if (!rr.bumpedAt || now - rr.bumpedAt > 600) { rr.bumpedAt = now; sfx.hit(); buzz(40); }
    }
  }
  const before = me.dist;
  me.dist += me.speed * dt;
  if (!turbo) rr.fuel = Math.max(0, rr.fuel - (me.dist - before) * T.FUEL_RATE);
  const lap = Math.floor(me.dist / T.LENGTH);
  // Boostpads en kristallen op de segmenten waar we net over reden.
  for (let z = before; z <= me.dist; z += T.SEG) {
    const s = T.segmentAt(z);
    if (s.boost && Math.abs(me.x - s.boost.x) < .28 && now >= rr.boostUntil) {
      rr.boostUntil = now + T.BOOST_MS;
      sfx.whoosh();
    }
    if (s.crystal && Math.abs(me.x - s.crystal.x) < .3) {
      if (!rr.taken.has(lap)) rr.taken.set(lap, new Set());
      const set = rr.taken.get(lap);
      if (!set.has(s.i)) {
        set.add(s.i);
        sfx.marker();
        socket.emit('rr-crystal', s.i, res => { if (res && res.fuel !== undefined) { rr.fuel = res.fuel; rrToast('+⛽ kristal', 'gold'); } });
      }
    }
  }
  const empty = rr.fuel <= 0 && started;
  if (empty && !rr.empty) { sfx.empty(); buzz([100, 60, 100]); }
  rr.empty = empty;
}

function rrHud() {
  if (!rr.state) return;
  const T = Track;
  $('rr-pos').innerHTML = rr.rank ? `${rr.rank}<sup>e</sup><small>/${rr.count}</small>` : '';
  const lap = rr.me ? Math.max(0, Math.floor(rr.me.dist / T.LENGTH)) + 1 : 1;
  $('rr-lap').textContent = `Ronde ${lap}`;
  $('rr-fuel').style.width = `${rr.fuel}%`;
  $('rr-fuel-box').classList.toggle('low', rr.fuel < 20);
  $('rr-turbos').textContent = rr.turbos ? `🚀×${rr.turbos}` : '🚀×0';
  $('rr-turbos').classList.toggle('none', !rr.turbos);
  $('rr-speed').innerHTML = `${rr.me ? Math.round((rr.me.speed / T.MAX_SPEED) * 220) : 0}<small> km/u</small>`;
  $('rr-empty').classList.toggle('hidden', !rr.empty || !!rr.question);
}

// Startlichten: drie rode lampen, dan groen.
function rrLights() {
  const wait = rr.state.startedAt - rrNow();
  const el = $('rr-lights');
  if (wait > 3000 || wait < -1200) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  const on = wait > 0 ? Math.min(3, 3 - Math.floor(wait / 1000)) : 3;
  el.classList.toggle('go', wait <= 0);
  [...el.children].forEach((l, i) => l.classList.toggle('on', i < on));
  const step = wait > 0 ? on : 4;
  if (step !== rr.lights) {
    rr.lights = step;
    if (step === 4) { sfx.go(); buzz(120); } else sfx.tick(true);
  }
}

let rrLast = performance.now();
let rrHudAt = 0;
function rrFrame(now) {
  requestAnimationFrame(rrFrame);
  const dt = Math.min(.05, (now - rrLast) / 1000);
  rrLast = now;
  if (!rr.me || !rr.state || rr.state.phase !== 'play' || $('rr-game').classList.contains('hidden')) return;
  if (!rrView.w) rrResize();
  const t = (rrNow() - rr.state.startedAt) / 1000;
  rrDrive(dt);
  for (const o of rr.others.values()) {
    o.tdist += o.speed * dt;
    o.dist += o.speed * dt + (o.tdist - o.dist) * Math.min(1, dt * 4);
    o.x += (o.tx - o.x) * Math.min(1, dt * 8);
  }
  const lap = Math.floor(rr.me.dist / Track.LENGTH);
  RaceDraw.render(rrCtx, rrView.w, rrView.h, {
    dist: rr.me.dist, x: rr.me.x, speed: rr.me.speed, t, dt, bump: rr.bump,
    others: [...rr.others.values()], taken: rr.taken.get(lap),
    me: { color: rr.state.color, tilt: rr.tilt, turbo: Date.now() < rr.turboUntil || Date.now() < rr.boostUntil },
  });
  sfx.engine(rr.question ? 0 : Math.max(.08, rr.me.speed / Track.MAX_SPEED));
  rrLights();
  if (now - rrHudAt > 200) {
    rrHudAt = now;
    rrHud();
    const leftMs = Math.max(0, rr.state.endsAt - rrNow());
    $('rr-clock').textContent = `${Math.floor(leftMs / 60000)}:${String(Math.floor(leftMs / 1000) % 60).padStart(2, '0')}`;
    rrMapCtx.clearRect(0, 0, rrMap.width, rrMap.height);
    const racers = [...rr.others.values()].map(o => ({ dist: o.dist, color: o.color }));
    racers.push({ dist: rr.me.dist, color: rr.state.color, me: true });
    const pad = rrMap.width * .08;
    RaceDraw.map(rrMapCtx, pad, pad, rrMap.width - pad * 2, racers, { line: rrMap.width / 45, dot: rrMap.width / 40 });
  }
}
requestAnimationFrame(rrFrame);
