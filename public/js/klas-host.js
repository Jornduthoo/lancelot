// Mijn klas: de klaslijst invullen, het logboek bekijken en de leerplandoelen doorzoeken.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);

let doelen = [];
let leerjaar = 6; // het leerjaar van de klas
let leerjaren = [];
const same = (a, b) => String(a) === String(b);
// Hoort een doel bij dit leerjaar? Een doel kan voor meerdere leerjaren gelden (leerjaren) of voor alle (leerjaar 0).
const inJaar = (d, lj) => (Array.isArray(d.leerjaren) && d.leerjaren.length ? d.leerjaren : [d.leerjaar]).some(j => !Number(j) || same(j, lj));
let alleJaren = [];
const ljNaam = lj => (leerjaren.find(l => same(l.id, lj)) || { naam: `${lj}e leerjaar` }).naam;
let perDoel = {};

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

// Klas, Doelen en Logboek zijn tabbladen op deze pagina (/klas#doelen); Zorg en Taken zijn eigen pagina's met dezelfde balk.
// Een oud adres als /klas#overzicht opent het tabblad waar dat stuk in staat.
const kiesTab = Ui.tabs($('klas-tabs'));
function tabUitAdres() {
  const id = location.hash.slice(1);
  const doel = id && document.getElementById(id);
  const tab = doel && doel.dataset.tab ? doel.dataset.tab : id;
  kiesTab(tab || 'klas');
  if (doel && doel.dataset.tab && doel.id !== tab) doel.scrollIntoView();
}
addEventListener('hashchange', tabUitAdres);
tabUitAdres();

function loadKlas() {
  socket.emit('klas-get', null, res => {
    if (res.error) return ($('k-error').textContent = res.error);
    $('k-naam').value = res.klas.naam;
    $('k-leerjaar').value = String(res.klas.leerjaar);
    $('k-namen').value = res.klas.leerlingen.map(l => l.naam).join('\n');
    vakgroepen = res.vakgroepen || [];
    renderNiveaus(res.klas.leerlingen);
  });
}

// Een raster: per leerling een algemeen niveau en een niveau per vak. Een vak zonder eigen keuze volgt het algemene niveau.
// Elke keuze bewaart meteen.
let vakgroepen = [];
function renderNiveaus(leerlingen) {
  const box = $('k-niveaus');
  box.innerHTML = '';
  if (!leerlingen.length) {
    box.innerHTML = '<div class="leeg"><p class="muted">Zet eerst je leerlingen op de klaslijst hierboven.</p></div>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'niveau-raster';
  table.innerHTML = `<thead><tr><th>Leerling</th><th>Algemeen</th>${vakgroepen.map(g => `<th title="${g.vakken.join(', ')}">${g.naam}</th>`).join('')}</tr></thead>`;
  const body = document.createElement('tbody');
  const opts = (current, algemeen) => (algemeen ? `<option value="">= ${Niveau.ICONS[algemeen]}</option>` : '')
    + Niveau.LIST.map(n => `<option value="${n}"${n === current ? ' selected' : ''}>${Niveau.label(n)}</option>`).join('');
  const pick = (l, vak, html, eigen) => {
    const td = document.createElement('td');
    const sel = document.createElement('select');
    sel.innerHTML = html;
    if (eigen) sel.classList.add('eigen');
    sel.addEventListener('change', () => {
      socket.emit('klas-niveau', { id: l.id, niveau: sel.value, vak }, res => {
        $('k-niveau-error').textContent = res.error || '';
        if (!res.error) renderNiveaus(res.klas.leerlingen);
      });
    });
    td.appendChild(sel);
    return td;
  };
  for (const l of leerlingen) {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.textContent = l.naam;
    const algemeen = l.niveau || 'schildknaap';
    row.append(name, pick(l, '', opts(algemeen), algemeen !== 'schildknaap'));
    for (const g of vakgroepen) {
      const eigen = (l.vakNiveaus || {})[g.id] || '';
      const td = pick(l, g.id, opts(eigen, algemeen), !!eigen);
      td.title = `${l.naam}, ${g.naam}: ${Niveau.NAMES[eigen || algemeen]}${eigen ? '' : ' (zoals algemeen)'}`;
      row.appendChild(td);
    }
    body.appendChild(row);
  }
  table.appendChild(body);
  box.appendChild(table);
}

$('k-save').addEventListener('click', () => {
  $('k-error').textContent = '';
  $('k-saved').textContent = '';
  const data = { naam: $('k-naam').value, leerjaar: $('k-leerjaar').value, namen: $('k-namen').value.split('\n') };
  socket.emit('klas-save', data, res => {
    if (res.error) return ($('k-error').textContent = res.error);
    $('k-namen').value = res.klas.leerlingen.map(l => l.naam).join('\n');
    $('k-saved').textContent = `Bewaard: ${res.klas.leerlingen.length} leerlingen.`;
    renderNiveaus(res.klas.leerlingen);
    loadDoelen();
  });
});

function loadLogboek() {
  socket.emit('logboek-get', null, res => {
    if (res.error) return;
    const l = res.logboek;
    perDoel = l.perDoel;
    const parts = [`Schooljaar ${l.schooljaar}: ${l.totaal} antwoorden bewaard, waarvan ${l.metDoel} bij een vraag met een leerplandoel.`];
    if (l.zonderKlaslijst) parts.push(`${l.zonderKlaslijst} antwoorden komen van een naam die niet op de klaslijst staat.`);
    if (!l.totaal) parts.push('Speel een spel of een oefenblad, dan verschijnen hier de eerste antwoorden.');
    $('l-summary').textContent = parts.join(' ');
    renderDoelen();
  });
}

$('l-folder').addEventListener('click', () => socket.emit('open-logboek-folder'));

function loadDoelen() {
  socket.emit('doelen-get', null, res => {
    if (res.error) return;
    const before = leerjaar;
    leerjaar = res.leerjaar;
    doelen = res.doelen;
    alleJaren = res.leerjaren || [];
    leerjaren = alleJaren.filter(l => doelen.some(d => inJaar(d, l.id)));
    // Het leerjaar van de klas: met de namen van het gekozen land (Year 4, groep 6, CE1 ...).
    const kl = $('k-leerjaar');
    const was = kl.value || String(leerjaar);
    kl.innerHTML = '';
    for (const l of alleJaren) kl.add(new Option(l.naam, String(l.id)));
    if (!alleJaren.some(l => same(l.id, leerjaar))) kl.add(new Option(`${leerjaar}e leerjaar`, String(leerjaar)));
    kl.value = alleJaren.some(l => same(l.id, was)) ? was : String(leerjaar);
    // Het leerjaar in de keuzelijst: dat van de klas, tenzij de leerkracht al een ander koos.
    const sel = $('d-leerjaar');
    const keep = sel.value && !same(sel.value, before) ? sel.value : String(leerjaar);
    sel.innerHTML = '';
    for (const l of leerjaren) sel.add(new Option(same(l.id, leerjaar) ? `${l.naam} (mijn klas)` : l.naam, String(l.id)));
    sel.value = leerjaren.some(l => same(l.id, keep)) ? keep : String(leerjaar);
    fillVakken();
  });
}

function gekozenLeerjaar() {
  return $('d-leerjaar').value || String(leerjaar);
}

// De vakken van het gekozen leerjaar in de keuzelijst, alfabetisch.
function fillVakken() {
  const sel = $('d-vak');
  const keep = sel.value;
  const lj = gekozenLeerjaar();
  const vakken = [...new Set(doelen.filter(d => inJaar(d, lj)).map(d => d.vak))].sort((a, b) => a.localeCompare(b, 'nl'));
  sel.innerHTML = '<option value="">Alle vakken</option>';
  for (const v of vakken) sel.add(new Option(v, v));
  sel.value = vakken.includes(keep) ? keep : '';
  renderDoelen();
}

function tag(text, cls = '') {
  const t = document.createElement('em');
  t.className = `tag ${cls}`;
  t.textContent = text;
  return t;
}

function renderDoelen() {
  const box = $('d-lijst');
  box.innerHTML = '';
  const q = $('d-zoek').value.trim().toLowerCase();
  const lj = gekozenLeerjaar();
  const mine = doelen.filter(d => inJaar(d, lj));
  $('d-bron').textContent = '';
  if (!doelen.length) {
    box.textContent = 'Je werkt zonder leerplandoelen. Kies hierboven de doelen van je land of zet je eigen doelen.';
    return;
  }
  if (!mine.length) {
    box.textContent = `Er zijn geen leerplandoelen voor ${ljNaam(lj)}. Kies een ander leerjaar.`;
    return;
  }
  const vakKeuze = $('d-vak').value;
  const shown = mine.filter(d => !vakKeuze || d.vak === vakKeuze).filter(d => !q || d.code.toLowerCase().includes(q) || d.tekst.toLowerCase().includes(q) || String(d.cluster || '').toLowerCase().includes(q));
  // Per vak een inklapbaar blok: zo blijft de pagina kort. Bij zoeken of één vak staat alles open.
  const open = Boolean(q || vakKeuze);
  let vak = '';
  let domein = '';
  let cluster = '';
  let groep = box;
  let teller = null;
  for (const d of shown) {
    if (d.vak !== vak) {
      const det = document.createElement('details');
      det.className = 'doel-groep';
      det.open = open;
      const sum = document.createElement('summary');
      const h = document.createElement('h3');
      h.textContent = d.vak;
      teller = document.createElement('span');
      teller.className = 'muted small';
      teller.dataset.n = '0';
      sum.append(h, teller);
      det.appendChild(sum);
      box.appendChild(det);
      groep = det;
      vak = d.vak;
      domein = '';
    }
    if ((d.domein || '') !== domein) {
      const h = document.createElement('h3');
      h.className = 'doel-domein';
      h.textContent = d.domein || '';
      if (d.domein) groep.appendChild(h);
      domein = d.domein || '';
      cluster = '';
    }
    teller.dataset.n = Number(teller.dataset.n) + 1;
    teller.textContent = `${teller.dataset.n} doelen`;
    if ((d.cluster || '') !== cluster) {
      cluster = d.cluster || '';
      if (cluster) {
        const h = document.createElement('h4');
        h.textContent = cluster;
        groep.appendChild(h);
      }
    }
    const row = document.createElement('div');
    row.className = 'doel-rij';
    const code = document.createElement('code');
    code.textContent = d.code;
    const text = document.createElement('span');
    text.textContent = d.tekst;
    const tags = document.createElement('span');
    tags.className = 'tags';
    if (d.soort === 'plus') tags.appendChild(tag('plusdoel', 'plus'));
    if (d.score === false) tags.appendChild(tag('Ronde Tafel, geen score'));
    if (d.kennis) tags.appendChild(tag({ F: 'feitenkennis', I: 'inzicht', 'I/F': 'inzicht en feiten' }[d.kennis] || d.kennis));
    if (d.herhaling) tags.appendChild(tag(`herhaling ${d.herhaling}`));
    if (d.eigen) tags.appendChild(tag('eigen doel'));
    if (Array.isArray(d.leerjaren) && d.leerjaren.length > 1) tags.appendChild(tag(`${ljNaam(d.leerjaren[0])} - ${ljNaam(d.leerjaren[d.leerjaren.length - 1])}`));
    const log = perDoel[d.code];
    if (log) tags.appendChild(tag(`${log.antwoorden} antw. · ${Math.round((log.juist / log.antwoorden) * 100)}% juist`, 'log'));
    row.append(code, text, tags);
    groep.appendChild(row);
  }
  if (!shown.length) box.textContent = 'Geen doelen gevonden.';
  $('d-bron').textContent = keuzeInfo.bron ? `${shown.length} doelen. Bron: ${keuzeInfo.bron}.` : `${shown.length} doelen.`;
}

// Welke doelen: het land, de eigen doelen en de AI-prompt.
let keuzeInfo = {};
function toonKeuze(k) {
  if (!k || k.error) return;
  keuzeInfo = k;
  const sel = $('dk-land');
  sel.innerHTML = '';
  for (const l of k.landen) if (l.aantal) sel.add(new Option(l.naam, l.id));
  sel.add(new Option('Geen lijst (alleen eigen doelen of geen doelen)', 'geen'));
  sel.value = k.land;
  $('dk-land-bron').textContent = k.bron ? `Bron: ${k.bron}.` : '';
  $('dk-eigen-aantal').textContent = k.eigen.length ? `(${k.eigen.length})` : '';
  if (document.activeElement !== $('dk-eigen-tekst')) $('dk-eigen-tekst').value = k.tekst || '';
  if (k.land === 'geen' && !k.eigen.length) $('dk-eigen').open = true;
}
function laadKeuze() {
  socket.emit('doelen-keuze', null, toonKeuze);
}
$('dk-land').addEventListener('change', () => {
  socket.emit('doelen-land', { land: $('dk-land').value }, res => {
    if (res.error) return Ui.melding(res.error);
    toonKeuze(res);
  });
});
$('dk-eigen-bewaar').addEventListener('click', () => {
  $('dk-error').textContent = '';
  socket.emit('doelen-eigen', { tekst: $('dk-eigen-tekst').value }, res => {
    if (res.error) return void ($('dk-error').textContent = res.error);
    toonKeuze(res);
    $('dk-eigen-tekst').value = res.tekst || '';
    Ui.melding(`${res.eigen.length} eigen doelen bewaard.`);
  });
});
$('dk-ai').addEventListener('click', () => {
  const lj = ljNaam($('k-leerjaar').value || leerjaar);
  const land = (keuzeInfo.landen || []).find(l => l.id === keuzeInfo.land);
  socket.emit('doelen-prompt', { leerjaar: lj, land: land ? land.naam : '' }, res => {
    if (res.error) return Ui.melding(res.error);
    Ui.kopieer(res.prompt);
  });
});
socket.on('doelen-gewijzigd', () => loadDoelen());

$('d-zoek').addEventListener('input', renderDoelen);
$('d-vak').addEventListener('change', renderDoelen);
$('d-leerjaar').addEventListener('change', fillVakken);

socket.on('connect', () => {
  loadKlas();
  loadDoelen();
  laadKeuze();
  loadLogboek();
});
// De klaslijst kwam binnen via Mijn lesmap (bv. thuis aangepast): opnieuw tonen, behalve terwijl je hem aan het typen bent.
socket.on('klas-gewijzigd', () => {
  if (!['k-namen', 'k-naam'].includes(document.activeElement && document.activeElement.id)) loadKlas();
});

// --- Overzicht na elk spel ---
let sessieOpen = null;

function loadSessies() {
  socket.emit('sessies-get', null, res => {
    if (res.error) return;
    const box = $('o-lijst');
    box.innerHTML = '';
    if (!res.sessies.length) {
      box.textContent = 'Nog geen spellen in het logboek van dit schooljaar.';
      return;
    }
    for (const s of res.sessies) {
      const b = document.createElement('button');
      b.className = `secondary ov-sessie${s.id === sessieOpen ? ' actief' : ''}`;
      const text = document.createElement('span');
      text.className = 'ov-text';
      const t = document.createElement('span');
      t.textContent = `${s.spel} · ${s.bron}`;
      const sub = document.createElement('small');
      sub.className = 'muted';
      sub.textContent = `${Overzicht.when(s.start)} · ${s.leerlingen} leerlingen · ${s.antwoorden} antwoorden`;
      text.append(t, sub);
      b.append(text, Overzicht.bar(s.pct));
      b.addEventListener('click', () => openSessie(s.id));
      box.appendChild(b);
    }
  });
}

function openSessie(id) {
  socket.emit('sessie-get', id, res => {
    if (res.error) return ($('o-detail').textContent = res.error);
    sessieOpen = id;
    Overzicht.render(res.sessie, $('o-detail'));
    loadSessies();
  });
}

// --- Doelenkaart ---
let kaart = null;

function loadKaart() {
  socket.emit('doelenkaart-get', null, res => {
    if (res.error) return;
    kaart = res.kaart;
    $('dk-recent').textContent = kaart.recent;
    const sel = $('dk-leerling');
    const keep = sel.value;
    sel.innerHTML = '<option value="">Kies een leerling</option>';
    for (const l of kaart.leerlingen) {
      const o = document.createElement('option');
      o.value = l.key;
      o.textContent = l.naam;
      sel.appendChild(o);
    }
    sel.value = kaart.leerlingen.some(l => l.key === keep) ? keep : '';
    renderKaart();
  });
}

function dot(c) {
  const d = document.createElement('i');
  d.className = `dk-dot ${c ? c.status : ''}`;
  return d;
}

function doelCell(d, tag = 'td') {
  const cell = document.createElement(tag);
  cell.className = 'dk-doel';
  const code = document.createElement('code');
  code.textContent = d.code;
  const text = document.createElement('small');
  text.textContent = d.tekst || 'Dit doel staat niet in de gekozen doelen.';
  cell.append(code, text);
  return cell;
}

function renderKaart() {
  const box = $('dk-box');
  box.innerHTML = '';
  if (!kaart) return;
  if (!kaart.doelen.length) {
    box.textContent = 'Nog geen antwoorden op vragen met een leerplandoel. Koppel een doel aan je quizvragen of oefeningen, dan vult de kaart zich vanzelf.';
    return;
  }
  const who = $('dk-leerling').value;
  $('dk-klas').classList.toggle('actief', !who);
  if (who) return renderLeerling(who, box);
  const wrap = document.createElement('div');
  wrap.className = 'dk-wrap';
  const table = document.createElement('table');
  table.className = 'dk-table';
  const head = document.createElement('tr');
  const h0 = document.createElement('th');
  h0.className = 'dk-doel';
  h0.textContent = 'Leerplandoel';
  const h1 = document.createElement('th');
  h1.className = 'dk-klas';
  h1.textContent = 'Klas';
  head.append(h0, h1, document.createElement('th'));
  for (const l of kaart.leerlingen) {
    const th = document.createElement('th');
    th.className = 'dk-naam';
    th.textContent = l.naam;
    head.appendChild(th);
  }
  const thead = document.createElement('thead');
  thead.appendChild(head);
  const tbody = document.createElement('tbody');
  for (const d of kaart.doelen) {
    const tr = document.createElement('tr');
    const klasCell = document.createElement('td');
    klasCell.className = 'dk-klas';
    const geoefend = d.telling.ok + d.telling.bijna + d.telling.niet + d.telling.weinig;
    klasCell.append(`${d.telling.ok}/${kaart.leerlingen.length} beheerst`);
    const mix = document.createElement('span');
    mix.className = 'dk-mix';
    for (const st of ['ok', 'bijna', 'niet', 'weinig']) {
      if (!d.telling[st]) continue;
      const i = document.createElement('i');
      i.className = st;
      i.style.width = `${(d.telling[st] / Math.max(kaart.leerlingen.length, geoefend)) * 100}%`;
      mix.appendChild(i);
    }
    klasCell.appendChild(mix);
    klasCell.title = `${d.antwoorden} antwoorden, ${d.pct}% juist`;
    const dl = document.createElement('td');
    const a = document.createElement('a');
    a.className = 'button secondary dk-dl';
    a.href = `/logboek/doel?code=${encodeURIComponent(d.code)}`;
    a.textContent = 'Excel';
    a.title = 'Dit doel downloaden voor Excel: per leerling en per vraag';
    dl.appendChild(a);
    tr.append(doelCell(d), klasCell, dl);
    for (const l of kaart.leerlingen) {
      const td = document.createElement('td');
      td.className = 'dk-cel';
      const c = d.cellen[l.key];
      td.appendChild(dot(c));
      td.title = c ? `${l.naam}: ${kaart.status[c.status]} (${c.juist}/${c.n} juist, laatste antwoorden ${c.recent}%)` : `${l.naam}: nog niet geoefend`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  wrap.appendChild(table);
  box.appendChild(wrap);
}

function renderLeerling(key, box) {
  const l = kaart.leerlingen.find(x => x.key === key);
  const list = document.createElement('div');
  list.className = 'dk-leerling';
  const rows = kaart.doelen.map(d => ({ d, c: d.cellen[key] }));
  const order = { niet: 0, bijna: 1, weinig: 2, ok: 3 };
  rows.sort((a, b) => (a.c ? order[a.c.status] : 4) - (b.c ? order[b.c.status] : 4));
  const ok = rows.filter(r => r.c && r.c.status === 'ok').length;
  const intro = document.createElement('p');
  intro.textContent = `${l.naam} beheerst ${ok} van de ${rows.length} geoefende doelen.`;
  list.appendChild(intro);
  for (const { d, c } of rows) {
    const row = document.createElement('div');
    row.className = 'ov-row';
    const text = doelCell(d, 'div');
    text.classList.add('ov-text');
    const st = document.createElement('small');
    st.className = 'muted';
    st.textContent = c ? `${kaart.status[c.status]} · ${c.juist}/${c.n} juist · laatst ${Overzicht.when(c.laatst)}` : 'nog niet geoefend';
    text.appendChild(st);
    row.append(dot(c), text);
    if (c) row.appendChild(Overzicht.bar(c.recent));
    list.appendChild(row);
  }
  box.appendChild(list);
}

$('dk-klas').addEventListener('click', () => {
  $('dk-leerling').value = '';
  renderKaart();
});
$('dk-leerling').addEventListener('change', renderKaart);

socket.on('connect', () => {
  loadSessies();
  loadKaart();
});
socket.on('sessie-klaar', () => {
  loadSessies();
  loadKaart();
  loadLogboek();
});
