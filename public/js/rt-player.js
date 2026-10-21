// De Ronde Tafel op het leerlingscherm. Gebruikt socket, $, playerId en buzz uit player.js.
const RT_LETTERS = 'ABCDEF';
let rt = null;        // laatste status van de server
let rtShown = null;   // welke vraag nu op het scherm staat
let rtMine = null;    // wat deze leerling op die vraag al instuurde

function rtShow(name) {
  for (const s of ['rt-wait', 'rt-item', 'rt-end']) $(s).classList.toggle('hidden', s !== name);
}

function rtEscape(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

socket.on('rt-state', s => {
  const was = rt;
  rt = s;
  // De Ronde Tafel neemt het scherm over zolang ze loopt; daarna is het Toernooi-scherm terug.
  $('rondetafel').classList.toggle('hidden', !s.active);
  $('toernooi').classList.toggle('hidden', s.active);
  if (!s.active) {
    rtShown = null;
    return;
  }
  const key = `${s.run}:${s.index}`;
  if (!was || !was.active || was.run !== s.run || rtShown !== key) {
    // Nieuwe vraag: aanmelden (telt mee als deelnemer) en ophalen wat we al instuurden.
    socket.emit('rt-join', playerId, res => {
      rtMine = res && res.ok ? res.mine : null;
      rtShown = key;
      rtRender(true);
    });
    return;
  }
  rtRender(false);
});

// Na een korte wifi-onderbreking opnieuw aanmelden.
socket.on('connect', () => { rtShown = null; });

function rtRender(fresh) {
  $('rt-title').textContent = rt.title || '';
  if (rt.phase === 'einde') return rtShow('rt-end');
  if (rt.index < 0 || !rt.item) return rtShow('rt-wait');
  const item = rt.item;
  $('rt-progress').textContent = `Vraag ${rt.index + 1} van ${rt.total}`;
  $('rt-question').textContent = item.question;
  if (fresh) {
    $('rt-error').textContent = '';
    rtBuild(item);
  }
  rtUpdate(item);
  rtShow('rt-item');
}

function rtSend(value) {
  $('rt-error').textContent = '';
  socket.emit('rt-answer', value, res => {
    if (!res || res.error) {
      $('rt-error').textContent = res ? res.error : 'Er ging iets mis.';
      return;
    }
    rtMine = res.mine;
    buzz(30);
    rtUpdate(rt.item, true);
  });
}

function rtBuild(item) {
  const box = $('rt-input');
  if (item.type === 'keuze') {
    box.innerHTML = `<div class="rt-choices">${item.options.map((o, i) => `
      <button class="rt-choice c${i}" data-value="${i}"><span class="letter">${RT_LETTERS[i]}</span><span>${rtEscape(o)}</span></button>`).join('')}</div>`;
  } else if (item.type === 'schaal') {
    box.innerHTML = `<div class="rt-scale">${[1, 2, 3, 4, 5].map(n => `<button class="rt-step" data-value="${n - 1}">${n}</button>`).join('')}</div>
      <div class="rt-scale-ends"><span>${rtEscape(item.min)}</span><span>${rtEscape(item.max)}</span></div>`;
  } else {
    const words = item.type === 'woorden';
    box.innerHTML = `<form class="rt-text">
        ${words ? '<input maxlength="25" autocomplete="off" placeholder="Eén woord">' : '<textarea maxlength="140" rows="3" placeholder="Je antwoord"></textarea>'}
        <button type="submit" class="big">Verstuur</button>
      </form>
      <div class="rt-mine"></div>`;
    const form = box.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const field = form.querySelector('input, textarea');
      if (!field.value.trim()) return;
      rtSend(field.value);
      field.value = '';
    });
  }
  for (const b of box.querySelectorAll('[data-value]')) {
    b.addEventListener('click', () => rtSend(Number(b.dataset.value)));
  }
}

// Toont wat de leerling al koos of instuurde, en of er nog geantwoord mag worden.
function rtUpdate(item, justSent) {
  const box = $('rt-input');
  const locked = rt.locked;
  let feedback = '';
  if (item.type === 'keuze' || item.type === 'schaal') {
    for (const b of box.querySelectorAll('[data-value]')) {
      b.classList.toggle('chosen', rtMine === Number(b.dataset.value));
      b.disabled = locked;
    }
    if (rtMine !== null) feedback = locked ? 'Je stem is geteld.' : 'Je stem is geteld. Je mag nog van mening veranderen.';
  } else {
    const mine = rtMine || [];
    const left = rt.limit - mine.length;
    box.querySelector('.rt-mine').innerHTML = mine.map(t => `<span class="chip">${rtEscape(t)}</span>`).join('');
    const form = box.querySelector('form');
    for (const el of form.elements) el.disabled = locked || left <= 0;
    if (mine.length) {
      feedback = left > 0
        ? `Verstuurd! Je kunt er nog ${left} ${item.type === 'woorden' ? (left === 1 ? 'woord' : 'woorden') : (left === 1 ? 'antwoord' : 'antwoorden')} bij zetten.`
        : 'Verstuurd! Kijk naar het bord.';
    }
    if (justSent && left > 0) form.querySelector('input, textarea').focus();
  }
  if (locked) {
    const sent = rtMine !== null && !(Array.isArray(rtMine) && rtMine.length === 0);
    feedback = `${sent ? 'Je antwoord is verstuurd. ' : ''}De leerkracht heeft het antwoorden gesloten.`;
  }
  $('rt-feedback').textContent = feedback;
  if (justSent) {
    $('rt-feedback').classList.remove('pop');
    void $('rt-feedback').offsetWidth;
    $('rt-feedback').classList.add('pop');
  }
}
