// Wiskunde (1A) — deel 1 wo 9/12 (verzamelingen + meten en tekenen), deel 2 ma 14/12 (natuurlijke getallen).
// Leerstof volgens de leerstofoverzichten van de school en het boek Delta Top 1A (blz. 15–39, 44–103, 108–137).
(function(){
const BOEK = 'https://drive.google.com/file/d/1lPa-5TVgT8qXgKz4HtrTqOFOMFQE8Yos/view';
const B = p => [['Delta Top 1A · ' + p + ' + geel blad', BOEK]];
const D2 = '2026-12-14';

// Tekst in een venndiagram: "a|b" = onder elkaar.
const txt = (x, t, extra) => { const r = String(t).split('|'); return `<text x="${x}" text-anchor="middle" font-size="13"${extra} style="fill:var(--inkt)">${r.map((l, i) => `<tspan x="${x}" y="${82 - (r.length - 1) * 8 + i * 16}">${l}</tspan>`).join('')}</text>`; };
// Klein venndiagram als tekening: twee cirkels A en B met hun elementen.
const venn = (a, b, alleenA, samen, alleenB, kleurSamen, buiten) => !b ? `<svg viewBox="0 0 300 150" style="width:100%;max-width:340px;display:block;margin:6px auto" role="img" aria-label="venndiagram">
  <rect x="2" y="2" width="296" height="146" rx="12" fill="none" stroke="var(--lijn)" stroke-width="2"/>
  <circle cx="150" cy="78" r="60" fill="#1c7ed633" stroke="#1c7ed6" stroke-width="3"/>
  <text x="82" y="26" font-weight="800" fill="#1c7ed6" font-size="16">${a}</text>
  ${txt(150, [alleenA, samen].filter(Boolean).join(' '), '')}
</svg>` : `<svg viewBox="0 0 300 150" style="width:100%;max-width:340px;display:block;margin:6px auto" role="img" aria-label="venndiagram">
  <rect x="2" y="2" width="296" height="146" rx="12" fill="none" stroke="var(--lijn)" stroke-width="2"/>
  <circle cx="115" cy="78" r="58" fill="${kleurSamen === 'A' || kleurSamen === 'AB' || kleurSamen === 'U' ? '#1c7ed633' : 'none'}" stroke="#1c7ed6" stroke-width="3"/>
  <circle cx="185" cy="78" r="58" fill="${kleurSamen === 'B' || kleurSamen === 'U' ? '#f08c0033' : 'none'}" stroke="#f08c00" stroke-width="3"/>
  ${kleurSamen === 'D' ? '<path d="M150 31 A58 58 0 0 1 150 125 A58 58 0 0 1 150 31Z" fill="#2f9e4466"/>' : ''}
  ${kleurSamen === 'AB' ? '<path d="M150 31 A58 58 0 0 1 150 125 A58 58 0 0 1 150 31Z" fill="var(--kaart)"/>' : ''}
  <text x="60" y="26" font-weight="800" fill="#1c7ed6" font-size="16">${a}</text>
  <text x="232" y="26" font-weight="800" fill="#f08c00" font-size="16">${b}</text>
  ${txt(88, alleenA, '')}${txt(150, samen, ' font-weight="800"')}${txt(212, alleenB, '')}
  ${buiten ? `<text x="282" y="138" text-anchor="end" font-size="12" style="fill:var(--inkt-zacht)">${buiten}</text>` : ''}
</svg>`;

// Een rechte, halfrechte of lijnstuk als tekening.
const lijn = (soort) => {
  const l = soort === 'rechte' ? [20, 280] : soort === 'half' ? [70, 280] : [70, 230];
  return `<svg viewBox="0 0 300 50" style="width:100%;max-width:300px;display:block;margin:4px auto">
  <line x1="${l[0]}" y1="25" x2="${l[1]}" y2="25" stroke="#1c7ed6" stroke-width="3" ${soort === 'rechte' ? '' : ''}/>
  ${soort !== 'rechte' ? '<line x1="70" y1="15" x2="70" y2="35" stroke="#1c7ed6" stroke-width="3"/>' : ''}
  ${soort === 'stuk' ? '<line x1="230" y1="15" x2="230" y2="35" stroke="#1c7ed6" stroke-width="3"/>' : ''}
  <circle cx="70" cy="25" r="4" style="fill:var(--inkt)"/><circle cx="230" cy="25" r="4" style="fill:var(--inkt)"/>
  <text x="66" y="48" font-size="13" font-weight="800" style="fill:var(--inkt)">A</text><text x="226" y="48" font-size="13" font-weight="800" style="fill:var(--inkt)">B</text>
  ${soort === 'rechte' ? '<text x="284" y="20" font-size="13" font-style="italic" style="fill:var(--inkt)">a</text>' : ''}
</svg>`;
};

window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
// ================================================================ DEEL 1 (wo 9/12)
{
  id:'W1', vak:'wis', deel:1, titel:'Verzamelingen: opsommen, venndiagram en ∈ ∉',
  bron: B('blz. 13–16'),
  samenvatting:[
    '<h4>🧺 Wat is een verzameling?</h4><p>Een <b>verzameling</b> bevat verschillende <b>elementen</b> die een geheel vormen. Thor’s collectie actiefiguren is een verzameling: elk figuurtje is een element.</p><p>De <b>naam</b> van een verzameling noteer je met een <b>hoofdletter</b>: A, B, V, …</p>',
    '<h4>✍️ Drie manieren om een verzameling te noteren</h4><div class="lp-tegels"><div><i>📋</i><b>opsomming</b><small>tussen accolades, van klein naar groot<br>A = { 1, 2, 3, 4, 5 }</small></div><div><i>💬</i><b>omschrijving</b><small>in woorden<br>A is de verzameling van de natuurlijke getallen van 1 tot en met 5</small></div><div><i>⭕</i><b>venndiagram</b><small>een gesloten lijn, een <b>stip bij elk element</b>, de naam <b>buiten</b> de lijn</small></div></div>' + venn('A', '', '•1 •2 •3', '•4 •5', '', 'A'),
    '<h4>∈ en ∉</h4><table class="lp-ww"><tr><td>5 ∈ A</td><td>5 <b>is een element van</b> A</td><td>zit erin</td></tr><tr><td>7 ∉ A</td><td>7 <b>is geen element van</b> A</td><td>zit er niet in</td></tr></table><p class="lp-tip">💡 ∈ lijkt op een <b>E</b> van <b>E</b>lement. Doorstreept (∉) = <b>niet</b>.</p>',
    '<h4>🫙 De lege verzameling</h4><p>Een verzameling <b>zonder elementen</b> heet de <b>lege verzameling</b>. Je noteert ze als <b>∅</b> of <b>{ }</b>.</p><p class="lp-vb">De verzameling van de skateboards met 5 wielen = ∅</p><p class="lp-tip">⚠️ Schrijf <b>niet</b> { ∅ }: dat is een verzameling mét één element (het teken ∅)!</p>'
  ],
  kaarten:[
    ['Wat is een verzameling?','Een geheel van verschillende elementen'],
    ['Met welke letter noteer je de naam van een verzameling?','Met een hoofdletter (A, B, …)'],
    ['Welke 3 manieren om een verzameling voor te stellen ken je?','Opsomming (accolades), omschrijving (in woorden) en venndiagram'],
    ['Wat betekent 5 ∈ A?','5 is een element van A'],
    ['Wat betekent 7 ∉ A?','7 is geen element van A'],
    ['Hoe noteer je de lege verzameling?','∅ of { }'],
    ['Waar schrijf je de naam bij een venndiagram?','Buiten de gesloten lijn'],
    ['In welke volgorde noteer je getallen bij een opsomming?','Van klein naar groot']
  ],
  quiz:[
    {t:'mc',v:'A = { 2, 4, 6, 8 }. Welke uitspraak is juist?',o:['6 ∈ A','5 ∈ A','8 ∉ A','2 ∉ A'],a:0},
    {t:'mc',v:'Welke notatie is een <b>opsomming</b>?',o:['B = { 0, 1, 2, 3 }','B is de verzameling van de getallen kleiner dan 4','Een cirkel met stippen','B ∈ 4'],a:0},
    {t:'mc',v:'Hoe noteer je de lege verzameling?',o:['∅ of { }','{ 0 }','{ ∅ }','0'],a:0},
    {t:'mc',v:'Wat teken je bij elk element in een venndiagram?',o:['Een stip','Een kruisje','Een accolade','Niets'],a:0},
    {t:'mc',v:'V = de verzameling van de dagen van het weekend. Welke opsomming klopt?',o:['V = { zaterdag, zondag }','V = { maandag, zondag }','V = { weekend }','V = ∅'],a:0},
    {t:'mc',v:'C is de verzameling van de even getallen tussen 1 en 9. Hoeveel elementen heeft C?',o:['4 (2, 4, 6, 8)','5','9','3'],a:0},
    {t:'jf',v:'{ 1, 2, 3 } en { 3, 1, 2 } zijn dezelfde verzameling.',a:true,u:'De volgorde verandert niets aan de elementen; je noteert ze wel liefst van klein naar groot.'},
    {t:'jf',v:'{ 0 } is de lege verzameling.',a:false,u:'{ 0 } heeft één element: het getal 0. De lege verzameling is { } of ∅.'},
    {t:'jf',v:'De naam van een verzameling schrijf je met een kleine letter.',a:false,u:'Met een hoofdletter.'},
    {t:'invul',v:'Een verzameling zonder elementen noem je de … verzameling.',a:['lege']},
    {t:'invul',v:'Het symbool ∉ lees je als “is … element van”.',a:['geen']},
    {t:'open',v:'Stel de verzameling M van de maanden die met een J beginnen voor door opsomming én door omschrijving.',m:'Opsomming: M = { januari, juni, juli } · Omschrijving: M is de verzameling van de maanden die met een J beginnen.'}
  ]
},
{
  id:'W2', vak:'wis', deel:1, titel:'Deelverzameling ⊂ en de getallen ℕ, ℤ, ℚ',
  bron: B('blz. 14–20'),
  samenvatting:[
    '<h4>🧩 Deelverzameling: ⊂ en ⊄</h4><p>B is een <b>deelverzameling</b> van A als <b>elk</b> element van B ook in A zit.</p><table class="lp-ww"><tr><td>B ⊂ A</td><td>B <b>is een deelverzameling van</b> A</td><td>B ligt helemaal in A</td></tr><tr><td>C ⊄ A</td><td>C <b>is geen deelverzameling van</b> A</td><td>minstens 1 element van C zit niet in A</td></tr></table><p class="lp-vb">A = { 1, 2, 3, 4, 5 }, B = { 2, 4 } → <b>B ⊂ A</b><br>C = { 4, 5, 6 } → 6 zit niet in A → <b>C ⊄ A</b></p>',
    '<h4>⚖️ ∈ of ⊂? Het grote verschil</h4><div class="lp-vs"><div><b>∈ element</b>tussen een <b>element</b> en een verzameling<small>3 ∈ A</small></div><div><b>⊂ deelverzameling</b>tussen <b>twee verzamelingen</b><small>{ 3 } ⊂ A</small></div></div><p class="lp-tip">💡 Staat er links een <b>accolade</b> of een <b>hoofdletter</b>? Dan heb je <b>⊂</b> nodig. Een los getal? Dan <b>∈</b>.</p>',
    '<h4>🔢 De drie getallenverzamelingen</h4><div class="lp-tegels"><div><i>ℕ</i><b>natuurlijke getallen</b><small>resultaat van een <b>telling</b><br>0, 1, 2, 3, …</small></div><div><i>ℤ</i><b>gehele getallen</b><small>natuurlijke getallen met een <b>+ of −</b><br>… −2, −1, 0, 1, 2 …</small></div><div><i>ℚ</i><b>rationale getallen</b><small>uitkomst van een <b>deling</b> van twee gehele getallen (deler ≠ 0): breuken en kommagetallen</small></div></div><p><b>ℕ ⊂ ℤ ⊂ ℚ</b>: elk natuurlijk getal is ook geheel, en elk geheel getal is ook rationaal.</p>' + `<svg viewBox="0 0 300 150" style="width:100%;max-width:340px;display:block;margin:6px auto"><ellipse cx="150" cy="75" rx="145" ry="70" fill="#2f9e4422" stroke="#2f9e44" stroke-width="3"/><ellipse cx="135" cy="80" rx="95" ry="48" fill="#f08c0022" stroke="#f08c00" stroke-width="3"/><ellipse cx="120" cy="84" rx="48" ry="26" fill="#1c7ed633" stroke="#1c7ed6" stroke-width="3"/><text x="262" y="50" font-weight="800" fill="#2f9e44">ℚ</text><text x="205" y="62" font-weight="800" fill="#f08c00">ℤ</text><text x="146" y="74" font-weight="800" fill="#1c7ed6">ℕ</text><text x="112" y="92" font-size="13" style="fill:var(--inkt)">0 2 15</text><text x="176" y="102" font-size="13" style="fill:var(--inkt)">−3</text><text x="236" y="90" font-size="13" style="fill:var(--inkt)">0,5 ¾</text></svg>`,
    '<h4>🧠 Ezelsbruggetjes</h4><table class="lp-ww"><tr><td>ℕ</td><td><b>N</b>atuurlijk</td><td>tellen: 0 is het kleinste</td></tr><tr><td>ℤ</td><td>Duits “<b>Z</b>ahl” = getal</td><td>met min erbij</td></tr><tr><td>ℚ</td><td>“<b>Q</b>uotiënt” = uitkomst van een deling</td><td>breuken, kommagetallen</td></tr></table><p class="lp-vb">−3 °C → ℤ (en ℚ) · 3,5 liter → ℚ · 50 parkeerplaatsen → ℕ (en ℤ en ℚ)</p>'
  ],
  kaarten:[
    ['Wanneer is B een deelverzameling van A?','Als elk element van B ook element is van A'],
    ['Wat betekent B ⊂ A?','B is een deelverzameling van A'],
    ['Wat betekent C ⊄ A?','C is geen deelverzameling van A'],
    ['Wanneer gebruik je ∈ en wanneer ⊂?','∈ tussen een element en een verzameling, ⊂ tussen twee verzamelingen'],
    ['Wat zijn natuurlijke getallen (ℕ)?','Resultaten van een telling: 0, 1, 2, 3, …'],
    ['Wat zijn gehele getallen (ℤ)?','Natuurlijke getallen voorafgegaan door een plus- of minteken'],
    ['Wat zijn rationale getallen (ℚ)?','Het resultaat van een deling van twee gehele getallen (deler niet 0): breuken en kommagetallen'],
    ['Hoe hangen ℕ, ℤ en ℚ samen?','ℕ ⊂ ℤ ⊂ ℚ']
  ],
  quiz:[
    {t:'mc',v:'A = { 1, 2, 3, 4 }. Welke uitspraak is juist?',o:['{ 1, 3 } ⊂ A','{ 1, 5 } ⊂ A','3 ⊂ A','{ 2 } ∈ A'],a:0},
    {t:'mc',v:'Welk symbool past? −4 … ℕ',o:['∉','∈','⊂','⊄'],a:0},
    {t:'mc',v:'Welk symbool past? ℕ … ℤ',o:['⊂','⊄','∈','∉'],a:0},
    {t:'mc',v:'Welk symbool past? 0,25 … ℚ',o:['∈','∉','⊂','⊄'],a:0},
    {t:'mc',v:'“Het is vandaag −3 °C.” Wat is de kleinste getallenverzameling waartoe −3 behoort?',o:['ℤ','ℕ','ℚ','Geen'],a:0},
    {t:'mc',v:'Welk getal is <b>rationaal maar niet geheel</b>?',o:['¾','−7','12','0'],a:0},
    {t:'mc',v:'Welk symbool past? ℚ … ℤ',o:['⊄','⊂','∈','='],a:0},
    {t:'jf',v:'Elk natuurlijk getal is ook een geheel getal.',a:true},
    {t:'jf',v:'Elk geheel getal is ook een natuurlijk getal.',a:false,u:'−5 is geheel, maar niet natuurlijk.'},
    {t:'jf',v:'De lege verzameling is een deelverzameling van elke verzameling.',a:true,u:'Er zit geen enkel element in dat niet in de andere verzameling zit.'},
    {t:'invul',v:'ℕ ⊂ ℤ ⊂ … (vul de letter in)',a:['ℚ','q','Q']},
    {t:'open',v:'Leg uit waarom 2 ∈ ℚ juist is.',m:'2 kan je schrijven als de uitkomst van een deling van twee gehele getallen, bv. 2 = 4 : 2 of 2/1. Elk natuurlijk getal is ook rationaal (ℕ ⊂ ℤ ⊂ ℚ).'}
  ]
},
{
  id:'W3', vak:'wis', deel:1, titel:'Doorsnede ∩, unie ∪ en verschil \\',
  bron: B('blz. 24–39'),
  samenvatting:[
    '<h4>✂️ Doorsnede A ∩ B</h4><p>De <b>doorsnede</b> van A en B is de verzameling van alle elementen die tot A <b>én</b> tot B behoren. Je kleurt het <b>middenstuk</b>.</p>' + venn('G', 'D', 'Jesse|Divine', 'Adil|Boris', 'Ewout', 'D') + '<p class="lp-vb">G = gitaristen, D = drummers → <b>G ∩ D = { Adil, Boris }</b> (spelen allebei)<br>Hebben ze niets gemeen? Dan is A ∩ B = <b>∅</b>.</p>',
    '<h4>🤝 Unie A ∪ B</h4><p>De <b>unie</b> van A en B is de verzameling van alle elementen die tot A <b>of</b> tot B behoren (of tot allebei). Je kleurt <b>alles</b>.</p>' + venn('A', 'B', '1 3', '5 7', '4 6', 'U') + '<p class="lp-vb">A = { 1, 3, 5, 7 }, B = { 4, 5, 6, 7 }<br><b>A ∪ B = { 1, 3, 4, 5, 6, 7 }</b> → elk element maar <b>één keer</b> opschrijven!</p>',
    '<h4>➖ Verschil A \\ B</h4><p>Het <b>verschil</b> A \\ B (“A min B”) is de verzameling van alle elementen die <b>wel tot A, maar niet tot B</b> behoren. Je kleurt A <b>zonder</b> het middenstuk.</p>' + venn('A', 'B', '1 3', '5 7', '4 6', 'AB') + '<p class="lp-vb">A \\ B = { 1, 3 } maar B \\ A = { 4, 6 }<br>⚠️ <b>Let op de volgorde!</b> A \\ B is iets anders dan B \\ A.</p>',
    '<h4>🧠 Zo onthoud je het</h4><table class="lp-ww"><tr><td>∩</td><td>doorsnede = <b>én</b></td><td>lijkt op een brug: wat ze <b>samen</b> hebben</td></tr><tr><td>∪</td><td>unie = <b>of</b></td><td>lijkt op een <b>U</b> van Unie, een bak waar <b>alles</b> in gaat</td></tr><tr><td>\\</td><td>verschil = <b>maar niet</b></td><td>wat er <b>overblijft</b> van de eerste</td></tr></table><p class="lp-tip">💡 Op het examen: eerst het <b>venndiagram</b> invullen (elk element één keer!), dan pas de opsomming noteren. Gebruik je kleurpotloden.</p>'
  ],
  kaarten:[
    ['Wat is de doorsnede A ∩ B?','De verzameling van de elementen die tot A én tot B behoren'],
    ['Wat is de unie A ∪ B?','De verzameling van de elementen die tot A of tot B behoren'],
    ['Wat is het verschil A \\ B?','De verzameling van de elementen die wel tot A maar niet tot B behoren'],
    ['Wat noteer je als twee verzamelingen geen gemeenschappelijke elementen hebben?','A ∩ B = ∅'],
    ['Is A \\ B hetzelfde als B \\ A?','Nee, let op de volgorde'],
    ['Hoe lees je A \\ B?','A min B (het verschil van A en B)'],
    ['Wat kleur je bij A ∪ B in een venndiagram?','Alles: beide cirkels volledig']
  ],
  quiz:[
    {t:'mc',v:'A = { 1, 2, 3 } en B = { 2, 3, 4 }. Wat is A ∩ B?',o:['{ 2, 3 }','{ 1, 2, 3, 4 }','{ 1 }','{ 4 }'],a:0},
    {t:'mc',v:'A = { 1, 2, 3 } en B = { 2, 3, 4 }. Wat is A ∪ B?',o:['{ 1, 2, 3, 4 }','{ 1, 2, 2, 3, 3, 4 }','{ 2, 3 }','{ 1, 4 }'],a:0},
    {t:'mc',v:'A = { 1, 2, 3 } en B = { 2, 3, 4 }. Wat is A \\ B?',o:['{ 1 }','{ 4 }','{ 2, 3 }','{ 1, 4 }'],a:0},
    {t:'mc',v:'A = { 1, 2, 3 } en B = { 2, 3, 4 }. Wat is B \\ A?',o:['{ 4 }','{ 1 }','{ 2, 3 }','∅'],a:0},
    {t:'mc',v:'H = leerlingen met een hond { Kato, Lotte, Rawi, Lou }, K = met een kat { Rawi, Finn, Lou }. Wie heeft een hond én een kat?',o:['H ∩ K = { Rawi, Lou }','H ∪ K','H \\ K = { Kato, Lotte }','Niemand'],a:0},
    {t:'mc',v:'C = { 0, 4, 6 } en A = { 1, 3, 5 }. Wat is A ∩ C?',o:['∅','{ 0, 1, 3, 4, 5, 6 }','{ 0 }','{ 1, 3, 5 }'],a:0},
    {t:'mc',v:'Welk woordje hoort bij de unie?',o:['of','én','maar niet','nooit'],a:0},
    {t:'jf',v:'Bij een unie schrijf je een element dat in beide verzamelingen zit twee keer op.',a:false,u:'Elk element maar één keer.'},
    {t:'jf',v:'A ∩ B is altijd een deelverzameling van A.',a:true},
    {t:'jf',v:'A \\ B en B \\ A zijn altijd gelijk.',a:false,u:'Let op de volgorde: meestal zijn ze verschillend.'},
    {t:'invul',v:'De elementen die tot A én tot B behoren, vormen de … van A en B.',a:['doorsnede']},
    {t:'open',v:'In de Sportstraat: handbal H = { Zita, Sem, Mashal }, judo J = { Mashal, Rune, Rajesh, Mateo, Sem }. Geef H ∩ J, H ∪ J en H \\ J.',m:'H ∩ J = { Mashal, Sem } · H ∪ J = { Zita, Sem, Mashal, Rune, Rajesh, Mateo } · H \\ J = { Zita }'}
  ]
},
{
  id:'W4', vak:'wis', deel:1, titel:'Punt, rechte, halfrechte en lijnstuk',
  bron: B('blz. 108–118'),
  samenvatting:[
    '<h4>📄 Het vlak en een punt</h4><p>Het <b>vlak</b> is een <b>oneindige</b> verzameling van punten en is <b>onbegrensd</b> (het houdt nergens op).</p><p>Een <b>punt</b> is een element van het vlak en heeft <b>geen afmetingen</b>. Je tekent een punt als een <b>stip</b> en benoemt het met een <b>hoofdletter</b>: het punt A.</p>',
    '<h4>↔️ Rechte, halfrechte, lijnstuk</h4><table class="lp-ww lp-tijd"><tr><td>rechte <i>a</i> of AB</td><td>aan <b>beide kanten onbegrensd</b> · naam met een <b>kleine letter</b> of twee punten</td></tr></table>' + lijn('rechte') + '<table class="lp-ww lp-tijd"><tr><td>halfrechte [AB</td><td>aan <b>één kant begrensd</b> · A is het <b>grenspunt</b></td></tr></table>' + lijn('half') + '<table class="lp-ww lp-tijd"><tr><td>lijnstuk [AB]</td><td>aan <b>twee kanten begrensd</b> · A en B zijn de grenspunten</td></tr></table>' + lijn('stuk') + '<p class="lp-tip">💡 Het <b>haakje [</b> staat aan de kant waar de lijn <b>stopt</b>. Bij [AB stopt hij bij A, bij [AB] aan beide kanten.</p>',
    '<h4>🧺 Lijnen zijn ook verzamelingen</h4><p>Een rechte, halfrechte en lijnstuk zijn verzamelingen van <b>oneindig veel punten</b>. Daarom gebruik je de symbolen van hoofdstuk 1:</p><table class="lp-ww"><tr><td>A ∈ a</td><td>punt A ligt <b>op</b> de rechte a</td><td>element</td></tr><tr><td>C ∉ a</td><td>punt C ligt <b>niet</b> op a</td><td></td></tr><tr><td>[CD] ⊂ m</td><td>het lijnstuk ligt op de rechte m</td><td>deelverzameling</td></tr></table><p>De rechte m noemen we de <b>drager</b> van het lijnstuk [CD] of de halfrechte [CD.</p>',
    '<h4>📏 Collineaire punten</h4><p><b>Collineaire punten</b> zijn <b>drie of meer</b> punten die op <b>dezelfde rechte</b> liggen.</p><p class="lp-vb">A, B, Q ∈ r → A, B en Q zijn collineair.<br>Ligt C er niet op → A, B en C zijn <b>niet-collineair</b>.</p><p class="lp-tip">✏️ Teken altijd in <b>potlood</b>, werk <b>nauwkeurig</b> met je geodriehoek en <b>benoem</b> elk punt: dat staat op punten!</p>'
  ],
  kaarten:[
    ['Wat is het vlak?','Een oneindige verzameling van punten; het is onbegrensd'],
    ['Wat is een punt?','Een element van het vlak zonder afmetingen; je tekent een stip en noteert een hoofdletter'],
    ['Wat is een rechte?','Een rechte lijn die aan beide kanten onbegrensd is'],
    ['Wat is een halfrechte?','Een deel van een rechte dat aan één kant begrensd is, bv. [AB'],
    ['Wat is een lijnstuk?','Een deel van een rechte dat aan twee kanten begrensd is, bv. [AB]'],
    ['Wat zijn collineaire punten?','Drie of meer punten die op dezelfde rechte liggen'],
    ['Wat is de drager van een lijnstuk?','De rechte waarop het lijnstuk ligt'],
    ['Wat is het grenspunt van [AB?','A']
  ],
  quiz:[
    {t:'mc',v:'Hoe noteer je het lijnstuk met grenspunten P en Q?',o:['[PQ]','[PQ','PQ','|PQ|'],a:0},
    {t:'mc',v:'Hoe noteer je de halfrechte met grenspunt A die door B gaat?',o:['[AB','[AB]','AB]','|AB|'],a:0},
    {t:'mc',v:'Hoeveel kanten van een rechte zijn begrensd?',o:['Geen','Eén','Twee','Drie'],a:0},
    {t:'mc',v:'Punt K ligt op de rechte r. Hoe noteer je dat?',o:['K ∈ r','K ⊂ r','r ∈ K','K ∉ r'],a:0},
    {t:'mc',v:'Het lijnstuk [AB] ligt op de rechte d. Hoe noteer je dat?',o:['[AB] ⊂ d','[AB] ∈ d','d ⊂ [AB]','[AB] ∉ d'],a:0},
    {t:'mc',v:'Wanneer zijn punten collineair?',o:['Als ze op dezelfde rechte liggen','Als ze even ver van elkaar liggen','Als ze met dezelfde letter heten','Als ze in een cirkel liggen'],a:0},
    {t:'mc',v:'Hoeveel punten heeft een lijnstuk?',o:['Oneindig veel','2','3','Geen'],a:0},
    {t:'jf',v:'Een punt heeft geen afmetingen.',a:true},
    {t:'jf',v:'Een halfrechte is aan twee kanten begrensd.',a:false,u:'Aan één kant: dat is het grenspunt.'},
    {t:'jf',v:'[AB en [BA zijn dezelfde halfrechte.',a:false,u:'Het grenspunt is anders (A of B) en ze lopen in een andere richting.'},
    {t:'invul',v:'De rechte waarop een lijnstuk ligt, noem je de … van het lijnstuk.',a:['drager']},
    {t:'open',v:'Leg het verschil uit tussen een rechte, een halfrechte en een lijnstuk.',m:'Een rechte is aan geen enkele kant begrensd, een halfrechte aan één kant (grenspunt), een lijnstuk aan twee kanten (twee grenspunten).'}
  ]
},
{
  id:'W5', vak:'wis', deel:1, titel:'Lengte, midden en lengtematen herleiden',
  bron: B('blz. 119–137'), reken:'lengte',
  samenvatting:[
    '<h4>📏 Lengte van een lijnstuk</h4><p>De <b>lengte</b> van een lijnstuk is de <b>kortste afstand</b> tussen de grenspunten.</p><p class="lp-vb">noteer: <b>|AB| = 5 cm</b> · lees: de lengte van het lijnstuk [AB] is 5 cm<br>5 = het <b>maatgetal</b> · cm = de <b>lengte-eenheid</b></p><p class="lp-tip">⚠️ [AB] is het lijnstuk zelf (een tekening), |AB| is zijn <b>lengte</b> (een getal met eenheid). Meet tot op <b>1 mm</b> nauwkeurig.</p>',
    '<h4>🎯 Midden van een lijnstuk</h4><p>Het <b>midden</b> van een lijnstuk is het punt <b>op</b> het lijnstuk dat <b>even ver</b> van beide grenspunten ligt.</p><p class="lp-vb">M is het midden van [AB] → <b>|AM| = |MB|</b></p><p>Even lange lijnstukken duid je aan met hetzelfde <b>merkteken</b>: |, ||, |||, X …</p><div class="lp-tegels k2"><div><i>📐</i><b>met de geodriehoek</b><small>meet |AB|, deel door 2, zet M op die afstand van A</small></div><div><i>🧭</i><b>met de passer</b><small>passer groter dan de helft, cirkelboogjes vanuit A en vanuit B, verbind de snijpunten: waar die lijn [AB] snijdt = M</small></div></div>',
    '<h4>🔁 Lengtematen herleiden</h4><p>De <b>meter (m)</b> is de hoofdeenheid. Gebruik de <b>herleidingstabel</b>:</p><table class="lp-ww" style="text-align:center"><tr><td>km</td><td>hm</td><td>dam</td><td><b>m</b></td><td>dm</td><td>cm</td><td>mm</td></tr><tr><td>1000 m</td><td>100 m</td><td>10 m</td><td>1 m</td><td>0,1 m</td><td>0,01 m</td><td>0,001 m</td></tr></table><p>Elke stap = <b>× 10</b> (naar rechts, kleiner) of <b>: 10</b> (naar links, groter).</p><p class="lp-vb">765 m = <b>76 500 cm</b> (2 stappen naar rechts: × 100)<br>3,4 cm = <b>0,034 m</b> (2 stappen naar links: : 100)<br>255 mm = <b>2,55 dm</b></p><p class="lp-tip">💡 Ezelsbrug: <b>K</b>oning <b>H</b>endrik <b>D</b>anste <b>M</b>et <b>D</b>e <b>C</b>ircus<b>m</b>uis (km hm dam m dm cm mm)</p>',
    '<h4>🗺️ Schaal</h4><p>Schaal is de verhouding die zegt hoeveel keer de werkelijkheid <b>verkleind</b> of <b>vergroot</b> is.</p><p class="lp-vb">Schaal 1 : 25 → 1 cm op de tekening = 25 cm in het echt.<br>De Eiffeltoren (325 m) is in Mini-Europa 13 m: 325 : 13 = 25 → schaal 1 : 25.</p>',
    '<h4>🧮 Vraagstukken met je rekenmachine</h4><ol><li>Lees de opgave <b>twee keer</b>. Wat wordt gevraagd?</li><li>Zet alles in <b>dezelfde eenheid</b>.</li><li>Noteer de <b>berekening met eenheden</b> (ook als je de RM gebruikt).</li><li>Schrijf een <b>antwoordzin</b>.</li></ol><p class="lp-vb">Thor skatet 3 rondjes van 850 m. Hoeveel km is dat?<br>3 · 850 m = 2 550 m = <b>2,55 km</b><br>Antwoord: Thor skatet 2,55 km.</p><p class="lp-tip">⚠️ Zonder eenheden en antwoordzin verlies je punten, ook als het getal juist is!</p>'
  ],
  kaarten:[
    ['Wat is de lengte van een lijnstuk?','De kortste afstand tussen de grenspunten'],
    ['Wat betekent |AB| = 5 cm?','De lengte van het lijnstuk [AB] is 5 cm'],
    ['Wat is het midden van een lijnstuk?','Het punt op het lijnstuk dat even ver van beide grenspunten ligt'],
    ['Hoe duid je even lange lijnstukken aan?','Met hetzelfde merkteken: |, ||, |||, X'],
    ['Wat is de hoofdeenheid van lengte?','De meter (m)'],
    ['Geef de lengte-eenheden van groot naar klein','km – hm – dam – m – dm – cm – mm'],
    ['Hoeveel meter is 1 hm?','100 m'],
    ['Wat moet er bij een vraagstuk altijd bij?','Berekening met eenheden én een antwoordzin'],
    ['Wat betekent schaal 1 : 25?','1 cm op de tekening is 25 cm in het echt (25 keer verkleind)']
  ],
  quiz:[
    {t:'mc',v:'3,5 km = … m',o:['3 500','350','35 000','0,0035'],a:0},
    {t:'mc',v:'48 mm = … cm',o:['4,8','480','0,48','48 000'],a:0},
    {t:'mc',v:'2 dam = … m',o:['20','200','0,2','2 000'],a:0},
    {t:'mc',v:'M is het midden van [AB] en |AB| = 9 cm. Hoe lang is |AM|?',o:['4,5 cm','9 cm','18 cm','3 cm'],a:0},
    {t:'mc',v:'Welke lengte-eenheid ligt tussen hm en m?',o:['dam','dm','km','cm'],a:0},
    {t:'mc',v:'Welke eenheid past bij de dikte van een skateboard?',o:['mm','km','hm','dam'],a:0},
    {t:'mc',v:'Wat noteer je voor de lengte van het lijnstuk [CD]?',o:['|CD|','[CD]','[CD','CD'],a:0},
    {t:'jf',v:'Bij een vraagstuk volstaat het juiste getal, een antwoordzin is niet nodig.',a:false,u:'Berekening met eenheden én antwoordzin staan op punten.'},
    {t:'jf',v:'1 m = 100 cm',a:true},
    {t:'jf',v:'Het midden van een lijnstuk ligt altijd op het lijnstuk.',a:true},
    {t:'invul',v:'De … is de hoofdeenheid van lengte.',a:['meter','m']},
    {t:'open',v:'Een vintage-verzamelaar zet 12 dozen van 35 cm breed naast elkaar op een rek van 4 m. Passen ze? Noteer berekening en antwoordzin.',m:'12 · 35 cm = 420 cm = 4,2 m. 4,2 m > 4 m. Antwoord: nee, de dozen passen niet; er is 20 cm te weinig.'}
  ]
},
// ================================================================ DEEL 2 (ma 14/12)
{
  id:'W6', vak:'wis', deel:2, examen:D2, leerTot:'2026-12-08', titel:'Natuurlijke getallen ordenen en de getallenas',
  bron: B('blz. 44–52'),
  samenvatting:[
    '<h4>🔢 Natuurlijke getallen</h4><p><b>Natuurlijke getallen</b> ontstaan door te <b>tellen</b>; je noteert er <b>aantallen</b> mee: ℕ = { 0, 1, 2, 3, … }</p><ul><li><b>0</b> is het <b>kleinste</b> natuurlijk getal.</li><li>Er bestaat <b>geen grootste</b>: de verzameling is <b>oneindig</b>.</li></ul>',
    '<h4>🔟 Ons talstelsel</h4><div class="lp-vs"><div><b>tiendelig of decimaal</b>alle getallen maak je met <b>tien cijfers</b>: 0 1 2 3 4 5 6 7 8 9</div><div><b>positiestelsel</b>de <b>plaats</b> van een cijfer bepaalt zijn waarde<small>in 707 is de eerste 7 = 700, de laatste 7 = 7</small></div></div>',
    '<h4>⚖️ Symbolen om te ordenen (blz. 45)</h4><table class="lp-ww"><tr><td>=</td><td>is gelijk aan</td><td>3 = 3</td></tr><tr><td>≠</td><td>is niet gelijk aan</td><td>24 ≠ 28</td></tr><tr><td>&lt;</td><td>is kleiner dan</td><td>11 &lt; 63</td></tr><tr><td>⩽</td><td>is kleiner dan of gelijk aan</td><td>5 ⩽ 9</td></tr><tr><td>&gt;</td><td>is groter dan</td><td>78 &gt; 44</td></tr><tr><td>⩾</td><td>is groter dan of gelijk aan</td><td>16 ⩾ 16</td></tr><tr><td>&lt; &lt;</td><td>ligt tussen</td><td>8 &lt; 15 &lt; 42</td></tr></table><p class="lp-tip">🐊 De <b>open bek</b> wijst altijd naar het <b>grootste</b> getal.</p>',
    '<h4>📍 De getallenas</h4><p>Getallen stel je voor op een <b>geijkte getallenas</b>. De <b>ijk</b> leg je vast door de afstand tussen twee getallen te kiezen, bv. tussen 0 en 1 (1 cm = ijk). Daarna heeft elk getal een <b>vaste plaats</b>.</p><svg viewBox="0 0 300 50" style="width:100%;max-width:320px;display:block;margin:4px auto"><line x1="10" y1="20" x2="290" y2="20" stroke="#1c7ed6" stroke-width="2"/><polygon points="290,15 298,20 290,25" fill="#1c7ed6"/>' + [0,1,2,3,4,5,6,7,8,9].map(i => `<line x1="${20 + i * 28}" y1="14" x2="${20 + i * 28}" y2="26" stroke="#1c7ed6" stroke-width="2"/><text x="${20 + i * 28}" y="42" text-anchor="middle" font-size="12" style="fill:var(--inkt)">${i}</text>`).join('') + '<path d="M20 8 L48 8" stroke="#f08c00" stroke-width="3"/><text x="34" y="6" text-anchor="middle" font-size="9" fill="#f08c00">ijk</text></svg><p class="lp-vb">Op het extra blad over getallenassen: kijk eerst <b>hoeveel één streepje waard is</b> (de ijk kan ook 5, 10 of 100 zijn!).</p>'
  ],
  kaarten:[
    ['Wat zijn natuurlijke getallen?','Getallen die ontstaan door te tellen; je noteert er aantallen mee'],
    ['Wat is het kleinste natuurlijk getal?','0'],
    ['Bestaat er een grootste natuurlijk getal?','Nee, de verzameling is oneindig'],
    ['Waarom heet ons talstelsel tiendelig of decimaal?','Omdat je alle getallen vormt met tien cijfers (0 t.e.m. 9)'],
    ['Waarom heet ons talstelsel een positiestelsel?','De plaats van een cijfer bepaalt zijn waarde'],
    ['Wat betekent ⩽?','Is kleiner dan of gelijk aan'],
    ['Wat betekent ⩾?','Is groter dan of gelijk aan'],
    ['Wat is de ijk van een getallenas?','De vastgelegde afstand tussen twee getallen, bv. tussen 0 en 1']
  ],
  quiz:[
    {t:'mc',v:'Welk symbool past? 45 … 54',o:['<','>','=','⩾'],a:0},
    {t:'mc',v:'Welk symbool past? 16 … 16',o:['⩽','<','>','≠'],a:0},
    {t:'mc',v:'Wat is het kleinste natuurlijk getal?',o:['0','1','−1','Er is geen kleinste'],a:0},
    {t:'mc',v:'In 3 <b>8</b>52, wat is de waarde van de 8?',o:['800','8','80','8 000'],a:0},
    {t:'mc',v:'Op een getallenas staat 0 bij het eerste streepje en 40 bij het vijfde streepje. Hoeveel is elk streepje waard?',o:['10','8','40','5'],a:0,u:'Van het 1e tot het 5e streepje zijn 4 stappen: 40 : 4 = 10.'},
    {t:'mc',v:'Hoe lees je 8 < 15 < 42?',o:['15 ligt tussen 8 en 42','8 is groter dan 15','42 is kleiner dan 8','15 is gelijk aan 42'],a:0},
    {t:'jf',v:'Er bestaat een grootste natuurlijk getal.',a:false,u:'Je kan altijd 1 bijtellen: de verzameling is oneindig.'},
    {t:'jf',v:'Ons talstelsel is een positiestelsel.',a:true},
    {t:'jf',v:'7 ⩾ 7 is juist.',a:true,u:'⩾ = groter dan óf gelijk aan.'},
    {t:'invul',v:'Ons talstelsel gebruikt … cijfers. (getal)',a:['10','tien']},
    {t:'open',v:'Leg uit wat “de ijk van een getallenas” is.',m:'De afstand tussen twee getallen die je vastlegt (bv. 1 cm tussen 0 en 1). Daarna heeft elk getal een vaste plaats op de as.'}
  ]
},
{
  id:'W7', vak:'wis', deel:2, examen:D2, leerTot:'2026-12-08', titel:'De vier hoofdbewerkingen en hun namen',
  bron: B('blz. 53–64'),
  samenvatting:[
    '<h4>➕➖✖️➗ De namen van de getallen</h4><table class="lp-ww lp-tijd"><tr><td>optelling</td><td>12 + 7 = 19 → 12 en 7 zijn de <b>termen</b>, 19 is de <b>som</b></td></tr><tr><td>aftrekking</td><td>63 − 18 = 45 → 63 = <b>aftrektal</b>, 18 = <b>aftrekker</b>, 45 = <b>verschil</b></td></tr><tr><td>vermenigvuldiging</td><td>15 · 3 = 45 → 15 en 3 zijn de <b>factoren</b>, 45 is het <b>product</b></td></tr><tr><td>deling</td><td>45 : 3 = 15 → 45 = <b>deeltal</b>, 3 = <b>deler</b>, 15 = <b>quotiënt</b></td></tr></table><p class="lp-tip">✏️ Vanaf nu schrijf je het maalteken als een <b>stip</b>: 15 · 3</p>',
    '<h4>🔄 Bewerkingen die bij elkaar horen</h4><div class="lp-vs"><div><b>+ en −</b>91 + 9 = 100 ↔ 100 − 91 = 9<small>aftrekken is het omgekeerde van optellen</small></div><div><b>· en :</b>15 · 3 = 45 ↔ 45 : 3 = 15<small>delen is het omgekeerde van vermenigvuldigen</small></div></div><p>Een <b>product</b> is een verkorte schrijfwijze van een <b>som met allemaal dezelfde termen</b>: 4 + 4 + 4 = 3 · 4</p>',
    '<h4>🚫 Delen door 0 gaat niet!</h4><p class="lp-vb">12 : 0 = ??? → er is geen getal dat je met 0 vermenigvuldigt om 12 te krijgen.<br>Maar 0 : 12 = 0 mag wél.</p>',
    '<h4>🧠 Rekenen zonder rekenmachine</h4><p>Op het examen deel 2 mag je <b>geen RM</b> gebruiken. Schrijf je <b>tussenstappen</b> op, want die staan op punten.</p><p class="lp-vb">“Het verschil van 50 en 18” = 50 − 18 = 32<br>“Het quotiënt van 56 en 8” = 56 : 8 = 7<br>“Het product van 6 en 7” = 6 · 7 = 42</p>'
  ],
  kaarten:[
    ['Hoe heten de getallen in 12 + 7 = 19?','12 en 7 zijn termen, 19 is de som'],
    ['Hoe heten de getallen in 63 − 18 = 45?','63 = aftrektal, 18 = aftrekker, 45 = verschil'],
    ['Hoe heten de getallen in 15 · 3 = 45?','15 en 3 zijn factoren, 45 is het product'],
    ['Hoe heten de getallen in 45 : 3 = 15?','45 = deeltal, 3 = deler, 15 = quotiënt'],
    ['Welk teken gebruik je voor “maal”?','Een stip ·'],
    ['Wat is een product?','Een verkorte schrijfwijze van een som met allemaal dezelfde termen'],
    ['Kan je delen door 0?','Nee, delen door 0 gaat niet'],
    ['Wat is het omgekeerde van vermenigvuldigen?','Delen']
  ],
  quiz:[
    {t:'mc',v:'In 56 : 8 = 7, hoe heet 8?',o:['de deler','het deeltal','het quotiënt','de factor'],a:0},
    {t:'mc',v:'In 63 − 18 = 45, hoe heet 63?',o:['het aftrektal','de aftrekker','het verschil','de term'],a:0},
    {t:'mc',v:'Hoe heet de uitkomst van een vermenigvuldiging?',o:['product','som','quotiënt','verschil'],a:0},
    {t:'mc',v:'Hoe heet de uitkomst van een deling?',o:['quotiënt','product','deler','verschil'],a:0},
    {t:'mc',v:'Bereken het verschil van 100 en 37.',o:['63','137','73','3 700'],a:0},
    {t:'mc',v:'Bereken de som van 13 en 26.',o:['39','338','13','49'],a:0},
    {t:'mc',v:'Welke bewerking gaat <b>niet</b>?',o:['9 : 0','0 : 9','9 · 0','0 + 9'],a:0},
    {t:'mc',v:'7 + 7 + 7 + 7 schrijf je korter als…',o:['4 · 7','7 · 7','7⁴','4 + 7'],a:0},
    {t:'jf',v:'In 6 · 8 = 48 zijn 6 en 8 de termen.',a:false,u:'Bij een vermenigvuldiging zijn het factoren. Termen horen bij een optelling.'},
    {t:'jf',v:'0 : 5 = 0',a:true},
    {t:'invul',v:'In 45 : 9 = 5 is 45 het … .',a:['deeltal']},
    {t:'open',v:'Waarom gaat 8 : 0 niet? Leg uit met het verband tussen vermenigvuldigen en delen.',m:'8 : 0 = ? zou betekenen dat ? · 0 = 8. Maar elk getal maal 0 is 0, nooit 8. Er bestaat dus geen uitkomst: delen door 0 gaat niet.'}
  ]
},
{
  id:'W8', vak:'wis', deel:2, examen:D2, leerTot:'2026-12-08', titel:'Rekeneigenschappen: commutatief, associatief, distributief',
  bron: B('blz. 65–81'),
  samenvatting:[
    '<h4>🔀 Commutatief = wisselen mag</h4><p>De uitkomst blijft dezelfde als je de getallen van <b>plaats verwisselt</b>.</p><table class="lp-ww"><tr><td>optelling</td><td>a + b = b + a</td><td>2 + 3 = 3 + 2</td></tr><tr><td>vermenigvuldiging</td><td>a · b = b · a</td><td>3 · 9 = 9 · 3</td></tr></table><p class="lp-tip">⚠️ Aftrekken en delen zijn <b>niet</b> commutatief: 5 − 4 ≠ 4 − 5 en 10 : 2 ≠ 2 : 10</p>',
    '<h4>🫂 Associatief = groeperen mag</h4><p>Je mag kiezen welke getallen je <b>eerst</b> optelt of vermenigvuldigt. <b>Haakjes</b> tonen wat eerst gaat.</p><table class="lp-ww"><tr><td>optelling</td><td>(a + b) + c = a + (b + c)</td><td></td></tr><tr><td>vermenigvuldiging</td><td>(a · b) · c = a · (b · c)</td><td></td></tr></table><p class="lp-vb">Handig rekenen: 16 + 32 + 14 + 8 = (16 + 14) + (32 + 8) = 30 + 40 = <b>70</b></p><p class="lp-tip">⚠️ Ook hier: aftrekken en delen zijn <b>niet</b> associatief.</p>',
    '<h4>0️⃣ 1️⃣ Neutraal en opslorpend</h4><div class="lp-tegels"><div><i>0</i><b>neutraal bij +</b><small>a + 0 = a</small></div><div><i>1</i><b>neutraal bij ·</b><small>a · 1 = a</small></div><div><i>0</i><b>opslorpend bij ·</b><small>a · 0 = 0<br>0 “slorpt” alles op</small></div></div>',
    '<h4>📦 Distributief = uitdelen</h4><p>Vermenigvuldig je een getal met een <b>som of verschil</b>, dan vermenigvuldig je het getal met <b>elke term</b>.</p><table class="lp-ww"><tr><td>t.o.v. +</td><td>a · (b + c) = a · b + a · c</td><td></td></tr><tr><td>t.o.v. −</td><td>a · (b − c) = a · b − a · c</td><td></td></tr></table><p class="lp-vb">(2 + 3) · 5 = 2 · 5 + 3 · 5 = 10 + 15 = 25<br>Handig: 7 · 98 = 7 · (100 − 2) = 700 − 14 = <b>686</b></p><p class="lp-tip">💡 Bij een oefening “noteer de eigenschap” schrijf je de <b>volledige zin</b>: “De vermenigvuldiging is distributief ten opzichte van de optelling.”</p>'
  ],
  kaarten:[
    ['Wat betekent commutatief?','De uitkomst blijft gelijk als je de getallen van plaats verwisselt'],
    ['Wat betekent associatief?','Je mag kiezen welke getallen je eerst optelt of vermenigvuldigt (haakjes verplaatsen)'],
    ['Welke bewerkingen zijn commutatief en associatief?','De optelling en de vermenigvuldiging (niet aftrekken en delen)'],
    ['Wat is het neutrale element voor de optelling?','0, want a + 0 = a'],
    ['Wat is het neutrale element voor de vermenigvuldiging?','1, want a · 1 = a'],
    ['Wat is het opslorpende element voor de vermenigvuldiging?','0, want a · 0 = 0'],
    ['Wat zegt de distributieve eigenschap?','a · (b + c) = a · b + a · c: vermenigvuldig met elke term'],
    ['Formule commutativiteit van de vermenigvuldiging?','a · b = b · a']
  ],
  quiz:[
    {t:'mc',v:'Welke eigenschap: 4 · 7 = 7 · 4',o:['De vermenigvuldiging is commutatief','De vermenigvuldiging is associatief','Distributief t.o.v. de optelling','1 is neutraal'],a:0},
    {t:'mc',v:'Welke eigenschap: (6 + 3) + 7 = 6 + (3 + 7)',o:['De optelling is associatief','De optelling is commutatief','0 is neutraal','Distributief'],a:0},
    {t:'mc',v:'Welke eigenschap: 5 · (4 + 2) = 5 · 4 + 5 · 2',o:['Distributief t.o.v. de optelling','Commutatief','Associatief','Opslorpend element'],a:0},
    {t:'mc',v:'Welke eigenschap: 238 · 0 = 0',o:['0 is opslorpend voor de vermenigvuldiging','0 is neutraal voor de optelling','1 is neutraal','Commutatief'],a:0},
    {t:'mc',v:'Welke eigenschap: 57 · 1 = 57',o:['1 is neutraal voor de vermenigvuldiging','0 is opslorpend','Associatief','Distributief'],a:0},
    {t:'mc',v:'Bereken handig: 25 · 17 · 4',o:['1 700','425','1 600','68'],a:0,u:'25 · 4 = 100 eerst (commutatief + associatief), dan 100 · 17.'},
    {t:'mc',v:'Bereken handig: 9 · 102',o:['918','908','912','9 102'],a:0,u:'9 · (100 + 2) = 900 + 18'},
    {t:'mc',v:'Welke gelijkheid is <b>fout</b>?',o:['12 − 5 = 5 − 12','12 + 5 = 5 + 12','12 · 5 = 5 · 12','12 + 0 = 12'],a:0},
    {t:'jf',v:'De deling is commutatief.',a:false,u:'10 : 2 = 5 maar 2 : 10 = 0,2.'},
    {t:'jf',v:'0 is het neutrale element voor de optelling.',a:true},
    {t:'invul',v:'a · (b − c) = a · b − a · … (letter)',a:['c']},
    {t:'open',v:'Bereken 16 + 27 + 4 + 13 zo handig mogelijk en noem de eigenschappen die je gebruikt.',m:'= (16 + 4) + (27 + 13) = 20 + 40 = 60. Eerst de optelling is commutatief (getallen wisselen), dan de optelling is associatief (anders groeperen).'}
  ]
},
{
  id:'W9', vak:'wis', deel:2, examen:D2, leerTot:'2026-12-08', titel:'Machten en vierkantswortels',
  bron: B('blz. 82–90 + geel blad machten'), reken:'macht',
  samenvatting:[
    '<h4>🚀 Wat is een macht?</h4><p>Een <b>macht</b> is een verkorte schrijfwijze van een <b>product met allemaal dezelfde factoren</b>.</p><p class="lp-vb">2 · 2 · 2 · 2 · 2 · 2 = <b>2<sup>6</sup></b> = 64<br>2 = het <b>grondtal</b> · 6 = de <b>exponent</b><br>lees: twee tot de zesde (macht)</p><p class="lp-tip">⚠️ 2<sup>6</sup> is <b>niet</b> 2 · 6 = 12! Het is 6 keer de factor 2.</p>',
    '<h4>🟦 Kwadraten: van buiten kennen!</h4><p>De tweede macht noem je ook het <b>kwadraat</b>. Deze moet je van buiten kennen (geel blad):</p><table class="lp-ww" style="text-align:center"><tr><td>1²=1</td><td>2²=4</td><td>3²=9</td><td>4²=16</td><td>5²=25</td></tr><tr><td>6²=36</td><td>7²=49</td><td>8²=64</td><td>9²=81</td><td>10²=100</td></tr><tr><td>11²=121</td><td>12²=144</td><td>13²=169</td><td>14²=196</td><td>15²=225</td></tr></table><p class="lp-vb">Speciaal: a<sup>1</sup> = a · 0<sup>5</sup> = 0 · 1<sup>5</sup> = 1 · 10<sup>3</sup> = 1 000 (zoveel nullen als de exponent)</p>',
    '<h4>√ Vierkantswortel</h4><p>De <b>vierkantswortel</b> van een getal is het getal dat je <b>in het kwadraat</b> moet brengen om dat getal te krijgen. Het is het <b>omgekeerde</b> van kwadrateren.</p><p class="lp-vb">√16 = 4 want 4² = 16<br>√9 = 3 want 3² = 9 · √1 = 1 · √64 = 8<br>√490 000 = 700 want 700² = 490 000<br>√18 ∉ ℕ want geen enkel natuurlijk getal heeft 18 als kwadraat</p><p class="lp-tip">💡 Schrijf altijd “<b>want …²= …</b>” erbij: zo controleer je jezelf.</p>',
    '<h4>🛹 Waarom “kwadraat”?</h4><p>Een vierkant met zijde 5 heeft 5 · 5 = 5² = <b>25</b> tegels. Omgekeerd: 25 banken in een vierkant → elke zijde √25 = <b>5</b> banken.</p>'
  ],
  kaarten:[
    ['Wat is een macht?','Een verkorte schrijfwijze van een product met allemaal dezelfde factoren'],
    ['In 2⁶: wat is het grondtal en wat de exponent?','2 is het grondtal, 6 is de exponent'],
    ['Hoe noem je de tweede macht nog?','Het kwadraat'],
    ['Wat is een vierkantswortel?','Het getal dat je in het kwadraat moet brengen om het gegeven getal te krijgen'],
    ['√144 = ?','12, want 12² = 144'],
    ['13² = ?','169'],
    ['14² = ?','196'],
    ['15² = ?','225'],
    ['10⁴ = ?','10 000'],
    ['Is √18 een natuurlijk getal?','Nee, geen enkel natuurlijk getal heeft 18 als kwadraat']
  ],
  quiz:[
    {t:'mc',v:'3<sup>4</sup> = …',o:['81','12','64','27'],a:0},
    {t:'mc',v:'Hoe schrijf je 5 · 5 · 5 als macht?',o:['5³','3⁵','5 · 3','15'],a:0},
    {t:'mc',v:'√81 = …',o:['9','8','40,5','6 561'],a:0},
    {t:'mc',v:'In 7<sup>3</sup> is 7 het …',o:['grondtal','exponent','kwadraat','product'],a:0},
    {t:'mc',v:'2<sup>5</sup> = …',o:['32','10','25','16'],a:0},
    {t:'mc',v:'0<sup>4</sup> = …',o:['0','1','4','40'],a:0},
    {t:'mc',v:'1<sup>9</sup> = …',o:['1','9','0','19'],a:0},
    {t:'mc',v:'√169 = …',o:['13','14','12','84,5'],a:0},
    {t:'jf',v:'4³ = 12',a:false,u:'4³ = 4 · 4 · 4 = 64.'},
    {t:'jf',v:'√49 = 7 want 7² = 49',a:true},
    {t:'invul',v:'De tweede macht van een getal noem je ook het … .',a:['kwadraat']},
    {t:'open',v:'Leg het verschil uit tussen 3² en 2³ en bereken beide.',m:'3² = 3 · 3 = 9 (grondtal 3, exponent 2). 2³ = 2 · 2 · 2 = 8 (grondtal 2, exponent 3). Ze zijn dus niet gelijk.'}
  ]
},
{
  id:'W10', vak:'wis', deel:2, examen:D2, leerTot:'2026-12-08', titel:'Volgorde van de bewerkingen',
  bron: B('blz. 91–100'), reken:'volgorde',
  samenvatting:[
    '<h4>🪜 De vaste volgorde</h4><p>Staat er <b>meer dan één bewerking</b> in een oefening? Dan werk je altijd in deze volgorde:</p><div class="lp-stroom"><div><span><b>1.</b> bewerkingen tussen <b>haakjes</b></span><b>( )</b></div><div><span><b>2.</b> <b>machten</b> en <b>vierkantswortels</b></span><b>x² √</b></div><div><span><b>3.</b> <b>vermenigvuldigen en delen</b>, van links naar rechts</span><b>· :</b></div><div><span><b>4.</b> <b>optellen en aftrekken</b>, van links naar rechts</span><b>+ −</b></div></div><p class="lp-tip">🛹 Ezelsbrug: <b>H</b>aakjes – <b>M</b>achten – <b>V</b>ermenigvuldigen/<b>D</b>elen – <b>O</b>ptellen/<b>A</b>ftrekken → “<b>Hé, Mijn Vriend Doet Ollies Achteruit</b>”</p>',
    '<h4>⚠️ Haakjes geven voorrang</h4><p class="lp-vb">2 + 3 · 4 = 2 + 12 = <b>14</b><br>(2 + 3) · 4 = 5 · 4 = <b>20</b></p><p>Zonder haakjes gaat de vermenigvuldiging voor. Wie zei dat het 20 was, rekende gewoon van links naar rechts: fout!</p>',
    '<h4>✍️ Voorbeeld met tussenstappen</h4><p class="lp-vb">2³ · √25 + 3 · (2 + 5)<br>= 2³ · √25 + 3 · 7 &nbsp;&nbsp;<i>(haakjes)</i><br>= 8 · 5 + 3 · 7 &nbsp;&nbsp;<i>(macht en wortel)</i><br>= 40 + 21 &nbsp;&nbsp;<i>(maal)</i><br>= <b>61</b> &nbsp;&nbsp;<i>(plus)</i></p><p class="lp-tip">💡 Elke regel begint met <b>=</b> en je schrijft wat je nog niet berekent <b>gewoon over</b>. Tussenstappen staan op punten!</p>',
    '<h4>↔️ Van links naar rechts</h4><p>Staan · en : (of + en −) naast elkaar? Dan gewoon <b>van links naar rechts</b>, niet eerst het ene en dan het andere.</p><p class="lp-vb">48 : 2³ · 3 = 48 : 8 · 3 = 6 · 3 = <b>18</b> (niet 48 : 24 = 2!)<br>20 − 8 + 2 = 12 + 2 = <b>14</b> (niet 20 − 10 = 10!)</p>'
  ],
  kaarten:[
    ['Wat is de volgorde van de bewerkingen?','1 haakjes · 2 machten en wortels · 3 vermenigvuldigen en delen (links → rechts) · 4 optellen en aftrekken (links → rechts)'],
    ['2 + 3 · 4 = ?','14'],
    ['(2 + 3) · 4 = ?','20'],
    ['Wat doe je als · en : naast elkaar staan?','Van links naar rechts rekenen'],
    ['20 − 8 + 2 = ?','14 (van links naar rechts)'],
    ['Wat geven haakjes?','Voorrang aan een bewerking die anders geen voorrang zou hebben'],
    ['Wat komt eerst: een macht of een vermenigvuldiging?','De macht']
  ],
  quiz:[
    {t:'mc',v:'12 + 7 · 3 = …',o:['33','57','22','36'],a:0},
    {t:'mc',v:'(31 − 3) : 4 = …',o:['7','30,25','28','8'],a:0},
    {t:'mc',v:'25 − 12 : 3 = …',o:['21','4,33…','13','9'],a:0},
    {t:'mc',v:'15 + 8 · 2 − 4² = …',o:['15','30','46','−1'],a:0,u:'4² = 16, 8 · 2 = 16 → 15 + 16 − 16 = 15'},
    {t:'mc',v:'48 : 2³ · 3 = …',o:['18','2','144','6'],a:0},
    {t:'mc',v:'2 + 3 · (4 − 1) = …',o:['11','15','9','13'],a:0},
    {t:'mc',v:'Wat bereken je eerst in 6 + 2 · √36?',o:['√36','6 + 2','2 · √36','alles tegelijk'],a:0},
    {t:'mc',v:'√64 + 4² : 8 = …',o:['10','3','24','4'],a:0,u:'8 + 16 : 8 = 8 + 2 = 10'},
    {t:'jf',v:'Optellen komt altijd vóór aftrekken.',a:false,u:'Optellen en aftrekken doe je samen van links naar rechts.'},
    {t:'jf',v:'Haakjes bereken je altijd eerst.',a:true},
    {t:'invul',v:'Na de haakjes bereken je de … en de vierkantswortels.',a:['machten']},
    {t:'open',v:'Bereken met tussenstappen: 3² · √16 − 5 · (6 − 2)',m:'= 3² · √16 − 5 · 4 = 9 · 4 − 5 · 4 = 36 − 20 = 16'}
  ]
}
);
})();
