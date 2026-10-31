// De Hofschilder op de gsm of Chromebook. Ben jij de hofschilder, dan kies je een begrip en teken je het op het holodoek
// (vinger, muis of touchpad). Anders zie je de tekening live verschijnen en typ je wat je denkt dat het is.
// Chromebook: tekenaar 1-0 = kleur, E = gom, Z = terug, [ ] = dikte. Rader: gewoon typen en Enter.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, AK en HsArt.
(() => {
  const A = HsArt;
  const root = document.createElement('div');
  root.id = 'hofschilder';
  root.innerHTML = `
  <form id="hs-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">De Hofschilder</p>
    <input id="hs-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="hs-join-error"></p>
    <button type="submit" class="big">Naar de grote zaal</button>
  </form>
  <section id="hs-lobby" class="screen panel hidden">
    <img class="game-logo" src="/img/icons/hofschilder.webp" alt="" style="width:96px;height:96px;border-radius:18px">
    <p class="status">De Hofschilder</p>
    <p class="title" id="hs-lobby-name"></p>
    <p>Om de beurt ben je de <strong>hofschilder</strong>: je tekent een begrip uit de les met neoninkt. De anderen raden het op hun eigen toestel.</p>
    <p>🖌️ Tekenen: hoe meer ridders het raden, hoe meer punten. 🦅 Raden: hoe sneller juist, hoe meer punten.</p>
    <p><strong>Geen letters of cijfers tekenen!</strong></p>
    <div class="spinner"></div>
  </section>
  <section id="hs-game" class="ak-game hs-game hidden">
    <div class="ls-hud ak-hud">
      <div class="nv-score" id="hs-score"></div>
      <div class="hs-wie" id="hs-wie"></div>
      <div class="ry-alive" id="hs-rank"></div>
      <div class="ls-clock" id="hs-clock"></div>
    </div>
    <div class="hs-body">
      <div class="hs-top">
        <div class="hs-word hidden" id="hs-word"><small>Teken</small><b id="hs-word-w"></b><span id="hs-word-u"></span></div>
        <div class="hs-runes" id="hs-runes"></div>
      </div>
      <div class="hs-main">
        <div class="hs-wrap" id="hs-wrap">
          <canvas id="hs-canvas"></canvas>
          <div class="hs-over hidden" id="hs-over"></div>
        </div>
        <div class="hs-side">
          <div class="hs-tools hidden" id="hs-tools">
            <div class="hs-colors" id="hs-colors"></div>
            <div class="hs-sizes" id="hs-sizes"></div>
            <div class="hs-acts">
              <button type="button" class="secondary" id="hs-gom" title="Gom (E)">🧽 Gom</button>
              <button type="button" class="secondary" id="hs-undo" title="Terug (Z)">↶ Terug</button>
              <button type="button" class="secondary" id="hs-clear" title="Alles wissen">🗑 Wis</button>
            </div>
            <p class="muted small ls-hint-keys">1-0 kleur · [ ] dikte · E gom · Z terug</p>
          </div>
          <form class="hs-guess hidden" id="hs-guess" autocomplete="off">
            <div class="hs-guess-row"><input id="hs-input" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Jouw gok…"><button type="submit" class="gold">Raad</button></div>
            <p class="hs-fb" id="hs-fb"></p>
            <ul class="hs-mine" id="hs-mine"></ul>
          </form>
          <ol class="hs-stand" id="hs-stand"></ol>
        </div>
      </div>
    </div>
    <div class="tw-toast" id="hs-toast"></div>
  </section>
  <section id="hs-end" class="screen panel hidden">
    <div class="mark" id="hs-end-medal" style="font-size:4.5rem"></div>
    <p class="title" id="hs-end-title"></p>
    <p class="big" id="hs-end-score" style="font-size:1.6rem"></p>
    <p id="hs-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(root);

  const g = { state: null, joined: false, run: -1, offset: 0, me: null, nr: -1, stap: '', mine: false, raak: 0 };
  const now = () => Date.now() + g.offset;
  const on = () => document.body.dataset.hs === '1';
  const show = name => { for (const s of ['hs-join', 'hs-lobby', 'hs-game', 'hs-end']) $(s).classList.toggle('hidden', s !== name); };
  const ink = new A.Ink(1);
  const touch = matchMedia('(pointer: coarse)').matches;

  function join(name) {
    socket.emit('hs-join', { playerId, name }, res => {
      if (res.error) {
        g.joined = false;
        $('hs-join-error').textContent = res.error;
        show('hs-join');
        return;
      }
      g.joined = true;
      store('lancelot-name', res.name);
      $('hs-join-error').textContent = '';
    });
  }
  $('hs-join').addEventListener('submit', e => { e.preventDefault(); join($('hs-name').value); });

  socket.on('hs-state', s => {
    g.state = s;
    g.offset = s.now - Date.now();
    document.body.dataset.hs = s.active ? '1' : '';
    if (!s.active) { g.joined = false; return; }
    if (g.run !== s.run) {
      g.run = s.run;
      g.joined = false;
      g.me = null;
      g.nr = -1;
      ink.clear();
      delete $('hs-end').dataset.done;
    }
    if (!s.name) {
      const saved = store('lancelot-name');
      if (!g.joined && saved && g.autoRun !== s.run) {
        g.autoRun = s.run;
        join(saved);
      } else if (!g.joined) {
        $('hs-name').value = saved || '';
        show('hs-join');
      }
      return;
    }
    g.joined = true;
    if (s.me) setMe(s.me);
    if (s.phase === 'lobby') {
      $('hs-lobby-name').textContent = s.name;
      show('hs-lobby');
    } else if (s.phase === 'play') {
      show('hs-game');
      const mine = s.roster.find(r => r.name === s.name);
      $('hs-game').style.setProperty('--team', mine ? mine.color : '#4cc9ff');
      turn(s);
    } else if (s.phase === 'einde') {
      const me = s.me || {};
      const medals = ['🥇', '🥈', '🥉'];
      $('hs-end-medal').textContent = medals[me.rank - 1] || '🎨';
      $('hs-end-title').textContent = me.rank === 1 ? 'Jij bent de beste ridder van het hof!' : `Plek ${me.rank} van ${me.players}`;
      $('hs-end-score').textContent = `${me.score || 0} punten`;
      $('hs-end-stats').textContent = `${me.geraden || 0}× juist geraden · ${me.getekend || 0}× getekend${me.gevonden ? ` · ${me.gevonden} ${me.gevonden === 1 ? 'ridder raadde' : 'ridders raadden'} jouw tekening` : ''}`;
      if (!$('hs-end').dataset.done && me.rank && me.rank <= 3) confetti(4000);
      $('hs-end').dataset.done = '1';
      show('hs-end');
    }
  });

  socket.on('hs-kicked', () => {
    g.joined = false;
    store('lancelot-name', null);
    $('hs-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
    show('hs-join');
  });
  socket.on('connect', () => { if (g.joined) join(store('lancelot-name') || ''); });

  socket.on('hs-tick', msg => {
    if (!g.state || g.state.phase !== 'play' || !g.state.turn) return;
    if (msg.me) setMe(msg.me);
    const t = g.state.turn;
    if (msg.top) stand(msg.top);
    if (msg.hint !== t.hint) {
      t.hint = msg.hint;
      if (!g.raak) runes(t.hint, true);
      if (t.stap === 'teken' && !g.mine && !g.raak) sfx.marker();
    }
    t.got = msg.got;
  });

  socket.on('hs-ink', msg => {
    if (!g.state || !g.state.turn) return;
    if (msg.nr !== g.nr) { ink.clear(); g.nr = msg.nr; }
    for (const part of msg.d || []) ink.add(part);
    if (msg.leraar && g.mine) { stack.length = 0; toast('De leerkracht wiste de tekening.', 'bad'); }
  });

  // De top 5, onder het raadvak (op de gsm is daar plaats).
  function stand(top) {
    const me = g.state && g.state.name;
    $('hs-stand').innerHTML = top.map(r => `<li class="${r.name === me ? 'ik' : ''}"><i style="background:${r.color}"></i><span>${AK.esc(r.name)}</span><b>${r.score}</b></li>`).join('');
  }

  function setMe(me) {
    g.me = me;
    $('hs-score').textContent = `🎨 ${me.score}`;
    $('hs-rank').textContent = me.rank ? `#${me.rank}` : '';
  }

  // ---------- Een beurt ----------
  function turn(s) {
    const t = s.turn;
    if (!t) return;
    const fresh = t.nr !== g.nr;
    if (fresh) { ink.clear(); g.nr = t.nr; stack.length = 0; }
    if (s.ink) ink.set(s.ink);
    const changed = fresh || t.stap !== g.stap;
    g.stap = t.stap;
    g.mine = !!s.mine;
    g.raak = s.raak || 0;
    const painter = t.painter || { name: '?' };
    $('hs-wie').textContent = g.mine ? '🖌️ Jij bent de hofschilder' : `🖌️ ${painter.name} tekent`;
    $('hs-game').classList.toggle('hs-ik', g.mine && t.stap === 'teken');
    // Bovenaan: wat jij tekent, of de runetegels
    const drawing = g.mine && t.stap === 'teken';
    $('hs-word').classList.toggle('hidden', !drawing);
    $('hs-runes').classList.toggle('hidden', drawing);
    if (drawing) {
      $('hs-word-w').textContent = s.word || '';
      $('hs-word-u').textContent = s.uitleg || '';
    }
    runes(t.stap === 'kies' ? '' : g.raak && s.word ? s.word : t.hint, false); // wie het al heeft, ziet het hele woord
    // Rechts: tekengerei of het raadvak
    $('hs-tools').classList.toggle('hidden', !drawing);
    $('hs-guess').classList.toggle('hidden', drawing || t.stap === 'kies' && g.mine);
    $('hs-stand').classList.toggle('hidden', drawing);
    const canGuess = !g.mine && t.stap === 'teken' && !g.raak;
    $('hs-input').disabled = !canGuess;
    $('hs-guess').querySelector('button').disabled = !canGuess;
    if (fresh) { $('hs-mine').innerHTML = ''; $('hs-fb').textContent = ''; $('hs-fb').className = 'hs-fb'; }
    if (g.raak && t.stap === 'teken') {
      $('hs-fb').textContent = `✔ Juist: ${s.word}! +${g.raak}. Wacht tot de anderen het ook hebben.`;
      $('hs-fb').className = 'hs-fb good';
    }
    if (changed && canGuess && !touch) setTimeout(() => $('hs-input').focus(), 50);
    overlay(s, changed);
    if (changed) {
      if (t.stap === 'kies' && g.mine) { sfx.go(); buzz([60, 40, 60]); }
      if (t.stap === 'teken') sfx.gong();
      if (t.stap === 'toon') (g.raak || (g.mine && t.guessed && t.guessed.length) ? sfx.good : sfx.whoosh)();
    }
    resize();
  }

  function runes(hint, pulse) {
    const box = $('hs-runes');
    box.innerHTML = '';
    for (const ch of [...(hint || '')]) {
      const el = document.createElement('i');
      if (ch === ' ') el.className = 'gap';
      else if (ch === '_') el.className = 'dicht';
      else { el.className = /[\p{L}\p{N}]/u.test(ch) ? 'open' : 'teken'; el.textContent = ch.toUpperCase(); }
      box.appendChild(el);
    }
    if (pulse) { box.classList.remove('pulse'); void box.offsetWidth; box.classList.add('pulse'); }
    const n = [...(hint || '')].filter(c => c !== ' ').length;
    box.dataset.n = n;
    box.style.setProperty('--n', Math.max(4, [...(hint || '')].length));
  }

  // Wat er over het doek ligt: kiezen, wachten of het woord na de beurt.
  function overlay(s, changed) {
    const t = s.turn;
    const box = $('hs-over');
    box.className = 'hs-over';
    if (t.stap === 'kies' && g.mine && s.choices) {
      if (!changed && box.dataset.mode === 'kies') return;
      box.dataset.mode = 'kies';
      box.innerHTML = '<p class="hs-over-t">Jij bent de hofschilder! Kies wat je tekent:</p><div class="hs-cards"></div><p class="muted small">Geen letters of cijfers tekenen.</p>';
      s.choices.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hs-card';
        b.innerHTML = `<kbd>${i + 1}</kbd><b></b><span></span>`;
        b.querySelector('b').textContent = c.w;
        b.querySelector('span').textContent = c.uitleg || '';
        b.addEventListener('click', () => choose(i));
        box.querySelector('.hs-cards').appendChild(b);
      });
      return;
    }
    box.dataset.mode = t.stap;
    if (t.stap === 'kies') {
      box.innerHTML = `<p class="hs-over-t">🖌️ <b></b> kiest een woord…</p><p class="muted">Maak je klaar om te raden!</p>`;
      box.querySelector('b').textContent = (t.painter || {}).name || '';
      box.classList.add('dim');
      return;
    }
    if (t.stap === 'toon' && t.word) {
      const mine = (t.guessed || []).find(x => g.state && x.name === g.state.name);
      box.innerHTML = '<div class="hs-rol"><small>Het was</small><b></b><span></span></div><p class="hs-over-r"></p>';
      box.querySelector('b').textContent = t.word;
      box.querySelector('.hs-rol span').textContent = t.uitleg || '';
      box.querySelector('.hs-over-r').textContent = g.mine
        ? (t.guessed.length ? `${t.guessed.length} ${t.guessed.length === 1 ? 'ridder raadde' : 'ridders raadden'} jouw tekening! +${t.painterPts}` : 'Niemand raadde het. Volgende keer beter!')
        : mine ? `✔ Jij had het! +${mine.pts}` : `${(t.guessed || []).length} ${(t.guessed || []).length === 1 ? 'ridder raadde' : 'ridders raadden'} het.`;
      box.classList.add('toon');
      return;
    }
    box.classList.add('hidden');
    box.innerHTML = '';
  }

  function choose(i) {
    socket.emit('hs-choose', i, res => { if (res && res.error) toast(res.error, 'bad'); });
    sfx.tick();
  }

  // ---------- Raden ----------
  $('hs-guess').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('hs-input').value.trim();
    if (!text) return;
    $('hs-input').value = '';
    socket.emit('hs-guess', text, res => {
      if (!res) return;
      if (res.error) { toast(res.error, 'bad'); return; }
      const li = document.createElement('li');
      li.textContent = text;
      if (res.res === 'juist') {
        g.raak = res.pts;
        runes(res.word, true);
        $('hs-fb').textContent = `✔ Juist: ${res.word}! +${res.pts}`;
        $('hs-fb').className = 'hs-fb good';
        $('hs-input').disabled = true;
        $('hs-guess').querySelector('button').disabled = true;
        li.className = 'good';
        sfx.good();
        buzz([40, 30, 80]);
        sparkle();
        if (g.me) { g.me.score += res.pts; setMe(g.me); }
      } else if (res.res === 'bijna') {
        li.className = 'bijna';
        li.textContent = `${text} · bijna!`;
        toast('🔥 Bijna! Kijk nog eens naar de letters.', 'gold');
        sfx.tick();
      } else {
        li.className = 'bad';
        sfx.bad();
      }
      $('hs-mine').prepend(li);
      while ($('hs-mine').children.length > 6) $('hs-mine').lastChild.remove();
    });
  });

  // ---------- Tekenen ----------
  let color = 1, size = 1, gom = false;
  const stack = []; // mijn lijnen, voor "terug"
  let strokeId = 0, cur = null, outbox = [], lastSend = 0;
  function tools() {
    const cbox = $('hs-colors');
    cbox.innerHTML = '';
    A.INK.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hs-kleur${!gom && i === color ? ' on' : ''}`;
      b.style.setProperty('--c', c);
      b.title = `${A.INK_NAMES[i]} (${(i + 1) % 10})`;
      b.addEventListener('click', () => { color = i; gom = false; tools(); sfx.tick(); });
      cbox.appendChild(b);
    });
    const sbox = $('hs-sizes');
    sbox.innerHTML = '';
    A.SIZES.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hs-dikte${i === size ? ' on' : ''}`;
      b.innerHTML = `<i style="width:${6 + i * 6}px;height:${6 + i * 6}px"></i>`;
      b.title = 'Dikte';
      b.addEventListener('click', () => { size = i; tools(); sfx.tick(); });
      sbox.appendChild(b);
    });
    $('hs-gom').classList.toggle('on', gom);
    $('hs-wrap').style.setProperty('--ink', gom ? '#ffffff' : A.INK[color]);
  }
  tools();
  $('hs-gom').addEventListener('click', () => { gom = !gom; tools(); sfx.tick(); });
  $('hs-undo').addEventListener('click', undo);
  $('hs-clear').addEventListener('click', async () => {
    if (!ink.strokes.length) return;
    if (!await Ui.vraag('Je hele tekening wissen?')) return;
    ink.clear();
    stack.length = 0;
    socket.emit('hs-ink', { wis: true });
  });
  function undo() {
    const id = stack.pop();
    if (id === undefined) return;
    ink.undo(id);
    socket.emit('hs-ink', { undo: id });
    sfx.tick();
  }

  const drawing = () => g.mine && g.stap === 'teken' && !$('hs-game').classList.contains('hidden') && now() < (g.state.turn.endsAt || 0);
  const canvas = $('hs-canvas');
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) / r.width * A.W), Math.round((e.clientY - r.top) / r.height * A.H)];
  }
  canvas.addEventListener('pointerdown', e => {
    sfx.unlock();
    if (!drawing()) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    cur = { i: ++strokeId + g.nr * 10000, c: gom ? -1 : color, s: size, last: [x, y], pointer: e.pointerId };
    stack.push(cur.i);
    const part = { i: cur.i, c: cur.c, s: cur.s, p: [x, y] };
    ink.add(part);
    outbox.push({ ...part, p: [x, y] });
    send(true);
  });
  canvas.addEventListener('pointermove', e => {
    if (!cur || e.pointerId !== cur.pointer) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const pts = [];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = point(ev);
      if (Math.hypot(x - cur.last[0], y - cur.last[1]) < 3) continue;
      cur.last = [x, y];
      pts.push(x, y);
    }
    if (!pts.length) return;
    ink.add({ i: cur.i, c: cur.c, s: cur.s, p: pts });
    const open = outbox.find(o => o.i === cur.i && !o.e);
    if (open) open.p.push(...pts); else outbox.push({ i: cur.i, c: cur.c, s: cur.s, p: pts });
    send();
  });
  const end = e => {
    if (!cur || (e && e.pointerId !== cur.pointer)) return;
    ink.add({ i: cur.i, c: cur.c, s: cur.s, p: [], e: 1 });
    const open = outbox.find(o => o.i === cur.i && !o.e);
    if (open) open.e = 1; else outbox.push({ i: cur.i, c: cur.c, s: cur.s, p: [], e: 1 });
    cur = null;
    send(true);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  // Niet meer dan ~25 berichten per seconde.
  let sendTimer = null;
  function send(force) {
    const t = performance.now();
    if (!force && t - lastSend < 40) {
      if (!sendTimer) sendTimer = setTimeout(() => { sendTimer = null; send(true); }, 40);
      return;
    }
    if (!outbox.length) return;
    lastSend = t;
    socket.emit('hs-ink', { d: outbox.filter(o => o.p.length || o.e) });
    outbox = [];
  }

  document.addEventListener('keydown', e => {
    if (!on() || $('hs-game').classList.contains('hidden') || !g.state || !g.state.turn) return;
    const t = g.state.turn;
    if (g.mine && t.stap === 'kies' && /^[1-3]$/.test(e.key)) { e.preventDefault(); choose(Number(e.key) - 1); return; }
    if (!(g.mine && t.stap === 'teken') || e.target.tagName === 'INPUT') return;
    if (/^[0-9]$/.test(e.key)) { color = (Number(e.key) + 9) % 10; gom = false; tools(); e.preventDefault(); }
    else if (e.key === 'e' || e.key === 'E') { gom = !gom; tools(); }
    else if (e.key === 'z' || e.key === 'Z' || e.key === 'w' || e.key === 'W') { e.preventDefault(); undo(); }
    else if (e.key === '[' || e.key === '-') { size = Math.max(0, size - 1); tools(); }
    else if (e.key === ']' || e.key === '+' || e.key === '=') { size = Math.min(A.SIZES.length - 1, size + 1); tools(); }
  });

  // ---------- Tonen ----------
  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('hs-toast');
    el.textContent = text;
    el.className = `tw-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  const fx = new AK.Particles();
  function sparkle() {
    const r = canvas.getBoundingClientRect();
    for (let i = 0; i < 3; i++) fx.sparks(r.width * (.2 + Math.random() * .6), r.height * (.2 + Math.random() * .5), { n: 16, color: ['#ffc94a', '#5ee7ff', '#ff7ad9'][i], speed: r.height * .5 });
    fx.pop(r.width / 2, r.height * .4, '✔ JUIST!', '#ffc94a', Math.max(26, r.height * .1));
    spark = performance.now() + 1500;
  }
  let spark = 0;

  // Het doek past altijd in 10:7 in de vrije ruimte.
  let slate = null, cw = 0, chh = 0;
  function resize() {
    const wrap = $('hs-wrap');
    const main = wrap.parentElement;
    const side = main.querySelector('.hs-side');
    const land = innerWidth > innerHeight * 1.05 && innerWidth > 640;
    main.classList.toggle('land', land);
    const mr = main.getBoundingClientRect();
    const sideW = land ? side.getBoundingClientRect().width + 12 : 0;
    const sideH = land ? 0 : side.getBoundingClientRect().height + 8;
    const availW = Math.max(160, mr.width - sideW - 8), availH = Math.max(120, mr.height - sideH - 8);
    let w = availW, h = w * A.H / A.W;
    if (h > availH) { h = availH; w = h * A.W / A.H; }
    wrap.style.width = `${Math.floor(w)}px`;
    wrap.style.height = `${Math.floor(h)}px`;
  }
  addEventListener('resize', () => { if (on()) resize(); });

  const ctx = canvas.getContext('2d');
  let drawn = -1;
  function frame(pt) {
    requestAnimationFrame(frame);
    if (!on() || !g.state || g.state.phase !== 'play' || $('hs-game').classList.contains('hidden') || !g.state.turn) return;
    const t = g.state.turn;
    const left = Math.max(0, t.endsAt - now());
    const clock = $('hs-clock');
    clock.textContent = t.stap === 'toon' ? '' : `${Math.ceil(left / 1000)} s`;
    clock.classList.toggle('low', t.stap === 'teken' && left < 10000);
    if (t.stap === 'teken' && g.mine && left <= 0 && cur) end();
    $('hs-game').classList.toggle('low', t.stap === 'teken' && left < 10000);
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; drawn = -1; }
    if (!slate || cw !== W || chh !== H) { slate = A.slate(W, H); cw = W; chh = H; drawn = -1; }
    ink.settle(pt);
    // Enkel opnieuw tekenen als er iets veranderde (de inkt, of vonken na een juist antwoord).
    const busy = ink.live.size || pt < spark || fx.list && fx.list.length;
    if (drawn === ink.version && !busy) return;
    drawn = ink.version;
    ctx.drawImage(slate, 0, 0);
    ink.draw(ctx, 0, 0, W, H);
    if (pt < spark + 200) {
      ctx.save();
      ctx.scale(dpr, dpr);
      fx.update(1 / 60);
      fx.draw(ctx);
      ctx.restore();
    }
  }
  requestAnimationFrame(frame);
})();
