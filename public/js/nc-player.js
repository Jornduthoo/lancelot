// Neon-Camelot op de Chromebook of gsm: rij vrij door de stad, vang de glitchdief, race, blus branden en vang gnomen.
// Je eigen kart rekenen we hier uit (NcWorld.drive), elke frame: zo stuurt hij meteen. De server krijgt je plek en controleert die.
// Sturen: wijs de richting aan (pijltjes / WASD / ZQSD, de muis, of je duim op de gsm) en de kart draait en rijdt die kant op.
// Shift = driften, N of X = nitro, spatie of E = actie, V = ander voertuig, 1-4 antwoorden.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, NcWorld en NcDraw.
(() => {
  const W = NcWorld;
  const root = document.createElement('div');
  root.id = 'camelot';
  root.innerHTML = `
  <form id="nc-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Neon-Camelot</p>
    <input id="nc-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="nc-join-error"></p>
    <button type="submit" class="big">De stad in</button>
  </form>
  <section id="nc-lobby" class="screen panel hidden">
    <p class="status">Neon-Camelot</p>
    <img class="lobby-icoon" src="/img/icons/neoncamelot.webp" alt="">
    <p class="title" id="nc-lobby-name"></p>
    <p>Scheur door de stad in je <strong>hoverkart</strong>. Rij naar een ⭐ voor een <strong>missie</strong>: vang de 🦹 glitchdief, race door de ringen of breng een pakket. Spring over schansen, vang 🧙 gnomen en blus 🔥 branden.</p>
    <p class="muted small">Een missie start met een vraag. Is je batterij op, dan krijg je ook een vraag: juist = vol en een 🔥 nitro. Met kristallen krijg je een zweefmotor, een raketkar en een griffioen!</p>
    <p class="muted small ls-hint-touch">Duim op het scherm en wijs de richting aan. Knoppen rechts onder: nitro en actie.</p>
    <p class="muted small ls-hint-keys">Pijltjes of muis = richting · Shift = driften · N = nitro · spatie = actie · V = voertuig</p>
    <div class="spinner"></div>
  </section>
  <section id="nc-game" class="ak-game hidden">
    <div class="ls-hud ak-hud nc-hud">
      <div class="sv-mass" id="nc-kr">💎 0</div>
      <div class="hb-energy nc-energie" id="nc-energie" title="Energie"><i></i></div>
      <div class="px-chip nc-missie hidden" id="nc-missie"></div>
      <div class="ry-alive" id="nc-rank"></div>
      <div class="ls-clock" id="nc-clock"></div>
    </div>
    <div class="ls-stage nc-stage" id="nc-stage">
      <canvas id="nc-canvas"></canvas>
      <canvas id="nc-nacht" class="nc-nacht"></canvas>
      <div class="ak-stick hidden" id="nc-stick"><i></i></div>
      <div class="ls-feed" id="nc-feed"></div>
      <div class="ls-banner" id="nc-banner"></div>
      <div class="nc-wijk" id="nc-wijk"></div>
      <div class="tw-toast" id="nc-toast"></div>
      <div class="tw-countdown hidden" id="nc-countdown"></div>
      <div class="hb-tip" id="nc-tip"><span class="ls-hint-touch">Duim op het scherm en wijs de richting aan</span><span class="ls-hint-keys">Pijltjes of de muis: de kart rijdt die kant op</span></div>
      <button class="ls-btn nc-voertuig" id="nc-voertuig" type="button" title="Ander voertuig (V)">🏎️<small>Hoverkart</small></button>
      <button class="ls-btn nc-nitro" id="nc-nitro" type="button" title="Nitro (N)">🔥<small>Nitro</small><b id="nc-nitro-n">1</b></button>
      <button class="ls-btn nc-actie hidden" id="nc-actie" type="button">⭐<small>Missie</small></button>
    </div>
  </section>
  <section id="nc-end" class="screen panel hidden">
    <div class="mark" id="nc-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="nc-end-title"></p>
    <p class="big" id="nc-end-score" style="font-size:1.6rem"></p>
    <p id="nc-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, roster: new Map(), cam: null, energieEnd: 0, energieMax: 1, missieEnd: 0, actie: null, ik: null };
  // Mijn kart, hier uitgerekend
  const zet = (x, y, a, veh) => { g.ik = { x, y, a: a || 0, vx: 0, vy: 0, z: 0, vz: 0, boost: 0, veh: veh || 0 }; };
  let scene = new NcDraw.Scene();
  const fx = new AK.Particles();
  const res = new NcDraw.Res(.6);
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.nc === '1';
  const show = name => { for (const s of ['nc-join', 'nc-lobby', 'nc-game', 'nc-end']) $(s).classList.toggle('hidden', s !== name); };
  const nameOf = n => (g.roster.get(n) || {}).name || 'iemand';
  const tijd = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function join(name) {
    socket.emit('nc-join', { playerId, name }, r => {
      if (r.error) {
        g.joined = false;
        $('nc-join-error').textContent = r.error;
        show('nc-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', r.name);
      $('nc-join-error').textContent = '';
    });
  }
  $('nc-join').addEventListener('submit', e => { e.preventDefault(); join($('nc-name').value); });

  socket.on('nc-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.nc = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    NcDraw.laad();
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.cam = null;
      g.ik = null;
      scene = new NcDraw.Scene();
      scene.onEvent = onEvent;
      quiz.close();
      delete $('nc-end').dataset.done;
    }
    if (s.wereld) scene.wereld = s.wereld;
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('nc-name').value = saved || '';
        show('nc-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.phase === 'lobby') {
      $('nc-lobby-name').textContent = s.name;
      show('nc-lobby');
    } else if (s.phase === 'play') {
      show('nc-game');
      $('nc-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('nc-end-medal').textContent = medals[me.rank - 1] || '🏰';
      $('nc-end-title').textContent = me.rank === 1 && me.kr > 0 ? 'Jij hebt de meeste kristallen!' : `Plek ${me.rank} van ${me.players}`;
      $('nc-end-score').textContent = `💎 ${me.kr || 0} kristallen`;
      $('nc-end-stats').textContent = [`${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`, `${me.missies || 0} ${me.missies === 1 ? 'missie' : 'missies'}`, `${me.gnomen || 0} gnomen`, `${me.dieven || 0} dieven`, `${me.geblust || 0} branden`, `${me.stunts || 0} sprongen`].join(' · ');
      if (!$('nc-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('nc-end').dataset.done = '1';
      show('nc-end');
    }
  });

  socket.on('nc-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('nc-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('nc-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('nc-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    scene.apply(msg);
    if (msg.me) setMe(msg.me);
    if (!g.ik && g.me) { const p = msg.p.find(q => q[0] === g.me.n); if (p) zet(p[1] / 10, p[2] / 10, p[3] / 100, p[4]); }
  });
  // De server zet ons terug (bijvoorbeeld bij het begin, of als we door een muur gingen).
  socket.on('nc-fix', f => { if (g.ik) { g.ik.x = f.x; g.ik.y = f.y; g.ik.vx = g.ik.vy = 0; } });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    const t = performance.now();
    g.energieEnd = t + me.energie;
    g.energieMax = me.energieMax || W.ENERGIE_S * 1000;
    g.missieEnd = me.missie ? t + me.missie.left : 0;
    g.coolEnd = t + (me.cool || 0);
    if (me.fix) zet(me.fix.x, me.fix.y, me.fix.a, me.veh);
    if (g.ik) g.ik.veh = me.veh;
    if (old && me.kr > old.kr) { $('nc-kr').classList.remove('pop'); void $('nc-kr').offsetWidth; $('nc-kr').classList.add('pop'); }
    hud();
  }

  function hud() {
    const me = g.me;
    if (!me) return;
    $('nc-kr').textContent = `💎 ${me.kr}`;
    $('nc-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
    $('nc-nitro-n').textContent = me.nitro;
    $('nc-nitro').classList.toggle('leeg', !me.nitro);
    const v = W.VOERTUIGEN[me.veh];
    const knop = $('nc-voertuig');
    knop.innerHTML = `${v.icoon}<small>${v.naam}</small>`;
    knop.classList.toggle('nieuw', me.open > (g.gezien || 1));
  }

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    const ik = e[1] === me.n;
    if (e[0] === 'm' && ik) {
      sfx.fanfare ? sfx.fanfare() : sfx.power();
      buzz([40, 30, 80]);
      banner(['📦 PAKKET BEZORGD!', '🏁 RACE GEWONNEN!', '🦹 DIEF GEVANGEN!'][e[2]] || 'GELUKT!', `+${e[3]} 💎`, 'gold');
      if (e[2] === 2) confetti(1500);
    } else if (e[0] === 'x' && ik) {
      sfx.bad();
      toast(e[2] === 'dief' ? '💨 De dief is ontsnapt. Probeer een nieuwe ⭐.' : '⏰ Te laat. Rij naar een nieuwe ⭐.', 'bad');
    } else if (e[0] === 'r' && ik) {
      sfx.marker();
      buzz(25);
    } else if (e[0] === 'k' && e[2] === me.n) {
      sfx.power();
      buzz([30, 30, 30]);
      toast('🧙 Gnoom gevangen! +2 💎', 'good');
    } else if (e[0] === 'c' && e[2] === me.n) {
      if (performance.now() - (g.tickAt || 0) > 120) { g.tickAt = performance.now(); sfx.tick(); }
    } else if (e[0] === 'v' && ik) {
      const v = W.VOERTUIGEN[e[2]];
      sfx.fanfare ? sfx.fanfare() : sfx.power();
      banner(`${v.icoon} ${v.naam.toUpperCase()}!`, 'Nieuw voertuig. Tik op de knop links onder.', 'gold');
    } else if (e[0] === 'l') {
      banner('✨ DE STAD LICHT OP!', 'Samen verdienden jullie genoeg kristallen', 'gold');
    } else if (e[0] === 'g' && g.wasBij) {
      toast('💧 De brand is uit!', 'good');
    }
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('nc-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('nc-banner');
    el.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(strong, span);
    el.className = `ls-banner show ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Vragen ----------
  let soortVraag = 'energie';
  let lastRes = null;
  const STATUS = {
    energie: 'Batterij op · juist = vol + 1 💎 + 🔥 nitro · je staat stil en bent veilig',
    missie: 'Missie starten · juist = de missie begint',
    blus: 'Brand blussen · juist = je waterdraak spuit + 1 💎',
  };
  const quiz = AK.quiz({
    root: $('nc-game'),
    closeText: 'Verder rijden',
    lock: 350,
    status: r => STATUS[r.doel] || STATUS.energie,
    ask: cb => socket.emit('nc-question', null, cb),
    answer: (i, cb) => socket.emit('nc-answer', i, r => {
      lastRes = r;
      if (r && r.correct) sfx.power();
      cb(r);
    }),
    good: r => r.doel === 'missie' ? ({ race: 'Juist! Rij door alle ringen 🏁', dief: 'Juist! Vang de glitchdief 🦹', koerier: 'Juist! Breng het pakket weg 📦' })[r.missie] : r.doel === 'blus' ? 'Juist! Je waterdraak spuit 💧 +1 💎' : 'Juist! Volle batterij, +1 💎 en een 🔥 nitro',
    bad: r => r.doel === 'missie' ? 'Helaas. Kijk naar het juiste antwoord. Probeer zo opnieuw.' : r.doel === 'blus' ? 'Helaas. Probeer opnieuw.' : 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug. Je krijgt een beetje energie.',
    next: r => r.doel === 'blus' && r.correct && scene.wereld && scene.wereld.brand ? false : false,
    again: false,
    close: () => {
      socket.emit('nc-asking', false);
      if (lastRes && lastRes.correct && lastRes.doel === 'missie') banner(...({ race: ['🏁 RACE!', 'Rij door de ringen, volg de pijl'], dief: ['🦹 ACHTERNA!', 'Blijf vlak bij de dief tot de balk vol is'], koerier: ['📦 KOERIER!', 'Volg de gouden pijl'] })[lastRes.missie], 'gold');
      lastRes = null;
      soortVraag = 'energie';
      hud();
    },
  });
  function vraag(doel) {
    if (quiz.open) return;
    soortVraag = doel ? doel.soort : 'energie';
    socket.emit('nc-asking', true);
    socket.emit('nc-doel', doel, r => {
      if (r && r.error) { socket.emit('nc-asking', false); toast(r.error, 'bad'); return; }
      quiz.show();
    });
  }
  function maybeAsk() {
    if (!g.me || quiz.open || now() < g.state.startedAt) return;
    if (performance.now() < g.energieEnd) return;
    if (g.askedAt && performance.now() - g.askedAt < 1500) return;
    g.askedAt = performance.now();
    vraag(null);
  }

  // ---------- Actie: missie starten of blussen ----------
  function bepaalActie(p) {
    const me = g.me;
    const w = scene.wereld;
    if (w && w.brand && Math.hypot(w.brand.x - p[0], w.brand.y - p[1]) < 10.5) return { soort: 'blus', tekst: 'Blussen', icoon: '💧' };
    if (!me.missie && performance.now() > (g.coolEnd || 0)) {
      let best = -1, bd = 6;
      W.STAD.markers.forEach((m, i) => { const d = Math.hypot(m.x - p[0], m.y - p[1]); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) {
        const m = W.STAD.markers[best];
        return { soort: 'missie', m: best, tekst: { race: 'Race', dief: 'Dief', koerier: 'Koerier' }[m.soort], icoon: { race: '🏁', dief: '🦹', koerier: '📦' }[m.soort] };
      }
    }
    return null;
  }
  function doeActie() {
    const a = g.actie;
    if (!a || quiz.open) return;
    sfx.unlock();
    vraag(a.soort === 'blus' ? { soort: 'blus' } : { soort: 'missie', m: a.m });
  }
  $('nc-actie').addEventListener('click', doeActie);
  function wissel() {
    const me = g.me;
    if (!me || quiz.open) return;
    g.gezien = Math.max(g.gezien || 1, me.open);
    const volgende = W.VOERTUIGEN[me.open];
    if (me.open <= 1) {
      toast(`🔒 Zweefmotor vanaf ${volgende.nodig} 💎`);
      return;
    }
    const v = (me.veh + 1) % me.open;
    socket.emit('nc-voertuig', v, r => {
      if (r && r.error) toast(r.error, 'bad');
      else { sfx.go(); if (v === me.open - 1 && volgende) toast(`🔒 ${volgende.naam} vanaf ${volgende.nodig} 💎`); }
    });
  }
  $('nc-voertuig').addEventListener('click', wissel);
  function nitro() {
    if (!g.me || quiz.open || !g.ik) return;
    socket.emit('nc-nitro', null, r => {
      if (r && r.error) { toast(r.error); sfx.empty && sfx.empty(); return; }
      g.ik.boost = W.NITRO_S;
      g.nitroAt = performance.now();
      sfx.whoosh(); buzz(30);
    });
  }
  $('nc-nitro').addEventListener('click', nitro);

  // ---------- Besturing ----------
  const stage = $('nc-stage');
  const stickEl = $('nc-stick');
  const knob = stickEl.firstChild;
  const ctl = { mouse: null, touch: null, sent: [9, 9], sentAt: 0 };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('nc-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (e.key === ' ' || e.key.toLowerCase() === 'e') { e.preventDefault(); doeActie(); return; }
    if (e.key.toLowerCase() === 'v') { e.preventDefault(); wissel(); return; }
    if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'x') { e.preventDefault(); nitro(); return; }
    if (e.key === 'Shift') ctl.drift = true;
    if (AK.isMoveKey(e.key)) { e.preventDefault(); ctl.mouse = null; }
  });
  document.addEventListener('keyup', e => { if (e.key === 'Shift') ctl.drift = false; });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    ctl.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') ctl.mouse = null; });
  const RAD = 50;
  stage.addEventListener('pointerdown', e => {
    sfx.unlock();
    if (e.pointerType === 'mouse' || ctl.touch || e.target.closest('button, .ak-question')) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    ctl.touch = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
    stickEl.style.left = `${e.clientX - r.left}px`;
    stickEl.style.top = `${e.clientY - r.top}px`;
    stickEl.classList.remove('hidden');
    knob.style.transform = 'translate(-50%, -50%)';
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', e => {
    const tc = ctl.touch;
    if (!tc || e.pointerId !== tc.id) return;
    let dx = e.clientX - tc.ox, dy = e.clientY - tc.oy;
    const l = Math.hypot(dx, dy);
    if (l > RAD) {
      const r = stage.getBoundingClientRect();
      tc.ox += (dx / l) * (l - RAD);
      tc.oy += (dy / l) * (l - RAD);
      stickEl.style.left = `${tc.ox - r.left}px`;
      stickEl.style.top = `${tc.oy - r.top}px`;
      dx = e.clientX - tc.ox;
      dy = e.clientY - tc.oy;
    }
    const m = Math.hypot(dx, dy);
    const power = m < 6 ? 0 : Math.min(1, .5 + (m / RAD) * .6);
    tc.x = m ? (dx / m) * power : 0;
    tc.y = m ? (dy / m) * power : 0;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const endTouch = e => {
    if (!ctl.touch || e.pointerId !== ctl.touch.id) return;
    ctl.touch = null;
    stickEl.classList.add('hidden');
  };
  stage.addEventListener('pointerup', endTouch);
  stage.addEventListener('pointercancel', endTouch);

  // Welke richting wijst de leerling aan? [dx, dy, kracht]
  function direction(px, py) {
    if (ctl.touch) { const m = Math.hypot(ctl.touch.x, ctl.touch.y); return [ctl.touch.x, ctl.touch.y, m]; }
    const k = AK.keyVector();
    if (k.x || k.y) return [k.x, k.y, 1];
    if (ctl.mouse) {
      const dx = ctl.mouse.x - px, dy = ctl.mouse.y - py;
      const l = Math.hypot(dx, dy);
      if (l < 30) return [0, 0, 0];
      return [dx / l, dy / l, Math.min(1, (l - 20) / 140)];
    }
    return [0, 0, 0];
  }
  // Mijn plek naar de server, 20 keer per seconde
  let sprong = false;
  function stuur(t) {
    const ik = g.ik;
    if (!ik || t - (ctl.sentAt || 0) < 50) return;
    ctl.sentAt = t;
    socket.volatile.emit('nc-move', { x: Math.round(ik.x * 100) / 100, y: Math.round(ik.y * 100) / 100, a: Math.round(ik.a * 1000) / 1000, z: Math.round(ik.z * 10) / 10, j: sprong ? 1 : 0 });
    sprong = false;
  }
  // Mijn kart een stukje verder rijden, in vaste stapjes van 1/60 s
  let rest = 0;
  function rij(dt, t, px, py) {
    const ik = g.ik;
    if (!ik) return;
    if (quiz.open || now() < g.state.startedAt) { ik.vx = ik.vy = 0; sfx.engine(0); return; }
    const [dx, dy, kracht] = direction(px, py);
    if (kracht > .05) $('nc-tip').classList.add('weg');
    const inp = W.stuurNaar(ik, dx, dy, kracht);
    if (ctl.drift) inp.drift = true;
    const leeg = performance.now() > g.energieEnd;
    const tt = (now() - g.state.startedAt) / 1000;
    rest += dt;
    while (rest >= 1 / 60) {
      rest -= 1 / 60;
      const bx = ik.x, by = ik.y;
      const out = W.drive(ik, inp, 1 / 60, { leeg, tt });
      // Remsporen als je glijdt
      if (out.slip > 3.2 && ik.z < .1 && !W.VOERTUIGEN[ik.veh].vliegt) {
        const ca = Math.cos(ik.a), sa = Math.sin(ik.a);
        for (const z of [-.7, .7]) scene.spoor(bx - ca * 1.2 - sa * z, by - sa * 1.2 + ca * z, ik.x - ca * 1.2 - sa * z, ik.y - sa * 1.2 + ca * z);
      }
      if (out.jump) {
        sprong = true;
        sfx.jump(); buzz(25);
        if (performance.now() - (g.stuntAt || 0) > 6000) { g.stuntAt = performance.now(); toast('🛹 STUNTSPRONG! +1 💎', 'good'); }
      }
      if (out.land) { g.schud = performance.now(); sfx.dobbel(0); g.stof = true; }
      if (out.turbo) { sfx.whoosh(); toast('⚡ TURBO!', 'good'); }
      if (out.bump > 5) { g.schud = performance.now(); sfx.hit(); buzz(30); g.vonk = true; }
      if (out.toet && performance.now() - (g.toetAt || 0) > 1500) {
        g.toetAt = performance.now();
        sfx.toet ? sfx.toet() : sfx.tick();
        g.schud = performance.now();
        if (performance.now() - (g.toetTip || 0) > 20000) { g.toetTip = performance.now(); toast('🚋 Toet toet! Kijk uit voor het verkeer.'); }
      }
    }
    const v = Math.hypot(ik.vx, ik.vy);
    if (t - (g.motorAt || 0) > 100) { g.motorAt = t; sfx.engine(Math.min(1, v / 20) * .8 + (v > .5 ? .1 : 0)); }
  }

  // ---------- Elke frame ----------
  const canvas = $('nc-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('nc-game').classList.contains('hidden') || !g.me) return;
    const left = g.state.endsAt - now();
    $('nc-clock').textContent = AK.clock(left);
    $('nc-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('nc-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('nc-countdown').textContent = Math.ceil(wait / 1000);
    const en = Math.max(0, g.energieEnd - t);
    const el = $('nc-energie');
    el.firstChild.style.width = `${Math.round(Math.min(1, en / g.energieMax) * 100)}%`;
    el.classList.toggle('low', en < g.energieMax * .2);
    const m = g.me.missie;
    const chip = $('nc-missie');
    chip.classList.toggle('hidden', !m);
    if (m) {
      const d = m.soort === 'dief' ? scene.dieven.get(g.me.n) : null;
      const tekst = m.soort === 'race' ? `🏁 Ring ${Math.min(m.ri + 1, m.ringen.length)}/${m.ringen.length}` : m.soort === 'dief' ? `🦹 Gevangen ${Math.round((d ? d[3] : 0) * 100)}%` : `📦 Naar ${m.naar}`;
      const ms = g.missieEnd - t;
      chip.textContent = `${tekst} · ${tijd(ms)}`;
      chip.classList.toggle('low', ms < 8000);
    }
    maybeAsk();

    // Tijdens een vraag ligt het vragenvenster over de stad: niet tekenen spaart de Chromebook.
    if (quiz.open) { if (g.ik) g.ik.vx = g.ik.vy = 0; if (!g.stil) { g.stil = true; sfx.engine(0); } return; }
    g.stil = false;
    const sec = t / 1000;
    res.frame(dt);
    const { w, h, dpr } = AK.fit(canvas, res.dpr(1.5));
    const ik = g.ik;
    const p = ik ? [ik.x, ik.y] : null;
    const V = W.VOERTUIGEN[ik ? ik.veh : 0];
    const v = ik ? Math.hypot(ik.vx, ik.vy) : 0;
    // Zoom: ongeveer 65 m breed op een Chromebook, verder uit als je vliegt. (Niet zoomen met de snelheid: dan moet de grond telkens opnieuw gebakken worden.)
    const want = Math.min(Math.sqrt(w * h) / 56, w / 50) * (V.vliegt ? .82 : 1);
    g.S = g.S ? g.S + (want - g.S) * Math.min(1, dt * 1.5) : want;
    const S = Math.round(g.S * 4) / 4;
    if (p) {
      if (!g.cam) g.cam = { x: p[0], y: p[1] };
      // De camera kijkt vooruit in de richting waarin je rijdt.
      const k = Math.min(1, dt * 5);
      g.cam.x += (p[0] + ik.vx * .55 - g.cam.x) * k;
      g.cam.y += (p[1] + ik.vy * .55 - g.cam.y) * k;
      const wijk = W.wijkOp(p[0], p[1]);
      if (wijk !== g.wijk) {
        g.wijk = wijk;
        const el = $('nc-wijk');
        el.textContent = W.WIJK[wijk].replace(/^\w/, c => c.toUpperCase());
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      }
    }
    if (!g.cam) g.cam = { x: W.L / 2, y: W.L / 2 };
    const halfW = w / 2 / S, halfH = h / 2 / S;
    let shx = 0, shy = 0;
    if (g.schud && t - g.schud < 220) { shx = (Math.random() - .5) * .5; shy = (Math.random() - .5) * .5; }
    const cam = { x: Math.max(halfW - 6, Math.min(W.L + 6 - halfW, g.cam.x)) + shx, y: Math.max(halfH - 6, Math.min(W.L + 6 - halfH, g.cam.y)) + shy, S, w, h };
    const P = { S: Math.round(S * 32) / 32 };
    const px = (w / 2 + (ik ? ik.x - cam.x : 0) * P.S) / dpr, py = (h / 2 + (ik ? ik.y - cam.y : 0) * P.S) / dpr;
    rij(dt, t, px, py);
    if (wait <= 0) stuur(t);
    const t0 = performance.now();
    const tt = (now() - g.state.startedAt) / 1000 + (window.__ncTijd || 0); // __ncTijd: alleen voor de tests (dag of nacht)
    const ms = Math.min(w * .2, h * .3, 130 * dpr);
    const vl = ik && performance.now() - (g.nitroAt || 0) < W.NITRO_S * 1000 ? 32 : 0;
    const ikT = ik ? { x: ik.x, y: ik.y, a: ik.a, z: ik.z, veh: ik.veh, flags: vl | (g.me.missie && g.me.missie.soort === 'koerier' ? 4 : 0) } : null;
    NcDraw.render(ctx, scene, cam, { tt, ik: ikT, nacht: $('nc-nacht'), gat: [w - ms - 12 * dpr, 8 * dpr, ms + 4 * dpr, ms + 4 * dpr], roster: g.roster, t: sec, me: g.me.n, missie: g.me.missie, cool: (g.coolEnd || 0) - t, fs: Math.max(10, 12 * dpr) });
    if (g.stof && ik) { g.stof = false; fx.burst(w / 2 + (ik.x - cam.x) * P.S, h / 2 + (ik.y - cam.y) * P.S, { n: 14, color: '#d8c8a8', speed: 160 * dpr, life: .45, size: 3 * dpr, glow: false }); }
    if (g.vonk && ik) { g.vonk = false; fx.sparks(w / 2 + (ik.x - cam.x) * P.S, h / 2 + (ik.y - cam.y) * P.S, { n: 10, color: '#7ff3ff' }); }
    window.__ncMs = (window.__ncMs || 0) * .9 + (performance.now() - t0) * .1;
    if (ik && (ik.boost > 0)) NcDraw.snelheidslijnen(ctx, w, h, sec, Math.atan2(ik.vy, ik.vx));
    fx.update(dt);
    fx.draw(ctx);
    NcDraw.minimap(ctx, scene, w - ms - 10 * dpr, 10 * dpr, ms, { roster: g.roster, me: g.me.n, ik, missie: g.me.missie, t: sec });
    if (p) {
      // Actieknop
      const a = bepaalActie(p);
      const key = a ? `${a.soort}|${a.m}` : '';
      if (key !== (g.actieKey || '')) {
        g.actieKey = key;
        g.actie = a;
        const knop = $('nc-actie');
        knop.classList.toggle('hidden', !a);
        if (a) { knop.innerHTML = `${a.icoon}<small>${a.tekst}</small>`; knop.dataset.soort = a.soort; sfx.tick(); }
      }
      g.wasBij = a && a.soort === 'blus' ? true : g.wasBij && scene.wereld && scene.wereld.brand;
    }
  }
  scene.onEvent = onEvent;
  requestAnimationFrame(frame);
  // Voor de automatische tests: waar sta ik?
  window.__ncPos = () => (g.ik ? [g.ik.x, g.ik.y, g.ik.a, g.ik.veh, 0, Math.hypot(g.ik.vx, g.ik.vy)] : null);
  window.__ncDief = () => (g.me && scene.dieven.get(g.me.n)) || null;
})();
