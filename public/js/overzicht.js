// Het overzicht na een spel: de moeilijkste vragen, wie extra uitleg kan gebruiken en hoe het per doel ging.
// Op elk docentenscherm verschijnt na het spel een knop; in Mijn klas staan alle overzichten van dit schooljaar.
const Overzicht = (() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/overzicht.css';
  document.head.appendChild(css);

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const when = iso => new Date(iso).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function bar(pct) {
    const b = el('span', `ov-bar ${pct < 50 ? 'niet' : pct < 80 ? 'bijna' : 'ok'}`);
    const fill = el('i');
    fill.style.width = `${pct}%`;
    b.append(fill, el('b', '', `${pct}%`));
    return b;
  }

  function block(title, hint) {
    const box = el('div', 'ov-block');
    box.appendChild(el('h4', '', title));
    if (hint) box.appendChild(el('p', 'muted small', hint));
    return box;
  }

  // Tekent het overzicht van één sessie in box.
  function render(o, box) {
    box.innerHTML = '';
    const head = el('div', 'ov-head');
    const title = el('div');
    title.append(el('h3', '', `${o.spel} · ${o.bron}`), el('p', 'muted', `${when(o.start)} · ${o.spelers.length} leerlingen · ${o.antwoorden} antwoorden`));
    // Leertijd: hoeveel vragen beantwoordde elke leerling per minuut spelen?
    if (o.perMinuut !== null && o.perMinuut !== undefined) {
      const oordeel = o.perMinuut >= 3 ? 'veel oefening' : o.perMinuut >= 1 ? 'gemiddeld' : 'vooral spelen, weinig vragen';
      title.append(el('p', 'muted small', `Leertijd: ${String(o.perMinuut).replace('.', ',')} vragen per leerling per minuut, ${o.minuten} minuten gespeeld (${oordeel}).`));
    }
    const link = el('a', 'button secondary', 'Download voor Excel');
    link.href = `/logboek/sessie?id=${encodeURIComponent(o.id)}`;
    head.append(title, bar(o.pct), link);
    box.appendChild(head);

    const grid = el('div', 'ov-grid');
    const moeilijk = o.vragen.filter(v => v.pct < o.grens).slice(0, 6);
    const hard = block('Moeilijkste vragen', moeilijk.length ? `Minder dan ${o.grens}% juist. Wie fout antwoordde, staat eronder.` : `Geen enkele vraag onder ${o.grens}% juist. Mooi!`);
    for (const v of moeilijk) {
      const row = el('div', 'ov-row');
      const text = el('div', 'ov-text');
      text.appendChild(el('span', '', v.vraag));
      if (v.doel) text.appendChild(el('code', '', v.doel));
      if (v.vaakstFout) text.appendChild(el('small', 'ov-fout', `${v.vaakstFout.keer} keer gekozen: "${v.vaakstFout.tekst}"`));
      if (v.fout.length) text.appendChild(el('small', 'muted', `Fout: ${v.fout.join(', ')}`));
      row.append(text, bar(v.pct));
      hard.appendChild(row);
    }
    const extra = o.spelers.filter(s => s.antwoorden >= o.minAntwoorden && s.pct < o.grens);
    const help = block('Extra uitleg', extra.length ? `Deze leerlingen hadden minder dan ${o.grens}% juist.` : 'Niemand zat onder de grens. Iedereen mee!');
    for (const s of extra) {
      const row = el('div', 'ov-row');
      const text = el('div', 'ov-text');
      text.appendChild(el('span', '', s.naam));
      if (s.foutDoelen.length) text.appendChild(el('small', 'muted', `Fouten bij ${s.foutDoelen.join(', ')}`));
      row.append(text, bar(s.pct));
      help.appendChild(row);
    }
    grid.append(hard, help);
    box.appendChild(grid);

    if (o.doelen.length) {
      const d = block('Per leerplandoel');
      for (const x of o.doelen) {
        const row = el('div', 'ov-row');
        const text = el('div', 'ov-text');
        text.append(el('code', '', x.doel), el('span', 'small', x.tekst));
        row.append(text, bar(x.pct));
        d.appendChild(row);
      }
      box.appendChild(d);
    }

    const all = el('details', 'ov-block');
    all.appendChild(el('summary', '', 'Alle leerlingen en alle vragen'));
    const cols = el('div', 'ov-grid');
    const ll = el('div');
    for (const s of [...o.spelers].sort((a, b) => b.pct - a.pct)) {
      const row = el('div', 'ov-row');
      row.append(el('span', 'ov-text', `${s.naam}${s.opLijst ? '' : ' (niet op de klaslijst)'} · ${s.juist}/${s.antwoorden}`), bar(s.pct));
      ll.appendChild(row);
    }
    const vv = el('div');
    for (const v of o.vragen) {
      const row = el('div', 'ov-row');
      row.append(el('span', 'ov-text', v.vraag), bar(v.pct));
      vv.appendChild(row);
    }
    cols.append(ll, vv);
    all.appendChild(cols);
    box.appendChild(all);
  }

  // Op een spelscherm: na het spel een knop rechtsonder. Het overzicht gaat pas open als de leerkracht erop klikt,
  // want het bord hangt voor de klas en het overzicht toont namen.
  function button(sock) {
    let last = null;
    const btn = el('button', 'ov-knop hidden', '📊 Overzicht');
    btn.title = 'Overzicht van dit spel, alleen voor de leerkracht';
    const modal = el('div', 'ob-modal ov-modal hidden');
    const card = el('div', 'panel ob-modal-box');
    const close = el('button', 'secondary', 'Sluiten');
    const more = el('a', 'button secondary', 'Alle overzichten en de doelenkaart');
    more.href = '/klas#overzicht';
    more.target = '_blank';
    const body = el('div');
    const actions = el('div', 'actions');
    actions.append(more, close);
    card.append(body, actions);
    modal.appendChild(card);
    document.body.append(btn, modal);
    btn.addEventListener('click', () => {
      if (!last) return;
      render(last, body);
      modal.classList.remove('hidden');
      btn.classList.remove('nieuw');
    });
    close.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    sock.on('sessie-klaar', o => {
      last = o;
      btn.classList.remove('hidden');
      btn.classList.add('nieuw');
    });
  }

  return { render, button, bar, when };
})();

if (typeof socket !== 'undefined' && !document.body.classList.contains('klas-host')) {
  Overzicht.button(socket);
  // Op elk spelbord ook de knop "Namen", om een verkeerde naam weg te klikken.
  const namen = document.createElement('script');
  namen.src = '/js/namen-host.js';
  document.body.appendChild(namen);
}
