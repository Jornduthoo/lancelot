// De lijst met quizzen, oefenbladen of Ronde Tafel-sessies op elk docentenscherm, geordend in mappen.
// Items sleep je naar een map (of kies de map met het mapje in de rij). Mappen klappen open en dicht.
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

  function mount(box, opts) {
    const kind = opts.kind || 'quiz';
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
      let left = list.length;
      for (const file of list) {
        const reader = new FileReader();
        reader.onload = () => {
          socket.emit('lib-import', { kind, text: reader.result, folder }, res => {
            if (res.error) error({ error: `${file.name}: ${res.error}` });
            else { total += res.count; skipped += res.skipped; }
            if (--left === 0 && (total || skipped)) {
              note = total ? `${total} ${total === 1 ? k.one : k.many} geïmporteerd${folder ? ` in ${folder}` : ''}.` : 'Niets nieuws: dat stond er al.';
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
      const options = ['<option value="">Zonder map</option>', ...folders.map(f => `<option${f === q.folder ? ' selected' : ''}>${esc(f)}</option>`)].join('');
      el.innerHTML = `<span class="grip" title="Sleep naar een map">⋮⋮</span>
        <button class="play">${esc(q.title)} <span class="muted">· ${esc(detail(q))}</span><span class="go">${opts.go || 'Kies ▶'}</span></button>
        ${folders.length ? `<label class="move" title="Naar een andere map">📁<select>${options}</select></label>` : ''}
        ${(opts.buttons || []).map((b, i) => `<button class="secondary extra ${b.cls || ''}" data-extra="${i}" title="${esc(b.title || '')}">${b.label}</button>`).join('')}
        <button class="secondary edit">Bewerken</button>
        <button class="secondary export" title="Exporteren naar een bestand">⬇</button>
        ${opts.remove ? '<button class="secondary delete" title="Verwijderen">✕</button>' : ''}`;
      el.querySelector('.play').addEventListener('click', () => opts.play(q));
      el.querySelector('.edit').addEventListener('click', () => opts.edit(q));
      el.querySelector('.export').addEventListener('click', () => download({ file: q.file }));
      for (const b of el.querySelectorAll('[data-extra]')) b.addEventListener('click', () => opts.buttons[b.dataset.extra].click(q));
      if (opts.remove) el.querySelector('.delete').addEventListener('click', () => opts.remove(q));
      const select = el.querySelector('.move select');
      if (select) select.addEventListener('change', () => move(q.file, select.value));
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', q.file);
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

    // Een map (of "Zonder map") waarop je een item kan laten vallen, of een geëxporteerd bestand.
    function dropZone(el, folder) {
      el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('over'); });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('over'); });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) return importFiles(e.dataTransfer.files, folder);
        const file = e.dataTransfer.getData('text/plain');
        const q = items.find(x => x.file === file);
        if (q && q.folder !== folder) move(file, folder);
      });
    }

    function render() {
      if (!items) return;
      box.innerHTML = '';
      const bar = document.createElement('div');
      bar.className = 'quiz-tools';
      bar.innerHTML = `<span class="muted small lib-note"></span>
        <button class="secondary small-btn new-folder" type="button">+ Nieuwe map</button>
        <label class="button secondary small-btn" title="Een bestand van ⬇ Exporteren inladen, bijvoorbeeld van je laptop thuis">⬆ Importeren<input type="file" accept=".json,application/json" multiple hidden></label>
        ${items.length ? `<button class="secondary small-btn export-all" type="button" title="Alle ${k.many} met hun mappen in één bestand">⬇ Alles exporteren</button>` : ''}`;
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
      if (items.length === 0 && folders.length === 0) {
        box.insertAdjacentHTML('beforeend', `<p class="muted">Nog geen ${k.many}. Maak er een met de knoppen hierboven, of importeer een bestand.</p>`);
        return;
      }
      for (const f of folders) {
        const inside = items.filter(q => q.folder === f);
        const sec = document.createElement('section');
        sec.className = `quiz-folder${closed.has(f) ? ' closed' : ''}`;
        sec.innerHTML = `<div class="folder-head">
            <button class="folder-toggle" type="button"><span class="chev">▾</span> 📁 <strong></strong> <span class="muted">· ${inside.length} ${inside.length === 1 ? k.one : k.many}</span></button>
            ${inside.length ? '<button class="secondary export" type="button" title="Deze map exporteren naar een bestand">⬇</button>' : ''}
            <button class="secondary rename" type="button" title="Naam wijzigen">✎</button>
            <button class="secondary delete" type="button" title="Map verwijderen">✕</button>
          </div><div class="folder-body"></div>`;
        sec.querySelector('strong').textContent = f;
        sec.querySelector('.folder-toggle').addEventListener('click', () => {
          if (closed.has(f)) closed.delete(f); else closed.add(f);
          saveClosed();
          sec.classList.toggle('closed');
        });
        const exp = sec.querySelector('.export');
        if (exp) exp.addEventListener('click', () => download({ folder: f }));
        sec.querySelector('.rename').addEventListener('click', () => {
          const to = prompt('Nieuwe naam voor de map:', f);
          if (to && to !== f) socket.emit('lib-folder-rename', { kind, from: f, to }, error);
        });
        sec.querySelector('.delete').addEventListener('click', () => {
          if (confirm(`De map "${f}" verwijderen? De ${k.many} erin blijven bewaard, zonder map.`)) socket.emit('lib-folder-remove', { kind, name: f }, error);
        });
        const body = sec.querySelector('.folder-body');
        if (inside.length === 0) body.innerHTML = `<p class="muted small folder-empty">Sleep een ${k.one} hierheen.</p>`;
        for (const q of inside) body.appendChild(row(q));
        dropZone(sec, f);
        box.appendChild(sec);
      }
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

  return { mount };
})();

const QuizList = { mount: (el, opts) => ItemList.mount(el, { ...opts, kind: 'quiz' }) };
