// Visuele samenvattingen per onderwerp (Nederlands): schema's, tabellen en tekeningen.
// Ze staan bovenaan elke les (en op de ouderpagina). window.ELI_VISUEEL[onderwerp-id] = html
(function(){
// ---------- Bouwstenen ----------
const tijdlijn = (items, titel) => `<div class="vz"><div class="vz-t">${titel || 'Tijdlijn'}</div><div class="tl">${items.map(([wanneer, wat, uitleg, kleur]) =>
  `<div class="tl-i" style="--k:${kleur || 'var(--paars)'}"><span class="tl-w">${wanneer}</span><b>${wat}</b>${uitleg ? `<span class="tl-u">${uitleg}</span>` : ''}</div>`).join('')}</div></div>`;
const stappen = (items, titel) => `<div class="vz"><div class="vz-t">${titel}</div><div class="st">${items.map(([ic, wat, uitleg], i) =>
  `<div class="st-i"><span class="st-n">${ic || i + 1}</span><div><b>${wat}</b>${uitleg ? `<span>${uitleg}</span>` : ''}</div></div>`).join('<div class="st-p">↓</div>')}</div></div>`;
const groepen = (kolommen, titel) => `<div class="vz"><div class="vz-t">${titel}</div><div class="gr">${kolommen.map(([ic, kop, kleur, lijst]) =>
  `<div class="gr-k" style="--k:${kleur}"><div class="gr-kop"><span>${ic}</span>${kop}</div><ul>${lijst.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
const versus = ([ic1, kop1, k1, l1], [ic2, kop2, k2, l2], titel) => `<div class="vz"><div class="vz-t">${titel}</div><div class="vs">
  <div class="gr-k" style="--k:${k1}"><div class="gr-kop"><span>${ic1}</span>${kop1}</div><ul>${l1.map(x => `<li>${x}</li>`).join('')}</ul></div>
  <div class="vs-x">VS</div>
  <div class="gr-k" style="--k:${k2}"><div class="gr-kop"><span>${ic2}</span>${kop2}</div><ul>${l2.map(x => `<li>${x}</li>`).join('')}</ul></div></div></div>`;
const tabel = (kop, rijen, titel) => `<div class="vz"><div class="vz-t">${titel}</div><div class="tb-w"><table class="tb"><thead><tr>${kop.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rijen.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
const cirkel = (items, titel) => `<div class="vz"><div class="vz-t">${titel}</div><div class="kring">${items.map((x, i) =>
  `<div class="kr-i"><span>${i + 1}</span>${x}</div>`).join('<div class="kr-p">⬇</div>')}<div class="kr-terug">🔁 en zo begint alles opnieuw, telkens erger</div></div></div>`;
const vervoeg = (ww, stam, uitgangen, extra) => `<div class="vv"><div class="vv-k">${ww}</div>${['je','tu','il/elle','nous','vous','ils/elles'].map((p, i) =>
  `<div class="vv-r"><span>${p}</span><b>${(Array.isArray(stam) ? stam[i] : stam)}<em>${uitgangen[i]}</em></b></div>`).join('')}${extra ? `<div class="vv-x">${extra}</div>` : ''}</div>`;
const vvRij = (titel, lijst) => `<div class="vz"><div class="vz-t">${titel}</div><div class="vv-g">${lijst.join('')}</div></div>`;
const weetje = (ic, tekst) => `<div class="vz-tip"><span>${ic}</span><div>${tekst}</div></div>`;

const K = { paars:'#7048e8', oranje:'#e8590c', blauw:'#1971c2', groen:'#2f9e44', roze:'#c2255c', goud:'#e0a800', grijs:'#868e96', teal:'#0c8599', rood:'#e03131' };
// Een zin met gekleurde stukjes: [[tekst, kleur, label], ...] (kleur null = gewoon)
const zin = (delen, titel, onder) => `<div class="vz"><div class="vz-t">${titel}</div><div style="display:flex;flex-wrap:wrap;gap:6px 4px;align-items:flex-end;font-size:1.05rem;line-height:1.2">${delen.map(([t, k, l]) => k
  ? `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:3px"><b style="background:${k}22;border:2px solid ${k};border-radius:10px;padding:4px 8px">${t}</b><small style="font-size:.68rem;font-weight:800;color:${k};text-transform:uppercase;letter-spacing:.04em">${l || ''}</small></span>`
  : `<span style="padding:4px 2px 21px">${t}</span>`).join('')}</div>${onder ? `<div class="muted klein" style="margin-top:8px">${onder}</div>` : ''}</div>`;

const V = {
  N1: stappen([['🔎','Kijk rond het woord','lees de zin ervoor en erna: uitleg, voorbeeld of tegenstelling?'], ['✂️','Knip het woord in stukjes','on|breek|baar · skate|park · verzamel|woede'], ['👯','Lijkt het op een woord dat je kent?','ook Engels of Frans: vintage, collectie'], ['📖','Zoek op of vraag het','pas als 1, 2 en 3 niet lukken']], '4 woordstrategieën: eerst zelf raden, dan pas opzoeken')
    + weetje('✅', 'Controle: past de betekenis die je bedacht <b>in de zin</b>? Zo niet: probeer een andere strategie.'),
  N2: tabel(['Teksttype','Tekstdoel','Tekstsoorten (voorbeelden)'], [
      ['📘 informatief', '<b>informeren</b>', 'nieuwsbericht, folder, weerbericht'],
      ['🛠️ instructief', '<b>instrueren</b>', 'recept, handleiding, spelregels'],
      ['📣 overtuigend', '<b>overtuigen</b>', 'reclame, affiche, lezersbrief'],
      ['📚 verhalend', '<b>ontspannen</b>', 'strip, jeugdboek, sprookje, mop']], 'Type → doel → soort')
    + weetje('🧩', '<b>soort</b> = de vorm die je ziet · <b>type</b> = de groep · <b>doel</b> = waarom de schrijver het schreef'),
  N3: tijdlijn([['vóór het lezen','🔮 Voorspellend','titel, foto’s, tussentitels → waarover zal het gaan?', K.paars], ['snel kijken','🧭 Oriënterend','is deze tekst nuttig voor mij?', K.teal], ['1 keer vlot','🌍 Globaal','waarover gaat de tekst? (grote lijn)', K.blauw], ['scannen','🔦 Zoekend','één gegeven zoeken: uur, prijs, naam', K.goud], ['grondig','🔬 Intensief','alles begrijpen en onthouden (studeren!)', K.oranje], ['voor je plezier','😌 Genietend','strip, spannend boek', K.roze]], 'Leesstrategieën: van snel naar grondig'),
  N4: `<div class="vz"><div class="vz-t">Een tekst ontleden</div><svg viewBox="0 0 320 210" class="svg" role="img" aria-label="Tekst met inleiding, midden en slot">
      <rect x="10" y="8" width="150" height="194" rx="10" fill="var(--kaart)" stroke="${K.grijs}" stroke-width="2"/>
      <rect x="22" y="20" width="126" height="26" rx="5" fill="${K.paars}33"/><text x="85" y="37" text-anchor="middle" font-size="10" font-weight="800" fill="${K.paars}">INLEIDING</text>
      <rect x="22" y="56" width="126" height="34" rx="5" fill="${K.oranje}22"/><rect x="22" y="98" width="126" height="34" rx="5" fill="${K.oranje}22"/><rect x="22" y="140" width="126" height="20" rx="5" fill="${K.oranje}22"/>
      <text x="85" y="77" text-anchor="middle" font-size="10" font-weight="800" fill="${K.oranje}">alinea 1</text><text x="85" y="119" text-anchor="middle" font-size="10" font-weight="800" fill="${K.oranje}">alinea 2</text><text x="85" y="154" text-anchor="middle" font-size="10" font-weight="800" fill="${K.oranje}">alinea 3</text>
      <rect x="22" y="170" width="126" height="22" rx="5" fill="${K.teal}33"/><text x="85" y="185" text-anchor="middle" font-size="10" font-weight="800" fill="${K.teal}">SLOT</text>
      <text x="168" y="37" font-size="10" fill="var(--inkt)">← waarover? maakt nieuwsgierig</text>
      <text x="168" y="100" font-size="10" fill="var(--inkt)">← MIDDEN: 1 alinea =</text><text x="176" y="113" font-size="10" fill="var(--inkt)">1 deelonderwerp = 1 hoofdpunt</text>
      <text x="168" y="134" font-size="9" fill="${K.grijs}">(witregel of inspringen</text><text x="176" y="146" font-size="9" fill="${K.grijs}">= nieuwe alinea)</text>
      <text x="168" y="185" font-size="10" fill="var(--inkt)">← besluit / samenvatting</text></svg></div>`
    + versus(['📌','Hoofdzaak', K.oranje, ['hoofdgedachte = boodschap in 1 zin','hoofdpunten = 1 per alinea','weglaten → boodschap verandert']], ['🪶','Bijzaak', K.grijs, ['voorbeelden, getallen','vergelijkingen, grapjes','weglaten → boodschap blijft']], 'De weglaattest'),
  N5: versus(['👀','Uiterlijk (wat je ziet)', K.blauw, ['algemeen: leeftijd, lengte, gestalte','hoofd: haar, ogen, gezicht','kleding','iets opvallends']], ['💭','Karakter (hoe iemand is)', K.roze, ['behulpzaam, grappig, koppig…','altijd met een voorbeeld als bewijs']], 'Iemand beschrijven: van boven naar onder, van algemeen naar detail')
    + tabel(['🙂 positief','😐 neutraal','🙁 negatief'], [['slank','dun','mager'], ['spaarzaam','zuinig','gierig'], ['vastberaden','volhoudend','koppig'], ['nieuwsgierig','benieuwd','bemoeiziek']], 'Gevoelswaarde: zelfde betekenis, ander gevoel')
    + weetje('⚠️', 'Woorden kunnen <b>kwetsen</b>. Kies bij een beschrijving liever positief of neutraal.'),
  N6: zin([['het', K.teal, 'lidwoord'], ['zeldzame', K.paars, 'bijv. nw'], ['figuurtje', K.oranje, 'zelfst. nw'], ['van', null], ['Thor', K.oranje, 'eigennaam']], 'Drie woordsoorten', 'Zelfstandig naamwoord? Zet er <b>de, het</b> of <b>een</b> voor. Eigennaam = hoofdletter, soortnaam = kleine letter.')
    + tabel(['','de-woord','het-woord'], [['de / het …','de grot<b>e</b> doos','het grot<b>e</b> park'], ['een …','een grot<b>e</b> doos','een <b>groot</b> park ⚠️']], 'Bijvoeglijk naamwoord: wanneer een -e?')
    + weetje('✍️', 'groot → gro<b>t</b>e · dik → di<b>kk</b>e · lief → lie<b>v</b>e · boos → bo<b>z</b>e'),
  N7: groepen([['📢','Mededelend', K.blauw, ['je vertelt iets','eindigt op <b>.</b>']], ['❓','Vragend', K.paars, ['je vraagt iets','eindigt op <b>?</b>']], ['👉','Gebiedend', K.oranje, ['pv vooraan, geen onderwerp','<b>!</b> of <b>.</b>']], ['😮','Uitroepend', K.roze, ['je uit een gevoel','eindigt op <b>!</b>']]], 'Vier soorten zinnen')
    + weetje('🙊', '<b>Te veel leestekens</b> (?!?!!) klinkt boos of overdreven. In een brief of op het examen: één leesteken.'),
  N8: versus(['🔠','Wél een hoofdletter', K.oranje, ['begin van een zin','namen: Thor, Bobby','plaatsen: Gent, België, de Schelde','talen + inwoners: Nederlands, een Belg','feestdagen: Kerstmis, Pasen','organisaties, titels, God','Belgisch, Amerikaans']], ['🔡','Géén hoofdletter', K.grijs, ['dagen: maandag','maanden: december','seizoenen: winter','schoolvakken: wiskunde (behalve talen!)']], 'Hoofdletters')
    + weetje('⚠️', '’s Avonds aan het begin van een zin: de hoofdletter komt op het <b>tweede</b> woord.'),
  N9: zin([['Gisteren', null], ['kocht', K.rood, 'pv'], ['mijn broer', K.blauw, 'onderwerp'], ['een vintage worstelaar.', null]], 'Persoonsvorm en onderwerp', 'Onderwerp: <b>wie of wat + pv?</b> → Wie kocht? Mijn broer.')
    + stappen([['⏰','Tijdproef','andere tijd: het werkwoord dat verandert = pv'], ['🔢','Getalproef','enkelvoud ↔ meervoud: wat mee verandert = pv'], ['❓','Vraagproef','ja-neevraag: wat vooraan springt = pv']], '3 proeven om de pv te vinden')
    + weetje('🤝', '<b>Congruentie</b>: onderwerp en pv passen in getal. Een doos vol figuurtjes <b>staat</b> op de kast.'),
  N10: tabel(['wie','regel','worden','vinden','skaten'], [['ik','stam','word','vind','skate'], ['jij / je / u','stam + t','wordt','vindt','skatet'], ['hij / zij / het','stam + t','wordt','vindt','skatet'], ['wij / jullie / zij','hele ww','worden','vinden','skaten'], ['<b>Word jij…?</b>','inversie jij/je: geen t!','word jij','vind je','skate jij']], 'De OTT in één tabel')
    + weetje('🎯', 'd of t? Zoek eerst de <b>stam</b> (ik-vorm). Moet er een t bij? Stam op d + t = <b>dt</b>.'),
  N11: groepen([['🐻','Dieren', K.oranje, ['zo sterk als een beer','zo trots als een pauw','zo slim als een vos','zo bang als een wezel','zo doof als een kwartel','zo koppig als een ezel','zo glad als een aal']], ['🪶','Dingen', K.teal, ['zo oud als de straat','zo bleek als een doek','zo licht als een veertje','zo vlug als de wind','zo zacht als een lammetje']]], 'Vergelijkingen: zo … als …')
    + weetje('🧠', 'Leer ze als een <b>beeld</b>: een pauw met een kampioenengordel = <b>trots</b>.'),
  N12: versus(['🔓','Open vraag', K.teal, ['vrij en uitgebreid antwoorden','wie, wat, waar, wanneer, waarom, hoe?','goed voor een interview']], ['🔒','Gesloten vraag', K.grijs, ['vast antwoord','ja-neevraag: Skate jij?','keuzevraag: cola of water?']], 'Soorten vragen')
    + groepen([['💭','Retorisch', K.paars, ['geen antwoord verwacht','eigenlijk een mening']], ['👉','Suggestief', K.oranje, ['stuurt naar jouw antwoord','“Jij vindt dat toch ook?”']]], 'Nog twee speciale vragen'),
  N13: `<div class="vz"><div class="vz-t">Het communicatiemodel</div><svg viewBox="0 0 320 170" class="svg" role="img" aria-label="Zender stuurt boodschap via kanaal naar ontvanger">
      <rect x="6" y="40" width="80" height="50" rx="12" fill="${K.oranje}22" stroke="${K.oranje}" stroke-width="2"/><text x="46" y="62" text-anchor="middle" font-size="18">👤</text><text x="46" y="82" text-anchor="middle" font-size="10" font-weight="800" fill="${K.oranje}">ZENDER</text>
      <rect x="234" y="40" width="80" height="50" rx="12" fill="${K.blauw}22" stroke="${K.blauw}" stroke-width="2"/><text x="274" y="62" text-anchor="middle" font-size="18">👥</text><text x="274" y="82" text-anchor="middle" font-size="10" font-weight="800" fill="${K.blauw}">ONTVANGER</text>
      <rect x="110" y="30" width="100" height="30" rx="15" fill="${K.paars}22" stroke="${K.paars}" stroke-width="2"/><text x="160" y="49" text-anchor="middle" font-size="10" font-weight="800" fill="${K.paars}">💬 BOODSCHAP</text>
      <line x1="88" y1="75" x2="228" y2="75" stroke="var(--inkt)" stroke-width="2" marker-end="url(#pijl)"/><defs><marker id="pijl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--inkt)"/></marker></defs>
      <text x="160" y="92" text-anchor="middle" font-size="10" font-weight="800" fill="${K.teal}">📱 via het KANAAL</text>
      <path d="M232 100 Q160 140 88 100" fill="none" stroke="${K.grijs}" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#pijl)"/><text x="160" y="134" text-anchor="middle" font-size="9" fill="${K.grijs}">feedback</text>
      <rect x="6" y="146" width="148" height="20" rx="6" fill="${K.goud}33"/><text x="80" y="160" text-anchor="middle" font-size="9" font-weight="800" fill="var(--inkt)">🎯 DOEL: waarom?</text>
      <rect x="166" y="146" width="148" height="20" rx="6" fill="${K.groen}22"/><text x="240" y="160" text-anchor="middle" font-size="9" font-weight="800" fill="var(--inkt)">🏠 SITUATIE: waar + wanneer?</text></svg></div>`
    + weetje('🕵️', '6 vragen: <b>wie</b> zegt <b>wat</b> tegen <b>wie</b>, <b>waarom</b>, <b>hoe</b> en <b>waar/wanneer</b>?'),
  N14: stappen([['1','Eerst …','om te beginnen'], ['2','Daarna …','dan, vervolgens, nu'], ['3','…',''], ['🏁','Ten slotte …','tot slot, als laatste']], 'Signaalwoorden geven de volgorde')
    + groepen([['✅','Checklist goede instructie', K.groen, ['wat maak/doe je?','wat heb je nodig?','juiste volgorde + signaalwoorden','kort: 1 handeling per stap','gebiedende wijs: Zet… Duw…','duidelijk, eventueel met tekening']]], 'Is mijn instructie goed?'),
  N15: zin([['Word', K.oranje, 'stam'], ['niet boos!', null]], 'Imperatief = de stam, zonder onderwerp, zonder t', 'Draai de moer los. · Lees de vraag. · Antwoord in een volzin.')
    + tabel(['werkwoord','imperatief','let op'], [['worden','Word!','géén t'], ['antwoorden','Antwoord!','géén t'], ['houden','Houd! / Hou!','allebei juist'], ['zijn','Wees!','uitzondering'], ['beleefd','Komt u binnen.','u + t']], 'Spelling van de imperatief'),
  N16: tabel(['uitgang','wanneer?','voorbeelden'], [['-je','meestal','boekje, popje, boardje'], ['-tje','lange klank + l, n, r, w · na klinker','stoeltje, schoentje, figuurtje, foto’tje'], ['-pje','lange klank + m · -lm, -rm','boompje, filmpje, armpje'], ['-etje','korte klank + l, m, n, r, ng → verdubbelen','balletje, kammetje, sterretje, ringetje'], ['-kje','onbeklemtoond -ing','koninkje, woninkje']], 'Het verkleinwoord: 5 uitgangen')
    + weetje('🏷️', 'Een verkleinwoord is altijd een <b>het-woord</b>: de pop → het popje.'),
};
window.ELI_VISUEEL = V;
})();
