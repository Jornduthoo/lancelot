// LANcelot Junior voor de leerkracht: een spel kiezen, kiezen hoe de klas speelt, en volgen wie er al geweest is.
// Op het bord speelt de klas in 4 kleurteams. Met tablets ziet de leerkracht live wie speelt en wie al geweest is.
// De knop LANcelot in de titelbalk brengt je terug naar LANcelot: dezelfde klas, dezelfde gegevens.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const J = () => window.JR || { zin: {}, spellen: [] };
const GROEPEN = [['getallen', '🔢 Getallen en rekenen'], ['meten', '📏 Meten en tijd'], ['meetkunde', '🔷 Vormen en ruimte'], ['taal', '🔤 Taal en klanken'], ['wereld', '🌍 De wereld'], ['samen', '💃 Samen en gevoel'], ['eigen', '✨ Mijn eigen vragen']];
const VIEWS = ['thuis', 'spelen', 'klas', 'opvolgen', 'maken', 'draakje', 'ochtend', 'eiland', 'rijk', 'klastools', 'feest'];
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
  const niv = $('jr-kv-niveaus');
  niv.innerHTML = '';
  (s.id === 'eigen' ? sets.map(x => x.naam) : s.niveaus).forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = n;
    b.className = i === 0 ? 'aan' : '';
    b.addEventListener('click', () => {
      gekozen.niveau = i;
      for (const x of niv.children) x.classList.toggle('aan', x === b);
    });
    niv.appendChild(b);
  });
  $('jr-kv-manier-blok').classList.toggle('hidden', !!s.bordAlleen);
  zetManier();
  $('jr-kies-venster').showModal();
}
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
}
function bewaarInstelling(nieuw) {
  socket.emit('jr-instellingen', nieuw, res => {
    if (res && res.error) return Ui.melding(res.error);
    if (res) toonInstellingen(res.instellingen);
  });
}
for (const b of $('jr-inst-ronde').children) b.addEventListener('click', () => bewaarInstelling({ perRonde: Number(b.dataset.w) }));
for (const b of $('jr-inst-voorlezen').children) b.addEventListener('click', () => bewaarInstelling({ voorlezen: b.dataset.w === '1' }));
for (const b of $('jr-inst-groei').children) b.addEventListener('click', () => bewaarInstelling({ groei: b.dataset.w === '1' }));
$('jr-inst-knop').addEventListener('click', () => {
  socket.emit('jr-instellingen', null, res => {
    if (res && res.error) return Ui.melding(res.error);
    toonInstellingen(res.instellingen);
    $('jr-inst-venster').showModal();
  });
});
$('jr-inst-dicht').addEventListener('click', () => $('jr-inst-venster').close());
const stemKnop = () => { $('jr-stem-knop').textContent = Junior.Stem.uit ? '🔇' : '🔊'; };
$('jr-stem-knop').addEventListener('click', () => { Junior.Stem.uit = !Junior.Stem.uit; stemKnop(); });
stemKnop();
// Zachte muziek op het bord: tijdens een spel, en in het hol, op het klaseiland en in het Toverdorp.
const muziekKnop = () => { $('jr-muziek-knop').classList.toggle('uit', !JrMuziek.aan); $('jr-muziek-knop').style.opacity = JrMuziek.aan ? '' : '.45'; };
function muziek() {
  const v = location.hash.slice(1) || 'thuis';
  if (stand.actief && stand.spel !== 'dans') JrMuziek.speel(stand.spel);
  else if (!stand.actief && ['draakje', 'eiland', 'rijk'].includes(v)) JrMuziek.speel(v);
  else JrMuziek.stop();
}
$('jr-muziek-knop').addEventListener('click', () => { JrMuziek.aan = !JrMuziek.aan; muziekKnop(); muziek(); });
muziekKnop();

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
    d.innerHTML = `<button type="button" class="jr-klas-beeld" title="${k.eigen ? 'Eigen symbool' : 'Tik om een ander dier te geven'}"><img src="${k.beeld}" alt=""></button><span>${Junior.esc(k.naam)}</span><em>${k.stickers ? `🏅 ${k.stickers}` : ''}</em>`
      + `<span class="jr-klas-knoppen"><button type="button" class="jr-sym" title="Eigen symbooltje opladen (zoals aan de kapstok)">📷</button><button type="button" class="jr-jarig-knop ${k.jarig ? 'aan' : ''}" title="Verjaardag">🎂${k.jarig ? `<small data-geen-vertaling>${+k.jarig.slice(3)}/${+k.jarig.slice(0, 2)}</small>` : ''}</button>${k.eigen ? '<button type="button" class="jr-sym-weg" title="Terug naar een dier">✕</button>' : ''}</span>`;
    d.querySelector('.jr-klas-beeld').addEventListener('click', () => {
      if (k.eigen) return;
      socket.emit('jr-dier', { id: k.id }, res => { if (res && res.kinderen) { kinderen = res.kinderen; klas(); } });
    });
    d.querySelector('.jr-sym').addEventListener('click', () => kiesSymbool(k));
    d.querySelector('.jr-jarig-knop').addEventListener('click', () => kiesJarig(k));
    const weg = d.querySelector('.jr-sym-weg');
    if (weg) weg.addEventListener('click', () => stuurSymbool(k, ''));
    box.appendChild(d);
  }
}
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
  blad.classList.add('diploma');
  blad.innerHTML = wie.map(k => `<div class="jr-diploma"><div class="jr-diploma-in">
    <h1>${'Diploma'}</h1>
    <img class="jr-diploma-dier" src="${k.beeld}" alt="">
    <b class="jr-diploma-naam">${Junior.esc(k.naam)}</b>
    <p>${`heeft al ${k.stickers} stickers verzameld!`}</p>
    <div class="jr-diploma-onder"><img src="${draakImg()}" alt=""><span>${Junior.esc(datum)}</span></div>
  </div></div>`).join('');
  const imgs = [...blad.querySelectorAll('img')];
  Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; })))).then(() => print());
});
$('jr-print').addEventListener('click', () => {
  const blad = $('jr-printblad');
  blad.classList.remove('diploma');
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
function teams(nieuw = -1) {
  $('jr-teams').innerHTML = TEAMKLEUR.map((kl, i) => {
    const n = stand.teams ? stand.teams[i] : 0;
    const sterren = Array.from({ length: Math.min(10, n) }, (_, j) => `<img class="${i === nieuw && j === Math.min(10, n) - 1 ? 'nieuw' : ''}" src="/img/junior/race/ster.webp" alt="">`).join('');
    return `<div class="jr-team jr-team-${kl} ${bord && bord.team === i ? 'aan' : ''}">
      <img class="jr-team-draak" src="/img/junior/race/draak${i + 1}.webp" alt="">
      <div class="jr-team-info"><b>${(J().zin.teams || [])[i] || ''}</b><span class="jr-team-sterren">${sterren}${n > 10 ? `<em>${n}</em>` : ''}</span></div></div>`;
  }).join('');
}
async function bordVraag() {
  if (!bord) return;
  const mijn = bord;
  teams();
  await Junior.Stem.zeg([(J().zin.teams || [])[bord.team], J().zin.teamBeurt]);
  if (mijn !== bord) return;
  const v = Junior.vraag(stand.spel, stand.niveau, bord.r);
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
        bord.team = (bord.team + 1) % 4;
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
    bord = { seed: stand.seed, r: Junior.toeval(stand.seed), team: 0, huidig: null };
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
function toonView(v) {
  for (const x of VIEWS) $(`jr-v-${x}`).classList.toggle('hidden', x !== v);
  window.scrollTo(0, 0);
  if (v === 'opvolgen') socket.emit('jr-voortgang', null, res => res && !res.error && opvolg(res));
  if (v === 'maken') toonSets();
  if (v === 'ochtend') ochtend('dag');
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

// ---------- Het ochtendmoment: welke dag is het, wat voor weer, wie is er? ----------
const vandaag = () => new Date().toISOString().slice(0, 10);
let ochtendWeer = 0;
let afwezig = new Set();
try {
  const o = JSON.parse(localStorage.getItem('jr-ochtend') || '{}');
  if (o.dag === vandaag()) { ochtendWeer = o.weer || 0; afwezig = new Set(o.afwezig || []); }
} catch {}
const bewaarOchtend = () => { try { localStorage.setItem('jr-ochtend', JSON.stringify({ dag: vandaag(), weer: ochtendWeer, afwezig: [...afwezig] })); } catch {} };
const taalCode = () => (J().stemmen || ['nl-BE'])[0];
function dagNaam(d) { return new Intl.DateTimeFormat(taalCode(), { weekday: 'long' }).format(d); }
function ochtend(stap) {
  for (const b of document.querySelectorAll('[data-ostap]')) b.classList.toggle('aan', b.dataset.ostap === stap);
  const vak = $('jr-ochtend-vak');
  const z = J().zin;
  vak.dataset.stap = stap;
  if (stap === 'dag') {
    const nu = new Date();
    const maandag = new Date(nu); maandag.setDate(nu.getDate() - ((nu.getDay() + 6) % 7));
    const dagen = Array.from({ length: 7 }, (_, i) => { const d = new Date(maandag); d.setDate(maandag.getDate() + i); return d; });
    const datum = new Intl.DateTimeFormat(taalCode(), { day: 'numeric', month: 'long' }).format(nu);
    vak.innerHTML = `<p class="jr-ochtend-zin">${Junior.esc(z.ochtendDag)} <b>${Junior.esc(dagNaam(nu))} ${Junior.esc(datum)}</b></p>
      <div class="jr-dagen">${dagen.map((d, i) => {
        const verschil = i - ((nu.getDay() + 6) % 7);
        const wat = verschil === 0 ? 'vandaag' : verschil === -1 ? 'gisteren' : verschil === 1 ? 'morgen' : '';
        return `<button type="button" class="jr-dag jr-eigen jr-dag-${i} ${wat}" data-dag="${i}" data-wat="${wat}"><b>${Junior.esc(dagNaam(d))}</b><span>${d.getDate()}</span></button>`;
      }).join('')}</div>`;
    vak.querySelectorAll('[data-dag]').forEach(b => b.addEventListener('click', () => {
      const d = dagen[+b.dataset.dag];
      const zin = b.dataset.wat === 'gisteren' ? z.ochtendGisteren : b.dataset.wat === 'morgen' ? z.ochtendMorgen : b.dataset.wat === 'vandaag' ? z.ochtendDag : '';
      b.classList.remove('tik'); void b.offsetWidth; b.classList.add('tik');
      Junior.Stem.zeg(zin ? [zin, dagNaam(d)] : [dagNaam(d)]);
    }));
    Junior.Stem.zeg([z.ochtendWelkeDag, z.ochtendDag, dagNaam(nu), datum]);
  } else if (stap === 'weer') {
    const zinnen = z.weer || [];
    vak.innerHTML = `<p class="jr-ochtend-zin">${Junior.esc(ochtendWeer ? zinnen[ochtendWeer - 1] || '' : z.ochtendWelkWeer)}</p>
      <div class="jr-weer">${zinnen.map((_, i) => `<button type="button" class="jr-weer-knop jr-eigen ${ochtendWeer === i + 1 ? 'aan' : ''}" data-weer="${i + 1}"><img src="/img/junior/weer/${i + 1}.webp" alt=""></button>`).join('')}</div>`;
    vak.querySelectorAll('[data-weer]').forEach(b => b.addEventListener('click', () => {
      ochtendWeer = +b.dataset.weer;
      bewaarOchtend();
      try { sfx.good(); } catch {}
      ochtend('weer');
      Junior.Stem.zeg([zinnen[ochtendWeer - 1]]);
    }));
    if (!ochtendWeer) Junior.Stem.zeg([z.ochtendWelkWeer]);
  } else if (stap === 'wie') {
    const er = kinderen.filter(k => !afwezig.has(k.id));
    vak.innerHTML = `<p class="jr-ochtend-zin">${Junior.esc(z.ochtendWie)}</p>
      <div class="jr-wie">${kinderen.map(k => `<button type="button" class="jr-wie-kind jr-eigen ${afwezig.has(k.id) ? 'weg' : ''}" data-wie="${k.id}"><img src="${k.beeld}" alt=""><span>${Junior.esc(k.naam)}</span></button>`).join('')}</div>
      <div class="jr-wie-tel"><span class="jr-wie-getal">${er.length}</span><span class="jr-wie-bolletjes">${er.map(() => '<i></i>').join('')}</span></div>`;
    vak.querySelectorAll('[data-wie]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.wie;
      if (afwezig.has(id)) afwezig.delete(id); else afwezig.add(id);
      bewaarOchtend();
      ochtend('wie');
      Junior.Stem.zeg([kinderen.filter(k => !afwezig.has(k.id)).length, z.ochtendTel]);
    }));
    Junior.Stem.zeg([z.ochtendWie]);
  } else {
    vak.innerHTML = `<div class="jr-ochtend-klaar"><img class="jr-ochtend-draak" src="${draakImg()}" alt=""><p class="jr-ochtend-zin">${Junior.esc(z.ochtendKlaar)}</p></div>`;
    try { confetti(3000); sfx.fanfare(); } catch {}
    Junior.Stem.zeg([z.ochtendKlaar]);
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
function zetSets(lijst) {
  sets = Array.isArray(lijst) ? lijst : [];
  if (window.JR) JR.sets = sets;
  $('jr-tel-maken').textContent = sets.length ? `${sets.length} ${sets.length === 1 ? 'reeks' : 'reeksen'}` : 'Met of zonder AI';
  tegels();
  toonSets();
}
function toonSets() {
  const box = $('jr-sets');
  $('jr-sets-leeg').classList.toggle('hidden', sets.length > 0);
  box.innerHTML = '';
  for (const set of sets) {
    const d = document.createElement('div');
    d.className = 'jr-set';
    const voorbeeld = set.vragen.slice(0, 1).flatMap(v => v.opties.map(o => o.e)).join(' ');
    d.innerHTML = `<div><b>${Junior.esc(set.naam)}</b><span>${set.vragen.length} vragen · ${Junior.esc(voorbeeld)}</span></div>`
      + '<span class="jr-set-knoppen"><button type="button" class="gold jr-set-speel">▶ Spelen</button><button type="button" class="secondary jr-set-bw">✏️</button><button type="button" class="secondary jr-set-wis">🗑️</button></span>';
    d.querySelector('.jr-set-speel').addEventListener('click', () => {
      const s = spelVan('eigen');
      kies(s);
      gekozen.niveau = sets.indexOf(set);
      for (const [i, x] of [...$('jr-kv-niveaus').children].entries()) x.classList.toggle('aan', i === gekozen.niveau);
    });
    d.querySelector('.jr-set-bw').addEventListener('click', () => bewerk(set));
    d.querySelector('.jr-set-wis').addEventListener('click', async () => {
      if (!(await Ui.vraag(`De reeks "${set.naam}" wissen?`))) return;
      socket.emit('jr-set-wis', { id: set.id }, res => (res && res.error ? Ui.melding(res.error) : zetSets(res.sets)));
    });
    box.appendChild(d);
  }
}
let bezig = null; // de reeks die nu bewerkt wordt
function bewerk(set) {
  bezig = JSON.parse(JSON.stringify(set));
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
    d.innerHTML = `<div class="jr-bw-rij"><b>${vi + 1}</b><input class="jr-bw-tekst" maxlength="160" placeholder="De vraag, zoals je ze zegt"><button type="button" class="secondary jr-bw-zeg" title="Voorlezen">🔊</button><button type="button" class="secondary jr-bw-weg" title="Vraag wissen">🗑️</button></div>`
      + `<div class="jr-bw-opties">${v.opties.map((o, oi) => `<label class="jr-bw-optie ${oi === v.juist ? 'juist' : ''}"><input type="radio" name="jr-juist-${vi}" ${oi === v.juist ? 'checked' : ''} title="Dit is het juiste antwoord">${o.f ? `<img class="jr-bw-foto" src="/junior/foto/${o.f}" alt="" title="${Junior.esc(o.fb || '')}">` : '<input class="jr-bw-e" maxlength="16" placeholder="🙂">'}<input class="jr-bw-w" maxlength="30" placeholder="woord"><button type="button" class="secondary jr-bw-fk" title="${o.f ? 'Foto weg' : 'Echte foto zoeken'}">${o.f ? '✕' : '📷'}</button></label>`).join('')}</div>`;
    const tekst = d.querySelector('.jr-bw-tekst');
    tekst.value = v.vraag;
    tekst.addEventListener('input', () => { v.vraag = tekst.value; });
    d.querySelector('.jr-bw-zeg').addEventListener('click', () => Junior.Stem.zeg([v.vraag]));
    d.querySelector('.jr-bw-weg').addEventListener('click', () => { bezig.vragen.splice(vi, 1); vragenLijst(); });
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
// Echte foto's van Wikimedia Commons (vrije licenties): zoeken met het woord, kiezen, en de pc bewaart de foto voor de klas.
function fotoKies(o) {
  const v = $('jr-foto-venster');
  $('jr-foto-woord').value = o.w || '';
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
        socket.emit('jr-foto-neem', { thumb: f.thumb }, r => {
          if (!r || r.error) { $('jr-foto-tip').textContent = (r && r.error) || 'Die foto lukt niet.'; return; }
          const o = $('jr-foto-venster')._optie;
          o.f = r.f;
          o.fb = [f.bron, 'Wikimedia Commons'].filter(Boolean).join(', ');
          if (!o.w) o.w = $('jr-foto-woord').value.trim().slice(0, 30);
          $('jr-foto-venster').close();
          vragenLijst();
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
    $('jr-maak-ai-tip').textContent = 'De prompt staat klaar. Plak hem in een chatbot (Gemini, ChatGPT of Claude) en plak het antwoord hieronder.';
  });
});
$('jr-maak-lees').addEventListener('click', () => {
  socket.emit('jr-set-lees', $('jr-maak-plak').value, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    $('jr-maak-plak').value = '';
    $('jr-maak-plak-blok').classList.add('hidden');
    bewerk(res.set);
  });
});
socket.on('jr-sets', lijst => zetSets(lijst));

socket.on('connect', () => {
  socket.emit('jr-sets', null, res => {
    if (!res || res.error) return;
    zetSets(res.sets);
    $('jr-maak-ai-tip').textContent = res.ai ? '' : 'Nog geen AI-sleutel? Kopieer de prompt en plak het antwoord van een chatbot hieronder. Een sleutel zet je bij Instellingen in LANcelot.';
  });
  socket.emit('jr-lk-get', null, res => {
    if (!res) return;
    stand = res.stand;
    kinderen = res.kinderen || [];
    toonDraak(res.stand.draak);
    klas();
    volg(res.overzicht || []);
    toon();
  });
});
socket.on('jr-stand', s => {
  const oud = stand.seed;
  stand = s;
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
