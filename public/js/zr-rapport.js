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

  // ---------- Rekenen (zr-reken.js) ----------
  const R = window.ZrReken;
  const getal = n => String(Math.round(n * 10) / 10).replace('.', ',');
  function score(o, t) {
    if (t.pct === null) return '—';
    if (o.herleid) return `${getal(t.pct / 100 * o.herleid)}<small>/${o.herleid}</small>`;
    return `${getal(t.p)}<small>/${getal(t.m)}</small>`;
  }
  const voornaam = n => String(n || '').split(' ')[0];
  const metNaam = (t, naam) => String(t || '').replace(/\{naam\}/g, voornaam(naam));
  const alinea = t => esc(t).replace(/\n/g, '<br>');
  const datumTekst = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const kort = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }) : '');
  const KLEUREN = ['#2e86de', '#27ae60', '#e67e22', '#8e44ad', '#c0392b', '#16a085', '#d4a017', '#34495e'];

  // ---------- Grafieken: kleine SVG's, scherp op papier ----------

  // Staafjes per vak: de leerling (kleur) en de klas (grijs).
  function staven(rijen, metKlas) {
    const n = rijen.length;
    const B = 560;
    const H = 150;
    const vak = B / n;
    const bw = Math.min(34, vak / (metKlas ? 2.6 : 1.8));
    const y = p => 120 - p * 1.1;
    let g = '';
    for (const p of [0, 50, 100]) g += `<line x1="0" x2="${B}" y1="${y(p)}" y2="${y(p)}" stroke="#d9dee7" stroke-dasharray="${p ? '3 3' : ''}"/><text x="-4" y="${y(p) + 3}" text-anchor="end" font-size="8" fill="#5b6474">${p}</text>`;
    rijen.forEach((r, i) => {
      const x = i * vak + vak / 2;
      const x1 = metKlas ? x - bw - 1 : x - bw / 2;
      if (r.pct !== null) g += `<rect x="${x1}" y="${y(r.pct)}" width="${bw}" height="${r.pct * 1.1}" rx="2" fill="var(--zr)"/><text x="${x1 + bw / 2}" y="${y(r.pct) - 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#1d2330">${r.pct}</text>`;
      if (metKlas && r.klas !== null) g += `<rect x="${x + 1}" y="${y(r.klas)}" width="${bw}" height="${r.klas * 1.1}" rx="2" fill="#c3cad6"/><text x="${x + 1 + bw / 2}" y="${y(r.klas) - 3}" text-anchor="middle" font-size="8" fill="#5b6474">${r.klas}</text>`;
      g += `<text x="${x}" y="134" text-anchor="middle" font-size="9" fill="#1d2330">${esc(r.icoon || '')} ${esc(r.naam.length > 14 ? `${r.naam.slice(0, 13)}…` : r.naam)}</text>`;
    });
    return `<svg class="zr-grafiek" viewBox="-22 0 ${B + 26} ${H}" role="img" aria-label="Resultaten per vak">${g}</svg>`;
  }

  // Spinnenweb: elk vak een as, de leerling als vlak, de klas als stippellijn.
  function web(rijen, metKlas) {
    const n = rijen.length;
    const c = 110;
    const r0 = 78;
    const pt = (i, p) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [c + Math.cos(a) * r0 * p / 100, c + Math.sin(a) * r0 * p / 100];
    };
    let g = '';
    for (const p of [25, 50, 75, 100]) g += `<polygon points="${rijen.map((_, i) => pt(i, p).join(',')).join(' ')}" fill="none" stroke="#d9dee7"/>`;
    rijen.forEach((r, i) => {
      const [x, y] = pt(i, 100);
      const [tx, ty] = pt(i, 122);
      g += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#d9dee7"/><text x="${tx}" y="${ty + 3}" text-anchor="middle" font-size="9" fill="#1d2330">${esc(r.naam.length > 12 ? `${r.naam.slice(0, 11)}…` : r.naam)}</text>`;
    });
    if (metKlas) g += `<polygon points="${rijen.map((r, i) => pt(i, r.klas || 0).join(',')).join(' ')}" fill="none" stroke="#8a94a6" stroke-dasharray="4 3" stroke-width="1.5"/>`;
    g += `<polygon points="${rijen.map((r, i) => pt(i, r.pct || 0).join(',')).join(' ')}" fill="var(--zr)" fill-opacity=".28" stroke="var(--zr)" stroke-width="2"/>`;
    return `<svg class="zr-web" viewBox="0 0 220 220" role="img" aria-label="Spinnenweb van de vakken">${g}</svg>`;
  }

  // Verloop over de rapporten: het totaal (dik) en elk vak (dun).
  function verloop(punten, lijnen) {
    const n = punten.length;
    const B = 520;
    const x = i => (n === 1 ? B / 2 : 6 + i * (B - 12) / (n - 1));
    const y = p => 110 - p;
    let g = '';
    for (const p of [0, 50, 100]) g += `<line x1="0" x2="${B}" y1="${y(p)}" y2="${y(p)}" stroke="#d9dee7" stroke-dasharray="${p ? '3 3' : ''}"/><text x="-4" y="${y(p) + 3}" text-anchor="end" font-size="8" fill="#5b6474">${p}</text>`;
    punten.forEach((t, i) => { g += `<text x="${x(i)}" y="126" text-anchor="${n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}" font-size="9" fill="#1d2330">${esc(t.length > 16 ? `${t.slice(0, 15)}…` : t)}</text>`; });
    let leg = '';
    lijnen.forEach((l, k) => {
      const kleur = l.dik ? 'var(--zr)' : KLEUREN[k % KLEUREN.length];
      const pts = l.w.map((p, i) => (p === null || p === undefined ? null : [x(i), y(p)])).filter(Boolean);
      if (!pts.length) return;
      g += `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${l.dik ? 3 : 1.5}" ${l.dik ? '' : 'stroke-opacity=".8"'}/>`;
      g += pts.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="${l.dik ? 3.5 : 2.2}" fill="${kleur}"/>`).join('');
      leg += `<span><i style="background:${kleur}"></i>${esc(l.naam)}</span>`;
    });
    return `<svg class="zr-grafiek" viewBox="-22 0 ${B + 26} 134" role="img" aria-label="Verloop over de rapporten">${g}</svg><div class="zr-lijnleg">${leg}</div>`;
  }

  // ---------- Eén blad ----------

  function rijToets(data, o, t, lid, ll, od) {
    const w = R.waarde(data, lid, od);
    const s = w.w === 'A' ? '<em>afwezig</em>' : w.w === 'V' ? '<em>vrijgesteld</em>' : typeof w.w === 'number' ? `${getal(w.w)}<small>/${getal(od.max)}</small>` : '—';
    const k = t.klastoets ? R.klasToets(data, od) : null;
    const not = t.notities && ll.n && ll.n[od.id] ? `<span class="zr-notitie">💬 ${esc(metNaam(ll.n[od.id], ''))}</span>` : '';
    return `<tr><td>${esc(od.naam)}${t.inhoud && od.inhoud ? `<span class="zr-inhoud">${esc(od.inhoud)}</span>` : ''}${not}</td>
      ${t.datums ? `<td class="zr-d">${od.datum ? kort(od.datum) : ''}</td>` : ''}${t.klastoets ? `<td class="zr-k">${k ? `klas ${getal(k.gem)}` : ''}</td>` : ''}<td class="zr-n">${s}</td></tr>`;
  }

  function blad(data, o, lid) {
    const r = data.rapport;
    const l = data.klas.leerlingen.find(x => x.id === lid) || { id: lid, naam: 'Leerling', niveau: 'schildknaap', vakNiveaus: {} };
    const ll = r.leerlingen[lid] || { p: {}, s: {}, c: {}, n: {}, alg: '', ra: '', afw: { g: 0, o: 0 } };
    const t = o.toon || {};
    const hist = data.historie || [];
    const vorige = hist.length ? hist[hist.length - 1].per[lid] : null;
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
    const inleiding = t.inleiding && r.boodschap ? `<p class="zr-boodschap">${alinea(metNaam(r.boodschap, l.naam))}</p>` : '';

    const metPuntenVakken = r.vakken.filter(v => v.punten && R.totaal(data, lid, v).pct !== null);
    const rijen = metPuntenVakken.map(v => ({ naam: v.naam, icoon: v.icoon, pct: R.totaal(data, lid, v).pct, klas: R.klasVak(data, v) }));
    const eind = R.eind(data, lid);
    const klasEind = R.klasEind(data);

    const vakken = r.vakken.map(v => {
      const tt = R.totaal(data, lid, v);
      const sym = t.symbool && ll.s[v.id] ? symbool(o, ll.s[v.id], o.set !== 'woorden') : '';
      const com = t.commentaar && ll.c[v.id] ? `<p class="zr-com">${alinea(metNaam(ll.c[v.id], l.naam))}</p>` : '';
      const metPunten = v.punten && v.onderdelen.length && tt.pct !== null;
      if (!metPunten && !sym && !com) return '';
      const niveau = t.niveau && GROEP[v.id] ? (l.vakNiveaus[GROEP[v.id]] || l.niveau || 'schildknaap') : '';
      let tabel = '';
      if (metPunten && t.onderdelen) {
        const groepen = t.domeinen && v.domeinen.length ? [...v.domeinen.map(d => ({ d, lijst: R.vanDomein(v, d.id) })), { d: null, lijst: R.vanDomein(v, '') }].filter(x => x.lijst.length) : [{ d: null, lijst: v.onderdelen }];
        const kol = 2 + (t.datums ? 1 : 0) + (t.klastoets ? 1 : 0);
        tabel = `<table class="zr-tabel">${groepen.map(({ d, lijst }) => {
          let kopRij = '';
          if (d || groepen.length > 1) {
            const dt = R.som(data, lid, lijst);
            kopRij = `<tr class="zr-dom"><td colspan="${kol - 1}">${esc(d ? d.naam : 'Andere')}${d && d.gewicht && t.procent ? ` <small>(${d.gewicht}%)</small>` : ''}</td><td class="zr-n">${dt.pct === null ? '—' : `${t.procent ? `${dt.pct}%` : `${getal(dt.p)}<small>/${getal(dt.m)}</small>`}`}</td></tr>`;
          }
          return kopRij + lijst.map(od => rijToets(data, o, t, lid, ll, od)).join('');
        }).join('')}</table>`;
      }
      const gem = t.gemiddelde && metPunten ? R.klasVak(data, v) : null;
      const oud = vorige && vorige[v.naam.toLowerCase()];
      const evo = t.evolutie && metPunten && oud !== undefined ? tt.pct - oud : null;
      const tot = metPunten && t.totaal ? `<div class="zr-tot"><span>Totaal</span><b>${score(o, tt)}</b>${t.procent ? `<span class="zr-pct">${tt.pct}%</span>` : ''}
        ${evo !== null ? `<span class="zr-evo ${evo > 2 ? 'op' : evo < -2 ? 'neer' : ''}" title="Vorig rapport: ${oud}%">${evo > 2 ? '▲' : evo < -2 ? '▼' : '='}</span>` : ''}</div>` : '';
      const balk = metPunten && t.balkjes ? `<div class="zr-balk"><i style="width:${Math.max(0, Math.min(100, tt.pct))}%"></i>${gem !== null ? `<b style="left:${gem}%" title="Klasgemiddelde ${gem}%"></b>` : ''}</div>
        ${gem !== null ? `<span class="zr-klein zr-gem">┃ klasgemiddelde ${gem}%</span>` : ''}` : '';
      return `<section class="zr-vak">
        <div class="zr-vak-kop"><span class="zr-icoon">${esc(v.icoon || '📘')}</span><h2>${esc(v.naam)}</h2>${niveau ? `<span class="zr-niveau">${NIVEAUS[niveau] || ''}</span>` : ''}${sym ? `<span class="zr-vak-sym">${sym}</span>` : ''}</div>
        ${tabel}${tot}${balk}${com}</section>`;
    }).join('');

    const eindBlok = t.eindtotaal && eind !== null ? `<section class="zr-eind"><span>Totaal van alle vakken</span><b>${o.herleid ? `${getal(eind / 100 * o.herleid)}<small>/${o.herleid}</small>` : `${eind}%`}</b>
      ${t.gemiddelde && klasEind !== null ? `<span class="zr-klein">klasgemiddelde ${o.herleid ? `${getal(klasEind / 100 * o.herleid)}/${o.herleid}` : `${klasEind}%`}</span>` : ''}</section>` : '';
    let grafieken = '';
    if (rijen.length && (t.grafiek || (t.spinnenweb && rijen.length >= 3) || (t.verloop && hist.length))) {
      const delen = [];
      if (t.grafiek) delen.push(`<div class="zr-graf-deel"><h3>Mijn resultaten per vak</h3>${staven(rijen, t.gemiddelde)}${t.gemiddelde ? '<div class="zr-lijnleg"><span><i style="background:var(--zr)"></i>Ik</span><span><i style="background:#c3cad6"></i>De klas</span></div>' : ''}</div>`);
      if (t.spinnenweb && rijen.length >= 3) delen.push(`<div class="zr-graf-deel zr-graf-web"><h3>Mijn sterke kanten</h3>${web(rijen, t.gemiddelde)}</div>`);
      if (t.verloop && hist.length) {
        const titels = [...hist.map(h => h.titel), r.titel];
        const lijnen = [{ naam: 'Totaal', dik: true, w: [...hist.map(h => (h.per[lid] ? h.per[lid]._eind : null)), eind] },
          ...metPuntenVakken.map(v => ({ naam: v.naam, w: [...hist.map(h => (h.per[lid] ? h.per[lid][v.naam.toLowerCase()] : null)), R.totaal(data, lid, v).pct] }))];
        delen.push(`<div class="zr-graf-deel zr-graf-breed"><h3>Zo groei ik</h3>${verloop(titels, lijnen)}</div>`);
      }
      grafieken = `<section class="zr-blok zr-grafieken">${delen.join('')}</section>`;
    }

    const att = t.attitudes && r.attitudes.length && r.attitudes.some(a => ll.s[`a-${a.id}`]) ? `<section class="zr-blok zr-att"><h2>Hoe werk ik? Hoe ben ik?</h2><table class="zr-tabel">
      ${r.attitudes.map(a => `<tr><td>${esc(a.tekst)}</td><td class="zr-n">${symbool(o, ll.s[`a-${a.id}`], false) || '—'}</td></tr>`).join('')}</table></section>` : '';
    const afw = t.afwezig && (ll.afw.g || ll.afw.o) ? `<p class="zr-afw"><b>Afwezig:</b> ${getal(ll.afw.g + ll.afw.o)} halve dag${ll.afw.g + ll.afw.o === 1 ? '' : 'en'}${ll.afw.o ? ` (waarvan ${getal(ll.afw.o)} zonder wettiging)` : ''}</p>` : '';
    const ra = t.aanpassingen && ll.ra ? `<section class="zr-blok zr-ra"><h2>Redelijke aanpassingen</h2><p>${alinea(metNaam(ll.ra, l.naam))}</p></section>` : '';
    const alg = t.algemeen && ll.alg ? `<section class="zr-blok zr-alg"><h2>Een woordje van je leerkracht</h2><p>${alinea(metNaam(ll.alg, l.naam))}</p></section>` : '';
    const leg = t.legenda && (t.symbool || t.attitudes) ? `<div class="zr-legenda">${SYMBOLEN.map(s => `<span>${symbool(o, s, o.set !== 'woorden')}</span>`).join('')}</div>` : '';
    const hand = t.handtekening ? `<div class="zr-hand"><div><span>Leerkracht</span>${o.leerkracht ? `<small>${esc(o.leerkracht)}</small>` : ''}</div><div><span>Directie</span>${o.directie ? `<small>${esc(o.directie)}</small>` : ''}</div><div><span>Ouders</span></div></div>` : '';
    const strook = t.strookje ? `<div class="zr-strook"><span class="zr-schaar">✂</span><p><b>Strookje terug naar school</b> · ${esc(r.titel)} van <b>${esc(l.naam)}</b></p>
      <p>Gezien door de ouders op ......../......../........</p><p class="zr-lijn">Opmerking:</p><p class="zr-lijn"></p><p>Handtekening:</p></div>` : '';
    return `<article class="zr-blad zr-${esc(o.sjabloon || 'perkament')}" style="--zr:${esc(o.kleur || '#1f4e8c')}">
      ${kop}${inleiding}${grafieken}<div class="zr-vakken">${vakken || '<p class="zr-klein">Nog geen punten of symbolen.</p>'}</div>${eindBlok}${att}${afw}${ra}${alg}${leg}${hand}${strook}
      ${r.datum ? `<p class="zr-datum">${datumTekst(r.datum)}</p>` : ''}</article>`;
  }

  // ---------- Klasoverzicht: alle leerlingen x alle vakken, met het klasgemiddelde ----------

  function klas(data, o) {
    const r = data.rapport;
    const vakken = r.vakken.filter(v => v.punten && v.onderdelen.length);
    const kleur = p => (p === null ? '' : p < 50 ? 'zr-rood' : p < 65 ? 'zr-oranje' : '');
    const rijen = data.klas.leerlingen.map(l => {
      const e = R.eind(data, l.id);
      return `<tr><td>${esc(l.naam)}</td>${vakken.map(v => { const p = R.totaal(data, l.id, v).pct; return `<td class="zr-n ${kleur(p)}">${p === null ? '—' : `${p}%`}</td>`; }).join('')}<td class="zr-n zr-vet ${kleur(e)}">${e === null ? '—' : `${e}%`}</td></tr>`;
    }).join('');
    const gem = `<tr class="zr-dom"><td>Klasgemiddelde</td>${vakken.map(v => `<td class="zr-n">${R.klasVak(data, v) ?? '—'}%</td>`).join('')}<td class="zr-n">${R.klasEind(data) ?? '—'}%</td></tr>`;
    const grafiek = vakken.length ? staven(vakken.map(v => ({ naam: v.naam, icoon: v.icoon, pct: R.klasVak(data, v), klas: null })), false) : '';
    const toetsen = vakken.map(v => `<tr class="zr-dom"><td colspan="4">${esc(v.icoon || '')} ${esc(v.naam)}</td></tr>${v.onderdelen.map(od => {
      const k = R.klasToets(data, od);
      return `<tr><td>${esc(od.naam)}${od.datum ? ` <small class="zr-klein">${kort(od.datum)}</small>` : ''}</td><td class="zr-n">${k ? `${getal(k.gem)}<small>/${getal(od.max)}</small>` : '—'}</td><td class="zr-n zr-klein">${k ? `${getal(k.min)} – ${getal(k.max)}` : ''}</td><td class="zr-n zr-klein">${k ? k.n : 0} lln</td></tr>`;
    }).join('')}`).join('');
    return `<article class="zr-blad zr-strak zr-klasblad" style="--zr:${esc(o.kleur || '#1f4e8c')}">
      <header class="zr-kop">${o.logo ? `<img class="zr-logo" src="${o.logo}" alt="">` : ''}<div class="zr-school"><strong>Klasoverzicht</strong><span>${esc(data.klas.naam || '')} · ${esc(o.schooljaar || '')}</span></div>
        <div class="zr-titel"><h1>${esc(r.titel)}</h1><span class="zr-klein">${r.van ? `${datumTekst(r.van)} – ${datumTekst(r.tot)}` : ''}</span></div></header>
      <section class="zr-blok"><h2>Klasgemiddelde per vak</h2>${grafiek}</section>
      <section class="zr-blok"><table class="zr-tabel zr-klastabel"><tr class="zr-kopr"><td>Leerling</td>${vakken.map(v => `<td class="zr-n">${esc(v.icoon || '')} ${esc(v.naam)}</td>`).join('')}<td class="zr-n">Totaal</td></tr>${rijen}${gem}</table></section>
      <section class="zr-blok"><h2>Per toets</h2><table class="zr-tabel">${toetsen}</table></section></article>`;
  }

  window.Zegelrol = { blad, klas, symbool, totaal: R.totaal, waarde: R.waarde, labelVan, SYMBOLEN, LABELS, kort, esc, metNaam, getal };
})();
