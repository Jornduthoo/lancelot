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
    if (!l.totaal) parts.push('Speel een Toernooi of een oefenblad, dan verschijnen hier de eerste antwoorden.');
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
    // De vakken in de keuzelijst, alfabetisch.
    const sel = $('d-vak');
    const keep = sel.value;
    const vakken = [...new Set(doelen.filter(d => d.leerjaar === leerjaar).map(d => d.vak))].sort((a, b) => a.localeCompare(b, 'nl'));
    sel.innerHTML = '<option value="">Alle vakken</option>';
    for (const v of vakken) sel.add(new Option(v, v));
    sel.value = vakken.includes(keep) ? keep : '';
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
  const vakKeuze = $('d-vak').value;
  const shown = mine.filter(d => !vakKeuze || d.vak === vakKeuze).filter(d => !q || d.code.toLowerCase().includes(q) || d.tekst.toLowerCase().includes(q) || d.cluster.toLowerCase().includes(q));
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
  $('d-bron').textContent = `${shown.length} doelen. Bron: Op.stap (Katholiek Onderwijs Vlaanderen), leerplanversie V1.3. De officiële versie staat in de Op.stap-leerplantool.`;
}

$('d-zoek').addEventListener('input', renderDoelen);
$('d-vak').addEventListener('change', renderDoelen);

socket.on('connect', () => {
  loadKlas();
  loadDoelen();
  loadLogboek();
});
