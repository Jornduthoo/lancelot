// De ingebouwde weetjes van de ontdekwereld: per niveau een vraag met keuzes en een weetje dat in het ontdekkersboek komt.
// { o: onderwerp, v: vraag, a: keuzes, j: plaats van het juiste antwoord, w: het weetje }.
// De leerkracht kan met AI eigen weetjes voor zijn leerjaar toevoegen; die komen eerst.
// LABO: wat je leert bij de proeven in het labo (stroomkring, tandwielen en de wip).

const PAGE = [
  { o: 'Dieren', v: 'Welk dier is het grootste dier ter wereld?', a: ['de olifant', 'de blauwe vinvis', 'de giraf'], j: 1, w: 'De blauwe vinvis kan meer dan 30 meter lang worden: langer dan twee bussen achter elkaar.' },
  { o: 'Dieren', v: 'Hoeveel poten heeft een spin?', a: ['zes', 'acht', 'tien'], j: 1, w: 'Een spin heeft acht poten. Insecten hebben er zes, dus een spin is geen insect.' },
  { o: 'Ruimte', v: 'Welke planeet noemen we de rode planeet?', a: ['Mars', 'Venus', 'Jupiter'], j: 0, w: 'Mars is rood door roest in de bodem: er zit veel ijzer in.' },
  { o: 'Ruimte', v: 'Wat draait rond de aarde?', a: ['de zon', 'de maan', 'Mars'], j: 1, w: 'De maan draait in ongeveer een maand één keer rond de aarde.' },
  { o: 'Natuur', v: 'Wat heeft een plant nodig om te groeien?', a: ['licht en water', 'alleen zand', 'snoep'], j: 0, w: 'Met zonlicht, water en lucht maakt een plant zelf haar voedsel.' },
  { o: 'Lichaam', v: 'Hoeveel melktanden heeft een kind?', a: ['10', '20', '40'], j: 1, w: 'Een kind heeft 20 melktanden. Een volwassene heeft er later meestal 32.' },
  { o: 'Dieren', v: 'Welk dier slaapt ondersteboven?', a: ['de vleermuis', 'de uil', 'de kat'], j: 0, w: 'Een vleermuis hangt ondersteboven aan haar poten. Zo kan ze meteen wegvliegen.' },
  { o: 'Geschiedenis', v: 'Waar woonde een ridder vaak?', a: ['in een burcht', 'in een iglo', 'in een flat'], j: 0, w: 'Een burcht had dikke muren, torens en soms een gracht met water errond.' },
  { o: 'Natuur', v: 'Wat wordt een rups later?', a: ['een vlinder', 'een kever', 'een slak'], j: 0, w: 'Een rups maakt een cocon en verandert daarin in een vlinder. Dat heet een gedaanteverwisseling.' },
  { o: 'Ruimte', v: 'Wat is de zon?', a: ['een ster', 'een planeet', 'een maan'], j: 0, w: 'De zon is een ster. Ze lijkt groter dan andere sterren omdat ze veel dichter bij ons staat.' },
  { o: 'Dieren', v: 'Welk dier heeft een slurf?', a: ['de olifant', 'de neushoorn', 'het nijlpaard'], j: 0, w: 'Met zijn slurf kan een olifant ruiken, drinken, dingen vastpakken en zelfs douchen.' },
  { o: 'Techniek', v: 'Wat trekt een magneet aan?', a: ['ijzer', 'hout', 'plastic'], j: 0, w: 'Een magneet trekt ijzer aan. Hout, plastic en papier trekt hij niet aan.' },
  { o: 'Natuur', v: 'Waarom verliezen veel bomen in de herfst hun bladeren?', a: ['om water en kracht te sparen voor de winter', 'omdat de wind boos is', 'omdat de bladeren moe zijn'], j: 0, w: 'In de winter is er weinig licht en bevriest het water. Zonder bladeren verliest de boom minder water.' },
  { o: 'Dieren', v: 'Hoe ademt een vis onder water?', a: ['met kieuwen', 'met longen, net als wij', 'door zijn staart'], j: 0, w: 'Een vis haalt met zijn kieuwen zuurstof uit het water.' },
  { o: 'Uitvindingen', v: 'Wat gebruikte men om te bellen voor er gsm\'s waren?', a: ['een vaste telefoon', 'een televisie', 'een radio'], j: 0, w: 'De telefoon werd in 1876 voorgesteld. Eerst hing hij vast aan de muur, met een draad.' },
];

const SCHILDKNAAP = [
  { o: 'Ruimte', v: 'Welke planeet is de grootste van ons zonnestelsel?', a: ['de aarde', 'Jupiter', 'Saturnus', 'Mars'], j: 1, w: 'Jupiter is zo groot dat er meer dan 1300 aardes in zouden passen.' },
  { o: 'Dieren', v: 'Welk landdier is het snelst?', a: ['het jachtluipaard', 'de leeuw', 'het paard', 'de struisvogel'], j: 0, w: 'Een jachtluipaard haalt ongeveer 100 km per uur, maar houdt dat maar een kort stukje vol.' },
  { o: 'Uitvindingen', v: 'Wie maakte rond 1450 de boekdrukkunst met losse letters bekend in Europa?', a: ['Johannes Gutenberg', 'Thomas Edison', 'Albert Einstein', 'Napoleon'], j: 0, w: 'Dankzij de drukpers moesten boeken niet meer met de hand overgeschreven worden. Zo konden veel meer mensen lezen.' },
  { o: 'Geschiedenis', v: 'Hoe heetten de soldaten van het Romeinse leger?', a: ['legionairs', 'ridders', 'samoerai', 'vikingen'], j: 0, w: 'Romeinse legionairs liepen soms meer dan 30 km per dag, met hun hele uitrusting op hun rug.' },
  { o: 'Natuur', v: 'Wat is de grootste oceaan?', a: ['de Atlantische Oceaan', 'de Stille Oceaan', 'de Indische Oceaan', 'de Noordelijke IJszee'], j: 1, w: 'De Stille Oceaan is groter dan al het land op aarde samen.' },
  { o: 'Lichaam', v: 'Welk orgaan pompt het bloed door je lichaam?', a: ['het hart', 'de longen', 'de maag', 'de lever'], j: 0, w: 'Je hart klopt ongeveer 100 000 keer per dag, ook als je slaapt.' },
  { o: 'Ruimte', v: 'Hoe lang doet de aarde erover om één keer rond de zon te draaien?', a: ['een dag', 'een maand', 'een jaar', 'tien jaar'], j: 2, w: 'Eén rondje rond de zon duurt ongeveer 365 dagen: één jaar.' },
  { o: 'Dieren', v: 'Wat eet een reuzenpanda vooral?', a: ['bamboe', 'vis', 'gras', 'fruit'], j: 0, w: 'Een panda eet tot 12 uur per dag bamboe, want er zit weinig voeding in.' },
  { o: 'Techniek', v: 'Wat zet een windturbine om in elektriciteit?', a: ['de kracht van de wind', 'zonlicht', 'steenkool', 'regen'], j: 0, w: 'De wind draait de wieken rond. Een generator in de turbine maakt daar stroom van.' },
  { o: 'Geschiedenis', v: 'Welke Belgische stad is bekend om haar Belfort en haar reien (kanalen)?', a: ['Brugge', 'Luik', 'Hasselt', 'Aarlen'], j: 0, w: 'In de middeleeuwen was Brugge een van de rijkste handelssteden van Europa.' },
  { o: 'Natuur', v: 'Bij welke temperatuur bevriest water?', a: ['0 °C', '10 °C', '100 °C', '-50 °C'], j: 0, w: 'Water bevriest bij 0 °C en kookt bij 100 °C.' },
  { o: 'Ruimte', v: 'Wie zette in 1969 als eerste mens een voet op de maan?', a: ['Neil Armstrong', 'Joeri Gagarin', 'Christoffel Columbus', 'Albert Einstein'], j: 0, w: 'Zijn voetafdruk staat er waarschijnlijk nog: op de maan waait er geen wind.' },
  { o: 'Dieren', v: 'Welk zoogdier kan echt vliegen?', a: ['de vleermuis', 'de vliegende eekhoorn', 'de pinguïn', 'de struisvogel'], j: 0, w: 'De vleermuis is het enige zoogdier dat echt vliegt. Een vliegende eekhoorn zweeft alleen.' },
  { o: 'Lichaam', v: 'Hoeveel botten heeft een volwassen mens ongeveer?', a: ['ongeveer 50', 'ongeveer 206', 'ongeveer 1000', 'ongeveer 12'], j: 1, w: 'Een baby heeft er meer, ongeveer 300. Een aantal groeit later aan elkaar vast.' },
  { o: 'Ruimte', v: 'Waarom zie je de maan soms als een halve maan?', a: ['we zien maar een deel van de kant die de zon verlicht', 'de maan is dan echt kapot', 'er hangt een wolk voor', 'de aarde neemt een hap'], j: 0, w: 'De maan geeft zelf geen licht. Ze weerkaatst het licht van de zon.' },
];

const RIDDER = [
  { o: 'Ruimte', v: 'Hoe lang doet het licht van de zon erover om de aarde te bereiken?', a: ['ongeveer 8 seconden', 'ongeveer 8 minuten', 'ongeveer 8 uur', 'ongeveer 8 dagen'], j: 1, w: 'Licht gaat 300 000 km per seconde. Toch duurt de reis van de zon naar ons ongeveer 8 minuten.' },
  { o: 'Natuur', v: 'Welk gas halen planten uit de lucht om voedsel te maken?', a: ['zuurstof', 'koolstofdioxide', 'stikstof', 'helium'], j: 1, w: 'Planten nemen koolstofdioxide op en geven zuurstof af. Dat heet fotosynthese.' },
  { o: 'Geschiedenis', v: 'In welk jaar werd België een onafhankelijk land?', a: ['1815', '1830', '1914', '1958'], j: 1, w: 'In 1830 scheurde België zich af van het Verenigd Koninkrijk der Nederlanden. In 1831 kwam de eerste koning, Leopold I.' },
  { o: 'Uitvindingen', v: 'Wat ontdekte Alexander Fleming in 1928?', a: ['penicilline', 'elektriciteit', 'de telefoon', 'röntgenstralen'], j: 0, w: 'Fleming zag dat een schimmel bacteriën doodde. Zo ontstond het eerste antibioticum.' },
  { o: 'Dieren', v: 'Hoeveel harten heeft een octopus?', a: ['één', 'twee', 'drie', 'acht'], j: 2, w: 'Een octopus heeft drie harten en blauw bloed.' },
  { o: 'Techniek', v: 'Waarom zit er koperdraad in een elektriciteitskabel?', a: ['koper geleidt stroom heel goed', 'koper is mooi en glanzend', 'koper houdt stroom tegen', 'koper is magnetisch'], j: 0, w: 'Koper geleidt stroom goed. Het plastic eromheen is een isolator: dat beschermt je.' },
  { o: 'Ruimte', v: 'Welke planeet staat het dichtst bij de zon?', a: ['Mercurius', 'Venus', 'de aarde', 'Mars'], j: 0, w: 'Op Mercurius is het overdag meer dan 400 °C, en \'s nachts kouder dan -170 °C.' },
  { o: 'Geschiedenis', v: 'Welke schilder maakte samen met zijn broer het Lam Gods in Gent?', a: ['Jan van Eyck', 'Peter Paul Rubens', 'René Magritte', 'Pieter Bruegel'], j: 0, w: 'Het Lam Gods werd in 1432 voltooid en is een van de bekendste schilderijen ter wereld.' },
  { o: 'Natuur', v: 'Wat meet een barometer?', a: ['de luchtdruk', 'de temperatuur', 'de windsnelheid', 'hoeveel regen er valt'], j: 0, w: 'Daalt de luchtdruk snel, dan komt er vaak slecht weer aan.' },
  { o: 'Lichaam', v: 'Wat vervoeren je rode bloedcellen?', a: ['zuurstof', 'voedsel naar je maag', 'geluid', 'kalk voor je botten'], j: 0, w: 'Rode bloedcellen brengen zuurstof van je longen naar elk deeltje van je lichaam.' },
  { o: 'Uitvindingen', v: 'Wie maakte rond 1879 de gloeilamp bruikbaar voor gewone huizen?', a: ['Thomas Edison', 'Isaac Newton', 'Leonardo da Vinci', 'Marie Curie'], j: 0, w: 'Ook anderen werkten aan de gloeilamp, maar Edison maakte er een die lang bleef branden.' },
  { o: 'Dieren', v: 'Waarom heeft een ijsbeer een zwarte huid onder zijn witte vacht?', a: ['een zwarte huid neemt warmte van de zon goed op', 'om zich te verstoppen in de nacht', 'omdat hij vuil is', 'om vissen te lokken'], j: 0, w: 'De haren van een ijsbeer zijn eigenlijk doorzichtig. Ze lijken wit door het licht.' },
  { o: 'Ruimte', v: 'Wat is een lichtjaar?', a: ['een afstand', 'een tijd', 'een snelheid', 'een ster'], j: 0, w: 'Een lichtjaar is de afstand die licht in één jaar aflegt: bijna 10 biljoen kilometer.' },
  { o: 'Techniek', v: 'Waarom blijft een zwaar stalen schip drijven?', a: ['het duwt veel water opzij en is van binnen grotendeels hol', 'staal drijft altijd', 'de motoren houden het boven', 'zeewater is plakkerig'], j: 0, w: 'Een voorwerp drijft als het meer water opzij duwt dan het zelf weegt. Dat ontdekte Archimedes.' },
  { o: 'Geschiedenis', v: 'Welke uitvinding van ongeveer 3500 voor Christus maakte vervoer veel makkelijker?', a: ['het wiel', 'de stoommachine', 'de fiets', 'de trein'], j: 0, w: 'De eerste wielen waren uit één stuk hout. Later kwamen er spaken bij, zodat ze lichter werden.' },
];

// Wat je in het labo ontdekt, per proef. Na elke opgeloste proef komt er één in je ontdekkersboek.
const LABO = {
  stroom: [
    'Stroom loopt alleen rond als de kring helemaal gesloten is. Eén onderbreking en de lamp gaat uit.',
    'Metalen zoals koper geleiden stroom goed. Plastic, hout en rubber niet: dat zijn isolatoren.',
    'Een schakelaar opent of sluit de stroomkring. Zo zet je een lamp aan en uit.',
    'Rond 1800 maakte Alessandro Volta de eerste batterij, met schijfjes metaal en karton in zout water.',
  ],
  tandwiel: [
    'Twee tandwielen die in elkaar grijpen, draaien altijd in tegengestelde richting.',
    'Een klein tandwiel draait sneller dan een groot. Heeft het grote wiel drie keer zoveel tanden, dan draait het kleine drie keer zo vaak rond.',
    'Op een fiets werken tandwielen met een ketting: een groot wiel voor en een klein wiel achter maakt je snel.',
    'Oude torenuurwerken zitten vol tandwielen. Zo draait de kleine wijzer twaalf keer trager dan de grote.',
  ],
  wip: [
    'Met een hefboom til je iets zwaars met minder kracht op.',
    'Hoe verder iets van het draaipunt staat, hoe meer kracht het geeft. Daarom kan een kind een volwassene optillen op de wip.',
    'Archimedes zei: "Geef me een vaste plaats om te staan, en ik til de aarde op." Hij bedoelde een heel lange hefboom.',
    'Een schaar, een notenkraker en een kruiwagen zijn ook hefbomen.',
  ],
  drijven: [
    'Iets drijft als het lichter is dan evenveel water. Kurk en hout zijn lichter dan water, ijzer en steen zwaarder.',
    'Een bolletje klei zinkt, maar maak je er een bootje van, dan drijft het: het duwt meer water opzij.',
    'In zout water drijf je makkelijker dan in zoet water. In de Dode Zee kan je bijna zitten op het water.',
    'Een sinaasappel met schil drijft dankzij de luchtbelletjes in de schil. Zonder schil zinkt hij.',
  ],
  thermo: [
    'Water bevriest bij 0 graden en kookt bij 100 graden. Daarop is de schaal van Celsius gebouwd.',
    'Onder nul schrijf je een min: -5 graden is 5 graden kouder dan 0.',
    'Het verschil tussen -3 en 4 graden is 7 graden: 3 tot nul en dan nog 4.',
    'Je lichaam is ongeveer 37 graden warm. Met 38 graden of meer heb je koorts.',
  ],
};

module.exports = { PAGE, SCHILDKNAAP, RIDDER, LABO };
