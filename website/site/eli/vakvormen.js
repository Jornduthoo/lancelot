// Eén extra leervorm per vak: sorteren (Gedrag), tijdlijn (Cultuur), fout zoeken (K&F).
// Letterpuzzel (Frans) en omzetmachine (Wetenschappen) maken hun opgaven zelf in app.js.
window.ELI_SORTEER = {
  tid: 'G2',
  bakjes: [['fys', '💪 Fysiek'], ['cog', '🧠 Cognitief'], ['soc', '❤️ Socio-emotioneel']],
  items: [
    ['Lisa is dit jaar 5 cm gegroeid.', 'fys'],
    ['Bram leert fietsen zonder zijwieltjes.', 'fys'],
    ['Een kleuter leert knippen met een schaar.', 'fys'],
    ['Een peuter kan op één been staan.', 'fys'],
    ['Een baby herkent de geur van mama.', 'fys'],
    ['Een baby leert zitten zonder om te vallen.', 'fys'],
    ['Tom lost een moeilijke puzzel op.', 'cog'],
    ['Een peuter zegt zijn eerste woordjes.', 'cog'],
    ['Emma onthoudt de tafel van 7.', 'cog'],
    ['Een baby zoekt een speeltje dat onder een doek ligt.', 'cog'],
    ['Jonas bedenkt een plan om zijn huiswerk te maken.', 'cog'],
    ['Een kind begrijpt een moeilijke uitleg in de klas.', 'cog'],
    ['Een kleuter troost een huilend vriendje.', 'soc'],
    ['Een peuter krijgt een driftbui in de winkel.', 'soc'],
    ['Een tiener wil vooral bij zijn vrienden zijn.', 'soc'],
    ['Een baby lacht terug naar mama.', 'soc'],
    ['Mila leert haar beurt afwachten bij een spelletje.', 'soc'],
    ['Een kind is trots op zijn goede rapport.', 'soc'],
  ]
};
window.ELI_TIJDLIJN = [
  { j: -300, t: '± 300 v.C.', e: 'Zeno sticht het stoïcisme', tid: 'C4' },
  { j: 121, t: '121', e: 'Marcus Aurelius wordt geboren', tid: 'C4' },
  { j: 161, t: '161', e: 'Marcus Aurelius wordt keizer', tid: 'C4' },
  { j: 180, t: '180', e: 'Marcus Aurelius sterft, Commodus volgt hem op', tid: 'C1' },
  { j: 250, t: '3e eeuw', e: 'Crisis: soldatenkeizers en aanvallen aan 2 kanten', tid: 'C1' },
  { j: 390, t: 'eind 4e eeuw', e: 'De volksverhuizingen beginnen', tid: 'C2' },
  { j: 451, t: '451', e: 'Attila wordt verslagen door Aetius en Theodorik', tid: 'C2' },
  { j: 476, t: '476', e: 'Odoaker zet Romulus Augustulus af', tid: 'C2' },
  { j: 481, t: '± 481', e: 'Clovis wordt koning van de Franken', tid: 'C3' },
  { j: 511, t: '511', e: 'Clovis sterft en zijn zonen verdelen het rijk', tid: 'C3' },
];
// [zin met [fout|juist], uitleg, onderwerp]
window.ELI_FOUT = [
  ['Filosofie betekent letterlijk liefde voor [geld|wijsheid].', 'philia = liefde, sophia = wijsheid.', 'KF1'],
  ['Het denkvermogen van de mens heet de [ziel|rede].', 'Rationeel denken gebeurt met de rede.', 'KF1'],
  ['“Hoe groot is de aarde?” is een [filosofische vraag|weetvraag].', 'Dat kan je meten of opzoeken: een weetvraag.', 'KF1'],
  ['De filosofie ontstond in het oude [Egypte|Griekenland].', '± 2600 jaar geleden in Griekenland.', 'KF2'],
  ['Thales zag [vuur|water] als de oerstof van alles.', 'Zonder water geen leven.', 'KF2'],
  ['Het Griekse woord voor oerstof of beginsel is [logos|archè].', 'Archè = begin, beginsel.', 'KF2'],
  ['Anaximander was een leerling van [Socrates|Thales].', 'Hij vond water niet genoeg en koos het apeiron.', 'KF2'],
  ['Thales voorspelde een [aardbeving|zonsverduistering].', 'Hij leerde sterrenkunde in Egypte.', 'KF2'],
  ['Heraclitus kreeg de bijnaam de [vrolijke|duistere] filosoof.', 'Door zijn raadselachtige spreuken.', 'KF2'],
  ['De natuurfilosofen heten ook [sofisten|presocraten].', 'Ze leefden vóór Socrates.', 'KF2'],
  ['De sofisten gaven [gratis|betaald] les.', 'Lesgeven was hun beroep.', 'KF3'],
  ['Protagoras zei: de mens is de [koning|maat] van alle dingen.', 'Waarheid verschilt per mens: relativisme.', 'KF3'],
  ['We kennen Socrates via zijn leerling [Aristoteles|Plato].', 'Socrates schreef zelf geen letter.', 'KF3'],
  ['Socrates vond dat de waarheid [relatief|absoluut] is.', 'Voor hem bestaat de waarheid wél: absolutisme.', 'KF3'],
  ['Socrates zocht de waarheid in een [toespraak|dialoog].', 'Filosofie was voor hem een gesprek.', 'KF3'],
];
