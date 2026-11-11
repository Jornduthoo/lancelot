// De Leescheck voor de leerkracht (Mijn klas > Lezen): aan of uit, wie las er vandaag, en per leerling de dagen naast elkaar.
// Een vakje toont de bladzijde; wat opvalt krijgt een teken. Klik een vakje of naam om de antwoorden te lezen.
const socket = io({ query: { role: 'host' } });
KlasKiezer.start(socket, document.getElementById('klaskiezer'));
const $ = id => document.getElementById(id);

const TEKEN = { stil: '💤', sprong: '⏩', kort: '✂️', zelfde: '🔁', nieuw: '📕' };
const UITLEG = { stil: 'Geen nieuwe bladzijden sinds de vorige keer', sprong: 'Heel veel bladzijden in één keer', kort: 'Heel kort antwoord', zelfde: 'Zelfde antwoord als eerder of als een klasgenoot', nieuw: 'Ander boek dan de vorige keer' };

let data = null;
let staat = null;
let open = null; // { naam } of { naam, dag }

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const kort = dag => new Date(`${dag}T12:00:00`).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const lang = dag => new Date(`${dag}T12:00:00`).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
$('lz-dagen').addEventListener('change', laad);
$('lz-volgorde').addEventListener('change', teken);

function laad() {
  socket.emit('lz-overzicht', { dagen: Number($('lz-dagen').value) }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Het overzicht laden lukte niet.');
    data = res.overzicht;
    staat = res.staat;
    teken();
    tekenStaat();
  });
}
socket.on('connect', laad);
let soon = null;
socket.on('lz-nieuw', () => { clearTimeout(soon); soon = setTimeout(laad, 600); });

function tekenStaat() {
  $('lz-aan').checked = !!staat.aan;
  $('lz-overzicht-blok').classList.toggle('lz-gedimd', !staat.aan && !data.leerlingen.some(l => l.gedaan));
  $('lz-telling').textContent = staat.aan
    ? `Vandaag lazen ${data.telling.vandaag} van de ${data.telling.totaal} leerlingen.`
    : 'De Leescheck staat uit. Leerlingen zien hem niet.';
  if (document.activeElement !== $('lz-vragen')) $('lz-vragen').value = staat.vragen.join('\n');
  $('lz-vragen-info').textContent = staat.eigen ? `(${staat.vragen.length} eigen vragen)` : `(${staat.vragen.length} standaardvragen)`;
}

function zet(arg) {
  socket.emit('lz-zet', arg, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    staat = res.staat;
    tekenStaat();
  });
}
$('lz-aan').addEventListener('change', () => zet({ aan: $('lz-aan').checked }));
$('lz-vragen-bewaar').addEventListener('click', () => zet({ vragen: $('lz-vragen').value }));
$('lz-vragen-standaard').addEventListener('click', async () => {
  if (staat.eigen && !await Ui.vraag('Je eigen vragen wissen en de standaardvragen terugzetten?')) return;
  $('lz-vragen').blur();
  zet({ vragen: '' });
});

// ---------- De tabel ----------

const opvalt = c => c && c.signalen.some(s => s !== 'nieuw');

function teken() {
  if (!data) return;
  const t = $('lz-tabel');
  t.innerHTML = '';
  const rijen = data.leerlingen.slice();
  if ($('lz-volgorde').value === 'op') rijen.sort((a, b) => (b.gemist + b.opvallend) - (a.gemist + a.opvallend) || a.naam.localeCompare(b.naam, 'nl'));
  $('lz-leeg').textContent = rijen.length ? '' : 'Nog geen leerlingen. Zet je klaslijst bij Mijn klas > Klas, of laat de leerlingen gewoon hun naam typen.';
  if (!rijen.length) return;

  const kop = el('tr');
  kop.append(el('th', 'lz-naam-kop', 'Leerling'), el('th', 'lz-boek-kop', 'Boek'));
  for (const d of data.dagen) kop.append(el('th', d === data.vandaag ? 'vandaag' : '', kort(d)));
  kop.append(el('th', '', 'Niet ingevuld'));
  const thead = el('thead');
  thead.append(kop);
  const tbody = el('tbody');
  for (const r of rijen) {
    const tr = el('tr');
    const naam = el('th', 'lz-naam');
    const nb = el('button', 'lz-naam-knop', r.naam);
    nb.type = 'button';
    nb.addEventListener('click', () => { open = { naam: r.naam }; detail(true); });
    naam.append(nb);
    tr.append(naam, el('td', 'lz-boek', r.boek || ''));
    for (const d of data.dagen) {
      const c = r.cellen[d];
      const td = el('td');
      if (c) {
        const b = el('button', `lz-cel ${opvalt(c) ? 'let' : 'ok'}`);
        b.type = 'button';
        b.append(el('b', '', String(c.blz)));
        const tekens = c.signalen.map(s => TEKEN[s]).join('');
        if (tekens) b.append(el('span', 'lz-tekens', tekens));
        b.title = [c.boek, ...c.signalen.map(s => UITLEG[s])].join('\n');
        b.addEventListener('click', () => { open = { naam: r.naam, dag: d }; detail(true); });
        td.append(b);
      } else {
        td.append(el('i', `lz-cel ${d === data.vandaag ? 'nog' : 'mis'}`, d === data.vandaag ? '·' : '–'));
      }
      tr.append(td);
    }
    tr.append(el('td', `lz-gemist${r.gemist >= 2 ? ' veel' : ''}`, r.gemist ? String(r.gemist) : ''));
    tbody.append(tr);
  }
  t.append(thead, tbody);
  detail();
}

// De antwoorden van één leerling (of één dag), om echt te lezen.
function detail(scroll = false) {
  const box = $('lz-detail');
  const r = open && data && data.leerlingen.find(l => l.naam === open.naam);
  box.classList.toggle('hidden', !r);
  if (!r) return;
  box.innerHTML = '';
  const kop = el('div', 'lz-detail-kop');
  kop.append(el('h4', '', r.naam));
  const sluit = el('button', 'secondary', 'Sluiten');
  sluit.type = 'button';
  sluit.addEventListener('click', () => { open = null; detail(); });
  kop.append(sluit);
  box.append(kop);
  const dagen = (open.dag ? [open.dag] : data.dagen.slice().reverse()).filter(d => r.cellen[d]);
  if (!dagen.length) box.append(el('p', 'muted', 'In deze periode nog niets ingevuld.'));
  for (const d of dagen) {
    const c = r.cellen[d];
    const k = el('div', `lz-antw${opvalt(c) ? ' let' : ''}`);
    k.append(el('p', 'lz-antw-kop', `${lang(d)} · ${c.boek} · bladzijde ${c.blz}`));
    k.append(el('p', 'lz-antw-vraag', c.vraag));
    k.append(el('p', 'lz-antw-tekst', c.antwoord));
    if (c.signalen.length) k.append(el('p', 'lz-antw-sig', c.signalen.map(s => `${TEKEN[s]} ${UITLEG[s]}`).join(' · ')));
    box.append(k);
  }
  if (open.dag && Object.keys(r.cellen).length > 1) {
    const alles = el('button', 'secondary', 'Alle antwoorden van deze periode');
    alles.type = 'button';
    alles.addEventListener('click', () => { open = { naam: r.naam }; detail(); });
    box.append(alles);
  }
  if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
