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
    '<b>Biologie</b>: levende organismen en hun omgeving (Darwin, evolutietheorie). <b>Chemie</b>: hoe atomen/moleculen zich reorganiseren tot nieuwe stoffen (samenstelling verandert; Marie Curie, radioactiviteit). <b>Fysica</b>: eigenschappen van materie en energie <b>zonder dat de samenstelling verandert</b> (smelten van ijs, staaf zet uit, bliksem; Einstein, E = m·c²).',
    'Raakvlakken: <b>biochemie</b> (bio + chemie), <b>biofysica</b> (bio + fysica), <b>fysicochemie</b> (fysica + chemie).',
    'Wetenschappelijke onderzoeksmethode: 1 oriënteren · 2 onderzoeksvraag · 3 hypothese · 4 benodigdheden · 5 werkwijze + schets · 6 waarnemingen · 7 besluit · 8 reflecteren.',
    'Een <b>grootheid</b> is iets wat je kan <b>meten</b> (lengte, massa; schoonheid niet). <b>7 basisgrootheden</b>: lengte (l, meter m), massa (m, kilogram kg), tijd (t, seconde s), stroomsterkte (I, ampère A), temperatuur (T, kelvin K), lichtsterkte (I<sub>v</sub>, candela cd), stofhoeveelheid (n, mol). Andere = <b>afgeleide grootheden</b>.',
    'Afgeleide grootheden om te kennen: <b>spanning U – volt V</b> · <b>energie E – joule J</b> · <b>oppervlakte A – m²</b> · <b>volume V – m³</b> (en kracht F – newton N).',
    '<b>SI</b> = Système international d\'unités. Meetresultaat = <b>grootheid = maatgetal + eenheid</b> (l = 3,85 m).',
    '<b>Nauwkeurigheid</b> = kleinst meetbare waarde (meetlat 1 mm). <b>Meetbereik</b> = verschil tussen kleinste en grootste meetresultaat (vouwmeter 2 m).',
    '<b>Scalaire grootheid</b>: enkel grootte (massa, lengte, temperatuur, tijd). <b>Vectoriële grootheid</b>: <b>grootte, richting, zin en aangrijpingspunt</b> (kracht, snelheid, versnelling), genoteerd met een pijltje boven de letter.'
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
    'Voorvoegsels (tabel kennen!): <b>giga G 10⁹</b> · <b>mega M 10⁶</b> · <b>kilo k 10³</b> · hecto h 10² · deca da 10¹ · — 10⁰ · deci d 10⁻¹ · <b>centi c 10⁻²</b> · <b>milli m 10⁻³</b> · <b>micro µ 10⁻⁶</b> · <b>nano n 10⁻⁹</b>.',
    'Werkwijze: 1) gelijkheid noteren · 2) macht van 10 van het gegeven voorvoegsel · 3) macht van het gevraagde voorvoegsel · 4) maatgetal × machten · 5) rekenregel machten toepassen.',
    'Van <b>groot naar klein</b> (km → m): macht met <b>positieve</b> exponent. Van <b>klein naar groot</b> (ns → s): <b>negatieve</b> exponent.',
    'Voorbeelden: 8 ns = 8·10⁻⁹ s · 2 Mm = 2·10⁶·10³ mm = 2·10⁹ mm.',
    '<b>Oppervlakte (m²)</b>: exponent × 2. <b>Volume (m³)</b>: exponent × 3. Bv. 5 cm³ = 5·(10⁻²)³ m³ = 5·10⁻⁶ m³.',
    'Kies een handige eenheid: 25 mA i.p.v. 0,025 A.'
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
    '<b>Beduidende cijfers (BC)</b> tonen hoe nauwkeurig gemeten werd. Tel vanaf het <b>eerste cijfer ≠ 0</b>. Nullen <b>vooraan tellen niet</b> (0,23 g = 2 BC), nullen <b>in of achteraan wel</b> (23,0 g = 3 BC; 1,05 = 3 BC).',
    'Constanten en <b>getelde aantallen</b> (9 jongens) hebben geen BC-beperking.',
    '<b>Afronden</b>: volgend cijfer 0–4 → blijft; 5–9 → één hoger.',
    '<b>Optellen/aftrekken</b>: resultaat even nauwkeurig (zelfde aantal decimalen) als het <b>minst nauwkeurige</b> meetresultaat. 33 m + 2,63 m = 35,63 → <b>36 m</b>.',
    '<b>Vermenigvuldigen/delen</b>: resultaat krijgt evenveel <b>BC</b> als de meetwaarde met het <b>minste BC</b>. 5,00 km / 1,1 u = 4,5454… → <b>4,5 km/u</b>.',
    'Bij tussenstappen: <b>pas op het einde afronden</b>.',
    '<b>Wetenschappelijke notatie</b>: 1 cijfer ≠ 0 vóór de komma × macht van 10, met het juiste aantal BC. 3,5 km = 3,5·10³ m (niet 3500 m) · 0,000123 g = 1,23·10⁻⁴ g · 12 m = 1,2·10¹ m · 12,6 m² = 1,26·10¹ m².'
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
    'Kracht = hoe hard er aan een voorwerp <b>geduwd of getrokken</b> wordt. Symbool <b>F</b> (force), eenheid <b>newton (N)</b>. 1 N = kracht om 1 kg te versnellen met 1 m/s²; ≈ zwaartekracht op <b>100 g</b>; flesje 0,5 L ≈ 5 N.',
    '<b>Dynamisch effect</b> (verandering van snelheid): sneller/trager · zin verandert · richting verandert. <b>Statisch effect</b> (vervorming): <b>elastisch</b> (keert terug, ballon loslaten) of <b>plastisch</b> (blijvend, ballon knapt).',
    '<b>Contactkracht</b>: voorwerpen raken elkaar (winkelkar duwen, normaalkracht). <b>Veldkracht</b>: werkt op afstand (zwaartekracht, ook in een vliegtuig).',
    'Kracht is <b>vectorieel</b>: <b>grootte</b> (hoeveel N, altijd positief, lengte van de pijl, teken met een <b>lat</b>!) · <b>richting</b> (horizontaal, verticaal, schuin onder hoek) · <b>zin</b> (naar links/rechts/boven/beneden) · <b>aangrijpingspunt</b> (waar de kracht inwerkt, meestal zwaartepunt).',
    '<b>Puntmassa</b> / massapunt: voorwerp vereenvoudigd tot een punt in het zwaartepunt met dezelfde massa; alle krachten daar tekenen.',
    'Teken enkel krachten <b>óp</b> het voorwerp (niet die het voorwerp zelf uitoefent). F<sub>DM</sub> = kracht van Dirk op Maria.',
    '<b>Resulterende kracht</b> = som van alle krachten. Zelfde richting en zin: <b>optellen</b>. Zelfde richting, tegengestelde zin: <b>aftrekken</b> (40 N − 40 N = 0 N).',
    'Verschillende richting: grafisch met <b>kop-staartmethode</b> (2e kracht verschuiven naar pijlpunt van de 1e, begin 1e verbinden met kop 2e) of <b>parallellogrammethode</b> (evenwijdigen tekenen, diagonaal vanuit aangrijpingspunt). Werk met een <b>schaal</b> (1 cm = 10 N) en meet: 40 N + 20 N ≠ 60 N maar bv. 53 N!'
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
    '<b>Zwaarteveldsterkte g</b> (ook valversnelling): hoe hard een hemellichaam aan 1 kg trekt, eenheid <b>N/kg</b>. Op aarde <b>9,81 N/kg</b> (polen 9,83 · evenaar 9,78 → hoe dichter bij het centrum, hoe groter). Maan 1,62 N/kg (tabel niet vanbuiten).',
    '<b>Zwaartekracht F<sub>z</sub> = m · g</b>: veldkracht, altijd <b>recht naar beneden</b> (naar het centrum van de aarde), aangrijpingspunt = <b>zwaartepunt</b>. Bowlingbal 5,00 kg: F<sub>z</sub> = 5,00 · 9,81 = <b>49,1 N</b> (3 BC); op de maan 8,10 N.',
    '<b>Normaalkracht F<sub>n</sub></b>: <b>contactkracht</b> van een ondersteuning, altijd <b>loodrecht op het steunvlak</b>, weg van het oppervlak; werkt het binnendringen tegen (atomen stoten elkaar af). Ligt een voorwerp stil op een horizontale ondergrond: <b>F<sub>z</sub> = F<sub>n</sub></b>.',
    '<b>Massa</b> = hoeveelheid stof (kg), <b>overal gelijk</b> in het universum. <b>Gewicht G</b> = kracht die een lichaam uitoefent op zijn <b>ondersteuning</b> (N), contactkracht: G = m · g. Geen contact (vallen) = geen gewicht. Gewicht verschilt per planeet.',
    'Gewicht: aangrijpingspunt = contactpunt op het steunvlak · richting loodrecht op steunvlak · zin tegengesteld aan F<sub>n</sub> · grootte = grootte F<sub>n</sub>.',
    '<b>Zwaartepunt</b>: snijpunt van alle <b>zwaartelijnen</b> (verticale dragers van F<sub>z</sub>). Bij regelmatige, homogene voorwerpen in het midden, ook als daar geen materie is (ring).'
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
    '<b>Veer</b>: spiraalvormig voorwerp dat ingedrukt of uitgerekt kan worden en terugkeert (<b>elastische vervorming</b>). <b>Drukveren</b> (balpen, schokdemper) en <b>trekveren</b> (slinky, labo).',
    'Proef: hang massa\'s aan een veer, meet de <b>uitrekking Δl</b>. Kracht = zwaartekracht op de massa (F = m·g). Grafiek F (y-as) tegen Δl (x-as) = <b>rechte</b> → <b>recht evenredig</b>.',
    'F/Δl is constant = <b>veerconstante k</b> (N/m), uniek per veer. Grote k = <b>stijve</b> veer, kleine k = <b>slappe</b> veer.',
    '<b>Wet van Hooke</b> (Robert Hooke): <b>F<sub>v</sub> = k · Δl</b>. Afgeleid: <b>k = F<sub>v</sub> / Δl</b> en <b>Δl = F<sub>v</sub> / k</b>.',
    'Let op de eenheden: Δl in <b>meter</b> als k in N/m staat (5,0 cm = 0,050 m).'
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
    '<b>6 functies</b> van spieren: 1 <b>beweging</b> · 2 <b>warmteproductie</b> (bibberen) · 3 <b>regulatie van lichaamsfuncties</b> (bloed, lucht, voedsel vervoeren) · 4 <b>bescherming van organen</b> (buikspieren) · 5 <b>houding en stabilisatie</b> · 6 <b>energieopslag</b> (glycogeen). Spieren = ± <b>helft</b> van je lichaamsgewicht.',
    '<b>Skeletspieren</b> zitten met een <b>pees</b> vast aan beenderen (meestal 2 pezen, aan 2 botten, over een gewricht). Pees = taaie band bindweefsel die kracht van spier naar bot overbrengt.',
    'Een skeletspier kan enkel <b>actief samentrekken</b> (korter en dikker), niet actief uitrekken → werken in <b>koppels</b> met tegengestelde werking = <b>antagonisten</b>.',
    'Arm buigen: <b>biceps</b> trekt samen (= <b>agonist</b>), triceps ontspant. Arm strekken: <b>triceps</b> trekt samen (= antagonist van de biceps). Biceps = tweehoofdig, triceps = driehoofdig (vast aan schouderblad en ellepijp).',
    'Been strekken in de knie: <b>quadriceps</b> (voorkant bovenbeen). Buigen: <b>hamstring</b> (achterkant). Quadriceps en hamstring = antagonisten.',
    '<b>Macroscopisch</b> (met het oog) vs. <b>microscopisch</b> (met microscoop).',
    'Bouw skeletspier van groot naar klein: <b>spier</b> met <b>spierschede</b> (bindweefsel: bescherming, vasthechting, krachtoverdracht) → <b>spierbuik</b> (dikste deel, trekt samen) → <b>spierbundels</b> met <b>bundelschede</b> → <b>spiervezels</b> (= 1 langgerekte spiercel, cilindervormig, cm lang) → <b>spierfibrillen</b> → <b>actine- en myosinefilamenten</b> (zorgen voor samentrekking). Daartussen <b>bloedvaten</b> (zuurstof, voeding, afvoer) en <b>zenuwcellen (neuronen)</b>.'
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
    ['Welke filamenten zorgen voor samentrekking?','Actine en myosine']
  ],
  quiz:[
    {t:'mc',v:'Je buigt je arm. Welke spier is de agonist?',o:['Biceps','Triceps','Quadriceps','Hamstring'],a:0},
    {t:'mc',v:'Je trapt een bal (been strekken). Welke spier trekt samen?',o:['Quadriceps','Hamstring','Biceps','Triceps'],a:0},
    {t:'mc',v:'Wat is de antagonist van de quadriceps?',o:['Hamstring','Biceps','Kuitspier','Triceps'],a:0},
    {t:'mc',v:'Wat gebeurt met een spier die samentrekt?',o:['Korter en dikker','Langer en dunner','Korter en dunner','Langer en dikker'],a:0},
    {t:'mc',v:'Welke structuur is het kleinst?',o:['Myosinefilament','Spierbundel','Spiervezel','Spierbuik'],a:0},
    {t:'mc',v:'Bibberen als je het koud hebt hoort bij welke functie?',o:['Warmteproductie','Bescherming','Energieopslag','Houding'],a:0},
    {t:'jf',v:'Spieren zijn goed voor ongeveer de helft van ons lichaamsgewicht.',a:true},
    {t:'volgorde',v:'Zet van groot naar klein.',o:['Spier','Spierbundel','Spiervezel','Spierfibril','Actine/myosine']}
  ]
},
{
  id:'W8', vak:'wet', titel:'Spierweefsels & gewrichten',
  bron:[['Cursus spieren en gewrichten p. 7–12', SP]],
  samenvatting:[
    '<b>Dwarsgestreept spierweefsel</b> (skeletspieren, ook gelaatsspieren): duidelijk <b>streepjespatroon</b> · <b>veelkernig</b> · hecht aan het skelet · <b>willekeurig</b> (onder invloed van je wil) · trekt <b>zeer snel</b> samen · maar <b>snel vermoeid</b>.',
    '<b>Glad spierweefsel</b> (slokdarm, maag, darmen, bloedvaten, pupil, ademhaling): duidelijke celkern, <b>geen streepjes</b> · vooral in spijsverteringsstelsel · <b>onwillekeurig</b> · trekt <b>traag</b> samen, werkt langdurig · bijna nooit vermoeid.',
    '<b>Hartspierweefsel</b>: enkel in het <b>hart</b> · wel een soort streepjespatroon (lijkt meer op dwarsgestreept) · <b>onwillekeurig</b> · traag én snel · <b>nooit vermoeid</b>.',
    '<b>Gewricht</b> = verbinding tussen twee beenderen waarbij beweging mogelijk is.',
    '<b>Onbeweeglijk</b>: verbonden met bind- of beenweefsel, geen beweging: <b>schedelnaden</b> (nodig voor de geboorte, groeien daarna vast). <b>Beperkt beweeglijk</b>: kraakbeen ertussen: tussen <b>wervels</b>, tussen <b>ribben en borstbeen</b>.',
    '<b>Beweeglijke gewrichten</b>: <b>scharnier</b> (buigen en strekken, 1 vlak: elleboog, knie, vingers) · <b>zadel</b> (2 richtingen: basis van de duim) · <b>kogel</b> (bijna alle richtingen, cirkel: schouder, heup) · <b>rol</b> (draaien rond een as: spaakbeen en ellepijp, handpalm omdraaien).',
    '<b>Bouw van een gewricht</b>: <b>gewrichtskop</b> (rond uiteinde) · <b>gewrichtskom</b> (komvormig uiteinde) · <b>kraakbeenlaagje</b> (glad, soepel bewegen) · <b>gewrichtssmeer</b> (stroperige smeervloeistof) · <b>gewrichtskapsel</b> (bindweefsel rond de uiteinden) · <b>gewrichtsbanden</b> (stevigheid, houden beenderen op hun plaats).'
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
}
);
})();
