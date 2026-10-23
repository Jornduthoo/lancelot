// Adres en QR-code in de lobby. Gebruikt socket en $ van de pagina.
// Werkt het grote adres niet (bijvoorbeeld een hotspot of virtuele netwerkkaart)? Dan klikt de leerkracht
// op een ander adres. Dat wordt het grote adres met de QR-code, en LANcelot onthoudt die keuze.
function showAddress(list, i) {
  const main = list[i];
  const short = a => a.url.replace('http://', '');
  $('join-url').textContent = main ? short(main) : 'Geen netwerk gevonden';
  if ($('join-mini')) $('join-mini').textContent = main ? short(main) : '';
  $('qr').innerHTML = main ? main.qr : '';
  const others = $('other-urls');
  others.innerHTML = '';
  if (list.length < 2) return;
  others.append('Lukt verbinden niet? Klik op het adres dat wel werkt: ');
  list.forEach((a, j) => {
    if (j === i) return;
    const link = document.createElement('button');
    link.className = 'secondary address-choice';
    link.textContent = a.name ? `${short(a)} · ${a.name}` : short(a);
    link.addEventListener('click', () => {
      showAddress(list, j);
      const ip = ipOf(a);
      try { localStorage.setItem('lancelot-address', ip); } catch {}
      socket.emit('choose-address', ip);
    });
    others.append(link);
  });
}

const ipOf = a => a.url.replace(/^http:\/\//, '').replace(/:\d+$/, '');

// De browser van het bord onthoudt de keuze ook. Zo blijft ze bewaard als LANcelot in een nieuwe map
// wordt uitgepakt (dan is de keuze op de server weg).
socket.on('addresses', list => {
  let saved = '';
  try { saved = localStorage.getItem('lancelot-address') || ''; } catch {}
  // Leerlingen kwamen al binnen via het eerste adres (of de leerkracht koos het): dat onthouden.
  if (list[0] && list[0].sure) {
    try { localStorage.setItem('lancelot-address', ipOf(list[0])); } catch {}
    showAddress(list, 0);
    return;
  }
  const j = list.findIndex(a => ipOf(a) === saved);
  if (j > 0) {
    showAddress(list, j);
    socket.emit('choose-address', saved);
    return;
  }
  showAddress(list, 0);
});
