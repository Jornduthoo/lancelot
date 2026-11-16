// Nederlands (1Aa) — examen di 15/12, 10u25–12u05. Leerstof volgens het examenoverzicht trimester 1.
// Het handboek zelf zat niet in de map: de uitleg volgt het overzicht ("wat moet je kennen / kunnen").
(function(){
const OV = 'https://drive.google.com/file/d/1jXbOHTXanUNHV0qWf-WG-a8KTI4eyjgN/view';
const B = p => [['Examenoverzicht · in je handboek ' + p + ' (blauwe kaders = KENNEN)', OV]];
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
// ---------------------------------------------------------------- DEEL BSA + DEEL 1
{
  id:'N1', vak:'ned', titel:'Woordstrategieën: wat betekent dat woord?',
  bron: B('p. 12–17'),
  samenvatting:[
    '<h4>🤔 Een woord dat je niet kent?</h4><p>Niet meteen stoppen met lezen! Met een <b>woordstrategie</b> raad je zelf de betekenis. Je kent er <b>4</b>:</p><div class="lp-tegels k2"><div><i>🔎</i><b>1. kijk rond het woord</b><small>de zin en de tekst ervoor en erna (de context)</small></div><div><i>✂️</i><b>2. knip het woord in stukjes</b><small>ken je een deel? skate|park|wachter</small></div><div><i>👯</i><b>3. lijkt het op een woord dat je kent?</b><small>ook uit het Frans of Engels</small></div><div><i>📖</i><b>4. zoek het op of vraag het</b><small>woordenboek, internet, iemand</small></div></div>',
    '<h4>🔎 1. De context gebruiken</h4><p>Lees de zin opnieuw, en ook de zin ervoor en erna. Vaak staat er een <b>uitleg</b>, een <b>voorbeeld</b> of een <b>tegenstelling</b> in.</p><p class="lp-vb">Thor had een <b>zeldzaam</b> figuurtje: er bestonden er maar tien van in heel België.<br>→ “maar tien van” vertelt je: <b>zeldzaam = er zijn er heel weinig</b>.</p>',
    '<h4>✂️ 2. Het woord opdelen</h4><p>Lange woorden zijn vaak <b>samengesteld</b> uit woorden die je wél kent, of hebben een <b>voor- of achtervoegsel</b>.</p><table class="lp-ww lp-tijd"><tr><td>verzamel|woede</td><td>woede (drang) om te verzamelen</td></tr><tr><td>on|breek|baar</td><td>on = niet, -baar = kan → kan <b>niet</b> breken</td></tr><tr><td>skate|wedstrijd</td><td>een wedstrijd in skaten</td></tr></table>',
    '<h4>👯 3. Lijkt het op iets dat je kent?</h4><p>Het woord lijkt op een woord uit het Nederlands of uit een <b>andere taal</b>.</p><p class="lp-vb"><b>vintage</b> lijkt op het Engelse “vintage” (oud en waardevol)<br><b>collectie</b> lijkt op “collect” en het Franse “collection” → verzameling</p>',
    '<h4>📖 4. Opzoeken of vragen</h4><p>Lukt het niet met 1, 2 of 3? Zoek het woord op in het <b>woordenboek</b> (of online) of <b>vraag</b> het aan iemand.</p><p class="lp-tip">💡 Volgorde: eerst <b>zelf raden</b> (1–2–3), dan pas opzoeken (4). Op het examen heb je geen woordenboek: dan moet je het met 1, 2 en 3 doen! Kijk na het raden altijd of de betekenis <b>past in de zin</b>.</p>'
  ],
  kaarten:[
    ['Wat is een woordstrategie?','Een manier om zelf de betekenis van een onbekend woord te achterhalen'],
    ['Welke 4 woordstrategieën ken je?','1. kijken naar de context (zin en tekst rond het woord) · 2. het woord opdelen in stukjes · 3. vergelijken met een woord dat je kent (ook uit een andere taal) · 4. opzoeken of vragen'],
    ['Wat is de context van een woord?','De zinnen en de tekst rond het woord'],
    ['Welke hints kan de context geven?','Een uitleg, een voorbeeld of een tegenstelling'],
    ['Welke strategie gebruik je bij “onvergetelijk”?','Het woord opdelen: on (niet) + vergeten + -lijk → wat je niet kan vergeten'],
    ['Welke strategie gebruik je best het laatst?','Opzoeken in een woordenboek of het vragen aan iemand'],
    ['Wat controleer je altijd na het raden?','Of de betekenis die je bedacht past in de zin'],
    ['Wat betekent het voorvoegsel “on-” meestal?','Niet (onmogelijk = niet mogelijk)'],
    ['Wat betekent het achtervoegsel “-baar”?','Dat iets kan (eetbaar = kan gegeten worden)'],
  ],
  quiz:[
    {t:'mc',v:'“Het skatepark was <b>overvol</b>: je kon er geen meter rijden.” Welke strategie helpt je hier het best?',o:['Kijken naar de context','Opzoeken in het woordenboek','Vergelijken met het Frans','Geen enkele'],a:0},
    {t:'mc',v:'Je ziet het woord “speelgoedverzamelaar”. Welke strategie ligt voor de hand?',o:['Het woord opdelen in stukjes','Het vergelijken met het Engels','Het meteen opzoeken','Het overslaan'],a:0},
    {t:'mc',v:'“Hij kocht een <b>action figure</b> uit 1985.” Welke strategie gebruik je?',o:['Vergelijken met een woord uit een andere taal','Het woord opdelen in voor- en achtervoegsels','Een tegenstelling zoeken','Vragen aan de leerkracht tijdens het examen'],a:0},
    {t:'mc',v:'“Het figuurtje was niet nieuw maar <b>tweedehands</b>.” Welke hint geeft de context?',o:['Een tegenstelling (niet nieuw maar …)','Een voorbeeld','Een opsomming','Geen hint'],a:0},
    {t:'mc',v:'Wat betekent “onbetaalbaar”?',o:['Zo duur dat je het niet kan betalen','Gratis','Al betaald','Goedkoop'],a:0},
    {t:'mc',v:'Welke strategie gebruik je pas als de andere niet lukken?',o:['Opzoeken of vragen','Kijken naar de context','Het woord opdelen','Vergelijken met een woord dat je kent'],a:0},
    {t:'jf',v:'Als je een woord niet kent, stop je best meteen met lezen.',a:false,u:'Lees verder en probeer met een woordstrategie de betekenis te raden.'},
    {t:'jf',v:'Ook woorden uit het Frans of Engels kunnen je helpen om een Nederlands woord te begrijpen.',a:true},
    {t:'jf',v:'Na het raden van een betekenis kijk je of die past in de zin.',a:true},
    {t:'invul',v:'De zinnen en de tekst rond een woord noem je de … .',a:['context']},
    {t:'open',v:'Noem de 4 woordstrategieën.',m:'1. kijken naar de context · 2. het woord opdelen in stukjes · 3. vergelijken met een woord dat je kent (ook uit een andere taal) · 4. opzoeken of vragen.'}
  ]
},
{
  id:'N2', vak:'ned', titel:'Teksttype, tekstsoort en tekstdoel',
  bron: B('p. 26–31'),
  samenvatting:[
    '<h4>🧩 Drie woorden die op elkaar lijken</h4><div class="lp-tegels"><div><i>🎯</i><b>tekstdoel</b><small><u>waarom</u> schreef de schrijver de tekst?</small></div><div><i>🗂️</i><b>teksttype</b><small>de grote <u>groep</u> waartoe de tekst hoort</small></div><div><i>📰</i><b>tekstsoort</b><small>de <u>concrete vorm</u>: recept, strip, krantenartikel…</small></div></div>',
    '<h4>🎯 Tekstdoel ↔ teksttype</h4><p>Elk teksttype hoort bij een tekstdoel:</p><table class="lp-ww lp-tijd"><tr><td>📘 informatieve tekst</td><td>doel: <b>informeren</b> (je iets laten weten)<br><small class="muted">nieuwsbericht, folder, schoolboek, weerbericht</small></td></tr><tr><td>🛠️ instructieve tekst</td><td>doel: <b>instrueren</b> (je iets laten doen)<br><small class="muted">recept, handleiding, spelregels, routebeschrijving</small></td></tr><tr><td>📣 overtuigende tekst</td><td>doel: <b>overtuigen</b> (je mening of gedrag veranderen)<br><small class="muted">reclame, lezersbrief, affiche “stop pesten”</small></td></tr><tr><td>📚 verhalende tekst</td><td>doel: <b>ontspannen</b> (amuseren, je laten genieten)<br><small class="muted">jeugdboek, strip, sprookje, mop, gedicht</small></td></tr></table>',
    '<h4>📰 Tekstsoort</h4><p>De tekstsoort is de <b>vorm</b> van de tekst die je meteen herkent: een <b>recept</b>, een <b>sms</b>, een <b>affiche</b>, een <b>krantenartikel</b>, een <b>strip</b>, een <b>handleiding</b>…</p><p class="lp-vb">Een <b>handleiding</b> voor een skateboard (= tekstsoort) is een <b>instructieve tekst</b> (= teksttype) met als doel <b>instrueren</b> (= tekstdoel).</p>',
    '<h4>🕵️ Hoe herken je het doel?</h4><div class="lp-stroom"><div><span>“doe dit, neem dat”, stappen, gebiedende wijs</span><b>instrueren</b></div><div><span>“koop nu!”, “je moet…”, meningen, argumenten</span><b>overtuigen</b></div><div><span>feiten, cijfers, wie-wat-waar-wanneer</span><b>informeren</b></div><div><span>personages, spanning, humor, een verhaal</span><b>ontspannen</b></div></div><p class="lp-tip">💡 Een tekst kan soms 2 doelen hebben (een grappige reclame amuseert én overtuigt). Kies dan het <b>belangrijkste</b> doel: wat wil de schrijver dat jij uiteindelijk doet of weet?</p>'
  ],
  kaarten:[
    ['Wat is het tekstdoel?','De reden waarom de schrijver de tekst schreef'],
    ['Wat is een tekstsoort?','De concrete vorm van een tekst, bv. recept, strip, krantenartikel, affiche'],
    ['Welke 4 teksttypes ken je?','Informatief, instructief, overtuigend en verhalend'],
    ['Welk doel heeft een informatieve tekst?','Informeren: de lezer iets laten weten'],
    ['Welk doel heeft een instructieve tekst?','Instrueren: de lezer iets laten doen'],
    ['Welk doel heeft een overtuigende tekst?','Overtuigen: de mening of het gedrag van de lezer veranderen'],
    ['Welk doel heeft een verhalende tekst?','Ontspannen: amuseren, de lezer laten genieten'],
    ['Geef 3 voorbeelden van instructieve tekstsoorten.','Bv. recept, handleiding, spelregels, routebeschrijving'],
    ['Wat doe je als een tekst 2 doelen heeft?','Je kiest het belangrijkste doel'],
  ],
  quiz:[
    {t:'mc',v:'De spelregels van een bordspel. Welk teksttype?',o:['Instructief','Informatief','Overtuigend','Verhalend'],a:0},
    {t:'mc',v:'Een reclamefolder: “Nu -50% op alle skateboards! Kom snel!” Welk tekstdoel?',o:['Overtuigen','Informeren','Instrueren','Ontspannen'],a:0},
    {t:'mc',v:'Een krantenartikel over een nieuw skatepark in Gent. Welk tekstdoel?',o:['Informeren','Instrueren','Ontspannen','Overtuigen'],a:0},
    {t:'mc',v:'Een strip van Kiekeboe. Welk teksttype?',o:['Verhalend','Informatief','Instructief','Overtuigend'],a:0},
    {t:'mc',v:'“Recept” is een voorbeeld van een…',o:['tekstsoort','tekstdoel','teksttype','leesstrategie'],a:0},
    {t:'mc',v:'Een affiche van de school: “Laat je gsm in je zak tijdens de les!” Welk doel?',o:['Overtuigen','Ontspannen','Informeren','Geen doel'],a:0},
    {t:'mc',v:'Een weerbericht. Welk teksttype?',o:['Informatief','Instructief','Verhalend','Overtuigend'],a:0},
    {t:'mc',v:'De uitleg “Zo maak je een ollie in 5 stappen”. Welk doel?',o:['Instrueren','Informeren','Ontspannen','Overtuigen'],a:0},
    {t:'jf',v:'Een sprookje is een informatieve tekst.',a:false,u:'Een sprookje is verhalend: het doel is ontspannen.'},
    {t:'jf',v:'Een tekstsoort is de concrete vorm van de tekst, zoals een sms of een affiche.',a:true},
    {t:'invul',v:'Een tekst die je iets wil laten <b>doen</b> heeft als doel … .',a:['instrueren']},
    {t:'open',v:'Een handleiding van een spelconsole: geef de tekstsoort, het teksttype en het tekstdoel.',m:'Tekstsoort: handleiding · teksttype: instructief · tekstdoel: instrueren.'}
  ]
},
{
  id:'N3', vak:'ned', titel:'Leesstrategieën: hoe lees je?',
  bron: B('p. 31–39'),
  samenvatting:[
    '<h4>📖 Niet elke tekst lees je op dezelfde manier</h4><p>Je kiest een <b>leesstrategie</b> die past bij je <b>leesdoel</b>: wat wil je met de tekst doen?</p><div class="lp-ketting"><span>🔮 voorspellend</span><i>→</i><span>🧭 oriënterend</span><i>→</i><span>🌍 globaal</span><i>→</i><span>🔦 zoekend</span><i>→</i><span>🔬 intensief</span></div><p>En dan is er nog <b>😌 genietend</b> lezen: gewoon voor je plezier.</p>',
    '<h4>🔮 Voorspellend lezen</h4><p>Je kijkt naar de <b>titel</b>, de <b>tussentitels</b>, de <b>foto’s</b> en de <b>bron</b>, en je <b>voorspelt</b> waarover de tekst zal gaan, <u>vóór</u> je begint te lezen.</p><h4>🧭 Oriënterend lezen</h4><p>Je <b>bekijkt de tekst snel</b> (titel, inleiding, tussentitels, vet gedrukte woorden) om te weten <b>of de tekst nuttig is</b> voor jou.</p>',
    '<h4>🌍 Globaal lezen</h4><p>Je leest de hele tekst <b>één keer vlot</b> om te weten <b>waarover hij gaat</b> (het onderwerp en de grote lijn). Details zijn niet belangrijk.</p><h4>🔦 Zoekend lezen</h4><p>Je zoekt <b>één bepaalde informatie</b>: een datum, een prijs, een naam. Je <b>scant</b> de tekst met je ogen tot je het vindt. De rest lees je niet.</p>',
    '<h4>🔬 Intensief lezen</h4><p>Je leest de tekst <b>grondig, zin per zin</b>, soms meerdere keren. Je wil <b>alles begrijpen en onthouden</b>. Je duidt aan, zoekt moeilijke woorden op en maakt een schema. Zo lees je bv. je <b>leerstof</b> of een <b>examenvraag</b>.</p><h4>😌 Genietend lezen</h4><p>Je leest <b>voor je plezier</b>: een strip, een spannend boek. Tempo en manier kies je zelf.</p>',
    '<h4>🗺️ Welke strategie wanneer?</h4><table class="lp-ww lp-tijd"><tr><td>Waarover zal dit gaan? (nog niet gelezen)</td><td>🔮 voorspellend</td></tr><tr><td>Heb ik iets aan deze tekst?</td><td>🧭 oriënterend</td></tr><tr><td>Waarover gaat de tekst?</td><td>🌍 globaal</td></tr><tr><td>Hoe laat begint de beurs?</td><td>🔦 zoekend</td></tr><tr><td>Ik moet het kennen en uitleggen</td><td>🔬 intensief</td></tr><tr><td>Lekker lezen in de zetel</td><td>😌 genietend</td></tr></table>'
  ],
  kaarten:[
    ['Welke leesstrategieën ken je?','Voorspellend, oriënterend, globaal, zoekend, intensief en genietend lezen'],
    ['Wat doe je bij voorspellend lezen?','Vóór het lezen naar titel, tussentitels, foto’s en bron kijken en voorspellen waarover de tekst gaat'],
    ['Wat doe je bij oriënterend lezen?','De tekst snel bekijken om te weten of hij nuttig is voor jou'],
    ['Wat doe je bij globaal lezen?','De hele tekst één keer vlot lezen om te weten waarover hij gaat'],
    ['Wat doe je bij zoekend lezen?','Gericht één bepaalde informatie zoeken (scannen), de rest lees je niet'],
    ['Wat doe je bij intensief lezen?','Grondig zin per zin lezen om alles te begrijpen en te onthouden'],
    ['Wat is genietend lezen?','Lezen voor je plezier'],
    ['Welke strategie gebruik je om te studeren?','Intensief lezen'],
    ['Waarvan hangt je leesstrategie af?','Van je leesdoel: wat wil je met de tekst doen?'],
  ],
  quiz:[
    {t:'mc',v:'Je zoekt in het programma van de verzamelbeurs hoe laat de deuren opengaan. Welke strategie?',o:['Zoekend lezen','Intensief lezen','Genietend lezen','Globaal lezen'],a:0},
    {t:'mc',v:'Je bekijkt enkel de titel en de foto en denkt: “Dit gaat over een skatewedstrijd.” Welke strategie?',o:['Voorspellend lezen','Zoekend lezen','Intensief lezen','Genietend lezen'],a:0},
    {t:'mc',v:'Je leert je samenvatting Nederlands voor het examen. Welke strategie?',o:['Intensief lezen','Oriënterend lezen','Zoekend lezen','Voorspellend lezen'],a:0},
    {t:'mc',v:'Je bladert door 5 artikels om te zien welke bruikbaar zijn voor je spreekbeurt. Welke strategie?',o:['Oriënterend lezen','Genietend lezen','Intensief lezen','Voorspellend lezen'],a:0},
    {t:'mc',v:'Je leest een artikel één keer door om te weten waarover het gaat. Welke strategie?',o:['Globaal lezen','Zoekend lezen','Intensief lezen','Voorspellend lezen'],a:0},
    {t:'mc',v:'Je leest in bed een stripverhaal. Welke strategie?',o:['Genietend lezen','Intensief lezen','Zoekend lezen','Oriënterend lezen'],a:0},
    {t:'mc',v:'Wat doe je NIET bij zoekend lezen?',o:['De hele tekst grondig lezen','Je ogen over de tekst laten glijden','Letten op een sleutelwoord','Stoppen als je het antwoord vindt'],a:0},
    {t:'jf',v:'Bij voorspellend lezen heb je de tekst al helemaal gelezen.',a:false,u:'Je voorspelt vóór je leest, op basis van titel, foto’s en tussentitels.'},
    {t:'jf',v:'Bij intensief lezen mag je dingen aanduiden en een schema maken.',a:true},
    {t:'invul',v:'Snel een tekst bekijken om te weten of hij nuttig is, heet … lezen.',a:['oriënterend','orienterend']},
    {t:'open',v:'Je moet op het examen een vraag beantwoorden over een tekst. Welke 2 leesstrategieën gebruik je, en hoe?',m:'Eerst globaal lezen (waarover gaat de tekst?), dan zoekend lezen om het stuk te vinden dat bij de vraag hoort, en dat stuk intensief lezen.'}
  ]
},
{
  id:'N4', vak:'ned', titel:'Hoofd- en bijzaken',
  bron: B('p. 40–46'),
  samenvatting:[
    '<h4>🏗️ De bouw van een tekst</h4><div class="lp-stroom"><div><span>zegt waarover de tekst gaat, maakt je nieuwsgierig</span><b>inleiding</b></div><div><span>de uitleg, de informatie, de argumenten</span><b>midden</b></div><div><span>besluit, samenvatting of afsluiter</span><b>slot</b></div></div>',
    '<h4>🧱 De alinea</h4><p>Een <b>alinea</b> is een stukje tekst over <b>één deelonderwerp</b>. Je herkent een nieuwe alinea aan:</p><ul><li>een <b>witregel</b> (een lege regel ertussen), of</li><li>een nieuwe regel die <b>inspringt</b>.</li></ul><p>Elke alinea heeft meestal één <b>kernzin</b>: de zin die het belangrijkste van die alinea zegt (vaak de <b>eerste</b> of de <b>laatste</b> zin).</p>',
    '<h4>🎯 Hoofdgedachte · hoofdpunten · bijzaken</h4><table class="lp-ww lp-tijd"><tr><td>🎯 hoofdgedachte</td><td>de <b>belangrijkste boodschap</b> van de hele tekst, in <b>één zin</b></td></tr><tr><td>📌 hoofdpunten</td><td>de belangrijke punten die de hoofdgedachte <b>uitwerken</b> (meestal één per alinea)</td></tr><tr><td>🪶 bijzaken</td><td><b>details</b>: voorbeelden, getallen, vergelijkingen, grapjes. Leuk, maar je mag ze <b>weglaten</b> zonder dat de boodschap verandert</td></tr></table>',
    '<h4>🧪 De weglaattest</h4><p>Twijfel je of iets een hoofdpunt of een bijzaak is? <b>Laat het weg</b> in gedachten.</p><div class="lp-vs"><div><b>Boodschap verandert?</b>→ het was een <u>hoofdpunt</u></div><div><b>Boodschap blijft dezelfde?</b>→ het was een <u>bijzaak</u></div></div><p class="lp-vb">“Skaten is een echte sport. <i>Thor oefende gisteren 3 uur.</i> Je traint je evenwicht, je kracht en je durf.”<br>De zin over Thor is een <b>voorbeeld</b> → bijzaak.</p>',
    '<h4>🗂️ Hoofdpunten in een schema</h4><p>Op het examen krijg je soms een <b>schema</b> om in te vullen. Zet de <b>hoofdgedachte bovenaan</b> en per vakje <b>één hoofdpunt</b>, kort (geen hele zinnen, geen voorbeelden).</p><p class="lp-tip">💡 Werkwijze: 1. lees globaal · 2. nummer de alinea’s · 3. zoek per alinea de kernzin (fluo <b>geel</b>) · 4. hoofdgedachte = wat hebben alle hoofdpunten samen te zeggen? (fluo <b>groen</b>) · 5. vul het schema in.</p>'
  ],
  kaarten:[
    ['Uit welke 3 delen bestaat een tekst?','Inleiding, midden en slot'],
    ['Wat doet de inleiding?','Zegt waarover de tekst gaat en maakt de lezer nieuwsgierig'],
    ['Wat is een alinea?','Een stukje tekst over één deelonderwerp'],
    ['Hoe herken je een nieuwe alinea?','Aan een witregel of aan een regel die inspringt'],
    ['Wat is de hoofdgedachte?','De belangrijkste boodschap van de hele tekst, in één zin'],
    ['Wat zijn hoofdpunten?','De belangrijke punten die de hoofdgedachte uitwerken, meestal één per alinea'],
    ['Wat zijn bijzaken? Geef voorbeelden.','Details die je kan weglaten zonder dat de boodschap verandert: voorbeelden, getallen, vergelijkingen, grapjes'],
    ['Wat is de weglaattest?','Laat een stuk weg: verandert de boodschap, dan is het een hoofdpunt; blijft ze dezelfde, dan is het een bijzaak'],
    ['Waar staat de kernzin van een alinea meestal?','Vaak in de eerste of de laatste zin'],
  ],
  quiz:[
    {t:'mc',v:'Wat is een witregel?',o:['Een lege regel tussen twee alinea’s','De eerste zin van de tekst','Een zin in het vet','De titel'],a:0},
    {t:'mc',v:'“Vintage speelgoed wordt steeds meer waard. <i>Een He-Man uit 1982 bracht vorig jaar € 400 op.</i>” Wat is de schuine zin?',o:['Een bijzaak (voorbeeld)','De hoofdgedachte','Een hoofdpunt','De inleiding'],a:0},
    {t:'mc',v:'Welk deel van de tekst geeft een besluit of samenvatting?',o:['Het slot','De inleiding','Het midden','De titel'],a:0},
    {t:'mc',v:'Waarin staan de meeste informatie en uitleg?',o:['Het midden','De inleiding','Het slot','De tussentitel'],a:0},
    {t:'mc',v:'Wat is GEEN bijzaak?',o:['Het belangrijkste punt van een alinea','Een getal als voorbeeld','Een grappige vergelijking','Een extra detail'],a:0},
    {t:'mc',v:'Hoeveel zinnen is de hoofdgedachte meestal?',o:['Eén','Eén per alinea','Drie','Zoveel als er hoofdpunten zijn'],a:0},
    {t:'jf',v:'Als je een bijzaak weglaat, verandert de boodschap van de tekst.',a:false,u:'Net niet: een bijzaak kan je weglaten zonder dat de boodschap verandert.'},
    {t:'jf',v:'Een alinea gaat over één deelonderwerp.',a:true},
    {t:'jf',v:'In een schema met hoofdpunten zet je ook alle voorbeelden.',a:false,u:'Voorbeelden zijn bijzaken: die laat je weg.'},
    {t:'invul',v:'De belangrijkste boodschap van de hele tekst is de … .',a:['hoofdgedachte']},
    {t:'open',v:'Hoe vind je de hoofdgedachte van een tekst? Leg de stappen uit.',m:'Globaal lezen, alinea’s nummeren, per alinea de kernzin/het hoofdpunt zoeken, en dan bekijken wat alle hoofdpunten samen zeggen: dat is de hoofdgedachte (één zin).'}
  ]
},
{
  id:'N5', vak:'ned', titel:'Iemand beschrijven',
  bron: B('p. 47–54 + woordenlijst'),
  samenvatting:[
    '<h4>🧑‍🎨 Een goede persoonsbeschrijving</h4><p>Je beschrijft iemand zo <b>nauwkeurig</b> dat de lezer hem voor zich <b>ziet</b> en hem <b>leert kennen</b>. Je gebruikt 2 soorten kenmerken:</p><div class="lp-vs"><div><b>👀 uiterlijke kenmerken</b>wat je <u>ziet</u><small>lengte, gestalte, haar, ogen, gezicht, kleding, opvallende dingen</small></div><div><b>💭 karaktereigenschappen</b>hoe iemand <u>is</u><small>behulpzaam, koppig, grappig, verlegen…</small></div></div>',
    '<h4>🔝 Van boven naar onder, van algemeen naar detail</h4><div class="lp-ketting"><span>algemeen: leeftijd, lengte, gestalte</span><i>→</i><span>hoofd: haar, ogen, gezicht</span><i>→</i><span>kleding</span><i>→</i><span>opvallend</span><i>→</i><span>karakter</span></div><p class="lp-vb">Thor is 12 jaar, slank en vrij groot. Hij heeft kort bruin haar met een slag erin en lichtbruine ogen. Meestal draagt hij een groene beanie, een ruime hoodie en versleten skateschoenen. Hij is <b>avontuurlijk</b>: geen trap is te hoog om eraf te springen.</p>',
    '<h4>💡 Toon het met een voorbeeld</h4><p>Zeg niet alleen <i>dat</i> iemand iets is, maar <b>bewijs het</b> met wat hij doet:</p><p class="lp-vb">“Moemoe is lief” ➜ “Moemoe staat altijd klaar met een koekje en een knuffel als het tegenzit.”</p>',
    '<h4>🌡️ Gevoelswaarde van woorden</h4><p>Woorden met <b>dezelfde betekenis</b> kunnen een <b>ander gevoel</b> geven:</p><table class="lp-ww lp-tijd"><tr><td>🙂 positief</td><td>slank · spaarzaam · vastberaden · nieuwsgierig</td></tr><tr><td>😐 neutraal</td><td>dun · zuinig · volhoudend · benieuwd</td></tr><tr><td>🙁 negatief</td><td>mager · gierig · koppig · bemoeiziek</td></tr></table><p class="lp-tip">⚠️ Wees <b>voorzichtig</b> als je iemand beschrijft: kies woorden die niet <b>kwetsen</b>. “Stevig gebouwd” klinkt beter dan “dik”. Wat je zegt over iemand, kan pijn doen.</p>'
  ],
  kaarten:[
    ['Welke 2 soorten kenmerken gebruik je om iemand te beschrijven?','Uiterlijke kenmerken en karaktereigenschappen'],
    ['Wat zijn uiterlijke kenmerken?','Wat je ziet: lengte, gestalte, haar, ogen, gezicht, kleding, opvallende dingen'],
    ['Wat zijn karaktereigenschappen?','Hoe iemand is: bv. behulpzaam, grappig, verlegen, koppig'],
    ['In welke volgorde beschrijf je het uiterlijk?','Van algemeen naar detail, van boven naar onder (algemeen → hoofd → kleding → opvallend)'],
    ['Hoe maak je een karaktereigenschap duidelijk?','Met een voorbeeld van wat de persoon doet'],
    ['Wat is de gevoelswaarde van een woord?','Het gevoel dat een woord geeft: positief, neutraal of negatief'],
    ['Geef een positief en een negatief woord voor “dun”.','Positief: slank · negatief: mager'],
    ['Geef een positief en een negatief woord voor “zuinig”.','Positief: spaarzaam · negatief: gierig'],
    ['Waarom moet je voorzichtig zijn als je iemand beschrijft?','Woorden kunnen kwetsen: kies woorden met een positieve of neutrale gevoelswaarde'],
  ],
  quiz:[
    {t:'mc',v:'Welk woord is een karaktereigenschap?',o:['behulpzaam','krullend','gespierd','sproeterig'],a:0},
    {t:'mc',v:'Welk woord is een uiterlijk kenmerk?',o:['gespierd','eerlijk','lui','nieuwsgierig'],a:0},
    {t:'mc',v:'Welk woord heeft een negatieve gevoelswaarde?',o:['gierig','spaarzaam','zuinig','economisch'],a:0},
    {t:'mc',v:'Welk woord heeft een positieve gevoelswaarde?',o:['slank','mager','graatmager','vel over been'],a:0},
    {t:'mc',v:'Wat is de beste volgorde bij een beschrijving van het uiterlijk?',o:['Algemeen → hoofd → kleding → opvallend','Kleding → schoenen → haar','Karakter → schoenen → ogen','Willekeurig'],a:0},
    {t:'mc',v:'Welke zin toont het best dat Boeboe grappig is?',o:['Boeboe vertelt aan tafel een mop, en iedereen ligt dubbel.','Boeboe is grappig.','Boeboe heeft een bril.','Boeboe is heel grappig echt waar.'],a:0},
    {t:'mc',v:'“Hij is <b>koppig</b>.” Welk woord zegt ongeveer hetzelfde, maar positiever?',o:['vastberaden','eigenwijs','stijfhoofdig','dwars'],a:0},
    {t:'jf',v:'Een persoonsbeschrijving bevat enkel uiterlijke kenmerken.',a:false,u:'Ook karaktereigenschappen horen erbij.'},
    {t:'jf',v:'“Nieuwsgierig” en “bemoeiziek” hebben ongeveer dezelfde betekenis maar een andere gevoelswaarde.',a:true},
    {t:'invul',v:'Woorden met dezelfde betekenis kunnen een andere … hebben (positief, neutraal, negatief).',a:['gevoelswaarde']},
    {t:'open',v:'Beschrijf iemand uit je familie in 4 zinnen: 2 over het uiterlijk, 1 karaktereigenschap met een voorbeeld en let op de gevoelswaarde.',m:'Bv.: Papa is groot en gespierd. Hij heeft kort donker haar en draagt graag een regenboogpet. Hij is heel sportief: elke ochtend gaat hij lopen, ook als het regent. (Uiterlijk van algemeen naar detail, karakter bewezen met een voorbeeld, geen kwetsende woorden.)'}
  ]
},
{
  id:'N6', vak:'ned', titel:'Lidwoord, zelfstandig en bijvoeglijk naamwoord',
  bron: B('p. 55–62'),
  samenvatting:[
    '<h4>🔤 Drie woordsoorten</h4><div class="lp-tegels"><div><i>🏷️</i><b>lidwoord</b><small>de · het · een</small></div><div><i>📦</i><b>zelfstandig naamwoord</b><small>een ding, persoon, dier, plaats, gevoel</small></div><div><i>🎨</i><b>bijvoeglijk naamwoord</b><small>zegt hoe iets is</small></div></div><p class="lp-vb"><b>het</b> <i>oude</i> <u>skateboard</u> · <b>een</b> <i>zeldzame</i> <u>actiefiguur</u><br><b>lidwoord</b> · <i>bijvoeglijk nw</i> · <u>zelfstandig nw</u></p>',
    '<h4>🏷️ Het lidwoord</h4><table class="lp-ww lp-tijd"><tr><td>bepaald</td><td><b>de</b>, <b>het</b> → een bepaald, gekend ding (de skater, het park)</td></tr><tr><td>onbepaald</td><td><b>een</b> → om het even welk ding (een skater)</td></tr></table>',
    '<h4>📦 Het zelfstandig naamwoord</h4><p>Test: kan je er <b>de, het</b> of <b>een</b> voor zetten? Dan is het een zelfstandig naamwoord. Ook dingen die je niet kan aanraken: <b>de moed, het geluk</b>.</p><div class="lp-vs"><div><b>soortnaam</b>een <u>gewone</u> naam voor een soort<small>jongen, stad, hond, worstelaar → kleine letter</small></div><div><b>eigennaam</b>de naam van <u>één bepaald</u> iets of iemand<small>Thor, Brugge, Bobby, Kerstmis → hoofdletter</small></div></div>',
    '<h4>🎨 Het bijvoeglijk naamwoord</h4><p>Zegt <b>hoe</b> iets of iemand is. Het staat <b>vóór</b> het zelfstandig naamwoord (de <i>snelle</i> skater) of na een werkwoord als zijn, worden, lijken (de skater is <i>snel</i>).</p><h4>➕ Verbuigen: wanneer komt er een -e bij?</h4><table class="lp-ww lp-tijd"><tr><td>bijna altijd</td><td>+<b>e</b>: de <b>oude</b> pop, een <b>coole</b> truc, <b>mooie</b> figuren</td></tr><tr><td><b>géén -e</b> bij</td><td><b>een + het-woord</b> (enkelvoud): een <b>oud</b> boek, een <b>groot</b> park<br>(maar: <b>het</b> ou<b>de</b> boek!)</td></tr><tr><td>na zijn/worden</td><td>geen -e: het park is <b>groot</b></td></tr></table><p class="lp-tip">✍️ Spelling bij de -e: <b>groot → grote</b> (klinker niet verdubbelen in open lettergreep), <b>dik → dikke</b> (medeklinker verdubbelen), <b>lief → lieve</b>, <b>boos → boze</b> (f→v, s→z).</p>'
  ],
  kaarten:[
    ['Welke lidwoorden zijn er?','Bepaald: de, het · onbepaald: een'],
    ['Hoe herken je een zelfstandig naamwoord?','Je kan er de, het of een voor zetten'],
    ['Wat is een soortnaam?','Een gewone naam voor een soort (jongen, stad), met kleine letter'],
    ['Wat is een eigennaam?','De naam van één bepaald iets of iemand (Thor, Gent), met hoofdletter'],
    ['Wat doet een bijvoeglijk naamwoord?','Het zegt hoe iets of iemand is'],
    ['Wanneer krijgt het bijvoeglijk naamwoord vóór een zelfstandig naamwoord GEEN -e?','Na “een” bij een het-woord in het enkelvoud (een groot park), en zonder lidwoord bij een het-woord (groot geluk)'],
    ['Verbuig: groot, dik, lief, boos','grote, dikke, lieve, boze'],
    ['Is “de moed” een zelfstandig naamwoord?','Ja: je kan er “de” voor zetten, ook al kan je het niet aanraken'],
  ],
  quiz:[
    {t:'mc',v:'Welk woord is een eigennaam?',o:['Antwerpen','stad','skatepark','kampioen'],a:0},
    {t:'mc',v:'Welk woord is een soortnaam?',o:['worstelaar','Thor','Hulk Hogan','België'],a:0},
    {t:'mc',v:'Kies de juiste vorm: een … skateboard (nieuw)',o:['nieuw','nieuwe','nieuwen','nieuws'],a:0},
    {t:'mc',v:'Kies de juiste vorm: het … skateboard (nieuw)',o:['nieuwe','nieuw','nieuws','nieuwen'],a:0},
    {t:'mc',v:'Kies de juiste vorm: een … figuur (zeldzaam)',o:['zeldzame','zeldzaam','zeldzamme','zeldzaamme'],a:0},
    {t:'mc',v:'Welk woord in “De sterke worstelaar wint” is een bijvoeglijk naamwoord?',o:['sterke','De','worstelaar','wint'],a:0},
    {t:'mc',v:'“Een” is een…',o:['onbepaald lidwoord','bepaald lidwoord','zelfstandig naamwoord','bijvoeglijk naamwoord'],a:0},
    {t:'jf',v:'“Geluk” is een zelfstandig naamwoord.',a:true,u:'Je kan zeggen: het geluk.'},
    {t:'jf',v:'Een eigennaam schrijf je met een kleine letter.',a:false,u:'Eigennamen krijgen een hoofdletter.'},
    {t:'invul',v:'Verbuig “dik”: de … kaft van het boek.',a:['dikke']},
    {t:'invul',v:'Verbuig “boos”: de … leraar.',a:['boze']},
    {t:'invul',v:'Verbuig “lief”: mijn … oma.',a:['lieve']},
    {t:'open',v:'Duid in deze zin het lidwoord, het bijvoeglijk naamwoord en het zelfstandig naamwoord aan: “Thor koopt een zeldzaam figuurtje.”',m:'een = lidwoord (onbepaald) · zeldzaam = bijvoeglijk naamwoord (geen -e: een + het-woord) · figuurtje = zelfstandig naamwoord (en Thor = eigennaam, ook een zelfstandig naamwoord).'}
  ]
},
{
  id:'N7', vak:'ned', titel:'Soorten zinnen en eindleestekens',
  bron: B('p. 63–66'),
  samenvatting:[
    '<h4>🗣️ Vier soorten zinnen</h4><table class="lp-ww lp-tijd"><tr><td>📢 mededelende zin</td><td>je <b>vertelt</b> iets → <b>.</b><br><small class="muted">Thor skatet elke zaterdag.</small></td></tr><tr><td>❓ vragende zin</td><td>je <b>vraagt</b> iets → <b>?</b><br><small class="muted">Ga je mee naar het skatepark?</small></td></tr><tr><td>👉 gebiedende zin</td><td>je <b>beveelt, vraagt of raadt aan</b> iets te doen → <b>!</b> of <b>.</b><br><small class="muted">Zet je helm op! · Doe de deur dicht.</small></td></tr><tr><td>😮 uitroepende zin</td><td>je <b>uit een gevoel</b>: verbazing, blijdschap, schrik → <b>!</b><br><small class="muted">Wat een sprong! · Au, dat doet pijn!</small></td></tr></table>',
    '<h4>🔍 Hoe herken je ze?</h4><div class="lp-stroom"><div><span>persoonsvorm vooraan of een vraagwoord (wie, wat, waar…)</span><b>vragend</b></div><div><span>persoonsvorm vooraan, geen onderwerp (gebiedende wijs)</span><b>gebiedend</b></div><div><span>wat een…, hoe…, wauw, oei, au</span><b>uitroepend</b></div><div><span>gewone zin, onderwerp vooraan of in het midden</span><b>mededelend</b></div></div>',
    '<h4>⚠️ Te veel leestekens?</h4><p>Leestekens hebben een <b>gevoelswaarde</b>. Te veel uitroeptekens klinken <b>boos, roepend of overdreven</b>:</p><div class="lp-vs"><div><b>😐 rustig</b>Kom je morgen?</div><div><b>😡 roepend</b>Kom je morgen?!?!!</div></div><p class="lp-tip">💡 In een <b>formele</b> tekst (brief aan school, examen) gebruik je <b>één</b> leesteken. Meerdere !!! of ?!? enkel in een sms aan een vriend.</p>'
  ],
  kaarten:[
    ['Welke 4 soorten zinnen ken je?','Mededelende, vragende, gebiedende en uitroepende zin'],
    ['Welk leesteken staat achter een mededelende zin?','Een punt'],
    ['Welk leesteken staat achter een vragende zin?','Een vraagteken'],
    ['Wat doe je in een gebiedende zin? Leesteken?','Je beveelt, vraagt of raadt aan iets te doen; uitroepteken of punt'],
    ['Wat doe je in een uitroepende zin?','Je uit een gevoel (verbazing, blijdschap, schrik); uitroepteken'],
    ['Hoe herken je een gebiedende zin?','De persoonsvorm staat vooraan en er is geen onderwerp'],
    ['Wat is het effect van te veel leestekens?','De zin klinkt boos, roepend of overdreven'],
    ['Wanneer gebruik je maar één leesteken?','In een formele tekst, bv. een brief aan school of op het examen'],
  ],
  quiz:[
    {t:'mc',v:'“Wat een prachtige verzameling!” Welke soort zin?',o:['Uitroepende zin','Vragende zin','Gebiedende zin','Mededelende zin'],a:0},
    {t:'mc',v:'“Ruim je kamer op.” Welke soort zin?',o:['Gebiedende zin','Mededelende zin','Vragende zin','Uitroepende zin'],a:0},
    {t:'mc',v:'“Thor heeft 80 figuurtjes.” Welke soort zin?',o:['Mededelende zin','Gebiedende zin','Uitroepende zin','Vragende zin'],a:0},
    {t:'mc',v:'“Waar is mijn skateboard” Welk leesteken ontbreekt?',o:['?','.','!',','],a:0},
    {t:'mc',v:'“Pas op, een auto” Welk leesteken past het best?',o:['!','?','.',','],a:0},
    {t:'mc',v:'Welke zin klinkt het meest boos?',o:['Waarom ben je zo laat?!?!','Waarom ben je zo laat?','Je bent laat.','Ben je laat?'],a:0},
    {t:'mc',v:'Welke zin is gebiedend?',o:['Draag je helm.','Je draagt je helm.','Draag jij je helm?','Wat een helm!'],a:0},
    {t:'jf',v:'Achter een gebiedende zin mag ook een punt staan.',a:true},
    {t:'jf',v:'In een brief aan de directeur zet je best drie uitroeptekens om iets te benadrukken.',a:false,u:'In een formele tekst gebruik je één leesteken.'},
    {t:'invul',v:'Een zin waarin je een gevoel uit (verbazing, schrik…) is een … zin.',a:['uitroepende']},
    {t:'open',v:'Schrijf over skaten één zin van elke soort, met het juiste leesteken.',m:'Bv. Mededelend: Ik skate elke dag. · Vragend: Skate jij ook? · Gebiedend: Zet je helm op! · Uitroepend: Wat een coole truc!'}
  ]
},
{
  id:'N8', vak:'ned', titel:'Hoofdletters',
  bron: B('p. 67–71'),
  samenvatting:[
    '<h4>🔠 Wanneer schrijf je een hoofdletter?</h4><table class="lp-ww lp-tijd"><tr><td>1️⃣ begin van een zin</td><td><b>D</b>e skater springt.</td></tr><tr><td>👤 namen van personen en dieren</td><td><b>T</b>hor, <b>E</b>li, <b>M</b>oemoe, de hond <b>B</b>obby</td></tr><tr><td>🗺️ aardrijkskundige namen</td><td><b>B</b>elgië, <b>G</b>ent, de <b>S</b>chelde, de <b>N</b>oordzee, <b>E</b>uropa</td></tr><tr><td>🏳️ talen en inwoners</td><td><b>N</b>ederlands, <b>E</b>ngels, een <b>B</b>elg, de <b>F</b>ransen</td></tr><tr><td>🎉 feestdagen</td><td><b>K</b>erstmis, <b>P</b>asen, <b>N</b>ieuwjaar</td></tr><tr><td>🏢 namen van organisaties, merken, titels</td><td>het <b>R</b>ode <b>K</b>ruis, <b>V</b>TI, <b>D</b>e <b>S</b>tandaard</td></tr><tr><td>🙏 God (één god)</td><td><b>G</b>od, <b>A</b>llah</td></tr></table>',
    '<h4>🚫 Géén hoofdletter</h4><div class="lp-tegels"><div><i>📅</i><b>dagen & maanden</b><small>maandag, december</small></div><div><i>❄️</i><b>seizoenen</b><small>winter, zomer</small></div><div><i>📚</i><b>schoolvakken</b><small>wiskunde, geschiedenis<br>(maar: Nederlands, Frans = taal!)</small></div></div><p class="lp-tip">💡 Afgeleide bijvoeglijke naamwoorden van namen krijgen ook een hoofdletter: <b>B</b>elgische frieten, <b>A</b>merikaans speelgoed, <b>E</b>ngelse les.</p>',
    '<h4>⚠️ Valkuilen</h4><ul><li>Het lidwoord ’s, ’t: <b>’s Avonds</b> wordt <b>’s A</b>vonds aan het begin van een zin (de hoofdletter komt op het <b>tweede</b> woord).</li><li>Aardrijkskundige namen met meerdere woorden: elk belangrijk woord: de <b>V</b>erenigde <b>S</b>taten.</li><li>Titels van boeken/films: enkel het <b>eerste</b> woord en namen: <i>De boom en het bos</i>.</li></ul>'
  ],
  kaarten:[
    ['Noem 5 gevallen waarin je een hoofdletter schrijft.','Begin van een zin, namen van personen/dieren, aardrijkskundige namen, talen en inwoners, feestdagen, organisaties/merken/titels, God'],
    ['Krijgen dagen en maanden een hoofdletter?','Nee: maandag, december'],
    ['Krijgen schoolvakken een hoofdletter?','Nee (wiskunde), behalve als het een taal is (Nederlands, Frans)'],
    ['Krijgen talen een hoofdletter?','Ja: Nederlands, Engels, Frans'],
    ['Krijgen feestdagen een hoofdletter?','Ja: Kerstmis, Pasen, Nieuwjaar'],
    ['Hoe schrijf je “’s avonds” aan het begin van een zin?','’s Avonds: de hoofdletter komt op het tweede woord'],
    ['Krijgt “Belgisch” een hoofdletter?','Ja: het is afgeleid van een aardrijkskundige naam'],
    ['Krijgen seizoenen een hoofdletter?','Nee: lente, zomer, herfst, winter'],
  ],
  quiz:[
    {t:'mc',v:'Welke zin is juist geschreven?',o:['Op maandag heb ik Nederlands en wiskunde.','Op Maandag heb ik Nederlands en wiskunde.','Op maandag heb ik nederlands en wiskunde.','Op maandag heb ik Nederlands en Wiskunde.'],a:0},
    {t:'mc',v:'Welk woord krijgt GEEN hoofdletter?',o:['december','Pasen','Brugge','Frans'],a:0},
    {t:'mc',v:'Welke schrijfwijze is juist?',o:['de Noordzee','de noordzee','De noordzee','de Noord Zee'],a:0},
    {t:'mc',v:'Welke schrijfwijze is juist aan het begin van een zin?',o:['’s Morgens skate ik.','’S morgens skate ik.','’S Morgens skate ik.','’s morgens skate ik.'],a:0},
    {t:'mc',v:'Welke is juist?',o:['Amerikaans speelgoed','amerikaans speelgoed','Amerikaans Speelgoed','amerikaans Speelgoed'],a:0},
    {t:'mc',v:'Welk woord krijgt WEL een hoofdletter?',o:['Kerstmis','winter','dinsdag','geschiedenis'],a:0},
    {t:'jf',v:'“Engels” schrijf je met een hoofdletter.',a:true},
    {t:'jf',v:'Seizoenen schrijf je met een hoofdletter.',a:false,u:'Nee: lente, zomer, herfst, winter.'},
    {t:'jf',v:'Inwoners van een land krijgen een hoofdletter: een Belg.',a:true},
    {t:'invul',v:'Schrijf juist: “in de zomer reizen we naar spanje.” → In de zomer reizen we naar … .',a:['Spanje']},
    {t:'open',v:'Verbeter de hoofdletters: “vorige Zaterdag kocht thor in gent een amerikaanse actiefiguur.”',m:'Vorige zaterdag kocht Thor in Gent een Amerikaanse actiefiguur. (begin van de zin, geen hoofdletter bij dagen, naam, stad, afgeleid van Amerika)'}
  ]
},
{
  id:'N9', vak:'ned', titel:'Onderwerp en persoonsvorm',
  bron: B('p. 72–76'),
  samenvatting:[
    '<h4>🧱 De twee belangrijkste zinsdelen</h4><div class="lp-vs"><div><b>⚙️ persoonsvorm (pv)</b>het <u>vervoegde werkwoord</u><small>verandert als je de tijd of het getal verandert</small></div><div><b>👤 onderwerp (o)</b>wie of wat + pv?<small>het hoort bij de pv: samen enkelvoud of samen meervoud</small></div></div>',
    '<h4>⚙️ Stap 1: zoek de persoonsvorm</h4><table class="lp-ww lp-tijd"><tr><td>⏰ tijdproef</td><td>zet de zin in een <b>andere tijd</b>. Het werkwoord dat verandert = pv.<br><small class="muted">Thor <b>skatet</b> → Thor <b>skatete</b></small></td></tr><tr><td>🔢 getalproef</td><td>zet het onderwerp in het <b>meervoud/enkelvoud</b>. Het werkwoord dat mee verandert = pv.<br><small class="muted">Thor <b>skatet</b> → Thor en Eli <b>skaten</b></small></td></tr><tr><td>❓ vraagproef</td><td>maak er een <b>ja-neevraag</b> van. Het werkwoord dat <b>vooraan</b> springt = pv.<br><small class="muted"><b>Skatet</b> Thor?</small></td></tr></table><p class="lp-tip">💡 Er is altijd <b>maar één</b> persoonsvorm per (enkelvoudige) zin. Andere werkwoorden (heeft <u>gekocht</u>, wil <u>skaten</u>) zijn géén pv.</p>',
    '<h4>👤 Stap 2: zoek het onderwerp</h4><p>Vraag: <b>Wie of wat + persoonsvorm?</b></p><p class="lp-vb">Gisteren <b>kocht</b> mijn broer een worstelaar.<br>Wie kocht? → <b>mijn broer</b> = onderwerp</p><p>Het onderwerp kan ook <b>na</b> de pv staan (bij inversie of een vraag): Morgen <b>gaan</b> <u>wij</u> skaten.</p>',
    '<h4>🤝 Congruentie</h4><p>Onderwerp en persoonsvorm passen bij elkaar in <b>getal</b> (enkelvoud ↔ meervoud) en <b>persoon</b>.</p><div class="lp-vs"><div><b>enkelvoud</b>De worstelaar <u>wint</u>.</div><div><b>meervoud</b>De worstelaars <u>winnen</u>.</div></div><p class="lp-tip">⚠️ Valkuil: “Een doos vol figuurtjes <b>staat</b> op de kast.” Het onderwerp is <b>een doos</b> (enkelvoud), niet de figuurtjes!</p>'
  ],
  kaarten:[
    ['Wat is de persoonsvorm?','Het vervoegde werkwoord in de zin'],
    ['Welke 3 proeven helpen om de persoonsvorm te vinden?','Tijdproef, getalproef en vraagproef'],
    ['Leg de tijdproef uit.','Zet de zin in een andere tijd; het werkwoord dat verandert is de persoonsvorm'],
    ['Leg de getalproef uit.','Verander het onderwerp van enkelvoud naar meervoud (of omgekeerd); het werkwoord dat mee verandert is de pv'],
    ['Leg de vraagproef uit.','Maak er een ja-neevraag van; het werkwoord dat vooraan komt is de pv'],
    ['Hoe vind je het onderwerp?','Vraag: wie of wat + persoonsvorm?'],
    ['Wat is congruentie?','Onderwerp en persoonsvorm passen bij elkaar in getal en persoon'],
    ['Hoeveel persoonsvormen heeft een enkelvoudige zin?','Eén'],
  ],
  quiz:[
    {t:'mc',v:'Wat is de persoonsvorm in: “Thor heeft een nieuw board gekocht.”',o:['heeft','gekocht','Thor','nieuw'],a:0},
    {t:'mc',v:'Wat is het onderwerp in: “Gisteren won de jongste skater de wedstrijd.”',o:['de jongste skater','Gisteren','de wedstrijd','won'],a:0},
    {t:'mc',v:'Wat is de persoonsvorm in: “Wil jij morgen meegaan?”',o:['Wil','meegaan','jij','morgen'],a:0},
    {t:'mc',v:'Wat is het onderwerp in: “In de kast staan dertig figuurtjes.”',o:['dertig figuurtjes','de kast','staan','In'],a:0},
    {t:'mc',v:'Kies de juiste pv: “Een doos vol oude figuurtjes … op zolder.”',o:['staat','staan','stonden','gestaan'],a:0},
    {t:'mc',v:'Je zet “Ik skate” om naar “Ik skatete”. Welke proef doe je?',o:['Tijdproef','Getalproef','Vraagproef','Weglaattest'],a:0},
    {t:'mc',v:'Zet in het meervoud: “De worstelaar wint de gordel.”',o:['De worstelaars winnen de gordel.','De worstelaars wint de gordel.','De worstelaar winnen de gordel.','De worstelaars wonnen de gordel.'],a:0},
    {t:'jf',v:'Het onderwerp staat altijd vooraan in de zin.',a:false,u:'Het kan ook na de pv staan: Morgen gaan wij skaten.'},
    {t:'jf',v:'In “Ik wil skaten” is “skaten” de persoonsvorm.',a:false,u:'“wil” is de pv (tijdproef: ik wilde skaten).'},
    {t:'invul',v:'Onderwerp en persoonsvorm passen bij elkaar in getal. Dat heet … .',a:['congruentie']},
    {t:'open',v:'Zoek pv en onderwerp in: “Vorige week verkochten mijn ouders hun oude speelgoed.” Leg uit hoe je het vond.',m:'pv = verkochten (tijdproef: verkopen nu → verkopen/verkochten; of vraagproef: Verkochten mijn ouders…?) · onderwerp = mijn ouders (Wie verkochten? → mijn ouders).'}
  ]
},
{
  id:'N10', vak:'ned', titel:'De onvoltooid tegenwoordige tijd (OTT)',
  bron: B('p. 77–86 + Bookwidget'),
  samenvatting:[
    '<h4>⏱️ Wat is de OTT?</h4><p>De <b>tegenwoordige tijd</b>: iets gebeurt <b>nu</b>, <b>altijd</b> of <b>gewoonlijk</b>, of het gebeurt straks (ik ga morgen skaten).</p><p class="lp-vb">Ik <b>verzamel</b> vintage speelgoed. Thor <b>skatet</b> elke dag.</p>',
    '<h4>🛠️ Zo vorm je de OTT</h4><p>Begin bij de <b>stam</b> = de ik-vorm (hele werkwoord min -en, en let op de spelling).</p><table class="lp-ww lp-tijd"><tr><td>ik</td><td><b>stam</b> → ik word, ik vind, ik skate</td></tr><tr><td>jij / je / u</td><td><b>stam + t</b> → jij wordt, je vindt</td></tr><tr><td>hij / zij / het</td><td><b>stam + t</b> → hij wordt, zij vindt</td></tr><tr><td>wij / jullie / zij</td><td><b>hele werkwoord</b> → wij worden, jullie vinden</td></tr></table><p class="lp-tip">✂️ Stam maken: worden → <b>word</b> (de <b>d</b> blijft!), lopen → <b>loop</b> (klinker verdubbelt), zetten → <b>zet</b>, leven → <b>leef</b> (v→f), reizen → <b>reis</b> (z→s).</p>',
    '<h4>🔁 Inversie: de t valt weg!</h4><p>Staat <b>jij/je</b> <u>na</u> de persoonsvorm, dan krijgt de pv <b>géén t</b>:</p><div class="lp-vs"><div><b>jij vóór de pv</b>Jij <u>wordt</u> kampioen.<small>stam + t</small></div><div><b>jij na de pv</b><u>Word</u> jij kampioen?<small>alleen de stam!</small></div></div><p>Dat geldt <b>alleen</b> voor <b>jij/je</b>. Bij hij, zij, u blijft de t: <u>Wordt</u> hij kampioen? <u>Vindt</u> u dat goed?</p>',
    '<h4>🎯 d of t of dt?</h4><div class="lp-stroom"><div><span>zoek de stam (ik-vorm): word, vind</span><b>stap 1</b></div><div><span>moet er een t bij? (jij/hij/zij/het, niet bij inversie met jij)</span><b>stap 2</b></div><div><span>stam op d + t</span><b>-dt</b></div></div><p class="lp-vb">Hij <b>vindt</b> het tof (vind + t) · Ik <b>vind</b> het tof · <b>Vind</b> je het tof? · Hij <b>zet</b> het figuur op de kast (stam eindigt al op t: geen extra t)</p>'
  ],
  kaarten:[
    ['Wanneer gebruik je de OTT?','Voor iets dat nu, altijd of gewoonlijk gebeurt (of straks)'],
    ['Hoe vind je de stam van een werkwoord?','De ik-vorm: hele werkwoord min -en, met aangepaste spelling'],
    ['OTT bij “ik”?','Alleen de stam: ik word'],
    ['OTT bij jij/je/u en hij/zij/het?','Stam + t: jij wordt, hij wordt'],
    ['OTT bij wij/jullie/zij (meervoud)?','Het hele werkwoord: wij worden'],
    ['Wat is inversie bij jij/je?','Jij/je staat na de pv; dan valt de t weg: Word jij…?'],
    ['Valt de t ook weg bij “Wordt hij…?”','Nee, alleen bij jij/je'],
    ['Stam van leven, reizen, lopen, zetten?','leef, reis, loop, zet'],
    ['Waarom schrijf je “hij vindt” met dt?','Stam vind (op d) + t voor hij'],
  ],
  quiz:[
    {t:'mc',v:'Kies juist: “Thor … steeds beter.” (worden)',o:['wordt','word','wort','worden'],a:0},
    {t:'mc',v:'Kies juist: “… jij morgen mee?” (gaan)',o:['Ga','Gaat','Gaan','Gaad'],a:0},
    {t:'mc',v:'Kies juist: “Ik … dat figuur echt cool.” (vinden)',o:['vind','vindt','vint','vinden'],a:0},
    {t:'mc',v:'Kies juist: “… hij zijn verzameling?” (verkopen)',o:['Verkoopt','Verkoop','Verkopen','Verkoopd'],a:0},
    {t:'mc',v:'Kies juist: “Jij … snel boos.” (worden)',o:['wordt','word','wort','worden'],a:0},
    {t:'mc',v:'Kies juist: “Wat … jij van mijn board?” (vinden)',o:['vind','vindt','vinden','vint'],a:0},
    {t:'mc',v:'Kies juist: “Hij … zijn helm op.” (zetten)',o:['zet','zett','zetd','zetten'],a:0},
    {t:'mc',v:'Kies juist: “Wij … naar de verzamelbeurs.” (rijden)',o:['rijden','rijdt','rijd','rijde'],a:0},
    {t:'invul',v:'Vervoeg in de OTT: hij … (leven)',a:['leeft']},
    {t:'invul',v:'Vervoeg in de OTT: … jij al lang? (verzamelen)',a:['Verzamel','verzamel']},
    {t:'invul',v:'Vervoeg in de OTT: zij … naar Spanje (reizen, enkelvoud)',a:['reist']},
    {t:'jf',v:'In “Antwoordt u op mijn vraag?” is de t correct.',a:true,u:'Bij u valt de t niet weg, ook niet bij inversie.'},
    {t:'jf',v:'In “Word je later worstelaar?” ontbreekt een t.',a:false,u:'Inversie met je: geen t.'},
    {t:'open',v:'Leg uit waarom je “Wordt Thor kampioen?” met dt schrijft, maar “Word jij kampioen?” met d.',m:'Stam = word. Bij Thor (= hij) komt er altijd een t bij: wordt. Bij jij/je ná de pv (inversie) valt de t weg: word jij.'}
  ]
},
{
  id:'N11', vak:'ned', titel:'Taalschat: woordenschat en vergelijkingen',
  bron: B('p. 87–93'),
  samenvatting:[
    '<h4>📚 Woorden om mensen te beschrijven</h4><table class="lp-ww lp-tijd"><tr><td>🧍 gestalte</td><td>slank, tenger, stevig, gespierd, fors, klein van stuk, rijzig</td></tr><tr><td>💇 haar</td><td>stijl, krullend, golvend, kortgeknipt, kaal, sluik, piekerig</td></tr><tr><td>👀 gezicht</td><td>sproeten, een kuiltje in de kin, rond, hoekig, een stoppelbaard</td></tr><tr><td>💭 karakter</td><td>behulpzaam, eerlijk, ondeugend, verlegen, zelfzeker, koppig, gul, opvliegend</td></tr></table>',
    '<h4>🐻 Vergelijkingen: zo … als …</h4><p>Met een <b>vergelijking</b> maak je een beschrijving <b>beeldend</b>. Vaste vergelijkingen ken je best vanbuiten:</p><table class="lp-ww lp-tijd"><tr><td>zo sterk als</td><td>een <b>beer</b></td></tr><tr><td>zo trots als</td><td>een <b>pauw</b></td></tr><tr><td>zo slim als</td><td>een <b>vos</b></td></tr><tr><td>zo bang als</td><td>een <b>wezel</b></td></tr><tr><td>zo doof als</td><td>een <b>kwartel</b></td></tr><tr><td>zo koppig als</td><td>een <b>ezel</b></td></tr><tr><td>zo glad als</td><td>een <b>aal</b></td></tr><tr><td>zo vlug als</td><td>de <b>wind</b> / <b>bliksem</b></td></tr><tr><td>zo bleek als</td><td>een <b>doek</b> / <b>spook</b></td></tr><tr><td>zo oud als</td><td>de <b>straat</b></td></tr><tr><td>zo licht als</td><td>een <b>veertje</b></td></tr><tr><td>zo zacht als</td><td>een <b>lammetje</b> / zijde</td></tr></table>',
    '<h4>💬 De passende uitdrukking</h4><p>Bij een <b>situatie</b> kies je de uitdrukking die past:</p><p class="lp-vb">Thor vertelt niemand iets over zijn geheime figuur → hij is <b>zo stil als een muis</b> / hij <b>zwijgt als het graf</b>.<br>Boeboe heeft niets door van de grap → hij is <b>zo doof als een kwartel</b>.</p><p class="lp-tip">💡 Leer ze als een <b>koppel</b>: eigenschap + dier/ding. Maak er een grappig beeld van in je hoofd: een pauw met een kampioenengordel = <b>trots</b>!</p>'
  ],
  kaarten:[
    ['zo sterk als …','een beer'],
    ['zo trots als …','een pauw'],
    ['zo slim als …','een vos'],
    ['zo bang als …','een wezel'],
    ['zo doof als …','een kwartel'],
    ['zo koppig als …','een ezel'],
    ['zo glad als …','een aal'],
    ['zo oud als …','de straat'],
    ['zo bleek als …','een doek (of een spook)'],
    ['zo licht als …','een veertje'],
    ['Wat is een vergelijking (taal)?','Een beeldende manier van beschrijven met “zo … als …”, bv. zo sterk als een beer'],
    ['Geef 3 woorden voor gestalte.','Bv. slank, tenger, gespierd, fors, stevig'],
  ],
  quiz:[
    {t:'mc',v:'Zo trots als een …',o:['pauw','vos','beer','ezel'],a:0},
    {t:'mc',v:'Zo slim als een …',o:['vos','kwartel','aal','wezel'],a:0},
    {t:'mc',v:'Zo bang als een …',o:['wezel','pauw','beer','vos'],a:0},
    {t:'mc',v:'Zo glad als een …',o:['aal','ezel','pauw','kwartel'],a:0},
    {t:'mc',v:'Zo koppig als een …',o:['ezel','vos','pauw','aal'],a:0},
    {t:'mc',v:'Papa tilt in zijn eentje de zetel op. Welke uitdrukking past?',o:['Zo sterk als een beer','Zo doof als een kwartel','Zo glad als een aal','Zo oud als de straat'],a:0},
    {t:'mc',v:'Thor wint de skatewedstrijd en loopt rond met zijn medaille. Welke uitdrukking past?',o:['Zo trots als een pauw','Zo bang als een wezel','Zo koppig als een ezel','Zo licht als een veertje'],a:0},
    {t:'mc',v:'Die mop heb ik al honderd keer gehoord: die is…',o:['zo oud als de straat','zo slim als een vos','zo trots als een pauw','zo glad als een aal'],a:0},
    {t:'mc',v:'Welk woord beschrijft het haar?',o:['krullend','gespierd','behulpzaam','tenger'],a:0},
    {t:'invul',v:'Zo doof als een … .',a:['kwartel']},
    {t:'invul',v:'Zo sterk als een … .',a:['beer']},
    {t:'open',v:'Beschrijf een worstelaar in 2 zinnen met minstens 2 woorden uit de taalschat en 1 vergelijking.',m:'Bv.: De worstelaar is fors en gespierd, met een kaal hoofd en een stoppelbaard. Hij is zo sterk als een beer, maar ook zo trots als een pauw.'}
  ]
},
// ---------------------------------------------------------------- DEEL 2
{
  id:'N12', vak:'ned', titel:'Soorten vragen',
  bron: B('p. 100–105 + PowerPoint'),
  samenvatting:[
    '<h4>❓ Open en gesloten vragen</h4><div class="lp-vs"><div><b>🔓 open vraag</b>je kan <u>vrij antwoorden</u>, met meer woorden<small>Wat vind jij van skaten? Waarom verzamel je speelgoed?</small></div><div><b>🔒 gesloten vraag</b>het antwoord ligt <u>vast</u>: ja/nee of een keuze<small>Skate jij? Wil je cola of water?</small></div></div>',
    '<h4>🔒 Soorten gesloten vragen</h4><table class="lp-ww lp-tijd"><tr><td>✅ ja-neevraag</td><td>antwoord: ja of nee<br><small class="muted">Heb jij een skateboard?</small></td></tr><tr><td>🔀 keuzevraag</td><td>je kiest uit <b>gegeven</b> antwoorden<br><small class="muted">Kies je de rode of de blauwe gordel?</small></td></tr></table>',
    '<h4>🕵️ De 6 W-vragen (+ H)</h4><p>Met deze vraagwoorden stel je <b>open vragen</b> en verzamel je alle informatie over een situatie:</p><div class="lp-tegels"><div><i>👤</i><b>wie?</b></div><div><i>📦</i><b>wat?</b></div><div><i>📍</i><b>waar?</b></div><div><i>📅</i><b>wanneer?</b></div><div><i>🤔</i><b>waarom?</b></div><div><i>🛠️</i><b>hoe?</b></div></div>',
    '<h4>🎭 Nog een paar soorten</h4><table class="lp-ww lp-tijd"><tr><td>💭 retorische vraag</td><td>je <b>verwacht geen antwoord</b>, het is eigenlijk een mening<br><small class="muted">Wie wil er nu niet slagen?</small></td></tr><tr><td>👉 suggestieve vraag</td><td>je <b>stuurt</b> de ander naar het antwoord dat jij wil<br><small class="muted">Jij vindt dit toch ook de mooiste figuur?</small></td></tr></table><p class="lp-tip">💡 Wil je echt iets <b>te weten komen</b> (interview, spreekbeurt)? Stel <b>open</b> vragen met de W-woorden. Wil je snel een duidelijk antwoord? Stel een <b>gesloten</b> vraag.</p>'
  ],
  kaarten:[
    ['Wat is een open vraag?','Een vraag waarop je vrij en uitgebreid kan antwoorden'],
    ['Wat is een gesloten vraag?','Een vraag met een vast antwoord: ja/nee of een keuze uit gegeven antwoorden'],
    ['Wat is een keuzevraag?','Een gesloten vraag waarbij je kiest uit gegeven mogelijkheden'],
    ['Welke 6 vraagwoorden helpen je om open vragen te stellen?','Wie, wat, waar, wanneer, waarom, hoe'],
    ['Wat is een retorische vraag?','Een vraag waarop je geen antwoord verwacht; eigenlijk een mening'],
    ['Wat is een suggestieve vraag?','Een vraag die de ander stuurt naar het antwoord dat jij wil'],
    ['Wanneer stel je best open vragen?','Als je veel te weten wil komen, bv. bij een interview'],
  ],
  quiz:[
    {t:'mc',v:'“Hoe ben je begonnen met verzamelen?” Wat voor vraag?',o:['Open vraag','Ja-neevraag','Keuzevraag','Retorische vraag'],a:0},
    {t:'mc',v:'“Ga je mee skaten?” Wat voor vraag?',o:['Ja-neevraag (gesloten)','Open vraag','Retorische vraag','W-vraag'],a:0},
    {t:'mc',v:'“Wil je pizza of frietjes?” Wat voor vraag?',o:['Keuzevraag','Open vraag','Suggestieve vraag','Retorische vraag'],a:0},
    {t:'mc',v:'“Wie wil er nu geen vakantie?” Wat voor vraag?',o:['Retorische vraag','Ja-neevraag','Keuzevraag','Open vraag'],a:0},
    {t:'mc',v:'“Jij bent toch ook voor een nieuw skatepark?” Wat voor vraag?',o:['Suggestieve vraag','Open vraag','Keuzevraag','Retorische vraag'],a:0},
    {t:'mc',v:'Je interviewt een profskater voor de schoolkrant. Welke vraag levert het meeste op?',o:['Waarom ben je beginnen skaten?','Skate je graag?','Ben je profskater?','Skate je links of rechts?'],a:0},
    {t:'jf',v:'Een gesloten vraag kan je altijd met ja of nee beantwoorden.',a:false,u:'Ook keuzevragen zijn gesloten: daar kies je uit gegeven antwoorden.'},
    {t:'jf',v:'Op een retorische vraag verwacht je geen antwoord.',a:true},
    {t:'invul',v:'Wie, wat, waar, wanneer, waarom en … helpen je om open vragen te stellen.',a:['hoe']},
    {t:'open',v:'Maak van deze gesloten vraag een open vraag: “Vind je worstelen leuk?”',m:'Bv.: Wat vind je leuk aan worstelen? / Waarom kijk je graag naar worstelen?'}
  ]
},
{
  id:'N13', vak:'ned', titel:'Het communicatiemodel',
  bron: B('p. 121–124'),
  samenvatting:[
    '<h4>📡 Communiceren = een boodschap doorgeven</h4><div class="lp-ketting"><span>👤 zender</span><i>→</i><span>💬 boodschap</span><i>→ via 📱 kanaal →</i><span>👥 ontvanger</span></div><p>…met een <b>🎯 doel</b>, in een <b>🏠 situatie</b>.</p>',
    '<h4>🧩 De 6 elementen</h4><table class="lp-ww lp-tijd"><tr><td>👤 zender</td><td><b>wie</b> geeft de boodschap?</td></tr><tr><td>👥 ontvanger</td><td>aan <b>wie</b> is ze gericht?</td></tr><tr><td>💬 boodschap</td><td><b>wat</b> wordt er gezegd?</td></tr><tr><td>🎯 doel</td><td><b>waarom</b>? (informeren, overtuigen, instrueren, ontspannen, contact maken)</td></tr><tr><td>📱 kanaal (medium)</td><td><b>hoe / waarlangs</b>? (gesprek, brief, sms, mail, affiche, telefoon, video)</td></tr><tr><td>🏠 situatie</td><td><b>waar en wanneer</b>? (de omstandigheden)</td></tr></table>',
    '<h4>🔍 Zo pas je het toe: 6 vragen</h4><p class="lp-vb">Mama stuurt Thor ’s avonds een sms: “Vergeet je helm niet morgen!”<br>👤 zender: mama · 👥 ontvanger: Thor · 💬 boodschap: helm niet vergeten · 🎯 doel: instrueren/herinneren · 📱 kanaal: sms · 🏠 situatie: ’s avonds, voor de skateles</p><p class="lp-tip">💡 De zender past zijn boodschap aan de <b>ontvanger</b> en de <b>situatie</b> aan: aan je vriend schrijf je anders dan aan de directeur.</p>',
    '<h4>📣 Feedback</h4><p>Als de ontvanger <b>reageert</b>, wordt hij zelf <b>zender</b>. Die reactie heet <b>feedback</b>. Zo gaat communicatie heen en weer.</p>'
  ],
  kaarten:[
    ['Welke 6 elementen heeft het communicatiemodel?','Zender, ontvanger, boodschap, doel, kanaal (medium) en situatie'],
    ['Wat is de zender?','Wie de boodschap geeft'],
    ['Wat is de ontvanger?','Aan wie de boodschap gericht is'],
    ['Wat is het kanaal of medium?','De manier waarop/waarlangs de boodschap gaat: gesprek, brief, sms, mail…'],
    ['Wat is de situatie?','De omstandigheden: waar en wanneer de communicatie gebeurt'],
    ['Welke doelen kan communicatie hebben?','Informeren, overtuigen, instrueren, ontspannen, contact maken'],
    ['Wat is feedback?','De reactie van de ontvanger, die dan zelf zender wordt'],
  ],
  quiz:[
    {t:'mc',v:'De directeur spreekt op het podium tot alle leerlingen. Wie is de ontvanger?',o:['De leerlingen','De directeur','Het podium','De microfoon'],a:0},
    {t:'mc',v:'Je stuurt een WhatsApp naar Eli. Wat is het kanaal?',o:['WhatsApp (bericht op de gsm)','Eli','Jij','De tekst'],a:0},
    {t:'mc',v:'Een affiche “Kom naar onze verzamelbeurs!”. Wat is het doel?',o:['Overtuigen','Instrueren','Ontspannen','Geen doel'],a:0},
    {t:'mc',v:'Welk element beantwoordt de vraag “waar en wanneer”?',o:['Situatie','Kanaal','Boodschap','Doel'],a:0},
    {t:'mc',v:'Welk element beantwoordt de vraag “wat wordt er gezegd”?',o:['Boodschap','Zender','Kanaal','Situatie'],a:0},
    {t:'mc',v:'De leerkracht vraagt iets en jij antwoordt. Je antwoord is…',o:['feedback','het kanaal','de situatie','ruis'],a:0},
    {t:'jf',v:'Een zender past zijn boodschap best aan de ontvanger aan.',a:true},
    {t:'jf',v:'Een brief en een telefoongesprek zijn verschillende kanalen.',a:true},
    {t:'invul',v:'Wie de boodschap geeft is de … .',a:['zender']},
    {t:'open',v:'Opa belt op zondagmiddag naar Thor om hem succes te wensen voor zijn examens. Benoem de 6 elementen.',m:'Zender: opa · ontvanger: Thor · boodschap: succes met de examens · doel: contact maken/aanmoedigen · kanaal: telefoon · situatie: zondagmiddag, voor de examens.'}
  ]
},
{
  id:'N14', vak:'ned', titel:'Instructies geven',
  bron: B('p. 125–133 + checklist'),
  samenvatting:[
    '<h4>🛠️ Wat is een goede instructie?</h4><p>Een instructie vertelt iemand <b>stap voor stap</b> hoe hij iets moet <b>doen</b>. Een goede instructie is:</p><div class="lp-tegels"><div><i>🔢</i><b>in de juiste volgorde</b></div><div><i>✂️</i><b>kort en duidelijk</b><small>één handeling per stap</small></div><div><i>👉</i><b>in de gebiedende wijs</b><small>Zet… Duw… Draai…</small></div><div><i>🧰</i><b>volledig</b><small>wat heb je nodig?</small></div><div><i>🔗</i><b>met signaalwoorden</b><small>eerst, daarna…</small></div><div><i>🖼️</i><b>soms met tekening</b></div></div>',
    '<h4>🔗 Signaalwoorden van volgorde</h4><div class="lp-ketting"><span>eerst · om te beginnen</span><i>→</i><span>daarna · dan · vervolgens · nu</span><i>→</i><span>ten slotte · tot slot · als laatste</span></div><p>Signaalwoorden tonen het <b>verband</b> tussen de stappen. Ze helpen de lezer om de <b>volgorde</b> te volgen.</p>',
    '<h4>✅ De checklist</h4><table class="lp-ww lp-tijd"><tr><td>1</td><td>Staat bovenaan <b>wat</b> je gaat maken/doen?</td></tr><tr><td>2</td><td>Staat erbij <b>wat je nodig hebt</b>?</td></tr><tr><td>3</td><td>Staan de stappen in de <b>juiste volgorde</b>, met nummers of signaalwoorden?</td></tr><tr><td>4</td><td>Is elke stap <b>kort</b>, met <b>één handeling</b>?</td></tr><tr><td>5</td><td>Gebruik je de <b>gebiedende wijs</b>?</td></tr><tr><td>6</td><td>Is alles <b>duidelijk</b>, zonder moeilijke woorden?</td></tr></table>',
    '<h4>🛹 Voorbeeld</h4><p class="lp-vb"><b>Zo zet je nieuwe wieltjes op je skateboard</b><br>Nodig: 4 wieltjes, 8 lagers, een skatetool.<br>1. <b>Eerst</b> draai je de moer los met de skatetool.<br>2. <b>Daarna</b> trek je het oude wieltje eraf.<br>3. <b>Dan</b> duw je de lagers in het nieuwe wieltje.<br>4. <b>Ten slotte</b> schuif je het wieltje op de as en draai je de moer weer vast.</p>'
  ],
  kaarten:[
    ['Wat is een instructie?','Een tekst of uitleg die iemand stap voor stap vertelt hoe hij iets moet doen'],
    ['Noem 4 kenmerken van een goede instructie.','Juiste volgorde, kort en duidelijk (één handeling per stap), gebiedende wijs, volledig (wat heb je nodig), signaalwoorden'],
    ['Wat zijn signaalwoorden?','Woorden die het verband tussen zinnen of stappen tonen'],
    ['Geef signaalwoorden van volgorde.','Eerst, om te beginnen, daarna, dan, vervolgens, ten slotte, tot slot'],
    ['Welk werkwoordsvorm gebruik je in een instructie?','De gebiedende wijs (imperatief)'],
    ['Wat zet je bovenaan een instructie?','Wat je gaat maken of doen, en wat je nodig hebt'],
  ],
  quiz:[
    {t:'mc',v:'Welk woord is een signaalwoord dat de LAATSTE stap aankondigt?',o:['ten slotte','eerst','daarna','vervolgens'],a:0},
    {t:'mc',v:'Welk woord is een signaalwoord dat de EERSTE stap aankondigt?',o:['om te beginnen','tot slot','vervolgens','dan'],a:0},
    {t:'mc',v:'Welke stap is het best geschreven?',o:['Draai de moer los.','De moer moet je eigenlijk wel eens losdraaien en dan ook het wieltje en zo.','Moer los.','Iemand draait de moer los.'],a:0},
    {t:'mc',v:'Wat ontbreekt in deze instructie? “1. Duw de lagers in het wieltje. 2. Schuif het op de as.”',o:['Wat je nodig hebt (en wat je maakt)','Gebiedende wijs','Volgorde','Korte stappen'],a:0},
    {t:'mc',v:'Welk tekstdoel heeft een instructie?',o:['Instrueren','Informeren','Ontspannen','Overtuigen'],a:0},
    {t:'jf',v:'In een goede instructie staan meerdere handelingen in één stap.',a:false,u:'Eén handeling per stap is duidelijker.'},
    {t:'jf',v:'Een tekening kan een instructie duidelijker maken.',a:true},
    {t:'jf',v:'“Vervolgens” is een signaalwoord van volgorde.',a:true},
    {t:'invul',v:'In een instructie gebruik je de … wijs.',a:['gebiedende']},
    {t:'open',v:'Schrijf een instructie in 4 stappen: hoe zet je een actiefiguur veilig in een vitrinekast? Gebruik signaalwoorden en de gebiedende wijs.',m:'Bv. Nodig: figuur, vitrinekast, doekje. Eerst maak je het plankje stofvrij met een doekje. Daarna zet je de figuur rechtop in het midden. Vervolgens controleer je of ze stevig staat. Ten slotte sluit je de deur van de kast. (of: Maak eerst… Zet daarna…)'}
  ]
},
{
  id:'N15', vak:'ned', titel:'De imperatief (gebiedende wijs)',
  bron: B('p. 134–138'),
  samenvatting:[
    '<h4>👉 Wat is de imperatief?</h4><p>De <b>gebiedende wijs</b>: je <b>beveelt, vraagt</b> of <b>raadt aan</b> om iets te doen. Je gebruikt hem in <b>instructies</b>, recepten, verkeersborden, raad…</p><p class="lp-vb"><b>Zet</b> je helm op! · <b>Kom</b> eens kijken. · <b>Lees</b> de vraag goed.</p>',
    '<h4>🛠️ Zo vorm je hem</h4><p>Gewoon de <b>stam</b> (de ik-vorm). <b>Geen</b> onderwerp, <b>geen</b> t.</p><table class="lp-ww lp-tijd"><tr><td>lopen</td><td><b>Loop</b> niet zo snel!</td></tr><tr><td>worden</td><td><b>Word</b> niet boos! <small class="muted">(de d blijft, geen t!)</small></td></tr><tr><td>vinden</td><td><b>Vind</b> de fout.</td></tr><tr><td>antwoorden</td><td><b>Antwoord</b> in volzinnen.</td></tr><tr><td>houden</td><td><b>Houd</b> op! / <b>Hou</b> op! <small class="muted">(beide juist)</small></td></tr><tr><td>zijn</td><td><b>Wees</b> stil! <small class="muted">(uitzondering)</small></td></tr></table>',
    '<h4>🎩 Beleefd</h4><p>Wil je beleefder klinken? Gebruik <b>u</b> en zet een <b>t</b> erachter: <b>Komt u</b> binnen. <b>Neemt u</b> plaats. Of voeg <b>eens, maar, even</b> of <b>alsjeblieft</b> toe: Kom <b>maar</b> binnen.</p>',
    '<h4>🔍 Herkennen</h4><div class="lp-vs"><div><b>✅ imperatief</b><u>Draai</u> de moer los.<small>pv vooraan, géén onderwerp</small></div><div><b>❌ geen imperatief</b><u>Draai</u> jij de moer los?<small>er is een onderwerp (jij): vraag</small></div></div><p class="lp-tip">⚠️ Spelling: <b>“Word niet boos!”</b> zonder t. Er staat geen “jij” of “hij”, dus nooit een t erbij. Achter de zin staat een <b>!</b> of een <b>.</b></p>'
  ],
  kaarten:[
    ['Wat is de imperatief?','De gebiedende wijs: je beveelt, vraagt of raadt aan om iets te doen'],
    ['Hoe vorm je de imperatief?','Met de stam (ik-vorm), zonder onderwerp en zonder t'],
    ['Imperatief van worden?','Word (Word niet boos!), zonder t'],
    ['Imperatief van zijn?','Wees (Wees stil!)'],
    ['Imperatief van houden?','Houd of hou (beide juist)'],
    ['Hoe maak je de imperatief beleefd?','Met u + t (Komt u binnen) of met maar, eens, even, alsjeblieft'],
    ['Hoe herken je een zin met imperatief?','De persoonsvorm staat vooraan en er is geen onderwerp'],
  ],
  quiz:[
    {t:'mc',v:'Welke imperatief is juist gespeld?',o:['Word niet boos!','Wordt niet boos!','Wort niet boos!','Worden niet boos!'],a:0},
    {t:'mc',v:'Welke imperatief is juist gespeld?',o:['Antwoord in een volzin.','Antwoordt in een volzin.','Antwoort in een volzin.','Antwoorden in een volzin.'],a:0},
    {t:'mc',v:'Wat is de imperatief van “zijn”?',o:['Wees','Ben','Zijt','Zijn'],a:0},
    {t:'mc',v:'Welke zin bevat een imperatief?',o:['Lees de opdracht twee keer.','Jij leest de opdracht.','Lees jij de opdracht?','Hij leest de opdracht.'],a:0},
    {t:'mc',v:'Welke zin is beleefd?',o:['Neemt u plaats.','Neem plaats!','Plaats nemen!','Neem jij plaats?'],a:0},
    {t:'mc',v:'Kies juist: “… je kamer op!” (opruimen)',o:['Ruim','Ruimt','Ruimen','Geruimd'],a:0},
    {t:'jf',v:'Bij een imperatief staat er altijd een onderwerp.',a:false,u:'Net niet: er staat geen onderwerp.'},
    {t:'jf',v:'“Hou je vast!” en “Houd je vast!” zijn allebei juist.',a:true},
    {t:'invul',v:'Imperatief van “vinden”: … de fout in de zin.',a:['Vind','vind']},
    {t:'invul',v:'Imperatief van “rijden”: … voorzichtig!',a:['Rijd','rijd']},
    {t:'open',v:'Schrijf zelf 2 zinnen met een imperatief die een skateleraar zou zeggen. Let op de spelling.',m:'Bv.: Buig je knieën! Kijk vooruit en niet naar je voeten. (stam, geen onderwerp, geen t)'}
  ]
},
{
  id:'N16', vak:'ned', titel:'Het verkleinwoord',
  bron: B('p. 139–142'),
  samenvatting:[
    '<h4>🤏 Wanneer gebruik je een verkleinwoord?</h4><ul><li>iets is <b>klein</b>: een huis<b>je</b></li><li>je vindt iets <b>lief</b> of schattig: een poes<b>je</b></li><li>soms <b>spottend</b> of minachtend: een baan<b>tje</b> van niks</li></ul><p>Verkleinwoorden zijn altijd <b>het-woorden</b>: de pop → <b>het</b> popje.</p>',
    '<h4>🧩 Vijf uitgangen</h4><table class="lp-ww lp-tijd"><tr><td>-je</td><td>de meeste woorden<br><small class="muted">boek<b>je</b>, kast<b>je</b>, hoed<b>je</b>, pop<b>je</b>, board<b>je</b></small></td></tr><tr><td>-tje</td><td>na een <b>lange klinker</b>, tweeklank of na <b>-l, -n, -r, -w</b> (na lange klinker)<br><small class="muted">la → la<b>tje</b>, ei → ei<b>tje</b>, stoel → stoel<b>tje</b>, schoen → schoen<b>tje</b>, figuur → figuur<b>tje</b></small></td></tr><tr><td>-pje</td><td>na een <b>lange klinker + m</b>, of na <b>-lm, -rm</b><br><small class="muted">boom → boom<b>pje</b>, film → film<b>pje</b>, arm → arm<b>pje</b></small></td></tr><tr><td>-etje</td><td>na een <b>korte klinker + l, m, n, r, ng</b> → medeklinker <b>verdubbelt</b><br><small class="muted">bal → bal<b>letje</b>, kam → kam<b>metje</b>, pan → pan<b>netje</b>, ster → ster<b>retje</b>, ring → ring<b>etje</b></small></td></tr><tr><td>-kje</td><td>na <b>-ing</b> in een onbeklemtoonde lettergreep<br><small class="muted">koning → konin<b>kje</b>, woning → wonin<b>kje</b></small></td></tr></table>',
    '<h4>✍️ Spellingvalkuilen</h4><ul><li><b>Lange klinker</b> blijft lang: auto → auto<b>’tje</b> (apostrof na a, i, o, u, y): foto’tje, menu’tje, baby’tje · maar: ee, ie, oe: zee<b>tje</b>, knie<b>tje</b></li><li><b>Korte klinker</b> + l/m/n/r → verdubbelen: bal → ba<b>ll</b>etje, ster → ste<b>rr</b>etje</li><li>Woorden op <b>-ing</b>: ring → ring<b>etje</b> (beklemtoond), koning → konin<b>kje</b> (onbeklemtoond)</li></ul><p class="lp-tip">💡 Twijfel? Zeg het woord <b>hardop</b>: je hoort meestal welke uitgang past. Schrijf daarna de klinker en medeklinker juist.</p>'
  ],
  kaarten:[
    ['Wanneer gebruik je een verkleinwoord?','Als iets klein is, als je iets lief vindt, of soms spottend'],
    ['Is een verkleinwoord een de- of het-woord?','Altijd een het-woord'],
    ['Welke 5 uitgangen heeft het verkleinwoord?','-je, -tje, -pje, -etje, -kje'],
    ['Verkleinwoord van bal, kam, ster?','balletje, kammetje, sterretje (korte klinker: medeklinker verdubbelt + -etje)'],
    ['Verkleinwoord van boom, film, arm?','boompje, filmpje, armpje (-pje)'],
    ['Verkleinwoord van stoel, schoen, figuur?','stoeltje, schoentje, figuurtje (-tje)'],
    ['Verkleinwoord van koning?','koninkje (-kje)'],
    ['Verkleinwoord van auto, foto?','auto’tje, foto’tje (met apostrof)'],
    ['Verkleinwoord van ring?','ringetje'],
  ],
  quiz:[
    {t:'mc',v:'Verkleinwoord van “bal”?',o:['balletje','baltje','balletjes','baaltje'],a:0},
    {t:'mc',v:'Verkleinwoord van “boom”?',o:['boompje','boomtje','boommetje','boomje'],a:0},
    {t:'mc',v:'Verkleinwoord van “figuur”?',o:['figuurtje','figuurje','figuurrtje','figuurpje'],a:0},
    {t:'mc',v:'Verkleinwoord van “foto”?',o:['foto’tje','fototje','fotootje','fotoje'],a:0},
    {t:'mc',v:'Verkleinwoord van “koning”?',o:['koninkje','koningetje','koningje','koningtje'],a:0},
    {t:'mc',v:'Verkleinwoord van “ster”?',o:['sterretje','stertje','sterje','sterrtje'],a:0},
    {t:'mc',v:'Welk lidwoord krijgt een verkleinwoord?',o:['het','de','een of de','de of het'],a:0},
    {t:'invul',v:'Verkleinwoord van “film”: een … .',a:['filmpje']},
    {t:'invul',v:'Verkleinwoord van “schoen”: een … .',a:['schoentje']},
    {t:'invul',v:'Verkleinwoord van “kam”: een … .',a:['kammetje']},
    {t:'invul',v:'Verkleinwoord van “ring”: een … .',a:['ringetje']},
    {t:'jf',v:'“Het baantje van niks” is een verkleinwoord dat spottend gebruikt wordt.',a:true},
    {t:'open',v:'Geef het verkleinwoord van: skateboard, wiel, arm, pop, auto. Welke uitgang gebruik je telkens?',m:'skateboardje (-je), wieltje (-tje: lange klank + l), armpje (-pje: rm), popje (-je), auto’tje (-tje met apostrof).'}
  ]
}
);
})();
