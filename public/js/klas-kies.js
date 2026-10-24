// Staat er een klaslijst op de pc van de leerkracht, dan tikt een leerling zijn naam aan in plaats van hem te typen.
// Zo horen al zijn antwoorden in het logboek bij dezelfde leerling. Typen blijft mogelijk, bijvoorbeeld voor een gast.
// Gebruikt socket uit player.js.
let klasNamen = [];

function klasPaint() {
  for (const form of document.querySelectorAll('form.welcome')) {
    const input = form.querySelector('input');
    if (!input) continue;
    let box = form.querySelector('.klas-namen');
    if (!klasNamen.length) {
      if (box) box.remove();
      input.placeholder = 'Je naam';
      continue;
    }
    if (!box) {
      box = document.createElement('div');
      box.className = 'klas-namen';
      input.before(box);
    }
    box.innerHTML = '';
    for (const naam of klasNamen) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = naam;
      b.addEventListener('click', () => {
        input.value = naam;
        form.requestSubmit();
      });
      box.appendChild(b);
    }
    input.placeholder = 'Niet in de lijst? Typ je naam';
  }
}

function klasLoad() {
  socket.emit('klas-namen', null, namen => {
    klasNamen = Array.isArray(namen) ? namen : [];
    klasPaint();
  });
}

socket.on('connect', klasLoad);
socket.on('klas-namen', namen => {
  klasNamen = Array.isArray(namen) ? namen : [];
  klasPaint();
});
