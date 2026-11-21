// Natuurwetenschappen (1A) — examen vr 11/12. Explo 1, Thema 1 Biotoopstudie (p. 10–47),
// volgens het leerstofoverzicht Kerstexamens dat papa op 21/11 mailde.
// NIET te kennen: Focus "Overleven in het donker" (p. 24–25) en Les 5 Veldwerk (p. 31).
(function(){
const EXPLO = 'https://drive.google.com/file/d/1fiQX-k6EWSrC5fgCKPkNtq3YA3gN1A5t/view';
const B = p => [['Explo 1 · Thema 1 Biotoopstudie · ' + p, EXPLO]];
const blad = '<svg viewBox="0 0 340 205" style="width:100%;max-width:380px;display:block;margin:6px auto" font-size="13">'
  + '<path d="M90 140 C 70 70, 170 20, 260 30 C 240 110, 160 160, 90 140 Z" fill="#b2f2bb" stroke="#2f9e44" stroke-width="3"/>'
  + '<path d="M90 140 L 260 30" stroke="#2b8a3e" stroke-width="3" fill="none"/>'
  + '<g stroke="#2b8a3e" stroke-width="1.6" fill="none"><path d="M125 117 L 112 80"/><path d="M165 91 L 155 52"/><path d="M205 66 L 200 36"/><path d="M135 111 L 165 133"/><path d="M175 85 L 207 110"/><path d="M215 59 L 240 72"/></g>'
  + '<path d="M90 140 L 52 173" stroke="#2b8a3e" stroke-width="4"/><path d="M54 171 L 40 183" stroke="#2b8a3e" stroke-width="8" stroke-linecap="round"/>'
  + '<g stroke="#868e96" stroke-width="1.2"><line x1="240" y1="17" x2="228" y2="29"/><line x1="272" y1="58" x2="236" y2="46"/><line x1="272" y1="98" x2="241" y2="73"/><line x1="150" y1="178" x2="150" y2="122"/><line x1="64" y1="140" x2="72" y2="155"/><line x1="44" y1="191" x2="42" y2="186"/></g>'
  + '<g style="fill:var(--inkt)" font-weight="700"><text x="244" y="16">bladrand</text><text x="276" y="62">hoofdnerf</text><text x="276" y="102">zijnerf</text><text x="150" y="194" text-anchor="middle">bladschijf</text><text x="4" y="136">bladsteel</text><text x="4" y="202">bladschede</text></g></svg>';
const piramide = '<svg viewBox="0 0 300 150" style="width:100%;max-width:340px;display:block;margin:6px auto" font-size="13" text-anchor="middle">'
  + '<polygon points="150,10 180,40 120,40" fill="#ffc9c9" stroke="#c92a2a"/>'
  + '<polygon points="120,42 180,42 210,72 90,72" fill="#ffd8a8" stroke="#e8590c"/>'
  + '<polygon points="90,74 210,74 240,104 60,104" fill="#ffec99" stroke="#f08c00"/>'
  + '<polygon points="60,106 240,106 270,136 30,136" fill="#b2f2bb" stroke="#2f9e44"/>'
  + '<g style="fill:#212529" font-weight="700"><text x="150" y="35">uil</text><text x="150" y="63">muizen</text><text x="150" y="95">rupsen</text><text x="150" y="127">planten (producenten)</text></g>'
  + '</svg>';
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'B1', vak:'nat', titel:'Wat zijn de kenmerken van een biotoop?',
  bron: B('les 1, p. 10–14'),
  samenvatting:[
    '<h4>🌳 Een biotoop</h4><p>Een <b>biotoop</b> is een natuurlijke <b>leefomgeving</b>. Biotopen kunnen heel groot zijn (de aarde) of heel klein (een waterdruppel). Elk biotoop heeft zijn eigen kenmerken: de <b>biotische</b> en de <b>abiotische</b> factoren.</p><div class="lp-vs"><div><b>Biotische factoren</b><b>levende</b> omgevingsfactoren = de <b>organismen</b><small>planten, dieren, mensen, zwammen, bacteriën</small></div><div><b>Abiotische factoren</b><b>niet-levende</b> omgevingsfactoren<small>temperatuur, licht, neerslag, (lucht)vochtigheid, wind, bodem</small></div></div><p class="lp-tip">🧠 <b>a-</b> betekent <b>niet</b> (zoals in a-sociaal). <b>Bio</b> = leven. Dus <b>a-biotisch = niet-levend</b>. Een <b>organisme</b> = een levend wezen.</p>',
    '<h4>🔁 Ze beïnvloeden het biotoop</h4><p>Zowel biotische als abiotische factoren <b>beïnvloeden</b> het biotoop. Daardoor kunnen sommige organismen er <b>beter overleven</b> dan andere.</p><table class="lp-ww lp-tijd"><tr><td>bomen in een bos (biotisch)</td><td>geven <b>schaduw</b>: op de bosbodem is het donkerder, koeler en vochtiger → daar groeien andere planten</td></tr><tr><td>lieveheersbeestje (biotisch)</td><td>de larven eten ±100 <b>bladluizen</b> per dag → de planten blijven gezonder</td></tr><tr><td>Japanse duizendknoop (biotisch)</td><td>groeit razendsnel en <b>verdringt</b> andere planten</td></tr><tr><td>nestkastjes (door de mens)</td><td>meer vogels kunnen broeden → meer vogels in het bos</td></tr><tr><td>veel regen (abiotisch)</td><td>in het tropisch regenwoud groeien planten <b>weelderig</b></td></tr><tr><td>geen licht (abiotisch)</td><td>in een grot groeien <b>geen planten</b>; enkel aangepaste dieren leven er</td></tr><tr><td>sluikstort (abiotisch)</td><td>afval <b>vervuilt</b> de bodem en het water → planten en dieren worden ziek</td></tr></table>',
    '<h4>🗺️ Oefen: biotisch of abiotisch?</h4><table class="lp-ww"><tr><td>Noordpool</td><td>biotisch: ijsbeer, zeehond</td><td>abiotisch: vrieskou, ijs</td></tr><tr><td>wegberm</td><td>biotisch: gras, paardenbloem</td><td>abiotisch: uitlaatgassen, zon</td></tr><tr><td>heide</td><td>biotisch: struikhei, hagedis</td><td>abiotisch: droge zandbodem</td></tr><tr><td>tropisch regenwoud</td><td>biotisch: apen, lianen</td><td>abiotisch: veel regen, warm</td></tr></table><p class="lp-tip">🎯 Op het examen moet je ze <b>herkennen in een tekst</b>, <b>benoemen</b> én zelf <b>voorbeelden</b> geven. En je moet met een voorbeeld kunnen uitleggen <b>welke invloed</b> een factor heeft.</p>'
  ],
  kaarten:[
    ['Wat is een biotoop?','Een (natuurlijke) leefomgeving'],
    ['Wat zijn biotische factoren?','Levende omgevingsfactoren: de organismen (planten, dieren, mensen, zwammen …)'],
    ['Wat zijn abiotische factoren?','Niet-levende omgevingsfactoren (temperatuur, licht, neerslag, vochtigheid, bodem …)'],
    ['Wat is een organisme?','Een levend wezen'],
    ['Geef 3 abiotische factoren','Bv. temperatuur, licht, neerslag, vochtigheid, wind, bodem'],
    ['Geef 3 biotische factoren','Bv. bomen, vogels, zwammen, bacteriën, mensen'],
    ['Welke invloed hebben bomen op een bos?','Ze geven schaduw: de bosbodem is donkerder, koeler en vochtiger'],
    ['Welke invloed heeft het lieveheersbeestje?','Het eet bladluizen, zodat planten gezonder blijven'],
    ['Waarom groeien er geen planten in een grot?','Er is geen licht (abiotische factor)']
  ],
  quiz:[
    {t:'mc',v:'Welke factor is <b>abiotisch</b>?',o:['de temperatuur','een eik','een mol','een paddenstoel'],a:0},
    {t:'mc',v:'Welke factor is <b>biotisch</b>?',o:['een paddenstoel','de neerslag','het zonlicht','de wind'],a:0},
    {t:'mc',v:'Wat is een biotoop?',o:['een leefomgeving','een levend wezen','een plantensoort','een meetinstrument'],a:0},
    {t:'mc',v:'“In de woestijn valt bijna nooit regen.” Over welke factor gaat het?',o:['een abiotische factor','een biotische factor','een organisme','een aanpassing'],a:0},
    {t:'mc',v:'“Konijnen eten de jonge plantjes in de duinen op.” Over welke factor gaat het?',o:['een biotische factor','een abiotische factor','de bodem','het klimaat'],a:0},
    {t:'mc',v:'Welke invloed hebben veel bomen op de bosbodem?',o:['Er komt minder licht, het is koeler en vochtiger','Het wordt warmer en droger','Er groeien meer zonneplanten','Geen enkele'],a:0},
    {t:'mc',v:'Wat doet de Japanse duizendknoop met een biotoop?',o:['Hij verdringt andere planten','Hij geeft voedsel aan alle dieren','Hij maakt de bodem schoon','Hij vangt bladluizen'],a:0},
    {t:'jf',v:'Een bacterie is een biotische factor.',a:true,u:'Een bacterie is een levend wezen, dus een organisme.'},
    {t:'jf',v:'De samenstelling van de bodem is een biotische factor.',a:false,u:'De bodem leeft niet: abiotisch.'},
    {t:'jf',v:'Abiotische factoren hebben geen invloed op de organismen in een biotoop.',a:false,u:'Zowel biotische als abiotische factoren beïnvloeden het biotoop.'},
    {t:'invul',v:'Niet-levende omgevingsfactoren noem je … factoren.',a:['abiotische','abiotisch']},
    {t:'open',v:'Geef van een vijver twee biotische en twee abiotische factoren.',m:'Biotisch: bv. kikker, waterlelie, vis, eend, algen. Abiotisch: bv. watertemperatuur, licht, zuurstof in het water, modderbodem.'},
    {t:'open',v:'In een grot is er weinig tot geen daglicht. Welke invloed heeft dat op het biotoop?',m:'Zonder licht kunnen er geen (groene) planten groeien. Er leven enkel dieren die aangepast zijn aan het donker (bv. vleermuizen, blinde grotdieren).'}
  ]
},
{
  id:'B2', vak:'nat', titel:'Hoe overleven planten in hun biotoop?',
  bron: B('les 2, p. 15–19'),
  samenvatting:[
    '<h4>🌱 Aangepast = meer kans</h4><div class="lp-ketting"><span>goed aangepast</span><i>→</i><span>grotere overlevingskans</span><i>→</i><span>meer kans op voortplanting</span><i>→</i><span>soort blijft bestaan</span></div><p>Komt een plant in een biotoop terecht waaraan hij <b>niet aangepast</b> is, dan groeit hij slecht of <b>sterft</b> hij.</p>',
    '<h4>🌵 Aanpassingen en hun nut</h4><table class="lp-ww lp-tijd"><tr><td>stekels, doornen, brandharen</td><td><b>verdediging</b> tegen dieren die hen willen opeten (vraat)<small> braam, roos, cactus, brandnetel</small></td></tr><tr><td>hechtwortels, klimmende of draaiende stengels</td><td>naar boven klimmen om <b>veel licht</b> op te vangen<small> klimop (hechtwortels), haagwinde en bonenplant (draaiende stengel)</small></td></tr><tr><td>drijvende, grote platte bladeren met luchtholtes + lange bladsteel</td><td><b>in (diep) water overleven</b> en veel licht opvangen<small> waterlelie</small></td></tr><tr><td>naaldvormige bladeren, doornen, bladverlies</td><td><b>minder water verdampen</b>, niet uitdrogen<small> den (naalden), cactus (doornen), loofbomen verliezen in de winter hun bladeren</small></td></tr><tr><td>dikke, sappige stengel of bladeren vol water</td><td>water <b>opslaan</b> om op <b>droge grond</b> te overleven<small> cactus, levende steentjes</small></td></tr><tr><td>zuigwortels</td><td><b>water en mineralen opzuigen</b> uit een andere plant<small> maretak (in de tak van een boom)</small></td></tr><tr><td>kleverige haartjes die insecten vangen</td><td>extra voedingsstoffen op <b>arme, natte grond</b><small> zonnedauw</small></td></tr></table>',
    '<h4>🌼 Nog meer voorbeelden uit je boek</h4><table class="lp-ww lp-tijd"><tr><td>paardenbloem</td><td>bladeren plat tegen de grond (<b>rozet</b>) → niet kapot bij vertrappelen · <b>vruchtpluisje</b> → zaadjes waaien ver weg</td></tr><tr><td>esdoorn</td><td>zaden met <b>vleugeltjes</b> → ze dwarrelen ver weg van de boom, waar meer licht en water is</td></tr><tr><td>Gelderse roos</td><td>grote, <b>opvallende</b> witte bloemen aan de rand → insecten vinden de kleine bloempjes in het midden en bestuiven ze</td></tr></table><p class="lp-tip">🎯 Je moet <b>zelf geen voorbeelden</b> verzinnen. Bij een <b>gegeven</b> plant moet je de aanpassing <b>herkennen</b>, <b>benoemen</b> en het <b>nut</b> uitleggen.</p>',
    '<h4>🍇 De mens past planten aan: veredelen</h4><p>Telers <b>selecteren</b> planten met de gewenste eigenschappen, <b>kruisen</b> ze met elkaar of veranderen het <b>erfelijk materiaal</b>. Dat noem je <b>veredelen</b>.</p><p class="lp-vb">Pitloze druiven: steeds verder kweken met druiven met kleinere pitten · gele SunGold-kiwi: sappiger en zoeter dan de groene</p>'
  ],
  kaarten:[
    ['Waarom zijn aanpassingen belangrijk voor een plant?','Ze vergroten de overlevingskans, zodat de plant zich kan voortplanten en de soort in stand blijft'],
    ['Nut van stekels, doornen en brandharen?','Bescherming tegen vraat (dieren die hen opeten)'],
    ['Nut van hechtwortels of klimmende stengels?','Naar boven klimmen om voldoende licht op te vangen'],
    ['Nut van naaldvormige bladeren?','Minder water verdampen (niet uitdrogen)'],
    ['Waarom verliezen loofbomen hun bladeren in de winter?','Om niet uit te drogen: bij lage temperaturen kunnen de wortels moeilijk water opnemen'],
    ['Nut van zuigwortels (maretak)?','Water en mineralen opzuigen uit een andere plant'],
    ['Hoe overleeft de waterlelie in diep water?','Lange bladsteel en grote, platte drijvende bladeren met luchtholtes'],
    ['Waarom vangt de zonnedauw insecten?','Hij groeit op arme grond en haalt zo extra voedingsstoffen'],
    ['Wat is veredelen?','De mens past planten (of dieren) aan door te selecteren, te kruisen of het erfelijk materiaal te veranderen'],
    ['Wat gebeurt er met een plant in een biotoop waaraan hij niet aangepast is?','Hij groeit slecht of sterft']
  ],
  quiz:[
    {t:'mc',v:'Een cactus heeft doornen en een dikke, sappige stengel. Wat is het nut?',o:['Verdediging en water opslaan op droge grond','Veel licht opvangen','In water overleven','Insecten vangen'],a:0},
    {t:'mc',v:'De klimop heeft hechtwortels. Waarom?',o:['Om naar boven te klimmen naar het licht','Om water op te zuigen uit bomen','Tegen vraat','Om te drijven'],a:0},
    {t:'mc',v:'De maretak heeft zuigwortels in de tak van een boom. Waarvoor?',o:['Water en mineralen opzuigen uit de boom','Tegen vraat','Om te drijven','Om minder te verdampen'],a:0},
    {t:'mc',v:'Een den heeft naaldvormige bladeren. Wat is het nut?',o:['Minder water verdampen','Veel licht opvangen','Insecten vangen','Drijven op water'],a:0},
    {t:'mc',v:'De brandnetel heeft brandharen. Wat is het nut?',o:['Verdediging tegen dieren','Water opslaan','Naar het licht klimmen','Zaden verspreiden'],a:0},
    {t:'mc',v:'De esdoorn heeft zaden met vleugeltjes. Wat is het nut?',o:['De zaden komen ver van de boom terecht, waar meer licht en water is','Ze beschermen tegen vraat','Ze slaan water op','Ze trekken bijen aan'],a:0},
    {t:'mc',v:'De bladeren van de paardenbloem liggen plat tegen de grond. Waarom?',o:['Zo raken ze niet beschadigd als ze vertrappeld worden','Om insecten te vangen','Om minder licht te krijgen','Om te drijven'],a:0},
    {t:'mc',v:'Hoe noem je het als telers planten met gewenste eigenschappen selecteren en kruisen?',o:['veredelen','determineren','verdampen','ontbinden'],a:0},
    {t:'jf',v:'Hoe beter een plant aangepast is, hoe groter zijn overlevingskans.',a:true},
    {t:'jf',v:'Loofbomen verliezen in de winter hun bladeren om meer licht te krijgen.',a:false,u:'Om uitdroging te voorkomen: in de kou kunnen de wortels moeilijk water opnemen.'},
    {t:'jf',v:'Pitloze druiven zijn ontstaan door veredeling.',a:true},
    {t:'invul',v:'Stekels en doornen beschermen een plant tegen … (dieren die hem opeten).',a:['vraat']},
    {t:'open',v:'De waterlelie heeft grote platte bladeren met luchtholtes en een zeer lange bladsteel. Leg uit waarom dat handig is.',m:'Door de lange bladsteel kan ze in diep water groeien. De luchtholtes laten de bladeren drijven, en de grote platte bladeren vangen veel licht op.'}
  ]
},
{
  id:'B3', vak:'nat', titel:'Hoe overleven dieren in hun biotoop? Schutkleur en selectie',
  bron: B('les 3, p. 20–23'),
  samenvatting:[
    '<h4>🦎 Aanpassingen bij dieren</h4><p>Een dier dat <b>veilig</b> is en genoeg <b>voedsel</b> vindt, heeft een grotere overlevingskans en dus meer kans om zich <b>voort te planten</b>. De aanpassingen dienen voor:</p><div class="lp-tegels"><div><i>🛡️</i><b>veiligheid</b><small>schutkleur, waarschuwings&shy;geluiden, loop- en springpoten, ogen opzij (groot gezichtsveld)</small></div><div><i>🍽️</i><b>voedsel</b><small>lange kleverige tong, beweeglijke slurf, slagtanden, scherpe kaken, sterke snavel</small></div><div><i>💘</i><b>voortplanting</b><small>paringsritueel, lokroep, felle kleuren, veel eitjes</small></div></div>',
    '<h4>📋 Voorbeelden uit je boek</h4><table class="lp-ww lp-tijd"><tr><td>haas</td><td>doorgroeiende snijtanden (voedsel) · paringsritueel: vechten om een partner (voortplanting)</td></tr><tr><td>kameleon</td><td>kleurverandering om af te schrikken (veiligheid) en om vrouwtjes te lokken (voortplanting) · ogen die apart bewegen: vijanden én prooien sneller zien</td></tr><tr><td>pauw</td><td>snel lopen om te vluchten, luide waarschuwingsgeluiden (veiligheid) · sterke snavel voor fruit en zaden (voedsel)</td></tr><tr><td>lieveheersbeestje</td><td>scherpe kaken voor bladluizen, vleugels om nieuw voedsel te zoeken (voedsel) · 20 à 50 eitjes per dag (voortplanting)</td></tr><tr><td>olifant</td><td>grote oren om af te koelen · lange draagtijd (22 maanden): slimme jongen die de kudde kunnen volgen</td></tr><tr><td>kikker</td><td>lange kleverige tong (voedsel) · kwaken om vrouwtjes te lokken (voortplanting)</td></tr><tr><td>slanke lori</td><td>extra wervels: lenig op takken · lange vingers en tenen: vastklampen · grote ogen: ’s nachts zien · goede reukzin: voedsel vinden</td></tr></table>',
    '<h4>🍂 Schutkleur</h4><p>Een <b>schutkleur</b> is een kleur (en tekening) waardoor een dier <b>niet opvalt</b> in zijn omgeving: het lijkt op zijn achtergrond.</p><div class="lp-vs"><div><b>Voordeel voor een prooidier</b>de <b>vijanden zien het niet</b>, dus het wordt minder snel opgegeten<small>haas in een akker, nachtvlinder op boomschors</small></div><div><b>Voordeel voor een roofdier</b>het kan zijn prooi <b>onopgemerkt besluipen</b><small>uil, vos</small></div></div><p class="lp-tip">✍️ Op het examen moet je bij een gegeven dier <b>zelf het voordeel</b> van de schutkleur opschrijven. Zeg altijd: <b>valt niet op</b> → <b>vijand/prooi ziet het niet</b> → <b>grotere overlevingskans</b>.</p>',
    '<h4>🐕 Selectie (p. 22)</h4><p><b>Selectie</b> = je <b>kiest</b> de dieren (of planten) met de <b>gewenste eigenschappen</b> en laat <b>enkel die</b> zich voortplanten. De ouders geven hun eigenschappen door aan hun <b>nakomelingen</b>. Doe je dat generatie na generatie, dan wordt die eigenschap steeds sterker.</p><div class="lp-ketting"><span>kies de beste ouders</span><i>→</i><span>jongen erven de eigenschap</span><i>→</i><span>kies opnieuw de beste</span><i>→</i><span>eigenschap wordt steeds sterker</span></div><p>Samen met <b>kruisen</b> (dieren van verschillende rassen) en het <b>erfelijk materiaal veranderen</b> noem je dit <b>veredelen</b>.</p><p class="lp-vb">Labradoodle = labrador × poedel: zachtaardig karakter + slimme poedel met poedelvacht · Belgisch Witblauw (1973): veel spieren en veel vlees, maar de kalfjes moeten met een <b>keizersnede</b> geboren worden<br>Ander voorbeeld: een kweker laat enkel de <b>snelste duiven</b> jongen krijgen → na veel generaties heeft hij supersnelle wedstrijdduiven.</p>'
  ],
  kaarten:[
    ['Waarvoor dienen de aanpassingen van dieren?','Voor veiligheid, voedsel en voortplanting'],
    ['Wat is een schutkleur?','Een kleur waardoor een dier niet opvalt in zijn omgeving'],
    ['Voordeel van een schutkleur voor een prooidier?','Vijanden zien het niet, dus het wordt minder snel opgegeten'],
    ['Voordeel van een schutkleur voor een roofdier?','Het kan zijn prooi onopgemerkt besluipen'],
    ['Wat is selectie?','De dieren of planten met de gewenste eigenschappen kiezen en enkel die laten voortplanten, zodat hun jongen die eigenschappen erven'],
    ['Wat is veredelen?','Planten of dieren aanpassen door selectie, kruising of het erfelijk materiaal te veranderen'],
    ['Wat is een labradoodle?','Een kruising van een labrador en een poedel'],
    ['Nadeel van het Belgisch Witblauw?','Door de grote spiermassa kan de koe niet natuurlijk kalveren (keizersnede)'],
    ['Waarom heeft een olifant grote oren?','Om af te koelen'],
    ['Waarom heeft een kikker een lange kleverige tong?','Om prooien te vangen']
  ],
  quiz:[
    {t:'mc',v:'Een sneeuwhaas is in de winter wit. Wat is het voordeel?',o:['Hij valt niet op in de sneeuw, dus vijanden zien hem minder snel','Hij heeft het minder koud','Hij lokt er partners mee','Hij vindt zo sneller voedsel'],a:0},
    {t:'mc',v:'Een tijger heeft strepen die lijken op het hoge gras. Wat is het voordeel?',o:['Hij kan zijn prooi onopgemerkt besluipen','Hij schrikt vijanden af','Hij koelt sneller af','Hij lokt vrouwtjes'],a:0},
    {t:'mc',v:'Voor welk doel dient het paringsritueel van de haas?',o:['voortplanting','voedsel','veiligheid','afkoeling'],a:0},
    {t:'mc',v:'De pauw maakt luide waarschuwingsgeluiden. Waarvoor?',o:['veiligheid: soortgenoten verwittigen bij gevaar','voedsel vinden','afkoelen','eitjes leggen'],a:0},
    {t:'mc',v:'Een fokker laat enkel de koeien met de meeste melk kalveren krijgen. Hoe heet dat?',o:['selectie','schutkleur','determineren','ontbinden'],a:0},
    {t:'mc',v:'Waarom heeft een lieveheersbeestje een grote overlevingskans voor de soort?',o:['Het legt 20 tot 50 eitjes per dag','Het heeft een schutkleur','Het kan zwemmen','Het eet planten'],a:0},
    {t:'mc',v:'De slanke lori heeft grote ogen. Wat zegt dat?',o:['Het is een nachtdier dat ’s nachts goed kan zien','Het is een waterdier','Het eet enkel planten','Het leeft onder de grond'],a:0},
    {t:'jf',v:'Een schutkleur zorgt ervoor dat een dier opvalt in zijn omgeving.',a:false,u:'Net omgekeerd: het dier valt níet op.'},
    {t:'jf',v:'Bij selectie geven de ouders hun eigenschappen door aan hun nakomelingen.',a:true},
    {t:'jf',v:'Een labradoodle is ontstaan door kruising.',a:true},
    {t:'invul',v:'Een kleur waardoor een dier niet opvalt in zijn omgeving noem je een … .',a:['schutkleur']},
    {t:'open',v:'Een nachtvlinder heeft vleugels met dezelfde kleur en tekening als boomschors. Schrijf het voordeel van deze schutkleur op.',m:'Overdag zit hij op een boomstam en valt hij niet op. Vogels zien hem niet, dus hij wordt minder snel opgegeten: grotere overlevingskans en meer kans om zich voort te planten.'},
    {t:'open',v:'Leg het mechanisme van selectie uit met een eigen voorbeeld (niet uit het boek).',m:'Bv. een kweker wil grote tomaten. Hij houdt enkel zaden van de grootste tomaten bij en zaait die. De nieuwe planten erven die eigenschap. Door dat elk jaar te herhalen, worden de tomaten steeds groter.'}
  ]
},
{
  id:'B4', vak:'nat', titel:'De naam van organismen opzoeken: determineren en bladdelen',
  bron: B('les 4, p. 26–30'),
  samenvatting:[
    '<h4>🔎 Determineren</h4><p><b>Determineren</b> = de <b>naam</b> van een organisme <b>opzoeken</b> aan de hand van zijn <b>kenmerken</b>. Je gebruikt <b>zoekkaarten</b>, <b>determineertabellen</b> of <b>apps</b> (ObsIdentify, Pl@ntNet, Seek; voor vogelgeluiden Bird.net).</p><ul><li>Kijk <b>nauwkeurig</b> naar de kenmerken, anders kom je bij een foute naam uit.</li><li><b>Controleer</b> daarna de naam: zoek foto’s en info op en vergelijk.</li><li>Dieren kan je ook herkennen aan hun <b>sporen</b>: keutels, pootafdrukken, nesten, braakballen, afgeknaagde dennenappels, galappels …</li></ul>',
    '<h4>🍃 De delen van een blad (aanduiden en benoemen!)</h4>' + blad + '<p>Planten determineer je met de kenmerken van <b>bladeren</b>, stengels, wortels, bloemen en vruchten. Je start best met de <b>bladeren</b>: die zijn er van de lente tot de herfst en verschillen duidelijk.</p>',
    '<h4>🧐 Welke bladkenmerken gebruik je? (p. 28)</h4><table class="lp-ww lp-tijd"><tr><td>de nerven</td><td><b>één hoofdnerf</b> met zijnerven (bv. beuk) of <b>meerdere grote nerven</b> vanuit één punt (bv. esdoorn, klimop)</td></tr><tr><td>de bladschijf</td><td><b>één geheel</b> of opgebouwd uit <b>deelblaadjes</b> (bv. acacia) · <b>ingesneden</b>: meer of minder dan <b>1/4</b> naar de nerf toe (bv. Amerikaanse eik: diep ingesneden)</td></tr><tr><td>de bladrand</td><td><b>gaaf</b> (glad) · met <b>scherpe uitsteeksels</b> (bv. hulst: puntig) · met <b>stompe uitsteeksels</b> (afgerond) · met <b>stompe insnijdingen</b> (golvend)</td></tr></table><p class="lp-tip">🖐️ Ezelsbrug: kijk van <b>binnen naar buiten</b>: eerst de <b>nerven</b>, dan de <b>bladschijf</b>, dan de <b>rand</b>. De officiële namen en tekeningen staan in je <b>vademecum p. 14</b>.</p>'
  ],
  kaarten:[
    ['Wat is determineren?','De naam van een organisme opzoeken aan de hand van zijn kenmerken'],
    ['Welke hulpmiddelen gebruik je om te determineren?','Zoekkaarten, determineertabellen en apps'],
    ['Waarom controleer je de naam na het determineren?','Om zeker te zijn dat je niet bij een foute naam uitkwam (foto’s en info vergelijken)'],
    ['Noem de delen van een blad','Bladschijf, bladrand, hoofdnerf, zijnerf, bladsteel, bladschede'],
    ['Welk deel verbindt de bladschijf met de stengel?','De bladsteel'],
    ['Met welke bladkenmerken determineer je?','De nerven, de bladschijf (deelblaadjes, insnijding) en de bladrand'],
    ['Hoe kan je dieren herkennen zonder ze te zien?','Aan hun sporen: keutels, pootafdrukken, nesten, braakballen …'],
    ['Welk blad bestaat uit deelblaadjes?','Bv. de acacia'],
    ['Welk blad heeft een rand met scherpe uitsteeksels?','Bv. de hulst']
  ],
  quiz:[
    {t:'mc',v:'Wat betekent determineren?',o:['de naam van een organisme opzoeken met zijn kenmerken','een plant laten groeien','de temperatuur meten','dieren kruisen'],a:0},
    {t:'mc',v:'Welk deel van het blad loopt in het midden over de hele lengte?',o:['de hoofdnerf','de bladrand','de bladschede','de bladsteel'],a:0},
    {t:'mc',v:'Welk deel is de buitenkant (omtrek) van het blad?',o:['de bladrand','de zijnerf','de bladsteel','de hoofdnerf'],a:0},
    {t:'mc',v:'Het platte, brede groene deel van een blad heet de…',o:['bladschijf','bladschede','bladsteel','bladnerf'],a:0},
    {t:'mc',v:'Welk kenmerk heeft het blad van de acacia?',o:['De bladschijf bestaat uit deelblaadjes','Eén grote naald','Scherpe stekels aan de rand','Geen nerven'],a:0},
    {t:'mc',v:'Welke app kan je gebruiken om planten te determineren?',o:['Pl@ntNet','Bird.net','Smartschool','Google Maps'],a:0},
    {t:'mc',v:'Je vindt een braakbal onder een boom. Wat kan je ermee?',o:['Ontdekken welk dier (bv. een uil) er leefde','De temperatuur meten','Een blad determineren','Niets'],a:0},
    {t:'mc',v:'Waarmee begin je best als je een plant determineert?',o:['met de bladeren','met de wortels','met de vruchten','met de grond'],a:0},
    {t:'jf',v:'Na het determineren met een app hoef je niets meer te controleren.',a:false,u:'Je controleert altijd de verkregen naam met foto’s en info.'},
    {t:'jf',v:'Een hulstblad heeft een rand met scherpe uitsteeksels.',a:true},
    {t:'invul',v:'De naam van een organisme opzoeken met zijn kenmerken noem je … .',a:['determineren']},
    {t:'open',v:'Noem de zes delen van een blad die je moet kunnen aanduiden.',m:'Bladschijf, bladrand, hoofdnerf, zijnerf, bladsteel en bladschede.'}
  ]
},
{
  id:'B5', vak:'nat', titel:'Voedselketen en voedselweb: wie eet wie?',
  bron: B('les 6–7, p. 32–34 en 37–39'),
  samenvatting:[
    '<h4>➡️ De voedselketen</h4><p>Een <b>voedselketen</b> is een aaneenschakeling van organismen waarbij elk organisme een <b>voedselbron</b> is voor het volgende. Elk organisme is een <b>schakel</b>.</p><div class="lp-ketting"><span>eik</span><i>→</i><span>rups</span><i>→</i><span>merel</span><i>→</i><span>sperwer</span></div><p class="lp-tip">➡️ De pijl lees je als “<b>… wordt gegeten door …</b>”. De pijl wijst dus naar <b>wie eet</b>. Eik → rups = de eik wordt gegeten door de rups. Let goed op de <b>richting</b> bij het tekenen én het lezen!</p>',
    '<h4>🌿 Producenten en 🐛 consumenten</h4><table class="lp-ww lp-tijd"><tr><td>1e schakel: <b>producenten</b> = voortbrengers</td><td><b>planten</b>: maken <b>zelf</b> hun voedsel met water, mineralen en zonlicht → <b>autotroof</b>. Elke voedselketen begint bij een plant.</td></tr><tr><td>andere schakels: <b>consumenten</b> = verbruikers</td><td><b>dieren</b>: eten andere organismen → <b>heterotroof</b></td></tr></table><div class="lp-tegels"><div><i>🥬</i><b>planteneters</b><small>= herbivoren<br>rups, konijn</small></div><div><i>🍔</i><b>alleseters</b><small>= omnivoren<br>merel, egel, mens</small></div><div><i>🥩</i><b>vleeseters</b><small>= carnivoren<br>sperwer, uil</small></div></div><div class="lp-vs"><div><b>Autotroof</b>maakt <b>zelf</b> zijn voedsel (planten)<small>auto = zelf</small></div><div><b>Heterotroof</b>moet <b>andere</b> organismen eten (dieren, schimmels, bacteriën)<small>hetero = ander</small></div></div>',
    '<h4>🗑️ De opruimers</h4><table class="lp-ww lp-tijd"><tr><td><b>afvaleters</b> = <b>detritivoren</b></td><td>eten <b>organisch afval</b> (dode dieren, afgevallen bladeren, uitwerpselen) en verkleinen het · regenworm, pissebed, vliegenlarve (made). Het zijn ook <b>consumenten</b>.</td></tr><tr><td><b>ontbinders</b> = <b>reducenten</b></td><td><b>schimmels en bacteriën</b>: breken het afval helemaal af tot <b>mineralen</b> voor de planten</td></tr></table><p>Afvaleters en ontbinders samen noem je de <b>opruimers</b>.</p>',
    '<h4>🕸️ Het voedselweb</h4><p>In een biotoop eten dieren meestal <b>meer dan één soort</b> voedsel. Verschillende voedselketens die met elkaar <b>verbonden</b> zijn, vormen een <b>voedselweb</b>.</p><p class="lp-vb">brandnetel → rups → roodborstje · brandnetel → bladluizen → lieveheersbeestje → roodborstje · eik → rups → egel · bladeren → regenworm → egel …</p><p class="lp-tip">✏️ Zo maak je er een: 1) schrijf de <b>planten</b> onderaan, 2) zet de dieren erboven, 3) teken pijlen <b>van wat gegeten wordt naar wie eet</b>, 4) onderstreep de producenten in het groen.</p>'
  ],
  kaarten:[
    ['Wat is een voedselketen?','Een aaneenschakeling van organismen waarbij elk organisme een voedselbron is voor het volgende'],
    ['Hoe lees je de pijl in een voedselketen?','“… wordt gegeten door …”'],
    ['Wat is een voedselweb?','Verschillende voedselketens die met elkaar verbonden zijn'],
    ['Wat zijn producenten (voortbrengers)?','Planten: ze maken zelf hun voedsel met water, mineralen en zonlicht'],
    ['Wat zijn consumenten (verbruikers)?','Organismen die andere organismen eten (dieren)'],
    ['Wat betekent autotroof?','Zelf zijn voedsel maken (planten)'],
    ['Wat betekent heterotroof?','Andere organismen moeten eten om voedsel te krijgen (dieren)'],
    ['Ander woord voor planteneters?','Herbivoren'],
    ['Ander woord voor vleeseters?','Carnivoren'],
    ['Ander woord voor alleseters?','Omnivoren'],
    ['Wat zijn detritivoren (afvaleters)?','Dieren die organisch afval eten, bv. regenworm, pissebed, made'],
    ['Wat zijn reducenten (ontbinders)?','Schimmels en bacteriën die organisch afval afbreken tot mineralen'],
    ['Hoe noem je afvaleters en ontbinders samen?','Opruimers'],
    ['Waarmee begint elke voedselketen?','Met een plant (producent)']
  ],
  quiz:[
    {t:'mc',v:'Hoe lees je “gras → konijn”?',o:['Gras wordt gegeten door het konijn','Het konijn wordt gegeten door gras','Gras eet het konijn','Konijn en gras zijn vrienden'],a:0},
    {t:'mc',v:'Welke voedselketen is juist getekend?',o:['sla → slak → egel → vos','vos → egel → slak → sla','slak → sla → egel → vos','egel → vos → sla → slak'],a:0},
    {t:'mc',v:'Waarom beginnen voedselketens altijd met een plant?',o:['Planten maken zelf hun voedsel (autotroof)','Planten zijn het grootst','Planten eten dieren','Planten zijn heterotroof'],a:0},
    {t:'mc',v:'Een merel eet rupsen, wormen én brood. De merel is een…',o:['omnivoor','herbivoor','carnivoor','producent'],a:0},
    {t:'mc',v:'Een sperwer eet enkel dieren. Hij is een…',o:['carnivoor','herbivoor','omnivoor','reducent'],a:0},
    {t:'mc',v:'Een rups eet bladeren. Ze is een…',o:['herbivoor','carnivoor','reducent','producent'],a:0},
    {t:'mc',v:'Welk organisme is <b>autotroof</b>?',o:['een eik','een merel','een schimmel','een regenworm'],a:0},
    {t:'mc',v:'Een pissebed eet afgevallen bladeren. Hij is een…',o:['detritivoor (afvaleter)','producent','carnivoor','reducent'],a:0},
    {t:'mc',v:'Welke organismen zijn reducenten (ontbinders)?',o:['schimmels en bacteriën','regenwormen en pissebedden','planten','vleeseters'],a:0},
    {t:'mc',v:'Ander woord voor producenten?',o:['voortbrengers','verbruikers','opruimers','afvaleters'],a:0},
    {t:'mc',v:'Ander woord voor consumenten?',o:['verbruikers','voortbrengers','ontbinders','producenten'],a:0},
    {t:'mc',v:'Bij welke groep horen de bodemdiertjes zoals regenwormen?',o:['detritivoren (opruimers)','producenten','reducenten','carnivoren'],a:0},
    {t:'jf',v:'De pijl in een voedselketen wijst naar het organisme dat eet.',a:true},
    {t:'jf',v:'Dieren zijn autotroof.',a:false,u:'Dieren zijn heterotroof: ze eten andere organismen.'},
    {t:'jf',v:'Detritivoren zijn ook consumenten.',a:true},
    {t:'invul',v:'Verschillende voedselketens die met elkaar verbonden zijn, vormen een … .',a:['voedselweb']},
    {t:'invul',v:'Planteneters noem je ook … .',a:['herbivoren','herbivoor']},
    {t:'open',v:'Maak een voedselketen van 4 schakels met: uil, gras, sprinkhaan, spitsmuis. Zeg bij elke schakel of het een producent of consument is.',m:'gras → sprinkhaan → spitsmuis → uil. Gras = producent; sprinkhaan, spitsmuis en uil = consumenten (sprinkhaan herbivoor, spitsmuis en uil carnivoor).'}
  ]
},
{
  id:'B6', vak:'nat', titel:'Voedselkringloop, voedselpiramide en ecologisch evenwicht',
  bron: B('les 6–7, p. 34–39'),
  samenvatting:[
    '<h4>♻️ De voedselkringloop</h4><div class="lp-stroom"><div><span><b>producenten</b> (planten) maken voedsel met zonlicht, water en mineralen</span><b>🌱</b></div><div><span>worden gegeten door <b>consumenten</b> (dieren)</span><b>🐛</b></div><div><span>planten en dieren <b>sterven</b> + uitwerpselen → <b>organisch afval</b></span><b>🍂</b></div><div><span>wordt gegeten door <b>afvaleters / detritivoren</b> (regenworm, pissebed)</span><b>🪱</b></div><div><span>wordt afgebroken door <b>ontbinders / reducenten</b> (schimmels, bacteriën) → <b>mineralen</b></span><b>🍄</b></div><div><span>de mineralen worden <b>opgenomen door de planten</b> → de kringloop is rond</span><b>🔁</b></div></div><p class="lp-tip">🎯 De <b>reducenten</b> zijn onmisbaar voor de producenten: zij leveren de <b>mineralen</b>. Op het examen moet je organismen <b>zelf in de kringloop plaatsen</b> en zeggen of ze producent, consument of opruimer zijn.</p>',
    '<h4>🔺 De voedselpiramide</h4>' + piramide + '<p>Een <b>voedselpiramide</b> is een <b>ruimtelijke voorstelling van een voedselketen in lagen</b>. Elke schakel is een laag. De <b>producenten</b> vormen de <b>basis</b>, de consumenten de lagen erboven. De grootte van een laag toont <b>hoeveel organismen</b> er nodig zijn als voedsel voor de laag erboven: naar boven toe <b>neemt het aantal af</b>.</p>',
    '<h4>⚖️ Ecologisch evenwicht</h4><p>Er is een <b>ecologisch evenwicht</b> als er van elke schakel <b>voldoende organismen</b> zijn: de basis is <b>breed</b>, de top is <b>smal</b>. Een plotse sterke <b>stijging of daling</b> van één soort <b>verstoort</b> het evenwicht, met gevolgen voor de hele keten.</p><table class="lp-ww lp-tijd"><tr><td>rupsen bestrijden</td><td>muizen <b>nemen af</b> (minder voedsel) · uilen <b>nemen af</b> · bladeren <b>nemen toe</b> (minder opgegeten)</td></tr><tr><td>muizen bestrijden</td><td>rupsen <b>nemen toe</b> (minder vijanden) · bladeren <b>nemen af</b> (meer rupsen eten ze op) · uilen <b>nemen af</b> (minder voedsel)</td></tr></table><p class="lp-tip">🧠 Truc: kijk naar de laag <b>eronder</b> (dat is hun <b>voedsel</b>) en de laag <b>erboven</b> (dat zijn hun <b>vijanden</b>). Minder voedsel → minder dieren. Minder vijanden → meer dieren.</p><p class="lp-vb">Uitheemse geelbuikschildpadden in een vijver in Dendermonde eten de vissen op en verstoren het ecologisch evenwicht. Uitheemse soorten noem je <b>exoten</b>.</p>'
  ],
  kaarten:[
    ['Wat is een voedselkringloop?','Producenten → consumenten → organisch afval → afvaleters → ontbinders → mineralen → terug naar de producenten'],
    ['Wat doen reducenten met organisch afval?','Ze breken het af tot mineralen'],
    ['Waarom zijn reducenten onmisbaar voor producenten?','Ze leveren de mineralen die planten nodig hebben'],
    ['Wat is een voedselpiramide?','Een ruimtelijke voorstelling van een voedselketen in lagen'],
    ['Wat vormt de basis van de voedselpiramide?','De producenten (planten)'],
    ['Wat gebeurt er met het aantal organismen naar de top van de piramide?','Het neemt af'],
    ['Wanneer is er een ecologisch evenwicht?','Als er van elke schakel voldoende organismen zijn (brede basis, smalle top)'],
    ['Wat verstoort het ecologisch evenwicht?','Een plotse sterke stijging of daling van het aantal organismen'],
    ['Hoe noem je uitheemse dierensoorten?','Exoten']
  ],
  quiz:[
    {t:'mc',v:'Waarom zijn de reducenten onmisbaar voor de producenten?',o:['Ze leveren mineralen voor de producenten','De producenten eten de reducenten op','Ze leveren zuurstofgas','De producenten leveren mineralen aan de reducenten'],a:0},
    {t:'mc',v:'Wat staat aan de basis van een voedselpiramide?',o:['de producenten','de carnivoren','de reducenten','de mens'],a:0},
    {t:'mc',v:'Piramide: planten → rupsen → muizen → uil. De rupsen worden bestreden. Wat gebeurt er met de muizen?',o:['ze nemen af','ze nemen toe','ze blijven gelijk','ze worden planteneters'],a:0},
    {t:'mc',v:'Zelfde piramide. De rupsen worden bestreden. Wat gebeurt er met de bladeren?',o:['ze nemen toe','ze nemen af','ze blijven gelijk','ze sterven allemaal'],a:0},
    {t:'mc',v:'Zelfde piramide. De muizen worden bestreden. Wat gebeurt er met de rupsen?',o:['ze nemen toe','ze nemen af','ze blijven gelijk','ze verdwijnen'],a:0},
    {t:'mc',v:'Zelfde piramide. De muizen worden bestreden. Wat gebeurt er met de uilen?',o:['ze nemen af','ze nemen toe','ze blijven gelijk','ze eten meer rupsen'],a:0},
    {t:'mc',v:'Een piramide heeft een smalle basis en een brede top. Wat betekent dat?',o:['Er is geen ecologisch evenwicht','Er is een ecologisch evenwicht','Er zijn te veel planten','Dat is normaal'],a:0},
    {t:'mc',v:'Wat gebeurt er na de ontbinding van organisch afval?',o:['Er komen mineralen in de bodem die planten opnemen','Er ontstaan nieuwe dieren','Het afval verdwijnt in de lucht','Er komt meer afval'],a:0},
    {t:'mc',v:'Plaats de regenworm in de voedselkringloop.',o:['opruimer (afvaleter)','producent','reducent (ontbinder)','carnivoor'],a:0},
    {t:'jf',v:'In een voedselpiramide in evenwicht is de basis breed en de top smal.',a:true},
    {t:'jf',v:'Een plotse stijging van één soort is goed voor het ecologisch evenwicht.',a:false,u:'Elke plotse sterke stijging of daling verstoort het evenwicht.'},
    {t:'invul',v:'Ontbinders breken organisch afval af tot … .',a:['mineralen']},
    {t:'open',v:'In een vijver worden uitheemse schildpadden gedumpt die vissen eten. Leg uit wat er met het ecologisch evenwicht gebeurt.',m:'De schildpadden eten veel vissen: het aantal vissen daalt plots. Dat verstoort het ecologisch evenwicht: dieren die van vissen leven krijgen minder voedsel, en wat de vissen eten neemt toe. Uitheemse soorten noem je exoten.'}
  ]
},
{
  id:'B7', vak:'nat', titel:'Wat is het belang van biodiversiteit?',
  bron: B('les 8, p. 40–47'),
  samenvatting:[
    '<h4>🌍 Biodiversiteit</h4><p><b>Biodiversiteit</b> (biologische diversiteit) is de <b>verscheidenheid</b> aan <b>biotopen</b>, aan <b>soorten</b> en aan <b>organismen binnen dezelfde soort</b>. Het is al het leven op aarde, ook wij.</p><p class="lp-vb">Binnen één soort: de ene bosuil is donkerder dan de andere, tuinslakken hebben allemaal een ander huisje.</p>',
    '<h4>🐌 Belang 1: overleven van een soort (natuurlijke selectie)</h4><p>Hoe <b>meer verschil</b> binnen een soort, hoe groter de kans dat er een organisme is dat <b>goed aangepast</b> is, ook als het biotoop <b>verandert</b>. De best aangepaste organismen <b>overleven</b> en planten zich voort: dat heet <b>natuurlijke selectie</b>.</p><p class="lp-vb">Tuinslakken met een licht huisje vallen op in het donkere bos en worden opgegeten. De donkere overleven en krijgen jongen → na veel jaren hebben de bosslakken een steeds betere <b>schutkleur</b>.<br>Spinnenorchis: varianten die minder goed naar een vrouwtjesbij ruiken, worden minder bestoven en verdwijnen.</p>',
    '<h4>🕸️ Belang 2: een stabiel ecologisch evenwicht</h4><p>Hoe groter de biodiversiteit, hoe groter de kans dat een <b>ontbrekende schakel</b> in een voedselketen <b>vervangen</b> kan worden. Het ecologisch evenwicht is dan <b>stabieler</b>.</p><p class="lp-vb">Stadstuin met weinig planten: de vlinderstruik verdwijnt → de vlinders en bijen hebben geen voedsel meer en verdwijnen ook. Stadstuin met veel verschillende planten (aster, venkel, klimop …): de dieren vinden ander voedsel en blijven.</p>',
    '<h4>🧑 Belang 3: voor de mens</h4><div class="lp-tegels k2"><div><i>💶</i><b>economie</b><small>voedsel, hout, grondstoffen, geneesmiddelen</small></div><div><i>🏕️</i><b>toerisme en vrije tijd</b><small>wandelen, natuurparken, duiken</small></div><div><i>🔬</i><b>wetenschap en technologie</b><small>uitvindingen gebaseerd op de natuur</small></div><div><i>🎨</i><b>kunst en cultuur</b><small>schilderijen, foto’s, verhalen over de natuur</small></div></div>',
    '<h4>👍 Positieve en 👎 negatieve invloed van de mens</h4><div class="lp-vs"><div><b>👎 Negatief</b><b>biotopen veranderen</b> (huizen, akkers, fabrieken, klimaatopwarming) · <b>biotopen versnipperen</b> (wegen erdoor) · <b>exoten</b> invoeren (Aziatische hoornaar, halsbandparkiet) · <b>jacht</b> (neushoorn voor zijn hoorn)</div><div><b>👍 Positief</b><b>biotopen herstellen</b> (ecoducten, vlindertuinen, groene bermen) · bewust <b>voedsel</b> kiezen (lokaal, seizoen, vaker vegetarisch) · <b>sorteren en recycleren</b> (geen zwerfvuil) · dieren en planten <b>beschermen</b> (natuurgebieden, jachtverbod, kweekprogramma)</div></div><p class="lp-tip">🎯 Op het examen krijg je voorbeelden en moet je zeggen of ze <b>positief</b> of <b>negatief</b> zijn. Vraag je af: komt er <b>meer</b> of <b>minder</b> leven en ruimte voor de natuur?</p>'
  ],
  kaarten:[
    ['Wat is biodiversiteit?','De verscheidenheid aan biotopen, soorten en organismen binnen dezelfde soort'],
    ['Belang van biodiversiteit voor het overleven van een soort?','Meer verschil binnen een soort = meer kans dat er een goed aangepast organisme is, ook als het biotoop verandert'],
    ['Wat is natuurlijke selectie?','De best aangepaste organismen overleven en planten zich voort'],
    ['Belang van biodiversiteit voor het ecologisch evenwicht?','Ontbrekende schakels kunnen vervangen worden, dus het evenwicht is stabieler'],
    ['Waarvoor is biodiversiteit belangrijk voor de mens?','Economie, toerisme en vrije tijd, wetenschap en technologie, kunst en cultuur'],
    ['Geef 4 negatieve invloeden van de mens','Biotopen veranderen, biotopen versnipperen, exoten invoeren, jacht'],
    ['Geef 4 positieve invloeden van de mens','Biotopen herstellen, bewust voedsel kiezen, sorteren en recycleren, dieren en planten beschermen'],
    ['Wat is een exoot?','Een organisme dat leeft op een plaats waar het van nature niet voorkomt'],
    ['Wat is een ecoduct?','Een brug voor dieren over een weg, die versnipperde biotopen verbindt']
  ],
  quiz:[
    {t:'mc',v:'Er worden steeds meer huizen gebouwd. Invloed op de biodiversiteit?',o:['negatief: biotopen veranderen','positief: herstellen','geen invloed','positief: beschermen'],a:0},
    {t:'mc',v:'Bossen worden gekapt voor landbouwgrond. Invloed?',o:['negatief','positief','geen','eerst positief'],a:0},
    {t:'mc',v:'De halsbandparkiet uit India neemt voedsel en nestplaatsen van inheemse vogels af. Invloed?',o:['negatief: exoot','positief: meer soorten','geen','positief: bescherming'],a:0},
    {t:'mc',v:'Je gooit je plastic flesje in de PMD-zak. Invloed?',o:['positief: sorteren en recycleren','negatief','geen','negatief: jacht'],a:0},
    {t:'mc',v:'Natuurpunt koopt landbouwgrond om er natuur van te maken. Invloed?',o:['positief','negatief','geen','negatief: versnipperen'],a:0},
    {t:'mc',v:'Neushoorns worden bejaagd voor hun hoorn. Invloed?',o:['negatief: jacht','positief','geen','positief: bescherming'],a:0},
    {t:'mc',v:'Door diesel en benzine warmt de aarde op. Invloed?',o:['negatief: biotopen veranderen door klimaatopwarming','positief','geen','positief: herstellen'],a:0},
    {t:'mc',v:'Vaker vegetarisch eten. Invloed?',o:['positief: minder land nodig','negatief','geen','negatief: versnipperen'],a:0},
    {t:'mc',v:'Er wordt een nieuwe snelweg dwars door een bos aangelegd. Hoe heet dat?',o:['versnippering van een biotoop','herstel van een biotoop','natuurlijke selectie','veredelen'],a:0},
    {t:'mc',v:'In welke tuin heeft het verdwijnen van de vlinderstruik de grootste gevolgen?',o:['de tuin met de kleinste biodiversiteit','de tuin met de grootste biodiversiteit','in beide evenveel','in geen van beide'],a:0},
    {t:'mc',v:'Sommige mannetjesmerels zingen luider dan andere. Wat gebeurt er in een lawaaierige stad?',o:['De luide zangers lokken makkelijker een vrouwtje en krijgen meer jongen','De stille zangers overleven beter','Er verandert niets','Alle merels vertrekken'],a:0},
    {t:'jf',v:'Hoe groter de biodiversiteit, hoe stabieler het ecologisch evenwicht.',a:true},
    {t:'jf',v:'De mens maakt geen deel uit van de biodiversiteit.',a:false,u:'Ook de mens maakt deel uit van de biodiversiteit.'},
    {t:'invul',v:'De verscheidenheid aan biotopen, soorten en organismen binnen een soort noem je … .',a:['biodiversiteit']},
    {t:'open',v:'Welke invloed heeft de jacht op het ecologisch evenwicht van een biotoop? Gebruik de woorden “schakel” en “voedselweb”.',m:'Door de jacht verdwijnt (een deel van) een schakel uit het voedselweb. Dieren die ervan eten krijgen minder voedsel, en wat die soort at, neemt toe. Zo raakt het ecologisch evenwicht verstoord.'},
    {t:'open',v:'Geef een positieve keuze voor de biodiversiteit op de speelplaats, in de supermarkt en thuis.',m:'Speelplaats: afval in de juiste vuilbak, geen zwerfvuil, groen aanleggen. Supermarkt: lokale seizoensproducten kiezen, minder vlees. Thuis: sorteren, een vlindertuin of veel verschillende planten, minder verharding.'}
  ]
}
);
})();
