// De Zonnewijzer: lesroosters, de weekplanning en "Vandaag" op het bord.
// Een les staat op een plek "dag-lesuur" (1-0 = maandag, eerste lesuur). Het rooster van de week zegt welk vak daar hoort
// en hoe laat het is. Een les uit De Kronieken brengt haar quiz, oefenblad, voorkennis en boekpagina mee.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
const KORT = ['ma', 'di', 'wo', 'do', 'vr'];

const zw = { roosters: [], standaard: '', week: '', weekData: { lessen: {}, rooster: '' }, vandaag: '', dag: 1, gekozen: null, bron: { quizzen: [], bladen: [], kronieken: { bestanden: [], lessen: {} } }, bewerk: null, rb: null };

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host#kronieken'; });

// ---------- Vakken: een icoon en een kleur, zodat de dag in één oogopslag leesbaar is ----------

const VAKKEN = [
  [/reken|wiskunde|getal|meten|meetkunde/, '🧮', 'cyan'], [/spelling|schrijf/, '✏️', 'paars'], [/lezen|lees|bib/, '📚', 'groen'],
  [/taal|nederlands/, '📖', 'blauw'], [/frans/, '🥐', 'rood'], [/engels/, '💂', 'rood'], [/wo|wereld|natuur|techniek|aardrijk|geschied/, '🌍', 'groen'],
  [/muzo|muzisch|muziek|beeld|drama|kunst|tekenen/, '🎨', 'oranje'], [/^lo\b|turnen|zwem|sport|beweg/, '⚽', 'oranje'], [/godsdienst|rkg|zedenleer|levensb/, '🕊️', 'goud'],
  [/ict|computer|media/, '💻', 'cyan'], [/sel\b|kring|welbevinden|klasraad|evaluatie|vragen/, '💬', 'goud'], [/onthaal|ochtend/, '👋', 'goud'], [/contract|weektaak|hoekenwerk/, '📋', 'paars'], [/project|atelier|hoek/, '🧩', 'paars'],
];
function vakStijl(vak) {
  const v = String(vak || '').toLowerCase();
  const hit = VAKKEN.find(([re]) => re.test(v));
  return hit ? { icoon: hit[1], kleur: hit[2] } : { icoon: v ? '📘' : '·', kleur: 'muted' };
}

// Een pictogram bij een succescriterium, naar het werkwoord.
const PICTO = [
  [/\b(lees|lezen|leest)\b/, '📖'], [/\b(schrijf|schrijven|noteer|spel)/, '✍️'], [/\b(reken|bereken|tel|optellen|aftrekken|vermenigvuldig|deel|deling)/, '🧮'],
  [/\b(teken|meet|construeer)/, '📐'], [/\b(leg uit|uitleggen|verwoord|vertel|zeg|bespreek|antwoord)/, '💬'], [/\b(luister|begrijp)/, '👂'],
  [/\b(vergelijk|onderscheid|sorteer|ordenen|rangschik)/, '⚖️'], [/\b(ken|weet|onthoud|benoem)/, '🧠'], [/\b(zoek|onderzoek|vind)/, '🔎'],
  [/\b(maak|bouw|ontwerp)/, '🛠️'], [/\b(gebruik|pas .* toe|toepassen)/, '🧰'],
];
const picto = t => (PICTO.find(([re]) => re.test(String(t).toLowerCase())) || [0, '⭐'])[1];

// ---------- Weken en dagen ----------

function maandag(id) {
  const [j, n] = id.split('-W').map(Number);
  const vier = new Date(j, 0, 4);
  const d = new Date(vier);
  d.setDate(vier.getDate() - ((vier.getDay() + 6) % 7) + (n - 1) * 7);
  return d;
}
function weekVan(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const j = t.getUTCFullYear();
  const n = 1 + Math.round((t - Date.UTC(j, 0, 4)) / 864e5 / 7 - (3 - ((new Date(Date.UTC(j, 0, 4)).getUTCDay() + 6) % 7)) / 7);
  return `${j}-W${String(n).padStart(2, '0')}`;
}
const plusDagen = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const datum = d => d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' });
const vandaagDag = () => Math.min(5, Math.max(1, ((new Date().getDay() + 6) % 7) + 1));

function rooster() {
  return zw.roosters.find(r => r.id === zw.weekData.rooster) || zw.roosters.find(r => r.id === zw.standaard) || zw.roosters[0];
}

// De uren van één dag met hun lesuurnummer (pauzes hebben er geen). Elke dag heeft zijn eigen tijden.
function dagUren(r, d) {
  let n = 0;
  return ((r && r.dagen && r.dagen[d]) || []).map(u => ({ ...u, les: u.soort === 'les' ? n++ : -1 }));
}
const vakOp = (r, d, u) => (dagUren(r, d).find(x => x.les === u) || {}).vak || '';
// Alle vakken uit het rooster, het vaakst eerst.
function roosterVakken(r) {
  const tel = new Map();
  for (let d = 1; d <= 5; d++) for (const u of dagUren(r, d)) if (u.soort === 'les' && u.vak) tel.set(u.vak, (tel.get(u.vak) || 0) + 1);
  return [...tel.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

// ---------- Laden ----------

function laad(week = zw.week) {
  socket.emit('zw-get', { week }, res => {
    if (!res || res.error) return ($('zw-fout').textContent = (res && res.error) || 'Laden lukte niet.');
    zw.roosters = res.roosters;
    zw.standaard = res.standaard;
    zw.weekData = res.weekData;
    zw.week = week;
    zw.vandaag = res.vandaag;
    zw.mijn = res.mijnLessen || [];
    if (!zw.rb || !zw.roosters.some(r => r.id === zw.rb.id)) kiesRooster((rooster() || {}).id);
    teken();
  });
}
socket.on('connect', () => laad(zw.week || weekVan(new Date())));
socket.on('zw-gewijzigd', () => laad());
socket.on('quizzes', l => { zw.bron.quizzen = l; teken(); });
socket.on('ob-sheets', l => { zw.bron.bladen = l; teken(); });
socket.on('kr-lijst', l => { zw.bron.kronieken = l; teken(); });
socket.on('connect', () => socket.emit('kr-lijst', null, res => { if (res && res.ok) { zw.bron.kronieken = res; teken(); } }));

zw.week = weekVan(new Date());
zw.dag = vandaagDag();

function teken() {
  tekenVandaag();
  tekenWeek();
  tekenVakken();
}

// ---------- Vandaag ----------

function lesInfo(les) {
  if (!les || !les.map || !les.nr) return null;
  return Lessen.van(les.map, zw.bron).find(l => l.nr === les.nr) || null;
}

const nuMinuten = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const min = t => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return h * 60 + m;
};

function tekenVandaag() {
  const r = rooster();
  const ma = maandag(zw.week);
  const dag = plusDagen(ma, zw.dag - 1);
  const isVandaag = zw.week === weekVan(new Date()) && zw.dag === vandaagDag() && new Date().getDay() % 6 !== 0;
  $('zw-dagnaam').textContent = `${DAGEN[zw.dag - 1]} ${datum(dag)}`;
  $('zw-dag-rooster').textContent = r ? r.naam : '';
  const lijst = $('zw-tijdlijn');
  lijst.textContent = '';
  const nu = nuMinuten();
  let nuSlot = null;
  for (const u of dagUren(r, zw.dag)) {
    const li = el('li', `zw-uur ${u.soort}`);
    const tijd = el('span', 'zw-tijd', u.van ? `${u.van}` : '');
    if (u.soort === 'pauze') {
      li.append(tijd, el('span', 'zw-pauze', `☕ ${u.vak || 'pauze'}`));
      lijst.append(li);
      continue;
    }
    const slot = `${zw.dag}-${u.les}`;
    const vak = u.vak;
    const les = zw.weekData.lessen[slot];
    const st = vakStijl((les && les.vak) || vak);
    if (isVandaag && u.van && u.tot && nu >= min(u.van) && nu < min(u.tot)) {
      li.classList.add('nu');
      nuSlot = nuSlot || slot;
    }
    if (isVandaag && u.tot && nu >= min(u.tot)) li.classList.add('voorbij');
    const knop = el('button', `zw-uur-knop kleur-${st.kleur}`);
    knop.type = 'button';
    knop.append(el('span', 'zw-icoon', st.icoon));
    const t = el('span', 'zw-uur-tekst');
    t.append(el('strong', '', (les && les.vak) || vak || 'Vrij'));
    if (les && les.titel) t.append(el('span', '', les.titel));
    knop.append(t);
    if (les && les.criteria.length) knop.append(el('span', 'zw-af', `${les.af.length}/${les.criteria.length}`));
    knop.addEventListener('click', () => { zw.gekozen = slot; tekenVandaag(); });
    li.append(tijd, knop);
    li.dataset.slot = slot;
    lijst.append(li);
  }
  // Welke les staat groot? De gekozen, anders die van nu, anders de eerste met iets gepland.
  const sloten = [...lijst.querySelectorAll('[data-slot]')].map(x => x.dataset.slot);
  if (!sloten.includes(zw.gekozen)) zw.gekozen = nuSlot || sloten.find(s => zw.weekData.lessen[s]) || sloten[0] || null;
  for (const li of lijst.querySelectorAll('[data-slot]')) li.classList.toggle('on', li.dataset.slot === zw.gekozen);
  tekenNu(r);
}

function tekenNu(r) {
  const kaart = $('zw-nu');
  kaart.textContent = '';
  const slot = zw.gekozen;
  if (!slot || !r) {
    kaart.append(el('p', 'muted', 'Op deze dag staan geen lesuren in je rooster.'));
    return;
  }
  const [d, u] = slot.split('-').map(Number);
  const vak = vakOp(r, d, u);
  const les = zw.weekData.lessen[slot];
  const st = vakStijl((les && les.vak) || vak);
  kaart.className = `panel zw-nu kleur-${st.kleur}`;
  const kop = el('div', 'zw-nu-kop');
  kop.append(el('span', 'zw-nu-icoon', st.icoon));
  const titel = el('div');
  titel.append(el('div', 'zw-nu-vak', (les && les.vak) || vak || 'Vrij lesuur'));
  titel.append(el('h2', '', (les && les.titel) || (les ? '' : 'Nog niets gepland')));
  kop.append(titel);
  const plan = el('button', 'secondary', les ? '✏️ Aanpassen' : '➕ Plannen');
  plan.type = 'button';
  plan.addEventListener('click', () => openEditor(slot));
  kop.append(plan);
  kaart.append(kop);
  if (!les) return;
  if (les.doel || les.doelen.length) {
    const doel = el('div', 'zw-doel');
    doel.append(el('div', 'zw-doel-label', '🎯 Ons doel'));
    doel.append(el('p', 'zw-doel-tekst', les.doel || ''));
    if (les.doelen.length) doel.append(el('div', 'zw-codes', les.doelen.join(' · ')));
    kaart.append(doel);
  }
  if (les.criteria.length) {
    const lijst = el('ol', 'zw-criteria');
    les.criteria.forEach((c, i) => {
      const af = les.af.includes(i);
      const li = el('li', af ? 'af' : '');
      const b = el('button', 'zw-crit');
      b.type = 'button';
      b.setAttribute('aria-pressed', af);
      b.append(el('span', 'zw-picto', picto(c)), el('span', 'zw-crit-tekst', c), el('span', 'zw-vink', af ? '✔' : ''));
      b.addEventListener('click', () => {
        socket.emit('zw-vink', { week: zw.week, slot, i, aan: !af }, res => {
          if (res && res.weekData) zw.weekData = res.weekData;
          tekenVandaag();
          if (!af && res && res.weekData && res.weekData.lessen[slot].af.length === les.criteria.length && typeof sfx !== 'undefined') sfx.win && sfx.win();
        });
      });
      li.append(b);
      lijst.append(li);
    });
    const blok = el('div', 'zw-crit-blok');
    blok.append(el('div', 'zw-doel-label', '⭐ Dit lukt me als …'), lijst);
    kaart.append(blok);
  }
  const info = lesInfo(les);
  const knoppen = el('div', 'zw-lesknoppen');
  const knop = (tekst, href, titel, venster) => {
    const a = el('a', 'button secondary', tekst);
    a.href = href;
    a.title = titel;
    if (venster) a.target = 'lancelot-bordboek';
    knoppen.append(a);
  };
  if (info) {
    for (const l of info.links || []) {
      if (l.bestand.soort === 'online') knop(`🌐 ${l.bestand.naam}`, Lessen.link.online(l.bestand, l.url), 'Het online bordboek openen', l.bestand.inbed === false);
      else knop(`📖 ${l.bestand.naam.replace(/\.[^.]+$/, '')} · p. ${l.pagina}`, Lessen.link.boek(l.bestand, l.pagina), 'Het boek openen op deze pagina');
    }
    if (info.voorkennis) knop('🎯 Voorkennis', Lessen.link.quiz(info.voorkennis), 'De voorkennisquiz starten');
    if (info.quiz) knop('⚔ Quiz', Lessen.link.quiz(info.quiz), 'De quiz starten in het Toernooi');
    if (info.blad) knop('📝 Oefenblad', Lessen.link.blad(info.blad), 'Het oefenblad live starten');
    if (info.xl) knop('📝 XL', Lessen.link.blad(info.xl), 'Het lange oefenblad live starten');
  }
  if ((les.oefen || []).length) kaart.append(oefenKnoppen(les.oefen));
  if (knoppen.children.length) kaart.append(knoppen);
  if (les.notitie) {
    const n = el('details', 'zw-notitie');
    n.append(el('summary', '', '🗒 Mijn notitie'), el('p', '', les.notitie));
    kaart.append(n);
  }
}

// Zelf gekoppelde oefeningen: één grote knop per oefening, met het icoon van het spel.
function oefenTegel(o, tag = 'a') {
  const v = Lessen.vorm(o);
  const t = el(tag, 'zw-oefen');
  t.append(v.icoon ? Object.assign(el('img'), { src: `/img/icons/${v.icoon}.webp`, alt: '' }) : el('span', 'zw-oefen-teken', v.teken));
  const tekst = el('span', 'zw-oefen-tekst');
  tekst.append(el('strong', '', v.naam), el('span', '', `${Lessen.SOORTEN[o.soort]}: ${o.titel || o.file}`));
  t.append(tekst);
  return t;
}
function oefenKnoppen(lijst) {
  const box = el('div', 'zw-oefenknoppen');
  for (const o of lijst) {
    const a = oefenTegel(o);
    a.href = Lessen.link.oefen(o);
    a.title = 'Meteen starten';
    if (Lessen.vorm(o).id === 'print') a.target = '_blank';
    box.append(a);
  }
  return box;
}

$('zw-dag-vorige').addEventListener('click', () => naarDag(-1));
$('zw-dag-volgende').addEventListener('click', () => naarDag(1));
$('zw-dag-nu').addEventListener('click', () => {
  zw.dag = vandaagDag();
  zw.gekozen = null;
  laad(weekVan(new Date()));
});
function naarDag(stap) {
  zw.gekozen = null;
  let d = zw.dag + stap;
  let w = zw.week;
  if (d < 1 || d > 5) {
    w = weekVan(plusDagen(maandag(w), d < 1 ? -7 : 7));
    d = d < 1 ? 5 : 1;
  }
  zw.dag = d;
  if (w !== zw.week) laad(w); else tekenVandaag();
}
$('zw-vol').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else $('zw-vandaag').requestFullscreen().catch(() => {});
});
// Elke minuut opschuiven naar het lesuur van nu.
setInterval(() => { if (!document.hidden) tekenVandaag(); }, 60000);

// ---------- Week ----------

// De week zoals een schoolrooster: per dag een kolom, elk uur op zijn tijd en zo hoog als het duurt.
const PX = 1.45;
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function tekenWeek() {
  const r = rooster();
  const ma = maandag(zw.week);
  $('zw-weeknaam').textContent = `Week ${Number(zw.week.split('-W')[1])} · ${datum(ma)} – ${datum(plusDagen(ma, 4))}`;
  const sel = $('zw-week-rooster');
  sel.textContent = '';
  for (const x of zw.roosters) sel.append(new Option(`${x.naam}${x.id === zw.standaard ? ' (gewoon)' : ''}`, x.id));
  sel.value = r ? r.id : '';
  const doos = $('zw-week');
  doos.textContent = '';
  const alle = [1, 2, 3, 4, 5].flatMap(d => dagUren(r, d)).filter(u => u.van && u.tot);
  const start = Math.floor(Math.min(8 * 60 + 30, ...alle.map(u => min(u.van))) / 30) * 30;
  const eind = Math.ceil(Math.max(start + 120, ...alle.map(u => min(u.tot))) / 30) * 30;
  const hoog = (eind - start) * PX;
  doos.style.setProperty('--hoog', `${hoog}px`);
  const as = el('div', 'zw-wk-as');
  as.append(el('div', 'zw-wk-kop', ''));
  const asLijf = el('div', 'zw-wk-lijf');
  for (let t = Math.ceil(start / 60) * 60; t <= eind; t += 60) {
    const l = el('span', 'zw-wk-uur', hhmm(t));
    l.style.top = `${(t - start) * PX}px`;
    asLijf.append(l);
  }
  as.append(asLijf);
  doos.append(as);
  for (let d = 1; d <= 5; d++) {
    const kol = el('div', 'zw-wk-dag');
    const kop = el('div', 'zw-wk-kop', `${KORT[d - 1]} ${plusDagen(ma, d - 1).getDate()}/${plusDagen(ma, d - 1).getMonth() + 1}`);
    if (zw.week === weekVan(new Date()) && d === vandaagDag()) kop.classList.add('vandaag');
    const lijf = el('div', 'zw-wk-lijf');
    for (let t = Math.ceil(start / 60) * 60; t <= eind; t += 60) {
      const lijn = el('i', 'zw-wk-lijn');
      lijn.style.top = `${(t - start) * PX}px`;
      lijf.append(lijn);
    }
    for (const u of dagUren(r, d)) {
      if (!u.van || !u.tot) continue;
      const top = (min(u.van) - start) * PX;
      const h = Math.max(14, (min(u.tot) - min(u.van)) * PX - 3);
      if (u.soort === 'pauze') {
        const p = el('div', 'zw-wk-pauze', u.vak || 'pauze');
        p.style.top = `${top}px`;
        p.style.height = `${h}px`;
        lijf.append(p);
        continue;
      }
      const slot = `${d}-${u.les}`;
      const les = zw.weekData.lessen[slot];
      const st = vakStijl((les && les.vak) || u.vak);
      const b = el('button', `zw-cel kleur-${st.kleur}${les ? ' gepland' : ''}${h < 44 ? ' kort' : ''}`);
      b.type = 'button';
      b.style.top = `${top}px`;
      b.style.height = `${h}px`;
      b.title = `${u.van}–${u.tot} · ${(les && les.vak) || u.vak}${les && les.titel ? ` · ${les.titel}` : ''}`;
      b.append(el('span', 'zw-cel-vak', `${st.icoon} ${(les && les.vak) || u.vak || '—'}`));
      if (h >= 44) b.append(el('span', 'zw-cel-tijd', `${u.van}–${u.tot}`));
      if (les) {
        b.append(el('span', 'zw-cel-titel', les.titel || les.doel || '(zonder titel)'));
        const tags = [les.doel || les.doelen.length ? '🎯' : '', les.criteria.length ? `⭐${les.criteria.length}` : '', les.map ? '📚' : ''].filter(Boolean).join(' ');
        if (tags && h >= 70) b.append(el('span', 'zw-cel-tags', tags));
      } else if (h >= 60) b.append(el('span', 'zw-cel-leeg', '+ plannen'));
      b.addEventListener('click', () => openEditor(slot));
      lijf.append(b);
    }
    kol.append(kop, lijf);
    doos.append(kol);
  }
}

$('zw-week-vorige').addEventListener('click', () => laad(weekVan(plusDagen(maandag(zw.week), -7))));
$('zw-week-volgende').addEventListener('click', () => laad(weekVan(plusDagen(maandag(zw.week), 7))));
$('zw-week-nu').addEventListener('click', () => laad(weekVan(new Date())));
$('zw-week-rooster').addEventListener('change', e => {
  socket.emit('zw-week-rooster', { week: zw.week, rooster: e.target.value === zw.standaard ? '' : e.target.value }, res => {
    if (res.error) return ($('zw-fout').textContent = res.error);
    zw.weekData = res.weekData;
    teken();
  });
});

// ---------- Een les plannen ----------

const doelVeld = DoelKies.multi({ label: 'Leerplandoelen (Op.stap)' });
$('zw-ed-doelen').append(doelVeld);

// De mappen met lessen, per groep (alles behalve de laatste map): "Rekenen" → Blok 1, Blok 2…; "Methodes/Taal" → Thema 1…
// Geen eindeloze lijst: de groep van het vak van dit lesuur staat open, de rest is dicht tot je zoekt.
const bovenMap = m => (m.includes('/') ? m.slice(0, m.lastIndexOf('/')) : '');
const naamMap = m => m.slice(m.lastIndexOf('/') + 1);
const isVanVak = (m, vak) => !!vak && m.toLowerCase().split('/').some(d => d === vak.toLowerCase() || d.startsWith(`${vak.toLowerCase()} `));

function zetMap(map) {
  $('zw-ed-map').value = map || '';
  for (const b of $('zw-ed-blokken').querySelectorAll('[data-map]')) b.classList.toggle('on', b.dataset.map === map);
}

// Vak, soort les en blok: drie keuzes bovenaan, de rest volgt.
const ed = { soort: 'pakket', zoek: '' };
function tekenVakChips(huidig) {
  const doos = $('zw-ed-vakken');
  doos.textContent = '';
  const lijst = roosterVakken(rooster());
  if (huidig && !lijst.includes(huidig)) lijst.unshift(huidig);
  for (const v of lijst) {
    const st = vakStijl(v);
    const b = el('button', `zw-chip kleur-${st.kleur}${v === huidig ? ' on' : ''}`, `${st.icoon} ${v}`);
    b.type = 'button';
    b.addEventListener('click', () => kiesVak(v));
    doos.append(b);
  }
  const ander = el('button', 'zw-chip', '＋ Ander vak');
  ander.type = 'button';
  ander.addEventListener('click', () => {
    $('zw-ed-vak').classList.remove('hidden');
    $('zw-ed-vak').value = '';
    $('zw-ed-vak').focus();
  });
  doos.append(ander);
}
function kiesVak(v) {
  $('zw-ed-vak').value = v;
  $('zw-ed-vak').classList.add('hidden');
  tekenVakChips(v);
  if ($('zw-ed-map').value && !isVanVak($('zw-ed-map').value, v)) {
    zetMap('');
    vulLessen('', 0);
  }
  zetSoort(mappenVan(v).length || $('zw-ed-map').value ? 'pakket' : 'eigen');
}
$('zw-ed-vak').addEventListener('change', e => kiesVak(e.target.value.trim()));

const mappenVan = vak => Lessen.mappen(zw.bron).filter(m => isVanVak(m, vak));
function zetSoort(soort) {
  ed.soort = soort;
  for (const b of document.querySelectorAll('#zw-editor .zw-seg [data-soort]')) b.setAttribute('aria-checked', b.dataset.soort === soort);
  $('zw-ed-pakket').classList.toggle('hidden', soort !== 'pakket');
  tekenMijn();
  if (soort === 'eigen') {
    zetMap('');
    vulLessen('', 0);
    $('zw-ed-voorstel-info').textContent = '';
  }
  tekenBlokken();
}
for (const b of document.querySelectorAll('#zw-editor .zw-seg [data-soort]')) b.addEventListener('click', () => zetSoort(b.dataset.soort));

// De blokken of thema's van het vak, per methode gegroepeerd. Geen lespakket voor dit vak? Dan zoek je in alle mappen.
function tekenBlokken() {
  const doos = $('zw-ed-blokken');
  doos.textContent = '';
  if (ed.soort !== 'pakket') return;
  const vak = $('zw-ed-vak').value.trim();
  const hier = $('zw-ed-map').value;
  let mappen = mappenVan(vak);
  const zoekModus = !mappen.length || ed.zoek;
  if (zoekModus) {
    const zoek = el('input', 'zw-ed-zoek');
    zoek.type = 'search';
    zoek.placeholder = mappen.length ? 'Zoek in alle mappen' : `Geen lespakket voor ${vak || 'dit vak'}. Zoek een map, bijv. blok 3`;
    zoek.value = ed.zoek;
    zoek.addEventListener('input', () => {
      ed.zoek = zoek.value;
      tekenBlokken();
      const z = $('zw-ed-blokken').querySelector('input');
      z.focus();
      z.setSelectionRange(z.value.length, z.value.length);
    });
    doos.append(zoek);
    const q = ed.zoek.trim().toLowerCase();
    mappen = q ? Lessen.mappen(zw.bron).filter(m => m.toLowerCase().includes(q)).slice(0, 30) : [];
  }
  const groepen = new Map();
  for (const m of mappen) {
    const g = bovenMap(m);
    if (!groepen.has(g)) groepen.set(g, []);
    groepen.get(g).push(m);
  }
  for (const [g, lijst] of groepen) {
    const groep = el('div', 'zw-ed-groep');
    if (groepen.size > 1 || zoekModus) groep.append(el('span', 'zw-ed-groepnaam', g ? g.split('/').join(' › ') : 'Mappen'));
    const chips = el('div', 'zw-chips');
    for (const m of lijst) {
      const b = el('button', `zw-chip${m === hier ? ' on' : ''}`, naamMap(m));
      b.type = 'button';
      b.dataset.map = m;
      b.title = m.split('/').join(' › ');
      b.addEventListener('click', () => {
        zetMap(m);
        vulLessen(m, 0);
        $('zw-ed-voorstel-info').textContent = '';
        $('zw-ed-les').focus();
      });
      chips.append(b);
    }
    groep.append(chips);
    doos.append(groep);
  }
  if (!zoekModus) {
    const meer = el('button', 'zw-link', 'Andere map zoeken…');
    meer.type = 'button';
    meer.addEventListener('click', () => {
      ed.zoek = ' ';
      tekenBlokken();
      $('zw-ed-blokken').querySelector('input').focus();
    });
    doos.append(meer);
  }
}

// Een nieuw lesuur: de les na de vorige les van dit vak (dezelfde map, of de eerste les van de volgende map).
// De les na Les nr in deze map, of de eerste les van de volgende map (Blok 3 → Blok 4).
function volgendeNa(map, nr) {
  const volgende = Lessen.van(map, zw.bron).find(l => l.nr > nr);
  if (volgende) return { map, les: volgende };
  const broers = Lessen.mappen(zw.bron).filter(m => bovenMap(m) === bovenMap(map));
  const na = broers[broers.indexOf(map) + 1];
  const eerste = na && Lessen.van(na, zw.bron)[0];
  return eerste ? { map: na, les: eerste } : null;
}
const vraagLaatste = (vak, slot) => new Promise(klaar => socket.emit('zw-laatste', { vak, week: zw.week, slot }, res => klaar((res && res.les) || null)));
const vraagDoelen = file => new Promise(klaar => socket.emit('zw-quiz-doelen', { file }, res => klaar(res && !res.error ? res : null)));

// Een nieuw lesuur: de les na de vorige les van dit vak.
async function stelVoor(slot, vak) {
  const vorige = await vraagLaatste(vak, slot);
  if (zw.bewerk.slot !== slot || $('zw-ed-map').value || !$('zw-editor').open || !vorige) return;
  const v = volgendeNa(vorige.map, vorige.nr);
  if (!v) return;
  zetMap(v.map);
  vulLessen(v.map, v.les.nr);
  kiesLes(v.les.nr);
  tekenBlokken();
  $('zw-ed-voorstel-info').textContent = `✨ Voorstel: Les ${v.les.nr}, want vorige keer stond Les ${vorige.nr} gepland. Een andere les kiezen kan hierboven.`;
}

// Vul de week aan: elk leeg lesuur van een vak krijgt de volgende les, na de laatst geplande les van dat vak.
$('zw-vul').addEventListener('click', async () => {
  const r = rooster();
  const leeg = [];
  for (let d = 1; d <= 5; d++) for (const u of dagUren(r, d)) if (u.soort === 'les' && u.vak && !zw.weekData.lessen[`${d}-${u.les}`]) leeg.push({ slot: `${d}-${u.les}`, vak: u.vak });
  const stand = new Map();
  const plan = [];
  for (const p of leeg) {
    const sleutel = p.vak.toLowerCase();
    // Nog geen vorige les gevonden (bv. maandag ligt vóór je eerste geplande les)? Dan bij het volgende lesuur opnieuw kijken.
    if (!stand.get(sleutel)) stand.set(sleutel, await vraagLaatste(p.vak, p.slot));
    const vorige = stand.get(sleutel);
    if (!vorige) {
      // Geen lespakket voor dit vak? Dan je vaste les uit Mijn lessen (de laatst bewaarde van dat vak).
      const vast = (zw.mijn || []).find(l => l.vak.toLowerCase() === sleutel);
      if (vast) plan.push({ ...p, vast });
      continue;
    }
    const v = volgendeNa(vorige.map, vorige.nr);
    if (!v) continue;
    stand.set(sleutel, { map: v.map, nr: v.les.nr });
    plan.push({ ...p, map: v.map, les: v.les });
  }
  if (!plan.length) return Ui.melding('Er valt niets aan te vullen. Plan eerst één les per vak uit je lespakket (bv. Rekenen Les 31): dan vult LANcelot de lessen daarna in. Vaste lessen zoals Onthaal bewaar je met ⭐ In Mijn lessen.');
  const perVak = new Map();
  for (const p of plan) {
    if (!perVak.has(p.vak)) perVak.set(p.vak, []);
    perVak.get(p.vak).push(p.vast ? p.vast.titel : p.les.nr);
  }
  const samen = [...perVak].map(([v, nrs]) => typeof nrs[0] === 'string' ? `${v}: ${nrs[0]}${nrs.length > 1 ? ` (${nrs.length}×)` : ''}` : `${v}: les ${nrs.length > 1 ? `${nrs[0]}–${nrs[nrs.length - 1]}` : nrs[0]}`).join(', ');
  if (!await Ui.vraag(`${plan.length} ${plan.length === 1 ? 'les' : 'lessen'} invullen? ${samen}. Je kan elke les daarna nog aanpassen of wissen.`, { ja: 'Invullen' })) return;
  const lessen = {};
  for (const p of plan) {
    if (p.vast) {
      const { titel, doel, criteria: crit, doelen: codes, notitie, oefen } = p.vast;
      lessen[p.slot] = { vak: p.vak, titel, doel, criteria: crit, doelen: codes, notitie, oefen };
      continue;
    }
    const info = p.les.quiz ? await vraagDoelen(p.les.quiz.file) : null;
    lessen[p.slot] = { vak: p.vak, map: p.map, nr: p.les.nr, titel: p.les.titel || '', doelen: info ? info.doelen.map(x => x.code) : [], doel: (info && info.doel) || '', criteria: (info && info.criteria) || [] };
  }
  socket.emit('zw-vul', { week: zw.week, lessen }, res => {
    if (res.error) return Ui.melding(res.error);
    zw.weekData = res.weekData;
    teken();
  });
});

// Mijn lessen: eigen lessen die je bewaarde, eerst die van dit vak.
function tekenMijn(gekozen = '') {
  const sel = $('zw-ed-mijn-kies');
  const vak = $('zw-ed-vak').value.trim().toLowerCase();
  const lijst = [...(zw.mijn || [])].sort((a, b) => (b.vak.toLowerCase() === vak) - (a.vak.toLowerCase() === vak));
  sel.textContent = '';
  sel.append(new Option(lijst.length ? 'Kies een bewaarde les…' : 'Nog niets bewaard', ''));
  for (const l of lijst) sel.append(new Option(`${l.titel}${l.vak ? ` · ${l.vak}` : ''}`.slice(0, 90), l.id));
  sel.value = gekozen;
  $('zw-ed-mijn').classList.toggle('hidden', ed.soort !== 'eigen' || !lijst.length);
  $('zw-ed-mijn-weg').classList.toggle('hidden', !gekozen);
}
$('zw-ed-mijn-kies').addEventListener('change', e => {
  const l = (zw.mijn || []).find(x => x.id === e.target.value);
  $('zw-ed-mijn-weg').classList.toggle('hidden', !l);
  if (!l) return;
  if (l.vak) { $('zw-ed-vak').value = l.vak; tekenVakChips(l.vak); }
  $('zw-ed-naam').value = l.titel;
  $('zw-ed-doel').value = l.doel;
  zetCriteria(l.criteria);
  doelVeld.zet(l.doelen);
  $('zw-ed-notitie').value = l.notitie;
  zetOefen(l.oefen || []);
  $('zw-ed-crit-info').textContent = '';
  meerTel();
});
$('zw-ed-mijn-weg').addEventListener('click', async () => {
  const l = (zw.mijn || []).find(x => x.id === $('zw-ed-mijn-kies').value);
  if (!l || !await Ui.vraag(`"${l.titel}" uit Mijn lessen halen? Wat al gepland staat, blijft staan.`, { ja: 'Weghalen', gevaar: true })) return;
  socket.emit('zw-mijn-les-weg', { id: l.id }, res => {
    if (res.error) return ($('zw-ed-fout').textContent = res.error);
    zw.mijn = res.mijnLessen;
    tekenMijn();
  });
});
$('zw-ed-mijn-bewaar').addEventListener('click', () => {
  const les = leesEditor();
  if (!les.titel) return ($('zw-ed-fout').textContent = 'Geef de les eerst een titel.');
  socket.emit('zw-mijn-les', les, res => {
    if (res.error) return ($('zw-ed-fout').textContent = res.error);
    zw.mijn = res.mijnLessen;
    $('zw-ed-fout').textContent = '';
    tekenMijn(ed.soort === 'eigen' ? res.id : '');
    Ui.melding(`"${les.titel}" staat in Mijn lessen. Kies ze later bij Eigen les${les.vak ? `, en Vul de week aan zet ze op elk leeg uur ${les.vak}` : ''}.`);
  });
});

function vulLessen(map, nr) {
  const sel = $('zw-ed-les');
  sel.textContent = '';
  $('zw-ed-les-label').classList.toggle('hidden', !map);
  if (!map) return;
  sel.append(new Option('Kies een les…', ''));
  for (const l of Lessen.van(map, zw.bron)) sel.append(new Option(`Les ${l.nr}${l.titel ? ` · ${l.titel}` : ''}`.slice(0, 90), l.nr));
  if (nr && ![...sel.options].some(o => Number(o.value) === nr)) sel.append(new Option(`Les ${nr}`, nr));
  sel.value = nr ? String(nr) : '';
}

function critRij(tekst = '') {
  const rij = el('div', 'zw-crit-rij');
  const p = el('span', 'zw-picto', picto(tekst));
  const inp = el('input');
  inp.maxLength = 160;
  inp.value = tekst;
  inp.placeholder = 'Ik kan …';
  inp.addEventListener('input', () => { p.textContent = picto(inp.value); });
  const weg = el('button', 'secondary icon');
  weg.type = 'button';
  weg.setAttribute('aria-label', 'Criterium weghalen');
  weg.innerHTML = Ui.ic('kruis');
  weg.addEventListener('click', () => rij.remove());
  rij.append(p, inp, weg);
  $('zw-ed-crit').append(rij);
  return inp;
}
const criteria = () => [...$('zw-ed-crit').querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
function zetCriteria(lijst) {
  $('zw-ed-crit').textContent = '';
  for (const c of lijst) critRij(c);
  if (!lijst.length) critRij('');
}

function openEditor(slot) {
  const r = rooster();
  const [d, u] = slot.split('-').map(Number);
  const uur = dagUren(r, d).find(x => x.les === u) || {};
  const vak = uur.vak || '';
  const les = zw.weekData.lessen[slot] || null;
  zw.bewerk = { slot, oud: les };
  // Een les uit het lespakket: wat erbij staat, mag een andere les vervangen.
  ed.auto = les && les.map ? { titel: les.titel, doel: les.doel, criteria: JSON.stringify(les.criteria), doelen: JSON.stringify(les.doelen) } : null;
  $('zw-ed-titel').textContent = `${DAGEN[d - 1]}${uur.van ? ` · ${uur.van}–${uur.tot}` : ''}`;
  const hetVak = les ? les.vak : vak;
  $('zw-ed-vak').value = hetVak;
  $('zw-ed-vak').classList.add('hidden');
  tekenVakChips(hetVak);
  ed.zoek = '';
  zetMap(les && les.map);
  vulLessen(les && les.map, les && les.nr);
  zetSoort(les ? (les.map ? 'pakket' : 'eigen') : mappenVan(hetVak).length ? 'pakket' : 'eigen');
  $('zw-ed-voorstel-info').textContent = '';
  $('zw-ed-naam').value = les ? les.titel : '';
  $('zw-ed-doel').value = les ? les.doel : '';
  doelVeld.zet(les ? les.doelen : []);
  zetCriteria(les ? les.criteria : []);
  $('zw-ed-notitie').value = les ? les.notitie : '';
  zetOefen(les ? les.oefen || [] : []);
  $('zw-ed-meer').open = !!(les && (les.doelen.length || les.notitie));
  meerTel();
  $('zw-ed-fout').textContent = '';
  stopDenken();
  maakPrompt();
  $('zw-ed-wis').classList.toggle('hidden', !les);
  $('zw-ed-schuif').classList.toggle('hidden', !les);
  $('zw-editor').showModal();
  if (!les && vak) stelVoor(slot, vak);
}

$('zw-ed-dicht').addEventListener('click', () => $('zw-editor').close());
function meerTel() {
  const n = doelVeld.codes().length;
  $('zw-ed-meer-tel').textContent = [n ? `${n} ${n === 1 ? 'doel' : 'doelen'}` : '', $('zw-ed-notitie').value.trim() ? 'notitie' : ''].filter(Boolean).join(' · ');
}
$('zw-ed-meer').addEventListener('toggle', meerTel);
// Een les uit De Kronieken kiezen: titel, doelen en een voorstel van succescriteria komen mee (wat je zelf schreef, blijft).
$('zw-ed-les').addEventListener('change', e => {
  $('zw-ed-voorstel-info').textContent = '';
  kiesLes(Number(e.target.value));
});
// Wat LANcelot zelf invulde: dat mag een andere les vervangen. Wat je zelf typte, blijft staan.
const zelfGetypt = (nu, auto) => nu !== '' && nu !== auto;
function kiesLes(nr) {
  const info = Lessen.van($('zw-ed-map').value, zw.bron).find(l => l.nr === nr);
  if (!info) return;
  const a = ed.auto || { titel: '', doel: '', criteria: '[]', doelen: '[]' };
  if (!zelfGetypt($('zw-ed-naam').value.trim(), a.titel)) $('zw-ed-naam').value = info.titel || '';
  if (!$('zw-ed-vak').value) $('zw-ed-vak').value = $('zw-ed-map').value.split('/')[0];
  const doelVrij = !zelfGetypt($('zw-ed-doel').value.trim(), a.doel);
  const critVrij = !zelfGetypt(criteria().length ? JSON.stringify(criteria()) : '', a.criteria);
  const doelenVrij = !zelfGetypt(doelVeld.codes().length ? JSON.stringify(doelVeld.codes()) : '', a.doelen);
  const onthoud = () => { ed.auto = { titel: $('zw-ed-naam').value.trim(), doel: $('zw-ed-doel').value.trim(), criteria: JSON.stringify(criteria()), doelen: JSON.stringify(doelVeld.codes()) }; };
  // Eerst leegmaken wat van de vorige les kwam, zodat er niets van een andere les blijft hangen.
  if (doelVrij) $('zw-ed-doel').value = '';
  if (critVrij) zetCriteria([]);
  if (doelenVrij) doelVeld.zet([]);
  onthoud();
  meerTel();
  if (!info.quiz) return;
  socket.emit('zw-quiz-doelen', { file: info.quiz.file }, res => {
    if (!res || res.error || Number($('zw-ed-les').value) !== nr) return;
    if (doelenVrij) doelVeld.zet(res.doelen.map(x => x.code));
    if (doelVrij && res.doel) $('zw-ed-doel').value = res.doel;
    if (critVrij) zetCriteria(res.criteria);
    onthoud();
    meerTel();
  });
}
// Help me invullen: uit de leerplandoelen als je die koos, anders uit de titel (met je AI-sleutel of ingebouwd).
function zetVoorstel(res) {
  const er = new Set(criteria());
  const nieuw = res.criteria.filter(c => !er.has(c));
  if (!criteria().length) zetCriteria(nieuw); else for (const c of nieuw) critRij(c);
  if (!$('zw-ed-doel').value.trim() && res.doel) $('zw-ed-doel').value = res.doel;
}
// Een AI die te lang wacht (de dienst is druk, of geen internet) laat de knop niet eeuwig hangen:
// na een halve minuut komt het ingebouwde voorstel, een laat antwoord telt dan niet meer.
let vraagNr = 0;
function stopDenken() {
  vraagNr++;
  $('zw-ed-voorstel').disabled = false;
  $('zw-ed-crit-info').textContent = '';
}
function lesInfo() {
  return { titel: $('zw-ed-naam').value.trim(), vak: $('zw-ed-vak').value.trim(), notitie: $('zw-ed-notitie').value.trim() };
}
$('zw-ed-voorstel').addEventListener('click', () => {
  const codes = doelVeld.codes();
  const knop = $('zw-ed-voorstel');
  $('zw-ed-fout').textContent = '';
  $('zw-ed-crit-info').textContent = '';
  if (codes.length) return socket.emit('zw-doelen', { codes }, res => { if (res && !res.error) zetVoorstel(res); });
  const info = lesInfo();
  if (!info.titel) return ($('zw-ed-fout').textContent = 'Geef de les eerst een titel (bv. Onthaal / Jeugdjournaal), dan help ik met het doel en de succescriteria.');
  const nr = ++vraagNr;
  knop.disabled = true;
  $('zw-ed-crit-info').textContent = '✨ Even denken…';
  const klaar = res => {
    if (nr !== vraagNr) return;
    stopDenken();
    if (!res || res.error) return ($('zw-ed-fout').textContent = (res && res.error) || 'Dat lukte niet.');
    zetVoorstel(res);
    $('zw-ed-crit-info').textContent = res.bron === 'ai'
      ? '✨ Voorstel van de AI. Pas gerust aan.'
      : `✨ Een eenvoudig voorstel. ${res.fout ? `De AI lukte niet (${res.fout}).` : 'Met een AI-sleutel bij Instellingen, of via de chatbotknoppen, wordt het slimmer.'} Pas gerust aan.`;
  };
  const wacht = setTimeout(() => socket.emit('zw-voorstel', { ...info, zonderAi: true }, res =>
    klaar(res && !res.error ? { ...res, fout: 'het duurde te lang' } : res)), 30000);
  socket.emit('zw-voorstel', info, res => { clearTimeout(wacht); klaar(res); });
});

// Zelf via een chatbot: prompt kopiëren, chatbot openen, en het antwoord bij terugkomst van het klembord halen.
let gekopieerd = '';
function kopieer(text) {
  // In het open venster zelf: alles daarbuiten is onbereikbaar zolang het venster open is.
  const t = el('textarea');
  t.value = text;
  $('zw-editor').appendChild(t);
  t.select();
  const ok = document.execCommand('copy');
  t.remove();
  if (!ok) navigator.clipboard?.writeText(text).catch(() => {});
}
// De prompt staat al klaar vóór de klik: kopiëren lukt alleen zolang deze pagina de focus heeft.
const klaarPrompt = { sleutel: '', prompt: '' };
let promptTik = 0;
function maakPrompt() {
  clearTimeout(promptTik);
  promptTik = setTimeout(() => {
    const info = lesInfo();
    const sleutel = JSON.stringify(info);
    if (!info.titel || sleutel === klaarPrompt.sleutel) return;
    socket.emit('zw-voorstel-prompt', info, res => { if (res && !res.error) Object.assign(klaarPrompt, { sleutel, prompt: res.prompt }); });
  }, 300);
}
for (const id of ['zw-ed-naam', 'zw-ed-notitie', 'zw-ed-vak']) $(id).addEventListener('input', maakPrompt);
$('zw-ed-vakken').addEventListener('click', maakPrompt);
for (const b of document.querySelectorAll('#zw-editor .chatbot')) {
  b.addEventListener('click', () => {
    $('zw-ed-fout').textContent = '';
    const info = lesInfo();
    if (!info.titel) return ($('zw-ed-fout').textContent = 'Geef de les eerst een titel, dan maak ik de prompt voor de chatbot.');
    const tip = 'Plak hem in de chatbot met Ctrl+V, kopieer het antwoord en kom hier terug. Lukt het niet vanzelf, plak dan hier met Ctrl+V.';
    if (klaarPrompt.sleutel === JSON.stringify(info)) {
      gekopieerd = klaarPrompt.prompt;
      kopieer(gekopieerd);
      window.open(b.dataset.url, '_blank', 'noopener');
      return ($('zw-ed-crit-info').textContent = `Prompt gekopieerd! ${tip}`);
    }
    // Nog niet klaar (net getypt): eerst kopiëren, dan pas zelf de chatbot openen.
    socket.emit('zw-voorstel-prompt', info, res => {
      if (!res || res.error) return ($('zw-ed-fout').textContent = (res && res.error) || 'Dat lukte niet.');
      Object.assign(klaarPrompt, { sleutel: JSON.stringify(info), prompt: res.prompt });
      gekopieerd = res.prompt;
      kopieer(gekopieerd);
      $('zw-ed-crit-info').textContent = `Prompt gekopieerd! Klik nog eens op ${b.textContent} om de chatbot te openen. ${tip}`;
    });
  });
}
function leesAntwoord(text, stil) {
  if (!gekopieerd || !text || text === gekopieerd || !/criteria|doel/i.test(text)) return false;
  socket.emit('zw-voorstel-lees', text, res => {
    if (!res || res.error) { if (!stil) $('zw-ed-fout').textContent = (res && res.error) || 'Dat lukte niet.'; return; }
    gekopieerd = text;
    $('zw-ed-fout').textContent = '';
    zetVoorstel(res);
    $('zw-ed-crit-info').textContent = '✨ Antwoord van de chatbot ingevuld. Pas gerust aan.';
  });
  return true;
}
window.addEventListener('focus', async () => {
  if (!gekopieerd || !$('zw-editor').open || !navigator.clipboard?.readText) return;
  try { leesAntwoord(await navigator.clipboard.readText(), true); } catch { /* geen toestemming: dan plakt de leerkracht zelf */ }
});
// Plakken kan overal in het venster; in een tekstvak alleen als het echt het antwoord van de chatbot is (JSON).
$('zw-editor').addEventListener('paste', e => {
  const text = e.clipboardData && e.clipboardData.getData('text');
  const veld = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  if (veld && !/[{]/.test(text || '')) return;
  if (leesAntwoord(text, false)) e.preventDefault();
});
$('zw-ed-crit-plus').addEventListener('click', () => critRij('').focus());

// ---------- Oefenen in deze les: wat (quiz, oefenblad, toets) en hoe (welk spel, live, als taak) ----------

ed.oefen = [];
function zetOefen(lijst) {
  ed.oefen = lijst.map(o => ({ ...o }));
  tekenOefen();
}
function tekenOefen() {
  const box = $('zw-ed-oefen');
  box.textContent = '';
  ed.oefen.forEach((o, i) => {
    const rij = el('div', 'zw-oefen-rij');
    const weg = el('button', 'secondary icon');
    weg.type = 'button';
    weg.setAttribute('aria-label', 'Weghalen');
    weg.innerHTML = Ui.ic('kruis');
    weg.addEventListener('click', () => { ed.oefen.splice(i, 1); tekenOefen(); });
    rij.append(oefenTegel(o, 'div'), weg);
    box.append(rij);
  });
  $('zw-ed-oefen-plus').classList.toggle('hidden', ed.oefen.length >= 6);
}

// Het venster: 1. kies wat, 2. kies hoe. De quiz en het oefenblad van de les uit het lespakket staan al klaar.
const kz = { soort: 'quiz', item: null };
for (const soort of ['quiz', 'oefenblad', 'proef']) {
  ItemList.mount($(`zw-k-${soort}`), {
    kind: soort, kiezen: true, errorId: 'zw-k-fout', go: 'Kies ▶',
    play: q => kiesItem(soort, q),
  });
}
function kiesSoort(soort) {
  kz.soort = soort;
  for (const b of document.querySelectorAll('#zw-k-soorten [data-soort]')) b.setAttribute('aria-checked', b.dataset.soort === soort);
  for (const s of ['quiz', 'oefenblad', 'proef']) $(`zw-k-${s}`).classList.toggle('hidden', s !== soort);
}
for (const b of document.querySelectorAll('#zw-k-soorten [data-soort]')) b.addEventListener('click', () => kiesSoort(b.dataset.soort));
function kiesItem(soort, q) {
  kz.item = { soort, file: q.file, titel: q.title };
  $('zw-k-wat').classList.add('hidden');
  $('zw-k-hoe').classList.remove('hidden');
  $('zw-k-gekozen').textContent = `${Lessen.SOORTEN[soort]}: ${q.title}`;
  const box = $('zw-k-vormen');
  box.textContent = '';
  for (const v of Lessen.VORMEN[soort]) {
    const b = oefenTegel({ ...kz.item, vorm: v.id }, 'button');
    b.type = 'button';
    b.querySelector('.zw-oefen-tekst span').remove();
    b.addEventListener('click', () => {
      ed.oefen.push({ ...kz.item, vorm: v.id });
      tekenOefen();
      $('zw-kiezer').close();
    });
    box.append(b);
  }
}
function openKiezer() {
  kz.item = null;
  $('zw-k-wat').classList.remove('hidden');
  $('zw-k-hoe').classList.add('hidden');
  $('zw-k-fout').textContent = '';
  // Snel: de quiz en het oefenblad van de gekozen les uit het lespakket.
  const snel = $('zw-k-snel');
  snel.textContent = '';
  const map = ed.soort === 'pakket' ? $('zw-ed-map').value : '';
  const info = map && Lessen.van(map, zw.bron).find(l => l.nr === Number($('zw-ed-les').value));
  if (info) {
    for (const [soort, q, label] of [['quiz', info.quiz, '⚔ De quiz'], ['quiz', info.voorkennis, '🎯 De voorkennisquiz'], ['oefenblad', info.blad, '📝 Het oefenblad'], ['oefenblad', info.xl, '📝 Het XL-blad']]) {
      if (!q) continue;
      const b = el('button', 'secondary', `${label} van Les ${info.nr}`);
      b.type = 'button';
      b.addEventListener('click', () => kiesItem(soort, q));
      snel.append(b);
    }
  }
  snel.classList.toggle('hidden', !snel.children.length);
  kiesSoort(kz.soort);
  $('zw-kiezer').showModal();
}
$('zw-ed-oefen-plus').addEventListener('click', openKiezer);
$('zw-k-terug').addEventListener('click', () => { $('zw-k-hoe').classList.add('hidden'); $('zw-k-wat').classList.remove('hidden'); });
$('zw-k-sluit').addEventListener('click', () => $('zw-kiezer').close());

function leesEditor() {
  const map = ed.soort === 'pakket' ? $('zw-ed-map').value : '';
  return {
    vak: $('zw-ed-vak').value.trim(),
    map,
    nr: map ? Number($('zw-ed-les').value) || 0 : 0,
    titel: $('zw-ed-naam').value.trim(),
    doelen: doelVeld.codes(),
    doel: $('zw-ed-doel').value.trim(),
    criteria: criteria(),
    // Afgevinkte criteria blijven alleen staan als de lijst niet veranderde.
    af: zw.bewerk.oud && JSON.stringify(zw.bewerk.oud.criteria) === JSON.stringify(criteria()) ? zw.bewerk.oud.af : [],
    notitie: $('zw-ed-notitie').value.trim(),
    oefen: ed.oefen,
  };
}

function stuurLes(les) {
  socket.emit('zw-les', { week: zw.week, slot: zw.bewerk.slot, les }, res => {
    if (res.error) return ($('zw-ed-fout').textContent = res.error);
    zw.weekData = res.weekData;
    $('zw-editor').close();
    teken();
  });
}
$('zw-ed-bewaar').addEventListener('click', () => {
  const les = leesEditor();
  if (!les.titel && !les.doel && !les.criteria.length && !les.nr && !les.oefen.length) return ($('zw-ed-fout').textContent = 'Geef de les een titel, een doel of een succescriterium.');
  stuurLes(les);
});
$('zw-ed-wis').addEventListener('click', async () => {
  if (!await Ui.vraag('Deze les uit de planning halen?', { ja: 'Wissen', gevaar: true })) return;
  stuurLes(null);
});
$('zw-ed-schuif').addEventListener('click', async () => {
  const vak = $('zw-ed-vak').value.trim();
  if (!await Ui.vraag(`Deze les naar het volgende uur ${vak || 'van dit vak'} schuiven? De lessen ${vak || 'van dit vak'} erna schuiven mee.`, { ja: 'Doorschuiven' })) return;
  socket.emit('zw-schuif', { week: zw.week, slot: zw.bewerk.slot }, res => {
    if (res.error) return ($('zw-ed-fout').textContent = res.error);
    zw.weekData = res.weekData;
    $('zw-editor').close();
    teken();
  });
});

// ---------- Lesroosters ----------

function kiesRooster(id) {
  const r = zw.roosters.find(x => x.id === id) || zw.roosters[0];
  zw.rb = r ? JSON.parse(JSON.stringify(r)) : null;
  tekenRooster();
}

function tekenVakken() {
  const set = new Set(['Rekenen', 'Taal', 'Spelling', 'Lezen', 'Frans', 'Wereldoriëntatie', 'Muzische', 'Beweging', 'Godsdienst', 'Speeltijd']);
  for (const r of zw.roosters) for (const v of roosterVakken(r)) set.add(v);
  const dl = $('zw-vakken');
  dl.textContent = '';
  for (const v of set) dl.append(new Option(v));
  const chips = $('zw-rooster-chips');
  chips.textContent = '';
  for (const r of zw.roosters) {
    const b = el('button', `zw-chip${zw.rb && zw.rb.id === r.id ? ' on' : ''}`, `${r.naam}${r.id === zw.standaard ? ' ★' : ''}`);
    b.type = 'button';
    b.addEventListener('click', () => kiesRooster(r.id));
    chips.append(b);
  }
}

// Een rooster bewerken: per dag de uren met hun tijden, want elke dag ziet er anders uit.
zw.rDag = 1;
const plusMin = (t, n) => hhmm(Math.min(23 * 60 + 59, min(t) + n));
function tekenRooster() {
  const r = zw.rb;
  if (!r) return;
  r.dagen = r.dagen || {};
  $('zw-rooster-naam').value = r.naam;
  $('zw-rooster-standaard').checked = r.id === zw.standaard;
  const tabs = $('zw-rooster-dagen');
  tabs.textContent = '';
  DAGEN.forEach((naam, i) => {
    const n = (r.dagen[i + 1] || []).filter(u => u.soort === 'les').length;
    const b = el('button', `zw-chip${zw.rDag === i + 1 ? ' on' : ''}`, `${naam} `);
    b.type = 'button';
    b.append(el('em', 'muted small', `${n}`));
    b.addEventListener('click', () => { zw.rDag = i + 1; tekenRooster(); });
    tabs.append(b);
  });
  const uren = r.dagen[zw.rDag] = r.dagen[zw.rDag] || [];
  const t = $('zw-raster');
  t.textContent = '';
  const kop = el('tr');
  for (const x of ['Van', 'Tot', 'Vak of activiteit', 'Pauze', '']) kop.append(el('th', '', x));
  t.append(kop);
  uren.forEach((u, i) => {
    const tr = el('tr', u.soort);
    const veld = (sleutel, type) => {
      const inp = el('input');
      inp.type = type;
      inp.value = u[sleutel] || '';
      if (type === 'text') {
        inp.setAttribute('list', 'zw-vakken');
        inp.maxLength = 30;
        inp.placeholder = u.soort === 'pauze' ? 'Speeltijd' : 'bijv. Rekenen';
        inp.setAttribute('aria-label', `${DAGEN[zw.rDag - 1]}, ${u.van}`);
      }
      inp.addEventListener('change', () => {
        u[sleutel] = inp.value.trim();
        if (sleutel === 'vak' && /^speeltijd|^pauze|^middag/i.test(u.vak) && u.soort === 'les') { u.soort = 'pauze'; tekenRooster(); }
      });
      const td = el('td');
      td.append(inp);
      return td;
    };
    tr.append(veld('van', 'time'), veld('tot', 'time'), veld('vak', 'text'));
    const pz = el('td', 'zw-pz');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = u.soort === 'pauze';
    cb.title = 'Pauze (speeltijd, middag): daar plan je geen les';
    cb.addEventListener('change', () => { u.soort = cb.checked ? 'pauze' : 'les'; tekenRooster(); });
    pz.append(cb);
    tr.append(pz);
    const td = el('td');
    const weg = el('button', 'secondary icon');
    weg.type = 'button';
    weg.title = 'Deze rij weghalen';
    weg.setAttribute('aria-label', 'Rij weghalen');
    weg.innerHTML = Ui.ic('kruis');
    weg.addEventListener('click', () => { uren.splice(i, 1); tekenRooster(); });
    td.append(weg);
    tr.append(td);
    t.append(tr);
  });
  if (!uren.length) {
    const tr = el('tr');
    const td = el('td', 'muted small', `Op ${DAGEN[zw.rDag - 1]} staat nog niets. Voeg een lesuur toe of kopieer een andere dag.`);
    td.colSpan = 5;
    tr.append(td);
    t.append(tr);
  }
  const kopie = $('zw-rooster-kopie');
  kopie.textContent = '';
  kopie.append(new Option(`${DAGEN[zw.rDag - 1]} kopiëren naar…`, ''));
  DAGEN.forEach((naam, i) => { if (i + 1 !== zw.rDag) kopie.append(new Option(naam, i + 1)); });
  kopie.append(new Option('alle andere dagen', 'alle'));
  tekenVakken();
}
$('zw-rooster-kopie').addEventListener('change', e => {
  const r = zw.rb;
  const naar = e.target.value === 'alle' ? [1, 2, 3, 4, 5].filter(d => d !== zw.rDag) : [Number(e.target.value)];
  for (const d of naar) if (d) r.dagen[d] = JSON.parse(JSON.stringify(r.dagen[zw.rDag] || []));
  e.target.value = '';
  $('zw-rooster-ok').textContent = 'Gekopieerd. Vergeet niet te bewaren.';
  tekenRooster();
});

function voegUurToe(soort) {
  const uren = zw.rb.dagen[zw.rDag] = zw.rb.dagen[zw.rDag] || [];
  const laatste = uren[uren.length - 1];
  const van = laatste && laatste.tot ? laatste.tot : '08:30';
  uren.push({ van, tot: plusMin(van, soort === 'pauze' ? 15 : 50), soort, vak: soort === 'pauze' ? 'Speeltijd' : '' });
  tekenRooster();
  if (soort === 'les') { const ins = $('zw-raster').querySelectorAll('input[type=text]'); ins[ins.length - 1].focus(); }
}
$('zw-uur-les').addEventListener('click', () => voegUurToe('les'));
$('zw-uur-pauze').addEventListener('click', () => voegUurToe('pauze'));

// Roosters uit een bestand: van een collega, of zoals je ze kreeg van LANcelot.
$('zw-rooster-bestand').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); } catch { return Ui.melding('Dit is geen geldig roosterbestand.'); }
  socket.emit('zw-roosters-import', data, res => {
    if (res.error) return Ui.melding(res.error);
    zw.roosters = res.roosters;
    zw.standaard = res.standaard;
    kiesRooster(zw.roosters[zw.roosters.length - 1].id);
    teken();
    $('zw-rooster-ok').textContent = `✓ ${res.toegevoegd} ${res.toegevoegd === 1 ? 'rooster' : 'roosters'} toegevoegd.`;
  });
});
$('zw-rooster-export').addEventListener('click', () => {
  bewaarBestand('LANcelot-lesroosters.json', JSON.stringify({ lancelot: 'lesroosters', roosters: zw.roosters }, null, 1), 'application/json');
});

function bewaarBestand(naam, tekst, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([tekst], { type }));
  a.download = naam;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------- Afdrukken en naar je agenda ----------

function weekLessen() {
  const r = rooster();
  const ma = maandag(zw.week);
  return [1, 2, 3, 4, 5].map(d => ({
    d,
    datum: plusDagen(ma, d - 1),
    uren: dagUren(r, d).filter(u => u.soort === 'les').map(u => ({ ...u, plan: zw.weekData.lessen[`${d}-${u.les}`] || null })),
  }));
}

// Afdrukken: A4 liggend, per dag een kolom met elk lesuur: tijd, vak, thema/les, titel, doel en succescriteria.
const themaVan = les => les && les.map ? `${les.map.split('/').pop()}${les.nr ? ` · Les ${les.nr}` : ''}` : '';

// Lessen uit je lespakket die nog geen doel of succescriteria hebben, krijgen die op papier uit de quiz van die les.
async function vulAanVoorPapier(les) {
  if (!les || (les.doel && les.criteria.length)) return les;
  const info = lesInfo(les);
  const res = info && info.quiz ? await Promise.race([vraagDoelen(info.quiz.file), new Promise(k => setTimeout(() => k(null), 4000))]) : null;
  if (!res) return les;
  return { ...les, doel: les.doel || res.doel || '', criteria: les.criteria.length ? les.criteria : (res.criteria || []), doelen: les.doelen.length ? les.doelen : (res.doelen || []).map(x => x.code) };
}

$('zw-print').addEventListener('click', async () => {
  const knop = $('zw-print');
  knop.disabled = true;
  try {
    const doos = $('zw-afdruk');
    doos.textContent = '';
    const r = rooster();
    const ma = maandag(zw.week);
    const kop = el('div', 'zw-af-kop');
    kop.append(el('h1', '', `Week ${Number(zw.week.split('-W')[1])} · ${datum(ma)} – ${datum(plusDagen(ma, 4))}`), el('span', 'zw-af-sub', r ? r.naam : ''));
    doos.append(kop);
    const t = el('table', 'zw-af-week');
    const rij = el('tr');
    const kopRij = el('tr');
    for (let d = 1; d <= 5; d++) {
      kopRij.append(el('th', '', `${DAGEN[d - 1]} ${datum(plusDagen(ma, d - 1))}`));
      const td = el('td');
      for (const u of dagUren(r, d)) {
        if (!u.van || !u.tot) continue;
        if (u.soort === 'pauze') {
          td.append(el('div', 'zw-af-pauze', `${u.van} ${u.vak || 'pauze'}`));
          continue;
        }
        const l = await vulAanVoorPapier(zw.weekData.lessen[`${d}-${u.les}`] || null);
        const vak = (l && l.vak) || u.vak || '';
        const st = vakStijl(vak);
        const les = el('div', `zw-af-les kleur-${st.kleur}${l ? ' gepland' : ''}`);
        const lijn = el('div', 'zw-af-lijn');
        lijn.append(el('span', 'zw-af-tijd', `${u.van}–${u.tot}`), el('span', 'zw-af-vak', `${st.icoon} ${vak}`));
        les.append(lijn);
        if (l) {
          const thema = themaVan(l);
          if (thema) les.append(el('div', 'zw-af-thema', thema));
          if (l.titel) les.append(el('div', 'zw-af-titel', l.titel));
          if (l.doel) les.append(el('div', 'zw-af-doel', `🎯 ${l.doel}`));
          if (l.criteria.length) {
            const ul = el('ul');
            for (const c of l.criteria) ul.append(el('li', '', c));
            les.append(ul);
          }
          if (l.notitie) les.append(el('div', 'zw-af-notitie', `🗒 ${l.notitie}`));
        }
        td.append(les);
      }
      rij.append(td);
    }
    const thead = el('thead');
    thead.append(kopRij);
    const tbody = el('tbody');
    tbody.append(rij);
    t.append(thead, tbody);
    doos.append(t);
    window.print();
  } finally {
    knop.disabled = false;
  }
});

// Een .ics-bestand: Outlook, Google Agenda en je gsm openen het als afspraken met doel en succescriteria erin.
$('zw-ics').addEventListener('click', () => {
  const esc = t => String(t).replace(/\\/g, '\\\\').replace(/[,;]/g, m => `\\${m}`).replace(/\n/g, '\\n');
  const stip = (dag, t) => `${dag.getFullYear()}${String(dag.getMonth() + 1).padStart(2, '0')}${String(dag.getDate()).padStart(2, '0')}T${t.replace(':', '')}00`;
  const nu = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const regels = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LANcelot//De Zonnewijzer//NL', 'CALSCALE:GREGORIAN'];
  let n = 0;
  for (const dag of weekLessen()) {
    for (const u of dag.uren) {
      if (!u.van || !u.tot) continue;
      const l = u.plan;
      const vak = (l && l.vak) || u.vak || 'Les';
      const tekst = l ? [l.doel && `Doel: ${l.doel}`, ...l.criteria.map(c => `- ${c}`), l.notitie && `Notitie: ${l.notitie}`].filter(Boolean).join('\n') : '';
      regels.push('BEGIN:VEVENT', `UID:${zw.week}-${dag.d}-${u.les}@lancelot`, `DTSTAMP:${nu}`, `DTSTART:${stip(dag.datum, u.van)}`, `DTEND:${stip(dag.datum, u.tot)}`,
        `SUMMARY:${esc(l && l.titel ? `${vak}: ${l.titel}` : vak)}`);
      if (tekst) regels.push(`DESCRIPTION:${esc(tekst)}`);
      regels.push('END:VEVENT');
      n++;
    }
  }
  regels.push('END:VCALENDAR');
  if (!n) return Ui.melding('Deze week staan er nog geen lesuren in je rooster.');
  bewaarBestand(`LANcelot-week-${zw.week}.ics`, regels.join('\r\n') + '\r\n', 'text/calendar');
});

$('zw-rooster-naam').addEventListener('input', e => { zw.rb.naam = e.target.value; });

function bewaarRoosters(lijst, standaard, melding) {
  socket.emit('zw-roosters', { roosters: lijst, standaard }, res => {
    if (res.error) return ($('zw-rooster-ok').textContent = res.error);
    zw.roosters = res.roosters;
    zw.standaard = res.standaard;
    $('zw-rooster-ok').textContent = melding;
    setTimeout(() => { $('zw-rooster-ok').textContent = ''; }, 2500);
    if (!zw.roosters.some(r => r.id === zw.rb.id)) kiesRooster(zw.standaard);
    else kiesRooster(zw.rb.id);
    teken();
  });
}
$('zw-rooster-bewaar').addEventListener('click', () => {
  const lijst = zw.roosters.some(r => r.id === zw.rb.id) ? zw.roosters.map(r => (r.id === zw.rb.id ? zw.rb : r)) : [...zw.roosters, zw.rb];
  bewaarRoosters(lijst, $('zw-rooster-standaard').checked ? zw.rb.id : zw.standaard === zw.rb.id ? lijst.find(r => r.id !== zw.rb.id)?.id || zw.rb.id : zw.standaard, '✓ Bewaard');
});
$('zw-rooster-nieuw').addEventListener('click', () => {
  const kopie = JSON.parse(JSON.stringify(zw.rb || zw.roosters[0]));
  kopie.id = `r${Date.now().toString(36)}`;
  kopie.naam = `${kopie.naam} (kopie)`.slice(0, 40);
  zw.roosters.push(kopie);
  kiesRooster(kopie.id);
  $('zw-rooster-ok').textContent = 'Een kopie van je rooster. Pas de naam en de vakken aan en bewaar.';
  $('zw-rooster-naam').select();
});
$('zw-rooster-weg').addEventListener('click', async () => {
  if (zw.roosters.length < 2) return Ui.melding('Je hebt minstens één rooster nodig.');
  if (!await Ui.vraag(`Het rooster "${zw.rb.naam}" verwijderen? Weken met dit rooster krijgen weer je gewone rooster.`, { ja: 'Verwijderen', gevaar: true })) return;
  const lijst = zw.roosters.filter(r => r.id !== zw.rb.id);
  bewaarRoosters(lijst, zw.standaard === zw.rb.id ? lijst[0].id : zw.standaard, 'Verwijderd');
});

Ui.tabs($('zw-tabs'), 'lancelot-zonnewijzer-tab');
