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
    klasForget();
    klasPaint();
  });
}

// Staat er een klaslijst, dan doet een onthouden naam die niet op de lijst staat niet meer vanzelf mee
// (bijvoorbeeld de naam van de leerkracht die even testte): de leerling kiest dan zelf zijn naam.
function klasForget() {
  const saved = store('lancelot-name');
  if (!klasNamen.length || !saved) return;
  if (klasNamen.some(n => n.toLowerCase() === saved.trim().toLowerCase())) return;
  store('lancelot-name', null);
  if (typeof myName !== 'undefined') myName = '';
  for (const input of document.querySelectorAll('form.welcome input')) if (input.value.trim() === saved) input.value = '';
}

socket.on('connect', klasLoad);
socket.on('klas-namen', namen => {
  klasNamen = Array.isArray(namen) ? namen : [];
  klasForget();
  klasPaint();
});

// "Niet jij?": op een gedeelde Chromebook of na een test van de leerkracht met een andere naam opnieuw aanmelden.
// Een nieuwe speler-id, zodat de server de oude naam niet terugkoppelt. De leerkracht kan de oude naam wegklikken.
function klasSwitch() {
  store('lancelot-name', null);
  store('lancelot-id', null);
  location.reload();
}

for (const place of document.querySelectorAll('#lobby, section.screen[id$="-lobby"], #ob-work .ob-who')) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'secondary klas-switch';
  b.textContent = 'Niet jij? Kies je naam';
  b.addEventListener('click', klasSwitch);
  if (place.id === 'ob-who' || place.classList.contains('ob-who')) place.after(b);
  else place.appendChild(b);
}
