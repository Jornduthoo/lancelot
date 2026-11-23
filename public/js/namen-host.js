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
  const brand = document.querySelector('.topbar > .brand');
  const acties = brand && document.querySelector('.topbar > .actions');
  let pauzeKop = document.querySelector('.topbar [data-pauze]');
  if (brand) {
    if (!pauzeKop) {
      pauzeKop = document.createElement('button');
      pauzeKop.className = 'secondary pauze-knop';
      pauzeKop.setAttribute('data-pauze', '');
      pauzeKop.title = 'Alle leerlingschermen op slot om de aandacht te vragen';
      pauzeKop.innerHTML = '<img src="/img/icons/pauze-klein.webp" alt=""> <span class="kop-tekst">Pauze</span>';
    }
    pauzeKop.classList.add('kop-vast');
    kop.classList.add('kop-vast');
    kop.innerHTML = '<img src="/img/icons/kop-namen.webp" alt=""> <span class="kop-tekst">Namen</span>';
    const groep = document.createElement('div');
    groep.className = 'kop-vast-rij';
    groep.append(pauzeKop, kop, qrKnop());
    const mute = document.getElementById('mute');
    if (mute && acties && acties.contains(mute)) {
      groep.append(mute);
      // De spellen zetten bij aan/uit alleen het icoon terug: het woordje Geluid er telkens weer onder zetten.
      const woord = () => { if (!mute.querySelector('.kop-tekst')) mute.insertAdjacentHTML('beforeend', ' <span class="kop-tekst">Geluid</span>'); };
      woord();
      new MutationObserver(woord).observe(mute, { childList: true });
    }
    const plaats = () => {
      const nav = document.querySelector('.topbar > .snelmenu');
      if (nav) nav.after(groep);
      else if (!groep.isConnected) brand.after(groep);
    };
    plaats();
    // Het menu komt soms net na deze knoppen (ui.js): dan schuiven ze erachter.
    if (!document.querySelector('.topbar > .snelmenu')) document.addEventListener('DOMContentLoaded', plaats);
    setTimeout(plaats, 0);
  } else {
    const ergens = document.querySelector('.topbar .actions');
    if (pauzeKop) pauzeKop.after(kop);
    else if (ergens) ergens.prepend(kop);
  }

  // Knop QR-code: de QR-code waarmee leerlingen verbinden, groot op het bord. Het startscherm heeft er al een (host.js).
  function qrKnop() {
    const eigen = document.getElementById('qr-open');
    if (eigen) return eigen;
    const b = document.createElement('button');
    b.className = 'secondary qr-kop';
    b.title = 'De QR-code waarmee leerlingen verbinden, groot op het bord';
    b.innerHTML = '<img src="/img/icons/kop-qr.webp" alt=""> <span class="kop-tekst">QR-code</span>';
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
      if (pauzeKop && pauzeKop.classList.contains('kop-vast') && rij.isConnected) pauzeKop.classList.toggle('hidden', actief);
      const binnen = (res.spelers || []).filter(p => p.online).length;
      for (const b of document.querySelectorAll('.namen-knop')) b.innerHTML = `${b.closest('.kop-vast-rij') ? '<img src="/img/icons/kop-namen.webp" alt="">' : Ui.ic('namen')} <span class="kop-tekst">Namen</span>${binnen ? ` <b class="namen-tel">${binnen}</b>` : ''}`;
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
