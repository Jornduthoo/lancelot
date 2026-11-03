// Die eingebauten Fakten der Entdeckerwelt auf Deutsch (wird statt ontdek-inhoud.js benutzt, wenn die Lehrkraft Deutsch wählt).
// { o: Thema, v: Frage, a: Antworten, j: Position der richtigen Antwort, w: der Fakt, der ins Entdeckerbuch kommt }.
// Die Themen (o) bleiben Niederländisch: Das sind Schlüssel; der Bildschirm übersetzt sie.

const PAGE = [
  { o: 'Dieren', v: 'Welches Tier ist das größte Tier der Welt?', a: ['der Elefant', 'der Blauwal', 'die Giraffe'], j: 1, w: 'Der Blauwal kann mehr als 30 Meter lang werden: länger als zwei Busse hintereinander.' },
  { o: 'Dieren', v: 'Wie viele Beine hat eine Spinne?', a: ['sechs', 'acht', 'zehn'], j: 1, w: 'Eine Spinne hat acht Beine. Insekten haben sechs, also ist eine Spinne kein Insekt.' },
  { o: 'Ruimte', v: 'Welchen Planeten nennen wir den roten Planeten?', a: ['Mars', 'Venus', 'Jupiter'], j: 0, w: 'Der Mars ist rot wegen des Rosts im Boden: Er enthält viel Eisen.' },
  { o: 'Ruimte', v: 'Was kreist um die Erde?', a: ['die Sonne', 'der Mond', 'der Mars'], j: 1, w: 'Der Mond kreist in ungefähr einem Monat einmal um die Erde.' },
  { o: 'Natuur', v: 'Was braucht eine Pflanze zum Wachsen?', a: ['Licht und Wasser', 'nur Sand', 'Süßigkeiten'], j: 0, w: 'Mit Sonnenlicht, Wasser und Luft macht eine Pflanze ihre eigene Nahrung.' },
  { o: 'Lichaam', v: 'Wie viele Milchzähne hat ein Kind?', a: ['10', '20', '40'], j: 1, w: 'Ein Kind hat 20 Milchzähne. Ein Erwachsener hat später meistens 32 Zähne.' },
  { o: 'Dieren', v: 'Welches Tier schläft kopfüber?', a: ['die Fledermaus', 'die Eule', 'die Katze'], j: 0, w: 'Eine Fledermaus hängt mit den Füßen kopfüber. So kann sie sofort losfliegen.' },
  { o: 'Geschiedenis', v: 'Wo wohnte ein Ritter oft?', a: ['in einer Burg', 'in einem Iglu', 'in einem Hochhaus'], j: 0, w: 'Eine Burg hatte dicke Mauern, Türme und manchmal einen Graben voller Wasser rundherum.' },
  { o: 'Natuur', v: 'Was wird aus einer Raupe?', a: ['ein Schmetterling', 'ein Käfer', 'eine Schnecke'], j: 0, w: 'Eine Raupe spinnt einen Kokon und verwandelt sich darin in einen Schmetterling. Das nennt man Metamorphose.' },
  { o: 'Ruimte', v: 'Was ist die Sonne?', a: ['ein Stern', 'ein Planet', 'ein Mond'], j: 0, w: 'Die Sonne ist ein Stern. Sie sieht größer aus als andere Sterne, weil sie uns viel näher ist.' },
  { o: 'Dieren', v: 'Welches Tier hat einen Rüssel?', a: ['der Elefant', 'das Nashorn', 'das Nilpferd'], j: 0, w: 'Mit seinem Rüssel kann ein Elefant riechen, trinken, Dinge aufheben und sogar duschen.' },
  { o: 'Techniek', v: 'Was zieht ein Magnet an?', a: ['Eisen', 'Holz', 'Plastik'], j: 0, w: 'Ein Magnet zieht Eisen an. Holz, Plastik oder Papier zieht er nicht an.' },
  { o: 'Natuur', v: 'Warum verlieren viele Bäume im Herbst ihre Blätter?', a: ['um Wasser und Energie für den Winter zu sparen', 'weil der Wind böse ist', 'weil die Blätter müde sind'], j: 0, w: 'Im Winter gibt es wenig Licht und das Wasser gefriert. Ohne Blätter verliert der Baum weniger Wasser.' },
  { o: 'Dieren', v: 'Wie atmet ein Fisch unter Wasser?', a: ['mit Kiemen', 'mit Lungen, genau wie wir', 'durch seinen Schwanz'], j: 0, w: 'Ein Fisch holt mit seinen Kiemen Sauerstoff aus dem Wasser.' },
  { o: 'Uitvindingen', v: 'Womit haben Menschen einander angerufen, bevor es Handys gab?', a: ['mit einem Festnetztelefon', 'mit einem Fernseher', 'mit einem Radio'], j: 0, w: 'Das Telefon wurde 1876 vorgestellt. Am Anfang hing es an der Wand, mit einem Kabel.' },
];

const SCHILDKNAAP = [
  { o: 'Ruimte', v: 'Welcher Planet ist der größte in unserem Sonnensystem?', a: ['die Erde', 'Jupiter', 'Saturn', 'Mars'], j: 1, w: 'Jupiter ist so groß, dass mehr als 1.300 Erden hineinpassen würden.' },
  { o: 'Dieren', v: 'Welches Landtier ist am schnellsten?', a: ['der Gepard', 'der Löwe', 'das Pferd', 'der Strauß'], j: 0, w: 'Ein Gepard schafft ungefähr 100 km pro Stunde, aber nur für eine kurze Strecke.' },
  { o: 'Uitvindingen', v: 'Wer machte um 1450 den Buchdruck mit beweglichen Lettern in Europa bekannt?', a: ['Johannes Gutenberg', 'Thomas Edison', 'Albert Einstein', 'Napoleon'], j: 0, w: 'Dank des Buchdrucks mussten Bücher nicht mehr von Hand abgeschrieben werden. So konnten viel mehr Menschen lesen.' },
  { o: 'Geschiedenis', v: 'Wie hießen die Soldaten des römischen Heeres?', a: ['Legionäre', 'Ritter', 'Samurai', 'Wikinger'], j: 0, w: 'Römische Legionäre marschierten manchmal mehr als 30 km am Tag, mit ihrer ganzen Ausrüstung auf dem Rücken.' },
  { o: 'Natuur', v: 'Welcher ist der größte Ozean?', a: ['der Atlantische Ozean', 'der Pazifische Ozean', 'der Indische Ozean', 'das Nordpolarmeer'], j: 1, w: 'Der Pazifische Ozean ist größer als alles Land der Erde zusammen.' },
  { o: 'Lichaam', v: 'Welches Organ pumpt das Blut durch deinen Körper?', a: ['das Herz', 'die Lunge', 'der Magen', 'die Leber'], j: 0, w: 'Dein Herz schlägt ungefähr 100.000-mal am Tag, auch wenn du schläfst.' },
  { o: 'Ruimte', v: 'Wie lange braucht die Erde, um einmal um die Sonne zu kreisen?', a: ['einen Tag', 'einen Monat', 'ein Jahr', 'zehn Jahre'], j: 2, w: 'Eine Runde um die Sonne dauert ungefähr 365 Tage: ein Jahr.' },
  { o: 'Dieren', v: 'Was frisst ein Großer Panda vor allem?', a: ['Bambus', 'Fisch', 'Gras', 'Obst'], j: 0, w: 'Ein Panda frisst bis zu 12 Stunden am Tag Bambus, weil darin wenig Nährstoffe stecken.' },
  { o: 'Techniek', v: 'Was verwandelt ein Windrad in Strom?', a: ['die Kraft des Windes', 'Sonnenlicht', 'Kohle', 'Regen'], j: 0, w: 'Der Wind dreht die Flügel. Ein Generator im Windrad macht daraus Strom.' },
  { o: 'Geschiedenis', v: 'Welche belgische Stadt ist berühmt für ihren Belfried und ihre Kanäle?', a: ['Brügge', 'Lüttich', 'Hasselt', 'Arlon'], j: 0, w: 'Im Mittelalter war Brügge eine der reichsten Handelsstädte Europas.' },
  { o: 'Natuur', v: 'Bei welcher Temperatur gefriert Wasser?', a: ['0 °C', '10 °C', '100 °C', '-50 °C'], j: 0, w: 'Wasser gefriert bei 0 °C und kocht bei 100 °C.' },
  { o: 'Ruimte', v: 'Wer betrat 1969 als erster Mensch den Mond?', a: ['Neil Armstrong', 'Juri Gagarin', 'Christoph Kolumbus', 'Albert Einstein'], j: 0, w: 'Sein Fußabdruck ist wahrscheinlich immer noch da: Auf dem Mond gibt es keinen Wind.' },
  { o: 'Dieren', v: 'Welches Säugetier kann wirklich fliegen?', a: ['die Fledermaus', 'das Gleithörnchen', 'der Pinguin', 'der Strauß'], j: 0, w: 'Die Fledermaus ist das einzige Säugetier, das wirklich fliegt. Ein Gleithörnchen gleitet nur.' },
  { o: 'Lichaam', v: 'Wie viele Knochen hat ein Erwachsener ungefähr?', a: ['ungefähr 50', 'ungefähr 206', 'ungefähr 1.000', 'ungefähr 12'], j: 1, w: 'Ein Baby hat mehr, ungefähr 300. Einige davon wachsen später zusammen.' },
  { o: 'Ruimte', v: 'Warum siehst du den Mond manchmal als Halbmond?', a: ['wir sehen nur einen Teil der Seite, die die Sonne beleuchtet', 'der Mond ist dann wirklich kaputt', 'eine Wolke ist davor', 'die Erde beißt ein Stück ab'], j: 0, w: 'Der Mond gibt kein eigenes Licht. Er wirft das Licht der Sonne zurück.' },
];

const RIDDER = [
  { o: 'Ruimte', v: 'Wie lange braucht das Sonnenlicht bis zur Erde?', a: ['ungefähr 8 Sekunden', 'ungefähr 8 Minuten', 'ungefähr 8 Stunden', 'ungefähr 8 Tage'], j: 1, w: 'Licht legt 300.000 km pro Sekunde zurück. Trotzdem dauert der Weg von der Sonne zu uns ungefähr 8 Minuten.' },
  { o: 'Natuur', v: 'Welches Gas nehmen Pflanzen aus der Luft, um Nahrung zu machen?', a: ['Sauerstoff', 'Kohlendioxid', 'Stickstoff', 'Helium'], j: 1, w: 'Pflanzen nehmen Kohlendioxid auf und geben Sauerstoff ab. Das nennt man Fotosynthese.' },
  { o: 'Geschiedenis', v: 'In welchem Jahr wurde Belgien ein unabhängiges Land?', a: ['1815', '1830', '1914', '1958'], j: 1, w: '1830 löste sich Belgien vom Vereinigten Königreich der Niederlande. 1831 kam der erste König, Leopold I.' },
  { o: 'Uitvindingen', v: 'Was entdeckte Alexander Fleming 1928?', a: ['Penicillin', 'Elektrizität', 'das Telefon', 'Röntgenstrahlen'], j: 0, w: 'Fleming sah, dass ein Schimmelpilz Bakterien tötete. So entstand das erste Antibiotikum.' },
  { o: 'Dieren', v: 'Wie viele Herzen hat ein Oktopus?', a: ['eins', 'zwei', 'drei', 'acht'], j: 2, w: 'Ein Oktopus hat drei Herzen und blaues Blut.' },
  { o: 'Techniek', v: 'Warum ist Kupferdraht in einem Stromkabel?', a: ['Kupfer leitet Strom sehr gut', 'Kupfer ist schön glänzend', 'Kupfer hält Strom auf', 'Kupfer ist magnetisch'], j: 0, w: 'Kupfer leitet Strom gut. Das Plastik darum ist ein Isolator: Es schützt dich.' },
  { o: 'Ruimte', v: 'Welcher Planet ist der Sonne am nächsten?', a: ['Merkur', 'Venus', 'die Erde', 'Mars'], j: 0, w: 'Auf dem Merkur ist es tagsüber mehr als 400 °C heiß und nachts kälter als -170 °C.' },
  { o: 'Geschiedenis', v: 'Welcher Maler schuf zusammen mit seinem Bruder den Genter Altar?', a: ['Jan van Eyck', 'Peter Paul Rubens', 'René Magritte', 'Pieter Bruegel'], j: 0, w: 'Der Genter Altar wurde 1432 fertig und ist eines der berühmtesten Gemälde der Welt.' },
  { o: 'Natuur', v: 'Was misst ein Barometer?', a: ['den Luftdruck', 'die Temperatur', 'die Windgeschwindigkeit', 'wie viel Regen fällt'], j: 0, w: 'Wenn der Luftdruck schnell sinkt, kommt oft schlechtes Wetter.' },
  { o: 'Lichaam', v: 'Was transportieren deine roten Blutkörperchen?', a: ['Sauerstoff', 'Nahrung zu deinem Magen', 'Schall', 'Kalk für deine Knochen'], j: 0, w: 'Rote Blutkörperchen bringen Sauerstoff von deiner Lunge in jeden Teil deines Körpers.' },
  { o: 'Uitvindingen', v: 'Wer machte die Glühbirne um 1879 für normale Haushalte brauchbar?', a: ['Thomas Edison', 'Isaac Newton', 'Leonardo da Vinci', 'Marie Curie'], j: 0, w: 'Auch andere arbeiteten an der Glühbirne, aber Edison baute eine, die lange brannte.' },
  { o: 'Dieren', v: 'Warum hat ein Eisbär unter seinem weißen Fell schwarze Haut?', a: ['schwarze Haut nimmt die Wärme der Sonne gut auf', 'um sich nachts zu verstecken', 'weil er schmutzig ist', 'um Fische anzulocken'], j: 0, w: 'Die Haare eines Eisbären sind eigentlich durchsichtig. Sie sehen durch das Licht weiß aus.' },
  { o: 'Ruimte', v: 'Was ist ein Lichtjahr?', a: ['eine Entfernung', 'eine Zeit', 'eine Geschwindigkeit', 'ein Stern'], j: 0, w: 'Ein Lichtjahr ist die Strecke, die Licht in einem Jahr zurücklegt: fast 10 Billionen Kilometer.' },
  { o: 'Techniek', v: 'Warum schwimmt ein schweres Stahlschiff?', a: ['es schiebt viel Wasser zur Seite und ist innen größtenteils hohl', 'Stahl schwimmt immer', 'die Motoren halten es oben', 'Meerwasser ist klebrig'], j: 0, w: 'Ein Gegenstand schwimmt, wenn er mehr Wasser zur Seite schiebt, als er selbst wiegt. Das entdeckte Archimedes.' },
  { o: 'Geschiedenis', v: 'Welche Erfindung von ungefähr 3500 v. Chr. machte den Transport viel leichter?', a: ['das Rad', 'die Dampfmaschine', 'das Fahrrad', 'der Zug'], j: 0, w: 'Die ersten Räder waren aus einem Stück Holz. Später kamen Speichen dazu, so wurden sie leichter.' },
];

// Was du im Labor entdeckst, pro Versuch. Nach jedem gelösten Versuch kommt einer davon in dein Entdeckerbuch.
const LABO = {
  stroom: [
    'Strom fließt nur, wenn der Stromkreis ganz geschlossen ist. Eine Lücke, und die Lampe geht aus.',
    'Metalle wie Kupfer leiten Strom gut. Plastik, Holz und Gummi nicht: Das sind Isolatoren.',
    'Ein Schalter öffnet oder schließt den Stromkreis. So schaltest du eine Lampe an und aus.',
    'Um 1800 baute Alessandro Volta die erste Batterie, mit Scheiben aus Metall und Pappe in Salzwasser.',
  ],
  tandwiel: [
    'Zwei Zahnräder, die ineinandergreifen, drehen sich immer in entgegengesetzte Richtungen.',
    'Ein kleines Zahnrad dreht sich schneller als ein großes. Hat das große Rad dreimal so viele Zähne, dreht sich das kleine dreimal so oft.',
    'Beim Fahrrad arbeiten die Zahnräder mit einer Kette: ein großes Zahnrad vorne und ein kleines hinten machen dich schnell.',
    'Alte Turmuhren sind voller Zahnräder. So dreht sich der Stundenzeiger zwölfmal langsamer als der Minutenzeiger.',
  ],
  wip: [
    'Mit einem Hebel hebst du etwas Schweres mit weniger Kraft.',
    'Je weiter etwas vom Drehpunkt entfernt ist, desto mehr Kraft gibt es. Darum kann ein Kind auf der Wippe einen Erwachsenen hochheben.',
    'Archimedes sagte: „Gib mir einen Punkt, wo ich stehen kann, und ich hebe die Erde.“ Er meinte einen sehr langen Hebel.',
    'Eine Schere, ein Nussknacker und eine Schubkarre sind auch Hebel.',
  ],
  drijven: [
    'Etwas schwimmt, wenn es leichter ist als die gleiche Menge Wasser. Kork und Holz sind leichter als Wasser, Eisen und Stein schwerer.',
    'Eine Kugel aus Knete sinkt, aber machst du ein Bötchen daraus, schwimmt es: Es schiebt mehr Wasser zur Seite.',
    'In Salzwasser schwimmst du leichter als in Süßwasser. Im Toten Meer kannst du fast auf dem Wasser sitzen.',
    'Eine Orange mit Schale schwimmt dank der Luftbläschen in der Schale. Ohne Schale sinkt sie.',
  ],
  thermo: [
    'Wasser gefriert bei 0 Grad und kocht bei 100 Grad. Darauf ist die Celsius-Skala aufgebaut.',
    'Unter null schreibst du ein Minus: -5 Grad ist 5 Grad kälter als 0.',
    'Der Unterschied zwischen -3 und 4 Grad ist 7 Grad: 3 bis null und dann noch 4.',
    'Dein Körper ist ungefähr 37 Grad warm. Ab 38 Grad hast du Fieber.',
  ],
};

module.exports = { PAGE, SCHILDKNAAP, RIDDER, LABO };
