// Het bewegende 3D-logo: elk <img data-logo-3d> wordt drie lagen (kabel achter, de ridder, letters vooraan).
// - Chrome/Edge/Android: de ridder is een doorzichtig filmpje (webm), dat alleen speelt zolang het logo in beeld is.
// - Safari/iPhone/iPad kennen dat filmpje niet: daar is de ridder een bewegende webp-afbeelding.
// - Wie 'minder beweging' gevraagd heeft, houdt het vaste logo.
// - data-logo-3d="junior" neemt de lagen van LANcelot Junior (/img/junior/logo-3d/).
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
    const junior = oud.getAttribute('data-logo-3d') === 'junior';
    const map = junior ? '/img/junior/logo-3d/' : '/img/logo-3d/';
    vak.className = 'logo-3d' + (junior ? ' logo-3d-junior ' + oud.className : '');
    if (oud.id) vak.id = oud.id;
    const midden = filmOk
      ? '<video src="' + map + 'ridder.webm" poster="' + map + 'ridder-start.webp" preload="none" loop muted playsinline disablepictureinpicture></video>'
      : '<img class="ridder" src="' + map + 'ridder-ios.webp" alt="" loading="lazy">';
    vak.innerHTML = '<img src="' + map + 'achter.webp" alt="">' + midden + '<img src="' + map + 'voor.webp" alt="' + (oud.alt || 'LANcelot') + '">';
    const film = vak.querySelector('video');
    if (film) {
      // Speelt het filmpje toch niet af, dan de bewegende webp, nooit het vaste logo.
      film.addEventListener('error', () => { const r = document.createElement('img'); r.className = 'ridder'; r.src = map + 'ridder-ios.webp'; r.alt = ''; film.replaceWith(r); });
      if (kijker) kijker.observe(film); else { film.preload = 'auto'; film.autoplay = true; }
    }
    oud.replaceWith(vak);
  } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maak); else maak();
})();
