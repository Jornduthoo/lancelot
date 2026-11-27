// Namen › Chromebooks: welke sites staan open, terug naar LANcelot, vastzetten, kijk naar het bord, geschiedenis.
// De gegevens komen van de LANcelot-extensie op de Chromebooks (src/chromebooks.js).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const klein = new URLSearchParams(location.search).has('klein');
if (klein) document.body.classList.add('cb-klein');
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = '/host'; });

let data = { instellingen: {}, toestellen: [], namen: [], pauze: {} };
const fout = r => { if (r && r.error) { Ui.melding(r.error); return true; } return false; };
const tijd = ms => new Date(ms).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
const duur = (van, tot) => { const m = Math.round((tot - van) / 60000); return m < 1 ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} u ${m % 60} min`; };

// ---------- Schakelaars ----------
function schakel(id, aan) { $(id).setAttribute('aria-pressed', aan ? 'true' : 'false'); }
function tekenSchakels() {
  const s = data.instellingen || {};
  schakel('cb-tonen', s.tonen);
  schakel('cb-vast', s.vast);
  schakel('cb-bord', data.pauze && data.pauze.aan);
  $('cb-gesch-aan').checked = !!s.geschiedenis;
  if (s.dagen) $('cb-dagen').value = String(s.dagen);
  if (document.activeElement !== $('cb-lk')) $('cb-lk').value = (s.leerkrachten || []).join(', ');
}
const zet = w => socket.emit('cb-zet', w, r => { if (!fout(r)) { data.instellingen = r; tekenSchakels(); } });
$('cb-tonen').addEventListener('click', () => zet({ tonen: !data.instellingen.tonen }));
$('cb-vast').addEventListener('click', () => zet({ vast: !data.instellingen.vast }));
// "Kijk naar het bord" is de pauzeknop van LANcelot: ook de leerlingschermen in LANcelot gaan op slot.
$('cb-bord').addEventListener('click', () => {
  const aan = !(data.pauze && data.pauze.aan);
  socket.emit('pauze-zet', { aan, tekst: '' });
  data.pauze = { aan };
  tekenSchakels();
});
socket.on('pauze', p => { data.pauze = p || {}; tekenSchakels(); });
socket.on('cb-instellingen', s => { data.instellingen = s; tekenSchakels(); });
$('cb-gesch-aan').addEventListener('change', e => zet({ geschiedenis: e.target.checked }));
$('cb-dagen').addEventListener('change', e => zet({ dagen: Number(e.target.value) }));
$('cb-lk-form').addEventListener('submit', e => {
  e.preventDefault();
  socket.emit('cb-zet', { leerkrachten: $('cb-lk').value }, r => { if (!fout(r)) { data.instellingen = r; tekenSchakels(); Ui.melding('Bewaard.'); } });
});

$('cb-terug').addEventListener('click', () => socket.emit('cb-terug', {}, r => { if (!fout(r)) Ui.melding('Alle Chromebooks gaan naar LANcelot.'); }));
$('cb-link').addEventListener('submit', e => {
  e.preventDefault();
  const url = $('cb-url').value.trim();
  if (!url) return;
  socket.emit('cb-open', { url }, r => { if (!fout(r)) { $('cb-url').value = ''; Ui.melding('De link gaat open op alle Chromebooks.'); } });
});

// ---------- Nu ----------
function kaart(t) {
  const k = document.createElement('article');
  k.className = 'cb-kaart' + (t.elders ? ' elders' : '');
  const kop = document.createElement('div');
  kop.className = 'cb-kaart-kop';
  const naam = document.createElement('strong');
  naam.textContent = t.naam || t.email.split('@')[0] || 'Chromebook';
  kop.append(naam);
  // Nog niet (zeker) gekoppeld: kies de leerling.
  if (!t.gekoppeld) {
    const sel = document.createElement('select');
    sel.title = 'Welke leerling is dit?';
    sel.innerHTML = '<option value="">Wie is dit?</option>';
    for (const n of data.namen) { const o = document.createElement('option'); o.value = n; o.textContent = n; if (n === t.naam) o.selected = true; sel.append(o); }
    sel.addEventListener('change', () => socket.emit('cb-koppel', { email: t.email, naam: sel.value }, r => { if (!fout(r)) laad(); }));
    kop.append(sel);
  }
  const mail = document.createElement('small');
  mail.className = 'cb-mail';
  mail.textContent = t.email || '';
  const waar = document.createElement('div');
  waar.className = 'cb-waar';
  waar.textContent = !t.actief ? '💤 Niet actief' : t.actief.soort === 'lancelot' ? '✅ In LANcelot' : t.actief.soort === 'web' ? `🌐 ${t.actief.host}` : '🗂 Nieuw tabblad';
  const ul = document.createElement('ul');
  for (const tab of t.tabs) {
    const li = document.createElement('li');
    if (tab.actief) li.className = 'actief';
    const s = document.createElement('span');
    s.textContent = tab.soort === 'lancelot' ? 'LANcelot' : tab.soort === 'web' ? `${tab.host} · ${tab.titel}` : (tab.titel || 'Nieuw tabblad');
    s.title = tab.titel;
    li.append(s);
    if (tab.soort !== 'lancelot') {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'secondary';
      x.textContent = '✕';
      x.title = 'Dit tabblad sluiten';
      x.addEventListener('click', () => socket.emit('cb-sluit', { sid: t.sid, tab: tab.id }, r => { if (!fout(r)) setTimeout(laad, 800); }));
      li.append(x);
    }
    ul.append(li);
  }
  const knoppen = document.createElement('div');
  knoppen.className = 'cb-kaart-knoppen';
  const terug = document.createElement('button');
  terug.type = 'button';
  terug.className = 'secondary';
  terug.textContent = '↩ Naar LANcelot';
  terug.addEventListener('click', () => socket.emit('cb-terug', { sid: t.sid }, fout));
  knoppen.append(terug);
  k.append(kop, mail, waar, ul, knoppen);
  return k;
}
function tekenNu() {
  const l = data.toestellen || [];
  $('cb-leeg').classList.toggle('hidden', l.length > 0);
  // Wie op een andere site zit, eerst.
  const rij = l.slice().sort((a, b) => (b.elders - a.elders) || (a.naam || a.email).localeCompare(b.naam || b.email, 'nl'));
  $('cb-raster').replaceChildren(...rij.map(kaart));
}
function laad() {
  socket.emit('cb-lijst', {}, r => {
    if (!r || fout(r)) return;
    data = r;
    tekenSchakels();
    tekenNu();
    $('cb-beleid').textContent = JSON.stringify({ server: { Value: r.adres } });
    const wie = $('cb-wie');
    const gekozen = wie.value;
    wie.innerHTML = '<option value="">Iedereen</option>';
    for (const n of r.namen) { const o = document.createElement('option'); o.value = n; o.textContent = n; wie.append(o); }
    wie.value = gekozen;
  });
}
socket.on('connect', laad);
socket.on('cb-bord', () => { if (tab === 'nu') laad(); });
setInterval(() => { if (tab === 'nu' && !document.hidden) laad(); }, 5000);

// ---------- Geschiedenis ----------
function laadDagen() {
  socket.emit('cb-dagen', {}, dagen => {
    if (!Array.isArray(dagen)) return;
    const sel = $('cb-dag');
    const gekozen = sel.value;
    sel.innerHTML = '';
    for (const d of dagen) {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = new Date(d + 'T12:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
      sel.append(o);
    }
    if (gekozen && dagen.includes(gekozen)) sel.value = gekozen;
    laadGeschiedenis();
  });
}
function laadGeschiedenis() {
  const datum = $('cb-dag').value;
  if (!datum) { $('cb-gesch').innerHTML = ''; $('cb-gesch-leeg').textContent = 'Nog geen geschiedenis.'; return; }
  socket.emit('cb-geschiedenis', { datum, wie: $('cb-wie').value }, r => {
    if (!r || fout(r)) return;
    const zonder = $('cb-zonder-lancelot').checked;
    const rij = r.bezoeken.filter(b => !zonder || b.host !== 'LANcelot');
    $('cb-gesch').replaceChildren(...rij.map(b => {
      const tr = document.createElement('tr');
      if (b.host === 'LANcelot') tr.className = 'lancelot';
      const d = duur(b.van, b.tot);
      for (const tekst of [`${tijd(b.van)}${d ? ` · ${d}` : ''}`, b.naam, b.host, b.titel]) {
        const td = document.createElement('td');
        td.textContent = tekst;
        tr.append(td);
      }
      return tr;
    }));
    $('cb-gesch-leeg').textContent = rij.length ? '' : 'Niets op deze dag.';
  });
}
$('cb-dag').addEventListener('change', laadGeschiedenis);
$('cb-wie').addEventListener('change', laadGeschiedenis);
$('cb-zonder-lancelot').addEventListener('change', laadGeschiedenis);
$('cb-wis').addEventListener('click', async () => {
  if (!await Ui.vraag('De hele surfgeschiedenis wissen? Dat kan niet ongedaan gemaakt worden.')) return;
  socket.emit('cb-wis', {}, r => { if (!fout(r)) laadDagen(); });
});

// ---------- Installeren ----------
$('cb-kopieer').addEventListener('click', () => Ui.kopieer ? Ui.kopieer($('cb-beleid').textContent) : navigator.clipboard.writeText($('cb-beleid').textContent));

// ---------- Tabbladen ----------
let tab = 'nu';
function toonTab(t) {
  tab = t;
  for (const b of document.querySelectorAll('.cb-tabs button')) b.classList.toggle('on', b.dataset.tab === t);
  for (const s of document.querySelectorAll('section.cb-tab')) s.classList.toggle('hidden', s.dataset.tab !== t);
  if (t === 'geschiedenis') laadDagen();
  if (t === 'nu') laad();
  if (!klein) history.replaceState(null, '', t === 'nu' ? location.pathname : `#${t}`);
}
for (const b of document.querySelectorAll('.cb-tabs button')) b.addEventListener('click', () => toonTab(b.dataset.tab));
if (['geschiedenis', 'installeren'].includes(location.hash.slice(1))) toonTab(location.hash.slice(1));
