// Wankelwagen op de Chromebook of gsm: rij met je ridderkar door de wiebelbaan, van vlag naar vlag.
// De hele baan draait hier (geen vertraging); de server krijgt je plek, de vlaggen en de munten, en geeft de vragen.
// Na elke vlag krijg je een andere kar. Chromebook: → of ↑ gas, ← of ↓ remmen/achteruit (in de lucht: kantelen), R = terug naar de vlag.
// Gsm: twee grote pedalen. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, WwWorld en WwDraw.
(() => {
  const W = WwWorld;
  const root = document.createElement('div');
  root.id = 'wankel';
  root.innerHTML = `
  <form id="ww-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Wankelwagen</p>
    <input id="ww-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="ww-join-error"></p>
    <button type="submit" class="big">Naar de startvlag</button>
  </form>
  <section id="ww-lobby" class="screen panel hidden">
    <p class="status">Wankelwagen</p>
    <canvas id="ww-lobby-cart" width="220" height="120"></canvas>
    <p class="title" id="ww-lobby-name"></p>
    <p>Rij met je <strong>ridderkar</strong> zo snel je kan van vlag naar vlag, over schansen, wiebelbruggen en wippen.</p>
    <p><strong>Pas op je hoofd!</strong> Raakt je ridder de grond, of val je in de lava, dan begin je opnieuw bij de laatste vlag.</p>
    <p><strong>Elke vlag is een vraag</strong> (juist = ⚡ turbo) <strong>én een andere kar</strong>: reuzenwielen, ijswielen, vierkante wielen...</p>
    <p class="muted small ls-hint-touch">Rechts = gas · links = rem. In de lucht kantel je er de kar mee.</p>
    <p class="muted small ls-hint-keys">→ of ↑ gas · ← of ↓ rem · in de lucht kantel je mee · R = terug naar de vlag · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="ww-game" class="ak-game hidden">
    <div class="ls-hud ak-hud ww-hud">
      <div class="sv-mass" id="ww-score">0</div>
      <div class="px-chip" id="ww-flags">🏁 0</div>
      <div class="px-chip ww-car" id="ww-car"></div>
      <div class="px-chip jp-time" id="ww-time"></div>
      <div class="ry-alive" id="ww-rank"></div>
      <div class="ls-clock" id="ww-clock"></div>
    </div>
    <div class="ls-stage" id="ww-stage">
      <canvas id="ww-canvas"></canvas>
      <div class="ls-feed" id="ww-feed"></div>
      <div class="ls-banner" id="ww-banner"></div>
      <div class="tw-toast" id="ww-toast"></div>
      <div class="tw-countdown hidden" id="ww-countdown"></div>
      <button class="ww-reset" id="ww-reset" type="button" title="Terug naar de vlag (R)">↺</button>
      <div class="ww-pedals">
        <button class="ww-pedal rem" id="ww-rem" type="button">◀<small>rem</small></button>
        <button class="ww-pedal gas" id="ww-gas" type="button">▶<small>gas</small></button>
      </div>
    </div>
  </section>
  <section id="ww-end" class="screen panel hidden">
    <div class="mark" id="ww-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="ww-end-title"></p>
    <p class="big" id="ww-end-score" style="font-size:1.6rem"></p>
    <p id="ww-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff',
    car: W.spawn(0), stage: 0, stageT: 0, hide: new Set(), flagBusy: false, sentAt: 0, others: new AK.Interp(110), cam: null,
    dead: 0, wreck: null, safe: 0, turbo: 0, upside: 0, pending: false, rot: new Map(),
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.ww === '1';
  const show = name => { for (const s of ['ww-join', 'ww-lobby', 'ww-game', 'ww-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('ww-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('ww-join-error').textContent = res.error;
        show('ww-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('ww-join-error').textContent = '';
    });
  }
  $('ww-join').addEventListener('submit', e => { e.preventDefault(); join($('ww-name').value); });

  function respawn(k) {
    g.car = W.spawn(k);
    g.dead = 0;
    g.wreck = null;
    g.upside = 0;
    g.safe = .8;
    g.cam = null;
    carChip();
  }
  function carChip() {
    const v = g.car.veh;
    $('ww-car').textContent = `${v.icon} ${v.name}`;
  }

  socket.on('ww-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.ww = s.active ? '1' : '';
    if (!s.active) { g.joined = false; sfx.engine(0); return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.stage = 0;
      g.stageT = 0;
      g.hide = new Set();
      g.flagBusy = false;
      g.pending = false;
      g.turbo = 0;
      g.others.clear();
      respawn(0);
      quiz.close();
      delete $('ww-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('ww-name').value = saved || '';
        show('ww-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    if (Array.isArray(s.cellIds)) for (const id of s.cellIds) g.hide.add(id);
    // Terug na herladen: verder vanaf de laatste vlag die de server kent.
    if (s.phase === 'play' && Number.isInteger(s.stage) && s.stage > g.stage) {
      g.stage = s.stage;
      respawn(g.stage);
    }
    if (s.phase === 'lobby') {
      $('ww-lobby-name').textContent = s.name;
      WwDraw.preview($('ww-lobby-cart'), W.vehicleOf(0), g.color);
      show('ww-lobby');
    } else if (s.phase === 'play') {
      show('ww-game');
      carChip();
      $('ww-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      sfx.engine(0);
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('ww-end-medal').textContent = medals[me.rank - 1] || '🛞';
      $('ww-end-title').textContent = me.rank === 1 ? 'Jij bent de beste Wankelwagenrijder!' : `Plek ${me.rank} van ${me.players}`;
      $('ww-end-score').textContent = `${me.score || 0} punten`;
      $('ww-end-stats').textContent = `${me.stage || 0} ${me.stage === 1 ? 'vlag' : 'vlaggen'} · ${me.cells || 0} munten · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('ww-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('ww-end').dataset.done = '1';
      show('ww-end');
    }
  });

  socket.on('ww-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('ww-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('ww-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('ww-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    for (const [n, x, y, a, f, st] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.others.get(n);
      g.others.push(n, [x, y, a, f, st], t);
      if (before && st > before[4] && Math.abs(st - g.stage) <= 1) feedLine(`🏁 ${nameOf(n)} haalt vlag ${st}`);
    }
    g.others.prune(t, 800);
  });

  function setMe(me) {
    g.me = me;
    $('ww-score').textContent = me.score;
    $('ww-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  // ---------- Vragen aan de vlag ----------
  // Na de vraag (of meteen, als er geen vraag komt) staat de nieuwe kar klaar aan de vlag.
  function nextCar() {
    if (!g.pending) return;
    g.pending = false;
    g.safe = .8;
    const v = g.car.veh;
    banner(`${v.icon} ${v.name}!`, v.tip, 'gold');
    sfx.whoosh();
    const p = toCss(g.car.b.x + g.car.veh.D / 2, g.car.b.y - .5);
    fx.burst(p.x, p.y, { n: 30, color: '#5ee7ff', speed: 340, life: .7, size: 4 });
  }
  const quiz = AK.quiz({
    root: $('ww-game'),
    closeText: 'Verder rijden',
    lock: 350,
    status: () => { const v = W.vehicleOf(g.stage); return `Vlag ${g.stage} · juist = ⚡ turbo · daarna: ${v.icon} ${v.name}`; },
    ask: cb => socket.emit('ww-question', null, cb),
    answer: (i, cb) => socket.emit('ww-answer', i, res => {
      if (res && res.correct) { g.turbo = res.turbo || W.TURBO_S; sfx.power(); }
      cb(res);
    }),
    good: res => `Juist! ⚡ Turbo: je nieuwe kar rijdt sneller. +${res.points}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('ww-asking', false);
      g.stageT = 0;
      nextCar();
    },
  });

  function reachFlag(k) {
    if (g.flagBusy) return;
    g.flagBusy = true;
    const secs = g.stageT;
    socket.emit('ww-flag', k, res => {
      g.flagBusy = false;
      if (!res || res.error) {
        if (res && Number.isInteger(res.stage) && res.stage > g.stage) g.stage = res.stage;
        return;
      }
      g.stage = res.stage;
      g.pending = true;
      respawn(g.stage); // de nieuwe kar staat al klaar aan de vlag (achter de vraag)
      sfx.go();
      buzz([30, 40, 30]);
      const tijd = (res.s || secs).toFixed(1).replace('.', ',');
      banner(`VLAG ${res.stage}!`, `${tijd} s · +${res.points}${res.record ? ' · ⏱️ record!' : ''}`, 'gold');
      const P = W.pose(g.car);
      const p = toCss(P.x, P.y - 1);
      fx.burst(p.x, p.y, { n: 26, color: '#ffc94a', speed: 380, life: .8, size: 4 });
      if (res.stage % 3 === 0) setTimeout(() => toast(`Welkom in de ${W.themeOf(res.stage).name}!`), 400);
      if (g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) {
        setTimeout(() => { if (g.state.phase === 'play') quiz.show(); else nextCar(); }, 450);
      } else setTimeout(nextCar, 700);
    });
  }

  // ---------- Besturing ----------
  const keys = { gas: false, rem: false };
  const KEYS = { arrowright: 'gas', d: 'gas', arrowup: 'gas', w: 'gas', z: 'gas', ' ': 'gas', arrowleft: 'rem', a: 'rem', q: 'rem', arrowdown: 'rem', s: 'rem' };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('ww-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const key = e.key.toLowerCase();
    if (key === 'r') { e.preventDefault(); crash('reset'); return; }
    const k = KEYS[key];
    if (!k) return;
    e.preventDefault();
    sfx.unlock();
    keys[k] = true;
  });
  document.addEventListener('keyup', e => {
    const k = KEYS[e.key.toLowerCase()];
    if (k) keys[k] = false;
  });
  addEventListener('blur', () => { keys.gas = keys.rem = false; });
  AK.holdButton($('ww-gas'), down => { sfx.unlock(); keys.gas = down; });
  AK.holdButton($('ww-rem'), down => { sfx.unlock(); keys.rem = down; });
  $('ww-reset').addEventListener('click', () => crash('reset'));

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('ww-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('ww-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('ww-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('ww-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  const OUCH = {
    kop: 'Au, je hoofd! Terug naar de vlag.', put: 'In de put gevallen! Terug naar de vlag.', stekels: 'Au, stekels! Terug naar de vlag.',
    hamer: 'Geraakt door de stekelbal! Terug naar de vlag.', omver: 'Op je kop blijven liggen! Terug naar de vlag.', reset: 'Terug naar de vlag.',
  };

  // Gecrasht: de kar valt uit elkaar (wielen en bak vliegen weg) en je begint opnieuw aan de vlag.
  function crash(why) {
    if (!playing() || quiz.open || g.dead > 0 || g.pending) return;
    const c = g.car, P = W.pose(c);
    g.dead = why === 'reset' ? .35 : W.RESPAWN_S;
    const vx = (c.b.vx + c.f.vx) / 2, vy = (c.b.vy + c.f.vy) / 2;
    g.wreck = why === 'reset' ? null : {
      body: { x: P.x, y: P.y, vx: vx * .5, vy: Math.min(vy, 0) - 7, a: P.a, va: (Math.random() < .5 ? -1 : 1) * (4 + Math.random() * 4) },
      wheels: [[c.b, -1], [c.f, 1]].map(([w, s]) => ({ x: w.x, y: w.y, vx: vx * .4 + s * (2 + Math.random() * 3), vy: -5 - Math.random() * 4, rot: 0, va: s * 9 })),
      veh: c.veh,
    };
    if (why !== 'reset') {
      const p = toCss(P.x, P.y - .8);
      fx.burst(p.x, p.y, { n: 34, color: why === 'put' ? '#ff8c42' : '#ff4d6d', speed: 420, life: .7, size: 4 });
      fx.shock(p.x, p.y, 60, '#ffc94a');
      sfx.boom();
      buzz([120, 60, 120]);
      socket.emit('ww-fall');
    }
    toast(OUCH[why] || OUCH.kop, why === 'reset' ? '' : 'bad');
  }

  // ---------- Elke frame ----------
  const canvas = $('ww-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 1, h: 1, S: 40, dpr: 1 };
  function toCss(x, y) {
    const c = g.cam || W.pose(g.car);
    return { x: ((x - c.x) * view.S + view.w / 2) / view.dpr, y: ((y - c.y) * view.S + view.h / 2) / view.dpr };
  }

  let last = performance.now();
  let dust = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('ww-game').classList.contains('hidden')) { if (on()) sfx.engine(0); return; }
    const left = g.state.endsAt - now();
    $('ww-clock').textContent = AK.clock(left);
    $('ww-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('ww-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('ww-countdown').textContent = Math.ceil(wait / 1000);
    const c = g.car;
    const time = gameTime();
    let gas = false;
    if (playing() && !quiz.open && !g.pending) {
      if (g.dead > 0) {
        g.dead -= dt;
        if (g.wreck) {
          const b = g.wreck.body;
          b.vy += 22 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
          for (const w of g.wreck.wheels) { w.vy += 22 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.rot += w.va * dt; }
        }
        if (g.dead <= 0) respawn(g.stage);
      } else {
        g.stageT += dt;
        g.turbo = Math.max(0, g.turbo - dt);
        g.safe = Math.max(0, g.safe - dt);
        gas = keys.gas;
        const hit = W.step(g.state.seed, c, keys, dt, time, g.turbo > 0);
        const P = W.pose(c);
        // Op je kop blijven liggen telt ook als crash.
        // Op je kop of rechtop op de grond blijven staan: na even wachten terug naar de vlag.
        if ((P.ny > .15 || Math.abs(P.a) > 1.1) && (c.cb || c.cf || Math.abs(c.speed) < 2)) g.upside += dt; else g.upside = 0;
        if (c.landed) {
          const p = toCss(P.x, P.y + c.veh.r);
          fx.smoke(p.x, p.y, { n: 6, size: 10, life: .45, speed: 60, color: 'rgba(220,210,190,.4)' });
          sfx.hit && sfx.hit();
        }
        if (gas && (c.cb || c.cf) && (dust += dt) > .06) {
          dust = 0;
          const w = c.cb ? c.b : c.f;
          const p = toCss(w.x - c.veh.r * .6, w.y + c.veh.r * .8);
          fx.smoke(p.x, p.y, { n: 1, size: 7, life: .4, speed: 40, color: c.veh.ice ? 'rgba(200,240,255,.5)' : 'rgba(200,180,150,.35)' });
        }
        if (hit && (g.safe <= 0 || hit === 'put')) crash(hit);
        else if (g.upside > 1.2) crash('omver');
        else {
          // Munten rapen
          for (const st of W.near(g.state.seed, P.x)) {
            for (const m of st.coins) {
              if (g.hide.has(m.id) || Math.abs(m.x - P.x) > c.veh.D / 2 + .4 || Math.abs(m.y - (P.y - .6)) > 1.4) continue;
              g.hide.add(m.id);
              socket.emit('ww-cell', m.id);
              sfx.marker();
              const p = toCss(m.x, m.y);
              fx.sparks(p.x, p.y, { n: 8, color: '#ffc94a', speed: 300 });
              fx.pop(p.x, p.y - 10, '+10', '#ffc94a', 22, .8);
            }
          }
          if (P.x >= (g.stage + 1) * W.L) reachFlag(g.stage + 1);
        }
      }
    }
    // Ook tijdens een vraag: zo staat de nieuwe kar op het bord meteen goed aan de vlag.
    if (playing() && t - g.sentAt > 100) {
      g.sentAt = t;
      const P = W.pose(c);
      socket.emit('ww-pos', { x: Math.round(P.x * 100) / 100, y: Math.round(P.y * 100) / 100, a: Math.round(P.a * 100) / 100, f: (gas ? 1 : 0) | (g.turbo > 0 ? 4 : 0) | (g.dead > 0 ? 8 : 0) });
    }
    sfx.engine(gas ? (g.turbo > 0 ? 1.2 : .45 + Math.min(.6, Math.abs(c.speed) / 20)) : (g.dead > 0 || quiz.open ? 0 : .15));

    $('ww-flags').textContent = `🏁 ${g.stage}`;
    $('ww-time').textContent = `⏱ ${g.stageT.toFixed(1).replace('.', ',')}`;
    $('ww-car').classList.toggle('turbo', g.turbo > 0);

    // Camera: een beetje vooruit kijken, en de kar iets onder het midden.
    const fit = AK.fit(canvas, 1.5);
    const S = Math.min(fit.h / 12.5, fit.w / (fit.w > fit.h ? 21 : 10.5));
    view = { w: fit.w, h: fit.h, S, dpr: fit.dpr };
    const viewW = fit.w / S, viewH = fit.h / S;
    const P = W.pose(c);
    const wantX = P.x + Math.min(viewW * .18, 3 + Math.max(0, c.speed) * .25);
    const wantY = Math.min(P.y - .9, W.PIT + 1.6 - viewH / 2);
    if (!g.cam) g.cam = { x: wantX, y: wantY };
    if (g.dead <= 0) {
      g.cam.x += (wantX - g.cam.x) * Math.min(1, dt * 4);
      g.cam.y += (wantY - g.cam.y) * Math.min(1, dt * 3);
    }
    const ghosts = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r || (v[3] & 8)) continue;
      if (Math.abs(v[0] - P.x) > viewW) continue;
      const veh = W.vehicleOf(v[4]);
      const prev = g.rot.get(n) || { x: v[0], r: 0 };
      prev.r += (v[0] - prev.x) / veh.r;
      prev.x = v[0];
      g.rot.set(n, prev);
      const near = Math.abs(v[0] - P.x) < 3 && Math.abs(v[1] - P.y) < 2;
      ghosts.push({ x: v[0], y: v[1], a: v[2], veh, gas: v[3] & 1, turbo: v[3] & 4, color: r.color, alpha: near ? .2 : .42, name: near ? '' : r.name, rb: prev.r, rf: prev.r });
    }
    const me = g.dead > 0 ? null : { x: P.x, y: P.y, a: P.a, veh: c.veh, rb: c.rb, rf: c.rf, gas, turbo: g.turbo > 0, color: g.color, blink: g.safe > 0, rim: true };
    WwDraw.render(ctx, fit.w, fit.h, {
      seed: g.state.seed, t: time, cx: g.cam.x, cy: g.cam.y, S, ghosts, hide: g.hide, passed: g.stage, me, wip: c.wip, loadX: P.x,
    });
    if (g.wreck) drawWreck(fit, S);
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }

  // De brokstukken na een crash: de bak tolt weg, de wielen rollen er los vandoor.
  function drawWreck(fit, S) {
    const k = S / 64;
    const X = x => (x - g.cam.x) * S + fit.w / 2, Y = y => (y - g.cam.y) * S + fit.h / 2;
    const w = g.wreck;
    const body = WwDraw.bodySprite(w.veh, g.color);
    ctx.save();
    ctx.translate(X(w.body.x), Y(w.body.y));
    ctx.rotate(-w.body.a);
    ctx.drawImage(body, -body.ox * k, -body.oy * k, body.width * k, body.height * k);
    ctx.restore();
    const ws = WwDraw.wheelSprite(w.veh);
    for (const wh of w.wheels) {
      ctx.save();
      ctx.translate(X(wh.x), Y(wh.y));
      ctx.rotate(wh.rot);
      ctx.drawImage(ws, -ws.width / 2 * k, -ws.height / 2 * k, ws.width * k, ws.height * k);
      ctx.restore();
    }
  }
  requestAnimationFrame(frame);
})();
