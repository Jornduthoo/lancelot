// Banierveld op de Chromebook of gsm: rij met je zwevend ros, trek een lichtspoor en kom terug in je land om alles binnen je lus te veroveren.
// De server rijdt het ros vakje per vakje; wij sturen alleen de richting en tekenen alles vloeiend.
// Chromebook: pijltjes, WASD of ZQSD, 1-4 antwoorden. Gsm: veeg in de richting waarin je wil rijden.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, BvWorld en BvDraw.
(() => {
  const W = BvWorld;
  const root = document.createElement('div');
  root.id = 'banier';
  root.innerHTML = `
  <form id="bv-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Banierveld</p>
    <input id="bv-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="bv-join-error"></p>
    <button type="submit" class="big">Het veld op</button>
  </form>
  <section id="bv-lobby" class="screen panel hidden">
    <p class="status">Banierveld</p>
    <canvas id="bv-lobby-art" width="220" height="90"></canvas>
    <p class="title" id="bv-lobby-name"></p>
    <p>Rij buiten je land en je trekt een <strong>lichtspoor</strong>. Kom terug in je land en <strong>alles binnen je lus wordt van jou</strong>.</p>
    <p>Pas op: rijdt iemand door je spoor terwijl je buiten bent, dan flits je terug naar je burcht. Jouw land blijft van jou. Rijd jij door het spoor van een ander, dan flitst hij terug!</p>
    <p class="muted small">Rijden kost ⚡ energie. Is ze op, dan krijg je een vraag. Juist: volle energie en turbo, drie op rij een 🛡 schild. Tijdens een vraag sta je stil en is je spoor veilig.</p>
    <p class="muted small ls-hint-touch">Veeg in de richting waarin je wil rijden.</p>
    <p class="muted small ls-hint-keys">Sturen met de pijltjes, WASD of ZQSD · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="bv-game" class="ak-game hidden">
    <div class="ls-hud ak-hud bv-hud">
      <div class="sv-mass" id="bv-land">🏴 0 %</div>
      <div class="hb-energy bv-energy" id="bv-energy" title="Energie"><i></i></div>
      <div class="px-chip hidden" id="bv-power"></div>
      <div class="ry-alive" id="bv-rank"></div>
      <div class="ls-clock" id="bv-clock"></div>
    </div>
    <div class="ls-stage bv-stage" id="bv-stage">
      <canvas id="bv-canvas"></canvas>
      <div class="ls-feed" id="bv-feed"></div>
      <div class="ls-banner" id="bv-banner"></div>
      <div class="tw-toast" id="bv-toast"></div>
      <div class="tw-countdown hidden" id="bv-countdown"></div>
      <div class="hb-tip" id="bv-tip"><span class="ls-hint-touch">Veeg om te sturen</span><span class="ls-hint-keys">Stuur met de pijltjes</span></div>
      <div class="ls-out hidden" id="bv-out">
        <p class="ls-out-title">Geflitst!</p>
        <p class="ls-out-by" id="bv-out-by"></p>
        <p class="ls-out-timer" id="bv-out-timer"></p>
      </div>
    </div>
  </section>
  <section id="bv-end" class="screen panel hidden">
    <div class="mark" id="bv-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="bv-end-title"></p>
    <p class="big" id="bv-end-score" style="font-size:1.6rem"></p>
    <p id="bv-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), energy: W.ENERGY, cam: null, last: null };
  const colorOf = n => (g.roster.get(n) || {}).color;
  let scene = new BvDraw.Scene(colorOf, 10);
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.bv === '1';
  const show = name => { for (const s of ['bv-join', 'bv-lobby', 'bv-game', 'bv-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';
  const pctText = v => `${String(v).replace('.', ',')} %`;

  function join(name) {
    socket.emit('bv-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('bv-join-error').textContent = res.error;
        show('bv-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('bv-join-error').textContent = '';
    });
  }
  $('bv-join').addEventListener('submit', e => { e.preventDefault(); join($('bv-name').value); });

  socket.on('bv-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.bv = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    const before = g.roster.size;
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (before !== g.roster.size) scene.recolor();
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.cam = null;
      scene = new BvDraw.Scene(colorOf, 10);
      scene.onEvent = onEvent;
      quiz.close();
      delete $('bv-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('bv-name').value = saved || '';
        show('bv-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.phase === 'lobby') {
      $('bv-lobby-name').textContent = s.name;
      drawLobby();
      show('bv-lobby');
    } else if (s.phase === 'play') {
      show('bv-game');
      $('bv-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      $('bv-out').classList.add('hidden');
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('bv-end-medal').textContent = medals[me.rank - 1] || '🏴';
      $('bv-end-title').textContent = me.rank === 1 ? 'Jij verovert het meeste land!' : `Plek ${me.rank} van ${me.players}`;
      $('bv-end-score').textContent = `🏴 ${pctText(me.land || 0)} van het veld`;
      $('bv-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.cuts || 0} ${me.cuts === 1 ? 'spoor' : 'sporen'} doorgesneden · meeste land ${pctText(me.peak || 0)}`;
      if (!$('bv-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('bv-end').dataset.done = '1';
      show('bv-end');
    }
  });

  function drawLobby() {
    const c = $('bv-lobby-art').getContext('2d');
    c.clearRect(0, 0, 220, 90);
    BvDraw.burcht(c, 50, 45, 30, g.color || '#4cc9ff', 0);
    c.strokeStyle = g.color || '#4cc9ff';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.globalAlpha = .6;
    c.beginPath(); c.moveTo(80, 45); c.lineTo(120, 45); c.lineTo(120, 20); c.lineTo(150, 20); c.stroke();
    c.globalAlpha = 1;
    BvDraw.ruiter(c, 168, 20, 0, 16, g.color || '#4cc9ff', 0);
  }

  socket.on('bv-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('bv-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('bv-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('bv-world', msg => { scene.setWorld(msg); g.cam = null; });
  socket.on('bv-flits', msg => { if (msg.land) banner('NIEUWE BURCHT', `${nameOf(msg.by)} veroverde al je land. Begin opnieuw!`, 'big'); });

  socket.on('bv-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (g.me) {
      const mine = msg.k.find(k => k[0] === g.me.n);
      if (mine) {
        if (g.last && (mine[1] !== g.last[0] || mine[2] !== g.last[1])) g.energy = Math.max(0, g.energy - Math.abs(mine[1] - g.last[0]) - Math.abs(mine[2] - g.last[1]));
        g.last = [mine[1], mine[2]];
      }
    }
    scene.apply(msg);
    if (msg.me) setMe(msg.me);
    hud();
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.energy = me.energy;
    if (old && old.alive && !me.alive) {
      sfx.hit();
      buzz([200, 80, 300]);
      quiz.close();
      g.last = null;
    }
    if (old && !old.alive && me.alive) { g.last = null; sfx.go(); }
    if (old && me.shield && !old.shield) toast('🛡 Schild! Eén keer doorsnijden wordt tegengehouden', 'good');
    $('bv-out').classList.toggle('hidden', me.alive);
    if (!me.alive) g.respawnAt = performance.now() + me.respawn;
    g.turboEnd = performance.now() + (me.turbo || 0);
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('bv-land').textContent = `🏴 ${pctText(me.land)}${me.shield ? ' 🛡' : ''}`;
    const en = $('bv-energy');
    en.firstChild.style.width = `${Math.round(Math.min(1, g.energy / W.ENERGY) * 100)}%`;
    en.classList.toggle('low', g.energy < W.ENERGY * .2);
    $('bv-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'flits') {
      if (e[2] === me.n) {
        sfx.boom();
        buzz([40, 30, 80]);
        banner('DOORGESNEDEN!', `${nameOf(e[1])} flitst terug`, 'gold');
      } else if (e[1] === me.n) $('bv-out-by').textContent = e[2] >= 0 ? `${nameOf(e[2])} reed door je spoor` : '';
      else feedLine(`⚔️ ${nameOf(e[2])} snijdt ${nameOf(e[1])} door`);
    } else if (e[0] === 'cap' && e[1] === me.n) {
      const m = e[2].length / 2;
      if (m > 0) {
        sfx.marker();
        if (m >= 25) { sfx.power(); toast(`+${m} vakjes veroverd!`, 'good'); }
        const h = scene.head(me.n);
        if (h) g.pop = { t: performance.now() / 1000, x: h[0], y: h[1], m };
      }
    } else if (e[0] === 'schild' && e[1] === me.n) { sfx.boom(); banner('🛡 GERED!', 'Je schild hield het tegen', 'big'); }
  }

  function feedLine(text) {
    const box = $('bv-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('bv-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('bv-banner');
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

  // ---------- Vragen als de energie op is ----------
  let lastRes = null;
  const quiz = AK.quiz({
    root: $('bv-game'),
    closeText: 'Verder rijden',
    lock: 350,
    status: () => 'Energie op · juist = ⚡ volle energie en turbo · je staat stil en je spoor is veilig',
    ask: cb => socket.emit('bv-question', null, cb),
    answer: (i, cb) => socket.emit('bv-answer', i, res => {
      lastRes = res;
      if (res && !res.error) g.energy = res.energy;
      if (res && res.correct) sfx.power();
      cb(res);
    }),
    good: res => `Juist! ⚡ Volle energie en ${res.turbo} s turbo${res.gotShield ? ' · 🛡 schild!' : ''}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug. Je krijgt een beetje energie.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('bv-asking', false);
      if (lastRes && lastRes.correct) banner('⚡ TURBO!', 'Volle energie', 'gold');
      lastRes = null;
      hud();
    },
  });
  function maybeAsk() {
    if (!g.me || !g.me.alive || quiz.open || g.energy > 0 || now() < g.state.startedAt) return;
    socket.emit('bv-asking', true);
    quiz.show();
  }

  // ---------- Besturing ----------
  const KEYS = { arrowright: 0, d: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, q: 2, arrowup: 3, w: 3, z: 3 };
  function turn(d) {
    if (!g.me || !g.me.alive || quiz.open) return;
    if (g.turned === d && performance.now() - g.turnedAt < 60) return;
    g.turned = d;
    g.turnedAt = performance.now();
    $('bv-tip').classList.add('weg');
    socket.emit('bv-turn', d);
  }
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('bv-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const d = KEYS[e.key.toLowerCase()];
    if (d === undefined) return;
    e.preventDefault();
    if (!e.repeat) turn(d);
  });
  // Vegen: zodra je vinger 20 px ver is, draaien we in die richting. Daarna kan je meteen weer vegen zonder los te laten.
  const stage = $('bv-stage');
  const swipe = { id: null, x: 0, y: 0 };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button, .ak-question')) return;
    sfx.unlock();
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    swipe.id = e.pointerId;
    swipe.x = e.clientX;
    swipe.y = e.clientY;
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', e => {
    if (e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
    swipe.x = e.clientX;
    swipe.y = e.clientY;
  });
  const end = e => { if (e.pointerId === swipe.id) swipe.id = null; };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // ---------- Elke frame ----------
  const canvas = $('bv-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('bv-game').classList.contains('hidden') || !g.me) return;
    const left = g.state.endsAt - now();
    $('bv-clock').textContent = AK.clock(left);
    $('bv-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('bv-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('bv-countdown').textContent = Math.ceil(wait / 1000);
    if (!g.me.alive) $('bv-out-timer').textContent = `Terug over ${Math.max(0, Math.ceil(((g.respawnAt || 0) - t) / 1000))} s`;
    const turbo = (g.turboEnd || 0) - t;
    const pw = $('bv-power');
    pw.classList.toggle('hidden', turbo <= 0);
    if (turbo > 0) pw.textContent = `⚡ ${Math.ceil(turbo / 1000)} s`;
    maybeAsk();

    const sec = t / 1000;
    const { w, h, dpr } = AK.fit(canvas, 1.5);
    const s = Math.max(14 * dpr, Math.min(w, h) / 20);
    const hd = scene.head(g.me.n, t);
    if (hd) {
      if (!g.cam) g.cam = { x: hd[0], y: hd[1] };
      const k = Math.min(1, dt * 6);
      g.cam.x += (hd[0] - g.cam.x) * k;
      g.cam.y += (hd[1] - g.cam.y) * k;
    }
    if (!g.cam) g.cam = { x: scene.G / 2, y: scene.G / 2 };
    const cam = { x: g.cam.x + .5, y: g.cam.y + .5, s, w, h };
    BvDraw.render(ctx, scene, cam, { roster: g.roster, t: sec, me: g.me.n, fs: Math.max(11, Math.min(16, s * .4)) });
    // Net veroverd: een golf over je nieuwe land
    if (g.pop) {
      const k = (sec - g.pop.t) / 1;
      if (k >= 1) g.pop = null;
      else {
        const x = w / 2 + (g.pop.x + .5 - cam.x) * s, y = h / 2 + (g.pop.y + .5 - cam.y) * s;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = s * .25 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(x, y, s * (1 + k * Math.min(10, Math.sqrt(g.pop.m))), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    fx.update(dt);
    fx.draw(ctx);
    const ms = Math.min(w * .22, h * .3, 130 * dpr);
    BvDraw.minimap(ctx, scene, w - ms - 10 * dpr, h - ms - 10 * dpr, ms, hd);
  }
  scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
