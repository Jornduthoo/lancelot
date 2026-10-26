// Instellingen: eigen posters, waar de gegevens staan, back-ups, bijwerken en de firewall.
// Gebruikt socket, $ en esc uit host.js.
(() => {
  const ask = (event, arg) => new Promise(resolve => socket.emit(event, arg, resolve));

  function datum(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('nl-BE')} om ${d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function kb(bytes) {
    return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} kB`;
  }

  // --- Posters ---
  function toonPosters(res) {
    if (res.error) return void ($('po-error').textContent = res.error);
    $('po-count').textContent = `${res.posters.length} van de ${res.max} posters.`;
    $('po-grid').replaceChildren(...res.posters.map(file => {
      const fig = document.createElement('figure');
      fig.innerHTML = `<img loading="lazy" src="/posters/${encodeURIComponent(file)}?t=${Date.now()}" alt=""><button class="secondary" title="Weghalen">✕</button>`;
      fig.querySelector('button').addEventListener('click', async () => {
        if (confirm('Deze poster weghalen?')) toonPosters(await ask('poster-del', file));
      });
      return fig;
    }));
  }

  // Vierkant bijsnijden en klein maken in de browser: zo blijft elke poster een paar tientallen kB.
  async function verklein(file) {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = c.height = 600;
    c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 600, 600);
    bmp.close && bmp.close();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return blob.arrayBuffer();
  }

  $('po-files').addEventListener('change', async e => {
    $('po-error').textContent = '';
    for (const file of [...e.target.files]) {
      try {
        const res = await ask('poster-add', await verklein(file));
        if (res.error) throw new Error(res.error);
        toonPosters(res);
      } catch (err) {
        $('po-error').textContent = err.message && !/decode|source/i.test(err.message) ? err.message : `${file.name} kon niet geopend worden.`;
        break;
      }
    }
    e.target.value = '';
  });

  // --- Gegevens en back-ups ---
  function toonGegevens(v) {
    if (v.error) return void ($('gg-error').textContent = v.error);
    $('gg-map').textContent = v.map;
    $('gg-melding').textContent = v.melding;
    $('gg-melding').classList.toggle('hidden', !v.melding);
    $('gg-verhuis').classList.toggle('hidden', v.vast);
    $('gg-uitleg').textContent = v.volgende
      ? `Bij de volgende start van LANcelot worden je gegevens gekopieerd naar ${v.volgende}. De oude map blijft staan zoals ze is.`
      : v.apart
        ? 'Je gegevens staan apart van de app: een update of herinstallatie raakt ze nooit. Verhuizen naar een andere map kan hieronder.'
        : 'Je gegevens staan nu in de map van de app. Zet ze apart, dan kan je de app later vervangen of opnieuw installeren zonder risico. Ze worden gekopieerd bij de volgende start van LANcelot (doe dat na de les); de oude map blijft staan.';
    if (document.activeElement !== $('gg-pad')) $('gg-pad').value = v.volgende || (v.apart ? v.map : v.standaard);
    $('gg-annuleer').classList.toggle('hidden', !v.volgende);
    $('bu-klaar').classList.toggle('hidden', !v.terugzetten);
    $('bu-klaar').innerHTML = v.terugzetten ? 'De back-up wordt teruggezet bij de volgende start van LANcelot (doe dat na de les). <button class="secondary" id="bu-annuleer">Annuleren</button>' : '';
    if (v.terugzetten) $('bu-annuleer').addEventListener('click', async () => toonGegevens(await ask('terugzetten-annuleer')));
    $('bu-lijst').replaceChildren(...v.backups.map(b => {
      const li = document.createElement('li');
      const soort = b.file.startsWith('auto_') ? 'automatisch' : b.file.startsWith('voor-') ? 'voor het terugzetten' : 'met de hand';
      const m = b.file.match(/(\d{4})-(\d\d)-(\d\d)_(\d\d)(\d\d)/);
      const wanneer = m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : b.file;
      li.innerHTML = `<span>${esc(wanneer)} · ${soort} · ${kb(b.size)}</span><a class="button secondary" href="/back-up/${encodeURIComponent(b.file)}" download>Download</a>`;
      return li;
    }));
  }

  $('gg-open').addEventListener('click', () => socket.emit('gegevens-open'));
  $('bu-open').addEventListener('click', () => socket.emit('backups-open'));
  $('gg-kies').addEventListener('click', async () => {
    $('gg-error').textContent = '';
    toonGegevens(await ask('gegevens-kies', $('gg-pad').value));
  });
  $('gg-annuleer').addEventListener('click', async () => {
    $('gg-error').textContent = '';
    const v = await ask('gegevens-get');
    toonGegevens(await ask('gegevens-kies', v.map));
  });
  $('bu-nu').addEventListener('click', async () => {
    $('bu-error').textContent = '';
    const res = await ask('backup-nu');
    if (res.error) $('bu-error').textContent = res.error;
    else toonGegevens(res);
  });
  $('bu-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    $('bu-error').textContent = '';
    if (!confirm('Deze back-up terugzetten? Bij de volgende start van LANcelot vervangt hij je huidige klaslijst, logboek, quizzen... LANcelot bewaart eerst nog een back-up van hoe het nu is.')) return;
    try {
      const res = await (await fetch('/back-up/terugzetten', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file })).json();
      if (res.error) throw new Error(res.error);
      toonGegevens(res);
    } catch (err) {
      $('bu-error').textContent = err.message;
    }
  });

  // --- Bijwerken ---
  function toonUpdate(v) {
    if (v.error) return void ($('up-error').textContent = v.error);
    $('up-error').textContent = v.fout || '';
    const nieuwst = v.nieuwste;
    const actueel = nieuwst && v.huidig && v.huidig.sha === nieuwst.sha;
    let tekst = v.huidig && v.huidig.datum ? `Jouw versie: ${datum(v.huidig.datum)}.` : 'Jouw versie: bijgewerkt met een zip.';
    if (v.melding) tekst = `✓ ${v.melding} ${tekst}`;
    if (v.bezig) tekst = 'Even geduld…';
    else if (v.klaar && v.klaar.bestand) tekst = `✓ De update ${v.klaar.bericht} staat klaar. Hij wordt geïnstalleerd de volgende keer dat je LANcelot start (doe dat na de les).`;
    else if (v.klaar) tekst = `✓ De update van ${datum(v.klaar.datum)} staat klaar. Hij wordt geïnstalleerd de volgende keer dat je LANcelot start (doe dat na de les).`;
    else if (actueel) tekst += ' Dat is de nieuwste versie.';
    else if (nieuwst) tekst += ` Nieuwste versie: ${datum(nieuwst.datum)}${nieuwst.bericht ? ` (${nieuwst.bericht})` : ''}.`;
    $('up-status').textContent = tekst;
    $('up-download').classList.toggle('hidden', !nieuwst || actueel || !!v.klaar || v.bezig);
    $('up-annuleer').classList.toggle('hidden', !v.klaar);
    $('up-zoek').disabled = $('up-download').disabled = v.bezig;
    if (document.activeElement !== $('up-bron')) $('up-bron').value = v.bron || '';
  }
  const bezig = () => toonUpdate({ bezig: true });
  $('up-zoek').addEventListener('click', async () => { bezig(); toonUpdate(await ask('update-zoek')); });
  $('up-download').addEventListener('click', async () => { bezig(); toonUpdate(await ask('update-download')); });
  $('up-annuleer').addEventListener('click', async () => toonUpdate(await ask('update-annuleer')));
  $('up-bron-zet').addEventListener('click', async () => toonUpdate(await ask('update-bron', $('up-bron').value)));
  // Een zip van LANcelot (bv. van een usb-stick): werkt zonder internet en zonder GitHub.
  $('up-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    bezig();
    try {
      const res = await (await fetch(`/bijwerken/bestand?naam=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file })).json();
      toonUpdate(res);
    } catch (err) {
      toonUpdate({ error: err.message });
    }
  });

  // --- Firewall ---
  $('fw-zet').addEventListener('click', async () => {
    $('fw-error').textContent = '';
    $('fw-zet').disabled = true;
    const res = await ask('firewall-zet');
    $('fw-zet').disabled = false;
    $('fw-error').textContent = res.error || '';
    if (res.ok) $('fw-zet').textContent = '✓ Firewall staat goed';
  });
  $('sk-zet').addEventListener('click', async () => {
    $('fw-error').textContent = '';
    const res = await ask('snelkoppeling');
    $('fw-error').textContent = res.error || '';
    if (res.ok) $('sk-zet').textContent = '✓ Snelkoppeling staat klaar';
  });

  $('open-settings').addEventListener('click', async () => {
    toonPosters(await ask('posters-get'));
    toonGegevens(await ask('gegevens-get'));
    toonUpdate(await ask('update-get'));
  });

  // De allereerste keer: een verwijzing naar de wizard op het startscherm.
  socket.on('welkom-nodig', nodig => $('welkom-tip').classList.toggle('hidden', !nodig));
})();
