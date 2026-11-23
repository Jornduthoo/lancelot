// Het toetsarchief in Instellingen: aan of uit, elke maand, de map, nu archiveren en een schooljaar als zip.
// Gebruikt socket en $ uit host.js.
(() => {
  if (!$('archief-panel')) return;

  function when(iso) {
    const d = new Date(iso);
    const today = d.toDateString() === new Date().toDateString();
    return (today ? 'vandaag om ' : `${d.toLocaleDateString('nl-BE')} om `) + d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  }

  function render(v) {
    if (!v || v.error) return;
    $('ar-aan').checked = v.aan;
    $('ar-maand').checked = v.maand;
    $('ar-maand').disabled = !v.aan;
    $('ar-map').textContent = v.map;
    if (document.activeElement !== $('ar-pad')) $('ar-pad').value = v.eigen ? v.map : '';
    $('ar-standaard').classList.toggle('hidden', !v.eigen);
    $('ar-store').classList.toggle('hidden', !(v.store && !v.eigen && !v.lesmap));
    const n = (v.jaren || []).reduce((t, j) => t + j.toetsen, 0);
    $('ar-status').className = v.fout ? 'error' : '';
    $('ar-status').textContent = !v.aan ? 'Het toetsarchief staat uit. Nieuwe toetsen komen er niet meer in; wat er al in staat, blijft.'
      : v.bezig ? 'Bezig met archiveren (de pdf\'s komen op de achtergrond)…'
        : v.fout ? `⚠ ${v.fout}`
          : n ? `✓ ${n === 1 ? '1 toets' : `${n} toetsen`} in het archief${v.laatst ? `, nagekeken ${when(v.laatst)}` : ''}.`
            : 'Nog geen toetsen in het archief. Na "Klaar met verbeteren" komt elke toets er vanzelf in.';
    const sel = $('ar-jaar');
    const oud = sel.value;
    sel.replaceChildren(...(v.jaren || []).map(j => {
      const o = document.createElement('option');
      o.value = j.jaar;
      o.textContent = `${j.jaar.replace('-', ' – ')} (${j.toetsen === 1 ? '1 toets' : `${j.toetsen} toetsen`})`;
      return o;
    }));
    if ([...sel.options].some(o => o.value === oud)) sel.value = oud;
    $('ar-export-rij').classList.toggle('hidden', !(v.jaren || []).length);
  }

  const zet = arg => {
    $('ar-error').textContent = '';
    socket.emit('archief-zet', arg, res => {
      if (res && res.error) $('ar-error').textContent = res.error;
      else render(res);
    });
  };

  socket.on('archief', render);
  $('open-settings').addEventListener('click', () => socket.emit('archief-view', null, render));
  socket.emit('archief-view', null, render);
  $('ar-aan').addEventListener('change', async e => {
    if (!e.target.checked && !await Ui.vraag('Het toetsarchief uitzetten? Wat er al in staat, blijft staan. Nieuwe toetsen komen er niet meer in.')) {
      e.target.checked = true;
      return;
    }
    zet({ aan: e.target.checked });
  });
  $('ar-maand').addEventListener('change', e => zet({ maand: e.target.checked }));
  $('ar-bewaar').addEventListener('click', () => zet({ map: $('ar-pad').value }));
  $('ar-standaard').addEventListener('click', () => { $('ar-pad').value = ''; zet({ map: '' }); });
  $('ar-kies').addEventListener('click', () => {
    $('ar-error').textContent = '';
    socket.emit('archief-kies', null, res => {
      if (res.error) $('ar-error').textContent = res.error;
      else if (res.path) { $('ar-pad').value = res.path; zet({ map: res.path }); }
    });
  });
  $('ar-open').addEventListener('click', () => socket.emit('archief-open'));
  $('ar-nu').addEventListener('click', () => {
    $('ar-error').textContent = '';
    $('ar-nu').disabled = true;
    socket.emit('archief-nu', null, res => {
      $('ar-nu').disabled = false;
      if (res && res.error) return void ($('ar-error').textContent = res.error);
      render(res);
      if (!res.fout) Ui.melding(res.bewaard ? `${res.bewaard === 1 ? '1 toets' : `${res.bewaard} toetsen`} bijgewerkt in het archief.` : 'Alles stond al in het archief.');
    });
  });
  $('ar-export').addEventListener('click', e => {
    e.preventDefault();
    const jaar = $('ar-jaar').value;
    if (jaar) location.href = `/toetsarchief-export?jaar=${encodeURIComponent(jaar)}`;
  });
})();
