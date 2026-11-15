// In Beeld: het leerkrachtscherm. Klassen, voornamen en codes, inlogkaartjes, kaarten aanbrengen,
// projecten, het klasoverzicht en kaarten afdrukken.
(function () {
  'use strict';
  const { LJ, LJ_KORT, LJ_NAAM, VAK, DIEREN, K, BY, esc, $, $$, store, toast, rpc, foutTekst, beeld, vak, splits,
    kaartHTML, zoekMatch, chipsHTML, bindChips, vakChips, route, go, render, rel } = IB;

  const L = { data: null };
  const token = () => store.get('ib_lk_token');
  const basis = () => location.origin + location.pathname;

  async function call(f, body) {
    try { return await rpc(f, { p_token: token(), ...body }); }
    catch (e) { if (e.message === 'niet_aangemeld') { store.set('ib_lk_token', null); go('#/leerkracht'); } throw e; }
  }
  async function laad() { L.data = await call('ib_lk'); return L.data; }
  const klas = id => L.data && L.data.klassen.find(k => k.id === id);
  const codeHTML = l => l.soort === 'dier' ? `${DIEREN[l.code] || ''} ${esc(l.code)}` : esc(l.code);

  function dialoog(html, bind) {
    const d = document.createElement('div'); d.className = 'dlg';
    d.innerHTML = `<div class="panel" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(d);
    const sluit = () => d.remove();
    d.onclick = e => { if (e.target === d) sluit(); };
    bind(d, sluit);
    const f = $('input,button', d); if (f) f.focus();
  }
  function bevestig(tekst, knop, ok) {
    dialoog(`<p style="font-size:18px;margin-top:0">${tekst}</p><div class="row"><button class="btn danger" type="button" id="ja">${esc(knop)}</button><button class="btn ghost" type="button" id="nee">Annuleren</button></div>`,
      (d, sluit) => { $('#ja', d).onclick = () => { sluit(); ok(); }; $('#nee', d).onclick = sluit; });
  }

  // ---------- aanmelden ----------
  route(/^\/leerkracht$/, async el => {
    if (token()) {
      try { await laad(); } catch (e) { if (token()) { el.innerHTML = `<p class="err">${esc(foutTekst(e))}</p>`; return; } }
      if (token()) return go('#/leerkracht/' + (sessionStorage.getItem('ib_lk_klas') && klas(sessionStorage.getItem('ib_lk_klas')) ? sessionStorage.getItem('ib_lk_klas') : (L.data.klassen[0] || {}).id || 'nieuw'));
    }
    el.innerHTML = `<div class="login" style="max-width:440px;text-align:left">
      <div class="eyebrow">Voor leerkrachten</div><h1>Aanmelden</h1>
      <form id="in" class="panel" style="margin-top:16px">
        <label class="field"><span>Naam</span><input type="text" id="n" autocomplete="username" required></label>
        <label class="field"><span>Wachtwoord</span><input type="password" id="w" autocomplete="current-password" required></label>
        <p class="err" id="e1"></p><button class="btn" type="submit">Aanmelden</button>
      </form>
      <details style="margin-top:22px"><summary style="cursor:pointer;font-weight:700">Nog geen account? Maak er een met de schoolcode</summary>
      <form id="reg" class="panel" style="margin-top:12px">
        <label class="field"><span>Schoolcode</span><input type="text" id="sc" autocomplete="off" required></label>
        <label class="field"><span>Je naam (zoals collega's je kennen)</span><input type="text" id="rn" autocomplete="username" required maxlength="40"></label>
        <label class="field"><span>Wachtwoord (minstens 6 tekens)</span><input type="password" id="rw" autocomplete="new-password" required minlength="6"></label>
        <p class="err" id="e2"></p><button class="btn" type="submit">Account maken</button>
      </form></details>
    </div>`;
    $('#in').onsubmit = async e => {
      e.preventDefault(); $('#e1').textContent = '';
      try {
        const r = await rpc('ib_lk_aanmelden', { p_naam: $('#n').value, p_wachtwoord: $('#w').value });
        if (!r) { $('#e1').textContent = 'Naam of wachtwoord klopt niet.'; return; }
        store.set('ib_lk_token', r.token); render();
      } catch (er) { $('#e1').textContent = foutTekst(er); }
    };
    $('#reg').onsubmit = async e => {
      e.preventDefault(); $('#e2').textContent = '';
      try {
        const r = await rpc('ib_lk_registreer', { p_schoolcode: $('#sc').value, p_naam: $('#rn').value, p_wachtwoord: $('#rw').value });
        const f = { schoolcode: 'Die schoolcode klopt niet.', naam: 'Kies een naam van 2 tot 40 tekens.', wachtwoord: 'Het wachtwoord moet minstens 6 tekens hebben.', bestaat: 'Die naam bestaat al. Kies een andere of meld je aan.' };
        if (r && r.fout) { $('#e2').textContent = f[r.fout] || r.fout; return; }
        store.set('ib_lk_token', r.token); render();
      } catch (er) { $('#e2').textContent = foutTekst(er); }
    };
  }, { nav: '/leerkracht', titel: 'Leerkracht' });

  // ---------- dashboard ----------
  const TABS = [['leerlingen', 'Leerlingen'], ['kaarten', 'Kaarten aanbrengen'], ['projecten', 'Projecten'], ['overzicht', 'Klasoverzicht'], ['klas', 'Klas en schooljaar']];
  route(/^\/leerkracht\/([\w-]+)(?:\/(\w+))?$/, async (el, [id, tab]) => {
    if (!token()) return go('#/leerkracht');
    if (!L.data) { el.innerHTML = '<p class="muted">Laden…</p>'; await laad(); }
    tab = tab && tab !== 'undefined' ? tab : 'leerlingen';
    const k = klas(id);
    if (k) sessionStorage.setItem('ib_lk_klas', id);
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Leerkracht · ${esc(L.data.naam)}</div><h1>${k ? 'Klas ' + esc(k.naam) : 'Nieuwe klas'}</h1>
        ${k ? `<p>${esc(LJ_NAAM[LJ.indexOf(k.leerjaar)])} · ${k.leerlingen.length} leerlingen · ${new Set([...k.aangebracht, ...k.lancelot]).size} kaarten aangebracht</p>` : ''}</div>
        <button class="btn ghost small" type="button" id="uitlk">Afmelden</button></div>
      <div class="lk-grid">
        <aside><div class="klaslijst">${L.data.klassen.map(x => `<button type="button" aria-pressed="${x.id === id}" data-k="${x.id}">${esc(x.naam)} <small>${LJ_KORT[LJ.indexOf(x.leerjaar)]} · ${x.leerlingen.length}</small></button>`).join('')}
          <button type="button" aria-pressed="${!k}" data-k="nieuw">+ Nieuwe klas</button></div>
          <p class="note" style="margin-top:16px">Leerlingen melden zich aan op deze site: <b>klas</b> kiezen, dan hun <b>naam</b>, dan hun <b>code</b> (kleuters en 1ste leerjaar: hun dier). Of ze scannen hun inlogkaartje.</p></aside>
        <section id="paneel"></section>
      </div>`;
    $('#uitlk').onclick = () => { rpc('ib_lk_afmelden', { p_token: token() }).catch(() => {}); store.set('ib_lk_token', null); L.data = null; go('#/leerkracht'); };
    $$('[data-k]', el).forEach(b => b.onclick = () => go('#/leerkracht/' + b.dataset.k));
    const p = $('#paneel');
    if (!k) return nieuweKlas(p);
    p.innerHTML = `<div class="tabs">${TABS.map(([t, n]) => `<a class="chip" href="#/leerkracht/${id}/${t}" aria-pressed="${t === tab}">${n}</a>`).join('')}</div><div id="inhoud"></div>`;
    const inh = $('#inhoud');
    ({ leerlingen, kaarten: aanbrengen, projecten, overzicht, klas: klasInstellingen }[tab] || leerlingen)(inh, k);
  }, { nav: '/leerkracht', titel: 'Leerkracht' });

  function nieuweKlas(p) {
    p.innerHTML = `<form class="panel" id="nk" style="max-width:480px">
      <h2 style="font-size:22px;margin-bottom:12px">Een klas maken</h2>
      <label class="field"><span>Naam van de klas (bv. 4A, Vlinders, 2de leerjaar)</span><input type="text" id="kn" maxlength="30" required></label>
      <label class="field"><span>Leerjaar</span><select id="kl">${LJ.map((l, i) => `<option value="${l}">${LJ_NAAM[i]}</option>`).join('')}</select></label>
      <p class="err" id="e"></p><button class="btn" type="submit">Klas maken</button></form>`;
    $('#nk').onsubmit = async e => {
      e.preventDefault();
      try { const id = await call('ib_lk_klas', { p_klas: null, p_naam: $('#kn').value, p_leerjaar: $('#kl').value }); await laad(); go('#/leerkracht/' + id); }
      catch (er) { $('#e').textContent = foutTekst(er); }
    };
  }

  // ---------- leerlingen ----------
  function leerlingen(el, k) {
    const kleuter = ['JK', 'K2', 'K3', '1'].includes(k.leerjaar);
    el.innerHTML = `
      <div class="panel">
        <div class="row" style="margin-bottom:12px"><h2 style="font-size:22px">Leerlingen</h2><span class="spacer"></span>
          ${k.leerlingen.length ? `<a class="btn small" href="#/afdruk/login/${k.id}">Inlogkaartjes afdrukken</a>` : ''}</div>
        ${k.leerlingen.length ? `<div class="scroll-x"><table class="tabel"><thead><tr><th>Voornaam</th><th>Code</th><th></th></tr></thead><tbody>
          ${k.leerlingen.map(l => `<tr><td><b>${esc(l.voornaam)}</b></td><td class="code">${codeHTML(l)}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn ghost small" type="button" data-code="${l.id}" data-soort="${l.soort}">Nieuwe code</button>
          <button class="btn ghost small" type="button" data-wissel="${l.id}" data-soort="${l.soort === 'dier' ? 'pin' : 'dier'}">${l.soort === 'dier' ? 'Cijfers' : 'Dier'}</button>
          <button class="btn ghost small" type="button" data-wis="${l.id}" data-naam="${esc(l.voornaam)}">Wissen</button></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">Nog geen leerlingen in deze klas.</p>'}
      </div>
      <form class="panel" id="voeg" style="margin-top:18px">
        <h2 style="font-size:20px;margin-bottom:8px">Voornamen toevoegen</h2>
        <p class="muted" style="margin-top:0;font-size:15px">Eén voornaam per lijn (of gescheiden door komma's). Enkel voornamen, geen achternamen. Elke leerling krijgt vanzelf ${kleuter ? 'een dier' : 'een code van 4 cijfers'}.</p>
        <textarea id="namen" rows="6" placeholder="Amira&#10;Noah&#10;Lotte"></textarea>
        <p class="err" id="e"></p><button class="btn" type="submit">Toevoegen</button>
      </form>`;
    $('#voeg').onsubmit = async e => {
      e.preventDefault();
      const namen = $('#namen').value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      if (!namen.length) return;
      try { const n = await call('ib_lk_leerlingen', { p_klas: k.id, p_namen: namen }); toast(`${n} ${n === 1 ? 'leerling' : 'leerlingen'} toegevoegd`); await laad(); render(); }
      catch (er) { $('#e').textContent = foutTekst(er); }
    };
    $$('[data-code],[data-wissel]', el).forEach(b => b.onclick = async () => {
      try { await call('ib_lk_leerling_code', { p_leerling: b.dataset.code || b.dataset.wissel, p_soort: b.dataset.soort }); await laad(); render(); toast('Nieuwe code gemaakt. Druk een nieuw kaartje af.'); }
      catch (er) { toast(foutTekst(er)); }
    });
    $$('[data-wis]', el).forEach(b => b.onclick = () => bevestig(`${esc(b.dataset.naam)} en alles wat die leerling oefende, wissen?`, 'Wissen', async () => {
      try { await call('ib_lk_leerling_wis', { p_leerling: b.dataset.wis }); await laad(); render(); } catch (er) { toast(foutTekst(er)); }
    }));
  }

  // ---------- kaarten aanbrengen ----------
  const af = { lj: null, vak: '', q: '', klas: null };
  function aanbrengen(el, k) {
    if (af.klas !== k.id) { af.klas = k.id; af.lj = String(LJ.indexOf(k.leerjaar)); af.vak = ''; af.q = ''; }
    const aan = new Set(k.aangebracht), lan = new Set(k.lancelot);
    el.innerHTML = `
      <div class="panel">
        <p class="muted" style="margin-top:0;font-size:15px">Zet een kaart aan zodra je ze in de klas aanbracht: ze komt dan in de woordbib van alle leerlingen van deze klas. Kaarten die in LANcelot aangebracht werden in het ${esc(LJ_NAAM[LJ.indexOf(k.leerjaar)])}, staan er vanzelf bij. Kaarten van vorige leerjaren hebben de leerlingen al.</p>
        <div class="filters">${chipsHTML('lj', [['', 'Alle'], ...LJ.map((l, i) => [String(i), LJ_KORT[i]])], af.lj)}</div>
        <div class="filters">${vakChips(af.vak)}<input type="search" id="q" placeholder="Zoek" value="${esc(af.q)}" aria-label="Zoek"></div>
        <div class="row" style="margin-bottom:8px"><span id="tel" class="muted"></span><span class="spacer"></span>
          <button class="btn ghost small" type="button" id="alles">Alles hieronder aanbrengen</button>
          <button class="btn ghost small" type="button" id="druk">Deze kaarten afdrukken</button></div>
        <div id="lijst"></div>
      </div>`;
    let lijst = [];
    const teken = () => {
      lijst = K.filter(x => (af.lj === '' || x.s === +af.lj || x.t.includes(+af.lj)) && (!af.vak || x.v === af.vak) && zoekMatch(x, af.q));
      $('#tel').textContent = `${lijst.length} kaarten · ${lijst.filter(x => aan.has(x.n) || lan.has(x.n)).length} aangebracht`;
      $('#lijst').innerHTML = lijst.slice(0, 300).map(x => `<div class="lijn ${vak(x).cls}">
        <span class="mini-pic">${x.b ? `<img src="${beeld(x)}" alt="" loading="lazy">` : esc(splits(x.w).kern[0])}</span>
        <span class="t"><b>${esc(x.w)}</b>${lan.has(x.n) ? '<span class="tag-l">LANcelot</span>' : ''}<small>${esc(x.n)} · ${esc(x.u)}</small></span>
        <label class="toggle"><input type="checkbox" data-n="${x.n}"${aan.has(x.n) || lan.has(x.n) ? ' checked' : ''}${lan.has(x.n) ? ' disabled' : ''}> Aangebracht</label></div>`).join('')
        + (lijst.length > 300 ? `<p class="muted">Nog ${lijst.length - 300} kaarten: zoek of filter om ze te zien.</p>` : '');
      $$('[data-n]', el).forEach(c => c.onchange = async () => {
        try { await call('ib_lk_aanbreng', { p_klas: k.id, p_kaarten: [c.dataset.n], p_aan: c.checked }); c.checked ? aan.add(c.dataset.n) : aan.delete(c.dataset.n); k.aangebracht = [...aan]; teken(); }
        catch (er) { c.checked = !c.checked; toast(foutTekst(er)); }
      });
    };
    bindChips(el, 'lj', w => { af.lj = w; teken(); });
    bindChips(el, 'vak', w => { af.vak = w; teken(); });
    $('#q').oninput = e => { af.q = e.target.value.trim(); teken(); };
    $('#alles').onclick = () => {
      const nieuw = lijst.filter(x => !aan.has(x.n) && !lan.has(x.n)).map(x => x.n);
      if (!nieuw.length) return toast('Die zijn al allemaal aangebracht.');
      bevestig(`${nieuw.length} kaarten aanbrengen in klas ${esc(k.naam)}?`, 'Aanbrengen', async () => {
        try { for (let i = 0; i < nieuw.length; i += 400) await call('ib_lk_aanbreng', { p_klas: k.id, p_kaarten: nieuw.slice(i, i + 400), p_aan: true }); nieuw.forEach(n => aan.add(n)); k.aangebracht = [...aan]; teken(); }
        catch (er) { toast(foutTekst(er)); }
      });
    };
    $('#druk').onclick = () => drukKaarten(lijst.map(x => x.n), `Klas ${k.naam}`);
    teken();
  }

  function drukKaarten(nrs, titel) {
    if (!nrs.length) return toast('Geen kaarten om af te drukken.');
    sessionStorage.setItem('ib_druk', JSON.stringify({ nrs: nrs.slice(0, 400), titel }));
    go('#/afdruk/kaarten');
  }

  // ---------- projecten ----------
  function projecten(el, k) {
    el.innerHTML = `
      <div class="panel">
        <div class="row" style="margin-bottom:10px"><h2 style="font-size:22px">Projecten</h2><span class="spacer"></span><button class="btn small" type="button" id="nieuw">Nieuw project</button></div>
        <p class="muted" style="margin-top:0;font-size:15px">Bundel kaarten uit alle vakken en leerjaren rond een project. De leerlingen zien het project en kunnen ermee spelen. Oude projecten blijven bewaard.</p>
        ${k.projecten.length ? k.projecten.map(p => `<div class="lijn st"><span class="mini-pic">${p.kaarten.length}</span><span class="t"><b>${esc(p.naam)}</b><small>${p.kaarten.slice(0, 8).map(n => BY[n] ? esc(BY[n].w) : n).join(', ')}${p.kaarten.length > 8 ? '…' : ''}</small></span>
          <span class="row"><button class="btn ghost small" type="button" data-bew="${p.id}">Bewerken</button><button class="btn ghost small" type="button" data-druk="${p.id}">Afdrukken</button><button class="btn ghost small" type="button" data-wis="${p.id}">Wissen</button></span></div>`).join('')
          : '<p class="note">Nog geen projecten.</p>'}
      </div>`;
    $('#nieuw').onclick = () => bewerkProject(k, null);
    $$('[data-bew]', el).forEach(b => b.onclick = () => bewerkProject(k, k.projecten.find(p => p.id === b.dataset.bew)));
    $$('[data-druk]', el).forEach(b => b.onclick = () => { const p = k.projecten.find(x => x.id === b.dataset.druk); drukKaarten(p.kaarten, p.naam); });
    $$('[data-wis]', el).forEach(b => b.onclick = () => bevestig('Dit project wissen? De kaarten zelf blijven.', 'Wissen', async () => {
      try { await call('ib_lk_project_wis', { p_klas: k.id, p_id: b.dataset.wis }); await laad(); render(); } catch (er) { toast(foutTekst(er)); }
    }));
  }
  function bewerkProject(k, p) {
    const gekozen = new Set(p ? p.kaarten : []);
    dialoog(`<h2 style="font-size:22px;margin-bottom:12px">${p ? 'Project bewerken' : 'Nieuw project'}</h2>
      <label class="field"><span>Naam</span><input type="text" id="pn" maxlength="60" value="${esc(p ? p.naam : '')}" placeholder="bv. Water, De middeleeuwen"></label>
      <label class="field"><span>Kaarten zoeken (alle vakken en leerjaren)</span><input type="search" id="pz" placeholder="Typ een woord, bv. water"></label>
      <div id="pres" style="max-height:220px;overflow:auto"></div>
      <h3 style="font-size:16px;margin:14px 0 6px">In het project (<span id="pt">0</span>)</h3><div class="chips" id="pk"></div>
      <p class="err" id="pe"></p>
      <div class="row"><button class="btn" type="button" id="pb">Bewaren</button><button class="btn ghost" type="button" id="pa">Annuleren</button></div>`, (d, sluit) => {
      const tekenGekozen = () => {
        $('#pt', d).textContent = gekozen.size;
        $('#pk', d).innerHTML = [...gekozen].map(n => `<button type="button" class="chip c-${vak(BY[n]).cls}" aria-pressed="true" data-x="${n}">${esc(BY[n] ? BY[n].w : n)} ✕</button>`).join('');
        $$('[data-x]', d).forEach(b => b.onclick = () => { gekozen.delete(b.dataset.x); tekenGekozen(); zoek(); });
      };
      const zoek = () => {
        const q = $('#pz', d).value.trim();
        const l = q.length < 2 ? [] : K.filter(x => zoekMatch(x, q)).slice(0, 40);
        $('#pres', d).innerHTML = l.map(x => `<div class="lijn ${vak(x).cls}"><span class="mini-pic">${x.b ? `<img src="${beeld(x)}" alt="">` : esc(splits(x.w).kern[0])}</span><span class="t"><b>${esc(x.w)}</b><small>${esc(LJ_KORT[x.s])} · ${esc(x.u)}</small></span>
          <button class="btn ${gekozen.has(x.n) ? 'ghost' : ''} small" type="button" data-p="${x.n}">${gekozen.has(x.n) ? 'Erin' : 'Toevoegen'}</button></div>`).join('');
        $$('[data-p]', d).forEach(b => b.onclick = () => { gekozen.add(b.dataset.p); rel(BY[b.dataset.p]); tekenGekozen(); zoek(); });
      };
      $('#pz', d).oninput = zoek;
      $('#pa', d).onclick = sluit;
      $('#pb', d).onclick = async () => {
        const naam = $('#pn', d).value.trim();
        if (!naam) { $('#pe', d).textContent = 'Geef het project een naam.'; return; }
        try { await call('ib_lk_project', { p_klas: k.id, p_id: p ? p.id : null, p_naam: naam, p_kaarten: [...gekozen] }); sluit(); await laad(); render(); }
        catch (er) { $('#pe', d).textContent = foutTekst(er); }
      };
      tekenGekozen();
    });
  }

  // ---------- klasoverzicht ----------
  async function overzicht(el, k) {
    el.innerHTML = '<div class="panel"><p class="muted">Laden…</p></div>';
    let rijen;
    try { rijen = await call('ib_lk_overzicht', { p_klas: k.id }); } catch (er) { el.innerHTML = `<p class="err">${esc(foutTekst(er))}</p>`; return; }
    const per = {}, perKaart = {};
    rijen.forEach(([lid, nr, doos, j, f, dag]) => {
      const p = per[lid] = per[lid] || { n: 0, ken: 0, j: 0, f: 0, dag: '' };
      p.n++; if (doos >= 4) p.ken++; p.j += j; p.f += f; if (dag > p.dag) p.dag = dag;
      const q = perKaart[nr] = perKaart[nr] || { j: 0, f: 0, ll: 0, zwak: 0 };
      q.j += j; q.f += f; q.ll++; if (doos <= 1) q.zwak++;
    });
    const moeilijk = Object.entries(perKaart).filter(([n, q]) => BY[n] && q.f > 0).sort((a, b) => (b[1].f / (b[1].j + b[1].f)) - (a[1].f / (a[1].j + a[1].f)) || b[1].zwak - a[1].zwak).slice(0, 12);
    const pct = (j, f) => j + f ? Math.round(j / (j + f) * 100) + '%' : '–';
    el.innerHTML = `
      <div class="panel">
        <h2 style="font-size:22px;margin-bottom:10px">Per leerling</h2>
        ${k.leerlingen.length ? `<div class="scroll-x"><table class="tabel"><thead><tr><th>Voornaam</th><th>Kaarten geoefend</th><th>Ik ken het</th><th>Juist</th><th>Laatst</th></tr></thead><tbody>
        ${k.leerlingen.map(l => { const p = per[l.id] || { n: 0, ken: 0, j: 0, f: 0, dag: '' }; return `<tr><td><b>${esc(l.voornaam)}</b></td><td>${p.n}</td><td>${p.ken}</td><td>${pct(p.j, p.f)}</td><td class="muted">${esc(p.dag || 'nog niet')}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="muted">Nog geen leerlingen.</p>'}
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="row"><h2 style="font-size:22px">Moet terugkomen</h2><span class="spacer"></span>${moeilijk.length ? '<button class="btn ghost small" type="button" id="drukm">Afdrukken</button>' : ''}</div>
        <p class="muted" style="margin-top:4px;font-size:15px">De kaarten waar de klas het vaakst over struikelt.</p>
        ${moeilijk.length ? `<div class="grid small">${moeilijk.map(([n, q]) => `<div style="position:relative">${kaartHTML(BY[n], { mini: true })}<span class="status oefen" style="top:-8px;right:-6px">${pct(q.j, q.f)} juist</span></div>`).join('')}</div>` : '<p class="note">Nog niets te zien: de leerlingen hebben nog niet (fout) geoefend.</p>'}
      </div>`;
    const dm = $('#drukm'); if (dm) dm.onclick = () => drukKaarten(moeilijk.map(([n]) => n), 'Moet terugkomen · ' + k.naam);
  }

  // ---------- klas en schooljaar ----------
  function klasInstellingen(el, k) {
    const i = LJ.indexOf(k.leerjaar);
    el.innerHTML = `
      <form class="panel" id="kf" style="max-width:520px">
        <h2 style="font-size:22px;margin-bottom:12px">Klas</h2>
        <label class="field"><span>Naam</span><input type="text" id="kn" value="${esc(k.naam)}" maxlength="30"></label>
        <label class="field"><span>Leerjaar</span><select id="kl">${LJ.map((l, j) => `<option value="${l}"${l === k.leerjaar ? ' selected' : ''}>${LJ_NAAM[j]}</option>`).join('')}</select></label>
        <p class="err" id="e"></p><button class="btn" type="submit">Bewaren</button>
      </form>
      ${i < 8 ? `<div class="panel" style="max-width:520px;margin-top:18px"><h2 style="font-size:20px">Nieuw schooljaar</h2>
        <p class="muted" style="font-size:15px">Op 1 september schuift de klas door naar het ${esc(LJ_NAAM[i + 1])}. De leerlingen houden hun woordbib en alles wat ze oefenden; de kaarten van dit jaar worden "van vroeger".</p>
        <button class="btn" type="button" id="door">Doorschuiven naar het ${esc(LJ_NAAM[i + 1])}</button></div>` : ''}
      <div class="panel" style="max-width:520px;margin-top:18px"><h2 style="font-size:20px">Klas wissen</h2>
        <p class="muted" style="font-size:15px">Wist de klas met alle leerlingen, hun codes en wat ze oefenden.</p>
        <button class="btn danger" type="button" id="wis">Klas wissen</button></div>`;
    $('#kf').onsubmit = async e => {
      e.preventDefault();
      try { await call('ib_lk_klas', { p_klas: k.id, p_naam: $('#kn').value, p_leerjaar: $('#kl').value }); await laad(); render(); toast('Bewaard'); }
      catch (er) { $('#e').textContent = foutTekst(er); }
    };
    const d = $('#door'); if (d) d.onclick = () => bevestig(`Klas ${esc(k.naam)} doorschuiven naar het ${esc(LJ_NAAM[i + 1])}?`, 'Doorschuiven', async () => {
      try { await call('ib_lk_klas', { p_klas: k.id, p_naam: k.naam, p_leerjaar: LJ[i + 1] }); await laad(); render(); toast('Doorgeschoven. Pas eventueel de naam van de klas aan.'); } catch (er) { toast(foutTekst(er)); }
    });
    $('#wis').onclick = () => bevestig(`Klas ${esc(k.naam)} met ${k.leerlingen.length} leerlingen echt wissen? Dit kan niet ongedaan gemaakt worden.`, 'Ja, wissen', async () => {
      try { await call('ib_lk_klas_wis', { p_klas: k.id }); sessionStorage.removeItem('ib_lk_klas'); await laad(); go('#/leerkracht'); } catch (er) { toast(foutTekst(er)); }
    });
  }

  // ---------- afdrukken ----------
  function qr(tekst) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M'); q.addData(tekst); q.make();
    return q.createDataURL(4, 0);
  }
  route(/^\/afdruk\/login\/([\w-]+)$/, async (el, [id]) => {
    if (!token()) return go('#/leerkracht');
    if (!L.data) await laad();
    const k = klas(id); if (!k) return go('#/leerkracht');
    el.innerHTML = `<div class="no-print row" style="margin-bottom:16px"><a class="terug" href="#/leerkracht/${id}">← Terug</a><span class="spacer"></span><button class="btn" type="button" onclick="print()">Afdrukken</button></div>
      <p class="no-print note">Knip de kaartjes uit. De leerling scant de QR-code met een tablet of Chromebook en is meteen aangemeld. Zonder scannen: klas ${esc(k.naam)}, dan de naam, dan de code.</p>
      <div class="druk-login">${k.leerlingen.map(l => `<div class="inlogkaart"><div>
        <div class="eyebrow">In Beeld · klas ${esc(k.naam)}</div><div class="naam">${esc(l.voornaam)}</div>
        ${l.soort === 'dier' ? `<div class="dier">${DIEREN[l.code] || ''}</div><small>Mijn dier: ${esc(l.code)}</small>` : `<div class="code">${esc(l.code)}</div><small>Mijn geheime code</small>`}
        <small>lancelot.network/inbeeld</small></div>
        <img src="${qr(`${basis()}#/qr/${l.id}/${l.code}`)}" alt="QR-code om aan te melden"></div>`).join('')}</div>`;
  }, { titel: 'Inlogkaartjes' });

  route(/^\/afdruk\/kaarten$/, el => {
    const d = JSON.parse(sessionStorage.getItem('ib_druk') || 'null');
    if (!d) return go('#/kaarten');
    const lijst = d.nrs.map(n => BY[n]).filter(Boolean);
    el.innerHTML = `<div class="no-print row" style="margin-bottom:16px"><a class="terug" href="javascript:history.back()">← Terug</a><span class="spacer"></span><span class="muted">${lijst.length} kaarten · ${esc(d.titel || '')} · 4 per A4 (A6)</span><button class="btn" type="button" onclick="print()">Afdrukken</button></div>
      <p class="no-print note">Tip: zet in het afdrukvenster "Achtergrondafbeeldingen" aan, dan komen de kleuren mee. De QR-code opent de kaart op de site.</p>
      <div class="druk-a6">${lijst.map(k => kaartHTML(k, { href: false }).replace(/<\/div>\s*$/, `<img class="qr" src="${qr(basis() + '#/kaart/' + k.n)}" alt=""></div>`)).join('')}</div>`;
  }, { titel: 'Kaarten afdrukken' });
})();
