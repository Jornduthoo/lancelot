// LANcelot Junior: de spelletjes zelf, gedeeld door de tablet van het kind (jr-kind.js) en het bord (jr-leerkracht.js).
// Drie sjablonen: tikken (kies één, of tik er meerdere aan), slepen (in de juiste volgorde of het juiste aantal)
// en sorteren (naar de juiste mand). Slepen kan altijd ook met tikken: kleuters vinden tikken makkelijker.
// Een fout is nooit erg: het draakje geeft een hint en het kind probeert opnieuw. Telt voor het logboek: meteen goed of niet.
// Alle tekst en alles wat gezegd wordt, komt uit window.JR (src/junior-inhoud*.js via /junior/inhoud.js).
(() => {
  const J = () => window.JR || { zin: {}, stemmen: [] };

  // ---------- De stem ----------
  // Eerst de ingesproken bestanden (Vlaams voor het Nederlands), anders de stem van de browser in de juiste taal.
  const Stem = (() => {
    let lijst = null;
    let beurt = 0;
    let audio = null;
    let uit = false;
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
      if (audio) { audio.pause(); audio = null; }
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
    function clip(file, mijn) {
      return new Promise(klaar => {
        if (mijn !== beurt) return klaar();
        const a = new Audio(`/img/junior/stem/${taal()}/${file}`);
        audio = a;
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
        u.rate = 0.9;
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
      const stukken = (Array.isArray(delen) ? delen : [delen]).filter(d => d !== '' && d != null).map(String);
      if (uit || !stukken.length) return;
      if (lijst && stukken.every(d => lijst[d])) {
        for (const d of stukken) {
          if (mijn !== beurt) return;
          await clip(lijst[d], mijn);
        }
        return;
      }
      await spreek(stukken.join(' '), mijn);
    }
    return {
      zeg, stop,
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
      let p;
      for (let poging = 0; poging < 60; poging++) {
        const hoek = r() * Math.PI * 2;
        const straal = Math.sqrt(r());
        p = { x: 50 + Math.cos(hoek) * straal * 34, y: 52 + Math.sin(hoek) * straal * 26, d: Math.round((r() - 0.5) * 50) };
        if (uit.every(q => Math.hypot((q.x - p.x) * 1.5, q.y - p.y) > 17)) break;
      }
      uit.push(p);
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

  function vraag(spel, niveau, r) {
    const m = MAKERS[spel];
    return m ? m(r, Number(niveau) || 0) : null;
  }

  // ---------- Het speelveld ----------
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
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
      const vakken = el('div', `jr-vakken ${v.trein ? 'jr-trein' : ''}`);
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
      const stapel = el('div', 'jr-stapel');
      veld.appendChild(stapel);
      const rr = toeval(Math.floor(Math.random() * 1e9));
      for (const kaart of rr.schud(v.kaarten.filter(k => k.plek >= volgende || k.plek < 0))) {
        const knop = el('button', 'jr-kaart', kaart.html);
        knop.type = 'button';
        const probeer = () => {
          if (af || knop.classList.contains('jr-weg')) return;
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
        if (mand.dataset.id !== it.mand) { fout(knop, J().zin.vormIs && J().zin.vormIs[it.mand]); return; }
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
        const k = el('button', `jr-plek-knop jr-p-${id}`);
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
    return {
      herhaal: () => Stem.zeg(v.zeg),
      stop: () => { af = true; Stem.stop(); },
    };
  }

  // Het vak zo groot als het mag: alles in het spel is in em, dus één lettergrootte schaalt het hele speelveld.
  function schaal(vak) {
    const zet = () => {
      const r = vak.getBoundingClientRect();
      vak.style.fontSize = `${Math.max(9, Math.min(r.width / (r.width < 640 ? 21 : 30), r.height / 23))}px`;
    };
    zet();
    if ('ResizeObserver' in window) new ResizeObserver(zet).observe(vak);
    else addEventListener('resize', zet);
  }

  window.Junior = { Stem, toeval, vraag, speel, schaal, beeld, emoji, esc, MAKERS };
})();
