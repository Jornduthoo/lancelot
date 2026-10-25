// Robopaarden op de gsm of Chromebook: bouw je robotpaard in de wachtzaal en race in 3D rond het burchtmeer.
// Chromebook: ↑ gas, ↓ rem, ← → sturen (ook ZQSD/WASD), spatie = wapen, Shift of N = nitro, 1-4 = antwoorden.
// Gsm: je paard geeft zelf gas. Duim links = sturen (naar beneden trekken = remmen), rechts de knoppen voor wapen en nitro.
// Rij door een runenkist: een vraag. Je paard galoppeert intussen vanzelf verder.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, RpWorld, RpDraw en Rp3D.
(() => {
  const W = RpWorld;
  const root = document.createElement('div');
  root.id = 'paarden';
  const opt = (key, label) => `<div class="rp-opt" data-key="${key}"><span class="rp-opt-label">${label}</span><div class="rp-opt-pick"></div></div>`;
  root.innerHTML = `
  <form id="rp-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Robopaarden</p>
    <input id="rp-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="rp-join-error"></p>
    <button type="submit" class="big">Naar de stal</button>
  </form>
  <section id="rp-lobby" class="screen panel rp-stable hidden">
    <p class="status">Robopaarden · de stal</p>
    <p class="title" id="rp-lobby-name"></p>
    <div class="rp-builder">
      <div class="rp-preview"><canvas id="rp-preview" width="420" height="300"></canvas><button type="button" class="secondary rp-turn" id="rp-turn" title="Draai je paard">↻</button></div>
      <div class="rp-opts">
        ${opt('romp', 'Romp')}${opt('neon', 'Neon')}${opt('manen', 'Manen')}${opt('ogen', 'Ogen')}${opt('extra', 'Extra')}${opt('patroon', 'Patroon')}
        <button type="button" class="secondary rp-dice" id="rp-dice">🎲 Verras me</button>
      </div>
    </div>
    <p class="small">🏁 Rij zoveel mogelijk rondjes. 📦 Rij door een gouden <strong>runenkist</strong>: juist antwoord = een wapen. 🔥 vuurbal · 🦅 robovalk · ⚙️ spijkers · 🛡️ schild · ⚡ nitro · 🌩️ donder</p>
    <p class="muted small ls-hint-keys">↑ gas · ↓ rem · ← → sturen · spatie = wapen · Shift = nitro · 1-4 = antwoorden</p>
    <p class="muted small ls-hint-touch">Je paard geeft zelf gas. Duim links = sturen, naar beneden trekken = remmen. Rechts: wapen en nitro.</p>
    <p class="muted small">Wacht tot de leerkracht de race start…</p>
  </section>
  <section id="rp-game" class="ak-game rp-game hidden">
    <div class="ls-hud ak-hud rp-hud">
      <div class="rp-pos" id="rp-pos"></div>
      <div class="rp-lap" id="rp-lap"></div>
      <div class="rp-item" id="rp-item" title="Wapen (spatie)"></div>
      <div class="rp-nitro" id="rp-nitro" title="Nitro (Shift)"></div>
      <div class="ls-clock" id="rp-clock"></div>
    </div>
    <div class="ls-stage" id="rp-stage">
      <canvas id="rp-canvas"></canvas>
      <div class="ls-banner" id="rp-banner"></div>
      <div class="tw-toast" id="rp-toast"></div>
      <div class="tw-countdown hidden" id="rp-countdown"></div>
      <div class="rp-wrong hidden" id="rp-wrong">⟲ VERKEERDE RICHTING</div>
      <div class="rp-goal hidden" id="rp-goal">
        <strong>🏁 Rij zoveel mogelijk rondjes</strong>
        <span>Volg de weg en de gele pijlen. Je paard stuurt een beetje mee.</span>
        <span>📦 Gouden kist = een vraag. Juist = een wapen.</span>
        <span class="ls-hint-keys">↑ gas · ← → sturen · spatie = wapen · Shift = nitro</span>
        <span class="ls-hint-touch">Je paard loopt vanzelf. Duim links opzij = sturen.</span>
      </div>
      <div class="ak-touch rp-touch">
        <button type="button" class="ls-btn rp-use" id="rp-use-btn"><span id="rp-use-icon">·</span><small>wapen</small></button>
        <button type="button" class="ls-btn rp-boost" id="rp-boost-btn">⚡<small>nitro</small></button>
      </div>
      <p class="ls-keys">↑ gas · ↓ rem · ← → sturen · spatie = wapen · Shift = nitro</p>
    </div>
  </section>
  <section id="rp-end" class="screen panel hidden">
    <div class="mark" id="rp-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="rp-end-title"></p>
    <canvas id="rp-end-horse" width="300" height="220" style="width:220px;height:160px;margin:0 auto"></canvas>
    <p id="rp-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const fresh = () => ({ x: 0, y: 0, z: 0, vz: 0, a: 0, v: 0, boost: 0, spin: 0, zap: 0, loc: { i: -1 } });
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, spawn: -1, car: fresh(), camA: 0, phase: 0,
    others: new AK.Interp(120), info: new Map(), ranks: new Map(), shots: [], traps: [], hiddenBoxes: new Map(), box: -1,
    waitUntil: 0, boxReady: 0, turn: 0, lastSend: 0, shieldEnd: 0, safeEnd: 0, falling: 0, wrongFor: 0, view: 'side', look: null, quality: 1,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.rp === '1';
  const show = name => { for (const s of ['rp-join', 'rp-lobby', 'rp-game', 'rp-end']) $(s).classList.toggle('hidden', s !== name); if (name !== 'rp-game') sfx.engine(0); };
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const myAv = () => (typeof Avatar !== 'undefined' ? Avatar.mine() : null);
  const avOf = name => (typeof Avatar !== 'undefined' ? Avatar.byName(name) : null);

  // ---------- Het paard aanpassen ----------
  function savedLook() {
    try { const l = JSON.parse(store('lancelot-rp-look') || 'null'); return l && typeof l === 'object' ? l : null; } catch { return null; }
  }
  let lookTimer = null;
  function setLook(look, send = true) {
    g.look = W.cleanLook(look, g.state && g.state.name, 0);
    store('lancelot-rp-look', JSON.stringify(g.look));
    renderOpts();
    if (!send) return;
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => socket.emit('rp-look', g.look), 200);
  }
  function renderOpts() {
    for (const row of root.querySelectorAll('.rp-opt')) {
      const key = row.dataset.key;
      const list = W.LOOK[key];
      const pick = row.querySelector('.rp-opt-pick');
      if (!pick.dataset.built) {
        pick.dataset.built = '1';
        if (list[0].c) {
          pick.classList.add('swatches');
          pick.innerHTML = list.map((o, i) => `<button type="button" class="rp-swatch" data-i="${i}" title="${o.name}" style="--c:${o.c}"></button>`).join('');
          pick.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLook({ ...g.look, [key]: Number(b.dataset.i) }); });
        } else {
          pick.innerHTML = '<button type="button" class="secondary rp-step" data-d="-1">◀</button><b></b><button type="button" class="secondary rp-step" data-d="1">▶</button>';
          pick.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            const n = list.length;
            setLook({ ...g.look, [key]: (g.look[key] + Number(b.dataset.d) + n) % n });
          });
        }
      }
      if (list[0].c) for (const b of pick.children) b.classList.toggle('on', Number(b.dataset.i) === g.look[key]);
      else pick.querySelector('b').textContent = list[g.look[key]].name;
    }
  }
  $('rp-dice').addEventListener('click', () => {
    const look = {};
    for (const k of W.LOOK_KEYS) look[k] = Math.floor(Math.random() * W.LOOK[k].length);
    setLook(look);
    sfx.power();
  });
  const VIEWS = ['side', 'back', 'front'];
  $('rp-turn').addEventListener('click', () => { g.view = VIEWS[(VIEWS.indexOf(g.view) + 1) % 3]; });
  $('rp-preview').addEventListener('click', () => { g.view = VIEWS[(VIEWS.indexOf(g.view) + 1) % 3]; });

  // ---------- Aanmelden en de stand van de server ----------
  function join(name) {
    if (!g.look) g.look = W.cleanLook(savedLook(), name, 0);
    socket.emit('rp-join', { playerId, name, look: g.look }, res => {
      if (res.error) {
        g.joined = false;
        $('rp-join-error').textContent = res.error;
        show('rp-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('rp-join-error').textContent = '';
    });
  }
  $('rp-join').addEventListener('submit', e => { e.preventDefault(); join($('rp-name').value); });

  socket.on('rp-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.rp = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    setRoster(s.roster);
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.spawn = -1;
      g.others.clear();
      g.hiddenBoxes.clear();
      g.shots = [];
      g.traps = [];
      g.waitUntil = 0;
      quiz.close();
      delete $('rp-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('rp-name').value = saved || '';
        show('rp-join');
      }
      return;
    }
    g.joined = true;
    if (!g.look) setLook(s.look, false);
    if (s.phase === 'lobby') {
      $('rp-lobby-name').textContent = s.name;
      renderOpts();
      show('rp-lobby');
    } else if (s.phase === 'play') {
      show('rp-game');
      $('rp-game').style.setProperty('--team', RpDraw.colors(g.look).neon);
      resize();
    } else if (s.phase === 'einde') {
      quiz.close();
      const medals = ['🥇', '🥈', '🥉'];
      $('rp-end-medal').textContent = medals[s.rank - 1] || '🏁';
      $('rp-end-title').textContent = s.rank === 1 ? 'Jij wint de race!' : `Plek ${s.rank} van ${s.players}`;
      const best = s.bestLap ? ` · snelste ronde ${(s.bestLap / 1000).toFixed(1).replace('.', ',')} s` : '';
      $('rp-end-stats').textContent = `${s.laps} ${s.laps === 1 ? 'ronde' : 'ronden'}${best} · 💥 ${s.hits} raak · ✔ ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('rp-end').dataset.done && s.rank && s.rank <= 3) confetti(4000);
      $('rp-end').dataset.done = '1';
      show('rp-end');
    }
  });

  function setRoster(list) {
    for (const r of list || []) {
      const old = g.info.get(r.n);
      g.info.set(r.n, { name: r.name, look: r.look, neon: RpDraw.colors(r.look).neon, av: old && old.name === r.name ? old.av : avOf(r.name), phase: old ? old.phase : Math.random() });
    }
  }
  socket.on('rp-roster', setRoster);

  socket.on('rp-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('rp-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('rp-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  // Mijn eigen stand. Een nieuwe spawn = je staat ergens anders (start, na de kloof, na een correctie).
  socket.on('rp-me', me => {
    g.me = me;
    g.offset = me.now - Date.now();
    if (me.spawn !== g.spawn) {
      g.spawn = me.spawn;
      Object.assign(g.car, { x: me.x, y: me.y, z: 0, vz: 0, a: me.a, v: 0, boost: 0 });
      g.camA = me.a;
      g.falling = 0;
    }
    g.car.zap = Math.max(g.car.zap, me.zap / 1000);
    g.shieldEnd = performance.now() + me.shield;
    g.safeEnd = performance.now() + me.safe;
    g.boxReady = performance.now() + (me.box || 0);
    hud();
  });

  socket.on('rp-world', d => {
    if (!g.state || g.state.phase !== 'play') return;
    const t = performance.now();
    for (const [n, x, y, z, a, v, flags] of d.p) {
      if (g.me && n === g.me.n) continue;
      g.others.push(n, [x, y, a, z, v, flags], t);
    }
    g.others.prune(t, 1500);
    g.shots = d.s.map(([k, id, x, y, a]) => ({ kind: k === 2 ? 'valk' : 'vuurbal', id, x, y, a }));
    if (d.t) g.traps = d.t.map(([id, x, y]) => ({ id, x, y }));
    if (d.r) {
      g.ranks.clear();
      d.r.forEach(([n, laps], i) => g.ranks.set(n, { rank: i + 1, laps }));
      g.count = d.r.length;
      hud();
    }
  });
  socket.on('rp-hit', h => {
    Rp3D.boom(h.x, h.y, h.blocked ? 120 : 200, h.blocked ? 'blue' : 'fire');
    if (Math.hypot(h.x - g.car.x, h.y - g.car.y) < 1500) sfx.boom();
    if (g.me && h.n === g.me.n && h.blocked) toast('🛡️ Geblokkeerd!', 'good');
  });
  socket.on('rp-pop', s => { if (s.kind === 'vuurbal') Rp3D.spark(s.x, s.y, '#ff9b2f'); });
  socket.on('rp-spin', s => {
    g.car.spin = s.ms / 1000;
    sfx.hit();
    buzz([120, 50, 120]);
    banner('💫 GERAAKT!', s.by ? `${s.by} raakte je` : 'Au!', 'bad');
  });
  socket.on('rp-raak', r => {
    sfx.power();
    buzz([30, 30, 50]);
    banner('RAAK!', `${r.victim} tolt rond`, 'gold');
  });
  socket.on('rp-warn', w => { toast(`🦅 ${w.by} stuurt een robovalk op je af!`, 'bad'); sfx.empty(); });
  socket.on('rp-zapped', z => { g.car.zap = z.ms / 1000; banner('🌩️ DONDER!', `${z.by} vertraagt je`, 'bad'); sfx.boom(); buzz(200); });
  socket.on('rp-donder', d => { g.flash = performance.now() + 350; if (!g.me || d.n !== g.me.n) sfx.boom(); });
  socket.on('rp-lap', l => {
    const sec = (l.ms / 1000).toFixed(1).replace('.', ',');
    banner(l.record ? '⏱️ SNELSTE RONDE!' : `RONDE ${l.laps + 1}`, `Vorige ronde: ${sec} s${l.personal && !l.record ? ' · je beste!' : ''}${l.bonus ? ' · +1 ⚡ nitro' : ''}`, l.record ? 'gold' : '');
    sfx.go();
  });

  function hud() {
    const me = g.me;
    if (!me) return;
    const r = g.ranks.get(me.n);
    if (r) {
      $('rp-pos').innerHTML = `${r.rank}<small>/${g.count}</small>`;
      $('rp-lap').textContent = `Ronde ${r.laps + 1}`;
    }
    const item = me.item ? W.ITEMS[me.item] : null;
    const rest = Math.ceil((g.boxReady - performance.now()) / 1000);
    $('rp-item').innerHTML = item ? `<span>${item.icon}</span>` : rest > 0 ? `<span class="empty">📦</span><b class="rp-rest">${rest}</b>` : '<span class="empty">📦</span>';
    $('rp-item').classList.toggle('ready', !!item);
    $('rp-item').title = item ? `${item.name} (spatie)` : rest > 0 ? `De kisten laden op: nog ${rest} s` : 'Rij door een gouden runenkist';
    $('rp-use-icon').textContent = item ? item.icon : '📦';
    $('rp-use-btn').classList.toggle('ready', !!item);
    $('rp-nitro').innerHTML = Array.from({ length: Math.max(3, me.nitro) }, (_, i) => `<i class="${i < me.nitro ? 'on' : ''}">⚡</i>`).join('');
    $('rp-boost-btn').classList.toggle('ready', me.nitro > 0);
  }

  // ---------- Vragen uit de runenkisten ----------
  const quiz = AK.quiz({
    root: $('rp-game'),
    closeText: 'Verder racen',
    lock: 700,
    again: false,
    status: () => (g.me && g.me.item ? 'Je hebt al een wapen: juist = extra nitro ⚡' : 'Juist = een wapen uit de runenkist'),
    ask: cb => {
      socket.emit('rp-asking', true);
      socket.emit('rp-question', { box: g.box }, cb);
    },
    answer: (i, cb) => socket.emit('rp-answer', i, res => {
      if (res && typeof res.wait === 'number') g.waitUntil = performance.now() + (res.wait || 0);
      cb(res);
    }),
    good: res => {
      if (res.got) {
        setTimeout(() => { banner(`${W.ITEMS[res.got].icon} ${W.ITEMS[res.got].name.toUpperCase()}`, touch ? 'Tik op de wapenknop' : 'Druk op spatie', 'gold'); sfx.power(); }, 700);
        return `Juist! Je krijgt: ${W.ITEMS[res.got].icon} ${W.ITEMS[res.got].name}`;
      }
      if (res.nitro) return 'Juist! +1 ⚡ nitro';
      g.car.boost = Math.max(g.car.boost, .9);
      return 'Juist! ⚡ Turbosprintje';
    },
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: () => false,
    close: () => { socket.emit('rp-asking', false); g.box = -1; },
  });

  function openBox(b) {
    if (quiz.open || performance.now() < Math.max(g.waitUntil, g.boxReady)) return;
    g.box = b.id;
    sfx.marker();
    buzz(30);
    quiz.show();
  }

  // ---------- Wapens en nitro ----------
  function useItem() {
    if (!playing() || quiz.open || !g.me || !g.me.item) return;
    const kind = g.me.item;
    socket.emit('rp-use', { a: g.car.a }, res => {
      if (!res || res.error) return;
      if (kind === 'schild') { banner('🛡️ SCHILD', '8 seconden onkwetsbaar', 'gold'); sfx.power(); }
      else if (kind === 'turbo') { banner('⚡ NITRO ×3', touch ? 'Tik op ⚡' : 'Druk op Shift', 'gold'); sfx.power(); }
      else if (kind === 'donder') banner('🌩️ DONDERSLAG', `${res.zapped || 0} ${res.zapped === 1 ? 'paard' : 'paarden'} voor je vertraagd`, 'gold');
      else if (kind === 'spijkers') sfx.swoosh();
      else sfx.laser();
    });
    g.me.item = null;
    hud();
  }
  function nitro() {
    if (!playing() || !g.me || g.me.nitro <= 0 || g.car.boost > .3) return;
    socket.emit('rp-nitro', null, res => {
      if (!res || res.error) return;
      g.car.boost = W.HORSE.nitroTime;
      sfx.whoosh();
      buzz(40);
    });
    g.me.nitro--;
    hud();
  }
  AK.holdButton($('rp-use-btn'), down => { if (down) useItem(); });
  AK.holdButton($('rp-boost-btn'), down => { if (down) nitro(); });

  // ---------- Besturing ----------
  const keys = new Set();
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('rp-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (!e.repeat) useItem(); return; }
    if (k === 'shift' || k === 'n') { e.preventDefault(); if (!e.repeat) nitro(); return; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'q', 's', 'd', 'w', 'a'].includes(k)) { e.preventDefault(); keys.add(k); }
  });
  document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  const stick = AK.stick($('rp-stage'));
  function input(dt) {
    if (quiz.open) return { auto: true };
    let gas = 0, turn = 0;
    if (keys.has('arrowup') || keys.has('z') || keys.has('w')) gas = 1;
    if (keys.has('arrowdown') || keys.has('s')) gas = -1;
    if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) turn -= 1;
    if (keys.has('arrowright') || keys.has('d')) turn += 1;
    if (touch) {
      // Op de gsm geef je vanzelf gas; trek de duim naar beneden om te remmen.
      gas = stick.active && stick.y > .55 ? -1 : 1;
      if (stick.active) turn = Math.abs(stick.x) < .12 ? 0 : Math.max(-1, Math.min(1, (stick.x - Math.sign(stick.x) * .12) * 1.5));
    }
    // Zacht insturen: een toets geeft niet meteen een ruk aan het stuur.
    g.turn += (turn - g.turn) * Math.min(1, dt * (turn ? 9 : 14));
    if (Math.abs(g.turn) < .02) g.turn = 0;
    return { gas, turn: g.turn, assist: true };
  }
  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('rp-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('rp-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('rp-banner');
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

  // ---------- Tekenen ----------
  const canvas = $('rp-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 0, h: 0, dpr: 1 };
  function resize() {
    const stage = $('rp-stage');
    const dpr = Math.min(1.25, window.devicePixelRatio || 1) * g.quality;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view = { w: canvas.width, h: canvas.height, dpr };
  }
  addEventListener('resize', resize);
  // Houdt een toestel het niet bij, dan tekenen we op minder pixels (zachter beeld, maar vloeiend).
  const qs = { from: 0, frames: 0, good: 0 };
  function quality(t) {
    if (!qs.from) qs.from = t;
    qs.frames++;
    if (t - qs.from < 1500) return;
    const fps = (qs.frames * 1000) / (t - qs.from);
    qs.from = t;
    qs.frames = 0;
    if (document.hidden) return;
    let next = g.quality;
    if (fps < 40 && g.quality > .5) next = Math.max(.5, g.quality - .15);
    qs.good = fps > 55 ? qs.good + 1 : 0;
    if (qs.good >= 3 && g.quality < 1) { next = Math.min(1, g.quality + .1); qs.good = 0; }
    if (next !== g.quality) { g.quality = next; resize(); }
  }

  // Een kleine kaart linksonder: de baan en alle paarden.
  let mini = null;
  function minimap(w, h, t) {
    const size = Math.round(Math.min(w * .22, h * .32, 260 * view.dpr));
    if (!mini || mini.w !== size) {
      const k = size / W.W;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = Math.round(W.H * k);
      const m = c.getContext('2d');
      m.lineJoin = m.lineCap = 'round';
      for (const p of W.PATHS) {
        if (p.secret) continue;
        m.beginPath();
        for (let i = p.first; i <= p.last; i++) (i === p.first ? m.moveTo : m.lineTo).call(m, W.X[i] * k, W.Y[i] * k);
        if (p.closed) m.closePath();
        else { const e = W.NEXT[p.last]; m.lineTo(W.X[e] * k, W.Y[e] * k); const s = W.PREV[p.first]; m.moveTo(W.X[s] * k, W.Y[s] * k); m.lineTo(W.X[p.first] * k, W.Y[p.first] * k); }
        m.strokeStyle = 'rgba(0, 0, 0, .6)';
        m.lineWidth = Math.max(4, p.half * 2.6 * k);
        m.stroke();
        m.strokeStyle = p.key === 'hoofd' ? 'rgba(200, 220, 255, .75)' : p.key === 'burcht' ? 'rgba(255, 211, 79, .7)' : 'rgba(255, 140, 66, .7)';
        m.lineWidth = Math.max(2, p.half * 1.4 * k);
        m.stroke();
      }
      mini = { w: size, c, k };
    }
    const x0 = 10 * view.dpr, y0 = h - mini.c.height - 10 * view.dpr;
    ctx.globalAlpha = .9;
    ctx.drawImage(mini.c, x0, y0);
    ctx.globalAlpha = 1;
    for (const id of g.others.ids()) {
      const o = g.others.get(id, t);
      const info = g.info.get(id);
      if (!o || !info) continue;
      ctx.fillStyle = info.neon;
      ctx.beginPath(); ctx.arc(x0 + o[0] * mini.k, y0 + o[1] * mini.k, 3 * view.dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + g.car.x * mini.k, y0 + g.car.y * mini.k, 5 * view.dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  let last = performance.now();
  let lastBoxCheck = 0;
  function frame(pt) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (pt - last) / 1000);
    last = pt;
    if (!on() || !g.state) return;
    if (g.state.phase === 'lobby' && !$('rp-lobby').classList.contains('hidden')) return drawPreview(pt);
    if (g.state.phase !== 'play' || $('rp-game').classList.contains('hidden')) return;
    if (!view.w) resize();
    quality(pt);
    const left = g.state.endsAt - now();
    $('rp-clock').textContent = AK.clock(left);
    $('rp-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('rp-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('rp-countdown').textContent = Math.ceil(wait / 1000);
    else if (wait > -900) $('rp-countdown').textContent = 'GO!';
    $('rp-goal').classList.toggle('hidden', !(wait > -2500));
    if (pt - (g.hudAt || 0) > 300) { g.hudAt = pt; if (g.boxReady > performance.now() - 400) hud(); }
    const car = g.car;
    // Rijden
    if (playing() && g.me) {
      if (g.falling) {
        car.z -= 900 * dt;
        car.v *= .96;
        if (pt > g.falling) {
          g.falling = 0;
          socket.emit('rp-fall');
        }
      } else {
        const ev = W.drive(car, input(dt), dt);
        if (ev.jump) { sfx.jump(); buzz(20); }
        if (ev.land) { buzz(40); }
        if (ev.bump) { sfx.hit(); buzz(60); }
        if (ev.pad && !g.padOn) { sfx.whoosh(); }
        g.padOn = ev.pad;
        if (ev.fall) {
          g.falling = pt + 900;
          banner('🐉 IN DE KLOOF!', 'Te traag gesprongen… je komt terug op de weg', 'bad');
          sfx.boom();
          buzz(300);
          quiz.close();
        }
      }
      // Runenkisten
      if (pt - lastBoxCheck > 50 && !g.falling) {
        lastBoxCheck = pt;
        for (const b of W.BOXES) {
          if ((b.x - car.x) ** 2 + (b.y - car.y) ** 2 > (W.BOX_R + W.R) ** 2 || car.z > 160) continue;
          // Laden de kisten nog op, dan rij je er gewoon door.
          if (quiz.open || pt < Math.max(g.waitUntil, g.boxReady)) continue;
          const at = g.hiddenBoxes.get(b.id);
          if (at && pt - at < W.BOX_BACK_MS) continue;
          g.hiddenBoxes.set(b.id, pt);
          openBox(b);
        }
      }
      if (pt - g.lastSend > 66) {
        g.lastSend = pt;
        socket.volatile.emit('rp-move', { x: Math.round(car.x), y: Math.round(car.y), z: Math.round(car.z), a: +car.a.toFixed(3), v: Math.round(car.v), b: car.boost > 0 ? 1 : 0, s: g.spawn });
      }
      // Verkeerde richting?
      g.wrongFor = W.wrongWay(car) && !quiz.open ? g.wrongFor + dt : 0;
      $('rp-wrong').classList.toggle('hidden', g.wrongFor < 1.2);
      sfx.engine(quiz.open ? .15 : Math.max(.08, Math.min(1.3, Math.abs(car.v) / W.HORSE.max)));
    }
    g.phase = (g.phase + (Math.abs(car.v) * dt) / 190) % 1;
    // De camera draait zacht mee (niet als je tolt).
    if (!(car.spin > 0)) g.camA += W.wrap(car.a - g.camA) * Math.min(1, dt * 7);
    const { w, h } = view;
    const shown = new Set();
    for (const [id, at] of g.hiddenBoxes) { if (pt - at < W.BOX_BACK_MS) shown.add(id); else g.hiddenBoxes.delete(id); }
    const others = [];
    for (const id of g.others.ids()) {
      const o = g.others.get(id, pt);
      const info = g.info.get(id);
      if (!o || !info) continue;
      info.phase = (info.phase + (Math.abs(o[4]) * dt) / 190) % 1;
      const r = g.ranks.get(id);
      others.push({
        x: o[0], y: o[1], a: o[2], z: o[3], v: o[4], look: info.look, av: info.av, name: info.name, neon: info.neon, rank: r && r.rank,
        frame: Math.floor(info.phase * RpDraw.FRAMES), spin: o[5] & 1, shield: o[5] & 2, asking: o[5] & 4, boost: o[5] & 8, zap: o[5] & 16,
      });
    }
    const nowMs = performance.now();
    Rp3D.render(ctx, w, h, {
      me: car, a: g.camA, t: pt / 1000, boost: car.boost > 0, quality: g.quality,
      self: g.falling && car.z < -120 ? null : {
        look: g.look, av: myAv(), frame: Math.floor(g.phase * RpDraw.FRAMES), boost: car.boost > 0, spin: car.spin > 0,
        shield: g.shieldEnd > nowMs, asking: quiz.open, zap: car.zap > 0,
      },
      others, boxes: shown, shots: g.shots, traps: g.traps, boxRest: pt < Math.max(g.waitUntil, g.boxReady) || quiz.open,
    });
    if (car.boost > 0) {
      // Snelheidsstrepen aan de rand.
      ctx.strokeStyle = 'rgba(255, 255, 255, .35)';
      ctx.lineWidth = 2 * view.dpr;
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * Math.PI * 2 + pt / 300;
        const r0 = Math.max(w, h) * (.42 + ((i * 37 + pt / 20) % 30) / 100);
        ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(an) * r0, h * .45 + Math.sin(an) * r0 * .7); ctx.lineTo(w / 2 + Math.cos(an) * r0 * 1.25, h * .45 + Math.sin(an) * r0 * .9); ctx.stroke();
      }
    }
    if (g.flash && pt < g.flash) {
      ctx.fillStyle = `rgba(200, 230, 255, ${(g.flash - pt) / 700})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (car.zap > 0) {
      ctx.fillStyle = `rgba(80, 160, 255, ${.12 + .06 * Math.sin(pt / 60)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (g.falling) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(.8, 1 - (g.falling - pt) / 900)})`;
      ctx.fillRect(0, 0, w, h);
    }
    minimap(w, h, pt);
  }
  requestAnimationFrame(frame);

  // De stal: je paard galoppeert ter plaatse en draait als je erop tikt.
  const pctx = $('rp-preview').getContext('2d');
  function drawPreview(pt) {
    if (!g.look) return;
    const c = $('rp-preview');
    pctx.clearRect(0, 0, c.width, c.height);
    const glow = pctx.createRadialGradient(210, 250, 10, 210, 250, 200);
    glow.addColorStop(0, RpDraw.rgba(RpDraw.colors(g.look).neon, .35));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pctx.fillStyle = glow;
    pctx.fillRect(0, 0, c.width, c.height);
    pctx.strokeStyle = RpDraw.rgba(RpDraw.colors(g.look).neon, .5);
    pctx.lineWidth = 2;
    pctx.beginPath(); pctx.ellipse(210, 276, 150, 16, 0, 0, Math.PI * 2); pctx.stroke();
    RpDraw.live(pctx, g.look, myAv(), g.view, (pt / 600) % 1, pt / 1000, 210, 272, 1.45);
  }

  // Op het eindscherm: je paard nog eens.
  const ectx = $('rp-end-horse').getContext('2d');
  (function endFrame(pt) {
    requestAnimationFrame(endFrame);
    if (!on() || $('rp-end').classList.contains('hidden') || !g.look) return;
    ectx.clearRect(0, 0, 300, 220);
    RpDraw.live(ectx, g.look, myAv(), 'side', (pt / 700) % 1, pt / 1000, 150, 205, 1.2);
  })(performance.now());
})();
