// Het Rijk op de gsm of Chromebook: vragen beantwoorden en met je zetten gebieden veroveren of versterken.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, RijkMap uit rijk-map.js.
const rk = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  question: null,
  busy: false,
  picking: false,
  layout: null,
};

const rkEsc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function rkShow(name) {
  for (const s of ['rk-join', 'rk-lobby', 'rk-game', 'rk-end']) $(s).classList.toggle('hidden', s !== name);
}

function rkJoin(name) {
  socket.emit('rk-join', { playerId, name }, res => {
    if (res.error) {
      rk.joined = false;
      $('rk-join-error').textContent = res.error;
      rkShow('rk-join');
      return;
    }
    rk.joined = true;
    store('lancelot-name', res.name);
    $('rk-join-error').textContent = '';
  });
}

$('rk-join').addEventListener('submit', e => {
  e.preventDefault();
  rkJoin($('rk-name').value);
});

const rkTeam = () => rk.state && rk.state.teams[rk.state.team];

socket.on('rk-state', s => {
  rk.state = s;
  rk.offset = s.now - Date.now();
  document.body.dataset.rk = s.active ? '1' : '';
  if (s.active) rkBg();
  if (!s.active) {
    rk.joined = false;
    return;
  }
  if (rk.run !== s.run) {
    rk.run = s.run;
    rk.joined = false;
    rk.question = null;
    rk.picking = false;
    $('rk-pick').classList.add('hidden');
    delete $('rk-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!rk.joined && saved && rk.autoRun !== s.run) {
      rk.autoRun = s.run;
      rkJoin(saved);
    } else if (!rk.joined) {
      $('rk-name').value = saved || '';
      rkShow('rk-join');
    }
    return;
  }
  rk.joined = true;
  const team = rkTeam();
  document.documentElement.style.setProperty('--rk-team', team.color);
  if (s.phase === 'lobby') {
    $('rk-lobby-rijk').textContent = `${s.rijk} · les ${s.lesson}`;
    $('rk-lobby-name').textContent = s.name;
    $('rk-banner').innerHTML = `<span>${s.returning ? 'Je speelt verder bij de' : 'Jij hoort bij de'}</span><strong>${rkEsc(team.name)}</strong>`;
    $('rk-lobby-old').classList.toggle('hidden', !s.hasOld);
    rkShow('rk-lobby');
  } else if (s.phase === 'spel') {
    rkShow('rk-game');
    rkTop();
    if (rk.picking) rkDraw();
    if (!rk.question && !rk.busy && !rk.picking) rkNext();
  } else if (s.phase === 'einde') {
    rk.question = null;
    rk.picking = false;
    $('rk-pick').classList.add('hidden');
    $('rk-flash').classList.add('hidden');
    const best = Math.max(...s.counts);
    const lead = s.counts[s.team] === best;
    $('rk-end-mark').textContent = lead ? '👑' : '🏰';
    $('rk-end-title').textContent = lead ? `De ${team.name} hebben het grootste rijk!` : `De ${team.name} hebben ${s.counts[s.team]} gebieden`;
    $('rk-end-stats').textContent = `Jij deed ${s.actions} ${s.actions === 1 ? 'zet' : 'zetten'}${s.conquered ? ` en veroverde ${s.conquered} ${s.conquered === 1 ? 'gebied' : 'gebieden'}` : ''}.`;
    if (!$('rk-end').dataset.done && lead) confetti(4000);
    $('rk-end').dataset.done = '1';
    rkShow('rk-end');
  }
});

socket.on('rk-tick', t => {
  if (!rk.state) return;
  Object.assign(rk.state, t);
  rkTop();
  if (rk.picking) rkDraw();
});

socket.on('rk-kicked', () => {
  rk.joined = false;
  store('lancelot-name', null);
  $('rk-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  rkShow('rk-join');
});

socket.on('connect', () => {
  if (rk.joined) rkJoin(store('lancelot-name') || '');
});

function rkTop() {
  const s = rk.state;
  const team = rkTeam();
  $('rk-me').innerHTML = `<span class="rk-dot"></span>${rkEsc(team.name)}`;
  $('rk-land').textContent = `🚩 ${s.counts[s.team]} gebieden`;
}

setInterval(() => {
  const s = rk.state;
  if (!s || s.phase !== 'spel') return;
  const left = Math.max(0, s.endsAt - (Date.now() + rk.offset));
  $('rk-clock').textContent = `⏳ ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
}, 250);

// ---------- Vragen ----------

function rkNext() {
  if (!rk.state || rk.state.phase !== 'spel') return;
  const wait = rk.state.startedAt - (Date.now() + rk.offset);
  if (wait > 0) {
    $('rk-countdown').classList.remove('hidden');
    $('rk-countdown').textContent = Math.ceil(wait / 1000);
    setTimeout(rkNext, Math.min(wait, 250));
    return;
  }
  $('rk-countdown').classList.add('hidden');
  rk.busy = true;
  socket.emit('rk-question', null, res => {
    rk.busy = false;
    if (res && res.wait) return gokWait($('rk-q'), res.wait, rkNext);
    if (!res || res.error) return;
    if (res.act) return rkPick(res.act);
    rk.question = res;
    $('rk-number').textContent = `Vraag ${res.number}`;
    $('rk-old').classList.toggle('hidden', !res.old);
    $('rk-old').textContent = res.old ? `🛡️ Herhaling: ${res.old} · juist = 2 zetten` : '';
    $('rk-q').textContent = res.question;
    $('rk-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('rk-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => rkAnswer(i));
    });
  });
}

function rkAnswer(i) {
  if (!rk.question || rk.question.done) return;
  rk.question.done = true;
  socket.emit('rk-answer', i, res => {
    if (!res || res.error) {
      rk.question = null;
      return rkNext();
    }
    const tiles = [...$('rk-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const flash = $('rk-flash');
    flash.className = `sj-flash ${res.correct ? 'good' : 'bad'}`;
    $('rk-flash-mark').textContent = res.correct ? '✔' : '✖';
    $('rk-flash-text').textContent = res.correct ? (res.gained > 1 ? `Herhaling juist: ${res.gained} zetten! 🛡️` : 'Juist: kies een gebied! 🚩')
      : res.weakened ? `Mis... ${res.weakened} wordt zwakker.` : 'Mis! Geen zet deze keer.';
    if (res.correct) sfx.good(); else sfx.bad();
    buzz(res.correct ? [30, 40, 30] : 200);
    const next = () => {
      flash.classList.add('hidden');
      rk.question = null;
      if (res.correct) rkPick(res.points); else rkNext();
    };
    if (res.correct) setTimeout(next, 700);
    else gokHold(flash, $('rk-q'), res, next);
  });
}

// ---------- Zetten op de kaart ----------

function rkPick(points) {
  rk.picking = true;
  rk.points = points;
  const targets = Object.keys(rk.state.targets || {});
  if (!targets.length) {
    // Niets te doen (alles maximaal sterk en geen buren): zet vervalt.
    rk.picking = false;
    return rkNext();
  }
  $('rk-pick-title').textContent = points > 1 ? `Kies een gebied (nog ${points} zetten)` : `Kies een gebied voor de ${rkTeam().name}`;
  $('rk-pick').classList.remove('hidden');
  rkDraw();
}

// Op een smal scherm inzoomen op de gebieden die je kan kiezen; op een breed scherm de hele kaart.
function rkFocus(s) {
  const canvas = $('rk-canvas');
  if (canvas.clientWidth > 700) return null;
  // Eerst inzoomen op wat je kan aanvallen; je eigen gebieden versterken kan ook als ze net buiten beeld vallen.
  const all = Object.entries(s.targets || {});
  const attack = all.filter(([, kind]) => kind !== 'versterk');
  return (attack.length ? attack : all).map(([i]) => Number(i));
}

function rkDraw() {
  const s = rk.state;
  rk.layout = RijkMap.draw($('rk-canvas'), s, { targets: s.targets, team: s.team, focus: rkFocus(s), names: true, lessonOf: Object.fromEntries(s.stof.map((q, i) => [q.id, i + 1])) });
}

$('rk-canvas').addEventListener('click', e => {
  if (!rk.picking || !rk.layout || rk.acting) return;
  const r = e.currentTarget.getBoundingClientRect();
  const i = RijkMap.hit(rk.layout, (e.clientX - r.left) * rk.layout.dpr, (e.clientY - r.top) * rk.layout.dpr);
  if (i < 0) return;
  const kind = rk.state.targets[i];
  if (!kind) {
    $('rk-pick-note').textContent = 'Dat gebied ligt niet naast jullie land. Kies een gebied met een rand.';
    return;
  }
  rk.acting = true;
  socket.emit('rk-act', i, res => {
    rk.acting = false;
    if (!res || res.error) {
      $('rk-pick-note').textContent = (res && res.error) || '';
      if (res && /eerst/.test(res.error)) { rk.picking = false; $('rk-pick').classList.add('hidden'); rkNext(); }
      return;
    }
    const text = { veroverd: `🚩 ${res.name} is van jullie!`, versterkt: `🛡️ ${res.name} is sterker`, aanval: `⚔️ Aanval op ${res.name}`, beleg: `🚩 Beleg van ${res.name}` }[res.result];
    $('rk-pick-note').textContent = text;
    if (res.result === 'veroverd') { sfx.power(); buzz([40, 30, 40]); } else { sfx.marker(); buzz(30); }
    if (res.points > 0) {
      rk.points = res.points;
      $('rk-pick-title').textContent = res.points > 1 ? `Kies een gebied (nog ${res.points} zetten)` : 'Nog één zet!';
      return;
    }
    rk.picking = false;
    setTimeout(() => {
      $('rk-pick').classList.add('hidden');
      $('rk-pick-note').textContent = '';
      rkNext();
    }, 500);
  });
});

window.addEventListener('resize', () => { if (rk.picking) rkDraw(); });

// De kaartenkamer achter de gsm of Chromebook: één keer per schermmaat getekend.
function rkBg() {
  const c = $('rk-bg');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = Math.round(innerWidth * dpr);
  const h = Math.round(innerHeight * dpr);
  if (c.width === w && c.height === h) return;
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const art = RijkMap.room(w, h);
  g.drawImage(art.c, 0, 0);
  art.candles.forEach(([x, y], i) => RijkMap.candle(g, x, y, art.u, i, i));
  g.fillStyle = 'rgba(6, 4, 10, .55)';
  g.fillRect(0, 0, w, h);
  Glow.vignette(g, w, h, .7);
}
window.addEventListener('resize', () => { if (document.body.dataset.rk === '1') rkBg(); });
