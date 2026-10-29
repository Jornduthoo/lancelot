// De ontdekwereld voor de leerkracht: open of dicht, wie vandaag wat oploste, en eigen weetjes en woorden
// op maat van het leerjaar (met de eigen AI-sleutel of via een chatbot).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const NIV = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };
let promptTekst = '';
let gekopieerd = '';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

function laad() {
  socket.emit('od-bord', null, res => {
    if (!res || res.error) return;
    for (const e of document.querySelectorAll('.od-wereldnaam')) e.textContent = res.bord.wereld;
    document.title = `LANcelot · ${res.bord.wereld}`;
    bord(res.bord);
    eigen(res.eigen);
    if (!$('odh-leerjaar').dataset.gezet) {
      $('odh-leerjaar').value = res.eigen.leerjaar || String(res.leerjaar);
      if (!$('odh-leerjaar').value) $('odh-leerjaar').value = '6';
      maakPrompt();
      $('odh-leerjaar').dataset.gezet = '1';
    }
  });
}

// ---------- Toegang ----------

for (const b of document.querySelectorAll('#odh-toegang button')) {
  b.addEventListener('click', () => socket.emit('od-toegang', b.dataset.t, res => {
    if (res && res.error) return Ui.melding(res.error);
    zetToegang(res.toegang);
  }));
}
function zetToegang(t) {
  for (const b of document.querySelectorAll('#odh-toegang button')) b.classList.toggle('on', b.dataset.t === t);
}

// ---------- Vandaag ----------

function bord(b) {
  zetToegang(b.toegang);
  const rijen = $('odh-rijen');
  rijen.innerHTML = '';
  const actief = b.rijen.filter(r => r.vandaag.length || r.binnen);
  const binnen = b.rijen.filter(r => r.binnen).length;
  const raadsels = b.rijen.reduce((t, r) => t + r.vandaag.length, 0);
  $('odh-samen').textContent = `${binnen} ${binnen === 1 ? 'leerling is' : 'leerlingen zijn'} nu binnen · vandaag ${raadsels} ${raadsels === 1 ? 'raadsel' : 'raadsels'} opgelost.`;
  if (!b.rijen.length) {
    const tr = el('tr');
    const td = el('td', 'muted', 'Nog niemand ging op ontdekking.');
    td.colSpan = 5;
    tr.appendChild(td);
    rijen.appendChild(tr);
  }
  for (const r of [...actief, ...b.rijen.filter(x => !actief.includes(x))]) {
    const tr = el('tr', r.vandaag.length || r.binnen ? '' : 'stil');
    const naam = el('td', 'odh-naam');
    const n = el('span', '', r.naam);
    n.dataset.av = r.naam;
    naam.appendChild(n);
    if (r.binnen) naam.appendChild(el('i', 'odh-binnen', 'nu binnen'));
    tr.appendChild(naam);
    const opg = el('td', 'odh-chips');
    if (!r.vandaag.length) opg.appendChild(el('span', 'muted small', '—'));
    for (const v of r.vandaag) opg.appendChild(el('span', `odh-chip ${v.niveau}`, `${v.naam.replace(/^(De|Het) /, '')} · ${NIV[v.niveau] || ''}`));
    tr.appendChild(opg);
    for (const k of ['kristallen', 'woorden', 'weetjes']) tr.appendChild(el('td', 'odh-getal', String(r[k])));
    rijen.appendChild(tr);
  }
}

// ---------- Eigen inhoud ----------

function eigen(e) {
  $('odh-week').textContent = e.weekwoorden;
  $('odh-nw').textContent = `(${e.weetjes.length})`;
  const lijst = $('odh-weetjes');
  lijst.innerHTML = '';
  if (!e.weetjes.length) lijst.appendChild(el('li', 'muted small', 'Nog geen eigen weetjes. De ingebouwde weetjes worden gebruikt.'));
  e.weetjes.forEach((w, i) => {
    const li = el('li');
    const tekst = el('div');
    tekst.appendChild(el('b', '', w.v));
    tekst.appendChild(el('span', 'muted small', ` ${w.niveau ? NIV[w.niveau] : 'alle niveaus'} · ${w.o} · juist: ${w.a[w.j]}`));
    li.appendChild(tekst);
    const x = el('button', 'secondary odh-x', '✕');
    x.title = 'Weetje wissen';
    x.addEventListener('click', () => socket.emit('od-weetje-wis', i, res => res && res.eigen && eigen(res.eigen)));
    li.appendChild(x);
    lijst.appendChild(li);
  });
  if (document.activeElement !== $('odh-woorden')) $('odh-woorden').value = e.woordenTekst;
}

function info(t) {
  $('odh-info').textContent = t;
}

function toegevoegd(res) {
  if (!res || res.error) return info((res && res.error) || 'Dat lukte niet.');
  eigen(res.eigen);
  const n = res.eigen.nieuw || { weetjes: 0, woorden: 0 };
  info(`${n.weetjes} weetjes en ${n.woorden} woorden toegevoegd. Leerlingen krijgen ze vanaf nu eerst.`);
}

$('odh-maak').addEventListener('click', () => {
  const b = $('odh-maak');
  b.disabled = true;
  info(`${Ui.ai} bedenkt weetjes en woorden… (even geduld)`);
  socket.emit('od-ai', { leerjaar: $('odh-leerjaar').value, onderwerp: $('odh-onderwerp').value }, res => {
    b.disabled = false;
    toegevoegd(res);
  });
});

$('odh-woorden-bewaar').addEventListener('click', () => socket.emit('od-woorden', $('odh-woorden').value, res => {
  if (!res || res.error) return info((res && res.error) || 'Dat lukte niet.');
  eigen(res.eigen);
  info(`Bewaard: ${res.eigen.woorden.length} woorden.`);
}));

$('odh-wis').addEventListener('click', async () => {
  if (!await Ui.vraag('Alle eigen weetjes en woorden wissen? Wat leerlingen al vonden, blijft in hun boek.', { ja: 'Wissen', gevaar: true })) return;
  socket.emit('od-wis-alles', null, res => res && res.eigen && eigen(res.eigen));
});

// Zelf via een chatbot: prompt kopiëren, chatbot openen, en het antwoord bij terugkomst van het klembord halen.
const kopieer = text => Ui.kopieer(text);

// De prompt vooraf klaarzetten: kopiëren moet meteen bij de klik gebeuren, anders houdt de browser het tegen.
let promptVoor = '';
let promptTik = 0;
function maakPrompt() {
  clearTimeout(promptTik);
  promptTik = setTimeout(() => {
    const sleutel = $('odh-leerjaar').value + '|' + $('odh-onderwerp').value;
    socket.emit('od-prompt', { leerjaar: $('odh-leerjaar').value, onderwerp: $('odh-onderwerp').value }, res => {
      if (res && !res.error) { promptTekst = res.prompt; promptVoor = sleutel; }
    });
  }, 250);
}
$('odh-leerjaar').addEventListener('change', maakPrompt);
$('odh-onderwerp').addEventListener('input', maakPrompt);
socket.on('connect', maakPrompt);

for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    if (promptVoor !== $('odh-leerjaar').value + '|' + $('odh-onderwerp').value || !promptTekst) {
      maakPrompt();
      return info('Even geduld, de prompt wordt klaargezet. Klik zo nog eens op de knop.');
    }
    gekopieerd = promptTekst;
    // Eerst kopiëren (de pagina heeft dan nog de focus), dan het tabblad openen.
    kopieer(promptTekst);
    window.open(b.dataset.url, '_blank', 'noopener');
    info('Prompt gekopieerd! Plak hem met Ctrl+V, kopieer het antwoord (kopieerknop van het codeblok) en kom hier terug.');
  });
}

function plak(text) {
  socket.emit('od-plak', { text, leerjaar: $('odh-leerjaar').value }, toegevoegd);
}

async function klembord() {
  if (!gekopieerd || !navigator.clipboard?.readText) return;
  let text;
  try { text = await navigator.clipboard.readText(); } catch { return; }
  if (!text || text === gekopieerd || !/"(weetjes|woorden)"/.test(text)) return;
  gekopieerd = text;
  plak(text);
}
window.addEventListener('focus', klembord);
$('odh-plak-knop').addEventListener('click', () => {
  const t = $('odh-plak-tekst').value.trim();
  if (t) plak(t);
});

socket.on('connect', laad);
socket.on('od-bord', b => bord(b));
socket.on('settings', s => Ui.zetAi(s));
socket.on('avatars', map => Avatar.setAll(map));
socket.emit('avatars-get', null, map => Avatar.setAll(map));
