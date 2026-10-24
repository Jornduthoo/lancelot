// Bomber-Knight op de gsm of Chromebook: door de arena lopen, mijnen leggen en kratten opblazen.
// Een mijn kost ⚡ energie; energie verdien je met goede antwoorden.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, BomberDraw uit bk-draw.js.
const bk = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  scene: null,
  me: null,
  koEnd: 0,
  question: null,
  dir: -1,
  held: [],          // ingedrukte richtingstoetsen, de laatste telt
  stick: null,
};

const bkNow = () => Date.now() + bk.offset;

function bkShow(name) {
  for (const s of ['bk-join', 'bk-lobby', 'bk-game', 'bk-end']) $(s).classList.toggle('hidden', s !== name);
}

function bkJoin(name) {
  socket.emit('bk-join', { playerId, name }, res => {
    if (res.error) {
      bk.joined = false;
      $('bk-join-error').textContent = res.error;
      bkShow('bk-join');
      return;
    }
    bk.joined = true;
    store('lancelot-name', res.name);
    $('bk-join-error').textContent = '';
  });
}

$('bk-join').addEventListener('submit', e => {
  e.preventDefault();
  bkJoin($('bk-name').value);
});

socket.on('bk-state', s => {
  bk.state = s;
  bk.offset = s.now - Date.now();
  document.body.dataset.bk = s.active ? '1' : '';
  if (!s.active) {
    bk.joined = false;
    return;
  }
  if (bk.run !== s.run) {
    bk.run = s.run;
    bk.joined = false;
    bk.me = null;
    bk.scene = null;
    bkCloseQuestion();
    delete $('bk-end').dataset.done;
  }
  if (s.arena) bk.scene = BomberDraw.fromState(s, bk.scene);
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!bk.joined && saved && bk.autoRun !== s.run) {
      bk.autoRun = s.run;
      bkJoin(saved);
    } else if (!bk.joined) {
      $('bk-name').value = saved || '';
      bkShow('bk-join');
    }
    return;
  }
  bk.joined = true;
  if (s.me) bkMe(s.me);
  if (s.phase === 'lobby') {
    $('bk-lobby-name').textContent = s.name;
    bkShow('bk-lobby');
  } else if (s.phase === 'play') {
    bkShow('bk-game');
    bkResize();
  } else if (s.phase === 'einde') {
    bkCloseQuestion();
    $('bk-out').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    const me = s.me || {};
    $('bk-end-medal').textContent = medals[me.rank - 1] || '💣';
    $('bk-end-title').textContent = me.rank === 1 ? 'Jij bent de beste Bomber-Knight!' : `Plek ${me.rank} van ${me.players}`;
    $('bk-end-score').textContent = `${me.crystals || 0} 💎`;
    $('bk-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.kos || 0} ${me.kos === 1 ? 'ridder' : 'ridders'} uitgeschakeld`;
    if (!$('bk-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
    $('bk-end').dataset.done = '1';
    bkShow('bk-end');
  }
});

socket.on('bk-tick', msg => {
  if (!bk.scene || !bk.state || bk.state.phase !== 'play') return;
  const events = BomberDraw.apply(bk.scene, msg);
  const myN = bk.me ? bk.me.n : -1;
  for (const e of events) {
    if (e[0] === 'x') {
      const k = bk.scene.knights.get(myN);
      const d = k ? Math.abs(k.x - e[1]) + Math.abs(k.y - e[2]) : 99;
      if (d < 9) {
        sfx.boom();
        bk.shake = Math.max(bk.shake || 0, d < 3 ? .4 : .2);
      }
    } else if (e[0] === 'p' && e[1] === myN) {
      const names = { 1: '+3 💎', 2: '🔥 Grotere ontploffing!', 3: '🛡️ Schild!', 4: '+1 ⚡ energie' };
      bkToast(names[e[2]], 'gold');
      sfx.power();
    } else if (e[0] === 's' && e[1] === myN) {
      bkToast('Je schild ving de ontploffing op!', 'gold');
      sfx.hit();
      buzz([40, 30, 40]);
    }
  }
  if (msg.me) bkMe(msg.me);
  if (msg.feed) bkFeed(msg.feed);
});

socket.on('bk-kicked', () => {
  bk.joined = false;
  store('lancelot-name', null);
  $('bk-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  bkShow('bk-join');
});

socket.on('connect', () => {
  if (bk.joined) bkJoin(store('lancelot-name') || '');
});

function bkMe(me) {
  const old = bk.me;
  bk.me = me;
  bk.koEnd = me.ko ? performance.now() + me.ko : 0;
  if (old) {
    if (me.kos > old.kos) {
      buzz([40, 30, 40]);
      bkBanner('RAAK!', '+5 💎', 'gold');
    }
    if (me.ko && !old.ko) {
      sfx.hit();
      buzz(300);
      $('bk-out-by').textContent = me.by ? `${me.by} blies je op` : 'Je eigen mijn…';
      $('bk-out-lost').textContent = old.crystals > me.crystals ? `Je verliest ${old.crystals - me.crystals} 💎` : '';
      bkSend(-1);
    }
  }
  $('bk-out').classList.toggle('hidden', !me.ko);
  bkHud();
}

function bkHud() {
  const me = bk.me;
  if (!me) return;
  $('bk-crystals').textContent = me.crystals;
  $('bk-energy').innerHTML = Array.from({ length: me.max }, (_, i) => `<i class="${i < me.energy ? 'on' : ''}"></i>`).join('');
  $('bk-range').textContent = `🔥${me.range}`;
  $('bk-shield').classList.toggle('hidden', !me.shield);
  $('bk-rank').textContent = me.rank ? `#${me.rank}/${me.players}` : '';
  $('bk-mine').classList.toggle('ready', me.energy > 0);
}

function bkFeed(feed) {
  const box = $('bk-feed');
  const fresh = feed[0];
  if (!fresh || box.dataset.last === String(fresh.at)) return;
  box.dataset.last = String(fresh.at);
  const line = document.createElement('div');
  line.className = 'ls-feed-line';
  if (bk.state && bk.state.name && fresh.text.includes(bk.state.name)) line.classList.add('me');
  line.textContent = fresh.text;
  box.prepend(line);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => line.remove(), 5000);
}

let bkToastTimer = null;
function bkToast(text, kind = '') {
  const el = $('bk-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(bkToastTimer);
  bkToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

let bkBannerTimer = null;
function bkBanner(title, sub, kind = '') {
  const el = $('bk-banner');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = sub || '';
  el.append(strong, span);
  el.className = `ls-banner show ${kind}`;
  clearTimeout(bkBannerTimer);
  bkBannerTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

// ---------- Besturing: ingedrukt houden = lopen, loslaten = stilstaan ----------

function bkSend(dir) {
  if (dir === bk.dir) return;
  bk.dir = dir;
  if (!bk.state || bk.state.phase !== 'play') return;
  socket.emit('bk-dir', dir);
}

// Ingedrukt houden overleeft zo ook een terugkeer in de arena of een gemiste melding.
setInterval(() => {
  if (bk.dir >= 0 && bk.state && bk.state.phase === 'play' && !bk.question) socket.emit('bk-dir', bk.dir);
}, 400);

function bkMine() {
  if (!bk.me || bk.question || bk.me.ko) return;
  if (bk.me.energy <= 0) {
    sfx.empty();
    bkToast('Geen ⚡ energie! Druk op ⚡ Vraag', 'bad');
    return;
  }
  socket.emit('bk-mine', null, res => {
    if (res && res.error) bkToast(res.error, 'bad');
    else {
      sfx.marker();
      buzz(30);
      if (bk.me && res) { bk.me.energy = res.energy; bkHud(); }
    }
  });
}

const BK_KEYS = { ArrowUp: 0, w: 0, z: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3, q: 3 };
document.addEventListener('keydown', e => {
  if (document.body.dataset.bk !== '1' || e.target.tagName === 'INPUT') return;
  if (bk.question) {
    if (bk.question.answers && !bk.question.done && /^[1-4]$/.test(e.key)) bkAnswer(Number(e.key) - 1);
    if (e.key === 'Escape' || (e.key === 'Enter' && bk.question.done)) bkCloseQuestion();
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key in BK_KEYS) {
    e.preventDefault();
    const d = BK_KEYS[key];
    bk.held = bk.held.filter(x => x !== d);
    bk.held.push(d);
    bkSend(d);
  }
  if (e.key === ' ') { e.preventDefault(); if (!e.repeat) bkMine(); }
  if (key === 'e' || e.key === 'Enter') bkOpenQuestion();
});
document.addEventListener('keyup', e => {
  if (document.body.dataset.bk !== '1') return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!(key in BK_KEYS)) return;
  bk.held = bk.held.filter(x => x !== BK_KEYS[key]);
  bkSend(bk.held.length ? bk.held[bk.held.length - 1] : -1);
});
window.addEventListener('blur', () => { bk.held = []; if (document.body.dataset.bk === '1') bkSend(-1); });

// De duimjoystick: zet je duim ergens op het scherm en schuif in een richting. Loslaten is stilstaan.
const bkCanvas = $('bk-canvas');
bkCanvas.addEventListener('pointerdown', e => {
  sfx.unlock();
  e.preventDefault();
  bk.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  try { bkCanvas.setPointerCapture(e.pointerId); } catch {}
});
bkCanvas.addEventListener('pointermove', e => {
  const st = bk.stick;
  if (!st || st.id !== e.pointerId) return;
  let dx = e.clientX - st.x, dy = e.clientY - st.y;
  const d = Math.hypot(dx, dy);
  // Ver doorschuiven? Dan schuift de joystick mee, zo blijft hij onder je duim.
  if (d > 60) {
    st.x = e.clientX - dx / d * 60;
    st.y = e.clientY - dy / d * 60;
    dx = e.clientX - st.x;
    dy = e.clientY - st.y;
  }
  st.dx = dx;
  st.dy = dy;
  if (d < 14) return bkSend(-1);
  bkSend(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
});
for (const ev of ['pointerup', 'pointercancel']) {
  bkCanvas.addEventListener(ev, e => {
    if (!bk.stick || bk.stick.id !== e.pointerId) return;
    bk.stick = null;
    bkSend(-1);
  });
}
bkCanvas.addEventListener('contextmenu', e => e.preventDefault());
$('bk-mine').addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); bkMine(); });
$('bk-ask').addEventListener('click', e => { e.currentTarget.blur(); bkOpenQuestion(); });
$('bk-out-ask').addEventListener('click', () => bkOpenQuestion());
$('bk-q-close').addEventListener('click', () => bkCloseQuestion());

// ---------- Vragen voor energie ----------

function bkOpenQuestion() {
  if (bk.question || !bk.state || bk.state.phase !== 'play') return;
  if (bkNow() < bk.state.startedAt) return;
  bk.question = { loading: true };
  bk.held = [];
  bk.stick = null;
  bkSend(-1);
  $('bk-question').classList.remove('hidden');
  $('bk-q-text').textContent = '…';
  $('bk-q-answers').innerHTML = '';
  $('bk-q-result').textContent = '';
  $('bk-q-result').className = 'tw-q-result';
  socket.emit('bk-question', null, res => {
    if (!bk.question) return;
    if (res && res.wait) {
      $('bk-q-text').textContent = 'Even nadenken…';
      bkWait(res.wait, () => { bk.question = null; bkOpenQuestion(); });
      return;
    }
    if (!res || res.error) return bkCloseQuestion();
    bk.question = { answers: res.answers };
    $('bk-q-status').textContent = `Juist = +${res.gain} ⚡ (${res.energy}/${res.max}) · je bent beschermd`;
    $('bk-q-text').textContent = res.question;
    $('bk-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('bk-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => bkAnswer(i));
    });
  });
}

let bkWaitTimer = null;
function bkWait(ms, then) {
  clearInterval(bkWaitTimer);
  const end = performance.now() + ms;
  const result = $('bk-q-result');
  if (!result.querySelector('small')) result.append(document.createElement('small'));
  const tickWait = () => {
    const left = end - performance.now();
    if (!bk.question) return clearInterval(bkWaitTimer);
    if (left <= 0) {
      clearInterval(bkWaitTimer);
      then();
      return;
    }
    result.querySelector('small').textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
  };
  tickWait();
  bkWaitTimer = setInterval(tickWait, 200);
}

function bkAnswer(i) {
  if (!bk.question || bk.question.done || !bk.question.answers) return;
  bk.question.done = true;
  socket.emit('bk-answer', i, res => {
    if (!res || res.error) return bkCloseQuestion();
    const tiles = [...$('bk-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('bk-q-result');
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) {
      const extra = res.bonus === 'schild' ? ' · 5 op rij: 🛡️ schild!' : res.bonus === 'bereik' ? ' · 3 op rij: 🔥 grotere ontploffing!' : '';
      result.textContent = `Juist! +${res.gained} ⚡${extra}`;
      sfx.good();
      buzz([30, 40, 30]);
      if (bk.me) { Object.assign(bk.me, { energy: res.energy, range: res.range, shield: res.shield }); bkHud(); }
      setTimeout(() => {
        if (!bk.question || !bk.question.done) return;
        if (res.energy >= res.max) {
          bkCloseQuestion();
          bkToast('Energie vol! Leg mijnen met 💣 (spatie)', 'gold');
        } else {
          bk.question = null;
          bkOpenQuestion();
        }
      }, 900);
    } else {
      // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
      result.textContent = 'Helaas! Kijk naar het juiste antwoord.';
      result.append(document.createElement('br'), document.createElement('small'));
      sfx.bad();
      buzz(200);
      bkWait(res.wait || 3000, () => {
        if (!bk.question) return;
        bk.question = null;
        bkOpenQuestion();
      });
    }
  });
}

function bkCloseQuestion() {
  clearInterval(bkWaitTimer);
  if (bk.question) socket.emit('bk-asking', false);
  bk.question = null;
  $('bk-question').classList.add('hidden');
}

// ---------- Tekenen ----------

const bkCtx = bkCanvas.getContext('2d');
let bkView = { w: 0, h: 0, dpr: 1 };

function bkResize() {
  const stage = $('bk-stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  bkCanvas.width = Math.round(w * dpr);
  bkCanvas.height = Math.round(h * dpr);
  bkCanvas.style.width = `${w}px`;
  bkCanvas.style.height = `${h}px`;
  bkView = { w: bkCanvas.width, h: bkCanvas.height, dpr };
}
window.addEventListener('resize', bkResize);

// De camera volgt de eigen ridder; past de hele arena op het scherm, dan staat ze stil in het midden.
function bkCamera(s) {
  const { w, h, dpr } = bkView;
  const tile = Math.round(Math.max(30 * dpr, Math.min(64 * dpr, Math.min(w, h) / 10)));
  const k = bk.me && s.knights.get(bk.me.n);
  let fx = s.W / 2, fy = s.H / 2;
  if (k) {
    k.ms = s.step;
    const p = BomberDraw.pos(k, performance.now());
    fx = p.x + .5;
    fy = p.y + .5;
  }
  const axis = (focus, size, n) => {
    if (n * tile <= size) return Math.round((size - n * tile) / 2);
    return Math.round(Math.max(size - n * tile, Math.min(0, size / 2 - focus * tile)));
  };
  return { tile, ox: axis(fx, w, s.W), oy: axis(fy, h, s.H) };
}

function bkFrame() {
  requestAnimationFrame(bkFrame);
  if (document.body.dataset.bk !== '1' || !bk.state) return;
  const s = bk.scene;
  const now = bkNow();
  const t = performance.now();
  if (bk.state.phase === 'play') {
    const left = Math.max(0, bk.state.endsAt - now);
    $('bk-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    const wait = bk.state.startedAt - now;
    $('bk-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('bk-countdown').textContent = Math.ceil(wait / 1000);
    if (bk.koEnd) $('bk-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil((bk.koEnd - t) / 1000))}…`;
  }
  if (!s || !s.arena || $('bk-game').classList.contains('hidden')) return;
  if (!bkView.w) bkResize();
  if (!bkView.w) return;
  const cam = bkCamera(s);
  if (bk.shake > 0) {
    cam.ox += Math.round((Math.random() - .5) * cam.tile * .3 * bk.shake);
    cam.oy += Math.round((Math.random() - .5) * cam.tile * .3 * bk.shake);
    bk.shake -= 1 / 60;
  }
  BomberDraw.scene(bkCtx, s, cam, { names: true, me: bk.me ? bk.me.n : -1 });
  // De joystick onder je duim.
  const st = bk.stick;
  if (st) {
    const r = bkCanvas.getBoundingClientRect();
    const k = bkView.dpr;
    const x = (st.x - r.left) * k, y = (st.y - r.top) * k;
    bkCtx.strokeStyle = 'rgba(76, 201, 255, .5)';
    bkCtx.lineWidth = 3 * k;
    bkCtx.beginPath();
    bkCtx.arc(x, y, 60 * k, 0, Math.PI * 2);
    bkCtx.stroke();
    bkCtx.fillStyle = 'rgba(76, 201, 255, .45)';
    bkCtx.beginPath();
    bkCtx.arc(x + st.dx * k, y + st.dy * k, 26 * k, 0, Math.PI * 2);
    bkCtx.fill();
  }
  const mw = Math.min(bkView.w * .28, 190 * bkView.dpr);
  const mh = mw * s.H / s.W;
  if (s.W * cam.tile > bkView.w || s.H * cam.tile > bkView.h) BomberDraw.minimap(bkCtx, s, bkView.w - mw - 10 * bkView.dpr, 10 * bkView.dpr, mw, mh, bk.me ? bk.me.n : -1);
}
requestAnimationFrame(bkFrame);
