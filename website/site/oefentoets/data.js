/* Oefentoetsen per week. Voeg elke week een blok toe aan WEKEN. */
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
          { titel: "Ruzie? Zo los je het op!", soort: "informatieve tekst", alineas: [
            "Iedereen maakt weleens ruzie. Op de speelplaats, thuis met je broer of zus, of in de sportclub. Dat is heel normaal. Ruzie hoeft ook niet altijd slecht te zijn. Het belangrijkste is hoe je ze oplost.",
            "Eerst moet je afkoelen. Als je heel boos bent, zeg je vaak dingen waar je later spijt van hebt. Tel daarom tot tien of loop even weg. Daarna kun je rustig praten.",
            "Vervolgens vertelt iedereen om de beurt wat er gebeurd is. De anderen luisteren en onderbreken niet. Dat is moeilijker dan het lijkt! Probeer te zeggen hoe jij je voelt, in plaats van de ander te beschuldigen. Zeg dus liever “Ik voel me boos omdat ik niet mocht meespelen” dan “Jij bent gemeen”.",
            "Tot slot zoeken jullie samen een oplossing. Soms moet iedereen een beetje toegeven. Lukt het niet alleen? Vraag dan hulp aan een juf, meester of leerling-bemiddelaar. Op veel scholen helpen leerlingen uit het zesde leerjaar bij ruzies op de speelplaats.",
            "Volgens mij is een ruzie die goed is opgelost zelfs goed voor een vriendschap. Je leert elkaar namelijk beter kennen."
          ]},
          { titel: "De laatste penalty", soort: "verhaal (fictie)", alineas: [
            "Het was doodstil in het stadion. Noor zette de bal op de witte stip. Haar handen trilden. Als ze nu scoorde, won haar ploeg de beker.",
            "Ze keek naar de keepster van de andere ploeg. Dat was Lien, haar beste vriendin van vroeger. Sinds Lien verhuisd was, hadden ze elkaar bijna niet meer gezien.",
            "Noor nam vier passen aanloop. Ze schoot hard, laag in de linkerhoek. Lien dook, maar te laat. Goal! Noors ploeggenoten vlogen haar om de hals.",
            "Toch keek Noor om. Lien zat op haar knieën in het gras, met haar handen voor haar gezicht. Noor maakte zich los uit het feestgedruis en liep naar haar toe. “Je was echt goed vandaag,” zei ze zacht en ze stak haar hand uit. Lien keek op en glimlachte door haar tranen heen."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Wat is de hoofdgedachte van de tekst ‘Ruzie? Zo los je het op!’?", k: ["Ruzie maken is altijd slecht.", "Je kunt een ruzie in stappen goed oplossen.", "Leerlingen van het zesde leerjaar maken de meeste ruzie.", "Je moet altijd tot tien tellen."], a: 1, u: "De tekst legt uit hoe je een ruzie oplost: eerst afkoelen, dan praten, dan samen een oplossing zoeken." },
          { t: "mc", tekst: 0, v: "Welke soort tekst is ‘Ruzie? Zo los je het op!’ vooral?", k: ["Een uitleggende / informatieve tekst", "Een gedicht", "Een verhaal", "Een recept"], a: 0, u: "De schrijver geeft informatie en uitleg over hoe je ruzie oplost." },
          { t: "mc", tekst: 0, v: "Welke woorden tonen de volgorde van de stappen aan (signaalwoorden)?", k: ["omdat – dus – want", "eerst – vervolgens – tot slot", "maar – toch – echter", "bijvoorbeeld – zoals"], a: 1, u: "Eerst, vervolgens en tot slot zijn signaalwoorden van opsomming/volgorde." },
          { t: "invul", tekst: 0, v: "In alinea 1 staat: “Het belangrijkste is hoe je ze oplost.” Naar welk woord verwijst ‘ze’?", a: ["ruzie", "ruzies", "de ruzie", "de ruzies"], u: "‘Ze’ verwijst naar ruzie(s)." },
          { t: "jf", tekst: 0, v: "“Volgens mij is een ruzie die goed is opgelost zelfs goed voor een vriendschap.” Dit is een feit.", a: false, u: "Het is een mening. Je herkent het aan ‘volgens mij’." },
          { t: "mc", tekst: 0, v: "Waarom moet je volgens de tekst eerst afkoelen?", k: ["Omdat de juf dat zegt.", "Omdat je anders dingen zegt waar je later spijt van hebt.", "Omdat de ander dan vergeet waarover het ging.", "Omdat praten niet helpt."], a: 1, u: "Zie alinea 2: als je boos bent, zeg je dingen waar je later spijt van hebt." },
          { t: "mc", tekst: 0, v: "Welke zin is een goede ‘ik-boodschap’?", k: ["Jij doet altijd vervelend!", "Ik voel me verdrietig omdat je me uitlachte.", "Iedereen vindt jou stom.", "Jij bent begonnen."], a: 1, u: "Een ik-boodschap vertelt hoe JIJ je voelt, zonder de ander te beschuldigen." },
          { t: "mc", tekst: 0, v: "Wat is het schrijfdoel van deze tekst?", k: ["Ontspannen (de lezer vermaken)", "Informeren en uitleggen hoe je iets doet", "Overtuigen om een product te kopen", "Een gevoel uitdrukken in een gedicht"], a: 1, u: "De schrijver wil vooral uitleggen en informeren." },
          { t: "mc", tekst: 1, v: "Wie is het hoofdpersonage in ‘De laatste penalty’?", k: ["Lien", "De scheidsrechter", "Noor", "De trainer"], a: 2, u: "Het verhaal gaat vooral over Noor en wat zij denkt en doet." },
          { t: "mc", tekst: 1, v: "Hoe voelt Noor zich vóór ze de penalty neemt? Waaraan zie je dat?", k: ["Blij, want ze lacht.", "Zenuwachtig, want haar handen trillen.", "Boos, want ze schreeuwt.", "Verveeld, want ze gaapt."], a: 1, u: "‘Haar handen trilden’ toont dat ze zenuwachtig is." },
          { t: "jf", tekst: 1, v: "Noor en Lien zijn vroeger beste vriendinnen geweest.", a: true, u: "Alinea 2: ‘haar beste vriendin van vroeger’." },
          { t: "mc", tekst: 1, v: "Wat toont het einde van het verhaal over Noor?", k: ["Ze is een slechte verliezer.", "Ze denkt alleen aan haar eigen ploeg.", "Ze is sportief en leeft mee met haar vriendin.", "Ze is boos op Lien."], a: 2, u: "Ze laat het feest even voor wat het is om Lien te troosten: sportief en meelevend." },
          { t: "invul", tekst: 1, v: "Vul aan: ‘Lien keek op en glimlachte door haar ... heen.’", a: ["tranen"], u: "Lien huilde, maar was blij met de woorden van Noor." }
        ]
      },
      "1b": {
        teksten: [
          { titel: "Ruzie oplossen", soort: "informatieve tekst", alineas: [
            "Iedereen maakt weleens ruzie. Dat is normaal. Hoe los je een ruzie op?",
            "Eerst word je rustig. Tel tot tien.",
            "Dan praat je om de beurt. Je luistert naar de ander.",
            "Tot slot zoek je samen een oplossing. Lukt het niet? Vraag dan hulp aan de juf of meester."
          ]},
          { titel: "De penalty", soort: "verhaal", alineas: [
            "Noor legt de bal op de stip. Haar handen trillen.",
            "Ze schiet. Goal! Haar ploeg wint.",
            "De keepster huilt. Noor gaat naar haar toe. “Je was goed,” zegt Noor."
          ]}
        ],
        vragen: [
          { t: "mc", tekst: 0, v: "Waarover gaat de tekst ‘Ruzie oplossen’?", k: ["Hoe je een ruzie oplost", "Hoe je voetbalt", "Hoe je tot tien telt"], a: 0, u: "De tekst vertelt hoe je een ruzie oplost." },
          { t: "mc", tekst: 0, v: "Wat doe je eerst?", k: ["Hulp vragen", "Rustig worden", "Een oplossing zoeken"], a: 1, u: "Eerst word je rustig: tel tot tien." },
          { t: "mc", tekst: 0, v: "Wat doe je als je praat?", k: ["Je roept heel hard.", "Je luistert naar de ander.", "Je loopt weg."], a: 1, u: "Je praat om de beurt en je luistert." },
          { t: "jf", tekst: 0, v: "Als het niet lukt, mag je hulp vragen aan de juf of meester.", a: true, u: "Dat staat in de laatste alinea." },
          { t: "mc", tekst: 0, v: "Welk woord vertelt dat iets als laatste komt?", k: ["eerst", "dan", "tot slot"], a: 2, u: "‘Tot slot’ = als laatste." },
          { t: "mc", tekst: 1, v: "Hoe voelt Noor zich voor ze schiet?", k: ["Zenuwachtig", "Boos", "Moe"], a: 0, u: "Haar handen trillen: ze is zenuwachtig." },
          { t: "jf", tekst: 1, v: "Noor scoort een goal.", a: true, u: "‘Goal! Haar ploeg wint.’" },
          { t: "mc", tekst: 1, v: "Waarom gaat Noor naar de keepster?", k: ["Om haar uit te lachen", "Om haar te troosten", "Om de bal te halen"], a: 1, u: "De keepster huilt. Noor zegt iets liefs: ze troost haar." }
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
          { t: "mc", v: "Wie kwam in 1933 in Duitsland aan de macht?", k: ["Winston Churchill", "Adolf Hitler", "Koning Leopold III", "Franklin Roosevelt"], a: 1, u: "Adolf Hitler werd in 1933 de leider van Duitsland." },
          { t: "mc", v: "Waarom kreeg Hitler veel aanhangers in Duitsland?", k: ["Duitsland was het rijkste land ter wereld.", "Er was veel werkloosheid en armoede, en hij beloofde werk en een sterk land.", "Hij was de koning.", "Hij had de Eerste Wereldoorlog gewonnen."], a: 1, u: "Na de Eerste Wereldoorlog en de economische crisis waren veel Duitsers arm. Hitler beloofde werk en macht." },
          { t: "mc", v: "Met welke inval begon de Tweede Wereldoorlog in 1939?", k: ["Duitsland viel Polen binnen.", "Japan viel Amerika aan.", "Duitsland viel België binnen.", "Rusland viel Duitsland aan."], a: 0, u: "Op 1 september 1939 viel Duitsland Polen binnen. Daarna verklaarden Frankrijk en Groot-Brittannië de oorlog." },
          { t: "invul", v: "Op welke datum viel Duitsland België binnen? (dag en maand + jaar)", a: ["10 mei 1940", "10/05/1940", "10-05-1940", "10 mei"], u: "Op 10 mei 1940 viel Duitsland België, Nederland en Luxemburg binnen." },
          { t: "mc", v: "Hoe heet de manier van oorlog voeren met snelle aanvallen van tanks en vliegtuigen?", k: ["Loopgravenoorlog", "Blitzkrieg (bliksemoorlog)", "Koude oorlog", "Burgeroorlog"], a: 1, u: "Blitzkrieg = bliksemoorlog: snel en verrassend aanvallen." },
          { t: "mc", v: "Hoe noemen we de strijd van het Belgische leger in mei 1940?", k: ["De Slag om Engeland", "De achttiendaagse veldtocht", "Het Ardennenoffensief", "D-Day"], a: 1, u: "Het Belgische leger vocht 18 dagen. Op 28 mei 1940 gaf koning Leopold III zich over (capitulatie)." },
          { t: "jf", v: "Tijdens de bezetting kregen mensen voedselbonnen omdat er te weinig eten was.", a: true, u: "Eten werd gerantsoeneerd: met bonnen kreeg je een beperkte hoeveelheid. Er was ook een zwarte markt." },
          { t: "mc", v: "Wat is collaboratie?", k: ["Samenwerken met de vijand (de Duitse bezetter)", "Je verzetten tegen de bezetter", "Vluchten naar Engeland", "Soldaten verzorgen"], a: 0, u: "Collaborateurs werkten samen met de Duitsers. Na de oorlog werden velen gestraft." },
          { t: "mc", v: "Wat deed het verzet?", k: ["Het hielp de Duitsers.", "Het werkte tegen de bezetter: sabotage, onderduikers helpen, sluikpers maken.", "Het organiseerde feesten.", "Het maakte voedselbonnen."], a: 1, u: "Verzetsstrijders saboteerden, verstopten onderduikers en verspreidden geheime kranten (sluikpers)." },
          { t: "mc", v: "Welke groep werd door de nazi's het zwaarst vervolgd en massaal vermoord in concentratie- en vernietigingskampen?", k: ["Boeren", "Joden", "Soldaten", "Kinderen uit Engeland"], a: 1, u: "Zo'n 6 miljoen Joden werden vermoord. Dat noemen we de Holocaust (of Shoah)." },
          { t: "mc", v: "Wie was Anne Frank?", k: ["Een Joods meisje dat ondergedoken een dagboek schreef", "Een Duitse generaal", "De koningin van Nederland", "Een verpleegster in het leger"], a: 0, u: "Anne Frank dook onder in Amsterdam en schreef een dagboek. Ze stierf in het kamp Bergen-Belsen." },
          { t: "invul", v: "Hoe heet de dag waarop de geallieerden landden in Normandië (6 juni 1944)?", a: ["D-Day", "Dday", "D Day", "D-dag"], u: "Op D-Day landden de geallieerden in Normandië (Frankrijk)." },
          { t: "mc", v: "Wanneer werd het grootste deel van België bevrijd?", k: ["September 1944", "Mei 1940", "December 1939", "Augustus 1945"], a: 0, u: "In september 1944 bevrijdden de geallieerden Brussel (3 sept.) en Antwerpen (4 sept.)." },
          { t: "mc", v: "Wat was het Ardennenoffensief?", k: ["De laatste grote Duitse aanval in de winter van 1944-1945", "De eerste dag van de oorlog", "Een vredesverdrag", "Een feest na de bevrijding"], a: 0, u: "In december 1944 vielen de Duitsers nog eens aan in de Ardennen, bv. rond Bastenaken." },
          { t: "jf", v: "De oorlog in Europa eindigde op 8 mei 1945.", a: true, u: "Op 8 mei 1945 gaf Duitsland zich over. In Azië ging de oorlog door tot augustus 1945." },
          { t: "mc", v: "Waardoor eindigde de oorlog met Japan?", k: ["Japan won de oorlog.", "Amerika gooide atoombommen op Hiroshima en Nagasaki.", "Hitler sloot vrede.", "België viel Japan binnen."], a: 1, u: "Na de atoombommen in augustus 1945 gaf Japan zich over." },
          { t: "mc", v: "Welke organisatie werd na de oorlog opgericht om de vrede te bewaren?", k: ["De Verenigde Naties (VN)", "De Olympische Spelen", "De FIFA", "Het Rode Kruis"], a: 0, u: "In 1945 werd de VN opgericht om nieuwe oorlogen te voorkomen." }
        ]
      },
      "1b": {
        vragen: [
          { t: "mc", v: "Wie was de leider van Duitsland tijdens de oorlog?", k: ["Hitler", "Napoleon", "Leopold III"], a: 0, u: "Adolf Hitler was de leider van Duitsland." },
          { t: "mc", v: "In welk jaar begon de Tweede Wereldoorlog?", k: ["1914", "1939", "2000"], a: 1, u: "De oorlog begon in 1939." },
          { t: "mc", v: "In welk jaar viel Duitsland België binnen?", k: ["1940", "1918", "1960"], a: 0, u: "Op 10 mei 1940." },
          { t: "jf", v: "Tijdens de oorlog was er veel eten in de winkels.", a: false, u: "Er was te weinig eten. Mensen kregen voedselbonnen." },
          { t: "mc", v: "Wat deed het verzet?", k: ["Helpen tegen de Duitsers", "Helpen voor de Duitsers", "Voetballen"], a: 0, u: "Het verzet werkte tegen de Duitse bezetter." },
          { t: "mc", v: "Welke groep mensen werd door de nazi's vervolgd?", k: ["De Joden", "De koks", "De bakkers"], a: 0, u: "Miljoenen Joden werden vermoord. Dat heet de Holocaust." },
          { t: "mc", v: "Wie schreef een bekend dagboek toen ze ondergedoken zat?", k: ["Anne Frank", "Hitler", "Roodkapje"], a: 0, u: "Anne Frank schreef haar dagboek in een verstopplaats in Amsterdam." },
          { t: "jf", v: "Op D-Day kwamen de geallieerde soldaten aan land in Frankrijk.", a: true, u: "Ze landden op 6 juni 1944 in Normandië, in Frankrijk." },
          { t: "mc", v: "In welk jaar eindigde de oorlog?", k: ["1945", "1940", "1950"], a: 0, u: "De oorlog eindigde in 1945." }
        ]
      }
    }
  }
  ]
}
];
