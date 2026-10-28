// Een blad uit je eigen toets-pdf: de pagina zoals hij is, met invulvakjes erop.
// PfBlad.uit(bron) maakt van een pdf (of foto) bladen: elke pagina een klein webp-beeld, met de vakjes die LANcelot zelf vindt
// (puntjes, lijntjes en lege hokjes waar iets ingevuld moet worden). PfBlad.bewerk(blad) opent het blad om vakjes
// te verschuiven, bij te maken en de antwoorden in te vullen. PfBlad.aiPrompt en PfBlad.genummerd helpen de AI de sleutel te maken.
// PDF.js laadt pas als er echt een pdf getekend wordt (public/vendor/pdfjs).
const PfBlad = (() => {
  const BREED = 1240; // ongeveer 150 dpi voor een A4: scherp genoeg om te lezen, klein genoeg voor de Chromebooks
  const MAX_DATA = 600000;
  const MAX_BLADEN = 30;
  let pdfjs = null;

  async function lib() {
    if (!pdfjs) {
      pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    }
    return pdfjs;
  }
  const bytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const r2 = n => Math.round(n * 100) / 100;

  function comprimeer(canvas) {
    let c = canvas;
    for (let ronde = 0; ronde < 4; ronde++) {
      for (const q of [0.74, 0.6, 0.48]) {
        let url = c.toDataURL('image/webp', q);
        if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q);
        if (url.length <= MAX_DATA) return url;
      }
      const k = document.createElement('canvas');
      k.width = Math.round(c.width * 0.85);
      k.height = Math.round(c.height * 0.85);
      k.getContext('2d').drawImage(c, 0, 0, k.width, k.height);
      c = k;
    }
    return c.toDataURL('image/jpeg', 0.4);
  }

  const laadBeeld = src => new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Kon de afbeelding niet openen.'));
    i.src = src;
  });

  function blad(canvas) {
    return { type: 'blad', beeld: comprimeer(canvas), verhouding: Math.round((canvas.height / canvas.width) * 10000) / 10000, velden: zoekVakjes(canvas) };
  }

  // bron: { naam, mimeType, data (base64) }. Geeft een lijst bladen (vragen van de soort blad).
  async function uit(bron, voortgang = () => {}) {
    const out = [];
    if (bron.mimeType === 'application/pdf') {
      const p = await lib();
      const doc = await p.getDocument({ data: bytes(bron.data) }).promise;
      const n = Math.min(doc.numPages, MAX_BLADEN);
      for (let i = 1; i <= n; i++) {
        voortgang(i, n);
        const page = await doc.getPage(i);
        const v0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: BREED / v0.width });
        const c = document.createElement('canvas');
        c.width = Math.round(vp.width);
        c.height = Math.round(vp.height);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        out.push(blad(c));
        page.cleanup();
      }
      doc.destroy();
    } else if (/^image\//.test(bron.mimeType)) {
      voortgang(1, 1);
      const img = await laadBeeld(`data:${bron.mimeType};base64,${bron.data}`);
      const sc = Math.min(1, BREED / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out.push(blad(c));
    }
    return out;
  }

  // ---------- Vakjes zoeken ----------
  // Op het beeld zelf (dus ook bij een scan): een lijn van puntjes of een streep, dun, met wit erboven = hier schrijft de leerling.
  // Een paar lange lijnen onder elkaar = een open vraag.
  function zoekVakjes(canvas) {
    const W = canvas.width;
    const H = canvas.height;
    const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    // donker: inkt. niet wit: ook grijze roosterlijnen en ingekleurde vlakken (dan is het geen lege plek om te schrijven).
    const donker = new Uint8Array(W * H);
    const grijs = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < donker.length; i += 4, j++) {
      const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      donker[j] = l < 150 ? 1 : 0;
      grijs[j] = l < 225 ? 1 : 0;
    }
    const dicht = (y, x0, x1, m = donker) => {
      if (y < 0 || y >= H) return 0;
      let n = 0;
      const o = y * W;
      for (let x = x0; x <= x1; x++) n += m[o + x];
      return n / (x1 - x0 + 1);
    };
    // Lijnen die verticale lijnen kruisen, horen bij een rooster, tabel of figuur: geen vakje.
    const kruist = (y, x0, x1) => {
      if (y < 7 || y >= H - 7) return false;
      let n = 0;
      for (let x = x0; x <= x1; x++) if (donker[(y - 6) * W + x] && donker[(y + 6) * W + x] && donker[(y - 3) * W + x] && donker[(y + 3) * W + x]) n++;
      return n >= 2;
    };
    const minLen = Math.max(28, Math.round(W * 0.035));
    const gat = Math.max(4, Math.round(W * 0.006));
    const lijnen = [];
    for (let y = 4; y < H - 4; y++) {
      const o = y * W;
      let x = 0;
      while (x < W) {
        if (!donker[o + x]) { x++; continue; }
        const x0 = x;
        let laatste = x;
        let n = 0;
        while (x < W && x - laatste <= gat) {
          if (donker[o + x]) { laatste = x; n++; }
          x++;
        }
        const len = laatste - x0 + 1;
        if (len >= minLen && len < W * 0.92 && n / len >= 0.3 && dicht(y - 4, x0, laatste) < 0.12 && dicht(y + 4, x0, laatste) < 0.12 && !kruist(y, x0, laatste)) lijnen.push({ y, x0, x1: laatste });
      }
    }
    // Een dikke lijn (2-3 pixels) is één lijn.
    const samen = [];
    for (const l of lijnen) {
      const s = samen.find(m => l.y - m.y <= 3 && l.y >= m.y && Math.min(l.x1, m.x1) - Math.max(l.x0, m.x0) > 0.5 * (l.x1 - l.x0));
      if (s) { s.y = l.y; s.x0 = Math.min(s.x0, l.x0); s.x1 = Math.max(s.x1, l.x1); } else samen.push({ ...l });
    }
    const tekstH = Math.round(H * 0.019);
    const vrij = samen.filter(l => {
      let n = 0;
      let tot = 0;
      for (let y = l.y - Math.round(tekstH * 0.75); y <= l.y - 3; y++) { n += dicht(y, l.x0, l.x1, grijs); tot++; }
      return tot && n / tot < 0.035;
    }).sort((a, b) => a.y - b.y || a.x0 - b.x0);
    // Lange lijnen onder elkaar met dezelfde breedte: één groot vak voor een open vraag.
    const velden = [];
    const gebruikt = new Set();
    for (let i = 0; i < vrij.length; i++) {
      if (gebruikt.has(i)) continue;
      const l = vrij[i];
      const groep = [l];
      if (l.x1 - l.x0 > W * 0.35) {
        for (let j = i + 1; j < vrij.length; j++) {
          const m = vrij[j];
          const vorige = groep[groep.length - 1];
          const afstand = m.y - vorige.y;
          if (afstand > H * 0.06) break;
          if (afstand >= H * 0.018 && Math.abs(m.x0 - l.x0) < W * 0.03 && Math.abs(m.x1 - l.x1) < W * 0.03) { groep.push(m); gebruikt.add(j); }
        }
      }
      gebruikt.add(i);
      if (groep.length > 1) {
        const tussen = (groep[groep.length - 1].y - groep[0].y) / (groep.length - 1);
        const top = Math.max(0, groep[0].y - tussen + 4);
        velden.push({ x: l.x0, y: top, w: l.x1 - l.x0, h: groep[groep.length - 1].y - top + 2, soort: 'open' });
      } else {
        const h = Math.round(tekstH * 1.45);
        velden.push({ x: l.x0, y: Math.max(0, l.y - h + 4), w: l.x1 - l.x0, h, soort: 'tekst' });
      }
    }
    return velden.slice(0, 80).map(v => {
      const f = { x: r2((v.x / W) * 100), y: r2((v.y / H) * 100), w: r2((v.w / W) * 100), h: r2((v.h / H) * 100), soort: v.soort, punten: 1 };
      return f;
    });
  }

  // Vakjes van boven naar onder, van links naar rechts (zo nummert de leerling ze ook).
  function sorteer(velden) {
    return velden.slice().sort((a, b) => (Math.abs(a.y + a.h - (b.y + b.h)) < Math.min(a.h, b.h) * 0.6 ? a.x - b.x : a.y + a.h - (b.y + b.h)));
  }

  // ---------- Voor de AI: de bladen met genummerde rode kaders ----------
  // start: het nummer van het eerste vakje. Geeft { mimeType, data } (jpeg, base64) en het volgende nummer.
  async function genummerd(b, start) {
    const img = await laadBeeld(b.beeld);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const fs = Math.max(14, Math.round(c.width * 0.014));
    ctx.font = `bold ${fs}px sans-serif`;
    b.velden.forEach((f, k) => {
      const x = (f.x / 100) * c.width;
      const y = (f.y / 100) * c.height;
      const w = (f.w / 100) * c.width;
      const h = (f.h / 100) * c.height;
      ctx.strokeStyle = '#e00000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const label = String(start + k);
      const lw = ctx.measureText(label).width + 8;
      ctx.fillStyle = '#e00000';
      ctx.fillRect(x - lw - 2, y, lw, fs + 6);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x - lw + 2, y + fs + 1);
    });
    return { mimeType: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1], url: c.toDataURL('image/jpeg', 0.82) };
  }

  function aiPrompt(bladen, start = 1, niveau = '') {
    let nr = start;
    const lijst = bladen.map((b, i) => `Blad ${i + 1}: ${b.velden.map(f => `${nr++}${f.soort === 'kruis' ? ' (hokje)' : f.soort === 'open' ? ' (open)' : f.soort === 'kies' ? ' (keuzelijst)' : ''}`).join(', ')}`).join('\n');
    return `Je bent een ervaren leerkracht in Vlaanderen${niveau ? ` (${niveau})` : ''}. Op de bijgevoegde afbeeldingen staan de bladen van een toets.
Elk rood kader met een nummer is een plek waar de leerling iets invult. Maak de verbetersleutel: geef voor elk nummer het juiste antwoord.
De vakjes per blad:
${lijst}

Regels:
- Lees de opdracht bij elk vakje goed en los de vraag zelf op. Controleer elk antwoord twee keer.
- "soort": "tekst" voor een kort antwoord (een getal, woord of korte zin), "kruis" voor een hokje dat de leerling aankruist of niet,
  "kies" als de leerling kiest uit een paar gegeven woorden of tekens (bv. < > =, of omcirkel: waar / niet waar), "open" voor een langer antwoord.
- Bij "kies": zet de keuzes in "opties" en de juiste keuze, precies zo geschreven, in "antwoord".
- Bij "tekst": zet in "antwoord" alleen wat de leerling schrijft. Meerdere goede schrijfwijzen mag, gescheiden door |. Getallen met een komma: 0,5.
  Staat de eenheid al gedrukt naast het vakje, zet ze dan in "eenheid" en niet in het antwoord.
- Bij "kruis": "antwoord" is true als het hokje aangekruist moet worden, anders false. Hokjes die bij dezelfde vraag horen, krijgen hetzelfde getal in "groep".
- Bij "open": zet in "antwoord" een kort modelantwoord voor de leerkracht.
- "punten": zoals op de toets staat. Staat er niets, geef dan 1. Een hokje dat niet aangekruist moet worden: 0.
- Is een kader geen plek om iets in te vullen (per ongeluk gevonden), geef dan "soort": "weg".

Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, in dit formaat:
{ "velden": [ { "nr": ${start}, "soort": "tekst", "antwoord": "1600", "eenheid": "cm²", "punten": 1 }, { "nr": ${start + 1}, "soort": "kruis", "antwoord": true, "groep": 1, "punten": 1 } ] }`;
  }

  // Het antwoord van de AI (tekst of al JSON) in de vakjes zetten. Geeft het aantal ingevulde vakjes.
  function zetSleutel(bladen, data, start = 1) {
    let lijst = data;
    if (typeof data === 'string') {
      const blok = /```(?:json)?\s*([\s\S]*?)```/i.exec(data);
      const tekst = blok ? blok[1] : data.slice(data.indexOf('{'), data.lastIndexOf('}') + 1);
      try { lijst = JSON.parse(tekst); } catch { throw new Error('Dit is geen verbetersleutel. Kopieer het hele antwoord van de chatbot.'); }
    }
    if (lijst && !Array.isArray(lijst)) lijst = lijst.velden;
    if (!Array.isArray(lijst)) throw new Error('Dit is geen verbetersleutel. Kopieer het hele antwoord van de chatbot.');
    const alle = [];
    for (const b of bladen) for (const f of b.velden) alle.push({ b, f });
    let n = 0;
    for (const r of lijst) {
      const plek = alle[Number(r && r.nr) - start];
      if (!plek) continue;
      const { b, f } = plek;
      if (r.soort === 'weg') { f.weg = true; continue; }
      if (['tekst', 'kruis', 'kies', 'open'].includes(r.soort)) f.soort = r.soort;
      if (f.soort === 'kruis') {
        f.antwoord = r.antwoord === true || /^(true|ja|x)$/i.test(String(r.antwoord));
        f.groep = Math.max(1, Math.round(Number(r.groep)) || 1);
      } else if (r.antwoord !== undefined && r.antwoord !== null) f.antwoord = String(r.antwoord).slice(0, 1000);
      if (f.soort === 'kies') f.opties = Array.isArray(r.opties) ? r.opties.map(o => String(o).slice(0, 80)).filter(Boolean).slice(0, 8) : f.opties || [];
      if (r.eenheid && f.soort === 'tekst') f.eenheid = String(r.eenheid).slice(0, 20); else delete f.eenheid;
      const p = Number(String(r.punten ?? '').replace(',', '.'));
      if (r.punten !== undefined && Number.isFinite(p) && p >= 0) f.punten = Math.min(100, Math.round(p * 2) / 2);
      n++;
      b.gewijzigd = true;
    }
    for (const b of bladen) b.velden = b.velden.filter(f => !f.weg);
    return n;
  }

  // ---------- Het blad bewerken ----------
  let box = null;
  let staat = null; // { velden, sel, klaar, opts }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function maakBox() {
    box = document.createElement('div');
    box.className = 'ob-modal hidden';
    box.id = 'blad-edit';
    box.innerHTML = `<div class="ob-modal-box pf-be">
      <div class="bar"><h2 id="be-titel">Vakjes op het blad</h2>
        <div class="actions"><button class="secondary" id="be-annuleer">Annuleren</button><button class="gold" id="be-klaar">Klaar</button></div></div>
      <div class="pf-be-balk">
        <span class="pf-be-soort">Nieuw vakje:
          <label><input type="radio" name="be-soort" value="tekst" checked> ✏️ antwoord</label>
          <label><input type="radio" name="be-soort" value="kruis"> ☐ hokje</label>
          <label><input type="radio" name="be-soort" value="kies"> ▾ keuzelijst</label>
          <label><input type="radio" name="be-soort" value="open"> 💬 open</label></span>
        <button class="secondary small-btn" id="be-zoek">🔍 Zoek vakjes opnieuw</button>
        <button class="secondary small-btn" id="be-ai">✨ Antwoorden met AI</button>
        <button class="secondary small-btn" id="be-copy">📋 Prompt voor een chatbot</button>
      </div>
      <p class="muted small">Sleep op het blad om een vakje te maken. Sleep een vakje om het te verplaatsen, het hoekje rechtsonder om het groter of kleiner te maken. Delete haalt het geselecteerde vakje weg.</p>
      <div class="pf-be-copy hidden" id="be-copy-box">
        <p class="small">De prompt is gekopieerd en de bladen met genummerde vakjes worden gedownload. Plak de prompt in een chatbot, voeg die bladen toe en plak het antwoord hier:</p>
        <textarea id="be-antwoord" rows="3" placeholder="Plak hier het hele antwoord…"></textarea>
      </div>
      <p class="error" id="be-error"></p><span class="muted small" id="be-busy"></span>
      <div class="pf-be-grid">
        <div class="pf-be-vlak"><div class="pf-blad-vel pf-be-vel" id="be-vel"><img id="be-img" alt="" draggable="false"><div id="be-velden"></div></div></div>
        <div class="pf-be-lijst"><div class="pf-be-kop"><span>#</span><span>Soort</span><span>Juist antwoord</span><span>Eenheid</span><span>Ptn</span><span></span></div><div id="be-rijen"></div></div>
      </div>
    </div>`;
    document.body.appendChild(box);
    const $ = id => box.querySelector(`#${id}`);
    const vel = $('be-vel');
    let sleep = null;
    const pct = e => {
      const r = vel.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    };
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    vel.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      vel.setPointerCapture(e.pointerId);
      const p = pct(e);
      const el = e.target.closest('.pf-be-veld');
      if (el) {
        const k = Number(el.dataset.k);
        kies(k);
        const f = staat.velden[k];
        sleep = { k, soort: e.target.classList.contains('greep') ? 'groot' : 'schuif', p, f0: { ...f } };
      } else {
        const soort = box.querySelector('input[name="be-soort"]:checked').value;
        const f = { x: r2(p.x), y: r2(p.y), w: 0.5, h: 0.5, soort, punten: soort === 'kruis' ? 0 : 1 };
        if (soort === 'kruis') { f.antwoord = false; f.groep = groepBij(f); }
        staat.velden.push(f);
        sleep = { k: staat.velden.length - 1, soort: 'nieuw', p, f0: { ...f } };
        teken();
        kies(sleep.k);
      }
    });
    vel.addEventListener('pointermove', e => {
      if (!sleep) return;
      const p = pct(e);
      const f = staat.velden[sleep.k];
      const dx = p.x - sleep.p.x;
      const dy = p.y - sleep.p.y;
      if (sleep.soort === 'schuif') {
        f.x = r2(clamp(sleep.f0.x + dx, 0, 100 - f.w));
        f.y = r2(clamp(sleep.f0.y + dy, 0, 100 - f.h));
      } else if (sleep.soort === 'groot') {
        f.w = r2(clamp(sleep.f0.w + dx, 0.6, 100 - f.x));
        f.h = r2(clamp(sleep.f0.h + dy, 0.4, 100 - f.y));
      } else {
        f.x = r2(clamp(Math.min(sleep.p.x, p.x), 0, 99));
        f.y = r2(clamp(Math.min(sleep.p.y, p.y), 0, 99));
        f.w = r2(Math.max(0.5, Math.abs(dx)));
        f.h = r2(Math.max(0.5, Math.abs(dy)));
      }
      tekenVeld(sleep.k);
    });
    const los = () => {
      if (!sleep) return;
      const f = staat.velden[sleep.k];
      if (sleep.soort === 'nieuw') {
        // Een klik zonder slepen: een vakje van normale grootte.
        const v = staat.verhouding || 1.414;
        if (f.w < 1.2 && f.h < 1.2) {
          if (f.soort === 'kruis') { f.w = 2.4; f.h = r2(2.4 / v); } else if (f.soort === 'open') { f.w = 60; f.h = 8; } else { f.w = 14; f.h = 2.6; }
          f.x = r2(clamp(f.x - (f.soort === 'kruis' ? f.w / 2 : 0), 0, 100 - f.w));
          f.y = r2(clamp(f.y - f.h / 2, 0, 100 - f.h));
        }
        if (f.soort === 'kruis') f.groep = groepBij(f);
        teken();
        kies(sleep.k, true);
      }
      sleep = null;
    };
    vel.addEventListener('pointerup', los);
    vel.addEventListener('pointercancel', los);
    document.addEventListener('keydown', e => {
      if (box.classList.contains('hidden') || staat.sel === null || !['Delete', 'Backspace'].includes(e.key) || e.target.matches('input, textarea, select')) return;
      e.preventDefault();
      weg(staat.sel);
    });
    $('be-rijen').addEventListener('input', e => leesRij(e.target));
    $('be-rijen').addEventListener('change', e => leesRij(e.target, true));
    $('be-rijen').addEventListener('focusin', e => { const r = e.target.closest('.pf-be-rij'); if (r) kies(Number(r.dataset.k)); });
    $('be-rijen').addEventListener('click', e => {
      const r = e.target.closest('.pf-be-rij');
      if (!r) return;
      if (e.target.closest('.weg')) weg(Number(r.dataset.k));
      else kies(Number(r.dataset.k));
    });
    $('be-annuleer').addEventListener('click', () => sluit(null));
    $('be-klaar').addEventListener('click', () => sluit(sorteer(staat.velden)));
    $('be-zoek').addEventListener('click', async () => {
      if (staat.velden.length && !await Ui.vraag('De vakjes die er nu staan, worden vervangen door wat LANcelot vindt. Doorgaan?')) return;
      const img = $('be-img');
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      staat.velden = zoekVakjes(c);
      staat.sel = null;
      teken();
      if (!staat.velden.length) Ui.melding('LANcelot vond geen puntjes of lijntjes op dit blad. Sleep zelf de vakjes.');
    });
    $('be-ai').addEventListener('click', async () => {
      if (!staat.velden.length) return ($('be-error').textContent = 'Zet eerst vakjes op het blad.');
      $('be-error').textContent = '';
      $('be-ai').disabled = true;
      $('be-busy').textContent = 'De AI zoekt de antwoorden… dit duurt meestal 20 tot 60 seconden.';
      try {
        const b = { beeld: staat.beeld, velden: staat.velden };
        const raw = await staat.opts.ai([b]);
        const n = zetSleutel([b], raw);
        staat.velden = b.velden;
        teken();
        $('be-busy').textContent = `${n} antwoorden ingevuld. Kijk ze na: de AI kan zich vergissen.`;
      } catch (err) {
        $('be-busy').textContent = '';
        $('be-error').textContent = err.message;
      }
      $('be-ai').disabled = false;
    });
    $('be-copy').addEventListener('click', async () => {
      if (!staat.velden.length) return ($('be-error').textContent = 'Zet eerst vakjes op het blad.');
      const b = { beeld: staat.beeld, velden: staat.velden };
      await kopieer(aiPrompt([b], 1, staat.opts.niveau));
      const g = await genummerd(b, 1);
      download(g.url, `blad-${staat.opts.nr || 1}-vakjes.jpg`);
      $('be-copy-box').classList.remove('hidden');
      $('be-antwoord').focus();
    });
    $('be-antwoord').addEventListener('paste', () => setTimeout(() => {
      try {
        const b = { beeld: staat.beeld, velden: staat.velden };
        const n = zetSleutel([b], $('be-antwoord').value);
        staat.velden = b.velden;
        $('be-antwoord').value = '';
        $('be-copy-box').classList.add('hidden');
        $('be-error').textContent = '';
        $('be-busy').textContent = `${n} antwoorden ingevuld. Kijk ze na: de AI kan zich vergissen.`;
        teken();
      } catch (err) { $('be-error').textContent = err.message; }
    }, 0));
  }

  async function kopieer(tekst) {
    try { await navigator.clipboard.writeText(tekst); } catch {
      const t = document.createElement('textarea');
      t.value = tekst;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
  }
  function download(url, naam) {
    const a = document.createElement('a');
    a.href = url;
    a.download = naam;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Een nieuw hokje vlak naast een ander hokje hoort bij dezelfde vraag.
  function groepBij(f) {
    let best = null;
    for (const g of staat.velden) {
      if (g === f || g.soort !== 'kruis') continue;
      const d = Math.hypot(g.x - f.x, (g.y - f.y) * 1.414);
      if (d < 14 && (!best || d < best.d)) best = { d, groep: g.groep };
    }
    if (best) return best.groep;
    return Math.max(0, ...staat.velden.filter(g => g !== f && g.soort === 'kruis').map(g => g.groep || 1)) + 1;
  }

  const SOORT = { tekst: '✏️ antwoord', kruis: '☐ hokje', kies: '▾ keuzelijst', open: '💬 open' };
  function rijHtml(f, k) {
    const s = `<select class="be-s" aria-label="Soort">${Object.entries(SOORT).map(([v, l]) => `<option value="${v}"${f.soort === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    let antw;
    if (f.soort === 'kruis') antw = `<span class="pf-be-kruis"><label><input type="checkbox" class="be-a"${f.antwoord ? ' checked' : ''}> aankruisen</label><label>groep <input class="be-g" type="number" min="1" max="99" value="${f.groep || 1}"></label></span>`;
    else if (f.soort === 'kies') antw = `<span class="pf-be-kies"><input class="be-o" value="${esc((f.opties || []).join(' / '))}" placeholder="keuzes: groter / kleiner / gelijk"><select class="be-a" aria-label="Juiste keuze"><option value="">juist?</option>${(f.opties || []).map(o => `<option${o === f.antwoord ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></span>`;
    else antw = `<input class="be-a" value="${esc(f.antwoord || '')}" placeholder="${f.soort === 'open' ? 'modelantwoord (voor jou)' : 'bijv. 1600|1 600'}">`;
    return `<div class="pf-be-rij${staat.sel === k ? ' on' : ''}${leegVeld(f) ? ' zonder' : ''}" data-k="${k}"><b>${k + 1}</b>${s}${antw}
      <input class="be-e" value="${esc(f.eenheid || '')}"${f.soort === 'tekst' ? '' : ' disabled'} aria-label="Eenheid"><input class="be-p" type="number" min="0" max="100" step="0.5" value="${f.punten ?? 1}" aria-label="Punten"><button type="button" class="secondary small-btn weg" title="Vakje weghalen">✕</button></div>`;
  }

  const leegVeld = f => (f.soort === 'tekst' && !String(f.antwoord || '').trim()) || (f.soort === 'kies' && (!(f.opties || []).includes(f.antwoord) || f.opties.length < 2));
  function veldHtml(f, k) {
    const leeg = leegVeld(f);
    const tekst = f.soort === 'kruis' ? (f.antwoord ? '✗' : '') : f.soort === 'open' ? '' : f.antwoord ? `${f.soort === 'kies' ? '▾ ' : ''}${String(f.antwoord).split('|')[0]}` : '';
    return `<div class="pf-be-veld ${f.soort}${staat.sel === k ? ' on' : ''}${leeg ? ' zonder' : ''}" data-k="${k}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%"><span class="nr">${k + 1}${f.soort === 'kruis' ? `·${f.groep || 1}` : ''}</span><span class="t">${esc(tekst)}</span><i class="greep"></i></div>`;
  }

  function teken() {
    box.querySelector('#be-velden').innerHTML = staat.velden.map(veldHtml).join('');
    box.querySelector('#be-rijen').innerHTML = staat.velden.length ? staat.velden.map(rijHtml).join('') : '<p class="muted small">Nog geen vakjes. Sleep op het blad om er een te maken.</p>';
    titel();
  }
  function titel() {
    const open = staat.velden.filter(leegVeld).length;
    box.querySelector('#be-titel').textContent = `${staat.opts.titel || 'Vakjes op het blad'} · ${staat.velden.length} vakjes${open ? ` · ${open} zonder antwoord` : ''}`;
  }
  function tekenVeld(k) {
    const el = box.querySelector(`.pf-be-veld[data-k="${k}"]`);
    const f = staat.velden[k];
    if (el) Object.assign(el.style, { left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` });
  }
  function kies(k, focus) {
    staat.sel = k;
    for (const el of box.querySelectorAll('.pf-be-veld, .pf-be-rij')) el.classList.toggle('on', Number(el.dataset.k) === k);
    let rij = box.querySelector(`.pf-be-rij[data-k="${k}"]`);
    if (!rij && staat.velden[k]) { teken(); rij = box.querySelector(`.pf-be-rij[data-k="${k}"]`); }
    if (rij) {
      rij.scrollIntoView({ block: 'nearest' });
      if (focus) { const a = rij.querySelector('input.be-a:not([type=checkbox])'); if (a) a.focus(); }
    }
  }
  function weg(k) {
    staat.velden.splice(k, 1);
    staat.sel = null;
    teken();
  }
  function leesRij(el, opnieuw) {
    const rij = el.closest('.pf-be-rij');
    if (!rij || !rij.isConnected) return;
    const k = Number(rij.dataset.k);
    const f = staat.velden[k];
    if (el.classList.contains('be-s')) {
      f.soort = el.value;
      if (f.soort === 'kruis') { f.antwoord = false; f.groep = groepBij(f); f.punten = 0; delete f.eenheid; } else if (typeof f.antwoord === 'boolean') delete f.antwoord;
      if (f.soort === 'kies' && !f.opties) f.opties = [];
      if (f.soort === 'kruis') { const v = staat.verhouding || 1.414; f.h = r2(Math.min(f.h, 3)); f.w = r2(f.h * v); }
      teken();
      kies(k);
      return;
    }
    if (el.classList.contains('be-a')) {
      if (f.soort === 'kruis') { f.antwoord = el.checked; f.punten = el.checked ? Math.max(1, f.punten || 0) : 0; rij.querySelector('.be-p').value = f.punten; } else f.antwoord = el.value;
    }
    if (el.classList.contains('be-o')) {
      f.opties = [...new Set(el.value.split('/').map(o => o.trim()).filter(Boolean))].slice(0, 8);
      // Later vervangen: tijdens het vervangen verliest het vakje de focus en komt er nog een change.
      if (opnieuw) setTimeout(() => { if (rij.isConnected) { rij.outerHTML = rijHtml(f, k); titel(); } }, 0);
      return;
    }
    if (el.classList.contains('be-g')) f.groep = Math.max(1, Math.round(Number(el.value)) || 1);
    if (el.classList.contains('be-e')) f.eenheid = el.value.trim();
    if (el.classList.contains('be-p')) f.punten = Math.max(0, Number(String(el.value).replace(',', '.')) || 0);
    const veld = box.querySelector(`.pf-be-veld[data-k="${k}"]`);
    if (veld) veld.outerHTML = veldHtml(f, k);
    rij.classList.toggle('zonder', leegVeld(f));
    titel();
  }

  function sluit(velden) {
    box.classList.add('hidden');
    const r = staat.klaar;
    staat.klaar = null;
    if (r) r(velden);
  }

  // blad: { beeld, verhouding, velden }. opts: { titel, nr, niveau, ai(bladen) -> Promise<antwoord van de AI> }
  // Geeft de nieuwe vakjes, of null bij Annuleren.
  function bewerk(b, opts = {}) {
    if (!box) maakBox();
    if (staat && staat.klaar) sluit(null);
    staat = { velden: (b.velden || []).map(f => ({ ...f })), sel: null, beeld: b.beeld, verhouding: b.verhouding, opts };
    box.querySelector('#be-img').src = b.beeld;
    box.querySelector('#be-vel').style.aspectRatio = String(1 / (b.verhouding || 1.414));
    box.querySelector('#be-ai').classList.toggle('hidden', !opts.ai);
    box.querySelector('#be-error').textContent = '';
    box.querySelector('#be-busy').textContent = '';
    box.querySelector('#be-copy-box').classList.add('hidden');
    teken();
    box.classList.remove('hidden');
    return new Promise(resolve => { staat.klaar = resolve; });
  }

  return { uit, zoekVakjes, sorteer, genummerd, aiPrompt, zetSleutel, bewerk, download, kopieer, leegVeld };
})();
