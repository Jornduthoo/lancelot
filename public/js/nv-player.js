// Neonvlucht op de gsm of Chromebook: rennen, springen, glijden en opzij door de neonburcht.
// Af en toe een vraag: de drie banen worden poorten. Loop door de juiste poort voor turbo, een schild en een hogere ×.
// Toetsen: ←/→ (of Q/D, A/D) opzij, ↑/spatie springen, ↓ glijden. Gsm: vegen, tikken = springen.
// Je eigen ridder beweegt meteen; de anderen zie je als schimmen op hun echte plek.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, NvWorld en NvDraw.
(() => {
  const W = NvWorld;
  const root = document.createElement('div');
  root.id = 'vlucht';
  root.innerHTML = `
  <form id="nv-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Neonvlucht</p>
    <input id="nv-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="nv-join-error"></p>
    <button type="submit" class="big">Naar de start</button>
  </form>
  <section id="nv-lobby" class="screen panel hidden">
    <p class="status">Neonvlucht</p>
    <p class="title" id="nv-lobby-name"></p>
    <p>Ren zo ver je kan door de <strong>neonburcht</strong>. Spring over rode lasers, glij onder paarse balken en ga opzij voor kisten.</p>
    <p><strong>Vraagpoort!</strong> De banen tonen een antwoord. Loop door de juiste poort: ⚡ turbo, 🛡️ schild en je vermenigvuldiger gaat omhoog (tot ×5).</p>
    <p class="muted small">Foute poort: je struikelt en je ×-teller valt terug naar 1. Met munten krijg je een mooier lichtspoor.</p>
    <p class="muted small ls-hint-touch">Veeg naar links of rechts, omhoog = springen, omlaag = glijden. Of tik op een antwoord.</p>
    <p class="muted small ls-hint-keys">←/→ opzij · ↑ of spatie springen · ↓ glijden · 1-3 naar die poort</p>
    <div class="spinner"></div>
  </section>
  <section id="nv-game" class="ak-game nv-game hidden">
    <div class="ls-hud ak-hud">
      <div class="nv-score" id="nv-score"></div>
      <div class="nv-mult" id="nv-mult"></div>
      <div class="ry-ammo" id="nv-coins"></div>
      <div class="ry-alive" id="nv-rank"></div>
      <div class="ls-clock" id="nv-clock"></div>
    </div>
    <div class="ls-stage" id="nv-stage">
      <canvas id="nv-canvas"></canvas>
      <div class="nv-q hidden" id="nv-q"><p id="nv-q-text"></p><div class="nv-q-answers" id="nv-q-answers"></div></div>
      <div class="ls-banner" id="nv-banner"></div>
      <div class="tw-toast" id="nv-toast"></div>
      <div class="tw-countdown hidden" id="nv-countdown"></div>
      <p class="ls-keys">←/→ opzij · ↑ springen · ↓ glijden · 1-3 poort</p>
    </div>
  </section>
  <section id="nv-end" class="screen panel hidden">
    <div class="mark" id="nv-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="nv-end-title"></p>
    <p class="big" id="nv-end-score" style="font-size:1.6rem"></p>
    <p id="nv-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const fresh = () => ({
    z: 0, x: W.LANE_X[1], lane: 1, y: 0, vy: 0, slide: 0, turbo: 0, stumble: 0, shield: 0, coins: 0, crash: false,
    gate: null, asking: false, nextQ: 40, hide: new Set(), sentAt: 0, stride: 0, clear: null,
  });
  const g = { state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), others: new Map(), r: fresh() };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.nv === '1';
  const show = name => { for (const s of ['nv-join', 'nv-lobby', 'nv-game', 'nv-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('nv-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('nv-join-error').textContent = res.error;
        show('nv-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('nv-join-error').textContent = '';
    });
  }
  $('nv-join').addEventListener('submit', e => { e.preventDefault(); join($('nv-name').value); });

  socket.on('nv-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.nv = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.r = fresh();
      g.others.clear();
      hideQ();
      delete $('nv-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('nv-name').value = saved || '';
        show('nv-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    // Terug na herladen: verder vanaf waar de server je zag.
    if (s.phase === 'play' && s.z > g.r.z + 5) { g.r.z = s.z; g.r.nextQ = s.z + 30; }
    if (s.phase === 'lobby') {
      $('nv-lobby-name').textContent = s.name;
      show('nv-lobby');
    } else if (s.phase === 'play') {
      show('nv-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('nv-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
    } else if (s.phase === 'einde') {
      hideQ();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('nv-end-medal').textContent = medals[me.rank - 1] || '⚡';
      $('nv-end-title').textContent = me.rank === 1 ? 'Jij wint de Neonvlucht!' : `Plek ${me.rank} van ${me.players}`;
      $('nv-end-score').textContent = `${me.score || 0} punten · ${me.dist || 0} meter`;
      $('nv-end-stats').textContent = `${s.right} ${s.right === 1 ? 'poort' : 'poorten'} juist · ${me.coins || 0} munten`;
      if (!$('nv-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('nv-end').dataset.done = '1';
      show('nv-end');
    }
  });

  socket.on('nv-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('nv-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('nv-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('nv-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    const t = performance.now();
    for (const [n, z, lane, mult, flags, coins] of msg.r) {
      if (g.me && n === g.me.n) continue;
      let o = g.others.get(n);
      if (!o) { o = { z, lane, x: W.LANE_X[lane], v: 0, t, coins }; g.others.set(n, o); }
      o.v = Math.max(0, Math.min(45, (z - o.z) / Math.max(.05, (t - o.t) / 1000)));
      o.z = z; o.t = t; o.lane = lane; o.flags = flags; o.coins = coins; o.mult = mult;
    }
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    if (old && W.trailOf(old.coins).name !== W.trailOf(me.coins).name) {
      banner('NIEUW LICHTSPOOR!', W.trailOf(me.coins).name, 'gold');
      sfx.fanfare();
    }
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('nv-score').textContent = `⚡ ${me.score}`;
    $('nv-mult').textContent = `×${me.mult}`;
    $('nv-mult').dataset.m = me.mult;
    $('nv-coins').textContent = `🪙 ${g.r.coins}`;
    $('nv-rank').textContent = me.rank ? `#${me.rank}` : '';
  }

  // ---------- Vraagpoorten ----------
  function askQuestion() {
    const r = g.r;
    if (r.asking || r.gate) return;
    r.asking = true;
    socket.emit('nv-question', null, res => {
      r.asking = false;
      if (!res || res.error) {
        r.nextQ = r.z + W.speed(progress()) * Math.max(1.5, (res && res.wait ? res.wait : 2000) / 1000);
        return;
      }
      const read = Math.max(4, Math.min(9, 2.8 + (res.question.length + res.answers.join('').length) * .035));
      const lead = W.speed(progress()) * .45 * read;
      r.gate = { z: r.z + lead, answers: res.answers, question: res.question, picked: -1 };
      r.clear = [r.z + 2, r.gate.z + 9];
      showQ(res);
      sfx.gong();
      buzz(40);
    });
  }

  function showQ(res) {
    $('nv-q-text').textContent = res.question;
    const lanes = res.answers.length === 2 ? [0, 2] : [0, 1, 2];
    $('nv-q-answers').innerHTML = res.answers.map((a, i) => `<button type="button" class="nv-a" style="--c:${NvDraw.GATE_COL[i]}" data-lane="${lanes[i]}"><b>${'ABC'[i]}</b><span></span></button>`).join('');
    [...$('nv-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toLane(Number(b.dataset.lane)); });
    });
    $('nv-q').classList.remove('hidden');
  }
  function hideQ() { $('nv-q').classList.add('hidden'); }

  function passGate() {
    const r = g.r, gt = r.gate;
    const lanes = gt.answers.length === 2 ? [0, 2] : [0, 1, 2];
    const pos = lanes.indexOf(r.lane);
    r.gate = null;
    if (pos < 0) {
      // Midden tegen de muur bij een vraag met twee antwoorden: struikelen, de vraag komt zo terug.
      hit('muur');
      r.nextQ = r.z + 25;
      return;
    }
    gt.picked = pos;
    socket.emit('nv-answer', pos, res => {
      hideQ();
      const base = W.speed(progress());
      if (!res || res.error) { r.nextQ = r.z + base * 3; return; }
      if (res.correct) {
        r.turbo = W.TURBO.s;
        r.shield = 1;
        sfx.good();
        sfx.power();
        buzz([30, 40, 30]);
        banner(`JUIST! ×${res.mult}`, `+${res.bonus * res.mult} · ⚡ turbo · 🛡️ schild`, 'gold');
        fx.burst(innerWidth / 2, innerHeight * .6, { n: 30, color: '#ffc94a', speed: 420, life: .8, size: 4 });
        r.nextQ = r.z + base * 6.5;
      } else {
        r.stumble = W.STUMBLE.s;
        sfx.bad();
        buzz(220);
        banner('FOUTE POORT', `Het juiste antwoord was ${'ABC'[res.right]}: ${gt.answers[res.right]}`, 'bad');
        r.nextQ = r.z + base * (5.5 + (res.wait || 0) / 1000);
      }
      g.me && Object.assign(g.me, { mult: res.mult });
      hud();
    });
  }

  // ---------- Besturing ----------
  function toLane(l) {
    const r = g.r;
    if (!playing()) return;
    r.lane = Math.max(0, Math.min(2, l));
  }
  function move(d) { toLane(g.r.lane + d); sfx.swoosh && sfx.swoosh(); }
  function jump() {
    const r = g.r;
    if (!playing() || r.y > .05) return;
    r.vy = W.JUMP.v;
    r.slide = 0;
    sfx.jump();
  }
  function slide() {
    const r = g.r;
    if (!playing()) return;
    if (r.y > .05) r.vy = -W.JUMP.v * 1.4;
    r.slide = W.SLIDE_S;
    sfx.whoosh();
  }
  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('nv-game').classList.contains('hidden');
  }

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('nv-game').classList.contains('hidden')) return;
    const k = e.key.toLowerCase();
    if (['arrowleft', 'a', 'q'].includes(k)) { e.preventDefault(); if (!e.repeat) move(-1); }
    else if (['arrowright', 'd'].includes(k)) { e.preventDefault(); if (!e.repeat) move(1); }
    else if (['arrowup', 'w', 'z', ' '].includes(k)) { e.preventDefault(); jump(); }
    else if (['arrowdown', 's'].includes(k)) { e.preventDefault(); slide(); }
    else if (/^[1-3]$/.test(k) && g.r.gate) {
      const lanes = g.r.gate.answers.length === 2 ? [0, 2] : [0, 1, 2];
      const l = lanes[Number(k) - 1];
      if (l !== undefined) toLane(l);
    }
  });

  // Vegen op de gsm: links/rechts opzij, omhoog springen, omlaag glijden. Tikken is ook springen.
  const stage = $('nv-stage');
  let touch = null;
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target.closest('button')) return;
    sfx.unlock();
    touch = { x: e.clientX, y: e.clientY, done: false };
  });
  stage.addEventListener('pointermove', e => {
    if (!touch || touch.done) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    touch.done = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
    else slide();
  });
  stage.addEventListener('pointerup', () => { if (touch && !touch.done) jump(); touch = null; });
  stage.addEventListener('pointercancel', () => { touch = null; });
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && !e.target.closest('button')) { sfx.unlock(); jump(); } });

  // ---------- Botsen ----------
  function hit(kind) {
    const r = g.r;
    if (r.turbo > 0) {
      fx.sparks(innerWidth / 2, innerHeight * .55, { n: 16, color: '#bff3ff', speed: 520 });
      sfx.hit();
      return;
    }
    if (r.shield) {
      r.shield = 0;
      r.stumble = .25;
      fx.burst(innerWidth / 2, innerHeight * .55, { n: 24, color: '#4cc9ff', speed: 380, life: .6, size: 4 });
      sfx.hit();
      buzz(80);
      toast('🛡️ Je schild ving de klap op!');
      return;
    }
    r.stumble = W.STUMBLE.s;
    r.crash = true;
    sfx.boom();
    buzz([120, 60, 120]);
    toast(kind === 'muur' ? 'Bots! Kies een poort met een antwoord.' : 'Au! Gestruikeld…', 'bad');
  }

  function progress() {
    if (!g.state) return 0;
    return (now() - g.state.startedAt) / Math.max(1, g.state.endsAt - g.state.startedAt);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('nv-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('nv-banner');
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

  // ---------- Elke frame ----------
  const canvas = $('nv-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('nv-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('nv-clock').textContent = AK.clock(left);
    $('nv-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('nv-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('nv-countdown').textContent = Math.ceil(wait / 1000);
    const r = g.r;
    if (playing()) {
      const base = W.speed(progress());
      let v = base;
      if (r.turbo > 0) v *= W.TURBO.mult;
      if (r.stumble > 0) v *= W.STUMBLE.k;
      if (r.gate && r.z < r.gate.z) v *= .45;
      const z0 = r.z;
      r.z += v * dt;
      r.stride += v * dt * 1.15;
      r.turbo = Math.max(0, r.turbo - dt);
      r.stumble = Math.max(0, r.stumble - dt);
      r.slide = Math.max(0, r.slide - dt);
      r.x += Math.max(-14 * dt, Math.min(14 * dt, W.LANE_X[r.lane] - r.x));
      if (r.y > 0 || r.vy > 0) {
        r.vy -= W.JUMP.g * dt;
        r.y = Math.max(0, r.y + r.vy * dt);
        if (r.y === 0) r.vy = 0;
      }
      const laneNow = W.LANE_X.reduce((best, lx, i) => (Math.abs(lx - r.x) < Math.abs(W.LANE_X[best] - r.x) ? i : best), 0);
      for (const o of W.between(g.state.seed, z0, r.z)) {
        if (o.z <= z0 || o.lane !== laneNow) continue;
        if (r.clear && o.z >= r.clear[0] && o.z <= r.clear[1]) continue;
        if (o.type === 'munt') {
          if (r.hide.has(o.id) || Math.abs(r.y + .5 - (o.y + .35)) > 1.1) continue;
          r.hide.add(o.id);
          r.coins++;
          sfx.marker();
          fx.sparks(canvas.clientWidth / 2 + (r.x - r.x * .55) * 30, canvas.clientHeight * .62, { n: 5, color: '#ffe08a', speed: 260 });
          hud();
        } else if (o.type === 'blok' || (o.type === 'laag' && r.y < .55) || (o.type === 'hoog' && r.slide <= 0)) hit(o.type);
      }
      if (r.gate && r.z >= r.gate.z) passGate();
      if (!r.gate && !r.asking && r.z >= r.nextQ) askQuestion();
      if (t - r.sentAt > 200) {
        r.sentAt = t;
        socket.emit('nv-pos', { z: Math.round(r.z * 10) / 10, lane: r.lane, coins: r.coins, crash: r.crash, flags: (r.turbo > 0 ? 1 : 0) | (r.stumble > 0 ? 2 : 0) | (r.y > 0 ? 4 : 0) });
        r.crash = false;
      }
    }
    // De anderen: tussen twee berichten verder laten lopen.
    const ghosts = [];
    for (const [n, o] of g.others) {
      const who = g.roster.get(n);
      if (!who) continue;
      const z = o.z + o.v * Math.min(.4, (t - o.t) / 1000);
      o.x = o.x === undefined ? W.LANE_X[o.lane] : o.x + (W.LANE_X[o.lane] - o.x) * Math.min(1, dt * 10);
      if (Math.abs(z - r.z) > 70) continue;
      const near = z - r.z < 4;
      ghosts.push({ x: o.x, z, y: o.flags & 4 ? .6 : 0, color: who.color, name: near ? '' : who.name, alpha: near ? .18 : .38, coins: o.coins, stride: z * 1.15, turbo: o.flags & 1 });
    }
    const { w, h } = AK.fit(canvas, 1.25);
    const mine = g.me && g.roster.get(g.me.n);
    NvDraw.render(ctx, w, h, {
      z: r.z, x: r.x, seed: g.state.seed, t: t / 1000, ghosts, hide: r.hide, clear: r.clear, gate: r.gate,
      me: { x: r.x, y: r.y, z: r.z, color: mine ? mine.color : '#4cc9ff', slide: r.slide > 0 ? 1 : 0, stride: r.stride, turbo: r.turbo > 0, shield: r.shield, coins: r.coins },
    });
    fx.update(dt);
    ctx.save();
    ctx.scale(w / canvas.clientWidth, h / canvas.clientHeight);
    fx.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
