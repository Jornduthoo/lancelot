// Een quiz-taak alleen spelen in een spel (startscherm met ?taak=...). De server geeft deze verbinding alleen dat eigen spel;
// hier komt erbovenop wat bij de taak hoort: een seintje als de taak klaar is, en na de tijd nog een ronde of terug naar Mijn taken.
// Gebruikt socket, soloTaak en $ uit player.js, en confetti uit fx.js.
(() => {
  if (!soloTaak) return;
  document.body.classList.add('tk-solo');
  const box = document.createElement('div');
  box.className = 'tk-solo-scherm';
  box.innerHTML = `<div class="panel">
    <p class="title" id="tks-titel">Even laden…</p>
    <p id="tks-tekst"></p>
    <div class="tk-solo-knoppen">
      <button type="button" class="gold big hidden" id="tks-opnieuw">Nog een ronde</button>
      <a class="button secondary" href="/mijn-taken">Terug naar mijn taken</a>
    </div>
  </div>`;
  const toast = document.createElement('div');
  toast.className = 'tk-solo-toast hidden';
  document.body.append(box, toast);
  let stand = { gedaan: 0, totaal: 0 };
  let begonnen = false;

  function toon(titel, tekst, opnieuw) {
    $('tks-titel').textContent = titel;
    $('tks-tekst').textContent = tekst;
    $('tks-opnieuw').classList.toggle('hidden', !opnieuw);
    box.classList.remove('weg');
  }

  socket.on('tk-solo', d => {
    if (d.fout) return toon('Dit lukt niet', d.fout, false);
    stand = { ...stand, ...d };
    if (d.titel) document.title = `LANcelot · ${d.titel}`;
    if (!begonnen && !d.einde) {
      begonnen = true;
      box.classList.add('weg');
    }
    if (d.net) {
      toast.textContent = '✔ Taak klaar! Speel gerust verder tot de tijd om is.';
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 5000);
    }
    if (!d.einde) return;
    const nog = stand.totaal - stand.gedaan;
    if (stand.klaar) {
      toon('Taak klaar!', `Je beantwoordde alle ${stand.totaal} vragen.`, false);
      confetti(3000);
    } else {
      toon('De tijd is om', `Je beantwoordde ${stand.gedaan} van de ${stand.totaal} vragen. Nog ${nog} ${nog === 1 ? 'vraag' : 'vragen'}: speel nog een ronde om je taak af te maken.`, true);
    }
  });

  $('tks-opnieuw').addEventListener('click', () => {
    socket.emit('tk-solo-opnieuw', null, res => {
      if (res && res.error) return toon('Dit lukt niet', res.error, false);
      box.classList.add('weg');
    });
  });
})();
