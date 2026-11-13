// "Snap je het echt?" Per onderwerp:
//  kern: een kernvraag die Eli in eigen woorden beantwoordt (m = modelantwoord, k = kernwoorden; "a|b" = a of b telt)
//  toep: toepassingsvragen met een nieuw voorbeeld; w[i] = waarom optie i niet klopt (leeg bij het juiste antwoord)
(function(){
const S = {
  KF1: {
    kern: { v:'Wat is filosofie, en waarom is "Hakuna matata" géén filosofie?', m:'Filosofie (philia + sophia = liefde voor wijsheid) is <b>rationeel en kritisch nadenken</b> over <b>fundamentele vragen</b> (kennis, werkelijkheid, waarden, ons bestaan). "Hakuna matata" is maar een <b>levenshouding</b>: er wordt niet over nagedacht of geredeneerd.', k:['liefde|wijsheid|philia|sophia','rationeel|redeneren|logisch','kritisch','fundamente|grote vra|levensvra|denkvra','levenshouding|motto|niet nagedacht|geen redenering'] },
    toep: [
      { t:'mc', v:'"Mag je liegen om een vriend te beschermen?" Wat voor vraag is dat?', o:['Een filosofische vraag (denkvraag)','Een weetvraag','Een meningsvraag'], a:0, w:['','Je kan het antwoord niet meten of opzoeken in een boek.','Het is meer dan "ik vind": je moet redeneren over eerlijkheid en vriendschap, en er botsen twee waarden.'] },
      { t:'mc', v:'"Hoeveel spelers staan er in een voetbalploeg op het veld?" Wat voor vraag is dat?', o:['Een filosofische vraag','Een weetvraag','Een meningsvraag'], a:1, w:['Het antwoord ligt gewoon vast (11). Je hoeft er niet over te filosoferen.','','Er is geen mening nodig: je kan het opzoeken.'] },
    ],
  },
  KF2: {
    kern: { v:'Wat veranderde er toen men overstapte van mythos naar logos? Geef een voorbeeld.', m:'Bij <b>mythos</b> verklaarde men de wereld met <b>verhalen over goden</b> (donder = woede van Zeus). Bij <b>logos</b> gebruikt men de <b>rede en observatie</b> en zoekt men een natuurlijke verklaring, zoals de natuurfilosofen die de <b>archè (oerstof)</b> zochten: Thales zei water.', k:['mythe|mythos|verhal','god|zeus','rede|logos|verstand|rationeel','observ|waarne|zintuig','archè|arche|oerstof|thales|water'] },
    toep: [
      { t:'mc', v:'Iemand zegt: "Je kan nooit twee keer in dezelfde rivier stappen." Welke filosoof past daarbij?', o:['Heraclitus','Parmenides','Thales'], a:0, w:['','Parmenides zei net het omgekeerde: verandering is een illusie.','Thales zocht de oerstof (water), hij zei niets over alles stroomt.'] },
      { t:'mc', v:'Een filosoof zegt: "Mijn ogen bedriegen me: in werkelijkheid verandert er niets." Wie?', o:['Heraclitus','Parmenides','Anaximander'], a:1, w:['Heraclitus vertrouwt net op de zintuigen en zegt dat alles verandert.','','Anaximander sprak over het apeiron als oerbeginsel, niet over verandering als illusie.'] },
    ],
  },
  KF3: {
    kern: { v:'Leg in je eigen woorden uit wat Socrates bedoelt met "de filosoof als vroedvrouw".', m:'Een vroedvrouw helpt een kind ter wereld, maar maakt het niet zelf. Socrates geeft <b>geen antwoorden</b> maar <b>stelt vragen</b>, zodat de ander <b>zelf tot inzicht</b> komt. Hij weet dat hij niets weet, en zoekt samen naar de waarheid.', k:['vragen|vraagt','zelf','inzicht|antwoord vinden|ontdek|waarheid','geen antwoord|niet zelf|helpt'] },
    toep: [
      { t:'mc', v:'Een leerkracht zegt: "Wat juist is, verschilt per land. Bij ons is iets oké, elders niet." Welk standpunt is dat?', o:['Relativisme (zoals de sofisten)','Absolutisme (zoals Socrates)','Natuurfilosofie'], a:0, w:['','Socrates zegt net dat er één waarheid is die voor iedereen geldt.','Natuurfilosofen gingen over de oerstof van de kosmos, niet over goed en kwaad.'] },
      { t:'mc', v:'Iemand betaalt een coach om te leren winnen in een debat, ook als hij eigenlijk ongelijk heeft. Op wie lijkt die coach?', o:['Een sofist','Socrates','Thales'], a:0, w:['','Socrates vroeg geen geld en wou de waarheid vinden, niet zomaar winnen.','Thales leefde vroeger en dacht na over de natuur.'] },
    ],
  },
  KF4: {
    kern: { v:'Hoe ziet het huis van de filosofie eruit? Noem de 2 groepen en de 6 kamers.', m:'Twee verdiepingen. <b>Vragen over feiten (het zijn)</b>: Bovenwereld (metafysica), Wereld (kosmologie), Mens (antropologie). <b>Vragen over waarden</b> (Plato): het <b>Ware</b>, het <b>Goede</b> en het <b>Schone</b>.', k:['feit|zijn','waarde','bovenwereld|metafysica','wereld|kosmologie','mens|antropologie','ware|waarheid','goede|goedheid','schone|schoonheid'] },
    toep: [
      { t:'mc', v:'"Is het ooit oké om een belofte te breken?" In welke kamer van het huis hoort die vraag?', o:['Het Goede','Het Schone','Wereld (kosmologie)'], a:0, w:['','Het Schone gaat over schoonheid (kunst, wat mooi is).','Kosmologie gaat over het heelal en de natuur.'] },
      { t:'mc', v:'Je vriend zegt: "Racisme is dom." Welke doorvraag is abstraherend?', o:['Wat bedoel je precies met "dom"?','Hoe vaak heb je dat al gezien?','Wanneer was dat?'], a:0, w:['','Dat is concretiserend: je vraagt naar feiten (hoeveel).','Dat is concretiserend: je vraagt naar feiten (wanneer).'] },
    ],
  },
  KF5: {
    kern: { v:'Wat maakt iets kunst? Noem de 5 kenmerken uit de cursus.', m:'Kunst is (1) een <b>bewuste creatie</b> van iets moois en/of betekenisvols, (2) de kunstenaar gebruikt <b>vaardigheden en verbeelding</b>, (3) het wil de <b>zintuigen prikkelen of emoties</b> losmaken, (4) het <b>verandert door de tijd</b> en (5) het <b>verschilt per cultuur</b>.', k:['bewust','vaardigh|verbeelding|fantasie','zintuig|emotie|gevoel','tijd','cultu'] },
    toep: [
      { t:'mc', v:'Een rapper treedt op in de Lotto Arena. Welke kunstvorm?', o:['Podiumkunst','Beeldende kunst','Audiovisuele kunst'], a:0, w:['','Beeldende kunst bekijk je (schilderij, beeld, gebouw).','Een live optreden is geen film of video. Als je de clip op YouTube bekijkt, is dat wel audiovisueel.'] },
      { t:'mc', v:'Een graffiti-artiest spuit een muurschildering terwijl een DJ draait en mensen dansen. Wat is dat?', o:['Een mengvorm','Enkel beeldende kunst','Enkel podiumkunst'], a:0, w:['','Er is ook muziek en dans bij, dus niet enkel beeldend.','De muurschildering is beeldende kunst, dus niet enkel podium.'] },
    ],
  },
  KF6: {
    kern: { v:'Hoe verschilt de Griekse kunst van de Romeinse? En wat is het grote verschil tussen realisme en impressionisme?', m:'<b>Grieken</b>: mooier dan echt, <b>ideale</b> gespierde lichamen. <b>Romeinen</b>: <b>waarheidsgetrouw</b>, ook rimpels en kale hoofden. <b>Realisme</b>: <b>nuchter</b> de werkelijkheid tonen, vaak de gewone arbeider. <b>Impressionisme</b>: een <b>momentopname</b> met <b>snelle penseelstreken</b> en levendige kleuren, minder correcte techniek.', k:['ideaal|mooier|perfect','waarheid|echt|rimpel|realistisch','nuchter|arbeider|werkelijkheid','moment|indruk|impressie','penseel|snel|kleur'] },
    toep: [
      { t:'mc', v:'Je ziet een schilderij van een station in de mist, met snelle vegen verf. Je ziet geen details, alleen licht en sfeer. Welke stroming?', o:['Impressionisme','Realisme','Renaissance'], a:0, w:['','Realisme is net heel nuchter en duidelijk, met de gewone arbeider centraal.','Renaissance is zorgvuldig en anatomisch correct, niet snel en vaag.'] },
      { t:'mc', v:'Een beeld van een oude man met rimpels en een kaal hoofd, uit de oudheid. Welke periode?', o:['Romeinen','Oude Grieken','Middeleeuwen'], a:0, w:['','Grieken maakten mensen mooier dan echt, met ideale lichamen.','Middeleeuwse kunst toont vooral Bijbelverhalen in kerken.'] },
      { t:'mc', v:'Een groot doek met een Bijbelverhaal, een fel licht op de figuren en een pikdonkere achtergrond, vol drama. Welke stroming?', o:['Barok','Classicisme','Impressionisme'], a:0, w:['','Classicisme is rustig en heldhaftig, naar Griekse voorbeelden, niet zo dramatisch.','Impressionisme toont alledaagse momenten, geen dramatische Bijbelscènes.'] },
    ],
  },
  KF7: {
    kern: { v:'Waarom gingen kunstenaars na 1900 experimenteren? Leg het verschil uit tussen kubisme en surrealisme.', m:'Door de <b>fotografie</b> was realistisch schilderen minder nodig, dus gingen kunstenaars <b>experimenteren</b>. <b>Kubisme</b>: alles in <b>geometrische vormen</b> (kubus, bol, kegel), perspectief klopt niet. <b>Surrealisme</b>: <b>droombeelden</b>, realistisch geschilderd maar <b>absurd</b>.', k:['foto','experiment','geometr|kubus|bol|kegel|cilinder|vorm','droom','absurd|raar|vreemd|gek'] },
    toep: [
      { t:'mc', v:'Een kunstenaar zet een gewone fiets op een sokkel in een museum en noemt het kunst, om de kunstwereld te choqueren. Welke stroming?', o:['Dadaïsme','Pop Art','Kubisme'], a:0, w:['','Pop Art gebruikt ook alledaagse dingen, maar vooral uit de massacultuur (strips, sterren), niet om te provoceren tegen de kunstwereld.','Kubisme gaat over geometrische vormen.'] },
      { t:'mc', v:'Een levensecht geschilderde olifant met heel lange spinnenpoten loopt door een woestijn. Welke stroming?', o:['Surrealisme','Expressionisme','Realisme'], a:0, w:['','Expressionisme gaat over gevoelens met felle kleuren, niet over realistische droombeelden.','Realisme toont de echte werkelijkheid, geen onmogelijke dingen.'] },
      { t:'mc', v:'Een felgekleurd portret van een filmster, 9 keer herhaald zoals een reclameaffiche. Welke stroming?', o:['Pop Art','Dadaïsme','Expressionisme'], a:0, w:['','Dada wil provoceren tegen de kunstwereld, het gaat niet over beroemdheden en reclame.','Expressionisme drukt een persoonlijk gevoel uit, niet de massacultuur.'] },
    ],
  },
  KF8: {
    kern: { v:'Wat is het verschil tussen beschrijven en interpreteren bij kunst lezen?', m:'<b>Beschrijven</b> = zo <b>objectief</b> mogelijk zeggen <b>wat je ziet</b> (camera-oog), nog geen mening. <b>Interpreteren</b> = uitleggen <b>wat het betekent</b> of wat de bedoeling is, gekoppeld aan concrete dingen uit het werk.', k:['objectief|camera','wat je ziet|zie|kleur|vorm','betekenis|betekent|bedoeling','geen mening|nog niet'] },
    toep: [
      { t:'mc', v:'"De rode kleur en de gebalde vuist tonen dat de kunstenaar boos is op de oorlog." Welke stap?', o:['Interpreteren','Beschrijven','Eerste indruk'], a:0, w:['','Beschrijven zegt enkel wat je ziet, zonder uit te leggen wat het betekent.','Een eerste indruk is spontaan, zonder uitleg met elementen uit het werk.'] },
      { t:'mc', v:'Een museum verkoopt een designlamp die mooi is én licht geeft. Welke functie van kunst?', o:['Decoratief (toegepaste kunst)','Maatschappelijk','Ontspannend'], a:0, w:['','Maatschappelijk = spiegel van de maatschappij of mensen verbinden.','Ontspannend = tot rust komen. Hier gaat het om mooi én nuttig.'] },
    ],
  },
  G1: {
    kern: { v:'Waar hoort ontwikkelingspsychologie in de wetenschappen? Leg de weg uit.', m:'Wetenschappen → <b>ervaringswetenschappen</b> (onderzoek met je zintuigen) → <b>gedragswetenschappen</b> (gedrag van de mens) → <b>psychologie</b> → <b>ontwikkelingspsychologie</b>: hoe een mens zich ontwikkelt doorheen zijn leven.', k:['ervaring','gedrag','psycholog','ontwikkel','zintuig|leven'] },
    toep: [
      { t:'mc', v:'Een onderzoeker bestudeert waarom jongeren in groep meer risico nemen. Welke wetenschap?', o:['Gedragswetenschap','Natuurwetenschap','Formele wetenschap'], a:0, w:['','Natuurwetenschap gaat over materie en levende wezens (fysica, bio), niet over gedrag van mensen.','Formele wetenschap gaat over symbolen zoals wiskunde en logica.'] },
      { t:'mc', v:'Lina (11 maanden) zet haar eerste stapjes, haar neef pas op 17 maanden. Wat zegt de cursus?', o:['Normaal: leeftijden zijn gemiddelden, er zijn grote verschillen','Lina is hoogbegaafd','De neef moet meteen naar een dokter'], a:0, w:['','Vroeg lopen zegt niets over intelligentie.','Pas bij een grote afwijking van het gemiddelde is hulp nodig. 17 maanden valt nog binnen het normale.'] },
    ],
  },
  G2: {
    kern: { v:'Wat is het verschil tussen groeien en rijpen? Geef van elk een voorbeeld.', m:'<b>Groeien</b> = <b>meer of groter</b> worden, kwantiteit (schoenmaat 35 → 37). <b>Rijpen</b> = iets dat al in je lichaam zit, ontwikkelt <b>vanzelf</b> (genen), kwaliteit, niemand leert het je (zindelijk worden, geslachtsrijp).', k:['groter|meer|kwantiteit','vanzelf|genen|niemand leert|kwaliteit','schoen|lengte|gewicht|tand|cm','zindelijk|geslachtsrijp|blaas|objectpermanentie|rechtzitten'] },
    toep: [
      { t:'mc', v:'Noah (14) kan plots veel beter zijn aandacht bij de les houden, zonder dat iemand het hem aanleerde. Welke ontwikkelingsvorm?', o:['Rijpen','Leren','Groeien'], a:0, w:['','Leren = iets nieuws aangeleerd krijgen of oefenen. Hier gebeurt het vanzelf.','Groeien = groter of meer worden (lengte, gewicht).'] },
      { t:'mc', v:'Een peuter wordt jaloers als mama zijn zusje knuffelt. Welk ontwikkelingsgebied?', o:['Socio-emotioneel','Cognitief','Fysiek'], a:0, w:['','Cognitief = denken, leren, geheugen.','Fysiek = lichaam, motoriek, zintuigen.'] },
    ],
  },
  G3: {
    kern: { v:'Wat zijn de 3 stadia van de zwangerschap en wat gebeurt er in elk?', m:'1) <b>Kiemstadium</b> (0–2 w): bevruchting, ± dag 14 innestelen in de baarmoederwand. 2) <b>Embryonaal</b> (2–8 w): van 2 mm naar 3 cm, alle vormen herkenbaar. 3) <b>Foetaal</b> (9–40 w): alles groeit en wordt afgewerkt (vingers, bewegingen voelbaar, organen werken).', k:['kiem|germina','innestel|baarmoeder|bevrucht','embryo','foet','vorm|herkenbaar|3 cm'] },
    toep: [
      { t:'mc', v:'Een zwangere vrouw voelt voor het eerst haar baby bewegen. Hoe ver is ze ongeveer?', o:['± 20 weken (5e maand)','± 2 weken','± 38 weken'], a:0, w:['','Na 2 weken nestelt de kiem zich pas in, er is nog geen baby die beweegt.','Dan is de baby bijna geboren. Bewegingen voel je al veel vroeger.'] },
      { t:'mc', v:'Na de geboorte vindt een baby snel de borst. Welk zintuig gebruikt hij dat in de buik nog niet werkte?', o:['Ruiken','Horen','Smaken'], a:0, w:['','Horen kon al in de buik: hart en stem van mama.','Smaken kon al: hij drinkt meer vruchtwater als het zoet is.'] },
    ],
  },
  G4: {
    kern: { v:'Leg uit waarom een baby van 8 maanden huilt als mama de kamer uitgaat (2 begrippen).', m:'Door <b>objectpermanentie</b> weet de baby dat mama <b>nog bestaat als ze weg is</b>. Door de <b>hechting</b> aan mama krijgt hij <b>scheidingsangst</b> (8–9 m): hij schrikt omdat ze weg is. Daarbij hoort ook vreemdenangst.', k:['objectpermanentie','bestaat|nog daar|weg','hechting','scheidingsangst|vreemdenangst|angst'] },
    toep: [
      { t:'mc', v:'Een baby pakt een rozijntje op tussen duim en wijsvinger. Hoe oud is hij ongeveer?', o:['12 maanden (pincetgreep)','4 maanden','6 maanden'], a:0, w:['','Op 4 maanden reikt hij al, maar pakt hij nog niet echt vast.','Op 6 maanden grijpt hij met de volle hand (handgreep), niet met duim en wijsvinger.'] },
      { t:'mc', v:'Je verstopt een speeltje onder een doek. Baby Mats (4 maanden) zoekt niet, zijn zus (10 maanden) wel. Waarom?', o:['Zijn zus heeft al objectpermanentie','Mats ziet nog niet goed','Mats is niet geïnteresseerd'], a:0, w:['','Op 4 maanden ziet hij al goed genoeg. Het probleem is: voor hem bestaat wat weg is gewoon niet meer.','Hij denkt dat het speeltje niet meer bestaat. Dat ontwikkelt pas rond 8 maanden.'] },
    ],
  },
  G5: {
    kern: { v:'Leg de 3 denkfouten van een kleuter uit, elk met een voorbeeld.', m:'1) <b>Geen omkeerbaarheid</b>: een bal klei uitrollen tot een staaf, de kleuter denkt dat er nu meer klei is. 2) <b>Egocentrisch</b>: hij kan zich niet in een ander verplaatsen (drie-bergen-proef, handen voor de ogen = "jij ziet mij niet"). 3) <b>Animistisch</b>: levenloze dingen krijgen een ziel ("de zon is boos").', k:['omkeerbaar','klei|appel|staaf|meer','egocentr','berg|ander|standpunt|ogen','animist','zon|ziel|leven'] },
    toep: [
      { t:'mc', v:'Kleuter Ella (4) zegt aan de telefoon tegen oma: "Kijk, mijn nieuwe tekening!" Welke denkfout?', o:['Egocentrisch denken','Animistisch denken','Geen omkeerbaarheid'], a:0, w:['','Animistisch = levenloze dingen krijgen een ziel. Daar gaat het hier niet over.','Omkeerbaarheid gaat over hoeveelheden die van vorm veranderen.'] },
      { t:'mc', v:'Een peuter van 2 roept bij alles "nee!" en wil alles zelf doen. Wat is dat?', o:['De koppigheidsfase (normaal)','Een gedragsstoornis','Scheidingsangst'], a:0, w:['','Het is tijdelijk en normaal: hij ontdekt dat hij een eigen "ik" heeft.','Scheidingsangst is schrik als ouders weggaan, bij baby\'s van 8–9 maanden.'] },
    ],
  },
  G6: {
    kern: { v:'Wat is hypothetisch denken bij adolescenten, en waarom is het belangrijk?', m:'<b>Hypothetisch denken</b> = nadenken over <b>wat zou kunnen zijn</b>, niet alleen over wat er nu is. Daardoor kan een tiener nadenken over de <b>toekomst</b> (studie, beroep, partner) en verschillende mogelijkheden afwegen.', k:['zou kunnen|mogelijk|stel dat|als','toekomst','beroep|studie|partner|keuze'] },
    toep: [
      { t:'mc', v:'Lucas (9) zegt: "Ik denk dat Sinterklaas eigenlijk de papa is." Wat toont dit?', o:['Het magisch denken verdwijnt (cognitief)','Hypothetisch denken (adolescentie)','Een groeispurt'], a:0, w:['','Hypothetisch denken komt pas in de adolescentie (12–18).','Een groeispurt is fysiek, dit gaat over denken.'] },
      { t:'mc', v:'Waarom zijn meisjes van 12 vaak groter dan jongens van 12?', o:['Meisjes hebben hun groeispurt aan het begin van de puberteit','Jongens groeien niet meer','Meisjes eten beter'], a:0, w:['','Jongens krijgen hun groeispurt later (tot 3 jaar later) en halen dan in.','Dat staat niet in de cursus: het gaat om het moment van de groeispurt.'] },
    ],
  },
  G7: {
    kern: { v:'Wat is relativerend denken bij volwassenen? En bestaat de midlifecrisis echt vaak?', m:'<b>Relativerend denken</b> (midden volwassenheid): <b>minder zwart-wit</b>, genuanceerder, verdraagzamer. De <b>midlifecrisis</b> komt in werkelijkheid <b>niet zo vaak</b> voor (hooguit een kwart): twijfels komen meestal door <b>gebeurtenissen</b> (job kwijt, overlijden), niet door de leeftijd.', k:['zwart-wit|zwart wit|genuanceer|nuance','verdraagza|flexibel','niet vaak|weinig|kwart|zelden','gebeurtenis|job|overlijden|niet leeftijd'] },
    toep: [
      { t:'mc', v:'Oma (78) vergeet vaker afspraken en heeft meer tijd nodig om iets nieuws te leren. Welk gebied verandert hier?', o:['Cognitief','Socio-emotioneel','Fysiek'], a:0, w:['','Socio-emotioneel = relaties en gevoelens, zoals eenzaamheid.','Fysiek = rimpels, spieren, zicht. Geheugen is cognitief.'] },
      { t:'mc', v:'De kinderen van Ann (52) gaan op kot. Ze voelt zich plots nutteloos thuis. Wat is dat?', o:['Lege-nestsyndroom','Midlifecrisis','Menopauze'], a:0, w:['','Een midlifecrisis is twijfelen aan je hele leven en radicaal veranderen.','Menopauze is lichamelijk: 1 jaar geen menstruatie.'] },
    ],
  },
  F2: { kern: { v:'Hoe vervoeg je een gewoon werkwoord op -er in de présent? Wat is speciaal aan manger en commencer?', m:'<b>Stam + -e, -es, -e, -ons, -ez, -ent</b> (parler → je parle, nous parlons). Bij <b>manger</b> zet je een <b>e</b> vóór -ons (nous mang<b>e</b>ons), bij <b>commencer</b> een <b>ç</b> (nous commen<b>ç</b>ons): vóór a, o, u.', k:['stam','e|es|ons|ez|ent','mangeons|ge','commençons|ç|cedille','a o u|a, o|auto'] } },
  F3: { kern: { v:'Wat is het verschil tussen finir en sortir in de présent?', m:'<b>Finir</b> (type finir): -is, -is, -it, <b>-issons, -issez, -issent</b>. <b>Sortir</b> (MESESODOPA): je verliest de laatste medeklinker van de stam in het enkelvoud (je sors, tu sors, il sort) en houdt hem in het meervoud (nous sortons).', k:['iss','is|it','sors|sort','medeklinker|t valt|stam|mesesodopa'] } },
  F5: { kern: { v:'Hoe maak je de impératif? Wat is de valkuil bij -er-werkwoorden?', m:'Neem de présent van <b>tu, nous en vous</b> zonder het onderwerp. Bij <b>-er-werkwoorden</b> (en ouvrir) valt de <b>-s</b> weg bij tu: Mange ! (niet Manges). Onregelmatig: sois, aie, va, sache.', k:['tu|nous|vous','zonder onderwerp|zonder je|weg','s valt|geen s|zonder s','sois|aie|va|sache'] } },
  F6: { kern: { v:'Hoe maak je de passé composé, en wanneer gebruik je être?', m:'<b>Hulpwerkwoord (avoir of être) in de présent + participe passé</b> (j\'ai mangé). <b>Être</b> bij de werkwoorden van <b>la maison d\'être</b> (aller, venir, monter, partir, tomber…), dan <b>past de participe zich aan</b>: elle est allé<b>e</b>.', k:['avoir','être|etre','participe|deelwoord','maison|aller|venir|beweging','aanpas|overeenkom|e erbij|meervoud'] } },
  W1: {
    kern: { v:'Wat is het verschil tussen een scalaire en een vectoriële grootheid? Geef van elk een voorbeeld.', m:'Een <b>scalaire</b> grootheid heeft <b>enkel een grootte</b> (massa, tijd, temperatuur). Een <b>vectoriële</b> grootheid heeft <b>grootte, richting, zin en aangrijpingspunt</b> (kracht, snelheid), je tekent ze als een pijl.', k:['enkel|alleen|getal','grootte','richting','zin','aangrijp','massa|tijd|temperatuur|lengte','kracht|snelheid|versnelling'] },
    toep: [
      { t:'mc', v:'Een weerman zegt: "Wind van 30 km/u uit het westen." Wat voor grootheid is die windsnelheid?', o:['Vectorieel: er is een grootte én een richting/zin','Scalair: het is maar één getal','Geen grootheid: je kan wind niet meten'], a:0, w:['','Hij geeft niet alleen 30 km/u, maar ook waar de wind naartoe gaat.','Wind kan je wel meten (windmeter), dus het is een grootheid.'] },
      { t:'mc', v:'Je schrijft "l = 3,85 m". Wat is "m" hier?', o:['De eenheid','Het maatgetal','De grootheid'], a:0, w:['','Het maatgetal is 3,85.','De grootheid is l (lengte).'] },
    ],
  },
  W2: { kern: { v:'Leg in je eigen woorden uit hoe je 4 km omzet naar mm.', m:'Kilo = <b>10³</b>, milli = <b>10⁻³</b>. 4 km = 4·10³ m = 4·10³·10³ mm = <b>4·10⁶ mm</b>. Van <b>groot naar klein</b> wordt het getal <b>groter</b> (positieve exponent).', k:['10³|10^3|1000|kilo','milli|10⁻³|10^-3','10⁶|10^6|1 000 000|1000000|miljoen','groot naar klein|groter getal|vermenigvuldig|maal'] } },
  W3: {
    kern: { v:'Hoeveel beduidende cijfers krijgt je antwoord bij vermenigvuldigen? En bij optellen?', m:'<b>Vermenigvuldigen/delen</b>: evenveel <b>beduidende cijfers</b> als de meetwaarde met het <b>minste BC</b>. <b>Optellen/aftrekken</b>: evenveel <b>decimalen</b> (cijfers na de komma) als de <b>minst nauwkeurige</b> meting.', k:['vermenigvuldig|delen|maal','minste','beduidend|bc','optel|aftrek|som','decimal|na de komma|nauwkeurig'] },
    toep: [
      { t:'mc', v:'Je meet een tafel: 1,20 m lang en 0,8 m breed. Hoeveel BC heeft de oppervlakte?', o:['1','2','3'], a:0, w:['','1,20 heeft 3 BC, maar 0,8 heeft er maar 1. Bij vermenigvuldigen telt het minste.','3 is het aantal BC van 1,20, maar je kijkt naar het minste (0,8 = 1 BC).'] },
      { t:'mc', v:'Welke schrijfwijze van 0,00450 kg is juist in wetenschappelijke notatie?', o:['4,50·10⁻³ kg','4,5·10⁻³ kg','45,0·10⁻⁴ kg'], a:0, w:['','Je verliest de laatste 0: die telt mee als BC (0,00450 = 3 BC).','Vóór de komma mag maar 1 cijfer staan.'] },
    ],
  },
  W4: {
    kern: { v:'Wat zijn de 4 kenmerken van een kracht, en hoe tel je 2 krachten op die tegengesteld zijn?', m:'<b>Grootte</b> (N, lengte van de pijl), <b>richting</b> (horizontaal, verticaal, schuin), <b>zin</b> (links/rechts, boven/onder) en <b>aangrijpingspunt</b>. Zelfde richting maar <b>tegengestelde zin</b>: je <b>trekt af</b> (50 N − 30 N = 20 N, in de zin van de grootste).', k:['grootte','richting','zin','aangrijp','aftrek|min|verschil'] },
    toep: [
      { t:'mc', v:'Je knijpt een spons samen en hij komt terug in vorm. Welk effect van een kracht?', o:['Statisch, elastische vervorming','Statisch, plastische vervorming','Dynamisch effect'], a:0, w:['','Plastisch = blijvend vervormd (zoals een geknapte ballon).','Dynamisch = de snelheid verandert. Hier verandert de vorm.'] },
      { t:'mc', v:'Een magneet trekt een paperclip aan zonder hem te raken. Wat voor kracht?', o:['Veldkracht','Contactkracht','Normaalkracht'], a:0, w:['','Contactkracht = de voorwerpen raken elkaar.','Normaalkracht is een contactkracht van een ondersteuning.'] },
      { t:'mc', v:'Twee ploegen trekken aan een touw: links 500 N, rechts 450 N. Wat is de resulterende kracht?', o:['50 N naar links','950 N naar links','50 N naar rechts'], a:0, w:['','Tegengestelde zin: je trekt af, je telt niet op.','De resultante wijst in de zin van de grootste kracht (links).'] },
    ],
  },
  W5: {
    kern: { v:'Wat is het verschil tussen massa en gewicht? Wat gebeurt er met allebei op de maan?', m:'<b>Massa</b> = hoeveelheid stof in <b>kg</b>, <b>overal gelijk</b>. <b>Gewicht</b> = de <b>kracht</b> op je ondersteuning in <b>newton</b> (G = m·g). Op de <b>maan</b> blijft je massa gelijk, maar je gewicht wordt <b>kleiner</b> (g = 1,62 N/kg i.p.v. 9,81).', k:['stof|hoeveelheid','kg|kilogram','kracht','newton|N','gelijk|zelfde|verandert niet','kleiner|minder|lichter','m·g|m.g|m x g|m*g|zwaarteveld|9,81|1,62'] },
    toep: [
      { t:'mc', v:'Een parachutist valt vrij door de lucht (nog zonder parachute). Hoe groot is zijn gewicht?', o:['0 N: geen ondersteuning, dus geen gewicht','Even groot als op de grond','Groter, want hij versnelt'], a:0, w:['','Gewicht is de kracht op een ondersteuning. Wie valt, duwt nergens op.','Zijn zwaartekracht blijft wel, maar gewicht is iets anders dan zwaartekracht.'] },
      { t:'mc', v:'Een boek ligt stil op een schuine plank. In welke richting werkt de normaalkracht?', o:['Loodrecht op de plank','Recht naar boven','Recht naar beneden'], a:0, w:['','Alleen op een horizontale tafel wijst Fn recht naar boven. Hij staat altijd loodrecht op het steunvlak.','Recht naar beneden is de zwaartekracht.'] },
    ],
  },
  W6: {
    kern: { v:'Wat zegt de wet van Hooke? Wat betekent een grote veerconstante k?', m:'<b>F<sub>v</sub> = k · Δl</b>: de veerkracht is <b>recht evenredig</b> met de uitrekking (2× zoveel kracht = 2× zoveel uitrekking). Een <b>grote k</b> = een <b>stijve veer</b>: je hebt veel kracht nodig om hem uit te rekken. Δl altijd in <b>meter</b>.', k:['k|veerconstante','Δl|uitrekking|delta','evenredig|2x|dubbel','stijf','meter'] },
    toep: [
      { t:'mc', v:'Je hangt 1 kg aan veer A (rekt 2 cm uit) en aan veer B (rekt 8 cm uit). Welke veer heeft de grootste k?', o:['Veer A','Veer B','Even groot'], a:0, w:['','B rekt meer uit bij dezelfde kracht: die is net slapper (kleine k).','Ze rekken verschillend uit bij dezelfde kracht, dus k is verschillend.'] },
      { t:'mc', v:'Een veer rekt 3 cm uit bij 6 N. Hoeveel rekt hij uit bij 12 N?', o:['6 cm','3 cm','12 cm'], a:0, w:['','Meer kracht = meer uitrekking (recht evenredig).','Dubbele kracht = dubbele uitrekking: 3 × 2 = 6, niet 12.'] },
    ],
  },
  W7: {
    kern: { v:'Waarom werken skeletspieren altijd in paren? Leg uit met de arm.', m:'Een spier kan <b>enkel samentrekken</b> (trekken), <b>niet duwen</b> of zichzelf uitrekken. Daarom is er een <b>tegenspeler</b> nodig: <b>antagonisten</b>. Arm <b>buigen</b>: de <b>biceps</b> trekt samen, de triceps ontspant. Arm <b>strekken</b>: de <b>triceps</b> trekt samen.', k:['samentrek|trekken|korter','niet duwen|niet uitrek|enkel|alleen','antagonist|koppel|paar|tegen','biceps','triceps','buig','strek'] },
    toep: [
      { t:'mc', v:'Je trapt een bal weg door je been in de knie te strekken. Welke spier trekt samen?', o:['Quadriceps (voorkant bovenbeen)','Hamstring (achterkant bovenbeen)','Biceps'], a:0, w:['','De hamstring buigt de knie, strekken doet de quadriceps.','De biceps zit in je arm.'] },
      { t:'mc', v:'Je staat buiten in de kou en begint te bibberen. Welke functie van spieren is dat?', o:['Warmteproductie','Beweging','Energieopslag'], a:0, w:['','Bibberen beweegt je niet vooruit: het doel is warmte maken.','Energieopslag = glycogeen bewaren in de spier.'] },
    ],
  },
  W8: {
    kern: { v:'Vergelijk dwarsgestreept en glad spierweefsel (waar, wil, snelheid, moe).', m:'<b>Dwarsgestreept</b>: in <b>skeletspieren</b>, <b>willekeurig</b> (jij beslist), trekt <b>zeer snel</b> samen, maar <b>snel moe</b>. <b>Glad</b>: in <b>maag, darmen, bloedvaten</b>, <b>onwillekeurig</b>, trekt <b>traag</b> samen, <b>bijna nooit moe</b>.', k:['skelet','willekeurig|wil','snel','moe|vermoeid','maag|darm|bloedva|slokdarm','onwillekeurig','traag'] },
    toep: [
      { t:'mc', v:'Na een feestmaal knijpt je maag het eten langzaam verder, zonder dat je eraan denkt. Welk spierweefsel?', o:['Glad spierweefsel','Dwarsgestreept spierweefsel','Hartspierweefsel'], a:0, w:['','Dwarsgestreept zit aan je skelet en beweeg je zelf (willekeurig).','Hartspierweefsel zit enkel in het hart.'] },
      { t:'mc', v:'Je draait aan een deurklink en je handpalm draait mee. Welk gewricht doet dat?', o:['Rolgewricht (spaakbeen rond ellepijp)','Scharniergewricht','Kogelgewricht'], a:0, w:['','Een scharnier buigt en strekt in 1 vlak (elleboog), het draait niet rond een as.','Een kogelgewricht (schouder, heup) beweegt in alle richtingen.'] },
    ],
  },
  C1: {
    kern: { v:'Leg de vicieuze cirkel van de 3e eeuw uit in je eigen woorden.', m:'Er komen <b>meer invallen</b> → er is een <b>groter leger</b> nodig → dat kost geld, dus <b>hogere belastingen</b> → de <b>bevolking wordt armer</b> en de economie zwakker → het <b>rijk wordt zwakker</b> → nog meer invallen. Zo blijft het rondgaan en wordt het telkens erger.', k:['inval|germanen|aanval','leger|soldaat','belasting','arm|economie','zwak','cirkel|opnieuw|rond|erger'] },
    toep: [
      { t:'mc', v:'Een Germaan krijgt land binnen het rijk en moet in ruil de grens verdedigen. Hoe noem je hem?', o:['Foederatus (bondgenoot)','Comitatensis','Soldatenkeizer'], a:0, w:['','Comitatenses = het mobiele veldleger van Diocletianus.','Een soldatenkeizer is een generaal die door zijn leger keizer wordt gemaakt.'] },
      { t:'mc', v:'Waarom verhuisde Constantijn de hoofdstad naar Byzantium?', o:['Rome was moeilijk te verdedigen en het rijke oosten was belangrijker','Hij hield niet van de Romeinse goden','Rome was verwoest door de Hunnen'], a:0, w:['','Hij was wel christen, maar dat was niet de reden voor de nieuwe hoofdstad.','De Hunnen kwamen later en hebben Rome niet verwoest.'] },
    ],
  },
  C2: {
    kern: { v:'Waarom is 476 een "afspraak" en geen plotse breuk? Wat gebeurde er toen?', m:'In <b>476</b> zette de Germaan <b>Odoaker</b> de laatste West-Romeinse keizer <b>Romulus Augustulus</b> af. Historici <b>spreken af</b> dat de middeleeuwen dan beginnen, maar de verandering ging <b>traag</b>: voor de mensen veranderde er weinig van de ene dag op de andere.', k:['odoaker','romulus','afspraak|afgesproken|spreken af','traag|langzaam|geleidelijk|weinig'] },
    toep: [
      { t:'mc', v:'Kerstmis valt rond het midwinterfeest van de Germanen. Welke invloed zie je hier samen?', o:['Germaans én christelijk','Enkel Romeins','Enkel Germaans'], a:0, w:['','Kerstmis is een christelijk feest, het joelfeest Germaans. Romeins is het niet.','Kerstmis zelf komt uit het christendom.'] },
      { t:'mc', v:'In het Frans zeg je "vin", in het Nederlands "wijn". Van welke invloed komt het woord?', o:['Romeins (Latijn)','Germaans','Christelijk'], a:0, w:['','Wijn kwam met de Romeinen, het woord komt van het Latijnse vinum.','Wijn wordt wel gebruikt in de kerk, maar de wijn zelf en het woord zijn Romeins.'] },
    ],
  },
  C3: {
    kern: { v:'Waarom werd het Frankische rijk telkens zwakker na de dood van een koning?', m:'Het koningschap was <b>erfelijk</b> en <b>alle zonen erfden</b>. Daardoor werd het rijk telkens <b>verdeeld</b> in stukken en kwam er <b>ruzie tussen de broers</b>, wat het rijk verzwakte.', k:['erf','zonen|broers|kinderen','verdeel|stukken|gesplitst','ruzie|oorlog|strijd'] },
    toep: [
      { t:'mc', v:'Een boer betaalt zijn heer met 10 zakken graan en 3 dagen werk op het land. Wat is dat?', o:['Betaling in natura en herendiensten','Belastingen in geld','Een vazal die trouw zweert'], a:0, w:['','Er wordt net géén geld gebruikt: op de domeinen betaalde men met producten en werk.','Een vazal krijgt land van de koning in ruil voor trouw en dienst, het is geen boer die met graan betaalt.'] },
      { t:'mc', v:'Waarom was de doop van Clovis zo belangrijk?', o:['Zijn volk volgde hem: de kerstening van de Franken','Hij werd daardoor keizer van Rome','Daarna stopten de volksverhuizingen'], a:0, w:['','Clovis werd koning van de Franken, geen Romeinse keizer.','De doop had niets te maken met het einde van de volksverhuizingen.'] },
    ],
  },
  C4: {
    kern: { v:'Leg uit wat Marcus Aurelius bedoelt met "Je hebt macht over je geest, niet over wat er buiten gebeurt".', m:'Dat is <b>stoïcisme</b>: je kan niet alles controleren wat er gebeurt, maar je <b>kiest zelf hoe je reageert</b>. Blijf <b>rustig</b>, <b>beheers je emoties</b> en doe je <b>plicht</b>. Veel lijden zit in onze <b>verbeelding</b>.', k:['stoïc|stoic','reactie|reageer|kies','emotie|rustig|beheers','plicht|controle|niet alles|buiten'] },
    toep: [
      { t:'mc', v:'Je ploeg verliest door een foute beslissing van de scheidsrechter. Wat zou een stoïcijn doen?', o:['Kalm blijven: je kan de scheidsrechter niet veranderen, wel je reactie','Boos worden, want het is oneerlijk','Nooit meer voetballen'], a:0, w:['','Boos worden is je emoties niet beheersen. Dat helpt niets.','Opgeven past niet bij plicht en moed, twee stoïcijnse deugden.'] },
      { t:'mc', v:'"Doe wat moet. Denk eraan: het leven is kort." Welke schrijftechniek gebruikt Marcus Aurelius hier?', o:['Zelfaansporing (en een aforisme)','Een natuurmetafoor','Een lang doorlopend verhaal'], a:0, w:['','Er komt geen beeld uit de natuur in voor (zoals de zwerm en de bij).','Meditaties is net fragmentarisch: losse gedachten, geen doorlopend verhaal.'] },
    ],
  },
};
// Toepassingsvragen bij de gewone quizvragen zetten.
for (const t of (window.ELI_ONDERWERPEN || [])) {
  const s = S[t.id]; if (!s) continue;
  if (s.toep && !t._snap) { t.quiz.push(...s.toep.map(q => ({ ...q, toep: true }))); t._snap = true; }
}
window.ELI_SNAP = S;
// De 3 overhoorvragen van een dag: dezelfde op Eli's app en op de supporterspagina.
// Uit onderwerpen die vóór vandaag geleerd zijn (anders die van vandaag): 1 kernvraag + 2 kaartjes.
window.ELI_OVERHOOR = (dag, stand, P) => {
  const T = window.ELI_ONDERWERPEN || [], taken = (stand && stand.taken) || {};
  const opDag = window.ELI.opDag;
  let seed = [...dag].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  let pool = T.filter(t => t.vak !== 'fr' && taken['leer:' + t.id] && opDag(taken['leer:' + t.id].op) < dag);
  if (pool.length < 2) { const plan = P.maak()[dag] || []; pool = plan.filter(i => i.onderwerp).map(i => T.find(t => t.id === i.onderwerp)).filter(t => t && t.vak !== 'fr'); }
  if (!pool.length) pool = T.filter(t => t.vak !== 'fr').slice(0, 3);
  pool = pool.slice().sort((a, b) => a.id < b.id ? -1 : 1);
  const neem = () => pool.splice(Math.floor(rnd() * pool.length), 1)[0] || T[0];
  const uit = [];
  const t1 = neem(); if (S[t1.id]) uit.push({ v: S[t1.id].kern.v, a: S[t1.id].kern.m, tid: t1.id });
  while (uit.length < 3) {
    const t = pool.length ? neem() : t1;
    const [v, a] = t.kaarten[Math.floor(rnd() * t.kaarten.length)];
    if (!uit.some(x => x.v === v)) uit.push({ v, a, tid: t.id });
  }
  return uit;
};
})();
