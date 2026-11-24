// Mijn taken op de Chromebook of gsm: wat de leerkracht klaarzette, op je eigen niveau en in je eigen tempo.
// Een oefenblad vul je in zoals live (ObSheet), een quiz beantwoord je vraag per vraag met meteen de uitleg.
// Een toets (De Proef) maak je vraag per vraag zoals bij een afname (PfPaper). Gebruikt ObSheet, PfPaper, Niveau, Voorlees, sfx en confetti. klas-kies.js gebruikt store, socket en $ van hier.

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
  for (const s of ['join', 'lijst', 'blad', 'quiz', 'toets']) $(`tk-${s}`).classList.toggle('hidden', s !== scherm);
  // Terug gaat in een taak naar de lijst, op de lijst naar het startscherm.
  $('tk-back').href = ['blad', 'quiz', 'toets'].includes(scherm) ? '#' : '/';
  if (scherm !== 'toets') tkBewaak(false);
  if (scherm !== 'blad') Voorlees.stop();
  if (scherm === 'lijst' || scherm === 'join') {
    $('tk-doel').classList.add('hidden');
    $('tk-kop-titel').textContent = 'Mijn taken';
    $('tk-logo').src = '/img/icons/oefenblad.webp';
    $('tk-kop-sub').textContent = scherm === 'lijst' ? tk.naam : '';
  }
}

$('tk-back').addEventListener('click', e => {
  if (!['blad', 'quiz', 'toets'].includes(tk.scherm)) return;
  e.preventDefault();
  if (tk.scherm === 'toets' && $('tk-toets-paper').pfFlush) $('tk-toets-paper').pfFlush();
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
    Voorlees.taal('');
    Voorlees.wie(res.naam);
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

const tkIcoon = t => (t.spel ? t.spel.icoon : t.soort === 'quiz' ? 'toernooi' : t.soort === 'proef' ? 'proef' : 'oefenblad');

function tkTekenLijst(taken) {
  const box = $('tk-taken');
  box.innerHTML = '';
  $('tk-leeg').classList.toggle('hidden', taken.some(t => t.status !== 'klaar'));
  for (const t of taken) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tk-kaart ${t.status}`;
    const pct = t.totaal ? Math.round((t.gedaan / t.totaal) * 100) : 0;
    b.innerHTML = `<img src="/img/icons/${tkIcoon(t)}.webp" alt="">
      <span class="tk-kaart-tekst"><strong></strong><small>${t.spel ? `Quiz in ${tkEsc(t.spel.naam)}` : t.soort === 'quiz' ? 'Quiz' : t.soort === 'proef' ? 'Toets' : 'Oefenblad'}${t.vak ? ` · ${tkEsc(t.vak)}` : ''}${t.niveau ? ` · ${Niveau.label(t.niveau)}` : ''}</small>
      ${t.les && t.les.doel ? `<span class="tk-kaart-doel">🎯 ${tkEsc(t.les.doel)}</span>` : ''}
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

// Komt de taak uit een les, dan staat het doel van die les erboven: waarom oefen ik dit?
function tkDoel(les) {
  $('tk-doel').classList.toggle('hidden', !les);
  if (!les) return;
  $('tk-doel-tekst').textContent = les.doel || '';
  const ul = $('tk-doel-crit');
  ul.textContent = '';
  for (const c of les.criteria || []) {
    const li = document.createElement('li');
    li.textContent = c;
    ul.appendChild(li);
  }
  $('tk-doel-crit-blok').classList.toggle('hidden', !ul.children.length);
}

function tkOpen(id) {
  socket.emit('tk-open', { id, naam: tk.naam }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Die taak kon niet open.');
    // Een quiz in een spel: naar het startscherm, dat dan alleen dit eigen spel toont (tk-solo.js). Klaar: hier terugblikken.
    if (res.spel && !res.klaar) return location.assign(`/?taak=${encodeURIComponent(id)}`);
    tk.taak = res;
    // Voorlezen in de taal van de taak (bv. Frans), anders in de taal van LANcelot.
    Voorlees.taal(res.taal);
    $('tk-logo').src = `/img/icons/${tkIcoon(res)}.webp`;
    $('tk-kop-titel').textContent = res.titel;
    $('tk-kop-sub').textContent = res.niveau ? Niveau.label(res.niveau) : tk.naam;
    tkDoel(res.les);
    if (res.soort === 'quiz') tkQuiz(res);
    else if (res.soort === 'proef') tkToets(res);
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
    if (res && res.error && !res.wait) tkNogOpen();
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
      tkNogOpen();
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

// ---------- Toets ----------

// Een toets zoals bij De Proef: eerst de uitleg, dan vraag per vraag (terug mag). Elk antwoord gaat meteen naar de
// leerkracht; de leerling ziet niet wat juist is. Inleveren zet de toets bij De Proef › Resultaten.
function tkToets(t) {
  tkToon('toets');
  for (const id of ['tk-toets-intro', 'tk-toets-werk', 'tk-toets-klaar']) $(id).classList.add('hidden');
  tkBewaak(false);
  if (t.klaar) {
    tkUitScherm();
    // Toont de leerkracht de punten na het inleveren? Dan wat de computer al verbeterde (de open vragen volgen nog).
    const u = t.uitslag;
    $('tk-toets-uitslag').innerHTML = u ? `Je haalde <strong>${PfPaper.nl(u.punten)} van de ${PfPaper.nl(u.max - u.hand)}</strong> punten die de computer verbetert.${u.hand ? ` Je leerkracht verbetert nog ${PfPaper.ptn(u.hand)}.` : ''}` : '';
    $('tk-toets-uitslag').classList.toggle('hidden', !u);
    return $('tk-toets-klaar').classList.remove('hidden');
  }
  // Nog niet begonnen: eerst de uitleg en de regels.
  if (!t.gedaan && !tk.toetsGestart) {
    $('tk-toets-intro-tekst').textContent = t.intro || '';
    const n = t.view.pages.length;
    $('tk-toets-regels').innerHTML = [
      `${n} ${n === 1 ? 'vraag' : 'vragen'}, samen ${PfPaper.ptn(t.totaal)}.`,
      'Neem je tijd. Je mag terug naar vorige vragen.',
      'Lever in als je klaar bent. Je leerkracht verbetert je toets.',
      ...(t.beveiligd ? ['De toets opent op het volledige scherm. Verlaat je de toets (ander tabblad, venster of volledig scherm uit), dan ziet je leerkracht dat.'] : []),
    ].map(r => `<li>${tkEsc(r)}</li>`).join('');
    return $('tk-toets-intro').classList.remove('hidden');
  }
  $('tk-toets-werk').classList.remove('hidden');
  tkToetsPagina();
  if (!t.beveiligd) return;
  tkBewaak(true);
  // Al bezig, maar niet hier op Start gedrukt: de pagina werd herladen of de toets opnieuw geopend.
  if (!tk.toetsGestart && t.bezig) {
    tk.toetsGestart = true;
    tkWeg('herladen');
  } else if (!tkInScherm()) tkSlot(false);
}
$('tk-toets-start').addEventListener('click', async () => {
  tk.toetsGestart = true;
  // Meteen bij de klik vragen: een browser geeft het volledige scherm alleen na een klik.
  if (tk.taak.beveiligd) await tkNaarScherm();
  // Was hij al begonnen (nog zonder antwoorden) en opent hij de toets opnieuw: dat ziet de leerkracht ook.
  if (tk.taak.beveiligd && tk.taak.bezig) {
    socket.emit('tk-verlaat', { id: tk.taak.id, naam: tk.naam, soort: 'herladen' }, () => socket.emit('tk-terugin', { id: tk.taak.id, naam: tk.naam }, () => {}));
  }
  // Zo ziet de leerkracht meteen dat hij begonnen is.
  socket.emit('tk-toets', { id: tk.taak.id, naam: tk.naam, pos: tk.taak.pos || 0 }, () => {});
  tkToets(tk.taak);
});
$('tk-toets-terug').addEventListener('click', () => tkLijst());

function tkToetsPagina() {
  const t = tk.taak;
  const pages = t.view.pages;
  t.pos = Math.max(0, Math.min(pages.length - 1, t.pos || 0));
  PfPaper.render($('tk-toets-paper'), [pages[t.pos]], { mode: 'live', answers: t.answers, start: t.pos, nummer: true, voorlees: !!t.voorlees, onAnswer: tkToetsStuur, luisterSleutel: `taak|${t.id}|${tk.naam}|${t.poging || 0}` });
  $('tk-toets-vorige').classList.toggle('hidden', t.pos === 0);
  const laatste = t.pos === pages.length - 1;
  $('tk-toets-volgende').textContent = laatste ? 'Inleveren ✔' : 'Volgende ▶';
  $('tk-toets-volgende').classList.toggle('gold', laatste);
  $('tk-toets-fout').textContent = '';
  tkToetsBol();
  window.scrollTo(0, 0);
}

function tkToetsStuur(vraag, waarde) {
  const t = tk.taak;
  t.answers[vraag] = waarde;
  tkToetsBol();
  socket.emit('tk-toets', { id: t.id, naam: tk.naam, vraag, waarde, pos: t.pos }, res => {
    $('tk-toets-fout').textContent = (res && res.error) || '';
    if (res && res.error) tkNogOpen();
  });
}

const tkIds = p => (p.type === 'bron' ? p.vragen.map(q => q.id) : [p.id]);
function tkToetsBol() {
  const t = tk.taak;
  $('tk-toets-bol').innerHTML = t.view.pages.map((p, i) => {
    const klaar = tkIds(p).every(id => PfPaper.beantwoord(t.answers[id]));
    const half = !klaar && tkIds(p).some(id => PfPaper.beantwoord(t.answers[id]));
    return `<button type="button" class="pf-bol${i === t.pos ? ' nu' : ''}${klaar ? ' ok' : half ? ' half' : ''}" data-i="${i}" aria-label="Vraag ${i + 1}">${i + 1}</button>`;
  }).join('');
}

function tkToetsGa(i) {
  const t = tk.taak;
  if ($('tk-toets-paper').pfFlush) $('tk-toets-paper').pfFlush();
  t.pos = i;
  socket.emit('tk-toets', { id: t.id, naam: tk.naam, pos: i }, () => {});
  tkToetsPagina();
}
$('tk-toets-bol').addEventListener('click', e => {
  const b = e.target.closest('.pf-bol');
  if (b) tkToetsGa(Number(b.dataset.i));
});
$('tk-toets-vorige').addEventListener('click', () => tkToetsGa(tk.taak.pos - 1));
$('tk-toets-volgende').addEventListener('click', async () => {
  const t = tk.taak;
  if (t.pos < t.view.pages.length - 1) return tkToetsGa(t.pos + 1);
  if ($('tk-toets-paper').pfFlush) $('tk-toets-paper').pfFlush();
  const leeg = t.view.pages.flatMap(p => (p.type === 'bron' ? p.vragen : [p])).filter(q => q.type !== 'papier' && !PfPaper.beantwoord(t.answers[q.id])).length;
  if (!await Ui.vraag(leeg ? `Nog ${leeg} ${leeg === 1 ? 'vraag' : 'vragen'} niet ingevuld. Toch inleveren?` : 'Je toets inleveren? Daarna kan je niets meer veranderen.', { ja: 'Inleveren' })) return;
  // Even wachten zodat het laatste antwoord zeker eerst aankomt.
  setTimeout(() => socket.emit('tk-inleveren', { id: t.id, naam: tk.naam }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Inleveren lukte niet.');
    tk.toetsGestart = false;
    tkBewaak(false);
    tk.taak = res;
    tkToets(res);
    sfx.good();
  }), 150);
});

// ---------- Beveiligd: volledig scherm, en wie de toets verlaat, wordt gemeld ----------
// Een browser kan een Chromebook niet echt op slot zetten. Wel: het volledige scherm vragen, merken wanneer de
// leerling de toets verlaat, hem dat zeggen en het de leerkracht tonen. Zijn antwoorden blijven altijd bewaard.
const tkKanScherm = !!document.documentElement.requestFullscreen;
const tkInScherm = () => !tkKanScherm || !!document.fullscreenElement;
async function tkNaarScherm() {
  if (tkInScherm()) return true;
  try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); return true; } catch { return false; }
}
function tkUitScherm() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function tkBewaak(aan) {
  tk.bewaakt = aan;
  // Tijdens een beveiligde toets geen Terug-knop: inleveren is de weg naar buiten.
  $('tk-back').classList.toggle('hidden', aan);
  if (!aan) {
    tk.weg = false;
    $('tk-slot').classList.add('hidden');
  }
}
function tkSlot(weg) {
  $('tk-slot-icoon').textContent = weg ? '⚠️' : '🛡';
  $('tk-slot-titel').textContent = weg ? 'Je verliet de toets' : 'Toets op het volledige scherm';
  $('tk-slot-tekst').textContent = weg ? 'Je leerkracht ziet dat. Je antwoorden zijn bewaard. Blijf nu in de toets.' : 'Je toets gaat verder op het volledige scherm. Blijf in de toets tot je inlevert.';
  $('tk-slot').classList.remove('hidden');
}
function tkWeg(soort) {
  if (!tk.bewaakt || tk.weg || !tk.taak) return;
  tk.weg = true;
  // Wat de leerling net typte, eerst bewaren.
  if ($('tk-toets-paper').pfFlush) $('tk-toets-paper').pfFlush();
  socket.emit('tk-verlaat', { id: tk.taak.id, naam: tk.naam, soort }, () => {});
  tkSlot(true);
}
function tkTerug() {
  if (!tk.weg || !tk.taak) return;
  tk.weg = false;
  socket.emit('tk-terugin', { id: tk.taak.id, naam: tk.naam }, () => {});
}
$('tk-verder').addEventListener('click', async () => {
  await tkNaarScherm();
  $('tk-slot').classList.add('hidden');
  tkTerug();
});
// Herladen of sluiten is geen "ander tabblad": dat telt pas als hij de toets weer opent (opnieuw geopend).
window.addEventListener('pagehide', () => { tk.weg = true; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) tkWeg('tab');
});
window.addEventListener('blur', () => {
  // Klikken in een venster van de browser zelf (bv. een bestand kiezen) laat de focus even los: kort wachten.
  setTimeout(() => { if (!document.hasFocus() && !document.hidden && !(window.pfMicVraag && Date.now() - window.pfMicVraag < 15000)) tkWeg('tab'); }, 400);
});
document.addEventListener('fullscreenchange', () => {
  if (tkKanScherm && !document.fullscreenElement && tk.bewaakt) tkWeg('scherm');
});
// Niet kopiëren, plakken of rechtsklikken in een beveiligde toets.
for (const ev of ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'drop']) {
  document.addEventListener(ev, e => { if (tk.bewaakt && !(ev === 'drop' && e.target.closest && e.target.closest('#tk-toets-paper'))) e.preventDefault(); });
}
// De leerkracht zet de beveiliging aan of uit terwijl de leerling werkt.
socket.on('tk-beveiligd', d => {
  const t = tk.taak;
  if (!d || !t || t.soort !== 'proef' || t.id !== d.id || t.klaar) return;
  t.beveiligd = !!d.aan;
  if (tk.scherm !== 'toets' || $('tk-toets-werk').classList.contains('hidden')) return;
  if (t.beveiligd) { tkBewaak(true); if (!tkInScherm()) tkSlot(false); }
  else { tkBewaak(false); tkUitScherm(); }
});

// ---------- Live ----------

// De leerkracht gaf of veranderde een taak: de lijst meteen bijwerken (niet midden in een taak).
// De leerkracht zet voorlezen aan of uit terwijl de leerling werkt: de vraag opnieuw tonen, met zijn antwoorden.
socket.on('tk-voorlees', d => {
  const t = tk.taak;
  if (!d || !t || t.soort !== 'proef' || t.id !== d.id || String(d.naam).toLowerCase() !== String(tk.naam).toLowerCase()) return;
  t.voorlees = !!d.aan;
  if (tk.scherm === 'toets' && !$('tk-toets-werk').classList.contains('hidden')) {
    if ($('tk-toets-paper').pfFlush) $('tk-toets-paper').pfFlush();
    tkToetsPagina();
  }
});

// De leerkracht veranderde de keuzes van een taak (bv. punten tonen): een ingeleverde taak die open staat, toont het meteen.
socket.on('tk-keuzes', d => {
  if (d && tk.taak && tk.taak.id === d.id && tk.taak.klaar && tk.scherm !== 'lijst' && tk.scherm !== 'join') tkOpen(d.id);
});
socket.on('tk-nieuw', () => {
  if (tk.scherm === 'lijst') tkLijst();
  else tkNogOpen();
});
socket.on('connect', () => {
  if (tk.scherm === 'join' || tk.scherm === 'lijst') tkLijst();
  else tkNogOpen();
});

// De leerkracht sloot of wiste de taak die nu open staat (op deze pc of op een andere): meteen stoppen, met een melding.
// Wat de leerling al deed, is bewaard (elk antwoord gaat meteen naar de pc van de leerkracht).
function tkNogOpen() {
  const t = tk.taak;
  if (!t || t.klaar || !['blad', 'quiz', 'toets'].includes(tk.scherm)) return;
  socket.emit('tk-mijn', tk.naam, res => {
    if (!res || res.error || tk.taak !== t) return;
    const x = res.taken.find(y => y.id === t.id);
    if (x && !x.dicht) return;
    tkGesloten(!x);
  });
}
function tkGesloten(gewist) {
  // Eerst de beveiliging uit: het volledige scherm verlaten telt dan niet als "de toets verlaten".
  tkBewaak(false);
  tkUitScherm();
  Voorlees.stop();
  tk.taak = null;
  tkLijst();
  Ui.melding(gewist ? 'Je leerkracht wiste deze taak. Wat je al deed, is bewaard.' : 'Deze taak is gesloten. Wat je al deed, is bewaard.');
}

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const tkSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  tkSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('tk-start-banner').classList.toggle('hidden', !Object.values(tkSpellen).some(Boolean));
});
