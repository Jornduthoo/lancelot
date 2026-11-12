// Klaar met een spel of oefenblad op het leerlingscherm: onderaan een knop naar het startscherm en een naar Mijn taken.
// Kijkt naar de stand van elk spel (…state met phase): staat er een spel op 'einde' (of het toernooi op 'podium')
// en loopt er niets anders, dan komt de balk. Ingeleverd live oefenblad: klaarBalk('oefenblad', true) uit ob-player.js.
// Gebruikt socket en soloTaak uit player.js. Bij een taak in een spel toont tk-solo.js zijn eigen knoppen.
const klaarBalk = (() => {
  const balk = document.createElement('div');
  balk.className = 'klaar-balk hidden';
  balk.innerHTML = '<span>Klaar? Kies waar je heen wil.</span><div class="klaar-knoppen"><button type="button" class="secondary" data-start><i class="ic ic-huis" aria-hidden="true"></i>Startscherm</button>'
    + '<a class="button gold" href="/mijn-taken"><i class="ic ic-taak" aria-hidden="true"></i>Mijn taken</a></div>';
  document.body.appendChild(balk);
  const fasen = {};
  const extra = {};
  const einde = f => f === 'einde' || f === 'podium';
  // Startscherm: het eindscherm van elk afgelopen spel gaat weg en komt niet terug tot er een nieuw spel start.
  const weg = new Set();
  const gewikkeld = new Set();
  balk.querySelector('[data-start]').addEventListener('click', () => {
    for (const [event, fase] of Object.entries(fasen)) {
      if (!einde(fase)) continue;
      weg.add(event);
      if (!gewikkeld.has(event)) {
        gewikkeld.add(event);
        for (const f of socket.listeners(event)) {
          socket.off(event, f);
          socket.on(event, s => { if (s && einde(s.phase) && weg.has(event)) return; weg.delete(event); f(s); });
        }
      }
      if (event === 'state') { if (typeof show === 'function') show('idle'); } else for (const f of socket.listeners(event)) f({ active: false, phase: 'idle', now: Date.now() });
      fasen[event] = 'idle';
    }
    teken();
    window.scrollTo(0, 0);
  });

  function teken() {
    const v = Object.values(fasen);
    balk.querySelector('[data-start]').classList.toggle('hidden', !v.some(einde));
    const klaar = Object.values(extra).some(Boolean) || (v.some(einde) && !v.some(f => f !== 'idle' && !einde(f)));
    balk.classList.toggle('hidden', !!soloTaak || !klaar);
  }

  socket.onAny((event, s) => {
    if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
    if (weg.has(event) && einde(s.phase)) return;
    fasen[event] = s.phase;
    if (event === 'ob-state' && s.phase !== 'open') extra.oefenblad = false;
    teken();
  });
  // Toernooi gesloten of een nieuwe quiz: weg met de balk.
  socket.on('reset', () => { fasen.state = 'idle'; teken(); });

  return (wat, aan) => { extra[wat] = aan; teken(); };
})();
