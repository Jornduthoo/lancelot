// Les faits intégrés du monde de la découverte en français (utilisé à la place de ontdek-inhoud.js quand l’enseignant choisit le français).
// { o: sujet, v: question, a: choix, j: position de la bonne réponse, w: le fait qui va dans le carnet d’explorateur }.
// Les sujets (o) restent en néerlandais : ce sont des clés ; l’écran les traduit.

const PAGE = [
  { o: 'Dieren', v: 'Quel animal est le plus grand animal du monde ?', a: ['l’éléphant', 'la baleine bleue', 'la girafe'], j: 1, w: 'La baleine bleue peut mesurer plus de 30 mètres : plus long que deux bus à la suite.' },
  { o: 'Dieren', v: 'Combien de pattes a une araignée ?', a: ['six', 'huit', 'dix'], j: 1, w: 'Une araignée a huit pattes. Les insectes en ont six, donc une araignée n’est pas un insecte.' },
  { o: 'Ruimte', v: 'Quelle planète appelle-t-on la planète rouge ?', a: ['Mars', 'Vénus', 'Jupiter'], j: 0, w: 'Mars est rouge à cause de la rouille dans son sol : il contient beaucoup de fer.' },
  { o: 'Ruimte', v: 'Qu’est-ce qui tourne autour de la Terre ?', a: ['le Soleil', 'la Lune', 'Mars'], j: 1, w: 'La Lune fait le tour de la Terre en environ un mois.' },
  { o: 'Natuur', v: 'De quoi une plante a-t-elle besoin pour pousser ?', a: ['de lumière et d’eau', 'seulement de sable', 'de bonbons'], j: 0, w: 'Avec la lumière du soleil, l’eau et l’air, une plante fabrique sa propre nourriture.' },
  { o: 'Lichaam', v: 'Combien de dents de lait a un enfant ?', a: ['10', '20', '40'], j: 1, w: 'Un enfant a 20 dents de lait. Un adulte en a ensuite généralement 32.' },
  { o: 'Dieren', v: 'Quel animal dort la tête en bas ?', a: ['la chauve-souris', 'le hibou', 'le chat'], j: 0, w: 'Une chauve-souris se suspend par les pieds, la tête en bas. Ainsi, elle peut s’envoler tout de suite.' },
  { o: 'Geschiedenis', v: 'Où vivait souvent un chevalier ?', a: ['dans un château', 'dans un igloo', 'dans un immeuble'], j: 0, w: 'Un château avait des murs épais, des tours et parfois des douves pleines d’eau autour.' },
  { o: 'Natuur', v: 'Que devient une chenille plus tard ?', a: ['un papillon', 'un scarabée', 'un escargot'], j: 0, w: 'Une chenille fabrique un cocon et s’y transforme en papillon. On appelle ça la métamorphose.' },
  { o: 'Ruimte', v: 'Qu’est-ce que le Soleil ?', a: ['une étoile', 'une planète', 'une lune'], j: 0, w: 'Le Soleil est une étoile. Il paraît plus grand que les autres étoiles parce qu’il est beaucoup plus près de nous.' },
  { o: 'Dieren', v: 'Quel animal a une trompe ?', a: ['l’éléphant', 'le rhinocéros', 'l’hippopotame'], j: 0, w: 'Avec sa trompe, un éléphant peut sentir, boire, ramasser des choses et même prendre une douche.' },
  { o: 'Techniek', v: 'Qu’est-ce qu’un aimant attire ?', a: ['le fer', 'le bois', 'le plastique'], j: 0, w: 'Un aimant attire le fer. Il n’attire pas le bois, le plastique ni le papier.' },
  { o: 'Natuur', v: 'Pourquoi beaucoup d’arbres perdent-ils leurs feuilles en automne ?', a: ['pour économiser l’eau et l’énergie pour l’hiver', 'parce que le vent est fâché', 'parce que les feuilles sont fatiguées'], j: 0, w: 'En hiver, il y a peu de lumière et l’eau gèle. Sans feuilles, l’arbre perd moins d’eau.' },
  { o: 'Dieren', v: 'Comment un poisson respire-t-il sous l’eau ?', a: ['avec des branchies', 'avec des poumons, comme nous', 'par sa queue'], j: 0, w: 'Un poisson prend l’oxygène de l’eau avec ses branchies.' },
  { o: 'Uitvindingen', v: 'Qu’utilisait-on pour s’appeler avant les téléphones portables ?', a: ['un téléphone fixe', 'une télévision', 'une radio'], j: 0, w: 'Le téléphone a été présenté en 1876. Au début, il était accroché au mur, avec un fil.' },
];

const SCHILDKNAAP = [
  { o: 'Ruimte', v: 'Quelle est la plus grande planète de notre système solaire ?', a: ['la Terre', 'Jupiter', 'Saturne', 'Mars'], j: 1, w: 'Jupiter est si grande que plus de 1 300 Terres pourraient y entrer.' },
  { o: 'Dieren', v: 'Quel animal terrestre est le plus rapide ?', a: ['le guépard', 'le lion', 'le cheval', 'l’autruche'], j: 0, w: 'Un guépard atteint environ 100 km à l’heure, mais seulement sur une courte distance.' },
  { o: 'Uitvindingen', v: 'Qui a fait connaître l’imprimerie à caractères mobiles en Europe vers 1450 ?', a: ['Johannes Gutenberg', 'Thomas Edison', 'Albert Einstein', 'Napoléon'], j: 0, w: 'Grâce à l’imprimerie, les livres ne devaient plus être recopiés à la main. Beaucoup plus de gens ont pu lire.' },
  { o: 'Geschiedenis', v: 'Comment appelait-on les soldats de l’armée romaine ?', a: ['les légionnaires', 'les chevaliers', 'les samouraïs', 'les Vikings'], j: 0, w: 'Les légionnaires romains marchaient parfois plus de 30 km par jour, avec tout leur équipement sur le dos.' },
  { o: 'Natuur', v: 'Quel est le plus grand océan ?', a: ['l’océan Atlantique', 'l’océan Pacifique', 'l’océan Indien', 'l’océan Arctique'], j: 1, w: 'L’océan Pacifique est plus grand que toutes les terres de la planète réunies.' },
  { o: 'Lichaam', v: 'Quel organe pompe le sang dans ton corps ?', a: ['le cœur', 'les poumons', 'l’estomac', 'le foie'], j: 0, w: 'Ton cœur bat environ 100 000 fois par jour, même quand tu dors.' },
  { o: 'Ruimte', v: 'Combien de temps la Terre met-elle pour faire une fois le tour du Soleil ?', a: ['un jour', 'un mois', 'un an', 'dix ans'], j: 2, w: 'Un tour du Soleil dure environ 365 jours : une année.' },
  { o: 'Dieren', v: 'Que mange surtout un panda géant ?', a: ['du bambou', 'du poisson', 'de l’herbe', 'des fruits'], j: 0, w: 'Un panda mange du bambou jusqu’à 12 heures par jour, car il y a peu de nourriture dedans.' },
  { o: 'Techniek', v: 'Qu’est-ce qu’une éolienne transforme en électricité ?', a: ['la force du vent', 'la lumière du soleil', 'le charbon', 'la pluie'], j: 0, w: 'Le vent fait tourner les pales. Un générateur dans l’éolienne transforme ce mouvement en électricité.' },
  { o: 'Geschiedenis', v: 'Quelle ville belge est célèbre pour son beffroi et ses canaux ?', a: ['Bruges', 'Liège', 'Hasselt', 'Arlon'], j: 0, w: 'Au Moyen Âge, Bruges était l’une des villes commerçantes les plus riches d’Europe.' },
  { o: 'Natuur', v: 'À quelle température l’eau gèle-t-elle ?', a: ['0 °C', '10 °C', '100 °C', '-50 °C'], j: 0, w: 'L’eau gèle à 0 °C et bout à 100 °C.' },
  { o: 'Ruimte', v: 'Qui a été la première personne à marcher sur la Lune, en 1969 ?', a: ['Neil Armstrong', 'Youri Gagarine', 'Christophe Colomb', 'Albert Einstein'], j: 0, w: 'Son empreinte de pas y est probablement encore : il n’y a pas de vent sur la Lune.' },
  { o: 'Dieren', v: 'Quel mammifère peut vraiment voler ?', a: ['la chauve-souris', 'l’écureuil volant', 'le manchot', 'l’autruche'], j: 0, w: 'La chauve-souris est le seul mammifère qui vole vraiment. Un écureuil volant ne fait que planer.' },
  { o: 'Lichaam', v: 'Environ combien d’os a un adulte ?', a: ['environ 50', 'environ 206', 'environ 1 000', 'environ 12'], j: 1, w: 'Un bébé en a plus, environ 300. Certains se soudent ensuite.' },
  { o: 'Ruimte', v: 'Pourquoi vois-tu parfois la Lune en demi-lune ?', a: ['on ne voit qu’une partie du côté éclairé par le Soleil', 'la Lune est alors vraiment cassée', 'un nuage est devant', 'la Terre en croque un morceau'], j: 0, w: 'La Lune ne produit pas de lumière. Elle renvoie la lumière du Soleil.' },
];

const RIDDER = [
  { o: 'Ruimte', v: 'Combien de temps la lumière du Soleil met-elle pour arriver sur Terre ?', a: ['environ 8 secondes', 'environ 8 minutes', 'environ 8 heures', 'environ 8 jours'], j: 1, w: 'La lumière parcourt 300 000 km par seconde. Pourtant, le trajet du Soleil jusqu’à nous dure environ 8 minutes.' },
  { o: 'Natuur', v: 'Quel gaz les plantes prennent-elles dans l’air pour fabriquer leur nourriture ?', a: ['l’oxygène', 'le dioxyde de carbone', 'l’azote', 'l’hélium'], j: 1, w: 'Les plantes absorbent du dioxyde de carbone et rejettent de l’oxygène. On appelle ça la photosynthèse.' },
  { o: 'Geschiedenis', v: 'En quelle année la Belgique est-elle devenue un pays indépendant ?', a: ['1815', '1830', '1914', '1958'], j: 1, w: 'En 1830, la Belgique s’est séparée du Royaume-Uni des Pays-Bas. En 1831 est arrivé le premier roi, Léopold Ier.' },
  { o: 'Uitvindingen', v: 'Qu’a découvert Alexander Fleming en 1928 ?', a: ['la pénicilline', 'l’électricité', 'le téléphone', 'les rayons X'], j: 0, w: 'Fleming a vu qu’une moisissure tuait des bactéries. C’est ainsi qu’est né le premier antibiotique.' },
  { o: 'Dieren', v: 'Combien de cœurs a une pieuvre ?', a: ['un', 'deux', 'trois', 'huit'], j: 2, w: 'Une pieuvre a trois cœurs et du sang bleu.' },
  { o: 'Techniek', v: 'Pourquoi y a-t-il du fil de cuivre dans un câble électrique ?', a: ['le cuivre conduit très bien l’électricité', 'le cuivre est joli et brillant', 'le cuivre arrête l’électricité', 'le cuivre est magnétique'], j: 0, w: 'Le cuivre conduit bien l’électricité. Le plastique autour est un isolant : il te protège.' },
  { o: 'Ruimte', v: 'Quelle planète est la plus proche du Soleil ?', a: ['Mercure', 'Vénus', 'la Terre', 'Mars'], j: 0, w: 'Sur Mercure, il fait plus de 400 °C le jour et moins de -170 °C la nuit.' },
  { o: 'Geschiedenis', v: 'Quel peintre a réalisé L’Agneau mystique de Gand avec son frère ?', a: ['Jan van Eyck', 'Pierre Paul Rubens', 'René Magritte', 'Pieter Bruegel'], j: 0, w: 'L’Agneau mystique a été terminé en 1432 et c’est l’un des tableaux les plus célèbres du monde.' },
  { o: 'Natuur', v: 'Que mesure un baromètre ?', a: ['la pression de l’air', 'la température', 'la vitesse du vent', 'la quantité de pluie'], j: 0, w: 'Quand la pression de l’air baisse vite, le mauvais temps arrive souvent.' },
  { o: 'Lichaam', v: 'Que transportent tes globules rouges ?', a: ['de l’oxygène', 'de la nourriture vers l’estomac', 'du son', 'du calcium pour tes os'], j: 0, w: 'Les globules rouges transportent l’oxygène des poumons vers toutes les parties du corps.' },
  { o: 'Uitvindingen', v: 'Qui a rendu l’ampoule utilisable dans les maisons vers 1879 ?', a: ['Thomas Edison', 'Isaac Newton', 'Léonard de Vinci', 'Marie Curie'], j: 0, w: 'D’autres ont aussi travaillé sur l’ampoule, mais Edison en a fait une qui brûlait longtemps.' },
  { o: 'Dieren', v: 'Pourquoi un ours polaire a-t-il la peau noire sous sa fourrure blanche ?', a: ['la peau noire absorbe bien la chaleur du soleil', 'pour se cacher la nuit', 'parce qu’il est sale', 'pour attirer les poissons'], j: 0, w: 'Les poils d’un ours polaire sont en fait transparents. Ils paraissent blancs à cause de la lumière.' },
  { o: 'Ruimte', v: 'Qu’est-ce qu’une année-lumière ?', a: ['une distance', 'une durée', 'une vitesse', 'une étoile'], j: 0, w: 'Une année-lumière est la distance que la lumière parcourt en un an : presque 10 000 milliards de kilomètres.' },
  { o: 'Techniek', v: 'Pourquoi un lourd navire en acier flotte-t-il ?', a: ['il déplace beaucoup d’eau et il est surtout creux à l’intérieur', 'l’acier flotte toujours', 'les moteurs le soutiennent', 'l’eau de mer est collante'], j: 0, w: 'Un objet flotte quand il déplace plus d’eau que son propre poids. C’est Archimède qui l’a découvert.' },
  { o: 'Geschiedenis', v: 'Quelle invention d’environ 3500 av. J.-C. a rendu le transport beaucoup plus facile ?', a: ['la roue', 'la machine à vapeur', 'le vélo', 'le train'], j: 0, w: 'Les premières roues étaient faites d’une seule pièce de bois. Plus tard, on a ajouté des rayons pour les alléger.' },
];

// Ce que tu découvres au labo, par expérience. Après chaque expérience réussie, un fait va dans ton carnet d’explorateur.
const LABO = {
  stroom: [
    'Le courant ne circule que si le circuit est complètement fermé. Une seule coupure et la lampe s’éteint.',
    'Les métaux comme le cuivre conduisent bien l’électricité. Le plastique, le bois et le caoutchouc non : ce sont des isolants.',
    'Un interrupteur ouvre ou ferme le circuit. C’est ainsi qu’on allume et éteint une lampe.',
    'Vers 1800, Alessandro Volta a fabriqué la première pile, avec des disques de métal et de carton dans de l’eau salée.',
  ],
  tandwiel: [
    'Deux engrenages qui s’emboîtent tournent toujours dans des sens opposés.',
    'Un petit engrenage tourne plus vite qu’un grand. Si le grand a trois fois plus de dents, le petit fait trois fois plus de tours.',
    'Sur un vélo, les engrenages fonctionnent avec une chaîne : un grand plateau devant et un petit pignon derrière te rendent rapide.',
    'Les vieilles horloges des tours sont pleines d’engrenages. C’est ainsi que l’aiguille des heures tourne douze fois moins vite que celle des minutes.',
  ],
  wip: [
    'Avec un levier, tu soulèves quelque chose de lourd avec moins de force.',
    'Plus une chose est loin du point d’appui, plus elle donne de force. C’est pourquoi un enfant peut soulever un adulte sur la balançoire.',
    'Archimède a dit : « Donnez-moi un point d’appui, et je soulèverai la Terre. » Il parlait d’un très long levier.',
    'Les ciseaux, un casse-noix et une brouette sont aussi des leviers.',
  ],
  drijven: [
    'Une chose flotte quand elle est plus légère que la même quantité d’eau. Le liège et le bois sont plus légers que l’eau, le fer et la pierre plus lourds.',
    'Une boule de pâte à modeler coule, mais si tu en fais un petit bateau, elle flotte : elle déplace plus d’eau.',
    'On flotte plus facilement dans l’eau salée que dans l’eau douce. Dans la mer Morte, on peut presque s’asseoir sur l’eau.',
    'Une orange avec sa peau flotte grâce aux bulles d’air dans la peau. Sans la peau, elle coule.',
  ],
  thermo: [
    'L’eau gèle à 0 degré et bout à 100 degrés. L’échelle Celsius est construite là-dessus.',
    'Sous zéro, on écrit un moins : -5 degrés, c’est 5 degrés plus froid que 0.',
    'La différence entre -3 et 4 degrés est de 7 degrés : 3 jusqu’à zéro, puis encore 4.',
    'Ton corps est à environ 37 degrés. À 38 degrés ou plus, tu as de la fièvre.',
  ],
};

module.exports = { PAGE, SCHILDKNAAP, RIDDER, LABO };
