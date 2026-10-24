// Mijn klas: de klaslijst invullen, het logboek bekijken en de leerplandoelen doorzoeken.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);

let doelen = [];
let leerjaar = 6;
let perDoel = {};

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

function loadKlas() {
  socket.emit('klas-get', null, res => {
    if (res.error) return ($('k-error').textContent = res.error);
    $('k-naam').value = res.klas.naam;
    $('k-leerjaar').value = String(res.klas.leerjaar);
    $('k-namen').value = res.klas.leerlingen.map(l => l.naam).join('\n');
  });
}

$('k-save').addEventListener('click', () => {
  $('k-error').textContent = '';
  $('k-saved').textContent = '';
  const data = { naam: $('k-naam').value, leerjaar: Number($('k-leerjaar').value), namen: $('k-namen').value.split('\n') };
  socket.emit('klas-save', data, res => {
    if (res.error) return ($('k-error').textContent = res.error);
    $('k-namen').value = res.klas.leerlingen.map(l => l.naam).join('\n');
    $('k-saved').textContent = `Bewaard: ${res.klas.leerlingen.length} leerlingen.`;
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
    leerjaar = res.leerjaar;
    doelen = res.doelen;
    renderDoelen();
  });
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
  const mine = doelen.filter(d => d.leerjaar === leerjaar);
  if (!mine.length) {
    box.textContent = `Er zijn nog geen leerplandoelen voor het ${leerjaar}e leerjaar ingeladen.`;
    return;
  }
  const shown = mine.filter(d => !q || d.code.toLowerCase().includes(q) || d.tekst.toLowerCase().includes(q) || d.cluster.toLowerCase().includes(q));
  let vak = '';
  let domein = '';
  let cluster = '';
  for (const d of shown) {
    if (d.vak !== vak || d.domein !== domein) {
      const h = document.createElement('h3');
      h.textContent = `${d.vak} · ${d.domein}`;
      box.appendChild(h);
      vak = d.vak;
      domein = d.domein;
      cluster = '';
    }
    if (d.cluster !== cluster) {
      const h = document.createElement('h4');
      h.textContent = d.cluster;
      box.appendChild(h);
      cluster = d.cluster;
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
    if (d.kennis) tags.appendChild(tag({ F: 'feitenkennis', I: 'inzicht', 'I/F': 'inzicht en feiten' }[d.kennis] || d.kennis));
    if (d.herhaling) tags.appendChild(tag(`herhaling ${d.herhaling}`));
    const log = perDoel[d.code];
    if (log) tags.appendChild(tag(`${log.antwoorden} antw. · ${Math.round((log.juist / log.antwoorden) * 100)}% juist`, 'log'));
    row.append(code, text, tags);
    box.appendChild(row);
  }
  if (!shown.length) box.textContent = 'Geen doelen gevonden.';
}

$('d-zoek').addEventListener('input', renderDoelen);

socket.on('connect', () => {
  loadKlas();
  loadDoelen();
  loadLogboek();
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
  text.textContent = d.tekst || 'Dit doel staat niet in de lijst van Op.stap.';
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
