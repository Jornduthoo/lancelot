// Mijn taken op de Chromebook of gsm: wat de leerkracht klaarzette, op je eigen niveau en in je eigen tempo.
// Een oefenblad vul je in zoals live (ObSheet), een quiz beantwoord je vraag per vraag met meteen de uitleg.
// Gebruikt ObSheet, Niveau, Voorlees, sfx en confetti. klas-kies.js gebruikt store, socket en $ van hier.

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

const socket = io({ autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const tkEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const tk = { naam: store('lancelot-name') || '', scherm: 'join', taak: null, open: null, wacht: false };

function tkToon(scherm) {
  tk.scherm = scherm;
  for (const s of ['join', 'lijst', 'blad', 'quiz']) $(`tk-${s}`).classList.toggle('hidden', s !== scherm);
  // Terug gaat in een taak naar de lijst, op de lijst naar het startscherm.
  $('tk-back').href = scherm === 'blad' || scherm === 'quiz' ? '#' : '/';
  if (scherm !== 'blad') Voorlees.stop();
  if (scherm === 'lijst' || scherm === 'join') {
    $('tk-kop-titel').textContent = 'Mijn taken';
    $('tk-logo').src = '/img/icons/oefenblad.webp';
    $('tk-kop-sub').textContent = scherm === 'lijst' ? tk.naam : '';
  }
}

$('tk-back').addEventListener('click', e => {
  if (tk.scherm !== 'blad' && tk.scherm !== 'quiz') return;
  e.preventDefault();
  tkLijst();
});

// ---------- De lijst ----------

function tkLijst(naam = tk.naam) {
  if (!naam) return tkToon('join');
  socket.emit('tk-mijn', naam, res => {
    if (!res || res.error) {
      $('tk-join-error').textContent = (res && res.error) || '';
      return tkToon('join');
    }
    tk.naam = res.naam;
    tk.taak = null;
    store('lancelot-name', res.naam);
    tkToon('lijst');
    tkTekenLijst(res.taken);
  });
}

function tkStatus(t) {
  if (t.status === 'klaar') return t.score ? `✔ Klaar · ${t.juist} van de ${t.score} juist` : '✔ Klaar';
  if (t.status === 'bezig') return `Bezig · ${t.gedaan} van ${t.totaal}`;
  return 'Nieuw';
}

function tkTekenLijst(taken) {
  const box = $('tk-taken');
  box.innerHTML = '';
  $('tk-leeg').classList.toggle('hidden', taken.some(t => t.status !== 'klaar'));
  for (const t of taken) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tk-kaart ${t.status}`;
    const pct = t.totaal ? Math.round((t.gedaan / t.totaal) * 100) : 0;
    b.innerHTML = `<img src="/img/icons/${t.soort === 'quiz' ? 'toernooi' : 'oefenblad'}.webp" alt="">
      <span class="tk-kaart-tekst"><strong></strong><small>${t.soort === 'quiz' ? 'Quiz' : 'Oefenblad'}${t.vak ? ` · ${tkEsc(t.vak)}` : ''}${t.niveau ? ` · ${Niveau.label(t.niveau)}` : ''}</small>
      <span class="tk-balk"><i style="width:${t.status === 'klaar' ? 100 : pct}%"></i></span><em>${tkStatus(t)}</em></span>
      <span class="tk-pijl">${t.status === 'klaar' ? '👁' : '▶'}</span>`;
    b.querySelector('strong').textContent = t.titel;
    b.addEventListener('click', () => tkOpen(t.id));
    box.appendChild(b);
  }
}

$('tk-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('tk-name').value.trim();
  if (naam) tkLijst(naam);
});
$('tk-name').value = tk.naam;
$('tk-switch').addEventListener('click', () => klasSwitch());
$('tk-blad-terug').addEventListener('click', () => tkLijst());
$('tk-quiz-terug').addEventListener('click', () => tkLijst());

// ---------- Een taak openen ----------

function tkOpen(id) {
  socket.emit('tk-open', { id, naam: tk.naam }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Die taak kon niet open.');
    tk.taak = res;
    $('tk-logo').src = `/img/icons/${res.soort === 'quiz' ? 'toernooi' : 'oefenblad'}.webp`;
    $('tk-kop-titel').textContent = res.titel;
    $('tk-kop-sub').textContent = res.niveau ? Niveau.label(res.niveau) : tk.naam;
    if (res.soort === 'quiz') tkQuiz(res);
    else tkBlad(res);
    window.scrollTo({ top: 0 });
  });
}

// ---------- Oefenblad ----------

function tkBlad(t) {
  tkToon('blad');
  $('tk-blad-wie').textContent = tk.naam;
  ObSheet.render($('tk-paper'), t.view, {
    mode: t.klaar ? 'view' : 'live', answers: t.answers, results: t.results, solutions: t.solutions,
    voorlees: t.voorlees, onAnswer: tkStuur,
  });
  tkBladStand();
}

function tkStuur(veld, waarde) {
  const t = tk.taak;
  t.answers[veld] = waarde;
  tkBladStand();
  socket.emit('tk-antwoord', { id: t.id, naam: tk.naam, veld, waarde }, res => {
    if (res && res.wait) tkWacht(veld, res.wait, res.error ? res.value : null);
    if (!res || res.error || res.correct === undefined) return;
    t.results[veld] = res.correct;
    ObSheet.mark($('tk-paper'), t.results, null, t.view);
    if (res.correct === true) { sfx.tick(false); buzz(20); }
    if (res.correct === false) buzz(80);
  });
}

// Tegen gokken: na een fout keuzeantwoord even wachten voor je dat vakje opnieuw kiest.
function tkWacht(veld, ms, terug) {
  const box = $('tk-paper').querySelector(`[data-field="${CSS.escape(veld)}"]`);
  if (!box) return;
  if (terug !== null) {
    tk.taak.answers[veld] = terug;
    if (box.tagName === 'SELECT') box.value = terug;
    for (const o of box.querySelectorAll('.ob-choice')) o.classList.toggle('on', o.dataset.value === String(terug));
  }
  const delen = box.tagName === 'SELECT' ? [box] : [...box.querySelectorAll('.ob-choice')];
  box.classList.add('ob-wacht');
  for (const el of delen) el.disabled = true;
  clearTimeout(box.waitTimer);
  box.waitTimer = setTimeout(() => {
    box.classList.remove('ob-wacht');
    if (tk.taak && !tk.taak.klaar) for (const el of delen) el.disabled = false;
  }, ms);
}

function tkBladStand() {
  const t = tk.taak;
  const alle = [...$('tk-paper').querySelectorAll('[data-field]')];
  const gedaan = alle.filter(el => { const v = t.answers[el.dataset.field]; return v !== undefined && v !== ''; }).length;
  $('tk-blad-tel').textContent = `${gedaan}/${alle.length}`;
  $('tk-blad-balk').style.width = `${alle.length ? (gedaan / alle.length) * 100 : 0}%`;
  $('tk-inleveren').classList.toggle('hidden', t.klaar);
  $('tk-blad-terug').classList.toggle('hidden', !t.klaar);
  const score = $('tk-blad-score');
  score.classList.toggle('hidden', !t.klaar);
  if (t.klaar) score.innerHTML = t.score ? `Ingeleverd! <strong>${t.juist} van de ${t.score}</strong> juist. De oplossingen staan erbij.` : 'Ingeleverd!';
}

$('tk-inleveren').addEventListener('click', async () => {
  const t = tk.taak;
  const leeg = [...$('tk-paper').querySelectorAll('[data-field]')].filter(el => !t.answers[el.dataset.field]).length;
  if (!await Ui.vraag(leeg ? `Nog ${leeg} vakjes leeg. Toch inleveren?` : 'Je blad inleveren? Daarna kan alleen je leerkracht het weer openzetten.')) return;
  // Wat nog in een vakje staat maar nog niet verstuurd is, eerst doorsturen.
  for (const el of $('tk-paper').querySelectorAll('input.ob-field, textarea.ob-field')) {
    if ((t.answers[el.dataset.field] || '') !== el.value) tkStuur(el.dataset.field, el.value);
  }
  socket.emit('tk-inleveren', { id: t.id, naam: tk.naam }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Inleveren lukte niet.');
    tk.taak = res;
    tkBlad(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (res.score && res.juist / res.score >= .8) { sfx.fanfare(); confetti(3000); } else sfx.good();
  });
});

// ---------- Quiz ----------

function tkQuiz(t) {
  tkToon('quiz');
  $('tk-quiz-wie').textContent = tk.naam;
  tkQuizStand(t);
  if (t.klaar || !t.vraag) return tkEinde(t);
  $('tk-einde').classList.add('hidden');
  $('tk-vraag-blok').classList.remove('hidden');
  $('tk-feedback').classList.add('hidden');
  $('tk-vraag').textContent = t.vraag.vraag;
  const box = $('tk-antwoorden');
  box.innerHTML = '';
  t.vraag.antwoorden.forEach((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `answer a${i}`;
    b.innerHTML = `<b class="rune">${i + 1}</b><span class="label"></span>`;
    b.querySelector('.label').textContent = a;
    b.addEventListener('click', () => tkKies(i));
    box.appendChild(b);
  });
  tk.wacht = false;
}

function tkQuizStand(t) {
  $('tk-quiz-tel').textContent = `${t.gedaan}/${t.totaal}`;
  $('tk-quiz-balk').style.width = `${t.totaal ? (t.gedaan / t.totaal) * 100 : 0}%`;
}

function tkKies(i) {
  const t = tk.taak;
  if (tk.wacht || !t.vraag) return;
  tk.wacht = true;
  socket.emit('tk-quiz', { id: t.id, naam: tk.naam, keuze: i }, res => {
    if (!res || res.error) {
      tk.wacht = false;
      return Ui.melding((res && res.error) || 'Dat lukte niet.');
    }
    const knoppen = [...$('tk-antwoorden').children];
    knoppen.forEach((b, k) => {
      b.disabled = true;
      b.classList.toggle('right', k === res.goed);
      b.classList.toggle('wrong', k === i && !res.juist);
    });
    Object.assign(t, { gedaan: res.gedaan, juist: res.juist, score: res.score, klaar: res.klaar });
    tkQuizStand(t);
    $('tk-oordeel').textContent = res.juist ? '✔ Juist!' : `✘ Het juiste antwoord: ${t.vraag.antwoorden[res.goed]}`;
    $('tk-oordeel').className = `tk-oordeel ${res.juist ? 'goed' : 'fout'}`;
    $('tk-uitleg').textContent = res.uitleg || '';
    $('tk-uitleg').classList.toggle('hidden', !res.uitleg);
    $('tk-volgende').textContent = res.klaar ? 'Bekijk je score' : 'Volgende vraag';
    $('tk-feedback').classList.remove('hidden');
    $('tk-feedback').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (res.juist) { sfx.good(); buzz(20); } else buzz(80);
    // Na een fout antwoord even laten lezen voor je verder kan.
    $('tk-volgende').disabled = !res.juist;
    if (!res.juist) setTimeout(() => { $('tk-volgende').disabled = false; }, 1500);
  });
}

$('tk-volgende').addEventListener('click', () => tk.taak && tkOpen(tk.taak.id));

function tkEinde(t) {
  $('tk-vraag-blok').classList.add('hidden');
  $('tk-einde').classList.remove('hidden');
  $('tk-eindscore').innerHTML = `<strong>${t.juist} van de ${t.score}</strong> juist`;
  const box = $('tk-terugblik');
  box.innerHTML = '';
  if (t.terug && t.terug.length) {
    box.innerHTML = '<p class="tk-terug-kop">Kijk nog eens naar:</p>';
    for (const f of t.terug) {
      const p = document.createElement('div');
      p.className = 'tk-terug';
      p.innerHTML = '<p></p><p class="tk-terug-goed"></p>';
      p.children[0].textContent = f.vraag;
      p.children[1].textContent = `✔ ${f.goed}${f.uitleg ? ` · ${f.uitleg}` : ''}`;
      box.appendChild(p);
    }
  }
  if (t.score && t.juist / t.score >= .8) { sfx.fanfare(); confetti(3000); }
}

// Op de Chromebook: 1 tot 4 kiest een antwoord, Enter gaat verder.
document.addEventListener('keydown', e => {
  if (tk.scherm !== 'quiz' || e.target.closest('input, textarea, select')) return;
  const fb = !$('tk-feedback').classList.contains('hidden');
  if (fb && e.key === 'Enter' && !$('tk-volgende').disabled) return $('tk-volgende').click();
  if (!fb && /^[1-4]$/.test(e.key)) {
    const b = $('tk-antwoorden').children[Number(e.key) - 1];
    if (b) b.click();
  }
});

// ---------- Live ----------

// De leerkracht gaf of veranderde een taak: de lijst meteen bijwerken (niet midden in een taak).
socket.on('tk-nieuw', () => {
  if (tk.scherm === 'lijst') tkLijst();
});
socket.on('connect', () => {
  if (tk.scherm === 'join' || tk.scherm === 'lijst') tkLijst();
});

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const tkSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  tkSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('tk-start-banner').classList.toggle('hidden', !Object.values(tkSpellen).some(Boolean));
});
