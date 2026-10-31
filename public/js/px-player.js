// Pixelridder op de Chromebook of gsm: rennen en springen met je eigen ridder, in echte pixelstijl.
// De hele wereld draait hier (geen vertraging); de server krijgt je positie en wat je verzamelt, en geeft de vragen.
// Chromebook: ← → (of Q/A en D) lopen, spatie / ↑ / Z / W springen (langer drukken = hoger), X / F / Shift schieten, 1-4 antwoorden.
// Gsm: knoppen onderaan. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, Avatar, PxWorld, PxDraw en PxMusic.
(() => {
  const root = document.createElement('div');
  root.id = 'pixel';
  root.innerHTML = `
  <form id="px-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Pixelridder</p>
    <input id="px-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="px-join-error"></p>
    <button type="submit" class="big">Spring erin</button>
  </form>
  <section id="px-lobby" class="screen panel hidden">
    <p class="status">Pixelridder</p>
    <canvas id="px-lobby-knight" width="66" height="94"></canvas>
    <p class="title" id="px-lobby-name"></p>
    <p>Ren en spring met <strong>je eigen ridder</strong> door de werelden. Spring op schildkevers en drones, trap schilden weg en raap munten. Haal de <strong>runepoort</strong> op het einde van elke wereld.</p>
    <p><strong>Spring van onder tegen een runeblok</strong> en je krijgt een vraag. Juist: er komt een power-up uit. 💎 Energiekristal = groter, 🔥 plasmazwaard = schieten, ⭐ sterrenschild = even onkwetsbaar.</p>
    <p class="muted small">Pas op voor de stekelbollen: daar kan je niet op springen. Val je, dan begin je terug bij de laatste vlag.</p>
    <p class="muted small ls-hint-touch">◀ ▶ lopen · ⤒ springen (langer = hoger) · ✦ schieten met het zwaard.</p>
    <p class="muted small ls-hint-keys">← → lopen · spatie of ↑ springen (langer = hoger) · X of Shift schieten · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="px-game" class="ak-game hidden">
    <div class="ls-hud ak-hud px-hud">
      <div class="px-chip" id="px-coins">🪙 0</div>
      <div class="sv-mass" id="px-score">0</div>
      <div class="px-chip px-world" id="px-world"></div>
      <div class="px-power" id="px-power"></div>
      <div class="ry-alive" id="px-rank"></div>
      <button class="px-music" id="px-music" type="button" title="Muziek aan/uit">🎵</button>
      <div class="ls-clock" id="px-clock"></div>
    </div>
    <div class="ls-stage px-stage" id="px-stage">
      <canvas id="px-canvas"></canvas>
      <div class="ls-feed" id="px-feed"></div>
      <div class="ls-banner" id="px-banner"></div>
      <div class="tw-toast" id="px-toast"></div>
      <div class="tw-countdown hidden" id="px-countdown"></div>
      <div class="px-pad" id="px-pad">
        <div class="px-dpad" id="px-dpad"><span>◀</span><span>▶</span></div>
        <div class="px-ab">
          <button class="ls-btn px-b" id="px-fire" type="button">✦</button>
          <button class="ls-btn px-a" id="px-jump" type="button">⤒</button>
        </div>
      </div>
    </div>
  </section>
  <section id="px-end" class="screen panel hidden">
    <div class="mark" id="px-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="px-end-title"></p>
    <p class="big" id="px-end-score" style="font-size:1.6rem"></p>
    <p id="px-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const Wd = PxWorld;
  const { T, H, PHYS, SIZE } = Wd;
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '',
    world: null, wIdx: -1, enemies: [], items: [], balls: [], parts: [], pops: [], bumps: new Map(), brickHits: new Map(),
    pl: null, cam: 0, viewW: 400, evq: [], sentAt: 0, others: new AK.Interp(110), check: false, gateBusy: false, music: false,
  };
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.px === '1';
  const show = name => { for (const s of ['px-join', 'px-lobby', 'px-game', 'px-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';
  const myAv = () => Avatar.byName(g.name) || Avatar.mine() || PxDraw.DEFAULT_AV;

  function join(name) {
    socket.emit('px-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('px-join-error').textContent = res.error;
        show('px-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('px-join-error').textContent = '';
    });
  }
  $('px-join').addEventListener('submit', e => { e.preventDefault(); join($('px-name').value); });

  socket.on('px-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.px = s.active ? '1' : '';
    if (!s.active) { g.joined = false; PxMusic.stop(); return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.world = null;
      g.wIdx = -1;
      quiz.close();
      delete $('px-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('px-name').value = saved || '';
        show('px-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('px-lobby-name').textContent = s.name;
      const lc = $('px-lobby-knight').getContext('2d');
      lc.imageSmoothingEnabled = false;
      lc.clearRect(0, 0, 66, 94);
      const kimg = PxDraw.knight(myAv(), true);
      lc.drawImage(kimg, 0, 0, kimg.width, kimg.height, 0, 0, 66, 94);
      show('px-lobby');
    } else if (s.phase === 'play') {
      if (!g.world && s.me) loadWorld(s.me.w, s.gone, s.check, s.me.power);
      show('px-game');
      const mine = s.roster.find(r => r.name === s.name);
      g.color = mine ? mine.color : '#4cc9ff';
      $('px-game').style.setProperty('--team', g.color);
      if (g.music) PxMusic.start();
    } else if (s.phase === 'einde') {
      quiz.close();
      PxMusic.stop();
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      $('px-end-medal').textContent = medals[me.rank - 1] || '🎮';
      $('px-end-title').textContent = me.rank === 1 ? 'Jij bent de grootste Pixelridder!' : `Plek ${me.rank} van ${me.players}`;
      $('px-end-score').textContent = `${me.score || 0} punten`;
      $('px-end-stats').textContent = `${me.worlds || 0} ${me.worlds === 1 ? 'wereld' : 'werelden'} gehaald · ${me.coins || 0} munten · ${me.kills || 0} vijanden verslagen · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('px-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('px-end').dataset.done = '1';
      show('px-end');
    }
  });

  socket.on('px-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('px-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('px-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('px-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    if (msg.o) for (const [n, x, y, f] of msg.o) g.others.push(n, [x, y, 0, f], t);
    g.others.prune(t, 600);
    for (const e of msg.ev || []) {
      if (e[0] === 'poort' && g.me && e[1] !== g.me.n) feedLine(`🏁 ${nameOf(e[1])} haalt de poort van wereld ${e[2] + 1}`, false);
    }
  });

  function setMe(me) {
    g.me = me;
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('px-score').textContent = me.score;
    $('px-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }
  function hudLocal() {
    const pl = g.pl;
    if (!pl) return;
    $('px-coins').textContent = `🪙 ${g.me ? Math.max(g.me.coins, pl.coins) : pl.coins}`;
    const icons = [pl.power >= 1 ? '<b class="on">💎</b>' : '<b>💎</b>', pl.power >= 2 ? '<b class="on hot">🔥</b>' : '<b>🔥</b>', pl.star > performance.now() ? '<b class="on star">⭐</b>' : '<b>⭐</b>'].join('');
    if ($('px-power').dataset.k !== icons) { $('px-power').innerHTML = icons; $('px-power').dataset.k = icons; }
  }

  function feedLine(text, mine) {
    const box = $('px-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${mine ? ' me' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('px-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '', ms = 1600) {
    const el = $('px-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // ---------- Een wereld laden ----------
  function loadWorld(w, gone, check, power = 0) {
    const world = Wd.make(g.state.seed, w);
    g.world = world;
    g.wIdx = w;
    g.enemies = Wd.freshEnemies(world);
    g.items = [];
    g.balls = [];
    g.parts = [];
    g.pops = [];
    g.bumps.clear();
    g.brickHits.clear();
    g.check = Boolean(check);
    g.gateBusy = false;
    g.others.clear();
    for (const it of gone || []) {
      if (it[0] === 'c') world.tiles[it[1]] = 0;
      else if (it[0] === 'b') world.tiles[it[1]] = it[2];
      else if (it[0] === 'k' || it[0] === 's') { const e = g.enemies.find(x => x.id === it[1]); if (e) e.state = it[0] === 'k' ? 'gone' : 'shell'; }
      else if (it[0] === 'cp') g.check = true;
    }
    const prev = g.pl;
    g.pl = {
      x: 40, y: Wd.GY * T, vx: 0, vy: 0, ground: true, left: false, power: power || 0, star: 0, inv: 0, dead: 0, act: 0,
      coyote: 0, jumpAt: -1, chain: 0, fireCd: 0, plat: null, coins: prev ? prev.coins : 0, kick: 0,
    };
    if (g.check) g.pl.x = world.check * T + 8;
    g.cam = Math.max(0, g.pl.x - 80);
  }

  // ---------- Besturing ----------
  const keys = { left: false, right: false, jump: false, fire: false };
  const KEYS = { arrowleft: 'left', q: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'jump', arrowup: 'jump', z: 'jump', w: 'jump', x: 'fire', f: 'fire', shift: 'fire', j: 'fire' };
  function press(k, down) {
    if (k === 'jump' && down && !keys.jump && g.pl) g.pl.jumpAt = performance.now();
    if (k === 'fire' && down && !keys.fire) fire();
    keys[k] = down;
  }
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('px-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = KEYS[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    sfx.unlock();
    if (!e.repeat) press(k, true);
  });
  document.addEventListener('keyup', e => {
    const k = KEYS[e.key.toLowerCase()];
    if (k) press(k, false);
  });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // Gsm: een richtingsknop (links/rechts, je kan met je duim schuiven) en twee knoppen rechts.
  const dpad = $('px-dpad');
  const dp = new Map();
  function dpadUpdate() {
    let l = false, r = false;
    const rect = dpad.getBoundingClientRect();
    for (const x of dp.values()) { if (x - rect.left < rect.width / 2) l = true; else r = true; }
    keys.left = l;
    keys.right = r;
    dpad.children[0].classList.toggle('down', l);
    dpad.children[1].classList.toggle('down', r);
  }
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); try { dpad.setPointerCapture(e.pointerId); } catch {} dp.set(e.pointerId, e.clientX); dpadUpdate(); });
  dpad.addEventListener('pointermove', e => { if (dp.has(e.pointerId)) { dp.set(e.pointerId, e.clientX); dpadUpdate(); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, e => { dp.delete(e.pointerId); dpadUpdate(); });
  dpad.addEventListener('contextmenu', e => e.preventDefault());
  AK.holdButton($('px-jump'), down => press('jump', down));
  AK.holdButton($('px-fire'), down => press('fire', down));

  $('px-music').addEventListener('click', () => {
    g.music = !g.music;
    $('px-music').classList.toggle('on', g.music);
    if (g.music) PxMusic.start(); else PxMusic.stop();
  });

  // ---------- Vragen ----------
  let grant = null;
  let block = null;
  const GOOD = {
    kristal: 'Juist! 💎 Een energiekristal springt uit het blok: pak het en je wordt groter.',
    zwaard: 'Juist! 🔥 Een plasmazwaard: pak het en schiet met X of ✦.',
    ster: 'Juist! ⭐ Een sterrenschild: pak het en je bent even onkwetsbaar.',
  };
  const quiz = AK.quiz({
    root: $('px-game'),
    closeText: 'Terug naar je wereld',
    status: () => 'Runeblok · juist = power-up · je wereld staat even stil',
    ask: cb => socket.emit('px-question', null, cb),
    answer: (i, cb) => socket.emit('px-answer', i, res => {
      if (res && res.correct) grant = res.grant;
      cb(res);
    }),
    good: res => GOOD[res.grant] || 'Juist!',
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    close: () => {
      socket.emit('px-asking', false);
      const b = block;
      block = null;
      if (!b) return;
      if (grant) spawnItem(grant, b);
      else coinFrom(b.tx, b.ty, 0);
      grant = null;
      g.pl.jumpAt = -1;
    },
  });
  function ask(b) {
    if (!g.state || g.state.phase !== 'play' || quiz.open) return;
    block = b;
    grant = null;
    for (const k in keys) keys[k] = false;
    socket.emit('px-asking', true);
    quiz.show();
  }

  // ---------- Gebeurtenissen ----------
  const ev = (...e) => g.evq.push(e);

  function coinFrom(tx, ty, k) {
    const key = 1000000 + (tx * Wd.ROWS + ty) * 8 + k;
    ev('c', key);
    g.pl.coins++;
    g.pops.push({ coin: true, x: tx * T + 8, y: ty * T, vy: -260, life: .5 });
    sfx.marker();
  }

  function spawnItem(kind, b) {
    // power-ups glijden naar de ridder toe, zodat een juist antwoord niet zomaar in een put verdwijnt
    const dir = g.pl && g.pl.x < b.tx * T + 8 ? -1 : 1;
    g.items.push({ kind, x: b.tx * T + 8, y: b.ty * T + T, rise: 0, vx: dir * (kind === 'zwaard' ? 40 : 55), vy: 0, by: b.ty * T });
    sfx.power();
  }

  function part(x, y, color, n = 6, sp = 80, up = 60, s = 2, life = .6, grav = 500) {
    for (let i = 0; i < n && g.parts.length < 300; i++) {
      const a = Math.random() * Math.PI * 2;
      g.parts.push({ x, y, vx: Math.cos(a) * sp * Math.random(), vy: Math.sin(a) * sp * Math.random() - up, color, s, life: life * (.6 + Math.random() * .6), grav });
    }
  }
  function pop(x, y, text, color = '#ffffff') {
    g.pops.push({ x, y, text: String(text), color, vy: -40, life: .8 });
  }

  // Tegen een blok gesprongen (van onder).
  function bump(tx, ty) {
    const w = g.world;
    const t = Wd.tileAt(w, tx, ty);
    const idx = tx * Wd.ROWS + ty;
    const pl = g.pl;
    // vijanden die op dat blok staan, vliegen weg
    for (const e of g.enemies) {
      if ((e.state === 'walk' || e.state === 'shell') && Math.abs(e.x - (tx * T + 8)) < 14 && Math.abs(e.y - ty * T) < 3) kill(e, 0);
    }
    if (t === Wd.RUNE) {
      Wd.setTile(w, tx, ty, Wd.USED);
      ev('b', idx, Wd.USED);
      g.bumps.set(idx, 0.001);
      sfx.tick(false);
      setTimeout(() => ask({ tx, ty }), 220);
    } else if (t === Wd.BRICK) {
      if (pl.power > 0) {
        Wd.setTile(w, tx, ty, Wd.AIR);
        ev('b', idx, Wd.AIR);
        const P = PxDraw.PAL[w.theme];
        for (const [dx, dy] of [[2, 2], [10, 2], [2, 10], [10, 10]]) g.parts.push({ x: tx * T + dx, y: ty * T + dy, vx: (dx < 8 ? -1 : 1) * (50 + Math.random() * 40), vy: -260 + dy * 8, color: P.brick, s: 5, life: 1.2, grav: 1100 });
        sfx.boom();
        buzz(30);
      } else { g.bumps.set(idx, 0.001); sfx.tick(false); }
    } else if (t === Wd.COINBRICK) {
      const n = (g.brickHits.get(idx) || 0) + 1;
      g.brickHits.set(idx, n);
      g.bumps.set(idx, 0.001);
      coinFrom(tx, ty, n);
      if (n >= 6) { Wd.setTile(w, tx, ty, Wd.USED); ev('b', idx, Wd.USED); }
    } else if (t === Wd.HIDDEN) {
      Wd.setTile(w, tx, ty, Wd.USED);
      ev('b', idx, Wd.USED);
      g.bumps.set(idx, 0.001);
      for (let k = 0; k < 5; k++) setTimeout(() => coinFrom(tx, ty, k + 1), k * 110);
      banner('VERRASSING!', 'Een geheim blok vol munten', 'gold', 1200);
      sfx.power();
    } else {
      sfx.tick(true);
    }
  }

  function kill(e, chain) {
    if (e.state === 'gone' || e.state === 'dead') return;
    e.state = 'dead';
    e.vy = -200;
    ev('k', e.id, chain);
    pop(e.x, e.y - 20, [100, 200, 400, 800, 1000][Math.min(4, chain)], '#ffd166');
    part(e.x, e.y - 8, '#ffffff', 5, 90, 40);
  }

  function hurt() {
    const pl = g.pl;
    if (pl.inv > 0 || pl.star > performance.now() || pl.dead || pl.kick > 0) return;
    if (pl.power > 0) {
      pl.power--;
      pl.inv = 2;
      ev('h');
      sfx.hit();
      buzz(120);
      toast(pl.power ? 'Au! Je zwaard is weg' : 'Au! Je bent weer klein', 'bad');
    } else die(true);
  }

  function die(hop) {
    const pl = g.pl;
    if (pl.dead) return;
    pl.dead = 1.7;
    pl.act = 3;
    pl.vx = 0;
    pl.vy = hop ? -330 : 0;
    pl.power = 0;
    pl.star = 0;
    ev('d');
    sfx.bad();
    buzz([80, 60, 160]);
  }

  function respawn() {
    const pl = g.pl;
    pl.dead = 0;
    pl.act = 0;
    pl.x = g.check ? g.world.check * T + 8 : 40;
    pl.y = Wd.GY * T;
    pl.vx = pl.vy = 0;
    pl.inv = 2;
    pl.plat = null;
    g.cam = Math.max(0, pl.x - 80);
    toast(g.check ? 'Terug bij de vlag' : 'Opnieuw van het begin', '');
  }

  function fire() {
    const pl = g.pl;
    if (!pl || pl.power < 2 || pl.dead || quiz.open || pl.fireCd > 0 || g.balls.length >= 2 || !playing()) return;
    pl.fireCd = .25;
    const sz = SIZE[pl.power];
    g.balls.push({ x: pl.x + (pl.left ? -8 : 8), y: pl.y - sz.h * .6, vx: pl.left ? -230 : 230, vy: 60, life: 1.6 });
    sfx.laser();
  }

  // ---------- Natuurkunde ----------
  const solid = (tx, ty) => Wd.SOLID[Wd.tileAt(g.world, tx, ty)] === 1;

  function stepPlayer(dt, time) {
    const pl = g.pl, w = g.world;
    const sz = SIZE[pl.power];
    pl.inv = Math.max(0, pl.inv - dt);
    pl.kick = Math.max(0, pl.kick - dt);
    pl.fireCd = Math.max(0, pl.fireCd - dt);
    if (pl.dead) {
      pl.dead -= dt;
      if (pl.dead < 1.3) { pl.vy = Math.min(PHYS.maxFall, pl.vy + PHYS.grav * dt); pl.y += pl.vy * dt; }
      if (pl.dead <= 0) respawn();
      return;
    }
    // lopen
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) {
      const turning = Math.sign(pl.vx) === -dir && pl.ground;
      pl.vx += dir * PHYS.acc * dt * (pl.ground ? 1 : PHYS.air) * (turning ? 1.8 : 1);
      pl.vx = Math.max(-PHYS.run, Math.min(PHYS.run, pl.vx));
      pl.left = dir < 0;
      if (turning && Math.abs(pl.vx) > 60 && Math.random() < .5) part(pl.x, pl.y - 1, '#cfd8e8', 1, 20, 10, 1, .3, 0);
    } else if (pl.ground) {
      const d = PHYS.dec * dt;
      pl.vx = Math.abs(pl.vx) <= d ? 0 : pl.vx - Math.sign(pl.vx) * d;
    }
    // springen (met wat speling: net te laat van een rand of net te vroeg op de knop mag)
    pl.coyote = pl.ground ? .09 : Math.max(0, pl.coyote - dt);
    const wantJump = pl.jumpAt > 0 && performance.now() - pl.jumpAt < 140;
    if (wantJump && pl.coyote > 0) {
      pl.vy = -(PHYS.jump + Math.abs(pl.vx) * .12);
      pl.ground = false;
      pl.coyote = 0;
      pl.jumpAt = -1;
      pl.plat = null;
      sfx.jump();
    }
    const grav = pl.vy < 0 && keys.jump ? PHYS.gravHold : PHYS.grav;
    pl.vy = Math.min(PHYS.maxFall, pl.vy + grav * dt);
    // meedrijven op een bewegend platform
    if (pl.plat) {
      const a = Wd.platPos(pl.plat, time - dt), b = Wd.platPos(pl.plat, time);
      pl.x += b.x - a.x;
    }
    // horizontaal bewegen en botsen
    const hw = sz.w / 2;
    let nx = pl.x + pl.vx * dt;
    nx = Math.max(g.cam + hw, Math.min(w.len * T - hw, nx));
    const top = pl.y - sz.h + 1, bot = pl.y - 1;
    const edge = pl.vx >= 0 ? nx + hw : nx - hw;
    const ex = Math.floor(edge / T);
    let blocked = false;
    for (let ty = Math.floor(top / T); ty <= Math.floor(bot / T); ty++) if (solid(ex, ty)) blocked = true;
    if (blocked && nx !== pl.x) {
      nx = pl.vx >= 0 ? ex * T - hw - .01 : (ex + 1) * T + hw + .01;
      pl.vx = 0;
    }
    pl.x = nx;
    // verticaal
    const oy = pl.y;
    let ny = pl.y + pl.vy * dt;
    const lx = Math.floor((pl.x - hw + 1) / T), rx = Math.floor((pl.x + hw - 1) / T);
    pl.ground = false;
    if (pl.vy >= 0) {
      const row = Math.floor(ny / T);
      let land = false;
      for (let tx = lx; tx <= rx; tx++) {
        const t = Wd.tileAt(w, tx, row);
        if (Wd.SOLID[t] || (t === Wd.PLANK && oy <= row * T + .5)) land = true;
      }
      pl.plat = null;
      for (const p of w.plats) {
        const pos = Wd.platPos(p, time);
        if (pl.x + hw > pos.x && pl.x - hw < pos.x + p.w * T && oy <= pos.y + 2 && ny >= pos.y) { ny = pos.y; land = false; pl.ground = true; pl.plat = p; pl.vy = 0; }
      }
      if (land) {
        if (pl.vy > 260) part(pl.x, row * T - 1, '#cfd8e8', 4, 40, 20, 1, .3, 0);
        ny = row * T;
        pl.vy = 0;
        pl.ground = true;
        pl.chain = 0;
      }
      if (pl.ground) pl.chain = 0;
    } else {
      const row = Math.floor((ny - sz.h) / T);
      // eerst het blok recht boven het midden, anders het blok dat je net raakt
      const cx = Math.floor(pl.x / T);
      let hit = null;
      const hitAt = tx => { const t = Wd.tileAt(w, tx, row); return Wd.SOLID[t] || t === Wd.HIDDEN; };
      if (hitAt(cx)) hit = cx;
      else for (let tx = lx; tx <= rx; tx++) if (hitAt(tx)) { hit = tx; break; }
      if (hit !== null && row >= 0) {
        // net naast een rand? Dan schuiven we je er voorbij in plaats van te botsen.
        const tl = hit * T, tr = tl + T;
        const overlap = Math.min(pl.x + hw, tr) - Math.max(pl.x - hw, tl);
        if (overlap < 4 && Wd.tileAt(w, hit, row) !== Wd.HIDDEN && hit !== cx) {
          pl.x += pl.x < tl ? -(overlap + .1) : overlap + .1;
        } else {
          ny = (row + 1) * T + sz.h;
          pl.vy = 0;
          bump(hit, row);
        }
      }
    }
    pl.y = ny;
    // houding voor de tekening
    pl.act = !pl.ground ? 2 : Math.abs(pl.vx) > 10 ? 1 : 0;
    // gevaren
    if (pl.y > H + 24) return die(false);
    for (let tx = lx; tx <= rx; tx++) {
      for (let ty = Math.floor((pl.y - sz.h + 1) / T); ty <= Math.floor((pl.y - 1) / T); ty++) {
        const t = Wd.tileAt(w, tx, ty);
        if (t === Wd.LAVA && pl.y > ty * T + 6) return die(true);
        if (t === Wd.COIN) {
          Wd.setTile(w, tx, ty, Wd.AIR);
          ev('c', tx * Wd.ROWS + ty);
          pl.coins++;
          sfx.marker();
          part(tx * T + 8, ty * T + 8, '#ffd166', 4, 50, 20, 1, .35, 0);
        }
      }
    }
    // vlag en poort
    if (w.check && !g.check && pl.x >= w.check * T) {
      g.check = true;
      ev('cp');
      sfx.go();
      toast('🚩 Vlag! Hier begin je terug als je valt', 'gold');
    }
    if (!g.gateBusy && pl.x >= w.gate * T + 16) reachGate();
  }

  function stepEnemies(dt, time) {
    const pl = g.pl;
    const sz = SIZE[pl.power];
    const hw = sz.w / 2;
    const star = pl.star > performance.now();
    for (const e of g.enemies) {
      if (e.state === 'gone') continue;
      if (!e.on) { if (e.x < g.cam + g.viewW + 24) e.on = true; else continue; }
      if (e.state === 'dead') {
        e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav * dt);
        e.y += e.vy * dt;
        if (e.y > H + 40) e.state = 'gone';
        continue;
      }
      Wd.stepEnemy(g.world, e, dt, time);
      if (e.kickT) e.kickT = Math.max(0, e.kickT - dt);
      if (e.state === 'gone') continue;
      const spec = Wd.ENEMY[e.type];
      // een glijdend schild ruimt andere vijanden op
      if (e.state === 'slide') {
        for (const o of g.enemies) {
          if (o === e || !o.on || o.state === 'gone' || o.state === 'dead') continue;
          if (Math.abs(o.x - e.x) < 13 && Math.abs(o.y - e.y) < 12) { e.combo = (e.combo || 0) + 1; kill(o, Math.min(4, e.combo)); }
        }
      }
      if (pl.dead || quiz.open) continue;
      // botsing met de ridder
      if (Math.abs(e.x - pl.x) > hw + spec.w / 2 - 2) continue;
      if (pl.y < e.y - spec.h + 1 || pl.y - sz.h > e.y - 2) continue;
      if (star) { kill(e, Math.min(4, pl.chain++)); sfx.hit(); continue; }
      const stomp = pl.vy > 0 && pl.y - pl.vy * dt <= e.y - spec.h + 7 && e.type !== 'stekel';
      if (stomp) {
        pl.vy = keys.jump ? -340 : -220;
        pl.y = e.y - spec.h;
        const chain = Math.min(4, pl.chain++);
        sfx.tick(true);
        buzz(25);
        part(e.x, e.y - spec.h, '#ffffff', 4, 50, 10, 1, .3, 0);
        if (e.type === 'drone') kill(e, chain);
        else if (e.state === 'walk') { e.state = 'shell'; e.t = 0; e.vx = 0; ev('s', e.id, chain); pop(e.x, e.y - 20, [100, 200, 400, 800, 1000][chain], '#ffd166'); }
        else if (e.state === 'slide') { e.state = 'shell'; e.t = 0; e.vx = 0; }
        else if (e.state === 'shell') { e.state = 'slide'; e.vx = pl.x < e.x ? 1 : -1; e.kickT = .25; e.combo = 0; sfx.swoosh(); }
        continue;
      }
      if (e.state === 'shell') {
        // een stilliggend schild wegtrappen
        e.state = 'slide';
        e.vx = pl.x < e.x ? 1 : -1;
        e.x += e.vx * 6;
        e.kickT = .3;
        e.combo = 0;
        pl.kick = .2;
        sfx.swoosh();
        continue;
      }
      if (e.state === 'slide' && e.kickT > 0) continue;
      hurt();
    }
  }

  function stepItems(dt) {
    const pl = g.pl, w = g.world;
    const sz = SIZE[pl.power];
    for (let i = g.items.length - 1; i >= 0; i--) {
      const it = g.items[i];
      if (it.rise < 1) {
        it.rise = Math.min(1, it.rise + dt * 2);
        it.y = it.by + T - it.rise * T;
      } else {
        it.vy = Math.min(PHYS.maxFall, it.vy + PHYS.grav * .6 * dt);
        const nx = it.x + it.vx * dt;
        if (Wd.solidAt(w, nx + Math.sign(it.vx) * 6, it.y - 6)) it.vx = -it.vx; else it.x = nx;
        const ny = it.y + it.vy * dt;
        if (it.vy > 0 && (Wd.solidAt(w, it.x - 5, ny) || Wd.solidAt(w, it.x + 5, ny))) {
          it.y = Math.floor(ny / T) * T;
          it.vy = it.kind === 'ster' ? -280 : 0;
          // op de grond: altijd richting de ridder
          if (Math.abs(pl.x - it.x) > 24) it.vx = Math.sign(pl.x - it.x) * Math.abs(it.vx || 50);
        } else it.y = ny;
        if (it.y > H + 30) { g.items.splice(i, 1); continue; }
      }
      if (pl.dead || it.rise < .6) continue;
      if (Math.abs(it.x - pl.x) < 14 && pl.y > it.y - 16 && pl.y - sz.h - 4 < it.y) {
        g.items.splice(i, 1);
        ev('p', it.kind);
        if (it.kind === 'kristal') { pl.power = Math.max(pl.power, 1); banner('GROTER!', 'Je kan nu bakstenen breken en één keer geraakt worden', 'gold'); }
        else if (it.kind === 'zwaard') { pl.power = 2; banner('PLASMAZWAARD!', 'Schiet met X, Shift of ✦', 'gold'); }
        else { pl.star = performance.now() + 8000; banner('STERRENSCHILD!', 'Acht seconden onkwetsbaar: ren overal door', 'gold'); }
        pl.inv = Math.max(pl.inv, .4);
        sfx.power();
        sfx.good();
        buzz([30, 30, 60]);
        part(pl.x, pl.y - 12, '#ffd166', 14, 120, 30, 2, .6, 0);
      }
    }
  }

  function stepBalls(dt) {
    const w = g.world;
    for (let i = g.balls.length - 1; i >= 0; i--) {
      const b = g.balls[i];
      b.life -= dt;
      b.vy = Math.min(400, b.vy + 1100 * dt);
      const nx = b.x + b.vx * dt;
      if (Wd.solidAt(w, nx, b.y)) { part(b.x, b.y, '#ff9a3d', 5, 60, 20, 1, .3, 0); g.balls.splice(i, 1); continue; }
      b.x = nx;
      const ny = b.y + b.vy * dt;
      if (b.vy > 0 && Wd.solidAt(w, b.x, ny + 3)) { b.vy = -190; b.y = Math.floor((ny + 3) / T) * T - 3; } else b.y = ny;
      if (b.life <= 0 || b.x < g.cam - 10 || b.x > g.cam + g.viewW + 10 || b.y > H) { g.balls.splice(i, 1); continue; }
      for (const e of g.enemies) {
        if (!e.on || e.state === 'gone' || e.state === 'dead') continue;
        if (Math.abs(e.x - b.x) < 9 && b.y > e.y - 15 && b.y < e.y + 2) {
          kill(e, 0);
          part(b.x, b.y, '#ff9a3d', 6, 80, 20, 2, .4, 0);
          g.balls.splice(i, 1);
          sfx.hit();
          break;
        }
      }
    }
  }

  function stepFx(dt) {
    for (let i = g.parts.length - 1; i >= 0; i--) {
      const p = g.parts[i];
      p.life -= dt;
      if (p.life <= 0) { g.parts.splice(i, 1); continue; }
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = g.pops.length - 1; i >= 0; i--) {
      const p = g.pops[i];
      p.life -= dt;
      if (p.life <= 0) { g.pops.splice(i, 1); continue; }
      if (p.coin) { p.vy += 1100 * dt; p.y += p.vy * dt; } else p.y += p.vy * dt;
    }
    for (const [k, v] of g.bumps) { const nv = v + dt * 7; if (nv >= 1) g.bumps.delete(k); else g.bumps.set(k, nv); }
  }

  // De runepoort gehaald: de server telt de punten en geeft de volgende wereld.
  function reachGate() {
    g.gateBusy = true;
    const pl = g.pl;
    pl.vx = 0;
    sendPos(true);
    socket.emit('px-gate', null, res => {
      if (!res || res.error) {
        setTimeout(() => { g.gateBusy = false; }, 1500);
        return;
      }
      sfx.fanfare();
      buzz([40, 40, 120]);
      confetti(1600);
      const name = Wd.THEMES[res.w % Wd.THEMES.length].name;
      banner(`WERELD ${res.w} GEHAALD!`, `+${res.points} · op naar ${name}`, 'big', 2200);
      setTimeout(() => {
        if (!g.state || g.state.phase !== 'play') return;
        loadWorld(res.w, [], false, g.pl.power);
        banner(`WERELD ${res.w + 1}`, name, 'big', 1800);
      }, 2000);
    });
  }

  // ---------- Doorsturen ----------
  function flags() {
    const pl = g.pl;
    return pl.power | (pl.star > performance.now() ? 4 : 0) | (pl.left ? 8 : 0) | (pl.act << 4) | (pl.inv > 0 ? 64 : 0);
  }
  function sendPos(force) {
    const t = performance.now();
    if (!force && t - g.sentAt < 100) return;
    g.sentAt = t;
    socket.emit('px-pos', { w: g.wIdx, x: Math.round(g.pl.x), y: Math.round(g.pl.y), f: flags(), ev: g.evq.splice(0, 24) });
  }

  function playing() {
    return g.world && g.state && g.state.phase === 'play' && now() >= g.state.startedAt;
  }

  // ---------- Elke frame ----------
  const canvas = $('px-canvas');
  const ctx = canvas.getContext('2d');
  const stage = $('px-stage');
  let last = performance.now();
  let lay = { cw: 0, ch: 0 };
  function fitCanvas() {
    const r = stage.getBoundingClientRect();
    if (r.width === lay.cw && r.height === lay.ch) return;
    lay = { cw: r.width, ch: r.height };
    let vw = Math.round(H * r.width / Math.max(1, r.height));
    let cssH = r.height;
    if (vw < 224) { vw = 224; cssH = r.width * H / 224; }
    vw = Math.min(vw, 520);
    g.viewW = vw;
    canvas.width = vw;
    canvas.height = H;
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${cssH}px`;
    // gsm rechtop: het spel in het midden van de ruimte boven de knoppen
    const pad = $('px-pad').offsetHeight || 0;
    canvas.style.top = `${cssH < r.height ? Math.max(0, (r.height - pad - cssH) / 2) : 0}px`;
    ctx.imageSmoothingEnabled = false;
  }

  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('px-game').classList.contains('hidden') || !g.world) return;
    const left = g.state.endsAt - now();
    $('px-clock').textContent = AK.clock(left);
    $('px-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('px-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('px-countdown').textContent = Math.ceil(wait / 1000);
    $('px-world').textContent = `W${g.wIdx + 1} · ${Wd.THEMES[g.world.theme].name.replace('De ', '')}`;
    fitCanvas();
    const time = gameTime();
    if (playing() && !quiz.open && !g.gateBusy) {
      // in twee stapjes als de frame lang duurde, zodat je nergens doorheen valt
      const steps = dt > 1 / 50 ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        stepPlayer(dt / steps, time);
        stepEnemies(dt / steps, time);
        stepItems(dt / steps);
        stepBalls(dt / steps);
      }
    }
    stepFx(dt);
    if (playing()) sendPos(false);
    // camera: schuift alleen vooruit, zoals vroeger
    const pl = g.pl;
    const want = Math.max(0, Math.min(g.world.len * T - g.viewW, pl.x - g.viewW * .42));
    if (want > g.cam) g.cam += Math.min(want - g.cam, Math.max(1, (want - g.cam) * 10 * dt + 60 * dt));
    hudLocal();
    draw(t / 1000, time);
  }

  function draw(rt, time) {
    const pl = g.pl;
    const players = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r) continue;
      const f = v[3];
      players.push({ x: v[0], y: v[1], power: f & 3, star: !!(f & 4), left: !!(f & 8), act: (f >> 4) & 3, av: Avatar.byName(r.name) || PxDraw.DEFAULT_AV, ghost: true, color: r.color, asking: !!(f & 128) });
    }
    players.push({ x: pl.x, y: pl.y, power: pl.power, star: pl.star > performance.now(), left: pl.left, act: pl.act, av: myAv(), color: g.color, blink: pl.inv > 0 && !pl.dead });
    PxDraw.scene(ctx, {
      world: g.world, camX: g.cam, viewW: g.viewW, time, t: rt, enemies: g.enemies, items: g.items, balls: g.balls, parts: g.parts, pops: g.pops,
      players, bumps: g.bumps, checkLit: g.check ? g.color || '#ffd166' : null,
    });
  }

  requestAnimationFrame(frame);
})();
