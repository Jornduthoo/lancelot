// Gedeelde stukjes voor elk scherm: een melding als de verbinding wegvalt, en eigen vensters in ridderstijl
// in plaats van de grijze browservensters. Wordt meteen na socket.io.js geladen, vóór de andere scripts.
(() => {
  // ---------- Pauzeknop ----------
  // De leerkracht zet de klas stil. Dan staat op dit scherm de klok stil: Date.now, performance.now,
  // requestAnimationFrame en de timers wachten tot de pauze voorbij is. Zo bevriest elk spel vanzelf,
  // en loopt het daarna verder zonder sprong. Leerlingen zien een slot, het bord krijgt de knop "Verder".
  const echt = {
    now: Date.now.bind(Date), perf: performance.now.bind(performance),
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
    st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window),
    si: window.setInterval.bind(window), ci: window.clearInterval.bind(window),
  };
  const Pauze = (() => {
    let sinds = 0;   // performance-tijd waarop de pauze hier begon, 0 = geen pauze
    let stil = 0;    // hoe lang alle pauzes samen duurden
    let host = false;
    let hostSocket = null;
    let scherm = null;
    let tekstVeld = null;
    const timers = new Map();
    const wacht = new Set();
    const frames = new Map();
    const geluid = [];
    let volgnr = 0;

    Date.now = () => echt.now() - stil - (sinds ? echt.perf() - sinds : 0);
    performance.now = () => (sinds || echt.perf()) - stil;

    // Beelden: een frame dat tijdens de pauze valt, wacht tot erna.
    function beeld(id) {
      const f = frames.get(id);
      f.echt = echt.raf(t => {
        if (sinds) { f.echt = 0; return; }
        frames.delete(id);
        f.cb(t - stil);
      });
    }
    window.requestAnimationFrame = cb => { const id = ++volgnr; frames.set(id, { cb }); beeld(id); return id; };
    window.cancelAnimationFrame = id => { const f = frames.get(id); if (f) { if (f.echt) echt.caf(f.echt); frames.delete(id); } };

    // Timers: aflopen op de stilstaande klok.
    function plan(id) {
      const t = timers.get(id);
      t.echt = echt.st(() => af(id), Math.max(0, t.op - Date.now()));
    }
    function af(id) {
      const t = timers.get(id);
      if (!t) return;
      t.echt = 0;
      if (sinds) return wacht.add(id);
      if (Date.now() < t.op) return plan(id);
      timers.delete(id);
      t.fn(...t.args);
    }
    window.setTimeout = (fn, ms, ...args) => {
      if (typeof fn !== 'function') return 0;
      const id = ++volgnr;
      timers.set(id, { fn, args, op: Date.now() + Math.max(0, Number(ms) || 0) });
      plan(id);
      return id;
    };
    window.setInterval = (fn, ms, ...args) => {
      if (typeof fn !== 'function') return 0;
      const id = ++volgnr;
      timers.set(id, { iv: echt.si(() => { if (!sinds) fn(...args); }, ms) });
      return id;
    };
    window.clearTimeout = window.clearInterval = id => {
      const t = timers.get(id);
      if (!t) return;
      timers.delete(id);
      wacht.delete(id);
      if (t.iv) echt.ci(t.iv);
      if (t.echt) echt.ct(t.echt);
    };

    // Geluid van de spellen (motor, muziek) zwijgt tijdens de pauze.
    for (const naam of ['AudioContext', 'webkitAudioContext']) {
      const AC = window[naam];
      if (typeof AC !== 'function') continue;
      window[naam] = class extends AC {
        constructor(...a) { super(...a); geluid.push(this); }
        resume() { return sinds ? Promise.resolve() : super.resume(); }
      };
    }

    // Toetsen gaan niet naar het spel; loslaten wel, zodat er geen toets blijft "hangen".
    window.addEventListener('keydown', e => {
      if (sinds && !(scherm && scherm.contains(e.target))) { e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);

    function bouw() {
      scherm = document.createElement('div');
      scherm.className = 'pauze-scherm' + (host ? ' pauze-bord' : '');
      scherm.setAttribute('role', 'alertdialog');
      scherm.innerHTML = '<div class="pauze-inhoud"><img class="pauze-slot" src="/img/icons/pauze.webp" alt="">'
        + '<h2>Even pauze</h2><p class="pauze-tekst"></p></div>';
      if (host) {
        const extra = document.createElement('div');
        extra.className = 'pauze-host';
        extra.innerHTML = '<p class="muted">Alle schermen staan stil. Een bericht voor de leerlingen (mag leeg):</p>'
          + '<div class="pauze-snel"></div><form class="pauze-form"><input maxlength="120" placeholder="Eigen bericht…"><button class="secondary">Toon</button></form>'
          + '<button class="pauze-verder">Verder spelen</button>';
        for (const t of ['Kijk naar het bord', 'Luister even', 'Handen omhoog', 'Ruim op']) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'secondary';
          b.textContent = t;
          b.addEventListener('click', () => stuur(true, t));
          extra.querySelector('.pauze-snel').appendChild(b);
        }
        tekstVeld = extra.querySelector('input');
        extra.querySelector('form').addEventListener('submit', e => { e.preventDefault(); stuur(true, tekstVeld.value); });
        extra.querySelector('.pauze-verder').addEventListener('click', () => stuur(false));
        scherm.querySelector('.pauze-inhoud').appendChild(extra);
      }
      document.body.appendChild(scherm);
    }

    function zet(st) {
      const aan = !!(st && st.aan);
      const tekst = (st && st.tekst) || '';
      if (aan) {
        if (!scherm) bouw();
        scherm.querySelector('.pauze-tekst').textContent = tekst || (host ? '' : 'Kijk naar de leerkracht.');
        scherm.classList.add('aan');
        if (!sinds) {
          sinds = echt.perf();
          for (const a of geluid) if (a.state === 'running') a.suspend();
          if (document.activeElement && !scherm.contains(document.activeElement)) document.activeElement.blur();
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        }
      } else if (sinds) {
        stil += echt.perf() - sinds;
        sinds = 0;
        scherm.classList.remove('aan');
        if (tekstVeld) tekstVeld.value = '';
        for (const a of geluid) if (a.state === 'suspended') a.resume();
        for (const id of [...frames.keys()]) if (!frames.get(id).echt) beeld(id);
        const lijst = [...wacht];
        wacht.clear();
        for (const id of lijst) if (timers.has(id)) plan(id);
      }
    }

    function stuur(aan, tekst) {
      if (hostSocket) hostSocket.emit('pauze-zet', { aan, tekst });
    }

    return {
      volg(socket, isHost) {
        if (isHost) { host = true; hostSocket = hostSocket || socket; }
        socket.on('pauze', zet);
      },
      // Voor de knop op het bord.
      start: () => stuur(true, ''),
      get aan() { return !!sinds; },
    };
  })();

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
      echt.ct(weg);
      echt.ct(toon);
      // Even wachten: een korte hapering hoeft niemand te zien.
      toon = echt.st(() => {
        kwijt = true;
        zet(host
          ? 'Verbinding met LANcelot kwijt. Draait LANcelot nog op deze pc? We proberen het opnieuw…'
          : 'Verbinding kwijt. Blijf even wachten, we proberen het opnieuw…');
      }, 1500);
    });
    socket.on('connect', () => {
      echt.ct(toon);
      if (!kwijt) return;
      kwijt = false;
      zet('Weer verbonden!', true);
      weg = echt.st(() => balk.classList.add('hidden'), 2000);
    });
  }

  if (typeof window.io === 'function') {
    const io = window.io;
    window.io = Object.assign(function (...args) {
      // De verbinding zelf gebruikt de echte timers: die mag niet stilvallen tijdens een pauze.
      const i = args.findIndex(a => a && typeof a === 'object');
      if (i >= 0) args[i] = { ...args[i], useNativeTimers: true };
      else args.push({ useNativeTimers: true });
      const opts = args.find(a => a && typeof a === 'object');
      const socket = io(...args);
      volg(socket, opts);
      Pauze.volg(socket, !!(opts.query && opts.query.role === 'host'));
      socket.on('uitleg', u => u && toonUitleg(u));
      return socket;
    }, io);
  }

  // ---------- Uitleg na een fout antwoord ----------
  // De server stuurt { tekst, juist } in elk spel. Tik erop om hem weg te doen.
  const uitleg = document.createElement('div');
  uitleg.className = 'ui-uitleg hidden';
  uitleg.setAttribute('role', 'status');
  let uitlegWeg = null;
  uitleg.addEventListener('click', () => uitleg.classList.add('hidden'));

  function toonUitleg({ tekst, juist }) {
    if (!tekst) return;
    uitleg.innerHTML = '<b>Waarom?</b><span></span><small></small>';
    uitleg.children[1].textContent = tekst;
    uitleg.children[2].textContent = juist ? `Juist antwoord: ${juist}` : '';
    if (!uitleg.isConnected) document.body.appendChild(uitleg);
    uitleg.classList.remove('hidden');
    // Opnieuw laten inschuiven, ook als er al een uitleg stond.
    uitleg.style.animation = 'none';
    void uitleg.offsetWidth;
    uitleg.style.animation = '';
    clearTimeout(uitlegWeg);
    uitlegWeg = setTimeout(() => uitleg.classList.add('hidden'), Math.min(11000, 4500 + 55 * tekst.length));
  }

  // ---------- Getal typen ----------
  // Bij een getalvraag (res.typ === 'getal') vervangt een invulveld de antwoordknoppen in box.
  // kies(tekst) krijgt wat de leerling typte. Geeft het invulveld terug.
  function getal(box, kies) {
    box.innerHTML = `<form class="ui-getal"><input type="text" inputmode="decimal" autocomplete="off" maxlength="20" placeholder="Typ je antwoord" aria-label="Typ je antwoord"><button type="submit" class="gold">OK</button></form>`;
    const form = box.firstChild;
    const veld = form.querySelector('input');
    // Cijfers zijn hier om te typen, niet om een antwoord 1 tot 4 te kiezen of je ridder te sturen.
    for (const soort of ['keydown', 'keyup']) veld.addEventListener(soort, e => e.stopPropagation());
    form.addEventListener('submit', e => {
      e.preventDefault();
      const tekst = veld.value.trim();
      if (!tekst || veld.disabled) return;
      veld.disabled = true;
      form.querySelector('button').disabled = true;
      kies(tekst);
    });
    setTimeout(() => veld.focus({ preventScroll: true }), 50);
    return veld;
  }

  // Na het antwoord: groen of rood, met het juiste getal erbij als het fout was.
  function getalKlaar(veld, goed, juist) {
    const form = veld && veld.closest('form');
    if (!form) return;
    form.classList.add(goed ? 'goed' : 'fout');
    if (!goed && juist) {
      const p = document.createElement('p');
      p.className = 'ui-getal-juist';
      p.textContent = `Juist: ${juist}`;
      form.appendChild(p);
    }
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
    uitleg: toonUitleg,
    getal,
    getalKlaar,
    // Een klein icoon uit style.css (.ic-…) voor in een knop.
    ic: naam => `<i class="ic ic-${naam}" aria-hidden="true"></i>`,
    pauze: Pauze,
  };
})();
