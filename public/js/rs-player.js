// Ridderslang op de gsm of Chromebook: eet lichtbollen, word lang, en laat anderen tegen je lichaam botsen.
// Je eigen slang beweegt meteen (geen wachten op de server); de anderen tekenen we vloeiend tussen twee berichten in.
// Sturen: duim links (gsm), pijltjes/ZQSD/WASD, of met de muis/touchpad wijzen (Chromebook). Boost: ingedrukt houden.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, RsWorld en RsDraw.
(() => {
  const root = document.createElement('div');
  root.id = 'slang';
  root.innerHTML = `
  <form id="rs-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Ridderslang</p>
    <input id="rs-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="rs-join-error"></p>
    <button type="submit" class="big">De arena in</button>
  </form>
  <section id="rs-lobby" class="screen panel hidden">
    <p class="status">Ridderslang</p>
    <p class="title" id="rs-lobby-name"></p>
    <p>Jij bent een <strong>neon lansslang</strong>. Eet lichtbollen om langer te worden. Raakt je lans het lichaam van een ander, dan spat jij uiteen in licht. Laat de anderen dus tegen <strong>jou</strong> botsen!</p>
    <p><strong>Goede antwoorden maken je langer en geven ⚡ boost.</strong> Drie op rij: een 🛡 schild dat één botsing tegenhoudt. Een fout antwoord: even wachten, de vraag komt later terug.</p>
    <p class="muted small">Tijdens een vraag word je een geest: je staat stil en niemand kan je raken. Pas op voor de burchtmuur!</p>
    <p class="muted small ls-hint-touch">Duim links om te sturen. Rechts: ⚡ boost (ingedrukt houden) en ❓ vraag.</p>
    <p class="muted small ls-hint-keys">Sturen met de muis of touchpad (wijs waar je heen wil), of pijltjes/ZQSD. Spatie, Shift of muisknop ingedrukt = boost, E vraag, 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="rs-game" class="ak-game hidden">
    <div class="ls-hud ak-hud">
      <div class="sv-mass" id="rs-len"></div>
      <div class="ak-hp rs-boost"><i id="rs-boost-fill"></i><span id="rs-boost-text"></span></div>
      <div class="ry-alive" id="rs-rank"></div>
      <div class="ls-clock" id="rs-clock"></div>
    </div>
    <div class="ls-stage" id="rs-stage">
      <canvas id="rs-canvas"></canvas>
      <div class="ls-feed" id="rs-feed"></div>
      <div class="ls-banner" id="rs-banner"></div>
      <div class="tw-toast" id="rs-toast"></div>
      <div class="tw-countdown hidden" id="rs-countdown"></div>
      <div class="ak-touch">
        <button class="ls-btn ak-ask" id="rs-ask">❓<small>Vraag</small></button>
        <button class="ls-btn ak-attack" id="rs-boost">⚡<small>Boost</small></button>
      </div>
      <p class="ls-keys">muis/pijltjes sturen · spatie/shift boost · E vraag · 1-4 antwoorden</p>
      <div class="ls-out hidden" id="rs-out">
        <p class="ls-out-title" id="rs-out-title">Gebotst!</p>
        <p class="ls-out-by" id="rs-out-by"></p>
        <p class="ls-out-timer" id="rs-out-timer"></p>
        <button class="gold" id="rs-out-ask">❓ Verdien extra lengte voor je comeback</button>
      </div>
    </div>
  </section>
  <section id="rs-end" class="screen panel hidden">
    <div class="mark" id="rs-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="rs-end-title"></p>
    <p class="big" id="rs-end-score" style="font-size:1.6rem"></p>
    <p id="rs-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, scene: new RsDraw.Scene(), me: null, L: RsWorld.START,
    x: 0, y: 0, a: 0, fix: 0, sentAt: 0, boostMs: 0, boosting: false, boostKey: false, roster: new Map(), cam: null, zoom: 0, mouse: null,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.rs === '1';
  const show = name => { for (const s of ['rs-join', 'rs-lobby', 'rs-game', 'rs-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('rs-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('rs-join-error').textContent = res.error;
        show('rs-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('rs-join-error').textContent = '';
    });
  }
  $('rs-join').addEventListener('submit', e => { e.preventDefault(); join($('rs-name').value); });

  socket.on('rs-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.rs = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    g.scene.R = s.R;
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.scene = new RsDraw.Scene();
      g.scene.onEvent = onEvent;
      g.scene.R = s.R;
      quiz.close();
      delete $('rs-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('rs-name').value = saved || '';
        show('rs-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('rs-lobby-name').textContent = s.name;
      show('rs-lobby');
    } else if (s.phase === 'play') {
      show('rs-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('rs-game').style.setProperty('--team', mine ? mine.color : '#ff6bd6');
    } else if (s.phase === 'einde') {
      quiz.close();
      $('rs-out').classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      $('rs-end-medal').textContent = medals[me.rank - 1] || '🐍';
      $('rs-end-title').textContent = me.rank === 1 ? 'Jij bent de machtigste Ridderslang!' : `Plek ${me.rank} van ${me.players}`;
      $('rs-end-score').textContent = `${me.score || 0} punten · langste ${me.peak || 0}`;
      $('rs-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.kills || 0} slangen afgesneden`;
      if (!$('rs-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('rs-end').dataset.done = '1';
      show('rs-end');
    }
  });

  socket.on('rs-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('rs-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('rs-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('rs-world', msg => {
    g.scene.setWorld(msg);
    if (msg.x !== undefined) { g.x = msg.x; g.y = msg.y; g.a = msg.a; g.fix = msg.fix; g.cam = null; }
  });
  socket.on('rs-pos', msg => {
    g.x = msg.x;
    g.y = msg.y;
    g.a = msg.a;
    g.fix = msg.fix;
    if (msg.respawn) { g.cam = null; banner('TERUG!', 'Eet licht en word weer lang', 'big'); sfx.go(); }
  });

  socket.on('rs-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    g.scene.apply(msg);
    if (g.me) {
      const mine = msg.k.find(k => k[0] === g.me.n);
      if (mine) g.L = mine[4];
    }
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.boostMs = me.boost;
    g.safeEnd = performance.now() + (me.safe || 0);
    if (old && old.alive && !me.alive) {
      sfx.hit();
      buzz([200, 80, 300]);
      g.boosting = false;
    }
    if (old && !old.alive && me.alive) { quiz.close(); stick.reset(); }
    if (old && me.shield && !old.shield) toast('🛡 Schild! Eén botsing wordt tegengehouden', 'good');
    $('rs-out').classList.toggle('hidden', me.alive || quiz.open);
    if (!me.alive) g.respawnAt = performance.now() + me.respawn;
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('rs-len').textContent = me.alive ? `🐍 ${Math.round(g.L)}${me.shield ? ' 🛡' : ''}` : 'GEBOTST';
    const k = Math.min(1, g.boostMs / RsWorld.MAX_BOOST);
    $('rs-boost-fill').style.width = `${k * 100}%`;
    $('rs-boost-text').textContent = `⚡ ${(g.boostMs / 1000).toFixed(1)} s`;
    $('rs-boost').classList.toggle('ready', g.boostMs > 0 && me.alive);
    $('rs-rank').textContent = me.rank ? `#${me.rank} · ${me.score} p` : '';
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'dood') {
      const v = g.roster.get(e[1]), k = g.roster.get(e[2]);
      if (e[2] === me.n) {
        sfx.boom();
        buzz([40, 30, 80]);
        banner('AFGESNEDEN!', v ? `${v.name} botst op jou · +50` : '+50 punten', 'gold');
      } else if (e[1] === me.n) {
        $('rs-out-title').textContent = k ? 'Gebotst!' : 'Tegen de muur!';
        $('rs-out-by').textContent = k ? `op het lichaam van ${k.name}` : 'De burchtmuur is hard…';
      } else if (v) feedLine(k ? `⚔️ ${v.name} botst op ${k.name}` : `🧱 ${v.name} tegen de muur`, false);
    } else if (e[0] === 'kroon') {
      if (e[1] === me.n) { sfx.fanfare(); banner('👑 DE KROON!', 'Jij bent de langste slang', 'gold'); }
      else { const k = g.roster.get(e[1]); if (k) feedLine(`👑 ${k.name} is de langste`, false); }
    } else if (e[0] === 'schild' && e[1] === me.n) { sfx.boom(); banner('🛡 GERED!', 'Je schild hield de botsing tegen', 'big'); }
    else if (e[0] === '-' && e[2] === me.n && Math.random() < .3) sfx.marker();
  }

  function feedLine(text, mine) {
    const box = $('rs-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${mine ? ' me' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('rs-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('rs-banner');
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
    root: $('rs-game'),
    closeText: 'Terug de arena in',
    status: res => (res.alive ? `Juist = lengte en ⚡ boost · jij: ${res.L} lang · je bent nu een geest, niemand raakt je` : 'Juist = extra lengte voor je comeback'),
    ask: cb => socket.emit('rs-question', null, cb),
    answer: (i, cb) => socket.emit('rs-answer', i, cb),
    good: res => `Juist! +${res.gained} lengte · +${(RsWorld.BOOST_PER_ANSWER / 1000).toFixed(1)} s ⚡${res.gotShield ? ' · 🛡 schild!' : ''}`,
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: res => !res.alive || res.boost < RsWorld.MAX_BOOST * .6,
    close: () => {
      socket.emit('rs-asking', false);
      if (g.me) $('rs-out').classList.toggle('hidden', g.me.alive);
    },
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play') return;
    stick.reset();
    g.boosting = false;
    $('rs-out').classList.add('hidden');
    quiz.show();
  }

  // ---------- Besturing ----------
  const stage = $('rs-stage');
  const stick = AK.stick(stage);
  const canvas = $('rs-canvas');
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    g.mouse = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, at: performance.now() };
  });
  canvas.addEventListener('pointerleave', () => { if (!g.boostKey) g.mouse = null; });
  // Muisknop vasthouden = boost. We houden de muis vast, zodat de boost blijft werken als je al sturend over
  // de knoppen of de rand van het scherm schuift.
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    sfx.unlock();
    g.boostKey = true;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') g.boostKey = false; });
  addEventListener('blur', () => { g.boostKey = false; });
  AK.holdButton($('rs-boost'), v => { g.boostKey = v; });
  $('rs-ask').addEventListener('click', e => { e.currentTarget.blur(); ask(); });
  $('rs-out-ask').addEventListener('click', () => ask());

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('rs-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key)) { e.preventDefault(); g.mouse = null; }
    // Spatie of Shift: Shift botst nooit met de pijltjes op goedkope toetsenborden.
    if (e.key === ' ' || e.key === 'Shift') { e.preventDefault(); g.boostKey = true; }
    const k = e.key.toLowerCase();
    if (k === 'e' || e.key === 'Enter') ask();
  });
  document.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Shift') g.boostKey = false; });

  function playing() {
    return g.me && g.me.alive && !quiz.open && now() >= g.state.startedAt;
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  let emptyToast = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('rs-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('rs-clock').textContent = AK.clock(left);
    $('rs-clock').classList.toggle('low', left < 30000);
    const s = g.scene;
    if (!g.me) return;
    const wait = g.state.startedAt - now();
    $('rs-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('rs-countdown').textContent = Math.ceil(wait / 1000);
    if (!g.me.alive) $('rs-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil(((g.respawnAt || 0) - t) / 1000))} s${g.me.bonus ? ` · +${g.me.bonus} lengte klaar` : ''}`;
    const { w, h, dpr } = AK.fit(canvas, 1.25);
    const wd = RsWorld.width(g.L);
    if (playing()) {
      // Sturen: de kop draait richting duim, toetsen of muis; zonder sturen rijdt hij rechtdoor.
      let v = stick.active ? { x: stick.x, y: stick.y } : AK.keyVector();
      if (!stick.active && !v.x && !v.y && g.mouse && t - g.mouse.at < 6000) {
        const d = Math.hypot(g.mouse.x, g.mouse.y);
        if (d > 18) v = { x: g.mouse.x / d, y: g.mouse.y / d };
      }
      // Met boost draai je ook sneller, zodat je bocht even krap blijft en je kan blijven boosten in een bocht.
      if (Math.hypot(v.x, v.y) > .2) g.a = RsWorld.steer(g.a, Math.atan2(v.y, v.x), RsWorld.turn(g.L) * dt * (g.boosting ? 1.6 : 1));
      const want = g.boostKey && g.boostMs > 0;
      if (g.boostKey && g.boostMs <= 0 && t - emptyToast > 2500) { emptyToast = t; sfx.empty(); toast('Geen boost! Druk op ❓ Vraag', 'bad'); }
      if (want !== g.boosting) { g.boosting = want; hud(); }
      if (g.boosting) { g.boostMs = Math.max(0, g.boostMs - dt * 1000); if (Math.random() < .2) hud(); }
      const sp = RsWorld.SPEED * (g.boosting ? RsWorld.BOOST : 1);
      g.x += Math.cos(g.a) * sp * dt;
      g.y += Math.sin(g.a) * sp * dt;
      // Beschermd? Dan laten we je niet tegen de muur rijden. Anders beslist de server.
      const d = Math.hypot(g.x, g.y), safe = t < (g.safeEnd || 0);
      const max = safe ? s.R - wd * .5 - 4 : s.R + 12;
      if (d > max) { g.x = (g.x / d) * max; g.y = (g.y / d) * max; }
      s.predict(g.x, g.y, wd * .6 + 22);
      if (t - g.sentAt > 50) {
        g.sentAt = t;
        socket.emit('rs-move', { x: Math.round(g.x), y: Math.round(g.y), a: +g.a.toFixed(3), b: g.boosting, fix: g.fix });
      }
    }
    // Rode gloed als je dicht bij de muur komt.
    $('rs-game').classList.toggle('low', g.me.alive && Math.hypot(g.x, g.y) > s.R - 220);
    s.update(dt);
    let fx = g.x, fy = g.y;
    if (!g.me.alive) {
      const k = s.heads.get(s.king, t);
      if (k) { fx = k[0]; fy = k[1]; }
    }
    if (!g.cam) g.cam = { x: fx, y: fy };
    const ck = g.me.alive ? Math.min(1, dt * 10) : Math.min(1, dt * 2.5);
    g.cam.x += (fx - g.cam.x) * ck;
    g.cam.y += (fy - g.cam.y) * ck;
    const wantZoom = Math.min(w, h) / (720 + g.L * 1.4);
    g.zoom = g.zoom ? g.zoom + (wantZoom - g.zoom) * Math.min(1, dt * 2) : wantZoom;
    RsDraw.render(ctx, s, { x: g.cam.x, y: g.cam.y, zoom: g.zoom, w, h }, {
      roster: g.roster,
      local: { n: g.me.alive ? g.me.n : -1, x: g.x, y: g.y, a: g.a, L: g.L, alive: g.me.alive, flags: (quiz.open ? 2 : 0) | (g.boosting ? 8 : 0) },
    });
    const ms = Math.min(w * .24, 140 * dpr);
    RsDraw.minimap(ctx, s, w - ms - 12 * dpr, 12 * dpr, ms, g.me.alive ? { n: g.me.n, x: g.x, y: g.y } : null);
  }
  g.scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
