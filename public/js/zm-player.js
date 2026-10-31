// Zwermwacht op de Chromebook of gsm: je ridder verdedigt zich tegen zwermen roestrobots.
// De wapens vuren vanzelf; jij stuurt alleen waar je loopt (pijltjes/WASD, of sleep met je vinger of de muis).
// De zwerm leeft hier (geen vertraging); de server krijgt de aantallen en geeft de vragen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, ZmWorld en ZmDraw.
(() => {
  const W = ZmWorld;
  const root = document.createElement('div');
  root.id = 'zwerm';
  root.innerHTML = `
  <form id="zm-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Zwermwacht</p>
    <input id="zm-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="zm-join-error"></p>
    <button type="submit" class="big">Naar de burcht</button>
  </form>
  <section id="zm-lobby" class="screen panel hidden">
    <p class="status">Zwermwacht</p>
    <canvas id="zm-lobby-art" width="240" height="100"></canvas>
    <p class="title" id="zm-lobby-name"></p>
    <p>Zwermen <strong>roestrobots</strong> komen op je af. Je wapens vuren <strong>vanzelf</strong>: jij bepaalt alleen waar je loopt.</p>
    <p>Raap de <strong>kristallen</strong> op. Is je balk vol, dan krijg je een vraag. Juist = kies zelf een upgrade. Fout = je krijgt toch een kleine.</p>
    <p class="muted small">Hartjes op? Beantwoord een vraag en je staat weer recht. Op het einde komt De IJzeren Kolos!</p>
    <p class="muted small ls-hint-touch">Sleep met je vinger om te lopen.</p>
    <p class="muted small ls-hint-keys">Pijltjes of WASD om te lopen (of klik en sleep) · 1-4 antwoorden · 1-3 upgrade kiezen.</p>
    <div class="spinner"></div>
  </section>
  <section id="zm-game" class="ak-game hidden">
    <div class="ls-hud ak-hud zm-hud">
      <div class="sv-mass" id="zm-score">0</div>
      <div class="px-chip" id="zm-lvl">⭐ 1</div>
      <div class="zm-hearts" id="zm-hearts"></div>
      <div class="px-chip" id="zm-kills">🤖 0</div>
      <div class="ry-alive" id="zm-rank"></div>
      <div class="ls-clock" id="zm-clock"></div>
    </div>
    <div class="zm-xp" id="zm-xp"><i></i></div>
    <div class="ls-stage zm-stage" id="zm-stage">
      <canvas id="zm-canvas"></canvas>
      <div class="zm-weapons" id="zm-weapons"></div>
      <div class="ls-feed" id="zm-feed"></div>
      <div class="ls-banner" id="zm-banner"></div>
      <div class="tw-toast" id="zm-toast"></div>
      <div class="tw-countdown hidden" id="zm-countdown"></div>
      <div class="zm-tip" id="zm-tip"><span class="ls-hint-touch">Sleep om te lopen</span><span class="ls-hint-keys">Pijltjes of WASD om te lopen</span></div>
      <div class="zm-cards hidden" id="zm-cards"><p class="zm-cards-title">Kies je upgrade</p><div class="zm-card-row"></div></div>
      <div class="ak-stick hidden" id="zm-stick"><i></i></div>
    </div>
  </section>
  <section id="zm-end" class="screen panel hidden">
    <div class="mark" id="zm-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="zm-end-title"></p>
    <p class="big" id="zm-end-score" style="font-size:1.6rem"></p>
    <p id="zm-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff', autoRun: -1 };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.zm === '1';
  const show = name => { for (const s of ['zm-join', 'zm-lobby', 'zm-game', 'zm-end']) $(s).classList.toggle('hidden', s !== name); };

  // ---------- De wereld van deze leerling ----------
  let w = null;
  function newWorld() {
    w = {
      pl: { x: 0, y: 0, hp: W.PLAYER.hp, maxHp: W.PLAYER.hp, hurt: 0, face: 1, step: 0 },
      build: { w: { pijl: 1 }, p: {} },
      foes: [], shots: [], gems: [], bolts: [], pulses: [],
      cd: {}, swordA: 0, valk: { x: 0, y: -60, a: 0 },
      xp: 0, pending: 0, kills: 0, xpTotal: 0, lvl: 0,
      spawn: 0, ringAt: 40, boss: null, bossN: 0, bossNext: 0, bossCall: 0,
      cap: W.MAX_ALIVE, slow: 0, statAt: 0, shake: 0, why: '', askAgain: 0,
      rand: W.rng(((g.state && g.state.seed) || 1) * 31 + ((g.me && g.me.n) || 0) * 7 + 1),
    };
  }
  newWorld();

  const mult = () => ({
    dmg: 1 + (w.build.p.kracht || 0) * W.PASSIVES.kracht.per,
    cd: 1 - (w.build.p.haast || 0) * W.PASSIVES.haast.per,
    sp: 1 + (w.build.p.laars || 0) * W.PASSIVES.laars.per,
    pick: W.PLAYER.pickup * (1 + (w.build.p.magneet || 0) * W.PASSIVES.magneet.per),
  });

  function apply(o) {
    if (o.kind === 'w') w.build.w[o.id] = o.lvl;
    else {
      w.build.p[o.id] = o.lvl;
      if (o.id === 'hart') { w.pl.maxHp = W.PLAYER.hp + o.lvl; w.pl.hp = w.pl.maxHp; }
    }
    renderWeapons();
  }

  // ---------- Aanmelden en de stand van de server ----------
  function join(name) {
    socket.emit('zm-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('zm-join-error').textContent = res.error;
        show('zm-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('zm-join-error').textContent = '';
    });
  }
  $('zm-join').addEventListener('submit', e => { e.preventDefault(); join($('zm-name').value); });

  socket.on('zm-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.zm = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.restored = false;
      quiz.close();
      closeCards();
      newWorld();
      delete $('zm-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('zm-name').value = saved || '';
        show('zm-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    // Terug na herladen: de tellers van de server, en evenveel upgrades als je niveau.
    if (!g.restored && Number.isInteger(s.lvl)) {
      g.restored = true;
      w.kills = Math.max(w.kills, s.kills || 0);
      w.xpTotal = Math.max(w.xpTotal, s.xp || 0);
      while (w.lvl < s.lvl) {
        const opts = W.options(w.build);
        if (opts.length) apply(opts[Math.floor(w.rand() * opts.length)]);
        w.lvl++;
      }
      w.rand = W.rng(s.seed * 31 + (s.me ? s.me.n : 0) * 7 + 1);
    }
    if (s.phase === 'lobby') {
      $('zm-lobby-name').textContent = s.name;
      drawLobby();
      show('zm-lobby');
    } else if (s.phase === 'play') {
      show('zm-game');
      $('zm-game').style.setProperty('--team', g.color);
      renderWeapons();
    } else if (s.phase === 'einde') {
      quiz.close();
      closeCards();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('zm-end-medal').textContent = medals[me.rank - 1] || '🛡️';
      $('zm-end-title').textContent = me.rank === 1 ? 'Jij bent de beste zwermwachter!' : `Plek ${me.rank} van ${me.players}`;
      $('zm-end-score').textContent = `${me.score || 0} punten`;
      $('zm-end-stats').textContent = `${me.kills || 0} robots · niveau ${(me.lvl || 0) + 1}${me.bosses ? ` · 👑 ${me.bosses}× de Kolos` : ''} · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('zm-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('zm-end').dataset.done = '1';
      show('zm-end');
    }
  });

  function drawLobby() {
    const c = $('zm-lobby-art').getContext('2d');
    c.clearRect(0, 0, 240, 100);
    const kn = ZmDraw.sprite('ridder', 62, { color: g.color });
    c.drawImage(kn, 120 - kn.width / 2, 50 - kn.height / 2);
    [['kever', 30, 60, 38], ['bij', 70, 22, 26], ['slijm', 200, 62, 42], ['drone', 176, 18, 30]].forEach(([k, x, y, s]) => {
      const sp = ZmDraw.sprite(k, s, { flip: x > 120 });
      c.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
    });
  }

  socket.on('zm-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('zm-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('zm-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });
  socket.on('zm-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const first = !g.me;
    g.me = me;
    setText('zm-score', me.score);
    setText('zm-rank', me.rank ? `#${me.rank} van ${me.players}` : '');
    if (first && g.state) w.rand = W.rng(g.state.seed * 31 + me.n * 7 + 1);
  }
  const shown = {};
  function setText(id, text) {
    text = String(text);
    if (shown[id] === text) return;
    shown[id] = text;
    $(id).textContent = text;
  }

  // ---------- Vragen: balk vol of hartjes op ----------
  let lastRes = null;
  const quiz = AK.quiz({
    root: $('zm-game'),
    closeText: 'Verder vechten',
    lock: 400,
    status: () => (w.why === 'op' ? 'Hartjes op · beantwoord de vraag en je staat weer recht' : 'Balk vol · juist = kies zelf je upgrade'),
    ask: cb => socket.emit('zm-question', null, cb),
    answer: (i, cb) => socket.emit('zm-answer', i, res => { lastRes = res; cb(res); }),
    good: res => (w.why === 'op' ? `Juist! Al je hartjes zijn weer vol. +${res.points}` : `Juist! Kies zelf je upgrade. +${res.points}`),
    bad: () => (w.why === 'op' ? 'Helaas. Kijk naar het juiste antwoord. Je staat zo weer recht.' : 'Helaas. Kijk naar het juiste antwoord. Je krijgt toch een kleine upgrade.'),
    next: () => false,
    again: false,
    close: () => {
      const res = lastRes;
      lastRes = null;
      const why = w.why;
      if (!res || res.error) { // gesloten zonder antwoord: straks opnieuw
        w.askAgain = performance.now() + 1200;
        return;
      }
      socket.emit('zm-asking', '');
      w.why = '';
      if (Number.isInteger(res.lvl)) w.lvl = res.lvl;
      if (why === 'op') return revive(res.correct);
      w.pending = Math.max(0, w.pending - 1);
      if (res.correct) openCards(W.cards(w.build, w.rand, res.gold));
      else {
        const opts = W.options(w.build).filter(o => o.kind === 'p' || (w.build.w[o.id] || 0) > 0);
        const o = opts.length ? opts[Math.floor(w.rand() * opts.length)] : W.options(w.build)[0];
        if (o) { apply(o); const l = W.label(o); toast(`${l.icon} ${l.name} niveau ${l.lvl}`); }
      }
    },
  });

  function ask(why) {
    if (quiz.open || cardsOpen) return;
    w.why = why;
    socket.emit('zm-asking', why);
    quiz.show();
  }

  function revive(correct) {
    const pl = w.pl;
    pl.hp = correct ? pl.maxHp : Math.max(1, Math.ceil(pl.maxHp / 2));
    pl.hurt = 2.5;
    // Een grote schokgolf duwt alle robots weg.
    for (const e of w.foes) {
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy) || 1;
      if (d < 420) { e.kx = dx / d * 900; e.ky = dy / d * 900; }
    }
    w.pulses.push({ x: pl.x, y: pl.y, r: 420, t: 0, max: .6, color: '#ffc94a' });
    sfx.power();
    banner('WEER RECHT!', correct ? 'Alle hartjes vol' : 'Hou vol!', correct ? 'gold' : '');
  }

  // ---------- Upgrade kiezen ----------
  let cardsOpen = false;
  let cardList = [];
  function openCards(list) {
    if (!list.length) return;
    cardsOpen = true;
    cardList = list;
    const row = $('zm-cards').querySelector('.zm-card-row');
    row.innerHTML = '';
    list.forEach((o, i) => {
      const l = W.label(o);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `zm-card${o.gold ? ' zm-goud' : ''}`;
      b.innerHTML = `<span class="zm-card-key">${i + 1}</span><span class="zm-card-icon"></span><strong></strong><small></small><em></em>`;
      b.querySelector('.zm-card-icon').textContent = l.icon;
      b.querySelector('strong').textContent = l.name;
      b.querySelector('small').textContent = o.gold ? `GOUD: meteen niveau ${l.lvl}` : l.lvl === 1 ? 'Nieuw!' : `Niveau ${l.lvl}`;
      b.querySelector('em').textContent = l.text;
      b.addEventListener('click', () => pickCard(i));
      row.appendChild(b);
    });
    $('zm-cards').classList.remove('hidden');
    sfx.power();
  }
  function pickCard(i) {
    if (!cardsOpen || !cardList[i]) return;
    const o = cardList[i];
    apply(o);
    closeCards();
    const l = W.label(o);
    toast(`${l.icon} ${l.name} niveau ${l.lvl}`);
    w.pulses.push({ x: w.pl.x, y: w.pl.y, r: 120, t: 0, max: .45, color: o.gold ? '#ffc94a' : '#5ee7ff' });
  }
  function closeCards() {
    cardsOpen = false;
    cardList = [];
    $('zm-cards').classList.add('hidden');
  }

  function renderWeapons() {
    const parts = [];
    for (const id of W.WEAPON_IDS) if (w.build.w[id]) parts.push(`<span class="zm-w" title="${W.WEAPONS[id].name}">${W.WEAPONS[id].icon}<b>${w.build.w[id]}</b></span>`);
    for (const id of W.PASSIVE_IDS) if (w.build.p[id]) parts.push(`<span class="zm-w zm-p" title="${W.PASSIVES[id].name}">${W.PASSIVES[id].icon}<b>${w.build.p[id]}</b></span>`);
    const html = parts.join('');
    if (shown.weapons !== html) { shown.weapons = html; $('zm-weapons').innerHTML = html; }
  }

  // ---------- Besturing ----------
  const stage = $('zm-stage');
  const stickEl = $('zm-stick');
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const RAD = 56;
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button, .ak-question, .zm-cards') || stick.id !== null) return;
    e.preventDefault();
    sfx.unlock();
    const r = stage.getBoundingClientRect();
    Object.assign(stick, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    stickEl.style.left = `${e.clientX - r.left}px`;
    stickEl.style.top = `${e.clientY - r.top}px`;
    stickEl.firstChild.style.transform = 'translate(-50%, -50%)';
    stickEl.classList.remove('hidden');
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', e => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const l = Math.hypot(dx, dy);
    if (l > RAD) {
      const r = stage.getBoundingClientRect();
      stick.ox += dx / l * (l - RAD);
      stick.oy += dy / l * (l - RAD);
      stickEl.style.left = `${stick.ox - r.left}px`;
      stickEl.style.top = `${stick.oy - r.top}px`;
      dx = e.clientX - stick.ox;
      dy = e.clientY - stick.oy;
    }
    const m = Math.hypot(dx, dy);
    const power = m < 8 ? 0 : Math.min(1, .45 + m / RAD * .7);
    stick.x = m ? dx / m * power : 0;
    stick.y = m ? dy / m * power : 0;
    stickEl.firstChild.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const endStick = e => {
    if (e.pointerId !== stick.id) return;
    Object.assign(stick, { id: null, x: 0, y: 0 });
    stickEl.classList.add('hidden');
  };
  stage.addEventListener('pointerup', endStick);
  stage.addEventListener('pointercancel', endStick);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('zm-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (cardsOpen && /^[1-3]$/.test(e.key)) { e.preventDefault(); pickCard(Number(e.key) - 1); return; }
    if (AK.isMoveKey(e.key)) { e.preventDefault(); sfx.unlock(); }
  });

  // ---------- De zwerm ----------
  // Een raster van vakjes, zodat elk wapen alleen de robots in de buurt hoeft te bekijken.
  const CELL = 80;
  const grid = new Map();
  const cellKey = (cx, cy) => (cx + 50000) * 100000 + (cy + 50000);
  function buildGrid() {
    grid.clear();
    for (const e of w.foes) {
      const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let l = grid.get(k);
      if (!l) { l = []; grid.set(k, l); }
      l.push(e);
    }
  }
  function near(x, y, r, fn) {
    const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL);
    const r0 = Math.floor((y - r) / CELL), r1 = Math.floor((y + r) / CELL);
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
      const l = grid.get(cellKey(cx, cy));
      if (l) for (const e of l) if (!e.dead) fn(e);
    }
  }

  let view = { w: 1, h: 1, zoom: 1, hw: 400, hh: 300 };
  function spawn(kind, x, y, hpMul) {
    const d = W.ENEMIES[kind];
    const e = { kind, x, y, hp: d.hp * hpMul, max: d.hp * hpMul, r: d.r, sp: d.sp * (.9 + w.rand() * .2), xp: d.xp, kx: 0, ky: 0, flash: 0, zt: 0, ph: w.rand() * 6, boss: !!d.boss, dead: false };
    w.foes.push(e);
    return e;
  }
  function edgePoint(extra = 60) {
    const a = w.rand() * Math.PI * 2;
    const d = Math.hypot(view.hw, view.hh) + extra;
    return { x: w.pl.x + Math.cos(a) * d, y: w.pl.y + Math.sin(a) * d };
  }
  function pickType(types) {
    let sum = 0;
    for (const k of types) sum += W.ENEMIES[k].w;
    let r = w.rand() * sum;
    for (const k of types) { r -= W.ENEMIES[k].w; if (r <= 0) return k; }
    return types[0];
  }

  function hurtFoe(e, dmg, kx = 0, ky = 0) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = .06;
    if (!e.boss) { e.kx += kx; e.ky += ky; }
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true;
    w.kills++;
    const n = e.boss ? 10 : 1;
    for (let i = 0; i < n; i++) {
      const v = e.boss ? 5 : e.xp;
      dropGem(e.x + (e.boss ? Math.cos(i / n * 6.28) * 50 : 0), e.y + (e.boss ? Math.sin(i / n * 6.28) * 50 : 0), v, v >= 5 ? 7 : v >= 3 ? 6 : 5);
    }
    if (!e.boss && w.pl.hp < w.pl.maxHp && w.rand() < .012) dropGem(e.x + 10, e.y, 0, 8);
    fx.burst(e.x, e.y, { n: e.boss ? 40 : 5, color: e.boss ? '#ffc94a' : '#ff9d4a', speed: e.boss ? 420 : 200, life: e.boss ? .9 : .35, size: e.boss ? 5 : 3 });
    if (e.boss) {
      w.boss = null;
      w.bossNext = now() + W.BOSS_AGAIN_S * 1000;
      fx.shock(e.x, e.y, 200, '#ffc94a');
      w.shake = .5;
      sfx.boom();
      sfx.fanfare();
      confetti(2000);
      banner('KOLOS VERSLAGEN!', `+${W.POINTS.boss}`, 'gold');
      buzz([60, 40, 60, 40, 120]);
      socket.emit('zm-boss');
    } else if (w.kills % 4 === 0) sfx.marker();
  }
  function dropGem(x, y, v, item) {
    if (w.gems.length >= 220 && item !== 8) {
      const o = w.gems[Math.floor(w.rand() * w.gems.length)];
      o.v += v;
      if (o.item < 7 && o.v >= 5) o.item = 7;
      return;
    }
    w.gems.push({ x, y, v, item, pull: false, sp: 0 });
  }

  function nearest(x, y, range) {
    let best = null, bd = range * range;
    for (const e of w.foes) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function shoot(x, y, a, dmg, pierce, speed, kind) {
    w.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, a, dmg, pierce, life: 1.1, hit: new Set(), kind });
  }

  function weapons(dt, m) {
    const pl = w.pl, b = w.build.w;
    const ready = (id, cd) => { w.cd[id] = (w.cd[id] || 0) - dt; if (w.cd[id] > 0) return false; w.cd[id] = cd * m.cd; return true; };
    // Plasmapijl
    if (b.pijl) {
      const d = W.WEAPONS.pijl, i = b.pijl - 1;
      const t = nearest(pl.x, pl.y, 560);
      if (t && ready('pijl', d.cd[i])) {
        const a = Math.atan2(t.y - pl.y, t.x - pl.x);
        for (let k = 0; k < d.n[i]; k++) shoot(pl.x, pl.y - 10, a + (k - (d.n[i] - 1) / 2) * .16, d.dmg[i] * m.dmg, d.pierce[i], d.speed, 1);
        sfx.laser();
      }
    }
    // Zwaardcirkel
    if (b.zwaard) {
      const d = W.WEAPONS.zwaard, i = b.zwaard - 1;
      w.swordA += d.spin[i] * dt;
      for (let k = 0; k < d.n[i]; k++) {
        const a = w.swordA + k / d.n[i] * Math.PI * 2;
        const sx = pl.x + Math.cos(a) * d.rad[i], sy = pl.y + Math.sin(a) * d.rad[i];
        near(sx, sy, 26, e => {
          if (e.zt > 0) return;
          const dx = e.x - sx, dy = e.y - sy;
          if (dx * dx + dy * dy > (e.r + 18) * (e.r + 18)) return;
          e.zt = .4;
          hurtFoe(e, d.dmg[i] * m.dmg, Math.cos(a + 1.57) * 160, Math.sin(a + 1.57) * 160);
          fx.sparks(e.x, e.y, { n: 3, color: '#9ff3ff', speed: 260, life: .2 });
        });
      }
    }
    // Schildpuls
    if (b.puls) {
      const d = W.WEAPONS.puls, i = b.puls - 1;
      if (ready('puls', d.cd[i])) {
        const r = d.rad[i];
        near(pl.x, pl.y, r, e => {
          const dx = e.x - pl.x, dy = e.y - pl.y, dd = Math.hypot(dx, dy) || 1;
          if (dd > r + e.r) return;
          hurtFoe(e, d.dmg[i] * m.dmg, dx / dd * 520, dy / dd * 520);
        });
        w.pulses.push({ x: pl.x, y: pl.y, r, t: 0, max: .4, color: '#6fb8ff' });
        sfx.whoosh();
      }
    }
    // Bliksemrune
    if (b.bliksem) {
      const d = W.WEAPONS.bliksem, i = b.bliksem - 1;
      if (w.foes.length && ready('bliksem', d.cd[i])) {
        const seen = w.foes.filter(e => !e.dead && Math.abs(e.x - pl.x) < view.hw && Math.abs(e.y - pl.y) < view.hh);
        for (let k = 0; k < d.n[i] && seen.length; k++) {
          const t = seen.splice(Math.floor(w.rand() * seen.length), 1)[0];
          const tx = t.x, ty = t.y;
          near(tx, ty, d.rad + 30, e => {
            const dx = e.x - tx, dy = e.y - ty;
            if (dx * dx + dy * dy <= (d.rad + e.r) * (d.rad + e.r)) hurtFoe(e, d.dmg[i] * m.dmg);
          });
          w.bolts.push({ x: tx, y: ty, t: 0, seed: w.rand() * 1000 });
        }
        sfx.zap ? sfx.zap() : sfx.laser();
      }
    }
    // Valkdrone
    if (b.valk) {
      const d = W.WEAPONS.valk, i = b.valk - 1;
      const v = w.valk;
      v.a += dt * 1.6;
      const tx = pl.x + Math.cos(v.a) * 70, ty = pl.y - 40 + Math.sin(v.a) * 40;
      v.x += (tx - v.x) * Math.min(1, dt * 5);
      v.y += (ty - v.y) * Math.min(1, dt * 5);
      const t = nearest(v.x, v.y, d.range);
      if (t && ready('valk', d.cd[i])) shoot(v.x, v.y, Math.atan2(t.y - v.y, t.x - v.x), d.dmg[i] * m.dmg, 1, 760, 4);
    }
  }

  function step(dt) {
    const pl = w.pl;
    const m = mult();
    const total = Math.max(1, g.state.endsAt - g.state.startedAt);
    const f = Math.max(0, Math.min(1, (now() - g.state.startedAt) / total));
    const lvl = w.lvl;
    // Lopen
    const k = AK.keyVector();
    let mx = k.x || stick.x, my = k.y || stick.y;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    if (ml > .05) {
      $('zm-tip').classList.add('weg');
      pl.step += dt * 10;
      if (Math.abs(mx) > .1) pl.face = mx > 0 ? 1 : -1;
    }
    pl.x += mx * W.PLAYER.sp * m.sp * dt;
    pl.y += my * W.PLAYER.sp * m.sp * dt;
    pl.hurt = Math.max(0, pl.hurt - dt);
    pl.hitT = Math.max(0, (pl.hitT || 0) - dt);

    // Nieuwe robots
    const wv = W.wave(f, lvl);
    w.spawn += wv.rate * dt;
    while (w.spawn >= 1) {
      w.spawn--;
      if (w.foes.length >= w.cap) { w.spawn = 0; break; }
      const p = edgePoint();
      spawn(pickType(wv.types), p.x, p.y, wv.hpMul);
    }
    // Af en toe een kring robots rondom
    const gameS = (now() - g.state.startedAt) / 1000;
    if (gameS > w.ringAt) {
      w.ringAt += 45;
      const n = Math.min(24, w.cap - w.foes.length);
      const d = Math.min(view.hw, view.hh) * .95 + 40;
      for (let i = 0; i < n; i++) spawn(f > .5 ? 'slijm' : 'kever', pl.x + Math.cos(i / n * 6.28) * d, pl.y + Math.sin(i / n * 6.28) * d, wv.hpMul);
      if (n > 0) toast('⚠️ Ze omsingelen je!');
    }
    // De Kolos
    if (!w.bossNext) w.bossNext = g.state.startedAt + total * W.BOSS_AT;
    if (!w.boss && now() >= w.bossNext && w.bossNext < g.state.endsAt) {
      w.bossN++;
      const p = edgePoint(-40);
      w.boss = spawn('kolos', p.x, p.y, (1 + lvl * .08) * (1 + (w.bossN - 1) * .6));
      w.bossCall = 6;
      w.bossNext = Infinity;
      banner('DE IJZEREN KOLOS!', 'Versla de eindbaas', 'gold');
      sfx.gong();
      buzz([100, 60, 100]);
    }

    buildGrid();
    // Robots bewegen naar de ridder
    for (const e of w.foes) {
      if (e.dead) continue;
      const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy) || 1;
      let vx = dx / d * e.sp, vy = dy / d * e.sp;
      e.ph += dt;
      if (e.kind === 'bij') { vx += -dy / d * Math.sin(e.ph * 6) * 70; vy += dx / d * Math.sin(e.ph * 6) * 70; }
      if (e.kind === 'drone') { vx += -dy / d * Math.sin(e.ph * 2.2) * 110; vy += dx / d * Math.sin(e.ph * 2.2) * 110; }
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      const fk = Math.max(0, 1 - 6 * dt);
      e.kx *= fk; e.ky *= fk;
      e.flash = Math.max(0, e.flash - dt);
      e.zt = Math.max(0, e.zt - dt);
      // Robots die te ver achterblijven, komen terug aan de rand.
      if (d > Math.hypot(view.hw, view.hh) * 1.9 && !e.boss) { const p = edgePoint(); e.x = p.x; e.y = p.y; }
      // Niet op elkaar staan
      near(e.x, e.y, e.r, o => {
        if (o === e) return;
        const ox = e.x - o.x, oy = e.y - o.y, rr = (e.r + o.r) * .8;
        const dd = ox * ox + oy * oy;
        if (dd >= rr * rr || dd === 0) return;
        const l = Math.sqrt(dd), push = (rr - l) * .5 / l;
        if (!e.boss) { e.x += ox * push; e.y += oy * push; }
        if (!o.boss) { o.x -= ox * push; o.y -= oy * push; }
      });
      // Raak: een hartje minder
      if (pl.hurt <= 0 && d < e.r * .85 + W.PLAYER.r) {
        pl.hp -= e.boss ? 2 : 1;
        pl.hurt = W.PLAYER.hurtS;
        pl.hitT = .25;
        w.shake = .3;
        sfx.hit();
        buzz(120);
        near(pl.x, pl.y, 150, o => { const ox = o.x - pl.x, oy = o.y - pl.y, l = Math.hypot(ox, oy) || 1; if (!o.boss) { o.kx += ox / l * 520; o.ky += oy / l * 520; } });
        if (pl.hp <= 0) {
          pl.hp = 0;
          socket.emit('zm-down');
          banner('GEVALLEN!', 'Beantwoord de vraag om weer recht te staan');
          setTimeout(() => ask('op'), 700);
          w.downAt = performance.now();
          return;
        }
      }
    }
    // De Kolos roept hulp
    if (w.boss && !w.boss.dead) {
      w.bossCall -= dt;
      if (w.bossCall <= 0) {
        w.bossCall = 6;
        for (let i = 0; i < 6 && w.foes.length < w.cap + 10; i++) spawn('kever', w.boss.x + Math.cos(i) * 90, w.boss.y + Math.sin(i) * 90, wv.hpMul);
      }
    }

    weapons(dt, m);

    // Pijlen
    for (const s of w.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0) continue;
      near(s.x, s.y, 30, e => {
        if (s.life <= 0 || s.hit.has(e)) return;
        const dx = e.x - s.x, dy = e.y - s.y;
        if (dx * dx + dy * dy > (e.r + 8) * (e.r + 8)) return;
        s.hit.add(e);
        hurtFoe(e, s.dmg, s.vx * .25, s.vy * .25);
        if (--s.pierce <= 0) s.life = 0;
      });
    }
    w.shots = w.shots.filter(s => s.life > 0);
    w.foes = w.foes.filter(e => !e.dead);

    // Kristallen
    let got = false;
    for (const gm of w.gems) {
      const dx = pl.x - gm.x, dy = pl.y - gm.y, d = Math.hypot(dx, dy);
      if (d < m.pick) gm.pull = true;
      if (gm.pull) {
        gm.sp = Math.min(900, gm.sp + 1600 * dt);
        gm.x += dx / (d || 1) * gm.sp * dt;
        gm.y += dy / (d || 1) * gm.sp * dt;
      }
      if (d < W.PLAYER.r + 10) {
        gm.v < 0 || (gm.done = true);
        if (gm.item === 8) { pl.hp = Math.min(pl.maxHp, pl.hp + 1); sfx.good(); fx.text(pl.x, pl.y - 40, '+❤️', '#ff4d6d', 22); }
        else { w.xp += gm.v; w.xpTotal += gm.v; got = true; }
      } else if (d > 2400) gm.done = true;
    }
    if (got && w.rand() < .3) sfx.marker();
    w.gems = w.gems.filter(gm => !gm.done);
    while (w.xp >= W.need(w.lvl + w.pending)) { w.xp -= W.need(w.lvl + w.pending); w.pending++; }

    // Beelden die vervagen
    for (const p of w.pulses) p.t += dt;
    w.pulses = w.pulses.filter(p => p.t < p.max);
    for (const b of w.bolts) b.t += dt;
    w.bolts = w.bolts.filter(b => b.t < .25);
  }

  // ---------- Meldingen ----------
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('zm-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('zm-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  // ---------- Tekenen ----------
  const canvas = $('zm-canvas');
  const ctx = canvas.getContext('2d');
  const byY = (a, b) => a.y - b.y;
  function draw(sec) {
    const { w: cw, h: ch, zoom } = view;
    const pl = w.pl;
    let camX = pl.x, camY = pl.y;
    if (w.shake > 0) { camX += (Math.random() - .5) * w.shake * 30; camY += (Math.random() - .5) * w.shake * 30; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ZmDraw.drawFloor(ctx, cw, ch, camX, camY, zoom);
    const sx = x => (x - camX) * zoom + cw / 2;
    const sy = y => (y - camY) * zoom + ch / 2;
    const vis = (x, y, m) => Math.abs(x - camX) < view.hw + m && Math.abs(y - camY) < view.hh + m;

    // Kristallen
    const gs = Math.round(20 * zoom);
    for (const gm of w.gems) {
      if (!vis(gm.x, gm.y, 30)) continue;
      const sp = ZmDraw.sprite(`item${gm.item}`, gm.item === 7 ? gs * 1.2 : gs);
      ctx.drawImage(sp, sx(gm.x) - sp.width / 2, sy(gm.y) - sp.height / 2 + Math.sin(sec * 4 + gm.x) * 2 * zoom);
    }
    // Schokgolven
    for (const p of w.pulses) {
      const k = p.t / p.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(2, 10 * zoom * (1 - k));
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * zoom * (.3 + .7 * k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Robots en de ridder, van boven naar onder
    w.foes.sort(byY);
    const shadow = ZmDraw.glowSprite('#000000');
    let drewMe = false;
    const drawMe = () => {
      drewMe = true;
      const s = 76 * zoom;
      ctx.globalAlpha = .5;
      ctx.drawImage(shadow, sx(pl.x) - s * .45, sy(pl.y) + s * .18, s * .9, s * .4);
      ctx.globalAlpha = pl.hurt > 0 && Math.floor(sec * 14) % 2 ? .35 : 1;
      const sp = ZmDraw.sprite('ridder', s, { color: g.color, flip: pl.face < 0 });
      const bob = Math.abs(Math.sin(pl.step)) * 3 * zoom;
      ctx.drawImage(sp, sx(pl.x) - sp.width / 2, sy(pl.y) - sp.height * .62 - bob);
      ctx.globalAlpha = 1;
    };
    for (const e of w.foes) {
      if (!drewMe && e.y > pl.y) drawMe();
      if (!vis(e.x, e.y, e.r * 2)) continue;
      const s = e.r * (e.boss ? 3 : 2.7) * zoom;
      const x = sx(e.x), y = sy(e.y);
      ctx.globalAlpha = .45;
      ctx.drawImage(shadow, x - s * .4, y + s * .12, s * .8, s * .32);
      ctx.globalAlpha = 1;
      const sp = ZmDraw.sprite(e.kind, s, { flip: e.x > pl.x, flash: e.flash > 0 });
      const hop = e.kind === 'bij' || e.kind === 'drone' ? Math.sin(e.ph * 8) * 3 * zoom - 6 * zoom : -Math.abs(Math.sin(e.ph * 7)) * 2 * zoom;
      ctx.drawImage(sp, x - sp.width / 2, y - sp.height * .6 + hop);
    }
    if (!drewMe) drawMe();

    // Zwaarden
    const b = w.build.w;
    if (b.zwaard) {
      const d = W.WEAPONS.zwaard, i = b.zwaard - 1;
      const sp = ZmDraw.sprite('item0', 44 * zoom);
      for (let k = 0; k < d.n[i]; k++) {
        const a = w.swordA + k / d.n[i] * Math.PI * 2;
        const x = sx(pl.x + Math.cos(a) * d.rad[i]), y = sy(pl.y + Math.sin(a) * d.rad[i]);
        ZmDraw.glow(ctx, x, y, 26 * zoom, '#5ee7ff', .35);
        ctx.setTransform(1, 0, 0, 1, x, y);
        ctx.rotate(a);
        ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // Valk
    if (b.valk) {
      const sp = ZmDraw.sprite('item4', 40 * zoom, { flip: Math.cos(w.valk.a) > 0 });
      ctx.drawImage(sp, sx(w.valk.x) - sp.width / 2, sy(w.valk.y) - sp.height / 2 + Math.sin(sec * 9) * 2 * zoom);
    }
    // Pijlen
    const ps = ZmDraw.sprite('item1', 30 * zoom);
    for (const s of w.shots) {
      const x = sx(s.x), y = sy(s.y);
      if (s.kind === 4) { ZmDraw.glow(ctx, x, y, 9 * zoom, '#7fd8ff'); continue; }
      ctx.setTransform(1, 0, 0, 1, x, y);
      ctx.rotate(s.a);
      ctx.drawImage(ps, -ps.width / 2, -ps.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Bliksem
    if (w.bolts.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const bt of w.bolts) {
        const k = 1 - bt.t / .25;
        const x = sx(bt.x), y = sy(bt.y);
        ctx.strokeStyle = `rgba(255,236,120,${k})`;
        ctx.lineWidth = 4 * zoom * k + 1;
        ctx.beginPath();
        let px = x + 20 * zoom, py = y - 320 * zoom;
        ctx.moveTo(px, py);
        for (let j = 1; j <= 6; j++) {
          px = x + (j < 6 ? (Math.sin(bt.seed + j * 2.1) * 26) * zoom : 0);
          py = y - 320 * zoom + j * 320 * zoom / 6;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ZmDraw.glow(ctx, x, y, 60 * zoom, '#ffe066', k * .8);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Vonken
    ctx.setTransform(zoom, 0, 0, zoom, cw / 2 - camX * zoom, ch / 2 - camY * zoom);
    fx.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // De Kolos: levensbalk bovenaan en een pijl als hij buiten beeld is
    if (w.boss && !w.boss.dead) {
      const e = w.boss;
      const bw = Math.min(cw * .6, 520 * zoom), bx = (cw - bw) / 2, by = 14 * zoom;
      ctx.fillStyle = 'rgba(6,8,20,.75)';
      ctx.fillRect(bx - 3, by - 3, bw + 6, 18 * zoom + 6);
      ctx.fillStyle = '#ff6a2a';
      ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.max), 18 * zoom);
      ctx.font = `800 ${Math.round(13 * zoom)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('DE IJZEREN KOLOS', cw / 2, by + 9 * zoom);
      if (!vis(e.x, e.y, -40)) {
        const a = Math.atan2(e.y - pl.y, e.x - pl.x);
        const r = Math.min(cw, ch) * .42;
        ctx.setTransform(1, 0, 0, 1, cw / 2 + Math.cos(a) * r, ch / 2 + Math.sin(a) * r);
        ctx.rotate(a);
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath(); ctx.moveTo(18 * zoom, 0); ctx.lineTo(-10 * zoom, -12 * zoom); ctx.lineTo(-10 * zoom, 12 * zoom); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // Rode rand bij weinig hartjes
    if (pl.hp === 1 || pl.hitT > 0) {
      const k = pl.hitT > 0 ? pl.hitT * 2 : .22 + .12 * Math.sin(sec * 6);
      const gr = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .35, cw / 2, ch / 2, Math.max(cw, ch) * .7);
      gr.addColorStop(0, 'rgba(255,40,60,0)');
      gr.addColorStop(1, `rgba(255,40,60,${k})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  // ---------- Elke frame ----------
  let last = performance.now();
  let avg = 16;
  function frame(t) {
    requestAnimationFrame(frame);
    const rdt = (t - last) / 1000;
    const dt = Math.min(.05, rdt);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('zm-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    setText('zm-clock', AK.clock(left));
    $('zm-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('zm-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) setText('zm-countdown', Math.ceil(wait / 1000));

    const fit = AK.fit(canvas, 1.25);
    const zoom = Math.max(.5, Math.min(fit.w, fit.h) / 580);
    view = { w: fit.w, h: fit.h, zoom, hw: fit.w / zoom / 2, hh: fit.h / zoom / 2 };

    // Trage toestellen: minder robots tegelijk.
    if (rdt < .2) avg += (rdt * 1000 - avg) * .05;
    w.cap = avg > 40 ? 80 : avg > 30 ? 110 : W.MAX_ALIVE;

    const frozen = quiz.open || cardsOpen || w.pl.hp <= 0 || wait > 0;
    if (!frozen) {
      step(dt);
      fx.update(dt);
      w.shake = Math.max(0, w.shake - dt);
    }
    // Een vraag die wacht: balk vol, of opnieuw na sluiten zonder antwoord.
    if (!quiz.open && !cardsOpen && t > w.askAgain && wait <= 0) {
      if (w.pl.hp <= 0 && t - (w.downAt || 0) > 700) ask('op');
      else if (w.pl.hp > 0 && w.pending > 0) ask('lvl');
    }
    draw(t / 1000);

    // Stand naar de server (voor het bord)
    if (t - w.statAt > 600) {
      w.statAt = t;
      socket.emit('zm-stat', { kills: w.kills, xp: w.xpTotal, hp: w.pl.hp, maxHp: w.pl.maxHp, alive: w.foes.length, boss: w.boss ? 1 : 0, w: W.code(w.build) });
    }

    // HUD
    setText('zm-lvl', `⭐ ${w.lvl + 1}`);
    setText('zm-kills', `🤖 ${w.kills}`);
    setText('zm-hearts', '❤️'.repeat(Math.max(0, w.pl.hp)) + '🖤'.repeat(Math.max(0, w.pl.maxHp - w.pl.hp)));
    const xk = Math.min(1, w.pending ? 1 : w.xp / W.need(w.lvl));
    const xs = `${Math.round(xk * 100)}%`;
    if (shown.xp !== xs) { shown.xp = xs; $('zm-xp').firstChild.style.width = xs; $('zm-xp').classList.toggle('vol', xk >= 1); }
  }
  requestAnimationFrame(frame);
})();
