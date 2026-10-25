// Staat er een klaslijst op de pc van de leerkracht, dan tikt een leerling zijn naam aan in plaats van hem te typen.
// Zo horen al zijn antwoorden in het logboek bij dezelfde leerling. Typen blijft mogelijk, bijvoorbeeld voor een gast.
// Gebruikt socket uit player.js.
let klasNamen = [];

let klasBezet = new Set(); // namen die al bij een andere, verbonden leerling horen

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
      if (klasBezet.has(naam.toLowerCase())) {
        b.disabled = true;
        b.className = 'bezet';
        b.title = 'Deze naam is al binnen. Is dit jouw naam? Vraag de leerkracht om hem weg te klikken.';
      }
      b.addEventListener('click', () => klasPick(form, input, naam));
      box.appendChild(b);
    }
    if (klasBezet.size) {
      const hint = document.createElement('p');
      hint.className = 'muted small klas-hint';
      hint.textContent = 'Grijze namen zijn al binnen. Staat jouw naam grijs? Vraag de leerkracht om hem weg te klikken.';
      box.appendChild(hint);
    }
    input.placeholder = 'Niet in de lijst? Typ je naam';
  }
}

// Hoort de naam bij een speler die even weg was (andere Chromebook, pagina herladen), dan neemt de leerling die speler terug over.
function klasPick(form, input, naam) {
  socket.emit('klas-claim', naam, res => {
    if (res && typeof res.id === 'string' && res.id) {
      playerId = res.id;
      store('lancelot-id', res.id);
    }
    input.value = naam;
    form.requestSubmit();
  });
}

// Welke namen zijn al bezet? Alleen vragen zolang een aanmeldscherm open staat.
let klasBezetKey = '';
function klasCheck() {
  if (!klasNamen.length || !socket.connected) return;
  const open = [...document.querySelectorAll('form.welcome')].some(f => !f.classList.contains('hidden') && f.offsetParent !== null);
  if (!open) return;
  socket.emit('klas-bezet', playerId, namen => {
    const lijst = Array.isArray(namen) ? namen : [];
    const key = lijst.slice().sort().join('|');
    if (key === klasBezetKey) return;
    klasBezetKey = key;
    klasBezet = new Set(lijst);
    klasPaint();
  });
}
setInterval(klasCheck, 3000);

function klasLoad() {
  socket.emit('klas-namen', null, namen => {
    klasNamen = Array.isArray(namen) ? namen : [];
    klasForget();
    klasPaint();
    klasCheck();
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
