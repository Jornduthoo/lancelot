// Ontsnap uit de kerker op de gsm of Chromebook: je staat met je klas voor dezelfde deur als op het bord.
// Beantwoord vragen om de deur te helpen openen. Bij het runenslot zie jij één of meer runen van de code:
// vertel ze aan je klasgenoten en typ samen de code in (klik op de runen, of de toetsen 1 tot 8).
// Spatie of ⚡ = vraag. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, KkWorld en KkDraw.
(() => {
  const W = KkWorld;
  const root = document.createElement('div');
  root.id = 'kerker';
  root.innerHTML = `
  <form id="kk-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Ontsnap uit de kerker</p>
    <input id="kk-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="kk-join-error"></p>
    <button type="submit" class="big">De kerker in</button>
  </form>
  <section id="kk-lobby" class="screen panel hidden">
    <img class="game-logo" src="/img/icons/kerker.webp" alt="" style="width:96px;height:96px;border-radius:18px">
    <p class="status">Ontsnap uit de kerker</p>
    <p class="title" id="kk-lobby-name"></p>
    <p>De hele klas zit <strong>opgesloten</strong> in de kerker. Alleen <strong>samen</strong> komen jullie buiten, deur na deur.</p>
    <p>🗝️ Sleuteldeur · ᛟ Runenslot · 🔴 Laserhek · ⛓️ Valhek · 🤖 de Kerkermeester</p>
    <p>Elk juist antwoord helpt de deur open. Bij het runenslot krijg jij een stukje van de code: <strong>vertel het aan je klas!</strong></p>
    <p class="muted small ls-hint-keys">Toetsen 1 tot 4 = antwoord · spatie = vraag · bij het runenslot: 1 tot 8 = rune, Enter = openen.</p>
    <div class="spinner"></div>
  </section>
  <section id="kk-game" class="ak-game kk-game hidden">
    <div class="ls-hud ak-hud">
      <div class="kk-door-name" id="kk-door"></div>
      <div class="kk-prog" id="kk-prog"><i></i><span></span></div>
      <div class="kk-help" id="kk-help"></div>
      <div class="ls-clock" id="kk-clock"></div>
    </div>
    <div class="ls-stage" id="kk-stage">
      <canvas id="kk-canvas"></canvas>
      <div class="kk-how" id="kk-how"></div>
      <div class="ls-banner" id="kk-banner"></div>
      <div class="tw-toast" id="kk-toast"></div>
      <div class="tw-countdown hidden" id="kk-countdown"></div>
      <div class="kk-runes hidden" id="kk-runes">
        <p class="kk-runes-kop">Typ de code van het runenslot</p>
        <div class="kk-slots" id="kk-slots"></div>
        <div class="kk-pad" id="kk-pad"></div>
        <p class="kk-runes-msg" id="kk-runes-msg"></p>
        <div class="kk-runes-knoppen"><button type="button" class="secondary" id="kk-wis">Wissen</button><button type="button" class="gold" id="kk-open">🔓 Open het slot</button></div>
      </div>
      <button type="button" class="gold kk-ask" id="kk-ask">⚡ Vraag</button>
    </div>
  </section>
  <section id="kk-end" class="screen panel hidden">
    <div class="kk-stars" id="kk-end-stars"></div>
    <p class="title" id="kk-end-title"></p>
    <p class="big" id="kk-end-score" style="font-size:1.4rem"></p>
    <p id="kk-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de uitslag.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const keyboard = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const scene = new KkDraw.Scene();
  const g = { state: null, joined: false, run: -1, offset: 0, me: null, cur: null, prev: null, roster: new Map(), guess: [null, null, null, null], others: [], jumps: new Map(), shift: 0 };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.kk === '1';
  const show = name => { for (const s of ['kk-join', 'kk-lobby', 'kk-game', 'kk-end']) $(s).classList.toggle('hidden', s !== name); };

  function join(name) {
    socket.emit('kk-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('kk-join-error').textContent = res.error;
        show('kk-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('kk-join-error').textContent = '';
    });
  }
  $('kk-join').addEventListener('submit', e => { e.preventDefault(); join($('kk-name').value); });

  socket.on('kk-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.kk = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.cur = g.prev = null;
      g.guess = [null, null, null, null];
      quiz.close();
      delete $('kk-end').dataset.done;
    }
    setRoster(s.roster);
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('kk-name').value = saved || '';
        show('kk-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.door) setDoor(s.door);
    if (s.phase === 'lobby') {
      $('kk-lobby-name').textContent = s.name;
      show('kk-lobby');
    } else if (s.phase === 'play') {
      show('kk-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('kk-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
    } else if (s.phase === 'einde') {
      quiz.close();
      const r = s.result || {};
      const me = s.me || {};
      const free = r.outcome === 'ontsnapt';
      $('kk-end-stars').innerHTML = free ? [1, 2, 3].map(i => `<i class="${i <= r.stars ? 'on' : ''}" style="animation-delay:${i * 250}ms">★</i>`).join('') : '<i class="slot">🔒</i>';
      $('kk-end-title').textContent = free ? 'Ontsnapt! Jullie zijn buiten!' : `${r.opened} van de ${r.doors} deuren open`;
      $('kk-end-score').textContent = `Jij hielp ${me.help || 0} keer`;
      $('kk-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist${me.rank === 1 ? ' · jij hielp het meest!' : ''}`;
      if (!$('kk-end').dataset.done && free) confetti(4000);
      $('kk-end').dataset.done = '1';
      show('kk-end');
    }
  });

  socket.on('kk-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('kk-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('kk-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('kk-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    const before = g.cur;
    if (msg.me) setMe(msg.me);
    if (msg.door) setDoor(msg.door);
    const t = performance.now();
    for (const e of msg.ev || []) {
      if (e[0] === 'open') {
        sfx.boom();
        setTimeout(() => sfx.fanfare(), 300);
        buzz([60, 40, 120]);
        const info = W.DOORS[(before && before.i === e[1] ? before : g.prev || {}).type] || {};
        banner(`${info.name || 'De deur'} is open!`, 'Op naar de volgende…', 'gold');
        continue;
      }
      if (typeof e[1] === 'number') g.jumps.set(e[1], t);
      scene.event(e, view3(), t);
    }
  });

  // Jij in het midden vooraan, een paar klasgenoten naast je.
  function setRoster(list) {
    g.roster = new Map(list.map(r => [r.n, r]));
    const me = g.me ? g.me.n : -1;
    const others = list.filter(r => r.n !== me).slice(0, 6);
    const row = [];
    others.forEach((r, i) => (i % 2 ? row.push(r) : row.unshift(r)));
    const mine = g.roster.get(me);
    if (mine) row.splice(Math.floor(row.length / 2), 0, { ...mine, me: true });
    g.others = row;
  }

  function setMe(me) {
    const first = !g.me;
    g.me = me;
    if (first && g.state) setRoster(g.state.roster);
    $('kk-help').textContent = `🤝 ${me.help}`;
    $('kk-help').title = 'Zo vaak hielp jij de deur open';
    renderRunes();
  }

  function setDoor(door) {
    if (g.cur && g.cur.i !== door.i) {
      g.prev = g.cur;
      g.guess = [null, null, null, null];
      $('kk-runes-msg').textContent = '';
    }
    g.cur = door;
    const info = W.DOORS[door.type];
    const plan = g.state.plan || [];
    $('kk-door').innerHTML = `<small>Deur ${door.i + 1}/${plan.length}</small> ${AK.esc(info.name)}`;
    $('kk-door').style.color = info.color;
    const k = door.type === 'lier' ? door.meter : door.type === 'bewaker' ? 1 - door.hp / Math.max(1, door.maxHp) : door.have / Math.max(1, door.need);
    $('kk-prog').firstElementChild.style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
    $('kk-prog').firstElementChild.style.background = info.color;
    $('kk-prog').lastElementChild.textContent = door.type === 'lier' ? `${Math.round(door.meter * 100)}%` : door.type === 'bewaker' ? `❤ ${door.hp}` : `${door.have}/${door.need}`;
    const how = $('kk-how');
    if (how.dataset.door !== String(door.i)) {
      how.dataset.door = door.i;
      how.innerHTML = `<strong style="color:${info.color}">${AK.esc(info.name)}</strong><span>${AK.esc(info.how)}</span>`;
      how.classList.remove('weg');
      clearTimeout(how.timer);
      how.timer = setTimeout(() => how.classList.add('weg'), 7000);
    }
    renderRunes();
  }

  // ---------- Runenslot ----------
  const pad = $('kk-pad');
  pad.innerHTML = W.RUNES.map((r, i) => `<button type="button" data-r="${i}" title="${r.name}">${W.runeSvg(i, 30)}<span>${r.name}</span>${keyboard ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('');
  pad.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) put(Number(b.dataset.r));
  });
  $('kk-slots').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const pos = Number(b.dataset.pos);
    if (known()[pos] !== undefined) return;
    g.guess[pos] = null;
    renderRunes();
  });
  $('kk-wis').addEventListener('click', () => { g.guess = [null, null, null, null]; renderRunes(); });
  $('kk-open').addEventListener('click', tryCode);

  const known = () => (g.me && g.me.known) || {};
  const hints = () => new Map((g.cur && g.cur.hints) || []);
  // Wat er in een vakje staat: wat jij weet, wat het bord als hulp toont, of wat je zelf koos.
  function slot(pos) {
    const k = known();
    if (k[pos] !== undefined) return { r: k[pos], fixed: 'mine' };
    const h = hints().get(pos);
    if (h !== undefined) return { r: h, fixed: 'hint' };
    return { r: g.guess[pos], fixed: '' };
  }
  function put(r) {
    if (!runesOpen()) return;
    for (let pos = 0; pos < 4; pos++) {
      const s = slot(pos);
      if (!s.fixed && s.r === null) { g.guess[pos] = r; sfx.marker(); renderRunes(); return; }
    }
  }
  function runesOpen() {
    return g.cur && g.cur.type === 'runen' && g.state && g.state.phase === 'play' && !quiz.open;
  }
  function renderRunes() {
    const box = $('kk-runes');
    const isRunen = g.cur && g.cur.type === 'runen';
    box.classList.toggle('hidden', !isRunen || quiz.open);
    if (!isRunen) { $('kk-ask').textContent = '⚡ Vraag'; return; }
    const k = known();
    const mine = Object.keys(k).length;
    $('kk-slots').innerHTML = [0, 1, 2, 3].map(pos => {
      const s = slot(pos);
      return `<button type="button" data-pos="${pos}" class="${s.fixed} ${s.r !== null && s.r !== undefined ? 'vol' : ''}"><small>${pos + 1}</small>${s.r !== null && s.r !== undefined ? W.runeSvg(s.r, 34) + `<span>${W.RUNES[s.r].name}</span>` : '<i>?</i>'}</button>`;
    }).join('');
    const full = [0, 1, 2, 3].every(pos => slot(pos).r !== null && slot(pos).r !== undefined);
    $('kk-open').disabled = !full;
    $('kk-ask').textContent = mine >= 4 ? '⚡ Vraag' : '⚡ Rune zoeken';
    box.classList.toggle('alles', full);
  }
  let codeBusy = false;
  function tryCode() {
    if (codeBusy || !runesOpen()) return;
    const guess = [0, 1, 2, 3].map(pos => slot(pos).r);
    if (guess.some(r => r === null || r === undefined)) { toast('Vul eerst alle vier de vakjes.', 'bad'); return; }
    codeBusy = true;
    socket.emit('kk-code', guess, res => {
      codeBusy = false;
      if (!res || res.error) { toast(res && res.error ? res.error : 'Dat lukte niet.', 'bad'); return; }
      if (res.ok) { banner('ᛟ GEKRAAKT!', 'Jij opende het runenslot!', 'gold'); sfx.power(); buzz([40, 30, 80]); return; }
      scene.badAt = performance.now();
      sfx.bad();
      buzz(200);
      $('kk-runes-msg').textContent = `${res.good} van de 4 staan juist. Vraag de anderen welke rune ze kennen!`;
      // Wat fout stond, maken we leeg (wat je zeker weet blijft staan).
      g.guess = [null, null, null, null];
      renderRunes();
    });
  }

  // ---------- Vragen ----------
  const quiz = AK.quiz({
    root: $('kk-game'),
    closeText: 'Naar de deur',
    status: () => {
      const t = g.cur && g.cur.type;
      return t === 'runen' ? 'Juist = jij ziet een rune van de code' : t === 'laser' ? 'Juist = jouw lampje gaat aan' : t === 'lier' ? 'Juist = de lier draait' : t === 'bewaker' ? 'Juist = treffer op de Kerkermeester' : 'Juist = een sleutel voor de deur';
    },
    ask: cb => socket.emit('kk-question', null, cb),
    answer: (i, cb) => socket.emit('kk-answer', i, res => {
      if (res && res.correct && g.me) g.jumps.set(g.me.n, performance.now());
      cb(res);
    }),
    good: res => {
      if (res.rune) {
        const name = W.RUNES[res.rune.r].name;
        if (g.me) { g.me.known = { ...(g.me.known || {}), [res.rune.pos]: res.rune.r }; renderRunes(); }
        setTimeout(() => { banner(`Rune ${res.rune.pos + 1} = ${name}`, 'Roep het naar je klas!', 'gold'); sfx.power(); }, 700);
        return `Juist! Je vond rune ${res.rune.pos + 1}: ${name}`;
      }
      if (res.all) return 'Juist! Jij kent alle runen al: typ de code in!';
      if (res.lamp) return 'Juist! Jouw lampje brandt 🔴→🟢';
      if (res.dmg) return res.dmg > 1 ? `Juist! Dubbele treffer (${res.streak} op rij)` : 'Juist! Treffer!';
      if (res.keys > 1) return 'Juist! Een gouden sleutel: telt dubbel!';
      if (res.type === 'lier') return 'Juist! De lier draait';
      return 'Juist! Je sleutel vliegt naar het slot';
    },
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    // Bij het runenslot ga je na een juist antwoord terug naar de deur, om je rune te delen.
    next: res => !(g.cur && g.cur.type === 'runen' && (res.rune || res.all)),
    close: () => renderRunes(),
  });
  function ask() {
    if (!g.state || g.state.phase !== 'play') return;
    quiz.show();
    $('kk-how').classList.add('weg');
    renderRunes();
  }
  $('kk-ask').addEventListener('click', e => { e.currentTarget.blur(); sfx.unlock(); ask(); });

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('kk-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (runesOpen()) {
      if (/^[1-8]$/.test(e.key)) { e.preventDefault(); put(Number(e.key) - 1); return; }
      if (e.key === 'Backspace') {
        e.preventDefault();
        for (let pos = 3; pos >= 0; pos--) if (!slot(pos).fixed && g.guess[pos] !== null) { g.guess[pos] = null; break; }
        renderRunes();
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); tryCode(); return; }
    }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ask(); }
  });

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('kk-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('kk-banner');
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

  // ---------- Elke frame ----------
  const canvas = $('kk-canvas');
  const ctx = canvas.getContext('2d');
  function view3() {
    const knights = g.others.map(r => ({ ...r, jumpAt: g.jumps.get(r.n) }));
    return { door: g.cur, prev: g.prev, serverNow: now(), roster: g.roster, knights, known: known() };
  }
  let last = performance.now();
  function frame(pt) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (pt - last) / 1000);
    last = pt;
    if (!on() || !g.state || g.state.phase !== 'play' || !g.cur || $('kk-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('kk-clock').textContent = AK.clock(left);
    $('kk-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('kk-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('kk-countdown').textContent = Math.ceil(wait / 1000);
    const { w, h } = AK.fit(canvas, 1.5);
    scene.resize(w, h);
    // Staat de vraag open, dan schuift de gang opzij (Chromebook) of omhoog (gsm), zodat je de deur blijft zien.
    const target = quiz.open ? 1 : 0;
    g.shift += (target - g.shift) * Math.min(1, dt * 8);
    const tall = w < h;
    const v = view3();
    v.shift = g.shift > .002 ? (tall ? [0, -h * .1 * g.shift] : [-w * .22 * g.shift, 0]) : null;
    scene.fx.update(dt);
    scene.draw(ctx, pt, v);
  }
  requestAnimationFrame(frame);
})();
