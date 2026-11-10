// De knop "Namen" op elk leerkrachtenscherm: wie is er binnen en waar zit die (welk spel, Runenraadsel, Mijn taken…),
// wie ontbreekt nog, en een verkeerde naam wegklikken, ook tijdens het spel. De leerling krijgt dan weer het
// aanmeldscherm en kiest zijn eigen naam. Wordt geladen door ui.js zodra een leerkrachtenscherm verbinding maakt.
(() => {
  const socket = Ui.hostSocket;
  if (!socket) return;
  const pad = location.pathname.replace(/\/+$/, '') || '/';
  const maakKnop = () => {
    const b = document.createElement('button');
    b.className = 'secondary namen-knop';
    b.innerHTML = `${Ui.ic('namen')} Namen`;
    b.title = 'Wie is er binnen? Een verkeerde naam wegklikken';
    b.addEventListener('click', open);
    return b;
  };

  // In de kopbalk: naast de pauzeknop, of vooraan bij de andere knoppen.
  const kop = maakKnop();
  const pauzeKop = document.querySelector('[data-pauze]');
  const acties = document.querySelector('.topbar .actions');
  if (pauzeKop) pauzeKop.after(kop);
  else if (acties) acties.prepend(kop);

  // Linksonder op een spelbord, zolang er een spel loopt: Pauze en Namen. Zonder kopbalk staat Namen er altijd.
  const rij = document.createElement('div');
  rij.className = 'bord-knoppen hidden';
  const pauze = document.createElement('button');
  pauze.className = 'secondary pauze-knop';
  pauze.innerHTML = '<img src="/img/icons/pauze-klein.webp" alt=""> Pauze';
  pauze.title = 'Alle schermen op slot en het spel even stilzetten';
  pauze.addEventListener('click', () => Ui.pauze.start());
  // Vragenstorm: elke leerling in het spel krijgt meteen een paar vragen na elkaar (src/vragenstorm.js).
  const storm = document.createElement('button');
  storm.className = 'secondary storm-knop hidden';
  storm.title = 'Iedereen krijgt meteen 3 vragen. Elk juist antwoord geeft een bonus in het spel.';
  let stormAan = false;
  const stormTekst = st => {
    stormAan = !!(st && st.aan && st.pad === pad);
    storm.textContent = stormAan ? `⚡ Storm ${st.klaar}/${st.totaal} klaar · Stop` : '⚡ Vragenstorm';
  };
  stormTekst(null);
  storm.addEventListener('click', () => {
    if (stormAan) return socket.emit('storm-stop');
    socket.emit('storm-start', pad, res => { if (res && res.error) Ui.melding(res.error); else stormTekst(res); });
  });
  socket.on('storm-stand', stormTekst);
  // Proefspelen: de leerkracht probeert het spel uit zonder klas. Rechts op het bord komt het scherm van een
  // leerling (Proefridder 1, die bestuur je zelf); Proefridder 2 en 3 spelen onzichtbaar en vanzelf mee.
  const proef = document.createElement('button');
  proef.className = 'secondary proef-knop';
  // Bij een toets of een oefenblad heeft meespelen geen zin: daar zouden de proefridders in de resultaten komen.
  if (/^\/(proef|oefenblad)\b/.test(location.pathname)) proef.hidden = true;
  proef.textContent = 'Proefspelen';
  proef.title = 'Geen klas bij de hand? Speel zelf mee als leerling, met twee proefridders erbij.';
  let proefVak = null;
  proef.addEventListener('click', () => {
    if (proefVak) { proefVak.remove(); proefVak = null; proef.classList.remove('on'); document.body.classList.remove('proef-open'); return; }
    proefVak = document.createElement('aside');
    proefVak.className = 'proef-vak';
    proefVak.innerHTML = '<div class="proef-kop"><strong>Zo ziet een leerling het</strong><button type="button" class="secondary" aria-label="Sluiten"></button></div>'
      + '<p class="muted small">Jij bent Proefridder 1: speel hier mee. Twee andere proefridders antwoorden vanzelf. Hun antwoorden komen niet in het logboek.</p>'
      + '<iframe class="proef-scherm" src="/?proef=1" title="Het scherm van een leerling"></iframe>'
      + '<iframe class="proef-stil" src="/?proef=2" tabindex="-1" aria-hidden="true"></iframe><iframe class="proef-stil" src="/?proef=3" tabindex="-1" aria-hidden="true"></iframe>';
    const dicht = proefVak.querySelector('button');
    dicht.innerHTML = Ui.ic('kruis');
    dicht.addEventListener('click', () => proef.click());
    document.body.append(proefVak);
    document.body.classList.add('proef-open');
    proef.classList.add('on');
  });
  rij.append(pauze, storm, maakKnop(), proef);

  const modal = document.createElement('div');
  modal.className = 'ob-modal hidden';
  modal.innerHTML = '<div class="panel ob-modal-box namen-box"><h3>Wie is er binnen?</h3>'
    + '<p class="muted small">Klikte een leerling op de verkeerde naam? Klik die naam hier weg. De leerling kiest dan opnieuw zijn eigen naam.</p>'
    + '<div class="namen-lijst"></div><p class="muted small namen-extra"></p><div class="actions"><button class="secondary">Sluiten</button></div></div>';
  const lijst = modal.querySelector('.namen-lijst');
  const extra = modal.querySelector('.namen-extra');
  document.body.append(rij, modal);

  let timer = null;
  function laad() {
    socket.emit('namen-lijst', pad, res => {
      if (!res) return;
      const actief = !!res.actief;
      pauze.classList.toggle('hidden', !actief);
      storm.classList.toggle('hidden', !res.storm && !stormAan);
      rij.classList.toggle('hidden', !actief && kop.isConnected);
      kop.classList.toggle('hidden', actief);
      const binnen = (res.spelers || []).filter(p => p.online).length;
      for (const b of document.querySelectorAll('.namen-knop')) b.innerHTML = `${Ui.ic('namen')} Namen${binnen ? ` <b class="namen-tel">${binnen}</b>` : ''}`;
      if (modal.classList.contains('hidden')) return;
      // Wie in het spel van dit scherm zit eerst, daarna de rest op naam.
      const hier = p => p.pad === pad ? 0 : 1;
      const spelers = (res.spelers || []).slice().sort((a, b) => hier(a) - hier(b) || a.name.localeCompare(b.name, 'nl'));
      lijst.innerHTML = '';
      if (!spelers.length) lijst.innerHTML = '<p class="muted">Nog niemand binnen.</p>';
      for (const p of spelers) {
        const r = document.createElement('div');
        r.className = 'namen-rij';
        const naam = document.createElement('span');
        naam.textContent = p.name;
        const waar = document.createElement('small');
        waar.className = 'muted namen-waar';
        waar.textContent = p.waar || '';
        const stip = document.createElement('small');
        stip.className = p.online ? 'namen-on' : 'muted';
        stip.textContent = p.online ? '● verbonden' : '○ niet verbonden';
        const weg = document.createElement('button');
        weg.className = 'secondary';
        weg.innerHTML = `${Ui.ic('kruis')} Wegklikken`;
        weg.addEventListener('click', async () => {
          const wat = p.pad ? ` Wat deze leerling al verdiende in ${p.waar}, gaat verloren.` : '';
          if (!await Ui.vraag(`"${p.name}" wegklikken?${wat}`)) return;
          socket.emit('namen-weg', { pad: p.pad, id: p.id, sock: p.sock });
          setTimeout(laad, 300);
        });
        r.append(naam, waar, stip, weg);
        lijst.appendChild(r);
      }
      const regels = [];
      if (res.zonderNaam) regels.push(`${res.zonderNaam} ${res.zonderNaam === 1 ? 'toestel' : 'toestellen'} verbonden zonder naam.`);
      if (res.afwezig && res.afwezig.length) regels.push(`Nog niet binnen (${res.afwezig.length}): ${res.afwezig.join(', ')}`);
      extra.textContent = regels.join(' ');
    });
  }
  function open() {
    modal.classList.remove('hidden');
    laad();
    clearInterval(timer);
    timer = setInterval(laad, 2000);
  }
  function sluit() {
    modal.classList.add('hidden');
    clearInterval(timer);
  }
  modal.querySelector('.actions button').addEventListener('click', sluit);
  modal.addEventListener('click', e => { if (e.target === modal) sluit(); });
  socket.on('connect', laad);
  laad();
  setInterval(() => { if (modal.classList.contains('hidden')) laad(); }, 2500);
})();
