// De toets op de Chromebook of gsm (De Proef). Vraag per vraag, in volledig scherm.
// Wie de toets verlaat (ander tabblad of venster, volledig scherm uit, pagina herladen), wordt gemeld aan de leerkracht.
// Staat de toets op slot, dan wacht de leerling tot de leerkracht hem vrijgeeft. Een browser kan een Chromebook
// niet echt vergrendelen: we merken het en melden het. Echt vergrendelen kan alleen de school (kioskmodus).
// Gebruikt PfPaper (pf-paper.js), Niveau (niveau.js) en Ui (ui.js). klas-kies.js gebruikt socket, store en playerId.
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

let playerId = store('lancelot-id');
if (!playerId) {
  playerId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  store('lancelot-id', playerId);
}
let myName = store('lancelot-name') || '';
const socket = io();
const $ = id => document.getElementById(id);
const pf = { state: null, run: -1, joined: false, auto: -1, answers: {}, pos: 0, rendered: '', bewaakt: false, weg: false, eindeOm: 0 };

const SCHERMEN = ['pf-geen', 'pf-join', 'pf-kies', 'pf-intro', 'pf-werk', 'pf-klaar'];
function toon(naam) {
  for (const s of SCHERMEN) $(s).classList.toggle('hidden', s !== naam);
  if (naam !== 'pf-werk' && typeof Voorlees !== 'undefined') Voorlees.stop();
}

function join(name) {
  socket.emit('pf-join', { playerId, name }, res => {
    if (res.error) {
      pf.joined = false;
      $('pf-join-error').textContent = res.error;
      toon('pf-join');
      return;
    }
    pf.joined = true;
    myName = res.name;
    store('lancelot-name', res.name);
    $('pf-join-error').textContent = '';
  });
}
$('pf-join').addEventListener('submit', e => {
  e.preventDefault();
  join($('pf-name').value);
});
$('pf-name').value = myName;

// ---------- Volledig scherm ----------
const kanScherm = !!document.documentElement.requestFullscreen;
const inScherm = () => !!document.fullscreenElement;
async function naarScherm() {
  if (!kanScherm || !pf.state || !pf.state.inst || !pf.state.inst.scherm || inScherm()) return true;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}

socket.on('pf-state', s => {
  const vorige = pf.state;
  pf.state = s;
  if (!s.active) {
    bewaak(false);
    $('pf-geen-tekst').textContent = vorige && vorige.name ? 'De toets is gesloten. Goed gewerkt!' : 'Er is nu geen toets bezig.';
    toon('pf-geen');
    sluitSlot();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Even later terug naar het startscherm, waar het volgende spel begint.
    if (vorige && vorige.active) setTimeout(() => { if (!pf.state.active) location.href = '/'; }, 4000);
    return;
  }
  if (pf.run !== s.run) {
    pf.run = s.run;
    pf.joined = false;
    pf.rendered = '';
    pf.answers = {};
  }
  if (!s.name) {
    bewaak(false);
    $('pf-join-title').textContent = s.title ? `Toets: ${s.title}` : 'Toets';
    if (s.phase !== 'open') {
      $('pf-geen-tekst').textContent = 'Deze toets is al afgesloten.';
      return toon('pf-geen');
    }
    const saved = store('lancelot-name');
    if (!pf.joined && saved && pf.auto !== s.run) {
      pf.auto = s.run;
      join(saved);
    } else if (!pf.joined) toon('pf-join');
    return;
  }
  pf.joined = true;
  if (s.choosing) {
    kiesNiveau(s.niveaus);
    return toon('pf-kies');
  }
  if (s.status === 'wacht') return intro(s);
  if (s.status === 'klaar' || s.phase !== 'open') return klaar(s);
  werk(s);
});

function kiesNiveau(niveaus) {
  const box = $('pf-kies-lijst');
  box.innerHTML = (niveaus || Niveau.LIST).map(n => `<button type="button" class="big${n === 'schildknaap' ? ' gold' : ' secondary'}" data-niveau="${n}">${Niveau.label(n)}<small>${Niveau.STUDENT[n]}</small></button>`).join('');
  for (const b of box.querySelectorAll('button')) {
    b.addEventListener('click', () => socket.emit('pf-niveau', b.dataset.niveau, res => { $('pf-kies-error').textContent = (res && res.error) || ''; }));
  }
}

function intro(s) {
  bewaak(false);
  $('pf-titel').textContent = s.title;
  $('pf-wie').textContent = `${s.name}${s.niveau ? ` · ${Niveau.label(s.niveau)}` : ''}`;
  $('pf-intro-tekst').textContent = s.intro || '';
  const regels = [
    `${s.vragen} ${s.vragen === 1 ? 'vraag' : 'vragen'}, samen ${PfPaper.ptn(s.totaal)}.`,
    s.inst.tijd ? `Je hebt ${s.inst.tijd} minuten. Daarna wordt je toets vanzelf ingeleverd.` : 'Neem je tijd. Lever in als je klaar bent.',
    s.inst.terug ? 'Je mag terug naar vorige vragen.' : 'Let op: je kan niet terug naar een vorige vraag.',
    kanScherm && s.inst.scherm ? 'De toets opent in volledig scherm. Blijf in de toets tot je inlevert.' : 'Blijf in de toets tot je inlevert.',
    s.inst.slot === 'slot' ? 'Verlaat je de toets (ander tabblad, venster of volledig scherm uit), dan gaat je toets op slot tot je leerkracht hem weer opent.' : 'Verlaat je de toets (ander tabblad, venster of volledig scherm uit), dan ziet je leerkracht dat.',
  ];
  $('pf-regels').innerHTML = regels.map(r => `<li>${PfPaper.esc(r)}</li>`).join('');
  toon('pf-intro');
}

$('pf-start').addEventListener('click', async () => {
  $('pf-start').disabled = true;
  pf.startHier = true;
  await naarScherm();
  socket.emit('pf-start', null, res => {
    $('pf-start').disabled = false;
    $('pf-intro-error').textContent = (res && res.error) || '';
  });
});

function klaar(s) {
  bewaak(false);
  sluitSlot();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const u = s.uitslag;
  $('pf-uitslag').innerHTML = u ? `Je haalde <strong>${PfPaper.nl(u.punten)} van de ${PfPaper.nl(u.max - u.hand)}</strong> punten die de computer verbetert.${u.hand ? ` Je leerkracht verbetert nog ${PfPaper.ptn(u.hand)}.` : ''}` : '';
  toon('pf-klaar');
}

// ---------- Werken ----------

function werk(s) {
  toon('pf-werk');
  if (pf.viewRun !== s.run) {
    pf.viewRun = s.run;
    pf.answers = { ...(s.answers || {}) };
    pf.pos = s.pos || 0;
    pf.rendered = '';
  }
  $('pf-naam').textContent = `${s.name}${s.niveau ? ` · ${Niveau.label(s.niveau)}` : ''}`;
  pf.eindeOm = s.rest !== null && s.rest !== undefined ? performance.now() + s.rest : 0;
  $('pf-tijd').classList.toggle('hidden', !pf.eindeOm);
  if (pf.rendered !== `${s.run}:${s.niveau}:${pf.pos}`) tekenPagina();
  bolletjes();
  bewaak(true);
  // Niet hier op Start gedrukt maar toch al bezig: de pagina werd herladen of op een ander toestel geopend.
  if (!pf.startHier && !pf.herladen && s.status === 'bezig') {
    pf.herladen = true;
    weg('herladen');
  }
  if (s.status === 'slot') toonSlot('slot');
  else if (pf.slotSoort === 'slot') vrijgegeven();
}

function tekenPagina() {
  const s = pf.state;
  const pages = s.view.pages;
  pf.pos = Math.max(0, Math.min(pages.length - 1, pf.pos));
  pf.rendered = `${s.run}:${s.niveau}:${pf.pos}`;
  PfPaper.render($('pf-paper'), [pages[pf.pos]], { mode: 'live', answers: pf.answers, start: pf.pos, nummer: true, voorlees: s.voorlees, onAnswer: stuur });
  $('pf-teller').textContent = `Vraag ${pf.pos + 1} van ${pages.length}`;
  $('pf-vorige').classList.toggle('hidden', !s.inst.terug || pf.pos === 0);
  const laatste = pf.pos === pages.length - 1;
  $('pf-volgende').textContent = laatste ? 'Inleveren ✔' : 'Volgende ▶';
  $('pf-volgende').classList.toggle('gold', laatste);
  $('pf-fout').textContent = '';
  window.scrollTo(0, 0);
}

function stuur(id, value) {
  pf.answers[id] = value;
  bolletjes();
  socket.emit('pf-answer', { id, value }, res => {
    $('pf-fout').textContent = (res && res.error) || '';
  });
}

// Per pagina een bolletje: ingevuld of niet. Klikken springt naar die vraag (als terugkeren mag).
function bolletjes() {
  const s = pf.state;
  if (!s.view) return;
  const ids = p => (p.type === 'bron' ? p.vragen.map(q => q.id) : [p.id]);
  $('pf-bolletjes').innerHTML = s.view.pages.map((p, i) => {
    const klaar = ids(p).every(id => PfPaper.beantwoord(pf.answers[id]));
    const half = !klaar && ids(p).some(id => PfPaper.beantwoord(pf.answers[id]));
    const mag = s.inst.terug || i >= (s.verst || 0);
    return `<button type="button" class="pf-bol${i === pf.pos ? ' nu' : ''}${klaar ? ' ok' : half ? ' half' : ''}" data-i="${i}"${mag ? '' : ' disabled'} aria-label="Vraag ${i + 1}">${i + 1}</button>`;
  }).join('');
}
$('pf-bolletjes').addEventListener('click', e => {
  const b = e.target.closest('.pf-bol');
  if (b && !b.disabled) ga(Number(b.dataset.i));
});

function ga(i) {
  const paper = $('pf-paper');
  if (paper.pfFlush) paper.pfFlush();
  if (!pf.state.inst.terug && i < pf.pos) return;
  socket.emit('pf-pos', i, res => {
    if (res && res.error) {
      $('pf-fout').textContent = res.error;
      return;
    }
    pf.pos = res.pos;
    pf.state.verst = Math.max(pf.state.verst || 0, res.pos);
    tekenPagina();
    bolletjes();
  });
}

$('pf-vorige').addEventListener('click', () => ga(pf.pos - 1));
$('pf-volgende').addEventListener('click', async () => {
  const pages = pf.state.view.pages;
  if (pf.pos < pages.length - 1) {
    if (!pf.state.inst.terug) {
      const ids = pages[pf.pos].type === 'bron' ? pages[pf.pos].vragen.map(q => q.id) : [pages[pf.pos].id];
      const leeg = ids.some(id => !PfPaper.beantwoord(pf.answers[id]) && !$('pf-paper').querySelector(`.pf-q[data-id="${CSS.escape(id)}"][data-type="papier"]`));
      if (leeg && !await Ui.vraag('Je hebt nog niet alles ingevuld. Je kan straks niet meer terug. Toch verder?')) return;
    }
    return ga(pf.pos + 1);
  }
  inleveren();
});

async function inleveren() {
  const paper = $('pf-paper');
  if (paper.pfFlush) paper.pfFlush();
  const s = pf.state;
  const alle = s.view.pages.flatMap(p => (p.type === 'bron' ? p.vragen : [p])).filter(q => q.type !== 'papier');
  const leeg = alle.filter(q => !PfPaper.beantwoord(pf.answers[q.id])).length;
  if (!await Ui.vraag(leeg ? `Nog ${leeg} ${leeg === 1 ? 'vraag' : 'vragen'} niet ingevuld. Toch inleveren?` : 'Je toets inleveren? Daarna kan je niets meer veranderen.', { ja: 'Inleveren' })) return;
  // Even wachten zodat het laatste antwoord zeker eerst aankomt.
  setTimeout(() => socket.emit('pf-submit', null, res => { if (res && res.error) $('pf-fout').textContent = res.error; }), 150);
}

// De tijd die nog rest, elke seconde. Op het einde levert de server vanzelf in.
setInterval(() => {
  if (!pf.eindeOm || $('pf-werk').classList.contains('hidden')) return;
  const rest = Math.max(0, pf.eindeOm - performance.now());
  const m = Math.floor(rest / 60000);
  const sec = Math.floor((rest % 60000) / 1000);
  const el = $('pf-tijd');
  el.textContent = `⏳ ${m}:${String(sec).padStart(2, '0')}`;
  el.classList.toggle('bijna', rest < 120000);
}, 500);

// ---------- Bewaken ----------
// Alleen tijdens het werken. Elke manier om de toets te verlaten geeft één seintje aan de server.
function bewaak(aan) {
  pf.bewaakt = aan;
}

function weg(soort) {
  if (!pf.bewaakt || !pf.state || pf.state.status !== 'bezig' || pf.weg) return;
  pf.weg = true;
  socket.emit('pf-weg', soort, res => {
    if (res && res.slot) toonSlot('slot');
    else toonSlot('melden');
  });
}

function terug() {
  if (!pf.weg) return;
  pf.weg = false;
  socket.emit('pf-terug');
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) weg('tab');
  else terug();
});
window.addEventListener('blur', () => {
  // Klikken in een venster van de browser zelf (bv. een melding) laat de focus even los: kort wachten.
  // De vraag om de microfoon (inspreken) telt niet als de toets verlaten.
  setTimeout(() => { if (!document.hasFocus() && !(window.pfMicVraag && Date.now() - window.pfMicVraag < 15000)) weg('tab'); }, 400);
});
window.addEventListener('focus', () => { if (!document.hidden) terug(); });
document.addEventListener('fullscreenchange', () => {
  if (!inScherm() && pf.bewaakt && pf.state && pf.state.inst && pf.state.inst.scherm && kanScherm) weg('scherm');
});

// Niet kopiëren, plakken, knippen of rechtsklikken in de toets.
for (const ev of ['copy', 'cut', 'contextmenu', 'dragstart', 'drop']) {
  document.addEventListener(ev, e => { if (pf.bewaakt) e.preventDefault(); });
}
document.addEventListener('paste', e => {
  if (!pf.bewaakt) return;
  e.preventDefault();
  socket.emit('pf-weg', 'plak');
  $('pf-fout').textContent = 'Plakken kan niet in een toets. Typ je antwoord zelf.';
});
document.addEventListener('keydown', e => {
  if (!pf.bewaakt) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p', 's', 'u', 'a', 'f'].includes(k) && !(k === 'a' && e.target.matches('input, textarea'))) e.preventDefault();
  if (k === 'f12' || k === 'printscreen') e.preventDefault();
});

// ---------- Op slot ----------

function toonSlot(soort) {
  pf.slotSoort = soort;
  const slot = soort === 'slot';
  $('pf-slot-icoon').textContent = slot ? '🔒' : '⚠️';
  $('pf-slot-titel').textContent = slot ? 'Je toets staat op slot' : 'Je verliet de toets';
  $('pf-slot-tekst').textContent = slot
    ? 'Je verliet de toets. Je leerkracht ziet dat en zet je toets weer open. Wacht rustig.'
    : 'Je leerkracht ziet dat je de toets verliet. Ga verder en blijf in de toets.';
  $('pf-verder').classList.toggle('hidden', slot);
  $('pf-slot').classList.remove('hidden');
}

function vrijgegeven() {
  pf.slotSoort = 'vrij';
  $('pf-slot-icoon').textContent = '🔓';
  $('pf-slot-titel').textContent = 'Je leerkracht opende je toets weer';
  $('pf-slot-tekst').textContent = 'Je kan verder werken. Blijf nu in de toets.';
  $('pf-verder').classList.remove('hidden');
}

function sluitSlot() {
  $('pf-slot').classList.add('hidden');
  pf.slotSoort = '';
}

$('pf-verder').addEventListener('click', async () => {
  pf.weg = false;
  await naarScherm();
  socket.emit('pf-terug');
  sluitSlot();
});

socket.on('pf-kicked', () => {
  pf.joined = false;
  bewaak(false);
  sluitSlot();
  store('lancelot-name', null);
  $('pf-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  toon('pf-join');
});

socket.on('connect', () => {
  if (pf.joined) join(store('lancelot-name') || '');
});
