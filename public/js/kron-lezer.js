// De lezer van De Kronieken: één pagina van een bordboek tegelijk, zo groot mogelijk op het bord.
// pdf.js laadt pas bij het eerste boek, zodat de lijst zelf licht blijft. Bladeren met de pijlen, vegen of de randen;
// tekenen met de pen (blijft per pagina staan tot je het boek sluit). De pagina waar je stopte, wordt onthouden.
const $ = id => document.getElementById(id);
const MAX_BREED = 3000;
const KLEUREN = { rood: ['#ff4d6d', 4, 1], blauw: ['#3d8bff', 4, 1], geel: ['#ffd23f', 22, 0.38] };

let pdfjs = null;
async function laadPdfjs() {
  if (!pdfjs) {
    pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
  }
  return pdfjs;
}

const lz = { boek: null, doc: null, pagina: 1, totaal: 1, zoom: 1, breedte: false, taak: null, pen: '', inkt: new Map(), lijn: null, beurt: 0, bewaar: 0 };

function open(boek) {
  sluitDoc();
  lz.boek = boek;
  lz.pagina = Math.max(1, boek.pagina || 1);
  boek.gezien = lz.pagina;
  lz.zoom = 1;
  lz.inkt = new Map();
  zetPen('');
  $('kr-titel').textContent = boek.titel;
  $('kr-lezer').classList.remove('hidden');
  document.body.classList.add('kr-leest');
  $('kr-koppel').classList.add('hidden');
  const pdf = boek.soort === 'pdf';
  for (const id of ['kr-vorige', 'kr-volgende', 'kr-rand-links', 'kr-rand-rechts']) $(id).classList.toggle('hidden', !pdf);
  $('kr-pagina').closest('label').classList.toggle('hidden', !pdf);
  $('kr-koppel-open').classList.toggle('hidden', !boek.lesMap);
  $('kr-doek').classList.toggle('hidden', !pdf);
  $('kr-beeld').classList.toggle('hidden', pdf);
  laden(true);
  const url = `/kronieken/bestand?${new URLSearchParams({ map: boek.map, naam: boek.naam })}`;
  const beurt = ++lz.beurt;
  if (!pdf) {
    $('kr-beeld').onload = () => { if (beurt === lz.beurt) { laden(false); schaal(); } };
    $('kr-beeld').onerror = () => fout('Deze afbeelding kon niet geladen worden.');
    $('kr-beeld').src = url;
    return;
  }
  laadPdfjs()
    // Een groot bordboek komt in stukjes binnen (Range): de eerste pagina staat er snel, de rest volgt als je bladert.
    .then(lib => lib.getDocument({ url, disableAutoFetch: true, disableStream: false, isEvalSupported: false }).promise)
    .then(doc => {
      if (beurt !== lz.beurt) return doc.destroy();
      lz.doc = doc;
      lz.totaal = doc.numPages;
      lz.pagina = Math.min(lz.pagina, lz.totaal);
      $('kr-pagina').max = lz.totaal;
      $('kr-totaal').textContent = `/ ${lz.totaal}`;
      toon();
    })
    .catch(err => fout(`Dit boek kon niet geopend worden: ${err.message || err}`));
}

function laden(aan, tekst = 'Laden…') {
  $('kr-laden').textContent = tekst;
  $('kr-laden').classList.toggle('hidden', !aan);
}
function fout(tekst) {
  laden(true, tekst);
}

function sluitDoc() {
  lz.beurt++;
  if (lz.taak) try { lz.taak.cancel(); } catch {}
  lz.taak = null;
  if (lz.doc) lz.doc.destroy();
  lz.doc = null;
}

function sluit() {
  if (!lz.boek) return;
  bewaarNu();
  sluitDoc();
  const klaar = lz.boek.dicht;
  lz.boek = null;
  $('kr-beeld').removeAttribute('src');
  $('kr-lezer').classList.add('hidden');
  document.body.classList.remove('kr-leest');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (klaar) klaar();
}

// ---------- Een pagina tonen ----------

const ruimte = () => {
  const r = $('kr-blad').getBoundingClientRect();
  return { w: Math.max(100, r.width - 24), h: Math.max(100, r.height - 16) };
};

async function toon() {
  if (!lz.doc) return;
  const nr = lz.pagina;
  const beurt = lz.beurt;
  $('kr-pagina').value = nr;
  $('kr-vorige').disabled = $('kr-rand-links').disabled = nr <= 1;
  $('kr-volgende').disabled = $('kr-rand-rechts').disabled = nr >= lz.totaal;
  if (lz.taak) try { lz.taak.cancel(); } catch {}
  let pagina;
  try { pagina = await lz.doc.getPage(nr); } catch (err) { return fout(`Pagina ${nr} kon niet geladen worden.`); }
  if (beurt !== lz.beurt || nr !== lz.pagina) return;
  const basis = pagina.getViewport({ scale: 1 });
  const { w, h } = ruimte();
  const pas = lz.breedte ? w / basis.width : Math.min(w / basis.width, h / basis.height);
  const css = pas * lz.zoom;
  // Scherp op een groot bord, maar nooit breder dan MAX_BREED pixels (geheugen op een Chromebook).
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_BREED / (basis.width * css));
  const vp = pagina.getViewport({ scale: css * Math.max(dpr, 0.5) });
  const doek = document.createElement('canvas');
  doek.width = Math.floor(vp.width);
  doek.height = Math.floor(vp.height);
  lz.taak = pagina.render({ canvasContext: doek.getContext('2d', { alpha: false }), viewport: vp });
  try {
    await lz.taak.promise;
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') return;
    return fout(`Pagina ${nr} kon niet getekend worden.`);
  }
  if (beurt !== lz.beurt || nr !== lz.pagina) return;
  lz.taak = null;
  // Pas wisselen als de nieuwe pagina klaar is: geen witte flits tussen twee pagina's.
  const oud = $('kr-doek');
  doek.id = 'kr-doek';
  doek.style.width = `${Math.round(basis.width * css)}px`;
  doek.style.height = `${Math.round(basis.height * css)}px`;
  oud.replaceWith(doek);
  laden(false);
  zetInkt(doek.style.width, doek.style.height);
  if (lz.pagina < lz.totaal) lz.doc.getPage(lz.pagina + 1).catch(() => {});
}

function schaal() {
  if (lz.boek && lz.boek.soort === 'pdf') return toon();
  const img = $('kr-beeld');
  if (!img.naturalWidth) return;
  const { w, h } = ruimte();
  const pas = lz.breedte ? w / img.naturalWidth : Math.min(w / img.naturalWidth, h / img.naturalHeight);
  img.style.width = `${Math.round(img.naturalWidth * pas * lz.zoom)}px`;
  img.style.height = `${Math.round(img.naturalHeight * pas * lz.zoom)}px`;
  zetInkt(img.style.width, img.style.height);
}

function naar(nr) {
  if (!lz.doc) return;
  const p = Math.min(lz.totaal, Math.max(1, Math.round(nr) || 1));
  if (p === lz.pagina) return ($('kr-pagina').value = p);
  lz.pagina = p;
  $('kr-blad').scrollTo(0, 0);
  toon();
  clearTimeout(lz.bewaar);
  lz.bewaar = setTimeout(bewaarNu, 800);
}

function bewaarNu() {
  clearTimeout(lz.bewaar);
  if (lz.boek && lz.boek.soort === 'pdf' && lz.boek.bijPagina && lz.boek.gezien !== lz.pagina) {
    lz.boek.gezien = lz.pagina;
    lz.boek.bijPagina(lz.pagina);
  }
}

// ---------- Tekenen op de pagina ----------

function zetPen(kleur) {
  lz.pen = kleur;
  for (const b of document.querySelectorAll('.kr-pen')) b.classList.toggle('on', b.dataset.kleur === kleur);
  $('kr-inkt').classList.toggle('aan', !!kleur);
}

const inktSleutel = () => (lz.boek && lz.boek.soort === 'pdf' ? lz.pagina : 0);

function zetInkt(w, h) {
  const c = $('kr-inkt');
  c.style.width = w;
  c.style.height = h;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(parseFloat(w) * dpr);
  c.height = Math.round(parseFloat(h) * dpr);
  tekenInkt();
}

// Lijnen staan in verhoudingen (0..1), zodat ze meeschalen met inzoomen of een ander scherm.
function tekenInkt() {
  const c = $('kr-inkt');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const lijnen = lz.inkt.get(inktSleutel()) || [];
  const s = c.width / 1000;
  for (const l of lijnen) {
    const [kleur, dikte, alfa] = KLEUREN[l.kleur];
    g.globalAlpha = alfa;
    g.strokeStyle = kleur;
    g.lineWidth = dikte * s;
    g.lineCap = g.lineJoin = 'round';
    g.beginPath();
    l.p.forEach(([x, y], i) => (i ? g.lineTo(x * c.width, y * c.height) : g.moveTo(x * c.width, y * c.height)));
    if (l.p.length === 1) g.lineTo(l.p[0][0] * c.width + 0.1, l.p[0][1] * c.height);
    g.stroke();
  }
  g.globalAlpha = 1;
}

const punt = e => {
  const r = $('kr-inkt').getBoundingClientRect();
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
};

$('kr-inkt').addEventListener('pointerdown', e => {
  if (!lz.pen) return;
  e.preventDefault();
  $('kr-inkt').setPointerCapture(e.pointerId);
  const k = inktSleutel();
  if (!lz.inkt.has(k)) lz.inkt.set(k, []);
  lz.lijn = { kleur: lz.pen, p: [punt(e)] };
  lz.inkt.get(k).push(lz.lijn);
  tekenInkt();
});
$('kr-inkt').addEventListener('pointermove', e => {
  if (!lz.lijn) return;
  lz.lijn.p.push(punt(e));
  tekenInkt();
});
for (const ev of ['pointerup', 'pointercancel']) $('kr-inkt').addEventListener(ev, () => { lz.lijn = null; });

for (const b of document.querySelectorAll('.kr-pen')) b.addEventListener('click', () => zetPen(lz.pen === b.dataset.kleur ? '' : b.dataset.kleur));
$('kr-wis').addEventListener('click', () => {
  lz.inkt.delete(inktSleutel());
  tekenInkt();
});

// ---------- Bladeren ----------

$('kr-vorige').addEventListener('click', () => naar(lz.pagina - 1));
$('kr-volgende').addEventListener('click', () => naar(lz.pagina + 1));
$('kr-rand-links').addEventListener('click', () => naar(lz.pagina - 1));
$('kr-rand-rechts').addEventListener('click', () => naar(lz.pagina + 1));
$('kr-pagina').addEventListener('change', e => naar(Number(e.target.value)));
$('kr-pagina').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('kr-groter').addEventListener('click', () => { lz.zoom = Math.min(4, lz.zoom * 1.25); schaal(); });
$('kr-kleiner').addEventListener('click', () => { lz.zoom = Math.max(0.4, lz.zoom / 1.25); schaal(); });
$('kr-passen').addEventListener('click', () => {
  lz.breedte = !lz.breedte;
  lz.zoom = 1;
  $('kr-passen').textContent = lz.breedte ? 'Volle breedte' : 'Hele pagina';
  schaal();
});
$('kr-dicht').addEventListener('click', sluit);
$('kr-vol').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else $('kr-lezer').requestFullscreen().catch(() => {});
});
document.addEventListener('fullscreenchange', () => setTimeout(schaal, 50));

let rek = 0;
window.addEventListener('resize', () => {
  if (!lz.boek) return;
  clearTimeout(rek);
  rek = setTimeout(schaal, 150);
});

document.addEventListener('keydown', e => {
  if (!lz.boek || e.target.closest('input, select, textarea')) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); naar(lz.pagina + 1); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); naar(lz.pagina - 1); }
  else if (e.key === 'Home') naar(1);
  else if (e.key === 'End') naar(lz.totaal);
  else if (e.key === 'Escape' && !document.fullscreenElement) sluit();
});

// Vegen op het touchscherm van het bord (niet als de pen aan staat, en niet als je ingezoomd bent).
let veeg = null;
$('kr-blad').addEventListener('pointerdown', e => {
  if (lz.pen || e.pointerType === 'mouse') return;
  veeg = { x: e.clientX, y: e.clientY, t: Date.now() };
});
$('kr-blad').addEventListener('pointerup', e => {
  if (!veeg) return;
  const dx = e.clientX - veeg.x;
  const dy = e.clientY - veeg.y;
  const breed = $('kr-blad').scrollWidth > $('kr-blad').clientWidth + 4;
  if (!breed && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - veeg.t < 800) naar(lz.pagina + (dx < 0 ? 1 : -1));
  veeg = null;
});

// ---------- Een pagina koppelen aan een les ----------

$('kr-koppel-open').addEventListener('click', () => {
  const f = $('kr-koppel');
  if (!f.classList.contains('hidden')) return f.classList.add('hidden');
  $('kr-koppel-p').textContent = lz.boek.soort === 'pdf' ? lz.pagina : '1';
  $('kr-koppel-ok').textContent = '';
  const sel = $('kr-koppel-les');
  sel.textContent = '';
  for (const l of lz.boek.lessen || []) sel.append(new Option(`Les ${l.nr}${l.titel ? ` · ${l.titel}` : ''}`.slice(0, 80), l.nr));
  sel.append(new Option('Andere les (nummer)…', ''));
  const nr = $('kr-koppel-nr');
  nr.classList.toggle('hidden', sel.options.length > 1);
  sel.onchange = () => nr.classList.toggle('hidden', sel.value !== '');
  f.classList.remove('hidden');
});
$('kr-koppel-annuleer').addEventListener('click', () => $('kr-koppel').classList.add('hidden'));
$('kr-koppel').addEventListener('submit', e => {
  e.preventDefault();
  const les = Number($('kr-koppel-les').value || $('kr-koppel-nr').value);
  if (!les) return ($('kr-koppel-ok').textContent = 'Kies een les.');
  const p = lz.boek.soort === 'pdf' ? lz.pagina : 1;
  lz.boek.koppel(les, p, res => {
    $('kr-koppel-ok').textContent = res.error || `✓ Les ${les} opent nu op p. ${p}.`;
    if (!res.error) setTimeout(() => $('kr-koppel').classList.add('hidden'), 1400);
  });
});

window.addEventListener('pagehide', bewaarNu);

window.Lezer = { open, sluit };
window.dispatchEvent(new Event('lezer-klaar'));
