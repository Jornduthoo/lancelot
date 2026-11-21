// Kegelridder op de Chromebook of gsm: je eigen kegelbaan. Juiste vraag = een bal, dan gooi je.
// Twee manieren (de leerling kiest, onthouden op dit toestel):
// - Vegen (standaard): vinger (of muis) neer waar de bal moet starten, veeg naar de kegels en laat los. Sneller = harder,
//   een bocht aan het einde van je veeg = effect.
// - Tikken, in drie stappen: de bal schuift heen en weer (tik = plaats), een pijl zwaait (tik = richting), de krachtmeter
//   gaat op en neer (tik = gooien; houd ← of → vast of tik een effectpijl voor effect). Met de spatiebalk of Enter
//   gaat het altijd zo. Bij "Rustig mikken" (keuze van de leerkracht) bewegen pijl en meter trager.
// De worp rolt meteen hier (kb-world.js); de server rekent dezelfde worp na en houdt de stand bij.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK, KbWorld en KbDraw.
(() => {
  const W = KbWorld;
  const root = document.createElement('div');
  root.id = 'kegel';
  root.innerHTML = `
  <form id="kb-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Kegelridder</p>
    <input id="kb-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="kb-join-error"></p>
    <button type="submit" class="big">Naar de kegelbaan</button>
  </form>
  <section id="kb-lobby" class="screen panel hidden">
    <p class="status">Kegelridder</p>
    <img class="kb-lobby-icon" src="/img/icons/kegelridder.webp" alt="">
    <p class="title" id="kb-lobby-name"></p>
    <p><strong>Antwoorden geven ballen.</strong> Elke juiste vraag = een bal. Gooi naar de tien runenkegels.</p>
    <p>Alles om met één bal = <strong>STRIKE</strong>. Alles om met je tweede bal = <strong>SPARE</strong>. Tien beurten = één spel. Drie juist op rij: een gouden runenbal.</p>
    <p class="muted small ls-hint-touch">Veeg de bal naar de kegels, of kies 🎯 Tikken: tik drie keer (plaats, richting, kracht).</p>
    <p class="muted small ls-hint-keys">Spatie drie keer: plaats, richting, kracht. Houd ← of → vast bij de laatste tik voor effect · 1-4 antwoorden.</p>
    <div class="spinner"></div>
  </section>
  <section id="kb-game" class="ak-game hidden">
    <div class="ls-hud ak-hud kb-hud">
      <div class="sv-mass" id="kb-score">0</div>
      <div class="px-chip kb-balls" id="kb-balls">Ballen: 0</div>
      <div class="px-chip kb-gold hidden" id="kb-gold">✨ runenbal</div>
      <div class="ry-alive" id="kb-rank"></div>
      <div class="ls-clock" id="kb-clock"></div>
    </div>
    <div class="ls-stage kb-stage" id="kb-stage">
      <canvas id="kb-canvas"></canvas>
      <div class="kb-card" id="kb-card"></div>
      <img class="kb-knight hidden" id="kb-knight" src="/img/kegelridder/ridder-klaar.webp" alt="">
      <div class="kb-tip" id="kb-tip">Veeg de bal naar de kegels</div>
      <div class="kb-rest hidden" id="kb-rest"></div>
      <div class="kb-power hidden" id="kb-power"><i></i></div>
      <div class="kb-fx hidden" id="kb-fx"><button type="button" data-s="-1" aria-label="Effect naar links">↶</button><button type="button" data-s="1" aria-label="Effect naar rechts">↷</button></div>
      <button class="kb-mode" id="kb-mode" type="button" title="Kies hoe je gooit"><span data-m="veeg">👆 <b>Vegen</b></span><span data-m="tik">🎯 <b>Tikken</b></span></button>
      <button class="gold big kb-ask hidden" id="kb-ask" type="button">🎳 Vraag = bal</button>
      <div class="ls-feed" id="kb-feed"></div>
      <div class="ls-banner" id="kb-banner"></div>
      <div class="tw-toast" id="kb-toast"></div>
      <div class="tw-countdown hidden" id="kb-countdown"></div>
    </div>
  </section>
  <section id="kb-end" class="screen panel hidden">
    <div class="mark" id="kb-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="kb-end-title"></p>
    <p class="big" id="kb-end-score" style="font-size:1.6rem"></p>
    <p id="kb-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);


  const g = {
    state: null, joined: false, run: -1, offset: 0, me: null, name: '',
    balls: 0, gold: false, standing: Array(10).fill(true), frame: 1, ball: 1, rolls: [], games: 0, bestGame: 0,
    x: 0, roll: null, result: null, lastFeed: '', throws: 0, aim: null, knight: 'klaar', knightAt: 0,
  };
  const fx = new AK.Particles();
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.kb === '1';
  const show = name => { for (const s of ['kb-join', 'kb-lobby', 'kb-game', 'kb-end']) $(s).classList.toggle('hidden', s !== name); };
  // STRIKE!, SPARE! en GOOT! als geschilderde titel; in een andere taal gewone tekst.
  const NL = !window.LANCELOT_TAAL || window.LANCELOT_TAAL === 'nl';
  // Trillen kan alleen een gsm of tablet; een Chromebook krijgt een kleine schok in beeld.
  const TRIL = typeof navigator !== 'undefined' && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;

  // Vegen of tikken: de keuze van de leerling, onthouden op dit toestel (enkel gemak, geen leerlinggegevens).
  let mode = 'veeg';
  let tipKey = '';
  try { if (localStorage.getItem('kb-mikken') === 'tik') mode = 'tik'; } catch {}
  function setMode(m) {
    mode = m;
    try { localStorage.setItem('kb-mikken', m); } catch {}
    for (const el of $('kb-mode').children) el.classList.toggle('on', el.dataset.m === m);
    g.aim = null;
    tipKey = '';
  }
  setMode(mode);
  $('kb-mode').addEventListener('click', e => { e.stopPropagation(); sfx.unlock(); setMode(mode === 'veeg' ? 'tik' : 'veeg'); });

  function join(name) {
    socket.emit('kb-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('kb-join-error').textContent = res.error;
        show('kb-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('kb-join-error').textContent = '';
    });
  }
  $('kb-join').addEventListener('submit', e => { e.preventDefault(); join($('kb-name').value); });

  socket.on('kb-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.kb = s.active ? '1' : '';
    if (!s.active) { g.joined = false; quiz.close(); return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.roll = null;
      g.result = null;
      g.aim = null;
      g.x = 0;
      g.throws = 0;
      tipKey = '';
      quiz.close();
      delete $('kb-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('kb-name').value = saved || '';
        show('kb-join');
      }
      return;
    }
    g.joined = true;
    g.name = s.name;
    if (s.me) setMe(s.me, true);
    if (s.phase === 'lobby') {
      $('kb-lobby-name').textContent = s.name;
      show('kb-lobby');
    } else if (s.phase === 'play') {
      show('kb-game');
    } else if (s.phase === 'einde') {
      quiz.close();
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('kb-end-medal').textContent = medals[me.rank - 1] || '🎳';
      $('kb-end-title').textContent = me.rank === 1 && (me.score ?? 1) > 0 ? 'Jij bent de beste Kegelridder!' : `Plek ${me.rank} van ${me.players}`;
      $('kb-end-score').textContent = s.telling === 'echt' ? `Je beste spel: ${me.score || 0}` : `${me.score || 0} punten`;
      $('kb-end-stats').textContent = `${me.pins || 0} kegels · ${me.strikes || 0} strikes · ${me.spares || 0} spares · ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist`;
      if (!$('kb-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('kb-end').dataset.done = '1';
      show('kb-end');
    }
  });

  socket.on('kb-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('kb-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('kb-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('kb-tick', msg => {
    if (!g.state || g.state.phase !== 'play') return;
    if (msg.me) setMe(msg.me);
    const top = (msg.feed || [])[0];
    if (top && top.text !== g.lastFeed) {
      g.lastFeed = top.text;
      if (!top.text.includes(g.name)) feedLine(top.text);
    }
  });

  // full: ook de kegels overnemen (na herladen). Tijdens een worp blijven de kegels van de worp staan.
  function setMe(me, full) {
    g.me = me;
    $('kb-score').textContent = me.score;
    $('kb-rank').textContent = me.rank ? `#${me.rank} van ${me.players}` : '';
    if (!g.roll) {
      g.balls = me.balls;
      g.gold = me.gold;
      if (full || !g.result) {
        g.standing = me.standing.slice();
        g.frame = me.frame;
        g.ball = me.ball;
        g.rolls = (me.rolls || []).slice();
        g.games = me.games || 0;
        g.bestGame = me.bestGame || 0;
      }
    }
    hud();
  }

  // Alleen het scherm aanraken als er iets veranderde (dit loopt elke frame).
  let hudKey = '', lastBalls = 0;
  function hud() {
    const ask = g.balls === 0 && !g.roll && !quiz.open && playing();
    const key = `${g.frame}|${g.ball}|${g.balls}|${g.gold}|${ask}|${g.rolls.join(',')}|${g.games}`;
    if (key === hudKey) return;
    hudKey = key;
    $('kb-balls').textContent = g.balls ? `Ballen: ${g.balls}` : 'Ballen: 0 · beantwoord een vraag';
    $('kb-balls').classList.toggle('kb-op', g.balls === 0);
    if (g.balls > lastBalls) { $('kb-balls').classList.remove('kb-plus'); void $('kb-balls').offsetWidth; $('kb-balls').classList.add('kb-plus'); }
    lastBalls = g.balls;
    $('kb-gold').classList.toggle('hidden', !(g.gold && g.balls > 0));
    $('kb-ask').classList.toggle('hidden', !ask);
    card();
  }

  // De scorekaart: tien vakjes met de tekens van elke bal (X, /, -) en het totaal zodra het vaststaat.
  // Bij de eenvoudige telling tonen we enkel de tekens (de punten staan bovenaan).
  function card() {
    const c = KbWorld.card(g.rolls);
    const simpel = g.state && g.state.telling === 'eenvoudig';
    let html = '';
    for (let f = 0; f < 10; f++) {
      const fr = c.frames[f] || { marks: [], total: null };
      const n = f === 9 ? 3 : 2;
      let marks = '';
      for (let k = 0; k < n; k++) marks += `<b>${fr.marks[k] || ''}</b>`;
      const nu = f + 1 === g.frame && !c.done ? ' nu' : '';
      // Staat het totaal nog niet vast (strike of spare wacht op de volgende ballen), dan de lopende score, iets zachter.
      const tot = simpel || !fr.marks.length ? '' : fr.total !== null ? fr.total : `<em>${fr.live}</em>`;
      html += `<div class="kb-cel${nu}${f === 9 ? ' tien' : ''}"><small>${f + 1}</small><span>${marks}</span><i>${tot}</i></div>`;
    }
    const extra = g.games ? `<div class="kb-spel">Spel ${g.games + 1} · beste ${g.bestGame}</div>` : '';
    $('kb-card').innerHTML = html + extra;
  }

  // ---------- Vragen: juist = bal ----------
  const quiz = AK.quiz({
    root: $('kb-game'),
    closeText: 'Naar de baan',
    lock: 300,
    closeDelay: 450, // na een juist antwoord meteen terug naar de baan
    status: () => `Beurt ${g.frame} · juist = 🎳 ${g.state && g.state.per === 2 ? '2 ballen' : 'een bal'}${g.me && g.me.streak % 3 === 2 ? ' · nog 1 juist = ✨ runenbal' : ''}${restText() ? ` · ${restText()}` : ''}`,
    ask: cb => socket.emit('kb-question', null, cb),
    answer: (i, cb) => socket.emit('kb-answer', i, res => {
      if (res && res.correct) {
        g.balls = res.balls;
        g.gold = res.gold;
        sfx.power();
        if (!res.more) setTimeout(flyBall, 300);
      }
      cb(res);
    }),
    good: res => (res.more ? `Juist! +${res.points}` : res.newGold ? `Juist! ✨ Een gouden runenbal! +${res.points}` : g.state && g.state.per === 2 ? `Juist! 🎳 Je krijgt 2 ballen. +${res.points}` : `Juist! 🎳 Je krijgt een bal. +${res.points}`),
    bad: () => 'Helaas. Kijk naar het juiste antwoord, die vraag komt later terug.',
    next: () => false,
    close: () => {
      socket.emit('kb-asking', false);
      hud();
    },
  });
  $('kb-ask').addEventListener('click', () => { sfx.unlock(); askNow(); });
  function askNow() {
    if (!playing() || !timeLeft() || quiz.open || g.roll || g.balls > 0) return;
    g.aim = null;
    quiz.show();
    hud();
  }

  // De nieuwe bal rolt van de vraag naar de baan.
  function flyBall() {
    const stage = $('kb-stage').getBoundingClientRect();
    const k = $('kb-knight').getBoundingClientRect();
    const el = document.createElement('img');
    el.className = 'kb-fly';
    el.src = g.gold ? '/img/kegelridder/runenbal.webp' : '/img/kegelridder/bal.webp';
    el.alt = '';
    el.style.left = `${stage.width / 2 - 28}px`;
    el.style.top = `${stage.height * .4}px`;
    $('kb-stage').appendChild(el);
    const tx = k.width ? k.left - stage.left + k.width * .2 : stage.width / 2;
    const ty = k.height ? k.top - stage.top + k.height * .4 : stage.height * .85;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${tx - stage.width / 2}px, ${ty - stage.height * .4}px) rotate(540deg) scale(.7)`;
      el.style.opacity = '.2';
    }));
    setTimeout(() => el.remove(), 700);
  }

  function playing() {
    return g.state && g.state.phase === 'play' && now() >= g.state.startedAt && !$('kb-game').classList.contains('hidden');
  }
  const timeLeft = () => g.state && now() < g.state.endsAt;
  const ready = () => playing() && timeLeft() && !quiz.open && !g.roll && g.balls > 0;

  // ---------- Gooien ----------
  function throwBall(t) {
    if (!ready()) return;
    const clean = W.clean(t);
    const gold = g.gold;
    g.balls--;
    g.gold = false;
    g.throws++;
    g.aim = null;
    g.knight = 'worp';
    g.knightAt = performance.now();
    $('kb-knight').src = '/img/kegelridder/ridder-worp.webp';
    const sim = W.create(clean, g.standing, gold);
    g.roll = { sim, clock: 0, hitAt: -1, res: null, ended: 0, standing: g.standing.slice(), hits: new Set() };
    sfx.whoosh();
    if (sfx.rumble) sfx.rumble(1.8);
    buzz(20);
    hud();
    socket.emit('kb-throw', clean, res => {
      if (!g.roll || g.roll.sim !== sim) return;
      if (!res || res.error) {
        // Niet gelukt (bv. geen bal meer): alles terug zoals de server het kent.
        g.roll = null;
        knightReady();
        if (res && res.error) toast(res.error, 'bad');
        return;
      }
      g.roll.res = res;
    });
  }
  function knightReady() {
    g.knight = 'klaar';
    $('kb-knight').src = '/img/kegelridder/ridder-klaar.webp';
  }

  // Proefspelen: de automatische proefridders (2 en 3) gooien zelf een willekeurige bal, zonder animatie
  // (hun venster is onzichtbaar), zodat de leerkracht het bord met meerdere spelers ziet (proef-bot.js).
  window.proefActie = () => {
    if (!on() || !playing() || !timeLeft() || quiz.open || g.roll) return;
    if (g.balls <= 0) { askNow(); return; }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const t = W.clean({ x: rnd(-.25, .25), a: rnd(-.02, .02), v: rnd(6.5, 10), s: Math.random() < .5 ? 0 : rnd(-.6, .6) });
    g.balls--;
    socket.emit('kb-throw', t, res => {
      if (!res || res.error) return;
      g.balls = res.balls;
      g.standing = res.standing;
      g.frame = res.nextFrame;
      g.ball = res.nextBall;
      g.rolls = res.gameScore !== null && res.gameScore !== undefined ? [] : res.rolls.slice();
      hud();
    });
  };

  // Waar staan de kegels die nog over zijn? ("nog 3: links achteraan")
  function waar(standing) {
    const left = W.PINS.map((p, i) => i).filter(i => standing[i]);
    if (!left.length) return '';
    const xs = left.map(i => W.PINS[i].x), rows = left.map(i => (i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, mr = rows.reduce((a, b) => a + b, 0) / rows.length;
    const spread = Math.max(...xs) - Math.min(...xs);
    if (left.length >= 2 && spread > W.SP * 2.5 && !standing[0]) return `nog ${left.length}: links én rechts, een split!`;
    const kant = mx < -.08 ? 'links' : mx > .08 ? 'rechts' : 'in het midden';
    const diep = mr >= 2.4 ? 'achteraan' : mr <= .6 ? 'vooraan' : '';
    return `nog ${left.length}: ${kant}${diep ? ` ${diep}` : ''}`;
  }

  // Na de worp: de uitslag tonen en de kegels voor de volgende bal klaarzetten.
  function endRoll() {
    const r = g.roll;
    const res = r.res;
    g.roll = null;
    knightReady();
    if (!res) return;
    g.balls = res.balls;
    g.standing = res.standing;
    g.frame = res.nextFrame;
    g.ball = res.nextBall;
    g.rolls = res.gameScore !== null && res.gameScore !== undefined ? [] : res.rolls.slice();
    if (res.gameScore !== null && res.gameScore !== undefined) { g.games++; g.bestGame = Math.max(g.bestGame, res.gameScore); }
    g.result = res;
    if (typeof res.score === 'number') $('kb-score').textContent = res.score;
    const n = res.down.length;
    const echt = g.state && g.state.telling === 'echt';
    const C = $('kb-canvas').getBoundingClientRect();
    if (res.kind === 'strike') {
      banner({ img: 'strike', text: 'STRIKE!', sub: echt ? '10 + je volgende 2 ballen' : `+${res.points}`, ridder: 'juich', kind: 'gold' });
      sfx.fanfare ? sfx.fanfare() : sfx.go();
      shake(3, [40, 50, 40, 50, 80]);
      stars(C.width / 2, C.height * .35, 46);
    } else if (res.kind === 'spare') {
      banner({ img: 'spare', text: 'SPARE!', sub: res.split ? (echt ? 'Een split helemaal om! 10 + je volgende bal' : `Een split helemaal om! +${res.points}`) : echt ? '10 + je volgende bal' : `+${res.points}`, ridder: 'juich', kind: 'gold' });
      sfx.go();
      shake(2, [30, 40, 30]);
      stars(C.width / 2, C.height * .35, res.split ? 40 : 26);
    } else if (res.gutter && n === 0) {
      banner({ img: 'goot', text: 'GOOT!', sub: 'Mik wat meer naar het midden', ridder: 'baal' });
      if (sfx.boing) sfx.boing(); else sfx.bad();
      shake(1, 60);
    } else if (n === 0) {
      banner({ text: 'Mis!', sub: res.ball === 1 ? 'Probeer het met je volgende bal' : 'Volgende beurt beter', ridder: 'baal' });
      sfx.bad();
    } else {
      const open = res.nextFrame === res.frame && !res.standing.every(Boolean);
      const rest = open ? waar(res.standing) : '';
      if (open && W.isSplit(res.standing)) {
        // Een split blijft staan: kort in beeld, de spare wordt een echte uitdaging.
        banner({ text: 'SPLIT!', sub: `${n} ${n === 1 ? 'kegel' : 'kegels'} om · ${rest}`, kind: 'gold' });
        shake(1, [30, 30, 30]);
      } else banner({ text: `${n} ${n === 1 ? 'kegel' : 'kegels'}`, sub: [echt ? '' : `+${res.points}`, rest].filter(Boolean).join(' · ') });
      sfx.good();
    }
    if (res.gameScore !== null && res.gameScore !== undefined) {
      setTimeout(() => banner({ text: `Spel klaar: ${res.gameScore}`, sub: 'Een nieuw spel begint. Je beste spel telt.', kind: 'gold' }), 1800);
    }
    hud();
    if (g.balls === 0 && g.state && g.state.phase === 'play' && now() < g.state.endsAt - 1500) setTimeout(askNow, n > 0 && n < 10 ? 2000 : 1400);
  }

  // Glimmende runensterren (geen confetti).
  function stars(x, y, n) {
    fx.burst(x, y, { n, color: '#ffc94a', speed: 420, life: 1, size: 5, up: 120 });
    fx.sparks(x, y, { n: Math.round(n / 2), color: '#5ee7ff', speed: 520 });
    fx.shock(x, y, 90, '#ffc94a');
  }
  // Trillen op een gsm, een kleine schok in beeld op een Chromebook.
  function shake(level, pattern) {
    if (TRIL) { buzz(pattern); return; }
    const st = $('kb-stage');
    st.classList.remove('kb-schok1', 'kb-schok2', 'kb-schok3');
    void st.offsetWidth;
    st.classList.add(`kb-schok${level}`);
  }

  // ---------- Mikken ----------
  const stage = $('kb-stage');
  const canvas = $('kb-canvas');
  // Een driehoeksgolf van -1 tot 1 die bij 0 begint.
  const tri = u => 4 * Math.abs(((u - .25) % 1 + 1) % 1 - .5) - 1;
  const slow = () => (g.state && g.state.mikken === 'rustig' ? 1.6 : 1);
  function aimNow(t) {
    const a = g.aim;
    const u = (t - a.t0) / 1000;
    if (a.step === 'plaats') a.x = tri(u / (2.2 * slow())) * W.LIMITS.x * .9;
    else if (a.step === 'richting') a.a = tri(u / (1.8 * slow())) * .045;
    else a.power = .5 - .5 * Math.cos(u / (1.4 * slow()) * Math.PI * 2);
  }
  function startAim() {
    if (!ready()) return;
    g.aim = { step: 'plaats', t0: performance.now(), x: g.x, a: 0, power: 0 };
  }
  // Eén tik (of spatie): de volgende stap. spin: effect bij de laatste stap (-1 links, 1 rechts).
  function tap(spin) {
    if (!ready()) return;
    if (!g.aim) { startAim(); return; }
    const t = performance.now();
    aimNow(t);
    const a = g.aim;
    if (a.step === 'plaats') { g.x = a.x; a.step = 'richting'; a.t0 = t; sfx.marker(); }
    else if (a.step === 'richting') { a.step = 'kracht'; a.t0 = t; sfx.marker(); }
    else {
      const s = spin !== undefined ? spin : keySpin();
      throwBall({ x: a.x, a: a.a, v: W.LIMITS.vMin + a.power * (W.LIMITS.vMax - W.LIMITS.vMin), s: s * .7 });
    }
  }
  const keySpin = () => ((keys.has('arrowright') || keys.has('d')) ? 1 : 0) - ((keys.has('arrowleft') || keys.has('a') || keys.has('q')) ? 1 : 0);
  for (const b of $('kb-fx').children) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sfx.unlock(); tap(Number(b.dataset.s)); });
  }

  // Vegen: vinger neer = startplek, vegen = richting en kracht, bocht = effect.
  let swipe = null;
  stage.addEventListener('pointerdown', e => {
    if (quiz.open || e.target.closest('.ak-question') || e.target.closest('button')) return;
    e.preventDefault();
    sfx.unlock();
    if (!playing() || g.roll) return;
    if (g.balls <= 0) { askNow(); return; }
    if (mode === 'tik' || g.aim) { tap(); return; }
    try { stage.setPointerCapture(e.pointerId); } catch {}
    const r = canvas.getBoundingClientRect();
    g.x = Math.max(-W.LIMITS.x, Math.min(W.LIMITS.x, KbDraw.laneX(r.width, r.height, e.clientX - r.left)));
    swipe = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }], h: r.height };
  });
  stage.addEventListener('pointermove', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    swipe.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (swipe.pts.length > 60) swipe.pts.splice(1, 1);
    // Nog niet naar boven geveegd: de bal schuift mee met je vinger.
    if (swipe.pts[0].y - e.clientY < 18) {
      const r = canvas.getBoundingClientRect();
      g.x = Math.max(-W.LIMITS.x, Math.min(W.LIMITS.x, KbDraw.laneX(r.width, r.height, e.clientX - r.left)));
      swipe.pts[0] = { x: e.clientX, y: e.clientY, t: performance.now() };
    }
  });
  const release = e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe;
    swipe = null;
    s.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    const t = fromSwipe(s);
    if (t) throwBall(t);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', () => { swipe = null; });
  stage.addEventListener('contextmenu', e => e.preventDefault());

  function fromSwipe(s) {
    const pts = s.pts, a = pts[0], b = pts[pts.length - 1];
    const dy = a.y - b.y;
    if (dy < Math.max(30, s.h * .07)) return null; // niet genoeg naar boven: alleen geschoven
    // Snelheid uit het laatste stukje van de veeg.
    const tEnd = b.t;
    let k = pts.length - 1;
    while (k > 0 && tEnd - pts[k].t < 140) k--;
    const q = pts[k];
    const dt = Math.max(16, b.t - q.t) / 1000;
    const speed = Math.hypot(b.x - q.x, b.y - q.y) / dt / s.h; // schermhoogtes per seconde
    const power = Math.max(0, Math.min(1, (speed - .8) / 3.2));
    // Richting over de hele veeg, effect: hoe de veeg aan het einde afbuigt.
    const dir = (b.x - a.x) / dy;
    const mid = pts[Math.floor(pts.length / 2)];
    const d1 = (mid.x - a.x) / Math.max(1, a.y - mid.y), d2 = (b.x - mid.x) / Math.max(1, mid.y - b.y);
    const spin = Math.max(-1, Math.min(1, (d2 - d1) * 1.4));
    return { x: g.x, a: dir * .055, v: W.LIMITS.vMin + power * (W.LIMITS.vMax - W.LIMITS.vMin), s: Math.abs(spin) < .12 ? 0 : spin };
  }

  // Toetsen: spatie of Enter = tikken (plaats, richting, kracht), ← → vasthouden bij de laatste tik = effect.
  // Bij vegen schuiven ← → de bal zolang je nog niet mikt.
  const keys = new Set();
  document.addEventListener('keydown', e => {
    if (!on() || e.target.tagName === 'INPUT' || $('kb-game').classList.contains('hidden')) return;
    if (quiz.key(e)) { e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd', 'q'].includes(k)) { keys.add(k); e.preventDefault(); }
    if (k === ' ' || k === 'arrowup' || k === 'enter') {
      e.preventDefault();
      if (e.repeat) return;
      sfx.unlock();
      if (g.balls <= 0 && !g.roll) { askNow(); return; }
      tap();
    }
  });
  document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); swipe = null; });

  // ---------- Meldingen ----------
  function feedLine(text) {
    const box = $('kb-feed');
    const line = document.createElement('div');
    line.className = 'ls-feed-line';
    line.textContent = text;
    box.prepend(line);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => line.remove(), 4500);
  }
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('kb-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  // De uitslag: een geschilderde titel (of tekst), de ridder die juicht of baalt, en een korte regel eronder.
  let bannerTimer = null;
  function banner({ img, text, sub, ridder, kind = '' }) {
    const el = $('kb-banner');
    el.innerHTML = '';
    if (ridder) {
      const r = document.createElement('img');
      r.className = 'kb-res-ridder';
      r.src = `/img/kegelridder/ridder-${ridder}.webp`;
      r.alt = '';
      el.append(r);
    }
    if (img && NL) {
      const t = document.createElement('img');
      t.className = 'kb-res-titel';
      t.src = `/img/kegelridder/${img}.webp`;
      t.alt = text;
      el.append(t);
    } else {
      const strong = document.createElement('strong');
      strong.textContent = text;
      el.append(strong);
    }
    const span = document.createElement('span');
    span.textContent = sub || '';
    el.append(span);
    el.className = `ls-banner kb-res show ${img && NL ? 'beeld' : ''} ${ridder ? 'met-ridder' : ''} ${kind}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 1700);
  }

  // De tip bovenaan: bij vegen de eerste twee worpen, bij tikken wat de volgende tik doet.
  function tip() {
    let text = '';
    if (ready()) {
      if (g.aim) text = g.aim.step === 'plaats' ? 'Tik: zet de bal vast' : g.aim.step === 'richting' ? 'Tik: kies de richting' : TRIL ? 'Tik om te gooien, of tik een pijl voor effect' : 'Tik om te gooien · houd ← of → vast voor effect';
      else if (mode === 'tik') text = 'Tik om te mikken';
      else if (g.throws < 2) text = 'Veeg de bal naar de kegels';
    }
    if (text === tipKey) return;
    tipKey = text;
    $('kb-tip').textContent = text;
    $('kb-tip').classList.toggle('weg', !text);
  }

  // Wat er nog staat (na de eerste bal), ook als de vraag al openstaat.
  function restText() {
    if (g.roll || g.standing.every(Boolean) || !g.standing.some(Boolean)) return '';
    return waar(g.standing);
  }
  let restKey = '';
  function rest() {
    const text = g.roll ? '' : restText();
    if (text === restKey) return;
    restKey = text;
    $('kb-rest').textContent = text ? `🎳 ${text[0].toUpperCase()}${text.slice(1)}` : '';
    $('kb-rest').classList.toggle('hidden', !text);
  }

  // ---------- Elke frame ----------
  const ctx = canvas.getContext('2d');
  let camY = KbDraw.REST, camX = 0;
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    // De worp loopt op de echte tijd (ook op een trage Chromebook duurt hij niet langer); de camera glijdt rustig mee.
    const real = Math.min(1, Math.max(0, (t - last) / 1000));
    const dt = Math.min(.05, real);
    last = t;
    if (!on() || !g.state || g.state.phase !== 'play' || $('kb-game').classList.contains('hidden')) return;
    const left = g.state.endsAt - now();
    $('kb-clock').textContent = AK.clock(left);
    $('kb-clock').classList.toggle('low', left < 30000);
    const wait = g.state.startedAt - now();
    $('kb-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('kb-countdown').textContent = Math.ceil(wait / 1000);
    // Eerste vraag vanzelf zodra het spel begint.
    if (playing() && g.balls === 0 && !g.roll && !quiz.open && !g.asked) { g.asked = true; askNow(); }
    if (!playing()) g.asked = false;
    // Tikken: de bal begint vanzelf heen en weer te schuiven zodra je een bal hebt.
    if (mode === 'tik' && !g.aim && ready()) startAim();
    if (g.aim && !ready()) g.aim = null;
    if (g.aim) aimNow(t);

    if (!g.roll && !g.aim && (keys.has('arrowleft') || keys.has('a') || keys.has('q'))) g.x = Math.max(-W.LIMITS.x, g.x - dt * .6);
    if (!g.roll && !g.aim && (keys.has('arrowright') || keys.has('d'))) g.x = Math.min(W.LIMITS.x, g.x + dt * .6);

    const fit = AK.fit(canvas, 1.5);
    const o = { t: t / 1000 };
    let wantY = KbDraw.REST, wantX = 0;
    if (g.roll) {
      const r = g.roll;
      // Bij de inslag even vertraagd: zo zie je de kegels echt vliegen.
      const slowMo = r.hitAt >= 0 && r.sim.t - r.hitAt < .9;
      r.clock += real * (slowMo ? .45 : 1.15);
      W.runTo(r.sim, r.clock);
      // Kegels die nu omvallen: vonken.
      for (const p of r.sim.pins) {
        if (p.down && !r.hits.has(p.i)) {
          r.hits.add(p.i);
          const s = KbDraw.toScreen(fit.w, fit.h, { camY, camX }, p.x, p.y, .2);
          fx.sparks(s.x / fit.dpr, s.y / fit.dpr, { n: 6, color: '#5ee7ff', speed: 260 });
          if (r.hits.size === 1) { sfx.boom(); shake(1, 40); r.hitAt = r.sim.t; }
        }
      }
      o.sim = r.sim;
      wantY = KbDraw.camFor(r.sim.b.pit ? W.HEAD : r.sim.b.y);
      wantX = r.sim.b.gutter ? 0 : r.sim.b.x * .4;
      if (r.sim.done) {
        if (!r.ended) r.ended = t;
        o.fade = Math.max(0, 1 - (t - r.ended) / 700);
        // Wacht op de server (meestal al lang binnen), dan de uitslag.
        if (t - r.ended > 650 && r.res) endRoll();
        else if (t - r.ended > 5000) { g.roll = null; knightReady(); }
      }
    } else {
      o.standing = g.standing;
      const bx = g.aim ? g.aim.x : g.x;
      if (g.balls > 0 && !quiz.open) {
        o.ball = { x: bx };
        o.gold = g.gold;
        o.hideBall = true; // de ridder houdt de bal vast
        if (g.aim && g.aim.step !== 'plaats') o.aim = { x: bx, a: g.aim.a, power: g.aim.step === 'kracht' ? g.aim.power : .6, spin: g.aim.step === 'kracht' ? keySpin() * .7 : 0 };
        else if (swipe || (mode === 'veeg' && g.throws < 2)) o.aim = { x: bx, a: 0, power: .55 };
      }
    }
    camY += (wantY - camY) * Math.min(1, dt * (g.roll ? 5 : 2.5));
    camX += (wantX - camX) * Math.min(1, dt * 3);
    o.camY = camY;
    o.camX = camX;
    KbDraw.render(ctx, fit.w, fit.h, o);
    knight(fit, t);
    // Krachtmeter (het zwaard) en de effectpijlen bij de laatste stap
    const power = g.aim && g.aim.step === 'kracht';
    $('kb-power').classList.toggle('hidden', !power);
    $('kb-fx').classList.toggle('hidden', !(power && TRIL));
    if (power) $('kb-power').firstElementChild.style.height = `${Math.round(g.aim.power * 74)}%`; // het lemmet loopt van 12 tot 86 %
    $('kb-mode').classList.toggle('hidden', !!(g.roll || quiz.open));
    tip();
    rest();
    fx.update(dt);
    ctx.save();
    ctx.scale(fit.dpr, fit.dpr);
    fx.draw(ctx);
    ctx.restore();
    hud();
  }

  // De ridder onderaan: op zijn rug gezien met de bal, bij het gooien in worphouding, daarna weg (de camera rijdt mee).
  let kState = '';
  function knight(fit, t) {
    const el = $('kb-knight');
    let vis = false, op = 1;
    const bx = g.aim ? g.aim.x : g.x;
    if (g.roll) {
      const since = t - g.knightAt;
      vis = since < 900;
      op = Math.max(0, 1 - Math.max(0, since - 500) / 400);
    } else vis = g.balls > 0 && !quiz.open && playing();
    const kh = Math.min(fit.h / fit.dpr * .42, fit.w / fit.dpr * .55);
    const s = KbDraw.toScreen(fit.w, fit.h, { camY, camX }, bx, 0);
    const x = s.x / fit.dpr;
    const key = `${vis}|${Math.round(x)}|${Math.round(kh)}|${op.toFixed(2)}`;
    if (key === kState) return;
    kState = key;
    el.classList.toggle('hidden', !vis);
    if (!vis) return;
    el.style.height = `${Math.round(kh)}px`;
    // De bal in de handen van de ridder zit op ~22 % van zijn breedte: die komt boven de plek van de bal.
    const kw = kh * .72;
    el.style.left = `${Math.round(x - kw * (g.knight === 'worp' ? .55 : .25))}px`;
    el.style.opacity = op;
  }
  requestAnimationFrame(frame);
})();
