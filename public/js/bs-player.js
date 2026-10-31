// Burchtstorm op de Chromebook of gsm: laat neonstenen vallen, vul rijen en bestook de anderen met belegeringsrijen.
// Je schacht draait helemaal hier (geen vertraging); de server kiest wie je aanval krijgt en stuurt aanvallen van anderen door.
// Chromebook: pijltjes, spatie = laten vallen, pijl omhoog/X draaien, Z/W andersom, C/Shift bijhouden.
// Gsm: knoppen onderaan, of vegen op de schacht (tik = draaien, snel omlaag = laten vallen, omhoog = bijhouden).
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx, confetti en Glow uit fx.js, AK, BsCore en BsDraw.
(() => {
  const root = document.createElement('div');
  root.id = 'storm';
  root.innerHTML = `
  <form id="bs-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Burchtstorm</p>
    <input id="bs-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="bs-join-error"></p>
    <button type="submit" class="big">De storm in</button>
  </form>
  <section id="bs-lobby" class="screen panel hidden">
    <p class="status">Burchtstorm</p>
    <p class="title" id="bs-lobby-name"></p>
    <p>Neonstenen vallen in jouw burchttoren. <strong>Vul een hele rij</strong> en ze verdwijnt. Twee rijen of meer tegelijk worden katapultstenen: die komen <strong>onderaan bij een andere ridder</strong> terecht.</p>
    <p><strong>Om de acht stenen krijg je een vraag.</strong> Juist: een 🛡 runeschild dat de volgende aanval tegenhoudt, en je volgende aanval telt ×2. Drie op rij: 🐉 drakenvuur naar de koploper! Fout: één belegeringsrij bij jezelf.</p>
    <p class="muted small">Vier rijen tegelijk is een BURCHTSTORM. Stort je burcht in, dan begin je gewoon opnieuw.</p>
    <p class="muted small ls-hint-touch">Knoppen onderaan, of veeg op je toren: tik = draaien, veeg opzij = schuiven, snel omlaag = laten vallen, omhoog = bijhouden.</p>
    <p class="muted small ls-hint-keys">← → schuiven · ↑ of X draaien · Z/W andersom · ↓ sneller · spatie laten vallen · C of Shift bijhouden · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="bs-game" class="ak-game hidden">
    <div class="ls-hud ak-hud">
      <div class="sv-mass" id="bs-score"></div>
      <div class="bs-runes" id="bs-runes"></div>
      <div class="ry-alive" id="bs-rank"></div>
      <div class="ls-clock" id="bs-clock"></div>
    </div>
    <div class="ls-stage" id="bs-stage">
      <canvas id="bs-bg"></canvas>
      <canvas id="bs-canvas"></canvas>
      <div class="ls-feed" id="bs-feed"></div>
      <div class="ls-banner" id="bs-banner"></div>
      <div class="tw-toast" id="bs-toast"></div>
      <div class="tw-countdown hidden" id="bs-countdown"></div>
      <div class="ls-out hidden" id="bs-out">
        <p class="ls-out-title">Je burcht stort in!</p>
        <p class="ls-out-by" id="bs-out-by"></p>
        <p class="ls-out-timer">Je bouwt meteen een nieuwe…</p>
      </div>
    </div>
    <div class="bs-pad" id="bs-pad">
      <button class="ls-btn" data-k="hold">⧉<small>Hou</small></button>
      <button class="ls-btn" data-k="ccw">⟲</button>
      <button class="ls-btn" data-k="left">◀</button>
      <button class="ls-btn" data-k="soft">▼</button>
      <button class="ls-btn" data-k="right">▶</button>
      <button class="ls-btn" data-k="cw">⟳</button>
      <button class="ls-btn bs-drop" data-k="hard">⤓<small>Val</small></button>
    </div>
  </section>
  <section id="bs-end" class="screen panel hidden">
    <div class="mark" id="bs-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="bs-end-title"></p>
    <p class="big" id="bs-end-score" style="font-size:1.6rem"></p>
    <p id="bs-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const { W, VIS, HIDDEN, COLORS, TYPES } = BsCore;
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), game: null,
    rune: 0, downUntil: 0, sentBoard: '', sentAt: 0, rival: null, rivalCanvas: document.createElement('canvas'), rivalN: -1,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.bs === '1';
  const show = name => { for (const s of ['bs-join', 'bs-lobby', 'bs-game', 'bs-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('bs-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('bs-join-error').textContent = res.error;
        show('bs-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('bs-join-error').textContent = '';
    });
  }
  $('bs-join').addEventListener('submit', e => { e.preventDefault(); join($('bs-name').value); });

  socket.on('bs-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.bs = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.game = null;
      g.rival = null;
      g.rivalN = -1;
      quiz.close();
      delete $('bs-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('bs-name').value = saved || '';
        show('bs-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('bs-lobby-name').textContent = s.name;
      show('bs-lobby');
    } else if (s.phase === 'play') {
      if (!g.game && s.me) { g.game = BsCore.create(s.me.seed); g.rune = 0; }
      show('bs-game');
      const mine = s.roster.find(r => r.name === s.name);
      g.color = mine ? mine.color : '#4cc9ff';
      $('bs-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      $('bs-out').classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      $('bs-end-medal').textContent = medals[me.rank - 1] || '🏰';
      $('bs-end-title').textContent = me.rank === 1 ? 'Jij bent de Heer van de Burchtstorm!' : `Plek ${me.rank} van ${me.players}`;
      $('bs-end-score').textContent = `${me.score || 0} punten`;
      $('bs-end-stats').textContent = `${me.lines || 0} rijen opgeruimd · ${me.sent || 0} rijen gestuurd · ${me.kos || 0} burchten neergehaald · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('bs-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('bs-end').dataset.done = '1';
      show('bs-end');
    }
  });

  socket.on('bs-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('bs-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('bs-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('bs-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    if (msg.rv) {
      g.rivalN = msg.rv[0];
      g.rival = msg.rv;
      g.rivalDirty = true;
    }
    for (const e of msg.ev) onEvent(e);
  });

  // Een aanval van een ander: eerst in je wachtrij (rode balk), bij je volgende steen zonder opruiming schuiven ze onderaan erin.
  socket.on('bs-garbage', m => {
    if (!g.game) return;
    g.game.addGarbage(m.n, m.hole);
    fx.incoming.push({ t: 0, n: m.n });
    sfx.hit();
    buzz(60);
    toast(`⚠ ${m.n} ${m.n === 1 ? 'rij' : 'rijen'} van ${nameOf(m.from)}! Ruim op om ze tegen te houden`, 'bad');
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    if (old && me.shield && !old.shield) toast('🛡 Runeschild! De volgende aanval op jou wordt tegengehouden', 'good');
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('bs-score').textContent = `🏰 ${me.score}`;
    $('bs-runes').innerHTML = `${me.shield ? '<b class="on">🛡</b>' : '<b>🛡</b>'}${me.power ? '<b class="on hot">⚔×2</b>' : '<b>⚔×2</b>'}`;
    $('bs-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'blok' && e[2] === me.n) { sfx.power(); banner('🛡 GEBLOKT!', `${e[3]} rijen van ${nameOf(e[1])} ketsen af`, 'big'); }
    else if (e[0] === 'blok' && e[1] === me.n) feedLine(`🛡 ${nameOf(e[2])} blokte je aanval`, true);
    else if (e[0] === 'ko' && e[2] === me.n) { sfx.fanfare(); buzz([40, 30, 80]); banner('💥 INGESTORT!', `De burcht van ${nameOf(e[1])} valt · +50`, 'gold'); }
    else if (e[0] === 'ko' && e[1] !== me.n) feedLine(`💥 ${nameOf(e[1])} stort in`, false);
    else if (e[0] === 'vuur' && e[1] !== me.n && e[2] === me.n) feedLine(`🐉 Drakenvuur van ${nameOf(e[1])}!`, true);
    else if (e[0] === 'clr' && e[1] !== me.n && e[2] === 4) feedLine(`⚡ ${nameOf(e[1])}: burchtstorm!`, false);
  }

  function feedLine(text, mine) {
    const box = $('bs-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${mine ? ' me' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('bs-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('bs-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  // ---------- Vragen ----------
  let rightThisTime = false;
  const quiz = AK.quiz({
    root: $('bs-game'),
    closeText: 'Terug naar je burcht',
    status: () => 'Runevraag · juist = 🛡 schild en ⚔×2 · je burcht staat even stil, niemand valt je aan',
    ask: cb => socket.emit('bs-question', null, cb),
    answer: (i, cb) => socket.emit('bs-answer', i, res => {
      if (res && res.penalty && g.game) { g.game.addGarbage(res.penalty); fx.incoming.push({ t: 0, n: 1 }); }
      if (res && res.correct) rightThisTime = true;
      cb(res);
    }),
    good: res => `Juist! 🛡 Runeschild en je volgende aanval telt ×2${res.fire ? ` · 🐉 drakenvuur: ${res.fire} rijen naar de koploper!` : ''}`,
    bad: () => 'Helaas, één belegeringsrij erbij. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    close: () => {
      socket.emit('bs-asking', false);
      // Weggeklikt zonder juist antwoord? Dan komt de rune binnen twee stenen terug.
      g.rune = rightThisTime ? 0 : BsCore.RUNE_EVERY - 2;
    },
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play' || quiz.open) return;
    rightThisTime = false;
    input.clear();
    socket.emit('bs-asking', true);
    quiz.show();
  }

  // ---------- Besturing ----------
  // Schuiven met herhaling: eerst één stap, na DAS ms elke ARR ms nog een stap.
  const DAS = 150, ARR = 38;
  const input = {
    dir: 0, dasAt: 0, arrAt: 0, soft: false, held: new Set(),
    press(k) {
      if (!playing()) return;
      const gm = g.game;
      if (k === 'left' || k === 'right') {
        const d = k === 'left' ? -1 : 1;
        this.dir = d;
        this.dasAt = this.arrAt = performance.now() + DAS;
        if (gm.shift(d)) sfx.tick(true);
      } else if (k === 'soft') this.soft = true;
      else if (k === 'cw' || k === 'ccw') { if (gm.rotate(k === 'cw' ? 1 : -1)) sfx.marker(); }
      else if (k === 'hard') {
        const from = gm.cur ? { cells: gm.cells(), t: gm.cur.t } : null;
        const res = gm.hard();
        if (res) { trail(from, res); locked(res); }
      } else if (k === 'hold') { if (gm.doHold()) sfx.swoosh(); }
    },
    release(k) {
      if ((k === 'left' && this.dir === -1) || (k === 'right' && this.dir === 1)) {
        this.dir = this.held.has(k === 'left' ? 'right' : 'left') ? (k === 'left' ? 1 : -1) : 0;
        this.dasAt = this.arrAt = performance.now() + DAS;
      }
      if (k === 'soft') this.soft = false;
    },
    update(t) {
      if (!this.dir || t < this.dasAt) return;
      while (t >= this.arrAt) {
        if (!g.game.shift(this.dir)) { this.arrAt = t + ARR; break; }
        this.arrAt += ARR;
        if (this.arrAt < t - 200) this.arrAt = t;
      }
    },
    clear() { this.dir = 0; this.soft = false; this.held.clear(); },
  };

  const KEYS = {
    arrowleft: 'left', arrowright: 'right', arrowdown: 'soft', ' ': 'hard', arrowup: 'cw', x: 'cw', z: 'ccw', w: 'ccw', control: 'ccw', c: 'hold', shift: 'hold',
  };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('bs-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = KEYS[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    input.held.add(k);
    input.press(k);
  });
  document.addEventListener('keyup', e => {
    const k = KEYS[e.key.toLowerCase()];
    if (!k) return;
    input.held.delete(k);
    input.release(k);
  });

  for (const b of $('bs-pad').querySelectorAll('button')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      sfx.unlock();
      b.classList.add('down');
      input.held.add(k);
      input.press(k);
    });
    const up = () => { b.classList.remove('down'); input.held.delete(k); input.release(k); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Vegen op de schacht (aanraakscherm).
  const canvas = $('bs-canvas');
  const swipe = { id: null };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || swipe.id !== null) return;
    sfx.unlock();
    Object.assign(swipe, { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, at: performance.now(), moved: false, last: [e.clientY, performance.now()] });
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== swipe.id || !playing()) return;
    const step = Math.max(16, (layout.cell || 30) / (layout.dpr || 1) * .9);
    while (e.clientX - swipe.x > step) { swipe.x += step; swipe.moved = true; if (g.game.shift(1)) sfx.tick(true); }
    while (swipe.x - e.clientX > step) { swipe.x -= step; swipe.moved = true; if (g.game.shift(-1)) sfx.tick(true); }
    // Rustig omlaag slepen = sneller zakken
    while (e.clientY - swipe.y > step * 1.2) { swipe.y += step * 1.2; swipe.moved = true; g.game.down(); }
    if (swipe.y - e.clientY > step) swipe.y = Math.min(swipe.y, e.clientY + step);
    swipe.last = [e.clientY, performance.now(), swipe.last[0], swipe.last[1]];
  });
  const swipeEnd = e => {
    if (e.pointerId !== swipe.id) return;
    swipe.id = null;
    if (!playing()) return;
    const dt = performance.now() - swipe.at, dy = e.clientY - swipe.y0, dx = e.clientX - swipe.x0;
    const [y1, t1, y0, t0] = swipe.last;
    const v = y0 !== undefined && t1 > t0 ? (y1 - y0) / (t1 - t0) : dy / Math.max(1, dt);
    if (dy > 50 && v > .9) input.press('hard');
    else if (dy < -50 && Math.abs(dx) < 60 && dt < 500) input.press('hold');
    else if (!swipe.moved && dt < 300 && Math.hypot(dx, dy) < 14) {
      const r = canvas.getBoundingClientRect();
      input.press(e.clientX - r.left < r.width * .3 ? 'ccw' : 'cw');
    }
  };
  canvas.addEventListener('pointerup', swipeEnd);
  canvas.addEventListener('pointercancel', swipeEnd);

  function playing() {
    return g.game && g.me && !quiz.open && g.state && g.state.phase === 'play' && now() >= g.state.startedAt && performance.now() >= g.downUntil && !g.game.over;
  }

  // ---------- Effecten ----------
  const sparks = BsDraw.Sparks();
  const fx = { flash: [], trail: [], lockFlash: null, shake: 0, incoming: [], outgoing: [], pop: [] };

  function trail(from, res) {
    if (!from || !res.drop) return;
    fx.trail.push({ cells: from.cells, drop: res.drop, t: 0, v: TYPES.indexOf(from.t) + 1 });
  }

  const NAMES = ['', '', 'DUBBEL', 'TRIPEL', 'BURCHTSTORM!'];
  function locked(res) {
    fx.lockFlash = { cells: res.cells, t: 0 };
    if (!res.lines) {
      sfx.tick(false);
      if (res.garbage) { fx.shake = Math.max(fx.shake, 6 + res.garbage * 2); sfx.hit(); buzz(80); }
    } else {
      for (const y of res.rows) {
        fx.flash.push({ y, t: 0 });
        for (let x = 0; x < W; x += res.lines >= 3 ? 1 : 2) sparks.add(layout.fx + (x + .5) * layout.cell, layout.fy + (y - HIDDEN + .5) * layout.cell, COLORS[1 + Math.floor(Math.random() * 7)], res.lines >= 4 ? 5 : 3, 260 * layout.dpr, 3 * layout.dpr);
      }
      fx.shake = Math.max(fx.shake, res.lines * 3 + (res.spin ? 6 : 0));
      let title = res.spin ? `T-SPIN${res.spin === 'mini' ? ' MINI' : ''}${res.lines ? ` ${['', 'ENKEL', 'DUBBEL', 'TRIPEL'][res.lines]}` : ''}` : NAMES[res.lines];
      if (res.pc) title = 'PERFECTE BURCHT!';
      const sub = [res.combo >= 1 ? `COMBO ×${res.combo + 1}` : '', res.b2b ? 'B2B' : '', res.attack ? `⚔ ${res.attack}` : res.cancelled ? `🛡 ${res.cancelled} tegengehouden` : ''].filter(Boolean).join(' · ');
      if (title) banner(title, sub, res.lines >= 4 || res.spin || res.pc ? 'gold' : 'big');
      else if (sub && res.combo >= 1) fx.pop.push({ text: `COMBO ×${res.combo + 1}`, t: 0 });
      if (res.lines >= 4 || res.pc) { sfx.boom(); sfx.fanfare(); buzz([30, 30, 90]); }
      else if (res.spin) { sfx.power(); buzz([30, 20, 30]); }
      else if (res.lines >= 2) sfx.power();
      else sfx.laser();
      socket.emit('bs-attack', { n: res.attack, lines: res.lines, spin: res.spin || '', combo: res.combo, pc: res.pc }, ack => {
        if (!ack || !ack.n) return;
        fx.outgoing.push({ t: 0, n: ack.n, to: ack.to });
        sfx.whoosh();
        if (ack.to >= 0) feedLine(`⚔ ${ack.n}${ack.doubled ? ' (×2!)' : ''} naar ${nameOf(ack.to)}`, true);
        else feedLine(`⚔ ${ack.n} rijen… maar iedereen zit in een vraag`, true);
      });
    }
    if (res.over) return topout();
    // Om de acht stenen een runevraag.
    g.rune++;
    if (g.rune >= BsCore.RUNE_EVERY) setTimeout(ask, res.lines ? 450 : 120);
  }

  function topout() {
    g.downUntil = performance.now() + 2200;
    sfx.boom();
    buzz([200, 80, 300]);
    fx.shake = 18;
    for (let i = 0; i < 40; i++) sparks.add(layout.fx + Math.random() * layout.cell * W, layout.fy + Math.random() * layout.cell * VIS, '#ff4d6d', 1, 400 * layout.dpr, 5 * layout.dpr, 1.1);
    const last = g.me && g.me.rival >= 0 ? nameOf(g.me.rival) : null;
    $('bs-out-by').textContent = last ? `Laatste klap van ${last} · −25` : '−25 punten';
    $('bs-out').classList.remove('hidden');
    socket.emit('bs-topout');
    setTimeout(() => {
      $('bs-out').classList.add('hidden');
      if (g.game) g.game.reset();
      banner('NIEUWE BURCHT', 'Bouw terug op!', 'big');
      sfx.go();
    }, 2200);
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  const layout = {};
  function place(w, h, dpr) {
    const wide = w / h > 1.3;
    // Smal scherm (gsm rechtop): smallere zijkolommen.
    const narrow = w / h < .8;
    const bw = narrow ? 3.1 : 4.2;
    const cell = Math.floor(Math.min((h * .95) / (VIS + 1.6), w / (W + .9 + bw * 2 + 2.2 + (wide ? 7 : 0))));
    const wl = BsDraw.well(cell, g.color || '#4cc9ff');
    const x0 = Math.round((w - wl.c.width) / 2 + (narrow ? cell * .2 : 0) - (wide ? cell * 3 : 0));
    const y0 = Math.round((h - wl.c.height) / 2 + cell * .2);
    const c = cell, fy = y0 + wl.top;
    Object.assign(layout, {
      w, h, dpr, cell, wide, narrow, bw: bw * c, wl, x0, y0, fx: x0 + wl.m, fy, fw: wl.fw, fh: wl.fh,
      hx: x0 - c * .8 - bw * c, nx: x0 + wl.c.width + c * .5, ry: fy + c * 3.7, sy: fy + c * 6.3,
      s: Math.round(c * (narrow ? .55 : .72)), step: narrow ? 1.8 : 2.25, mx: x0 - c * .6, mw: c * .42, bgDirty: true,
    });
  }

  // Alles wat stilstaat (achtergrond, de toren, de vakken) op het onderste canvas, één keer per schermgrootte.
  function bake() {
    const L = layout, c = L.cell, bg = $('bs-bg');
    bg.done = false;
    BsDraw.background(bg, L.w, L.h);
    const b = bg.getContext('2d');
    b.drawImage(L.wl.c, L.x0, L.y0);
    b.fillStyle = 'rgba(10,14,28,.85)';
    b.fillRect(L.mx, L.fy, L.mw, L.fh);
    panel(b, L.hx, L.fy, L.bw, c * 3.2, 'HOU');
    panel(b, L.nx, L.fy, L.bw, c * (1 + L.step * 5), L.narrow ? 'DAARNA' : 'VOLGENDE');
    panel(b, L.hx, L.ry, L.bw, c * 2.1, L.narrow ? 'RUNE' : 'RUNEVRAAG');
    b.font = `800 ${Math.round(c * .5)}px Orbitron, sans-serif`;
    b.fillStyle = '#8fa3c7';
    b.fillText('NIVEAU', L.hx, L.sy + c * .5);
    b.fillText('RIJEN', L.hx, L.sy + c * 2);
    L.bgDirty = false;
  }

  let last = performance.now();
  let boardTimer = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('bs-game').classList.contains('hidden') || !g.game) return;
    const left = g.state.endsAt - now();
    $('bs-clock').textContent = AK.clock(left);
    $('bs-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('bs-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('bs-countdown').textContent = Math.ceil(wait / 1000);
    const gm = g.game;
    const sec = Math.max(0, (now() - g.state.startedAt) / 1000);
    if (playing()) {
      input.update(t);
      const res = gm.step(dt * 1000, BsCore.gravity(sec), input.soft);
      if (res) locked(res);
    }
    // De schacht doorsturen naar het bord (alleen als er iets veranderde).
    boardTimer += dt;
    if (boardTimer > .12) {
      boardTimer = 0;
      const b = gm.snapshot();
      if (b !== g.sentBoard || t - g.sentAt > 1500) {
        g.sentBoard = b;
        g.sentAt = t;
        socket.emit('bs-board', { b, l: gm.lines, k: gm.pieces, i: gm.pending(), c: Math.max(0, gm.combo) });
      }
    }
    const { w, h, dpr } = AK.fit(canvas, 1.5);
    if (layout.w !== w || layout.h !== h || layout.color !== g.color) { place(w, h, dpr); layout.color = g.color; }
    draw(dt, t, sec);
  }

  function draw(dt, t, sec) {
    const L = layout, gm = g.game, c = L.cell, me = g.me || {};
    if (L.bgDirty) bake();
    ctx.clearRect(0, 0, L.w, L.h);
    fx.shake = Math.max(0, fx.shake - dt * 40);
    ctx.save();
    if (fx.shake > .5) ctx.translate((Math.random() - .5) * fx.shake * L.dpr, (Math.random() - .5) * fx.shake * L.dpr);
    // ⚔×2: de kantelen staan in vuur
    if (me.power) {
      const p = .6 + Math.sin(t / 140) * .25;
      Glow.glow(ctx, L.fx + L.fw / 2, L.y0 + c * .4, L.fw * .7, '#ff9a3d', p, .35);
    }
    // gevallen stenen
    const grid = gm.grid;
    for (let y = HIDDEN; y < BsCore.H; y++) {
      for (let x = 0; x < W; x++) {
        const v = grid[y * W + x];
        if (v) ctx.drawImage(BsDraw.block(v, c), L.fx + x * c, L.fy + (y - HIDDEN) * c);
      }
    }
    // weggeveegde rijen lichten op
    for (let i = fx.flash.length - 1; i >= 0; i--) {
      const f = fx.flash[i];
      f.t += dt;
      if (f.t > .3) { fx.flash.splice(i, 1); continue; }
      const k = 1 - f.t / .3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k;
      ctx.fillStyle = '#e8f6ff';
      const yy = L.fy + (f.y - HIDDEN) * c;
      ctx.fillRect(L.fx - c * k * .5, yy + c * (1 - k) * .4, L.fw + c * k, c * (.2 + k * .8));
      ctx.restore();
    }
    // spoor van het laten vallen
    for (let i = fx.trail.length - 1; i >= 0; i--) {
      const tr = fx.trail[i];
      tr.t += dt;
      if (tr.t > .22) { fx.trail.splice(i, 1); continue; }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - tr.t / .22) * .55;
      ctx.fillStyle = COLORS[tr.v];
      const cols = new Map();
      for (const [x, y] of tr.cells) cols.set(x, Math.min(cols.get(x) ?? 99, y));
      for (const [x, y] of cols) {
        const top = Math.max(0, y - HIDDEN), bottom = Math.max(0, y + tr.drop - HIDDEN);
        ctx.fillRect(L.fx + x * c + c * .2, L.fy + top * c, c * .6, (bottom - top) * c);
      }
      ctx.restore();
    }
    if (gm.cur && !gm.over) {
      const v = TYPES.indexOf(gm.cur.t) + 1;
      // schaduw
      const gy = gm.ghostY();
      for (const [x, y] of gm.cells({ ...gm.cur, y: gy })) if (y >= HIDDEN) ctx.drawImage(BsDraw.ghost(v, c), L.fx + x * c, L.fy + (y - HIDDEN) * c);
      // de vallende steen, vloeiend tussen twee rijen in
      const off = gm.onGround() ? 0 : Math.min(.9, gm.fall) * c;
      const img = BsDraw.block(v, c);
      const lockK = gm.onGround() ? gm.lockMs / 500 : 0;
      for (const [x, y] of gm.cells()) {
        const yy = L.fy + (y - HIDDEN) * c + off;
        if (yy < L.fy - c * .5) continue;
        ctx.drawImage(img, L.fx + x * c, yy);
      }
      if (lockK > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = lockK * .35;
        ctx.fillStyle = '#ffffff';
        for (const [x, y] of gm.cells()) if (y >= HIDDEN) ctx.fillRect(L.fx + x * c, L.fy + (y - HIDDEN) * c, c, c);
        ctx.restore();
      }
    }
    // net vastgezet
    if (fx.lockFlash) {
      fx.lockFlash.t += dt;
      if (fx.lockFlash.t > .15) fx.lockFlash = null;
      else {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - fx.lockFlash.t / .15) * .6;
        ctx.fillStyle = '#ffffff';
        for (const [x, y] of fx.lockFlash.cells) if (y >= HIDDEN) ctx.fillRect(L.fx + x * c, L.fy + (y - HIDDEN) * c, c, c);
        ctx.restore();
      }
    }
    // 🛡 runeschild: een draaiende runenrand rond de schacht
    if (me.shield) {
      ctx.save();
      ctx.strokeStyle = '#7ef0ff';
      ctx.lineWidth = Math.max(2, c * .14);
      ctx.setLineDash([c * .6, c * .35]);
      ctx.lineDashOffset = -t / 30;
      ctx.globalAlpha = .7 + Math.sin(t / 200) * .2;
      ctx.strokeRect(L.fx - c * .35, L.fy - c * .35, L.fw + c * .7, L.fh + c * .7);
      ctx.restore();
    }
    // De rode belegeringsbalk links: zoveel rijen komen eraan.
    const pend = gm.pending();
    const mx = L.mx, mw = L.mw;
    if (pend) {
      const ph = Math.min(VIS, pend) * c;
      const pulse = .75 + Math.sin(t / 90) * .25;
      ctx.fillStyle = pend >= 6 ? `rgba(255,60,90,${pulse})` : `rgba(255,120,80,${pulse})`;
      ctx.fillRect(mx, L.fy + L.fh - ph, mw, ph);
      Glow.glow(ctx, mx + mw / 2, L.fy + L.fh - ph, c * 1.4, '#ff4d6d', .6);
    }
    sparks.update(dt);
    sparks.draw(ctx);
    ctx.restore();

    // Bijhouden (links) en de volgende stenen (rechts)
    const { s, bw, hx, nx, ry, sy, step } = L;
    if (gm.hold) BsDraw.piece(ctx, gm.hold, hx + bw / 2, L.fy + c * 1.85, s, gm.canHold ? 1 : .35);
    gm.queue.slice(0, 5).forEach((tp, i) => BsDraw.piece(ctx, tp, nx + bw / 2, L.fy + c * (1.9 + i * step), i ? Math.round(s * .85) : s));
    // Runemeter: om de acht stenen een vraag
    const seg = (bw - c * .6) / BsCore.RUNE_EVERY;
    for (let i = 0; i < BsCore.RUNE_EVERY; i++) {
      const lit = i < g.rune;
      ctx.fillStyle = lit ? '#ffc94a' : 'rgba(255,255,255,.12)';
      ctx.fillRect(hx + c * .3 + i * seg + 1, ry + c * 1.15, seg - 2, c * .55);
    }
    if (g.rune >= BsCore.RUNE_EVERY - 2) Glow.glow(ctx, hx + bw / 2, ry + c * 1.4, bw * .6, '#ffc94a', .35 + Math.sin(t / 120) * .2);
    // Cijfers
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(c * .85)}px Orbitron, sans-serif`;
    ctx.fillText(String(BsCore.level(sec)), hx, sy + c * 1.35);
    ctx.fillText(String(gm.lines), hx, sy + c * 2.85);
    if (gm.combo >= 1) {
      ctx.fillStyle = '#ffc94a';
      ctx.font = `900 ${Math.round(c * .75)}px Orbitron, sans-serif`;
      ctx.fillText(`COMBO ×${gm.combo + 1}`, hx, sy + c * 4.1);
    }
    if (gm.b2b) {
      ctx.fillStyle = '#7ef0ff';
      ctx.font = `800 ${Math.round(c * .55)}px Orbitron, sans-serif`;
      ctx.fillText('B2B', hx, sy + c * 5);
    }
    // De rivaal: wie jou het laatst aanviel (of de koploper).
    if (L.wide && g.rival) {
      const rc = Math.max(4, Math.floor(c * .42));
      if (g.rivalDirty || g.rivalCell !== rc) {
        const r = g.roster.get(g.rival[0]);
        BsDraw.boardCanvas(g.rivalCanvas, g.rival[1], rc, r ? r.color : '#ff6bd6', g.rival[2]);
        g.rivalDirty = false;
        g.rivalCell = rc;
      }
      const rx = nx + bw + c * 1.2, rY = L.fy + c * 1.2;
      ctx.drawImage(g.rivalCanvas, rx, rY);
      ctx.font = `800 ${Math.round(c * .45)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#ff9ec7';
      ctx.fillText('RIVAAL', rx, L.fy + c * .4);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.round(c * .5)}px Rajdhani, sans-serif`;
      ctx.fillText(nameOf(g.rival[0]).slice(0, 14), rx, L.fy + c * 1);
      if (g.rival[2] & 1) ctx.fillText('🛡', rx + g.rivalCanvas.width - c * .7, L.fy + c * 1);
      layout.rival = { x: rx + g.rivalCanvas.width / 2, y: rY + g.rivalCanvas.height * .7 };
    } else layout.rival = null;
    // Aanvallen die vertrekken (naar boven of naar je rivaal) en aankomen (in de rode balk)
    for (let i = fx.outgoing.length - 1; i >= 0; i--) {
      const o = fx.outgoing[i];
      o.t += dt / .55;
      if (o.t >= 1) { fx.outgoing.splice(i, 1); continue; }
      const to = layout.rival && o.to === g.rivalN ? layout.rival : { x: L.fx + L.fw / 2 + L.fw * .3, y: -c * 2 };
      BsDraw.bolt(ctx, L.fx + L.fw / 2, L.fy + L.fh * .4, to.x, to.y, o.t, '#ffc94a', o.n);
    }
    for (let i = fx.incoming.length - 1; i >= 0; i--) {
      const o = fx.incoming[i];
      o.t += dt / .5;
      if (o.t >= 1) { fx.incoming.splice(i, 1); fx.shake = Math.max(fx.shake, 5); continue; }
      BsDraw.bolt(ctx, L.fx + L.fw * .2, -c, mx + mw / 2, L.fy + L.fh - Math.min(VIS, pend) * c, o.t, '#ff4d6d', o.n);
    }
    // kleine tekstjes die opstijgen
    for (let i = fx.pop.length - 1; i >= 0; i--) {
      const p = fx.pop[i];
      p.t += dt;
      if (p.t > .9) { fx.pop.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - p.t / .9;
      ctx.fillStyle = '#ffc94a';
      ctx.font = `900 ${Math.round(c * .8)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, L.fx + L.fw / 2, L.fy + L.fh * .45 - p.t * c * 2);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    $('bs-game').classList.toggle('low', pend >= 6 || highest(gm) < 5);
  }

  // Hoeveel lege rijen er nog boven je hoogste steen zijn.
  function highest(gm) {
    for (let y = HIDDEN; y < BsCore.H; y++) for (let x = 0; x < W; x++) if (gm.grid[y * W + x]) return y - HIDDEN;
    return VIS;
  }

  function panel(ctx, x, y, w, h, title) {
    const c = layout.cell;
    ctx.fillStyle = 'rgba(8,12,26,.78)';
    BsDraw.rr(ctx, x, y, w, h, c * .25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,74,.35)';
    ctx.lineWidth = Math.max(1, c * .05);
    ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    ctx.font = `800 ${Math.round(c * .42)}px Orbitron, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(title, x + c * .3, y + c * .65);
  }

  // Pas als het lettertype geladen is, staan de opschriften goed op de achtergrond.
  if (document.fonts) document.fonts.ready.then(() => { layout.bgDirty = true; });
  requestAnimationFrame(frame);
})();
