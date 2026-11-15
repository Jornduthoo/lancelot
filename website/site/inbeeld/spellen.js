// In Beeld: spelletjes voor één speler, met de kaarten uit de woordbib (of een project of thema).
// Elk spelletje geeft een lijst { kaart, juist } terug; die gaat naar de dagelijkse herhaling (doos 0-5).
// Daarbovenop: punten, reeksen, drie niveaus, een record per spel en niveau, een joker en een herkansing.
(function () {
  'use strict';
  const { K, BY, S, ICON, rel, splits, beeld, vak, esc, $, $$, shuffle, vandaag, store, spreek, spreekKnop,
    kleuter, bewaarResultaten, kaartHTML, route, go, spelKaarten } = IB;

  // ---------- niveaus ----------
  const NIVEAUS = [
    { id: 'rustig', naam: 'Rustig', uitleg: 'minder keuzes, meer tijd en meer hulp' },
    { id: 'normaal', naam: 'Normaal', uitleg: '' },
    { id: 'pittig', naam: 'Pittig', uitleg: 'meer keuzes, minder tijd, minder hulp' },
  ];
  const niveau = () => kleuter() ? 'rustig' : (NIVEAUS.some(n => n.id === store.get('ib_niveau')) ? store.get('ib_niveau') : 'normaal');
  const N = (r, n, p) => ({ rustig: r, normaal: n, pittig: p })[niveau()];
  const nAf = (max = 4) => kleuter() ? 2 : Math.min(max, N(2, 3, 4)); // aantal foute keuzes

  // ---------- spelletjes ----------
  const t = s => `<span class="ic-t">${s}</span>`;
  const IC = {
    klok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
    duim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12l4 4 6-8"/><path d="M15 14l6 6M21 14l-6 6"/></svg>',
    indringer: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><rect x="13" y="14" width="6" height="6" rx="1" transform="rotate(12 16 17)"/></svg>',
    koppel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="3" width="6" height="5" rx="1.5"/><rect x="2" y="16" width="6" height="5" rx="1.5"/><rect x="16" y="3" width="6" height="5" rx="1.5"/><rect x="16" y="16" width="6" height="5" rx="1.5"/><path d="M8 5.5 16 18.5M8 18.5l8-13"/></svg>',
    raster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><path d="M5 6l14 12" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>',
    memory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="8" height="14" rx="2"/><rect x="13.5" y="5" width="8" height="14" rx="2" fill="currentColor"/></svg>',
    sorteer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h7v8H3zM14 12h7v8h-7z"/><path d="M9 3h6v5H9z" fill="currentColor"/></svg>',
    schaduw: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="15" cy="14" r="6" fill="currentColor"/></svg>',
  };
  const SPELLEN = [
    { id: 'dag5', naam: 'De dagelijkse 5', uitleg: 'Vijf kaarten die terugkomen, met voorrang voor wat je bijna vergeten bent.', kl: 'Vijf prentjes om te zoeken.', voor: 'alle', groep: 'dag', ic: ICON.ster },
    { id: 'luister', naam: 'Luister en zoek', uitleg: 'Je hoort een woord. Tik op het juiste prentje.', voor: 'kleuter', ic: ICON.spreek },
    { id: 'schaduw', naam: 'Welke schaduw?', uitleg: 'Zoek de schaduw van het prentje.', voor: 'kleuter', ic: IC.schaduw },
    { id: 'snel', naam: 'Tegen de klok', uitleg: 'Zoveel mogelijk juiste antwoorden voor de tijd op is. Een reeks geeft extra punten.', voor: 'lager', groep: 'snel', ic: IC.klok },
    { id: 'waar', naam: 'Klopt het?', uitleg: 'Past de uitleg bij het woord? Beslis: klopt of klopt niet.', kl: 'Is dit het juiste woord? Duim omhoog of omlaag.', voor: 'alle', groep: 'snel', ic: IC.duim },
    { id: 'indringer', naam: 'Wie hoort er niet bij?', uitleg: 'Drie begrippen horen samen. Vind de indringer.', kl: 'Welk prentje hoort er niet bij?', voor: 'alle', groep: 'snel', ic: IC.indringer },
    { id: 'wie', naam: 'Wie ben ik?', uitleg: 'Lees de uitleg en raad het begrip.', voor: 'lager', groep: 'betekenis', ic: t('?') },
    { id: 'betekenis', naam: 'Wat betekent het?', uitleg: 'Je ziet een woord. Kies de juiste uitleg.', voor: 'lager', groep: 'betekenis', ic: t('Aa') },
    { id: 'zin', naam: 'Welk woord past?', uitleg: 'Vul het juiste woord in de zin in.', voor: 'lager', groep: 'betekenis', ic: t('_ _') },
    { id: 'koppel', naam: 'Verbinden', uitleg: 'Verbind elk woord met zijn beeld of uitleg.', voor: 'lager', groep: 'betekenis', ic: IC.koppel },
    { id: 'knoop', naam: 'Knoop het vast', uitleg: 'Welk begrip hoort erbij? Leg de verbinding uit het woordweb.', voor: 'lager', groep: 'betekenis', ic: ICON.web },
    { id: 'raadsel', naam: 'Woordraadsel', uitleg: 'Raad het woord letter per letter. De uitleg helpt je.', voor: 'lager', groep: 'letters', ic: t('a_c') },
    { id: 'hussel', naam: 'Letterhussel', uitleg: 'De letters liggen door elkaar. Zet ze in de juiste volgorde.', voor: 'lager', groep: 'letters', ic: t('lps') },
    { id: 'zoeker', naam: 'Woordzoeker', uitleg: 'Zoek de begrippen in het letterrooster. Op Pittig krijg je enkel de uitleg.', voor: 'lager', groep: 'letters', ic: IC.raster },
    { id: 'memory', naam: 'Memory', uitleg: 'Zoek het woord bij het beeld of bij de uitleg.', kl: 'Zoek twee dezelfde prentjes.', voor: 'alle', groep: 'ordenen', ic: IC.memory },
    { id: 'sorteer', naam: 'Sorteren', uitleg: 'Zet elk woord in de juiste groep.', voor: 'lager', groep: 'ordenen', ic: IC.sorteer },
  ];
  const GROEPEN = [
    { id: 'snel', naam: 'Snel en spannend' },
    { id: 'betekenis', naam: 'Woorden en betekenis' },
    { id: 'letters', naam: 'Letters en spelling' },
    { id: 'ordenen', naam: 'Kijken en ordenen' },
  ];
  const past = s => s.voor === 'alle' || (s.voor === 'kleuter') === !!kleuter();

  // ---------- records (enkel op dit toestel) ----------
  const wie = () => S.ik.gast ? 'gast' : S.ik.naam + '|' + S.ik.klas;
  const recSleutel = id => wie() + '|' + id + '|' + niveau();
  const record = id => (store.get('ib_rec', {}) || {})[recSleutel(id)] || 0;
  function zetRecord(id, punten) {
    const r = store.get('ib_rec', {}) || {}, oud = r[recSleutel(id)] || 0;
    if (punten > oud) { r[recSleutel(id)] = punten; store.set('ib_rec', r); }
    return { oud, nieuw: punten > oud && punten > 0 };
  }

  // Genoeg kaarten om mee te spelen. Een lege woordbib (net begonnen): de kaarten van het eigen leerjaar.
  function pool(sleutel) {
    let p = spelKaarten(sleutel);
    if (kleuter()) {
      p = p.filter(k => k.b);
      if (p.length < 6) p = K.filter(k => k.b && k.s <= Math.max(S.ik.lj, 1));
    } else if (p.length < 8) p = K.filter(k => k.s <= S.ik.lj);
    return p;
  }

  // Foute antwoorden die toch lijken: liefst hetzelfde vak en een leerjaar in de buurt. Op Pittig nog dichter bij.
  function afleiders(k, p, n, o = {}) {
    const kern = splits(k.w).kern.toLowerCase();
    const ok = x => x.n !== k.n && splits(x.w).kern.toLowerCase() !== kern && (!o.beeld || x.b) && (!o.niet || !o.niet.includes(x.n))
      && (!o.uitleg || x.u !== k.u);
    const toeval = N(6, 3, 1.5);
    const score = x => (x.v === k.v ? 0 : 4) + Math.abs(x.s - k.s) + (x.c === k.c ? -1.5 : 0) + Math.random() * toeval;
    let kand = p.filter(ok);
    if (kand.length < n * 2) kand = kand.concat(K.filter(x => ok(x) && !kand.includes(x) && x.s <= (S.ik ? S.ik.lj + 1 : 8)));
    return kand.sort((a, b) => score(a) - score(b)).slice(0, n);
  }
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const leeg = (el, tekst) => { el.innerHTML = `<div class="leeg-melding">${tekst} Probeer een ander spelletje.</div>`; };
  const uniek = (p, f) => { const gezien = new Set(); return p.filter(k => { const w = norm(splits(k.w).kern); if (gezien.has(w) || !f(w, k)) return false; gezien.add(w); return true; }); };

  // ---------- punten en reeksen ----------
  // Juist: 10 punten, +2 per antwoord in een reeks (max +10). Met joker, herkansing of na een fout: 5.
  function maakScore(box) {
    const sc = { punten: 0, reeks: 0, beste: 0, goed: 0 };
    const kl = kleuter();
    function teken(plus) {
      box.innerHTML = kl
        ? `<span class="pt ster">${ICON.ster}<b>${sc.goed}</b></span>`
        : `<span class="pt"><b>${sc.punten}</b> punten</span>${sc.reeks >= 2 ? `<span class="reeks${[3, 5, 10, 15, 20].includes(sc.reeks) ? ' knal' : ''}">${sc.reeks} op een rij</span>` : ''}`;
      if (plus && !kl) { const s = document.createElement('span'); s.className = 'plus'; s.textContent = '+' + plus; box.appendChild(s); }
    }
    sc.juist = (o = {}) => {
      sc.reeks++; sc.goed++; sc.beste = Math.max(sc.beste, sc.reeks);
      const plus = Math.max(1, (o.half ? 5 : 10) + Math.min(sc.reeks - 1, 5) * 2 + (o.bonus || 0));
      sc.punten += plus; teken(plus); return plus;
    };
    sc.fout = () => { sc.reeks = 0; teken(); };
    teken();
    return sc;
  }

  // ---------- vraagsoorten (meerkeuze) ----------
  const woordOptie = x => ({ k: x, html: esc(x.w), cls: '' });
  const groteSpreek = ICON.spreek.replace('<svg', '<svg width="28" height="28"');
  const vragen = {
    wie(k, p) {
      return { k, vraag: `<span class="muted" style="font-size:.7em;display:block">Wie ben ik?</span>“${esc(k.u)}”`, lees: k.u + ' Wie ben ik?', opties: [k, ...afleiders(k, p, nAf())].map(woordOptie) };
    },
    betekenis(k, p) {
      return { k, vraag: `Wat betekent <b>${esc(k.w)}</b>?`, lees: 'Wat betekent ' + k.w + '?', opties: [k, ...afleiders(k, p, nAf(3), { uitleg: true })].map(x => ({ k: x, html: esc(x.u), cls: 'tekst' })) };
    },
    zin(k, p) {
      const { kern } = splits(k.w);
      const re = new RegExp('(^|[^\\p{L}])(' + kern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^\\p{L}]|$)', 'iu');
      if (!re.test(k.z) || kern.length < 3) return null;
      const zin = esc(k.z).replace(re, '$1<span class="blank">&nbsp;</span>');
      return { k, vraag: zin, lees: null, opties: [k, ...afleiders(k, p, nAf())].map(x => ({ k: x, html: esc(splits(x.w).kern), cls: '' })) };
    },
    beeld(k, p) {
      if (!k.b) return null;
      return { k, boven: `<div class="toon-beeld"><img src="${beeld(k)}" alt=""></div>`, vraag: 'Welk woord hoort bij dit beeld?', opties: [k, ...afleiders(k, p, nAf())].map(woordOptie) };
    },
    luister(k, p) {
      if (!k.b) return null;
      const af = afleiders(k, p, 2, { beeld: true });
      if (af.length < 2) return null;
      return { k, vraag: `<button class="btn big" type="button" data-spreek="${esc(k.w)}">${groteSpreek} Luister</button>`, lees: 'Zoek: ' + k.w,
        opties: [k, ...af].map(x => ({ k: x, html: `<img src="${beeld(x)}" alt="${esc(x.w)}">`, cls: 'prent', label: x.w })) };
    },
    schaduw(k, p) {
      if (!k.b) return null;
      const af = afleiders(k, p, 2, { beeld: true });
      if (af.length < 2) return null;
      return { k, boven: `<div class="toon-beeld"><img src="${beeld(k)}" alt=""></div>`, vraag: 'Welke schaduw hoort erbij?', lees: 'Zoek de schaduw van: ' + k.w,
        opties: [k, ...af].map(x => ({ k: x, html: `<img src="${beeld(x)}" alt="">`, cls: 'prent schaduw', label: 'schaduw' })) };
    },
    knoop(k, p) {
      const r = rel(k);
      if (!r.length) return null;
      const goed = BY[shuffle(r)[0]], n = nAf();
      const af = afleiders(goed, p, n + 2, { niet: [k.n, ...r] }).filter(x => x.c !== k.c || x.v !== k.v).slice(0, n);
      if (af.length < n) return null;
      return { k, goed, boven: k.b ? `<div class="toon-beeld" style="width:min(160px,40vw)"><img src="${beeld(k)}" alt=""></div>` : '',
        vraag: `Welk begrip hoort bij <b>${esc(k.w)}</b>?`, lees: 'Welk begrip hoort bij ' + k.w + '?', opties: [goed, ...af].map(woordOptie) };
    },
  };

  // De dagelijkse 5: eerst wat vandaag terug moet komen, dan nieuwe kaarten, dan iets van vroeger.
  function kies5(p) {
    const vg = S.ik.voortgang, nu = vandaag();
    const due = shuffle(p.filter(k => vg[k.n] && vg[k.n][1] <= nu)).sort((a, b) => vg[a.n][0] - vg[b.n][0]);
    const nieuw = shuffle(p.filter(k => !vg[k.n] && k.s >= S.ik.lj));
    const rest = shuffle(p.filter(k => !vg[k.n] && k.s < S.ik.lj));
    const later = shuffle(p.filter(k => vg[k.n] && vg[k.n][1] > nu)).sort((a, b) => vg[a.n][0] - vg[b.n][0]);
    const uit = [];
    for (const k of [...due, ...nieuw, ...rest, ...later]) { if (!uit.includes(k)) uit.push(k); if (uit.length === 5) break; }
    return uit;
  }

  function maakVragen(soort, p, n) {
    const uit = [];
    const bron = soort === 'dag5' ? kies5(p) : shuffle(p);
    for (const k of bron) {
      let v = null;
      if (soort === 'dag5') {
        const types = kleuter() ? shuffle(['luister', 'luister', 'schaduw']) : shuffle(['wie', 'betekenis', 'zin', 'beeld', 'wie']);
        for (const tp of types) { v = vragen[tp](k, p); if (v) break; }
        if (!v && !kleuter()) v = vragen.wie(k, p);
      } else v = vragen[soort](k, p);
      if (v) uit.push(v);
      if (uit.length >= n) break;
    }
    return uit;
  }

  // Klopt het? Een woord met een uitleg (of bij kleuters: een prentje met een gesproken woord).
  function waarVragen(p) {
    const kl = kleuter();
    const kaarten = shuffle(kl ? p.filter(k => k.b) : p).slice(0, kl ? 6 : N(8, 10, 14));
    const JA = { n: 'ja' }, NEE = { n: 'nee' };
    return kaarten.map(k => {
      let ander = k;
      if (Math.random() < .5) {
        ander = niveau() === 'rustig' && !kl
          ? shuffle(K.filter(x => x.v !== k.v && x.s <= S.ik.lj + 1))[0]
          : afleiders(k, p, 1, { beeld: kl, uitleg: true })[0];
        ander = ander || k;
      }
      const waar = ander === k, goed = waar ? JA : NEE;
      if (kl) {
        const zeg = 'Is dit: ' + ander.w + '?';
        return { k, goed, vast: true, boven: `<div class="toon-beeld"><img src="${beeld(k)}" alt=""></div>`,
          vraag: `<button class="btn big" type="button" data-spreek="${esc(zeg)}">${groteSpreek} ${esc(ander.w)}?</button>`, lees: zeg,
          fb: waar ? 'Het klopte wel!' : `Dit is <b>${esc(k.w)}</b>.`, zeg: waar ? 'Het klopte wel.' : 'Dit is ' + k.w,
          opties: [{ k: JA, html: '<span class="duim">👍</span>', cls: 'duimpje ja', label: 'Ja, het klopt' }, { k: NEE, html: '<span class="duim">👎</span>', cls: 'duimpje nee', label: 'Nee, het klopt niet' }] };
      }
      return { k, goed, vast: true, boven: k.b && niveau() !== 'pittig' ? `<div class="toon-beeld klein"><img src="${beeld(k)}" alt=""></div>` : '',
        vraag: `<b>${esc(k.w)}</b><span class="waar-uitleg">“${esc(ander.u)}”</span>`, lees: k.w + '. ' + ander.u,
        fb: waar ? 'Het klopte wel.' : `Dat klopt niet. <b>${esc(k.w)}</b>: ${esc(k.u)}`,
        opties: [{ k: JA, html: '✓ Klopt', cls: 'jn ja' }, { k: NEE, html: '✗ Klopt niet', cls: 'jn nee' }] };
    });
  }

  // Wie hoort er niet bij? Drie kaarten uit één groep, één indringer.
  function indringerVragen(p) {
    const kl = kleuter();
    const ok = k => !kl || k.b;
    let bron = p.filter(ok);
    if (bron.length < 16) bron = bron.concat(K.filter(k => ok(k) && !bron.includes(k) && k.s <= Math.max(S.ik.lj, 1)));
    const groep = k => k.c || k.d;
    const m = {}; bron.forEach(k => (m[groep(k)] = m[groep(k)] || []).push(k));
    const groepen = Object.entries(m).filter(([, l]) => l.length >= 3);
    if (!groepen.length) return [];
    const uit = [], gebruikt = new Set(), n = kl ? 5 : N(5, 6, 8);
    for (let poging = 0; uit.length < n && poging < 80; poging++) {
      const [naam, l] = shuffle(groepen)[0];
      const drie = shuffle(uniek(l.filter(k => !gebruikt.has(k.n)), () => true)).slice(0, 3);
      if (drie.length < 3) continue;
      const v0 = drie[0].v;
      // Rustig: een indringer uit een ander vak. Normaal en Pittig: uit hetzelfde vak, maar een andere groep.
      let kand = bron.filter(k => groep(k) !== naam && !gebruikt.has(k.n) && (niveau() === 'rustig' ? k.v !== v0 : k.v === v0));
      if (!kand.length) kand = bron.filter(k => groep(k) !== naam && !gebruikt.has(k.n));
      if (!kand.length) continue;
      const ind = niveau() === 'pittig' ? kand.sort((a, b) => Math.abs(a.s - drie[0].s) - Math.abs(b.s - drie[0].s) + Math.random() * 2 - 1)[0] : shuffle(kand)[0];
      [...drie, ind].forEach(k => gebruikt.add(k.n));
      const opt = x => kl ? { k: x, html: `<img src="${beeld(x)}" alt="${esc(x.w)}">`, cls: 'prent', label: x.w } : { k: x, html: esc(x.w), cls: '' };
      uit.push({ k: ind, vraag: kl ? 'Welk prentje hoort er niet bij?' : 'Welk begrip hoort er <b>niet</b> bij?', lees: kl ? 'Welk prentje hoort er niet bij?' : null,
        opties: [ind, ...drie].map(opt), na: kl ? '' : `De andere drie horen bij <b>${esc(naam)}</b>.`, zeg: 'Het was ' + ind.w });
    }
    return uit;
  }

  // ---------- spelmenu ----------
  route(/^\/spel$/, (el, _, q) => {
    if (!S.ik) return go('#/proberen');
    const set = q.get('set') || '';
    const suffix = set ? '?set=' + encodeURIComponent(set) : '';
    const titel = set.startsWith('project:') ? (S.ik.projecten.find(x => 'project:' + x.id === set) || {}).naam : set.startsWith('thema:') ? set.slice(6) : '';
    const kl = kleuter(), kleur = { snel: 'st', betekenis: 'wis', letters: 'nl', ordenen: 'wo' };
    const lijst = SPELLEN.filter(past);
    const tegel = s => {
      const rec = kl ? 0 : record(s.id);
      return `<a class="tegel spel-tegel ${s.id === 'dag5' ? 'groot' : kl ? ['wis', 'nl', 'wo', 'st'][lijst.indexOf(s) % 4] : kleur[s.groep]}" href="#/spel/${s.id}${suffix}">
        <span class="ic">${s.ic}</span><h3>${s.naam}</h3><p>${kl && s.kl ? s.kl : s.uitleg}</p>${rec ? `<span class="rec">${ICON.ster} Record ${rec}</span>` : ''}</a>`;
    };
    el.innerHTML = `<div class="page-head"><div><div class="eyebrow">Spelletjes${titel ? ' · ' + esc(titel) : ''}</div><h1>${kl ? 'Kies een spelletje' : 'Speels oefenen'}</h1>
      <p>${titel ? 'Je speelt met de kaarten van ' + esc(titel) + '.' : kl ? 'Elk spelletje duurt maar even.' : 'Elk spelletje duurt een paar minuten. Wat je goed doet, komt minder vaak terug.'}</p></div>
      ${kl ? spreekKnop('Kies een spelletje.') : ''}</div>
      ${kl ? '' : `<div class="niveaus" role="radiogroup" aria-label="Niveau"><span class="eyebrow">Niveau</span>${NIVEAUS.map(n => `<button type="button" class="chip" role="radio" aria-pressed="${n.id === niveau()}" aria-checked="${n.id === niveau()}" data-niv="${n.id}">${n.naam}</button>`).join('')}<span class="muted niv-uitleg">${esc(NIVEAUS.find(n => n.id === niveau()).uitleg)}</span></div>`}
      ${kl ? `<div class="spellen">${lijst.map(tegel).join('')}</div>`
        : `<div class="spellen">${tegel(lijst[0])}</div>` + GROEPEN.map(g => `<h2 class="spelgroep">${g.naam}</h2><div class="spellen">${lijst.filter(s => s.groep === g.id).map(tegel).join('')}</div>`).join('')}`;
    $$('[data-niv]', el).forEach(b => b.onclick = () => { store.set('ib_niveau', b.dataset.niv); IB.render(); });
  }, { nav: '/spel', titel: 'Spelletjes' });

  route(/^\/spel\/(\w+)$/, (el, [id], q) => {
    if (!S.ik) return go('#/proberen');
    const spel = SPELLEN.find(s => s.id === id);
    if (!spel || !past(spel)) return go('#/spel');
    document.onkeydown = null;
    const set = q.get('set') || '';
    const p = pool(set);
    const terug = '#/spel' + (set ? '?set=' + encodeURIComponent(set) : '');
    const niv = NIVEAUS.find(n => n.id === niveau());
    el.innerHTML = `<div class="speelveld"><div class="row spelkop"><a class="terug" href="${terug}">← Spelletjes</a><span class="spacer"></span>
      <div class="scorebalk" aria-live="polite"></div><span class="eyebrow">${spel.naam}${kleuter() ? '' : ' · ' + niv.naam}</span></div><div id="veld"></div></div>`;
    const veld = $('#veld', el), sc = maakScore($('.scorebalk', el));
    const klaar = res => einde(veld, spel, res, sc, () => IB.render(), terug);
    const eigen = { memory, sorteer, raadsel, snel, koppel, hussel, zoeker };
    if (eigen[id]) return eigen[id](veld, p, klaar, sc);
    let vr;
    if (id === 'waar') vr = waarVragen(p);
    else if (id === 'indringer') vr = indringerVragen(p);
    else vr = maakVragen(id, p, id === 'dag5' ? 5 : kleuter() ? 6 : N(6, 8, 12));
    if (vr.length < 3) return leeg(veld, `Er zijn nog niet genoeg kaarten voor dit spelletje (${p.length}).`);
    vraagRonde(veld, vr, klaar, sc, { herkansing: id !== 'waar', joker: id !== 'waar' });
  }, { nav: '/spel', titel: 'Spelen' });

  // ---------- meerkeuze, met joker (50/50) en herkansing ----------
  function vraagRonde(el, vr, klaar, sc, o = {}) {
    const kl = kleuter(), herk = o.herkansing !== false;
    let jokers = o.joker !== false && !kl ? N(2, 1, 1) : 0;
    const rij = vr.map(v => ({ v, h: false })), res = new Map(), stand = [];
    let i = 0;
    function toon() {
      const { v, h } = rij[i], opties = v.vast ? v.opties : shuffle(v.opties), goedNr = (v.goed || v.k).n;
      const nogH = rij.slice(i).filter(r => r.h).length;
      el.innerHTML = `<div class="voortgang">${vr.map((_, j) => `<i class="${j < stand.length ? stand[j] : j === stand.length && !h ? 'nu' : ''}"></i>`).join('')}</div>
        ${h ? `<div class="herkans-label">Herkansing${nogH > 1 ? ` · nog ${nogH}` : ''}</div>` : ''}
        ${v.boven || ''}
        <div class="vraag">${v.vraag}</div>
        ${v.lees && !kl ? `<div style="margin:-10px 0 16px">${spreekKnop(v.lees)}</div>` : ''}
        <div class="opties${opties.length > 4 ? ' veel' : ''}">${opties.map((x, j) => `<button type="button" class="optie ${x.cls}" data-j="${j}"${x.label ? ` aria-label="${esc(x.label)}"` : ''}>${x.html}</button>`).join('')}</div>
        <div class="feedback"><span class="msg" aria-live="polite"></span>
          <span class="row" style="gap:8px">${jokers && opties.length > 2 ? `<button class="btn ghost small" type="button" id="joker" title="Haalt de helft van de foute antwoorden weg">50/50 <small>(${jokers})</small></button>` : ''}
          <button class="btn" type="button" id="volg" hidden>Volgende</button></span></div>`;
      if (kl && v.lees) setTimeout(() => spreek(v.lees), 250);
      const msg = $('.msg', el), volg = $('#volg', el), jk = $('#joker', el);
      let gekozen = false, metJoker = false;
      if (jk) jk.onclick = () => {
        jokers--; metJoker = true; jk.remove();
        const fout = shuffle($$('.optie', el).filter(b => opties[+b.dataset.j].k.n !== goedNr));
        fout.slice(0, Math.ceil(fout.length / 2)).forEach(b => { b.classList.add('weg'); b.disabled = true; });
      };
      $$('.optie', el).forEach(b => b.onclick = () => {
        if (gekozen) return; gekozen = true;
        if (jk && jk.isConnected) jk.remove();
        const x = opties[+b.dataset.j], juist = x.k.n === goedNr;
        $$('.optie', el).forEach((y, j) => { if (opties[j].k.n === goedNr) y.classList.add('goed'); else if (y !== b) y.classList.add('weg'); });
        if (!juist) b.classList.add('fout');
        if (!res.has(v.k.n)) res.set(v.k.n, juist);
        if (!h) stand.push(juist ? 'goed' : 'fout');
        let extra = '';
        if (juist) { const plus = sc.juist({ half: h || metJoker }); if (sc.reeks >= 3 && !kl) extra = ` <span class="muted">+${plus}</span>`; }
        else {
          sc.fout();
          if (herk && !h) { rij.push({ v, h: true }); extra = '<span class="na">Die komt straks nog eens terug.</span>'; }
        }
        const k = v.goed || v.k;
        msg.className = 'msg ' + (juist ? 'goed' : 'fout');
        msg.innerHTML = (juist ? shuffle(['Juist!', 'Goed zo!', 'Prima!', 'Knap!', 'Top!'])[0] : (v.fb || `Het was <b>${esc(k.w)}</b>.`)) + extra
          + (v.na ? `<span class="na">${v.na}</span>` : '');
        if (kl) spreek(juist ? 'Goed zo!' : (v.zeg || 'Het was ' + k.w));
        volg.hidden = false; volg.textContent = i < rij.length - 1 ? 'Volgende' : 'Klaar';
        volg.focus();
        if (juist && !v.na) setTimeout(() => { if (volg.isConnected && !volg.hidden) volg.click(); }, kl ? 1500 : 1000);
      });
      volg.onclick = () => { volg.hidden = true; i++; if (i < rij.length) toon(); else klaar([...res].map(([kaart, juist]) => ({ kaart, juist }))); };
    }
    toon();
  }

  // ---------- tegen de klok ----------
  function snel(el, p, klaar, sc) {
    const duur = N(90, 60, 45), res = new Map();
    let bron = shuffle(p), bi = 0, rest = duur * 10, timer = null, bezig = false;
    el.innerHTML = `<div class="snel-start"><div class="grote-klok">${duur}<small>seconden</small></div>
      <p>Beantwoord zoveel mogelijk vragen. Een reeks juiste antwoorden geeft extra punten. Een fout kost je reeks, niet je tijd.</p>
      ${record('snel') ? `<p class="muted">Jouw record: <b>${record('snel')}</b> punten</p>` : ''}
      <button class="btn big" type="button" id="go">Start</button></div>`;
    $('#go', el).onclick = start;
    $('#go', el).focus();
    function start() {
      bezig = true;
      el.innerHTML = `<div class="klok" role="timer"><i></i><span>${duur} s</span></div><div id="sv"></div>`;
      const balk = $('.klok i', el), tijd = $('.klok span', el);
      timer = setInterval(() => {
        if (!el.isConnected) return clearInterval(timer);
        rest--;
        balk.style.width = (rest / (duur * 10) * 100) + '%';
        balk.classList.toggle('bijna', rest <= 100);
        tijd.textContent = Math.ceil(rest / 10) + ' s';
        if (rest <= 0) { clearInterval(timer); bezig = false; klaar([...res].map(([kaart, juist]) => ({ kaart, juist }))); }
      }, 100);
      volgende();
    }
    function volgende() {
      if (!bezig || !el.isConnected) return;
      let v = null;
      for (let poging = 0; !v && poging < 10; poging++) {
        if (bi >= bron.length) { bron = shuffle(p); bi = 0; }
        const k = bron[bi++];
        for (const tp of shuffle(['wie', 'beeld', 'betekenis', 'zin', 'wie'])) { v = vragen[tp](k, p); if (v) break; }
      }
      if (!v) return;
      const opties = shuffle(v.opties), goedNr = (v.goed || v.k).n;
      const sv = $('#sv', el);
      sv.innerHTML = `${v.boven ? v.boven.replace('toon-beeld"', 'toon-beeld klein"') : ''}<div class="vraag">${v.vraag}</div>
        <div class="opties">${opties.map((x, j) => `<button type="button" class="optie ${x.cls}" data-j="${j}">${x.html}</button>`).join('')}</div>`;
      let gekozen = false;
      $$('.optie', sv).forEach(b => b.onclick = () => {
        if (gekozen || !bezig) return; gekozen = true;
        const juist = opties[+b.dataset.j].k.n === goedNr;
        if (!res.has(v.k.n)) res.set(v.k.n, juist);
        $$('.optie', sv).forEach((y, j) => { if (opties[j].k.n === goedNr) y.classList.add('goed'); else if (y !== b) y.classList.add('weg'); });
        if (juist) sc.juist(); else { sc.fout(); b.classList.add('fout'); }
        setTimeout(volgende, juist ? 350 : 1300);
      });
    }
  }

  // ---------- verbinden ----------
  function koppel(el, p, klaar, sc) {
    const n = N(4, 5, 6), soort = N('beeld', 'mix', 'uitleg');
    const kaarten = shuffle(uniek(shuffle(p), (w, k) => k.u.length <= 120)).slice(0, n);
    if (kaarten.length < 3) return leeg(el, 'Nog niet genoeg kaarten om te verbinden.');
    const rechts = shuffle(kaarten.map(k => {
      const metBeeld = k.b && (soort === 'beeld' || (soort === 'mix' && Math.random() < .5));
      return { k, html: metBeeld ? `<img src="${beeld(k)}" alt="beeld">` : esc(k.u), cls: metBeeld ? 'kb' : 'ku' };
    }));
    const links = shuffle(kaarten);
    const res = new Map(); let sel = null, af = 0;
    el.innerHTML = `<p class="muted" style="margin-top:0">Tik op een woord en dan op wat erbij hoort.</p>
      <div class="koppel"><div class="kol">${links.map((k, i) => `<button type="button" class="kop-l ${vak(k).cls}" data-kant="l" data-i="${i}">${esc(k.w)}</button>`).join('')}</div>
      <div class="kol">${rechts.map((r, i) => `<button type="button" class="kop-r ${r.cls}" data-kant="r" data-i="${i}">${r.html}</button>`).join('')}</div></div>
      <div class="feedback"><span class="msg" aria-live="polite"></span></div>`;
    const msg = $('.msg', el);
    $$('.koppel button', el).forEach(b => b.onclick = () => {
      if (b.classList.contains('af')) return;
      const kant = b.dataset.kant, i = +b.dataset.i;
      if (!sel || sel.kant === kant) {
        $$('.koppel button', el).forEach(x => x.classList.remove('sel'));
        sel = { kant, i, b }; b.classList.add('sel');
        return;
      }
      const kL = kant === 'l' ? links[i] : links[sel.i], kR = kant === 'r' ? rechts[i].k : rechts[sel.i].k;
      const bl = kant === 'l' ? b : sel.b, br = kant === 'r' ? b : sel.b;
      sel.b.classList.remove('sel'); sel = null;
      if (kL.n === kR.n) {
        af++;
        [bl, br].forEach(x => { x.classList.add('af'); x.dataset.nr = af; x.disabled = true; });
        const eerst = !res.has(kL.n);
        if (eerst) res.set(kL.n, true);
        sc.juist({ half: !eerst }); spreek(kL.w);
        msg.className = 'msg goed'; msg.textContent = 'Juist!';
        if (af === kaarten.length) setTimeout(() => klaar([...res].map(([kaart, juist]) => ({ kaart, juist }))), 800);
      } else {
        if (!res.has(kL.n)) res.set(kL.n, false);
        if (!res.has(kR.n)) res.set(kR.n, false);
        sc.fout();
        [bl, br].forEach(x => { x.classList.remove('fout'); void x.offsetWidth; x.classList.add('fout'); });
        msg.className = 'msg fout'; msg.textContent = 'Die horen niet samen. Probeer opnieuw.';
      }
    });
  }

  // ---------- letterhussel ----------
  function hussel(el, p, klaar, sc) {
    const kand = uniek(shuffle(p), w => /^[a-z]{3,12}$/.test(w)).slice(0, N(4, 5, 6));
    if (!kand.length) return leeg(el, 'Nog geen geschikte woorden om te husselen.');
    const res = []; let hints = N(4, 3, 1), i = 0;
    function ronde() {
      const k = kand[i], woord = norm(splits(k.w).kern), lw = splits(k.w).lw;
      const extra = niveau() === 'pittig' ? shuffle([...'eaonritdsl'].filter(c => !woord.includes(c))).slice(0, 2) : [];
      let tegels, beurt = 0;
      do { tegels = shuffle([...woord, ...extra]).map(c => ({ c, plek: -1 })); } while (++beurt < 20 && tegels.map(x => x.c).join('').startsWith(woord));
      const plekken = Array(woord.length).fill(null), vast = new Set();
      let gemist = false, hintNu = 0, klaarR = false;
      el.innerHTML = `<div class="hussel"><div class="voortgang">${kand.map((_, j) => `<i class="${j < i ? (res[j].juist ? 'goed' : 'fout') : j === i ? 'nu' : ''}"></i>`).join('')}</div>
        ${k.b && niveau() !== 'pittig' ? `<div class="toon-beeld klein"><img src="${beeld(k)}" alt=""></div>` : ''}
        <div class="vraag" style="font-size:22px;text-align:center">“${esc(k.u)}”</div>
        <div style="text-align:center">${spreekKnop(k.u)}</div>
        <div class="plekken">${lw ? `<span class="lw">${esc(lw)}</span>` : ''}${plekken.map((_, j) => `<button type="button" class="plek" data-p="${j}" aria-label="Plek ${j + 1}"></button>`).join('')}</div>
        <div class="hus-tegels">${tegels.map((x, j) => `<button type="button" class="hus" data-t="${j}">${x.c}</button>`).join('')}</div>
        ${extra.length ? '<p class="muted" style="text-align:center;margin:0">Let op: er liggen 2 letters te veel.</p>' : ''}
        <div class="feedback"><span class="msg" aria-live="polite"></span><span class="row" style="gap:8px">
          <button class="btn ghost small" type="button" id="hint">Hint <small>(${hints})</small></button>
          <button class="btn ghost small" type="button" id="geef">Ik weet het niet</button>
          <button class="btn" type="button" id="volg" hidden>Volgende</button></span></div></div>`;
      const msg = $('.msg', el), volg = $('#volg', el);
      const teken = () => {
        $$('.plek', el).forEach((b, j) => { const ti = plekken[j]; b.textContent = ti == null ? '' : tegels[ti].c; b.classList.toggle('vast', vast.has(j)); b.classList.toggle('vol', ti != null); });
        $$('.hus', el).forEach((b, j) => { b.classList.toggle('weg', tegels[j].plek >= 0); b.disabled = tegels[j].plek >= 0 || klaarR; });
        const h = $('#hint', el); if (h) { h.disabled = !hints || klaarR; h.innerHTML = `Hint <small>(${hints})</small>`; }
      };
      const leg = (ti, j) => { tegels[ti].plek = j; plekken[j] = ti; };
      const neem = j => { const ti = plekken[j]; if (ti == null) return; tegels[ti].plek = -1; plekken[j] = null; };
      const stop = juist => {
        klaarR = true; res.push({ kaart: k.n, juist: juist && !gemist });
        if (juist) { sc.juist({ half: gemist, bonus: -hintNu * 3 }); msg.className = 'msg goed'; msg.innerHTML = 'Juist! <b>' + esc(k.w) + '</b>'; spreek(k.w); }
        else {
          sc.fout();
          plekken.forEach((_, j) => neem(j));
          [...woord].forEach((c, j) => { const ti = tegels.findIndex(x => x.c === c && x.plek < 0); leg(ti, j); });
          msg.className = 'msg fout'; msg.innerHTML = `Het was <b>${esc(k.w)}</b>.`;
        }
        $('#geef', el).hidden = true;
        volg.hidden = false; volg.textContent = i < kand.length - 1 ? 'Volgende woord' : 'Klaar'; volg.focus();
        teken();
      };
      const controle = () => {
        if (plekken.some(x => x == null)) return;
        if (plekken.map(ti => tegels[ti].c).join('') === woord) return stop(true);
        gemist = true; sc.fout();
        msg.className = 'msg fout'; msg.textContent = 'Nog niet. De juiste letters blijven staan.';
        const rij = $('.plekken', el); rij.classList.remove('fout'); void rij.offsetWidth; rij.classList.add('fout');
        setTimeout(() => { if (klaarR) return; plekken.forEach((ti, j) => { if (ti != null && tegels[ti].c !== woord[j] && !vast.has(j)) neem(j); }); teken(); }, 650);
      };
      const tik = ti => {
        if (klaarR || tegels[ti].plek >= 0) return;
        const j = plekken.findIndex(x => x == null); if (j < 0) return;
        leg(ti, j); teken(); controle();
      };
      $$('.hus', el).forEach(b => b.onclick = () => tik(+b.dataset.t));
      $$('.plek', el).forEach(b => b.onclick = () => { const j = +b.dataset.p; if (klaarR || vast.has(j)) return; neem(j); msg.textContent = ''; teken(); });
      $('#hint', el).onclick = () => {
        if (!hints || klaarR) return;
        const j = [...woord].findIndex((c, x) => plekken[x] == null || tegels[plekken[x]].c !== c);
        if (j < 0) return;
        hints--; hintNu++;
        neem(j);
        let ti = tegels.findIndex(x => x.c === woord[j] && x.plek < 0);
        if (ti < 0) { const van = plekken.findIndex((x, y) => x != null && !vast.has(y) && tegels[x].c === woord[j]); neem(van); ti = tegels.findIndex(x => x.c === woord[j] && x.plek < 0); }
        leg(ti, j); vast.add(j); teken(); controle();
      };
      $('#geef', el).onclick = () => stop(false);
      document.onkeydown = e => {
        if (!location.hash.startsWith('#/spel/hussel')) { document.onkeydown = null; return; }
        if (klaarR) return;
        if (e.key === 'Backspace') { const j = plekken.map((x, y) => x != null && !vast.has(y) ? y : -1).filter(y => y >= 0).pop(); if (j != null) { neem(j); teken(); } return; }
        if (/^[a-z]$/i.test(e.key)) { const ti = tegels.findIndex(x => x.c === e.key.toLowerCase() && x.plek < 0); if (ti >= 0) tik(ti); }
      };
      volg.onclick = () => { i++; if (i < kand.length) ronde(); else { document.onkeydown = null; klaar(res); } };
      teken();
    }
    ronde();
  }

  // ---------- woordzoeker ----------
  function zoeker(el, p, klaar, sc) {
    const n = N(8, 10, 12), aantal = N(4, 6, 8);
    const richtingen = N([[0, 1], [1, 0]], [[0, 1], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [1, -1]]);
    const kand = uniek(shuffle(p), w => /^[a-z]{3,}$/.test(w) && w.length <= n);
    const rooster = Array(n * n).fill(''), woorden = [];
    for (const k of kand) {
      if (woorden.length >= aantal) break;
      const w = norm(splits(k.w).kern);
      if (woorden.some(x => x.w.includes(w) || w.includes(x.w))) continue;
      for (let poging = 0; poging < 150; poging++) {
        const [dr, dc] = richtingen[Math.floor(Math.random() * richtingen.length)];
        const r0 = Math.floor(Math.random() * n), c0 = Math.floor(Math.random() * n);
        const cellen = [...w].map((_, j) => [r0 + dr * j, c0 + dc * j]);
        if (cellen.some(([r, c]) => r < 0 || c < 0 || r >= n || c >= n)) continue;
        if (cellen.some(([r, c], j) => rooster[r * n + c] && rooster[r * n + c] !== w[j])) continue;
        cellen.forEach(([r, c], j) => { rooster[r * n + c] = w[j]; });
        woorden.push({ k, w, cellen: cellen.map(([r, c]) => r * n + c), gevonden: false });
        break;
      }
    }
    if (woorden.length < 3) return leeg(el, 'Nog niet genoeg geschikte woorden voor een woordzoeker.');
    const vul = 'eeeeeeaaaannnnnrrrrttttoooiiiidddsssllggkkvvmmhhbbuuwppzjcf';
    for (let j = 0; j < rooster.length; j++) if (!rooster[j]) rooster[j] = vul[Math.floor(Math.random() * vul.length)];
    const pittig = niveau() === 'pittig';
    woorden.sort((a, b) => a.w.localeCompare(b.w));
    el.innerHTML = `<p class="muted" style="margin-top:0">${pittig ? 'Lees de uitleg en zoek het woord.' : 'Zoek de woorden.'} Sleep over de letters, of tik op de eerste en dan op de laatste letter.</p>
      <div class="zoeker"><div class="wz" style="--n:${n}">${rooster.map((c, j) => `<span class="wz-c" data-i="${j}">${c}</span>`).join('')}</div>
      <ol class="wz-lijst">${woorden.map((x, j) => `<li data-w="${j}">${pittig ? `<span class="u">${esc(x.k.u)}</span> <small>(${x.w.length} letters)</small>` : esc(x.w)}</li>`).join('')}</ol></div>
      <div class="feedback"><span class="msg" aria-live="polite"></span><button class="btn ghost" type="button" id="stop">Ik stop</button></div>`;
    const grid = $('.wz', el), cel = $$('.wz-c', el), msg = $('.msg', el);
    let start = null, wacht = false, sleept = false, klaarR = false;
    const lijn = (a, b) => {
      const ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n, dr = rb - ra, dc = cb - ca;
      if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return null;
      const len = Math.max(Math.abs(dr), Math.abs(dc)), sr = Math.sign(dr), sk = Math.sign(dc);
      return Array.from({ length: len + 1 }, (_, j) => (ra + sr * j) * n + ca + sk * j);
    };
    const toonSel = l => cel.forEach((c, j) => c.classList.toggle('sel', !!l && l.includes(j)));
    const celVan = e => { const d = document.elementFromPoint(e.clientX, e.clientY); return d && d.classList.contains('wz-c') ? +d.dataset.i : null; };
    function test(l) {
      toonSel(null);
      if (!l || l.length < 2) return;
      const s = l.join(','), r = l.slice().reverse().join(',');
      const x = woorden.find(w => !w.gevonden && (w.cellen.join(',') === s || w.cellen.join(',') === r));
      if (!x) { sc.fout(); msg.className = 'msg fout'; msg.textContent = 'Dat is geen van de woorden.'; return; }
      x.gevonden = true;
      const wi = woorden.indexOf(x);
      x.cellen.forEach(j => cel[j].classList.add('f', 'f' + (wi % 6)));
      const li = $(`[data-w="${wi}"]`, el); li.classList.add('af');
      if (pittig) li.insertAdjacentHTML('afterbegin', `<b>${esc(x.k.w)}</b> `);
      sc.juist(); spreek(x.k.w);
      msg.className = 'msg goed'; msg.textContent = 'Gevonden: ' + x.k.w;
      if (woorden.every(w => w.gevonden)) { klaarR = true; setTimeout(() => klaar(woorden.map(w => ({ kaart: w.k.n, juist: true }))), 900); }
    }
    grid.onpointerdown = e => {
      const j = celVan(e); if (j == null || klaarR) return;
      e.preventDefault();
      if (wacht && start != null && j !== start) { wacht = false; const l = lijn(start, j); start = null; return test(l); }
      start = j; sleept = true; wacht = false; toonSel([j]);
      try { grid.setPointerCapture(e.pointerId); } catch (_) { /* oude browser */ }
    };
    grid.onpointermove = e => { if (!sleept || start == null) return; const j = celVan(e); if (j == null) return; const l = lijn(start, j); if (l) toonSel(l); };
    grid.onpointerup = e => {
      if (!sleept) return; sleept = false;
      const j = celVan(e);
      if (j == null || j === start) { wacht = true; toonSel([start]); return; }
      const l = lijn(start, j); start = null; test(l);
    };
    $('#stop', el).onclick = () => {
      if (klaarR) return; klaarR = true;
      woorden.filter(w => !w.gevonden).forEach(w => { w.cellen.forEach(j => cel[j].classList.add('mis')); });
      msg.className = 'msg'; msg.textContent = 'Hier zaten de andere woorden.';
      setTimeout(() => klaar(woorden.map(w => ({ kaart: w.k.n, juist: w.gevonden }))), 2200);
    };
  }

  // ---------- memory ----------
  function memory(el, p, klaar, sc) {
    const kl = kleuter(), paren = kl ? 6 : N(4, 6, 8);
    const kaarten = shuffle(kl ? p.filter(k => k.b) : p).filter(k => kl || k.b || k.u.length <= 80).slice(0, paren);
    if (kaarten.length < 3) return leeg(el, 'Nog niet genoeg kaarten voor memory.');
    // Pittig: altijd woord bij uitleg (geen beelden), dat is het lastigst.
    const metBeeld = k => k.b && niveau() !== 'pittig';
    const tegels = shuffle(kaarten.flatMap(k => [
      { k, html: kl ? `<img src="${beeld(k)}" alt="${esc(k.w)}">` : esc(k.w), cls: '' },
      { k, html: metBeeld(k) ? `<img src="${beeld(k)}" alt="${esc(kl ? k.w : 'beeld')}">` : esc(k.u), cls: metBeeld(k) ? '' : 'uitleg-f' },
    ]));
    const fout = new Set(), af = new Set(), gezien = new Set();
    let open = [], zetten = 0, slot = false;
    el.innerHTML = `<p class="muted" style="margin-top:0">${kl ? 'Zoek twee dezelfde prentjes.' : 'Zoek het woord bij het beeld of de uitleg.'} <span id="zet"></span></p>
      <div class="memory${tegels.length > 12 ? ' groot' : ''}">${tegels.map((x, i) => `<button type="button" class="mem" data-i="${i}" aria-label="Kaartje ${i + 1}"><div class="in"><div class="f dicht"></div><div class="f open-f ${vak(x.k).cls} ${x.cls}">${x.html}</div></div></button>`).join('')}</div>`;
    $$('.mem', el).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (slot || af.has(tegels[i].k.n) || open.includes(i)) return;
      b.classList.add('open'); open.push(i);
      if (kl) spreek(tegels[i].k.w);
      if (open.length < 2) return;
      zetten++; $('#zet', el).textContent = `· ${zetten} beurten`;
      const [a, c] = open.map(x => tegels[x]);
      if (a.k.n === c.k.n) {
        af.add(a.k.n); open.forEach(x => { const m = $(`.mem[data-i="${x}"]`, el); m.classList.add('af'); m.classList.remove('open'); });
        open = [];
        sc.juist({ half: fout.has(a.k.n) });
        if (!kl) spreek(a.k.w);
        if (af.size === kaarten.length) setTimeout(() => klaar(kaarten.map(k => ({ kaart: k.n, juist: !fout.has(k.n) }))), 900);
      } else {
        // een kaartje dat je al eens zag en toch mist, kost je reeks (en telt later als fout)
        slot = true;
        if (gezien.has(open[0]) || gezien.has(open[1])) { sc.fout(); if (zetten > kaarten.length) { fout.add(a.k.n); fout.add(c.k.n); } }
        open.forEach(x => gezien.add(x));
        setTimeout(() => { open.forEach(x => $(`.mem[data-i="${x}"]`, el).classList.remove('open')); open = []; slot = false; }, 1100);
      }
    });
  }

  // ---------- sorteren ----------
  function sorteer(el, p, klaar, sc) {
    const aantalG = N(2, 3, 3), perG = N(4, 4, 5);
    const perVak = () => { const m = {}; p.forEach(k => (m[k.v] = m[k.v] || []).push(k)); return Object.entries(m).filter(([, l]) => l.length >= 3); };
    const binnenVak = () => {
      for (const v of shuffle([...new Set(p.map(k => k.v))])) {
        const m = {}; p.filter(k => k.v === v).forEach(k => { const c = k.c || k.d; (m[c] = m[c] || []).push(k); });
        const g = Object.entries(m).filter(([, l]) => l.length >= 3);
        if (g.length >= 2) return g;
      }
      return [];
    };
    // Rustig: per vak (wiskunde, taal, ...). Normaal en Pittig: groepen binnen één vak.
    let sleutel = niveau() === 'rustig' ? 'v' : 'c', groepen = sleutel === 'v' ? perVak() : binnenVak();
    if (groepen.length < 2) { sleutel = sleutel === 'v' ? 'c' : 'v'; groepen = sleutel === 'v' ? perVak() : binnenVak(); }
    if (groepen.length < 2) return leeg(el, 'Nog niet genoeg verschillende kaarten om te sorteren.');
    const ng = Math.min(groepen.length, aantalG);
    groepen = shuffle(groepen).slice(0, ng).map(([naam, l]) => ({ naam: sleutel === 'v' ? IB.VAK[naam].naam : naam, cls: sleutel === 'v' ? IB.VAK[naam].cls : vak(l[0]).cls, kaarten: shuffle(l).slice(0, ng === 2 ? perG + 1 : perG) }));
    const blokjes = shuffle(groepen.flatMap((g, gi) => g.kaarten.map(k => ({ k, gi }))));
    const res = new Map(); let gekozen = null;
    el.innerHTML = `<div class="sorteer"><p class="muted" style="margin:0">Tik op een woord en dan op de juiste groep.</p>
      <div class="stapel">${blokjes.map((b, i) => `<button type="button" class="blokje" data-i="${i}" aria-pressed="false">${esc(b.k.w)}</button>`).join('')}</div>
      <div class="bakken">${groepen.map((g, gi) => `<div class="bak ${g.cls}" data-g="${gi}" role="button" tabindex="0" style="border-color:var(--dom)"><h3 style="color:var(--dom)">${esc(g.naam)}</h3><div class="chips"></div></div>`).join('')}</div>
      <div class="feedback"><span class="msg" aria-live="polite"></span></div></div>`;
    const msg = $('.msg', el);
    $$('.blokje', el).forEach(b => b.onclick = () => {
      $$('.blokje', el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      gekozen = +b.dataset.i;
      const k = blokjes[gekozen].k; msg.className = 'msg'; msg.textContent = niveau() === 'pittig' ? '' : k.u;
    });
    $$('.bak', el).forEach(bak => {
      const zet = () => {
        if (gekozen == null) { msg.textContent = 'Kies eerst een woord.'; return; }
        const b = blokjes[gekozen], knop = $(`.blokje[data-i="${gekozen}"]`, el), gi = +bak.dataset.g;
        if (b.gi === gi) {
          const eerst = !res.has(b.k.n);
          if (eerst) res.set(b.k.n, true);
          knop.remove(); gekozen = null;
          $('.chips', bak).insertAdjacentHTML('beforeend', `<span class="chip">${esc(b.k.w)}</span>`);
          sc.juist({ half: !eerst });
          msg.className = 'msg goed'; msg.textContent = 'Juist!';
          if (!$('.blokje', el)) setTimeout(() => klaar([...res].map(([kaart, juist]) => ({ kaart, juist }))), 700);
        } else {
          res.set(b.k.n, false); sc.fout();
          knop.classList.remove('fout'); void knop.offsetWidth; knop.classList.add('fout');
          msg.className = 'msg fout'; msg.textContent = niveau() === 'pittig' ? 'Nog niet. Probeer opnieuw.' : 'Nog niet. Lees de uitleg en probeer opnieuw.';
        }
      };
      bak.onclick = zet; bak.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zet(); } };
    });
  }

  // ---------- woordraadsel ----------
  function raadsel(el, p, klaar, sc) {
    const kand = uniek(shuffle(p), w => /^[a-z]{4,11}$/.test(w)).slice(0, N(3, 4, 5));
    if (!kand.length) return leeg(el, 'Nog geen geschikte woorden voor het raadsel.');
    const max = N(8, 6, 4), res = []; let i = 0;
    function ronde() {
      const k = kand[i], woord = norm(splits(k.w).kern), lw = splits(k.w).lw;
      const geraden = new Set(); let levens = max, klaarR = false;
      el.innerHTML = `<div class="raadsel"><div class="voortgang">${kand.map((_, j) => `<i class="${j < i ? (res[j].juist ? 'goed' : 'fout') : j === i ? 'nu' : ''}"></i>`).join('')}</div>
        ${k.b && niveau() !== 'pittig' ? `<div class="toon-beeld" style="width:min(150px,36vw)"><img src="${beeld(k)}" alt=""></div>` : ''}
        <div class="vraag" style="font-size:22px;text-align:center">“${esc(k.u)}”</div>
        <div style="text-align:center">${spreekKnop(k.u)}</div>
        <div class="letters">${lw ? `<span style="border:0;width:auto;font-size:22px;color:var(--muted);text-transform:none;margin-right:8px">${esc(lw)}</span>` : ''}${[...woord].map(() => '<span></span>').join('')}</div>
        <div class="levens" aria-label="Levens"></div>
        <div class="toetsen">${[...'abcdefghijklmnopqrstuvwxyz'].map(c => `<button type="button" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="feedback"><span class="msg" aria-live="polite"></span><button class="btn" type="button" hidden>Volgende</button></div></div>`;
      const vakjes = $$('.letters span', el).slice(lw ? 1 : 0), msg = $('.msg', el), volg = $('.feedback .btn', el);
      const teken = () => {
        [...woord].forEach((c, j) => { vakjes[j].textContent = geraden.has(c) || klaarR ? c : ''; });
        $('.levens', el).innerHTML = Array.from({ length: max }, (_, j) => `<span style="color:${j < levens ? 'var(--bad)' : 'var(--line)'}">♥</span>`).join('');
      };
      const stop = juist => {
        klaarR = true; res.push({ kaart: k.n, juist }); teken();
        if (juist) sc.juist({ bonus: levens * 2 }); else sc.fout();
        msg.className = 'msg ' + (juist ? 'goed' : 'fout'); msg.innerHTML = juist ? 'Geraden!' : `Het was <b>${esc(k.w)}</b>.`;
        volg.hidden = false; volg.textContent = i < kand.length - 1 ? 'Volgende woord' : 'Klaar'; volg.focus();
      };
      const kies = c => {
        if (klaarR || geraden.has(c)) return;
        geraden.add(c);
        const b = $(`[data-c="${c}"]`, el);
        if (woord.includes(c)) { b.classList.add('goed'); if ([...woord].every(x => geraden.has(x))) stop(true); }
        else { b.classList.add('fout'); levens--; if (levens <= 0) stop(false); }
        b.disabled = true; teken();
      };
      $$('[data-c]', el).forEach(b => b.onclick = () => kies(b.dataset.c));
      document.onkeydown = e => { if (!location.hash.startsWith('#/spel/raadsel')) { document.onkeydown = null; return; } if (/^[a-z]$/i.test(e.key)) kies(e.key.toLowerCase()); };
      volg.onclick = () => { i++; if (i < kand.length) ronde(); else { document.onkeydown = null; klaar(res); } };
      teken();
    }
    ronde();
  }

  // ---------- einde ----------
  function feest(el) {
    const kleuren = ['var(--wis)', 'var(--nl)', 'var(--wo)', 'var(--st)', 'var(--star)'];
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = Array.from({ length: 48 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${kleuren[Math.floor(Math.random() * 5)]};animation-delay:${(Math.random() * .6).toFixed(2)}s;animation-duration:${(1.6 + Math.random() * 1.4).toFixed(2)}s;--r:${Math.floor(Math.random() * 720 - 360)}deg"></i>`).join('');
    el.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }

  function einde(el, spel, res, sc, opnieuw, terug) {
    document.onkeydown = null;
    bewaarResultaten(res);
    const goed = res.filter(r => r.juist).length, n = res.length, kl = kleuter();
    const sterren = n ? (goed === n ? 3 : goed / n >= .6 ? 2 : goed ? 1 : 0) : 0;
    const rec = kl ? { nieuw: false, oud: 0 } : zetRecord(spel.id, sc.punten);
    const hoger = !kl && niveau() !== 'pittig' && sterren === 3;
    el.innerHTML = `<div class="einde">
      <div class="eyebrow">${esc(spel.naam)}</div>
      <div class="sterren" aria-label="${sterren} van de 3 sterren">${[0, 1, 2].map(j => `<span class="${j < sterren ? '' : 'uit'}" style="animation-delay:${j * .18}s">★</span>`).join('')}</div>
      ${kl ? `<div class="score">${goed} / ${n}</div>` : `<div class="score">${sc.punten}<small>punten</small></div>
      <div class="einde-stats"><span><b>${goed}</b> van ${n} juist</span><span>langste reeks <b>${sc.beste}</b></span>${rec.oud && !rec.nieuw ? `<span>record <b>${rec.oud}</b></span>` : ''}</div>
      ${rec.nieuw ? `<div class="nieuw-record">${ICON.ster} Nieuw record${rec.oud ? ` (was ${rec.oud})` : ''}!</div>` : ''}`}
      <p class="muted">${sterren === 3 ? 'Alles juist! Deze kaarten komen pas later terug.' : 'Wat nog niet lukte, komt morgen terug.'}${hoger ? ' Durf je eens <b>' + (niveau() === 'rustig' ? 'Normaal' : 'Pittig') + '</b>?' : ''}</p>
      <div class="row" style="justify-content:center"><button class="btn big" type="button" id="nog">Nog eens</button>${hoger ? '<button class="btn ghost big" type="button" id="hoger">Moeilijker</button>' : ''}<a class="btn ghost big" href="${terug}">Ander spelletje</a></div>
      <div class="lijst">${res.map(r => { const k = BY[r.kaart]; return k ? `<div style="position:relative">${kaartHTML(k, { mini: true })}<span class="status ${r.juist ? 'ken' : 'oefen'}" style="top:-8px;right:-6px">${r.juist ? '✓' : '↺'}</span></div>` : ''; }).join('')}</div>
    </div>`;
    if (sterren === 3 || rec.nieuw) feest($('.einde', el));
    if (kl) spreek(sterren >= 2 ? 'Goed gedaan!' : 'Goed geprobeerd!');
    $('#nog', el).onclick = opnieuw;
    const h = $('#hoger', el);
    if (h) h.onclick = () => { store.set('ib_niveau', niveau() === 'rustig' ? 'normaal' : 'pittig'); opnieuw(); };
  }
})();
