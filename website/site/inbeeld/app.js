// In Beeld: de website. Gewone JavaScript, geen bibliotheken (behalve qrcode.js voor de QR-codes).
// De kaarten komen uit data/kaarten.js (gemaakt door website/inbeeld/bouw.js).
// Gegevens van leerlingen en leerkrachten: Supabase, enkel via de functies ib_* (zie website/inbeeld/database.sql).
(function () {
  'use strict';

  const DB = { url: 'https://kkqzstqsczcooutdjypt.supabase.co/rest/v1/rpc/', key: 'sb_publishable_woxocUFof4ifDWmkVGsHsQ_HL_eMAhc' };
  const LJ = ['JK', 'K2', 'K3', '1', '2', '3', '4', '5', '6'];
  const LJ_KORT = ['JK', 'K2', 'K3', '1ste', '2de', '3de', '4de', '5de', '6de'];
  const LJ_NAAM = ['jongste kleuters', '2de kleuterklas', '3de kleuterklas', '1ste leerjaar', '2de leerjaar', '3de leerjaar', '4de leerjaar', '5de leerjaar', '6de leerjaar'];
  const VAK = {
    NL: { naam: 'Nederlands', kort: 'Nederlands', cls: 'nl' },
    WIS: { naam: 'Wiskunde', kort: 'Wiskunde', cls: 'wis' },
    WO: { naam: 'Wetenschap en techniek', kort: 'WeTe', cls: 'wo' },
    S: { naam: 'Schooltaal', kort: 'Schooltaal', cls: 'st' },
  };
  const DIEREN = { vos: '🦊', uil: '🦉', egel: '🦔', beer: '🐻', kikker: '🐸', konijn: '🐰', eend: '🦆', muis: '🐭', vlinder: '🦋', schildpad: '🐢', olifant: '🐘', leeuw: '🦁' };

  // ---------- kaarten ----------
  const K = window.KAARTEN || [];
  const BY = Object.create(null);
  K.forEach(k => { BY[k.n] = k; k.rr = []; });
  K.forEach(k => k.r.forEach(n => { const o = BY[n]; if (o && !o.r.includes(k.n) && !o.rr.includes(k.n)) o.rr.push(k.n); }));
  const rel = k => [...k.r, ...k.rr].filter(n => BY[n]);
  const splits = w => { const m = /^(de|het|een)\s+(.+)$/i.exec(w); return m ? { lw: m[1], kern: m[2] } : { lw: '', kern: w }; };
  const beeld = k => k.b ? `api/beelden/${k.n}.webp` : '';
  const vak = k => VAK[k.v] || VAK.S;

  // ---------- hulpjes ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const vandaag = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const plusDagen = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  function toast(t) {
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }

  async function rpc(f, body) {
    const r = await fetch(DB.url + f, { method: 'POST', headers: { apikey: DB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    if (!r.ok) {
      const t = await r.text();
      const e = new Error(/te_veel/.test(t) ? 'te_veel' : /niet_aangemeld/.test(t) ? 'niet_aangemeld' : /geen_klas/.test(t) ? 'geen_klas' : 'net');
      e.detail = t; throw e;
    }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const foutTekst = e => e.message === 'te_veel' ? 'Te veel pogingen. Wacht tien minuten of vraag hulp aan je juf of meester.'
    : e.message === 'net' ? 'Er ging iets mis met de verbinding. Probeer het nog eens.' : 'Er ging iets mis (' + e.message + ').';

  // ---------- voorlezen ----------
  let stem = null;
  function kiesStem() {
    if (!('speechSynthesis' in window)) return;
    const v = speechSynthesis.getVoices();
    stem = v.find(x => /nl[-_]BE/i.test(x.lang)) || v.find(x => /nl[-_]NL/i.test(x.lang)) || v.find(x => /^nl/i.test(x.lang)) || null;
  }
  if ('speechSynthesis' in window) { kiesStem(); speechSynthesis.onvoiceschanged = kiesStem; }
  function spreek(t) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = stem ? stem.lang : 'nl-BE'; if (stem) u.voice = stem; u.rate = .92;
    speechSynthesis.speak(u);
  }
  const ICON = {
    spreek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    album: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="9" rx="1.5"/><rect x="14" y="4" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="5" rx="1.5"/><rect x="14" y="15" width="7" height="5" rx="1.5"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="18.5" r="2"/><path d="M9.6 10.4 6.2 7.3M14.4 10.4l3.4-3.1M9.8 14.2l-3.4 3.3M14.3 14.1l3.2 3"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z"/></svg>',
    spel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="14" r="1" fill="currentColor"/></svg>',
    ster: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    kaarten: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="13" height="17" rx="2" transform="rotate(8 12 12)"/><rect x="4" y="4" width="13" height="17" rx="2"/></svg>',
  };
  const spreekKnop = (t, label = 'Lees voor') => `<button class="btn ghost small speak" type="button" data-spreek="${esc(t)}">${ICON.spreek}<span>${esc(label)}</span></button>`;
  document.addEventListener('click', e => { const b = e.target.closest('[data-spreek]'); if (b) { e.preventDefault(); e.stopPropagation(); spreek(b.dataset.spreek); } });

  // ---------- wie is er aangemeld ----------
  // S.ik: een leerling (van de server) of een gast (lokaal). null: niemand.
  const S = { ik: null };
  function maakIk(d, gast) {
    const lj = Math.max(0, LJ.indexOf(d.leerjaar));
    return {
      gast: !!gast, naam: d.voornaam, soort: d.soort || 'pin', klas: d.klas || '', lj,
      aangebracht: new Set(d.aangebracht || []), projecten: d.projecten || [], voortgang: d.voortgang || {},
    };
  }
  async function laadIk() {
    const t = store.get('ib_token');
    if (t) {
      try {
        const d = await rpc('ib_ik', { p_token: t });
        if (d) { S.ik = maakIk(d); return; }
        store.set('ib_token', null);
      } catch (e) {
        // geen verbinding: verder als bezoeker, met wat we nog weten
        const oud = store.get('ib_ik_cache');
        if (oud) { S.ik = maakIk(oud); S.ik.offline = true; return; }
      }
    }
    const g = store.get('ib_gast');
    if (g) S.ik = maakIk({ voornaam: 'Gast', leerjaar: g.leerjaar, voortgang: g.voortgang || {} }, true);
  }
  async function herlaadIk() { if (S.ik && !S.ik.gast) await laadIk(); }
  function startGast(lj) {
    store.set('ib_gast', { leerjaar: LJ[lj], voortgang: {} });
    S.ik = maakIk({ voornaam: 'Gast', leerjaar: LJ[lj], voortgang: {} }, true);
  }
  async function afmelden() {
    const t = store.get('ib_token');
    if (t) rpc('ib_afmelden', { p_token: t }).catch(() => {});
    store.set('ib_token', null); store.set('ib_gast', null); store.set('ib_ik_cache', null);
    S.ik = null; go('#/');
  }
  const kleuter = (ik = S.ik) => ik && ik.lj <= 2;

  // De woordbib: wat een leerling al kreeg.
  // Leerling: alles van vorige leerjaren + wat in de klas aangebracht is (of via LANcelot) + projecten + wat al geoefend werd.
  // Gast: alles tot en met het gekozen leerjaar.
  function woordbib(ik = S.ik) {
    if (!ik) return [];
    const uit = new Set();
    for (const k of K) if (ik.gast ? k.s <= ik.lj : k.s < ik.lj) uit.add(k.n);
    if (!ik.gast) {
      ik.aangebracht.forEach(n => uit.add(n));
      ik.projecten.forEach(p => p.kaarten.forEach(n => uit.add(n)));
      Object.keys(ik.voortgang).forEach(n => uit.add(n));
    }
    return [...uit].map(n => BY[n]).filter(Boolean).sort((a, b) => a.s - b.s || a.n.localeCompare(b.n, 'nl', { numeric: true }));
  }
  function status(k, ik = S.ik) {
    if (!ik) return '';
    const v = ik.voortgang[k.n];
    if (!v) return k.s < ik.lj ? 'vroeger' : 'nieuw';
    return v[0] >= 4 ? 'ken' : 'oefen';
  }
  const STATUS = { nieuw: 'Nieuw', oefen: 'Aan het oefenen', ken: 'Ik ken het', vroeger: 'Van vroeger' };

  // Na een spelletje: bewaren (server of lokaal), zelfde regels als ib_oefen.
  async function bewaarResultaten(res) {
    if (!S.ik || !res.length) return;
    const vg = S.ik.voortgang, d = [1, 2, 4, 7, 14, 30];
    for (const r of res) {
      const v = vg[r.kaart];
      if (!v) vg[r.kaart] = [r.juist ? 1 : 0, plusDagen(1), r.juist ? 1 : 0, r.juist ? 0 : 1];
      else {
        const doos = r.juist ? Math.min(v[0] + 1, 5) : 1;
        vg[r.kaart] = [doos, plusDagen(r.juist ? d[doos] : 1), v[2] + (r.juist ? 1 : 0), v[3] + (r.juist ? 0 : 1)];
      }
    }
    if (S.ik.gast) { const g = store.get('ib_gast', {}); g.voortgang = vg; store.set('ib_gast', g); return; }
    try { await rpc('ib_oefen', { p_token: store.get('ib_token'), p_res: res }); } catch { toast('Je score kon niet bewaard worden (geen verbinding).'); }
  }

  // ---------- kaarten tekenen ----------
  function stippen(k) {
    return `<div class="stippen" aria-label="${esc(leerjarenTekst(k))}">${LJ.map((_, i) =>
      `<i class="${i === k.s ? 'on' : k.t.includes(i) ? 'terug' : i > k.s ? 'voor' : ''}${i < 3 ? ' k' : ''}"></i>`).join('')}</div>`;
  }
  const inLJ = i => (i === 0 ? 'bij de ' : i < 3 ? 'in de ' : 'in het ') + LJ_NAAM[i];
  function leerjarenTekst(k) {
    const t = k.t.length ? `, komt terug ${k.t.map(inLJ).join(' en ')}` : '';
    return `Nieuw ${inLJ(k.s)}${t}`;
  }
  function woordHTML(k) {
    const { lw, kern } = splits(k.w);
    return lw ? `<span class="lw">${esc(lw)}</span> ${esc(kern)}` : esc(kern);
  }
  function picHTML(k, groot) {
    const b = beeld(k);
    if (b) return `<div class="pic"><img src="${b}" alt="" loading="lazy" decoding="async"></div>`;
    const { kern } = splits(k.w);
    return `<div class="pic" title="Het beeld komt later"><span class="leeg${groot ? ' groot' : ''}">${esc(kern.replace(/^[^\p{L}\d]+/u, '').slice(0, 1) || '?')}</span></div>`;
  }
  function kaartHTML(k, o = {}) {
    const v = vak(k), st = o.status ? status(k) : '';
    const tag = o.href === false ? 'div' : 'a';
    const href = o.href === false ? '' : ` href="${o.href || '#/kaart/' + k.n}"`;
    return `<${tag} class="kaart ${v.cls}${o.mini ? ' mini' : ''}"${href} aria-label="${esc(k.w)}">
      <div class="kop"><span>${esc(v.kort.toUpperCase())}</span><span>${esc(k.n)}</span></div>
      ${st ? `<span class="status ${st}">${STATUS[st]}</span>` : ''}
      ${picHTML(k)}
      <div class="woord">${woordHTML(k)}</div>
      ${o.mini || kleuter() ? '' : `<div class="uitleg">${esc(k.u)}</div>`}
      ${stippen(k)}
    </${tag}>`;
  }

  // Een lijst kaarten met "Meer tonen"
  function rooster(el, lijst, o = {}) {
    let n = 0; const stap = o.stap || 48;
    el.innerHTML = `<div class="grid${o.small ? ' small' : ''}"></div><div class="meer"></div>`;
    const g = el.firstChild, m = el.lastChild;
    function meer() {
      g.insertAdjacentHTML('beforeend', lijst.slice(n, n + stap).map(k => kaartHTML(k, o)).join(''));
      n += stap;
      m.innerHTML = n < lijst.length ? `<button class="btn ghost" type="button">Meer tonen (nog ${lijst.length - n})</button>` : '';
      const b = m.firstChild; if (b) b.onclick = meer;
    }
    if (!lijst.length) el.innerHTML = `<div class="leeg-melding">${o.leeg || 'Geen kaarten gevonden.'}</div>`; else meer();
  }

  function zoekMatch(k, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return k.w.toLowerCase().includes(q) || k.n.toLowerCase() === q || k.u.toLowerCase().includes(q) || k.c.toLowerCase().includes(q);
  }
  function chipsHTML(naam, opties, gekozen) {
    return `<div class="chips" role="group" data-groep="${naam}">${opties.map(([w, t, c]) =>
      `<button type="button" class="chip${c ? ' c-' + c : ''}" data-w="${esc(w)}" aria-pressed="${String(w) === String(gekozen)}">${esc(t)}</button>`).join('')}</div>`;
  }
  function bindChips(el, naam, cb) {
    $$(`[data-groep="${naam}"] .chip`, el).forEach(b => b.onclick = () => {
      $$(`[data-groep="${naam}"] .chip`, el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      cb(b.dataset.w);
    });
  }
  const vakChips = g => chipsHTML('vak', [['', 'Alle vakken'], ['NL', 'Nederlands', 'nl'], ['WIS', 'Wiskunde', 'wis'], ['WO', 'Wetenschap en techniek', 'wo'], ['S', 'Schooltaal', 'st']], g);

  // ---------- router ----------
  const app = () => $('#app');
  const routes = [];
  const route = (re, f, o = {}) => routes.push({ re, f, ...o });
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  async function render() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [pad, qs] = h.split('?');
    const q = new URLSearchParams(qs || '');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    for (const r of routes) {
      const m = r.re.exec(pad);
      if (!m) continue;
      nav(r.nav || '');
      document.title = r.titel ? `${r.titel} · In Beeld` : 'In Beeld';
      window.scrollTo(0, 0);
      try { await r.f(app(), m.slice(1).map(decodeURIComponent), q); }
      catch (e) { console.error(e); app().innerHTML = `<div class="leeg-melding"><p>${esc(foutTekst(e))}</p><a class="btn" href="#/">Naar de start</a></div>`; }
      app().focus?.();
      return;
    }
    go('#/');
  }
  function nav(actief) {
    const ik = S.ik;
    const links = ik
      ? [['/', 'Start'], ['/woordbib', kleuter() ? 'Mijn kaarten' : 'Woordbib'], ['/projecten', 'Projecten'], ['/web', 'Woordweb'], ['/spel', 'Spelletjes']]
      : [['/', 'Start'], ['/kaarten', 'Alle kaarten'], ['/web', 'Woordweb'], ['/aanmelden', 'Aanmelden'], ['/leerkracht', 'Leerkracht']];
    const wie = ik ? `<span class="who"><span class="avatar" aria-hidden="true">${esc(ik.naam[0] || '?')}</span><span class="lang">${esc(ik.naam)}${ik.gast ? ' · ' + LJ_KORT[ik.lj] : ''}</span></span><button type="button" id="uit">${ik.gast ? 'Stoppen' : 'Afmelden'}</button>` : '';
    $('#nav').innerHTML = links.map(([h, t]) => `<a href="#${h}"${actief === h ? ' class="on" aria-current="page"' : ''}>${t}</a>`).join('') + wie;
    const u = $('#uit'); if (u) u.onclick = afmelden;
  }
  window.addEventListener('hashchange', render);

  // ---------- start ----------
  route(/^\/$/, async el => {
    if (S.ik) return thuis(el);
    const toon = ['S-001', 'W-001', 'O-001', 'N-002'].map(n => BY[n]).filter(Boolean);
    const voorbeeld = toon.length === 4 ? toon : shuffle(K.filter(k => k.b)).slice(0, 4);
    el.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">Van de jongste kleuters tot het 6de leerjaar</div>
          <h1><span class="frame">In</span> Beeld</h1>
          <p class="tag">Eén begrip. Eén kaart. De hele school door.</p>
          <p class="sub">Elk begrip uit de leerplannen krijgt één vaste kaart, met hetzelfde beeld aan de muur en op het scherm. De kaart groeit mee: wat je in de kleuterklas leert, bouw je verder uit tot in het 6de leerjaar.</p>
          <div class="row">
            <a class="btn big" href="#/aanmelden">Ik ben leerling</a>
            <a class="btn ghost big" href="#/kaarten">Bekijk de kaarten</a>
          </div>
          <p class="muted" style="margin-top:16px;font-size:15px">Leerkracht? <a href="#/leerkracht">Meld je hier aan</a>. Even rondkijken als leerling? <a href="#/proberen">Probeer het zonder account</a>.</p>
        </div>
        <div class="fan" aria-hidden="true">${voorbeeld.map(k => kaartHTML(k, { href: false })).join('')}</div>
      </section>
      <section class="stat" aria-label="In cijfers">
        <div><b>${K.length}</b><span>kaarten</span></div>
        <div><b>9</b><span>leerjaren</span></div>
        <div><b>4</b><span>domeinen</span></div>
        <div><b>${K.reduce((a, k) => a + k.r.length, 0)}</b><span>verbanden</span></div>
      </section>
      <section class="tegels">
        <a class="tegel wis" href="#/kaarten"><span class="ic">${ICON.kaarten}</span><h3>De kaarten</h3><p>Zoek een begrip en draai de kaart om: wat het betekent, een voorbeeld en wanneer het terugkomt.</p></a>
        <a class="tegel nl" href="#/web"><span class="ic">${ICON.web}</span><h3>Het woordweb</h3><p>Begrippen hangen aan elkaar vast, ook over de vakken heen. Wandel van woord naar woord.</p></a>
        <a class="tegel wo" href="#/proberen"><span class="ic">${ICON.spel}</span><h3>Speels oefenen</h3><p>Wie ben ik, memory, sorteren, woordraadsel en elke dag vijf kaarten die terugkomen.</p></a>
        <a class="tegel st" href="#/leerkracht"><span class="ic">${ICON.album}</span><h3>Voor de klas</h3><p>Klas maken, kaarten aanbrengen, projecten bundelen en inlogkaartjes en kaarten afdrukken.</p></a>
      </section>`;
  }, { nav: '/' });

  async function thuis(el) {
    const ik = S.ik, wb = woordbib(), vg = ik.voortgang, nu = vandaag();
    const tel = { ken: 0, oefen: 0, nieuw: 0, vroeger: 0 };
    wb.forEach(k => tel[status(k)]++);
    const teOefenen = wb.filter(k => vg[k.n] && vg[k.n][1] <= nu).length;
    const nieuwInKlas = wb.filter(k => status(k) === 'nieuw').slice(-8).reverse();
    const pct = x => wb.length ? (x / wb.length * 100).toFixed(1) + '%' : '0';
    el.innerHTML = `
      <div class="page-head">
        <div>
          <div class="eyebrow">${esc(ik.gast ? 'Proberen · ' + LJ_NAAM[ik.lj] : (ik.klas ? 'Klas ' + ik.klas + ' · ' : '') + LJ_NAAM[ik.lj])}</div>
          <h1>Hallo${ik.gast ? '' : ', ' + esc(ik.naam)}!</h1>
          <p>${kleuter() ? 'Kijk naar je kaarten en speel een spelletje.' : `Je hebt al ${wb.length} kaarten in je woordbib. ${teOefenen ? teOefenen + (teOefenen === 1 ? ' kaart wacht' : ' kaarten wachten') + ' op je vandaag.' : 'Vandaag mag je kiezen wat je oefent.'}`}</p>
        </div>
        ${kleuter() ? spreekKnop(`Hallo ${ik.gast ? '' : ik.naam}! Kijk naar je kaarten en speel een spelletje.`) : ''}
      </div>
      ${kleuter() ? '' : `<div class="stat">
        <div><b>${tel.ken}</b><span>ik ken het</span></div>
        <div><b>${tel.oefen}</b><span>aan het oefenen</span></div>
        <div><b>${tel.nieuw}</b><span>nieuw</span></div>
        <div><b>${tel.vroeger}</b><span>van vroeger</span></div>
      </div>
      <div class="balk" aria-hidden="true" style="margin:-8px 0 28px"><i style="width:${pct(tel.ken)};background:var(--good)"></i><i style="width:${pct(tel.oefen)};background:var(--st)"></i><i style="width:${pct(tel.nieuw)};background:var(--wis)"></i></div>`}
      <div class="tegels">
        <a class="tegel groot" href="#/spel/dag5"><span class="ic">${ICON.ster}</span><h3>${kleuter() ? 'Spelen' : 'De dagelijkse 5'}</h3><p>${kleuter() ? 'Luister en zoek het juiste prentje.' : 'Vijf kaarten die terugkomen, met voorrang voor wat je bijna vergeten bent.'}</p></a>
        <a class="tegel wis" href="#/woordbib"><span class="ic">${ICON.album}</span><h3>${kleuter() ? 'Mijn kaarten' : 'Mijn woordbib'}</h3><p>Al je kaarten, als verzamelalbum.</p></a>
        <a class="tegel st" href="#/projecten"><span class="ic">${ICON.map}</span><h3>Projecten</h3><p>De kaarten van een project samen, uit alle vakken.</p></a>
        <a class="tegel nl" href="#/web"><span class="ic">${ICON.web}</span><h3>Woordweb</h3><p>Ontdek hoe begrippen samenhangen.</p></a>
        <a class="tegel wo" href="#/spel"><span class="ic">${ICON.spel}</span><h3>Spelletjes</h3><p>Wie ben ik, memory, sorteren en meer.</p></a>
      </div>
      ${nieuwInKlas.length ? `<section style="margin-top:36px"><h2 style="font-size:24px;margin-bottom:14px">${ik.gast ? 'Nieuw in dit leerjaar' : 'Nieuw voor jou'}</h2><div id="nieuw"></div></section>` : ''}
      ${ik.offline ? '<p class="note" style="margin-top:20px">Geen verbinding: je ziet je kaarten van de vorige keer.</p>' : ''}`;
    const n = $('#nieuw', el); if (n) rooster(n, nieuwInKlas, { status: true, small: true });
  }

  // ---------- proberen zonder account ----------
  route(/^\/proberen$/, el => {
    el.innerHTML = `<div class="login">
      <h1>Even proberen</h1>
      <p class="muted">Kies een leerjaar. Je krijgt alle kaarten tot en met dat leerjaar in je woordbib. Wat je oefent, blijft enkel op dit toestel.</p>
      <div class="keuzes">${LJ.map((_, i) => `<button class="keuze" type="button" data-lj="${i}">${LJ_KORT[i]}<small>${LJ_NAAM[i]}</small></button>`).join('')}</div>
      <a class="terug" href="#/aanmelden">Ik heb een account: aanmelden</a>
    </div>`;
    $$('[data-lj]', el).forEach(b => b.onclick = () => { startGast(+b.dataset.lj); go('#/'); });
  }, { titel: 'Proberen' });

  // ---------- aanmelden: klas, dan voornaam, dan code ----------
  route(/^\/aanmelden$/, async el => {
    el.innerHTML = `<div class="login"><h1>In welke klas zit je?</h1><p class="muted">Tik op je klas.</p><div id="kl"><p class="muted">Klassen laden…</p></div></div>`;
    let klassen;
    try { klassen = await rpc('ib_klassen'); } catch (e) { $('#kl').innerHTML = `<p class="err">${esc(foutTekst(e))}</p>`; return; }
    if (!klassen.length) {
      $('#kl').innerHTML = `<p class="note">Er zijn nog geen klassen. Je juf of meester maakt die aan bij <a href="#/leerkracht">Leerkracht</a>.</p><p><a href="#/proberen">Probeer het intussen zonder account</a></p>`;
      return;
    }
    const groepen = LJ.map((lj, i) => ({ i, kl: klassen.filter(k => k.leerjaar === lj) })).filter(g => g.kl.length);
    $('#kl').innerHTML = groepen.map(g => `<div class="ljgroep"><h2>${LJ_NAAM[g.i][0].toUpperCase() + LJ_NAAM[g.i].slice(1)}</h2><div class="keuzes">${g.kl.map(k =>
      `<button class="keuze" type="button" data-k="${esc(k.id)}" data-naam="${esc(k.naam)}">${esc(k.naam)}</button>`).join('')}</div></div>`).join('');
    $$('[data-k]', el).forEach(b => b.onclick = () => { sessionStorage.setItem('ib_klasnaam', b.dataset.naam); go('#/aanmelden/' + b.dataset.k); });
  }, { nav: '/aanmelden', titel: 'Aanmelden' });

  route(/^\/aanmelden\/([\w-]+)$/, async (el, [klas]) => {
    const kn = sessionStorage.getItem('ib_klasnaam') || '';
    el.innerHTML = `<div class="login"><a class="terug" href="#/aanmelden">← Andere klas</a><h1>Wie ben jij?</h1><p class="muted">${kn ? 'Klas ' + esc(kn) + ' · ' : ''}Tik op je naam.</p><div id="nm"><p class="muted">Namen laden…</p></div></div>`;
    let ll;
    try { ll = await rpc('ib_klas', { p_klas: klas }); } catch (e) { $('#nm').innerHTML = `<p class="err">${esc(foutTekst(e))}</p>`; return; }
    if (!ll.length) { $('#nm').innerHTML = '<p class="note">In deze klas staan nog geen namen.</p>'; return; }
    $('#nm').innerHTML = `<div class="keuzes">${ll.map(l => `<button class="keuze" type="button" data-id="${esc(l.id)}" data-soort="${esc(l.soort)}" data-naam="${esc(l.voornaam)}">${esc(l.voornaam)}</button>`).join('')}</div>`;
    $$('[data-id]', el).forEach(b => b.onclick = () => {
      sessionStorage.setItem('ib_ll', JSON.stringify({ id: b.dataset.id, soort: b.dataset.soort, naam: b.dataset.naam }));
      go(`#/aanmelden/${klas}/${b.dataset.id}`);
    });
  }, { nav: '/aanmelden', titel: 'Aanmelden' });

  route(/^\/aanmelden\/([\w-]+)\/([\w-]+)$/, async (el, [klas, id]) => {
    const ll = JSON.parse(sessionStorage.getItem('ib_ll') || '{}');
    if (ll.id !== id) return go('#/aanmelden/' + klas);
    const dier = ll.soort === 'dier';
    el.innerHTML = `<div class="login">
      <a class="terug" href="#/aanmelden/${esc(klas)}">← Dat ben ik niet</a>
      <h1>${dier ? 'Wat is jouw dier' : 'Typ je geheime code'}, ${esc(ll.naam)}?</h1>
      ${dier ? `<div class="dieren">${Object.entries(DIEREN).map(([w, e]) => `<button type="button" data-d="${w}" aria-label="${w}">${e}<small>${w}</small></button>`).join('')}</div>`
        : `<div class="pins" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
           <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button">${n}</button>`).join('')}<button type="button" aria-label="Wissen">⌫</button><button type="button">0</button><button type="button" aria-label="Opnieuw">↺</button></div>`}
      <p class="err" id="msg" aria-live="polite"></p>
    </div>`;
    if (dier) spreek(`Wat is jouw dier, ${ll.naam}?`);
    const msg = $('#msg');
    let bezig = false;
    async function probeer(code) {
      if (bezig) return; bezig = true; msg.textContent = '';
      try {
        const r = await rpc('ib_aanmelden', { p_leerling: id, p_code: code });
        if (r && r.token) { store.set('ib_token', r.token); store.set('ib_gast', null); await laadIk(); bewaarCache(); go('#/'); return; }
        msg.textContent = dier ? 'Dat is niet jouw dier. Probeer nog eens.' : 'Die code klopt niet. Probeer nog eens.';
        if (dier) spreek('Dat is niet jouw dier. Probeer nog eens.');
      } catch (e) { msg.textContent = foutTekst(e); }
      bezig = false; code_ = ''; teken();
    }
    let code_ = '';
    const teken = () => $$('.pins i', el).forEach((p, i) => p.classList.toggle('on', i < code_.length));
    if (dier) $$('[data-d]', el).forEach(b => b.onclick = () => probeer(b.dataset.d));
    else {
      $$('.pad button', el).forEach(b => b.onclick = () => {
        const t = b.textContent;
        if (t === '⌫') code_ = code_.slice(0, -1); else if (t === '↺') code_ = ''; else if (code_.length < 4) code_ += t;
        teken(); if (code_.length === 4) probeer(code_);
      });
      document.onkeydown = e => {
        if (!location.hash.startsWith('#/aanmelden/')) { document.onkeydown = null; return; }
        if (/^\d$/.test(e.key) && code_.length < 4) { code_ += e.key; teken(); if (code_.length === 4) probeer(code_); }
        if (e.key === 'Backspace') { code_ = code_.slice(0, -1); teken(); }
      };
    }
  }, { nav: '/aanmelden', titel: 'Aanmelden' });

  // QR op het inlogkaartje: meteen aanmelden
  route(/^\/qr\/([\w-]+)\/(\w+)$/, async (el, [id, code]) => {
    el.innerHTML = '<p class="muted">Aanmelden…</p>';
    history.replaceState(null, '', location.pathname + '#/');
    try {
      const r = await rpc('ib_aanmelden', { p_leerling: id, p_code: code });
      if (r && r.token) { store.set('ib_token', r.token); store.set('ib_gast', null); await laadIk(); bewaarCache(); return render(); }
      el.innerHTML = '<div class="leeg-melding"><p>Dit kaartje werkt niet meer. Vraag een nieuw kaartje aan je juf of meester.</p><a class="btn" href="#/aanmelden">Gewoon aanmelden</a></div>';
    } catch (e) { el.innerHTML = `<p class="err">${esc(foutTekst(e))}</p>`; }
  });
  function bewaarCache() {
    if (!S.ik || S.ik.gast) return;
    store.set('ib_ik_cache', { voornaam: S.ik.naam, soort: S.ik.soort, klas: S.ik.klas, leerjaar: LJ[S.ik.lj], aangebracht: [...S.ik.aangebracht], projecten: S.ik.projecten, voortgang: S.ik.voortgang });
  }

  // ---------- woordbib ----------
  route(/^\/woordbib$/, el => {
    if (!S.ik) return go('#/aanmelden');
    const wb = woordbib();
    let f = { vak: '', st: '', q: '' };
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">${esc(S.ik.gast ? 'Proberen' : S.ik.naam)}</div><h1>${kleuter() ? 'Mijn kaarten' : 'Mijn woordbib'}</h1>
      <p>${kleuter() ? 'Tik op een kaart.' : 'Alle kaarten die je al kreeg. Wat je goed kent, krijgt een groen label.'}</p></div></div>
      <div class="filters">${vakChips('')}
        ${kleuter() ? '' : chipsHTML('st', [['', 'Alles'], ['nieuw', 'Nieuw'], ['oefen', 'Aan het oefenen'], ['ken', 'Ik ken het'], ['vroeger', 'Van vroeger']], '')}
        ${kleuter() ? '' : '<input type="search" placeholder="Zoek een woord" aria-label="Zoek een woord" id="q">'}</div>
      <div id="lijst"></div>`;
    const teken = () => rooster($('#lijst'), wb.filter(k => (!f.vak || k.v === f.vak) && (!f.st || status(k) === f.st) && zoekMatch(k, f.q)),
      { status: true, leeg: wb.length ? 'Geen kaarten met deze keuze.' : 'Je woordbib is nog leeg. Zodra je juf of meester een kaart aanbrengt, komt ze hier.' });
    bindChips(el, 'vak', w => { f.vak = w; teken(); });
    bindChips(el, 'st', w => { f.st = w; teken(); });
    const q = $('#q'); if (q) q.oninput = () => { f.q = q.value.trim(); teken(); };
    teken();
  }, { nav: '/woordbib', titel: 'Woordbib' });

  // ---------- alle kaarten ----------
  const kf = { lj: '', vak: '', q: '' };
  route(/^\/kaarten$/, el => {
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Kaartenbank</div><h1>Alle kaarten</h1>
      <p>${K.length} begrippen uit Nederlands, wiskunde, wetenschap en techniek en schooltaal. Tik op een kaart om ze om te draaien.</p></div></div>
      <div class="filters">${chipsHTML('lj', [['', 'Alle leerjaren'], ...LJ.map((l, i) => [String(i), LJ_KORT[i]])], kf.lj)}</div>
      <div class="filters">${vakChips(kf.vak)}<input type="search" placeholder="Zoek een woord of nummer" aria-label="Zoek" id="q" value="${esc(kf.q)}"></div>
      <p class="muted" id="tel" style="font-size:14px;margin:-6px 0 14px"></p>
      <div id="lijst"></div>`;
    const teken = () => {
      const l = K.filter(k => (kf.lj === '' || k.s === +kf.lj || k.t.includes(+kf.lj)) && (!kf.vak || k.v === kf.vak) && zoekMatch(k, kf.q));
      $('#tel').textContent = `${l.length} kaarten`;
      rooster($('#lijst'), l);
    };
    bindChips(el, 'lj', w => { kf.lj = w; teken(); });
    bindChips(el, 'vak', w => { kf.vak = w; teken(); });
    $('#q').oninput = e => { kf.q = e.target.value.trim(); teken(); };
    teken();
  }, { nav: '/kaarten', titel: 'Alle kaarten' });

  // ---------- één kaart ----------
  route(/^\/kaart\/([A-Z]{1,3}-\d+)$/, (el, [nr]) => {
    const k = BY[nr];
    if (!k) { el.innerHTML = '<div class="leeg-melding">Deze kaart bestaat niet.</div>'; return; }
    const v = vak(k), r = rel(k).map(n => BY[n]);
    const st = S.ik ? status(k) : '';
    const lagen = [k.s, ...k.t].map(i => `<li${S.ik && i === S.ik.lj ? ' class="nu"' : ''}><b>${LJ_KORT[i]}</b><span>${i === k.s ? 'nieuw: ' + esc(k.w) : 'komt terug'}</span></li>`).join('');
    const later = n => S.ik && BY[n].s > S.ik.lj;
    document.title = `${k.w} · In Beeld`;
    el.innerHTML = `
      <a class="terug" href="javascript:history.back()">← Terug</a>
      <div class="detail" style="margin-top:10px">
        <div>
          <button class="flip" type="button" aria-label="Kaart omdraaien">
            <div class="in">
              <div class="face front kaart ${v.cls}">
                <div class="kop"><span>${esc(v.naam.toUpperCase())}</span><span>${esc(k.n)}</span></div>
                ${picHTML(k, true)}
                <div class="woord">${woordHTML(k)}</div>
                <div class="uitleg">${esc(k.u)}</div>
                ${stippen(k)}
              </div>
              <div class="face back kaart ${v.cls}">
                <div class="kop"><span>${esc(k.d.toUpperCase())}</span><span>${esc(k.n)}</span></div>
                <h3>Voorbeeld</h3><p class="zin">${esc(k.z)}</p>
                ${k.f ? `<h3>Familie van dit woord</h3><p>${esc(k.f)}</p>` : ''}
                <h3>De kaart groeit mee</h3><ul class="lagen">${lagen}</ul>
                ${r.length ? `<h3>Hoort bij</h3><p>${r.slice(0, 5).map(x => esc(x.w)).join(', ')}</p>` : ''}
              </div>
            </div>
          </button>
          <p class="hint">Tik op de kaart om ze om te draaien.</p>
        </div>
        <div class="side">
          <div class="eyebrow">${esc(v.naam)} · ${esc(k.c || k.d)}</div>
          <h2>${esc(k.w)}</h2>
          ${st ? `<span class="status ${st}" style="position:static;display:inline-block;margin:2px 0 8px">${STATUS[st]}</span>` : ''}
          <p style="font-size:19px;margin:6px 0 12px">${esc(k.u)}</p>
          <div class="row">${spreekKnop(`${k.w}. ${k.u} Bijvoorbeeld: ${k.z}`)}<a class="btn ghost small" href="#/web/${k.n}">${ICON.web.replace('<svg', '<svg width="18" height="18"')} Woordweb</a></div>
          <section><h3>Voorbeeld</h3><p style="font-family:var(--f-display);font-size:21px;margin:0">${esc(k.z)}</p></section>
          <section><h3>Wanneer?</h3><p style="margin:0">${esc(leerjarenTekst(k))}.</p></section>
          ${r.length ? `<section class="${v.cls}"><h3>Hoort bij</h3><div class="verwant">${r.map(x => `<a href="#/kaart/${x.n}" class="${vak(x).cls}">${x.b ? `<img src="${beeld(x)}" alt="">` : '<span class="dot"></span>'}${esc(x.w)}${later(x.n) ? '<span class="later">komt later</span>' : ''}</a>`).join('')}</div></section>` : ''}
          ${k.o.length ? `<section><h3>Leerplandoelen</h3><p class="codes">${k.o.map(esc).join(' · ')}</p></section>` : ''}
          ${k.b ? '' : '<p class="note" style="margin-top:22px">Het beeld voor deze kaart is nog in de maak.</p>'}
        </div>
      </div>`;
    const f = $('.flip', el); f.onclick = () => f.classList.toggle('om');
  }, { titel: 'Kaart' });

  // ---------- woordweb ----------
  route(/^\/web(?:\/([A-Z]{1,3}-\d+))?$/, (el, [nr]) => {
    const pool = S.ik ? woordbib() : K;
    let k = nr && BY[nr];
    if (!k) {
      const kand = pool.filter(x => rel(x).length >= 3);
      k = kand.length ? kand[Math.floor(Math.random() * kand.length)] : (BY['W-001'] || K[0]);
    }
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Woordweb</div><h1>${esc(k.w)}</h1>
      <p>Rond elke kaart zie je wat ermee verbonden is, ook over de vakken heen.${S.ik ? ' Grijze bolletjes zijn begrippen die later nog komen.' : ''} Tik op een begrip om verder te wandelen.</p></div>
      <div style="min-width:240px"><input type="search" id="zoek" list="woorden" placeholder="Spring naar een woord" aria-label="Spring naar een woord"><datalist id="woorden"></datalist></div></div>
      <div class="webbox"><svg id="web" viewBox="0 0 960 640" role="img" aria-label="Woordweb rond ${esc(k.w)}"></svg>
        <div class="webinfo" id="info"></div></div>
      <div class="legenda"><span><i style="background:var(--nl)"></i>Nederlands</span><span><i style="background:var(--wis)"></i>Wiskunde</span><span><i style="background:var(--wo)"></i>Wetenschap en techniek</span><span><i style="background:var(--st)"></i>Schooltaal</span>${S.ik ? '<span><i style="background:var(--later)"></i>komt later</span>' : ''}</div>`;
    const dl = $('#woorden'); dl.innerHTML = K.map(x => `<option value="${esc(x.w)}">`).join('');
    $('#zoek').onchange = e => { const x = K.find(y => y.w.toLowerCase() === e.target.value.trim().toLowerCase()); if (x) go('#/web/' + x.n); };
    tekenWeb($('#web'), k, $('#info'));
  }, { nav: '/web', titel: 'Woordweb' });

  function tekenWeb(svg, k, info) {
    const NS = 'http://www.w3.org/2000/svg', W = 960, H = 640, cx = W / 2, cy = H / 2;
    const ring1 = rel(k).slice(0, 10);
    const gezien = new Set([k.n, ...ring1]);
    const ring2 = [];
    ring1.forEach(n => rel(BY[n]).forEach(m => { if (!gezien.has(m) && ring2.length < 16) { gezien.add(m); ring2.push({ n: m, ouder: n }); } }));
    const pos = { [k.n]: { x: cx, y: cy, r: 58 } };
    const plaats = (lijst, R, r, off) => lijst.forEach((n, i) => {
      const a = off + (i / lijst.length) * Math.PI * 2;
      pos[n] = { x: cx + Math.cos(a) * R * 1.45, y: cy + Math.sin(a) * R, r };
    });
    plaats(ring1, 175, 40, -Math.PI / 2);
    // ring 2: dicht bij de ouder
    const perOuder = {};
    ring2.forEach(x => (perOuder[x.ouder] = perOuder[x.ouder] || []).push(x.n));
    Object.entries(perOuder).forEach(([o, kids]) => {
      const p = pos[o], a0 = Math.atan2((p.y - cy), (p.x - cx) / 1.45);
      kids.forEach((n, i) => {
        const a = a0 + (i - (kids.length - 1) / 2) * 0.32;
        pos[n] = { x: Math.max(50, Math.min(W - 50, cx + Math.cos(a) * 290 * 1.45)), y: Math.max(40, Math.min(H - 50, cy + Math.sin(a) * 270)), r: 26 };
      });
    });
    const kleur = n => { const x = BY[n]; return S.ik && x.s > S.ik.lj ? 'var(--later)' : `var(--${vak(x).cls})`; };
    const tint = n => { const x = BY[n]; return S.ik && x.s > S.ik.lj ? 'var(--soft)' : `var(--${vak(x).cls}-t)`; };
    let s = '<defs>' + Object.keys(pos).map(n => `<clipPath id="c-${n}"><circle cx="${pos[n].x}" cy="${pos[n].y}" r="${pos[n].r - 4}"/></clipPath>`).join('') + '</defs>';
    const lijn = (a, b, dun) => `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="${dun ? 'var(--line)' : 'color-mix(in srgb,var(--muted) 45%,transparent)'}" stroke-width="${dun ? 2 : 3}"${S.ik && (BY[a].s > S.ik.lj || BY[b].s > S.ik.lj) ? ' stroke-dasharray="6 6"' : ''}/>`;
    ring2.forEach(x => { s += lijn(x.ouder, x.n, true); });
    ring1.forEach(n => { s += lijn(k.n, n); });
    // verbanden binnen ring 1
    ring1.forEach((a, i) => ring1.slice(i + 1).forEach(b => { if (rel(BY[a]).includes(b)) s += lijn(a, b, true); }));
    Object.entries(pos).forEach(([n, p]) => {
      const x = BY[n], b = beeld(x), { kern } = splits(x.w), mid = n === k.n;
      s += `<g class="node" tabindex="0" role="link" aria-label="${esc(x.w)}" data-n="${n}">
        <circle class="ring" cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${tint(n)}" stroke="${kleur(n)}" stroke-width="${mid ? 6 : 4}"/>
        ${b ? `<image href="${b}" x="${p.x - p.r + 4}" y="${p.y - p.r + 4}" width="${(p.r - 4) * 2}" height="${(p.r - 4) * 2}" clip-path="url(#c-${n})"${S.ik && x.s > S.ik.lj ? ' opacity=".35"' : ''}/>` : `<circle cx="${p.x}" cy="${p.y}" r="${p.r * .3}" fill="${kleur(n)}"/>`}
        <text x="${p.x}" y="${p.y + p.r + (mid ? 26 : 19)}" text-anchor="middle" font-size="${mid ? 24 : p.r > 30 ? 17 : 14}" fill="${S.ik && x.s > S.ik.lj ? 'var(--muted)' : 'var(--ink)'}">${esc(mid ? x.w : kern.length > 22 ? kern.slice(0, 20) + '…' : kern)}</text>
      </g>`;
    });
    svg.innerHTML = s;
    const toon = n => {
      const x = BY[n];
      info.innerHTML = `<div style="flex:1;min-width:200px"><b style="font-family:var(--f-display);font-size:19px">${esc(x.w)}</b> <span class="muted">· ${esc(vak(x).naam)} · ${esc(LJ_NAAM[x.s])}</span><div>${esc(x.u)}</div></div>
        <div class="row">${spreekKnop(x.w + '. ' + x.u)}<a class="btn small" href="#/kaart/${x.n}">Open de kaart</a></div>`;
    };
    toon(k.n);
    $$('.node', svg).forEach(g => {
      const n = g.dataset.n;
      const kies = () => { if (n === k.n) go('#/kaart/' + n); else go('#/web/' + n); };
      g.addEventListener('click', kies);
      g.addEventListener('mouseenter', () => toon(n));
      g.addEventListener('focus', () => toon(n));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kies(); } });
    });
    if (!ring1.length) info.insertAdjacentHTML('beforeend', '<p class="muted" style="width:100%;margin:0">Deze kaart heeft nog geen verbanden.</p>');
  }

  // ---------- projecten en thema's ----------
  function themas(ik) {
    // Een thema per cluster uit de leerplannen, met de kaarten tot en met het leerjaar.
    const per = {};
    K.forEach(k => { if (!ik || k.s <= ik.lj) { const t = (k.c || k.d).trim(); (per[t] = per[t] || { naam: t, v: k.v, kaarten: [] }).kaarten.push(k.n); } });
    return Object.values(per).filter(t => t.kaarten.length >= 4).sort((a, b) => a.v.localeCompare(b.v) || a.naam.localeCompare(b.naam));
  }
  route(/^\/projecten$/, el => {
    const ik = S.ik;
    const pr = ik && !ik.gast ? ik.projecten : [];
    const th = themas(ik);
    const tegel = (href, naam, n, cls, sub) => `<a class="tegel ${cls}" href="${href}"><span class="ic">${ICON.map}</span><h3>${esc(naam)}</h3><p>${n} kaarten${sub ? ' · ' + esc(sub) : ''}</p></a>`;
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Projecten</div><h1>Kaarten die samen horen</h1>
      <p>De kaarten van een project op één plek, uit alle vakken. Oude projecten blijven bewaard.</p></div></div>
      ${ik && !ik.gast ? (pr.length ? `<h2 style="font-size:22px;margin:4px 0 12px">Projecten van je klas</h2><div class="tegels">${pr.map(p => tegel('#/project/' + p.id, p.naam, p.kaarten.length, 'st')).join('')}</div>`
        : '<p class="note">Je klas heeft nog geen projecten. Je juf of meester kan er een maken.</p>') : ''}
      <h2 style="font-size:22px;margin:30px 0 12px">Thema's uit de leerplannen</h2>
      <div class="tegels">${th.map(t => tegel('#/thema/' + encodeURIComponent(t.naam), t.naam, t.kaarten.length, VAK[t.v].cls, VAK[t.v].naam)).join('')}</div>`;
  }, { nav: '/projecten', titel: 'Projecten' });

  function setPagina(el, titel, sub, nrs, sleutel) {
    const lijst = nrs.map(n => BY[n]).filter(Boolean);
    el.innerHTML = `<a class="terug" href="#/projecten">← Alle projecten</a>
      <div class="page-head"><div><div class="eyebrow">${esc(sub)}</div><h1>${esc(titel)}</h1><p>${lijst.length} kaarten</p></div>
      <div class="row">${lijst.length >= 4 ? `<a class="btn" href="#/spel?set=${encodeURIComponent(sleutel)}">Speel met deze kaarten</a>` : ''}</div></div>
      <div id="lijst"></div>`;
    rooster($('#lijst'), lijst, { status: !!S.ik });
  }
  route(/^\/project\/([\w-]+)$/, (el, [id]) => {
    const p = S.ik && S.ik.projecten.find(x => x.id === id);
    if (!p) return go('#/projecten');
    setPagina(el, p.naam, 'Project van ' + S.ik.klas, p.kaarten, 'project:' + id);
  }, { nav: '/projecten', titel: 'Project' });
  route(/^\/thema\/(.+)$/, (el, [naam]) => {
    const t = themas(S.ik).find(x => x.naam === naam);
    if (!t) return go('#/projecten');
    setPagina(el, t.naam, 'Thema · ' + VAK[t.v].naam, t.kaarten, 'thema:' + naam);
  }, { nav: '/projecten', titel: 'Thema' });

  // Welke kaarten gebruikt een spelletje? Standaard de woordbib; of een project/thema.
  function spelKaarten(sleutel) {
    if (sleutel && sleutel.startsWith('project:')) { const p = S.ik && S.ik.projecten.find(x => x.id === sleutel.slice(8)); if (p) return p.kaarten.map(n => BY[n]).filter(Boolean); }
    if (sleutel && sleutel.startsWith('thema:')) { const t = themas(S.ik).find(x => x.naam === sleutel.slice(6)); if (t) return t.kaarten.map(n => BY[n]); }
    return woordbib();
  }

  // ---------- privacy ----------
  route(/^\/privacy$/, el => {
    el.innerHTML = `<div style="max-width:68ch"><div class="eyebrow">Privacy</div><h1 style="font-size:36px;margin-bottom:14px">Wat In Beeld bewaart</h1>
      <p>In Beeld bewaart zo weinig mogelijk: per leerling enkel de <b>voornaam</b>, de <b>klas</b>, een <b>geheime code</b> (4 cijfers of een dier, versleuteld opgeslagen) en <b>welke kaarten de leerling oefende</b> en hoe goed dat ging. Geen achternaam, geen e-mailadres, geen foto's.</p>
      <p>Leerkrachten hebben een eigen account met naam en wachtwoord. Enkel de leerkracht van de klas ziet de codes en het klasoverzicht.</p>
      <p>LANcelot, het klasprogramma, meldt enkel "kaart X is aangebracht in leerjaar Y". Namen, antwoorden en logboeken blijven op de pc in de klas.</p>
      <p>De gegevens staan in een Europese database (Supabase, Ierland). Wie zonder account "even probeert", bewaart alles enkel op het eigen toestel.</p>
      <p class="muted">Vragen of iets laten wissen? Vraag het aan de leerkracht of aan de school.</p></div>`;
  }, { titel: 'Privacy' });

  // ---------- gedeeld met spellen.js en leerkracht.js ----------
  window.IB = {
    LJ, LJ_KORT, LJ_NAAM, VAK, DIEREN, K, BY, S, ICON,
    rel, splits, beeld, vak, esc, $, $$, shuffle, vandaag, store, toast, rpc, foutTekst, spreek, spreekKnop,
    kleuter, woordbib, status, STATUS, bewaarResultaten, herlaadIk, kaartHTML, picHTML, woordHTML, stippen, rooster,
    zoekMatch, chipsHTML, bindChips, vakChips, route, go, render, spelKaarten, themas,
    async start() {
      await laadIk();
      if (S.ik && !S.ik.gast) bewaarCache();
      render();
    },
  };
})();
