// Poortwacht op de gsm of Chromebook: de kaart met jouw toren, je goud, en de vragen altijd naast (of onder) de kaart.
// Een goed antwoord geeft goud; daarmee bouw je je toren en verbeter je hem. Drie op rij: ⚡ bliksem.
// Toetsen: 1-4 antwoorden, U verbeteren, spatie bliksem, L/K/I laser, katapult of ijs.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, PwWorld en PwDraw.
(() => {
  const T = PwWorld.TOWERS;
  const root = document.createElement('div');
  root.id = 'poort';
  root.innerHTML = `
  <form id="pw-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Poortwacht</p>
    <input id="pw-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="pw-join-error"></p>
    <button type="submit" class="big">Naar de poort</button>
  </form>
  <section id="pw-lobby" class="screen panel hidden">
    <p class="status">Poortwacht</p>
    <p class="title" id="pw-lobby-name"></p>
    <p>Samen verdedigen jullie de <strong>burchtpoort</strong>. Jij krijgt een eigen <strong>torenplaats</strong> langs het pad.</p>
    <p><strong>Goede antwoorden geven goud.</strong> Bouw een 🔷 lasertoren, ☄️ katapult of ❄️ ijstoren en maak hem sterker. Drie op rij: ⚡ bliksem!</p>
    <p class="muted small">Een fout antwoord: even wachten, de vraag komt later terug. Op het einde komt de draak…</p>
    <p class="muted small ls-hint-keys">1-4 antwoorden · U toren sterker · spatie bliksem · L/K/I kies je toren</p>
    <div class="spinner"></div>
  </section>
  <section id="pw-game" class="ak-game pw-game hidden">
    <div class="ls-hud ak-hud">
      <div class="pw-gold" id="pw-gold"></div>
      <div class="ry-ammo" id="pw-bolts"></div>
      <div class="ry-alive" id="pw-rank"></div>
      <div class="ls-clock" id="pw-clock"></div>
    </div>
    <div class="pw-body">
      <div class="ls-stage pw-stage" id="pw-stage">
        <canvas id="pw-canvas"></canvas>
        <div class="ls-banner" id="pw-banner"></div>
        <div class="tw-toast" id="pw-toast"></div>
        <div class="tw-countdown hidden" id="pw-countdown"></div>
      </div>
      <div class="pw-dock" id="pw-dock">
        <div class="pw-tower" id="pw-tower"></div>
      </div>
    </div>
  </section>
  <section id="pw-end" class="screen panel hidden">
    <div class="mark" id="pw-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="pw-end-title"></p>
    <p class="big" id="pw-end-score" style="font-size:1.6rem"></p>
    <p id="pw-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, scene: new PwDraw.Scene(), me: null, roster: new Map() };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.pw === '1';
  const show = name => { for (const s of ['pw-join', 'pw-lobby', 'pw-game', 'pw-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('pw-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('pw-join-error').textContent = res.error;
        show('pw-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('pw-join-error').textContent = '';
    });
  }
  $('pw-join').addEventListener('submit', e => { e.preventDefault(); join($('pw-name').value); });

  socket.on('pw-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.pw = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    g.roster = new Map(s.roster.map(r => [r.n, r]));
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.scene = new PwDraw.Scene();
      g.scene.onEvent = onEvent;
      quiz.close();
      delete $('pw-end').dataset.done;
    }
    g.scene.setTowers(s.towers, s.slots);
    g.scene.gate = s.gate;
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('pw-name').value = saved || '';
        show('pw-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('pw-lobby-name').textContent = s.name;
      show('pw-lobby');
    } else if (s.phase === 'play') {
      show('pw-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('pw-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
      if (!quiz.open) quiz.show();
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      $('pw-end-medal').textContent = s.won ? '🏆' : '💥';
      $('pw-end-title').textContent = s.won ? 'De poort hield stand!' : 'De poort is gevallen…';
      $('pw-end-score').textContent = `${me.score || 0} punten · plek ${me.rank || '-'} van ${me.players || '-'}`;
      $('pw-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.kills || 0} monsters verslagen${me.tower ? ` · ${T[me.tower.type].name} niveau ${me.tower.lvl}` : ''}`;
      if (!$('pw-end').dataset.done && s.won) confetti(4000);
      $('pw-end').dataset.done = '1';
      show('pw-end');
    }
  });

  socket.on('pw-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('pw-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('pw-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('pw-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    g.scene.apply(msg);
    if (msg.me) setMe(msg.me);
  });

  function setMe(me) {
    const old = g.me;
    g.me = me;
    g.scene.meSlot = me.slot;
    if (old && me.tower && old.tower && me.tower.lvl > old.tower.lvl) { sfx.power(); buzz([30, 30, 60]); }
    hud();
  }

  // ---------- Toren-knoppen ----------
  let lastPanel = '';
  function hud() {
    const me = g.me;
    if (!me) return;
    $('pw-gold').textContent = `💰 ${me.gold}`;
    $('pw-bolts').textContent = `⚡ ${me.bolt}`;
    $('pw-bolts').classList.toggle('empty', me.bolt <= 0);
    $('pw-rank').textContent = me.rank ? `#${me.rank} · ${me.score} p` : '';
    const tw = me.tower;
    const key = JSON.stringify([tw, me.gold, me.bolt]);
    if (key === lastPanel) return;
    lastPanel = key;
    const box = $('pw-tower');
    if (!tw) {
      box.innerHTML = `<p class="pw-tip">${me.gold >= PwWorld.BUILD ? 'Kies je toren:' : `Bouwen kost ${PwWorld.BUILD} goud. Beantwoord een vraag!`}</p>
        <div class="pw-types">${Object.entries(T).map(([k, s]) => `<button type="button" class="pw-type" data-type="${k}" style="--c:${s.color}" ${me.gold < PwWorld.BUILD ? 'disabled' : ''}><b>${s.icon}</b><span>${s.name}</span><small>${PwWorld.BUILD} 💰</small></button>`).join('')}</div>`;
    } else {
      const cost = PwWorld.UPGRADE[tw.lvl];
      const max = tw.lvl >= PwWorld.MAX_LVL;
      box.innerHTML = `<div class="pw-row">
          <button type="button" class="pw-up gold" id="pw-up" ${max || me.gold < cost ? 'disabled' : ''}>${max ? `⭐ ${T[tw.type].name} · max` : `⬆ Niveau ${tw.lvl + 1}<small>${cost} 💰</small>`}</button>
          <button type="button" class="pw-bolt ${me.bolt > 0 ? 'ready' : ''}" id="pw-bolt">⚡<small>Bliksem</small></button>
        </div>
        <div class="pw-types small">${Object.entries(T).map(([k, s]) => `<button type="button" class="pw-type ${k === tw.type ? 'on' : ''}" data-type="${k}" style="--c:${s.color}" ${k === tw.type || me.gold < PwWorld.SWITCH ? 'disabled' : ''} title="Ombouwen: ${PwWorld.SWITCH} goud"><b>${s.icon}</b><span>${s.name}</span></button>`).join('')}</div>`;
      $('pw-up').addEventListener('click', upgrade);
      $('pw-bolt').addEventListener('click', bolt);
    }
    for (const b of box.querySelectorAll('.pw-type')) b.addEventListener('click', () => build(b.dataset.type));
  }

  function build(type) {
    socket.emit('pw-build', type, res => {
      if (res.error) return toast(res.error, 'bad');
      sfx.power();
      buzz(40);
      banner(T[type].icon, `${T[type].name} gebouwd!`, 'gold');
    });
  }
  function upgrade() {
    socket.emit('pw-upgrade', null, res => {
      if (res.error) { sfx.empty(); return toast(res.error, 'bad'); }
      banner(`NIVEAU ${res.lvl}`, 'Je toren is sterker!', 'gold');
    });
  }
  function bolt() {
    if (!g.me || g.me.bolt <= 0) { sfx.empty(); return toast('Geen bliksem: 3 juist op rij!', 'bad'); }
    socket.emit('pw-bolt', null, res => {
      if (res.error) return toast(res.error, 'bad');
      buzz([60, 40, 120]);
      banner('⚡ BLIKSEM!', res.hit ? `${res.hit} ${res.hit === 1 ? 'monster' : 'monsters'} geraakt` : 'Geen monsters in de buurt…', 'big');
    });
  }

  function onEvent(e) {
    if (!g.me) return;
    if (e[0] === 'golf' && e[1] > 1) toast(`⚔️ Golf ${e[1]}`);
    else if (e[0] === 'draak') { banner('🐉 DE DRAAK!', 'Alle torens vuur!', 'bad'); sfx.drumroll(); buzz([100, 60, 100]); }
    else if (e[0] === 'poort') { if (g.scene.gate < 30) buzz(80); }
    else if (e[0] === 'k' && e[2] === g.me.slot) sfx.marker();
    else if (e[0] === 'bliksem') sfx.boom();
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('pw-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('pw-banner');
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

  // ---------- Vragen: altijd open naast de kaart ----------
  const quiz = AK.quiz({
    root: $('pw-dock'),
    closeText: 'Sluiten',
    status: res => `Juist = goud voor je toren · jij hebt ${res.gold} 💰`,
    ask: cb => socket.emit('pw-question', null, cb),
    answer: (i, cb) => socket.emit('pw-answer', i, cb),
    good: res => `Juist! +${res.gained} goud${res.gotBolt ? ' · ⚡ bliksem!' : ''}`,
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: () => true,
    close: () => setTimeout(() => { if (on() && g.state && g.state.phase === 'play') quiz.show(); }, 400),
  });

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('pw-game').classList.contains('hidden')) return;
    if (e.key === 'Escape') return;
    if (quiz.key(e)) {
      if (/^[1-4]$/.test(e.key)) { e.preventDefault(); return; }
    }
    const k = e.key.toLowerCase();
    if (e.repeat) return;
    if (k === 'u') upgrade();
    else if (e.key === ' ' || k === 'b') { e.preventDefault(); bolt(); }
    else if (k === 'l') build('laser');
    else if (k === 'k') build('katapult');
    else if (k === 'i') build('ijs');
  });

  // ---------- Elke frame ----------
  const canvas = $('pw-canvas');
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('pw-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('pw-clock').textContent = AK.clock(left);
    $('pw-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('pw-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('pw-countdown').textContent = Math.ceil(wait / 1000);
    g.scene.update(dt);
    const { w, h } = AK.fit(canvas, 1.25);
    PwDraw.render(ctx, g.scene, w, h, { roster: g.roster, me: g.me ? g.me.slot : -1, labels: 'me' });
  }
  g.scene.onEvent = onEvent;
  requestAnimationFrame(frame);
})();
