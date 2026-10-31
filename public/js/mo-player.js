// Robomol op de gsm of Chromebook: robotmollen schieten uit negen putten, jij slaat ze met je zwaard.
// Chromebook: klik op een put of gebruik de toetsen (Q W E / A S D / Z X C, ook op een AZERTY-klavier op dezelfde plek).
// Gsm: tik op een put. Je zwaardlading raakt leeg: beantwoord een vraag (spatie of ⚡) voor een volle lading en het 🔥 Vuurzwaard.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, MoWorld en MoDraw.
(() => {
  const W = MoWorld;
  const root = document.createElement('div');
  root.id = 'robomol';
  root.innerHTML = `
  <form id="mo-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Robomol</p>
    <input id="mo-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="mo-join-error"></p>
    <button type="submit" class="big">Naar het burchtplein</button>
  </form>
  <section id="mo-lobby" class="screen panel hidden">
    <img class="game-logo" src="/img/icons/robomol.webp" alt="" style="width:96px;height:96px;border-radius:18px">
    <p class="status">Robomol</p>
    <p class="title" id="mo-lobby-name"></p>
    <p><strong>Robotmollen</strong> schieten uit de putten van de burcht. Mep ze met je zwaard voor ze weer wegduiken!</p>
    <p>🪖 gewone mol: 1 slag · 👑 goudhelm: 2 slagen, 3× zoveel punten · 💣 bomdrone: <strong>niet</strong> raken!</p>
    <p>⚡ Je zwaard raakt leeg. Juist antwoord = volle lading en 🔥 <strong>Vuurzwaard</strong>: dubbele punten en je slag raakt ook de buurputten.</p>
    <p class="muted small ls-hint-touch">Tik op een put om te slaan.</p>
    <p class="muted small ls-hint-keys">Klik op een put, of Q W E · A S D · Z X C (de 9 toetsen links op je klavier). Spatie = vraag.</p>
    <div class="spinner"></div>
  </section>
  <section id="mo-game" class="ak-game mo-game hidden">
    <div class="ls-hud ak-hud">
      <div class="nv-score" id="mo-score"></div>
      <div class="nv-mult" id="mo-combo"></div>
      <div class="ak-hp mo-energy" id="mo-energy"><i></i><span></span></div>
      <button type="button" class="secondary mo-ask" id="mo-ask">⚡ Opladen</button>
      <div class="ry-alive" id="mo-rank"></div>
      <div class="ls-clock" id="mo-clock"></div>
    </div>
    <div class="ls-stage" id="mo-stage">
      <canvas id="mo-canvas"></canvas>
      <div class="ls-banner" id="mo-banner"></div>
      <div class="tw-toast" id="mo-toast"></div>
      <div class="tw-countdown hidden" id="mo-countdown"></div>
      <p class="ls-keys">Q W E · A S D · Z X C slaan · spatie = vraag</p>
    </div>
  </section>
  <section id="mo-end" class="screen panel hidden">
    <div class="mark" id="mo-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="mo-end-title"></p>
    <p class="big" id="mo-end-score" style="font-size:1.6rem"></p>
    <p id="mo-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const KEYS = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyA: 3, KeyS: 4, KeyD: 5, KeyZ: 6, KeyX: 7, KeyC: 8, Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8 };
  const CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC'];
  const keyboard = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const scene = new MoDraw.Scene({ keys: keyboard ? ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'] : null });
  // Op een AZERTY-klavier staan er andere letters op dezelfde plek: toon die.
  if (keyboard && navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then(map => {
      const labels = CODES.map((c, i) => (map.get(c) || 'QWEASDZXC'[i]).toUpperCase());
      scene.keys = labels;
      scene.w = 0; // opnieuw tekenen met de juiste letters
      const hint = `${labels.slice(0, 3).join(' ')} · ${labels.slice(3, 6).join(' ')} · ${labels.slice(6).join(' ')}`;
      root.querySelector('.ls-keys').textContent = `${hint} slaan · spatie = vraag`;
      root.querySelector('.ls-hint-keys').textContent = `Klik op een put, of ${hint} (de 9 toetsen links op je klavier). Spatie = vraag.`;
    }).catch(() => {});
  }
  const sword = new MoDraw.Sword();
  const fx = new AK.Particles();

  const fresh = () => ({ hits: new Map(), killAt: new Map(), dentAt: new Map(), energyUntil: 0, energyMax: W.ENERGY_MS, fireUntil: 0, stunUntil: 0, lastSwing: 0, autoAsked: false, shake: 0 });
  const g = { state: null, joined: false, run: -1, offset: 0, me: null, moles: [], first: 0, r: fresh() };
  const now = () => Date.now() + g.offset;
  const gameT = () => now() - (g.state ? g.state.startedAt : 0);
  const on = () => document.body.dataset.mo === '1';
  const show = name => { for (const s of ['mo-join', 'mo-lobby', 'mo-game', 'mo-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('mo-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('mo-join-error').textContent = res.error;
        show('mo-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('mo-join-error').textContent = '';
    });
  }
  $('mo-join').addEventListener('submit', e => { e.preventDefault(); join($('mo-name').value); });

  socket.on('mo-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.mo = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    if (g.run !== s.run || g.seed !== s.seed) {
      g.run = s.run;
      g.seed = s.seed;
      g.joined = false;
      g.me = null;
      g.r = fresh();
      g.first = 0;
      g.moles = W.schedule(s.seed, s.minutes * 60000);
      quiz.close();
      delete $('mo-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('mo-name').value = saved || '';
        show('mo-join');
      }
      return;
    }
    g.joined = true;
    if (s.hits) for (const [id, n] of s.hits) if ((g.r.hits.get(id) || 0) < n) g.r.hits.set(id, n);
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('mo-lobby-name').textContent = s.name;
      show('mo-lobby');
    } else if (s.phase === 'play') {
      show('mo-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('mo-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('mo-end-medal').textContent = medals[me.rank - 1] || '⚔️';
      $('mo-end-title').textContent = me.rank === 1 ? 'Jij bent de beste mollenmepper!' : `Plek ${me.rank} van ${me.players}`;
      $('mo-end-score').textContent = `${me.score || 0} punten · ${me.kills || 0} mollen`;
      $('mo-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('mo-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('mo-end').dataset.done = '1';
      show('mo-end');
    }
  });

  socket.on('mo-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('mo-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('mo-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('mo-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    g.me = me;
    const r = g.r;
    r.energyMax = me.energyMax || r.energyMax;
    r.energyUntil = now() + me.energy;
    r.fireUntil = now() + me.fire;
    if (me.stun > 0) r.stunUntil = Math.max(r.stunUntil, now() + me.stun);
    if (me.energy > 0) r.autoAsked = false;
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('mo-score').textContent = `⚔️ ${me.score}`;
    $('mo-combo').textContent = me.combo >= 2 ? `×${me.mult} · ${me.combo} op rij` : `×${me.mult}`;
    $('mo-combo').dataset.m = me.mult + 1;
    $('mo-rank').textContent = me.rank ? `#${me.rank}` : '';
  }

  // ---------- Vragen ----------
  const quiz = AK.quiz({
    root: $('mo-game'),
    closeText: 'Terug naar de putten',
    lock: 1000, // je bent nog aan het meppen: eerst rustig lezen
    status: () => 'Juist = ⚡ volle lading en 🔥 Vuurzwaard',
    ask: cb => socket.emit('mo-question', null, cb),
    answer: (i, cb) => socket.emit('mo-answer', i, cb),
    good: res => {
      g.r.energyUntil = now() + res.energy;
      g.r.fireUntil = now() + res.fire;
      g.r.autoAsked = false;
      if (g.me) { g.me.score += res.bonus; hud(); }
      setTimeout(() => { banner('🔥 VUURZWAARD!', 'Dubbele punten · je slag raakt ook de buurputten', 'gold'); sfx.power(); }, 900);
      return `Juist! +${res.bonus} · ⚡ volle lading · 🔥 Vuurzwaard!`;
    },
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: () => false,
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play') return;
    quiz.show();
  }
  $('mo-ask').addEventListener('click', e => { e.currentTarget.blur(); ask(); });

  // ---------- Slaan ----------
  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !quiz.open && !$('mo-game').classList.contains('hidden');
  }
  const energy = () => Math.max(0, g.r.energyUntil - now());
  const fire = () => g.r.fireUntil > now();

  function upNow() {
    const t = gameT();
    const res = W.active(g.moles, t, g.first);
    g.first = res.first;
    return res.list;
  }

  function strike(hole) {
    const r = g.r;
    if (!playing() || hole < 0) return;
    const t0 = performance.now();
    if (t0 - r.lastSwing < W.SWING_MS) return;
    if (now() < r.stunUntil) { toast('💫 Even duizelig…', 'bad'); return; }
    if (energy() <= 0) { sfx.empty(); ask(); return; }
    r.lastSwing = t0;
    sword.strike(null, scene.target(hole), t0);
    sfx.swoosh();
    setTimeout(() => resolve(hole), 65);
  }

  function resolve(hole) {
    const r = g.r;
    const t = gameT();
    const burning = fire();
    const reach = burning ? [hole, ...W.neighbours(hole)] : [hole];
    const ids = [];
    for (const m of upNow()) {
      if (!reach.includes(m.hole) || !W.hittable(m, t, 120)) continue;
      if (m.type === 'bom' && m.hole !== hole) continue;
      const done = r.hits.get(m.id) || 0;
      if (done >= W.TYPES[m.type].hp) continue;
      ids.push(m.id);
      r.hits.set(m.id, done + 1);
      const [x, y] = scene.target(m.hole);
      const o = scene.holes[m.hole];
      if (m.type === 'bom') {
        r.killAt.set(m.id, t);
        r.stunUntil = now() + W.STUN_MS;
        fx.shock(x, y, o.scale * 1.2, '#ff4d6d', .6);
        fx.burst(x, y, { n: 40, color: '#ff8c42', speed: o.scale * 5, life: .8, size: 5 });
        fx.smoke(x, y, { n: 10, size: o.scale * .35, speed: o.scale });
        r.shake = performance.now() + 380;
        sfx.boom();
        buzz([120, 60, 160]);
        banner('BOEM!', 'Een bomdrone! Even duizelig…', 'bad');
      } else if (done + 1 < W.TYPES[m.type].hp) {
        r.dentAt.set(m.id, t);
        fx.sparks(x, y - o.scale * .4, { n: 14, color: '#ffe08a', speed: o.scale * 7 });
        sfx.hit();
        buzz(30);
      } else {
        r.killAt.set(m.id, t);
        fx.shock(x, y, o.scale * .7, burning ? '#ff8c42' : '#5ee7ff', .45);
        fx.sparks(x, y, { n: 18, color: burning ? '#ffb347' : '#bff3ff', speed: o.scale * 8 });
        fx.burst(x, y, { n: 10, color: m.type === 'goud' ? '#ffc94a' : '#5ee7ff', speed: o.scale * 4, life: .5, size: 3 });
        r.shake = performance.now() + 120;
        sfx.hit();
        sfx.marker();
        buzz(40);
      }
    }
    if (!ids.length) {
      const o = scene.holes[hole];
      fx.smoke(o.sx, o.sy, { n: 4, size: o.scale * .15, speed: o.scale * .5, color: 'rgba(90,90,110,.5)' });
    }
    if (burning && ids.length) for (const n of W.neighbours(hole)) { const [x, y] = scene.target(n); fx.burst(x, y + scene.holes[n].ry, { n: 6, color: '#ff8c42', speed: 120, life: .4, size: 3 }); }
    socket.emit('mo-swing', { hole, ids }, res => {
      if (!res || res.error) {
        if (res && res.empty) { r.energyUntil = 0; ask(); }
        return;
      }
      for (const h of res.hits) {
        const m = g.moles[h.id];
        if (!m || !h.kill) continue;
        const [x, y] = scene.target(m.hole);
        const big = h.pts >= 60;
        fx.pop(x, y - scene.holes[m.hole].scale * .5, h.pts > 0 ? `+${h.pts}` : `${h.pts}`, h.pts < 0 ? '#ff4d6d' : big ? '#ffc94a' : '#ffffff', Math.max(22, scene.holes[m.hole].scale * (big ? .55 : .42)));
      }
      if (g.me) {
        const before = g.me.mult;
        Object.assign(g.me, { score: res.score, combo: res.combo, mult: res.mult });
        if (res.mult > before) { banner(`COMBO ×${res.mult}`, `${res.combo} op rij!`, 'gold'); sfx.go(); }
        hud();
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('mo-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (e.code in KEYS) { e.preventDefault(); if (!e.repeat) strike(KEYS[e.code]); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ask(); }
  });

  const canvas = $('mo-canvas');
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    sfx.unlock();
    const rect = canvas.getBoundingClientRect();
    const k = canvas.width / rect.width;
    const up = upNow().filter(m => !g.r.killAt.has(m.id) && W.rise(m, gameT()) > .4).map(m => m.hole);
    strike(scene.pick((e.clientX - rect.left) * k, (e.clientY - rect.top) * k, up));
  });

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('mo-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('mo-banner');
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

  // Hoe staat een mol erbij: hoe ver uit de put, geraakt, gedeukt?
  function view(m, t, r) {
    const kill = r.killAt.get(m.id);
    if (kill !== undefined) {
      if (m.type === 'bom') return null;
      const a = t - kill, base = W.rise(m, kill);
      return { m, state: 'hit', r: a < 160 ? base : Math.max(0, base - (a - 160) / 240), squash: Math.max(0, 1 - a / 160) };
    }
    if ((r.hits.get(m.id) || 0) >= W.TYPES[m.type].hp) return null; // al geraakt vóór herladen
    const dent = r.dentAt.get(m.id);
    return { m, state: dent !== undefined ? 'dent' : '', r: W.rise(m, t), squash: dent !== undefined ? Math.max(0, 1 - (t - dent) / 140) : 0 };
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(pt) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (pt - last) / 1000);
    last = pt;
    if (!on() || !g.state || g.state.phase !== 'play' || $('mo-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('mo-clock').textContent = AK.clock(left);
    $('mo-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('mo-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('mo-countdown').textContent = Math.ceil(wait / 1000);
    const r = g.r;
    // Zwaardlading
    const e = energy(), max = r.energyMax || W.ENERGY_MS;
    const k = Math.max(0, Math.min(1, e / max));
    const bar = $('mo-energy').firstElementChild;
    bar.style.width = `${k * 100}%`;
    bar.className = fire() ? 'fire' : k < .2 ? 'low' : k < .45 ? 'mid' : '';
    $('mo-energy').lastElementChild.textContent = fire() ? `🔥 Vuurzwaard ${Math.ceil((r.fireUntil - now()) / 1000)}` : e > 0 ? `⚡ ${Math.ceil(e / 1000)} s` : '⚡ Leeg: beantwoord een vraag';
    $('mo-game').classList.toggle('low', wait <= 0 && k < .2);
    if (wait <= 0 && e <= 0 && !quiz.open && !r.autoAsked) { r.autoAsked = true; sfx.empty(); ask(); }

    const { w, h } = AK.fit(canvas, 1.5);
    scene.resize(w, h);
    const t = Math.max(-1, gameT());
    const moles = [];
    for (const m of upNow()) { const v = view(m, t, r); if (v) moles.push(v); }
    ctx.save();
    if (pt < r.shake) ctx.translate((Math.random() - .5) * w * .012, (Math.random() - .5) * h * .012);
    scene.draw(ctx, pt / 1000, moles);
    fx.update(dt);
    fx.draw(ctx);
    if (now() < r.stunUntil) {
      ctx.fillStyle = `rgba(255,60,90,${.12 + .06 * Math.sin(pt / 60)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const burning = fire();
    const tip = sword.draw(ctx, scene.sprites, w, h, pt / 1000, pt, burning);
    if (burning && Math.random() < .5) fx.burst(tip.tipX, tip.tipY, { n: 1, color: Math.random() < .5 ? '#ff8c42' : '#ffd166', speed: 60, life: .5, size: 3, up: 80 });
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
