// Hooibergjacht op de Chromebook of gsm: graaf door je eigen neonhooiberg tot je de kristallen naald vindt.
// De hooiberg leeft hier (geen vertraging); de server krijgt de gevonden naald en schatten, en geeft de vragen.
// Chromebook: klik en sleep (of houd spatie ingedrukt) om te graven, 1-4 antwoorden. Gsm: veeg met je vinger door het hooi.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, HbWorld en HbDraw.
(() => {
  const W = HbWorld;
  const root = document.createElement('div');
  root.id = 'hooi';
  root.innerHTML = `
  <form id="hb-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Hooibergjacht</p>
    <input id="hb-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="hb-join-error"></p>
    <button type="submit" class="big">Naar de schuur</button>
  </form>
  <section id="hb-lobby" class="screen panel hidden">
    <p class="status">Hooibergjacht</p>
    <img class="lobby-icoon" src="/img/icons/hooibergjacht.webp" alt="">
    <p class="title" id="hb-lobby-name"></p>
    <p>Ergens in jouw <strong>neonhooiberg</strong> zit één <strong>kristallen naald</strong>. Veeg en graaf het hooi weg tot je hem vindt.</p>
    <p><strong>Graven kost energie.</strong> Is ze op, dan krijg je een vraag. Juist: ⚡ volle energie, een <strong>beter werktuig</strong> en het 🧭 kompas toont even waar de naald zit.</p>
    <p class="muted small">Naald gevonden? Dan krijg je punten (sneller = meer) en meteen een grotere hooiberg. Tandwielen en runenmunten in het hooi geven extra punten. Zie je iets fonkelen? Daar zit de naald!</p>
    <p class="muted small ls-hint-touch">Veeg met je vinger door het hooi.</p>
    <p class="muted small ls-hint-keys">Klik en sleep, of wijs met de muis en houd spatie ingedrukt · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="hb-game" class="ak-game hidden">
    <div class="ls-hud ak-hud hb-hud">
      <div class="sv-mass" id="hb-score">0</div>
      <div class="px-chip" id="hb-found">📍 0</div>
      <div class="px-chip" id="hb-tool">🔱 Hooivork</div>
      <div class="hb-energy" id="hb-energy" title="Energie"><i></i></div>
      <div class="ry-alive" id="hb-rank"></div>
      <div class="ls-clock" id="hb-clock"></div>
    </div>
    <div class="ls-stage hb-stage" id="hb-stage">
      <canvas id="hb-canvas"></canvas>
      <div class="ls-feed" id="hb-feed"></div>
      <div class="ls-banner" id="hb-banner"></div>
      <div class="tw-toast" id="hb-toast"></div>
      <div class="tw-countdown hidden" id="hb-countdown"></div>
      <div class="hb-tip" id="hb-tip"><span class="ls-hint-touch">Veeg door het hooi</span><span class="ls-hint-keys">Klik en sleep door het hooi</span></div>
    </div>
  </section>
  <section id="hb-end" class="screen panel hidden">
    <div class="mark" id="hb-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="hb-end-title"></p>
    <p class="big" id="hb-end-score" style="font-size:1.6rem"></p>
    <p id="hb-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), name: '',
    k: 0, st: null, hay: new HbDraw.Hay(), cs: 0, ky: 1, lvl: 0, energy: W.ENERGY, removed: 0, taken: new Set(), busy: false,
    kompas: null, kompasN: 0, win: null, ptr: { x: 0, y: 0, down: false, key: false, seen: false }, lastDig: 0, digK: 0,
    straws: [], found: new Map(), shake: 0, progSent: -1,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const gameTime = () => Math.max(0, (now() - (g.state ? g.state.startedAt : 0)) / 1000);
  const on = () => document.body.dataset.hb === '1';
  const show = name => { for (const s of ['hb-join', 'hb-lobby', 'hb-game', 'hb-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';

  function join(name) {
    socket.emit('hb-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('hb-join-error').textContent = res.error;
        show('hb-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('hb-join-error').textContent = '';
    });
  }
  $('hb-join').addEventListener('submit', e => { e.preventDefault(); join($('hb-name').value); });

  // Een nieuwe hooiberg (k) klaarzetten.
  function newStack(k) {
    g.k = k;
    g.st = g.state ? W.stack(g.state.seed, g.me ? g.me.n : 0, k) : null;
    g.removed = 0;
    g.kompas = null;
    g.win = null;
    g.cs = 0; // opnieuw tekenen bij de volgende frame
    g.progSent = -1;
  }

  socket.on('hb-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.hb = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.k = 0;
      g.st = null;
      g.lvl = 0;
      g.energy = W.ENERGY;
      g.taken = new Set();
      g.found = new Map();
      g.busy = false;
      g.kompasN = 0;
      g.straws = [];
      quiz.close();
      delete $('hb-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('hb-name').value = saved || '';
        show('hb-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    if (Array.isArray(s.itemIds)) for (const id of s.itemIds) g.taken.add(id);
    if (Number.isInteger(s.lvl)) g.lvl = Math.max(g.lvl, s.lvl);
    // Terug na herladen (of net binnen): de hooiberg waar de server je kent.
    if (s.me && (!g.st || (Number.isInteger(s.k) && s.k !== g.k))) newStack(Number.isInteger(s.k) ? s.k : 0);
    if (s.phase === 'lobby') {
      $('hb-lobby-name').textContent = s.name;
      show('hb-lobby');
    } else if (s.phase === 'play') {
      show('hb-game');
      $('hb-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('hb-end-medal').textContent = medals[me.rank - 1] || '📍';
      $('hb-end-title').textContent = me.rank === 1 ? 'Jij bent de beste naaldzoeker!' : `Plek ${me.rank} van ${me.players}`;
      $('hb-end-score').textContent = `${me.score || 0} punten`;
      $('hb-end-stats').textContent = `${me.found || 0} ${me.found === 1 ? 'naald' : 'naalden'} · ${me.loot || 0} schatten · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('hb-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('hb-end').dataset.done = '1';
      show('hb-end');
    }
  });


  socket.on('hb-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('hb-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('hb-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('hb-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    for (const [n, , , found] of msg.r) {
      if (g.me && n === g.me.n) continue;
      const before = g.found.get(n);
      g.found.set(n, found);
      if (before !== undefined && found > before) feedLine(`📍 ${nameOf(n)} vindt een naald`);
    }
  });

  function setMe(me) {
    const first = !g.me;
    g.me = me;
    $('hb-score').textContent = me.score;
    $('hb-found').textContent = `📍 ${me.found}`;
    $('hb-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
    if (first && g.state) newStack(g.k);
  }

  // ---------- Vragen als de energie op is ----------
  let lastRes = null;
  const quiz = AK.quiz({
    root: $('hb-game'),
    closeText: 'Verder graven',
    lock: 350,
    status: () => 'Energie op · juist = ⚡ volle energie, beter werktuig en 🧭 kompas',
    ask: cb => socket.emit('hb-question', null, cb),
    answer: (i, cb) => socket.emit('hb-answer', i, res => {
      lastRes = res;
      if (res && res.correct) {
        g.energy = W.ENERGY;
        if (Number.isInteger(res.lvl)) g.lvl = res.lvl;
        g.kompasN++;
        if (g.st) g.kompas = { ...W.kompas(g.st, g.kompasN), until: performance.now() / 1000 + W.KOMPAS_S };
        sfx.power();
      }
      cb(res);
    }),
    good: res => (res.up ? `Juist! Je krijgt de ${W.TOOLS[res.lvl].name} ${W.TOOLS[res.lvl].icon}, volle energie en het kompas. +${res.points}` : `Juist! ⚡ Volle energie en het 🧭 kompas. +${res.points}`),
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug. Je krijgt wat energie.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('hb-asking', false);
      if (lastRes && !lastRes.error && !lastRes.correct) g.energy = Math.max(g.energy, Math.round(W.ENERGY * .4));
      lastRes = null;
      if (g.kompas) toast('🧭 De naald zit in de lichtcirkel!');
    },
  });

  // ---------- Graven ----------
  const canvas = $('hb-canvas');
  const ctx = canvas.getContext('2d');
  let view = { w: 1, h: 1, dpr: 1, ox: 0, oy: 0 };
  const cellAt = (px, py) => ({ x: (px - view.ox) / g.cs, y: (py - view.oy) / (g.cs * g.ky) });
  const pxOf = i => ({ x: view.ox + ((i % g.st.cols) + .5) * g.cs, y: view.oy + (Math.floor(i / g.st.cols) + .5) * g.cs * g.ky });

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('hb-game').classList.contains('hidden') && g.st;
  }

  function digOnce() {
    if (!playing() || quiz.open || g.busy || g.win) return;
    if (g.energy <= 0) {
      socket.emit('hb-asking', true);
      quiz.show();
      return;
    }
    const tool = W.TOOLS[g.lvl];
    const at = cellAt(g.ptr.x, g.ptr.y);
    const hit = W.dig(g.st, at.x, at.y, tool.r);
    g.digK = 1;
    if (!hit.length) return;
    $('hb-tip').classList.add('weg');
    g.energy--;
    g.removed += hit.length;
    g.hay.update(hit);
    // Strootjes die wegvliegen (niet te veel, voor trage toestellen)
    const room = 140 - g.straws.length;
    for (let j = 0; j < Math.min(hit.length, 5, room); j++) {
      const p = pxOf(hit[Math.floor(Math.random() * hit.length)]);
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.2;
      const sp = g.cs * (6 + Math.random() * 8) * (1 + g.lvl * .25);
      g.straws.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - .5) * 14, life: .8 + Math.random() * .4, c: Math.random() < .08 ? '#7ff6ff' : '#f2cf6b' });
    }
    sfx.hooi();
    // Schatten en de naald: zichtbaar zodra hun vakje leeg is.
    for (const it of g.st.items) {
      if (g.taken.has(it.id) || g.st.hp[it.cell] > 0) continue;
      g.taken.add(it.id);
      const p = pxOf(it.cell);
      const pts = W.POINTS[it.kind];
      fx.burst(p.x, p.y, { n: 12, color: it.kind === 'munt' ? '#ffc94a' : '#9fb2d9', speed: 240, life: .5, size: 3 });
      fx.text(p.x, p.y - 14, `+${pts}`, '#ffc94a', 20);
      sfx.marker();
      socket.emit('hb-item', it.id);
    }
    if (g.energy === 0) setTimeout(() => { if (playing() && !quiz.open && !g.win && g.energy <= 0) { socket.emit('hb-asking', true); quiz.show(); } }, 250);
    if (g.st.hp[g.st.needle] === 0) found();
  }

  function found() {
    if (g.busy) return;
    g.busy = true;
    const k = g.k;
    const p = pxOf(g.st.needle);
    g.win = { x: p.x, y: p.y, t: performance.now() / 1000 };
    sfx.naald();
    buzz([40, 50, 40, 50, 80]);
    fx.burst(p.x, p.y, { n: 40, color: '#5ee7ff', speed: 460, life: .9, size: 4 });
    fx.shock(p.x, p.y, 90, '#ffc94a');
    g.shake = .25;
    socket.emit('hb-found', k, res => {
      g.busy = false;
      if (!res || res.error) {
        if (res && Number.isInteger(res.k) && res.k !== g.k) setTimeout(() => newStack(res.k), 1200);
        else setTimeout(() => { g.win = null; }, 1200);
        return;
      }
      const tijd = res.s.toFixed(1).replace('.', ',');
      banner('NAALD GEVONDEN!', `${tijd} s · +${res.points}${res.record ? ' · ⏱️ record!' : ''}`, 'gold');
      confetti(1500);
      setTimeout(() => {
        newStack(res.k);
        toast(`Hooiberg ${res.k + 1}: nog groter!`);
      }, 1700);
    });
  }

  const stage = $('hb-stage');
  function setPtr(e) {
    const r = canvas.getBoundingClientRect();
    g.ptr.x = (e.clientX - r.left) * view.dpr;
    g.ptr.y = (e.clientY - r.top) * view.dpr;
    g.ptr.seen = true;
  }
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button, .ak-question')) return;
    e.preventDefault();
    sfx.unlock();
    setPtr(e);
    g.ptr.down = true;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    digOnce();
    g.lastDig = performance.now();
  });
  stage.addEventListener('pointermove', e => { if (!e.target.closest('.ak-question')) setPtr(e); });
  const up = () => { g.ptr.down = false; };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('hb-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!g.ptr.seen && g.st) { // nog niet gewezen: midden van de hooiberg
      g.ptr.x = view.ox + g.st.cols * g.cs / 2;
      g.ptr.y = view.oy + g.st.rows * g.cs * g.ky * .7;
    }
    g.ptr.key = true;
  });
  document.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') g.ptr.key = false; });
  addEventListener('blur', () => { g.ptr.key = false; g.ptr.down = false; });

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('hb-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('hb-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('hb-banner');
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

  // ---------- Elke frame ----------
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('hb-game').classList.contains('hidden') || !g.st) return;
    const left = g.state.endsAt - now();
    $('hb-clock').textContent = AK.clock(left);
    $('hb-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('hb-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('hb-countdown').textContent = Math.ceil(wait / 1000);
    const sec = t / 1000;

    // Graven zolang de knop ingedrukt is
    if ((g.ptr.down || g.ptr.key) && t - g.lastDig >= W.DIG_MS) {
      g.lastDig = t;
      digOnce();
    }
    g.digK = Math.max(0, g.digK - dt * 7);

    // Opmeten: de hooiberg zo groot mogelijk, onderaan op de vloer. Op een gsm rechtop worden de vakjes hoger (tot 2 keer).
    const fit = AK.fit(canvas, 1.5);
    const floorY = fit.h * .86;
    const room = floorY - fit.h * .1;
    const cs = Math.max(3, Math.floor(Math.min(fit.w * .94 / g.st.cols, room / g.st.rows) * 2) / 2);
    const ky = Math.max(1, Math.min(2, Math.floor(room / g.st.rows / cs * 10) / 10));
    if (cs !== g.cs || ky !== g.ky || g.hay.st !== g.st || g.hay.gen !== HbDraw.Hay.gen) {
      g.cs = cs;
      g.ky = ky;
      g.hay.build(g.st, cs, ky);
    }
    view = { w: fit.w, h: fit.h, dpr: fit.dpr, ox: Math.round((fit.w - g.st.cols * cs) / 2), oy: Math.round(floorY - g.st.rows * cs * ky) };

    // Stand naar de server (voor het bord)
    const prog = Math.round(g.removed / g.st.total * 100);
    if (prog !== g.progSent && (!g.progAt || t - g.progAt > 700)) {
      g.progSent = prog;
      g.progAt = t;
      socket.emit('hb-prog', prog);
    }

    // Tekenen
    g.shake = Math.max(0, g.shake - dt);
    ctx.save();
    if (g.shake > 0) ctx.translate((Math.random() - .5) * g.shake * 30, (Math.random() - .5) * g.shake * 30);
    HbDraw.barn(ctx, fit.w, fit.h, sec);
    // Een lichtende ring op de vloer onder de berg
    HbDraw.glow(ctx, fit.w / 2, floorY, g.st.cols * cs * .55, 'rgba(94,231,255,.28)');
    // Het hooi (de naald en schatten zitten eronder: je ziet ze pas als hun vakje leeg is, en dan pakken we ze meteen)
    const np = pxOf(g.st.needle);
    g.hay.draw(ctx, view.ox, view.oy);
    // Door dun hooi fonkelt de naald af en toe.
    if (!g.win && g.st.hp[g.st.needle] === 1) {
      const ph = (sec * .7 + g.st.glint) % 1.6;
      if (ph < .5) HbDraw.sparkle(ctx, np.x, np.y, cs * 1.1 * Math.sin(ph / .5 * Math.PI), .95);
    }
    // Het kompas
    if (g.kompas && sec < g.kompas.until) {
      const k = Math.min(1, (g.kompas.until - sec) / 1.2);
      const kx = view.ox + g.kompas.x * cs, kyy = view.oy + g.kompas.y * cs * ky;
      ctx.save();
      ctx.globalAlpha = k * (.8 + .2 * Math.sin(sec * 8));
      ctx.strokeStyle = '#5ee7ff';
      ctx.lineWidth = Math.max(2, cs * .3);
      ctx.setLineDash([cs * .8, cs * .5]);
      ctx.lineDashOffset = -sec * cs * 3;
      ctx.beginPath(); ctx.ellipse(kx, kyy, g.kompas.r * cs, g.kompas.r * cs * ky, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      HbDraw.glow(ctx, kx, kyy, g.kompas.r * cs * ky, 'rgba(94,231,255,.22)', k);
    }
    // Gevonden: de naald zweeft omhoog en wordt groot.
    if (g.win) {
      const k = Math.min(1, (sec - g.win.t) / .9);
      const e = 1 - (1 - k) * (1 - k);
      const x = g.win.x + (fit.w / 2 - g.win.x) * e, y = g.win.y + (fit.h * .42 - g.win.y) * e;
      HbDraw.glow(ctx, x, y, cs * 10 * e + cs * 2, 'rgba(255,201,74,.45)');
      HbDraw.needle(ctx, x, y, cs * (1.9 + 7 * e), g.st.angle * (1 - e) - .5 * e + sec * 2 * e, sec);
      HbDraw.sparkle(ctx, x + Math.cos(sec * 3) * cs * 4 * e, y + Math.sin(sec * 3) * cs * 2 * e, cs * 1.4, e);
    }
    // Strootjes
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, cs * .14);
    for (const s of g.straws) {
      s.vy += cs * 40 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; s.life -= dt;
      ctx.globalAlpha = Math.min(1, s.life * 2);
      ctx.strokeStyle = s.c;
      const l = cs * .6;
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.r) * l, s.y - Math.sin(s.r) * l);
      ctx.lineTo(s.x + Math.cos(s.r) * l, s.y + Math.sin(s.r) * l);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    g.straws = g.straws.filter(s => s.life > 0);
    // Het werktuig bij de vinger of de muis
    if (g.ptr.seen && !g.win) {
      const tool = W.TOOLS[g.lvl];
      ctx.save();
      ctx.globalAlpha = .55;
      ctx.strokeStyle = tool.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.ellipse(g.ptr.x, g.ptr.y, tool.r * cs, tool.r * cs * ky, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      HbDraw.tool(ctx, g.lvl, g.ptr.x, g.ptr.y, Math.max(26, cs * 2.4) * (1 + g.lvl * .12), sec, g.digK);
    }
    fx.update(dt);
    fx.draw(ctx);
    ctx.restore();

    // HUD
    const tool = W.TOOLS[g.lvl];
    $('hb-tool').textContent = `${tool.icon} ${tool.name}`;
    const en = $('hb-energy');
    en.firstChild.style.width = `${Math.round(g.energy / W.ENERGY * 100)}%`;
    en.classList.toggle('low', g.energy < W.ENERGY * .2);
  }
  requestAnimationFrame(frame);
})();
