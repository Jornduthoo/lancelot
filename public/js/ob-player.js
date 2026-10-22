// Een oefenblad invullen op de Chromebook of gsm.
// Gebruikt socket, $, playerId, store en buzz uit player.js, sfx en confetti uit fx.js, ObSheet.
const ob = { state: null, joined: false, run: -1, answers: {}, results: {}, rendered: null, report: null };

function obShow(name) {
  for (const s of ['ob-join', 'ob-work']) $(s).classList.toggle('hidden', s !== name);
}

function obJoin(name) {
  socket.emit('ob-join', { playerId, name }, res => {
    if (res.error) {
      ob.joined = false;
      $('ob-join-error').textContent = res.error;
      obShow('ob-join');
      return;
    }
    ob.joined = true;
    store('lancelot-name', res.name);
    $('ob-join-error').textContent = '';
  });
}

$('ob-join').addEventListener('submit', e => {
  e.preventDefault();
  obJoin($('ob-name').value);
});

socket.on('ob-state', s => {
  ob.state = s;
  document.body.dataset.ob = s.active ? '1' : '';
  if (!s.active) {
    ob.joined = false;
    return;
  }
  if (ob.run !== s.run) {
    ob.run = s.run;
    ob.joined = false;
    ob.rendered = null;
    ob.report = null;
  }
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!ob.joined && saved && ob.autoRun !== s.run) {
      ob.autoRun = s.run;
      obJoin(saved);
    } else if (!ob.joined) {
      $('ob-name').value = saved || '';
      obShow('ob-join');
    }
    return;
  }
  ob.joined = true;
  ob.answers = s.answers || {};
  ob.results = s.results || {};
  if (s.report) ob.report = s.report;
  $('ob-who').textContent = s.name;
  if (ob.rendered !== s.run) {
    ob.rendered = s.run;
    obRender();
  }
  obShow('ob-work');
  obStatus();
});

function obRender() {
  const s = ob.state;
  const done = !!ob.report;
  ObSheet.render($('ob-paper'), s.sheet, {
    mode: done || s.phase !== 'open' ? 'view' : 'live',
    answers: ob.answers,
    results: s.feedback === 'direct' || done ? (done ? ob.report.results : ob.results) : {},
    solutions: done && ob.report.solutions,
    onAnswer: obSend,
  });
}

function obSend(id, value) {
  ob.answers[id] = value;
  obStatus();
  socket.emit('ob-answer', { id, value }, res => {
    if (!res || res.error) return;
    if (res.correct === undefined) return;
    ob.results[id] = res.correct;
    ObSheet.mark($('ob-paper'), ob.results, null, ob.state.sheet);
    if (res.correct === true) { sfx.tick(false); buzz(20); }
    if (res.correct === false) buzz(80);
    obStatus();
  });
}

// Hoeveel vakjes ingevuld, en na het inleveren de score.
function obStatus() {
  const all = [...$('ob-paper').querySelectorAll('[data-field]')];
  const filled = all.filter(el => {
    const v = ob.answers[el.dataset.field];
    return v !== undefined && v !== '';
  }).length;
  $('ob-count').textContent = `${filled}/${all.length}`;
  $('ob-progress-bar').style.width = `${all.length ? (filled / all.length) * 100 : 0}%`;
  const submitted = !!ob.report;
  $('ob-submit').classList.toggle('hidden', submitted || ob.state.phase !== 'open');
  const score = $('ob-score');
  score.classList.toggle('hidden', !submitted);
  if (submitted) {
    const { right, total } = ob.report.score;
    score.innerHTML = `Ingeleverd! <strong>${right} van de ${total}</strong> juist.${ob.report.solutions ? ' De oplossingen staan erbij.' : ''}`;
  }
}

$('ob-submit').addEventListener('click', () => {
  const all = [...$('ob-paper').querySelectorAll('[data-field]')];
  const empty = all.filter(el => !ob.answers[el.dataset.field]).length;
  if (!confirm(empty ? `Nog ${empty} vakjes leeg. Toch inleveren?` : 'Je blad inleveren? Daarna kan je niets meer veranderen.')) return;
  // Wat nog in een vakje staat maar nog niet verstuurd is, eerst doorsturen.
  for (const el of $('ob-paper').querySelectorAll('input.ob-field, textarea.ob-field')) {
    if ((ob.answers[el.dataset.field] || '') !== el.value) obSend(el.dataset.field, el.value);
  }
  socket.emit('ob-submit', null, res => {
    if (!res || res.error) return;
    ob.report = res;
    obRender();
    obStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const { right, total } = res.score;
    if (total && right / total >= .8) { sfx.fanfare(); confetti(3000); } else sfx.good();
  });
});

socket.on('ob-report', res => {
  ob.report = res;
  obRender();
  obStatus();
});

socket.on('ob-kicked', () => {
  ob.joined = false;
  store('lancelot-name', null);
  $('ob-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  obShow('ob-join');
});

socket.on('connect', () => {
  if (ob.joined) obJoin(store('lancelot-name') || '');
});
