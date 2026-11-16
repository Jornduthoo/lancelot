// "Snap je het echt?" Per onderwerp:
//  kern: een kernvraag die Thor in eigen woorden beantwoordt (m = modelantwoord, k = kernwoorden; "a|b" = a of b telt)
//  toep: toepassingsvragen met een nieuw voorbeeld; w[i] = waarom optie i niet klopt (leeg bij het juiste antwoord)
(function(){
const S = {
  N1: {
    kern: { v:'Je leest het woord “onverwoestbaar”. Hoe kom je achter de betekenis zonder woordenboek?', m:'Ik <b>knip het woord in stukjes</b>: <b>on</b> (= niet) + <b>verwoest</b> + <b>-baar</b> (= kan). Dus: iets dat je <b>niet kan verwoesten</b>. Daarna kijk ik of die betekenis <b>past in de zin</b> (de context).', k:['stuk|opdel|knip|deel','on|niet','baar|kan','context|zin|past'] },
    toep: [
      { t:'mc', v:'“De <b>scheidsrechter</b> floot en de worstelaars stopten meteen.” Wat helpt je het meest?', o:['De context: hij fluit en iedereen stopt','Het woord vergelijken met het Frans','Meteen opzoeken'], a:0, w:['','Het Franse “arbitre” lijkt er niet op.','Dat mag, maar probeer eerst zelf: de zin geeft al genoeg hints.'] },
      { t:'mc', v:'Je kent “sneakers” uit het Engels. Je leest: “Hij droeg <b>sneakers</b>.” Welke strategie gebruik je?', o:['Vergelijken met een woord dat je kent (andere taal)','Het woord opdelen','Een tegenstelling zoeken'], a:0, w:['','Sneakers kan je niet in bekende Nederlandse stukjes knippen.','Er staat geen tegenstelling in de zin.'] },
    ],
  },
  N2: {
    kern: { v:'Wat is het verschil tussen tekstsoort, teksttype en tekstdoel? Gebruik een recept als voorbeeld.', m:'De <b>tekstsoort</b> is de vorm: een <b>recept</b>. Het <b>teksttype</b> is de groep: <b>instructief</b>. Het <b>tekstdoel</b> is waarom het geschreven is: <b>instrueren</b> (je iets laten doen).', k:['vorm|soort','recept','instructie','instrueren|laten doen|doel|waarom'] },
    toep: [
      { t:'mc', v:'Een filmpje van een youtuber: “Deze 5 skateboards zijn de beste, koop ze via mijn link!”. Belangrijkste doel?', o:['Overtuigen','Ontspannen','Instrueren'], a:0, w:['','Het is misschien leuk om te kijken, maar hij wil vooral dat je koopt.','Hij legt niet stap voor stap uit hoe je iets doet.'] },
      { t:'mc', v:'Een artikel op de site van de krant: “Brugge krijgt in 2027 een overdekt skatepark.” Welk teksttype?', o:['Informatief','Overtuigend','Verhalend'], a:0, w:['','Er wordt niets aangeprezen: het zijn feiten.','Er is geen verhaal met personages of spanning.'] },
    ],
  },
  N3: {
    kern: { v:'Je moet voor een spreekbeurt over vintage speelgoed info zoeken in 5 artikels. Welke leesstrategieën gebruik je na elkaar?', m:'Eerst <b>oriënterend</b> lezen: snel bekijken welke artikels nuttig zijn. Dan <b>globaal</b> lezen om te weten waarover ze gaan, <b>zoekend</b> lezen om specifieke info te vinden, en de belangrijke stukken <b>intensief</b> lezen.', k:['oriënter','globaal','zoekend','intensief'] },
    toep: [
      { t:'mc', v:'Je zoekt in de tv-gids hoe laat het worstelen begint. Welke strategie?', o:['Zoekend lezen','Intensief lezen','Voorspellend lezen'], a:0, w:['','Je hoeft niet alles grondig te lezen, enkel het uur.','Je wil geen voorspelling, je zoekt één gegeven.'] },
      { t:'mc', v:'Op het examen lees je eerst de titel en kijk je naar de foto van een skater. Welke strategie?', o:['Voorspellend lezen','Genietend lezen','Zoekend lezen'], a:0, w:['','Je leest niet voor je plezier.','Je zoekt nog geen specifieke info.'] },
    ],
  },
  N4: {
    kern: { v:'Hoe weet je of een zin een hoofdpunt of een bijzaak is?', m:'Met de <b>weglaattest</b>: laat de zin weg. <b>Verandert de boodschap</b>, dan is het een <b>hoofdpunt</b>. Blijft de boodschap <b>dezelfde</b>, dan is het een <b>bijzaak</b>, zoals een <b>voorbeeld, getal of grapje</b>.', k:['weglat|weg','boodschap','hoofdpunt','bijzaak|detail|voorbeeld'] },
    toep: [
      { t:'mc', v:'“Skaten is goed voor je evenwicht. <i>Mijn nonkel kon vroeger zelfs op één wiel rijden.</i>” De schuine zin is…', o:['een bijzaak (voorbeeld/anekdote)','de hoofdgedachte','een hoofdpunt'], a:0, w:['','De hele tekst gaat niet over je nonkel.','Weglaten verandert niets aan de boodschap over evenwicht.'] },
      { t:'mc', v:'Een tekst heeft 3 alinea’s: over de kosten, over het gevaar en over de voordelen van skaten. Wat is de beste hoofdgedachte?', o:['Skaten heeft kosten, risico’s en voordelen.','Een skateboard kost veel.','Draag altijd een helm.'], a:0, w:['','Dat is maar één hoofdpunt.','Dat is een detail over het gevaar.'] },
    ],
  },
  N5: {
    kern: { v:'Wat maakt een persoonsbeschrijving goed? Noem minstens 3 dingen.', m:'Je beschrijft <b>uiterlijke kenmerken</b> (van <b>algemeen naar detail</b>, van boven naar onder) én <b>karaktereigenschappen</b>. Je <b>bewijst</b> een eigenschap met een <b>voorbeeld</b>. En je kiest woorden met een goede <b>gevoelswaarde</b>, zodat je niemand kwetst.', k:['uiterlijk','karakter','voorbeeld|bewijs','gevoelswaarde|kwets|voorzichtig','algemeen|boven naar onder|volgorde'] },
    toep: [
      { t:'mc', v:'Je schrijft over je oma voor een verjaardagskaart. Welke zin is het best?', o:['Oma is stevig gebouwd en heeft altijd een warme glimlach.','Oma is dik en oud.','Oma heeft een gezicht.'], a:0, w:['','Klopt misschien, maar “dik” kwetst: kies een woord met een betere gevoelswaarde.','Dat zegt niets: niet nauwkeurig.'] },
      { t:'mc', v:'Welke zin is een karaktereigenschap MET bewijs?', o:['Eli is behulpzaam: hij helpt Thor altijd met zijn wiskunde.','Eli is behulpzaam.','Eli heeft blond haar.'], a:0, w:['','Er staat geen voorbeeld bij.','Dat is een uiterlijk kenmerk.'] },
    ],
  },
  N6: {
    kern: { v:'Wanneer krijgt een bijvoeglijk naamwoord vóór een zelfstandig naamwoord géén -e? Geef een voorbeeld en een tegenvoorbeeld.', m:'Na <b>een</b> bij een <b>het-woord</b> in het enkelvoud: een <b>groot</b> park (het park). Maar met <b>het</b> wel: het <b>grote</b> park. En bij de-woorden altijd: een <b>grote</b> skater.', k:['een','het-woord|het woord|het park|het','enkelvoud','groot|grote'] },
    toep: [
      { t:'mc', v:'“Ik kreeg een … cadeau.” (mooi, het cadeau)', o:['mooi','mooie','mooien'], a:0, w:['','Een + het-woord in het enkelvoud: geen -e.','Dat bestaat niet.'] },
      { t:'mc', v:'“Ik kreeg een … doos.” (groot, de doos)', o:['grote','groot','groote'], a:0, w:['','De doos is een de-woord: wel een -e.','Groot + e → grote: de klinker blijft enkel in een open lettergreep.'] },
    ],
  },
  N7: {
    kern: { v:'Hoe herken je een gebiedende zin, en hoe verschilt die van een vragende zin?', m:'Bij een <b>gebiedende zin</b> staat de <b>persoonsvorm vooraan</b> en is er <b>geen onderwerp</b> (Zet je helm op!). Bij een <b>vragende zin</b> staat er <b>wel een onderwerp</b> (Zet jij je helm op?) en eindig je met een <b>vraagteken</b>.', k:['vooraan','geen onderwerp|zonder onderwerp','onderwerp|jij','vraagteken'] },
    toep: [
      { t:'mc', v:'“Kom eens kijken” Welk leesteken past?', o:['! of .','?','geen'], a:0, w:['','Het is geen vraag: er is geen onderwerp, het is gebiedend.','Elke zin eindigt met een leesteken.'] },
      { t:'mc', v:'Je schrijft een mail naar je leerkracht. Wat is het beste?', o:['Mag ik mijn taak morgen indienen?','Mag ik mijn taak morgen indienen???','MAG IK MIJN TAAK MORGEN INDIENEN?!'], a:0, w:['','Te veel leestekens klinkt ongeduldig of boos.','Hoofdletters en ?! klinken als roepen.'] },
    ],
  },
  N8: {
    kern: { v:'Waarom schrijf je “Nederlands” met een hoofdletter, maar “wiskunde” niet?', m:'<b>Nederlands</b> is de naam van een <b>taal</b>, en talen krijgen een <b>hoofdletter</b>. <b>Wiskunde</b> is een gewoon <b>schoolvak</b>, en schoolvakken krijgen <b>geen</b> hoofdletter.', k:['taal','vak','geen hoofdletter|kleine letter|niet'] },
    toep: [
      { t:'mc', v:'Welke zin is helemaal juist?', o:['In de paasvakantie gaan we naar Frankrijk.','In de Paasvakantie gaan we naar frankrijk.','in de paasvakantie gaan we naar Frankrijk.'], a:0, w:['','“Paasvakantie” is geen feestdag zelf; en Frankrijk krijgt wel een hoofdletter.','Het begin van de zin krijgt een hoofdletter.'] },
      { t:'mc', v:'Welke schrijfwijze is juist?', o:['Vorige dinsdag aten we Italiaanse pizza.','Vorige Dinsdag aten we Italiaanse pizza.','Vorige dinsdag aten we italiaanse pizza.'], a:0, w:['','Dagen krijgen geen hoofdletter.','Afgeleid van Italië: wel een hoofdletter.'] },
    ],
  },
  N9: {
    kern: { v:'Hoe vind je de persoonsvorm en het onderwerp in een zin? Leg de stappen uit.', m:'Eerst de <b>persoonsvorm</b> met een proef: de <b>tijdproef</b> (zet de zin in een andere tijd), de <b>getalproef</b> (verander enkelvoud/meervoud) of de <b>vraagproef</b> (maak er een ja-neevraag van). Het werkwoord dat verandert of vooraan springt is de pv. Dan het <b>onderwerp</b>: vraag <b>wie of wat + pv?</b>', k:['tijdproef|tijd','getalproef|meervoud|getal','vraagproef|vraag','wie of wat|wie'] },
    toep: [
      { t:'mc', v:'“Op zolder ligt een doos met oude worstelaars.” Wat is het onderwerp?', o:['een doos met oude worstelaars','zolder','oude worstelaars'], a:0, w:['','“Op zolder” zegt waar, niet wie of wat ligt.','Wat ligt er? De doos (met worstelaars). Daarom is de pv ook enkelvoud: ligt.'] },
      { t:'mc', v:'“Thor en Eli … samen naar de skatebaan.” (gaan)', o:['gaan','gaat','ga'], a:0, w:['','Thor en Eli = 2 personen = meervoud.','Dat is de ik-vorm.'] },
    ],
  },
  N10: {
    kern: { v:'Leg uit wanneer je “word”, “wordt” en “worden” schrijft.', m:'De stam is <b>word</b>. Bij <b>ik</b> en bij <b>inversie met jij/je</b> (Word jij…?) schrijf je alleen de stam: <b>word</b>. Bij <b>jij/je/u</b> vóór de pv en bij <b>hij/zij/het</b>: stam + t = <b>wordt</b>. In het <b>meervoud</b>: het hele werkwoord, <b>worden</b>.', k:['stam','ik','inversie|na de|word jij|word je','hij|zij|jij wordt|+ t|plus t|wordt','meervoud|wij|worden'] },
    toep: [
      { t:'mc', v:'“Hoe … je zo goed in skaten?” (worden)', o:['word','wordt','worden'], a:0, w:['','Je staat na de pv: inversie, dus geen t.','Je is enkelvoud.'] },
      { t:'mc', v:'“… u ook lid van de verzamelclub?” (worden)', o:['Wordt','Word','Worden'], a:0, w:['','Bij u valt de t niet weg.','U is enkelvoud.'] },
    ],
  },
  N11: {
    kern: { v:'Wat is een vergelijking in een beschrijving, en waarom gebruik je ze? Geef 2 voorbeelden.', m:'Een vergelijking (<b>zo … als …</b>) maakt je beschrijving <b>beeldend</b>: de lezer ziet het meteen voor zich. Bv. <b>zo sterk als een beer</b>, <b>zo trots als een pauw</b>.', k:['zo|als','beeld|voor zich|levendig|duidelijk','beer|pauw|vos|ezel|wezel|kwartel|aal|straat|veertje|doek'] },
    toep: [
      { t:'mc', v:'Thor laat zich na een val niet tegenhouden en probeert de truc voor de tiende keer. Hij is zo koppig als…', o:['een ezel','een pauw','een kwartel'], a:0, w:['','Een pauw is trots.','Een kwartel is doof.'] },
      { t:'mc', v:'Na de horrorfilm zag Eli wit. Hij was…', o:['zo bleek als een doek','zo glad als een aal','zo oud als de straat'], a:0, w:['','Glad als een aal = je glipt overal onderuit.','Dat gaat over iets heel ouds.'] },
    ],
  },
  N12: {
    kern: { v:'Wat is het verschil tussen een open en een gesloten vraag? Wanneer gebruik je welke?', m:'Op een <b>open vraag</b> antwoord je <b>vrij en uitgebreid</b> (Waarom verzamel je?). Een <b>gesloten vraag</b> heeft een <b>vast antwoord</b>: ja/nee of een keuze. Open vragen gebruik je om <b>veel te weten te komen</b> (interview), gesloten vragen voor een <b>snel, duidelijk antwoord</b>.', k:['open','gesloten','vrij|uitgebreid|veel','ja|nee|keuze|vast'] },
    toep: [
      { t:'mc', v:'Je maakt een enquête in de klas: “Heb je een huisdier?” Wat voor vraag?', o:['Gesloten (ja-nee)','Open','Retorisch'], a:0, w:['','Je kan maar ja of nee zeggen.','Je verwacht wel een antwoord.'] },
      { t:'mc', v:'“Waarom zou iemand nu níét willen slagen?” Wat voor vraag?', o:['Retorische vraag','Open vraag','Keuzevraag'], a:0, w:['','Je verwacht geen echt antwoord: het is een mening.','Er worden geen keuzes gegeven.'] },
    ],
  },
  N13: {
    kern: { v:'Noem de 6 elementen van het communicatiemodel en de vraag die bij elk hoort.', m:'<b>Zender</b> (wie zegt het?), <b>ontvanger</b> (tegen wie?), <b>boodschap</b> (wat?), <b>doel</b> (waarom?), <b>kanaal/medium</b> (hoe, waarlangs?) en <b>situatie</b> (waar en wanneer?).', k:['zender','ontvanger','boodschap','doel','kanaal|medium','situatie'] },
    toep: [
      { t:'mc', v:'De turnleraar roept op de speelplaats: “Morgen geen les!” Wat is het kanaal?', o:['Gesproken taal (roepen)','De speelplaats','De leerlingen'], a:0, w:['','Dat is de situatie (waar).','Dat zijn de ontvangers.'] },
      { t:'mc', v:'Thor stuurt een mail naar de leerkracht om te vragen of hij later mag indienen. Hoe schrijft hij best?', o:['Beleefd en verzorgd, want de ontvanger is een leerkracht','Zoals een sms aan een vriend','Zo kort mogelijk zonder aanspreking'], a:0, w:['','Je past je boodschap aan je ontvanger aan.','Een leerkracht spreek je beleefd aan.'] },
    ],
  },
  N14: {
    kern: { v:'Wat maakt een instructie goed? Noem minstens 4 kenmerken.', m:'De stappen staan in de <b>juiste volgorde</b>, met <b>nummers of signaalwoorden</b> (eerst, daarna, ten slotte). Elke stap is <b>kort</b> met <b>één handeling</b>. Je gebruikt de <b>gebiedende wijs</b>. Je zegt <b>wat je nodig hebt</b> en het is <b>duidelijk</b>.', k:['volgorde','signaalwoord|eerst|daarna|ten slotte|nummer','kort|één handeling|een handeling','gebiedende|imperatief','nodig|materiaal'] },
    toep: [
      { t:'mc', v:'Welke stap hoort tussen “Eerst open je de doos.” en “Ten slotte zet je de figuur in de kast.”?', o:['Daarna haal je de figuur er voorzichtig uit.','Ten eerste koop je de doos.','Tot slot sluit je de kast.'], a:0, w:['','Kopen komt vóór openen, en het signaalwoord past niet in het midden.','“Tot slot” hoort bij de laatste stap.'] },
      { t:'mc', v:'Wat is de grootste fout? “Je moet eigenlijk je helm opzetten en je knieën buigen en dan duw je af.”', o:['Te veel handelingen in één zin en geen gebiedende wijs','Te veel signaalwoorden','Het staat in de verkeerde taal'], a:0, w:['','Er staan net te weinig signaalwoorden.','Het is Nederlands.'] },
    ],
  },
  N15: {
    kern: { v:'Hoe vorm je de imperatief, en waarom schrijf je “Word niet boos!” zonder t?', m:'De imperatief is de <b>stam</b> (ik-vorm). Er staat <b>geen onderwerp</b> (geen jij of hij), dus er komt <b>nooit een t</b> bij: <b>Word</b> niet boos! Uitzondering: zijn → <b>wees</b>.', k:['stam|ik-vorm','geen onderwerp|zonder onderwerp','geen t|zonder t','wees'] },
    toep: [
      { t:'mc', v:'“… je vast aan de leuning!” (houden)', o:['Houd of Hou','Houdt','Houden'], a:0, w:['','Geen onderwerp, dus geen t.','Dat is het hele werkwoord.'] },
      { t:'mc', v:'“… stil tijdens het examen.” (zijn)', o:['Wees','Ben','Zijn'], a:0, w:['','Zijn heeft een uitzondering: wees.','Dat is het hele werkwoord.'] },
    ],
  },
  N16: {
    kern: { v:'Waarom schrijf je “balletje” maar “wieltje”?', m:'<b>Bal</b> heeft een <b>korte klinker</b> + l: dan <b>verdubbel</b> je de medeklinker en komt er <b>-etje</b> achter (ba<b>ll</b>etje). <b>Wiel</b> heeft een <b>lange klank</b> (ie) + l: dan komt er gewoon <b>-tje</b> achter.', k:['kort','verdubbel|dubbel|ll','etje','lang','tje'] },
    toep: [
      { t:'mc', v:'Verkleinwoord van “kar”?', o:['karretje','kartje','karpje'], a:0, w:['','Korte klinker + r: verdubbelen + -etje.','-pje komt na m.'] },
      { t:'mc', v:'Verkleinwoord van “raam”?', o:['raampje','raamtje','rammetje'], a:0, w:['','Lange klinker + m: -pje.','De klinker is lang, niet kort.'] },
    ],
  },
};
// Toepassingsvragen bij de gewone quizvragen zetten.
for (const t of (window.ELI_ONDERWERPEN || [])) {
  const s = S[t.id]; if (!s) continue;
  if (s.toep && !t._snap) { t.quiz.push(...s.toep.map(q => ({ ...q, toep: true }))); t._snap = true; }
}
window.ELI_SNAP = S;
// De 3 overhoorvragen van een dag: dezelfde op Eli's app en op de supporterspagina.
// Uit onderwerpen die vóór vandaag geleerd zijn (anders die van vandaag): 1 kernvraag + 2 kaartjes.
window.ELI_OVERHOOR = (dag, stand, P) => {
  const T = window.ELI_ONDERWERPEN || [], taken = (stand && stand.taken) || {};
  const opDag = window.ELI.opDag;
  let seed = [...dag].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  let pool = T.filter(t => taken['leer:' + t.id] && opDag(taken['leer:' + t.id].op) < dag);
  if (pool.length < 2) { const plan = P.maak()[dag] || []; pool = plan.filter(i => i.onderwerp).map(i => T.find(t => t.id === i.onderwerp)).filter(Boolean); }
  if (!pool.length) pool = T.slice(0, 3);
  pool = pool.slice().sort((a, b) => a.id < b.id ? -1 : 1);
  const neem = () => pool.splice(Math.floor(rnd() * pool.length), 1)[0] || T[0];
  const uit = [];
  const t1 = neem(); if (S[t1.id]) uit.push({ v: S[t1.id].kern.v, a: S[t1.id].kern.m, tid: t1.id });
  while (uit.length < 3) {
    const t = pool.length ? neem() : t1;
    const [v, a] = t.kaarten[Math.floor(rnd() * t.kaarten.length)];
    if (!uit.some(x => x.v === v)) uit.push({ v, a, tid: t.id });
  }
  return uit;
};
})();
