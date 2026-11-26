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
    b.innerHTML = `${Ui.ic('namen')} <span class="kop-tekst">Namen</span>`;
    b.title = 'Wie is er binnen? Een verkeerde naam wegklikken';
    b.addEventListener('click', open);
    return b;
  };

  // In de kopbalk: op elk leerkrachtenscherm dezelfde vaste knoppen, in dezelfde volgorde en in dezelfde stijl als het
  // menu ernaast (icoon boven het woord), samen één balk: Spelen … Instellingen | Pauze · Namen · QR-code · Geluid.
  // Geluid alleen waar er geluid is. Wat een pagina zelf nog nodig heeft (Aanwezig, Groot, Stop), staat rechts apart.
  const kop = maakKnop();
  const groep = document.querySelector('.topbar > .kop-vast-rij');
  if (groep) {
    // De kopbalk (ui.js) staat er al: Namen en QR-code werkend maken.
    const plek = groep.querySelector('.namen-knop');
    kop.classList.add('kop-vast');
    if (plek) plek.replaceWith(kop); else groep.append(kop);
    const qr = groep.querySelector('.qr-kop');
    if (qr) qrKnop(qr);
  } else {
    const pauzeKop = document.querySelector('.topbar [data-pauze]');
    const ergens = document.querySelector('.topbar .actions');
    if (pauzeKop) pauzeKop.after(kop);
    else if (ergens) ergens.prepend(kop);
  }

  // Knop QR-code: de QR-code waarmee leerlingen verbinden, groot op het bord. Het startscherm heeft er al een (host.js).
  function qrKnop(b) {
    const venster = document.createElement('dialog');
    venster.className = 'qr-venster';
    venster.innerHTML = '<div class="qr-venster-kop"><h2>Verbinden met LANcelot</h2><button class="secondary icon" title="Sluiten" aria-label="Sluiten"></button></div>'
      + '<div class="qr-groot"><div class="qr"></div><div class="join-url"></div></div><div class="qr-adressen"></div>'
      + '<p class="muted small center">Leerlingen moeten op hetzelfde netwerk zitten als deze pc. <a href="/netwerk" target="_blank">Netwerk werkt niet?</a></p>';
    venster.querySelector('.qr-venster-kop button').innerHTML = Ui.ic('kruis');
    venster.querySelector('.qr-venster-kop button').addEventListener('click', () => venster.close());
    venster.addEventListener('click', e => {
      const r = venster.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) venster.close();
    });
    document.body.append(venster);
    let lijst = [];
    let ip = '';
    try { ip = localStorage.getItem('lancelot-address') || ''; } catch {}
    const ipVan = a => a.url.replace(/^http:\/\//, '').replace(/:\d+$/, '');
    const toon = () => {
      const a = lijst.find(x => ipVan(x) === ip) || lijst.find(x => x.sure) || lijst[0];
      venster.querySelector('.qr').innerHTML = a ? a.qr : '';
      venster.querySelector('.join-url').textContent = a ? a.url : 'Geen netwerk gevonden';
      const box = venster.querySelector('.qr-adressen');
      box.innerHTML = '';
      if (lijst.length < 2) return;
      box.append('Werkt dit adres niet? Kies een ander: ');
      for (const x of lijst) {
        const k = document.createElement('button');
        k.className = 'secondary address-choice' + (x === a ? ' on' : '');
        k.textContent = x.name ? `${ipVan(x)} · ${x.name}` : ipVan(x);
        k.addEventListener('click', () => {
          ip = ipVan(x);
          toon();
          try { localStorage.setItem('lancelot-address', ip); } catch {}
          socket.emit('choose-address', ip);
        });
        box.append(k);
      }
    };
    socket.on('addresses', l => { lijst = l || []; if (venster.open) toon(); });
    b.addEventListener('click', () => {
      socket.emit('adressen');
      toon();
      if (!venster.open) venster.showModal();
    });
    return b;
  }

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
    // Toetsen (E voor een vraag, pijltjes, spatie) moeten bij Proefridder 1 aankomen, ook als de leerkracht net op
    // het bord klikte: het venster krijgt de focus zodra je erin klikt, en wat op het bord getypt wordt, gaat mee door.
    const scherm = proefVak.querySelector('.proef-scherm');
    scherm.addEventListener('load', () => {
      try { scherm.contentDocument.addEventListener('pointerdown', () => scherm.contentWindow.focus(), true); } catch {}
    });
    document.body.append(proefVak);
    document.body.classList.add('proef-open');
    proef.classList.add('on');
  });
  const zichtbaar = el => !!el.getClientRects().length && !el.disabled;
  const stuurDoor = e => {
    if (!proefVak || e.ctrlKey || e.metaKey || e.altKey) return;
    const doel = e.target;
    if (doel && doel.closest && doel.closest('input, textarea, select, [contenteditable], dialog[open]')) return;
    if (document.querySelector('dialog[open]')) return;
    // De spatie blijft voor de knop van de leerkracht (volgende vraag, start) als die er staat.
    if (e.key === ' ' && [...document.querySelectorAll('[data-spatie]')].some(zichtbaar)) return;
    if (/^(Tab|F\d+)$/.test(e.key)) return;
    if ((e.key === ' ' || e.key === 'Enter') && doel && doel.closest && doel.closest('button, a, summary')) return;
    let doc;
    try { doc = proefVak.querySelector('.proef-scherm').contentDocument; } catch { return; }
    if (!doc || !doc.body) return;
    const kopie = new doc.defaultView.KeyboardEvent(e.type, { key: e.key, code: e.code, repeat: e.repeat, shiftKey: e.shiftKey, bubbles: true, cancelable: true });
    (doc.activeElement || doc.body).dispatchEvent(kopie);
    if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) e.preventDefault();
  };
  window.addEventListener('keydown', stuurDoor, true);
  window.addEventListener('keyup', stuurDoor, true);
  rij.append(pauze, storm, maakKnop(), proef);
  // De knop "Speel nu een proefspel" op het startscherm (eerste-start.js): het proefvenster gaat vanzelf open.
  if (new URLSearchParams(location.search).get('proef') === '1' && !proef.hidden) setTimeout(() => { if (!proefVak) proef.click(); }, 900);

  const modal = document.createElement('div');
  modal.className = 'ob-modal hidden';
  modal.innerHTML = '<div class="panel ob-modal-box namen-box"><h3>Wie is er binnen?</h3>'
    + '<p class="muted small">Klikte een leerling op de verkeerde naam? Klik die naam hier weg. De leerling kiest dan opnieuw zijn eigen naam.</p>'
    + '<div class="namen-lijst"></div><p class="muted small namen-extra"></p><div class="actions"><button class="secondary">Sluiten</button></div></div>';
  const lijst = modal.querySelector('.namen-lijst');
  const extra = modal.querySelector('.namen-extra');
  // Een spelbord kan een plek in zijn balk geven (data-bord-knoppen): dan staan de knoppen niet over het spelbeeld.
  const plek = document.querySelector('[data-bord-knoppen]');
  if (plek) { rij.classList.add('in-balk'); plek.append(rij); document.body.append(modal); } else document.body.append(rij, modal);

  let timer = null;
  function laad() {
    socket.emit('namen-lijst', pad, res => {
      if (!res) return;
      const actief = !!res.actief;
      pauze.classList.toggle('hidden', !actief);
      storm.classList.toggle('hidden', !res.storm && !stormAan);
      rij.classList.toggle('hidden', !actief && kop.isConnected);
      kop.classList.toggle('hidden', actief);
      // Loopt er een spel, dan staan Pauze en Namen linksonder op het bord: niet twee keer.
      const pauzeKop = document.querySelector('.kop-vast-rij > [data-pauze]');
      if (pauzeKop && rij.isConnected) pauzeKop.classList.toggle('hidden', actief);
      const binnen = (res.spelers || []).filter(p => p.online).length;
      for (const b of document.querySelectorAll('.namen-knop')) b.innerHTML = `${Ui.ic('namen')} <span class="kop-tekst">Namen</span>${binnen ? ` <b class="namen-tel">${binnen}</b>` : ''}`;
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

  // Hulpknop (wens 25 nov, punt 9): wie stil hulp vroeg, in volgorde. Jorn (26 nov): groot op het bord, met de naam.
  // Rechts op elk leerkrachtenscherm staat per leerling een kaart (✋ naam, waar en hoe lang al) met ✔ Geholpen.
  // Kleiner vouwt de kaarten tot het bolletje ✋ 2; vraagt er iemand nieuw hulp, dan gaan ze vanzelf weer open.
  const MAX_KAARTEN = 4;
  const hulpBord = document.createElement('section');
  hulpBord.className = 'hulp-bord hidden';
  hulpBord.setAttribute('aria-live', 'polite');
  hulpBord.innerHTML = '<div class="hulp-bord-kop"><span>✋ Hulp gevraagd</span><span class="hulp-kop-knoppen"><button type="button" class="secondary hulp-toon"></button><button type="button" class="secondary hulp-klein" title="Kleiner maken tot een bolletje">Kleiner</button></span></div><ol class="hulp-kaarten"></ol><button type="button" class="secondary hulp-meer hidden"></button>';
  const hulpKnop = document.createElement('button');
  hulpKnop.type = 'button';
  hulpKnop.className = 'hulp-wacht hidden';
  hulpKnop.title = 'Leerlingen vragen hulp: tik om te zien wie';
  const hulpVenster = document.createElement('dialog');
  hulpVenster.className = 'ui-venster hulp-venster';
  hulpVenster.innerHTML = '<h2>✋ Hulp gevraagd</h2><p class="muted small">Wie eerst vroeg, staat bovenaan.</p><ol class="hulp-rij"></ol><div class="actions"><button type="button" class="secondary hulp-sluit">Sluiten</button></div>';
  document.body.append(hulpBord, hulpKnop, hulpVenster);
  let hulpLijst = [];
  let klein = false;
  let gezien = null;
  // Geluidje bij een nieuwe hulpvraag (Jorn 26 nov): zacht belletje, uit te zetten met 🔔/🔕 op het paneel.
  // Zwijgt ook als het geluid van LANcelot uit staat (knop Geluid in de kopbalk).
  const LS_TOON = 'lancelot-hulp-geluid';
  let toonAan = true;
  try { toonAan = localStorage.getItem(LS_TOON) !== '0'; } catch {}
  let actx = null;
  const belletje = () => {
    try {
      if (!toonAan || localStorage.getItem('lancelot-muted') === '1') return;
    } catch {}
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + .02;
      for (const [f, d] of [[880, 0], [1320, .18]]) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(.12, t0 + d + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t0 + d + .7);
        o.connect(g).connect(actx.destination);
        o.start(t0 + d);
        o.stop(t0 + d + .75);
      }
    } catch {}
  };
  const toonKnop = () => {
    const k = hulpBord.querySelector('.hulp-toon');
    k.textContent = toonAan ? '🔔' : '🔕';
    k.title = toonAan ? 'Geluidje bij een hulpvraag staat aan: tik om uit te zetten' : 'Geluidje bij een hulpvraag staat uit: tik om aan te zetten';
    k.setAttribute('aria-pressed', toonAan ? 'true' : 'false');
  };
  const geleden = iso => { const m = Math.floor((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'net' : `${m} min geleden`; };
  const geholpen = h => socket.emit('hulp-geholpen', { naam: h.naam }, () => {});
  const regel = (h, tag) => {
    const li = document.createElement(tag);
    const tekst = document.createElement('span');
    tekst.className = 'hulp-wie';
    const b = document.createElement('strong');
    b.textContent = h.naam;
    const kl = document.createElement('small');
    kl.textContent = `${h.waar ? `${h.waar} · ` : ''}${geleden(h.sinds)}`;
    tekst.append(b, kl);
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'gold';
    ok.textContent = '✔ Geholpen';
    ok.addEventListener('click', () => geholpen(h));
    li.append(tekst, ok);
    return li;
  };
  const hulpTeken = () => {
    const n = hulpLijst.length;
    // Een nieuwe vraag zet de kaarten weer groot, zodat je ze zeker ziet.
    const nu = new Set(hulpLijst.map(h => h.naam));
    const nieuw = gezien && [...nu].some(x => !gezien.has(x));
    if (nieuw) { klein = false; belletje(); }
    gezien = nu;
    hulpBord.classList.toggle('hidden', !n || klein);
    hulpKnop.classList.toggle('hidden', !n || !klein);
    hulpKnop.textContent = `✋ ${n}`;
    hulpKnop.setAttribute('aria-label', n === 1 ? '1 leerling vraagt hulp' : `${n} leerlingen vragen hulp`);
    hulpBord.querySelector('.hulp-kaarten').replaceChildren(...hulpLijst.slice(0, MAX_KAARTEN).map(h => regel(h, 'li')));
    const meer = hulpBord.querySelector('.hulp-meer');
    meer.classList.toggle('hidden', n <= MAX_KAARTEN);
    meer.textContent = n - MAX_KAARTEN === 1 ? '+ nog 1 leerling' : `+ nog ${n - MAX_KAARTEN} leerlingen`;
    hulpVenster.querySelector('.hulp-rij').replaceChildren(...hulpLijst.map(h => regel(h, 'li')));
    if (!n && hulpVenster.open) hulpVenster.close();
  };
  toonKnop();
  hulpBord.querySelector('.hulp-toon').addEventListener('click', () => {
    toonAan = !toonAan;
    try { localStorage.setItem(LS_TOON, toonAan ? '1' : '0'); } catch {}
    toonKnop();
    if (toonAan) belletje();
  });
  hulpBord.querySelector('.hulp-klein').addEventListener('click', () => { klein = true; hulpTeken(); });
  hulpBord.querySelector('.hulp-meer').addEventListener('click', () => { hulpTeken(); if (!hulpVenster.open) hulpVenster.showModal(); });
  hulpKnop.addEventListener('click', () => { klein = false; hulpTeken(); });
  hulpVenster.querySelector('.hulp-sluit').addEventListener('click', () => hulpVenster.close());
  socket.on('hulp', l => { hulpLijst = Array.isArray(l) ? l : []; hulpTeken(); });
  const hulpLaad = () => socket.emit('hulp-lijst', null, l => { hulpLijst = Array.isArray(l) ? l : []; hulpTeken(); });
  socket.on('connect', hulpLaad);
  hulpLaad();
  setInterval(() => { if (hulpLijst.length) hulpTeken(); }, 30000);
})();
