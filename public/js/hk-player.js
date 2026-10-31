// Haakridder op de Chromebook of gsm: slinger met je plasmahaak van anker naar anker, van vlag naar vlag.
// De hele baan draait hier (geen vertraging); de server krijgt je plek, de vlaggen, de kristallen en de salto's, en geeft de vragen.
// Eén knop: spatie (of ↑, W, Z, klik, tik ergens op het scherm) ingedrukt = haak grijpt, loslaten = vliegen. 1-4 antwoorden.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, HkWorld en HkDraw.
(() => {
  const W = HkWorld;
  const root = document.createElement('div');
  root.id = 'haak';
  root.innerHTML = `
  <form id="hk-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Haakridder</p>
    <input id="hk-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="hk-join-error"></p>
    <button type="submit" class="big">Naar de startvlag</button>
  </form>
  <section id="hk-lobby" class="screen panel hidden">
    <p class="status">Haakridder</p>
    <canvas id="hk-lobby-knight" width="110" height="110"></canvas>
    <p class="title" id="hk-lobby-name"></p>
    <p>Slinger met je <strong>plasmahaak</strong> van kristalanker naar kristalanker. <strong>Ingedrukt houden</strong> = de haak grijpt en je zwaait. <strong>Loslaten</strong> = je vliegt.</p>
    <p><strong>Elke vlag is een vraag.</strong> Juist: 🪝 gouden haak (verder grijpen en harder zwaaien). Salto's in de lucht en kristallen geven extra punten.</p>
    <p class="muted small">Pas op voor de lasers en val niet in de afgrond. Val je, dan begin je opnieuw bij de laatste vlag.</p>
    <p class="muted small ls-hint-touch">Tik en houd je vinger op het scherm.</p>
    <p class="muted small ls-hint-keys">Spatie ingedrukt houden (of klikken en vasthouden) · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="hk-game" class="ak-game hidden">
    <div class="ls-hud ak-hud hk-hud">
      <div class="sv-mass" id="hk-score">0</div>
      <div class="px-chip" id="hk-flags">🏁 0</div>
      <div class="px-chip" id="hk-saltos">🤸 0</div>
      <div class="px-chip hk-gold hidden" id="hk-gold">🪝 goud</div>
      <div class="ry-alive" id="hk-rank"></div>
      <div class="ls-clock" id="hk-clock"></div>
    </div>
    <div class="ls-stage hk-stage" id="hk-stage">
      <canvas id="hk-canvas"></canvas>
      <div class="hk-tip" id="hk-tip">Houd ingedrukt om te grijpen, laat los om te vliegen</div>
      <div class="ls-feed" id="hk-feed"></div>
      <div class="ls-banner" id="hk-banner"></div>
      <div class="tw-toast" id="hk-toast"></div>
      <div class="tw-countdown hidden" id="hk-countdown"></div>
    </div>
  </section>
  <section id="hk-end" class="screen panel hidden">
    <div class="mark" id="hk-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="hk-end-title"></p>
    <p class="big" id="hk-end-score" style="font-size:1.6rem"></p>
    <p id="hk-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const fresh = () => {
    const s = W.spawnOf(0);
    return { x: s.x, y: s.y, vx: 0, vy: 0, ground: true, hook: null, len: 0, rot: 0, spin: 0, salto: 0, dead: 0, safe: 0, gold: 0 };
  };
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff',
    pl: fresh(), stage: 0, stageT: 0, hide: new Set(), flagBusy: false, sentAt: 0, others: new AK.Interp(110), cam: null, saltos: 0, grabs: 0,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.hk === '1';
  const show = name => { for (const s of ['hk-join', 'hk-lobby', 'hk-game', 'hk-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('hk-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('hk-join-error').textContent = res.error;
        show('hk-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('hk-join-error').textContent = '';
    });
  }
  $('hk-join').addEventListener('submit', e => { e.preventDefault(); join($('hk-name').value); });

  function respawn(k) {
    const s = W.spawnOf(k);
    Object.assign(g.pl, { x: s.x, y: s.y, vx: 0, vy: 0, ground: true, hook: null, len: 0, rot: 0, spin: 0, dead: 0, safe: 1.2 });
    g.cam = null;
  }

  socket.on('hk-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.hk = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.pl = fresh();
      g.stage = 0;
      g.stageT = 0;
      g.saltos = 0;
      g.grabs = 0;
      g.hide = new Set();
      g.flagBusy = false;
      g.others.clear();
      g.cam = null;
      $('hk-tip').classList.remove('weg');
      quiz.close();
      delete $('hk-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('hk-name').value = saved || '';
        show('hk-join');
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
      $('hk-lobby-name').textContent = s.name;
      HkDraw.portrait($('hk-lobby-knight'), g.color);
      show('hk-lobby');
    } else if (s.phase === 'play') {
      show('hk-game');
      $('hk-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('hk-end-medal').textContent = medals[me.rank - 1] || '🪝';
      $('hk-end-title').textContent = me.rank === 1 ? 'Jij bent de beste Haakridder!' : `Plek ${me.rank} van ${me.players}`;
      $('hk-end-score').textContent = `${me.score || 0} punten`;
      $('hk-end-stats').textContent = `${me.stage || 0} ${me.stage === 1 ? 'vlag' : 'vlaggen'} · ${me.saltos || 0} salto's · ${me.cells || 0} kristallen · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('hk-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('hk-end').dataset.done = '1';
      show('hk-end');
    }
  });

  socket.on('hk-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('hk-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('hk-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('hk-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    for (const [n, x, y, f, st, ax, ay, rot] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.others.get(n);
      g.others.push(n, [x, y, rot, f, st, ax, ay], t);
      if (before && st > before[4] && Math.abs(st - g.stage) <= 1) feedLine(`🏁 ${nameOf(n)} haalt vlag ${st}`);
    }
    g.others.prune(t, 800);
  });

  function setMe(me) {
    g.me = me;
    $('hk-score').textContent = me.score;
    $('hk-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  // ---------- Vragen aan de vlag ----------
  const quiz = AK.quiz({
    root: $('hk-game'),
    closeText: 'Verder slingeren',
    lock: 350,
    status: () => `Vlag ${g.stage} · juist = 🪝 gouden haak · je ridder wacht even`,
    ask: cb => socket.emit('hk-question', null, cb),
    answer: (i, cb) => socket.emit('hk-answer', i, res => {
      if (res && res.correct) {
        g.pl.gold = res.gold || W.GOLD_S;
        sfx.power();
      }
      cb(res);
    }),
    good: res => `Juist! 🪝 Gouden haak: je grijpt verder en zwaait harder. +${res.points}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('hk-asking', false);
      g.stageT = 0;
      g.pl.safe = Math.max(g.pl.safe, .6);
    },
  });

  function reachFlag(k) {
    if (g.flagBusy) return;
    g.flagBusy = true;
    const secs = g.stageT;
    socket.emit('hk-flag', k, res => {
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

  // ---------- Besturing: één knop ----------
  let hold = false;
  const keysDown = new Set();
  const HOLD_KEYS = new Set([' ', 'arrowup', 'w', 'z', 'enter']);
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('hk-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (!HOLD_KEYS.has(k)) return;
    e.preventDefault();
    sfx.unlock();
    keysDown.add(k);
  });
  document.addEventListener('keyup', e => { keysDown.delete(e.key.toLowerCase()); });
  const pointers = new Set();
  const stage = $('hk-stage');
  stage.addEventListener('pointerdown', e => {
    if (quiz.open || e.target.closest('.ak-question')) return;
    e.preventDefault();
    sfx.unlock();
    try { stage.setPointerCapture(e.pointerId); } catch {}
    pointers.add(e.pointerId);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(ev, e => pointers.delete(e.pointerId));
  stage.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('blur', () => { keysDown.clear(); pointers.clear(); });

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('hk-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('hk-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('hk-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('hk-banner');
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
  const OUCH = { afgrond: 'In de afgrond! Terug naar de vlag.', laser: 'Geraakt door een laser! Terug naar de vlag.' };

  // ---------- Elke frame ----------
  const canvas = $('hk-canvas');
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
    if (!on() || !g.state || g.state.phase !== 'play' || $('hk-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('hk-clock').textContent = AK.clock(left);
    $('hk-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('hk-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('hk-countdown').textContent = Math.ceil(wait / 1000);
    const pl = g.pl;
    const time = gameTime();
    hold = keysDown.size > 0 || pointers.size > 0;
    if (playing() && !quiz.open) {
      if (pl.dead > 0) {
        pl.dead -= dt;
        if (pl.dead <= 0) respawn(g.stage);
      } else {
        g.stageT += dt;
        pl.gold = Math.max(0, pl.gold - dt);
        pl.safe = Math.max(0, pl.safe - dt);
        const n = Math.ceil(dt / (1 / 120));
        let hit = null, grabbed = false, released = false, bounced = false;
        const before = pl.salto;
        for (let i = 0; i < n && !hit; i++) {
          pl.bounced = false;
          const h = W.step(g.state.seed, pl, hold, dt / n, time - dt + dt * (i + 1) / n, pl.gold > 0);
          if (pl.grabbed) grabbed = true;
          if (pl.released) released = true;
          if (pl.bounced) bounced = true;
          if (h && (pl.safe <= 0 || h === 'afgrond')) hit = h;
        }
        if (grabbed && pl.hook) {
          sfx.marker();
          buzz(15);
          if (++g.grabs >= 2) $('hk-tip').classList.add('weg');
          const a = W.at(pl.hook, time);
          const p = toCss(a.x, a.y);
          fx.sparks(p.x, p.y, { n: 8, color: pl.gold > 0 ? '#ffc94a' : '#5ee7ff', speed: 220 });
        }
        if (released) sfx.whoosh();
        if (bounced) { sfx.jump(); const p = toCss(pl.x, pl.y + .4); fx.burst(p.x, p.y, { n: 12, color: '#ff6bd6', speed: 260, life: .5, size: 3, up: -200 }); }
        if (pl.salto > before) {
          for (let i = before; i < pl.salto; i++) socket.emit('hk-salto');
          g.saltos += pl.salto - before;
          const p = toCss(pl.x, pl.y - 1);
          fx.pop(p.x, p.y, '🤸 +5', '#ffc94a', 20, .8);
        }
        if (hit) {
          pl.dead = W.RESPAWN_S;
          pl.hook = null;
          const p = toCss(pl.x, Math.min(pl.y, W.H));
          fx.burst(p.x, p.y, { n: 30, color: hit === 'afgrond' ? '#c77dff' : '#ff4d6d', speed: 420, life: .7, size: 4 });
          fx.shock(p.x, p.y, 60, '#ffc94a');
          sfx.boom();
          buzz([120, 60, 120]);
          toast(OUCH[hit], 'bad');
          socket.emit('hk-fall');
        } else {
          // Kristallen rapen
          for (const st of W.near(g.state.seed, pl.x)) {
            for (const c of st.cells) {
              if (g.hide.has(c.id) || Math.abs(c.x - pl.x) > 1 || Math.abs(c.y - pl.y) > 1.1) continue;
              g.hide.add(c.id);
              socket.emit('hk-cell', c.id);
              sfx.marker();
              const p = toCss(c.x, c.y);
              fx.sparks(p.x, p.y, { n: 8, color: '#c77dff', speed: 300 });
              fx.pop(p.x, p.y - 10, '+10', '#e3b8ff', 22, .8);
            }
          }
          if (pl.x >= (g.stage + 1) * W.L) reachFlag(g.stage + 1);
        }
      }
      if (t - g.sentAt > 100) {
        g.sentAt = t;
        const a = pl.hook ? W.at(pl.hook, time) : null;
        const r2 = v => Math.round(v * 100) / 100;
        socket.emit('hk-pos', { x: r2(pl.x), y: r2(pl.y), f: (a ? 1 : 0) | (pl.ground ? 2 : 0) | (pl.gold > 0 ? 4 : 0) | (pl.dead > 0 ? 8 : 0), ax: a ? r2(a.x) : 0, ay: a ? r2(a.y) : 0, rot: Math.round((pl.rot || 0) % (Math.PI * 2) * 10) / 10 });
      }
    }

    // HUD
    $('hk-flags').textContent = `🏁 ${g.stage}`;
    $('hk-saltos').textContent = `🤸 ${g.saltos}`;
    $('hk-gold').classList.toggle('hidden', !(pl.gold > 0));

    // Camera en tekenen
    const fit = AK.fit(canvas, 1.5);
    const S = Math.min(fit.h / 15.5, fit.w / 13);
    view = { w: fit.w, h: fit.h, S, dpr: fit.dpr };
    const viewH = fit.h / S, viewW = fit.w / S;
    const wantX = pl.x + Math.min(5, viewW * .2) + pl.vx * .2;
    // De camera volgt je omhoog tot 5 m boven de baan; onderaan blijft de afgrond net in beeld.
    const lo = viewH / 2 - 5.5, hi = W.ABYSS + .5 - viewH / 2;
    const wantY = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, pl.y - .5));
    if (!g.cam) g.cam = { x: wantX, y: wantY };
    g.cam.x += (wantX - g.cam.x) * Math.min(1, dt * 4);
    g.cam.y += (wantY - g.cam.y) * Math.min(1, dt * 3);
    const ghosts = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r || (v[3] & 8)) continue;
      if (Math.abs(v[0] - pl.x) > viewW) continue;
      const near = Math.abs(v[0] - pl.x) < 2.5 && Math.abs(v[1] - pl.y) < 2;
      ghosts.push({ x: v[0], y: v[1], rot: v[2], hook: Boolean(v[3] & 1), ground: Boolean(v[3] & 2), gold: Boolean(v[3] & 4), ax: v[5], ay: v[6], color: r.color, alpha: near ? .2 : .42, name: near ? '' : r.name, n });
    }
    // Welk anker zou je haak nu grijpen? Dat krijgt een ring.
    const aim = !pl.hook && pl.dead <= 0 ? W.target(g.state.seed, pl, time, pl.gold > 0) : null;
    const ha = pl.hook ? W.at(pl.hook, time) : null;
    HkDraw.render(ctx, fit.w, fit.h, {
      seed: g.state.seed, t: time, cx: g.cam.x, cy: g.cam.y, S, ghosts, hide: g.hide, passed: g.stage, aim: aim && aim.id, gold: pl.gold > 0,
      me: pl.dead > 0 ? null : { x: pl.x, y: pl.y, rot: pl.rot, hook: Boolean(ha), ground: pl.ground, ax: ha && ha.x, ay: ha && ha.y, gold: pl.gold > 0, color: g.color, blink: pl.safe > 0, rim: true },
    });
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
