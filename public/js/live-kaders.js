// 📡 Live op het startscherm (Jorn 26 nov: "zou gewoon daar in een kadertje moeten openen, snel, twee of drie
// tegelijk die ik kan verplaatsen of sluiten"). Elke lopende toets, quiz of oefenblad in een eigen zwevend kader
// met het live overzicht (live-raster.js). Hooguit drie tegelijk; verslepen aan de kop, groter of kleiner via de
// hoek rechtsonder, ✕ sluit. De server stuurt alleen de taken die open staan (tk-live), niet de hele lijst.
// Tik op een leerling = zijn werk in een venster hier (alleen bekijken).
// Deze pc onthoudt vandaag welke kaders open stonden en waar, zodat ze terugkomen als je terug naar Start gaat.
'use strict';
(function () {
  const MAX = 3;
  const BEWAAR = 'lancelot-live-kaders';
  const GRENS = 'lancelot-live-grens';
  let socket = null;
  let laag = null;
  let boven = 1;
  const kaders = []; // { id, titel, el, x, y, w, h }
  const taken = new Map();
  let antwoord = false; // al eens antwoord van de server gekregen

  const maak = (tag, cls, tekst) => { const e = document.createElement(tag); if (cls) e.className = cls; if (tekst !== undefined) e.textContent = tekst; return e; };
  const dag = () => new Date().toDateString();
  const grens = () => { try { return Number(localStorage.getItem(GRENS)) || 5; } catch { return 5; } };

  function bewaar() {
    try { localStorage.setItem(BEWAAR, JSON.stringify({ dag: dag(), kaders: kaders.map(k => ({ id: k.id, titel: k.titel, x: k.x, y: k.y, w: k.w, h: k.h })) })); } catch {}
  }
  function vraag() {
    if (!socket) return;
    socket.emit('tk-live', kaders.map(k => k.id), r => { if (r && !r.error) { antwoord = true; zet(r.taken); } });
  }
  function zet(lijst) {
    for (const t of lijst || []) taken.set(t.id, t);
    kaders.forEach(teken);
  }

  // Binnen het scherm houden, ook na draaien of een kleiner venster.
  function plaats(k) {
    const vw = window.innerWidth, vh = window.innerHeight;
    k.w = Math.max(260, Math.min(k.w, vw - 16));
    k.h = Math.max(180, Math.min(k.h, vh - 16));
    k.x = Math.max(8, Math.min(k.x, vw - k.w - 8));
    k.y = Math.max(8, Math.min(k.y, vh - k.h - 8));
    Object.assign(k.el.style, { left: `${k.x}px`, top: `${k.y}px`, width: `${k.w}px`, height: `${k.h}px` });
  }
  function naarVoor(k) { k.el.style.zIndex = String(++boven); }

  function teken(k) {
    const t = taken.get(k.id);
    const r = k.el.querySelector('.lv-kader-raster');
    if (!t) {
      k.el.querySelector('.lv-kader-samen').textContent = antwoord ? 'Deze taak is er niet meer.' : '…';
      k.el.querySelector('.lv-kader-raster').replaceChildren();
      return;
    }
    if (t.titel !== k.titel) { k.titel = t.titel; k.el.querySelector('.lv-kader-titel').textContent = `📡 ${t.titel}`; bewaar(); }
    const uit = LiveRaster.teken(t, {
      grens: grens(),
      opKlik: l => kijk(t, l),
      opOpen: l => window.TkOpen && TkOpen(socket, t.id, l.naam),
    });
    r.replaceChildren(...uit.kaarten);
    k.el.querySelector('.lv-kader-samen').textContent = t.dicht ? `🔒 Afgesloten · ${uit.samen}` : uit.samen;
    const v = k.el.querySelector('.lv-kader-vast');
    v.textContent = uit.vast;
    v.classList.toggle('hidden', !uit.vast);
  }

  function sluit(k) {
    const i = kaders.indexOf(k);
    if (i < 0) return;
    kaders.splice(i, 1);
    k.el.remove();
    taken.delete(k.id);
    bewaar();
    vraag();
  }

  function sleep(k, kop) {
    let start = null;
    kop.addEventListener('pointerdown', e => {
      naarVoor(k);
      if (e.target.closest('button, a')) return;
      start = { px: e.clientX, py: e.clientY, x: k.x, y: k.y };
      kop.setPointerCapture(e.pointerId);
      k.el.classList.add('sleept');
      e.preventDefault();
    });
    kop.addEventListener('pointermove', e => {
      if (!start) return;
      k.x = start.x + e.clientX - start.px;
      k.y = start.y + e.clientY - start.py;
      plaats(k);
    });
    const los = () => { if (!start) return; start = null; k.el.classList.remove('sleept'); bewaar(); };
    kop.addEventListener('pointerup', los);
    kop.addEventListener('pointercancel', los);
    // Groter of kleiner via de hoek: onthouden als je loslaat.
    k.el.addEventListener('pointerup', () => {
      const w = k.el.offsetWidth, h = k.el.offsetHeight;
      if (w !== k.w || h !== k.h) { k.w = w; k.h = h; bewaar(); }
    });
    k.el.addEventListener('pointerdown', () => naarVoor(k));
  }

  function nieuwKader(id, titel, pos) {
    const el = maak('section', 'lv-kader');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `Live: ${titel || ''}`);
    el.dataset.taak = id;
    const kop = maak('header', 'lv-kader-kop');
    kop.title = 'Versleep het kader aan deze balk';
    const h = maak('strong', 'lv-kader-titel', `📡 ${titel || 'Live'}`);
    const groot = maak('a', 'lv-kader-knop', '⤢');
    groot.href = `/taken?live=${encodeURIComponent(id)}`;
    groot.title = 'Groot openen in Taken';
    groot.setAttribute('aria-label', 'Groot openen in Taken');
    const x = maak('button', 'lv-kader-knop', '✕');
    x.type = 'button';
    x.title = 'Sluiten';
    x.setAttribute('aria-label', 'Sluiten');
    kop.append(h, groot, x);
    el.append(kop, maak('p', 'lv-kader-samen', '…'), maak('p', 'lv-kader-vast hidden'), maak('div', 'lv-kader-raster tk-live-raster'));
    laag.append(el);
    // De eerste vrije plaats (na een gesloten kader komt het nieuwe daar).
    const n = [0, 1, 2].find(i => !kaders.some(k => k.slot === i)) ?? 0;
    const vw = window.innerWidth;
    const w = vw < 600 ? vw - 16 : Math.min(460, Math.round(vw * 0.36));
    // Links beginnen; de hulpkaarten rechtsonder liggen er altijd boven (z-index), zodat je een hulpvraag ziet.
    // Naast elkaar als ze passen (bord), anders wat verschoven over elkaar (kleiner scherm).
    const naast = vw >= 3 * (w + 12) + 16;
    const k = { id, titel, el, slot: n, x: naast ? 16 + n * (w + 12) : 16 + n * 36, y: naast ? 190 : 90 + n * 36, w, h: Math.min(520, Math.round(window.innerHeight * 0.62)), ...(pos || {}) };
    x.addEventListener('click', () => sluit(k));
    sleep(k, kop);
    kaders.push(k);
    plaats(k);
    naarVoor(k);
    return k;
  }

  // Een kader openen (of naar voren halen als het al open staat). Een vierde sluit het oudste.
  function open(id, titel) {
    if (!id || !laag) return;
    const al = kaders.find(k => k.id === id);
    if (al) { naarVoor(al); al.el.classList.remove('flits'); void al.el.offsetWidth; al.el.classList.add('flits'); return; }
    while (kaders.length >= MAX) sluit(kaders[0]);
    nieuwKader(id, titel);
    bewaar();
    vraag();
  }

  // ---------- Even kijken naar het werk van één leerling (Jorn 26 nov: niet naar Taken gaan) ----------
  // Een venster hier op het startscherm, alleen bekijken. Wat je erbij nodig hebt (de toets of het oefenblad tekenen)
  // laadt pas bij de eerste klik, zodat het startscherm zelf licht blijft.
  let hulpStukken = null;
  function laadStukken() {
    if (hulpStukken) return hulpStukken;
    const css = href => { if (document.querySelector(`link[href="${href}"]`)) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l); };
    const js = src => new Promise((ok, mis) => {
      if (document.querySelector(`script[src="${src}"]`)) return ok();
      const e = document.createElement('script');
      e.src = src;
      e.onload = ok;
      e.onerror = mis;
      document.body.append(e);
    });
    css('/proef.css');
    hulpStukken = js('/js/ob-sheet.js').then(() => js('/js/pf-media.js')).then(() => js('/js/pf-paper.js')).catch(err => { hulpStukken = null; throw err; });
    return hulpStukken;
  }
  let werk = null;
  function werkVenster() {
    if (werk) return werk;
    const d = maak('dialog', 'ui-venster lv-werk');
    const bar = maak('div', 'lv-werk-bar');
    const h = maak('h2', 'lv-werk-titel');
    const naarTaken = maak('a', 'button secondary', 'Meer in Taken');
    naarTaken.title = 'Opnieuw openzetten, afwezig, tijd of niveau: in Mijn klas › Taken';
    const sluit = maak('button', '', 'Sluiten');
    sluit.type = 'button';
    sluit.addEventListener('click', () => d.close());
    const acties = maak('div', 'lv-werk-acties');
    acties.append(naarTaken, sluit);
    bar.append(h, acties);
    const info = maak('p', 'muted small lv-werk-info');
    const inhoud = maak('div', 'lv-werk-inhoud');
    d.append(bar, info, inhoud);
    // Klik naast het venster = sluiten.
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    document.body.append(d);
    werk = { d, h, info, inhoud, naarTaken };
    return werk;
  }
  function kijk(t, l) {
    const w = werkVenster();
    w.h.textContent = `${l.naam} · ${t.titel}`;
    w.info.textContent = '…';
    w.inhoud.replaceChildren();
    w.naarTaken.href = `/taken?taak=${encodeURIComponent(t.id)}&naam=${encodeURIComponent(l.naam)}`;
    if (!w.d.open) w.d.showModal();
    Promise.all([laadStukken(), new Promise(ok => socket.emit('tk-detail', { id: t.id, naam: l.naam }, ok))]).then(([, res]) => {
      if (!res || res.error) { w.info.textContent = (res && res.error) || 'Dat lukte niet.'; return; }
      const STATUS = { nieuw: 'Nog niet begonnen', bezig: 'Bezig', klaar: 'Klaar' };
      const info = [STATUS[res.status] || res.status];
      if (res.status !== 'nieuw') {
        info.push(`${res.gedaan} van ${res.totaal} gedaan`);
        if (res.soort === 'proef' && l.autoMax) info.push(`${PfPaper.nl(l.punten)} van ${PfPaper.nl(l.autoMax)} punten van de computer${l.hand ? `, ${PfPaper.ptn(l.hand)} verbeter jij` : ''}`);
        if (res.soort === 'quiz') info.push(`${res.juist} van ${res.score} juist`);
      }
      if (res.elders) info.push(`werkt op ${res.elders.pc}`);
      if (res.afwezig) info.push('afwezig, haalt in');
      w.info.textContent = info.join(' · ');
      if (res.soort === 'proef') {
        const a = maak('article', 'ob-paper pf-paper pf-print');
        w.inhoud.append(a);
        PfPaper.render(a, res.view.pages, { mode: 'view', nummer: true, answers: res.answers, sleutel: res.sleutel, zones: res.zones, punten: res.status === 'nieuw' ? null : res.punten });
        if (res.afname) {
          const v = maak('a', 'button secondary', '✔ Verbeteren bij De Proef');
          v.href = `/proef?verbeter=${encodeURIComponent(res.afname)}`;
          w.inhoud.append(v);
        }
      } else if (res.soort === 'oefenblad') {
        const a = maak('article', 'ob-paper');
        w.inhoud.append(a);
        ObSheet.render(a, res.view, { mode: 'view', answers: res.answers, results: res.results, solutions: res.solutions });
      } else if (!(res.vragen || []).length) {
        w.inhoud.append(maak('p', 'muted', 'Nog geen vragen beantwoord.'));
      } else {
        for (const v of res.vragen) {
          const r = maak('div', `lv-werk-vraag ${v.juist ? 'goed' : 'fout'}`);
          r.append(maak('p', '', v.vraag), maak('p', 'small', v.juist ? `✔ ${v.goed}` : `✘ ${v.gekozen} · juist: ${v.goed}`));
          w.inhoud.append(r);
        }
      }
    }).catch(() => { w.info.textContent = 'Dat lukte niet. Probeer het nog eens.'; });
  }

  function init(s) {
    socket = s;
    laag = maak('div', 'lv-kaders');
    document.body.append(laag);
    // Vandaag open gelaten: terugzetten waar ze stonden.
    try {
      const b = JSON.parse(localStorage.getItem(BEWAAR) || 'null');
      if (b && b.dag === dag()) for (const k of (b.kaders || []).slice(0, MAX)) if (k && typeof k.id === 'string') nieuwKader(k.id, k.titel, { x: k.x, y: k.y, w: k.w, h: k.h });
    } catch {}
    socket.on('tk-live', r => { if (r && !r.error) { antwoord = true; zet(r.taken); } });
    socket.on('connect', vraag);
    if (socket.connected) vraag();
    // De minuten ("3 min op vraag 4") lopen bij, ook als niemand iets doet.
    setInterval(() => kaders.forEach(teken), 15000);
    window.addEventListener('resize', () => kaders.forEach(plaats));
  }

  window.LiveKaders = { init, open };
})();
