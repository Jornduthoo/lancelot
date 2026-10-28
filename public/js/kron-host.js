// De Kronieken: de methodes van de leerkracht per vak en blok, met per les de knoppen naar het lesmateriaal.
// Links de mappen (eigen mappen + de mappen van je quizzen en oefenbladen), rechts de boeken en lessen van de open map.
// Een les = de quizzen en oefenbladen met een titel die begint met "Les 12", plus de voorkennisquiz in Voorkennis/<map>.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const sorteer = (a, b) => a.localeCompare(b, 'nl', { numeric: true });
const BEWAAR = 'lancelot-kronieken-map';
// Deze mappen horen bij een les uit een andere map, of bij een spel: niet als vak in de boom.
const APART = /^(Voorkennis|Hofschilder)(\/|$)/i;

const kr = { lijst: { mappen: [], bestanden: [], lessen: {} }, quizzen: [], bladen: [], quizMappen: [], bladMappen: [], hier: '', open: new Set() };
try { kr.hier = localStorage.getItem(BEWAAR) || ''; } catch {}
try { for (const m of JSON.parse(localStorage.getItem(`${BEWAAR}-open`) || '[]')) kr.open.add(m); } catch {}

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host#kronieken'; });

let tekenKlaar = 0;
const later = () => {
  cancelAnimationFrame(tekenKlaar);
  tekenKlaar = requestAnimationFrame(teken);
};
// /kronieken?map=…&naam=…&pagina=… (vanuit De Zonnewijzer): dat boek meteen open, op die pagina.
const vraag = new URLSearchParams(location.search);
let meteen = vraag.get('naam') ? { map: vraag.get('map') || '', naam: vraag.get('naam'), pagina: Number(vraag.get('pagina')) || 0 } : null;
function openMeteen() {
  if (!meteen) return;
  const b = kr.lijst.bestanden.find(x => x.map === meteen.map && x.naam === meteen.naam);
  if (!b) return;
  const p = meteen.pagina;
  meteen = null;
  history.replaceState(null, '', '/kronieken');
  gaNaar(b.map);
  openBoek(b, p);
}
socket.on('kr-lijst', l => { kr.lijst = l; later(); openMeteen(); });
socket.on('quizzes', l => { kr.quizzen = l; later(); });
socket.on('ob-sheets', l => { kr.bladen = l; later(); });
socket.on('quiz-folders', l => { kr.quizMappen = l; later(); });
socket.on('ob-folders', l => { kr.bladMappen = l; later(); });
socket.on('connect', () => socket.emit('kr-lijst', null, res => {
  if (!res || !res.ok) return;
  kr.lijst = res;
  later();
  openMeteen();
}));

function alleMappen() {
  const s = new Set(kr.lijst.mappen);
  for (const m of [...kr.quizMappen, ...kr.bladMappen]) if (!APART.test(m)) s.add(m);
  for (const it of [...kr.quizzen, ...kr.bladen]) if (it.folder && !APART.test(it.folder)) s.add(it.folder);
  for (const p of [...s]) for (let i = p.indexOf('/'); i > 0; i = p.indexOf('/', i + 1)) s.add(p.slice(0, i));
  return [...s].sort(sorteer);
}

const ouder = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const basis = p => p.slice(p.lastIndexOf('/') + 1);

function gaNaar(map) {
  kr.hier = map;
  for (let p = ouder(map); p; p = ouder(p)) kr.open.add(p);
  if (map) kr.open.add(map);
  try {
    localStorage.setItem(BEWAAR, map);
    localStorage.setItem(`${BEWAAR}-open`, JSON.stringify([...kr.open]));
  } catch {}
  teken();
}

// ---------- Tekenen ----------

function teken() {
  const mappen = alleMappen();
  if (kr.hier && !mappen.includes(kr.hier)) kr.hier = '';
  tekenBoom(mappen);
  tekenPad();
  tekenSubmappen(mappen);
  tekenBoeken();
  tekenLessen();
}

function tekenBoom(mappen) {
  const doos = $('kr-mappen');
  doos.textContent = '';
  const tel = map => kr.lijst.bestanden.filter(b => b.map === map || b.map.startsWith(`${map}/`)).length;
  const rij = (map, diep) => {
    const kinderen = mappen.filter(m => ouder(m) === map);
    const r = el('div', `kr-map${kr.hier === map ? ' on' : ''}`);
    r.style.setProperty('--diep', diep);
    const pijl = el('button', 'kr-pijl', kinderen.length ? (kr.open.has(map) || !map ? '▾' : '▸') : '');
    pijl.type = 'button';
    pijl.tabIndex = kinderen.length ? 0 : -1;
    pijl.setAttribute('aria-label', 'Open of dicht');
    pijl.addEventListener('click', e => {
      e.stopPropagation();
      if (kr.open.has(map)) kr.open.delete(map); else kr.open.add(map);
      try { localStorage.setItem(`${BEWAAR}-open`, JSON.stringify([...kr.open])); } catch {}
      tekenBoom(alleMappen());
    });
    const naam = el('button', 'kr-map-naam');
    naam.type = 'button';
    naam.innerHTML = map ? `${Ui.ic('map')} ` : '📚 ';
    naam.append(map ? basis(map) : 'Alle methodes');
    const n = map ? tel(map) : kr.lijst.bestanden.length;
    if (n) naam.append(el('em', 'kr-tel', String(n)));
    naam.addEventListener('click', () => gaNaar(map));
    r.append(pijl, naam);
    doos.append(r);
    if (map && !kr.open.has(map)) return;
    for (const k of kinderen) rij(k, diep + 1);
  };
  rij('', 0);
}

function tekenPad() {
  const pad = $('kr-pad');
  pad.textContent = '';
  const knop = (tekst, map) => {
    const b = el('button', 'kr-kruimel', tekst);
    b.type = 'button';
    b.addEventListener('click', () => gaNaar(map));
    return b;
  };
  pad.append(knop('📚 Alle methodes', ''));
  let p = '';
  for (const deel of kr.hier.split('/').filter(Boolean)) {
    p = p ? `${p}/${deel}` : deel;
    pad.append(el('span', 'kr-sep', '›'), knop(deel, p));
  }
  $('kr-drop-map').textContent = kr.hier || 'Alle methodes';
}

function tekenSubmappen(mappen) {
  const doos = $('kr-submappen');
  doos.textContent = '';
  for (const m of mappen.filter(x => ouder(x) === kr.hier)) {
    const b = el('button', 'kr-submap');
    b.type = 'button';
    b.innerHTML = Ui.ic('map');
    b.append(el('strong', '', basis(m)));
    const lessen = lessenVan(m).length;
    const boeken = kr.lijst.bestanden.filter(x => x.map === m || x.map.startsWith(`${m}/`)).length;
    const info = [boeken ? `${boeken} ${boeken === 1 ? 'boek' : 'boeken'}` : '', lessen ? `${lessen} lessen` : ''].filter(Boolean).join(' · ');
    if (info) b.append(el('span', 'muted small', info));
    b.addEventListener('click', () => gaNaar(m));
    doos.append(b);
  }
  if (kr.hier && !lessenVan(kr.hier).length && !kr.lijst.bestanden.some(b => b.map === kr.hier)) {
    const leeg = mappen.filter(x => ouder(x) === kr.hier).length === 0 && kr.lijst.mappen.includes(kr.hier);
    if (leeg) {
      const weg = el('button', 'secondary small', 'Lege map verwijderen');
      weg.type = 'button';
      weg.addEventListener('click', async () => {
        if (!await Ui.vraag(`De lege map "${basis(kr.hier)}" verwijderen?`)) return;
        socket.emit('kr-map-weg', { map: kr.hier }, res => {
          $('kr-fout').textContent = res.error || '';
          if (!res.error) gaNaar(ouder(kr.hier));
        });
      });
      doos.append(weg);
    }
  }
}

const mb = n => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);
const sleutel = Lessen.sleutel;
const zonderExt = n => n.replace(/\.[^.]+$/, '');

function tekenBoeken() {
  const doos = $('kr-boeken');
  doos.textContent = '';
  const hier = kr.lijst.bestanden.filter(b => b.map === kr.hier);
  $('kr-boeken-leeg').classList.toggle('hidden', hier.length > 0);
  $('kr-boeken-tel').textContent = hier.length ? `(${hier.length})` : '';
  for (const b of hier) {
    const kaart = el('div', 'kr-boek');
    const open = el('button', 'kr-boek-open');
    open.type = 'button';
    open.title = 'Openen op het bord';
    open.append(el('span', 'kr-boek-rug', b.soort === 'pdf' ? '📖' : '🖼'));
    const tekst = el('span', 'kr-boek-tekst');
    tekst.append(el('strong', '', zonderExt(b.naam)));
    tekst.append(el('span', 'muted small', b.soort === 'pdf' ? `${b.pagina > 1 ? `verder op p. ${b.pagina} · ` : ''}${mb(b.grootte)}` : `afbeelding · ${mb(b.grootte)}`));
    open.append(tekst);
    open.addEventListener('click', () => openBoek(b));
    const weg = el('button', 'secondary icon kr-weg');
    weg.type = 'button';
    weg.title = 'Verwijderen';
    weg.setAttribute('aria-label', `${b.naam} verwijderen`);
    weg.innerHTML = Ui.ic('kruis');
    weg.addEventListener('click', async () => {
      if (!await Ui.vraag(`"${zonderExt(b.naam)}" uit De Kronieken verwijderen? Het gaat naar de prullenbak in de map kronieken.`, { ja: 'Verwijderen', gevaar: true })) return;
      socket.emit('kr-weg', { map: b.map, naam: b.naam }, res => { $('kr-fout').textContent = res.error || ''; });
    });
    kaart.append(open, weg);
    doos.append(kaart);
  }
}

// ---------- Lessen ----------

const lessenVan = map => Lessen.van(map, { quizzen: kr.quizzen, bladen: kr.bladen, kronieken: kr.lijst });

function tekenLessen() {
  const doos = $('kr-lessen');
  doos.textContent = '';
  const lessen = lessenVan(kr.hier);
  $('kr-lessen-paneel').classList.toggle('hidden', !kr.hier);
  $('kr-lessen-leeg').classList.toggle('hidden', lessen.length > 0);
  for (const l of lessen) {
    const rij = el('div', 'kr-les');
    const kop = el('div', 'kr-les-kop');
    kop.append(el('span', 'kr-les-nr', `Les ${l.nr}`), el('span', 'kr-les-titel', l.titel || ''));
    const knoppen = el('div', 'kr-les-knoppen');
    for (const link of l.links) {
      const b = link.bestand;
      const groep = el('span', 'kr-link');
      const open = el('button', 'secondary kr-link-open', `📖 ${zonderExt(b.naam)} · p. ${link.pagina}`);
      open.type = 'button';
      open.title = 'Het boek openen op deze pagina';
      open.addEventListener('click', () => openBoek(b, link.pagina));
      const los = el('button', 'kr-link-los');
      los.type = 'button';
      los.title = 'Koppeling weghalen';
      los.setAttribute('aria-label', 'Koppeling weghalen');
      los.innerHTML = Ui.ic('kruis');
      los.addEventListener('click', () => socket.emit('kr-ontkoppel', { map: kr.hier, les: l.nr, boek: link.boek }, res => { $('kr-fout').textContent = res.error || ''; }));
      groep.append(open, los);
      knoppen.append(groep);
    }
    const knop = (tekst, titel, cls, klik) => {
      const b = el('button', cls, tekst);
      b.type = 'button';
      b.title = titel;
      b.addEventListener('click', klik);
      knoppen.append(b);
    };
    if (l.voorkennis) knop('🎯 Voorkennis', 'De voorkennisquiz van deze les starten in het Toernooi', 'secondary', () => { location.href = Lessen.link.quiz(l.voorkennis); });
    if (l.quiz) knop('⚔ Quiz', 'De quiz van deze les starten in het Toernooi', 'secondary', () => { location.href = Lessen.link.quiz(l.quiz); });
    if (l.blad) knop('📝 Oefenblad', 'Het oefenblad live starten', 'secondary', () => { location.href = Lessen.link.blad(l.blad); });
    if (l.xl) knop('📝 XL', 'Het lange oefenblad live starten', 'secondary', () => { location.href = Lessen.link.blad(l.xl); });
    if (l.blad || l.xl) knop('🖨', 'Het oefenblad afdrukken', 'secondary icon', () => window.open(Lessen.link.print(l.blad || l.xl), '_blank'));
    rij.append(kop, knoppen);
    doos.append(rij);
  }
}

// ---------- Mappen en boeken toevoegen ----------

$('kr-nieuw-map').addEventListener('click', () => {
  $('kr-map-form').classList.remove('hidden');
  $('kr-map-naam').value = '';
  $('kr-map-naam').placeholder = kr.hier ? 'bijv. Blok 3 of Thema 2' : 'bijv. Rekenen of Muzo';
  $('kr-map-naam').focus();
});
$('kr-map-annuleer').addEventListener('click', () => $('kr-map-form').classList.add('hidden'));
$('kr-map-form').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('kr-map-naam').value.replace(/\//g, '-').trim();
  if (!naam) return;
  const map = kr.hier ? `${kr.hier}/${naam}` : naam;
  socket.emit('kr-map', { map }, res => {
    $('kr-fout').textContent = res.error || '';
    if (res.error) return;
    $('kr-map-form').classList.add('hidden');
    gaNaar(res.map);
  });
});

const TOEGELATEN = /\.(pdf|png|jpe?g|webp)$/i;

// Eén voor één versturen, met de voortgang erbij: een bordboek van 30 MB is op het eigen netwerk toch even bezig.
async function voegToe(bestanden) {
  const lijst = [...bestanden].filter(f => TOEGELATEN.test(f.name));
  const overgeslagen = bestanden.length - lijst.length;
  $('kr-fout').textContent = overgeslagen ? `${overgeslagen} ${overgeslagen === 1 ? 'bestand is' : 'bestanden zijn'} overgeslagen: enkel pdf en afbeeldingen (png, jpg, webp).` : '';
  const map = kr.hier;
  for (const [i, f] of lijst.entries()) {
    const label = `${lijst.length > 1 ? `${i + 1}/${lijst.length} · ` : ''}${f.name}`;
    try {
      await stuur(f, map, pct => { $('kr-bezig').textContent = `Toevoegen: ${label} · ${pct}%`; });
    } catch (err) {
      $('kr-fout').textContent = `${f.name}: ${err.message}`;
    }
  }
  $('kr-bezig').textContent = lijst.length ? `${lijst.length === 1 ? 'Toegevoegd' : `${lijst.length} bestanden toegevoegd`}${map ? ` aan ${map}` : ''}.` : '';
}

function stuur(f, map, voortgang) {
  return new Promise((klaar, fout) => {
    const x = new XMLHttpRequest();
    x.open('POST', `/kronieken/toevoegen?${new URLSearchParams({ map, naam: f.name })}`);
    x.upload.onprogress = e => e.lengthComputable && voortgang(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let res = {};
      try { res = JSON.parse(x.responseText); } catch {}
      if (x.status === 200 && res.ok) klaar(res);
      else fout(new Error(res.error || (x.status === 413 ? 'Het bestand is te groot.' : 'Toevoegen lukte niet.')));
    };
    x.onerror = () => fout(new Error('Geen verbinding met LANcelot.'));
    x.send(f);
  });
}

$('kr-bestand').addEventListener('change', e => {
  voegToe(e.target.files);
  e.target.value = '';
});

// Slepen: overal op de pagina, in de open map.
let sleep = 0;
const heeftBestanden = e => [...(e.dataTransfer && e.dataTransfer.types) || []].includes('Files');
document.addEventListener('dragenter', e => {
  if (!heeftBestanden(e) || !$('kr-lezer').classList.contains('hidden')) return;
  sleep++;
  $('kr-drop').classList.remove('hidden');
});
document.addEventListener('dragleave', e => {
  if (!heeftBestanden(e)) return;
  if (--sleep <= 0) {
    sleep = 0;
    $('kr-drop').classList.add('hidden');
  }
});
document.addEventListener('dragover', e => { if (heeftBestanden(e)) e.preventDefault(); });
document.addEventListener('drop', e => {
  if (!heeftBestanden(e)) return;
  e.preventDefault();
  sleep = 0;
  $('kr-drop').classList.add('hidden');
  if ($('kr-lezer').classList.contains('hidden')) voegToe(e.dataTransfer.files);
});

// ---------- Openen ----------

function openBoek(b, pagina) {
  const lessen = lessenVan(b.map || kr.hier).map(l => ({ nr: l.nr, titel: l.titel }));
  const start = () => window.Lezer.open({
    map: b.map,
    naam: b.naam,
    soort: b.soort,
    titel: zonderExt(b.naam),
    pagina: pagina || b.pagina || 1,
    lessen,
    lesMap: b.map || kr.hier,
    bijPagina: p => {
      b.pagina = p;
      socket.emit('kr-pagina', { map: b.map, naam: b.naam, pagina: p });
    },
    dicht: later,
    koppel: (les, p, klaar) => socket.emit('kr-koppel', { map: b.map || kr.hier, les, boek: sleutel(b), pagina: p }, klaar),
  });
  if (window.Lezer) start();
  else window.addEventListener('lezer-klaar', start, { once: true });
}
