// Gedeelde stukjes voor elk scherm: een melding als de verbinding wegvalt, en eigen vensters in ridderstijl
// in plaats van de grijze browservensters. Wordt meteen na socket.io.js geladen, vóór de andere scripts.
(() => {
  // ---------- Thema ----------
  // De leerkracht kiest bij Instellingen > Uiterlijk een thema voor alle schermen. Het staat in de server
  // en elk scherm onthoudt het ook zelf, zodat het bij het laden meteen in de juiste kleuren verschijnt.
  const THEMAS = [
    { id: 'nachtburcht', naam: 'Nachtburcht', uitleg: 'Donker met blauw neon', kleuren: ['#060a13', '#101c32', '#4cc9ff', '#ffc94a'] },
    { id: 'daglicht', naam: 'Daglicht', uitleg: 'Licht perkament, voor een zonnige klas', kleuren: ['#ece6d6', '#fdfaf2', '#1666a0', '#a87006'] },
    { id: 'ijspaleis', naam: 'IJspaleis', uitleg: 'Licht en koel blauw', kleuren: ['#e4eef8', '#fafdff', '#0074ba', '#a66e00'] },
    { id: 'rozenkasteel', naam: 'Rozenkasteel', uitleg: 'Donkerpaars met roze en goud', kleuren: ['#16081e', '#321242', '#ff70c8', '#ffc94a'] },
    { id: 'smaragdwoud', naam: 'Smaragdwoud', uitleg: 'Diepgroen met goud', kleuren: ['#04100a', '#0e281c', '#46e292', '#ffc94a'] },
    { id: 'drakenvuur', naam: 'Drakenvuur', uitleg: 'Zwart met vuurrode gloed', kleuren: ['#100604', '#2c100a', '#ff742c', '#ffc94a'] },
    { id: 'contrast', naam: 'Hoog contrast', uitleg: 'Zwart en fel geel, het best leesbaar', kleuren: ['#000000', '#0a0a0a', '#ffe600', '#ffffff'] },
  ];
  let thema = 'nachtburcht';
  function zetThema(id) {
    if (!THEMAS.some(t => t.id === id)) id = 'nachtburcht';
    thema = id;
    if (id === 'nachtburcht') delete document.documentElement.dataset.thema;
    else document.documentElement.dataset.thema = id;
    try { localStorage.setItem('lancelot-thema', id); } catch { /* geen opslag */ }
    for (const b of document.querySelectorAll('.thema-keuze')) b.setAttribute('aria-pressed', String(b.dataset.thema === id));
  }
  try { zetThema(localStorage.getItem('lancelot-thema')); } catch { /* geen opslag */ }
  // Bij een licht thema: zodra er een speelveld open staat (bord of leerling), terug naar donker.
  const SPELVELD = 'section#play:not(.hidden), [id$="-game"]:not(.hidden), .ak-game:not(.hidden), #vr-meeting:not(.hidden), #bb-dragon:not(.hidden), #du-wait:not(.hidden)';
  setInterval(() => {
    const html = document.documentElement;
    const spel = /^(daglicht|ijspaleis)$/.test(thema) && !!document.querySelector(SPELVELD);
    if (spel !== html.hasAttribute('data-spel')) html.toggleAttribute('data-spel', spel);
  }, 400);

  // Vult een leeg <div id="thema-kiezer"> met de keuzes (alleen op het leerkrachtenscherm).
  function themaKiezer() {
    const vak = document.getElementById('thema-kiezer');
    if (!vak || vak.dataset.klaar) return;
    vak.dataset.klaar = '1';
    vak.classList.add('panel', 'form');
    vak.innerHTML = '<h3>Thema</h3><p class="muted small">Kies de kleuren van LANcelot. Het thema geldt voor het bord en voor de schermen van de leerlingen. Is het bord moeilijk leesbaar in een lichte klas, kies dan Daglicht, IJspaleis of Hoog contrast. De games zelf houden hun eigen kleuren.</p><div class="thema-raster"></div>';
    const raster = vak.querySelector('.thema-raster');
    for (const t of THEMAS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary thema-keuze';
      b.dataset.thema = t.id;
      b.setAttribute('aria-pressed', String(t.id === thema));
      b.innerHTML = `<span class="thema-staal">${t.kleuren.map(k => `<i style="background:${k}"></i>`).join('')}</span><strong>${t.naam}</strong><small>${t.uitleg}</small>`;
      b.addEventListener('click', () => {
        zetThema(t.id);
        if (window.Ui.hostSocket) window.Ui.hostSocket.emit('thema-zet', t.id);
      });
      raster.appendChild(b);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', themaKiezer);
  else themaKiezer();

  // ---------- Taal ----------
  // Vult een leeg <div id="taal-kiezer"> met de talen (alleen op het leerkrachtenscherm). De taal geldt voor alle schermen.
  const TALEN = [{ id: 'nl', naam: 'Nederlands', vlag: '<svg viewBox="0 0 3 2"><path fill="#000" d="M0 0h1v2H0z"/><path fill="#fdda24" d="M1 0h1v2H1z"/><path fill="#ef3340" d="M2 0h1v2H2z"/></svg>' }, { id: 'en', naam: 'English', vlag: '<svg viewBox="0 0 60 30"><clipPath id="vlag-uk"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#vlag-uk)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>' }, { id: 'fr', naam: 'Français', vlag: '<svg viewBox="0 0 3 2"><path fill="#002654" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#ce1126" d="M2 0h1v2H2z"/></svg>' }, { id: 'es', naam: 'Español', vlag: '<svg viewBox="0 0 3 2"><path fill="#aa151b" d="M0 0h3v2H0z"/><path fill="#f1bf00" d="M0 .5h3v1H0z"/></svg>' }, { id: 'de', naam: 'Deutsch', vlag: '<svg viewBox="0 0 5 3"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#d00" d="M0 1h5v1H0z"/><path fill="#ffce00" d="M0 2h5v1H0z"/></svg>' }];
  const taalNu = window.LANCELOT_TAAL || 'nl';
  function taalKiezer() {
    const vak = document.getElementById('taal-kiezer');
    if (!vak || vak.dataset.klaar) return;
    vak.dataset.klaar = '1';
    vak.classList.add('panel', 'form');
    vak.innerHTML = '<h3>Taal · Language</h3><p class="muted small">De taal van LANcelot, voor het bord en voor de schermen van de leerlingen. · The language of LANcelot, for the board and for the students\' screens.</p><div class="taal-raster" data-geen-vertaling></div>';
    const raster = vak.querySelector('.taal-raster');
    for (const t of TALEN) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary taal-keuze';
      b.setAttribute('aria-pressed', String(t.id === taalNu));
      b.innerHTML = `<span class="taal-vlag" aria-hidden="true">${t.vlag}</span><strong>${t.naam}</strong>`;
      b.addEventListener('click', () => {
        if (t.id === taalNu || !window.Ui.hostSocket) return;
        window.Ui.hostSocket.emit('taal-zet', t.id);
      });
      raster.appendChild(b);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', taalKiezer);
  else taalKiezer();

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

    // De klokdatum (Date.now) volgt de server. Bij de pauzeknop staat ook de server stil; bij de Vragenstorm
    // niet: dan loopt de datum gewoon door (datumMee) en staan alleen beelden, timers en spelklok hier stil.
    let stilDatum = 0;
    let datumMee = false;
    Date.now = () => echt.now() - stilDatum - (sinds && !datumMee ? echt.perf() - sinds : 0);
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
    // Elke knop met data-pauze zet de klas op pauze (startscherm, Klaseiland).
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('[data-pauze]')) stuur(true, '');
    });

    window.addEventListener('keydown', e => {
      if (sinds && !(binnen && binnen.contains(e.target))) { e.stopImmediatePropagation(); e.preventDefault(); }
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

    // De klok op dit scherm stilzetten of weer laten lopen. binnen: het venster dat toetsen wel mag krijgen.
    let binnen = null;
    let storm = false; // de Vragenstorm zet alleen dit scherm stil, de pauzeknop de hele klas
    // Een stuk stilstand afsluiten en meteen een nieuw beginnen (de pauzeknop tijdens een Vragenstorm of omgekeerd).
    function wissel(mee) {
      if (!sinds || datumMee === mee) return;
      const d = echt.perf() - sinds;
      stil += d;
      if (!datumMee) stilDatum += d;
      sinds = echt.perf();
      datumMee = mee;
    }
    function vries(aan, venster, mee = false) {
      if (aan) {
        binnen = venster;
        if (sinds) return wissel(mee);
        datumMee = mee;
        sinds = echt.perf();
        for (const a of geluid) if (a.state === 'running') a.suspend();
        if (document.activeElement && !(venster && venster.contains(document.activeElement))) document.activeElement.blur();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      } else if (sinds) {
        const d = echt.perf() - sinds;
        stil += d;
        if (!datumMee) stilDatum += d;
        sinds = 0;
        datumMee = false;
        for (const a of geluid) if (a.state === 'suspended') a.resume();
        for (const id of [...frames.keys()]) if (!frames.get(id).echt) beeld(id);
        const lijst = [...wacht];
        wacht.clear();
        for (const id of lijst) if (timers.has(id)) plan(id);
      }
    }

    function zet(st) {
      const aan = !!(st && st.aan);
      const tekst = (st && st.tekst) || '';
      if (aan) {
        if (!scherm) bouw();
        scherm.querySelector('.pauze-tekst').textContent = tekst || (host ? '' : 'Kijk naar de leerkracht.');
        scherm.classList.add('aan');
        vries(true, scherm);
      } else if (scherm && scherm.classList.contains('aan')) {
        scherm.classList.remove('aan');
        if (tekstVeld) tekstVeld.value = '';
        if (storm) { binnen = storm; wissel(true); }
        else vries(false);
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
      // Vragenstorm: alleen dit scherm stil, met het vragenvenster erboven (de pauzeknop gaat voor).
      storm(aan, venster) {
        storm = aan ? venster : false;
        const pauzeAan = scherm && scherm.classList.contains('aan');
        if (aan) vries(true, pauzeAan ? scherm : venster, !pauzeAan);
        else if (!(scherm && scherm.classList.contains('aan'))) vries(false);
      },
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

  let extern = false;
  // Een gekoppelde bureau-pc: een klein merkje, en na ontkoppelen terug naar de koppelpagina.
  function schermInfo(socket) {
    socket.on('scherm-info', info => {
      extern = !!(info && info.extern);
      if (!extern || document.querySelector('.scherm-merk') || /print|fiche/.test(location.pathname)) return;
      const merk = document.createElement('div');
      merk.className = 'scherm-merk';
      merk.textContent = `🖥️ ${info.naam || 'Bureau-pc'} · gekoppeld met het digibord`;
      document.body.appendChild(merk);
      // Even tonen, dan weg: het mag niets van een spel of lijst verbergen.
      echt.st(() => merk.remove(), 8000);
    });
    socket.on('scherm-ontkoppeld', () => { location.href = '/koppel'; });
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
          ? `Verbinding met LANcelot kwijt. Draait LANcelot nog op ${extern ? 'het digibord' : 'deze pc'}? We proberen het opnieuw…`
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

  function vragenstorm(socket, st) {
    window.Ui.stormSocket = socket;
    if (window.Vragenstorm) return window.Vragenstorm(st);
    window.Ui.stormStart = st;
    if (document.querySelector('script[src="/js/vragenstorm.js"]')) return;
    const s = document.createElement('script');
    s.src = '/js/vragenstorm.js';
    document.body.appendChild(s);
  }

  // De knop "Namen" op elk leerkrachtenscherm (niet op de afdrukbladen).
  function namenKnop(socket) {
    if (window.Ui.hostSocket || /print|fiche/.test(location.pathname)) return;
    window.Ui.hostSocket = socket;
    const laad = () => {
      const s = document.createElement('script');
      s.src = '/js/namen-host.js';
      document.body.appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', laad);
    else laad();
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
      const isHost = !!(opts.query && opts.query.role === 'host');
      Pauze.volg(socket, isHost);
      socket.on('uitleg', u => u && toonUitleg(u));
      socket.on('thema', zetThema);
      // Een andere taal gekozen: dit scherm opnieuw laden, dan komt het woordenboek mee.
      socket.on('taal', id => { if (id && id !== taalNu) location.reload(); });
      if (isHost) { namenKnop(socket); schermInfo(socket); }
      // Vragenstorm: de leerkracht drukt op het bord, en elke leerling in het spel krijgt meteen een paar vragen.
      else {
        socket.on('storm', st => vragenstorm(socket, st));
        // De leerkracht klikte deze naam weg (buiten een spel): opnieuw kiezen wie je bent.
        socket.on('naam-weg', () => {
          try { localStorage.removeItem('lancelot-name'); } catch { /* geen opslag */ }
          location.reload();
        });
      }
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
    uitleg.style.top = onderHud() + 'px';
    uitleg.classList.remove('hidden');
    // Opnieuw laten inschuiven, ook als er al een uitleg stond.
    uitleg.style.animation = 'none';
    void uitleg.offsetWidth;
    uitleg.style.animation = '';
    clearTimeout(uitlegWeg);
    uitlegWeg = setTimeout(() => uitleg.classList.add('hidden'), Math.min(11000, 4500 + 55 * tekst.length));
  }

  // In een spel staat bovenaan de balk met score, klok of harten: de uitleg komt daar net onder, niet erover.
  function onderHud() {
    let top = 12;
    for (const h of document.querySelectorAll('.ls-hud, .ak-hud, .sj-top, .du-versus, [class$="-hud"]')) {
      if (!h.getClientRects().length) continue;
      const r = h.getBoundingClientRect();
      if (r.height && r.top < 140 && r.bottom < innerHeight / 3) top = Math.max(top, Math.round(r.bottom) + 8);
    }
    return top;
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

  // Hulpbolletjes (?): er staat er maar één open, een klik ernaast sluit hem, en hij blijft binnen zijn paneel.
  document.addEventListener('click', e => {
    for (const d of document.querySelectorAll('details.hulp[open]')) if (!d.contains(e.target)) d.open = false;
  });
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!d.matches || !d.matches('details.hulp') || !d.open) return;
    const p = d.querySelector('p');
    p.style.left = '';
    const doos = (d.closest('.panel') || document.body).getBoundingClientRect();
    const r = p.getBoundingClientRect();
    const over = Math.min(r.right - doos.right + 8, r.left - Math.max(doos.left, 0) - 8);
    if (over > 0) p.style.left = `${-10 - over}px`;
  }, true);

  // Tabbladen: knoppen met data-tab in een .tabbalk tonen de elementen met dezelfde data-tab eronder.
  // Het laatst gekozen tabblad wordt onthouden (onder de naam `bewaar`).
  function tabs(balk, bewaar, bijWissel) {
    const knoppen = [...balk.querySelectorAll('[data-tab]')];
    const scope = balk.parentElement;
    const kies = naam => {
      if (!knoppen.some(k => k.dataset.tab === naam)) naam = knoppen[0].dataset.tab;
      for (const k of knoppen) {
        k.classList.toggle('on', k.dataset.tab === naam);
        if (k.dataset.tab === naam) k.setAttribute('aria-current', 'page');
        else k.removeAttribute('aria-current');
      }
      for (const el of scope.querySelectorAll('[data-tab]')) if (!balk.contains(el)) el.classList.toggle('tab-uit', el.dataset.tab !== naam);
      try { if (bewaar) localStorage.setItem(bewaar, naam); } catch {}
      if (bijWissel) bijWissel(naam);
    };
    for (const k of knoppen) k.addEventListener('click', () => kies(k.dataset.tab));
    let start = '';
    try { start = bewaar ? localStorage.getItem(bewaar) || '' : ''; } catch {}
    kies(start);
    return kies;
  }

  // ---------- Spatiebalk ----------
  // Op het bord drukt de spatiebalk de knop die nu de volgende stap zet (starten, antwoord tonen,
  // volgende ronde). Zo'n knop krijgt data-spatie; is er geen zichtbaar, dan doet de spatie gewoon niets bijzonders.
  function zichtbaar(el) { return !el.disabled && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  document.addEventListener('keydown', e => {
    if (e.key !== ' ' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open], .pauze-scherm.aan')) return;
    const knop = [...document.querySelectorAll('[data-spatie]')].find(zichtbaar);
    if (!knop) return;
    e.preventDefault();
    knop.click();
  });
  document.addEventListener('DOMContentLoaded', () => {
    for (const k of document.querySelectorAll('[data-spatie]')) if (!k.title) k.title = 'Of druk op de spatiebalk';
  });

  // ---------- Snel naar ----------
  // Op elk leerkrachtenscherm naast het logo: de vijf rijken (het logo zelf is Start) en ⚙️ Instellingen. Zo ben je als leerkracht met één klik overal.
  // Het rijk waar je nu bent, licht op. Loopt er een spel, dan eerst even vragen (het spel loopt gewoon door).
  // In de Store-versie heet het vijfde rijk "Mijn klas" (zonder De Kronieken).
  const RIJKEN = [['arena', 'Arena', 'arena'], ['tafel', 'Ronde Tafel', 'ronde-tafel'], ['smidse', 'Smidse', 'smidse'], ['wapenkamer', 'Wapenkamer', 'wapenkamer'],
    window.LANCELOT_STORE ? ['kronieken', 'Mijn klas', 'burcht'] : ['kronieken', 'Kronieken', 'kronieken']];
  const PAD_RIJK = {
    tafel: ['rondetafel', 'kringgesprek', 'ontdek-beheer', 'runenraadsel'],
    smidse: ['oefenblad', 'proef', 'reeks'],
    wapenkamer: ['wapenkamer'],
    kronieken: ['kronieken', 'zonnewijzer', 'zegelrol', 'postduif', ...(window.LANCELOT_STORE ? ['klas', 'zorg', 'taken'] : [])],
    geen: ['host', 'netwerk', 'welkom', 'privacy', 'koppel', ...(window.LANCELOT_STORE ? [] : ['klas', 'zorg', 'taken'])],
  };
  function rijkHier() {
    const pad = location.pathname.replace(/^\/+/, '') || 'host';
    if (pad === 'host') return location.hash.slice(1);
    for (const [r, paden] of Object.entries(PAD_RIJK)) if (paden.includes(pad)) return r === 'geen' ? '' : r;
    return 'arena'; // alle andere leerkrachtenschermen met een topbalk zijn spellen
  }
  let snelMarkeer = () => {};
  function snelmenu() {
    const brand = document.querySelector('.topbar > .brand');
    if (!brand || document.body.classList.contains('player') || /^\/koppel/.test(location.pathname)) return;
    const nav = document.createElement('nav');
    nav.className = 'snelmenu';
    nav.setAttribute('aria-label', 'Snel naar');
    nav.innerHTML = `${
      RIJKEN.map(([id, naam, ic]) => `<a href="/host#${id}" data-rijk="${id}" title="${id === 'kronieken' && window.LANCELOT_STORE ? naam : `Naar De ${naam}`}"><img src="/img/icons/${ic}.webp" alt=""><span>${naam}</span></a>`).join('')}<a href="/host?instellingen" class="snel-inst" data-inst="1" title="Instellingen" aria-label="Instellingen"><i class="ic ic-instellingen" aria-hidden="true"></i><span>Instellingen</span></a>`;
    brand.after(nav);
    snelMarkeer = () => {
      const r = rijkHier();
      for (const a of nav.querySelectorAll('[data-rijk]')) a.classList.toggle('on', a.dataset.rijk === r);
      nav.querySelector('[data-inst]').classList.toggle('on', !!document.querySelector('#settings:not(.hidden)'));
    };
    snelMarkeer();
    addEventListener('hashchange', () => snelMarkeer());
    // Het logo brengt je naar het startscherm (daarom geen aparte Start-knop). Op /host regelt host.js dat zelf.
    if (location.pathname !== '/host') {
      brand.style.cursor = 'pointer';
      brand.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); ga('/host'); }, true);
    }
    nav.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      // Instellingen: vanaf elke pagina meteen open, en Terug brengt je weer naar deze pagina.
      if (a.dataset.inst) {
        const knop = location.pathname === '/host' && document.getElementById('open-settings');
        if (knop) return knop.click();
        return ga(`/host?instellingen&terug=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
      }
      ga(a.getAttribute('href'));
    });
    async function ga(doel) {
      // Op het startscherm zelf: geen nieuwe pagina, gewoon het rijk openen (host.js).
      if (location.pathname === '/host' && window.snelNaar) return window.snelNaar(doel.split('#')[1] || '');
      const stop = document.getElementById('stop');
      const spel = stop && !stop.classList.contains('hidden') && stop.getClientRects().length;
      if (spel && !await window.Ui.vraag('Er loopt nog een spel. Het blijft gewoon lopen en je vindt het terug in De Arena. Toch weggaan?')) return;
      location.href = doel;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', snelmenu);
  else snelmenu();

  // ---------- Terug altijd linksboven ----------
  // Op elk leerkrachtenscherm staat Terug op dezelfde plek: links, vóór de titel. Knoppen die in de pagina
  // rechts in de knoppenrij of rechtsboven in de kopbalk staan, verhuizen hier naar links en krijgen het pijltje.
  function terugLinks() {
    if (!document.querySelector('.topbar > .brand') || document.body.classList.contains('player')) return;
    let rij = null;
    for (const k of document.querySelectorAll('.bar [data-back], .bar #to-home, .topbar .actions #to-home, .topbar .actions #ke-terug')) {
      k.classList.add('terug-links');
      if (!k.querySelector('.ic')) k.insertAdjacentHTML('afterbegin', '<i class="ic ic-terug" aria-hidden="true"></i> ');
      const bar = k.closest('.bar');
      if (bar) { bar.prepend(k); continue; }
      if (!rij) {
        rij = document.createElement('div');
        rij.className = 'terug-rij';
        document.querySelector('.topbar').after(rij);
      }
      rij.append(k);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', terugLinks);
  else terugLinks();

  // ---------- Rustig bord tijdens een spel ----------
  // Zolang er een spel loopt (de Stop-knop staat er), klapt het snelmenu dicht tot één knop Menu en verdwijnen
  // Junior, netwerk en instellingen uit de kopbalk. Zo leidt niets af en klikt niemand per ongeluk weg.
  function rustigBord() {
    const stop = document.getElementById('stop');
    const nav = document.querySelector('.snelmenu');
    if (!stop || !nav) return;
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'secondary snel-toggle';
    knop.textContent = 'Menu';
    knop.title = 'Naar een ander rijk. Het spel blijft lopen.';
    knop.addEventListener('click', () => nav.classList.toggle('open'));
    nav.before(knop);
    const zet = () => {
      const loopt = !stop.classList.contains('hidden') && stop.getClientRects().length > 0;
      if (document.body.classList.contains('spel-loopt') === loopt) return;
      document.body.classList.toggle('spel-loopt', loopt);
      nav.classList.remove('open');
    };
    new MutationObserver(zet).observe(stop, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    setInterval(zet, 1000);
    zet();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rustigBord);
  else rustigBord();

  // ---------- Geschilderd decor ----------
  // Elk rijk heeft zijn eigen geschilderde zaal achter de schermen (style.css, html[data-achter]).
  // Spelpagina's hebben hun eigen decor, dus daar niets. Leerlingenschermen krijgen de sterrenpoort.
  function zetAchter() {
    const pad = location.pathname.replace(/^\/+/, '');
    const b = document.body;
    let a = '';
    if (b && (b.classList.contains('player') || b.classList.contains('pf-leerling'))) a = 'leerling';
    else if (pad === 'host') a = location.hash.slice(1) || 'start';
    else for (const [r, paden] of Object.entries(PAD_RIJK)) if (paden.includes(pad)) a = r === 'geen' ? 'start' : r;
    if (a) document.documentElement.dataset.achter = a;
    else delete document.documentElement.dataset.achter;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zetAchter);
  else zetAchter();
  addEventListener('hashchange', zetAchter);

  // Tekst naar het klembord, meteen bij de klik (vóór een window.open: daarna heeft de pagina de focus niet meer).
  // Werkt ook op gewone http via het schoolnetwerk, waar navigator.clipboard vaak ontbreekt.
  // Het kader van elke AI-opdracht: waar de leerkracht lesgeeft, in welke taal de AI schrijft en welke context ze gebruikt.
  // De taal van het scherm bepaalt de taal van de inhoud; de gekozen leerplandoelen (Mijn klas > Doelen) het land, als ze bij die taal passen.
  // In het Nederlands met Vlaamse of geen doelen blijft alles zoals altijd: Vlaanderen, Belgisch onderwijs.
  // De taalopdracht bovenaan ("Write everything in English") zet I18n.aiPrompt (i18n.js) of taal.aiPrompt (server) erbij.
  const AI_LAND = {
    be: ['Vlaanderen', 'Belgisch onderwijs', 'het Nederlands zoals in Vlaanderen', 'Gebruik de Belgische schrijfwijze en context: komma als decimaalteken, euro, Belgische namen en plaatsen, Vlaamse woorden.', n => `${n}e leerjaar`],
    nl: ['Nederland', 'Nederlands basisonderwijs', 'het Nederlands zoals in Nederland', 'Gebruik de Nederlandse schrijfwijze en context: komma als decimaalteken, euro, Nederlandse namen en plaatsen.', n => `groep ${n + 2}`],
    en: ['Engeland', 'Engels primair onderwijs', 'Brits Engels', 'Gebruik Britse spelling en context: punt als decimaalteken, pond, Britse namen en plaatsen.', n => `Year ${n + 1}`],
    us: ['de Verenigde Staten', 'Amerikaans basisonderwijs', 'Amerikaans Engels', 'Gebruik Amerikaanse spelling en context: punt als decimaalteken, dollar, Amerikaanse namen en plaatsen.', n => `Grade ${n}`],
    fr: ['Frankrijk', 'Frans basisonderwijs', 'het Frans', 'Gebruik de Franse schrijfwijze en context: komma als decimaalteken, euro, Franse namen en plaatsen.', n => ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e'][n - 1]],
    de: ['Duitsland', 'Duitse Grundschule', 'het Duits', 'Gebruik de Duitse schrijfwijze en context: komma als decimaalteken, euro, Duitse namen en plaatsen.', n => `Klasse ${n}`],
    es: ['Spanje', 'Spaans basisonderwijs', 'het Spaans', 'Gebruik de Spaanse schrijfwijze en context: komma als decimaalteken, euro, Spaanse namen en plaatsen.', n => `${n}.º de Primaria`],
  };
  const AI_PAST = { nl: ['be', 'nl'], en: ['en', 'us'], fr: ['fr'], es: ['es'], de: ['de'] };
  function aiKader() {
    const taal = AI_PAST[window.LANCELOT_TAAL] ? window.LANCELOT_TAAL : 'nl';
    const land = AI_PAST[taal].includes(window.LANCELOT_DOELLAND) ? window.LANCELOT_DOELLAND : AI_PAST[taal][0];
    const [waar, onderwijs, schrijftaal, context, jaar] = AI_LAND[land];
    // "5e leerjaar" (de keuzelijst van de makers) wordt de jaarnaam van dat land; andere niveaus blijven zoals ze zijn.
    const niveau = level => { const m = /^([1-6])e leerjaar$/.exec(String(level || '').trim()); return m ? jaar(Number(m[1])) : level; };
    return { waar, onderwijs, taal: schrijftaal, context, niveau };
  }

  function kopieer(tekst) {
    // Een AI-prompt krijgt in een andere taal dan Nederlands de taalopdracht vooraan (zie i18n.js).
    if (window.I18n && I18n.aiPrompt) tekst = I18n.aiPrompt(tekst);
    const actief = document.activeElement;
    const t = document.createElement('textarea');
    t.value = tekst;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
    // In een open venster (dialog) zelf: alles daarbuiten is onbereikbaar zolang het open staat.
    (document.querySelector('dialog[open]') || document.body).appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    t.remove();
    if (actief && actief.focus) actief.focus({ preventScroll: true });
    if (ok) return true;
    if (!navigator.clipboard?.writeText) return false;
    navigator.clipboard.writeText(tekst).catch(() => {});
    return true;
  }

  window.Ui = {
    tabs,
    kopieer,
    aiKader,
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
    // Het snelmenu opnieuw laten oplichten als een pagina zelf het adres verandert (host.js, rijk openen).
    snelMarkeer: () => { snelMarkeer(); zetAchter(); },
    pauze: Pauze,
    // De echte klok en timers, die doorlopen als het scherm stilstaat (Vragenstorm).
    echt,
    themas: THEMAS,
    get thema() { return thema; },
    // De AI die de leerkracht bij Instellingen koos (Gemini, Claude of ChatGPT), voor knoppen en teksten.
    ai: 'Gemini',
    zetAi(s) {
      if (!s || !s.aiNaam) return;
      this.ai = s.aiNaam;
      for (const el of document.querySelectorAll('.ai-naam')) el.textContent = s.aiNaam;
    },
  };
})();
