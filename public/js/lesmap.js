// Mijn lesmap in Instellingen: een map in OneDrive of Google Drive kiezen, die LANcelot gelijk houdt.
// Gebruikt socket en $ uit host.js.
(() => {
  let current = '';

  function when(ms) {
    const d = new Date(ms);
    const today = d.toDateString() === new Date().toDateString();
    return (today ? 'vandaag om ' : `${d.toLocaleDateString('nl-BE')} om `) + d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  }

  function render(v) {
    current = v.lesmap;
    if (document.activeElement !== $('lm-path')) $('lm-path').value = v.lesmap;
    const parts = [];
    if (v.pulled) parts.push(`${v.pulled} binnengehaald`);
    if (v.pushed) parts.push(`${v.pushed} weggeschreven`);
    if (v.removed) parts.push(`${v.removed} naar de prullenbak`);
    $('lm-status').textContent = !v.lesmap ? 'Nog geen lesmap gekozen. Alles blijft alleen op deze pc.'
      : v.error ? `⚠ ${v.error}`
        : v.at ? `✓ Gesynchroniseerd ${when(v.at)}${parts.length ? ` (${parts.join(', ')})` : ''}.` : 'Bezig met synchroniseren…';
    $('lm-status').className = v.error ? 'error' : '';
    for (const id of ['lm-sync', 'lm-open', 'lm-off']) $(id).classList.toggle('hidden', !v.lesmap);
  }

  function choose(folder) {
    $('lm-error').textContent = '';
    $('lm-status').textContent = folder ? 'Bezig met synchroniseren…' : '';
    socket.emit('lesmap-choose', folder, res => {
      if (res.error) $('lm-error').textContent = res.error;
      else render(res);
    });
  }

  socket.on('lesmap', render);

  // OneDrive en Google Drive op deze pc: met één klik kiezen.
  $('open-settings').addEventListener('click', () => {
    $('lm-error').textContent = '';
    socket.emit('lesmap-suggest', null, list => {
      $('lm-suggest').replaceChildren(...list.filter(s => s.path !== current).map(s => {
        const b = document.createElement('button');
        b.className = 'secondary';
        b.textContent = `Gebruik ${s.label}`;
        b.title = s.path;
        b.addEventListener('click', () => choose(s.path));
        return b;
      }));
    });
  });

  $('lm-pick').addEventListener('click', () => {
    $('lm-error').textContent = '';
    socket.emit('lesmap-pick', null, res => {
      if (res.error) $('lm-error').textContent = res.error;
      else if (res.path) choose(res.path);
    });
  });
  $('lm-save').addEventListener('click', () => choose($('lm-path').value));
  $('lm-sync').addEventListener('click', () => {
    $('lm-status').textContent = 'Bezig met synchroniseren…';
    socket.emit('lesmap-sync', null, render);
  });
  $('lm-open').addEventListener('click', () => socket.emit('lesmap-open'));
  $('lm-off').addEventListener('click', () => {
    if (confirm('De lesmap loskoppelen? Je quizzen blijven op deze pc en in de lesmap staan, maar worden niet meer gelijk gehouden.')) choose('');
  });
})();
