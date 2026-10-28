// Een afbeelding uitknippen voor een toets: uit een pdf (een pagina van je toets) of uit een foto of screenshot.
// De leerkracht sleept een kader; dat stuk wordt een klein webp-bestand (hooguit 1000 pixels breed, meestal 30-150 kB).
// Gebruik: PfKnip.voegToe(file) onthoudt een bestand; PfKnip.open({ titel, pagina }) geeft een data-adres of null.
// PDF.js laadt pas als er echt een pdf getekend wordt (public/vendor/pdfjs, ook gebruikt door De Kronieken).
const PfKnip = (() => {
  const $ = id => document.getElementById(id);
  const bronnen = [];
  let pdfjs = null;
  let huidig = null; // { bron, pagina }
  let klaar = null; // resolve van de open belofte
  let sel = null; // { x0, y0, x1, y1 } in procent van het canvas
  const MAX_B = 1000;
  const MAX_DATA = 320000;

  async function lib() {
    if (!pdfjs) {
      pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    }
    return pdfjs;
  }

  const lees = (file, als) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
    if (als === 'buf') r.readAsArrayBuffer(file); else r.readAsDataURL(file);
  });

  // Een bestand onthouden voor het knippen (de pdf van de toets, een foto).
  async function voegToe(file, naam) {
    if (file.type === 'application/pdf') bronnen.push({ naam: naam || file.name, soort: 'pdf', buf: await lees(file, 'buf') });
    else if (/^image\//.test(file.type)) bronnen.push({ naam: naam || file.name, soort: 'beeld', url: await lees(file) });
    else return null;
    vulKeuze();
    return bronnen[bronnen.length - 1];
  }

  function vergeet(naam) {
    const i = bronnen.findIndex(b => b.naam === naam);
    if (i >= 0) bronnen.splice(i, 1);
    vulKeuze();
  }

  function vulKeuze() {
    const s = $('k-bron');
    if (!s) return;
    s.innerHTML = bronnen.map((b, i) => `<option value="${i}">${PfPaper.esc(b.naam)}</option>`).join('');
    s.classList.toggle('hidden', bronnen.length < 2);
    if (huidig) s.value = String(bronnen.indexOf(huidig.bron));
  }

  async function teken() {
    const canvas = $('k-canvas');
    const vlak = $('k-vlak');
    $('k-leeg').classList.toggle('hidden', !!huidig);
    canvas.classList.toggle('hidden', !huidig);
    zetSel(null);
    if (!huidig) return;
    const b = huidig.bron;
    const breed = Math.min(1400, Math.max(600, vlak.clientWidth * (window.devicePixelRatio || 1)));
    const ctx = canvas.getContext('2d');
    if (b.soort === 'pdf') {
      const p = await lib();
      if (!b.doc) b.doc = await p.getDocument({ data: b.buf.slice(0) }).promise;
      huidig.pagina = Math.max(1, Math.min(b.doc.numPages, huidig.pagina || 1));
      const page = await b.doc.getPage(huidig.pagina);
      const v0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: breed / v0.width });
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      $('k-pagina').textContent = `pagina ${huidig.pagina} van ${b.doc.numPages}`;
    } else {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Kon de afbeelding niet openen.'));
        i.src = b.url;
      });
      const sc = Math.min(1, 2400 / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * sc);
      canvas.height = Math.round(img.naturalHeight * sc);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      $('k-pagina').textContent = '';
    }
    const pdf = b.soort === 'pdf';
    $('k-vorige').classList.toggle('hidden', !pdf);
    $('k-volgende').classList.toggle('hidden', !pdf);
  }

  function zetSel(s) {
    sel = s;
    const k = $('k-kader');
    const ok = s && Math.abs(s.x1 - s.x0) > 1 && Math.abs(s.y1 - s.y0) > 1;
    k.classList.toggle('hidden', !s);
    $('k-ok').disabled = !ok;
    if (!s) return;
    const c = $('k-canvas');
    const left = Math.min(s.x0, s.x1);
    const top = Math.min(s.y0, s.y1);
    Object.assign(k.style, {
      left: `${c.offsetLeft + (left / 100) * c.clientWidth}px`, top: `${c.offsetTop + (top / 100) * c.clientHeight}px`,
      width: `${(Math.abs(s.x1 - s.x0) / 100) * c.clientWidth}px`, height: `${(Math.abs(s.y1 - s.y0) / 100) * c.clientHeight}px`,
    });
  }

  // Een stuk van het canvas als klein webp-bestand.
  function snij(x, y, w, h) {
    const bron = $('k-canvas');
    const sc = Math.min(1, MAX_B / w);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * sc));
    out.height = Math.max(1, Math.round(h * sc));
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(bron, x, y, w, h, 0, 0, out.width, out.height);
    return comprimeer(out);
  }

  // Webp waar het kan (Chrome), anders jpeg. Te groot? Lagere kwaliteit, dan kleiner.
  function comprimeer(canvas) {
    let c = canvas;
    for (let ronde = 0; ronde < 4; ronde++) {
      for (const q of [0.82, 0.7, 0.55]) {
        let url = c.toDataURL('image/webp', q);
        if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q);
        if (url.length <= MAX_DATA) return url;
      }
      const k = document.createElement('canvas');
      k.width = Math.round(c.width * 0.75);
      k.height = Math.round(c.height * 0.75);
      k.getContext('2d').drawImage(c, 0, 0, k.width, k.height);
      c = k;
    }
    return c.toDataURL('image/jpeg', 0.5);
  }

  // Een eigen afbeelding (gekozen of geplakt) meteen verkleinen, zonder knippen.
  function verklein(file) {
    return lees(file).then(url => new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => {
        const sc = Math.min(1, MAX_B / i.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(i.naturalWidth * sc);
        c.height = Math.round(i.naturalHeight * sc);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(i, 0, 0, c.width, c.height);
        resolve(comprimeer(c));
      };
      i.onerror = () => reject(new Error('Dit is geen afbeelding die de browser kan openen.'));
      i.src = url;
    }));
  }

  function sluit(waarde) {
    $('knip').classList.add('hidden');
    document.removeEventListener('paste', plak);
    const r = klaar;
    klaar = null;
    if (r) r(waarde);
  }

  async function plak(e) {
    const f = [...(e.clipboardData?.files || [])].find(x => /^image\/|pdf$/.test(x.type));
    if (!f) return;
    e.preventDefault();
    const b = await voegToe(f, `Geplakt ${bronnen.length + 1}`);
    huidig = { bron: b, pagina: 1 };
    vulKeuze();
    teken();
  }

  function open({ titel, pagina } = {}) {
    if (klaar) sluit(null);
    $('k-titel').textContent = titel || 'Knip een afbeelding';
    const pdf = bronnen.find(b => b.soort === 'pdf');
    huidig = bronnen.length ? { bron: pagina && pdf ? pdf : (huidig && bronnen.includes(huidig.bron) ? huidig.bron : bronnen[0]), pagina: pagina || (huidig && huidig.pagina) || 1 } : null;
    vulKeuze();
    $('knip').classList.remove('hidden');
    document.addEventListener('paste', plak);
    teken().catch(err => Ui.melding(err.message));
    return new Promise(resolve => { klaar = resolve; });
  }

  function wire() {
    const vlak = $('k-vlak');
    const canvas = $('k-canvas');
    let start = null;
    const pct = e => {
      const r = canvas.getBoundingClientRect();
      return { x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)) };
    };
    vlak.addEventListener('pointerdown', e => {
      if (!huidig || e.button > 0) return;
      e.preventDefault();
      vlak.setPointerCapture(e.pointerId);
      start = pct(e);
      zetSel({ x0: start.x, y0: start.y, x1: start.x, y1: start.y });
    });
    vlak.addEventListener('pointermove', e => {
      if (!start) return;
      const p = pct(e);
      zetSel({ x0: start.x, y0: start.y, x1: p.x, y1: p.y });
    });
    vlak.addEventListener('pointerup', () => { start = null; });
    $('k-ok').addEventListener('click', () => {
      if (!sel) return;
      const c = $('k-canvas');
      const x = (Math.min(sel.x0, sel.x1) / 100) * c.width;
      const y = (Math.min(sel.y0, sel.y1) / 100) * c.height;
      sluit(snij(x, y, (Math.abs(sel.x1 - sel.x0) / 100) * c.width, (Math.abs(sel.y1 - sel.y0) / 100) * c.height));
    });
    $('k-heel').addEventListener('click', () => {
      if (!huidig) return;
      const c = $('k-canvas');
      sluit(snij(0, 0, c.width, c.height));
    });
    $('k-annuleer').addEventListener('click', () => sluit(null));
    $('knip').addEventListener('click', e => { if (e.target.id === 'knip') sluit(null); });
    $('k-vorige').addEventListener('click', () => { if (huidig) { huidig.pagina--; teken(); } });
    $('k-volgende').addEventListener('click', () => { if (huidig) { huidig.pagina++; teken(); } });
    $('k-bron').addEventListener('change', e => { huidig = { bron: bronnen[Number(e.target.value)], pagina: 1 }; teken(); });
    $('k-file').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const b = await voegToe(f);
      if (!b) return Ui.melding('Kies een pdf of een afbeelding.');
      huidig = { bron: b, pagina: 1 };
      vulKeuze();
      teken();
    });
    window.addEventListener('resize', () => { if (sel) zetSel(sel); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  return { voegToe, vergeet, open, verklein, get bronnen() { return bronnen; } };
})();
