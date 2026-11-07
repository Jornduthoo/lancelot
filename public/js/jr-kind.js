// LANcelot Junior op de tablet of Chromebook van het kind: dier aantikken, opdrachten doen, stickers verdienen.
// Om de beurt (hoekenwerk): na een ronde tikt het volgende kind zijn dier aan. Met twee: om de beurt een opdracht.
// Op het bord (en bij de bewegingsdans): de tablet zegt dat je naar het bord kijkt.
const socket = io();
const $ = id => document.getElementById(id);
const J = () => window.JR || { zin: {}, dieren: [] };
const SCHERMEN = ['jr-wacht', 'jr-kies', 'jr-spel', 'jr-beloning', 'jr-naar-bord', 'jr-kring', 'jr-apart', 'jr-burcht'];

let stand = { actief: false };
let kinderen = [];
let bezet = [];
let ik = [];
let gekozen = [];
let ronde = null; // { seed, r, nr, totaal, nieuw: {id: sticker}, groei }
let huidig = null;
let kringGekozen = {};
let kringVraag = -1;
// Apart oefenen: een ondersteuner (of de leerkracht) oefent met één kind, los van wat de klas doet. { spel, niveau, seed }
let apart = null;
// Met twee op een tablet, maar er is maar één kind: dan speelt het alleen (knop 'Ik speel alleen').
let alleen = false;
// Mijn burcht: { van: 'wacht' of 'beloning', wie: kind-id, data, plek }. Van het beginscherm: eerst je dier aantikken.
let burcht = null;
try { apart = JSON.parse(sessionStorage.getItem('jr-apart') || 'null'); } catch { apart = null; }
const S = () => (apart ? { ...stand, actief: true, spel: apart.spel, niveau: apart.niveau, seed: apart.seed, manier: 'beurt', perRonde: apart.raadsel ? 3 : 5 } : stand);

try { ik = JSON.parse(sessionStorage.getItem('jr-ik') || '[]'); } catch { ik = []; }
const bewaarIk = () => { try { sessionStorage.setItem('jr-ik', JSON.stringify(ik)); } catch {} };

function toon(id) {
  for (const s of SCHERMEN) $(s).classList.toggle('hidden', s !== id);
  document.body.dataset.scherm = id;
  // Elk spel heeft zijn eigen geschilderde achtergrond.
  document.body.dataset.spel = ['jr-spel', 'jr-beloning'].includes(id) && S().actief ? S().spel || '' : '';
}
const dierImg = (k, cls = '') => `<img class="${cls}" src="${k.beeld || `/img/junior/dier/${k.dier}.webp`}" alt="">`;
// Met een eigen symbooltje zegt het draakje de naam van het kind, anders het dier.
const dierNaam = k => (k.eigen ? k.naam : (J().dieren || [])[k.dier - 1]) || k.naam;
const kind = id => kinderen.find(k => k.id === id);
const draakImg = () => `/img/junior/draak/${(stand.draak && stand.draak.fase) || 1}.webp`;

// De eigen vragen die nu gespeeld worden, komen mee met de stand (de tablet laadde de lijst misschien al eerder).
function zetSets() {
  if (stand.eigen && window.JR) { (JR.sets = JR.sets || [])[stand.niveau] = stand.eigen; }
}
function zetDraak() {
  zetSets();
  Junior.Stem.stil = stand.voorlezen === false;
  for (const id of ['jr-balk-draak', 'jr-wacht-draak']) $(id).src = draakImg();
}

// ---------- Wie speelt er ----------
function balk() {
  const wie = ik.map(kind).filter(Boolean);
  $('jr-wie').classList.toggle('hidden', !wie.length);
  // Bij een avontuur op het bord: de kleur van het team rond het dier (rood, blauw, geel, groen).
  const kleur = k => (!apart && stand.avontuur && k.team >= 0 ? ` jr-tk-${['rood', 'blauw', 'geel', 'groen'][k.team]}` : '');
  $('jr-wie').innerHTML = wie.map(k => `<span class="jr-wie-een${kleur(k)}">${dierImg(k)}<b>${Junior.esc(k.naam)}</b></span>`).join('');
}
$('jr-wie').addEventListener('click', () => {
  if (!ik.length) return;
  afmelden();
});
function afmelden() {
  if (huidig) huidig.stop();
  huidig = null;
  ronde = null;
  ik = [];
  gekozen = [];
  alleen = false;
  bewaarIk();
  socket.emit('jr-login', { ids: [] });
  route();
}

function nodig() { return !burcht && S().manier === 'duo' && S().spel !== 'kring' && !alleen ? 2 : 1; }

function kiesScherm() {
  toon('jr-kies');
  const n = nodig();
  // Bij twee kinderen: na het eerste dier zegt het scherm dat het maatje nu kiest, en wie alleen is kan meteen beginnen.
  const tweede = n === 2 && gekozen.length === 1;
  $('jr-kies-titel').textContent = tweede ? J().zin.kiesTweede || 'Tik nu op het dier van je maatje.' : n === 2 ? J().zin.kiesDuo || 'Tik op jullie twee dieren.' : J().zin.kiesDier || 'Tik op jouw dier.';
  $('jr-alleen').textContent = `▶ ${J().zin.alleen || 'Ik speel alleen'}`;
  $('jr-alleen').classList.toggle('hidden', !tweede);
  const box = $('jr-dieren');
  box.innerHTML = '';
  $('jr-geen-klas').classList.toggle('hidden', kinderen.length > 0);
  for (const k of kinderen) {
    const b = document.createElement('button');
    b.type = 'button';
    const elders = bezet.includes(k.id) && !ik.includes(k.id);
    b.className = `jr-dier ${elders ? 'jr-bezet' : ''} ${gekozen.includes(k.id) ? 'jr-aan' : ''}`;
    b.innerHTML = `${dierImg(k)}<span>${Junior.esc(k.naam)}</span>`;
    b.disabled = elders;
    b.addEventListener('click', () => {
      try { sfx.unlock(); } catch {}
      if (gekozen.includes(k.id)) gekozen = gekozen.filter(x => x !== k.id);
      else gekozen.push(k.id);
      if (!(n === 2 && gekozen.length === 1)) Junior.Stem.zeg([dierNaam(k)]);
      if (gekozen.length >= n) meldAan(gekozen.slice(0, n));
      else {
        kiesScherm();
        if (n === 2 && gekozen.length === 1) Junior.Stem.zeg([dierNaam(k), $('jr-kies-titel').textContent]);
      }
    });
    box.appendChild(b);
  }
  balk();
}

$('jr-alleen').addEventListener('click', () => {
  if (gekozen.length !== 1) return;
  alleen = true;
  meldAan(gekozen.slice(0, 1));
});

function meldAan(ids) {
  socket.emit('jr-login', { ids }, res => {
    gekozen = [];
    if (!res || res.error) { kiesScherm(); return; }
    ik = ids;
    bewaarIk();
    ronde = null;
    route();
  });
}

// ---------- Een ronde spelen ----------
function nieuweRonde() {
  // Het raadsel van vandaag is voor iedereen hetzelfde; gewone rondes krijgen elk een eigen reeks.
  const zaad = apart && apart.raadsel ? S().seed : (S().seed ^ Math.floor(Math.random() * 1e9)) >>> 0;
  ronde = { seed: S().seed, r: Junior.toeval(zaad), nr: 0, totaal: (S().perRonde || 5) * ik.length, nieuw: {}, groei: false };
}

function stappen() {
  const box = $('jr-stappen');
  if (!ronde || !document.body.dataset.scherm || document.body.dataset.scherm !== 'jr-spel') { box.innerHTML = ''; return; }
  box.innerHTML = Array.from({ length: ronde.totaal }, (_, i) => `<i class="${i < ronde.nr ? 'af' : i === ronde.nr ? 'nu' : ''}"></i>`).join('');
}

async function volgendeVraag() {
  if (!ronde || ronde.seed !== S().seed) nieuweRonde();
  toon('jr-spel');
  stappen();
  const wie = kind(ik[ronde.nr % ik.length]);
  const banner = $('jr-beurt');
  if (ik.length > 1 && wie) {
    banner.innerHTML = `${dierImg(wie)}<b>${Junior.esc(wie.naam)}</b>`;
    banner.classList.remove('hidden');
    await Junior.Stem.zeg([dierNaam(wie), J().zin.beurt]);
  } else banner.classList.add('hidden');
  const v = Junior.vraag(S().spel, S().niveau, ronde.r);
  if (!v) return;
  const mijnSeed = ronde.seed;
  huidig = Junior.speel($('jr-vak'), v, {
    klaar: juist => {
      if (!ronde || ronde.seed !== mijnSeed || !wie) return;
      const tekst = (v.zeg || []).join(' ');
      socket.emit('jr-antwoord', { id: wie.id, vraag: tekst, juist, apart: apart && { spel: apart.spel, niveau: apart.niveau } }, res => {
        if (res && !res.error) {
          if (res.sticker) ronde.nieuw[wie.id] = res.sticker;
          if (res.gegroeid) ronde.groei = true;
          if (res.draak) { stand.draak = res.draak; zetDraak(); }
        }
        ronde.nr++;
        if (ronde.nr >= ronde.totaal) beloning();
        else volgendeVraag();
      });
    },
  });
}

function beloning() {
  huidig = null;
  toon('jr-beloning');
  stappen();
  const wie = ik.map(kind).filter(Boolean);
  $('jr-nieuw').innerHTML = wie.map(k => {
    const s = ronde && ronde.nieuw[k.id];
    return `<div class="jr-nieuw-een">${dierImg(k, 'jr-nieuw-dier')}${s ? `<img class="jr-nieuw-sticker" src="/img/junior/sticker/${s}.webp" alt="">` : ''}</div>`;
  }).join('') + `<img class="jr-nieuw-draak" src="${draakImg()}" alt="">`;
  // Het stickerboek van het (eerste) kind: alles wat het al verdiende.
  socket.emit('jr-stickers', { id: ik[0] }, res => {
    const lijst = (res && res.stickers) || [];
    $('jr-boek').innerHTML = lijst.slice(-30).map(s => `<img src="/img/junior/sticker/${s}.webp" alt="">`).join('');
  });
  // Het raadsel is één keer per dag: daarna alleen 'Klaar' (terug naar het begin). Anders: nog een keer of het volgende kind.
  const raadsel = !!(apart && apart.raadsel);
  $('jr-volgende').classList.toggle('hidden', raadsel || S().manier !== 'beurt');
  $('jr-nog').classList.toggle('hidden', raadsel);
  $('jr-klaar').classList.toggle('hidden', !raadsel);
  try { confetti(2500); } catch {}
  Junior.Stem.zeg([J().zin.sticker, ...(ronde && ronde.groei ? [J().zin.groei] : [])]);
  ronde = null;
}
$('jr-nog').addEventListener('click', () => { ronde = null; if (apart) apart.seed = Math.floor(Math.random() * 1e9); volgendeVraag(); });
$('jr-volgende').addEventListener('click', () => { afmelden(); Junior.Stem.zeg([J().zin.volgende]); });
$('jr-luister').addEventListener('click', () => {
  Junior.Stem.even();
  if (huidig) huidig.herhaal();
  else if (document.body.dataset.scherm === 'jr-kies') Junior.Stem.zeg([$('jr-kies-titel').textContent]);
  else if (document.body.dataset.scherm === 'jr-kring') Junior.Stem.zeg([$('jr-kring-vraag').textContent]);
});

// ---------- Kringvragen ----------
function kringScherm(k) {
  toon('jr-kring');
  const vragen = (J().kring || [])[stand.niveau] || [];
  if (!vragen.length) return;
  const nr = (k ? k.vraag : (stand.kring && stand.kring.vraag)) || 0;
  const q = vragen[nr % vragen.length];
  if (nr !== kringVraag) { kringVraag = nr; kringGekozen = {}; Junior.Stem.zeg([q.vraag]); }
  $('jr-kring-vraag').textContent = q.vraag;
  const wie = ik.find(id => kringGekozen[id] === undefined);
  const box = $('jr-kring-opties');
  box.innerHTML = '';
  q.opties.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jr-kring-optie ${ik.some(id => kringGekozen[id] === i) ? 'jr-aan' : ''}`;
    b.innerHTML = `<span class="jr-emoji">${o.e}</span><span>${Junior.esc(o.t)}</span>`;
    b.disabled = !wie;
    b.addEventListener('click', () => {
      if (!wie) return;
      kringGekozen[wie] = i;
      Junior.Stem.zeg([o.t]);
      socket.emit('jr-kring-kies', { id: wie, keuze: i });
      kringScherm();
    });
    box.appendChild(b);
  });
  const k2 = wie && kind(wie);
  $('jr-kring-wie').innerHTML = k2 ? `${dierImg(k2, 'jr-mini')} ${Junior.esc(k2.naam)}` : Junior.esc(J().zin.dankje || '');
}

// ---------- Waar ben ik ----------
function route() {
  // Start de leerkracht een spel terwijl iemand het raadsel doet: dan gaat de klas voor.
  if (apart && apart.raadsel && stand.actief) {
    apart = null;
    try { sessionStorage.removeItem('jr-apart'); } catch {}
    ronde = null;
  }
  zetDraak();
  balk();
  $('jr-apart-stop').classList.toggle('hidden', !apart || !!apart.raadsel);
  $('jr-raadsel-stop').classList.toggle('hidden', !(apart && apart.raadsel));
  if (burcht) {
    if (burcht.van === 'wacht') ik = ik.filter(id => kind(id)).slice(0, 1);
    if (!ik.length) { kiesScherm(); return; }
    burchtScherm();
    return;
  }
  if (apart) {
    ik = ik.filter(id => kind(id)).slice(0, 1);
    if (!ik.length) { kiesScherm(); return; }
    if (ronde && ronde.seed === apart.seed && huidig) { toon('jr-spel'); return; }
    if (document.body.dataset.scherm === 'jr-beloning' && !ronde) return;
    volgendeVraag();
    return;
  }
  if (!stand.actief) {
    if (huidig) huidig.stop();
    huidig = null;
    ronde = null;
    toon('jr-wacht');
    stappen();
    return;
  }
  if (stand.spel === 'dans' || (stand.manier === 'bord' && stand.spel !== 'kring')) {
    if (huidig) huidig.stop();
    huidig = null;
    toon('jr-naar-bord');
    $('jr-bord-draak').src = draakImg();
    return;
  }
  // Wie hier ingelogd was maar niet meer op de klaslijst staat, of een duo dat nu alleen moet spelen: opnieuw kiezen.
  ik = ik.filter(id => kind(id)).slice(0, nodig());
  if (ik.length < nodig()) { kiesScherm(); return; }
  if (stand.spel === 'kring') { kringScherm(); return; }
  if (ronde && ronde.seed === stand.seed && huidig) { toon('jr-spel'); return; }
  if (document.body.dataset.scherm === 'jr-beloning' && !ronde) return;
  volgendeVraag();
}

// ---------- Apart oefenen (ondersteuner) ----------
// Op het wachtscherm met de knop, of altijd: het draakje linksboven twee seconden ingedrukt houden.
let apartKeuze = { spel: '', niveau: 0 };
function apartScherm() {
  if (huidig) huidig.stop();
  huidig = null;
  toon('jr-apart');
  const box = $('jr-apart-spellen');
  box.innerHTML = '';
  for (const sp of (J().spellen || []).filter(x => !x.bordAlleen && !x.verborgen && x.id !== 'kring')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jr-apart-spel ${apartKeuze.spel === sp.id ? 'jr-aan' : ''}`;
    b.innerHTML = `<img src="/img/junior/${sp.beeld}.webp" alt=""><b>${sp.naam}</b>`;
    b.addEventListener('click', () => { apartKeuze = { spel: sp.id, niveau: 0 }; apartScherm(); });
    box.appendChild(b);
  }
  const sp = (J().spellen || []).find(x => x.id === apartKeuze.spel);
  const niv = $('jr-apart-niveaus');
  niv.innerHTML = '';
  if (sp) sp.niveaus.forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jr-knop ${apartKeuze.niveau === i ? 'jr-knop-goud' : ''}`;
    b.textContent = n;
    b.addEventListener('click', () => { apartKeuze.niveau = i; apartScherm(); });
    niv.appendChild(b);
  });
  $('jr-apart-start').disabled = !sp;
}
$('jr-apart-start').addEventListener('click', () => {
  if (!apartKeuze.spel) return;
  try { sfx.unlock(); } catch {}
  apart = { ...apartKeuze, seed: Math.floor(Math.random() * 1e9) };
  try { sessionStorage.setItem('jr-apart', JSON.stringify(apart)); } catch {}
  ik = ik.slice(0, 1);
  ronde = null;
  route();
});
function stopApart() {
  apart = null;
  try { sessionStorage.removeItem('jr-apart'); } catch {}
  if (huidig) huidig.stop();
  huidig = null;
  ronde = null;
  route();
}
$('jr-apart-terug').addEventListener('click', stopApart);
$('jr-apart-stop').addEventListener('click', stopApart);
// Raadsel klaar of gestopt: afmelden en terug naar het beginscherm.
function raadselKlaar() {
  ik = [];
  gekozen = [];
  bewaarIk();
  socket.emit('jr-login', { ids: [] });
  stopApart();
}
$('jr-klaar').addEventListener('click', raadselKlaar);
$('jr-raadsel-stop').addEventListener('click', raadselKlaar);
$('jr-apart-knop').addEventListener('click', apartScherm);
// Raadsel van vandaag: drie korte opdrachten, elke dag andere, voor iedereen dezelfde. Eén sticker per dag.
$('jr-raadsel-knop').addEventListener('click', () => {
  try { sfx.unlock(); } catch {}
  const d = new Date();
  apart = { spel: 'raadsel', niveau: 0, seed: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(), raadsel: true };
  try { sessionStorage.setItem('jr-apart', JSON.stringify(apart)); } catch {}
  ik = [];
  ronde = null;
  route();
});
{
  let t = null;
  const draak = $('jr-balk-draak');
  draak.addEventListener('pointerdown', () => { t = setTimeout(apartScherm, 2000); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) draak.addEventListener(ev, () => clearTimeout(t));
  draak.addEventListener('contextmenu', e => e.preventDefault());
}

socket.on('connect', () => {
  socket.emit('jr-get', null, res => {
    if (!res) return;
    kinderen = res.kinderen || [];
    bezet = res.bezet || [];
    const oud = stand.seed;
    stand = res.stand || { actief: false };
    if (ik.length) socket.emit('jr-login', { ids: ik });
    if (oud !== stand.seed) ronde = null;
    route();
  });
});
socket.on('jr-stand', s => {
  if (apart) { stand = s; zetDraak(); return; }
  const nieuw = s.seed !== stand.seed || s.manier !== stand.manier;
  stand = s;
  if (nieuw) {
    alleen = false;
    if (burcht && stand.actief) { if (burcht.van === 'wacht') { ik = []; bewaarIk(); } burcht = null; }
    if (huidig) huidig.stop();
    huidig = null;
    ronde = null;
    kringVraag = -1;
  }
  if (!nieuw && document.body.dataset.scherm === 'jr-spel') { zetDraak(); return; }
  route();
});
socket.on('jr-kinderen', res => {
  kinderen = res.kinderen || kinderen;
  bezet = res.bezet || [];
  if (document.body.dataset.scherm === 'jr-kies') kiesScherm();
});
socket.on('jr-kring', k => {
  if (stand.spel !== 'kring' || !ik.length) return;
  if (stand.kring) stand.kring.vraag = k.vraag;
  kringScherm(k);
});
// De leerkracht haalde een naam weg (knop Namen): opnieuw kiezen.
socket.on('jr-weg', () => afmelden());
Junior.schaal($('jr-vak'));
route();
socket.on('jr-sets', lijst => { if (window.JR && Array.isArray(lijst)) JR.sets = lijst; });

// ---------- Mijn burcht ----------
// Het burchtplein met 9 plekjes (achteraan kleiner). Tik op een plekje, kies een gebouw: het kost stenen.
const PLEKKEN = [[30, 45, 0.75], [50, 43, 0.75], [70, 45, 0.75], [18, 61, 0.88], [38, 60, 0.88], [62, 58, 0.88], [82, 61, 0.88], [27, 77, 1], [73, 77, 1]];
function burchtOpen(van) {
  try { sfx.unlock(); } catch {}
  if (huidig) huidig.stop();
  huidig = null;
  burcht = { van, wie: van === 'wacht' ? null : ik[0], data: null, plek: -1 };
  if (van === 'wacht') { ik = []; gekozen = []; }
  route();
}
function burchtScherm() {
  if (!burcht.wie || !ik.includes(burcht.wie)) burcht.wie = ik[0];
  toon('jr-burcht');
  $('jr-burcht-lade').classList.add('hidden');
  const wie = ik.map(kind).filter(Boolean);
  // Met twee: tik op het andere dier om de burcht van je maatje te zien.
  $('jr-burcht-wie').innerHTML = '';
  for (const k of wie.length > 1 ? wie : []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jr-burcht-kind ${k.id === burcht.wie ? 'aan' : ''}`;
    b.innerHTML = `${dierImg(k)}<b>${Junior.esc(k.naam)}</b>`;
    b.addEventListener('click', () => { burcht.wie = k.id; burcht.data = null; burchtScherm(); });
    $('jr-burcht-wie').appendChild(b);
  }
  if (burcht.data) { burchtTeken(); return; }
  socket.emit('jr-burcht', { id: burcht.wie }, res => {
    if (!burcht || !res || res.error) return;
    const eerste = !burcht.data;
    burcht.data = res;
    burchtTeken();
    if (eerste) Junior.Stem.zeg([J().zin.burchtUitleg]);
  });
}
function burchtTeken() {
  const d = burcht.data;
  $('jr-burcht-stenen').textContent = d.stenen;
  const plein = $('jr-burcht-plein');
  plein.innerHTML = '';
  PLEKKEN.forEach(([x, y, sc], i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const stuk = d.plek[i];
    b.className = `jr-plek ${stuk ? 'vol' : 'leeg'} ${burcht.plek === i ? 'aan' : ''}`;
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.style.zIndex = Math.round(y);
    b.style.setProperty('--sc', sc);
    b.innerHTML = stuk ? `<img src="/img/junior/burcht/${stuk}.webp" alt="">` : '<span>+</span>';
    b.addEventListener('click', () => burchtLade(i));
    plein.appendChild(b);
  });
}
function burchtLade(i) {
  burcht.plek = i;
  burchtTeken();
  const d = burcht.data;
  const box = $('jr-burcht-stukken');
  box.innerHTML = '';
  for (const s of d.stukken) {
    const b = document.createElement('button');
    b.type = 'button';
    const kan = d.stenen >= s.prijs || d.plek[i] === s.id;
    b.className = `jr-stuk ${kan ? '' : 'te-duur'} ${d.plek[i] === s.id ? 'aan' : ''}`;
    b.innerHTML = `<img src="/img/junior/burcht/${s.id}.webp" alt=""><span><img src="/img/junior/burcht/steen.webp" alt="">${s.prijs}</span>`;
    b.addEventListener('click', () => {
      if (!kan) { Junior.Stem.even(); Junior.Stem.zeg([J().zin.burchtTeWeinig]); try { sfx.empty(); } catch {} return; }
      socket.emit('jr-burcht-bouw', { id: burcht.wie, plek: i, stuk: s.id }, res => {
        if (!burcht || !res || res.error) return;
        burcht.data = res;
        burcht.plek = -1;
        $('jr-burcht-lade').classList.add('hidden');
        burchtTeken();
        const nieuw = $('jr-burcht-plein').children[i];
        if (nieuw) nieuw.classList.add('jr-gebouwd');
        try { sfx.power(); } catch {}
        Junior.Stem.zeg([(J().zin.goed || [''])[Math.floor(Math.random() * (J().zin.goed || ['']).length)]]);
      });
    });
    box.appendChild(b);
  }
  $('jr-burcht-lade').classList.remove('hidden');
}
$('jr-burcht-lade-dicht').addEventListener('click', () => { burcht.plek = -1; $('jr-burcht-lade').classList.add('hidden'); burchtTeken(); });
$('jr-burcht-knop').addEventListener('click', () => burchtOpen('wacht'));
$('jr-bouwen').addEventListener('click', () => burchtOpen('beloning'));
$('jr-burcht-klaar').addEventListener('click', () => {
  const van = burcht && burcht.van;
  burcht = null;
  if (van === 'wacht') { ik = []; gekozen = []; bewaarIk(); socket.emit('jr-login', { ids: [] }); route(); return; }
  toon('jr-beloning');
});
