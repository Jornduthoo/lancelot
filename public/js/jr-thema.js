// LANcelot Junior · thema-versiering volgens de kalender (herfst, Halloween, Sinterklaas, kerst, winter, Valentijn, carnaval, lente, Pasen, Moederdag, Vaderdag, zomer, schoolstart) aan de randen van het scherm.
// JrThema.zet('herfst') of JrThema.zet('') . De prenten staan in /img/junior/thema/<thema>/1-8.webp.
(function () {
  // Plekken langs de randen (links/rechts in %, onder in %, grootte in vmin, draaiing). Nooit in het midden.
  const PLEK = [[1, 2, 11, -8], [93, 3, 10, 6], [0, 46, 8, 10], [94, 40, 8, -6], [12, 0, 7, 4], [84, 0, 7, -4]];
  let nu = null;
  const laag = () => {
    let el = document.getElementById('jr-thema');
    if (!el) { el = document.createElement('div'); el.id = 'jr-thema'; el.className = 'jr-thema'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    return el;
  };
  window.JrThema = {
    zet(thema) {
      thema = thema || '';
      if (thema === nu) return;
      nu = thema;
      document.body.dataset.thema = thema;
      const el = laag();
      if (!thema) { el.innerHTML = ''; return; }
      const prenten = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, PLEK.length);
      el.innerHTML = PLEK.map(([x, y, g, r], i) => `<img src="/img/junior/thema/${thema}/${prenten[i]}.webp" alt="" style="left:${x}%;bottom:${y}%;width:${g}vmin;--r:${r}deg;animation-delay:-${i * 0.7}s">`).join('');
    },
    get thema() { return nu; },
  };
})();
