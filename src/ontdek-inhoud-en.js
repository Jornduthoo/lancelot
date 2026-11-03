// The built-in facts of the discovery world in English (used instead of ontdek-inhoud.js when the teacher chooses English).
// { o: topic, v: question, a: choices, j: position of the right answer, w: the fact that goes into the explorer's book }.
// The topics (o) stay in Dutch: they are keys; the screen translates them.

const PAGE = [
  { o: 'Dieren', v: 'Which animal is the biggest animal in the world?', a: ['the elephant', 'the blue whale', 'the giraffe'], j: 1, w: 'The blue whale can grow to more than 30 metres long: longer than two buses in a row.' },
  { o: 'Dieren', v: 'How many legs does a spider have?', a: ['six', 'eight', 'ten'], j: 1, w: 'A spider has eight legs. Insects have six, so a spider is not an insect.' },
  { o: 'Ruimte', v: 'Which planet do we call the red planet?', a: ['Mars', 'Venus', 'Jupiter'], j: 0, w: 'Mars is red because of rust in the ground: it contains a lot of iron.' },
  { o: 'Ruimte', v: 'What goes round the Earth?', a: ['the Sun', 'the Moon', 'Mars'], j: 1, w: 'The Moon goes round the Earth once in about a month.' },
  { o: 'Natuur', v: 'What does a plant need to grow?', a: ['light and water', 'only sand', 'sweets'], j: 0, w: 'With sunlight, water and air a plant makes its own food.' },
  { o: 'Lichaam', v: 'How many baby teeth does a child have?', a: ['10', '20', '40'], j: 1, w: 'A child has 20 baby teeth. An adult usually has 32 later on.' },
  { o: 'Dieren', v: 'Which animal sleeps upside down?', a: ['the bat', 'the owl', 'the cat'], j: 0, w: 'A bat hangs upside down by its feet. That way it can fly away at once.' },
  { o: 'Geschiedenis', v: 'Where did a knight often live?', a: ['in a castle', 'in an igloo', 'in a block of flats'], j: 0, w: 'A castle had thick walls, towers and sometimes a moat full of water around it.' },
  { o: 'Natuur', v: 'What does a caterpillar become later?', a: ['a butterfly', 'a beetle', 'a snail'], j: 0, w: 'A caterpillar makes a cocoon and changes into a butterfly inside it. That is called metamorphosis.' },
  { o: 'Ruimte', v: 'What is the Sun?', a: ['a star', 'a planet', 'a moon'], j: 0, w: 'The Sun is a star. It looks bigger than other stars because it is much closer to us.' },
  { o: 'Dieren', v: 'Which animal has a trunk?', a: ['the elephant', 'the rhino', 'the hippo'], j: 0, w: 'With its trunk an elephant can smell, drink, pick things up and even take a shower.' },
  { o: 'Techniek', v: 'What does a magnet attract?', a: ['iron', 'wood', 'plastic'], j: 0, w: 'A magnet attracts iron. It does not attract wood, plastic or paper.' },
  { o: 'Natuur', v: 'Why do many trees lose their leaves in autumn?', a: ['to save water and energy for the winter', 'because the wind is angry', 'because the leaves are tired'], j: 0, w: 'In winter there is little light and water freezes. Without leaves the tree loses less water.' },
  { o: 'Dieren', v: 'How does a fish breathe under water?', a: ['with gills', 'with lungs, just like us', 'through its tail'], j: 0, w: 'A fish takes oxygen out of the water with its gills.' },
  { o: 'Uitvindingen', v: 'What did people use to call each other before there were mobile phones?', a: ['a landline telephone', 'a television', 'a radio'], j: 0, w: 'The telephone was presented in 1876. At first it hung on the wall, with a wire.' },
];

const SCHILDKNAAP = [
  { o: 'Ruimte', v: 'Which planet is the biggest in our solar system?', a: ['the Earth', 'Jupiter', 'Saturn', 'Mars'], j: 1, w: 'Jupiter is so big that more than 1,300 Earths would fit inside it.' },
  { o: 'Dieren', v: 'Which land animal is the fastest?', a: ['the cheetah', 'the lion', 'the horse', 'the ostrich'], j: 0, w: 'A cheetah reaches about 100 km per hour, but only keeps it up for a short distance.' },
  { o: 'Uitvindingen', v: 'Who made printing with movable type well known in Europe around 1450?', a: ['Johannes Gutenberg', 'Thomas Edison', 'Albert Einstein', 'Napoleon'], j: 0, w: 'Thanks to the printing press, books no longer had to be copied by hand. That way many more people could read.' },
  { o: 'Geschiedenis', v: 'What were the soldiers of the Roman army called?', a: ['legionaries', 'knights', 'samurai', 'Vikings'], j: 0, w: 'Roman legionaries sometimes marched more than 30 km a day, carrying all their equipment on their backs.' },
  { o: 'Natuur', v: 'What is the biggest ocean?', a: ['the Atlantic Ocean', 'the Pacific Ocean', 'the Indian Ocean', 'the Arctic Ocean'], j: 1, w: 'The Pacific Ocean is bigger than all the land on Earth put together.' },
  { o: 'Lichaam', v: 'Which organ pumps the blood through your body?', a: ['the heart', 'the lungs', 'the stomach', 'the liver'], j: 0, w: 'Your heart beats about 100,000 times a day, even when you are asleep.' },
  { o: 'Ruimte', v: 'How long does the Earth take to go round the Sun once?', a: ['a day', 'a month', 'a year', 'ten years'], j: 2, w: 'One trip round the Sun takes about 365 days: one year.' },
  { o: 'Dieren', v: 'What does a giant panda mainly eat?', a: ['bamboo', 'fish', 'grass', 'fruit'], j: 0, w: 'A panda eats bamboo for up to 12 hours a day, because there is little nourishment in it.' },
  { o: 'Techniek', v: 'What does a wind turbine turn into electricity?', a: ['the power of the wind', 'sunlight', 'coal', 'rain'], j: 0, w: 'The wind turns the blades. A generator inside the turbine turns that into electricity.' },
  { o: 'Geschiedenis', v: 'Which Belgian city is famous for its Belfry and its canals?', a: ['Bruges', 'Liège', 'Hasselt', 'Arlon'], j: 0, w: 'In the Middle Ages Bruges was one of the richest trading cities in Europe.' },
  { o: 'Natuur', v: 'At what temperature does water freeze?', a: ['0 °C', '10 °C', '100 °C', '-50 °C'], j: 0, w: 'Water freezes at 0 °C and boils at 100 °C.' },
  { o: 'Ruimte', v: 'Who was the first person to set foot on the Moon, in 1969?', a: ['Neil Armstrong', 'Yuri Gagarin', 'Christopher Columbus', 'Albert Einstein'], j: 0, w: 'His footprint is probably still there: there is no wind on the Moon.' },
  { o: 'Dieren', v: 'Which mammal can really fly?', a: ['the bat', 'the flying squirrel', 'the penguin', 'the ostrich'], j: 0, w: 'The bat is the only mammal that really flies. A flying squirrel only glides.' },
  { o: 'Lichaam', v: 'About how many bones does an adult have?', a: ['about 50', 'about 206', 'about 1,000', 'about 12'], j: 1, w: 'A baby has more, about 300. Some of them grow together later.' },
  { o: 'Ruimte', v: 'Why do you sometimes see the Moon as a half moon?', a: ['we only see part of the side the Sun lights up', 'the Moon is really broken then', 'a cloud is in front of it', 'the Earth takes a bite'], j: 0, w: 'The Moon gives no light of its own. It reflects the light of the Sun.' },
];

const RIDDER = [
  { o: 'Ruimte', v: 'How long does sunlight take to reach the Earth?', a: ['about 8 seconds', 'about 8 minutes', 'about 8 hours', 'about 8 days'], j: 1, w: 'Light travels 300,000 km per second. Even so, the trip from the Sun to us takes about 8 minutes.' },
  { o: 'Natuur', v: 'Which gas do plants take from the air to make food?', a: ['oxygen', 'carbon dioxide', 'nitrogen', 'helium'], j: 1, w: 'Plants take in carbon dioxide and give off oxygen. That is called photosynthesis.' },
  { o: 'Geschiedenis', v: 'In which year did Belgium become an independent country?', a: ['1815', '1830', '1914', '1958'], j: 1, w: 'In 1830 Belgium broke away from the United Kingdom of the Netherlands. In 1831 came the first king, Leopold I.' },
  { o: 'Uitvindingen', v: 'What did Alexander Fleming discover in 1928?', a: ['penicillin', 'electricity', 'the telephone', 'X-rays'], j: 0, w: 'Fleming saw that a mould killed bacteria. That is how the first antibiotic came about.' },
  { o: 'Dieren', v: 'How many hearts does an octopus have?', a: ['one', 'two', 'three', 'eight'], j: 2, w: 'An octopus has three hearts and blue blood.' },
  { o: 'Techniek', v: 'Why is there copper wire in an electric cable?', a: ['copper conducts electricity very well', 'copper is pretty and shiny', 'copper stops electricity', 'copper is magnetic'], j: 0, w: 'Copper conducts electricity well. The plastic around it is an insulator: it protects you.' },
  { o: 'Ruimte', v: 'Which planet is closest to the Sun?', a: ['Mercury', 'Venus', 'the Earth', 'Mars'], j: 0, w: 'On Mercury it is more than 400 °C during the day, and colder than -170 °C at night.' },
  { o: 'Geschiedenis', v: 'Which painter made the Ghent Altarpiece together with his brother?', a: ['Jan van Eyck', 'Peter Paul Rubens', 'René Magritte', 'Pieter Bruegel'], j: 0, w: 'The Ghent Altarpiece was finished in 1432 and is one of the most famous paintings in the world.' },
  { o: 'Natuur', v: 'What does a barometer measure?', a: ['air pressure', 'temperature', 'wind speed', 'how much rain falls'], j: 0, w: 'When the air pressure drops quickly, bad weather is often on its way.' },
  { o: 'Lichaam', v: 'What do your red blood cells carry?', a: ['oxygen', 'food to your stomach', 'sound', 'calcium for your bones'], j: 0, w: 'Red blood cells carry oxygen from your lungs to every part of your body.' },
  { o: 'Uitvindingen', v: 'Who made the light bulb usable for ordinary homes around 1879?', a: ['Thomas Edison', 'Isaac Newton', 'Leonardo da Vinci', 'Marie Curie'], j: 0, w: 'Others worked on the light bulb too, but Edison made one that kept burning for a long time.' },
  { o: 'Dieren', v: 'Why does a polar bear have black skin under its white fur?', a: ['black skin absorbs heat from the sun well', 'to hide at night', 'because it is dirty', 'to attract fish'], j: 0, w: 'A polar bear\'s hairs are actually see-through. They look white because of the light.' },
  { o: 'Ruimte', v: 'What is a light year?', a: ['a distance', 'a time', 'a speed', 'a star'], j: 0, w: 'A light year is the distance light travels in one year: almost 10 trillion kilometres.' },
  { o: 'Techniek', v: 'Why does a heavy steel ship stay afloat?', a: ['it pushes a lot of water aside and is mostly hollow inside', 'steel always floats', 'the engines hold it up', 'sea water is sticky'], j: 0, w: 'An object floats when it pushes aside more water than it weighs itself. Archimedes discovered that.' },
  { o: 'Geschiedenis', v: 'Which invention from about 3500 BC made transport much easier?', a: ['the wheel', 'the steam engine', 'the bicycle', 'the train'], j: 0, w: 'The first wheels were made from one piece of wood. Later spokes were added, so they became lighter.' },
];

// What you discover in the lab, per experiment. After every solved experiment one goes into your explorer's book.
const LABO = {
  stroom: [
    'Electricity only flows round when the circuit is completely closed. One gap and the lamp goes out.',
    'Metals like copper conduct electricity well. Plastic, wood and rubber do not: they are insulators.',
    'A switch opens or closes the circuit. That is how you turn a lamp on and off.',
    'Around 1800 Alessandro Volta made the first battery, with discs of metal and cardboard in salt water.',
  ],
  tandwiel: [
    'Two gears that mesh together always turn in opposite directions.',
    'A small gear turns faster than a big one. If the big gear has three times as many teeth, the small one turns round three times as often.',
    'On a bicycle the gears work with a chain: a big gear at the front and a small one at the back make you fast.',
    'Old tower clocks are full of gears. That is how the hour hand turns twelve times slower than the minute hand.',
  ],
  wip: [
    'With a lever you lift something heavy using less force.',
    'The further something is from the pivot, the more force it gives. That is why a child can lift an adult on the seesaw.',
    'Archimedes said: "Give me a place to stand, and I will lift the Earth." He meant a very long lever.',
    'Scissors, a nutcracker and a wheelbarrow are levers too.',
  ],
  drijven: [
    'Something floats when it is lighter than the same amount of water. Cork and wood are lighter than water, iron and stone heavier.',
    'A ball of clay sinks, but if you make a little boat out of it, it floats: it pushes more water aside.',
    'You float more easily in salt water than in fresh water. In the Dead Sea you can almost sit on the water.',
    'An orange with its peel floats thanks to the air bubbles in the peel. Without the peel it sinks.',
  ],
  thermo: [
    'Water freezes at 0 degrees and boils at 100 degrees. The Celsius scale is built on that.',
    'Below zero you write a minus: -5 degrees is 5 degrees colder than 0.',
    'The difference between -3 and 4 degrees is 7 degrees: 3 up to zero and then 4 more.',
    'Your body is about 37 degrees warm. At 38 degrees or more you have a fever.',
  ],
};

module.exports = { PAGE, SCHILDKNAAP, RIDDER, LABO };
