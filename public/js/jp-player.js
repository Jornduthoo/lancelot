// Raketridder op de Chromebook of gsm: vlieg met je raketridder door de hindernisbaan, van vlag naar vlag.
// De hele baan draait hier (geen vertraging); de server krijgt je plek, de vlaggen en de energiecellen, en geeft de vragen.
// Chromebook: ← → (of Q/A en D) vliegen, spatie / ↑ / W / Z raket aan, 1-4 antwoorden. Gsm: ◀ ▶ links en 🚀 rechts.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, JpWorld en JpDraw.
(() => {
  const W = JpWorld;
  const root = document.createElement('div');
  root.id = 'raket';
  root.innerHTML = `
  <form id="jp-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Raketridder</p>
    <input id="jp-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="jp-join-error"></p>
    <button type="submit" class="big">Naar de startvlag</button>
  </form>
  <section id="jp-lobby" class="screen panel hidden">
    <p class="status">Raketridder</p>
    <canvas id="jp-lobby-knight" width="77" height="91"></canvas>
    <p class="title" id="jp-lobby-name"></p>
    <p>Vlieg met je <strong>raketridder</strong> zo snel je kan van vlag naar vlag. Pas op voor stekels, lasers en vuurraderen, en val niet in de lava.</p>
    <p><strong>Elke vlag is een vraag.</strong> Juist: ⚡ turbo (sneller en een raket die niet leeg raakt). Hoe sneller je bij de vlag bent, hoe meer punten.</p>
    <p class="muted small">Je raket raakt leeg in de lucht: land even op een platform om bij te tanken. Val je, dan begin je opnieuw bij de laatste vlag.</p>
    <p class="muted small ls-hint-touch">◀ ▶ vliegen · 🚀 ingedrukt houden = raket aan.</p>
    <p class="muted small ls-hint-keys">← → vliegen · spatie of ↑ ingedrukt = raket aan · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="jp-game" class="ak-game hidden">
    <div class="ls-hud ak-hud jp-hud">
      <div class="sv-mass" id="jp-score">0</div>
      <div class="px-chip" id="jp-flags">🏁 0</div>
      <div class="jp-fuel" id="jp-fuel" title="Brandstof"><i></i></div>
      <div class="px-chip jp-time" id="jp-time"></div>
      <div class="ry-alive" id="jp-rank"></div>
      <div class="ls-clock" id="jp-clock"></div>
    </div>
    <div class="ls-stage" id="jp-stage">
      <canvas id="jp-canvas"></canvas>
      <div class="ls-feed" id="jp-feed"></div>
      <div class="ls-banner" id="jp-banner"></div>
      <div class="tw-toast" id="jp-toast"></div>
      <div class="tw-countdown hidden" id="jp-countdown"></div>
      <div class="px-pad" id="jp-pad">
        <div class="px-dpad" id="jp-dpad"><span>◀</span><span>▶</span></div>
        <div class="px-ab"><button class="ls-btn px-a jp-jet" id="jp-jet" type="button">🚀</button></div>
      </div>
    </div>
  </section>
  <section id="jp-end" class="screen panel hidden">
    <div class="mark" id="jp-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="jp-end-title"></p>
    <p class="big" id="jp-end-score" style="font-size:1.6rem"></p>
    <p id="jp-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const fresh = () => {
    const s = W.spawnOf(0);
    return { x: s.x, y: s.y, vx: 0, vy: 0, fuel: 1, ground: true, on: null, face: 1, jet: false, dead: 0, safe: 0, turbo: 0 };
  };
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff',
    pl: fresh(), stage: 0, stageT: 0, hide: new Set(), flagBusy: false, sentAt: 0, others: new AK.Interp(110), cam: null, fellAt: 0,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.jp === '1';
  const show = name => { for (const s of ['jp-join', 'jp-lobby', 'jp-game', 'jp-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('jp-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('jp-join-error').textContent = res.error;
        show('jp-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('jp-join-error').textContent = '';
    });
  }
  $('jp-join').addEventListener('submit', e => { e.preventDefault(); join($('jp-name').value); });

  function respawn(k) {
    const s = W.spawnOf(k);
    Object.assign(g.pl, { x: s.x, y: s.y, vx: 0, vy: 0, fuel: 1, ground: true, on: null, face: 1, dead: 0, safe: 1.2 });
    g.cam = null;
  }

  socket.on('jp-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.jp = s.active ? '1' : '';
    if (!s.active) { g.joined = false; sfx.engine(0); return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.pl = fresh();
      g.stage = 0;
      g.stageT = 0;
      g.hide = new Set();
      g.flagBusy = false;
      g.others.clear();
      g.cam = null;
      quiz.close();
      delete $('jp-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('jp-name').value = saved || '';
        show('jp-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    // Terug na herladen: verder vanaf de laatste vlag die de server kent.
    if (Array.isArray(s.cellIds)) for (const id of s.cellIds) g.hide.add(id);
    if (s.phase === 'play' && Number.isInteger(s.stage) && s.stage > g.stage) {
      g.stage = s.stage;
      respawn(g.stage);
    }
    if (s.phase === 'lobby') {
      $('jp-lobby-name').textContent = s.name;
      const lc = $('jp-lobby-knight').getContext('2d');
      lc.clearRect(0, 0, 77, 91);
      lc.drawImage(JpDraw.knightSprite(g.color), 0, 0, 77, 91);
      show('jp-lobby');
    } else if (s.phase === 'play') {
      show('jp-game');
      $('jp-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      sfx.engine(0);
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('jp-end-medal').textContent = medals[me.rank - 1] || '🚀';
      $('jp-end-title').textContent = me.rank === 1 ? 'Jij bent de snelste Raketridder!' : `Plek ${me.rank} van ${me.players}`;
      $('jp-end-score').textContent = `${me.score || 0} punten`;
      $('jp-end-stats').textContent = `${me.stage || 0} ${me.stage === 1 ? 'vlag' : 'vlaggen'} · ${me.cells || 0} energiecellen · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('jp-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('jp-end').dataset.done = '1';
      show('jp-end');
    }
  });

  socket.on('jp-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('jp-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('jp-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('jp-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    for (const [n, x, y, f, st] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.others.get(n);
      g.others.push(n, [x, y, 0, f, st], t);
      if (before && st > before[4] && Math.abs(st - g.stage) <= 1) feedLine(`🏁 ${nameOf(n)} haalt vlag ${st}`);
    }
    g.others.prune(t, 800);
  });

  function setMe(me) {
    g.me = me;
    $('jp-score').textContent = me.score;
    $('jp-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  // ---------- Vragen aan de vlag ----------
  const quiz = AK.quiz({
    root: $('jp-game'),
    closeText: 'Verder vliegen',
    lock: 350,
    status: () => `Vlag ${g.stage} · juist = ⚡ turbo · je raket wacht even`,
    ask: cb => socket.emit('jp-question', null, cb),
    answer: (i, cb) => socket.emit('jp-answer', i, res => {
      if (res && res.correct) {
        g.pl.turbo = res.turbo || W.TURBO_S;
        g.pl.fuel = 1;
        sfx.power();
      }
      cb(res);
    }),
    good: res => `Juist! ⚡ Turbo: sneller en een raket die niet leeg raakt. +${res.points}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('jp-asking', false);
      g.stageT = 0;
      g.pl.safe = Math.max(g.pl.safe, .6);
    },
  });

  function reachFlag(k) {
    if (g.flagBusy) return;
    g.flagBusy = true;
    const secs = g.stageT;
    socket.emit('jp-flag', k, res => {
      g.flagBusy = false;
      if (!res || res.error) {
        if (res && Number.isInteger(res.stage) && res.stage > g.stage) { g.stage = res.stage; }
        return;
      }
      g.stage = res.stage;
      sfx.go();
      buzz([30, 40, 30]);
      const tijd = (res.s || secs).toFixed(1).replace('.', ',');
      banner(`VLAG ${res.stage}!`, `${tijd} s · +${res.points}${res.record ? ' · ⏱️ record!' : ''}`, 'gold');
      const p = toCss(g.pl.x, g.pl.y - 1);
      fx.burst(p.x, p.y, { n: 26, color: '#ffc94a', speed: 380, life: .8, size: 4 });
      if (res.stage % 3 === 0) setTimeout(() => toast(`Welkom in de ${W.themeOf(res.stage).name}!`), 400);
      if (g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) {
        setTimeout(() => { if (g.state.phase === 'play') quiz.show(); }, 450);
      }
    });
  }

  // ---------- Besturing ----------
  const keys = { l: false, r: false, up: false };
  const KEYS = { arrowleft: 'l', q: 'l', a: 'l', arrowright: 'r', d: 'r', ' ': 'up', arrowup: 'up', w: 'up', z: 'up' };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('jp-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = KEYS[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    sfx.unlock();
    keys[k] = true;
  });
  document.addEventListener('keyup', e => {
    const k = KEYS[e.key.toLowerCase()];
    if (k) keys[k] = false;
  });
  addEventListener('blur', () => { keys.l = keys.r = keys.up = false; });

  const dpad = $('jp-dpad');
  const dp = new Map();
  function dpadUpdate() {
    let l = false, r = false;
    const rect = dpad.getBoundingClientRect();
    for (const x of dp.values()) { if (x - rect.left < rect.width / 2) l = true; else r = true; }
    keys.l = l;
    keys.r = r;
    dpad.children[0].classList.toggle('down', l);
    dpad.children[1].classList.toggle('down', r);
  }
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); try { dpad.setPointerCapture(e.pointerId); } catch {} dp.set(e.pointerId, e.clientX); dpadUpdate(); });
  dpad.addEventListener('pointermove', e => { if (dp.has(e.pointerId)) { dp.set(e.pointerId, e.clientX); dpadUpdate(); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, e => { dp.delete(e.pointerId); dpadUpdate(); });
  dpad.addEventListener('contextmenu', e => e.preventDefault());
  AK.holdButton($('jp-jet'), down => { keys.up = down; });

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('jp-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('jp-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('jp-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('jp-banner');
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
  const OUCH = { lava: 'In de lava! Terug naar de vlag.', stekels: 'Au, stekels! Terug naar de vlag.', laser: 'Geraakt door een laser! Terug naar de vlag.', vuur: 'Het vuurrad! Terug naar de vlag.' };

  // ---------- Elke frame ----------
  const canvas = $('jp-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 1, h: 1, S: 40, dpr: 1 };
  function toCss(x, y) {
    const c = g.cam || { x: g.pl.x, y: g.pl.y };
    return { x: ((x - c.x) * view.S + view.w / 2) / view.dpr, y: ((y - c.y) * view.S + view.h / 2) / view.dpr };
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('jp-game').classList.contains('hidden')) { if (on()) sfx.engine(0); return; }
    const left = g.state.endsAt - now();
    $('jp-clock').textContent = AK.clock(left);
    $('jp-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('jp-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('jp-countdown').textContent = Math.ceil(wait / 1000);
    const pl = g.pl;
    const time = gameTime();
    if (playing() && !quiz.open) {
      if (pl.dead > 0) {
        pl.dead -= dt;
        if (pl.dead <= 0) respawn(g.stage);
      } else {
        g.stageT += dt;
        pl.turbo = Math.max(0, pl.turbo - dt);
        pl.safe = Math.max(0, pl.safe - dt);
        const n = Math.ceil(dt / (1 / 120));
        let hit = null;
        for (let i = 0; i < n && !hit; i++) {
          const h = W.step(g.state.seed, pl, keys, dt / n, time - dt + dt * (i + 1) / n, pl.turbo > 0);
          if (h && (pl.safe <= 0 || h === 'lava')) hit = h;
        }
        if (pl.landed) { const p = toCss(pl.x, pl.y); fx.smoke(p.x, p.y, { n: 3, size: 8, life: .4, speed: 40, color: 'rgba(200,210,240,.35)' }); }
        if (pl.jet && Math.random() < .5) { const p = toCss(pl.x - .33 * pl.face, pl.y - .2); fx.burst(p.x, p.y, { n: 1, color: pl.turbo > 0 ? '#ff6bd6' : '#5ee7ff', speed: 60, life: .35, size: 3, up: -120 }); }
        if (hit) {
          pl.dead = W.RESPAWN_S;
          const p = toCss(pl.x, pl.y - .6);
          fx.burst(p.x, p.y, { n: 30, color: hit === 'lava' ? '#ff8c42' : '#ff4d6d', speed: 420, life: .7, size: 4 });
          fx.shock(p.x, p.y, 60, '#ffc94a');
          sfx.boom();
          buzz([120, 60, 120]);
          toast(OUCH[hit], 'bad');
          socket.emit('jp-fall');
        } else {
          // Energiecellen rapen
          for (const st of W.near(g.state.seed, pl.x)) {
            for (const c of st.cells) {
              if (g.hide.has(c.id) || Math.abs(c.x - pl.x) > .8 || Math.abs(c.y - (pl.y - .65)) > 1) continue;
              g.hide.add(c.id);
              socket.emit('jp-cell', c.id);
              sfx.marker();
              const p = toCss(c.x, c.y);
              fx.sparks(p.x, p.y, { n: 8, color: '#5ee7ff', speed: 300 });
              fx.pop(p.x, p.y - 10, '+10', '#5ee7ff', 22, .8);
            }
          }
          if (pl.x >= (g.stage + 1) * W.L) reachFlag(g.stage + 1);
        }
      }
      if (t - g.sentAt > 100) {
        g.sentAt = t;
        socket.emit('jp-pos', { x: Math.round(pl.x * 100) / 100, y: Math.round(pl.y * 100) / 100, f: (pl.jet ? 1 : 0) | (pl.face < 0 ? 2 : 0) | (pl.turbo > 0 ? 4 : 0) | (pl.dead > 0 ? 8 : 0) });
      }
    } else pl.jet = false;
    sfx.engine(pl.jet ? (pl.turbo > 0 ? 1.2 : .7) : 0);

    // HUD
    const fuel = pl.turbo > 0 ? 1 : pl.fuel;
    const bar = $('jp-fuel');
    bar.firstChild.style.width = `${Math.round(fuel * 100)}%`;
    bar.classList.toggle('turbo', pl.turbo > 0);
    bar.classList.toggle('low', pl.turbo <= 0 && pl.fuel < .25);
    $('jp-flags').textContent = `🏁 ${g.stage}`;
    $('jp-time').textContent = `⏱ ${g.stageT.toFixed(1).replace('.', ',')}`;

    // Camera en tekenen
    const fit = AK.fit(canvas, 1.5);
    const S = Math.min(fit.h / 14.5, fit.w / 12);
    view = { w: fit.w, h: fit.h, S, dpr: fit.dpr };
    const viewH = fit.h / S, viewW = fit.w / S;
    const wantX = pl.x + pl.face * Math.min(4, viewW * .15) + pl.vx * .25;
    const lo = viewH / 2 - 1.3, hi = W.H + .8 - viewH / 2;
    // Gsm rechtop: de lava net boven de knoppen, de rest is lucht.
    const pad = ($('jp-pad').offsetHeight || 0) * fit.dpr / S;
    const wantY = lo > hi ? W.LAVA + 1.2 + pad - viewH / 2 : Math.max(lo, Math.min(hi, pl.y - .8));
    if (!g.cam) g.cam = { x: wantX, y: wantY };
    g.cam.x += (wantX - g.cam.x) * Math.min(1, dt * 4);
    g.cam.y += (wantY - g.cam.y) * Math.min(1, dt * 4);
    const ghosts = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r || (v[3] & 8)) continue;
      if (Math.abs(v[0] - pl.x) > viewW) continue;
      const near = Math.abs(v[0] - pl.x) < 2.5 && Math.abs(v[1] - pl.y) < 2;
      ghosts.push({ x: v[0], y: v[1], face: v[3] & 2 ? -1 : 1, jet: v[3] & 1, turbo: v[3] & 4, color: r.color, alpha: near ? .2 : .42, name: near ? '' : r.name, n });
    }
    JpDraw.render(ctx, fit.w, fit.h, {
      seed: g.state.seed, t: time, cx: g.cam.x, cy: g.cam.y, S, ghosts, hide: g.hide, passed: g.stage,
      me: pl.dead > 0 ? null : { x: pl.x, y: pl.y, face: pl.face, jet: pl.jet, turbo: pl.turbo > 0, color: g.color, blink: pl.safe > 0, rim: true, fuel: pl.turbo > 0 ? 1 : pl.fuel },
    });
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
