// Het live overzicht van de leerkracht: een icoontje bij een leerling die geen goede voorleesstem heeft
// (zie src/stem.js). StemStand.start(socket) één keer, StemStand.html(naam) bij elke naam, StemStand.op(teken) tekent opnieuw.
const StemStand = (() => {
  let leerlingen = {};
  let server = false;
  const opnieuw = [];
  const ICOON = {
    'toestel-nl': ['🗣', 'Geen Vlaamse stem op dit toestel: een andere Nederlandse stem leest voor.'],
    geen: ['🔇', 'Voorlezen lukt niet op dit toestel.'],
  };
  // Staat de stem van LANcelot aan, dan is ook de (Vlaamse) stem van het toestel een terugval.
  const TOESTEL = ['📱', 'Kreeg de stem van LANcelot niet: het toestel leest voor.'];
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const van = naam => {
    const st = leerlingen[String(naam || '').trim().toLowerCase()];
    return ICOON[st] || (server && (st === 'toestel-be' || st === 'toestel') ? TOESTEL : null);
  };

  function start(socket) {
    socket.on('stem-standen', v => {
      leerlingen = (v && v.leerlingen) || {};
      server = !!(v && v.server);
      for (const f of opnieuw) try { f(); } catch {}
    });
    socket.on('connect', () => socket.emit('stem-standen'));
    if (socket.connected) socket.emit('stem-standen');
  }

  function html(naam) {
    const i = van(naam);
    return i ? ` <span class="stem-stand" title="${esc(i[1])}" aria-label="${esc(i[1])}">${i[0]}</span>` : '';
  }

  function el(naam) {
    const i = van(naam);
    if (!i) return null;
    const s = document.createElement('span');
    s.className = 'stem-stand';
    s.title = i[1];
    s.setAttribute('aria-label', i[1]);
    s.textContent = ` ${i[0]}`;
    return s;
  }

  return { start, html, el, op: f => opnieuw.push(f) };
})();
