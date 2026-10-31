// Kolkridder op de Chromebook of gsm: stuur je plasmakolk door de stad en slok alles op wat kleiner is dan jij.
// De server beweegt de kolk; wij sturen alleen de richting en tekenen alles vloeiend.
// Chromebook: de kolk volgt de muis, of pijltjes / WASD / ZQSD. 1-4 antwoorden. Gsm: duim op het scherm en schuiven.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, KoWorld en KoDraw.
(() => {
  const W = KoWorld;
  const root = document.createElement('div');
  root.id = 'kolk';
  root.innerHTML = `
  <form id="ko-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Kolkridder</p>
    <input id="ko-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="ko-join-error"></p>
    <button type="submit" class="big">De stad in</button>
  </form>
  <section id="ko-lobby" class="screen panel hidden">
    <p class="status">Kolkridder</p>
    <img class="lobby-icoon" src="/img/icons/kolkridder.webp" alt="">
    <p class="title" id="ko-lobby-name"></p>
    <p>Stuur je <strong>plasmakolk</strong> door de stad. Alles wat kleiner is dan jij, slok je op. <strong>Hoe meer je slokt, hoe groter je wordt</strong>: eerst munten en tonnen, dan karren, huizen, torens en de burcht!</p>
    <p class="muted small">Is je plasma op, dan krijg je een vraag. Juist: je kolk groeit meteen en krijgt 🌪 zuigkracht. Tijdens een vraag sta je stil en ben je veilig.</p>
    <p class="muted small" id="ko-lobby-duel"></p>
    <p class="muted small ls-hint-touch">Zet je duim op het scherm en schuif in de richting waarin je wil.</p>
    <p class="muted small ls-hint-keys">Je kolk volgt de muis, of stuur met de pijltjes · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="ko-game" class="ak-game hidden">
    <div class="ls-hud ak-hud ko-hud">
      <div class="sv-mass" id="ko-size">🌀 2 m</div>
      <div class="hb-energy ko-plasma" id="ko-plasma" title="Plasma"><i></i></div>
      <div class="px-chip hidden" id="ko-power"></div>
      <div class="ry-alive" id="ko-rank"></div>
      <div class="ls-clock" id="ko-clock"></div>
    </div>
    <div class="ls-stage ko-stage" id="ko-stage">
      <canvas id="ko-canvas"></canvas>
      <div class="ak-stick hidden" id="ko-stick"><i></i></div>
      <div class="ls-feed" id="ko-feed"></div>
      <div class="ls-banner" id="ko-banner"></div>
      <div class="tw-toast" id="ko-toast"></div>
      <div class="tw-countdown hidden" id="ko-countdown"></div>
      <div class="hb-tip" id="ko-tip"><span class="ls-hint-touch">Duim op het scherm en schuiven</span><span class="ls-hint-keys">Je kolk volgt de muis</span></div>
      <div class="ls-out hidden" id="ko-out">
        <p class="ls-out-title">Opgeslokt!</p>
        <p class="ls-out-by" id="ko-out-by"></p>
        <p class="ls-out-timer" id="ko-out-timer"></p>
      </div>
    </div>
  </section>
  <section id="ko-end" class="screen panel hidden">
    <div class="mark" id="ko-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="ko-end-title"></p>
    <p class="big" id="ko-end-score" style="font-size:1.6rem"></p>
    <p id="ko-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), cam: null, view: 20, plasmaEnd: 0, zuigEnd: 0 };
  let scene = new KoDraw.Scene();
  const fx = new AK.Particles();
  const res = new KoDraw.Res(.6);
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.ko === '1';
  const show = name => { for (const s of ['ko-join', 'ko-lobby', 'ko-game', 'ko-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';
  const mText = r => `${String(Math.round(r * 20) / 10).replace('.', ',')} m`;

  function join(name) {
    socket.emit('ko-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('ko-join-error').textContent = res.error;
        show('ko-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('ko-join-error').textContent = '';
    });
  }
  $('ko-join').addEventListener('submit', e => { e.preventDefault(); join($('ko-name').value); });

  socket.on('ko-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.ko = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.cam = null;
      scene = new KoDraw.Scene();
      scene.onEvent = onEvent;
      quiz.close();
      delete $('ko-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('ko-name').value = saved || '';
        show('ko-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.phase === 'lobby') {
      $('ko-lobby-name').textContent = s.name;
      $('ko-lobby-duel').textContent = s.duel ? '🌀 Duelmodus: een kolk die duidelijk groter is, slokt jou op. Ben jij groter, dan slok jij de anderen!' : '';
      show('ko-lobby');
    } else if (s.phase === 'play') {
      show('ko-game');
      $('ko-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      $('ko-out').classList.add('hidden');
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('ko-end-medal').textContent = medals[me.rank - 1] || '🌀';
      $('ko-end-title').textContent = me.rank === 1 ? 'Jij hebt de grootste kolk!' : `Plek ${me.rank} van ${me.players}`;
      $('ko-end-score').textContent = `🌀 ${mText(me.r || 1)} breed`;
      const parts = [`${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`, `${me.eaten || 0} voorwerpen opgeslokt`, `${me.big || 0} ${me.big === 1 ? 'gebouw' : 'gebouwen'}`];
      if (s.duel) parts.push(`${me.slok || 0} ${me.slok === 1 ? 'kolk' : 'kolken'} opgeslokt`);
      $('ko-end-stats').textContent = parts.join(' · ');
      if (!$('ko-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('ko-end').dataset.done = '1';
      show('ko-end');
    }
  });

  socket.on('ko-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('ko-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('ko-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('ko-world', msg => { scene.setWorld(msg); g.cam = null; });

  socket.on('ko-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    scene.apply(msg);
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    const t = performance.now();
    g.plasmaEnd = t + me.plasma;
    g.plasmaMax = me.plasmaMax || W.PLASMA_S * 1000;
    g.zuigEnd = t + (me.zuig || 0);
    if (old && old.alive && !me.alive) {
      sfx.hit();
      buzz([200, 80, 300]);
      quiz.close();
    }
    if (old && !old.alive && me.alive) sfx.go();
    if (old && Math.floor(me.r) > Math.floor(old.r) && me.r >= 2) {
      toast(`🌀 ${mText(me.r)} breed! Nu past er meer in.`, 'good');
      sfx.power();
    }
    $('ko-out').classList.toggle('hidden', me.alive);
    if (!me.alive) g.respawnAt = t + me.respawn;
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('ko-size').textContent = `🌀 ${mText(me.r)}`;
    $('ko-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'e' && e[2] === me.n) {
      const o = scene.objs[e[1]];
      if (o && o.k >= W.K.huis) { sfx.marker(); buzz(30); }
      else if (performance.now() - (g.tickAt || 0) > 160) { g.tickAt = performance.now(); sfx.tick(); }
    } else if (e[0] === 'd') {
      if (e[1] === me.n) $('ko-out-by').textContent = `${nameOf(e[2])} slokte je op. Je bent wat kleiner, maar je mag meteen verder.`;
      else if (e[2] === me.n) { sfx.boom(); buzz([40, 30, 80]); banner('OPGESLOKT!', `Je slokte de kolk van ${nameOf(e[1])} op`, 'gold'); }
      else feedLine(`🌀 ${nameOf(e[2])} slokt ${nameOf(e[1])} op`);
    }
  }

  function feedLine(text) {
    const box = $('ko-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('ko-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('ko-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  // ---------- Vragen als de plasma op is ----------
  let lastRes = null;
  const quiz = AK.quiz({
    root: $('ko-game'),
    closeText: 'Verder slokken',
    lock: 350,
    status: () => 'Plasma op · juist = je kolk groeit + 🌪 zuigkracht · je staat stil en bent veilig',
    ask: cb => socket.emit('ko-question', null, cb),
    answer: (i, cb) => socket.emit('ko-answer', i, res => {
      lastRes = res;
      if (res && res.correct) sfx.power();
      cb(res);
    }),
    good: res => `Juist! Je kolk groeit en krijgt ${res.zuig} s 🌪 zuigkracht`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug. Je krijgt een beetje plasma.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('ko-asking', false);
      if (lastRes && lastRes.correct) banner('🌪 ZUIGKRACHT!', 'Je slokt nu ook wat verder ligt', 'gold');
      lastRes = null;
      hud();
    },
  });
  function maybeAsk() {
    if (!g.me || !g.me.alive || quiz.open || now() < g.state.startedAt) return;
    if (performance.now() < g.plasmaEnd) return;
    if (g.askedAt && performance.now() - g.askedAt < 1500) return;
    g.askedAt = performance.now();
    socket.emit('ko-asking', true);
    quiz.show();
  }

  // ---------- Besturing ----------
  const stage = $('ko-stage');
  const stickEl = $('ko-stick');
  const knob = stickEl.firstChild;
  const ctl = { mouse: null, touch: null, sent: [9, 9], sentAt: 0 };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('ko-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key)) { e.preventDefault(); ctl.mouse = null; }
  });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    ctl.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') ctl.mouse = null; });
  // Duim: waar je hem neerzet, verschijnt de joystick. Schuif verder en hij schuift mee.
  const RAD = 50;
  stage.addEventListener('pointerdown', e => {
    sfx.unlock();
    if (e.pointerType === 'mouse' || ctl.touch || e.target.closest('button, .ak-question')) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    ctl.touch = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
    stickEl.style.left = `${e.clientX - r.left}px`;
    stickEl.style.top = `${e.clientY - r.top}px`;
    stickEl.classList.remove('hidden');
    knob.style.transform = 'translate(-50%, -50%)';
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', e => {
    const tc = ctl.touch;
    if (!tc || e.pointerId !== tc.id) return;
    let dx = e.clientX - tc.ox, dy = e.clientY - tc.oy;
    const l = Math.hypot(dx, dy);
    if (l > RAD) {
      const r = stage.getBoundingClientRect();
      tc.ox += (dx / l) * (l - RAD);
      tc.oy += (dy / l) * (l - RAD);
      stickEl.style.left = `${tc.ox - r.left}px`;
      stickEl.style.top = `${tc.oy - r.top}px`;
      dx = e.clientX - tc.ox;
      dy = e.clientY - tc.oy;
    }
    const m = Math.hypot(dx, dy);
    const power = m < 6 ? 0 : Math.min(1, .5 + (m / RAD) * .6);
    tc.x = m ? (dx / m) * power : 0;
    tc.y = m ? (dy / m) * power : 0;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const endTouch = e => {
    if (!ctl.touch || e.pointerId !== ctl.touch.id) return;
    ctl.touch = null;
    stickEl.classList.add('hidden');
  };
  stage.addEventListener('pointerup', endTouch);
  stage.addEventListener('pointercancel', endTouch);

  // De richting van dit moment: duim, toetsen of muis (de muis trekt de kolk naar de wijzer).
  function direction(holeX, holeY, rp) {
    if (ctl.touch) return [ctl.touch.x, ctl.touch.y];
    const k = AK.keyVector();
    if (k.x || k.y) return [k.x, k.y];
    if (ctl.mouse) {
      const dx = ctl.mouse.x - holeX, dy = (ctl.mouse.y - holeY) / W.TILT;
      const l = Math.hypot(dx, dy);
      if (l < rp * .35) return [0, 0];
      const p = Math.min(1, l / (rp + 90));
      return [(dx / l) * p, (dy / l) * p];
    }
    return [0, 0];
  }
  function steer(v) {
    if (quiz.open) v = [0, 0];
    const t = performance.now();
    const changed = Math.abs(v[0] - ctl.sent[0]) + Math.abs(v[1] - ctl.sent[1]) > .06;
    if ((changed && t - ctl.sentAt > 45) || t - ctl.sentAt > 1000) {
      ctl.sent = [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100];
      ctl.sentAt = t;
      socket.emit('ko-steer', ctl.sent);
      if (v[0] || v[1]) $('ko-tip').classList.add('weg');
    }
  }

  // ---------- Elke frame ----------
  const canvas = $('ko-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('ko-game').classList.contains('hidden') || !g.me || !scene.L) return;
    const left = g.state.endsAt - now();
    $('ko-clock').textContent = AK.clock(left);
    $('ko-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('ko-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('ko-countdown').textContent = Math.ceil(wait / 1000);
    if (!g.me.alive) $('ko-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil(((g.respawnAt || 0) - t) / 1000))} s`;
    const plasma = Math.max(0, g.plasmaEnd - t);
    const pl = $('ko-plasma');
    pl.firstChild.style.width = `${Math.round(Math.min(1, plasma / g.plasmaMax) * 100)}%`;
    pl.classList.toggle('low', plasma < g.plasmaMax * .2);
    const zuig = g.zuigEnd - t;
    const pw = $('ko-power');
    pw.classList.toggle('hidden', zuig <= 0);
    if (zuig > 0) pw.textContent = `🌪 ${Math.ceil(zuig / 1000)} s`;
    maybeAsk();

    // Tijdens een vraag ligt het vragenvenster over de stad: niet tekenen spaart de Chromebook.
    if (quiz.open) return;
    const sec = t / 1000;
    res.frame(dt);
    const { w, h, dpr } = AK.fit(canvas, res.dpr(1.5));
    const hole = scene.hole(g.me.n, t);
    const r = hole ? hole[2] : g.me.r;
    // De camera zoomt mee uit als je kolk groeit.
    const want = 17 + r * 5.3;
    g.view += (want - g.view) * Math.min(1, dt * 2);
    const S = Math.min(w, h * 1.25) / g.view;
    if (hole) {
      if (!g.cam) g.cam = { x: hole[0], y: hole[1] };
      const k = Math.min(1, dt * 8);
      g.cam.x += (hole[0] - g.cam.x) * k;
      g.cam.y += (hole[1] - g.cam.y) * k;
    }
    if (!g.cam) g.cam = { x: scene.L / 2, y: scene.L / 2 };
    const cam = { x: g.cam.x, y: g.cam.y, S, w, h };
    KoDraw.render(ctx, scene, cam, { roster: g.roster, t: sec, me: g.me.n, fs: Math.max(9, 13 * dpr), fmax: 20 * dpr });
    fx.update(dt);
    fx.draw(ctx);
    const ms = Math.min(w * .2, h * .28, 120 * dpr);
    KoDraw.minimap(ctx, scene, w - ms - 10 * dpr, h - ms - 10 * dpr, ms, { roster: g.roster, me: g.me.n });
    // Sturen: de positie van je kolk op het scherm in CSS-pixels
    if (hole && g.me.alive && wait <= 0) {
      const hx = (w / 2 + (hole[0] - cam.x) * S) / dpr, hy = (h / 2 + (hole[1] - cam.y) * S * W.TILT) / dpr;
      steer(direction(hx, hy, (r * S) / dpr));
    }
  }
  scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
