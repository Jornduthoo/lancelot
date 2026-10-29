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

  // Vult een leeg <div id="thema-kiezer"> met de keuzes (alleen op het docentenscherm).
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
    // Elke knop met data-pauze zet de klas op pauze (startscherm, Klaseiland).
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('[data-pauze]')) stuur(true, '');
    });

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

  // De knop "Namen" op elk docentenscherm (niet op de afdrukbladen).
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
      if (isHost) { namenKnop(socket); schermInfo(socket); }
      // De leerkracht klikte deze naam weg (buiten een spel): opnieuw kiezen wie je bent.
      else socket.on('naam-weg', () => {
        try { localStorage.removeItem('lancelot-name'); } catch { /* geen opslag */ }
        location.reload();
      });
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
  // Op elk docentenscherm naast het logo: Start en de vijf rijken. Zo ben je als leerkracht met één klik overal.
  // Het rijk waar je nu bent, licht op. Loopt er een spel, dan eerst even vragen (het spel loopt gewoon door).
  const RIJKEN = [['arena', 'Arena', 'arena'], ['tafel', 'Ronde Tafel', 'ronde-tafel'], ['smidse', 'Smidse', 'smidse'], ['wapenkamer', 'Wapenkamer', 'wapenkamer'], ['kronieken', 'Kronieken', 'kronieken']];
  const PAD_RIJK = {
    tafel: ['rondetafel', 'kringgesprek', 'ontdek-beheer', 'runenraadsel'],
    smidse: ['oefenblad', 'proef', 'reeks'],
    wapenkamer: ['wapenkamer'],
    kronieken: ['kronieken', 'zonnewijzer', 'zegelrol'],
    geen: ['host', 'klas', 'zorg', 'taken', 'netwerk', 'welkom', 'privacy', 'koppel'],
  };
  function rijkHier() {
    const pad = location.pathname.replace(/^\/+/, '') || 'host';
    if (pad === 'host') return location.hash.slice(1);
    for (const [r, paden] of Object.entries(PAD_RIJK)) if (paden.includes(pad)) return r === 'geen' ? '' : r;
    return 'arena'; // alle andere docentenschermen met een topbalk zijn spellen
  }
  let snelMarkeer = () => {};
  function snelmenu() {
    const brand = document.querySelector('.topbar > .brand');
    if (!brand || document.body.classList.contains('player') || /^\/koppel/.test(location.pathname)) return;
    const nav = document.createElement('nav');
    nav.className = 'snelmenu';
    nav.setAttribute('aria-label', 'Snel naar');
    nav.innerHTML = `<a class="snel-start" href="/host" title="Naar het startscherm"><i class="ic ic-huis" aria-hidden="true"></i><span>Start</span></a>${
      RIJKEN.map(([id, naam, ic]) => `<a href="/host#${id}" data-rijk="${id}" title="Naar De ${naam}"><img src="/img/icons/${ic}.webp" alt=""><span>${naam}</span></a>`).join('')}`;
    brand.after(nav);
    snelMarkeer = () => { const r = rijkHier(); for (const a of nav.querySelectorAll('[data-rijk]')) a.classList.toggle('on', a.dataset.rijk === r); };
    snelMarkeer();
    addEventListener('hashchange', () => snelMarkeer());
    nav.addEventListener('click', async e => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const doel = a.getAttribute('href');
      // Op het startscherm zelf: geen nieuwe pagina, gewoon het rijk openen (host.js).
      if (location.pathname === '/host' && window.snelNaar) return window.snelNaar(doel.split('#')[1] || '');
      const stop = document.getElementById('stop');
      const spel = stop && !stop.classList.contains('hidden') && stop.getClientRects().length;
      if (spel && !await window.Ui.vraag('Er loopt nog een spel. Het blijft gewoon lopen en je vindt het terug in De Arena. Toch weggaan?')) return;
      location.href = doel;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', snelmenu);
  else snelmenu();

  window.Ui = {
    tabs,
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
    snelMarkeer: () => snelMarkeer(),
    pauze: Pauze,
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
