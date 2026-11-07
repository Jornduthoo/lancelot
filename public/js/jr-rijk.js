// LANcelot Junior · Het Toverdorp: een geschilderd dorp met zes plekken. Op elke plek tik je op wat je ziet
// (het draakje zegt het woord), of speel je het zoekspel ("Waar is de koe?"). Zelfde onderdeel op de tablet en op het bord.
// JrRijk.maak(vak) tekent alles in vak; JrRijk.stop() stopt het zoekspel.
(function () {
  const J = () => window.JR || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Waar elke plek op de kaart ligt (midden, in %).
  const KAART = { boerderij: [14, 24], bos: [47, 17], vijver: [85, 22], markt: [15, 74], kasteel: [50, 74], tuin: [85, 72] };
  // Waar de zes prenten op een plek staan: midden (%), onderkant (%), breedte (%).
  const SPOT = [[17, 80, 18], [39, 92, 17], [62, 90, 17], [84, 80, 18], [28, 58, 13], [72, 56, 13]];
  let vak = null;
  let zoek = null; // { plek, volgorde, nr }
  const zeg = stukken => { try { return Junior.Stem.zeg(stukken); } catch { return Promise.resolve(); } };
  const fx = naam => { try { sfx[naam](); } catch {} };

  function kaart() {
    zoek = null;
    const plekken = J().rijk || [];
    vak.innerHTML = `<div class="jr-rijk jr-rijk-kaart">
      ${plekken.map(p => { const [x, y] = KAART[p.id] || [50, 50]; return `<button type="button" class="jr-rijk-plek jr-eigen" data-plek="${p.id}" style="left:${x}%;top:${y}%"><span>${esc(p.naam)}</span></button>`; }).join('')}
    </div>`;
    vak.querySelectorAll('[data-plek]').forEach(b => b.addEventListener('click', () => { fx('jump'); plek(b.dataset.plek); }));
    zeg([J().zin && J().zin.rijkKaart]);
  }

  function plek(id) {
    zoek = null;
    const p = (J().rijk || []).find(x => x.id === id);
    if (!p) return kaart();
    vak.innerHTML = `<div class="jr-rijk jr-rijk-plaats" style="--bg:url(/img/junior/rijk/${id}/bg.webp);--bg-klein:url(/img/junior/rijk/${id}/bg-klein.webp)">
      <div class="jr-rijk-balk"><button type="button" class="jr-rijk-terug jr-eigen" aria-label="Kaart">🗺️</button><b>${esc(p.naam)}</b>
        <span class="jr-rijk-sterren" data-geen-vertaling></span><button type="button" class="jr-rijk-zoek jr-eigen">🔍</button></div>
      ${p.woorden.map((w, i) => { const [x, b, br] = SPOT[i]; return `<button type="button" class="jr-rijk-ding jr-eigen" data-ding="${i}" style="left:${x - br / 2}%;width:${br}%;bottom:${100 - b}%;z-index:${b}"><img src="/img/junior/rijk/${id}/${i + 1}.webp" alt=""></button>`; }).join('')}
      <p class="jr-rijk-vraag hidden" data-geen-vertaling></p>
    </div>`;
    vak.querySelector('.jr-rijk-terug').addEventListener('click', kaart);
    vak.querySelector('.jr-rijk-zoek').addEventListener('click', () => zoekStart(p));
    vak.querySelectorAll('[data-ding]').forEach(b => b.addEventListener('click', () => tik(p, +b.dataset.ding, b)));
    zeg([p.naam, J().zin && J().zin.rijkPlek]);
  }

  function wiebel(b, cls) { b.classList.remove('wiebel', 'nee', 'ja'); void b.offsetWidth; b.classList.add(cls); }

  function tik(p, i, b) {
    if (!zoek) { wiebel(b, 'wiebel'); fx('marker'); zeg([p.woorden[i]]); return; }
    const juist = zoek.volgorde[zoek.nr];
    if (i !== juist) { wiebel(b, 'nee'); fx('bad'); return; }
    wiebel(b, 'ja');
    fx('good');
    zoek.nr++;
    vak.querySelector('.jr-rijk-sterren').innerHTML = '<img src="/img/junior/race/ster.webp" alt="">'.repeat(zoek.nr);
    if (zoek.nr >= zoek.volgorde.length) {
      zoek = null;
      vak.querySelector('.jr-rijk-vraag').classList.add('hidden');
      try { confetti(3000); } catch {}
      fx('fanfare');
      zeg([J().zin.rijkAllesGevonden]);
      return;
    }
    zeg([J().zin.rijkGevonden]).then(() => zoekVraag(p));
  }

  function zoekStart(p) {
    const volgorde = p.woorden.map((_, i) => i).sort(() => Math.random() - 0.5);
    zoek = { plek: p.id, volgorde, nr: 0 };
    vak.querySelector('.jr-rijk-sterren').innerHTML = '';
    zoekVraag(p);
  }
  function zoekVraag(p) {
    if (!zoek || zoek.plek !== p.id) return;
    const z = J().zin;
    const w = p.woorden[zoek.volgorde[zoek.nr]];
    const vraag = vak.querySelector('.jr-rijk-vraag');
    vraag.textContent = `${z.rijkZoek} ${w}${z.rijkVraagteken}`;
    vraag.classList.remove('hidden');
    zeg([z.rijkZoek, w]);
  }

  window.JrRijk = {
    maak(el) { vak = el; kaart(); },
    stop() { zoek = null; try { Junior.Stem.stop(); } catch {} },
  };
})();
