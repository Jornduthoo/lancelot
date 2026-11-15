// Frans — examen di 8/12: 9u00 schriftelijk, 10u55 digitaal
(function(){
const D = id => 'https://drive.google.com/file/d/' + id + '/view';
const RES = D('1wwnZL-ic7UT91oVcPqYPudk32b_Gk_wf'), SCH = D('1JPeFxX_W0taC2-PiNoceEaWQNaapAQGn'), INS = D('1DsFu7SDuQJcyQ6GIOHtgO34R64b4OHU9'),
      VID = D('1AfRi_mXOk5LO9UzmjjSGKlK-MKULSXQK'), IMP = D('1iTGALnJz-f1D_B6PFLBV_5Ji1byZoMti'), IMPI = D('1uJeCUKmHWIqOWSXlbXUfaL_CK2s_cHTn'),
      VOC = D('1Y5kayzrOG39dSe7MhcCTYKRUuEBAibe7'), IRR = D('1QfjxsiMKnGN7eUDMvec9Ukg2qIj7Zmoe'), LST = D('1IjTQz_l_q5yFIkLG5p1Nzft54brttsRv'),
      VOC2 = D('19-dd8x8J8ixSqhh1tlDXSXdvY7bfoE9l'), QRES = D('1Sqz4r2bjuEgmsTlsw6yvpV64ZF0Ld42A'), QSCH = D('1cBGYCE1nBSQsZl9XqN1u-pcTSGX3l02h'),
      PSCH = D('1pKY3Q1tKukJkBew2Ek_hVkCyqSvH7l2c'), RSCH = D('1ydKLCitGyqHMF1VZcTfh3zQD9BpDaZhW'), REX = D('1lzC2gvRcU9lqr64HzVrxA1u8BXi2gMNl');

// Werkwoorden: 6 vormen (je, tu, il/elle/on, nous, vous, ils/elles)
const WW = window.ELI_WW = {
  parler:['parle','parles','parle','parlons','parlez','parlent','spreken'],
  manger:['mange','manges','mange','mangeons','mangez','mangent','eten'],
  nager:['nage','nages','nage','nageons','nagez','nagent','zwemmen'],
  changer:['change','changes','change','changeons','changez','changent','veranderen'],
  ranger:['range','ranges','range','rangeons','rangez','rangent','opruimen'],
  commencer:['commence','commences','commence','commençons','commencez','commencent','beginnen'],
  avancer:['avance','avances','avance','avançons','avancez','avancent','vooruitgaan'],
  placer:['place','places','place','plaçons','placez','placent','plaatsen'],
  acheter:['achète','achètes','achète','achetons','achetez','achètent','kopen'],
  lever:['lève','lèves','lève','levons','levez','lèvent','opheffen'],
  amener:['amène','amènes','amène','amenons','amenez','amènent','meebrengen'],
  appuyer:['appuie','appuies','appuie','appuyons','appuyez','appuient','steunen'],
  payer:['paie','paies','paie','payons','payez','paient','betalen'],
  nettoyer:['nettoie','nettoies','nettoie','nettoyons','nettoyez','nettoient','schoonmaken'],
  essayer:['essaie','essaies','essaie','essayons','essayez','essaient','proberen'],
  sortir:['sors','sors','sort','sortons','sortez','sortent','buitengaan'],
  partir:['pars','pars','part','partons','partez','partent','vertrekken'],
  dormir:['dors','dors','dort','dormons','dormez','dorment','slapen'],
  sentir:['sens','sens','sent','sentons','sentez','sentent','voelen'],
  mentir:['mens','mens','ment','mentons','mentez','mentent','liegen'],
  finir:['finis','finis','finit','finissons','finissez','finissent','beëindigen'],
  choisir:['choisis','choisis','choisit','choisissons','choisissez','choisissent','kiezen'],
  remplir:['remplis','remplis','remplit','remplissons','remplissez','remplissent','vullen'],
  réfléchir:['réfléchis','réfléchis','réfléchit','réfléchissons','réfléchissez','réfléchissent','nadenken'],
  ouvrir:['ouvre','ouvres','ouvre','ouvrons','ouvrez','ouvrent','openen'],
  découvrir:['découvre','découvres','découvre','découvrons','découvrez','découvrent','ontdekken'],
  offrir:['offre','offres','offre','offrons','offrez','offrent','aanbieden'],
  souffrir:['souffre','souffres','souffre','souffrons','souffrez','souffrent','lijden'],
  attendre:['attends','attends','attend','attendons','attendez','attendent','wachten'],
  vendre:['vends','vends','vend','vendons','vendez','vendent','verkopen'],
  répondre:['réponds','réponds','répond','répondons','répondez','répondent','antwoorden'],
  perdre:['perds','perds','perd','perdons','perdez','perdent','verliezen'],
  descendre:['descends','descends','descend','descendons','descendez','descendent','afdalen'],
  entendre:['entends','entends','entend','entendons','entendez','entendent','horen'],
  conduire:['conduis','conduis','conduit','conduisons','conduisez','conduisent','rijden'],
  construire:['construis','construis','construit','construisons','construisez','construisent','bouwen'],
  traduire:['traduis','traduis','traduit','traduisons','traduisez','traduisent','vertalen'],
  détruire:['détruis','détruis','détruit','détruisons','détruisez','détruisent','vernietigen'],
  produire:['produis','produis','produit','produisons','produisez','produisent','produceren'],
  peindre:['peins','peins','peint','peignons','peignez','peignent','schilderen'],
  craindre:['crains','crains','craint','craignons','craignez','craignent','vrezen'],
  joindre:['joins','joins','joint','joignons','joignez','joignent','verbinden'],
  // onregelmatig
  être:['suis','es','est','sommes','êtes','sont','zijn'],
  avoir:['ai','as','a','avons','avez','ont','hebben'],
  aller:['vais','vas','va','allons','allez','vont','gaan'],
  faire:['fais','fais','fait','faisons','faites','font','maken, doen'],
  vouloir:['veux','veux','veut','voulons','voulez','veulent','willen'],
  pouvoir:['peux','peux','peut','pouvons','pouvez','peuvent','kunnen'],
  devoir:['dois','dois','doit','devons','devez','doivent','moeten'],
  savoir:['sais','sais','sait','savons','savez','savent','weten'],
  boire:['bois','bois','boit','buvons','buvez','boivent','drinken'],
  connaître:['connais','connais','connaît','connaissons','connaissez','connaissent','kennen'],
  courir:['cours','cours','court','courons','courez','courent','lopen'],
  croire:['crois','crois','croit','croyons','croyez','croient','geloven'],
  dire:['dis','dis','dit','disons','dites','disent','zeggen'],
  écrire:['écris','écris','écrit','écrivons','écrivez','écrivent','schrijven'],
  envoyer:['envoie','envoies','envoie','envoyons','envoyez','envoient','sturen'],
  lire:['lis','lis','lit','lisons','lisez','lisent','lezen'],
  mettre:['mets','mets','met','mettons','mettez','mettent','plaatsen, zetten'],
  mourir:['meurs','meurs','meurt','mourons','mourez','meurent','sterven'],
  prendre:['prends','prends','prend','prenons','prenez','prennent','nemen'],
  recevoir:['reçois','reçois','reçoit','recevons','recevez','reçoivent','ontvangen'],
  rire:['ris','ris','rit','rions','riez','rient','lachen'],
  suivre:['suis','suis','suit','suivons','suivez','suivent','volgen'],
  tenir:['tiens','tiens','tient','tenons','tenez','tiennent','houden'],
  venir:['viens','viens','vient','venons','venez','viennent','komen'],
  vivre:['vis','vis','vit','vivons','vivez','vivent','leven'],
  voir:['vois','vois','voit','voyons','voyez','voient','zien']
};
window.ELI_PERS = ['je','tu','il / elle / on','nous','vous','ils / elles'];

// Passé composé (lijst uit de cursus): [hulpww, participe, vertaling]
window.ELI_PC = {
  jouer:['avoir','joué','spelen'], écouter:['avoir','écouté','luisteren'], aimer:['avoir','aimé','houden van'], regarder:['avoir','regardé','kijken'],
  travailler:['avoir','travaillé','werken'], habiter:['avoir','habité','wonen'], manger:['avoir','mangé','eten'], commencer:['avoir','commencé','beginnen'],
  acheter:['avoir','acheté','kopen'], payer:['avoir','payé','betalen'], appeler:['avoir','appelé','bellen'], jeter:['avoir','jeté','gooien'], inviter:['avoir','invité','uitnodigen'],
  entrer:['être','entré','binnengaan'], rentrer:['être','rentré','terug binnengaan'], monter:['être','monté','stijgen'], tomber:['être','tombé','vallen'], arriver:['être','arrivé','aankomen'],
  rester:['être','resté','blijven'], retourner:['être','retourné','terugkeren'], descendre:['être','descendu','afdalen'], partir:['être','parti','vertrekken'], sortir:['être','sorti','weggaan'],
  perdre:['avoir','perdu','verliezen'], rendre:['avoir','rendu','teruggeven'], attendre:['avoir','attendu','wachten'], entendre:['avoir','entendu','horen'], vendre:['avoir','vendu','verkopen'], répondre:['avoir','répondu','antwoorden'],
  ouvrir:['avoir','ouvert','openen'], offrir:['avoir','offert','aanbieden'], découvrir:['avoir','découvert','ontdekken'], souffrir:['avoir','souffert','lijden'],
  finir:['avoir','fini','beëindigen'], choisir:['avoir','choisi','kiezen'], grandir:['avoir','grandi','groeien'], réfléchir:['avoir','réfléchi','nadenken'], dormir:['avoir','dormi','slapen'], servir:['avoir','servi','(op)dienen'],
  avoir:['avoir','eu','hebben'], aller:['être','allé','gaan'], boire:['avoir','bu','drinken'], connaître:['avoir','connu','kennen'], courir:['avoir','couru','lopen'], croire:['avoir','cru','geloven'],
  devoir:['avoir','dû','moeten'], dire:['avoir','dit','zeggen'], écrire:['avoir','écrit','schrijven'], envoyer:['avoir','envoyé','zenden'], être:['avoir','été','zijn'], faire:['avoir','fait','doen, maken'],
  lire:['avoir','lu','lezen'], mettre:['avoir','mis','plaatsen, zetten'], mourir:['être','mort','sterven'], pouvoir:['avoir','pu','kunnen'], prendre:['avoir','pris','nemen'], recevoir:['avoir','reçu','ontvangen'],
  rire:['avoir','ri','lachen'], savoir:['avoir','su','weten'], suivre:['avoir','suivi','volgen'], tenir:['avoir','tenu','houden'], venir:['être','venu','komen'], vivre:['avoir','vécu','leven'], voir:['avoir','vu','zien'], vouloir:['avoir','voulu','willen']
};

// Woordentabel voor samenvattingen: indexen uit een woordenlijst
const wtab = (lijst, idx) => '<table class="lp-ww lp-woord">' + idx.map(i => `<tr><td>${lijst[i][0]}</td><td>${lijst[i][1]}</td></tr>`).join('') + '</table>';
// Vervoegingstabel voor samenvattingen: [persoon, stam, uitgang, vertaling]
const vtab = rijen => '<table class="lp-ww">' + rijen.map(([p, st, u, nl]) => `<tr><td>${p}</td><td>${st}<b class="lp-u">${u}</b></td><td>${nl}</td></tr>`).join('') + '</table>';

// Tabel met de vervoeging van 2 à 3 onregelmatige werkwoorden naast elkaar.
const ITAB_P = ['je','tu','il/elle','nous','vous','ils/elles'];
const itab = ws => '<table class="lp-ww lp-irr"><tr><th></th>' + ws.map(w => `<th>${w}<small>${WW[w][6]}</small></th>`).join('') + '</tr>' + ITAB_P.map((p, i) => `<tr><td>${p}</td>` + ws.map(w => `<td><b>${WW[w][i]}</b></td>`).join('') + '</tr>').join('') + '</table>';
const vocab = [
  ['un pays','een land'],['un continent','een continent'],['un passeport','een paspoort'],['un avion','een vliegtuig'],['un train','een trein'],['un bateau','een boot'],
  ['un bus','een bus'],['un métro','een metro'],['un tram','een tram'],['un voyage','een reis'],['une valise','een koffer'],['une carte','een kaart'],['une gare','een station'],
  ['une destination','een bestemming'],['une plage','een strand'],['une mer','een zee'],['une montagne','een berg'],['une colline','een heuvel'],['une frontière','een grens'],
  ['une région','een streek'],['étranger / étrangère','buitenlands'],['national / nationale','nationaal'],['international / internationale','internationaal'],['touristique','toeristisch'],
  ['confortable','comfortabel'],['cher / chère','duur'],['bon marché','goedkoop'],['moderne','modern'],['célèbre','beroemd'],['culturel / culturelle','cultureel'],
  ['voyager','reizen'],['visiter','bezoeken'],['partir','vertrekken'],['arriver','aankomen'],['réserver','reserveren'],['prendre','nemen'],['acheter','kopen'],['découvrir','ontdekken'],
  ['se promener','wandelen'],['nager','zwemmen'],['conduire','rijden'],['louer','huren'],['chercher','zoeken'],['trouver','vinden'],['demander','vragen'],
  ['Où est… ?','Waar is…?'],['Combien coûte… ?','Hoeveel kost…?'],['Je voudrais…','Ik zou graag…'],['C\'est loin ?','Is het ver?'],['J\'ai besoin de…','Ik heb … nodig'],
  ['à gauche','naar links'],['à droite','naar rechts'],['tout droit','rechtdoor'],['faire la valise','de koffer pakken'],['Bon voyage !','Goede reis!']
];

// Woordenlijst partie 2 (Frans, Nederlands)
const vocab2 = [
  ['un billet','een ticket'],['un hôtel','een hotel'],['un aéroport','een luchthaven'],['un sac à dos','een rugzak'],['un guide touristique','een reisgids'],['un musée','een museum'],
  ['un monument','een monument'],['un château','een kasteel'],['un camping','een camping'],['un plan','een plattegrond'],['une ville','een stad'],['une capitale','een hoofdstad'],
  ['une campagne','het platteland'],['une auberge de jeunesse','een jeugdherberg'],['une chambre','een kamer'],['une clé','een sleutel'],['une réservation','een reservatie'],
  ['une excursion','een uitstap'],['une promenade','een wandeling'],['une visite','een bezoek'],['historique','historisch'],['dangereux / dangereuse','gevaarlijk'],['sûr / sûre','veilig'],
  ['rapide','snel'],['lent / lente','traag'],['loin','ver'],['proche','dichtbij'],['magnifique','prachtig'],['complet / complète','volgeboekt'],['disponible','beschikbaar'],
  ['répondre','antwoorden'],['expliquer','uitleggen'],['bronzer','zonnebaden'],['faire du ski / du snowboard','skiën'],['faire du vélo','fietsen'],['faire de l\'escalade','klimmen'],
  ['faire du surf','surfen'],['faire de la planche à voile','windsurfen'],['faire du kite','kitesurfen'],['patiner','skeeleren / schaatsen'],['faire du parapente','parapenten'],['faire du golf','golfen'],
  ['faire de la plongée sous-marine','diepzeeduiken'],['faire du ski nautique','waterskiën'],
  ['Je cherche…','Ik zoek…'],['Pouvez-vous m\'aider ?','Kunt u mij helpen?'],['Je suis perdu(e).','Ik ben verloren.'],['Il y a…','Er is / er zijn…'],['C\'est combien ?','Hoeveel is dat?'],
  ['À quelle heure… ?','Hoe laat…?'],['Je prends… (le train)','Ik neem… (de trein)'],['C\'est magnifique !','Het is prachtig!'],['C\'est trop cher !','Het is te duur!'],['J\'adore voyager !','Ik hou van reizen!']
];
window.ELI_VOCAB = [...vocab, ...vocab2];

const kaartenWW = (lijst) => lijst.map(w => [w + ' (' + WW[w][6] + ') – vervoeg in het présent', WW[w].slice(0,6).map((f,i) => (i===0 && /^[aeéèêhiouy]/i.test(f) ? 'j\'' : window.ELI_PERS[i].split(' / ')[0] + ' ') + f).join(' · ')]);

window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'F1', vak:'fr', titel:'Vocabulaire: partons dans le monde',
  bron:[['Woordkaartjes partie 1', VOC]],
  samenvatting:[
    '<h4>🌍 Partons dans le monde!</h4><p>Woorden over <b>reizen</b>. Leer ze in <b>2 richtingen</b>: Frans → Nederlands én Nederlands → Frans.</p><p class="lp-tip">🔑 Leer elk zelfstandig naamwoord <b>mét lidwoord</b>: <b>un</b> = mannelijk, <b>une</b> = vrouwelijk. Een fout lidwoord = een fout!</p><p class="lp-kop">🧠 Zo leer je woorden het best</p><div class="lp-ketting"><span>👀 lees</span><i>→</i><span>🗣️ zeg hardop</span><i>→</i><span>✍️ schrijf 1×</span><i>→</i><span>🙈 test zonder kijken</span></div>',
    '<h4>🧳 Op reis</h4>' + wtab(vocab, [0,1,2,9,10,11,13,18,19]),
    '<h4>🚆 Vervoer</h4>' + wtab(vocab, [3,4,5,6,7,8,12]) + '<p class="lp-tip">💡 Alle vervoermiddelen hier zijn <b>mannelijk</b> (un). Alleen <b>une gare</b> (station) is vrouwelijk, maar dat is geen vervoermiddel!</p><h4 style="margin-top:12px">🏖️ Landschap</h4>' + wtab(vocab, [14,15,16,17]) + '<p class="muted klein">Die 4 zijn allemaal vrouwelijk: une plage, une mer, une montagne, une colline.</p>',
    '<h4>✨ Bijvoeglijke naamwoorden</h4>' + wtab(vocab, [20,21,22,23,24,25,26,27,28,29]) + '<p class="lp-tip">⚠️ Let op de <b>vrouwelijke vorm</b>: étranger → étrang<b>ère</b> · cher → ch<b>ère</b> · national → national<b>e</b> · culturel → culturel<b>le</b>. Eindigt een woord al op <b>-e</b> (moderne, célèbre)? Dan verandert er niets.</p>',
    '<h4>🏃 Werkwoorden</h4>' + wtab(vocab, [30,31,32,33,34,35,36,37,38,39,40,41,42,43,44]) + '<p class="muted klein">Weet je nog hoe je ze vervoegt? acheter (è), se promener (è), nager (nous nageons), partir (MESESODOPA), découvrir (zoals ouvrir), conduire (nous conduisons).</p>',
    '<h4>💬 Handige zinnetjes</h4>' + wtab(vocab, [45,46,47,48,49,53,54]) + '<h4 style="margin-top:12px">🧭 De weg vragen</h4>' + wtab(vocab, [50,51,52]) + '<p class="lp-tip">⚠️ In het Frans staat er een <b>spatie</b> vóór ? en ! : <i>Où est… ?</i> · <i>Bon voyage !</i></p>'
  ],
  kaarten: vocab.map(([f,n]) => [n, f]).concat(vocab.map(([f,n]) => [f, n])),
  quiz: vocab.slice(0).map(([f,n]) => ({t:'invul', v:'Vertaal naar het Frans: <b>' + n + '</b>', a:[f.replace(/ \/ .*/,''), f], fr:true}))
},
{
  id:'F2', vak:'fr', titel:'Indicatif présent: -er en bijzondere -er',
  bron:[['Résumé indicatif présent', RES],['Schéma', SCH],['Instructie', INS],['Instructievideo', VID]],
  samenvatting:[
    '<h4>🇫🇷 Het présent: wat en wanneer?</h4><p>Het <b>indicatif présent</b> = de <b>tegenwoordige tijd</b>: wat er <b>nu</b> gebeurt of wat je <b>altijd</b> doet. <i>Je parle français.</i> = Ik spreek Frans.</p><p>Je vervoegt in 2 stappen:</p><div class="lp-ketting"><span>1️⃣ infinitief <b>zonder -er</b> = stam</span><i>→</i><span>2️⃣ stam <b>+ uitgang</b></span></div><p class="muted klein">parler → parl → je parl<b>e</b></p><p class="lp-kop">👥 De persoonlijke voornaamwoorden</p><div class="lp-tegels t-blauw"><div><b>je / j’</b><small>ik</small></div><div><b>tu</b><small>jij</small></div><div><b>il / elle / on</b><small>hij / zij / men</small></div><div><b>nous</b><small>wij</small></div><div><b>vous</b><small>jullie</small></div><div><b>ils / elles</b><small>zij (mv.)</small></div></div><p class="lp-tip">💡 <b>je</b> wordt <b>j’</b> voor een klinker of stomme h: <i>j’achète, j’appuie</i>.</p>',
    '<h4>🗣️ Gewone werkwoorden op -er: PARLER</h4><p>Stam <b>parl-</b> + uitgangen <b>-e, -es, -e, -ons, -ez, -ent</b></p>' + vtab([['je','parl','e','ik spreek'],['tu','parl','es','jij spreekt'],['il/elle/on','parl','e','hij/zij/men spreekt'],['nous','parl','ons','wij spreken'],['vous','parl','ez','jullie spreken'],['ils/elles','parl','ent','zij spreken']]) + '<p class="lp-tip">👂 <b>-e, -es, -e, -ent</b> spreek je <b>niet</b> uit: parle, parles, parle, parlent klinken alle 4 hetzelfde! Alleen <b>-ons</b> en <b>-ez</b> hoor je.</p>',
    '<h4>🚗 De ezelsbrug A U T O</h4><p>Bij 2 soorten -er-werkwoorden verandert er iets <b>vóór de klinkers a, o, u</b> (de klinkers in het woord <b>A U T O</b>). In het présent gebeurt dat alleen bij <b>nous</b> (want daar komt <b>-ons</b>).</p><div class="lp-vs"><div><b>🍽️ -ger: MANGER</b>g + <b>e</b> vóór a/o/u<small>anders klinkt “mangons” als een harde g</small></div><div><b>🏁 -cer: COMMENCER</b>c → <b>ç</b> vóór a/o/u<small>anders klinkt “commencons” als een k</small></div></div><p>→ nous <b>mangeons</b> · nous <b>commençons</b><br>De andere personen blijven gewoon: je mange, tu commences …</p>',
    '<h4>🍽️ -ger: MANGER</h4>' + vtab([['je','mang','e','ik eet'],['tu','mang','es','jij eet'],['il/elle/on','mang','e','hij eet'],['nous','mang<b class="lp-x">e</b>','ons','wij eten'],['vous','mang','ez','jullie eten'],['ils/elles','mang','ent','zij eten']]) + '<p><b>Zoals manger:</b> nager (zwemmen) · changer (veranderen) · corriger (verbeteren) · déménager (verhuizen) · ranger (opruimen)</p><h4 style="margin-top:14px">🏁 -cer: COMMENCER</h4>' + vtab([['je','commenc','e','ik begin'],['tu','commenc','es','jij begint'],['il/elle/on','commenc','e','hij begint'],['nous','commen<b class="lp-x">ç</b>','ons','wij beginnen'],['vous','commenc','ez','jullie beginnen'],['ils/elles','commenc','ent','zij beginnen']]) + '<p><b>Zoals commencer:</b> annoncer (aankondigen) · avancer (vooruitgaan) · placer (plaatsen) · prononcer (uitspreken)</p>',
    '<h4>🛒 -e..er: ACHETER (e → è)</h4><p>Staat er een <b>e</b> in de voorlaatste lettergreep? Dan wordt die <b>è</b> als de uitgang <b>stom</b> is: bij <b>je, tu, il, ils</b>. Bij <b>nous</b> en <b>vous</b> blijft het <b>e</b>.</p>' + vtab([['j’','ach<b class="lp-x">è</b>t','e','ik koop'],['tu','ach<b class="lp-x">è</b>t','es','jij koopt'],['il/elle/on','ach<b class="lp-x">è</b>t','e','hij koopt'],['nous','achet','ons','wij kopen'],['vous','achet','ez','jullie kopen'],['ils/elles','ach<b class="lp-x">è</b>t','ent','zij kopen']]) + '<p><b>Zoals acheter:</b> (se) lever (opstaan) · se promener (wandelen) · amener (meebrengen, iemand) · emmener (meenemen)</p><p class="lp-tip">👟 Denk aan een <b>laars</b>: je, tu, il, ils vormen de laars → daar komt het accent.</p>',
    '<h4>🧽 -yer: APPUYER (y → i)</h4><p>De <b>y</b> wordt <b>i</b> vóór een <b>doffe e</b> (een e die je niet hoort): weer bij <b>je, tu, il, ils</b>. Bij <b>nous</b> en <b>vous</b> blijft de <b>y</b>.</p>' + vtab([['j’','appu<b class="lp-x">i</b>','e','ik steun'],['tu','appu<b class="lp-x">i</b>','es','jij steunt'],['il/elle/on','appu<b class="lp-x">i</b>','e','hij steunt'],['nous','appuy','ons','wij steunen'],['vous','appuy','ez','jullie steunen'],['ils/elles','appu<b class="lp-x">i</b>','ent','zij steunen']]) + '<p><b>Zoals appuyer:</b> payer (betalen) · essayer (proberen) · nettoyer (schoonmaken) · s’ennuyer (zich vervelen)</p>',
    '<h4>🤔 Welke regel? Stel jezelf de vraag</h4><div class="lp-stroom"><div><span>Eindigt op <u>-ger</u> en het is <u>nous</u>?</span><b>+e: mangeons</b></div><div><span>Eindigt op <u>-cer</u> en het is <u>nous</u>?</span><b>ç: commençons</b></div><div><span><u>e</u> in de voorlaatste lettergreep, bij je/tu/il/ils?</span><b>è: achète</b></div><div><span>Eindigt op <u>-yer</u>, bij je/tu/il/ils?</span><b>i: paie</b></div><div><span>Geen van allemaal?</span><b>gewoon: parle</b></div></div><p class="lp-tip">⚠️ Valkuil: bij <b>nous</b> en <b>vous</b> van acheter en appuyer verandert er <b>niets</b>: nous achetons, vous payez.</p>'
  ],
  kaarten: kaartenWW(['parler','manger','commencer','acheter','appuyer','nager','placer','lever','payer','nettoyer']),
  quiz:[
    {t:'mc',v:'nous (manger) → ?',o:['mangeons','mangons','mangeont','mangez'],a:0},
    {t:'mc',v:'nous (commencer) → ?',o:['commençons','commencons','commenceons','commençez'],a:0},
    {t:'mc',v:'j\' (acheter) → ?',o:['achète','achete','achètte','achetes'],a:0},
    {t:'mc',v:'ils (appuyer) → ?',o:['appuient','appuyent','appuyont','appuies'],a:0},
    {t:'mc',v:'Waarom schrijf je "nous mangeons" met een e?',o:['Om de g zacht te houden vóór de o','Omdat het een onregelmatig werkwoord is','Omdat nous altijd -eons krijgt','Om de meervoudsvorm te tonen'],a:0},
    {t:'jf',v:'Bij -yer-werkwoorden wordt de y een i vóór een doffe e (je paie).',a:true},
    {t:'jf',v:'Bij acheter krijgt ook nous een accent: nous achètons.',a:false,u:'nous achetons, vous achetez: daar geen accent.'}
  ],
  drill:{ww:['parler','manger','nager','changer','ranger','commencer','avancer','placer','acheter','lever','amener','appuyer','payer','nettoyer','essayer']}
},
{
  id:'F3', vak:'fr', titel:'Indicatif présent: -ir en -re',
  bron:[['Résumé indicatif présent p. 3–6', RES],['Schéma', SCH]],
  samenvatting:[
    '<h4>🗺️ 6 types: -ir en -re</h4><p>Werkwoorden op <b>-ir</b> en <b>-re</b> vervoeg je niet allemaal hetzelfde. Er zijn <b>6 types</b>. Leer per type <b>1 voorbeeld</b> goed, dan ken je de hele groep.</p><div class="lp-rij"><span class="lp-vraag">-ir</span></div><div class="lp-tegels t-blauw"><div><i>🚪</i><b>sortir</b><small>MESESODOPA</small></div><div><i>🏁</i><b>finir</b><small>-iss- in mv.</small></div><div><i>📦</i><b>ouvrir</b><small>zoals -er</small></div></div><div class="lp-rij"><span class="lp-vraag">-re</span></div><div class="lp-tegels t-groen"><div><i>⏳</i><b>attendre</b><small>il attend (niets)</small></div><div><i>🚗</i><b>conduire</b><small>+s in mv.</small></div><div><i>🎨</i><b>peindre</b><small>gn in mv.</small></div></div>',
    '<h4>🚪 -ir type SORTIR</h4><p><b>Enkelvoud</b>: stam <b>zonder de laatste medeklinker</b> + <b>-s, -s, -t</b><br><b>Meervoud</b>: volledige stam + <b>-ons, -ez, -ent</b></p>' + vtab([['je','sor','s','ik ga buiten'],['tu','sor','s','jij gaat buiten'],['il/elle/on','sor','t','hij gaat buiten'],['nous','sort','ons','wij gaan buiten'],['vous','sort','ez','jullie gaan buiten'],['ils/elles','sort','ent','zij gaan buiten']]) + '<p class="lp-tip">🧠 Ezelsbrug <b>MESESODOPA</b>: <b>ME</b>ntir (liegen) · <b>SE</b>ntir (voelen) · <b>SO</b>rtir (buitengaan) · <b>DO</b>rmir (slapen) · <b>PA</b>rtir (vertrekken)<br>→ je dors, il dort, nous dormons · je pars, nous partons</p>',
    '<h4>🏁 -ir type FINIR</h4><p>Stam <b>fin-</b> + <b>-is, -is, -it, -issons, -issez, -issent</b></p>' + vtab([['je','fin','is','ik beëindig'],['tu','fin','is','jij beëindigt'],['il/elle/on','fin','it','hij beëindigt'],['nous','fin','issons','wij beëindigen'],['vous','fin','issez','jullie beëindigen'],['ils/elles','fin','issent','zij beëindigen']]) + '<p class="lp-tip">🔑 Herkenbaar aan de <b>-iss-</b> in het meervoud. Zo ook: choisir, remplir, réfléchir …</p>',
    '<h4>📦 -ir type OUVRIR</h4><p>Raar maar waar: die vervoeg je <b>zoals een -er-werkwoord</b>! Stam <b>ouvr-</b> + <b>-e, -es, -e, -ons, -ez, -ent</b></p>' + vtab([['j’','ouvr','e','ik open'],['tu','ouvr','es','jij opent'],['il/elle/on','ouvr','e','hij opent'],['nous','ouvr','ons','wij openen'],['vous','ouvr','ez','jullie openen'],['ils/elles','ouvr','ent','zij openen']]) + '<p><b>Zoals ouvrir:</b> découvrir (ontdekken) · couvrir (bedekken) · offrir (aanbieden) · souffrir (lijden)</p>',
    '<h4>⏳ -re type ATTENDRE</h4><p>Stam <b>attend-</b> + <b>-s, -s, — (niets!), -ons, -ez, -ent</b></p>' + vtab([['j’','attend','s','ik wacht'],['tu','attend','s','jij wacht'],['il/elle/on','attend','','hij wacht'],['nous','attend','ons','wij wachten'],['vous','attend','ez','jullie wachten'],['ils/elles','attend','ent','zij wachten']]) + '<p class="lp-tip">⚠️ Bij <b>il/elle/on</b> komt er <b>niets</b> achter: <b>il attend</b> (géén t!).</p><p><b>Zoals attendre:</b> défendre (verdedigen) · descendre (naar beneden gaan) · entendre (horen) · perdre (verliezen) · répondre (antwoorden) · vendre (verkopen)</p>',
    '<h4>🚗 -re type CONDUIRE</h4><p>Enkelvoud: <b>-s, -s, -t</b> · Meervoud: er komt een <b>s</b> bij: <b>-sons, -sez, -sent</b></p>' + vtab([['je','condui','s','ik rijd'],['tu','condui','s','jij rijdt'],['il/elle/on','condui','t','hij rijdt'],['nous','condui<b class="lp-x">s</b>','ons','wij rijden'],['vous','condui<b class="lp-x">s</b>','ez','jullie rijden'],['ils/elles','condui<b class="lp-x">s</b>','ent','zij rijden']]) + '<p><b>Zoals conduire:</b> construire (bouwen) · cuire (koken) · détruire (vernielen) · produire (produceren) · traduire (vertalen)</p>',
    '<h4>🎨 -re type PEINDRE</h4><p>Enkelvoud: <b>pein-</b> + <b>-s, -s, -t</b> · Meervoud: <b>peign-</b> + <b>-ons, -ez, -ent</b> (de <b>d</b> wordt <b>gn</b>)</p>' + vtab([['je','pein','s','ik schilder'],['tu','pein','s','jij schildert'],['il/elle/on','pein','t','hij schildert'],['nous','pei<b class="lp-x">gn</b>','ons','wij schilderen'],['vous','pei<b class="lp-x">gn</b>','ez','jullie schilderen'],['ils/elles','pei<b class="lp-x">gn</b>','ent','zij schilderen']]) + '<p><b>Zoals peindre:</b> craindre (vrezen) · joindre (verbinden) · (se) plaindre (de) (klagen over) · rejoindre (vervoegen)</p>',
    '<h4>🤔 Welk type? Kijk naar het meervoud</h4><div class="lp-stroom"><div><span>MEntir, SEntir, SOrtir, DOrmir, PArtir?</span><b>je sors · nous sortons</b></div><div><span>-ir met <u>-iss-</u> (finir, choisir)</span><b>nous finissons</b></div><div><span>ouvrir, couvrir, offrir, souffrir</span><b>j’ouvre (zoals -er)</b></div><div><span>-dre zoals attendre, vendre</span><b>il attend (niets)</b></div><div><span>-uire zoals conduire</span><b>nous conduisons</b></div><div><span>-indre zoals peindre, craindre</span><b>nous peignons</b></div></div>'
  ],
  kaarten: kaartenWW(['sortir','dormir','finir','choisir','ouvrir','offrir','attendre','répondre','conduire','construire','peindre','craindre']),
  quiz:[
    {t:'mc',v:'Wat betekent MESESODOPA?',o:['mentir, sentir, sortir, dormir, partir','manger, sentir, sortir, donner, parler','mettre, servir, souffrir, dire, payer','een Frans dorp'],a:0},
    {t:'mc',v:'nous (finir) → ?',o:['finissons','finons','finisons','finissez'],a:0},
    {t:'mc',v:'il (attendre) → ?',o:['attend','attendt','attende','attends'],a:0},
    {t:'mc',v:'nous (peindre) → ?',o:['peignons','peindons','peinons','peindrons'],a:0},
    {t:'mc',v:'ils (conduire) → ?',o:['conduisent','conduient','conduirent','conduisont'],a:0},
    {t:'mc',v:'tu (ouvrir) → ?',o:['ouvres','ouvris','ouvrs','ouvrez'],a:0},
    {t:'jf',v:'Ouvrir vervoeg je in het présent als een -er-werkwoord.',a:true},
    {t:'jf',v:'Il dort krijgt een -t, il attend krijgt géén -t.',a:true}
  ],
  drill:{ww:['sortir','partir','dormir','sentir','mentir','finir','choisir','remplir','réfléchir','ouvrir','découvrir','offrir','souffrir','attendre','vendre','répondre','perdre','descendre','entendre','conduire','construire','traduire','détruire','produire','peindre','craindre','joindre']}
},
{
  id:'F4', vak:'fr', titel:'Onregelmatige werkwoorden (présent)',
  bron:[['Flashcards verbes irréguliers', IRR],['Lijst werkwoorden', LST]],
  samenvatting:[
    '<h4>🧱 Onregelmatige werkwoorden</h4><p>Bij deze werkwoorden werkt de gewone regel (stam + uitgang) <b>niet</b>. Je moet ze <b>vanbuiten</b> kennen. In je flashcards staan er <b>26</b>.</p><p class="lp-tip">💪 Methode: leer er <b>5 per dag</b>, zeg ze <b>hardop</b> op, en typ ze daarna zonder te kijken in de <b>Werkwoorden-sprint</b>.</p><p class="lp-kop">🔑 Goed nieuws: veel hebben <b>dezelfde uitgangen</b></p><div class="lp-tegels"><div><i>1️⃣</i><b>-s · -s · -t</b><small>je, tu, il (bijna altijd)</small></div><div><i>👥</i><b>-ons · -ez</b><small>nous, vous</small></div><div><i>👪</i><b>-ent</b><small>ils/elles</small></div></div>',
    '<h4>⭐ De grote 4</h4>' + itab(['avoir','être']) + itab(['aller','faire']) + '<p class="lp-tip">⚠️ Valkuilen: <b>vous êtes, vous faites</b> (geen -ez!) en <b>ils sont, ils ont, ils vont, ils font</b> (allemaal op <b>-ont</b>).</p>',
    '<h4>🙋 Willen, kunnen, moeten, weten</h4>' + itab(['vouloir','pouvoir']) + itab(['devoir','savoir']) + '<p class="lp-tip">💡 je en tu eindigen op <b>-x</b> bij vouloir en pouvoir: <b>je veux, je peux</b>. Bij ils verandert de stam: <b>veulent, peuvent, doivent</b>.</p>',
    '<h4>🔄 Stam verandert bij nous en vous</h4><p>Bij deze werkwoorden lijken <b>nous</b> en <b>vous</b> op de infinitief, maar de andere vormen niet.</p>' + itab(['boire','recevoir']) + itab(['venir','tenir','prendre']) + '<p class="lp-tip">⚠️ <b>reçois</b> met ç, maar <b>nous recevons</b> zonder. <b>ils prennent</b> met 2 n, <b>ils viennent, ils tiennent</b> met 2 n.</p>',
    '<h4>✍️ Werkwoorden op -re</h4>' + itab(['dire','écrire','lire']) + itab(['mettre','rire']) + '<p class="lp-tip">⚠️ <b>vous dites</b> (net als vous faites en vous êtes)! <b>je mets</b> met één t, <b>nous mettons</b> met twee.</p>',
    '<h4>🟰 Opgelet: dezelfde vorm!</h4>' + itab(['suivre','vivre']) + '<div class="lp-vs"><div><b>être</b><u>je suis</u> = ik <u>ben</u></div><div><b>suivre</b><u>je suis</u> = ik <u>volg</u></div></div><p>Uit de zin moet je halen welk werkwoord het is: <i>Je suis le guide</i> = ik volg de gids.</p>',
    '<h4>🧩 De rest</h4>' + itab(['connaître','croire','voir']) + itab(['courir','mourir','envoyer']) + '<p class="lp-tip">⚠️ <b>il connaît</b> met een accent circonflexe. <b>nous croyons, nous voyons</b> met <b>y</b>. <b>je meurs</b> maar <b>nous mourons</b>.</p>'
  ],
  kaarten: kaartenWW(['être','avoir','aller','faire','vouloir','pouvoir','devoir','savoir','boire','connaître','courir','croire','dire','écrire','envoyer','lire','mettre','mourir','prendre','recevoir','rire','suivre','tenir','venir','vivre','voir']),
  quiz:[
    {t:'mc',v:'vous (faire) → ?',o:['faites','faisez','fais','font'],a:0},
    {t:'mc',v:'vous (dire) → ?',o:['dites','disez','dis','disent'],a:0},
    {t:'mc',v:'ils (aller) → ?',o:['vont','allent','vais','allons'],a:0},
    {t:'mc',v:'nous (boire) → ?',o:['buvons','boivons','boirons','boisons'],a:0},
    {t:'mc',v:'ils (prendre) → ?',o:['prennent','prendent','prenent','prends'],a:0},
    {t:'mc',v:'je (recevoir) → ?',o:['reçois','recois','reçevois','reçoit'],a:0},
    {t:'mc',v:'"je suis" kan twee dingen betekenen. Welke?',o:['ik ben / ik volg','ik ben / ik zie','ik heb / ik volg','ik ga / ik ben'],a:0},
    {t:'mc',v:'ils (vouloir) → ?',o:['veulent','voulent','veuillent','voulont'],a:0}
  ],
  drill:{ww:['être','avoir','aller','faire','vouloir','pouvoir','devoir','savoir','boire','connaître','courir','croire','dire','écrire','envoyer','lire','mettre','mourir','prendre','recevoir','rire','suivre','tenir','venir','vivre','voir']}
},
{
  id:'F5', vak:'fr', titel:'L\'impératif présent',
  bron:[['Résumé impératif', IMP],['L\'impératif présent', IMPI]],
  samenvatting:[
    '<h4>📣 De gebiedende wijs (l\'impératif)</h4><p>Je geeft een <b>bevel</b>. Er zijn <b>3 vormen</b>, en er staat <b>geen onderwerp</b> bij.</p><div class="lp-tegels"><div><i>👉</i><b>tu</b><small>tegen één persoon</small></div><div><i>👥</i><b>nous</b><small>= laten we …</small></div><div><i>🙋</i><b>vous</b><small>tegen meerdere personen, of beleefd</small></div></div>',
    '<h4>🔧 Zo maak je het</h4><table class="lp-ww lp-irr"><tr><th></th><th>ouvrir</th><th>manger</th><th>finir</th></tr><tr><td>tu<br><small>= je-vorm</small></td><td><b>Ouvre !</b></td><td><b>Mange !</b></td><td><b>Finis !</b></td></tr><tr><td>nous<br><small>= nous-vorm</small></td><td><b>Ouvrons !</b></td><td><b>Mangeons !</b></td><td><b>Finissons !</b></td></tr><tr><td>vous<br><small>= vous-vorm</small></td><td><b>Ouvrez !</b></td><td><b>Mangez !</b></td><td><b>Finissez !</b></td></tr></table><div class="lp-vs"><div><b>❌ fout</b><u>Manges !</u></div><div><b>✅ juist</b><u>Mange !</u><small>bij -er-werkwoorden (en ouvrir) valt de <b>-s van tu</b> weg</small></div></div>',
    '<h4>⭐ Speciale vormen</h4><table class="lp-ww lp-irr"><tr><th></th><th>tu</th><th>nous</th><th>vous</th></tr><tr><td>être</td><td><b>sois</b></td><td><b>soyons</b></td><td><b>soyez</b></td></tr><tr><td>avoir</td><td><b>aie</b></td><td><b>ayons</b></td><td><b>ayez</b></td></tr><tr><td>aller</td><td><b>va</b></td><td><b>allons</b></td><td><b>allez</b></td></tr><tr><td>savoir</td><td><b>sache</b></td><td><b>sachons</b></td><td><b>sachez</b></td></tr><tr><td>vouloir</td><td><b>veuille</b></td><td><b>veuillons</b></td><td><b>veuillez</b></td></tr></table><p class="lp-tip">💡 <b>Veuillez …</b> = gelieve … Dat zie je vaak op bordjes en in brieven.</p>'
  ],
  kaarten:[
    ['être – impératif (tu, nous, vous)','sois · soyons · soyez'],['avoir – impératif','aie · ayons · ayez'],['aller – impératif','va · allons · allez'],
    ['savoir – impératif','sache · sachons · sachez'],['vouloir – impératif','veuille · veuillons · veuillez'],
    ['Regel impératif "tu"','Neem de je-vorm (Mange ! Ouvre ! Finis !)'],['Regel impératif "nous" en "vous"','Neem de nous- en vous-vorm zonder onderwerp'],
    ['Wees braaf! (tu)','Sois sage !'],['Laten we gaan!','Allons-y ! / Allons !'],['Gelieve te wachten (vous)','Veuillez attendre.'],['Ga! (tu)','Va !'],['Heb geduld! (vous)','Ayez de la patience !']
  ],
  quiz:[
    {t:'mc',v:'Tu manges une tarte. → impératif?',o:['Mange une tarte !','Manges une tarte !','Mangez une tarte !','Mangeons une tarte !'],a:0},
    {t:'mc',v:'Nous ouvrons la valise. → impératif?',o:['Ouvrons la valise !','Ouvre la valise !','Ouvrez la valise !','Ouvrir la valise !'],a:0},
    {t:'mc',v:'impératif van être (tu)?',o:['sois','es','soit','suis'],a:0},
    {t:'mc',v:'impératif van aller (tu)?',o:['va','vas','allez','vais'],a:0},
    {t:'mc',v:'"Veuillez" betekent…',o:['gelieve','laten we willen','wees','ga'],a:0},
    {t:'invul',v:'impératif van avoir (vous): …',a:['ayez'],fr:true},
    {t:'invul',v:'impératif van savoir (nous): …',a:['sachons'],fr:true},
    {t:'invul',v:'Tu finis tes devoirs. → … tes devoirs !',a:['finis','Finis'],fr:true},
    {t:'invul',v:'Vous partez. → … !',a:['partez','Partez'],fr:true}
  ]
},
{
  id:'F6', vak:'fr', titel:'Passé composé (participes)',
  bron:[['Lijst regelmatige en onregelmatige werkwoorden', LST]],
  samenvatting:[
    '<h4>⏪ Passé composé</h4><p class="lp-kop" style="text-align:center">avoir / être (présent) + participe passé</p><div class="lp-vs"><div><b>avoir</b>j\'<u>ai</u> joué</div><div><b>être</b>je <u>suis</u> allé</div></div>',
    '<h4>🔧 Regelmatige participes</h4><table class="lp-ww lp-irr"><tr><th>infinitief</th><th>participe</th><th>voorbeeld</th></tr><tr><td>-er</td><td><b>-é</b></td><td>jouer → <b>joué</b></td></tr><tr><td>-re</td><td><b>-u</b></td><td>perdre → <b>perdu</b></td></tr><tr><td>-ir (finir)</td><td><b>-i</b></td><td>finir → <b>fini</b></td></tr><tr><td>-ir (sortir)</td><td><b>-i</b></td><td>dormir → <b>dormi</b></td></tr><tr><td>-ir (ouvrir)</td><td><b>-ert</b></td><td>ouvrir → <b>ouvert</b></td></tr></table><p class="lp-tip">💡 Net als ouvert: <b>offert, découvert, souffert</b>.</p>',
    '<h4>🚶 Met être: bewegingswerkwoorden</h4><div class="lp-ketting"><span>entrer</span><span>rentrer</span><span>monter</span><span>tomber</span><span>arriver</span><span>rester</span><span>retourner</span><span>descendre</span><span>partir</span><span>sortir</span><span>aller</span><span>venir</span><span>mourir</span></div><p class="lp-tip">🏠 Denk aan een <b>huis</b>: je komt binnen (<b>entrer</b>), gaat de trap op (<b>monter</b>) en af (<b>descendre</b>), valt (<b>tomber</b>), blijft (<b>rester</b>), gaat weg (<b>partir, sortir</b>) …</p>',
    '<h4>⭐ Onregelmatige participes (1)</h4><table class="lp-ww lp-irr"><tr><td>avoir</td><td><b>eu</b></td><td>être</td><td><b>été</b></td></tr><tr><td>faire</td><td><b>fait</b></td><td>boire</td><td><b>bu</b></td></tr><tr><td>connaître</td><td><b>connu</b></td><td>courir</td><td><b>couru</b></td></tr><tr><td>croire</td><td><b>cru</b></td><td>devoir</td><td><b>dû</b></td></tr><tr><td>dire</td><td><b>dit</b></td><td>écrire</td><td><b>écrit</b></td></tr><tr><td>envoyer</td><td><b>envoyé</b></td><td>lire</td><td><b>lu</b></td></tr><tr><td>mettre</td><td><b>mis</b></td><td>mourir</td><td><b>mort</b></td></tr></table>',
    '<h4>⭐ Onregelmatige participes (2)</h4><table class="lp-ww lp-irr"><tr><td>pouvoir</td><td><b>pu</b></td><td>prendre</td><td><b>pris</b></td></tr><tr><td>recevoir</td><td><b>reçu</b></td><td>rire</td><td><b>ri</b></td></tr><tr><td>savoir</td><td><b>su</b></td><td>suivre</td><td><b>suivi</b></td></tr><tr><td>tenir</td><td><b>tenu</b></td><td>venir</td><td><b>venu</b></td></tr><tr><td>vivre</td><td><b>vécu</b></td><td>voir</td><td><b>vu</b></td></tr><tr><td>vouloir</td><td><b>voulu</b></td><td></td><td></td></tr></table><p class="lp-tip">💡 Veel eindigen op <b>-u</b>: bu, connu, couru, cru, lu, pu, reçu, su, tenu, venu, vécu, vu, voulu.</p>'
  ],
  kaarten: Object.entries(window.ELI_PC).filter(([w]) => ['avoir','être','faire','boire','connaître','courir','croire','devoir','dire','écrire','lire','mettre','mourir','pouvoir','prendre','recevoir','rire','savoir','suivre','tenir','venir','vivre','voir','vouloir','ouvrir','offrir','aller','tomber','partir'].includes(w))
            .map(([w,[h,p,nl]]) => [w + ' (' + nl + ') – passé composé, 1e persoon', (h === 'avoir' ? 'j\'ai ' : 'je suis ') + p]),
  quiz:[
    {t:'mc',v:'participe passé van prendre?',o:['pris','prendu','prit','prené'],a:0},
    {t:'mc',v:'participe passé van voir?',o:['vu','voi','voyé','vis'],a:0},
    {t:'mc',v:'Welk werkwoord vervoeg je met être?',o:['tomber','manger','prendre','voir'],a:0},
    {t:'mc',v:'participe passé van ouvrir?',o:['ouvert','ouvri','ouvré','ouvru'],a:0},
    {t:'invul',v:'Je (boire) → j\'ai …',a:['bu'],fr:true},
    {t:'invul',v:'Je (venir) → je suis …',a:['venu','venu(e)'],fr:true},
    {t:'invul',v:'Je (faire) → j\'ai …',a:['fait'],fr:true},
    {t:'invul',v:'Je (vivre) → j\'ai …',a:['vécu'],fr:true}
  ],
  drillPC:true
}
,{
  id:'F7', vak:'fr', titel:'Vocabulaire partie 2: en voyage',
  bron:[['Woordkaartjes partie 2', VOC2]],
  samenvatting:[
    '<h4>✈️ En voyage: deel 2</h4><p>Woorden voor <b>logeren</b>, <b>bezoeken</b>, <b>sporten</b> op reis en handige <b>zinnen</b>. Leer ze in <b>2 richtingen</b> en altijd <b>mét lidwoord</b> (un/une).</p><div class="lp-tegels"><div><i>🏨</i><b>logeren</b></div><div><i>🏰</i><b>bezoeken</b></div><div><i>🏄</i><b>sporten</b></div></div>',
    '<h4>🏨 Reizen en logeren</h4>' + wtab(vocab2, [0,1,2,3,4,8,13,14,15,16]),
    '<h4>🏰 Bezoeken</h4>' + wtab(vocab2, [5,6,7,9,10,11,12,17,18,19]) + '<p class="lp-tip">⚠️ Valkuil: <b>un plan</b> = een <b>plattegrond</b> (van een stad). Een landkaart is <b>une carte</b> (deel 1).</p>',
    '<h4>✨ Bijvoeglijke naamwoorden</h4>' + wtab(vocab2, [20,21,22,23,24,25,26,27,28,29]) + '<p class="lp-tip">⚠️ Vrouwelijke vormen: dangereux → dangereu<b>se</b> · sûr → sû<b>re</b> · lent → len<b>te</b> · complet → compl<b>ète</b>.<br>Complet voor een hotel = <b>volgeboekt</b> (niet “plein”).</p>',
    '<h4>🏄 Sporten met FAIRE</h4><div class="lp-stroom"><div><span>mannelijke sport (le ski)</span><b>faire <u>du</u> ski</b></div><div><span>vrouwelijke sport (la plongée)</span><b>faire <u>de la</u> plongée</b></div><div><span>sport met een klinker (l’escalade)</span><b>faire <u>de l’</u>escalade</b></div></div>' + wtab(vocab2, [33,34,35,36,37,38,40,41,42,43]) + '<p class="lp-tip">💡 Uitzonderingen zonder faire: <b>patiner</b> (skeeleren/schaatsen) en <b>bronzer</b> (zonnebaden) zijn gewone werkwoorden.</p><h4 style="margin-top:12px">🗣️ Andere werkwoorden</h4>' + wtab(vocab2, [30,31,32,39]),
    '<h4>💬 Handige zinnen</h4>' + wtab(vocab2, [44,45,46,47,48,49,50,51,52,53]) + '<p class="lp-tip">⚠️ <b>Pouvez-vous m’aider ?</b> → het voornaamwoord (me) staat <b>vóór</b> het werkwoord: m’aider, niet “aider moi”.<br>Je suis perdu<b>(e)</b>: met <b>e</b> als een meisje het zegt.</p>'
  ],
  kaarten: vocab2.map(([f,n]) => [n, f]).concat(vocab2.map(([f,n]) => [f, n])),
  quiz: vocab2.map(([f,n]) => ({t:'invul', v:'Vertaal naar het Frans: <b>' + n + '</b>', a:[f.replace(/ \/ .*/,''), f], fr:true})).concat([
    {t:'mc',v:'Het hotel is volgeboekt. → L\'hôtel est …',o:['complet','plein','disponible','fermé'],a:0,w:['','Plein = vol (bv. een glas), maar voor een hotel zeg je complet.','Disponible = beschikbaar, dus net het omgekeerde.','Fermé = gesloten, niet volgeboekt.']},
    {t:'mc',v:'Vrouwelijke vorm van dangereux?',o:['dangereuse','dangereuxe','dangereusse','dangereux'],a:0,w:['','-eux wordt -euse, niet -euxe.','Eén s: dangereu-se.','Dat is de mannelijke vorm.']},
    {t:'mc',v:'Hoe zeg je "Kunt u mij helpen?"',o:['Pouvez-vous m\'aider ?','Vous pouvez aider moi ?','Est-ce que tu m\'aides ?','Pouvez-vous aider ?'],a:0,w:['','"aider moi" is fout: het voornaamwoord staat vóór het werkwoord (m\'aider).','Dat is "Help jij mij?", en met tu in plaats van u.','Dan zeg je niet "mij".']}
  ])
},
{
  id:'F8', vak:'fr', titel:'La question: vragen stellen',
  bron:[['Résumé La question', QRES],['Schéma La question', QSCH]],
  samenvatting:[
    '<h4>❓ 3 manieren om een vraag te stellen</h4><div class="lp-tegels"><div><i>🎵</i><b>intonation</b><small>stem omhoog</small></div><div><i>🔄</i><b>inversion</b><small>werkwoord en onderwerp omdraaien, met een streepje</small></div><div><i>🗨️</i><b>est-ce que</b><small>vooraan toevoegen</small></div></div>',
    '<h4>📝 Zonder en met vraagwoord</h4><table class="lp-ww lp-irr"><tr><th></th><th>zonder vraagwoord</th><th>met vraagwoord</th></tr><tr><td>🎵</td><td>Tu aimes la danse ?</td><td>Tu danses <b>quand</b> ?</td></tr><tr><td>🔄</td><td><b>Aimes-tu</b> la danse ?</td><td>Quand <b>danses-tu</b> ?</td></tr><tr><td>🗨️</td><td><b>Est-ce que</b> tu aimes la danse ?</td><td>Quand <b>est-ce que</b> tu danses ?</td></tr></table><p class="lp-tip">💡 Bij intonation staat het vraagwoord <b>achteraan</b>.</p>',
    '<h4>🔄 Inversion: let op!</h4><div class="lp-tegels k2"><div><i>🅃</i><b>-t- tussen 2 klinkers</b><small>Paul joue-<b>t</b>-il de la guitare ?</small></div><div><i>👤</i><b>naam of zelfst. nw.?</b><small>herhaal met il/elle: <b>Paul</b> joue-t-<b>il</b> … ?</small></div></div><p>Comment ces étudiants voyagent-<b>ils</b> ? Of zonder streepje: Comment voyagent ces étudiants ?</p><div class="lp-vs"><div><b>est-ce que + klinker</b><u>est-ce qu\'</u></div><div><b>voorbeeld</b>Est-ce <u>qu\'on</u> a des tickets ?<small>Où est-ce qu\'on va manger ?</small></div></div>',
    '<h4>🔤 Vraagwoorden</h4><table class="lp-ww lp-irr"><tr><td><b>qui</b></td><td>wie</td><td><b>quand</b></td><td>wanneer</td></tr><tr><td><b>quoi</b></td><td>wat</td><td><b>comment</b></td><td>hoe</td></tr><tr><td><b>quel / quelle</b></td><td>welke</td><td><b>pourquoi</b></td><td>waarom</td></tr><tr><td><b>où</b></td><td>waar</td><td><b>à quelle heure</b></td><td>hoe laat</td></tr></table><table class="lp-ww lp-irr"><tr><td><b>avec / pour qui</b></td><td>met / voor wie</td></tr><tr><td><b>à qui</b></td><td>aan / tegen wie</td></tr><tr><td><b>combien de fois</b></td><td>hoeveel keer</td></tr><tr><td><b>combien de temps</b></td><td>hoelang</td></tr><tr><td><b>en quelle année</b></td><td>in welk jaar</td></tr><tr><td><b>de quelle manière</b></td><td>op welke manier</td></tr></table>'
  ],
  kaarten:[
    ['wie?','qui ?'],['wat?','quoi ?'],['welke…?','quel / quelle … ?'],['wanneer?','quand ?'],['hoe?','comment ?'],['hoe laat?','à quelle heure ?'],['waarom?','pourquoi ?'],
    ['waar?','où ?'],['met / voor wie?','avec / pour qui ?'],['aan / tegen wie?','à qui ?'],['hoeveel keer?','combien de fois ?'],['hoelang?','combien de temps ?'],['in welk jaar?','en quelle année ?'],['op welke manier?','de quelle manière ?'],
    ['De 3 manieren om een vraag te stellen','intonation · inversion · est-ce que'],
    ['Tu aimes la danse ? → inversion','Aimes-tu la danse ?'],['Tu aimes la danse ? → est-ce que','Est-ce que tu aimes la danse ?'],
    ['Tu danses quand ? → inversion','Quand danses-tu ?'],['Tu danses quand ? → est-ce que','Quand est-ce que tu danses ?'],
    ['Wanneer zet je -t- bij inversion?','Tussen twee klinkers: joue-t-il, a-t-elle, parle-t-on'],['est-ce que + klinker','est-ce qu\' (Est-ce qu\'il vient ?)']
  ],
  quiz:[
    {t:'mc',v:'Welke vraag gebruikt <b>inversion</b>?',o:['Avez-vous une chambre ?','Vous avez une chambre ?','Est-ce que vous avez une chambre ?','Vous avez une chambre quand ?'],a:0,w:['','Dat is intonation: zelfde volgorde als een gewone zin.','Dat is de vraag met est-ce que.','Dat is intonation met het vraagwoord achteraan.']},
    {t:'mc',v:'Paul joue de la guitare. → inversion?',o:['Paul joue-t-il de la guitare ?','Joue Paul de la guitare ?','Joue-il Paul de la guitare ?','Paul joue-il de la guitare ?'],a:0,w:['','Met een naam als onderwerp herhaal je het als il: Paul joue-t-il…','Je hebt -t- nodig tussen de twee klinkers (joue-t-il).','Tussen e en i (twee klinkers) moet een -t-.']},
    {t:'mc',v:'Waarom staat er een -t- in "Parle-t-elle français ?"',o:['Tussen twee klinkers zet je een -t-','Omdat het een vrouw is','Omdat parler onregelmatig is','Omdat het een vraag in de passé composé is'],a:0,w:['','Het heeft niets met mannelijk/vrouwelijk te maken: ook parle-t-il.','Parler is een gewoon -er-werkwoord.','Parle is de présent.']},
    {t:'mc',v:'Est-ce que + on → ?',o:['Est-ce qu\'on','Est-ce que on','Est-ce qu on','Est-qu\'on'],a:0,w:['','Klinkerbotsing: que + klinker wordt qu\'.','Je mag geen spatie laten, je zet een apostrof: qu\'.','Est-ce blijft altijd staan.']},
    {t:'mc',v:'Tu danses quand ? → met est-ce que?',o:['Quand est-ce que tu danses ?','Est-ce que tu danses quand ?','Quand est-ce que danses-tu ?','Est-ce quand tu danses ?'],a:0,w:['','Het vraagwoord komt vóór est-ce que.','Na est-ce que blijft de gewone volgorde: tu danses (geen inversion).','Deze volgorde bestaat niet.']},
    {t:'mc',v:'"combien de temps" betekent…',o:['hoelang','hoeveel keer','hoe laat','wanneer'],a:0,w:['','Hoeveel keer = combien de fois.','Hoe laat = à quelle heure.','Wanneer = quand.']},
    {t:'mc',v:'Welke vraag is <b>intonation</b> met vraagwoord?',o:['Vous savez pourquoi ?','Pourquoi savez-vous ?','Pourquoi est-ce que vous savez ?','Savez-vous ?'],a:0,w:['','Dat is inversion (werkwoord-onderwerp).','Dat is de vorm met est-ce que.','Dat is inversion zonder vraagwoord.']},
    {t:'jf',v:'Bij een vraag met intonation is de woordvolgorde dezelfde als in een gewone zin.',a:true},
    {t:'jf',v:'Na "est-ce que" draai je het werkwoord en het onderwerp om.',a:false,u:'Na est-ce que blijft de gewone volgorde: Est-ce que tu viens ?'},
    {t:'invul',v:'Vertaal het vraagwoord: <b>waarom?</b>',a:['pourquoi','pourquoi ?'],fr:true},
    {t:'invul',v:'Vertaal het vraagwoord: <b>hoe laat?</b>',a:['à quelle heure','à quelle heure ?','a quelle heure'],fr:true},
    {t:'invul',v:'Vertaal het vraagwoord: <b>op welke manier?</b>',a:['de quelle manière','de quelle manière ?','de quelle maniere'],fr:true},
    {t:'invul',v:'Vous partez à quelle heure ? → inversion: À quelle heure … ?',a:['partez-vous','partez-vous ?'],fr:true},
    {t:'invul',v:'Tu viens ce soir ? → inversion: … ce soir ?',a:['viens-tu','Viens-tu'],fr:true}
  ]
},
{
  id:'F9', vak:'fr', titel:'Pronoms personnels COD et COI',
  bron:[['Schéma pronoms COD/COI', PSCH],['Remediëring schema COD/COI', RSCH],['Oefeningen COD/COI', REX]],
  samenvatting:[
    '<h4>🎯 COD en COI</h4><div class="lp-vs"><div><b>COD</b>= <u>lijdend voorwerp</u><small>vraag: <b>wie of wat</b> + werkwoord? · <b>geen voorzetsel</b><br>Marie achète <b>une valise</b>.</small></div><div><b>COI</b>= <u>meewerkend voorwerp</u><small>vraag: <b>à qui / de qui</b>? · <b>met voorzetsel</b> (à, de)<br>Louis parle <b>à son frère</b>.</small></div></div><p class="lp-tip">🖊️ Evelien donne <b>un stylo</b> (COD) <b>à Gust</b> (COI).</p>',
    '<h4>🔤 De voornaamwoorden</h4><table class="lp-ww lp-irr"><tr><th></th><th>COD</th><th>COI</th></tr><tr><td>je</td><td><b>me</b></td><td><b>me</b></td></tr><tr><td>tu</td><td><b>te</b></td><td><b>te</b></td></tr><tr><td>il / elle</td><td><b>le / la / l\'</b></td><td><b>lui</b></td></tr><tr><td>nous</td><td><b>nous</b></td><td><b>nous</b></td></tr><tr><td>vous</td><td><b>vous</b></td><td><b>vous</b></td></tr><tr><td>ils / elles</td><td><b>les</b></td><td><b>leur</b></td></tr></table><p class="lp-tip">⚠️ Alleen bij de <b>3e persoon</b> zijn ze verschillend!</p>',
    '<h4>📍 Waar staat het?</h4><p>Het voornaamwoord staat <b>vóór het werkwoord</b>.</p><div class="lp-vs"><div><b>COD</b>Julie <u>le</u> jette.</div><div><b>COI</b>Le policier <u>lui</u> parle.<small>Julie <b>leur</b> parle.</small></div></div>',
    '<h4>✌️ Twee voornaamwoorden</h4><div class="lp-ketting"><span>me / te / se / nous / vous</span><i>→</i><span>le / la / les</span><i>→</i><span>lui / leur</span><i>→</i><span>werkwoord</span></div><div class="lp-vs"><div><b>voorbeeld 1</b>Il <u>me la</u> donne.</div><div><b>voorbeeld 2</b>Je <u>la lui</u> donne.</div></div>'
  ],
  kaarten:[
    ['COD = ?','complément d\'objet direct = lijdend voorwerp (wie/wat? geen voorzetsel)'],['COI = ?','complément d\'objet indirect = meewerkend voorwerp (à qui? de qui? met voorzetsel)'],
    ['Vraag om de COD te vinden','sujet + verbe + qui ? / quoi ?'],['Vraag om de COI te vinden','sujet + verbe + à qui ? à quoi ? de qui ? de quoi ?'],
    ['COD 3e persoon (hem/haar/het, hen)','le / la / l\' · les'],['COI 3e persoon (aan hem/haar, aan hen)','lui · leur'],
    ['COD en COI voor je, tu, nous, vous','me · te · nous · vous (zelfde!)'],['Waar staat het voornaamwoord?','Vóór het werkwoord: Julie le jette.'],
    ['Julie jette la balle. → pronom','Julie la jette.'],['Julie jette les papiers. → pronom','Julie les jette.'],['Le policier parle à la dame. → pronom','Le policier lui parle.'],
    ['Julie parle à ses amis. → pronom','Julie leur parle.'],['Volgorde bij 2 voornaamwoorden','me/te/se/nous/vous → le/la/les → lui/leur → verbe'],['Je donne le livre à Paul. → 2 pronoms','Je le lui donne.']
  ],
  quiz:[
    {t:'mc',v:'Duid de COD aan: <i>Marie montre sa nouvelle robe à sa sœur.</i>',o:['sa nouvelle robe','à sa sœur','Marie','montre'],a:0,w:['','À sa sœur heeft een voorzetsel (à): dat is de COI.','Marie is het onderwerp (sujet).','Montre is het werkwoord.']},
    {t:'mc',v:'Duid de COI aan: <i>Le professeur donne un exercice aux élèves.</i>',o:['aux élèves','un exercice','le professeur','donne'],a:0,w:['','Un exercice: le professeur donne quoi? Dat is de COD.','Dat is het onderwerp.','Dat is het werkwoord.']},
    {t:'mc',v:'Duid de COI aan: <i>À son petit frère, mes parents offrent un nouveau vélo.</i>',o:['à son petit frère','un nouveau vélo','mes parents','offrent'],a:0,w:['','Un nouveau vélo: offrent quoi? = COD. Ook al staat de COI vooraan, à… blijft de COI.','Onderwerp.','Werkwoord.']},
    {t:'mc',v:'Julie attrape la balle. → ?',o:['Julie l\'attrape.','Julie la attrape.','Julie lui attrape.','Julie attrape la.'],a:0,w:['','La + klinker wordt l\' (attrape begint met a).','Lui is een COI, maar la balle is een COD (geen à).','Het voornaamwoord staat vóór het werkwoord.']},
    {t:'mc',v:'Le policier parle au garçon. → ?',o:['Le policier lui parle.','Le policier le parle.','Le policier leur parle.','Le policier parle lui.'],a:0,w:['','Au garçon = à + le garçon: met à, dus COI → lui.','Leur is meervoud (aan hen), hier is het één jongen.','Het voornaamwoord staat vóór het werkwoord.']},
    {t:'mc',v:'Julie parle à ses amis. → ?',o:['Julie leur parle.','Julie les parle.','Julie lui parle.','Julie leurs parle.'],a:0,w:['','Les is een COD; hier staat à (parler à), dus COI.','Lui is enkelvoud; ses amis is meervoud.','Leur als voornaamwoord krijgt nooit een s.']},
    {t:'mc',v:'Welke voornaamwoorden zijn verschillend voor COD en COI?',o:['Alleen de 3e persoon: le/la/les ↔ lui/leur','Allemaal','Alleen nous en vous','Geen enkele'],a:0,w:['','Me, te, nous, vous zijn hetzelfde.','Nous en vous blijven gelijk.','Bij de 3e persoon zijn ze wel verschillend.']},
    {t:'mc',v:'Je donne le livre à Paul. → met 2 voornaamwoorden?',o:['Je le lui donne.','Je lui le donne.','Je le donne lui.','Je leur le donne.'],a:0,w:['','Volgorde: eerst le/la/les, dan lui/leur.','Beide voornaamwoorden staan vóór het werkwoord.','Paul is één persoon: lui, niet leur.']},
    {t:'jf',v:'De COI vind je met de vraag "à qui?" of "de qui?".',a:true},
    {t:'jf',v:'Het voornaamwoord COD staat na het werkwoord: Julie jette le.',a:false,u:'Het staat vóór het werkwoord: Julie le jette.'},
    {t:'invul',v:'Le professeur attend Julie et toi. → Le professeur … attend.',a:['vous'],fr:true},
    {t:'invul',v:'Le professeur parle à Jef et à moi. → Le professeur … parle.',a:['nous'],fr:true},
    {t:'invul',v:'Julie jette le papier. → Julie … jette.',a:['le'],fr:true},
    {t:'invul',v:'Nous prêtons notre échelle à nos voisins. → Nous … prêtons notre échelle.',a:['leur'],fr:true}
  ]
}

);
})();
