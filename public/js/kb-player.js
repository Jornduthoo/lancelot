// Kegelridder op de Chromebook of gsm: je eigen kegelbaan. Juiste vraag = een bal, dan veeg je de bal naar de kegels.
// Vegen: zet je vinger (of muis) waar de bal moet starten, veeg naar de kegels en laat los. Sneller vegen = harder,
// een bocht aan het einde van je veeg = effect. Toetsen: ← → schuiven, spatie ingedrukt houden = kracht, loslaten = gooien.
// De worp rolt meteen hier (kb-world.js); de server rekent dezelfde worp na en houdt de stand bij.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, KbWorld en KbDraw.
(() => {
  const W = KbWorld;
  const root = document.createElement('div');
  root.id = 'kegel';
  root.innerHTML = `
  <form id="kb-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Kegelridder</p>
    <input id="kb-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="kb-join-error"></p>
    <button type="submit" class="big">Naar de kegelbaan</button>
  </form>
  <section id="kb-lobby" class="screen panel hidden">
    <p class="status">Kegelridder</p>
    <img class="kb-lobby-icon" src="/img/icons/kegelridder.webp" alt="">
    <p class="title" id="kb-lobby-name"></p>
    <p><strong>Antwoorden geven ballen.</strong> Elke juiste vraag = één bal. Veeg de bal naar de tien runenkegels.</p>
    <p>Alles om met één bal = <strong>STRIKE</strong>. Alles om met je tweede bal = <strong>SPARE</strong>. Drie juist op rij: een gouden runenbal.</p>
    <p class="muted small ls-hint-touch">Zet je vinger op de baan, veeg naar de kegels en laat los. Sneller vegen = harder gooien.</p>
    <p class="muted small ls-hint-keys">Veeg met de muis, of: ← → schuiven, spatie ingedrukt houden en loslaten · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="kb-game" class="ak-game hidden">
    <div class="ls-hud ak-hud kb-hud">
      <div class="sv-mass" id="kb-score">0</div>
      <div class="px-chip" id="kb-frame">Beurt 1</div>
      <div class="px-chip kb-balls" id="kb-balls">🎳 0</div>
      <div class="px-chip kb-gold hidden" id="kb-gold">✨ runenbal</div>
      <div class="ry-alive" id="kb-rank"></div>
      <div class="ls-clock" id="kb-clock"></div>
    </div>
    <div class="ls-stage kb-stage" id="kb-stage">
      <canvas id="kb-canvas"></canvas>
      <div class="kb-tip" id="kb-tip">Veeg de bal naar de kegels</div>
      <div class="kb-power hidden" id="kb-power"><i></i></div>
      <button class="gold big kb-ask hidden" id="kb-ask" type="button">🎳 Vraag = bal</button>
      <div class="ls-feed" id="kb-feed"></div>
      <div class="ls-banner" id="kb-banner"></div>
      <div class="tw-toast" id="kb-toast"></div>
      <div class="tw-countdown hidden" id="kb-countdown"></div>
    </div>
  </section>
  <section id="kb-end" class="screen panel hidden">
    <div class="mark" id="kb-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="kb-end-title"></p>
    <p class="big" id="kb-end-score" style="font-size:1.6rem"></p>
    <p id="kb-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, name: '',
    balls: 0, gold: false, standing: Array(10).fill(true), frame: 1, ball: 1,
    x: 0, roll: null, result: null, lastFeed: '', throws: 0,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.kb === '1';
  const show = name => { for (const s of ['kb-join', 'kb-lobby', 'kb-game', 'kb-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('kb-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('kb-join-error').textContent = res.error;
        show('kb-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('kb-join-error').textContent = '';
    });
  }
  $('kb-join').addEventListener('submit', e => { e.preventDefault(); join($('kb-name').value); });

  socket.on('kb-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.kb = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.roll = null;
      g.result = null;
      g.x = 0;
      g.throws = 0;
      $('kb-tip').classList.remove('weg');
      quiz.close();
      delete $('kb-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('kb-name').value = saved || '';
        show('kb-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    if (s.me) setMe(s.me, true);
    if (s.phase === 'lobby') {
      $('kb-lobby-name').textContent = s.name;
      show('kb-lobby');
    } else if (s.phase === 'play') {
      show('kb-game');
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('kb-end-medal').textContent = medals[me.rank - 1] || '🎳';
      $('kb-end-title').textContent = me.rank === 1 && (me.score ?? 1) > 0 ? 'Jij bent de beste Kegelridder!' : `Plek ${me.rank} van ${me.players}`;
      $('kb-end-score').textContent = `${me.score || 0} punten`;
      $('kb-end-stats').textContent = `${me.pins || 0} kegels · ${me.strikes || 0} strikes · ${me.spares || 0} spares · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('kb-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('kb-end').dataset.done = '1';
      show('kb-end');
    }
  });

  socket.on('kb-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('kb-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('kb-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('kb-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const top = (msg.feed || [])[0];
    if (top && top.text !== g.lastFeed) {
      g.lastFeed = top.text;
      if (!top.text.includes(g.name)) feedLine(top.text);
    }
  });

  // full: ook de kegels overnemen (na herladen). Tijdens een worp blijven de kegels van de worp staan.
  function setMe(me, full) {
    g.me = me;
    $('kb-score').textContent = me.score;
    $('kb-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
    if (!g.roll) {
      g.balls = me.balls;
      g.gold = me.gold;
      if (full || !g.result) { g.standing = me.standing.slice(); g.frame = me.frame; g.ball = me.ball; }
    }
    hud();
  }

  // Alleen het scherm aanraken als er iets veranderde (dit loopt elke frame).
  let hudKey = '';
  function hud() {
    const ask = g.balls === 0 && !g.roll && !quiz.open && playing();
    const key = `${g.frame}|${g.ball}|${g.balls}|${g.gold}|${ask}`;
    if (key === hudKey) return;
    hudKey = key;
    $('kb-frame').textContent = `Beurt ${g.frame} · bal ${g.ball}`;
    $('kb-balls').textContent = `🎳 ${g.balls}`;
    $('kb-balls').classList.toggle('kb-op', g.balls === 0);
    $('kb-gold').classList.toggle('hidden', !(g.gold && g.balls > 0));
    $('kb-ask').classList.toggle('hidden', !ask);
  }

  // ---------- Vragen: juist = bal ----------
  const quiz = AK.quiz({
    root: $('kb-game'),
    closeText: 'Naar de baan',
    lock: 300,
    status: () => `Beurt ${g.frame} · juist = 🎳 een bal${g.me && g.me.streak % 3 === 2 ? ' · nog 1 juist = ✨ runenbal' : ''}`,
    ask: cb => socket.emit('kb-question', null, cb),
    answer: (i, cb) => socket.emit('kb-answer', i, res => {
      if (res && res.correct) {
        g.balls = res.balls;
        g.gold = res.gold;
        sfx.power();
        hud();
      }
      cb(res);
    }),
    good: res => (res.more ? `Juist! +${res.points}` : res.newGold ? `Juist! ✨ Een gouden runenbal! +${res.points}` : `Juist! 🎳 Je krijgt een bal. +${res.points}`),
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    close: () => {
      socket.emit('kb-asking', false);
      hud();
    },
  });
  $('kb-ask').addEventListener('click', () => { sfx.unlock(); askNow(); });
  function askNow() {
    if (!playing() || quiz.open || g.roll || g.balls > 0) return;
    quiz.show();
    hud();
  }

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('kb-game').classList.contains('hidden');
  }

  // ---------- Gooien ----------
  function throwBall(t) {
    if (!playing() || quiz.open || g.roll || g.balls <= 0) return;
    const clean = W.clean(t);
    const gold = g.gold;
    g.balls--;
    g.gold = false;
    g.throws++;
    if (g.throws >= 2) $('kb-tip').classList.add('weg');
    const sim = W.create(clean, g.standing, gold);
    g.roll = { sim, clock: 0, hitAt: -1, res: null, ended: 0, standing: g.standing.slice(), hits: new Set() };
    sfx.whoosh();
    buzz(20);
    hud();
    socket.emit('kb-throw', clean, res => {
      if (!g.roll || g.roll.sim !== sim) return;
      if (!res || res.error) {
        // Niet gelukt (bv. geen bal meer): alles terug zoals de server het kent.
        g.roll = null;
        if (res && res.error) toast(res.error, 'bad');
        return;
      }
      g.roll.res = res;
    });
  }

  // Na de worp: de uitslag tonen en de kegels voor de volgende bal klaarzetten.
  function endRoll() {
    const r = g.roll;
    const res = r.res;
    g.roll = null;
    if (!res) return;
    g.balls = res.balls;
    g.standing = res.standing;
    g.frame = res.nextFrame;
    g.ball = res.nextBall;
    g.result = res;
    const n = res.down.length;
    const C = $('kb-canvas').getBoundingClientRect();
    if (res.kind === 'strike') {
      banner('STRIKE!', `+${res.points}`, 'gold');
      sfx.fanfare ? sfx.fanfare() : sfx.go();
      buzz([40, 50, 40, 50, 80]);
      stars(C.width / 2, C.height * .35, 46);
    } else if (res.kind === 'spare') {
      banner('SPARE!', `+${res.points}`, 'gold');
      sfx.go();
      buzz([30, 40, 30]);
      stars(C.width / 2, C.height * .35, 26);
    } else if (n === 0) {
      banner(res.ball === 1 ? 'Mis!' : 'Mis!', 'Probeer het met je volgende bal', '');
      sfx.bad();
    } else {
      banner(`${n} ${n === 1 ? 'kegel' : 'kegels'}`, `+${res.points}`, '');
      sfx.good();
    }
    hud();
    if (g.balls === 0 && g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) setTimeout(askNow, 900);
  }

  // Glimmende runensterren (geen confetti).
  function stars(x, y, n) {
    fx.burst(x, y, { n, color: '#ffc94a', speed: 420, life: 1, size: 5, up: 120 });
    fx.sparks(x, y, { n: Math.round(n / 2), color: '#5ee7ff', speed: 520 });
    fx.shock(x, y, 90, '#ffc94a');
  }

  // Vegen: vinger neer = startplek, vegen = richting en kracht, bocht = effect.
  const stage = $('kb-stage');
  const canvas = $('kb-canvas');
  let swipe = null;
  stage.addEventListener('pointerdown', e => {
    if (quiz.open || e.target.closest('.ak-question') || e.target.closest('button')) return;
    e.preventDefault();
    sfx.unlock();
    if (!playing() || g.roll) return;
    if (g.balls <= 0) { askNow(); return; }
    try { stage.setPointerCapture(e.pointerId); } catch {}
    const r = canvas.getBoundingClientRect();
    const fit = { w: r.width, h: r.height };
    g.x = Math.max(-W.LIMITS.x, Math.min(W.LIMITS.x, KbDraw.laneX(fit.w, fit.h, e.clientX - r.left)));
    swipe = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }], h: r.height };
  });
  stage.addEventListener('pointermove', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    swipe.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (swipe.pts.length > 60) swipe.pts.splice(1, 1);
    // Nog niet naar boven geveegd: de bal schuift mee met je vinger.
    if (swipe.pts[0].y - e.clientY < 18) {
      const r = canvas.getBoundingClientRect();
      g.x = Math.max(-W.LIMITS.x, Math.min(W.LIMITS.x, KbDraw.laneX(r.width, r.height, e.clientX - r.left)));
      swipe.pts[0] = { x: e.clientX, y: e.clientY, t: performance.now() };
    }
  });
  const release = e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe;
    swipe = null;
    s.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    const t = fromSwipe(s);
    if (t) throwBall(t);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', () => { swipe = null; });
  stage.addEventListener('contextmenu', e => e.preventDefault());

  function fromSwipe(s) {
    const pts = s.pts, a = pts[0], b = pts[pts.length - 1];
    const dy = a.y - b.y;
    if (dy < Math.max(30, s.h * .07)) return null; // niet genoeg naar boven: alleen geschoven
    // Snelheid uit het laatste stukje van de veeg.
    const tEnd = b.t;
    let k = pts.length - 1;
    while (k > 0 && tEnd - pts[k].t < 140) k--;
    const q = pts[k];
    const dt = Math.max(16, b.t - q.t) / 1000;
    const speed = Math.hypot(b.x - q.x, b.y - q.y) / dt / s.h; // schermhoogtes per seconde
    const power = Math.max(0, Math.min(1, (speed - .8) / 3.2));
    // Richting over de hele veeg, effect: hoe de veeg aan het einde afbuigt.
    const dir = (b.x - a.x) / dy;
    const mid = pts[Math.floor(pts.length / 2)];
    const d1 = (mid.x - a.x) / Math.max(1, a.y - mid.y), d2 = (b.x - mid.x) / Math.max(1, mid.y - b.y);
    const spin = Math.max(-1, Math.min(1, (d2 - d1) * 1.4));
    return { x: g.x, a: dir * .055, v: W.LIMITS.vMin + power * (W.LIMITS.vMax - W.LIMITS.vMin), s: Math.abs(spin) < .12 ? 0 : spin };
  }

  // Toetsen: ← → schuiven, spatie ingedrukt = kracht (op en neer), loslaten = gooien.
  const keys = new Set();
  let charge = null;
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('kb-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd', 'q'].includes(k)) { keys.add(k); e.preventDefault(); }
    if (k === ' ' || k === 'arrowup' || k === 'enter') {
      e.preventDefault();
      sfx.unlock();
      if (g.balls <= 0 && !g.roll) { askNow(); return; }
      if (!charge && playing() && !g.roll) charge = { at: performance.now() };
    }
  });
  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if ((k === ' ' || k === 'arrowup' || k === 'enter') && charge) {
      const p = chargePower();
      charge = null;
      throwBall({ x: g.x, a: -g.x * .012, v: W.LIMITS.vMin + p * (W.LIMITS.vMax - W.LIMITS.vMin), s: 0 });
    }
  });
  addEventListener('blur', () => { keys.clear(); charge = null; swipe = null; });
  const chargePower = () => (charge ? .5 - .5 * Math.cos((performance.now() - charge.at) / 1000 * Math.PI * 1.2) : 0);

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('kb-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('kb-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('kb-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 1700);
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  let camY = -2.2, camX = 0;
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('kb-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('kb-clock').textContent = AK.clock(left);
    $('kb-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('kb-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('kb-countdown').textContent = Math.ceil(wait / 1000);
    // Eerste vraag vanzelf zodra het spel begint.
    if (playing() && g.balls === 0 && !g.roll && !quiz.open && !g.asked) { g.asked = true; askNow(); }
    if (!playing()) g.asked = false;

    if (!g.roll && (keys.has('arrowleft') || keys.has('a') || keys.has('q'))) g.x = Math.max(-W.LIMITS.x, g.x - dt * .6);
    if (!g.roll && (keys.has('arrowright') || keys.has('d'))) g.x = Math.min(W.LIMITS.x, g.x + dt * .6);

    const fit = AK.fit(canvas, 1.5);
    const o = { t: t / 1000 };
    let wantY = -2.2, wantX = 0;
    if (g.roll) {
      const r = g.roll;
      // Bij de inslag even vertraagd: zo zie je de kegels echt vliegen.
      const slow = r.hitAt >= 0 && r.sim.t - r.hitAt < .9;
      r.clock += dt * (slow ? .45 : 1.15);
      W.runTo(r.sim, r.clock);
      // Kegels die nu omvallen: vonken.
      for (const p of r.sim.pins) {
        if (p.down && !r.hits.has(p.i)) {
          r.hits.add(p.i);
          const s = KbDraw.toScreen(fit.w, fit.h, { camY, camX }, p.x, p.y, .2);
          fx.sparks(s.x / fit.dpr, s.y / fit.dpr, { n: 6, color: '#5ee7ff', speed: 260 });
          if (r.hits.size === 1) { sfx.boom(); buzz(40); r.hitAt = r.sim.t; }
        }
      }
      o.sim = r.sim;
      wantY = KbDraw.camFor(r.sim.b.pit ? W.HEAD : r.sim.b.y);
      wantX = r.sim.b.gutter ? 0 : r.sim.b.x * .4;
      if (r.sim.done) {
        if (!r.ended) r.ended = t;
        o.fade = Math.max(0, 1 - (t - r.ended) / 700);
        // Wacht op de server (meestal al lang binnen), dan de uitslag.
        if (t - r.ended > 650 && r.res) endRoll();
        else if (t - r.ended > 5000) g.roll = null;
      }
    } else {
      o.standing = g.standing;
      if (g.balls > 0 && !quiz.open) {
        o.ball = { x: g.x };
        o.gold = g.gold;
        const power = charge ? chargePower() : swipe ? .5 : .55;
        if (charge || swipe || g.throws < 2) o.aim = { x: g.x, a: charge ? -g.x * .012 : 0, power };
      }
    }
    camY += (wantY - camY) * Math.min(1, dt * (g.roll ? 5 : 2.5));
    camX += (wantX - camX) * Math.min(1, dt * 3);
    o.camY = camY;
    o.camX = camX;
    KbDraw.render(ctx, fit.w, fit.h, o);
    // Krachtmeter (spatie)
    $('kb-power').classList.toggle('hidden', !charge);
    if (charge) $('kb-power').firstElementChild.style.height = `${Math.round(chargePower() * 100)}%`;
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
    hud();
  }
  requestAnimationFrame(frame);
})();
