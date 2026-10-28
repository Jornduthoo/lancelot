// De lijst met quizzen, oefenbladen of Ronde Tafel-sessies op elk docentenscherm, geordend in mappen.
// Zoals de Verkenner: links de mappenboom, rechts de items van de open map met een kruimelpad erboven, en een
// zoekbalk die in alle mappen zoekt. Items en mappen sleep je naar een map (links, in het kruimelpad of op een
// mapje rechts), of je kiest de map met het mapje 📁 in de rij (ook op een touchscreen).
// Met ⬇ exporteer je een item, een map of alles naar een bestand; met ⬆ Importeren (of door een bestand
// op de lijst te slepen) laad je dat op een andere pc weer in.
// Gebruik: QuizList.mount($('quiz-list'), { go: 'Kies ▶', play: q => ..., edit: q => ..., remove: q => ... }).
// Met beheer: true (de quizbibliotheek) staan de balken voor niveau en uitleg er niet bij.
// Voor oefenbladen en sessies: ItemList.mount(el, { kind: 'oefenblad', ... }) met dezelfde opties, plus
// detail: q => 'tekst achter de titel' en buttons: [{ label, title, cls, click: q => ... }] voor extra knoppen.
// Gebruikt de globale socket van de pagina.
const ItemList = (() => {
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KINDS = {
    quiz: { list: 'quizzes', folders: 'quiz-folders', one: 'quiz', many: 'quizzen', detail: q => `${q.count} vragen` },
    oefenblad: { list: 'ob-sheets', folders: 'ob-folders', one: 'oefenblad', many: 'oefenbladen', detail: q => `${q.count} ${q.count === 1 ? 'oefening' : 'oefeningen'}` },
    sessie: { list: 'rt-sessions', folders: 'rt-folders', one: 'sessie', many: 'sessies', detail: q => `${q.count} vragen` },
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

  function mount(box, opts) {
    const kind = opts.kind || 'quiz';
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
      el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('over'); });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('over'); });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) return importFiles(e.dataTransfer.files, folder);
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('folder:')) return moveFolder(data.slice(7), folder);
        const file = data.replace(/^file:/, '');
        const q = items.find(x => x.file === file);
        if (q && q.folder !== folder) move(file, folder);
      });
    }

    // Eén item. Bij zoeken staat de map erbij. Verplaatsen kan met slepen of met het mapje (werkt ook op een touchscreen).
    function row(q) {
      const el = document.createElement('div');
      el.className = 'quiz-row';
      el.dataset.file = q.file;
      // De keuzelijst krijgt pas al haar mappen als je ze opent: een lange lijst tekent zo veel sneller.
      const option = f => `<option value="${esc(f)}"${f === (q.folder || '') ? ' selected' : ''}>${f ? esc(f.split('/').join(' › ')) : 'Bovenaan, in geen map'}</option>`;
      const place = query && q.folder ? ` · 📁 ${esc(q.folder.split('/').join(' › '))}` : '';
      el.innerHTML = `<span class="grip" title="Sleep naar een map">${Ui.ic('grip')}</span>
        <button class="play">${esc(q.title)} <span class="muted">· ${esc(detail(q))}${kind === 'quiz' && (q.niveaus || []).length > 1 ? ` · ${q.niveaus.map(n => ICONS[n]).join('')}` : ''}${place}</span><span class="go">${opts.go || 'Kies ▶'}</span></button>
        ${folders.length ? `<label class="move" title="Verplaats naar…">📁<select aria-label="Verplaats naar…">${option(q.folder || '')}</select></label>` : ''}
        ${(opts.buttons || []).map((b, i) => `<button class="secondary extra ${b.cls || ''}" data-extra="${i}" title="${esc(b.title || '')}">${b.label}</button>`).join('')}
        ${opts.edit ? '<button class="secondary edit">Bewerken</button>' : ''}
        <button class="secondary export" title="Exporteren naar een bestand" aria-label="Exporteren">${Ui.ic('download')}</button>
        ${opts.remove ? `<button class="secondary delete" title="Verwijderen" aria-label="Verwijderen">${Ui.ic('kruis')}</button>` : ''}`;
      el.querySelector('.play').addEventListener('click', () => opts.play(q));
      if (opts.edit) el.querySelector('.edit').addEventListener('click', () => opts.edit(q));
      el.querySelector('.export').addEventListener('click', () => download({ file: q.file }));
      for (const b of el.querySelectorAll('[data-extra]')) b.addEventListener('click', () => opts.buttons[b.dataset.extra].click(q));
      if (opts.remove) el.querySelector('.delete').addEventListener('click', () => opts.remove(q));
      const select = el.querySelector('.move select');
      if (select) {
        const fill = () => { if (select.options.length < 2) select.innerHTML = ['', ...folders].map(option).join(''); };
        select.addEventListener('pointerdown', fill);
        select.addEventListener('focus', fill);
        select.addEventListener('change', () => move(q.file, select.value));
      }
      dragStart(el, `file:${q.file}`);
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
      return nav;
    }

    function node(f, depth) {
      const subs = f && subsOf(f).length;
      const el = document.createElement('div');
      el.className = `lib-node${f === here && !query ? ' on' : ''}${open.has(f) ? ' open' : ''}`;
      el.style.paddingLeft = `${depth * 14}px`;
      el.innerHTML = `<button type="button" class="chev${subs ? '' : ' none'}" aria-label="Open- of dichtklappen" tabindex="${subs ? 0 : -1}">▸</button>
        <button type="button" class="lib-open"><span class="lib-naam"></span><span class="muted">${f ? countIn(f) : items.length}</span></button>`;
      el.querySelector('.lib-naam').textContent = f ? `📁 ${baseOf(f)}` : `Alle ${k.many}`;
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
        if (here) path.appendChild(folderButtons(here));
      }
      m.appendChild(path);
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
      for (const q of list) m.appendChild(row(q));
      if (!list.length && !subs.length) {
        m.insertAdjacentHTML('beforeend', query ? `<p class="muted small lib-leeg">Geen ${k.many} gevonden met "${esc(query)}".</p>`
          : `<p class="muted small lib-leeg">${here ? 'Deze map is leeg.' : `Nog geen ${k.many} buiten de mappen.`} Sleep een ${k.one} hierheen, of kies het mapje 📁 bij een ${k.one}.</p>`);
      }
      if (!query) dropZone(m, here);
      return m;
    }

    // De knoppen van de open map: map erin, naam wijzigen, exporteren en verwijderen.
    function folderButtons(f) {
      const total = countIn(f);
      const subs = subsOf(f);
      const el = document.createElement('span');
      el.className = 'lib-map-knoppen';
      el.innerHTML = `${total || subs.length ? `<button class="secondary" type="button" data-do="export" title="Deze map (met de mappen erin) exporteren naar een bestand" aria-label="Map exporteren">${Ui.ic('download')}</button>` : ''}
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
      bar.innerHTML = `<span class="muted small lib-note"></span>
        <button class="secondary small-btn new-folder" type="button">${Ui.ic('map')} Nieuwe map</button>
        <label class="button secondary small-btn" title="Een bestand van ⬇ Exporteren inladen, bijvoorbeeld van je laptop thuis">${Ui.ic('upload')} Importeren<input type="file" accept=".json,application/json" multiple hidden></label>
        ${items.length ? `<button class="secondary small-btn export-all" type="button" title="Alle ${k.many} met hun mappen in één bestand">${Ui.ic('download')} Alles exporteren</button>` : ''}`;
      bar.querySelector('.lib-note').textContent = note;
      if (items.length || folders.length) bar.prepend(search);
      bar.querySelector('.new-folder').addEventListener('click', () => {
        const parent = query ? '' : here;
        const name = prompt(parent ? `Naam van de nieuwe map in "${baseOf(parent)}":` : 'Naam van de nieuwe map (bijvoorbeeld een vak of een klas):');
        if (!name) return;
        if (parent) { open.add(parent); save(); }
        socket.emit('lib-folder-add', { kind, name, parent }, error);
      });
      const input = bar.querySelector('input[type=file]');
      input.addEventListener('change', () => { importFiles(input.files, query ? '' : here); input.value = ''; });
      const all = bar.querySelector('.export-all');
      if (all) all.addEventListener('click', () => download({}));
      box.appendChild(bar);
      if (typing) search.focus();
      if (kind === 'quiz' && !opts.beheer && items.some(q => (q.niveaus || []).length > 1)) {
        const lv = document.createElement('div');
        lv.className = 'quiz-niveau-bar';
        box.appendChild(lv);
        niveauBars.add(lv);
        renderNiveauBar(lv);
      }
      // In de spellen kan de leerkracht de uitleg na een fout antwoord uitzetten. In het Toernooi staat ze altijd aan.
      if (kind === 'quiz' && !opts.beheer && location.pathname !== '/host') {
        const ub = document.createElement('label');
        ub.className = 'quiz-uitleg-bar';
        box.appendChild(ub);
        uitlegBars.add(ub);
        renderUitlegBar(ub);
      }
      if (items.length === 0 && folders.length === 0) {
        box.insertAdjacentHTML('beforeend', `<div class="leeg"><p>Nog geen ${k.many}.</p><p class="muted small">Maak er een met de knoppen hierboven, of importeer een bestand.</p></div>`);
        return;
      }
      explorer = explorerView();
      box.appendChild(explorer);
    }

    // Een bestand ergens op de lijst laten vallen: importeren in de open map.
    box.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    box.addEventListener('drop', e => {
      if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      importFiles(e.dataTransfer.files, query ? '' : here);
    });
    socket.on(k.folders, list => { folders = list; render(); });
    socket.on(k.list, list => { items = list; render(); });
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
