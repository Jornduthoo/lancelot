// Extra leervormen voor Thor: sorteren (soorten zinnen) en fout zoeken (spelling en taal).
// Nog niet gebruikt door Thor's vakken, maar app.js verwacht ze: lege lijsten.
window.ELI_TIJDLIJN = [];
window.ELI_WW = {}; window.ELI_PC = {}; window.ELI_PERS = []; window.ELI_VOCAB = [];

window.ELI_SORTEER = {
  tid: 'N7',
  bakjes: [['med', '📢 Mededelend'], ['vra', '❓ Vragend'], ['geb', '👉 Gebiedend'], ['uit', '😮 Uitroepend']],
  items: [
    ['Thor skatet elke zaterdag in het park.', 'med'],
    ['De verzamelbeurs begint om tien uur.', 'med'],
    ['Mijn oudste figuur komt uit 1983.', 'med'],
    ['Eli speelt morgen een match.', 'med'],
    ['Ga je mee naar de skatebaan?', 'vra'],
    ['Hoeveel figuurtjes heb jij al?', 'vra'],
    ['Waarom draag je geen helm?', 'vra'],
    ['Wie won het worstelgevecht?', 'vra'],
    ['Zet je helm op.', 'geb'],
    ['Lees de vraag twee keer.', 'geb'],
    ['Ruim je kamer op!', 'geb'],
    ['Buig je knieën bij de landing.', 'geb'],
    ['Wat een sprong!', 'uit'],
    ['Au, mijn knie!', 'uit'],
    ['Wauw, die figuur is nog in de doos!', 'uit'],
    ['Hoe mooi is die gordel!', 'uit'],
  ]
};

// [zin met [fout|juist], uitleg, onderwerp]
window.ELI_FOUT = [
  // N6 bijvoeglijk naamwoord
  ['Thor kocht een [zeldzame|zeldzaam] boek over speelgoed.', 'Een + het-woord (het boek) in het enkelvoud: geen -e.', 'N6'],
  ['De [groote|grote] doos staat op zolder.', 'Groot + e = grote: in een open lettergreep schrijf je maar één o.', 'N6'],
  ['Moemoe is een heel [lief|lieve] oma.', 'Oma is een de-woord: wel een -e, en f wordt v.', 'N6'],
  ['Hij heeft een [dike|dikke] map vol stickers.', 'Korte klinker: de k verdubbelt (dik → dikke).', 'N6'],
  // N8 hoofdletters
  ['Op [Maandag|maandag] heeft Thor geen skateles.', 'Dagen krijgen geen hoofdletter.', 'N8'],
  ['In de zomer reizen we naar [spanje|Spanje].', 'Landen krijgen een hoofdletter.', 'N8'],
  ['Mijn favoriete vak is [Wiskunde|wiskunde].', 'Schoolvakken krijgen geen hoofdletter (behalve talen).', 'N8'],
  ['Thor leert zijn [nederlands|Nederlands] voor het examen.', 'Talen krijgen een hoofdletter.', 'N8'],
  ['Met [kerstmis|Kerstmis] krijg ik misschien een nieuwe figuur.', 'Feestdagen krijgen een hoofdletter.', 'N8'],
  ['Hij verzamelt [amerikaans|Amerikaans] speelgoed uit de jaren tachtig.', 'Afgeleid van Amerika: hoofdletter.', 'N8'],
  ['De skater uit [brugge|Brugge] wint de wedstrijd.', 'Steden krijgen een hoofdletter.', 'N8'],
  // N10 OTT
  ['Thor [word|wordt] elke dag beter in skaten.', 'Hij-vorm: stam (word) + t = wordt.', 'N10'],
  ['[Wordt|Word] jij later profskater?', 'Inversie met jij: geen t.', 'N10'],
  ['Ik [vindt|vind] dat figuur prachtig.', 'Ik-vorm = stam: vind, zonder t.', 'N10'],
  ['Eli [vind|vindt] skaten gevaarlijk.', 'Hij-vorm: stam (vind) + t = vindt.', 'N10'],
  ['Wat [vindt|vind] je van mijn verzameling?', 'Inversie met je: geen t.', 'N10'],
  ['Hij [rijd|rijdt] met zijn board naar school.', 'Hij-vorm: stam (rijd) + t = rijdt.', 'N10'],
  ['Mijn broer [houd|houdt] van vintage speelgoed.', 'Hij-vorm: stam (houd) + t = houdt.', 'N10'],
  // N15 imperatief
  ['[Wordt|Word] niet boos als je valt!', 'Imperatief = stam, geen onderwerp, dus geen t.', 'N15'],
  ['[Antwoordt|Antwoord] altijd in een volzin.', 'Imperatief = stam: antwoord.', 'N15'],
  ['[Ben|Wees] voorzichtig op de rampe!', 'Imperatief van zijn = wees.', 'N15'],
  // N16 verkleinwoord
  ['Hij speelt met een klein [baltje|balletje] in de tuin.', 'Korte klinker + l: verdubbelen + -etje.', 'N16'],
  ['Op de foto staat een [boomtje|boompje] naast het skatepark.', 'Lange klinker + m: -pje.', 'N16'],
  ['Mijn oudste [figuurje|figuurtje] is uit 1983.', 'Lange klank + r: -tje.', 'N16'],
  ['De koning en het [koningetje|koninkje] uit het sprookje.', 'Onbeklemtoond -ing: -kje.', 'N16'],
  ['Ik stuur je een [fototje|foto’tje] van mijn nieuwe board.', 'Na a, i, o, u, y: apostrof + tje.', 'N16'],
  ['Ze kreeg een [ringtje|ringetje] van haar oma.', 'Beklemtoond -ing: -etje.', 'N16'],
];
