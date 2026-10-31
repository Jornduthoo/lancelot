// Het bewegende 3D-logo: elk <img data-logo-3d> wordt drie lagen (kabel achter, de ridder als filmpje, letters vooraan).
// Kan de browser het doorzichtige filmpje niet tonen (Safari op iPhone/iPad, oude browser), of wil iemand geen beweging,
// dan blijft gewoon het vaste logo staan.
(() => {
  const proef = document.createElement('video');
  const safari = /^((?!chrome|chromium|crios|android|edg).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (safari || !proef.canPlayType('video/webm; codecs="vp9"')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const oud of document.querySelectorAll('img[data-logo-3d]')) {
    const vak = document.createElement('div');
    vak.className = 'logo-3d';
    if (oud.id) vak.id = oud.id;
    vak.innerHTML = '<img src="/img/logo-3d/achter.webp" alt="">'
      + '<video src="/img/logo-3d/ridder.webm" poster="/img/logo-3d/ridder-start.webp" preload="auto" autoplay loop muted playsinline disablepictureinpicture></video>'
      + '<img src="/img/logo-3d/voor.webp" alt="LANcelot">';
    vak.querySelector('video').addEventListener('error', () => vak.replaceWith(oud));
    oud.replaceWith(vak);
  }
})();
