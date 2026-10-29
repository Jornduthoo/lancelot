// De Zegelrol: één rapportblad tekenen (voor het voorbeeld in de editor en om af te drukken).
// Zegelrol.blad(data, opmaak, leerlingId) geeft de HTML van een A4-blad. data = wat 'zr-laad' teruggeeft.
// Punten: een eigen getal van de leerkracht gaat voor, anders de punten uit De Proef. 'A' = afwezig, 'V' = vrijgesteld.
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SYMBOLEN = ['kroon', 'duim', 'vinkje', 'plant'];
  const LABELS = {
    ridder: { kroon: 'Schitterend', duim: 'Goed bezig', vinkje: 'In orde', plant: 'Ik groei nog' },
    smileys: { kroon: 'Schitterend', duim: 'Goed bezig', vinkje: 'In orde', plant: 'Ik groei nog' },
    sterren: { kroon: 'Schitterend', duim: 'Goed bezig', vinkje: 'In orde', plant: 'Ik groei nog' },
    woorden: { kroon: 'Zeer goed', duim: 'Goed', vinkje: 'Voldoende', plant: 'Nog oefenen' },
  };
  const NIVEAUS = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };
  const GROEP = { wiskunde: 'wiskunde', nederlands: 'nederlands', frans: 'frans', wo: 'wo' };

  // ---------- De symbolen: kleine tekeningen, scherp op papier ----------
  const svg = (inhoud, kleur) => `<svg viewBox="0 0 24 24" class="zr-sym" aria-hidden="true" style="--s:${kleur}">${inhoud}</svg>`;
  const STER = 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z';
  const TEKEN = {
    ridder: {
      kroon: () => svg('<path d="M3 18h18l-1.2-10-4.6 4L12 5l-3.2 7-4.6-4z" fill="var(--s)"/><rect x="3" y="18.5" width="18" height="2.5" rx=".8" fill="var(--s)"/><circle cx="12" cy="4.2" r="1.4" fill="var(--s)"/>', '#d4a017'),
      duim: () => svg('<path d="M7 10h-3v11h3zM8.5 21h8.2c1 0 1.8-.7 2-1.6l1.5-6.6c.3-1.2-.7-2.3-1.9-2.3h-4.8l.8-4c.2-1.1-.7-2.1-1.8-2l-.5.1-3.5 5.6z" fill="var(--s)"/>', '#2e86de'),
      vinkje: () => svg('<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="var(--s)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>', '#27ae60'),
      plant: () => svg('<path d="M12 21v-8" stroke="#6b8e23" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13c0-4 2.5-6.5 7-7 0 4.5-3 7-7 7z" fill="var(--s)"/><path d="M12 15c0-3-2-5-6-5.5 0 3.5 2.5 5.5 6 5.5z" fill="var(--s)"/><path d="M7.5 21h9" stroke="#8d6e63" stroke-width="2.2" stroke-linecap="round"/>', '#7cb342'),
    },
    smileys: Object.fromEntries([['kroon', 'M7.5 13.5c1.2 3 7.8 3 9 0', '#d4a017'], ['duim', 'M8 14.5c1.5 1.8 6.5 1.8 8 0', '#2e86de'], ['vinkje', 'M8 15h8', '#27ae60'], ['plant', 'M8 16.5c1.5-1.8 6.5-1.8 8 0', '#e67e22']]
      .map(([k, mond, kleur]) => [k, () => svg(`<circle cx="12" cy="12" r="9.5" fill="var(--s)"/><circle cx="8.7" cy="9.7" r="1.3" fill="#fff"/><circle cx="15.3" cy="9.7" r="1.3" fill="#fff"/><path d="${mond}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`, kleur)])),
    sterren: Object.fromEntries([['kroon', 3], ['duim', 2], ['vinkje', 1], ['plant', 0]].map(([k, n]) => [k, () => `<span class="zr-sterren">${[0, 1, 2].map(i => `<svg viewBox="0 0 24 24" class="zr-sym klein" aria-hidden="true"><path d="${STER}" fill="${i < n ? '#f1c40f' : 'none'}" stroke="#c9a400" stroke-width="1.4"/></svg>`).join('')}</span>`])),
    woorden: Object.fromEntries(SYMBOLEN.map(k => [k, l => `<span class="zr-woord zr-w-${k}">${esc(l)}</span>`])),
  };
  const labelVan = (o, s) => (o.labels && o.labels[s]) || LABELS[o.set || 'ridder'][s];
  function symbool(o, s, metLabel) {
    if (!SYMBOLEN.includes(s)) return '';
    const set = TEKEN[o.set] ? o.set : 'ridder';
    const l = labelVan(o, s);
    if (set === 'woorden') return TEKEN.woorden[s](l);
    return `<span class="zr-symbool" title="${esc(l)}">${TEKEN[set][s]()}${metLabel ? `<span>${esc(l)}</span>` : ''}</span>`;
  }

  // ---------- Rekenen ----------
  function waarde(data, lid, o) {
    const eigen = data.rapport.leerlingen[lid] && data.rapport.leerlingen[lid].p[o.id];
    if (eigen !== undefined) return { w: eigen, eigen: true };
    const a = o.toets && data.auto[o.id] && data.auto[o.id].punten[lid];
    if (a) return { w: a.p, open: a.open > 0, auto: true };
    return { w: null };
  }
  function totaal(data, lid, vak) {
    let p = 0;
    let m = 0;
    let open = false;
    for (const o of vak.onderdelen) {
      const v = waarde(data, lid, o);
      if (typeof v.w === 'number') { p += v.w; m += o.max; }
      if (v.open) open = true;
    }
    return { p: Math.round(p * 10) / 10, m, pct: m ? Math.round(p / m * 100) : null, open };
  }
  function gemiddelde(data, vak) {
    const pcts = data.klas.leerlingen.map(l => totaal(data, l.id, vak).pct).filter(x => x !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }
  const getal = n => String(Math.round(n * 10) / 10).replace('.', ',');
  function score(o, t) {
    if (t.pct === null) return '—';
    if (o.herleid) return `${getal(t.p / t.m * o.herleid)}<small>/${o.herleid}</small>`;
    return `${getal(t.p)}<small>/${getal(t.m)}</small>`;
  }
  const voornaam = n => String(n || '').split(' ')[0];
  const metNaam = (t, naam) => String(t || '').replace(/\{naam\}/g, voornaam(naam));
  const alinea = t => esc(t).replace(/\n/g, '<br>');
  const datumTekst = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const kort = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }) : '');

  // ---------- Eén blad ----------
  function blad(data, o, lid) {
    const r = data.rapport;
    const l = data.klas.leerlingen.find(x => x.id === lid) || { id: lid, naam: 'Leerling', niveau: 'schildknaap', vakNiveaus: {} };
    const ll = r.leerlingen[lid] || { p: {}, s: {}, c: {}, alg: '', afw: { g: 0, o: 0 } };
    const t = o.toon || {};
    const vorige = data.vorige && data.vorige.per[lid];
    const kop = `
      <header class="zr-kop">
        ${o.logo ? `<img class="zr-logo" src="${o.logo}" alt="">` : ''}
        <div class="zr-school">${o.school ? `<strong>${esc(o.school)}</strong>` : ''}${o.adres ? `<span>${esc(o.adres)}</span>` : ''}</div>
        <div class="zr-titel"><span class="zr-klein">Rapport · ${esc(o.schooljaar || '')}</span><h1>${esc(r.titel)}</h1>
          <span class="zr-klein">${r.van ? `${datumTekst(r.van)} – ${datumTekst(r.tot)}` : ''}</span></div>
        ${t.zegel ? `<div class="zr-zegel" aria-hidden="true"><span>${esc(voornaam(l.naam).slice(0, 1).toUpperCase())}</span></div>` : ''}
      </header>
      <div class="zr-wie"><div><span class="zr-klein">Naam</span><strong>${esc(l.naam)}</strong></div>
        <div><span class="zr-klein">Klas</span><strong>${esc(data.klas.naam || `${data.klas.leerjaar}e leerjaar`)}</strong></div>
        ${o.leerkracht ? `<div><span class="zr-klein">Leerkracht</span><strong>${esc(o.leerkracht)}</strong></div>` : ''}</div>`;

    const vakken = r.vakken.map(v => {
      const tt = totaal(data, lid, v);
      const sym = t.symbool && ll.s[v.id] ? symbool(o, ll.s[v.id], o.set !== 'woorden') : '';
      const com = t.commentaar && ll.c[v.id] ? `<p class="zr-com">${alinea(metNaam(ll.c[v.id], l.naam))}</p>` : '';
      const metPunten = v.punten && v.onderdelen.length && tt.pct !== null;
      if (!metPunten && !sym && !com) return '';
      const niveau = t.niveau && GROEP[v.id] ? (l.vakNiveaus[GROEP[v.id]] || l.niveau || 'schildknaap') : '';
      const rijen = metPunten && t.onderdelen ? v.onderdelen.map(od => {
        const w = waarde(data, lid, od);
        const s = w.w === 'A' ? '<em>afwezig</em>' : w.w === 'V' ? '<em>vrijgesteld</em>' : typeof w.w === 'number' ? `${getal(w.w)}<small>/${getal(od.max)}</small>` : '—';
        return `<tr><td>${esc(od.naam)}${t.inhoud && od.inhoud ? `<span class="zr-inhoud">${esc(od.inhoud)}</span>` : ''}</td><td class="zr-n">${s}</td></tr>`;
      }).join('') : '';
      const gem = t.gemiddelde && metPunten ? gemiddelde(data, v) : null;
      const evo = t.evolutie && metPunten && vorige && vorige[v.naam.toLowerCase()] !== undefined ? tt.pct - vorige[v.naam.toLowerCase()] : null;
      const tot = metPunten && t.totaal ? `<div class="zr-tot"><span>Totaal</span><b>${score(o, tt)}</b>${t.procent ? `<span class="zr-pct">${tt.pct}%</span>` : ''}
        ${evo !== null ? `<span class="zr-evo ${evo > 2 ? 'op' : evo < -2 ? 'neer' : ''}" title="Vorig rapport: ${vorige[v.naam.toLowerCase()]}%">${evo > 2 ? '▲' : evo < -2 ? '▼' : '='}</span>` : ''}</div>` : '';
      const balk = metPunten && t.balkjes ? `<div class="zr-balk"><i style="width:${Math.max(0, Math.min(100, tt.pct))}%"></i>${gem !== null ? `<b style="left:${gem}%" title="Klasgemiddelde ${gem}%"></b>` : ''}</div>
        ${gem !== null ? `<span class="zr-klein zr-gem">┃ klasgemiddelde ${gem}%</span>` : ''}` : '';
      return `<section class="zr-vak">
        <div class="zr-vak-kop"><span class="zr-icoon">${esc(v.icoon || '📘')}</span><h2>${esc(v.naam)}</h2>${niveau ? `<span class="zr-niveau">${NIVEAUS[niveau] || ''}</span>` : ''}${sym ? `<span class="zr-vak-sym">${sym}</span>` : ''}</div>
        ${rijen ? `<table class="zr-tabel">${rijen}</table>` : ''}${tot}${balk}${com}</section>`;
    }).join('');

    const att = t.attitudes && r.attitudes.length && r.attitudes.some(a => ll.s[`a-${a.id}`]) ? `<section class="zr-blok zr-att"><h2>Hoe werk ik? Hoe ben ik?</h2><table class="zr-tabel">
      ${r.attitudes.map(a => `<tr><td>${esc(a.tekst)}</td><td class="zr-n">${symbool(o, ll.s[`a-${a.id}`], false) || '—'}</td></tr>`).join('')}</table></section>` : '';
    const afw = t.afwezig && (ll.afw.g || ll.afw.o) ? `<p class="zr-afw"><b>Afwezig:</b> ${getal(ll.afw.g + ll.afw.o)} halve dag${ll.afw.g + ll.afw.o === 1 ? '' : 'en'}${ll.afw.o ? ` (waarvan ${getal(ll.afw.o)} zonder wettiging)` : ''}</p>` : '';
    const alg = t.algemeen && ll.alg ? `<section class="zr-blok zr-alg"><h2>Een woordje van je leerkracht</h2><p>${alinea(metNaam(ll.alg, l.naam))}</p></section>` : '';
    const bood = r.boodschap ? `<p class="zr-boodschap">${alinea(metNaam(r.boodschap, l.naam))}</p>` : '';
    const leg = t.legenda && (t.symbool || t.attitudes) ? `<div class="zr-legenda">${SYMBOLEN.map(s => `<span>${symbool(o, s, o.set !== 'woorden')}</span>`).join('')}</div>` : '';
    const hand = t.handtekening ? `<div class="zr-hand"><div><span>Leerkracht</span>${o.leerkracht ? `<small>${esc(o.leerkracht)}</small>` : ''}</div><div><span>Directie</span>${o.directie ? `<small>${esc(o.directie)}</small>` : ''}</div><div><span>Ouders</span></div></div>` : '';
    const strook = t.strookje ? `<div class="zr-strook"><span class="zr-schaar">✂</span><p><b>Strookje terug naar school</b> · ${esc(r.titel)} van <b>${esc(l.naam)}</b></p>
      <p>Gezien door de ouders op ......../......../........</p><p class="zr-lijn">Opmerking:</p><p class="zr-lijn"></p><p>Handtekening:</p></div>` : '';
    return `<article class="zr-blad zr-${esc(o.sjabloon || 'perkament')}" style="--zr:${esc(o.kleur || '#1f4e8c')}">
      ${kop}<div class="zr-vakken">${vakken || '<p class="zr-klein">Nog geen punten of symbolen.</p>'}</div>${att}${afw}${alg}${bood}${leg}${hand}${strook}
      ${r.datum ? `<p class="zr-datum">${datumTekst(r.datum)}</p>` : ''}</article>`;
  }

  window.Zegelrol = { blad, symbool, totaal, waarde, gemiddelde, labelVan, SYMBOLEN, LABELS, kort, esc, metNaam };
})();
