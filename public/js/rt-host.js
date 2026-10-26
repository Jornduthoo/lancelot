// De Ronde Tafel op het docentenscherm: sessies kiezen, maken en live tonen. Gebruikt sfx en confetti uit fx.js, ItemList uit quiz-list.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let hasKey = false;
let editingFile = null;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const TYPE_NAMES = { keuze: 'Meerkeuze', woorden: 'Woordwolk', open: 'Open vraag', schaal: 'Schaal' };
const LETTERS = 'ABCDEF';

let view = 'list';
const VIEWS = ['list', 'maker', 'editor', 'welcome', 'live', 'end'];
// Schermen die de leerkracht zelf opent en die een statusupdate niet mag wegklikken.
const OWN_VIEWS = ['list', 'maker', 'editor'];

function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => show(b.dataset.back));

function downloadLink(file) {
  const link = document.createElement('a');
  link.href = `/resultaten/${encodeURIComponent(file)}`;
  link.download = file;
  link.textContent = 'Download voor Excel';
  return link;
}

// ---------- Sessies ----------

ItemList.mount($('session-list'), {
  kind: 'sessie',
  errorId: 'list-error',
  go: 'Start ▶',
  play: s => startSession(s.file),
  edit: s => {
    socket.emit('rt-open', s.file, res => res.error ? ($('list-error').textContent = res.error) : openEditor(res.session, s.file));
  },
  remove: async s => {
    if (!await Ui.vraag(`"${s.title}" verwijderen?`)) return;
    socket.emit('rt-delete', s.file, res => { $('list-error').textContent = res.error || ''; });
  },
});

function startSession(file) {
  $('stopped').classList.add('hidden');
  loadGame('rt-load', file, res => { $('list-error').textContent = res.error || ''; });
}

// ---------- Adres en QR-code ----------

// ---------- Live ----------

socket.on('rt-state', s => {
  prev = state;
  state = s;
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', !(live && s.index >= 0 && s.phase === 'open'));
  $('status').textContent = live ? `De Ronde Tafel · ${s.title}` : 'De Ronde Tafel';
  if (!live) {
    if (!OWN_VIEWS.includes(view)) show('list');
    return;
  }
  const sameRun = prev && prev.run === s.run && prev.phase !== 'idle';
  if (s.phase === 'einde') {
    renderEnd(!sameRun || prev.phase !== 'einde');
    show('end');
  } else if (s.index < 0) {
    renderWelcome(sameRun);
    show('welcome');
  } else {
    renderLive(!sameRun || prev.index !== s.index || prev.phase !== 'open');
    show('live');
  }
});

// De ridderzaal achter het bord, met de Ronde Tafel in het welkomstscherm: elke ridder die aanschuift, krijgt een gouden schild.
const RtScene = (() => {
  const back = $('p-back');
  const g = back.getContext('2d');
  const table = $('w-table');
  const tg = table.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let art = null;
  let last = 0;
  let joinedAt = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    // Fakkels flakkeren ook rustig mooi aan 20 beelden per seconde; dat spaart de Chromebook.
    if (OWN_VIEWS.includes(view) || now - last < 50) return;
    last = now;
    const t = now / 1000;
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (back.width !== w || back.height !== h) { back.width = w; back.height = h; }
    if (!art || art.c.width !== w || art.c.height !== h) {
      art = VrArt.hall(w, h, 11);
      const ag = art.c.getContext('2d');
      ag.fillStyle = 'rgba(4, 3, 12, .5)';
      ag.fillRect(0, 0, w, h);
      Glow.vignette(ag, w, h, .6);
    }
    g.drawImage(art.c, 0, 0);
    art.torches.forEach(([x, y, u], i) => VrArt.torch(g, x, y, u, t, i * 1.9));
    if (view === 'welcome' && state) {
      const tw = Math.round(table.clientWidth * dpr), th = Math.round(table.clientHeight * dpr);
      if (table.width !== tw || table.height !== th) { table.width = tw; table.height = th; }
      tg.clearRect(0, 0, tw, th);
      const n = state.participants;
      const total = Math.max(12, Math.min(40, Math.ceil((n + 1) / 4) * 4));
      const hot = t - joinedAt < 1.2 ? n - 1 : -1;
      const seats = Array.from({ length: total }, (_, i) => ({ name: '', out: i >= n, hot: i === hot, color: i < n ? '#ffc94a' : '#5a6a8a', mark: i < n ? '⚔' : '' }));
      const ry = th * .3, rx = Math.min(tw * .36, ry * 2.6);
      VrArt.table(tg, tw / 2, th * .46, rx, ry, seats, t);
    }
  }
  requestAnimationFrame(tick);
  return { joined: () => { joinedAt = performance.now() / 1000; } };
})();

function renderWelcome(sameRun) {
  $('w-title').textContent = state.title;
  const n = state.participants;
  if (sameRun && n > prev.participants) { sfx.join(); RtScene.joined(); }
  $('w-count').textContent = n;
  $('w-word').textContent = n === 1 ? 'ridder' : 'ridders';
}

$('w-start').addEventListener('click', () => socket.emit('rt-go', 0));
$('l-prev').addEventListener('click', () => socket.emit('rt-go', state.index - 1));
$('l-next').addEventListener('click', () => socket.emit('rt-go', state.index + 1));
$('l-lock').addEventListener('click', () => socket.emit('rt-lock'));
$('l-toggle').addEventListener('click', () => socket.emit('rt-results'));
$('end-back').addEventListener('click', () => socket.emit('rt-go', state.total - 1));
$('end-close').addEventListener('click', () => socket.emit('rt-stop', null, () => show('list')));

$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('De Ronde Tafel stoppen en terug naar de sessies?')) return;
  socket.emit('rt-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('De Ronde Tafel is gestopt.');
    if (res && res.file) {
      note.append(' De antwoorden zijn bewaard. ');
      note.append(downloadLink(res.file));
    }
    note.classList.remove('hidden');
    show('list');
  });
});

function renderLive(fresh) {
  const { item, results } = state;
  $('l-progress').textContent = `VRAAG ${state.index + 1} / ${state.total}`;
  $('l-type').textContent = TYPE_NAMES[item.type];
  $('l-count').textContent = `${results.respondents} / ${state.participants} geantwoord`;
  $('l-question').textContent = item.question;
  $('l-prev').disabled = false;
  $('l-next').textContent = state.index + 1 >= state.total ? 'Afronden ▶' : 'Volgende ▶';
  $('l-toggle').textContent = state.showResults ? 'Verberg resultaten' : 'Toon resultaten';
  $('l-lock').textContent = state.locked ? 'Heropen antwoorden' : 'Sluit antwoorden';
  $('l-lock').classList.toggle('gold', state.locked);
  $('l-lock').classList.toggle('secondary', !state.locked);

  const box = $('l-results');
  if (fresh) {
    box.innerHTML = '';
    box.dataset.type = '';
    sfx.whoosh();
  }
  if (!state.showResults) {
    box.dataset.type = 'hidden';
    box.innerHTML = `<div class="rt-hidden"><span class="count">${results.respondents}</span><span>antwoorden binnen</span><span class="muted small">De resultaten zijn verborgen. Klik op "Toon resultaten" om ze te onthullen.</span></div>`;
    return;
  }
  if (box.dataset.type !== item.type) {
    box.innerHTML = '';
    box.dataset.type = item.type;
  }
  if (item.type === 'keuze') renderPoll(box, item, results);
  else if (item.type === 'schaal') renderScale(box, item, results);
  else if (item.type === 'woorden') renderCloud(box, results);
  else renderOpen(box, results);
  box.querySelector('.rt-locked')?.remove();
  if (state.locked) box.insertAdjacentHTML('afterbegin', '<p class="rt-locked">Antwoorden gesloten</p>');
}

// Meerkeuze: liggende balken die meegroeien met de stemmen.
function renderPoll(box, item, results) {
  if (!box.querySelector('.poll')) {
    box.innerHTML = `<div class="poll">${item.options.map((o, i) => `
      <div class="poll-row c${i}" style="animation-delay:${i * 70}ms">
        <span class="letter">${LETTERS[i]}</span>
        <div class="poll-bar"><div class="poll-fill"></div><span class="poll-label">${esc(o)}</span></div>
        <span class="poll-num"></span>
      </div>`).join('')}</div>`;
  }
  const max = Math.max(1, ...results.counts);
  const total = Math.max(1, results.respondents);
  [...box.querySelectorAll('.poll-row')].forEach((row, i) => {
    const n = results.counts[i];
    row.querySelector('.poll-fill').style.transform = `scaleX(${n / max})`;
    row.querySelector('.poll-num').textContent = `${n} · ${Math.round((n / total) * 100)}%`;
    row.classList.toggle('lead', n > 0 && n === max);
  });
}

// Schaal: vijf staande balken en het gemiddelde.
function renderScale(box, item, results) {
  if (!box.querySelector('.scale')) {
    box.innerHTML = `<div class="scale">
      <div class="scale-avg"><span class="avg-num">–</span><span class="muted small">gemiddeld</span></div>
      <div class="scale-chart">${[1, 2, 3, 4, 5].map(n => `
        <div class="scale-col"><span class="scale-n"></span><div class="scale-track"><div class="scale-fill"></div></div><span class="scale-label">${n}</span></div>`).join('')}
      </div>
      <div class="scale-ends"><span>1 · ${esc(item.min)}</span><span>${esc(item.max)} · 5</span></div>
    </div>`;
  }
  const max = Math.max(1, ...results.counts);
  [...box.querySelectorAll('.scale-col')].forEach((col, i) => {
    col.querySelector('.scale-fill').style.transform = `scaleY(${results.counts[i] / max})`;
    col.querySelector('.scale-n').textContent = results.counts[i];
  });
  box.querySelector('.avg-num').textContent = results.avg === null ? '–' : results.avg.toFixed(1).replace('.', ',');
}

// Woordwolk: grote woorden in het midden, nieuwe woorden ploppen erbij. Klik om een woord te verbergen.
function renderCloud(box, results) {
  let cloud = box.querySelector('.cloud');
  if (!cloud) {
    box.innerHTML = '<div class="cloud"></div><p class="muted small center">Klik op een woord om het te verbergen.</p>';
    cloud = box.querySelector('.cloud');
  }
  const words = results.words;
  if (!words.length) {
    cloud.innerHTML = '<p class="muted waiting">Wachten op de eerste woorden…</p>';
    return;
  }
  const max = words[0].n;
  // Om en om links en rechts zetten, zodat de grootste woorden in het midden staan.
  const ordered = [];
  words.forEach((w, i) => (i % 2 ? ordered.push(w) : ordered.unshift(w)));
  const known = new Map([...cloud.querySelectorAll('.word')].map(el => [el.dataset.key, el]));
  cloud.querySelector('.waiting')?.remove();
  const keep = new Set();
  ordered.forEach((w, i) => {
    const key = w.text.toLowerCase();
    keep.add(key);
    let el = known.get(key);
    if (!el) {
      el = document.createElement('span');
      el.className = 'word new';
      el.dataset.key = key;
      el.textContent = w.text;
      el.title = 'Klik om te verbergen';
      el.addEventListener('click', () => socket.emit('rt-hide', w.text));
    }
    el.style.fontSize = `${1.1 + (w.n / max) * 3.4}rem`;
    el.style.order = i;
    el.className = `word w${hash(key) % 6}${el.classList.contains('new') ? ' new' : ''}`;
    el.title = `${w.n}× · klik om te verbergen`;
    cloud.appendChild(el);
  });
  for (const [key, el] of known) if (!keep.has(key)) el.remove();
  setTimeout(() => cloud.querySelectorAll('.new').forEach(el => el.classList.remove('new')), 600);
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Open vragen: een muur van kaartjes. Klik om een antwoord te verbergen.
function renderOpen(box, results) {
  let wall = box.querySelector('.wall');
  if (!wall) {
    box.innerHTML = '<div class="wall"></div><p class="muted small center">Klik op een antwoord om het te verbergen.</p>';
    wall = box.querySelector('.wall');
  }
  if (!results.open.length) {
    wall.innerHTML = '<p class="muted waiting">Wachten op de eerste antwoorden…</p>';
    return;
  }
  wall.querySelector('.waiting')?.remove();
  const ids = new Set(results.open.map(a => String(a.id)));
  for (const el of [...wall.children]) if (!ids.has(el.dataset.id)) el.remove();
  const known = new Set([...wall.children].map(el => el.dataset.id));
  for (const a of results.open) {
    if (known.has(String(a.id))) continue;
    const el = document.createElement('div');
    el.className = `card c${a.id % 6}`;
    el.dataset.id = a.id;
    el.textContent = a.text;
    el.title = 'Klik om te verbergen';
    el.addEventListener('click', () => socket.emit('rt-hide', a.id));
    wall.prepend(el);
  }
}

function renderEnd(first) {
  $('end-summary').textContent = `${state.participants} ${state.participants === 1 ? 'ridder schoof' : 'ridders schoven'} aan bij "${state.title}".`;
  const saved = $('end-saved');
  saved.innerHTML = '';
  if (state.resultsFile) {
    saved.append('De antwoorden zijn bewaard. ');
    saved.append(downloadLink(state.resultsFile));
  }
  if (first) {
    sfx.fanfare();
    confetti(3500);
  }
}

// ---------- Maken met AI ----------

function buildPrompt() {
  const topic = $('r-topic').value.trim() || '[ONDERWERP]';
  const level = $('r-level').value;
  const goal = $('r-goal').value;
  const count = Math.min(15, Math.max(2, Number($('r-count').value) || 5));
  const extra = $('r-extra').value.trim();
  const activate = goal.startsWith('voorkennis') ? `
Dit is een sessie om voorkennis te activeren bij de start van een les. Bouw ze zo op:
- begin met een woordwolk ("woorden"): wat weet je al over ${topic}, of waar denk je aan bij ${topic}?
- dan een of twee stellingen of keuzevragen ("keuze") over wat leerlingen vaak denken of verkeerd begrijpen over dit onderwerp; zet er altijd "Ik weet het niet" bij als keuze;
- een schaal ("schaal") hoe goed de leerlingen het onderwerp al kennen;
- sluit af met een open vraag ("open"): wat wil je nog te weten komen?
` : '';
  return `Je bent een ervaren leerkracht in Vlaanderen. Maak een reeks vragen voor een live klasgesprek met een stemsysteem (zoals Mentimeter). De leerlingen zitten in: ${level} (Belgisch onderwijs). Onderwerp: ${topic}. Doel: ${goal}.
${extra ? `\nExtra wensen van de docent:\n${extra}\n` : ''}
Regels:
- Maak precies ${count} vragen in het Nederlands zoals in Vlaanderen. Leerlingen antwoorden anoniem.
- Gebruik een afwisselende mix van deze soorten:
  - "keuze": meerkeuze of stelling, met 2 tot 6 korte keuzes (bij een stelling bijvoorbeeld "Eens", "Twijfel", "Oneens"). Er is geen goed of fout antwoord.
  - "woorden": een woordwolk; leerlingen geven een tot drie losse woorden.
  - "open": een open vraag waarop leerlingen een korte zin antwoorden.
  - "schaal": een schaal van 1 tot 5, met een korte omschrijving voor 1 ("min") en voor 5 ("max").
- Houd vragen kort (hooguit 120 tekens) en keuzes heel kort (hooguit 40 tekens).
- Pas het taalgebruik aan het niveau ${level} aan. Stel vragen die het gesprek in de klas op gang brengen.
${activate}
Belangrijk: maak GEEN interactieve quiz, app, webpagina of canvas en schrijf geen code. Ik heb enkel de gegevens nodig als tekst.
Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, precies in dit formaat:
{
  "title": "korte titel van de sessie",
  "items": [
    { "type": "woorden", "question": "de vraag" },
    { "type": "keuze", "question": "de vraag of stelling", "options": ["keuze 1", "keuze 2", "keuze 3"] },
    { "type": "schaal", "question": "de vraag", "min": "omschrijving bij 1", "max": "omschrijving bij 5" },
    { "type": "open", "question": "de vraag" }
  ]
}`;
}

function updatePrompt() {
  $('r-prompt').value = buildPrompt();
  $('r-copied').textContent = '';
}
for (const id of ['r-topic', 'r-level', 'r-goal', 'r-count', 'r-extra']) $(id).addEventListener('input', updatePrompt);
updatePrompt();

$('new-ai').addEventListener('click', () => {
  $('r-error').textContent = '';
  $('r-gemini-error').textContent = '';
  $('maker-heading').textContent = 'Nieuwe sessie met AI';
  show('maker');
});

// Voorkennis activeren: meteen de maker, met dat doel (knop bovenaan of de kaart op het startscherm).
function startVoorkennis() {
  $('r-goal').selectedIndex = 0;
  $('r-count').value = 5;
  updatePrompt();
  $('maker-heading').textContent = 'Voorkennis activeren met AI';
  show('maker');
}
$('new-voorkennis').addEventListener('click', startVoorkennis);
if (new URLSearchParams(location.search).get('doel') === 'voorkennis') startVoorkennis();

let promptCopied = false;
let lastClipboard = '';

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText($('r-prompt').value);
  } catch {
    $('r-prompt').select();
    document.execCommand('copy');
  }
  promptCopied = true;
  lastClipboard = $('r-prompt').value;
  $('r-copied').textContent = 'Gekopieerd! Plak hem in de chatbot, kopieer het antwoord (de kopieerknop van het codeblok) en kom hier terug.';
}
$('r-copy').addEventListener('click', copyPrompt);
for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    window.open(b.dataset.url, '_blank', 'noopener');
    copyPrompt();
  });
}

function parseAnswer(text) {
  socket.emit('rt-parse', text, res => {
    if (res.error) {
      $('r-error').textContent = res.error;
      return;
    }
    $('r-error').textContent = '';
    $('r-answer').value = '';
    openEditor(res.session, null);
  });
}
$('r-parse').addEventListener('click', () => parseAnswer($('r-answer').value));
$('r-answer').addEventListener('paste', () => setTimeout(() => parseAnswer($('r-answer').value), 0));

// Terug uit de chatbot? Dan kijken we of het antwoord al op het klembord staat.
async function checkClipboard() {
  if (view !== 'maker' || !promptCopied || !navigator.clipboard?.readText) return;
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return;
  }
  if (!text || text === lastClipboard || text === $('r-prompt').value || !text.includes('"items"')) return;
  lastClipboard = text;
  $('r-copied').textContent = 'Antwoord van de AI gevonden op het klembord!';
  parseAnswer(text);
}
window.addEventListener('focus', checkClipboard);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkClipboard());

socket.on('settings', s => {
  hasKey = s.hasKey;
  $('r-gemini-panel').classList.toggle('hidden', !hasKey);
});

$('r-gemini').addEventListener('click', () => {
  const button = $('r-gemini');
  button.disabled = true;
  $('r-gemini-error').textContent = '';
  $('r-gemini-busy').textContent = 'Gemini is bezig, dit duurt meestal 10 tot 60 seconden…';
  socket.emit('rt-generate', { prompt: buildPrompt() }, res => {
    button.disabled = false;
    $('r-gemini-busy').textContent = '';
    if (res.error) {
      $('r-gemini-error').textContent = res.error;
      return;
    }
    openEditor(res.session, null);
  });
});

// ---------- Editor ----------

const EMPTY = {
  keuze: () => ({ type: 'keuze', question: '', options: ['', '', ''] }),
  woorden: () => ({ type: 'woorden', question: '' }),
  open: () => ({ type: 'open', question: '' }),
  schaal: () => ({ type: 'schaal', question: '', min: 'Helemaal niet', max: 'Helemaal wel' }),
};

$('new-empty').addEventListener('click', () => openEditor({ title: '', items: [EMPTY.woorden(), EMPTY.keuze()] }, null));

function openEditor(session, file) {
  editingFile = file;
  $('e-heading').textContent = file ? 'Sessie bewerken' : 'Nieuwe sessie controleren';
  $('e-title').value = session.title;
  $('e-items').innerHTML = '';
  session.items.forEach(addItem);
  $('e-error').textContent = '';
  show('editor');
}

function renumber() {
  [...$('e-items').children].forEach((el, i) => {
    el.querySelector('.q-number').textContent = `Vraag ${i + 1} · ${TYPE_NAMES[el.dataset.type]}`;
  });
}

function addItem(item) {
  const el = document.createElement('div');
  el.className = 'panel form question-edit';
  el.dataset.type = item.type;
  let body = '';
  if (item.type === 'keuze') {
    body = `<p class="muted small">2 tot 6 keuzes. Lege keuzes vallen weg.</p><div class="answers">${[0, 1, 2, 3, 4, 5].map(i => `
      <label class="answer-edit c${i}"><span class="letter">${LETTERS[i]}</span><input class="o-text" maxlength="80" placeholder="Keuze ${i + 1}${i > 1 ? ' (mag leeg)' : ''}" value="${esc(item.options[i] || '')}"></label>`).join('')}</div>`;
  } else if (item.type === 'schaal') {
    body = `<div class="row"><label>Bij 1<input class="s-min" maxlength="40" value="${esc(item.min)}"></label><label>Bij 5<input class="s-max" maxlength="40" value="${esc(item.max)}"></label></div>`;
  } else {
    body = `<p class="muted small">${item.type === 'woorden' ? 'Elke leerling kan tot 3 woorden insturen. Samen vormen ze een woordwolk.' : 'Elke leerling kan tot 3 korte antwoorden insturen.'}</p>`;
  }
  el.innerHTML = `
    <div class="bar">
      <strong class="q-number"></strong>
      <div class="actions">
        <button class="secondary icon up" title="Hoger">▲</button>
        <button class="secondary icon down" title="Lager">▼</button>
        <button class="secondary q-delete" title="Vraag verwijderen">✕</button>
      </div>
    </div>
    <textarea class="q-text" rows="2" maxlength="200" placeholder="De vraag">${esc(item.question)}</textarea>
    ${body}`;
  el.querySelector('.q-delete').addEventListener('click', () => { el.remove(); renumber(); });
  el.querySelector('.up').addEventListener('click', () => { el.previousElementSibling?.before(el); renumber(); });
  el.querySelector('.down').addEventListener('click', () => { el.nextElementSibling?.after(el); renumber(); });
  $('e-items').appendChild(el);
  renumber();
}

for (const b of document.querySelectorAll('[data-add]')) {
  b.addEventListener('click', () => {
    addItem(EMPTY[b.dataset.add]());
    $('e-items').lastElementChild.querySelector('.q-text').focus();
  });
}

function readEditor() {
  return {
    title: $('e-title').value,
    items: [...$('e-items').children].map(el => {
      const item = { type: el.dataset.type, question: el.querySelector('.q-text').value };
      if (item.type === 'keuze') item.options = [...el.querySelectorAll('.o-text')].map(o => o.value.trim()).filter(Boolean);
      if (item.type === 'schaal') {
        item.min = el.querySelector('.s-min').value;
        item.max = el.querySelector('.s-max').value;
      }
      return item;
    }),
  };
}

function saveEditor(start) {
  socket.emit('rt-save', { session: readEditor(), file: editingFile }, res => {
    if (res.error) {
      $('e-error').textContent = res.error;
      return;
    }
    editingFile = res.file;
    show('list');
    if (start) startSession(res.file);
  });
}
$('e-save').addEventListener('click', () => saveEditor(false));
$('e-play').addEventListener('click', () => saveEditor(true));
