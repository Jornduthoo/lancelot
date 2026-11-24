/* Oefentoetsen per week. Voeg elke week een blok toe aan WEKEN.
   Vraagtypes: mc (k = keuzes, a = index juiste), jf (a = true/false), invul (a = aanvaarde antwoorden),
   volg (items in de JUISTE volgorde; de leerling nummert), koppel (paren [links, rechts]). invul met exact: true = hoofdletters tellen mee (spelling).
   Geen "1b"-niveau = 1B-leerlingen zien die toets niet (bv. Frans: 1B krijgt nooit Frans). Begrijpend lezen: teksten per niveau, tekst = index per vraag, echteTekst = link naar de echte toetstekst. */
window.WEKEN = [
{
  week: "2026-11-16",
  label: "Week van 16 november",
  toetsen: [
  {
    id: "wisk-meetkunde-b3",
    vak: "Wiskunde",
    titel: "Meetkunde blok 3: driehoeken en vierhoeken",
    datum: "dinsdag 17 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "koppel", v: "Verbind de hoek met de juiste naam.", paren: [["40°","scherpe hoek"],["90°","rechte hoek"],["125°","stompe hoek"],["180°","gestrekte hoek"]], u: "Scherp: kleiner dan 90°. Recht: 90°. Stomp: tussen 90° en 180°. Gestrekt: 180°." },
          { t: "mc", v: "Een driehoek heeft hoeken van 60°, 50° en 70°. Welke driehoek is dat?", k: ["scherphoekig", "rechthoekig", "stomphoekig"], a: 0, u: "Alle drie de hoeken zijn kleiner dan 90°: scherphoekig." },
          { t: "mc", v: "Een driehoek heeft hoeken van 30°, 20° en 130°. Welke driehoek is dat?", k: ["scherphoekig", "rechthoekig", "stomphoekig"], a: 2, u: "Er is één stompe hoek (130°): stomphoekig." },
          { t: "mc", v: "Een driehoek heeft zijden van 5 cm, 5 cm en 3 cm. Welke driehoek is dat?", k: ["gelijkzijdig", "gelijkbenig", "ongelijkbenig"], a: 1, u: "Twee gelijke zijden: gelijkbenig." },
          { t: "mc", v: "Een driehoek heeft zijden van 4 cm, 6 cm en 7 cm. Welke driehoek is dat?", k: ["gelijkzijdig", "gelijkbenig", "ongelijkbenig"], a: 2, u: "Drie verschillende zijden: ongelijkbenig." },
          { t: "jf", v: "Een rechthoekige driehoek heeft 2 scherpe hoeken en 1 rechte hoek.", a: true, u: "Juist. De andere twee hoeken zijn samen 90°, dus allebei scherp." },
          { t: "jf", v: "Een gelijkzijdige driehoek kan ook stomphoekig zijn.", a: false, u: "Een gelijkzijdige driehoek heeft altijd drie hoeken van 60°. Hij is dus altijd scherphoekig." },
          { t: "invul", v: "In een driehoek is één hoek 90° en een andere hoek 35°. Hoe groot is de derde hoek? (in graden)", a: ["55", "55°", "55 graden"], u: "Samen 180°: 180 − 90 − 35 = 55°." },
          { t: "koppel", v: "Welke vierhoek ben ik?", paren: [["4 gelijke zijden en 4 rechte hoeken","vierkant"],["4 gelijke zijden, overstaande hoeken gelijk, geen rechte hoeken","ruit"],["2 paar evenwijdige zijden en 4 rechte hoeken, niet alle zijden gelijk","rechthoek"],["2 paar evenwijdige zijden, overstaande zijden en hoeken gelijk, geen rechte hoeken","parallellogram"],["juist 1 paar evenwijdige zijden","trapezium"]], u: "Kijk naar het aantal paren evenwijdige zijden, gelijke zijden en rechte hoeken." },
          { t: "mc", v: "Hoeveel paar evenwijdige zijden heeft een trapezium?", k: ["geen", "juist 1 paar", "2 paar"], a: 1, u: "Een trapezium heeft juist 1 paar evenwijdige zijden." },
          { t: "jf", v: "Een vierkant is ook een ruit.", a: true, u: "Een vierkant heeft 4 gelijke zijden, net als een ruit. Het is een ruit met 4 rechte hoeken." },
          { t: "jf", v: "Bij een parallellogram zijn de overstaande hoeken even groot.", a: true, u: "Juist, net als bij een ruit, rechthoek en vierkant." },
          { t: "mc", v: "Een vierhoek heeft hoeken van 110°, 50° en 90°. Hoe groot is de vierde hoek?", k: ["70°", "110°", "180°"], a: 1, u: "Samen 360°: 360 − 110 − 50 − 90 = 110°." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Een hoek van 90° is een …", k: ["rechte hoek", "scherpe hoek"], a: 0, u: "90° = rechte hoek, zoals de hoek van een blad papier." },
          { t: "mc", v: "Een hoek kleiner dan een rechte hoek is een …", k: ["scherpe hoek", "stompe hoek"], a: 0, u: "Kleiner dan 90° = scherp." },
          { t: "mc", v: "Een hoek groter dan een rechte hoek is een …", k: ["scherpe hoek", "stompe hoek"], a: 1, u: "Groter dan 90° (maar kleiner dan 180°) = stomp." },
          { t: "mc", v: "Een driehoek met 3 even lange zijden is …", k: ["gelijkzijdig", "gelijkbenig"], a: 0, u: "3 gelijke zijden = gelijkzijdig." },
          { t: "mc", v: "Een driehoek met 2 even lange zijden is …", k: ["gelijkzijdig", "gelijkbenig"], a: 1, u: "2 gelijke zijden = gelijkbenig." },
          { t: "mc", v: "Een driehoek met een rechte hoek is …", k: ["rechthoekig", "stomphoekig"], a: 0, u: "Met een rechte hoek = rechthoekig." },
          { t: "mc", v: "Welke vierhoek heeft 4 even lange zijden en 4 rechte hoeken?", k: ["vierkant", "trapezium", "rechthoek"], a: 0, u: "Dat is een vierkant." },
          { t: "jf", v: "Een rechthoek heeft 4 rechte hoeken.", a: true, u: "Juist." },
          { t: "mc", v: "Twee lijnen die altijd even ver uit elkaar blijven (zoals treinsporen) zijn …", k: ["evenwijdig", "loodrecht"], a: 0, u: "Evenwijdig." }
        ]
      }
    }
  },
  {
    id: "spelling-t3-hoofdletters",
    vak: "Spelling",
    titel: "Thema 3: hoofdletters en apostrof",
    datum: "woensdag 18 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "koppel", v: "Waarom krijgt dit woord een hoofdletter? Verbind.", paren: [["Fatima","persoonsnaam"],["Brugge","aardrijkskundige naam"],["Pasen","feestdag"],["Allah","persoon die als heilig wordt beschouwd"]], u: "Persoonsnamen, aardrijkskundige namen, feestdagen en heilige personen krijgen een hoofdletter." },
          { t: "mc", v: "Welk woord schrijf je met een hoofdletter?", k: ["maandag", "januari", "Frans (de taal)", "winter"], a: 2, u: "Talen en nationaliteiten krijgen een hoofdletter. Dagen, maanden en seizoenen niet." },
          { t: "mc", v: "Welk woord schrijf je met een kleine letter?", k: ["Kerstmis", "Zuid-Amerika", "herfst", "Italiaans"], a: 2, u: "Seizoenen (lente, zomer, herfst, winter) schrijf je met een kleine letter." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["We rijden naar het noorden van Spanje.", "We rijden naar het Noorden van Spanje.", "We rijden naar het noorden van spanje."], a: 0, u: "Windstreken (noorden, zuiden …) zijn gewone woorden. Spanje is een land: hoofdletter." },
          { t: "mc", v: "Welke schrijfwijze is juist?", k: ["noord-Spanje", "Noord-Spanje", "Noord-spanje"], a: 1, u: "Noord-Spanje is de naam van een gebied: beide delen met een hoofdletter." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["’S Morgens fietst Lotte naar school.", "’s Morgens fietst Lotte naar school.", "’s morgens fietst lotte naar school."], a: 1, u: "Begint de zin met een apostrof (’s), dan krijgt het volgende woord de hoofdletter niet: ’s Morgens." },
          { t: "invul", exact: true, v: "Schrijf correct met hoofdletters en kleine letters: ’S AVONDS KIJKT YANA NAAR EEN BELGISCHE FILM.", a: ["’s Avonds kijkt Yana naar een Belgische film."], u: "’s Avonds (apostrof, dan hoofdletter bij het tweede woord), Yana (persoonsnaam), Belgische (nationaliteit)." },
          { t: "invul", exact: true, v: "Schrijf correct: IN DE ZOMER GAAT RUBEN NAAR DE KUST IN OOSTENDE.", a: ["In de zomer gaat Ruben naar de kust in Oostende."], u: "In (begin van de zin), Ruben (persoonsnaam), Oostende (stad). Zomer en kust: kleine letter." },
          { t: "invul", exact: true, v: "Schrijf correct: OP VRIJDAG VIEREN WE HET SUIKERFEEST.", a: ["Op vrijdag vieren we het Suikerfeest."], u: "Dagen schrijf je klein (vrijdag). Feestdagen met een hoofdletter (Suikerfeest)." },
          { t: "invul", exact: true, v: "Schrijf correct: NA CARNAVAL BEZOEKT NOAH ZIJN TURKSE OMA IN GENT.", a: ["Na carnaval bezoekt Noah zijn Turkse oma in Gent."], u: "Carnaval schrijf je met een kleine letter. Noah (persoon), Turkse (nationaliteit), Gent (stad)." },
          { t: "jf", v: "Hemelvaart schrijf je met een hoofdletter.", a: true, u: "Hemelvaart is een feestdag." },
          { t: "jf", v: "Woensdag schrijf je midden in een zin met een hoofdletter.", a: false, u: "Dagen van de week schrijf je met een kleine letter." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Waar zet je altijd een hoofdletter?", k: ["Aan het begin van een zin", "Aan het einde van een zin"], a: 0, u: "Een zin begint altijd met een hoofdletter." },
          { t: "mc", v: "Welke naam is juist geschreven?", k: ["emma", "Emma"], a: 1, u: "Namen van mensen krijgen een hoofdletter." },
          { t: "mc", v: "Welke stad is juist geschreven?", k: ["Antwerpen", "antwerpen"], a: 0, u: "Steden krijgen een hoofdletter." },
          { t: "mc", v: "Welk land is juist geschreven?", k: ["belgië", "België"], a: 1, u: "Landen krijgen een hoofdletter." },
          { t: "mc", v: "Welke dag is juist geschreven in een zin?", k: ["Ik zwem op maandag.", "Ik zwem op Maandag."], a: 0, u: "Dagen van de week schrijf je met een kleine letter." },
          { t: "mc", v: "Welke feestdag is juist geschreven?", k: ["kerstmis", "Kerstmis"], a: 1, u: "Feestdagen krijgen een hoofdletter." },
          { t: "mc", v: "Welke zin is juist?", k: ["sara woont in Gent.", "Sara woont in Gent.", "Sara woont in gent."], a: 1, u: "Sara (naam en begin zin) en Gent (stad) krijgen een hoofdletter." },
          { t: "jf", v: "De maand juli schrijf je met een kleine letter.", a: true, u: "Maanden schrijf je klein: januari, juli …" }
        ]
      }
    }
  },
  {
    id: "wisk-meten-b3",
    vak: "Wiskunde",
    titel: "Meten blok 3: omtrek, oppervlakte en landmaten",
    datum: "donderdag 19 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "invul", v: "18 ha = … a", a: ["1800", "1 800", "1800 a"], u: "1 ha = 100 a, dus 18 ha = 1800 a." },
          { t: "invul", v: "700 a = … ha", a: ["7", "7 ha"], u: "100 a = 1 ha, dus 700 a = 7 ha." },
          { t: "invul", v: "5 a 9 ca = … ca", a: ["509", "509 ca"], u: "5 a = 500 ca. 500 + 9 = 509 ca. In landmaten zet je nooit een komma." },
          { t: "invul", v: "6 m² = … dm²", a: ["600", "600 dm2", "600 dm²"], u: "1 m² = 100 dm²." },
          { t: "invul", v: "350 cm² = … dm²", a: ["3,5", "3.5", "3,50"], u: "100 cm² = 1 dm², dus 3,5 dm²." },
          { t: "invul", v: "1 ca = … m²", a: ["1", "1 m2", "1 m²"], u: "1 ca = 1 m², 1 a = 100 m², 1 ha = 10 000 m²." },
          { t: "invul", v: "30 000 m² = … ha", a: ["3", "3 ha"], u: "10 000 m² = 1 ha." },
          { t: "invul", v: "1 km² = … ha", a: ["100", "100 ha"], u: "1 km² = 100 ha." },
          { t: "invul", v: "Bereken de omtrek van een rechthoek met basis 6 cm en hoogte 4 cm. (in cm)", a: ["20", "20 cm", "20cm"], u: "2 × (basis + hoogte) = 2 × (6 + 4) = 20 cm." },
          { t: "invul", v: "Bereken de omtrek van een regelmatige zeshoek met zijde 3 cm. (in cm)", a: ["18", "18 cm", "18cm"], u: "6 gelijke zijden: 6 × 3 cm = 18 cm." },
          { t: "invul", v: "Oppervlakte van een parallellogram met basis 7 cm en hoogte 3 cm? (in cm²)", a: ["21", "21 cm2", "21 cm²", "21cm2"], u: "Parallellogram: basis × hoogte = 7 × 3 = 21 cm²." },
          { t: "invul", v: "Oppervlakte van een driehoek met basis 8 cm en hoogte 5 cm? (in cm²)", a: ["20", "20 cm2", "20 cm²", "20cm2"], u: "Driehoek: basis × hoogte : 2 = 8 × 5 : 2 = 20 cm²." },
          { t: "invul", v: "Een ruit heeft diagonalen van 10 cm en 4 cm. Hoe groot is de oppervlakte? (in cm²)", a: ["20", "20 cm2", "20 cm²", "20cm2"], u: "Ruit: grote diagonaal × kleine diagonaal : 2 = 10 × 4 : 2 = 20 cm²." },
          { t: "mc", v: "Welke formule gebruik je voor de oppervlakte van een driehoek?", k: ["basis × hoogte", "basis × hoogte : 2", "2 × (basis + hoogte)"], a: 1, u: "Een driehoek is de helft van een rechthoek met dezelfde basis en hoogte." },
          { t: "invul", v: "Een trapezium bestaat uit een rechthoek van 4 cm op 3 cm en een driehoek met basis 2 cm en hoogte 3 cm. Hoe groot is de oppervlakte? (in cm²)", a: ["15", "15 cm2", "15 cm²", "15cm2"], u: "Rechthoek 4 × 3 = 12 cm². Driehoek 2 × 3 : 2 = 3 cm². Samen 15 cm²." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Wat is de omtrek?", k: ["De lengte van de rand rond een figuur", "Hoeveel plaats er binnen in de figuur is"], a: 0, u: "Omtrek = rond de figuur. Oppervlakte = binnenin." },
          { t: "invul", v: "Een vierkant heeft zijden van 5 cm. Hoe groot is de omtrek? (in cm)", a: ["20", "20 cm", "20cm"], u: "5 + 5 + 5 + 5 = 20 cm (of 4 × 5)." },
          { t: "invul", v: "Een rechthoek is 6 cm lang en 2 cm breed. Hoe groot is de omtrek? (in cm)", a: ["16", "16 cm", "16cm"], u: "6 + 2 + 6 + 2 = 16 cm." },
          { t: "invul", v: "Een rechthoek is 4 cm lang en 3 cm breed. Hoe groot is de oppervlakte? (in cm²)", a: ["12", "12 cm2", "12 cm²", "12cm2"], u: "Lengte × breedte = 4 × 3 = 12 cm²." },
          { t: "invul", v: "Een vierkant heeft zijden van 3 cm. Hoe groot is de oppervlakte? (in cm²)", a: ["9", "9 cm2", "9 cm²", "9cm2"], u: "3 × 3 = 9 cm²." },
          { t: "mc", v: "Waarin meet je een oppervlakte?", k: ["cm² of m²", "cm of m", "liter"], a: 0, u: "Oppervlakte meet je in vierkante centimeter (cm²) of vierkante meter (m²)." },
          { t: "mc", v: "1 m = … cm", k: ["10", "100", "1000"], a: 1, u: "1 meter = 100 centimeter." },
          { t: "mc", v: "Een groot stuk land (bv. een weide) meet je in …", k: ["hectare (ha)", "centimeter (cm)"], a: 0, u: "Voor landbouwgrond gebruik je landmaten: hectare (ha), are (a), centiare (ca)." }
        ]
      }
    }
  },
  {
    id: "frans-mission15",
    vak: "Frans",
    titel: "Zoufff 6 – Mission 15",
    datum: "vrijdag 20 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "koppel", v: "Verbind het Franse woord met de vertaling.", paren: [["une tête","hoofd"],["un bras","arm"],["une jambe","been"],["un genou","knie"],["un doigt","vinger"],["une oreille","oor"]], u: "Leer de lichaamsdelen met hun lidwoord (un of une)." },
          { t: "mc", v: "Hoe zeg je ‘rug’ in het Frans?", k: ["un ventre", "un dos", "un pied"], a: 1, u: "un dos = rug, un ventre = buik, un pied = voet." },
          { t: "mc", v: "Wat is het meervoud van ‘un œil’?", k: ["des œils", "des yeux", "des œilx"], a: 1, u: "Uitzondering: un œil – deux yeux." },
          { t: "mc", v: "Wat is het meervoud van ‘un genou’?", k: ["deux genous", "deux genoux", "deux genou"], a: 1, u: "un genou – deux genoux (met x)." },
          { t: "mc", v: "Welk meervoud is juist?", k: ["deux bras", "deux bra", "deux brass"], a: 0, u: "Woorden op -s, -x of -z veranderen niet: un bras – deux bras, un nez – deux nez, un dos – deux dos." },
          { t: "mc", v: "Wat doe je met ‘les oreilles’?", k: ["écouter / entendre", "manger", "danser"], a: 0, u: "Met je oren luister je (écouter) en hoor je (entendre)." },
          { t: "invul", v: "voir: je …", a: ["vois"], u: "je vois, tu vois, il/elle/on voit, nous voyons, vous voyez, ils/elles voient." },
          { t: "invul", v: "voir: nous …", a: ["voyons"], u: "nous voyons (met y)." },
          { t: "invul", v: "voir: ils …", a: ["voient"], u: "ils/elles voient." },
          { t: "mc", v: "Vous ne … pas le bus?", k: ["voient", "voyons", "voyez"], a: 2, u: "vous voyez." },
          { t: "invul", v: "entendre: tu …", a: ["entends"], u: "j’entends, tu entends, il/elle/on entend, nous entendons, vous entendez, ils/elles entendent." },
          { t: "invul", v: "entendre: il …", a: ["entend"], u: "il entend (zonder s)." },
          { t: "mc", v: "Mes amis … la musique.", k: ["entendons", "entendent", "entends"], a: 1, u: "mes amis = ils: entendent." },
          { t: "mc", v: "Maak een vraag met est-ce que: ‘Tu aimes le foot?’", k: ["Est-ce que tu aimes le foot?", "Tu est-ce que aimes le foot?", "Est-ce que aimes tu le foot?"], a: 0, u: "Zet est-ce que vooraan. De rest van de zin blijft gewoon staan." },
          { t: "mc", v: "Welke vraag is juist?", k: ["Est-ce que il habite à Gand?", "Est-ce qu’il habite à Gand?", "Est-ce qu il habite à Gand?"], a: 1, u: "Voor een klinker (il, elle) wordt est-ce que → est-ce qu’." },
          { t: "mc", v: "Antwoord: ‘Oui, j’ai un frère.’ Wat was de vraag?", k: ["Est-ce que tu as un frère?", "Est-ce que tu as une sœur?", "Est-ce que tu es un frère?"], a: 0, u: "avoir un frère = een broer hebben: Est-ce que tu as un frère?" }
        ]
      }
    }
  }
  ]
},

{
  week: "2026-11-23",
  label: "Week van 23 november",
  toetsen: [
  {
    id: "bl-thema3",
    vak: "Begrijpend lezen",
    titel: "Thema 3: In het heetst van de strijd",
    datum: "dinsdag 24 november",
    niveaus: {
      gewoon: {
        teksten: [
          { titel: "Uit het dagboek van Rosa", soort: "dagboek (fictie)", alineas: [
            "Dinsdag 16 mei 1944. Lief dagboek, vannacht ging de sirene weer. Mama trok Jules en mij uit bed en we liepen in onze pyjama naar de kelder. Jules huilde de hele tijd. Ik deed alsof ik niet bang was, maar mijn knieën bibberden. Toen het eindelijk stil werd, was het al bijna ochtend.",
            "Zaterdag 3 juni 1944. Vandaag stond ik twee uur aan te schuiven bij de bakker, met onze bonnen in mijn hand. Het brood was grijs en plakkerig. Papa zit nog altijd in Duitsland. Hij moest daar verplicht in een fabriek gaan werken. Elke avond kijkt mama naar zijn lege stoel. Ze zegt niets, maar ik weet wat ze denkt.",
            "Ik denk ook vaak aan Sarah van hiernaast. Op een nacht vorig jaar waren zij en haar ouders plots verdwenen. Hun huis is nu dicht. Niemand wil erover praten. Als ik ernaar vraag, zegt mama: “Stil, Rosa. Muren hebben oren.”",
            "Woensdag 7 juni 1944. Oom Felix kwam vanavond stiekem langs. Hij luistert naar Radio Londen, al is dat streng verboden. Hij fluisterde dat er duizenden soldaten in Frankrijk aan land zijn gekomen. Ik durf het bijna niet op te schrijven, maar misschien komt er toch een einde aan deze oorlog!",
            "Maandag 4 september 1944. Er rijden tanks door onze straat! Geen Duitse, maar Engelse! Overal hangen vlaggen en de mensen zingen en dansen. Een soldaat met rode wangen gaf Jules een reep chocolade. Mama huilde, maar deze keer van blijdschap. En toch voel ik ook iets zwaars in mijn buik. Ik wou dat Sarah dit samen met mij kon zien."
          ]},
          { titel: "Ruzie? Zo los je het op!", soort: "informatieve tekst", alineas: [
            "Iedereen maakt weleens ruzie. Op de speelplaats, thuis met je broer of zus, of in de sportclub. Dat is heel normaal. Het belangrijkste is hoe je ze oplost.",
            "Eerst moet je afkoelen. Als je heel boos bent, zeg je vaak dingen waar je later spijt van hebt. Tel daarom tot tien of loop even weg.",
            "Vervolgens vertelt iedereen om de beurt wat er gebeurd is. De anderen luisteren en onderbreken niet. Zeg hoe jij je voelt, in plaats van de ander te beschuldigen: “Ik voel me boos omdat ik niet mocht meespelen” in plaats van “Jij bent gemeen”.",
            "Tot slot zoeken jullie samen een oplossing. Lukt het niet alleen? Vraag dan hulp aan een juf, meester of leerling-bemiddelaar.",
            "Volgens mij is een ruzie die goed is opgelost zelfs goed voor een vriendschap. Je leert elkaar namelijk beter kennen."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Wat voor soort tekst is ‘Uit het dagboek van Rosa’? Waaraan herken je dat?", k: ["Een krantenartikel: er staan feiten in.", "Een dagboek: elke stukje begint met een datum en Rosa schrijft over wat zij meemaakt en voelt.", "Een gedicht: het rijmt.", "Een uitleggende tekst: je leert hoe je iets moet doen."], a: 1, u: "Een dagboek heeft datums, is geschreven in de ik-vorm en vertelt over gebeurtenissen en gevoelens." },
          { t: "mc", tekst: 0, v: "In welke periode speelt het verhaal zich af?", k: ["Tijdens de Eerste Wereldoorlog", "Op het einde van de Tweede Wereldoorlog", "Vandaag", "In de middeleeuwen"], a: 1, u: "Het speelt in 1944, het laatste deel van de Tweede Wereldoorlog in België." },
          { t: "mc", tekst: 0, v: "Waarom gaan Rosa, Jules en mama naar de kelder?", k: ["Om eten te halen", "Omdat de sirene waarschuwt voor een luchtaanval (bombardement)", "Om te spelen", "Omdat de bakker daar is"], a: 1, u: "De sirene waarschuwde voor vliegtuigen en bommen. In de kelder was je veiliger." },
          { t: "mc", tekst: 0, v: "“Ik deed alsof ik niet bang was, maar mijn knieën bibberden.” Wat leer je hierover Rosa?", k: ["Ze was helemaal niet bang.", "Ze was wel bang, maar wilde sterk zijn voor haar broertje.", "Ze had het koud.", "Ze was boos op Jules."], a: 1, u: "Bibberende knieën tonen angst. Ze doet stoer om Jules niet nog banger te maken." },
          { t: "invul", tekst: 0, v: "Alinea 2: “Ze zegt niets, maar ik weet wat ze denkt.” Naar wie verwijst ‘ze’?", a: ["mama", "de mama", "haar mama", "rosas mama", "moeder"], u: "‘Ze’ is mama, die naar de lege stoel van papa kijkt." },
          { t: "mc", tekst: 0, v: "Waarom is papa in Duitsland?", k: ["Hij is op vakantie.", "Hij moest er verplicht in een fabriek werken.", "Hij is soldaat in het Belgische leger.", "Hij is gevlucht."], a: 1, u: "Tijdens de bezetting moesten veel Belgische mannen verplicht in Duitsland gaan werken (verplichte tewerkstelling)." },
          { t: "mc", tekst: 0, v: "Wat bedoelt mama met “Muren hebben oren”?", k: ["De muren zijn heel dun.", "Je moet oppassen wat je zegt, want iemand kan het horen en verklikken.", "De buren zijn doof.", "Rosa moet harder praten."], a: 1, u: "Het is een uitdrukking: wees voorzichtig, want iemand kan je horen. In de oorlog kon dat gevaarlijk zijn." },
          { t: "mc", tekst: 0, v: "Wat is er waarschijnlijk met Sarah en haar ouders gebeurd?", k: ["Ze zijn verhuisd naar de zee.", "Ze zijn opgepakt en weggevoerd, omdat ze Joods waren.", "Ze zijn op reis.", "Ze zijn ondergedoken in Rosa's kelder."], a: 1, u: "De tekst zegt het niet letterlijk. Maar ‘plots verdwenen’ ‘op een nacht’ en ‘niemand wil erover praten’ wijzen op een razzia op Joodse families." },
          { t: "mc", tekst: 0, v: "Waarom fluistert oom Felix?", k: ["Hij is verkouden.", "Luisteren naar Radio Londen was verboden en gevaarlijk.", "Jules slaapt.", "Hij vertelt een grap."], a: 1, u: "De bezetter verbood Radio Londen, omdat die het echte nieuws over de oorlog bracht." },
          { t: "invul", tekst: 0, v: "Over welke gebeurtenis vertelt oom Felix op 7 juni 1944? (het is maar één woord, de naam van die dag)", a: ["D-Day", "Dday", "D Day", "D-dag", "landing in normandie", "de landing in normandie"], u: "Op 6 juni 1944 (D-Day) landden de geallieerden in Normandië." },
          { t: "volg", tekst: 0, v: "Zet de gebeurtenissen in de juiste volgorde. Geef elk een nummer (1 = eerst).", items: ["Sarah en haar ouders verdwijnen op een nacht.", "Rosa schuilt met mama en Jules in de kelder.", "Oom Felix vertelt het nieuws van Radio Londen.", "Engelse tanks rijden door de straat."], u: "Sarah verdween al ‘vorig jaar’ (1943). Daarna volgen de datums in het dagboek: mei, juni, september 1944." },
          { t: "mc", tekst: 0, v: "Hoe voelt Rosa zich op 4 september 1944?", k: ["Alleen maar blij", "Alleen maar verdrietig", "Blij, maar ook verdrietig omdat Sarah er niet bij is", "Boos op de soldaten"], a: 2, u: "Ze is blij met de bevrijding, maar ‘iets zwaars in mijn buik’ toont dat ze ook verdriet voelt om Sarah." },
          { t: "mc", tekst: 1, v: "Wat is de hoofdgedachte van ‘Ruzie? Zo los je het op!’?", k: ["Ruzie maken is altijd slecht.", "Je kunt een ruzie in stappen goed oplossen.", "Je moet altijd tot tien tellen.", "Leerkrachten lossen alle ruzies op."], a: 1, u: "De tekst legt in stappen uit hoe je een ruzie oplost." },
          { t: "mc", tekst: 1, v: "Welke signaalwoorden tonen de volgorde van de stappen?", k: ["omdat – dus – want", "eerst – vervolgens – tot slot", "maar – toch", "bijvoorbeeld – zoals"], a: 1, u: "Eerst, vervolgens en tot slot geven een volgorde aan." },
          { t: "jf", tekst: 1, v: "“Volgens mij is een ruzie die goed is opgelost zelfs goed voor een vriendschap.” Dit is een feit.", a: false, u: "Het is een mening: ‘volgens mij’." },
          { t: "mc", tekst: 1, v: "Welke zin is een goede ik-boodschap?", k: ["Jij doet altijd vervelend!", "Ik voel me verdrietig omdat je me uitlachte.", "Jij bent begonnen.", "Iedereen vindt jou stom."], a: 1, u: "Een ik-boodschap zegt hoe JIJ je voelt, zonder de ander te beschuldigen." }
        ]
      },
      "1b": {
        teksten: [
          { titel: "Rosa schrijft in haar dagboek", soort: "dagboek", alineas: [
            "Dinsdag 16 mei 1944. Het is oorlog. Vannacht hoorde ik een luid alarm. Mama riep: “Snel, naar de kelder!” In de kelder zijn we veilig. Mijn broertje Jules huilde. Ik was ook bang.",
            "Zaterdag 3 juni 1944. Er is niet veel eten. Ik ging naar de bakker. Ik moest heel lang wachten. Het brood was niet lekker. Papa is niet thuis. Hij moet ver weg werken, in Duitsland. Ik mis papa.",
            "Maandag 4 september 1944. Er rijden soldaten in onze straat. Het zijn goede soldaten. Ze komen ons helpen! De oorlog is voorbij in onze stad. Iedereen is blij. Jules krijgt chocolade van een soldaat."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Wie schrijft in het dagboek?", k: ["Rosa", "Jules", "Mama"], a: 0, u: "Rosa schrijft. Jules is haar broertje." },
          { t: "mc", tekst: 0, v: "Waar gaan ze naartoe als het alarm gaat?", k: ["Naar de kelder", "Naar de bakker", "Naar school"], a: 0, u: "“Snel, naar de kelder!” In de kelder zijn ze veilig." },
          { t: "mc", tekst: 0, v: "Hoe voelt Rosa zich in de kelder?", k: ["Blij", "Bang"], a: 1, u: "“Ik was ook bang.”" },
          { t: "jf", tekst: 0, v: "Er is veel eten.", a: false, u: "Er is niet veel eten." },
          { t: "mc", tekst: 0, v: "Waar is papa?", k: ["Thuis", "In Duitsland", "Bij de bakker"], a: 1, u: "Papa moet ver weg werken, in Duitsland." },
          { t: "jf", tekst: 0, v: "Rosa mist papa.", a: true, u: "“Ik mis papa.”" },
          { t: "mc", tekst: 0, v: "Wat krijgt Jules van een soldaat?", k: ["Een bal", "Chocolade", "Brood"], a: 1, u: "Jules krijgt chocolade." },
          { t: "mc", tekst: 0, v: "Hoe voelen de mensen zich op 4 september?", k: ["Blij", "Boos"], a: 0, u: "“Iedereen is blij.” De soldaten komen helpen." }
        ]
      }
    }
  },
  {
    id: "spelling-t3-dictee",
    vak: "Spelling",
    titel: "Thema 3 les 14: dictee (Franse woorden, hoofdletters, 's en 'k)",
    datum: "dinsdag 24 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["buro", "bureau", "burau"], a: 1, u: "Bureau komt uit het Frans: eau klinkt als o." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["doeane", "douane", "douwane"], a: 1, u: "Douane: ou klinkt als oe." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["mayonaise", "majonèse", "mayonese"], a: 0, u: "Mayonaise: ai klinkt als è." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["kadootjes", "cadeautjes", "cadeaus-jes"], a: 1, u: "Cadeau + tjes = cadeautjes." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["meubilair", "meubilèr", "meubiler"], a: 0, u: "Meubilair: air klinkt als èr." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["entoesiast", "enthousiast", "enthoesiast"], a: 1, u: "Enthousiast: met th en ou." },
          { t: "invul", exact: true, v: "Vul aan: Na het zwemmen neem ik een d…che.", a: ["douche", "ou"], u: "Douche: ou klinkt als oe." },
          { t: "invul", exact: true, v: "Vul aan: De wasmach… draait nog.", a: ["machine", "wasmachine", "ine"], u: "Machine: ine klinkt als iene." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["We gaan in de Winter naar zuid-Frankrijk.", "We gaan in de winter naar Zuid-Frankrijk.", "We gaan in de winter naar zuid-frankrijk."], a: 1, u: "Seizoenen: kleine letter. Aardrijkskundige namen zoals Zuid-Frankrijk: hoofdletters." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Met pinksteren en carnaval zijn we vrij.", "Met Pinksteren en Carnaval zijn we vrij.", "Met Pinksteren en carnaval zijn we vrij."], a: 2, u: "Feestdagen zoals Pinksteren krijgen een hoofdletter, carnaval niet." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Mijn tante woont in het Noorden van België.", "Mijn tante woont in het noorden van België.", "mijn tante woont in het noorden van belgië."], a: 1, u: "Windstreken (het noorden) schrijf je met een kleine letter." },
          { t: "mc", v: "Hoe begin je deze zin juist?", k: ["'S nachts was het koud.", "'s Nachts was het koud.", "'s nachts was het koud."], a: 1, u: "Begint de zin met 's, dan krijgt het volgende woord de hoofdletter: 's Nachts." },
          { t: "mc", v: "Hoe begin je deze zin juist?", k: ["'K heb het gehoord.", "'k heb het gehoord.", "'k Heb het gehoord."], a: 2, u: "Na 'k aan het begin van de zin krijgt het volgende woord de hoofdletter." },
          { t: "invul", exact: true, v: "De goochelaar heeft een konijn … (toveren)", a: ["getoverd"], u: "Toveren: stam tover, niet in 't kofschip, dus -d: getoverd." },
          { t: "invul", exact: true, v: "Het feest werd met de hele familie … (vieren)", a: ["gevierd"], u: "Vieren: stam vier, niet in 't kofschip, dus -d: gevierd." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Ken jij het verhaal van mozes?", "Ken jij het verhaal van Mozes?"], a: 1, u: "Namen van personen krijgen een hoofdletter." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Welk woord is juist?", k: ["cadeau", "kado"], a: 0, u: "Cadeau: eau klinkt als o." },
          { t: "mc", v: "Welk woord is juist?", k: ["buro", "bureau"], a: 1, u: "Bureau: eau klinkt als o." },
          { t: "mc", v: "Welk woord is juist?", k: ["douche", "doesje"], a: 0, u: "Douche: ou klinkt als oe." },
          { t: "mc", v: "Welk woord is juist?", k: ["majonèse", "mayonaise"], a: 1, u: "Mayonaise: ai klinkt als è." },
          { t: "mc", v: "Welke zin is juist?", k: ["Ik ben jarig in november.", "Ik ben jarig in November."], a: 0, u: "Maanden schrijf je met een kleine letter." },
          { t: "mc", v: "Welke zin is juist?", k: ["Met pasen zoeken we eieren.", "Met Pasen zoeken we eieren."], a: 1, u: "Feesten zoals Pasen krijgen een hoofdletter." },
          { t: "mc", v: "Welke zin is juist?", k: ["We gaan naar Spanje.", "We gaan naar spanje."], a: 0, u: "Landen krijgen een hoofdletter." },
          { t: "mc", v: "Welke zin is juist?", k: ["Op Maandag zwemmen we.", "Op maandag zwemmen we."], a: 1, u: "Dagen schrijf je met een kleine letter." }
        ]
      }
    }
  },
  {
    id: "wero-wo2",
    vak: "WERO",
    titel: "De Tweede Wereldoorlog",
    datum: "donderdag 26 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "mc", v: "Met welke gebeurtenis begon de Tweede Wereldoorlog?", k: ["Duitsland viel Polen binnen (1 september 1939).", "Japan viel Pearl Harbor aan.", "Duitsland viel België binnen.", "De atoombom viel op Hiroshima."], a: 0, u: "Op 1 september 1939 viel Duitsland Polen binnen. Daarop verklaarden Frankrijk en Groot-Brittannië Duitsland de oorlog." },
          { t: "mc", v: "Na de Eerste Wereldoorlog kreeg België een stuk Duits gebied. Hoe heet dat gebied?", k: ["De Ardennen", "De Oostkantons (Eupen-Malmedy-Sankt Vith)", "De Westhoek", "Normandië"], a: 1, u: "Na WO I kwamen de Oostkantons bij België. In WO II nam Duitsland ze weer in." },
          { t: "mc", v: "Wat gebeurde er op 7 december 1941 in Pearl Harbor (Hawaï)?", k: ["De oorlog eindigde daar.", "Japan viel de Amerikaanse vloot aan, waarna de VS mee in de oorlog stapten.", "De geallieerden landden er.", "Hitler hield er een toespraak."], a: 1, u: "Door de Japanse aanval op Pearl Harbor stapten de Verenigde Staten in de oorlog." },
          { t: "koppel", v: "Verbind elk begrip met de juiste uitleg.", paren: [["davidsster","gele ster die Joden moesten dragen"],["Kristallnacht","nacht in 1938 waarin Joodse winkels en synagogen vernield werden"],["deportatie","mensen gedwongen wegvoeren naar een kamp"],["propaganda","berichten die mensen willen overtuigen van één mening"]], u: "Deze begrippen horen bij de Jodenvervolging en de nazi-ideologie." },
          { t: "mc", v: "Boven de poort van concentratiekamp Buchenwald stond “Jedem das Seine” (ieder het zijne). Wat wilden de nazi's daarmee zeggen?", k: ["Iedereen krijgt evenveel eten.", "De gevangenen kregen ‘wat ze verdienden’: het was een gemene, spottende boodschap.", "Iedereen mag zijn eigen spullen houden.", "Iedereen is welkom."], a: 1, u: "De nazi's bespotten zo de gevangenen. Ze vonden dat die het kamp ‘verdienden’." },
          { t: "mc", v: "Welke groep werd NIET door de nazi's vervolgd?", k: ["Joden", "Roma en Sinti", "Mensen met een handicap", "Leden van de nazipartij"], a: 3, u: "Joden, Roma en Sinti, homoseksuelen, mensen met een handicap en politieke tegenstanders werden vervolgd." },
          { t: "mc", v: "Waarom was de Slag om Stalingrad (1942-1943) zo belangrijk?", k: ["Duitsland won daar de oorlog.", "Het Duitse leger verloor er voor het eerst een grote slag; het keerpunt van de oorlog.", "Daar begon de oorlog.", "Daar viel de atoombom."], a: 1, u: "Na Stalingrad trok het Duitse leger in het oosten steeds verder terug." },
          { t: "invul", v: "Hoe heette de landing van de geallieerden in Normandië op 6 juni 1944 met een codenaam? Operatie …", a: ["Overlord", "operatie overlord"], u: "D-Day was het begin van operatie Overlord." },
          { t: "volg", v: "Zet deze gebeurtenissen in de juiste volgorde (1 = eerst).", items: ["Duitsland valt Polen binnen", "Japan valt Pearl Harbor aan", "Slag om Stalingrad", "D-Day in Normandië", "Atoombom op Hiroshima"], u: "1939 – 1941 – 1942/43 – 1944 – 1945." },
          { t: "invul", v: "Op welke datum (dag-maand-jaar) was VE-day, het einde van de oorlog in Europa?", a: ["8 mei 1945", "08/05/1945", "8/5/1945", "08-05-1945", "8-5-1945"], u: "VE-day = Victory in Europe Day: 8 mei 1945." },
          { t: "mc", v: "Wat betekent VE-day?", k: ["De dag van de overwinning in Europa", "De dag van de eerste bom", "De dag van de verkiezingen", "De dag dat Japan zich overgaf"], a: 0, u: "VE = Victory in Europe. Japan gaf zich pas in augustus 1945 over (na de atoombommen)." },
          { t: "mc", v: "Welke woorden horen in een woordweb bij ‘atoombom’?", k: ["Hiroshima, Nagasaki, augustus 1945, Japan", "Pearl Harbor, 1941, vloot", "Stalingrad, winter, Rusland", "Normandië, strand, 1944"], a: 0, u: "In augustus 1945 gooiden de VS atoombommen op Hiroshima en Nagasaki in Japan." },
          { t: "mc", v: "Wat was de Koude Oorlog?", k: ["Een oorlog in de winter", "Een lange spanning tussen de VS en de Sovjet-Unie, zonder rechtstreeks met elkaar te vechten", "Een oorlog tussen België en Nederland", "Een andere naam voor WO II"], a: 1, u: "Na WO II stonden de VS (het Westen) en de Sovjet-Unie (het Oosten) tegenover elkaar." },
          { t: "koppel", v: "Verbind wat samenhoort.", paren: [["Verenigde Naties (1945)","landen werken samen voor vrede"],["EGKS (1951)","samenwerking rond kolen en staal, begin van de EU"],["Universele Verklaring van de Rechten van de Mens (1948)","rechten voor alle mensen"],["Kinderrechtenverdrag (1989)","rechten voor alle kinderen"]], u: "Na de oorlog wilden landen samenwerken en afspraken maken, zodat zoiets nooit meer zou gebeuren." },
          { t: "mc", v: "Wat is een ersatzproduct?", k: ["Een extra duur product", "Een vervangproduct, zoals cichorei in plaats van echte koffie", "Een product uit Amerika", "Een wapen"], a: 1, u: "Ersatz = vervanging. Omdat er tekorten waren, gebruikte men vervangers, bv. cichoreikoffie of bietensuiker." },
          { t: "mc", v: "Waarvoor werd het vliegtuig in WO II vooral gebruikt, en waarvoor nu?", k: ["Toen voor bombardementen en luchtgevechten, nu vooral om te reizen en goederen te vervoeren", "Toen en nu alleen voor vakantie", "Toen bestond het vliegtuig nog niet", "Toen om post te brengen, nu voor oorlog"], a: 0, u: "In WO II speelde het vliegtuig een grote rol in de strijd. Nu gebruiken we het vooral om te reizen." },
          { t: "mc", v: "Waarom zegt men dat er bij een oorlog alleen verliezers zijn?", k: ["Omdat niemand de oorlog wint.", "Omdat aan beide kanten mensen sterven, gewond raken en alles kwijtspelen.", "Omdat het geld kost.", "Omdat de soldaten moe zijn."], a: 1, u: "Ook het land dat ‘wint’ verliest mensen, huizen en veel meer. Iedereen lijdt onder een oorlog." }
        ]
      },
      "1b": {
        teksten: [
          { titel: "De Tweede Wereldoorlog in het kort", soort: "lees dit eerst", alineas: [
            "De Tweede Wereldoorlog begon in 1939. Hij duurde tot 1945. Dat is zes jaar.",
            "De baas van Duitsland was Hitler. Hij wilde veel landen veroveren. Het Duitse leger viel Polen binnen. Daarna ook België.",
            "In de oorlog was er weinig eten. Mensen kregen bonnen. Met een bon mocht je een beetje eten kopen.",
            "Hitler haatte de Joden. Joden moesten een gele ster dragen. Veel Joden werden weggebracht naar kampen. Daar stierven ze.",
            "In 1944 kwamen soldaten uit Amerika, Engeland en Canada. Ze kwamen met boten aan in Frankrijk. Die dag heet D-Day. Ze bevrijdden België.",
            "In 1945 was de oorlog voorbij. Daarna wilden landen samenwerken voor vrede."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "In welk jaar begon de oorlog?", k: ["1939", "2000"], a: 0, u: "De oorlog begon in 1939." },
          { t: "mc", tekst: 0, v: "In welk jaar was de oorlog voorbij?", k: ["1945", "1900"], a: 0, u: "In 1945 was de oorlog voorbij." },
          { t: "mc", tekst: 0, v: "Wie was de baas van Duitsland?", k: ["Hitler", "De koning van België", "Sinterklaas"], a: 0, u: "Hitler was de baas van Duitsland." },
          { t: "jf", tekst: 0, v: "Het Duitse leger viel ook België binnen.", a: true, u: "Eerst Polen, daarna ook België." },
          { t: "jf", tekst: 0, v: "In de oorlog was er veel eten.", a: false, u: "Er was weinig eten." },
          { t: "mc", tekst: 0, v: "Wat had je nodig om eten te kopen?", k: ["Bonnen", "Een fiets", "Een gsm"], a: 0, u: "Met een bon mocht je een beetje eten kopen." },
          { t: "mc", tekst: 0, v: "Wat moesten Joden dragen?", k: ["Een gele ster", "Een rode pet"], a: 0, u: "Joden moesten een gele ster dragen." },
          { t: "mc", tekst: 0, v: "Hoe heet de dag dat de soldaten met boten aankwamen in Frankrijk?", k: ["D-Day", "Kerstmis", "Pasen"], a: 0, u: "Die dag heet D-Day (1944)." },
          { t: "volg", tekst: 0, v: "Wat gebeurde eerst? Zet 1, 2, 3.", items: ["De oorlog begint.", "D-Day: soldaten komen met boten.", "De oorlog is voorbij."], u: "1939, dan 1944, dan 1945." },
          { t: "jf", tekst: 0, v: "Na de oorlog wilden landen samenwerken voor vrede.", a: true, u: "Dat staat in het laatste stukje." }
        ]
      }
    }
  },
  {
    id: "taaldenken-t3",
    vak: "Taal",
    titel: "Taaldenken thema 3 (incl. betekenissen)",
    datum: "vrijdag 27 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "mc", v: "Wat is een grondwoord?", k: ["Een woord met een voorvoegsel.", "Het kortste woord: je kunt het niet meer splitsen.", "Twee woorden samen."], a: 1, u: "Een grondwoord kun je niet meer in kleinere woorden splitsen, bv. kerk, vriend, oorlog." },
          { t: "mc", v: "Is 'kerkplein' een afleiding of een samenstelling?", k: ["afleiding", "samenstelling"], a: 1, u: "Kerk + plein: twee grondwoorden samen = samenstelling." },
          { t: "mc", v: "Is 'bevriend' een afleiding of een samenstelling?", k: ["afleiding", "samenstelling"], a: 0, u: "Be + vriend + d: een grondwoord met een voorvoegsel = afleiding." },
          { t: "mc", v: "Is 'Engelsen' een afleiding of een samenstelling?", k: ["afleiding", "samenstelling"], a: 0, u: "Engels + -en: een achtervoegsel erbij = afleiding." },
          { t: "mc", v: "Is 'rundsvlees' een afleiding of een samenstelling?", k: ["afleiding", "samenstelling"], a: 1, u: "Rund(s) + vlees: twee grondwoorden = samenstelling." },
          { t: "invul", v: "Wat is het grondwoord van 'vriendelijk'?", a: ["vriend"], u: "Vriend + -elijk." },
          { t: "invul", v: "Wat is het grondwoord van 'onrustig'?", a: ["rust"], u: "On- + rust + -ig." },
          { t: "mc", v: "Welk woord is een afleiding van 'vrouw'?", k: ["poetsvrouw", "vrouwelijk", "vrouwenkoor"], a: 1, u: "Vrouw + -elijk = afleiding. Poetsvrouw en vrouwenkoor zijn samenstellingen." },
          { t: "mc", v: "Welk woord is een samenstelling met 'bloed'?", k: ["bloederig", "bebloed", "bloedgroep"], a: 2, u: "Bloed + groep = samenstelling." },
          { t: "mc", v: "Wat is het onderwerp in: 'Op aanraden van de meester trekken mijn broers naar het café.'?", k: ["de meester", "mijn broers", "het café"], a: 1, u: "Wie trekken naar het café? Mijn broers." },
          { t: "mc", v: "Wat is de persoonsvorm in: 'Wij hoorden het nieuws op de radio.'?", k: ["wij", "hoorden", "nieuws"], a: 1, u: "Zet de zin in een andere tijd: wij horen. Het woord dat verandert is de persoonsvorm: hoorden." },
          { t: "mc", v: "'De uitzending is moeilijk.' Wat zegt 'is moeilijk' over het onderwerp?", k: ["wat het onderwerp doet (groen)", "wat het onderwerp is of wordt (roze)"], a: 1, u: "Is + moeilijk zegt hoe de uitzending is: roze." },
          { t: "mc", v: "'Charlie komt op verlofdagen uitblazen.' Welke woorden zeggen wat Charlie doet?", k: ["komt … uitblazen", "op verlofdagen", "Charlie"], a: 0, u: "Komt en uitblazen zijn werkwoorden die zeggen wat Charlie doet: groen." },
          { t: "koppel", v: "Verbind het woord met de betekenis.", paren: [["razzia","veel mensen tegelijk oppakken"],["geslepen","sluw en slim"],["barbaars","wreed en onmenselijk"],["verraderlijk","gevaarlijker dan het lijkt"],["achterdochtig","wantrouwig"]], u: "Woorden uit thema 3." },
          { t: "mc", v: "'Iets in zijn schild voeren' betekent …", k: ["een schild dragen", "stiekem iets slechts van plan zijn", "iemand beschermen"], a: 1, u: "Wie iets in zijn schild voert, is stiekem iets van plan." },
          { t: "mc", v: "'Je hart luchten' betekent …", k: ["vertellen wat je dwarszit", "diep ademhalen", "naar buiten gaan"], a: 0, u: "Je hart luchten = vertellen wat je dwarszit, zodat je je beter voelt." },
          { t: "mc", v: "'Iemand tegen je in het harnas jagen' betekent …", k: ["iemand een harnas geven", "iemand boos maken op jou", "samen vechten"], a: 1, u: "Dan maak je iemand kwaad op jou." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "kerk + plein = …", k: ["kerkplein", "pleinkerk"], a: 0, u: "Twee woorden samen: kerkplein." },
          { t: "mc", v: "voet + bal = …", k: ["balvoet", "voetbal"], a: 1, u: "Twee woorden samen: voetbal." },
          { t: "mc", v: "Uit welke twee woorden bestaat 'schooltas'?", k: ["school + tas", "schoo + ltas"], a: 0, u: "School + tas." },
          { t: "mc", v: "Wie doet iets? 'Oma bakt brood.'", k: ["oma", "brood"], a: 0, u: "Wie bakt? Oma." },
          { t: "mc", v: "Wie doet iets? 'De kinderen spelen op het plein.'", k: ["het plein", "de kinderen"], a: 1, u: "Wie spelen? De kinderen." },
          { t: "mc", v: "De vos is slim en sluw. Hij is …", k: ["geslepen", "achterdochtig"], a: 0, u: "Geslepen = slim en sluw." },
          { t: "mc", v: "Tom vertrouwt niemand. Hij is …", k: ["geslepen", "achterdochtig"], a: 1, u: "Achterdochtig = je vertrouwt niemand." },
          { t: "mc", v: "Lisa vertelt mama wat haar dwarszit. Ze …", k: ["lucht haar hart", "speelt buiten"], a: 0, u: "Je hart luchten = vertellen wat je dwarszit." }
        ]
      }
    }
  }
  ]
},

{
  week: "2026-11-30",
  label: "Week van 30 november",
  toetsen: [
  {
    id: "spelling-t3-themadictee",
    vak: "Spelling",
    titel: "Thema 3: themadictee (Franse woorden, hoofdletters, 's en 'k)",
    datum: "maandag 30 november",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["het nivo", "het niveau", "het niveaux"], a: 1, u: "Niveau komt uit het Frans: eau klinkt als oo." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de militèr", "de militair", "de militaire"], a: 1, u: "Militair: ai klinkt als è." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de journalist", "de joernalist", "de jornalist"], a: 0, u: "Journalist: ou klinkt als oe." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de limoesine", "de limousine", "de limousien"], a: 1, u: "Limousine: ou klinkt als oe, ine klinkt als ien." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de explosie", "de explozie", "de eksplosie"], a: 0, u: "Explosie: met x en s." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de roete", "de route", "de rouwte"], a: 1, u: "Route: ou klinkt als oe." },
          { t: "invul", exact: true, v: "Vul het hele woord in: Ik zet de lamp op mijn bur… (meubel om aan te werken)", a: ["bureau"], u: "Bureau: eau klinkt als oo." },
          { t: "invul", exact: true, v: "Vul het hele woord in: Aan de grens controleert de d… onze paspoorten.", a: ["douane"], u: "Douane: ou klinkt als oe." },
          { t: "invul", exact: true, v: "Vul het hele woord in: Alle stoelen, tafels en kasten samen noem je het meubil…", a: ["meubilair"], u: "Meubilair: ai klinkt als è." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["In de Herfst reizen we naar Zuid-Amerika.", "In de herfst reizen we naar Zuid-Amerika.", "In de herfst reizen we naar zuid-amerika."], a: 1, u: "Seizoenen: kleine letter. Aardrijkskundige namen zoals Zuid-Amerika: hoofdletters." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Met allerheiligen gaan we naar oma.", "Met Allerheiligen gaan we naar oma.", "Met Allerheiligen gaan we naar Oma."], a: 1, u: "Feestdagen zoals Allerheiligen krijgen een hoofdletter. Oma is hier geen naam." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Op zondag eten we een Afrikaans gerecht.", "Op Zondag eten we een afrikaans gerecht.", "Op zondag eten we een afrikaans gerecht."], a: 0, u: "Dagen: kleine letter. Afrikaans komt van Afrika: hoofdletter." },
          { t: "mc", v: "Welke zin is juist geschreven?", k: ["Het waait hard in het Noorden.", "Het waait hard in het noorden."], a: 1, u: "Windrichtingen schrijf je met een kleine letter." },
          { t: "mc", v: "Hoe begin je deze zin juist?", k: ["'S morgens eet ik muesli.", "'s morgens eet ik muesli.", "'s Morgens eet ik muesli."], a: 2, u: "Begint de zin met 's, dan krijgt het volgende woord de hoofdletter." },
          { t: "mc", v: "Hoe begin je deze zin juist?", k: ["'k Ben te laat.", "'K ben te laat.", "'k ben te laat."], a: 0, u: "Na 'k vooraan in de zin krijgt het volgende woord de hoofdletter." },
          { t: "jf", v: "Carnaval schrijf je met een hoofdletter, net als Pasen.", a: false, u: "Pasen wel, carnaval niet." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Welk woord is juist?", k: ["het niveau", "het nivo"], a: 0, u: "Niveau: eau klinkt als oo." },
          { t: "mc", v: "Welk woord is juist?", k: ["de roete", "de route"], a: 1, u: "Route: ou klinkt als oe." },
          { t: "mc", v: "Welk woord is juist?", k: ["de miljardair", "de miljardèr"], a: 0, u: "Miljardair: ai klinkt als è." },
          { t: "mc", v: "Welk woord is juist?", k: ["de decoratie", "de decoratsie"], a: 0, u: "Decoratie: tie klinkt als sie." },
          { t: "mc", v: "Welk woord is juist?", k: ["nieuw", "niew"], a: 0, u: "Nieuw schrijf je met ieu." },
          { t: "mc", v: "Welk woord is juist?", k: ["de kampjoen", "de kampioen"], a: 1, u: "Kampioen schrijf je met ioen." },
          { t: "mc", v: "Welke zin is juist?", k: ["We gaan naar Frankrijk.", "We gaan naar frankrijk."], a: 0, u: "Landen krijgen een hoofdletter." },
          { t: "mc", v: "Welke zin is juist?", k: ["In de Winter is het koud.", "In de winter is het koud."], a: 1, u: "Seizoenen schrijf je met een kleine letter." },
          { t: "mc", v: "Welke zin is juist?", k: ["Met kerstmis eten we samen.", "Met Kerstmis eten we samen."], a: 1, u: "Feesten zoals Kerstmis krijgen een hoofdletter." }
        ]
      }
    }
  },
  {
    id: "frans-mission16",
    vak: "Frans",
    titel: "Mission 16: les saisons et le temps",
    datum: "dinsdag 1 december",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "koppel", v: "Verbind het seizoen met de vertaling.", paren: [["le printemps","de lente"],["l'été","de zomer"],["l'automne","de herfst"],["l'hiver","de winter"]], u: "Les saisons: le printemps, l'été, l'automne, l'hiver." },
          { t: "mc", v: "We maken een sneeuwman. Welk seizoen is het?", k: ["l'été", "l'hiver", "le printemps"], a: 1, u: "Een sneeuwman maak je in de winter: l'hiver." },
          { t: "mc", v: "Er groeien nieuwe bloemen. Welk seizoen is het?", k: ["le printemps", "l'automne", "l'hiver"], a: 0, u: "In de lente groeien nieuwe bloemen: le printemps." },
          { t: "mc", v: "Hoe zeg je 'in de lente'?", k: ["en printemps", "au printemps", "le printemps"], a: 1, u: "Au printemps, maar: en été, en automne, en hiver." },
          { t: "mc", v: "Hoe zeg je 'in de zomer'?", k: ["au été", "en été", "à l'été"], a: 1, u: "En été." },
          { t: "koppel", v: "Quel temps fait-il ? Verbind.", paren: [["Il pleut.","Het regent."],["Il neige.","Het sneeuwt."],["Il fait froid.","Het is koud."],["Il y a du soleil.","De zon schijnt."],["Il y a du vent.","Het waait."]], u: "Het weer in het Frans." },
          { t: "mc", v: "Hoe vraag je 'Welk weer is het?'", k: ["Quel temps fait-il ?", "Quelle heure est-il ?", "Comment ça va ?"], a: 0, u: "Quel temps fait-il ? = Welk weer is het?" },
          { t: "mc", v: "Il fait chaud. Wat betekent dat?", k: ["Het is koud.", "Het is warm.", "Het is mooi weer."], a: 1, u: "Chaud = warm, froid = koud." },
          { t: "mc", v: "Il fait beau. Wat betekent dat?", k: ["Het is mooi weer.", "Het regent.", "Het waait."], a: 0, u: "Il fait beau = het is mooi weer." },
          { t: "invul", v: "Il pleut. Je prends mon … (paraplu)", a: ["parapluie"], u: "De paraplu = le parapluie." },
          { t: "mc", v: "Je mets mon bonnet … il fait froid.", k: ["parce qu'", "mais", "et"], a: 0, u: "Parce que (parce qu' voor een klinker) = omdat." },
          { t: "mc", v: "Welke zin past bij de herfst?", k: ["En automne, il y a du vent.", "En été, il neige.", "Au printemps, il fait très froid."], a: 0, u: "In de herfst waait het vaak: en automne, il y a du vent." }
        ]
      }
    }
  },
  {
    id: "spelling-t4-les5",
    vak: "Spelling",
    titel: "Thema 4 les 5: eventueel, toernooi, apen",
    datum: "woensdag 2 december",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["eventuul", "eventueel", "eventuel"], a: 1, u: "Eventueel eindigt op -ueel." },
          { t: "mc", v: "Welke woordgroep is juist?", k: ["een virtueele wereld", "een virtuele wereld", "een virtuelle wereld"], a: 1, u: "Komt er een e achter, dan schrijf je -uele: virtuele." },
          { t: "mc", v: "Welke woordgroep is juist?", k: ["het actuele nieuws", "het actueele nieuws"], a: 0, u: "Actueel + e = actuele." },
          { t: "invul", exact: true, v: "Deze opdracht maak je alleen. Je werkt individu…", a: ["individueel"], u: "Individueel: -ueel." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["het toernoi", "het toernooi", "het toernoj"], a: 1, u: "Toernooi schrijf je met ooi." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de schaapskooi", "de schaapskoi"], a: 0, u: "Kooi: ooi." },
          { t: "mc", v: "Hoe klap je 'apen' in klankgroepen?", k: ["ap-en", "a-pen", "aa-pen"], a: 1, u: "a-pen: de a staat aan het einde van de klankgroep, dus één letter." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de vertaaling", "de vertaling"], a: 1, u: "ver-ta-ling: lange a aan het einde van een klankgroep: één letter." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de orgaanen", "de organen"], a: 1, u: "or-ga-nen: één a." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["de dialoog", "de dialog", "de dialooog"], a: 0, u: "di-a-loog: in de gesloten klankgroep 'loog' schrijf je oo." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["voorhen", "voorheen"], a: 1, u: "voor-heen: lange klank in een gesloten klankgroep: twee letters." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["het knopsgat", "het knoopsgat"], a: 1, u: "knoops-gat: twee o's in de gesloten klankgroep." },
          { t: "invul", exact: true, v: "Het voetbal… gaat eventueel door. (wedstrijdreeks)", a: ["toernooi", "voetbaltoernooi"], u: "Toernooi: ooi." },
          { t: "mc", v: "Welk woord is juist geschreven?", k: ["het rituel", "het ritueel", "het ritueël"], a: 1, u: "Ritueel: -ueel." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Welk woord is juist?", k: ["eventueel", "eventuul"], a: 0, u: "Eventueel eindigt op -ueel." },
          { t: "mc", v: "Welk woord is juist?", k: ["het toernoi", "het toernooi"], a: 1, u: "Toernooi schrijf je met ooi." },
          { t: "mc", v: "Welk woord is juist?", k: ["de kooi", "de koi"], a: 0, u: "Kooi schrijf je met ooi." },
          { t: "mc", v: "Welk woord is juist?", k: ["de appen", "de apen"], a: 1, u: "Klap: a-pen. Eén a." },
          { t: "mc", v: "Welk woord is juist?", k: ["de organen", "de orgaanen"], a: 0, u: "Klap: or-ga-nen. Eén a." },
          { t: "mc", v: "Welke zin is juist?", k: ["Het nieuws is actueel.", "Het nieuws is actuel."], a: 0, u: "Actueel: -ueel." },
          { t: "mc", v: "Welke woordgroep is juist?", k: ["het actuele nieuws", "het actueele nieuws"], a: 0, u: "Komt er een e achter? Dan schrijf je -uele." },
          { t: "mc", v: "Welk woord is juist?", k: ["individueel", "individuel"], a: 0, u: "Individueel: -ueel." }
        ]
      }
    }
  },
  {
    id: "wisk-getallenkennis-b4",
    vak: "Wiskunde",
    titel: "Getallenkennis blok 4: breuken, kommagetallen en kans",
    datum: "donderdag 3 december",
    niveaus: {
      gewoon: {
        vragen: [
          { t: "invul", v: "Schrijf als kommagetal: 37/100 =", a: ["0,37", "0.37"], u: "Honderdsten: 2 cijfers na de komma." },
          { t: "invul", v: "Schrijf als kommagetal: 3/4 =", a: ["0,75", "0.75"], u: "3/4 = 75/100 = 0,75." },
          { t: "invul", v: "Schrijf als kommagetal: 2/5 =", a: ["0,4", "0.4", "0,40"], u: "2/5 = 4/10 = 0,4." },
          { t: "invul", v: "Schrijf als kommagetal: 625/1000 =", a: ["0,625", "0.625"], u: "Duizendsten: 3 cijfers na de komma." },
          { t: "mc", v: "Welke breuk hoort bij 0,45? (zo eenvoudig mogelijk)", k: ["45/10", "9/20", "4/5"], a: 1, u: "0,45 = 45/100. Deel door 5: 9/20." },
          { t: "mc", v: "Welke breuk hoort bij 0,125?", k: ["1/8", "1/25", "12/5"], a: 0, u: "0,125 = 125/1000 = 1/8." },
          { t: "mc", v: "1,4 = …", k: ["1 gehele en 4/100", "1 gehele en 2/5", "14/100"], a: 1, u: "1,4 = 14/10 = 7/5 = 1 gehele en 2/5." },
          { t: "mc", v: "Vereenvoudig: 55/100 = …", k: ["11/20", "5/10", "11/50"], a: 0, u: "Deel teller en noemer door 5: 11/20." },
          { t: "mc", v: "Vul in: 0,3 … 1/4", k: ["<", ">", "="], a: 1, u: "1/4 = 0,25. 0,3 is groter." },
          { t: "mc", v: "Vul in: 7/20 … 0,4", k: ["<", ">", "="], a: 0, u: "7/20 = 0,35. Dat is kleiner dan 0,4." },
          { t: "mc", v: "Vul in: 6/5 … 1,2", k: ["<", ">", "="], a: 2, u: "6/5 = 12/10 = 1,2." },
          { t: "mc", v: "Ploeg A scoort 9 van de 12 strafschoppen, ploeg B 14 van de 20. Wie scoort het best?", k: ["Ploeg A", "Ploeg B", "Even goed"], a: 0, u: "9/12 = 0,75 en 14/20 = 0,7. Ploeg A scoort het best." },
          { t: "mc", v: "In een klas van 24 kinderen dragen 8 kinderen een bril. Welk deel draagt een bril?", k: ["1/3", "1/4", "8/16"], a: 0, u: "8/24 = 1/3." },
          { t: "mc", v: "In een zak zitten 4 rode, 6 blauwe en 10 gele knikkers. Wat is de kans op een blauwe?", k: ["6/10", "3/10", "1/6"], a: 1, u: "6 van de 20 = 6/20 = 3/10." },
          { t: "mc", v: "Zelfde zak. Wat is de kans op een groene knikker?", k: ["0", "1/20", "1"], a: 0, u: "Er zitten geen groene in: de kans is 0 (onmogelijk)." },
          { t: "mc", v: "Je gooit met een dobbelsteen. Wat is de kans op een getal groter dan 4?", k: ["1/6", "1/3", "1/2"], a: 1, u: "5 en 6: 2 van de 6 = 1/3." },
          { t: "invul", v: "3 op de 5 kinderen eten warm. Er zijn 25 kinderen. Hoeveel kinderen eten warm?", a: ["15"], u: "25 : 5 = 5, 5 x 3 = 15." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "1/2 = …", k: ["0,5", "0,2", "1,2"], a: 0, u: "De helft = 0,5." },
          { t: "mc", v: "1/4 = …", k: ["0,4", "0,25", "1,4"], a: 1, u: "Denk aan geld: 1/4 euro = 25 cent = € 0,25." },
          { t: "mc", v: "3/4 = …", k: ["0,75", "0,34", "3,4"], a: 0, u: "3/4 euro = 75 cent = € 0,75." },
          { t: "mc", v: "7/10 = …", k: ["0,07", "0,7", "7,10"], a: 1, u: "Tienden: 1 cijfer na de komma." },
          { t: "mc", v: "23/100 = …", k: ["0,23", "2,3", "0,023"], a: 0, u: "Honderdsten: 2 cijfers na de komma." },
          { t: "mc", v: "Welke breuk hoort bij 0,4?", k: ["1/4", "2/5", "4/5"], a: 1, u: "2/5 = 4/10 = 0,4." },
          { t: "mc", v: "Is 0,8 groter of kleiner dan 0,5?", k: ["groter", "kleiner"], a: 0, u: "0,5 is de helft. 0,8 is meer dan de helft." },
          { t: "mc", v: "3 rode en 1 blauwe knikker. Kans op rood?", k: ["1 op 4", "3 op 4"], a: 1, u: "3 rode van de 4 knikkers: 3 op 4." },
          { t: "mc", v: "Lies drinkt 0,5 liter. Jan drinkt 1/4 liter. Wie drinkt het meest?", k: ["Lies", "Jan"], a: 0, u: "1/4 = 0,25. 0,5 is meer." }
        ]
      }
    }
  },
  {
    id: "bl-thema4",
    vak: "Begrijpend lezen",
    titel: "Thema 4: een informatieve tekst",
    datum: "vrijdag 4 december",
    niveaus: {
      gewoon: {
        teksten: [
          { titel: "Gamen: leuk of niet?", soort: "informatieve tekst (non-fictie)", alineas: [
            "Bijna elk kind speelt weleens een spelletje op een spelconsole, een tablet of een smartphone. Sommige kinderen gamen een kwartiertje per dag, andere zitten er urenlang achter. Is gamen goed of slecht voor je? Het antwoord is niet zo eenvoudig.",
            "Wat is er goed aan? Gamen is ontspannend en vaak heel spannend. Bij veel spelletjes moet je snel nadenken, plannen en problemen oplossen. Wie samen met vrienden speelt, leert ook overleggen en samenwerken. Sommige spelletjes leren je zelfs nieuwe woorden in het Engels.",
            "Wat is er minder goed aan? Wie urenlang gamet, zit stil. Door weinig te bewegen word je minder fit. Ook je ogen worden moe als je lang naar een scherm kijkt. Wie 's avonds laat nog speelt, slaapt slechter in. Daardoor ben je de volgende dag op school sneller moe en kun je je minder goed concentreren.",
            "Hoe doe je het slim? Spreek thuis af hoe lang je mag spelen. Las elk halfuur een pauze in en kijk even in de verte. Stop minstens een uur voor je gaat slapen. En vergeet niet: buiten spelen met vrienden is ook nog altijd leuk!",
            "Bronnen: gesprekken met kinderen uit het zesde leerjaar en informatie van een kinderarts (2026)."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Wat voor soort tekst is dit?", k: ["Een verhaal (fictie)", "Een informatieve tekst (non-fictie)", "Een gedicht"], a: 1, u: "De tekst geeft informatie, heeft tussentitels en bronnen: non-fictie." },
          { t: "mc", tekst: 0, v: "Waarvoor dienen de vetgedrukte vragen zoals ‘Wat is er goed aan?’ aan het begin van de alinea's?", k: ["Het zijn tussentitels: ze vertellen waarover de alinea gaat.", "Het zijn vragen die jij moet beantwoorden.", "Ze maken de tekst langer."], a: 0, u: "Tussentitels tonen waarover een stukje gaat." },
          { t: "mc", tekst: 0, v: "Welke zin is een voordeel (positief effect) van gamen?", k: ["Je ogen worden moe.", "Je leert snel nadenken en problemen oplossen.", "Je slaapt slechter in."], a: 1, u: "Snel nadenken en problemen oplossen staat bij ‘Wat is er goed aan?’." },
          { t: "mc", tekst: 0, v: "Welke zin is een nadeel (negatief effect)?", k: ["Je leert samenwerken.", "Je leert Engelse woorden.", "Door stil te zitten word je minder fit."], a: 2, u: "Minder fit worden is een negatief effect." },
          { t: "mc", tekst: 0, v: "Oorzaak en gevolg: je speelt 's avonds laat nog. Wat is het gevolg?", k: ["Je slaapt slechter in.", "Je wordt fitter.", "Je leert meer Engels."], a: 0, u: "Laat gamen (oorzaak) → slechter inslapen (gevolg)." },
          { t: "mc", tekst: 0, v: "En wat is daarvan dan weer het gevolg?", k: ["Je bent op school sneller moe.", "Je speelt beter.", "Je hebt meer vrienden."], a: 0, u: "Slecht slapen → moe op school, minder goed concentreren." },
          { t: "jf", tekst: 0, v: "Volgens de tekst is gamen altijd slecht voor je.", a: false, u: "De tekst noemt voordelen én nadelen: ‘Het antwoord is niet zo eenvoudig’." },
          { t: "mc", tekst: 0, v: "Welke tip staat NIET in de tekst?", k: ["Las elk halfuur een pauze in.", "Stop een uur voor je gaat slapen.", "Game alleen in het weekend."], a: 2, u: "Alleen in het weekend gamen staat er niet in." },
          { t: "mc", tekst: 0, v: "Waar komt de informatie vandaan?", k: ["Uit een stripverhaal", "Van kinderen uit het zesde leerjaar en een kinderarts", "Van een spelletjesfabrikant"], a: 1, u: "Dat staat onderaan bij de bronnen." },
          { t: "mc", tekst: 0, v: "Wat is de bedoeling van de schrijver?", k: ["Je informeren over voor- en nadelen van gamen", "Je een spelletje verkopen", "Je aan het lachen brengen"], a: 0, u: "De schrijver geeft informatie en tips." },
          { t: "invul", tekst: 0, v: "Alinea 4: “… en kijk even in de verte.” Waarom geeft de schrijver die tip? Omdat je … anders moe worden. (één woord)", a: ["ogen", "je ogen"], u: "In alinea 3: ‘Ook je ogen worden moe als je lang naar een scherm kijkt.’" }
        ]
      },
      "1b": {
        teksten: [
          { titel: "Recensie: Robo en de regenboog", soort: "recensie", alineas: [
            "Robo is een kleine robot. Hij woont in een grijze stad. Op een dag ziet hij een regenboog. Robo wil weten waar die regenboog begint. Hij gaat op reis.",
            "Ik vond deze film heel grappig. Robo maakt veel gekke fouten. De kleuren in de film zijn prachtig.",
            "Een minpunt: de film is wat lang. In het midden gebeurt er niet veel.",
            "Toch raad ik de film aan, want het einde is mooi. Ik geef de film vier sterren.",
            "Sara, 11 jaar"
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Waarover gaat de film?", k: ["Over een robot die een regenboog zoekt", "Over een hond", "Over een school"], a: 0, u: "Robo wil weten waar de regenboog begint." },
          { t: "mc", tekst: 0, v: "Wie schreef de recensie?", k: ["Robo", "Sara"], a: 1, u: "Onderaan staat: Sara, 11 jaar." },
          { t: "mc", tekst: 0, v: "Wat is een pluspunt van de film?", k: ["De film is wat lang.", "De film is grappig."], a: 1, u: "Een pluspunt is iets goeds: de film is grappig." },
          { t: "mc", tekst: 0, v: "Wat is een minpunt van de film?", k: ["De film is wat lang.", "De kleuren zijn mooi."], a: 0, u: "Een minpunt is iets wat minder goed is." },
          { t: "mc", tekst: 0, v: "Hoeveel sterren geeft Sara?", k: ["drie", "vier", "vijf"], a: 1, u: "“Ik geef de film vier sterren.”" },
          { t: "jf", tekst: 0, v: "Sara raadt de film aan.", a: true, u: "“Toch raad ik de film aan.”" },
          { t: "mc", tekst: 0, v: "Waarom raadt Sara de film aan?", k: ["Omdat het einde mooi is", "Omdat de film kort is"], a: 0, u: "“… want het einde is mooi.”" },
          { t: "mc", tekst: 0, v: "Wat is een recensie?", k: ["Een tekst met je mening over een film of boek", "Een gedicht"], a: 0, u: "In een recensie vertel je wat je van een film of boek vindt." }
        ]
      }
    }
  }
  ]
}

];
