// Het zorgoverzicht: wie valt uit, waarop, en gaat het beter of slechter? Alles komt uit het logboek op deze pc.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const KLEUR = { rood: 'Aandacht nodig', oranje: 'Opvolgen', groen: 'Mee met de klas', weinig: 'Te weinig gegevens' };

let data = null;
let open = '';
const drafts = {}; // notities die nog niet bewaard zijn
const ZK = [['zeker-juist', '💪 Terecht zeker'], ['twijfel-juist', '🤔 Getwijfeld, maar juist'], ['zeker-fout', '⚠️ Zeker, maar fout'], ['twijfel-fout', '🤔 Getwijfeld en fout']];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const datum = iso => new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
$('to-klas').addEventListener('click', () => { location.href = '/klas'; });
$('z-dagen').addEventListener('change', load);
$('z-vak').addEventListener('change', load);
$('z-persoonlijk').addEventListener('click', e => maakHerhaling(e.target, { dagen: Number($('z-dagen').value) || 365 }, 'herhaal-persoonlijk'));

function load() {
  socket.emit('zorg-get', { dagen: Number($('z-dagen').value), vak: $('z-vak').value }, res => {
    if (res.error) return ($('z-info').textContent = res.error);
    data = res.zorg;
    render();
  });
}
socket.on('connect', load);

function bar(pct) {
  const b = el('span', `zg-bar ${pct < 50 ? 'niet' : pct < 80 ? 'bijna' : 'ok'}`);
  const i = el('i');
  i.style.width = `${pct}%`;
  b.append(i, el('b', '', `${pct}%`));
  return b;
}

// Een klein lijntje: de leerling per les (vol) tegenover de klas (stippel).
function lijn(punten) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'zg-lijn');
  svg.setAttribute('viewBox', '0 0 100 34');
  svg.setAttribute('preserveAspectRatio', 'none');
  if (punten.length < 2) return svg;
  const x = i => (i / (punten.length - 1)) * 100;
  const y = p => 32 - (p / 100) * 30;
  for (const [cls, key] of [['k', 'klas'], ['l', 'pct']]) {
    const path = document.createElementNS(ns, 'polyline');
    path.setAttribute('class', cls);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('points', punten.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' '));
    svg.appendChild(path);
  }
  const t = document.createElementNS(ns, 'title');
  t.textContent = punten.map(p => `${datum(p.t)} ${p.spel}: ${p.pct}% (klas ${p.klas}%)`).join('\n');
  svg.appendChild(t);
  return svg;
}

function render() {
  const d = data;
  const vakSel = $('z-vak');
  const keep = vakSel.value;
  vakSel.innerHTML = '<option value="">Alle vakken</option>';
  for (const v of d.vakken) vakSel.add(new Option(v, v));
  if (keep && !d.vakken.includes(keep)) vakSel.add(new Option(keep, keep));
  vakSel.value = keep;

  $('z-info').textContent = d.antwoorden
    ? `${d.klas ? `${d.klas} · ` : ''}${d.sessies} keer gespeeld, ${d.antwoorden} antwoorden, klas gemiddeld ${d.pct}% juist.`
    : '';
  const tellers = $('z-tellers');
  tellers.innerHTML = '';
  for (const k of ['rood', 'oranje', 'groen', 'weinig']) {
    const t = el('div', `zg-teller ${k}`);
    t.append(el('b', '', d.telling[k]), el('span', '', KLEUR[k]));
    tellers.appendChild(t);
  }

  const leeg = $('z-leeg');
  leeg.style.display = d.antwoorden ? 'none' : '';
  leeg.innerHTML = '';
  leeg.append(el('p', '', d.leerlingen.length
    ? 'In deze periode staat er nog niets in het logboek. Speel een spel of een oefenblad, of kies een langere periode.'
    : 'Zet eerst je leerlingen op de klaslijst bij Mijn klas en doelen, en speel een paar spellen. Dan verschijnt hier wie extra zorg kan gebruiken.'));
  const knop = el('a', 'button', d.leerlingen.length ? 'Naar De Arena' : 'Klaslijst invullen');
  knop.href = d.leerlingen.length ? '/host' : '/klas';
  leeg.append(knop);
  // Zonder antwoorden zijn de lege blokken hieronder enkel ruis: alleen de uitleg blijft staan.
  for (const id of ['z-leerlingen', 'z-misverstanden', 'z-klassikaal']) {
    const blok = $(id).closest('.zg-twee') || $(id).closest('.panel');
    blok.style.display = d.antwoorden ? '' : 'none';
  }

  const grid = $('z-leerlingen');
  grid.innerHTML = '';
  for (const l of d.leerlingen) grid.appendChild(kaart(l));

  renderMisverstanden($('z-misverstanden'), d.misverstanden);
  renderDoelen($('z-klassikaal'), d.klassikaal, 'Geen enkel doel waar de klas samen op vastzit.');
  renderDoelen($('z-groepjes'), d.groepjes, 'Niemand zit nog vast op een doel. Knap!');
}

function kaart(l) {
  const isOpen = open === l.key;
  const box = el('div', `zg-kaart ${l.kleur}${isOpen ? ' open' : ''}`);
  box.title = KLEUR[l.kleur];
  const top = el('div', 'zg-top');
  top.append(el('span', 'zg-naam', l.naam));
  if (l.opLijst) {
    // Het algemene niveau, en een vak met een eigen niveau erachter (W🪶 = Page voor wiskunde).
    const per = Object.entries(l.vakNiveaus || {});
    const n = el('span', '', Niveau.ICONS[l.niveau] + per.map(([g, v]) => ` ${g === 'wo' ? 'WO' : g[0].toUpperCase()}${Niveau.ICONS[v]}`).join(''));
    n.title = [`Algemeen: ${Niveau.NAMES[l.niveau]} (${Niveau.HELP[l.niveau]})`, ...per.map(([g, v]) => `${g === 'wo' ? 'WO' : g[0].toUpperCase() + g.slice(1)}: ${Niveau.NAMES[v]}`)].join('\n');
    top.append(n);
  }
  top.append(el('span', 'zg-pct', l.antwoorden ? `${l.recentPct}%` : '–'));
  box.appendChild(top);

  const sub = el('div', 'zg-sub');
  sub.append(el('span', '', `${l.antwoorden} antw.`));
  if (l.tovKlas !== null) sub.append(el('span', l.tovKlas <= -10 ? 'neer' : l.tovKlas >= 10 ? 'op' : '', `${l.tovKlas > 0 ? '+' : ''}${l.tovKlas} t.o.v. klas`));
  if (l.trend !== null) sub.append(el('span', l.trend <= -10 ? 'neer' : l.trend >= 10 ? 'op' : '', l.trend <= -10 ? '↘ achteruit' : l.trend >= 10 ? '↗ vooruit' : '→ stabiel'));
  if (l.gok) sub.append(el('span', 'neer', `🎲 ${l.gok}×`));
  box.appendChild(sub);
  box.appendChild(lijn(l.lijn));

  const sig = el('ul', 'zg-sig');
  for (const s of isOpen ? l.signalen : l.signalen.slice(0, 2)) sig.appendChild(el('li', s.niveau, s.tekst));
  if (!isOpen && l.signalen.length > 2) sig.appendChild(el('li', '', `en nog ${l.signalen.length - 2}…`));
  box.appendChild(sig);

  for (const ad of l.adviezen || []) {
    const a = el('div', 'zg-advies');
    const wat = ad.vakNaam ? `Niveau-advies ${ad.vakNaam}` : 'Niveau-advies algemeen';
    a.append(el('span', '', `${wat}: ${Niveau.label(ad.naar)}. ${ad.waarom}.`));
    const b = el('button', 'secondary', `Zet ${ad.vakNaam || 'algemeen'} op ${Niveau.NAMES[ad.naar]}`);
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      b.disabled = true;
      socket.emit('klas-niveau', { id: l.key, niveau: ad.naar, vak: ad.vak }, res => {
        if (res.error) {
          b.disabled = false;
          return a.appendChild(el('span', 'error', res.error));
        }
        load();
      });
    });
    a.appendChild(b);
    box.appendChild(a);
  }

  if (isOpen) box.appendChild(detail(l));
  box.addEventListener('click', ev => {
    // Klikken in het detail (bv. een notitie typen) laat de kaart open.
    if (ev.target.closest('button, a, .zg-detail')) return;
    open = isOpen ? '' : l.key;
    render();
    if (open) document.querySelector('.zg-kaart.open')?.scrollIntoView({ block: 'nearest' });
  });
  return box;
}

function detail(l) {
  const box = el('div', 'zg-detail');
  const vak = el('div');
  vak.appendChild(el('h4', '', 'Per vak'));
  if (!l.vakken.length) vak.appendChild(el('p', 'muted small', 'Nog geen vragen met een leerplandoel.'));
  for (const v of l.vakken) {
    const r = el('div', 'zg-rij');
    r.append(el('span', '', `${v.vak} · ${v.n} antw.`), bar(v.pct));
    vak.appendChild(r);
  }
  const doel = el('div');
  doel.appendChild(el('h4', '', 'Nog niet beheerst'));
  if (!l.nietDoelen.length) doel.appendChild(el('p', 'muted small', 'Geen doelen onder 50% bij de laatste antwoorden.'));
  for (const x of l.nietDoelen.slice(0, 8)) {
    const r = el('div', 'zg-rij');
    const t = el('span', 'zg-txt');
    t.title = x.tekst;
    t.append(el('code', '', x.code), document.createTextNode(x.tekst));
    r.append(t, bar(x.pct));
    doel.appendChild(r);
  }
  const lessen = el('div');
  lessen.appendChild(el('h4', '', 'Laatste lessen'));
  if (!l.lijn.length) lessen.appendChild(el('p', 'muted small', 'Nog geen lessen in deze periode.'));
  for (const p of [...l.lijn].reverse().slice(0, 6)) {
    const r = el('div', 'zg-rij');
    r.append(el('span', '', `${datum(p.t)} · ${p.spel} · klas ${p.klas}%`), bar(p.pct));
    lessen.appendChild(r);
  }
  if (l.laatst) lessen.appendChild(el('p', 'muted small', `Laatst actief: ${datum(l.laatst)}.`));
  box.append(vak, doel, lessen);

  // Sterk in: ook goed nieuws hoort in een zorggesprek.
  const sterk = el('div');
  sterk.appendChild(el('h4', '', 'Sterk in'));
  if (!l.sterk.length) sterk.appendChild(el('p', 'muted small', 'Nog geen doelen met minstens 80% juist.'));
  for (const x of l.sterk) {
    const r = el('div', 'zg-rij');
    const t = el('span', 'zg-txt');
    t.title = x.tekst;
    t.append(el('code', '', x.code), document.createTextNode(x.tekst));
    r.append(t, bar(x.pct));
    sterk.appendChild(r);
  }

  // Zeker of twijfel: hoe goed schat de leerling zichzelf in?
  const zk = el('div');
  zk.appendChild(el('h4', '', 'Zeker of twijfel'));
  if (!l.zekerheid) zk.appendChild(el('p', 'muted small', 'Nog geen antwoorden met zeker of twijfel (Toernooi of Opwarmer).'));
  else {
    for (const [k, text] of ZK) {
      const r = el('div', 'zg-rij');
      r.append(el('span', '', text), el('b', '', `${l.zekerheid[k]}×`));
      zk.appendChild(r);
    }
  }

  // Notities: observaties en afspraken, alleen op deze pc.
  const nota = el('div');
  nota.appendChild(el('h4', '', 'Notities'));
  if (l.opLijst) {
    const area = el('textarea');
    area.rows = 2;
    area.placeholder = 'bijv. Werkt beter met concreet materiaal. Besproken met ouders op 12/11.';
    area.value = drafts[l.key] || '';
    area.addEventListener('input', () => { drafts[l.key] = area.value; });
    const add = el('button', 'secondary', 'Notitie bewaren');
    add.addEventListener('click', () => socket.emit('notitie-add', { leerling: l.key, tekst: area.value }, res => {
      if (res.error) return nota.appendChild(el('p', 'error', res.error));
      delete drafts[l.key];
      load();
    }));
    nota.append(area, add);
    for (const n of l.notities) {
      const r = el('div', 'zg-rij');
      const t = el('span');
      t.append(el('small', 'muted', `${datum(n.t)} · `), document.createTextNode(n.tekst));
      const del = el('button', 'secondary zg-mini', '✕');
      del.title = 'Notitie verwijderen';
      del.addEventListener('click', async () => {
        if (await Ui.vraag('Deze notitie verwijderen?')) socket.emit('notitie-del', { leerling: l.key, t: n.t }, load);
      });
      r.append(t, del);
      nota.appendChild(r);
    }
  } else {
    nota.appendChild(el('p', 'muted small', 'Zet deze leerling op de klaslijst om notities te bewaren.'));
  }
  box.append(sterk, zk, nota);

  const acties = el('div', 'zg-acties');
  if (l.nietDoelen.length) {
    const b = el('button', 'secondary', `🔁 Herhaalquiz voor ${l.naam}`);
    b.title = 'Een quiz met de vragen bij de doelen die nog niet lukken. Hij komt bij je quizzen in de map Herhaling.';
    b.addEventListener('click', () => maakHerhaling(b, { doelen: l.nietDoelen.map(x => x.code), voor: l.naam }));
    acties.appendChild(b);
  }
  if (l.opLijst) {
    const f = el('a', 'button secondary', '🖨️ Zorgfiche (printen of PDF)');
    f.href = `/zorg-fiche?id=${encodeURIComponent(l.key)}&dagen=${data.dagen}`;
    f.target = '_blank';
    acties.appendChild(f);
  }
  box.appendChild(acties);
  return box;
}

// Een herhaalquiz maken en zeggen waar hij staat.
function maakHerhaling(button, opts, event = 'herhaal-doelen') {
  button.disabled = true;
  socket.emit(event, opts, res => {
    button.disabled = false;
    const msg = res.error || `"${res.title}" staat bij je quizzen in de map Herhaling (${res.vragen} vragen). Speel hem in een spel op eigen tempo, zoals Schattenjacht of Laserslag.`;
    Ui.melding(msg);
  });
}

function renderMisverstanden(box, list) {
  box.innerHTML = '';
  if (!list.length) return box.appendChild(el('p', 'muted small', 'Nog geen. Zet "Zeker of twijfel" aan in het Toernooi of de Opwarmer.'));
  for (const d of list) {
    const row = el('div', 'zg-doel');
    const head = el('div');
    head.append(el('code', '', d.code), document.createTextNode(d.tekst || ''));
    const namen = el('div', 'namen');
    for (const n of d.namen) namen.appendChild(el('span', '', n));
    row.append(head, el('div', 'muted small', `${d.keer} keer zeker maar fout, door:`), namen);
    box.appendChild(row);
  }
}

function renderDoelen(box, list, leeg) {
  box.innerHTML = '';
  if (!list.length) return box.appendChild(el('p', 'muted small', leeg));
  for (const d of list) {
    const row = el('div', 'zg-doel');
    const head = el('div');
    head.append(el('code', '', d.code), document.createTextNode(d.tekst || ''));
    const stand = el('div', 'muted small', `${d.niet.length} nog niet, ${d.bijna.length} bijna, ${d.ok} beheerst. Nog niet:`);
    const namen = el('div', 'namen');
    for (const n of d.niet) namen.appendChild(el('span', '', n));
    row.append(head, stand, namen);
    if (d.code) {
      const b = el('button', 'secondary zg-mini', '🔁 Herhaalquiz');
      b.title = 'Een quiz met de vragen bij dit doel, in de map Herhaling.';
      b.addEventListener('click', () => maakHerhaling(b, { doelen: [d.code], voor: d.code }));
      row.appendChild(b);
    }
    box.appendChild(row);
  }
}
