// LANcelot Junior voor de leerkracht: een spel kiezen, kiezen hoe de klas speelt, en volgen wie er al geweest is.
// Op het bord speelt de klas in 4 kleurteams. Met tablets ziet de leerkracht live wie speelt en wie al geweest is.
// De knop LANcelot in de titelbalk brengt je terug naar LANcelot: dezelfde klas, dezelfde gegevens.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const J = () => window.JR || { zin: {}, spellen: [] };
const GROEPEN = [['getallen', '🔢 Getallen en rekenen'], ['meten', '📏 Meten en tijd'], ['meetkunde', '🔷 Vormen en ruimte'], ['taal', '🔤 Taal en klanken'], ['wereld', '🌍 De wereld'], ['samen', '💃 Samen en gevoel'], ['eigen', '✨ Mijn eigen vragen']];
const VIEWS = ['thuis', 'spelen', 'klas', 'opvolgen', 'maken'];
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
  stand.draak = d;
  for (const id of ['jr-draak-foto', 'jr-loopt-draak', 'jr-mini-draak']) $(id).src = draakImg();
  $('jr-groei').style.width = `${d.tot}%`;
  $('jr-mini-groei').style.width = `${d.tot}%`;
  $('jr-mini-naam').textContent = d.naam || 'Het klasdraakje';
  $('jr-groei-tekst').textContent = d.fase >= d.fasen ? `${d.eten} hapjes. Het draakje is een echte ridderdraak!` : `Fase ${d.fase} van ${d.fasen}. Nog ${100 - d.tot}% tot de volgende fase.`;
  if (document.activeElement !== $('jr-draak-naam')) $('jr-draak-naam').value = d.naam || '';
}
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
  gekozen = { spel: s.id, niveau: 0, manier: s.bordAlleen ? 'bord' : manier };
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
  socket.emit('jr-start', gekozen, res => {
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

// ---------- De klas en hun dieren ----------
function klas() {
  $('jr-tel-klas').textContent = `${kinderen.length} kinderen`;
  const box = $('jr-klas-rooster');
  box.innerHTML = '';
  $('jr-klas-leeg').classList.toggle('hidden', kinderen.length > 0);
  for (const k of kinderen) {
    const d = document.createElement('div');
    d.className = 'jr-klas-kind';
    d.innerHTML = `<button type="button" class="jr-klas-beeld" title="${k.eigen ? 'Eigen symbool' : 'Tik om een ander dier te geven'}"><img src="${k.beeld}" alt=""></button><span>${Junior.esc(k.naam)}</span><em>${k.stickers ? `🏅 ${k.stickers}` : ''}</em>`
      + `<span class="jr-klas-knoppen"><button type="button" class="jr-sym" title="Eigen symbooltje opladen (zoals aan de kapstok)">📷</button>${k.eigen ? '<button type="button" class="jr-sym-weg" title="Terug naar een dier">✕</button>' : ''}</span>`;
    d.querySelector('.jr-klas-beeld').addEventListener('click', () => {
      if (k.eigen) return;
      socket.emit('jr-dier', { id: k.id }, res => { if (res && res.kinderen) { kinderen = res.kinderen; klas(); } });
    });
    d.querySelector('.jr-sym').addEventListener('click', () => kiesSymbool(k));
    const weg = d.querySelector('.jr-sym-weg');
    if (weg) weg.addEventListener('click', () => stuurSymbool(k, ''));
    box.appendChild(d);
  }
}
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
$('jr-print').addEventListener('click', () => {
  const blad = $('jr-printblad');
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
function teams() {
  $('jr-teams').innerHTML = TEAMKLEUR.map((kl, i) => `<div class="jr-team jr-team-${kl} ${bord && bord.team === i ? 'aan' : ''}"><b>${(J().zin.teams || [])[i] || ''}</b><span>${'⭐'.repeat(Math.min(10, stand.teams ? stand.teams[i] : 0))}</span></div>`).join('');
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
        if (res && res.draak) toonDraak(res.draak);
        if (res && res.gegroeid) { try { confetti(3000); } catch {} Junior.Stem.zeg([J().zin.groei]); }
        bord.team = (bord.team + 1) % 4;
        setTimeout(bordVraag, res && res.gegroeid ? 2600 : 300);
      });
    },
  });
}

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
  $('jr-start').classList.toggle('hidden', loopt);
  $('jr-loopt').classList.toggle('hidden', !loopt);
  $('jr-status').textContent = loopt ? stand.naam : 'Het klasdraakje';
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
  const MANIER = { bord: 'Op het bord, 4 teams', duo: 'Met twee op een tablet', beurt: 'Om de beurt' };
  $('jr-loopt-sub').textContent = `${stand.niveauNaam || ''} · ${MANIER[stand.manier] || ''}`;
  const isDans = stand.spel === 'dans';
  const isKring = stand.spel === 'kring';
  const opBord = stand.manier === 'bord' && !isDans && !isKring;
  $('jr-dans').classList.toggle('hidden', !isDans);
  $('jr-kring-bord').classList.toggle('hidden', !isKring);
  $('jr-bord').classList.toggle('hidden', !opBord);
  $('jr-tablets').classList.toggle('hidden', opBord || isDans || (isKring && stand.manier === 'bord'));
  if (opBord && (!bord || bord.seed !== stand.seed)) {
    bord = { seed: stand.seed, r: Junior.toeval(stand.seed), team: 0, huidig: null };
    Junior.schaal($('jr-bord-vak'));
    bordVraag();
  }
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
}
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
      if (!c || !c.n) return '<td class="leeg">·</td>';
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
      + `<div class="jr-bw-opties">${v.opties.map((o, oi) => `<label class="jr-bw-optie ${oi === v.juist ? 'juist' : ''}"><input type="radio" name="jr-juist-${vi}" ${oi === v.juist ? 'checked' : ''} title="Dit is het juiste antwoord"><input class="jr-bw-e" maxlength="16" placeholder="🙂"><input class="jr-bw-w" maxlength="30" placeholder="woord"></label>`).join('')}</div>`;
    const tekst = d.querySelector('.jr-bw-tekst');
    tekst.value = v.vraag;
    tekst.addEventListener('input', () => { v.vraag = tekst.value; });
    d.querySelector('.jr-bw-zeg').addEventListener('click', () => Junior.Stem.zeg([v.vraag]));
    d.querySelector('.jr-bw-weg').addEventListener('click', () => { bezig.vragen.splice(vi, 1); vragenLijst(); });
    d.querySelectorAll('.jr-bw-optie').forEach((lab, oi) => {
      const o = v.opties[oi];
      const [r, e, w] = lab.querySelectorAll('input');
      e.value = o.e;
      w.value = o.w;
      e.addEventListener('input', () => { o.e = e.value; });
      w.addEventListener('input', () => { o.w = w.value; });
      r.addEventListener('change', () => { v.juist = oi; d.querySelectorAll('.jr-bw-optie').forEach((x, i) => x.classList.toggle('juist', i === oi)); });
    });
    box.appendChild(d);
  });
}
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
const maakArg = () => ({ onderwerp: $('jr-maak-onderwerp').value, aantal: Number($('jr-maak-aantal').value) });
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
socket.on('jr-kinderen', res => { kinderen = res.kinderen || []; klas(); });
socket.on('jr-draak', d => toonDraak(d));
socket.on('jr-kring', k => stand.spel === 'kring' && kringToon(k));
socket.on('addresses', list => {
  if (!list || !list.length) return;
  for (const id of ['jr-qr', 'jr-qr-groot']) $(id).innerHTML = list[0].qr;
  for (const id of ['jr-url', 'jr-qr-url']) $(id).textContent = list[0].url;
});
$('jr-qr-knop').addEventListener('click', () => $('jr-qr-venster').showModal());
$('jr-qr-dicht').addEventListener('click', () => $('jr-qr-venster').close());
tegels();
toonView(location.hash.slice(1) || 'thuis');
