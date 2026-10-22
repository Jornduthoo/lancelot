// De Verrader op de gsm of Chromebook: taken (vragen), betoveren als verrader, de Ronde Tafel en stemmen.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js.
const vr = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  question: null,
  busy: false,
  roster: [],
  readyAt: 0,
};

const vrEsc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const vrNow = () => Date.now() + vr.offset;

function vrShow(name) {
  for (const s of ['vr-join', 'vr-lobby', 'vr-reveal', 'vr-game', 'vr-end']) $(s).classList.toggle('hidden', s !== name);
  if (name !== 'vr-game') $('vr-meeting').classList.add('hidden');
}

function vrJoin(name) {
  socket.emit('vr-join', { playerId, name }, res => {
    if (res.error) {
      vr.joined = false;
      $('vr-join-error').textContent = res.error;
      vrShow('vr-join');
      return;
    }
    vr.joined = true;
    store('lancelot-name', res.name);
    $('vr-join-error').textContent = '';
  });
}

$('vr-join').addEventListener('submit', e => {
  e.preventDefault();
  vrJoin($('vr-name').value);
});

const VR_ROLE = {
  ridder: { icon: '🛡️', name: 'Ridder', text: 'Herstel de kristalkern met goede antwoorden. Elke 4 goede antwoorden krijg je een tip over wie te vertrouwen is. Ontmasker de verrader aan de Ronde Tafel!' },
  verrader: { icon: '🎭', name: 'Verrader', text: 'Beantwoord ook vragen, zodat niemand iets merkt. Elke 3 goede antwoorden kan je een ridder betoveren. Laat je niet ontmaskeren!' },
};

socket.on('vr-state', s => {
  const before = vr.state;
  vr.state = s;
  vr.offset = s.now - Date.now();
  document.body.dataset.vr = s.active ? '1' : '';
  if (!s.active) {
    vr.joined = false;
    return;
  }
  if (vr.run !== s.run) {
    vr.run = s.run;
    vr.joined = false;
    vr.question = null;
    delete $('vr-end').dataset.done;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (s.phase !== 'lobby') {
      $('vr-join-error').textContent = 'Het spel is al begonnen. Wacht op het volgende spel.';
      $('vr-name').value = saved || '';
      vrShow('vr-join');
    } else if (!vr.joined && saved && vr.autoRun !== s.run) {
      vr.autoRun = s.run;
      vrJoin(saved);
    } else if (!vr.joined) {
      $('vr-name').value = saved || '';
      vrShow('vr-join');
    }
    return;
  }
  vr.joined = true;
  vr.roster = s.roster || [];
  vr.readyAt = Date.now() + (s.ready || 0);
  if (s.phase === 'lobby') {
    $('vr-lobby-name').textContent = s.name;
    vrShow('vr-lobby');
  } else if (s.phase === 'rollen') {
    const r = VR_ROLE[s.role];
    $('vr-role-card').className = `vr-role-card ${s.role}`;
    $('vr-role-card').innerHTML = `<div class="vr-role-icon">${r.icon}</div><div class="vr-role-name">${r.name}</div><p>${r.text}</p>${
      s.mates.length ? `<p class="vr-mates">Andere verraders: <strong>${s.mates.map(vrEsc).join(', ')}</strong></p>` : ''}`;
    if (!before || before.phase !== 'rollen') { sfx.gong(); buzz([60, 60, 200]); }
    vrShow('vr-reveal');
  } else if (s.phase === 'taken') {
    vrShow('vr-game');
    vrTools();
    if (!vr.question && !vr.busy) vrNext();
  } else if (s.phase === 'tafel') {
    vrShow('vr-game');
    vrTools();
    vr.question = null;
    $('vr-targets-box').classList.add('hidden');
    vrMeeting(before);
  } else if (s.phase === 'einde') {
    const won = s.winner === s.role;
    $('vr-end-mark').textContent = s.winner === 'ridder' ? '🛡️' : '🎭';
    $('vr-end-title').textContent = `${s.winner === 'ridder' ? 'De ridders' : 'De verraders'} winnen! ${won ? 'Jij ook!' : ''}`;
    $('vr-end-why').textContent = s.why;
    const traitors = (s.roster || []).filter(p => p.role === 'verrader').map(p => p.name);
    $('vr-end-traitors').textContent = `De verraders waren: ${traitors.join(', ')}.`;
    if (!$('vr-end').dataset.done && won) confetti(4000);
    $('vr-end').dataset.done = '1';
    vrShow('vr-end');
  }
});

socket.on('vr-tick', t => {
  if (!vr.state) return;
  vr.state.kern = t.kern;
  vr.state.target = t.target;
  vr.roster = t.roster;
  vrTools();
  if (vr.state.phase === 'tafel') vrMeeting(vr.state);
});

socket.on('vr-kicked', () => {
  vr.joined = false;
  store('lancelot-name', null);
  $('vr-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  vrShow('vr-join');
});

socket.on('connect', () => {
  if (vr.joined) vrJoin(store('lancelot-name') || '');
});

socket.on('vr-spelled', () => {
  vrAlert('🌀 Je bent betoverd! Je bent nu een geest.', 'bad');
  sfx.hit();
  buzz([200, 80, 200]);
});

let vrAlertTimer = null;
function vrAlert(text, kind) {
  const el = $('vr-alert');
  el.textContent = text;
  el.className = `kr-alert ${kind}`;
  clearTimeout(vrAlertTimer);
  vrAlertTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ---------- Rol, kern en gereedschap ----------

$('vr-chip').addEventListener('click', () => {
  const s = vr.state;
  if (!s || !s.role) return;
  const chip = $('vr-chip');
  chip.textContent = `${VR_ROLE[s.role].icon} ${VR_ROLE[s.role].name}`;
  chip.classList.add('on', s.role);
  setTimeout(() => { chip.textContent = '👁 Rol'; chip.className = 'vr-chip'; }, 2000);
});

function vrTools() {
  const s = vr.state;
  if (!s || !s.role) return;
  $('vr-kern').style.width = `${s.target ? Math.min(100, (s.kern / s.target) * 100) : 0}%`;
  const me = vr.roster.find(p => p.name === s.name) || {};
  const alive = me.alive !== false;
  const ghost = $('vr-ghost');
  ghost.classList.toggle('hidden', alive);
  if (!alive) {
    ghost.textContent = me.fate === 'verbannen'
      ? '⚖️ Je bent verbannen. Kijk mee op het bord.'
      : '👻 Je bent een geest. Je kan niet meer stemmen, maar je antwoorden helpen de kern nog.';
  }
  const banished = me.fate === 'verbannen';
  for (const id of ['vr-answers']) $(id).classList.toggle('hidden', banished);
  document.querySelector('#vr-game .sj-card').classList.toggle('hidden', banished);
  const traitor = s.role === 'verrader' && alive;
  $('vr-spellbox').classList.toggle('hidden', !traitor);
  if (traitor) {
    $('vr-pips').innerHTML = Array.from({ length: s.need }, (_, i) => `<i class="${i < s.charge ? 'on' : ''}"></i>`).join('');
    const wait = Math.max(0, vr.readyAt - Date.now());
    const btn = $('vr-spell');
    btn.disabled = s.charge < s.need || wait > 0 || s.phase !== 'taken';
    btn.textContent = wait > 0 && s.charge >= s.need ? `🌀 Nog ${Math.ceil(wait / 1000)} s` : '🌀 Betover';
  }
  $('vr-hints').innerHTML = s.role === 'ridder' && s.hints.length ? `🔍 Te vertrouwen: <strong>${s.hints.map(vrEsc).join(', ')}</strong>` : '';
  $('vr-horn').classList.toggle('hidden', !alive || !s.horn || s.phase !== 'taken');
  $('vr-clock').textContent = (() => {
    const left = Math.max(0, s.endsAt - vrNow());
    return `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  })();
}
setInterval(() => { if (vr.state && ['taken', 'tafel'].includes(vr.state.phase)) vrTools(); }, 500);

$('vr-horn').addEventListener('click', () => {
  if (!confirm('De Ronde Tafel samenroepen? Dat kan maar één keer.')) return;
  socket.emit('vr-horn', null, res => { if (res && res.error) vrAlert(res.error, 'bad'); });
});

// ---------- Taken (vragen) ----------

function vrNext() {
  const s = vr.state;
  if (!s || s.phase !== 'taken') return;
  const me = vr.roster.find(p => p.name === s.name) || {};
  if (me.fate === 'verbannen') return;
  vr.busy = true;
  socket.emit('vr-question', null, res => {
    vr.busy = false;
    if (!res || res.error) return;
    vr.question = res;
    $('vr-number').textContent = `Taak ${res.number}`;
    $('vr-q').textContent = res.question;
    $('vr-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('vr-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => vrAnswer(i));
    });
  });
}

function vrAnswer(i) {
  if (!vr.question || vr.question.done) return;
  vr.question.done = true;
  socket.emit('vr-answer', i, res => {
    if (!res || res.error) {
      vr.question = null;
      return vrNext();
    }
    Object.assign(vr.state, { charge: res.charge, need: res.need, horn: res.horn });
    vr.readyAt = Date.now() + res.ready;
    const tiles = [...$('vr-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const flash = $('vr-flash');
    flash.className = `sj-flash ${res.correct ? 'good' : 'bad'}`;
    $('vr-flash-mark').textContent = res.correct ? '✔' : '✖';
    const traitor = vr.state.role === 'verrader';
    $('vr-flash-text').textContent = res.correct
      ? (traitor ? (res.charge >= res.need ? 'Je betovering is geladen! 🌀' : `Raak! Betovering ${res.charge}/${res.need}`) : 'Raak! De kern groeit.')
      : 'Mis!';
    if (res.correct) sfx.good(); else sfx.bad();
    buzz(res.correct ? [30, 40, 30] : 200);
    if (res.hint) {
      vr.state.hints = [...(vr.state.hints || []), res.hint];
      setTimeout(() => { vrAlert(`🔍 Tip: ${res.hint} is te vertrouwen.`, 'good'); sfx.marker(); }, 600);
    }
    vrTools();
    setTimeout(() => {
      flash.classList.add('hidden');
      vr.question = null;
      vrNext();
    }, res.correct ? 800 : 1800);
  });
}

// ---------- Betoveren ----------

$('vr-spell').addEventListener('click', () => {
  const s = vr.state;
  const list = vr.roster.filter(p => p.alive && p.name !== s.name && !s.mates.includes(p.name));
  $('vr-spell-error').textContent = '';
  $('vr-targets').innerHTML = list.map(p => `<button data-id="${vrEsc(p.id)}"><span class="kr-t-name">${vrEsc(p.name)}</span><span>🌀</span></button>`).join('');
  for (const b of $('vr-targets').children) {
    b.addEventListener('click', () => {
      socket.emit('vr-spell', b.dataset.id, res => {
        if (!res || res.error) { $('vr-spell-error').textContent = res ? res.error : ''; return; }
        $('vr-targets-box').classList.add('hidden');
        sfx.boom();
      });
    });
  }
  $('vr-targets-box').classList.remove('hidden');
});
$('vr-spell-cancel').addEventListener('click', () => $('vr-targets-box').classList.add('hidden'));

// ---------- De Ronde Tafel ----------

function vrMeeting(before) {
  const s = vr.state;
  const m = s.meeting;
  if (!m) return;
  const box = $('vr-meeting');
  box.classList.remove('hidden');
  box.dataset.step = m.step;
  const fresh = !before || !before.meeting || before.meeting.step !== m.step;
  const me = vr.roster.find(p => p.name === s.name) || {};
  const title = $('vr-m-title');
  const sub = $('vr-m-sub');
  const note = $('vr-m-note');
  note.textContent = '';
  if (m.step === 'gevonden') {
    title.textContent = m.reason === 'betovering' ? `🌀 ${m.victim} is betoverd!` : `📯 ${m.caller} roept de Ronde Tafel samen!`;
    sub.textContent = 'Iedereen naar de Ronde Tafel.';
    if (fresh) { sfx.gong(); buzz([100, 50, 100]); }
  } else if (m.step === 'praten') {
    title.textContent = '🪑 De Ronde Tafel';
    sub.textContent = 'Praat met de klas: wie gedraagt zich verdacht? Wie heeft een tip?';
  } else if (m.step === 'stemmen') {
    title.textContent = '⚖️ Stem!';
    sub.textContent = me.alive ? 'Wie verbannen we uit de burcht?' : 'Geesten stemmen niet. Kijk mee.';
    if (fresh) sfx.tick(false);
  } else if (m.step === 'uitslag') {
    const r = m.result;
    title.textContent = r.banished ? `${r.banished} is verbannen.` : 'Niemand is verbannen.';
    sub.textContent = r.banished ? (r.wasTraitor ? 'Het was een verrader! 🎭' : 'Het was geen verrader... 😱') : (r.tie ? 'De stemmen staken gelijk.' : 'De meesten sloegen over.');
    note.textContent = `Er ${r.traitorsLeft === 1 ? 'is' : 'zijn'} nog ${r.traitorsLeft} ${r.traitorsLeft === 1 ? 'verrader' : 'verraders'} in de burcht.`;
    if (fresh) { if (r.banished && r.wasTraitor) sfx.fanfare(); else sfx.bad(); }
  }
  const voting = m.step === 'stemmen' && me.alive;
  const roster = vr.roster.map(p => {
    const status = p.fate === 'betoverd' ? '👻' : p.fate === 'verbannen' ? (p.role === 'verrader' ? '🎭' : '⚖️') : '';
    const mine = s.vote === p.id;
    if (voting && p.alive && p.name !== s.name) return `<button data-vote="${vrEsc(p.id)}" class="${mine ? 'on' : ''}">${vrEsc(p.name)}</button>`;
    return `<span class="vr-person${p.alive ? '' : ' out'}${p.name === s.name ? ' me' : ''}">${status} ${vrEsc(p.name)}${p.voted ? ' ✔' : ''}</span>`;
  });
  if (voting) roster.push(`<button data-vote="" class="skip${s.vote === null ? ' on' : ''}">Overslaan</button>`);
  $('vr-roster').innerHTML = roster.join('');
  $('vr-roster').classList.toggle('voting', voting);
  for (const b of $('vr-roster').querySelectorAll('[data-vote]')) {
    b.addEventListener('click', () => {
      const target = b.dataset.vote || null;
      socket.emit('vr-vote', target, res => {
        if (!res || res.error) return;
        vr.state.vote = res.vote;
        vrMeeting(vr.state);
        sfx.marker();
        buzz(40);
      });
    });
  }
  if (voting && s.vote !== undefined) note.textContent = s.vote === null ? 'Je slaat over. Je kan nog wisselen.' : 'Je hebt gestemd. Je kan nog wisselen.';
}

setInterval(() => {
  const s = vr.state;
  if (!s || s.phase !== 'tafel' || !s.meeting) return;
  const left = Math.max(0, s.meeting.until - vrNow());
  $('vr-m-clock').textContent = ['praten', 'stemmen'].includes(s.meeting.step) ? Math.ceil(left / 1000) : '';
}, 250);
