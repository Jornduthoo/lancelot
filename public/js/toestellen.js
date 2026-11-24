// Statusregel "Bijgewerkt van …" (wensenlijst 20 nov, punt 2): alleen als je LANcelot op meer dan één pc
// gebruikt (via Mijn lesmap). Rood als een pc waar leerlingen bezig zijn al even niets stuurde, of als
// synchroniseren hier niet lukt. Zet <p class="toestel-stand" data-toestellen></p> op een pagina en laad dit
// script na het script dat `socket` maakt.
(() => {
  const vakken = [...document.querySelectorAll('[data-toestellen]')];
  if (!vakken.length || typeof socket === 'undefined') return;
  let laatst = null;
  const geleden = iso => {
    if (!iso) return 'nog niet';
    const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'nu';
    if (m < 60) return `${m} min geleden`;
    const u = Math.floor(m / 60);
    if (u < 24) return `${u} uur geleden`;
    const d = Math.floor(u / 24);
    return d === 1 ? 'gisteren' : `${d} dagen geleden`;
  };
  const duur = iso => {
    const m = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 60000));
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} uur`;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function teken() {
    const r = laatst;
    for (const v of vakken) {
      v.classList.toggle('hidden', !r || !r.toon);
      if (!r || !r.toon) { v.innerHTML = ''; continue; }
      const stil = r.anderen.filter(a => a.stil);
      const fout = r.dit.fout || '';
      v.classList.toggle('rood', !!(stil.length || fout));
      // Per toestel: hoeveel taken daar open staan (wens 24 nov, punt 4), zodat een verschil opvalt.
      const open = n => (n === undefined ? '' : n === 1 ? ', 1 taak open' : `, ${n} taken open`);
      const anderen = r.anderen.map(a => `<b>${esc(a.naam)}</b> (${esc(geleden(a.tijd))}${a.bezig ? `, ${a.bezig} bezig` : ''}${esc(open(a.open))})`).join(', ');
      const extra = fout ? `<br>⚠ ${esc(`Synchroniseren lukt hier niet: ${fout}`)}`
        : stil.length ? `<br>⚠ ${esc(stil.length === 1 ? `${stil[0].naam} stuurt al ${duur(stil[0].tijd)} niets, terwijl er leerlingen bezig zijn. Staat LANcelot daar nog aan, met OneDrive of Google Drive?` : `${stil.map(a => a.naam).join(', ')} stuurden al even niets, terwijl er leerlingen bezig zijn. Staat LANcelot daar nog aan, met OneDrive of Google Drive?`)}` : '';
      v.innerHTML = `🔄 ${esc('Bijgewerkt van:')} ${anderen} · ${esc('dit toestel:')} <b>${esc(r.dit.naam)}</b> (${esc(geleden(r.dit.tijd))}${esc(open(r.dit.open))}) <a href="/host?instellingen=lesmap&terug=${encodeURIComponent(location.pathname + location.search)}" title="${esc('Geef elke pc een eigen naam')}">✎</a>${extra}`;
    }
  }
  function laad() {
    socket.emit('toestel-stand', null, r => {
      if (!r || r.error) return;
      laatst = r;
      teken();
    });
  }
  socket.on('connect', laad);
  socket.on('lesmap', laad);
  setInterval(laad, 60000);
  setInterval(teken, 20000);
})();
