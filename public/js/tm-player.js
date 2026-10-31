// Tuimelridder op de Chromebook of gsm: rij met je ridder op een rijmachine door het stuntparcours, van vlag naar vlag.
// De hele baan draait hier (geen vertraging); de server krijgt je plek en de vlaggen, en geeft de vragen.
// Aan de start en na elke finish kies je een rijmachine. Chromebook: → of ↑ gas, ← of ↓ remmen (in de lucht: kantelen), R = terug naar de vlag.
// Gsm: twee grote pedalen. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, TmWorld en TmDraw.
(() => {
  const W = TmWorld;
  const root = document.createElement('div');
  root.id = 'tuimel';
  root.innerHTML = `
  <form id="tm-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Tuimelridder</p>
    <input id="tm-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="tm-join-error"></p>
    <button type="submit" class="big">Naar de start</button>
  </form>
  <section id="tm-lobby" class="screen panel hidden">
    <p class="status">Tuimelridder</p>
    <canvas id="tm-lobby-art" width="220" height="150"></canvas>
    <p class="title" id="tm-lobby-name"></p>
    <p>Rij met je ridder door het <strong>stuntparcours</strong>: springplanken, zwaaiende hamers, laserpoorten en kanonnen.</p>
    <p><strong>Pas op je helm!</strong> Raak je iets, dan tuimel je eraf en begin je opnieuw bij de vlag.</p>
    <p><strong>Elke vlag is een vraag</strong> (juist = ⚡ turbo). Aan de finish krijg je sterren: <strong>geen enkele val = ⭐⭐⭐</strong>.</p>
    <p class="muted small ls-hint-touch">Rechts = gas · links = rem. In de lucht kantel je ermee.</p>
    <p class="muted small ls-hint-keys">→ of ↑ gas · ← of ↓ rem · in de lucht kantel je mee · R = terug naar de vlag · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="tm-game" class="ak-game hidden">
    <div class="ls-hud ak-hud tm-hud">
      <div class="sv-mass" id="tm-score">0</div>
      <div class="px-chip" id="tm-flags">🏁</div>
      <div class="px-chip" id="tm-stars">⭐ 0</div>
      <div class="px-chip tm-car" id="tm-car"></div>
      <div class="ry-alive" id="tm-rank"></div>
      <div class="ls-clock" id="tm-clock"></div>
    </div>
    <div class="ls-stage" id="tm-stage">
      <canvas id="tm-canvas"></canvas>
      <div class="ls-feed" id="tm-feed"></div>
      <div class="ls-banner" id="tm-banner"></div>
      <div class="tw-toast" id="tm-toast"></div>
      <div class="tw-countdown hidden" id="tm-countdown"></div>
      <button class="ww-reset" id="tm-reset" type="button" title="Terug naar de vlag (R)">↺</button>
      <div class="ww-pedals">
        <button class="ww-pedal rem" id="tm-rem" type="button">◀<small>rem</small></button>
        <button class="ww-pedal gas" id="tm-gas" type="button">▶<small>gas</small></button>
      </div>
      <div class="tm-pick hidden" id="tm-pick">
        <div class="panel">
          <p class="title" id="tm-pick-title">Kies je rijmachine</p>
          <div class="tm-pick-list" id="tm-pick-list"></div>
        </div>
      </div>
    </div>
  </section>
  <section id="tm-end" class="screen panel hidden">
    <div class="mark" id="tm-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="tm-end-title"></p>
    <p class="big" id="tm-end-score" style="font-size:1.6rem"></p>
    <p id="tm-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff',
    vi: 0, car: W.spawn(0, 0), stage: 0, stageT: 0, flagBusy: false, sentAt: 0, others: new AK.Interp(110), cam: null,
    dead: 0, doll: null, wreck: null, safe: 0, turbo: 0, upside: 0, pending: false, picking: false, rot: new Map(),
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.tm === '1';
  const show = name => { for (const s of ['tm-join', 'tm-lobby', 'tm-game', 'tm-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('tm-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('tm-join-error').textContent = res.error;
        show('tm-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('tm-join-error').textContent = '';
    });
  }
  $('tm-join').addEventListener('submit', e => { e.preventDefault(); join($('tm-name').value); });

  function respawn(k) {
    g.car = W.spawn(k, g.vi);
    g.dead = 0;
    g.doll = null;
    g.wreck = null;
    g.upside = 0;
    g.safe = .8;
    g.cam = null;
    carChip();
  }
  function carChip() {
    const v = W.vehicleOf(g.vi);
    $('tm-car').textContent = `${v.icon} ${v.name}`;
  }

  // ---------- Een rijmachine kiezen ----------
  const pickCanvases = [];
  W.VEHICLES.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tm-pick-car';
    b.innerHTML = `<canvas width="180" height="130"></canvas><strong>${v.icon} ${v.name}</strong><small>${v.tip}</small>`;
    b.addEventListener('click', () => pick(i));
    $('tm-pick-list').appendChild(b);
    pickCanvases.push(b.querySelector('canvas'));
  });
  function openPick(title) {
    g.picking = true;
    $('tm-pick-title').textContent = title;
    pickCanvases.forEach((c, i) => { TmDraw.preview(c, i, g.color); c.parentNode.classList.toggle('on', i === g.vi); });
    $('tm-pick').classList.remove('hidden');
  }
  function pick(i) {
    g.vi = i;
    g.picking = false;
    $('tm-pick').classList.add('hidden');
    socket.emit('tm-veh', i);
    store('tm-vi', String(i));
    respawn(g.stage);
    g.stageT = 0;
    const v = W.vehicleOf(i);
    banner(`${v.icon} ${v.name}!`, v.tip, 'gold');
    sfx.whoosh();
  }
  document.addEventListener('keydown', e => {
    if (!g.picking || !on()) return;
    const i = Number(e.key) - 1;
    if (i >= 0 && i < W.VEHICLES.length) { e.preventDefault(); pick(i); }
  });

  socket.on('tm-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.tm = s.active ? '1' : '';
    if (!s.active) { g.joined = false; sfx.engine(0); return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.stage = 0;
      g.stageT = 0;
      g.flagBusy = false;
      g.pending = false;
      g.turbo = 0;
      g.others.clear();
      g.vi = Number(store('tm-vi')) || 0;
      g.needPick = true;
      respawn(0);
      quiz.close();
      delete $('tm-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('tm-name').value = saved || '';
        show('tm-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    if (s.phase === 'play' && Number.isInteger(s.stage) && s.stage > g.stage) {
      g.stage = s.stage;
      if (Number.isInteger(s.vi)) g.vi = s.vi;
      g.needPick = false;
      respawn(g.stage);
    }
    if (s.phase === 'lobby') {
      $('tm-lobby-name').textContent = s.name;
      TmDraw.preview($('tm-lobby-art'), g.vi, g.color);
      show('tm-lobby');
    } else if (s.phase === 'play') {
      show('tm-game');
      carChip();
      $('tm-game').style.setProperty('--team', g.color);
      if (g.needPick) { g.needPick = false; openPick('Kies je rijmachine'); }
    } else if (s.phase === 'einde') {
      quiz.close();
      sfx.engine(0);
      g.picking = false;
      $('tm-pick').classList.add('hidden');
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('tm-end-medal').textContent = medals[me.rank - 1] || '🛡️';
      $('tm-end-title').textContent = me.rank === 1 ? 'Jij bent de beste Tuimelridder!' : `Plek ${me.rank} van ${me.players}`;
      $('tm-end-score').textContent = `${me.score || 0} punten`;
      $('tm-end-stats').textContent = `${me.stage || 0} ${me.stage === 1 ? 'vlag' : 'vlaggen'} · ⭐ ${me.stars || 0} · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('tm-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('tm-end').dataset.done = '1';
      show('tm-end');
    }
  });

  socket.on('tm-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('tm-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('tm-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('tm-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    for (const [n, x, y, a, f, st, vi] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.others.get(n);
      g.others.push(n, [x, y, a, f, st, vi], t);
      if (before && st > before[4] && W.isFinish(st) && Math.abs(st - g.stage) <= 2) feedLine(`🏁 ${nameOf(n)} haalt de finish`);
    }
    g.others.prune(t, 800);
  });

  function setMe(me) {
    g.me = me;
    $('tm-score').textContent = me.score;
    $('tm-stars').textContent = `⭐ ${me.stars}`;
    $('tm-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  // ---------- Vragen aan de vlag ----------
  let afterQuiz = null;
  const quiz = AK.quiz({
    root: $('tm-game'),
    closeText: 'Verder rijden',
    lock: 350,
    status: () => `Vlag ${g.stage} · juist = ⚡ turbo`,
    ask: cb => socket.emit('tm-question', null, cb),
    answer: (i, cb) => socket.emit('tm-answer', i, res => {
      if (res && res.correct) { g.turbo = res.turbo || W.TURBO_S; sfx.power(); }
      cb(res);
    }),
    good: res => `Juist! ⚡ Turbo: je rijdt even sneller. +${res.points}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('tm-asking', false);
      flagDone();
    },
  });
  function flagDone() {
    g.stageT = 0;
    g.pending = false;
    g.safe = .8;
    const fn = afterQuiz;
    afterQuiz = null;
    if (fn) fn();
  }

  function reachFlag(k) {
    if (g.flagBusy) return;
    g.flagBusy = true;
    socket.emit('tm-flag', k, res => {
      g.flagBusy = false;
      if (!res || res.error) {
        if (res && Number.isInteger(res.stage) && res.stage > g.stage) g.stage = res.stage;
        return;
      }
      g.stage = res.stage;
      g.pending = true;
      respawn(g.stage);
      sfx.go();
      buzz([30, 40, 30]);
      const tijd = (res.s || 0).toFixed(1).replace('.', ',');
      const course = W.THEMES[W.courseOf(k - 1)].name;
      if (W.isFinish(k)) {
        banner(`FINISH! ${'⭐'.repeat(res.stars)}`, res.stars === 3 ? `${course} zonder één val! +${res.points}` : `${course} · +${res.points}`, 'gold');
        sfx.fanfare && sfx.fanfare();
        if (res.stars === 3) confetti(2500);
        afterQuiz = () => openPick(`Op naar ${W.THEMES[W.courseOf(k)].name}! Kies je rijmachine`);
      } else banner(`VLAG ${k % W.PER}!`, `${tijd} s · +${res.points}${res.record ? ' · ⏱️ record!' : ''}`, 'gold');
      fx.burst(view.w / 2 / view.dpr, view.h / 2 / view.dpr, { n: 26, color: '#ffc94a', speed: 380, life: .8, size: 4 });
      if (g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) {
        setTimeout(() => { if (g.state.phase === 'play') quiz.show(); else flagDone(); }, W.isFinish(k) ? 1300 : 450);
      } else setTimeout(flagDone, 700);
    });
  }

  // ---------- Besturing ----------
  const keys = { gas: false, rem: false };
  const KEYS = { arrowright: 'gas', d: 'gas', arrowup: 'gas', w: 'gas', z: 'gas', ' ': 'gas', arrowleft: 'rem', a: 'rem', q: 'rem', arrowdown: 'rem', s: 'rem' };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('tm-game').classList.contains('hidden') || g.picking) return;
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
  AK.holdButton($('tm-gas'), down => { sfx.unlock(); keys.gas = down; });
  AK.holdButton($('tm-rem'), down => { sfx.unlock(); keys.rem = down; });
  $('tm-reset').addEventListener('click', () => crash('reset'));

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('tm-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('tm-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('tm-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('tm-banner');
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
    kop: 'Boing! Op je helm. Terug naar de vlag.', put: 'Plons in de put! Terug naar de vlag.', stekels: 'Au, kristalstekels! Terug naar de vlag.',
    hamer: 'Bonk! De hamer! Terug naar de vlag.', laser: 'Zap! De laser stond aan. Terug naar de vlag.', kanon: 'Boem! Een kanonbol! Terug naar de vlag.',
    omver: 'Op je kop blijven liggen! Terug naar de vlag.', reset: 'Terug naar de vlag.',
  };

  // Gecrasht: de ridder tuimelt eraf als een ledenpop, de rijmachine tolt weg, en je begint opnieuw aan de vlag.
  function crash(why) {
    if (!playing() || quiz.open || g.dead > 0 || g.pending || g.picking) return;
    const c = g.car;
    g.dead = why === 'reset' ? .35 : W.RESPAWN_S;
    if (why !== 'reset') {
      const kick = why === 'hamer' || why === 'kanon' ? -1 : 1;
      g.doll = W.ragdoll(W.riderPose(c), c.vx * .7 + (why === 'laser' ? -2 : 0), Math.min(c.vy, 0) - 6, kick * (3 + Math.random() * 3));
      g.wreck = { x: c.x, y: c.y, a: c.a, vi: g.vi, vx: c.vx * .5, vy: -4, va: (Math.random() < .5 ? -1 : 1) * 5, rot: c.rot };
      const p = toCss(c.x, c.y - .8);
      fx.burst(p.x, p.y, { n: 30, color: why === 'laser' ? '#ff4d6d' : '#ffc94a', speed: 380, life: .6, size: 4 });
      fx.shock(p.x, p.y, 50, '#ffc94a');
      sfx.boom();
      buzz([120, 60, 120]);
      socket.emit('tm-fall');
    }
    toast(OUCH[why] || OUCH.kop, why === 'reset' ? '' : 'bad');
  }

  // ---------- Elke frame ----------
  const canvas = $('tm-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 1, h: 1, S: 40, dpr: 1 };
  function toCss(x, y) {
    const c = g.cam || g.car;
    return { x: ((x - c.x) * view.S + view.w / 2) / view.dpr, y: ((y - c.y) * view.S + view.h / 2) / view.dpr };
  }

  let last = performance.now();
  let dust = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('tm-game').classList.contains('hidden')) { if (on()) sfx.engine(0); return; }
    const left = g.state.endsAt - now();
    $('tm-clock').textContent = AK.clock(left);
    $('tm-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('tm-countdown').classList.toggle('hidden', !(wait > 0) || g.picking);
    if (wait > 0) $('tm-countdown').textContent = Math.ceil(wait / 1000);
    const c = g.car;
    const time = gameTime();
    let gas = false;
    if (g.dead > 0) {
      g.dead -= dt;
      if (g.doll) W.ragdollStep(g.doll, dt);
      if (g.wreck) { const w = g.wreck; w.vy += 22 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.a += w.va * dt; }
      if (g.dead <= 0) respawn(g.stage);
    } else if (playing() && !quiz.open && !g.pending && !g.picking) {
      g.stageT += dt;
      g.turbo = Math.max(0, g.turbo - dt);
      g.safe = Math.max(0, g.safe - dt);
      gas = keys.gas;
      const hit = W.step(c, keys, dt, time, g.turbo > 0);
      // Op je kop of op je zij blijven liggen: na even wachten terug naar de vlag.
      if (Math.abs(Math.atan2(Math.sin(c.a), Math.cos(c.a))) > 1.3 && (c.contact || Math.abs(c.vx) < 1)) g.upside += dt; else g.upside = 0;
      if (c.landed) {
        const p = toCss(c.x, c.y + .6);
        fx.smoke(p.x, p.y, { n: 6, size: 10, life: .45, speed: 60, color: 'rgba(220,210,190,.4)' });
      }
      if (c.boing) { sfx.whoosh(); const p = toCss(c.x, c.y + .5); fx.burst(p.x, p.y, { n: 16, color: '#ffc94a', speed: 260, life: .5, size: 3 }); }
      if (gas && c.contact && (dust += dt) > .07) {
        dust = 0;
        const p = toCss(c.x - .8, c.y + .7);
        fx.smoke(p.x, p.y, { n: 1, size: 7, life: .4, speed: 40, color: 'rgba(200,180,150,.35)' });
      }
      if (hit && (g.safe <= 0 || hit === 'put')) crash(hit);
      else if (g.upside > 1.2) crash('omver');
      else if (c.x >= W.startX(g.stage + 1)) reachFlag(g.stage + 1);
    }
    if (playing() && t - g.sentAt > 100) {
      g.sentAt = t;
      const r2 = v => Math.round(v * 100) / 100;
      socket.emit('tm-pos', { x: r2(c.x), y: r2(c.y), a: r2(c.a), v: g.vi, f: (gas ? 1 : 0) | (g.turbo > 0 ? 4 : 0) | (g.dead > 0 ? 8 : 0) });
    }
    sfx.engine(gas ? (g.turbo > 0 ? 1.2 : .45 + Math.min(.6, Math.abs(c.speed) / 20)) : (g.dead > 0 || quiz.open || g.picking ? 0 : .15));

    $('tm-flags').textContent = `🏁 ${g.stage % W.PER}/${W.PER}`;
    $('tm-car').classList.toggle('turbo', g.turbo > 0);

    // Camera: een beetje vooruit kijken. Na een val volgt hij de ledenpop.
    const fit = AK.fit(canvas, 1.5);
    const S = Math.min(fit.h / 12, fit.w / (fit.w > fit.h ? 20 : 10));
    view = { w: fit.w, h: fit.h, S, dpr: fit.dpr };
    const viewW = fit.w / S, viewH = fit.h / S;
    const fx0 = g.doll ? g.doll.pts[2].x : c.x, fy0 = g.doll ? g.doll.pts[2].y : c.y;
    const wantX = fx0 + (g.doll ? 0 : Math.min(viewW * .18, 3 + Math.max(0, c.speed) * .25));
    const wantY = Math.min(fy0 - 1.2, W.PIT + 1.6 - viewH / 2);
    if (!g.cam) g.cam = { x: wantX, y: wantY };
    g.cam.x += (wantX - g.cam.x) * Math.min(1, dt * 4);
    g.cam.y += (wantY - g.cam.y) * Math.min(1, dt * 3);
    const riders = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r || (v[3] & 8)) continue;
      if (Math.abs(v[0] - c.x) > viewW) continue;
      const prev = g.rot.get(n) || { x: v[0], r: 0 };
      prev.r += (v[0] - prev.x) / .5;
      prev.x = v[0];
      g.rot.set(n, prev);
      const near = Math.abs(v[0] - c.x) < 3 && Math.abs(v[1] - c.y) < 2;
      riders.push({ x: v[0], y: v[1], a: v[2], vi: v[5], gas: v[3] & 1, turbo: v[3] & 4, color: r.color, alpha: near ? .2 : .42, name: near ? '' : r.name, rot: prev.r });
    }
    if (g.dead <= 0) riders.push({ x: c.x, y: c.y, a: c.a, vi: g.vi, rot: c.rot, gas, turbo: g.turbo > 0, color: g.color, blink: g.safe > 0 });
    TmDraw.render(ctx, fit.w, fit.h, {
      t: time, cx: g.cam.x, cy: g.cam.y, S, riders, passed: g.stage, wip: c.wip,
      wrecks: g.wreck ? [g.wreck] : [], dolls: g.doll ? [{ rd: g.doll, color: g.color }] : [],
    });
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
