// Adres en QR-code in de lobby. Gebruikt socket en $ van de pagina.
// Werkt het grote adres niet (bijvoorbeeld een hotspot of virtuele netwerkkaart)? Dan klikt de leerkracht
// op een ander adres. Dat wordt het grote adres met de QR-code, en LANcelot onthoudt die keuze.
function showAddress(list, i) {
  const main = list[i];
  // Met http:// erbij: zonder typt een Chromebook er soms https:// van, of zoekt hij het adres op Google.
  const short = a => a.url;
  $('join-url').textContent = main ? short(main) : 'Geen netwerk gevonden';
  if ($('join-mini')) $('join-mini').textContent = main ? short(main) : '';
  $('qr').innerHTML = main ? main.qr : '';
  const others = $('other-urls');
  others.innerHTML = '';
  // Altijd een weg naar de hulppagina, ook met maar één adres.
  const help = document.createElement('a');
  help.href = '/netwerk';
  help.target = '_blank';
  help.className = 'netwerk-hulp-link';
  help.textContent = 'Netwerk werkt niet?';
  if (list.length < 2) {
    others.append(help);
    return;
  }
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
  others.append(' ', help);
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

// Kreeg de pc een nieuw adres van het schoolnetwerk? Eén zin onder het adres, met de weg naar een vast adres.
// Weg met het kruisje of na een klik op de tip; bij een volgende wisseling komt hij terug.
socket.on('adres-tip', tip => {
  const onder = $('other-urls');
  if (!onder || !tip || !tip.van || document.querySelector('.adres-tip')) return;
  const p = document.createElement('p');
  p.className = 'adres-tip muted small';
  const tekst = document.createElement('span');
  tekst.innerHTML = '<i class="ic ic-netwerk" aria-hidden="true"></i> ';
  tekst.append(`Nieuw adres: vorige keer was het ${tip.van}. Een vast adres lost dat op.`);
  const link = document.createElement('a');
  link.href = '/netwerk#vast-adres';
  link.target = '_blank';
  link.textContent = 'Vast adres vragen';
  const weg = document.createElement('button');
  weg.className = 'secondary adres-tip-weg';
  weg.title = 'Verbergen';
  weg.innerHTML = '<i class="ic ic-kruis" aria-hidden="true"></i>';
  const sluit = () => { p.remove(); socket.emit('adres-tip-weg'); };
  link.addEventListener('click', sluit);
  weg.addEventListener('click', sluit);
  p.append(tekst, ' ', link, ' ', weg);
  onder.after(p);
});
