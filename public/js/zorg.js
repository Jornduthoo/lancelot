// Het zorgoverzicht: wie valt uit, waarop, en gaat het beter of slechter? Alles komt uit het logboek op deze pc.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const KLEUR = { rood: 'Aandacht nodig', oranje: 'Opvolgen', groen: 'Mee met de klas', weinig: 'Te weinig gegevens' };

let data = null;
let open = '';

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
  leeg.textContent = d.leerlingen.length
    ? 'In deze periode staat er nog niets in het logboek. Speel een spel of een oefenblad, of kies een langere periode.'
    : 'Zet eerst je leerlingen op de klaslijst bij Mijn klas en doelen, en speel een paar spellen. Dan verschijnt hier wie extra zorg kan gebruiken.';

  const grid = $('z-leerlingen');
  grid.innerHTML = '';
  for (const l of d.leerlingen) grid.appendChild(kaart(l));

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
    const n = el('span', '', Niveau.ICONS[l.niveau]);
    n.title = `${Niveau.NAMES[l.niveau]} (${Niveau.HELP[l.niveau]})`;
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

  if (l.advies) {
    const a = el('div', 'zg-advies');
    a.append(el('span', '', `Niveau-advies: ${Niveau.label(l.advies.naar)}. ${l.advies.waarom}.`));
    const b = el('button', 'secondary', `Zet op ${Niveau.NAMES[l.advies.naar]}`);
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      b.disabled = true;
      socket.emit('klas-niveau', { id: l.key, niveau: l.advies.naar }, res => {
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
    if (ev.target.closest('button, a')) return;
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
  for (const x of l.nietDoelen) {
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
  return box;
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
    box.appendChild(row);
  }
}
