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
  [/muzo|muziek|beeld|drama|kunst|tekenen/, '🎨', 'oranje'], [/lo\b|turnen|zwem|sport|bewegen/, '⚽', 'oranje'], [/godsdienst|rkg|zedenleer|levensb/, '🕊️', 'goud'],
  [/ict|computer|media/, '💻', 'cyan'], [/sel|kring|welbevinden|klasraad/, '💬', 'goud'], [/project|atelier|hoek/, '🧩', 'paars'],
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

// De rijen van een rooster met hun lesuurnummer (pauzes hebben er geen).
function rijen(r) {
  let n = 0;
  return (r ? r.uren : []).map(u => ({ ...u, les: u.soort === 'les' ? n++ : -1 }));
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
  for (const u of rijen(r)) {
    const li = el('li', `zw-uur ${u.soort}`);
    const tijd = el('span', 'zw-tijd', u.van ? `${u.van}` : '');
    if (u.soort === 'pauze') {
      li.append(tijd, el('span', 'zw-pauze', '☕ pauze'));
      lijst.append(li);
      continue;
    }
    const slot = `${zw.dag}-${u.les}`;
    const vak = ((r.vakken || {})[zw.dag] || [])[u.les] || '';
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
  const vak = ((r.vakken || {})[d] || [])[u] || '';
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
  const knop = (tekst, href, titel) => {
    const a = el('a', 'button secondary', tekst);
    a.href = href;
    a.title = titel;
    knoppen.append(a);
  };
  if (info) {
    for (const l of info.links) knop(`📖 ${l.bestand.naam.replace(/\.[^.]+$/, '')} · p. ${l.pagina}`, Lessen.link.boek(l.bestand, l.pagina), 'Het boek openen op deze pagina');
    if (info.voorkennis) knop('🎯 Voorkennis', Lessen.link.quiz(info.voorkennis), 'De voorkennisquiz starten');
    if (info.quiz) knop('⚔ Quiz', Lessen.link.quiz(info.quiz), 'De quiz starten in het Toernooi');
    if (info.blad) knop('📝 Oefenblad', Lessen.link.blad(info.blad), 'Het oefenblad live starten');
    if (info.xl) knop('📝 XL', Lessen.link.blad(info.xl), 'Het lange oefenblad live starten');
  }
  if (knoppen.children.length) kaart.append(knoppen);
  if (les.notitie) {
    const n = el('details', 'zw-notitie');
    n.append(el('summary', '', '🗒 Mijn notitie'), el('p', '', les.notitie));
    kaart.append(n);
  }
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

function tekenWeek() {
  const r = rooster();
  const ma = maandag(zw.week);
  $('zw-weeknaam').textContent = `Week ${Number(zw.week.split('-W')[1])} · ${datum(ma)} – ${datum(plusDagen(ma, 4))}`;
  const sel = $('zw-week-rooster');
  sel.textContent = '';
  for (const x of zw.roosters) sel.append(new Option(`${x.naam}${x.id === zw.standaard ? ' (gewoon)' : ''}`, x.id));
  sel.value = r ? r.id : '';
  const t = $('zw-week');
  t.textContent = '';
  const kop = el('tr');
  kop.append(el('th', 'zw-th-tijd', ''));
  DAGEN.forEach((naam, i) => {
    const th = el('th', '', `${KORT[i]} ${plusDagen(ma, i).getDate()}/${plusDagen(ma, i).getMonth() + 1}`);
    if (zw.week === weekVan(new Date()) && i + 1 === vandaagDag()) th.classList.add('vandaag');
    kop.append(th);
  });
  t.append(kop);
  for (const u of rijen(r)) {
    const tr = el('tr', u.soort);
    tr.append(el('th', 'zw-th-tijd', u.van ? `${u.van}–${u.tot}` : ''));
    for (let d = 1; d <= 5; d++) {
      const td = el('td');
      if (u.soort === 'pauze') {
        td.className = 'zw-pauzecel';
        tr.append(td);
        continue;
      }
      const slot = `${d}-${u.les}`;
      const vak = ((r.vakken || {})[d] || [])[u.les] || '';
      const les = zw.weekData.lessen[slot];
      const st = vakStijl((les && les.vak) || vak);
      const b = el('button', `zw-cel kleur-${st.kleur}${les ? ' gepland' : ''}`);
      b.type = 'button';
      b.append(el('span', 'zw-cel-vak', `${st.icoon} ${(les && les.vak) || vak || '—'}`));
      if (les) {
        b.append(el('span', 'zw-cel-titel', les.titel || les.doel || '(zonder titel)'));
        const tags = [les.doel || les.doelen.length ? '🎯' : '', les.criteria.length ? `⭐${les.criteria.length}` : '', les.map ? '📚' : ''].filter(Boolean).join(' ');
        if (tags) b.append(el('span', 'zw-cel-tags', tags));
      } else if (vak) b.append(el('span', 'zw-cel-leeg', '+ plannen'));
      b.addEventListener('click', () => openEditor(slot));
      td.append(b);
      tr.append(td);
    }
    t.append(tr);
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

function vulMappen(huidig) {
  const sel = $('zw-ed-map');
  const mappen = Lessen.mappen(zw.bron);
  sel.length = 1;
  for (const m of mappen) sel.append(new Option(m, m));
  if (huidig && !mappen.includes(huidig)) sel.append(new Option(huidig, huidig));
  sel.value = huidig || '';
}

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
  const vak = ((r.vakken || {})[d] || [])[u] || '';
  const les = zw.weekData.lessen[slot] || null;
  zw.bewerk = { slot, oud: les };
  $('zw-ed-titel').textContent = `${DAGEN[d - 1]} · ${u + 1}e lesuur${vak ? ` · ${vak}` : ''}`;
  $('zw-ed-vak').value = les ? les.vak : vak;
  vulMappen(les && les.map);
  vulLessen(les && les.map, les && les.nr);
  $('zw-ed-naam').value = les ? les.titel : '';
  $('zw-ed-doel').value = les ? les.doel : '';
  doelVeld.zet(les ? les.doelen : []);
  zetCriteria(les ? les.criteria : []);
  $('zw-ed-notitie').value = les ? les.notitie : '';
  $('zw-ed-fout').textContent = '';
  $('zw-ed-wis').classList.toggle('hidden', !les);
  $('zw-ed-schuif').classList.toggle('hidden', !les);
  $('zw-editor').showModal();
}

$('zw-ed-dicht').addEventListener('click', () => $('zw-editor').close());
$('zw-ed-map').addEventListener('change', e => vulLessen(e.target.value, 0));
// Een les uit De Kronieken kiezen: titel, doelen en een voorstel van succescriteria komen mee (wat je zelf schreef, blijft).
$('zw-ed-les').addEventListener('change', e => {
  const nr = Number(e.target.value);
  const info = Lessen.van($('zw-ed-map').value, zw.bron).find(l => l.nr === nr);
  if (!info) return;
  $('zw-ed-naam').value = info.titel || $('zw-ed-naam').value;
  if (!$('zw-ed-vak').value) $('zw-ed-vak').value = $('zw-ed-map').value.split('/')[0];
  if (!info.quiz) return;
  socket.emit('zw-quiz-doelen', { file: info.quiz.file }, res => {
    if (!res || res.error) return;
    if (!doelVeld.codes().length) doelVeld.zet(res.doelen.map(x => x.code));
    if (!$('zw-ed-doel').value.trim() && res.doel) $('zw-ed-doel').value = res.doel;
    if (!criteria().length) zetCriteria(res.criteria);
  });
});
$('zw-ed-voorstel').addEventListener('click', () => {
  const codes = doelVeld.codes();
  if (!codes.length) return ($('zw-ed-fout').textContent = 'Kies eerst een of meer leerplandoelen, of kies een les uit De Kronieken.');
  socket.emit('zw-doelen', { codes }, res => {
    if (!res || res.error) return;
    const er = new Set(criteria());
    const nieuw = res.criteria.filter(c => !er.has(c));
    if (!criteria().length) zetCriteria(nieuw); else for (const c of nieuw) critRij(c);
    if (!$('zw-ed-doel').value.trim() && res.doel) $('zw-ed-doel').value = res.doel;
  });
});
$('zw-ed-crit-plus').addEventListener('click', () => critRij('').focus());

function leesEditor() {
  const map = $('zw-ed-map').value;
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
  if (!les.titel && !les.doel && !les.criteria.length && !les.nr) return ($('zw-ed-fout').textContent = 'Geef de les een titel, een doel of een succescriterium.');
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
  const s = new Set(['Rekenen', 'Taal', 'Spelling', 'Lezen', 'Frans', 'WO', 'Muzo', 'LO', 'Godsdienst']);
  for (const r of zw.roosters) for (const d of Object.values(r.vakken || {})) for (const v of d) if (v) s.add(v);
  const dl = $('zw-vakken');
  dl.textContent = '';
  for (const v of s) dl.append(new Option(v));
  const chips = $('zw-rooster-chips');
  chips.textContent = '';
  for (const r of zw.roosters) {
    const b = el('button', `zw-chip${zw.rb && zw.rb.id === r.id ? ' on' : ''}`, `${r.naam}${r.id === zw.standaard ? ' ★' : ''}`);
    b.type = 'button';
    b.addEventListener('click', () => kiesRooster(r.id));
    chips.append(b);
  }
}

function tekenRooster() {
  const r = zw.rb;
  if (!r) return;
  $('zw-rooster-naam').value = r.naam;
  $('zw-rooster-standaard').checked = r.id === zw.standaard;
  const t = $('zw-raster');
  t.textContent = '';
  const kop = el('tr');
  for (const x of ['Van', 'Tot', ...KORT, '']) kop.append(el('th', '', x));
  t.append(kop);
  let n = 0;
  r.uren.forEach((u, i) => {
    const tr = el('tr', u.soort);
    const tijdVeld = sleutel => {
      const inp = el('input');
      inp.type = 'time';
      inp.value = u[sleutel];
      inp.addEventListener('change', () => { u[sleutel] = inp.value; });
      const td = el('td');
      td.append(inp);
      return td;
    };
    tr.append(tijdVeld('van'), tijdVeld('tot'));
    if (u.soort === 'pauze') {
      const td = el('td', 'zw-pauzecel', '☕ pauze');
      td.colSpan = 5;
      tr.append(td);
    } else {
      const les = n++;
      for (let d = 1; d <= 5; d++) {
        const td = el('td');
        const inp = el('input');
        inp.setAttribute('list', 'zw-vakken');
        inp.maxLength = 30;
        inp.value = ((r.vakken[d] || [])[les]) || '';
        inp.setAttribute('aria-label', `${DAGEN[d - 1]}, ${les + 1}e lesuur`);
        inp.addEventListener('change', () => {
          r.vakken[d] = r.vakken[d] || [];
          r.vakken[d][les] = inp.value.trim();
        });
        td.append(inp);
        tr.append(td);
      }
    }
    const td = el('td');
    const weg = el('button', 'secondary icon');
    weg.type = 'button';
    weg.title = 'Deze rij weghalen';
    weg.setAttribute('aria-label', 'Rij weghalen');
    weg.innerHTML = Ui.ic('kruis');
    weg.addEventListener('click', () => {
      if (u.soort === 'les') {
        const nr = r.uren.slice(0, i).filter(x => x.soort === 'les').length;
        for (let d = 1; d <= 5; d++) (r.vakken[d] || []).splice(nr, 1);
      }
      r.uren.splice(i, 1);
      tekenRooster();
    });
    td.append(weg);
    tr.append(td);
    t.append(tr);
  });
  tekenVakken();
}

function voegUurToe(soort) {
  const r = zw.rb;
  const laatste = r.uren[r.uren.length - 1];
  const van = laatste ? laatste.tot : '08:30';
  const [h, m] = van.split(':').map(Number);
  const eind = h * 60 + m + (soort === 'pauze' ? 15 : 50);
  r.uren.push({ van, tot: `${String(Math.floor(eind / 60) % 24).padStart(2, '0')}:${String(eind % 60).padStart(2, '0')}`, soort });
  tekenRooster();
}
$('zw-uur-les').addEventListener('click', () => voegUurToe('les'));
$('zw-uur-pauze').addEventListener('click', () => voegUurToe('pauze'));
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
