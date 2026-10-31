// Sterrenvreter op de gsm of Chromebook: eet sterrenstof en kleinere ridders, ontvlucht de groten en blijf weg van het zwarte gat.
// Je eigen bol beweegt meteen (geen wachten op de server); de anderen tekenen we vloeiend tussen twee berichten in.
// Sturen: duim links (gsm), pijltjes/ZQSD/WASD, of gewoon met de muis/touchpad wijzen (Chromebook).
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, SvWorld en SvDraw.
(() => {
  const root = document.createElement('div');
  root.id = 'sterren';
  root.innerHTML = `
  <form id="sv-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Sterrenvreter</p>
    <input id="sv-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="sv-join-error"></p>
    <button type="submit" class="big">De ruimte in</button>
  </form>
  <section id="sv-lobby" class="screen panel hidden">
    <p class="status">Sterrenvreter</p>
    <p class="title" id="sv-lobby-name"></p>
    <p>Jij bent een gloeiende <strong>ridderbol</strong> in de ruimte. Eet sterrenstof en <strong>kleinere ridders</strong> om te groeien. Ben je kleiner? Vluchten!</p>
    <p><strong>Goede antwoorden geven massa en ⚡ turbo.</strong> Drie op rij: 💥 supernova die kleinere ridders wegblaast. Een fout antwoord: even wachten, de vraag komt later terug.</p>
    <p class="muted small">De zwaarste ridder draagt de 👑. Pas op voor het zwarte gat in het midden: het spuwt je uit en je verliest de helft van je massa.</p>
    <p class="muted small ls-hint-touch">Duim links om te sturen. Rechts: ⚡ turbo, 💥 supernova en ❓ vraag.</p>
    <p class="muted small ls-hint-keys">Sturen met de muis of touchpad (wijs waar je heen wil), of pijltjes/ZQSD. Spatie turbo, F supernova, E vraag, 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="sv-game" class="ak-game hidden">
    <div class="ls-hud ak-hud">
      <div class="sv-mass" id="sv-mass"></div>
      <div class="ry-ammo" id="sv-power"></div>
      <div class="ry-alive" id="sv-rank"></div>
      <div class="ls-clock" id="sv-clock"></div>
    </div>
    <div class="ls-stage" id="sv-stage">
      <canvas id="sv-canvas"></canvas>
      <div class="ls-feed" id="sv-feed"></div>
      <div class="ls-banner" id="sv-banner"></div>
      <div class="tw-toast" id="sv-toast"></div>
      <div class="tw-countdown hidden" id="sv-countdown"></div>
      <div class="ak-touch">
        <button class="ls-btn ak-ask" id="sv-ask">❓<small>Vraag</small></button>
        <button class="ls-btn ak-special" id="sv-nova">💥<small>Nova</small></button>
        <button class="ls-btn ak-attack" id="sv-dash">⚡<small>Turbo</small></button>
      </div>
      <p class="ls-keys">muis/pijltjes sturen · spatie turbo · F supernova · E vraag · 1-4 antwoorden</p>
      <div class="ls-out hidden" id="sv-out">
        <p class="ls-out-title">Opgeslokt!</p>
        <p class="ls-out-by" id="sv-out-by"></p>
        <p class="ls-out-timer" id="sv-out-timer"></p>
        <button class="gold" id="sv-out-ask">❓ Verdien extra massa voor je comeback</button>
      </div>
    </div>
  </section>
  <section id="sv-end" class="screen panel hidden">
    <div class="mark" id="sv-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="sv-end-title"></p>
    <p class="big" id="sv-end-score" style="font-size:1.6rem"></p>
    <p id="sv-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, scene: new SvDraw.Scene(), me: null, m: SvWorld.START,
    x: 0, y: 0, fix: 0, sentAt: 0, sentX: 0, sentY: 0, dashEnd: 0, roster: new Map(), cam: null, zoom: 0, mouse: null,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.sv === '1';
  const show = name => { for (const s of ['sv-join', 'sv-lobby', 'sv-game', 'sv-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('sv-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('sv-join-error').textContent = res.error;
        show('sv-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('sv-join-error').textContent = '';
    });
  }
  $('sv-join').addEventListener('submit', e => { e.preventDefault(); join($('sv-name').value); });

  socket.on('sv-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.sv = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    g.scene.R = s.R;
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.scene = new SvDraw.Scene();
      g.scene.onEvent = onEvent;
      g.scene.R = s.R;
      quiz.close();
      delete $('sv-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('sv-name').value = saved || '';
        show('sv-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('sv-lobby-name').textContent = s.name;
      show('sv-lobby');
    } else if (s.phase === 'play') {
      show('sv-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('sv-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
    } else if (s.phase === 'einde') {
      quiz.close();
      $('sv-out').classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      $('sv-end-medal').textContent = medals[me.rank - 1] || '🌌';
      $('sv-end-title').textContent = me.rank === 1 ? 'Jij bent de grootste Sterrenvreter!' : `Plek ${me.rank} van ${me.players}`;
      $('sv-end-score').textContent = `${me.score || 0} punten · grootste massa ${me.peak || 0}`;
      $('sv-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.eats || 0} ridders opgeslokt`;
      if (!$('sv-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('sv-end').dataset.done = '1';
      show('sv-end');
    }
  });

  socket.on('sv-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('sv-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('sv-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('sv-dust', msg => {
    g.scene.setDust(msg);
    if (msg.x !== undefined) { g.x = msg.x; g.y = msg.y; g.fix = msg.fix; g.cam = null; }
  });
  socket.on('sv-pos', msg => {
    g.x = msg.x;
    g.y = msg.y;
    g.fix = msg.fix;
    if (msg.respawn) { g.cam = null; banner('TERUG!', 'Eet stof en groei opnieuw', 'big'); sfx.go(); }
    if (msg.hole) { banner('🕳️ UITGESPUWD!', `Het zwarte gat pakte ${msg.hole} massa`, 'bad'); sfx.boom(); buzz(300); }
    if (msg.by) { toast(`💥 Weggeblazen door ${msg.by}!`, 'bad'); buzz(200); }
  });

  socket.on('sv-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    g.scene.apply(msg);
    if (g.me) {
      const mine = msg.k.find(k => k[0] === g.me.n);
      if (mine) g.m = mine[3];
    }
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.scene.meN = me.n;
    if (old && old.alive && !me.alive) {
      sfx.hit();
      buzz([200, 80, 300]);
      g.dashEnd = 0;
    }
    if (old && !old.alive && me.alive) { quiz.close(); stick.reset(); }
    $('sv-out').classList.toggle('hidden', me.alive || quiz.open);
    if (!me.alive) {
      g.respawnAt = performance.now() + me.respawn;
    }
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('sv-mass').textContent = me.alive ? `🌑 ${Math.round(g.m)}` : 'OPGESLOKT';
    $('sv-power').textContent = `⚡ ${me.turbo}${me.nova ? ` · 💥${me.nova}` : ''}`;
    $('sv-power').classList.toggle('empty', me.turbo <= 0);
    $('sv-nova').classList.toggle('ready', me.nova > 0 && me.alive);
    $('sv-rank').textContent = me.rank ? `#${me.rank} · ${me.score} p` : '';
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'slok') {
      const a = g.roster.get(e[1]), b = g.roster.get(e[2]);
      if (e[1] === me.n) {
        sfx.boom();
        buzz([40, 30, 80]);
        banner('OPGESLOKT!', b ? `${b.name} +50 punten` : '+50 punten', 'gold');
      } else if (e[2] === me.n) {
        $('sv-out-by').textContent = a ? `door ${a.name}` : '';
      } else if (a && b) feedLine(`🌀 ${a.name} slokt ${b.name} op`, false);
    } else if (e[0] === 'kroon') {
      if (e[1] === me.n) { sfx.fanfare(); banner('👑 DE KROON!', 'Jij bent de zwaarste ridder', 'gold'); }
      else { const k = g.roster.get(e[1]); if (k) feedLine(`👑 ${k.name} draagt de kroon`, false); }
    } else if (e[0] === 'nova' && e[1] !== me.n) sfx.boom();
    else if (e[0] === '-' && e[2] === me.n && Math.random() < .35) sfx.marker();
  }

  function feedLine(text, mine) {
    const box = $('sv-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${mine ? ' me' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('sv-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('sv-banner');
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

  // ---------- Vragen ----------
  const quiz = AK.quiz({
    root: $('sv-game'),
    closeText: 'Terug de ruimte in',
    status: res => (res.alive ? `Juist = massa en ⚡ turbo · jij: ${res.m} massa · je zweeft veilig in een schild` : 'Juist = extra massa voor je comeback'),
    ask: cb => socket.emit('sv-question', null, cb),
    answer: (i, cb) => socket.emit('sv-answer', i, cb),
    good: res => `Juist! +${res.gained} massa${res.gotTurbo ? ' · +1 ⚡' : ''}${res.gotNova ? ' · 💥 supernova!' : ''}`,
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: res => !res.alive || res.turbo < SvWorld.MAX_TURBO,
    close: () => {
      socket.emit('sv-asking', false);
      if (g.me) $('sv-out').classList.toggle('hidden', g.me.alive);
    },
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play') return;
    stick.reset();
    $('sv-out').classList.add('hidden');
    quiz.show();
  }

  // ---------- Besturing ----------
  const stage = $('sv-stage');
  const stick = AK.stick(stage);
  const canvas = $('sv-canvas');
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    g.mouse = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, at: performance.now() };
  });
  canvas.addEventListener('pointerleave', () => { g.mouse = null; });
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { sfx.unlock(); dash(); } });
  $('sv-dash').addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); dash(); });
  $('sv-nova').addEventListener('click', e => { e.currentTarget.blur(); nova(); });
  $('sv-ask').addEventListener('click', e => { e.currentTarget.blur(); ask(); });
  $('sv-out-ask').addEventListener('click', () => ask());

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('sv-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key)) { e.preventDefault(); g.mouse = null; }
    if (e.key === ' ') { e.preventDefault(); if (!e.repeat) dash(); }
    const k = e.key.toLowerCase();
    if (k === 'f' && !e.repeat) nova();
    if (k === 'e' || e.key === 'Enter') ask();
  });

  function playing() {
    return g.me && g.me.alive && !quiz.open && now() >= g.state.startedAt;
  }

  function dash() {
    if (!playing()) return;
    if (g.me.turbo <= 0) { sfx.empty(); toast('Geen turbo! Druk op ❓ Vraag', 'bad'); return; }
    if (performance.now() < g.dashEnd) return;
    g.dashEnd = performance.now() + SvWorld.DASH.ms;
    g.me.turbo--;
    hud();
    sfx.laser();
    buzz(40);
    socket.emit('sv-dash', null, res => {
      if (res && res.error) { g.dashEnd = 0; toast(res.error, 'bad'); }
    });
  }

  function nova() {
    if (!playing()) return;
    if (g.me.nova <= 0) { sfx.empty(); toast('Geen supernova: 3 juist op rij!', 'bad'); return; }
    socket.emit('sv-nova', null, res => {
      if (res && res.error) return toast(res.error, 'bad');
      sfx.boom();
      buzz([60, 40, 120]);
      banner('💥 SUPERNOVA!', res.hit ? `${res.hit} ${res.hit === 1 ? 'ridder' : 'ridders'} weggeblazen` : 'Niemand in de buurt…', 'big');
    });
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('sv-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('sv-clock').textContent = AK.clock(left);
    $('sv-clock').classList.toggle('low', left < 30000);
    const s = g.scene;
    if (!g.me) return;
    const wait = g.state.startedAt - now();
    $('sv-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('sv-countdown').textContent = Math.ceil(wait / 1000);
    if (!g.me.alive) {
      const back = Math.max(0, Math.ceil(((g.respawnAt || 0) - t) / 1000));
      $('sv-out-timer').textContent = `Terug over ${back} s${g.me.bonus ? ` · +${g.me.bonus} massa klaar` : ''}`;
    }
    const { w, h, dpr } = AK.fit(canvas, 1.25);
    const r = SvWorld.radius(g.m);
    // Bewegen: duim, toetsen of muis. Het zwarte gat trekt altijd een beetje.
    if (playing()) {
      let v = stick.active ? { x: stick.x, y: stick.y } : AK.keyVector();
      if (!stick.active && !v.x && !v.y && g.mouse && t - g.mouse.at < 4000) {
        const mx = g.mouse.x * dpr, my = g.mouse.y * dpr;
        const d = Math.hypot(mx, my), dead = r * (g.zoom || 1) * .35;
        if (d > dead) { const k = Math.min(1, (d - dead) / (110 * dpr)); v = { x: (mx / d) * k, y: (my / d) * k }; }
      }
      const sp = SvWorld.speed(g.m) * (t < g.dashEnd ? SvWorld.DASH.mult : 1);
      const hole = SvWorld.hole(Math.max(0, now() - g.state.startedAt) / 1000, g.state.minutes * 60);
      const pull = SvWorld.gravity(hole, g.x, g.y);
      const p = SvWorld.clamp(s.R, g.x + (v.x * sp + pull.x) * dt, g.y + (v.y * sp + pull.y) * dt, r);
      g.x = p.x;
      g.y = p.y;
      s.predict(g.x, g.y, r);
      if (t - g.sentAt > 50 && (Math.abs(g.x - g.sentX) > .5 || Math.abs(g.y - g.sentY) > .5 || t - g.sentAt > 300)) {
        g.sentAt = t;
        g.sentX = g.x;
        g.sentY = g.y;
        socket.emit('sv-move', { x: Math.round(g.x), y: Math.round(g.y), fix: g.fix });
      }
    }
    s.update(dt);
    // Camera: je eigen bol; hoe groter je bent, hoe verder je ziet. Uit? Dan volg je de koning.
    let fx = g.x, fy = g.y;
    if (!g.me.alive) {
      const k = s.orbs.get(s.king, t);
      if (k) { fx = k[0]; fy = k[1]; }
    }
    if (!g.cam) g.cam = { x: fx, y: fy };
    const ck = g.me.alive ? Math.min(1, dt * 12) : Math.min(1, dt * 2.5);
    g.cam.x += (fx - g.cam.x) * ck;
    g.cam.y += (fy - g.cam.y) * ck;
    const want = Math.sqrt(w * h) / (560 + r * 6.5);
    g.zoom = g.zoom ? g.zoom + (want - g.zoom) * Math.min(1, dt * 2) : want;
    SvDraw.render(ctx, s, { x: g.cam.x, y: g.cam.y, zoom: g.zoom, w, h }, {
      roster: g.roster,
      local: { n: g.me.alive ? g.me.n : -1, x: g.x, y: g.y, m: g.m, alive: g.me.alive, flags: (quiz.open ? 2 : 0) | (t < g.dashEnd ? 8 : 0) },
    });
    const ms = Math.min(w * .24, 140 * dpr);
    SvDraw.minimap(ctx, s, w - ms - 12 * dpr, 12 * dpr, ms, g.me.alive ? { n: g.me.n, x: g.x, y: g.y, m: g.m } : null, g.roster);
  }
  g.scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
