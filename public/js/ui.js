// Gedeelde stukjes voor elk scherm: een melding als de verbinding wegvalt, en eigen vensters in ridderstijl
// in plaats van de grijze browservensters. Wordt meteen na socket.io.js geladen, vóór de andere scripts.
(() => {
  // ---------- Verbinding kwijt ----------
  const balk = document.createElement('div');
  balk.className = 'ui-verbinding hidden';
  balk.setAttribute('role', 'status');
  let toon = null;
  let weg = null;
  let kwijt = false;

  function zet(tekst, ok) {
    balk.textContent = tekst;
    balk.classList.toggle('ok', !!ok);
    balk.classList.remove('hidden');
    if (!balk.isConnected) document.body.appendChild(balk);
  }

  function volg(socket, opts) {
    const host = !!(opts && opts.query && opts.query.role === 'host');
    socket.on('disconnect', reden => {
      // Zelf afgesloten (pagina verlaten): geen melding.
      if (reden === 'io client disconnect') return;
      clearTimeout(weg);
      clearTimeout(toon);
      // Even wachten: een korte hapering hoeft niemand te zien.
      toon = setTimeout(() => {
        kwijt = true;
        zet(host
          ? 'Verbinding met LANcelot kwijt. Draait LANcelot nog op deze pc? We proberen het opnieuw…'
          : 'Verbinding kwijt. Blijf even wachten, we proberen het opnieuw…');
      }, 1500);
    });
    socket.on('connect', () => {
      clearTimeout(toon);
      if (!kwijt) return;
      kwijt = false;
      zet('Weer verbonden!', true);
      weg = setTimeout(() => balk.classList.add('hidden'), 2000);
    });
  }

  if (typeof window.io === 'function') {
    const io = window.io;
    window.io = Object.assign(function (...args) {
      const socket = io(...args);
      volg(socket, args.find(a => a && typeof a === 'object'));
      return socket;
    }, io);
  }

  // ---------- Vensters ----------
  // Ui.vraag(tekst, { ja, nee }) geeft een Promise met true/false. Ui.melding(tekst) toont enkel een tekst met OK.
  let open = Promise.resolve();

  function venster(tekst, knoppen) {
    const dlg = document.createElement('dialog');
    dlg.className = 'ui-venster';
    const p = document.createElement('p');
    p.textContent = tekst;
    const rij = document.createElement('div');
    rij.className = 'actions';
    dlg.append(p, rij);
    return new Promise(klaar => {
      let antwoord = false;
      for (const k of knoppen) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = k.tekst;
        if (k.klas) b.className = k.klas;
        b.addEventListener('click', () => { antwoord = k.waarde; dlg.close(); });
        rij.appendChild(b);
      }
      dlg.addEventListener('close', () => { dlg.remove(); klaar(antwoord); });
      document.body.appendChild(dlg);
      dlg.showModal();
      rij.lastChild.focus();
    });
  }

  // Eén venster tegelijk: een tweede wacht tot het eerste dicht is.
  function wachtrij(tekst, knoppen) {
    const beurt = open.then(() => venster(tekst, knoppen));
    open = beurt.catch(() => {});
    return beurt;
  }

  window.Ui = {
    vraag: (tekst, o = {}) => wachtrij(tekst, [
      { tekst: o.nee || 'Annuleren', klas: 'secondary', waarde: false },
      { tekst: o.ja || 'Ja', klas: o.gevaar ? 'danger' : '', waarde: true },
    ]),
    melding: tekst => wachtrij(tekst, [{ tekst: 'OK', waarde: true }]),
    // Een klein icoon uit style.css (.ic-…) voor in een knop.
    ic: naam => `<i class="ic ic-${naam}" aria-hidden="true"></i>`,
  };
})();
