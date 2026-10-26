// De knoppen "Pauze" en "Namen" linksonder op elk spelbord: wie is er binnen, en een verkeerde naam wegklikken, ook tijdens het spel.
// De leerling krijgt dan weer het aanmeldscherm en kiest zijn eigen naam. Wordt geladen door overzicht.js.
(() => {
  const pad = location.pathname.replace(/\/+$/, '') || '/';
  const rij = document.createElement('div');
  rij.className = 'bord-knoppen hidden';
  const btn = document.createElement('button');
  btn.className = 'secondary namen-knop';
  btn.innerHTML = `${Ui.ic('namen')} Namen`;
  btn.title = 'Wie is er binnen? Een verkeerde naam wegklikken';
  // De pauzeknop: alle schermen even op slot om de aandacht te vragen. Het spel staat stil tot je verder klikt.
  const pauze = document.createElement('button');
  pauze.className = 'secondary pauze-knop';
  pauze.innerHTML = '<img src="/img/icons/pauze-klein.webp" alt=""> Pauze';
  pauze.title = 'Alle schermen op slot en het spel even stilzetten';
  pauze.addEventListener('click', () => Ui.pauze.start());
  rij.append(pauze, btn);
  const modal = document.createElement('div');
  modal.className = 'ob-modal hidden';
  modal.innerHTML = '<div class="panel ob-modal-box namen-box"><h3>Wie is er binnen?</h3>'
    + '<p class="muted small">Klikte een leerling op de verkeerde naam? Klik die naam hier weg. De leerling kiest dan opnieuw zijn eigen naam.</p>'
    + '<div class="namen-lijst"></div><div class="actions"><button class="secondary">Sluiten</button></div></div>';
  const lijst = modal.querySelector('.namen-lijst');
  document.body.append(rij, modal);

  let timer = null;
  function laad() {
    socket.emit('namen-lijst', pad, res => {
      if (!res || res.geen) return;
      // Alleen tonen zolang er een spel loopt, niet in de quizlijst of de maker.
      rij.classList.toggle('hidden', !res.actief);
      if (modal.classList.contains('hidden')) return;
      const spelers = (res.spelers || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'nl'));
      lijst.innerHTML = '';
      if (!spelers.length) lijst.innerHTML = '<p class="muted">Nog niemand binnen.</p>';
      for (const p of spelers) {
        const rij = document.createElement('div');
        rij.className = 'namen-rij';
        const naam = document.createElement('span');
        naam.textContent = p.name;
        const stip = document.createElement('small');
        stip.className = p.online ? 'namen-on' : 'muted';
        stip.textContent = p.online ? '● verbonden' : '○ niet verbonden';
        const weg = document.createElement('button');
        weg.className = 'secondary';
        weg.innerHTML = `${Ui.ic('kruis')} Wegklikken`;
        weg.addEventListener('click', async () => {
          if (!await Ui.vraag(`"${p.name}" wegklikken? Wat deze leerling al verdiende in dit spel, gaat verloren.`)) return;
          socket.emit('namen-weg', { pad, id: p.id });
          setTimeout(laad, 300);
        });
        rij.append(naam, stip, weg);
        lijst.appendChild(rij);
      }
    });
  }
  function sluit() {
    modal.classList.add('hidden');
    clearInterval(timer);
  }
  btn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    laad();
    clearInterval(timer);
    timer = setInterval(laad, 2000);
  });
  modal.querySelector('.actions button').addEventListener('click', sluit);
  modal.addEventListener('click', e => { if (e.target === modal) sluit(); });
  socket.on('connect', laad);
  laad();
  setInterval(() => { if (modal.classList.contains('hidden')) laad(); }, 2500);
})();
