// In Beeld: korte spelletjes voor één speler, met de kaarten uit de woordbib (of een project of thema).
// Elk spelletje geeft een lijst { kaart, juist } terug; die gaat naar de dagelijkse herhaling (doos 0-5).
(function () {
  'use strict';
  const { LJ_NAAM, K, BY, S, ICON, rel, splits, beeld, vak, esc, $, $$, shuffle, vandaag, spreek, spreekKnop,
    kleuter, woordbib, bewaarResultaten, kaartHTML, route, go, spelKaarten } = IB;

  const SPELLEN = [
    { id: 'dag5', naam: 'De dagelijkse 5', uitleg: 'Vijf kaarten die terugkomen, met voorrang voor wat je bijna vergeten bent.', kl: 'Vijf prentjes om te zoeken.', voor: 'alle' },
    { id: 'luister', naam: 'Luister en zoek', uitleg: 'Je hoort een woord. Tik op het juiste prentje.', voor: 'kleuter' },
    { id: 'wie', naam: 'Wie ben ik?', uitleg: 'Lees de uitleg en raad het begrip.', voor: 'lager' },
    { id: 'memory', naam: 'Memory', uitleg: 'Zoek het woord bij het beeld of bij de uitleg.', kl: 'Zoek twee dezelfde prentjes.', voor: 'alle' },
    { id: 'zin', naam: 'Welk woord past?', uitleg: 'Vul het juiste woord in de zin in.', voor: 'lager' },
    { id: 'sorteer', naam: 'Sorteren', uitleg: 'Zet elk woord in de juiste groep.', voor: 'lager' },
    { id: 'knoop', naam: 'Knoop het vast', uitleg: 'Welk begrip hoort erbij? Leg de verbinding uit het woordweb.', voor: 'lager' },
    { id: 'raadsel', naam: 'Woordraadsel', uitleg: 'Raad het woord letter per letter. De uitleg helpt je.', voor: 'lager' },
    { id: 'betekenis', naam: 'Wat betekent het?', uitleg: 'Je ziet een woord. Kies de juiste uitleg.', voor: 'lager' },
  ];
  const past = s => s.voor === 'alle' || (s.voor === 'kleuter') === !!kleuter();

  // Genoeg kaarten om mee te spelen. Een lege woordbib (net begonnen): de kaarten van het eigen leerjaar.
  function pool(sleutel) {
    let p = spelKaarten(sleutel), extra = false;
    if (kleuter()) {
      p = p.filter(k => k.b);
      if (p.length < 6) { p = K.filter(k => k.b && k.s <= Math.max(S.ik.lj, 1)); extra = true; }
    } else if (p.length < 8) { p = K.filter(k => k.s <= S.ik.lj); extra = true; }
    return { p, extra };
  }

  // Foute antwoorden die toch lijken: liefst hetzelfde vak en een leerjaar in de buurt.
  function afleiders(k, p, n, o = {}) {
    const kern = splits(k.w).kern.toLowerCase();
    const ok = x => x.n !== k.n && splits(x.w).kern.toLowerCase() !== kern && (!o.beeld || x.b) && (!o.niet || !o.niet.includes(x.n))
      && (!o.uitleg || x.u !== k.u);
    const score = x => (x.v === k.v ? 0 : 4) + Math.abs(x.s - k.s) + (x.c === k.c ? -1 : 0) + Math.random() * 3;
    let kand = p.filter(ok);
    if (kand.length < n * 2) kand = kand.concat(K.filter(x => ok(x) && !kand.includes(x) && x.s <= (S.ik ? S.ik.lj + 1 : 8)));
    return kand.sort((a, b) => score(a) - score(b)).slice(0, n);
  }

  // ---------- vraagsoorten ----------
  const woordOptie = x => ({ k: x, html: esc(x.w), cls: '' });
  const vragen = {
    wie(k, p) {
      return { k, vraag: `<span class="muted" style="font-size:.7em;display:block">Wie ben ik?</span>“${esc(k.u)}”`, lees: k.u + ' Wie ben ik?', opties: [k, ...afleiders(k, p, 2)].map(woordOptie) };
    },
    betekenis(k, p) {
      return { k, vraag: `Wat betekent <b>${esc(k.w)}</b>?`, lees: 'Wat betekent ' + k.w + '?', opties: [k, ...afleiders(k, p, 2, { uitleg: true })].map(x => ({ k: x, html: esc(x.u), cls: 'tekst' })) };
    },
    zin(k, p) {
      const { kern } = splits(k.w);
      const re = new RegExp('(^|[^\\p{L}])(' + kern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^\\p{L}]|$)', 'iu');
      if (!re.test(k.z) || kern.length < 3) return null;
      const zin = esc(k.z).replace(re, '$1<span class="blank">&nbsp;</span>');
      return { k, vraag: zin, lees: null, opties: [k, ...afleiders(k, p, 2)].map(x => ({ k: x, html: esc(splits(x.w).kern), cls: '' })) };
    },
    beeld(k, p) {
      if (!k.b) return null;
      return { k, boven: `<div class="toon-beeld"><img src="${beeld(k)}" alt=""></div>`, vraag: 'Welk woord hoort bij dit beeld?', opties: [k, ...afleiders(k, p, 2)].map(woordOptie) };
    },
    luister(k, p) {
      if (!k.b) return null;
      const af = afleiders(k, p, 2, { beeld: true });
      if (af.length < 2) return null;
      return { k, vraag: `<button class="btn big" type="button" data-spreek="${esc(k.w)}">${ICON.spreek.replace('<svg', '<svg width="28" height="28"')} Luister</button>`, lees: 'Zoek: ' + k.w,
        opties: [k, ...af].map(x => ({ k: x, html: `<img src="${beeld(x)}" alt="${esc(x.w)}">`, cls: 'prent', label: x.w })) };
    },
    knoop(k, p) {
      const r = rel(k);
      if (!r.length) return null;
      const goed = BY[shuffle(r)[0]];
      const af = afleiders(goed, p, 3, { niet: [k.n, ...r] }).filter(x => x.c !== k.c || x.v !== k.v).slice(0, 3);
      if (af.length < 3) return null;
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
        const types = kleuter() ? ['luister'] : shuffle(['wie', 'betekenis', 'zin', 'beeld', 'wie']);
        for (const t of types) { v = vragen[t](k, p); if (v) break; }
        if (!v && !kleuter()) v = vragen.wie(k, p);
      } else v = vragen[soort](k, p);
      if (v) uit.push(v);
      if (uit.length >= n) break;
    }
    return uit;
  }

  // ---------- spelmenu ----------
  route(/^\/spel$/, (el, _, q) => {
    if (!S.ik) return go('#/proberen');
    const set = q.get('set') || '';
    const suffix = set ? '?set=' + encodeURIComponent(set) : '';
    const titel = set.startsWith('project:') ? (S.ik.projecten.find(x => 'project:' + x.id === set) || {}).naam : set.startsWith('thema:') ? set.slice(6) : '';
    const kl = ['wis', 'nl', 'wo', 'st'];
    el.innerHTML = `<div class="page-head"><div><div class="eyebrow">Spelletjes${titel ? ' · ' + esc(titel) : ''}</div><h1>${kleuter() ? 'Kies een spelletje' : 'Speels oefenen'}</h1>
      <p>${titel ? 'Je speelt met de kaarten van ' + esc(titel) + '.' : kleuter() ? 'Elk spelletje duurt maar even.' : 'Elk spelletje duurt een paar minuten. Wat je goed doet, komt minder vaak terug.'}</p></div>
      ${kleuter() ? spreekKnop('Kies een spelletje.') : ''}</div>
      <div class="spellen">${SPELLEN.filter(past).map((s, i) => `<a class="tegel spel-tegel ${s.id === 'dag5' ? 'groot' : kl[i % 4]}" href="#/spel/${s.id}${suffix}">
        <span class="ic">${s.id === 'dag5' ? ICON.ster : ICON.spel}</span><h3>${s.naam}</h3><p>${kleuter() && s.kl ? s.kl : s.uitleg}</p></a>`).join('')}</div>`;
  }, { nav: '/spel', titel: 'Spelletjes' });

  route(/^\/spel\/(\w+)$/, (el, [id], q) => {
    if (!S.ik) return go('#/proberen');
    const spel = SPELLEN.find(s => s.id === id);
    if (!spel) return go('#/spel');
    const set = q.get('set') || '';
    const { p, extra } = pool(set);
    const terug = '#/spel' + (set ? '?set=' + encodeURIComponent(set) : '');
    el.innerHTML = `<div class="speelveld"><div class="row"><a class="terug" href="${terug}">← Spelletjes</a><span class="spacer"></span><span class="eyebrow">${spel.naam}</span></div><div id="veld"></div></div>`;
    const veld = $('#veld', el);
    const klaar = res => einde(veld, spel, res, () => IB.render(), terug);
    if (extra && !set) veld.insertAdjacentHTML('beforebegin', '');
    const n = p.length;
    if (id === 'memory') return memory(veld, p, klaar);
    if (id === 'sorteer') return sorteer(veld, p, klaar);
    if (id === 'raadsel') return raadsel(veld, p, klaar);
    const soort = id === 'dag5' ? 'dag5' : id;
    const vr = maakVragen(soort, p, id === 'dag5' ? 5 : 8);
    if (vr.length < 3) { veld.innerHTML = `<div class="leeg-melding">Er zijn nog niet genoeg kaarten voor dit spelletje (${n}). Probeer een ander spelletje.</div>`; return; }
    vraagRonde(veld, vr, klaar);
  }, { nav: '/spel', titel: 'Spelen' });

  // ---------- meerkeuze ----------
  function vraagRonde(el, vr, klaar) {
    const res = []; let i = 0;
    function toon() {
      const v = vr[i], opties = shuffle(v.opties), goedNr = (v.goed || v.k).n;
      el.innerHTML = `<div class="voortgang">${vr.map((_, j) => `<i class="${j < i ? (res[j].juist ? 'goed' : 'fout') : j === i ? 'nu' : ''}"></i>`).join('')}</div>
        ${v.boven || ''}
        <div class="vraag">${v.vraag}</div>
        ${v.lees && !kleuter() ? `<div style="margin:-10px 0 16px">${spreekKnop(v.lees)}</div>` : ''}
        <div class="opties">${opties.map((o, j) => `<button type="button" class="optie ${o.cls}" data-j="${j}"${o.label ? ` aria-label="${esc(o.label)}"` : ''}>${o.html}</button>`).join('')}</div>
        <div class="feedback"><span class="msg" aria-live="polite"></span><button class="btn" type="button" hidden>Volgende</button></div>`;
      if (kleuter() && v.lees) setTimeout(() => spreek(v.lees), 250);
      const msg = $('.msg', el), volg = $('.feedback .btn', el);
      let gekozen = false;
      $$('.optie', el).forEach(b => b.onclick = () => {
        if (gekozen) return; gekozen = true;
        const o = opties[+b.dataset.j], juist = o.k.n === goedNr;
        $$('.optie', el).forEach((x, j) => { if (opties[j].k.n === goedNr) x.classList.add('goed'); else if (x !== b) x.classList.add('weg'); });
        if (!juist) b.classList.add('fout');
        res.push({ kaart: v.k.n, juist });
        const k = v.goed || v.k;
        msg.className = 'msg ' + (juist ? 'goed' : 'fout');
        msg.innerHTML = juist ? shuffle(['Juist!', 'Goed zo!', 'Prima!', 'Knap!'])[0] : `Het was <b>${esc(k.w)}</b>.`;
        if (kleuter()) spreek(juist ? 'Goed zo!' : 'Het was ' + k.w);
        volg.hidden = false; volg.textContent = i < vr.length - 1 ? 'Volgende' : 'Klaar';
        volg.focus();
        if (juist) setTimeout(() => { if (volg.isConnected && !volg.hidden) volg.click(); }, kleuter() ? 1500 : 1100);
      });
      volg.onclick = () => { volg.hidden = true; i++; if (i < vr.length) toon(); else klaar(res); };
    }
    toon();
  }

  // ---------- memory ----------
  function memory(el, p, klaar) {
    const kl = kleuter();
    const kaarten = shuffle(kl ? p.filter(k => k.b) : p).filter(k => kl || k.b || k.u.length <= 80).slice(0, 6);
    if (kaarten.length < 3) { el.innerHTML = '<div class="leeg-melding">Nog niet genoeg kaarten voor memory.</div>'; return; }
    const tegels = shuffle(kaarten.flatMap(k => [
      { k, html: kl ? `<img src="${beeld(k)}" alt="${esc(k.w)}">` : esc(k.w), cls: '' },
      { k, html: k.b ? `<img src="${beeld(k)}" alt="${esc(kl ? k.w : 'beeld')}">` : esc(k.u), cls: k.b ? '' : 'uitleg-f' },
    ]));
    const fout = new Set(), af = new Set();
    let open = [], zetten = 0, slot = false;
    el.innerHTML = `<p class="muted" style="margin-top:0">${kl ? 'Zoek twee dezelfde prentjes.' : 'Zoek het woord bij het beeld of de uitleg.'} <span id="zet"></span></p>
      <div class="memory">${tegels.map((t, i) => `<button type="button" class="mem" data-i="${i}" aria-label="Kaartje ${i + 1}"><div class="in"><div class="f dicht"></div><div class="f open-f ${vak(t.k).cls} ${t.cls}">${t.html}</div></div></button>`).join('')}</div>`;
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
        if (!kl) spreek(a.k.w);
        if (af.size === kaarten.length) setTimeout(() => klaar(kaarten.map(k => ({ kaart: k.n, juist: !fout.has(k.n) }))), 900);
      } else {
        // een paar dat al eens open lag en nu gemist wordt, telt als fout
        slot = true;
        setTimeout(() => { open.forEach(x => $(`.mem[data-i="${x}"]`, el).classList.remove('open')); open = []; slot = false; }, 1100);
        if (zetten > kaarten.length) { fout.add(a.k.n); fout.add(c.k.n); }
      }
    });
  }

  // ---------- sorteren ----------
  function sorteer(el, p, klaar) {
    let sleutel = 'c', groepen;
    const per = (f) => { const m = {}; p.forEach(k => (m[f(k)] = m[f(k)] || []).push(k)); return Object.entries(m).filter(([, l]) => l.length >= 3); };
    // Liefst groepen binnen één vak (bv. "Licht" en "Menselijk lichaam"), anders per vak.
    const vakken = shuffle([...new Set(p.map(k => k.v))]);
    groepen = [];
    for (const v of vakken) {
      const m = {}; p.filter(k => k.v === v).forEach(k => { const c = k.c || k.d; (m[c] = m[c] || []).push(k); });
      const g = Object.entries(m).filter(([, l]) => l.length >= 3);
      if (g.length >= 2) { groepen = g; sleutel = 'c'; break; }
    }
    if (groepen.length < 2) { sleutel = 'v'; groepen = per(k => k.v); }
    if (groepen.length < 2) { el.innerHTML = '<div class="leeg-melding">Nog niet genoeg verschillende kaarten om te sorteren.</div>'; return; }
    groepen = shuffle(groepen).slice(0, 3).map(([naam, l]) => ({ naam: sleutel === 'v' ? IB.VAK[naam].naam : naam, cls: sleutel === 'v' ? IB.VAK[naam].cls : vak(l[0]).cls, kaarten: shuffle(l).slice(0, groepen.length === 2 ? 5 : 4) }));
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
      const k = blokjes[gekozen].k; msg.className = 'msg'; msg.textContent = k.u;
    });
    $$('.bak', el).forEach(bak => {
      const zet = () => {
        if (gekozen == null) { msg.textContent = 'Kies eerst een woord.'; return; }
        const b = blokjes[gekozen], knop = $(`.blokje[data-i="${gekozen}"]`, el), gi = +bak.dataset.g;
        if (b.gi === gi) {
          if (!res.has(b.k.n)) res.set(b.k.n, true);
          knop.remove(); gekozen = null;
          $('.chips', bak).insertAdjacentHTML('beforeend', `<span class="chip">${esc(b.k.w)}</span>`);
          msg.className = 'msg goed'; msg.textContent = 'Juist!';
          if (!$('.blokje', el)) setTimeout(() => klaar([...res].map(([kaart, juist]) => ({ kaart, juist }))), 700);
        } else {
          res.set(b.k.n, false);
          knop.classList.remove('fout'); void knop.offsetWidth; knop.classList.add('fout');
          msg.className = 'msg fout'; msg.textContent = 'Nog niet. Lees de uitleg en probeer opnieuw.';
        }
      };
      bak.onclick = zet; bak.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zet(); } };
    });
  }

  // ---------- woordraadsel ----------
  function raadsel(el, p, klaar) {
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const kand = shuffle(p.filter(k => { const w = norm(splits(k.w).kern); return /^[a-z]{4,11}$/.test(w); })).slice(0, 3);
    if (!kand.length) { el.innerHTML = '<div class="leeg-melding">Nog geen geschikte woorden voor het raadsel.</div>'; return; }
    const res = []; let i = 0;
    function ronde() {
      const k = kand[i], woord = norm(splits(k.w).kern), lw = splits(k.w).lw;
      const geraden = new Set(); let levens = 6, klaarR = false;
      el.innerHTML = `<div class="raadsel"><div class="voortgang">${kand.map((_, j) => `<i class="${j < i ? (res[j].juist ? 'goed' : 'fout') : j === i ? 'nu' : ''}"></i>`).join('')}</div>
        ${k.b ? `<div class="toon-beeld" style="width:min(150px,36vw)"><img src="${beeld(k)}" alt=""></div>` : ''}
        <div class="vraag" style="font-size:22px;text-align:center">“${esc(k.u)}”</div>
        <div style="text-align:center">${spreekKnop(k.u)}</div>
        <div class="letters">${lw ? `<span style="border:0;width:auto;font-size:22px;color:var(--muted);text-transform:none;margin-right:8px">${esc(lw)}</span>` : ''}${[...woord].map(() => '<span></span>').join('')}</div>
        <div class="levens" aria-label="Levens"></div>
        <div class="toetsen">${[...'abcdefghijklmnopqrstuvwxyz'].map(c => `<button type="button" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="feedback"><span class="msg" aria-live="polite"></span><button class="btn" type="button" hidden>Volgende</button></div></div>`;
      const vakjes = $$('.letters span', el).slice(lw ? 1 : 0), msg = $('.msg', el), volg = $('.feedback .btn', el);
      const teken = () => {
        [...woord].forEach((c, j) => { vakjes[j].textContent = geraden.has(c) || klaarR ? c : ''; });
        $('.levens', el).innerHTML = Array.from({ length: 6 }, (_, j) => `<span style="color:${j < levens ? 'var(--bad)' : 'var(--line)'}">♥</span>`).join('');
      };
      const stop = juist => {
        klaarR = true; res.push({ kaart: k.n, juist }); teken();
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
  function einde(el, spel, res, opnieuw, terug) {
    bewaarResultaten(res);
    const goed = res.filter(r => r.juist).length, n = res.length;
    const sterren = n ? (goed === n ? 3 : goed / n >= .6 ? 2 : goed ? 1 : 0) : 0;
    el.innerHTML = `<div class="einde">
      <div class="eyebrow">${esc(spel.naam)}</div>
      <div class="sterren" aria-label="${sterren} van de 3 sterren">${[0, 1, 2].map(j => `<span class="${j < sterren ? '' : 'uit'}">★</span>`).join('')}</div>
      <div class="score">${goed} / ${n}</div>
      <p class="muted">${sterren === 3 ? 'Alles juist! Deze kaarten komen pas later terug.' : 'Wat nog niet lukte, komt morgen terug.'}</p>
      <div class="row" style="justify-content:center"><button class="btn big" type="button" id="nog">Nog eens</button><a class="btn ghost big" href="${terug}">Ander spelletje</a></div>
      <div class="lijst">${res.map(r => { const k = BY[r.kaart]; return k ? `<div style="position:relative">${kaartHTML(k, { mini: true })}<span class="status ${r.juist ? 'ken' : 'oefen'}" style="top:-8px;right:-6px">${r.juist ? '✓' : '↺'}</span></div>` : ''; }).join('')}</div>
    </div>`;
    if (kleuter()) spreek(sterren >= 2 ? 'Goed gedaan!' : 'Goed geprobeerd!');
    $('#nog', el).onclick = opnieuw;
  }
})();
