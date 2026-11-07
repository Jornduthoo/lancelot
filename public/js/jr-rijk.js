// LANcelot Junior · Het Toverdorp: drie geschilderde kaarten (over de brug) met elk zes plekken. Op elke plek:
// tik op wat je ziet (het draakje zegt het woord), het zoekspel ("Waar is de koe?"), verstoppertje (onthoud waar alles stond)
// "wat hoort hier niet?" en "draakje zegt" (tik in de goede volgorde). Op de kaart: "waar hoort dit?" en vraagt het draakje om drie dingen uit het hele dorp in je mand te stoppen.
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
  };
  // De wegwijzers naar de andere kaarten: [links, boven, prent, naar kaart].
  const BRUG = { 1: [[94, 47, 5, 2]], 2: [[8, 51, 6, 1], [93, 44, 5, 3]], 3: [[9, 46, 6, 2]] };
  // Waar de zes prenten op een plek staan: midden (%), onderkant (%), breedte (%).
  const SPOT = [[17, 80, 18], [39, 92, 17], [62, 90, 17], [84, 80, 18], [28, 58, 13], [72, 56, 13]];
  const STRUIK = '/img/junior/rijk/extra/1.webp';
  const MAND = '/img/junior/rijk/extra/3.webp';
  let vak = null;
  let welkeKaart = 1;
  let spel = null; // { soort: 'zoek' | 'verstop' | 'niet', plek, ... }
  let mand = null; // { dingen: [{ plek, i }], gevonden: Set }
  let wacht = null;
  const zeg = stukken => { try { return Junior.Stem.zeg(stukken); } catch { return Promise.resolve(); } };
  const fx = naam => { try { sfx[naam](); } catch {} };
  const schud = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const plekken = () => J().rijk || [];
  const opKaart = k => plekken().filter(p => (p.kaart || 1) === k);
  const img = (id, i) => `/img/junior/rijk/${id}/${i + 1}.webp`;
  const sleutel = (id, i) => `${id}:${i}`;
  const ruim = () => { spel = null; if (wacht) { clearTimeout(wacht); wacht = null; } };

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
      <div class="jr-rijk-balk jr-rijk-balk-kaart"><span class="jr-rijk-sterren" data-geen-vertaling></span><span class="jr-rijk-spellen"><button type="button" class="jr-eigen" data-kaartspel="hoort">🧭</button></span></div>
      <p class="jr-rijk-vraag jr-rijk-hoort hidden" data-geen-vertaling></p>
      ${opKaart(k).map(p => { const [x, y] = KAART[p.id] || [50, 50]; const hier = mand.dingen.some(d => d.plek === p.id && !mand.gevonden.has(sleutel(d.plek, d.i))); return `<button type="button" class="jr-rijk-plek jr-eigen ${hier ? 'mand-hier' : ''}" data-plek="${p.id}" style="left:${x}%;top:${y}%"><span>${esc(p.naam)}</span></button>`; }).join('')}
      ${BRUG[k].map(([bx, by, bi, naar]) => `<button type="button" class="jr-rijk-brug jr-eigen" data-naar="${naar}" style="left:${bx}%;top:${by}%" aria-label="${esc(Z().rijkBrug || '')}"><img src="/img/junior/rijk/extra/${bi}.webp" alt=""></button>`).join('')}
      ${mandHtml()}
    </div>`;
    vak.querySelectorAll('[data-plek]').forEach(b => b.addEventListener('click', () => {
      if (spel && spel.soort === 'hoort') return hoortTik(b);
      fx('jump'); plek(b.dataset.plek);
    }));
    vak.querySelectorAll('.jr-rijk-brug').forEach(b => b.addEventListener('click', () => { fx('jump'); kaart(+b.dataset.naar, false); zeg([Z().rijkBrug]); }));
    vak.querySelector('[data-kaartspel]').addEventListener('click', () => hoortStart(k));
    vak.querySelector('.jr-rijk-mand').addEventListener('click', () => zeg([Z().rijkMand, ...mand.dingen.filter(d => !mand.gevonden.has(sleutel(d.plek, d.i))).map(d => woord(d.plek, d.i))]));
    if (praat) zeg([Z().rijkKaart]);
  }

  function plek(id) {
    ruim();
    const p = plekken().find(x => x.id === id);
    if (!p) return kaart();
    vak.innerHTML = `<div class="jr-rijk jr-rijk-plaats" style="--bg:url(/img/junior/rijk/${id}/bg.webp);--bg-klein:url(/img/junior/rijk/${id}/bg-klein.webp)">
      <div class="jr-rijk-balk"><button type="button" class="jr-rijk-terug jr-eigen" aria-label="Kaart">🗺️</button><b>${esc(p.naam)}</b>
        <span class="jr-rijk-sterren" data-geen-vertaling></span>
        <span class="jr-rijk-spellen"><button type="button" class="jr-eigen" data-spel="zoek">🔍</button><button type="button" class="jr-eigen" data-spel="verstop">🙈</button><button type="button" class="jr-eigen" data-spel="niet">❓</button><button type="button" class="jr-eigen" data-spel="volg">👂</button></span></div>
      ${p.woorden.map((w, i) => { const [x, b, br] = SPOT[i]; return `<button type="button" class="jr-rijk-ding jr-eigen" data-ding="${i}" style="left:${x - br / 2}%;width:${br}%;bottom:${100 - b}%;z-index:${b}"><img src="${img(id, i)}" alt=""><img class="jr-rijk-struik hidden" src="${STRUIK}" alt=""></button>`; }).join('')}
      <p class="jr-rijk-vraag hidden" data-geen-vertaling></p>
      ${mandHtml()}
    </div>`;
    vak.querySelector('.jr-rijk-terug').addEventListener('click', () => kaart(p.kaart || 1));
    vak.querySelectorAll('[data-spel]').forEach(b => b.addEventListener('click', () => ({ zoek: zoekStart, verstop: verstopStart, niet: nietStart, volg: volgStart })[b.dataset.spel](p)));
    vak.querySelectorAll('[data-ding]').forEach(b => b.addEventListener('click', () => tik(p, +b.dataset.ding, b)));
    const m = vak.querySelector('.jr-rijk-mand'); if (m) m.addEventListener('click', () => kaart(p.kaart || 1));
    zeg([p.naam, Z().rijkPlek]);
  }

  function wiebel(b, cls) { b.classList.remove('wiebel', 'nee', 'ja'); void b.offsetWidth; b.classList.add(cls); }
  const knop = i => vak.querySelector(`[data-ding="${i}"]`);
  const vraag = tekst => { const v = vak.querySelector('.jr-rijk-vraag'); if (!v) return; v.textContent = tekst || ''; v.classList.toggle('hidden', !tekst); };
  const ster = n => { const s = vak.querySelector('.jr-rijk-sterren'); if (s) s.innerHTML = '<img src="/img/junior/race/ster.webp" alt="">'.repeat(n); };
  function klaar() {
    spel = null; vraag('');
    try { confetti(3000); } catch {}
    fx('fanfare');
    zeg([Z().rijkAllesGevonden]);
  }

  function tik(p, i, b) {
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
    vak.querySelectorAll('.jr-rijk-ding').forEach(b => { b.classList.remove('weg', 'open', 'vreemd'); b.querySelector('img').src = img(p.id, +b.dataset.ding); b.querySelector('.jr-rijk-struik').classList.add('hidden'); });
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
  function nietRonde(p) {
    herstel(p);
    const ander = schud(plekken().filter(x => x.id !== p.id))[0];
    const ai = Math.floor(Math.random() * ander.woorden.length);
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

  window.JrRijk = {
    maak(el) { vak = el; kaart(welkeKaart); },
    stop() { ruim(); try { Junior.Stem.stop(); } catch {} },
  };
})();
