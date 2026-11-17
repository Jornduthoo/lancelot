// De dia-speler: draait IN een html-presentatie uit Mijn methodes (zie docs/presentaties-html.md).
// De server plakt dit script in het bestand. Het bestand zelf is afgeschermd (sandbox, eigen scripts staan uit),
// dus dit script praat met LANcelot enkel via postMessage.
// Afspraak: elke <section class="dia"> is één dia; alles met class="stap" (of data-stap) verschijnt pas bij de volgende klik.
(() => {
  const ouder = window.parent;
  const doc = document;
  let dias = [...doc.querySelectorAll('.dia')].filter(d => !d.parentElement.closest('.dia'));
  if (!dias.length) dias = [...doc.querySelectorAll('body > section')];
  const los = !dias.length; // geen dia's: het hele bestand is één dia
  if (los) dias = [doc.body];
  const stappenVan = d => [...d.querySelectorAll('.stap, [data-stap]')];
  let nu = 0;
  let getoond = 0;
  let stappen = [];

  let gestart = false;
  const meld = soort => {
    if (!gestart && soort === 'stand') return; // LANcelot hoort eerst 'klaar', en zet dan de dia waar je stopte
    try { ouder.postMessage({ lancelot: 'dia', soort, dia: nu + 1, dias: dias.length, stap: getoond, stappen: stappen.length }, '*'); } catch {}
  };

  function zetStappen() {
    stappen.forEach((s, i) => s.classList.toggle('lc-verborgen', i >= getoond));
  }

  function toon(i, alles) {
    nu = Math.min(dias.length - 1, Math.max(0, i));
    if (!los) dias.forEach((d, j) => d.classList.toggle('lc-weg', j !== nu));
    stappen = stappenVan(dias[nu]);
    getoond = alles ? stappen.length : 0;
    zetStappen();
    window.scrollTo(0, 0);
    meld('stand');
  }

  function volgende() {
    if (getoond < stappen.length) {
      const s = stappen[getoond++];
      zetStappen();
      const r = s.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 0) s.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      meld('stand');
    } else if (nu < dias.length - 1) toon(nu + 1, false);
  }

  function vorige() {
    if (getoond > 0) {
      getoond--;
      zetStappen();
      meld('stand');
    } else if (nu > 0) toon(nu - 1, true);
  }

  // Links: een website opent in een nieuw tabblad (het bord blijft open), #dia-3 of #id springt naar die dia.
  const VEILIG = /^(https?:|mailto:)/i;
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href').trim();
    if (VEILIG.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  }
  function volgLink(a, e) {
    const href = a.getAttribute('href').trim();
    if (VEILIG.test(href)) return; // de browser opent hem in een nieuw tabblad
    e.preventDefault();
    if (!href.startsWith('#')) return;
    const m = /^#dia-?(\d+)$/i.exec(href);
    if (m) return toon(Number(m[1]) - 1, false);
    let doel = null;
    try { doel = doc.getElementById(decodeURIComponent(href.slice(1))); } catch {}
    const d = doel && dias.indexOf(doel.closest('.dia') || doel);
    if (d >= 0 && d !== null) toon(d, false);
  }

  // Klikken of tikken op de dia = volgende stap. Niet op een link, knop, video of invulveld.
  const BEDIENING = ['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'details', 'video', 'audio', 'iframe', '[contenteditable]', '[tabindex]'].join(',');
  let geveegd = false;
  doc.addEventListener('click', e => {
    if (geveegd) { geveegd = false; return; }
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) return volgLink(a, e);
    if (e.target.closest && e.target.closest(BEDIENING)) return;
    const sel = window.getSelection && String(window.getSelection());
    if (sel && sel.trim()) return;
    volgende();
  });

  // Vegen met de vinger op het bord: naar links = verder, naar rechts = terug. Met touch-events: pointer-events
  // worden afgebroken zodra de browser zelf begint te scrollen.
  let veeg = null;
  doc.addEventListener('touchstart', e => {
    const t = e.touches[0];
    veeg = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
    geveegd = false;
  }, { passive: true });
  doc.addEventListener('touchend', e => {
    if (!veeg || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - veeg.x;
    const dy = e.changedTouches[0].clientY - veeg.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - veeg.t < 800) {
      geveegd = true;
      setTimeout(() => { geveegd = false; }, 400);
      if (dx < 0) volgende(); else vorige();
    }
    veeg = null;
  });

  // Pijltjes, spatie en de knoppen van een presenter (PageDown/PageUp).
  doc.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable]')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); volgende(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); vorige(); }
    else if (e.key === 'Home') { e.preventDefault(); toon(0, false); }
    else if (e.key === 'End') { e.preventDefault(); toon(dias.length - 1, false); }
    else if (e.key === 'Escape') { try { ouder.postMessage({ lancelot: 'dia', soort: 'sluit' }, '*'); } catch {} }
  });

  // Opdrachten van LANcelot: de knoppen ◀ ▶, groter/kleiner en de dia waar je stopte.
  window.addEventListener('message', e => {
    if (e.source !== ouder || !e.data || e.data.lancelot !== 'speler') return;
    const d = e.data;
    if (d.doe === 'volgende') volgende();
    else if (d.doe === 'vorige') vorige();
    else if (d.doe === 'naar') toon(Math.round(Number(d.dia) || 1) - 1, !!d.alles);
    else if (d.doe === 'zoom') doc.documentElement.style.zoom = String(Math.min(4, Math.max(0.3, Number(d.zoom) || 1)));
  });

  const stijl = doc.createElement('style');
  stijl.textContent = '.lc-weg{display:none!important}.lc-verborgen{opacity:0!important;visibility:hidden!important}'
    + '.stap,[data-stap]{transition:opacity .35s ease,visibility .35s}';
  (doc.head || doc.documentElement).append(stijl);
  toon(0, false);
  gestart = true;
  meld('klaar');
})();
