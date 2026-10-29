// Klaar met een spel of oefenblad op het leerlingscherm: onderaan één knop naar Mijn taken, zodat je vlot verder kan.
// Kijkt naar de stand van elk spel (…state met phase): staat er een spel op 'einde' (of het toernooi op 'podium')
// en loopt er niets anders, dan komt de balk. Ingeleverd live oefenblad: klaarBalk('oefenblad', true) uit ob-player.js.
// Gebruikt socket en soloTaak uit player.js. Bij een taak in een spel toont tk-solo.js zijn eigen knoppen.
const klaarBalk = (() => {
  const balk = document.createElement('div');
  balk.className = 'klaar-balk hidden';
  balk.innerHTML = '<span>Klaar? Ga verder met je taken.</span><a class="button gold" href="/mijn-taken"><i class="ic ic-taak" aria-hidden="true"></i>Mijn taken</a>';
  document.body.appendChild(balk);
  const fasen = {};
  const extra = {};

  function teken() {
    const v = Object.values(fasen);
    const einde = f => f === 'einde' || f === 'podium';
    const klaar = Object.values(extra).some(Boolean) || (v.some(einde) && !v.some(f => f !== 'idle' && !einde(f)));
    balk.classList.toggle('hidden', !!soloTaak || !klaar);
  }

  socket.onAny((event, s) => {
    if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
    fasen[event] = s.phase;
    if (event === 'ob-state' && s.phase !== 'open') extra.oefenblad = false;
    teken();
  });
  // Toernooi gesloten of een nieuwe quiz: weg met de balk.
  socket.on('reset', () => { fasen.state = 'idle'; teken(); });

  return (wat, aan) => { extra[wat] = aan; teken(); };
})();
