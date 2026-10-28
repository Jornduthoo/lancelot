// Het Kringgesprek: de klas rond de ronde tafel, een gloeiende steen gaat van ridder naar ridder.
// Wie de steen heeft, spreekt. Alles draait in deze pagina; de stand van vandaag staat in localStorage,
// zodat een herladen bord gewoon verdergaat. Wie afwezig is, deelt deze pagina met De Wapenkamer.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const bewaarLees = (key, standaard) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? standaard : v; } catch { return standaard; } };
const bewaar = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const schud = lijst => { const a = lijst.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const vandaag = () => new Date().toISOString().slice(0, 10);
const TWEE_PI = Math.PI * 2;

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host#tafel'; });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
$('groot').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});

const VRAGEN = [
  ['Start van de dag', ['Waar kijk je vandaag naar uit?', 'Hoe voel je je vandaag, in één woord?', 'Wat heb je gisteren leuks gedaan?', 'Wat wil je vandaag graag leren?']],
  ['Terugblik', ['Wat heb je vandaag geleerd?', 'Wat ging er goed deze week?', 'Wat vond je moeilijk, en wat hielp je?', 'Wat neem je mee naar morgen?']],
  ['Samen', ['Wie wil je bedanken, en waarom?', 'Wat maakt iemand een goede vriend?', 'Wat kunnen we als klas nog beter doen?', 'Waar ben je trots op?']],
  ['Denken', ['Is het ooit oké om te liegen?', 'Wat is moediger: iets zeggen of zwijgen?', 'Als je één regel in de wereld mocht veranderen, welke?', 'Wat zou je doen als je één dag onzichtbaar was?']],
  ['Ridders', ['Welke superkracht zou jouw ridder hebben?', 'Welke uitdaging wil jij deze week overwinnen?', 'Wat is voor jou een echte held?']],
];
const TIJDEN = [0, 30, 60, 120];

// ---------- De stand ----------
let klas = { leerlingen: [] };
let afwezig = new Set();
{
  const a = bewaarLees('lancelot-wk-afwezig', null);
  if (a && a.datum === vandaag() && Array.isArray(a.ids)) afwezig = new Set(a.ids);
}
const standaard = { datum: vandaag(), vraag: '', tijd: 0, ronde: 1, volgorde: [], staat: {}, cur: null };
let st = bewaarLees('lancelot-kg', null);
if (!st || st.datum !== vandaag()) st = { ...standaard, vraag: st?.vraag || '', tijd: st?.tijd || 0, volgorde: st?.volgorde || [] };
let eigen = bewaarLees('lancelot-kg-eigen', []);
let terug = []; // voor ←: de stand van voor elke stap
const opslaan = () => bewaar('lancelot-kg', st);

const naamVan = id => (klas.leerlingen.find(l => l.id === id) || {}).naam || '';
const stoelen = () => st.volgorde.filter(id => !afwezig.has(id) && klas.leerlingen.some(l => l.id === id));

function laadKlas() {
  socket.emit('klas-get', null, res => {
    if (!res || res.error) return;
    klas = res.klas;
    const ids = klas.leerlingen.map(l => l.id);
    st.volgorde = st.volgorde.filter(id => ids.includes(id)).concat(ids.filter(id => !st.volgorde.includes(id)));
    $('geen-klas').classList.toggle('hidden', ids.length > 0);
    $('kg-game').classList.toggle('hidden', ids.length === 0);
    toonAanwezig();
    schik();
  });
}
socket.on('connect', laadKlas);
socket.on('klas-namen', laadKlas);

function toonAanwezig() {
  const n = klas.leerlingen.filter(l => !afwezig.has(l.id)).length;
  $('aanwezig').querySelector('span').textContent = afwezig.size ? `${n} van ${klas.leerlingen.length} aanwezig` : 'Aanwezig';
  $('aanwezig-namen').innerHTML = klas.leerlingen.map(l => `<button class="${afwezig.has(l.id) ? 'weg' : ''}" data-id="${l.id}">${esc(l.naam)}</button>`).join('');
}
$('aanwezig').addEventListener('click', () => $('aanwezig-venster').showModal());
$('aanwezig-dicht').addEventListener('click', () => $('aanwezig-venster').close());
$('aanwezig-namen').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const id = b.dataset.id;
  if (afwezig.has(id)) afwezig.delete(id); else afwezig.add(id);
  bewaar('lancelot-wk-afwezig', { datum: vandaag(), ids: [...afwezig] });
  if (afwezig.has(st.cur)) st.cur = null;
  toonAanwezig();
  schik();
});
for (const d of document.querySelectorAll('.kg-dialoog')) d.addEventListener('click', e => { if (e.target === d) d.close(); });

// ---------- De zaal: stoelen plaatsen en de tafel tekenen ----------
let maat = null;
let hoekVan = {}; // id -> hoek van zijn stoel
function schik() {
  const zaal = $('zaal');
  const w = zaal.clientWidth;
  const h = zaal.clientHeight;
  if (!w || !h) return;
  const ids = stoelen();
  const n = ids.length;
  hoekVan = {};
  ids.forEach((id, i) => { hoekVan[id] = -Math.PI / 2 + i / Math.max(1, n) * TWEE_PI; });
  maat = KgTafel.teken($('tafel'), w, h, ids.map(id => hoekVan[id]));
  const fs = Math.max(12, Math.min(24, Math.min(w, h) * .03)) * (n > 26 ? .82 : n > 18 ? .92 : 1);
  zaal.style.setProperty('--kg-fs', `${fs.toFixed(1)}px`);
  zaal.style.setProperty('--kg-midden', `${Math.round(maat.rx * .88)}px`);
  zaal.style.setProperty('--kg-vfs', `${Math.max(14, Math.min(34, maat.rx * .052)).toFixed(1)}px`);
  zaal.style.setProperty('--kg-kw', `${Math.round(maat.rx * 1.32)}px`);
  zaal.style.setProperty('--kg-kh', `${Math.round(maat.ry * 1.32)}px`);
  $('stoelen').innerHTML = ids.map(id => {
    const a = hoekVan[id];
    const x = maat.cx + Math.cos(a) * maat.sx;
    const y = maat.cy + Math.sin(a) * maat.sy;
    return `<button class="kg-stoel" data-id="${id}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">${esc(naamVan(id))}</button>`;
  }).join('');
  steenHoek = st.cur && hoekVan[st.cur] != null ? hoekVan[st.cur] : null;
  zetSteen(steenHoek);
  toon();
}
new ResizeObserver(() => schik()).observe($('zaal'));
// Een ander thema: de tafel opnieuw tekenen in de nieuwe kleuren.
new MutationObserver(() => schik()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-thema'] });

// ---------- De steen ----------
let steenHoek = null;
let draait = false;
function zetSteen(a) {
  const steen = $('steen');
  if (!maat) return;
  if (a == null) {
    steen.style.transform = `translate3d(${maat.cx}px, ${maat.cy - maat.ry * .5}px, 0) scale(.7)`;
    steen.classList.add('rust');
    return;
  }
  steen.classList.remove('rust');
  const x = maat.cx + Math.cos(a) * maat.rx * .86;
  const y = maat.cy + Math.sin(a) * maat.ry * .84;
  steen.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
}
// De steen rolt langs de rand van de tafel naar zijn doel (met de klok mee, of extra rondjes bij willekeurig).
function rolSteen(doel, { rondjes = 0, duur = 520, tik = false } = {}) {
  return new Promise(klaar => {
    if (steenHoek == null || doel == null) { steenHoek = doel; zetSteen(doel); return klaar(); }
    const van = steenHoek;
    let delta = ((doel - van) % TWEE_PI + TWEE_PI) % TWEE_PI;
    if (delta > Math.PI && !rondjes) delta -= TWEE_PI; // terug of tegenover: de kortste weg
    delta += rondjes * TWEE_PI;
    const n = Math.max(1, stoelen().length);
    const stap = TWEE_PI / n;
    let laatste = Math.floor(van / stap);
    const t0 = performance.now();
    draait = true;
    (function frame(nu) {
      const t = Math.min(1, (nu - t0) / duur);
      const e = 1 - Math.pow(1 - t, 3);
      steenHoek = van + delta * e;
      zetSteen(steenHoek);
      if (tik) {
        const vak = Math.floor(steenHoek / stap);
        if (vak !== laatste) { laatste = vak; sfx.tick(true); }
      }
      if (t < 1) requestAnimationFrame(frame);
      else { steenHoek = doel; draait = false; klaar(); }
    })(t0);
  });
}

// ---------- De beurt ----------
function bewaarVoorTerug() {
  terug.push(JSON.stringify({ staat: st.staat, cur: st.cur }));
  if (terug.length > 200) terug.shift();
}
// De volgende met de klok mee: eerst wie nog niet aan de beurt was, daarna een tweede kans voor wie paste.
function volgende(vanaf, behalve) {
  const ids = stoelen();
  if (!ids.length) return null;
  const start = Math.max(0, ids.indexOf(vanaf));
  const rij = vanaf == null ? ids : ids.slice(start + 1).concat(ids.slice(0, start + 1));
  return rij.find(id => !st.staat[id] && id !== behalve) || rij.find(id => st.staat[id] === 'pas' && id !== behalve) || null;
}
async function geefAan(id, opties) {
  st.cur = id;
  opslaan();
  if (id == null) {
    toon();
    if (Object.keys(st.staat).length && !volgende(null, null)) sfx.good();
    await rolSteen(null);
    return;
  }
  toon();
  await rolSteen(hoekVan[id], opties);
  startKlok();
  if (!opties?.tik) sfx.join();
}
function verder(pas) {
  if (draait || !stoelen().length) return;
  bewaarVoorTerug();
  const cur = st.cur;
  if (cur) st.staat[cur] = pas ? (st.staat[cur] === 'pas' ? 'pas2' : 'pas') : 'gehad';
  else if (pas) return;
  geefAan(volgende(cur, pas ? cur : null));
}
function vorige() {
  if (draait || !terug.length) return;
  const oud = JSON.parse(terug.pop());
  st.staat = oud.staat;
  geefAan(oud.cur);
}
async function willekeurig() {
  if (draait) return;
  const ids = stoelen();
  let kandidaten = ids.filter(id => !st.staat[id] && id !== st.cur);
  if (!kandidaten.length) kandidaten = ids.filter(id => st.staat[id] === 'pas' && id !== st.cur);
  if (!kandidaten.length) return Ui.melding('Iedereen kreeg de steen al. Start een nieuwe ronde.');
  bewaarVoorTerug();
  if (st.cur) st.staat[st.cur] = 'gehad';
  const doel = kandidaten[Math.floor(Math.random() * kandidaten.length)];
  if (steenHoek == null) steenHoek = -Math.PI / 2;
  st.cur = null;
  toon('De steen kiest…');
  sfx.whoosh();
  await rolSteen(hoekVan[doel], { rondjes: 2, duur: 2600, tik: true });
  sfx.go();
  geefAan(doel);
}
function nieuweRonde() {
  if (draait) return;
  st.staat = {};
  st.cur = null;
  st.ronde = (st.ronde || 1) + 1;
  terug = [];
  opslaan();
  stopKlok();
  steenHoek = null;
  zetSteen(null);
  toon();
}

$('stoelen').addEventListener('click', e => {
  const b = e.target.closest('.kg-stoel');
  if (!b || draait || b.dataset.id === st.cur) return;
  bewaarVoorTerug();
  if (st.cur) st.staat[st.cur] = 'gehad';
  geefAan(b.dataset.id);
});
$('willekeurig').addEventListener('click', willekeurig);
$('nieuwe-ronde').addEventListener('click', nieuweRonde);
$('schud').addEventListener('click', () => {
  if (draait) return;
  st.volgorde = schud(st.volgorde);
  opslaan();
  schik();
});

// ---------- Het midden van de tafel ----------
function toon(bericht) {
  const ids = stoelen();
  const gehad = ids.filter(id => st.staat[id] === 'gehad').length;
  const gepast = ids.filter(id => st.staat[id] === 'pas' || st.staat[id] === 'pas2').length;
  for (const b of $('stoelen').children) {
    const s = st.staat[b.dataset.id] || '';
    b.className = `kg-stoel${b.dataset.id === st.cur ? ' nu' : ''}${s === 'gehad' ? ' gehad' : ''}${s.startsWith('pas') ? ' pas' : ''}`;
  }
  $('ronde-nr').textContent = st.ronde || 1;
  $('vraag').textContent = st.vraag || 'Kies een vraag en geef de steen door.';
  $('vraag').classList.toggle('kg-leeg', !st.vraag);
  $('vraag-kort').textContent = st.vraag || 'Kies een vraag';
  $('spreektijd-tekst').textContent = st.tijd ? (st.tijd < 60 ? `${st.tijd} sec` : `${st.tijd / 60} min`) : 'vrij';
  const naam = $('naam');
  const klaar = ids.length && !st.cur && !volgende(null, null);
  if (bericht) naam.textContent = bericht;
  else if (st.cur) naam.textContent = naamVan(st.cur);
  else if (klaar) naam.textContent = 'De ronde is rond!';
  else naam.textContent = gehad || gepast ? '…' : 'Wie begint?';
  // De naam zo groot als past in het midden van de tafel.
  if (maat) {
    const groot = Math.min(maat.ry * (st.cur && !bericht ? .3 : .17), 110);
    naam.style.fontSize = `${Math.max(18, Math.min(groot, maat.rx * .88 / (Math.max(4, naam.textContent.length) * .72))).toFixed(1)}px`;
  }
  naam.classList.remove('kom');
  void naam.offsetWidth;
  naam.classList.add('kom');
  let info = `${gehad} van ${ids.length} aan het woord geweest`;
  if (gepast) info += ` · ${gepast} gepast`;
  if (!st.cur && !gehad && !gepast) info = 'Druk op spatie of laat de steen kiezen.';
  if (klaar) info = 'Iedereen kreeg de steen. Start een nieuwe ronde of kies een nieuwe vraag.';
  $('info').textContent = info;
  if (!st.cur) stopKlok();
}

// ---------- Spreektijd ----------
let klokEinde = 0;
let klokTimer = 0;
function stopKlok() {
  clearInterval(klokTimer);
  klokTimer = 0;
  $('klok').classList.add('hidden');
  $('tijd').classList.add('hidden');
  $('klok').classList.remove('op', 'bijna');
}
function startKlok() {
  stopKlok();
  if (!st.tijd || !st.cur) return;
  klokEinde = performance.now() + st.tijd * 1000;
  $('klok').classList.remove('hidden');
  $('tijd').classList.remove('hidden');
  let vorig = -1;
  const tik = () => {
    const rest = Math.max(0, (klokEinde - performance.now()) / 1000);
    $('klok-rest').style.strokeDashoffset = String(100 - rest / st.tijd * 100);
    const sec = Math.ceil(rest);
    $('klok').classList.toggle('bijna', sec <= 5 && sec > 0);
    if (sec !== vorig) {
      vorig = sec;
      $('tijd').textContent = sec ? mmss(sec) : 'Tijd!';
      if (sec <= 5 && sec > 0) sfx.tick(false);
    }
    if (!rest) {
      clearInterval(klokTimer);
      $('klok').classList.add('op');
      sfx.gong();
    }
  };
  tik();
  klokTimer = setInterval(tik, 200);
}
$('spreektijd').addEventListener('click', () => {
  st.tijd = TIJDEN[(TIJDEN.indexOf(st.tijd) + 1) % TIJDEN.length];
  opslaan();
  toon();
  startKlok();
});

// ---------- Vragen ----------
function toonVragen() {
  const knop = v => `<button class="${v === st.vraag ? 'on' : ''}" data-vraag="${esc(v)}">${esc(v)}</button>`;
  let html = '';
  if (eigen.length) html += `<h3>Jouw vragen</h3><div class="kg-vragen">${eigen.map(v => `<span class="kg-eigen-rij">${knop(v)}<button class="kg-weg" data-weg="${esc(v)}" title="Uit je lijst" aria-label="Uit je lijst">${Ui.ic('kruis')}</button></span>`).join('')}</div>`;
  for (const [groep, vragen] of VRAGEN) html += `<h3>${groep}</h3><div class="kg-vragen">${vragen.map(knop).join('')}</div>`;
  $('vraag-lijst').innerHTML = html;
}
function kiesVraag(v) {
  st.vraag = v;
  opslaan();
  toon();
  $('vraag-venster').close();
}
$('kies-vraag').addEventListener('click', () => {
  toonVragen();
  $('eigen-vraag').value = '';
  $('vraag-venster').showModal();
});
$('vraag-dicht').addEventListener('click', () => $('vraag-venster').close());
$('vraag-lijst').addEventListener('click', e => {
  const weg = e.target.closest('[data-weg]');
  if (weg) {
    eigen = eigen.filter(v => v !== weg.dataset.weg);
    bewaar('lancelot-kg-eigen', eigen);
    return toonVragen();
  }
  const b = e.target.closest('[data-vraag]');
  if (b) kiesVraag(b.dataset.vraag);
});
$('eigen-vorm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('eigen-vraag').value.trim();
  if (!v) return;
  eigen = [v, ...eigen.filter(x => x !== v)].slice(0, 12);
  bewaar('lancelot-kg-eigen', eigen);
  kiesVraag(v);
});

// ---------- Toetsen ----------
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'arrowright') verder(false);
  else if (k === 'arrowleft') vorige();
  else if (k === 'p') verder(true);
  else if (k === 'r') willekeurig();
  else if (k === 'v') $('kies-vraag').click();
  else if (k === 't') $('spreektijd').click();
  else return;
  e.preventDefault();
  document.activeElement?.blur?.();
});

toon();
