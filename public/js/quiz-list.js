// De lijst met quizzen op elk docentenscherm, geordend in mappen.
// Quizzen sleep je naar een map (of kies de map met het mapje in de rij). Mappen klappen open en dicht.
// Gebruik: QuizList.mount($('quiz-list'), { go: 'Kies ▶', play: q => ..., edit: q => ..., remove: q => ... }).
// Gebruikt de globale socket van de pagina.
const QuizList = (() => {
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let quizzes = null;
  let folders = [];
  let box = null;
  let opts = {};
  let closed = new Set();
  try { closed = new Set(JSON.parse(localStorage.getItem('lancelot-closed-folders') || '[]')); } catch {}
  const saveClosed = () => { try { localStorage.setItem('lancelot-closed-folders', JSON.stringify([...closed])); } catch {} };

  function error(res) {
    const el = document.getElementById('load-error');
    if (el) el.textContent = (res && res.error) || '';
  }

  function move(file, folder) {
    socket.emit('quiz-move', { file, folder }, error);
  }

  function row(q) {
    const el = document.createElement('div');
    el.className = 'quiz-row';
    el.draggable = true;
    el.dataset.file = q.file;
    const options = ['<option value="">Zonder map</option>', ...folders.map(f => `<option${f === q.folder ? ' selected' : ''}>${esc(f)}</option>`)].join('');
    el.innerHTML = `<span class="grip" title="Sleep naar een map">⋮⋮</span>
      <button class="play">${esc(q.title)} <span class="muted">· ${q.count} vragen</span><span class="go">${opts.go || 'Kies ▶'}</span></button>
      ${folders.length ? `<label class="move" title="Naar een andere map">📁<select>${options}</select></label>` : ''}
      <button class="secondary edit">Bewerken</button>
      ${opts.remove ? '<button class="secondary delete" title="Verwijderen">✕</button>' : ''}`;
    el.querySelector('.play').addEventListener('click', () => opts.play(q));
    el.querySelector('.edit').addEventListener('click', () => opts.edit(q));
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

  // Een map (of "Zonder map") waarop je een quiz kan laten vallen.
  function dropZone(el, folder) {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('over'); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('over');
      const file = e.dataTransfer.getData('text/plain');
      const q = quizzes.find(x => x.file === file);
      if (q && q.folder !== folder) move(file, folder);
    });
  }

  function render() {
    if (!box || !quizzes) return;
    box.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'quiz-tools';
    bar.innerHTML = '<button class="secondary small-btn" type="button">+ Nieuwe map</button>';
    bar.querySelector('button').addEventListener('click', () => {
      const name = prompt('Naam van de nieuwe map (bijvoorbeeld een vak of een klas):');
      if (name) socket.emit('folder-add', name, error);
    });
    box.appendChild(bar);
    if (quizzes.length === 0 && folders.length === 0) {
      box.insertAdjacentHTML('beforeend', '<p class="muted">Nog geen quizzen. Maak er een met de knoppen hierboven.</p>');
      return;
    }
    for (const f of folders) {
      const inside = quizzes.filter(q => q.folder === f);
      const sec = document.createElement('section');
      sec.className = `quiz-folder${closed.has(f) ? ' closed' : ''}`;
      sec.innerHTML = `<div class="folder-head">
          <button class="folder-toggle" type="button"><span class="chev">▾</span> 📁 <strong></strong> <span class="muted">· ${inside.length} ${inside.length === 1 ? 'quiz' : 'quizzen'}</span></button>
          <button class="secondary rename" type="button" title="Naam wijzigen">✎</button>
          <button class="secondary delete" type="button" title="Map verwijderen">✕</button>
        </div><div class="folder-body"></div>`;
      sec.querySelector('strong').textContent = f;
      sec.querySelector('.folder-toggle').addEventListener('click', () => {
        if (closed.has(f)) closed.delete(f); else closed.add(f);
        saveClosed();
        sec.classList.toggle('closed');
      });
      sec.querySelector('.rename').addEventListener('click', () => {
        const to = prompt('Nieuwe naam voor de map:', f);
        if (to && to !== f) socket.emit('folder-rename', { from: f, to }, error);
      });
      sec.querySelector('.delete').addEventListener('click', () => {
        if (confirm(`De map "${f}" verwijderen? De quizzen erin blijven bewaard, zonder map.`)) socket.emit('folder-remove', f, error);
      });
      const body = sec.querySelector('.folder-body');
      if (inside.length === 0) body.innerHTML = '<p class="muted small folder-empty">Sleep een quiz hierheen.</p>';
      for (const q of inside) body.appendChild(row(q));
      dropZone(sec, f);
      box.appendChild(sec);
    }
    const loose = quizzes.filter(q => !q.folder);
    const rest = document.createElement('section');
    rest.className = 'quiz-loose';
    if (folders.length) rest.innerHTML = '<p class="muted small loose-head">Zonder map</p>';
    for (const q of loose) rest.appendChild(row(q));
    if (folders.length) dropZone(rest, '');
    box.appendChild(rest);
  }

  function mount(el, options) {
    box = el;
    opts = options;
    socket.on('quiz-folders', list => { folders = list; render(); });
    socket.on('quizzes', list => { quizzes = list; render(); });
  }

  return { mount };
})();
