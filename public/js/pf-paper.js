// Een toets van De Proef tekenen: voor de leerling (invullen), op het bord en in de editor (bekijken) en op papier (printen).
// pages: de pagina's uit PfKern.studentView (een vraag, of een bron met deelvragen).
// opts: { mode: 'live' | 'view' | 'print', answers: { id: antwoord }, sleutel: { id: tekst }, punten: { id: [kreeg, max] },
//         zones: { id: [{ x, y, r }] } (print met sleutel), nummer: true (Vraag 1, 2, ... op elke pagina), voorlees, onAnswer(id, waarde) }
// Een antwoord is altijd in de volgorde van het scherm: de server zet het om naar de volgorde van de toets.
const PfPaper = (() => {
  const L = 'ABCDEFGH';
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const paras = text => String(text || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const nl = n => String(n).replace('.', ',');
  const ptn = n => `${nl(n)} ${n === 1 ? 'punt' : 'punten'}`;

  function vraagHtml(q, nr, o) {
    const a = o.answers[q.id];
    const live = o.mode === 'live';
    const print = o.mode === 'print';
    const dis = live ? '' : ' disabled';
    const ro = live ? '' : ' readonly';
    const say = o.voorlees && !print && typeof Voorlees !== 'undefined' && Voorlees.ok
      ? `<button type="button" class="ob-say pf-say" data-say="${o.said.push([q.vraag, ...(q.opties || []).map((x, i) => `${L[i]}: ${x.tekst || ''}`)].filter(Boolean).join('\n')) - 1}" title="Lees voor" aria-label="Lees voor">🔊</button>` : '';
    const luister = q.audio && !print ? `<button type="button" class="pf-luister" data-src="${esc(q.audio)}" title="Luister naar de uitleg" aria-label="Luister">🎧</button>` : '';
    const got = o.punten && o.punten[q.id];
    let h = `<div class="pf-q pf-${q.type}" data-id="${esc(q.id)}" data-type="${q.type}">
      <h3><span class="pf-nr">${esc(nr)}</span>${say}${luister}<span class="pf-vraag">${esc(q.vraag || '').replace(/\n/g, '<br>')}</span>
      <small class="pf-ptn">${got ? `<b>${nl(got[0] ?? '?')}</b> / ${nl(got[1])}` : `/ ${nl(q.punten)}`}</small></h3>`;
    if (q.type === 'blad') return `${h}${bladHtml(q, a, o)}</div>`;
    if (q.beeld && q.type !== 'aanduiden') h += `<img class="pf-beeld" src="${esc(q.beeld)}" alt="" loading="lazy">`;
    if (q.type === 'meerkeuze') {
      const gekozen = new Set([].concat(a ?? []).map(String));
      if (q.meer) h += `<p class="pf-tip">Er zijn meerdere juiste antwoorden. Duid ze allemaal aan.</p>`;
      h += `<div class="pf-keuzes${q.opties.some(x => x.beeld) ? ' met-beeld' : ''}">${q.opties.map((x, i) => print
        ? `<div class="pf-keuze-print"><span class="ob-check">${L[i]}</span>${x.beeld ? `<img src="${esc(x.beeld)}" alt="">` : ''} ${esc(x.tekst)}</div>`
        : `<button type="button" class="pf-keuze${gekozen.has(String(i)) ? ' on' : ''}" data-value="${i}"${dis}><b>${L[i]}</b>${x.beeld ? `<img src="${esc(x.beeld)}" alt="">` : ''}<span>${esc(x.tekst)}</span></button>`).join('')}</div>`;
    } else if (q.type === 'juistfout') {
      h += `<div class="pf-keuzes jf">${['J', 'F'].map(v => print
        ? `<span class="pf-keuze-print"><span class="ob-check">${v}</span> ${v === 'J' ? 'Juist' : 'Fout'}</span>`
        : `<button type="button" class="pf-keuze${a === v ? ' on' : ''}" data-value="${v}"${dis}>${v === 'J' ? '✔ Juist' : '✖ Fout'}</button>`).join('')}</div>`;
    } else if (q.type === 'invullen') {
      h += `<p class="pf-gaten">${q.parts.map(part => {
        if (typeof part === 'string') return esc(part).replace(/\n/g, '<br>');
        if (part.opties) {
          if (print) return `<span class="pf-kies-print">( ${part.opties.map(esc).join(' / ')} )</span>`;
          return `<select class="ob-field ob-gap pf-in pf-kies" data-k="${part.gap}"${dis}><option value=""></option>${part.opties.map(x => `<option${(a || [])[part.gap] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
        }
        if (print) return `<span class="ob-line" style="min-width:${part.size * 0.62}em"></span>`;
        return `<input class="ob-field ob-gap pf-in" data-k="${part.gap}" size="${part.size}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc((a || [])[part.gap] ?? '')}"${ro}>`;
      }).join('')}</p>`;
    } else if (q.type === 'kort') {
      h += print ? `<p class="pf-antwoordlijn">Antwoord: <span class="ob-line wide"></span> ${esc(q.eenheid || '')}</p>`
        : `<p class="pf-kort"><input class="ob-field pf-in" data-k="0" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="antwoord" aria-label="Antwoord" value="${esc(a ?? '')}"${ro}>${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
    } else if (q.type === 'rekenen') {
      const w = a && typeof a === 'object' ? a : {};
      h += print ? '<div class="pf-werkvak">Bewerking:</div><p class="pf-antwoordlijn">Uitkomst: <span class="ob-line" style="min-width:6em"></span> ' + esc(q.eenheid || '') + '</p>'
        : `<label class="pf-werk">Bewerking (hoe reken je het uit?)<textarea class="ob-field pf-werkveld" rows="4"${ro}>${esc(w.werk || '')}</textarea></label>
          <p class="pf-kort">Uitkomst: <input class="ob-field pf-uitkomst" autocomplete="off" spellcheck="false" value="${esc(w.uitkomst || '')}"${ro}>${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
    } else if (q.type === 'verbinden') {
      if (print) {
        h += `<div class="ob-match-print"><ol>${q.links.map(l => `<li><span class="ob-box"></span> ${esc(l)}</li>`).join('')}</ol><ul>${q.rechts.map((r, j) => `<li><b>${L[j]}</b> ${esc(r)}</li>`).join('')}</ul></div>`;
      } else {
        h += `<div class="ob-match">${q.links.map((l, i) => `<label><span>${esc(l)}</span><select class="ob-field pf-sel" data-k="${i}"${dis}><option value="">kies…</option>${q.rechts.map((r, j) => `<option value="${j}"${a && String(a[i]) === String(j) ? ' selected' : ''}>${L[j]}. ${esc(r)}</option>`).join('')}</select></label>`).join('')}</div>`;
      }
    } else if (q.type === 'ordenen') {
      const order = Array.isArray(a) && a.length === q.items.length ? a : q.items.map((_, i) => i);
      h += print ? `<p class="pf-tip">Zet de juiste volgorde: 1, 2, 3, …</p><ul class="pf-orden-print">${q.items.map(t => `<li><span class="ob-box"></span> ${esc(t)}</li>`).join('')}</ul>`
        : `<p class="pf-tip">Zet in de juiste volgorde met de pijltjes.</p><ol class="pf-orden">${order.map(i => `<li data-i="${i}"><span>${esc(q.items[i])}</span>${live ? '<button type="button" class="secondary pf-op" aria-label="Omhoog">▲</button><button type="button" class="secondary pf-neer" aria-label="Omlaag">▼</button>' : ''}</li>`).join('')}</ol>`;
    } else if (q.type === 'tabel') {
      h += `<div class="pf-tabel-wrap"><table class="pf-tabel">${q.rijen.map((r, ri) => `<tr>${r.map(c => {
        const tag = ri === 0 ? 'th' : 'td';
        if (typeof c === 'string') return `<${tag}>${esc(c)}</${tag}>`;
        if (print) return '<td class="pf-leeg"></td>';
        return `<td><input class="ob-field pf-in" data-k="${c.gap}" size="${c.size}" autocomplete="off" spellcheck="false" value="${esc((a || [])[c.gap] ?? '')}"${ro}></td>`;
      }).join('')}</tr>`).join('')}</table></div>`;
    } else if (q.type === 'aanduiden') {
      const zones = (o.zones && o.zones[q.id]) || [];
      const pt = a && typeof a === 'object' ? a : null;
      h += `${print ? '<p class="pf-tip">Zet een kruisje op de juiste plek.</p>' : '<p class="pf-tip">Tik op de juiste plek op de afbeelding.</p>'}
        <div class="pf-kaart${live ? ' live' : ''}" style="aspect-ratio:${1 / (q.verhouding || 0.75)}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : '<span class="muted">Nog geen afbeelding</span>'}
        ${zones.map(z => `<i class="pf-zone" style="left:${z.x}%;top:${z.y}%;width:${z.r * 2}%;"></i>`).join('')}
        ${pt ? `<i class="pf-pin" style="left:${pt.x}%;top:${pt.y}%"></i>` : ''}</div>`;
    } else if (q.type === 'getallenas') {
      h += `<p class="pf-tip">${print ? 'Zet een pijltje op de juiste plek.' : 'Tik op de getallenas waar het getal ligt.'}</p>${asHtml(q, a, live)}`;
    } else if (q.type === 'markeren') {
      const on = new Set([].concat(a ?? []).map(Number));
      h += `<p class="pf-tip">${print ? 'Onderstreep de juiste woorden.' : 'Tik op de woorden om ze aan te duiden. Nog eens tikken haalt het weg.'}</p>
        <p class="pf-markeer${live ? ' live' : ''}">${q.stukken.map(x => (x.w === undefined ? esc(x.t).replace(/\n/g, '<br>') : `<span class="pf-woord${on.has(x.w) ? ' on' : ''}" data-w="${x.w}"${live ? ' role="button" tabindex="0"' : ''}>${esc(x.t)}</span>`)).join('')}</p>`;
    } else if (q.type === 'tekenen') {
      const st = `aspect-ratio:${Math.round((1 / (q.verhouding || 0.6)) * 1000) / 1000}`;
      h += `${live ? '<p class="pf-tip">Teken met je vinger, pen of muis.</p>' : ''}<div class="pf-teken-wrap" style="${st}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : ''}
        ${live ? '<div class="pf-teken"></div>' : typeof a === 'string' && a ? `<img class="pf-tekening" src="${esc(a)}" alt="">` : ''}</div>`;
    } else if (q.type === 'spreken') {
      h += print ? '<p class="pf-papier">🗣 Deze vraag beantwoord je mondeling.</p>'
        : live ? `<p class="pf-tip">Neem je antwoord op (hooguit ${q.seconden || 60} seconden). Je mag opnieuw opnemen.</p><div class="pf-spreek" data-seconden="${q.seconden || 60}"></div>`
          : typeof a === 'string' && a ? `<audio controls preload="none" src="${esc(a)}"></audio>` : '<p class="muted">Nog niets ingesproken.</p>';
    } else if (q.type === 'open') {
      h += print ? `<div class="ob-lines">${'<i></i>'.repeat(q.regels || 3)}</div>`
        : `<textarea class="ob-field pf-open" rows="${Math.min(8, Math.max(2, q.regels || 3))}"${ro}>${esc(a ?? '')}</textarea>`;
    } else if (q.type === 'papier') {
      h += print ? '<div class="pf-werkvak groot"></div>' : '<p class="pf-papier">📝 Maak deze opdracht op je blad. Je leerkracht verbetert ze.</p>';
    }
    if (o.sleutel && String(o.sleutel[q.id] || '').trim()) h += `<p class="pf-sleutel">✔ ${esc(o.sleutel[q.id]).replace(/\n/g, '<br>')}</p>`;
    return `${h}</div>`;
  }

  // Een getallenas: streepjes per stap, de getallen aan de uiteinden of overal. De leerling ziet niet welk getal hij aanduidt.
  // Zoals PfKern.asTekst (die laadt niet bij de leerling).
  function asTekst(x, breuk) {
    if (breuk && Math.abs(x - Math.round(x)) > 1e-9) {
      for (let d = 2; d <= 100; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-6) return `${Math.round(x * d)}/${d}`;
    }
    return String(Math.round(x * 1000) / 1000).replace('.', ',');
  }
  function asHtml(q, a, live) {
    const n = Math.round((q.max - q.min) / q.stap);
    const pos = x => 4 + (92 * (x - q.min)) / (q.max - q.min);
    const elke = q.getallen === 'alle' ? Math.max(1, Math.ceil(n / 20)) : n;
    let streep = '';
    for (let i = 0; i <= n; i++) {
      const x = q.min + i * q.stap;
      const label = i === 0 || i === n || i % elke === 0;
      streep += `<i class="pf-as-streep${label ? ' groot' : ''}" style="left:${pos(x)}%"></i>${label ? `<b class="pf-as-getal" style="left:${pos(x)}%">${esc(asTekst(x, q.breuk))}</b>` : ''}`;
    }
    const pin = a !== null && a !== undefined && a !== '' && Number.isFinite(Number(a)) ? `<i class="pf-as-pin" style="left:${pos(Number(a))}%"></i>` : '';
    return `<div class="pf-as${live ? ' live' : ''}" data-min="${q.min}" data-max="${q.max}" data-stap="${q.stap}"${pin ? ` data-waarde="${Number(a)}"` : ''}><span class="pf-as-lijn"></span>${streep}${pin}</div>`;
  }

  // Een blad uit de pdf: de pagina zelf, met de vakjes erop. De letters groeien mee met het blad (cqw).
  function bladHtml(q, a, o) {
    const live = o.mode === 'live';
    const print = o.mode === 'print';
    const ro = live ? '' : ' readonly';
    const b = Array.isArray(a) ? a : [];
    const v = q.verhouding || 1.414;
    const sleutel = o.sleutel && Array.isArray(o.sleutel[q.id]) ? o.sleutel[q.id] : null;
    // Bij verbeteren: per vakje ✔ of ✘, de leerkracht klikt om het om te draaien.
    const oordeel = o.vakken && o.vakken[q.id];
    const velden = q.velden.map((f, k) => {
      const pos = `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;font-size:max(9px,${Math.round(Math.min(f.h * v * 0.62, 2.2) * 100) / 100}cqw)`;
      // Met een oordeel (verbeteren) alleen de sleutel bij een fout vakje, anders staat alles vol rood.
      const s = sleutel && sleutel[k] && !(oordeel && oordeel.goed[k] !== false) ? `<span class="pf-veld-sleutel${b[k] ? '' : ' in'}" style="left:${f.x}%;top:${b[k] ? f.y + f.h : f.y}%;${b[k] ? '' : `width:${f.w}%;height:${f.h}%;`}">${esc(sleutel[k])}</span>` : '';
      if (print) return s;
      const g = oordeel ? oordeel.goed[k] : null;
      const knop = g === null || g === undefined ? '' : `<button type="button" class="pf-vak-oordeel ${g ? 'goed' : 'fout'}${oordeel.zelf[k] !== undefined ? ' zelf' : ''}" data-id="${esc(q.id)}" data-k="${k}" style="left:${f.x + f.w}%;top:${f.y}%" title="Klik om ${g ? 'fout' : 'goed'} te zetten">${g ? '✔' : '✘'}</button>`;
      return veldEl(f, k, pos, g) + knop + s;
    }).join('');
    return `${live ? '<p class="pf-tip pf-blad-tip">Typ je antwoorden in de vakjes op het blad. <button type="button" class="link pf-groter">🔍 Groter</button></p>' : ''}
      <div class="pf-blad-wrap"><div class="pf-blad-vel" style="aspect-ratio:${Math.round((1 / v) * 10000) / 10000}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : ''}${velden}</div></div>`;

    function veldEl(f, k, pos, g) {
      const kl = g === true ? ' goed' : g === false ? ' fout' : '';
      if (f.soort === 'luister') return `<button type="button" class="pf-luister pf-blad-luister" ${f.audio ? `data-src="${esc(f.audio)}"` : `data-tekst="${esc(f.tekst || '')}"`} style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Luister" aria-label="Luister">🎧</button>`;
      if (f.soort === 'teken') {
        const box = `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%`;
        if (live) return `<div class="pf-veld teken" data-k="${k}" style="${box}"></div>`;
        return `<div class="pf-veld teken kijk" data-k="${k}" style="${box}">${typeof b[k] === 'string' && b[k] ? `<img src="${esc(b[k])}" alt="">` : ''}</div>`;
      }
      if (f.soort === 'kruis') return `<button type="button" class="pf-veld kruis${kl}${b[k] === true ? ' on' : ''}" data-k="${k}" style="${pos}" aria-label="Aankruisen"${live ? '' : ' disabled'}>${b[k] === true ? '✗' : ''}</button>`;
      if (f.soort === 'kies') return `<select class="pf-veld kies${kl}" data-k="${k}" style="${pos}"${live ? '' : ' disabled'}><option value=""></option>${(f.opties || []).map(x => `<option${b[k] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      if (f.soort === 'open') return `<textarea class="pf-veld open${kl}" data-k="${k}" style="${pos}" spellcheck="false"${ro}>${esc(b[k] ?? '')}</textarea>`;
      return `<input class="pf-veld${kl}" data-k="${k}" style="${pos}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(b[k] ?? '')}"${ro}>`;
    }
  }

  function pageHtml(p, i, o) {
    const nr = o.nummer ? String(i + 1) : '';
    if (p.type !== 'bron') return `<section class="pf-page">${vraagHtml(p, nr, o)}</section>`;
    const say = o.voorlees && o.mode !== 'print' && typeof Voorlees !== 'undefined' && Voorlees.ok
      ? `<button type="button" class="ob-say pf-say" data-say="${o.said.push([p.titel, p.tekst].filter(Boolean).join('\n')) - 1}" title="Lees voor" aria-label="Lees voor">🔊</button>` : '';
    return `<section class="pf-page pf-bron-page">
      <div class="pf-bron">${p.titel || say ? `<h3>${say}${esc(p.titel || 'Bron')}</h3>` : ''}${p.beeld ? `<img class="pf-beeld" src="${esc(p.beeld)}" alt="">` : ''}${paras(p.tekst)}</div>
      <div class="pf-deel">${p.vragen.map((q, j) => vraagHtml(q, `${nr}${'abcdefghijklmno'[j]}`, o)).join('')}</div>
    </section>`;
  }

  function render(box, pages, opts = {}) {
    const o = { mode: 'view', answers: {}, ...opts, said: [] };
    box.innerHTML = pages.map((p, i) => pageHtml(p, opts.start !== undefined ? opts.start + i : i, o)).join('');
    box.pfSaid = o.said;
    if (o.said.length && !box.pfSayWired) {
      box.pfSayWired = true;
      box.addEventListener('click', e => {
        const b = e.target.closest('.pf-say');
        if (b) Voorlees.speak(box.pfSaid[b.dataset.say], b);
      });
    }
    if (!box.pfLuisterWired) {
      box.pfLuisterWired = true;
      box.addEventListener('click', e => {
        const b = e.target.closest('.pf-luister');
        if (!b) return;
        e.preventDefault();
        if (b.dataset.src) PfAudio.speel(b.dataset.src, b);
        else if (b.dataset.tekst && typeof Voorlees !== 'undefined') Voorlees.speak(b.dataset.tekst, b);
      });
    }
    if (o.mode === 'live') {
      mountMedia(box, o);
      wire(box, o.onAnswer);
    }
  }

  // Tekenvakken en opnameknoppen in een toets die de leerling maakt. Het antwoord zit op het element (pfWaarde).
  function mountMedia(box, o) {
    const meld = el => el.dispatchEvent(new Event('pf-antwoord', { bubbles: true }));
    for (const el of box.querySelectorAll('.pf-q')) {
      const a = o.answers[el.dataset.id];
      const t = el.querySelector('.pf-teken');
      if (t && typeof PfTeken !== 'undefined') {
        t.pfWaarde = typeof a === 'string' ? a : null;
        const wrap = t.closest('.pf-teken-wrap');
        PfTeken.mount(t, { breedte: 900, verhouding: wrap.offsetHeight && wrap.offsetWidth ? wrap.offsetHeight / wrap.offsetWidth : 0.6, waarde: t.pfWaarde, onChange: d => { t.pfWaarde = d; meld(t); } });
      }
      const sp = el.querySelector('.pf-spreek');
      if (sp && typeof PfAudio !== 'undefined') {
        sp.pfWaarde = typeof a === 'string' ? a : null;
        PfAudio.knop(sp, { waarde: sp.pfWaarde, max: Number(sp.dataset.seconden) || 60, grootte: 1500000, label: 'Neem je antwoord op', onChange: d => { sp.pfWaarde = d || null; meld(sp); }, weg: true });
      }
      for (const v of el.querySelectorAll('.pf-veld.teken:not(.kijk)')) {
        const b = Array.isArray(a) ? a : [];
        const k = Number(v.dataset.k);
        v.pfWaarde = typeof b[k] === 'string' ? b[k] : null;
        const r = v.getBoundingClientRect();
        // Zo groot als het vak op een blad van 1240 pixels breed.
        const vel = v.parentElement.getBoundingClientRect();
        const breed = Math.max(120, Math.round((r.width / Math.max(1, vel.width)) * 1240));
        PfTeken.mount(v, { breedte: breed, verhouding: r.width ? r.height / r.width : 0.5, klein: true, waarde: v.pfWaarde, onChange: d => { v.pfWaarde = d; meld(v); } });
      }
    }
  }

  // Het antwoord van één vraag uit het scherm halen.
  function lees(el) {
    const type = el.dataset.type;
    if (type === 'meerkeuze') {
      const on = [...el.querySelectorAll('.pf-keuze.on')].map(b => Number(b.dataset.value));
      return el.querySelector('.pf-tip') ? on : (on.length ? on[0] : null);
    }
    if (type === 'juistfout') return (el.querySelector('.pf-keuze.on') || {}).dataset?.value || null;
    if (type === 'invullen' || type === 'tabel') {
      const out = [];
      for (const i of el.querySelectorAll('.pf-in')) out[Number(i.dataset.k)] = i.value;
      return out;
    }
    if (type === 'kort') return el.querySelector('.pf-in').value;
    if (type === 'rekenen') return { werk: el.querySelector('.pf-werkveld').value, uitkomst: el.querySelector('.pf-uitkomst').value };
    if (type === 'verbinden') return [...el.querySelectorAll('.pf-sel')].map(s => (s.value === '' ? null : Number(s.value)));
    if (type === 'ordenen') return [...el.querySelectorAll('.pf-orden li')].map(li => Number(li.dataset.i));
    if (type === 'aanduiden') return el.pfPunt || null;
    if (type === 'open') return el.querySelector('.pf-open').value;
    if (type === 'getallenas') { const as = el.querySelector('.pf-as'); return as.dataset.waarde !== undefined ? Number(as.dataset.waarde) : null; }
    if (type === 'markeren') return [...el.querySelectorAll('.pf-woord.on')].map(w => Number(w.dataset.w));
    if (type === 'tekenen') return (el.querySelector('.pf-teken') || {}).pfWaarde || null;
    if (type === 'spreken') return (el.querySelector('.pf-spreek') || {}).pfWaarde || null;
    if (type === 'blad') {
      const out = [];
      for (const f of el.querySelectorAll('.pf-veld')) out[Number(f.dataset.k)] = f.classList.contains('kruis') ? (f.classList.contains('on') ? true : null) : f.classList.contains('teken') ? (f.pfWaarde || null) : f.value;
      return out;
    }
    return null;
  }

  function wire(box, onAnswer) {
    const timers = new Map();
    const send = (el, wacht) => {
      clearTimeout(timers.get(el));
      if (!wacht) return onAnswer && onAnswer(el.dataset.id, lees(el));
      timers.set(el, setTimeout(() => onAnswer && onAnswer(el.dataset.id, lees(el)), wacht));
    };
    // Nog niet verstuurd (de leerling typt nog): nu meteen versturen, bv. voor naar de volgende vraag of inleveren.
    box.pfFlush = () => { for (const [el, t] of timers) { clearTimeout(t); send(el); } timers.clear(); };
    for (const el of box.querySelectorAll('.pf-q')) {
      el.addEventListener('input', e => { if (e.target.matches('input, textarea')) send(el, 800); });
      el.addEventListener('change', e => { if (e.target.matches('input, textarea, select')) send(el); });
      for (const b of el.querySelectorAll('.pf-keuze')) {
        b.addEventListener('click', () => {
          const meer = el.dataset.type === 'meerkeuze' && el.querySelector('.pf-tip');
          if (meer) b.classList.toggle('on');
          else for (const x of el.querySelectorAll('.pf-keuze')) x.classList.toggle('on', x === b);
          send(el);
        });
      }
      for (const b of el.querySelectorAll('.pf-veld.kruis')) {
        b.addEventListener('click', () => {
          b.classList.toggle('on');
          b.textContent = b.classList.contains('on') ? '✗' : '';
          send(el);
        });
      }
      el.addEventListener('pf-antwoord', () => send(el));
      for (const w of el.querySelectorAll('.pf-woord')) {
        const klik = () => { w.classList.toggle('on'); send(el); };
        w.addEventListener('click', klik);
        w.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klik(); } });
      }
      const as = el.querySelector('.pf-as.live');
      if (as) {
        const zet = e => {
          const r = as.getBoundingClientRect();
          const min = Number(as.dataset.min);
          const max = Number(as.dataset.max);
          const stap = Number(as.dataset.stap);
          const ruw = min + ((((e.clientX - r.left) / r.width) * 100 - 4) / 92) * (max - min);
          const x = Math.min(max, Math.max(min, min + Math.round((ruw - min) / stap) * stap));
          const w = Math.round(x * 1e6) / 1e6;
          if (as.dataset.waarde === String(w)) return;
          as.dataset.waarde = String(w);
          let pin = as.querySelector('.pf-as-pin');
          if (!pin) { as.insertAdjacentHTML('beforeend', '<i class="pf-as-pin"></i>'); pin = as.querySelector('.pf-as-pin'); }
          pin.style.left = `${4 + (92 * (x - min)) / (max - min)}%`;
        };
        let sleept = false;
        as.addEventListener('pointerdown', e => { sleept = true; as.setPointerCapture(e.pointerId); zet(e); });
        as.addEventListener('pointermove', e => { if (sleept) zet(e); });
        const los = () => { if (sleept) { sleept = false; send(el); } };
        as.addEventListener('pointerup', los);
        as.addEventListener('pointercancel', los);
      }
      const groter = el.querySelector('.pf-groter');
      if (groter) groter.addEventListener('click', () => { groter.textContent = el.classList.toggle('groot') ? '🔍 Kleiner' : '🔍 Groter'; });
      for (const b of el.querySelectorAll('.pf-op, .pf-neer')) {
        b.addEventListener('click', () => {
          const li = b.closest('li');
          if (b.classList.contains('pf-op') && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
          if (b.classList.contains('pf-neer') && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
          b.focus();
          send(el);
        });
      }
      const kaart = el.querySelector('.pf-kaart.live');
      if (kaart) {
        kaart.addEventListener('click', e => {
          const r = kaart.getBoundingClientRect();
          const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
          const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
          el.pfPunt = { x, y };
          let pin = kaart.querySelector('.pf-pin');
          if (!pin) kaart.insertAdjacentHTML('beforeend', '<i class="pf-pin"></i>');
          pin = kaart.querySelector('.pf-pin');
          pin.style.left = `${x}%`;
          pin.style.top = `${y}%`;
          send(el);
        });
      }
      // Enter springt naar het volgende vakje.
      for (const i of el.querySelectorAll('input')) {
        i.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const all = [...box.querySelectorAll('input.ob-field, textarea.ob-field, select.ob-field')];
          const next = all[all.indexOf(i) + 1];
          if (next) next.focus(); else i.blur();
        });
      }
    }
    for (const el of box.querySelectorAll('.pf-q[data-type="aanduiden"]')) {
      const pin = el.querySelector('.pf-pin');
      if (pin) el.pfPunt = { x: parseFloat(pin.style.left), y: parseFloat(pin.style.top) };
    }
  }

  // Is deze vraag al beantwoord? (voor het bolletje in de vraagbalk)
  function beantwoord(a) {
    if (a === undefined || a === null || a === '') return false;
    if (Array.isArray(a)) return a.some(x => x !== null && x !== undefined && x !== '');
    if (typeof a === 'object') return !!(a.uitkomst || a.werk || a.x !== undefined);
    return true;
  }

  return { render, lees, beantwoord, esc, ptn, nl };
})();
