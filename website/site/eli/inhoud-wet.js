// Project Wetenschappen — examen wo 9/12: 9u00 en 10u55, op papier
(function(){
const D = id => 'https://drive.google.com/file/d/' + id + '/view';
const BAS = D('1BdiWoKHHfzJcqA23INjOWxE7eZqJQeki'), KR = D('1AtDoTDP81qId01xovqqr9QbFyXKYiybb'), KRP = D('1ag8MfNV9YkgqrJV1IJGcYSNCPdbAAHub'), SP = D('1qxjXobwiJRc3lhavCz6jjwkOqQnEHYa_');
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'W1', vak:'wet', titel:'Wat is fysica? Grootheden en eenheden',
  bron:[['Cursus basiskennis p. 2–7', BAS]],
  samenvatting:[
    '<h4>🔬 Wat is wetenschap?</h4><p><b>Wetenschap</b> = <b>kennis vergaren</b> en die toepassen in het dagelijks leven, door te <b>onderzoeken</b> en <b>waar te nemen</b>. <b>Metingen</b> zijn daarbij heel belangrijk.</p><p>Biologie, chemie en fysica zijn <b>natuurwetenschappen</b>: ze bestuderen de natuur.</p><div class="lp-tegels"><div><i>🌿</i><b>biologie</b><small>het leven</small></div><div><i>⚗️</i><b>chemie</b><small>samenstelling verandert</small></div><div><i>⚡</i><b>fysica</b><small>samenstelling blijft</small></div></div>',
    '<h4>🌿⚗️⚡ Biologie, chemie, fysica</h4><table class="lp-ww lp-tijd"><tr><td>🌿 biologie</td><td><b>levende organismen</b> en hun omgeving (planten, dieren, micro-organismen, menselijk lichaam)<br><small class="muted">darmflora · watertransport in planten · diversiteit van leven · <b>Charles Darwin</b> (evolutietheorie)</small></td></tr><tr><td>⚗️ chemie</td><td>hoe atomen zich <b>herschikken</b> tot <b>nieuwe</b> deeltjes en moleculen, en de energie daarbij → de <b>samenstelling verandert</b><br><small class="muted">hout verbrandt tot as · geneesmiddelen maken · reacties sneller/trager · <b>Marie Curie</b> (radioactiviteit)</small></td></tr><tr><td>⚡ fysica</td><td>eigenschappen van <b>materie en energie</b>, <b>zonder</b> dat de deeltjes veranderen → de <b>samenstelling blijft</b><br><small class="muted">ijs smelt · staaf wordt langer bij verhitting · bliksem · <b>Albert Einstein</b> (relativiteitstheorie, E = m·c²)</small></td></tr></table><p class="lp-tip">🔑 Fysica wil <b>wetten en formules</b> vinden die <b>overal in het heelal</b> gelden. Daarom speelt <b>wiskunde</b> een grote rol.</p>',
    '<h4>🧩 Samenwerken: raakvlakken</h4><p>Wetenschappen werken vaak samen, zoals stukjes van een <b>puzzel</b>. Voorbeeld: <b>het oog</b> 👁️</p><div class="lp-tegels"><div><i>🌿</i><b>biologie</b><small>cellen en weefsels van het oog</small></div><div><i>⚗️</i><b>chemie</b><small>samenstelling van het oogvocht</small></div><div><i>⚡</i><b>fysica</b><small>lichtgolven, lichtbreking, lenzen</small></div></div><div class="lp-stroom"><div><span>chemische processen in <u>levende wezens</u></span><b>biochemie</b></div><div><span>natuurkunde toegepast op <u>biologische</u> systemen</span><b>biofysica</b></div><div><span>verband tussen <u>fysische en chemische</u> eigenschappen</span><b>fysicochemie</b></div></div>',
    '<h4>🧪 De wetenschappelijke onderzoeksmethode</h4><div class="lp-stroom groen"><div><span>1. Oriënteren op het onderzoek</span><b>🧭</b></div><div><span>2. Onderzoeksvraag opstellen</span><b>❓</b></div><div><span>3. Hypothese bedenken</span><b>💡</b></div><div><span>4. Benodigdheden oplijsten</span><b>🧰</b></div><div><span>5. Werkwijze opstellen + schets maken</span><b>✏️</b></div><div><span>6. Waarnemingen doen</span><b>👀</b></div><div><span>7. Besluit formuleren</span><b>✅</b></div><div><span>8. Reflecteren</span><b>🤔</b></div></div><p class="muted klein">In fysica stel je een systeem vereenvoudigd voor als een <b>puntmassa</b>: alle massa in één punt.</p>',
    '<h4>📏 Grootheden</h4><p>Een <b>grootheid</b> = iets wat je kan <b>meten</b>.</p><div class="lp-vs"><div><b>✅ wel</b>lengte, breedte, massa, temperatuur van een schilderij</div><div><b>❌ niet</b>hoe <u>mooi</u> een schilderij is<small>schoonheid kan je niet meten</small></div></div><p>Er zijn <b>7 basisgrootheden</b> (internationaal afgesproken). Alle andere grootheden reken je daaruit uit = <b>afgeleide grootheden</b>. Bv. oppervlakte = lengte × lengte.</p>',
    '<h4>🌍 Het SI-stelsel</h4><p>Bij een meting <b>vergelijk</b> je met een afgesproken <b>eenheid</b>. <b>SI</b> = <i>Système international d’unités</i>.</p><table class="lp-ww lp-vv"><tr><td>lengte</td><td>l</td><td>meter</td><td>m</td></tr><tr><td>massa</td><td>m</td><td>kilogram</td><td>kg</td></tr><tr><td>tijd</td><td>t</td><td>seconde</td><td>s</td></tr><tr><td>stroomsterkte</td><td>I</td><td>ampère</td><td>A</td></tr><tr><td>temperatuur</td><td>T</td><td>kelvin</td><td>K</td></tr><tr><td>lichtsterkte</td><td>I<sub>v</sub></td><td>candela</td><td>cd</td></tr><tr><td>stofhoeveelheid</td><td>n</td><td>mol</td><td>mol</td></tr></table><p class="lp-kop">+ 4 afgeleide grootheden om te kennen</p><table class="lp-ww lp-vv"><tr><td>elektrische spanning</td><td>U</td><td>volt</td><td>V</td></tr><tr><td>energie</td><td>E</td><td>joule</td><td>J</td></tr><tr><td>oppervlakte</td><td>A</td><td>vierkante meter</td><td>m²</td></tr><tr><td>volume</td><td>V</td><td>kubieke meter</td><td>m³</td></tr></table>',
    '<h4>📐 Meten</h4><div class="lp-vs"><div><b>🔍 nauwkeurigheid</b>de <u>kleinste</u> waarde die je kan meten<small>meetlat: 1 mm</small></div><div><b>↔️ meetbereik</b>verschil tussen <u>kleinste en grootste</u> meting<small>vouwmeter: 2 m</small></div></div><p>Een <b>meetresultaat</b> heeft altijd <b>3 delen</b>:</p><div class="lp-ketting"><span><b>l</b><br><small>grootheid</small></span><i>=</i><span><b>3,85</b><br><small>maatgetal</small></span><span><b>m</b><br><small>eenheid</small></span></div>',
    '<h4>➡️ Scalair of vectorieel?</h4><div class="lp-vs"><div><b>🔢 scalaire grootheid</b>enkel een <u>grootte</u><small>massa, lengte, temperatuur, tijd · “ik ben 1,73 m”, “36,8 °C”</small></div><div><b>➡️ vectoriële grootheid</b><u>4 eigenschappen</u><small>kracht, snelheid, versnelling</small></div></div><p class="lp-kop">De 4 eigenschappen van een vector</p><div class="lp-tegels k2 t-groen"><div><b>grootte</b><small>hoe groot</small></div><div><b>richting</b><small>de lijn</small></div><div><b>zin</b><small>naar welke kant</small></div><div><b>aangrijpingspunt</b><small>waar het begint</small></div></div><p>Je noteert een vector met een <b>pijltje boven de letter</b> (F⃗) en tekent hem als een <b>pijl</b>.</p><p class="lp-tip">⚠️ Valkuil: <b>F⃗ = 25 N</b> is <b>fout</b>! 25 N zegt enkel iets over de <b>grootte</b>. Schrijf dan <b>F = 25 N</b> (zonder pijltje).</p>'
  ],
  kaarten:[
    ['Wat bestudeert fysica?','Eigenschappen van materie en energie, zonder dat de samenstelling van stoffen verandert'],
    ['Wat bestudeert chemie?','Hoe atomen/moleculen zich reorganiseren tot nieuwe stoffen + de energieveranderingen daarbij'],
    ['Wat bestudeert biologie?','Levende organismen en hun omgeving'],
    ['Bekende bioloog, chemicus, fysicus?','Darwin (evolutie), Marie Curie (radioactiviteit), Einstein (relativiteit, E = m·c²)'],
    ['Biochemie, biofysica, fysicochemie?','Raakvlakken: bio+chemie, bio+fysica, fysica+chemie'],
    ['8 stappen wetenschappelijk onderzoek?','Oriënteren, onderzoeksvraag, hypothese, benodigdheden, werkwijze + schets, waarnemingen, besluit, reflecteren'],
    ['Wat is een grootheid?','Iets wat je kan meten'],
    ['De 7 basisgrootheden?','Lengte, massa, tijd, stroomsterkte, temperatuur, lichtsterkte, stofhoeveelheid'],
    ['Lengte: symbool en SI-eenheid?','l – meter (m)'],
    ['Massa: symbool en SI-eenheid?','m – kilogram (kg)'],
    ['Tijd: symbool en SI-eenheid?','t – seconde (s)'],
    ['Stroomsterkte: symbool en SI-eenheid?','I – ampère (A)'],
    ['Temperatuur: symbool en SI-eenheid?','T – kelvin (K)'],
    ['Lichtsterkte: SI-eenheid?','candela (cd)'],
    ['Stofhoeveelheid: symbool en SI-eenheid?','n – mol (mol)'],
    ['Spanning: symbool en SI-eenheid?','U – volt (V)'],
    ['Energie: symbool en SI-eenheid?','E – joule (J)'],
    ['Oppervlakte: symbool en SI-eenheid?','A – vierkante meter (m²)'],
    ['Volume: symbool en SI-eenheid?','V – kubieke meter (m³)'],
    ['Waarvoor staat SI?','Système international d\'unités'],
    ['Nauwkeurigheid vs. meetbereik?','Nauwkeurigheid: kleinst meetbare waarde. Meetbereik: verschil tussen kleinste en grootste meetresultaat'],
    ['De 3 delen van een meetresultaat?','Grootheid, maatgetal, eenheid (l = 3,85 m)'],
    ['Scalaire grootheid?','Enkel bepaald door grootte (massa, tijd, temperatuur)'],
    ['De 4 eigenschappen van een vectoriële grootheid?','Grootte, richting, zin, aangrijpingspunt']
  ],
  quiz:[
    {t:'mc',v:'IJs smelt tot water. Welke wetenschap bestudeert dit?',o:['Fysica','Chemie','Biologie','Biochemie'],a:0},
    {t:'mc',v:'Hout verbrandt tot as. Welke wetenschap?',o:['Chemie','Fysica','Biologie','Biofysica'],a:0},
    {t:'mc',v:'Welke is GEEN basisgrootheid?',o:['Volume','Massa','Tijd','Temperatuur'],a:0},
    {t:'mc',v:'SI-eenheid van temperatuur?',o:['kelvin','graden Celsius','joule','candela'],a:0},
    {t:'mc',v:'SI-eenheid van massa?',o:['kilogram','gram','newton','ton'],a:0},
    {t:'mc',v:'Welke grootheid is vectorieel?',o:['Kracht','Massa','Temperatuur','Tijd'],a:0},
    {t:'jf',v:'Schoonheid is een grootheid.',a:false,u:'Een grootheid moet je kunnen meten.'},
    {t:'invul',v:'De SI-eenheid van stroomsterkte is de …',a:['ampère','ampere','A']},
    {t:'invul',v:'Het symbool van de grootheid spanning is …',a:['U']},
    {t:'volgorde',v:'Zet de stappen van wetenschappelijk onderzoek in volgorde.',o:['Oriënteren','Onderzoeksvraag','Hypothese','Benodigdheden','Werkwijze + schets','Waarnemingen','Besluit','Reflecteren']}
  ]
},
{
  id:'W2', vak:'wet', titel:'Eenheden omzetten & voorvoegsels',
  bron:[['Cursus basiskennis p. 8–10', BAS]],
  samenvatting:[
    '<h4>📏 Waarom voorvoegsels?</h4><p>Het heelal is <b>reusachtig groot</b>, maar gemaakt van <b>onzichtbaar kleine</b> deeltjes. Met een <b>voorvoegsel</b> (ook <b>prefix</b>) pas je de grootte van de eenheid aan de situatie aan.</p><div class="lp-vs"><div><b>🏙️ groot</b>afstand tussen 2 steden<small>→ kilometer (km)</small></div><div><b>📄 klein</b>afstand tussen 2 punten op je blad<small>→ millimeter (mm)</small></div></div><p>Elk voorvoegsel hoort bij een <b>macht van 10</b>. Die tabel moet je <b>vanbuiten</b> kennen!</p>',
    '<h4>🔢 De tabel: veelvouden en delen</h4><table class="lp-ww lp-vv"><tr><td>tera</td><td>T</td><td>10¹²</td><td>1 000 000 000 000</td></tr><tr><td>giga</td><td>G</td><td>10⁹</td><td>1 000 000 000</td></tr><tr><td>mega</td><td>M</td><td>10⁶</td><td>1 000 000</td></tr><tr><td>kilo</td><td>k</td><td>10³</td><td>1 000</td></tr><tr><td>hecto</td><td>h</td><td>10²</td><td>100</td></tr><tr><td>deca</td><td>da</td><td>10¹</td><td>10</td></tr><tr class="basis-r"><td colspan="2">— basiseenheid</td><td>10⁰</td><td>1</td></tr><tr><td>deci</td><td>d</td><td>10⁻¹</td><td>0,1</td></tr><tr><td>centi</td><td>c</td><td>10⁻²</td><td>0,01</td></tr><tr><td>milli</td><td>m</td><td>10⁻³</td><td>0,001</td></tr><tr><td>micro</td><td>µ</td><td>10⁻⁶</td><td>0,000 001</td></tr><tr><td>nano</td><td>n</td><td>10⁻⁹</td><td>0,000 000 001</td></tr><tr><td>pico</td><td>p</td><td>10⁻¹²</td><td>0,000 000 000 001</td></tr></table><p class="lp-tip">💡 Vanaf kilo naar boven en vanaf milli naar onder springt de exponent telkens met <b>3</b>: 3 · 6 · 9 · 12. Let op hoofdletters: <b>M</b> = mega, <b>m</b> = milli!</p>',
    '<h4>🎯 Welke eenheid kies je?</h4><ul><li>De eenheid die <b>op het meetinstrument</b> staat.</li><li>Heel <b>kleine</b> getallen? → <b>kleinere</b> eenheid: <b>25 mA</b> i.p.v. 0,025 A.</li><li>Heel <b>grote</b> getallen? → <b>grotere</b> eenheid: <b>10 m</b> i.p.v. 10 000 mm.</li></ul><p class="muted klein">Sommige combinaties zie je vaak (decibel, dB), andere bijna nooit (decivolt, deciwatt).</p>',
    '<h4>🪜 Omzetten in 5 stappen</h4><p>Voorbeeld: <b>8 ns = … s</b></p><div class="lp-stroom"><div><span>1. Gelijkheid: links gegeven, rechts gevraagd</span><b>8 ns = … s</b></div><div><span>2. Macht van het <u>gegeven</u> voorvoegsel</span><b>n = 10⁻⁹</b></div><div><span>3. Macht van het <u>gevraagde</u> voorvoegsel</span><b>geen = 10⁰</b></div><div><span>4. Maatgetal × de machten</span><b>8 · 10⁻⁹ · 10⁰</b></div><div><span>5. Rekenregel machten (exponenten optellen)</span><b>8 · 10⁻⁹ s</b></div></div><p class="muted klein">Naar de basiseenheid? Dan mag je stap 3 en 4 eigenlijk overslaan.</p>',
    '<h4>➕➖ Welk teken krijgt de exponent?</h4><div class="lp-vs"><div><b>⬇️ groot → klein</b>exponent <u>positief</u><small>km → m: × 10³ · 1 km = 10³ m</small></div><div><b>⬆️ klein → groot</b>exponent <u>negatief</u><small>ns → s: × 10⁻⁹ · 8 ns = 8·10⁻⁹ s</small></div></div><p class="lp-tip">🧠 Logisch nadenken: naar een <b>kleinere</b> eenheid heb je <b>méér</b> stuks nodig → getal wordt groter → positieve exponent.</p><p><b>Voorbeeld met 2 voorvoegsels: 2 Mm = … mm</b></p><div class="lp-ketting"><span>Mm → m: 10⁶</span><i>·</i><span>m → mm: 10³</span><i>=</i><span>2 · 10⁹ mm</span></div><p class="muted klein">Beide keren van groot naar klein, dus 2× positief. 6 + 3 = 9.</p>',
    '<h4>🟦 Let op: m² en m³!</h4><ul><li><b>Oppervlakte</b> (m², cm², …): exponent nog eens <b>× 2</b>.</li><li><b>Volume</b> (m³, cm³, …): exponent nog eens <b>× 3</b>.</li></ul><p><b>Voorbeeld: 5 cm³ = … m³</b></p><div class="lp-stroom"><div><span>cm → m is klein → groot: 10⁻², maar het is een volume</span><b>(10⁻²)³ = 10⁻⁶</b></div><div><span>m³ naar m³: geen voorvoegsel</span><b>(10⁰)³ = 10⁰</b></div><div><span>uitkomst</span><b>5 · 10⁻⁶ m³</b></div></div><p class="lp-tip">⚠️ Vergeet je de ×3, dan kom je 5·10⁻² m³ uit en is alles fout. Kijk dus altijd naar het <b>kleine cijfertje</b> achter de eenheid!</p>'
  ],
  kaarten:[
    ['giga (G)','10⁹'],['mega (M)','10⁶'],['kilo (k)','10³'],['hecto (h)','10²'],['deca (da)','10¹'],['deci (d)','10⁻¹'],['centi (c)','10⁻²'],['milli (m)','10⁻³'],['micro (µ)','10⁻⁶'],['nano (n)','10⁻⁹'],
    ['Van grote naar kleine eenheid: welk teken heeft de exponent?','Positief (vermenigvuldigen met 10 tot een positieve macht)'],
    ['Wat doe je extra bij m² en m³?','Exponent × 2 bij oppervlakte, × 3 bij volume'],
    ['5 cm³ = … m³','5·10⁻⁶ m³'],['2 Mm = … mm','2·10⁹ mm'],['8 ns = … s','8·10⁻⁹ s'],['1 m² = … cm²','10⁴ cm²']
  ],
  quiz:[
    {t:'mc',v:'3 km = … m',o:['3·10³ m','3·10⁻³ m','3·10⁶ m','30 m'],a:0},
    {t:'mc',v:'45 mg = … g',o:['45·10⁻³ g','45·10³ g','45·10⁻⁶ g','4,5 g'],a:0},
    {t:'mc',v:'7 µs = … s',o:['7·10⁻⁶ s','7·10⁻³ s','7·10⁻⁹ s','7·10⁶ s'],a:0},
    {t:'mc',v:'2 m² = … cm²',o:['2·10⁴ cm²','2·10² cm²','2·10⁶ cm²','2·10⁻⁴ cm²'],a:0},
    {t:'mc',v:'3 dm³ = … m³',o:['3·10⁻³ m³','3·10⁻¹ m³','3·10³ m³','3·10⁻⁶ m³'],a:0},
    {t:'mc',v:'6 GW = … kW',o:['6·10⁶ kW','6·10⁹ kW','6·10³ kW','6·10¹² kW'],a:0},
    {t:'mc',v:'0,5 L = 0,5 dm³ = … cm³',o:['500 cm³','50 cm³','5000 cm³','0,0005 cm³'],a:0},
    {t:'invul',v:'Het voorvoegsel voor 10⁻⁹ is …',a:['nano','n']},
    {t:'invul',v:'Het voorvoegsel voor 10⁶ is …',a:['mega','M']},
    {t:'jf',v:'Bij het omzetten van cm³ naar m³ vermenigvuldig je de exponent met 3.',a:true}
  ],
  reken:'eenheden'
},
{
  id:'W3', vak:'wet', titel:'Beduidende cijfers & wetenschappelijke notatie',
  bron:[['Cursus basiskennis p. 11–15', BAS]],
  samenvatting:[
    '<h4>⚖️ Waarom beduidende cijfers?</h4><p>Elke meting is maar zo <b>nauwkeurig</b> als het toestel waarmee je meet.</p><div class="lp-vs"><div><b>🍳 keukenweegschaal</b>nauwkeurig tot op <u>1 g</u><small>duploblokje = 12 g</small></div><div><b>🔬 laboweegschaal</b>nauwkeurig tot op <u>0,1 g</u><small>duploblokje = 12,1 g</small></div></div><p>Met <b>beduidende cijfers (BC)</b> toon je hoe nauwkeurig je gewerkt hebt. Andere namen (synoniemen): <b>significante</b>, <b>zinvolle</b> of <b>kenmerkende</b> cijfers.</p>',
    '<h4>🔢 BC tellen: 3 regels</h4><ol><li>Tel <b>vanaf het eerste cijfer dat geen 0 is</b>.</li><li>Nullen <b>vooraan</b> tellen <b>nooit</b> mee.</li><li>Nullen <b>in</b> of <b>achteraan</b> tellen <b>wél</b> mee (ze tonen de nauwkeurigheid).</li></ol><table class="lp-ww lp-vv"><tr><td>1,23 g</td><td>3 BC</td><td>gewoon alle cijfers</td></tr><tr><td>0,23 g</td><td>2 BC</td><td>0 vooraan telt niet</td></tr><tr><td>23,0 g</td><td>3 BC</td><td>0 achteraan telt wel</td></tr><tr><td>1,05 m</td><td>3 BC</td><td>0 in het midden telt wel</td></tr><tr><td>0,0040 s</td><td>2 BC</td><td>4 en de 0 erachter</td></tr></table><p class="lp-tip">🙅 <b>Uitzondering</b>: <b>constanten</b> en <b>getelde aantallen</b> (9 jongens, 6 meisjes) hebben <b>geen</b> BC-beperking. Bij 700 kg : 9 jongens kijk je enkel naar de 700 kg (3 BC).</p>',
    '<h4>✂️ Afronden</h4><p>Afronden = het aantal BC <b>verminderen</b>. Je rekentoestel doet dat niet voor jou! Kijk naar het cijfer <b>na</b> het cijfer waarop je afrondt:</p><div class="lp-vs"><div><b>0 · 1 · 2 · 3 · 4</b>het cijfer <u>blijft</u><small>2,24 → 2,2</small></div><div><b>5 · 6 · 7 · 8 · 9</b>het cijfer gaat <u>1 omhoog</u><small>2,26 → 2,3</small></div></div><p class="muted klein">Decimalen = cijfers na de komma (Latijn “decima” = tiendelig).</p>',
    '<h4>➕➖ Optellen en aftrekken</h4><p class="lp-tip">🔑 De uitkomst is even nauwkeurig (evenveel <b>cijfers na de komma</b>) als het <b>minst nauwkeurige</b> meetresultaat.</p><div class="lp-stroom"><div><span>12,1 g + 12,1 g = 24,2 g (allebei op 0,1)</span><b>24,2 g</b></div><div><span>33 m + 2,63 m = 35,63 m · 33 m is het minst nauwkeurig (op 1 m)</span><b>36 m</b></div><div><span>4,56 g − 2,3 g = 2,26 g · 2,3 g is op 0,1 g</span><b>2,3 g</b></div></div>',
    '<h4>✖️➗ Vermenigvuldigen en delen</h4><p class="lp-tip">🔑 De uitkomst krijgt evenveel <b>BC</b> als de meetwaarde met het <b>minste BC</b>.</p><div class="lp-stroom"><div><span>Lies loopt 5,00 km (3 BC) in 1,1 u (2 BC): 4,5454… km/u</span><b>4,5 km/u</b></div><div><span>Kamer 4,20 m · 3,00 m (allebei 3 BC) = 12,6 m²</span><b>12,6 m²</b></div><div><span>Driehoek (2,2 cm · 3,25 cm) / 2 = 3,575 cm² · de 2 is een constante, telt niet mee · 2,2 heeft 2 BC</span><b>3,6 cm²</b></div></div><div class="lp-vs"><div><b>➕➖</b>kijk naar <u>decimalen</u></div><div><b>✖️➗</b>kijk naar <u>BC</u></div></div>',
    '<h4>⏸️ Tussenstappen</h4><p>Reken je in <b>meerdere stappen</b>? Rond dan pas <b>op het einde</b> af. Rond je tussendoor af, dan wordt je foutenmarge te groot.</p><h4 style="margin-top:12px">🔬 Wetenschappelijke notatie</h4><p>Om heel <b>grote</b> of heel <b>kleine</b> getallen te schrijven met het juiste aantal BC. Het is een product van <b>2 factoren</b>:</p><div class="lp-ketting"><span><b>1 cijfer ≠ 0</b> vóór de komma (+ decimalen voor de BC)</span><i>×</i><span>een <b>macht van 10</b></span></div>',
    '<h4>✍️ Wetenschappelijke notatie: voorbeelden</h4><div class="lp-stroom groen"><div><span>3,5 km naar m (2 BC houden): <s>3500 m</s></span><b>3,5 · 10³ m</b></div><div><span>0,000123 g (3 BC)</span><b>1,23 · 10⁻⁴ g</b></div><div><span>12 m (2 BC)</span><b>1,2 · 10¹ m</b></div><div><span>12,6 m² (BC klopt al, notatie nog niet)</span><b>1,26 · 10¹ m²</b></div></div><p><b>188,4 m naar mm</b>, in wetenschappelijke notatie:</p><div class="lp-ketting"><span>1,884 · 10² m</span><i>→</i><span>1,884 · 10² · 10³ mm</span><i>→</i><span>1,884 · 10⁵ mm</span></div><p class="lp-tip">⚠️ Valkuil: 3,5 km = <b>3500 m</b> is fout, want 3500 heeft 4 BC. Met 3,5 · 10³ m houd je de <b>2 BC</b>.</p>'
  ],
  kaarten:[
    ['Tellen nullen vooraan mee als BC?','Nee (0,023 heeft 2 BC)'],
    ['Tellen nullen achteraan mee als BC?','Ja (23,0 heeft 3 BC)'],
    ['Hoeveel BC heeft 0,00450?','3'],['Hoeveel BC heeft 1,05?','3'],['Hoeveel BC heeft 5,00?','3'],
    ['Regel optellen/aftrekken?','Afronden op de nauwkeurigheid (decimalen) van het minst nauwkeurige meetresultaat'],
    ['Regel vermenigvuldigen/delen?','Zoveel BC als de meetwaarde met het minste BC'],
    ['Wanneer rond je af bij tussenstappen?','Pas op het einde'],
    ['Afrondingsregel?','0–4: cijfer blijft · 5–9: cijfer +1'],
    ['Wat is wetenschappelijke notatie?','Eén cijfer ≠ 0 vóór de komma, vermenigvuldigd met een macht van 10'],
    ['0,000123 g in wetenschappelijke notatie?','1,23·10⁻⁴ g'],['3,5 km in m (juiste BC)?','3,5·10³ m'],
    ['Heeft een geteld aantal (9 leerlingen) BC?','Nee, aantallen en constanten tellen niet mee voor de BC-regels']
  ],
  quiz:[
    {t:'mc',v:'Hoeveel BC heeft 0,0305 m?',o:['3','4','5','2'],a:0},
    {t:'mc',v:'Hoeveel BC heeft 120,0 g?',o:['4','3','2','5'],a:0},
    {t:'mc',v:'4,56 g − 2,3 g = ?',o:['2,3 g','2,26 g','2,260 g','2 g'],a:0},
    {t:'mc',v:'4,20 m · 3,00 m = ?',o:['12,6 m²','12,60 m²','13 m²','12 m²'],a:0},
    {t:'mc',v:'Driehoek: basis 2,2 cm, hoogte 3,25 cm. A = b·h/2 = ?',o:['3,6 cm²','3,575 cm²','3,58 cm²','4 cm²'],a:0},
    {t:'mc',v:'188,4 m in mm, wetenschappelijke notatie?',o:['1,884·10⁵ mm','1,884·10² mm','188,4·10³ mm','1,884·10⁶ mm'],a:0},
    {t:'mc',v:'0,00072 s in wetenschappelijke notatie?',o:['7,2·10⁻⁴ s','7,2·10⁻³ s','72·10⁻⁵ s','0,72·10⁻³ s'],a:0},
    {t:'jf',v:'33 m + 2,63 m schrijf je als 35,63 m.',a:false,u:'Afronden op de minst nauwkeurige: 36 m.'},
    {t:'invul',v:'Lies loopt 5,00 km in 1,1 u. Haar snelheid (km/u, juiste BC) = …',a:['4,5','4.5']}
  ],
  reken:'bc'
},
{
  id:'W4', vak:'wet', titel:'Kracht als vector',
  bron:[['Cursus krachten p. 1–9, 20–27', KR],['Presentatie krachten', KRP]],
  samenvatting:[
    '<h4>💪 Wat is een kracht?</h4><p>Een <b>kracht</b> = hoe hard er aan een voorwerp <b>geduwd of getrokken</b> wordt.</p><div class="lp-tegels"><div><i>🔤</i><b>symbool F</b><small>van “force”</small></div><div><i>📏</i><b>eenheid N</b><small>newton</small></div><div><i>🍫</i><b>1 N ≈ 100 g</b><small>zwaartekracht op 100 gram</small></div></div><p class="lp-tip">💡 1 N = de kracht om 1 kg te versnellen met 1 m/s². Een flesje van 0,5 L ≈ <b>5 N</b>.</p>',
    '<h4>🎯 Wat doet een kracht?</h4><div class="lp-vs"><div><b>🏃 dynamisch effect</b>de <u>snelheid</u> verandert<small>sneller of trager · de zin verandert · de richting verandert</small></div><div><b>🎈 statisch effect</b>het voorwerp <u>vervormt</u><small><b>elastisch</b>: keert terug (ballon loslaten)<br><b>plastisch</b>: blijvend (ballon knapt)</small></div></div>',
    '<h4>🤝 Contact of op afstand?</h4><div class="lp-vs"><div><b>✋ contactkracht</b>voorwerpen <u>raken</u> elkaar<small>winkelkar duwen, normaalkracht</small></div><div><b>🧲 veldkracht</b>werkt <u>op afstand</u><small>zwaartekracht (ook in een vliegtuig), magneet</small></div></div>',
    '<h4>➡️ Een kracht is een vector</h4><p>Je tekent een kracht als een <b>pijl</b>. Die heeft <b>4 kenmerken</b>:</p><div class="lp-tegels k2"><div><i>📏</i><b>grootte</b><small>hoeveel N = lengte van de pijl (altijd positief, teken met een <b>lat</b>!)</small></div><div><i>↗️</i><b>richting</b><small>horizontaal, verticaal of schuin onder een hoek</small></div><div><i>👉</i><b>zin</b><small>naar links, rechts, boven of beneden</small></div><div><i>📍</i><b>aangrijpingspunt</b><small>waar de kracht inwerkt (meestal het zwaartepunt)</small></div></div><p class="lp-tip">⚠️ <b>Richting</b> en <b>zin</b> niet verwarren: verticaal is een richting, naar boven is een zin.</p>',
    '<h4>⚫ Puntmassa en krachten tekenen</h4><p>Een <b>puntmassa</b> (massapunt) = het voorwerp vereenvoudigd tot <b>één punt</b> in het <b>zwaartepunt</b>, met dezelfde massa. Alle krachten teken je vanuit dat punt.</p><div class="lp-vs"><div><b>✅ wel tekenen</b>krachten <u>óp</u> het voorwerp</div><div><b>❌ niet tekenen</b>krachten die het voorwerp <u>zelf</u> uitoefent</div></div><p class="lp-tip">🔤 F<sub>DM</sub> = de kracht <b>van</b> Dirk <b>op</b> Maria.</p>',
    '<h4>➕ Resulterende kracht (zelfde richting)</h4><p>De <b>resulterende kracht</b> = de som van alle krachten op een voorwerp.</p><div class="lp-vs"><div><b>➡️➡️ zelfde zin</b><u>optellen</u><small>30 N + 20 N = 50 N</small></div><div><b>➡️⬅️ tegengestelde zin</b><u>aftrekken</u><small>40 N − 40 N = 0 N (touwtrekken, niemand wint)</small></div></div>',
    '<h4>📐 Resulterende kracht (andere richting)</h4><p>Dan werk je <b>grafisch</b>, met een <b>schaal</b> (bv. 1 cm = 10 N). Twee methodes:</p><div class="lp-vs"><div><b>🐍 kop-staartmethode</b>2e pijl verschuiven naar de <u>kop</u> van de 1e<small>verbind dan het begin van de 1e met de kop van de 2e</small></div><div><b>▱ parallellogrammethode</b>teken de <u>evenwijdigen</u><small>de diagonaal vanuit het aangrijpingspunt is de resultante</small></div></div><p class="lp-tip">⚠️ Meet de pijl op het einde! 40 N + 20 N is dan <b>niet 60 N</b>, maar bv. <b>53 N</b>.</p>'
  ],
  kaarten:[
    ['Symbool en SI-eenheid van kracht?','F – newton (N)'],
    ['Hoe groot is 1 N ongeveer?','De zwaartekracht op ± 100 g'],
    ['Dynamisch effect van een kracht?','Verandering van snelheid: sneller/trager, andere zin, andere richting'],
    ['Statisch effect van een kracht?','Vervorming: elastisch of plastisch'],
    ['Elastische vervorming?','Niet blijvend: voorwerp keert terug naar oorspronkelijke vorm'],
    ['Plastische vervorming?','Blijvend: voorwerp keert niet terug'],
    ['Contactkracht vs. veldkracht?','Contact: voorwerpen raken elkaar. Veld: werkt op afstand (zwaartekracht)'],
    ['4 kenmerken van een krachtvector?','Grootte, richting, zin, aangrijpingspunt'],
    ['Verschil richting en zin?','Richting = waaraan evenwijdig (horizontaal, verticaal). Zin = naar welke kant (links, rechts, boven, beneden)'],
    ['Wat is een puntmassa?','Voorwerp voorgesteld als punt in het zwaartepunt, met dezelfde massa'],
    ['Krachten zelfde richting en zin samenstellen?','Optellen'],
    ['Krachten zelfde richting, tegengestelde zin?','Aftrekken'],
    ['2 grafische methodes voor de resulterende kracht?','Kop-staartmethode en parallellogrammethode'],
    ['Wat betekent F met index DM?','De kracht van Dirk op Maria']
  ],
  quiz:[
    {t:'mc',v:'Een voetbal wordt weggetrapt en verandert van richting. Welk effect?',o:['Dynamisch effect','Statisch effect','Plastische vervorming','Geen effect'],a:0},
    {t:'mc',v:'Een auto-deur deukt blijvend na een botsing. Dit is…',o:['plastische vervorming','elastische vervorming','een dynamisch effect','een veldkracht'],a:0},
    {t:'mc',v:'Welke kracht is een veldkracht?',o:['Zwaartekracht','Normaalkracht','Duwen tegen een kar','Wrijving van je schoen'],a:0},
    {t:'mc',v:'Twee mensen duwen een kar naar rechts: 100 N en 125 N. Resulterende kracht?',o:['225 N naar rechts','25 N naar rechts','25 N naar links','0 N'],a:0},
    {t:'mc',v:'Links duwt iemand 40 N naar rechts, rechts duwt iemand 40 N naar links. Resultante?',o:['0 N','80 N','40 N','20 N'],a:0},
    {t:'mc',v:'Twee honden trekken met 40 N en 20 N in verschillende richtingen. De resultante is…',o:['grafisch te bepalen, niet gewoon 60 N','altijd 60 N','altijd 20 N','altijd 0 N'],a:0},
    {t:'jf',v:'De grootte van een kracht kan negatief zijn.',a:false},
    {t:'jf',v:'Bij het tekenen van alle krachten op Maria teken je ook de kracht die Maria op Dirk uitoefent.',a:false},
    {t:'open',v:'Leg de kop-staartmethode uit in 3 stappen.',m:'1) Teken de krachten vanuit hun aangrijpingspunt. 2) Verschuif de tweede kracht zodat haar aangrijpingspunt (staart) op de pijlpunt (kop) van de eerste ligt. 3) Verbind het aangrijpingspunt van de eerste met de pijlpunt van de tweede: dat is de resulterende kracht.'}
  ]
},
{
  id:'W5', vak:'wet', titel:'Zwaartekracht, normaalkracht, gewicht',
  bron:[['Cursus krachten p. 4–6, 9–15', KR]],
  samenvatting:[
    '<h4>🌍 Zwaarteveldsterkte g</h4><p><b>g</b> = hoe hard een hemellichaam aan <b>1 kg</b> trekt. Eenheid: <b>N/kg</b>. Ook <b>valversnelling</b> genoemd.</p><div class="lp-tegels"><div><i>🌍</i><b>aarde: 9,81 N/kg</b><small>polen 9,83 · evenaar 9,78</small></div><div><i>🌙</i><b>maan: 1,62 N/kg</b><small>tabel niet vanbuiten</small></div><div><i>🎯</i><b>dichter bij het centrum</b><small>= grotere g</small></div></div>',
    '<h4>⬇️ Zwaartekracht F<sub>z</sub></h4><p class="lp-kop" style="text-align:center;font-size:1.3rem">F<sub>z</sub> = m · g</p><div class="lp-tegels"><div><i>🧲</i><b>veldkracht</b><small>werkt op afstand</small></div><div><i>⬇️</i><b>recht naar beneden</b><small>naar het centrum van de aarde</small></div><div><i>📍</i><b>zwaartepunt</b><small>aangrijpingspunt</small></div></div><div class="lp-stroom"><div><span>bowlingbal</span><b>m = 5,00 kg</b></div><div><span>op aarde</span><b>5,00 · 9,81 = 49,1 N</b></div><div class="groen"><span>op de maan</span><b>8,10 N</b></div></div><p class="lp-tip">⚠️ Rond af op <b>3 beduidende cijfers</b> (49,1).</p>',
    '<h4>⬆️ Normaalkracht F<sub>n</sub></h4><div class="lp-tegels"><div><i>✋</i><b>contactkracht</b><small>van een ondersteuning</small></div><div><i>📐</i><b>loodrecht op het steunvlak</b><small>weg van het oppervlak</small></div><div><i>🛡️</i><b>werkt binnendringen tegen</b><small>atomen stoten elkaar af</small></div></div><p class="lp-tip">🔑 Ligt een voorwerp <b>stil</b> op een <b>horizontale</b> ondergrond? Dan is <b>F<sub>z</sub> = F<sub>n</sub></b>.</p>',
    '<h4>⚖️ Massa of gewicht?</h4><div class="lp-vs"><div><b>🧱 massa m</b>hoeveelheid <u>stof</u><small>in <b>kg</b> · overal in het heelal <b>gelijk</b></small></div><div><b>🏋️ gewicht G</b>kracht op de <u>ondersteuning</u><small>in <b>N</b> · G = m · g · contactkracht · verschilt per planeet</small></div></div><p class="lp-tip">🪂 Geen contact (je valt)? Dan heb je <b>geen gewicht</b>!</p>',
    '<h4>➡️ Gewicht als vector</h4><table class="lp-ww lp-irr"><tr><td>aangrijpingspunt</td><td>het <b>contactpunt</b> op het steunvlak</td></tr><tr><td>richting</td><td><b>loodrecht</b> op het steunvlak</td></tr><tr><td>zin</td><td><b>tegengesteld</b> aan F<sub>n</sub></td></tr><tr><td>grootte</td><td><b>even groot</b> als F<sub>n</sub></td></tr></table><div class="lp-vs"><div><b>⬇️ F<sub>z</sub></b>grijpt aan in het <u>zwaartepunt</u></div><div><b>⬇️ G</b>grijpt aan in het <u>contactpunt</u></div></div>',
    '<h4>🎯 Het zwaartepunt</h4><p>Het <b>zwaartepunt</b> = het <b>snijpunt</b> van alle <b>zwaartelijnen</b> (de verticale lijnen waarop F<sub>z</sub> ligt).</p><div class="lp-tegels k2"><div><i>⬛</i><b>regelmatig + homogeen</b><small>zwaartepunt ligt in het midden</small></div><div><i>💍</i><b>ring</b><small>ook in het midden, al is daar geen materie!</small></div></div>'
  ],
  kaarten:[
    ['Formule zwaartekracht?','F_z = m · g'],
    ['Waarde van g op aarde (België)?','9,81 N/kg'],
    ['Eenheid van zwaarteveldsterkte?','N/kg'],
    ['Waarom is g aan de polen groter dan aan de evenaar?','Aan de polen sta je dichter bij het centrum van de aarde'],
    ['Waarvan hangt de zwaarteveldsterkte van een hemellichaam af?','Van de massa van het hemellichaam (en de plaats erop)'],
    ['Richting en zin van de zwaartekracht?','Verticaal, naar beneden (naar het centrum van de aarde)'],
    ['Is zwaartekracht een contact- of veldkracht?','Veldkracht'],
    ['Wat is de normaalkracht?','Contactkracht van een ondersteuning, loodrecht op het steunvlak, werkt binnendringen tegen'],
    ['Voorwerp ligt stil op een tafel: verband F_z en F_n?','F_z = F_n (resulterende kracht is 0)'],
    ['Verschil massa en gewicht?','Massa = hoeveelheid stof in kg, overal gelijk. Gewicht = kracht op de ondersteuning in N, hangt af van g'],
    ['Is gewicht een contactkracht?','Ja: zonder contact met een ondersteuning is er geen gewicht'],
    ['Wat is het zwaartepunt?','Het snijpunt van alle zwaartelijnen; daar laat je F_z aangrijpen'],
    ['Waar ligt het zwaartepunt van een ring?','In het midden, ook al is daar geen materie']
  ],
  quiz:[
    {t:'mc',v:'Een rugzak van 8,0 kg op aarde. F_z = ?',o:['78 N','78,48 N','8,0 N','0,82 N'],a:0},
    {t:'mc',v:'Een bowlingbal van 5,00 kg op de maan (g = 1,62 N/kg). F_z = ?',o:['8,10 N','8,1 N','49,1 N','3,09 N'],a:0},
    {t:'mc',v:'Een astronaut van 70 kg gaat naar de maan. Wat verandert?',o:['Zijn gewicht, niet zijn massa','Zijn massa, niet zijn gewicht','Allebei','Geen van beide'],a:0},
    {t:'mc',v:'In welke richting staat de normaalkracht?',o:['Loodrecht op het steunvlak','Altijd verticaal naar beneden','Evenwijdig met het steunvlak','Naar het centrum van de aarde'],a:0},
    {t:'mc',v:'Welke formule geeft de massa als je F_z en g kent?',o:['m = F_z / g','m = F_z · g','m = g / F_z','m = F_z − g'],a:0},
    {t:'jf',v:'Iemand die van een duikplank valt, heeft tijdens de val geen gewicht.',a:true,u:'Geen contact met een ondersteuning = geen gewicht (wel zwaartekracht).'},
    {t:'jf',v:'Massa drukken we uit in newton.',a:false},
    {t:'invul',v:'Op aarde is g gelijk aan … N/kg.',a:['9,81','9.81']},
    {t:'invul',v:'Een voorwerp ondervindt 196,2 N zwaartekracht op aarde. Massa = … kg',a:['20,0','20','20.0']}
  ],
  reken:'zwaartekracht'
},
{
  id:'W6', vak:'wet', titel:'Veerkracht (wet van Hooke)',
  bron:[['Cursus krachten p. 15–20', KR]],
  samenvatting:[
    '<h4>🌀 Wat is een veer?</h4><p>Een <b>veer</b> = een spiraalvormig voorwerp dat je kan indrukken of uitrekken, en dat daarna <b>terugkeert</b> = <b>elastische vervorming</b>.</p><div class="lp-vs"><div><b>⬇️ drukveren</b>je <u>drukt</u> ze in<small>balpen, schokdemper</small></div><div><b>↕️ trekveren</b>je <u>rekt</u> ze uit<small>slinky, veer in het labo</small></div></div>',
    '<h4>🧪 De proef</h4><div class="lp-stroom"><div><span>stap 1</span><b>hang massa\'s aan de veer</b></div><div><span>stap 2</span><b>meet de uitrekking Δl</b></div><div><span>stap 3</span><b>kracht = F<sub>z</sub> = m · g</b></div><div class="groen"><span>grafiek F tegen Δl</span><b>een rechte → recht evenredig</b></div></div><p class="lp-tip">📈 F op de <b>y-as</b>, Δl op de <b>x-as</b>.</p>',
    '<h4>🔩 De veerconstante k</h4><p>F / Δl is altijd <b>hetzelfde</b> voor één veer = de <b>veerconstante k</b> (in <b>N/m</b>). Elke veer heeft zijn eigen k.</p><div class="lp-vs"><div><b>🧱 grote k</b><u>stijve</u> veer<small>moeilijk uit te rekken</small></div><div><b>🍝 kleine k</b><u>slappe</u> veer<small>makkelijk uit te rekken</small></div></div>',
    '<h4>📜 Wet van Hooke</h4><p>Ontdekt door <b>Robert Hooke</b>.</p><p class="lp-kop" style="text-align:center;font-size:1.3rem">F<sub>v</sub> = k · Δl</p><div class="lp-tegels"><div><i>💪</i><b>F<sub>v</sub> = k · Δl</b><small>kracht zoeken</small></div><div><i>🔩</i><b>k = F<sub>v</sub> / Δl</b><small>veerconstante zoeken</small></div><div><i>📏</i><b>Δl = F<sub>v</sub> / k</b><small>uitrekking zoeken</small></div></div><p class="lp-tip">⚠️ Eenheden! Staat k in N/m, zet Δl dan in <b>meter</b>: 5,0 cm = <b>0,050 m</b>.</p>'
  ],
  kaarten:[
    ['Wet van Hooke?','F_v = k · Δl'],
    ['Wat is Δl?','De uitrekking (of indrukking) van de veer t.o.v. de beginlengte'],
    ['Eenheid van de veerconstante k?','N/m'],
    ['Grote veerconstante betekent…','Een stijve veer'],
    ['Kleine veerconstante betekent…','Een slappe veer'],
    ['Verband tussen F en Δl?','Recht evenredig (rechte door de oorsprong)'],
    ['Drukveer vs. trekveer?','Drukveer wordt ingedrukt (balpen, schokdemper). Trekveer rekt uit (slinky)'],
    ['k berekenen?','k = F_v / Δl'],['Δl berekenen?','Δl = F_v / k']
  ],
  quiz:[
    {t:'mc',v:'Een veer rekt 0,10 m uit bij 5,0 N. k = ?',o:['50 N/m','0,50 N/m','5,0 N/m','500 N/m'],a:0},
    {t:'mc',v:'k = 200 N/m, Δl = 0,030 m. F_v = ?',o:['6,0 N','6,67 N','0,15 N','600 N'],a:0},
    {t:'mc',v:'k = 40 N/m, F = 2,0 N. Δl = ?',o:['0,050 m','20 m','80 m','0,50 m'],a:0},
    {t:'mc',v:'Veer A: k = 10 N/m, veer B: k = 20 N/m. Welke is het stijfst?',o:['B','A','Even stijf','Kan je niet weten'],a:0},
    {t:'mc',v:'Je hangt 200 g aan een veer met k = 49 N/m. Uitrekking?',o:['0,040 m','4,0 m','0,40 m','9,8 m'],a:0},
    {t:'jf',v:'Bij een veer is de vervorming normaal elastisch.',a:true},
    {t:'invul',v:'Een veer rekt 4,0 cm uit bij 2,0 N. k = … N/m',a:['50','50 N/m']}
  ],
  reken:'hooke'
},
{
  id:'W7', vak:'wet', titel:'Spieren: functies en werking',
  bron:[['Cursus spieren en gewrichten p. 1–6', SP]],
  samenvatting:[
    '<h4>💪 De 6 functies van spieren</h4><div class="lp-tegels"><div><i>🏃</i><b>1 beweging</b></div><div><i>🥶</i><b>2 warmte</b><small>bibberen</small></div><div><i>🔁</i><b>3 lichaamsfuncties</b><small>bloed, lucht, voedsel vervoeren</small></div><div><i>🛡️</i><b>4 organen beschermen</b><small>buikspieren</small></div><div><i>🧍</i><b>5 houding</b><small>en stabilisatie</small></div><div><i>🔋</i><b>6 energieopslag</b><small>glycogeen</small></div></div><p class="lp-tip">⚖️ Spieren zijn ± <b>40 %</b> van je massa: bijna de helft! Weetjes: je hebt <b>639</b> skeletspieren, je <b>kleinste</b> spier zit in je <b>oor</b>, en het <b>hart</b> en het <b>oog</b> zijn het meest actief.</p>',
    '<h4>🦴 Spier, pees en bot</h4><div class="lp-ketting"><span>🦴 bot 1</span><i>—</i><span>pees</span><i>—</i><span>💪 spier</span><i>—</i><span>pees</span><i>—</i><span>🦴 bot 2</span></div><p>Een <b>skeletspier</b> zit meestal met <b>2 pezen</b> vast aan <b>2 botten</b>, over een <b>gewricht</b>. Een <b>pees</b> = een taaie band bindweefsel die de kracht van de spier naar het bot brengt.</p>',
    '<h4>🔄 Antagonisten</h4><p>Een spier kan alleen <b>actief samentrekken</b> (korter en dikker), <b>niet</b> zelf uitrekken. Daarom werken spieren in <b>koppels</b> met een tegengestelde werking = <b>antagonisten</b>.</p><table class="lp-ww lp-irr"><tr><th></th><th>buigen</th><th>strekken</th></tr><tr><td>💪 arm</td><td><b>biceps</b><br><small>tweehoofdig</small></td><td><b>triceps</b><br><small>driehoofdig</small></td></tr><tr><td>🦵 been (knie)</td><td><b>hamstring</b><br><small>achterkant</small></td><td><b>quadriceps</b><br><small>voorkant</small></td></tr></table><p class="lp-tip">💡 De spier die samentrekt = de <b>agonist</b>. Arm buigen: de biceps is de agonist, de triceps ontspant.</p>',
    '<h4>🔬 Bouw van een skeletspier</h4><div class="lp-vs"><div><b>👁️ macroscopisch</b>met het <u>oog</u></div><div><b>🔬 microscopisch</b>met de <u>microscoop</u></div></div><p class="lp-kop">Van groot naar klein:</p><div class="lp-stroom"><div><span>met spierschede</span><b>spier</b></div><div><span>dikste deel, trekt samen</span><b>spierbuik</b></div><div><span>met bundelschede</span><b>spierbundels</b></div><div><span>1 lange spiercel (cm!)</span><b>spiervezels</b></div><div><span>in de spiervezel</span><b>spierfibrillen</b></div><div class="groen"><span>zorgen voor samentrekking</span><b>actine + myosine</b></div></div><p class="lp-tip">🩸 Daartussen lopen <b>bloedvaten</b> (zuurstof, voeding, afvoer) en <b>zenuwcellen</b> (neuronen). De <b>spierschede</b> zorgt voor bescherming, vasthechting en krachtoverdracht.</p>',
    '<h4>⚡ Van prikkel naar spierreactie</h4><div class="lp-ketting"><span>👀 <b>prikkel</b><br><small>informatie of verandering die je opmerkt</small></span><i>→</i><span>🧠 <b>zenuwstelsel</b><br><small>verwerkt de prikkel</small></span><i>→</i><span>💪 <b>reactie</b><br><small>de spier beweegt of verandert</small></span></div><div class="lp-vs"><div><b>🙋 bewust</b>je <u>kiest</u> zelf<small>je strekt je arm om een glas water te nemen (skeletspier)</small></div><div><b>⚡ onbewust</b>gebeurt <u>vanzelf</u> (reflex)<small>ogen dichtknijpen bij fel licht · je hart klopt sneller als je schrikt · bibberen in de kou · je maag kneedt voedsel</small></div></div><p class="lp-tip">🔑 Zowel bewuste bewegingen als reflexen zijn <b>reacties op een prikkel</b>.</p>'
  ],
  kaarten:[
    ['6 functies van spieren?','Beweging, warmteproductie, regulatie lichaamsfuncties, bescherming organen, houding/stabilisatie, energieopslag'],
    ['Hoe produceren spieren warmte?','Kleine spiersamentrekkingen, bv. bibberen'],
    ['Welke energie slaan spieren op?','Glycogeen (een vorm van suiker)'],
    ['Wat is een pees?','Taaie band bindweefsel die spier en bot verbindt en de kracht overbrengt'],
    ['Kan een skeletspier actief uitrekken?','Nee, enkel actief samentrekken'],
    ['Wat zijn antagonisten?','Spieren met tegengestelde werking op een gewricht, werken in koppels'],
    ['Welke spier buigt de arm?','Biceps (tweehoofdige armspier)'],
    ['Welke spier strekt de arm?','Triceps (driehoofdige armspier)'],
    ['Wat is de agonist?','De spier die op dat moment samentrekt en de beweging uitvoert'],
    ['Welke spier strekt het been in de knie?','Quadriceps'],
    ['Welke spier buigt het been in de knie?','Hamstring'],
    ['Wat is de spierschede?','Stevig bindweefsel rond de hele spier: bescherming, vasthechting aan pezen, krachtoverdracht'],
    ['Wat is een spiervezel?','Eén langgerekte, cilindervormige spiercel die kan samentrekken'],
    ['Bouw van groot naar klein?','Spier → spierbuik → spierbundel → spiervezel → spierfibril → actine- en myosinefilamenten'],
    ['Welke filamenten zorgen voor samentrekking?','Actine en myosine'],
    ['Wat is een prikkel?','Elke vorm van informatie of verandering in je omgeving of lichaam die je opmerkt'],
    ['Wat is een reactie?','De handeling, beweging of verandering in je lichaam nadat je zenuwstelsel de prikkel verwerkt heeft'],
    ['Bewuste reactie, voorbeeld?','Je arm uitstrekken om een glas water te nemen'],
    ['Onbewuste reactie (reflex), voorbeeld?','Ogen dichtknijpen bij fel licht, hart klopt sneller als je schrikt']
  ],
  quiz:[
    {t:'mc',v:'Je buigt je arm. Welke spier is de agonist?',o:['Biceps','Triceps','Quadriceps','Hamstring'],a:0},
    {t:'mc',v:'Je trapt een bal (been strekken). Welke spier trekt samen?',o:['Quadriceps','Hamstring','Biceps','Triceps'],a:0},
    {t:'mc',v:'Wat is de antagonist van de quadriceps?',o:['Hamstring','Biceps','Kuitspier','Triceps'],a:0},
    {t:'mc',v:'Wat gebeurt met een spier die samentrekt?',o:['Korter en dikker','Langer en dunner','Korter en dunner','Langer en dikker'],a:0},
    {t:'mc',v:'Welke structuur is het kleinst?',o:['Myosinefilament','Spierbundel','Spiervezel','Spierbuik'],a:0},
    {t:'mc',v:'Bibberen als je het koud hebt hoort bij welke functie?',o:['Warmteproductie','Bescherming','Energieopslag','Houding'],a:0},
    {t:'jf',v:'Spieren zijn ongeveer 40 % van je lichaamsmassa.',a:true},
    {t:'volgorde',v:'Zet van groot naar klein.',o:['Spier','Spierbundel','Spiervezel','Spierfibril','Actine/myosine']},
    {t:'mc',v:'Je schrikt van een hard geluid en je hart klopt sneller. Wat is dat?',o:['Een onbewuste reactie van hartspierweefsel','Een bewuste reactie van een skeletspier','Een bewuste reactie van glad spierweefsel','Geen reactie op een prikkel'],a:0},
    {t:'mc',v:'Na het eten kneedt je maag het voedsel. Welk spierweefsel werkt hier?',o:['Glad spierweefsel','Dwarsgestreept spierweefsel','Hartspierweefsel','Een pees'],a:0}
  ]
},
{
  id:'W8', vak:'wet', titel:'Spierweefsels & gewrichten',
  bron:[['Cursus spieren en gewrichten p. 7–12', SP]],
  samenvatting:[
    '<h4>🧬 3 soorten spierweefsel</h4><table class="lp-ww lp-irr lp-wrap"><tr><th></th><th>dwarsgestreept</th><th>glad</th><th>hart</th></tr><tr><td>waar?</td><td>skelet, gezicht</td><td>maag, darmen, bloedvaten, pupil</td><td>enkel het hart</td></tr><tr><td>vorm</td><td>cilinder, onvertakt</td><td>spoelvormig</td><td>vertakt</td></tr><tr><td>celkernen</td><td>veel, aan de rand</td><td>1, duidelijk</td><td>max 2, in het midden</td></tr><tr><td>streepjes?</td><td><b>ja</b></td><td><b>nee</b></td><td><b>soort van</b></td></tr><tr><td>met je wil?</td><td><b>ja</b> (willekeurig)</td><td><b>nee</b> (onwillek.)</td><td><b>nee</b> (onwillek.)</td></tr><tr><td>snelheid</td><td><b>zeer snel</b></td><td><b>traag</b>, langdurig</td><td>traag én snel</td></tr><tr><td>moe?</td><td><b>snel</b> vermoeid</td><td>bijna <b>nooit</b></td><td><b>nooit</b></td></tr></table><p class="lp-tip">💡 Dwarsgestreept is ook <b>veelkernig</b>. Glad spierweefsel heeft één duidelijke celkern.</p>',
    '<h4>🦴 Soorten gewrichten</h4><p>Een <b>gewricht</b> = een verbinding tussen twee beenderen waarbij <b>beweging</b> mogelijk is.</p><div class="lp-vs"><div><b>🔒 onbeweeglijk</b>bind- of beenweefsel<small><b>schedelnaden</b>: nodig voor de geboorte, groeien daarna vast</small></div><div><b>↔️ beperkt beweeglijk</b>kraakbeen ertussen<small>tussen de <b>wervels</b>, tussen <b>ribben en borstbeen</b></small></div></div>',
    '<h4>🔧 Beweeglijke gewrichten</h4><div class="lp-tegels k2"><div><i>🚪</i><b>scharnier</b><small>buigen en strekken in 1 vlak: elleboog, knie, vingers</small></div><div><i>🐎</i><b>zadel</b><small>2 richtingen: basis van de duim</small></div><div><i>⚽</i><b>kogel</b><small>bijna alle richtingen: schouder, heup</small></div><div><i>🔄</i><b>rol</b><small>draaien rond een as: spaakbeen en ellepijp (handpalm omdraaien)</small></div></div>',
    '<h4>🔩 Bouw van een gewricht</h4><div class="lp-tegels k2"><div><i>⚪</i><b>gewrichtskop</b><small>rond uiteinde</small></div><div><i>🥣</i><b>gewrichtskom</b><small>komvormig uiteinde</small></div><div><i>🧊</i><b>kraakbeenlaagje</b><small>glad, soepel bewegen</small></div><div><i>🛢️</i><b>gewrichtssmeer</b><small>stroperige smeervloeistof</small></div><div><i>👜</i><b>gewrichtskapsel</b><small>bindweefsel rond de uiteinden</small></div><div><i>🪢</i><b>gewrichtsbanden</b><small>stevigheid, houden de beenderen op hun plaats</small></div></div><p class="lp-tip">💡 De <b>kop</b> past in de <b>kom</b>.</p>'
  ],
  kaarten:[
    ['Kenmerken dwarsgestreept spierweefsel?','Streepjespatroon, veelkernig, aan skelet, willekeurig, zeer snel, snel vermoeid'],
    ['Kenmerken glad spierweefsel?','Geen streepjes, duidelijke kern, vooral spijsvertering, onwillekeurig, traag en langdurig, bijna nooit vermoeid'],
    ['Kenmerken hartspierweefsel?','Enkel in het hart, soort streepjes, onwillekeurig, traag én snel, nooit vermoeid'],
    ['Willekeurige vs. onwillekeurige spier?','Willekeurig: onder invloed van je wil (skeletspieren). Onwillekeurig: werkt vanzelf (glad, hart)'],
    ['Voorbeelden van gladde spieren?','Slokdarm, maag, darmen, spieren rond bloedvaten, pupilvernauwer'],
    ['Wat is een gewricht?','Verbinding tussen twee beenderen waarbij beweging mogelijk is'],
    ['Voorbeeld onbeweeglijk gewricht?','Schedelnaden'],
    ['Voorbeelden beperkt beweeglijk gewricht?','Tussen de wervels, tussen ribben en borstbeen'],
    ['Scharniergewricht: beweging en voorbeelden?','Buigen en strekken (1 vlak): elleboog, knie, vingers'],
    ['Zadelgewricht: beweging en voorbeeld?','2 richtingen: basis van de duim'],
    ['Kogelgewricht: beweging en voorbeelden?','Bijna alle richtingen, cirkel: schouder, heup'],
    ['Rolgewricht: beweging en voorbeeld?','Draaien rond een as: spaakbeen en ellepijp'],
    ['Gewrichtssmeer?','Stroperige vloeistof die het gewricht smeert'],
    ['Gewrichtsbanden?','Zorgen voor stevigheid, houden de beenderen op hun plaats'],
    ['Gewrichtskapsel?','Bindweefselkapsel rond de uiteinden van de beenderen'],
    ['Kraakbeenlaagje?','Gladde laag waardoor beenderuiteinden soepel over elkaar bewegen']
  ],
  quiz:[
    {t:'mc',v:'Welk gewricht heeft de meeste bewegingsmogelijkheden?',o:['Kogelgewricht','Scharniergewricht','Zadelgewricht','Rolgewricht'],a:0},
    {t:'mc',v:'Welk soort gewricht is de knie?',o:['Scharniergewricht','Kogelgewricht','Zadelgewricht','Onbeweeglijk gewricht'],a:0},
    {t:'mc',v:'Je draait je handpalm naar boven. Welk gewricht?',o:['Rolgewricht','Scharniergewricht','Kogelgewricht','Zadelgewricht'],a:0},
    {t:'mc',v:'Welk spierweefsel is snel vermoeid?',o:['Dwarsgestreept','Glad','Hartspier','Geen enkel'],a:0},
    {t:'mc',v:'Welk spierweefsel zit in je maag?',o:['Glad spierweefsel','Dwarsgestreept','Hartspierweefsel','Kraakbeen'],a:0},
    {t:'mc',v:'Welk deel van een gewricht houdt de beenderen op hun plaats?',o:['Gewrichtsbanden','Gewrichtssmeer','Kraakbeenlaagje','Gewrichtskom'],a:0},
    {t:'jf',v:'Gezichtsspieren zijn skeletspieren en dus willekeurig.',a:true},
    {t:'jf',v:'De hartspier kan je bewust aansturen.',a:false},
    {t:'invul',v:'Het gewricht aan de basis van je duim is een …gewricht.',a:['zadel','zadelgewricht']}
  ]
},
{
  id:'W9', vak:'wet', titel:'Wiskunde: rekenen met vectoren', min:18,
  bron:[],
  samenvatting:[
    '<h4>➡️ Wat is een vector?</h4><p>Een vector is een <b>georiënteerd lijnstuk</b>: een pijl met een <b>beginpunt A</b> en een <b>eindpunt B</b>. Notatie: <b>AB</b> met een pijltje erboven. Het beginpunt is het <b>aangrijpingspunt</b>.</p><div class="lp-tegels k2"><div><i>📏</i><b>norm (grootte)</b><small>de lengte van het lijnstuk</small></div><div><i>↗️</i><b>richting</b><small>horizontaal, verticaal, schuin</small></div><div><i>👉</i><b>zin</b><small>naar welke kant de pijl wijst</small></div><div><i>📍</i><b>aangrijpingspunt</b><small>het beginpunt</small></div></div><p class="lp-tip">👣 Iedereen zet een stap van 20 cm, horizontaal, naar links: dat zijn <b>gelijke vectoren</b>, ook al staan jullie op een andere plaats.</p>',
    '<h4>🆓 Vrije of gebonden vector?</h4><table class="lp-ww lp-wrap"><tr><th></th><th>vrije vector</th><th>gebonden vector</th></tr><tr><td>aangrijpingspunt</td><td>niet vast</td><td>vast (meestal het zwaartepunt)</td></tr><tr><td>verschuiven?</td><td>ja, als richting, zin en grootte gelijk blijven</td><td>nee</td></tr><tr><td>gebruik</td><td>verplaatsing, snelheden</td><td>krachten</td></tr></table><p class="lp-tip">💡 Een vrije vector = de <b>verzameling</b> van alle georiënteerde lijnstukken met dezelfde richting, zin en norm.</p>',
    '<h4>📏 Norm, nulvector, gelijk en tegengesteld</h4><p>De <b>norm</b> van <b>u</b> noteer je <b>‖u‖</b>. Een norm is <b>altijd positief</b>: ‖u‖ ≥ 0.</p><table class="lp-ww lp-wrap"><tr><th></th><th>gelijke vectoren</th><th>tegengestelde vectoren</th><th>nulvector</th></tr><tr><td>norm</td><td>gelijk</td><td>gelijk</td><td>0</td></tr><tr><td>richting</td><td>gelijk</td><td>gelijk</td><td>geen</td></tr><tr><td>zin</td><td>gelijk</td><td>tegengesteld</td><td>geen</td></tr></table><p class="lp-tip">⭕ Bij de <b>nulvector</b> vallen begin- en eindpunt samen (bv. AA). Notatie: <b>0</b> met een pijltje.</p>',
    '<h4>📐 Krachtvectoren op schaal</h4><div class="lp-vs"><div><b>✏️ tekenen</b>grootte <u>delen</u> door de schaal<small>420 N met 1 cm = 100 N → <b>4,2 cm</b></small></div><div><b>📏 aflezen</b>lengte <u>maal</u> de schaal<small>7,2 cm met 1 cm = 100 N → <b>720 N</b></small></div></div><p class="lp-tip">⚠️ Gebruik een <b>lat</b> en meet nauwkeurig.</p>',
    '<h4>✖️ Vector maal een getal</h4><p><b>r · AB</b> is een vector met:</p><ul><li>dezelfde <b>richting</b> als AB</li><li>dezelfde <b>zin</b> als r &gt; 0, de <b>tegengestelde zin</b> als r &lt; 0</li><li>als lengte <b>|r| keer</b> de lengte van AB</li></ul><div class="lp-vs"><div><b>2 · AB</b>dubbel zo lang, <u>zelfde</u> zin</div><div><b>−2 · AB</b>dubbel zo lang, <u>andere</u> zin</div></div><p class="lp-tip">0 · AB = nulvector.</p>',
    '<h4>➖ Verschil tekenen</h4><p>Het verschil <b>v − u</b> is de som van v en de <b>tegengestelde</b> van u:</p><div class="lp-ketting"><span><b>v − u</b></span><i>=</i><span><b>v + (−u)</b></span></div><p class="lp-tip">✏️ Draai u dus om en tel op met de <b>kop-staartmethode</b> of de <b>parallellogrammethode</b> (zie de les over kracht als vector).</p>',
    '<h4>📍 Coördinaten van vectoren</h4><div class="lp-vs"><div><b>🎯 plaatsvector</b>begint in de <u>oorsprong</u><small>co(OP) = co(P), de coördinaat van het eindpunt · bv. co(OP) = (4 ; 3)</small></div><div><b>🆓 vrije vector</b>eindpunt <u>min</u> beginpunt<small>co(AB) = co(B) − co(A) = (x<sub>B</sub> − x<sub>A</sub> ; y<sub>B</sub> − y<sub>A</sub>)</small></div></div><p class="lp-kop">✍️ Voorbeeld</p><p>A(−4 ; 1) en B(4 ; 4) → co(AB) = (4 − (−4) ; 4 − 1) = <b>(8 ; 3)</b></p>',
    '<h4>🧮 De norm berekenen</h4><p>Met de <b>stelling van Pythagoras</b> in een rechthoekige driehoek:</p><p style="text-align:center;font-size:1.15rem"><b>‖AB‖ = √( (x<sub>B</sub> − x<sub>A</sub>)² + (y<sub>B</sub> − y<sub>A</sub>)² )</b></p><p class="lp-kop">✍️ Voorbeeld</p><p>A(0 ; 0) en B(−2 ; 3) → ‖AB‖ = √(4 + 9) = √13 ≈ <b>3,61</b></p>',
    '<h4>➕ Rekenen met coördinaten</h4><p>Voor a(x<sub>a</sub> ; y<sub>a</sub>) en b(x<sub>b</sub> ; y<sub>b</sub>):</p><table class="lp-ww"><tr><td>som</td><td>co(a + b) = (x<sub>a</sub> + x<sub>b</sub> ; y<sub>a</sub> + y<sub>b</sub>)</td></tr><tr><td>verschil</td><td>co(a − b) = (x<sub>a</sub> − x<sub>b</sub> ; y<sub>a</sub> − y<sub>b</sub>)</td></tr><tr><td>maal k</td><td>co(k · a) = (k · x<sub>a</sub> ; k · y<sub>a</sub>)</td></tr></table><p class="lp-kop">✍️ Met k(4 ; −2) en l(−9 ; 6)</p><table class="lp-ww"><tr><td>co(k + l)</td><td>(4 + (−9) ; −2 + 6) = (−5 ; 4)</td></tr><tr><td>co(l − k)</td><td>(−9 − 4 ; 6 − (−2)) = (−13 ; 8)</td></tr><tr><td>co(3l)</td><td>(−27 ; 18)</td></tr><tr><td>co(k + 2l)</td><td>(4 − 18 ; −2 + 12) = (−14 ; 10)</td></tr></table><p class="lp-tip">🪜 Geen coördinaten gegeven? 1) bereken de coördinaten van de vectoren, 2) vermenigvuldig, 3) tel op of trek af.</p>'
  ],
  kaarten:[
    ['Wat is een vector?','Een georiënteerd lijnstuk met een beginpunt (aangrijpingspunt) en een eindpunt'],
    ['Wat is de norm van een vector?','De lengte van het lijnstuk, genoteerd ‖u‖ (altijd ≥ 0)'],
    ['Wat is een vrije vector?','De verzameling van alle georiënteerde lijnstukken met dezelfde richting, zin en norm (mag verschuiven)'],
    ['Wat is een gebonden vector?','Een vector met een vast aangrijpingspunt (bv. het zwaartepunt); gebruikt voor krachten'],
    ['Wanneer gebruik je vrije vectoren?','Voor verplaatsingen en snelheden'],
    ['Wat is de nulvector?','Begin- en eindpunt vallen samen; norm 0, geen richting en geen zin'],
    ['Gelijke vectoren?','Zelfde norm, richting en zin'],
    ['Tegengestelde vectoren?','Zelfde norm en richting, tegengestelde zin'],
    ['Kracht van 420 N tekenen met 1 cm = 100 N?','4,2 cm (grootte delen door de schaal)'],
    ['Pijl van 7,2 cm met 1 cm = 100 N?','720 N (lengte maal de schaal)'],
    ['Wat doet r · AB als r < 0?','Zelfde richting, tegengestelde zin, lengte |r| keer AB'],
    ['Hoe teken je v − u?','Als v + (−u): tel v op bij de tegengestelde van u'],
    ['Wat is een plaatsvector?','Een gebonden vector die begint in de oorsprong'],
    ['Coördinaat van een plaatsvector?','De coördinaat van het eindpunt'],
    ['Formule co(AB)?','co(B) − co(A) = (x_B − x_A ; y_B − y_A)'],
    ['Formule voor de norm ‖AB‖?','√((x_B − x_A)² + (y_B − y_A)²) (Pythagoras)'],
    ['co(a + b)?','(x_a + x_b ; y_a + y_b)'],
    ['co(k · a)?','(k · x_a ; k · y_a)']
  ],
  quiz:[
    {t:'mc',v:'Welke vector heeft een vast aangrijpingspunt?',o:['Een gebonden vector','Een vrije vector','De nulvector','Elke vector'],a:0},
    {t:'mc',v:'Tegengestelde vectoren hebben …',o:['dezelfde norm en richting, maar een andere zin','een andere richting','een andere norm','geen richting'],a:0},
    {t:'mc',v:'Hoe lang teken je 350 N met schaal 1 cm = 100 N?',o:['3,5 cm','35 cm','0,35 cm','350 cm'],a:0},
    {t:'mc',v:'Wat is −2 · AB?',o:['Dubbel zo lang, tegengestelde zin','Half zo lang, zelfde zin','Dubbel zo lang, zelfde zin','De nulvector'],a:0},
    {t:'mc',v:'A(−4 ; 1), B(4 ; 4). Wat is co(AB)?',o:['(8 ; 3)','(0 ; 5)','(−8 ; −3)','(8 ; 5)'],a:0},
    {t:'mc',v:'Hoe bereken je het verschil v − u?',o:['v + (−u)','u − v','v · u','−v + u'],a:0},
    {t:'jf',v:'De norm van een vector kan negatief zijn.',a:false,u:'‖u‖ ≥ 0, altijd positief (of 0).'},
    {t:'jf',v:'De nulvector heeft geen richting en geen zin.',a:true},
    {t:'jf',v:'Een vrije vector mag je verschuiven als richting, zin en grootte gelijk blijven.',a:true},
    {t:'invul',v:'k(4 ; −2) en l(−9 ; 6). co(k + l) = ? (schrijf zo: (x;y))',a:['(-5;4)']},
    {t:'invul',v:'l(−9 ; 6). co(3l) = ? (schrijf zo: (x;y))',a:['(-27;18)']},
    {t:'getal',v:'A(0 ; 0), B(−2 ; 3). Bereken ‖AB‖ (op 2 decimalen).',a:3.61,tol:.005}
  ],
  reken:'vector'
}
);
})();
