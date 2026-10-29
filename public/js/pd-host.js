// De Postduif: brieven voor thuis maken. Links wat in elke brief staat (klasnieuws, foto's, wat erin staat),
// in het midden de leerlingen, rechts een persoonlijk woordje en de brief zoals hij op papier komt.
// Alles bewaart vanzelf. Het tekenen van een brief staat in pd-brief.js (ook gebruikt door postduif-print.html).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const P = window.Postduif;
const pd = { lijst: [], data: null, lid: '' };

const TOON = [
  ['toetsen', '📝 De toetsen met punten'],
  ['verbeterd', '🔍 De verbeterde toets erachter'],
  ['gemiddelde', '📊 Het klasgemiddelde'],
  ['doelen', '⭐ Wat lukt en wat nog oefenen'],
  ['oefenen', '🎮 Hoeveel er geoefend werd'],
  ['eer', '🏰 Eer en complimentjes'],
  ['nieuws', '📣 Het klasnieuws'],
  ['strookje', '✂ Strookje om te tekenen'],
];
// De twee soorten brieven: enkel de toetsen, of alles. "Zelf kiezen" zet de vinkjes apart.
const SOORTEN = {
  toetsen: { toetsen: true, verbeterd: true, gemiddelde: true, doelen: false, oefenen: false, eer: false, nieuws: false, strookje: true },
  alles: { toetsen: true, verbeterd: true, gemiddelde: true, doelen: true, oefenen: true, eer: true, nieuws: true, strookje: true },
};
const ZINNEN = [
  '{naam} werkte heel goed mee. Proficiat!',
  '{naam} is een fijne klasgenoot die graag helpt.',
  '{naam} zette zich goed in voor de toetsen.',
  '{naam} mag nog wat meer durven vragen als iets niet lukt.',
  'Thuis even de maaltafels oefenen helpt echt.',
  'Elke dag een kwartiertje samen lezen helpt voor alle vakken.',
];

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host#kronieken'; });
for (const d of document.querySelectorAll('dialog')) {
  d.querySelectorAll('[data-sluit]').forEach(b => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
}

// ---------- Bewaren (vanzelf, kort na elke wijziging) ----------

let timer = null;
function bewaar() {
  clearTimeout(timer);
  $('pd-bewaard').textContent = 'Bewaren…';
  timer = setTimeout(() => {
    timer = null;
    socket.emit('pd-bewaar', pd.data.brief, res => {
      if (res.error) { $('pd-bewaard').textContent = ''; Ui.melding(res.error); return; }
      pd.data.brief.gewijzigd = res.gewijzigd;
      $('pd-bewaard').textContent = '✓ Bewaard';
    });
  }, 600);
}

// ---------- Mijn brieven ----------

function start() {
  socket.emit('pd-lijst', null, res => {
    if (res.error) return Ui.melding(res.error);
    pd.lijst = res.lijst;
    const id = new URLSearchParams(location.search).get('id');
    if (id && pd.lijst.some(b => b.id === id) && !pd.data) laad(id);
    else toonStart();
  });
}

function toonStart() {
  $('pd-start').classList.remove('hidden');
  $('pd-brief').classList.add('hidden');
  const box = $('pd-brieven');
  box.replaceChildren();
  const nieuw = el('button', 'pd-kaart pd-kaart-nieuw');
  nieuw.innerHTML = '<span class="pd-groot">＋</span><strong>Nieuwe brief</strong><span class="muted small">Voor de voorbije week. Je kan de periode nog aanpassen.</span>';
  nieuw.addEventListener('click', () => socket.emit('pd-nieuw', {}, res => (res.error ? Ui.melding(res.error) : open(res))));
  box.append(nieuw);
  for (const b of pd.lijst) {
    const k = el('div', 'pd-kaart');
    const open_ = el('button', 'pd-kaart-open');
    open_.innerHTML = `<span class="pd-groot">✉️</span><strong>${P.esc(b.titel)}</strong><span class="muted small">${P.kort(b.van)} – ${P.kort(b.tot)}</span>`;
    open_.addEventListener('click', () => laad(b.id));
    const weg = el('button', 'secondary icon pd-kaart-weg');
    weg.textContent = '🗑';
    weg.title = 'Brief verwijderen';
    weg.addEventListener('click', async () => {
      if (!await Ui.vraag(`"${b.titel}" verwijderen? De toetsen en punten zelf blijven.`, { ja: 'Verwijderen', gevaar: true })) return;
      socket.emit('pd-weg', { id: b.id }, res => (res.error ? Ui.melding(res.error) : start()));
    });
    k.append(open_, weg);
    box.append(k);
  }
}

// ---------- Eén brief ----------

function laad(id) {
  socket.emit('pd-laad', { id }, res => (res.error ? Ui.melding(res.error) : open(res)));
}

function open(res) {
  pd.data = res;
  if (!res.leerlingen.some(l => l.id === pd.lid)) pd.lid = res.leerlingen[0] ? res.leerlingen[0].id : '';
  $('pd-start').classList.add('hidden');
  $('pd-brief').classList.remove('hidden');
  const b = res.brief;
  $('pd-titel').value = b.titel;
  $('pd-van').value = b.van;
  $('pd-tot').value = b.tot;
  $('pd-nieuws').value = b.nieuws;
  $('pd-afzender').value = b.afzender;
  $('pd-bewaard').textContent = '';
  history.replaceState(null, '', `/postduif?id=${b.id}`);
  tekenOpties();
  tekenFotos();
  tekenNamen();
  tekenLeerling();
}

$('pd-terug').addEventListener('click', () => { pd.data = null; history.replaceState(null, '', '/postduif'); start(); });
$('pd-titel').addEventListener('input', () => { pd.data.brief.titel = $('pd-titel').value; bewaar(); });
$('pd-afzender').addEventListener('input', () => { pd.data.brief.afzender = $('pd-afzender').value; bewaar(); voorbeeld(); });
$('pd-nieuws').addEventListener('input', () => { pd.data.brief.nieuws = $('pd-nieuws').value; bewaar(); voorbeeld(); });
// Een andere periode: bewaren en opnieuw laden, zodat de toetsen en het oefenen van die periode erin komen.
for (const k of ['van', 'tot']) {
  $(`pd-${k}`).addEventListener('change', () => {
    pd.data.brief[k] = $(`pd-${k}`).value;
    clearTimeout(timer);
    timer = null;
    socket.emit('pd-bewaar', pd.data.brief, res => (res.error ? Ui.melding(res.error) : laad(pd.data.brief.id)));
  });
}

for (const knop of $('pd-soort').querySelectorAll('button')) {
  knop.addEventListener('click', () => {
    pd.data.brief.toon = { ...SOORTEN[knop.dataset.soort] };
    tekenOpties();
    bewaar();
    voorbeeld();
  });
}

function tekenOpties() {
  const toon = pd.data.brief.toon;
  const soort = Object.keys(SOORTEN).find(k => Object.entries(SOORTEN[k]).every(([x, v]) => toon[x] === v)) || '';
  for (const knop of $('pd-soort').querySelectorAll('button')) knop.classList.toggle('on', knop.dataset.soort === soort);
  $('pd-nieuws-blok').classList.toggle('hidden', !toon.nieuws);
  const box = $('pd-toon');
  box.replaceChildren();
  for (const [k, label] of TOON) {
    const l = el('label', 'pd-vink');
    const c = el('input');
    c.type = 'checkbox';
    c.checked = !!pd.data.brief.toon[k];
    c.addEventListener('change', () => { pd.data.brief.toon[k] = c.checked; tekenOpties(); bewaar(); voorbeeld(); });
    l.append(c, document.createTextNode(label));
    box.append(l);
  }
}

function tekenFotos() {
  const box = $('pd-fotos');
  box.replaceChildren();
  pd.data.brief.fotos.forEach((src, i) => {
    const f = el('div', 'pd-foto');
    const img = el('img');
    img.src = src;
    img.alt = '';
    const weg = el('button', 'secondary', '✕');
    weg.title = 'Foto weghalen';
    weg.addEventListener('click', () => { pd.data.brief.fotos.splice(i, 1); tekenFotos(); bewaar(); voorbeeld(); });
    f.append(img, weg);
    box.append(f);
  });
  $('pd-foto-knop').classList.toggle('hidden', pd.data.brief.fotos.length >= 3);
}

// Een foto klein maken (webp, hooguit 1000 px breed), zodat de brief licht blijft.
function verklein(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      let q = 0.75;
      let url = c.toDataURL('image/webp', q);
      while (url.length > 480e3 && q > 0.3) url = c.toDataURL('image/webp', (q -= 0.15));
      if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', 0.7);
      resolve(url);
    };
    img.onerror = () => reject(new Error('Dat bestand is geen foto.'));
    img.src = URL.createObjectURL(file);
  });
}
$('pd-foto').addEventListener('change', async () => {
  const file = $('pd-foto').files[0];
  $('pd-foto').value = '';
  if (!file) return;
  try {
    pd.data.brief.fotos.push(await verklein(file));
    tekenFotos();
    bewaar();
    voorbeeld();
  } catch (err) {
    Ui.melding(err.message);
  }
});

function tekenNamen() {
  const box = $('pd-namen');
  box.replaceChildren();
  if (!pd.data.leerlingen.length) {
    box.innerHTML = '<p class="muted small pd-leeg">Vul eerst je klaslijst in bij Mijn klas.</p>';
    return;
  }
  for (const l of pd.data.leerlingen) {
    const b = el('button');
    b.classList.toggle('on', l.id === pd.lid);
    b.classList.toggle('klaar', !!pd.data.brief.woordje[l.id]);
    b.innerHTML = `${P.esc(l.naam)}<span>${l.toetsen.length ? `${l.toetsen.length} toets${l.toetsen.length === 1 ? '' : 'en'}` : ''}</span>`;
    b.addEventListener('click', () => { pd.lid = l.id; tekenNamen(); tekenLeerling(); });
    box.append(b);
  }
}

function tekenLeerling() {
  const l = pd.data.leerlingen.find(x => x.id === pd.lid);
  for (const id of ['pd-woordje', 'pd-kopieer', 'pd-print-een']) $(id).disabled = !l;
  $('pd-woord-kop').textContent = l ? `Een persoonlijk woordje voor ${l.naam}` : 'Een persoonlijk woordje';
  $('pd-woordje').value = l ? pd.data.brief.woordje[l.id] || '' : '';
  const zinnen = $('pd-zinnen');
  zinnen.replaceChildren();
  for (const z of ZINNEN) {
    const b = el('button', 'secondary', z.replace('{naam}', '…'));
    b.title = 'Voeg dit zinnetje toe';
    b.addEventListener('click', () => {
      const nu = $('pd-woordje').value.trim();
      $('pd-woordje').value = nu ? `${nu} ${z}` : z;
      $('pd-woordje').dispatchEvent(new Event('input'));
    });
    zinnen.append(b);
  }
  voorbeeld();
}
$('pd-woordje').addEventListener('input', () => {
  const t = $('pd-woordje').value;
  if (t.trim()) pd.data.brief.woordje[pd.lid] = t;
  else delete pd.data.brief.woordje[pd.lid];
  const knop = [...$('pd-namen').children].find(b => b.classList.contains('on'));
  if (knop) knop.classList.toggle('klaar', !!t.trim());
  bewaar();
  voorbeeld();
});

// De brief op schaal, zodat een heel A4 in de kolom past.
function voorbeeld() {
  const box = $('pd-voorbeeld');
  box.innerHTML = pd.lid ? P.blad(pd.data, pd.lid) : '';
  const breed = $('pd-voorbeeld-box').clientWidth - 24;
  const blad = box.firstElementChild;
  if (!blad) return;
  const s = Math.min(1, breed / blad.offsetWidth);
  box.style.transform = `scale(${s})`;
  $('pd-voorbeeld-box').style.height = `${blad.offsetHeight * s + 24}px`;
}
window.addEventListener('resize', () => { if (pd.data) voorbeeld(); });

// ---------- Delen ----------

const printUrl = lid => `/postduif-print?id=${pd.data.brief.id}${lid ? `&l=${lid}` : ''}`;
$('pd-print-alles').addEventListener('click', () => window.open(printUrl(), '_blank'));
$('pd-print-een').addEventListener('click', () => window.open(printUrl(pd.lid), '_blank'));
$('pd-kopieer').addEventListener('click', () => {
  $('pd-tekst-in').value = P.tekst(pd.data, pd.lid);
  $('pd-tekst').showModal();
  $('pd-tekst-in').select();
});
$('pd-tekst-kopie').addEventListener('click', () => {
  const t = $('pd-tekst-in');
  if (!Ui.kopieer(t.value)) return t.select();
  $('pd-tekst-kopie').textContent = '✓ Gekopieerd';
  setTimeout(() => { $('pd-tekst-kopie').textContent = '📋 Kopiëren'; }, 1500);
});

// Iets veranderd op een ander scherm (bv. de bureau-pc): opnieuw laden als we niet zelf aan het typen zijn.
socket.on('pd-gewijzigd', () => {
  if (timer) return;
  if (pd.data) laad(pd.data.brief.id);
  else start();
});
socket.on('connect', () => { if (!pd.data) start(); });
