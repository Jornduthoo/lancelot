// Visuele samenvattingen per onderwerp: tijdlijnen, schema's, tabellen en tekeningen.
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

// ---------- Tekeningen (SVG) ----------
const huis = `<div class="vz"><div class="vz-t">Het huis van de filosofie</div><svg viewBox="0 0 320 250" class="svg" role="img" aria-label="Huis van de filosofie met 6 kamers">
  <path d="M20 95 L160 15 L300 95 Z" fill="${K.paars}"/><text x="160" y="72" text-anchor="middle" fill="#fff" font-weight="800" font-size="15">FILOSOFIE</text>
  <rect x="30" y="95" width="260" height="145" fill="var(--kaart)" stroke="${K.paars}" stroke-width="3"/>
  <line x1="30" y1="167" x2="290" y2="167" stroke="${K.paars}" stroke-width="3"/><line x1="117" y1="95" x2="117" y2="240" stroke="${K.paars}" stroke-width="2"/><line x1="203" y1="95" x2="203" y2="240" stroke="${K.paars}" stroke-width="2"/>
  <text x="35" y="110" font-size="9" font-weight="800" fill="${K.blauw}">FEITEN (het zijn)</text><text x="35" y="182" font-size="9" font-weight="800" fill="${K.oranje}">WAARDEN (Plato)</text>
  ${[['☁️','Bovenwereld','metafysica'],['🌍','Wereld','kosmologie'],['🧍','Mens','antropologie']].map(([i, a, b], n) => `<text x="${73 + n * 87}" y="133" text-anchor="middle" font-size="20">${i}</text><text x="${73 + n * 87}" y="151" text-anchor="middle" font-size="11" font-weight="800" fill="var(--inkt)">${a}</text><text x="${73 + n * 87}" y="162" text-anchor="middle" font-size="8.5" fill="var(--inkt-zacht)">${b}</text>`).join('')}
  ${[['✅','het Ware','waarheid'],['💚','het Goede','goedheid'],['🌸','het Schone','schoonheid']].map(([i, a, b], n) => `<text x="${73 + n * 87}" y="205" text-anchor="middle" font-size="20">${i}</text><text x="${73 + n * 87}" y="223" text-anchor="middle" font-size="11" font-weight="800" fill="var(--inkt)">${a}</text><text x="${73 + n * 87}" y="234" text-anchor="middle" font-size="8.5" fill="var(--inkt-zacht)">${b}</text>`).join('')}
</svg></div>`;

const voorvoegsels = `<div class="vz"><div class="vz-t">De voorvoegsel-trap</div><div class="trap">${[
  ['G','giga',9],['M','mega',6],['k','kilo',3],['h','hecto',2],['da','deca',1],['–','(basis)',0],['d','deci',-1],['c','centi',-2],['m','milli',-3],['µ','micro',-6],['n','nano',-9]]
  .map(([s, n, e]) => `<div class="trap-i ${e > 0 ? 'op' : e < 0 ? 'neer' : 'nul'}" style="--b:${50 + e * 5}%"><b>${s}</b><span>${n}</span><em>10<sup>${e}</sup></em></div>`).join('')}</div>
  <div class="trap-uit"><span>⬆️ naar groter = kleiner getal</span><span>⬇️ naar kleiner = groter getal</span></div>
  ${weetje('🧮', '<b>km → m</b>: 1 km = 10³ m, dus 4 km = 4·10³ m. <b>Oppervlakte</b>: exponent × 2 (1 cm² = 10⁻⁴ m²). <b>Volume</b>: exponent × 3 (1 cm³ = 10⁻⁶ m³).')}</div>`;

const vector = `<div class="vz"><div class="vz-t">Een kracht = een pijl met 4 kenmerken</div><svg viewBox="0 0 320 170" class="svg" role="img" aria-label="Krachtvector">
  <defs><marker id="pk" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${K.rood}"/></marker></defs>
  <rect x="30" y="70" width="70" height="55" rx="6" fill="${K.blauw}" opacity=".85"/><text x="65" y="103" text-anchor="middle" fill="#fff" font-weight="800">kar</text>
  <circle cx="100" cy="97" r="6" fill="${K.goud}" stroke="#000"/><line x1="100" y1="97" x2="270" y2="97" stroke="${K.rood}" stroke-width="6" marker-end="url(#pk)"/>
  <text x="185" y="86" text-anchor="middle" font-weight="800" fill="${K.rood}" font-size="16">F⃗ = 40 N</text>
  <text x="96" y="150" font-size="11" fill="var(--inkt)">● aangrijpingspunt</text><text x="185" y="125" text-anchor="middle" font-size="11" fill="var(--inkt)">↔ richting: horizontaal</text>
  <text x="250" y="70" text-anchor="middle" font-size="11" fill="var(--inkt)">zin: naar rechts →</text><text x="185" y="150" font-size="11" fill="var(--inkt)">lengte = grootte</text></svg>
  ${weetje('➕', '<b>Zelfde zin</b>: optellen (30 N + 20 N = 50 N). <b>Tegengestelde zin</b>: aftrekken (40 N − 40 N = 0 N). <b>Schuin</b>: kop-staart of parallellogram tekenen.')}</div>`;

const krachtenBlok = `<div class="vz"><div class="vz-t">Krachten op een boek op tafel</div><svg viewBox="0 0 320 235" class="svg" role="img" aria-label="Zwaartekracht, normaalkracht en gewicht">
  <defs><marker id="pz" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${K.rood}"/></marker><marker id="pn" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${K.groen}"/></marker><marker id="pg" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${K.paars}"/></marker></defs>
  <rect x="20" y="150" width="280" height="14" fill="#8a5a2b"/><rect x="110" y="95" width="100" height="55" rx="4" fill="${K.blauw}"/><text x="160" y="127" text-anchor="middle" fill="#fff" font-weight="800">boek</text>
  <circle cx="160" cy="122" r="5" fill="${K.goud}" stroke="#000"/>
  <line x1="160" y1="122" x2="160" y2="212" stroke="${K.rood}" stroke-width="5" marker-end="url(#pz)"/><text x="152" y="212" text-anchor="end" font-weight="800" fill="${K.rood}">F<tspan font-size="10">z</tspan> = m·g</text>
  <line x1="135" y1="150" x2="135" y2="50" stroke="${K.groen}" stroke-width="5" marker-end="url(#pn)"/><text x="127" y="62" text-anchor="end" font-weight="800" fill="${K.groen}">F<tspan font-size="10">n</tspan></text><text x="127" y="77" text-anchor="end" font-size="10" fill="${K.groen}">⟂ steunvlak</text>
  <line x1="190" y1="164" x2="190" y2="222" stroke="${K.paars}" stroke-width="4" stroke-dasharray="5 4" marker-end="url(#pg)"/><text x="200" y="200" font-weight="800" fill="${K.paars}" font-size="13">G</text><text x="200" y="214" fill="${K.paars}" font-size="10">op de tafel</text>
  <text x="160" y="20" text-anchor="middle" font-size="12" fill="var(--inkt)">Stil op een horizontale tafel: F<tspan font-size="9">z</tspan> = F<tspan font-size="9">n</tspan></text></svg>
  ${versus(['⚖️','Massa (kg)', K.blauw, ['hoeveelheid stof','overal hetzelfde','weegschaal']], ['⬇️','Gewicht G (N)', K.paars, ['kracht op de ondersteuning','G = m · g','verschilt per planeet','vallen = geen gewicht']], 'Massa ≠ gewicht')}
  ${weetje('🌍', 'g op aarde = <b>9,81 N/kg</b> · maan 1,62 N/kg. Voorbeeld: 5,00 kg → F<sub>z</sub> = 5,00 · 9,81 = <b>49,1 N</b>.')}</div>`;

const hooke = `<div class="vz"><div class="vz-t">Wet van Hooke: F<sub>v</sub> = k · Δl</div><div class="rij2"><svg viewBox="0 0 120 200" class="svg klein" role="img" aria-label="Veer met gewicht">
  <rect x="20" y="5" width="80" height="8" fill="#495057"/>
  <path d="M60 13 ${Array.from({ length: 9 }, (_, i) => `L${i % 2 ? 40 : 80} ${22 + i * 12}`).join(' ')} L60 130" fill="none" stroke="${K.teal}" stroke-width="4"/>
  <rect x="40" y="130" width="40" height="34" rx="4" fill="${K.oranje}"/><text x="60" y="152" text-anchor="middle" fill="#fff" font-weight="800">m</text>
  <line x1="100" y1="64" x2="100" y2="130" stroke="${K.rood}" stroke-width="2"/><text x="104" y="100" font-size="12" fill="${K.rood}" font-weight="800">Δl</text></svg>
  <svg viewBox="0 0 200 170" class="svg" role="img" aria-label="Grafiek F tegen Δl"><line x1="30" y1="140" x2="190" y2="140" stroke="var(--inkt)" stroke-width="2"/><line x1="30" y1="140" x2="30" y2="10" stroke="var(--inkt)" stroke-width="2"/>
  <text x="185" y="158" font-size="11" text-anchor="end" fill="var(--inkt)">Δl (m)</text><text x="36" y="18" font-size="11" fill="var(--inkt)">F (N)</text>
  <line x1="30" y1="140" x2="170" y2="30" stroke="${K.rood}" stroke-width="3"/><text x="112" y="40" font-size="11" fill="${K.rood}" font-weight="800" text-anchor="end">stijf: grote k</text>
  <line x1="30" y1="140" x2="185" y2="100" stroke="${K.teal}" stroke-width="3"/><text x="185" y="92" font-size="11" fill="${K.teal}" font-weight="800" text-anchor="end">slap: kleine k</text>
  <text x="185" y="132" font-size="10" fill="var(--inkt-zacht)" text-anchor="end">rechte = recht evenredig</text></svg></div>
  <div class="drie"><span>F<sub>v</sub> = k · Δl</span><span>k = F<sub>v</sub> / Δl</span><span>Δl = F<sub>v</sub> / k</span></div>
  ${weetje('⚠️', 'Δl altijd in <b>meter</b> als k in N/m staat: 5,0 cm = <b>0,050 m</b>.')}</div>`;

const arm = `<div class="vz"><div class="vz-t">Antagonisten: biceps en triceps</div><p class="klein" style="margin:0 0 4px">Een spier die samentrekt wordt <b>korter en dikker</b>.</p><svg viewBox="0 0 320 190" class="svg" role="img" aria-label="Arm met biceps en triceps">
  <line x1="40" y1="60" x2="170" y2="110" stroke="#dee2e6" stroke-width="16" stroke-linecap="round"/><line x1="170" y1="110" x2="260" y2="35" stroke="#dee2e6" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="110" cy="70" rx="55" ry="17" transform="rotate(21 110 70)" fill="${K.rood}" opacity=".9"/><text x="110" y="74" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" transform="rotate(21 110 70)">biceps</text>
  <ellipse cx="100" cy="102" rx="55" ry="13" transform="rotate(21 100 102)" fill="${K.blauw}" opacity=".85"/><text x="100" y="106" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" transform="rotate(21 100 102)">triceps</text>
  <circle cx="170" cy="110" r="10" fill="${K.goud}"/><text x="186" y="130" font-size="11" fill="var(--inkt)">gewricht</text>
  <text x="15" y="158" font-size="12" fill="var(--inkt)"><tspan font-weight="800" fill="${K.rood}">Buigen</tspan>: biceps trekt samen, triceps ontspant</text>
  <text x="15" y="178" font-size="12" fill="var(--inkt)"><tspan font-weight="800" fill="${K.blauw}">Strekken</tspan>: triceps trekt samen, biceps ontspant</text></svg>
  ${weetje('🦵', 'Ook een koppel: <b>quadriceps</b> (voorkant, strekken) en <b>hamstring</b> (achterkant, buigen). Een spier kan alleen <b>trekken</b>, nooit duwen!')}</div>`;

const spierbouw = `<div class="vz"><div class="vz-t">Van groot naar klein: een skeletspier</div><div class="pop-rij">${[
  ['💪','spier','met spierschede'],['🫓','spierbuik','dikste deel'],['🥢','spierbundel','met bundelschede'],['🧵','spiervezel','= 1 spiercel, veelkernig'],['〰️','myofibrillen','trekken samen']]
  .map(([i, a, b], n) => `<div class="pr-i" style="--s:${1 - n * .12}"><span>${i}</span><b>${a}</b><small>${b}</small></div>`).join('<span class="pr-p">›</span>')}</div></div>`;

const levensloop = `<div class="vz"><div class="vz-t">De levensloopfasen</div><div class="ll">${[
  ['🤰','Prenataal','bevruchting–0', K.roze],['👶','Baby','0–1,5', K.oranje],['🧸','Peuter','1,5–3', K.goud],['🖍️','Vroege kindertijd','3–6', K.groen],['🎒','Midden kindertijd','6–12', K.teal],['🎧','Adolescentie','12–18', K.blauw],['💼','Vroege volw.','18–40', K.paars],['🏡','Midden volw.','40–65', '#5f3dc4'],['👴','Late volw.','65+', K.grijs]]
  .map(([i, a, b, k]) => `<div class="ll-i" style="--k:${k}"><span>${i}</span><b>${a}</b><small>${b} j</small></div>`).join('')}</div>
  ${weetje('📏', 'Leeftijden zijn <b>gemiddelden</b>: elk kind is anders. Hoe jonger, hoe sneller de veranderingen.')}</div>`;

const wetenschappen = `<div class="vz"><div class="vz-t">Soorten wetenschappen</div><div class="boom">
  <div class="bm-r"><div class="bm" style="--k:${K.grijs}">Wetenschappen</div></div>
  <div class="bm-r"><div class="bm" style="--k:${K.paars}">Formele<small>wiskunde, logica</small></div><div class="bm" style="--k:${K.blauw}">Ervarings-<small>met je zintuigen</small></div></div>
  <div class="bm-r"><div class="bm" style="--k:${K.groen}">Natuur-<small>chemie, bio, fysica</small></div><div class="bm" style="--k:${K.oranje}">Gedrags- / sociale<small>psychologie, economie…</small></div><div class="bm" style="--k:${K.roze}">Cultuur-<small>taal, geschiedenis…</small></div></div>
  <div class="bm-r"><div class="bm" style="--k:${K.oranje}">Psychologie → ontwikkelings&shy;psychologie</div></div></div></div>`;

// ---------- Per onderwerp ----------
const V = {
  KF1: versus(['🤔','Filosofie', K.paars, ['rationeel + kritisch denken','fundamentele vragen','geen 1 juist antwoord']], ['🙅','Géén filosofie', K.grijs, ['"Hakuna matata" = levenshouding','een quote = levensmotto','gewoon een mening']], 'Philia + sophia = liefde voor wijsheid')
     + groepen([['📏','Weetvraag', K.blauw, ['kan je meten of opzoeken','Hoe hoog is de Eiffeltoren?']], ['💬','Meningsvraag', K.oranje, ['"ik vind…"','Is pizza lekker?']], ['🧠','Denkvraag', K.paars, ['alleen door denken + redeneren','Wat is vrijheid?']]], '3 soorten vragen'),
  KF2: tijdlijn([['± 600 v.C.','Mythos → Logos','van goden-verhalen naar de rede', K.grijs], ['624–546 v.C.','Thales 💧','alles is water · observatie + verstand', K.blauw], ['610–546 v.C.','Anaximander ♾️','het apeiron (onbepaald, oneindig)', K.paars], ['540–480 v.C.','Heraclitus 🔥','panta rhei: alles stroomt', K.oranje], ['510–450 v.C.','Parmenides 🪨','verandering is een illusie', K.teal]], 'De natuurfilosofen zoeken de archè (oerstof)'),
  KF3: versus(['🗣️','Sofisten', K.oranje, ['betaalde leraren retorica','Protagoras: "de mens is de maat van alle dingen"','relativisme: waarheid verschilt per mens']], ['🧔','Socrates', K.blauw, ['de waarheid bestaat: absolutisme','"Ik weet dat ik niets weet"','filosoof als vroedvrouw (vragen stellen)']], 'Wie heeft gelijk over de waarheid?')
     + stappen([['1','Iemand beweert iets te weten','Socrates prijst hem'], ['2','Kritische vragen','de redenering valt om'], ['3','Beiden onwetend','nu begint het echte zoeken']], 'Zo filosofeert Socrates'),
  KF4: huis + groepen([['🔎','Concretiserend', K.blauw, ['naar feiten: Wanneer? Hoeveel?','naar voorbeelden: Geef eens een voorbeeld?']], ['🎯','Abstraherend', K.paars, ['naar betekenis: Wat bedoel je met…?','naar redenen: Waarom denk je dat?']]], 'Doorvragen in een filosofisch gesprek'),
  KF5: groepen([['🖼️','Beeldende kunsten', K.blauw, ['schilderkunst','beeldhouwkunst','architectuur','fotografie, strips, design']], ['🎭','Podiumkunsten', K.roze, ['woord: theater, poëzie','dans: ballet','muziek: concert, opera']], ['🎬','Audiovisuele kunsten', K.paars, ['film, tv','videokunst','digital art']]], '3 grote kunstvormen (+ mengvormen: musical, graffiti, performance)'),
  KF6: tijdlijn([['40.000–3000 v.C.','Prehistorie','zo nauwkeurig mogelijk · venusbeeldjes', '#8a5a2b'], ['3000–400 v.C.','Oude Grieken','mooier dan echt · ideale lichamen', K.blauw], ['300 v.C.–500','Romeinen','waarheidsgetrouw · ook rimpels en kalend', K.rood], ['500–1400','Middeleeuwen','godsdienstig · Bijbelverhalen in kerken', K.grijs], ['1400–1530','Renaissance','"hergeboorte" · mens centraal', K.goud], ['1600–1750','Barok','dramatisch · licht/schaduw contrast', '#5f3dc4'], ['1720–1770','Classicisme','terug naar Grieken/Romeinen · heldhaftig', K.teal], ['1840–1880','Realisme','nuchter · de gewone arbeider', '#495057'], ['1870–1905','Impressionisme','snelle penseelstreken · momentopnames', K.groen]], 'Kunst door de eeuwen'),
  KF7: tijdlijn([['1905–1940','E · Expressionisme','gevoelens · krachtige kleuren', K.rood], ['1906–1920','K · Kubisme','geometrische vormen · bol, kegel, kubus', K.blauw], ['1916–1926','D · Dadaïsme','provocerend · concept > techniek', K.grijs], ['1924–1940','S · Surrealisme','droombeelden · realistisch maar absurd', K.paars], ['jaren 1960','P · Pop Art','massacultuur · strips, sterren', K.roze]], '⚽ "Elke Keeper Dooft Soms Penalty\'s"'),
  KF8: stappen([['👀','Eerste indruk','spontaan, eerlijk'], ['📷','Beschrijven','camera-oog: wat zie je?'], ['🛠️','Analyseren','hoe is het gemaakt?'], ['💡','Interpreteren','wat betekent het?'], ['⭐','Evalueren','wat vind jij, en waarom?']], 'Kunst lezen in 5 stappen')
     + groepen([['🪑','Decoratief', K.goud, ['mooi én nuttig (design)']], ['🧘','Ontspannend', K.teal, ['rust, minder stress']], ['💶','Economisch', K.groen, ['geld verdienen, investeren']], ['🤝','Maatschappelijk', K.roze, ['spiegel + verbinden']]], '4 functies van kunst'),
  G1: wetenschappen + levensloop,
  G2: groepen([['💪','Fysiek', K.rood, ['lichamelijk','motorisch (grof + fijn)','sensorisch']], ['🧠','Cognitief', K.blauw, ['leren, geheugen','problemen oplossen','objectpermanentie']], ['❤️','Socio-emotioneel', K.roze, ['gevoelens','relaties met anderen']]], '3 ontwikkelingsgebieden')
     + groepen([['📈','Groeien', K.groen, ['kwantiteit: méér','schoenmaat 35 → 37']], ['🌱','Rijpen', K.goud, ['kwaliteit, vanzelf (genen)','zindelijk, geslachtsrijp']], ['📚','Leren', K.paars, ['nieuwe kennis/vaardigheden','fietsen, Engels']]], '3 ontwikkelingsvormen'),
  G3: tijdlijn([['0–2 weken','Kiemstadium (germinaal)','bevruchting · ± dag 14 innestelen', K.roze], ['2–8 weken','Embryonaal','2 mm → 3 cm · alle vormen herkenbaar', K.oranje], ['9–40 weken','Foetaal','3m vingers · 5m voelbaar · 6m organen klaar', K.paars]], 'De zwangerschap: 3 stadia (± 38–40 weken)')
     + groepen([['👁️','Zien', K.blauw, ['licht/donker, geen kleur']], ['👂','Horen', K.groen, ['hart en stem van mama']], ['👅','Smaken', K.roze, ['drinkt meer als het zoet is']], ['👃','Ruiken', K.grijs, ['kan nog niet']]], 'Zintuigen in de buik'),
  G4: tijdlijn([['2 maanden','Borst omhoog duwen','', K.oranje], ['4 maanden','Doelgericht grijpen','', K.goud], ['6 maanden','Handgreep · bijna perfect zicht','', K.groen], ['7 maanden','Zitten zonder hulp','', K.teal], ['± 8 maanden','Objectpermanentie · vreemdenangst','', K.blauw], ['10 maanden','Kruipen','', K.paars], ['12 maanden','Pincetgreep','', K.roze], ['15 maanden','Alleen lopen','', K.rood]], 'Mijlpalen van de baby'),
  G5: versus(['🧸','Peuter (1,5–3)', K.goud, ['koppigheidsfase: "nee!"','zindelijk 2–2,5 j (overdag)','magisch denken','taal: 1- en 2-woordzinnen']], ['🖍️','Kleuter (3–6)', K.groen, ['kopvoeter tekenen, knippen','geheugen maakt sprong','spel: naast elkaar → samen']], 'Peuter en kleuter')
     + groepen([['🔄','Geen omkeerbaarheid', K.blauw, ['bal klei = staaf? "staaf is meer!"']], ['🏔️','Egocentrisch', K.oranje, ['drie-bergen-proef']], ['🧚','Animistisch / magisch', K.paars, ['de zon is moe']]], '3 denkfouten van de kleuter'),
  G6: versus(['🎒','Midden kindertijd (6–12)', K.teal, ['lezen, schrijven, rekenen','denkfouten verdwijnen','vrienden = sociale leerschool']], ['🎧','Adolescentie (12–18)', K.blauw, ['groeispurt + hormonen','hypothetisch denken','loskomen van ouders · moodswings']], 'Kind en tiener')
     + weetje('📏', '<b>Acceleratie</b>: jongeren zijn nu ± 10 cm groter en 3 jaar vroeger geslachtsrijp dan 100 jaar geleden (voeding, gezondheidszorg).'),
  G7: groepen([['💼','Vroeg (18–40)', K.paars, ['💪 volgroeid, veroudering start','🧠 praktisch + creatief','❤️ partner, kinderen, carrière']], ['🏡','Midden (40–65)', '#5f3dc4', ['💪 rimpels, grijs, leesbril','🧠 relativerend, genuanceerd','❤️ lege nest, zorg voor ouders']], ['👴','Laat (65+)', K.grijs, ['💪 krimpen, broos, minder zintuigen','🧠 trager, geheugen minder','❤️ risico op eenzaamheid']]], 'De volwassenheid in 3 fasen'),
  F1: weetje('🔁', 'Leer in <b>2 richtingen</b>: Frans → Nederlands én Nederlands → Frans. Let op <b>un/une</b> en de vrouwelijke vorm: étranger → étrang<b>ère</b>, cher → ch<b>ère</b>.')
     + stappen([['🗣️','Zeg het hardop'], ['✍️','Schrijf het 1 keer'], ['🙈','Test zonder kijken']], 'Zo leer je woordjes'),
  F2: vvRij('-er: stam + -e -es -e -ons -ez -ent', [vervoeg('parler', 'parl', ['e','es','e','ons','ez','ent']), vervoeg('manger', ['mang','mang','mang','mang<i>e</i>','mang','mang'], ['e','es','e','ons','ez','ent'], 'ge vóór a/o/u'), vervoeg('commencer', ['commenc','commenc','commenc','commen<i>ç</i>','commenc','commenc'], ['e','es','e','ons','ez','ent'], 'ç vóór a/o/u'), vervoeg('acheter', ['ach<i>è</i>t','ach<i>è</i>t','ach<i>è</i>t','achet','achet','ach<i>è</i>t'], ['e','es','e','ons','ez','ent'], 'è bij je/tu/il/ils'), vervoeg('payer', ['pa<i>i</i>','pa<i>i</i>','pa<i>i</i>','pay','pay','pa<i>i</i>'], ['e','es','e','ons','ez','ent'], 'y → i vóór doffe e')])
     + weetje('🚗', 'Ezelsbrug <b>A U T O</b>: vóór a, o, u heb je <b>ge</b> of <b>ç</b> nodig.'),
  F3: vvRij('-ir en -re: 6 types', [vervoeg('sortir', ['sor','sor','sor','sort','sort','sort'], ['s','s','t','ons','ez','ent'], 'MESESODOPA'), vervoeg('finir', 'fin', ['is','is','it','issons','issez','issent']), vervoeg('ouvrir', 'ouvr', ['e','es','e','ons','ez','ent'], 'zoals -er!'), vervoeg('attendre', 'attend', ['s','s','–','ons','ez','ent'], 'il attend (niets)'), vervoeg('conduire', ['condui','condui','condui','condui<i>s</i>','condui<i>s</i>','condui<i>s</i>'], ['s','s','t','ons','ez','ent'], 'meervoud met s'), vervoeg('peindre', ['pein','pein','pein','pei<i>gn</i>','pei<i>gn</i>','pei<i>gn</i>'], ['s','s','t','ons','ez','ent'], 'meervoud met gn')]),
  F4: groepen([['⚠️','Geen -ez!', K.rood, ['vous <b>êtes</b>','vous <b>faites</b>','vous <b>dites</b>']], ['🎵','ils -ont', K.blauw, ['ils <b>sont</b>','ils <b>ont</b>','ils <b>vont</b>','ils <b>font</b>']], ['🤯','Dubbel', K.paars, ['je suis = ik <b>ben</b> (être)','je suis = ik <b>volg</b> (suivre)']], ['🍹','Klinker wisselt', K.teal, ['nous b<b>u</b>vons','ils b<b>oi</b>vent','je re<b>ç</b>ois']]], 'De valkuilen bij onregelmatige werkwoorden')
     + weetje('📅', '5 per dag · hardop opzeggen · daarna in de werkwoorden-sprint typen.'),
  F5: tabel(['', 'tu', 'nous', 'vous'], [['manger', 'Mange ! <small>(geen s!)</small>', 'Mangeons !', 'Mangez !'], ['finir', 'Finis !', 'Finissons !', 'Finissez !'], ['ouvrir', 'Ouvre ! <small>(geen s!)</small>', 'Ouvrons !', 'Ouvrez !'], ['<b>être</b>', 'Sois !', 'Soyons !', 'Soyez !'], ['<b>avoir</b>', 'Aie !', 'Ayons !', 'Ayez !'], ['<b>aller</b>', 'Va !', 'Allons !', 'Allez !'], ['<b>savoir</b>', 'Sache !', 'Sachons !', 'Sachez !'], ['<b>vouloir</b>', 'Veuille !', 'Veuillons !', 'Veuillez !']], "L'impératif: zonder onderwerp"),
  F6: `<div class="vz"><div class="vz-t">La maison d'être: deze werkwoorden nemen ÊTRE</div><div class="huisje"><div class="dak">ÊTRE 🏠</div><div class="huis-g">${['⬆️ monter','⬇️ descendre','🚪 entrer','🏃 sortir','🛬 arriver','🛫 partir','🚶 aller','👋 venir','🤕 tomber','🛋️ rester','↩️ retourner','🔙 rentrer','⚰️ mourir'].map(x => `<span>${x}</span>`).join('')}</div></div></div>`
     + tabel(['werkwoord', 'participe'], [['-er (jouer)', 'jou<b>é</b>'], ['-re (perdre)', 'perd<b>u</b>'], ['-ir (finir, dormir)', 'fin<b>i</b>, dorm<b>i</b>'], ['ouvrir, offrir', 'ouv<b>ert</b>, off<b>ert</b>']], 'Regelmatige participes'),
  W1: tabel(['grootheid', 'symbool', 'eenheid'], [['lengte', 'l', 'meter (m)'], ['massa', 'm', 'kilogram (kg)'], ['tijd', 't', 'seconde (s)'], ['stroomsterkte', 'I', 'ampère (A)'], ['temperatuur', 'T', 'kelvin (K)'], ['lichtsterkte', 'I<sub>v</sub>', 'candela (cd)'], ['stofhoeveelheid', 'n', 'mol']], 'De 7 basisgrootheden (SI)')
     + versus(['📏','Scalair', K.blauw, ['enkel grootte','massa, tijd, temperatuur']], ['➡️','Vectorieel', K.rood, ['grootte + richting + zin + aangrijpingspunt','kracht, snelheid']], 'Scalair of vector?')
     + stappen([['1','Oriënteren'], ['2','Onderzoeksvraag'], ['3','Hypothese'], ['4','Benodigdheden'], ['5','Werkwijze + schets'], ['6','Waarnemingen'], ['7','Besluit'], ['8','Reflecteren']], 'De onderzoeksmethode'),
  W2: voorvoegsels,
  W3: tabel(['getal', 'BC', 'waarom'], [['0,23 g', '<b>2</b>', 'nullen vooraan tellen niet'], ['23,0 g', '<b>3</b>', 'nul achteraan telt wel'], ['1,05', '<b>3</b>', 'nul in het midden telt'], ['9 jongens', '∞', 'geteld, geen meting']], 'Beduidende cijfers tellen')
     + versus(['➕','Optellen / aftrekken', K.blauw, ['zelfde aantal <b>decimalen</b> als het minst nauwkeurige','33 m + 2,63 m = <b>36 m</b>']], ['✖️','Vermenigvuldigen / delen', K.oranje, ['zelfde aantal <b>BC</b> als het minste','5,00 km / 1,1 u = <b>4,5 km/u</b>']], 'Rekenen met BC')
     + weetje('🔬', '<b>Wetenschappelijke notatie</b>: 1 cijfer ≠ 0 vóór de komma × 10<sup>n</sup>. 3,5 km = 3,5·10³ m · 0,000123 g = 1,23·10⁻⁴ g.'),
  W4: vector + versus(['🤝','Contactkracht', K.oranje, ['voorwerpen raken elkaar','duwen, normaalkracht']], ['🧲','Veldkracht', K.paars, ['werkt op afstand','zwaartekracht, magneet']], 'Soorten krachten'),
  W5: krachtenBlok,
  W6: hooke,
  W7: arm + spierbouw,
  W8: groepen([['🏃','Dwarsgestreept', K.rood, ['skeletspieren','✅ streepjes','willekeurig (jij beslist)','zeer snel, snel moe']], ['🍽️','Glad', K.teal, ['maag, darmen, bloedvaten','❌ geen streepjes','onwillekeurig','traag, bijna nooit moe']], ['❤️','Hartspier', K.roze, ['enkel het hart','✅ (soort) streepjes','onwillekeurig','traag én snel, nooit moe']]], '3 soorten spierweefsel')
     + groepen([['🚪','Scharnier', K.blauw, ['1 vlak: elleboog, knie']], ['🐎','Zadel', K.oranje, ['2 richtingen: duim']], ['⚽','Kogel', K.rood, ['alle richtingen: schouder, heup']], ['🔄','Rol', K.teal, ['draaien rond as: spaakbeen']]], 'Beweeglijke gewrichten'),
  C1: tijdlijn([['† 180','Marcus Aurelius','laatste van de 5 goede keizers', K.goud], ['3e eeuw','Crisis','Germanen + Perzen · soldatenkeizers', K.rood], ['284–305','Diocletianus','tetrarchie (4 keizers) · leger hervormd', K.blauw], ['4e eeuw','Constantijn','1e christelijke keizer · Constantinopel', K.paars], ['391','Theodosius','christendom staatsgodsdienst · rijk in 2', K.teal]], 'Het West-Romeinse Rijk wankelt')
     + cirkel(['meer invallen', 'groter leger nodig', 'hogere belastingen', 'armere bevolking', 'zwakker rijk'], 'De vicieuze cirkel'),
  C2: `<div class="vz"><div class="vz-t">De nieuwe samenleving = 3 invloeden</div><svg viewBox="0 0 320 250" class="svg" role="img" aria-label="Germaans, Romeins en christelijk">
       <circle cx="115" cy="95" r="75" fill="${K.groen}" opacity=".35"/><circle cx="205" cy="95" r="75" fill="${K.rood}" opacity=".35"/><circle cx="160" cy="165" r="75" fill="${K.goud}" opacity=".4"/>
       <text x="80" y="70" text-anchor="middle" font-weight="800" fill="var(--inkt)">Germaans</text><text x="80" y="88" text-anchor="middle" font-size="10" fill="var(--inkt)">gewoonterecht</text><text x="80" y="101" text-anchor="middle" font-size="10" fill="var(--inkt)">broek, joelfeest</text>
       <text x="240" y="70" text-anchor="middle" font-weight="800" fill="var(--inkt)">Romeins</text><text x="240" y="88" text-anchor="middle" font-size="10" fill="var(--inkt)">geschreven wet</text><text x="240" y="101" text-anchor="middle" font-size="10" fill="var(--inkt)">Latijn, wijn</text>
       <text x="160" y="210" text-anchor="middle" font-weight="800" fill="var(--inkt)">Christelijk</text><text x="160" y="226" text-anchor="middle" font-size="10" fill="var(--inkt)">bisschoppen, doopsel, Pasen</text>
       <text x="160" y="122" text-anchor="middle" font-size="22">⚔️</text></svg></div>`
     + tijdlijn([['eind 4e eeuw','Hunnen duwen Germanen','volksverhuizingen beginnen', K.oranje], ['451','Attila verslagen','door Aetius + Theodorik', K.blauw], ['476','Odoaker zet Romulus Augustulus af','einde West-Romeinse Rijk → middeleeuwen', K.rood]], 'Volksverhuizingen'),
  C3: `<div class="vz"><div class="vz-t">De feodale piramide</div><div class="piramide">${[['👑','Koning (Clovis)', K.goud], ['🛡️','Vazallen: land ↔ trouw', K.blauw], ['⛪','Clerus: hoog (bisschop) en laag (monnik)', K.paars], ['🌾','Horigen: aan de grond gebonden, betalen in natura', '#8a5a2b']].map(([i, t, k], n) => `<div class="pir-i" style="--k:${k};--w:${40 + n * 20}%"><span>${i}</span>${t}</div>`).join('')}</div></div>`
     + groepen([['🔀','Erfenis', K.rood, ['alle zonen erven','rijk telkens verdeeld']], ['🏰','Domein', '#8a5a2b', ['gesloten, zelfvoorzienend','herendiensten']], ['✝️','Geloof', K.paars, ['polytheïsme → monotheïsme','Clovis laat zich dopen']]], 'De Merovingers in 3 woorden'),
  C4: `<div class="vz"><div class="vz-t">De 4 stoïcijnse deugden</div><div class="deugd">${[['🦉','Wijsheid'], ['🦁','Moed'], ['⚖️','Rechtvaardigheid'], ['🧘','Matigheid']].map(([i, t]) => `<div><span>${i}</span><b>${t}</b></div>`).join('')}</div></div>`
     + weetje('🐝', '"Wat niet goed is voor de <b>zwerm</b>, is niet goed voor de <b>bij</b>." · Je hebt macht over je <b>geest</b>, niet over wat er buiten gebeurt.')
     + tijdlijn([['± 300 v.C.','Zeno van Citium','sticht het stoïcisme', K.grijs], ['121','Marcus Aurelius geboren','"Verissimus"', K.goud], ['161','Keizer','met Lucius Verus · oorlog + pest', K.rood], ['180','Sterft','Meditaties: 12 boeken notities', K.paars]], 'De filosoof-keizer'),
};
window.ELI_VISUEEL = V;
})();
