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

  // Een gemengd getal (1 3/4) in kleine letters: een bredere spatie, anders lees je 13/4.
  const gemengd = t => String(t).replace(/(\d) (\d+\/\d+)/g, (_, a, b) => `${a}\u2002${b}`);

  // Altijd dezelfde volgorde voor dezelfde vraag, nooit de juiste (bij 2 of meer).
  function schudVast(n, sleutel) {
    let h = 2166136261;
    for (const c of sleutel) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const o = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ i, 16777619) >>> 0; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; }
    if (o.every((x, i) => x === i)) o.push(o.shift());
    return o;
  }

  // 🎧 en 🐢 (trager) voor een tekst die alleen voorgelezen wordt. De tekst zelf staat in o.said, niet op het scherm.
  const zegKnoppen = i => (typeof Voorlees !== 'undefined' && Voorlees.ok
    ? `<span class="pf-zeg"><button type="button" class="pf-zeg-knop" data-zeg="${i}" title="Luister" aria-label="Luister">🎧</button><button type="button" class="pf-zeg-knop traag" data-zeg="${i}" data-traag="1" title="Trager voorlezen" aria-label="Trager voorlezen">🐢</button></span>`
    : '<span class="pf-zeg muted small">(voorlezen werkt niet in deze browser)</span>');

  // Dictee: per woord of zin 🎧 en een lijn om te schrijven. Bij het verbeteren staan de foute woorden in het rood.
  function dicteeHtml(q, a, o, live, print) {
    const zinnen = q.vorm === 'zinnen';
    const ant = Array.isArray(a) ? a : [];
    if (print) return `<p class="pf-tip">${zinnen ? 'De leerkracht leest de zinnen voor. Schrijf elke zin op een lijn.' : 'De leerkracht leest de woorden voor. Schrijf elk woord op een lijn.'}</p><ol class="pf-dictee-print ${zinnen ? 'zinnen' : 'woorden'}">${q.delen.map((_, i) => `<li><b class="pf-dictee-nr">${i + 1}.</b><span class="pf-dictee-lijn"></span></li>`).join('')}</ol>`;
    const sl = o.sleutel && typeof o.sleutel[q.id] === 'string' && typeof PfKern !== 'undefined' ? o.sleutel[q.id].split('\n') : null;
    const gekleurd = i => {
      const t = String(ant[i] || '').trim();
      if (!t) return '<span class="muted">—</span>';
      if (!sl || sl[i] === undefined) return esc(t);
      if (!zinnen) return `<span class="${PfKern.dicteeDeel(q, { tekst: sl[i] }, t) ? 'pf-d-goed' : 'pf-d-fout'}">${esc(t)}</span>`;
      return PfKern.dicteeVergelijk(q, sl[i], t).woorden.map(([w, goed]) => `<span class="${goed ? 'pf-d-goed' : 'pf-d-fout'}">${esc(w)}</span>`).join(' ');
    };
    const tip = live ? `<p class="pf-tip">${zinnen ? 'Tik op 🎧 en schrijf de zin die je hoort. Met 🐢 klinkt het trager.' : 'Tik op 🎧 en schrijf het woord dat je hoort. Met 🐢 klinkt het trager.'}</p>` : '';
    return `${tip}<ol class="pf-dictee-lijst ${zinnen ? 'zinnen' : 'woorden'}">${q.delen.map((d, i) => `<li><b class="pf-dictee-nr">${i + 1}.</b>${live ? zegKnoppen(o.said.push(d.zeg) - 1) : ''}${live
      ? `<input class="ob-field pf-in pf-dictee-in" data-i="${i}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="${zinnen ? `Zin ${i + 1}` : `Woord ${i + 1}`}" value="${esc(ant[i] || '')}">`
      : `<span class="pf-dictee-ant">${gekleurd(i)}</span>`}${sl && sl[i] !== undefined && !live ? `<small class="pf-dictee-juist">✔ ${esc(sl[i])}</small>` : ''}</li>`).join('')}</ol>`;
  }

  function vraagHtml(q, nr, o) {
    const a = o.answers[q.id];
    const live = o.mode === 'live';
    const print = o.mode === 'print';
    const dis = live ? '' : ' disabled';
    const ro = live ? '' : ' readonly';
    const say = o.voorlees && !print && typeof Voorlees !== 'undefined' && Voorlees.ok
      ? `<button type="button" class="ob-say pf-say" data-say="${o.said.push([q.vraag, ...(q.opties || []).map((x, i) => `${L[i]}: ${x.tekst || ''}`)].filter(Boolean).join('\n')) - 1}" title="Lees voor" aria-label="Lees voor">🔊</button>` : '';
    const luister = q.audio && !print ? `<button type="button" class="pf-luister" data-src="${esc(q.audio)}" title="Luister naar de uitleg" aria-label="Luister">🎧</button>` : '';
    // Een tekst om voor te lezen: de leerling hoort ze (🎧, of trager met 🐢) maar ziet ze niet. Op papier leest de leerkracht voor.
    const zeg = q.voorlees && !print ? zegKnoppen(o.said.push(q.voorlees) - 1) : '';
    const got = o.punten && o.punten[q.id];
    let h = `<div class="pf-q pf-${q.type}" data-id="${esc(q.id)}" data-type="${q.type}">
      <h3><span class="pf-nr">${esc(nr)}</span>${say}${luister}${zeg}<span class="pf-vraag">${esc(q.vraag || '').replace(/\n/g, '<br>')}</span>
      <small class="pf-ptn">${got ? `<b>${nl(got[0] ?? '?')}</b> / ${nl(got[1])}` : `/ ${nl(q.punten)}`}</small></h3>`;
    if (q.type === 'blad') return `${h}${bladHtml(q, a, o)}</div>`;
    if (q.voorlees && print) h += '<p class="pf-tip">🎧 De leerkracht leest dit voor.</p>';
    if (q.beeld && q.type !== 'aanduiden') h += `<img class="pf-beeld" src="${esc(q.beeld)}" alt="" loading="lazy">`;
    if (q.type === 'meerkeuze') {
      const gekozen = new Set([].concat(a ?? []).map(String));
      if (q.meer) h += `<p class="pf-tip">${q.aantal ? `Duid er ${q.aantal} aan.` : 'Er zijn meerdere juiste antwoorden. Duid ze allemaal aan.'}</p>`;
      h += `<div class="pf-keuzes${q.opties.some(x => x.beeld) ? ' met-beeld' : ''}">${q.opties.map((x, i) => print
        ? `<div class="pf-keuze-print"><span class="ob-check">${L[i]}</span>${x.beeld ? `<img src="${esc(x.beeld)}" alt="">` : ''} ${esc(x.tekst)}</div>`
        : `<button type="button" class="pf-keuze${gekozen.has(String(i)) ? ' on' : ''}" data-value="${i}"${dis}><b>${L[i]}</b>${x.beeld ? `<img src="${esc(x.beeld)}" alt="">` : ''}<span>${esc(x.tekst)}</span></button>`).join('')}</div>`;
    } else if (q.type === 'juistfout' && q.stellingen) {
      // Meerdere stellingen: per stelling juist of fout (of ja of nee).
      const lab = q.labels === 'janee' ? { J: 'Ja', F: 'Nee' } : { J: 'Juist', F: 'Fout' };
      const ant = Array.isArray(a) ? a : [];
      h += `<div class="pf-stellingen">${q.stellingen.map((t, i) => `<div class="pf-stelling" data-i="${i}"><span class="pf-stelling-tekst">${i + 1}. ${esc(t)}</span><span class="pf-stelling-keuze">${['J', 'F'].map(v => (print
        ? `<span class="pf-keuze-print"><span class="ob-check"></span> ${lab[v]}</span>`
        : `<button type="button" class="pf-jf${ant[i] === v ? ' on' : ''}" data-value="${v}"${dis}>${v === 'J' ? '✔' : '✖'} ${lab[v]}</button>`)).join('')}</span></div>`).join('')}</div>`;
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
      // Met een rekenrooster: de bewerking in hokjes, één cijfer per hokje (zoals op ruitjespapier).
      const werk = q.kol ? `<div class="pf-werk">Bewerking: reken uit in het rooster (één cijfer per hokje)${roosterHtml(w.werk, q.kol, q.rij, live, 'pf-rooster-los')}</div>`
        : `<label class="pf-werk">Bewerking (hoe reken je het uit?)<textarea class="ob-field pf-werkveld" rows="4"${ro}>${esc(w.werk || '')}</textarea></label>`;
      h += print ? `${q.kol ? `<div class="pf-werk">Bewerking:${roosterHtml('', q.kol, q.rij, false, 'pf-rooster-los')}</div>` : '<div class="pf-werkvak">Bewerking:</div>'}<p class="pf-antwoordlijn">Uitkomst: ${q.breuk ? breukPrint() : '<span class="ob-line" style="min-width:6em"></span>'} ${esc(q.eenheid || '')}</p>`
        : `${werk}
          <p class="pf-kort">Uitkomst: ${q.breuk ? breukHtml(w.uitkomst, ro, 'pf-uitkomst') : `<input class="ob-field pf-uitkomst" autocomplete="off" spellcheck="false" value="${esc(w.uitkomst || '')}"${ro}>`}${q.eenheid ? `<span class="pf-eenheid">${esc(q.eenheid)}</span>` : ''}</p>`;
    } else if (q.type === 'verbinden') {
      if (print) {
        h += `<div class="ob-match-print"><ol>${q.links.map(l => `<li><span class="ob-box"></span> ${esc(l)}</li>`).join('')}</ol><ul>${q.rechts.map((r, j) => `<li><b>${L[j]}</b> ${esc(r)}</li>`).join('')}</ul></div>`;
      } else {
        h += `<div class="ob-match">${q.links.map((l, i) => `<label><span>${esc(l)}</span><select class="ob-field pf-sel" data-k="${i}"${dis}><option value="">kies…</option>${q.rechts.map((r, j) => `<option value="${j}"${a && String(a[i]) === String(j) ? ' selected' : ''}>${L[j]}. ${esc(r)}</option>`).join('')}</select></label>`).join('')}</div>`;
      }
    } else if (q.type === 'ordenen') {
      const order = Array.isArray(a) && a.length === q.items.length ? a : q.items.map((_, i) => i);
      // Een item is tekst of { tekst, beeld } (een prent).
      const item = x => (typeof x === 'string' ? `<span>${esc(x)}</span>` : `${x.beeld ? `<img src="${esc(x.beeld)}" alt="" draggable="false">` : ''}<span>${esc(x.tekst || '')}</span>`);
      const prenten = q.items.some(x => typeof x !== 'string' && x.beeld);
      // Prenten op papier: vaste door-elkaar-volgorde, anders staat de oplossing er al (tekst blijft zoals vroeger).
      const papierOrde = prenten ? schudVast(q.items.length, String(q.vraag || '') + q.items.length) : q.items.map((_, i) => i);
      h += print ? `<p class="pf-tip">Zet de juiste volgorde: 1, 2, 3, …</p><ul class="pf-orden-print${prenten ? ' met-beeld' : ''}">${papierOrde.map(i => `<li><span class="ob-box"></span> ${item(q.items[i])}</li>`).join('')}</ul>`
        : `<p class="pf-tip">${prenten ? 'Sleep de kaartjes in de juiste volgorde (of gebruik de pijltjes).' : 'Zet in de juiste volgorde met de pijltjes.'}</p><ol class="pf-orden${prenten ? ' met-beeld' : ''}">${order.map(i => `<li data-i="${i}">${live ? '<span class="pf-greep" aria-hidden="true">⠿</span>' : ''}${item(q.items[i])}${live ? (prenten ? '<span class="pf-orden-knoppen"><button type="button" class="secondary pf-op" aria-label="Naar voren">◀</button><button type="button" class="secondary pf-neer" aria-label="Naar achteren">▶</button></span>' : '<button type="button" class="secondary pf-op" aria-label="Omhoog">▲</button><button type="button" class="secondary pf-neer" aria-label="Omlaag">▼</button>') : ''}</li>`).join('')}</ol>`;
    } else if (q.type === 'sorteren') {
      h += sorteerHtml(q, a, live, print);
    } else if (q.type === 'dictee') {
      h += dicteeHtml(q, a, o, live, print);
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
      // De juiste plekken: bij de toets apart meegegeven (zones), bij een oefenblad als sleutel.
      const sl = o.sleutel && o.sleutel[q.id];
      const zones = (o.zones && o.zones[q.id]) || (Array.isArray(sl) ? sl : []);
      const beeld = q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : '<span class="muted">Nog geen afbeelding</span>';
      const zoneHtml = zones.map(z => `<i class="pf-zone" style="left:${z.x}%;top:${z.y}%;width:${z.r * 2}%;">${z.naam ? `<b class="pf-zone-naam">${esc(z.naam)}</b>` : ''}</i>`).join('');
      if (q.namen) {
        // Namen op de kaart: tik een naam aan en dan de plek. Elke naam heeft zijn eigen speld.
        const b = Array.isArray(a) ? a : [];
        const tip = print ? 'Schrijf elke naam op de juiste plek.' : live ? 'Tik op een naam en dan op de juiste plek op de afbeelding.' : '';
        h += `${tip ? `<p class="pf-tip">${tip}</p>` : ''}
          <div class="pf-namen">${q.namen.map(x => (print ? `<span class="pf-naam">${esc(x.t)}</span>` : `<button type="button" class="pf-naam${b[x.n] ? ' gezet' : ''}" data-n="${x.n}"${live ? '' : ' disabled'}>${esc(x.t)}</button>`)).join('')}</div>
          <div class="pf-kaart${live ? ' live' : ''}" style="aspect-ratio:${1 / (q.verhouding || 0.75)}">${beeld}${zoneHtml}
          ${print ? '' : q.namen.map(x => (b[x.n] ? `<span class="pf-speld" data-n="${x.n}" style="left:${b[x.n].x}%;top:${b[x.n].y}%">${esc(x.t)}</span>` : '')).join('')}</div>`;
      } else {
        const pt = a && typeof a === 'object' && !Array.isArray(a) ? a : null;
        h += `${print ? '<p class="pf-tip">Zet een kruisje op de juiste plek.</p>' : '<p class="pf-tip">Tik op de juiste plek op de afbeelding.</p>'}
          <div class="pf-kaart${live ? ' live' : ''}" style="aspect-ratio:${1 / (q.verhouding || 0.75)}">${beeld}${zoneHtml}
          ${pt ? `<i class="pf-pin" style="left:${pt.x}%;top:${pt.y}%"></i>` : ''}</div>`;
      }
    } else if (q.type === 'getallenas') {
      h += `<p class="pf-tip">${print ? 'Zet een pijltje op de juiste plek.' : 'Tik op de getallenas waar het getal ligt.'}</p>${asHtml(q, a, live)}`;
    } else if (q.type === 'markeren' && !q.per && !q.inBron && !q.kleuren && !q.aantal) {
      // Zoals altijd: losse woorden in één kleur.
      const on = new Set([].concat(a ?? []).map(Number));
      h += `<p class="pf-tip">${print ? 'Onderstreep de juiste woorden.' : 'Tik op de woorden om ze aan te duiden. Nog eens tikken haalt het weg.'}</p>
        <p class="pf-markeer${live ? ' live' : ''}">${q.stukken.map(x => (x.w === undefined ? esc(x.t).replace(/\n/g, '<br>') : `<span class="pf-woord${on.has(x.w) ? ' on' : ''}" data-w="${x.w}"${live ? ' role="button" tabindex="0"' : ''}>${esc(x.t)}</span>`)).join('')}</p>`;
    } else if (q.type === 'markeren') {
      h += markeerVraag(q, a, o);
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
    if (o.sleutel && q.type !== 'dictee' && !Array.isArray(o.sleutel[q.id]) && String(o.sleutel[q.id] || '').trim()) h += `<p class="pf-sleutel">✔ ${esc(o.sleutel[q.id]).replace(/\n/g, '<br>')}</p>`;
    return `${h}</div>`;
  }

  // ---------- Aanduiden in een tekst: woorden, zinnen of stukjes, in één of meer kleuren ----------
  // Een aanduiding: [nummer, kleur] (woord of zin) of [eerste woord, laatste woord, kleur] (stuk). Een los getal is kleur 1.
  const STIFT = '#ffe14d';
  const RAND = '#b08f00';
  function markLijst(a, per) {
    return [].concat(a ?? []).map(x => (Array.isArray(x) ? x.map(Number) : per === 'stuk' ? [Number(x), Number(x), 1] : [Number(x), 1]));
  }
  // Welke kleur krijgt elk woord (w) en elk stukje tussen twee woorden (n)?
  function markKleuren(stukken, per, lijst) {
    const woord = new Map();
    const tus = new Map();
    const zin = new Map(stukken.filter(x => x.w !== undefined).map(x => [x.w, x.z]));
    if (per === 'stuk') for (const [x, y, k] of lijst) for (let i = x; i <= y; i++) { woord.set(i, k); if (i < y) tus.set(i, k); }
    else if (per === 'zin') {
      const kz = new Map(lijst.map(([z, k]) => [z, k]));
      for (const [w, z] of zin) if (kz.has(z)) { woord.set(w, kz.get(z)); if (zin.get(w + 1) === z) tus.set(w, kz.get(z)); }
    } else for (const [w, k] of lijst) woord.set(w, k);
    return { woord, tus };
  }
  // De tekst om aan te duiden. hex: de kleuren (1, 2, ...); sleutel: wat juist is (een stippellijn in de juiste kleur).
  function markTekst(stukken, per, lijst, { hex = [STIFT], rand = [RAND], sleutel = null, live = false, start = null } = {}) {
    const kl = markKleuren(stukken, per, lijst);
    const sl = sleutel ? markKleuren(stukken, per, sleutel) : null;
    const stijl = (map, i, sMap) => {
      const k = map.get(i);
      const s = sMap && sMap.get(i);
      return `${k ? `background:${hex[k - 1] || STIFT};color:#1d1d1f;` : ''}${s ? `box-shadow:inset 0 -3px 0 ${rand[s - 1] || RAND};` : ''}`;
    };
    return stukken.map(x => {
      if (x.w === undefined) {
        const t = esc(x.t).replace(/\n/g, '<br>');
        if (x.n === undefined) return t;
        const st = stijl(kl.tus, x.n, sl && sl.tus);
        return st ? `<span class="pf-tus" style="${st}">${t}</span>` : t;
      }
      const st = stijl(kl.woord, x.w, sl && sl.woord);
      return `<span class="pf-woord${kl.woord.has(x.w) ? ' on' : ''}${start === x.w ? ' start' : ''}" data-w="${x.w}" data-z="${x.z}"${st ? ` style="${st}"` : ''}${live ? ' role="button" tabindex="0"' : ''}>${esc(x.t)}</span>`;
    }).join('');
  }
  // Op papier: wat de leerling doet (kleuren of onderstrepen), in hele zinnen (zo kan elke zin vertaald worden).
  const OP_PAPIER = {
    woord: ['Onderstreep de juiste woorden.', 'Kleur de juiste woorden.', 'Onderstreep de juiste woorden in de tekst.', 'Kleur de juiste woorden in de tekst.'],
    zin: ['Onderstreep de juiste zinnen.', 'Kleur de juiste zinnen.', 'Onderstreep de juiste zinnen in de tekst.', 'Kleur de juiste zinnen in de tekst.'],
    stuk: ['Onderstreep de juiste stukken tekst.', 'Kleur de juiste stukken tekst.', 'Onderstreep de juiste stukken tekst in de tekst.', 'Kleur de juiste stukken tekst in de tekst.'],
  };
  const HOE = {
    woord: 'Tik op de woorden om ze aan te duiden.',
    zin: 'Tik op een zin om ze aan te duiden.',
    stuk: 'Sleep over de woorden, of tik het eerste en dan het laatste woord aan.',
  };
  const markTip = (q, print) => {
    const zin = t => `<span>${t}</span>`;
    const per = q.per || 'woord';
    const delen = q.aantal ? [zin(`Duid er ${q.aantal} aan.`)] : [];
    if (print) return [...delen, zin(OP_PAPIER[per][(q.kleuren ? 1 : 0) + (q.inBron ? 2 : 0)])].join(' ');
    if (q.kleuren && q.kleuren.length > 1) delen.push(zin('Kies eerst een kleur.'));
    delen.push(zin(HOE[per]), zin('Nog eens tikken haalt het weg.'));
    return delen.join(' ');
  };
  // De stiften: de leerling kiest een kleur. Met één kleur staat alleen de uitleg erbij.
  const stiftenHtml = (q, live, print) => (q.kleuren ? `<div class="pf-stiften">${q.kleuren.map((c, i) => (print || !live || q.kleuren.length === 1
    ? `<span class="pf-stift-uitleg"><i style="background:${c.hex}"></i>${esc(c.kleur)}${c.uitleg ? ` = ${esc(c.uitleg)}` : ''}</span>`
    : `<button type="button" class="pf-stift${i === 0 ? ' on' : ''}" data-k="${i + 1}" style="--stift:${c.hex}"><i></i>${esc(c.kleur)}${c.uitleg ? ` = ${esc(c.uitleg)}` : ''}</button>`)).join('')}</div>` : '');
  function markeerVraag(q, a, o) {
    const live = o.mode === 'live';
    const print = o.mode === 'print';
    const hex = q.kleuren ? q.kleuren.map(c => c.hex) : [STIFT];
    const rand = q.kleuren ? q.kleuren.map(c => c.rand) : [RAND];
    const lijst = markLijst(a, q.per);
    const sl = o.zones && Array.isArray(o.zones[q.id]) ? o.zones[q.id] : null;
    let h = `<p class="pf-tip">${markTip(q, print)}</p>${stiftenHtml(q, live, print)}`;
    if (live) o.mk[q.id] = { per: q.per || 'woord', stukken: q.inBron ? o.bronStukken || [] : q.stukken, hex, rand, inBron: !!q.inBron, aantal: q.aantal || 0 };
    if (q.inBron) {
      // In de bron: de leerling duidt links aan. Bekijken en verbeteren: de tekst staat hier, met wat de leerling aanduidde.
      if (live) return `${h}<p class="pf-inbron"><button type="button" class="secondary small-btn pf-inbron-knop">👈 Duid aan in de tekst</button> <span class="pf-inbron-tel"></span></p>`;
      if (print || !o.bronStukken) return h;
      return `${h}<div class="pf-markeer pf-markeer-kopie">${markTekst(o.bronStukken, q.per, lijst, { hex, rand, sleutel: sl })}</div>`;
    }
    if (print) return `${h}<p class="pf-markeer${q.per ? ` per-${q.per}` : ''}">${markTekst(q.stukken, q.per, sl || [], { hex, rand })}</p>`;
    return `${h}<p class="pf-markeer${live ? ' live' : ''}${q.per ? ` per-${q.per}` : ''}">${markTekst(q.stukken, q.per, lijst, { hex, rand, sleutel: sl, live })}</p>`;
  }

  // Sorteren in kolommen: de woorden bovenaan, de kolommen eronder. Tik een woord en dan een kolom (of sleep het).
  // Het antwoord: per woord het nummer van de kolom of null.
  function sorteerHtml(q, a, live, print) {
    const b = Array.isArray(a) ? a : [];
    if (print) {
      return `<p class="pf-tip">Schrijf elk woord in de juiste kolom.</p><p class="pf-sorteer-woorden">${q.woorden.map(w => `<span>${esc(w)}</span>`).join(' · ')}</p>
        <div class="pf-tabel-wrap"><table class="pf-tabel pf-sorteer-print"><tr>${q.kolommen.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${`<tr>${q.kolommen.map(() => '<td class="pf-leeg"></td>').join('')}</tr>`.repeat(Math.max(2, q.rijen || 3))}</table></div>`;
    }
    const kaart = i => `<button type="button" class="pf-sorteer-w" data-i="${i}"${live ? ' draggable="true"' : ' disabled'}>${esc(q.woorden[i])}</button>`;
    const los = q.woorden.map((_, i) => i).filter(i => !Number.isInteger(b[i]));
    return `${live ? '<p class="pf-tip">Tik op een woord en dan op de juiste kolom (of sleep het). Tik op een woord in een kolom om het terug te leggen.</p>' : ''}
      <div class="pf-sorteer-bank" data-k="">${los.map(kaart).join('')}</div>
      <div class="pf-sorteer-kols" style="--kols:${q.kolommen.length}">${q.kolommen.map((k, ki) => `<div class="pf-sorteer-kol" data-k="${ki}"><b>${esc(k)}</b><div class="pf-sorteer-in">${q.woorden.map((_, i) => i).filter(i => b[i] === ki).map(kaart).join('')}</div></div>`).join('')}</div>`;
  }
  function wireSorteer(el, klaar) {
    let gekozen = null;
    const kies = b => {
      gekozen = gekozen === b ? null : b;
      for (const x of el.querySelectorAll('.pf-sorteer-w')) x.classList.toggle('on', x === gekozen);
      el.classList.toggle('kiest', !!gekozen);
    };
    const zet = (b, doel) => {
      const vak = doel.classList.contains('pf-sorteer-kol') ? doel.querySelector('.pf-sorteer-in') : doel;
      vak.appendChild(b);
      kies(null);
      klaar();
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('.pf-sorteer-w');
      const kol = e.target.closest('.pf-sorteer-kol, .pf-sorteer-bank');
      if (b && gekozen === null && b.closest('.pf-sorteer-kol')) return zet(b, el.querySelector('.pf-sorteer-bank'));
      if (b && (!gekozen || b.closest('.pf-sorteer-bank'))) return kies(b);
      if (kol && gekozen) zet(gekozen, kol);
    });
    el.addEventListener('dragstart', e => { const b = e.target.closest('.pf-sorteer-w'); if (b) { kies(b); e.dataTransfer.setData('text/x-pf', b.dataset.i); } });
    for (const d of el.querySelectorAll('.pf-sorteer-kol, .pf-sorteer-bank')) {
      d.addEventListener('dragover', e => e.preventDefault());
      d.addEventListener('drop', e => { e.preventDefault(); const b = el.querySelector(`.pf-sorteer-w[data-i="${e.dataTransfer.getData('text/x-pf')}"]`); if (b) zet(b, d); });
    }
  }
  // Ordenen: een kaartje slepen aan het greepje (ook met een vinger), de pijltjes blijven ook werken.
  function wireOrden(lijst, klaar) {
    let sleep = null;
    lijst.addEventListener('pointerdown', e => {
      const g = e.target.closest(e.pointerType === 'mouse' ? '.pf-greep,img,li>span' : '.pf-greep,li>img');
      const li = g && g.closest('li');
      if (!li || e.target.closest('button')) return;
      sleep = li;
      li.classList.add('sleept');
      lijst.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    lijst.addEventListener('pointermove', e => {
      if (!sleep) return;
      const over = [...lijst.children].find(li => { const r = li.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (!over || over === sleep) return;
      const r = over.getBoundingClientRect();
      const voor = lijst.classList.contains('met-beeld') && r.width < lijst.getBoundingClientRect().width * 0.6 ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      lijst.insertBefore(sleep, voor ? over : over.nextSibling);
    });
    const los = () => { if (!sleep) return; sleep.classList.remove('sleept'); sleep = null; klaar(); };
    lijst.addEventListener('pointerup', los);
    lijst.addEventListener('pointercancel', los);
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

  // Een rekenrooster: kol hokjes breed, rij hokjes hoog, één teken per hokje (een cijfer met een komma mag samen: 7,).
  // De waarde is tekst: één regel per rij; staat er ergens een hokje met twee tekens, dan staat er | tussen de hokjes.
  function roosterCellen(v, kol, rij) {
    const rijen = String(v || '').split('\n');
    return Array.from({ length: rij }, (_, r) => { const t = (rijen[r] || '').includes('|') ? rijen[r].split('|') : Array.from(rijen[r] || ''); return Array.from({ length: kol }, (__, c) => (t[c] || ' ').trim()); });
  }
  function roosterHtml(v, kol, rij, live, kl = '', stijl = '') {
    const cellen = roosterCellen(v, kol, rij);
    return `<div class="pf-rooster ${kl}" data-kol="${kol}" style="--kol:${kol};--rij:${rij};${stijl}">${cellen.map((r, ri) => r.map((c, ci) => (live
      ? `<input class="pf-cel" data-r="${ri}" data-c="${ci}" maxlength="2" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Rij ${ri + 1}, hokje ${ci + 1}" value="${esc(c)}">`
      : `<span class="pf-cel">${esc(c)}</span>`)).join('')).join('')}</div>`;
  }
  const celWaarde = v => { const t = String(v || '').trim().replace(/\|/g, ''); return /^(\d[,.]|[,.]\d)$/.test(t) ? t : t.slice(-1); };
  function roosterWaarde(el) {
    const kol = Number(el.dataset.kol) || 1;
    const cellen = [...el.querySelectorAll('.pf-cel')].map(i => celWaarde(i.value) || ' ');
    const rijen = [];
    for (let i = 0; i < cellen.length; i += kol) {
      const r = cellen.slice(i, i + kol);
      if (r.some(c => c.length > 1)) { while (r.length && !r[r.length - 1].trim()) r.pop(); rijen.push(r.map(c => c.trim()).join('|')); } else rijen.push(r.join(''));
    }
    while (rijen.length && !rijen[rijen.length - 1].replace(/\|/g, '').trim()) rijen.pop();
    return rijen.length ? rijen.join('\n') : '';
  }
  // Typen in het rooster: één teken per hokje, dan door naar het volgende. Wie van rechts naar links schrijft
  // (de uitkomst bij het cijferen), gaat vanzelf naar links. Pijltjes, Enter (een rij lager) en Backspace werken ook.
  function wireRooster(r) {
    const kol = Number(r.dataset.kol) || 1;
    const cel = i => r.querySelectorAll('.pf-cel')[i];
    const index = i => Number(i.dataset.r) * kol + Number(i.dataset.c);
    r.addEventListener('input', e => {
      const i = e.target;
      if (!i.classList.contains('pf-cel')) return;
      i.value = celWaarde(i.value);
      if (!i.value) return;
      const c = Number(i.dataset.c);
      const n = index(i);
      const rechts = c < kol - 1 ? cel(n + 1) : null;
      const links = c > 0 ? cel(n - 1) : null;
      const doel = (!rechts || rechts.value.trim()) && links && !links.value.trim() ? links : rechts;
      if (doel) { doel.focus(); doel.select(); }
    });
    r.addEventListener('keydown', e => {
      const i = e.target;
      if (!i.classList.contains('pf-cel')) return;
      const n = index(i);
      const c = Number(i.dataset.c);
      let doel = null;
      if (e.key === 'ArrowLeft' && c > 0) doel = cel(n - 1);
      else if (e.key === 'ArrowRight' && c < kol - 1) doel = cel(n + 1);
      else if (e.key === 'ArrowUp') doel = cel(n - kol);
      else if (e.key === 'ArrowDown' || e.key === 'Enter') doel = cel(n + kol);
      else if (e.key === 'Backspace' && !i.value && c > 0) doel = cel(n - 1);
      if (e.key === 'Enter') e.preventDefault();
      if (!doel) return;
      e.preventDefault();
      doel.focus();
      doel.select();
    });
    r.addEventListener('focusin', e => { if (e.target.classList.contains('pf-cel')) e.target.select(); });
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
    // De vakjes zoals in de toets (met de juiste lijnen en cirkels), alleen voor de leerkracht: zones[id].
    const vormen = o.zones && Array.isArray(o.zones[q.id]) ? o.zones[q.id] : null;
    // Bij verbeteren: per vakje ✔ of ✘, de leerkracht klikt om het om te draaien.
    const oordeel = o.vakken && o.vakken[q.id];
    const velden = q.velden.map((f, k) => {
      const pos = `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;font-size:max(9px,${Math.round(Math.min(f.h * v * 0.62, 2.2) * 100) / 100}cqw)`;
      // Met een oordeel (verbeteren) alleen de sleutel bij een fout vakje, anders staat alles vol rood.
      // Bij aanduiden toont de sleutel de juiste plek als cirkel (als het vak die kent).
      const zone = sleutel && f.soort === 'plek' && f.doel ? `<i class="pf-plek-doel" style="left:${f.x + (f.doel.x * f.w) / 100}%;top:${f.y + (f.doel.y * f.h) / 100}%;width:${(2 * f.doel.r * f.w) / 100}%"></i>` : '';
      const zoneLijn = sleutel && f.soort === 'lijn' && f.naar ? `<i class="pf-plek-doel" style="left:${f.naar.x}%;top:${f.naar.y}%;width:${2 * (f.r || 3)}%"></i>` : '';
      // Kladruimte telt niet mee: niet op papier, en geen sleutel.
      if (f.soort === 'klad' && print) return '';
      if (f.soort === 'veelhoek' && print) return veldEl(f, k, pos, null) + (sleutel && sleutel[k] ? `<span class="pf-veld-sleutel" style="left:${f.x}%;top:${f.y + f.h}%;max-width:${Math.max(f.w, 100 - f.x)}%">${esc(sleutel[k])}</span>` : '');
      if ((f.soort === 'puntlijn' || f.soort === 'cirkel') && print) return sleutel ? veldEl(f, k, pos, null) + (sleutel[k] ? `<span class="pf-veld-sleutel" style="left:${f.x}%;top:${f.y + f.h}%;max-width:${Math.max(f.w, 100 - f.x)}%">${esc(sleutel[k])}</span>` : '') : '';
      // De sleutel van een rekenrooster op papier: het rooster zelf, ingevuld.
      if (f.soort === 'rooster' && print && sleutel && vormen && vormen[k] && vormen[k].sleutel && vormen[k].nakijk !== 'uitkomst') {
        const cel = Math.round(Math.min((f.h / (f.rij || 4)) * v, f.w / (f.kol || 8)) * 0.62 * 100) / 100;
        return roosterHtml(vormen[k].sleutel, f.kol || 8, f.rij || 4, false, 'pf-veld rooster pf-rooster-sleutel', `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;font-size:max(8px,${cel}cqw)`);
      }
      if (f.soort === 'plek' && print) return zone;
      if (f.soort === 'lijn' && print) return `<span class="pf-veld lijn" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%"></span>${zoneLijn}`;
      // Een lang antwoord loopt verder dan het vakje (naar rechts en naar onder), zodat er niets wegvalt.
      const s = f.soort === 'plek' ? zone : f.soort === 'lijn' ? zoneLijn : f.soort === 'klad' ? '' : sleutel && sleutel[k] && !(oordeel && oordeel.goed[k] !== false) ? `<span class="pf-veld-sleutel${b[k] ? '' : ' in'}" style="left:${f.x}%;top:${b[k] ? f.y + f.h : f.y}%;max-width:${Math.max(f.w, 100 - f.x)}%;${b[k] ? '' : `min-width:${f.w}%;min-height:${f.h}%;`}">${gemengd(esc(sleutel[k])).replace(/\n/g, '<br>')}</span>` : '';
      if (f.soort === 'vlak') return `<i class="pf-vlak" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;background:${esc(f.kleur || '#fff')}"></i>`;
      if (f.soort === 'notitie') return `<span class="pf-notitie" style="${pos}">${esc(f.tekst || '').replace(/\n/g, '<br>')}</span>`;
      if (print) return (f.soort === 'rooster' ? veldEl(f, k, pos, null) : '') + s;
      const g = oordeel ? oordeel.goed[k] : null;
      // Een lang antwoord groeit naar rechts: dan staat het ✔ / ✘ links van het vakje, en de sleutel onder het antwoord.
      const vol = isVol(f, k);
      const knop = g === null || g === undefined ? '' : `<button type="button" class="pf-vak-oordeel ${g ? 'goed' : 'fout'}${oordeel.zelf[k] !== undefined ? ' zelf' : ''}${vol ? ' links' : ''}" data-id="${esc(q.id)}" data-k="${k}" style="left:${vol ? f.x : f.x + f.w}%;top:${f.y}%" title="Klik om ${g ? 'fout' : 'goed'} te zetten">${g ? '✔' : '✘'}</button>`;
      const tag = f.samen && !live ? `<span class="pf-samen-tag" style="left:${f.x}%;top:${f.y}%" title="Telt samen met de andere vakjes van groepje ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(f.samen - 1) % 26]}">🔗${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(f.samen - 1) % 26]}</span>` : '';
      if (vol) return veldEl(f, k, pos, g, s ? sleutel[k] : '') + knop + tag;
      return veldEl(f, k, pos, g) + knop + tag + s;
    }).join('');
    // Verbinden: de lijnen van de leerling (en bij de sleutel de juiste lijn, gestreept).
    const lijnen = q.velden.map((f, k) => {
      if (f.soort !== 'lijn') return '';
      const x1 = f.x + f.w / 2;
      const y1 = f.y + f.h / 2;
      const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(String(b[k] || ''));
      return (sleutel && f.naar ? `<line class="sleutel" x1="${x1}" y1="${y1}" x2="${f.naar.x}" y2="${f.naar.y}" vector-effect="non-scaling-stroke"/>` : '')
        + (m && !print ? `<line class="ant" data-k="${k}" x1="${x1}" y1="${y1}" x2="${m[1]}" y2="${m[2]}" vector-effect="non-scaling-stroke"/>` : '');
    }).join('');
    const svg = q.velden.some(f => f.soort === 'lijn') ? `<svg class="pf-lijnen" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lijnen}</svg>` : '';
    const bank = bankHtml(q.bank, live, print);
    return `${live ? '<p class="pf-tip pf-blad-tip">Typ je antwoorden in de vakjes op het blad. <button type="button" class="link pf-groter">🔍 Groter</button> <button type="button" class="link pf-lat-knop">📏 Lat</button></p>' : ''}${bank}
      <div class="pf-blad-wrap"><div class="pf-blad-vel" data-schaal="${q.schaal || 21}" data-verhouding="${v}" style="aspect-ratio:${Math.round((1 / v) * 10000) / 10000}">${q.beeld ? `<img src="${esc(q.beeld)}" alt="" draggable="false">` : ''}${svg}${velden}</div></div>`;

    // Een getypt antwoord dat we helemaal tonen (bekijken en verbeteren), ook als het langer is dan het vakje.
    function isVol(f, k) {
      return !live && (f.soort === 'tekst' || f.soort === 'open') && b[k] !== undefined && b[k] !== null && typeof b[k] !== 'boolean' && String(b[k]).trim() !== '';
    }
    function veldEl(f, k, pos, g, sl = '') {
      const kl = g === true ? ' goed' : g === false ? ' fout' : '';
      if (f.soort === 'luister') return `<button type="button" class="pf-luister pf-blad-luister" ${f.audio ? `data-src="${esc(f.audio)}"` : `data-tekst="${esc(f.tekst || '')}"`} style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Luister" aria-label="Luister">🎧</button>`;
      if (f.soort === 'teken' || (f.soort === 'klad' && f.vorm === 'tekenen')) {
        const box = `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%`;
        const klad = f.soort === 'klad' ? ' klad' : '';
        if (live) return `<div class="pf-veld teken${klad}" data-k="${k}" style="${box}"></div>`;
        return `<div class="pf-veld teken kijk${klad}" data-k="${k}" style="${box}">${typeof b[k] === 'string' && b[k] ? `<img src="${esc(b[k])}" alt="">` : ''}</div>`;
      }
      if (f.soort === 'klad') return `<textarea class="pf-veld open klad" data-k="${k}" style="${pos}" spellcheck="false" placeholder="kladruimte" aria-label="Kladruimte (telt niet mee)"${ro}>${esc(b[k] ?? '')}</textarea>`;
      if (f.soort === 'puntlijn') return puntlijnHtml(f, k, g, kl);
      if (f.soort === 'cirkel') return cirkelHtml(f, k, kl);
      if (f.soort === 'veelhoek') return veelhoekHtml(f, k, kl);
      // Een bolletje (rond): één keuze per groep. Een hokje: aankruisen, ook meerdere.
      if (f.soort === 'kruis') return `<button type="button" class="pf-veld kruis${f.rond ? ' rond' : ''}${kl}${b[k] === true ? ' on' : ''}" data-k="${k}" data-g="${f.groep || 1}" style="${pos}" aria-label="${f.label ? esc(f.label) : 'Aankruisen'}"${live ? '' : ' disabled'}>${f.rond ? esc(f.label || '') : b[k] === true ? '✗' : esc(f.label || '')}</button>`;
      if (f.soort === 'breuk') {
        const [g, t, n] = breukDelen(b[k]);
        const st = `<input class="teller pf-breuk-in" inputmode="numeric" autocomplete="off" aria-label="Teller" value="${esc(t)}"${ro}><i></i><input class="noemer pf-breuk-in" inputmode="numeric" autocomplete="off" aria-label="Noemer" value="${esc(n)}"${ro}>`;
        // Met een geheel: een gemengd getal (1 3/4), het geheel links van de breuk.
        if (f.geheel) return `<span class="pf-veld breuk met-geheel${kl}" data-k="${k}" style="${pos}"><input class="geheel pf-breuk-in" inputmode="numeric" autocomplete="off" aria-label="Geheel (mag leeg)" value="${esc(g)}"${ro}><span class="pf-breuk-st">${st}</span></span>`;
        return `<span class="pf-veld breuk${kl}" data-k="${k}" style="${pos}">${st}</span>`;
      }
      if (f.soort === 'rooster') {
        const cel = Math.round(Math.min((f.h / (f.rij || 4)) * v, f.w / (f.kol || 8)) * 0.62 * 100) / 100;
        return roosterHtml(b[k], f.kol || 8, f.rij || 4, live, `pf-veld rooster${kl}`, `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;font-size:max(8px,${cel}cqw)`).replace('<div class="pf-rooster', `<div data-k="${k}" class="pf-rooster`);
      }
      if (f.soort === 'sleep') return `<button type="button" class="pf-veld sleep${kl}${b[k] ? ' vol' : ''}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="${pos}"${live ? '' : ' disabled'}>${esc(b[k] || '')}</button>`;
      if (f.soort === 'plek') {
        const [px, py] = String(b[k] || '').split(',').map(Number);
        return `<div class="pf-veld plek${kl}${live ? '' : ' kijk'}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Tik de juiste plek aan">${b[k] ? `<i class="pf-plek-pin" style="left:${px}%;top:${py}%"></i>` : ''}</div>`;
      }
      if (f.soort === 'lijn') return live ? `<button type="button" class="pf-veld lijn" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Sleep een lijn naar de juiste plek" aria-label="Verbinden"></button>` : `<span class="pf-veld lijn${kl}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%"></span>`;
      if (f.soort === 'kies') return `<select class="pf-veld kies${kl}" data-k="${k}" style="${pos}"${live ? '' : ' disabled'}><option value=""></option>${(f.opties || []).map(x => `<option${b[k] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      // Bekijken en verbeteren: het antwoord van de leerling helemaal, ook als het langer is dan het vakje.
      if (isVol(f, k)) {
        const groot = pos.replace(`width:${f.w}%;height:${f.h}%`, `min-width:${f.w}%;min-height:${f.h}%;max-width:${Math.max(f.w, 100 - f.x)}%`);
        return `<span class="pf-veld vol${f.soort === 'open' ? ' open' : ''}${kl}" data-k="${k}" style="${groot}"><span>${esc(b[k]).replace(/\n/g, '<br>')}</span>${sl ? `<span class="pf-vol-sleutel">${gemengd(esc(sl)).replace(/\n/g, '<br>')}</span>` : ''}</span>`;
      }
      if (f.soort === 'open') return `<textarea class="pf-veld open${kl}" data-k="${k}" style="${pos}" spellcheck="false"${ro}>${esc(b[k] ?? '')}</textarea>`;
      return `<input class="pf-veld${kl}" data-k="${k}" style="${pos}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(b[k] ?? '')}"${ro}>`;
    }
    // Lijnen tussen punten: de punten van de leerkracht, de lijnen van de leerling (en bij de sleutel de juiste, gestreept).
    function puntlijnHtml(f, k, g, kl) {
      const pt = f.pt || [];
      const lijn = (i, j, cls) => (pt[i] && pt[j] ? `<line class="${cls}" x1="${pt[i].x}" y1="${pt[i].y}" x2="${pt[j].x}" y2="${pt[j].y}" vector-effect="non-scaling-stroke"/>` : '');
      const eigen = print ? '' : String(b[k] || '').split(',').map(x => /^(\d+)-(\d+)$/.exec(x.trim())).filter(Boolean).map(m => lijn(Number(m[1]), Number(m[2]), 'ant')).join('');
      const kf = sleutel && vormen && vormen[k];
      const sl = kf && kf.lijnen ? kf.lijnen.map(([i, j]) => lijn(i, j, 'sleutel')).join('') : '';
      return `<div class="pf-veld puntlijn${kl}${live ? ' live' : ''}" data-k="${k}" data-waarde="${esc(b[k] || '')}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Sleep een lijn van punt naar punt">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${sl}${eigen}</svg>${pt.map((p, i) => (print && !(kf && kf.doorPunt === i) ? '' : `<i class="pf-pt${kf && kf.doorPunt === i ? ' door' : ''}" data-i="${i}" style="left:${p.x}%;top:${p.y}%"></i>`)).join('')}</div>`;
    }
    // Een veelhoek op roosterpunten: de stippen, en de figuur van de leerling (ze sluit vanzelf).
    function veelhoekHtml(f, k, kl) {
      const kol = f.kol || 6;
      const rij = f.rij || 5;
      let stippen = '';
      for (let r = 0; r < rij; r++) for (let c = 0; c < kol; c++) stippen += `<i class="pf-stip" data-c="${c}" data-r="${r}" style="left:${(c / (kol - 1)) * 100}%;top:${(r / (rij - 1)) * 100}%"></i>`;
      return `<div class="pf-veld veelhoek${kl}${live ? ' live' : ''}" data-k="${k}" data-waarde="${esc(print ? '' : b[k] || '')}" data-kol="${kol}" data-rij="${rij}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Tik de hoekpunten aan">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${veelhoekSvg(print ? '' : b[k], kol, rij)}</svg>${stippen}${live ? '<button type="button" class="pf-cirkel-terug" title="Laatste punt weg" aria-label="Laatste punt weg">↶</button>' : ''}</div>`;
    }
    // Een cirkel tekenen: vanuit het middelpunt slepen. De straal staat erbij in cm (volgens de schaal van het blad).
    function cirkelHtml(f, k, kl) {
      const schaal = q.schaal || 21;
      const eigen = print ? [] : String(b[k] || '').split(';').map(c => c.split(',').map(Number)).filter(c => c.length === 3 && c.every(Number.isFinite));
      const rond = (x, y, s, cls) => `<i class="pf-cirkel ${cls}" style="left:${x}%;top:${y}%;width:${Math.round(((2 * s) / f.w) * 10000) / 100}%"></i>`;
      const kf = sleutel && vormen && vormen[k];
      const sl = kf && kf.cirkels ? kf.cirkels.map(c => rond(c.x, c.y, (c.r / schaal) * 100, 'sleutel')).join('') : '';
      return `<div class="pf-veld cirkel${kl}${live ? ' live' : ''}" data-k="${k}" data-waarde="${esc(b[k] || '')}" data-w="${f.w}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%" title="Sleep vanuit het middelpunt">
        ${sl}${eigen.map(([x, y, s]) => rond(x, y, s, 'ant')).join('')}${live ? '<button type="button" class="pf-cirkel-terug" title="Laatste cirkel weg" aria-label="Laatste cirkel weg">↶</button>' : ''}</div>`;
    }
  }

  function pageHtml(p, i, o) {
    const nr = o.nummer ? String(i + 1) : '';
    if (p.type !== 'bron') return `<section class="pf-page">${vraagHtml(p, nr, o)}</section>`;
    o.bronStukken = p.stukken || null;
    const say = o.voorlees && o.mode !== 'print' && typeof Voorlees !== 'undefined' && Voorlees.ok
      ? `<button type="button" class="ob-say pf-say" data-say="${o.said.push([p.titel, p.tekst].filter(Boolean).join('\n')) - 1}" title="Lees voor" aria-label="Lees voor">🔊</button>` : '';
    return `<section class="pf-page pf-bron-page">
      <div class="pf-bron">${p.titel || say ? `<h3>${say}${esc(p.titel || 'Bron')}</h3>` : ''}${p.beeld ? `<img class="pf-beeld" src="${esc(p.beeld)}" alt="">` : ''}${p.stukken && o.mode === 'live'
    ? `<div class="pf-markeer pf-bron-tekst" data-bron="${esc(p.id)}">${markTekst(p.stukken, 'woord', [])}</div>` : paras(p.tekst)}</div>
      <div class="pf-deel">${p.vragen.map((q, j) => vraagHtml(q, `${nr}${'abcdefghijklmno'[j]}`, o)).join('')}</div>
    </section>`;
  }

  function render(box, pages, opts = {}) {
    const o = { mode: 'view', answers: {}, ...opts, said: [], mk: {} };
    box.innerHTML = pages.map((p, i) => pageHtml(p, opts.start !== undefined ? opts.start + i : i, o)).join('');
    box.pfSaid = o.said;
    box.pfMk = o.mk;
    box.pfAntwoorden = o.answers;
    if (o.said.length && !box.pfSayWired) {
      box.pfSayWired = true;
      box.addEventListener('click', e => {
        const b = e.target.closest('.pf-say');
        if (b) Voorlees.speak(box.pfSaid[b.dataset.say], b);
        const z = e.target.closest('.pf-zeg-knop');
        if (z) Voorlees.speak(box.pfSaid[z.dataset.zeg], z, { traag: !!z.dataset.traag });
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

  // Aanduiden in een tekst (woorden, zinnen of stukjes, met kleuren), ook in de tekst van een bron.
  // Het antwoord staat op het vraag-element (pfMark); de tekst wordt na elke tik opnieuw getekend.
  function wireMarkeer(box, el, mk, klaar) {
    el.pfMark = markLijst(box.pfAntwoorden && box.pfAntwoorden[el.dataset.id], mk.per).filter(x => x.every(Number.isInteger));
    el.pfMarkKleur = el.querySelector('.pf-stift') ? 1 : 0;
    let kleur = 1;
    let begin = null;
    const page = el.closest('.pf-page');
    const bronTekst = mk.inBron && page ? page.querySelector('.pf-bron-tekst') : null;
    const tekst = mk.inBron ? bronTekst : el.querySelector('.pf-markeer');
    if (!tekst) return;
    const actief = () => !mk.inBron || page.pfActief === el;
    const teken = () => {
      if (!actief()) return;
      tekst.innerHTML = markTekst(mk.stukken, mk.per, el.pfMark, { hex: mk.hex, rand: mk.rand, live: true, start: begin });
      const tel = el.querySelector('.pf-inbron-tel');
      if (tel) tel.textContent = el.pfMark.length ? `${el.pfMark.length} aangeduid` : '';
    };
    const zetActief = () => {
      if (!mk.inBron) return;
      page.pfActief = el;
      for (const x of page.querySelectorAll('.pf-q.pf-markeren')) x.classList.toggle('actief', x === el);
      tekst.pfVraag = el;
      teken();
    };
    for (const b of el.querySelectorAll('.pf-stift')) {
      b.addEventListener('click', () => {
        kleur = Number(b.dataset.k);
        for (const x of el.querySelectorAll('.pf-stift')) x.classList.toggle('on', x === b);
        zetActief();
      });
    }
    const knop = el.querySelector('.pf-inbron-knop');
    if (knop) knop.addEventListener('click', () => { zetActief(); tekst.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    if (mk.inBron) el.addEventListener('pointerdown', e => { if (!e.target.closest('button') || e.target.closest('.pf-stift')) zetActief(); });
    // Woorden en zinnen: aantikken (nog eens met dezelfde kleur = weg, met een andere kleur = die kleur).
    const tik = n => {
      const i = el.pfMark.findIndex(x => x[0] === n);
      if (i >= 0 && el.pfMark[i][1] === kleur) el.pfMark.splice(i, 1);
      else if (i >= 0) el.pfMark[i] = [n, kleur];
      else el.pfMark.push([n, kleur]);
      el.pfMark.sort((x, y) => x[0] - y[0]);
      teken();
      klaar();
    };
    // Een stuk: van woord x tot woord y. Wat ermee overlapt, valt weg. Een tik in een stuk met dezelfde kleur haalt het weg.
    const stuk = (x, y) => {
      const [a, b] = [Math.min(x, y), Math.max(x, y)];
      el.pfMark = el.pfMark.filter(m => m[1] < a || m[0] > b);
      el.pfMark.push([a, b, kleur]);
      el.pfMark.sort((p, q) => p[0] - q[0]);
      begin = null;
      teken();
      klaar();
    };
    const woordVan = t => { const w = t && t.closest && t.closest('.pf-woord'); return w && tekst.contains(w) ? Number(w.dataset.w) : null; };
    const api = { tik, stuk, mk, el, klaar, kleur: () => kleur, get begin() { return begin; }, set begin(v) { begin = v; teken(); } };
    el.pfMarkApi = api;
    if (tekst.pfMarkWired) return;
    tekst.pfMarkWired = true;
    // In een bron telt de vraag die nu aanduidt; anders deze vraag.
    const huidig = () => (mk.inBron ? tekst.pfVraag && tekst.pfVraag.pfMarkApi : api);
    let sleep = null;
    tekst.addEventListener('pointerdown', e => {
      const w = woordVan(e.target);
      const h = huidig();
      if (h) h.skip = false;
      if (w === null || !h || h.mk.per !== 'stuk' || e.pointerType === 'touch') return;
      sleep = w;
    });
    tekst.addEventListener('pointerup', e => {
      const h = huidig();
      const w = woordVan(document.elementFromPoint(e.clientX, e.clientY));
      if (h && sleep !== null && w !== null && w !== sleep) { h.stuk(sleep, w); h.skip = true; }
      sleep = null;
    });
    tekst.addEventListener('click', e => {
      const h = huidig();
      if (!h) return;
      if (h.skip) { h.skip = false; return; }
      const w = woordVan(e.target);
      if (w === null) return;
      if (h.mk.per === 'stuk') {
        const binnen = h.el.pfMark.findIndex(m => w >= m[0] && w <= m[1]);
        if (h.begin === null && binnen >= 0 && h.el.pfMark[binnen][2] === h.kleur()) { h.el.pfMark.splice(binnen, 1); h.begin = null; h.klaar(); return; }
        if (h.begin === null) { h.begin = w; return; }
        h.stuk(h.begin, w);
        return;
      }
      h.tik(h.mk.per === 'zin' ? Number(e.target.closest('.pf-woord').dataset.z) : w);
    });
    tekst.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.pf-woord')) { e.preventDefault(); e.target.click(); } });
    if (mk.inBron && !page.pfActief) zetActief();
    else teken();
  }

  // Het antwoord van één vraag uit het scherm halen.
  function lees(el) {
    const type = el.dataset.type;
    if (type === 'meerkeuze') {
      const on = [...el.querySelectorAll('.pf-keuze.on')].map(b => Number(b.dataset.value));
      return el.querySelector('.pf-tip') ? on : (on.length ? on[0] : null);
    }
    if (type === 'juistfout' && el.querySelector('.pf-stellingen')) return [...el.querySelectorAll('.pf-stelling')].map(r => (r.querySelector('.pf-jf.on') || {}).dataset?.value || null);
    if (type === 'juistfout') return (el.querySelector('.pf-keuze.on') || {}).dataset?.value || null;
    if (type === 'invullen' || type === 'tabel') {
      const out = [];
      for (const i of el.querySelectorAll('.pf-in')) out[Number(i.dataset.k)] = i.dataset.waarde !== undefined ? i.dataset.waarde : i.value;
      return out;
    }
    if (type === 'kort') { const b = el.querySelector('.pf-breuk'); return b ? breukWaarde(b) : el.querySelector('.pf-in').value; }
    if (type === 'rekenen') {
      const b = el.querySelector('.pf-breuk');
      const r = el.querySelector('.pf-rooster');
      return { werk: r ? roosterWaarde(r) : el.querySelector('.pf-werkveld').value, uitkomst: b ? breukWaarde(b) : el.querySelector('.pf-uitkomst').value };
    }
    if (type === 'verbinden') return [...el.querySelectorAll('.pf-sel')].map(s => (s.value === '' ? null : Number(s.value)));
    if (type === 'ordenen') return [...el.querySelectorAll('.pf-orden li')].map(li => Number(li.dataset.i));
    if (type === 'dictee') return [...el.querySelectorAll('.pf-dictee-in')].map(i => i.value);
    if (type === 'sorteren') {
      const out = [...el.querySelectorAll('.pf-sorteer-w')].map(() => null);
      for (const b of el.querySelectorAll('.pf-sorteer-w')) { const kol = b.closest('.pf-sorteer-kol'); out[Number(b.dataset.i)] = kol ? Number(kol.dataset.k) : null; }
      return out;
    }
    if (type === 'aanduiden') return el.querySelector('.pf-namen') ? el.pfPunten || [] : el.pfPunt || null;
    if (type === 'open') return el.querySelector('.pf-open').value;
    if (type === 'getallenas') { const as = el.querySelector('.pf-as'); return as.dataset.waarde !== undefined ? Number(as.dataset.waarde) : null; }
    if (type === 'markeren') return el.pfMark ? el.pfMark.map(x => (x.length === 2 && x[1] === 1 && !el.pfMarkKleur ? x[0] : x)) : [...el.querySelectorAll('.pf-woord.on')].map(w => Number(w.dataset.w));
    if (type === 'tekenen') return (el.querySelector('.pf-teken') || {}).pfWaarde || null;
    if (type === 'spreken') return (el.querySelector('.pf-spreek') || {}).pfWaarde || null;
    if (type === 'blad') {
      const out = [];
      for (const f of el.querySelectorAll('.pf-veld')) {
        const k = Number(f.dataset.k);
        if (f.classList.contains('rooster')) out[k] = roosterWaarde(f) || null;
        else if (f.classList.contains('kruis')) out[k] = f.classList.contains('on') ? true : null;
        else if (f.classList.contains('teken')) out[k] = f.pfWaarde || null;
        else if (f.classList.contains('sleep') || f.classList.contains('plek') || f.classList.contains('lijn') || f.classList.contains('puntlijn') || f.classList.contains('cirkel') || f.classList.contains('veelhoek')) out[k] = f.dataset.waarde || null;
        else if (f.classList.contains('breuk')) {
          const g = f.querySelector('.geheel') ? f.querySelector('.geheel').value.trim() : '';
          const t = f.querySelector('.teller').value.trim();
          const n = f.querySelector('.noemer').value.trim();
          out[k] = t || n ? `${g ? `${g} ` : ''}${t}/${n}` : g || null;
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
      for (const b of el.querySelectorAll('.pf-jf')) {
        b.addEventListener('click', () => {
          for (const x of b.parentNode.querySelectorAll('.pf-jf')) x.classList.toggle('on', x === b);
          send(el);
        });
      }
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
      // Verbinden op een blad: sleep van het bolletje naar de juiste plek. Een tik op het bolletje haalt de lijn weg.
      for (const v of el.querySelectorAll('button.pf-veld.lijn')) {
        const vel = v.closest('.pf-blad-vel');
        const svg = vel && vel.querySelector('.pf-lijnen');
        if (!svg) continue;
        const k = v.dataset.k;
        const x1 = parseFloat(v.style.left) + parseFloat(v.style.width) / 2;
        const y1 = parseFloat(v.style.top) + parseFloat(v.style.height) / 2;
        const punt = e => {
          const r = vel.getBoundingClientRect();
          return [Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)) * 10) / 10, Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) * 10) / 10];
        };
        const lijn = () => {
          let l = svg.querySelector(`line.ant[data-k="${k}"]`);
          if (!l) {
            l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('class', 'ant');
            l.dataset.k = k;
            l.setAttribute('vector-effect', 'non-scaling-stroke');
            l.setAttribute('x1', x1);
            l.setAttribute('y1', y1);
            svg.appendChild(l);
          }
          return l;
        };
        let trek = false;
        v.addEventListener('pointerdown', e => {
          if (e.button > 0) return;
          e.preventDefault();
          v.setPointerCapture(e.pointerId);
          trek = true;
        });
        v.addEventListener('pointermove', e => {
          if (!trek) return;
          const [x, y] = punt(e);
          const l = lijn();
          l.setAttribute('x2', x);
          l.setAttribute('y2', y);
        });
        const los = e => {
          if (!trek) return;
          trek = false;
          const [x, y] = punt(e);
          const r = vel.getBoundingClientRect();
          if (Math.hypot(((x - x1) / 100) * r.width, ((y - y1) / 100) * r.height) < 12) {
            const l = svg.querySelector(`line.ant[data-k="${k}"]`);
            if (l) l.remove();
            v.dataset.waarde = '';
          } else {
            const l = lijn();
            l.setAttribute('x2', x);
            l.setAttribute('y2', y);
            v.dataset.waarde = `${x},${y}`;
          }
          send(el);
        };
        v.addEventListener('pointerup', los);
        v.addEventListener('pointercancel', los);
      }
      el.addEventListener('pf-antwoord', () => send(el));
      if (box.pfMk && box.pfMk[el.dataset.id]) wireMarkeer(box, el, box.pfMk[el.dataset.id], () => send(el));
      else for (const w of el.querySelectorAll('.pf-woord')) {
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
      for (const v of el.querySelectorAll('.pf-veld.puntlijn.live')) wirePuntlijn(v, () => send(el));
      for (const v of el.querySelectorAll('.pf-veld.cirkel.live')) wireCirkel(v, () => send(el));
      for (const v of el.querySelectorAll('.pf-veld.veelhoek.live')) wireVeelhoek(v, () => send(el));
      const lat = el.querySelector('.pf-lat-knop');
      if (lat) lat.addEventListener('click', () => {
        const vel = el.querySelector('.pf-blad-vel');
        const oud = vel && vel.querySelector('.pf-lat');
        if (oud) oud.remove(); else if (vel) maakLat(vel);
        lat.classList.toggle('on', !oud);
      });
      const groter = el.querySelector('.pf-groter');
      if (groter) groter.addEventListener('click', () => { groter.textContent = el.classList.toggle('groot') ? '🔍 Kleiner' : '🔍 Groter'; });
      const orden = el.querySelector('.pf-orden');
      if (orden) wireOrden(orden, () => send(el));
      if (el.dataset.type === 'sorteren') wireSorteer(el, () => send(el));
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
      const namen = el.querySelector('.pf-namen');
      if (kaart && namen) {
        // Namen op de kaart: de gekozen naam (of de eerste die nog niet staat) komt op de aangetikte plek.
        const knoppen = [...namen.querySelectorAll('.pf-naam')];
        const kies = n => { for (const k of knoppen) k.classList.toggle('on', n !== null && k.dataset.n === String(n)); };
        const volgende = () => { const k = knoppen.find(x => !x.classList.contains('gezet')); kies(k ? k.dataset.n : null); };
        for (const k of knoppen) k.addEventListener('click', () => kies(k.classList.contains('on') ? null : k.dataset.n));
        kaart.addEventListener('click', e => {
          const speld = e.target.closest('.pf-speld');
          if (speld) { kies(speld.dataset.n); return; }
          const k = knoppen.find(x => x.classList.contains('on'));
          if (!k) return;
          const r = kaart.getBoundingClientRect();
          const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
          const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
          const n = Number(k.dataset.n);
          el.pfPunten = el.pfPunten || [];
          el.pfPunten[n] = { x, y };
          let s = kaart.querySelector(`.pf-speld[data-n="${n}"]`);
          if (!s) {
            s = document.createElement('span');
            s.className = 'pf-speld';
            s.dataset.n = n;
            s.textContent = k.textContent;
            kaart.appendChild(s);
          }
          s.style.left = `${x}%`;
          s.style.top = `${y}%`;
          k.classList.add('gezet');
          volgende();
          send(el);
        });
        volgende();
      } else if (kaart) {
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
      for (const r of el.querySelectorAll('.pf-rooster')) wireRooster(r);
      // Enter springt naar het volgende vakje (in een rekenrooster: een rij lager).
      for (const i of el.querySelectorAll('input:not(.pf-cel)')) {
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
      const spelden = el.querySelectorAll('.pf-speld');
      if (spelden.length) {
        el.pfPunten = [];
        for (const s of spelden) el.pfPunten[Number(s.dataset.n)] = { x: parseFloat(s.style.left), y: parseFloat(s.style.top) };
      }
    }
  }

  // De figuur van de leerling als svg: een veelhoek (vanaf 3 punten dicht), of een lijn en een punt.
  function veelhoekSvg(v, kol, rij) {
    const p = String(v || '').split(';').map(x => x.split(',').map(Number)).filter(x => x.length === 2 && x.every(Number.isFinite));
    const xy = p.map(([c, r]) => `${(c / (kol - 1)) * 100},${(r / (rij - 1)) * 100}`).join(' ');
    if (p.length >= 3) return `<polygon class="ant" points="${xy}" vector-effect="non-scaling-stroke"/>`;
    if (p.length === 2) return `<polyline class="ant" points="${xy}" vector-effect="non-scaling-stroke"/>`;
    return '';
  }
  // Een veelhoek op roosterpunten: tik de hoekpunten aan, één na één. Het laatste punt nog eens tikken (of ↶) haalt het weg.
  function wireVeelhoek(v, klaar) {
    const kol = Number(v.dataset.kol) || 6;
    const rij = Number(v.dataset.rij) || 5;
    const punten = () => String(v.dataset.waarde || '').split(';').filter(Boolean);
    const zet = l => {
      v.dataset.waarde = l.join(';');
      v.querySelector('svg').innerHTML = veelhoekSvg(v.dataset.waarde, kol, rij);
      for (const s of v.querySelectorAll('.pf-stip')) s.classList.toggle('on', l.includes(`${s.dataset.c},${s.dataset.r}`));
      klaar();
    };
    for (const s of v.querySelectorAll('.pf-stip')) s.classList.toggle('on', punten().includes(`${s.dataset.c},${s.dataset.r}`));
    v.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('.pf-cirkel-terug')) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const r = v.getBoundingClientRect();
      const c = Math.round(((e.clientX - r.left) / r.width) * (kol - 1));
      const ri = Math.round(((e.clientY - r.top) / r.height) * (rij - 1));
      if (c < 0 || ri < 0 || c >= kol || ri >= rij) return;
      // Dicht genoeg bij de stip?
      const d = Math.hypot((c / (kol - 1)) * r.width - (e.clientX - r.left), (ri / (rij - 1)) * r.height - (e.clientY - r.top));
      if (d > Math.max(16, Math.min(r.width / (kol - 1), r.height / (rij - 1)) * 0.45)) return;
      const p = `${c},${ri}`;
      const l = punten();
      if (l[l.length - 1] === p) l.pop(); else if (!l.includes(p) && l.length < 12) l.push(p); else return;
      zet(l);
    });
    v.querySelector('.pf-cirkel-terug').addEventListener('click', e => { e.stopPropagation(); const l = punten(); l.pop(); zet(l); });
  }

  // Lijnen tussen punten: sleep van een punt naar een ander punt (de lijn klikt vast). Tik op een lijn om ze weg te halen.
  function wirePuntlijn(v, klaar) {
    const svg = v.querySelector('svg');
    const pts = [...v.querySelectorAll('.pf-pt')];
    const P = i => [parseFloat(pts[i].style.left), parseFloat(pts[i].style.top)];
    const lijnen = () => String(v.dataset.waarde || '').split(',').map(x => /^(\d+)-(\d+)$/.exec(x.trim())).filter(Boolean).map(m => [Number(m[1]), Number(m[2])]);
    const teken = l => {
      v.dataset.waarde = l.map(([a, b]) => `${a}-${b}`).join(',');
      svg.innerHTML = l.map(([a, b]) => `<line class="ant" x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" vector-effect="non-scaling-stroke"/>`).join('');
    };
    const px = e => { const r = v.getBoundingClientRect(); return { r, x: e.clientX - r.left, y: e.clientY - r.top }; };
    const dichtst = e => {
      const { r, x, y } = px(e);
      let best = -1;
      let bd = Math.max(18, Math.min(r.width, r.height) * 0.06);
      pts.forEach((_, i) => { const d = Math.hypot((P(i)[0] / 100) * r.width - x, (P(i)[1] / 100) * r.height - y); if (d <= bd) { bd = d; best = i; } });
      return best;
    };
    let start = -1;
    let tmp = null;
    v.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      // Weg uit een vakje: de symbolenbalk mag niet over het blad blijven staan.
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const i = dichtst(e);
      if (i < 0) {
        // Geen punt: een lijn vlakbij gaat weg.
        const { r, x, y } = px(e);
        const l = lijnen();
        let weg = -1;
        let bd = 12;
        l.forEach(([a, b], n) => {
          const ax = (P(a)[0] / 100) * r.width; const ay = (P(a)[1] / 100) * r.height;
          const bx = (P(b)[0] / 100) * r.width; const by = (P(b)[1] / 100) * r.height;
          const len2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
          const t = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2));
          const d = Math.hypot(ax + t * (bx - ax) - x, ay + t * (by - ay) - y);
          if (d < bd) { bd = d; weg = n; }
        });
        if (weg >= 0) { l.splice(weg, 1); teken(l); klaar(); }
        return;
      }
      v.setPointerCapture(e.pointerId);
      start = i;
      pts[i].classList.add('on');
      tmp = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tmp.setAttribute('class', 'ant trek');
      tmp.setAttribute('vector-effect', 'non-scaling-stroke');
      for (const [a, w] of [['x1', P(i)[0]], ['y1', P(i)[1]], ['x2', P(i)[0]], ['y2', P(i)[1]]]) tmp.setAttribute(a, w);
      svg.appendChild(tmp);
    });
    v.addEventListener('pointermove', e => {
      if (start < 0) return;
      const { r, x, y } = px(e);
      tmp.setAttribute('x2', (x / r.width) * 100);
      tmp.setAttribute('y2', (y / r.height) * 100);
    });
    const los = e => {
      if (start < 0) return;
      const j = e.type === 'pointercancel' ? -1 : dichtst(e);
      pts[start].classList.remove('on');
      const l = lijnen();
      if (j >= 0 && j !== start && !l.some(([a, b]) => (a === start && b === j) || (a === j && b === start))) l.push([Math.min(start, j), Math.max(start, j)]);
      start = -1;
      teken(l);
      klaar();
    };
    v.addEventListener('pointerup', los);
    v.addEventListener('pointercancel', los);
  }

  // Een cirkel tekenen: druk op het middelpunt en sleep tot de straal juist is. De straal staat erbij in cm.
  const cmTekst = s => String(Math.round(s * 10) / 10).replace('.', ',');
  function wireCirkel(v, klaar) {
    const vel = v.closest('.pf-blad-vel');
    const schaal = Number(vel && vel.dataset.schaal) || 21;
    const fw = Number(v.dataset.w) || 10;
    const cirkels = () => String(v.dataset.waarde || '').split(';').map(c => c.split(',').map(Number)).filter(c => c.length === 3 && c.every(Number.isFinite));
    const zet = l => {
      v.dataset.waarde = l.map(c => c.map(n => Math.round(n * 100) / 100).join(',')).join(';');
      for (const c of v.querySelectorAll('.pf-cirkel.ant')) c.remove();
      v.insertAdjacentHTML('afterbegin', l.map(([x, y, s]) => `<i class="pf-cirkel ant" style="left:${x}%;top:${y}%;width:${Math.round(((2 * s) / fw) * 10000) / 100}%"></i>`).join(''));
    };
    let nieuw = null;
    let maat = null;
    v.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('.pf-cirkel-terug')) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      v.setPointerCapture(e.pointerId);
      const r = v.getBoundingClientRect();
      nieuw = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, s: 0, cx: e.clientX, cy: e.clientY };
      v.insertAdjacentHTML('beforeend', `<i class="pf-cirkel nieuw" style="left:${nieuw.x}%;top:${nieuw.y}%;width:0"></i><span class="pf-cirkel-maat" style="left:${nieuw.x}%;top:${nieuw.y}%">r = 0 cm</span>`);
      maat = v.querySelector('.pf-cirkel-maat');
    });
    v.addEventListener('pointermove', e => {
      if (!nieuw) return;
      const vr = vel.getBoundingClientRect();
      nieuw.s = (Math.hypot(e.clientX - nieuw.cx, e.clientY - nieuw.cy) / vr.width) * 100;
      v.querySelector('.pf-cirkel.nieuw').style.width = `${((2 * nieuw.s) / fw) * 100}%`;
      const r = v.getBoundingClientRect();
      maat.style.left = `${((e.clientX - r.left) / r.width) * 100}%`;
      maat.style.top = `${((e.clientY - r.top) / r.height) * 100}%`;
      maat.textContent = `r = ${cmTekst((nieuw.s / 100) * schaal)} cm`;
    });
    const los = e => {
      if (!nieuw) return;
      const c = nieuw;
      nieuw = null;
      const n = v.querySelector('.pf-cirkel.nieuw');
      if (n) n.remove();
      setTimeout(() => { if (maat && !nieuw) maat.remove(); }, 1500);
      if (e.type === 'pointercancel' || (c.s / 100) * schaal < 0.2) return;
      zet([...cirkels(), [c.x, c.y, c.s]]);
      klaar();
    };
    v.addEventListener('pointerup', los);
    v.addEventListener('pointercancel', los);
    v.querySelector('.pf-cirkel-terug').addEventListener('click', e => {
      e.stopPropagation();
      const l = cirkels();
      l.pop();
      zet(l);
      klaar();
    });
  }

  // De lat op het blad: zo groot als een echte lat op het papier (volgens de schaal van het blad).
  // Sleep om te verschuiven, draai met het bolletje aan het einde.
  function maakLat(vel) {
    const schaal = Number(vel.dataset.schaal) || 21;
    const L = Math.max(5, Math.min(30, Math.floor(schaal * 0.75)));
    const breed = (L + 2) * 10;
    let streepjes = '';
    for (let i = 0; i <= L * 10; i++) {
      const h = i % 10 === 0 ? 8 : i % 5 === 0 ? 5.5 : 3.5;
      streepjes += `<line x1="${5 + i}" y1="0" x2="${5 + i}" y2="${h}"/>`;
      if (i % 10 === 0) streepjes += `<text x="${5 + i}" y="14">${i / 10}</text>`;
    }
    const r = vel.getBoundingClientRect();
    // Bovenaan het stuk van het blad dat de leerling nu ziet.
    const st = { x: 6, y: Math.min(85, Math.max(3, ((Math.max(0, -r.top) + 90) / Math.max(1, r.height)) * 100)), hoek: 0 };
    const lat = document.createElement('div');
    lat.className = 'pf-lat';
    lat.style.width = `${(breed / 10 / schaal) * 100}%`;
    lat.style.transformOrigin = `${(5 / breed) * 100}% 50%`;
    lat.innerHTML = `<svg viewBox="0 0 ${breed} 18" aria-hidden="true"><rect x="0" y="0" width="${breed}" height="18" rx="1.5"/>${streepjes}<text class="cm" x="${breed - 2}" y="15.5">cm</text></svg><span class="pf-lat-draai" title="Draaien" aria-label="Draaien">⟳</span>`;
    const zet = () => { lat.style.left = `${st.x}%`; lat.style.top = `${st.y}%`; lat.style.transform = `rotate(${st.hoek}deg)`; };
    zet();
    vel.appendChild(lat);
    let sleep = null;
    lat.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      lat.setPointerCapture(e.pointerId);
      sleep = { draai: !!e.target.closest('.pf-lat-draai'), px: e.clientX, py: e.clientY, x: st.x, y: st.y };
    });
    lat.addEventListener('pointermove', e => {
      if (!sleep) return;
      const v = vel.getBoundingClientRect();
      if (!sleep.draai) {
        st.x = sleep.x + ((e.clientX - sleep.px) / v.width) * 100;
        st.y = sleep.y + ((e.clientY - sleep.py) / v.height) * 100;
        return zet();
      }
      // Draaien rond het nulpunt; dicht bij recht klikt hij vast.
      const lb = (lat.offsetWidth * 5) / breed;
      const ox = v.left + (st.x / 100) * v.width + lb;
      const oy = v.top + (st.y / 100) * v.height + lat.offsetHeight / 2;
      let h = (Math.atan2(e.clientY - oy, e.clientX - ox) * 180) / Math.PI;
      const recht = Math.round(h / 90) * 90;
      if (Math.abs(h - recht) < 4) h = recht;
      st.hoek = Math.round(h * 10) / 10;
      zet();
    });
    const los = () => { sleep = null; };
    lat.addEventListener('pointerup', los);
    lat.addEventListener('pointercancel', los);
    return lat;
  }

  // Is deze vraag al beantwoord? (voor het bolletje in de vraagbalk)
  function beantwoord(a) {
    if (a === undefined || a === null || a === '') return false;
    if (Array.isArray(a)) return a.some(x => x !== null && x !== undefined && x !== '');
    if (typeof a === 'object') return !!(a.uitkomst || a.werk || a.x !== undefined);
    return true;
  }

  return { render, lees, beantwoord, esc, ptn, nl, roosterHtml, roosterWaarde, wireRooster };
})();
