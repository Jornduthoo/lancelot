// LANcelot Junior · Het Toverdorp: de doe-opdracht van elke plek (de grote knop rechtsonder).
// Negen speelvormen waar kleuters echt iets doen: krassen (wrijf het zand weg), bellen prikken, met de zaklamp zoeken,
// boodschappen in de mand slepen, een toren bouwen, een dier voeren, een puzzel leggen, dingen vangen en muziek naspelen.
// Welke plek welke vorm heeft staat in DOE. JrRijkSpel.start(h) met de hulpjes van jr-rijk.js; JrRijkSpel.stop() ruimt op.
(function () {
  // Per plek: de speelvorm en wat erbij hoort (kleur van de laag om weg te krassen, ballonnen in plaats van bellen ...).
  const DOE = {
    boerderij: { v: 'voer' }, bos: { v: 'zaklamp' }, vijver: { v: 'bel' }, markt: { v: 'lijst' }, kasteel: { v: 'toren' }, tuin: { v: 'kras', laag: 'aarde' },
    strand: { v: 'kras', laag: 'zand' }, speeltuin: { v: 'puzzel' }, station: { v: 'puzzel' }, bakkerij: { v: 'vang' }, dierentuin: { v: 'voer' }, sneeuw: { v: 'kras', laag: 'sneeuw' },
    brandweer: { v: 'kras', laag: 'vuur' }, dokter: { v: 'lijst', zak: true }, haven: { v: 'bel' }, circus: { v: 'muziek' }, school: { v: 'lijst', zak: true }, ruimte: { v: 'zaklamp' },
    zwembad: { v: 'bel' }, kermis: { v: 'bel', ballon: true }, bouwwerf: { v: 'toren' }, winkel: { v: 'lijst' }, onderwater: { v: 'bel' }, dino: { v: 'kras', laag: 'aarde' },
    politie: { v: 'zaklamp' }, eiland: { v: 'kras', laag: 'zand' }, weer: { v: 'vang' }, ijssalon: { v: 'toren' }, garage: { v: 'puzzel' }, muziek: { v: 'muziek' },
    keuken: { v: 'lijst', pot: true }, badkamer: { v: 'bel' }, slaapkamer: { v: 'zaklamp' }, moestuin: { v: 'kras', laag: 'aarde' }, vliegveld: { v: 'puzzel' }, jungle: { v: 'voer' },
  };
  const ICOON = { kras: '🖐️', bel: '🫧', zaklamp: '🔦', lijst: '🛒', toren: '🧱', voer: '🍎', puzzel: '🧩', vang: '🧺', muziek: '🎵' };
  // Wat de dieren lusten: [plek, prent].
  const ETEN = [['markt', 0], ['markt', 1], ['markt', 2], ['markt', 3], ['markt', 4], ['bakkerij', 2], ['bakkerij', 3], ['moestuin', 0], ['moestuin', 1], ['moestuin', 2], ['ijssalon', 0], ['ijssalon', 3], ['winkel', 5], ['winkel', 4]];
  // Welke prenten van een plek dieren zijn die je kunt voeren.
  const DIEREN = { boerderij: [0, 1, 2, 3, 4], dierentuin: [0, 1, 2, 3, 4, 5], jungle: [0, 1, 2, 3, 4, 5] };
  const MAND = '/img/junior/rijk/extra/3.webp';

  let h = null;     // de hulpjes van jr-rijk.js
  let laag = null;  // het speelvlak bovenop de plek
  let loop = 0;     // requestAnimationFrame
  let timers = [];
  let ronde = 0;    // telt mee zodat oude callbacks niets meer doen na stop()
  const later = (f, ms) => { const r = ronde; timers.push(setTimeout(() => { if (r === ronde) f(); }, ms)); };
  const schud = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const Z = () => h.Z();
  const zeg = s => h.zeg(s);
  const fx = n => h.fx(n);
  const vraag = (tekst, prent) => {
    let v = laag.querySelector('.jr-doe-vraag');
    if (!v) { v = document.createElement('p'); v.className = 'jr-doe-vraag'; v.setAttribute('data-geen-vertaling', ''); laag.appendChild(v); }
    v.innerHTML = (prent ? `<img src="${prent}" alt="">` : '') + `<span>${h.esc(tekst || '')}</span>`;
    v.classList.toggle('hidden', !tekst && !prent);
  };
  const maat = () => laag.getBoundingClientRect();
  const wiebel = (el, c) => { el.classList.remove('ja', 'nee', 'wiebel'); void el.offsetWidth; el.classList.add(c); };
  function klaar() {
    const r = ronde;
    later(() => { if (r !== ronde) return; stop(); h.klaar(); }, 600);
  }

  // Slepen met vinger of muis. los(x, y) krijgt het midden in px binnen de laag; geeft het false, dan glijdt de prent terug.
  function sleepbaar(el, los, pak) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = maat(), b = el.getBoundingClientRect();
      const start = { left: el.style.left, top: el.style.top };
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      el.setPointerCapture(e.pointerId);
      el.classList.add('sleept');
      if (pak) pak();
      const zet = ev => { el.style.left = `${ev.clientX - dx - r.left}px`; el.style.top = `${ev.clientY - dy - r.top}px`; };
      zet(e);
      const mv = ev => zet(ev);
      const up = ev => {
        el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        el.classList.remove('sleept');
        if (!laag || !laag.contains(el)) return;
        const ok = los(ev.clientX - dx - r.left, ev.clientY - dy - r.top);
        if (ok === false) { el.classList.add('terug'); el.style.left = start.left; el.style.top = start.top; setTimeout(() => el.classList.remove('terug'), 350); }
      };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
  const binnen = (x, y, el, rand = 0) => { const r = maat(), b = el.getBoundingClientRect(); return x >= b.left - r.left - rand && x <= b.right - r.left + rand && y >= b.top - r.top - rand && y <= b.bottom - r.top + rand; };

  // ---------- Krassen: wrijf het zand (of de sneeuw, de aarde, het vuur) weg. Wat zit eronder? ----------
  const KLEUR = { zand: ['#e9c98a', '#d6ae67'], sneeuw: ['#ffffff', '#dbe9f5'], aarde: ['#8a5a32', '#6b4425'], vuur: ['#ff6b1a', '#ffd43b'] };
  function kras() {
    const p = h.p, soort = DOE[p.id].laag || 'zand';
    let nr = 0;
    const volgorde = schud(p.woorden.map((_, i) => i)).slice(0, 3);
    const ronde1 = () => {
      const x = volgorde[nr];
      laag.querySelector('.jr-doe-kras')?.remove();
      const box = document.createElement('div');
      box.className = 'jr-doe-kras';
      box.innerHTML = `<img src="${h.img(p.id, x)}" alt=""><canvas width="480" height="360"></canvas>`;
      laag.appendChild(box);
      const c = box.querySelector('canvas'), g = c.getContext('2d');
      const [a, b] = KLEUR[soort];
      const grad = g.createLinearGradient(0, 0, 480, 360); grad.addColorStop(0, a); grad.addColorStop(1, b);
      g.fillStyle = grad; g.fillRect(0, 0, 480, 360);
      // korreltjes / sneeuwvlokjes / vlammetjes
      for (let i = 0; i < 380; i++) {
        g.fillStyle = soort === 'vuur' ? `rgba(255,${120 + Math.random() * 120},0,.55)` : soort === 'sneeuw' ? 'rgba(170,200,230,.45)' : `rgba(0,0,0,${0.06 + Math.random() * 0.1})`;
        g.beginPath(); g.arc(Math.random() * 480, Math.random() * 360, 2 + Math.random() * (soort === 'vuur' ? 14 : 5), 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      let klaarMet = false, tel = 0;
      const wrijf = e => {
        if (klaarMet) return;
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) * 480 / r.width, py = (e.clientY - r.top) * 360 / r.height;
        g.beginPath(); g.arc(px, py, 34, 0, 7); g.fill();
        if (++tel % 6 === 0) fx('hooi');
        if (tel % 10) return;
        const d = g.getImageData(0, 0, 480, 360).data;
        let weg = 0;
        for (let i = 3; i < d.length; i += 64) if (d[i] < 40) weg++;
        if (weg / (d.length / 64) > 0.62) {
          klaarMet = true;
          c.classList.add('weg'); box.classList.add('ja');
          fx('good'); nr++; h.ster(nr);
          zeg([p.woorden[x]]).then(() => later(() => { if (nr >= volgorde.length) return klaar(); ronde1(); }, 300));
        }
      };
      c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); wrijf(e); });
      c.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') wrijf(e); });
      vraag(Z().spKras);
    };
    zeg([Z().spKras]);
    ronde1();
  }

  // ---------- Bellen prikken (of ballonnen op de kermis): prik de bel met ... ----------
  function bel() {
    const p = h.p, ballon = !!DOE[p.id].ballon;
    h.plaats.classList.add('doe-weg');
    let nr = 0, doel = -1;
    const bellen = [];
    const nieuwDoel = () => { doel = Math.floor(Math.random() * p.woorden.length); vraag(`${Z().spPrik} ${p.woorden[doel]}`, h.img(p.id, doel)); zeg([Z().spPrik, p.woorden[doel]]); };
    const maak = (x, start) => {
      const r = maat();
      const el = document.createElement('button');
      el.type = 'button'; el.className = `jr-eigen jr-doe-bel ${ballon ? 'ballon' : ''}`;
      // Het doel komt vaak genoeg voorbij.
      const i = Math.random() < 0.35 && doel >= 0 ? doel : Math.floor(Math.random() * p.woorden.length);
      el.dataset.i = i;
      if (ballon) el.style.setProperty('--kl', `hsl(${Math.floor(Math.random() * 360)} 85% 60%)`);
      el.innerHTML = `<img src="${h.img(p.id, i)}" alt="">`;
      laag.appendChild(el);
      const b = { el, x: x ?? (0.08 + Math.random() * 0.84) * r.width, y: start ?? r.height + 60, v: 0.35 + Math.random() * 0.35, f: Math.random() * 6, weg: false };
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (b.weg) return;
        b.weg = true; el.classList.add('plop'); fx('laser');
        setTimeout(() => el.remove(), 350);
        if (+el.dataset.i === doel) {
          fx('good'); nr++; h.ster(nr);
          if (nr >= 5) { cancelAnimationFrame(loop); loop = 0; return klaar(); }
          zeg([p.woorden[doel]]).then(() => later(nieuwDoel, 200));
        } else zeg([p.woorden[+el.dataset.i]]);
      });
      bellen.push(b);
    };
    const r = maat();
    for (let n = 0; n < 6; n++) maak(null, r.height * (0.3 + n * 0.14));
    let t0 = performance.now(), sinds = 0;
    const stap = t => {
      const dt = Math.min(50, t - t0); t0 = t; sinds += dt;
      const rr = maat();
      const s = rr.width / 900; // even snel op elk scherm
      for (const b of bellen) {
        if (b.weg) continue;
        b.y -= b.v * dt * 0.09 * s * (ballon ? 1.2 : 1); b.f += dt * 0.002;
        b.el.style.left = `${b.x + Math.sin(b.f) * 18 * s}px`; b.el.style.top = `${b.y}px`;
        if (b.y < -80) { b.weg = true; b.el.remove(); }
      }
      for (let i = bellen.length - 1; i >= 0; i--) if (bellen[i].weg) bellen.splice(i, 1);
      if (bellen.length < 7 && sinds > 900) { sinds = 0; maak(); }
      loop = requestAnimationFrame(stap);
    };
    loop = requestAnimationFrame(stap);
    nieuwDoel();
  }

  // ---------- Zaklamp: het is donker. Schijn met je vinger en tik op wat het draakje vraagt. ----------
  function zaklamp() {
    const p = h.p;
    let nr = 0;
    const volgorde = schud(p.woorden.map((_, i) => i)).slice(0, 4);
    h.plaats.classList.add('doe-donker');
    const donker = document.createElement('div');
    donker.className = 'jr-doe-donker';
    laag.appendChild(donker);
    const r0 = maat();
    const zet = (x, y) => { donker.style.setProperty('--x', `${x}px`); donker.style.setProperty('--y', `${y}px`); };
    zet(r0.width / 2, r0.height * 0.6);
    const volg = e => { const r = maat(); zet(e.clientX - r.left, e.clientY - r.top); };
    h.plaats.addEventListener('pointermove', volg);
    h.plaats.addEventListener('pointerdown', volg);
    stopjes.push(() => { h.plaats.removeEventListener('pointermove', volg); h.plaats.removeEventListener('pointerdown', volg); });
    const zoek = () => { const x = volgorde[nr]; vraag(`${Z().spZaklamp} ${p.woorden[x]}`); zeg([Z().spZaklamp, p.woorden[x]]); };
    h.tik = (i, b) => {
      if (i !== volgorde[nr]) { wiebel(b, 'nee'); fx('bad'); zeg([p.woorden[i]]); return; }
      wiebel(b, 'ja'); fx('good'); b.classList.add('gevonden');
      nr++; h.ster(nr);
      if (nr >= volgorde.length) { zeg([p.woorden[i]]); return klaar(); }
      zeg([p.woorden[i]]).then(() => later(zoek, 200));
    };
    zoek();
  }

  // ---------- Boodschappen: sleep alles van het lijstje in de mand (of de doktertas, de boekentas, de kookpot). ----------
  function lijst() {
    const p = h.p;
    let rondeNr = 0;
    h.plaats.classList.add('doe-weg');
    const doe = () => {
      laag.querySelectorAll('.jr-doe-ding, .jr-doe-lijstje, .jr-doe-mand').forEach(x => x.remove());
      const nodig = schud(p.woorden.map((_, i) => i)).slice(0, 3);
      const gedaan = new Set();
      const lijstje = document.createElement('div');
      lijstje.className = 'jr-doe-lijstje';
      lijstje.innerHTML = nodig.map(i => `<span data-l="${i}"><img src="${h.img(p.id, i)}" alt=""></span>`).join('');
      laag.appendChild(lijstje);
      const mand = document.createElement('div');
      mand.className = 'jr-doe-mand';
      mand.innerHTML = `<img src="${MAND}" alt="">`;
      laag.appendChild(mand);
      const r = maat();
      p.woorden.forEach((w, i) => {
        const el = document.createElement('div');
        el.className = 'jr-doe-ding';
        el.innerHTML = `<img src="${h.img(p.id, i)}" alt="">`;
        el.style.left = `${(0.32 + (i % 3) * 0.17) * r.width}px`;
        el.style.top = `${(i < 3 ? (r.width < 720 ? 0.47 : 0.36) : 0.74) * r.height}px`;
        laag.appendChild(el);
        sleepbaar(el, (x, y) => {
          if (!binnen(x, y, mand, 30)) return false;
          if (!nodig.includes(i) || gedaan.has(i)) { fx('bad'); zeg([w, Z().spNietLijst]); return false; }
          gedaan.add(i); el.classList.add('in-mand'); setTimeout(() => el.remove(), 400);
          lijstje.querySelector(`[data-l="${i}"]`).classList.add('vink');
          wiebel(mand, 'ja'); fx('good');
          if (gedaan.size >= nodig.length) {
            rondeNr++; h.ster(rondeNr);
            if (rondeNr >= 2) { zeg([w]); return klaar(); }
            zeg([w, Z().rijkGevonden]).then(() => later(doe, 300));
          } else zeg([w]);
          return true;
        }, () => zeg([w]));
      });
      vraag(Z().spLijst);
      zeg([Z().spLijst, ...nodig.map(i => p.woorden[i])]);
    };
    doe();
  }

  // ---------- Toren bouwen: sleep de prenten op elkaar. Niet te scheef, anders valt hij om! ----------
  function toren() {
    const p = h.p;
    h.plaats.classList.add('doe-weg');
    const stapel = []; // { x, y, b, el } in px
    const doel = 6;
    const grond = () => maat().height * 0.9;
    const bak = document.createElement('div');
    bak.className = 'jr-doe-bak';
    laag.appendChild(bak);
    const nieuw = () => {
      bak.innerHTML = '';
      schud(p.woorden.map((_, i) => i)).slice(0, 3).forEach(i => {
        const el = document.createElement('div');
        el.className = 'jr-doe-ding jr-doe-blok';
        el.dataset.i = i;
        el.innerHTML = `<img src="${h.img(p.id, i)}" alt="">`;
        bak.appendChild(el);
        el.addEventListener('pointerdown', () => {
          // Uit het bakje halen en in de laag zetten zodat hij vrij kan bewegen.
          if (el.parentNode === bak) {
            const r = maat(), b = el.getBoundingClientRect();
            laag.appendChild(el); el.style.left = `${b.left - r.left + b.width / 2}px`; el.style.top = `${b.top - r.top + b.height / 2}px`;
          }
        }, { capture: true });
        sleepbaar(el, (x) => {
          const r = maat();
          const br = el.getBoundingClientRect().width;
          const onder = stapel[stapel.length - 1];
          const midden = r.width * 0.5;
          const bx = onder ? onder.x : midden;
          // Te ver naast de vorige: hij valt.
          if (onder ? Math.abs(x - bx) > br * 0.55 : Math.abs(x - midden) > r.width * 0.2) {
            el.classList.add('valt'); fx('bad'); zeg([Z().spOei]);
            setTimeout(() => { el.remove(); vul(); }, 700);
            return true;
          }
          const hoogte = el.getBoundingClientRect().height * 0.82;
          const y = (onder ? onder.y - onder.h * 0.5 : grond()) - hoogte * 0.5;
          el.style.left = `${x}px`; el.style.top = `${y}px`;
          el.classList.add('staat'); el.style.pointerEvents = 'none';
          stapel.push({ x, y, h: hoogte, el });
          wiebel(el, 'ja'); fx('jump');
          zeg([p.woorden[+el.dataset.i]]);
          if (stapel.length % 2 === 0) h.ster(stapel.length / 2);
          // Te hoog voor het scherm: de toren schuift wat naar beneden.
          if (y < r.height * 0.22) { for (const s of stapel) { s.y += hoogte; s.el.style.top = `${s.y}px`; } }
          if (stapel.length >= doel) { try { confetti(2500); } catch {} zeg([Z().spHoog]); return klaar(); }
          vul();
          return true;
        });
      });
    };
    const vul = () => { if (!bak.querySelector('.jr-doe-blok')) nieuw(); };
    nieuw();
    vraag(Z().spToren);
    zeg([Z().spToren]);
  }

  // ---------- Voeren: het dier heeft honger. Sleep het eten naar zijn mond. ----------
  function voer() {
    const p = h.p;
    h.plaats.classList.add('doe-weg');
    let nr = 0;
    const dieren = schud(DIEREN[p.id] || [0]);
    const ronde1 = () => {
      laag.querySelectorAll('.jr-doe-dier, .jr-doe-ding').forEach(x => x.remove());
      const di = dieren[nr % dieren.length];
      const dier = document.createElement('div');
      dier.className = 'jr-doe-dier';
      dier.innerHTML = `<img src="${h.img(p.id, di)}" alt="">`;
      laag.appendChild(dier);
      const keuze = schud(ETEN).slice(0, 4);
      const goed = keuze[Math.floor(Math.random() * keuze.length)];
      const r = maat();
      keuze.forEach(([id, i], n) => {
        const el = document.createElement('div');
        el.className = 'jr-doe-ding jr-doe-eten';
        el.innerHTML = `<img src="${h.img(id, i)}" alt="">`;
        el.style.left = `${(0.12 + n * 0.12) * r.width}px`; el.style.top = `${0.8 * r.height}px`;
        laag.appendChild(el);
        sleepbaar(el, (x, y) => {
          if (!binnen(x, y, dier, 20)) return false;
          if (id !== goed[0] || i !== goed[1]) { wiebel(dier, 'nee'); fx('bad'); zeg([Z().spNeeDank]); return false; }
          el.classList.add('opgegeten'); setTimeout(() => el.remove(), 500);
          dier.classList.add('smul'); fx('good');
          nr++; h.ster(nr);
          if (nr >= 4) { zeg([Z().spLekker]); return klaar(); }
          zeg([Z().spLekker]).then(() => later(ronde1, 400));
          return true;
        }, () => zeg([h.woord(id, i)]));
      });
      vraag(`${Z().spGeef} ${h.woord(goed[0], goed[1])}`, h.img(goed[0], goed[1]));
      zeg([p.woorden[di], Z().spHonger, Z().spGeef, h.woord(goed[0], goed[1])]);
    };
    ronde1();
  }

  // ---------- Puzzel: de prent van de plek in zes stukjes. Sleep elk stukje op zijn plaats. ----------
  function puzzel() {
    const p = h.p;
    h.plaats.classList.add('doe-weg');
    const r = maat();
    const K = 3, R = 2;
    const B = r.width * 0.5, H = B * 9 / 16;
    const fx0 = r.width * 0.4 - B / 2, fy0 = r.height * 0.56 - H / 2;
    const kader = document.createElement('div');
    kader.className = 'jr-doe-kader';
    Object.assign(kader.style, { left: `${fx0}px`, top: `${fy0}px`, width: `${B}px`, height: `${H}px`, backgroundImage: `url(/img/junior/rijk/${p.id}/bg-klein.webp)` });
    laag.appendChild(kader);
    let goed = 0;
    const stukken = schud([...Array(K * R).keys()]);
    stukken.forEach((s, n) => {
      const kx = s % K, ky = Math.floor(s / K);
      const el = document.createElement('div');
      el.className = 'jr-doe-stuk';
      Object.assign(el.style, {
        width: `${B / K}px`, height: `${H / R}px`, backgroundImage: `url(/img/junior/rijk/${p.id}/bg-klein.webp)`,
        backgroundSize: `${B}px ${H}px`, backgroundPosition: `${-kx * B / K}px ${-ky * H / R}px`,
        left: `${r.width * (n % 2 ? 0.905 : 0.75)}px`, top: `${r.height * ((r.width < 720 ? 0.4 : 0.33) + Math.floor(n / 2) * (r.width < 720 ? 0.25 : 0.27))}px`,
      });
      el.style.setProperty('--d', (Math.random() * 8 - 4).toFixed(1) + 'deg');
      laag.appendChild(el);
      sleepbaar(el, (x, y) => {
        const tx = fx0 + (kx + 0.5) * B / K, ty = fy0 + (ky + 0.5) * H / R;
        if (Math.hypot(x - tx, y - ty) > B / K * 0.45) { fx('bad'); return false; }
        el.style.left = `${tx}px`; el.style.top = `${ty}px`;
        el.classList.add('vast'); el.style.pointerEvents = 'none';
        fx('marker'); goed++;
        if (goed % 2 === 0) h.ster(goed / 2);
        if (goed >= K * R) { kader.classList.add('heel'); fx('good'); zeg([p.naam]); return klaar(); }
        return true;
      });
    });
    vraag(Z().spPuzzel);
    zeg([Z().spPuzzel]);
  }

  // ---------- Vangen: dingen vallen uit de lucht. Schuif je mand en vang wat het draakje vraagt. ----------
  function vang() {
    const p = h.p;
    h.plaats.classList.add('doe-weg');
    let nr = 0, doel = 0;
    const mand = document.createElement('div');
    mand.className = 'jr-doe-mand jr-doe-vangmand';
    mand.innerHTML = `<img src="${MAND}" alt="">`;
    laag.appendChild(mand);
    let mx = maat().width / 2;
    const zetMand = () => { mand.style.left = `${mx}px`; };
    zetMand();
    const volg = e => { const r = maat(); mx = Math.max(r.width * 0.08, Math.min(r.width * 0.92, e.clientX - r.left)); zetMand(); };
    laag.addEventListener('pointermove', volg);
    laag.addEventListener('pointerdown', volg);
    const vallen = [];
    const nieuwDoel = () => { doel = Math.floor(Math.random() * p.woorden.length); vraag(`${Z().spVang} ${p.woorden[doel]}`, h.img(p.id, doel)); zeg([Z().spVang, p.woorden[doel]]); };
    let t0 = performance.now(), sinds = 700;
    const stap = t => {
      const dt = Math.min(50, t - t0); t0 = t; sinds += dt;
      const r = maat(), s = r.height / 500;
      if (sinds > 1100) {
        sinds = 0;
        const i = Math.random() < 0.45 ? doel : Math.floor(Math.random() * p.woorden.length);
        const el = document.createElement('div');
        el.className = 'jr-doe-val';
        el.innerHTML = `<img src="${h.img(p.id, i)}" alt="">`;
        laag.appendChild(el);
        vallen.push({ el, i, x: r.width * (0.1 + Math.random() * 0.8), y: -40, v: 0.09 + Math.random() * 0.05, d: Math.random() * 40 - 20 });
      }
      const mb = mand.getBoundingClientRect(), lr = laag.getBoundingClientRect();
      for (const v of vallen) {
        if (v.weg) continue;
        v.y += v.v * dt * s;
        v.el.style.left = `${v.x}px`; v.el.style.top = `${v.y}px`; v.el.style.setProperty('--d', v.d + 'deg');
        const top = mb.top - lr.top + mb.height * 0.2;
        if (v.y > top && v.y < top + mb.height * 0.4 && Math.abs(v.x - (mb.left - lr.left + mb.width / 2)) < mb.width * 0.5) {
          v.weg = true; v.el.classList.add('gevangen'); setTimeout(() => v.el.remove(), 300);
          wiebel(mand, 'ja');
          if (v.i === doel) {
            fx('good'); nr++; h.ster(nr);
            if (nr >= 5) { cancelAnimationFrame(loop); loop = 0; return klaar(); }
            if (nr % 2 === 0) { zeg([p.woorden[v.i]]).then(() => later(nieuwDoel, 100)); } else zeg([p.woorden[v.i]]);
          } else { fx('marker'); zeg([p.woorden[v.i]]); }
        } else if (v.y > r.height + 60) { v.weg = true; v.el.remove(); }
      }
      for (let i = vallen.length - 1; i >= 0; i--) if (vallen[i].weg) vallen.splice(i, 1);
      loop = requestAnimationFrame(stap);
    };
    loop = requestAnimationFrame(stap);
    stopjes.push(() => { laag && laag.removeEventListener('pointermove', volg); });
    nieuwDoel();
  }

  // ---------- Muziek: vier dingen spelen elk hun eigen toon. Luister en speel na (2, 3, 4 en dan 5 tonen). ----------
  const TONEN = [392, 494, 587, 698];
  let ac = null;
  function toon(n) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = TONEN[n];
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.55);
    } catch {}
  }
  function muziek() {
    const p = h.p;
    h.plaats.classList.add('doe-weg');
    const vier = schud(p.woorden.map((_, i) => i)).slice(0, 4);
    const rij = document.createElement('div');
    rij.className = 'jr-doe-muziek';
    rij.innerHTML = vier.map((i, n) => `<button type="button" class="jr-eigen" data-n="${n}" style="--kl:${['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7'][n]}"><img src="${h.img(p.id, i)}" alt=""></button>`).join('');
    laag.appendChild(rij);
    const knoppen = [...rij.children];
    const licht = n => { const b = knoppen[n]; b.classList.remove('licht'); void b.offsetWidth; b.classList.add('licht'); toon(n); };
    const LENGTE = [2, 3, 4, 5];
    let nr = 0, reeks = [], stap = 0, luister = true;
    const speel = () => {
      luister = true; stap = 0;
      vraag(Z().spMuziek);
      reeks.forEach((n, k) => later(() => licht(n), 700 + k * 650));
      later(() => { luister = false; }, 700 + reeks.length * 650);
    };
    const nieuw = () => { reeks = Array.from({ length: LENGTE[nr] }, () => Math.floor(Math.random() * 4)); speel(); };
    knoppen.forEach((b, n) => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      licht(n);
      if (luister) return;
      if (n !== reeks[stap]) { fx('bad'); luister = true; later(speel, 700); return; }
      stap++;
      if (stap < reeks.length) return;
      luister = true; nr++; h.ster(nr); later(() => fx('good'), 350);
      if (nr >= LENGTE.length) return klaar();
      later(nieuw, 1000);
    }));
    zeg([Z().spMuziek]).then(() => nieuw());
  }

  const VORM = { kras, bel, zaklamp, lijst, toren, voer, puzzel, vang, muziek };
  let stopjes = [];
  function stop() {
    ronde++;
    if (loop) cancelAnimationFrame(loop); loop = 0;
    timers.forEach(clearTimeout); timers = [];
    stopjes.forEach(f => { try { f(); } catch {} }); stopjes = [];
    if (h) { h.tik = null; h.plaats.classList.remove('doe-weg', 'doe-donker'); }
    if (laag) laag.remove();
    laag = null;
  }

  window.JrRijkSpel = {
    // Welke speelvorm een plek heeft en het icoontje voor de grote knop.
    van(id) { const d = DOE[id]; return d ? { vorm: d.v, icoon: ICOON[d.v] } : null; },
    start(hulp) {
      stop();
      h = hulp;
      const d = DOE[h.p.id];
      if (!d) return;
      laag = document.createElement('div');
      laag.className = `jr-doe vorm-${d.v}`;
      laag.setAttribute('data-geen-vertaling', '');
      h.plaats.appendChild(laag);
      h.ster(0);
      VORM[d.v]();
    },
    // Een tik op een ding van de plek (voor de zaklamp). Geeft true als de doe-opdracht hem afhandelt.
    tik(i, b) { if (h && h.tik && laag) { h.tik(i, b); return true; } return false; },
    stop,
    get bezig() { return !!laag; },
  };
})();
