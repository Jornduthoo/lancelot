// Een blad uit je eigen toets-pdf: de pagina zoals hij is, met invulvakjes erop.
// PfBlad.uit(bron) maakt van een pdf (of foto) bladen: elke pagina een klein webp-beeld, met de vakjes die LANcelot zelf vindt
// (puntjes, lijntjes en lege hokjes waar iets ingevuld moet worden). PfBlad.bewerk(blad) opent het blad om vakjes
// te verschuiven, bij te maken en de antwoorden in te vullen. PfBlad.aiPrompt en PfBlad.genummerd helpen de AI de sleutel te maken.
// PDF.js laadt pas als er echt een pdf getekend wordt (public/vendor/pdfjs).
const PfBlad = (() => {
  const ROOSTER = { kol: 8, rij: 4 }; // een nieuw rekenrooster: zoveel hokjes breed en hoog
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
    const lijst = bladen.map((b, i) => `Blad ${i + 1}: ${b.velden.map(f => `${nr++}${f.soort === 'kruis' ? ' (hokje)' : f.soort === 'open' ? ' (open)' : f.soort === 'kies' ? ' (keuzelijst)' : f.soort === 'teken' ? ' (tekenvak: zet in antwoord waar de leerkracht op let)' : f.soort === 'luister' || f.soort === 'vlak' || f.soort === 'notitie' || f.soort === 'plek' || f.soort === 'lijn' || f.soort === 'klad' || f.soort === 'puntlijn' || f.soort === 'cirkel' || f.soort === 'veelhoek' ? ' (geen antwoord: sla over)' : f.soort === 'breuk' ? ' (breuk, bv. 3/4)' : f.soort === 'sleep' ? ' (sleepwoord)' : f.soort === 'rooster' ? ' (rekenrooster: zet in antwoord de uitkomst van de bewerking, de leerkracht verbetert)' : ''}`).join(', ')}`).join('\n');
    return `Je bent een ervaren leerkracht in ${Ui.aiKader().waar}${niveau ? ` (${niveau})` : ''}. Op de bijgevoegde afbeeldingen staan de bladen van een toets.
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
- Vraagt de opdracht om het antwoord zo eenvoudig mogelijk te schrijven (bv. "vereenvoudig", "zo eenvoudig mogelijk"), zet dan "vereenvoudigd": true.
- "punten": zoals op de toets staat. Staat er niets, geef dan 1. Een hokje dat niet aangekruist moet worden: 0.
- Is een kader geen plek om iets in te vullen (per ongeluk gevonden), geef dan "soort": "weg".

Geef je antwoord als één codeblok met JSON (\`\`\`json … \`\`\`), zonder uitleg ervoor of erna, in dit formaat:
{ "velden": [ { "nr": ${start}, "soort": "tekst", "antwoord": "1600", "eenheid": "cm²", "punten": 1 }, { "nr": ${start + 1}, "soort": "kruis", "antwoord": true, "groep": 1, "punten": 1 } ] }`;
  }

  // Het antwoord van de AI (tekst of al JSON) in de vakjes zetten. Geeft het aantal ingevulde vakjes.
  function zetSleutel(bladen, data, start = 1) {
    let lijst = data;
    if (typeof data === 'string') {
      // Zelfde opkuis als overal (ChatGPT, Claude, Gemini): backslashes, &#x20;, codeblokken, [cite: ...].
      try { lijst = window.AiJson.extract(data, 'verbetersleutel', d => Array.isArray(d.velden)); } catch { throw new Error('Dit is geen verbetersleutel. Kopieer het hele antwoord van de chatbot.'); }
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
      if (['luister', 'vlak', 'notitie', 'plek', 'lijn', 'klad', 'puntlijn', 'cirkel', 'veelhoek'].includes(f.soort)) continue;
      if (f.soort === 'breuk' || f.soort === 'sleep') {
        if (r.antwoord) { f.antwoord = String(r.antwoord).slice(0, 300); n++; b.gewijzigd = true; }
        if (f.soort === 'breuk' && r.vereenvoudigd === true) f.vereenvoudigd = true;
        continue;
      }
      if (f.soort === 'teken' || f.soort === 'rooster') {
        if (r.antwoord) { f.antwoord = String(r.antwoord).slice(0, 1000); n++; b.gewijzigd = true; }
        continue;
      }
      if (r.soort === 'weg') { f.weg = true; continue; }
      if (['tekst', 'kruis', 'kies', 'open'].includes(r.soort)) f.soort = r.soort;
      if (f.soort === 'kruis') {
        f.antwoord = r.antwoord === true || /^(true|ja|x)$/i.test(String(r.antwoord));
        f.groep = Math.max(1, Math.round(Number(r.groep)) || 1);
      } else if (r.antwoord !== undefined && r.antwoord !== null) f.antwoord = String(r.antwoord).slice(0, 1000);
      if (f.soort === 'kies') f.opties = Array.isArray(r.opties) ? r.opties.map(o => String(o).slice(0, 80)).filter(Boolean).slice(0, 8) : f.opties || [];
      if (r.eenheid && f.soort === 'tekst') f.eenheid = String(r.eenheid).slice(0, 20); else delete f.eenheid;
      if (f.soort === 'tekst' && r.vereenvoudigd === true) f.vereenvoudigd = true;
      const p = Number(String(r.punten ?? '').replace(',', '.'));
      // Vakjes die samen op punten staan, houden de punten van hun groepje.
      if (r.punten !== undefined && Number.isFinite(p) && p >= 0 && !f.samen) f.punten = Math.min(100, Math.round(p * 2) / 2);
      n++;
      b.gewijzigd = true;
    }
    for (const b of bladen) b.velden = b.velden.filter(f => !f.weg);
    return n;
  }

  // ---------- Het blad bewerken ----------
  // Zo eenvoudig mogelijk: kies rechts een stuk, sleep het op het blad (of klik), en vul in het venstertje de opties in.
  let box = null;
  let staat = null; // { velden, sel, tool, aantal, klaar, opts, beeld, verhouding }
  // De gereedschapskist: [stuk, icoon, naam, uitleg]. mk, ak en jf maken een groepje bolletjes of hokjes.
  const KIST = [
    ['Aanwijzen', [['wijs', '👆', 'Aanwijzen', 'Klikken, schuiven, weghalen']]],
    ['Typen', [['tekst', '✏️', 'Kort antwoord', 'Een woord of getal'], ['breuk', '➗', 'Breuk', 'Teller boven, noemer onder'], ['rooster', '🧮', 'Rekenrooster', 'Hokjes om uit te rekenen'], ['kies', '▾', 'Keuzelijstje', 'Kiezen uit een lijstje'],
      ['sleep', '🧲', 'Sleepwoord', 'Een woord in het vak slepen'], ['open', '💬', 'Open antwoord', 'Een paar zinnen schrijven']]],
    ['Aanklikken', [['mk', '🔘', 'Meerkeuze', 'Bolletjes, één is juist'], ['ak', '☑️', 'Aankruisen', 'Hokjes, meer mag juist zijn'], ['jf', '⚖️', 'Juist of fout', 'Twee bolletjes: J en F'], ['plek', '📍', 'Aanduiden', 'Een plek aanklikken op een prent'], ['lijn', '↗️', 'Verbinden', 'Een lijn naar de juiste plek']]],
    ['Maken', [['teken', '🎨', 'Tekenvak', 'Tekenen op het blad'], ['puntlijn', '📐', 'Lijnen tussen punten', 'Van punt naar punt'], ['cirkel', '⭕', 'Cirkel', 'Met middelpunt en straal'], ['veelhoek', '🔷', 'Veelhoek', 'Hoekpunten op stippen'], ['klad', '📝', 'Kladruimte', 'Telt niet mee'], ['luister', '🎧', 'Luisterknop', 'Uitleg om te beluisteren']]],
    ['Op het blad', [['vlak', '⬜', 'Vlak', 'Verbergt iets op het blad'], ['notitie', '🗒️', 'Notitie', 'Jouw tekst op het blad']]],
  ];
  const GROEP_TOOL = new Set(['mk', 'ak', 'jf']);
  const NAAM = Object.fromEntries(KIST.flatMap(([, l]) => l.map(([v, ic, naam]) => [v, `${ic} ${naam}`])));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function maakBox() {
    box = document.createElement('div');
    box.className = 'ob-modal hidden';
    box.id = 'blad-edit';
    box.innerHTML = `<div class="ob-modal-box pf-be">
      <div class="bar"><h2 id="be-titel">Vakjes op het blad</h2>
        <div class="actions"><button class="secondary" id="be-annuleer">Annuleren</button><button class="gold" id="be-klaar">Klaar</button></div></div>
      <p class="pf-be-stappen"><b>1</b> Kies rechts een stuk. <b>2</b> Sleep het op het blad, of klik. <b>3</b> Vul de opties in. <span class="muted">Met 👆 Aanwijzen (of Esc) klik je een vakje aan: verschuiven, kopiëren (Ctrl+C, Ctrl+V) of weghalen (Delete). Dubbelklik voor de opties.</span></p>
      <p class="pf-be-koppel hidden" id="be-koppel">🔗 <span>Klik de vakjes die samen één vraag zijn. Alleen als ze allemaal juist zijn, krijgt de leerling de punten.</span> <b id="be-koppel-n"></b> <button type="button" class="gold small-btn" id="be-koppel-klaar">Klaar</button></p>
      <p class="error" id="be-error"></p><span class="muted small" id="be-busy"></span>
      <div class="pf-be-copy hidden" id="be-copy-box">
        <p class="small">De prompt is gekopieerd en de bladen met genummerde vakjes worden gedownload. Plak de prompt in een chatbot, voeg die bladen toe en plak het antwoord hier:</p>
        <textarea id="be-antwoord" rows="3" placeholder="Plak hier het hele antwoord…"></textarea>
      </div>
      <div class="pf-be-grid">
        <div class="pf-be-vlak"><div class="pf-blad-vel pf-be-vel" id="be-vel"><img id="be-img" alt="" draggable="false"><div id="be-velden"></div><svg class="pf-lijnen pf-be-trek hidden" viewBox="0 0 100 100" preserveAspectRatio="none"><line id="be-lijn" vector-effect="non-scaling-stroke"/></svg><i class="pf-be-kader hidden" id="be-kader"></i></div></div>
        <div class="pf-be-zij">
          <div class="pf-be-kist" role="radiogroup" aria-label="Gereedschap">
            ${KIST.map(([kop, lijst]) => `<div class="pf-be-groep"><b>${kop}</b><div>${lijst.map(([v, ic, naam, uitleg]) => `<button type="button" class="pf-be-tool${v === 'wijs' ? ' on' : ''}" data-tool="${v}" role="radio" aria-checked="${v === 'wijs'}"><span class="ic">${ic}</span><span><strong>${naam}</strong><small>${uitleg}</small></span></button>`).join('')}</div></div>`).join('')}
            <label class="pf-be-aantal hidden">Aantal <button type="button" class="secondary small-btn" data-aantal="-1">−</button><b id="be-aantal">4</b><button type="button" class="secondary small-btn" data-aantal="1">+</button></label>
          </div>
          <div class="pf-be-hulp">
            <button class="secondary small-btn" id="be-zoek">🔍 Zoek vakjes opnieuw</button>
            <button class="secondary small-btn" id="be-ai">✨ Antwoorden met AI</button>
            <button class="secondary small-btn" id="be-copy">📋 Antwoorden via een chatbot</button>
            <button class="secondary small-btn" id="be-schaal">📏 Schaal van het blad</button>
          </div>
          <details class="pf-be-lijst-d"><summary>📋 Alle vakjes als lijst</summary>
            <div class="pf-be-lijst"><div class="pf-be-kop"><span>#</span><span>Soort</span><span>Juist antwoord</span><span>Eenheid</span><span>Ptn</span><span></span></div><div id="be-rijen"></div></div>
          </details>
          <label class="pf-be-woorden hidden">🧲 Extra sleepwoorden (foute keuzes, gescheiden door /)<input id="be-woorden" placeholder="bijv. struik / bloem"></label>
        </div>
      </div>
      <div class="pf-be-venster hidden" id="be-venster"><div class="pf-be-venster-box" role="dialog" aria-modal="true">
        <h3 id="bv-kop"></h3><div id="bv-inhoud"></div>
        <div class="bar"><button type="button" class="secondary" id="bv-weg">🗑 Weghalen</button><button type="button" class="gold" id="bv-ok">Klaar</button></div>
      </div></div>
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
    box.querySelector('.pf-be-kist').addEventListener('click', e => {
      const t = e.target.closest('.pf-be-tool');
      const a = e.target.closest('[data-aantal]');
      if (a) {
        staat.aantal = clamp(staat.aantal + Number(a.dataset.aantal), 2, 8);
        $('be-aantal').textContent = staat.aantal;
      }
      if (t) kiesTool(t.dataset.tool);
    });
    vel.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      vel.setPointerCapture(e.pointerId);
      const p = pct(e);
      const el = e.target.closest('.pf-be-veld');
      staat.opVeld = el ? Number(el.dataset.k) : null;
      if (staat.koppel) {
        // Samen op punten: een klik zet een vakje erbij of haalt het eruit.
        if (el) koppelKlik(Number(el.dataset.k));
        return;
      }
      if (el) {
        const k = Number(el.dataset.k);
        kies(k);
        const f = staat.velden[k];
        sleep = { k, soort: e.target.classList.contains('greep') ? 'groot' : 'schuif', p, f0: { ...f }, bewogen: false };
      } else if (staat.tool === 'wijs') {
        kies(null);
      } else if (staat.tool === 'lijn' || staat.tool === 'ijk') {
        sleep = { soort: staat.tool, p };
      } else if (GROEP_TOOL.has(staat.tool)) {
        sleep = { soort: 'groep', p, r: { x: p.x, y: p.y, w: 0, h: 0 } };
      } else {
        const soort = staat.tool;
        const f = { x: r2(p.x), y: r2(p.y), w: 0.5, h: 0.5, soort, punten: ['luister', 'vlak', 'notitie', 'klad'].includes(soort) ? 0 : 1 };
        if (soort === 'klad') f.vorm = 'typen';
        if (soort === 'puntlijn') f.pt = [];
        if (soort === 'cirkel') { f.cirkels = []; f.marge = 0.1; }
        if (soort === 'veelhoek') { f.kol = 6; f.rij = 5; }
        if (soort === 'vlak') f.kleur = '#ffffff';
        if (soort === 'kies') f.opties = [];
        if (soort === 'rooster') { f.kol = ROOSTER.kol; f.rij = ROOSTER.rij; }
        staat.velden.push(f);
        sleep = { k: staat.velden.length - 1, soort: 'nieuw', p, f0: { ...f } };
        teken();
        kies(sleep.k);
      }
    });
    vel.addEventListener('pointermove', e => {
      staat.muis = pct(e);
      if (!sleep) return;
      const p = pct(e);
      if (sleep.soort === 'lijn' || sleep.soort === 'ijk') {
        sleep.naar = p;
        const l = $('be-lijn');
        Object.entries({ x1: sleep.p.x, y1: sleep.p.y, x2: p.x, y2: p.y }).forEach(([a, w]) => l.setAttribute(a, w));
        l.parentNode.classList.remove('hidden');
        return;
      }
      const dx = p.x - sleep.p.x;
      const dy = p.y - sleep.p.y;
      if (sleep.soort === 'groep') {
        sleep.r = { x: clamp(Math.min(sleep.p.x, p.x), 0, 99), y: clamp(Math.min(sleep.p.y, p.y), 0, 99), w: Math.abs(dx), h: Math.abs(dy) };
        Object.assign($('be-kader').style, { left: `${sleep.r.x}%`, top: `${sleep.r.y}%`, width: `${sleep.r.w}%`, height: `${sleep.r.h}%` });
        $('be-kader').classList.remove('hidden');
        return;
      }
      const f = staat.velden[sleep.k];
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) sleep.bewogen = true;
      if (sleep.soort === 'schuif') {
        f.x = r2(clamp(sleep.f0.x + dx, 0, 100 - f.w));
        f.y = r2(clamp(sleep.f0.y + dy, 0, 100 - f.h));
      } else if (sleep.soort === 'groot') {
        f.w = r2(clamp(sleep.f0.w + dx, 0.6, 100 - f.x));
        f.h = r2(clamp(sleep.f0.h + dy, 0.4, 100 - f.y));
        // Een bolletje blijft rond.
        if (f.soort === 'kruis' && f.rond) f.h = r2(f.w / (staat.verhouding || 1.414));
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
      const s = sleep;
      sleep = null;
      if (s.soort === 'ijk') {
        // Ijken: de leerkracht trok een lijn waarvan ze de lengte kent.
        $('be-lijn').parentNode.classList.add('hidden');
        kiesTool('wijs');
        const v = staat.verhouding || 1.414;
        const len = s.naar ? Math.hypot(s.naar.x - s.p.x, (s.naar.y - s.p.y) * v) : 0;
        if (len < 2) { $('be-error').textContent = 'Trek een langere lijn, bv. langs een lijnstuk van 5 cm.'; return; }
        $('be-error').textContent = '';
        staat.ijk = len;
        return schaalVenster();
      }
      if (s.soort === 'lijn') {
        $('be-lijn').parentNode.classList.add('hidden');
        const v = staat.verhouding || 1.414;
        if (!s.naar || Math.hypot(s.naar.x - s.p.x, (s.naar.y - s.p.y) * v) < 2) {
          $('be-error').textContent = 'Verbinden: trek een lijn, van het begin naar de juiste plek.';
          return;
        }
        $('be-error').textContent = '';
        const w = 1.8;
        const h = r2(w / v);
        staat.velden.push({ soort: 'lijn', x: r2(clamp(s.p.x - w / 2, 0, 100 - w)), y: r2(clamp(s.p.y - h / 2, 0, 100 - h)), w, h, naar: { x: r2(clamp(s.naar.x, 0, 100)), y: r2(clamp(s.naar.y, 0, 100)) }, r: 3, punten: 1 });
        teken();
        kies(staat.velden.length - 1);
        return;
      }
      if (s.soort === 'groep') {
        $('be-kader').classList.add('hidden');
        const k = maakGroep(staat.tool, s.r);
        teken();
        kies(k);
        return venster(k);
      }
      const f = staat.velden[s.k];
      if (s.soort === 'nieuw') {
        // Een klik zonder slepen: een vakje van normale grootte.
        const v = staat.verhouding || 1.414;
        if (f.w < 1.2 && f.h < 1.2) {
          if (f.soort === 'luister') { f.w = 4; f.h = r2(4 / v); } else if (f.soort === 'rooster') { f.w = 3 * f.kol; f.h = r2((3 * f.rij) / v); } else if (f.soort === 'plek') { f.w = 40; f.h = 20; } else if (f.soort === 'open') { f.w = 60; f.h = 8; } else if (f.soort === 'teken') { f.w = 40; f.h = 16; } else if (f.soort === 'breuk') { f.w = 5; f.h = r2(8 / v); } else if (f.soort === 'vlak') { f.w = 20; f.h = 5; } else if (f.soort === 'notitie') { f.w = 40; f.h = 3; } else if (f.soort === 'klad') { f.w = 40; f.h = 12; } else if (f.soort === 'puntlijn' || f.soort === 'cirkel') { f.w = 40; f.h = r2(28 / v); } else if (f.soort === 'veelhoek') { f.w = 30; f.h = r2((30 / (f.kol - 1)) * (f.rij - 1) / v); } else { f.w = 14; f.h = 2.6; }
          f.x = r2(clamp(f.x - (f.soort === 'luister' ? f.w / 2 : 0), 0, 100 - f.w));
          f.y = r2(clamp(f.y - f.h / 2, 0, 100 - f.h));
        }
        teken();
        kies(s.k);
        venster(s.k);
      } else if (!s.bewogen && staat.tool !== 'wijs') venster(s.k);
    };
    vel.addEventListener('pointerleave', () => { staat.muis = null; });
    // Dubbelklik op een vakje: de opties.
    vel.addEventListener('dblclick', () => { if (staat.opVeld !== null && staat.velden[staat.opVeld]) venster(staat.opVeld); });
    vel.addEventListener('pointerup', los);
    vel.addEventListener('pointercancel', los);
    document.addEventListener('keydown', e => {
      if (box.classList.contains('hidden')) return;
      if (e.key === 'Escape' && !$('be-venster').classList.contains('hidden')) { e.preventDefault(); return sluitVenster(); }
      if (e.key === 'Escape' && staat.koppel) { e.preventDefault(); return stopKoppel(); }
      if (e.key === 'Escape') { e.preventDefault(); kies(null); return kiesTool('wijs'); }
      if (e.key === 'Enter' && staat.sel !== null && !e.target.matches('input, textarea, select, button') && $('be-venster').classList.contains('hidden')) { e.preventDefault(); return venster(staat.sel); }
      if ((e.ctrlKey || e.metaKey) && !e.target.matches('input, textarea, select') && $('be-venster').classList.contains('hidden')) {
        const t = e.key.toLowerCase();
        if (t === 'c' && staat.sel !== null && staat.velden[staat.sel]) { e.preventDefault(); return kopieerVeld(staat.sel); }
        if (t === 'v' && staat.klembord) { e.preventDefault(); return plak(); }
      }
      if (staat.sel === null || !['Delete', 'Backspace'].includes(e.key) || e.target.matches('input, textarea, select')) return;
      e.preventDefault();
      weg(staat.sel);
    });
    $('be-venster').addEventListener('click', e => { if (e.target.id === 'be-venster') sluitVenster(); });
    $('bv-ok').addEventListener('click', sluitVenster);
    $('bv-weg').addEventListener('click', () => {
      const f = staat.velden[staat.sel];
      if (!f) return sluitVenster();
      // Een groepje bolletjes of hokjes gaat samen weg.
      geefPuntenDoor(f);
      const blijft = staat.velden.filter(g => (f.soort === 'kruis' ? !(g.soort === 'kruis' && g.groep === f.groep) : g !== f));
      herNummer(staat.velden, staat.velden.map(g => blijft.indexOf(g)));
      staat.velden = f.soort === 'kruis' ? staat.velden.filter(g => !(g.soort === 'kruis' && g.groep === f.groep)) : staat.velden.filter(g => g !== f);
      ruimSamenOp();
      staat.sel = null;
      sluitVenster();
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
    $('be-koppel-klaar').addEventListener('click', stopKoppel);
    $('be-schaal').addEventListener('click', () => { staat.ijk = null; schaalVenster(); });
    $('be-annuleer').addEventListener('click', () => sluit(null));
    $('be-klaar').addEventListener('click', () => {
      const velden = sorteer(staat.velden);
      // De rekenregels (gevolgfout) wijzen naar vakjes: die krijgen hun nieuwe nummer.
      herNummer(velden, staat.velden.map(f => velden.indexOf(f)));
      // De extra sleepwoorden gaan mee als eigenschap van de lijst.
      velden.woorden = $('be-woorden').value.split('/').map(w => w.trim()).filter(Boolean);
      velden.schaal = staat.schaal;
      sluit(velden);
    });
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

  // Kopiëren en plakken: een vakje (of een groepje bolletjes) met alles erop en eraan.
  function kopieerVeld(k) {
    const f = staat.velden[k];
    staat.klembord = (f.soort === 'kruis' ? groepVan(f) : [f]).map(g => JSON.parse(JSON.stringify(g)));
  }
  function plak() {
    const stuk = staat.klembord;
    const x0 = Math.min(...stuk.map(g => g.x));
    const y0 = Math.min(...stuk.map(g => g.y));
    const w = Math.max(...stuk.map(g => g.x + g.w)) - x0;
    const h = Math.max(...stuk.map(g => g.y + g.h)) - y0;
    // Waar de muis op het blad staat, anders net onder het origineel.
    const doel = staat.muis || { x: x0 + 1.5, y: y0 + h + 1 };
    const dx = Math.min(100 - w, Math.max(0, doel.x)) - x0;
    const dy = Math.min(100 - h, Math.max(0, doel.y)) - y0;
    const groep = Math.max(0, ...staat.velden.filter(g => g.soort === 'kruis').map(g => g.groep || 1)) + 1;
    const start = staat.velden.length;
    for (const g of stuk) {
      const n = JSON.parse(JSON.stringify(g));
      n.x = r2(n.x + dx);
      n.y = r2(n.y + dy);
      if (n.soort === 'kruis') n.groep = groep;
      if (n.samen) { delete n.samen; n.punten = n.punten || 1; }
      if (n.naar) n.naar = { x: r2(Math.min(100, Math.max(0, n.naar.x + dx))), y: r2(Math.min(100, Math.max(0, n.naar.y + dy))) };
      staat.velden.push(n);
    }
    teken();
    kies(start);
  }

  function kiesTool(t) {
    staat.tool = t;
    for (const b of box.querySelectorAll('.pf-be-tool')) {
      b.classList.toggle('on', b.dataset.tool === t);
      b.setAttribute('aria-checked', String(b.dataset.tool === t));
    }
    box.querySelector('.pf-be-aantal').classList.toggle('hidden', t !== 'mk' && t !== 'ak');
    box.querySelector('#be-vel').classList.toggle('wijs', t === 'wijs');
  }

  // Een groepje bolletjes (meerkeuze, juist of fout) of hokjes (aankruisen) in het gesleepte kader r.
  // Breder dan hoog: naast elkaar, anders onder elkaar. Geeft het eerste vakje terug.
  function maakGroep(tool, r) {
    const v = staat.verhouding || 1.414;
    const n = tool === 'jf' ? 2 : staat.aantal;
    const groep = Math.max(0, ...staat.velden.filter(g => g.soort === 'kruis').map(g => g.groep || 1)) + 1;
    const plekken = [];
    if (r.w < 1.5 && r.h < 1.5) {
      // Een klik: bolletjes van gewone grootte naast elkaar.
      const s = 2.6;
      for (let i = 0; i < n; i++) plekken.push({ x: Math.min(100 - s, r.x + i * s * 1.9), y: Math.min(100 - s / v, r.y), s });
    } else if (r.w >= r.h * v) {
      const s = Math.min(r.h * v, (r.w / n) * 0.7);
      for (let i = 0; i < n; i++) plekken.push({ x: r.x + i * (r.w / n) + (r.w / n - s) / 2, y: r.y + (r.h - s / v) / 2, s });
    } else {
      const s = Math.min(r.w, ((r.h * v) / n) * 0.7);
      for (let i = 0; i < n; i++) plekken.push({ x: r.x + (r.w - s) / 2, y: r.y + i * (r.h / n) + (r.h / n - s / v) / 2, s });
    }
    const start = staat.velden.length;
    plekken.forEach((p, i) => {
      const f = { x: r2(p.x), y: r2(p.y), w: r2(p.s), h: r2(p.s / v), soort: 'kruis', groep, antwoord: false, punten: i ? 0 : 1 };
      if (tool !== 'ak') f.rond = true;
      if (tool === 'jf') f.label = i ? 'F' : 'J';
      staat.velden.push(f);
    });
    return start;
  }
  const groepVan = f => staat.velden.filter(g => g.soort === 'kruis' && g.groep === f.groep).sort((a, b) => a.y - b.y || a.x - b.x);

  // ---------- Het venstertje met de opties van één vakje ----------
  function venster(k) {
    const f = staat.velden[k];
    if (!f) return;
    staat.sel = k;
    const kop = box.querySelector('#bv-kop');
    const inh = box.querySelector('#bv-inhoud');
    const punten = (waarde, label = 'Punten') => `<label class="bv-punten">${label} <input type="number" class="bv-p" min="0" max="100" step="0.5" value="${waarde}"></label>`;
    const alts = String(f.antwoord || '').split('|').map(a => a.trim()).filter(Boolean);
    const lijst = (items, ph) => `<div class="bv-lijst">${items.map(a => `<div class="bv-rij"><input class="bv-alt" value="${esc(a)}"><button type="button" class="secondary small-btn bv-x" title="Weghalen">✕</button></div>`).join('')}
      <input class="bv-nieuw" placeholder="${ph}"></div>`;
    if (f.soort === 'kruis') {
      const g = groepVan(f);
      const rond = !!f.rond;
      const jf = g.length === 2 && g[0].label === 'J' && g[1].label === 'F';
      kop.textContent = jf ? NAAM.jf : rond ? NAAM.mk : NAAM.ak;
      inh.innerHTML = `<p class="bv-vraag">Klik ${rond ? 'het juiste antwoord' : 'alle juiste antwoorden'} aan:</p>
        <div class="bv-keuzes">${g.map((x, i) => `<button type="button" class="bv-keuze${rond ? ' rond' : ''}${x.antwoord ? ' on' : ''}" data-i="${i}">${esc(x.label || i + 1)}</button>`).join('')}</div>
        ${jf ? '' : `<div class="bv-opties">
          <span class="bv-aantal">Aantal <button type="button" class="secondary small-btn" data-n="-1">−</button><b>${g.length}</b><button type="button" class="secondary small-btn" data-n="1">+</button></span>
          <label class="inline check"><input type="checkbox" class="bv-letters"${g.every(x => x.label) ? ' checked' : ''}> Letters A, B, C…</label>
          <label class="inline check"><input type="checkbox" class="bv-meer"${rond ? '' : ' checked'}> Meer dan één juist (hokjes)</label></div>`}
        ${punten(g.reduce((s, x) => s + (x.punten || 0), 0) || 1)}`;
    } else if (f.soort === 'tekst') {
      kop.textContent = NAAM.tekst;
      inh.innerHTML = `<p class="bv-vraag">Juiste antwoord(en):</p>${lijst(alts.length ? alts : [''], '+ nog een juist antwoord')}
        ${eenheidHtml(f)}
        <div class="bv-checks"><label class="inline check"><input type="checkbox" data-vlag="hoofdletters"${f.hoofdletters ? ' checked' : ''}> Hoofdletters moeten kloppen</label>
          <label class="inline check"><input type="checkbox" data-vlag="leestekens"${f.leestekens ? ' checked' : ''}> Leestekens tellen mee ( . , ? ! )</label>
          <label class="inline check"><input type="checkbox" data-vlag="spaties"${f.spaties ? ' checked' : ''}> Spaties negeren</label>
          ${eenvoudigVink(f)}
          <label class="inline check"><input type="checkbox" data-vlag="tijd"${f.tijd ? ' checked' : ''}> Een tijd: 4 u 30 min, 270 min, 4,5 u en 4:30 zijn allemaal juist</label>
          <label class="inline check"><input type="checkbox" data-vlag="doorstreep"${f.doorstreep ? ' checked' : ''}> Mag leeg blijven of doorstreept worden (x, / of -)</label></div>
        ${margeHtml(f)}
        <label>Gevolgfout (mag leeg): een rekenregel met de antwoorden in andere vakjes <input class="bv-formule" value="${esc(f.formule || '')}" placeholder="bijv. {1} * {2} / 2"></label>
        <p class="muted small bv-formule-uitleg">${f.formule && PfKern.formuleFout(f.formule, staat.velden.length, k) ? `⚠ ${esc(PfKern.formuleFout(f.formule, staat.velden.length, k))}` : 'Rekende de leerling verder met een fout antwoord uit een vorig vakje, dan is dit vakje toch juist als het klopt met zijn eigen getallen. {1} is het antwoord in vakje 1.'}</p>
        <p class="muted small">Getallen tellen ook in een andere schrijfwijze: 0,5 = 0.5 = 1/2.</p>${vrijHtml(f)}${samenHtml(f, punten)}`;
    } else if (f.soort === 'breuk' || f.soort === 'sleep') {
      kop.textContent = NAAM[f.soort];
      inh.innerHTML = `<p class="bv-vraag">${f.soort === 'breuk' ? 'Juiste breuk(en), bijv. 3/4:' : 'Het juiste woord:'}</p>${lijst(alts.length ? alts : [''], f.soort === 'breuk' ? '+ nog een juiste breuk' : '+ nog een juist woord')}
        ${f.soort === 'sleep' ? `<label>Extra woorden om uit te kiezen (foute keuzes, gescheiden door /) <input class="bv-woorden" value="${esc(box.querySelector('#be-woorden').value)}"></label>` : ''}
        ${f.soort === 'breuk' ? `${eenheidHtml(f)}<div class="bv-checks"><label class="inline check"><input type="checkbox" data-vlag="geheel"${f.geheel ? ' checked' : ''}> Met een vakje voor het geheel (bv. 1 3/4)</label>${eenvoudigVink(f)}
          <label class="inline check"><input type="checkbox" data-vlag="precies"${f.precies ? ' checked' : ''}> Precies deze breuk (25/100 juist, 1/4 fout)</label></div>` : ''}${vrijHtml(f)}${samenHtml(f, punten)}`;
    } else if (f.soort === 'kies') {
      const opties = f.opties && f.opties.length ? f.opties : ['', ''];
      kop.textContent = NAAM.kies;
      inh.innerHTML = `<p class="bv-vraag">De keuzes. Duid de juiste aan:</p><div class="bv-lijst">${opties.map((o, i) => `<div class="bv-rij"><input type="radio" name="bv-juist" value="${i}"${o && o === f.antwoord ? ' checked' : ''} aria-label="Juist"><input class="bv-optie" value="${esc(o)}" placeholder="keuze ${i + 1}"><button type="button" class="secondary small-btn bv-x" title="Weghalen">✕</button></div>`).join('')}
        <button type="button" class="secondary small-btn bv-plus">+ keuze</button></div>${samenHtml(f, punten)}`;
    } else if (f.soort === 'rooster') {
      kop.textContent = NAAM.rooster;
      const maat = (cls, label, w) => `<span class="bv-aantal">${label} <button type="button" class="secondary small-btn" data-maat="${cls}" data-d="-1">−</button><b>${w}</b><button type="button" class="secondary small-btn" data-maat="${cls}" data-d="1">+</button></span>`;
      const kol = f.kol || ROOSTER.kol;
      const rij = f.rij || ROOSTER.rij;
      const keuze = (v, t) => `<label class="inline check"><input type="radio" name="bv-nakijk" value="${v}"${(f.nakijk || '') === v ? ' checked' : ''}> ${t}</label>`;
      inh.innerHTML = `<p class="bv-vraag">De leerling rekent de bewerking uit in de hokjes: één cijfer of teken per hokje.</p>
        <div class="bv-opties">${maat('kol', 'Hokjes breed', kol)}${maat('rij', 'Hokjes hoog', rij)}</div>
        <p class="bv-vraag">Wie verbetert?</p>
        <div class="bv-keuzelijst">${keuze('', 'Jij (zoals altijd)')}${keuze('uitkomst', 'De computer: alleen de uitkomst')}${keuze('rijen', 'De computer: punten per juiste rij')}${keuze('alles', 'De computer: alles moet juist zijn')}</div>
        ${f.nakijk === 'uitkomst' ? `<div class="bv-opties"><label>Uitkomst <input class="bv-uitkomst" value="${esc(f.uitkomst || '')}" placeholder="bijv. 39393,6"></label>
          <label>In rij <select class="bv-urij"><option value="">de onderste ingevulde rij</option>${Array.from({ length: rij }, (_, i) => `<option value="${i + 1}"${f.uitkomstRij === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label></div>` : ''}
        ${f.nakijk === 'rijen' || f.nakijk === 'alles' ? `<p class="small">Vul de juiste uitwerking in, zoals de leerling ze invult:</p>${PfPaper.roosterHtml(f.sleutel || '', kol, rij, true, 'bv-rooster-sleutel')}
          <p class="muted small">Een rij die verschoven staat, telt ook. Spaties, × en een punt of komma maken niet uit; de komma mag in een eigen hokje of bij een cijfer (7,).${f.nakijk === 'rijen' ? ' Een extra rij (bv. onthouden cijfers) mag.' : ''}</p>` : ''}
        ${f.nakijk ? '' : `<label>Uitwerking of uitkomst (alleen voor jou, je verbetert zelf)<textarea class="bv-model" rows="2">${esc(f.antwoord || '')}</textarea></label>`}${punten(f.punten ?? 1)}`;
      const grid = inh.querySelector('.bv-rooster-sleutel');
      if (grid) PfPaper.wireRooster(grid);
    } else if (f.soort === 'veelhoek') {
      kop.textContent = NAAM.veelhoek;
      const maat = (cls, label, w) => `<span class="bv-aantal">${label} <button type="button" class="secondary small-btn" data-maat="${cls}" data-d="-1">−</button><b>${w}</b><button type="button" class="secondary small-btn" data-maat="${cls}" data-d="1">+</button></span>`;
      const optie = x => `<option${f.figuur === x ? ' selected' : ''}>${x}</option>`;
      inh.innerHTML = `<p class="bv-vraag">De leerling tikt de hoekpunten aan op de stippen. De figuur sluit vanzelf. De computer herkent de soort.</p>
        <div class="bv-opties">${maat('kol', 'Stippen breed', f.kol || 6)}${maat('rij', 'Stippen hoog', f.rij || 5)}</div>
        <p class="muted small">Leg het vak precies op de stippen van je blad, of laat LANcelot de stippen tekenen.</p>
        <label>Welke figuur is juist? <select class="bv-figuur"><option value="">(kies)</option><optgroup label="Driehoeken">${PfKern.FIGUREN.filter(x => /driehoek/.test(x)).map(optie).join('')}</optgroup><optgroup label="Vierhoeken">${PfKern.FIGUREN.filter(x => !/driehoek|vijfhoek|zeshoek/.test(x)).map(optie).join('')}</optgroup><optgroup label="Meer hoeken">${optie('vijfhoek')}${optie('zeshoek')}</optgroup></select></label>
        <div><label class="inline check"><input type="checkbox" data-vlag="strikt"${f.strikt ? ' checked' : ''}> Precies deze soort (een vierkant is dan geen ruit of rechthoek)</label></div>
        <div><label class="inline check"><input type="checkbox" data-vlag="diagonalen"${f.diagonalen ? ' checked' : ''}> Teken eerst de diagonalen: de leerling tikt 2 lijnstukken die elkaar snijden, de vierhoek verschijnt dan vanzelf</label></div>
        <div><label>Korte uitleg in het vak (verdwijnt bij het eerste punt) <input class="bv-uitleg" maxlength="80" value="${esc(f.uitleg || '')}" placeholder="bv. Tik de hoekpunten rondom aan"></label></div>
        <p class="muted small">Tikt de leerling de hoekpunten niet rondom aan, dan zet LANcelot ze zelf rondom.</p>
        <p class="muted small">Zonder vinkje is elke figuur met die eigenschappen juist: een vierkant is ook een rechthoek, een ruit en een parallellogram.</p>${samenHtml(f, punten)}`;
    } else if (f.soort === 'klad') {
      kop.textContent = NAAM.klad;
      inh.innerHTML = `<p class="bv-vraag">Hier mag de leerling rekenen of schrijven. Het telt niet mee: jij verbetert niets.</p>
        <div class="bv-keuzelijst"><label class="inline check"><input type="radio" name="bv-vorm" value="typen"${f.vorm !== 'tekenen' ? ' checked' : ''}> Typen</label>
        <label class="inline check"><input type="radio" name="bv-vorm" value="tekenen"${f.vorm === 'tekenen' ? ' checked' : ''}> Tekenen</label></div>`;
    } else if (f.soort === 'puntlijn') {
      kop.textContent = NAAM.puntlijn;
      const pt = f.pt || [];
      const modus = staat.ptModus === 'lijn' && pt.length > 1 ? 'lijn' : 'zet';
      inh.innerHTML = `<div class="bv-keuzelijst"><label class="inline check"><input type="radio" name="bv-ptmodus" value="zet"${modus === 'zet' ? ' checked' : ''}> 1. Punten zetten: klik waar de punten op het blad staan (nog eens klikken haalt een punt weg)</label>
          <label class="inline check"><input type="radio" name="bv-ptmodus" value="lijn"${modus === 'lijn' ? ' checked' : ''}${pt.length > 1 ? '' : ' disabled'}> 2. Juiste lijnen: klik een punt en dan het andere punt</label></div>
        ${uitsnede(f, `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${f.doorPunt === undefined ? (f.lijnen || []).map(([a, b]) => (pt[a] && pt[b] ? `<line x1="${pt[a].x}" y1="${pt[a].y}" x2="${pt[b].x}" y2="${pt[b].y}" vector-effect="non-scaling-stroke"/>` : '')).join('') : ''}</svg>${pt.map((p, i) => `<i class="bv-pt${staat.ptStart === i ? ' on' : ''}${f.doorPunt === i ? ' door' : ''}" style="left:${p.x}%;top:${p.y}%"><b>${PfKern.puntNaam(i)}</b></i>`).join('')}`)}
        <div class="bv-opties"><label>Of: elke lijn gaat door punt <select class="bv-door"><option value="">(kies)</option>${pt.map((_, i) => `<option value="${i}"${f.doorPunt === i ? ' selected' : ''}>${PfKern.puntNaam(i)}</option>`).join('')}</select></label>
          ${f.doorPunt !== undefined ? `<label>Aantal lijnen <input type="number" class="bv-aantal-l" min="1" max="12" value="${f.aantal || 1}"></label>` : ''}</div>
        <p class="muted small">${f.doorPunt !== undefined ? 'Bv. een middellijn: elke lijn van een punt naar een ander punt door het middelpunt is juist.' : 'De richting en de volgorde maken niet uit. Een lijn te veel of te weinig is fout.'}</p>${samenHtml(f, punten)}`;
      const vak = inh.querySelector('.bv-vak');
      vak.addEventListener('click', e => puntKlik(f, vak, e));
    } else if (f.soort === 'cirkel') {
      kop.textContent = NAAM.cirkel;
      const c = f.cirkels || [];
      const schaal = staat.schaal || PfKern.SCHAAL;
      inh.innerHTML = `<p class="bv-vraag">Klik in het vak op het middelpunt van de juiste cirkel.</p>
        ${uitsnede(f, c.map(x => `<i class="pf-cirkel sleutel" style="left:${x.x}%;top:${x.y}%;width:${r2(((2 * x.r) / schaal / f.w) * 10000)}%"></i>`).join(''))}
        <div class="bv-cirkels">${c.map((x, i) => `<div class="bv-rij"><span>Cirkel ${i + 1}: straal</span><input type="number" class="bv-cr" data-i="${i}" min="0.1" max="50" step="0.1" value="${x.r}"><span>cm</span><button type="button" class="secondary small-btn bv-cx" data-i="${i}" title="Weghalen">✕</button></div>`).join('')}</div>
        <label>Marge op de straal (cm) <input type="number" class="bv-cmarge" min="0" max="5" step="0.05" value="${f.marge ?? 0.1}"></label>
        <p class="muted small">De leerling sleept vanuit het middelpunt en ziet de straal in cm. Het middelpunt mag een paar mm ernaast liggen. Klopt de grootte niet? Stel de schaal in met 📏 Schaal van het blad.</p>${samenHtml(f, punten)}`;
      const vak = inh.querySelector('.bv-vak');
      vak.addEventListener('click', e => {
        const r = vak.getBoundingClientRect();
        f.cirkels = [...c, { x: r2(((e.clientX - r.left) / r.width) * 100), y: r2(((e.clientY - r.top) / r.height) * 100), r: c.length ? c[c.length - 1].r : 2 }];
        bijwerken();
        venster(staat.velden.indexOf(f));
      });
    } else if (f.soort === 'open' || f.soort === 'teken') {
      kop.textContent = NAAM[f.soort];
      inh.innerHTML = `<label>${f.soort === 'open' ? 'Modelantwoord' : 'Waar let je op?'} (alleen voor jou, je verbetert zelf)<textarea class="bv-model" rows="3">${esc(f.antwoord || '')}</textarea></label>${punten(f.punten ?? 1)}`;
    } else if (f.soort === 'luister') {
      kop.textContent = NAAM.luister;
      inh.innerHTML = `<p class="bv-vraag">Neem je uitleg op of kies een geluidsbestand:</p><div class="pf-be-audio bv-audio"></div>
        <label>Of: tekst die LANcelot voorleest<textarea class="bv-tekst" rows="2">${esc(f.tekst || '')}</textarea></label>
        <label>Hoe vaak mag de leerling luisteren? <select class="bv-lm">${[[0, 'onbeperkt'], [2, '2 keer'], [1, '1 keer']].map(([n, t]) => `<option value="${n}"${(f.luisterMax || 0) === n ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
      if (typeof PfAudio !== 'undefined') PfAudio.knop(inh.querySelector('.bv-audio'), { waarde: f.audio || '', max: 90, grootte: 2000000, label: 'Opnemen', onChange: d => { if (d) f.audio = d; else delete f.audio; bijwerken(); } });
    } else if (f.soort === 'vlak') {
      kop.textContent = NAAM.vlak;
      inh.innerHTML = `<p class="bv-vraag">Kleur van het vlak:</p><div class="bv-kleuren">${Object.entries(KLEUR_NAAM).map(([c, n]) => `<button type="button" class="bv-kleur${f.kleur === c ? ' on' : ''}" data-kleur="${c}" style="background:${c}" title="${n}" aria-label="${n}"></button>`).join('')}</div>`;
    } else if (f.soort === 'plek') {
      const v = staat.verhouding || 1.414;
      const d = f.doel || { x: 50, y: 50, r: 12 };
      kop.textContent = NAAM.plek;
      inh.innerHTML = `<p class="bv-vraag">Klik op de juiste plek:</p>
        <div class="bv-plek" style="aspect-ratio:${r2(f.w / (f.h * v))}"><img src="${esc(staat.beeld)}" alt="" draggable="false" style="position:absolute;width:${r2((100 / f.w) * 100)}%;left:${r2((-f.x / f.w) * 100)}%;top:${r2((-f.y / f.h) * 100)}%;max-width:none">
          ${f.doel ? `<i class="pf-plek-doel" style="left:${d.x}%;top:${d.y}%;width:${2 * d.r}%"></i>` : ''}</div>
        <label>Hoe groot is de juiste plek? <input type="range" class="bv-r" min="3" max="50" value="${d.r}"></label>
        <p class="muted small">De leerling tikt in dit kader een plek aan. Binnen de groene cirkel is juist.</p>${samenHtml(f, punten)}`;
      const vak = inh.querySelector('.bv-plek');
      vak.addEventListener('click', e => {
        const r = vak.getBoundingClientRect();
        f.doel = { x: r2(((e.clientX - r.left) / r.width) * 100), y: r2(((e.clientY - r.top) / r.height) * 100), r: Number(inh.querySelector('.bv-r').value) };
        bijwerken();
        venster(staat.velden.indexOf(f));
      });
    } else if (f.soort === 'lijn') {
      kop.textContent = NAAM.lijn;
      inh.innerHTML = `<p class="bv-vraag">De leerling sleept een lijn van het bolletje naar de juiste plek (de groene cirkel).</p>
        <label>Hoe dicht moet het eindpunt liggen? <input type="range" class="bv-lr" min="1" max="10" step="0.5" value="${f.r || 3}"></label>
        <p class="muted small">Het bolletje kun je verschuiven. Juiste plek fout? Haal de lijn weg en trek ze opnieuw.</p>${samenHtml(f, punten)}`;
    } else if (f.soort === 'notitie') {
      kop.textContent = NAAM.notitie;
      inh.innerHTML = `<label>Tekst op het blad<textarea class="bv-tekst" rows="3">${esc(f.tekst || '')}</textarea></label>`;
    }
    box.querySelector('#bv-weg').classList.remove('hidden');
    box.querySelector('#be-venster').classList.remove('hidden');
    wireVenster(f);
    const eerste = inh.querySelector('.bv-alt, .bv-optie, textarea, .bv-keuze');
    if (eerste) eerste.focus();
  }

  function wireVenster(f) {
    const inh = box.querySelector('#bv-inhoud');
    const leesLijst = () => {
      f.antwoord = [...inh.querySelectorAll('.bv-alt')].map(i => i.value.trim()).filter(Boolean).join('|');
      bijwerken();
    };
    const leesOpties = () => {
      const rijen = [...inh.querySelectorAll('.bv-rij')];
      f.opties = [...new Set(rijen.map(r => r.querySelector('.bv-optie').value.trim()).filter(Boolean))].slice(0, 8);
      const juist = rijen.find(r => r.querySelector('input[type=radio]').checked);
      const a = juist && juist.querySelector('.bv-optie').value.trim();
      if (a) f.antwoord = a; else delete f.antwoord;
      bijwerken();
    };
    inh.oninput = e => {
      const t = e.target;
      if (t.classList.contains('bv-alt')) leesLijst();
      else if (t.classList.contains('bv-optie')) leesOpties();
      else if (t.classList.contains('bv-eenheid')) { f.eenheid = t.value.trim(); bijwerken(); }
      else if (t.classList.contains('bv-model')) { f.antwoord = t.value; bijwerken(); }
      else if (t.classList.contains('bv-tekst')) { f.tekst = t.value; bijwerken(); }
      else if (t.classList.contains('bv-uitleg')) { const u = t.value.trim(); if (u) f.uitleg = u; else delete f.uitleg; bijwerken(); }
      else if (t.classList.contains('bv-lm')) { const n = Number(t.value); if (n) f.luisterMax = n; else delete f.luisterMax; bijwerken(); }
      else if (t.classList.contains('bv-woorden')) box.querySelector('#be-woorden').value = t.value;
      else if (t.classList.contains('bv-r')) {
        if (!f.doel) f.doel = { x: 50, y: 50, r: 12 };
        f.doel.r = Number(t.value);
        const c = inh.querySelector('.bv-plek .pf-plek-doel');
        if (c) c.style.width = `${2 * f.doel.r}%`;
        bijwerken();
      }
      else if (t.classList.contains('bv-lr')) { f.r = Number(t.value); bijwerken(); }
      else if (t.classList.contains('pf-cel')) { f.sleutel = PfPaper.roosterWaarde(t.closest('.pf-rooster')); bijwerken(); }
      else if (t.classList.contains('bv-formule')) {
        f.formule = t.value.trim();
        if (!f.formule) delete f.formule;
        const fout = f.formule ? PfKern.formuleFout(f.formule, staat.velden.length, staat.velden.indexOf(f)) : '';
        const u = inh.querySelector('.bv-formule-uitleg');
        if (u && fout) u.textContent = `⚠ ${fout}`; else if (u) u.textContent = f.formule ? '✔' : '';
        bijwerken();
      }
      else if (t.classList.contains('bv-uitkomst')) { f.uitkomst = t.value.trim(); bijwerken(); }
      else if (t.classList.contains('bv-margew')) { f.marge = t.value; bijwerken(); }
      else if (t.classList.contains('bv-margep')) { f.margeProcent = t.value; bijwerken(); }
      else if (t.classList.contains('bv-van')) { f.van = t.value.trim(); bijwerken(); }
      else if (t.classList.contains('bv-tot')) { f.tot = t.value.trim(); bijwerken(); }
      else if (t.classList.contains('bv-cr')) { const c = f.cirkels[Number(t.dataset.i)]; if (c) { c.r = Math.max(0.1, Number(String(t.value).replace(',', '.')) || 0); bijwerken(); } }
      else if (t.classList.contains('bv-cmarge')) { f.marge = Math.max(0, Number(String(t.value).replace(',', '.')) || 0); bijwerken(); }
      else if (t.classList.contains('bv-aantal-l')) { f.aantal = Math.min(12, Math.max(1, Math.round(Number(t.value)) || 1)); bijwerken(); }
      else if (t.classList.contains('bv-p')) zetPunten(f, Math.max(0, Number(String(t.value).replace(',', '.')) || 0));
    };
    inh.onchange = e => {
      const t = e.target;
      if (t.dataset.vlag) { if (t.checked) f[t.dataset.vlag] = true; else delete f[t.dataset.vlag]; bijwerken(); }
      else if (t.name === 'bv-nakijk') { if (t.value) f.nakijk = t.value; else delete f.nakijk; bijwerken(); venster(staat.velden.indexOf(f)); }
      else if (t.classList.contains('bv-vrij')) { if (t.value) f.vrij = Number(t.value); else delete f.vrij; bijwerken(); }
      else if (t.classList.contains('bv-figuur')) { if (t.value) f.figuur = t.value; else delete f.figuur; bijwerken(); }
      else if (t.classList.contains('bv-urij')) { if (t.value) f.uitkomstRij = Number(t.value); else delete f.uitkomstRij; bijwerken(); }
      else if (t.name === 'bv-vorm') { f.vorm = t.value; bijwerken(); }
      else if (t.name === 'bv-ptmodus') { staat.ptModus = t.value; staat.ptStart = null; venster(staat.velden.indexOf(f)); }
      else if (t.classList.contains('bv-door')) {
        if (t.value === '') { delete f.doorPunt; delete f.aantal; } else { f.doorPunt = Number(t.value); f.aantal = f.aantal || 1; }
        bijwerken();
        venster(staat.velden.indexOf(f));
      } else if (t.classList.contains('bv-marge')) {
        for (const x of ['marge', 'margeProcent', 'van', 'tot']) delete f[x];
        if (t.value) f.margeSoort = t.value; else delete f.margeSoort;
        bijwerken();
        venster(staat.velden.indexOf(f));
      }
      else if (t.name === 'bv-juist') leesOpties();
      else if (t.classList.contains('bv-letters')) { groepVan(f).forEach((x, i) => { if (t.checked) x.label = 'ABCDEFGH'[i]; else delete x.label; }); bijwerken(); venster(staat.velden.indexOf(f)); }
      else if (t.classList.contains('bv-meer')) {
        for (const x of groepVan(f)) { if (t.checked) delete x.rond; else { x.rond = true; x.h = r2(x.w / (staat.verhouding || 1.414)); } }
        // Een bolletje: maar één juist antwoord.
        if (!t.checked) groepVan(f).filter(x => x.antwoord).slice(1).forEach(x => { x.antwoord = false; });
        bijwerken();
        venster(staat.velden.indexOf(f));
      }
    };
    inh.onkeydown = e => {
      if (e.key !== 'Enter' || !e.target.classList.contains('bv-nieuw')) return;
      e.preventDefault();
      nieuwAlt(e.target);
    };
    inh.onfocusout = e => { if (e.target.classList.contains('bv-nieuw') && e.target.value.trim()) nieuwAlt(e.target); };
    function nieuwAlt(input) {
      const w = input.value.trim();
      if (!w) return;
      f.antwoord = [...String(f.antwoord || '').split('|').map(a => a.trim()).filter(Boolean), w].join('|');
      bijwerken();
      venster(staat.velden.indexOf(f));
      const n = box.querySelector('#bv-inhoud .bv-nieuw');
      if (n) n.focus();
    }
    inh.onclick = e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.classList.contains('bv-koppel')) return startKoppel(f);
      if (t.classList.contains('bv-cx')) {
        f.cirkels.splice(Number(t.dataset.i), 1);
        bijwerken();
        return venster(staat.velden.indexOf(f));
      }
      if (t.classList.contains('bv-los')) {
        geefPuntenDoor(f);
        delete f.samen;
        f.punten = 1;
        ruimSamenOp();
        bijwerken();
        return venster(staat.velden.indexOf(f));
      }
      if (t.dataset.maat && f.soort === 'veelhoek') {
        const v = staat.verhouding || 1.414;
        const stap = f.w / Math.max(1, (f.kol || 6) - 1);
        f[t.dataset.maat] = Math.min(16, Math.max(2, (f[t.dataset.maat] || (t.dataset.maat === 'kol' ? 6 : 5)) + Number(t.dataset.d)));
        // De stippen blijven even ver uit elkaar, in een vierkant rooster.
        f.w = r2(Math.min(100 - f.x, stap * (f.kol - 1)));
        f.h = r2(Math.min(100 - f.y, ((f.w / (f.kol - 1)) * (f.rij - 1)) / v));
        bijwerken();
        return venster(staat.velden.indexOf(f));
      }
      if (t.dataset.maat) {
        const v = staat.verhouding || 1.414;
        const kol = f.kol || ROOSTER.kol;
        const cel = f.w / kol;
        const max = t.dataset.maat === 'kol' ? 20 : 12;
        f[t.dataset.maat] = Math.min(max, Math.max(2, (f[t.dataset.maat] || ROOSTER[t.dataset.maat]) + Number(t.dataset.d)));
        // De hokjes blijven vierkant en even groot.
        f.w = r2(Math.min(100 - f.x, cel * f.kol));
        f.h = r2(Math.min(100 - f.y, ((f.w / f.kol) * f.rij) / v));
        bijwerken();
        return venster(staat.velden.indexOf(f));
      }
      if (t.classList.contains('bv-x')) {
        t.closest('.bv-rij').remove();
        if (f.soort === 'kies') leesOpties(); else leesLijst();
      } else if (t.classList.contains('bv-plus')) {
        const i = inh.querySelectorAll('.bv-rij').length;
        t.insertAdjacentHTML('beforebegin', `<div class="bv-rij"><input type="radio" name="bv-juist" value="${i}" aria-label="Juist"><input class="bv-optie" placeholder="keuze ${i + 1}"><button type="button" class="secondary small-btn bv-x" title="Weghalen">✕</button></div>`);
        t.previousElementSibling.querySelector('.bv-optie').focus();
      } else if (t.classList.contains('bv-keuze')) {
        const g = groepVan(f);
        const x = g[Number(t.dataset.i)];
        if (f.rond) for (const y of g) y.antwoord = y === x ? !x.antwoord : false;
        else x.antwoord = !x.antwoord;
        zetPunten(f, Math.max(1, g.reduce((s, y) => s + (y.punten || 0), 0)));
        venster(staat.velden.indexOf(f));
      } else if (t.dataset.n) {
        const g = groepVan(f);
        if (Number(t.dataset.n) > 0 && g.length < 8) {
          const a = g[g.length - 1];
          const b = g[g.length - 2] || { x: a.x - a.w * 1.9, y: a.y };
          const nieuw = { ...a, x: r2(Math.min(100 - a.w, a.x + (a.x - b.x))), y: r2(Math.min(100 - a.h, a.y + (a.y - b.y))), antwoord: false, punten: 0 };
          if (a.label) nieuw.label = 'ABCDEFGH'[g.length];
          staat.velden.push(nieuw);
        } else if (Number(t.dataset.n) < 0 && g.length > 2) staat.velden.splice(staat.velden.indexOf(g[g.length - 1]), 1);
        bijwerken();
        venster(staat.velden.indexOf(f));
      } else if (t.dataset.kleur) {
        f.kleur = t.dataset.kleur;
        for (const b of inh.querySelectorAll('.bv-kleur')) b.classList.toggle('on', b === t);
        bijwerken();
      }
    };
  }

  // Het stukje blad onder een vakje, om er punten of cirkels op te klikken.
  function uitsnede(f, binnen) {
    const v = staat.verhouding || 1.414;
    return `<div class="bv-vak" style="aspect-ratio:${r2(f.w / (f.h * v))}"><img src="${esc(staat.beeld)}" alt="" draggable="false" style="position:absolute;width:${r2((100 / f.w) * 100)}%;left:${r2((-f.x / f.w) * 100)}%;top:${r2((-f.y / f.h) * 100)}%;max-width:none">${binnen}</div>`;
  }
  // Lijnen tussen punten: een punt zetten of weghalen, of een juiste lijn aan of uit.
  function puntKlik(f, vak, e) {
    const r = vak.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const pt = f.pt || (f.pt = []);
    let bij = -1;
    let bd = 16;
    pt.forEach((p, i) => { const d = Math.hypot(((p.x - x) / 100) * r.width, ((p.y - y) / 100) * r.height); if (d < bd) { bd = d; bij = i; } });
    if (staat.ptModus === 'lijn' && pt.length > 1) {
      if (bij < 0) return;
      if (staat.ptStart === null || staat.ptStart === undefined || staat.ptStart === bij) staat.ptStart = staat.ptStart === bij ? null : bij;
      else {
        const a = Math.min(staat.ptStart, bij);
        const b = Math.max(staat.ptStart, bij);
        const l = f.lijnen || [];
        f.lijnen = l.some(([c, d]) => c === a && d === b) ? l.filter(([c, d]) => !(c === a && d === b)) : [...l, [a, b]];
        staat.ptStart = null;
      }
    } else if (bij >= 0) {
      pt.splice(bij, 1);
      // De lijnen en het punt waar alles door gaat, schuiven mee.
      const n = i => (i > bij ? i - 1 : i);
      f.lijnen = (f.lijnen || []).filter(l => !l.includes(bij)).map(l => l.map(n));
      if (f.doorPunt === bij) { delete f.doorPunt; delete f.aantal; } else if (f.doorPunt !== undefined) f.doorPunt = n(f.doorPunt);
    } else if (pt.length < 26) pt.push({ x: r2(x), y: r2(y) });
    bijwerken();
    venster(staat.velden.indexOf(f));
  }
  // Marge bij een getal: precies, ± een getal, ± procent of van … tot ….
  function margeHtml(f) {
    const soort = f.margeSoort || (f.van !== undefined || f.tot !== undefined ? 'vantot' : f.margeProcent ? 'procent' : f.marge ? 'marge' : '');
    const opt = (v, t) => `<option value="${v}"${soort === v ? ' selected' : ''}>${t}</option>`;
    return `<div class="bv-opties"><label>Marge bij een getal <select class="bv-marge">${opt('', 'geen: precies dit getal')}${opt('marge', '± een getal')}${opt('procent', '± procent')}${opt('vantot', 'van … tot …')}</select></label>
      ${soort === 'marge' ? `<label>± <input type="number" class="bv-margew" min="0" step="any" value="${esc(f.marge ?? '')}" placeholder="bijv. 0,1"></label>` : ''}
      ${soort === 'procent' ? `<label>± <input type="number" class="bv-margep" min="0" max="100" step="any" value="${esc(f.margeProcent ?? '')}" placeholder="bijv. 5"> %</label>` : ''}
      ${soort === 'vantot' ? `<label>van <input class="bv-van" value="${esc(f.van ?? '')}" placeholder="bijv. 1700"></label><label>tot <input class="bv-tot" value="${esc(f.tot ?? '')}" placeholder="bijv. 2100"></label>` : ''}</div>`;
  }
  // De schaal van het blad: hoe breed is het in het echt? Of ijken met een lijn waarvan je de lengte kent.
  function schaalVenster() {
    staat.sel = null;
    const inh = box.querySelector('#bv-inhoud');
    box.querySelector('#bv-kop').textContent = '📏 Schaal van het blad';
    inh.innerHTML = `<label>Hoe breed is het blad in het echt? <span class="bv-rij"><input type="number" class="bv-schaal" min="3" max="300" step="0.1" value="${staat.schaal || PfKern.SCHAAL}"> cm</span></label>
      <p class="muted small">Een A4 is 21 cm breed. De lat van de leerling en de cirkels rekenen hiermee.</p>
      ${staat.ijk ? `<label>De lijn die je trok, is in het echt <span class="bv-rij"><input type="number" class="bv-ijkcm" min="0.1" max="300" step="0.1" placeholder="bijv. 5"> cm</span></label>` : '<button type="button" class="secondary small-btn bv-ijk">📏 Ijken: trek een lijn waarvan je de lengte kent</button>'}`;
    box.querySelector('#bv-weg').classList.add('hidden');
    box.querySelector('#be-venster').classList.remove('hidden');
    inh.oninput = e => {
      const t = e.target;
      const n = Number(String(t.value).replace(',', '.'));
      if (t.classList.contains('bv-schaal') && n >= 3 && n <= 300) staat.schaal = n;
      if (t.classList.contains('bv-ijkcm') && n > 0 && staat.ijk) {
        staat.schaal = r2((n * 100) / staat.ijk);
        inh.querySelector('.bv-schaal').value = staat.schaal;
      }
    };
    inh.onchange = null;
    inh.onkeydown = null;
    inh.onfocusout = null;
    inh.onclick = e => {
      if (!e.target.closest('.bv-ijk')) return;
      box.querySelector('#be-venster').classList.add('hidden');
      kiesTool('ijk');
      box.querySelector('#be-error').textContent = 'Trek op het blad een lijn waarvan je de lengte kent, bv. een lijnstuk van 5 cm.';
    };
    const i = inh.querySelector('.bv-ijkcm, .bv-schaal');
    if (i) i.focus();
  }

  // ---------- Eenheid, volgorde vrij, zo eenvoudig mogelijk en samen op punten ----------
  const eenheidHtml = f => `<label>Eenheid (mag leeg) <input class="bv-eenheid" value="${esc(f.eenheid || '')}" placeholder="bijv. cm"></label>
    <div><label class="inline check"><input type="checkbox" data-vlag="toonEenheid"${f.toonEenheid ? ' checked' : ''}> Toon de eenheid naast het vakje</label></div>`;
  // Volgorde vrij: vakjes met hetzelfde groepje mogen hun antwoorden in elke volgorde krijgen (bv. de delers van 12).
  const vrijHtml = f => `<label>Volgorde vrij <select class="bv-vrij"><option value="">nee</option>${[1, 2, 3, 4].map(n => `<option value="${n}"${f.vrij === n ? ' selected' : ''}>groepje ${n}</option>`).join('')}</select></label>
    <p class="muted small">Geef de vakjes waarvan de volgorde niet uitmaakt hetzelfde groepje. Elk juist antwoord mag dan in elk vakje van dat groepje staan. Twee keer hetzelfde antwoord telt maar één keer.</p>`;
  const eenvoudigVink = f => `<label class="inline check" title="Bij breuken: 3/4 is juist, 6/8 niet. Een onechte breuk (7/4) moet een gemengd getal zijn (1 3/4), tenzij je juiste antwoord zelf een onechte breuk is."><input type="checkbox" data-vlag="vereenvoudigd"${f.vereenvoudigd ? ' checked' : ''}> Zo eenvoudig mogelijk (3/4 juist, 6/8 fout)</label>`;
  const SAMEN_SOORT = new Set(['tekst', 'breuk', 'kies', 'sleep', 'plek', 'lijn', 'puntlijn', 'cirkel', 'veelhoek']);
  // De vakjes van een groepje, in de volgorde van het blad (zoals het in de lijst staat).
  const samenVan = id => staat.velden.filter(g => g.samen === id);
  const samenLetter = id => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(id - 1) % 26];
  function samenHtml(f, punten) {
    if (!SAMEN_SOORT.has(f.soort)) return punten(f.punten ?? 1);
    if (!f.samen) return `${punten(f.punten ?? 1)}<p class="bv-samen"><button type="button" class="secondary small-btn bv-koppel">🔗 Samen op punten met andere vakjes</button> <span class="muted small">bv. drie vakjes van één bewerking = 1 punt</span></p>`;
    const g = samenVan(f.samen);
    const nrs = g.filter(x => x !== f).map(x => staat.velden.indexOf(x) + 1);
    return `${punten(g.reduce((s, x) => s + (x.punten || 0), 0), 'Punten voor het groepje')}
      <p class="bv-samen"><span>🔗 <b>Groepje ${samenLetter(f.samen)}</b>: samen met vakje ${nrs.join(', ')}. Alleen als alles juist is, krijgt de leerling de punten.</span>
        <button type="button" class="secondary small-btn bv-koppel">Vakjes erbij of eraf</button> <button type="button" class="secondary small-btn bv-los">Loskoppelen</button></p>`;
  }
  // Start: het vakje komt in een (nieuw) groepje, daarna klikt de leerkracht de andere vakjes aan op het blad.
  function startKoppel(f) {
    if (!f.samen) {
      f.samen = Math.max(0, ...staat.velden.map(g => g.samen || 0)) + 1;
      f.punten = f.punten || 1;
    }
    staat.koppel = f.samen;
    box.querySelector('#be-venster').classList.add('hidden');
    box.querySelector('#be-koppel').classList.remove('hidden');
    kiesTool('wijs');
    teken();
  }
  function koppelKlik(k) {
    const f = staat.velden[k];
    const id = staat.koppel;
    if (!f || !SAMEN_SOORT.has(f.soort)) return Ui.melding('Dit vakje kan niet samen op punten. Kies een kort antwoord, breuk, keuzelijstje, sleepwoord, aanduiden of verbinden.');
    if (f.samen === id) {
      geefPuntenDoor(f);
      delete f.samen;
      f.punten = 1;
    } else {
      // Uit een ander groepje: daar blijven de punten.
      if (f.samen) geefPuntenDoor(f);
      const totaal = samenVan(id).reduce((s, g) => s + (g.punten || 0), 0) || 1;
      f.samen = id;
      samenVan(id).forEach((g, i) => { g.punten = i ? 0 : totaal; });
    }
    teken();
  }
  function stopKoppel() {
    const id = staat.koppel;
    staat.koppel = null;
    box.querySelector('#be-koppel').classList.add('hidden');
    ruimSamenOp();
    teken();
    const eerste = samenVan(id)[0];
    if (eerste) venster(staat.velden.indexOf(eerste));
  }
  // Een vakje gaat uit zijn groepje (of weg): zijn punten gaan naar een ander vakje van het groepje.
  function geefPuntenDoor(f) {
    if (!f.samen || !f.punten) return;
    const ander = samenVan(f.samen).find(g => g !== f);
    if (ander) { ander.punten = (ander.punten || 0) + f.punten; f.punten = 0; }
  }
  // Een groepje van één vakje is geen groepje meer; de punten staan altijd op het eerste vakje.
  function ruimSamenOp() {
    const ids = new Set(staat.velden.map(g => g.samen).filter(Boolean));
    for (const id of ids) {
      const g = samenVan(id);
      const totaal = g.reduce((s, x) => s + (x.punten || 0), 0);
      if (g.length < 2) { delete g[0].samen; g[0].punten = totaal || 1; continue; }
      g.forEach((x, i) => { x.punten = i ? 0 : totaal; });
    }
  }

  // Bij een groepje bolletjes of hokjes staan alle punten op het eerste juiste vakje.
  function zetPunten(f, p) {
    if (f.samen) {
      // Samen op punten: alle punten op het eerste vakje van het groepje.
      samenVan(f.samen).forEach((g, i) => { g.punten = i ? 0 : p; });
      return bijwerken();
    }
    if (f.soort !== 'kruis') { f.punten = p; return bijwerken(); }
    const g = groepVan(f);
    const juist = g.find(x => x.antwoord) || g[0];
    for (const x of g) x.punten = x === juist ? p : 0;
    bijwerken();
  }
  function bijwerken() {
    box.querySelector('#be-velden').innerHTML = lijnenHtml() + staat.velden.map(veldHtml).join('');
    titel();
  }
  function sluitVenster() {
    box.querySelector('#be-venster').classList.add('hidden');
    teken();
  }

  const kopieer = tekst => Ui.kopieer(tekst);
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

  const SOORT = { tekst: '✏️ antwoord', breuk: '➗ breuk', rooster: '🧮 rekenrooster', kies: '▾ keuzelijst', sleep: '🧲 sleepwoord', kruis: '☐ hokje', plek: '📍 aanduiden', lijn: '↗️ verbinden', open: '💬 open', teken: '🎨 tekenvak', puntlijn: '📐 lijnen tussen punten', cirkel: '⭕ cirkel', veelhoek: '🔷 veelhoek', klad: '📝 kladruimte', luister: '🎧 luisterknop', vlak: '⬜ vlak', notitie: '🗒️ notitie' };
  const KLEUR_NAAM = { '#ffffff': 'wit', '#fff3b0': 'geel', '#d8ecff': 'blauw', '#e4e4e4': 'grijs', '#ffd9d9': 'roze' };
  function rijHtml(f, k) {
    const s = `<select class="be-s" aria-label="Soort">${Object.entries(SOORT).map(([v, l]) => `<option value="${v}"${f.soort === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    let antw;
    if (f.soort === 'kruis') antw = `<span class="pf-be-kruis"><label><input type="checkbox" class="be-a"${f.antwoord ? ' checked' : ''}> aankruisen</label><label>groep <input class="be-g" type="number" min="1" max="99" value="${f.groep || 1}"></label></span>`;
    else if (f.soort === 'kies') antw = `<span class="pf-be-kies"><input class="be-o" value="${esc((f.opties || []).join(' / '))}" placeholder="keuzes: groter / kleiner / gelijk"><select class="be-a" aria-label="Juiste keuze"><option value="">juist?</option>${(f.opties || []).map(o => `<option${o === f.antwoord ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></span>`;
    else if (f.soort === 'plek') antw = '<span class="muted small">klik op het vakje op het blad</span>';
    else if (f.soort === 'lijn') antw = '<span class="muted small">een lijn op het blad</span>';
    else if (f.soort === 'veelhoek') antw = `<span class="muted small">${f.figuur ? esc(f.figuur) : ''} (dubbelklik)</span>`;
    else if (f.soort === 'puntlijn' || f.soort === 'cirkel' || f.soort === 'klad') antw = `<span class="muted small">${f.soort === 'klad' ? 'telt niet mee' : 'dubbelklik op het vakje op het blad'}</span>`;
    else if (f.soort === 'rooster' && f.nakijk) antw = `<span class="muted small">${f.nakijk === 'uitkomst' ? `uitkomst ${esc(f.uitkomst || '')}` : 'sleutel in het rooster'} (dubbelklik)</span>`;
    else if (f.soort === 'vlak') antw = `<select class="be-a" aria-label="Kleur">${Object.entries(KLEUR_NAAM).map(([k, n]) => `<option value="${k}"${f.kleur === k ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
    else if (f.soort === 'notitie') antw = `<input class="be-a" value="${esc(f.tekst || '')}" placeholder="tekst op het blad">`;
    else if (f.soort === 'luister') antw = `<span class="pf-be-luister"><span class="pf-be-audio" data-k="${k}"></span><input class="be-a" value="${esc(f.tekst || '')}" placeholder="of: tekst om voor te lezen"></span>`;
    else antw = `<input class="be-a" value="${esc(f.antwoord || '')}" placeholder="${f.soort === 'open' ? 'modelantwoord (voor jou)' : f.soort === 'teken' ? 'waar je op let (voor jou)' : f.soort === 'rooster' ? 'uitwerking (voor jou)' : f.soort === 'breuk' ? 'bijv. 3/4' : f.soort === 'sleep' ? 'het juiste woord' : 'bijv. 1600|1 600'}">`;
    return `<div class="pf-be-rij${staat.sel === k ? ' on' : ''}${leegVeld(f, k, staat.velden) ? ' zonder' : ''}" data-k="${k}"><b>${k + 1}${f.samen ? `<small title="Samen op punten">🔗${samenLetter(f.samen)}</small>` : ''}${f.vrij ? `<small title="Volgorde vrij, groepje ${f.vrij}">⇄${f.vrij}</small>` : ''}</b>${s}${antw}
      <input class="be-e" value="${esc(f.eenheid || '')}"${f.soort === 'tekst' || f.soort === 'breuk' ? '' : ' disabled'} aria-label="Eenheid"><input class="be-p" type="number" min="0" max="100" step="0.5" value="${f.punten ?? 1}" aria-label="Punten"${['luister', 'vlak', 'notitie', 'klad'].includes(f.soort) ? ' disabled' : ''}><button type="button" class="secondary small-btn weg" title="Vakje weghalen">✕</button></div>`;
  }

  // Nog zonder antwoord? velden: alle vakjes van het blad (voor een groepje bolletjes zonder juist antwoord).
  const leegVeld = (f, _, velden) => (f.soort === 'kruis' && Array.isArray(velden) && !velden.some(g => g.soort === 'kruis' && g.groep === f.groep && g.antwoord)) || ((f.soort === 'tekst' || f.soort === 'breuk' || f.soort === 'sleep') && !String(f.antwoord || '').trim() && !f.doorstreep) || (f.soort === 'plek' && !f.doel) || (f.soort === 'lijn' && !f.naar) || (f.soort === 'luister' && !f.audio && !String(f.tekst || '').trim()) || (f.soort === 'kies' && (!(f.opties || []).includes(f.antwoord) || f.opties.length < 2))
    || (f.soort === 'rooster' && !!f.nakijk && !(f.sleutel || '').trim() && !(f.nakijk === 'uitkomst' && String(f.uitkomst || '').trim()))
    || (f.soort === 'puntlijn' && ((f.pt || []).length < 2 || (f.doorPunt === undefined && !(f.lijnen || []).length)))
    || (f.soort === 'cirkel' && !(f.cirkels || []).length)
    || (f.soort === 'veelhoek' && !f.figuur);
  function veldHtml(f, k) {
    const leeg = leegVeld(f, k, staat.velden);
    const tekst = f.soort === 'kruis' ? f.label || (f.antwoord ? '✓' : '') : f.soort === 'luister' ? '🎧' : f.soort === 'plek' ? '📍' : f.soort === 'lijn' ? '' : f.soort === 'teken' ? '🎨' : f.soort === 'rooster' ? '🧮' : f.soort === 'klad' ? '📝 klad' : f.soort === 'puntlijn' || f.soort === 'cirkel' || f.soort === 'veelhoek' ? '' : f.soort === 'vlak' ? '' : f.soort === 'notitie' ? (f.tekst || '🗒️') : f.soort === 'open' ? '' : f.antwoord ? `${f.soort === 'kies' ? '▾ ' : ''}${String(f.antwoord).split('|')[0]}` : '';
    const koppel = staat.koppel ? (f.samen === staat.koppel ? ' koppel-in' : SAMEN_SOORT.has(f.soort) ? ' koppel-kan' : ' koppel-niet') : '';
    return `<div class="pf-be-veld ${f.soort}${f.rond ? ' rond' : ''}${f.soort === 'kruis' && f.antwoord ? ' juist' : ''}${staat.sel === k ? ' on' : ''}${leeg ? ' zonder' : ''}${koppel}" data-k="${k}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%${f.soort === 'vlak' ? `;background:${f.kleur || '#fff'}` : ''}${f.soort === 'rooster' ? `;--kol:${f.kol || ROOSTER.kol};--rij:${f.rij || ROOSTER.rij}` : ''}">${f.soort === 'kruis' && groepVan(f)[0] !== f ? '' : `<span class="nr">${k + 1}</span>`}${f.samen ? `<span class="samen-tag" title="Samen op punten">🔗${samenLetter(f.samen)}</span>` : ''}<span class="t">${esc(tekst)}</span>${f.soort === 'plek' && f.doel ? `<i class="pf-plek-doel" style="left:${f.doel.x}%;top:${f.doel.y}%;width:${2 * f.doel.r}%"></i>` : ''}${vormHtml(f)}<i class="greep"></i></div>`;
  }

  // Op het blad in de editor: de punten en de juiste lijnen, of de juiste cirkels.
  function vormHtml(f) {
    if (f.soort === 'puntlijn') {
      const pt = f.pt || [];
      const l = f.doorPunt === undefined ? (f.lijnen || []).map(([a, b]) => (pt[a] && pt[b] ? `<line x1="${pt[a].x}" y1="${pt[a].y}" x2="${pt[b].x}" y2="${pt[b].y}" vector-effect="non-scaling-stroke"/>` : '')).join('') : '';
      return `<svg class="pf-be-pl" viewBox="0 0 100 100" preserveAspectRatio="none">${l}</svg>${pt.map(p => `<i class="pf-pt" style="left:${p.x}%;top:${p.y}%"></i>`).join('')}`;
    }
    if (f.soort === 'veelhoek') {
      let h = '';
      for (let r = 0; r < (f.rij || 5); r++) for (let c = 0; c < (f.kol || 6); c++) h += `<i class="pf-stip" style="left:${(c / ((f.kol || 6) - 1)) * 100}%;top:${(r / ((f.rij || 5) - 1)) * 100}%"></i>`;
      return h;
    }
    if (f.soort === 'cirkel') {
      const schaal = staat.schaal || PfKern.SCHAAL;
      return (f.cirkels || []).map(c => `<i class="pf-cirkel sleutel" style="left:${c.x}%;top:${c.y}%;width:${r2(((2 * c.r) / schaal / f.w) * 10000)}%"></i>`).join('');
    }
    return '';
  }

  function teken() {
    box.querySelector('#be-velden').innerHTML = lijnenHtml() + staat.velden.map(veldHtml).join('');
    if (staat.koppel) { const n = samenVan(staat.koppel).length; box.querySelector('#be-koppel-n').textContent = `${n} ${n === 1 ? 'vakje' : 'vakjes'}`; }
    box.querySelector('#be-rijen').innerHTML = staat.velden.length ? staat.velden.map(rijHtml).join('') : '<p class="muted small">Nog geen vakjes. Sleep op het blad om er een te maken.</p>';
    audioKnoppen();
    box.querySelector('.pf-be-woorden').classList.toggle('hidden', !staat.velden.some(f => f.soort === 'sleep'));
    titel();
  }
  // Een luisterknop op het blad: opnemen of een geluidsbestand.
  function audioKnoppen() {
    for (const el of box.querySelectorAll('.pf-be-audio')) {
      const f = staat.velden[Number(el.dataset.k)];
      if (typeof PfAudio === 'undefined' || !f) continue;
      PfAudio.knop(el, { waarde: f.audio || '', max: 90, grootte: 2000000, label: 'Opnemen', onChange: d => {
        if (d) f.audio = d; else delete f.audio;
        const rij = el.closest('.pf-be-rij');
        if (rij) rij.classList.toggle('zonder', leegVeld(f));
        titel();
      } });
    }
  }
  function titel() {
    // Een groepje bolletjes telt als één vraag.
    const open = staat.velden.filter((f, k, a) => leegVeld(f, k, a) && !(f.soort === 'kruis' && groepVan(f)[0] !== f)).length;
    box.querySelector('#be-titel').textContent = `${staat.opts.titel || 'Vakjes op het blad'} · ${staat.velden.length} vakjes${open ? ` · ${open} zonder antwoord` : ''}`;
  }
  function tekenVeld(k) {
    const el = box.querySelector(`.pf-be-veld[data-k="${k}"]`);
    const f = staat.velden[k];
    if (el) Object.assign(el.style, { left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` });
    const l = box.querySelector(`#be-velden line[data-k="${k}"]`);
    if (l) { l.setAttribute('x1', f.x + f.w / 2); l.setAttribute('y1', f.y + f.h / 2); }
  }
  // Verbinden: de juiste lijn van elk bolletje, met een cirkel rond de juiste plek.
  function lijnenHtml() {
    const l = staat.velden.map((f, k) => (f.soort === 'lijn' && f.naar ? `<line data-k="${k}" x1="${f.x + f.w / 2}" y1="${f.y + f.h / 2}" x2="${f.naar.x}" y2="${f.naar.y}" vector-effect="non-scaling-stroke"/>` : '')).join('');
    if (!l) return '';
    return `<svg class="pf-lijnen pf-be-lijnen" viewBox="0 0 100 100" preserveAspectRatio="none">${l}</svg>${staat.velden.map(f => (f.soort === 'lijn' && f.naar ? `<i class="pf-plek-doel" style="left:${f.naar.x}%;top:${f.naar.y}%;width:${2 * (f.r || 3)}%"></i>` : '')).join('')}`;
  }
  function kies(k, focus) {
    staat.sel = k;
    for (const el of box.querySelectorAll('.pf-be-veld, .pf-be-rij')) el.classList.toggle('on', Number(el.dataset.k) === k);
    let rij = box.querySelector(`.pf-be-rij[data-k="${k}"]`);
    if (!rij && staat.velden[k]) { teken(); rij = box.querySelector(`.pf-be-rij[data-k="${k}"]`); }
    if (rij && rij.closest('details').open) {
      rij.scrollIntoView({ block: 'nearest' });
      if (focus) { const a = rij.querySelector('input.be-a:not([type=checkbox])'); if (a) a.focus(); }
    }
  }
  // Een rekenregel ({1} * {2}) volgt de vakjes als hun nummer verandert. map[oud] = nieuw (of -1: weg).
  function herNummer(velden, map) {
    for (const f of velden) {
      if (!f.formule) continue;
      f.formule = f.formule.replace(/\{(\d+)\}/g, (m, n) => { const x = map[Number(n) - 1]; return x === undefined ? m : x < 0 ? '{?}' : `{${x + 1}}`; });
    }
  }
  function weg(k) {
    geefPuntenDoor(staat.velden[k]);
    herNummer(staat.velden, staat.velden.map((_, i) => (i === k ? -1 : i > k ? i - 1 : i)));
    staat.velden.splice(k, 1);
    ruimSamenOp();
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
      if (['luister', 'vlak', 'notitie'].includes(f.soort)) { f.punten = 0; delete f.antwoord; delete f.eenheid; }
      if (f.soort === 'vlak' && !f.kleur) f.kleur = '#ffffff';
      if (f.soort === 'rooster') { f.kol = f.kol || ROOSTER.kol; f.rij = f.rij || ROOSTER.rij; }
      if (f.soort === 'klad') { f.punten = 0; f.vorm = f.vorm || 'typen'; delete f.antwoord; }
      if (f.soort === 'puntlijn' && !f.pt) f.pt = [];
      if (f.soort === 'cirkel' && !f.cirkels) { f.cirkels = []; f.marge = 0.1; }
      if (f.soort === 'veelhoek') { f.kol = f.kol || 6; f.rij = f.rij || 5; }
      if (f.samen && !SAMEN_SOORT.has(f.soort)) { geefPuntenDoor(f); delete f.samen; ruimSamenOp(); }
      if (f.soort === 'kies' && !f.opties) f.opties = [];
      if (f.soort === 'kruis') { const v = staat.verhouding || 1.414; f.h = r2(Math.min(f.h, 3)); f.w = r2(f.h * v); }
      teken();
      kies(k);
      return;
    }
    if (el.classList.contains('be-a')) {
      if (f.soort === 'kruis') { f.antwoord = el.checked; f.punten = el.checked ? Math.max(1, f.punten || 0) : 0; rij.querySelector('.be-p').value = f.punten; } else if (f.soort === 'luister' || f.soort === 'notitie') f.tekst = el.value; else if (f.soort === 'vlak') f.kleur = el.value; else f.antwoord = el.value;
    }
    if (el.classList.contains('be-o')) {
      f.opties = [...new Set(el.value.split('/').map(o => o.trim()).filter(Boolean))].slice(0, 8);
      // Later vervangen: tijdens het vervangen verliest het vakje de focus en komt er nog een change.
      if (opnieuw) setTimeout(() => { if (rij.isConnected) { rij.outerHTML = rijHtml(f, k); titel(); } }, 0);
      return;
    }
    if (el.classList.contains('be-g')) f.groep = Math.max(1, Math.round(Number(el.value)) || 1);
    if (el.classList.contains('be-e')) f.eenheid = el.value.trim();
    if (el.classList.contains('be-p')) {
      const p = Math.max(0, Number(String(el.value).replace(',', '.')) || 0);
      if (f.samen) { zetPunten(f, p); if (opnieuw) teken(); return; }
      f.punten = p;
    }
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
    staat = { velden: (b.velden || []).map(f => JSON.parse(JSON.stringify(f))), sel: null, beeld: b.beeld, verhouding: b.verhouding, schaal: b.schaal || PfKern.SCHAAL, opts, tool: 'wijs', aantal: 4, klembord: null, muis: null, opVeld: null, koppel: null, ijk: null, ptModus: 'zet', ptStart: null };
    box.querySelector('#be-koppel').classList.add('hidden');
    kiesTool('wijs');
    box.querySelector('#be-aantal').textContent = staat.aantal;
    box.querySelector('#be-venster').classList.add('hidden');
    box.querySelector('#be-woorden').value = (b.woorden || []).join(' / ');
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
