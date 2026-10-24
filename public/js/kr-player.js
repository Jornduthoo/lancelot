// Kristalroof op de gsm of Chromebook: vragen beantwoorden, kisten openen en kluizen kraken.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
const kr = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  wallet: null,
  question: null,
  busy: false,
  overlay: false,     // kisten of roof open: dan geen nieuwe vraag
  shown: 0,
};

const krFormat = n => Math.round(n).toLocaleString('nl-BE');
const krEsc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function krShow(name) {
  for (const s of ['kr-join', 'kr-lobby', 'kr-game', 'kr-end']) $(s).classList.toggle('hidden', s !== name);
}

function krJoin(name) {
  socket.emit('kr-join', { playerId, name }, res => {
    if (res.error) {
      kr.joined = false;
      $('kr-join-error').textContent = res.error;
      krShow('kr-join');
      return;
    }
    kr.joined = true;
    store('lancelot-name', res.name);
    $('kr-join-error').textContent = '';
  });
}

$('kr-join').addEventListener('submit', e => {
  e.preventDefault();
  krJoin($('kr-name').value);
});

socket.on('kr-state', s => {
  kr.state = s;
  kr.offset = s.now - Date.now();
  document.body.dataset.kr = s.active ? '1' : '';
  if (!s.active) {
    kr.joined = false;
    return;
  }
  if (kr.run !== s.run) {
    kr.run = s.run;
    kr.joined = false;
    kr.question = null;
    kr.overlay = false;
    kr.shown = 0;
    $('kr-chests').classList.add('hidden');
    $('kr-hack').classList.add('hidden');
    delete $('kr-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!kr.joined && saved && kr.autoRun !== s.run) {
      kr.autoRun = s.run;
      krJoin(saved);
    } else if (!kr.joined) {
      $('kr-name').value = saved || '';
      krShow('kr-join');
    }
    return;
  }
  kr.joined = true;
  kr.wallet = { crystals: s.crystals, streak: s.streak, shield: s.shield, at: Date.now() };
  kr.rank = s.rank;
  kr.players = s.players;
  if (s.phase === 'lobby') {
    $('kr-lobby-name').textContent = s.name;
    krWords(s);
    krShow('kr-lobby');
  } else if (s.phase === 'play') {
    krShow('kr-game');
    krWallet();
    if (!kr.question && !kr.busy && !kr.overlay) krNext();
  } else if (s.phase === 'einde') {
    $('kr-chests').classList.add('hidden');
    $('kr-hack').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    $('kr-end-medal').textContent = medals[s.rank - 1] || '💎';
    $('kr-end-title').textContent = s.rank === 1 ? 'Jij bent de rijkste rover!' : `Plek ${s.rank} van ${s.players}`;
    $('kr-end-crystals').textContent = `${krFormat(s.crystals)} 💎`;
    $('kr-end-stats').textContent = `${s.right} vragen juist · ${s.robs} keer geroofd · ${s.robbed} keer zelf beroofd`;
    if (!$('kr-end').dataset.done && s.rank <= 3) confetti(4000);
    $('kr-end').dataset.done = '1';
    krShow('kr-end');
  }
});

// Het geheime woord kiezen in de wachtkamer.
function krWords(s) {
  $('kr-words').innerHTML = s.options.map(w => `<button class="kr-word${w === s.secret ? ' on' : ''}" data-word="${krEsc(w)}">${w === s.secret ? '🔒 ' : ''}${krEsc(w)}</button>`).join('');
  for (const b of $('kr-words').children) {
    b.addEventListener('click', () => socket.emit('kr-secret', b.dataset.word, () => sfx.marker()));
  }
}

socket.on('kr-rank', ({ rank, players, crystals }) => {
  kr.rank = rank;
  kr.players = players;
  if (kr.wallet) kr.wallet.crystals = crystals;
  krWallet();
});

socket.on('kr-kicked', () => {
  kr.joined = false;
  store('lancelot-name', null);
  $('kr-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  krShow('kr-join');
});

socket.on('connect', () => {
  if (kr.joined) krJoin(store('lancelot-name') || '');
});

// Iemand kraakte je kluis (of probeerde het).
socket.on('kr-robbed', r => {
  if (kr.wallet) kr.wallet.crystals = r.crystals;
  krAlert(`🗝️ ${r.by} kraakte je kluis! −${krFormat(r.amount)} 💎`, 'bad');
  sfx.hit();
  buzz([200, 80, 200]);
  krWallet();
});
socket.on('kr-attempt', r => {
  krAlert(`🛡️ ${r.by} probeerde je kluis te kraken, maar raadde fout!`, 'good');
  sfx.marker();
});

let krAlertTimer = null;
function krAlert(text, kind) {
  const el = $('kr-alert');
  el.textContent = text;
  el.className = `kr-alert ${kind}`;
  clearTimeout(krAlertTimer);
  krAlertTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ---------- Vragen ----------

function krNext() {
  if (!kr.state || kr.state.phase !== 'play') return;
  const wait = kr.state.startedAt - (Date.now() + kr.offset);
  if (wait > 0) {
    $('kr-countdown').classList.remove('hidden');
    $('kr-countdown').textContent = Math.ceil(wait / 1000);
    setTimeout(krNext, Math.min(wait, 250));
    return;
  }
  $('kr-countdown').classList.add('hidden');
  kr.busy = true;
  socket.emit('kr-question', null, res => {
    kr.busy = false;
    if (res && res.wait) return gokWait($('kr-q'), res.wait, krNext);
    if (!res || res.error) return;
    if (res.chests) return krChests();
    kr.question = res;
    $('kr-number').textContent = `Vraag ${res.number}`;
    $('kr-q').textContent = res.question;
    $('kr-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('kr-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => krAnswer(i));
    });
  });
}

function krAnswer(i) {
  if (!kr.question || kr.question.done) return;
  kr.question.done = true;
  socket.emit('kr-answer', i, res => {
    if (!res || res.error) {
      kr.question = null;
      return krNext();
    }
    kr.wallet = { ...res, at: Date.now() };
    const tiles = [...$('kr-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const flash = $('kr-flash');
    flash.className = `sj-flash ${res.correct ? 'good' : 'bad'}`;
    $('kr-flash-mark').textContent = res.correct ? '✔' : '✖';
    $('kr-flash-text').textContent = res.correct ? (res.streak > 1 ? `🔥 ${res.streak} op rij · kies een kist!` : 'Raak! Kies een kist.') : 'Mis! Geen kist deze keer.';
    if (res.correct) sfx.good(); else sfx.bad();
    buzz(res.correct ? [30, 40, 30] : 200);
    krWallet();
    const next = () => {
      flash.classList.add('hidden');
      kr.question = null;
      if (res.correct) krChests(); else krNext();
    };
    if (res.correct) setTimeout(next, 700);
    else gokHold(flash, $('kr-q'), res, next);
  });
}

// ---------- Kisten ----------

const KR_CHEST = {
  klein: c => `+${krFormat(c.amount)} 💎`,
  middel: c => `+${krFormat(c.amount)} 💎`,
  groot: c => `+${krFormat(c.amount)} 💎`,
  dubbel: () => '✨ Dubbel!',
  roof: () => '🗝️ Roof!',
  schild: () => '🛡️ Schild',
  pech: () => '💥 Pech',
};

function krChests() {
  kr.overlay = true;
  const box = $('kr-chests');
  box.classList.remove('hidden');
  $('kr-chest-result').textContent = '';
  $('kr-chest-row').innerHTML = [0, 1, 2].map(i => `<button class="kr-chest" style="animation-delay:${i * 80}ms"><span class="kr-lid"></span><span class="kr-label">${i + 1}</span></button>`).join('');
  [...$('kr-chest-row').children].forEach((b, i) => b.addEventListener('click', () => krOpen(i)));
}

function krOpen(index) {
  const chests = [...$('kr-chest-row').children];
  if (chests.some(c => c.disabled)) return;
  chests.forEach(c => { c.disabled = true; });
  socket.emit('kr-open', index, res => {
    if (!res || res.error) {
      $('kr-chests').classList.add('hidden');
      kr.overlay = false;
      return krNext();
    }
    kr.wallet = { ...res, at: Date.now() };
    res.reveal.forEach((c, i) => {
      const el = chests[i];
      el.classList.add('open', `k-${c.kind}`);
      el.classList.toggle('mine', i === index);
      el.querySelector('.kr-label').textContent = KR_CHEST[c.kind](c);
    });
    const result = $('kr-chest-result');
    const text = {
      klein: `+${krFormat(res.change)} kristallen`,
      middel: `+${krFormat(res.change)} kristallen!`,
      groot: `Jackpot! +${krFormat(res.change)} kristallen!`,
      dubbel: `Dubbel! +${krFormat(res.change)} kristallen`,
      schild: 'Schild! 45 seconden kan niemand je beroven.',
      pech: res.change ? `Pech! −${krFormat(-res.change)} kristallen` : 'Pech! Gelukkig had je nog niets.',
      roof: 'Roof! Kies een kluis om te kraken.',
    }[res.kind];
    result.textContent = text;
    result.className = `kr-result ${res.kind === 'pech' ? 'bad' : 'good'}`;
    if (res.kind === 'pech') sfx.bad();
    else if (res.kind === 'groot' || res.kind === 'dubbel') { sfx.fanfare(); confetti(1500); }
    else sfx.power();
    buzz(40);
    krWallet();
    setTimeout(() => {
      $('kr-chests').classList.add('hidden');
      if (res.kind === 'roof') return krTargets(res.targets);
      kr.overlay = false;
      krNext();
    }, res.kind === 'roof' ? 1100 : 1500);
  });
}

// ---------- Roven ----------

function krTargets(targets) {
  $('kr-hack').classList.remove('hidden');
  $('kr-hack-title').textContent = '🗝️ Wiens kluis kraak jij?';
  $('kr-hack-sub').textContent = 'Kies een ridder. Daarna raad je diens geheime woord.';
  $('kr-hack-result').textContent = '';
  $('kr-hack-skip').classList.remove('hidden');
  $('kr-targets').className = 'kr-targets';
  $('kr-targets').innerHTML = targets.map(t => `<button data-id="${krEsc(t.id)}" ${t.shield ? 'disabled' : ''}>
    <span class="kr-t-name">${krEsc(t.name)}</span><span class="kr-t-gems">${t.shield ? '🛡️' : `${krFormat(t.crystals)} 💎`}</span></button>`).join('');
  for (const b of $('kr-targets').children) {
    b.addEventListener('click', () => {
      socket.emit('kr-target', b.dataset.id, res => {
        if (!res || res.error) {
          $('kr-hack-result').textContent = res ? res.error : '';
          if (res && res.targets) krTargets(res.targets);
          return;
        }
        krGuess(res);
      });
    });
  }
}

function krGuess(t) {
  $('kr-hack-title').textContent = `🔐 De kluis van ${t.name}`;
  $('kr-hack-sub').textContent = `${krFormat(t.crystals)} 💎 achter slot. Welk woord is het geheime woord?`;
  $('kr-hack-skip').classList.add('hidden');
  $('kr-targets').className = 'kr-targets guess';
  $('kr-targets').innerHTML = t.words.map(w => `<button data-word="${krEsc(w)}">${krEsc(w)}</button>`).join('');
  for (const b of $('kr-targets').children) {
    b.addEventListener('click', () => {
      for (const o of $('kr-targets').children) o.disabled = true;
      socket.emit('kr-guess', b.dataset.word, res => {
        if (!res || res.error) return krHackDone();
        kr.wallet = { ...res, at: Date.now() };
        b.classList.add(res.success ? 'right' : 'wrong');
        const result = $('kr-hack-result');
        result.textContent = res.success ? `Gekraakt! Je roofde ${krFormat(res.amount)} 💎 (${res.pct}%) van ${res.name}!` : `Fout! De kluis van ${res.name} blijft dicht.`;
        result.className = `kr-result ${res.success ? 'good' : 'bad'}`;
        if (res.success) { sfx.fanfare(); confetti(1500); } else sfx.bad();
        buzz(res.success ? [40, 40, 40, 40, 80] : 200);
        krWallet();
        setTimeout(krHackDone, 1800);
      });
    });
  }
}

function krHackDone() {
  $('kr-hack').classList.add('hidden');
  kr.overlay = false;
  krNext();
}

$('kr-hack-skip').addEventListener('click', () => socket.emit('kr-skip', null, krHackDone));

// ---------- Teller en klok ----------

function krWallet() {
  const w = kr.wallet;
  if (!w) return;
  $('kr-streak').textContent = w.streak > 1 ? `🔥 ${w.streak} op rij` : '';
  const shield = Math.max(0, (w.shield || 0) - (Date.now() - (w.at || Date.now())));
  $('kr-badge').textContent = shield > 0 ? `🛡️ Schild ${Math.ceil(shield / 1000)} s` : '';
  if (kr.rank) $('kr-rank').textContent = `#${kr.rank} van ${kr.players}`;
}

setInterval(() => {
  if (!kr.wallet) return;
  const goal = kr.wallet.crystals;
  if (kr.shown !== goal) {
    const step = Math.max(1, Math.abs(goal - kr.shown) * .25);
    kr.shown = kr.shown < goal ? Math.min(goal, kr.shown + step) : Math.max(goal, kr.shown - step);
    $('kr-crystals').textContent = krFormat(kr.shown);
  }
}, 40);

setInterval(() => {
  if (!kr.state || kr.state.phase !== 'play') return;
  const left = Math.max(0, kr.state.endsAt - (Date.now() + kr.offset));
  $('kr-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  krWallet();
}, 500);
