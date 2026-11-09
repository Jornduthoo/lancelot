// LANcelot Junior voor de leerkracht: een spel kiezen, kiezen hoe de klas speelt, en volgen wie er al geweest is.
// Op het bord speelt de klas in 4 kleurteams. Met tablets ziet de leerkracht live wie speelt en wie al geweest is.
// De knop LANcelot in de titelbalk brengt je terug naar LANcelot: dezelfde klas, dezelfde gegevens.
const socket = io({ query: { role: 'host' } });
KlasKiezer.start(socket, document.getElementById('klaskiezer'));
const $ = id => document.getElementById(id);
const J = () => window.JR || { zin: {}, spellen: [] };
const GROEPEN = [['getallen', '🔢 Getallen en rekenen'], ['meten', '📏 Meten en tijd'], ['meetkunde', '🔷 Vormen en ruimte'], ['taal', '🔤 Taal en klanken'], ['wereld', '🌍 De wereld'], ['samen', '💃 Samen en gevoel'], ['eigen', '✨ Mijn eigen vragen']];
const VIEWS = ['thuis', 'spelen', 'klas', 'opvolgen', 'maken', 'draakje', 'ochtend', 'eiland', 'rijk', 'klastools', 'feest', 'werkbladen'];
let sets = (window.JR && JR.sets) || [];
const TEAMKLEUR = ['rood', 'blauw', 'geel', 'groen'];

let stand = { actief: false };
let kinderen = [];
let gekozen = null; // { spel, niveau, manier }
let bord = null; // { r, team, huidig }
let dans = null;
let kring = null;

const spelVan = id => (J().spellen || []).find(s => s.id === id);
const beeldPad = s => `/img/junior/${s.beeld}.webp`;
const draakImg = () => `/img/junior/draak/${(stand.draak && stand.draak.fase) || 1}.webp`;

// ---------- Het klasdraakje ----------
function toonDraak(d) {
  if (!d) return;
  if (stand.draak && d.fase > stand.draak.fase) { try { confetti(3000); } catch {} JrMuziek.liedje(); }
  stand.draak = d;
  for (const id of ['jr-draak-foto', 'jr-loopt-draak', 'jr-mini-draak']) $(id).src = draakImg();
  $('jr-groei').style.width = `${d.tot}%`;
  $('jr-mini-groei').style.width = `${d.tot}%`;
  $('jr-mini-naam').textContent = d.naam || 'Het klasdraakje';
  $('jr-groei-tekst').textContent = d.fase >= d.fasen ? `${d.eten} hapjes. Het draakje is een echte ridderdraak!` : `Fase ${d.fase} van ${d.fasen}. Nog ${100 - d.tot}% tot de volgende fase.`;
  if (document.activeElement !== $('jr-draak-naam')) $('jr-draak-naam').value = d.naam || '';
  $('jr-mini-sterren').textContent = d.sterren || 0;
  hol();
}

// ---------- Het hol: het klasdraakje bekijken en samen extra's kopen ----------
// Waar het hoedje komt, per fase (deel van de prent): midden, bovenkant van het hoofd, breedte.
const HOED_PLEK = { 1: [0.5, 0.06, 0.56], 2: [0.5, 0.05, 0.5], 3: [0.52, 0.08, 0.52], 4: [0.58, 0.09, 0.44], 5: [0.49, 0.04, 0.42] };
// Waar elk ding in het hol staat: midden (%), onderkant (%), breedte (%).
const HOL_PLEK = { 7: [29, 92, 15], 8: [84, 74, 11], 9: [68, 97, 6], 10: [17, 95, 9], 11: [7, 74, 8], 12: [91, 64, 12], 13: [15, 66, 5.5], 14: [81, 98, 12], 15: [94, 92, 7], 16: [41, 99, 10] };
const HOL_NAAM = { 1: 'Kroon', 2: 'Tovenaarshoed', 3: 'Feesthoedje', 4: 'Bloemenkrans', 5: 'Strik', 6: 'Hoge hoed', 7: 'Mand om te slapen', 8: 'Schatkist', 9: 'Bal', 10: 'Teddybeer', 11: 'Plant', 12: 'Boekenkast', 13: 'Lamp', 14: 'Hobbelpaard', 15: 'Raket', 16: 'Taart' };
const HOL_PRIJS = { 1: 60, 2: 40, 3: 20, 4: 25, 5: 15, 6: 35, 7: 30, 8: 80, 9: 10, 10: 20, 11: 15, 12: 50, 13: 25, 14: 45, 15: 70, 16: 40 };
function hol() {
  const d = stand.draak;
  if (!d) return;
  const gekocht = d.gekocht || [], uit = d.uit || [];
  $('jr-hol-sterren').textContent = d.sterren || 0;
  $('jr-hol-naam').textContent = d.naam || 'Ons klasdraakje';
  $('jr-hol-kop-draak').src = draakImg();
  $('jr-hol-draak-img').src = draakImg();
  $('jr-hol-draak').dataset.fase = d.fase;
  $('jr-hol-groei').style.width = `${d.tot}%`;
  const hoed = $('jr-hol-hoed');
  hoed.classList.toggle('hidden', !d.hoed);
  if (d.hoed) {
    const [x, y, w] = HOED_PLEK[d.fase] || HOED_PLEK[3];
    hoed.src = `/img/junior/hol/${d.hoed}.webp`;
    hoed.style.left = `${(x - w / 2) * 100}%`;
    hoed.style.width = `${w * 100}%`;
    hoed.style.bottom = `${(1 - y) * 100}%`;
  }
  $('jr-hol-spul').innerHTML = gekocht.filter(id => HOL_PLEK[id] && !uit.includes(id)).map(id => {
    const [x, b, w] = HOL_PLEK[id];
    return `<img class="jr-hol-ding" src="/img/junior/hol/${id}.webp" alt="" style="left:${x - w / 2}%;width:${w}%;top:${b}%">`;
  }).join('');
  $('jr-winkel').innerHTML = Object.keys(HOL_PRIJS).map(Number).map(id => {
    const heb = gekocht.includes(id);
    const aan = heb && (HOL_PLEK[id] ? !uit.includes(id) : d.hoed === id);
    const kan = !heb && (d.sterren || 0) >= HOL_PRIJS[id];
    return `<button type="button" class="jr-winkel-ding jr-eigen${heb ? ' heb' : ''}${aan ? ' aan' : ''}${kan ? ' kan' : ''}" data-hol="${id}">
      <img src="/img/junior/hol/${id}.webp" alt=""><b>${Junior.esc(HOL_NAAM[id])}</b>
      <span>${heb ? (aan ? '✓' : '') : `⭐ ${HOL_PRIJS[id]}`}</span></button>`;
  }).join('');
}
$('jr-winkel').addEventListener('click', e => {
  const b = e.target.closest('[data-hol]');
  if (!b) return;
  const id = Number(b.dataset.hol);
  const d = stand.draak || {};
  if ((d.gekocht || []).includes(id)) { socket.emit('jr-hol-zet', { id }, res => res && res.draak && toonDraak(res.draak)); return; }
  if ((d.sterren || 0) < HOL_PRIJS[id]) {
    b.classList.remove('nee'); void b.offsetWidth; b.classList.add('nee');
    Junior.Stem.zeg([J().zin.holTeWeinig]);
    return;
  }
  socket.emit('jr-hol-koop', { id }, res => {
    if (!res || res.error) { if (res && res.error) Ui.melding(res.error); return; }
    toonDraak(res.draak);
    try { confetti(2500); sfx.fanfare(); } catch {}
    JrMuziek.liedje();
    hopDraak();
    Junior.Stem.zeg([J().zin.holKoop]);
  });
});
function hopDraak() {
  const dr = $('jr-hol-draak');
  dr.classList.remove('hop'); void dr.offsetWidth; dr.classList.add('hop');
}
$('jr-hol-draak').addEventListener('click', () => {
  hopDraak();
  try { sfx.jump(); } catch {}
  const z = J().zin.holHallo || [];
  Junior.Stem.zeg([z[Math.floor(Math.random() * z.length)]]);
});
$('jr-draak-naam').addEventListener('change', () => socket.emit('jr-draaknaam', { naam: $('jr-draak-naam').value }, res => res && res.draak && toonDraak(res.draak)));

// ---------- Spellen kiezen ----------
function tegels() {
  const box = $('jr-groepen');
  box.innerHTML = '';
  $('jr-tel-spelen').textContent = `${(J().spellen || []).filter(s => !s.verborgen && s.id !== 'eigen').length} spelletjes`;
  for (const [groep, kop] of GROEPEN) {
    const lijst = (J().spellen || []).filter(s => s.groep === groep && !s.verborgen);
    if (!lijst.length) continue;
    const blok = document.createElement('div');
    blok.className = 'jr-groep';
    // Elk blok krijgt zoveel breedte als het tegels heeft: zo staan alle tegels van een blok op één rij
    // en vullen de blokken samen elke rij helemaal (geen lege vakken).
    blok.style.setProperty('--n', lijst.length);
    blok.innerHTML = `<h3>${kop}</h3><div class="jr-tegels"></div>`;
    for (const s of lijst) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'jr-tegel';
      const extra = s.id === 'eigen' ? `<em>${sets.length ? `${sets.length} ${sets.length === 1 ? 'reeks' : 'reeksen'}` : 'Maak eerst een reeks'}</em>` : '';
      t.innerHTML = `<img src="${beeldPad(s)}" alt=""><b>${s.naam}</b><span>${s.zin}</span>${extra}`;
      t.addEventListener('click', () => kies(s));
      blok.querySelector('.jr-tegels').appendChild(t);
    }
    box.appendChild(blok);
  }
}

function kies(s) {
  if (s.id === 'eigen' && !sets.length) { ga('maken'); return; }
  let manier = 'beurt';
  try { manier = localStorage.getItem('jr-manier') || 'beurt'; } catch {}
  let avontuur = '';
  try { avontuur = localStorage.getItem('jr-avontuur') || ''; } catch {}
  gekozen = { spel: s.id, niveau: 0, manier: s.bordAlleen ? 'bord' : manier, avontuur, kanAvontuur: !s.bordAlleen && !s.geenFout };
  $('jr-kv-icoon').src = beeldPad(s);
  $('jr-kv-naam').textContent = s.naam;
  $('jr-kv-zin').textContent = s.zin;
  // Spellen zonder papieren versie (bewegen, kring, waar is het draakje, de eigen naam): geen werkbladknop.
  $('jr-kv-print').classList.toggle('hidden', ['naam', 'dans', 'kring', 'waar', 'ritme', 'geluiden'].includes(s.id));
  // Eigen vragen: meteen de gekozen reeks bekijken of aanpassen.
  $('jr-kv-kijk').classList.toggle('hidden', s.id !== 'eigen');
  $('jr-kv-bewerk').classList.toggle('hidden', s.id !== 'eigen');
  const niv = $('jr-kv-niveaus');
  niv.innerHTML = '';
  (s.id === 'eigen' ? sets.map(x => x.naam) : s.niveaus).forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = n;
    if (s.id === 'eigen') b.dataset.map = sets[i].map || '';
    b.className = i === 0 ? 'aan' : '';
    b.addEventListener('click', () => {
      gekozen.niveau = i;
      for (const x of niv.querySelectorAll('button')) x.classList.toggle('aan', x === b);
    });
    niv.appendChild(b);
  });
  // Veel eigen reeksen: een zoekvakje erboven en de lijst schuift (zo blijft het venster even groot).
  const veel = s.id === 'eigen' && sets.length > 6;
  niv.classList.toggle('jr-kv-veel', veel);
  $('jr-kv-zoek').classList.toggle('hidden', !veel);
  $('jr-kv-zoek').value = '';
  // Mapjes van de verkenner: tik op een map en je ziet alleen de reeksen daarin.
  const mb = $('jr-kv-mappen');
  const metMap = s.id === 'eigen' ? mappen.filter(m => sets.some(x => x.map === m)) : [];
  kvMap = null;
  mb.classList.toggle('hidden', !metMap.length);
  mb.innerHTML = metMap.length ? [['', '📚 Alles'], ...metMap.map(m => [m, `📁 ${m}`])].map(([m, t], i) => `<button type="button" class="jr-eigen ${i ? '' : 'aan'}" data-kvmap="${Junior.esc(m)}">${Junior.esc(t)}</button>`).join('') : '';
  mb.querySelectorAll('[data-kvmap]').forEach(b => b.addEventListener('click', () => {
    kvMap = b.dataset.kvmap || null;
    for (const x of mb.children) x.classList.toggle('aan', x === b);
    kvFilter();
  }));
  $('jr-kv-manier-blok').classList.toggle('hidden', !!s.bordAlleen);
  zetManier();
  $('jr-kies-venster').showModal();
}
let kvMap = null;
function kvFilter() {
  const q = $('jr-kv-zoek').value.trim().toLowerCase();
  for (const b of $('jr-kv-niveaus').querySelectorAll('button')) b.classList.toggle('hidden', (!!q && !b.textContent.toLowerCase().includes(q)) || (kvMap !== null && b.dataset.map !== kvMap));
}
$('jr-kv-zoek').addEventListener('input', kvFilter);
function zetManier() {
  for (const b of $('jr-kv-manieren').children) b.classList.toggle('aan', b.dataset.manier === gekozen.manier);
  // Een avontuur op het bord kan alleen als de kinderen op de tablets spelen.
  $('jr-kv-avontuur-blok').classList.toggle('hidden', !gekozen.kanAvontuur || gekozen.manier === 'bord');
  for (const b of $('jr-kv-avonturen').children) b.classList.toggle('aan', b.dataset.avontuur === (gekozen.avontuur || ''));
}
for (const b of $('jr-kv-avonturen').children) {
  b.addEventListener('click', () => {
    gekozen.avontuur = b.dataset.avontuur;
    try { localStorage.setItem('jr-avontuur', gekozen.avontuur); } catch {}
    zetManier();
  });
}
for (const b of $('jr-kv-manieren').children) {
  b.addEventListener('click', () => {
    gekozen.manier = b.dataset.manier;
    try { localStorage.setItem('jr-manier', gekozen.manier); } catch {}
    zetManier();
  });
}
$('jr-kv-annuleer').addEventListener('click', () => $('jr-kies-venster').close());
// ---------- Werkblad: vragen uit het gekozen spel op papier (A4) ----------
// Elke maker geeft het blad (k = false) of de verbetersleutel (k = true) met het juiste antwoord aangeduid.
const goed = (k, ja) => (k && ja ? ' wb-goed' : '');
const WB = {
  kies: (v, i, k) => ({ doe: 'Kleur het juiste antwoord.', html: `<div class="wb-rij">${v.opties.map(o => `<span class="wb-ding${goed(k, o.juist)}">${o.html}</span>`).join('')}</div>` }),
  tikAlle: (v, i, k) => ({ doe: 'Kleur alles wat past.', html: `<div class="wb-rij wb-veel">${v.items.map(x => `<span class="wb-ding${goed(k, x.doel)}">${x.html}</span>`).join('')}</div>` }),
  tikAantal: (v, i, k) => ({ doe: 'Kleur er zoveel als gevraagd.', html: `<div class="wb-rij wb-veel">${v.items.map((x, j) => `<span class="wb-ding${goed(k, j < v.aantal)}">${x.html}</span>`).join('')}</div>` }),
  volgorde: (v, i, k) => {
    const r = Junior.toeval(v.kaarten.length * 31 + 7 + i * 101);
    return { doe: 'Schrijf 1, 2, 3 ... in de goede volgorde.', html: `<div class="wb-rij">${r.schud(v.kaarten).map(x => `<span class="wb-ding wb-kaart">${x.html}<i class="wb-hokje">${k ? x.plek + 1 : ''}</i></span>`).join('')}</div>` };
  },
  // Het splitshuis: het getal op het dak, links de draakjes die er al zijn, rechts tekenen en schrijven.
  sleepAantal: (v, i, k) => ({ doe: 'Teken wat er nog bij moet en schrijf het getal.', html: `<div class="wb-huis"><b class="wb-dak">${v.totaal}</b><div class="wb-kamers"><span>${'●'.repeat(v.vast).replace(/(●{5})/g, '$1 ')}<b>${v.vast}</b></span><span>${k ? `<em class="wb-sl-tekening">${'●'.repeat(v.doel).replace(/(●{5})/g, '$1 ')}</em>` : ''}<i class="wb-hokje">${k ? v.doel : ''}</i></span></div></div>` }),
  // Schrijven: de stippellijn met een bolletje waar je begint, en daaronder een lege lijn om het zelf te schrijven.
  spoor: (v, i, k) => {
    const S = window.JrSchrift;
    let m = v;
    if (S && v.tekst && v.tekst.length === 1) m = S.woord(`${v.tekst} ${v.tekst} ${v.tekst}`, Junior.schrift || 'schuin') || v;
    const lijnen = w => [15, 45, 70, 95].map(y => `<line x1="0" x2="${w}" y1="${y}" y2="${y}" class="${y === 70 ? 'b' : y === 45 ? 'm' : ''}"/>`).join('');
    const bol = d => { const q = /M\s*([-\d.]+)[ ,]([-\d.]+)/.exec(d); return q ? `<circle cx="${q[1]}" cy="${q[2]}" r="2.2"/>` : ''; };
    const w = Math.max(m.w, 60);
    return { doe: 'Trek over en schrijf het daarna zelf.', html: `<div class="wb-spoor"><svg viewBox="0 8 ${w} 92">${lijnen(w)}${m.paden.map(d => `<path d="${d}"${k ? ' class="k"' : ''}/>`).join('')}${k ? '' : m.paden.map(bol).join('')}</svg><svg viewBox="0 8 ${w} 92">${lijnen(w)}</svg></div>` };
  },
  // Sorteren: in de sleutel staat bij elk prentje het nummer van zijn mand.
  sorteer: (v, i, k) => {
    const nr = id => v.manden.findIndex(m => m.id === id) + 1;
    return { doe: 'Trek een lijn naar de goede mand.', html: `<div class="wb-sorteer"><div class="wb-kolom">${v.items.map(x => `<span class="wb-ding">${x.html}${k ? `<em class="wb-sl">${nr(x.mand)}</em>` : ''}<i class="wb-punt"></i></span>`).join('')}</div><div class="wb-kolom wb-manden">${v.manden.map((m, j) => `<span class="wb-ding wb-mand"><i class="wb-punt"></i>${m.html}${k ? `<em class="wb-sl">${j + 1}</em>` : ''}</span>`).join('')}</div></div>` };
  },
};
// Werkblad bij een spel: de werkbladgenerator opent met dit spel en niveau al gekozen (jr-werkblad.js).
function werkblad() {
  $('jr-kies-venster').close();
  ga('werkbladen');
  JrWerkblad.toon({ spel: gekozen.spel, niveau: gekozen.niveau });
}
$('jr-kv-print').addEventListener('click', werkblad);
$('jr-kv-kijk').addEventListener('click', () => { const set = sets[gekozen.niveau]; if (set) voorbeeldSet(set); });
$('jr-kv-bewerk').addEventListener('click', () => { const set = sets[gekozen.niveau]; if (!set) return; $('jr-kies-venster').close(); ga('maken'); bewerk(set); });
$('jr-kv-start').addEventListener('click', () => {
  try { sfx.unlock(); } catch {}
  socket.emit('jr-start', { ...gekozen, avontuur: gekozen.manier === 'bord' ? '' : gekozen.avontuur }, res => {
    if (res && res.error) return Ui.melding(res.error);
    $('jr-kies-venster').close();
  });
});
$('jr-stop').addEventListener('click', () => socket.emit('jr-stop'));
$('jr-herhaal').addEventListener('click', () => {
  if (bord && bord.huidig) bord.huidig.herhaal();
  else if (dans && dans.zeg) Junior.Stem.zeg(dans.zeg);
  else if (kring && kring.q) Junior.Stem.zeg([kring.q.vraag]);
});
// ---------- Instellingen (knop ⚙️): elke tik wordt meteen bewaard ----------
function toonInstellingen(i) {
  const zet = (box, w) => { for (const b of $(box).children) b.classList.toggle('aan', b.dataset.w === String(w)); };
  zet('jr-inst-ronde', i.perRonde);
  zet('jr-inst-voorlezen', i.voorlezen ? 1 : 0);
  zet('jr-inst-groei', i.groei ? 1 : 0);
  zet('jr-inst-rustig', i.rustig ? 1 : 0);
  zet('jr-inst-vrij', i.vrij === false ? 0 : 1);
  zet('jr-inst-thema', i.thema || 'auto');
  zet('jr-inst-munt', i.munt || 'auto');
  zet('jr-inst-schrift', i.schrift || 'schuin');
}
function bewaarInstelling(nieuw) {
  socket.emit('jr-instellingen', nieuw, res => {
    if (res && res.error) return Ui.melding(res.error);
    if (res) toonInstellingen(res.instellingen);
  });
}
for (const b of $('jr-inst-ronde').children) b.addEventListener('click', () => bewaarInstelling({ perRonde: Number(b.dataset.w) }));
for (const b of $('jr-inst-voorlezen').children) b.addEventListener('click', () => bewaarInstelling({ voorlezen: b.dataset.w === '1' }));
for (const b of $('jr-inst-vrij').children) b.addEventListener('click', () => bewaarInstelling({ vrij: b.dataset.w === '1' }));
for (const b of $('jr-inst-rustig').children) b.addEventListener('click', () => bewaarInstelling({ rustig: b.dataset.w === '1' }));
for (const b of $('jr-inst-groei').children) b.addEventListener('click', () => bewaarInstelling({ groei: b.dataset.w === '1' }));
for (const b of $('jr-inst-thema').children) b.addEventListener('click', () => bewaarInstelling({ thema: b.dataset.w }));
for (const b of $('jr-inst-munt').children) b.addEventListener('click', () => bewaarInstelling({ munt: b.dataset.w }));
for (const b of $('jr-inst-schrift').children) { try { b.querySelector('b').outerHTML = JrSchrift.voorbeeld('abc', b.dataset.w); } catch {} }
for (const b of $('jr-inst-schrift').children) b.addEventListener('click', () => bewaarInstelling({ schrift: b.dataset.w }));
$('jr-inst-knop').addEventListener('click', () => {
  socket.emit('jr-instellingen', null, res => {
    if (res && res.error) return Ui.melding(res.error);
    toonInstellingen(res.instellingen);
    $('jr-inst-venster').showModal();
  });
});
$('jr-inst-dicht').addEventListener('click', () => $('jr-inst-venster').close());
Ui.tabs($('jr-inst-tabs'), 'jr-instellingen-tab');
// De taal en de AI-sleutel kies je ook hier, zodat Junior op zichzelf werkt.
for (const b of $('jr-inst-taal').children) {
  b.classList.toggle('aan', b.dataset.w === (window.LANCELOT_TAAL || 'nl'));
  b.addEventListener('click', () => { if (b.dataset.w !== (window.LANCELOT_TAAL || 'nl')) socket.emit('taal-zet', b.dataset.w); });
}
let aiStand = null;
function toonAi(st) {
  if (st) aiStand = st;
  if (!aiStand || !aiStand.diensten) return;
  const d = aiStand.diensten[$('jr-ai-dienst').value];
  $('jr-ai-stand').textContent = d && d.hasKey ? `✅ ${d.naam}: sleutel bewaard (${d.keyHint}).` : '';
}
socket.on('settings', st => { toonAi(st); if (st && st.diensten) { const heeft = Object.values(st.diensten).some(d => d.hasKey); if (heeft) $('jr-maak-ai-tip').textContent = ''; } });
$('jr-ai-dienst').addEventListener('change', () => toonAi());
$('jr-inst-ai').addEventListener('submit', e => {
  e.preventDefault();
  const dienst = $('jr-ai-dienst').value;
  const sleutel = $('jr-ai-sleutel').value.trim();
  if (!sleutel) return $('jr-ai-sleutel').focus();
  const veld = { gemini: 'geminiKey', claude: 'claudeKey', openai: 'openaiKey' }[dienst];
  socket.emit('save-settings', { aiDienst: dienst, [veld]: sleutel }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    $('jr-ai-sleutel').value = '';
    $('jr-ai-stand').textContent = '✅ Bewaard.';
  });
});
// 🔊 is AL het geluid op het bord: het draakje, de muziek en de geluidjes. 🎵 is alleen de muziek.
const stemKnop = () => {
  const uit = Junior.Stem.uit;
  $('jr-stem-knop').textContent = uit ? '🔇' : '🔊';
  JrMuziek.stil = uit;
  try { if (sfx.muted !== uit) sfx.toggle(); } catch {}
  $('jr-muziek-knop').disabled = uit;
};
$('jr-stem-knop').addEventListener('click', () => { Junior.Stem.uit = !Junior.Stem.uit; stemKnop(); muziek(); });
// Zachte muziek op het bord: tijdens een spel, en in het hol, op het klaseiland en in het Toverdorp.
const muziekKnop = () => { $('jr-muziek-knop').classList.toggle('uit', !JrMuziek.aan); $('jr-muziek-knop').style.opacity = JrMuziek.aan ? '' : '.45'; };
function muziek() {
  const v = location.hash.slice(1) || 'thuis';
  if (Junior.rustig) return JrMuziek.stop();
  if (stand.actief && stand.spel !== 'dans') JrMuziek.speel(stand.spel);
  else if (!stand.actief && ['draakje', 'eiland', 'rijk'].includes(v)) JrMuziek.speel(v);
  else JrMuziek.stop();
}
$('jr-muziek-knop').addEventListener('click', () => { JrMuziek.aan = !JrMuziek.aan; muziekKnop(); muziek(); });
muziekKnop();
stemKnop();

// ---------- De klas en hun dieren ----------
function klas() {
  $('jr-tel-klas').textContent = `${kinderen.length} kinderen`;
  feestKnop();
  const box = $('jr-klas-rooster');
  box.innerHTML = '';
  $('jr-klas-leeg').classList.toggle('hidden', kinderen.length > 0);
  for (const k of kinderen) {
    const d = document.createElement('div');
    d.className = 'jr-klas-kind';
    d.innerHTML = `<button type="button" class="jr-klas-beeld" title="${k.eigen ? 'Eigen symbool' : 'Tik om een ander dier te geven'}"><img src="${k.beeld}" alt=""></button><span>${Junior.esc(k.naam)}</span><em>${k.stickers ? `🏅 ${k.stickers}` : ''}</em>${maatTekst(k) ? `<small class="jr-maat-label">${maatTekst(k)}</small>` : ''}`
      + `<span class="jr-klas-knoppen"><button type="button" class="jr-sym jr-eigen" title="Eigen symbooltje opladen (zoals aan de kapstok)">📷</button><button type="button" class="jr-maat-knop jr-eigen ${maatTekst(k) ? 'aan' : ''}" title="${Junior.esc(window.I18n ? I18n.t('Op maat: niveau en aantal prenten voor dit kind') : 'Op maat: niveau en aantal prenten voor dit kind')}">🎚️</button><button type="button" class="jr-jarig-knop jr-eigen ${k.jarig ? 'aan' : ''}" title="Verjaardag">🎂${k.jarig ? `<small data-geen-vertaling>${+k.jarig.slice(3)}/${+k.jarig.slice(0, 2)}</small>` : ''}</button>${k.eigen ? '<button type="button" class="jr-sym-weg jr-eigen" title="Terug naar een dier">✕</button>' : ''}<button type="button" class="jr-kind-naam jr-eigen" title="Andere naam">✏️</button><button type="button" class="jr-kind-weg jr-eigen" title="Uit de klas halen">🗑️</button></span>`;
    d.querySelector('.jr-klas-beeld').addEventListener('click', () => {
      if (k.eigen) return;
      socket.emit('jr-dier', { id: k.id }, res => { if (res && res.kinderen) { kinderen = res.kinderen; klas(); } });
    });
    d.querySelector('.jr-sym').addEventListener('click', () => kiesSymbool(k));
    d.querySelector('.jr-jarig-knop').addEventListener('click', () => kiesJarig(k));
    d.querySelector('.jr-maat-knop').addEventListener('click', () => kiesMaat(k));
    const weg = d.querySelector('.jr-sym-weg');
    if (weg) weg.addEventListener('click', () => stuurSymbool(k, ''));
    d.querySelector('.jr-kind-naam').addEventListener('click', () => {
      const span = d.querySelector(':scope > span');
      const inp = document.createElement('input');
      inp.className = 'jr-kind-invoer';
      inp.maxLength = 20;
      inp.value = k.naam;
      span.replaceWith(inp);
      inp.focus();
      inp.select();
      let klaar = false;
      const bewaar = () => {
        if (klaar) return;
        klaar = true;
        const naam = inp.value.trim();
        if (!naam || naam === k.naam) return klas();
        klasActie({ actie: 'hernoem', id: k.id, naam });
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') bewaar(); if (e.key === 'Escape') { klaar = true; klas(); } });
      inp.addEventListener('blur', bewaar);
    });
    d.querySelector('.jr-kind-weg').addEventListener('click', async () => {
      if (!(await Ui.vraag(`${k.naam} uit de klas halen?`))) return;
      klasActie({ actie: 'wis', id: k.id });
    });
    box.appendChild(d);
  }
}
// De klas aanpassen in Junior zelf: dezelfde klaslijst als Mijn klas.
function klasActie(arg, klaar) {
  socket.emit('jr-klas', arg, res => {
    if (!res || res.error) { Ui.melding((res && res.error) || 'Bewaren lukte niet.'); return klas(); }
    const oud = new Map(kinderen.map(k => [k.id, k]));
    kinderen = (res.kinderen || []).map(k => ({ ...(oud.get(k.id) || {}), ...k }));
    klas();
    if (klaar) klaar();
  });
}
// Een lijst plakken (uit Excel of een document): elke regel wordt een naam.
$('jr-klas-nieuw').addEventListener('paste', e => {
  const t = e.clipboardData && e.clipboardData.getData('text');
  if (!t || !/[\r\n\t]/.test(t)) return;
  e.preventDefault();
  const inp = $('jr-klas-nieuw');
  const lijst = t.split(/[\r\n\t]+/).map(x => x.trim()).filter(Boolean).join(', ');
  inp.setRangeText(lijst, inp.selectionStart, inp.selectionEnd, 'end');
});
$('jr-klas-erbij').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('jr-klas-nieuw');
  if (!inp.value.trim()) return inp.focus();
  klasActie({ actie: 'nieuw', namen: inp.value }, () => { inp.value = ''; inp.focus(); });
});
// Op maat (zorg, buitengewoon onderwijs): een niveau makkelijker of moeilijker dan de klas, en/of minder prenten.
// De klaslijst staat in data-geen-vertaling (de namen): deze woordjes vertalen we hier zelf.
function maatTekst(k) {
  const m = k.maat || {};
  const t = x => (window.I18n ? I18n.t(x) : x);
  return [m.stap === -1 ? t('Makkelijker') : m.stap === 1 ? t('Moeilijker') : '', m.minder ? t('Minder prenten') : ''].filter(Boolean).join(' · ');
}
function toonMaat(k) {
  const m = k.maat || {};
  for (const b of $('jr-maat-stap').children) b.classList.toggle('aan', b.dataset.w === String(m.stap || 0));
  for (const b of $('jr-maat-minder').children) b.classList.toggle('aan', b.dataset.w === (m.minder ? '1' : '0'));
}
function kiesMaat(k) {
  const v = $('jr-maat-venster');
  $('jr-maat-naam').textContent = k.naam;
  v._kind = k;
  toonMaat(k);
  v.showModal();
}
function bewaarMaat(nieuw) {
  const v = $('jr-maat-venster');
  socket.emit('jr-maat', { id: v._kind.id, ...nieuw }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    const oud = new Map(kinderen.map(k => [k.id, k]));
    kinderen = (res.kinderen || []).map(k => ({ ...(oud.get(k.id) || {}), ...k }));
    v._kind = kinderen.find(k => k.id === v._kind.id) || v._kind;
    toonMaat(v._kind);
    klas();
  });
}
for (const b of $('jr-maat-stap').children) b.addEventListener('click', () => bewaarMaat({ stap: Number(b.dataset.w) }));
for (const b of $('jr-maat-minder').children) b.addEventListener('click', () => bewaarMaat({ minder: b.dataset.w === '1' }));
$('jr-maat-dicht').addEventListener('click', () => $('jr-maat-venster').close());
// De verjaardag van een kind: dag en maand (het jaar is niet nodig).
function kiesJarig(k) {
  const v = $('jr-jarig-venster');
  $('jr-jarig-naam').textContent = k.naam;
  $('jr-jarig-dag').value = k.jarig ? String(+k.jarig.slice(3)) : '';
  $('jr-jarig-maand').value = k.jarig ? String(+k.jarig.slice(0, 2)) : '';
  v._kind = k;
  v.showModal();
}
function stuurJarig(datum) {
  const v = $('jr-jarig-venster');
  socket.emit('jr-jarig', { id: v._kind.id, datum }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    kinderen = res.kinderen;
    klas();
    v.close();
  });
}
$('jr-jarig-bewaar').addEventListener('click', () => {
  const d = +$('jr-jarig-dag').value, m = +$('jr-jarig-maand').value;
  if (!d || !m) return stuurJarig('');
  stuurJarig(`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
});
$('jr-jarig-wis').addEventListener('click', () => stuurJarig(''));
$('jr-jarig-dicht').addEventListener('click', () => $('jr-jarig-venster').close());

// Een eigen symbool: een foto of scan, hier al verkleind tot 256 pixels zodat de tablets ze snel laden.
function kiesSymbool(k) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const sch = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sch);
      c.height = Math.round(img.height * sch);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let data = c.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/png');
      URL.revokeObjectURL(img.src);
      stuurSymbool(k, data);
    };
    img.onerror = () => Ui.melding('Die prent kan ik niet openen. Kies een foto (jpg of png).');
    img.src = URL.createObjectURL(f);
  });
  inp.click();
}
function stuurSymbool(k, data) {
  fetch(`/junior/symbool/${encodeURIComponent(k.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })
    .then(r => r.json())
    .then(res => {
      if (res.error) return Ui.melding(res.error);
      kinderen = res.kinderen || kinderen;
      klas();
    })
    .catch(() => Ui.melding('Opladen lukte niet. Probeer het opnieuw.'));
}
// Een blad met een kaartje per kind (dier of symbool en naam), om op te hangen in de klas.
// Een diploma voor elk kind met minstens één volle bladzijde (12 stickers) in het stickerboek.
$('jr-diplomas').addEventListener('click', () => {
  const wie = kinderen.filter(k => (k.stickers || 0) >= 12);
  if (!wie.length) { Ui.melding('Nog niemand heeft een volle bladzijde van 12 stickers.'); return; }
  const blad = $('jr-printblad');
  const datum = new Intl.DateTimeFormat((J().stemmen || ['nl-BE'])[0], { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  blad.classList.remove('werkblad');
  blad.classList.add('diploma');
  // Het printblad vertaalt zichzelf niet: de vaste woorden hier wel.
  const t = x => (window.I18n ? I18n.t(x) : x);
  blad.innerHTML = wie.map(k => `<div class="jr-diploma"><h1 class="jr-diploma-titel">${t('Diploma')}</h1><div class="jr-diploma-in">
    <img class="jr-diploma-dier" src="${k.beeld}" alt="">
    <b class="jr-diploma-naam">${Junior.esc(k.naam)}</b>
    <p>${t(`heeft al ${k.stickers} stickers verzameld!`)}</p>
    <div class="jr-diploma-onder"><span>${Junior.esc(datum)}</span><span class="jr-diploma-teken">${t('De leerkracht')}<i></i></span></div>
  </div></div>`).join('');
  const imgs = [...blad.querySelectorAll('img')];
  Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; })))).then(() => print());
});
$('jr-print').addEventListener('click', () => {
  const blad = $('jr-printblad');
  blad.classList.remove('diploma', 'werkblad');
  blad.innerHTML = kinderen.map(k => `<div class="jr-printkaart"><img src="${k.beeld}" alt=""><b>${Junior.esc(k.naam)}</b></div>`).join('');
  const imgs = [...blad.querySelectorAll('img')];
  Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; })))).then(() => print());
});

function volg(lijst) {
  const box = $('jr-volg');
  box.innerHTML = '';
  for (const k of lijst) {
    const d = document.createElement('div');
    d.className = `jr-volg-kind ${k.bezig ? 'bezig' : ''} ${k.gedaan ? 'klaar' : ''}`;
    const pct = k.gedaan ? Math.round((k.goed / k.gedaan) * 100) : null;
    d.innerHTML = `<img src="${k.beeld}" alt=""><span>${Junior.esc(k.naam)}</span><em>${'⭐'.repeat(Math.min(5, k.rondes))}${pct !== null ? ` <small>${pct}%</small>` : ''}</em>`;
    if (pct !== null) d.title = `${k.goed} van de ${k.gedaan} meteen goed`;
    box.appendChild(d);
  }
}

// ---------- Op het bord: 4 kleurteams ----------
// Elk team heeft zijn eigen geschilderde draakje en een rij sterren. Het team dat aan de beurt is, springt.
// Wie zit in welk team: de aanwezige kinderen, in de volgorde van de klaslijst (kind 1 rood, kind 2 blauw ...).
const teamLeden = i => kinderen.filter(k => k.team === i && !afwezig.has(k.id));
// Het kind van dit team dat nu naar het bord mag komen (om de beurt binnen het team).
function teamKind(i) { const l = teamLeden(i); return l.length ? l[(bord ? bord.wie[i] : 0) % l.length] : null; }
function teams(nieuw = -1) {
  $('jr-teams').innerHTML = TEAMKLEUR.map((kl, i) => {
    const n = stand.teams ? stand.teams[i] : 0;
    const nu = bord && bord.team === i ? teamKind(i) : null;
    // Alle kinderen van het team; tik op een kind om het af te vinken (afwezig) of terug aan te zetten.
    const leden = kinderen.filter(k => k.team === i).map(k => `<button type="button" class="jr-team-lid jr-eigen ${nu && nu.id === k.id ? 'nu' : ''} ${afwezig.has(k.id) ? 'weg' : ''}" data-lid="${k.id}" title="${Junior.esc(k.naam)}"><img src="${k.beeld}" alt=""></button>`).join('');
    const sterren = Array.from({ length: Math.min(10, n) }, (_, j) => `<img class="${i === nieuw && j === Math.min(10, n) - 1 ? 'nieuw' : ''}" src="/img/junior/race/ster.webp" alt="">`).join('');
    return `<div class="jr-team jr-team-${kl} ${bord && bord.team === i ? 'aan' : ''}">
      <img class="jr-team-draak" src="/img/junior/race/draak${i + 1}.webp" alt="">
      <div class="jr-team-info"><b>${(J().zin.teams || [])[i] || ''}</b><span class="jr-team-sterren">${sterren}${n > 10 ? `<em>${n}</em>` : ''}</span>
        ${nu ? `<span class="jr-team-roep"><img src="${nu.beeld}" alt="">${Junior.esc(nu.naam)}</span>` : ''}<span class="jr-team-leden">${leden}</span></div></div>`;
  }).join('');
}
$('jr-teams').addEventListener('click', e => {
  const b = e.target.closest('[data-lid]');
  if (!b) return;
  const id = b.dataset.lid;
  const wasNu = bord && teamKind(bord.team) && teamKind(bord.team).id === id;
  if (afwezig.has(id)) afwezig.delete(id); else afwezig.add(id);
  bewaarOchtend();
  teams();
  // Was dit kind net geroepen, dan roept het draakje meteen een ander kind van hetzelfde team.
  const ander = bord && teamKind(bord.team);
  if (wasNu && ander) Junior.Stem.zeg([(J().zin.teams || [])[bord.team], ander.naam, J().zin.teamKom]);
});
async function bordVraag() {
  if (!bord) return;
  const mijn = bord;
  // Een team zonder (aanwezige) kinderen slaan we over.
  for (let i = 0; i < 4 && kinderen.length && !teamLeden(bord.team).length; i++) bord.team = (bord.team + 1) % 4;
  teams();
  const wie = teamKind(bord.team);
  // De vorige opdracht weg: terwijl het draakje het volgende kind roept, staat dat kind groot op het bord.
  if (bord.huidig) try { bord.huidig.stop(); } catch {}
  bord.huidig = null;
  $('jr-bord-vak').innerHTML = `<div class="jr-bord-roep jr-team-${TEAMKLEUR[bord.team]}">${wie ? `<img src="${wie.beeld}" alt=""><b>${Junior.esc(wie.naam)}</b>` : `<img src="/img/junior/race/draak${bord.team + 1}.webp" alt=""><b>${Junior.esc((J().zin.teams || [])[bord.team] || '')}</b>`}</div>`;
  await Junior.Stem.zeg(wie ? [(J().zin.teams || [])[bord.team], wie.naam, J().zin.teamKom] : [(J().zin.teams || [])[bord.team], J().zin.teamBeurt]);
  if (mijn !== bord) return;
  const v = Junior.vraag(stand.spel, stand.niveau, bord.r, teamKind(bord.team) || {});
  bord.huidig = Junior.speel($('jr-bord-vak'), v, {
    klaar: () => {
      if (mijn !== bord) return;
      socket.emit('jr-team-goed', { team: bord.team }, res => {
        if (mijn !== bord) return;
        if (res && res.teams) stand.teams = res.teams;
        teams(bord.team);
        try { sfx.naald(); } catch {}
        if (res && res.draak) toonDraak(res.draak);
        if (res && res.gegroeid) Junior.Stem.zeg([J().zin.groei]);
        bord.wie[bord.team]++;
        bord.team = (bord.team + 1) % 4;
        try { localStorage.setItem('jr-bord-beurt', JSON.stringify({ team: bord.team, wie: bord.wie })); } catch {}
        setTimeout(bordVraag, res && res.gegroeid ? 2600 : 900);
      });
    },
  });
}

// ---------- Drakenrace: 4 banen, het draakje van elk team rent vooruit bij elk juist antwoord op de tablets ----------
let race = null; // { ronde, feest }
// Er zijn drie avonturen: de Drakenrace (4 banen), het Ballonnenfeest (4 ballonnen stijgen naar de wolken)
// en Burchtbouwers (de hele klas bouwt samen één burcht). Alle drie in hetzelfde vak op het bord.
const UITLEG = {
  race: 'Elk juist antwoord op de tablet: je draakje rent een stukje vooruit.',
  ballon: 'Elk juist antwoord op de tablet: de ballon van je team stijgt een stukje.',
  bouw: 'Elk juist antwoord op de tablet: samen bouwen we de burcht een stukje hoger.',
};
const AVONTUUR_NAAM = { race: 'Drakenrace', ballon: 'Ballonnenfeest', bouw: 'Burchtbouwers' };
function raceBouw() {
  const box = $('jr-race-banen');
  const id = (stand.avontuur && stand.avontuur.id) || 'race';
  if (box.dataset.id === id && box.children.length) return;
  box.dataset.id = id;
  $('jr-race').dataset.avontuur = id;
  $('jr-race-uitleg').textContent = UITLEG[id] || UITLEG.race;
  if (id === 'bouw') {
    box.innerHTML = `<div class="jr-bouw" style="--ver:0"><img class="jr-bouw-schets" src="/img/junior/avontuur/burcht.webp" alt=""><img class="jr-bouw-burcht" src="/img/junior/avontuur/burcht.webp" alt=""><div class="jr-bouw-kinderen"></div></div><span class="jr-baan-winst jr-bouw-winst"></span>`;
    return;
  }
  if (id === 'ballon') {
    box.innerHTML = TEAMKLEUR.map((kl, i) => `<div class="jr-lucht jr-baan-${kl}" data-team="${i}">
      <div class="jr-baan-loper jr-ballon" style="--ver:0"><img class="jr-ballon-img" src="/img/junior/avontuur/ballon${i + 1}.webp" alt=""></div>
      <span class="jr-baan-winst"></span>
      <span class="jr-baan-naam">${Junior.esc((J().zin.teams || [])[i] || '')}</span>
      <span class="jr-baan-leden"></span>
    </div>`).join('');
    return;
  }
  box.innerHTML = TEAMKLEUR.map((kl, i) => `<div class="jr-baan jr-baan-${kl}" data-team="${i}">
    <span class="jr-baan-naam">${Junior.esc((J().zin.teams || [])[i] || '')}</span>
    <span class="jr-baan-leden"></span>
    <span class="jr-baan-winst"></span>
    <img class="jr-baan-vlag" src="/img/junior/race/vlag.webp" alt="">
    <div class="jr-baan-loper" style="--ver:0"><img class="jr-baan-draak" src="/img/junior/race/draak${i + 1}.webp" alt=""></div>
  </div>`).join('');
}
function raceToon(a, opnieuw) {
  raceBouw();
  if (!race || opnieuw) race = { ronde: a.ronde, feest: false };
  if (race.feest) return;
  if (a.samen) {
    $('jr-race-banen').querySelector('.jr-bouw').style.setProperty('--ver', a.ver[0]);
    $('jr-race-banen').querySelector('.jr-bouw-winst').innerHTML = '<img src="/img/junior/avontuur/burcht.webp" alt="">'.repeat(Math.min(6, a.winst[0]));
    return;
  }
  for (const baan of $('jr-race-banen').children) {
    const t = +baan.dataset.team;
    baan.querySelector('.jr-baan-loper').style.setProperty('--ver', a.ver[t]);
    // Wie in dit team zit: de dieren van de klas, zodat elk kind zijn baan vindt.
    baan.querySelector('.jr-baan-leden').innerHTML = kinderen.filter(k => k.team === t).map(k => `<img src="${k.beeld}" alt="" title="${Junior.esc(k.naam)}">`).join('');
    baan.querySelector('.jr-baan-winst').innerHTML = '<img src="/img/junior/race/beker.webp" alt="">'.repeat(Math.min(5, a.winst[t]));
  }
}
socket.on('jr-avontuur', async a => {
  if (!stand.avontuur || a.id !== stand.avontuur.id) return;
  raceBouw();
  // Het dier van het kind springt even op: bij zijn draakje, zijn ballon of bij de burcht.
  const plek = a.samen ? $('jr-race-banen').querySelector('.jr-bouw-kinderen') : ($('jr-race-banen').children[a.team] || {}).querySelector && $('jr-race-banen').children[a.team].querySelector('.jr-baan-loper');
  if (!plek) return;
  const bel = document.createElement('img');
  bel.className = 'jr-baan-kind';
  bel.src = a.kind.beeld;
  bel.alt = '';
  if (a.samen) bel.style.left = `${10 + Math.random() * 80}%`;
  plek.appendChild(bel);
  setTimeout(() => bel.remove(), 1800);
  if (!a.samen) { plek.classList.remove('jr-hop'); void plek.offsetWidth; plek.classList.add('jr-hop'); }
  try { a.samen ? sfx.hit() : sfx.jump(); } catch {}
  stand.avontuur = a.winnaar === null ? a : a.na;
  if (a.winnaar === null) { raceToon(a); return; }
  // Aan de finish (of de burcht is af): feest, en dan een nieuwe ronde.
  if (a.samen) $('jr-race-banen').querySelector('.jr-bouw').style.setProperty('--ver', 1);
  else plek.style.setProperty('--ver', 1);
  race.feest = true;
  await wacht(900);
  const z = J().zin;
  const tekst = a.samen ? [z.bouwKlaar] : [(z.teams || [])[a.winnaar], a.id === 'ballon' ? z.ballonWint : z.raceWint];
  $('jr-race-winnaar').textContent = tekst.join(' ');
  $('jr-race-feest').className = `jr-race-feest jr-race-feest-${a.samen ? 'samen' : TEAMKLEUR[a.winnaar]}`;
  $('jr-race-feest').querySelector('img').src = a.samen ? '/img/junior/avontuur/burcht.webp' : '/img/junior/race/beker.webp';
  try { confetti(4000); sfx.fanfare(); } catch {}
  Junior.Stem.zeg(tekst);
  if (a.samen) socket.emit('jr-beloning', { n: 5 }, res => res && res.draak && toonDraak(res.draak));
  await wacht(5000);
  $('jr-race-feest').classList.add('hidden');
  raceToon(stand.avontuur, true);
});

// ---------- De bewegingsdans ----------
const wacht = ms => new Promise(r => setTimeout(r, ms));
async function dansStap() {
  if (!dans) return;
  const mijn = dans;
  if (dans.nr >= 8) {
    $('jr-dans-kaart').innerHTML = `<img class="jr-draak-groot" src="${draakImg()}" alt=""><p class="jr-dans-tekst">${Junior.esc((J().zin.goed || [''])[0])}</p>`;
    socket.emit('jr-beloning', { n: 5 }, res => res && res.draak && toonDraak(res.draak));
    try { confetti(3000); } catch {}
    await Junior.Stem.zeg([(J().zin.goed || [''])[0], J().zin.groei]);
    return;
  }
  const lijst = J().dans || [];
  const b = lijst[(dans.volgorde[dans.nr]) % lijst.length];
  dans.nr++;
  const max = stand.niveau === 1 ? 10 : 5;
  const n = b.tel ? dans.r.int(2, max) : 0;
  dans.zeg = b.tel ? [b.zeg, n, J().zin.keer] : [b.zeg];
  const kaart = $('jr-dans-kaart');
  kaart.innerHTML = `<span class="jr-dans-emoji">${b.e}</span><p class="jr-dans-tekst">${Junior.esc(b.zeg)}${n ? ` <b>${n}×</b>` : ''}</p><p class="jr-dans-tel" id="jr-dans-tel"></p>`;
  await Junior.Stem.zeg(dans.zeg);
  for (let i = 1; i <= n; i++) {
    if (mijn !== dans || dans.pauze) return;
    const tel = $('jr-dans-tel');
    if (tel) { tel.textContent = i; tel.classList.remove('jr-pop'); void tel.offsetWidth; tel.classList.add('jr-pop'); }
    await Promise.all([Junior.Stem.zeg([i]), wacht(1100)]);
  }
  await wacht(n ? 900 : 4500);
  if (mijn === dans && !dans.pauze) dansStap();
}
$('jr-dans-volgende').addEventListener('click', () => { if (!dans) return; dans.pauze = false; dans = { ...dans }; dansStap(); });
$('jr-dans-pauze').addEventListener('click', () => {
  if (!dans) return;
  dans.pauze = !dans.pauze;
  $('jr-dans-pauze').textContent = dans.pauze ? '▶ Verder' : '⏸ Even stil';
  Junior.Stem.stop();
  if (!dans.pauze) { dans = { ...dans }; dansStap(); }
});

// ---------- Kringvragen ----------
function kringToon(k) {
  const vragen = (J().kring || [])[stand.niveau] || [];
  if (!vragen.length) return;
  const nr = k ? k.vraag : 0;
  const q = vragen[nr % vragen.length];
  const nieuw = !kring || kring.nr !== nr;
  kring = { nr, q, tel: k ? k.tel : [] };
  $('jr-kb-vraag').textContent = q.vraag;
  const max = Math.max(1, ...q.opties.map((_, i) => kring.tel[i] || 0));
  const box = $('jr-kb-opties');
  box.innerHTML = '';
  q.opties.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'jr-kb-optie';
    const n = kring.tel[i] || 0;
    b.innerHTML = `<span class="jr-emoji">${o.e}</span><span>${Junior.esc(o.t)}</span><span class="jr-kb-balk"><i style="height:${Math.round((n / max) * 100)}%"></i></span><b>${n}</b>`;
    b.addEventListener('click', () => socket.emit('jr-kring-tel', { keuze: i }));
    box.appendChild(b);
  });
  $('jr-kb-tel').textContent = k && k.aantal ? `${k.aantal} kinderen kozen al.` : '';
  if (nieuw) Junior.Stem.zeg([q.vraag]);
}
$('jr-kb-volgende').addEventListener('click', () => socket.emit('jr-kring-volgende', { stap: 1 }));
$('jr-kb-terug').addEventListener('click', () => socket.emit('jr-kring-volgende', { stap: -1 }));

// ---------- Wat er nu loopt ----------
function toon() {
  const loopt = !!stand.actief;
  muziek();
  $('jr-start').classList.toggle('hidden', loopt);
  $('jr-loopt').classList.toggle('hidden', !loopt);
  $('jr-status').textContent = loopt ? stand.naam : '';
  document.body.dataset.spel = loopt ? stand.spel : '';
  if (!loopt) {
    if (bord && bord.huidig) bord.huidig.stop();
    bord = null;
    dans = null;
    kring = null;
    Junior.Stem.stop();
    return;
  }
  const s = spelVan(stand.spel) || {};
  $('jr-loopt-icoon').src = beeldPad(s);
  $('jr-loopt-naam').textContent = s.naam || '';
  const MANIER = { bord: 'Op het bord, 4 teams', duo: 'Met twee op een tablet', beurt: 'Om de beurt', alleen: 'Elk op een eigen tablet' };
  $('jr-loopt-sub').textContent = `${stand.niveauNaam || ''} · ${MANIER[stand.manier] || ''}${stand.avontuur ? ` · ${AVONTUUR_NAAM[stand.avontuur.id] || ''}` : ''}`;
  const isDans = stand.spel === 'dans';
  const isKring = stand.spel === 'kring';
  const opBord = stand.manier === 'bord' && !isDans && !isKring;
  $('jr-dans').classList.toggle('hidden', !isDans);
  $('jr-kring-bord').classList.toggle('hidden', !isKring);
  $('jr-bord').classList.toggle('hidden', !opBord);
  const isRace = !!(stand.avontuur && AVONTUUR_NAAM[stand.avontuur.id]);
  $('jr-race').classList.toggle('hidden', !isRace);
  $('jr-tablets').classList.toggle('hidden', isRace || opBord || isDans || (isKring && stand.manier === 'bord'));
  if (isRace) raceToon(stand.avontuur);
  // Een ander spel (of opnieuw gestart): het oude spel op het bord eerst helemaal stoppen.
  if (bord && (bord.seed !== stand.seed || !opBord)) {
    if (bord.huidig) bord.huidig.stop();
    $('jr-bord-vak').innerHTML = '';
    Junior.Stem.stop();
    bord = null;
  }
  if (opBord && (!bord || bord.seed !== stand.seed)) {
    // Verder waar het vorige bordspel stopte: zo komen niet altijd dezelfde kinderen eerst aan het bord.
    let vorig = null;
    try { vorig = JSON.parse(localStorage.getItem('jr-bord-beurt') || 'null'); } catch {}
    const ok = vorig && Array.isArray(vorig.wie) && vorig.wie.length === 4;
    bord = { seed: stand.seed, r: Junior.toeval(stand.seed), team: ok ? (vorig.team | 0) % 4 : Math.floor(Math.random() * 4), wie: ok ? vorig.wie.map(x => x | 0) : [0, 1, 2, 3].map(() => Math.floor(Math.random() * 8)), huidig: null };
    $('jr-bord-vak').innerHTML = '';
    Junior.schaal($('jr-bord-vak'));
    bordVraag();
  }
  if (!isDans && dans) { dans = null; Junior.Stem.stop(); }
  if (!isKring) kring = null;
  if (isDans && (!dans || dans.seed !== stand.seed)) {
    const r = Junior.toeval(stand.seed);
    dans = { seed: stand.seed, r, nr: 0, volgorde: r.schud((J().dans || []).map((_, i) => i)), pauze: false };
    dansStap();
  }
  if (isKring && (!kring || stand.kring)) socket.emit('jr-kring-stand', null, k => kringToon(k));
  teams();
}

// ---------- De blokken: elk blok is een eigen pagina (met #spelen, #klas... in het adres, zodat Terug in de browser werkt) ----------
function ga(v) {
  if (!VIEWS.includes(v)) v = 'thuis';
  if (location.hash.slice(1) !== (v === 'thuis' ? '' : v)) history.pushState(null, '', v === 'thuis' ? location.pathname : `#${v}`);
  toonView(v);
}
// Linksboven (het woordmerk) brengt je altijd terug naar de startpagina van Junior.
$('jr-brand').addEventListener('click', () => ga('thuis'));
$('jr-brand').addEventListener('keydown', e => e.key === 'Enter' && ga('thuis'));
function toonView(v) {
  for (const x of VIEWS) $(`jr-v-${x}`).classList.toggle('hidden', x !== v);
  window.scrollTo(0, 0);
  if (v === 'opvolgen') socket.emit('jr-voortgang', null, res => res && !res.error && opvolg(res));
  if (v === 'maken') toonSets();
  if (v === 'ochtend') ochtend('wie');
  if (v === 'werkbladen' && window.JrWerkblad) JrWerkblad.toon();
  muziek();
  if (v !== 'eiland') eilandTourStop();
  if (v === 'rijk') JrRijk.maak($('jr-rijk-bord')); else if (window.JrRijk) JrRijk.stop();
  if (v === 'feest') feest(); else if (feestStop) feestStop();
  if (v === 'klastools') JrTools.maak($('jr-tools-bord'), { kinderen: () => kinderen.filter(k => !afwezig.has(k.id)) }); else if (window.JrTools) JrTools.stop();
  if (v === 'eiland') socket.emit('jr-eiland', null, res => res && res.eiland && eiland(res.eiland));
}


// ---------- Verjaardag: het dier van het jarige kind met een kroon, het draakje met een taart en kaarsjes uitblazen. ----------
const jarigen = () => kinderen.filter(k => k.feest);
function feestKnop() {
  const j = jarigen();
  $('jr-feest-knop').classList.toggle('hidden', !j.length);
  $('jr-feest-namen').textContent = j.map(k => k.naam).join(' & ');
}
let feestStop = null;
function feest(i = 0) {
  if (feestStop) feestStop();
  const j = jarigen();
  const k = j[i % Math.max(1, j.length)];
  const box = $('jr-feest-bord');
  if (!k) { box.innerHTML = ''; return; }
  let jaar = 0, uit = false;
  box.innerHTML = `<div class="jr-feest">
    <div class="jr-feest-kind"><img class="jr-feest-kroon" src="/img/junior/hol/1.webp" alt=""><img class="jr-feest-dier" src="${k.beeld}" alt=""><b>${Junior.esc(k.naam)}</b></div>
    <div class="jr-feest-taart"><img src="/img/junior/feest/taart.webp" alt=""><div class="jr-kaarsjes" id="jr-kaarsjes"></div></div><img class="jr-feest-draak" src="/img/junior/draakpose/2.webp" alt="">
  </div>
  <div class="jr-kt-knoppen jr-feest-knoppen"><span class="jr-feest-vraag">Hoeveel kaarsjes?</span>${[3, 4, 5, 6, 7, 8].map(n => `<button type="button" class="jr-kt-klein jr-eigen" data-jaar="${n}">${n}</button>`).join('')}
    <button type="button" class="jr-kt-groot jr-eigen hidden" id="jr-blaas">🌬️ Blaas!</button>${j.length > 1 ? '<button type="button" class="jr-kt-klein jr-eigen" id="jr-feest-volgend">▶</button>' : ''}</div>`;
  try { confetti(3000); } catch {}
  try { JrMuziek.feest(); } catch {}
  Junior.Stem.zeg([k.naam, J().zin.jarig]);
  const kaarsjes = () => { $('jr-kaarsjes').innerHTML = Array.from({ length: jaar }, () => `<i class="${uit ? 'uit' : ''}"></i>`).join(''); };
  box.querySelectorAll('[data-jaar]').forEach(b => b.addEventListener('click', () => {
    jaar = +b.dataset.jaar; uit = false; kaarsjes();
    box.querySelectorAll('[data-jaar]').forEach(x => x.classList.toggle('aan', x === b));
    $('jr-blaas').classList.remove('hidden');
    Junior.Stem.zeg([jaar, J().zin.jarigBlaas]);
    luister();
  }));
  const blaas = () => {
    if (uit || !jaar) return;
    uit = true; kaarsjes();
    try { confetti(4000); } catch {}
    try { sfx.fanfare(); } catch {}
    try { JrMuziek.liedje(); } catch {}
    Junior.Stem.zeg([J().zin.jarigUit, k.naam]);
    stopMicro();
  };
  $('jr-blaas').addEventListener('click', blaas);
  const volg = $('jr-feest-volgend');
  if (volg) volg.addEventListener('click', () => feest(i + 1));
  // Blazen in de micro van het bord blaast de kaarsjes uit (lukt de micro niet, dan tikt de leerkracht op Blaas).
  let stroom = null, ctx = null, raf = 0;
  const stopMicro = () => { cancelAnimationFrame(raf); if (stroom) stroom.getTracks().forEach(t => t.stop()); if (ctx) ctx.close().catch(() => {}); stroom = null; ctx = null; };
  async function luister() {
    if (stroom || !navigator.mediaDevices) return;
    try { stroom = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    ctx.createMediaStreamSource(stroom).connect(an);
    const buf = new Float32Array(an.fftSize);
    let hard = 0;
    const lus = () => {
      an.getFloatTimeDomainData(buf);
      let som = 0; for (const x of buf) som += x * x;
      hard = Math.sqrt(som / buf.length) > 0.12 ? hard + 1 : 0;
      if (hard > 12) return blaas();
      raf = requestAnimationFrame(lus);
    };
    setTimeout(lus, 1500);
  }
  feestStop = () => { stopMicro(); feestStop = null; };
}

// ---------- Het klaseiland: elke burcht van de klas op één eiland ----------
// Zelfde plekjes als op de tablet: midden (%), onderkant (%), grootte.
const BURCHT_PLEK = [[30, 45, 0.75], [50, 43, 0.75], [70, 45, 0.75], [18, 61, 0.88], [38, 60, 0.88], [62, 58, 0.88], [82, 61, 0.88], [27, 77, 1], [73, 77, 1]];
let eilandData = [];
let eilandTour = null;
// Plekjes op het gras van het eiland (een ovaal), dichter bij elkaar als er meer kinderen zijn.
function eilandPlekken(n) {
  for (let st = 0.2; st > 0.04; st -= 0.01) {
    const p = [];
    for (let rij = 0, y = 0.4; y <= 0.88; y += st * 1.7, rij++) {
      for (let x = 0.14 + (rij % 2) * st / 2; x <= 0.84; x += st) {
        const dx = (x - 0.47) / 0.34, dy = (y - 0.63) / 0.27;
        if (dx * dx + dy * dy <= 1) p.push([x, y]);
      }
    }
    if (p.length >= n) return { p: p.sort((a, b) => a[1] - b[1] || a[0] - b[0]), st };
  }
  return { p: [], st: 0.05 };
}
const burchtHtml = plek => BURCHT_PLEK.map(([x, y, sc], i) => (plek[i]
  ? `<span class="jr-eb-plek" style="left:${x}%;top:${y}%;z-index:${Math.round(y)};--sc:${sc}"><img src="/img/junior/burcht/${plek[i]}.webp" alt=""></span>` : '')).join('');
// Op het eiland: een klein groepje met de vier grootste gebouwen van het kind (de duurste vooraan in het midden).
const BURCHT_PRIJS = { 13: 2, 11: 2, 14: 3, 10: 3, 9: 4, 15: 4, 12: 5, 2: 5, 8: 5, 5: 6, 6: 6, 3: 6, 4: 7, 1: 8, 7: 10 };
const MINI = [[50, 100, 58], [22, 86, 42], [78, 86, 42], [50, 70, 40]];
function miniBurcht(plek) {
  const top = plek.filter(Boolean).sort((a, b) => (BURCHT_PRIJS[b] || 0) - (BURCHT_PRIJS[a] || 0)).slice(0, 4);
  return top.map((id, i) => [id, i]).reverse().map(([id, i]) => {
    const [x, b, w] = MINI[i];
    return `<img src="/img/junior/burcht/${id}.webp" alt="" style="left:${x - w / 2}%;width:${w}%;bottom:${100 - b}%">`;
  }).join('');
}
function eiland(lijst) {
  eilandData = lijst;
  const box = $('jr-eiland');
  const { p, st } = eilandPlekken(kinderen.length);
  box.style.setProperty('--st', st);
  box.innerHTML = kinderen.map((k, i) => {
    const b = lijst.find(x => x.id === k.id) || { plek: [] };
    const [x, y] = p[i] || [0.5, 0.5];
    const leeg = !b.plek.some(Boolean);
    return `<button type="button" class="jr-eb jr-eigen ${leeg ? 'jr-leeg' : ''}" data-eb="${k.id}" style="left:${x * 100}%;top:${y * 100}%;z-index:${Math.round(y * 100)}">
      <span class="jr-eb-burcht">${leeg ? '<img class="jr-eb-tent" src="/img/junior/burcht/14.webp" alt="">' : miniBurcht(b.plek)}</span>
      <span class="jr-eb-naam"><img src="${k.beeld}" alt="">${Junior.esc(k.naam)}</span></button>`;
  }).join('');
}
function eilandGroot(id) {
  const k = kinderen.find(x => x.id === id);
  const b = eilandData.find(x => x.id === id);
  if (!k || !b) return;
  $('jr-eiland-groot-kop').innerHTML = `<img src="${k.beeld}" alt=""><b>${Junior.esc(k.naam)}</b><span>🧱 ${b.stenen}</span>`;
  $('jr-eiland-plein').innerHTML = burchtHtml(b.plek);
  $('jr-eiland-groot').classList.remove('hidden');
  Junior.Stem.zeg([k.eigen ? k.naam : (J().dieren || [])[k.dier - 1] || k.naam]);
}
$('jr-eiland').addEventListener('click', e => {
  const b = e.target.closest('[data-eb]');
  if (b) { eilandTourStop(); eilandGroot(b.dataset.eb); }
});
$('jr-eiland-groot').addEventListener('click', () => { eilandTourStop(); $('jr-eiland-groot').classList.add('hidden'); });
function eilandTourStop() {
  if (eilandTour) clearTimeout(eilandTour);
  eilandTour = null;
}
$('jr-eiland-tour').addEventListener('click', () => {
  eilandTourStop();
  const ids = eilandData.filter(b => b.plek.some(Boolean)).map(b => b.id).filter(id => kinderen.some(k => k.id === id));
  let i = 0;
  const volgende = () => {
    if (i >= ids.length) { $('jr-eiland-groot').classList.add('hidden'); eilandTour = null; return; }
    eilandGroot(ids[i++]);
    eilandTour = setTimeout(volgende, 5000);
  };
  volgende();
});

// ---------- Het ochtendmoment, zoals in de kleuterklas: wie is er (tellen), welke dag, maand en seizoen, het weer,
// wat trekken we aan, hoe voel je je, het kindje van de dag, onze dag (dagritme), wie is er jarig. ----------
const vandaag = () => new Date().toISOString().slice(0, 10);
let ochtendWeer = 0;
let afwezig = new Set();
let gevoel = {}, hulpje = null, kleren = [], gevoelKind = null;
try {
  const o = JSON.parse(localStorage.getItem('jr-ochtend') || '{}');
  if (o.dag === vandaag()) { ochtendWeer = o.weer || 0; afwezig = new Set(o.afwezig || []); gevoel = o.gevoel || {}; hulpje = o.hulpje || null; kleren = o.kleren || []; }
} catch {}
const bewaarOchtend = () => { try { localStorage.setItem('jr-ochtend', JSON.stringify({ dag: vandaag(), weer: ochtendWeer, afwezig: [...afwezig], gevoel, hulpje, kleren })); } catch {} };
const taalCode = () => (J().stemmen || ['nl-BE'])[0];
function dagNaam(d) { return new Intl.DateTimeFormat(taalCode(), { weekday: 'long' }).format(d); }
const OSTAPPEN = ['wie', 'dag', 'maand', 'weer', 'kleren', 'gevoel', 'hulpje', 'onzedag', 'jarig', 'klaar'];
function seizoenVan(d) {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return md >= 321 && md < 621 ? 0 : md >= 621 && md < 923 ? 1 : md >= 923 && md < 1221 ? 2 : 3;
}
const SEIZOEN_E = ['🌷', '☀️', '🍂', '❄️'];
// De leerkracht kiest welke stappen er zijn (⚙️). "Klaar" blijft altijd.
const ostapUit = () => { try { return new Set(JSON.parse(localStorage.getItem('jr-ochtend-uit') || '[]')); } catch { return new Set(); } };
function ochtend(stap) {
  const jarigen = kinderen.filter(k => k.feest);
  const uit = ostapUit();
  const toon = id => id === 'klaar' || (!uit.has(id) && (id !== 'jarig' || jarigen.length));
  for (const b of document.querySelectorAll('.jr-ochtend-stappen [data-ostap]')) b.classList.toggle('hidden', !toon(b.dataset.ostap));
  if (!toon(stap)) stap = OSTAPPEN.slice(OSTAPPEN.indexOf(stap)).find(toon) || 'klaar';
  for (const b of document.querySelectorAll('[data-ostap]')) b.classList.toggle('aan', b.dataset.ostap === stap);
  const vak = $('jr-ochtend-vak');
  const z = J().zin;
  const E = Junior.esc;
  vak.dataset.stap = stap;
  const zeg = d => Junior.Stem.zeg(d.filter(x => x !== undefined && x !== ''));
  const nu = new Date();
  const er = kinderen.filter(k => !afwezig.has(k.id));
  // Onderaan altijd: naar de volgende stap.
  const volgende = () => OSTAPPEN.slice(OSTAPPEN.indexOf(stap) + 1).find(toon);
  const verder = stap === 'klaar' ? '' : `<button type="button" class="jr-ostap-verder jr-eigen" data-ostap="${volgende()}">${E(window.I18n ? I18n.t('Volgende') : 'Volgende')} →</button>`;
  if (stap === 'wie') {
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendWie)}</p>
      <div class="jr-wie-rooster">${kinderen.map(k => `<button type="button" class="jr-wie-kind jr-eigen ${afwezig.has(k.id) ? 'weg' : ''}" data-wie="${k.id}"><img src="${k.beeld}" alt=""><span>${E(k.naam)}</span></button>`).join('')}</div>
      <div class="jr-wie-tel"><span class="jr-wie-getal">${er.length}</span><span class="jr-wie-bolletjes">${er.map(() => '<i></i>').join('')}</span>${afwezig.size ? `<span class="jr-wie-niet"><b>${afwezig.size}</b><span class="jr-wie-bolletjes">${[...afwezig].map(() => '<i class="weg"></i>').join('')}</span></span>` : ''}</div>${verder}`;
    vak.querySelectorAll('[data-wie]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.wie;
      if (afwezig.has(id)) afwezig.delete(id); else afwezig.add(id);
      bewaarOchtend();
      ochtend('wie');
      const n = kinderen.filter(k => !afwezig.has(k.id)).length;
      zeg(afwezig.size ? [n, z.ochtendTel, afwezig.size, z.ochtendNiet] : [n, z.ochtendTel]);
    }));
    zeg([z.ochtendWie]);
  } else if (stap === 'dag') {
    const maandag = new Date(nu); maandag.setDate(nu.getDate() - ((nu.getDay() + 6) % 7));
    const dagen = Array.from({ length: 7 }, (_, i) => { const d = new Date(maandag); d.setDate(maandag.getDate() + i); return d; });
    const datum = new Intl.DateTimeFormat(taalCode(), { day: 'numeric', month: 'long' }).format(nu);
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendDag)} <b>${E(dagNaam(nu))} ${E(datum)}</b></p>
      <div class="jr-dagen">${dagen.map((d, i) => {
        const verschil = i - ((nu.getDay() + 6) % 7);
        const wat = verschil === 0 ? 'vandaag' : verschil === -1 ? 'gisteren' : verschil === 1 ? 'morgen' : '';
        return `<button type="button" class="jr-dag jr-eigen ${i > 4 ? 'weekend' : ''} ${wat}" data-dag="${i}" data-wat="${wat}"><b>${E(dagNaam(d))}</b><span>${d.getDate()}</span></button>`;
      }).join('')}</div>${verder}`;
    vak.querySelectorAll('[data-dag]').forEach(b => b.addEventListener('click', () => {
      const d = dagen[+b.dataset.dag];
      const zin = b.dataset.wat === 'gisteren' ? z.ochtendGisteren : b.dataset.wat === 'morgen' ? z.ochtendMorgen : b.dataset.wat === 'vandaag' ? z.ochtendDag : '';
      b.classList.remove('tik'); void b.offsetWidth; b.classList.add('tik');
      zeg(zin ? [zin, dagNaam(d)] : [dagNaam(d)]);
    }));
    zeg([z.ochtendWelkeDag, z.ochtendDag, dagNaam(nu), datum]);
  } else if (stap === 'maand') {
    const fmt = new Intl.DateTimeFormat(taalCode(), { month: 'long' });
    const maanden = Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2026, i, 15)));
    const m = nu.getMonth(), sz = seizoenVan(nu), sn = z.seizoenen || [];
    // Elke maand kleurt mee met zijn seizoen; zo zien de kinderen de seizoenen rondgaan.
    const mSz = i => seizoenVan(new Date(nu.getFullYear(), i, 15));
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendMaand)} <b>${E(maanden[m])}</b>. ${E(z.ochtendSeizoen)} <b>${E(sn[sz] || '')}</b>.</p>
      <div class="jr-maanden">${maanden.map((n, i) => `<button type="button" class="jr-maand jr-eigen sz-${mSz(i)} ${i === m ? 'nu' : ''}" data-maand="${i}"><b>${E(n)}</b></button>`).join('')}</div>
      <div class="jr-seizoenen">${sn.map((n, i) => `<button type="button" class="jr-seizoen jr-eigen sz-${i} ${i === sz ? 'nu' : ''}" data-sz="${i}"><span class="jr-seizoen-e">${SEIZOEN_E[i]}</span><b>${E(n)}</b></button>`).join('')}</div>${verder}`;
    vak.querySelectorAll('[data-maand]').forEach(b => b.addEventListener('click', () => zeg([maanden[+b.dataset.maand]])));
    vak.querySelectorAll('[data-sz]').forEach(b => b.addEventListener('click', () => zeg([sn[+b.dataset.sz]])));
    zeg([z.ochtendWelkeMaand, z.ochtendMaand, maanden[m], z.ochtendSeizoen, sn[sz]]);
  } else if (stap === 'weer') {
    const zinnen = z.weer || [];
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(ochtendWeer ? zinnen[ochtendWeer - 1] || '' : z.ochtendWelkWeer)}</p>
      <div class="jr-weer">${zinnen.map((_, i) => `<button type="button" class="jr-weer-knop jr-eigen ${ochtendWeer === i + 1 ? 'aan' : ''}" data-weer="${i + 1}"><img src="/img/junior/weer/${i + 1}.webp" alt=""></button>`).join('')}</div>${verder}`;
    vak.querySelectorAll('[data-weer]').forEach(b => b.addEventListener('click', () => {
      ochtendWeer = +b.dataset.weer; kleren = [];
      bewaarOchtend();
      try { sfx.good(); } catch {}
      ochtend('weer');
      zeg([zinnen[ochtendWeer - 1]]);
    }));
    if (!ochtendWeer) zeg([z.ochtendWelkWeer]);
  } else if (stap === 'kleren') {
    const lijst = z.kleren || [];
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(ochtendWeer ? z.ochtendKleren : z.ochtendEerstWeer)}</p>
      <div class="jr-kleren-rij">${ochtendWeer ? `<img class="jr-kleren-weer" src="/img/junior/weer/${ochtendWeer}.webp" alt="">` : ''}<div class="jr-kleren">${lijst.map((k, i) => `<button type="button" class="jr-kleding jr-eigen ${kleren.includes(i) ? (k.weer.includes(ochtendWeer) ? 'goed' : 'mis') : ''}" data-kl="${i}"><span class="jr-kleding-e">${k.e}</span><b>${E(k.w)}</b></button>`).join('')}</div></div>
      ${ochtendWeer ? '' : '<button type="button" class="jr-ostap-verder jr-eigen" data-ostap="weer">🌤️</button>'}${verder}`;
    Junior.prenten(vak);
    vak.querySelectorAll('[data-kl]').forEach(b => b.addEventListener('click', () => {
      if (!ochtendWeer) { zeg([z.ochtendEerstWeer]); return; }
      const i = +b.dataset.kl, k = lijst[i];
      if (kleren.includes(i)) kleren = kleren.filter(x => x !== i); else kleren.push(i);
      bewaarOchtend();
      const goed = k.weer.includes(ochtendWeer);
      if (kleren.includes(i)) { try { goed ? sfx.good() : sfx.bad(); } catch {} zeg([k.w, goed ? z.ochtendKlerenJa : z.ochtendKlerenNee]); }
      ochtend('kleren');
    }));
    zeg([ochtendWeer ? z.ochtendKleren : z.ochtendEerstWeer]);
  } else if (stap === 'gevoel') {
    const G = J().gevoelens || {};
    const soorten = ['blij', 'trots', 'moe', 'verdrietig', 'boos', 'bang'].filter(g => G[g]);
    const zonder = er.filter(k => !gevoel[k.id]);
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendGevoel)}</p>
      <div class="jr-gevoelens">${soorten.map(g => `<div class="jr-gevoel-kolom" data-gv="${g}"><div class="jr-gevoel-kop"><span class="jr-gevoel-e">${G[g].e}</span><b>${E(G[g].w)}</b></div>
        <div class="jr-gevoel-kids">${er.filter(k => gevoel[k.id] === g).map(k => `<button type="button" class="jr-gv-kind jr-eigen ${gevoelKind === k.id ? 'licht' : ''}" data-gk="${k.id}"><img src="${k.beeld}" alt=""></button>`).join('')}</div></div>`).join('')}</div>
      ${zonder.length ? `<div class="jr-gevoel-pool">${zonder.map(k => `<button type="button" class="jr-gv-kind jr-eigen ${gevoelKind === k.id ? 'licht' : ''}" data-gk="${k.id}"><img src="${k.beeld}" alt=""><span>${E(k.naam)}</span></button>`).join('')}</div>` : ''}${verder}`;
    Junior.prenten(vak);
    vak.querySelectorAll('[data-gk]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); gevoelKind = gevoelKind === b.dataset.gk ? null : b.dataset.gk;
      const k = kinderen.find(x => x.id === b.dataset.gk); if (k && gevoelKind) zeg([k.naam]);
      ochtend('gevoel');
    }));
    vak.querySelectorAll('[data-gv]').forEach(c => c.addEventListener('click', () => {
      const g = c.dataset.gv;
      if (!gevoelKind) { zeg([G[g].w]); return; }
      const k = kinderen.find(x => x.id === gevoelKind);
      gevoel[gevoelKind] = g; gevoelKind = null; bewaarOchtend();
      try { sfx.marker ? sfx.marker() : sfx.good(); } catch {}
      zeg([k ? k.naam : '', G[g].w]);
      ochtend('gevoel');
    }));
    if (!Object.keys(gevoel).length) zeg([z.ochtendGevoel]);
  } else if (stap === 'hulpje') {
    const kies = () => {
      // Eerlijk rond: wie het langst geen kindje van de dag was, komt eerst.
      let vorige = [];
      try { vorige = JSON.parse(localStorage.getItem('jr-hulpjes') || '[]'); } catch {}
      const kans = er.filter(k => !vorige.includes(k.id));
      const pool = kans.length ? kans : er;
      if (!pool.length) return;
      const k = pool[Math.floor(Math.random() * pool.length)];
      vorige = (kans.length ? vorige : []).concat(k.id);
      try { localStorage.setItem('jr-hulpjes', JSON.stringify(vorige)); } catch {}
      hulpje = { id: k.id };
      bewaarOchtend();
    };
    if (!hulpje || afwezig.has(hulpje.id) || !kinderen.some(k => k.id === hulpje.id)) kies();
    const k = hulpje && kinderen.find(x => x.id === hulpje.id);
    vak.innerHTML = k ? `<div class="jr-hulpje"><div class="jr-hulpje-kaart"><img src="${k.beeld}" alt=""><b>${E(k.naam)}</b></div>
      <div class="jr-hulpje-info"><p class="jr-ochtend-zin">${E(z.ochtendHulpje)} <b>${E(k.naam)}</b></p>
      <button type="button" class="jr-ostap-verder jr-eigen" id="jr-ander-hulpje">🎲 ${E(window.I18n ? I18n.t('Ander kindje') : 'Ander kindje')}</button></div></div>${verder}` : verder;
    const ander = $('jr-ander-hulpje'); if (ander) ander.addEventListener('click', () => { kies(); ochtend('hulpje'); });
    if (k) zeg([z.ochtendHulpje, k.naam]);
  } else if (stap === 'onzedag') {
    // Het dagritme uit Klastools: dezelfde prenten, zodat de kinderen weten wat er komt.
    let rij = [], eigen = [];
    try { const d = JSON.parse(localStorage.getItem('jr-kt-dag') || 'null'); rij = d && d.rij ? d.rij : [1, 2, 3, 4, 13, 9, 12, 8]; } catch { rij = [1, 2, 3, 4, 13, 9, 12, 8]; }
    try { eigen = JSON.parse(localStorage.getItem('jr-kt-dag-eigen') || '[]'); } catch {}
    const namen = z.dagdelen || [];
    const dd = r => { const e = eigen.find(x => x.id === r); return e ? { src: e.src, naam: e.naam } : typeof r === 'number' ? { src: `/img/junior/tools/dag/${r}.webp`, naam: namen[r - 1] || '' } : null; };
    const items = rij.map(dd).filter(Boolean);
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendOnzeDag)}</p>
      <div class="jr-onzedag">${items.map((d, i) => `<button type="button" class="jr-onzedag-kaart jr-eigen" data-od="${i}"><img src="${d.src}" alt=""><b>${E(d.naam)}</b></button>`).join('')}</div>
      <p class="jr-view-uitleg">${E(window.I18n ? I18n.t('Je dag aanpassen doe je in Klastools, bij Dagritme.') : 'Je dag aanpassen doe je in Klastools, bij Dagritme.')}</p>${verder}`;
    vak.querySelectorAll('[data-od]').forEach(b => b.addEventListener('click', () => zeg([items[+b.dataset.od].naam])));
    zeg([z.ochtendOnzeDag, ...items.map(d => d.naam)]);
  } else if (stap === 'jarig') {
    vak.innerHTML = `<p class="jr-ochtend-zin">${E(z.ochtendJarig)}</p>
      <div class="jr-wie-rooster jr-jarig-rij">${jarigen.map(k => `<div class="jr-wie-kind"><img src="${k.beeld}" alt=""><span>${E(k.naam)}</span></div>`).join('')}</div>
      <button type="button" class="jr-ochtend-knop jr-eigen" data-ga="feest">🎂 ${E(window.I18n ? I18n.t('Naar het verjaardagsfeest') : 'Naar het verjaardagsfeest')}</button>${verder}`;
    zeg([z.ochtendJarig, ...jarigen.map(k => k.naam)]);
  } else {
    vak.innerHTML = `<div class="jr-ochtend-klaar"><img class="jr-ochtend-draak" src="${draakImg()}" alt=""><p class="jr-ochtend-zin">${E(z.ochtendKlaar)}</p></div>`;
    try { confetti(3000); sfx.fanfare(); } catch {}
    zeg([z.ochtendKlaar]);
    // Eén keer per dag krijgt het klasdraakje een beloning voor het ochtendmoment.
    let al = '';
    try { al = localStorage.getItem('jr-ochtend-beloning') || ''; } catch {}
    if (al !== vandaag()) {
      try { localStorage.setItem('jr-ochtend-beloning', vandaag()); } catch {}
      socket.emit('jr-beloning', { n: 3 }, res => res && res.draak && toonDraak(res.draak));
    }
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ostap]');
  if (b) ochtend(b.dataset.ostap);
});
function toonOstapKeuzes() {
  const uit = ostapUit();
  $('jr-ostap-keuzes').innerHTML = [...document.querySelectorAll('.jr-ochtend-stappen [data-ostap]')].filter(b => b.dataset.ostap !== 'klaar')
    .map(b => `<button type="button" class="${uit.has(b.dataset.ostap) ? '' : 'aan'}" data-uit="${b.dataset.ostap}">${Junior.esc(b.textContent.trim())}</button>`).join('');
}
$('jr-ostap-kies').addEventListener('click', () => { toonOstapKeuzes(); $('jr-ostap-venster').showModal(); });
$('jr-ostap-keuzes').addEventListener('click', e => {
  const b = e.target.closest('[data-uit]'); if (!b) return;
  const uit = ostapUit(); uit.has(b.dataset.uit) ? uit.delete(b.dataset.uit) : uit.add(b.dataset.uit);
  try { localStorage.setItem('jr-ochtend-uit', JSON.stringify([...uit])); } catch {}
  toonOstapKeuzes();
});
$('jr-ostap-dicht').addEventListener('click', () => { $('jr-ostap-venster').close(); ochtend($('jr-ochtend-vak').dataset.stap || 'wie'); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ga]');
  if (b) ga(b.dataset.ga);
});
window.addEventListener('popstate', () => toonView(location.hash.slice(1) || 'thuis'));

// ---------- Opvolgen: een rooster met de kinderen en de spelletjes ----------
function opvolg({ kinderen: lijst = [], spellen = [], cellen = {} }) {
  const gespeeld = spellen.filter(s => lijst.some(k => cellen[k.id] && cellen[k.id][s.id]));
  $('jr-opvolg-leeg').classList.toggle('hidden', gespeeld.length > 0);
  $('jr-opvolg').classList.toggle('hidden', !gespeeld.length);
  if (!gespeeld.length) return;
  const kop = `<thead><tr><th></th>${gespeeld.map(s => `<th title="${Junior.esc(s.naam)}"><img src="/img/junior/${s.beeld}.webp" alt=""><span>${Junior.esc(s.naam)}</span></th>`).join('')}</tr></thead>`;
  const rijen = lijst.map(k => {
    const cel = s => {
      const c = cellen[k.id] && cellen[k.id][s.id];
      if (!c || !c.n) return '<td class="jr-opv-niets">·</td>';
      const p = c.g / c.n;
      const [ic, cls] = c.n < 3 ? ['…', 'weinig'] : p >= 0.8 ? ['🌟', 'goed'] : p >= 0.5 ? ['🙂', 'midden'] : ['🌱', 'oefen'];
      return `<td class="${cls}" title="${c.g} van de ${c.n} meteen goed · ${c.t}">${ic}<small>${c.n}</small></td>`;
    };
    return `<tr><th><div class="jr-opvolg-kind"><img src="${k.beeld}" alt=""><span>${Junior.esc(k.naam)}</span></div></th>${gespeeld.map(cel).join('')}</tr>`;
  }).join('');
  $('jr-opvolg').innerHTML = kop + `<tbody>${rijen}</tbody>`;
}

// ---------- Maken: eigen vragen met prentjes (emoji), met de AI of zelf getypt ----------
// De verkenner: mapjes voor de eigen reeksen. inMap = de map die open staat (null = alle mappen).
let mappen = [];
let inMap = null;
function zetMappen(m) {
  mappen = Array.isArray(m) ? m : [];
  if (inMap && !mappen.includes(inMap)) inMap = null;
}
function zetSets(lijst) {
  sets = Array.isArray(lijst) ? lijst : [];
  for (const s of sets) if (s.map && !mappen.includes(s.map)) mappen.push(s.map);
  if (window.JR) JR.sets = sets;
  $('jr-tel-maken').textContent = sets.length ? `${sets.length} ${sets.length === 1 ? 'reeks' : 'reeksen'}` : 'Met of zonder AI';
  tegels();
  toonSets();
}
const mapActie = (arg, klaar) => socket.emit('jr-map', arg, res => {
  if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
  zetMappen(res.mappen); zetSets(res.sets);
  if (klaar) klaar();
});
function verkenner() {
  const box = $('jr-verkenner');
  const tel = m => sets.filter(s => s.map === m).length;
  if (inMap) {
    box.innerHTML = `<div class="jr-vk-pad"><button type="button" class="secondary jr-eigen jr-vk-terug" data-drop="">⬅ Alle reeksen</button><b>📂 ${Junior.esc(inMap)}</b>
      <span class="jr-vk-acties"><button type="button" class="secondary jr-eigen" id="jr-vk-hernoem" title="Andere naam">✏️</button><button type="button" class="secondary jr-eigen" id="jr-vk-wis" title="Map wissen">🗑️</button></span></div>`;
    box.querySelector('.jr-vk-terug').addEventListener('click', () => { inMap = null; toonSets(); });
    $('jr-vk-hernoem').addEventListener('click', () => mapVenster({ hernoem: inMap }));
    $('jr-vk-wis').addEventListener('click', async () => {
      if (!(await Ui.vraag(`De map "${inMap}" wissen? De reeksen erin blijven bewaard.`))) return;
      const m = inMap; inMap = null;
      mapActie({ actie: 'wis', naam: m });
    });
  } else {
    box.innerHTML = `<div class="jr-vk-mappen">${mappen.map(m => `<button type="button" class="jr-eigen jr-vk-map" data-map="${Junior.esc(m)}" data-drop="${Junior.esc(m)}"><span class="jr-vk-ic">📁</span><b>${Junior.esc(m)}</b><small>${tel(m)}</small></button>`).join('')}
      <button type="button" class="jr-eigen jr-vk-map jr-vk-nieuw" id="jr-vk-nieuw"><span class="jr-vk-ic">➕</span><b>Nieuwe map</b></button></div>`;
    box.querySelectorAll('[data-map]').forEach(b => b.addEventListener('click', () => { inMap = b.dataset.map; toonSets(); }));
    $('jr-vk-nieuw').addEventListener('click', () => mapVenster({}));
  }
  // Slepen: een reeks op een map loslaten (of op "Alle reeksen" om ze uit de map te halen).
  box.querySelectorAll('[data-drop]').forEach(b => {
    b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('drop'); });
    b.addEventListener('dragleave', () => b.classList.remove('drop'));
    b.addEventListener('drop', e => {
      e.preventDefault(); b.classList.remove('drop');
      const id = e.dataTransfer.getData('text/jr-set');
      if (id) mapActie({ actie: 'zet', id, naam: b.dataset.drop });
    });
  });
}
// Het venster: een reeks in een map steken (zet), een nieuwe map maken, of een map een andere naam geven.
let mapDoel = {};
function mapVenster(doel) {
  mapDoel = doel;
  const set = doel.set;
  $('jr-map-titel').textContent = set ? `📁 ${set.naam}: in welke map?` : doel.hernoem ? '✏️ Andere naam voor de map' : '📁 Nieuwe map';
  const lijst = $('jr-map-lijst');
  lijst.innerHTML = set ? [['', '📚 Geen map'], ...mappen.map(m => [m, `📁 ${m}`])].map(([m, t]) => `<button type="button" class="secondary jr-eigen ${(set.map || '') === m ? 'aan' : ''}" data-naar="${Junior.esc(m)}">${Junior.esc(t)}</button>`).join('') : '';
  lijst.querySelectorAll('[data-naar]').forEach(b => b.addEventListener('click', () => mapActie({ actie: 'zet', id: set.id, naam: b.dataset.naar }, () => $('jr-map-venster').close())));
  $('jr-map-naam').value = doel.hernoem || '';
  $('jr-map-ok').textContent = doel.hernoem ? 'Bewaar' : set ? 'Maak de map en steek de reeks erin' : 'Maak de map';
  $('jr-map-venster').showModal();
  if (!set) $('jr-map-naam').focus();
}
function mapOk() {
  const naam = $('jr-map-naam').value.trim();
  if (!naam) return $('jr-map-naam').focus();
  const dicht = () => $('jr-map-venster').close();
  if (mapDoel.hernoem) return mapActie({ actie: 'hernoem', naam: mapDoel.hernoem, nieuw: naam }, () => { inMap = naam; dicht(); toonSets(); });
  if (mapDoel.set) return mapActie({ actie: 'zet', id: mapDoel.set.id, naam }, dicht);
  mapActie({ actie: 'nieuw', naam }, () => { inMap = naam; dicht(); toonSets(); });
}
$('jr-map-ok').addEventListener('click', mapOk);
$('jr-map-naam').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mapOk(); } });
$('jr-map-dicht').addEventListener('click', () => $('jr-map-venster').close());
socket.on('jr-mappen', res => { if (res) { zetMappen(res.mappen); zetSets(res.sets); } });
function toonSets() {
  verkenner();
  const box = $('jr-sets');
  const hier = sets.filter(s => (inMap ? s.map === inMap : !s.map));
  $('jr-sets-leeg').classList.toggle('hidden', hier.length > 0);
  $('jr-sets-leeg').textContent = inMap ? 'Nog niets in deze map. Sleep een reeks hierheen of tik bij een reeks op 📁.' : sets.length ? 'Alle reeksen zitten in een map.' : 'Nog geen reeksen.';
  box.innerHTML = '';
  for (const set of hier) {
    const d = document.createElement('div');
    d.className = 'jr-set';
    d.draggable = true;
    d.addEventListener('dragstart', e => { e.dataTransfer.setData('text/jr-set', set.id); d.classList.add('sleep'); });
    d.addEventListener('dragend', () => d.classList.remove('sleep'));
    const voorbeeld = set.vragen.slice(0, 1).flatMap(v => v.opties.map(o => o.e)).join(' ');
    d.innerHTML = `<div><b>${Junior.esc(set.naam)}</b><span>${set.vragen.length} vragen · ${Junior.esc(voorbeeld)}</span></div>`
      + '<span class="jr-set-knoppen"><button type="button" class="gold jr-set-speel">▶ Spelen</button><button type="button" class="secondary jr-set-kijk" title="Bekijken zoals op de tablet">👁</button><button type="button" class="secondary jr-set-map" title="In een map steken">📁</button><button type="button" class="secondary jr-set-bw">✏️</button><button type="button" class="secondary jr-set-wis">🗑️</button></span>';
    d.querySelector('.jr-set-speel').addEventListener('click', () => {
      const s = spelVan('eigen');
      kies(s);
      gekozen.niveau = sets.indexOf(set);
      for (const [i, x] of [...$('jr-kv-niveaus').children].entries()) x.classList.toggle('aan', i === gekozen.niveau);
    });
    d.querySelector('.jr-set-bw').addEventListener('click', () => bewerk(set));
    d.querySelector('.jr-set-kijk').addEventListener('click', () => voorbeeldSet(set));
    d.querySelector('.jr-set-map').addEventListener('click', () => mapVenster({ set }));
    d.querySelector('.jr-set-wis').addEventListener('click', async () => {
      if (!(await Ui.vraag(`De reeks "${set.naam}" wissen?`))) return;
      socket.emit('jr-set-wis', { id: set.id }, res => (res && res.error ? Ui.melding(res.error) : zetSets(res.sets)));
    });
    box.appendChild(d);
  }
}
// 👁 Een reeks bekijken zoals een kind ze op de tablet ziet: vraag per vraag, met voorlezen. Tikken mag (het juiste antwoord licht op).
let kijk = null;
function voorbeeldSet(set, i = 0) {
  const v = $('jr-kijk-venster');
  if (!set.vragen.length) return;
  i = (i + set.vragen.length) % set.vragen.length;
  $('jr-kijk-titel').textContent = set.naam;
  $('jr-kijk-teller').textContent = `${i + 1} / ${set.vragen.length}`;
  if (kijk) try { kijk.stop(); } catch {}
  const vak = $('jr-kijk-vak');
  kijk = Junior.speel(vak, Junior.eigenVraag(set.vragen[i]), { klaar() {} });
  $('jr-kijk-vorige').onclick = () => voorbeeldSet(set, i - 1);
  $('jr-kijk-volgende').onclick = () => voorbeeldSet(set, i + 1);
  $('jr-kijk-bewerk').onclick = () => { v.close(); if ($('jr-kies-venster').open) { $('jr-kies-venster').close(); ga('maken'); } bewerk(set); };
  if (!v.open) v.showModal();
}
$('jr-kijk-dicht').addEventListener('click', () => $('jr-kijk-venster').close());
$('jr-kijk-venster').addEventListener('close', () => { if (kijk) try { kijk.stop(); } catch {} kijk = null; try { Junior.Stem.stop(); } catch {} });
let bezig = null; // de reeks die nu bewerkt wordt
function bewerk(set) {
  bezig = JSON.parse(JSON.stringify(set));
  // Een nieuwe reeks komt in de map die openstaat.
  if (!bezig.id && inMap && !bezig.map) bezig.map = inMap;
  if (!bezig.vragen.length) bezig.vragen.push(legeVraag());
  $('jr-bw-naam').value = bezig.naam || '';
  vragenLijst();
  $('jr-bewerk').classList.remove('hidden');
  $('jr-bewerk').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const legeVraag = () => ({ vraag: '', opties: [{ e: '', w: '' }, { e: '', w: '' }, { e: '', w: '' }], juist: 0 });
function vragenLijst() {
  const box = $('jr-bw-vragen');
  box.innerHTML = '';
  bezig.vragen.forEach((v, vi) => {
    const d = document.createElement('div');
    d.className = 'jr-bw-vraag';
    d.innerHTML = `<div class="jr-bw-rij"><b>${vi + 1}</b><input class="jr-bw-tekst" maxlength="160" placeholder="De vraag, zoals je ze zegt">${v.f ? `<img class="jr-bw-foto jr-bw-vfoto" src="/junior/foto/${v.f}" alt="" title="${Junior.esc(v.fb || '')}">` : ''}<button type="button" class="secondary jr-bw-vf" title="${v.f ? 'Prent bij de vraag weg' : 'Een prent bij de vraag'}">${v.f ? '🖼️✕' : '🖼️'}</button><button type="button" class="secondary jr-bw-zeg" title="Voorlezen">🔊</button><button type="button" class="secondary jr-bw-mic ${v.s ? 'heeft' : ''}" title="${v.s ? 'Je eigen stem wissen' : 'Zelf inspreken'}">${v.s ? '🎤✕' : '🎤'}</button><button type="button" class="secondary jr-bw-weg" title="Vraag wissen">🗑️</button></div>`
      + `<div class="jr-bw-opties">${v.opties.map((o, oi) => `<label class="jr-bw-optie ${oi === v.juist ? 'juist' : ''}"><input type="radio" name="jr-juist-${vi}" ${oi === v.juist ? 'checked' : ''} title="Dit is het juiste antwoord">${o.f ? `<img class="jr-bw-foto" src="/junior/foto/${o.f}" alt="" title="${Junior.esc(o.fb || '')}">` : '<input class="jr-bw-e" maxlength="16" placeholder="🙂">'}<input class="jr-bw-w" maxlength="30" placeholder="woord"><button type="button" class="secondary jr-bw-fk" title="${o.f ? 'Foto weg' : 'Echte foto zoeken'}">${o.f ? '✕' : '📷'}</button></label>`).join('')}</div>`;
    const tekst = d.querySelector('.jr-bw-tekst');
    tekst.value = v.vraag;
    tekst.addEventListener('input', () => { v.vraag = tekst.value; });
    d.querySelector('.jr-bw-zeg').addEventListener('click', () => Junior.Stem.zeg([v.s ? { url: `/junior/stem/${v.s}` } : v.vraag]));
    d.querySelector('.jr-bw-mic').addEventListener('click', e => (v.s ? (delete v.s, vragenLijst()) : neemOp(v, e.currentTarget)));
    d.querySelector('.jr-bw-weg').addEventListener('click', () => { bezig.vragen.splice(vi, 1); vragenLijst(); });
    // Een prent bij de vraag zelf (bijvoorbeeld een foto met kamelen om te tellen): zelfde foto's zoeken als bij de antwoorden.
    d.querySelector('.jr-bw-vf').addEventListener('click', () => { if (v.f) { delete v.f; delete v.fb; vragenLijst(); } else fotoKies(v, true); });
    d.querySelectorAll('.jr-bw-optie').forEach((lab, oi) => {
      const o = v.opties[oi];
      const r = lab.querySelector('input[type=radio]'), e = lab.querySelector('.jr-bw-e'), w = lab.querySelector('.jr-bw-w');
      if (e) { e.value = o.e; e.addEventListener('input', () => { o.e = e.value; }); }
      w.value = o.w;
      lab.querySelector('.jr-bw-fk').addEventListener('click', ev => {
        ev.preventDefault();
        if (o.f) { delete o.f; delete o.fb; vragenLijst(); } else fotoKies(o);
      });
      w.addEventListener('input', () => { o.w = w.value; });
      r.addEventListener('change', () => { v.juist = oi; d.querySelectorAll('.jr-bw-optie').forEach((x, i) => x.classList.toggle('juist', i === oi)); });
    });
    box.appendChild(d);
  });
}
// Zelf inspreken: tik op 🎤, spreek de vraag in, tik opnieuw (of na 10 seconden stopt het vanzelf).
let opname = null;
async function neemOp(v, knop) {
  if (opname) { opname.stop(); return; }
  if (!window.MediaRecorder || !navigator.mediaDevices) return Ui.melding('Opnemen lukt niet in deze browser.');
  let stroom;
  try { stroom = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return Ui.melding('De micro werkt niet. Geef de browser toestemming voor de micro.'); }
  const soort = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stroom, soort ? { mimeType: soort } : undefined);
  const delen = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) delen.push(e.data); };
  const tijd = setTimeout(() => rec.state === 'recording' && rec.stop(), 10000);
  rec.onstop = async () => {
    clearTimeout(tijd);
    stroom.getTracks().forEach(t => t.stop());
    opname = null;
    knop.classList.remove('neemt');
    const blob = new Blob(delen, { type: rec.mimeType || soort || 'audio/webm' });
    const data = await blob.arrayBuffer();
    socket.emit('jr-stem-neem', { data, soort: blob.type }, res => {
      if (!res || res.error) return Ui.melding((res && res.error) || 'Opnemen lukte niet. Probeer opnieuw.');
      v.s = res.s;
      vragenLijst();
      Junior.Stem.zeg([{ url: `/junior/stem/${res.s}` }]);
    });
  };
  opname = rec;
  rec.start();
  knop.classList.add('neemt');
  knop.textContent = '⏹';
}
// Echte foto's van Wikimedia Commons (vrije licenties): zoeken met het woord, kiezen, en de pc bewaart de foto voor de klas.
function fotoKies(o, isVraag) {
  const v = $('jr-foto-venster');
  $('jr-foto-woord').value = isVraag ? '' : o.w || '';
  v._isVraag = !!isVraag;
  $('jr-foto-lijst').innerHTML = '';
  $('jr-foto-tip').textContent = '';
  v.showModal();
  v.dataset.bezig = '';
  v._optie = o;
  if (o.w) fotoZoek();
  else $('jr-foto-woord').focus();
}
function fotoZoek() {
  const lijst = $('jr-foto-lijst');
  lijst.innerHTML = '';
  $('jr-foto-tip').textContent = 'Even zoeken...';
  socket.emit('jr-foto-zoek', { woord: $('jr-foto-woord').value }, res => {
    if (!res || res.error) { $('jr-foto-tip').textContent = (res && res.error) || 'Zoeken lukte niet.'; return; }
    $('jr-foto-tip').textContent = res.fotos.length ? 'Tik op een foto.' : 'Niets gevonden. Probeer een ander woord, of in het Engels.';
    for (const f of res.fotos) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jr-foto-keuze jr-eigen';
      b.title = f.bron;
      b.innerHTML = `<img src="${Junior.esc(f.thumb)}" alt="" loading="lazy">`;
      b.addEventListener('click', () => {
        $('jr-foto-tip').textContent = 'De foto wordt bewaard...';
        const gelukt = r => {
          const o = $('jr-foto-venster')._optie;
          o.f = r.f;
          o.fb = [f.bron, 'Wikimedia Commons'].filter(Boolean).join(', ');
          if (!o.w && !$('jr-foto-venster')._isVraag) o.w = $('jr-foto-woord').value.trim().slice(0, 30);
          $('jr-foto-venster').close();
          vragenLijst();
        };
        // Eerst haalt de pc de foto op. Weigert Wikimedia dat, dan stuurt deze browser de foto zelf door (die toont ze al).
        const zelf = fout => fetch(f.thumb, { mode: 'cors' }).then(x => (x.ok ? x.blob() : Promise.reject())).then(async blob => {
          socket.emit('jr-foto-bewaar', { data: await blob.arrayBuffer(), soort: blob.type }, r => {
            if (!r || r.error) { $('jr-foto-tip').textContent = (r && r.error) || fout; return; }
            gelukt(r);
          });
        }).catch(() => { $('jr-foto-tip').textContent = fout; });
        socket.emit('jr-foto-neem', { thumb: f.thumb }, r => {
          if (!r || r.error) return zelf((r && r.error) || 'Die foto lukt niet.');
          gelukt(r);
        });
      });
      lijst.appendChild(b);
    }
  });
}
$('jr-foto-zoek').addEventListener('click', fotoZoek);
$('jr-foto-woord').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fotoZoek(); } });
$('jr-foto-dicht').addEventListener('click', () => $('jr-foto-venster').close());
$('jr-bw-erbij').addEventListener('click', () => { bezig.vragen.push(legeVraag()); vragenLijst(); });
$('jr-bw-annuleer').addEventListener('click', () => { bezig = null; $('jr-bewerk').classList.add('hidden'); });
$('jr-bw-bewaar').addEventListener('click', () => {
  bezig.naam = $('jr-bw-naam').value;
  socket.emit('jr-set-bewaar', bezig, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    bezig = null;
    $('jr-bewerk').classList.add('hidden');
    zetSets(res.sets);
  });
});
const maakArg = () => ({ onderwerp: $('jr-maak-onderwerp').value, aantal: Number($('jr-maak-aantal').value), klas: $('jr-maak-klas').value });
// De gekozen klas onthouden: de meeste leerkrachten maken altijd vragen voor dezelfde klas.
try { const k = localStorage.getItem('jr-maak-klas'); if (k && $('jr-maak-klas').querySelector(`option[value="${k}"]`)) $('jr-maak-klas').value = k; } catch {}
$('jr-maak-klas').addEventListener('change', () => { try { localStorage.setItem('jr-maak-klas', $('jr-maak-klas').value); } catch {} });
$('jr-maak-leeg').addEventListener('click', () => bewerk({ naam: $('jr-maak-onderwerp').value.slice(0, 40), vragen: [] }));
$('jr-maak-ai').addEventListener('click', () => {
  const knop = $('jr-maak-ai');
  knop.disabled = true;
  $('jr-maak-ai-tip').textContent = 'De AI maakt je vragen. Even geduld...';
  socket.emit('jr-set-ai', maakArg(), res => {
    knop.disabled = false;
    $('jr-maak-ai-tip').textContent = '';
    if (!res || res.error) {
      Ui.melding((res && res.error) || 'Dat lukte niet.');
      return;
    }
    bewerk(res.set);
  });
});
$('jr-maak-kopieer').addEventListener('click', () => {
  socket.emit('jr-set-prompt', maakArg(), res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    Ui.kopieer(res.prompt);
    $('jr-maak-plak-blok').classList.remove('hidden');
    $('jr-maak-ai-tip').textContent = 'De prompt staat klaar. Plak hem in een chatbot (Gemini, ChatGPT of Claude) en plak het antwoord hieronder: het wordt meteen ingelezen.';
  });
});
function leesPlak(stil) {
  const tekst = $('jr-maak-plak').value;
  if (!tekst.trim()) return;
  socket.emit('jr-set-lees', tekst, res => {
    if (!res || res.error) { if (!stil) Ui.melding((res && res.error) || 'Dat lukte niet.'); return; }
    $('jr-maak-plak').value = '';
    $('jr-maak-plak-blok').classList.add('hidden');
    bewerk(res.set);
  });
}
$('jr-maak-lees').addEventListener('click', () => leesPlak(false));
// Plakken is genoeg: het antwoord van de chatbot wordt meteen ingelezen (lukt het niet, dan blijft de knop Inlezen).
$('jr-maak-plak').addEventListener('paste', () => setTimeout(() => leesPlak(true), 50));
socket.on('jr-sets', lijst => zetSets(lijst));
// Kant-en-klare themareeksen (herfst, Sinterklaas, kerst, carnaval) uit de inhoud van de taal.
function themaSets() {
  const box = $('jr-thema-sets');
  const ts = J().themaSets || {};
  box.innerHTML = Object.entries(ts).map(([id, t]) => `<button type="button" class="secondary jr-eigen" data-thema-set="${id}">${Junior.esc(t.naam)}</button>`).join('');
  box.querySelectorAll('[data-thema-set]').forEach(b => b.addEventListener('click', () => {
    const t = ts[b.dataset.themaSet];
    socket.emit('jr-set-bewaar', { id: `thema-${b.dataset.themaSet}`, naam: t.naam, vragen: t.vragen }, res => {
      if (res && res.error) return Ui.melding(res.error);
      if (res && res.sets) zetSets(res.sets);
      Ui.melding(`${t.naam}: ${t.vragen.length} vragen staan nu bij je reeksen.`);
    });
  }));
}
themaSets();

socket.on('connect', () => {
  socket.emit('jr-sets', null, res => {
    if (!res || res.error) return;
    zetMappen(res.mappen);
    zetSets(res.sets);
    $('jr-maak-ai-tip').textContent = res.ai ? '' : 'Nog geen AI-sleutel? Kopieer de prompt en plak het antwoord van een chatbot hieronder. Een sleutel zet je bij ⚙️ Instellingen.';
  });
  socket.emit('jr-lk-get', null, res => {
    if (!res) return;
    stand = res.stand;
    Junior.rustig = stand.rustig === true;
    try { JrThema.zet(stand.thema); } catch {}
    Junior.munt = stand.munt || Junior.munt;
    Junior.schrift = stand.schrift || Junior.schrift;
    kinderen = res.kinderen || [];
    toonDraak(res.stand.draak);
    klas();
    volg(res.overzicht || []);
    toon();
    // Wie op het ochtendmoment herlaadt: de klas is er nu pas, dus de huidige stap opnieuw tekenen.
    const ov = $('jr-ochtend-vak');
    if (ov && ov.dataset.stap && !$('jr-v-ochtend').classList.contains('hidden')) ochtend(ov.dataset.stap);
    if (window.JrWerkblad && !$('jr-v-werkbladen').classList.contains('hidden')) JrWerkblad.toon();
  });
});
socket.on('jr-stand', s => {
  try { JrThema.zet(s && s.thema); } catch {}
  if (s && s.munt) Junior.munt = s.munt;
  if (s && s.schrift) Junior.schrift = s.schrift;
  const oud = stand.seed;
  stand = s;
  Junior.rustig = s.rustig === true;
  muziek();
  toonDraak(s.draak);
  if (oud !== s.seed || !s.actief) toon();
});
socket.on('jr-overzicht', lijst => volg(lijst));
// De lijst voor iedereen is kort (geen verjaardagen of stickers): wat de leerkracht al wist, blijft.
socket.on('jr-kinderen', res => { const oud = new Map(kinderen.map(k => [k.id, k])); kinderen = (res.kinderen || []).map(k => ({ ...(oud.get(k.id) || {}), ...k })); klas(); });
socket.on('jr-draak', d => toonDraak(d));
socket.on('jr-kring', k => stand.spel === 'kring' && kringToon(k));
socket.on('addresses', list => {
  if (!list || !list.length) return;
  // De QR-code van Junior: rechtstreeks naar /junior (anders komen de kinderen op het gewone LANcelot).
  for (const id of ['jr-qr', 'jr-qr-groot']) $(id).innerHTML = list[0].jrQr || list[0].qr;
  for (const id of ['jr-url', 'jr-qr-url']) $(id).textContent = `${list[0].url}/junior`;
});
$('jr-qr-knop').addEventListener('click', () => $('jr-qr-venster').showModal());
$('jr-qr-dicht').addEventListener('click', () => $('jr-qr-venster').close());
tegels();
toonView(location.hash.slice(1) || 'thuis');
