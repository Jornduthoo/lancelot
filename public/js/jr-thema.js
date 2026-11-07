// LANcelot Junior · thema volgens de kalender (herfst, Halloween, Sinterklaas, kerst, winter, Valentijn, carnaval, lente, Pasen, Moederdag, Vaderdag, zomer, schoolstart).
// Geen losse prentjes: de burchthal zelf krijgt een geschilderde versie met versiering (/img/junior/thema/<thema>.webp).
// JrThema.zet('herfst') of JrThema.zet('') .
(function () {
  let nu = null;
  window.JrThema = {
    zet(thema) {
      thema = thema || '';
      if (thema === nu) return;
      nu = thema;
      const b = document.body;
      b.dataset.thema = thema;
      if (!thema) { b.style.removeProperty('--jr-hal'); b.style.removeProperty('--jr-hal-klein'); return; }
      b.style.setProperty('--jr-hal', `url(/img/junior/thema/${thema}.webp)`);
      b.style.setProperty('--jr-hal-klein', `url(/img/junior/thema/${thema}-klein.webp)`);
    },
    get thema() { return nu; },
  };
})();
