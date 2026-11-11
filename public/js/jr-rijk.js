// LANcelot Junior · Het Toverdorp: zes geschilderde kaarten (over de brug) met elk zes plekken. Op elke plek:
// tik op wat je ziet (het draakje zegt het woord), het zoekspel ("Waar is de koe?"), verstoppertje (onthoud waar alles stond),
// "wat hoort hier niet?", "draakje zegt" (tik in de goede volgorde), memory, tellen, schaduwen en "wat is er weg?".
// Op de kaart: "waar hoort dit?", "waar is de kermis?" en vraagt het draakje om drie dingen uit het hele dorp in je mand te stoppen.
// Zelfde onderdeel op de tablet en op het bord. JrRijk.maak(vak) tekent alles in vak; JrRijk.stop() stopt de spelletjes.
(function () {
  const J = () => window.JR || {};
  const Z = () => J().zin || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Waar elke plek op de kaart ligt (midden, in %).
  const KAART = {
    boerderij: [14, 24], bos: [47, 17], vijver: [85, 22], markt: [15, 74], kasteel: [50, 74], tuin: [85, 72],
    strand: [35, 22], speeltuin: [58, 21], station: [85, 30], bakkerij: [29, 63], dierentuin: [58, 66], sneeuw: [87, 74],
    brandweer: [27, 25], dokter: [57, 24], haven: [84, 26], circus: [23, 67], school: [53, 67], ruimte: [84, 65],
    zwembad: [21, 20], kermis: [52, 22], bouwwerf: [82, 24], winkel: [23, 60], onderwater: [48, 78], dino: [85, 70],
    politie: [23, 20], eiland: [57, 22], weer: [83, 20], ijssalon: [24, 62], garage: [57, 64], muziek: [86, 68],
    keuken: [22, 22], badkamer: [55, 22], slaapkamer: [83, 24], moestuin: [22, 70], vliegveld: [53, 78], jungle: [86, 72],
  };
  // De wegwijzers naar de andere kaarten: [links, boven, prent, naar kaart].
  const BRUG = { 1: [[94, 47, 5, 2]], 2: [[8, 51, 6, 1], [93, 44, 5, 3]], 3: [[9, 46, 6, 2], [94, 44, 5, 4]], 4: [[8, 49, 6, 3], [95, 48, 5, 5]], 5: [[8, 47, 6, 4], [95, 45, 5, 6]], 6: [[8, 62, 6, 5]] };
  // Waar de zes prenten op een plek staan: midden (%), onderkant (%), breedte (%).
  const SPOT = [[17, 80, 18], [39, 92, 17], [62, 90, 17], [84, 80, 18], [28, 58, 13], [72, 56, 13]];
  const STRUIK = '/img/junior/rijk/extra/1.webp';
  const MAND = '/img/junior/rijk/extra/3.webp';
  let vak = null;
  let welkeKaart = 1;
  let spel = null; // { soort: 'zoek' | 'verstop' | 'niet', plek, ... }
  let mand = null; // { dingen: [{ plek, i }], gevonden: Set }
  let wacht = null;
  const zeg = (stukken, o) => { try { return Junior.Stem.zeg(stukken, o); } catch { return Promise.resolve(); } };
  const fx = naam => { try { sfx[naam](); } catch {} };
  const schud = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const plekken = () => J().rijk || [];
  const opKaart = k => plekken().filter(p => (p.kaart || 1) === k);
  const img = (id, i) => `/img/junior/rijk/${id}/${i + 1}.webp`;
  const sleutel = (id, i) => `${id}:${i}`;
  const ruim = () => { spel = null; if (wacht) { clearTimeout(wacht); wacht = null; } try { JrRijkSpel.stop(); } catch {} };

  function nieuweMand() {
    const p = schud(plekken()).slice(0, 3);
    mand = { dingen: p.map(x => ({ plek: x.id, i: Math.floor(Math.random() * x.woorden.length) })), gevonden: new Set() };
  }
  const mandHtml = () => mand ? `<div class="jr-rijk-mand"><img class="jr-rijk-mand-img" src="${MAND}" alt="">${mand.dingen.map(d => `<span class="${mand.gevonden.has(sleutel(d.plek, d.i)) ? 'vol' : ''}"><img src="${img(d.plek, d.i)}" alt=""></span>`).join('')}</div>` : '';
  const woord = (id, i) => { const p = plekken().find(x => x.id === id); return p ? p.woorden[i] : ''; };

  function kaart(k = welkeKaart, praat = true) {
    ruim();
    welkeKaart = k;
    if (!mand) nieuweMand();
    vak.innerHTML = `<div class="jr-rijk jr-rijk-kaart ${k > 1 ? `jr-rijk-kaart${k}` : ''}">
      <div class="jr-rijk-balk jr-rijk-balk-kaart"><span class="jr-rijk-sterren" data-geen-vertaling></span><span class="jr-rijk-spellen"><button type="button" class="jr-eigen" data-kaartspel="hoort"><img class="jr-prent" src="/img/junior/prent/1f9ed.webp" alt="🧭"></button><button type="button" class="jr-eigen" data-kaartspel="vind"><img class="jr-prent" src="/img/junior/prent/1f50e.webp" alt="🔎"></button></span></div>
      <p class="jr-rijk-vraag jr-rijk-hoort hidden" data-geen-vertaling></p>
      ${opKaart(k).map(p => { const [x, y] = KAART[p.id] || [50, 50]; const hier = mand.dingen.some(d => d.plek === p.id && !mand.gevonden.has(sleutel(d.plek, d.i))); return `<button type="button" class="jr-rijk-plek jr-eigen ${hier ? 'mand-hier' : ''} ${x >= 80 ? 'rechts' : ''}" data-plek="${p.id}" style="left:${x}%;top:${y}%"><span>${esc(p.naam)}</span></button>`; }).join('')}
      ${BRUG[k].map(([bx, by, bi, naar]) => `<button type="button" class="jr-rijk-brug jr-eigen" data-naar="${naar}" style="left:${bx}%;top:${by}%" aria-label="${esc(Z().rijkBrug || '')}"><img src="/img/junior/rijk/extra/${bi}.webp" alt=""></button>`).join('')}
      ${mandHtml()}
    </div>`;
    vak.querySelectorAll('[data-plek]').forEach(b => b.addEventListener('click', () => {
      if (spel && spel.soort === 'hoort') return hoortTik(b);
      if (spel && spel.soort === 'vind') return vindTik(b);
      fx('jump'); plek(b.dataset.plek);
    }));
    vak.querySelectorAll('.jr-rijk-brug').forEach(b => b.addEventListener('click', () => { fx('jump'); kaart(+b.dataset.naar, false); zeg([Z().rijkBrug]); }));
    vak.querySelectorAll('[data-kaartspel]').forEach(b => b.addEventListener('click', () => (b.dataset.kaartspel === 'vind' ? vindStart : hoortStart)(k)));
    vak.querySelector('.jr-rijk-mand').addEventListener('click', () => zeg([Z().rijkMand, ...mand.dingen.filter(d => !mand.gevonden.has(sleutel(d.plek, d.i))).map(d => woord(d.plek, d.i))], { los: true }));
    if (praat) zeg([Z().rijkKaart]);
  }

  function plek(id) {
    ruim();
    const p = plekken().find(x => x.id === id);
    if (!p) return kaart();
    const doe = window.JrRijkSpel && JrRijkSpel.van(id);
    vak.innerHTML = `<div class="jr-rijk jr-rijk-plaats" style="--bg:url(/img/junior/rijk/${id}/bg.webp);--bg-klein:url(/img/junior/rijk/${id}/bg-klein.webp)">
      <div class="jr-rijk-balk"><button type="button" class="jr-rijk-terug jr-eigen" aria-label="Kaart">🗺️</button><b>${esc(p.naam)}</b>
        <span class="jr-rijk-sterren" data-geen-vertaling></span>
        <span class="jr-rijk-spellen"><button type="button" class="jr-eigen" data-spel="zoek"><img class="jr-prent" src="/img/junior/prent/1f50d.webp" alt="🔍"></button><button type="button" class="jr-eigen" data-spel="verstop"><img class="jr-prent" src="/img/junior/prent/1f648.webp" alt="🙈"></button><button type="button" class="jr-eigen" data-spel="niet"><img class="jr-prent" src="/img/junior/prent/2753.webp" alt="❓"></button><button type="button" class="jr-eigen" data-spel="volg"><img class="jr-prent" src="/img/junior/prent/1f442.webp" alt="👂"></button><button type="button" class="jr-eigen" data-spel="memo"><img class="jr-prent" src="/img/junior/prent/1f0cf.webp" alt="🃏"></button><button type="button" class="jr-eigen" data-spel="tel"><img class="jr-prent" src="/img/junior/prent/1f522.webp" alt="🔢"></button><button type="button" class="jr-eigen" data-spel="schaduw"><img class="jr-prent" src="/img/junior/prent/1f464.webp" alt="👤"></button><button type="button" class="jr-eigen" data-spel="weg"><img class="jr-prent" src="/img/junior/prent/1fae5.webp" alt="🫥"></button></span></div>
      ${p.woorden.map((w, i) => { const [x, b, br] = SPOT[i]; return `<button type="button" class="jr-rijk-ding jr-eigen" data-ding="${i}" style="left:${x - br / 2}%;width:${br}%;bottom:${100 - b}%;z-index:${b}"><img src="${img(id, i)}" alt=""><img class="jr-rijk-struik hidden" src="${STRUIK}" alt=""></button>`; }).join('')}
      <p class="jr-rijk-vraag hidden" data-geen-vertaling></p>
      <div class="jr-rijk-paneel hidden" data-geen-vertaling></div>
      ${doe ? `<button type="button" class="jr-eigen jr-rijk-doe" aria-label="${esc(p.naam)}"><span><img class="jr-prent" src="/img/junior/prent/${[...doe.icoon].filter(c => c !== '\ufe0f').map(c => c.codePointAt(0).toString(16)).join('-')}.webp" alt=""></span></button>` : ''}
      ${mandHtml()}
    </div>`;
    if (doe) vak.querySelector('.jr-rijk-doe').addEventListener('click', () => doeStart(p));
    vak.querySelector('.jr-rijk-terug').addEventListener('click', () => kaart(p.kaart || 1));
    vak.querySelectorAll('[data-spel]').forEach(b => b.addEventListener('click', () => ({ zoek: zoekStart, verstop: verstopStart, niet: nietStart, volg: volgStart, memo: memoStart, tel: telStart, schaduw: schaduwStart, weg: wegStart })[b.dataset.spel](p)));
    vak.querySelectorAll('[data-ding]').forEach(b => b.addEventListener('click', () => tik(p, +b.dataset.ding, b)));
    const m = vak.querySelector('.jr-rijk-mand'); if (m) m.addEventListener('click', () => kaart(p.kaart || 1));
    zeg([p.naam, Z().rijkPlek]);
  }

  function wiebel(b, cls) { b.classList.remove('wiebel', 'nee', 'ja'); void b.offsetWidth; b.classList.add(cls); }
  const knop = i => vak.querySelector(`[data-ding="${i}"]`);
  const vraag = tekst => { const v = vak.querySelector('.jr-rijk-vraag'); if (!v) return; v.classList.remove('met-prent'); v.textContent = tekst || ''; v.classList.toggle('hidden', !tekst); };
  const ster = n => { const s = vak.querySelector('.jr-rijk-sterren'); if (s) s.innerHTML = '<img src="/img/junior/race/ster.webp" alt="">'.repeat(n); };
  function klaar() {
    spel = null; vraag('');
    try { confetti(3000); } catch {}
    fx('fanfare');
    zeg([Z().rijkAllesGevonden]);
  }

  function tik(p, i, b) {
    if (window.JrRijkSpel && JrRijkSpel.tik(i, b)) return;
    if (!spel) {
      wiebel(b, 'wiebel'); fx('marker');
      const k = sleutel(p.id, i);
      if (mand && mand.dingen.some(d => sleutel(d.plek, d.i) === k) && !mand.gevonden.has(k)) {
        mand.gevonden.add(k);
        const m = vak.querySelector('.jr-rijk-mand'); if (m) m.outerHTML = mandHtml();
        const nm = vak.querySelector('.jr-rijk-mand'); if (nm) nm.addEventListener('click', () => kaart(p.kaart || 1));
        fx('good');
        if (mand.gevonden.size >= mand.dingen.length) {
          try { confetti(3500); } catch {}
          fx('fanfare');
          zeg([p.woorden[i], Z().rijkMandVol]);
          mand = null; // op de kaart staat meteen een nieuwe mand klaar
        } else zeg([p.woorden[i], Z().rijkInMand]);
        return;
      }
      zeg([p.woorden[i]]);
      return;
    }
    if (spel.soort === 'zoek') return zoekTik(p, i, b);
    if (spel.soort === 'verstop') return verstopTik(p, i, b);
    if (spel.soort === 'niet') return nietTik(p, i, b);
    if (spel.soort === 'volg') return volgTik(p, i, b);
    if (spel.soort === 'schaduw') return schaduwTik(p, i, b);
  }

  // ---------- Zoekspel: "Waar is de koe?" ----------
  function zoekStart(p) {
    ruim(); herstel(p);
    spel = { soort: 'zoek', plek: p.id, volgorde: schud(p.woorden.map((_, i) => i)), nr: 0 };
    ster(0); zoekVraag(p);
  }
  function zoekVraag(p) {
    if (!spel || spel.plek !== p.id) return;
    const w = p.woorden[spel.volgorde[spel.nr]];
    vraag(`${Z().rijkZoek} ${w}${Z().rijkVraagteken}`);
    zeg([Z().rijkZoek, w]);
  }
  function zoekTik(p, i, b) {
    if (i !== spel.volgorde[spel.nr]) { wiebel(b, 'nee'); fx('bad'); return; }
    wiebel(b, 'ja'); fx('good');
    spel.nr++; ster(spel.nr);
    if (spel.nr >= spel.volgorde.length) return klaar();
    const mijn = spel;
    zeg([Z().rijkGevonden]).then(() => { if (spel === mijn) zoekVraag(p); });
  }

  // ---------- Verstoppertje: kijk goed, alles gaat achter een struik. Waar zat de koe? ----------
  function herstel(p) {
    paneel('');
    const pd = vak.querySelector('.jr-rijk-plaats'); if (pd) pd.classList.remove('doe-aan');
    const pl = vak.querySelector('.jr-rijk-plaats'); if (pl) pl.classList.remove('memo-aan', 'weg-kies');
    vak.querySelectorAll('.jr-rijk-ding').forEach(b => { b.classList.remove('weg', 'open', 'vreemd', 'kwijt'); b.querySelector('img').src = img(p.id, +b.dataset.ding); b.querySelector('.jr-rijk-struik').classList.add('hidden'); });
  }
  function verstopStart(p) {
    ruim(); herstel(p); ster(0);
    const mijn = spel = { soort: 'verstop', plek: p.id, volgorde: schud(p.woorden.map((_, i) => i)), nr: 0, bezig: true };
    vraag(Z().rijkVerstop);
    zeg([Z().rijkVerstop]).then(() => {
      wacht = setTimeout(() => {
        if (spel !== mijn) return;
        vak.querySelectorAll('.jr-rijk-ding').forEach(b => { b.querySelector('.jr-rijk-struik').classList.remove('hidden'); b.classList.add('weg'); });
        fx('marker');
        mijn.bezig = false;
        verstopVraag(p);
      }, 2500);
    });
  }
  function verstopVraag(p) {
    if (!spel || spel.plek !== p.id) return;
    const w = p.woorden[spel.volgorde[spel.nr]];
    vraag(`${Z().rijkWaarZat} ${w}${Z().rijkVraagteken}`);
    zeg([Z().rijkWaarZat, w]);
  }
  function verstopTik(p, i, b) {
    if (spel.bezig || b.classList.contains('open')) return;
    const juist = spel.volgorde[spel.nr];
    if (i !== juist) {
      // Even kijken wat er wel zat, dan weer weg.
      b.classList.add('open'); wiebel(b, 'nee'); fx('bad'); zeg([p.woorden[i]]);
      const mijn = spel;
      setTimeout(() => { if (spel === mijn) b.classList.remove('open'); }, 1300);
      return;
    }
    b.classList.add('open'); b.classList.remove('weg'); b.querySelector('.jr-rijk-struik').classList.add('hidden');
    wiebel(b, 'ja'); fx('good');
    spel.nr++; ster(spel.nr);
    if (spel.nr >= spel.volgorde.length) return klaar();
    const mijn = spel;
    zeg([Z().rijkGevonden]).then(() => { if (spel === mijn) verstopVraag(p); });
  }

  // ---------- Wat hoort hier niet? Eén prent komt van een andere plek. Drie keer. ----------
  function nietStart(p) {
    ruim(); ster(0);
    spel = { soort: 'niet', plek: p.id, nr: 0 };
    nietRonde(p);
  }
  // Een prent van een andere plek die hier niet al staat (de handdoek ligt zowel in het zwembad als in de badkamer).
  function vreemde(p) {
    for (;;) {
      const ander = schud(plekken().filter(x => x.id !== p.id))[0];
      const ai = Math.floor(Math.random() * ander.woorden.length);
      const w = ander.woorden[ai].replace(/^(de|het|een) /, '');
      if (!p.woorden.some(x => x.includes(w) || w.includes(x.replace(/^(de|het|een) /, '')))) return [ander, ai];
    }
  }
  function nietRonde(p) {
    herstel(p);
    const [ander, ai] = vreemde(p);
    const plaats = Math.floor(Math.random() * p.woorden.length);
    const b = knop(plaats);
    b.querySelector('img').src = img(ander.id, ai);
    b.classList.add('vreemd');
    spel.vreemd = { plaats, woord: ander.woorden[ai] };
    vraag(Z().rijkNiet);
    zeg([Z().rijkNiet]);
  }
  function nietTik(p, i, b) {
    if (i !== spel.vreemd.plaats) { wiebel(b, 'nee'); fx('bad'); zeg([p.woorden[i]]); return; }
    wiebel(b, 'ja'); fx('good');
    spel.nr++; ster(spel.nr);
    const mijn = spel;
    zeg([Z().rijkNietJa, spel.vreemd.woord]).then(() => {
      if (spel !== mijn) return;
      if (spel.nr >= 3) { herstel(p); return klaar(); }
      nietRonde(p);
    });
  }

  // ---------- Draakje zegt: tik de dingen in de volgorde waarin het draakje ze noemt (2, 3 en dan 3 dingen). ----------
  const LENGTES = [2, 3, 3];
  function volgStart(p) {
    ruim(); herstel(p); ster(0);
    spel = { soort: 'volg', plek: p.id, nr: 0 };
    volgRonde(p);
  }
  function volgRonde(p) {
    spel.rij = schud(p.woorden.map((_, i) => i)).slice(0, LENGTES[spel.nr]);
    spel.stap = 0;
    volgZeg(p);
  }
  function volgZeg(p) {
    const w = spel.rij.map(i => p.woorden[i]);
    vraag(w.join(' → '));
    zeg([Z().rijkVolgorde, ...w]);
  }
  function volgTik(p, i, b) {
    if (i !== spel.rij[spel.stap]) {
      wiebel(b, 'nee'); fx('bad');
      spel.stap = 0;
      const mijn = spel;
      setTimeout(() => { if (spel === mijn) volgZeg(p); }, 700);
      return;
    }
    wiebel(b, 'ja'); fx('marker');
    spel.stap++;
    if (spel.stap < spel.rij.length) return;
    fx('good');
    spel.nr++; ster(spel.nr);
    if (spel.nr >= LENGTES.length) return klaar();
    const mijn = spel;
    zeg([Z().rijkGevonden]).then(() => { if (spel === mijn) volgRonde(p); });
  }

  // ---------- Op de kaart: waar hoort dit? Het draakje toont een prent, tik op de plek waar die thuishoort. Drie keer. ----------
  function hoortStart(k) {
    ruim(); ster(0);
    spel = { soort: 'hoort', kaart: k, nr: 0 };
    hoortRonde();
  }
  function hoortRonde() {
    const p = schud(opKaart(spel.kaart).filter(x => !spel.vorige || x.id !== spel.vorige))[0];
    if (!p) return;
    const i = Math.floor(Math.random() * p.woorden.length);
    spel.doel = p.id; spel.vorige = p.id; spel.woord = p.woorden[i];
    const v = vak.querySelector('.jr-rijk-hoort');
    v.innerHTML = `<img src="${img(p.id, i)}" alt=""><span>${esc(Z().rijkWaarHoort || '')}</span>`;
    v.classList.remove('hidden');
    zeg([Z().rijkWaarHoort, spel.woord]);
  }
  function hoortTik(b) {
    const p = plekken().find(x => x.id === b.dataset.plek);
    if (b.dataset.plek !== spel.doel) { wiebel(b, 'nee'); fx('bad'); zeg([p ? p.naam : '']); return; }
    wiebel(b, 'ja'); fx('good');
    spel.nr++; ster(spel.nr);
    const mijn = spel;
    zeg([Z().rijkGoedePlek, p ? p.naam : '']).then(() => {
      if (spel !== mijn) return;
      if (spel.nr >= 3) { const v = vak.querySelector('.jr-rijk-hoort'); if (v) v.classList.add('hidden'); return klaar(); }
      hoortRonde();
    });
  }

  // ---------- De doe-opdracht van deze plek (jr-rijk-spel.js): de grote knop rechtsonder. ----------
  function doeStart(p) {
    ruim(); herstel(p); ster(0); vraag('');
    const plaats = vak.querySelector('.jr-rijk-plaats');
    plaats.classList.add('doe-aan');
    JrRijkSpel.start({
      p, plaats, Z, zeg, fx, img, ster, esc, woord,
      klaar: () => { plaats.classList.remove('doe-aan'); klaar(); },
    });
  }

  // Een paneel midden op de plek (memory, tellen, wat is er weg?). Leeg = weg.
  function paneel(html) {
    const el = vak && vak.querySelector('.jr-rijk-paneel');
    if (!el) return null;
    el.innerHTML = html || '';
    el.classList.toggle('hidden', !html);
    return el;
  }

  // ---------- Memory: zes paren van de prenten van deze plek. ----------
  function memoStart(p) {
    ruim(); herstel(p); ster(0);
    const kaarten = schud([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]);
    const mijn = spel = { soort: 'memo', plek: p.id, open: [], paren: 0, bezig: false };
    vak.querySelector('.jr-rijk-plaats').classList.add('memo-aan');
    const el = paneel(`<div class="jr-rijk-memo">${kaarten.map((x, n) => `<button type="button" class="jr-eigen" data-memo="${x}" data-n="${n}"><img src="${img(p.id, x)}" alt=""></button>`).join('')}</div>`);
    vraag(Z().rijkMemory); zeg([Z().rijkMemory]);
    el.querySelectorAll('[data-memo]').forEach(b => b.addEventListener('click', () => {
      if (spel !== mijn || mijn.bezig || b.classList.contains('om') || b.classList.contains('paar')) return;
      b.classList.add('om'); fx('marker');
      const x = +b.dataset.memo;
      zeg([p.woorden[x]]);
      mijn.open.push(b);
      if (mijn.open.length < 2) return;
      const [a, c] = mijn.open;
      mijn.open = [];
      if (a.dataset.memo === c.dataset.memo) {
        a.classList.add('paar'); c.classList.add('paar'); fx('good');
        mijn.paren++; ster(Math.ceil(mijn.paren / 2));
        if (mijn.paren >= 6) { wacht = setTimeout(() => { if (spel === mijn) { herstel(p); klaar(); } }, 900); }
        return;
      }
      mijn.bezig = true;
      setTimeout(() => { if (spel !== mijn) return; a.classList.remove('om'); c.classList.remove('om'); mijn.bezig = false; }, 1200);
    }));
  }

  // ---------- Tellen: hoeveel zie je er? Tik op het juiste aantal (met stippen zoals op een dobbelsteen). ----------
  const STIP = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const steen = n => `<span class="jr-rijk-steen">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => `<i class="${STIP[n].includes(c) ? 'aan' : ''}"></i>`).join('')}</span>`;
  function telStart(p) {
    ruim(); herstel(p); ster(0);
    spel = { soort: 'tel', plek: p.id, nr: 0, vorige: 0 };
    telRonde(p);
  }
  function telRonde(p) {
    const mijn = spel;
    let n; do n = 1 + Math.floor(Math.random() * (mijn.nr < 1 ? 3 : 5)); while (n === mijn.vorige);
    mijn.vorige = n;
    const x = Math.floor(Math.random() * p.woorden.length);
    const el = paneel(`<div class="jr-rijk-tel"><div class="jr-rijk-tel-rij">${Array.from({ length: n }, (_, i) => `<img src="${img(p.id, x)}" alt="" style="animation-delay:${i * 0.12}s">`).join('')}</div>
      <div class="jr-rijk-tel-knoppen">${[1, 2, 3, 4, 5].map(k => `<button type="button" class="jr-eigen" data-tel="${k}">${steen(k)}<b>${k}</b></button>`).join('')}</div></div>`);
    vraag(Z().rijkTel); zeg([Z().rijkTel, p.woorden[x]]);
    el.querySelectorAll('[data-tel]').forEach(b => b.addEventListener('click', () => {
      if (spel !== mijn) return;
      if (+b.dataset.tel !== n) { wiebel(b, 'nee'); fx('bad'); return; }
      wiebel(b, 'ja'); fx('good');
      mijn.nr++; ster(mijn.nr);
      if (mijn.nr >= 3) { wacht = setTimeout(() => { if (spel === mijn) { herstel(p); klaar(); } }, 700); return; }
      zeg([Z().rijkGevonden]).then(() => { if (spel === mijn) telRonde(p); });
    }));
  }

  // ---------- Schaduw: van wie is deze schaduw? Tik op het ding op de plek. ----------
  function schaduwStart(p) {
    ruim(); herstel(p); ster(0);
    spel = { soort: 'schaduw', plek: p.id, volgorde: schud(p.woorden.map((_, i) => i)).slice(0, 4), nr: 0 };
    schaduwVraag(p);
  }
  function schaduwVraag(p) {
    const x = spel.volgorde[spel.nr];
    const v = vak.querySelector('.jr-rijk-vraag');
    v.innerHTML = `<span class="jr-rijk-schijf"><img class="jr-rijk-schaduw" src="${img(p.id, x)}" alt=""></span><span>${esc(Z().rijkSchaduw || '')}</span>`;
    v.classList.remove('hidden'); v.classList.add('met-prent');
    zeg([Z().rijkSchaduw]);
  }
  function schaduwTik(p, i, b) {
    if (i !== spel.volgorde[spel.nr]) { wiebel(b, 'nee'); fx('bad'); zeg([p.woorden[i]]); return; }
    wiebel(b, 'ja'); fx('good');
    const s = vak.querySelector('.jr-rijk-schaduw'); if (s) s.classList.add('licht');
    spel.nr++; ster(spel.nr);
    const mijn = spel;
    zeg([p.woorden[i]]).then(() => {
      if (spel !== mijn) return;
      if (spel.nr >= spel.volgorde.length) { const v = vak.querySelector('.jr-rijk-vraag'); v.classList.remove('met-prent'); return klaar(); }
      schaduwVraag(p);
    });
  }

  // ---------- Wat is er weg? Kijk goed, de struiken komen even, en dan is er één ding verdwenen. Drie keer. ----------
  function wegStart(p) {
    ruim(); ster(0);
    spel = { soort: 'weg', plek: p.id, nr: 0 };
    wegRonde(p);
  }
  function wegRonde(p) {
    herstel(p);
    const mijn = spel;
    const x = Math.floor(Math.random() * p.woorden.length);
    mijn.weg = x; mijn.bezig = true;
    vraag(Z().rijkWegKijk);
    zeg([Z().rijkWegKijk]).then(() => {
      wacht = setTimeout(() => {
        if (spel !== mijn) return;
        vak.querySelectorAll('.jr-rijk-ding').forEach(b => { b.querySelector('.jr-rijk-struik').classList.remove('hidden'); b.classList.add('weg'); });
        fx('marker');
        wacht = setTimeout(() => {
          if (spel !== mijn) return;
          vak.querySelectorAll('.jr-rijk-ding').forEach(b => { b.querySelector('.jr-rijk-struik').classList.add('hidden'); b.classList.remove('weg'); });
          knop(x).classList.add('kwijt');
          // Drie keuzes, allemaal van deze plek: wat weg is en twee dingen die er nog staan. Zo kan het kind vergelijken.
          const keuzes = schud([[p.id, x], ...schud(p.woorden.map((_, i) => i).filter(i => i !== x)).slice(0, 2).map(i => [p.id, i])]);
          // De keuzes komen bovenaan in de plaats van de spelknoppen, zodat alle prenten op de plek zichtbaar blijven.
          const el = paneel(`<div class="jr-rijk-keuzes"><span class="jr-rijk-keuzes-zin">${esc(Z().rijkWeg || '')}</span>${keuzes.map(([id, i]) => `<button type="button" class="jr-eigen" data-k="${id}:${i}"><img src="${img(id, i)}" alt=""></button>`).join('')}</div>`);
          el.classList.add('boven');
          vak.querySelector('.jr-rijk-plaats').classList.add('weg-kies');
          vraag(''); zeg([Z().rijkWeg]);
          mijn.bezig = false;
          el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
            if (spel !== mijn || mijn.bezig) return;
            const [id, i] = b.dataset.k.split(':');
            if (id !== p.id || +i !== x) { wiebel(b, 'nee'); fx('bad'); zeg([woord(id, +i)]); return; }
            wiebel(b, 'ja'); fx('good'); mijn.bezig = true;
            knop(x).classList.remove('kwijt'); wiebel(knop(x), 'ja');
            mijn.nr++; ster(mijn.nr);
            zeg([p.woorden[x]]).then(() => {
              if (spel !== mijn) return;
              if (mijn.nr >= 3) { herstel(p); return klaar(); }
              wegRonde(p);
            });
          }));
        }, 1400);
      }, 2600);
    });
  }

  // ---------- Op de kaart: waar is de kermis? Tik op de plek die het draakje noemt. Drie keer. ----------
  function vindStart(k) {
    ruim(); ster(0);
    spel = { soort: 'vind', kaart: k, volgorde: schud(opKaart(k).map(p => p.id)).slice(0, 3), nr: 0 };
    vindVraag();
  }
  function vindVraag() {
    const p = plekken().find(x => x.id === spel.volgorde[spel.nr]);
    const v = vak.querySelector('.jr-rijk-hoort');
    v.innerHTML = `<span>${esc(Z().rijkZoek || '')} ${esc(p.naam.replace(/^\S+ /, w => (/^(de|het|the|le|la|les|el|los|las|der|die|das)\s$/i.test(w) ? w.toLowerCase() : w)))}${esc(Z().rijkVraagteken || '')}</span>`;
    v.classList.remove('hidden');
    zeg([Z().rijkZoek, p.naam]);
  }
  function vindTik(b) {
    const p = plekken().find(x => x.id === b.dataset.plek);
    if (b.dataset.plek !== spel.volgorde[spel.nr]) { wiebel(b, 'nee'); fx('bad'); zeg([p ? p.naam : '']); return; }
    wiebel(b, 'ja'); fx('good');
    spel.nr++; ster(spel.nr);
    const mijn = spel;
    zeg([Z().rijkGevonden]).then(() => {
      if (spel !== mijn) return;
      if (spel.nr >= spel.volgorde.length) { const v = vak.querySelector('.jr-rijk-hoort'); if (v) v.classList.add('hidden'); return klaar(); }
      vindVraag();
    });
  }

  window.JrRijk = {
    maak(el) { vak = el; kaart(welkeKaart); },
    stop() { ruim(); try { Junior.Stem.stop(); } catch {} },
  };
})();
