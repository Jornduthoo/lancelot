// Burchtbouwers op de gsm of Chromebook: vragen beantwoorden en je stenen op de burcht leggen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
const bb = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  question: null,
  busy: false,
  picking: false,
  parts: [],
  need: 0,
};

const BB_ICON = { toren: '🗼', muur: '🧱', poort: '🚪', donjon: '🏰' };

function bbShow(name) {
  for (const s of ['bb-join', 'bb-lobby', 'bb-game', 'bb-dragon', 'bb-end']) $(s).classList.toggle('hidden', s !== name);
}

function bbJoin(name) {
  socket.emit('bb-join', { playerId, name }, res => {
    if (res.error) {
      bb.joined = false;
      $('bb-join-error').textContent = res.error;
      bbShow('bb-join');
      return;
    }
    bb.joined = true;
    store('lancelot-name', res.name);
    $('bb-join-error').textContent = '';
  });
}

$('bb-join').addEventListener('submit', e => {
  e.preventDefault();
  bbJoin($('bb-name').value);
});

socket.on('bb-state', s => {
  bb.state = s;
  bb.offset = s.now - Date.now();
  document.body.dataset.bb = s.active ? '1' : '';
  if (!s.active) {
    bb.joined = false;
    return;
  }
  if (bb.run !== s.run) {
    bb.run = s.run;
    bb.joined = false;
    bb.question = null;
    bb.picking = false;
    $('bb-pick').classList.add('hidden');
    delete $('bb-end').dataset.done;
  }
  bb.parts = s.parts;
  bb.need = s.need;
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!bb.joined && saved && bb.autoRun !== s.run) {
      bb.autoRun = s.run;
      bbJoin(saved);
    } else if (!bb.joined) {
      $('bb-name').value = saved || '';
      bbShow('bb-join');
    }
    return;
  }
  bb.joined = true;
  bb.placed = s.placed;
  bb.streak = s.streak;
  if (s.phase === 'lobby') {
    $('bb-lobby-name').textContent = s.name;
    bbShow('bb-lobby');
  } else if (s.phase === 'bouwen') {
    bbShow('bb-game');
    bbTop();
    if (!bb.question && !bb.busy && !bb.picking) bbNext();
  } else if (s.phase === 'draak') {
    bb.question = null;
    bb.picking = false;
    $('bb-pick').classList.add('hidden');
    $('bb-flash').classList.add('hidden');
    bbShow('bb-dragon');
  } else if (s.phase === 'einde') {
    $('bb-end-mark').textContent = s.held ? '🏰' : '🔥';
    $('bb-end-title').textContent = s.held ? 'De burcht houdt stand!' : 'De draak heeft de burcht verwoest...';
    $('bb-end-stats').textContent = `Jij legde ${s.placed} ${s.placed === 1 ? 'steen' : 'stenen'} en had ${s.right} ${s.right === 1 ? 'vraag' : 'vragen'} juist.`;
    if (!$('bb-end').dataset.done && s.held) confetti(4000);
    $('bb-end').dataset.done = '1';
    bbShow('bb-end');
  }
});

socket.on('bb-tick', t => {
  bb.parts = t.parts;
  bb.need = t.need;
  bbTop();
  if (bb.picking) bbParts();
});

socket.on('bb-kicked', () => {
  bb.joined = false;
  store('lancelot-name', null);
  $('bb-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  bbShow('bb-join');
});

socket.on('connect', () => {
  if (bb.joined) bbJoin(store('lancelot-name') || '');
});

// Bovenaan: je eigen stenen, je reeks en een kleine burcht met hoe ver elk deel is.
function bbTop() {
  $('bb-placed').textContent = bb.placed || 0;
  $('bb-streak').textContent = bb.streak >= 3 ? `🔥 ${bb.streak} op rij: 2 stenen!` : bb.streak > 1 ? `🔥 ${bb.streak} op rij` : '';
  $('bb-mini').innerHTML = bb.parts.map(p => {
    const pct = bb.need ? Math.min(100, (p.height / bb.need) * 100) : 0;
    return `<div class="bb-mini-col ${p.kind}${p.height >= bb.need ? ' ok' : ''}" title="${p.name}"><i style="height:${pct}%"></i></div>`;
  }).join('');
}

setInterval(() => {
  const s = bb.state;
  if (!s || s.phase !== 'bouwen') return;
  const left = Math.max(0, s.endsAt - (Date.now() + bb.offset));
  $('bb-clock').textContent = `🐉 ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
}, 250);

// ---------- Vragen ----------

function bbNext() {
  if (!bb.state || bb.state.phase !== 'bouwen') return;
  const wait = bb.state.startedAt - (Date.now() + bb.offset);
  if (wait > 0) {
    $('bb-countdown').classList.remove('hidden');
    $('bb-countdown').textContent = Math.ceil(wait / 1000);
    setTimeout(bbNext, Math.min(wait, 250));
    return;
  }
  $('bb-countdown').classList.add('hidden');
  bb.busy = true;
  socket.emit('bb-question', null, res => {
    bb.busy = false;
    if (res && res.wait) return gokWait($('bb-q'), res.wait, bbNext);
    if (!res || res.error) return;
    if (res.place) return bbPick(res.place);
    bb.question = res;
    $('bb-number').textContent = `Vraag ${res.number}`;
    $('bb-q').textContent = res.question;
    $('bb-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('bb-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => bbAnswer(i));
    });
  });
}

function bbAnswer(i) {
  if (!bb.question || bb.question.done) return;
  bb.question.done = true;
  socket.emit('bb-answer', i, res => {
    if (!res || res.error) {
      bb.question = null;
      return bbNext();
    }
    bb.streak = res.streak;
    if (res.parts) bb.parts = res.parts;
    const tiles = [...$('bb-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const flash = $('bb-flash');
    flash.className = `sj-flash ${res.correct ? 'good' : 'bad'}`;
    $('bb-flash-mark').textContent = res.correct ? '✔' : '✖';
    $('bb-flash-text').textContent = res.correct ? `+${res.gained} ${res.gained === 1 ? 'steen' : 'stenen'} 🧱` : 'Mis! Geen steen deze keer.';
    if (res.correct) sfx.good(); else sfx.bad();
    buzz(res.correct ? [30, 40, 30] : 200);
    bbTop();
    const next = () => {
      flash.classList.add('hidden');
      bb.question = null;
      if (res.correct) bbPick(res.hand); else bbNext();
    };
    if (res.correct) setTimeout(next, 650);
    else gokHold(flash, $('bb-q'), res, next);
  });
}

// ---------- Bouwen ----------

function bbPick(hand) {
  bb.picking = true;
  bb.hand = hand;
  $('bb-pick-title').textContent = hand > 1 ? `Waar leg je je ${hand} stenen?` : 'Waar leg je je steen?';
  bbParts();
  $('bb-pick').classList.remove('hidden');
}

function bbParts() {
  // De twee laagste delen die nog te laag zijn, krijgen een waarschuwing.
  const low = bb.parts.map((p, i) => ({ i, h: p.height })).filter(x => x.h < bb.need).sort((a, b) => a.h - b.h).slice(0, 2).map(x => x.i);
  $('bb-parts').innerHTML = bb.parts.map((p, i) => {
    const pct = bb.need ? Math.min(100, (p.height / (bb.need * 1.25)) * 100) : 0;
    const line = 100 / 1.25;
    return `<button class="bb-part ${p.kind}${p.height >= bb.need ? ' ok' : ''}${low.includes(i) ? ' low' : ''}" data-i="${i}">
      <span class="bb-part-bar"><i style="height:${pct}%"></i><b style="bottom:${line}%"></b></span>
      <span class="bb-part-name"><kbd>${i + 1}</kbd> ${BB_ICON[p.kind]} ${p.name}</span>
      <span class="bb-part-h">${p.height} / ${bb.need}${p.height >= bb.need ? ' ✔' : low.includes(i) ? ' ⚠' : ''}</span>
    </button>`;
  }).join('');
  for (const b of $('bb-parts').children) b.addEventListener('click', () => bbPlace(Number(b.dataset.i)));
}

function bbPlace(index) {
  if (!bb.picking || bb.placing) return;
  bb.placing = true;
  socket.emit('bb-place', index, res => {
    bb.placing = false;
    bb.picking = false;
    $('bb-pick').classList.add('hidden');
    if (res && res.ok) {
      bb.placed = (bb.placed || 0) + res.placed;
      bb.parts = res.parts;
      sfx.marker();
      buzz(30);
      bbTop();
    }
    bbNext();
  });
}

// Chromebook: met 1 tot 6 een deel van de burcht kiezen.
document.addEventListener('keydown', e => {
  if (!bb.picking || !/^[1-6]$/.test(e.key) || e.target.matches('input, textarea')) return;
  e.stopImmediatePropagation();
  bbPlace(Number(e.key) - 1);
}, true);
