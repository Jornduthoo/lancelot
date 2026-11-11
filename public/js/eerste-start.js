// De eerste start (src/eerstestart.js): een grote knop voor een proefspel en drie stappen met een balkje.
// Het blok verdwijnt vanzelf als de drie stappen gedaan zijn, of met Verbergen.
(() => {
  const blok = $('eerste-start');
  if (!blok) return;
  const t = s => (window.I18n ? I18n.t(s) : s);
  const VOLGORDE = ['klas', 'quiz', 'spel'];

  function toon(res) {
    blok.classList.toggle('hidden', !res || !res.toon);
    if (!res || !res.toon) return;
    const klaar = VOLGORDE.filter(s => res.stappen[s]).length;
    const nu = VOLGORDE.find(s => !res.stappen[s]);
    $('es-stap').textContent = t('Stap {0} van 3').replace('{0}', VOLGORDE.indexOf(nu) + 1);
    $('es-balk').style.width = `${Math.round((klaar / 3) * 100)}%`;
    for (const li of blok.querySelectorAll('[data-stap]')) {
      li.classList.toggle('klaar', !!res.stappen[li.dataset.stap]);
      li.classList.toggle('nu', li.dataset.stap === nu);
      li.querySelector('b').textContent = res.stappen[li.dataset.stap] ? '✓' : VOLGORDE.indexOf(li.dataset.stap) + 1;
    }
    const kies = $('es-jaar');
    if (!kies.options.length) {
      for (const j of res.jaren) kies.add(new Option(t(j.naam), j.id));
      kies.value = String(res.leerjaar);
    }
  }
  const laad = () => socket.emit('eerste-start', null, toon);
  socket.on('connect', laad);
  laad();
  // Terug op het startscherm (na de wizard of een spel in een ander tabblad): opnieuw kijken wat gedaan is.
  window.addEventListener('focus', laad);

  $('es-proef').addEventListener('click', () => {
    socket.emit('eerste-start-proef', null, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || t('Dat lukte niet.'));
      location.href = `/host?quiz=${encodeURIComponent(res.file)}&proef=1`;
    });
  });
  $('es-weg').addEventListener('click', async () => {
    if (!await Ui.vraag('Deze stappen verbergen? Je vindt alles terug via de vijf tegels.')) return;
    socket.emit('eerste-start-weg', null, laad);
  });
  $('es-pakket').addEventListener('click', () => {
    socket.emit('startquizzen-installeer', { leerjaar: Number($('es-jaar').value) }, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || t('Dat lukte niet.'));
      $('es-melding').textContent = t('{0} quizzen staan klaar in de map "{1}". Kies een spel en speel.').replace('{0}', res.files.length).replace('{1}', res.map);
      laad();
    });
  });
  $('es-maak').addEventListener('click', () => window.snelNaar('smidse'));
  $('es-spelen').addEventListener('click', () => window.snelNaar('arena'));
})();
