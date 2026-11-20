// Techniek (1A) — examen ma 14/12. Leerstof volgens het leerstofoverzicht Techniek:
// eigen bundels (technologisch proces, technisch tekenen), Cool!-bladzijden p. 4–11 en Cool! 1 werkhandboek
// project 0, 1 (p. 12–31) en 2 (p. 36–51).
(function(){
const COOL = 'https://drive.google.com/file/d/1MY1r7qSgUFSBYdBzb-C9jPHp0XnWEyht/view';
const CB = 'https://drive.google.com/file/d/1JefKzSclZSMc6GDww-fFMzPvbtm3Qw6n/view';
const B = (p, cb) => [['Cool! 1 werkhandboek · ' + p, COOL]].concat(cb ? [['Cool!-bladzijden · ' + cb, CB]] : []);
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'T1', vak:'tech', titel:'Techniek, technologie en het technisch proces',
  bron: B('p. 6–8', 'p. 4–5'),
  samenvatting:[
    '<h4>🛠️ Techniek en technologie</h4><div class="lp-vs"><div><b>Techniek</b>alles wat de mens <b>bedenkt en maakt</b> om een <b>probleem op te lossen</b> of een <b>behoefte</b> te voldoen, en zo zijn leven makkelijker te maken<small>techniek is <b>denken én doen</b></small></div><div><b>Technologie</b>de <b>kennis</b> over techniek: weten <b>hoe</b> en <b>waarom</b> iets werkt, en die kennis gebruiken om nieuwe dingen te maken</div></div><p class="lp-tip">📒 De juiste definities staan in je <b>bundel van project 0</b> (4 pagina’s): leer ze daar woord voor woord. Deze uitleg helpt je ze te begrijpen.</p>',
    '<h4>🔁 Het technisch proces: altijd 5 fasen</h4><div class="lp-stroom"><div><span><b>1. Probleem stellen</b>: welk probleem? voor wie? aan welke <b>criteria</b> moet de oplossing voldoen?</span><b>❓</b></div><div><span><b>2. Ontwerpen</b>: A mogelijke oplossingen bedenken (voor- en nadelen) · B de beste kiezen, vorm, materiaal, bewerkingen, <b>schets</b></span><b>✏️</b></div><div><span><b>3. Maken</b>: gereedschap, onderdelenlijst, <b>stappenplan</b>, uitvoeren</span><b>🔨</b></div><div><span><b>4. Testen en in gebruik nemen</b>: werkt het?</span><b>🧪</b></div><div><span><b>5. Evalueren en optimaliseren</b>: voldoet het aan de criteria? wat kan beter? → zo nodig terug naar fase 1</span><b>⭐</b></div></div>',
    '<h4>🌙 Voorbeeld: een nachtlampje</h4><table class="lp-ww lp-tijd"><tr><td>1 probleem</td><td>Mijn zusje slaapt niet graag in het donker. Criteria: niet te veel plaats, slaap niet storen, uit te schakelen, niet te duur.</td></tr><tr><td>2 ontwerpen</td><td>deur open laten? nachtlampje op batterij of op 230 V? → kies, schets, materiaal (isolerend, goedkoop)</td></tr><tr><td>3 maken</td><td>aftekenen, zagen, boren, lijmen, solderen volgens stappenplan</td></tr><tr><td>4 testen</td><td>lampje uittesten in de kamer</td></tr><tr><td>5 evalueren</td><td>scoort het goed op alle criteria? aanpassen</td></tr></table><p class="lp-tip">🎯 Op het examen moet je zelf een technisch proces <b>uitwerken voor een gegeven probleem</b>. Oefen dat met je lampmannetje: probleem = mooie leeslamp is te duur.</p>',
    '<h4>⚖️ Procesevaluatie of productevaluatie?</h4><div class="lp-vs"><div><b>Productevaluatie</b>je beoordeelt het <b>eindresultaat</b>: voldoet het product aan de <b>criteria</b>?<small>“Kunnen de benen in een andere positie?”</small></div><div><b>Procesevaluatie</b>je beoordeelt <b>hoe je gewerkt</b> hebt: de stappen, planning, tempo, veiligheid, samenwerking<small>“In welke stap liep het fout? Wat doe ik volgende keer beter?”</small></div></div>'
  ],
  kaarten:[
    ['Wat is techniek?','Alles wat de mens bedenkt en maakt om problemen op te lossen of behoeften te voldoen (check de definitie in je bundel)'],
    ['Wat is technologie?','De kennis over techniek: hoe en waarom iets werkt (check de definitie in je bundel)'],
    ['Geef de 5 fasen van het technisch proces','1 probleem stellen · 2 ontwerpen · 3 maken · 4 testen en in gebruik nemen · 5 evalueren en optimaliseren'],
    ['Wat doe je in fase 1?','Het probleem formuleren: wat, voor wie, en aan welke criteria moet de oplossing voldoen'],
    ['Wat doe je in fase 2?','Oplossingen bedenken met voor- en nadelen, de beste kiezen en een ontwerp/schets maken'],
    ['Wat doe je in fase 3?','Gereedschap kiezen, onderdelenlijst en stappenplan maken, uitvoeren'],
    ['Wat doe je in fase 5?','Evalueren of het aan de criteria voldoet en verbeteren (eventueel terug naar fase 1)'],
    ['Wat zijn criteria?','De voorwaarden waaraan de oplossing moet voldoen'],
    ['Wat is productevaluatie?','Het eindproduct beoordelen: voldoet het aan de criteria?'],
    ['Wat is procesevaluatie?','Beoordelen hoe je gewerkt hebt: de stappen, planning en aanpak']
  ],
  quiz:[
    {t:'mc',v:'In welke fase maak je een stappenplan en een onderdelenlijst?',o:['Maken','Ontwerpen','Probleem stellen','Evalueren'],a:0},
    {t:'mc',v:'In welke fase bepaal je de criteria?',o:['Probleem stellen','Maken','Testen','Evalueren'],a:0},
    {t:'mc',v:'“We kiezen voor een LED op batterijen omdat dat veiliger is.” Welke fase?',o:['Ontwerpen','Maken','Testen','Probleem stellen'],a:0},
    {t:'mc',v:'Je zet het lampje aan in de donkere kamer om te kijken of het werkt. Welke fase?',o:['Testen en in gebruik nemen','Ontwerpen','Probleem stellen','Maken'],a:0},
    {t:'mc',v:'“Ik had beter eerst de deuvels afgezaagd vóór het boren.” Dit is…',o:['procesevaluatie','productevaluatie','een criterium','een probleemstelling'],a:0},
    {t:'mc',v:'“De lampenkap is demonteerbaar: ✔.” Dit is…',o:['productevaluatie','procesevaluatie','ontwerpen','maken'],a:0},
    {t:'mc',v:'Wat is de laatste fase van het technisch proces?',o:['Evalueren en optimaliseren','Maken','Testen','Verkopen'],a:0},
    {t:'mc',v:'Hoeveel fasen heeft het technisch proces?',o:['5','3','4','7'],a:0},
    {t:'jf',v:'Na de evaluatie kan je terug naar fase 1 om je ontwerp te verbeteren.',a:true},
    {t:'jf',v:'Techniek gaat alleen over het gebruiken van machines.',a:false,u:'Techniek is denken én doen: problemen oplossen door iets te bedenken en te maken.'},
    {t:'jf',v:'Een schets maken hoort bij de fase ontwerpen.',a:true},
    {t:'invul',v:'De voorwaarden waaraan een oplossing moet voldoen, noem je de … .',a:['criteria']},
    {t:'open',v:'Probleem: je skateboard ligt altijd in de weg in de gang. Werk de 5 fasen van het technisch proces kort uit.',m:'1 Probleem: skateboard ligt in de weg; criteria: stevig, neemt weinig plaats, makkelijk uit te nemen, goedkoop. 2 Ontwerpen: muurhaak, rek, kast … kiezen + schets + materiaal (hout/metaal). 3 Maken: gereedschap, stappenplan, aftekenen, zagen, boren, monteren. 4 Testen: board ophangen, houdt het? 5 Evalueren: voldoet het aan de criteria? verbeteren.'}
  ]
},
{
  id:'T2', vak:'tech', titel:'Soorten technische tekeningen',
  bron: B('p. 12–17 en synthese p. 28–29', 'p. 6–9'),
  samenvatting:[
    '<h4>🖼️ Waarom een tekening?</h4><p>Een tekening zegt <b>meer dan duizend woorden</b>. In een technisch proces zijn technische tekeningen onmisbaar: je moet ze kunnen <b>maken, lezen en begrijpen</b>.</p>',
    '<h4>📚 De soorten en hun doel (synthese: van buiten!)</h4><table class="lp-ww lp-tijd"><tr><td>schets</td><td>om een <b>idee</b> duidelijk te maken (snel, uit de hand)</td></tr><tr><td>perspectieftekening</td><td><b>ruimtelijke</b> (3D) tekening</td></tr><tr><td>projectietekening</td><td>toont <b>minstens twee aanzichten</b> (werktekening)</td></tr><tr><td>ontvouwing</td><td><b>uitslag</b> van een ontwerp (plat opengevouwen)</td></tr><tr><td>CAD-tekening</td><td>ontwerp met behulp van de <b>computer</b></td></tr><tr><td>ploftekening</td><td>de <b>afzonderlijke onderdelen</b> uit elkaar getekend, in relatie met elkaar (zoals in een montagehandleiding)</td></tr><tr><td>elektrisch schema</td><td>de <b>elektrische verbindingen</b> met symbolen</td></tr><tr><td>flowchart</td><td>de <b>volgorde van de handelingen</b> (met ja/nee-keuzes)</td></tr><tr><td>reclametekening</td><td><b>promotie</b> van het product</td></tr></table>',
    '<h4>💥 Een ploftekening lezen</h4><p>Alle onderdelen “ontploffen” uit elkaar, maar blijven op hun <b>lijn</b>. Elk onderdeel krijgt een <b>nummer</b> of naam. Zo zie je <b>hoe</b> en <b>in welke volgorde</b> je iets monteert.</p><p class="lp-vb">Voorbeeld uit je boek: de tweetaktmotor met bougie, zuiger, drijfstang, krukas, koppeling …</p>',
    '<h4>🔀 Een flowchart</h4><p>Rechthoek = handeling, ruit = <b>vraag</b> met <b>ja/nee</b>.</p><p class="lp-vb">Accu-onderhoud: controleer vloeistof → peil onder minimumstreep? <b>ja</b> → vul bij · <b>nee</b> → accu in orde</p>'
  ],
  kaarten:[
    ['Doel van een schets?','Een idee duidelijk maken'],
    ['Wat is een perspectieftekening?','Een ruimtelijke (3D) tekening'],
    ['Wat toont een projectietekening?','Minstens twee aanzichten van een voorwerp'],
    ['Wat is een ontvouwing?','De uitslag van een ontwerp: het voorwerp plat opengevouwen'],
    ['Wat is een CAD-tekening?','Een ontwerp gemaakt met behulp van de computer'],
    ['Wat toont een ploftekening?','De afzonderlijke onderdelen uit elkaar, in relatie met elkaar'],
    ['Wat toont een elektrisch schema?','De elektrische verbindingen (met symbolen)'],
    ['Wat toont een flowchart?','De volgorde van de handelingen'],
    ['Doel van een reclametekening?','Promotie van het product']
  ],
  quiz:[
    {t:'mc',v:'In de handleiding van een nieuwe kast zie je alle planken en schroeven uit elkaar getekend met nummers. Welke tekening?',o:['ploftekening','reclametekening','schets','elektrisch schema'],a:0},
    {t:'mc',v:'Welke tekening toont de volgorde van handelingen met ja/nee-vragen?',o:['flowchart','ontvouwing','projectietekening','perspectieftekening'],a:0},
    {t:'mc',v:'Je tekent snel een idee voor een skateramp op een blaadje. Welke tekening?',o:['schets','CAD-tekening','ploftekening','flowchart'],a:0},
    {t:'mc',v:'Een tekening met vooraanzicht, linkeraanzicht en bovenaanzicht is een…',o:['projectietekening','perspectieftekening','reclametekening','schets'],a:0},
    {t:'mc',v:'De uitslag van een doosje om uit te knippen en te plooien is een…',o:['ontvouwing','ploftekening','flowchart','schets'],a:0},
    {t:'mc',v:'Je ontwerpt de lampenkap in SketchUp. Welke soort tekening?',o:['CAD-tekening','reclametekening','flowchart','schets'],a:0},
    {t:'mc',v:'Wat is het doel van een reclametekening?',o:['Het product promoten','De onderdelen tonen','De handelingen ordenen','De maten geven'],a:0},
    {t:'mc',v:'Wat toont een elektrisch schema?',o:['De elektrische verbindingen','De kleur van de draden in 3D','De prijs','De aanzichten'],a:0},
    {t:'jf',v:'Een projectietekening toont minstens twee aanzichten.',a:true},
    {t:'jf',v:'Een perspectieftekening is een platte 2D-tekening.',a:false,u:'Een perspectieftekening is ruimtelijk (3D).'},
    {t:'invul',v:'Een tekening waarop alle onderdelen uit elkaar staan, heet een … .',a:['ploftekening']},
    {t:'open',v:'Waarom verkiest men vaak een tekening boven tekst? Geef ook twee soorten tekeningen met hun doel.',m:'Een tekening zegt meer dan duizend woorden: je ziet meteen hoe iets eruitziet of werkt, ook zonder taal. Bv. schets: idee duidelijk maken; ploftekening: onderdelen en hun samenhang tonen.'}
  ]
},
{
  id:'T3', vak:'tech', titel:'Perspectieftekenen: cavalière en isometrisch',
  bron: B('p. 18–20 en synthese p. 29'),
  samenvatting:[
    '<h4>📄 2D of 3D?</h4><div class="lp-vs"><div><b>2D</b>2 afmetingen: <b>lengte en breedte</b> (of hoogte). Plat, zoals een aanzicht.</div><div><b>3D</b>3 afmetingen: <b>lengte, breedte én hoogte/diepte</b>. Ruimtelijk, zoals een perspectieftekening.</div></div>',
    '<h4>🛣️ Twee families van perspectief</h4><table class="lp-ww lp-tijd"><tr><td>vluchtpuntperspectief</td><td>alle lijnen verdwijnen naar <b>één of twee vluchtpunten</b> (zoals een lange straat in de verte)</td></tr><tr><td>parallelperspectief</td><td>alle <b>evenwijdige</b> lijnen van het voorwerp blijven <b>evenwijdig</b> op de tekening</td></tr></table>',
    '<h4>📐 Drie parallelperspectieven</h4><svg viewBox="0 0 300 110" style="width:100%;max-width:340px;display:block;margin:6px auto"><g stroke="#5f3dc4" stroke-width="2.5" fill="none"><rect x="10" y="40" width="50" height="50"/><polyline points="10,40 32,18 82,18 60,40"/><polyline points="82,18 82,68 60,90"/></g><g stroke="#5f3dc4" stroke-width="2.5" fill="none"><polygon points="150,20 190,40 150,60 110,40"/><polyline points="110,40 110,85 150,105 190,85 190,40"/><line x1="150" y1="60" x2="150" y2="105"/></g><g stroke="#5f3dc4" stroke-width="2.5" fill="none"><polygon points="226,38 276,32 294,18 244,24"/><polyline points="226,38 226,88 276,82 276,32"/><polyline points="276,82 294,68 294,18"/></g><text x="45" y="108" text-anchor="middle" font-size="11" style="fill:var(--inkt)">cavalière 45°</text><text x="150" y="10" text-anchor="middle" font-size="11" style="fill:var(--inkt)">isometrisch 30°</text><text x="262" y="104" text-anchor="middle" font-size="11" style="fill:var(--inkt)">dimetrisch 7° / 42°</text></svg><table class="lp-ww lp-tijd"><tr><td>cavalièreperspectief</td><td>vooraanzicht <b>ware grootte</b>, dieptelijnen onder <b>45°</b> en <b>gehalveerd</b> (½)</td></tr><tr><td>isometrisch perspectief</td><td>breedte en diepte onder <b>30°</b> met de horizontale, alle maten <b>ware grootte</b>; hoogte verticaal</td></tr><tr><td>dimetrisch perspectief</td><td>lijnen onder <b>7°</b> en <b>42°</b> (de diepte op de 42°-lijn gehalveerd)</td></tr></table><p class="lp-tip">🧠 <b>C</b>avalière = <b>45</b> (en de diepte half), <b>I</b>so = <b>30</b> (iso = “gelijk”: alles op ware lengte), dimetrisch = <b>7 en 42</b>.</p>',
    '<h4>✏️ Zo teken je een balk</h4><p><b>Cavalière</b>: teken het <b>vooraanzicht</b> als gewone rechthoek → vanuit elke hoek een lijn onder 45° met de <b>halve diepte</b> → verbinden → onzichtbare lijnen weglaten (of streeplijn).</p><p><b>Isometrisch</b>: begin met de <b>voorste verticale ribbe</b> → vanuit de onderkant twee lijnen onder 30° (links en rechts) → verticalen → bovenvlak sluiten.</p><p class="lp-tip">✍️ <b>Schetsen</b> = uit de hand, zonder lat (wel op ruitjes/isopapier). <b>Tekenen</b> = met lat en geodriehoek. Op het examen krijg je opdrachten zoals je huistaken, ook met de <b>27-nummering kubus</b> (een kubus van 3 × 3 × 3 = 27 genummerde blokjes: je tekent de vorm die je met de gegeven nummers bouwt).</p>'
  ],
  kaarten:[
    ['Verschil 2D en 3D?','2D heeft 2 afmetingen (plat), 3D heeft 3 afmetingen (lengte, breedte en hoogte/diepte)'],
    ['Wat is vluchtpuntperspectief?','Alle lijnen verdwijnen naar één of twee vluchtpunten'],
    ['Wat is parallelperspectief?','Evenwijdige lijnen van het voorwerp blijven evenwijdig op de tekening'],
    ['Onder welke hoek teken je cavalièreperspectief?','45° (en de diepte gehalveerd)'],
    ['Onder welke hoek teken je isometrisch perspectief?','30° (alle maten op ware grootte)'],
    ['Onder welke hoeken teken je dimetrisch perspectief?','7° en 42°'],
    ['Wat is de ware grootte in cavalière?','Het vooraanzicht; de diepte teken je half'],
    ['Verschil schetsen en tekenen?','Schetsen = uit de hand zonder lat; tekenen = met lat en geodriehoek']
  ],
  quiz:[
    {t:'mc',v:'Bij welk perspectief teken je de dieptelijnen onder 45°?',o:['cavalière','isometrisch','dimetrisch','vluchtpunt'],a:0},
    {t:'mc',v:'Bij welk perspectief staan de lijnen onder 30° en zijn alle maten ware grootte?',o:['isometrisch','cavalière','dimetrisch','vluchtpunt'],a:0},
    {t:'mc',v:'Een balk is 6 cm diep. Hoe lang teken je de dieptelijn in cavalière?',o:['3 cm','6 cm','12 cm','4,5 cm'],a:0},
    {t:'mc',v:'Een foto van een lange weg die in de verte in één punt samenkomt, is een voorbeeld van…',o:['vluchtpuntperspectief','parallelperspectief','isometrisch','projectie'],a:0},
    {t:'mc',v:'Welke hoeken horen bij dimetrisch perspectief?',o:['7° en 42°','30° en 30°','45°','90°'],a:0},
    {t:'mc',v:'Hoeveel afmetingen heeft een 3D-tekening?',o:['3','2','1','4'],a:0},
    {t:'mc',v:'Wat teken je bij cavalière eerst?',o:['Het vooraanzicht op ware grootte','De dieptelijnen','Het vluchtpunt','Het bovenaanzicht'],a:0},
    {t:'jf',v:'Bij parallelperspectief blijven evenwijdige lijnen evenwijdig.',a:true},
    {t:'jf',v:'Bij isometrisch perspectief teken je de diepte half zo lang.',a:false,u:'Dat is bij cavalière. Bij isometrisch is alles op ware grootte.'},
    {t:'jf',v:'Schetsen doe je met een lat.',a:false,u:'Schetsen = uit de hand, zonder lat.'},
    {t:'invul',v:'Cavalièreperspectief teken je onder een hoek van … graden.',a:['45','45°']},
    {t:'open',v:'Leg het verschil uit tussen cavalière en isometrisch perspectief.',m:'Cavalière: vooraanzicht op ware grootte, diepte onder 45° en gehalveerd. Isometrisch: breedte en diepte onder 30° met de horizontale, alle maten op ware grootte, hoogte verticaal.'}
  ]
},
{
  id:'T4', vak:'tech', titel:'Projectietekenen, lijnsoorten en ontvouwing',
  bron: B('p. 21–26 en synthese p. 29'),
  samenvatting:[
    '<h4>📦 Europese projectie</h4><p>Een <b>projectiemethode</b> beeldt een ruimtelijk voorwerp af in een <b>plat vlak</b>. Bij de <b>Europese projectie</b> zet je het voorwerp in een <b>drievlakshoek</b>; vouw je die open, dan krijg je <b>drie aanzichten</b>.</p><div class="lp-tegels"><div><i>👀</i><b>VA</b><small>vooraanzicht: van voor<br>linksboven</small></div><div><i>👈</i><b>LA</b><small>linkeraanzicht: van links gezien<br><b>rechts</b> naast het VA</small></div><div><i>👆</i><b>BA</b><small>bovenaanzicht: van boven gezien<br><b>onder</b> het VA</small></div></div><p class="lp-tip">🧠 Europees = je kijkt vanuit links, maar je <b>tekent het rechts</b>; je kijkt van boven en <b>tekent het eronder</b>. (Het licht schijnt als het ware door het voorwerp op de muur erachter.)</p>',
    '<h4>📏 Welke maat zie je waar?</h4><table class="lp-ww"><tr><td>VA</td><td>lengte + hoogte</td><td></td></tr><tr><td>LA</td><td>breedte (diepte) + hoogte</td><td>zelfde hoogte als VA</td></tr><tr><td>BA</td><td>lengte + breedte (diepte)</td><td>zelfde lengte als VA</td></tr></table><p>Daarom liggen de aanzichten <b>netjes op één lijn</b>: hulplijnen van het VA naar rechts (hoogte) en naar beneden (lengte).</p>',
    '<h4>✒️ Lijnsoorten en voorrang</h4><table class="lp-ww lp-tijd"><tr><td>1 dikke volle lijn</td><td><b>zichtbare</b> figuurlijn</td></tr><tr><td>2 dunne streeplijn</td><td><b>onzichtbare</b> lijn (verborgen ribbe)</td></tr><tr><td>3 gemengde streeplijn (streep-punt)</td><td><b>symmetrie</b>- en <b>aslijnen</b></td></tr><tr><td>4 dunne volle lijn</td><td><b>maatlijn</b></td></tr></table><p class="lp-tip">⚖️ Vallen twee lijnsoorten samen? Dan teken je de lijn met de <b>hoogste voorrang</b> (kleinste nummer): zichtbaar wint van onzichtbaar, onzichtbaar wint van aslijn.</p>',
    '<h4>✂️ Ontvouwing</h4><p>Een <b>ontvouwing</b> is een soort werktekening waarbij je de <b>uitslag</b> van het voorwerp ziet: het voorwerp plat opengevouwen.</p><p class="lp-vb">Een kubus heeft een ontvouwing van <b>6 vierkanten</b> (bv. een kruis). Een balkvormig doosje: 6 rechthoeken, telkens 2 gelijke tegenover elkaar. Vergeet de <b>plakranden</b> niet als je hem wil plooien en lijmen!</p><p class="lp-tip">🔍 Herken je een ontvouwing? Vouw ze in gedachten dicht: komen er geen 2 vlakken op elkaar en sluit alles?</p>'
  ],
  kaarten:[
    ['Wat is een projectiemethode?','Een methode om een ruimtelijk voorwerp in een plat vlak af te beelden'],
    ['Welke 3 aanzichten krijg je bij de Europese projectie?','Vooraanzicht (VA), linkeraanzicht (LA) en bovenaanzicht (BA)'],
    ['Waar teken je het LA in de Europese projectie?','Rechts naast het vooraanzicht'],
    ['Waar teken je het BA in de Europese projectie?','Onder het vooraanzicht'],
    ['Wat betekent een dikke volle lijn?','Zichtbare figuurlijn'],
    ['Wat betekent een dunne streeplijn?','Onzichtbare lijn'],
    ['Wat betekent een gemengde streeplijn?','Symmetrie- of aslijn'],
    ['Wat betekent een dunne volle lijn?','Maatlijn'],
    ['Wat doe je als twee lijnsoorten samenvallen?','De voorrangsregel: de lijn met de hoogste voorrang (zichtbaar > onzichtbaar > as > maat)'],
    ['Wat is een ontvouwing?','Een werktekening die de uitslag van het voorwerp toont (plat opengevouwen)']
  ],
  quiz:[
    {t:'mc',v:'Waar staat het bovenaanzicht in de Europese projectie?',o:['Onder het vooraanzicht','Boven het vooraanzicht','Links van het vooraanzicht','Rechts van het vooraanzicht'],a:0},
    {t:'mc',v:'Waar staat het linkeraanzicht in de Europese projectie?',o:['Rechts van het vooraanzicht','Links van het vooraanzicht','Onder het vooraanzicht','Boven het vooraanzicht'],a:0},
    {t:'mc',v:'Welke lijn gebruik je voor een verborgen ribbe?',o:['dunne streeplijn','dikke volle lijn','gemengde streeplijn','dunne volle lijn'],a:0},
    {t:'mc',v:'Welke lijn gebruik je voor de as van een gat?',o:['gemengde streeplijn','dunne streeplijn','dikke volle lijn','geen lijn'],a:0},
    {t:'mc',v:'Een zichtbare lijn valt samen met een onzichtbare. Wat teken je?',o:['De dikke volle lijn','De streeplijn','Allebei naast elkaar','Niets'],a:0},
    {t:'mc',v:'Welke afmetingen zie je op het vooraanzicht?',o:['lengte en hoogte','lengte en breedte','breedte en hoogte','alle drie'],a:0},
    {t:'mc',v:'Welk aanzicht heeft dezelfde hoogte als het vooraanzicht?',o:['het linkeraanzicht','het bovenaanzicht','geen enkel','de ontvouwing'],a:0},
    {t:'mc',v:'Uit hoeveel vierkanten bestaat de ontvouwing van een kubus?',o:['6','4','8','12'],a:0},
    {t:'jf',v:'Een maatlijn teken je als dunne volle lijn.',a:true},
    {t:'jf',v:'Een ontvouwing is een ruimtelijke tekening.',a:false,u:'Een ontvouwing is plat: de uitslag van het voorwerp.'},
    {t:'invul',v:'Bij de Europese projectie zet je het voorwerp in een … (soort hoek).',a:['drievlakshoek']},
    {t:'open',v:'Noem de 4 lijnsoorten in volgorde van voorrang en zeg waarvoor elke lijn dient.',m:'1 dikke volle lijn: zichtbare figuurlijn · 2 dunne streeplijn: onzichtbare lijn · 3 gemengde streeplijn: symmetrie- en aslijn · 4 dunne volle lijn: maatlijn.'}
  ]
},
{
  id:'T5', vak:'tech', titel:'Technische systemen: IVU, energie, sensoren en actuatoren',
  bron: B('p. 36–51 (synthese p. 50–51!)', 'p. 10–11'),
  samenvatting:[
    '<h4>⚙️ Wat is een technisch systeem?</h4><p>Een <b>technisch systeem</b> is een systeem waarbij de verschillende <b>onderdelen samenwerken om een taak te vervullen</b>. Voorbeelden: broodrooster, wasmachine, smartphone, fiets met licht.</p>',
    '<h4>➡️ Het IVU-proces (IPO)</h4><div class="lp-ketting"><span>INVOER<small> input · via sensoren</small></span><i>→</i><span>VERWERKING<small> process · via omzetters</small></span><i>→</i><span>UITVOER<small> output · via actuatoren</small></span></div><p>Invoer en uitvoer kunnen bestaan uit <b>energie</b>, <b>materie</b> en/of <b>informatie</b>. Met een IVU-schema kan je ook <b>fouten opsporen</b>.</p><table class="lp-ww lp-tijd"><tr><td>broodrooster</td><td><b>I</b>: elektriciteit (energie), boterham (materie), knop/stand (informatie) · <b>V</b>: verwarmingselement roostert · <b>U</b>: warmte, geroosterde boterham, “plop” (informatie: klaar)</td></tr><tr><td>Senseo (choco)</td><td><b>I</b>: elektriciteit, chocopad + koud water, druktoets · <b>V</b>: programma, verwarmingselement, warm water over de pad · <b>U</b>: warmte, warme chocomelk + lege pad, LED licht op</td></tr></table>',
    '<h4>⚡ Energieomzettingen</h4><p>Energie kan <b>niet verdwijnen</b>, enkel <b>omgezet</b> worden. De <b>omzetter</b> (bv. een <b>weerstand / verwarmingselement</b>) zet elektriciteit om in een andere vorm.</p><table class="lp-ww"><tr><td>elektriciteit → warmte</td><td>verwarmingsweerstand</td><td>strijkijzer, boiler, kookplaat</td></tr><tr><td>elektriciteit → licht</td><td>lamp, LED</td><td></td></tr><tr><td>elektriciteit → beweging</td><td>elektromotor</td><td>drone, boormachine</td></tr><tr><td>elektriciteit → geluid</td><td>luidspreker</td><td></td></tr><tr><td>beweging → elektriciteit</td><td>dynamo</td><td>fietslicht</td></tr></table>',
    '<h4>✅ Nuttig of niet-nuttig?</h4><p><b>Nuttige energie</b> = de uitvoer in de <b>gewenste</b> vorm. <b>Niet-nuttige energie</b> (energieverlies) = uitvoer die <b>ongevraagd of ongewenst</b> is.</p><p class="lp-vb">Boormachine: 100 % elektriciteit → 80 % beweging (nuttig) + 20 % warmte (niet-nuttig)<br><b>Rendement</b> = nuttige energie : ingaande energie = 80/100 = <b>80 %</b><br>Oude gloeilamp: 10 % licht, 90 % warmte → rendement maar 10 %</p><p class="lp-tip">🖥️ Een pc wordt warm (processor, grafische kaart). De warmte wordt afgevoerd met <b>koelribben</b> en <b>ventilatoren</b>. Zelf: de luchtgaten <b>vrij</b> houden en de pc niet op een deken of in een gesloten kast zetten.</p>',
    '<h4>👁️ Sensoren en 💪 actuatoren</h4><div class="lp-vs"><div><b>Sensor = invoerorgaan</b>“voelt” iets en zorgt voor de <b>invoer</b><small>temperatuur-, druk-, licht-, vloeistof-, bewegingssensor</small></div><div><b>Actuator = uitvoerorgaan</b>zorgt voor de <b>actie</b> (uitvoer)<small>lamp, sirene, display, ventilator, elektromotor</small></div></div><p class="lp-vb">Smartphone: lichtsensor past de helderheid aan, nabijheidssensor zet het scherm uit aan je oor, de bewegingssensor draait het beeld.<br>Buitenlamp met bewegingssensor: iemand passeert (sensor) → lamp gaat aan (actuator).</p><p><b>Monteren</b> = deelsystemen en onderdelen in een vaste volgorde verbinden. <b>Demonteren</b> = uit elkaar halen, bv. om te herstellen.</p>'
  ],
  kaarten:[
    ['Wat is een technisch systeem?','Een systeem waarbij de verschillende onderdelen samenwerken om een taak te vervullen'],
    ['Waar staat IVU voor?','Invoer – Verwerking – Uitvoer (IPO: input – process – output)'],
    ['Uit welke 3 dingen kunnen invoer en uitvoer bestaan?','Energie, materie en informatie'],
    ['Wat is nuttige energie?','Uitvoer in de gewenste energievorm'],
    ['Wat is niet-nuttige energie?','Uitvoer die ongevraagd of ongewenst is (energieverlies)'],
    ['Wat is rendement?','De verhouding tussen de nuttige energie en de ingaande energie (in %)'],
    ['Welk onderdeel zet elektriciteit om in warmte?','Een verwarmingsweerstand (verwarmingselement)'],
    ['Wat is een sensor?','Een invoerorgaan: zorgt voor de invoer (bv. temperatuursensor)'],
    ['Wat is een actuator?','Een uitvoerorgaan: zorgt voor de actie (bv. elektromotor, lamp)'],
    ['Hoe wordt warmte in een pc afgevoerd?','Met koelribben en ventilatoren'],
    ['Wat is demonteren?','Een technisch systeem uit elkaar halen, bv. om te herstellen']
  ],
  quiz:[
    {t:'mc',v:'In een broodrooster is de boterham…',o:['materie (invoer)','informatie (invoer)','energie (uitvoer)','een actuator'],a:0},
    {t:'mc',v:'De knop van de broodrooster op stand 4 zetten is…',o:['informatie (invoer)','materie (invoer)','energie (uitvoer)','verwerking'],a:0},
    {t:'mc',v:'Welk toestel zet elektriciteit vooral om in beweging?',o:['drone','strijkijzer','boiler','kookplaat'],a:0},
    {t:'mc',v:'Welke van deze is een <b>actuator</b>?',o:['elektromotor','temperatuursensor','lichtsensor','druktoets'],a:0},
    {t:'mc',v:'Welke van deze is een <b>sensor</b>?',o:['bewegingssensor van een buitenlamp','sirene','display','ventilator'],a:0},
    {t:'mc',v:'Een boormachine: 100 % elektriciteit, 80 % beweging, 20 % warmte. Wat is het rendement?',o:['80 %','20 %','100 %','120 %'],a:0},
    {t:'mc',v:'Bij een gloeilamp is de warmte…',o:['niet-nuttige energie','nuttige energie','informatie','materie'],a:0},
    {t:'mc',v:'Bij een strijkijzer is de warmte…',o:['nuttige energie','niet-nuttige energie','informatie','energieverlies'],a:0},
    {t:'mc',v:'Hoe voorkom je dat je pc te warm wordt?',o:['De luchtgaten vrijhouden zodat de ventilator warmte kan afvoeren','Hem op een deken zetten','De ventilator afplakken','Hem in een gesloten kast zetten'],a:0},
    {t:'jf',v:'Energie kan verdwijnen.',a:false,u:'Energie kan enkel omgezet worden in andere vormen.'},
    {t:'jf',v:'Een verwarmingsweerstand zet elektriciteit om in warmte.',a:true},
    {t:'jf',v:'Een sensor zorgt voor de actie (uitvoer).',a:false,u:'Dat is een actuator. Een sensor zorgt voor de invoer.'},
    {t:'invul',v:'Een uitvoerorgaan dat voor de actie zorgt, noem je een … .',a:['actuator']},
    {t:'open',v:'Maak een IVU-schema van een wasmachine (energie, materie, informatie).',m:'Invoer: elektriciteit, water, vuile was + waspoeder, programma kiezen. Verwerking: verwarmingselement warmt water op, motor draait de trommel, programma wordt doorlopen. Uitvoer: warmte en beweging, schone (natte) was + vuil water, lampje/scherm “klaar”.'}
  ]
}
);
})();
