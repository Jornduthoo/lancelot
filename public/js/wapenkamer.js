// De Wapenkamer: klastools op het bord. Het Lot, de Banieren, de Zandloper, de Wachtlijst,
// de Stilte-banier, het Werklicht, de Runensteen en de Heraut. Alles draait in deze pagina;
// alleen de klastaken (Wachtlijst) bewaart de server, in klas/klastaken.json.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const bewaarLees = (key, standaard) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? standaard : v; } catch { return standaard; } };
const bewaar = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const schud = lijst => { const a = lijst.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const vandaag = () => new Date().toISOString().slice(0, 10);

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
$('groot').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});

// ---------- De klas en wie er vandaag is ----------
let klas = { leerlingen: [] };
let vakgroepen = [];
let afwezig = new Set();
{
  const a = bewaarLees('lancelot-wk-afwezig', null);
  if (a && a.datum === vandaag() && Array.isArray(a.ids)) afwezig = new Set(a.ids);
}
const aanwezigen = () => klas.leerlingen.filter(l => !afwezig.has(l.id));

function laadKlas() {
  socket.emit('klas-get', null, res => {
    if (!res || res.error) return;
    klas = res.klas;
    vakgroepen = res.vakgroepen || [];
    $('ban-vak').innerHTML = '<option value="">Algemeen</option>' + vakgroepen.map(g => `<option value="${g.id}">${esc(g.naam)}</option>`).join('');
    $('geen-klas').classList.toggle('hidden', klas.leerlingen.length > 0);
    toonAanwezig();
    Lot.klasNieuw();
    Banieren.klasNieuw();
    Wachtlijst.teken();
  });
}
socket.on('connect', laadKlas);
socket.on('klas-namen', laadKlas);

function toonAanwezig() {
  const n = aanwezigen().length;
  $('aanwezig').querySelector('span').textContent = afwezig.size ? `${n} van ${klas.leerlingen.length} aanwezig` : 'Aanwezig';
  $('aanwezig-namen').innerHTML = klas.leerlingen.map(l => `<button class="${afwezig.has(l.id) ? 'weg' : ''}" data-id="${l.id}">${esc(l.naam)}</button>`).join('');
}
$('aanwezig').addEventListener('click', () => $('aanwezig-venster').showModal());
$('aanwezig-dicht').addEventListener('click', () => $('aanwezig-venster').close());
$('aanwezig-venster').addEventListener('click', e => { if (e.target === $('aanwezig-venster')) $('aanwezig-venster').close(); });
$('aanwezig-namen').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const id = b.dataset.id;
  if (afwezig.has(id)) afwezig.delete(id); else afwezig.add(id);
  bewaar('lancelot-wk-afwezig', { datum: vandaag(), ids: [...afwezig] });
  toonAanwezig();
  Lot.klasNieuw();
});

// ---------- Het rek: welke tool open is ----------
const TOOLS = ['lot', 'banieren', 'zandloper', 'wachtlijst', 'stilte', 'werklicht', 'runensteen', 'heraut'];
let huidig = '';
function open() {
  const tool = TOOLS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'lot';
  if (huidig === 'stilte' && tool !== 'stilte') Stilte.stop();
  huidig = tool;
  for (const t of TOOLS) $(`t-${t}`).classList.toggle('hidden', t !== tool);
  for (const a of document.querySelectorAll('#rek a')) a.classList.toggle('on', a.dataset.tool === tool);
  bewaar('lancelot-wk-tool', tool);
  Klok.toonMini();
  Licht.toonMini();
}
if (!location.hash) history.replaceState(null, '', `#${bewaarLees('lancelot-wk-tool', 'lot')}`);
addEventListener('hashchange', () => { open(); sfx.tick(); });

// ---------- Het Lot ----------
const Lot = (() => {
  const canvas = $('lot-canvas');
  const ctx = canvas.getContext('2d');
  // Wapenschildkleuren voor de vakken: [licht, donker].
  const KLEUREN = [['#c22a2a', '#5e0d0d'], ['#2c5cb8', '#0e2357'], ['#d9a632', '#6e4a0c'], ['#2f8a4c', '#0d3a1d'], ['#7a3fa0', '#2e1145'], ['#b8561c', '#4f1f05']];
  let geweest = bewaarLees('lancelot-wk-lot', { datum: '', ids: [] });
  if (geweest.datum !== vandaag()) geweest = { datum: vandaag(), ids: [] };
  let pot = [];
  let hoek = 0; // in graden, de huidige stand van het rad
  let bezig = false;

  function rad() {
    const eruit = $('lot-eruit').checked;
    return aanwezigen().filter(l => !eruit || !geweest.ids.includes(l.id));
  }

  // Een korrelig perkamentpatroon, één keer gemaakt, over de vakken gelegd.
  let korrel = null;
  function korrelPatroon() {
    if (korrel) return korrel;
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const k = c.getContext('2d');
    for (let i = 0; i < 1400; i++) {
      k.fillStyle = Math.random() < .5 ? 'rgba(255,240,200,.5)' : 'rgba(0,0,0,.5)';
      k.fillRect(Math.random() * 160, Math.random() * 160, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    k.strokeStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 26; i++) {
      k.beginPath();
      const x = Math.random() * 160, y = Math.random() * 160;
      k.moveTo(x, y); k.quadraticCurveTo(x + 20, y + Math.random() * 10 - 5, x + 30 + Math.random() * 30, y + Math.random() * 6 - 3);
      k.stroke();
    }
    return (korrel = ctx.createPattern(c, 'repeat'));
  }

  // Een houten ring met nerven tussen twee stralen.
  function houtRing(r1, r2) {
    const hout = ctx.createRadialGradient(0, 0, r1, 0, 0, r2);
    hout.addColorStop(0, '#3e2412');
    hout.addColorStop(.35, '#8a5a2f');
    hout.addColorStop(.7, '#a46e3b');
    hout.addColorStop(1, '#4a2c14');
    ctx.fillStyle = hout;
    ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.arc(0, 0, r1, 0, Math.PI * 2, true); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,6,.45)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const r = r1 + (r2 - r1) * (i + .5) / 7, a0 = Math.random() * 6.28;
      ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + 1.5 + Math.random() * 2.5); ctx.stroke();
    }
    // Voegen tussen de houten stukken
    ctx.strokeStyle = 'rgba(25,12,3,.8)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + .2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    }
  }

  // Een ijzeren band met klinknagels.
  function ijzerRing(r1, r2, nagels) {
    const ijzer = ctx.createRadialGradient(0, 0, r1, 0, 0, r2);
    ijzer.addColorStop(0, '#1b1e26');
    ijzer.addColorStop(.45, '#6c7383');
    ijzer.addColorStop(.6, '#9aa2b2');
    ijzer.addColorStop(1, '#22262f');
    ctx.fillStyle = ijzer;
    ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.arc(0, 0, r1, 0, Math.PI * 2, true); ctx.fill();
    const rm = (r1 + r2) / 2, rn = Math.max(3.5, (r2 - r1) * .22);
    for (let i = 0; i < nagels; i++) {
      const a = i * Math.PI * 2 / nagels, x = Math.cos(a) * rm, y = Math.sin(a) * rm;
      const g = ctx.createRadialGradient(x - rn * .35, y - rn * .35, 0, x, y, rn);
      g.addColorStop(0, '#f1f3f8'); g.addColorStop(.5, '#8a92a3'); g.addColorStop(1, '#2a2e38');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rn, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Het rad van fortuin wordt één keer getekend; draaien is daarna alleen een CSS-rotatie (zuinig op Chromebooks en het bord).
  function teken() {
    pot = rad();
    const W = canvas.width, H = W / 2;
    const R_BAND = H - 4, R_HOUT = R_BAND - 24, R = R_HOUT - 38;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(H, H);
    const n = Math.max(pot.length, 1);
    const stuk = Math.PI * 2 / n;
    const fs = Math.max(14, Math.min(40, 820 / n));
    // Kleuren zo kiezen dat de laatste en de eerste niet gelijk zijn.
    const kl = i => KLEUREN[(n > 1 && n % KLEUREN.length === 1 && i === n - 1 ? 2 : i) % KLEUREN.length];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * stuk;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a, a + stuk);
      ctx.closePath();
      const kleur = pot.length ? kl(i) : ['#4a3a2a', '#241a10'];
      const gr = ctx.createRadialGradient(0, 0, R * .12, 0, 0, R);
      gr.addColorStop(0, kleur[1]);
      gr.addColorStop(.55, kleur[0]);
      gr.addColorStop(1, kleur[1]);
      ctx.fillStyle = gr;
      ctx.fill();
    }
    // Perkamentkorrel en een warme glans uit de fakkels linksboven.
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = korrelPatroon();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const glans = ctx.createLinearGradient(-R, -R, R, R);
    glans.addColorStop(0, 'rgba(255,220,150,.22)');
    glans.addColorStop(.5, 'rgba(255,220,150,0)');
    glans.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = glans;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    // Gouden lijnen tussen de vakken, met een donkere schaduw ernaast.
    if (pot.length > 1) {
      for (const [kleur, dik, schuif] of [['rgba(20,10,2,.65)', 5, .004], ['#e8c06a', 2.4, 0]]) {
        ctx.strokeStyle = kleur;
        ctx.lineWidth = Math.max(1.4, dik - n / 14);
        ctx.beginPath();
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * stuk + schuif; ctx.moveTo(Math.cos(a) * R * .2, Math.sin(a) * R * .2); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
        ctx.stroke();
      }
    }
    // Namen in een middeleeuwse letter.
    if (pot.length) {
      ctx.font = `700 ${fs}px Cinzel, Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.rotate(-Math.PI / 2 + i * stuk + stuk / 2);
        let naam = pot[i].naam;
        while (ctx.measureText(naam).width > R - 120 && naam.length > 3) naam = naam.slice(0, -2) + '…';
        ctx.lineWidth = Math.max(3, fs * .2);
        ctx.strokeStyle = 'rgba(20,10,2,.85)';
        ctx.strokeText(naam, R - 22, 1);
        ctx.fillStyle = '#fff1cf';
        ctx.fillText(naam, R - 22, 1);
        ctx.restore();
      }
    }
    // Een dun cyaan runenlijntje: het sci-fi randje.
    ctx.save();
    ctx.shadowColor = '#5ee7ff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(150,240,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // De velg: hout met gouden spijkers, daarrond de ijzeren band.
    houtRing(R + 2, R_HOUT);
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 + Math.PI / 16, x = Math.cos(a) * (R + 21), y = Math.sin(a) * (R + 21);
      const g = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 7);
      g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#d9a632'); g.addColorStop(1, '#5a3c08');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ijzerRing(R_HOUT, R_BAND, 36);
    // Ijzeren ring rond de naaf
    ijzerRing(R * .27, R * .33, 12);
    ctx.restore();
    const totaal = aanwezigen().length;
    $('lot-tel').textContent = !totaal ? '' : pot.length === totaal ? `${totaal} namen in het rad` : `Nog ${pot.length} van ${totaal} in het rad`;
    $('lot-draai').disabled = !pot.length;
    $('lot-geweest').innerHTML = geweest.ids.length ? '<span class="muted small">Al gekozen:</span> ' + geweest.ids.map(id => klas.leerlingen.find(l => l.id === id)).filter(Boolean).map(l => `<span class="wk-chip">${esc(l.naam)}</span>`).join('') : '';
    $('lot-reset').classList.toggle('hidden', !geweest.ids.length);
  }

  function draai() {
    if (bezig || !pot.length) return;
    bezig = true;
    sfx.unlock();
    $('lot-naam').textContent = '…';
    $('lot-uitslag').classList.remove('raak');
    const n = pot.length;
    const keuze = Math.floor(Math.random() * n);
    const stukGr = 360 / n;
    // Het midden van het gekozen stuk moet bovenaan onder de wijzer eindigen.
    const doel = 360 - (keuze * stukGr + stukGr * (.2 + Math.random() * .6));
    const start = hoek;
    const eind = start - (start % 360) + 360 * 6 + doel;
    const duur = 4800;
    const t0 = performance.now();
    let vorigVak = -1;
    const stap = nu => {
      const p = Math.min(1, (nu - t0) / duur);
      const e = 1 - Math.pow(1 - p, 4);
      hoek = start + (eind - start) * e;
      canvas.style.transform = `rotate(${hoek}deg)`;
      const vak = Math.floor(((360 - (hoek % 360)) % 360) / stukGr);
      if (vak !== vorigVak) { vorigVak = vak; if (p < .97) sfx.tick(p > .7); }
      if (p < 1) return requestAnimationFrame(stap);
      bezig = false;
      kies(pot[keuze]);
    };
    requestAnimationFrame(stap);
  }

  function kies(l) {
    $('lot-naam').textContent = l.naam;
    $('lot-uitslag').classList.add('raak');
    sfx.good();
    confetti(2500);
    if ($('lot-eruit').checked && !geweest.ids.includes(l.id)) {
      geweest.ids.push(l.id);
      bewaar('lancelot-wk-lot', geweest);
      // Even wachten, zodat de klas de naam nog op het rad ziet staan.
      setTimeout(() => { if (!bezig) { hoek = 0; canvas.style.transform = 'rotate(0deg)'; teken(); } }, 1600);
    }
  }

  $('lot-draai').addEventListener('click', draai);
  $('lot-canvas').addEventListener('click', draai);
  $('lot-eruit').addEventListener('change', () => { bewaar('lancelot-wk-eruit', $('lot-eruit').checked); teken(); });
  $('lot-eruit').checked = bewaarLees('lancelot-wk-eruit', true);
  $('lot-reset').addEventListener('click', () => { geweest.ids = []; bewaar('lancelot-wk-lot', geweest); teken(); });
  addEventListener('keydown', e => { if (huidig === 'lot' && (e.code === 'Space' || e.code === 'Enter') && e.target === document.body) { e.preventDefault(); draai(); } });
  // De namen staan in Cinzel: opnieuw tekenen zodra die letter geladen is.
  if (document.fonts) document.fonts.load('700 30px Cinzel').then(() => { if (!bezig) teken(); }, () => {});
  return { klasNieuw: () => { if (!bezig) teken(); } };
})();

// ---------- De Banieren ----------
const Banieren = (() => {
  const NAMEN = ['De Draken', 'De Griffioenen', 'De Leeuwen', 'De Wolven', 'De Valken', 'De Eenhoorns', 'De Feniksen', 'De Beren', 'De Adelaars', 'De Uilen', 'De Vossen', 'De Herten'];
  const KLEUREN = ['rood', 'cyan', 'goud', 'groen', 'paars', 'oranje', 'blauw', 'rood-l', 'cyan-l', 'goud-l', 'groen', 'paars'];
  // Heraldische kleuren voor het doek: [licht, donker].
  const BAN_KLEUR = { rood: ['#c0183c', '#5e0a1d'], cyan: ['#1590c9', '#0a3d5c'], goud: ['#d99a1c', '#5c3a05'], groen: ['#12996c', '#053d2b'], paars: ['#7c45d0', '#2a1050'], oranje: ['#d9621a', '#5a2405'], blauw: ['#2a5fd0', '#0c2260'], 'rood-l': ['#c93aa8', '#4a0c3c'], 'cyan-l': ['#16b3c9', '#053e48'], 'goud-l': ['#b8a03a', '#4a3a08'] };
  let groepen = bewaarLees('lancelot-wk-groepen', []);
  let gekozen = null; // [groep, plaats] van de eerste naam bij het wisselen

  const niveauVan = l => {
    const vak = $('ban-vak').value;
    return (vak && l.vakNiveaus && l.vakNiveaus[vak]) || l.niveau || 'schildknaap';
  };

  function maak() {
    const lijst = schud(aanwezigen());
    if (lijst.length < 2) return Ui.melding('Er zijn te weinig leerlingen aanwezig om groepjes te maken.');
    const getal = Math.max(1, parseInt($('ban-getal').value, 10) || 2);
    let g = $('ban-soort').value === 'per' ? Math.ceil(lijst.length / getal) : getal;
    g = Math.max(1, Math.min(12, lijst.length, g));
    const verdeling = $('ban-verdeling').value;
    const RANG = { ridder: 0, schildknaap: 1, page: 2 };
    const vakken = Array.from({ length: g }, () => []);
    if (verdeling === 'zelfde') {
      // Op niveau gesorteerd, dan in opeenvolgende stukken: elk groepje zoveel mogelijk één niveau.
      lijst.sort((a, b) => RANG[niveauVan(a)] - RANG[niveauVan(b)]);
      let i = 0;
      for (let k = 0; k < g; k++) {
        const grootte = Math.floor(lijst.length / g) + (k < lijst.length % g ? 1 : 0);
        vakken[k].push(...lijst.slice(i, i + grootte));
        i += grootte;
      }
    } else {
      // Gemengd: op niveau gesorteerd en als een slang uitgedeeld, zodat elk niveau over alle groepjes verspreid raakt.
      if (verdeling === 'gemengd') lijst.sort((a, b) => RANG[niveauVan(a)] - RANG[niveauVan(b)]);
      lijst.forEach((l, i) => {
        const ronde = Math.floor(i / g);
        const k = ronde % 2 ? g - 1 - (i % g) : i % g;
        vakken[k].push(l);
      });
    }
    const namen = schud(NAMEN.map((n, i) => [n, KLEUREN[i]]));
    groepen = vakken.map((leden, k) => ({ naam: namen[k][0], kleur: namen[k][1], leden: leden.map(l => l.id) }));
    bewaar('lancelot-wk-groepen', groepen);
    gekozen = null;
    teken(true);
    sfx.go();
  }

  function teken(nieuw) {
    const perId = Object.fromEntries(klas.leerlingen.map(l => [l.id, l]));
    const toonNiveau = $('ban-verdeling').value !== 'los';
    $('ban-raster').innerHTML = groepen.map((g, k) => {
      const [licht, donker] = BAN_KLEUR[g.kleur] || BAN_KLEUR.rood;
      return `
      <div class="ban ${nieuw ? 'hijs' : ''}" style="--ban: ${licht}; --ban-d: ${donker}; animation-delay: ${k * 90}ms">
        <div class="ban-ringen" aria-hidden="true"><i></i><i></i></div>
        <div class="ban-doek">
          <div class="ban-wapen">${ICONS[k % ICONS.length]}</div>
          <strong>${esc(g.naam)}</strong>
          <ul>${g.leden.map((id, p) => {
            const l = perId[id];
            if (!l) return '';
            const sel = gekozen && gekozen[0] === k && gekozen[1] === p;
            return `<li><button data-g="${k}" data-p="${p}" class="${sel ? 'sel' : ''}">${toonNiveau ? `<i title="${Niveau.NAMES[niveauVan(l)]}">${Niveau.ICONS[niveauVan(l)]}</i> ` : ''}${esc(l.naam)}</button></li>`;
          }).join('')}</ul>
        </div>
      </div>`;
    }).join('');
    $('ban-balk').classList.toggle('hidden', !groepen.length);
    $('ban-tip').classList.toggle('hidden', !groepen.length);
  }

  $('ban-raster').addEventListener('click', e => {
    const b = e.target.closest('button[data-g]');
    if (!b) return;
    const plek = [+b.dataset.g, +b.dataset.p];
    if (!gekozen) { gekozen = plek; sfx.tick(); return teken(); }
    if (gekozen[0] !== plek[0] || gekozen[1] !== plek[1]) {
      const a = groepen[gekozen[0]].leden, c = groepen[plek[0]].leden;
      [a[gekozen[1]], c[plek[1]]] = [c[plek[1]], a[gekozen[1]]];
      bewaar('lancelot-wk-groepen', groepen);
      sfx.join();
    }
    gekozen = null;
    teken();
  });
  const soortNieuw = () => {
    const per = $('ban-soort').value === 'per';
    $('ban-getal-label').textContent = per ? 'Leerlingen per groepje' : 'Aantal groepjes';
  };
  $('ban-soort').addEventListener('change', soortNieuw);
  $('ban-verdeling').addEventListener('change', () => { $('ban-vak-label').classList.toggle('hidden', $('ban-verdeling').value === 'los'); teken(); });
  $('ban-vak').addEventListener('change', () => teken());
  $('ban-maak').addEventListener('click', maak);
  soortNieuw();
  return { klasNieuw: () => teken() };
})();

// ---------- De Zandloper (ook de klok van de Heraut) ----------
const Klok = (() => {
  let totaal = 300; // seconden
  let rest = 300;
  let eindOp = 0; // tijdstip waarop de tijd om is, als hij loopt
  let timer = null;
  let laatsteTik = -1;

  function over() { return eindOp ? Math.max(0, (eindOp - Date.now()) / 1000) : rest; }

  function teken() {
    const s = over();
    const tekst = mmss(Math.ceil(s));
    $('zl-tijd').textContent = tekst;
    $('hr-klok').textContent = tekst;
    $('mini-klok').querySelector('span').textContent = tekst;
    const p = totaal ? 1 - s / totaal : 1;
    // Boven zakt het zand met een kuiltje in het midden; onder groeit een bergje.
    const top = 70 + 74 * p, kuil = eindOp ? Math.min(10, 4 + 14 * p) : 2;
    $('zl-zand-boven').setAttribute('d', p >= 1 ? '' : `M30 ${top} Q100 ${top + kuil * 2} 170 ${top} V152 H30Z`);
    const h = 70 * p, rand = 262 - h * .55, piek = 262 - h * 1.25;
    $('zl-zand-onder').setAttribute('d', p <= 0 ? '' : `M30 264 V${rand} Q100 ${piek * 2 - rand} 170 ${rand} V264Z`);
    $('zl-straal').setAttribute('y2', 262 - h);
    $('zl-straal').classList.toggle('hidden', !eindOp);
    const laatste = eindOp && s <= 10;
    $('zl-tijd').classList.toggle('bijna', !!laatste);
    $('hr-klok').classList.toggle('bijna', !!laatste);
    if (laatste && Math.ceil(s) !== laatsteTik) { laatsteTik = Math.ceil(s); if (s > 0) sfx.tick(true); }
    if (eindOp && s <= 0) klaar();
  }

  function klaar() {
    clearInterval(timer);
    timer = null;
    eindOp = 0;
    rest = 0;
    $('zl-start').textContent = 'Start';
    $('zl-klaar').classList.remove('hidden');
    $('hr-klok').classList.add('om');
    document.body.classList.add('tijd-om');
    setTimeout(() => document.body.classList.remove('tijd-om'), 4000);
    sfx.gong();
    setTimeout(() => sfx.gong(), 900);
    toonMini();
  }

  function zet(sec) {
    clearInterval(timer);
    timer = null;
    eindOp = 0;
    totaal = rest = Math.max(1, Math.min(180 * 60, Math.round(sec)));
    $('zl-start').textContent = 'Start';
    $('zl-klaar').classList.add('hidden');
    $('hr-klok').classList.remove('om');
    teken();
    toonMini();
  }

  function start() {
    if (eindOp) { rest = over(); eindOp = 0; clearInterval(timer); timer = null; $('zl-start').textContent = 'Verder'; teken(); return toonMini(); }
    if (rest <= 0) rest = totaal;
    sfx.unlock();
    $('zl-klaar').classList.add('hidden');
    $('hr-klok').classList.remove('om');
    eindOp = Date.now() + rest * 1000;
    laatsteTik = -1;
    $('zl-start').textContent = 'Pauze';
    // Vier keer per seconde is genoeg: geen animatie die het bord of een Chromebook zwaar belast.
    timer = setInterval(teken, 250);
    teken();
    toonMini();
  }

  function toonMini() {
    $('mini-klok').classList.toggle('hidden', !eindOp || huidig === 'zandloper' || huidig === 'heraut');
  }

  for (const b of document.querySelectorAll('#zl-snel [data-min]')) b.addEventListener('click', () => { zet(b.dataset.min * 60); $('zl-m').value = b.dataset.min; $('zl-s').value = 0; });
  $('zl-eigen').addEventListener('submit', e => { e.preventDefault(); zet((+$('zl-m').value || 0) * 60 + (+$('zl-s').value || 0)); });
  $('zl-start').addEventListener('click', start);
  $('zl-plus').addEventListener('click', () => {
    if (eindOp) { eindOp += 60000; totaal += 60; } else { rest += 60; totaal = Math.max(totaal, rest); }
    $('zl-klaar').classList.add('hidden');
    teken();
  });
  $('zl-reset').addEventListener('click', () => zet(totaal));
  $('mini-klok').addEventListener('click', () => { location.hash = 'zandloper'; });
  teken();
  return { zet, start, toonMini, loopt: () => !!eindOp };
})();

// ---------- De Wachtlijst ----------
const Wachtlijst = (() => {
  let data = null;
  let bewerken = false;

  const maandag = d => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  const datum = s => { const [j, m, d] = s.split('-').map(Number); return new Date(j, m - 1, d); };
  const weken = () => data.auto ? Math.max(0, Math.round((maandag(new Date()) - datum(data.sinds)) / (7 * 864e5))) : 0;

  // De volgorde van de klas: de bewaarde volgorde, met nieuwe leerlingen achteraan.
  function volgorde() {
    const ids = klas.leerlingen.map(l => l.id);
    const lijst = data.volgorde.filter(id => ids.includes(id));
    for (const id of ids) if (!lijst.includes(id)) lijst.push(id);
    return lijst;
  }

  // Elke week schuift iedereen zoveel plaatsen door als er taken te verdelen zijn: zo komt elke leerling om de beurt aan bod.
  function verdeling() {
    const lijst = volgorde();
    const plaatsen = data.taken.reduce((s, t) => s + t.aantal, 0);
    if (!lijst.length) return data.taken.map(t => ({ ...t, namen: [] }));
    const n = lijst.length;
    const week = data.stap + weken();
    let j = ((week * plaatsen) % n + n) % n;
    const naam = id => (klas.leerlingen.find(l => l.id === id) || {}).naam || '?';
    return data.taken.map(t => {
      const namen = [];
      for (let k = 0; k < t.aantal; k++) { if (namen.length < n) namen.push(naam(lijst[j % n])); j++; }
      return { ...t, namen };
    });
  }

  function teken() {
    if (!data) return;
    $('wl-week').textContent = `Week van ${maandag(new Date()).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}`;
    $('wl-raster').innerHTML = !klas.leerlingen.length ? '' : !data.taken.length
      ? '<div class="leeg"><p>Nog geen klastaken.</p><p class="muted small">Klik op Taken aanpassen.</p></div>'
      : verdeling().map((t, i) => `<div class="wl-taak" style="animation-delay:${i * 50}ms; --kantel:${((i * 37) % 7 - 3) * .6}deg"><i class="wl-nagel" aria-hidden="true"></i><div class="wl-taak-naam">${esc(t.naam)}</div>${t.uitleg ? `<div class="wl-taak-uitleg">${esc(t.uitleg)}</div>` : ''}<div class="wl-taak-wie">${t.namen.map(esc).join('<br>') || '<span class="muted">niemand</span>'}</div></div>`).join('');
    $('wl-editor').classList.toggle('hidden', !bewerken);
    if (bewerken) {
      $('wl-rijen').innerHTML = data.taken.map((t, i) => `<div class="wl-rij" data-i="${i}">
        <input type="text" maxlength="40" value="${esc(t.naam)}" aria-label="Taak" placeholder="Taak">
        <input type="text" class="wl-uitleg-in" maxlength="90" value="${esc(t.uitleg || '')}" aria-label="Wat doe je?" placeholder="Wat doe je? (mag leeg)">
        <select aria-label="Hoeveel leerlingen">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === t.aantal ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="secondary icon" data-weg="${i}" aria-label="Taak weg"><i class="ic ic-kruis"></i></button></div>`).join('');
      $('wl-auto').checked = data.auto;
    }
  }

  function leesEditor() {
    data.taken = [...document.querySelectorAll('#wl-rijen .wl-rij')].map(r => ({ naam: r.querySelector('input').value.trim(), uitleg: r.querySelector('.wl-uitleg-in').value.trim(), aantal: +r.querySelector('select').value }));
    data.auto = $('wl-auto').checked;
  }

  function bewaarData() {
    socket.emit('wk-taken-zet', data, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
      data = res.data;
      teken();
    });
  }

  // Doorschuiven telt bij de stap op; zonder vanzelf doorschuiven is dat de enige manier.
  $('wl-verder').addEventListener('click', () => { if (!data) return; data.stap++; sfx.whoosh(); bewaarData(); });
  $('wl-terug').addEventListener('click', () => { if (!data) return; data.stap--; bewaarData(); });
  $('wl-bewerk').addEventListener('click', () => { bewerken = !bewerken; teken(); });
  $('wl-erbij').addEventListener('click', () => { leesEditor(); data.taken.push({ naam: '', aantal: 1 }); teken(); const r = document.querySelectorAll('#wl-rijen input'); r[r.length - 1].focus(); });
  $('wl-rijen').addEventListener('click', e => { const b = e.target.closest('[data-weg]'); if (!b) return; leesEditor(); data.taken.splice(+b.dataset.weg, 1); teken(); });
  $('wl-schud').addEventListener('click', async () => {
    if (!(await Ui.vraag('Een nieuwe willekeurige volgorde maken? Wie welke taak heeft, verandert dan meteen.', { ja: 'Schud' }))) return;
    leesEditor();
    data.volgorde = schud(klas.leerlingen.map(l => l.id));
    bewaarData();
  });
  $('wl-bewaar').addEventListener('click', () => {
    const auto = data.auto;
    leesEditor();
    // Vanzelf doorschuiven aanzetten: tel vanaf deze week, zodat de verdeling van vandaag blijft staan.
    if (data.auto !== auto) {
      const nu = maandag(new Date());
      if (auto) data.stap += Math.max(0, Math.round((nu - datum(data.sinds)) / (7 * 864e5)));
      data.sinds = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-${String(nu.getDate()).padStart(2, '0')}`;
    }
    bewerken = false;
    bewaarData();
  });
  socket.on('wk-taken', d => { data = d; teken(); });
  socket.on('connect', () => socket.emit('wk-taken-get', null, res => { if (res && res.data) { data = res.data; teken(); } }));
  return { teken };
})();

// ---------- De Stilte-banier ----------
const Stilte = (() => {
  let stroom = null, actx = null, meter = null, timer = null;
  let niveau = 0, luidSinds = 0, rust = 0, vorige = 0;
  const buf = new Float32Array(1024);

  async function start() {
    if (stroom) return stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Ui.melding('De micro werkt alleen op het bord zelf (de pc waarop LANcelot draait), niet op een gekoppelde bureau-pc.');
    }
    // De geluidsmotor meteen bij de klik maken: anders blijft hij op sommige toestellen stil staan.
    actx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      stroom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      stroom = null;
      actx.close();
      actx = null;
      return Ui.melding('LANcelot mag de micro niet gebruiken. Klik in de adresbalk op het slotje en zet de microfoon aan, of sluit een micro aan.');
    }
    if (actx.state === 'suspended') actx.resume();
    meter = actx.createAnalyser();
    meter.fftSize = 1024;
    actx.createMediaStreamSource(stroom).connect(meter);
    $('st-start').textContent = 'Stop de micro';
    $('st-uitleg').textContent = 'Komt het geluid boven de lijn, dan wordt de banier rood. Schuif de lijn hoger of lager bij "Zo luid mag het".';
    vorige = Date.now();
    // Tien keer per seconde meten is genoeg en spaart het bord.
    timer = setInterval(meet, 100);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (stroom) stroom.getTracks().forEach(t => t.stop());
    if (actx) actx.close();
    stroom = actx = meter = null;
    $('st-start').textContent = 'Start de micro';
    $('st-veld').classList.remove('luid', 'bijna');
  }

  function meet() {
    meter.getFloatTimeDomainData(buf);
    let som = 0;
    for (let i = 0; i < buf.length; i++) som += buf[i] * buf[i];
    const db = 20 * Math.log10(Math.sqrt(som / buf.length) || 1e-8);
    // Van ongeveer -60 dB (stil lokaal) tot -10 dB (luid) naar 0 tot 100.
    const doel = Math.max(0, Math.min(100, (db + 60) * 2));
    niveau += (doel - niveau) * (doel > niveau ? .5 : .15);
    const grens = +$('st-grens').value;
    const nu = Date.now();
    const luid = niveau > grens;
    if (luid) { if (!luidSinds) luidSinds = nu; } else luidSinds = 0;
    const teLuid = luidSinds && nu - luidSinds > 800;
    if (!teLuid) rust += (nu - vorige) / 1000;
    vorige = nu;
    $('st-vul').setAttribute('y', 270 - niveau * 2.5);
    $('st-vul').setAttribute('height', niveau * 2.5);
    $('st-veld').classList.toggle('luid', !!teLuid);
    $('st-veld').classList.toggle('bijna', !teLuid && niveau > grens * .8);
    $('st-tekst').textContent = teLuid ? 'Te luid!' : niveau > grens * .8 ? 'Opgelet…' : 'Mooi stil';
    $('st-rust').textContent = mmss(rust);
  }

  const lijn = () => { const y = 270 - $('st-grens').value * 2.5; $('st-lijn').setAttribute('y1', y); $('st-lijn').setAttribute('y2', y); bewaar('lancelot-wk-grens', +$('st-grens').value); };
  $('st-grens').value = bewaarLees('lancelot-wk-grens', 55);
  $('st-grens').addEventListener('input', lijn);
  $('st-start').addEventListener('click', start);
  lijn();
  return { stop };
})();

// ---------- Het Werklicht ----------
const Licht = (() => {
  const LICHT = {
    rood: { titel: 'Stil werken', tekst: 'Iedereen werkt alleen en in stilte. Een vraag? Steek je hand op.' },
    oranje: { titel: 'Fluisteren', tekst: 'Je mag zachtjes overleggen met je buur.' },
    groen: { titel: 'Samenwerken', tekst: 'Overleg in je groepje, op een rustige toon.' },
  };
  let aan = bewaarLees('lancelot-wk-licht', '');
  function teken() {
    for (const b of document.querySelectorAll('.wl-lamp')) b.classList.toggle('aan', b.dataset.licht === aan);
    $('t-werklicht').dataset.licht = aan;
    $('licht-titel').textContent = aan ? LICHT[aan].titel : 'Tik op een lamp';
    $('licht-tekst').textContent = aan ? LICHT[aan].tekst : 'Rood: stil werken. Oranje: fluisteren. Groen: samenwerken.';
    $('licht-uit').classList.toggle('hidden', !aan);
    toonMini();
  }
  function toonMini() {
    $('mini-licht').classList.toggle('hidden', !aan || huidig === 'werklicht');
    $('mini-licht').dataset.licht = aan;
    $('mini-licht').querySelector('span').textContent = aan ? LICHT[aan].titel : '';
  }
  for (const b of document.querySelectorAll('.wl-lamp')) b.addEventListener('click', () => { aan = b.dataset.licht; bewaar('lancelot-wk-licht', aan); sfx.tick(); teken(); });
  $('licht-uit').addEventListener('click', () => { aan = ''; bewaar('lancelot-wk-licht', aan); teken(); });
  $('mini-licht').addEventListener('click', () => { location.hash = 'werklicht'; });
  teken();
  return { toonMini };
})();

// ---------- De Runensteen ----------
(() => {
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  let bezig = false;
  const bereik = () => {
    const s = $('rs-soort').value;
    if (s !== 'eigen') return [1, +s];
    const a = Math.round(+$('rs-van').value || 0), b = Math.round(+$('rs-tot').value || 0);
    return [Math.min(a, b), Math.max(a, b)];
  };
  const steen = (w, rol) => {
    const zes = $('rs-soort').value === '6';
    const binnen = zes ? `<div class="rs-pips">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[w].includes(i) ? 'aan' : ''}"></i>`).join('')}</div>` : `<b>${w}</b>`;
    return `<div class="rs-steen ${zes ? 'zes' : ''} ${rol ? 'rol' : ''}">${binnen}</div>`;
  };
  function gooi() {
    if (bezig) return;
    bezig = true;
    sfx.unlock();
    const n = +$('rs-aantal').value;
    const [lo, hi] = bereik();
    const worp = () => Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
    let k = 0;
    $('rs-som').textContent = '';
    const t = setInterval(() => {
      const w = worp();
      $('rs-stenen').innerHTML = w.map(x => steen(x, true)).join('');
      sfx.tick(k % 2);
      if (++k < 9) return;
      clearInterval(t);
      $('rs-stenen').innerHTML = w.map(x => steen(x, false)).join('');
      $('rs-som').textContent = n > 1 ? `Samen: ${w.reduce((a, b) => a + b, 0)}` : '';
      sfx.join();
      bezig = false;
    }, 80);
  }
  $('rs-soort').addEventListener('change', () => $('rs-eigen').classList.toggle('hidden', $('rs-soort').value !== 'eigen'));
  $('rs-gooi').addEventListener('click', gooi);
  $('rs-stenen').addEventListener('click', gooi);
  $('rs-stenen').innerHTML = steen(6, false) + steen(3, false);
})();

// ---------- De Heraut ----------
(() => {
  let vorige = bewaarLees('lancelot-wk-heraut', []);
  function tekenVorige() {
    $('hr-vorige').innerHTML = vorige.length ? '<span class="muted small">Eerder:</span> ' + vorige.map((t, i) => `<button class="secondary" data-i="${i}">${esc(t.length > 40 ? t.slice(0, 38) + '…' : t)}</button>`).join('') : '';
  }
  function toon() {
    const tekst = $('hr-tekst').value.trim();
    if (!tekst) return $('hr-tekst').focus();
    vorige = [tekst, ...vorige.filter(t => t !== tekst)].slice(0, 6);
    bewaar('lancelot-wk-heraut', vorige);
    $('hr-opdracht').textContent = tekst;
    $('hr-opdracht').style.fontSize = tekst.length > 160 ? '2.2rem' : tekst.length > 80 ? '3rem' : '4rem';
    const min = +$('hr-tijd').value;
    $('hr-klok').classList.toggle('hidden', !min);
    if (min) { Klok.zet(min * 60); Klok.start(); }
    $('hr-maak').classList.add('hidden');
    $('hr-bord').classList.remove('hidden');
    sfx.go();
  }
  $('hr-toon').addEventListener('click', toon);
  $('hr-bewerk').addEventListener('click', () => { $('hr-bord').classList.add('hidden'); $('hr-maak').classList.remove('hidden'); tekenVorige(); });
  $('hr-vorige').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) $('hr-tekst').value = vorige[+b.dataset.i]; });
  tekenVorige();
})();

// ---------- De zaal ----------
// Eén keer tekenen per schermgrootte (niet groter dan nodig), de fakkels zijn CSS-vlammen.
(() => {
  const doek = $('wk-zaal');
  let wacht = null;
  function teken() {
    const k = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.min(3000, Math.round(innerWidth * k)), h = Math.round(innerHeight * k);
    const { canvas, fakkels } = WkArt.zaal(w, h);
    doek.width = w;
    doek.height = h;
    doek.getContext('2d').drawImage(canvas, 0, 0);
    $('wk-vlammen').innerHTML = fakkels.map(([x, y], i) => `<i style="left:${x * 100}%;top:${y * 100}%;animation-delay:-${i * .37}s"></i>`).join('');
  }
  addEventListener('resize', () => { clearTimeout(wacht); wacht = setTimeout(teken, 200); });
  teken();
})();

open();
