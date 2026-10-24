// Schattenjacht op de gsm: vragen beantwoorden, goud verdienen en upgrades kopen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
const sj = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  wallet: null,
  question: null,
  busy: false,
  shown: 0,          // het getoonde goud, telt op naar het echte bedrag
};

function sjShow(name) {
  for (const s of ['sj-join', 'sj-lobby', 'sj-game', 'sj-end']) $(s).classList.toggle('hidden', s !== name);
}

function sjFormat(n) {
  return Math.round(n).toLocaleString('nl-BE');
}

function sjJoin(name) {
  socket.emit('sj-join', { playerId, name }, res => {
    if (res.error) {
      sj.joined = false;
      $('sj-join-error').textContent = res.error;
      sjShow('sj-join');
      return;
    }
    sj.joined = true;
    store('lancelot-name', res.name);
    $('sj-join-error').textContent = '';
  });
}

$('sj-join').addEventListener('submit', e => {
  e.preventDefault();
  sjJoin($('sj-name').value);
});

socket.on('sj-state', s => {
  sj.state = s;
  sj.offset = s.now - Date.now();
  document.body.dataset.sj = s.active ? '1' : '';
  if (!s.active) {
    sj.joined = false;
    return;
  }
  if (sj.run !== s.run) {
    sj.run = s.run;
    sj.joined = false;
    sj.question = null;
    sj.shown = 0;
    delete $('sj-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!sj.joined && saved && sj.autoRun !== s.run) {
      sj.autoRun = s.run;
      sjJoin(saved);
    } else if (!sj.joined) {
      $('sj-name').value = saved || '';
      sjShow('sj-join');
    }
    return;
  }
  sj.joined = true;
  sj.wallet = { gold: s.gold, streak: s.streak, levels: s.levels, dubbel: s.dubbel, dubbelCost: s.dubbelCost };
  sj.rank = s.rank;
  sj.players = s.players;
  if (s.phase === 'lobby') {
    $('sj-lobby-name').textContent = s.name;
    sjShow('sj-lobby');
  } else if (s.phase === 'play') {
    sjShow('sj-game');
    sjWallet();
    if (!sj.question && !sj.busy) sjNext();
  } else if (s.phase === 'einde') {
    $('sj-shop').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    $('sj-end-medal').textContent = medals[s.rank - 1] || '💰';
    $('sj-end-title').textContent = s.rank === 1 ? 'Jij bent de rijkste ridder!' : `Plek ${s.rank} van ${s.players}`;
    $('sj-end-gold').textContent = `${sjFormat(s.gold)} goud`;
    $('sj-end-extra').textContent = 'Kijk naar het bord voor de eindstand.';
    if (!$('sj-end').dataset.done && s.rank <= 3) confetti(4000);
    $('sj-end').dataset.done = '1';
    sjShow('sj-end');
  }
});

socket.on('sj-rank', ({ rank, players }) => {
  sj.rank = rank;
  sj.players = players;
  $('sj-rank').textContent = `#${rank} van ${players}`;
});

socket.on('sj-kicked', () => {
  sj.joined = false;
  store('lancelot-name', null);
  $('sj-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  sjShow('sj-join');
});

socket.on('connect', () => {
  if (sj.joined) sjJoin(store('lancelot-name') || '');
});

// ---------- Vragen ----------

function sjNext() {
  if (!sj.state || sj.state.phase !== 'play') return;
  const wait = sj.state.startedAt - (Date.now() + sj.offset);
  if (wait > 0) {
    // Eerst aftellen, dan de eerste vraag.
    $('sj-countdown').classList.remove('hidden');
    $('sj-countdown').textContent = Math.ceil(wait / 1000);
    setTimeout(sjNext, Math.min(wait, 250));
    return;
  }
  $('sj-countdown').classList.add('hidden');
  sj.busy = true;
  socket.emit('sj-question', null, res => {
    sj.busy = false;
    if (res && res.wait) return gokWait($('sj-q'), res.wait, sjNext);
    if (!res || res.error) return;
    sj.question = res;
    $('sj-number').textContent = `Vraag ${res.number}`;
    $('sj-q').textContent = res.question;
    $('sj-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('sj-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => sjAnswer(i));
    });
  });
}

function sjAnswer(i) {
  if (!sj.question || sj.question.done) return;
  sj.question.done = true;
  socket.emit('sj-answer', i, res => {
    if (!res || res.error) {
      sj.question = null;
      return sjNext();
    }
    sj.wallet = res;
    const tiles = [...$('sj-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const flash = $('sj-flash');
    flash.className = `sj-flash ${res.correct ? 'good' : 'bad'}`;
    $('sj-flash-mark').textContent = res.correct ? '✔' : '✖';
    $('sj-flash-gold').textContent = res.change >= 0 ? `+${sjFormat(res.change)}` : `−${sjFormat(-res.change)}`;
    $('sj-flash-text').textContent = res.correct
      ? (res.streak > 1 ? `🔥 ${res.streak} op rij` : 'Raak!')
      : (res.change < 0 ? 'Mis! Je verliest wat goud.' : 'Mis!');
    if (res.correct) {
      sfx.good();
      sjCoins();
    } else {
      sfx.bad();
    }
    buzz(res.correct ? [30, 40, 30] : 200);
    sjWallet();
    const next = () => {
      flash.classList.add('hidden');
      sj.question = null;
      sjNext();
    };
    // Tegen gokken: bij een fout blijft het juiste antwoord staan tot het wachten voorbij is.
    if (res.correct) setTimeout(next, 900);
    else gokHold(flash, $('sj-q'), res, next);
  });
}

// Een handvol muntjes die naar de teller vliegen.
function sjCoins() {
  const target = document.querySelector('.sj-top .coin').getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('span');
    c.className = 'coin fly';
    c.style.left = `${innerWidth / 2 + (Math.random() - .5) * 120}px`;
    c.style.top = `${innerHeight / 2 + (Math.random() - .5) * 80}px`;
    document.body.appendChild(c);
    requestAnimationFrame(() => {
      c.style.transition = `transform ${.55 + i * .05}s cubic-bezier(.5, 0, .6, 1), opacity .2s ${.5 + i * .05}s`;
      c.style.transform = `translate(${target.left - parseFloat(c.style.left)}px, ${target.top - parseFloat(c.style.top)}px) scale(.6)`;
      c.style.opacity = '0';
    });
    setTimeout(() => c.remove(), 1200);
  }
}

function sjWallet() {
  const w = sj.wallet;
  if (!w) return;
  $('sj-streak').textContent = w.streak > 1 ? `🔥 ${w.streak} op rij` : '';
  $('sj-dubbel').textContent = w.dubbel > 0 ? `✨ Dubbel goud: nog ${w.dubbel}` : '';
  $('sj-shop-gold').textContent = sjFormat(w.gold);
  if (sj.rank) $('sj-rank').textContent = `#${sj.rank} van ${sj.players}`;
  if (!$('sj-shop').classList.contains('hidden')) sjRenderShop();
}

// De goudteller telt vloeiend op of af.
setInterval(() => {
  if (!sj.wallet) return;
  const goal = sj.wallet.gold;
  if (sj.shown === goal) return;
  const step = Math.max(1, Math.abs(goal - sj.shown) * .25);
  sj.shown = sj.shown < goal ? Math.min(goal, sj.shown + step) : Math.max(goal, sj.shown - step);
  $('sj-gold').textContent = sjFormat(sj.shown);
}, 40);

setInterval(() => {
  if (!sj.state || sj.state.phase !== 'play') return;
  const left = Math.max(0, sj.state.endsAt - (Date.now() + sj.offset));
  $('sj-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
}, 250);

// ---------- Schatkamer ----------

const SJ_ICONS = { zwaard: '⚔️', reeks: '👑', schild: '🛡️', dubbel: '✨' };

function sjRenderShop() {
  const w = sj.wallet;
  const { upgrades, dubbel } = sj.state.shop;
  const card = (id, title, what, now, cost) => `
    <div class="sj-item${cost !== null && w.gold >= cost ? ' affordable' : ''}">
      <span class="sj-item-icon">${SJ_ICONS[id]}</span>
      <div class="sj-item-text"><strong>${title}</strong><span>${what}</span><span class="sj-item-now">${now}</span></div>
      ${cost === null ? '<span class="sj-max">MAX</span>' : `<button data-buy="${id}" ${w.gold < cost ? 'disabled' : ''}><span class="coin"></span>${sjFormat(cost)}</button>`}
    </div>`;
  const level = id => w.levels[id];
  const up = id => upgrades[id];
  const next = id => (level(id) + 1 < up(id).values.length ? up(id).costs[level(id) + 1] : null);
  const step = (id, fmt) => {
    const v = up(id).values;
    return level(id) + 1 < v.length ? `${fmt(v[level(id)])} → ${fmt(v[level(id) + 1])}` : fmt(v[level(id)]);
  };
  $('sj-items').innerHTML = [
    card('zwaard', `${up('zwaard').name} · niv. ${level('zwaard') + 1}`, up('zwaard').what, step('zwaard', v => `${v} goud`), next('zwaard')),
    card('reeks', `${up('reeks').name} · niv. ${level('reeks') + 1}`, up('reeks').what, step('reeks', v => `+${v}`), next('reeks')),
    card('schild', `${up('schild').name} · niv. ${level('schild') + 1}`, up('schild').what, step('schild', v => `${v}%`), next('schild')),
    card('dubbel', dubbel.name, `dubbel goud voor je volgende ${dubbel.answers} goede antwoorden`, w.dubbel ? `nog ${w.dubbel} over` : '', w.dubbelCost),
  ].join('');
  for (const b of $('sj-items').querySelectorAll('[data-buy]')) {
    b.addEventListener('click', () => {
      socket.emit('sj-buy', b.dataset.buy, res => {
        if (!res || res.error) {
          $('sj-shop-error').textContent = res ? res.error : 'Er ging iets mis.';
          return;
        }
        $('sj-shop-error').textContent = '';
        sj.wallet = res;
        sfx.join();
        buzz(40);
        sjWallet();
      });
    });
  }
}

$('sj-shop-open').addEventListener('click', () => {
  $('sj-shop-error').textContent = '';
  $('sj-shop').classList.remove('hidden');
  sjRenderShop();
});
$('sj-shop-close').addEventListener('click', () => $('sj-shop').classList.add('hidden'));
