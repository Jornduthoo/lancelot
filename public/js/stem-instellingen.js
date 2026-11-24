// Instellingen > Voorlezen: welke stem deze pc gebruikt, een knop om het geluid te testen, en de stem van LANcelot
// (een spraakdienst met een eigen sleutel, zie src/stem.js). De sleutel komt nooit terug naar het scherm.
(() => {
  const $ = id => document.getElementById(id);
  const info = $('stem-info');
  if (!info || typeof Voorlees === 'undefined') return;
  const TEKST = {
    'toestel-be': 'Deze pc leest voor met een Vlaamse stem: {0}.',
    'toestel-nl': 'Op deze pc staat geen Vlaamse stem. Deze pc leest voor met: {0}.',
    toestel: 'Deze pc leest voor met: {0}.',
    geen: 'Op deze pc staat geen stem om voor te lezen.',
  };
  const toon = () => {
    const i = Voorlees.info();
    info.textContent = (TEKST[i.stand] || TEKST.geen).replace('{0}', i.stem);
  };
  toon();
  setTimeout(toon, 1600);
  $('stem-test').addEventListener('click', () => setTimeout(toon, 100));

  // ---------- De stem van LANcelot ----------
  if (typeof socket === 'undefined' || !$('stem-dienst')) return;
  const UITLEG = {
    '': 'Zonder spraakdienst leest het toestel van de leerling voor.',
    azure: 'Maak in de Azure-portal een Speech-bron aan en kopieer "Sleutel 1" en de regio (bv. swedencentral). Vlaamse stemmen: Dena (vrouw) en Arnaud (man).',
    google: 'Zet in Google Cloud de Text-to-Speech API aan en maak een API-sleutel. Vlaamse stemmen: nl-BE Wavenet.',
    gemini: 'Gebruikt de Gemini-sleutel van Instellingen > AI. Dezelfde stem als LANcelot Junior.',
  };
  const getal = n => Number(n || 0).toLocaleString('nl-BE');
  let stand = null;

  function teken(v) {
    if (!v || v.error) return;
    stand = v;
    if (document.activeElement !== $('stem-dienst')) $('stem-dienst').value = v.dienst;
    $('stem-geslacht').value = v.man ? 'man' : 'vrouw';
    if (document.activeElement !== $('stem-regio')) $('stem-regio').value = v.regio;
    if (document.activeElement !== $('stem-grens')) $('stem-grens').value = v.grens;
    velden();
    const regels = [`Deze maand: ${getal(v.tekens)} van ${getal(v.grens)} tekens.`];
    if (v.op) regels.push('⚠ De grens is bereikt. Tot volgende maand leest het toestel van de leerling voor.');
    else if (v.bijna) regels.push('⚠ Bijna aan de grens. Daarboven leest het toestel van de leerling voor.');
    if (v.aan && v.nodig) regels.push(`Klaar voor de open taken: ${getal(v.klaar)} van ${getal(v.nodig)} stukjes.`);
    $('stem-teller').textContent = regels.join(' ');
    $('stem-teller').classList.toggle('hidden', !v.dienst);
    $('stem-fout').textContent = v.fout || '';
  }

  function velden() {
    const d = $('stem-dienst').value;
    const dienst = stand && stand.diensten[d];
    $('stem-dienst-uitleg').textContent = UITLEG[d] || '';
    $('stem-key-rij').classList.toggle('hidden', !d || d === 'gemini');
    $('stem-regio-rij').classList.toggle('hidden', d !== 'azure');
    $('stem-key').placeholder = dienst && dienst.heeftSleutel ? `Sleutel ingesteld (${dienst.hint}). Plak een nieuwe om te vervangen.` : 'Plak hier je sleutel';
    $('stem-wis').classList.toggle('hidden', !dienst || !dienst.heeftSleutel || dienst.omgeving || d === 'gemini');
    $('stem-test-server').parentElement.classList.toggle('hidden', !d);
    if (d === 'gemini' && dienst && !dienst.heeftSleutel) $('stem-dienst-uitleg').textContent += ' Vul daar eerst een Gemini-sleutel in.';
  }

  const vraag = () => socket.emit('stem-get', null, teken);
  socket.on('connect', vraag);
  if (socket.connected) vraag();
  $('stem-dienst').addEventListener('change', velden);

  // Bewaren wat ingevuld staat (ook vlak voor een test, zodat een net geplakte sleutel meteen getest wordt).
  const bewaar = klaar => {
    $('stem-fout').textContent = '';
    socket.emit('stem-bewaar', {
      dienst: $('stem-dienst').value, sleutel: $('stem-key').value, regio: $('stem-regio').value,
      man: $('stem-geslacht').value === 'man', grens: $('stem-grens').value,
    }, res => {
      if (!res || res.error) { $('stem-fout').textContent = (res && res.error) || 'Opslaan lukte niet.'; return; }
      $('stem-key').value = '';
      teken(res);
      klaar();
    });
  };
  $('stem-bewaar').addEventListener('click', () => bewaar(() => Ui.melding('Opgeslagen.')));

  $('stem-wis').addEventListener('click', async () => {
    if (!await Ui.vraag('De sleutel van deze spraakdienst verwijderen?', { ja: 'Verwijderen', nee: 'Nee' })) return;
    socket.emit('stem-wis-sleutel', { dienst: $('stem-dienst').value }, teken);
  });

  let speler = null;
  $('stem-test-server').addEventListener('click', () => bewaar(() => {
    const knop = $('stem-test-server');
    knop.disabled = true;
    $('stem-fout').textContent = '';
    socket.emit('stem-test', { taal: String(window.LANCELOT_TAAL || 'nl').slice(0, 2) }, res => {
      knop.disabled = false;
      teken(res);
      if (!res || res.error) { $('stem-fout').textContent = (res && res.error) || 'Testen lukte niet.'; return; }
      if (speler) speler.pause();
      speler = new Audio(res.url);
      speler.play().catch(() => { $('stem-fout').textContent = 'Het geluid kon niet afspelen op deze pc.'; });
    });
  }));
})();
