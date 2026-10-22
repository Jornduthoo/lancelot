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
      socket.emit('choose-address', a.url.replace(/^http:\/\//, '').replace(/:\d+$/, ''));
    });
    others.append(link);
  });
}

socket.on('addresses', list => showAddress(list, 0));
