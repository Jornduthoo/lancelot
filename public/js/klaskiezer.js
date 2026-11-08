// Meerdere klassen op één toestel: de kiezer bovenaan Mijn klas (Klas, Zorg, Taken, Doelen, Logboek) en Onze klas (Junior).
// Elke klas heeft haar eigen klaslijst, logboek, taken, burchten, huisdieren, stickers en klasdraakje.
// Overal dezelfde balk: tik een klas aan om te wisselen, ＋ voor een nieuwe klas, ✏️ om de naam te veranderen.
// Gebruik: KlasKiezer.start(socket, document.getElementById('klaskiezer')). Na een wissel laadt de pagina opnieuw.
(function () {
  function knop(tekst, klas, titel) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = klas;
    b.textContent = tekst;
    if (titel) { b.title = titel; b.setAttribute('aria-label', titel); }
    return b;
  }

  function start(socket, box) {
    if (!socket || !box) return;
    let stand = null;
    let bezig = false;
    let form = null; // null, { soort: 'nieuw' } of { soort: 'naam' }

    const naamVan = k => k.naam || `Klas ${k.nr}`;

    function fout(res) {
      if (res && res.error) { Ui.melding(res.error); return true; }
      return false;
    }

    function stuur(event, arg, herlaad) {
      if (bezig) return;
      bezig = true;
      socket.emit(event, arg, res => {
        bezig = false;
        if (fout(res)) return;
        if (herlaad) location.reload();
        else { stand = res; form = null; teken(); }
      });
    }

    function teken() {
      box.innerHTML = '';
      if (!stand) return;
      box.classList.add('klaskiezer');
      const lijst = document.createElement('div');
      lijst.className = 'kk-lijst';
      lijst.setAttribute('role', 'group');
      lijst.setAttribute('aria-label', 'Klassen');
      for (const k of stand.klassen) {
        const actief = k.id === stand.actief;
        const b = knop('', `kk-klas secondary${actief ? ' on' : ''}`);
        b.setAttribute('aria-pressed', actief ? 'true' : 'false');
        const n = document.createElement('b');
        n.textContent = naamVan(k);
        n.setAttribute('data-geen-vertaling', '');
        const t = document.createElement('span');
        t.textContent = String(k.aantal);
        t.title = 'Aantal leerlingen';
        b.append(n, t);
        if (!actief) b.addEventListener('click', () => stuur('klassen-kies', { id: k.id }, true));
        lijst.appendChild(b);
      }
      const plus = knop('＋ Nieuwe klas', 'kk-plus secondary');
      plus.addEventListener('click', () => { form = form && form.soort === 'nieuw' ? null : { soort: 'nieuw' }; teken(); });
      lijst.appendChild(plus);
      const nu = stand.klassen.find(k => k.id === stand.actief);
      const pen = knop('✏️', 'kk-pen secondary', 'Naam van de klas veranderen');
      pen.addEventListener('click', () => { form = form && form.soort === 'naam' ? null : { soort: 'naam' }; teken(); });
      lijst.appendChild(pen);
      if (nu && stand.klassen.length > 1 && nu.nr !== 1) {
        const weg = knop('🗑️', 'kk-weg secondary', 'Deze klas weghalen');
        weg.addEventListener('click', async () => {
          const ok = await Ui.vraag(`${naamVan(nu)} weghalen? Je kiest dan weer de eerste klas. Er wordt niets gewist: de map van de klas gaat naar klassen/_weg bij je gegevens.`, { ja: 'Weghalen', gevaar: true });
          if (ok) stuur('klassen-weg', { id: nu.id }, true);
        });
        lijst.appendChild(weg);
      }
      box.appendChild(lijst);

      if (form) {
        const f = document.createElement('form');
        f.className = 'kk-form';
        const input = document.createElement('input');
        input.maxLength = 40;
        input.placeholder = 'Naam van de klas, bijv. 5B';
        if (form.soort === 'naam' && nu) input.value = nu.naam;
        const ok = knop(form.soort === 'nieuw' ? 'Klas maken' : 'Bewaren', '');
        ok.type = 'submit';
        const nee = knop('Annuleren', 'secondary');
        nee.addEventListener('click', () => { form = null; teken(); });
        f.append(input, ok, nee);
        if (form.soort === 'nieuw') {
          const p = document.createElement('p');
          p.className = 'muted small';
          p.textContent = 'Een nieuwe klas begint leeg: eigen leerlingen, logboek, taken, burchten en klasdraakje. Quizzen, oefenbladen en toetsen deel je met al je klassen.';
          f.appendChild(p);
        }
        f.addEventListener('submit', e => {
          e.preventDefault();
          const naam = input.value.trim();
          if (form.soort === 'nieuw') stuur('klassen-nieuw', { naam }, true);
          else stuur('klassen-naam', { naam }, false);
        });
        box.appendChild(f);
        input.focus();
      }
    }

    const laad = () => socket.emit('klassen-get', null, res => { if (!fout(res)) { stand = res; teken(); } });
    socket.on('connect', laad);
    if (socket.connected) laad();
    // Op een ander scherm (of via Mijn lesmap) veranderd: een andere klas gekozen, dan deze pagina opnieuw laden.
    socket.on('klassen', res => {
      if (stand && res.actief !== stand.actief) return location.reload();
      if (!form) { stand = res; teken(); }
    });
  }

  window.KlasKiezer = { start };
})();
