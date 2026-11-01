// Duel in de arena op de gsm of Chromebook: één tegen één, wie eerst juist antwoordt slaat toe.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
const du = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  shown: null,     // welke vraag op het scherm staat (ronde + nummer)
  hitShown: null,  // van welke vraag de uitslag al getoond is
  picked: null,
};

const duEsc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const duNow = () => Date.now() + du.offset;

function duShow(name) {
  for (const s of ['du-join', 'du-lobby', 'du-game', 'du-wait', 'du-end']) $(s).classList.toggle('hidden', s !== name);
}

function duJoin(name) {
  socket.emit('du-join', { playerId, name }, res => {
    if (res.error) {
      du.joined = false;
      $('du-join-error').textContent = res.error;
      duShow('du-join');
      return;
    }
    du.joined = true;
    store('lancelot-name', res.name);
    $('du-join-error').textContent = '';
  });
}

$('du-join').addEventListener('submit', e => {
  e.preventDefault();
  duJoin($('du-name').value);
});

function duHearts(n, max) {
  return Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">♥</span>`).join('');
}

function duWait(round, mark, title, text) {
  $('du-wait-round').textContent = round;
  $('du-wait-mark').textContent = mark;
  $('du-wait-title').textContent = title;
  $('du-wait-text').textContent = text;
  duShow('du-wait');
}

socket.on('du-state', s => {
  du.state = s;
  du.offset = s.now - Date.now();
  document.body.dataset.du = s.active ? '1' : '';
  if (s.active) duBg();
  if (!s.active) {
    du.joined = false;
    return;
  }
  if (du.run !== s.run) {
    du.run = s.run;
    du.joined = false;
    du.shown = null;
    du.hitShown = null;
    delete $('du-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (s.phase !== 'lobby') {
      $('du-join-error').textContent = 'Het toernooi is al begonnen. Wacht op het volgende.';
      $('du-name').value = saved || '';
      duShow('du-join');
    } else if (!du.joined && saved && du.autoRun !== s.run) {
      du.autoRun = s.run;
      duJoin(saved);
    } else if (!du.joined) {
      $('du-name').value = saved || '';
      duShow('du-join');
    }
    return;
  }
  du.joined = true;
  if (s.phase === 'lobby') {
    $('du-lobby-name').textContent = s.name;
    duShow('du-lobby');
  } else if (s.phase === 'duel') {
    duRender(s);
  } else if (s.phase === 'einde') {
    const champ = s.place === 1;
    $('du-end-mark').textContent = champ ? '👑' : ['🥈', '🥉'][s.place - 2] || '⚔️';
    $('du-end-title').textContent = champ ? 'Jij bent de kampioen van de arena!' : `Plaats ${s.place} van ${s.players}`;
    $('du-end-stats').textContent = `${champ ? '' : `Tot in: ${s.stage} · `}${s.wins} ${s.wins === 1 ? 'duel' : 'duels'} gewonnen · ${s.right} vragen juist`;
    if (!$('du-end').dataset.done && champ) confetti(5000);
    if (!$('du-end').dataset.done && champ) sfx.fanfare();
    $('du-end').dataset.done = '1';
    duShow('du-end');
  }
});

function duRender(s) {
  const m = s.match;
  const round = s.roundName;
  if (!m) {
    return duWait(round, '🛡️', s.out !== null ? 'Je bent uitgeschakeld' : 'Even wachten', s.out !== null ? `Je haalde de ${s.outName.toLowerCase()}. Kijk mee op het bord: wie wordt kampioen?` : 'Kijk naar het bord.');
  }
  if (m.winner === 'ik') {
    if (m.note === 'vrij') return duWait(round, '🎟️', 'Vrije doorgang!', 'Je hebt deze ronde geen tegenstander. Je gaat meteen door.');
    if (du.won !== `${s.run}-${s.round}`) { du.won = `${s.run}-${s.round}`; sfx.fanfare(); buzz([60, 40, 60]); }
    return duWait(round, '🏆', 'Gewonnen!', s.round === s.rounds - 1 ? 'Je wint de finale!' : 'Je gaat door naar de volgende ronde. Even wachten op de andere duels.');
  }
  if (m.winner === 'ander') {
    if (du.lost !== `${s.run}-${s.round}`) { du.lost = `${s.run}-${s.round}`; sfx.bad(); buzz(300); }
    return duWait(round, '🛡️', `${m.opponent} wint dit duel`, 'Goed gestreden! Kijk mee op het bord wie kampioen wordt.');
  }
  if (!m.question) {
    du.countdown = true;
    return duWait(round, '⚔️', `Tegen ${m.opponent}`, 'Maak je klaar! Wie eerst juist antwoordt, slaat toe.');
  }
  du.countdown = false;
  duShow('du-game');
  $('du-round').textContent = round;
  $('du-me-name').dataset.av = s.name;
  if ($('du-op-name').dataset.av !== m.opponent) {
    $('du-op-name').textContent = m.opponent;
    $('du-op-name').dataset.av = m.opponent;
  }
  $('du-my-hearts').innerHTML = duHearts(m.hp, s.hearts);
  $('du-op-hearts').innerHTML = duHearts(m.opHp, s.hearts);
  const key = `${s.run}-${s.round}-${m.number}`;
  if (du.shown !== key) {
    du.shown = key;
    du.picked = null;
    $('du-flash').classList.add('hidden');
    $('du-number').textContent = `Vraag ${m.number}`;
    $('du-q').textContent = m.question;
    $('du-answers').innerHTML = m.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('du-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = m.answers[i];
      b.addEventListener('click', () => duAnswer(i));
    });
    sfx.tick(false);
  }
  const tiles = [...$('du-answers').children];
  if (m.locked || m.hit) tiles.forEach(t => { t.disabled = true; t.classList.remove('enter'); });
  let note = '';
  if (!m.hit && m.locked) note = 'Fout... Hopelijk weet je tegenstander het ook niet!';
  else if (!m.hit && m.opLocked) note = `${m.opponent} antwoordde fout! Nu jij.`;
  $('du-note').textContent = note;
  if (m.hit && du.hitShown !== key) {
    du.hitShown = key;
    tiles.forEach((t, j) => {
      t.classList.toggle('right', j === m.hit.right);
      t.classList.toggle('dim', j !== m.hit.right && j !== du.picked);
    });
    if (du.picked !== null && du.picked !== m.hit.right) tiles[du.picked].classList.add('wrong');
    const flash = $('du-flash');
    const mine = m.hit.by === 'ik';
    flash.className = `sj-flash ${mine ? 'good' : m.hit.by ? 'bad' : ''}`;
    $('du-flash-mark').textContent = mine ? '⚔️' : m.hit.by ? '💥' : '⌛';
    $('du-flash-text').textContent = mine ? `Raak! ${m.opponent} verliest een hart.` : m.hit.by ? `${m.opponent} was sneller! Je verliest een hart.` : 'Niemand had het juist.';
    if (mine) sfx.good(); else if (m.hit.by) sfx.hit(); else sfx.bad();
    buzz(mine ? [30, 40, 30] : m.hit.by ? [200, 60, 200] : 120);
    setTimeout(() => flash.classList.add('hidden'), 1800);
  }
}

function duAnswer(i) {
  const m = du.state && du.state.match;
  if (!m || !m.question || m.locked || m.hit || du.picked !== null) return;
  du.picked = i;
  const tiles = [...$('du-answers').children];
  tiles.forEach(t => { t.disabled = true; t.classList.remove('enter'); });
  tiles[i].classList.add('picked');
  socket.emit('du-answer', i, res => {
    if (res && res.error) {
      du.picked = null;
      return;
    }
    if (res && !res.correct) {
      tiles[i].classList.add('wrong');
      sfx.bad();
      buzz(200);
    }
  });
}

// De tijdbalk en het aftellen voor een nieuw duel.
setInterval(() => {
  const s = du.state;
  if (!s || s.phase !== 'duel') return;
  const m = s.match;
  if (m && m.question && !m.hit) {
    const left = Math.max(0, m.until - duNow());
    $('du-timer').style.width = `${(left / 20000) * 100}%`;
  } else {
    $('du-timer').style.width = '0%';
  }
  const wait = s.nextAt - duNow();
  $('du-wait-count').textContent = du.countdown && wait > 0 ? Math.ceil(wait / 1000) : '';
}, 100);

socket.on('du-kicked', () => {
  du.joined = false;
  store('lancelot-name', null);
  $('du-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  duShow('du-join');
});

socket.on('connect', () => {
  if (du.joined) duJoin(store('lancelot-name') || '');
});

// Het colosseum als achtergrond: één keer getekend per schermgrootte, wat donkerder zodat de vragen leesbaar blijven.
function duBg() {
  const c = $('du-bg');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = Math.round(innerWidth * dpr);
  const h = Math.round(innerHeight * dpr);
  if (c.width === w && c.height === h) return;
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const painted = Glow.phoneBg(g, w, h, '/img/quizspellen/duel.webp', () => { c.width = 0; duBg(); });
  if (!painted) {
    const art = DuArt.colosseum(w, h, 15);
    g.drawImage(art.c, 0, 0);
    art.torches.forEach(([x, y, u], i) => DuArt.torch(g, x, y, u, i, i));
  }
  g.fillStyle = painted ? 'rgba(4, 3, 10, .25)' : 'rgba(4, 3, 10, .45)';
  g.fillRect(0, 0, w, h);
  Glow.vignette(g, w, h, .7);
}
window.addEventListener('resize', () => { if (document.body.dataset.du === '1') duBg(); });
