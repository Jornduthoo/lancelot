// LANcelot Junior: de spelletjes zelf, gedeeld door de tablet van het kind (jr-kind.js) en het bord (jr-leerkracht.js).
// Drie sjablonen: tikken (kies één, of tik er meerdere aan), slepen (in de juiste volgorde of het juiste aantal)
// en sorteren (naar de juiste mand). Slepen kan altijd ook met tikken: kleuters vinden tikken makkelijker.
// Een fout is nooit erg: het draakje geeft een hint en het kind probeert opnieuw. Telt voor het logboek: meteen goed of niet.
// Alle tekst en alles wat gezegd wordt, komt uit window.JR (src/junior-inhoud*.js via /junior/inhoud.js).
(() => {
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
        u.rate = rustig ? 0.75 : 0.9;
        u.pitch = 1.1;
        const af = () => { clearTimeout(t); klaar(); };
        const t = setTimeout(af, 4000 + tekst.length * 120);
        u.onend = af;
        u.onerror = af;
        speechSynthesis.speak(u);
      });
    }
    // delen: ['Hoeveel is', 3, 'plus', 4]. Heeft elk stukje een ingesproken bestand, dan die na elkaar.
    async function zeg(delen) {
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
            else await spreek(d, mijn);
          }
          return;
        }
        if (lijst && stukken.every(d => lijst[d])) {
          for (const d of stukken) {
            if (mijn !== beurt) return;
            await clip(lijst[d], mijn);
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
      const plekken = niv === 0 ? ['op', 'onder', r() < 0.5 ? 'naast' : 'naast'] : ['op', 'onder', 'boven', 'links', 'rechts'];
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
      const v = r.kies(set.vragen);
      return {
        soort: 'kies', zeg: [v.s ? { url: `/junior/stem/${v.s}` } : v.vraag], kop: `<span class="jr-vraagkaart">${esc(v.vraag)}</span>`, eigen: true,
        scene: v.f ? `<img class="jr-foto jr-vraag-foto" src="/junior/foto/${esc(v.f)}" alt="">` : '',
        opties: v.opties.map((o, i) => ({ html: `${o.f ? `<img class="jr-foto" src="/junior/foto/${esc(o.f)}" alt="">` : o.e ? emoji(esc(o.e), 'jr-emoji-groot') : ''}${o.w ? `<span class="jr-optie-woord">${esc(o.w)}</span>` : ''}`, juist: i === v.juist })),
      };
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
    // Geldmarkt: hoeveel geld is dit? Munten en briefjes in euro.
    geld(r, niv) {
      const soorten = niv === 0 ? [1, 2, 5] : niv === 1 ? [1, 2, 5, 10] : [5, 10, 20, 50];
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
        scene: `<div class="jr-geld">${stukken.map(s => beeld(`geld/${s}`, s >= 5 ? 'jr-briefje' : 'jr-munt')).join('')}</div>`,
        opties: buren(r, som, niv === 2 ? 5 : 1, 1).map(x => ({ html: `<span class="jr-getal">€ ${x}</span>`, juist: x === som })),
        na: [som, J().zin.euro],
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
      const SOORT = { dier: ['🐶', '🐱', '🐰', '🐻', '🐸', '🐷', '🐮', '🦁'], fruit: ['🍎', '🍌', '🍐', '🍇', '🍓', '🍒', '🍊'], voertuig: ['🚗', '🚌', '🚲', '🚂', '🚜', '✈️', '🚀'],
        kleding: ['👕', '👖', '🧦', '👗', '🧢', '👟'], bal: ['⚽', '🏀', '🎾', '🏈', '🏐'] };
      const n = niv === 0 ? 2 : 3;
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
      let x = r.int(0, 3), y = r.int(0, 3);
      const start = [x, y];
      const pad = [];
      for (let i = 0; i < stappen; i++) {
        const kan = Object.keys(PIJL).filter(k => { const nx = x + PIJL[k][1], ny = y + PIJL[k][2]; return nx >= 0 && nx < 4 && ny >= 0 && ny < 4 && !(nx === start[0] && ny === start[1]); });
        const k = r.kies(kan);
        x += PIJL[k][1]; y += PIJL[k][2];
        pad.push(k);
      }
      if (x === start[0] && y === start[1]) return MAKERS.code(r, niv);
      const toon = p => p.map(k => PIJL[k][0]).join('');
      const doel = toon(pad);
      const set = new Set([doel]);
      for (let i = 0; set.size < 3 && i < 40; i++) {
        const p = pad.slice();
        const j = r.int(0, p.length - 1);
        p[j] = r.kies(Object.keys(PIJL).filter(k => k !== p[j]));
        if (stappen > 1 && r() < 0.4) p.reverse();
        set.add(toon(p));
      }
      const cellen = [];
      for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
        const inh = cx === start[0] && cy === start[1] ? beeld('draak/3') : cx === x && cy === y ? beeld('stuk/7') : '';
        cellen.push(`<span class="jr-code-cel">${inh}</span>`);
      }
      return {
        soort: 'kies', zeg: [stappen === 1 ? J().zin.codeEen : J().zin.codeVraag],
        scene: `<div class="jr-code">${cellen.join('')}</div>`,
        opties: r.schud([...set]).map(t => ({ html: `<span class="jr-pijlen">${t}</span>`, juist: t === doel })),
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
        soort: 'kies', zeg: [J().zin.klapVraag, w.w], herhaal: [w.w], na: [w.g || w.w],
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
      const pool = niv === 0 ? alle.slice(0, 6) : alle;
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
    // Hoe help je? Een situatie in de klas, kies wat een goede vriend doet. Niveau 2: beleefd zijn.
    helpen(r, niv) {
      const pool = (J().helpen || []).filter(h => h.n === niv + 1);
      const h = r.kies(pool);
      const fout = r.schud(J().helpFout || []).slice(0, niv === 0 ? 2 : 3);
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
      return {
        soort: 'kies', zeg: [J().zin.geluid, doel.zeg], herhaal: [doel.zeg],
        kop: '<span class="jr-luister">👂</span>',
        opties: r.schud([doel, ...rest]).map(g => ({ html: emoji(g.e, 'jr-emoji-groot'), juist: g === doel })),
      };
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
  function vraag(spel, niveau, r, wie) {
    const m = MAKERS[spel];
    return m ? m(r, Number(niveau) || 0, wie || {}) : null;
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
      await Stem.zeg([...(v.na || []), goedZin()]);
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

    if (v.soort === 'kies') {
      const rij = knopRij(`${v.stenen ? 'jr-stenen' : ''} ${v.lijst ? 'jr-lijst' : ''} ${v.open ? 'jr-open' : ''}`);
      for (const o of v.opties) {
        const k = el('button', 'jr-optie', o.html);
        k.type = 'button';
        k.addEventListener('click', () => {
          if (af || k.disabled) return;
          if (o.juist) { k.classList.add('jr-juist'); gelukt(); } else { k.disabled = true; k.classList.add('jr-mis'); fout(k); }
        });
        rij.appendChild(k);
      }
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
      const sc = el('div', 'jr-waar');
      sc.innerHTML = beeld('stuk/8', 'jr-tafel');
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
    }
    Stem.zeg(v.zeg);
    if (vak._pas) {
      vak._pas();
      for (const img of veld.querySelectorAll('img')) if (!img.complete) img.addEventListener('load', vak._pas, { once: true });
    }
    return {
      herhaal: () => Stem.zeg(v.zeg),
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

  window.Junior = { Stem, toeval, vraag, speel, schaal, beeld, emoji, esc, MAKERS, minder, niveauVoor, get rustig() { return rustig; }, set rustig(v) { zetRustig(v); } };
})();
