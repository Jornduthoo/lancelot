// Kunst & Filosofie (major) — examen ma 7/12 9u00, digitaal
(function(){
const D = id => 'https://drive.google.com/file/d/' + id + '/view';
window.ELI_ONDERWERPEN = window.ELI_ONDERWERPEN || [];
window.ELI_ONDERWERPEN.push(
{
  id:'KF1', vak:'kf', titel:'Wat is filosofie?',
  bron:[['Cursus filosofie p. 1–4', D('1jMg0AtJ1rI-rMyS2_Hl_WEOo-Wrfp1rl')],['Presentatie filosofie deel 1', D('1UB-SFocAvpBHdfrNxW0ic111z4iUYAhi')]],
  samenvatting:[
    '<h4>💜 Wat betekent “filosofie”?</h4><p>Het woord komt uit het <b>Grieks</b>:</p><div class="lp-ketting"><span><b>philia</b> = liefde</span><i>+</i><span><b>sophia</b> = wijsheid</span><i>=</i><span>💜 <b>liefde voor wijsheid</b></span></div><p>Een ander woord is <b>wijsbegeerte</b> = <b>verlangen naar wijsheid</b>. Wie filosofie beoefent, is een <b>filosoof</b>.</p><div class="lp-vs"><div><b>🦁 “Hakuna matata”</b>een <u>levenshouding</u> of <u>levensmotto</u><small>géén filosofie in de echte betekenis</small></div><div><b>🤔 filosofie</b>veel <u>meer</u> dan een motto<small>rationeel en kritisch nadenken</small></div></div>',
    '<h4>🔬 Filosofie vs. wetenschap</h4><div class="lp-vs"><div><b>🧪 exacte wetenschappen</b>vertrekken van <u>experimenten en waarnemingen</u></div><div><b>🧠 filosofie</b>vertrekt <u>alleen van het denken</u></div></div><p class="lp-kop">Voorbeelden uit je cursus</p><div class="lp-stroom"><div><span>Natuurkundige: waaruit bestaan <b>atomen</b>?</span><b>Wat betekent bestaan?</b></div><div><span>Wiskundige: welke <b>relaties</b> zijn er tussen getallen?</span><b>Wat is een getal?</b></div><div><span>Psycholoog: hoe <b>leren</b> kinderen taal?</span><b>Hoe betekent een woord iets?</b></div></div><p class="muted klein">Links de wetenschapper, rechts (in het bolletje) de vraag van de filosoof.</p>',
    '<h4>🧠 Rationeel en kritisch denken</h4><p>Filosofie = <b>vragen stellen</b>, <b>redeneren</b>, <b>ideeën testen</b>, <b>argumenten bouwen</b> en <b>begrippen verduidelijken</b>. De kern: <b>rationeel</b> en <b>kritisch</b> denken.</p><div class="lp-vs"><div><b>📐 rationeel denken</b><u>verstandelijk</u> denken<small>eerst je gedachten ordenen, dan logisch redeneren. Het denkvermogen heet <b>de rede</b>.</small></div><div><b>🔍 kritisch denken</b>nagaan of iets <u>waar of fout</u> is<small>juiste vragen stellen, voorbeelden geven, argumenteren, en je <b>eigen veronderstellingen</b> in vraag stellen</small></div></div>',
    '<h4>❓ 3 soorten vragen</h4><table class="lp-ww lp-tijd"><tr><td>📏 weetvraag</td><td>Hoe groot is de aarde?<br><small class="muted">→ 510 miljoen km², kan je <b>meten of opzoeken</b></small></td></tr><tr><td>💬 meningsvraag</td><td>Welk land heeft de mooiste natuur volgens jou?<br><small class="muted">→ “<b>Ik vind</b> …”, je eigen mening</small></td></tr><tr><td>🤔 filosofische vraag (denkvraag)</td><td>Staat de mens boven de natuur?<br><small class="muted">→ enkel te beantwoorden door <b>denken en redeneren</b></small></td></tr></table><p class="lp-tip">🔑 Een filosofische vraag zoekt niet je <b>mening</b> en niet iets dat je via <b>onderzoek</b> te weten komt.</p>',
    '<h4>🧩 Wat doet een filosofische vraag met je?</h4><ul><li>Ze drukt vaak <b>verwondering</b> uit: “Wat gebeurt er na de dood?”, “Hoe moeten we leven?”, “Wat is de mens?”</li><li>Ze geeft <b>geen praktisch</b> antwoord.</li><li>Door na te denken ontstaan <b>nieuwe inzichten</b>, maar je botst ook op <b>grenzen en spanningsvelden</b>.</li><li>Ze is <b>open</b>: elk antwoord leidt tot <b>doorvragen</b> → een <b>filosofisch gesprek</b>.</li></ul><p><b>Voorbeeld</b>: “Staat de mens boven de natuur?” leidt tot: Is de mens een dier? Mag de mens heersen over de natuur? Wat betekenen “mens”, “natuur” en “heersen”?</p><p class="lp-tip">⚡ <b>Spanningsveld</b> (paradox): 2 dingen die allebei waar lijken, maar botsen. Bv. vrijheid ↔ regels.</p>',
    '<h4>✅ Checklist: is het een filosofische vraag?</h4><ol><li>In <b>alle tijden</b>, door <b>alle mensen</b>, in <b>alle culturen</b> gesteld.</li><li><b>Geen</b> weetvraag of meningsvraag.</li><li>Een <b>denkvraag</b> over een mogelijkheid.</li><li><b>Niet eenvoudig</b> en niet op <b>1 manier</b> te beantwoorden.</li><li>Legt <b>grenzen en spanningsvelden</b> bloot.</li><li>Zet je aan om verder te denken over het <b>onderwerp</b>…</li><li>… en over de <b>begrippen</b> in de vraag (dood, vrijheid, identiteit, eerlijkheid).</li><li>Een <b>open vraag</b> die een <b>filosofisch gesprek</b> mogelijk maakt.</li></ol>'
  ],
  kaarten:[
    ['Waar komt het woord "filosofie" vandaan?','Grieks: philia (liefde) + sophia (wijsheid) = liefde voor wijsheid'],
    ['Nederlands synoniem voor filosofie?','Wijsbegeerte (= verlangen naar wijsheid)'],
    ['Is "Hakuna matata" filosofie?','Nee, het is een levenshouding. Een quote is een levensmotto.'],
    ['Wat is de kern van filosofie?','Rationeel en kritisch denken'],
    ['Wat is rationeel denken?','Verstandelijk, logisch denken: gedachten ordenen en redeneren'],
    ['Hoe heet het menselijk denkvermogen in de filosofie?','De rede'],
    ['Wat is kritisch denken?','Nagaan of iets waar of fout is: juiste vragen stellen, voorbeelden geven, argumenteren, eigen veronderstellingen in vraag stellen'],
    ['Waarin verschilt de methode van filosofie van die van exacte wetenschappen?','Filosofie vertrekt enkel van het denken; exacte wetenschappen van experimenten en waarnemingen'],
    ['Welke 3 soorten vragen onderscheiden we?','Weetvraag, meningsvraag, filosofische vraag (denkvraag)'],
    ['"Hoe groot is de aarde?" is een…','Weetvraag (je kan het meten)'],
    ['"Welk land heeft de mooiste natuur?" is een…','Meningsvraag'],
    ['"Staat de mens boven de natuur?" is een…','Filosofische vraag'],
    ['Wat is een paradox of spanningsveld?','Twee dingen die allebei waar lijken, maar elkaar tegenspreken of botsen'],
    ['Geef 3 punten uit de checklist van een filosofische vraag','Bv.: in alle tijden/culturen gesteld · geen weet- of meningsvraag · niet op 1 manier te beantwoorden · legt spanningsvelden bloot · open vraag voor een filosofisch gesprek']
  ],
  quiz:[
    {t:'mc',v:'Wat betekent "philosophia" letterlijk?',o:['Liefde voor wijsheid','Kennis van de natuur','Kunst van het spreken','Leer van de goden'],a:0},
    {t:'mc',v:'Welke vraag is een filosofische vraag?',o:['Mag de mens heersen over de natuur?','Hoeveel inwoners heeft België?','Wat is jouw lievelingsfilm?','Hoe laat begint het examen?'],a:0},
    {t:'mc',v:'"Ik vind Italië het mooiste land." Welk soort antwoord is dit?',o:['Antwoord op een meningsvraag','Antwoord op een weetvraag','Antwoord op een filosofische vraag','Een paradox'],a:0},
    {t:'jf',v:'Filosofie vertrekt net als de natuurwetenschappen van experimenten en metingen.',a:false,u:'Filosofie vertrekt van het denken.'},
    {t:'jf',v:'Een levensmotto zoals "Wees jezelf" is nog geen filosofie.',a:true},
    {t:'mc',v:'Welk woord hoort NIET bij kritisch denken?',o:['Blind geloven wat een ander zegt','Argumenteren','Voorbeelden geven','Je eigen veronderstellingen in vraag stellen'],a:0},
    {t:'invul',v:'Een ander Nederlands woord voor filosofie is …',a:['wijsbegeerte']},
    {t:'invul',v:'Het menselijk denkvermogen noemt men in de filosofie "de …"',a:['rede','de rede']},
    {t:'mc',v:'"Om vrij te zijn op school moeten we ons aan strengere regels houden." Dit is een voorbeeld van…',o:['een spanningsveld / paradox','een weetvraag','een levensmotto','een sofisme van Thales'],a:0}
  ]
},
{
  id:'KF2', vak:'kf', titel:'De natuurfilosofen',
  bron:[['Cursus filosofie p. 5–7', D('1jMg0AtJ1rI-rMyS2_Hl_WEOo-Wrfp1rl')],['Presentatie (schema filosofen)', D('1UB-SFocAvpBHdfrNxW0ic111z4iUYAhi')]],
  samenvatting:[
    '<h4>⚡ Van mythos naar logos</h4><p>De filosofie ontstaat ± <b>2600 jaar geleden</b> in het <b>oude Griekenland</b>. Daarvoor verklaarden mensen alles met <b>mythes</b>: verhalen over goden, helden en bovennatuurlijke krachten.</p><div class="lp-vs"><div><b>📜 mythos</b>mythisch denken: verklaren met goden<small>donder = Zeus is woedend · rivieren en zeeën = woonplaats van goddelijke wezens</small></div><div><b>🧠 logos</b>rationeel denken: verklaren met <u>rede en observatie</u><small>wat kan ik zien en logisch uitleggen?</small></div></div><p>De <b>natuurfilosofen</b> (ook <b>presocraten</b> genoemd: ze leefden vóór Socrates) zetten als eersten die stap.</p>',
    '<h4>❓ Hun grote vraag</h4><p class="lp-tip">🔑 <b>Waaruit is alles opgebouwd?</b></p><p>Ze zoeken één <b>oerstof</b> of <b>principe</b> waaruit de hele natuur voortkomt. Het Griekse woord daarvoor is <b>archè</b> = “begin” of “beginsel”.</p><p>Hun antwoorden waren vaak eenvoudig, maar hun <b>manier van denken</b> was revolutionair: geen goden, maar <b>verstand</b>. Zo legden ze de basis voor <b>wetenschap en filosofie</b>.</p><p class="lp-kop">👥 De 4 natuurfilosofen</p><div class="lp-tegels k2 t-blauw"><div><i>💧</i><b>Thales</b><small>alles is water</small></div><div><i>♾️</i><b>Anaximander</b><small>het apeiron</small></div><div><i>🔥</i><b>Heraclitus</b><small>alles stroomt</small></div><div><i>🪨</i><b>Parmenides</b><small>niets verandert</small></div></div>',
    '<h4>💧 Thales van Milete <small class="muted">(ca. 624–546 v.C.)</small></h4><ul><li><b>Eerste filosoof</b> van het Westen. Woonde in <b>Milete</b> (Klein-Azië, nu Turkije), een rijke handelsstad.</li><li>Reisde naar <b>Egypte</b> en leerde er wiskunde en sterrenkunde. Hij <b>voorspelde een zonsverduistering</b>.</li><li><b>Archè = water.</b> Waarom? Zonder water geen leven, en water bestaat in 3 vormen: <b>vloeibaar, vast (ijs), gas (damp)</b>.</li><li>Wiskunde: meetkundige stellingen, <b>hoogte van piramides berekenen met hun schaduw</b>.</li></ul><p class="lp-tip">💡 Belangrijk: hij zoekt een verklaring in de <b>natuur</b> zelf, niet bij de goden → eerste stap naar wetenschappelijk denken.</p>',
    '<h4>♾️ Anaximander <small class="muted">(ca. 610–546 v.C.)</small></h4><ul><li><b>Leerling van Thales.</b> Vond water niet genoeg om alles te verklaren.</li><li><b>Archè = het apeiron</b>: iets <b>oneindigs, onbepaalds en grenzeloos</b>. Alles komt eruit voort en verdwijnt er weer in.</li><li>Het apeiron is <b>niet tastbaar</b> (geen water of vuur) maar een <b>abstract principe</b> → hij denkt voorbij wat je kan zien. Daarom: pionier van de <b>metafysica</b>.</li><li>De kosmos is een <b>cyclus</b>: wat ontstaat, moet ook weer verdwijnen (rechtvaardigheid).</li><li>Wetenschapper: <b>eerste wereldkaart</b>, een <b>zonnewijzer</b>, en de <b>aarde zweeft vrij</b> in de ruimte.</li></ul>',
    '<h4>🔥 Heraclitus van Efeze <small class="muted">(ca. 540–480 v.C.)</small></h4><ul><li>Bijnaam: <b>“de duistere filosoof”</b>, omdat hij in raadselachtige spreuken schreef.</li><li><b>“Panta rhei” = alles stroomt.</b> Alles verandert voortdurend: je kan <b>nooit 2 keer in dezelfde rivier stappen</b>, want het water stroomt altijd verder.</li><li><b>Vuur</b> = symbool van verandering en energie.</li><li><b>Tegenstellingen</b> zijn nodig: dag en nacht, oorlog en vrede, leven en dood. Die spanning zorgt voor <b>harmonie en orde</b>.</li><li><b>Logos</b> = een universele rede of wet die alles bestuurt. De meeste mensen snappen die niet, ze zien alleen de buitenkant.</li></ul>',
    '<h4>🪨 Parmenides van Elea <small class="muted">(ca. 510–450 v.C.)</small></h4><ul><li>Denkt het <b>omgekeerde van Heraclitus</b>: <b>verandering is een illusie</b>.</li><li><b>“Zijn is, niet-zijn is niet.”</b> Over “niets” kan je niet spreken, dus iets kan niet zomaar ontstaan of verdwijnen.</li><li>De werkelijkheid is <b>één, eeuwig, onveranderlijk en ondeelbaar</b>.</li><li>Vertrouwt <b>niet op de zintuigen</b> (die bedriegen je), maar alleen op <b>logica en de rede</b>.</li><li>Schreef een <b>filosofisch gedicht</b>, stichtte de <b>Eleatische school</b>. Leerling <b>Zeno</b>: paradox van <b>Achilles en de schildpad</b>.</li></ul>',
    '<h4>⚔️ Heraclitus vs. Parmenides</h4><div class="lp-vs"><div><b>🔥 Heraclitus</b>alles <u>verandert</u><small>“panta rhei” · vuur · tegenstellingen · vertrouwt op wat hij waarneemt</small></div><div><b>🪨 Parmenides</b>niets verandert, verandering is <u>schijn</u><small>“zijn is, niet-zijn is niet” · vertrouwt op de rede, niet op de zintuigen</small></div></div><p>Hun ruzie zette latere filosofen als <b>Plato</b> en <b>Aristoteles</b> aan het denken over het verschil tussen <b>schijn en werkelijkheid</b>.</p>',
    '<h4>🌍 Waarom zijn ze belangrijk?</h4><ul><li>Ze tonen dat er <b>wetmatigheden</b> in de natuur zijn.</li><li>Ze gebruiken <b>abstracte begrippen</b> (zoals het apeiron).</li><li>Hun vragen naar de <b>oorsprong</b> van alles zijn vandaag nog belangrijk in filosofie en wetenschap.</li></ul><p class="lp-kop">➡️ En dan?</p><div class="lp-ketting"><span>🌌 natuurfilosofen: de <b>kosmos</b></span><i>→</i><span>🗣️ sofisten: overtuigen</span><i>→</i><span>🧍 Socrates: de <b>mens en moraal</b></span></div><p class="muted klein">Van “waaruit bestaat de wereld?” naar “hoe moeten wij leven?”</p>'
  ],
  kaarten:[
    ['Van mythos naar logos: wat betekent dat?','Van verklaren met mythes (goden) naar rationeel verklaren met rede en observatie'],
    ['Andere naam voor de natuurfilosofen?','Presocraten'],
    ['Centrale vraag van de natuurfilosofen?','Waaruit is alles opgebouwd? (zoeken naar een oerstof)'],
    ['Wat is de archè?','Het begin/beginsel: de oerstof of het principe waaruit alles voortkomt'],
    ['Thales: oerstof?','Water'],
    ['Thales: jaartallen?','ca. 624–546 v.C.'],
    ['Wie geldt als eerste westerse filosoof?','Thales van Milete'],
    ['Anaximander: oerprincipe?','Het apeiron: oneindig, onbepaald, grenzeloos beginsel'],
    ['Wat ontwierp Anaximander (waarschijnlijk)?','De eerste wereldkaart en een zonnewijzer'],
    ['Heraclitus: kernidee?','Panta rhei: alles stroomt, alles verandert voortdurend'],
    ['Heraclitus: symbool van verandering?','Vuur'],
    ['Bijnaam van Heraclitus?','De duistere filosoof (raadselachtige spreuken)'],
    ['Wat is de logos bij Heraclitus?','Universele rede / wereldverstand: natuurwet die zorgt voor orde en eenheid'],
    ['Parmenides: kernidee?','Verandering is een illusie. "Zijn is, niet-zijn is niet." Werkelijkheid is één, eeuwig, onveranderlijk'],
    ['Parmenides: bron van ware kennis?','De rede / logica (niet de zintuigen)'],
    ['Heraclitus: bron van kennis?','De zintuigen'],
    ['Wie bedacht de paradox van Achilles en de schildpad?','Zeno van Elea, leerling van Parmenides'],
    ['Jaartallen Anaximander, Heraclitus, Parmenides?','Anaximander 610–546, Heraclitus 540–480, Parmenides 510–450 v.C.']
  ],
  quiz:[
    {t:'mc',v:'Welke filosoof zei dat alles uit water bestaat?',o:['Thales','Anaximander','Heraclitus','Parmenides'],a:0},
    {t:'mc',v:'"Je kan nooit twee keer in dezelfde rivier stappen." Van wie?',o:['Heraclitus','Parmenides','Socrates','Protagoras'],a:0},
    {t:'mc',v:'Wat is het apeiron?',o:['Een oneindig, onbepaald beginsel','Een Griekse god van de zee','Het eerste element water','Een rondreizende leraar'],a:0},
    {t:'mc',v:'Welke filosoof vond verandering een illusie?',o:['Parmenides','Heraclitus','Thales','Anaximander'],a:0},
    {t:'mc',v:'Wat was het symbool van Heraclitus voor verandering?',o:['Vuur','Water','Lucht','Aarde'],a:0},
    {t:'jf',v:'De natuurfilosofen verklaarden de wereld vooral met verhalen over goden.',a:false,u:'Net niet: ze maakten de stap van mythos naar logos.'},
    {t:'jf',v:'Anaximander was een leerling van Thales.',a:true},
    {t:'jf',v:'Parmenides vertrouwde vooral op zijn zintuigen.',a:false,u:'Hij vertrouwde op de rede/logica; de zintuigen misleiden volgens hem.'},
    {t:'invul',v:'Het Griekse woord voor het oerbeginsel waaruit alles voortkomt: …',a:['archè','arche','archê']},
    {t:'invul',v:'"Alles stroomt" in het Grieks: panta …',a:['rhei']},
    {t:'mc',v:'Rangschik: wie leefde het vroegst?',o:['Thales','Heraclitus','Parmenides','Socrates'],a:0},
    {t:'mc',v:'Waarom was Thales revolutionair?',o:['Hij zocht een verklaring zonder goden, op basis van waarneming','Hij schreef de eerste roman','Hij stichtte de democratie','Hij was de eerste sofist'],a:0}
  ]
},
{
  id:'KF3', vak:'kf', titel:'Sofisten en Socrates',
  bron:[['Cursus filosofie p. 7–9 en 11–12', D('1jMg0AtJ1rI-rMyS2_Hl_WEOo-Wrfp1rl')],['Presentatie (Protagoras & Socrates)', D('1UB-SFocAvpBHdfrNxW0ic111z4iUYAhi')]],
  samenvatting:[
    '<h4>🌌➡️🏙️ Van sterren naar straten</h4><div class="lp-vs"><div><b>🌌 natuurfilosofen</b>“Waaruit bestaat de wereld?”<small>de kosmos, de natuur</small></div><div><b>🧍 Socrates</b>“Wat is rechtvaardigheid?” “Hoe moeten wij leven?”<small>de mens en de moraal</small></div></div><p><b>Waarom die verschuiving?</b> In de <b>5e eeuw v.C.</b> wordt <b>Athene</b> een bloeiende <b>democratie</b>. Het volk bestuurt via de <b>volksvergadering</b> en de <b>volksrechtbanken</b>. Er wordt gedebatteerd op de <b>agora</b> (het marktplein).</p><p class="lp-tip">🔑 Macht hangt niet meer af van <b>adellijke afkomst</b>, maar van <b>overtuigingskracht</b>. Wie goed kan spreken, kan de massa overtuigen en macht krijgen.</p>',
    '<h4>🗣️ De sofisten</h4><p><b>Professionele leraren</b> in Athene, met veel aanzien. Ze leerden jongeren (vooral uit <b>rijke families</b>) <b>retorica</b> (welsprekendheid) en logica, om succes te hebben in de <b>politiek</b>.</p><p class="lp-kop">4 kenmerken</p><div class="lp-tegels k2 t-blauw"><div><i>💰</i><b>betaald</b><small>lesgeven is hun beroep</small></div><div><i>🏆</i><b>overtuigen</b><small>debatten winnen</small></div><div><i>🔄</i><b>relativistisch</b><small>waarheid is relatief</small></div><div><i>🛠️</i><b>praktisch</b><small>nuttige kennis en vaardigheden</small></div></div><p>Kritiek: “<b>dure praters</b>” die mensen leerden <b>winnen</b>, niet <b>denken</b>. Soms gebruikten ze een <b>sofisme</b> = een <b>drogredenering</b> (een redenering die klopt lijkt, maar vals is).</p>',
    '<h4>📏 Protagoras: relativisme</h4><p><b>Protagoras</b> (490–420 v.C.) is de bekendste sofist.</p><p class="lp-tip">💬 “<b>De mens is de maat van alle dingen.</b>”</p><p>Betekenis: <b>DE</b> waarheid bestaat niet. Wat waar, goed of mooi is, <b>verschilt</b> per mens en per samenleving. “Wat voor jou waar is, is waar.” Wat telt, is wie op dat moment het <b>sterkste argument</b> brengt.</p><p>Dat noemen we <b>relativisme</b>.</p>',
    '<h4>🧔 Socrates <small class="muted">(± 470–399 v.C.)</small></h4><ul><li>Leefde in Athene, in <b>dezelfde tijd</b> als de sofisten, maar was het <b>niet eens</b> met hen.</li><li>Voor hem bestaat <b>de waarheid wél</b>, en je vindt ze met de <b>rede</b> = <b>absolutisme</b>.</li><li>Filosofie = een <b>sociale activiteit</b>: een <b>gesprek</b> tussen mensen (dialoog).</li><li>Schreef zelf <b>geen letter</b>. We kennen hem via zijn leerling <b>Plato</b>.</li><li>Socrates en Plato vonden de sofisten verschrikkelijk: het ging hen om <b>geld</b> en <b>winnen</b>, niet om de échte waarheid.</li></ul><div class="lp-vs"><div><b>🗣️ sofisten</b>waarheid is <u>relatief</u><small>relativisme · winnen · betaald</small></div><div><b>🧔 Socrates</b>waarheid <u>bestaat</u><small>absolutisme · zoeken · dialoog</small></div></div>',
    '<h4>🤷 “Ik weet dat ik niets weet”</h4><p>Socrates ging ervan uit dat hij <b>niets wist</b>: “Ik was mij ervan bewust dat ik zo goed als niets wist.”</p><div class="lp-ketting"><span>besef van <b>onwetendheid</b></span><i>→</i><span>nieuwsgierige, open houding</span><i>=</i><span>✨ <b>verwondering</b> (Plato)</span></div><p class="lp-kop">👶 De filosoof als vroedvrouw</p><p>Een <b>vroedvrouw</b> helpt een kind ter wereld te brengen. Zo helpt een filosoof zijn gesprekspartner, door <b>vragen te stellen</b>, om <b>zelf</b> tot inzicht te komen.</p><p>Socrates ging vooral over <b>morele kwesties</b>: wat is <b>goed en kwaad</b>, hoe handel je goed? Bv. wat is <b>rechtvaardigheid</b>? Wat is belangrijk in <b>vriendschap</b>?</p>',
    '<h4>🪜 Socrates filosofeert in 3 stappen</h4><div class="lp-stroom"><div><span><b>1. Lof</b>: iemand beweert iets te weten. Socrates prijst hem en smeekt hem zijn wijsheid te delen.</span><b>😊</b></div><div><span><b>2. Kritische vragen</b>: Socrates ziet een klein probleem in de redenering en haalt ze met een paar vragen onderuit.</span><b>🤨</b></div><div><span><b>3. Samen onwetend</b>: allebei geven ze toe dat ze het niet weten. “Twee onwetende mannen, maar wel twee die willen weten.”</span><b>🤝</b></div></div><p class="lp-tip">🔑 Pas <b>na stap 3</b> begint het echte filosoferen!</p>',
    '<h4>⚖️ Het proces van Socrates</h4><p>Met zijn lastige vragen stootte Socrates veel <b>machtige mensen</b> in Athene voor het hoofd. Ze voelden zich beledigd en lieten hem arresteren.</p><p>Aanklacht: het <b>beledigen van de goden</b> en het <b>bederven van de jeugd</b>. Hij werd veroordeeld (399 v.C.).</p>',
    '<h4>🧭 Op een rijtje: van kosmos naar zelfkennis</h4><div class="lp-stroom groen"><div><span>1. Rationele verklaring voor het universum, oerstof</span><b>🌌 natuurfilosofen</b></div><div><span>2. Basis voor wetenschap, logica en abstract denken</span><b>🌌 natuurfilosofen</b></div><div><span>3. Spelen in op de democratie: overtuigen, spreken, handelen</span><b>🗣️ sofisten</b></div><div><span>4. Kritisch en ethisch: waarheid en zelfkennis</span><b>🧔 Socrates</b></div></div><p>Zo wil de filosofie niet alleen de natuur begrijpen, maar ook <b>wie wij zijn</b> en <b>hoe we moeten leven</b>.</p>'
  ],
  kaarten:[
    ['Waarom verschuift de filosofie in de 5e eeuw v.C. van natuur naar mens?','Door de democratie in Athene: wie kon overtuigen, kreeg politieke macht'],
    ['Wie waren de sofisten?','Betaalde, rondreizende leraren die retorica en argumenteren leerden om succes te hebben in de politiek'],
    ['Wat is een sofisme?','Een drogredenering: een valse redenering die overtuigend klinkt'],
    ['Bekendste sofist?','Protagoras (490–420 v.C.)'],
    ['Uitspraak van Protagoras?','"De mens is de maat van alle dingen."'],
    ['Wat is relativisme?','De opvatting dat er geen absolute waarheid is: wat waar/goed is verschilt per mens en samenleving'],
    ['Wat is absolutisme?','De opvatting dat de waarheid bestaat en voor iedereen geldt (Socrates, Plato)'],
    ['Verschil Socrates vs. sofisten over waarheid?','Socrates: waarheid is absoluut, geldt voor iedereen. Sofisten: geen algemene waarheid, verschilt per mens/samenleving'],
    ['Jaartallen Socrates?','469–399 v.C.'],
    ['Hoe kennen we de ideeën van Socrates?','Via zijn leerling Plato; Socrates schreef zelf niets'],
    ['Bekendste uitspraak van Socrates?','"Het enige dat ik weet, is dat ik niets weet."'],
    ['Met welk beroep vergeleek Socrates de filosoof?','Een vroedvrouw: hij helpt de ander via vragen zelf tot inzicht te komen'],
    ['Wat zijn morele kwesties?','Vragen over goed en kwaad en hoe je goed kan handelen'],
    ['Stap 1 van Socrates\' methode?','Iemand beweert iets te weten; Socrates prijst hem en vraagt hem zijn wijsheid te delen'],
    ['Stap 2 van Socrates\' methode?','Met kritische vragen haalt Socrates de redenering onderuit'],
    ['Stap 3 van Socrates\' methode?','Beiden geven toe dat ze onwetend zijn → het echte filosoferen begint'],
    ['Waarvoor werd Socrates veroordeeld?','Het beledigen van de goden en het bederven van de jeugd'],
    ['Wat is de agora?','Het marktplein in Athene waar men de samenleving bediscussieerde']
  ],
  quiz:[
    {t:'mc',v:'"De mens is de maat van alle dingen." Wie zei dit?',o:['Protagoras','Socrates','Plato','Thales'],a:0},
    {t:'mc',v:'Welke houding hoort bij de sofisten?',o:['Relativisme','Absolutisme','Mythisch denken','Stoïcisme'],a:0},
    {t:'mc',v:'Waarom werden sofisten zo populair in Athene?',o:['In de democratie kon je macht krijgen door goed te overtuigen','Ze voorspelden zonsverduisteringen','Ze waren priesters van Zeus','Ze waren gratis leraren voor arme kinderen'],a:0},
    {t:'mc',v:'Hoe weten we wat Socrates dacht?',o:['Via de geschriften van Plato','Via zijn eigen boeken','Via kleitabletten van Thales','Via de sofisten'],a:0},
    {t:'jf',v:'Socrates rekende net als de sofisten geld voor zijn lessen en wilde vooral discussies winnen.',a:false,u:'Socrates vond het werk van de sofisten verschrikkelijk; hem ging het om de echte waarheid.'},
    {t:'jf',v:'Socrates vergeleek de filosoof met een vroedvrouw.',a:true},
    {t:'mc',v:'Wat gebeurt in de derde stap van een gesprek met Socrates?',o:['Beiden geven toe dat ze onwetend zijn en gaan samen zoeken','Socrates geeft het juiste antwoord','De jongeman wint de discussie','Socrates vraagt geld'],a:0},
    {t:'invul',v:'Een valse redenering die toch overtuigend klinkt, noemt men een drogredenering of een …',a:['sofisme']},
    {t:'open',v:'Leg uit waarin de visie op waarheid van Socrates verschilt van die van de sofisten.',m:'Socrates (en Plato): de waarheid is absoluut en geldt voor iedereen (absolutisme). Sofisten: er is niet één algemene waarheid, ze verschilt van mens tot mens en van samenleving tot samenleving (relativisme).'}
  ]
},
{
  id:'KF4', vak:'kf', titel:'Huis van de filosofie & filosoferen',
  bron:[['Cursus filosofie p. 10 en 13–15', D('1jMg0AtJ1rI-rMyS2_Hl_WEOo-Wrfp1rl')],['Presentatie (huis van de filosofie)', D('1UB-SFocAvpBHdfrNxW0ic111z4iUYAhi')]],
  samenvatting:[
    '<h4>👩‍👧‍👦 Filosofie: moeder van alle wetenschappen</h4><p>In de <b>oudheid</b> en de <b>middeleeuwen</b> was er geen verschil tussen filosofie en wetenschap. In de middeleeuwen hing filosofie samen met de <b>theologie</b> (godsleer).</p><p class="lp-kop">🪺 Daarna “verlaten de kinderen het nest”:</p><table class="lp-ww lp-tijd"><tr><td>16e eeuw</td><td>🔭 natuurwetenschappen</td></tr><tr><td>rond 1800</td><td>📜 geschiedenis</td></tr><tr><td>begin 20e eeuw</td><td>🧠 psychologie en 👥 sociologie</td></tr></table><p class="lp-tip">🔑 Daarom noemt men filosofie de <b>moeder van alle wetenschappen</b>.</p>',
    '<h4>⚖️ Tussen wetenschap en religie</h4><div class="lp-tegels"><div><i>🔬</i><b>wetenschap</b><small>meten, onderzoeken</small></div><div><i>🤔</i><b>filosofie</b><small>levensvragen, met het denken</small></div><div><i>⛪</i><b>religie</b><small>antwoord bij God</small></div></div><p>Filosofie buigt zich over <b>levensvragen</b> (zoals religie), maar zoekt het antwoord <b>meestal niet in God</b>. Ze gebruikt het <b>denken</b>.</p>',
    '<h4>🏠 Het huis van de filosofie</h4><p>Het huis heeft <b>6 kamers</b>, verdeeld over <b>2 verdiepingen</b>:</p><div class="lp-vs"><div><b>🧱 vragen over feiten</b>over het <u>zijn</u>: wat is er?<small>3 kamers: bovenwereld · wereld · mens</small></div><div><b>💎 vragen over waarden</b>wat is <u>waardevol</u>?<small>3 kamers: het Ware · het Goede · het Schone</small></div></div>',
    '<h4>🧱 Verdieping 1: vragen over feiten</h4><div class="lp-tegels"><div><i>✨</i><b>bovenwereld</b><small>metafysica, filosofische godsleer</small></div><div><i>🌍</i><b>wereld</b><small>kosmologie, natuurfilosofie</small></div><div><i>🧍</i><b>mens</b><small>filosofische antropologie</small></div></div><p class="lp-tip">💡 Ezelsbruggetje: van <b>boven</b> naar <b>beneden</b>: wat er boven de wereld is, de wereld zelf, en de mens erin.</p>',
    '<h4>💎 Verdieping 2: vragen over waarden</h4><p>De <b>3 grote waarden van Plato</b>:</p><div class="lp-tegels t-groen"><div><i>✅</i><b>het Ware</b><small>waarheid</small></div><div><i>💚</i><b>het Goede</b><small>goedheid</small></div><div><i>🌸</i><b>het Schone</b><small>schoonheid</small></div></div>',
    '<h4>📖 Bestuderen of beoefenen?</h4><div class="lp-vs"><div><b>📚 filosofie bestuderen</b><u>meedenken</u> met filosofen<small>leren wat zij dachten</small></div><div><b>🧠 filosofie beoefenen</b><u>zelf nadenken</u> = filosoferen</div></div><p class="lp-kop">🧭 De filosofische grondhouding</p><div class="lp-tegels"><div><i>🔎</i><b>nieuwsgierig</b><small>en doorvragen</small></div><div><i>👂</i><b>luisteren</b><small>en je oordeel opschorten</small></div><div><i>😮</i><b>verwonderen</b><small>je laten verbazen</small></div></div>',
    '<h4>💬 Een filosofisch gesprek in 3 stappen</h4><div class="lp-stroom"><div><span>stap 1</span><b>een goede filosofische vraag kiezen</b></div><div><span>stap 2</span><b>de vraag stellen</b></div><div class="groen"><span>stap 3</span><b>het antwoord onderzoeken door door te vragen</b></div></div>',
    '<h4>❓ Doorvragen: 2 soorten vragen</h4><div class="lp-vs"><div><b>🔽 concretiserend</b>antwoord <u>concreet</u> maken<small>naar <b>feiten</b>: Hoeveel keer? Wat? Wanneer?<br>naar <b>voorbeelden</b>: Geef eens een voorbeeld van …?</small></div><div><b>🔼 abstraherend</b>antwoord <u>algemener</u> maken, beter begrijpen<small>naar <b>betekenis</b>: Wat bedoel je met …?<br>naar <b>redenen</b>: Waarom denk je dat? Waarop baseer je je?</small></div></div><p class="lp-tip">💡 Concreet = naar <b>beneden</b> (feiten, voorbeelden). Abstract = naar <b>boven</b> (betekenis, redenen).</p>',
    '<h4>🎬 Wat is filosoferen? (video)</h4><p>Filosofie heeft <b>2 eigenschappen</b>:</p><div class="lp-tegels k2"><div><i>❓</i><b>vragen stellen</b><small>met een nieuwsgierige, open blik</small></div><div><i>🎯</i><b>zorgvuldig nadenken</b><small>heel precies</small></div></div><p class="lp-tip">🔑 De houding: <b>alles mag bevraagd worden</b>.</p>',
    '<h4>🧔 De 4 vragen van Kant</h4><div class="lp-stroom"><div><span>1</span><b>Wat kan ik weten?</b></div><div><span>2</span><b>Wat moet ik doen?</b></div><div><span>3</span><b>Waar mag ik op hopen?</b></div><div class="groen"><span>4</span><b>Wat is de mens?</b></div></div>'
  ],
  kaarten:[
    ['Waarom heet filosofie "de moeder van alle wetenschappen"?','Vroeger maakten alle wetenschappen deel uit van de filosofie; later maakten ze zich los'],
    ['Wanneer maakten de natuurwetenschappen zich los van de filosofie?','In de 16e eeuw'],
    ['Wanneer werd geschiedenis een aparte wetenschap?','Rond 1800'],
    ['Wanneer ontstonden psychologie en sociologie als wetenschap?','Begin 20e eeuw'],
    ['Wat is theologie?','De leer over God en godsdienst'],
    ['Tussen welke twee ligt filosofie?','Tussen wetenschap en religie'],
    ['De 2 groepen vragen in het huis van de filosofie?','Vragen over feiten (het zijn) en vragen over waarden'],
    ['De 3 kamers met vragen over feiten?','Bovenwereld, wereld, mens'],
    ['De 3 grote waarden van Plato?','Het Ware, het Goede, het Schone'],
    ['Vakgebieden bij de kamer "bovenwereld"?','Metafysica en filosofische godsleer'],
    ['Vakgebieden bij de kamer "wereld"?','Kosmologie en natuurfilosofie'],
    ['Vakgebied bij de kamer "mens"?','Filosofische antropologie'],
    ['Filosofie bestuderen vs. beoefenen?','Bestuderen = meedenken met filosofen. Beoefenen = nadenken, zelf filosoferen'],
    ['3 kenmerken van een filosofische grondhouding?','Nieuwsgierig zijn en doorvragen · luisteren en oordeel opschorten · je laten verwonderen'],
    ['Wat zijn concretiserende vragen?','Vragen die het antwoord concreet maken: naar feiten en naar voorbeelden'],
    ['Wat zijn abstraherende vragen?','Vragen die het antwoord algemener maken: naar betekenis van woorden en naar redenen'],
    ['"Wat bedoel je met…?" is een vraag naar…','Betekenis (abstraherend)'],
    ['"Waarom denk je dat?" is een vraag naar…','Redenen (abstraherend)'],
    ['"Geef eens een voorbeeld" is een vraag naar…','Voorbeelden (concretiserend)'],
    ['"Hoeveel keer…? Wanneer…?" is een vraag naar…','Feiten (concretiserend)'],
    ['De 4 vragen van Kant?','Wat kan ik weten? Wat moet ik doen? Waar mag ik op hopen? Wat is de mens?'],
    ['De 2 eigenschappen van filosofie (video)?','Vragen stellen met een nieuwsgierige, open blik + heel precies en zorgvuldig nadenken'],
    ['Welke houding heeft een filosoof (video)?','Alles mag bevraagd worden']
  ],
  quiz:[
    {t:'mc',v:'In welke kamer van het huis van de filosofie hoort de vraag "Bestaat God?"',o:['Bovenwereld','Wereld','Het Schone','Het Goede'],a:0},
    {t:'mc',v:'In welke kamer hoort "Wat is een mooi kunstwerk?"',o:['Het Schone','Het Ware','Mens','Wereld'],a:0},
    {t:'mc',v:'In welke kamer hoort "Mag je liegen om iemand te beschermen?"',o:['Het Goede','Het Ware','Bovenwereld','Wereld'],a:0},
    {t:'mc',v:'In welke kamer hoort "Hoe is het heelal ontstaan?"',o:['Wereld','Mens','Het Schone','Het Goede'],a:0},
    {t:'mc',v:'In welke kamer hoort "Kunnen we ooit zeker iets weten?"',o:['Het Ware','Het Goede','Wereld','Bovenwereld'],a:0},
    {t:'mc',v:'In welke kamer hoort "Is de mens vrij?"',o:['Mens','Wereld','Het Schone','Bovenwereld'],a:0},
    {t:'mc',v:'"Waarop baseer je je antwoord?" is een…',o:['abstraherende vraag naar redenen','concretiserende vraag naar feiten','concretiserende vraag naar voorbeelden','weetvraag'],a:0},
    {t:'mc',v:'"Wat moet ik me concreet voorstellen bij …?" is een…',o:['concretiserende vraag naar voorbeelden','abstraherende vraag naar betekenis','abstraherende vraag naar redenen','meningsvraag'],a:0},
    {t:'jf',v:'De natuurwetenschappen maakten zich in de 16e eeuw los van de filosofie.',a:true},
    {t:'jf',v:'Filosofie bestuderen betekent zelf filosoferen.',a:false,u:'Bestuderen = meedenken met filosofen; beoefenen = zelf filosoferen.'},
    {t:'invul',v:'De drie grote waarden van Plato zijn het Ware, het Goede en het …',a:['schone','het schone']},
    {t:'mc',v:'Welke vraag is NIET een van de 4 vragen van Kant?',o:['Waaruit bestaat alles?','Wat kan ik weten?','Wat moet ik doen?','Wat is de mens?'],a:0}
  ]
},
{
  id:'KF5', vak:'kf', titel:'Wat is kunst? Kunstvormen',
  bron:[['Cursus kunstbeschouwing p. 1–4', D('1auWuIyLQnay90JHdKlZjFiL1hiCUi_yN')],['Presentatie P1 Wat is kunst?', D('1fmKTk7rpHfs89CLRCG6q5GA5kNTrIqPr')]],
  samenvatting:[
    '<h4>🎨 Wat is kunst?</h4><p>Kunst is <b>moeilijk te definiëren</b>. Samengevat, kunst …</p><div class="lp-tegels k2"><div><i>⭐</i><b>is een bewuste creatie</b><small>van iets moois en/of betekenisvols</small></div><div><i>⭐</i><b>vraagt vaardigheden en verbeelding</b><small>van de kunstenaar</small></div><div><i>⭐</i><b>prikkelt de zintuigen</b><small>en/of maakt emoties los</small></div><div><i>⭐</i><b>verandert doorheen de tijd</b></div><div><i>⭐</i><b>verschilt per cultuur</b></div></div><p class="lp-tip">💡 Onthoud de <b>5 sterren</b>.</p>',
    '<h4>⏳ Kunst verandert: middeleeuwen → renaissance</h4><div class="lp-vs"><div><b>⛪ middeleeuwen</b><u>religieus</u> en gestileerd<small>weinig perspectief</small></div><div><b>🖼️ renaissance</b><u>realistisch</u><small>anatomie, licht en schaduw, perspectief · humanisme · Leonardo da Vinci, Michelangelo</small></div></div>',
    '<h4>🪑 Performance: Marina Abramović</h4><p><b><i>The Artist is Present</i></b> in het <b>MoMA</b> (New York).</p><div class="lp-tegels"><div><i>📅</i><b>3 maanden</b></div><div><i>🤫</i><b>zwijgend</b><small>mensen zaten tegenover haar</small></div><div><i>👀</i><b>alleen kijken</b><small>en emoties voelen</small></div></div>',
    '<h4>🗂️ 3 grote categorieën kunstvormen</h4><div class="lp-tegels"><div><i>🖌️</i><b>beeldende kunsten</b><small>schilderkunst, beeldhouwkunst, architectuur, fotografie, strips, design (meubels, fashion)</small></div><div><i>🎭</i><b>podiumkunsten</b><small><b>woord</b>: theater, poëzie, literatuur<br><b>dans</b>: ballet<br><b>muziek</b>: orkest, zingen, opera</small></div><div><i>🎬</i><b>audiovisuele kunsten</b><small>film, tv, videokunst, digital art</small></div></div>',
    '<h4>🔀 Mengvormen</h4><p>Sommige kunst hoort bij <b>meer dan één</b> categorie:</p><div class="lp-tegels k2"><div><i>🎤</i><b>musical</b><small>woord + dans + muziek</small></div><div><i>🧱</i><b>graffiti</b></div><div><i>📽️</i><b>video tijdens theater</b></div><div><i>🧍</i><b>performance art</b></div></div>'
  ],
  kaarten:[
    ['Noem de 5 kenmerken van kunst (samenvatting cursus)','Bewuste creatie van iets moois/betekenisvols · vaardigheden en verbeelding · zintuigen prikkelen/emoties losmaken · verandert in de tijd · verschilt per cultuur'],
    ['De 3 grote categorieën kunstvormen?','Beeldende kunsten, podiumkunsten, audiovisuele kunsten (+ mengvormen)'],
    ['Geef 4 beeldende kunsten','Schilderkunst, beeldhouwkunst, architectuur, fotografie (ook design, strips)'],
    ['In welke 3 groepen verdeel je de podiumkunsten?','Woord, dans, muziek'],
    ['Geef 3 audiovisuele kunsten','Film, tv, videokunst (ook digital art)'],
    ['Geef 3 mengvormen','Musical, graffiti, performance art (videobeelden tijdens theater)'],
    ['Opera is een…','Podiumkunst (muziek)'],
    ['Ballet is een…','Podiumkunst (dans)'],
    ['Poëzie en theater zijn…','Podiumkunsten (woord)'],
    ['Architectuur is een…','Beeldende kunst'],
    ['Wie maakte "The Artist is Present"?','Marina Abramović (performance in het MoMA, New York)'],
    ['Hoe veranderde kunst van middeleeuwen naar renaissance?','Van religieus en gestileerd zonder perspectief naar realistisch, met anatomie, licht en schaduw en perspectief; de mens centraal (humanisme)']
  ],
  quiz:[
    {t:'mc',v:'Tot welke categorie behoort fotografie?',o:['Beeldende kunsten','Podiumkunsten','Audiovisuele kunsten','Mengvormen'],a:0},
    {t:'mc',v:'Tot welke categorie behoort een musical?',o:['Mengvormen','Beeldende kunsten','Audiovisuele kunsten','Podiumkunsten – woord'],a:0},
    {t:'mc',v:'Tot welke categorie behoort film?',o:['Audiovisuele kunsten','Beeldende kunsten','Podiumkunsten','Mengvormen'],a:0},
    {t:'mc',v:'Tot welke categorie behoort graffiti?',o:['Mengvormen','Podiumkunsten','Audiovisuele kunsten','Toegepaste kunst'],a:0},
    {t:'mc',v:'Opera hoort bij de podiumkunsten, in de groep…',o:['muziek','woord','dans','beeld'],a:0},
    {t:'jf',v:'Volgens de cursus is wat als kunst gezien wordt overal en altijd hetzelfde.',a:false,u:'Kunst verandert doorheen de tijd en verschilt per cultuur.'},
    {t:'jf',v:'Kunst is altijd een bewuste creatie.',a:true},
    {t:'mc',v:'Wat hoort NIET bij de definitie van kunst uit de cursus?',o:['Het moet altijd duur zijn','Vaardigheden en verbeelding','Emoties losmaken','Verandert doorheen de tijd'],a:0},
    {t:'open',v:'Geef de definitie van kunst met de 5 kenmerken.',m:'Kunst is altijd een bewuste creatie van iets moois en/of betekenisvols, waarbij de kunstenaar vaardigheden en verbeelding gebruikt. Het heeft tot doel de zintuigen te prikkelen en/of emoties los te maken, verandert doorheen de tijd en kan sterk verschillen per cultuur.'}
  ]
},
{
  id:'KF6', vak:'kf', titel:'Kunst door de eeuwen tot 1900',
  bron:[['Cursus kunstbeschouwing p. 5–9', D('1auWuIyLQnay90JHdKlZjFiL1hiCUi_yN')],['Presentatie P2 Stromingen', D('1_EdRKx261jxac7S4Td8ldyDmyGooCzfe')]],
  samenvatting:[
    '<h4>🖼️ Kunst in 3 fasen</h4><div class="lp-stroom"><div><span>vóór de stromingen</span><b>alles ligt vast in regels, weinig creativiteit</b></div><div><span>stromingen vóór 1900</span><b>persoonlijker, een eigen stijl</b></div><div class="groen"><span>stromingen na 1900</span><b>compleet nieuwe kijk, experimenteren</b></div></div><p class="lp-tip">🎯 Op de toets: herken de <b>stroming</b> van een kunstwerk en zeg <b>waarom</b>: stroming, wanneer, kenmerken.</p>',
    '<h4>🏺 De oudheid</h4><table class="lp-ww lp-tijd"><tr><td>🦴 Prehistorie<br><small>40.000 – 3000 v.C.</small></td><td>realiteit zo <b>nauwkeurig</b> mogelijk nabootsen · <b>venusbeeldjes</b> (vruchtbaarheid, religie) · kunstenaars onbekend</td></tr><tr><td>🏛️ Oude Grieken<br><small>3000 – 400 v.C.</small></td><td>werkelijkheid <b>mooier</b> dan ze is · <b>perfecte, gespierde</b> lichamen</td></tr><tr><td>🦅 Romeinen<br><small>300 v.C. – 500 n.C.</small></td><td><b>waarheidsgetrouwer</b> · ook kinderen, ouderen met <b>rimpels</b>, kalend</td></tr></table><div class="lp-vs"><div><b>🏛️ Grieken</b><u>ideaal</u> 💪</div><div><b>🦅 Romeinen</b><u>echt</u> 👴</div></div>',
    '<h4>⛪ Middeleeuwen en renaissance</h4><div class="lp-vs"><div><b>⛪ middeleeuwen</b>500 – 1100 (cursus)<small>uitgesproken <b>godsdienstig</b> · de christelijke leer verspreiden · verhalen uit de <b>Bijbel</b> · in <b>Romaanse en Gotische kerken</b></small></div><div><b>🌅 renaissance</b>1400 – 1530<small>“<b>hergeboorte</b>” van de klassieke schoonheid · <b>de mens centraal</b>: anatomie, emoties, portretten</small></div></div>',
    '<h4>🎭 Barok en classicisme</h4><div class="lp-vs"><div><b>🎭 barok</b>1600 – 1750<small><b>overdadig, dramatisch, weelderig</b> · veel <b>contrast</b> (licht en schaduw) en <b>emotie</b> · Bijbel opnieuw inspiratie</small></div><div><b>🏛️ classicisme</b>1720 – 1770<small>trouw aan de renaissance · <b>terug naar Grieken en Romeinen</b> · figuren <b>heldhaftig</b> · vaak christelijk</small></div></div>',
    '<h4>👷 Realisme en impressionisme</h4><div class="lp-vs"><div><b>👷 realisme</b>1840 – 1880<small>reactie op classicisme en barok · <b>nuchter</b> de maatschappij tonen · de <b>gewone arbeider</b> centraal</small></div><div><b>🌻 impressionisme</b>1870 – 1905<small>reactie op de regeltjes · <b>momentopnamen</b> (impressies) van het dagelijks leven · <b>snelle penseelstreken</b>, levendige kleuren · voorloper van de moderne kunst</small></div></div>',
    '<h4>🧭 Alles op een rij</h4><div class="lp-ketting"><span>🦴 prehistorie</span><i>→</i><span>🏛️ Grieken</span><i>→</i><span>🦅 Romeinen</span><i>→</i><span>⛪ middeleeuwen</span><i>→</i><span>🌅 renaissance</span><i>→</i><span>🎭 barok</span><i>→</i><span>🏛️ classicisme</span><i>→</i><span>👷 realisme</span><i>→</i><span>🌻 impressionisme</span></div><p class="lp-tip">💡 Elke nieuwe stroming is vaak een <b>reactie</b> op de vorige.</p>'
  ],
  kaarten:[
    ['3 fasen in de kunstgeschiedenis?','Voor de kunststromingen · kunststromingen voor 1900 · kunststromingen na 1900'],
    ['Kenmerk "voor de kunststromingen"?','Inhoud en vorm liggen vast in regels, weinig ruimte voor creativiteit'],
    ['Kenmerk stromingen vóór 1900?','Kunst wordt persoonlijker, artiesten krijgen een eigen stijl, stromingen ontstaan'],
    ['Prehistorie: periode en kenmerken?','40.000–3000 v.C. · realiteit nauwkeurig nagebootst · venusbeeldjes · kunstenaars onbekend'],
    ['Oude Grieken: periode en kenmerken?','3000–400 v.C. · werkelijkheid mooier voorgesteld · perfecte, ideale, gespierde lichamen'],
    ['Romeinen: periode en kenmerken?','300 v.C.–500 n.C. · waarheidsgetrouwer · ook kinderen en ouderen met rimpels, kalend'],
    ['Middeleeuwen: kenmerken?','Godsdienstig karakter · christelijke leer verspreiden · Bijbelverhalen · Romaanse en Gotische kerken'],
    ['Renaissance: periode en kenmerken?','1400–1530 · "hergeboorte" · klassieke schoonheidsidealen terug · de mens centraal'],
    ['Wat betekent "renaissance"?','Hergeboorte'],
    ['Barok: periode en kenmerken?','1600–1750 · overdadig, dramatisch, weelderig · veel contrast en emotie · Bijbel als inspiratie'],
    ['Classicisme: periode en kenmerken?','1720–1770 · terug naar Griekse/Romeinse voorbeelden · heldhaftige figuren · trouw aan renaissance-meesters · vaak christelijk'],
    ['Realisme: periode en kenmerken?','1840–1880 · reactie op classicisme en barok · nuchtere weergave van de werkelijkheid · gewone arbeider centraal'],
    ['Impressionisme: periode en kenmerken?','1870–1905 · momentopnamen/impressies van het dagelijks leven · minder correcte techniek · voorloper moderne kunst'],
    ['Welke stroming is de voorloper van de moderne kunst?','Het impressionisme'],
    ['Welke stroming toont typisch de gewone arbeider?','Het realisme'],
    ['Typisch beeldje uit de prehistorie?','Venusbeeldjes']
  ],
  quiz:[
    {t:'mc',v:'Een schilderij met sterke licht-donkercontrasten, veel drama en emotie en een Bijbels verhaal. Welke stroming?',o:['Barok','Realisme','Impressionisme','Prehistorie'],a:0},
    {t:'mc',v:'Een nuchter schilderij van boeren die op het veld werken, zonder idealisering. Welke stroming?',o:['Realisme','Classicisme','Barok','Renaissance'],a:0},
    {t:'mc',v:'Snelle penseelstreken, een zonnig moment aan het water, levendige kleuren. Welke stroming?',o:['Impressionisme','Classicisme','Middeleeuwen','Realisme'],a:0},
    {t:'mc',v:'Een marmeren beeld van een perfect gespierde atleet, mooier dan in het echt. Welke periode?',o:['Oude Grieken','Romeinen','Prehistorie','Realisme'],a:0},
    {t:'mc',v:'Een borstbeeld van een oude man met rimpels en een kaal hoofd. Welke periode?',o:['Romeinen','Oude Grieken','Renaissance','Barok'],a:0},
    {t:'mc',v:'Welke periode komt eerst?',o:['Renaissance','Barok','Classicisme','Realisme'],a:0},
    {t:'mc',v:'Waarop is het realisme een reactie?',o:['Op de overdreven stijl van classicisme en barok','Op de fotografie','Op het expressionisme','Op de prehistorie'],a:0},
    {t:'jf',v:'In de renaissance staat de mens centraal.',a:true},
    {t:'jf',v:'Het classicisme keert terug naar Griekse en Romeinse voorbeelden.',a:true},
    {t:'jf',v:'Bij de kunst uit de prehistorie kennen we de namen van de kunstenaars.',a:false},
    {t:'invul',v:'De stroming van 1870–1905 die momentopnamen van het dagelijks leven schildert: het …',a:['impressionisme']},
    {t:'invul',v:'"Renaissance" betekent letterlijk …',a:['hergeboorte','wedergeboorte']},
    {t:'volgorde',v:'Zet in de juiste volgorde (oudste eerst).',o:['Prehistorie','Oude Grieken','Romeinen','Middeleeuwen','Renaissance','Barok','Classicisme','Realisme','Impressionisme']}
  ]
},
{
  id:'KF7', vak:'kf', titel:'Kunststromingen na 1900',
  bron:[['Cursus kunstbeschouwing p. 10–12', D('1auWuIyLQnay90JHdKlZjFiL1hiCUi_yN')],['Presentatie P2 Stromingen', D('1_EdRKx261jxac7S4Td8ldyDmyGooCzfe')]],
  samenvatting:[
    '<h4>📷 Na 1900: alles wordt anders</h4><div class="lp-ketting"><span>📷 de fotografie komt</span><i>→</i><span>minder vraag naar realistische kunst</span><i>→</i><span>🧪 kunstenaars gaan experimenteren</span></div><p class="lp-tip">💡 Ezelsbrug voor de volgorde: <b>E K D S P</b> = “<b>E</b>lke <b>K</b>eeper <b>D</b>ooft <b>S</b>oms <b>P</b>enalty\'s” ⚽</p>',
    '<h4>😱 Expressionisme en 🟦 kubisme</h4><div class="lp-vs"><div><b>😱 expressionisme</b>1905 – 1940<small><b>gevoelens uitdrukken</b> · persoonlijke, onderbewuste reacties (niet de zintuiglijke indruk zoals bij het impressionisme) · soms “gekke” werkelijkheid · <b>krachtige kleuren, sterke lijnen</b></small></div><div><b>🟦 kubisme</b>1906 – 1920<small>vormen uit de natuur → <b>geometrische vormen</b> (bol, kegel, cilinder, kubus) · het <b>perspectief klopt meestal niet</b></small></div></div>',
    '<h4>🚽 Dadaïsme</h4><p><b>1916 – 1926</b></p><div class="lp-tegels k2"><div><i>📢</i><b>politiek gericht</b><small>tegen de kunstwereld en de machthebbers</small></div><div><i>💡</i><b>concept > techniek</b><small>het idee telt meer</small></div><div><i>♻️</i><b>bestaande voorwerpen</b><small>of afbeeldingen, en die bewerken</small></div><div><i>😜</i><b>provocerend</b><small>wil choqueren</small></div></div>',
    '<h4>🌙 Surrealisme en 🥫 Pop Art</h4><div class="lp-vs"><div><b>🌙 surrealisme</b>1924 – 1940<small>geïnspireerd door <b>dromen</b> · stijl <b>realistisch en gedetailleerd</b>, maar de voorstelling is <b>absurd</b> · gekke combinaties</small></div><div><b>🥫 Pop Art</b>vooral jaren 1960<small>obsessie met de <b>massacultuur</b> · <b>strips, cartoons, alledaagse objecten, wereldsterren</b></small></div></div>',
    '<h4>🧭 Alles op een rij</h4><table class="lp-ww lp-tijd"><tr><td>1905</td><td>😱 <b>E</b>xpressionisme: gevoelens</td></tr><tr><td>1906</td><td>🟦 <b>K</b>ubisme: geometrische vormen</td></tr><tr><td>1916</td><td>🚽 <b>D</b>adaïsme: concept, provocatie</td></tr><tr><td>1924</td><td>🌙 <b>S</b>urrealisme: dromen, absurd</td></tr><tr><td>jaren 60</td><td>🥫 <b>P</b>op Art: massacultuur</td></tr></table>'
  ],
  kaarten:[
    ['Waarom verandert kunst na 1900 compleet?','Door de fotografie is er minder vraag naar realistische kunst; kunstenaars gaan experimenteren'],
    ['Expressionisme: periode en kenmerken?','1905–1940 · gevoelens uitdrukken · persoonlijke, onderbewuste reacties · soms "gekke" weergave van de werkelijkheid'],
    ['Verschil impressionisme – expressionisme?','Impressionisme: zintuiglijke indrukken (momentopnamen). Expressionisme: innerlijke gevoelens, onderbewuste reacties'],
    ['Kubisme: periode en kenmerken?','1906–1920 · natuur in geometrische vormen (bol, kegel, cilinder, kubus) · perspectief klopt niet'],
    ['Dadaïsme: periode en kenmerken?','1916–1926 · politiek gericht · tegen gevestigde kunstwereld en machthebbers · concept > techniek · bestaande voorwerpen bewerken'],
    ['Surrealisme: periode en kenmerken?','1924–1940 · droombeelden · realistische, gedetailleerde stijl maar absurde voorstellingen · gekke combinaties'],
    ['Pop Art: periode en kenmerken?','Jaren 1960 · massacultuur · cartoons, strips, alledaagse objecten, beroemde sterren'],
    ['Welke stroming: concept belangrijker dan technische vaardigheid?','Dadaïsme'],
    ['Welke stroming: realistisch geschilderd maar absurd, zoals in een droom?','Surrealisme'],
    ['Welke stroming: alles in kubussen, kegels en cilinders?','Kubisme'],
    ['Welke stroming gebruikt strips en beroemdheden?','Pop Art']
  ],
  quiz:[
    {t:'mc',v:'Een realistisch geschilderde smeltende klok die over een tak hangt in een woestijn. Welke stroming?',o:['Surrealisme','Kubisme','Realisme','Pop Art'],a:0},
    {t:'mc',v:'Een portret van een filmster, herhaald in felle kleuren zoals in een strip. Welke stroming?',o:['Pop Art','Dadaïsme','Expressionisme','Impressionisme'],a:0},
    {t:'mc',v:'Een gezicht opgebouwd uit hoekige vlakken en kubussen, bekeken vanuit verschillende kanten tegelijk. Welke stroming?',o:['Kubisme','Surrealisme','Barok','Expressionisme'],a:0},
    {t:'mc',v:'Een urinoir dat in een museum wordt gezet als protest tegen de kunstwereld. Welke stroming?',o:['Dadaïsme','Pop Art','Realisme','Classicisme'],a:0},
    {t:'mc',v:'Een schreeuwende figuur met golvende lijnen en angstige, felle kleuren. Welke stroming?',o:['Expressionisme','Impressionisme','Kubisme','Renaissance'],a:0},
    {t:'mc',v:'Welke stroming is geïnspireerd door droombeelden?',o:['Surrealisme','Dadaïsme','Kubisme','Realisme'],a:0},
    {t:'jf',v:'Bij het dadaïsme is de technische vaardigheid van de kunstenaar het belangrijkst.',a:false,u:'Het concept is belangrijker dan de techniek.'},
    {t:'jf',v:'Bij het kubisme klopt het perspectief meestal niet.',a:true},
    {t:'invul',v:'Pop Art is vooral populair in de jaren …',a:['60','1960','zestig']},
    {t:'volgorde',v:'Zet de stromingen na 1900 in volgorde van ontstaan.',o:['Expressionisme','Kubisme','Dadaïsme','Surrealisme','Pop Art']},
    {t:'open',v:'Een kunstwerk toont een droomlandschap met een vis met mensenbenen, heel gedetailleerd geschilderd. Welke stroming? Geef twee kenmerken als argument.',m:'Surrealisme: geïnspireerd door droombeelden; realistische, gedetailleerde schilderstijl maar een absurde voorstelling met een gekke combinatie van onderwerpen (vis + mensenbenen).'}
  ]
},
{
  id:'KF8', vak:'kf', titel:'Kunst lezen & functies van kunst',
  bron:[['Cursus kunstbeschouwing p. 13–21', D('1auWuIyLQnay90JHdKlZjFiL1hiCUi_yN')]],
  samenvatting:[
    '<h4>🔍 Kunst lezen in 5 stappen</h4><table class="lp-ww lp-tijd"><tr><td>1 <b>eerste indruk</b></td><td>wat komt spontaan op? Eerlijk, nog niet verklaren.</td></tr><tr><td>2 <b>beschrijven</b></td><td>wat zie of hoor je? 📷 Camera-oog: zo objectief mogelijk, geen mening.</td></tr><tr><td>3 <b>analyseren</b></td><td>hoe is het gemaakt? Materiaal, techniek, compositie, kleur, licht, perspectief.</td></tr><tr><td>4 <b>interpreteren</b></td><td>wat betekent het? Koppel aan concrete elementen uit het werk.</td></tr><tr><td>5 <b>evalueren</b></td><td>wat vind jij ervan en <b>waarom</b>? Leer je er iets uit?</td></tr></table><p class="lp-tip">💡 Ezelsbruggetje: <b>E-B-A-I-E</b>. Pas bij stap 5 geef je je mening!</p>',
    '<h4>🌻 Decoratieve functie</h4><div class="lp-tegels"><div><i>🎄</i><b>decoratie</b><small>enkel versiering, massaproductie, geen boodschap: slingers, kerstlichtjes</small></div><div><i>🪑</i><b>toegepaste kunst</b><small>mooi én nuttig = design: designstoel, lamp, mode, architectuur</small></div><div><i>🖼️</i><b>beeldende kunst</b><small>schone kunsten: geen praktisch nut, wel een idee of gevoel</small></div></div><p class="lp-tip">🌻 <b>Ai Weiwei</b>, <i>Sunflower Seeds</i> (Tate Modern, 2010): miljoenen porseleinen zaadjes uit Jingdezhen. Kritiek op <b>Mao</b> en <b>massaproductie</b>.</p>',
    '<h4>😌 Ontspannende functie</h4><p>Kunst helpt je tot <b>rust</b> te komen, als je ervoor openstaat.</p><div class="lp-tegels k2"><div><i>🧘</i><b>stress loslaten</b><small>de hartslag vertraagt</small></div><div><i>🧠</i><b>geestelijke gezondheid</b></div><div><i>🪞</i><b>zelfaanvaarding</b></div><div><i>🎯</i><b>concentratie</b><small>en sociale ontwikkeling bij jongeren</small></div></div>',
    '<h4>💰 Economische functie</h4><p>Met kunst verdienen de <b>kunstenaar</b> én de <b>handelaar of investeerder</b> geld (op lange termijn vooral die laatsten).</p><div class="lp-tegels"><div><i>👑</i><b>opdracht&shy;gevers</b><small>tot eind 19e eeuw: kerk, adel, koningen <b>betalen en bepalen</b></small></div><div><i>🏬</i><b>galerij</b><small>verkoopt hedendaagse kunst, winst vaak 50/50</small></div><div><i>🔨</i><b>veilinghuis</b><small>verkoop per opbod</small></div></div><p class="lp-tip">🍌 <b>Maurizio Cattelan</b>: een banaan met ducttape (120.000 dollar) en een gouden wc.</p>',
    '<h4>🤝 Maatschappelijke functie</h4><div class="lp-vs"><div><b>🪞 spiegel</b>kunst toont de <u>maatschappij</u></div><div><b>🤝 verbinden</b>kunst brengt <u>mensen</u> samen<small>generaties, culturen → sociale cohesie</small></div></div><p class="lp-tip">⛰️ <b>Francis Alÿs</b>, <i>When Faith Moves Mountains</i> (Lima, 2002): <b>800 vrijwilligers</b> verplaatsen een duin <b>10 cm</b>. Ook <b>Banksy</b>.</p>'
  ],
  kaarten:[
    ['De 5 stappen om kunst te lezen?','Eerste indruk – beschrijven – analyseren – interpreteren – evalueren'],
    ['Stap "beschrijven": wat doe je?','Objectief vertellen wat je ziet of hoort, met een camera-oog, zonder mening'],
    ['Stap "analyseren": wat doe je?','Onderzoeken hoe het gemaakt is: materialen, technieken, compositie, kleur, licht, perspectief'],
    ['Stap "interpreteren": wat doe je?','Betekenis geven: wat wil de kunstenaar zeggen? Onderbouwd met elementen uit het werk'],
    ['Stap "evalueren": wat doe je?','Je persoonlijke, beargumenteerde oordeel geven'],
    ['Verschil decoratie – decoratieve kunst – beeldende kunst?','Decoratie: enkel versiering. Decoratieve (toegepaste) kunst: mooi én nuttig. Beeldende kunst: geen praktisch nut, drukt idee/gevoel uit'],
    ['Ander woord voor decoratieve kunst?','Toegepaste kunst'],
    ['Ander woord voor beeldende kunst?','Schone kunsten'],
    ['Voorbeeld van toegepaste kunst?','Designstoel, kunstzinnige lamp, servies, architectuur, mode'],
    ['Wie maakte de porseleinen zonnebloempitten in de Tate Modern?','Ai Weiwei (2010)'],
    ['Wat is de economische functie van kunst?','Met kunst kan geld verdiend worden door kunstenaar, liefhebber, investeerder en handelaar'],
    ['"Opdrachtgevers betalen en bepalen": wat betekent dat?','Tot eind 19e eeuw bepaalden kerk, adel en koningen als betalers ook de inhoud van de kunst'],
    ['Galerij vs. veilinghuis?','Galerij: galerist verkoopt werk van hedendaagse kunstenaars (vaak 50/50). Veilinghuis: verkoop per opbod aan de hoogste bieder'],
    ['Wie plakte een banaan met ducttape aan de muur?','Maurizio Cattelan'],
    ['Wat is de maatschappelijke functie van kunst?','Kunst als spiegel van de maatschappij én kunst verbindt mensen (sociale cohesie)'],
    ['When Faith Moves Mountains: wie, wat?','Francis Alÿs, 2002, Lima: 800 vrijwilligers verplaatsen een duin 10 cm'],
    ['Hoe kan kunst ontspannen?','Je aandacht verschuift van zorgen naar kleuren, klanken, vormen; stress daalt, hartslag vertraagt']
  ],
  quiz:[
    {t:'mc',v:'"Ik zie een vrouw in een blauwe jurk naast een raam." In welke stap zit je?',o:['Beschrijven','Interpreteren','Evalueren','Analyseren'],a:0},
    {t:'mc',v:'"Het licht valt van links en de kleuren contrasteren sterk." In welke stap zit je?',o:['Analyseren','Beschrijven','Eerste indruk','Evalueren'],a:0},
    {t:'mc',v:'"Ik denk dat de kunstenaar eenzaamheid wil tonen." In welke stap zit je?',o:['Interpreteren','Beschrijven','Analyseren','Eerste indruk'],a:0},
    {t:'mc',v:'"Ik vind het sterk omdat het me doet nadenken over …" In welke stap zit je?',o:['Evalueren','Interpreteren','Analyseren','Beschrijven'],a:0},
    {t:'mc',v:'Een designlamp van een bekende ontwerper is…',o:['decoratieve (toegepaste) kunst','decoratie','beeldende kunst','podiumkunst'],a:0},
    {t:'mc',v:'Kerstlichtjes aan je huis zijn…',o:['decoratie','toegepaste kunst','beeldende kunst','schone kunsten'],a:0},
    {t:'mc',v:'Welke functie van kunst illustreert de banaan van Cattelan vooral?',o:['Economische functie','Ontspannende functie','Decoratieve functie','Religieuze functie'],a:0},
    {t:'mc',v:'Welke functie illustreert "When Faith Moves Mountains" vooral?',o:['Maatschappelijke functie','Economische functie','Decoratieve functie','Ontspannende functie'],a:0},
    {t:'jf',v:'Bij een veilinghuis wordt kunst per opbod verkocht.',a:true},
    {t:'jf',v:'Bij "beschrijven" geef je al je mening over het kunstwerk.',a:false},
    {t:'volgorde',v:'Zet de stappen van kunst lezen in de juiste volgorde.',o:['Eerste indruk','Beschrijven','Analyseren','Interpreteren','Evalueren']}
  ]
}
);
})();
