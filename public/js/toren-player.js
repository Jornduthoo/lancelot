// De prinses in de toren op de gsm: zelf klimmen, de anderen zien klimmen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS en sfx uit fx.js, Toren en TorenDraw.
const tw = {
  state: null,
  joined: false,
  world: null,
  run: -1,
  offset: 0,         // verschil tussen de klok van de server en deze gsm
  me: null,
  energy: 0,
  others: new Map(),
  ranking: [],
  keys: { left: false, right: false },
  jumpAt: -1,
  question: null,    // open vraag, of null
  lastSent: '',
  cam: 0,
  rescued: false,
};

function twNow() {
  return Date.now() + tw.offset;
}

// Speltijd in seconden; dezelfde klok als het bord, zodat lasers overal tegelijk flitsen.
function twTime() {
  return tw.state ? (twNow() - tw.state.startedAt) / 1000 : 0;
}

function twShow(name) {
  for (const s of ['tw-join', 'tw-lobby', 'tw-game', 'tw-end']) $(s).classList.toggle('hidden', s !== name);
}

function twJoin(name) {
  socket.emit('tw-join', { playerId, name }, res => {
    if (res.error) {
      tw.joined = false;
      $('tw-join-error').textContent = res.error;
      twShow('tw-join');
      return;
    }
    tw.joined = true;
    store('lancelot-name', res.name);
    $('tw-join-error').textContent = '';
  });
}

$('tw-join').addEventListener('submit', e => {
  e.preventDefault();
  twJoin($('tw-name').value);
});

socket.on('tw-state', s => {
  tw.state = s;
  tw.offset = s.now - Date.now();
  document.body.dataset.tw = s.active ? '1' : '';
  if (!s.active) {
    tw.joined = false;
    tw.me = null;
    return;
  }
  if (tw.run !== s.run) {
    tw.run = s.run;
    tw.world = Toren.build(s.seed);
    tw.me = null;
    tw.others.clear();
    tw.rescued = false;
    tw.joined = false;
  }
  if (!s.name) {
    // Nog niet aangemeld: met de bewaarde naam meteen meedoen, anders de naam vragen.
    const saved = store('lancelot-name');
    if (!tw.joined && saved && !tw.autoJoined) {
      tw.autoJoined = true;
      twJoin(saved);
    } else if (!tw.joined) {
      $('tw-name').value = saved || '';
      twShow('tw-join');
    }
    return;
  }
  tw.joined = true;
  tw.energy = s.energy;
  if (s.phase === 'lobby') {
    $('tw-lobby-name').textContent = s.name;
    twShow('tw-lobby');
  } else if (s.phase === 'play') {
    if (!tw.me) {
      // Starten (of na herladen terug op de plek van daarnet).
      tw.me = { x: s.y > 0 ? s.x : Toren.W / 2 - 13 + (Math.random() - .5) * 200, y: s.y, vx: 0, vy: 0, face: 1, grounded: true, coyote: 0, tumble: 0, safe: 0 };
      tw.cam = tw.me.y - 150;
    }
    tw.rescued = s.rescued;
    twShow('tw-game');
    twResize();
  } else if (s.phase === 'einde') {
    twCloseQuestion();
    const medals = ['🥇', '🥈', '🥉'];
    $('tw-end-medal').textContent = s.rescued ? '👑' : medals[s.rank - 1] || '🛡️';
    $('tw-end-title').textContent = s.rank === 1 ? 'Jij wint de toren!' : `Plek ${s.rank} van ${s.players}`;
    $('tw-end-floor').textContent = s.rescued ? 'Prinses gered!' : `Verdieping ${s.floor}`;
    $('tw-end-extra').textContent = 'Kijk naar het bord voor de eindstand.';
    if (!$('tw-end').dataset.done && s.rank <= 3) confetti(4000);
    $('tw-end').dataset.done = '1';
    twShow('tw-end');
  }
  if (s.phase !== 'einde') delete $('tw-end').dataset.done;
});

socket.on('tw-kicked', () => {
  tw.joined = false;
  tw.autoJoined = true;
  store('lancelot-name', null);
  $('tw-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  twShow('tw-join');
});

socket.on('connect', () => {
  if (tw.joined) twJoin(store('lancelot-name') || '');
});

socket.on('tw-world', data => {
  tw.offset = data.now - Date.now();
  const seen = new Set();
  for (const [id, name, x, y, face, act, color, best, rescued] of data.players) {
    seen.add(id);
    if (id === playerId) continue;
    const o = tw.others.get(id);
    if (o) Object.assign(o, { tx: x, ty: y, face, act, name, color });
    else tw.others.set(id, { x, y, tx: x, ty: y, face, act, name, color });
  }
  for (const id of tw.others.keys()) if (!seen.has(id)) tw.others.delete(id);
  // Eigen plaats in de stand: eerst wie de prinses redde, dan wie het hoogst kwam.
  const sorted = data.players.slice().sort((a, b) => b[8] - a[8] || b[7] - a[7]);
  tw.rank = sorted.findIndex(p => p[0] === playerId) + 1;
  tw.count = sorted.length;
});

socket.on('tw-rescued', ({ name, first }) => {
  if (name === (tw.state && tw.state.name)) {
    tw.rescued = true;
    twToast('👑 Je hebt de prinses gered!', 'gold');
    sfx.fanfare();
    confetti(4000);
  } else {
    twToast(first ? `👑 ${name} redt als eerste de prinses!` : `👑 ${name} bereikt de prinses`, 'gold');
  }
});

let toastTimer = null;
function twToast(text, kind = '') {
  const el = $('tw-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'tw-toast'; }, 2200);
}

// ---------- Besturing ----------

function hold(id, key) {
  const b = $(id);
  const on = e => { e.preventDefault(); tw.keys[key] = true; b.classList.add('down'); };
  const off = () => { tw.keys[key] = false; b.classList.remove('down'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off);
  b.addEventListener('pointerleave', off);
}
hold('tw-left', 'left');
hold('tw-right', 'right');
$('tw-jump-btn').addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); tw.jumpAt = performance.now(); });
$('tw-ask').addEventListener('click', () => twOpenQuestion());
for (const b of document.querySelectorAll('.tw-btn')) b.addEventListener('contextmenu', e => e.preventDefault());

const KEYS = { ArrowLeft: 'left', a: 'left', q: 'left', ArrowRight: 'right', d: 'right' };
document.addEventListener('keydown', e => {
  if (document.body.dataset.tw !== '1' || e.target.tagName === 'INPUT') return;
  if (KEYS[e.key]) { tw.keys[KEYS[e.key]] = true; e.preventDefault(); }
  if ([' ', 'ArrowUp', 'w', 'z'].includes(e.key)) { tw.jumpAt = performance.now(); e.preventDefault(); }
  if (e.key === 'Enter' || e.key === 'e') twOpenQuestion();
  if (tw.question && tw.question.answers && !tw.question.done && /^[1-4]$/.test(e.key)) twAnswer(Number(e.key) - 1);
});
document.addEventListener('keyup', e => {
  if (KEYS[e.key]) tw.keys[KEYS[e.key]] = false;
});

// ---------- Vragen voor energie ----------

function twOpenQuestion() {
  if (tw.question || !tw.state || tw.state.phase !== 'play') return;
  tw.question = { loading: true };
  tw.keys.left = tw.keys.right = false;
  $('tw-question').classList.remove('hidden');
  $('tw-q-text').textContent = '…';
  $('tw-q-answers').innerHTML = '';
  $('tw-q-result').textContent = '';
  $('tw-q-result').className = 'tw-q-result';
  $('tw-q-close').classList.add('hidden');
  socket.emit('tw-question', null, res => {
    if (!res || res.error) {
      twCloseQuestion();
      return;
    }
    tw.question = { answers: res.answers };
    $('tw-q-text').textContent = res.question;
    $('tw-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 60}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('tw-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => twAnswer(i));
    });
  });
}

function twAnswer(i) {
  if (!tw.question || tw.question.done) return;
  tw.question.done = true;
  socket.emit('tw-answer', i, res => {
    if (!res || res.error) return twCloseQuestion();
    tw.energy = res.energy;
    const tiles = [...$('tw-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('tw-q-result');
    result.textContent = res.correct ? `Juist! +${res.gained} ⚡` : `Helaas. +${res.gained} ⚡`;
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) sfx.good(); else sfx.bad();
    buzz(res.correct ? [30, 40, 30] : 200);
    setTimeout(twCloseQuestion, res.correct ? 1100 : 2200);
  });
}

function twCloseQuestion() {
  tw.question = null;
  $('tw-question').classList.add('hidden');
}

// ---------- Spel ----------

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();

function twHit(what) {
  const me = tw.me;
  me.tumble = .7;
  me.safe = 1.8;
  me.vy = 220;
  me.grounded = false;
  sfx.hit();
  buzz([60, 40, 120]);
  twToast({ laser: 'Au! Een laser!', drone: 'Bots! Een drone!', spikes: 'Au! Stekels!' }[what], 'bad');
  socket.emit('tw-hit', what);
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function physics(dt, t) {
  const me = tw.me;
  const { W, PLAYER: P, PHYS } = tw.world;
  const frozen = tw.question || t < 0;
  me.safe = Math.max(0, me.safe - dt);

  if (me.tumble > 0) {
    me.tumble -= dt;
    me.vx = 0;
  } else if (frozen) {
    me.vx = 0;
  } else {
    me.vx = ((tw.keys.right ? 1 : 0) - (tw.keys.left ? 1 : 0)) * PHYS.speed;
    if (me.vx) me.face = Math.sign(me.vx);
    const wantJump = tw.jumpAt > 0 && performance.now() - tw.jumpAt < 130;
    if (wantJump && (me.grounded || me.coyote > 0)) {
      tw.jumpAt = -1;
      if (tw.energy > 0) {
        tw.energy--;
        me.vy = PHYS.jump;
        me.grounded = false;
        me.coyote = 0;
        sfx.jump();
        socket.emit('tw-jump', null, res => { if (res && typeof res.energy === 'number') tw.energy = res.energy; });
      } else {
        sfx.empty();
        buzz(80);
        twOpenQuestion();
      }
    }
  }
  if (frozen && me.grounded) return;

  me.vy = Math.max(-1400, me.vy - PHYS.gravity * dt);
  const nx = Math.max(0, Math.min(W - P.w, me.x + me.vx * dt));
  let ny = me.y + me.vy * dt;
  let landed = null;
  if (me.vy <= 0 && me.tumble <= 0) {
    for (const p of tw.world.platforms) {
      if (me.y >= p.y - .01 && ny <= p.y && nx + P.w > p.x + 3 && nx < p.x + p.w - 3) {
        ny = p.y;
        landed = p;
        break;
      }
    }
  }
  if (ny < 0) { ny = 0; landed = tw.world.platforms[0]; }
  me.x = nx;
  me.y = ny;
  if (landed) {
    me.vy = 0;
    me.grounded = true;
    me.coyote = .08;
    me.on = landed;
  } else {
    if (me.grounded) me.coyote = .08;
    me.grounded = false;
    me.coyote = Math.max(0, me.coyote - dt);
  }

  // Gevaren, behalve vlak na een treffer of tijdens een vraag.
  if (me.safe > 0 || tw.question) return;
  if (me.grounded && me.on && me.on.spikes && nx + P.w > me.on.spikes.x + 4 && nx < me.on.spikes.x + me.on.spikes.w - 4) return twHit('spikes');
  for (const l of tw.world.lasers) {
    if (Math.abs(l.y - me.y) > 60) continue;
    if (Toren.laserState(l, t).on && overlap(me.x, me.y, P.w, P.h, l.x, l.y - 3, l.w, 6)) return twHit('laser');
  }
  for (const d of tw.world.drones) {
    if (Math.abs(d.y - me.y) > 60) continue;
    const dx = Toren.droneX(d, t, W);
    const cx = Math.max(me.x, Math.min(dx, me.x + P.w));
    const cy = Math.max(me.y, Math.min(d.y, me.y + P.h));
    if ((cx - dx) ** 2 + (cy - d.y) ** 2 < d.r ** 2) return twHit('drone');
  }
}

function act() {
  const me = tw.me;
  if (me.tumble > 0) return 3;
  if (!me.grounded) return 2;
  return me.vx ? 1 : 0;
}

// Positie tien keer per seconde doorsturen als ze veranderd is.
setInterval(() => {
  if (!tw.me || !tw.state || tw.state.phase !== 'play') return;
  const me = tw.me;
  const msg = { x: Math.round(me.x), y: Math.round(me.y), face: me.face, act: act() };
  const key = JSON.stringify(msg);
  if (key === tw.lastSent) return;
  tw.lastSent = key;
  socket.emit('tw-move', msg);
}, 100);

const canvas = $('tw-canvas');
const ctx = canvas.getContext('2d');
let view = { w: 0, h: 0, scale: 1, ox: 0 };

function twResize() {
  const stage = $('tw-stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  // Ingezoomd zoals een echt platformspel: op een smalle gsm schuift het beeld mee naar links en rechts.
  const margin = 14;
  const fitAll = canvas.width / (Toren.W + margin * 2);
  // Ver genoeg uitgezoomd om de lasers en drones boven je op tijd te zien.
  // Liggend scherm (Chromebook): de hele toren in beeld, even hoog als op een gsm.
  const desired = canvas.height / 660;
  const scale = desired * Toren.W <= canvas.width ? desired : Math.max(fitAll * .92, Math.min(canvas.width / 340, desired));
  view = { w: canvas.width, h: canvas.height, scale, ox: (canvas.width - Toren.W * scale) / 2, scroll: scale > fitAll };
}
window.addEventListener('resize', twResize);

function label(text, x, y, color, scale) {
  ctx.font = `700 ${11 * scale}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, .7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function render(t, dt) {
  const { scale, h } = view;
  const me = tw.me;
  let ox = view.ox;
  if (view.scroll) {
    const viewW = view.w / scale;
    const camX = Math.max(-14, Math.min(Toren.W + 14 - viewW, me.x + tw.world.PLAYER.w / 2 - viewW / 2));
    tw.camX = tw.camX === undefined ? camX : tw.camX + (camX - tw.camX) * Math.min(1, dt * 8);
    ox = -tw.camX * scale;
  }
  const viewH = h / scale;
  // De ridder staat laag in beeld, zodat je vooral ziet wat er boven je komt.
  const target = Math.max(-20, me.y - viewH * .18);
  tw.cam += (target - tw.cam) * Math.min(1, dt * 6);
  const cam = { y: tw.cam, scale, H: h, ox };
  TorenDraw.scene(ctx, tw.world, cam, Math.max(0, t));
  const sy = wy => h - (wy - cam.y) * scale;
  const { w: pw, h: ph } = tw.world.PLAYER;
  const topY = cam.y + viewH;

  // De andere ridders, doorschijnend, met hun naam erboven. Buiten beeld: een pijltje aan de rand.
  const above = [];
  const below = [];
  for (const o of tw.others.values()) {
    o.x += (o.tx - o.x) * Math.min(1, dt * 12);
    o.y += (o.ty - o.y) * Math.min(1, dt * 12);
    const color = TorenDraw.COLORS[o.color % 8];
    if (o.y > topY) { above.push(o); continue; }
    if (o.y + ph < cam.y) { below.push(o); continue; }
    TorenDraw.knight(ctx, ox + o.x * scale, sy(o.y), pw * scale, ph * scale, color, o.face, o.act, t, .5);
    label(o.name, ox + (o.x + pw / 2) * scale, sy(o.y + ph + 6), 'rgba(234, 244, 255, .8)', scale);
  }
  const edge = (list, y, arrow) => list.slice(0, 6).forEach((o, i) => {
    const x = Math.max(40, Math.min(view.w - 40, ox + (o.x + pw / 2) * scale));
    label(`${arrow} ${o.name}`, x, y + (arrow === '▲' ? i : -i) * 13 * scale, TorenDraw.COLORS[o.color % 8], scale * .9);
  });
  edge(above, 16 * scale, '▲');

  // Gevaren net boven het beeld: een rood pijltje aan de bovenrand, knipperend als de laser aan staat.
  for (const l of tw.world.lasers) {
    if (l.y <= topY || l.y > topY + 260) continue;
    const st = Toren.laserState(l, t);
    ctx.fillStyle = st.on ? '#ff4d6d' : st.warn ? 'rgba(255, 77, 109, .8)' : 'rgba(255, 77, 109, .35)';
    ctx.fillRect(ox + l.x * scale, 0, l.w * scale, 4 * scale);
  }
  for (const d of tw.world.drones) {
    if (d.y <= topY || d.y > topY + 260) continue;
    const x = ox + Toren.droneX(d, t, Toren.W) * scale;
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.moveTo(x, 2 * scale);
    ctx.lineTo(x - 6 * scale, 10 * scale);
    ctx.lineTo(x + 6 * scale, 10 * scale);
    ctx.fill();
  }
  edge(below, h - 8 * scale, '▼');

  // Jezelf, met een gloed zodat je jezelf meteen terugvindt.
  const mx = ox + me.x * scale;
  const my = sy(me.y);
  const glow = ctx.createRadialGradient(mx + pw * scale / 2, my - ph * scale / 2, 2, mx + pw * scale / 2, my - ph * scale / 2, 34 * scale);
  glow.addColorStop(0, 'rgba(76, 201, 255, .35)');
  glow.addColorStop(1, 'rgba(76, 201, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 30 * scale, my - ph * scale - 30 * scale, pw * scale + 60 * scale, ph * scale + 60 * scale);
  TorenDraw.knight(ctx, mx, my, pw * scale, ph * scale, TorenDraw.COLORS[tw.state.color % 8], me.face, act(), t, me.safe > 0 && me.tumble <= 0 ? .6 + .4 * Math.sin(t * 30) : 1);
  label('jij', mx + pw * scale / 2, sy(me.y + ph + 6), '#4cc9ff', scale);
}

function hud(t) {
  const max = 10;
  const e = tw.energy;
  $('tw-pips').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < e ? 'on' : ''}${i >= max - (e - max) && e > max ? ' extra' : ''}"></i>`).join('');
  $('tw-energy-n').textContent = e;
  $('tw-game').classList.toggle('low', e <= 2);
  const floor = Toren.floorAt(tw.world, tw.me.y);
  $('tw-floor').textContent = tw.rescued ? '👑 Gered!' : `Verd. ${floor}/${tw.world.FLOORS}`;
  $('tw-rank').textContent = tw.rank ? `#${tw.rank}` : '';
  const left = Math.max(0, tw.state.endsAt - twNow());
  $('tw-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  const cd = $('tw-countdown');
  cd.classList.toggle('hidden', t >= 0);
  if (t < 0) cd.textContent = Math.ceil(-t);
}

let hudAt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (!tw.me || !tw.state || tw.state.phase !== 'play' || $('tw-game').classList.contains('hidden')) return;
  if (!view.w) twResize();
  const t = twTime();
  acc += dt;
  while (acc >= STEP) {
    physics(STEP, t);
    acc -= STEP;
  }
  render(t, dt);
  if (now - hudAt > 150) {
    hudAt = now;
    hud(t);
  }
}
requestAnimationFrame(frame);
