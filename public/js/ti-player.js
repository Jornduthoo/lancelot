// Titanenstrijd op de Chromebook of gsm: jij bent één deel van de titan van je ploeg.
// Vragen laden je deel op. Vol? Dan druk je op je grote knop: slaan, vuren, schild heffen, ontwijken of herstellen.
// Het gevecht zelf zie je op het bord. Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK.
(() => {
  const ROL = {
    zwaard: { naam: 'Zwaardarm', zin: 'Vol? Sla een andere titan met je zwaard.', knop: 'Sla', ic: '⚔️' },
    kanon: { naam: 'Schouderkanon', zin: 'Vol? Vuur op een andere titan.', knop: 'Vuur op', ic: '💥' },
    schild: { naam: 'Schildarm', zin: 'Vol? Hef je schild als een zwaard eraan komt.', knop: 'Schild omhoog!', ic: '🛡️' },
    benen: { naam: 'Benen', zin: 'Vol? Spring opzij als een kanonschot eraan komt.', knop: 'Ontwijk!', ic: '🦿' },
    kern: { naam: 'Kern', zin: 'Vol? Herstel je titan en maak een kapot deel.', knop: 'Herstel!', ic: '💠' },
  };
  const root = document.createElement('div');
  root.id = 'titan';
  root.innerHTML = `
  <form id="ti-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Titanenstrijd</p>
    <input id="ti-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="ti-join-error"></p>
    <button type="submit" class="big">Stap in je titan</button>
  </form>
  <section id="ti-lobby" class="screen panel hidden">
    <p class="status">Titanenstrijd</p>
    <img class="lobby-icoon" src="/img/icons/titanenstrijd.webp" alt="">
    <p class="title" id="ti-lobby-name"></p>
    <p>Je ploeg bestuurt samen één <strong>reuzentitan</strong>. Jij krijgt één deel: zwaard, schild, kern, kanon of benen.</p>
    <p class="muted small">Juiste antwoorden laden je deel op. Vol? Druk op je grote knop. Kijk naar het bord om te zien wat je titan doet!</p>
    <div class="spinner"></div>
  </section>
  <section id="ti-game" class="ak-game ti-game hidden">
    <div class="ti-kop">
      <span class="ti-ploeg" id="ti-ploeg"></span>
      <span class="ti-punten" id="ti-punten"></span>
      <span class="ls-clock" id="ti-clock"></span>
    </div>
    <div class="ti-deel">
      <img id="ti-icoon" alt="">
      <p class="ti-deelnaam" id="ti-deelnaam"></p>
      <p class="ti-zin" id="ti-zin"></p>
      <div class="ti-lading" id="ti-lading"></div>
      <div class="ti-knoppen" id="ti-knoppen"></div>
      <p class="ti-melding" id="ti-melding"></p>
    </div>
    <div class="ls-banner" id="ti-banner"></div>
    <div class="tw-countdown hidden" id="ti-countdown"></div>
  </section>
  <section id="ti-end" class="screen panel hidden">
    <div class="mark" id="ti-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="ti-end-title"></p>
    <p class="big" id="ti-end-score" style="font-size:1.6rem"></p>
    <p id="ti-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, titans: [], alarm: null };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.ti === '1';
  const show = name => { for (const s of ['ti-join', 'ti-lobby', 'ti-game', 'ti-end']) $(s).classList.toggle('hidden', s !== name); };
  const team = i => (g.state && g.state.teams[i]) || { naam: '', kleur: '#4cc9ff' };

  function join(name) {
    socket.emit('ti-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('ti-join-error').textContent = res.error;
        show('ti-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('ti-join-error').textContent = '';
    });
  }
  $('ti-join').addEventListener('submit', e => { e.preventDefault(); join($('ti-name').value); });

  socket.on('ti-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.ti = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    if (s.titans) g.titans = s.titans;
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      quiz.close();
      delete $('ti-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('ti-name').value = saved || '';
        show('ti-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('ti-lobby-name').textContent = s.name;
      show('ti-lobby');
    } else if (s.phase === 'play') {
      show('ti-game');
      panel();
    } else if (s.phase === 'einde') {
      quiz.close();
      const medals = ['🥇', '🥈', '🥉'];
      const tm = team(s.me ? s.me.team : 0);
      $('ti-end-medal').textContent = medals[s.teamRank - 1] || '🤖';
      $('ti-end-title').textContent = s.teamRank === 1 ? `Ploeg ${tm.naam} wint!` : `Ploeg ${tm.naam}: plek ${s.teamRank}`;
      $('ti-end-score').textContent = `⭐ ${s.points} punten voor jouw ploeg`;
      const parts = [`${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`];
      if (s.dmg) parts.push(`${s.dmg} schade`);
      if (s.blok) parts.push(`${s.blok} keer geblokt`);
      if (s.heal) parts.push(`${s.heal * 10} hersteld`);
      if (s.fix) parts.push(`${s.fix} ${s.fix === 1 ? 'deel' : 'delen'} gemaakt`);
      $('ti-end-stats').textContent = parts.join(' · ');
      if (!$('ti-end').dataset.done && s.teamRank === 1) confetti(4000);
      $('ti-end').dataset.done = '1';
      show('ti-end');
    }
  });

  socket.on('ti-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('ti-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('ti-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('ti-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    g.titans = msg.titans;
    if (msg.me) setMe(msg.me);
    for (const e of msg.ev) onEvent(e);
  });

  socket.on('ti-alarm', a => {
    g.alarm = { ...a, until: performance.now() + a.ms };
    const was = a.kind === 'zwaard' ? 'een zwaardslag' : 'een kanonschot';
    banner(`⚠ ${team(a.from).naam} valt aan!`, g.me && g.me.charge >= 100 ? (a.kind === 'zwaard' ? 'Schild omhoog, nu!' : 'Spring opzij, nu!') : `Er komt ${was} aan`, 'rood');
    buzz([80, 40, 80]);
    sfx.whoosh();
    panel();
  });
  socket.on('ti-kapot', () => {
    banner('💥 Je deel is kapot!', 'Eén juist antwoord en het werkt weer', 'rood');
    buzz([200, 80, 200]);
    sfx.hit();
  });
  socket.on('ti-slag', () => {
    banner('⚡ TITANENSLAG!', 'Alle delen samen juist: jullie titan slaat iedereen', 'gold');
    buzz([60, 40, 60, 40, 200]);
    sfx.fanfare();
  });

  function onEvent(e) {
    const me = g.me;
    if (!me) return;
    if (e[0] === 'blok' && e[4] === me.n) { banner(e[1] === 'zwaard' ? '🛡️ GEBLOKT!' : '🦿 ONTWEKEN!', 'Goed gedaan, je redde je titan', 'gold'); sfx.power(); buzz(60); }
    if (e[0] === 'hit' && e[6] === me.n) { banner('💥 RAAK!', `${team(e[3]).naam} kreeg ${e[4]} schade`, 'gold'); sfx.boom(); buzz(60); }
    if (e[0] === 'val' && e[1] === me.team) { banner('Je titan valt!', 'Blijf antwoorden: hij staat zo weer op', 'rood'); }
    if (e[0] === 'val' && e[2] === me.team) { banner('💥 NEERGEHAALD!', `${team(e[1]).naam} ligt neer`, 'gold'); }
  }

  function setMe(me) {
    const old = g.me;
    g.me = me;
    if (old && old.charge < 100 && me.charge >= 100 && !me.kapot) { sfx.power(); buzz([30, 30, 30]); }
    panel();
  }

  // ---------- Het paneel van je deel ----------
  let lastKey = '';
  function panel() {
    const me = g.me;
    if (!me || !me.rol || !g.state) return;
    const r = ROL[me.rol];
    const tm = team(me.team);
    const ti = g.titans.find(x => x.id === me.team) || {};
    const vol = me.charge >= 100 && !me.kapot;
    const alarm = g.alarm && performance.now() < g.alarm.until;
    const doelen = g.titans.filter(x => x.id !== me.team && !(x.down > 0));
    const key = JSON.stringify([me.rol, me.team, vol, me.kapot, me.charge, me.need, ti.down > 0, doelen.map(x => x.id), alarm, ti.points]);
    if (key === lastKey) return;
    lastKey = key;
    $('ti-game').style.setProperty('--team', tm.kleur);
    $('ti-ploeg').textContent = `Ploeg ${tm.naam}`;
    $('ti-punten').textContent = `⭐ ${ti.points || 0}`;
    $('ti-icoon').src = `/img/titanenstrijd/i-${me.rol}.webp`;
    $('ti-deelnaam').textContent = `${r.ic} ${r.naam}`;
    $('ti-zin').textContent = r.zin;
    // Lading in vakjes: zoveel juiste antwoorden als nodig.
    const filled = Math.round((me.charge / 100) * me.need);
    $('ti-lading').innerHTML = Array.from({ length: me.need }, (_, i) => `<i class="${i < filled ? 'aan' : ''}"></i>`).join('');
    const knoppen = $('ti-knoppen');
    knoppen.innerHTML = '';
    let melding = '';
    if (me.kapot) melding = '💥 Kapot! Eén juist antwoord en het werkt weer.';
    else if (ti.down > 0) melding = 'Je titan ligt neer. Hij staat zo weer op.';
    else if (vol) {
      if (me.rol === 'zwaard' || me.rol === 'kanon') {
        if (!doelen.length) melding = 'Er staat geen titan recht. Even wachten.';
        for (const d of doelen) knoppen.append(knop(`${r.ic} ${r.knop} ${team(d.id).naam}`, team(d.id).kleur, { doel: d.id }));
      } else knoppen.append(knop(`${r.ic} ${r.knop}`, tm.kleur, {}, alarm));
    } else melding = 'Beantwoord vragen om je deel op te laden.';
    $('ti-melding').textContent = melding;
    $('ti-game').classList.toggle('ti-vol', vol && ti.down <= 0);
  }
  function knop(text, kleur, arg, flits) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ti-knop${flits ? ' flits' : ''}`;
    b.style.setProperty('--kl', kleur);
    b.textContent = text;
    b.addEventListener('click', () => act(arg));
    return b;
  }
  function act(arg) {
    sfx.unlock();
    socket.emit('ti-act', arg, res => {
      if (res && res.error) { $('ti-melding').textContent = res.error; return; }
      if (g.me) g.me.charge = 0;
      g.alarm = null;
      sfx.swoosh();
      buzz(40);
      panel();
    });
  }

  let bannerTimer = null;
  function banner(title, sub, kind = '') {
    const el = $('ti-banner');
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

  // ---------- Vragen tot je deel vol is ----------
  const quiz = AK.quiz({
    root: $('ti-game'),
    closeText: 'Naar mijn knop',
    lock: 250,
    status: () => {
      const me = g.me;
      if (!me || !me.rol) return 'Titanenstrijd';
      if (me.kapot) return `${ROL[me.rol].ic} Je deel is kapot · juist = hersteld`;
      return `${ROL[me.rol].ic} ${ROL[me.rol].naam} · ${Math.round((me.charge / 100) * me.need)} van ${me.need} geladen`;
    },
    ask: cb => socket.emit('ti-question', null, cb),
    answer: (i, cb) => socket.emit('ti-answer', i, res => {
      if (res && !res.error && g.me) {
        g.me.charge = res.charge;
        if (res.fixed) g.me.kapot = false;
        panel();
      }
      cb(res);
    }),
    good: res => (res.fixed ? 'Juist! Je deel werkt weer.' : res.vol ? 'Juist! Je deel is vol: druk op je knop!' : 'Juist! Je deel laadt op.'),
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: res => !res.vol,
    close: () => panel(),
  });

  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('ti-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter' || /^[1-4]$/.test(e.key)) {
      const list = [...$('ti-knoppen').children];
      const b = e.key === ' ' || e.key === 'Enter' ? list[0] : list[Number(e.key) - 1];
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  // Vraag tot je deel vol is (of herstel een kapot deel). Een vol deel wacht op jouw knop.
  setInterval(() => {
    if (!on() || !g.state || g.state.phase !== 'play' || !g.me || !g.me.rol || $('ti-game').classList.contains('hidden')) return;
    const wait = g.state.startedAt - now();
    $('ti-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) { $('ti-countdown').textContent = Math.ceil(wait / 1000); return; }
    const left = g.state.endsAt - now();
    $('ti-clock').textContent = AK.clock(left);
    $('ti-clock').classList.toggle('low', left < 30000);
    if (g.alarm && performance.now() > g.alarm.until) { g.alarm = null; panel(); }
    const vol = g.me.charge >= 100 && !g.me.kapot;
    if (!vol && !quiz.open && (!g.askedAt || performance.now() - g.askedAt > 900)) {
      g.askedAt = performance.now();
      quiz.show();
    }
  }, 250);
})();
