// Leraar-baas op de gsm of Chromebook: samen met de klas de eindbaas verslaan. Elk goed antwoord is een slag.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, BossDraw uit lb-draw.js.
// De schermen staan hier zelf in, zodat index.html klein blijft.
(() => {
  const box = document.createElement('div');
  box.id = 'leraarbaas';
  box.innerHTML = `
  <form id="lb-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot">
    <p class="title">Leraar-baas</p>
    <input id="lb-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="lb-join-error"></p>
    <button type="submit" class="big">Durf jij het aan?</button>
  </form>
  <section id="lb-lobby" class="screen panel hidden">
    <p class="status">Leraar-baas</p>
    <p class="title" id="lb-lobby-name"></p>
    <canvas class="lb-mini lb-lobby-boss" id="lb-lobby-boss"></canvas>
    <p>Je leerkracht is de <strong>eindbaas</strong>. Versla hem samen met de klas: elk goed antwoord is een <strong>slag</strong>, drie op rij een <strong>ridderslag</strong>.</p>
    <p class="muted small">Pas op: de baas slaat terug. Wie een reeks van twee heeft, pareert de klap. Een fout antwoord kost de klas moed, en die vraag komt later terug.</p>
    <p class="muted small">Wacht tot de leerkracht het gevecht start.</p>
    <div class="spinner"></div>
  </section>
  <section id="lb-game" class="hidden">
    <div class="lb-hud">
      <div class="lb-bossbar"><span id="lb-boss-name"></span><i><b id="lb-boss-hp"></b></i></div>
      <div class="lb-sub">
        <div class="lb-moed"><span>MOED</span><i><b id="lb-moed"></b></i></div>
        <div class="lb-streak" id="lb-streak" title="Drie op rij = ridderslag"></div>
        <div class="nd-dmg"><span id="lb-dmg">0</span> schade</div>
        <div class="lb-clock" id="lb-clock"></div>
      </div>
    </div>
    <canvas class="lb-mini" id="lb-arena"></canvas>
    <div class="lb-status hidden" id="lb-status"></div>
    <div class="nd-card lb-card" id="lb-card">
      <p class="lb-boss-tag hidden" id="lb-boss-tag">💀 BAASVRAAG · <b id="lb-boss-left"></b></p>
      <p class="nd-q-text" id="lb-q-text"></p>
      <div class="answers" id="lb-q-answers"></div>
      <p class="tw-q-result" id="lb-q-result"></p>
    </div>
    <div class="lb-stun hidden" id="lb-stun"><strong>💫 VERDOOFD!</strong><span id="lb-stun-left"></span><small>De baas sloeg toe. Een reeks van twee goede antwoorden beschermt je.</small></div>
    <div class="nd-flash" id="lb-flash"><strong></strong><span></span></div>
  </section>
  <section id="lb-end" class="screen panel hidden">
    <div class="mark" id="lb-end-mark" style="font-size:4.5rem"></div>
    <p class="title" id="lb-end-title"></p>
    <p class="big" id="lb-end-score" style="font-size:2rem"></p>
    <p id="lb-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  document.querySelector('main').appendChild(box);
  if (!document.querySelector('link[href="/neon.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/neon.css';
    document.head.appendChild(link);
  }
})();

const lb = { state: null, joined: false, run: -1, offset: 0, q: null, autoRun: -1, stunEnd: 0, hits: [] };
const lbNow = () => Date.now() + lb.offset;

function lbShow(name) {
  for (const s of ['lb-join', 'lb-lobby', 'lb-game', 'lb-end']) $(s).classList.toggle('hidden', s !== name);
}

function lbJoin(name) {
  socket.emit('lb-join', { playerId, name }, res => {
    if (res.error) {
      lb.joined = false;
      $('lb-join-error').textContent = res.error;
      lbShow('lb-join');
      return;
    }
    lb.joined = true;
    store('lancelot-name', res.name);
    $('lb-join-error').textContent = '';
  });
}

$('lb-join').addEventListener('submit', e => {
  e.preventDefault();
  lbJoin($('lb-name').value);
});

socket.on('lb-state', s => {
  const old = lb.state;
  lb.state = s;
  lb.offset = s.now - Date.now();
  document.body.dataset.lb = s.active ? '1' : '';
  if (!s.active) {
    lb.joined = false;
    return;
  }
  if (lb.run !== s.run) {
    lb.run = s.run;
    lb.joined = false;
    lb.q = null;
    delete $('lb-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!lb.joined && saved && lb.autoRun !== s.run) {
      lb.autoRun = s.run;
      lbJoin(saved);
    } else if (!lb.joined) {
      $('lb-name').value = saved || '';
      lbShow('lb-join');
    }
    return;
  }
  lb.joined = true;
  const b = s.boss || BossDraw.DEFAULT;
  if (s.phase === 'lobby') {
    $('lb-lobby-name').textContent = s.name;
    lbShow('lb-lobby');
  } else if (s.phase === 'play') {
    lbShow('lb-game');
    $('lb-boss-name').textContent = `👑 ${b.naam}, ${b.titel}`;
    lbHud(s, old);
    if (!lb.q) lbAsk();
  } else if (s.phase === 'einde') {
    lb.q = null;
    $('lb-stun').classList.add('hidden');
    const won = s.outcome === 'klas';
    $('lb-end-mark').textContent = won ? '🏆' : '👑';
    $('lb-end-title').textContent = won ? `Jullie verslaan ${b.naam}!` : `${b.naam} wint deze keer`;
    $('lb-end-score').textContent = `${Math.round(s.dmg || 0)} schade`;
    $('lb-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${s.supers || 0} ${s.supers === 1 ? 'ridderslag' : 'ridderslagen'} · plek ${s.rank} van ${s.players}`;
    if (!$('lb-end').dataset.done && won) confetti(4000);
    $('lb-end').dataset.done = '1';
    lbShow('lb-end');
  }
});

socket.on('lb-tick', msg => {
  if (!lb.state || lb.state.phase !== 'play') return;
  const old = { ...lb.state };
  Object.assign(lb.state, msg);
  lbHud(lb.state, old);
});

socket.on('lb-kicked', () => {
  lb.joined = false;
  store('lancelot-name', null);
  $('lb-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  lbShow('lb-join');
});

socket.on('connect', () => {
  if (lb.joined) lbJoin(store('lancelot-name') || '');
});

// De baas slaat toe.
socket.on('lb-stun', ({ ms }) => {
  lb.stunEnd = performance.now() + ms;
  $('lb-stun').classList.remove('hidden');
  sfx.hit();
  buzz([200, 60, 200]);
  lbMini.shake();
});
socket.on('lb-parry', () => {
  lbFlash('PAREER!', 'Je reeks beschermt je', 'pause');
  sfx.good();
  buzz(60);
});
// Een moeilijke vraag voor iedereen: de gewone vraag wacht even.
socket.on('lb-boss-q', () => {
  clearInterval(lbWaitTimer);
  lb.q = null;
  buzz([100, 50, 100]);
  sfx.gong();
  lbAsk();
});
socket.on('lb-boss-end', () => {
  if (lb.q && lb.q.boss) {
    lb.q = null;
    lbAsk();
  }
});

function lbHud(s, old) {
  $('lb-boss-hp').style.width = `${s.hp}%`;
  $('lb-moed').style.width = `${s.moed}%`;
  $('lb-moed').parentElement.classList.toggle('low', s.moed < 25);
  $('lb-dmg').textContent = Math.round(s.dmg || 0);
  const st = $('lb-status');
  const m = s.move;
  let text = '';
  if (m && m.kind === 'schild') text = `🛡️ SCHILDRONDE: breek het schild! Nog ${m.hp}/${m.max} slagen · ${Math.ceil(m.left / 1000)}s`;
  else if (s.weak > 0) text = `💥 De baas is KWETSBAAR: dubbele schade! ${Math.ceil(s.weak / 1000)}s`;
  else if (s.angry === 2) text = '😡 De baas wankelt: nog één laatste duw!';
  st.textContent = text;
  st.className = `lb-status ${text ? '' : 'hidden'} ${m && m.kind === 'schild' ? 'shield' : s.weak > 0 ? 'weak' : 'angry'}`;
  if (old && old.move && old.move.kind === 'schild' && !m && !(s.weak > 0)) lbFlash('SCHILD HIELD', 'De baas geneest…', 'bad');
}

function lbStreak(n) {
  const k = n % 3;
  $('lb-streak').innerHTML = [0, 1, 2].map(i => `<i class="${i < k ? 'on' : ''}">⚔️</i>`).join('');
}
lbStreak(0);

// ---------- Vragen ----------

function lbAsk() {
  if (lb.q && !lb.q.done) return;
  lb.q = { loading: true };
  socket.emit('lb-question', null, res => {
    if (!lb.q || !lb.q.loading) return;
    if (res && (res.wait || res.stun)) {
      if (res.stun) lb.stunEnd = performance.now() + res.stun;
      $('lb-q-answers').innerHTML = '';
      $('lb-q-text').textContent = res.stun ? 'Verdoofd…' : 'Even nadenken…';
      lbWait(res.wait || res.stun);
      return;
    }
    if (!res || res.error) { lb.q = null; return; }
    lb.q = { answers: res.answers, boss: Boolean(res.boss), until: res.boss ? performance.now() + res.left : 0 };
    lbStreak(res.streak);
    $('lb-card').classList.toggle('boss', lb.q.boss);
    $('lb-boss-tag').classList.toggle('hidden', !lb.q.boss);
    $('lb-q-text').textContent = res.question;
    const result = $('lb-q-result');
    result.textContent = '';
    result.className = 'tw-q-result';
    $('lb-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('lb-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => lbAnswer(i));
    });
  });
}

let lbWaitTimer = null;
function lbWait(ms) {
  clearInterval(lbWaitTimer);
  const end = performance.now() + ms;
  const result = $('lb-q-result');
  let small = result.querySelector('small');
  if (!small) { small = document.createElement('small'); result.append(document.createElement('br'), small); }
  const step = () => {
    const left = end - performance.now();
    if (left <= 0) {
      clearInterval(lbWaitTimer);
      lb.q = null;
      if (lb.state && lb.state.phase === 'play') lbAsk();
      return;
    }
    small.textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
  };
  step();
  lbWaitTimer = setInterval(step, 200);
}

function lbAnswer(i) {
  if (!lb.q || lb.q.done || !lb.q.answers) return;
  lb.q.done = true;
  socket.emit('lb-answer', i, res => {
    if (!res || res.error) { lb.q = null; return lbAsk(); }
    const tiles = [...$('lb-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    const result = $('lb-q-result');
    lbStreak(res.streak);
    if (res.correct) {
      result.className = 'tw-q-result good';
      if (res.shield) {
        result.textContent = 'Juist! Een barst in het schild';
        lbFlash('SCHILD -1', 'Blijf slaan!', 'slag');
      } else if (res.kind === 'boss') {
        result.textContent = `Juist! Driedubbele schade`;
        lbFlash('DRIEDUBBEL!', `-${Math.round(res.dmg)} voor de baas`, 'super');
      } else if (res.kind === 'super') {
        result.textContent = 'Juist! RIDDERSLAG!';
        lbFlash('RIDDERSLAG!', `-${Math.round(res.dmg)} voor de baas`, 'super');
      } else {
        result.textContent = res.weak ? 'Juist! Dubbele schade' : 'Juist!';
        lbFlash(res.weak ? 'DUBBEL!' : 'SLAG!', `-${Math.round(res.dmg)} voor de baas`, 'slag');
      }
      if (lb.state) lb.state.dmg = (lb.state.dmg || 0) + (res.dmg || 0);
      $('lb-dmg').textContent = Math.round((lb.state && lb.state.dmg) || 0);
      lbMini.strike(res.kind, res.shield);
      setTimeout(() => {
        lb.q = null;
        $('lb-card').classList.remove('boss');
        $('lb-boss-tag').classList.add('hidden');
        lbAsk();
      }, res.kind === 'super' || res.kind === 'boss' ? 1200 : 750);
    } else {
      // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
      tiles[i].classList.add('wrong');
      result.className = 'tw-q-result bad';
      result.textContent = res.boss ? 'Fout! De klas verliest moed.' : 'Helaas! Kijk naar het juiste antwoord.';
      sfx.bad();
      buzz(200);
      lb.q.loading = true;
      lbWait(res.wait || 3000);
      setTimeout(() => { $('lb-card').classList.remove('boss'); $('lb-boss-tag').classList.add('hidden'); }, res.wait || 3000);
    }
  });
}

let lbFlashTimer = null;
function lbFlash(title, sub, kind) {
  const el = $('lb-flash');
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = sub || '';
  el.className = `nd-flash show ${kind}`;
  if (kind === 'super') { sfx.power(); buzz([40, 30, 40, 30, 80]); } else if (kind === 'slag') { sfx.good(); buzz(40); }
  clearTimeout(lbFlashTimer);
  lbFlashTimer = setTimeout(() => el.classList.remove('show'), kind === 'super' ? 1100 : 650);
}

document.addEventListener('keydown', e => {
  if (document.body.dataset.lb !== '1' || e.target.tagName === 'INPUT') return;
  if ($('lb-game').classList.contains('hidden')) return;
  if (lb.q && lb.q.answers && !lb.q.done && /^[1-4]$/.test(e.key)) lbAnswer(Number(e.key) - 1);
});

setInterval(() => {
  if (!lb.state || lb.state.phase !== 'play' || document.body.dataset.lb !== '1') return;
  const left = Math.max(0, lb.state.endsAt - lbNow());
  $('lb-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  const stun = lb.stunEnd - performance.now();
  $('lb-stun').classList.toggle('hidden', !(stun > 0));
  if (stun > 0) $('lb-stun-left').textContent = Math.ceil(stun / 1000);
  if (lb.q && lb.q.boss && lb.q.until) $('lb-boss-left').textContent = `${Math.max(0, Math.ceil((lb.q.until - performance.now()) / 1000))}s`;
}, 200);

// ---------- De baas boven de vraag ----------

const lbMini = (() => {
  const canvases = [$('lb-arena'), $('lb-lobby-boss')];
  let hitAt = 0, big = false, shieldHit = false, shakeAt = 0, bolts = [];
  function strike(kind, shield) {
    const t = performance.now();
    bolts.push({ t0: t, big: kind === 'super' || kind === 'boss' });
    setTimeout(() => { hitAt = performance.now(); big = kind === 'super' || kind === 'boss'; shieldHit = shield; }, 260);
  }
  function shake() { shakeAt = performance.now(); }
  function draw(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    const t = performance.now();
    const s = lb.state || {};
    const b = s.boss || BossDraw.DEFAULT;
    const aura = BossDraw.AURAS[b.extra.aura || 0];
    g.save();
    if (t - shakeAt < 500) g.translate((Math.random() - .5) * h * .06, (Math.random() - .5) * h * .04);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#05010c');
    bg.addColorStop(.75, '#1a0628');
    bg.addColorStop(1, '#060209');
    g.fillStyle = bg;
    g.fillRect(-10, -10, w + 20, h + 20);
    const glow = g.createRadialGradient(w / 2, h * .5, 0, w / 2, h * .5, h);
    glow.addColorStop(0, `${aura.glow}.35)`);
    glow.addColorStop(1, `${aura.glow}0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const kh = h * (b.extra.troon ? .66 : .8);
    const move = s.move;
    const info = BossDraw.boss(g, b, w / 2, h * .97, kh, {
      t, flash: t - hitAt < 90 && !shieldHit, raise: t - shakeAt < 600 ? Math.sin(((t - shakeAt) / 600) * Math.PI) : 0, angry: s.angry || 0,
      shield: move && move.kind === 'schild' ? { frac: move.hp / move.max } : null, weak: s.weak > 0,
    });
    // Mijn slag vliegt van onderen naar de baas.
    bolts = bolts.filter(bl => t - bl.t0 < 260);
    g.globalCompositeOperation = 'lighter';
    for (const bl of bolts) {
      const p = (t - bl.t0) / 260;
      const x = w * .5 + (1 - p) * w * .25, y = h - p * (h - info.chest[1]);
      const rr = h * (bl.big ? .12 : .06);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, '#fff');
      gr.addColorStop(.3, bl.big ? '#ffc94a' : '#4cc9ff');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
    if (t - hitAt < 300) {
      const p = (t - hitAt) / 300;
      g.strokeStyle = shieldHit ? aura.c : big ? '#ffc94a' : '#fff';
      g.globalAlpha = 1 - p;
      g.lineWidth = h * .03 * (1 - p);
      g.beginPath();
      g.arc(info.chest[0], info.chest[1], h * (big ? .5 : .3) * p, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  function frame() {
    requestAnimationFrame(frame);
    if (document.body.dataset.lb !== '1' || !lb.state) return;
    for (const c of canvases) if (c.offsetParent !== null && !c.closest('.hidden')) draw(c);
  }
  requestAnimationFrame(frame);
  return { strike, shake };
})();
