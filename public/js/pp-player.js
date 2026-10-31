// Plasmapoort op de Chromebook of gsm: strafschoppen tegen een rij robotridders.
// Schieten: tik (of spatie) om de richting vast te zetten, en nog eens voor de hoogte. Boven de lat = over!
// Keepen: de robot neemt aanloop. Kijk naar het rode hologram (hij verraadt waar hij mikt) en duik: ← ↑ → of de drie knoppen.
// Te vroeg duiken = gefopt. Voor elke trap van jou komt een vraag: juist = gouden bal en een groot schild.
// De server beslist wat raak is. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, PpWorld en PpDraw.
(() => {
  const W = PpWorld;
  const root = document.createElement('div');
  root.id = 'plasma';
  root.innerHTML = `
  <form id="pp-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Plasmapoort</p>
    <input id="pp-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="pp-join-error"></p>
    <button type="submit" class="big">Naar het stadion</button>
  </form>
  <section id="pp-lobby" class="screen panel hidden">
    <p class="status">Plasmapoort</p>
    <canvas id="pp-lobby-art" width="240" height="130"></canvas>
    <p class="title" id="pp-lobby-name"></p>
    <p>Neem strafschoppen tegen <strong>8 robotridders</strong>. Telkens 5 per kant: jij schiet, dan keep jij.</p>
    <p><strong>Schieten:</strong> tik voor de richting, tik nog eens voor de hoogte. Boven de lat is over!</p>
    <p><strong>Keepen:</strong> kijk naar het rode hologram en duik naar die kant. Niet te vroeg, anders word je gefopt!</p>
    <p><strong>Voor elke trap een vraag</strong>: juist = ✨ gouden bal en 🛡️ groot schild.</p>
    <p class="muted small ls-hint-keys">Spatie = mikken · ← ↑ → = duiken · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="pp-game" class="ak-game hidden">
    <div class="ls-hud ak-hud pp-hud">
      <div class="sv-mass" id="pp-score">0</div>
      <div class="px-chip pp-robot" id="pp-robot"></div>
      <div class="px-chip pp-power" id="pp-power"></div>
      <div class="ry-alive" id="pp-rank"></div>
      <div class="ls-clock" id="pp-clock"></div>
    </div>
    <div class="ls-stage" id="pp-stage">
      <canvas id="pp-canvas"></canvas>
      <div class="ls-feed" id="pp-feed"></div>
      <div class="ls-banner" id="pp-banner"></div>
      <div class="tw-toast" id="pp-toast"></div>
      <div class="tw-countdown hidden" id="pp-countdown"></div>
      <div class="pp-overlay hidden" id="pp-overlay"><div class="panel"><p class="title" id="pp-ov-title"></p><canvas id="pp-ov-art" width="200" height="120"></canvas><p id="pp-ov-sub"></p></div></div>
      <div class="pp-dives hidden" id="pp-dives">
        <button class="pp-dive" data-dir="-1" type="button">◀<small>links</small></button>
        <button class="pp-dive" data-dir="0" type="button">▲<small>midden</small></button>
        <button class="pp-dive" data-dir="1" type="button">▶<small>rechts</small></button>
      </div>
    </div>
  </section>
  <section id="pp-end" class="screen panel hidden">
    <div class="mark" id="pp-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="pp-end-title"></p>
    <p class="big" id="pp-end-score" style="font-size:1.6rem"></p>
    <p id="pp-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, name: '', color: '#4cc9ff',
    match: { robot: 0, tier: 0, a: [], b: [], gold: false, shield: false, turn: 'shoot' },
    mode: 'idle', modeT: 0, aim: { x: 0, y: 0 }, anim: null, dive: null, keepRes: null, busy: false, lastFeed: '',
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.pp === '1';
  const show = name => { for (const s of ['pp-join', 'pp-lobby', 'pp-game', 'pp-end']) $(s).classList.toggle('hidden', s !== name); };
  const robot = () => W.ROBOTS[g.match.robot];
  const stars = tier => (tier > 0 ? ' ' + '⭐'.repeat(Math.min(5, tier)) : '');
  const sec = () => performance.now() / 1000;

  function join(name) {
    socket.emit('pp-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('pp-join-error').textContent = res.error;
        show('pp-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('pp-join-error').textContent = '';
    });
  }
  $('pp-join').addEventListener('submit', e => { e.preventDefault(); join($('pp-name').value); });

  function setMode(m) {
    g.mode = m;
    g.modeT = 0;
    $('pp-dives').classList.toggle('hidden', m !== 'keep');
  }

  socket.on('pp-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.pp = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.anim = null;
      g.dive = null;
      g.busy = false;
      setMode('idle');
      quiz.close();
      $('pp-overlay').classList.add('hidden');
      delete $('pp-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('pp-name').value = saved || '';
        show('pp-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    const mine = s.roster.find(r => r.name === s.name);
    g.color = mine ? mine.color : '#4cc9ff';
    if (s.me) setMe(s.me);
    if (s.match && (g.mode === 'idle' || !g.anim)) g.match = s.match;
    chips();
    if (s.phase === 'lobby') {
      $('pp-lobby-name').textContent = s.name;
      lobbyArt();
      show('pp-lobby');
    } else if (s.phase === 'play') {
      show('pp-game');
      $('pp-game').style.setProperty('--team', g.color);
    } else if (s.phase === 'einde') {
      quiz.close();
      setMode('idle');
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('pp-end-medal').textContent = medals[me.rank - 1] || '⚡';
      $('pp-end-title').textContent = me.rank === 1 ? 'Jij bent de held van Plasmapoort!' : `Plek ${me.rank} van ${me.players}`;
      $('pp-end-score').textContent = `${me.score || 0} punten`;
      $('pp-end-stats').textContent = `${me.wins || 0} ${me.wins === 1 ? 'robot' : 'robots'} verslagen · ${me.goals || 0} goals · ${me.saves || 0} reddingen · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('pp-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('pp-end').dataset.done = '1';
      show('pp-end');
    }
  });

  socket.on('pp-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('pp-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('pp-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('pp-tick', msg => {
    if (msg.me) setMe(msg.me);
    const f = msg.feed && msg.feed[0];
    if (f && f.text !== g.lastFeed) {
      if (g.lastFeed) feedLine(f.text);
      g.lastFeed = f.text;
    }
  });

  function setMe(me) {
    g.me = me;
    $('pp-score').textContent = me.score;
    $('pp-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
  }
  function chips() {
    const R = robot();
    $('pp-robot').textContent = `🤖 ${g.match.robot + 1}/8 ${R.name}${stars(g.match.tier)}`;
    const p = [];
    if (g.match.gold) p.push('✨ gouden bal');
    if (g.match.shield) p.push('🛡️ groot schild');
    $('pp-power').textContent = p.join(' · ');
    $('pp-power').classList.toggle('hidden', !p.length);
  }

  function lobbyArt() {
    const c = $('pp-lobby-art'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    PpDraw.portrait(x, 70, 62, 50, { mech: false, color: g.color });
    const R = W.ROBOTS[0];
    PpDraw.portrait(x, 170, 62, 50, { color: R.color, eye: R.eye });
    x.font = '900 22px Orbitron, sans-serif';
    x.fillStyle = '#ffc94a';
    x.textAlign = 'center';
    x.fillText('VS', 120, 70);
  }

  // ---------- Het verloop van een wedstrijd ----------
  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('pp-game').classList.contains('hidden');
  }

  // Wat komt er nu? Jij schiet (eerst een vraag) of jij keept.
  function next() {
    if (!playing()) { setMode('idle'); return; }
    g.anim = null;
    g.dive = null;
    if (g.match.turn === 'keep') return startKeep();
    setMode('vraag');
    quiz.show();
  }

  const quiz = AK.quiz({
    root: $('pp-game'),
    closeText: 'Naar de stip',
    lock: 300,
    status: () => `Juist = ✨ gouden bal en 🛡️ groot schild · ${robot().name}`,
    ask: cb => socket.emit('pp-question', null, cb),
    answer: (i, cb) => socket.emit('pp-answer', i, res => {
      if (res && res.correct) { g.match.gold = true; g.match.shield = true; chips(); sfx.power(); }
      cb(res);
    }),
    good: res => `Juist! ✨ Gouden bal en 🛡️ groot schild. +${res.points}`,
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    again: false,
    close: () => {
      socket.emit('pp-asking', false);
      if (g.mode === 'vraag') startAim();
    },
  });

  function startAim() {
    setMode('aimx');
    g.aim = { x: 0, y: 0 };
    hint(g.match.gold ? '✨ Gouden bal! Tik om te mikken' : 'Tik om te mikken');
  }

  // Tik (of spatie) tijdens het mikken.
  function tap() {
    if (!playing() || quiz.open) return;
    sfx.unlock();
    if (g.mode === 'aimx') {
      g.aim.x = W.aimX(g.modeT, g.match.gold);
      setMode('aimy');
      sfx.tick();
      hint('Tik voor de hoogte (niet te hoog!)');
    } else if (g.mode === 'aimy') {
      g.aim.y = W.aimY(g.modeT, g.match.gold);
      sfx.tick();
      shoot();
    }
  }

  function shoot() {
    setMode('shot');
    hint('');
    const ev = { kind: 'shot', x: g.aim.x, y: g.aim.y, result: null, gold: g.match.gold, kx: 0, ky: 0 };
    g.anim = PpDraw.kickAnim(ev, sec(), { run: .5 });
    const send = () => socket.emit('pp-shoot', { x: g.aim.x, y: g.aim.y }, res => {
      if (res && res.wait) return setTimeout(send, res.wait + 30);
      if (!res || res.error) { g.anim = null; if (res && res.turn) g.match.turn = res.turn; setTimeout(next, 600); return; }
      Object.assign(ev, { x: res.x, y: res.y, kx: res.kx, ky: res.ky, result: res.result, viaPaal: res.viaPaal });
      g.anim.res = res;
    });
    send();
  }

  function startKeep() {
    setMode('keepwait');
    socket.emit('pp-keep', null, res => {
      if (res && res.wait) return setTimeout(startKeep, res.wait + 30);
      if (!res || res.error) { if (res && res.turn) g.match.turn = res.turn; setTimeout(next, 600); return; }
      g.keepRes = res;
      const ev = { kind: 'keep', x: res.x, y: res.y, result: null };
      g.anim = PpDraw.kickAnim(ev, sec() + .3, { windS: res.windMs / 1000, fly: res.travelMs / 1000 });
      g.dive = null;
      setMode('keep');
      hint(`🧤 Jij keept! Let op het rode hologram${res.shield ? ' · 🛡️ groot schild' : ''}`);
    });
  }

  // Duiken: -1 links, 0 midden, 1 rechts.
  function dive(dir) {
    if (g.mode !== 'keep' || !g.anim || g.dive || quiz.open) return;
    const kickT = g.anim.t0 + g.anim.run;
    const t = Math.round((sec() - kickT) * 1000);
    g.dive = { dir, at: sec() };
    sfx.jump();
    sendDive(dir, t);
  }
  function sendDive(dir, t) {
    const A = g.anim;
    socket.emit('pp-dive', { dir, t }, res => {
      if (!res || res.error || g.anim !== A) return;
      A.ev.x = res.x;
      A.ev.y = res.y;
      A.ev.result = res.result;
      A.ev.early = res.early;
      A.res = res;
    });
  }

  // De bal is aangekomen: toon wat er gebeurde.
  function landed(A) {
    const res = A.res, ev = A.ev;
    const P = PpDraw.toScreen(lastLo, ev.x, ev.y);
    const p = { x: P.x / view.dpr, y: P.y / view.dpr };
    const mine = ev.kind === 'shot';
    const good = mine ? ev.result === 'goal' : ev.result !== 'goal';
    const R = robot();
    const TXT = {
      shot: { goal: [ev.viaPaal ? 'VIA DE PAAL... GOAL!' : 'GOAL!', `+${res.points}`], save: ['GERED!', `${R.name} heeft hem`], paal: ['PAAL!', 'Net niet...'], naast: ['NAAST!', 'Mik iets meer naar binnen'], over: ['OVER!', 'Te hoog: tik vroeger voor de hoogte'] },
      keep: { goal: ['GOAL...', ev.early ? 'Te vroeg gedoken: hij schoot naar de andere kant!' : `${R.name} scoort`], save: ['GERED!', `Knap gekeept! +${res.points}`], paal: ['PAAL!', `${R.name} mist! +${res.points}`], naast: ['NAAST!', `${R.name} mist! +${res.points}`], over: ['OVER!', `${R.name} mist! +${res.points}`] },
    }[ev.kind][ev.result] || ['', ''];
    banner(TXT[0], TXT[1], good ? 'gold' : 'bad');
    if (ev.result === 'goal') {
      fx.burst(p.x, p.y, { n: 40, color: ev.gold ? '#ffc94a' : '#5ee7ff', speed: 420, life: .8, size: 4 });
      fx.shock(p.x, p.y, 70, ev.gold ? '#ffc94a' : '#5ee7ff');
      g.ripple = { x: ev.x, y: ev.y, t: sec(), gold: ev.gold };
    } else if (ev.result === 'save') {
      fx.sparks(p.x, p.y, { n: 16, color: '#ffffff', speed: 360 });
    } else if (ev.result === 'paal') {
      fx.sparks(p.x, p.y, { n: 12, color: '#ffc94a', speed: 300 });
    }
    if (good) { sfx.good(); buzz([30, 40, 30]); } else { sfx.bad(); buzz(150); }
    if (ev.result === 'goal' || ev.result === 'paal') sfx.hit();
    g.match.a = res.a;
    g.match.b = res.b;
    if (mine) g.match.gold = false; else g.match.shield = false;
    chips();
  }

  // Na de trap: verder, of de wedstrijd is beslist.
  function finishKick(A) {
    const res = A.res;
    if (!res) return next();
    g.match.turn = res.turn;
    if (res.end) {
      const R = W.ROBOTS[res.robot];
      const won = res.end.won;
      g.match = { ...g.match, robot: res.end.robot, tier: res.end.tier, a: [], b: [], turn: 'shoot' };
      overlay(won ? (res.champ ? '🏆 KAMPIOEN!' : 'GEWONNEN!') : 'Verloren...',
        won ? `${res.end.ga}-${res.end.gb} tegen ${R.name}. Volgende: ${W.ROBOTS[res.end.robot].name}${stars(res.end.tier)}` : `${res.end.ga}-${res.end.gb}. Nog een kans tegen ${R.name}!`,
        won ? W.ROBOTS[res.end.robot] : R);
      if (won) { sfx.fanfare(); confetti(res.champ ? 5000 : 2200); } else sfx.empty();
      chips();
      setMode('match');
      setTimeout(() => { $('pp-overlay').classList.add('hidden'); next(); }, 3000);
      return;
    }
    next();
  }

  // ---------- Besturing ----------
  const DIVE = { arrowleft: -1, a: -1, q: -1, arrowright: 1, d: 1, arrowup: 0, w: 0, z: 0, ' ': 0, arrowdown: 0, s: 0 };
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('pp-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const key = e.key.toLowerCase();
    if (g.mode === 'keep' && key in DIVE) { e.preventDefault(); dive(DIVE[key]); return; }
    if (key === ' ' || key === 'enter') { e.preventDefault(); if (!e.repeat) tap(); }
  });
  $('pp-stage').addEventListener('pointerdown', e => {
    if (e.target.closest('button, .ak-question')) return;
    if (g.mode === 'keep') {
      const r = $('pp-stage').getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      dive(f < .36 ? -1 : f > .64 ? 1 : 0);
    } else tap();
  });
  for (const b of document.querySelectorAll('.pp-dive')) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); dive(Number(b.dataset.dir)); });
  }

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('pp-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function hint(text) {
    const el = $('pp-toast');
    clearTimeout(toastTimer);
    if (!text) { el.classList.remove('show'); return; }
    el.textContent = text;
    el.className = 'tw-toast show';
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('pp-banner');
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
  function overlay(title, sub, R) {
    $('pp-ov-title').textContent = title;
    $('pp-ov-sub').textContent = `${sub}${R && R.tip ? ' · ' + R.tip : ''}`;
    const c = $('pp-ov-art'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (R) PpDraw.portrait(x, 100, 58, 48, { color: R.color, eye: R.eye });
    $('pp-overlay').classList.remove('hidden');
  }

  // ---------- Elke frame ----------
  const canvas = $('pp-canvas');
  const ctx = canvas.getContext('2d');
  let view = { dpr: 1 };
  let lastLo = null;
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('pp-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('pp-clock').textContent = AK.clock(left);
    $('pp-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('pp-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('pp-countdown').textContent = Math.ceil(wait / 1000);
    if (playing() && g.mode === 'idle') next();
    if (!quiz.open) g.modeT += dt;
    const T = sec();
    const fit = AK.fit(canvas, 1.5);
    view = fit;
    const R = robot();
    const s = { t: T };
    const A = g.anim;
    if (g.mode === 'aimx' || g.mode === 'aimy') {
      s.aim = { phase: g.mode === 'aimx' ? 'x' : 'y', x: g.mode === 'aimx' ? W.aimX(g.modeT, g.match.gold) : g.aim.x, y: g.mode === 'aimy' ? W.aimY(g.modeT, g.match.gold) : .5, gold: g.match.gold };
    }
    const kickT = A ? A.t0 + A.run : 0;
    // Wacht met de aankomst tot de server geantwoord heeft.
    if (A && !A.ev.result && T > kickT + A.fly - .04) {
      if (A.ev.kind === 'keep' && !g.dive && !A.sent) { A.sent = true; sendDive(0, 9999); }
      A.t0 += dt;
    }
    if (A && A.ev.kind === 'keep' && !g.dive && !A.sent && T > kickT + A.fly - .09) { A.sent = true; sendDive(0, 9999); }
    const mineShot = !A || A.ev.kind === 'shot';
    // De keeper
    let kdive = { x: 0, y: 0, k: 0 };
    if (A && A.ev.kind === 'shot' && A.ev.result) kdive = { x: A.ev.kx, y: A.ev.ky, k: (T - kickT - .05) / .32 };
    if (A && A.ev.kind === 'keep' && g.dive) {
      const d = g.dive.dir;
      const hit = A.ev.result === 'save' && W.zoneOf(A.ev.x) === d;
      kdive = hit ? { x: A.ev.x, y: A.ev.y, k: (T - g.dive.at) / .3 } : { x: d * .78, y: d ? .42 : .65, k: (T - g.dive.at) / .3 };
    }
    const keeping = g.mode === 'keep' || g.mode === 'keepwait' || (A && A.ev.kind === 'keep');
    s.keeper = keeping
      ? { mech: false, color: g.color, dive: kdive, shield: g.match.shield || (g.keepRes && g.keepRes.shield && A && !A.res), ready: true, ring: true }
      : { mech: true, color: R.color, eye: R.eye, dive: kdive, ready: true };
    // De schutter
    const run = A ? Math.min(1, (T - A.t0) / A.run) : 0;
    const kick = A && T > kickT - .08 ? Math.max(0, 1 - Math.abs(T - kickT) / .25) : 0;
    s.shooter = keeping ? { mech: true, color: R.color, eye: R.eye, run: A ? run : 1, kick } : { mech: false, color: g.color, run: A ? run : 1, kick };
    // Het verraad: een rood hologram vlak voor de trap
    if (A && A.ev.kind === 'keep' && g.keepRes && !A.res) {
      const from = kickT - g.keepRes.tellMs / 1000;
      if (T > from && T < kickT + .15) s.tell = { x: g.keepRes.x, y: g.keepRes.y, a: g.keepRes.clarity * (.65 + Math.sin(T * 30) * .35) };
    }
    // De bal
    if (!A && (g.mode === 'aimx' || g.mode === 'aimy' || g.mode === 'vraag' || g.mode === 'keepwait' || g.mode === 'match' || g.mode === 'idle')) {
      A_rest.ev.gold = g.match.gold && !keeping;
    }
    const lo = PpDraw.layout(fit.w, fit.h);
    const b = PpDraw.ballAt(lo, A || A_rest, T);
    b.gold = A ? A.ev.gold : g.match.gold && !keeping;
    if (A) {
      if (b.phase === 'fly') { A.trail.push({ x: b.x, y: b.y, r: b.r }); if (A.trail.length > 10) A.trail.shift(); }
      else if (A.trail.length) A.trail.shift();
      b.trail = A.trail;
      if (b.phase === 'fly' && !A.kicked) { A.kicked = true; sfx.swoosh(); }
      if ((b.phase === 'net' || b.phase === 'out') && !A.landed && A.res) { A.landed = true; lastLo = lo; landed(A); }
      if (A.landed && b.q > 1.15 && !A.done) { A.done = true; finishKick(A); }
    }
    s.ball = b;
    if (g.ripple) s.ripple = { x: g.ripple.x, y: g.ripple.y, q: T - g.ripple.t, gold: g.ripple.gold };
    lastLo = PpDraw.render(ctx, fit.w, fit.h, s);
    drawScore(fit, lo, mineShot);
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
  }
  const A_rest = { ev: { x: 0, y: 0, kind: 'shot' }, t0: 1e12, run: 1, fly: 1 };

  // Het scorebord bovenaan: jouw 5 trappen en die van de robot.
  function drawScore(fit) {
    const k = fit.dpr;
    const R = robot();
    const n = Math.max(W.KICKS, g.match.a.length, g.match.b.length);
    const dot = 9 * k, gap = 24 * k;
    const wName = 120 * k;
    const width = wName + n * gap + 16 * k;
    const x0 = fit.w / 2 - width / 2, y0 = 8 * k;
    ctx.fillStyle = 'rgba(5,6,15,.72)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x0, y0, width, 52 * k, 10 * k) : ctx.rect(x0, y0, width, 52 * k);
    ctx.fill();
    ctx.font = `800 ${12 * k}px Orbitron, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const rows = [[g.name || 'Jij', g.color, g.match.a], [R.name, R.color, g.match.b]];
    rows.forEach(([name, col, list], i) => {
      const y = y0 + 16 * k + i * 21 * k;
      ctx.fillStyle = col;
      ctx.fillText(name.length > 11 ? name.slice(0, 10) + '…' : name, x0 + 10 * k, y);
      for (let j = 0; j < n; j++) {
        const cx = x0 + wName + j * gap + 8 * k;
        const v = list[j];
        ctx.beginPath(); ctx.arc(cx, y, dot / 1.6, 0, Math.PI * 2);
        if (v === true) { ctx.fillStyle = '#4ade80'; ctx.fill(); }
        else if (v === false) { ctx.fillStyle = '#ff4d6d'; ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2 * k; ctx.stroke(); }
      }
    });
  }
  requestAnimationFrame(frame);
})();
