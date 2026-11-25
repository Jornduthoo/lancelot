// Instellingen › Connector: Claude rechtstreeks met LANcelot laten werken (src/connector.js).
// Aan of uit, alleen lezen of ook klaarzetten, sleutels maken en intrekken, de tunnel en het logboek.
// Gebruikt socket en $ uit host.js.
(() => {
  if (!$('connector-panel')) return;
  let stand = null;
  // De nieuwe sleutel staat alleen in dit venster, zolang het open is (LANcelot bewaart enkel een hash).
  let nieuweSleutel = '';

  const tijd = iso => {
    const d = new Date(iso);
    const vandaag = d.toDateString() === new Date().toDateString();
    return `${vandaag ? '' : `${d.toLocaleDateString('nl-BE')} `}${d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const maak = (tag, cls, tekst) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };
  // Kopiëren zonder iets ervoor te zetten (Ui.kopieer zet bij een andere taal een opdracht voor de AI vooraan).
  function kopieer(tekst, knop) {
    const klaar = () => { const oud = knop.textContent; knop.textContent = '✓ Gekopieerd'; setTimeout(() => { knop.textContent = oud; }, 1500); };
    // Eerst de oude manier (werkt ook in ingebouwde vensters zonder klembord-toestemming), dan het klembord.
    const t = document.createElement('textarea');
    t.value = tekst;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    t.remove();
    knop.focus({ preventScroll: true });
    if (ok) return klaar();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tekst).then(klaar, () => Ui.melding(tekst));
    else Ui.melding(tekst);
  }

  // Eén regel van het logboek, in gewone taal.
  function regel(r) {
    const t = r.titel ? `"${r.titel}"` : '';
    if (r.geweigerd) return `Geweigerd (alleen lezen): ${r.actie}`;
    if (r.fout) return `Mislukt: ${r.actie} (${r.fout})`;
    switch (r.actie) {
      case 'sleutel': return `Nieuwe sleutel "${r.naam}"`;
      case 'ingetrokken': return `Sleutel "${r.naam}" ingetrokken`;
      case 'instellingen': return r.aan ? (r.schrijven ? 'Connector aan, mag klaarzetten' : 'Connector aan, alleen lezen') : 'Connector uit';
      case 'toets_bewaren': return `Toets ${t} bewaard`;
      case 'toets_kopieren': return `Toets ${t} gemaakt (kopie)`;
      case 'toets_naar_map': return `Toets ${r.file} naar de map ${r.map || '(bovenaan)'}`;
      case 'taak_geven': return r.vanaf ? `Taak ${t} klaargezet voor ${r.n} ${r.n === 1 ? 'leerling' : 'leerlingen'}, vanaf ${r.vanaf.replace('T', ' ')}` : `Taak ${t} gegeven aan ${r.n} ${r.n === 1 ? 'leerling' : 'leerlingen'}`;
      case 'taak_leerlingen_toevoegen': return `${r.n} ${r.n === 1 ? 'leerling' : 'leerlingen'} toegevoegd aan ${t}`;
      case 'taak_verplaatsen': return r.vanaf ? `Taak ${t} verplaatst naar ${r.vanaf.replace('T', ' ')}` : `Taak ${t} staat nu bij de leerlingen`;
      case 'taak_keuzes': return `Keuzes van taak ${t} aangepast`;
      case 'taak_intrekken': return `Taak ${t} ingetrokken`;
      case 'taak_heropenen': return `Taak ${t} heropend`;
      case 'dagpresentatie_plaatsen': return `Dagpresentatie "${r.naam}" geplaatst`;
      case 'vraag_toevoegen': return `Toets ${t}: vraag ${r.nr} toegevoegd`;
      case 'vraag_wijzigen': return `Toets ${t}: vraag ${r.nr} gewijzigd`;
      case 'vraag_verplaatsen': return `Toets ${t}: vraag ${r.nr} verplaatst`;
      case 'vraag_weghalen': return `Toets ${t}: vraag ${r.nr} weggehaald`;
      case 'toets_instellen': return `Toets ${t} aangepast`;
      case 'niveau_maken': return `Toets ${t}: niveau ${r.niveau} gemaakt`;
      case 'beeld_toevoegen': return `Toets ${t}: beeld of geluid bij vraag ${r.nr}`;
      case 'toets_terugzetten': return `Toets ${t} teruggezet naar een vorige versie`;
      case 'toetsen_bewaren': return `${r.n} toetsen bewaard`;
      case 'quiz_maken':
      case 'quiz_bijwerken': return `Quiz ${t} bewaard`;
      case 'oefenblad_bewaren': return `Oefenblad ${t} bewaard`;
      case 'map_maken': return `Map ${r.map} gemaakt`;
      case 'map_hernoemen': return `Map ${r.van} heet nu ${r.naar}`;
      case 'naar_map': return `${r.file} naar de map ${r.map || '(bovenaan)'}`;
      case 'sync_starten': return 'Mijn lesmap gesynchroniseerd';
      default: return `Gelezen: ${r.actie}`;
    }
  }
  function logLijn(r) {
    const li = maak('li');
    li.append(maak('b', '', tijd(r.t)), ' ', r.wie ? `${r.wie} · ` : '', regel(r));
    return li;
  }

  function adresVoorClaude() {
    const tn = stand && stand.tunnel;
    return tn && tn.status === 'aan' && tn.adres ? `${tn.adres}/mcp/${nieuweSleutel}` : '';
  }
  function toonNieuwe() {
    $('cn-nieuwe').classList.toggle('hidden', !nieuweSleutel);
    if (!nieuweSleutel) return;
    const adres = adresVoorClaude();
    $('cn-adres-tunnel').textContent = adres;
    $('cn-kopieer-tunnel').classList.toggle('hidden', !adres);
    $('cn-adres-tunnel').classList.toggle('hidden', !adres);
    $('cn-geen-tunnel').classList.toggle('hidden', !!adres);
    $('cn-adres-lan').textContent = stand && stand.lan ? `${stand.lan}/${nieuweSleutel}` : nieuweSleutel;
  }

  function tunnelTekst(tn) {
    if (!tn.aan) return '';
    if (tn.status === 'aan') return tn.adres ? `✓ Bereikbaar op ${tn.adres}` : '✓ De tunnel staat aan.';
    if (tn.status === 'start') return 'De tunnel start… (de eerste keer haalt LANcelot het programma van Cloudflare op)';
    if (tn.status === 'fout') return `⚠ ${tn.fout}`;
    return 'De tunnel start zodra de connector aan staat.';
  }

  function render(v) {
    if (!v || v.error) return;
    stand = v;
    $('cn-aan').checked = v.aan;
    $('cn-schrijven').checked = v.schrijven;
    $('cn-schrijven').disabled = !v.aan;
    $('cn-tunnel').checked = v.tunnel.aan;
    $('cn-tunnel').disabled = !v.aan;
    $('cn-nieuw').disabled = !v.aan;
    $('cn-tunnel-status').className = v.tunnel.status === 'fout' ? 'error' : '';
    $('cn-tunnel-status').textContent = tunnelTekst(v.tunnel);
    $('cn-poort').textContent = `http://localhost:${v.poort}`;
    $('cn-vast-weg').classList.toggle('hidden', !v.tunnel.vast);
    if (document.activeElement !== $('cn-vastadres')) $('cn-vastadres').value = v.tunnel.vastAdres || '';
    $('cn-token').placeholder = v.tunnel.vast ? '•••••• (bewaard)' : 'eyJ…';
    $('cn-sleutels').replaceChildren(...v.sleutels.map(s => {
      const li = maak('li');
      const info = maak('span');
      info.append(maak('strong', '', s.naam), ' ', maak('span', 'muted small', s.ingetrokken ? `ingetrokken ${tijd(s.ingetrokken)}` : s.laatst ? `laatst gebruikt ${tijd(s.laatst)}` : `gemaakt ${tijd(s.gemaakt)}, nog niet gebruikt`));
      li.append(info);
      if (!s.ingetrokken) {
        const k = maak('button', 'secondary', 'Intrekken');
        k.type = 'button';
        k.addEventListener('click', async () => {
          if (!await Ui.vraag(`Sleutel "${s.naam}" intrekken? Claude kan er dan niet meer mee binnen.`)) return;
          zend('cn-intrek', { id: s.id });
        });
        li.append(k);
      }
      return li;
    }));
    $('cn-log').replaceChildren(...(v.logboek.length ? v.logboek.map(logLijn) : [maak('li', '', 'Nog niets gebeurd.')]));
    toonNieuwe();
  }

  function zend(event, arg, na) {
    $('cn-error').textContent = '';
    socket.emit(event, arg, res => {
      if (res && res.error) { $('cn-error').textContent = res.error; return; }
      render(res);
      if (na) na(res);
    });
  }
  const laad = () => socket.emit('cn-view', null, render);

  socket.on('connect', laad);
  socket.on('cn-tunnel', tn => { if (stand) render({ ...stand, tunnel: tn }); });
  socket.on('cn-log', r => {
    if (!stand) return;
    stand.logboek = [r, ...stand.logboek].slice(0, 50);
    $('cn-log').replaceChildren(...stand.logboek.map(logLijn));
  });
  $('open-settings').addEventListener('click', laad);
  laad();

  $('cn-aan').addEventListener('change', e => zend('cn-zet', { aan: e.target.checked }));
  $('cn-schrijven').addEventListener('change', e => zend('cn-zet', { schrijven: e.target.checked }));
  $('cn-tunnel').addEventListener('change', e => zend('cn-zet', { tunnel: e.target.checked }));
  $('cn-nieuw').addEventListener('click', () => zend('cn-sleutel', { naam: $('cn-naam').value }, res => {
    nieuweSleutel = res.sleutel;
    $('cn-naam').value = '';
    toonNieuwe();
  }));
  $('cn-kopieer-tunnel').addEventListener('click', e => kopieer(adresVoorClaude(), e.target));
  $('cn-kopieer-lan').addEventListener('click', e => kopieer($('cn-adres-lan').textContent, e.target));
  $('cn-vast-bewaar').addEventListener('click', () => {
    const arg = { tunnelAdres: $('cn-vastadres').value };
    if ($('cn-token').value.trim()) arg.tunnelToken = $('cn-token').value;
    zend('cn-zet', arg, () => { $('cn-token').value = ''; });
  });
  $('cn-vast-weg').addEventListener('click', () => zend('cn-zet', { tunnelToken: null }));
})();
