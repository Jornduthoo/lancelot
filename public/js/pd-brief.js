// De Postduif: één brief voor thuis tekenen (A4), of dezelfde brief als gewone tekst om in een bericht te plakken.
// Gebruikt door postduif.html (voorbeeld) en postduif-print.html (afdrukken of bewaren als PDF).
// res: wat de server stuurt bij pd-laad ({ brief, klas, leerlingen }). Het blad heeft vaste kleuren (papier).
(() => {
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nl = n => String(n).replace('.', ',');
  const datum = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' }) : '');
  const kort = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }) : '');
  const periode = b => (b.van && b.tot ? (b.van === b.tot ? datum(b.van) : `${datum(b.van)} tot ${datum(b.tot)}`) : '');
  const voornaam = naam => String(naam || '').split(' ')[0];
  const woordjeVan = (b, l) => String(b.woordje[l.id] || '').replace(/\{naam\}/g, voornaam(l.naam));
  const paras = text => String(text || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const kleur = p => (p >= 80 ? '#2e8b57' : p >= 60 ? '#c9a227' : '#d9822b');

  // Het zegel bovenaan: een postduif met een brief, getekend in SVG (geen extra afbeelding nodig).
  const ZEGEL = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#1f4e8c"/><circle cx="32" cy="32" r="26" fill="none" stroke="#e8c45a" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M14 36c6-1 10-6 16-6 4 0 6 2 10 2l8-6-2 8c2 2 2 6-2 9-5 4-14 4-20 1-4-2-7-5-10-8z" fill="#fff"/><path d="M30 30c-2-7 2-13 10-15-1 6-3 11-10 15z" fill="#dfe8f5"/>
    <circle cx="44" cy="30" r="1.4" fill="#1f4e8c"/><path d="M48 31l5 1-5 2z" fill="#e8c45a"/><rect x="22" y="40" width="12" height="8" rx="1" fill="#e8c45a" transform="rotate(-8 28 44)"/><path d="M22.6 41.2l5.6 3.6 5.2-4.6" fill="none" stroke="#1f4e8c" stroke-width="1.2" transform="rotate(-8 28 44)"/></svg>`;

  function toetsenHtml(b, l) {
    if (!b.toon.toetsen) return '';
    if (!l.toetsen.length) return '';
    const rijen = l.toetsen.map(t => {
      const gem = b.toon.gemiddelde && t.klas !== null ? `<i class="pd-gem" style="left:${t.klas}%" title="Klasgemiddelde"></i>` : '';
      return `<tr><td><strong>${esc(t.titel)}</strong><span>${kort(t.datum)}${t.open ? ' · nog niet helemaal verbeterd' : ''}</span></td>
        <td class="pd-pt">${nl(t.punten)} / ${nl(t.max)}</td>
        <td class="pd-meter-cel"><div class="pd-meter"><b style="width:${t.pct}%;background:${kleur(t.pct)}"></b>${gem}</div><span>${t.pct}%${b.toon.gemiddelde && t.klas !== null ? ` · klas ${t.klas}%` : ''}</span></td></tr>`;
    }).join('');
    return `<section class="pd-deel"><h2>📝 Toetsen</h2><table class="pd-toetsen">${rijen}</table>
      ${b.toon.verbeterd ? '<p class="pd-klein">De verbeterde toets zit achter deze brief.</p>' : ''}</section>`;
  }

  function doelenHtml(b, l) {
    const o = l.oefenen;
    if (!b.toon.doelen || !o || (!o.lukt.length && !o.oefen.length)) return '';
    const lijst = items => `<ul>${items.map(d => `<li>${esc(d.tekst)}${d.vak ? ` <span>${esc(d.vak)}</span>` : ''}</li>`).join('')}</ul>`;
    return `<section class="pd-deel pd-twee">
      ${o.lukt.length ? `<div><h2>⭐ Dit lukt al goed</h2>${lijst(o.lukt)}</div>` : ''}
      ${o.oefen.length ? `<div><h2>🌱 Hier oefenen we nog op</h2>${lijst(o.oefen)}<p class="pd-klein">Thuis even samen oefenen helpt!</p></div>` : ''}
    </section>`;
  }

  function klasHtml(b, l) {
    const o = l.oefenen;
    const e = l.eer;
    const blokjes = [];
    if (b.toon.oefenen && o && o.vragen) blokjes.push(`<div><b>${o.dagen}</b><span>dag${o.dagen === 1 ? '' : 'en'} meegedaan</span></div>`, `<div><b>${o.vragen}</b><span>vragen geoefend</span></div>`, `<div><b>${o.pct}%</b><span>juist</span></div>`);
    if (b.toon.eer && e && e.eer) blokjes.push(`<div><b>${e.eer}</b><span>Eer verdiend</span></div>`);
    const compl = b.toon.eer && e && e.complimenten.length ? `<p class="pd-compl">${e.complimenten.map(c => `<span>👏 ${esc(c)}</span>`).join('')}</p>` : '';
    const rang = b.toon.eer && e ? `<p class="pd-klein">In onze klas bouwt elke leerling een eigen burcht met Eer, verdiend door in te zetten en te groeien. ${esc(voornaam(l.naam))} is nu <strong>${esc(e.rang)}</strong>${e.groei ? `, en deed het ${e.groei}× beter dan de keren ervoor` : ''}.</p>` : '';
    if (!blokjes.length && !compl && !rang) return '';
    return `<section class="pd-deel"><h2>🏰 In de klas</h2>${blokjes.length ? `<div class="pd-cijfers">${blokjes.join('')}</div>` : ''}${compl}${rang}</section>`;
  }

  function nieuwsHtml(b) {
    if (!b.toon.nieuws || (!b.nieuws && !b.fotos.length)) return '';
    return `<section class="pd-deel pd-nieuws"><h2>📣 Nieuws uit de klas</h2>${paras(b.nieuws)}
      ${b.fotos.length ? `<div class="pd-fotos n${b.fotos.length}">${b.fotos.map(f => `<img src="${esc(f)}" alt="">`).join('')}</div>` : ''}</section>`;
  }

  function blad(res, lid) {
    const b = res.brief;
    const l = res.leerlingen.find(x => x.id === lid);
    if (!l) return '';
    const woordje = woordjeVan(b, l);
    const klas = [res.klas.naam, res.klas.leerjaar ? `${res.klas.leerjaar}e leerjaar` : ''].filter(Boolean).join(' · ');
    const inhoud = [toetsenHtml(b, l), doelenHtml(b, l), klasHtml(b, l), nieuwsHtml(b)].join('');
    return `<article class="pd-blad">
      <header class="pd-kop">${ZEGEL}<div><p class="pd-klein">${esc(klas)}${klas ? ' · ' : ''}${esc(periode(b))}</p><h1>Brief voor thuis</h1><p class="pd-naam">${esc(l.naam)}</p></div></header>
      ${woordje ? `<section class="pd-woordje">${paras(woordje)}<p class="pd-afz">${esc(b.afzender || 'Je leerkracht')}</p></section>` : ''}
      ${inhoud || '<p class="pd-klein">Er is deze periode nog niets om te tonen.</p>'}
      ${b.toon.strookje ? `<footer class="pd-strook"><p>✂ Gelezen door de ouders van <strong>${esc(l.naam)}</strong></p><div><span>Handtekening:</span><i></i></div><div><span>Een berichtje voor de leerkracht:</span><i></i></div><div><i></i></div></footer>` : ''}
    </article>`;
  }

  // Dezelfde brief als gewone tekst (voor een bericht aan de ouders, bv. via het schoolplatform).
  function tekst(res, lid) {
    const b = res.brief;
    const l = res.leerlingen.find(x => x.id === lid);
    if (!l) return '';
    const vn = voornaam(l.naam);
    const r = [`Beste ouders van ${vn},`, ''];
    const woordje = woordjeVan(b, l);
    if (woordje) r.push(woordje, '');
    if (b.toon.toetsen && l.toetsen.length) {
      r.push(`Toetsen (${periode(b)}):`);
      for (const t of l.toetsen) r.push(`- ${t.titel}: ${nl(t.punten)} / ${nl(t.max)}${b.toon.gemiddelde && t.klas !== null ? ` (klasgemiddelde ${t.klas}%)` : ''}${t.open ? ' (nog niet helemaal verbeterd)' : ''}`);
      r.push('');
    }
    const o = l.oefenen;
    if (b.toon.doelen && o && o.lukt.length) r.push('Dit lukt al goed:', ...o.lukt.map(d => `- ${d.tekst}`), '');
    if (b.toon.doelen && o && o.oefen.length) r.push('Hier oefenen we nog op:', ...o.oefen.map(d => `- ${d.tekst}`), '');
    const e = l.eer;
    if (b.toon.oefenen && o && o.vragen) r.push(`${vn} deed ${o.dagen} dag${o.dagen === 1 ? '' : 'en'} mee en oefende ${o.vragen} vragen (${o.pct}% juist).`);
    if (b.toon.eer && e && e.complimenten.length) r.push(`Complimentjes: ${e.complimenten.join(', ')}.`);
    if (r[r.length - 1] !== '') r.push('');
    if (b.toon.nieuws && b.nieuws) r.push('Nieuws uit de klas:', b.nieuws, '');
    r.push('Met vriendelijke groeten,', b.afzender || 'De klasleerkracht');
    return r.join('\n');
  }

  window.Postduif = { blad, tekst, esc, kort, periode };
})();
