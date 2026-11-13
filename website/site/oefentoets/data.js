/* Oefentoetsen per week. Voeg elke week een blok toe aan WEKEN.
   Vraagtypes: mc (k = keuzes, a = index juiste), jf (a = true/false), invul (a = aanvaarde antwoorden),
   volg (items in de JUISTE volgorde; de leerling nummert), koppel (paren [links, rechts]).
   Begrijpend lezen: teksten per niveau, tekst = index per vraag, echteTekst = link naar de echte toetstekst. */
window.WEKEN = [
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
          { titel: "Het dagboek van Rosa", soort: "dagboek", alineas: [
            "16 mei 1944. Vannacht ging de sirene. We liepen snel naar de kelder. Mijn broertje Jules huilde. Ik was ook bang.",
            "3 juni 1944. Ik stond lang aan te schuiven bij de bakker. Ik had bonnen bij. Het brood was grijs. Papa is ver weg. Hij moet in Duitsland werken.",
            "7 juni 1944. Oom Felix luistert stiekem naar de radio. Dat mag niet. Hij zegt: “Er zijn soldaten in Frankrijk. Ze komen ons helpen!”",
            "4 september 1944. Er rijden Engelse tanks in onze straat. We zijn vrij! Iedereen zingt. Jules krijgt chocolade van een soldaat."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Wat voor tekst is dit?", k: ["Een dagboek", "Een recept", "Een gedicht"], a: 0, u: "Er staan datums boven en Rosa schrijft over haar leven. Dat is een dagboek." },
          { t: "mc", tekst: 0, v: "Waarom gaan ze naar de kelder?", k: ["De sirene gaat: er komen misschien bommen.", "Ze gaan spelen.", "Ze halen brood."], a: 0, u: "De sirene waarschuwt. In de kelder ben je veiliger." },
          { t: "mc", tekst: 0, v: "Hoe voelt Rosa zich in de kelder?", k: ["Blij", "Bang", "Moe"], a: 1, u: "‘Ik was ook bang.’" },
          { t: "mc", tekst: 0, v: "Wat heeft Rosa nodig bij de bakker?", k: ["Bonnen", "Een fiets", "Een boek"], a: 0, u: "In de oorlog kreeg je eten met bonnen." },
          { t: "jf", tekst: 0, v: "Papa is thuis bij Rosa.", a: false, u: "Papa moet in Duitsland werken." },
          { t: "jf", tekst: 0, v: "Naar die radio luisteren mocht niet.", a: true, u: "Oom Felix luistert stiekem. ‘Dat mag niet.’" },
          { t: "volg", tekst: 0, v: "Wat gebeurt eerst? Geef een nummer (1 = eerst).", items: ["Ze gaan naar de kelder.", "Rosa staat aan te schuiven bij de bakker.", "Er rijden Engelse tanks in de straat."], u: "Kijk naar de datums: mei, juni, september." },
          { t: "mc", tekst: 0, v: "Hoe voelt Rosa zich op 4 september?", k: ["Bang", "Blij", "Boos"], a: 1, u: "Ze zijn vrij en iedereen zingt." }
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
        vragen: [
          { t: "mc", v: "Met welk land begon Duitsland de oorlog in 1939?", k: ["Polen", "Spanje", "Italië"], a: 0, u: "Duitsland viel Polen binnen." },
          { t: "mc", v: "Wie viel Pearl Harbor aan?", k: ["Japan", "België", "Frankrijk"], a: 0, u: "Japan viel de Amerikaanse vloot aan in Pearl Harbor." },
          { t: "mc", v: "Wat moesten Joden dragen op hun kleren?", k: ["Een gele ster", "Een rode hoed", "Een blauwe sjaal"], a: 0, u: "De gele davidsster." },
          { t: "jf", v: "Joden werden weggevoerd naar kampen.", a: true, u: "Ze werden gedeporteerd naar concentratie- en vernietigingskampen." },
          { t: "koppel", v: "Verbind wat samenhoort.", paren: [["D-Day","soldaten landen in Normandië"],["atoombom","Hiroshima in Japan"],["Stalingrad","grote slag in Rusland"]], u: "Dit zijn belangrijke gebeurtenissen in de oorlog." },
          { t: "mc", v: "Wanneer eindigde de oorlog in Europa?", k: ["8 mei 1945", "1 januari 1900", "25 december 1944"], a: 0, u: "Op 8 mei 1945: VE-day." },
          { t: "mc", v: "Wat is een ersatzproduct?", k: ["Een vervanger, zoals nepkoffie", "Een speelgoedje", "Een soldaat"], a: 0, u: "Omdat er te weinig was, gebruikte men vervangers." },
          { t: "mc", v: "Welke organisatie werkt sinds 1945 voor vrede?", k: ["De Verenigde Naties", "De voetbalbond", "De bakkerij"], a: 0, u: "De VN willen nieuwe oorlogen voorkomen." },
          { t: "volg", v: "Wat gebeurde eerst? Geef een nummer (1 = eerst).", items: ["Begin van de oorlog", "D-Day", "Einde van de oorlog"], u: "1939 – 1944 – 1945." },
          { t: "jf", v: "Bij een oorlog lijden alle mensen, aan beide kanten.", a: true, u: "Daarom zegt men dat er bij oorlog alleen verliezers zijn." }
        ]
      }
    }
  }
  ]
}
];
