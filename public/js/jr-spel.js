// LANcelot Junior: de spelletjes zelf, gedeeld door de tablet van het kind (jr-kind.js) en het bord (jr-leerkracht.js).
// Drie sjablonen: tikken (kies één, of tik er meerdere aan), slepen (in de juiste volgorde of het juiste aantal)
// en sorteren (naar de juiste mand). Slepen kan altijd ook met tikken: kleuters vinden tikken makkelijker.
// Een fout is nooit erg: het draakje geeft een hint en het kind probeert opnieuw. Telt voor het logboek: meteen goed of niet.
// Alle tekst en alles wat gezegd wordt, komt uit window.JR (src/junior-inhoud*.js via /junior/inhoud.js).
(() => {
  // Geld per munt: welke stukken per niveau, waar de prenten staan, en welke stukken briefjes zijn. De VS heeft geen munt van 2 dollar.
  const MUNT = {
    eur: { teken: '€', woord: 'euro', map: '', soorten: [[1, 2, 5], [1, 2, 5, 10], [5, 10, 20, 50]], briefje: s => s >= 5 },
    usd: { teken: '$', woord: 'dollar', map: 'usd/', soorten: [[1, 5], [1, 5, 10], [5, 10, 20, 50]], briefje: () => true },
    gbp: { teken: '£', woord: 'pond', map: 'gbp/', soorten: [[1, 2, 5], [1, 2, 5, 10], [5, 10, 20, 50]], briefje: s => s >= 5 },
  };
  const J = () => window.JR || { zin: {}, stemmen: [] };
  // Rustig (buitengewoon onderwijs, kinderen die snel overprikkeld raken): de leerkracht zet het aan bij ⚙️.
  // Geen bewegende prentjes, geen confetti, geen geluidjes of muziek, zachtere kleuren en een tragere stem.
  let rustig = false;
  const stil = new Map(); // object -> { naam: echte functie } zolang Rustig aan staat
  function dempen(obj, aan) {
    if (!obj) return;
    if (aan && !stil.has(obj)) {
      const echt = {};
      for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(obj))) {
        if (typeof d.value === 'function' && k !== 'stop' && k !== 'toggle') { echt[k] = d.value; obj[k] = () => {}; }
      }
      stil.set(obj, echt);
    } else if (!aan && stil.has(obj)) {
      Object.assign(obj, stil.get(obj));
      stil.delete(obj);
    }
  }
  // Feest in de LANcelot-stijl in plaats van confetti: gloeiende cyaan en gouden runen en sterretjes die uit het midden opstijgen en uitdoven.
  const RUNEN = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  function runenFeest(duur = 3000) {
    const oud = document.getElementById('jr-feest'); if (oud) oud.remove();
    const doek = document.createElement('canvas');
    doek.id = 'jr-feest';
    Object.assign(doek.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999' });
    document.body.appendChild(doek);
    const c = doek.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    doek.width = innerWidth * dpr; doek.height = innerHeight * dpr; c.scale(dpr, dpr);
    const W = innerWidth, H = innerHeight, maat = Math.min(W, H);
    const kleuren = ['127, 220, 255', '76, 201, 255', '255, 201, 74', '255, 224, 138'];
    const maak = () => {
      const hoek = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = maat * (.006 + Math.random() * .012);
      return { x: W / 2 + (Math.random() - .5) * W * .5, y: H * (.55 + Math.random() * .35), vx: Math.cos(hoek) * v, vy: Math.sin(hoek) * v,
        t: Math.random() < .55 ? RUNEN[Math.floor(Math.random() * RUNEN.length)] : '✦', g: maat * (.025 + Math.random() * .035),
        k: kleuren[Math.floor(Math.random() * kleuren.length)], leef: 0, max: 70 + Math.random() * 60 };
    };
    let deeltjes = Array.from({ length: 36 }, maak);
    const einde = performance.now() + duur;
    (function stap(nu) {
      c.clearRect(0, 0, W, H);
      if (nu < einde - 900 && deeltjes.length < 60) deeltjes.push(maak(), maak());
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const d of deeltjes) {
        d.leef++; d.x += d.vx; d.y += d.vy; d.vy *= .985; d.vx *= .985;
        const a = Math.max(0, Math.min(1, d.leef / 12, (d.max - d.leef) / 30));
        c.font = `700 ${d.g}px system-ui, sans-serif`;
        c.shadowColor = `rgba(${d.k}, ${a})`; c.shadowBlur = d.g * .6;
        c.fillStyle = `rgba(${d.k}, ${a})`;
        c.fillText(d.t, d.x, d.y);
      }
      deeltjes = deeltjes.filter(d => d.leef < d.max);
      if (nu < einde || deeltjes.length) requestAnimationFrame(stap); else doek.remove();
    })(performance.now());
  }
  window.confetti = runenFeest;
  let echteConfetti = null;
  function zetRustig(v) {
    v = !!v;
    if (v === rustig) return;
    rustig = v;
    document.documentElement.classList.toggle('jr-rustig', rustig);
    if (rustig && window.JrMuziek) window.JrMuziek.stop();
    dempen(typeof sfx !== 'undefined' ? sfx : null, rustig);
    dempen(window.JrMuziek, rustig);
    if (rustig && typeof window.confetti === 'function') { echteConfetti = window.confetti; window.confetti = () => {}; }
    else if (!rustig && echteConfetti) { window.confetti = echteConfetti; echteConfetti = null; }
  }

  // ---------- De stem ----------
  // Eerst de ingesproken bestanden (Vlaams voor het Nederlands), anders de stem van de browser in de juiste taal.
  const Stem = (() => {
    let lijst = null;
    let beurt = 0;
    let audio = null;
    let uit = false;
    // Stil: de leerkracht zette voorlezen op de tablets uit. Dan spreekt het alleen na een tik op 🔊 (even()).
    let stil = false;
    let open = 0;
    let praat = false; // spreekt het draakje nu? (de muziek gaat dan even zachter)
    try { uit = localStorage.getItem('jr-stem-uit') === '1'; } catch {}
    const taal = () => J().taal || 'nl';
    fetch(`/img/junior/stem/${taal()}/index.json`).then(r => (r.ok ? r.json() : null)).then(m => { lijst = m; }).catch(() => {});
    function stem() {
      if (!('speechSynthesis' in window)) return null;
      const alle = speechSynthesis.getVoices();
      for (const t of J().stemmen || []) {
        const v = alle.find(x => x.lang.replace('_', '-').toLowerCase().startsWith(t.toLowerCase()));
        if (v) return v;
      }
      return null;
    }
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
    function stop() {
      beurt++;
      praat = false;
      if (audio) { audio.pause(); audio = null; }
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
    function clip(file, mijn, url) {
      return new Promise(klaar => {
        if (mijn !== beurt) return klaar();
        const a = new Audio(url || `/img/junior/stem/${taal()}/${file}`);
        audio = a;
        if (rustig) a.playbackRate = 0.85;
        const af = () => { clearTimeout(t); klaar(); };
        const t = setTimeout(af, 15000);
        a.onended = af;
        a.onerror = af;
        a.play().catch(af);
      });
    }
    function spreek(tekst, mijn) {
      return new Promise(klaar => {
        if (!('speechSynthesis' in window) || mijn !== beurt) return klaar();
        const u = new SpeechSynthesisUtterance(tekst);
        const v = stem();
        if (v) u.voice = v;
        u.lang = v ? v.lang : (J().stemmen || ['nl-BE'])[0];
        u.rate = rustig ? 0.7 : 0.8;
        u.pitch = 1.1;
        const af = () => { clearTimeout(t); klaar(); };
        const t = setTimeout(af, 4000 + tekst.length * 120);
        u.onend = af;
        u.onerror = af;
        speechSynthesis.speak(u);
      });
    }
    // delen: ['Hoeveel is', 3, 'plus', 4]. Heeft elk stukje een ingesproken bestand, dan die na elkaar.
    // los: elk stukje apart, met een korte pauze ertussen (ei ... bij ... hoera), anders loopt het in elkaar.
    async function zeg(delen, { los = false } = {}) {
      stop();
      const mijn = beurt;
      const lijstDelen = (Array.isArray(delen) ? delen : [delen]).filter(d => d !== '' && d != null);
      const stukken = lijstDelen.map(d => (d && d.url ? d : String(d)));
      if (uit || (stil && Date.now() > open) || !stukken.length) return;
      praat = true;
      try {
        // Een eigen opname van de leerkracht ({ url }): die eerst, de rest met de gewone stem.
        if (stukken.some(d => d.url)) {
          for (const d of stukken) {
            if (mijn !== beurt) return;
            if (d.url) await clip(null, mijn, d.url);
            else if (lijst && lijst[d]) await clip(lijst[d], mijn);
            else await spreek(d, mijn);
          }
          return;
        }
        const rust = () => new Promise(r => setTimeout(r, 350));
        if (lijst && stukken.every(d => lijst[d])) {
          for (const d of stukken) {
            if (mijn !== beurt) return;
            await clip(lijst[d], mijn);
            if (los) await rust();
          }
          return;
        }
        if (los) {
          for (const d of stukken) {
            if (mijn !== beurt) return;
            await spreek(d, mijn);
            await rust();
          }
          return;
        }
        await spreek(stukken.join(' '), mijn);
      } finally {
        if (mijn === beurt) praat = false;
      }
    }
    return {
      zeg, stop,
      get praat() { return praat; },
      even() { open = Date.now() + 300; },
      get stil() { return stil; },
      set stil(v) { stil = !!v; if (stil) stop(); },
      get uit() { return uit; },
      set uit(v) { uit = !!v; try { localStorage.setItem('jr-stem-uit', uit ? '1' : '0'); } catch {} if (uit) stop(); },
    };
  })();

  // ---------- Toeval (met een zaadje: het bord en de tablets mogen elk hun eigen reeks hebben) ----------
  function toeval(seed) {
    let a = (seed >>> 0) || 1;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (van, tot) => van + Math.floor(r() * (tot - van + 1));
    r.kies = l => l[Math.floor(r() * l.length)];
    r.schud = l => {
      const c = l.slice();
      for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
      return c;
    };
    return r;
  }

  const beeld = (pad, cls = '') => `<img class="jr-img ${cls}" src="/img/junior/${pad}.webp" alt="" draggable="false">`;
  // Schrijfpatronen tussen de middenlijn (45) en de basislijn (70): x0 = begin, n = aantal herhalingen, elk 22 breed.
  const SCHRIJFPATRONEN = {
    golf: (x, n) => `M${x} 57.5` + Array.from({ length: n }, (_, i) => ` c 5.5 -16 11 -16 11 0 s 5.5 16 11 0`).join(''),
    boog: (x, n) => `M${x} 70` + Array.from({ length: n }, () => ` c 0 -32 22 -32 22 0`).join(''),
    kom: (x, n) => `M${x} 45` + Array.from({ length: n }, () => ` c 0 32 22 32 22 0`).join(''),
    zigzag: (x, n) => `M${x} 70` + Array.from({ length: n }, () => ` l 11 -25 l 11 25`).join(''),
    lus: (x, n) => `M${x} 70` + Array.from({ length: n }, () => ` c 12 -4 16 -20 10 -24 c -6 -4 -10 10 -4 20 c 4 4 10 4 16 4`).join(''),
  };
  // Ritmekaartje: een grote stip per 'ta', twee kleine verbonden stippen per 'titi'.
  const ritmeKaart = tellen => `<span class="jr-ritme">${tellen.map(b => (b === 'ta' ? '<i class="ta"><b></b></i>' : '<i class="titi"><b></b><b></b></i>')).join('')}</span>`;
  // De trom, gemaakt in de browser (geen bestanden): een lage toon die zakt, met een korte tik erbovenop.
  let tromCtx = null;
  function tromSlag(t, sterk = true) {
    const c = tromCtx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(sterk ? 150 : 190, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.4);
    const n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const hg = c.createGain(); hg.gain.value = 0.25;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    n.buffer = b; n.connect(f).connect(hg).connect(c.destination); n.start(t);
  }
  function trom() {
    if (!tromCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; tromCtx = new AC(); }
    if (tromCtx.state === 'suspended') tromCtx.resume();
    return tromCtx;
  }
  const TEL = 0.6; // seconden per tel
  const ritmeTijden = tellen => tellen.flatMap(b => (b === 'ta' ? [1] : [0.5, 0.5]));
  // Speelt het ritme; kaart: de stippen lichten mee op. Geeft een belofte die klaar is als het ritme gedaan is.
  function speelRitme(tellen, kaart) {
    const c = trom();
    if (!c) return Promise.resolve();
    const duur = ritmeTijden(tellen);
    const stippen = kaart ? [...kaart.querySelectorAll('.jr-ritme b')] : [];
    let t = c.currentTime + 0.15, som = 0.15;
    duur.forEach((d, i) => {
      tromSlag(t, d === 1);
      const st = stippen[i];
      if (st) setTimeout(() => { st.classList.add('aan'); setTimeout(() => st.classList.remove('aan'), 220); }, som * 1000);
      t += d * TEL; som += d * TEL;
    });
    return new Promise(r => setTimeout(r, som * 1000 + 200));
  }
  const emoji = (e, cls = '') => `<span class="jr-emoji ${cls}">${e}</span>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Getallen naast de juiste: dichtbij, nooit negatief, nooit dubbel.
  function buren(r, juist, stap, min = 0) {
    const set = new Set([juist]);
    const kand = r.schud([juist - stap, juist + stap, juist - 2 * stap, juist + 2 * stap, juist + 3 * stap].filter(x => x >= min));
    for (const k of kand) { if (set.size >= 3) break; set.add(k); }
    return r.schud([...set]);
  }

  const VORMEN = {
    cirkel: kl => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="${kl}"/></svg>`,
    driehoek: kl => `<svg viewBox="0 0 100 100"><polygon points="50,8 94,90 6,90" fill="${kl}"/></svg>`,
    vierkant: kl => `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="4" fill="${kl}"/></svg>`,
    rechthoek: kl => `<svg viewBox="0 0 100 100"><rect x="4" y="26" width="92" height="48" rx="4" fill="${kl}"/></svg>`,
  };
  const KLEUREN = ['#ff6b6b', '#4dabf7', '#ffd43b', '#51cf66', '#cc5de8', '#ff922b'];
  const vorm = (soort, kl, cls = '') => `<span class="jr-vorm ${cls}">${VORMEN[soort](kl)}</span>`;


  // De bakjes van een eierdoos (public/img/junior/nest/doos.webp), in procent van het veld, in de volgorde van het tienveld:
  // eerst de bovenste rij van links naar rechts, dan de onderste rij, dan de volgende doos eronder.
  const DOOS_X = [11.5, 30.8, 50, 69.2, 88.5];
  const DOOS_Y = [25.3, 61.9];
  function doosPlekken(dozen) {
    const uit = [];
    for (let d = 0; d < dozen; d++) for (const y of DOOS_Y) for (const x of DOOS_X) uit.push({ x, y: (d * 100 + y) / dozen });
    return uit;
  }
  // Losse eieren op een strobed: willekeurig verspreid, niet op elkaar, elk een beetje scheef.
  function stroPlekken(r, n) {
    const uit = [];
    for (let i = 0; i < n; i++) {
      // De plek die het verst van de andere eieren ligt, zodat geen ei een ander bedekt (een kleuter tikt er anders naast).
      let best = null, bestAfstand = -1;
      for (let poging = 0; poging < 120; poging++) {
        const hoek = r() * Math.PI * 2;
        const straal = Math.sqrt(r());
        const p = { x: 50 + Math.cos(hoek) * straal * 36, y: 52 + Math.sin(hoek) * straal * 27, d: Math.round((r() - 0.5) * 50) };
        const afstand = Math.min(99, ...uit.map(q => Math.hypot((q.x - p.x) * 1.5, q.y - p.y)));
        if (afstand > bestAfstand) { best = p; bestAfstand = afstand; }
        if (afstand > 24) break;
      }
      uit.push(best);
    }
    return uit.sort((a, b) => a.y - b.y);
  }

  // ---------- De vragen ----------
  // Elke maker geeft een vraag: { soort, zeg, ... }. soort: kies, tikAlle, tikAantal, sleepAantal, volgorde, sorteer.
  const MAKERS = {
    eieren(r, niv) {
      // Tot 5 (kleuters): echte nesten, de eieren liggen los door elkaar, zoals in een echt nest.
      // Tot 10 en 20: eierdozen van 10 = het tienveld, gevuld zoals in de klas (eerst de bovenste rij van 5, dan onder).
      const max = [5, 10, 20][niv] || 5;
      const n = r.int(1, max);
      if (r() < 0.5) {
        const extra = r.int(1, Math.min(4, max + 3 - n));
        const totaal = n + extra;
        if (niv === 0) {
          const plekken = stroPlekken(r, totaal);
          return {
            soort: 'tikAantal', aantal: n, zeg: [J().zin.eiTik, n],
            kop: `<span class="jr-groot-getal">${n}</span>`,
            items: plekken.map(p => ({ html: beeld('stuk/1', 'jr-ei'), stijl: `left:${p.x}%;top:${p.y}%;--draai:${p.d}deg` })),
            vak: 'jr-stroveld',
          };
        }
        const dozen = Math.ceil(totaal / 10);
        const plekken = doosPlekken(dozen);
        return {
          soort: 'tikAantal', aantal: n, zeg: [J().zin.eiTik, n],
          kop: `<span class="jr-groot-getal">${n}</span>`,
          items: Array.from({ length: totaal }, (_, i) => ({ html: beeld('stuk/1', 'jr-ei'), stijl: `left:${plekken[i].x}%;top:${plekken[i].y}%` })),
          vak: `jr-doosveld jr-dozen-${dozen}`,
        };
      }
      let scene;
      if (niv === 0) scene = `<img class="jr-nestprent" src="/img/junior/nest/${n}.webp" alt="">`;
      else {
        const dozen = Math.ceil(n / 10);
        const plekken = doosPlekken(dozen);
        scene = `<div class="jr-doosveld jr-dozen-${dozen}">${plekken.slice(0, n).map(p => `<span class="jr-doosei" style="left:${p.x}%;top:${p.y}%">${beeld('stuk/1', 'jr-ei')}</span>`).join('')}</div>`;
      }
      return {
        soort: 'kies', zeg: [J().zin.eiHoeveel], scene,
        opties: buren(r, n, 1, 1).map(x => ({ html: `<span class="jr-getal">${x}</span>`, juist: x === n })),
      };
    },
    splits(r, niv) {
      const totaal = niv === 0 ? r.int(2, 5) : niv === 1 ? r.int(3, 10) : r.int(8, 20);
      const a = r.int(1, totaal - 1);
      return {
        soort: 'sleepAantal', doel: totaal - a, vast: a, pool: totaal, totaal,
        zeg: [J().zin.splitsDak, totaal, J().zin.splitsHuis, a, J().zin.splitsSleep],
        token: beeld('draak/3', 'jr-token-draak'),
      };
    },
    rivier(r, niv) {
      let a, b, op;
      if (niv === 3) {
        op = r() < 0.5 ? '+' : '-';
        a = r.int(1, 9) * 10;
        b = op === '+' ? r.int(1, 10 - a / 10) * 10 : r.int(1, a / 10) * 10;
        if (op === '+' && a + b > 100) b = 100 - a;
      } else {
        const max = niv === 2 ? 20 : 10;
        op = niv === 0 ? '+' : r() < 0.5 ? '+' : '-';
        if (op === '+') { a = r.int(0, max - 1); b = r.int(1, max - a); } else { a = r.int(2, max); b = r.int(1, a); }
      }
      const uit = op === '+' ? a + b : a - b;
      return {
        soort: 'kies', zeg: [J().zin.hoeveelIs, a, op === '+' ? J().zin.plus : J().zin.min, b],
        kop: `<span class="jr-som">${a} ${op === '+' ? '+' : '−'} ${b} = ?</span>`,
        opties: buren(r, uit, niv === 3 ? 10 : 1, 0).map(x => ({ html: `${beeld('stuk/6', 'jr-steen')}<span class="jr-getal jr-op-steen">${x}</span>`, juist: x === uit })),
        stenen: true,
      };
    },
    groot(r, niv) {
      const aantal = niv === 0 ? 2 : 3;
      const lengte = niv === 1 && r() < 0.5;
      if (lengte) {
        const lens = r.schud([1, 2, 3, 4, 5]).slice(0, aantal);
        const vraag = r() < 0.5 ? 'langste' : 'kortste';
        const doel = vraag === 'langste' ? Math.max(...lens) : Math.min(...lens);
        return {
          soort: 'kies', zeg: [J().zin[vraag]], lijst: true,
          opties: lens.map(l => ({ html: `<span class="jr-trein-mini">${beeld('stuk/4', 'jr-loc')}${beeld('stuk/5', 'jr-wagon').repeat(l)}</span>`, juist: l === doel })),
        };
      }
      const dier = r.int(1, 30);
      const maten = r.schud([0.45, 0.75, 1.05]).slice(0, aantal);
      const vraag = r() < 0.5 ? 'grootste' : 'kleinste';
      const doel = vraag === 'grootste' ? Math.max(...maten) : Math.min(...maten);
      return {
        soort: 'kies', zeg: [J().zin[vraag]], open: true,
        opties: maten.map(m => ({ html: `<span class="jr-maat" style="--m:${m}">${beeld(`dier/${dier}`)}</span>`, juist: m === doel })),
      };
    },
    dagboog(r, niv) {
      const reeksen = (J().reeksen || []).filter(x => x.niveau === niv);
      const reeks = r.kies(reeksen.length ? reeksen : J().reeksen);
      const items = reeks.items;
      const n = Math.min(items.length, niv === 0 ? 3 : 4);
      // De dagen, seizoenen en dagdelen zijn een kring: dan ligt de eerste kaart al klaar.
      const kring = niv === 2 || niv === 3;
      const start = kring ? r.int(0, items.length - 1) : niv === 0 ? 0 : r.int(0, items.length - n);
      const rij = Array.from({ length: n }, (_, i) => items[(start + i) % items.length]);
      return {
        soort: 'volgorde', zeg: [reeks.tekst ? J().zin.dagen : J().zin.volgorde], vast: kring ? 1 : 0,
        kaarten: rij.map((it, i) => ({ html: reeks.tekst ? `<span class="jr-woordkaart">${esc(it.t)}</span>` : `${emoji(it.e)}<span class="jr-onder">${esc(it.t)}</span>`, plek: i, zeg: it.t })),
      };
    },
    vormen(r, niv) {
      const soorten = niv === 0 ? ['cirkel', 'driehoek', 'vierkant'] : ['cirkel', 'driehoek', 'vierkant', 'rechthoek'];
      if (niv === 2) {
        const drie = r.schud(soorten).slice(0, 3);
        const items = r.schud(drie.flatMap(s => [s, s])).map(s => ({ html: vorm(s, r.kies(KLEUREN)), mand: s }));
        return { soort: 'sorteer', zeg: [J().zin.vormSorteer], items, manden: drie.map(s => ({ id: s, html: vorm(s, 'none', 'jr-vorm-lijn') })) };
      }
      const doel = r.kies(soorten);
      const aantal = r.int(2, 4);
      const rest = r.int(4, 6);
      const lijst = r.schud([...Array(aantal).fill(doel), ...Array.from({ length: rest }, () => r.kies(soorten.filter(s => s !== doel)))]);
      return {
        soort: 'tikAlle', zeg: [J().zin.vormTik[doel]], vak: 'jr-veld',
        // Wie niet hoort wat het draakje zegt, ziet de vorm die je zoekt (als lijntekening).
        kop: `<span class="jr-vorm-doel">${vorm(doel, 'none', 'jr-vorm-lijn')}</span>`,
        items: lijst.map(s => ({ html: vorm(s, r.kies(KLEUREN), niv === 1 ? `jr-draai-${r.int(0, 3)}` : ''), doel: s === doel, hint: J().zin.vormIs[s], maat: niv === 1 ? r.kies([0.7, 1, 1.25]) : 1 })),
      };
    },
    waar(r, niv) {
      // Niveau 3: een tafel en een karretje, voor voor, achter, in en tussen.
      if (niv >= 2) {
        const doel = r.kies(['voor', 'achter', 'in', 'tussen', 'voor', 'achter']);
        return { soort: 'waar', kar: true, zeg: [J().zin.waar[doel]], plekken: ['voor', 'achter', 'in', 'tussen'].map(p => ({ id: p, juist: p === doel })) };
      }
      const plekken = niv === 0 ? ['op', 'onder', 'naast'] : ['op', 'onder', 'boven', 'links', 'rechts'];
      const doel = r.kies(plekken);
      return { soort: 'waar', zeg: [J().zin.waar[doel]], plekken: plekken.map(p => ({ id: p, juist: p === doel })), naastKant: r() < 0.5 ? 'links' : 'rechts' };
    },
    // Raadsel van vandaag: elke dag drie korte, makkelijke opdrachten, voor iedereen dezelfde (zaadje = de datum).
    nietBij(r) {
      const groepen = [['🐶', '🐱', '🐰', '🐻', '🐸', '🐷', '🐮', '🐵'], ['🍎', '🍌', '🍐', '🍇', '🍓', '🍒', '🍊'], ['🚗', '🚌', '🚲', '🚂', '🚀', '🚜', '✈️'],
        ['👕', '👖', '🧦', '👗', '🧢', '👟'], ['⚽', '🏀', '🎾', '🏈'], ['🌷', '🌻', '🌹', '🌼']];
      const [a, b] = r.schud(groepen.map((g, i) => i)).slice(0, 2);
      const drie = r.schud(groepen[a]).slice(0, 3);
      const vreemd = r.kies(groepen[b]);
      return {
        soort: 'kies', zeg: [J().zin.nietBij],
        opties: r.schud([...drie, vreemd]).map(e => ({ html: emoji(e, 'jr-emoji-groot'), juist: e === vreemd })),
      };
    },
    // De eigen vragen van de leerkracht: een echte foto of een prentje (emoji) met een woord eronder, en de vraag wordt voorgelezen.
    eigen(r, niv) {
      const set = (J().sets || [])[niv];
      if (!set || !set.vragen || !set.vragen.length) return null;
      return eigenVraag(r.kies(set.vragen));
    },
    // ---------- Fase 2 ----------
    // Getallenlijn: het draakje staat op een streepje, welk getal is dat? Tot 100 met streepjes per 10.
    lijn(r, niv) {
      const max = [10, 20, 100][niv];
      const stap = niv === 2 ? 10 : 1;
      const doel = niv === 2 ? r.int(1, 9) * 10 : r.int(1, max - 1);
      const n = max / stap;
      const streep = Array.from({ length: n + 1 }, (_, i) => {
        const g = i * stap;
        const toon = g === 0 || g === max || (niv === 1 && g === 10) || (niv === 2 && g === 50);
        return `<span class="jr-lijn-streep${toon ? ' groot' : ''}" style="--xf:${i / n}">${toon ? `<b>${g}</b>` : ''}</span>`;
      }).join('');
      return {
        soort: 'kies', zeg: [J().zin.lijnWaar],
        scene: `<div class="jr-lijn"><div class="jr-lijn-balk"></div>${streep}<span class="jr-lijn-draak" style="--xf:${doel / max}">${beeld('draak/3')}</span></div>`,
        opties: buren(r, doel, stap, 0).map(x => ({ html: `<span class="jr-getal">${x}</span>`, juist: x === doel })),
      };
    },
    // Eerlijk delen: snoepjes over 2, 3 of 4 draakjes. Niveau 3: welke taart is in 2 of 4 gelijke stukken verdeeld?
    delen(r, niv) {
      if (niv === 2) {
        const kwart = r() < 0.5;
        const taart = (stukken, gelijk) => {
          const hoeken = gelijk ? Array.from({ length: stukken }, (_, i) => (i * 360) / stukken) : stukken === 2 ? [0, 140] : [0, 60, 200, 250];
          const lijnen = hoeken.map(h => { const a = ((h - 90) * Math.PI) / 180; return `<line x1="50" y1="50" x2="${50 + 44 * Math.cos(a)}" y2="${50 + 44 * Math.sin(a)}"/>`; }).join('');
          return `<svg class="jr-taart" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#ffc078" stroke="#8a4b16" stroke-width="4"/><circle cx="50" cy="50" r="34" fill="#ff8fab" opacity=".55"/><g stroke="#5c2e0a" stroke-width="4" stroke-linecap="round">${stukken === 2 && gelijk ? '<line x1="50" y1="6" x2="50" y2="94"/>' : lijnen}</g></svg>`;
        };
        const n = kwart ? 4 : 2;
        const opties = r.schud([{ html: taart(n, true), juist: true }, { html: taart(n, false), juist: false }, { html: taart(kwart ? 2 : 4, true), juist: false }]);
        return { soort: 'kies', zeg: [kwart ? J().zin.kwartVraag : J().zin.helftVraag], opties };
      }
      const draken = niv === 0 ? 2 : r.int(2, 4);
      const elk = r.int(1, niv === 0 ? 4 : 5);
      const snoep = r.kies(['🍬', '🍪', '🍓', '🧁', '🍎']);
      return {
        soort: 'kies', zeg: [J().zin.delenVraag],
        scene: `<div class="jr-delen"><div class="jr-delen-snoep">${emoji(snoep).repeat(draken * elk)}</div><div class="jr-delen-draken">${beeld('draak/3', 'jr-delen-draak').repeat(draken)}</div></div>`,
        opties: buren(r, elk, 1, 1).map(x => ({ html: `<span class="jr-getal">${x}</span>`, juist: x === elk })),
      };
    },
    // Tafeltoren: eerst de tafels van 2, 5 en 10, daarna 3 en 4, 6 en 7, 8 en 9, en alle tafels door elkaar.
    // Bij de makkelijke niveaus zie je de groepjes.
    tafel(r, niv) {
      const TAFELS = [[2], [5, 10], [2, 5, 10], [3, 4], [6, 7], [8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]];
      const tafel = r.kies(TAFELS[niv] || TAFELS[2]);
      const a = r.int(1, 10);
      const uit = a * tafel;
      const groepjes = [0, 1, 3].includes(niv) && tafel <= 5 && a <= 6
        ? `<div class="jr-groepjes">${Array.from({ length: a }, () => `<span class="jr-groepje">${'<i></i>'.repeat(tafel)}</span>`).join('')}</div>` : '';
      return {
        soort: 'kies', zeg: [J().zin.hoeveelIs, a, J().zin.maal, tafel],
        kop: `<span class="jr-som">${a} × ${tafel} = ?</span>`, scene: groepjes || undefined,
        opties: buren(r, uit, tafel, 0).map(x => ({ html: `${beeld('stuk/6', 'jr-steen')}<span class="jr-getal jr-op-steen">${x}</span>`, juist: x === uit })),
        stenen: true,
      };
    },
    // Klokkentoren: hoe laat is het? Hele uren, halve uren, kwartieren. De tijd wordt gezegd zoals in die taal.
    klok(r, niv) {
      const kl = J().klok || {};
      const tekst = (u, m) => {
        const v = (u % 12) + 1;
        const sleutel = m === 0 ? 'uur' : m === 30 ? 'half' : m === 15 ? 'kwartOver' : 'kwartVoor';
        // Sommige talen zeggen 1 uur anders (une heure, la una): die staan apart met een 1 achter de naam.
        const getal = String(kl[sleutel] || '').includes('{v}') ? v : u;
        const t = (getal === 1 && kl[`${sleutel}1`]) || kl[sleutel];
        return String(t || '{u}:{m}').replace('{u}', u).replace('{v}', v).replace('{m}', String(m).padStart(2, '0'));
      };
      const minuten = niv === 0 ? [0] : niv === 1 ? [0, 30] : [0, 15, 30, 45];
      const u = r.int(1, 12);
      const m = r.kies(minuten);
      const juist = tekst(u, m);
      const set = new Map([[juist, true]]);
      for (let i = 0; set.size < 3 && i < 30; i++) {
        const u2 = r() < 0.5 ? u : ((u + r.int(1, 10)) % 12) + 1;
        const m2 = r.kies(niv === 0 ? [0] : minuten);
        const t = tekst(u2, m2);
        if (!set.has(t)) set.set(t, false);
      }
      const uurHoek = ((u % 12) + m / 60) * 30;
      const minHoek = m * 6;
      const cijfers = Array.from({ length: 12 }, (_, i) => { const a = ((i + 1) * 30 - 90) * Math.PI / 180; return `<text x="${50 + 36 * Math.cos(a)}" y="${50 + 36 * Math.sin(a) + 4}">${i + 1}</text>`; }).join('');
      const streepjes = Array.from({ length: 60 }, (_, i) => `<line x1="50" y1="5" x2="50" y2="${i % 5 ? 8 : 10}" transform="rotate(${i * 6} 50 50)"/>`).join('');
      return {
        soort: 'kies', zeg: [J().zin.klokVraag],
        scene: `<svg class="jr-klok" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#fff8e7" stroke="#2b2340" stroke-width="3"/><g stroke="#2b2340" stroke-width="1">${streepjes}</g><g class="jr-klok-cijfers">${cijfers}</g>`
          + `<line x1="50" y1="50" x2="50" y2="27" stroke="#e8590c" stroke-width="5" stroke-linecap="round" transform="rotate(${uurHoek} 50 50)"/>`
          + `<line x1="50" y1="50" x2="50" y2="13" stroke="#1c7ed6" stroke-width="3" stroke-linecap="round" transform="rotate(${minHoek} 50 50)"/><circle cx="50" cy="50" r="3.5" fill="#2b2340"/></svg>`,
        opties: r.schud([...set]).map(([t, ok]) => ({ html: `<span class="jr-woordkaart">${esc(t)}</span>`, juist: ok })),
        na: [juist],
      };
    },
    // Geldmarkt: hoeveel geld is dit? Munten en briefjes in euro, dollar (VS) of pond (VK): Junior.munt komt van de server.
    geld(r, niv) {
      const munt = MUNT[(window.Junior || {}).munt] || MUNT.eur;
      const soorten = munt.soorten[niv];
      const max = [10, 20, 100][niv];
      const stukken = [];
      let som = 0;
      const aantal = r.int(2, niv === 2 ? 5 : 4);
      for (let i = 0; i < aantal; i++) {
        const opties = soorten.filter(s => som + s <= max);
        if (!opties.length) break;
        const s = r.kies(opties);
        stukken.push(s);
        som += s;
      }
      stukken.sort((a, b) => b - a);
      return {
        soort: 'kies', zeg: [J().zin.geldVraag],
        scene: `<div class="jr-geld">${stukken.map(s => beeld(`geld/${munt.map}${s}`, munt.briefje(s) ? 'jr-briefje' : 'jr-munt')).join('')}</div>`,
        opties: buren(r, som, niv === 2 ? 5 : 1, 1).map(x => ({ html: `<span class="jr-getal">${munt.teken} ${x}</span>`, juist: x === som })),
        na: [som, J().zin[munt.woord] || J().zin.euro],
      };
    },
    // Sorteermand: op soort (dieren, fruit, voertuigen...) of op kleur.
    sorteer(r, niv) {
      if (niv === 1) {
        const KL = { rood: ['🍎', '🍓', '🚒', '🍒', '🌹', '🐞'], groen: ['🐸', '🥦', '🍏', '🥒', '🌲', '🐢'], geel: ['🍌', '🌻', '🐥', '🧀', '🌽', '⭐'], blauw: ['🐳', '🫐', '💙', '🧢', '👖', '🦋'] };
        const kleuren = r.schud(Object.keys(KL)).slice(0, 3);
        const items = r.schud(kleuren.flatMap(k => r.schud(KL[k]).slice(0, 2).map(e => ({ html: emoji(e), mand: k }))));
        const VERF = { rood: '#ff6b6b', groen: '#51cf66', geel: '#ffd43b', blauw: '#4dabf7' };
        return { soort: 'sorteer', zeg: [J().zin.sorteerKleur], items, manden: kleuren.map(k => ({ id: k, html: vorm('cirkel', VERF[k]) })) };
      }
      // Waar leeft het? Het land, het water of de lucht.
      if (niv === 3) {
        const LEEFT = { land: ['🐄', '🐎', '🐑', '🦁', '🐘', '🐇', '🦒', '🐿️'], water: ['🐟', '🐬', '🐳', '🐙', '🦀', '🐠', '🦈', '🦭'], lucht: ['🐦', '🦅', '🦉', '🦋', '🐝', '🦜', '🕊️', '🦇'] };
        const MAND = { land: '🌳', water: '🌊', lucht: '☁️' };
        const items = r.schud(Object.keys(LEEFT).flatMap(g => r.schud(LEEFT[g]).slice(0, 2).map(e => ({ html: emoji(e), mand: g }))));
        return { soort: 'sorteer', zeg: [J().zin.sorteerLeeft], items, manden: Object.keys(LEEFT).map(g => ({ id: g, html: emoji(MAND[g]) })) };
      }
      const SOORT = { dier: ['🐶', '🐱', '🐰', '🐻', '🐸', '🐷', '🐮', '🦁'], fruit: ['🍎', '🍌', '🍐', '🍇', '🍓', '🍒', '🍊'], voertuig: ['🚗', '🚌', '🚲', '🚂', '🚜', '✈️', '🚀'],
        kleding: ['👕', '👖', '🧦', '👗', '🧢', '👟'], bal: ['⚽', '🏀', '🎾', '🏈', '🏐'], groente: ['🥕', '🥦', '🌽', '🥒', '🍆', '🧅', '🫑'],
        speelgoed: ['🧸', '🪀', '🪁', '🎲', '🧩', '🪆'], muziek: ['🎸', '🥁', '🎺', '🎻', '🎹', '🪗'], gereedschap: ['🔨', '🪛', '🔧', '🪚', '🪜', '🧰'] };
      const n = niv === 0 ? 2 : niv === 4 ? 4 : 3;
      const groepen = r.schud(Object.keys(SOORT)).slice(0, n);
      const items = r.schud(groepen.flatMap(g => r.schud(SOORT[g]).slice(1, niv === 0 ? 4 : 3).map(e => ({ html: emoji(e), mand: g }))));
      return { soort: 'sorteer', zeg: [J().zin.sorteerSoort], items, manden: groepen.map(g => ({ id: g, html: emoji(SOORT[g][0]) })) };
    },
    // Patronenpad: maak het patroon af. AB, dan ABC of AAB, dan AABB of ABB.
    patroon(r, niv) {
      const sets = [['🔴', '🔵', '🟡', '🟢'], ['🍎', '🍌', '🍇', '🍐'], ['⭐', '🌙', '☀️', '☁️'], ['🐶', '🐱', '🐭', '🐰'], ['🟥', '🟦', '🟨', '🟩']];
      const set = r.schud(r.kies(sets));
      const vormen = niv === 0 ? ['AB'] : niv === 1 ? ['ABC', 'AAB'] : ['AABB', 'ABB', 'ABAC'];
      const vormp = r.kies(vormen);
      const kern = [...vormp].map(c => set[c.charCodeAt(0) - 65]);
      const lengte = Math.max(5, kern.length * 2 + r.int(0, kern.length - 1));
      const rij = Array.from({ length: lengte + 1 }, (_, i) => kern[i % kern.length]);
      const doel = rij.pop();
      const andere = r.schud([...new Set(set.slice(0, Math.max(3, new Set(kern).size)))].filter(e => e !== doel)).slice(0, 2);
      return {
        soort: 'kies', zeg: [J().zin.patroonVraag],
        kop: `<span class="jr-patroon">${rij.map(e => emoji(e)).join('')}<span class="jr-patroon-vraag">?</span></span>`,
        opties: r.schud([doel, ...andere]).map(e => ({ html: emoji(e, 'jr-emoji-groot'), juist: e === doel })),
      };
    },
    // Codeerdraakje: welke pijlen brengen het draakje naar de schat? Een raster van 4 bij 4.
    code(r, niv) {
      const PIJL = { b: ['⬆️', 0, -1], o: ['⬇️', 0, 1], l: ['⬅️', -1, 0], r: ['➡️', 1, 0] };
      const stappen = niv === 0 ? 1 : niv === 1 ? 2 : r.int(3, 4);
      // De schat ligt precies 'stappen' vakjes ver: de juiste pijlen zijn altijd de kortste weg (geen omwegen).
      const plekken = [];
      for (let sx = 0; sx < 4; sx++) for (let sy = 0; sy < 4; sy++) for (let tx = 0; tx < 4; tx++) for (let ty = 0; ty < 4; ty++) {
        if (Math.abs(tx - sx) + Math.abs(ty - sy) === stappen) plekken.push([sx, sy, tx, ty]);
      }
      const [sx, sy, tx, ty] = r.kies(plekken);
      const pad = r.schud([...Array(Math.abs(tx - sx)).fill(tx > sx ? 'r' : 'l'), ...Array(Math.abs(ty - sy)).fill(ty > sy ? 'o' : 'b')]);
      // Waar kom je uit met deze pijlen? (Buiten het veld blijft het draakje aan de rand staan.)
      const eind = p => p.reduce(([x, y], k) => [Math.max(0, Math.min(3, x + PIJL[k][1])), Math.max(0, Math.min(3, y + PIJL[k][2]))], [sx, sy]);
      const toon = p => p.map(k => PIJL[k][0]).join('');
      const opties = [pad];
      const gezien = new Set([toon(pad)]);
      for (let i = 0; opties.length < 3 && i < 200; i++) {
        const p = pad.slice();
        p[r.int(0, p.length - 1)] = r.kies(Object.keys(PIJL));
        if (p.length > 1 && r() < 0.3) p.reverse();
        const [ex, ey] = eind(p);
        // Een fout antwoord mag nooit ook bij de schat uitkomen.
        if ((ex === tx && ey === ty) || gezien.has(toon(p))) continue;
        gezien.add(toon(p));
        opties.push(p);
      }
      const cellen = [];
      for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) cellen.push(`<span class="jr-code-cel">${cx === tx && cy === ty ? beeld('stuk/7') : ''}</span>`);
      return {
        soort: 'kies', zeg: [stappen === 1 ? J().zin.codeEen : J().zin.codeVraag],
        scene: `<div class="jr-code">${cellen.join('')}<span class="jr-code-draak" style="--x:${sx};--y:${sy}">${beeld('draak/3')}</span></div>`,
        opties: r.schud(opties).map(p => ({ html: `<span class="jr-pijlen">${toon(p)}</span>`, juist: p === pad, pad: p.map(k => [PIJL[k][1], PIJL[k][2]]) })),
        code: { start: [sx, sy] },
      };
    },
    // Rijmkikker: wat rijmt op dit woord?
    rijm(r, niv) {
      const groepen = (J().rijm || []).filter(g => g.length >= 2);
      const [a, b, c] = r.schud(groepen.map((g, i) => i)).slice(0, 3);
      const [woord, rijmt] = r.schud(groepen[a]).slice(0, 2);
      const anders = [r.kies(groepen[b]), r.kies(groepen[c])];
      const kaart = w => `${emoji(w.e, 'jr-emoji-groot')}${niv === 1 ? `<span class="jr-optie-woord">${esc(w.w)}</span>` : ''}`;
      return {
        soort: 'kies', zeg: [J().zin.rijmVraag, woord.w], herhaal: [J().zin.rijmVraag, woord.w], na: [woord.w, rijmt.w],
        kop: `<span class="jr-rijm-kop">${beeld('stuk/17', 'jr-rijm-kikker')}${emoji(woord.e, 'jr-emoji-reus')}</span>`,
        opties: r.schud([rijmt, ...anders]).map(w => ({ html: kaart(w), juist: w === rijmt, zeg: w.w })),
      };
    },
    // Klapdraak: hoeveel klappen (lettergrepen) heeft het woord?
    klap(r, niv) {
      const pool = (J().klap || []).filter(w => (niv === 0 ? w.n <= 3 : true));
      const w = r.kies(pool);
      const max = niv === 0 ? 3 : 4;
      return {
        soort: 'kies', zeg: [J().zin.klapVraag, w.w], herhaal: [w.w], na: [w.w, ...(w.g ? w.g.split(' - ') : [])],
        kop: `<span class="jr-klap-kop">${emoji(w.e, 'jr-emoji-reus')}${niv === 1 ? `<span class="jr-optie-woord">${esc(w.w)}</span>` : ''}</span>`,
        opties: Array.from({ length: max }, (_, i) => i + 1).map(n => ({ html: `<span class="jr-klappen">${'👏'.repeat(n)}</span><span class="jr-optie-woord">${n}</span>`, juist: n === w.n })),
      };
    },
    // Zinnenslinger: zet de woorden in de juiste volgorde. De zin wordt eerst voorgelezen.
    zinnen(r, niv) {
      const pool = (J().zinnen || []).filter(z => z.n === niv + 1);
      const z = r.kies(pool.length ? pool : J().zinnen);
      const woorden = z.z.split(' ');
      return {
        soort: 'volgorde', zeg: [J().zin.zinVraag, z.z], herhaal: [z.z], na: [z.z],
        kop: z.e ? emoji(z.e, 'jr-emoji-reus') : undefined,
        kaarten: woorden.map((w, i) => ({ html: `<span class="jr-woordkaart">${esc(w)}</span>`, plek: i })),
      };
    },
    // Dictee-draakje: het draakje zegt een woord, het kind legt de letters. Zonder prent, met wat extra letters.
    dictee(r, niv) {
      const pool = (J().woorden || []).filter(x => x.n === niv + 1);
      const woord = r.kies(pool);
      const extra = r.schud((J().letters || ['m']).filter(l => !woord.k.includes(l))).slice(0, niv === 0 ? 1 : 2);
      return {
        soort: 'volgorde', zeg: [J().zin.dicteeVraag, woord.w], herhaal: [woord.w], na: [woord.w],
        kop: '<span class="jr-luister">👂</span>',
        kaarten: [...woord.k.map((k, i) => ({ html: `<span class="jr-letter">${esc(k)}</span>`, plek: i })), ...extra.map(l => ({ html: `<span class="jr-letter">${esc(l)}</span>`, plek: -1 }))],
      };
    },
    // Mijn naam: de eerste letter van je naam, de letters van je naam leggen, een woord dat begint zoals je naam.
    naam(r, niv, wie) {
      let naam = String(wie.naam || '').trim().split(/[\s-]+/)[0] || '';
      let letters = [...naam].filter(c => /\p{L}/u.test(c)).slice(0, 9);
      if (letters.length < 2) { letters = [...(J().zin.naamStandaard || 'Draakje')]; }
      naam = letters.join('');
      const eerste = letters[0];
      const klein = eerste.toLocaleLowerCase();
      const z = J().zin;
      const groot = `<span class="jr-naam-groot">${letters.map((l, i) => `<b class="${i === 0 && niv !== 1 ? 'jr-naam-eerste' : ''}">${esc(l)}</b>`).join('')}</span>`;
      const woorden = (J().woorden || []).filter(x => x.e && x.w);
      const begint = woorden.filter(x => x.w.toLocaleLowerCase().replace(/^(de|het|een|the|a|le|la|les|l'|el|los|las|der|die|das)\s+/, '').startsWith(klein));
      if (niv === 1) {
        return {
          soort: 'volgorde', zeg: [naam, z.naamLeg], herhaal: [naam],
          kop: groot,
          kaarten: letters.map((l, i) => ({ html: `<span class="jr-letter">${esc(l)}</span>`, plek: i })),
        };
      }
      if (niv === 2 && begint.length) {
        const woord = r.kies(begint);
        const rest = r.schud(woorden.filter(x => !x.w.toLocaleLowerCase().includes(klein))).slice(0, 2);
        if (rest.length === 2) {
          return {
            soort: 'kies', zeg: [naam, z.naamWoord], herhaal: [naam, z.naamWoord],
            kop: groot,
            opties: r.schud([woord, ...rest]).map(x => ({ html: emoji(x.e, 'jr-emoji-groot'), juist: x === woord, zeg: x.w })),
          };
        }
      }
      const anders = r.schud((J().letters || []).filter(l => l !== klein)).slice(0, 2).map(l => eerste === klein ? l : l.toLocaleUpperCase());
      return {
        soort: 'kies', zeg: [naam, z.naamLetter], herhaal: [naam, z.naamLetter],
        kop: groot,
        opties: r.schud([eerste, ...anders]).map(l => ({ html: `<span class="jr-letter">${esc(l)}</span>`, juist: l === eerste })),
      };
    },
    // Seizoenenboom: sleep elk prentje naar het juiste seizoen.
    seizoen(r, niv) {
      const S = { winter: ['⛄', '🧤', '🛷', '❄️', '🎿', '🧣'], lente: ['🌷', '🐣', '🌸', '🐝', '🌱', '🐑'], zomer: ['🏖️', '🍦', '🩱', '🌞', '🍉', '⛱️'], herfst: ['🍂', '🍄', '🌰', '🎃', '☔', '🍁'] };
      const teken = { winter: '❄️', lente: '🌷', zomer: '☀️', herfst: '🍂' };
      const seizoenen = niv === 0 ? r.schud(Object.keys(S)).slice(0, 2) : ['lente', 'zomer', 'herfst', 'winter'];
      const items = r.schud(seizoenen.flatMap(s => r.schud(S[s].filter(e => e !== teken[s])).slice(0, niv === 0 ? 3 : 2).map(e => ({ html: emoji(e), mand: s, hint: J().zin.seizoenNaam && J().zin.seizoenNaam[s] }))));
      return { soort: 'sorteer', zeg: [J().zin.seizoenVraag], items, manden: seizoenen.map(s => ({ id: s, html: `${emoji(teken[s])}<span class="jr-mand-naam">${esc((J().zin.seizoenNaam || {})[s] || s)}</span>` })) };
    },
    // Waar woont het dier? Sorteer de dieren naar de boerderij, het bos, de zee (en het ijs).
    thuis(r, niv) {
      const D = { boerderij: ['🐄', '🐖', '🐑', '🐓', '🐴', '🦆'], bos: ['🦊', '🦔', '🦉', '🐿️', '🦌', '🐻'], zee: ['🐟', '🐙', '🦀', '🐬', '🐳', '🦈'], ijs: ['🐧', '🦭'] };
      const teken = { boerderij: '🚜', bos: '🌲', zee: '🌊', ijs: '🧊' };
      const plekken = niv === 0 ? r.schud(['boerderij', 'bos', 'zee']).slice(0, 2) : ['boerderij', 'bos', 'zee', 'ijs'];
      const items = r.schud(plekken.flatMap(pl => r.schud(D[pl]).slice(0, niv === 0 ? 3 : 2).map(e => ({ html: emoji(e), mand: pl, hint: (J().zin.thuisNaam || {})[pl] }))));
      return { soort: 'sorteer', zeg: [J().zin.thuisVraag], items, manden: plekken.map(pl => ({ id: pl, html: `${emoji(teken[pl])}<span class="jr-mand-naam">${esc((J().zin.thuisNaam || {})[pl] || pl)}</span>` })) };
    },
    // Wie werkt hiermee? Twee dingen bovenaan, kies wie ermee werkt.
    beroep(r, niv) {
      const alle = J().beroepen || [];
      const pool = niv === 0 ? alle.slice(0, 6) : niv === 1 ? alle.slice(0, 12) : alle;
      const b = r.kies(pool);
      const andere = r.schud(pool.filter(x => x !== b)).slice(0, niv === 0 ? 2 : 3);
      return {
        soort: 'kies', zeg: [J().zin.beroepVraag], na: [b.w],
        kop: `<span class="jr-situatie">${b.t.map(e => emoji(e, 'jr-emoji-reus')).join('')}</span>`,
        opties: r.schud([b, ...andere]).map(x => ({ html: `${emoji(x.e, 'jr-emoji-groot')}<span class="jr-optie-woord">${esc(x.w)}</span>`, juist: x === b })),
      };
    },
    // Gezond of af en toe? Sorteer het eten in twee manden.
    gezond(r, niv) {
      const G = { gezond: ['🍎', '🥕', '🥦', '🍌', '🥛', '🍇', '🥒', '🍐', '🍓', '🥝'], snoep: ['🍭', '🍩', '🍟', '🍬', '🍫', '🧁', '🍰', '🥤', '🍦'] };
      const teken = { gezond: '💪', snoep: '🍭' };
      const n = niv === 0 ? 2 : 4;
      const items = r.schud(Object.keys(G).flatMap(g => r.schud(G[g].filter(e => e !== teken[g])).slice(0, n).map(e => ({ html: emoji(e), mand: g, hint: (J().zin.gezondNaam || {})[g] }))));
      return { soort: 'sorteer', zeg: [J().zin.gezondVraag], items, manden: ['gezond', 'snoep'].map(g => ({ id: g, html: `${emoji(teken[g])}<span class="jr-mand-naam">${esc((J().zin.gezondNaam || {})[g] || g)}</span>` })) };
    },
    // Hoe help je? Een situatie in de klas, kies wat een goede vriend doet. Niveau 2: beleefd zijn, niveau 3: veilig zijn.
    helpen(r, niv) {
      const pool = (J().helpen || []).filter(h => h.n === niv + 1);
      const h = r.kies(pool);
      const fout = h.fout ? r.schud(h.fout).slice(0, 2) : r.schud(J().helpFout || []).slice(0, niv === 0 ? 2 : 3);
      return {
        soort: 'kies', zeg: [h.z, J().zin.helpenVraag], herhaal: [h.z, J().zin.helpenVraag], na: [h.goed.w],
        kop: `<span class="jr-situatie">${beeld('draak/3', 'jr-situatie-draak')}${emoji(h.e, 'jr-emoji-reus')}</span>`,
        opties: r.schud([{ ...h.goed, juist: true }, ...fout]).map(x => ({ html: `${emoji(x.e, 'jr-emoji-groot')}<span class="jr-optie-woord">${esc(x.w)}</span>`, juist: !!x.juist })),
      };
    },
    // Gevoelensspiegel: hoe voelt het draakje? Kies het juiste gezicht.
    gevoel(r, niv) {
      const G = J().gevoelens || {};
      const pool = (J().situaties || []).filter(s => niv === 1 || ['blij', 'verdrietig', 'boos', 'bang'].includes(s.g));
      const s = r.kies(pool);
      const namen = Object.keys(G).filter(g => niv === 1 || ['blij', 'verdrietig', 'boos', 'bang'].includes(g));
      const andere = r.schud(namen.filter(g => g !== s.g)).slice(0, niv === 0 ? 2 : 3);
      return {
        soort: 'kies', zeg: [s.z, J().zin.gevoelVraag], herhaal: [s.z, J().zin.gevoelVraag], na: [G[s.g].w],
        kop: `<span class="jr-situatie">${beeld('draak/3', 'jr-situatie-draak')}${emoji(s.e, 'jr-emoji-reus')}</span>`,
        opties: r.schud([s.g, ...andere]).map(g => ({ html: `${emoji(G[g].e, 'jr-emoji-groot')}<span class="jr-optie-woord">${esc(G[g].w)}</span>`, juist: g === s.g })),
      };
    },
    // Drakenstappen: hoeveel pootjes lang is de brug? Meten met een natuurlijke maat.
    stappen(r, niv) {
      const n = niv === 0 ? r.int(2, 5) : r.int(4, 10);
      const ding = r.kies(['plank', 'slang', 'tak']);
      return {
        soort: 'kies', zeg: [J().zin.stappenVraag[ding]],
        scene: `<div class="jr-meet" style="--n:${n}"><div class="jr-meet-ding jr-meet-${ding}"></div><div class="jr-meet-poten">${'<span>🐾</span>'.repeat(n)}</div></div>`,
        opties: buren(r, n, 1, 1).map(x => ({ html: `<span class="jr-getal">${x}</span>`, juist: x === n })),
      };
    },
    raadsel(r) {
      const soort = r.kies(['nietBij', 'nietBij', 'eieren', 'groot', 'vormen', 'waar', 'geluiden']);
      return MAKERS[soort](r, 0);
    },
    geluiden(r, niv) {
      const pool = (J().geluiden || []).filter(g => niv === 1 || g.soort === 'dier');
      const doel = r.kies(pool);
      const rest = r.schud(pool.filter(g => g !== doel)).slice(0, niv === 1 ? 3 : 2);
      // Een echte opname (Wikimedia Commons, zie img/junior/geluid/BRONNEN.txt), anders zegt het draakje het geluid.
      const cp = cpVan(doel.e);
      const echt = GELUID.has(cp) ? { url: `/img/junior/geluid/${cp}.mp3` } : doel.zeg;
      return {
        soort: 'kies', zeg: [J().zin.geluid, echt], herhaal: [echt],
        kop: '<span class="jr-luister">👂</span>',
        opties: r.schud([doel, ...rest]).map(g => ({ html: emoji(g.e, 'jr-emoji-groot'), juist: g === doel })),
      };
    },
    // Ritmedraak (muzische vorming, bouwsteen ritme): luisteren naar de trom, tellen, het ritme herkennen en natikken.
    // Een tel is 'ta' (één grote slag) of 'titi' (twee snelle slagen).
    ritme(r, niv) {
      if (niv === 0) {
        const n = r.int(2, 5);
        const andere = r.schud([1, 2, 3, 4, 5, 6].filter(x => x !== n && Math.abs(x - n) <= 2)).slice(0, 2);
        return {
          soort: 'kies', zeg: [J().zin.ritmeTel], ritme: Array(n).fill('ta'),
          kop: `<span class="jr-trom-kop">${beeld('stuk/30')}</span>`,
          opties: r.schud([n, ...andere]).map(x => ({ html: ritmeKaart(Array(x).fill('ta')), juist: x === n })),
        };
      }
      const tellen = niv === 1 ? 4 : r.kies([3, 4]);
      const maak = () => Array.from({ length: tellen }, () => (r() < 0.45 ? 'titi' : 'ta'));
      let doel = maak();
      for (let i = 0; i < 20 && (doel.every(b => b === 'ta') || doel.every(b => b === 'titi')); i++) doel = maak();
      if (niv === 2) {
        return { soort: 'ritmeNa', zeg: [J().zin.ritmeNa], ritme: doel, kop: ritmeKaart(doel) };
      }
      const opties = [doel];
      for (let i = 0; opties.length < 3 && i < 200; i++) {
        const p = maak();
        if (!opties.some(o => o.join() === p.join())) opties.push(p);
      }
      return {
        soort: 'kies', zeg: [J().zin.ritmeVraag], ritme: doel,
        kop: `<span class="jr-trom-kop">${beeld('stuk/30')}</span>`,
        opties: r.schud(opties).map(o => ({ html: ritmeKaart(o), juist: o === doel })),
      };
    },
    // Schrijfdraakje: sporen met de vinger. Schrijfpatronen, cijfers, kleine letters, hoofdletters, je naam en woordjes.
    // Het schrift (lopend schrift 1 of 2, of drukletters) kiest de leerkracht bij Instellingen: Junior.schrift komt van de server.
    schrijf(r, niv, wie) {
      const S = window.JrSchrift, stijl = (window.Junior || {}).schrift || 'lopend1', z = J().zin;
      const kaal = t => String(t || '').normalize('NFD').replace(/\p{M}/gu, '');
      const spoor = (tekst, zeg, extra = {}) => {
        const v = S && S.woord(tekst, stijl);
        return v && { soort: 'spoor', zeg, w: v.w, paden: v.paden, lijnen: true, tekst, ...extra };
      };
      if (niv === 0 || !S) {
        const P = SCHRIJFPATRONEN;
        const id = r.kies(Object.keys(P));
        const n = r.int(4, 5);
        return { soort: 'spoor', zeg: [z.spoorPatroon], w: 30 + n * 22, paden: [P[id](15, n)], lijnen: true };
      }
      if (niv === 1) { const c = String(r.int(0, 9)); return spoor(c, [c, z.spoorCijfer]); }
      const abc = 'abcdefghijklmnopqrstuvwxyz';
      if (niv === 2) { const c = r.kies([...abc]); return spoor(c, [c, z.spoorLetter]); }
      if (niv === 3) { const c = r.kies([...abc.toUpperCase()]); return spoor(c, [c, z.spoorLetter]); }
      if (niv === 4) {
        const naam = kaal(String((wie && wie.naam) || '').trim().split(/[\s-]+/)[0]).replace(/[^A-Za-z]/g, '').slice(0, 9);
        const n = naam.length >= 2 ? naam[0].toUpperCase() + naam.slice(1).toLowerCase() : (z.naamStandaard || 'Draakje');
        const v = spoor(n, [n, z.spoorNaam]);
        if (v) return v;
      }
      const pool = (J().woorden || []).filter(x => S.kan && [...kaal(x.w)].every(c => S.kan(c, stijl)) && x.w.length <= (niv === 4 ? 5 : 6));
      const woord = pool.length ? r.kies(pool) : { w: 'draak', e: '🐉' };
      return spoor(kaal(woord.w), [woord.w, z.spoorWoord], { kop: emoji(woord.e, 'jr-emoji-reus') });
    },
    trein(r, niv) {
      const w = J().woorden || [];
      if (niv === 0) {
        const letters = J().letters || [];
        const pool = w.filter(x => x.n <= 2 && letters.includes(x.k[0]));
        const woord = r.kies(pool);
        const anders = r.schud(letters.filter(l => l !== woord.k[0])).slice(0, 2);
        return {
          soort: 'kies', zeg: [J().zin.beginklank, woord.w], herhaal: [woord.w],
          kop: emoji(woord.e, 'jr-emoji-reus'),
          opties: r.schud([woord.k[0], ...anders]).map(l => ({ html: `<span class="jr-letter">${esc(l)}</span>`, juist: l === woord.k[0] })),
        };
      }
      const pool = w.filter(x => (niv === 1 ? x.n === 1 : x.n >= 2));
      const woord = r.kies(pool);
      const extra = r.kies((J().letters || ['m']).filter(l => !woord.k.includes(l)));
      return {
        soort: 'volgorde', trein: true, zeg: [J().zin.trein, woord.w], herhaal: [woord.w], na: [woord.w],
        kop: emoji(woord.e, 'jr-emoji-reus'),
        kaarten: [...woord.k.map((k, i) => ({ html: `<span class="jr-letter">${esc(k)}</span>`, plek: i })), { html: `<span class="jr-letter">${esc(extra)}</span>`, plek: -1 }],
      };
    },
    woordbrug(r, niv) {
      const pool = (J().woorden || []).filter(x => x.n === niv + 1);
      const woord = r.kies(pool);
      const rest = r.schud(pool.filter(x => x !== woord && x.e !== woord.e)).slice(0, 2);
      return {
        soort: 'kies', zeg: [J().zin.woordbrug], na: [woord.w],
        kop: `<span class="jr-leeswoord">${esc(woord.w)}</span>`,
        opties: r.schud([woord, ...rest]).map(x => ({ html: emoji(x.e, 'jr-emoji-groot'), juist: x === woord })),
      };
    },
  };

  // Op maat: minder prenten om uit te kiezen. Bij één juiste prent blijven die en één andere over (in dezelfde volgorde).
  function minder(v) {
    if (!v || v.soort !== 'kies' || !Array.isArray(v.opties) || v.opties.length <= 2) return v;
    if (v.opties.filter(o => o.juist).length !== 1) return v;
    const fout = v.opties.find(o => !o.juist);
    return { ...v, opties: v.opties.filter(o => o.juist || o === fout) };
  }
  // Het niveau dat dit kind speelt: dat van de klas, met de stap van Op maat (zelfde regel als src/junior.js niveauVoor).
  function niveauVoor(wie, spel, basis) {
    const sp = (J().spellen || []).find(x => x.id === spel);
    const stap = wie && wie.maat ? Number(wie.maat.stap) || 0 : 0;
    if (!sp || sp.id === 'eigen' || !stap || !Array.isArray(sp.niveaus)) return basis;
    return Math.max(0, Math.min(sp.niveaus.length - 1, basis + stap));
  }

  // wie: { naam } van het kind dat aan de beurt is (voor het spel Mijn naam).
  // Niet twee keer (bijna) dezelfde vraag kort na elkaar: de laatste vier per spel worden onthouden.
  const recent = {};
  // Een eigen vraag van de leerkracht zoals de tablet ze toont (ook voor het voorbeeld bij Maken).
  function eigenVraag(v) {
    return {
      soort: 'kies', zeg: [v.s ? { url: `/junior/stem/${v.s}` } : v.vraag], kop: `<span class="jr-vraagkaart">${esc(v.vraag)}</span>`, eigen: true,
      scene: v.f ? `<img class="jr-foto jr-vraag-foto" src="/junior/foto/${esc(v.f)}" alt="">` : '',
      opties: v.opties.map((o, i) => ({ html: `${o.f ? `<img class="jr-foto" src="/junior/foto/${esc(o.f)}" alt="">` : o.e ? emoji(esc(o.e), 'jr-emoji-groot') : ''}${o.w ? `<span class="jr-optie-woord">${esc(o.w)}</span>` : ''}`, juist: i === v.juist })),
    };
  }
  // vast: altijd dezelfde vraag bij hetzelfde toeval (voor werkbladen: blad, sleutel en afdruk gelijk).
  function vraag(spel, niveau, r, wie, vast) {
    const m = MAKERS[spel];
    if (!m) return null;
    if (vast) return m(r, Number(niveau) || 0, wie || {});
    let v = null;
    const oud = recent[spel] || (recent[spel] = []);
    for (let i = 0; i < 8; i++) {
      v = m(r, Number(niveau) || 0, wie || {});
      if (!v || spel === 'raadsel') return v;
      const sleutel = JSON.stringify(v.zeg || '') + (v.kop || '');
      if (!oud.includes(sleutel) || i === 7) { oud.push(sleutel); if (oud.length > 4) oud.shift(); break; }
    }
    return v;
  }

  // ---------- Prenten in plaats van emoji (3D-prenten van Microsoft Fluent, MIT-licentie) ----------
  // Elke emoji in een spel wordt een prent uit /img/junior/prent/<codepunten>.webp, op elk toestel dezelfde.
  // Echte opnames voor het Geluidenbos (public/img/junior/geluid, bronnen in BRONNEN.txt).
  const GELUID = new Set(["1f411", "1f413", "1f42e", "1f431", "1f436", "1f437", "1f438", "1f981"]);
  const PRENT = new Set('0023-20e3 002a-20e3 0030-20e3 0031-20e3 0032-20e3 0033-20e3 0034-20e3 0035-20e3 0036-20e3 0037-20e3 0038-20e3 0039-20e3 00a9 00ae 1f004 1f0cf 1f170 1f171 1f17e 1f17f 1f18e 1f191 1f192 1f193 1f194 1f195 1f196 1f197 1f198 1f199 1f19a 1f201 1f202 1f21a 1f22f 1f232 1f233 1f234 1f235 1f236 1f237 1f238 1f239 1f23a 1f250 1f251 1f300 1f301 1f302 1f303 1f304 1f305 1f306 1f307 1f308 1f309 1f30a 1f30b 1f30c 1f30d 1f30e 1f30f 1f310 1f311 1f312 1f313 1f314 1f315 1f316 1f317 1f318 1f319 1f31a 1f31b 1f31c 1f31d 1f31e 1f31f 1f320 1f321 1f324 1f325 1f326 1f327 1f328 1f329 1f32a 1f32b 1f32c 1f32d 1f32e 1f32f 1f330 1f331 1f332 1f333 1f334 1f335 1f336 1f337 1f338 1f339 1f33a 1f33b 1f33c 1f33d 1f33e 1f33f 1f340 1f341 1f342 1f343 1f344 1f344-200d-1f7eb 1f345 1f346 1f347 1f348 1f349 1f34a 1f34b 1f34b-200d-1f7e9 1f34c 1f34d 1f34e 1f34f 1f350 1f351 1f352 1f353 1f354 1f355 1f356 1f357 1f358 1f359 1f35a 1f35b 1f35c 1f35d 1f35e 1f35f 1f360 1f361 1f362 1f363 1f364 1f365 1f366 1f367 1f368 1f369 1f36a 1f36b 1f36c 1f36d 1f36e 1f36f 1f370 1f371 1f372 1f373 1f374 1f375 1f376 1f377 1f378 1f379 1f37a 1f37b 1f37c 1f37d 1f37e 1f37f 1f380 1f381 1f382 1f383 1f384 1f385 1f386 1f387 1f388 1f389 1f38a 1f38b 1f38c 1f38d 1f38e 1f38f 1f390 1f391 1f392 1f393 1f396 1f397 1f399 1f39a 1f39b 1f39e 1f39f 1f3a0 1f3a1 1f3a2 1f3a3 1f3a4 1f3a5 1f3a6 1f3a7 1f3a8 1f3a9 1f3aa 1f3ab 1f3ac 1f3ad 1f3ae 1f3af 1f3b0 1f3b1 1f3b2 1f3b3 1f3b4 1f3b5 1f3b6 1f3b7 1f3b8 1f3b9 1f3ba 1f3bb 1f3bc 1f3bd 1f3be 1f3bf 1f3c0 1f3c1 1f3c2 1f3c3 1f3c3-200d-2640 1f3c3-200d-2640-200d-27a1 1f3c3-200d-2642 1f3c3-200d-2642-200d-27a1 1f3c3-200d-27a1 1f3c4 1f3c4-200d-2640 1f3c4-200d-2642 1f3c5 1f3c6 1f3c7 1f3c8 1f3c9 1f3ca 1f3ca-200d-2640 1f3ca-200d-2642 1f3cb 1f3cb-200d-2640 1f3cb-200d-2642 1f3cc 1f3cc-200d-2640 1f3cc-200d-2642 1f3cd 1f3ce 1f3cf 1f3d0 1f3d1 1f3d2 1f3d3 1f3d4 1f3d5 1f3d6 1f3d7 1f3d8 1f3d9 1f3da 1f3db 1f3dc 1f3dd 1f3de 1f3df 1f3e0 1f3e1 1f3e2 1f3e3 1f3e4 1f3e5 1f3e6 1f3e7 1f3e8 1f3e9 1f3ea 1f3eb 1f3ec 1f3ed 1f3ee 1f3ef 1f3f0 1f3f3 1f3f3-200d-1f308 1f3f3-200d-26a7 1f3f4 1f3f4-200d-2620 1f3f5 1f3f7 1f3f8 1f3f9 1f3fa 1f400 1f401 1f402 1f403 1f404 1f405 1f406 1f407 1f408 1f408-200d-2b1b 1f409 1f40a 1f40b 1f40c 1f40d 1f40e 1f40f 1f410 1f411 1f412 1f413 1f414 1f415 1f415-200d-1f9ba 1f416 1f417 1f418 1f419 1f41a 1f41b 1f41c 1f41d 1f41e 1f41f 1f420 1f421 1f422 1f423 1f424 1f425 1f426 1f426-200d-1f525 1f426-200d-2b1b 1f427 1f428 1f429 1f42a 1f42b 1f42c 1f42d 1f42e 1f42f 1f430 1f431 1f432 1f433 1f434 1f435 1f436 1f437 1f438 1f439 1f43a 1f43b 1f43b-200d-2744 1f43c 1f43d 1f43e 1f43f 1f440 1f441 1f441-200d-1f5e8 1f442 1f443 1f444 1f445 1f446 1f447 1f448 1f449 1f44a 1f44b 1f44c 1f44d 1f44e 1f44f 1f450 1f451 1f452 1f453 1f454 1f455 1f456 1f457 1f458 1f459 1f45a 1f45b 1f45c 1f45d 1f45e 1f45f 1f460 1f461 1f462 1f463 1f464 1f465 1f466 1f467 1f468 1f468-200d-1f33e 1f468-200d-1f373 1f468-200d-1f37c 1f468-200d-1f393 1f468-200d-1f3a4 1f468-200d-1f3a8 1f468-200d-1f3eb 1f468-200d-1f3ed 1f468-200d-1f4bb 1f468-200d-1f4bc 1f468-200d-1f527 1f468-200d-1f52c 1f468-200d-1f680 1f468-200d-1f692 1f468-200d-1f9af 1f468-200d-1f9af-200d-27a1 1f468-200d-1f9b0 1f468-200d-1f9b1 1f468-200d-1f9b2 1f468-200d-1f9b3 1f468-200d-1f9bc 1f468-200d-1f9bc-200d-27a1 1f468-200d-1f9bd 1f468-200d-1f9bd-200d-27a1 1f468-200d-2695 1f468-200d-2696 1f468-200d-2708 1f469 1f469-200d-1f33e 1f469-200d-1f373 1f469-200d-1f37c 1f469-200d-1f393 1f469-200d-1f3a4 1f469-200d-1f3a8 1f469-200d-1f3eb 1f469-200d-1f3ed 1f469-200d-1f4bb 1f469-200d-1f4bc 1f469-200d-1f527 1f469-200d-1f52c 1f469-200d-1f680 1f469-200d-1f692 1f469-200d-1f9af 1f469-200d-1f9af-200d-27a1 1f469-200d-1f9b0 1f469-200d-1f9b1 1f469-200d-1f9b2 1f469-200d-1f9b3 1f469-200d-1f9bc 1f469-200d-1f9bc-200d-27a1 1f469-200d-1f9bd 1f469-200d-1f9bd-200d-27a1 1f469-200d-2695 1f469-200d-2696 1f469-200d-2708 1f46e 1f46e-200d-2640 1f46e-200d-2642 1f46f 1f46f-200d-2640 1f46f-200d-2642 1f470 1f470-200d-2640 1f470-200d-2642 1f471 1f471-200d-2640 1f471-200d-2642 1f472 1f473 1f473-200d-2640 1f473-200d-2642 1f474 1f475 1f476 1f477 1f477-200d-2640 1f477-200d-2642 1f478 1f479 1f47a 1f47b 1f47c 1f47d 1f47e 1f47f 1f480 1f481 1f481-200d-2640 1f481-200d-2642 1f482 1f482-200d-2640 1f482-200d-2642 1f483 1f484 1f485 1f486 1f486-200d-2640 1f486-200d-2642 1f487 1f487-200d-2640 1f487-200d-2642 1f488 1f489 1f48a 1f48b 1f48c 1f48d 1f48e 1f490 1f492 1f493 1f494 1f495 1f496 1f497 1f498 1f499 1f49a 1f49b 1f49c 1f49d 1f49e 1f49f 1f4a0 1f4a1 1f4a2 1f4a3 1f4a4 1f4a5 1f4a6 1f4a7 1f4a8 1f4a9 1f4aa 1f4ab 1f4ac 1f4ad 1f4ae 1f4af 1f4b0 1f4b1 1f4b2 1f4b3 1f4b4 1f4b5 1f4b6 1f4b7 1f4b8 1f4b9 1f4ba 1f4bb 1f4bc 1f4bd 1f4be 1f4bf 1f4c0 1f4c1 1f4c2 1f4c3 1f4c4 1f4c5 1f4c6 1f4c7 1f4c8 1f4c9 1f4ca 1f4cb 1f4cc 1f4cd 1f4ce 1f4cf 1f4d0 1f4d1 1f4d2 1f4d3 1f4d4 1f4d5 1f4d6 1f4d7 1f4d8 1f4d9 1f4da 1f4db 1f4dc 1f4dd 1f4de 1f4df 1f4e0 1f4e1 1f4e2 1f4e3 1f4e4 1f4e5 1f4e6 1f4e7 1f4e8 1f4e9 1f4ea 1f4eb 1f4ec 1f4ed 1f4ee 1f4ef 1f4f0 1f4f1 1f4f2 1f4f3 1f4f4 1f4f5 1f4f6 1f4f7 1f4f8 1f4f9 1f4fa 1f4fb 1f4fc 1f4fd 1f4ff 1f500 1f501 1f502 1f503 1f504 1f505 1f506 1f507 1f508 1f509 1f50a 1f50b 1f50c 1f50d 1f50e 1f50f 1f510 1f511 1f512 1f513 1f514 1f515 1f516 1f517 1f518 1f519 1f51a 1f51b 1f51c 1f51d 1f51e 1f51f 1f520 1f521 1f522 1f523 1f524 1f525 1f526 1f527 1f528 1f529 1f52a 1f52b 1f52c 1f52d 1f52e 1f52f 1f530 1f531 1f532 1f533 1f534 1f535 1f536 1f537 1f538 1f539 1f53a 1f53b 1f53c 1f53d 1f549 1f54a 1f54b 1f54c 1f54d 1f54e 1f550 1f551 1f552 1f553 1f554 1f555 1f556 1f557 1f558 1f559 1f55a 1f55b 1f55c 1f55d 1f55e 1f55f 1f560 1f561 1f562 1f563 1f564 1f565 1f566 1f567 1f56f 1f570 1f573 1f574 1f575 1f575-200d-2640 1f575-200d-2642 1f576 1f577 1f578 1f579 1f57a 1f587 1f58a 1f58b 1f58c 1f58d 1f590 1f595 1f596 1f5a4 1f5a5 1f5a8 1f5b1 1f5b2 1f5bc 1f5c2 1f5c3 1f5c4 1f5d1 1f5d2 1f5d3 1f5dc 1f5dd 1f5de 1f5e1 1f5e3 1f5e8 1f5ef 1f5f3 1f5fa 1f5fb 1f5fc 1f5fd 1f5fe 1f5ff 1f600 1f601 1f602 1f603 1f604 1f605 1f606 1f607 1f608 1f609 1f60a 1f60b 1f60c 1f60d 1f60e 1f60f 1f610 1f611 1f612 1f613 1f614 1f615 1f616 1f617 1f618 1f619 1f61a 1f61b 1f61c 1f61d 1f61e 1f61f 1f620 1f621 1f622 1f623 1f624 1f625 1f626 1f627 1f628 1f629 1f62a 1f62b 1f62c 1f62d 1f62e 1f62e-200d-1f4a8 1f62f 1f630 1f631 1f632 1f633 1f634 1f635 1f635-200d-1f4ab 1f636 1f636-200d-1f32b 1f637 1f638 1f639 1f63a 1f63b 1f63c 1f63d 1f63e 1f63f 1f640 1f641 1f642 1f642-200d-2194 1f642-200d-2195 1f643 1f644 1f645 1f645-200d-2640 1f645-200d-2642 1f646 1f646-200d-2640 1f646-200d-2642 1f647 1f647-200d-2640 1f647-200d-2642 1f648 1f649 1f64a 1f64b 1f64b-200d-2640 1f64b-200d-2642 1f64c 1f64d 1f64d-200d-2640 1f64d-200d-2642 1f64e 1f64e-200d-2640 1f64e-200d-2642 1f64f 1f680 1f681 1f682 1f683 1f684 1f685 1f686 1f687 1f688 1f689 1f68a 1f68b 1f68c 1f68d 1f68e 1f68f 1f690 1f691 1f692 1f693 1f694 1f695 1f696 1f697 1f698 1f699 1f69a 1f69b 1f69c 1f69d 1f69e 1f69f 1f6a0 1f6a1 1f6a2 1f6a3 1f6a3-200d-2640 1f6a3-200d-2642 1f6a4 1f6a5 1f6a6 1f6a7 1f6a8 1f6a9 1f6aa 1f6ab 1f6ac 1f6ad 1f6ae 1f6af 1f6b0 1f6b1 1f6b2 1f6b3 1f6b4 1f6b4-200d-2640 1f6b4-200d-2642 1f6b5 1f6b5-200d-2640 1f6b5-200d-2642 1f6b6 1f6b6-200d-2640 1f6b6-200d-2640-200d-27a1 1f6b6-200d-2642 1f6b6-200d-2642-200d-27a1 1f6b6-200d-27a1 1f6b7 1f6b8 1f6b9 1f6ba 1f6bb 1f6bc 1f6bd 1f6be 1f6bf 1f6c0 1f6c1 1f6c2 1f6c3 1f6c4 1f6c5 1f6cb 1f6cc 1f6cd 1f6ce 1f6cf 1f6d0 1f6d1 1f6d2 1f6d5 1f6d6 1f6d7 1f6dc 1f6dd 1f6de 1f6df 1f6e0 1f6e1 1f6e2 1f6e3 1f6e4 1f6e5 1f6e9 1f6eb 1f6ec 1f6f0 1f6f3 1f6f4 1f6f5 1f6f6 1f6f7 1f6f8 1f6f9 1f6fa 1f6fb 1f6fc 1f7e0 1f7e1 1f7e2 1f7e3 1f7e4 1f7e5 1f7e6 1f7e7 1f7e8 1f7e9 1f7ea 1f7eb 1f7f0 1f90c 1f90d 1f90e 1f90f 1f910 1f911 1f912 1f913 1f914 1f915 1f916 1f917 1f918 1f919 1f91a 1f91b 1f91c 1f91d 1f91e 1f91f 1f920 1f921 1f922 1f923 1f924 1f925 1f926 1f926-200d-2640 1f926-200d-2642 1f927 1f928 1f929 1f92a 1f92b 1f92c 1f92d 1f92e 1f92f 1f930 1f931 1f932 1f933 1f934 1f935 1f935-200d-2640 1f935-200d-2642 1f936 1f937 1f937-200d-2640 1f937-200d-2642 1f938 1f938-200d-2640 1f938-200d-2642 1f939 1f939-200d-2640 1f939-200d-2642 1f93a 1f93c 1f93c-200d-2640 1f93c-200d-2642 1f93d 1f93d-200d-2640 1f93d-200d-2642 1f93e 1f93e-200d-2640 1f93e-200d-2642 1f93f 1f940 1f941 1f942 1f943 1f944 1f945 1f947 1f948 1f949 1f94a 1f94b 1f94c 1f94d 1f94e 1f94f 1f950 1f951 1f952 1f953 1f954 1f955 1f956 1f957 1f958 1f959 1f95a 1f95b 1f95c 1f95d 1f95e 1f95f 1f960 1f961 1f962 1f963 1f964 1f965 1f966 1f967 1f968 1f969 1f96a 1f96b 1f96c 1f96d 1f96e 1f96f 1f970 1f971 1f972 1f973 1f974 1f975 1f976 1f977 1f978 1f979 1f97a 1f97b 1f97c 1f97d 1f97e 1f97f 1f980 1f981 1f982 1f983 1f984 1f985 1f986 1f987 1f988 1f989 1f98a 1f98b 1f98c 1f98d 1f98e 1f98f 1f990 1f991 1f992 1f993 1f994 1f995 1f996 1f997 1f998 1f999 1f99a 1f99b 1f99c 1f99d 1f99e 1f99f 1f9a0 1f9a1 1f9a2 1f9a3 1f9a4 1f9a5 1f9a6 1f9a7 1f9a8 1f9a9 1f9aa 1f9ab 1f9ac 1f9ad 1f9ae 1f9af 1f9b4 1f9b5 1f9b6 1f9b7 1f9b8 1f9b8-200d-2640 1f9b8-200d-2642 1f9b9 1f9b9-200d-2640 1f9b9-200d-2642 1f9ba 1f9bb 1f9bc 1f9bd 1f9be 1f9bf 1f9c0 1f9c1 1f9c2 1f9c3 1f9c4 1f9c5 1f9c6 1f9c7 1f9c8 1f9c9 1f9ca 1f9cb 1f9cc 1f9cd 1f9cd-200d-2640 1f9cd-200d-2642 1f9ce 1f9ce-200d-2640 1f9ce-200d-2640-200d-27a1 1f9ce-200d-2642 1f9ce-200d-2642-200d-27a1 1f9ce-200d-27a1 1f9cf 1f9cf-200d-2640 1f9cf-200d-2642 1f9d0 1f9d1 1f9d1-200d-1f33e 1f9d1-200d-1f373 1f9d1-200d-1f37c 1f9d1-200d-1f384 1f9d1-200d-1f393 1f9d1-200d-1f3a4 1f9d1-200d-1f3a8 1f9d1-200d-1f3eb 1f9d1-200d-1f3ed 1f9d1-200d-1f4bb 1f9d1-200d-1f4bc 1f9d1-200d-1f527 1f9d1-200d-1f52c 1f9d1-200d-1f680 1f9d1-200d-1f692 1f9d1-200d-1f9af 1f9d1-200d-1f9af-200d-27a1 1f9d1-200d-1f9b0 1f9d1-200d-1f9b1 1f9d1-200d-1f9b2 1f9d1-200d-1f9b3 1f9d1-200d-1f9bc 1f9d1-200d-1f9bc-200d-27a1 1f9d1-200d-1f9bd 1f9d1-200d-1f9bd-200d-27a1 1f9d1-200d-2695 1f9d1-200d-2696 1f9d1-200d-2708 1f9d2 1f9d3 1f9d4 1f9d4-200d-2640 1f9d4-200d-2642 1f9d5 1f9d6 1f9d6-200d-2640 1f9d6-200d-2642 1f9d7 1f9d7-200d-2640 1f9d7-200d-2642 1f9d8 1f9d8-200d-2640 1f9d8-200d-2642 1f9d9 1f9d9-200d-2640 1f9d9-200d-2642 1f9da 1f9da-200d-2640 1f9da-200d-2642 1f9db 1f9db-200d-2640 1f9db-200d-2642 1f9dc 1f9dc-200d-2640 1f9dc-200d-2642 1f9dd 1f9dd-200d-2640 1f9dd-200d-2642 1f9de 1f9de-200d-2640 1f9de-200d-2642 1f9df 1f9df-200d-2640 1f9df-200d-2642 1f9e0 1f9e1 1f9e2 1f9e3 1f9e4 1f9e5 1f9e6 1f9e7 1f9e8 1f9e9 1f9ea 1f9eb 1f9ec 1f9ed 1f9ee 1f9ef 1f9f0 1f9f1 1f9f2 1f9f3 1f9f4 1f9f5 1f9f6 1f9f7 1f9f8 1f9f9 1f9fa 1f9fb 1f9fc 1f9fd 1f9fe 1f9ff 1fa70 1fa71 1fa72 1fa73 1fa74 1fa75 1fa76 1fa77 1fa78 1fa79 1fa7a 1fa7b 1fa7c 1fa80 1fa81 1fa82 1fa83 1fa84 1fa86 1fa87 1fa88 1fa90 1fa91 1fa92 1fa93 1fa94 1fa95 1fa96 1fa97 1fa98 1fa99 1fa9a 1fa9b 1fa9c 1fa9d 1fa9e 1fa9f 1faa0 1faa1 1faa2 1faa3 1faa4 1faa5 1faa6 1faa7 1faa8 1faa9 1faaa 1faab 1faac 1faad 1faae 1faaf 1fab0 1fab1 1fab2 1fab3 1fab4 1fab5 1fab6 1fab7 1fab8 1fab9 1faba 1fabb 1fabc 1fabd 1fabf 1fac0 1fac1 1fac2 1fac3 1fac4 1fac5 1face 1facf 1fad0 1fad1 1fad2 1fad3 1fad4 1fad5 1fad6 1fad7 1fad8 1fad9 1fada 1fadb 1fae0 1fae1 1fae2 1fae3 1fae4 1fae5 1fae6 1fae7 1fae8 1faf0 1faf1 1faf2 1faf3 1faf4 1faf5 1faf6 1faf7 1faf8 203c 2049 2122 2139 2194 2195 2196 2197 2198 2199 21a9 21aa 231a 231b 2328 23cf 23e9 23ea 23eb 23ec 23ed 23ee 23ef 23f0 23f1 23f2 23f3 23f8 23f9 23fa 24c2 25aa 25ab 25b6 25c0 25fb 25fc 25fd 25fe 2600 2601 2602 2603 2604 260e 2611 2614 2615 2618 261d 2620 2622 2623 2626 262a 262e 262f 2638 2639 263a 2640 2642 2648 2649 264a 264b 264c 264d 264e 264f 2650 2651 2652 2653 265f 2660 2663 2665 2666 2668 267b 267e 267f 2692 2693 2694 2695 2696 2697 2699 269b 269c 26a0 26a1 26a7 26aa 26ab 26b0 26b1 26bd 26be 26c4 26c5 26c8 26ce 26cf 26d1 26d3 26d3-200d-1f4a5 26d4 26e9 26ea 26f0 26f1 26f2 26f3 26f4 26f5 26f7 26f8 26f9 26f9-200d-2640 26f9-200d-2642 26fa 26fd 2702 2705 2708 2709 270a 270b 270c 270d 270f 2712 2714 2716 271d 2721 2728 2733 2734 2744 2747 274c 274e 2753 2754 2755 2757 2763 2764 2764-200d-1f525 2764-200d-1fa79 2795 2796 2797 27a1 27b0 27bf 2934 2935 2b05 2b06 2b07 2b1b 2b1c 2b50 2b55 3030 303d 3297 3299'.split(' '));
  const cpVan = e => [...e].filter(c => c !== '\ufe0f').map(c => c.codePointAt(0).toString(16)).join('-');
  const EMOJI_RE = /\p{Extended_Pictographic}\ufe0f?(?:\u200d\p{Extended_Pictographic}\ufe0f?)*/gu;
  function prenten(root) {
    if (!root || !root.querySelectorAll) return root;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) if (EMOJI_RE.test(w.currentNode.nodeValue)) nodes.push(w.currentNode);
    for (const n of nodes) {
      EMOJI_RE.lastIndex = 0;
      const tekst = n.nodeValue;
      const frag = document.createDocumentFragment();
      let i = 0;
      for (const m of tekst.matchAll(EMOJI_RE)) {
        const cp = cpVan(m[0]);
        if (!PRENT.has(cp)) continue;
        if (m.index > i) frag.appendChild(document.createTextNode(tekst.slice(i, m.index)));
        const img = document.createElement('img');
        img.className = 'jr-prent';
        img.src = `/img/junior/prent/${cp}.webp`;
        img.alt = m[0];
        img.draggable = false;
        frag.appendChild(img);
        i = m.index + m[0].length;
      }
      if (i === 0) continue;
      if (i < tekst.length) frag.appendChild(document.createTextNode(tekst.slice(i)));
      n.parentNode.replaceChild(frag, n);
    }
    return root;
  }

  // ---------- Het speelveld ----------
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    // Spelknoppen houden hun eigen stijl, ook op het bord (waar de groene knopstijl van de leerkracht geldt).
    if (tag === 'button') e.classList.add('jr-eigen');
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const pop = (e, cls) => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };
  const goedZin = () => { const g = J().zin.goed || []; return g[Math.floor(Math.random() * g.length)] || ''; };
  const foutZin = () => { const f = J().zin.fout || []; return f[Math.floor(Math.random() * f.length)] || ''; };
  const geluid = naam => { try { window.sfx && sfx[naam](); } catch {} };

  // Slepen met de vinger of de muis. Een korte tik zonder te bewegen is een tik (tik).
  function sleepbaar(item, { tik, los, doelen }) {
    item.addEventListener('pointerdown', e => {
      if (item.classList.contains('jr-weg') || item.disabled) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let kloon = null;
      const box = item.getBoundingClientRect();
      const beweeg = ev => {
        if (!kloon && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 10) {
          kloon = item.cloneNode(true);
          kloon.classList.add('jr-sleept');
          kloon.style.width = `${box.width}px`;
          kloon.style.height = `${box.height}px`;
          document.body.appendChild(kloon);
          item.classList.add('jr-bron');
        }
        if (kloon) kloon.style.transform = `translate(${ev.clientX - box.width / 2}px, ${ev.clientY - box.height / 2}px)`;
      };
      const klaar = ev => {
        removeEventListener('pointermove', beweeg);
        removeEventListener('pointerup', klaar);
        removeEventListener('pointercancel', klaar);
        item.classList.remove('jr-bron');
        if (!kloon) return tik && tik();
        kloon.remove();
        const onder = document.elementFromPoint(ev.clientX, ev.clientY);
        const doel = onder && doelen().find(d => d.contains(onder));
        if (doel && los) los(doel);
      };
      addEventListener('pointermove', beweeg);
      addEventListener('pointerup', klaar);
      addEventListener('pointercancel', klaar);
    });
  }

  // Speel één vraag in vak. klaar(meteenGoed) als ze opgelost is. Geeft { stop } terug.
  function speel(vak, v, { klaar }) {
    vak.innerHTML = '';
    vak.dataset.soort = v.soort;
    let fouten = 0;
    let af = false;
    const veld = el('div', 'jr-vraag');
    veld.setAttribute('data-geen-vertaling', '');
    vak.appendChild(veld);
    if (v.kop) veld.appendChild(el('div', 'jr-kop', v.kop));
    if (v.scene) veld.appendChild(el('div', 'jr-scene', v.scene));
    const fout = (knop, hint) => {
      fouten++;
      geluid('bad');
      if (knop) pop(knop, 'jr-schud');
      Stem.zeg([hint || foutZin()]);
    };
    const gelukt = async () => {
      if (af) return;
      af = true;
      geluid('good');
      vak.classList.add('jr-gelukt');
      await Stem.zeg([...(v.na || []), goedZin()], { los: !!(v.na && v.na.length) });
      await new Promise(r => setTimeout(r, 350));
      vak.classList.remove('jr-gelukt');
      klaar(fouten === 0);
    };
    const knopRij = (cls = '') => { const rij = el('div', `jr-opties ${cls}`); veld.appendChild(rij); return rij; };
    const vinkje = doe => {
      const k = el('button', 'jr-vink', '✓');
      k.type = 'button';
      k.addEventListener('click', () => doe(k));
      vak.appendChild(k);
      return k;
    };

    // Opties met een woord eronder worden na de vraag ook voorgelezen, één voor één (het knopje licht dan op).
    const voorlees = [];
    if (v.soort === 'kies') {
      let loopt = false;
      const rij = knopRij(`${v.stenen ? 'jr-stenen' : ''} ${v.lijst ? 'jr-lijst' : ''} ${v.open ? 'jr-open' : ''}`);
      for (const o of v.opties) {
        const k = el('button', 'jr-optie', o.html);
        const woord = k.querySelector('.jr-optie-woord');
        voorlees.push({ k, tekst: woord ? woord.textContent.trim() : '' });
        k.type = 'button';
        k.addEventListener('click', () => {
          if (af || k.disabled || loopt) return;
          // Codeerdraakje: het draakje stapt echt de pijlen af, vakje per vakje.
          const draak = o.pad && v.code && veld.querySelector('.jr-code-draak');
          if (draak) {
            loopt = true;
            let [x, y] = v.code.start;
            o.pad.forEach(([dx, dy], i) => setTimeout(() => {
              if (af) return;
              x = Math.max(0, Math.min(3, x + dx)); y = Math.max(0, Math.min(3, y + dy));
              draak.style.setProperty('--x', x); draak.style.setProperty('--y', y);
              try { sfx.jump(); } catch {}
            }, 150 + i * 480));
            setTimeout(() => {
              if (af) return;
              if (o.juist) { loopt = false; k.classList.add('jr-juist'); gelukt(); return; }
              k.disabled = true; k.classList.add('jr-mis'); fout(k);
              // Mis: even blijven staan, dan terug naar het begin.
              setTimeout(() => { draak.style.setProperty('--x', v.code.start[0]); draak.style.setProperty('--y', v.code.start[1]); loopt = false; }, 700);
            }, 150 + o.pad.length * 480 + 250);
            return;
          }
          if (o.juist) { k.classList.add('jr-juist'); gelukt(); } else { k.disabled = true; k.classList.add('jr-mis'); fout(k); }
        });
        rij.appendChild(k);
      }
    } else if (v.soort === 'ritmeNa') {
      // Tik het ritme na op de trom. Telt alleen de verhouding kort/lang, niet het precieze tempo.
      const nodig = ritmeTijden(v.ritme);
      const stippen = [...veld.querySelectorAll('.jr-ritme b')];
      const knop = el('button', 'jr-trom', beeld('stuk/30'));
      knop.type = 'button';
      veld.appendChild(knop);
      let tik = [], wacht = null;
      const opnieuw = () => { tik = []; stippen.forEach(x => x.classList.remove('af')); };
      knop.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (af) return;
        const c = trom(); if (c) tromSlag(c.currentTime, true);
        pop(knop, 'jr-tik-pop');
        clearTimeout(wacht);
        tik.push(performance.now());
        if (stippen[tik.length - 1]) stippen[tik.length - 1].classList.add('af');
        if (tik.length < nodig.length) { wacht = setTimeout(opnieuw, 2600); return; }
        const tussen = tik.slice(1).map((x, i) => x - tik[i]);
        const verwacht = nodig.slice(0, -1);
        const gem = a => a.reduce((x, y) => x + y, 0) / a.length;
        const mt = gem(tussen) || 1, mv = gem(verwacht) || 1;
        const goed = tussen.every((x, i) => Math.abs(x / mt - verwacht[i] / mv) < 0.42);
        if (goed) { stippen.forEach(x => x.classList.add('af')); gelukt(); return; }
        fout(knop, J().zin.ritmeOpnieuw);
        setTimeout(() => { opnieuw(); if (!af) speelRitme(v.ritme, veld); }, 2600);
      });
    } else if (v.soort === 'tikAlle' || v.soort === 'tikAantal') {
      const veldje = el('div', `jr-tikveld ${v.vak || ''}`);
      veld.appendChild(veldje);
      const nodig = v.soort === 'tikAlle' ? v.items.filter(i => i.doel).length : v.aantal;
      let gevonden = 0;
      for (const it of v.items) {
        const k = el('button', 'jr-tik', it.html);
        k.type = 'button';
        if (it.maat) k.style.setProperty('--m', it.maat);
        if (it.stijl) k.style.cssText += it.stijl;
        k.addEventListener('click', () => {
          if (af) return;
          if (v.soort === 'tikAantal') {
            k.classList.toggle('jr-aan');
            geluid('tick');
            return;
          }
          if (k.classList.contains('jr-aan')) return;
          if (it.doel) {
            k.classList.add('jr-aan');
            geluid('tick');
            if (++gevonden >= nodig) gelukt();
          } else fout(k, it.hint);
        });
        veldje.appendChild(k);
      }
      if (v.soort === 'tikAantal') {
        vinkje(knop => {
          if (af) return;
          const n = veldje.querySelectorAll('.jr-aan').length;
          if (n === nodig) gelukt(); else fout(knop);
        });
      }
    } else if (v.soort === 'sleepAantal') {
      // Het splitshuis zoals in de klas: het getal op het dak, eronder twee kamers. In elke kamer staan de draakjes
      // in vijfstructuur (rijen van 5, zoals een tienveld), zodat kinderen het aantal zien zonder te tellen.
      const plaatsen = Math.ceil(v.totaal / 5) * 5;
      const kamer = doel => {
        const k = el('div', `jr-kamer${doel ? ' jr-doel' : ''}`);
        const raster = el('div', 'jr-raster');
        for (let i = 0; i < plaatsen; i++) raster.appendChild(el('span', 'jr-cel'));
        k.appendChild(raster);
        return k;
      };
      const huis = el('div', 'jr-splitshuis');
      huis.appendChild(el('div', 'jr-splitsdak', `<span class="jr-groot-getal">${v.totaal}</span>`));
      const kamers = el('div', 'jr-kamers');
      const k1 = kamer(false);
      const k2 = kamer(true);
      kamers.append(k1, k2);
      huis.appendChild(kamers);
      veld.appendChild(huis);
      if (v.totaal > 10) veld.classList.add('jr-veel');
      const vrij = k => [...k.querySelectorAll('.jr-cel')].find(c => !c.firstChild);
      for (let i = 0; i < v.vast; i++) vrij(k1).insertAdjacentHTML('beforeend', `<span class="jr-token jr-vast">${v.token}</span>`);
      const pool = el('div', `jr-pool${v.totaal > 10 ? ' jr-pool-breed' : ''}`);
      veld.appendChild(pool);
      // Draakjes schuiven altijd aan in de volgende vrije plaats, en de voorraad blijft in rijen van 5 staan.
      const opschuiven = k => {
        const toks = [...k.querySelectorAll('.jr-token')];
        k.querySelectorAll('.jr-cel').forEach((c, i) => { if (toks[i]) c.appendChild(toks[i]); });
      };
      const zet = (tok, naarKamer) => {
        if (naarKamer) { const c = vrij(k2); if (!c) return; c.appendChild(tok); } else pool.appendChild(tok);
        opschuiven(k2);
        geluid('tick');
      };
      for (let i = 0; i < v.pool; i++) {
        const tok = el('button', 'jr-token', v.token);
        tok.type = 'button';
        sleepbaar(tok, {
          tik: () => !af && zet(tok, tok.parentNode === pool),
          los: doel => !af && zet(tok, doel === k2),
          doelen: () => [k2, pool],
        });
        pool.appendChild(tok);
      }
      vinkje(knop => {
        if (af) return;
        if (k2.querySelectorAll('.jr-token').length === v.doel) gelukt(); else fout(knop);
      });
    } else if (v.soort === 'volgorde') {
      // Woorden in een zin: lagere, smallere vakjes, zodat een lange zin op één scherm past.
      const woorden = !v.trein && v.kaarten.some(k => /jr-woordkaart/.test(k.html)) ? ' jr-woorden' : '';
      const vakken = el('div', `jr-vakken ${v.trein ? 'jr-trein' : ''}${woorden}`);
      if (v.trein) vakken.insertAdjacentHTML('beforeend', beeld('stuk/4', 'jr-loc'));
      const juist = v.kaarten.filter(k => k.plek >= 0).sort((a, b) => a.plek - b.plek);
      const plekken = juist.map(() => {
        const p = el('div', v.trein ? 'jr-wagon-vak' : 'jr-plek');
        if (v.trein) p.insertAdjacentHTML('beforeend', beeld('stuk/5', 'jr-wagon'));
        vakken.appendChild(p);
        return p;
      });
      veld.appendChild(vakken);
      let volgende = 0;
      const leg = (kaart, knop) => {
        knop.classList.add('jr-weg');
        const kopie = el('div', 'jr-kaart jr-gelegd', kaart.html);
        plekken[volgende].appendChild(kopie);
        volgende++;
        if (kaart.zeg) Stem.zeg([kaart.zeg]);
        geluid('tick');
      };
      for (let i = 0; i < (v.vast || 0); i++) leg(juist[i], el('i'));
      const stapel = el('div', 'jr-stapel' + woorden);
      veld.appendChild(stapel);
      const rr = toeval(Math.floor(Math.random() * 1e9));
      for (const kaart of rr.schud(v.kaarten.filter(k => k.plek >= volgende || k.plek < 0))) {
        const knop = el('button', 'jr-kaart', kaart.html);
        knop.type = 'button';
        const probeer = () => {
          if (af || knop.classList.contains('jr-weg')) return;
          // Twee dezelfde letters of woorden (Lotte, pop): elk van beide mag op dat vakje.
          const nodig = juist[volgende];
          if (nodig && kaart !== nodig && kaart.plek > volgende && kaart.html === nodig.html) { nodig.plek = kaart.plek; kaart.plek = volgende; }
          if (kaart.plek === volgende) {
            leg(kaart, knop);
            if (volgende >= juist.length) {
              if (v.trein) vakken.classList.add('jr-rijdt');
              setTimeout(gelukt, v.trein ? 500 : 250);
            }
          } else fout(knop);
        };
        sleepbaar(knop, { tik: probeer, los: probeer, doelen: () => [vakken] });
        stapel.appendChild(knop);
      }
    } else if (v.soort === 'sorteer') {
      const manden = el('div', 'jr-manden');
      const mandEl = v.manden.map(m => {
        const e = el('button', 'jr-mand', `<span class="jr-mand-teken">${m.html}</span><span class="jr-mand-in"></span>`);
        e.type = 'button';
        e.dataset.id = m.id;
        manden.appendChild(e);
        return e;
      });
      const stapel = el('div', 'jr-stapel');
      veld.append(stapel, manden);
      let gekozen = null;
      let over = v.items.length;
      const leg = (it, knop, mand) => {
        if (af || knop.classList.contains('jr-weg')) return;
        if (mand.dataset.id !== it.mand) { fout(knop, it.hint || (J().zin.vormIs && J().zin.vormIs[it.mand])); return; }
        knop.classList.add('jr-weg');
        mand.querySelector('.jr-mand-in').insertAdjacentHTML('beforeend', it.html);
        pop(mand, 'jr-hop');
        geluid('tick');
        gekozen = null;
        if (--over === 0) gelukt();
      };
      for (const it of v.items) {
        const knop = el('button', 'jr-kaart', it.html);
        knop.type = 'button';
        sleepbaar(knop, {
          tik: () => { for (const k of stapel.children) k.classList.remove('jr-aan'); knop.classList.add('jr-aan'); gekozen = { it, knop }; },
          los: mand => leg(it, knop, mand),
          doelen: () => mandEl,
        });
        stapel.appendChild(knop);
      }
      for (const m of mandEl) m.addEventListener('click', () => gekozen && leg(gekozen.it, gekozen.knop, m));
    } else if (v.soort === 'waar') {
      const sc = el('div', v.kar ? 'jr-waar jr-waar-kar' : 'jr-waar');
      sc.innerHTML = beeld('stuk/8', 'jr-tafel') + (v.kar ? beeld('stuk/5', 'jr-kar') : '');
      const draakje = el('div', 'jr-vlieger', beeld('draak/3'));
      sc.appendChild(draakje);
      for (const p of v.plekken) {
        const id = p.id === 'naast' ? `naast-${v.naastKant}` : p.id;
        const k = el('button', `jr-plek-knop jr-eigen jr-p-${id}`);
        k.type = 'button';
        k.addEventListener('click', () => {
          if (af || k.disabled) return;
          if (p.juist) {
            draakje.className = `jr-vlieger jr-p-${id}`;
            k.classList.add('jr-juist');
            setTimeout(gelukt, 450);
          } else { k.disabled = true; fout(k); }
        });
        sc.appendChild(k);
      }
      veld.appendChild(sc);
    } else if (v.soort === 'spoor') {
      // Schrijven: met de vinger over de stippellijn. Elke haal begint bij het groene bolletje, de pijl wijst de richting.
      // Telt pas als bijna de hele lijn in de goede richting overgetrokken is en de vinger niet te ver van de lijn ging.
      const wrap = el('div', 'jr-spoor');
      const lijnen = v.lijnen === false ? '' : `<g class="jr-spoor-lijnen"><line x1="0" x2="${v.w}" y1="15" y2="15"/><line x1="0" x2="${v.w}" y1="45" y2="45" class="mid"/><line x1="0" x2="${v.w}" y1="70" y2="70" class="basis"/><line x1="0" x2="${v.w}" y1="95" y2="95"/></g>`;
      wrap.innerHTML = `<svg viewBox="0 0 ${v.w} 100" preserveAspectRatio="xMidYMid meet">${lijnen}<g class="jr-spoor-gidsen">${v.paden.map(d => `<path class="jr-spoor-gids" d="${d}"/>`).join('')}</g><g class="jr-spoor-inkt"></g><g class="jr-spoor-start"></g></svg>`;
      veld.appendChild(wrap);
      const svg = wrap.firstChild;
      const NS = 'http://www.w3.org/2000/svg';
      const gidsen = [...svg.querySelectorAll('.jr-spoor-gids')];
      const R = v.marge || 8;
      const halen = gidsen.map(pad => {
        const L = pad.getTotalLength();
        const n = Math.max(8, Math.round(L / 2.5));
        return Array.from({ length: n + 1 }, (_, i) => { const q = pad.getPointAtLength((L * i) / n); return { x: q.x, y: q.y }; });
      });
      let h = 0;
      const startG = svg.querySelector('.jr-spoor-start'), inktG = svg.querySelector('.jr-spoor-inkt');
      const toonStart = () => {
        startG.innerHTML = '';
        if (h >= halen.length) return;
        const pts = halen[h], a = pts[0], b = pts[Math.min(pts.length - 1, 3)];
        const hoek = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        startG.innerHTML = `<circle cx="${a.x}" cy="${a.y}" r="4.2" class="jr-spoor-bol"/><g transform="translate(${a.x} ${a.y}) rotate(${hoek})"><path d="M7 -3.5 L13 0 L7 3.5" class="jr-spoor-pijl"/></g>`;
        gidsen.forEach((g, i) => g.classList.toggle('nu', i === h));
      };
      toonStart();
      const punt = e => { const m = svg.getScreenCTM().inverse(); const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return { x: q.x, y: q.y }; };
      const afst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      let tek = null;
      svg.addEventListener('pointerdown', e => {
        if (af || h >= halen.length) return;
        const q = punt(e);
        if (afst(q, halen[h][0]) > R * 1.6) { pop(startG, 'jr-schud'); Stem.zeg([J().zin.spoorBegin]); return; }
        e.preventDefault();
        // Een stip (op de i en j): even tikken is genoeg.
        if (halen[h].length < 3 || afst(halen[h][0], halen[h][halen[h].length - 1]) < 1.5) {
          gidsen[h].classList.add('af');
          const st = document.createElementNS(NS, 'circle');
          st.setAttribute('cx', halen[h][0].x); st.setAttribute('cy', halen[h][0].y); st.setAttribute('r', '1.6'); st.setAttribute('class', 'jr-spoor-stip');
          inktG.appendChild(st);
          h++;
          try { sfx.naald(); } catch {}
          toonStart();
          if (h >= halen.length) gelukt();
          return;
        }
        svg.setPointerCapture(e.pointerId);
        const lijn = document.createElementNS(NS, 'polyline');
        inktG.appendChild(lijn);
        tek = { lijn, pts: [q], hit: 0, mis: 0, tot: 0 };
        lijn.setAttribute('points', `${q.x},${q.y}`);
      });
      svg.addEventListener('pointermove', e => {
        if (!tek) return;
        const q = punt(e);
        tek.pts.push(q);
        tek.lijn.setAttribute('points', tek.pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
        const pts = halen[h];
        tek.tot++;
        // Volgorde: alleen een stukje vooruit mag meetellen (zo telt de lijn achterstevoren overtrekken niet).
        let raak = false;
        for (let i = tek.hit; i < Math.min(pts.length, tek.hit + 6); i++) if (afst(q, pts[i]) < R) { tek.hit = Math.max(tek.hit, i + 1); raak = true; }
        if (!raak && !pts.some(p => afst(q, p) < R * 1.8)) tek.mis++;
      });
      const los = () => {
        if (!tek) return;
        const t = tek; tek = null;
        const pts = halen[h];
        if (t.hit >= pts.length - 1 && t.mis <= Math.max(3, t.tot * 0.25)) {
          t.lijn.classList.add('goed');
          gidsen[h].classList.add('af');
          h++;
          try { sfx.naald(); } catch {}
          toonStart();
          if (h >= halen.length) gelukt();
          return;
        }
        // Nog niet goed: de lijn vervaagt, en opnieuw bij hetzelfde bolletje.
        t.lijn.classList.add('weg');
        setTimeout(() => t.lijn.remove(), 500);
        fout(null, t.hit < pts.length * 0.5 ? J().zin.spoorVolg : J().zin.spoorHeel);
      };
      svg.addEventListener('pointerup', los);
      svg.addEventListener('pointercancel', los);
    }
    prenten(veld);
    if (voorlees.length > 1 && voorlees.every(x => x.tekst)) {
      (async () => {
        await Stem.zeg(v.zeg);
        for (const { k, tekst } of voorlees) {
          if (af || Stem.uit) return;
          await new Promise(r => setTimeout(r, 250));
          if (af) return;
          k.classList.add('jr-leest');
          await Stem.zeg([tekst]);
          k.classList.remove('jr-leest');
        }
      })();
    } else if (v.ritme) Stem.zeg(v.zeg).then(() => { if (!af) speelRitme(v.ritme, v.soort === 'ritmeNa' ? veld : null); });
    else Stem.zeg(v.zeg);
    if (vak._pas) {
      vak._pas();
      for (const img of veld.querySelectorAll('img')) if (!img.complete) img.addEventListener('load', vak._pas, { once: true });
    }
    return {
      herhaal: () => (v.ritme ? Stem.zeg(v.zeg).then(() => { if (!af) speelRitme(v.ritme, v.soort === 'ritmeNa' ? veld : null); }) : Stem.zeg(v.zeg)),
      stop: () => { af = true; Stem.stop(); },
    };
  }

  // Het vak zo groot als het mag: alles in het spel is in em, dus één lettergrootte schaalt het hele speelveld.
  // Daarna past de grootte zich aan de vraag aan: weinig op het scherm (op een gsm) wordt groter, te veel wordt kleiner.
  function schaal(vak) {
    const pas = () => {
      const r = vak.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const basis = Math.max(9, Math.min(r.width / (r.width < 640 ? 21 : 30), r.height / 23));
      let fs = basis;
      vak.style.fontSize = fs + 'px';
      const veld = vak.querySelector(':scope > .jr-vraag');
      if (!veld || !veld.children.length) return;
      const cs = getComputedStyle(vak);
      const hoog = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const breed = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      for (let i = 0; i < 3; i++) {
        const kids = [...veld.children];
        const gap = parseFloat(getComputedStyle(veld).rowGap) || 0;
        const h = kids.reduce((t, k) => t + k.getBoundingClientRect().height, 0) + gap * (kids.length - 1);
        const w = Math.max(...kids.map(k => Math.max(k.scrollWidth, k.getBoundingClientRect().width)));
        if (!h || !w) return;
        const nieuw = Math.max(9, Math.min(fs * Math.min((hoog * 0.9) / h, (breed * 0.96) / w), basis * 1.6));
        if (Math.abs(nieuw - fs) < 0.5) return;
        fs = nieuw;
        vak.style.fontSize = fs + 'px';
      }
    };
    vak._pas = pas;
    pas();
    if ('ResizeObserver' in window) new ResizeObserver(() => pas()).observe(vak);
    else addEventListener('resize', pas);
  }

  window.Junior = { Stem, toeval, vraag, eigenVraag, speel, schaal, beeld, emoji, esc, prenten, MAKERS, minder, niveauVoor, get rustig() { return rustig; }, set rustig(v) { zetRustig(v); } };
})();
