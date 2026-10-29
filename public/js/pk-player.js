// Pac-Knight op de gsm of Chromebook: door het doolhof lopen, kristallen rapen, drones ontwijken en krachten verdienen met vragen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, PacDraw uit pk-draw.js.
const pk = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  scene: null,
  me: null,           // eigen stand van de server: kristallen, krachten, gevangen...
  powerEnd: 0,
  caughtEnd: 0,
  question: null,
  lastDir: null,
  swipe: null,
  cam: null,
};

const pkNow = () => Date.now() + pk.offset;

function pkShow(name) {
  for (const s of ['pk-join', 'pk-lobby', 'pk-game', 'pk-end']) $(s).classList.toggle('hidden', s !== name);
}

function pkJoin(name) {
  socket.emit('pk-join', { playerId, name }, res => {
    if (res.error) {
      pk.joined = false;
      $('pk-join-error').textContent = res.error;
      pkShow('pk-join');
      return;
    }
    pk.joined = true;
    store('lancelot-name', res.name);
    $('pk-join-error').textContent = '';
  });
}

$('pk-join').addEventListener('submit', e => {
  e.preventDefault();
  pkJoin($('pk-name').value);
});

socket.on('pk-state', s => {
  pk.state = s;
  pk.offset = s.now - Date.now();
  document.body.dataset.pk = s.active ? '1' : '';
  if (!s.active) {
    pk.joined = false;
    return;
  }
  if (pk.run !== s.run) {
    pk.run = s.run;
    pk.joined = false;
    pk.me = null;
    pk.scene = null;
    pkCloseQuestion();
    delete $('pk-end').dataset.done;
  }
  if (s.maze) pk.scene = PacDraw.fromState(s, pk.scene);
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!pk.joined && saved && pk.autoRun !== s.run) {
      pk.autoRun = s.run;
      pkJoin(saved);
    } else if (!pk.joined) {
      $('pk-name').value = saved || '';
      pkShow('pk-join');
    }
    return;
  }
  pk.joined = true;
  if (s.me) pkMe(s.me);
  if (s.phase === 'lobby') {
    $('pk-lobby-name').textContent = s.name;
    pkShow('pk-lobby');
  } else if (s.phase === 'play') {
    pkShow('pk-game');
    pkResize();
  } else if (s.phase === 'einde') {
    pkCloseQuestion();
    $('pk-out').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    const me = s.me || {};
    $('pk-end-medal').textContent = medals[me.rank - 1] || '💎';
    $('pk-end-title').textContent = me.rank === 1 ? 'Jij bent de beste Pac-Knight!' : `Plek ${me.rank} van ${me.players}`;
    $('pk-end-score').textContent = `${me.crystals || 0} 💎`;
    $('pk-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.drones || 0} ${me.drones === 1 ? 'drone' : 'drones'} uitgeschakeld`;
    if (!$('pk-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
    $('pk-end').dataset.done = '1';
    pkShow('pk-end');
  }
});

socket.on('pk-tick', msg => {
  if (!pk.scene || !pk.state || pk.state.phase !== 'play') return;
  PacDraw.apply(pk.scene, msg);
  if (msg.me) pkMe(msg.me);
  if (msg.feed) pkFeed(msg.feed);
});

socket.on('pk-kicked', () => {
  pk.joined = false;
  store('lancelot-name', null);
  $('pk-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  pkShow('pk-join');
});

socket.on('connect', () => {
  if (pk.joined) pkJoin(store('lancelot-name') || '');
});

// De eigen stand: kijken wat er veranderd is, voor geluid en meldingen.
let pkTickSound = 0;
function pkMe(me) {
  const old = pk.me;
  pk.me = me;
  const t = performance.now();
  pk.powerEnd = me.power ? t + me.power : 0;
  pk.caughtEnd = me.caught ? t + me.caught : 0;
  if (old) {
    if (me.crystals > old.crystals && !me.caught && t - pkTickSound > 90) {
      pkTickSound = t;
      sfx.marker();
    }
    if (me.drones > old.drones) {
      sfx.boom();
      buzz([40, 30, 40]);
      pkBanner('DRONE GERAAKT!', '+10 💎', 'gold');
    }
    if (me.caught && !old.caught) {
      sfx.hit();
      buzz(300);
      $('pk-out-lost').textContent = old.crystals > me.crystals ? `Je verliest ${old.crystals - me.crystals} 💎` : 'Een drone heeft je te pakken';
      pk.lastDir = null;
    }
    if (me.power && !old.power) {
      sfx.power();
      pkBanner('KRACHT!', 'De drones vluchten. Jaag ze op!', 'big');
    }
    if (!me.power && old.power) pkToast('Je kracht is op', 'bad');
  }
  $('pk-out').classList.toggle('hidden', !me.caught);
  pkHud();
}

function pkHud() {
  const me = pk.me;
  if (!me) return;
  $('pk-crystals').textContent = me.crystals;
  $('pk-pellets').innerHTML = Array.from({ length: me.max }, (_, i) => `<i class="${i < me.pellets ? 'on' : ''}">💥</i>`).join('');
  $('pk-rank').textContent = me.rank ? `#${me.rank}/${me.players}` : '';
  $('pk-use').classList.toggle('ready', me.pellets > 0);
  $('pk-use').disabled = me.pellets <= 0;
}

function pkFeed(feed) {
  const box = $('pk-feed');
  const fresh = feed[0];
  if (!fresh || box.dataset.last === String(fresh.at)) return;
  box.dataset.last = String(fresh.at);
  const line = document.createElement('div');
  line.className = 'ls-feed-line';
  if (pk.state && pk.state.name && fresh.text.includes(pk.state.name)) line.classList.add('me');
  line.textContent = fresh.text;
  box.prepend(line);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => line.remove(), 5000);
}

let pkToastTimer = null;
function pkToast(text, kind = '') {
  const el = $('pk-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(pkToastTimer);
  pkToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

let pkBannerTimer = null;
function pkBanner(title, sub, kind = '') {
  const el = $('pk-banner');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = sub || '';
  el.append(strong, span);
  el.className = `ls-banner show ${kind}`;
  clearTimeout(pkBannerTimer);
  pkBannerTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ---------- Besturing ----------

function pkSteer(dir) {
  if (!pk.state || pk.state.phase !== 'play' || pk.question) return;
  pk.lastDir = dir;
  socket.emit('pk-dir', dir);
}

function pkPower() {
  if (!pk.me || pk.question) return;
  if (pk.me.pellets <= 0) {
    sfx.empty();
    pkToast('Geen kracht! Druk op ⚡ Vraag', 'bad');
    return;
  }
  socket.emit('pk-power', null, res => {
    if (res && res.error) pkToast(res.error, 'bad');
  });
}

const PK_KEYS = { ArrowUp: 0, w: 0, z: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3, q: 3 };
document.addEventListener('keydown', e => {
  if (document.body.dataset.pk !== '1' || e.target.tagName === 'INPUT') return;
  if (pk.question) {
    if (pk.question.answers && !pk.question.done && /^[1-4]$/.test(e.key)) pkAnswer(Number(e.key) - 1);
    if (e.key === 'Escape' || (e.key === 'Enter' && pk.question.done)) pkCloseQuestion();
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key in PK_KEYS) {
    e.preventDefault();
    if (!e.repeat || PK_KEYS[key] !== pk.lastDir) pkSteer(PK_KEYS[key]);
  }
  if (e.key === ' ') { e.preventDefault(); if (!e.repeat) pkPower(); }
  if (key === 'e' || e.key === 'Enter') pkOpenQuestion();
});

// Vegen over het scherm: de richting van de veeg. Je mag blijven vegen zonder los te laten.
const pkCanvas = $('pk-canvas');
pkCanvas.addEventListener('pointerdown', e => {
  sfx.unlock();
  e.preventDefault();
  pk.swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { pkCanvas.setPointerCapture(e.pointerId); } catch {}
});
pkCanvas.addEventListener('pointermove', e => {
  const sw = pk.swipe;
  if (!sw || sw.id !== e.pointerId) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (Math.hypot(dx, dy) < 18) return;
  const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  if (dir !== pk.lastDir) pkSteer(dir);
  sw.x = e.clientX;
  sw.y = e.clientY;
});
for (const ev of ['pointerup', 'pointercancel']) pkCanvas.addEventListener(ev, () => { pk.swipe = null; });
for (const b of document.querySelectorAll('.pk-pad .ls-btn')) {
  b.addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); pkSteer(Number(b.dataset.dir)); b.classList.add('down'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('down'));
  b.addEventListener('contextmenu', e => e.preventDefault());
}
$('pk-use').addEventListener('click', e => { e.currentTarget.blur(); pkPower(); });
$('pk-ask').addEventListener('click', e => { e.currentTarget.blur(); pkOpenQuestion(); });
$('pk-out-ask').addEventListener('click', () => pkOpenQuestion());
$('pk-q-close').addEventListener('click', () => pkCloseQuestion());

// ---------- Vragen voor krachten ----------

function pkOpenQuestion() {
  if (pk.question || !pk.state || pk.state.phase !== 'play') return;
  if (pkNow() < pk.state.startedAt) return;
  pk.question = { loading: true };
  pk.swipe = null;
  pk.lastDir = null;
  $('pk-question').classList.remove('hidden');
  $('pk-q-text').textContent = '…';
  $('pk-q-answers').innerHTML = '';
  $('pk-q-result').textContent = '';
  $('pk-q-result').className = 'tw-q-result';
  socket.emit('pk-question', null, res => {
    if (!pk.question) return;
    if (res && res.wait) {
      // Nog even wachten na een fout antwoord.
      $('pk-q-text').textContent = 'Even nadenken…';
      pkWait(res.wait, () => { pk.question = null; pkOpenQuestion(); });
      return;
    }
    if (!res || res.error) return pkCloseQuestion();
    pk.question = { answers: res.answers };
    $('pk-q-status').textContent = `Juist = 💥 kracht (${res.pellets}/${res.max}) · je bent beschermd`;
    $('pk-q-text').textContent = res.question;
    $('pk-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('pk-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => pkAnswer(i));
    });
  });
}

let pkWaitTimer = null;
function pkWait(ms, then) {
  clearInterval(pkWaitTimer);
  const end = performance.now() + ms;
  const result = $('pk-q-result');
  const tickWait = () => {
    const left = end - performance.now();
    if (!pk.question) return clearInterval(pkWaitTimer);
    if (left <= 0) {
      clearInterval(pkWaitTimer);
      then();
      return;
    }
    result.dataset.wait = `Even wachten… ${Math.ceil(left / 1000)}`;
    result.querySelector('small').textContent = result.dataset.wait;
  };
  if (!result.querySelector('small')) result.append(document.createElement('small'));
  tickWait();
  pkWaitTimer = setInterval(tickWait, 200);
}

function pkAnswer(i) {
  if (!pk.question || pk.question.done || !pk.question.answers) return;
  pk.question.done = true;
  socket.emit('pk-answer', i, res => {
    if (!res || res.error) return pkCloseQuestion();
    const tiles = [...$('pk-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('pk-q-result');
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (res.correct) {
      result.textContent = `Juist! +${res.gained} 💥${res.gained > 1 ? ' · 3 op rij!' : ''}`;
      sfx.good();
      buzz([30, 40, 30]);
      if (pk.me) { pk.me.pellets = res.pellets; pkHud(); }
      // Krachten vol? Dan terug het doolhof in. Anders meteen de volgende vraag; sluiten kan altijd.
      setTimeout(() => {
        if (!pk.question || !pk.question.done) return;
        if (res.pellets >= res.max) {
          pkCloseQuestion();
          pkToast('Krachten vol! Druk op 💥 (spatie)', 'gold');
        } else {
          pk.question = null;
          pkOpenQuestion();
        }
      }, 900);
    } else {
      // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
      result.textContent = 'Helaas! Kijk naar het juiste antwoord.';
      result.append(document.createElement('br'), document.createElement('small'));
      sfx.bad();
      buzz(200);
      pkWait(res.wait || 3000, () => {
        if (!pk.question) return;
        pk.question = null;
        pkOpenQuestion();
      });
    }
  });
}

function pkCloseQuestion() {
  clearInterval(pkWaitTimer);
  if (pk.question) socket.emit('pk-asking', false);
  pk.question = null;
  $('pk-question').classList.add('hidden');
}

// ---------- Tekenen ----------

const pkCtx = pkCanvas.getContext('2d');
let pkView = { w: 0, h: 0, dpr: 1 };

function pkResize() {
  const stage = $('pk-stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  pkCanvas.width = Math.round(w * dpr);
  pkCanvas.height = Math.round(h * dpr);
  pkCanvas.style.width = `${w}px`;
  pkCanvas.style.height = `${h}px`;
  pkView = { w: pkCanvas.width, h: pkCanvas.height, dpr };
}
window.addEventListener('resize', pkResize);

// De camera volgt de eigen ridder; past het hele doolhof op het scherm, dan staat het stil in het midden.
function pkCamera(s) {
  const { w, h, dpr } = pkView;
  const tile = Math.round(Math.max(26 * dpr, Math.min(64 * dpr, Math.min(w, h) / 11)));
  const k = pk.me && s.knights.get(pk.me.n);
  let fx = s.W / 2, fy = s.H / 2;
  if (k) {
    const p = PacDraw.pos(s, k, performance.now());
    fx = p.x + .5;
    fy = p.y + .5;
  }
  const axis = (focus, size, n) => {
    if (n * tile <= size) return Math.round((size - n * tile) / 2);
    return Math.round(Math.max(size - n * tile, Math.min(0, size / 2 - focus * tile)));
  };
  return { tile, ox: axis(fx, w, s.W), oy: axis(fy, h, s.H) };
}

function pkFrame() {
  requestAnimationFrame(pkFrame);
  if (document.body.dataset.pk !== '1' || !pk.state) return;
  const s = pk.scene;
  const now = pkNow();
  const t = performance.now();
  if (pk.state.phase === 'play') {
    const left = Math.max(0, pk.state.endsAt - now);
    $('pk-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    const wait = pk.state.startedAt - now;
    $('pk-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('pk-countdown').textContent = Math.ceil(wait / 1000);
    const powerLeft = pk.powerEnd - t;
    $('pk-power').classList.toggle('hidden', !(powerLeft > 0));
    if (powerLeft > 0) $('pk-power-fill').style.width = `${Math.min(100, (powerLeft / pk.state.powerMs) * 100)}%`;
    if (pk.caughtEnd) $('pk-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil((pk.caughtEnd - t) / 1000))}…`;
  }
  if (!s || !s.maze || $('pk-game').classList.contains('hidden')) return;
  if (!pkView.w) pkResize();
  if (!pkView.w) return;
  s.meN = pk.me ? pk.me.n : -1;
  s.want = pk.lastDir;
  const cam = pkCamera(s);
  PacDraw.scene(pkCtx, s, cam, { names: true, me: pk.me ? pk.me.n : -1 });
  // Klein overzicht in de hoek, zodat je weet waar de drones zitten.
  const mw = Math.min(pkView.w * .3, 200 * pkView.dpr);
  const mh = mw * s.H / s.W;
  if (s.W * cam.tile > pkView.w || s.H * cam.tile > pkView.h) PacDraw.minimap(pkCtx, s, pkView.w - mw - 10 * pkView.dpr, 10 * pkView.dpr, mw, mh, pk.me ? pk.me.n : -1);
}
requestAnimationFrame(pkFrame);
