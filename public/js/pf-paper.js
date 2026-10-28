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
      h += `${bankHtml(q.bank, live, print)}<p class="pf-gaten">${q.parts.map(part => {
        if (typeof part === 'string') return esc(part).replace(/\n/g, '<br>');
        if (q.bank && !part.opties) {
          const w = (a || [])[part.gap] || '';
          if (print) return `<span class="ob-line" style="min-width:${part.size * 0.62}em"></span>`;
          return `<button type="button" class="pf-in pf-gat-sleep${w ? ' vol' : ''}" data-k="${part.gap}" data-waarde="${esc(w)}" style="min-width:${Math.max(4, part.size) * 0.6}em"${dis}>${esc(w)}</button>`;
        }
        if (part.opties) {
          if (print) return `<span class="pf-kies-print">( ${part.opties.map(esc).join(' / ')} )</span>`;
          return `<select class="ob-field ob-gap pf-in pf-kies" data-k="${part.gap}"${dis}><option value=""></option>${part.opties.map(x => `<option${(a || [])[part.gap] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
        }
        if (print) return `<span class="ob-line" style="min-width:${part.size * 0.62}em"></span>`;
        return `<input class="ob-field ob-gap pf-in" data-k="${part.gap}" size="${part.size}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc((a || [])[part.gap] ?? '')}"${ro}>`;
      }).join('')}</p>`;
    } else if (q.type === 'kort' && q.breuk) {
      h += print ? `<p class="pf-antwoordlijn">Antwoord: ${breukPrint()} ${esc(q.eenheid || '')}</p>`
        : `<p class="pf-kort">${breukHtml(a, ro, 'pf-in')}${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
    } else if (q.type === 'kort') {
      h += print ? `<p class="pf-antwoordlijn">Antwoord: <span class="ob-line wide"></span> ${esc(q.eenheid || '')}</p>`
        : `<p class="pf-kort"><input class="ob-field pf-in" data-k="0" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="antwoord" aria-label="Antwoord" value="${esc(a ?? '')}"${ro}>${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
    } else if (q.type === 'rekenen') {
      const w = a && typeof a === 'object' ? a : {};
      h += print ? `<div class="pf-werkvak">Bewerking:</div><p class="pf-antwoordlijn">Uitkomst: ${q.breuk ? breukPrint() : '<span class="ob-line" style="min-width:6em"></span>'} ${esc(q.eenheid || '')}</p>`
        : `<label class="pf-werk">Bewerking (hoe reken je het uit?)<textarea class="ob-field pf-werkveld" rows="4"${ro}>${esc(w.werk || '')}</textarea></label>
          <p class="pf-kort">Uitkomst: ${q.breuk ? breukHtml(w.uitkomst, ro, 'pf-uitkomst') : `<input class="ob-field pf-uitkomst" autocomplete="off" spellcheck="false" value="${esc(w.uitkomst || '')}"${ro}>`}${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
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
        if (c.opties) {
          if (print) return `<td class="pf-kies-print">${c.opties.map(esc).join(' / ')}</td>`;
          return `<td><select class="ob-field pf-in pf-kies" data-k="${c.gap}"${dis}><option value=""></option>${c.opties.map(x => `<option${(a || [])[c.gap] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></td>`;
        }
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

  // De woordenbank bij sleepwoorden.
  const bankHtml = (lijst, live, print) => (lijst && lijst.length ? `<div class="pf-bank${live ? ' live' : ''}">${print ? '<b>Kies uit:</b> ' : live ? '<span class="pf-tip">Tik op een woord en dan op een vakje.</span> ' : ''}${lijst.map(w => `<button type="button" class="pf-bank-w" data-w="${esc(w)}"${live ? '' : ' disabled'}>${esc(w)}</button>`).join('')}</div>` : '');

  // Een breukvak: een geheel (mag leeg), de teller boven en de noemer onder. De waarde is tekst: "1 3/4" of "3/4".
  function breukDelen(v) {
    const m = /^\s*(?:(-?\d+)\s+)?(\d*)\s*\/\s*(\d*)\s*$/.exec(String(v || ''));
    if (m) return [m[1] || '', m[2] || '', m[3] || ''];
    return [String(v || '').trim(), '', ''];
  }
  function breukHtml(v, ro, kl) {
    const [g, t, n] = breukDelen(v);
    const inp = (cls, val, label) => `<input class="ob-field pf-breuk-in ${cls}" inputmode="numeric" autocomplete="off" spellcheck="false" aria-label="${label}" value="${esc(val)}"${ro}>`;
    return `<span class="pf-breuk ${kl}">${inp('geheel', g, 'Geheel (mag leeg)')}<span class="pf-breuk-st">${inp('teller', t, 'Teller')}<i></i>${inp('noemer', n, 'Noemer')}</span></span>`;
  }
  const breukPrint = () => '<span class="pf-breuk print"><span class="ob-line" style="min-width:2em"></span><span class="pf-breuk-st"><span class="ob-line" style="min-width:2.4em"></span><i></i><span class="ob-line" style="min-width:2.4em"></span></span></span>';
  function breukWaarde(el) {
    const v = c => (el.querySelector(`.${c}`) || {}).value?.trim() || '';
    const [g, t, n] = [v('geheel'), v('teller'), v('noemer')];
    if (!t && !n) return g;
    return `${g ? `${g} ` : ''}${t}/${n}`;
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
      // Bij aanduiden toont de sleutel de juiste plek als cirkel (als het vak die kent).
      const zone = sleutel && f.soort === 'plek' && f.doel ? `<i class="pf-plek-doel" style="left:${f.x + (f.doel.x * f.w) / 100}%;top:${f.y + (f.doel.y * f.h) / 100}%;width:${(2 * f.doel.r * f.w) / 100}%"></i>` : '';
      if (f.soort === 'plek' && print) return zone;
      const s = f.soort === 'plek' ? zone : sleutel && sleutel[k] && !(oordeel && oordeel.goed[k] !== false) ? `<span class="pf-veld-sleutel${b[k] ? '' : ' in'}" style="left:${f.x}%;top:${b[k] ? f.y + f.h : f.y}%;${b[k] ? '' : `width:${f.w}%;height:${f.h}%;`}">${esc(sleutel[k])}</span>` : '';
      if (f.soort === 'vlak') return `<i class="pf-vlak" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;background:${esc(f.kleur || '#fff')}"></i>`;
      if (f.soort === 'notitie') return `<span class="pf-notitie" style="${pos}">${esc(f.tekst || '').replace(/\n/g, '<br>')}</span>`;
      if (print) return s;
      const g = oordeel ? oordeel.goed[k] : null;
      const knop = g === null || g === undefined ? '' : `<button type="button" class="pf-vak-oordeel ${g ? 'goed' : 'fout'}${oordeel.zelf[k] !== undefined ? ' zelf' : ''}" data-id="${esc(q.id)}" data-k="${k}" style="left:${f.x + f.w}%;top:${f.y}%" title="Klik om ${g ? 'fout' : 'goed'} te zetten">${g ? '✔' : '✘'}</button>`;
      return veldEl(f, k, pos, g) + knop + s;
    }).join('');
    const bank = bankHtml(q.bank, live, print);
    return `${live ? '<p class="pf-tip pf-blad-tip">Typ je antwoorden in de vakjes op het blad. <button type="button" class="link pf-groter">🔍 Groter</button></p>' : ''}${bank}
      <div class="pf-blad-wrap"><div class="pf-blad-vel" style="aspect-ratio:${Math.round((1 / v) * 10000) / 10000}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : ''}${velden}</div></div>`;

    function veldEl(f, k, pos, g) {
      const kl = g === true ? ' goed' : g === false ? ' fout' : '';
      if (f.soort === 'luister') return `<button type="button" class="pf-luister pf-blad-luister" ${f.audio ? `data-src="${esc(f.audio)}"` : `data-tekst="${esc(f.tekst || '')}"`} style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Luister" aria-label="Luister">🎧</button>`;
      if (f.soort === 'teken') {
        const box = `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%`;
        if (live) return `<div class="pf-veld teken" data-k="${k}" style="${box}"></div>`;
        return `<div class="pf-veld teken kijk" data-k="${k}" style="${box}">${typeof b[k] === 'string' && b[k] ? `<img src="${esc(b[k])}" alt="">` : ''}</div>`;
      }
      // Een bolletje (rond): één keuze per groep. Een hokje: aankruisen, ook meerdere.
      if (f.soort === 'kruis') return `<button type="button" class="pf-veld kruis${f.rond ? ' rond' : ''}${kl}${b[k] === true ? ' on' : ''}" data-k="${k}" data-g="${f.groep || 1}" style="${pos}" aria-label="${f.label ? esc(f.label) : 'Aankruisen'}"${live ? '' : ' disabled'}>${f.rond ? esc(f.label || '') : b[k] === true ? '✗' : esc(f.label || '')}</button>`;
      if (f.soort === 'breuk') {
        const [t, n] = /\//.test(String(b[k] || '')) ? String(b[k]).split('/') : [b[k] || '', ''];
        return `<span class="pf-veld breuk${kl}" data-k="${k}" style="${pos}"><input class="teller pf-breuk-in" inputmode="numeric" autocomplete="off" aria-label="Teller" value="${esc(String(t).trim())}"${ro}><i></i><input class="noemer pf-breuk-in" inputmode="numeric" autocomplete="off" aria-label="Noemer" value="${esc(String(n).trim())}"${ro}></span>`;
      }
      if (f.soort === 'sleep') return `<button type="button" class="pf-veld sleep${kl}${b[k] ? ' vol' : ''}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="${pos}"${live ? '' : ' disabled'}>${esc(b[k] || '')}</button>`;
      if (f.soort === 'plek') {
        const [px, py] = String(b[k] || '').split(',').map(Number);
        return `<div class="pf-veld plek${kl}${live ? '' : ' kijk'}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Tik de juiste plek aan">${b[k] ? `<i class="pf-plek-pin" style="left:${px}%;top:${py}%"></i>` : ''}</div>`;
      }
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
      symbolen(box);
    }
  }

  // De symbolenbalk: onderaan het scherm zodra de leerling in een vakje typt. Een klik zet het teken waar de cursor staat.
  const REKEN = ['²', '³', '√', 'π', '×', '÷', '±', '<', '>', '≤', '≥', '≠', '≈', '€', '°', '%', '½', '¼', '¾'];
  const TAAL = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ï', 'î', 'ô', 'û', 'ù', 'œ', '«', '»', '’', '¿', '¡'];
  let balk = null;
  function symbolen(box) {
    if (box.pfSymbolen) return;
    box.pfSymbolen = true;
    if (!balk) {
      balk = document.createElement('div');
      balk.className = 'pf-symbolen hidden';
      const knoppen = lijst => lijst.map(c => `<button type="button" data-c="${c}">${c}</button>`).join('');
      balk.innerHTML = `<span class="pf-sym-set">${knoppen(REKEN)}</span><span class="pf-sym-set hidden">${knoppen(TAAL)}</span><button type="button" class="pf-sym-wissel" title="Andere tekens">éà</button>`;
      document.body.appendChild(balk);
      // De focus blijft in het vakje.
      balk.addEventListener('mousedown', e => e.preventDefault());
      balk.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.classList.contains('pf-sym-wissel')) {
          const sets = balk.querySelectorAll('.pf-sym-set');
          for (const x of sets) x.classList.toggle('hidden');
          b.textContent = sets[0].classList.contains('hidden') ? '123' : 'éà';
          return;
        }
        const veld = balk.pfVeld;
        if (!veld || !veld.isConnected || veld.readOnly) return;
        const a = veld.selectionStart ?? veld.value.length;
        const z = veld.selectionEnd ?? a;
        veld.value = veld.value.slice(0, a) + b.dataset.c + veld.value.slice(z);
        veld.setSelectionRange(a + b.dataset.c.length, a + b.dataset.c.length);
        veld.focus();
        veld.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    box.addEventListener('focusin', e => {
      const v = e.target;
      if (!v.matches('input:not([type=checkbox]):not(.pf-breuk-in), textarea') || v.readOnly) return;
      balk.pfVeld = v;
      clearTimeout(balk.pfWeg);
      balk.classList.remove('hidden');
    });
    box.addEventListener('focusout', () => {
      balk.pfWeg = setTimeout(() => { if (!box.contains(document.activeElement)) balk.classList.add('hidden'); else if (document.activeElement.matches('.pf-breuk-in, select')) balk.classList.add('hidden'); }, 150);
    });
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
      for (const i of el.querySelectorAll('.pf-in')) out[Number(i.dataset.k)] = i.dataset.waarde !== undefined ? i.dataset.waarde : i.value;
      return out;
    }
    if (type === 'kort') { const b = el.querySelector('.pf-breuk'); return b ? breukWaarde(b) : el.querySelector('.pf-in').value; }
    if (type === 'rekenen') { const b = el.querySelector('.pf-breuk'); return { werk: el.querySelector('.pf-werkveld').value, uitkomst: b ? breukWaarde(b) : el.querySelector('.pf-uitkomst').value }; }
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
      for (const f of el.querySelectorAll('.pf-veld')) {
        const k = Number(f.dataset.k);
        if (f.classList.contains('kruis')) out[k] = f.classList.contains('on') ? true : null;
        else if (f.classList.contains('teken')) out[k] = f.pfWaarde || null;
        else if (f.classList.contains('sleep') || f.classList.contains('plek')) out[k] = f.dataset.waarde || null;
        else if (f.classList.contains('breuk')) {
          const t = f.querySelector('.teller').value.trim();
          const n = f.querySelector('.noemer').value.trim();
          out[k] = t || n ? `${t}/${n}` : null;
        } else out[k] = f.value;
      }
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
        const label = b.getAttribute('aria-label') === 'Aankruisen' ? '' : b.getAttribute('aria-label');
        b.addEventListener('click', () => {
          b.classList.toggle('on');
          // Een bolletje: de andere bolletjes van dezelfde vraag gaan uit.
          if (b.classList.contains('rond')) {
            for (const x of el.querySelectorAll(`.pf-veld.kruis.rond[data-g="${b.dataset.g}"]`)) if (x !== b) x.classList.remove('on');
          } else b.textContent = b.classList.contains('on') ? '✗' : label;
          send(el);
        });
      }
      // Aanduiden op een blad: een speld waar de leerling tikt.
      for (const v of el.querySelectorAll('.pf-veld.plek')) {
        v.addEventListener('click', e => {
          const r = v.getBoundingClientRect();
          const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)) * 10) / 10;
          const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) * 10) / 10;
          v.dataset.waarde = `${x},${y}`;
          v.innerHTML = `<i class="pf-plek-pin" style="left:${x}%;top:${y}%"></i>`;
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
      // Sleepwoorden: tik op een woord en dan op een vakje (of sleep het erheen). Tik op een gevuld vakje om het leeg te maken.
      const bank = el.querySelector('.pf-bank.live');
      if (bank) {
        let gekozen = null;
        const kies = w => {
          gekozen = gekozen === w ? null : w;
          for (const x of bank.querySelectorAll('.pf-bank-w')) x.classList.toggle('on', x.dataset.w === gekozen);
          el.classList.toggle('kiest', !!gekozen);
        };
        const zet = (v, w) => {
          v.dataset.waarde = w || '';
          v.textContent = w || '';
          v.classList.toggle('vol', !!w);
          send(el);
        };
        bank.addEventListener('click', e => { const b = e.target.closest('.pf-bank-w'); if (b) kies(b.dataset.w); });
        for (const v of el.querySelectorAll('.pf-veld.sleep, .pf-gat-sleep')) {
          v.addEventListener('click', () => {
            if (gekozen) { zet(v, gekozen); kies(gekozen); } else if (v.dataset.waarde) zet(v, '');
          });
          v.addEventListener('dragover', e => e.preventDefault());
          v.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); const w = e.dataTransfer.getData('text/x-pf'); if (w) zet(v, w); });
        }
        for (const b of bank.querySelectorAll('.pf-bank-w')) {
          b.draggable = true;
          b.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.setData('text/x-pf', b.dataset.w); });
        }
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
