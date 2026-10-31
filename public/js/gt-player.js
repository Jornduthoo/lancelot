// Gauntlet op de gsm of Chromebook: kies je klasse, vecht je met je ploeg door de kerker en geneest je ploeg met goede antwoorden.
// Je eigen ridder beweegt meteen (geen wachten op de server); de anderen tekenen we vloeiend tussen twee berichten in.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, GtWorld en GtDraw.
(() => {
  const { T, R, CLASSES, CLASS_IDS } = GtWorld;
  const root = document.createElement('div');
  root.id = 'gauntlet';
  root.innerHTML = `
  <form id="gt-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Gauntlet</p>
    <input id="gt-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="gt-join-error"></p>
    <button type="submit" class="big">De kerker in</button>
  </form>
  <section id="gt-lobby" class="screen panel hidden">
    <p class="status">Gauntlet</p>
    <p class="title" id="gt-lobby-name"></p>
    <p>Kies je klasse. Bij de start maakt LANcelot ploegen van vier, met zoveel mogelijk verschillende klassen.</p>
    <div class="gt-classes" id="gt-classes"></div>
    <p class="muted small">Je levenspunten lopen langzaam weg. <strong>Een goed antwoord geneest je hele ploeg</strong> en laadt je speciale kracht ✨. Een fout antwoord? Even wachten, en die vraag komt later terug.</p>
    <p class="muted small ls-hint-touch">Duim links om te lopen. Rechts: ⚔ aanvallen (ingedrukt houden), ✨ kracht en ⚡ vraag.</p>
    <p class="muted small ls-hint-keys">Lopen met pijltjes, ZQSD of WASD. Spatie aanvallen (ingedrukt houden), F kracht, E vraag, 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="gt-game" class="ak-game hidden">
    <div class="ls-hud ak-hud">
      <div class="ak-hp"><i id="gt-hp-fill"></i><span id="gt-hp-text"></span></div>
      <div class="ak-charges" id="gt-charges"></div>
      <div class="ak-chip" id="gt-level"></div>
      <div class="ak-chip gold" id="gt-gold"></div>
      <div class="ls-clock" id="gt-clock"></div>
    </div>
    <div class="ls-stage" id="gt-stage">
      <canvas id="gt-canvas"></canvas>
      <div class="ak-team" id="gt-team"></div>
      <div class="ls-feed" id="gt-feed"></div>
      <div class="ls-banner" id="gt-banner"></div>
      <div class="tw-toast" id="gt-toast"></div>
      <div class="tw-countdown hidden" id="gt-countdown"></div>
      <div class="ak-touch">
        <button class="ls-btn ak-ask" id="gt-ask">⚡<small>Vraag</small></button>
        <button class="ls-btn ak-special" id="gt-special">✨<small>Kracht</small></button>
        <button class="ls-btn ak-attack" id="gt-attack">⚔<small>Aanval</small></button>
      </div>
      <p class="ls-keys">pijltjes/ZQSD lopen · spatie aanvallen · F kracht · E vraag · 1-4 antwoorden</p>
      <div class="ls-out hidden" id="gt-out">
        <p class="ls-out-title" id="gt-out-title">Geveld!</p>
        <p class="ls-out-by" id="gt-out-text">Beantwoord een vraag juist om terug te komen.</p>
        <button class="gold" id="gt-out-ask">⚡ Vraag om terug te komen</button>
      </div>
    </div>
  </section>
  <section id="gt-end" class="screen panel hidden">
    <div class="mark" id="gt-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="gt-end-title"></p>
    <p class="big" id="gt-end-score" style="font-size:1.6rem"></p>
    <p id="gt-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, scene: new GtDraw.Scene(), me: null,
    x: 0, y: 0, a: 0, fix: 0, sentAt: 0, sentX: 0, sentY: 0, attacking: false, lastAttack: 0, seq: 1,
    roster: new Map(), moving: false,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.gt === '1';
  const show = name => { for (const s of ['gt-join', 'gt-lobby', 'gt-game', 'gt-end']) $(s).classList.toggle('hidden', s !== name); };

  // ---------- Aanmelden en klasse kiezen ----------
  function join(name) {
    socket.emit('gt-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('gt-join-error').textContent = res.error;
        show('gt-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('gt-join-error').textContent = '';
    });
  }
  $('gt-join').addEventListener('submit', e => { e.preventDefault(); join($('gt-name').value); });

  $('gt-classes').innerHTML = CLASS_IDS.map(id => {
    const c = CLASSES[id];
    return `<button type="button" class="gt-class" data-cls="${id}" style="--cls:${c.color}">
      <canvas width="120" height="120"></canvas><strong>${c.icon} ${c.name}</strong><span>${c.text}</span><em>${c.special.icon} ${c.special.name}: ${c.special.text}</em><b class="gt-count"></b></button>`;
  }).join('');
  for (const b of document.querySelectorAll('.gt-class')) {
    b.addEventListener('click', () => {
      sfx.unlock();
      sfx.tick();
      socket.emit('gt-class', b.dataset.cls, res => { if (res && res.error) toast(res.error, 'bad'); });
    });
  }
  function paintClasses() {
    const t = performance.now() / 1000;
    for (const b of document.querySelectorAll('.gt-class')) {
      const c = b.querySelector('canvas');
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 120, 120);
      const cls = b.dataset.cls;
      AK.knight(ctx, 60, 64, -Math.PI / 2 + Math.sin(t * 1.5 + cls.length) * .4, { r: 30, color: CLASSES[cls].color, kind: cls, t, moving: true });
    }
  }

  socket.on('gt-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.gt = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.scene = new GtDraw.Scene();
      g.scene.onEvent = onEvent;
      quiz.close();
      delete $('gt-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('gt-name').value = saved || '';
        show('gt-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    const mine = s.roster.find(r => r.name === s.name);
    if (s.phase === 'lobby') {
      $('gt-lobby-name').textContent = s.name;
      for (const b of document.querySelectorAll('.gt-class')) {
        b.classList.toggle('on', mine && mine.cls === b.dataset.cls);
        const n = s.roster.filter(r => r.cls === b.dataset.cls).length;
        b.querySelector('.gt-count').textContent = n ? `${n} gekozen` : '';
      }
      show('gt-lobby');
    } else if (s.phase === 'play') {
      show('gt-game');
      $('gt-game').style.setProperty('--team', (s.teams[mine ? mine.team : 0] || {}).color || '#4cc9ff');
    } else if (s.phase === 'einde') {
      quiz.close();
      $('gt-out').classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      const team = s.teams[me.team] || {};
      $('gt-end-medal').textContent = medals[s.rank - 1] || '🗝️';
      $('gt-end-title').textContent = s.rank === 1 ? `${team.name || 'Je ploeg'} wint Gauntlet!` : `${team.name || 'Je ploeg'}: plek ${s.rank} van ${s.teams.length}`;
      $('gt-end-score').textContent = `Niveau ${me.level || 1} · ${me.gold || 0} goud`;
      $('gt-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.kills || 0} monsters verslagen`;
      if (!$('gt-end').dataset.done && s.rank === 1) confetti(4000);
      $('gt-end').dataset.done = '1';
      show('gt-end');
    }
  });

  socket.on('gt-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('gt-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('gt-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('gt-level', msg => {
    const first = !g.scene.d || g.scene.d.level !== msg.level;
    g.scene.level(msg);
    g.x = msg.x;
    g.y = msg.y;
    g.fix = msg.fix;
    if (first && msg.level > 1) banner(`NIVEAU ${msg.level}`, 'Dieper de kerker in…', 'big');
  });
  socket.on('gt-pos', msg => { g.x = msg.x; g.y = msg.y; g.fix = msg.fix; });

  socket.on('gt-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (g.me) g.scene.meN = g.me.n;
    g.scene.apply(msg);
    if (msg.me) setMe(msg.me);
    team(msg);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.scene.meN = me.n;
    if (old && me.down && !old.down) {
      sfx.hit();
      buzz(300);
      g.attacking = false;
      setTimeout(() => { if (g.me && g.me.down && !quiz.open) quiz.show(); }, 900);
    }
    if (old && !me.down && old.down) {
      sfx.power();
      banner('TERUG!', 'Je staat weer rechtop', 'gold');
    }
    $('gt-out').classList.toggle('hidden', !me.down || quiz.open);
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    const k = Math.max(0, me.hp / me.max);
    $('gt-hp-fill').style.width = `${k * 100}%`;
    $('gt-hp-fill').className = k < .25 ? 'low' : k < .5 ? 'mid' : '';
    $('gt-hp-text').textContent = me.down ? 'GEVELD' : `${me.hp} ❤`;
    $('gt-charges').innerHTML = Array.from({ length: me.maxCharges }, (_, i) => `<i class="${i < me.charges ? 'on' : ''}">✨</i>`).join('');
    $('gt-level').textContent = `Niveau ${me.level}`;
    $('gt-gold').textContent = `${me.gold} 💰`;
    $('gt-special').classList.toggle('ready', me.charges > 0 && !me.down);
    $('gt-game').classList.toggle('low', k < .3 && !me.down);
  }

  // De andere ridders van je ploeg, met hun levenspunten.
  let teamKey = '';
  function team(msg) {
    const rows = msg.k.filter(k => !g.me || k[0] !== g.me.n).map(k => {
      const r = g.roster.get(k[0]) || {};
      const c = CLASSES[r.cls] || CLASSES.paladijn;
      return `<div class="${k[5] & 1 ? 'down' : ''}"><span>${c.icon} ${AK.esc(r.name || '')}</span><i style="width:${k[4]}%"></i></div>`;
    }).join('');
    if (rows !== teamKey) { teamKey = rows; $('gt-team').innerHTML = rows; }
  }

  function onEvent(e) {
    const me = g.me;
    if (e[0] === 'boem') sfx.boom();
    else if (e[0] === 'poort') { sfx.boom(); toast('Poort vernietigd!', 'gold'); }
    else if (e[0] === 'au' && me && e[1] === me.n) { sfx.hit(); buzz(60); }
    else if (e[0] === 'uit') { sfx.fanfare(); banner('UITGANG!', `Niveau ${e[1]} gehaald`, 'big'); }
    else if (e[0] === 'wipe') { sfx.bad(); banner('PLOEG GEVELD', 'Jullie beginnen dit niveau opnieuw', ''); }
    else if (e[0] === 'heal' && me && e[1] !== me.n) {
      const r = g.roster.get(e[1]);
      if (r) feedLine(`💚 ${r.name} geneest de ploeg (+${e[2]})`);
    } else if (e[0] === 'val' && me && e[1] !== me.n) {
      const r = g.roster.get(e[1]);
      if (r) feedLine(`💀 ${r.name} is geveld: vraag om terug te komen`, true);
    } else if (e[0] === 'nova' || e[0] === 'regen' || e[0] === 'schild' || e[0] === 'toren') sfx.power();
  }

  function feedLine(text, bad) {
    const box = $('gt-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${bad ? ' bad' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('gt-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('gt-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------- Vragen ----------
  const quiz = AK.quiz({
    root: $('gt-game'),
    closeText: 'Terug de kerker in',
    status: res => (res.down ? 'Juist = je komt terug in het spel' : `Juist = je ploeg geneest en jij krijgt ✨ (${res.charges}/${res.max}) · je bent beschermd`),
    ask: cb => socket.emit('gt-question', null, cb),
    answer: (i, cb) => socket.emit('gt-answer', i, cb),
    good: res => (res.revived ? 'Juist! Je bent terug!' : `Juist! Je ploeg +${res.healed} ❤ · +1 ✨${res.streak && res.streak % 3 === 0 ? ' · 3 op rij: dubbel genezen!' : ''}`),
    bad: () => 'Helaas! Kijk naar het juiste antwoord.',
    next: res => !res.revived,
    close: () => {
      socket.emit('gt-asking', false);
      if (g.me) $('gt-out').classList.toggle('hidden', !g.me.down);
    },
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play' || now() < g.state.startedAt) return;
    g.attacking = false;
    stick.reset();
    $('gt-out').classList.add('hidden');
    quiz.show();
  }

  // ---------- Besturing ----------
  const stage = $('gt-stage');
  const stick = AK.stick(stage);
  AK.holdButton($('gt-attack'), v => { g.attacking = v; if (v) attack(); });
  $('gt-special').addEventListener('click', e => { e.currentTarget.blur(); special(); });
  $('gt-ask').addEventListener('click', e => { e.currentTarget.blur(); ask(); });
  $('gt-out-ask').addEventListener('click', () => ask());

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('gt-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key)) e.preventDefault();
    if (e.key === ' ') { e.preventDefault(); g.attacking = true; if (!e.repeat) attack(); }
    const k = e.key.toLowerCase();
    if ((k === 'f' || k === 'shift') && !e.repeat) special();
    if (k === 'e' || e.key === 'Enter') ask();
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') g.attacking = false; });

  function canAct() {
    return g.me && !g.me.down && !quiz.open && g.state && g.state.phase === 'play' && now() >= g.state.startedAt
      && !(g.scene.info.nx > 0) && !(g.scene.info.wp > 0);
  }

  // Richten gaat vanzelf: op het dichtstbijzijnde monster of de dichtstbijzijnde poort die je kan zien.
  function aim(range) {
    const s = g.scene;
    let best = range, a = null;
    const t = performance.now();
    const look = (x, y, r) => {
      const dist = Math.hypot(x - g.x, y - g.y) - r;
      if (dist < best && GtWorld.clear(s.d, g.x, g.y, x, y)) { best = dist; a = Math.atan2(y - g.y, x - g.x); }
    };
    for (const id of s.monsters.ids()) { const m = s.monsters.get(id, t); if (m) look(m[0], m[1], 16); }
    s.d.poorten.forEach((q, i) => { if ((s.poorten[i] ?? 100) > 0) look(q.x, q.y, 26); });
    return a;
  }

  function attack() {
    if (!canAct()) return;
    const c = CLASSES[g.me.cls];
    const t = performance.now();
    if (t - g.lastAttack < c.cd) return;
    g.lastAttack = t;
    const at = c.attack;
    const target = aim(at.kind === 'slag' ? 120 : at.speed * at.life * .95);
    const a = target === null ? g.a : target;
    g.a = a;
    const seq = g.seq++;
    if (at.kind === 'slag') {
      g.scene.swings.set(g.me.n, { t, a });
      sfx.swoosh();
    } else {
      g.scene.local.set(seq, { kind: at.kind, x: g.x + Math.cos(a) * (R + 4), y: g.y + Math.sin(a) * (R + 4), vx: Math.cos(a) * at.speed, vy: Math.sin(a) * at.speed, life: at.life });
      sfx.laser();
    }
    socket.emit('gt-attack', { a, seq });
  }

  function special() {
    if (!canAct()) return;
    if (g.me.charges <= 0) {
      sfx.empty();
      toast('Geen ✨! Beantwoord een vraag', 'bad');
      return;
    }
    socket.emit('gt-special', null, res => {
      if (res && res.error) toast(res.error, 'bad');
      else banner(CLASSES[g.me.cls].special.name.toUpperCase(), '', 'gold');
    });
  }

  // ---------- Elke frame: bewegen en tekenen ----------
  const canvas = $('gt-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  let lastClasses = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state) return;
    if (g.state.phase === 'lobby' && t - lastClasses > 60) { lastClasses = t; paintClasses(); }
    if (g.state.phase !== 'play' || $('gt-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('gt-clock').textContent = AK.clock(left);
    $('gt-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('gt-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('gt-countdown').textContent = Math.ceil(wait / 1000);
    const s = g.scene;
    if (!s.d || !g.me) return;
    // Bewegen
    let v = stick.active ? { x: stick.x, y: stick.y } : AK.keyVector();
    if (!canAct()) v = { x: 0, y: 0 };
    const speed = CLASSES[g.me.cls].speed;
    g.moving = Math.hypot(v.x, v.y) > .05;
    if (g.moving) {
      const res = GtWorld.slide(s.d, g.x, g.y, v.x * speed * dt, v.y * speed * dt, R);
      g.x = res.x;
      g.y = res.y;
      if (!g.attacking) g.a = Math.atan2(v.y, v.x);
    }
    if (g.attacking) attack();
    if (t - g.sentAt > 50 && (Math.abs(g.x - g.sentX) > .5 || Math.abs(g.y - g.sentY) > .5 || t - g.sentAt > 300)) {
      g.sentAt = t;
      g.sentX = g.x;
      g.sentY = g.y;
      socket.emit('gt-move', { x: Math.round(g.x), y: Math.round(g.y), a: +g.a.toFixed(2), fix: g.fix });
    }
    s.update(dt);
    // Tekenen
    const { w, h, dpr } = AK.fit(canvas, 1.25);
    const zoom = Math.max(.7 * dpr, Math.min(1.5 * dpr, Math.min(w, h) / (T * 8.5)));
    GtDraw.render(ctx, s, { x: g.x, y: g.y, zoom, w, h }, {
      roster: g.roster, local: { n: g.me.n, x: g.x, y: g.y, a: g.a }, light: .8,
    });
    // Een pijl naar de uitgang als die buiten beeld is
    const ex = s.d.exit;
    const dx = (ex.x - g.x) * zoom, dy = (ex.y - g.y) * zoom;
    if (Math.abs(dx) > w / 2 - 20 || Math.abs(dy) > h / 2 - 20) {
      const a = Math.atan2(dy, dx);
      const rad = Math.min(w, h) / 2 - 34 * dpr;
      ctx.save();
      ctx.translate(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,201,74,.9)';
      ctx.shadowColor = '#ffc94a';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(16 * dpr, 0);
      ctx.lineTo(-8 * dpr, -10 * dpr);
      ctx.lineTo(-8 * dpr, 10 * dpr);
      ctx.fill();
      ctx.restore();
    }
    const mw = Math.min(w * .28, 170 * dpr);
    GtDraw.minimap(ctx, s, w - mw - 10 * dpr, 10 * dpr, mw, mw * s.d.H / s.d.W, g.me.n);
    // Overgang naar het volgende niveau of na een geveelde ploeg
    if (s.info.nx > 0 || s.info.wp > 0) {
      ctx.fillStyle = s.info.nx > 0 ? 'rgba(255,201,74,.18)' : 'rgba(255,0,40,.22)';
      ctx.fillRect(0, 0, w, h);
    }
  }
  g.scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
