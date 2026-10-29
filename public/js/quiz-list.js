// De lijst met quizzen, oefenbladen of Ronde Tafel-sessies op elk docentenscherm, geordend in mappen.
// Zoals de Verkenner: links de mappenboom, rechts de items van de open map met een kruimelpad erboven, en een
// zoekbalk die in alle mappen zoekt. Items en mappen sleep je naar een map (links, in het kruimelpad of op een
// mapje rechts), of je kiest de map met het mapje 📁 in de rij (ook op een touchscreen).
// Met ⬇ exporteer je een item, een map of alles naar een bestand; met ⬆ Importeren (of door een bestand
// op de lijst te slepen) laad je dat op een andere pc weer in.
// Met ☑ Selecteren vink je meerdere items aan (shift-klik voor een hele reeks, of Dubbels) en verwijder of verplaats je ze
// in één keer (met 📁 in de balk, of door een aangevinkt item naar een map te slepen: de hele selectie gaat mee).
// Gebruik: QuizList.mount($('quiz-list'), { go: 'Kies ▶', play: q => ..., edit: q => ..., remove: q => ... }).
// Met beheer: true (de quizbibliotheek) staan de balken voor niveau en uitleg er niet bij.
// Met 👁 bekijk je een quiz, oefenblad of toets snel: alle vragen met de juiste antwoorden in een venster.
// Met ?quiz=<bestand> in het adres start de quiz meteen in dat spel (vanuit De Zonnewijzer).
// Met kiezen: true (bv. een taak geven) alleen zoeken, mappen openen en kiezen: niets slepen, verplaatsen of exporteren.
// Voor oefenbladen en sessies: ItemList.mount(el, { kind: 'oefenblad', ... }) met dezelfde opties, plus
// detail: q => 'tekst achter de titel' en buttons: [{ label, title, cls, click: q => ... }] voor extra knoppen.
// Gebruikt de globale socket van de pagina.
const ItemList = (() => {
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KINDS = {
    quiz: { list: 'quizzes', folders: 'quiz-folders', one: 'quiz', many: 'quizzen', detail: q => `${q.count} vragen` },
    oefenblad: { list: 'ob-sheets', folders: 'ob-folders', one: 'oefenblad', many: 'oefenbladen', detail: q => `${q.count} ${q.count === 1 ? 'oefening' : 'oefeningen'}` },
    sessie: { list: 'rt-sessions', folders: 'rt-folders', one: 'sessie', many: 'sessies', detail: q => `${q.count} vragen` },
    proef: { list: 'pf-lijst', folders: 'pf-mappen', one: 'toets', many: 'toetsen', detail: q => `${q.count} vragen` },
    // Resultaten zijn Excel-bestanden: ordenen in mappen wel, exporteren en importeren niet (je downloadt ze).
    resultaat: { list: 'res-lijst', folders: 'res-mappen', one: 'resultaat', many: 'resultaten', bestanden: true, detail: q => [q.soort, q.datum].filter(Boolean).join(' · ') },
  };

  const parentOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const baseOf = p => p.slice(p.lastIndexOf('/') + 1);
  const within = (p, root) => p === root || p.startsWith(`${root}/`);
  // Quizzen met vragen op drie niveaus: de klas speelt op één niveau (onthouden op de server).
  const NIVEAUS = [['page', '🪶 Page', 'met hulp'], ['schildknaap', '🛡️ Schildknaap', 'het doel'], ['ridder', '⚔️ Ridder', 'uitdaging'], ['leerling', '👤 Per leerling', 'elke leerling zijn niveau uit Mijn klas, per vak'], ['alle', 'Alles door elkaar', 'alle vragen']];
  const ICONS = { page: '🪶', schildknaap: '🛡️', ridder: '⚔️' };
  let quizNiveau = 'schildknaap';
  let uitlegSpellen = true;
  const uitlegBars = new Set();
  const niveauBars = new Set();

  // 👁 Bekijken: snel alle vragen met de juiste antwoorden zien, zonder te bewerken of te spelen.
  // Een quiz tekenen we hier; een oefenblad of toets toont zijn verbeterblad in het venster.
  const BLADEN = { oefenblad: '/oefenblad-print', proef: '/proef-print' };
  const kanBekijken = kind => kind === 'quiz' || !!BLADEN[kind];
  function bekijk(kind, q) {
    const dlg = document.createElement('dialog');
    dlg.className = `lib-bekijk${BLADEN[kind] ? ' blad' : ''}`;
    dlg.innerHTML = `<div class="lib-bekijk-kop"><h2></h2><button type="button" class="secondary" aria-label="Sluiten">${Ui.ic('kruis')} Sluiten</button></div><div class="lib-bekijk-inhoud"><p class="muted">Even laden…</p></div>`;
    dlg.querySelector('h2').textContent = q.title;
    dlg.querySelector('.lib-bekijk-kop button').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
    const box = dlg.querySelector('.lib-bekijk-inhoud');
    if (BLADEN[kind]) {
      box.innerHTML = `<iframe title="Verbeterblad" src="${BLADEN[kind]}?file=${encodeURIComponent(q.file)}&sleutel=1&bekijk=1"></iframe>`;
      return;
    }
    socket.emit('open-quiz', q.file, res => {
      if (res.error) return (box.innerHTML = `<p class="error">${esc(res.error)}</p>`);
      box.innerHTML = `<ol class="lib-vragen">${res.quiz.questions.map(v => `<li>
        <p class="lib-vraag">${v.niveau || (q.niveaus || []).length > 1 ? `${ICONS[v.niveau || 'schildknaap']} ` : ''}${esc(v.question)}</p>
        <ul>${v.answers.map((a, i) => `<li class="${i === v.correct ? 'juist' : ''}">${i === v.correct ? '✔ ' : ''}${esc(a)}</li>`).join('')}</ul>
        ${v.uitleg ? `<p class="muted small">${esc(v.uitleg)}</p>` : ''}</li>`).join('')}</ol>`;
    });
  }

  function mount(box, opts) {
    const kind = opts.kind || 'quiz';
    const kiezen = !!opts.kiezen;
    if (kind === 'quiz') listenNiveau();
    const k = KINDS[kind];
    const detail = opts.detail || k.detail;
    // Zoals de Verkenner: links de mappen, rechts wat er in de open map zit. Beide onthouden per soort.
    const openKey = `lancelot-mappen-open-${kind}`;
    const hereKey = `lancelot-map-hier-${kind}`;
    let items = null;
    let folders = [];
    let open = new Set();
    let here = '';
    let query = '';
    let note = '';
    let explorer = null;
    // Selecteren: aangevinkte bestanden, ook over mappen heen. last = het laatst aangeklikte item, voor shift-klik.
    let picking = false;
    let picked = new Set();
    let last = null;
    let shown = [];
    try {
      open = new Set(JSON.parse(localStorage.getItem(openKey) || '[]'));
      here = localStorage.getItem(hereKey) || '';
    } catch {}
    const save = () => { try { localStorage.setItem(openKey, JSON.stringify([...open])); localStorage.setItem(hereKey, here); } catch {} };
    const countIn = f => items.filter(q => q.folder && within(q.folder, f)).length;
    const subsOf = f => folders.filter(x => parentOf(x) === f);
    const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // De zoekbalk blijft staan tijdens het typen: alleen de verkenner eronder wordt opnieuw getekend.
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'lib-zoek';
    search.placeholder = `Zoek in alle ${k.many}…`;
    search.setAttribute('aria-label', `Zoek in alle ${k.many}`);
    search.addEventListener('input', () => { query = search.value.trim(); redraw(); });

    function error(res) {
      const el = document.getElementById(opts.errorId || 'load-error');
      if (el) el.textContent = (res && res.error) || '';
    }

    function move(file, folder) {
      socket.emit('lib-move', { kind, file, folder }, error);
    }

    // De selectie naar een map: alleen wat er nog niet in staat.
    function moveMany(files, folder) {
      const todo = files.filter(f => { const q = items.find(x => x.file === f); return q && (q.folder || '') !== folder; });
      if (!todo.length) return;
      socket.emit('lib-move', { kind, file: todo, folder }, res => {
        error(res);
        if (res && res.error) return;
        picked.clear();
        note = `${todo.length} ${todo.length === 1 ? k.one : k.many} verplaatst naar ${folder ? baseOf(folder) : 'bovenaan'}.`;
        render();
      });
    }

    // Een map verplaatsen. Stond je in die map (of dieper), dan ga je mee.
    function moveFolder(from, into) {
      if (from === into || parentOf(from) === into || within(into, from)) return;
      socket.emit('lib-folder-move', { kind, from, into }, res => {
        error(res);
        if (res && res.error || !within(here, from)) return;
        here = (into ? `${into}/` : '') + baseOf(from) + here.slice(from.length);
        save();
        render();
      });
    }

    function go(f) {
      here = f;
      for (let p = f; p; p = parentOf(p)) open.add(p);
      query = '';
      search.value = '';
      save();
      redraw();
    }

    function download(query) {
      const a = document.createElement('a');
      a.href = `/export/${kind}?${new URLSearchParams(query)}`;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // Bestanden van een andere pc inladen, eventueel meteen in een map.
    function importFiles(files, folder) {
      if (k.bestanden) return;
      const list = [...files].filter(f => /\.json$/i.test(f.name) || f.type === 'application/json');
      if (!list.length) return error({ error: 'Kies een .json-bestand dat je met ⬇ Exporteren gemaakt hebt.' });
      error({});
      note = '';
      let total = 0;
      let skipped = 0;
      let tidied = 0;
      let left = list.length;
      for (const file of list) {
        const reader = new FileReader();
        reader.onload = () => {
          socket.emit('lib-import', { kind, text: reader.result, folder }, res => {
            if (res.error) error({ error: `${file.name}: ${res.error}` });
            else { total += res.count; skipped += res.skipped; tidied += res.placed + res.folders; }
            if (--left === 0 && (total || skipped || tidied)) {
              note = total ? `${total} ${total === 1 ? k.one : k.many} geïmporteerd${folder ? ` in ${baseOf(folder)}` : ''}.`
                : tidied ? `De mappen zijn bijgewerkt. De ${k.many} zelf stonden er al.` : 'Niets nieuws: dat stond er al.';
              if (total && skipped) note += ` ${skipped} ${skipped === 1 ? 'stond' : 'stonden'} er al.`;
              render();
            }
          });
        };
        reader.readAsText(file);
      }
    }

    function dragStart(el, data) {
      if (kiezen) return;
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', data);
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
        box.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        box.classList.remove('dragging');
      });
    }

    // Een plek waarop je een item, een map of een geëxporteerd bestand kan laten vallen.
    function dropZone(el, folder) {
      if (kiezen) return;
      el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('over'); });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('over'); });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) return importFiles(e.dataTransfer.files, folder);
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('folder:')) return moveFolder(data.slice(7), folder);
        if (data.startsWith('files:')) return moveMany(JSON.parse(data.slice(6)), folder);
        const file = data.replace(/^file:/, '');
        const q = items.find(x => x.file === file);
        if (q && q.folder !== folder) move(file, folder);
      });
    }

    // Eén item. Bij zoeken staat de map erbij. Verplaatsen kan met slepen of met het mapje (werkt ook op een touchscreen).
    function row(q) {
      const el = document.createElement('div');
      el.className = `quiz-row${picking && picked.has(q.file) ? ' gekozen' : ''}`;
      el.dataset.file = q.file;
      // De keuzelijst krijgt pas al haar mappen als je ze opent: een lange lijst tekent zo veel sneller.
      const option = f => `<option value="${esc(f)}"${f === (q.folder || '') ? ' selected' : ''}>${f ? esc(f.split('/').join(' › ')) : 'Bovenaan, in geen map'}</option>`;
      const place = query && q.folder ? ` · 📁 ${esc(q.folder.split('/').join(' › '))}` : '';
      el.innerHTML = `${picking ? `<input type="checkbox" class="kies" aria-label="Selecteren"${picked.has(q.file) ? ' checked' : ''}>` : kiezen ? '' : `<span class="grip" title="Sleep naar een map">${Ui.ic('grip')}</span>`}
        <button class="play">${esc(q.title)} <span class="muted">· ${esc(detail(q))}${kind === 'quiz' && (q.niveaus || []).length > 1 ? ` · ${q.niveaus.map(n => ICONS[n]).join('')}` : ''}${place}</span>${picking ? '' : `<span class="go">${opts.go || 'Kies ▶'}</span>`}</button>
        ${kanBekijken(kind) && !picking ? `<button class="secondary bekijk" title="Snel bekijken: alle vragen met de juiste antwoorden" aria-label="Bekijken">${Ui.ic('oog')}</button>` : ''}
        ${folders.length && !kiezen ? `<label class="move" title="Verplaats naar…">📁<select aria-label="Verplaats naar…">${option(q.folder || '')}</select></label>` : ''}
        ${(opts.buttons || []).map((b, i) => `<button class="secondary extra ${b.cls || ''}" data-extra="${i}" title="${esc(b.title || '')}">${b.label}</button>`).join('')}
        ${opts.edit ? '<button class="secondary edit">Bewerken</button>' : ''}
        ${kiezen || k.bestanden ? '' : `<button class="secondary export" title="Exporteren naar een bestand" aria-label="Exporteren">${Ui.ic('download')}</button>`}
        ${opts.remove ? `<button class="secondary delete" title="Verwijderen" aria-label="Verwijderen">${Ui.ic('kruis')}</button>` : ''}`;
      if (picking) {
        const tick = el.querySelector('.kies');
        const pick = e => {
          // Shift-klik: alles tussen het vorige en dit item krijgt dezelfde keuze.
          const on = e.target === tick ? tick.checked : !picked.has(q.file);
          const a = shown.indexOf(last);
          const b = shown.indexOf(q.file);
          const range = e.shiftKey && a >= 0 ? shown.slice(Math.min(a, b), Math.max(a, b) + 1) : [q.file];
          for (const f of range) if (on) picked.add(f); else picked.delete(f);
          last = q.file;
          redraw();
        };
        tick.addEventListener('click', pick);
        el.querySelector('.play').addEventListener('click', pick);
      } else el.querySelector('.play').addEventListener('click', () => opts.play(q));
      const oog = el.querySelector('.bekijk');
      if (oog) oog.addEventListener('click', () => bekijk(kind, q));
      if (opts.edit) el.querySelector('.edit').addEventListener('click', () => opts.edit(q));
      if (!kiezen && !k.bestanden) el.querySelector('.export').addEventListener('click', () => download({ file: q.file }));
      for (const b of el.querySelectorAll('[data-extra]')) b.addEventListener('click', () => opts.buttons[b.dataset.extra].click(q));
      if (opts.remove) el.querySelector('.delete').addEventListener('click', () => opts.remove(q));
      const select = el.querySelector('.move select');
      if (select) {
        const fill = () => { if (select.options.length < 2) select.innerHTML = ['', ...folders].map(option).join(''); };
        select.addEventListener('pointerdown', fill);
        select.addEventListener('focus', fill);
        select.addEventListener('change', () => move(q.file, select.value));
      }
      // Sleep je een aangevinkt item, dan gaat de hele selectie mee.
      dragStart(el, picking && picked.has(q.file) ? `files:${JSON.stringify([...picked])}` : `file:${q.file}`);
      return el;
    }

    // Links: de mappenboom. Alleen de mappen die je openklapt tonen hun mappen; de items staan rechts.
    function tree() {
      const nav = document.createElement('nav');
      nav.className = 'lib-tree';
      nav.setAttribute('aria-label', 'Mappen');
      nav.appendChild(node('', 0));
      const add = (parent, depth) => {
        for (const f of subsOf(parent)) {
          nav.appendChild(node(f, depth));
          if (open.has(f)) add(f, depth + 1);
        }
      };
      add('', 1);
      // De boom is breder te slepen (hoekje rechtsonder); die breedte onthouden we.
      try { const w = localStorage.getItem('lancelot-boom-breedte'); if (w) nav.style.width = `${w}px`; } catch {}
      nav.addEventListener('pointerup', () => {
        try { if (nav.style.width) localStorage.setItem('lancelot-boom-breedte', parseInt(nav.style.width, 10)); } catch {}
      });
      return nav;
    }

    function node(f, depth) {
      const subs = f && subsOf(f).length;
      const el = document.createElement('div');
      el.className = `lib-node${f === here && !query ? ' on' : ''}${open.has(f) ? ' open' : ''}`;
      el.style.paddingLeft = `${depth * 10}px`;
      el.innerHTML = `<button type="button" class="chev${subs ? '' : ' none'}" aria-label="Open- of dichtklappen" tabindex="${subs ? 0 : -1}">▸</button>
        <button type="button" class="lib-open"><span class="lib-naam"></span><span class="muted">${f ? countIn(f) : items.length}</span></button>`;
      el.querySelector('.lib-naam').textContent = f ? `📁 ${baseOf(f)}` : `Alle ${k.many}`;
      el.querySelector('.lib-open').title = f ? f.split('/').join(' › ') : `Alle ${k.many}`;
      el.querySelector('.lib-open').addEventListener('click', () => go(f));
      el.querySelector('.chev').addEventListener('click', () => {
        if (!subs) return;
        if (open.has(f)) open.delete(f); else open.add(f);
        save();
        redraw();
      });
      if (f) dragStart(el, `folder:${f}`);
      dropZone(el, f);
      return el;
    }

    // Rechts: het kruimelpad met de knoppen van de open map, de mappen erin en de items erin (of de zoekresultaten).
    function main() {
      const m = document.createElement('div');
      m.className = 'lib-main';
      const path = document.createElement('div');
      path.className = 'lib-path';
      if (query) path.innerHTML = `<span class="muted">Zoeken in alle ${k.many}</span>`;
      else {
        const crumbs = [''];
        for (let p = here; p; p = parentOf(p)) crumbs.splice(1, 0, p);
        crumbs.forEach((c, i) => {
          if (i) path.insertAdjacentHTML('beforeend', '<span class="muted sep">›</span>');
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `crumb${c === here ? ' on' : ''}`;
          b.textContent = c ? baseOf(c) : `Alle ${k.many}`;
          b.addEventListener('click', () => go(c));
          dropZone(b, c);
          path.appendChild(b);
        });
        if (here && !kiezen) path.appendChild(folderButtons(here));
      }
      m.appendChild(path);
      if (picking) m.appendChild(pickBar());
      const list = query ? items.filter(q => norm(`${q.title} ${q.folder || ''}`).includes(norm(query))) : items.filter(q => (q.folder || '') === here);
      const subs = query ? [] : subsOf(here);
      if (subs.length) {
        const chips = document.createElement('div');
        chips.className = 'lib-sub';
        for (const f of subs) {
          const n = countIn(f);
          const c = document.createElement('button');
          c.type = 'button';
          c.className = 'lib-chip';
          c.innerHTML = `📁 <strong></strong> <span class="muted">${n}</span>`;
          c.querySelector('strong').textContent = baseOf(f);
          c.title = `${n} ${n === 1 ? k.one : k.many}`;
          c.addEventListener('click', () => go(f));
          dragStart(c, `folder:${f}`);
          dropZone(c, f);
          chips.appendChild(c);
        }
        m.appendChild(chips);
      }
      shown = list.map(q => q.file);
      for (const q of list) m.appendChild(row(q));
      if (!list.length && !subs.length) {
        m.insertAdjacentHTML('beforeend', query ? `<p class="muted small lib-leeg">Geen ${k.many} gevonden met "${esc(query)}".</p>`
          : kiezen ? `<p class="muted small lib-leeg">${here ? 'Deze map is leeg.' : `Geen ${k.many} buiten de mappen: open links een map.`}</p>`
          : `<p class="muted small lib-leeg">${here ? 'Deze map is leeg.' : `Nog geen ${k.many} buiten de mappen.`} Sleep een ${k.one} hierheen, of kies het mapje 📁 bij een ${k.one}.</p>`);
      }
      if (!query) dropZone(m, here);
      return m;
    }

    // De balk tijdens het selecteren: alles hier, niets, dubbels, en verwijderen.
    function pickBar() {
      for (const f of picked) if (!items.some(q => q.file === f)) picked.delete(f);
      const n = picked.size;
      const el = document.createElement('div');
      el.className = 'lib-kies';
      el.innerHTML = `<strong>${n} ${n === 1 ? k.one : k.many} geselecteerd</strong>
        <button class="secondary" type="button" data-do="alles">Alles hier</button>
        <button class="secondary" type="button" data-do="niets"${n ? '' : ' disabled'}>Niets</button>
        ${k.bestanden ? '' : `<button class="secondary" type="button" data-do="dubbels" title="Kiest overal de ${k.many} met dezelfde titel en hetzelfde aantal als een andere. Eén ervan blijft telkens staan.">Dubbels</button>`}
        ${folders.length ? `<label class="button secondary lib-kies-map${n ? '' : ' disabled'}" title="De selectie naar een map verplaatsen">📁 Verplaats naar…<select aria-label="Verplaats naar…"${n ? '' : ' disabled'}><option value="" disabled selected>Kies een map</option><option value="">Bovenaan, in geen map</option>${folders.map(f => `<option value="${esc(f)}">${esc(f.split('/').join(' › '))}</option>`).join('')}</select></label>` : ''}
        <button class="danger" type="button" data-do="weg"${n ? '' : ' disabled'}>${Ui.ic('kruis')} Verwijderen</button>
        <span class="muted small lib-kies-tip">Shift-klik kiest een reeks. Sleep een aangevinkte naar een map: alles gaat mee.</span>`;
      const on = (what, fn) => el.querySelector(`[data-do=${what}]`).addEventListener('click', fn);
      on('alles', () => { for (const f of shown) picked.add(f); redraw(); });
      on('niets', () => { picked.clear(); redraw(); });
      const map = el.querySelector('.lib-kies-map select');
      if (map) map.addEventListener('change', () => moveMany([...picked], map.value));
      if (!k.bestanden) on('dubbels', () => {
        const seen = new Set();
        let found = 0;
        for (const q of items) {
          const key = `${norm(q.title).trim()}|${q.count}`;
          if (!seen.has(key)) { seen.add(key); continue; }
          if (!picked.has(q.file)) found++;
          picked.add(q.file);
        }
        note = found ? `${found} ${found === 1 ? 'dubbel' : 'dubbels'} gekozen, in alle mappen.` : 'Geen dubbels gevonden.';
        render();
      });
      on('weg', async () => {
        const files = [...picked];
        const names = items.filter(q => picked.has(q.file)).slice(0, 5).map(q => `"${q.title}"`).join(', ');
        const more = files.length > 5 ? ` en nog ${files.length - 5}` : '';
        if (!await Ui.vraag(`${files.length} ${files.length === 1 ? k.one : k.many} verwijderen? ${names}${more}. Ze blijven nog 30 dagen in de map _prullenbak.`)) return;
        socket.emit('lib-remove', { kind, files }, res => {
          error(res);
          if (res && res.error) return;
          picked.clear();
          note = `${res.count} ${res.count === 1 ? k.one : k.many} verwijderd.`;
          render();
        });
      });
      return el;
    }

    // De knoppen van de open map: map erin, naam wijzigen, exporteren en verwijderen.
    function folderButtons(f) {
      const total = countIn(f);
      const subs = subsOf(f);
      const el = document.createElement('span');
      el.className = 'lib-map-knoppen';
      el.innerHTML = `${(total || subs.length) && !k.bestanden ? `<button class="secondary" type="button" data-do="export" title="Deze map (met de mappen erin) exporteren naar een bestand" aria-label="Map exporteren">${Ui.ic('download')}</button>` : ''}
        <button class="secondary" type="button" data-do="rename" title="Naam van de map wijzigen" aria-label="Naam wijzigen">✎</button>
        <button class="secondary" type="button" data-do="delete" title="Map verwijderen" aria-label="Map verwijderen">${Ui.ic('kruis')}</button>`;
      const on = (what, fn) => { const b = el.querySelector(`[data-do=${what}]`); if (b) b.addEventListener('click', fn); };
      on('export', () => download({ folder: f }));
      on('rename', () => {
        const to = (prompt('Nieuwe naam voor de map:', baseOf(f)) || '').trim();
        if (!to || to === baseOf(f)) return;
        socket.emit('lib-folder-rename', { kind, from: f, to }, res => {
          error(res);
          if (res && res.error) return;
          here = (parentOf(f) ? `${parentOf(f)}/` : '') + to;
          save();
          render();
        });
      });
      on('delete', async () => {
        const where = parentOf(f) ? `in de map "${baseOf(parentOf(f))}"` : 'bovenaan, in geen map';
        const extra = subs.length ? ' De mappen erin verdwijnen ook.' : '';
        if (await Ui.vraag(`De map "${baseOf(f)}" verwijderen?${extra} De ${k.many} erin blijven bewaard, ${where}.`)) socket.emit('lib-folder-remove', { kind, name: f }, error);
      });
      return el;
    }

    function redraw() {
      if (!explorer) return render();
      const next = explorerView();
      explorer.replaceWith(next);
      explorer = next;
    }

    function explorerView() {
      const el = document.createElement('div');
      el.className = 'lib';
      // Nog geen mappen: dan is een boom met alleen "Alle quizzen" overbodig.
      if (folders.length) el.append(tree(), main());
      else { el.classList.add('zonder-boom'); el.append(main()); }
      return el;
    }

    function render() {
      if (!items) return;
      // Bestaat de open map niet meer (verwijderd, of alles leeggemaakt), dan sta je weer bovenaan.
      while (here && !folders.includes(here)) here = parentOf(here);
      const typing = document.activeElement === search;
      box.innerHTML = '';
      explorer = null;
      const bar = document.createElement('div');
      bar.className = 'quiz-tools';
      bar.innerHTML = kiezen ? '<span class="muted small lib-note"></span>' : `<span class="muted small lib-note"></span>
        ${items.length && opts.remove ? `<button class="secondary small-btn kies-knop${picking ? ' on' : ''}" type="button" title="Meerdere ${k.many} aanvinken, bijvoorbeeld om ze samen te verwijderen">${picking ? 'Klaar met selecteren' : '☑ Selecteren'}</button>` : ''}
        <button class="secondary small-btn new-folder" type="button">${Ui.ic('map')} Nieuwe map</button>
        ${k.bestanden ? '' : `<label class="button secondary small-btn" title="Een bestand van ⬇ Exporteren inladen, bijvoorbeeld van je laptop thuis">${Ui.ic('upload')} Importeren<input type="file" accept=".json,application/json" multiple hidden></label>`}
        ${items.length && !k.bestanden ? `<button class="secondary small-btn export-all" type="button" title="Alle ${k.many} met hun mappen in één bestand">${Ui.ic('download')} Alles exporteren</button>` : ''}`;
      bar.querySelector('.lib-note').textContent = note;
      if (items.length || folders.length) bar.prepend(search);
      if (!kiezen) bar.querySelector('.new-folder').addEventListener('click', () => {
        const parent = query ? '' : here;
        const name = prompt(parent ? `Naam van de nieuwe map in "${baseOf(parent)}":` : 'Naam van de nieuwe map (bijvoorbeeld een vak of een klas):');
        if (!name) return;
        if (parent) { open.add(parent); save(); }
        socket.emit('lib-folder-add', { kind, name, parent }, error);
      });
      const input = bar.querySelector('input[type=file]');
      if (input) input.addEventListener('change', () => { importFiles(input.files, query ? '' : here); input.value = ''; });
      const kies = bar.querySelector('.kies-knop');
      if (kies) kies.addEventListener('click', () => { picking = !picking; picked.clear(); last = null; note = ''; render(); });
      const all = bar.querySelector('.export-all');
      if (all) all.addEventListener('click', () => download({}));
      box.appendChild(bar);
      if (typing) search.focus();
      if (kind === 'quiz' && !opts.beheer && !kiezen && items.some(q => (q.niveaus || []).length > 1)) {
        const lv = document.createElement('div');
        lv.className = 'quiz-niveau-bar';
        box.appendChild(lv);
        niveauBars.add(lv);
        renderNiveauBar(lv);
      }
      // In de spellen kan de leerkracht de uitleg na een fout antwoord uitzetten. In het Toernooi staat ze altijd aan.
      if (kind === 'quiz' && !opts.beheer && !kiezen && location.pathname !== '/host') {
        const ub = document.createElement('label');
        ub.className = 'quiz-uitleg-bar';
        box.appendChild(ub);
        uitlegBars.add(ub);
        renderUitlegBar(ub);
      }
      if (items.length === 0 && folders.length === 0) {
        box.insertAdjacentHTML('beforeend', `<div class="leeg"><p>Nog geen ${k.many}.</p><p class="muted small">${k.bestanden ? 'Speel eerst een quiz, spel, oefenblad of toets tot het einde: dan staan de scores hier, klaar voor Excel.' : kiezen ? `Maak of importeer eerst ${k.many} in De Smidse.` : 'Maak er een met de knoppen hierboven, of importeer een bestand.'}</p></div>`);
        return;
      }
      explorer = explorerView();
      box.appendChild(explorer);
    }

    // Een bestand ergens op de lijst laten vallen: importeren in de open map.
    if (!kiezen) box.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    box.addEventListener('drop', e => {
      if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      importFiles(e.dataTransfer.files, query ? '' : here);
    });
    // opts.startFolder: deze map meteen openen (bv. Voorkennis vanuit De Ronde Tafel), één keer.
    let start = opts.startFolder || '';
    socket.on(k.folders, list => {
      folders = list;
      const match = start && folders.find(f => norm(f) === norm(start));
      if (match) { here = match; for (let p = match; p; p = parentOf(p)) open.add(p); save(); }
      else if (start) note = `Nog geen map "${start}". Importeer het bestand hier met Importeren.`;
      start = '';
      render();
    });
    socket.on(k.list, list => {
      items = list;
      render();
      if (kind === 'quiz' && !kiezen && !opts.beheer) startUitAdres(items, opts.play, error);
    });
  }

  // /laserslag?quiz=… (een les in De Zonnewijzer): die quiz meteen laden in dit spel, één keer per pagina.
  let gestart = false;
  function startUitAdres(lijst, play, error) {
    if (gestart || !play) return;
    const vraag = new URLSearchParams(location.search);
    const file = vraag.get('quiz');
    if (!file) return;
    gestart = true;
    vraag.delete('quiz');
    try { history.replaceState(null, '', `${location.pathname}${vraag.toString() ? `?${vraag}` : ''}${location.hash}`); } catch {}
    const q = lijst.find(x => x.file === file);
    if (q) play(q);
    else error({ error: 'Die quiz bestaat niet meer. Kies er hieronder een.' });
  }

  // Geldt voor elke quiz met niveaus. Een quiz zonder niveaus speelt altijd alle vragen.
  function renderNiveauBar(lv) {
    lv.innerHTML = `<strong>Niveau van de klas:</strong> <span class="niveau-pick">${NIVEAUS.map(([n, label, help]) => `<button type="button" class="secondary${n === quizNiveau ? ' on' : ''}" data-niveau="${n}" title="${help}">${label}</button>`).join('')}</span>
      <span class="muted small">voor quizzen met ${Object.values(ICONS).join('')}</span>
      <details class="hulp"><summary aria-label="Uitleg">?</summary><p>Sommige quizzen hebben elke vraag in drie versies: 🪶 makkelijker, 🛡️ op het doel en ⚔️ moeilijker. Hier kies je welke versie de klas krijgt. Met 👤 Per leerling krijgt elke leerling de versie van zijn niveau uit Mijn klas.</p></details>`;
    for (const b of lv.querySelectorAll('button')) b.addEventListener('click', () => socket.emit('quiz-niveau', b.dataset.niveau));
  }
  function renderUitlegBar(ub) {
    ub.innerHTML = `<input type="checkbox"${uitlegSpellen ? ' checked' : ''}> <strong>Uitleg na een fout antwoord</strong> <span class="muted small">de leerling ziet even waarom zijn antwoord fout was (voor vragen met uitleg)</span>`;
    ub.querySelector('input').addEventListener('change', e => socket.emit('uitleg-spellen', e.target.checked));
  }
  let listening = false;
  function listenNiveau() {
    if (listening) return;
    listening = true;
    socket.on('uitleg-spellen', aan => {
      uitlegSpellen = aan;
      for (const ub of uitlegBars) {
        if (ub.isConnected) renderUitlegBar(ub);
        else uitlegBars.delete(ub);
      }
    });
    socket.on('quiz-niveau', n => {
      quizNiveau = n;
      for (const lv of niveauBars) {
        if (lv.isConnected) renderNiveauBar(lv);
        else niveauBars.delete(lv);
      }
    });
  }

  return { mount };
})();

// Elke quizlijst kan een quiz verwijderen, in elk spel (een pagina mag een eigen remove meegeven).
const QuizList = {
  mount: (el, opts) => ItemList.mount(el, {
    remove: async q => {
      if (!await Ui.vraag(`"${q.title}" verwijderen?`)) return;
      socket.emit('delete', q.file, res => {
        const err = document.getElementById(opts.errorId || 'load-error');
        if (err) err.textContent = (res && res.error) || '';
      });
    },
    ...opts,
    kind: 'quiz',
  }),
};
