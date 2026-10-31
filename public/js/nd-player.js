// Neon Duel op de gsm of Chromebook: vragen beantwoorden voor je team. Juist = een slag van jullie ridder op het bord.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
// De schermen staan hier zelf in, zodat index.html klein blijft.
(() => {
  const main = document.querySelector('main');
  const box = document.createElement('div');
  box.id = 'neonduel';
  box.innerHTML = `
  <form id="nd-join" class="screen welcome hidden">
    <img src="/img/logo.webp" alt="LANcelot" data-logo-3d>
    <p class="title">Neon Duel</p>
    <input id="nd-name" maxlength="20" autocomplete="off" placeholder="Je naam">
    <p class="error" id="nd-join-error"></p>
    <button type="submit" class="big">Kies je team</button>
  </form>
  <section id="nd-lobby" class="screen panel hidden">
    <p class="status">Neon Duel</p>
    <p class="title" id="nd-lobby-name"></p>
    <div class="nd-myteam" id="nd-lobby-team"></div>
    <p>Elk goed antwoord is een <strong>slag</strong> van de ridder van jouw team op het bord. Snel juist = <strong>combo</strong>. Drie op rij = <strong>supermove</strong>. Samen vullen jullie de energiebalk voor de <strong>NEON OVERDRIVE</strong>.</p>
    <p class="muted small">Fout? Even wachten, en die vraag komt later terug. Antwoorden met 1-4 kan ook.</p>
    <p class="muted small">Wacht tot de leerkracht het duel start.</p>
    <div class="spinner"></div>
  </section>
  <section id="nd-game" class="hidden">
    <div class="nd-hud">
      <div class="nd-bars">
        <div class="nd-bar us"><span id="nd-us-name"></span><i><b id="nd-us-hp"></b></i></div>
        <div class="nd-clock" id="nd-clock"></div>
        <div class="nd-bar them"><span id="nd-them-name"></span><i><b id="nd-them-hp"></b></i></div>
      </div>
      <div class="nd-sub">
        <div class="nd-energy"><span>ENERGIE</span><i><b id="nd-energy"></b></i></div>
        <div class="nd-streak" id="nd-streak" title="Drie op rij = supermove"></div>
        <div class="nd-dmg"><span id="nd-dmg">0</span> schade</div>
      </div>
    </div>
    <canvas class="nd-arena" id="nd-arena"></canvas>
    <div class="nd-pause hidden" id="nd-pause"></div>
    <div class="nd-card">
      <p class="nd-q-text" id="nd-q-text"></p>
      <div class="answers" id="nd-q-answers"></div>
      <p class="tw-q-result" id="nd-q-result"></p>
    </div>
    <div class="nd-flash" id="nd-flash"><strong></strong><span></span></div>
  </section>
  <section id="nd-end" class="screen panel hidden">
    <div class="mark" id="nd-end-mark" style="font-size:4.5rem"></div>
    <p class="title" id="nd-end-title"></p>
    <p class="big" id="nd-end-score" style="font-size:2rem"></p>
    <p id="nd-end-stats"></p>
    <p class="muted">Kijk naar het bord voor de eindstand.</p>
  </section>`;
  main.appendChild(box);
  if (!document.querySelector('link[href="/neon.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/neon.css';
    document.head.appendChild(link);
  }
})();

const nd = { state: null, joined: false, run: -1, offset: 0, q: null, live: null, autoRun: -1 };
const ndNow = () => Date.now() + nd.offset;
const ND_TEAMS = [{ name: 'Team Bliksem', icon: '⚡' }, { name: 'Team Vuur', icon: '🔥' }];

function ndShow(name) {
  for (const s of ['nd-join', 'nd-lobby', 'nd-game', 'nd-end']) $(s).classList.toggle('hidden', s !== name);
}

function ndJoin(name) {
  socket.emit('nd-join', { playerId, name }, res => {
    if (res.error) {
      nd.joined = false;
      $('nd-join-error').textContent = res.error;
      ndShow('nd-join');
      return;
    }
    nd.joined = true;
    store('lancelot-name', res.name);
    $('nd-join-error').textContent = '';
  });
}

$('nd-join').addEventListener('submit', e => {
  e.preventDefault();
  ndJoin($('nd-name').value);
});

socket.on('nd-state', s => {
  const old = nd.state;
  nd.state = s;
  nd.offset = s.now - Date.now();
  document.body.dataset.nd = s.active ? '1' : '';
  if (!s.active) {
    nd.joined = false;
    return;
  }
  if (nd.run !== s.run) {
    nd.run = s.run;
    nd.joined = false;
    nd.q = null;
    delete $('nd-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!nd.joined && saved && nd.autoRun !== s.run) {
      nd.autoRun = s.run;
      ndJoin(saved);
    } else if (!nd.joined) {
      $('nd-name').value = saved || '';
      ndShow('nd-join');
    }
    return;
  }
  nd.joined = true;
  document.body.dataset.ndTeam = String(s.team);
  if (s.phase === 'lobby') {
    $('nd-lobby-name').textContent = s.name;
    $('nd-lobby-team').textContent = `Jij vecht mee voor ${ND_TEAMS[s.team].icon} ${ND_TEAMS[s.team].name}`;
    $('nd-lobby-team').className = `nd-myteam t${s.team}`;
    ndShow('nd-lobby');
  } else if (s.phase === 'play') {
    ndShow('nd-game');
    $('nd-us-name').textContent = `${ND_TEAMS[s.team].icon} Wij`;
    $('nd-them-name').textContent = `${ND_TEAMS[1 - s.team].name} ${ND_TEAMS[1 - s.team].icon}`;
    ndHud(s);
    ndPause(s, old);
    if (!nd.q) ndAsk();
  } else if (s.phase === 'einde') {
    nd.q = null;
    const won = s.winner === s.team;
    $('nd-end-mark').textContent = s.winner < 0 ? '🤝' : won ? '🏆' : '🛡️';
    $('nd-end-title').textContent = s.winner < 0 ? 'Gelijkspel!' : won ? 'Jullie winnen het Neon Duel!' : `${ND_TEAMS[s.winner].name} wint`;
    $('nd-end-score').textContent = `${Math.round(s.dmg || 0)} schade`;
    $('nd-end-stats').textContent = `${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist · ${s.supers || 0} ${s.supers === 1 ? 'supermove' : 'supermoves'} · plek ${s.rank} van ${s.teamCount} in je team`;
    if (!$('nd-end').dataset.done && won) confetti(4000);
    $('nd-end').dataset.done = '1';
    ndShow('nd-end');
  }
});

socket.on('nd-tick', msg => {
  if (!nd.state || nd.state.phase !== 'play') return;
  Object.assign(nd.state, msg);
  ndHud(nd.state);
});

socket.on('nd-kicked', () => {
  nd.joined = false;
  store('lancelot-name', null);
  $('nd-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  ndShow('nd-join');
});

socket.on('connect', () => {
  if (nd.joined) ndJoin(store('lancelot-name') || '');
});

function ndHud(s) {
  const us = s.team, them = 1 - s.team;
  $('nd-us-hp').style.width = `${s.hp[us]}%`;
  $('nd-them-hp').style.width = `${s.hp[them]}%`;
  $('nd-energy').style.width = `${s.energy[us]}%`;
  $('nd-energy').parentElement.classList.toggle('full', s.energy[us] > 85);
}

// Tussen de rondes: even kijken naar het bord. Antwoorden mag wel: dat vult de energiebalk.
function ndPause(s, old) {
  const el = $('nd-pause');
  if (s.stage === 'fight') {
    el.classList.add('hidden');
    if (old && old.stage === 'intro') { buzz(60); sfx.go(); }
    return;
  }
  el.classList.remove('hidden');
  if (s.stage === 'intro') {
    const mine = s.champions[s.team];
    el.innerHTML = `<strong>RONDE ${s.round}</strong><span>${mine === s.name ? '⚔️ Jij bent de kampioen van je team! Kijk naar het bord.' : `${ND_TEAMS[s.team].icon} ${mine || 'Jullie ridder'} vecht voor jullie`}</span>`;
  } else if (s.stage === 'ko') {
    const w = s.roundWinner;
    el.innerHTML = w < 0 ? '<strong>GELIJK!</strong><span>Op naar de volgende ronde</span>'
      : w === s.team ? '<strong>RONDE GEWONNEN!</strong><span>Antwoord verder: zo vul je de energiebalk</span>'
        : '<strong>RONDE VERLOREN</strong><span>Antwoord verder en sla terug!</span>';
    if (old && old.stage !== 'ko') { buzz(w === s.team ? [60, 40, 60] : 200); if (w === s.team) sfx.good(); else sfx.bad(); }
  }
}

function ndStreak(n) {
  const k = n % 3;
  $('nd-streak').innerHTML = [0, 1, 2].map(i => `<i class="${i < k ? 'on' : ''}">🔥</i>`).join('') + '<em>SUPER</em>';
}
ndStreak(0);

// ---------- Vragen ----------

function ndAsk() {
  if (nd.q && !nd.q.done) return;
  nd.q = { loading: true };
  socket.emit('nd-question', null, res => {
    if (!nd.q || !nd.q.loading) return;
    if (res && res.wait) {
      $('nd-q-text').textContent = 'Even nadenken…';
      $('nd-q-answers').innerHTML = '';
      ndWait(res.wait);
      return;
    }
    if (!res || res.error) { nd.q = null; return; }
    nd.q = { answers: res.answers, at: performance.now(), fast: res.fastMs };
    ndStreak(res.streak);
    $('nd-q-text').textContent = res.question;
    const result = $('nd-q-result');
    result.textContent = '';
    result.className = 'tw-q-result';
    $('nd-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('nd-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => ndAnswer(i));
    });
  });
}

let ndWaitTimer = null;
function ndWait(ms) {
  clearInterval(ndWaitTimer);
  const end = performance.now() + ms;
  const result = $('nd-q-result');
  let small = result.querySelector('small');
  if (!small) { small = document.createElement('small'); result.append(document.createElement('br'), small); }
  const step = () => {
    const left = end - performance.now();
    if (left <= 0) {
      clearInterval(ndWaitTimer);
      nd.q = null;
      if (nd.state && nd.state.phase === 'play') ndAsk();
      return;
    }
    small.textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
  };
  step();
  ndWaitTimer = setInterval(step, 200);
}

function ndAnswer(i) {
  if (!nd.q || nd.q.done || !nd.q.answers) return;
  nd.q.done = true;
  socket.emit('nd-answer', i, res => {
    if (!res || res.error) { nd.q = null; return ndAsk(); }
    const tiles = [...$('nd-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    const result = $('nd-q-result');
    ndStreak(res.streak);
    if (res.correct) {
      result.className = 'tw-q-result good';
      const label = { slag: 'SLAG!', combo: 'COMBO!', super: 'SUPERMOVE!' }[res.kind];
      result.textContent = res.pause ? 'Juist! +energie' : `Juist! ${label}`;
      if (nd.state) nd.state.dmg = (nd.state.dmg || 0) + (res.dmg || 0);
      $('nd-dmg').textContent = Math.round((nd.state && nd.state.dmg) || 0);
      ndFlash(res);
      ndMini.strike(res.kind, res.dmg, res.overdrive, res.pause);
      setTimeout(() => { nd.q = null; ndAsk(); }, res.kind === 'super' ? 1300 : 800);
    } else {
      // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
      tiles[i].classList.add('wrong');
      result.className = 'tw-q-result bad';
      result.textContent = 'Helaas! Kijk naar het juiste antwoord.';
      sfx.bad();
      buzz(200);
      ndMini.miss();
      nd.q.loading = true;
      ndWait(res.wait || 3000);
    }
  });
}

let ndFlashTimer = null;
function ndFlash(res) {
  const el = $('nd-flash');
  const kind = res.overdrive ? 'overdrive' : res.pause ? 'pause' : res.kind;
  const title = { slag: 'SLAG!', combo: 'COMBO!', super: 'SUPERMOVE!', overdrive: 'NEON OVERDRIVE!', pause: '+ ENERGIE' }[kind];
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = res.dmg ? `-${Math.round(res.dmg)} voor de tegenstander` : (kind === 'pause' ? 'voor de volgende ronde' : '');
  el.className = `nd-flash show ${kind}`;
  if (kind === 'super' || kind === 'overdrive') { sfx.power(); buzz([40, 30, 40, 30, 80]); } else { sfx.good(); buzz(40); }
  clearTimeout(ndFlashTimer);
  ndFlashTimer = setTimeout(() => el.classList.remove('show'), kind === 'super' || kind === 'overdrive' ? 1200 : 650);
}

document.addEventListener('keydown', e => {
  if (document.body.dataset.nd !== '1' || e.target.tagName === 'INPUT') return;
  if ($('nd-game').classList.contains('hidden')) return;
  if (nd.q && nd.q.answers && !nd.q.done && /^[1-4]$/.test(e.key)) ndAnswer(Number(e.key) - 1);
});

setInterval(() => {
  if (!nd.state || nd.state.phase !== 'play' || document.body.dataset.nd !== '1') return;
  const s = nd.state;
  const left = s.stage === 'intro' ? s.roundSec * 1000 : Math.max(0, s.roundEnds - ndNow());
  $('nd-clock').textContent = s.stage === 'ko' ? 'K.O.' : String(Math.ceil(left / 1000));
}, 250);

// ---------- Een kleine arena boven de vraag: jullie kampioen tegen die van het andere team ----------

const ndMini = (() => {
  const canvas = $('nd-arena');
  const g = canvas.getContext('2d');
  const COLORS = ['#3fd8ff', '#ff3d6e'];
  const ARMOR = ['#2fb8f0', '#ff4d6d'];
  let anim = null, flinch = 0, sparks = [], nums = [];
  const hash = text => {
    let h = 2166136261;
    for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const avatarOf = name => {
    const own = Avatar.byName(name);
    if (own) return own;
    const av = {};
    for (const [k, n] of Object.entries(Avatar.KEYS)) av[k] = hash(`${name}|${k}`) % n;
    return av;
  };
  function strike(kind, dmg, overdrive, pause) {
    if (pause) return;
    anim = { kind: overdrive ? 'overdrive' : kind, t0: performance.now() };
    const w = canvas.width, h = canvas.height;
    const n = kind === 'super' || overdrive ? 40 : kind === 'combo' ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 6) * h / 160;
      sparks.push({ x: w * .72, y: h * .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: performance.now() + 120, life: 300 + Math.random() * 400 });
    }
    if (dmg) nums.push({ text: `-${Math.round(dmg)}`, t0: performance.now() + 120, big: kind === 'super' || overdrive });
  }
  function miss() { flinch = performance.now(); }
  function frame() {
    requestAnimationFrame(frame);
    if (document.body.dataset.nd !== '1' || $('nd-game').classList.contains('hidden') || !nd.state || nd.state.team === undefined) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const t = performance.now();
    const us = nd.state.team, them = 1 - us;
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120634');
    bg.addColorStop(.65, '#2a0c4a');
    bg.addColorStop(1, '#05021a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Neon vloer met raster.
    const hy = h * .72;
    g.strokeStyle = 'rgba(199,125,255,.35)';
    g.lineWidth = Math.max(1, dpr);
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * .02, hy); g.lineTo(w / 2 + i * w * .12, h); g.stroke(); }
    for (let k = 0; k < 5; k++) { const y = hy + Math.pow((k + (t / 1500) % 1) / 5, 2) * (h - hy); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const fh = h * .86;
    const champs = nd.state.champions || ['', ''];
    const draw = (team, x, mirror, dx, tilt, flash) => {
      const img = Avatar.sprite(avatarOf(champs[team] || `team${team}`), { k: Math.max(3, Math.round(fh / 17)), armor: ARMOR[team] });
      const fw = img.width * fh / img.height;
      g.save();
      g.translate(x + dx, hy + h * .14 - Math.abs(Math.sin(t / 380 + team)) * h * .02);
      g.rotate(tilt);
      if (mirror) g.scale(-1, 1);
      g.shadowColor = COLORS[team];
      g.shadowBlur = h * .08;
      if (flash && 'filter' in g) g.filter = 'brightness(3) saturate(0)';
      g.drawImage(img, -fw / 2, -fh, fw, fh);
      g.restore();
    };
    let dx = 0, tilt = 0, hitFlash = false;
    if (anim) {
      const p = (t - anim.t0) / (anim.kind === 'super' || anim.kind === 'overdrive' ? 700 : 380);
      if (p >= 1) anim = null;
      else {
        const go = p < .35 ? p / .35 : 1 - (p - .35) / .65;
        dx = go * w * (anim.kind === 'super' || anim.kind === 'overdrive' ? .3 : .12);
        tilt = go * .15;
        hitFlash = p > .3 && p < .5;
      }
    }
    const fl = t - flinch < 400 ? (1 - (t - flinch) / 400) : 0;
    draw(them, w * .74, true, hitFlash ? w * .02 : 0, hitFlash ? .1 : 0, hitFlash);
    draw(us, w * .26, false, dx - fl * w * .03, tilt - fl * .15, false);
    // VS in het midden.
    g.save();
    g.font = `italic 900 ${Math.round(h * .22)}px Orbitron, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffc94a';
    g.shadowColor = '#ffc94a';
    g.shadowBlur = h * .1;
    g.globalAlpha = anim ? .3 : .9;
    g.fillText('VS', w / 2, h * .42);
    g.restore();
    // Zwaardboog, vonken en de schade.
    if (anim && (t - anim.t0) < 320) {
      const p = (t - anim.t0) / 320;
      const big = anim.kind === 'super' || anim.kind === 'overdrive';
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = COLORS[us];
      g.shadowColor = COLORS[us];
      g.shadowBlur = h * .1;
      g.lineWidth = h * (big ? .07 : .035) * (1 - p);
      g.beginPath();
      g.arc(w * .66, h * .5, h * (big ? .45 : .3), -Math.PI * .5, -Math.PI * .5 + p * Math.PI);
      g.stroke();
      g.restore();
    }
    sparks = sparks.filter(s => t - s.t0 < s.life);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const s of sparks) {
      if (t < s.t0) continue;
      const k = (t - s.t0) / s.life;
      s.x += s.vx; s.y += s.vy; s.vy += .2 * h / 160;
      g.globalAlpha = 1 - k;
      g.strokeStyle = Math.random() < .3 ? '#fff' : COLORS[us];
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
      g.stroke();
    }
    g.restore();
    nums = nums.filter(n => t - n.t0 < 900);
    for (const n of nums) {
      if (t < n.t0) continue;
      const p = (t - n.t0) / 900;
      g.save();
      g.globalAlpha = 1 - p;
      g.font = `italic 900 ${Math.round(h * (n.big ? .28 : .2))}px Orbitron, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = h * .03;
      g.strokeStyle = '#07031a';
      g.strokeText(n.text, w * .74, h * .35 - p * h * .2);
      g.fillStyle = n.big ? '#fff3b0' : COLORS[us];
      g.fillText(n.text, w * .74, h * .35 - p * h * .2);
      g.restore();
    }
  }
  requestAnimationFrame(frame);
  return { strike, miss };
})();
