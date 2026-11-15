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

const kaartenWW = (lijst) => lijst.map(w => [w + ' (' + WW[w][6] + ') – vervoeg in het présent', WW[w].slice(0,6).map((f,i) => (i===0 && /^[aeéèêhiouy]/i.test(f) ? 'j\'' : window.ELI_PERS[i].split(' / ')[0] + ' ') + f).join(' · ')]);

window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'F1', vak:'fr', titel:'Vocabulaire: partons dans le monde',
  bron:[['Woordkaartjes partie 1', VOC]],
  samenvatting:['Leer de woordenlijst <b>in beide richtingen</b>: Frans → Nederlands én Nederlands → Frans. Let op de <b>lidwoorden</b> (un/une) en de <b>vrouwelijke vormen</b> (étranger/étrangère, cher/chère).','Tip: zeg het woord hardop, schrijf het één keer op, en test jezelf daarna zonder te kijken.'],
  kaarten: vocab.map(([f,n]) => [n, f]).concat(vocab.map(([f,n]) => [f, n])),
  quiz: vocab.slice(0).map(([f,n]) => ({t:'invul', v:'Vertaal naar het Frans: <b>' + n + '</b>', a:[f.replace(/ \/ .*/,''), f], fr:true}))
},
{
  id:'F2', vak:'fr', titel:'Indicatif présent: -er en bijzondere -er',
  bron:[['Résumé indicatif présent', RES],['Schéma', SCH],['Instructie', INS],['Instructievideo', VID]],
  samenvatting:[
    '<b>-er</b> (parler): stam + <b>-e, -es, -e, -ons, -ez, -ent</b> → je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.',
    '<b>-ger</b> (manger): <b>ge</b> vóór a/o/u → <b>nous mangeons</b>. Zo ook: nager, changer, corriger, déménager, ranger.',
    '<b>-cer</b> (commencer): <b>ç</b> vóór a/o/u → <b>nous commençons</b>. Zo ook: annoncer, avancer, placer, prononcer.',
    '<b>-e..er</b> (acheter): <b>e → è</b> bij je, tu, il, ils → j\'achète, nous achetons, ils achètent. Zo ook: (se) lever, se promener, amener, emmener.',
    '<b>-yer</b> (appuyer): <b>y → i</b> vóór een doffe e → j\'appuie, nous appuyons, ils appuient. Zo ook: payer, essayer, nettoyer, s\'ennuyer.',
    'Ezelsbrug A U T O: de klinkers waarvoor je ge/ç nodig hebt (a, o, u).'
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
    '<b>-ir type sortir</b>: enkelvoud stam zonder medeklinker + <b>-s, -s, -t</b>; meervoud <b>-ons, -ez, -ent</b> → je sors, il sort, nous sortons. Ezelsbrug <b>MESESODOPA</b>: MEntir, SEntir, SOrtir, DOrmir, PArtir.',
    '<b>-ir type finir</b>: <b>-is, -is, -it, -issons, -issez, -issent</b> → nous finissons, ils finissent. (choisir, remplir, réfléchir…)',
    '<b>-ir type ouvrir</b>: als een -er-werkwoord: <b>-e, -es, -e, -ons, -ez, -ent</b> → j\'ouvre, tu ouvres. Zo ook: découvrir, couvrir, offrir, souffrir.',
    '<b>-re type attendre</b>: <b>-s, -s, – (niets), -ons, -ez, -ent</b> → il attend. Zo ook: défendre, descendre, entendre, perdre, répondre, vendre.',
    '<b>-re type conduire</b>: <b>-s, -s, -t</b>, meervoud met <b>s</b>: <b>conduisons, conduisez, conduisent</b>. Zo ook: construire, cuire, détruire, produire, traduire.',
    '<b>-re type peindre</b>: <b>-s, -s, -t</b>, meervoud met <b>gn</b>: <b>peignons, peignez, peignent</b>. Zo ook: craindre, joindre, (se) plaindre, rejoindre.'
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
    'Deze moet je <b>gewoon vanbuiten</b> kennen. De 26 uit je flashcards: avoir, être, aller, faire, vouloir, pouvoir, devoir, savoir, boire, connaître, courir, croire, dire, écrire, envoyer, lire, mettre, mourir, prendre, recevoir, rire, suivre, tenir, venir, vivre, voir.',
    'Let op de valkuilen: <b>vous êtes, vous faites, vous dites</b> (geen -ez!) · <b>ils sont, ils ont, ils vont, ils font</b> · je <b>suis</b> = ik ben (être) én ik volg (suivre) · <b>il connaît</b> (accent) · <b>nous buvons</b>, ils <b>boivent</b> · <b>reçois</b> met ç, nous recevons zonder.',
    'Methode: 5 per dag, hardop opzeggen, dan zonder kijken typen in de drill.'
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
    'De gebiedende wijs heeft <b>3 vormen</b>, zonder onderwerp:',
    '<b>tu</b> → neem de vorm van <b>je</b>: tu ouvres → <b>Ouvre !</b>, tu manges → <b>Mange !</b>, tu finis → <b>Finis !</b>',
    '<b>nous</b> → neem de nous-vorm: <b>Ouvrons !</b> <b>Mangeons !</b> (= laten we…)',
    '<b>vous</b> → neem de vous-vorm: <b>Ouvrez !</b> <b>Mangez !</b>',
    'Let op: bij -er-werkwoorden (en ouvrir) valt de <b>-s van tu</b> dus weg, omdat je de je-vorm neemt.',
    '<b>Speciale vormen</b>: être: <b>sois, soyons, soyez</b> · avoir: <b>aie, ayons, ayez</b> · aller: <b>va, allons, allez</b> · savoir: <b>sache, sachons, sachez</b> · vouloir: <b>veuille, veuillons, veuillez</b> (veuillez = gelieve).'
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
    'Passé composé = <b>avoir/être</b> (présent) + <b>participe passé</b>: j\'ai joué, je suis allé.',
    'Regelmatig: <b>-er → -é</b> (joué), <b>-re → -u</b> (perdu), <b>-ir (finir) → -i</b> (fini), <b>-ir (sortir) → -i</b> (dormi), <b>-ir (ouvrir) → -ert</b> (ouvert, offert, découvert, souffert).',
    'Met <b>être</b> (bewegingswerkwoorden): entrer, rentrer, monter, tomber, arriver, rester, retourner, descendre, partir, sortir, aller, venir, mourir.',
    'Onregelmatige participes: eu, été, fait, bu, connu, couru, cru, dû, dit, écrit, envoyé, lu, mis, mort, pu, pris, reçu, ri, su, suivi, tenu, venu, vécu, vu, voulu.'
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
  samenvatting:['Deel 2 van de woordenlijst: logeren, bezoeken, sporten op reis en handige zinnen. Leer in <b>beide richtingen</b>.','Let op de <b>vrouwelijke vormen</b>: dangereux → dangereu<b>se</b>, sûr → sû<b>re</b>, lent → len<b>te</b>, complet → compl<b>ète</b>.','Sporten met <b>faire</b>: faire <b>du</b> (le) ski, faire <b>de la</b> (la) plongée, faire <b>de l\'</b>escalade. Uitzondering: <b>patiner</b> en <b>bronzer</b> zijn gewone werkwoorden.'],
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
    'Een vraag stellen kan op <b>3 manieren</b>: <b>intonation</b> (gewoon je stem omhoog), <b>inversion</b> (werkwoord en onderwerp omdraaien met een streepje) en <b>est-ce que</b>.',
    '<b>Zonder vraagwoord</b>: Tu aimes la danse ? · Aimes-tu la danse ? · Est-ce que tu aimes la danse ?',
    '<b>Met vraagwoord</b>: Tu danses quand ? (vraagwoord achteraan) · Quand danses-tu ? · Quand est-ce que tu danses ?',
    '<b>Inversion</b>: tussen twee klinkers komt een <b>-t-</b>: Paul joue-<b>t</b>-il de la guitare ? Is het onderwerp een <b>zelfstandig naamwoord of naam</b>, dan herhaal je het met il/elle: Paul joue-t-il… · Comment ces étudiants voyagent-ils ? (of zonder streepje: Comment voyagent ces étudiants ?)',
    '<b>Est-ce que</b> + klinker → <b>est-ce qu\'</b>: Est-ce qu\'on a des tickets ? Où est-ce qu\'on va manger ?',
    'Vraagwoorden: <b>qui</b> wie · <b>quoi</b> wat · <b>quel/quelle</b> welke · <b>quand</b> wanneer · <b>comment</b> hoe · <b>à quelle heure</b> hoe laat · <b>pourquoi</b> waarom · <b>où</b> waar · <b>avec/pour qui</b> met/voor wie · <b>à qui</b> aan/tegen wie · <b>combien de fois</b> hoeveel keer · <b>combien de temps</b> hoelang · <b>en quelle année</b> in welk jaar · <b>de quelle manière</b> op welke manier.'
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
    '<b>COD</b> = complément d\'objet direct = <b>lijdend voorwerp</b>. Vraag: <b>wie of wat</b> + werkwoord? Er staat <b>geen voorzetsel</b>: Marie achète <b>une valise</b>. (Marie achète quoi ?)',
    '<b>COI</b> = complément d\'objet indirect = <b>meewerkend voorwerp</b> (of voorzetselvoorwerp). Vraag: <b>à qui / à quoi? de qui / de quoi?</b> Er staat een <b>voorzetsel</b> (à, de): Louis parle <b>à son frère</b>. Elle parle <b>de son problème</b>.',
    'Voorbeeld: Evelien donne <b>un stylo</b> (COD) <b>à Gust</b> (COI).',
    'De voornaamwoorden: <b>COD</b>: me, te, <b>le / la / l\'</b>, nous, vous, <b>les</b> · <b>COI</b>: me, te, <b>lui</b>, nous, vous, <b>leur</b>. Alleen bij de 3e persoon zijn ze verschillend!',
    'Plaats: het voornaamwoord staat <b>vóór het werkwoord</b>: Julie <b>le</b> jette. Le policier <b>lui</b> parle. Julie <b>leur</b> parle.',
    'Twee voornaamwoorden? Volgorde: <b>me/te/se/nous/vous</b> → <b>le/la/les</b> → <b>lui/leur</b> → werkwoord. Il <b>me la</b> donne. Je <b>la lui</b> donne.'
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
