// Geschiedenis (1A) — examen do 10/12. Voorlopig enkel hoofdstuk 1 (Sapiens 1: "Maak kennis met de ijsmummie Ötzi",
// p. 9–30 + Histokit p. 150–155), op basis van de filmpjes op Smartschool die papa doorstuurde (21/11).
// Het volledige leerstofoverzicht ontbreekt nog.
(function(){
const BOEK = 'https://drive.google.com/file/d/1-0pmwParvq8YWuN6Siphp_U8qseO-vb3/view';
const KIT = 'https://drive.google.com/file/d/1NPPa8bg4kraaq3QuA6ACBYPw7MjQ_s-Z/view';
const B = (p, kit) => [['Sapiens 1 · ' + p, BOEK]].concat(kit ? [['Histokit · ' + kit, KIT]] : []);
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'G1', vak:'ges', titel:'Ötzi en historische bronnen',
  bron: B('p. 12–16 en 25–29', 'p. 155'),
  samenvatting:[
    '<h4>🧊 Ötzi, de ijsmummie</h4><p>In <b>1991</b> vonden twee bergwandelaars in de <b>Ötztaler Alpen</b> (Italië, net over de grens met Oostenrijk) een lijk in het ijs. Het bleek een man die ongeveer <b>5 300 jaar</b> geleden stierf: <b>Ötzi</b>. Het ijs had hem bewaard. Vandaag ligt hij in een diepvriezer in het archeologiemuseum van <b>Bolzano</b>.</p><p>Bij hem lagen een <b>koperen bijl</b>, een vuurstenen pijlpunt, een boog, sneeuwschoenen, een muts …</p>',
    '<h4>🕵️ Zo werkt een historicus</h4><div class="lp-ketting"><span>spoor uit het verleden</span><i>→</i><span>historische vraag<small> wie? wanneer? waar? waarom?</small></span><i>→</i><span>bronnenstudie</span><i>→</i><span>beeld van het verleden</span></div><p>Historici stellen <b>historische vragen</b> en zoeken het antwoord in <b>zoveel mogelijk verschillende bronnen</b>, die ze met elkaar <b>vergelijken</b>. Het beeld dat zo ontstaat is altijd een <b>reconstructie</b>: niet hoe het echt was, maar een poging om het verleden zo correct mogelijk na te bouwen.</p>',
    '<h4>📜 Bron of werk?</h4><div class="lp-vs"><div><b>Historische bron</b>een <b>overblijfsel uit het verleden</b> zelf<small>Ötzi’s mummie, zijn bijl</small></div><div><b>Historisch werk</b>iets dat <b>later gemaakt</b> is, <b>gebaseerd op</b> bronnen (resultaat van onderzoek)<small>krantenartikel over Ötzi, je leraar die vertelt</small></div></div><table class="lp-ww lp-tijd"><tr><td>geschreven</td><td>bron: brief, cijfergegevens, verslag · werk: geschiedenisboek, historische roman</td></tr><tr><td>mondeling</td><td>bron: een <b>ooggetuige</b> die vertelt · werk: de <b>leraar</b> of een <b>museumgids</b> die vertelt</td></tr><tr><td>materieel</td><td>bron: mummie, potscherf, kledij, graf, ruïne · werk: reconstructie van een standbeeld (of van Ötzi in het museum)</td></tr><tr><td>(audio)visueel</td><td>bron: geluidsfragment, foto, filmfragment · werk: documentaire, film, kaart</td></tr></table><p class="lp-tip">💡 Over Ötzi hebben we vooral <b>materiële</b> bronnen. <b>Geschreven</b> bronnen zijn er niet: in zijn tijd werd er nog niet geschreven.</p>',
    '<h4>✅ Feit of ❓ hypothese?</h4><div class="lp-vs"><div><b>Feit</b>een <b>bewezen</b> antwoord: er is genoeg bewijs<small>Ötzi werd gedood door een pijlpunt in zijn schouder · hij had net nog gegeten · hij had 57 tatoeages · hij droeg winterkledij uit 5 dierenhuiden</small></div><div><b>Hypothese</b>een stelling die <b>nog niet bewezen</b> is<small>waarom werd hij vermoord? roofoverval? was hij een leider? hadden de tatoeages een religieuze functie?</small></div></div>'
  ],
  kaarten:[
    ['Wanneer en waar werd Ötzi gevonden?','In 1991 in de Ötztaler Alpen (Italië)'],
    ['Hoe lang geleden leefde Ötzi?','Ongeveer 5 300 jaar geleden'],
    ['Wat is een historische bron?','Een overblijfsel uit het verleden'],
    ['Wat is een historisch werk?','Een werk dat later gemaakt is en gebaseerd is op historische bronnen'],
    ['Welke 4 soorten bronnen/werken ken je?','Geschreven, mondeling, materieel en (audio)visueel'],
    ['Is de mummie van Ötzi een bron of een werk?','Een materiële bron'],
    ['Is een krantenartikel uit 2023 over Ötzi een bron of een werk?','Een (geschreven) historisch werk'],
    ['Wat is een feit?','Een bewezen antwoord op een historische vraag'],
    ['Wat is een hypothese?','Een stelling die (nog) niet bewezen is'],
    ['Welke soort bronnen hebben we níet over Ötzi?','Geschreven bronnen (toen werd nog niet geschreven)']
  ],
  quiz:[
    {t:'mc',v:'De koperen bijl die naast Ötzi lag, is een…',o:['materiële bron','geschreven werk','mondelinge bron','audiovisueel werk'],a:0},
    {t:'mc',v:'Je leraar vertelt in de klas over Ötzi. Dat is een…',o:['mondeling werk','mondelinge bron','materiële bron','geschreven bron'],a:0},
    {t:'mc',v:'Een documentaire op tv over Ötzi is een…',o:['audiovisueel werk','audiovisuele bron','materiële bron','mondelinge bron'],a:0},
    {t:'mc',v:'Een foto uit 1916 van soldaten bij Verdun is een…',o:['(audio)visuele bron','audiovisueel werk','materieel werk','geschreven werk'],a:0},
    {t:'mc',v:'Een soldaat die zelf in de oorlog vocht, vertelt erover. Dat is een…',o:['mondelinge bron (ooggetuige)','mondeling werk','geschreven bron','materieel werk'],a:0},
    {t:'mc',v:'De nagemaakte pop van Ötzi in het museum is een…',o:['materieel werk (reconstructie)','materiële bron','geschreven bron','mondelinge bron'],a:0},
    {t:'mc',v:'“Ötzi werd vermoord omdat hij iets gestolen had.” Dit is een…',o:['hypothese','feit','bron','periode'],a:0},
    {t:'mc',v:'“Ötzi werd gedood door een pijl in de schouder.” Dit is een…',o:['feit','hypothese','werk','vraag'],a:0},
    {t:'jf',v:'Historici vergelijken zoveel mogelijk bronnen met elkaar.',a:true},
    {t:'jf',v:'Ons beeld van Ötzi is precies hoe hij echt was.',a:false,u:'Het is een reconstructie: een poging om het verleden zo correct mogelijk na te bouwen.'},
    {t:'jf',v:'Over Ötzi bestaan geen geschreven bronnen.',a:true},
    {t:'invul',v:'Een overblijfsel uit het verleden noem je een historische … .',a:['bron']},
    {t:'open',v:'Leg het verschil uit tussen een historische bron en een historisch werk, met een voorbeeld over Ötzi.',m:'Een bron is een overblijfsel uit het verleden zelf, bv. de mummie of de koperen bijl. Een werk is later gemaakt op basis van bronnen, bv. een krantenartikel, een documentaire of de reconstructie in het museum.'}
  ]
},
{
  id:'G2', vak:'ges', titel:'Situeren in de tijd: de tijdlijn en de periodes',
  bron: B('p. 16–20', 'p. 150'),
  samenvatting:[
    '<h4>⏳ Situeren in de tijd</h4><p><b>Situeren in de tijd</b> = nauwkeurig zeggen <b>wanneer</b> iets gebeurde of <b>hoelang</b> het duurde. Daarbij helpen <b>structuurbegrippen van tijd</b>: <b>jaar, eeuw, millennium, periode, duur, chronologie</b> (de volgorde in de tijd), <b>tijdrekening</b> en <b>scharnierpunt</b>.</p>',
    '<h4>✝️ De christelijke tijdrekening</h4><p>De <b>geboorte van Jezus Christus</b> is het <b>jaar 1</b>. Alles daarvoor is <b>voor Christus (v.C.)</b>, alles daarna <b>na Christus (n.C.)</b>. Er is <b>geen jaar 0</b>.</p><svg viewBox="0 0 320 60" style="width:100%;max-width:340px;display:block;margin:6px auto"><line x1="10" y1="25" x2="310" y2="25" stroke="#c2255c" stroke-width="3"/><polygon points="310,20 318,25 310,30" fill="#c2255c"/><line x1="160" y1="14" x2="160" y2="36" stroke="#c2255c" stroke-width="3"/><text x="160" y="52" text-anchor="middle" font-size="12" font-weight="800" style="fill:var(--inkt)">jaar 1</text><text x="80" y="14" text-anchor="middle" font-size="12" style="fill:var(--inkt)">← v.C.</text><text x="240" y="14" text-anchor="middle" font-size="12" style="fill:var(--inkt)">n.C. →</text><text x="40" y="52" text-anchor="middle" font-size="11" style="fill:var(--inkt-zacht)">3300 v.C. Ötzi</text><text x="285" y="52" text-anchor="middle" font-size="11" style="fill:var(--inkt-zacht)">1991 vondst</text></svg><p>Andere culturen gebruiken soms een andere tijdrekening, bv. de <b>moslimkalender</b>.</p>',
    '<h4>✍️ Prehistorie of geschiedenis?</h4><div class="lp-vs"><div><b>Prehistorie</b>periode waarover <b>geen geschreven bronnen</b> bestaan<small>van de eerste mensensoorten (ca. 3,5 miljoen jaar geleden) tot ca. 3500 v.C.</small></div><div><b>Geschiedenis</b>periode waarover <b>wel geschreven bronnen</b> bestaan<small>vanaf ca. 3500 v.C.: eerste schrift in het huidige <b>Irak</b> (Mesopotamië)</small></div></div><p class="lp-tip">⚠️ Het schrift ontstond <b>niet overal tegelijk</b>, dus de prehistorie eindigde niet overal op hetzelfde moment. Ötzi leefde rond 3300 v.C. In de Alpen schreef toen nog niemand → voor hem is het nog <b>prehistorie</b>, ook al hoort die tijd op de algemene tijdlijn bij het oude nabije oosten.</p>',
    '<h4>🗓️ De 7 periodes en hun scharnierpunten</h4><table class="lp-ww lp-tijd"><tr><td>prehistorie</td><td>ca. 3,5 miljoen j.g. – ca. 3500 v.C.</td></tr><tr><td>oude nabije oosten</td><td>ca. 3500 v.C. – ca. 800 v.C. · start: <b>eerste geschreven bronnen</b> in het huidige Irak</td></tr><tr><td>klassieke oudheid</td><td>ca. 800 v.C. – ca. 500 · start: <b>Griekse kolonisatie, opkomst Rome</b></td></tr><tr><td>middeleeuwen</td><td>ca. 500 – ca. 1500 · start: <b>einde van het West-Romeinse rijk</b></td></tr><tr><td>vroegmoderne tijd</td><td>ca. 1500 – ca. 1800 · rond 1500: o.a. ontdekking van Amerika (1492)</td></tr><tr><td>moderne tijd</td><td>ca. 1800 – 1945 · start: <b>revoluties</b> zoals de Franse en de Amerikaanse Revolutie</td></tr><tr><td>hedendaagse tijd</td><td>1945 – nu · start: einde van de Tweede Wereldoorlog</td></tr></table><p>Een <b>scharnierpunt</b> is een gebeurtenis die zorgde voor <b>grote veranderingen</b> en zo een nieuwe periode start.</p><p class="lp-tip">💡 Waarom staat er “<b>ca.</b>” (circa = ongeveer)? Een periode verandert niet op één dag: de veranderingen gaan geleidelijk en niet overal tegelijk. Daarom gebruik je <b>afgeronde jaartallen</b>.</p>'
  ],
  kaarten:[
    ['Wat is situeren in de tijd?','Nauwkeurig omschrijven wanneer iets gebeurde of hoelang iets duurde'],
    ['Wat is chronologie?','De opeenvolging in de tijd'],
    ['Wat is het jaar 1 in de christelijke tijdrekening?','De geboorte van Jezus Christus'],
    ['Wat is de prehistorie?','De periode waarover geen geschreven bronnen bestaan'],
    ['Wanneer en waar ontstond het eerste schrift?','Ca. 3500 v.C. in het huidige Irak (Mesopotamië)'],
    ['Eindigde de prehistorie overal tegelijk?','Nee, het schrift ontstond niet overal op hetzelfde moment'],
    ['Wat is een scharnierpunt?','Een gebeurtenis die zorgde voor grote veranderingen en een nieuwe periode inluidt'],
    ['Geef de 7 periodes in volgorde','Prehistorie – oude nabije oosten – klassieke oudheid – middeleeuwen – vroegmoderne tijd – moderne tijd – hedendaagse tijd'],
    ['Wanneer liggen de middeleeuwen?','Ca. 500 – ca. 1500'],
    ['Waarom gebruikt men “ca.” op de tijdlijn?','Veranderingen gaan geleidelijk en niet overal tegelijk: afgeronde jaartallen'],
    ['In welke periode hoort Ötzi thuis?','In de prehistorie (er werd in zijn streek nog niet geschreven)']
  ],
  quiz:[
    {t:'mc',v:'Welke periode komt direct na de klassieke oudheid?',o:['middeleeuwen','oude nabije oosten','vroegmoderne tijd','prehistorie'],a:0},
    {t:'mc',v:'Welk scharnierpunt start het oude nabije oosten?',o:['De eerste geschreven bronnen (ca. 3500 v.C.)','Het einde van het West-Romeinse rijk','De Franse Revolutie','De geboorte van Christus'],a:0},
    {t:'mc',v:'Welk scharnierpunt start de middeleeuwen?',o:['Het einde van het West-Romeinse rijk','De Franse Revolutie','Het eerste schrift','Het einde van WO II'],a:0},
    {t:'mc',v:'Welke periode start in 1945?',o:['hedendaagse tijd','moderne tijd','vroegmoderne tijd','middeleeuwen'],a:0},
    {t:'mc',v:'Welke periode ligt tussen ca. 800 v.C. en ca. 500?',o:['klassieke oudheid','oude nabije oosten','middeleeuwen','prehistorie'],a:0},
    {t:'mc',v:'In welke periode ligt de 19e eeuw (1801–1900)?',o:['moderne tijd','vroegmoderne tijd','hedendaagse tijd','middeleeuwen'],a:0},
    {t:'mc',v:'Waarom staat Ötzi toch in de prehistorie?',o:['In zijn streek werd toen nog niet geschreven','Hij leefde voor 3,5 miljoen jaar geleden','Hij werd in de middeleeuwen gevonden','Omdat hij een mummie is'],a:0},
    {t:'mc',v:'Wat betekent “chronologie”?',o:['De opeenvolging in de tijd','Een periode van 1000 jaar','Een historische bron','De plaats waar iets gebeurde'],a:0},
    {t:'jf',v:'De prehistorie eindigde overal ter wereld op hetzelfde moment.',a:false,u:'Het schrift ontstond niet overal tegelijk.'},
    {t:'jf',v:'In de christelijke tijdrekening bestaat er een jaar 0.',a:false,u:'Na 1 v.C. komt meteen 1 n.C.'},
    {t:'jf',v:'De prehistorie duurt veel langer dan de geschiedenis.',a:true,u:'Ca. 3,5 miljoen jaar tegenover ca. 5 500 jaar.'},
    {t:'invul',v:'De periode waarover geen geschreven bronnen bestaan, heet de … .',a:['prehistorie']},
    {t:'open',v:'Noem de 7 periodes in de juiste volgorde, met het jaartal waarop elke periode begint.',m:'Prehistorie (ca. 3,5 miljoen j.g.) – oude nabije oosten (ca. 3500 v.C.) – klassieke oudheid (ca. 800 v.C.) – middeleeuwen (ca. 500) – vroegmoderne tijd (ca. 1500) – moderne tijd (ca. 1800) – hedendaagse tijd (1945).'}
  ]
},
{
  id:'G3', vak:'ges', titel:'Rekenen met de tijd: eeuw en millennium',
  bron: B('p. 20–22'), reken:'eeuw',
  samenvatting:[
    '<h4>📏 Eenheden van tijd</h4><div class="lp-tegels"><div><i>1️⃣</i><b>jaar</b><small>365 dagen</small></div><div><i>💯</i><b>eeuw</b><small>100 jaar</small></div><div><i>🏛️</i><b>millennium</b><small>1 000 jaar</small></div></div>',
    '<h4>🧮 In welke eeuw ligt een jaartal?</h4><p>De 1e eeuw = de jaren <b>1 tot en met 100</b>. De 2e eeuw = 101 t.e.m. 200. Dus:</p><div class="lp-stroom"><div><span>Laat de laatste <b>twee</b> cijfers weg</span><b>1423 → 14</b></div><div><span>Waren die twee cijfers <b>niet 00</b>? Tel er <b>1</b> bij</span><b>14 + 1 = 15e eeuw</b></div><div><span>Eindigt het op <b>00</b>? Dan <b>niet</b> +1</span><b>2000 → 20e eeuw</b></div></div><p class="lp-vb">2020 → 21e eeuw · 1991 (vondst Ötzi) → 20e eeuw · 566 → 6e eeuw · 88 → 1e eeuw · 201 → 3e eeuw<br>v.C. werkt <b>net hetzelfde</b>: 1423 v.C. → 15e eeuw v.C. · Ötzi ca. 3300 v.C. → 33e eeuw v.C.</p>',
    '<h4>🏛️ In welk millennium?</h4><p>Hetzelfde trucje, maar je laat de laatste <b>drie</b> cijfers weg en telt er 1 bij (behalve bij 000).</p><p class="lp-vb">2020 → 2 + 1 = <b>3e millennium</b> · 2000 → <b>2e millennium</b> · 566 → <b>1e millennium</b> · 1423 v.C. → <b>2e millennium v.C.</b> · Ötzi (ca. 3300 v.C.) → <b>4e millennium v.C.</b></p>',
    '<h4>⏱️ Hoelang duurde het?</h4><table class="lp-ww lp-tijd"><tr><td>allebei n.C.</td><td><b>aftrekken</b>: van 1914 tot 1918 = 1918 − 1914 = 4 jaar</td></tr><tr><td>allebei v.C.</td><td><b>aftrekken</b>: van 3500 v.C. tot 800 v.C. = 3500 − 800 = 2 700 jaar</td></tr><tr><td>v.C. → n.C.</td><td><b>optellen</b>: van 800 v.C. tot 500 = 800 + 500 = 1 300 jaar</td></tr><tr><td>hoe lang geleden?</td><td>Ötzi stierf ca. 3300 v.C. → 3300 + 2026 ≈ <b>5 300 jaar</b> geleden</td></tr></table>'
  ],
  kaarten:[
    ['Hoeveel jaar is een eeuw?','100 jaar'],
    ['Hoeveel jaar is een millennium?','1 000 jaar'],
    ['In welke eeuw ligt 2020?','De 21e eeuw'],
    ['In welke eeuw ligt 2000?','De 20e eeuw'],
    ['In welke eeuw ligt 566?','De 6e eeuw'],
    ['In welk millennium ligt 2020?','Het 3e millennium'],
    ['In welk millennium leefde Ötzi?','Het 4e millennium v.C.'],
    ['In welke eeuw werd Ötzi gevonden?','De 20e eeuw (1991)'],
    ['Hoe bereken je de duur van 800 v.C. tot 500 n.C.?','Optellen: 800 + 500 = 1 300 jaar']
  ],
  quiz:[
    {t:'mc',v:'In welke eeuw ligt het jaar 1423 v.C.?',o:['15e eeuw v.C.','14e eeuw v.C.','2e eeuw v.C.','15e eeuw'],a:0},
    {t:'mc',v:'In welke eeuw ligt het jaar 88?',o:['1e eeuw','9e eeuw','0e eeuw','8e eeuw'],a:0},
    {t:'mc',v:'In welke eeuw ligt het jaar 201?',o:['3e eeuw','2e eeuw','20e eeuw','21e eeuw'],a:0},
    {t:'mc',v:'In welk millennium ligt het jaar 2000?',o:['2e millennium','3e millennium','20e millennium','1e millennium'],a:0},
    {t:'mc',v:'Hoeveel jaar duurt het oude nabije oosten (ca. 3500 v.C. – ca. 800 v.C.)?',o:['2 700 jaar','4 300 jaar','3 500 jaar','800 jaar'],a:0},
    {t:'mc',v:'Hoeveel jaar duurt de klassieke oudheid (ca. 800 v.C. – ca. 500)?',o:['1 300 jaar','300 jaar','800 jaar','500 jaar'],a:0},
    {t:'mc',v:'Wat duurt langer?',o:['de middeleeuwen (ca. 1000 jaar)','een eeuw','de hedendaagse tijd','een jaar'],a:0},
    {t:'jf',v:'Het jaar 1900 ligt in de 20e eeuw.',a:false,u:'1900 eindigt op 00: het is het laatste jaar van de 19e eeuw.'},
    {t:'jf',v:'Een millennium duurt 1 000 jaar.',a:true},
    {t:'invul',v:'Het jaar 1302 ligt in de …e eeuw. (getal)',a:['14','14e']},
    {t:'open',v:'Leg uit hoe je bepaalt in welke eeuw het jaar 1789 ligt.',m:'Laat de laatste twee cijfers weg: 17. Die cijfers (89) zijn niet 00, dus tel er 1 bij: 18e eeuw.'}
  ]
},
{
  id:'G4', vak:'ges', titel:'Situeren in de ruimte en maatschappelijke domeinen',
  bron: B('p. 22–27', 'p. 153'),
  samenvatting:[
    '<h4>🗺️ Situeren in de ruimte</h4><p><b>Situeren in de ruimte</b> = omschrijven <b>waar</b> iets gebeurde. Meestal gebruik je een <b>historische kaart</b> (een beeld van de ruimte uit het verleden) en <b>hedendaagse namen</b>, omdat je die herkent.</p><table class="lp-ww lp-tijd"><tr><td>lokaal</td><td>op een <b>precieze plaats</b>: de Ötztaler Alpen</td></tr><tr><td>regionaal</td><td>in een <b>ruimere streek</b>: de Alpen</td></tr><tr><td>stedelijk</td><td>in een <b>stad</b></td></tr><tr><td>ruraal</td><td>op het <b>platteland</b>, zonder steden → Ötzi (er waren nog geen steden)</td></tr><tr><td>continentaal</td><td><b>landinwaarts</b>, ver van de zee → Ötzi</td></tr><tr><td>maritiem</td><td>aan of op de <b>zee</b></td></tr></table><p class="lp-vb">Ötzi leefde <b>regionaal</b> in de Alpen, in een <b>rurale</b> en <b>continentale</b> omgeving, in een gebied waar al <b>koper</b> gebruikt werd.</p>',
    '<h4>🔎 Kaartenstudie in 4 stappen</h4><ol><li><b>Verken</b> de kaart: titel, tijd, gebied, legende.</li><li><b>Bestudeer</b> de kaart: welke plaatsen herken je?</li><li><b>Denk na</b>: wat vertelt de kaart over je vraag?</li><li><b>Beantwoord</b> de historische vraag.</li></ol>',
    '<h4>🏛️ De 4 maatschappelijke domeinen</h4><div class="lp-tegels k2"><div><i>⚖️</i><b>politiek</b><small>bestuur, macht, afspraken, rechten en plichten, oorlog</small></div><div><i>💰</i><b>economisch</b><small>geld, arbeid, voedsel, handel, vervoer</small></div><div><i>👥</i><b>sociaal</b><small>individu, groep, rollen, verhoudingen tussen mensen</small></div><div><i>🎨</i><b>cultureel</b><small>kunst, vrije tijd, geloof, wetenschap, mode</small></div></div><p class="lp-vb">Ötzi had nog gegeten → <b>economisch</b> (voedsel) · bezat een bijl, sneeuwschoenen → <b>economisch</b> · tatoeages → <b>cultureel</b> (en misschien sociaal) · bloedsporen van 4 andere mensen → <b>sociaal</b>/politiek (geweld)</p><p class="lp-tip">🧠 Ezelsbrug <b>PSEC</b>: “<b>P</b>apa <b>S</b>katet <b>E</b>lke <b>C</b>oole dag”.</p>'
  ],
  kaarten:[
    ['Wat is situeren in de ruimte?','Omschrijven waar iets gebeurde'],
    ['Wat betekent ruraal?','Op het platteland, zonder steden'],
    ['Wat betekent stedelijk?','In een stad'],
    ['Wat betekent maritiem?','Aan of op de zee'],
    ['Wat betekent continentaal?','Landinwaarts, ver van de zee'],
    ['Verschil lokaal en regionaal?','Lokaal = precieze plaats, regionaal = ruimere streek'],
    ['Welke 4 maatschappelijke domeinen ken je?','Politiek, sociaal, economisch en cultureel'],
    ['Wat hoort bij het economische domein?','Geld, arbeid, voedsel, handel, vervoer'],
    ['Wat hoort bij het culturele domein?','Kunst, vrije tijd, geloof, wetenschap, mode'],
    ['Wat hoort bij het politieke domein?','Bestuur, macht, afspraken, rechten en plichten, oorlog']
  ],
  quiz:[
    {t:'mc',v:'Ötzi stierf in een omgeving zonder steden. Dat noem je…',o:['ruraal','stedelijk','maritiem','lokaal'],a:0},
    {t:'mc',v:'De Alpen liggen ver van de zee. Dat noem je…',o:['continentaal','maritiem','stedelijk','regionaal'],a:0},
    {t:'mc',v:'“Ötzi werd gevonden in de Ötztaler Alpen” is een situering op…',o:['lokaal niveau','continentaal niveau','maritiem niveau','economisch niveau'],a:0},
    {t:'mc',v:'Welk domein: “Wie heeft de macht in het land?”',o:['politiek','cultureel','economisch','sociaal'],a:0},
    {t:'mc',v:'Welk domein: “Welke producten werden verhandeld?”',o:['economisch','politiek','cultureel','sociaal'],a:0},
    {t:'mc',v:'Welk domein: “In welke goden geloofden de mensen?”',o:['cultureel','economisch','politiek','sociaal'],a:0},
    {t:'mc',v:'Welk domein: “Hoe waren de verhoudingen tussen mannen en vrouwen?”',o:['sociaal','economisch','politiek','cultureel'],a:0},
    {t:'mc',v:'Wat doe je in stap 1 van een kaartenstudie?',o:['De kaart verkennen: titel, tijd, gebied, legende','De vraag beantwoorden','Plaatsen tekenen','Niets'],a:0},
    {t:'jf',v:'Een havenstad als Brugge in de middeleeuwen ligt in een maritieme omgeving.',a:true},
    {t:'jf',v:'Ötzi leefde in een stedelijke samenleving.',a:false,u:'Er waren toen nog geen steden: ruraal.'},
    {t:'invul',v:'Kunst, geloof en mode horen bij het … domein.',a:['culturele','cultureel']},
    {t:'open',v:'Situeer Ötzi in de ruimte met minstens drie structuurbegrippen.',m:'Lokaal: de Ötztaler Alpen. Regionaal: de Alpen. Een rurale (geen steden) en continentale (ver van zee) omgeving, in een gebied waar al koper werd gebruikt.'}
  ]
}
);
})();
