// De lijst met quizzen, oefenbladen of Ronde Tafel-sessies op elk docentenscherm, geordend in mappen.
// Items sleep je naar een map (of kies de map met het mapje in de rij). Mappen kunnen in mappen zitten:
// maak ze met +📁 en sleep een map aan haar kop naar een andere map. Mappen klappen open en dicht.
// Met ⬇ exporteer je een item, een map of alles naar een bestand; met ⬆ Importeren (of door een bestand
// op de lijst te slepen) laad je dat op een andere pc weer in.
// Gebruik: QuizList.mount($('quiz-list'), { go: 'Kies ▶', play: q => ..., edit: q => ..., remove: q => ... }).
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
  const niveauBars = new Set();

  function mount(box, opts) {
    const kind = opts.kind || 'quiz';
    if (kind === 'quiz') listenNiveau();
    const k = KINDS[kind];
    const detail = opts.detail || k.detail;
    const storeKey = kind === 'quiz' ? 'lancelot-closed-folders' : `lancelot-closed-folders-${kind}`;
    let items = null;
    let folders = [];
    let closed = new Set();
    let note = '';
    try { closed = new Set(JSON.parse(localStorage.getItem(storeKey) || '[]')); } catch {}
    const saveClosed = () => { try { localStorage.setItem(storeKey, JSON.stringify([...closed])); } catch {} };

    function error(res) {
      const el = document.getElementById(opts.errorId || 'load-error');
      if (el) el.textContent = (res && res.error) || '';
    }

    function move(file, folder) {
      socket.emit('lib-move', { kind, file, folder }, error);
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

    function row(q) {
      const el = document.createElement('div');
      el.className = 'quiz-row';
      el.draggable = true;
      el.dataset.file = q.file;
      const options = ['<option value="">Zonder map</option>', ...folders.map(f => `<option value="${esc(f)}"${f === q.folder ? ' selected' : ''}>${esc(f.split('/').join(' › '))}</option>`)].join('');
      el.innerHTML = `<span class="grip" title="Sleep naar een map">${Ui.ic('grip')}</span>
        <button class="play">${esc(q.title)} <span class="muted">· ${esc(detail(q))}${kind === 'quiz' && (q.niveaus || []).length > 1 ? ` · ${q.niveaus.map(n => ICONS[n]).join('')}` : ''}</span><span class="go">${opts.go || 'Kies ▶'}</span></button>
        ${folders.length ? `<label class="move" title="Naar een andere map">📁<select>${options}</select></label>` : ''}
        ${(opts.buttons || []).map((b, i) => `<button class="secondary extra ${b.cls || ''}" data-extra="${i}" title="${esc(b.title || '')}">${b.label}</button>`).join('')}
        <button class="secondary edit">Bewerken</button>
        <button class="secondary export" title="Exporteren naar een bestand" aria-label="Exporteren">${Ui.ic('download')}</button>
        ${opts.remove ? `<button class="secondary delete" title="Verwijderen" aria-label="Verwijderen">${Ui.ic('kruis')}</button>` : ''}`;
      el.querySelector('.play').addEventListener('click', () => opts.play(q));
      el.querySelector('.edit').addEventListener('click', () => opts.edit(q));
      el.querySelector('.export').addEventListener('click', () => download({ file: q.file }));
      for (const b of el.querySelectorAll('[data-extra]')) b.addEventListener('click', () => opts.buttons[b.dataset.extra].click(q));
      if (opts.remove) el.querySelector('.delete').addEventListener('click', () => opts.remove(q));
      const select = el.querySelector('.move select');
      if (select) select.addEventListener('change', () => move(q.file, select.value));
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', `file:${q.file}`);
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
        box.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        box.classList.remove('dragging');
      });
      return el;
    }

    // Een map (of "Zonder map") waarop je een item of een andere map kan laten vallen, of een geëxporteerd bestand.
    function dropZone(el, folder) {
      el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('over'); });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('over'); });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) return importFiles(e.dataTransfer.files, folder);
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('folder:')) {
          const from = data.slice(7);
          if (from !== folder && parentOf(from) !== folder) socket.emit('lib-folder-move', { kind, from, into: folder }, error);
          return;
        }
        const file = data.replace(/^file:/, '');
        const q = items.find(x => x.file === file);
        if (q && q.folder !== folder) move(file, folder);
      });
    }

    // Een map met de mappen en items erin. Mappen sleep je aan hun kop naar een andere map.
    function folderSection(f) {
      const inside = items.filter(q => q.folder === f);
      const total = items.filter(q => q.folder && within(q.folder, f)).length;
      const subs = folders.filter(x => parentOf(x) === f);
      const sec = document.createElement('section');
      sec.className = `quiz-folder${closed.has(f) ? ' closed' : ''}`;
      sec.dataset.folder = f;
      sec.innerHTML = `<div class="folder-head" draggable="true">
          <span class="grip" title="Sleep naar een andere map">${Ui.ic('grip')}</span>
          <button class="folder-toggle" type="button"><span class="chev">▾</span> 📁 <strong></strong> <span class="muted">· ${total} ${total === 1 ? k.one : k.many}${subs.length ? ` · ${subs.length} ${subs.length === 1 ? 'map' : 'mappen'}` : ''}</span></button>
          <button class="secondary sub" type="button" title="Nieuwe map in deze map">+📁</button>
          ${total || subs.length ? `<button class="secondary export" type="button" title="Deze map (met de mappen erin) exporteren naar een bestand" aria-label="Map exporteren">${Ui.ic('download')}</button>` : ''}
          <button class="secondary rename" type="button" title="Naam wijzigen">✎</button>
          <button class="secondary delete" type="button" title="Map verwijderen" aria-label="Map verwijderen">${Ui.ic('kruis')}</button>
        </div><div class="folder-body"></div>`;
      sec.querySelector('strong').textContent = baseOf(f);
      sec.querySelector('.folder-toggle').addEventListener('click', () => {
        if (closed.has(f)) closed.delete(f); else closed.add(f);
        saveClosed();
        sec.classList.toggle('closed');
      });
      sec.querySelector('.sub').addEventListener('click', () => {
        const name = prompt(`Naam van de nieuwe map in "${baseOf(f)}":`);
        if (!name) return;
        closed.delete(f);
        saveClosed();
        socket.emit('lib-folder-add', { kind, name, parent: f }, error);
      });
      const exp = sec.querySelector('.export');
      if (exp) exp.addEventListener('click', () => download({ folder: f }));
      sec.querySelector('.rename').addEventListener('click', () => {
        const to = prompt('Nieuwe naam voor de map:', baseOf(f));
        if (to && to !== baseOf(f)) socket.emit('lib-folder-rename', { kind, from: f, to }, error);
      });
      sec.querySelector('.delete').addEventListener('click', async () => {
        const where = parentOf(f) ? `in de map "${baseOf(parentOf(f))}"` : 'zonder map';
        const extra = subs.length ? ' De mappen erin verdwijnen ook.' : '';
        if (await Ui.vraag(`De map "${baseOf(f)}" verwijderen?${extra} De ${k.many} erin blijven bewaard, ${where}.`)) socket.emit('lib-folder-remove', { kind, name: f }, error);
      });
      const head = sec.querySelector('.folder-head');
      head.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', `folder:${f}`);
        e.dataTransfer.effectAllowed = 'move';
        sec.classList.add('dragging');
        box.classList.add('dragging');
      });
      head.addEventListener('dragend', () => {
        sec.classList.remove('dragging');
        box.classList.remove('dragging');
      });
      const body = sec.querySelector('.folder-body');
      for (const sub of subs) body.appendChild(folderSection(sub));
      if (inside.length === 0 && subs.length === 0) body.innerHTML = `<p class="muted small folder-empty">Sleep een ${k.one} of een map hierheen.</p>`;
      for (const q of inside) body.appendChild(row(q));
      dropZone(sec, f);
      return sec;
    }

    function render() {
      if (!items) return;
      box.innerHTML = '';
      const bar = document.createElement('div');
      bar.className = 'quiz-tools';
      bar.innerHTML = `<span class="muted small lib-note"></span>
        <button class="secondary small-btn new-folder" type="button">${Ui.ic('map')} Nieuwe map</button>
        <label class="button secondary small-btn" title="Een bestand van ⬇ Exporteren inladen, bijvoorbeeld van je laptop thuis">${Ui.ic('upload')} Importeren<input type="file" accept=".json,application/json" multiple hidden></label>
        ${items.length ? `<button class="secondary small-btn export-all" type="button" title="Alle ${k.many} met hun mappen in één bestand">${Ui.ic('download')} Alles exporteren</button>` : ''}`;
      bar.querySelector('.lib-note').textContent = note;
      bar.querySelector('.new-folder').addEventListener('click', () => {
        const name = prompt('Naam van de nieuwe map (bijvoorbeeld een vak of een klas):');
        if (name) socket.emit('lib-folder-add', { kind, name }, error);
      });
      const input = bar.querySelector('input[type=file]');
      input.addEventListener('change', () => { importFiles(input.files, ''); input.value = ''; });
      const all = bar.querySelector('.export-all');
      if (all) all.addEventListener('click', () => download({}));
      box.appendChild(bar);
      if (kind === 'quiz' && items.some(q => (q.niveaus || []).length > 1)) {
        const lv = document.createElement('div');
        lv.className = 'quiz-niveau-bar';
        box.appendChild(lv);
        niveauBars.add(lv);
        renderNiveauBar(lv);
      }
      if (items.length === 0 && folders.length === 0) {
        box.insertAdjacentHTML('beforeend', `<div class="leeg"><p>Nog geen ${k.many}.</p><p class="muted small">Maak er een met de knoppen hierboven, of importeer een bestand.</p></div>`);
        return;
      }
      for (const f of folders.filter(f => !parentOf(f))) box.appendChild(folderSection(f));
      const loose = items.filter(q => !q.folder);
      const rest = document.createElement('section');
      rest.className = 'quiz-loose';
      if (folders.length) rest.innerHTML = '<p class="muted small loose-head">Zonder map</p>';
      for (const q of loose) rest.appendChild(row(q));
      dropZone(rest, '');
      box.appendChild(rest);
    }

    // Een bestand ergens op de lijst laten vallen: importeren zonder map.
    box.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    box.addEventListener('drop', e => {
      if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      importFiles(e.dataTransfer.files, '');
    });
    socket.on(k.folders, list => { folders = list; render(); });
    socket.on(k.list, list => { items = list; render(); });
  }

  // Geldt voor elke quiz met niveaus. Een quiz zonder niveaus speelt altijd alle vragen.
  function renderNiveauBar(lv) {
    lv.innerHTML = `<strong>Niveau van de klas:</strong> <span class="niveau-pick">${NIVEAUS.map(([n, label, help]) => `<button type="button" class="secondary${n === quizNiveau ? ' on' : ''}" data-niveau="${n}" title="${help}">${label}</button>`).join('')}</span>
      <span class="muted small">voor quizzen met ${Object.values(ICONS).join('')}</span>`;
    for (const b of lv.querySelectorAll('button')) b.addEventListener('click', () => socket.emit('quiz-niveau', b.dataset.niveau));
  }
  let listening = false;
  function listenNiveau() {
    if (listening) return;
    listening = true;
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
