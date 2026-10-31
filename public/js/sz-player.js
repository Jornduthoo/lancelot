// Splijtzwaard op de Chromebook of gsm: laat je zwaard salto's maken, splijt alles op je weg en steek vast in hout.
// De hele baan draait hier (geen vertraging); de server krijgt je plek, de runenpalen en wat je spleet, en geeft de vragen.
// Chromebook: spatie, ↑ of klik = salto, 1-4 antwoorden. Gsm: tik waar je wil op het scherm.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, SzWorld en SzDraw.
(() => {
  const W = SzWorld;
  const root = document.createElement('div');
  root.id = 'zwaard';
  root.innerHTML = `
  <form id="sz-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Splijtzwaard</p>
    <input id="sz-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="sz-join-error"></p>
    <button type="submit" class="big">Naar de eerste runenpaal</button>
  </form>
  <section id="sz-lobby" class="screen panel hidden">
    <p class="status">Splijtzwaard</p>
    <canvas id="sz-lobby-sword" width="200" height="70"></canvas>
    <p class="title" id="sz-lobby-name"></p>
    <p><strong>Tik</strong> en je zwaard maakt een salto. Met de <strong>kling</strong> splijt je kristallen, tonnen, pompoenen en robots. Komt de <strong>punt</strong> in het hout, dan blijft je zwaard steken. Het heft en staal botsen terug.</p>
    <p><strong>Elke runenpaal is een vraag.</strong> Juist: ✨ gouden kling (verder en hoger springen, zaagbladen en lasers doen niets en dubbele punten).</p>
    <p><strong>🎯 Op elke runenpaal ligt een doelschijf.</strong> Steek je punt in het midden: alles wat je die etappe verdiende telt tot ×10.</p>
    <p class="muted small">Tik zo vaak je wil: in de lucht wordt elke salto wel een kleiner sprongetje. Punten krijg je voor vaststeken in hout en voor alles wat je splijt. Val je in de lava, dan begin je opnieuw bij de laatste runenpaal.</p>
    <p class="muted small ls-hint-touch">Tik waar je wil op het scherm = salto.</p>
    <p class="muted small ls-hint-keys">Spatie, ↑ of klikken = salto · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="sz-game" class="ak-game hidden">
    <div class="ls-hud ak-hud sz-hud">
      <div class="sv-mass" id="sz-score">0</div>
      <div class="px-chip" id="sz-flags">🗿 0</div>
      <div class="px-chip" id="sz-sliced">⚔️ 0</div>
      <div class="px-chip sz-buit" id="sz-buit" title="Buit van deze etappe: steek in het midden van de doelschijf voor tot ×10">🎯 0</div>
      <div class="sz-gold hidden" id="sz-gold"><i></i></div>
      <div class="ry-alive" id="sz-rank"></div>
      <div class="ls-clock" id="sz-clock"></div>
    </div>
    <div class="ls-stage sz-stage" id="sz-stage">
      <canvas id="sz-canvas"></canvas>
      <div class="ls-feed" id="sz-feed"></div>
      <div class="ls-banner" id="sz-banner"></div>
      <div class="tw-toast" id="sz-toast"></div>
      <div class="tw-countdown hidden" id="sz-countdown"></div>
      <div class="sz-tik ls-hint-touch" id="sz-tik">Tik = salto</div>
    </div>
  </section>
  <section id="sz-end" class="screen panel hidden">
    <div class="mark" id="sz-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="sz-end-title"></p>
    <p class="big" id="sz-end-score" style="font-size:1.6rem"></p>
    <p id="sz-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const fresh = () => ({ ...W.spawnOf(0), vx: 0, vy: 0, w: 0, stuck: true, air: 1, gold: 0, rust: 0, dead: 0, safe: 0 });
  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '', color: '#4cc9ff',
    pl: fresh(), stage: 0, stageT: 0, hide: new Set(), flagBusy: false, sentAt: 0, others: new AK.Interp(110), cam: null,
    pieces: [], trail: [], sliced: 0, combo: 0, comboT: 0, shake: 0, buit: 0, ring: 1, slow: 0, tier: 0,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.sz === '1';
  const show = name => { for (const s of ['sz-join', 'sz-lobby', 'sz-game', 'sz-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('sz-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('sz-join-error').textContent = res.error;
        show('sz-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('sz-join-error').textContent = '';
    });
  }
  $('sz-join').addEventListener('submit', e => { e.preventDefault(); join($('sz-name').value); });

  function respawn(k) {
    Object.assign(g.pl, W.spawnOf(k), { vx: 0, vy: 0, w: 0, stuck: true, air: 1, dead: 0, safe: 1.2, rest: 0, free: 0, nx: 0 });
    g.trail = [];
    g.cam = null;
  }

  socket.on('sz-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.sz = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
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
      g.pieces = [];
      g.trail = [];
      g.sliced = 0;
      g.lastStick = 0;
      g.buit = 0;
      g.tier = 0;
      quiz.close();
      delete $('sz-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('sz-name').value = saved || '';
        show('sz-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    // Terug na herladen: verder vanaf de laatste runenpaal die de server kent.
    if (Array.isArray(s.cellIds)) for (const id of s.cellIds) g.hide.add(id);
    if (s.phase === 'play' && Number.isInteger(s.stage) && s.stage > g.stage) {
      g.stage = s.stage;
      respawn(g.stage);
    }
    if (s.phase === 'lobby') {
      $('sz-lobby-name').textContent = s.name;
      const lc = $('sz-lobby-sword').getContext('2d');
      lc.clearRect(0, 0, 200, 70);
      const spr = SzDraw.swordSprite(g.color, false);
      const k = 190 / spr.width;
      lc.drawImage(spr, 5, 35 - spr.height * k / 2, spr.width * k, spr.height * k);
      show('sz-lobby');
    } else if (s.phase === 'play') {
      show('sz-game');
      $('sz-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('sz-end-medal').textContent = medals[me.rank - 1] || '⚔️';
      $('sz-end-title').textContent = me.rank === 1 ? 'Jij bent de beste zwaardmeester!' : `Plek ${me.rank} van ${me.players}`;
      $('sz-end-score').textContent = `${me.score || 0} punten`;
      $('sz-end-stats').textContent = `${me.stage || 0} ${me.stage === 1 ? 'runenpaal' : 'runenpalen'} · ${me.cells || 0} gespleten · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('sz-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('sz-end').dataset.done = '1';
      show('sz-end');
    }
  });

  socket.on('sz-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('sz-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('sz-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('sz-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const t = performance.now();
    for (const [n, x, y, a, f, st] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.others.get(n);
      g.others.push(n, [x, y, a, f, st], t);
      if (before && st > before[4] && Math.abs(st - g.stage) <= 1) feedLine(`🗿 ${nameOf(n)} haalt runenpaal ${st}`);
    }
    g.others.prune(t, 800);
  });

  function setMe(me) {
    g.me = me;
    // Je zwaard groeit mee met je punten.
    const tier = W.tierOf(me.score || 0);
    if (tier > g.tier && g.state && g.state.phase === 'play') {
      g.tier = tier;
      const T = W.TIERS[tier];
      banner(`NIEUW ZWAARD!`, T.name, 'gold');
      sfx.fanfare();
      const p = toCss(g.pl.x, g.pl.y);
      fx.shock(p.x, p.y, 90, T.glow);
      fx.burst(p.x, p.y, { n: 40, color: T.glow, speed: 420, life: 1, size: 4 });
      g.slow = .4;
    } else g.tier = Math.max(g.tier, tier);
    $('sz-score').textContent = me.score;
    $('sz-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }

  // ---------- Vragen aan de runenpaal ----------
  const quiz = AK.quiz({
    root: $('sz-game'),
    closeText: 'Verder splijten',
    lock: 350,
    status: () => `Runenpaal ${g.stage} · juist = ✨ gouden kling`,
    ask: cb => socket.emit('sz-question', null, cb),
    answer: (i, cb) => socket.emit('sz-answer', i, res => {
      if (res && res.correct) {
        g.pl.gold = res.gold || W.GOLD_S;
        g.pl.rust = 0;
        sfx.power();
      } else if (res && !res.error) g.pl.rust = 5;
      cb(res);
    }),
    good: res => `Juist! ✨ Gouden kling: verder springen, zaag en laser doen niets en dubbele punten. +${res.points}`,
    bad: () => 'Helaas, je kling roest even. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('sz-asking', false);
      g.stageT = 0;
      g.pl.safe = Math.max(g.pl.safe, .6);
    },
  });

  function reachFlag(k, ring) {
    if (g.flagBusy) return;
    g.flagBusy = true;
    const secs = g.stageT;
    socket.emit('sz-flag', { k, ring }, res => {
      g.flagBusy = false;
      if (!res || res.error) {
        if (res && Number.isInteger(res.stage) && res.stage > g.stage) g.stage = res.stage;
        return;
      }
      g.stage = res.stage;
      g.buit = 0;
      sfx.go();
      buzz([30, 40, 30]);
      const tijd = (res.s || secs).toFixed(1).replace('.', ',');
      const p = toCss(...W.tipOf(g.pl));
      if (res.mult > 1) {
        // De doelschijf: hoe dichter bij het midden, hoe groter de vermenigvuldiger op je buit.
        const col = { 10: '#ffc94a', 5: '#c77dff', 3: '#4ade80', 2: '#4cc9ff' }[res.mult];
        fx.pop(p.x, p.y - 60, res.mult === 10 ? 'ROOS! ×10' : `×${res.mult}`, col, res.mult === 10 ? 52 : 40, 1.6);
        fx.shock(p.x, p.y, res.mult * 14 + 40, col);
        if (res.mult >= 5) { g.slow = res.mult === 10 ? .7 : .35; sfx.fanfare(); if (res.mult === 10) confetti(2000); } else sfx.power();
        banner(`RUNENPAAL ${res.stage} · ×${res.mult}`, `buit ×${res.mult} = +${res.buit} · ${tijd} s${res.record ? ' · ⏱️ record!' : ''}`, 'gold');
      } else banner(`RUNENPAAL ${res.stage}!`, `${tijd} s · +${res.points} · mik op het midden van de schijf voor ×10`, 'gold');
      fx.burst(p.x, p.y, { n: 26, color: '#ffc94a', speed: 380, life: .8, size: 4 });
      if (res.stage % 3 === 0) setTimeout(() => toast(`Welkom in de ${W.themeOf(res.stage).name}!`), 400);
      if (g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) {
        setTimeout(() => { if (g.state.phase === 'play') { socket.emit('sz-asking', true); quiz.show(); } }, 450);
      }
    });
  }

  // ---------- Besturing: één knop ----------
  function tik() {
    if (!playing() || quiz.open || g.pl.dead > 0) return;
    sfx.unlock();
    const pl = g.pl;
    const was = pl.stuck;
    if (!W.tap(pl)) { sfx.tick(true); return; }
    $('sz-tik').classList.add('weg');
    sfx.jump();
    if (was) {
      const p = toCss(...W.tipOf(pl));
      fx.burst(p.x, p.y + 6, { n: 6, color: '#c98a4e', speed: 160, life: .4, size: 2.5, glow: false });
    } else {
      const p = toCss(pl.x, pl.y);
      fx.ring(p.x, p.y, 26, pl.gold > 0 ? '#ffc94a' : '#5ee7ff', .3);
    }
  }
  const KEYS = new Set([' ', 'arrowup', 'w', 'z', 'enter']);
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('sz-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (!KEYS.has(e.key.toLowerCase())) return;
    e.preventDefault();
    if (!e.repeat) tik();
  });
  $('sz-stage').addEventListener('pointerdown', e => {
    if (e.target.closest('button, .ak-question')) return;
    e.preventDefault();
    tik();
  });
  $('sz-stage').addEventListener('contextmenu', e => e.preventDefault());

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('sz-game').classList.contains('hidden');
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('sz-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('sz-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('sz-banner');
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
  const OUCH = { lava: 'In de lava! Terug naar de runenpaal.', zaag: 'Het zaagblad! Terug naar de runenpaal.', laser: 'Geraakt door een laser! Terug naar de runenpaal.' };
  const PIECE = { kristal: '#d9a8ff', ton: '#c98a4e', pompoen: '#ff8c42', robot: '#ff4d6d' };

  function split(th, t) {
    g.hide.add(th.id);
    g.sliced++;
    const y = W.bob(th, t);
    const pl = g.pl;
    // Twee helften die uit elkaar vliegen, loodrecht op de snede.
    const cut = pl.a;
    const nx = -Math.sin(cut), ny = Math.cos(cut);
    for (const side of [1, -1]) {
      g.pieces.push({ kind: th.kind, x: th.x, y, vx: pl.vx * .4 + nx * side * 3, vy: ny * side * 3 - 4, rot: 0, vr: side * (3 + Math.random() * 3), cut, side, life: 1.1, gold: pl.gold > 0 });
    }
    if (g.pieces.length > 24) g.pieces.splice(0, g.pieces.length - 24);
    g.combo = g.comboT > 0 ? g.combo + 1 : 1;
    g.comboT = .9;
    const col = PIECE[th.kind] || '#fff';
    const p = toCss(th.x, y);
    fx.sparks(p.x, p.y, { n: 14, color: col, speed: 420 });
    // Wat eruit vliegt hangt af van wat je splijt.
    if (th.kind === 'ton') fx.burst(p.x, p.y, { n: 10, color: '#8a5a33', speed: 260, life: .7, size: 4, glow: false, up: 120 });
    else if (th.kind === 'robot') { fx.smoke(p.x, p.y, { n: 5, size: 12 }); fx.sparks(p.x, p.y, { n: 10, color: '#5ee7ff', speed: 300 }); }
    else if (th.kind === 'pompoen') fx.burst(p.x, p.y, { n: 12, color: '#ffe28a', speed: 240, life: .6, size: 2.5, up: 100 });
    else if (th.kind === 'kist') { fx.burst(p.x, p.y, { n: 30, color: '#ffc94a', speed: 420, life: 1, size: 4, up: 160 }); fx.shock(p.x, p.y, 70, '#ffc94a'); sfx.power(); }
    else fx.burst(p.x, p.y, { n: 10, color: col, speed: 240, life: .55, size: 3 });
    socket.emit('sz-snij', th.id, res => {
      if (!res || !res.points) return;
      g.buit += res.points;
      fx.text(p.x, p.y - 14, `+${res.points}`, res.points >= 40 ? '#ffc94a' : pl.gold > 0 ? '#ffc94a' : '#e8f1ff', res.points >= 40 ? 26 : 20);
      if (res.combo === 4 || res.combo === 8) { fx.pop(view.w / view.dpr / 2, view.h / view.dpr * .3, res.combo === 8 ? 'COMBO ×3!' : 'COMBO ×2!', '#ffc94a', 34, 1.1); sfx.power(); }
    });
    if (g.combo >= 3) g.slow = Math.max(g.slow, .08);
    sfx.snij(g.combo);
    buzz(15);
    g.shake = Math.min(.25, g.shake + .07);
  }

  // ---------- Elke frame ----------
  const canvas = $('sz-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 1, h: 1, S: 40, dpr: 1 };
  function toCss(x, y) {
    const c = g.cam || { x: g.pl.x, y: g.pl.y };
    return { x: ((x - c.x) * view.S + view.w / 2) / view.dpr, y: ((y - c.y) * view.S + view.h / 2) / view.dpr };
  }

  // De hoek die we tekenen: meestal de echte, maar na rechtop wippen draait hij er snel naartoe.
  function shownA(dt) {
    if (!(g.rechtT > 0)) return g.pl.a;
    g.rechtT -= dt;
    const k = 1 - Math.max(0, g.rechtT) / .14;
    const d = Math.atan2(Math.sin(g.pl.a - g.rechtVan), Math.cos(g.pl.a - g.rechtVan));
    return g.rechtVan + d * (1 - (1 - k) * (1 - k));
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    let dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('sz-game').classList.contains('hidden')) return;
    // Even vertraagd (een mooie snede, de roos): alles in het spel loopt dan trager.
    if (g.slow > 0) { g.slow -= dt; dt *= .3; }
    const left = g.state.endsAt - now();
    $('sz-clock').textContent = AK.clock(left);
    $('sz-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('sz-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('sz-countdown').textContent = Math.ceil(wait / 1000);
    const pl = g.pl;
    const time = gameTime();
    if (playing() && !quiz.open) {
      if (pl.dead > 0) {
        pl.dead -= dt;
        if (pl.dead <= 0) respawn(g.stage);
      } else {
        g.stageT += dt;
        pl.gold = Math.max(0, pl.gold - dt);
        pl.rust = Math.max(0, pl.rust - dt);
        pl.safe = Math.max(0, pl.safe - dt);
        g.comboT -= dt;
        const n = Math.ceil(dt / (1 / 120));
        let hit = null;
        for (let i = 0; i < n && !hit; i++) {
          const tt = time - dt + dt * (i + 1) / n;
          const voor = pl.a;
          const o = W.step(g.state.seed, pl, dt / n, tt);
          if (o.recht) { g.rechtVan = voor; g.rechtT = .14; } // even laten zien hoe het zwaard rechtop wipt
          if (o.dood && (pl.safe <= 0 || o.dood === 'lava')) hit = o.dood;
          if (o.vast) {
            const p = toCss(...W.tipOf(pl));
            fx.burst(p.x, p.y, { n: 8, color: '#e0b080', speed: 200, life: .4, size: 2.5, glow: false });
            fx.ring(p.x, p.y, 18, '#ffc94a', .25);
            sfx.dobbel(0);
            buzz(20);
            g.shake = Math.max(g.shake, .08);
            // Op de runenpaal: in welke ring van de doelschijf zit de punt?
            const k1 = g.stage + 1;
            g.ring = o.punt && o.op && o.op.paal && Math.abs(o.op.x + 4 - k1 * W.L) < 1 ? W.ringOf(W.tipOf(pl)[0] - W.targetX(k1)) : 1;
            // Punten voor vaststeken, alleen als je vooruit bent gekomen (zoals de server ook telt).
            if (o.punt && pl.x >= (g.lastStick || 0) + 1) {
              g.lastStick = pl.x;
              socket.emit('sz-vast', Math.round(pl.x * 100) / 100, res => { if (res && res.points) g.buit += res.points; });
              fx.text(p.x, p.y - 18, `+${W.POINTS.vast * (pl.gold > 0 ? 2 : 1)}`, '#ffc94a', 18);
            }
          }
          if (o.heft || o.bots) {
            const p = toCss(pl.x, pl.y);
            if (!g.clinkAt || t - g.clinkAt > 120) { sfx.marker(); g.clinkAt = t; fx.sparks(p.x, p.y, { n: 5, color: '#ffe08a', speed: 260 }); }
          }
          if (o.zaag && (!g.zaagAt || t - g.zaagAt > 300)) {
            g.zaagAt = t;
            const p = toCss(o.zaag.x, W.bob(o.zaag, tt));
            fx.sparks(p.x, p.y, { n: 16, color: '#ffc94a', speed: 420 });
            sfx.laser();
          }
          if (o.snij) for (const th of o.snij) if (!g.hide.has(th.id)) split(th, tt);
        }
        if (hit) {
          pl.dead = W.RESPAWN_S;
          const p = toCss(pl.x, pl.y);
          fx.burst(p.x, p.y, { n: 30, color: hit === 'lava' ? '#ff8c42' : '#ff4d6d', speed: 420, life: .7, size: 4 });
          fx.shock(p.x, p.y, 60, '#ffc94a');
          sfx.boom();
          buzz([120, 60, 120]);
          toast(OUCH[hit], 'bad');
          g.shake = .3;
          socket.emit('sz-fall');
        } else if (pl.stuck && pl.x >= (g.stage + 1) * W.L - 5) reachFlag(g.stage + 1, g.ring || 1);
      }
      if (t - g.sentAt > 100) {
        g.sentAt = t;
        socket.emit('sz-pos', {
          x: Math.round(pl.x * 100) / 100, y: Math.round(pl.y * 100) / 100, a: Math.round(pl.a * 100) / 100,
          f: (pl.stuck ? 1 : 0) | (pl.gold > 0 ? 4 : 0) | (pl.dead > 0 ? 8 : 0) | (pl.rust > 0 ? 32 : 0) | (g.tier << 6),
        });
      }
    }
    // Het spoor van de kling (alleen als het zwaard vliegt)
    const gx = pl.x + Math.cos(pl.a) * W.GUARD, gy = pl.y + Math.sin(pl.a) * W.GUARD;
    const [tx, ty] = W.tipOf(pl);
    if (!pl.stuck && pl.dead <= 0) { g.trail.push({ gx, gy, tx, ty, t: t / 1000 }); if (g.trail.length > 9) g.trail.shift(); } else if (g.trail.length) g.trail.shift();
    for (const p of g.pieces) { p.vy += 22 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt; }
    g.pieces = g.pieces.filter(p => p.life > 0 && p.y < W.LAVA + 1);

    // HUD
    const gold = $('sz-gold');
    gold.classList.toggle('hidden', !(pl.gold > 0));
    if (pl.gold > 0) gold.firstChild.style.width = `${Math.round(pl.gold / W.GOLD_S * 100)}%`;
    $('sz-flags').textContent = `🗿 ${g.stage}`;
    $('sz-sliced').textContent = `⚔️ ${g.sliced}`;
    $('sz-buit').textContent = `🎯 ${g.buit}`;

    // Camera en tekenen
    const fit = AK.fit(canvas, 1.5);
    const S = Math.min(fit.h / 11.5, fit.w / 12);
    view = { w: fit.w, h: fit.h, S, dpr: fit.dpr };
    const viewH = fit.h / S, viewW = fit.w / S;
    const wantX = pl.x + Math.min(3.5, viewW * .18);
    // De lava blijft altijd in beeld (onderaan), zodat je ziet waar het gevaar zit.
    const lo = viewH / 2 - 1.3, hi = W.H + 1.4 - viewH / 2;
    const wantY = lo > hi ? W.LAVA + 1 - viewH / 2 + Math.max(0, viewH - 15) * .5 : Math.max(lo, Math.min(hi, pl.y + .5));
    if (!g.cam) g.cam = { x: wantX, y: wantY };
    g.cam.x += (wantX - g.cam.x) * Math.min(1, dt * 4);
    g.cam.y += (wantY - g.cam.y) * Math.min(1, dt * 3);
    g.shake = Math.max(0, g.shake - dt);
    const sh = g.shake > 0 ? g.shake * .6 : 0;
    const ghosts = [];
    for (const n of g.others.ids()) {
      const v = g.others.get(n);
      const r = g.roster.get(n);
      if (!v || !r || (v[3] & 8)) continue;
      if (Math.abs(v[0] - pl.x) > viewW) continue;
      const near = Math.abs(v[0] - pl.x) < 2 && Math.abs(v[1] - pl.y) < 2;
      ghosts.push({ tier: (v[3] >> 6) & 7, x: v[0], y: v[1], a: v[2], gold: v[3] & 4, rust: v[3] & 32, color: r.color, alpha: near ? .2 : .42, name: near ? '' : r.name });
    }
    SzDraw.render(ctx, fit.w, fit.h, {
      seed: g.state.seed, t: time, now: t / 1000, cx: g.cam.x + (Math.random() - .5) * sh, cy: g.cam.y + (Math.random() - .5) * sh, S, ghosts, hide: g.hide, passed: g.stage,
      pieces: g.pieces, trail: g.trail,
      me: pl.dead > 0 ? null : { tier: g.tier, x: pl.x, y: pl.y, a: shownA(dt), gold: pl.gold > 0, rust: pl.rust > 0, color: g.color, blink: pl.safe > 0 && !pl.stuck },
    });
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
