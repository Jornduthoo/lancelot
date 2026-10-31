// Diepboor op de gsm of Chromebook: je boorridder in je eigen mijn, met de vragen altijd naast (of onder) de mijn.
// Een goed antwoord geeft brandstof. Graaf naar beneden, breng je stenen naar boven en koop upgrades in de smidse.
// Toetsen: pijltjes of WASD/ZQSD rijden, graven en vliegen; 1-4 antwoorden; T teleport naar boven.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, DbWorld en DbDraw.
(() => {
  const W = DbWorld;
  const { T, UPGRADES: UP } = W;
  const root = document.createElement('div');
  root.id = 'diep';
  root.innerHTML = `
  <form id="db-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Diepboor</p>
    <input id="db-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="db-join-error"></p>
    <button type="submit" class="big">Naar de mijn</button>
  </form>
  <section id="db-lobby" class="screen panel hidden">
    <p class="status">Diepboor</p>
    <p class="title" id="db-lobby-name"></p>
    <p>Jij stuurt een <strong>boorridder</strong> de diepte in. Hoe dieper, hoe kostbaarder de stenen: koper, zilver, goud, kristal… en de 💗 neonkern.</p>
    <p><strong>Goede antwoorden geven brandstof.</strong> Breng je stenen naar boven: in de smidse worden ze goud, en daarmee koop je een betere boor.</p>
    <p class="muted small">Pas op voor 🔥 lava, 🟢 gas en diepe vallen. Een fout antwoord: even wachten, de vraag komt later terug.</p>
    <p class="muted small ls-hint-keys">Pijltjes of WASD: rijden, graven en vliegen · 1-4 antwoorden · T teleport naar boven</p>
    <p class="muted small ls-hint-touch">Knoppen op de mijn: ◀ ▶ rijden, ▼ graven, ▲ ingedrukt houden om naar boven te vliegen. Tik op een antwoord voor brandstof.</p>
    <div class="spinner"></div>
  </section>
  <section id="db-game" class="ak-game pw-game hidden">
    <div class="ls-hud ak-hud">
      <div class="db-bar fuel" id="db-fuel"><i></i><span></span></div>
      <div class="db-bar hull" id="db-hull"><i></i><span></span></div>
      <div class="pw-gold" id="db-gold"></div>
      <div class="ry-alive" id="db-depth"></div>
      <div class="ls-clock" id="db-clock"></div>
    </div>
    <div class="pw-body">
      <div class="ls-stage pw-stage db-stage" id="db-stage">
        <canvas id="db-canvas"></canvas>
        <div class="ls-banner" id="db-banner"></div>
        <div class="tw-toast" id="db-toast"></div>
        <div class="tw-countdown hidden" id="db-countdown"></div>
        <div class="db-pad" id="db-pad">
          <div class="db-pad-move"><button type="button" data-x="-1" aria-label="Links">◀</button><button type="button" data-y="1" aria-label="Graven">▼</button><button type="button" data-x="1" aria-label="Rechts">▶</button></div>
          <button type="button" class="db-up" data-y="-1" aria-label="Omhoog vliegen">▲<small>Omhoog</small></button>
        </div>
      </div>
      <div class="pw-dock" id="db-dock">
        <div class="db-panel" id="db-panel"></div>
        <p class="db-full hidden" id="db-full">⛽ Je tank is vol! Graaf eerst wat brandstof op.</p>
      </div>
    </div>
  </section>
  <section id="db-end" class="screen panel hidden">
    <div class="mark" style="font-size:4.5rem">⛏️</div>
    <p class="title">De boren staan stil!</p>
    <p class="big" id="db-end-score" style="font-size:1.6rem"></p>
    <p id="db-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, color: '#4cc9ff', seed: 1, dug: new Set(),
    cx: 12, cy: -1, x: 12, y: -1, anim: null, face: 'r', dir: 'r', spin: 0, fuel: 100, hull: 100, fallRows: 0, onTop: true,
    cargo: [], fx: new AK.Particles(), t: 0, dt: 0, px: 40, placed: false, flashUntil: 0, quizIdle: false,
  };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.db === '1';
  const show = name => { for (const s of ['db-join', 'db-lobby', 'db-game', 'db-end']) $(s).classList.toggle('hidden', s !== name); };
  const lv = k => (g.me ? g.me.lv[k] : 1);
  const tank = () => UP.tank.val[lv('tank') - 1];
  const hullMax = () => UP.pantser.val[lv('pantser') - 1];
  const hold = () => UP.ruim.val[lv('ruim') - 1];
  const playing = () => on() && g.state && g.state.phase === 'play' && g.state.startedAt <= now() && !$('db-game').classList.contains('hidden');

  function join(name) {
    socket.emit('db-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('db-join-error').textContent = res.error;
        show('db-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('db-join-error').textContent = '';
    });
  }
  $('db-join').addEventListener('submit', e => { e.preventDefault(); join($('db-name').value); });

  socket.on('db-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.db = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.placed = false;
      g.dug = new Set();
      g.seed = s.seed;
      quiz.close();
      delete $('db-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('db-name').value = saved || '';
        show('db-join');
      }
      return;
    }
    g.joined = true;
    const mine = s.roster.find(r => r.name === s.name);
    if (mine) g.color = mine.color;
    if (s.me) setMe(s.me);
    if (s.dug) for (const c of s.dug) g.dug.add(c);
    if (!g.placed && s.at) place(s);
    if (s.phase === 'lobby') {
      $('db-lobby-name').textContent = s.name;
      show('db-lobby');
    } else if (s.phase === 'play') {
      show('db-game');
      $('db-game').style.setProperty('--team', g.color);
      if (!quiz.open && !g.quizIdle) quiz.show();
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      $('db-end-score').textContent = `${me.score || 0} punten · plek ${me.rank || '-'} van ${me.players || '-'}`;
      $('db-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${me.deepest || 0} m diep · 💰 ${me.gold || 0}`;
      if (!$('db-end').dataset.done) confetti(3000);
      $('db-end').dataset.done = '1';
      show('db-end');
    }
  });

  // Na herladen: terug op dezelfde plek, met dezelfde brandstof en hetzelfde pantser.
  function place(s) {
    g.placed = true;
    g.cx = Math.round(s.at[0]);
    g.cy = Math.round(s.at[1]);
    if (solid(g.cx, g.cy)) { g.cx = Math.floor(W.COLS / 2); g.cy = -1; }
    g.x = g.cx;
    g.y = g.cy;
    g.anim = null;
    g.onTop = g.cy < 0;
    // Je begint met een halve tank: de eerste antwoorden tellen meteen.
    g.fuel = tank() * .6;
    g.hull = hullMax();
    try {
      const keep = JSON.parse(store('lancelot-diepboor') || 'null');
      if (keep && keep.run === s.run && keep.seed === s.seed) { g.fuel = keep.fuel; g.hull = keep.hull; }
    } catch {}
  }
  setInterval(() => {
    if (g.state && g.state.phase === 'play' && g.placed) store('lancelot-diepboor', JSON.stringify({ run: g.state.run, seed: g.state.seed, fuel: Math.round(g.fuel), hull: Math.round(g.hull) }));
  }, 2000);

  socket.on('db-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('db-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('db-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });
  socket.on('db-me', setMe);

  function setMe(me) {
    g.me = me;
    g.cargo = me.cargo.slice();
    g.fuel = Math.min(g.fuel, tank());
    g.hull = Math.min(g.hull, hullMax());
    panel();
  }

  // ---------- Bewegen en graven ----------
  function tileAt(x, y) {
    if (y < 0) return T.LEEG;
    if (x < 0 || x >= W.COLS || y >= W.ROWS) return T.ROTS;
    if (g.dug.has(y * W.COLS + x)) return T.LEEG;
    return W.tile(g.seed, x, y);
  }
  const solid = (x, y) => (y < -1 ? true : tileAt(x, y) !== T.LEEG);

  let stick = null;
  const pad = { x: 0, y: 0 };
  function input() {
    const k = AK.keyVector();
    let x = k.x + pad.x, y = k.y + pad.y;
    if (stick && stick.active) { x += stick.x; y += stick.y; }
    if (Math.abs(x) < .3 && Math.abs(y) < .3) return { x: 0, y: 0 };
    return Math.abs(y) > Math.abs(x) ? { x: 0, y: Math.sign(y) } : { x: Math.sign(x), y: 0 };
  }

  let lastEmpty = 0;
  function useFuel(cost) {
    if (g.fuel >= cost) { g.fuel -= cost; return true; }
    if (g.t - lastEmpty > 1.5) {
      lastEmpty = g.t;
      sfx.empty();
      toast('⛽ Tank leeg! Beantwoord een vraag.', 'bad');
      if (!quiz.open) { g.quizIdle = false; quiz.show(); }
    }
    return false;
  }
  let lastBump = 0;
  function bump() {
    if (g.t - lastBump < .6) return;
    lastBump = g.t;
    toast('🪨 Te hard! Daar kan je boor niet door.');
  }

  function go(kind, tx, ty, dur) {
    g.anim = { kind, fx: g.cx, fy: g.cy, tx, ty, t: 0, dur, chip: 0 };
  }

  function decide() {
    const v = input();
    const below = solid(g.cx, g.cy + 1);
    const holdUp = v.y < 0 && g.fuel > 0;
    if (!below && !holdUp) {
      g.dir = 'd';
      go('fall', g.cx, g.cy + 1, Math.max(.05, .12 - g.fallRows * .012));
      g.fallRows++;
      return;
    }
    if (below && g.fallRows) {
      if (g.fallRows >= W.DAMAGE.fallFrom) damage((g.fallRows - W.DAMAGE.fallFrom + 1) * W.DAMAGE.fall, 'Harde landing!');
      g.fallRows = 0;
    }
    if (g.cy < 0 && !g.onTop) arriveTop();
    if (g.cy >= 0) g.onTop = false;
    if (v.y < 0) {
      if (g.cy > -1 && !solid(g.cx, g.cy - 1)) { if (useFuel(W.FUEL.up)) go('fly', g.cx, g.cy - 1, .2); }
      else if (g.cy > -1) {
        // Omhoog geblokkeerd: rij vanzelf door je gang naar de dichtste plek waar het wel omhoog gaat.
        const dx = climbSide();
        if (dx && useFuel(W.FUEL.move)) { g.face = g.dir = dx < 0 ? 'l' : 'r'; go('move', g.cx + dx, g.cy, .16); }
        else if (!dx) bump();
      }
      return;
    }
    if (v.x) {
      g.face = v.x < 0 ? 'l' : 'r';
      g.dir = g.face;
      const nx = g.cx + v.x;
      if (nx < 0 || nx >= W.COLS) return;
      if (g.cy < 0) go('move', nx, g.cy, .13);
      else if (!solid(nx, g.cy)) { if (useFuel(W.FUEL.move)) go('move', nx, g.cy, .16); }
      else if (below) startDig(nx, g.cy);
      return;
    }
    if (v.y > 0 && below) { g.dir = 'd'; startDig(g.cx, g.cy + 1); }
  }

  // Richting (-1 of 1) naar de dichtste open kolom in deze gang waarboven het vrij is; 0 als er geen is.
  function climbSide() {
    let best = 0, dist = Infinity;
    for (const d of [-1, 1]) {
      for (let x = g.cx + d, n = 1; x >= 0 && x < W.COLS && !solid(x, g.cy); x += d, n++) {
        if (!solid(x, g.cy - 1)) { if (n < dist) { dist = n; best = d; } break; }
      }
    }
    return best;
  }

  function startDig(x, y) {
    const type = tileAt(x, y);
    if (type === T.ROTS) return bump();
    if (!useFuel(W.FUEL.dig)) return;
    go('dig', x, y, Math.max(.12, W.digTime(type, y, lv('boor'))));
    g.anim.type = type;
  }

  function step(dt) {
    const a = g.anim;
    if (a) {
      a.t += dt;
      const f = Math.min(1, a.t / a.dur);
      if (a.kind === 'dig') {
        g.spin += dt * 4;
        a.chip -= dt;
        if (a.chip <= 0) {
          a.chip = .07;
          const px = g.px;
          const ex = (a.tx + .5 - (a.tx - g.cx) * .45) * px, ey = (a.ty + .5 - (a.ty - g.cy) * .45) * px;
          g.fx.burst(ex, ey, { n: 3, color: DbDraw.chipColor(a.type, a.ty), speed: px * 3, life: .4, size: px * .08, drag: 4, up: px });
        }
        if (f >= 1) {
          doneDig(a);
          go('move', a.tx, a.ty, .1);
        }
        return;
      }
      g.x = a.fx + (a.tx - a.fx) * f;
      g.y = a.fy + (a.ty - a.fy) * f;
      if (f < 1) return;
      g.cx = a.tx;
      g.cy = a.ty;
      g.anim = null;
    }
    decide();
  }

  function doneDig(a) {
    const cell = a.ty * W.COLS + a.tx;
    if (g.dug.has(cell)) return;
    g.dug.add(cell);
    const px = g.px;
    const wx = (a.tx + .5) * px, wy = (a.ty + .5) * px;
    g.fx.burst(wx, wy, { n: 8, color: DbDraw.chipColor(a.type, a.ty), speed: px * 4, life: .5, size: px * .1, drag: 4 });
    if (a.type === T.LAVA) {
      g.fx.burst(wx, wy, { n: 18, color: '#ff8c42', speed: px * 6, life: .6, size: px * .12 });
      damage(W.DAMAGE.lava, '🔥 Lava!');
      sfx.boom();
    } else if (a.type === T.GAS) {
      g.fx.smoke(wx, wy, { n: 10, color: 'rgba(140,230,90,.5)', size: px * .5, speed: px * 1.5 });
      damage(W.DAMAGE.gas, '🟢 Gaszak!');
    }
    const ore = W.ORES[a.type];
    if (ore) {
      if (g.cargo.length < hold()) {
        g.cargo.push(a.type);
        g.fx.text(wx, wy - px * .3, `+${ore.name}`, ore.color, Math.round(px * .32));
        sfx.marker();
        buzz(25);
        if (a.type === T.NEON) banner('💗 NEONKERN!', `${ore.value} goud waard`, 'gold');
      } else toast('🎒 Laadruim vol! Ga naar boven om te verkopen.', 'bad');
      panel();
    }
    socket.emit('db-dig', { x: a.tx, y: a.ty }, res => {
      if (res && res.ore && !res.kept && g.cargo.length > res.cargo) { g.cargo.length = res.cargo; panel(); }
    });
  }

  function damage(n, why) {
    g.hull -= n;
    g.flashUntil = g.t + .5;
    sfx.hit();
    buzz([60, 40, 60]);
    if (g.hull <= 0) return wreck();
    toast(`${why} −${n} pantser`, 'bad');
  }

  function wreck() {
    socket.emit('db-wreck');
    banner('💥 BOOR KAPOT', 'Je laadruim is leeg. Terug naar boven.', 'bad');
    sfx.bad();
    g.fx.burst((g.x + .5) * g.px, (g.y + .5) * g.px, { n: 30, color: g.color, speed: g.px * 6, life: .8, size: g.px * .12 });
    g.cargo = [];
    toTop(Math.floor(W.COLS / 2));
    g.fuel = Math.max(g.fuel, 30);
  }

  function toTop(x) {
    g.anim = null;
    g.cx = x;
    g.cy = -1;
    g.x = x;
    g.y = -1;
    g.fallRows = 0;
    g.onTop = false;
  }

  // Bovenaan: pantser hersteld en alles uit het laadruim verkocht.
  function arriveTop() {
    g.onTop = true;
    g.hull = hullMax();
    panel();
    if (!g.cargo.length) return;
    socket.emit('db-sell', null, res => {
      if (!res || res.error) return;
      g.cargo = [];
      sfx.power();
      buzz([30, 30, 60]);
      banner(`+${res.value} 💰`, `${res.count} ${res.count === 1 ? 'steen' : 'stenen'} verkocht in de smidse`, 'gold');
      if (g.me) g.me.gold = res.gold;
      panel();
    });
  }

  function teleport() {
    if (!playing() || g.cy < 0) return;
    socket.emit('db-tele', null, res => {
      if (res.error) { sfx.empty(); return toast(res.error, 'bad'); }
      if (g.me) g.me.tele = res.tele;
      sfx.jump();
      g.fx.shock((g.x + .5) * g.px, (g.y + .5) * g.px, g.px * 1.2, '#c77dff');
      toTop(g.cx);
    });
  }

  function buy(item) {
    socket.emit('db-buy', item, res => {
      if (res.error) { sfx.empty(); return toast(res.error, 'bad'); }
      Object.assign(g.me, { gold: res.gold, lv: res.lv, tele: res.tele });
      sfx.power();
      buzz(40);
      if (item === 'tank') g.fuel = tank();
      if (item === 'pantser') g.hull = hullMax();
      banner(item === 'teleport' ? '🌀 TELEPORT' : `${UP[item].icon} ${UP[item].name.toUpperCase()}`, item === 'teleport' ? 'Druk T om terug naar boven te springen' : `Niveau ${res.lv[item]}`, 'gold');
      panel();
    });
  }

  // ---------- Paneel: smidse bovenaan, laadruim onderweg ----------
  let lastPanel = '';
  function panel() {
    const me = g.me;
    if (!me) return;
    const top = g.cy < 0;
    const key = JSON.stringify([top, me.gold, me.lv, me.tele, g.cargo, hold()]);
    if (key === lastPanel) return;
    lastPanel = key;
    const box = $('db-panel');
    const value = g.cargo.reduce((a, t) => a + W.ORES[t].value, 0);
    const slots = Array.from({ length: hold() }, (_, i) => {
      const t = g.cargo[i];
      return `<i class="db-slot" ${t ? `style="--c:${W.ORES[t].color}" title="${W.ORES[t].name}"` : ''}></i>`;
    }).join('');
    const tele = `<button type="button" class="db-tele ${me.tele > 0 && !top ? 'ready' : ''}" id="db-tele" ${top || me.tele <= 0 ? 'disabled' : ''}>🌀<small>Teleport · ${me.tele}</small></button>`;
    if (top) {
      box.innerHTML = `<p class="db-title">🏰 De smidse · <b>${me.gold} 💰</b></p>
        <div class="db-shop">${Object.entries(UP).map(([k, u]) => {
          const l = me.lv[k], max = l >= u.val.length;
          return `<button type="button" class="db-buy" data-buy="${k}" ${max || me.gold < u.cost[l] ? 'disabled' : ''}><b>${u.icon}</b><span>${u.name}</span><em>${'★'.repeat(l)}</em><small>${max ? 'max' : `${u.cost[l]} 💰`}</small></button>`;
        }).join('')}
        <button type="button" class="db-buy" data-buy="teleport" ${me.tele >= W.TELEPORT.max || me.gold < W.TELEPORT.cost ? 'disabled' : ''}><b>🌀</b><span>Teleport</span><em>${'🌀'.repeat(me.tele) || '–'}</em><small>${W.TELEPORT.cost} 💰</small></button></div>
        <p class="pw-tip">Pijl omlaag: graven! Stenen verkoop je hier vanzelf.</p>`;
      for (const b of box.querySelectorAll('.db-buy')) b.addEventListener('click', () => buy(b.dataset.buy));
    } else {
      box.innerHTML = `<div class="pw-row"><div class="db-cargo"><p class="db-title">🎒 ${g.cargo.length}/${hold()} · ${value} 💰</p><div class="db-slots">${slots}</div></div>${tele}</div>`;
      $('db-tele').addEventListener('click', teleport);
    }
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('db-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('db-banner');
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

  // ---------- Vragen: open naast de mijn zolang je tank niet vol is ----------
  const quiz = AK.quiz({
    root: $('db-dock'),
    closeText: 'Sluiten',
    status: () => `Juist = brandstof · tank ${Math.round(g.fuel)}/${tank()}`,
    ask: cb => socket.emit('db-question', null, cb),
    answer: (i, cb) => socket.emit('db-answer', i, res => {
      if (res && res.correct) g.fuel = Math.min(tank(), g.fuel + res.fuel);
      cb(res);
    }),
    good: res => `Juist! +${res.fuel} ⛽${res.streak >= 3 ? ` · ${res.streak} op rij` : ''}`,
    bad: () => 'Helaas! Kijk naar het juiste antwoord. Die vraag komt later terug.',
    next: () => g.fuel < tank() * .95,
    close: () => setTimeout(() => {
      if (!on() || !g.state || g.state.phase !== 'play') return;
      if (g.fuel < tank() * .95) quiz.show();
      else g.quizIdle = true;
    }, 400),
  });

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('db-game').classList.contains('hidden')) return;
    if (e.key === 'Escape') return;
    if (quiz.key(e) && /^[1-4]$/.test(e.key)) { e.preventDefault(); return; }
    if (AK.isMoveKey(e.key) || e.key === ' ') e.preventDefault();
    if (!e.repeat && e.key.toLowerCase() === 't') teleport();
  });

  // Plaats doorgeven aan de server (voor het bord).
  let sent = '';
  setInterval(() => {
    if (!playing()) return;
    const key = `${Math.round(g.x * 10) / 10},${Math.round(g.y * 10) / 10}`;
    if (key === sent) return;
    sent = key;
    socket.emit('db-pos', { x: Math.round(g.x * 10) / 10, y: Math.round(g.y * 10) / 10 });
  }, 200);

  // ---------- Elke frame ----------
  const canvas = $('db-canvas');
  const ctx = canvas.getContext('2d');
  stick = AK.stick($('db-stage'));
  for (const b of $('db-pad').querySelectorAll('button')) {
    AK.holdButton(b, down => {
      if (b.dataset.x) pad.x = down ? Number(b.dataset.x) : 0;
      if (b.dataset.y) pad.y = down ? Number(b.dataset.y) : 0;
    });
  }
  let last = performance.now();
  let hudKey = '';
  const view = {};
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('db-game').classList.contains('hidden')) return;
    g.t += dt;
    g.dt = dt;
    const left = g.state.endsAt - now();
    $('db-clock').textContent = AK.clock(left);
    $('db-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('db-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('db-countdown').textContent = Math.ceil(wait / 1000);
    if (playing()) step(dt);
    if (g.quizIdle && g.fuel < tank() * .8) { g.quizIdle = false; quiz.show(); }
    $('db-full').classList.toggle('hidden', quiz.open);
    g.fx.update(dt);
    const key = [Math.round(g.fuel), tank(), Math.round(g.hull), hullMax(), g.me ? g.me.gold : 0, Math.max(0, g.cy), g.me ? g.me.rank : 0].join();
    if (key !== hudKey) {
      hudKey = key;
      const fuel = g.fuel / tank(), hull = g.hull / hullMax();
      $('db-fuel').firstChild.style.width = `${fuel * 100}%`;
      $('db-fuel').lastChild.textContent = `⛽ ${Math.round(g.fuel)}`;
      $('db-fuel').classList.toggle('low', fuel < .2);
      $('db-hull').firstChild.style.width = `${hull * 100}%`;
      $('db-hull').lastChild.textContent = `🛡️ ${Math.max(0, Math.round(g.hull))}`;
      $('db-hull').classList.toggle('low', hull < .3);
      $('db-gold').textContent = `💰 ${g.me ? g.me.gold : 0}`;
      $('db-depth').textContent = `⬇ ${Math.max(0, g.cy)} m${g.me && g.me.rank ? ` · #${g.me.rank}` : ''}`;
    }
    const { w, h } = AK.fit(canvas, 1.25);
    const a = g.anim;
    // render() bewaart de camera en de vakgrootte op view.
    Object.assign(view, {
      seed: g.seed, dug: g.dug, x: g.x, y: g.y, face: g.face, dir: g.dir, color: g.color, t: g.t, dt, fx: g.fx,
      drilling: !!a && a.kind === 'dig', shake: !!a && a.kind === 'dig', spin: g.spin, flame: !!a && a.kind === 'fly', flash: g.t < g.flashUntil,
    });
    DbDraw.render(ctx, view, w, h);
    g.px = view.px;
  }
  requestAnimationFrame(frame);
})();
