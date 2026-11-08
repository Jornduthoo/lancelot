// LANcelot Junior · de werkbladgenerator. Kies een of meer spelletjes met hun niveau, hoeveel oefeningen,
// één blad voor de hele klas of een eigen blad per kind (met de naam erop en het niveau Op maat), en de extra's.
// Gebruikt de werkbladmakers (WB) en de vragen van de spelletjes uit jr-leerkracht.js / jr-spel.js. Alles op A4.
(function () {
  const t = x => (window.I18n ? I18n.t(x) : x);
  const esc = s => Junior.esc(s);
  const GEEN = ['dans', 'kring', 'waar', 'eigen', 'ritme', 'geluiden'];
  const AANTAL = [2, 3, 4, 6, 8, 12, 15];
  const st = { blokken: [], per: 4, mix: false, wie: 'klas', groot: false, naam: true, datum: true, zeg: true, smiley: true, stempel: false, sleutel: true, titel: '', start: 1 };
  try { Object.assign(st, JSON.parse(localStorage.getItem('jr-wbgen') || '{}')); } catch {}
  // Oude instelling 'groot' → maat. Klein = 3 per rij: zuinig met papier, vooral voor rekenen.
  // Automatisch (standaard): oefeningen zonder prenten (rekenen) 3 per rij, met prenten 2 per rij.
  if (st.maatV !== 2) { st.maat = 'auto'; st.maatV = 2; }
  if (!st.start) st.start = 1 + Math.floor(Math.random() * 1e6);
  const bewaar = () => { try { localStorage.setItem('jr-wbgen', JSON.stringify(st)); } catch {} };
  const spellen = () => (J().spellen || []).filter(s => !GEEN.includes(s.id) && !s.bordAlleen && (s.id !== 'naam' || st.wie === 'kind'));
  const spel = id => (J().spellen || []).find(s => s.id === id);
  // Een blok: een spel met zijn niveau, of een eigen reeks (spel 'eigen', niveau = de plaats van de reeks).
  const reeks = b => (b.spel === 'eigen' ? (window.JR && JR.sets || [])[b.niveau] : null);
  const blokNaam = b => (b.spel === 'eigen' ? (reeks(b) || {}).naam || '' : (spel(b.spel) || {}).naam || '');
  // De vragen van één spel en niveau (zelfde zaadje = zelfde oefeningen, tot je op 🎲 tikt).
  function vragen(id, niv, n, zaad, kind) {
    const uit = [], gezien = new Set();
    for (let i = 0; i < 400 && uit.length < n; i++) {
      let v = null;
      try { v = Junior.vraag(id, niv, Junior.toeval(zaad + i * 7919), kind || undefined, true); } catch { v = null; }
      if (!v || !WB[v.soort]) continue;
      const zeg = (v.zeg || []).filter(z => typeof z === 'string' || typeof z === 'number').join(' ');
      // Dezelfde oefening met de antwoorden in een andere volgorde telt als dezelfde.
      const sl = v.opties ? (v.kop || '') + zeg + (v.scene || '') + v.opties.filter(o => o.juist).map(o => o.html).join()
        : (v.kop || '') + zeg + JSON.stringify((v.items || v.kaarten || []).map(o => JSON.stringify(o)).sort());
      if (gezien.has(sl) && i < 200) continue;
      gezien.add(sl);
      uit.push({ v, zeg, i, spel: id });
    }
    return uit;
  }
  const kanPapier = id => vragen(id, 0, 1, 7).length > 0 || id === 'naam';
  // Alle oefeningen voor één blad. Bij "per kind" krijgt elk kind andere oefeningen op zijn eigen niveau.
  function blad(kind, nr) {
    let alles = [];
    st.blokken.forEach((b, bi) => {
      const niv = kind && b.spel !== 'eigen' ? Junior.niveauVoor(kind, b.spel, b.niveau) : b.niveau;
      const zaad = st.start + bi * 104729 + (kind ? (nr + 1) * 15485863 : 0);
      const n = b.spel === 'eigen' ? Math.min(st.per, ((reeks(b) || {}).vragen || []).length) : st.per;
      alles = alles.concat(vragen(b.spel, niv, n, zaad, kind && { naam: kind.naam }));
    });
    if (st.mix) { const r = Junior.toeval(st.start + (nr || 0)); alles = r.schud(alles); }
    return alles;
  }
  function titel() {
    if (st.titel.trim()) return st.titel.trim();
    if (st.blokken.length === 1) return blokNaam(st.blokken[0]);
    return t('Mijn werkblad');
  }
  function sub(kind) {
    return st.blokken.map(b => { if (b.spel === 'eigen') return st.blokken.length > 1 ? blokNaam(b) : ''; const s = spel(b.spel); if (!s) return ''; const n = kind ? Junior.niveauVoor(kind, b.spel, b.niveau) : b.niveau; return st.blokken.length > 1 ? `${s.naam}: ${s.niveaus[n] || ''}` : s.niveaus[n] || ''; }).join(' · ');
  }
  function html(kind, nr, k, q) {
    const lijn = (lab, w, waarde) => `<span class="wb-naam">${esc(t(lab))} ${waarde ? `<u>${esc(waarde)}</u>` : `<i style="width:${w}mm"></i>`}</span>`;
    const rechts = k ? `<span class="wb-naam wb-sleutel-kop">${esc(t('Verbetersleutel'))}${kind ? ` · ${esc(kind.naam)}` : ''}</span>`
      : `<span class="wb-lijnen">${st.naam ? lijn('Naam:', 55, kind && kind.naam) : ''}${st.datum ? lijn('Datum:', 35) : ''}</span>`;
    const kindBeeld = kind && kind.beeld ? `<img class="wb-dier" src="${kind.beeld}" alt="">` : `<img src="${draakImg()}" alt="">`;
    const ws = q.map(x => WB[x.v.soort](x.v, x.i, k));
    // Dezelfde opdracht bij elke oefening? Dan staat ze één keer bovenaan.
    const samen = ws.length > 1 && ws.every(w => w.doe === ws[0].doe) ? ws[0].doe : '';
    const zonderPrent = q.every((x, n) => !/<img(?![^>]*jr-steen)|\p{Extended_Pictographic}/u.test(ws[n].html + (x.v.kop || '') + (x.v.scene || '')));
    const maat = st.maat === 'auto' ? (zonderPrent ? 'klein' : 'normaal') : st.maat;
    return `<div class="wb-blad${k ? ' wb-sleutel' : ''}${maat !== 'normaal' ? ' wb-' + maat : ''}"><header class="wb-kop">${kindBeeld}<div><h1>${esc(titel())}</h1><p>${esc(sub(kind))}</p></div>${rechts}</header>
      ${samen ? `<p class="wb-opdracht">${esc(t(samen))}</p>` : ''}
      <div class="wb-vragen">${q.map((x, n) => { const w = ws[n]; return `<section class="wb-vraag"><p class="wb-doe"><b>${n + 1}</b> <span>${samen ? '' : esc(t(w.doe))}</span>${st.smiley && !k ? '<span class="wb-smileys"><i>☺</i><i>😐</i><i>☹</i></span>' : ''}</p>${st.zeg ? `<p class="wb-zeg">🔊 ${esc(x.zeg)}</p>` : ''}<div class="wb-inhoud">${x.v.kop ? `<div class="wb-vk">${x.v.kop}</div>` : ''}${x.v.scene ? `<div class="wb-scene">${x.v.scene}</div>` : ''}${w.html}</div></section>`; }).join('')}</div>
      <footer class="wb-voet">${st.stempel && !k ? `<span class="wb-stempel">${esc(t('Sticker of stempel'))}</span>` : ''}<span>LANcelot Junior</span></footer></div>`;
  }
  const wieLijst = () => (st.wie === 'kind' ? kinderen.filter(k => !afwezig.has(k.id)) : [null]);
  function alleBladen(max) {
    const wie = wieLijst().slice(0, max || 999);
    return wie.map((k, i) => { const q = blad(k, i); return html(k, i, false, q) + (st.sleutel ? html(k, i, true, q) : ''); }).join('');
  }
  // ---------- Het scherm ----------
  function opties() {
    const box = $('jr-wbg-opties');
    const groepen = {};
    for (const s of spellen()) (groepen[s.groep] = groepen[s.groep] || []).push(s);
    const gekozen = id => st.blokken.find(b => b.spel === id);
    const sets = (window.JR && JR.sets) || [];
    const reeksGekozen = i => st.blokken.find(b => b.spel === 'eigen' && b.niveau === i);
    box.innerHTML = `
      <section class="jr-wbg-deel"><h3>1. ${esc(t('Kies de spelletjes'))}</h3>
        <div class="jr-wbg-spellen">${GROEPEN.filter(([g]) => groepen[g]).map(([g, kop]) => `<p class="jr-wbg-groep">${esc(t(kop))}</p><div class="jr-wbg-rij">${groepen[g].map(s => `<button type="button" class="jr-wbg-spel jr-eigen ${gekozen(s.id) ? 'aan' : ''}" data-spel="${s.id}"><img src="${beeldPad(s)}" alt=""><span>${esc(s.naam)}</span></button>`).join('')}</div>`).join('')}
          ${sets.length ? `<p class="jr-wbg-groep">${esc(t('✨ Mijn eigen vragen'))}</p><div class="jr-wbg-rij">${sets.map((r, i) => `<button type="button" class="jr-wbg-spel jr-eigen ${reeksGekozen(i) ? 'aan' : ''}" data-reeks="${i}"><img src="/img/junior/blok/maken.webp" alt=""><span data-geen-vertaling>${esc(r.naam)}</span></button>`).join('')}</div>` : ''}</div>
        ${st.blokken.length ? `<div class="jr-wbg-blokken">${st.blokken.map((b, i) => { if (b.spel === 'eigen') return reeks(b) ? `<div class="jr-wbg-blok"><img src="/img/junior/blok/maken.webp" alt=""><b data-geen-vertaling>${esc(blokNaam(b))}</b><button type="button" class="jr-kt-wis jr-eigen jr-wbg-weg" data-weg="${i}" aria-label="Weg">✕</button></div>` : ''; const s = spel(b.spel); return s ? `<div class="jr-wbg-blok"><img src="${beeldPad(s)}" alt=""><b>${esc(s.naam)}</b><select data-niv="${i}">${s.niveaus.map((n, j) => `<option value="${j}" ${j === b.niveau ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button type="button" class="jr-kt-wis jr-eigen jr-wbg-weg" data-weg="${i}" aria-label="Weg">✕</button></div>` : ''; }).join('')}</div>` : `<p class="jr-wbg-tip">${esc(t('Tik op een of meer spelletjes.'))}</p>`}
      </section>
      <section class="jr-wbg-deel"><h3>2. ${esc(t('Oefeningen'))}</h3>
        <p class="jr-kv-label">${esc(t('Per spel'))}</p><div class="jr-kv-keuzes">${AANTAL.map(n => `<button type="button" data-per="${n}" class="jr-eigen ${st.per === n ? 'aan' : ''}">${n}</button>`).join('')}</div>
        <label class="jr-wb-vink"><input type="checkbox" data-vink="mix" ${st.mix ? 'checked' : ''}> ${esc(t('Spelletjes door elkaar'))}</label>
        <button type="button" class="secondary" id="jr-wbg-nieuw">🎲 ${esc(t('Andere oefeningen'))}</button>
      </section>
      <section class="jr-wbg-deel"><h3>3. ${esc(t('Voor wie?'))}</h3>
        <div class="jr-kv-keuzes"><button type="button" data-wie="klas" class="jr-eigen ${st.wie === 'klas' ? 'aan' : ''}">${esc(t('Eén blad voor de hele klas'))}</button><button type="button" data-wie="kind" class="jr-eigen ${st.wie === 'kind' ? 'aan' : ''}">${esc(t('Een eigen blad per kind'))}</button></div>
        <p class="jr-wbg-tip">${esc(t(st.wie === 'kind' ? 'Elk kind krijgt andere oefeningen, met zijn naam en dier erop en het niveau van Op maat. Alleen wie er vandaag is.' : 'Iedereen dezelfde oefeningen: druk het blad zo vaak af als je nodig hebt.'))}</p>
      </section>
      <section class="jr-wbg-deel"><h3>4. ${esc(t('Opmaak'))}</h3>
        <label class="jr-wbg-titel">${esc(t('Titel'))} <input id="jr-wbg-titel" maxlength="40" value="${esc(st.titel)}" placeholder="${esc(titel())}"></label>
        <div class="jr-kv-keuzes">${[['auto', 'Automatisch'], ['groot', 'Groot (1 per rij)'], ['normaal', 'Normaal (2 per rij)'], ['klein', 'Klein (3 per rij)']].map(([m, l]) => `<button type="button" data-maat="${m}" class="jr-eigen ${st.maat === m ? 'aan' : ''}">${esc(t(l))}</button>`).join('')}</div>
        <div class="jr-wbg-vinken">
          <label class="jr-wb-vink"><input type="checkbox" data-vink="naam" ${st.naam ? 'checked' : ''}> ${esc(t('Naamlijn'))}</label>
          <label class="jr-wb-vink"><input type="checkbox" data-vink="datum" ${st.datum ? 'checked' : ''}> ${esc(t('Datumlijn'))}</label>
          <label class="jr-wb-vink"><input type="checkbox" data-vink="zeg" ${st.zeg ? 'checked' : ''}> ${esc(t('Opdracht om voor te lezen (🔊)'))}</label>
          <label class="jr-wb-vink"><input type="checkbox" data-vink="smiley" ${st.smiley ? 'checked' : ''}> ${esc(t('Hoe ging het? (gezichtjes kleuren)'))}</label>
          <label class="jr-wb-vink"><input type="checkbox" data-vink="stempel" ${st.stempel ? 'checked' : ''}> ${esc(t('Vakje voor een sticker of stempel'))}</label>
          <label class="jr-wb-vink"><input type="checkbox" data-vink="sleutel" ${st.sleutel ? 'checked' : ''}> ${esc(t('Verbetersleutel erbij'))}</label>
        </div>
      </section>`;
    box.querySelectorAll('[data-spel]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.spel;
      if (gekozen(id)) st.blokken = st.blokken.filter(x => x.spel !== id);
      else if (!kanPapier(id)) return Ui.melding(t('Dit spel heeft nog geen werkblad. Kies een ander spel.'));
      else st.blokken.push({ spel: id, niveau: 0 });
      ververs(true);
    }));
    box.querySelectorAll('[data-reeks]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.reeks;
      if (reeksGekozen(i)) st.blokken = st.blokken.filter(x => !(x.spel === 'eigen' && x.niveau === i));
      else st.blokken.push({ spel: 'eigen', niveau: i });
      ververs(true);
    }));
    box.querySelectorAll('[data-niv]').forEach(s => s.addEventListener('change', () => { st.blokken[+s.dataset.niv].niveau = +s.value; ververs(); }));
    box.querySelectorAll('[data-weg]').forEach(b => b.addEventListener('click', () => { st.blokken.splice(+b.dataset.weg, 1); ververs(true); }));
    box.querySelectorAll('[data-per]').forEach(b => b.addEventListener('click', () => { st.per = +b.dataset.per; ververs(true); }));
    box.querySelectorAll('[data-wie]').forEach(b => b.addEventListener('click', () => { st.wie = b.dataset.wie; if (st.wie === 'klas') st.blokken = st.blokken.filter(x => x.spel !== 'naam'); ververs(true); }));
    box.querySelectorAll('[data-maat]').forEach(b => b.addEventListener('click', () => { st.maat = b.dataset.maat; ververs(true); }));
    box.querySelectorAll('[data-vink]').forEach(c => c.addEventListener('change', () => { st[c.dataset.vink] = c.checked; ververs(); }));
    $('jr-wbg-titel').addEventListener('input', e => { st.titel = e.target.value; bewaar(); voorbeeld(); });
    $('jr-wbg-nieuw').addEventListener('click', () => { st.start = 1 + Math.floor(Math.random() * 1e6); ververs(); });
  }
  function voorbeeld() {
    const v = $('jr-wbg-voorbeeld');
    const n = wieLijst().length;
    $('jr-wbg-print').disabled = !st.blokken.length;
    $('jr-wbg-tel').textContent = !st.blokken.length ? '' : st.wie === 'kind' ? `${n} ${t('bladen')}${st.sleutel ? ` + ${n} ${t('sleutels')}` : ''}` : `1 ${t('blad')}${st.sleutel ? ` + 1 ${t('sleutel')}` : ''}`;
    v.innerHTML = st.blokken.length ? alleBladen(2) : `<p class="jr-wbg-leeg">${esc(t('Kies links een spel. Hier zie je meteen je werkblad.'))}</p>`;
  }
  function ververs(opnieuwOpties) { bewaar(); if (opnieuwOpties) opties(); voorbeeld(); }
  function toon(keuze) {
    if (keuze && keuze.spel) { st.blokken = [{ spel: keuze.spel, niveau: keuze.niveau || 0 }]; st.titel = ''; st.start = 1 + Math.floor(Math.random() * 1e6); }
    st.blokken = st.blokken.filter(b => (b.spel === 'eigen' ? reeks(b) : spel(b.spel)));
    opties(); voorbeeld();
  }
  $('jr-wbg-print').addEventListener('click', () => {
    const blad = $('jr-printblad');
    blad.classList.remove('diploma');
    blad.classList.add('werkblad');
    blad.innerHTML = alleBladen();
    Promise.all([...blad.querySelectorAll('img')].map(im => (im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })))).then(() => setTimeout(() => window.print(), 100));
  });
  window.JrWerkblad = { toon };
  // Rechtstreeks op #werkbladen geopend (herladen): dit script laadt na de eerste toonView.
  if (location.hash === '#werkbladen') toon();
})();
