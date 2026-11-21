// Mijn lesmap in Instellingen: een map in OneDrive of Google Drive kiezen, die LANcelot gelijk houdt.
// Gebruikt socket en $ uit host.js.
(() => {
  let current = '';

  function when(ms) {
    const d = new Date(ms);
    const today = d.toDateString() === new Date().toDateString();
    return (today ? 'vandaag om ' : `${d.toLocaleDateString('nl-BE')} om `) + d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  }

  // De naam van elke soort, zoals de leerkracht ze kent.
  const NAMEN = {
    quiz: 'Quizzen', oefenblad: 'Oefenbladen', sessie: 'Ronde Tafels', proef: 'Toetsen', zonnewijzer: 'Planning',
    kronieken: 'Mijn methodes', taak: 'Taken', afnames: 'Resultaten van toetsen', takenstandaard: 'Standaardkeuzes voor taken',
    vakken: 'Vakken', punten: 'Punten', toestellen: 'Je pc\'s', takenstand: 'Stand van de taken', klastaken: 'Klastaken',
    klasindeling: 'Klasindeling', klas: 'Klaslijst', klassen: 'Klassen', toetsmail: 'Toetsen mailen', burchten: 'Klaseiland',
    runen: 'Runenraadsel', inbeeld: 'Woordkaarten', resultaat: 'Spelresultaten', bordboeken: 'Bordboeken',
  };
  // "Wat kwam er binnen?": per soort wat er de laatste keer van je andere pc's binnenkwam, en wat niet lukte.
  function soorten(v) {
    const box = $('lm-soorten');
    if (!box) return;
    const lijst = v.lesmap ? v.soorten || [] : [];
    const ul = $('lm-soorten-lijst');
    ul.textContent = '';
    for (const s of lijst) {
      const naam = NAMEN[s.soort] || s.soort;
      const regels = [];
      if (s.fout) regels.push({ tekst: `⚠ ${naam}: ${s.fout}`, fout: true });
      for (const x of s.van || []) regels.push({ tekst: x.n === 1 ? `${naam}: 1 bestand van ${x.pc}` : `${naam}: ${x.n} bestanden van ${x.pc}` });
      if (s.binnen) regels.push({ tekst: s.binnen.n === 1 ? `${naam}: 1 bestand binnengehaald ${when(s.binnen.at)}` : `${naam}: ${s.binnen.n} bestanden binnengehaald ${when(s.binnen.at)}` });
      for (const r of regels) {
        const li = document.createElement('li');
        li.textContent = r.tekst;
        if (r.fout) li.className = 'error';
        ul.appendChild(li);
      }
    }
    box.classList.toggle('hidden', !ul.children.length);
    if (lijst.some(s => s.fout)) box.open = true;
  }

  function render(v) {
    current = v.lesmap;
    if (document.activeElement !== $('lm-path')) $('lm-path').value = v.lesmap;
    const parts = [];
    if (v.pulled) parts.push(`${v.pulled} binnengehaald`);
    if (v.pushed) parts.push(`${v.pushed} weggeschreven`);
    if (v.removed) parts.push(`${v.removed} naar de prullenbak`);
    $('lm-status').textContent = !v.lesmap ? 'Nog geen lesmap gekozen. Alles blijft alleen op deze pc.'
      : v.boeken && v.boeken.totaal ? `Bordboeken kopiëren: ${v.boeken.klaar} van ${v.boeken.totaal}…`
      : v.error ? `⚠ ${v.error}`
        : v.at ? `✓ Gesynchroniseerd ${when(v.at)}${parts.length ? ` (${parts.join(', ')})` : ''}.` : 'Bezig met synchroniseren…';
    $('lm-status').className = v.error ? 'error' : '';
    // Een ander toestel met een oude LANcelot schreef in de lesmap: er ging niets verloren, maar werk het bij.
    const oud = $('lm-oud');
    if (oud) {
      oud.textContent = v.lesmap && v.oudToestel ? `⚠ Een ander toestel gebruikt een oude versie van LANcelot (gezien ${when(v.oudToestel)}). Er ging niets verloren, maar werk LANcelot op dat toestel bij.` : '';
      oud.classList.toggle('hidden', !(v.lesmap && v.oudToestel));
    }
    soorten(v);
    for (const id of ['lm-sync', 'lm-open', 'lm-off', 'lm-boeken-rij', 'lm-toestel-rij']) $(id).classList.toggle('hidden', !v.lesmap);
    $('lm-boeken').checked = v.boekenAan !== false;
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

  // Elke pc een eigen naam: dat staat in de regel "Bijgewerkt van …" op je andere pc's.
  socket.emit('toestel-stand', null, r => {
    if (r && r.dit && document.activeElement !== $('lm-toestel')) $('lm-toestel').value = r.dit.naam;
  });
  $('lm-toestel-bewaar').addEventListener('click', () => {
    socket.emit('toestel-naam', $('lm-toestel').value, res => {
      if (res && res.error) return ($('lm-error').textContent = res.error);
      $('lm-toestel').value = res.naam;
      Ui.melding(`Deze pc heet nu "${res.naam}".`);
    });
  });

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
  $('lm-boeken').addEventListener('change', e => socket.emit('lesmap-boeken', e.target.checked, render));
  $('lm-open').addEventListener('click', () => socket.emit('lesmap-open'));
  $('lm-off').addEventListener('click', async () => {
    if (await Ui.vraag('De lesmap loskoppelen? Je quizzen blijven op deze pc en in de lesmap staan, maar worden niet meer gelijk gehouden.')) choose('');
  });
})();
