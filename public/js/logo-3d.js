// Het bewegende 3D-logo: elk <img data-logo-3d> wordt drie lagen (kabel achter, de ridder, letters vooraan).
// - Chrome/Edge/Android: de ridder is een doorzichtig filmpje (webm), dat alleen speelt zolang het logo in beeld is.
// - Safari/iPhone/iPad kennen dat filmpje niet: daar is de ridder een bewegende webp-afbeelding.
// - Wie 'minder beweging' gevraagd heeft, houdt het vaste logo.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ua = navigator.userAgent;
  const apple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    || /^((?!chrome|chromium|crios|android|edg).)*safari/i.test(ua);
  const filmOk = !apple && !!document.createElement('video').canPlayType('video/webm; codecs="vp9"');
  const kijker = filmOk && 'IntersectionObserver' in window ? new IntersectionObserver(items => {
    for (const it of items) {
      const v = it.target;
      if (it.isIntersecting) { if (v.preload !== 'auto') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }
  }) : null;
  // Pas als de hele pagina geladen is: zo krijgen ook de aanmeldschermen die de spellen zelf maken (xx-player.js) het logo.
  const maak = () => { for (const oud of document.querySelectorAll('img[data-logo-3d]')) {
    const vak = document.createElement('div');
    vak.className = 'logo-3d';
    if (oud.id) vak.id = oud.id;
    const midden = filmOk
      ? '<video src="/img/logo-3d/ridder.webm" poster="/img/logo-3d/ridder-start.webp" preload="none" loop muted playsinline disablepictureinpicture></video>'
      : '<img class="ridder" src="/img/logo-3d/ridder-ios.webp" alt="" loading="lazy">';
    vak.innerHTML = '<img src="/img/logo-3d/achter.webp" alt="">' + midden + '<img src="/img/logo-3d/voor.webp" alt="LANcelot">';
    const film = vak.querySelector('video');
    if (film) {
      film.addEventListener('error', () => vak.replaceWith(oud));
      if (kijker) kijker.observe(film); else { film.preload = 'auto'; film.autoplay = true; }
    }
    oud.replaceWith(vak);
  } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maak); else maak();
})();
