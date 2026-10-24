// Ridder-Royale op de gsm of Chromebook: blijf in de cirkel, verdien munitie met vragen en wees de laatste ridder.
// Je eigen ridder beweegt meteen (geen wachten op de server); de anderen tekenen we vloeiend tussen twee berichten in.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, RyWorld en RyDraw.
(() => {
  const { R, SPEED, SLOW, LASER, SUPER } = RyWorld;
  const root = document.createElement('div');
  root.id = 'royale';
  root.innerHTML = `
  <form id="ry-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Ridder-Royale</p>
    <input id="ry-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="ry-join-error"></p>
    <button type="submit" class="big">De arena in</button>
  </form>
  <section id="ry-lobby" class="screen panel hidden">
    <p class="status">Ridder-Royale</p>
    <p class="title" id="ry-lobby-name"></p>
    <p>Iedereen in één arena, en de <strong>neonstorm</strong> wordt steeds kleiner. Blijf in de cirkel en wees de laatste ridder: dat is een 👑.</p>
    <p><strong>Munitie en een schild verdien je met goede antwoorden.</strong> Een fout antwoord kost geen leven, maar je bent even traag. Die vraag komt later terug.</p>
    <p class="muted small">Verstop je in de struiken om rustig te antwoorden. Uitgeschakeld? Kijk mee en verdien met vragen munitie voor de volgende ronde.</p>
    <p class="muted small ls-hint-touch">Duim links om te lopen. Rechts: 🔫 schieten (richt vanzelf), 💥 superschot en ⚡ vraag.</p>
    <p class="muted small ls-hint-keys">Lopen met pijltjes, ZQSD of WASD. Spatie schieten (richt vanzelf), F superschot, E vraag, 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="ry-game" class="ak-game hidden">
    <div class="ls-hud ak-hud">
      <div class="ak-hp"><i id="ry-hp-fill"></i><span id="ry-hp-text"></span></div>
      <div class="ry-ammo" id="ry-ammo"></div>
      <div class="ry-alive" id="ry-alive"></div>
      <div class="ry-zone" id="ry-zone"></div>
      <div class="ls-clock" id="ry-clock"></div>
    </div>
    <div class="ls-stage" id="ry-stage">
      <canvas id="ry-canvas"></canvas>
      <div class="ls-feed" id="ry-feed"></div>
      <div class="ls-banner" id="ry-banner"></div>
      <div class="tw-toast" id="ry-toast"></div>
      <div class="ry-slow hidden" id="ry-slow">❄ Traag</div>
      <div class="tw-countdown hidden" id="ry-countdown"></div>
      <div class="ak-touch">
        <button class="ls-btn ak-ask" id="ry-ask">⚡<small>Vraag</small></button>
        <button class="ls-btn ak-special" id="ry-super">💥<small>Super</small></button>
        <button class="ls-btn ak-attack" id="ry-fire">🔫<small>Schiet</small></button>
      </div>
      <p class="ls-keys">pijltjes/ZQSD lopen · spatie schieten · F superschot · E vraag · 1-4 antwoorden</p>
      <div class="ls-out hidden" id="ry-out">
        <p class="ls-out-title" id="ry-out-title">Uitgeschakeld!</p>
        <p class="ls-out-by" id="ry-out-text"></p>
        <p class="ls-out-timer" id="ry-out-bonus"></p>
        <button class="gold" id="ry-out-ask">⚡ Verdien munitie voor de volgende ronde</button>
      </div>
    </div>
  </section>
  <section id="ry-end" class="screen panel hidden">
    <div class="mark" id="ry-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="ry-end-title"></p>
    <p class="big" id="ry-end-score" style="font-size:1.6rem"></p>
    <p id="ry-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, scene: new RyDraw.Scene(), me: null,
    x: 0, y: 0, a: 0, fix: 0, sentAt: 0, sentX: 0, sentY: 0, firing: false, lastShot: 0, seq: 1, roster: new Map(), slowEnd: 0, cam: null,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.ry === '1';
  const show = name => { for (const s of ['ry-join', 'ry-lobby', 'ry-game', 'ry-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('ry-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('ry-join-error').textContent = res.error;
        show('ry-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('ry-join-error').textContent = '';
    });
  }
  $('ry-join').addEventListener('submit', e => { e.preventDefault(); join($('ry-name').value); });

  socket.on('ry-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.ry = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.scene = new RyDraw.Scene();
      g.scene.onEvent = onEvent;
      quiz.close();
      delete $('ry-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('ry-name').value = saved || '';
        show('ry-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('ry-lobby-name').textContent = s.name;
      show('ry-lobby');
    } else if (s.phase === 'play') {
      show('ry-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('ry-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
    } else if (s.phase === 'einde') {
      quiz.close();
      $('ry-out').classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      const me = s.me || {};
      $('ry-end-medal').textContent = medals[me.rank - 1] || '👑';
      $('ry-end-title').textContent = me.rank === 1 ? 'Jij bent de koning van de arena!' : `Plek ${me.rank} van ${me.players}`;
      $('ry-end-score').textContent = `${me.crowns || 0} 👑 · ${me.score || 0} punten`;
      $('ry-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.elims || 0} ridders uitgeschakeld`;
      if (!$('ry-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('ry-end').dataset.done = '1';
      show('ry-end');
    }
  });

  socket.on('ry-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('ry-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('ry-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('ry-round', msg => {
    g.scene.round(msg);
    g.scene.meN = g.me ? g.me.n : -1;
    if (msg.x !== undefined) {
      g.x = msg.x;
      g.y = msg.y;
      g.fix = msg.fix;
      g.a = Math.atan2(-msg.y, -msg.x);
    }
    g.cam = null;
    if (msg.round > 1 || msg.alive === false) {
      banner(`RONDE ${msg.round}`, msg.alive === false ? 'Je doet mee vanaf de volgende ronde' : 'Iedereen terug in de arena', 'big');
    }
  });
  socket.on('ry-pos', msg => { g.x = msg.x; g.y = msg.y; g.fix = msg.fix; });

  socket.on('ry-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (g.me) g.scene.meN = g.me.n;
    g.scene.apply(msg);
    if (msg.me) setMe(msg.me);
    $('ry-alive').textContent = `🛡 ${msg.al} over`;
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.scene.meN = me.n;
    g.slowEnd = me.slow ? performance.now() + me.slow : 0;
    if (old && old.alive && !me.alive) {
      sfx.hit();
      buzz(400);
      g.firing = false;
    }
    if (old && !old.alive && me.alive) { quiz.close(); stick.reset(); }
    if (old && me.crowns > old.crowns) {
      sfx.fanfare();
      confetti(3000);
      banner('👑 JIJ WINT!', 'De laatste ridder in de arena', 'big');
    }
    if (old && me.elims > old.elims) { sfx.boom(); banner('UITGESCHAKELD!', '+3 punten', 'gold'); }
    $('ry-out').classList.toggle('hidden', me.alive || quiz.open);
    $('ry-out-bonus').textContent = me.bonus ? `Al ${me.bonus} extra munitie voor de volgende ronde` : '';
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    const k = Math.max(0, me.hp / 100);
    $('ry-hp-fill').style.width = `${k * 100}%`;
    $('ry-hp-fill').className = k < .25 ? 'low' : k < .5 ? 'mid' : '';
    $('ry-hp-text').textContent = me.alive ? `${me.hp} ❤${me.shield ? ` · ${me.shield} 🛡` : ''}` : 'UIT';
    $('ry-ammo').textContent = `⚡ ${me.ammo}${me.supers ? ` · 💥${me.supers}` : ''}`;
    $('ry-ammo').classList.toggle('empty', me.ammo <= 0);
    $('ry-super').classList.toggle('ready', me.supers > 0 && me.alive);
    $('ry-game').classList.toggle('low', me.alive && me.ammo <= 0);
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'au' && e[1] === me.n) { if (!e[3]) { sfx.hit(); buzz(60); } }
    else if (e[0] === 'uit') {
      const who = g.roster.get(e[1]), by = g.roster.get(e[2]);
      if (e[1] === me.n) $('ry-out-text').textContent = by ? `door ${by.name}` : 'De storm heeft je te pakken';
      else if (who) feedLine(by ? `⚔️ ${by.name} schakelt ${who.name} uit` : `🌀 ${who.name} verdwijnt in de storm`, e[2] === me.n);
      if (e[1] !== me.n) sfx.boom();
    } else if (e[0] === 'ronde') {
      const win = g.roster.get(e[1]);
      if (e[1] !== me.n) banner(win ? `👑 ${win.name}` : 'DE STORM WINT', win ? 'wint deze ronde' : 'Niemand overleeft', '');
    } else if (e[0] === 'start') { sfx.go(); banner('VECHT!', 'Blijf in de cirkel', 'big'); }
    else if (e[0] === 'pak' && e[2] === me.n) sfx.marker();
    else if (e[0] === 'shot' && e[7] !== me.n) {
      const k = g.scene.knights.get(e[7]);
      if (k && Math.hypot(k[0] - g.x, k[1] - g.y) < 500) sfx.laser();
    }
  }

  function feedLine(text, mine) {
    const box = $('ry-feed');
    const line = document.createElement('div');
    line.className = `ls-feed-line${mine ? ' me' : ''}`;
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('ry-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('ry-banner');
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

  // ---------- Vragen ----------
  const quiz = AK.quiz({
    root: $('ry-game'),
    closeText: 'Terug de arena in',
    status: res => (res.alive ? `Juist = munitie en schild · je hebt ${res.ammo} ⚡ · je staat stil!` : `Juist = munitie voor de volgende ronde (${res.bonus}/10)`),
    ask: cb => socket.emit('ry-question', null, cb),
    answer: (i, cb) => socket.emit('ry-answer', i, cb),
    good: res => (res.alive ? `Juist! +${res.gained} ⚡${res.shield ? ` · +${res.shield} 🛡` : ''}${res.superShot ? ' · 💥 superschot!' : ''}` : `Juist! +${res.bonus} ⚡ voor de volgende ronde`),
    bad: res => (res.alive ? 'Helaas! Je bent even traag. Kijk naar het juiste antwoord.' : 'Helaas! Kijk naar het juiste antwoord.'),
    next: res => !res.alive || res.ammo < 12,
    close: () => {
      socket.emit('ry-asking', false);
      if (g.me) $('ry-out').classList.toggle('hidden', g.me.alive);
    },
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play') return;
    g.firing = false;
    stick.reset();
    $('ry-out').classList.add('hidden');
    quiz.show();
  }

  // ---------- Besturing ----------
  const stage = $('ry-stage');
  const stick = AK.stick(stage);
  AK.holdButton($('ry-fire'), v => { g.firing = v; if (v) fire(false); });
  $('ry-super').addEventListener('click', e => { e.currentTarget.blur(); fire(true); });
  $('ry-ask').addEventListener('click', e => { e.currentTarget.blur(); ask(); });
  $('ry-out-ask').addEventListener('click', () => ask());

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('ry-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key)) e.preventDefault();
    if (e.key === ' ') { e.preventDefault(); g.firing = true; if (!e.repeat) fire(false); }
    const k = e.key.toLowerCase();
    if (k === 'f' && !e.repeat) fire(true);
    if (k === 'e' || e.key === 'Enter') ask();
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') g.firing = false; });

  function fighting() {
    const s = g.scene;
    return g.me && g.me.alive && !quiz.open && s.state === 'strijd' && performance.now() >= s.roundStart;
  }

  // Richten gaat vanzelf: op de dichtstbijzijnde ridder die je kan zien.
  function aim() {
    const s = g.scene;
    const t = performance.now();
    let best = LASER.speed * LASER.life * .95, a = null;
    for (const id of s.knights.ids()) {
      if (id === g.me.n) continue;
      const k = s.knights.get(id, t);
      if (!k || (k[4] & 1) || !s.visible(id, k, { x: g.x, y: g.y }, t)) continue;
      const d = Math.hypot(k[0] - g.x, k[1] - g.y);
      if (d < best && RyWorld.clear(s.ar, g.x, g.y, k[0], k[1])) { best = d; a = Math.atan2(k[1] - g.y, k[0] - g.x); }
    }
    return a;
  }

  function fire(big) {
    if (!fighting()) return;
    const t = performance.now();
    if (t - g.lastShot < LASER.cd) return;
    if (big ? g.me.supers <= 0 : g.me.ammo <= 0) {
      if (t - g.lastShot > 600) {
        g.lastShot = t;
        sfx.empty();
        toast(big ? 'Geen superschot: 3 juist op rij!' : 'Geen munitie! Druk op ⚡ Vraag', 'bad');
      }
      return;
    }
    g.lastShot = t;
    const target = aim();
    const a = target === null ? g.a : target;
    g.a = a;
    const w = big ? SUPER : LASER;
    const seq = g.seq++;
    g.scene.local.set(seq, { x: g.x + Math.cos(a) * (R + 6), y: g.y + Math.sin(a) * (R + 6), vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.life, big });
    if (big) g.me.supers--; else g.me.ammo--;
    hud();
    sfx.laser();
    socket.emit('ry-fire', { a, seq, big }, res => {
      if (res && res.error) { g.scene.local.delete(seq); toast(res.error, 'bad'); }
    });
  }

  // ---------- Elke frame ----------
  const canvas = $('ry-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('ry-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('ry-clock').textContent = AK.clock(left);
    $('ry-clock').classList.toggle('low', left < 30000);
    const s = g.scene;
    if (!s.ar || !g.me) return;
    const wait = s.roundStart - t;
    $('ry-countdown').classList.toggle('hidden', !(wait > 0 && s.state === 'pauze'));
    if (wait > 0) $('ry-countdown').textContent = Math.ceil(wait / 1000);
    const zn = s.zone(t);
    if (zn) {
      const outside = Math.hypot(g.x - zn.x, g.y - zn.y) > zn.r;
      const el = $('ry-zone');
      el.textContent = s.state !== 'strijd' ? '' : outside ? '⚠ In de storm!' : zn.next > 0 ? `🌀 ${zn.shrinking ? 'krimpt nog' : 'krimpt over'} ${Math.ceil(zn.next)}s` : '🌀 laatste cirkel';
      el.classList.toggle('warn', outside && g.me.alive && s.state === 'strijd');
    }
    const slow = g.slowEnd > t;
    $('ry-slow').classList.toggle('hidden', !slow || !g.me.alive);
    $('ry-game').classList.toggle('slow', slow);
    // Bewegen
    const alive = g.me.alive;
    let v = stick.active ? { x: stick.x, y: stick.y } : AK.keyVector();
    if (!alive || quiz.open || (s.state === 'pauze' && t < s.roundStart)) v = { x: 0, y: 0 };
    const speed = SPEED * (slow ? SLOW : 1);
    if (Math.hypot(v.x, v.y) > .05) {
      const p = RyWorld.move(s.ar, g.x, g.y, v.x * speed * dt, v.y * speed * dt, R);
      g.x = p.x;
      g.y = p.y;
      if (!g.firing) g.a = Math.atan2(v.y, v.x);
    }
    if (g.firing) fire(false);
    if (alive && t - g.sentAt > 50 && (Math.abs(g.x - g.sentX) > .5 || Math.abs(g.y - g.sentY) > .5 || t - g.sentAt > 300)) {
      g.sentAt = t;
      g.sentX = g.x;
      g.sentY = g.y;
      socket.emit('ry-move', { x: Math.round(g.x), y: Math.round(g.y), a: +g.a.toFixed(2), fix: g.fix });
    }
    s.update(dt);
    // Camera: je eigen ridder, of als je uit bent de leider die nog leeft.
    let fx = g.x, fy = g.y;
    if (!alive) {
      let best = null;
      for (const id of s.knights.ids()) {
        const k = s.knights.get(id, t);
        if (k && !(k[4] & 1)) { best = k; break; }
      }
      if (best) { fx = best[0]; fy = best[1]; }
    }
    if (!g.cam) g.cam = { x: fx, y: fy };
    const ck = alive ? 1 : Math.min(1, dt * 3);
    g.cam.x += (fx - g.cam.x) * ck;
    g.cam.y += (fy - g.cam.y) * ck;
    const { w, h, dpr } = AK.fit(canvas, 1.75);
    const zoom = Math.max(.6 * dpr, Math.min(1.4 * dpr, Math.min(w, h) / 520));
    RyDraw.render(ctx, s, { x: g.cam.x, y: g.cam.y, zoom, w, h }, {
      roster: g.roster, local: alive ? { n: g.me.n, x: g.x, y: g.y, a: g.a } : { n: -1, x: g.cam.x, y: g.cam.y, a: 0 },
    });
    // Pijl naar de veilige cirkel als je erbuiten staat
    if (zn && alive && Math.hypot(g.x - zn.x, g.y - zn.y) > zn.r) {
      const a = Math.atan2(zn.y - g.y, zn.x - g.x);
      ctx.save();
      ctx.translate(w / 2 + Math.cos(a) * 70 * dpr, h / 2 + Math.sin(a) * 70 * dpr);
      ctx.rotate(a);
      ctx.fillStyle = '#e07bff';
      ctx.shadowColor = '#c77dff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(18 * dpr, 0);
      ctx.lineTo(-8 * dpr, -11 * dpr);
      ctx.lineTo(-8 * dpr, 11 * dpr);
      ctx.fill();
      ctx.restore();
    }
    const ms = Math.min(w * .26, 150 * dpr);
    RyDraw.minimap(ctx, s, w - ms - 12 * dpr, 12 * dpr, ms, alive ? { x: g.x, y: g.y } : null);
  }
  g.scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
