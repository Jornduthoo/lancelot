// Woordkaarten (In Beeld) voor de leerkracht: kaarten ophalen, kiezen en aanbrengen op het bord.
// Aanbrengen: eerst het beeld stukje per stukje (de klas raadt), dan het woord, de uitleg en de voorbeeldzin, voorgelezen.
// De gekozen kaarten worden ook woorden van de week (Runenraadsel, Hofschilder), een quiz of iets voor LANcelot Junior.
// De kaarten zelf blijven Nederlands (data-geen-vertaling): ze komen uit In Beeld, voor Vlaanderen.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const JUNIOR = new URLSearchParams(location.search).has('junior');
const LJ = ['JK', 'K2', 'K3', '1', '2', '3', '4', '5', '6'];
const LJ_KORT = { JK: 'JK', K2: 'K2', K3: 'K3', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };

let view = { kaarten: [], sets: [], week: [], melden: true };
const gekozen = new Set();
const woord = k => (k.lidwoord ? `${k.lidwoord} ${k.woord}` : k.woord);

const terug = () => { location.href = JUNIOR ? '/junior-leerkracht' : '/host'; };
$('brand').addEventListener('click', terug);
$('to-home').addEventListener('click', () => (bord ? stopBord() : terug()));

// Onthouden welk leerjaar je bekijkt (alleen een gemak op dit toestel).
const bewaard = (() => { try { return localStorage.getItem(`ib-lj${JUNIOR ? '-jr' : ''}`); } catch { return null; } })();

function laad() {
  socket.emit('ib-view', null, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'De kaarten laden lukte niet.');
    zet(res.view, true);
  });
}
function zet(v, eerst) {
  view = v;
  for (const nr of [...gekozen]) if (!view.kaarten.some(k => k.nr === nr)) gekozen.delete(nr);
  if (eerst && !$('ib-lj').dataset.gezet) {
    $('ib-lj').dataset.gezet = '1';
    $('ib-lj').value = bewaard ?? (JUNIOR ? '' : view.leerjaar || '');
    $('ib-bord-lj').value = LJ.includes(bewaard) ? bewaard : JUNIOR ? 'K3' : (view.leerjaar || '6');
  }
  $('ib-melden').checked = view.melden;
  if (!view.kaarten.length) $('ib-ophalen').open = true;
  tekenSets();
  teken();
}
socket.on('connect', laad);
socket.on('ib-view', v => zet(v));

// ---------- Ophalen ----------

function online() {
  socket.emit('ib-online', null, res => {
    const box = $('ib-online');
    const voorbeeld = `<button type="button" class="secondary" data-haal="voorbeeld">Voorbeeldkaarten (16) uitproberen</button>`;
    if (!res || res.error) {
      box.innerHTML = `<p class="muted small">${esc((res && res.error) || 'In Beeld is niet bereikbaar.')}</p><div class="ib-knoppen">${voorbeeld}</div>`;
    } else {
      const sets = res.sets.filter(s => !JUNIOR || !s.leerjaren.length || s.leerjaren.some(l => ['JK', 'K2', 'K3', '1', '2', '3'].includes(l)));
      box.innerHTML = `<div class="ib-knoppen">${sets.map(s => `<button type="button" class="secondary" data-haal="${esc(s.id)}">${s.soort === 'project' ? '📁 ' : ''}${esc(s.titel)}${s.aantal ? ` (${s.aantal})` : ''}</button>`).join('')}${voorbeeld}</div>`
        + (sets.length ? '' : '<p class="muted small">Er staan nog geen kaarten online. Probeer intussen de voorbeeldkaarten.</p>');
    }
    box.querySelectorAll('[data-haal]').forEach(b => b.addEventListener('click', () => haal(b)));
  });
}
function haal(knop) {
  knop.disabled = true;
  const oud = knop.textContent;
  knop.textContent = 'Ophalen…';
  socket.emit('ib-haal', { id: knop.dataset.haal }, res => {
    knop.disabled = false;
    knop.textContent = oud;
    if (!res || res.error) return Ui.melding((res && res.error) || 'Ophalen lukte niet.');
    zet(res.view);
    Ui.melding(`${res.titel}: ${res.aantal} kaarten staan nu op deze pc.${res.zonderBeeld ? ` ${res.zonderBeeld} zonder beeld.` : ''}`);
  });
}
$('ib-ophalen').addEventListener('toggle', () => { if ($('ib-ophalen').open && !$('ib-online').dataset.klaar) { $('ib-online').dataset.klaar = '1'; online(); } });

function tekenSets() {
  const box = $('ib-sets');
  if (!view.sets.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<p class="muted small">Op deze pc:</p>${view.sets.map(s => `<span class="ib-set" data-geen-vertaling>${esc(s.titel)} <button type="button" class="ib-set-weg" data-weg="${esc(s.id)}" title="Weghalen van deze pc" aria-label="Weghalen">✕</button></span>`).join('')}`;
  box.querySelectorAll('[data-weg]').forEach(b => b.addEventListener('click', async () => {
    if (!(await Ui.vraag('Deze kaarten weghalen van deze pc? Je kan ze later opnieuw ophalen.'))) return;
    socket.emit('ib-wis-set', { id: b.dataset.weg }, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
      zet(res.view);
    });
  }));
}
$('ib-melden').addEventListener('change', () => socket.emit('ib-melden', { aan: $('ib-melden').checked }, res => res && res.view && (view = res.view)));

// ---------- De kaarten ----------

function zichtbaar() {
  const lj = $('ib-lj').value;
  const q = $('ib-zoek').value.trim().toLowerCase();
  const week = new Set(view.week);
  return view.kaarten.filter(k => (!lj || !k.leerjaren.length || k.leerjaren.includes(lj))
    && (!JUNIOR || lj || !k.leerjaren.length || k.leerjaren.some(l => ['JK', 'K2', 'K3', '1', '2', '3'].includes(l)))
    && (!q || woord(k).toLowerCase().includes(q) || k.nr.toLowerCase().includes(q))
    && (!$('ib-alleen-week').checked || week.has(k.nr))
    && (!$('ib-nieuw').checked || !k.aangebracht.length));
}
function teken() {
  const lijst = zichtbaar();
  const week = new Set(view.week);
  $('ib-leeg').classList.toggle('hidden', view.kaarten.length > 0);
  $('ib-grid').innerHTML = lijst.map(k => `<button type="button" class="ib-kaart ${gekozen.has(k.nr) ? 'on' : ''}" data-nr="${esc(k.nr)}" aria-pressed="${gekozen.has(k.nr)}">
      <span class="ib-kaart-beeld">${k.beeld ? `<img src="${esc(k.beeld)}" alt="" loading="lazy">` : '<span class="ib-geen-beeld">?</span>'}</span>
      <b>${esc(woord(k))}</b>
      <span class="ib-kaart-info"><span class="ib-kaart-nr">${esc(k.nr)}</span>${k.leerjaren.map(l => `<i class="ib-lj ${k.aangebracht.includes(l) ? 'gedaan' : ''}" title="${k.aangebracht.includes(l) ? 'aangebracht' : ''}">${LJ_KORT[l] || esc(l)}</i>`).join('')}${week.has(k.nr) ? '<i class="ib-weekteken" title="woord van de week">ᚱ</i>' : ''}</span>
    </button>`).join('') || (view.kaarten.length ? '<p class="muted">Geen kaarten met deze keuze.</p>' : '');
  $('ib-grid').querySelectorAll('[data-nr]').forEach(b => b.addEventListener('click', () => {
    const nr = b.dataset.nr;
    gekozen.has(nr) ? gekozen.delete(nr) : gekozen.add(nr);
    b.classList.toggle('on', gekozen.has(nr));
    b.setAttribute('aria-pressed', gekozen.has(nr));
    balk();
  }));
  balk();
}
function balk() {
  $('ib-actiebalk').classList.toggle('hidden', !view.kaarten.length);
  const n = gekozen.size;
  $('ib-telling').textContent = n ? `${n} gekozen` : 'Tik op kaarten om ze te kiezen.';
  for (const id of ['ib-aanbreng', 'ib-week', 'ib-quiz', 'ib-jr-woorden', 'ib-jr-reeks', 'ib-geen']) $(id).disabled = !n;
}
for (const id of ['ib-lj', 'ib-alleen-week', 'ib-nieuw']) $(id).addEventListener('change', () => {
  if (id === 'ib-lj') {
    try { localStorage.setItem(`ib-lj${JUNIOR ? '-jr' : ''}`, $('ib-lj').value); } catch {}
    if ($('ib-lj').value) $('ib-bord-lj').value = $('ib-lj').value;
  }
  teken();
});
$('ib-zoek').addEventListener('input', teken);
$('ib-alles').addEventListener('click', () => { zichtbaar().forEach(k => gekozen.add(k.nr)); teken(); });
$('ib-geen').addEventListener('click', () => { gekozen.clear(); teken(); });
// In de volgorde van de lijst, niet in de volgorde van het aanklikken.
const keuze = () => view.kaarten.filter(k => gekozen.has(k.nr)).map(k => k.nr);

$('ib-week').addEventListener('click', () => {
  socket.emit('ib-runen', { nrs: keuze() }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    const over = res.overgeslagen.length ? ` Niet in het Runenraadsel (daar passen alleen woorden van 4 tot 7 letters): ${res.overgeslagen.slice(0, 8).join(', ')}.` : '';
    Ui.melding(`${res.erbij} woorden staan erbij in het Runenraadsel. Alle gekozen kaarten zijn nu de kaarten van de week, ook voor De Hofschilder.${over}`);
    laad();
  });
});
$('ib-quiz').addEventListener('click', () => {
  socket.emit('ib-quiz', { nrs: keuze(), leerjaar: $('ib-bord-lj').value }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    Ui.melding(`De quiz "${res.title}" staat klaar met ${res.aantal} vragen, in de map In Beeld. Speel hem in elk spel bij Spelen, of geef hem als taak.`);
  });
});
$('ib-jr-woorden').addEventListener('click', () => {
  socket.emit('ib-jr-woorden', { nrs: keuze() }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    Ui.melding(`LANcelot Junior: ${res.woorden.length} woorden van de week voor het raadsel van vandaag.`);
  });
});
$('ib-jr-reeks').addEventListener('click', () => {
  socket.emit('ib-jr-reeks', { nrs: keuze() }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    Ui.melding('LANcelot Junior: de prentenreeks "Waar is ...?" staat bij je reeksen, in het mapje In Beeld. Speel hem bij Spelen, onder Mijn vragen.');
  });
});

// ---------- Aanbrengen op het bord ----------

const KOLOMMEN = 4, RIJEN = 3;
let bord = null; // { kaarten, i, open: Set, getoond }

$('ib-aanbreng').addEventListener('click', () => {
  const kaarten = view.kaarten.filter(k => gekozen.has(k.nr));
  if (!kaarten.length) return;
  bord = { kaarten, i: 0 };
  $('lijst').classList.add('hidden');
  $('play').classList.remove('hidden');
  try { document.documentElement.requestFullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen().catch(() => {}); } catch {}
  toonKaart();
});
function stopBord() {
  Voorlees.stop();
  bord = null;
  $('play').classList.add('hidden');
  $('lijst').classList.remove('hidden');
  try { document.fullscreenElement && document.exitFullscreen(); } catch {}
  laad();
}
$('ib-stop').addEventListener('click', stopBord);

function toonKaart() {
  const k = bord.kaarten[bord.i];
  Voorlees.stop();
  bord.open = new Set();
  bord.getoond = false;
  $('ib-teller').textContent = `Kaart ${bord.i + 1} van ${bord.kaarten.length}`;
  $('ib-img').src = k.beeld || '';
  $('ib-beeld').classList.toggle('zonder', !k.beeld);
  $('ib-tegels').innerHTML = Array.from({ length: KOLOMMEN * RIJEN }, (_, i) => `<span class="ib-tegel" data-t="${i}">${'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i]}</span>`).join('');
  $('ib-tegels').querySelectorAll('.ib-tegel').forEach(t => t.addEventListener('click', () => open(Number(t.dataset.t))));
  $('ib-tekst').classList.add('hidden');
  $('play').classList.remove('getoond');
  $('ib-raad').classList.toggle('hidden', !k.beeld);
  $('ib-stukje').classList.toggle('hidden', !k.beeld);
  $('ib-heel').classList.toggle('hidden', !k.beeld);
  $('ib-toon').classList.remove('hidden');
  $('ib-lees').classList.add('hidden');
  $('ib-volgende').classList.add('hidden');
  $('ib-volgende').textContent = bord.i + 1 < bord.kaarten.length ? 'Volgende kaart' : 'Klaar';
  $('ib-nr').textContent = k.nr;
  $('ib-woord').textContent = woord(k);
  $('ib-uitleg').textContent = k.uitleg;
  $('ib-zin').textContent = k.zin ? `“${k.zin}”` : '';
  const verwant = (k.verwant || []).map(nr => view.kaarten.find(x => x.nr === nr)).filter(Boolean);
  $('ib-verwant').textContent = verwant.length ? `Hoort bij: ${verwant.map(woord).join(', ')}` : '';
  // Zonder beeld: meteen het woord.
  if (!k.beeld) toonWoord();
  else open(Math.floor(Math.random() * KOLOMMEN * RIJEN));
}
function open(t) {
  if (!bord || bord.open.has(t)) return;
  bord.open.add(t);
  const el = $('ib-tegels').querySelector(`[data-t="${t}"]`);
  if (el) el.classList.add('weg');
  if (bord.open.size >= KOLOMMEN * RIJEN) { $('ib-stukje').classList.add('hidden'); $('ib-heel').classList.add('hidden'); }
}
// Een willekeurig stukje dat nog dicht is.
$('ib-stukje').addEventListener('click', () => {
  const dicht = Array.from({ length: KOLOMMEN * RIJEN }, (_, i) => i).filter(i => !bord.open.has(i));
  if (dicht.length) open(dicht[Math.floor(Math.random() * dicht.length)]);
});
$('ib-heel').addEventListener('click', () => { for (let i = 0; i < KOLOMMEN * RIJEN; i++) open(i); });

function voorlezen() {
  const k = bord.kaarten[bord.i];
  Voorlees.speak([woord(k), k.uitleg, k.zin].filter(Boolean).join('\n'), $('ib-lees'));
}
function toonWoord() {
  if (!bord) return;
  for (let i = 0; i < KOLOMMEN * RIJEN; i++) open(i);
  bord.getoond = true;
  $('play').classList.add('getoond');
  $('ib-tekst').classList.remove('hidden');
  $('ib-raad').classList.add('hidden');
  $('ib-toon').classList.add('hidden');
  $('ib-lees').classList.toggle('hidden', !Voorlees.ok);
  $('ib-volgende').classList.remove('hidden');
  voorlezen();
  // Meteen onthouden (en eventueel melden): de klas zag de kaart.
  const k = bord.kaarten[bord.i];
  socket.emit('ib-aangebracht', { nr: k.nr, leerjaar: $('ib-bord-lj').value }, res => {
    if (res && res.aangebracht) k.aangebracht = res.aangebracht;
  });
}
$('ib-toon').addEventListener('click', toonWoord);
$('ib-lees').addEventListener('click', voorlezen);
$('ib-volgende').addEventListener('click', () => {
  if (bord.i + 1 >= bord.kaarten.length) return stopBord();
  bord.i++;
  toonKaart();
});
$('ib-bord-lj').addEventListener('change', () => { try { localStorage.setItem(`ib-lj${JUNIOR ? '-jr' : ''}`, $('ib-bord-lj').value); } catch {} });
document.addEventListener('keydown', e => {
  if (!bord || e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowRight' && bord.getoond) $('ib-volgende').click();
  if (e.key === 'Escape') stopBord();
});
